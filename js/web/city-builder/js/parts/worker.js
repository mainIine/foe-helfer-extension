/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

/**
 * A class that optimizes placement of buildings and roads within a grid-based city
 * layout. It processes map data, handles building placement, and ensures proper road
 * connectivity while adhering to defined constraints.
 *
 * The optimizer runs inside a Web Worker built from this template string, so it
 * must not contain backticks or dollar-brace sequences - string concatenation only.
 */
CityBuilder.WorkerCode = `class CityOptimizerBrowser {
            constructor(mapData, buildingsData, options) {
                const opts = options || {};
                this.strategy = opts.strategy || 'bands';
                this.sortMode = opts.sortMode || 'height';
                this.seed = opts.seed || 0;
                // vertical bands = the same band layout on a transposed map
                this.transposed = this.strategy === 'bands-vertical';
                // keep mode: the city stays as it stands, only new buildings get a spot
                this.keep = this.strategy === 'keep';
                this.keepRoads = opts.roads || [];
                // spot -> kind of the building standing there (keep mode)
                this.homes = new Map();
                // search time for closing the ranks of the street buildings
                this.closeMs = 80;
                this.grid = new Map();
                this.buildings = [];
                this.placedBuildings = [];
                this.mapBounds = { minX: 1000, maxX: 0, minY: 1000, maxY: 0 };
                this.townHall = null;
                this.townHallPos = null;
                this.roadTiles = new Set();
                // road tile key -> 1 (one-lane) or 2 (two-lane)
                this.roadLevel = new Map();

                this.processData(mapData, buildingsData);
            }

            processData(rawMap, rawBuildings) {
                if (!rawMap) {
                    console.error("Worker: rawMap ist leer/null");
                    return;
                }
                const validTiles = new Set();
                const mapArray = Array.isArray(rawMap) ? rawMap : Object.values(rawMap || {});

                mapArray.forEach(area => {
                    let ax = area.x || 0;
                    let ay = area.y || 0;
                    let aw = area.width || 4;
                    let al = area.length || area.height || 4;
                    if (this.transposed) { [ax, ay] = [ay, ax]; [aw, al] = [al, aw]; }

                    this.mapBounds.minX = Math.min(this.mapBounds.minX, ax);
                    this.mapBounds.maxX = Math.max(this.mapBounds.maxX, ax + aw);
                    this.mapBounds.minY = Math.min(this.mapBounds.minY, ay);
                    this.mapBounds.maxY = Math.max(this.mapBounds.maxY, ay + al);

                    for (let i = ax; i < ax + aw; i++) {
                        for (let j = ay; j < ay + al; j++) {
                            validTiles.add(i + ',' + j);
                        }
                    }
                });

                // integer twin of the string keyed grid for the hot loops: one
                // cell of border all around, so neighbours need no bounds checks
                this.gridW = this.mapBounds.maxX - this.mapBounds.minX + 2;
                this.gridH = this.mapBounds.maxY - this.mapBounds.minY + 2;
                this.cellKeys = [];
                this.cellIds = [];
                this.cellIdOf = new Map();
                for (let x = this.mapBounds.minX; x < this.mapBounds.maxX; x++) {
                    for (let y = this.mapBounds.minY; y < this.mapBounds.maxY; y++) {
                        const key = x + ',' + y;
                        this.grid.set(key, validTiles.has(key) ? 0 : -1);
                        this.cellKeys.push(key);
                        this.cellIds.push(this.cellId(x, y));
                        this.cellIdOf.set(key, this.cellId(x, y));
                    }
                }

                const ignore = ["Hafen", "Terminal", "Hub", "Außenposten"];
                rawBuildings.forEach(b => {
                    if ((b.width || 0) <= 0) return;
                    if (['hub_main', 'hub_part', 'off_grid'].includes(b.type)) return;
                    // name fallback for hub pieces only - regular buildings such as
                    // "Njords Fjordsturm-Hafen" or "Momiji-Terminal" must stay in the plan
                    if (b.type !== 'generic_building' && ignore.some(ig => b.name.includes(ig))) return;

                    const bCopy = { ...b, street_level: b.street_level || 0 };
                    if (this.transposed) {
                        const w = bCopy.width;
                        bCopy.width = bCopy.height;
                        bCopy.height = w;
                    }
                    // great buildings never need a two-lane street in the game
                    if (bCopy.type === 'greatbuilding' && (bCopy.street_level || 0) > 1) bCopy.street_level = 1;
                    if (bCopy.type === 'main_building') {
                        this.townHall = bCopy;
                        this.townHall.street_level = 1;
                    } else {
                        this.buildings.push(bCopy);
                    }
                });

                this.buildChainComposites();
            }

            // chain buildings must stand in one contiguous row, left to right in
            // chain order - merge each chain into one composite building that is
            // placed as a unit and split back into its members on export
            buildChainComposites() {
                const byChain = new Map();
                const rest = [];
                for (const b of this.buildings) {
                    if (b.chain_id && b.chain_pos >= 0 && this.keep && b.standing) {
                        // an assembled chain of the live city stays as it is
                        b.pinned = true;
                        rest.push(b);
                    } else if (b.chain_id && b.chain_pos >= 0) {
                        if (!byChain.has(b.chain_id)) byChain.set(b.chain_id, []);
                        byChain.get(b.chain_id).push(b);
                    } else {
                        rest.push(b);
                    }
                }

                // the chain runs along the real map x axis - along y in transposed space
                const span = this.transposed
                    ? this.mapBounds.maxY - this.mapBounds.minY
                    : this.mapBounds.maxX - this.mapBounds.minX;

                for (const [cid, list] of byChain) {
                    list.sort((a, b) => a.chain_pos - b.chain_pos || (a.id > b.id ? 1 : -1));

                    // duplicate members belong to parallel chains: greedily deal
                    // every instance into the first group it can extend
                    const groups = [];
                    for (const m of list) {
                        let g = null;
                        for (const cand of groups) {
                            if (cand[cand.length - 1].chain_pos < m.chain_pos) { g = cand; break; }
                        }
                        if (!g) { g = []; groups.push(g); }
                        g.push(m);
                    }

                    for (let gi = 0; gi < groups.length; gi++) {
                        const g = groups[gi];
                        if (g.length === 1) { rest.push(g[0]); continue; }

                        let len = 0, thick = 0, lvl = 0;
                        for (const m of g) {
                            if (this.transposed) { len += m.height; thick = Math.max(thick, m.width); }
                            else { len += m.width; thick = Math.max(thick, m.height); }
                            lvl = Math.max(lvl, m.street_level || 0);
                        }
                        // a chain longer than the map can never stand in one row
                        if (len > span) {
                            for (const m of g) rest.push(m);
                            continue;
                        }
                        rest.push({
                            id: 'chain-' + cid + '-' + gi,
                            name: g[0].name,
                            type: g[0].type,
                            width: this.transposed ? thick : len,
                            height: this.transposed ? len : thick,
                            street_level: lvl,
                            chainMembers: g
                        });
                    }
                }
                this.buildings = rest;
            }

            // deterministic PRNG so seeded variants are reproducible
            makeRng(seed) {
                let s = seed >>> 0;
                return function() {
                    s = (s + 0x6D2B79F5) >>> 0;
                    let t = s;
                    t = Math.imul(t ^ (t >>> 15), t | 1);
                    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                };
            }

            // build order for the current variant: base key by sortMode, descending;
            // a seed > 0 jitters the keys for randomized restarts
            sortBuildings(list) {
                const rng = this.makeRng(this.seed || 1);
                const mode = this.sortMode;
                const keyed = list.map(b => {
                    let v;
                    if (mode === 'area') v = b.width * b.height;
                    else if (mode === 'width') v = b.width * 100 + b.height;
                    else v = b.height * 100 + b.width;
                    if (this.seed) v *= 0.7 + 0.6 * rng();
                    return [v, b];
                });
                keyed.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name));
                return keyed.map(k => k[1]);
            }

            // nest the great buildings directly against the map border, ring by ring
            // from the outside in - road stubs connect them afterwards
            placeGreatBuildingsAtEdge(gbs) {
                if (!gbs.length) return;
                const edgeDepth = this.computeEdgeDepth();
                const coords = [];
                for (const key of edgeDepth.keys()) {
                    const parts = key.split(',');
                    coords.push([+parts[0], +parts[1]]);
                }
                coords.sort((a, b) => {
                    const da = edgeDepth.get(a[0] + ',' + a[1]);
                    const db = edgeDepth.get(b[0] + ',' + b[1]);
                    if (da !== db) return da - db;
                    if (a[1] !== b[1]) return a[1] - b[1];
                    return a[0] - b[0];
                });
                // nesting must keep stub channels open: after each placement every
                // great building still needs a free neighbour tile that connects to
                // the largest free region, where the road network will live
                const placedGbs = [];
                const keepsAccess = (x, y, w, h) => {
                    const inFoot = (px, py) => px >= x && px < x + w && py >= y && py < y + h;
                    const isFree = (px, py) => !inFoot(px, py) && this.grid.get(px + ',' + py) === 0;
                    const seen = new Set();
                    let largest = null;
                    for (const [key, val] of this.grid) {
                        if (val !== 0 || seen.has(key)) continue;
                        const parts = key.split(',');
                        if (inFoot(+parts[0], +parts[1])) continue;
                        const region = new Set([key]);
                        const stack = [[+parts[0], +parts[1]]];
                        seen.add(key);
                        while (stack.length) {
                            const t = stack.pop();
                            for (const nb of [[t[0]-1,t[1]],[t[0]+1,t[1]],[t[0],t[1]-1],[t[0],t[1]+1]]) {
                                const nk = nb[0] + ',' + nb[1];
                                if (seen.has(nk) || !isFree(nb[0], nb[1])) continue;
                                seen.add(nk);
                                region.add(nk);
                                stack.push(nb);
                            }
                        }
                        if (!largest || region.size > largest.size) largest = region;
                    }
                    if (!largest) return false;

                    const touches = (bx, by, bw, bh) => {
                        for (let i = bx; i < bx + bw; i++) {
                            if (largest.has(i + ',' + (by - 1)) || largest.has(i + ',' + (by + bh))) return true;
                        }
                        for (let j = by; j < by + bh; j++) {
                            if (largest.has((bx - 1) + ',' + j) || largest.has((bx + bw) + ',' + j)) return true;
                        }
                        return false;
                    };
                    if (!touches(x, y, w, h)) return false;
                    for (const g of placedGbs) {
                        if (!touches(g.x, g.y, g.width, g.height)) return false;
                    }
                    return true;
                };

                for (const b of this.sortBuildings(gbs)) {
                    for (const [x, y] of coords) {
                        if (this.grid.get(x + ',' + y) !== 0) continue;
                        if (this.canPlace(x, y, b.width, b.height) && keepsAccess(x, y, b.width, b.height)) {
                            this.placeEntity(b, x, y, 1);
                            placedGbs.push({ x: x, y: y, width: b.width, height: b.height });
                            break;
                        }
                    }
                }
            }

            // a placement must not take an unconnected great building's last free
            // neighbour tile - that single tile becomes its road stub later
            gbKeepsStubSpace(x, y, w, h) {
                const inFoot = (px, py) => px >= x && px < x + w && py >= y && py < y + h;
                for (const g of this.placedBuildings) {
                    if (g.type !== 'greatbuilding') continue;
                    // only neighbours of the new footprint can be affected
                    if (g.x > x + w || g.x + g.width < x || g.y > y + h || g.y + g.height < y) continue;
                    if (this.isConnectedToRoad(g.x, g.y, g.width, g.height)) continue;
                    let free = false;
                    for (let i = g.x; i < g.x + g.width && !free; i++) {
                        if (!inFoot(i, g.y - 1) && this.grid.get(i + ',' + (g.y - 1)) === 0) free = true;
                        if (!inFoot(i, g.y + g.height) && this.grid.get(i + ',' + (g.y + g.height)) === 0) free = true;
                    }
                    for (let j = g.y; j < g.y + g.height && !free; j++) {
                        if (!inFoot(g.x - 1, j) && this.grid.get((g.x - 1) + ',' + j) === 0) free = true;
                        if (!inFoot(g.x + g.width, j) && this.grid.get((g.x + g.width) + ',' + j) === 0) free = true;
                    }
                    if (!free) return false;
                }
                return true;
            }

            // street connection rectangle: chain composites connect through their
            // head member only - the game wires the rest through the chain
            connRect(b) {
                if (b.chainMembers) {
                    const m0 = b.chainMembers[0];
                    return { x: b.x, y: b.y, width: m0.width, height: m0.height };
                }
                return b;
            }

            /**
             * Connects every placed street building that has no road yet with
             * the shortest possible stub - one touching tile is enough.
             *
             * @param {function(Object): boolean} [wanted] - Limits the stubs to these buildings.
             */
            connectPlacedBuildings(wanted) {
                const unconn = (b) => {
                    const r = this.connRect(b);
                    return b.street_level > 0 && (!wanted || wanted(b)) && !this.isConnectedToRoad(r.x, r.y, r.width, r.height);
                };
                let todo = this.placedBuildings.filter(unconn);

                while (todo.length && this.roadTiles.size) {
                    // BFS over free tiles from the current network, parents give the path
                    const dist = new Map(), parent = new Map(), fifo = [];
                    for (const key of this.roadTiles) { dist.set(key, 0); fifo.push(key); }
                    let head = 0;
                    while (head < fifo.length) {
                        const key = fifo[head++];
                        const parts = key.split(',');
                        const kx = +parts[0], ky = +parts[1];
                        const d = dist.get(key);
                        for (const nk of [(kx-1)+','+ky, (kx+1)+','+ky, kx+','+(ky-1), kx+','+(ky+1)]) {
                            if (this.grid.get(nk) === 0 && !dist.has(nk)) {
                                dist.set(nk, d + 1);
                                parent.set(nk, key);
                                fifo.push(nk);
                            }
                        }
                    }

                    // build the cheapest stub of this round, then re-measure: fresh
                    // stubs often bring the next building within zero extra tiles
                    let bestPath = null;
                    for (const b of todo) {
                        const r = this.connRect(b);
                        const per = [];
                        for (let i = r.x; i < r.x + r.width; i++) per.push(i + ',' + (r.y - 1), i + ',' + (r.y + r.height));
                        for (let j = r.y; j < r.y + r.height; j++) per.push((r.x - 1) + ',' + j, (r.x + r.width) + ',' + j);
                        for (const pt of per) {
                            const dv = dist.get(pt);
                            if (dv === undefined) continue;
                            if (bestPath && dv >= bestPath.length) continue;
                            const path = [];
                            let cur = pt;
                            while (cur && dist.get(cur) > 0) {
                                path.push(cur);
                                cur = parent.get(cur);
                            }
                            bestPath = path;
                        }
                    }
                    if (!bestPath) break;

                    for (const key of bestPath) {
                        const parts = key.split(',');
                        this.placeRoadTile(+parts[0], +parts[1]);
                    }
                    todo = todo.filter(unconn);
                }
            }

            // last-resort guarantee that nothing which needs a street stays cut
            // off: Dijkstra from the road network where free tiles are cheap and
            // tiles of removable buildings are expensive - if no free path exists
            // the cheapest blockers get torn down, the stub is built and the
            // demolished buildings are re-placed next to the network
            repairUnconnected() {
                const isProtected = (b) => b.type === 'main_building' || b.type === 'greatbuilding';
                const requeue = [];
                let guard = 0;

                while (this.roadTiles.size && guard++ < 60) {
                    const todo = this.placedBuildings.filter(b => {
                        const r = this.connRect(b);
                        return b.street_level > 0 && !this.isConnectedToRoad(r.x, r.y, r.width, r.height);
                    });
                    if (!todo.length) break;
                    const todoSet = new Set(todo);

                    // tile -> building lookup for demolition costs
                    const owner = new Map();
                    for (const b of this.placedBuildings) {
                        for (let i = b.x; i < b.x + b.width; i++) {
                            for (let j = b.y; j < b.y + b.height; j++) owner.set(i + ',' + j, b);
                        }
                    }

                    // Dijkstra with a small binary heap: free tile costs 1, a tile
                    // of a removable building costs a lot, so demolition stays the
                    // last resort; town hall, great buildings and the buildings
                    // still waiting for their own stub are walls
                    const dist = new Map(), parent = new Map();
                    const heap = [];
                    const push = (key, d) => {
                        heap.push([d, key]);
                        let i = heap.length - 1;
                        while (i > 0) {
                            const p = (i - 1) >> 1;
                            if (heap[p][0] <= heap[i][0]) break;
                            const t = heap[p]; heap[p] = heap[i]; heap[i] = t;
                            i = p;
                        }
                    };
                    const pop = () => {
                        const top = heap[0];
                        const last = heap.pop();
                        if (heap.length) {
                            heap[0] = last;
                            let i = 0;
                            while (true) {
                                const l = i * 2 + 1, r = l + 1;
                                let s = i;
                                if (l < heap.length && heap[l][0] < heap[s][0]) s = l;
                                if (r < heap.length && heap[r][0] < heap[s][0]) s = r;
                                if (s === i) break;
                                const t = heap[s]; heap[s] = heap[i]; heap[i] = t;
                                i = s;
                            }
                        }
                        return top;
                    };

                    for (const key of this.roadTiles) { dist.set(key, 0); push(key, 0); }
                    while (heap.length) {
                        const entry = pop();
                        const d = entry[0], key = entry[1];
                        if (d > dist.get(key)) continue;
                        const parts = key.split(',');
                        const kx = +parts[0], ky = +parts[1];
                        for (const nk of [(kx-1)+','+ky, (kx+1)+','+ky, kx+','+(ky-1), kx+','+(ky+1)]) {
                            const val = this.grid.get(nk);
                            let step;
                            if (val === 0) step = 1;
                            else if (val === 1) {
                                const b = owner.get(nk);
                                if (!b || isProtected(b) || todoSet.has(b)) continue;
                                step = 200 + b.width * b.height;
                            }
                            else continue;
                            const nd = d + step;
                            if (dist.has(nk) && dist.get(nk) <= nd) continue;
                            dist.set(nk, nd);
                            parent.set(nk, key);
                            push(nk, nd);
                        }
                    }

                    // cheapest stub over all unconnected buildings, then re-measure
                    let bestPath = null, bestCost = Infinity;
                    for (const b of todo) {
                        const r = this.connRect(b);
                        const per = [];
                        for (let i = r.x; i < r.x + r.width; i++) per.push(i + ',' + (r.y - 1), i + ',' + (r.y + r.height));
                        for (let j = r.y; j < r.y + r.height; j++) per.push((r.x - 1) + ',' + j, (r.x + r.width) + ',' + j);
                        for (const pt of per) {
                            const dv = dist.get(pt);
                            if (dv === undefined || dv === 0 || dv >= bestCost) continue;
                            const path = [];
                            let cur = pt;
                            while (cur && dist.get(cur) > 0) { path.push(cur); cur = parent.get(cur); }
                            bestPath = path;
                            bestCost = dv;
                        }
                    }
                    if (!bestPath) break;

                    for (const key of bestPath) {
                        const b = owner.get(key);
                        if (b && this.grid.get(key) === 1) {
                            // demolish: free every tile, re-place the building later
                            for (let i = b.x; i < b.x + b.width; i++) {
                                for (let j = b.y; j < b.y + b.height; j++) this.grid.set(i + ',' + j, 0);
                            }
                            this.placedBuildings.splice(this.placedBuildings.indexOf(b), 1);
                            requeue.push(b);
                        }
                    }
                    for (const key of bestPath) {
                        const parts = key.split(',');
                        this.placeRoadTile(+parts[0], +parts[1]);
                    }
                }

                // re-place what the stubs tore down: next to a road if possible,
                // any free spot otherwise - the closing connect pass wires them up
                if (requeue.length) {
                    const coords = [];
                    for (let cy = this.mapBounds.minY; cy < this.mapBounds.maxY; cy++) {
                        for (let cx = this.mapBounds.minX; cx < this.mapBounds.maxX; cx++) coords.push([cx, cy]);
                    }
                    for (const b of requeue) {
                        // free tiles reachable from the road network - a fallback
                        // spot must border one of them, otherwise the closing
                        // connect pass could never give it a stub
                        const reach = new Set();
                        const fifo = [...this.roadTiles];
                        const visited = new Set(fifo);
                        let head = 0;
                        while (head < fifo.length) {
                            const key = fifo[head++];
                            const parts = key.split(',');
                            const kx = +parts[0], ky = +parts[1];
                            for (const nk of [(kx-1)+','+ky, (kx+1)+','+ky, kx+','+(ky-1), kx+','+(ky+1)]) {
                                if (this.grid.get(nk) === 0 && !visited.has(nk)) {
                                    visited.add(nk);
                                    reach.add(nk);
                                    fifo.push(nk);
                                }
                            }
                        }
                        // chain composites connect through the head member only
                        const hw = b.chainMembers ? b.chainMembers[0].width : b.width;
                        const hh = b.chainMembers ? b.chainMembers[0].height : b.height;
                        let spot = null;
                        for (const [cx, cy] of coords) {
                            if (this.grid.get(cx + ',' + cy) !== 0 || !this.canPlace(cx, cy, b.width, b.height)) continue;
                            if (!this.gbKeepsStubSpace(cx, cy, b.width, b.height)) continue;
                            if (this.isConnectedToRoad(cx, cy, hw, hh)) { spot = [cx, cy]; break; }
                            if (!spot) {
                                let touches = false;
                                for (let i = cx; i < cx + hw && !touches; i++) {
                                    if (reach.has(i + ',' + (cy - 1)) || reach.has(i + ',' + (cy + hh))) touches = true;
                                }
                                for (let j = cy; j < cy + hh && !touches; j++) {
                                    if (reach.has((cx - 1) + ',' + j) || reach.has((cx + hw) + ',' + j)) touches = true;
                                }
                                if (touches) spot = [cx, cy];
                            }
                        }
                        if (spot) this.placeEntity(b, spot[0], spot[1], 1);
                    }
                    this.connectPlacedBuildings();
                }
            }

            // roads must form one network reaching the town hall: join stray
            // components with the shortest free paths, drop what stays unreachable
            unifyRoadNetwork() {
                if (!this.roadTiles.size) return;

                const compOf = new Map();
                const comps = [];
                for (const key of this.roadTiles) {
                    if (compOf.has(key)) continue;
                    const comp = [];
                    const stack = [key];
                    compOf.set(key, comps.length);
                    while (stack.length) {
                        const k = stack.pop();
                        comp.push(k);
                        const parts = k.split(',');
                        const kx = +parts[0], ky = +parts[1];
                        for (const nk of [(kx-1)+','+ky, (kx+1)+','+ky, kx+','+(ky-1), kx+','+(ky+1)]) {
                            if (this.roadTiles.has(nk) && !compOf.has(nk)) {
                                compOf.set(nk, comps.length);
                                stack.push(nk);
                            }
                        }
                    }
                    comps.push(comp);
                }
                if (comps.length <= 1) return;

                // the component touching the town hall is the main one; without
                // a placed town hall the largest component takes that role
                let mainIdx = -1;
                if (this.townHallPos) {
                    const [tx, ty] = this.townHallPos;
                    const per = [];
                    for (let i = tx; i < tx + this.townHall.width; i++) per.push(i + ',' + (ty - 1), i + ',' + (ty + this.townHall.height));
                    for (let j = ty; j < ty + this.townHall.height; j++) per.push((tx - 1) + ',' + j, (tx + this.townHall.width) + ',' + j);
                    for (const pt of per) {
                        if (compOf.has(pt)) { mainIdx = compOf.get(pt); break; }
                    }
                }
                if (mainIdx === -1) {
                    comps.forEach((c, i) => { if (mainIdx === -1 || c.length > comps[mainIdx].length) mainIdx = i; });
                }

                let main = comps[mainIdx];
                let others = comps.filter((c, i) => i !== mainIdx);

                while (others.length) {
                    // BFS over free tiles from the main network
                    const dist = new Map(), parent = new Map(), fifo = [];
                    for (const key of main) { dist.set(key, 0); fifo.push(key); }
                    let head = 0;
                    while (head < fifo.length) {
                        const key = fifo[head++];
                        const parts = key.split(',');
                        const kx = +parts[0], ky = +parts[1];
                        const d = dist.get(key);
                        for (const nk of [(kx-1)+','+ky, (kx+1)+','+ky, kx+','+(ky-1), kx+','+(ky+1)]) {
                            if (this.grid.get(nk) === 0 && !dist.has(nk)) {
                                dist.set(nk, d + 1);
                                parent.set(nk, key);
                                fifo.push(nk);
                            }
                        }
                    }

                    // stray component with the cheapest link to the main network
                    let bestPath = null, bestIdx = -1;
                    for (let ci = 0; ci < others.length; ci++) {
                        for (const key of others[ci]) {
                            const parts = key.split(',');
                            const kx = +parts[0], ky = +parts[1];
                            for (const nk of [(kx-1)+','+ky, (kx+1)+','+ky, kx+','+(ky-1), kx+','+(ky+1)]) {
                                const dv = dist.get(nk);
                                if (dv === undefined || dv === 0) continue;
                                if (bestPath && dv >= bestPath.length) continue;
                                const path = [];
                                let cur = nk;
                                while (cur && dist.get(cur) > 0) {
                                    path.push(cur);
                                    cur = parent.get(cur);
                                }
                                bestPath = path;
                                bestIdx = ci;
                            }
                        }
                    }

                    if (!bestPath) break;
                    for (const key of bestPath) {
                        const parts = key.split(',');
                        this.placeRoadTile(+parts[0], +parts[1]);
                    }
                    main = main.concat(bestPath, others[bestIdx]);
                    others.splice(bestIdx, 1);
                }

                // still stray = unusable in the game, remove those roads
                for (const comp of others) {
                    for (const key of comp) {
                        this.grid.set(key, 0);
                        this.roadTiles.delete(key);
                        this.roadLevel.delete(key);
                    }
                }
            }

            placeRoadTile(x, y, level) {
                const key = x + ',' + y;
                const lvl = level || 1;
                if (this.grid.get(key) === 0) {
                    this.grid.set(key, 2);
                    this.roadTiles.add(key);
                    this.roadLevel.set(key, lvl);
                    return true;
                }
                // an existing road tile can be upgraded to two-lane
                if (this.grid.get(key) === 2 && lvl > (this.roadLevel.get(key) || 1)) {
                    this.roadLevel.set(key, lvl);
                    return true;
                }
                return false;
            }

            /**
             * Index of a tile in the integer snapshots.
             *
             * @param {number} x - Tile x.
             * @param {number} y - Tile y.
             * @returns {number} Cell index.
             */
            cellId(x, y) {
                return (y - this.mapBounds.minY + 1) * this.gridW + (x - this.mapBounds.minX + 1);
            }

            /**
             * Copies the grid into a typed array (-1 outside, 0 free, 1 building,
             * 2 road, 9 town hall). Flood fills and scans on it run many times
             * faster than on the string keyed map.
             *
             * @returns {Int8Array} Cell values, indexed by cellId().
             */
            snapshot() {
                const cells = new Int8Array(this.gridW * this.gridH).fill(-1);
                const keys = this.cellKeys, ids = this.cellIds;
                for (let i = 0; i < keys.length; i++) cells[ids[i]] = this.grid.get(keys[i]);
                return cells;
            }

            canPlace(x, y, w, h) {
                for (let i = x; i < x + w; i++) {
                    for (let j = y; j < y + h; j++) {
                        if (this.grid.get(i + ',' + j) !== 0) return false;
                    }
                }
                return true;
            }

            placeEntity(item, x, y, etype = 1) {
                for (let i = x; i < x + item.width; i++) {
                    for (let j = y; j < y + item.height; j++) {
                        const key = i + ',' + j;
                        this.grid.set(key, etype);
                        if (etype === 2) { this.roadTiles.add(key); this.roadLevel.set(key, 1); }
                    }
                }
                this.placedBuildings.push({ ...item, x: x, y: y });
            }

            isConnectedToRoad(x, y, w, h) {
                for (let i = x; i < x + w; i++) if (this.grid.get(i + ',' + (y - 1)) === 2) return true;
                for (let i = x; i < x + w; i++) if (this.grid.get(i + ',' + (y + h)) === 2) return true;
                for (let j = y; j < y + h; j++) if (this.grid.get((x - 1) + ',' + j) === 2) return true;
                for (let j = y; j < y + h; j++) if (this.grid.get((x + w) + ',' + j) === 2) return true;
                return false;
            }

            // all two-lane tiles reachable from the town hall through two-lane
            // tiles only - the game demands an unbroken two-lane path
            linkedTwoLaneTiles() {
                const linked = new Set();
                if (!this.townHallPos) return linked;
                const isL2 = (key) => this.grid.get(key) === 2 && (this.roadLevel.get(key) || 1) >= 2;
                const stack = [];
                const seed = (key) => {
                    if (isL2(key) && !linked.has(key)) { linked.add(key); stack.push(key); }
                };
                const [tx, ty] = this.townHallPos;
                for (let i = tx; i < tx + this.townHall.width; i++) { seed(i + ',' + (ty - 1)); seed(i + ',' + (ty + this.townHall.height)); }
                for (let j = ty; j < ty + this.townHall.height; j++) { seed((tx - 1) + ',' + j); seed((tx + this.townHall.width) + ',' + j); }
                while (stack.length) {
                    const k = stack.pop();
                    const parts = k.split(',');
                    const kx = +parts[0], ky = +parts[1];
                    seed((kx - 1) + ',' + ky);
                    seed((kx + 1) + ',' + ky);
                    seed(kx + ',' + (ky - 1));
                    seed(kx + ',' + (ky + 1));
                }
                return linked;
            }

            // does the building border on any tile of the given two-lane set?
            touchesTwoLane(b, linked) {
                for (let i = b.x; i < b.x + b.width; i++) {
                    if (linked.has(i + ',' + (b.y - 1)) || linked.has(i + ',' + (b.y + b.height))) return true;
                }
                for (let j = b.y; j < b.y + b.height; j++) {
                    if (linked.has((b.x - 1) + ',' + j) || linked.has((b.x + b.width) + ',' + j)) return true;
                }
                return false;
            }

            // while more two-lane buildings wait, a placement (footprint plus the
            // planned corridor tiles) must not entomb the two-lane network: the
            // corridor blocks must still reach the largest free region, where the
            // future buildings will go - and with enough room for all of them,
            // one reachable block in a dead-end bottleneck is worthless
            keepsTwoLaneGrowth(x, y, w, h, pathTiles, needBlocks) {
                const need = Math.max(1, needBlocks || 1);
                const linked = this.linkedTwoLaneTiles();
                const pathSet = new Set(pathTiles || []);
                if (!linked.size && !pathSet.size) return true;
                const inFoot = (px, py) => px >= x && px < x + w && py >= y && py < y + h;
                // corridor tiles count as two-lane road, not as free space
                const val = (key) => pathSet.has(key) ? 2 : this.grid.get(key);

                // largest free region outside the planned footprint
                const regionOf = new Map();
                let largestId = -1, largestSize = 0, regionId = 0;
                for (const [key] of this.grid) {
                    if (val(key) !== 0 || regionOf.has(key)) continue;
                    const parts = key.split(',');
                    if (inFoot(+parts[0], +parts[1])) continue;
                    const id = regionId++;
                    let size = 0;
                    const stack = [key];
                    regionOf.set(key, id);
                    while (stack.length) {
                        const k = stack.pop();
                        size++;
                        const p2 = k.split(',');
                        const kx = +p2[0], ky = +p2[1];
                        for (const nk of [(kx-1)+','+ky, (kx+1)+','+ky, kx+','+(ky-1), kx+','+(ky+1)]) {
                            if (val(nk) !== 0 || regionOf.has(nk)) continue;
                            const p3 = nk.split(',');
                            if (inFoot(+p3[0], +p3[1])) continue;
                            regionOf.set(nk, id);
                            stack.push(nk);
                        }
                    }
                    if (size > largestSize) { largestSize = size; largestId = id; }
                }
                if (largestId === -1) return true;

                // block-level reachability BFS: a tile-connected escape through a
                // one tile wide gap is useless, the 2x2 corridor blocks themselves
                // must reach a block lying fully inside the largest free region
                const blockValid = (bx, by) => {
                    for (const pt of [[bx, by], [bx + 1, by], [bx, by + 1], [bx + 1, by + 1]]) {
                        if (inFoot(pt[0], pt[1])) return false;
                        const v = val(pt[0] + ',' + pt[1]);
                        if (v !== 0 && v !== 2) return false;
                    }
                    return true;
                };
                const inRegionBlock = (bx, by) => {
                    for (const pt of [[bx, by], [bx + 1, by], [bx, by + 1], [bx + 1, by + 1]]) {
                        if (regionOf.get(pt[0] + ',' + pt[1]) !== largestId) return false;
                    }
                    return true;
                };
                const seen = new Set();
                const stack = [];
                const seed = (bx, by) => {
                    const key = bx + ',' + by;
                    if (!seen.has(key) && blockValid(bx, by)) { seen.add(key); stack.push([bx, by]); }
                };
                // seeds: blocks on the network (with the planned corridor) plus
                // fresh blocks anchored at the town hall
                for (const key of [...linked, ...pathSet]) {
                    const parts = key.split(',');
                    const kx = +parts[0], ky = +parts[1];
                    for (let bx = kx - 1; bx <= kx; bx++) {
                        for (let by = ky - 1; by <= ky; by++) seed(bx, by);
                    }
                }
                if (this.townHallPos) {
                    const th = { x: this.townHallPos[0], y: this.townHallPos[1], width: this.townHall.width, height: this.townHall.height };
                    for (let by = th.y - 2; by <= th.y + th.height; by++) {
                        for (let bx = th.x - 2; bx <= th.x + th.width; bx++) {
                            if (this.blockTouchesRect(bx, by, th)) seed(bx, by);
                        }
                    }
                }
                let regionBlocks = 0;
                while (stack.length) {
                    const blk = stack.pop();
                    if (inRegionBlock(blk[0], blk[1])) {
                        regionBlocks++;
                        if (regionBlocks >= need) return true;
                    }
                    seed(blk[0] - 1, blk[1]);
                    seed(blk[0] + 1, blk[1]);
                    seed(blk[0], blk[1] - 1);
                    seed(blk[0], blk[1] + 1);
                }
                return false;
            }

            // the four tile keys of the 2x2 block with this top-left corner
            blockTiles(bx, by) {
                return [bx + ',' + by, (bx + 1) + ',' + by, bx + ',' + (by + 1), (bx + 1) + ',' + (by + 1)];
            }

            // does the 2x2 block orthogonally touch the given rectangle?
            blockTouchesRect(bx, by, r) {
                for (const key of this.blockTiles(bx, by)) {
                    const parts = key.split(',');
                    const px = +parts[0], py = +parts[1];
                    if ((py === r.y - 1 || py === r.y + r.height) && px >= r.x && px < r.x + r.width) return true;
                    if ((px === r.x - 1 || px === r.x + r.width) && py >= r.y && py < r.y + r.height) return true;
                }
                return false;
            }

            // Dijkstra over 2x2 block top-left positions. Two-lane streets are 2x2
            // pieces, so corridors are built from such blocks; upgrading existing
            // one-lane tiles is cheaper than claiming free ones. Seeds: blocks
            // fully inside the linked network (free) and blocks touching the town
            // hall (anchor of a brand-new network). With footprint=true every
            // block costs - existing two-lane included - so the cheapest chain
            // is the shortest one: that is the pricing for the trim pass, which
            // decides how much two-lane road survives at all. With a parity
            // [px, py] the search runs on a step-2 lattice: all blocks are
            // disjoint like the game's real 2x2 pieces, so the result is always
            // buildable from whole pieces
            twoLaneBlockDist(linked, footprint, parity) {
                const minX = this.mapBounds.minX, maxX = this.mapBounds.maxX;
                const minY = this.mapBounds.minY, maxY = this.mapBounds.maxY;
                const step = parity ? 2 : 1;
                const onLattice = (bx, by) => !parity
                    || (((bx % 2) + 2) % 2 === parity[0] && ((by % 2) + 2) % 2 === parity[1]);
                // -1 = blocked, otherwise price: free tile 2, one-lane road 1, two-lane 0
                const blockCost = (bx, by) => {
                    let cost = 0;
                    for (const key of this.blockTiles(bx, by)) {
                        const v = this.grid.get(key);
                        if (v !== 0 && v !== 2) return -1;
                        if (footprint) cost += (v === 0) ? 3 : 2;
                        else if (v === 0) cost += 2;
                        else if ((this.roadLevel.get(key) || 1) < 2) cost += 1;
                    }
                    return cost;
                };
                const th = { x: this.townHallPos[0], y: this.townHallPos[1], width: this.townHall.width, height: this.townHall.height };

                const dist = new Map(), parent = new Map();
                const heap = [];
                const push = (key, d) => {
                    heap.push([d, key]);
                    let i = heap.length - 1;
                    while (i > 0) {
                        const p = (i - 1) >> 1;
                        if (heap[p][0] <= heap[i][0]) break;
                        const t = heap[p]; heap[p] = heap[i]; heap[i] = t;
                        i = p;
                    }
                };
                const pop = () => {
                    const top = heap[0];
                    const last = heap.pop();
                    if (heap.length) {
                        heap[0] = last;
                        let i = 0;
                        while (true) {
                            const l = i * 2 + 1, r = l + 1;
                            let s = i;
                            if (l < heap.length && heap[l][0] < heap[s][0]) s = l;
                            if (r < heap.length && heap[r][0] < heap[s][0]) s = r;
                            if (s === i) break;
                            const t = heap[s]; heap[s] = heap[i]; heap[i] = t;
                            i = s;
                        }
                    }
                    return top;
                };

                for (let by = minY; by < maxY - 1; by++) {
                    for (let bx = minX; bx < maxX - 1; bx++) {
                        if (!onLattice(bx, by)) continue;
                        const c = blockCost(bx, by);
                        if (c < 0) continue;
                        let d = -1;
                        if (linked.size && this.blockTiles(bx, by).every(k => linked.has(k))) d = 0;
                        else if (this.blockTouchesRect(bx, by, th)) d = c;
                        if (d >= 0) {
                            const bk = bx + ',' + by;
                            if (!dist.has(bk) || dist.get(bk) > d) { dist.set(bk, d); push(bk, d); }
                        }
                    }
                }

                while (heap.length) {
                    const entry = pop();
                    const d = entry[0], key = entry[1];
                    if (d > dist.get(key)) continue;
                    const parts = key.split(',');
                    const bx = +parts[0], by = +parts[1];
                    for (const nb of [[bx-step,by],[bx+step,by],[bx,by-step],[bx,by+step]]) {
                        if (nb[0] < minX || nb[0] >= maxX - 1 || nb[1] < minY || nb[1] >= maxY - 1) continue;
                        const c = blockCost(nb[0], nb[1]);
                        if (c < 0) continue;
                        const nk = nb[0] + ',' + nb[1];
                        const nd = d + c;
                        if (dist.has(nk) && dist.get(nk) <= nd) continue;
                        dist.set(nk, nd);
                        parent.set(nk, key);
                        push(nk, nd);
                    }
                }
                return { dist: dist, parent: parent };
            }

            // build the block path ending in this block, network first
            materializeBlockPath(bestKey, parent) {
                let cur = bestKey;
                while (cur !== undefined) {
                    const parts = cur.split(',');
                    for (const key of this.blockTiles(+parts[0], +parts[1])) {
                        const kp = key.split(',');
                        this.placeRoadTile(+kp[0], +kp[1], 2);
                    }
                    cur = parent.get(cur);
                }
            }

            // two-lane requirement: the building must touch a two-lane road whose
            // network reaches the town hall - give every already placed two-lane
            // building the cheapest block corridor that is still possible
            connectTwoLane() {
                if (!this.townHallPos) return;
                let guard = 0;
                while (guard++ < 40) {
                    const linked = this.linkedTwoLaneTiles();
                    const todo = this.placedBuildings.filter(b => (b.street_level || 0) >= 2 && !this.touchesTwoLane(this.connRect(b), linked));
                    if (!todo.length) return;

                    const bd = this.twoLaneBlockDist(linked);

                    // cheapest corridor over all waiting buildings, then re-measure
                    let bestKey = null, bestCost = Infinity;
                    for (const t of todo) {
                        const r = this.connRect(t);
                        for (let by = r.y - 2; by <= r.y + r.height; by++) {
                            for (let bx = r.x - 2; bx <= r.x + r.width; bx++) {
                                if (!this.blockTouchesRect(bx, by, r)) continue;
                                const dv = bd.dist.get(bx + ',' + by);
                                if (dv !== undefined && dv < bestCost) { bestCost = dv; bestKey = bx + ',' + by; }
                            }
                        }
                    }
                    if (bestKey === null) return;

                    this.materializeBlockPath(bestKey, bd.parent);
                }
            }

            // the strategies lay two-lane roads generously (double band rows, a
            // double trunk) and pruneRoadsSmart never touches level-2 tiles - so
            // re-route every two-lane building onto its cheapest possible block
            // corridor from the town hall (reusing existing two-lane for free,
            // upgrading one-lane cheaply, claiming free tiles as the last
            // resort) and downgrade every other two-lane tile to one-lane,
            // where the prune pass can take it back; a single two-lane building
            // next to the town hall ends up with one single 2x2 piece
            trimTwoLane() {
                if (!this.townHallPos) return;
                const l2Buildings = this.placedBuildings.filter(b => (b.street_level || 0) >= 2);
                if (!l2Buildings.length) {
                    for (const key of this.roadTiles) {
                        if ((this.roadLevel.get(key) || 1) >= 2) this.roadLevel.set(key, 1);
                    }
                    return;
                }

                // cheapest chain head per building for a given Dijkstra tree,
                // null when some building is unreachable in it
                const resolveChains = (bd) => {
                    const heads = [];
                    let total = 0;
                    for (const b of l2Buildings) {
                        const r = this.connRect(b);
                        let bestKey = null, bestCost = Infinity;
                        for (let by = r.y - 2; by <= r.y + r.height; by++) {
                            for (let bx = r.x - 2; bx <= r.x + r.width; bx++) {
                                if (!this.blockTouchesRect(bx, by, r)) continue;
                                const dv = bd.dist.get(bx + ',' + by);
                                if (dv !== undefined && dv < bestCost) { bestCost = dv; bestKey = bx + ',' + by; }
                            }
                        }
                        if (bestKey === null) return null;
                        heads.push(bestKey);
                        total += bestCost;
                    }
                    return { heads: heads, total: total };
                };

                // fresh block Dijkstra seeded at the town hall only, footprint
                // pricing (shortest chain wins) - all chains come from one tree,
                // so corridors of nearby buildings share their common prefix
                // automatically. Preferred: a step-2 parity lattice, whose blocks
                // are disjoint like the game's real 2x2 pieces - the cheapest of
                // the four lattices wins; the free unit-step search is only the
                // fallback for buildings no lattice can reach
                let chosen = null, chosenBd = null;
                for (const par of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
                    const bd = this.twoLaneBlockDist(new Set(), true, par);
                    const res = resolveChains(bd);
                    if (res && (!chosen || res.total < chosen.total)) { chosen = res; chosenBd = bd; }
                }
                if (!chosen) {
                    const bd = this.twoLaneBlockDist(new Set(), true);
                    const res = resolveChains(bd);
                    // not even freely reachable: keep the network untouched,
                    // trimming could cut a working connection
                    if (!res) return;
                    chosen = res;
                    chosenBd = bd;
                }

                const needed = new Set();
                for (const bestKey of chosen.heads) {
                    let cur = bestKey;
                    while (cur !== undefined) {
                        const parts = cur.split(',');
                        for (const key of this.blockTiles(+parts[0], +parts[1])) needed.add(key);
                        cur = chosenBd.parent.get(cur);
                    }
                }

                // build the new corridors (claims free tiles, upgrades one-lane
                // tiles), then downgrade all two-lane tiles outside of them
                for (const key of needed) {
                    const parts = key.split(',');
                    this.placeRoadTile(+parts[0], +parts[1], 2);
                }
                for (const key of this.roadTiles) {
                    if ((this.roadLevel.get(key) || 1) >= 2 && !needed.has(key)) this.roadLevel.set(key, 1);
                }
            }

            // remove a placed building again and free its tiles
            removePlaced(b) {
                for (let i = b.x; i < b.x + b.width; i++) {
                    for (let j = b.y; j < b.y + b.height; j++) this.grid.set(i + ',' + j, 0);
                }
                this.placedBuildings.splice(this.placedBuildings.indexOf(b), 1);
            }

            // a building even the repair passes could not wire up must not stay
            // on the map as a fake plan - drop it, the export reports it in the
            // unplaced list instead
            dropUnconnected() {
                for (const b of [...this.placedBuildings]) {
                    if (b.type === 'main_building' || b.pinned || b.loose || !(b.street_level > 0)) continue;
                    const r = this.connRect(b);
                    if (this.isConnectedToRoad(r.x, r.y, r.width, r.height)) continue;
                    this.removePlaced(b);
                }
            }

            // same policy for two-lane buildings no corridor could reach
            dropTwoLaneUnserved() {
                const linked = this.linkedTwoLaneTiles();
                let dropped = false;
                for (const b of [...this.placedBuildings]) {
                    if ((b.street_level || 0) < 2 || b.pinned || b.loose) continue;
                    if (this.touchesTwoLane(this.connRect(b), linked)) continue;
                    this.removePlaced(b);
                    dropped = true;
                }
                return dropped;
            }

            // greedy top-left tiling of the two-lane tiles into disjoint 2x2
            // pieces - the same order the export uses; returns the tiles no
            // piece covers
            tileTwoLaneBlocks() {
                const isL2 = (key) => this.roadTiles.has(key) && (this.roadLevel.get(key) || 1) >= 2;
                const consumed = new Set();
                const strays = [];
                const coords = [...this.roadTiles].filter(isL2).map(k => k.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
                for (const [x, y] of coords) {
                    const key = x + ',' + y;
                    if (consumed.has(key)) continue;
                    const rest = [(x + 1) + ',' + y, x + ',' + (y + 1), (x + 1) + ',' + (y + 1)];
                    if (rest.every(k => isL2(k) && !consumed.has(k))) {
                        consumed.add(key);
                        rest.forEach(k => consumed.add(k));
                    } else {
                        strays.push([x, y]);
                    }
                }
                return strays;
            }

            // the game only sells two-lane streets as whole 2x2 pieces, so the
            // planned corridors must decompose into such pieces - corridors of
            // odd length leave a 2x1 rest after the tiling; grow them by free
            // tiles until every two-lane tile is covered by a whole piece
            completeTwoLaneBlocks() {
                const isL2 = (key) => this.roadTiles.has(key) && (this.roadLevel.get(key) || 1) >= 2;
                let guard = 0;
                let strays = this.tileTwoLaneBlocks();
                while (strays.length && guard++ < 20) {
                    let grown = false;
                    for (const [x, y] of strays) {
                        // any block containing this tile whose missing tiles are
                        // free or upgradable one-lane road tiles
                        for (const [bx, by] of [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]]) {
                            const missing = this.blockTiles(bx, by).filter(k => !isL2(k));
                            if (missing.length && missing.every(k => this.grid.get(k) === 0 || this.grid.get(k) === 2)) {
                                for (const k of missing) {
                                    const parts = k.split(',');
                                    this.placeRoadTile(+parts[0], +parts[1], 2);
                                }
                                grown = true;
                                break;
                            }
                        }
                    }
                    if (!grown) break;
                    strays = this.tileTwoLaneBlocks();
                }

                // tiles no whole piece can cover get downgraded - two-lane
                // buildings whose only interface was such a tile are returned:
                // their spot cannot be served with whole pieces even in the
                // game, the caller drops them into the unplaced report
                strays = this.tileTwoLaneBlocks();
                const broken = [];
                if (strays.length) {
                    const backup = strays.map(([x, y]) => x + ',' + y);
                    for (const k of backup) this.roadLevel.set(k, 1);
                    const linked = this.linkedTwoLaneTiles();
                    for (const b of this.placedBuildings) {
                        if ((b.street_level || 0) >= 2 && !this.touchesTwoLane(this.connRect(b), linked)) broken.push(b);
                    }
                }
                return broken;
            }

            // organic placement for a two-lane building: prefer spots that already
            // touch the linked network, otherwise take the spot with the cheapest
            // block corridor and build that corridor before placing - a corridor
            // planned after tight packing would find no room anymore
            placeTwoLaneOrganic(b, coords, keepsGrowth, needed, l2Left) {
                const linked = this.linkedTwoLaneTiles();
                const hw = b.chainMembers ? b.chainMembers[0].width : b.width;
                const hh = b.chainMembers ? b.chainMembers[0].height : b.height;
                const bd = this.twoLaneBlockDist(linked);

                const candidates = [];
                for (const [x, y] of coords) {
                    if (this.grid.get(x + ',' + y) !== 0 || !this.canPlace(x, y, b.width, b.height)) continue;
                    // never take an unconnected great building's last free
                    // neighbour tile - repair cannot demolish its walls
                    if (!this.gbKeepsStubSpace(x, y, b.width, b.height)) continue;
                    const head = { x: x, y: y, width: hw, height: hh };
                    if (this.touchesTwoLane(head, linked)) {
                        if (!keepsGrowth([], x, y, b.width, b.height, needed)) continue;
                        if (l2Left > 0 && !this.keepsTwoLaneGrowth(x, y, b.width, b.height, [], l2Left)) continue;
                        this.placeEntity(b, x, y, 1);
                        return true;
                    }
                    // cheapest block next to the head that does not overlap the footprint
                    let cost = Infinity, bkey = null;
                    for (let by = head.y - 2; by <= head.y + head.height; by++) {
                        for (let bx = head.x - 2; bx <= head.x + head.width; bx++) {
                            if (bx + 1 >= x && bx < x + b.width && by + 1 >= y && by < y + b.height) continue;
                            if (!this.blockTouchesRect(bx, by, head)) continue;
                            const dv = bd.dist.get(bx + ',' + by);
                            if (dv !== undefined && dv < cost) { cost = dv; bkey = bx + ',' + by; }
                        }
                    }
                    if (bkey !== null) candidates.push([cost, x, y, bkey]);
                }

                candidates.sort((p, q) => p[0] - q[0]);
                for (const cand of candidates) {
                    const x = cand[1], y = cand[2];
                    // walk the corridor first - it must not cross the footprint
                    const path = [];
                    let cur = cand[3], ok = true;
                    while (cur !== undefined) {
                        const parts = cur.split(',');
                        const bx = +parts[0], by = +parts[1];
                        if (bx + 1 >= x && bx < x + b.width && by + 1 >= y && by < y + b.height) { ok = false; break; }
                        path.push(cur);
                        cur = bd.parent.get(cur);
                    }
                    if (!ok) continue;
                    const pathTiles = [];
                    for (const bk of path) {
                        const parts = bk.split(',');
                        for (const key of this.blockTiles(+parts[0], +parts[1])) {
                            if (this.grid.get(key) === 0) pathTiles.push(key);
                        }
                    }
                    if (!keepsGrowth(pathTiles, x, y, b.width, b.height, needed)) continue;
                    if (l2Left > 0 && !this.keepsTwoLaneGrowth(x, y, b.width, b.height, pathTiles, l2Left)) continue;
                    for (const bk of path) {
                        const parts = bk.split(',');
                        for (const key of this.blockTiles(+parts[0], +parts[1])) {
                            const kp = key.split(',');
                            this.placeRoadTile(+kp[0], +kp[1], 2);
                        }
                    }
                    this.placeEntity(b, x, y, 1);
                    return true;
                }
                return false;
            }

            // Multi-source BFS from the map border inward: depth 0 = tile touches the
            // border (or a locked area), used to fill roadless buildings edge-first
            computeEdgeDepth() {
                const depth = new Map();
                const queue = [];
                for (const [key, val] of this.grid) {
                    if (val === -1) continue;
                    const [x, y] = key.split(',').map(Number);
                    for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
                        const nv = this.grid.get(nx + ',' + ny);
                        if (nv === undefined || nv === -1) {
                            depth.set(key, 0);
                            queue.push([x, y]);
                            break;
                        }
                    }
                }
                let head = 0;
                while (head < queue.length) {
                    const [x, y] = queue[head++];
                    const d = depth.get(x + ',' + y);
                    for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
                        const nkey = nx + ',' + ny;
                        const nv = this.grid.get(nkey);
                        if (nv === undefined || nv === -1 || depth.has(nkey)) continue;
                        depth.set(nkey, d + 1);
                        queue.push([nx, ny]);
                    }
                }
                return depth;
            }

            /**
             * Removes every road tile nobody needs. A tile may go when all
             * remaining tiles still reach the town hall through roads (adjacency
             * to the town hall is the anchor - that keeps networks of several
             * town-hall-anchored components prunable) and no adjacent building
             * loses its last road tile. Unlike pure dead-end peeling this also
             * removes parallel double roads, which are connected at both ends
             * and would survive forever otherwise.
             */
            pruneRoadsSmart() {
                const W = this.gridW;
                const cells = this.snapshot();

                // the town hall counts too: its last road tile must survive -
                // chain composites only guard the road at their head member
                const streetBuildings = this.placedBuildings.filter(b => b.street_level > 0).map(b => this.connRect(b));
                const perimeter = (b) => {
                    const per = [];
                    for (let i = b.x; i < b.x + b.width; i++) per.push(this.cellId(i, b.y - 1), this.cellId(i, b.y + b.height));
                    for (let j = b.y; j < b.y + b.height; j++) per.push(this.cellId(b.x - 1, j), this.cellId(b.x + b.width, j));
                    return per;
                };

                // buildings per bordering tile and road tiles per building
                const touching = new Map();
                const adjacent = new Int32Array(streetBuildings.length);
                streetBuildings.forEach((b, bi) => {
                    for (const id of perimeter(b)) {
                        if (!touching.has(id)) touching.set(id, []);
                        touching.get(id).push(bi);
                        if (cells[id] === 2) adjacent[bi]++;
                    }
                });

                const th = this.townHallPos
                    ? { x: this.townHallPos[0], y: this.townHallPos[1], width: this.townHall.width, height: this.townHall.height }
                    : null;
                const anchors = th ? perimeter(th) : [];
                const isAnchor = new Set(anchors);

                let roadCount = this.roadTiles.size;
                const seen = new Int32Array(cells.length);
                const stack = new Int32Array(cells.length);
                let stamp = 0;
                const stillConnected = (skip) => {
                    stamp++;
                    seen[skip] = stamp;
                    let top = 0, count = 0;
                    const visit = (id) => {
                        if (cells[id] === 2 && seen[id] !== stamp) { seen[id] = stamp; stack[top++] = id; count++; }
                    };
                    if (th) {
                        for (const id of anchors) visit(id);
                    } else {
                        for (const key of this.roadTiles) {
                            if (this.cellIdOf.get(key) !== skip) { visit(this.cellIdOf.get(key)); break; }
                        }
                    }
                    if (!count) return roadCount <= 1;
                    while (top) {
                        const id = stack[--top];
                        visit(id - 1);
                        visit(id + 1);
                        visit(id - W);
                        visit(id + W);
                    }
                    return count === roadCount - 1;
                };

                let changed = true;
                while (changed) {
                    changed = false;
                    for (const key of [...this.roadTiles]) {
                        // two-lane tiles are deliberate 2x2 blocks - never prune them
                        if ((this.roadLevel.get(key) || 1) >= 2) continue;

                        // One connection tile per building is enough - keep this tile
                        // if some adjacent building would lose its last road tile
                        const id = this.cellIdOf.get(key);
                        const users = touching.get(id);
                        if (users && users.some(bi => adjacent[bi] <= 1)) continue;

                        const neighbors = (cells[id - 1] === 2) + (cells[id + 1] === 2) + (cells[id - W] === 2) + (cells[id + W] === 2);

                        // endpoints can never split the tile graph - but a tile
                        // on the town hall perimeter can be the anchor of its
                        // whole branch, so it always takes the reachability check
                        if ((neighbors > 1 || isAnchor.has(id)) && !stillConnected(id)) continue;

                        this.grid.set(key, 0);
                        this.roadTiles.delete(key);
                        this.roadLevel.delete(key);
                        cells[id] = 0;
                        roadCount--;
                        if (users) for (const bi of users) adjacent[bi]--;
                        changed = true;
                    }
                }
            }

            /**
             * Tile-by-tile packer for the roadless buildings: walks the map row
             * by row and fills every free tile with the remaining building that
             * fits there with the longest touching perimeter (contact with
             * buildings, roads and the map border). Choosing the building per
             * tile instead of the tile per building plugs the holes with the
             * shapes that fit them, so the spare space collects at the end of
             * the walk as one block. Buildings that found no anchor fall back
             * to the first spot they fit. The gap closing of improve() takes
             * the result from there.
             *
             * @param {Object[]} decos - Roadless buildings to place.
             * @param {number[][]} allCoords - All map coordinates, row by row.
             */
            packRoadlessTouching(decos, allCoords) {
                // identical footprints are interchangeable here, group them
                const groups = new Map();
                for (const b of decos) {
                    const key = b.width + 'x' + b.height;
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key).push(b);
                }
                const blocked = (x, y) => this.grid.get(x + ',' + y) !== 0;
                const contact = (x, y, w, h) => {
                    let t = 0;
                    for (let i = x; i < x + w; i++) {
                        if (blocked(i, y - 1)) t++;
                        if (blocked(i, y + h)) t++;
                    }
                    for (let j = y; j < y + h; j++) {
                        if (blocked(x - 1, j)) t++;
                        if (blocked(x + w, j)) t++;
                    }
                    return t;
                };

                // free tiles in a straight line from (x, y), stopping at the first blocked one
                const freeRun = (x, y, dx, dy) => {
                    let n = 0;
                    while (!blocked(x + dx * n, y + dy * n)) n++;
                    return n;
                };

                for (const [cx, cy] of allCoords) {
                    if (this.grid.get(cx + ',' + cy) !== 0) continue;

                    // narrowest and flattest building still waiting - a gap
                    // below these sizes can never be filled anymore
                    let minW = Infinity, minH = Infinity;
                    for (const list of groups.values()) {
                        if (!list.length) continue;
                        minW = Math.min(minW, list[0].width);
                        minH = Math.min(minH, list[0].height);
                    }

                    let best = null;
                    for (const list of groups.values()) {
                        if (!list.length) continue;
                        const b = list[0];
                        if (!this.canPlace(cx, cy, b.width, b.height)) continue;
                        const touch = contact(cx, cy, b.width, b.height);
                        let value = touch + b.width * b.height * 0.01;
                        // lookahead: a sliver right of or below the footprint that
                        // no remaining building fits into is lost for good
                        const right = freeRun(cx + b.width, cy, 1, 0);
                        const below = freeRun(cx, cy + b.height, 0, 1);
                        if (right > 0 && right < minW) value -= 1000;
                        if (below > 0 && below < minH) value -= 1000;
                        if (!best || value > best.value) best = { value: value, list: list };
                    }
                    if (best) this.placeEntity(best.list.shift(), cx, cy, 1);
                }

                for (const list of groups.values()) {
                    for (const b of list) {
                        for (const [cx, cy] of allCoords) {
                            if (this.grid.get(cx + ',' + cy) === 0 && this.canPlace(cx, cy, b.width, b.height)) {
                                this.placeEntity(b, cx, cy, 1);
                                break;
                            }
                        }
                    }
                }
            }

            /**
             * Free tiles outside the largest empty rectangle of the map. Connected
             * alone is not enough - a thin ring around the city is connected but
             * useless, so every free tile that is not part of the biggest usable
             * rectangle counts as waste.
             *
             * @returns {number} Wasted free tiles.
             */
            freeSpaceWaste() {
                const { minX, maxX, minY, maxY } = this.mapBounds;
                const W = maxX - minX;
                let finalFree = 0, largestRect = 0;
                const heights = new Array(W).fill(0);
                for (let y = minY; y < maxY; y++) {
                    for (let x = minX; x < maxX; x++) {
                        const free = this.grid.get(x + ',' + y) === 0;
                        if (free) finalFree++;
                        heights[x - minX] = free ? heights[x - minX] + 1 : 0;
                    }
                    // largest rectangle in histogram, monotonic stack
                    const stack = [];
                    for (let i = 0; i <= W; i++) {
                        const h = i < W ? heights[i] : 0;
                        while (stack.length && heights[stack[stack.length - 1]] >= h) {
                            const th = heights[stack.pop()];
                            const left = stack.length ? stack[stack.length - 1] + 1 : 0;
                            const area = th * (i - left);
                            if (area > largestRect) largestRect = area;
                        }
                        stack.push(i);
                    }
                }
                return finalFree - largestRect;
            }

            /**
             * Type and footprint of a building - copies of the same building
             * are interchangeable, so a spot counts as unchanged when a copy of
             * the building that stood there stands there again.
             *
             * @param {Object} b - Building.
             * @returns {string} Key of the building kind.
             */
            homeKey(b) {
                return (b.chainMembers ? b.id : (b.asset_id || b.name)) + '|' + b.width + 'x' + b.height;
            }

            /**
             * Closes the gaps of a finished layout with a large neighbourhood
             * search: again and again the buildings around a gap (plus a few
             * at the edge of the big free block) are taken off the map and put
             * back tile by tile, each free tile getting the waiting building
             * that touches the most there. A step is kept when the layout got
             * no worse - fewer unplaced tiles first, then fewer moved
             * buildings (keepHome), then fewer free tiles outside the largest
             * free rectangle, then a shorter outline of the free space, then
             * fewer edges where street buildings meet roadless ones - so the
             * street buildings stay together instead of ending up as islands
             * among the roadless buildings.
             *
             * Roads stay as they are: street buildings only move to spots at a
             * road, the town hall only where it still holds the whole road
             * network together; two-lane buildings and great buildings that
             * stand are not touched. Buildings still waiting for a spot are
             * placed by pushing aside what stands in their way, the pushed
             * ones are placed anew.
             *
             * @param {number} budgetMs - Search time.
             * @param {boolean} [keepHome] - Buildings on their original spots only
             * leave them to make room for a waiting building.
             * @param {boolean} [streetsOnly] - Roadless buildings without a spot
             * keep waiting: the street buildings close ranks on their own first.
             * @returns {number} Steps taken.
             */
            improve(budgetMs, keepHome, streetsOnly) {
                const started = performance.now();
                const W = this.gridW, H = this.gridH;
                const cells = this.snapshot();
                this.improveRuns = (this.improveRuns || 0) + 1;
                const rng = this.makeRng((this.seed || 0) * 7919 + this.improveRuns * 104729);
                const pick = (list) => list[(rng() * list.length) | 0];

                const scan = [];
                for (let id = 0; id < cells.length; id++) if (cells[id] !== -1) scan.push(id);

                // two-lane tiles with an unbroken two-lane path to the town hall
                const twoLane = new Uint8Array(cells.length);
                for (const key of this.linkedTwoLaneTiles()) twoLane[this.cellIdOf.get(key)] = 1;

                // placed buildings first, then the ones still waiting for a spot
                const placedIds = new Set(this.placedBuildings.map(b => b.id));
                const items = this.placedBuildings.concat([this.townHall, ...this.buildings]
                    .filter(b => !placedIds.has(b.id) && !(streetsOnly && !(b.street_level > 0))));
                const codes = new Map();
                const info = items.map(b => {
                    const head = this.connRect(b);
                    const key = this.homeKey(b);
                    if (!codes.has(key)) codes.set(key, codes.size + 1);
                    const street = b.street_level || 0;
                    const townHall = b.type === 'main_building';
                    return {
                        loose: !!b.loose,
                        w: b.width, h: b.height, hw: head.width, hh: head.height, street: street, code: codes.get(key), townHall: townHall,
                        // may be taken off the map again once it stands
                        movable: townHall ? !keepHome : b.type !== 'greatbuilding' && street < 2 && !b.pinned,
                        kind: b.width + 'x' + b.height + '/' + head.width + 'x' + head.height + '/' + street + (keepHome ? '/' + key : '')
                    };
                });
                const hall = items.findIndex(b => b.type === 'main_building');
                const pos = new Int32Array(items.length).fill(-1);
                const owner = new Int32Array(cells.length).fill(-1);
                // kind of the building that stood on a spot (keepHome)
                const home = new Int32Array(cells.length);

                // 1 = roadless building, 2 = building at a street, 0 = anything else
                const sort = new Int8Array(cells.length);
                const paint = (id, t, val, who) => {
                    const mark = who < 0 ? 0 : t.street > 0 ? 2 : 1;
                    for (let j = 0; j < t.h; j++) {
                        for (let i = 0; i < t.w; i++) {
                            cells[id + j * W + i] = val;
                            owner[id + j * W + i] = who;
                            sort[id + j * W + i] = mark;
                        }
                    }
                };
                const put = (i, id) => { paint(id, info[i], 1, i); pos[i] = id; };
                const lift = (i) => { paint(pos[i], info[i], 0, -1); pos[i] = -1; };

                this.placedBuildings.forEach((b, i) => {
                    const id = this.cellId(b.x, b.y);
                    pos[i] = id;
                    for (let j = 0; j < b.height; j++) {
                        for (let k = 0; k < b.width; k++) {
                            owner[id + j * W + k] = i;
                            sort[id + j * W + k] = info[i].street > 0 ? 2 : 1;
                        }
                    }
                });
                if (keepHome && this.homes) {
                    for (const [key, kind] of this.homes) home[this.cellIdOf.get(key)] = codes.get(kind) || -1;
                }
                const atHome = (i) => keepHome && home[pos[i]] === info[i].code;

                const fits = (id, w, h) => {
                    for (let j = 0; j < h; j++) {
                        for (let i = 0; i < w; i++) if (cells[id + j * W + i] !== 0) return false;
                    }
                    return true;
                };
                // the town hall anchors the roads: every connected piece of the
                // road network and every two-lane stretch in use must border
                // it on a new spot as well
                const label = (member) => {
                    const of = new Int32Array(cells.length);
                    let count = 0;
                    for (const start of scan) {
                        if (!member(start) || of[start]) continue;
                        count++;
                        const todo = [start];
                        of[start] = count;
                        while (todo.length) {
                            const id = todo.pop();
                            for (const nb of [id - 1, id + 1, id - W, id + W]) {
                                if (member(nb) && !of[nb]) { of[nb] = count; todo.push(nb); }
                            }
                        }
                    }
                    return { of: of, count: count };
                };
                const pieces = label((c) => cells[c] === 2);
                const lanes = label((c) => twoLane[c] === 1);
                const anchored = (t, id) => {
                    const seenPieces = new Set(), seenLanes = new Set();
                    const visit = (c) => {
                        if (pieces.of[c]) seenPieces.add(pieces.of[c]);
                        if (lanes.of[c]) seenLanes.add(lanes.of[c]);
                    };
                    for (let i = 0; i < t.w; i++) { visit(id - W + i); visit(id + t.h * W + i); }
                    for (let j = 0; j < t.h; j++) { visit(id + j * W - 1); visit(id + j * W + t.w); }
                    return seenPieces.size === pieces.count && seenLanes.size === lanes.count;
                };

                // street contact of the head rectangle with its top-left on a tile
                const linked = (t, id) => {
                    if (t.townHall) return anchored(t, id);
                    if (!t.street) return true;
                    const road = t.street >= 2 ? (c) => twoLane[c] === 1 : (c) => cells[c] === 2;
                    for (let i = 0; i < t.hw; i++) if (road(id - W + i) || road(id + t.hh * W + i)) return true;
                    for (let j = 0; j < t.hh; j++) if (road(id + j * W - 1) || road(id + j * W + t.hw)) return true;
                    return false;
                };
                // bordering tiles that are not free: buildings, roads, the map edge
                const touch = (id, w, h) => {
                    let n = 0;
                    for (let i = 0; i < w; i++) n += (cells[id - W + i] !== 0) + (cells[id + h * W + i] !== 0);
                    for (let j = 0; j < h; j++) n += (cells[id + j * W - 1] !== 0) + (cells[id + j * W + w] !== 0);
                    return n;
                };
                const freeRun = (id, step) => {
                    let n = 0;
                    while (n < 8 && cells[id + n * step] === 0) n++;
                    return n;
                };

                // rating of the layout, smaller is better, compared entry by
                // entry; rect is the largest free rectangle [left, top, right, bottom]
                const heights = new Int32Array(W);
                const stack = new Int32Array(W + 1);
                const measure = () => {
                    let free = 0, outline = 0, largest = 0, mixed = 0;
                    const rect = [0, 0, -1, -1];
                    heights.fill(0);
                    for (let row = 1; row < H - 1; row++) {
                        for (let col = 1; col < W - 1; col++) {
                            const id = row * W + col;
                            if (cells[id] !== 0) {
                                heights[col] = 0;
                                // edges where a street building meets a roadless one
                                const mark = sort[id];
                                if (mark) mixed += (sort[id + 1] === 3 - mark) + (sort[id + W] === 3 - mark);
                                continue;
                            }
                            heights[col]++;
                            free++;
                            outline += (cells[id - 1] !== 0) + (cells[id + 1] !== 0) + (cells[id - W] !== 0) + (cells[id + W] !== 0);
                        }
                        // largest rectangle in the histogram, monotonic stack
                        let top = 0;
                        for (let col = 1; col < W; col++) {
                            const h = heights[col];
                            while (top && heights[stack[top - 1]] >= h) {
                                const th = heights[stack[--top]];
                                const left = top ? stack[top - 1] + 1 : 1;
                                if (th * (col - left) > largest) {
                                    largest = th * (col - left);
                                    rect[0] = left; rect[1] = row - th + 1; rect[2] = col - 1; rect[3] = row;
                                }
                            }
                            stack[top++] = col;
                        }
                    }
                    // a loose building without its street counts half as much as
                    // one without a spot - so it is never given up for nothing
                    let unplaced = 0, kept = 0;
                    for (let i = 0; i < pos.length; i++) {
                        const t = info[i];
                        if (pos[i] < 0) unplaced += t.w * t.h * 2;
                        else if (t.loose && !linked(t, pos[i])) unplaced += t.w * t.h;
                        else if (atHome(i)) kept++;
                    }
                    return { rate: [unplaced, keepHome ? -kept : 0, free - largest, outline, mixed], rect: rect };
                };
                const worse = (a, b) => {
                    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i];
                    return false;
                };

                let cur = measure();
                const inMain = (id) => {
                    const col = id % W, row = (id / W) | 0;
                    return col >= cur.rect[0] && col <= cur.rect[2] && row >= cur.rect[1] && row <= cur.rect[3];
                };

                // buildings taken off the map in this step with their old tile, and
                // everything that waits for a spot
                const saved = [];
                const pool = [];
                const ruin = (i) => {
                    // a building set anew earlier in this step keeps its first tile for the rollback
                    if (!pool.includes(i)) {
                        if (saved.length >= 120) return;
                        saved.push(i, pos[i]);
                        pool.push(i);
                    }
                    lift(i);
                };
                const ruinWindow = (col, row, rw, rh) => {
                    for (let r = Math.max(1, row - rh); r <= Math.min(H - 2, row + rh); r++) {
                        for (let c = Math.max(1, col - rw); c <= Math.min(W - 2, col + rw); c++) {
                            const o = owner[r * W + c];
                            if (o >= 0 && info[o].movable && !atHome(o)) ruin(o);
                        }
                    }
                };

                // steps from a tile to the big free block
                const far = (id) => {
                    const r = cur.rect, col = id % W, row = (id / W) | 0;
                    return (col < r[0] ? r[0] - col : col > r[2] ? col - r[2] : 0) + (row < r[1] ? r[1] - row : row > r[3] ? row - r[3] : 0);
                };

                // every free tile gets the waiting building that touches the
                // most there - the tiles farthest from the big free block first,
                // so whatever stays free ends up next to that block instead of
                // somewhere in between. The tile is a corner of the footprint
                const recreate = (noise) => {
                    const kinds = new Map();
                    let left = 0, minW = Infinity, minH = Infinity;
                    for (const i of pool) {
                        if (pos[i] >= 0) continue;
                        const t = info[i];
                        if (!kinds.has(t.kind)) kinds.set(t.kind, []);
                        kinds.get(t.kind).push(i);
                        minW = Math.min(minW, t.w);
                        minH = Math.min(minH, t.h);
                        left++;
                    }
                    if (!left) return;
                    const lists = [...kinds.values()];
                    const order = [];
                    for (const id of scan) if (cells[id] === 0) order.push([far(id), id]);
                    order.sort((p, q) => q[0] - p[0] || p[1] - q[1]);

                    for (const entry of order) {
                        if (!left) break;
                        const id = entry[1];
                        if (cells[id] !== 0) continue;
                        let best = null, bestAt = -1, bestVal = -Infinity;
                        for (const list of lists) {
                            if (!list.length) continue;
                            const t = info[list[list.length - 1]];
                            for (let corner = 0; corner < 4; corner++) {
                                const at = id - (corner & 1 ? t.w - 1 : 0) - (corner & 2 ? (t.h - 1) * W : 0);
                                if ((corner & 1 && t.w === 1) || (corner & 2 && t.h === 1)) continue;
                                if (!fits(at, t.w, t.h) || !linked(t, at)) continue;
                                let val = touch(at, t.w, t.h) / (2 * (t.w + t.h)) + t.w * t.h * 0.0005 + rng() * noise;
                                // back on a spot of its own kind beats everything
                                if (keepHome && home[at] === t.code) val += 10;
                                // a sliver beside the footprint that no waiting
                                // building fits into stays a gap
                                const right = freeRun(at + t.w, 1), below = freeRun(at + t.h * W, W);
                                if (right > 0 && right < minW) val -= 0.3;
                                if (below > 0 && below < minH) val -= 0.3;
                                if (val > bestVal) { bestVal = val; best = list; bestAt = at; }
                            }
                        }
                        if (best) {
                            put(best.pop(), bestAt);
                            left--;
                        }
                    }
                };

                // a small window around a gap, solved by trying every way its
                // buildings fit: the buildings lying completely inside are taken
                // out and set anew tile by tile, the same number of tiles stays
                // free - the arrangement that leaves them closest to the big
                // free block wins. That walks a gap out of the middle where the
                // greedy refill finds no way. Without a solution within the
                // node limit the buildings stay in the pool for the refill
                const exact = (col, row, rw, rh) => {
                    const c0 = Math.max(1, col - rw), c1 = Math.min(W - 2, col + rw);
                    const r0 = Math.max(1, row - rh), r1 = Math.min(H - 2, row + rh);
                    const pieces = [];
                    for (let r = r0; r <= r1; r++) {
                        for (let c = c0; c <= c1; c++) {
                            const o = owner[r * W + c];
                            if (o < 0 || !info[o].movable || atHome(o) || pieces.includes(o)) continue;
                            const pc = pos[o] % W, pr = (pos[o] / W) | 0;
                            if (pc >= c0 && pr >= r0 && pc + info[o].w - 1 <= c1 && pr + info[o].h - 1 <= r1) pieces.push(o);
                        }
                    }
                    if (pieces.length < 2 || pieces.length > 14) return;
                    // random order, so every try walks the tree differently
                    for (let i = pieces.length - 1; i > 0; i--) {
                        const j = (rng() * (i + 1)) | 0;
                        const t = pieces[i]; pieces[i] = pieces[j]; pieces[j] = t;
                    }
                    for (const o of pieces) ruin(o);

                    const open = [];
                    let spare = 0;
                    for (let r = r0; r <= r1; r++) {
                        for (let c = c0; c <= c1; c++) if (cells[r * W + c] === 0) { open.push(r * W + c); spare++; }
                    }
                    for (const o of pieces) spare -= info[o].w * info[o].h;

                    const used = new Uint8Array(pieces.length);
                    const plan = [];
                    let best = null, bestCost = Infinity, nodes = 0;
                    const solve = (k, holes, cost, placed) => {
                        if (nodes++ > 4000 || cost >= bestCost) return;
                        while (k < open.length && cells[open[k]] !== 0) k++;
                        if (k === open.length) {
                            if (placed === pieces.length) { bestCost = cost; best = plan.slice(); }
                            return;
                        }
                        const id = open[k];
                        const tried = [];
                        for (let p = 0; p < pieces.length; p++) {
                            const t = info[pieces[p]];
                            if (used[p] || tried.includes(t.kind)) continue;
                            tried.push(t.kind);
                            if (id % W + t.w - 1 > c1 || ((id / W) | 0) + t.h - 1 > r1 || !fits(id, t.w, t.h) || !linked(t, id)) continue;
                            used[p] = 1;
                            put(pieces[p], id);
                            plan.push(pieces[p], id);
                            solve(k + 1, holes, cost, placed + 1);
                            plan.length -= 2;
                            lift(pieces[p]);
                            used[p] = 0;
                        }
                        if (holes < spare) {
                            // 3 = left free on purpose in this try
                            cells[id] = 3;
                            solve(k + 1, holes + 1, cost + far(id), placed);
                            cells[id] = 0;
                        }
                    };
                    solve(0, 0, 0, 0);
                    if (best) for (let k = 0; k < best.length; k += 2) put(best[k], best[k + 1]);
                };

                // a building gets its spot by force: the spot costing the least
                // standing buildings is cleared, the pushed ones wait in the pool
                const seenOwner = new Int32Array(items.length);
                let stamp = 0;
                const eject = (n) => {
                    const t = info[n];
                    if (pos[n] >= 0) {
                        // a new try for a building that stands: the ones it once
                        // pushed aside may return to their spots
                        const col = pos[n] % W, row = (pos[n] / W) | 0;
                        ruin(n);
                        ruinWindow(col + (t.w >> 1), row + (t.h >> 1), (t.w >> 1) + 1, (t.h >> 1) + 1);
                    }
                    // footprints the pushed buildings could move to right away
                    const frees = [];
                    for (const id of scan) if (cells[id] === 0) frees.push(id);
                    const roomFor = new Map();
                    const hasRoom = (o) => {
                        const k = info[o].kind;
                        if (!roomFor.has(k)) roomFor.set(k, frees.some(id => fits(id, info[o].w, info[o].h) && linked(info[o], id)));
                        return roomFor.get(k);
                    };
                    // cheapest spot per set of pushed buildings: every building
                    // leaving its spot weighs heavily, one that finds no room
                    // elsewhere even more
                    const spots = new Map();
                    for (const id of scan) {
                        stamp++;
                        let cost = 0, sign = 0, ok = true;
                        for (let j = 0; j < t.h && ok; j++) {
                            for (let i = 0; i < t.w; i++) {
                                const c = id + j * W + i;
                                if (cells[c] === 0) continue;
                                const o = owner[c];
                                if (cells[c] !== 1 || o < 0 || !info[o].movable) { ok = false; break; }
                                if (seenOwner[o] === stamp) continue;
                                seenOwner[o] = stamp;
                                sign += (o + 1) * 7919;
                                cost += info[o].w * info[o].h + (atHome(o) ? 1000 : 0) + (hasRoom(o) ? 0 : 3000);
                            }
                        }
                        if (!ok || !linked(t, id)) continue;
                        if (!spots.has(sign) || cost < spots.get(sign)[0]) spots.set(sign, [cost, id]);
                    }
                    // one of the best few, the cheaper the likelier
                    const ranked = [...spots.values()].sort((p, q) => p[0] - q[0]).slice(0, 8);
                    const bestId = ranked.length ? ranked[(rng() * rng() * ranked.length) | 0][1] : -1;
                    if (bestId < 0) return;
                    for (let j = 0; j < t.h; j++) {
                        for (let i = 0; i < t.w; i++) {
                            const o = owner[bestId + j * W + i];
                            if (o >= 0) ruin(o);
                        }
                    }
                    if (!fits(bestId, t.w, t.h)) return;
                    put(n, bestId);
                    if (!pool.includes(n)) pool.push(n);
                };

                let steps = 0, lastGain = 0;
                while (performance.now() - started < budgetMs) {
                    const waiting = [], agents = [], gaps = [];
                    for (let i = 0; i < pos.length; i++) {
                        if (pos[i] < 0) waiting.push(i);
                        else if (keepHome && info[i].movable && !atHome(i)) agents.push(i);
                    }
                    for (const id of scan) if (cells[id] === 0 && !inMain(id)) gaps.push(id);
                    // nothing left to gain, or nothing that may move
                    if (keepHome ? !waiting.length && !agents.length : !waiting.length && !gaps.length) break;
                    if (steps - lastGain > 6000) break;
                    steps++;

                    saved.length = 0;
                    pool.length = 0;
                    const dice = rng();
                    if (waiting.length && dice < 0.5) {
                        eject(pick(waiting));
                    } else if (agents.length && dice < 0.75) {
                        eject(pick(agents));
                    } else {
                        const focus = gaps.length ? pick(gaps) : pick(scan);
                        const fc = focus % W, fr = (focus / W) | 0;
                        if (gaps.length && cur.rect[2] >= cur.rect[0] && rng() < 0.15) {
                            // everything between the gap and the big free block:
                            // a gap deep inside only closes when the whole
                            // stretch in between moves up
                            const tc = Math.min(Math.max(fc, cur.rect[0]), cur.rect[2]);
                            const tr = Math.min(Math.max(fr, cur.rect[1]), cur.rect[3]);
                            const pad = (rng() * 3) | 0;
                            ruinWindow((fc + tc) >> 1, (fr + tr) >> 1, ((Math.abs(fc - tc) + 1) >> 1) + pad, ((Math.abs(fr - tr) + 1) >> 1) + pad);
                        } else if (gaps.length && rng() < 0.35) {
                            exact(fc, fr, 2 + ((rng() * 4) | 0), 2 + ((rng() * 4) | 0));
                        } else {
                            ruinWindow(fc, fr, 1 + ((rng() * 4) | 0), 1 + ((rng() * 4) | 0));
                        }
                        // material from the edge of the big free block
                        if (cur.rect[2] >= cur.rect[0] && rng() < 0.7) {
                            const col = cur.rect[0] - 1 + ((rng() * (cur.rect[2] - cur.rect[0] + 3)) | 0);
                            const row = cur.rect[1] - 1 + ((rng() * (cur.rect[3] - cur.rect[1] + 3)) | 0);
                            const side = (rng() * 4) | 0;
                            ruinWindow(side === 0 ? cur.rect[0] - 1 : side === 1 ? cur.rect[2] + 1 : col,
                                side === 2 ? cur.rect[1] - 1 : side === 3 ? cur.rect[3] + 1 : row,
                                (rng() * 3) | 0, (rng() * 3) | 0);
                        }
                    }
                    for (const i of waiting) if (!pool.includes(i)) pool.push(i);
                    if (!pool.length) continue;

                    recreate(rng() < 0.3 ? 0 : rng() * 0.3);

                    // a city without its town hall is none, whatever fits instead
                    const next = measure();
                    if (pos[hall] < 0 || worse(next.rate, cur.rate)) {
                        for (const i of pool) if (pos[i] >= 0) lift(i);
                        for (let k = 0; k < saved.length; k += 2) put(saved[k], saved[k + 1]);
                    } else {
                        if (worse(cur.rate, next.rate)) lastGain = steps;
                        cur = next;
                    }
                }

                // back into the building list and the grid
                const minX = this.mapBounds.minX, minY = this.mapBounds.minY;
                const placed = [];
                items.forEach((b, i) => {
                    if (pos[i] < 0) return;
                    const x = pos[i] % W - 1 + minX, y = ((pos[i] / W) | 0) - 1 + minY;
                    if (info[i].townHall) {
                        this.townHallPos = [x, y];
                        paint(pos[i], info[i], 9, i);
                    }
                    if (i < this.placedBuildings.length) {
                        b.x = x;
                        b.y = y;
                        placed.push(b);
                    } else {
                        placed.push({ ...b, x: x, y: y });
                    }
                });
                this.placedBuildings = placed;
                for (let k = 0; k < this.cellKeys.length; k++) this.grid.set(this.cellKeys[k], cells[this.cellIds[k]]);
                return steps;
            }

            generateExportData() {
                const exportList = [];
                for (const b of this.placedBuildings) {
                    // split chain composites back into their members, in chain order
                    if (b.chainMembers) {
                        let off = 0;
                        for (const m of b.chainMembers) {
                            if (this.transposed) { exportList.push({ ...m, x: b.x, y: b.y + off }); off += m.height; }
                            else { exportList.push({ ...m, x: b.x + off, y: b.y }); off += m.width; }
                        }
                    } else {
                        exportList.push(b);
                    }
                }
                // two-lane roads are exported as their 2x2 game pieces so the map
                // can draw the block raster - greedy top-left tiling, stray tiles
                // from overlapping corridors fall back to single tiles
                const isL2 = (key) => this.roadTiles.has(key) && (this.roadLevel.get(key) || 1) >= 2;
                const consumed = new Set();
                const roadCoords = [...this.roadTiles].map(k => k.split(',').map(Number)).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
                for (const [x, y] of roadCoords) {
                    const key = x + ',' + y;
                    if (consumed.has(key)) continue;
                    if (isL2(key)) {
                        const blockRest = [(x + 1) + ',' + y, x + ',' + (y + 1), (x + 1) + ',' + (y + 1)];
                        if (blockRest.every(k => isL2(k) && !consumed.has(k))) {
                            consumed.add(key);
                            blockRest.forEach(k => consumed.add(k));
                            exportList.push({ x: x, y: y, width: 2, height: 2, type: 'street', name: 'Road', street_level: 0, level: 2 });
                            continue;
                        }
                    }
                    consumed.add(key);
                    exportList.push({ x: x, y: y, width: 1, height: 1, type: 'street', name: 'Road', street_level: 0, level: this.roadLevel.get(key) || 1 });
                }
                if (this.transposed) {
                    // back to real map coordinates
                    return exportList.map(item => ({ ...item, x: item.y, y: item.x, width: item.height, height: item.width }));
                }
                return exportList;
            }

            layoutBands(street) {
                const minX = this.mapBounds.minX, maxX = this.mapBounds.maxX;
                const minY = this.mapBounds.minY, maxY = this.mapBounds.maxY;

                // two-lane buildings first: their bands get double road rows and a
                // double trunk, so the two-lane network stays one connected piece
                const twoLane = street.filter(b => (b.street_level || 0) >= 2);
                const oneLane = street.filter(b => (b.street_level || 0) < 2);
                const hasTwoLane = twoLane.length > 0;

                // buildable stretches per row: all of them get roads and buildings
                // (side areas cut off by the great buildings included), the widest
                // stretch anchors the trunk
                const rowRuns = new Map();
                const rowRange = new Map();
                for (let y = minY; y < maxY; y++) {
                    const runs = [];
                    let curStart = null;
                    for (let x = minX; x <= maxX; x++) {
                        if (x < maxX && this.grid.get(x + ',' + y) === 0) {
                            if (curStart === null) curStart = x;
                        } else if (curStart !== null) {
                            runs.push([curStart, x]);
                            curStart = null;
                        }
                    }
                    if (runs.length) {
                        rowRuns.set(y, runs);
                        let widest = runs[0];
                        for (const run of runs) if (run[1] - run[0] > widest[1] - widest[0]) widest = run;
                        rowRange.set(y, widest);
                    }
                }

                // one long trunk road down the column with the longest contiguous
                // streak of rows whose buildable stretch contains it - rows outside
                // that streak would end up disconnected from the trunk
                let trunkX = minX, trunkTop = minY, trunkBottom = minY;
                for (let x = minX; x < maxX; x++) {
                    let start = null;
                    for (let y = minY; y <= maxY; y++) {
                        const range = y < maxY ? rowRange.get(y) : null;
                        const covers = !!(range && x >= range[0] && x < range[1]);
                        if (covers && start === null) start = y;
                        if (!covers && start !== null) {
                            if (y - start > trunkBottom - trunkTop) { trunkX = x; trunkTop = start; trunkBottom = y; }
                            start = null;
                        }
                    }
                }
                for (let y = trunkTop; y < trunkBottom; y++) {
                    this.placeRoadTile(trunkX, y, hasTwoLane ? 2 : 1);
                    // two-lane cities need a two tiles wide trunk (2x2 pieces)
                    if (hasTwoLane) this.placeRoadTile(trunkX + 1, y, 2);
                }

                // hook up the pre-placed great buildings while the rows are still
                // empty - once the bands are built they wall off the free pockets
                // and no stub can reach the trunk anymore (pruneRoadsSmart removes
                // stubs that band roads make obsolete afterwards)
                this.connectPlacedBuildings();

                // build order comes from the variant: bands of similar height need the
                // fewest road rows, and every building touches its road row by
                // construction - the town hall strictly leads the two-lane group
                // (never jittered away by a seed) so the two-lane buildings pack
                // right next to it and their corridors stay as short as possible
                const queue = hasTwoLane
                    ? [this.townHall, ...this.sortBuildings(twoLane)].concat(this.sortBuildings(oneLane))
                    : this.sortBuildings([this.townHall, ...street]);

                // fill one row of buildings along a road row: mode 'above' puts their
                // bottom edge on it, mode 'below' their top edge
                const placeRow = (roadY, mode) => {
                    if (!queue.length || !rowRuns.has(roadY)) return 0;
                    const bandH = queue[0].height;
                    for (const run of rowRuns.get(roadY)) {
                        for (let x = run[0]; x < run[1]; x++) {
                            for (let q = 0; q < queue.length; q++) {
                                const b = queue[q];
                                const by = mode === 'above' ? roadY - b.height : roadY + 1;
                                if (x + b.width <= run[1] && this.canPlace(x, by, b.width, b.height) && this.gbKeepsStubSpace(x, by, b.width, b.height)) {
                                    if (b.type === 'main_building') this.townHallPos = [x, by];
                                    this.placeEntity(b, x, by, b.type === 'main_building' ? 9 : 1);
                                    queue.splice(q, 1);
                                    x += b.width - 1;
                                    break;
                                }
                            }
                        }
                    }
                    return bandH;
                };

                // bands top-down: [buildings above][road row(s)][buildings below] ...
                // while two-lane buildings wait, the road row is two tiles thick
                let y = minY;
                let lastTwoLaneRow = trunkTop - 1;
                while (queue.length && y < maxY) {
                    const dbl = hasTwoLane && queue.some(q => (q.street_level || 0) >= 2);
                    const rows = dbl ? 2 : 1;
                    const roadY = y + queue[0].height;
                    if (roadY + rows - 1 >= maxY) break;

                    // the road row must exist and cross the trunk to stay connected
                    const range = rowRange.get(roadY);
                    if (!range || roadY < trunkTop || roadY >= trunkBottom || trunkX < range[0] || trunkX >= range[1] || (dbl && !rowRuns.has(roadY + 1))) { y++; continue; }

                    // roads first so the row packing sees them, side stretches get
                    // linked to the trunk by the unify pass afterwards
                    for (let r = 0; r < rows; r++) {
                        for (const run of rowRuns.get(roadY + r)) {
                            for (let x = run[0]; x < run[1]; x++) this.placeRoadTile(x, roadY + r, dbl ? 2 : 1);
                        }
                    }
                    if (dbl) lastTwoLaneRow = roadY + 1;
                    placeRow(roadY, 'above');
                    const hBelow = placeRow(roadY + rows - 1, 'below');

                    y = roadY + rows + hBelow;
                }

                // below the last double row the second trunk column is ordinary
                // one-lane road again - the prune pass may take it back
                if (hasTwoLane) {
                    for (let dy = Math.max(trunkTop, lastTwoLaneRow + 1); dy < trunkBottom; dy++) {
                        for (const cx of [trunkX, trunkX + 1]) {
                            const key = cx + ',' + dy;
                            if (this.roadTiles.has(key)) this.roadLevel.set(key, 1);
                        }
                    }
                }
            }

            layoutOrganic(street) {
                const minX = this.mapBounds.minX, maxX = this.mapBounds.maxX;
                const minY = this.mapBounds.minY, maxY = this.mapBounds.maxY;

                // grow from the top-left corner instead of the center: a city
                // packed into one corner (right below the edge-nested great
                // buildings) leaves the spare space as one connected block at
                // the opposite side - a centered city only leaves a useless ring
                const coords = [];
                for (let y = minY; y < maxY; y++) {
                    for (let x = minX; x < maxX; x++) coords.push([x, y]);
                }
                coords.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]) || a[1] - b[1]);

                // the town hall must sit in the largest free region: the road
                // network grows from it, so everything outside its region would
                // stay unreachable - the center tile alone can be a side pocket
                const thRegionOf = new Map();
                const thRegionSizes = [];
                for (const [key, val] of this.grid) {
                    if (val !== 0 || thRegionOf.has(key)) continue;
                    const id = thRegionSizes.length;
                    let size = 0;
                    const stack = [key];
                    thRegionOf.set(key, id);
                    while (stack.length) {
                        const k = stack.pop();
                        size++;
                        const parts = k.split(',');
                        const kx = +parts[0], ky = +parts[1];
                        for (const nk of [(kx-1)+','+ky, (kx+1)+','+ky, kx+','+(ky-1), kx+','+(ky+1)]) {
                            if (this.grid.get(nk) === 0 && !thRegionOf.has(nk)) { thRegionOf.set(nk, id); stack.push(nk); }
                        }
                    }
                    thRegionSizes.push(size);
                }
                let thLargest = -1;
                thRegionSizes.forEach((s, i) => { if (thLargest === -1 || s > thRegionSizes[thLargest]) thLargest = i; });

                // town hall as close to the top-left corner as possible within
                // that region - it must not take an edge-nested great building's
                // stub channel: the town hall can never be demolished, so a
                // walled-in great building would stay cut off forever
                for (const [x, y] of coords) {
                    if (thRegionOf.get(x + ',' + y) !== thLargest) continue;
                    if (this.canPlace(x, y, this.townHall.width, this.townHall.height)
                        && this.gbKeepsStubSpace(x, y, this.townHall.width, this.townHall.height)) {
                        this.townHallPos = [x, y];
                        this.placeEntity(this.townHall, x, y, 9);
                        break;
                    }
                }
                // fallback: anywhere it fits
                if (!this.townHallPos) {
                    for (const [x, y] of coords) {
                        if (this.canPlace(x, y, this.townHall.width, this.townHall.height)
                            && this.gbKeepsStubSpace(x, y, this.townHall.width, this.townHall.height)) {
                            this.townHallPos = [x, y];
                            this.placeEntity(this.townHall, x, y, 9);
                            break;
                        }
                    }
                }
                // last resort: without the town hall there is no city at all
                if (!this.townHallPos) {
                    for (const [x, y] of coords) {
                        if (this.canPlace(x, y, this.townHall.width, this.townHall.height)) {
                            this.townHallPos = [x, y];
                            this.placeEntity(this.townHall, x, y, 9);
                            break;
                        }
                    }
                }
                if (!this.townHallPos) return;

                // seed road: first free tile around the town hall
                const [tx, ty] = this.townHallPos;
                const seeds = [];
                for (let i = tx; i < tx + this.townHall.width; i++) seeds.push([i, ty - 1], [i, ty + this.townHall.height]);
                for (let j = ty; j < ty + this.townHall.height; j++) seeds.push([tx - 1, j], [tx + this.townHall.width, j]);
                for (const [sx, sy] of seeds) {
                    if (this.placeRoadTile(sx, sy)) break;
                }

                // hook up the pre-placed great buildings while the map is still
                // empty - the grown city would wall them off later
                this.connectPlacedBuildings();

                // two-lane buildings first: while the map is still open their 2x2
                // block corridors can grow right next to the town hall
                const twoLane = street.filter(b => (b.street_level || 0) >= 2);
                const oneLane = street.filter(b => (b.street_level || 0) < 2);
                const queue = twoLane.length
                    ? this.sortBuildings(twoLane).concat(this.sortBuildings(oneLane))
                    : this.sortBuildings([...street]);

                // a placement (with its new road path, if any) must not entomb the
                // network: the largest connected free region still reachable from the
                // roads has to hold the remaining buildings - scattered pockets that
                // are individually too small do not count
                const keepsGrowth = (path, x, y, w, h, needed) => {
                    if (needed <= 0) return true;
                    const pathSet = new Set(path);
                    const inFoot = (px, py) => px >= x && px < x + w && py >= y && py < y + h;
                    const isFree = (nx, ny) => {
                        const nk = nx + ',' + ny;
                        return this.grid.get(nk) === 0 && !pathSet.has(nk) && !inFoot(nx, ny);
                    };
                    const seeds = [];
                    for (const key of [...this.roadTiles, ...path]) {
                        const parts = key.split(',');
                        const rx = +parts[0], ry = +parts[1];
                        for (const nb of [[rx-1,ry],[rx+1,ry],[rx,ry-1],[rx,ry+1]]) {
                            if (isFree(nb[0], nb[1])) seeds.push(nb);
                        }
                    }
                    const seen = new Set();
                    for (const seed of seeds) {
                        const sk = seed[0] + ',' + seed[1];
                        if (seen.has(sk)) continue;
                        let size = 0;
                        const stack = [seed];
                        seen.add(sk);
                        while (stack.length) {
                            const t = stack.pop();
                            size++;
                            if (size >= needed) return true;
                            for (const nb of [[t[0]-1,t[1]],[t[0]+1,t[1]],[t[0],t[1]-1],[t[0],t[1]+1]]) {
                                const nk = nb[0] + ',' + nb[1];
                                if (!seen.has(nk) && isFree(nb[0], nb[1])) { seen.add(nk); stack.push(nb); }
                            }
                        }
                    }
                    return false;
                };

                let remaining = queue.reduce((sum, q) => sum + q.width * q.height, 0);
                let l2Left = twoLane.length;

                for (const b of queue) {
                    // free area that must stay reachable for the buildings after this one
                    remaining -= b.width * b.height;
                    const needed = remaining;

                    // two-lane buildings get their corridor together with the
                    // placement - planned afterwards it would find no room
                    if ((b.street_level || 0) >= 2) {
                        l2Left--;
                        this.placeTwoLaneOrganic(b, coords, keepsGrowth, needed, l2Left);
                        continue;
                    }

                    // BFS from the road network across free tiles: the distance is the
                    // number of new road tiles a spot would cost, parents give the path
                    const dist = new Map(), parent = new Map(), fifo = [];
                    for (const key of this.roadTiles) { dist.set(key, 0); fifo.push(key); }
                    let head = 0;
                    while (head < fifo.length) {
                        const key = fifo[head++];
                        const parts = key.split(',');
                        const kx = +parts[0], ky = +parts[1];
                        const d = dist.get(key);
                        for (const nk of [(kx-1)+','+ky, (kx+1)+','+ky, kx+','+(ky-1), kx+','+(ky+1)]) {
                            if (this.grid.get(nk) === 0 && !dist.has(nk)) {
                                dist.set(nk, d + 1);
                                parent.set(nk, key);
                                fifo.push(nk);
                            }
                        }
                    }

                    // free spots already touching the network cost nothing - otherwise
                    // collect spots sorted by road cost, top-left order breaks ties
                    const attempt = (limit) => {
                        let cheap = 0;
                        const candidates = [];
                        for (const [x, y] of coords) {
                            if (this.grid.get(x + ',' + y) !== 0 || !this.canPlace(x, y, b.width, b.height)) continue;
                            // never take an unconnected great building's last free
                            // neighbour tile - repair cannot demolish its walls
                            if (!this.gbKeepsStubSpace(x, y, b.width, b.height)) continue;
                            if (this.isConnectedToRoad(x, y, b.width, b.height)) {
                                if (!keepsGrowth([], x, y, b.width, b.height, needed)) continue;
                                this.placeEntity(b, x, y, 1);
                                return true;
                            }
                            let cost = Infinity;
                            for (let i = x; i < x + b.width; i++) {
                                for (const j of [y - 1, y + b.height]) {
                                    const dv = dist.get(i + ',' + j);
                                    if (dv !== undefined && dv < cost) cost = dv;
                                }
                            }
                            for (let j = y; j < y + b.height; j++) {
                                for (const i of [x - 1, x + b.width]) {
                                    const dv = dist.get(i + ',' + j);
                                    if (dv !== undefined && dv < cost) cost = dv;
                                }
                            }
                            if (cost < Infinity) {
                                candidates.push([cost, x, y]);
                                if (cost <= 1) cheap++;
                                // keep a few alternatives in case the best one seals the network
                                if (limit !== Infinity && (cheap >= 3 || candidates.length >= limit)) break;
                            }
                        }

                        candidates.sort((p, q) => p[0] - q[0]);
                        for (const cand of candidates) {
                            const x = cand[1], y = cand[2];
                            // shortest road path to the spot that does not cross the building
                            let bestPath = null;
                            const per = [];
                            for (let i = x; i < x + b.width; i++) per.push(i + ',' + (y - 1), i + ',' + (y + b.height));
                            for (let j = y; j < y + b.height; j++) per.push((x - 1) + ',' + j, (x + b.width) + ',' + j);
                            for (const pt of per) {
                                const dv = dist.get(pt);
                                if (dv === undefined || dv === 0) continue;
                                if (bestPath && dv >= bestPath.length) continue;
                                const path = [];
                                let cur = pt, ok = true;
                                while (cur && dist.get(cur) > 0) {
                                    const parts = cur.split(',');
                                    const px = +parts[0], py = +parts[1];
                                    if (px >= x && px < x + b.width && py >= y && py < y + b.height) { ok = false; break; }
                                    path.push(cur);
                                    cur = parent.get(cur);
                                }
                                if (ok) bestPath = path;
                            }
                            if (bestPath && keepsGrowth(bestPath, x, y, b.width, b.height, needed)) {
                                for (const key of bestPath) {
                                    const parts = key.split(',');
                                    this.placeRoadTile(+parts[0], +parts[1]);
                                }
                                this.placeEntity(b, x, y, 1);
                                return true;
                            }
                        }
                        return false;
                    };

                    // capped scan first, full scan as the safety net
                    if (!attempt(25)) attempt(Infinity);
                }
            }

            run() {
                if (!this.townHall) return { error: "Rathaus nicht gefunden" };

                const minX = this.mapBounds.minX, maxX = this.mapBounds.maxX;
                const minY = this.mapBounds.minY, maxY = this.mapBounds.maxY;

                const street = this.buildings.filter(b => b.street_level > 0);
                const decos = this.buildings.filter(b => b.street_level === 0);
                const gbs = street.filter(b => b.type === 'greatbuilding');
                const rest = street.filter(b => b.type !== 'greatbuilding');

                // great buildings nest directly against the map border, the strategy
                // lays out everything else around them
                this.placeGreatBuildingsAtEdge(gbs);

                if (this.strategy === 'organic') this.layoutOrganic(rest);
                else this.layoutBands(rest);

                // roads must be one network before the stubs attach to it
                this.unifyRoadNetwork();

                // single road stubs for everything the strategy left unconnected
                this.connectPlacedBuildings();

                // two-lane corridors for buildings the strategy could not serve
                this.connectTwoLane();

                const allCoords = [];
                for (let cy = minY; cy < maxY; cy++) {
                    for (let cx = minX; cx < maxX; cx++) allCoords.push([cx, cy]);
                }

                // leftovers: whatever the strategy could not place gets any free
                // spot next to the existing road network
                const placedIds = new Set(this.placedBuildings.map(b => b.id));
                const leftovers = [this.townHall, ...street].filter(b => !placedIds.has(b.id));
                for (const b of leftovers) {
                    // chain composites connect through the head member only
                    const hw = b.chainMembers ? b.chainMembers[0].width : b.width;
                    const hh = b.chainMembers ? b.chainMembers[0].height : b.height;
                    for (const [cx, cy] of allCoords) {
                        if (this.grid.get(cx + ',' + cy) === 0
                            && this.canPlace(cx, cy, b.width, b.height)
                            && this.isConnectedToRoad(cx, cy, hw, hh)
                            && this.gbKeepsStubSpace(cx, cy, b.width, b.height)) {
                            if (b.type === 'main_building') this.townHallPos = [cx, cy];
                            this.placeEntity(b, cx, cy, b.type === 'main_building' ? 9 : 1);
                            break;
                        }
                    }
                }

                if (!this.townHallPos) return { error: "Rathaus konnte nicht platziert werden" };

                // hard guarantee before pruning: tear down blockers if that is the
                // only way left to give a building its street connection - a
                // re-placed blocker can itself land badly, so repair runs in up
                // to three passes (a clean pass exits immediately)
                for (let rp = 0; rp < 3; rp++) this.repairUnconnected();

                // whatever still has no street now never gets one - off the map
                // and into the unplaced report
                this.dropUnconnected();

                // the repair passes may have moved buildings and freed space -
                // final chance for every two-lane corridor
                this.connectTwoLane();

                // strip two-lane tiles nobody needs - stray ones as well as the
                // generously laid double rows and trunks of the bands strategy
                this.trimTwoLane();

                // two-lane buildings no corridor reaches follow the same drop
                // policy - their removal frees space, so re-trim afterwards
                if (this.dropTwoLaneUnserved()) this.trimTwoLane();

                // pad odd corridors so they decompose into whole 2x2 pieces; a
                // building whose spot cannot be served with whole pieces at all
                // is dropped as well, its corridor rest re-trimmed away
                const broken = this.completeTwoLaneBlocks();
                if (broken.length) {
                    for (const b of broken) this.removePlaced(b);
                    this.trimTwoLane();
                    this.completeTwoLaneBlocks();
                }

                this.pruneRoadsSmart();

                // the street buildings close ranks before anything else moves in:
                // a street building standing alone far out keeps a whole road
                // alive and ends up as an island among the roadless buildings.
                // Roads that became useless go before the space is filled
                this.improve(this.closeMs, false, true);
                this.pruneRoadsSmart();

                // roadless buildings fill what the street layout left over
                this.packRoadlessTouching(decos, allCoords);

                return this.result();
            }

            /**
             * Keep mode: the city stays as it stands. Roads and buildings go
             * onto the map where they are in the live city, only buildings
             * without a spot (new ones from the inventory, the free area) are
             * placed - into free space where possible, otherwise by moving as
             * few standing buildings as possible.
             *
             * @param {number} budgetMs - Search time.
             * @returns {Object} Worker result of this variant.
             */
            runKeep(budgetMs) {
                if (!this.townHall) return { error: "Rathaus nicht gefunden" };

                for (const r of this.keepRoads) {
                    const level = (r.width || 1) >= 2 ? 2 : 1;
                    for (let i = r.x; i < r.x + (r.width || 1); i++) {
                        for (let j = r.y; j < r.y + (r.height || 1); j++) this.placeRoadTile(i, j, level);
                    }
                }
                // a building whose spot is taken or off the map is placed anew
                for (const b of [this.townHall, ...this.buildings]) {
                    if (!b.standing || !this.canPlace(b.x, b.y, b.width, b.height)) continue;
                    const isTownHall = b.type === 'main_building';
                    if (isTownHall) this.townHallPos = [b.x, b.y];
                    this.placeEntity(b, b.x, b.y, isTownHall ? 9 : 1);
                }
                if (!this.townHallPos) return { error: "Rathaus konnte nicht platziert werden" };

                // a building standing without its street (dropped somewhere for
                // now) is loose: moving it to a road costs nothing, its spot is
                // no home
                const twoLane = this.linkedTwoLaneTiles();
                for (const b of this.placedBuildings) {
                    const r = this.connRect(b);
                    const street = b.street_level || 0;
                    b.loose = !b.pinned && b.type !== 'main_building' && street > 0
                        && (street >= 2 ? !this.touchesTwoLane(r, twoLane) : !this.isConnectedToRoad(r.x, r.y, r.width, r.height));
                    if (!b.loose) this.homes.set(b.x + ',' + b.y, this.homeKey(b));
                }

                this.improve(budgetMs, true);

                // no spot at a road even by moving others: the free spot closest
                // to the roads, then new pieces of road for everything still
                // without one - what stays cut off leaves the plan again, only
                // loose buildings remain where they stand
                const placedIds = new Set(this.placedBuildings.map(b => b.id));
                for (const b of this.buildings) if (!placedIds.has(b.id)) this.placeNearRoad(b);
                this.connectPlacedBuildings(b => !b.pinned && (b.street_level || 0) < 2);
                this.connectTwoLane();
                for (const b of this.completeTwoLaneBlocks()) if (!b.loose) this.removePlaced(b);
                this.dropUnconnected();
                this.dropTwoLaneUnserved();

                // roads nobody needs anymore turn into free space
                this.pruneRoadsSmart();

                return this.result();
            }

            /**
             * Places a building on the free spot with the shortest way to the
             * road network across free tiles; without such a spot it stays
             * unplaced.
             *
             * @param {Object} b - Building to place.
             */
            placeNearRoad(b) {
                const W = this.gridW;
                const cells = this.snapshot();
                // steps from every free tile to the nearest road
                const dist = new Int32Array(cells.length).fill(-1);
                const queue = [];
                for (const key of this.roadTiles) {
                    dist[this.cellIdOf.get(key)] = 0;
                    queue.push(this.cellIdOf.get(key));
                }
                for (let head = 0; head < queue.length; head++) {
                    const id = queue[head];
                    for (const nb of [id - 1, id + 1, id - W, id + W]) {
                        if (cells[nb] === 0 && dist[nb] < 0) { dist[nb] = dist[id] + 1; queue.push(nb); }
                    }
                }

                const head = this.connRect(b);
                let best = -1, bestDist = Infinity;
                for (let k = 0; k < this.cellIds.length; k++) {
                    const id = this.cellIds[k];
                    let fits = true;
                    for (let j = 0; j < b.height && fits; j++) {
                        for (let i = 0; i < b.width; i++) if (cells[id + j * W + i] !== 0) { fits = false; break; }
                    }
                    if (!fits) continue;
                    let near = Infinity;
                    const visit = (c) => { if (dist[c] >= 0 && dist[c] < near) near = dist[c]; };
                    for (let i = 0; i < head.width; i++) { visit(id - W + i); visit(id + head.height * W + i); }
                    for (let j = 0; j < head.height; j++) { visit(id + j * W - 1); visit(id + j * W + head.width); }
                    if (near < bestDist) { bestDist = near; best = k; }
                }
                if (best < 0) return;
                const parts = this.cellKeys[best].split(',');
                this.placeEntity(b, +parts[0], +parts[1], 1);
            }

            /**
             * Key figures and export of the layout as it stands.
             *
             * @returns {Object} Worker result of this variant.
             */
            result() {
                // built building area minus road area: the winning strategy places
                // as much as possible while spending the fewest road tiles; a placed
                // building that never got a road counts like a missing one - the
                // untouched chains of the keep mode connect through their head
                let builtTiles = 0;
                let unconnected = 0;
                const l2linked = this.linkedTwoLaneTiles();
                for (const b of this.placedBuildings) {
                    const r = this.connRect(b);
                    const bad = !b.pinned && ((b.street_level > 0 && !this.isConnectedToRoad(r.x, r.y, r.width, r.height))
                        || ((b.street_level || 0) >= 2 && !this.touchesTwoLane(r, l2linked)));
                    if (bad) {
                        unconnected++;
                        continue;
                    }
                    builtTiles += b.width * b.height;
                }

                // whatever still has no spot gets reported instead of silently
                // dropped - chain composites are split back into their members,
                // sizes go back to real map orientation
                const finalIds = new Set(this.placedBuildings.map(b => b.id));
                const unplaced = [];
                for (const b of [this.townHall, ...this.buildings]) {
                    if (finalIds.has(b.id)) continue;
                    const members = b.chainMembers ? b.chainMembers : [b];
                    for (const m of members) {
                        unplaced.push({
                            id: m.id,
                            asset_id: m.asset_id,
                            name: m.name,
                            type: m.type,
                            width: this.transposed ? m.height : m.width,
                            height: this.transposed ? m.width : m.height,
                            street_level: m.street_level || 0
                        });
                    }
                }

                // street buildings surrounded mostly by roadless ones look lost
                // and usually hang on a road of their own
                const roadless = new Set();
                for (const b of this.placedBuildings) {
                    if ((b.street_level || 0) > 0 || b.type === 'main_building') continue;
                    for (let i = b.x; i < b.x + b.width; i++) {
                        for (let j = b.y; j < b.y + b.height; j++) roadless.add(i + ',' + j);
                    }
                }
                let islands = 0;
                for (const b of this.placedBuildings) {
                    if (!(b.street_level > 0) || b.type === 'main_building' || b.type === 'greatbuilding') continue;
                    let touching = 0;
                    for (let i = b.x; i < b.x + b.width; i++) touching += roadless.has(i + ',' + (b.y - 1)) + roadless.has(i + ',' + (b.y + b.height));
                    for (let j = b.y; j < b.y + b.height; j++) touching += roadless.has((b.x - 1) + ',' + j) + roadless.has((b.x + b.width) + ',' + j);
                    if (touching >= b.width + b.height) islands++;
                }

                const stats = {
                    strategy: this.strategy,
                    sortMode: this.sortMode,
                    seed: this.seed,
                    score: builtTiles - this.roadTiles.size,
                    // usable spare space: free tiles outside the largest free rectangle
                    wasted: this.freeSpaceWaste(),
                    islands: islands,
                    roads: this.roadTiles.size,
                    l2: [...this.roadTiles].filter(k => (this.roadLevel.get(k) || 1) >= 2).length,
                    buildings: this.placedBuildings.length,
                    missing: this.buildings.length - this.placedBuildings.length + 1,
                    unconnected: unconnected
                };
                // keep mode: standing buildings that do not stand on a spot of their kind anymore
                if (this.keep) {
                    stats.moved = this.homes.size
                        - this.placedBuildings.filter(b => this.homes.get(b.x + ',' + b.y) === this.homeKey(b)).length;
                }

                return { success: true, layout: this.generateExportData(), unplaced: unplaced, stats: stats };
            }

            /**
             * Polishes the finished layout: gap closing, then the roads that
             * became useless are removed and the freed tiles closed as well.
             *
             * @param {number} budgetMs - Search time.
             * @returns {Object} Worker result of this variant.
             */
            polish(budgetMs) {
                const started = performance.now();
                this.improve(budgetMs * 0.8);
                const roads = this.roadTiles.size;
                this.pruneRoadsSmart();
                if (this.roadTiles.size < roads) this.improve(Math.max(0, budgetMs - (performance.now() - started)));
                return this.result();
            }
        }

        self.onmessage = function(e) {
            try {
                // time-boxed search, callers may grant more than the interactive default
                const budgetMs = e.data.budgetMs || 10000;
                const started = performance.now();
                const elapsed = () => performance.now() - started;
                // progress ping for the loading bar: the time budget is the
                // limiting factor, so the percentage follows the clock
                const ping = () => self.postMessage({ progress: Math.min(99, Math.round(elapsed() * 100 / budgetMs)) });

                // lexicographic ranking: complete layouts first, then the
                // fewest moved buildings (keep mode), then the largest free
                // rectangle - with every building placed, each road tile and
                // each free tile outside that rectangle is lost for it - with
                // a surcharge per street building standing as an island among
                // roadless ones, then the fewest two-lane tiles, then the
                // fewest roads
                const rank = (r) => [
                    r.stats.missing + r.stats.unconnected,
                    r.stats.moved || 0,
                    r.stats.roads + r.stats.wasted + (r.stats.strategy === 'keep' ? 0 : 3 * r.stats.islands),
                    r.stats.l2,
                    r.stats.roads
                ];
                const cmpRank = (a, b) => {
                    for (let i = 0; i < a.length; i++) {
                        if (a[i] !== b[i]) return a[i] - b[i];
                    }
                    return 0;
                };
                // near-identical layouts (seeded restarts of the same strategy
                // usually converge) collapse via their stats fingerprint; the
                // strategy is part of the key, so equal numbers from different
                // strategies - visually different cities - both survive
                const fingerprint = (s) => [s.strategy, s.missing, s.unconnected, s.moved, s.l2, s.wasted, s.islands, s.score, s.roads, s.buildings].join('|');

                const tried = [];
                const log = (variant, result) => {
                    if (result && result.success) {
                        const s = result.stats;
                        tried.push({ strategy: variant.strategy, sortMode: variant.sortMode, seed: variant.seed, score: s.score, wasted: s.wasted, roads: s.roads, l2: s.l2, missing: s.missing, unconnected: s.unconnected });
                    } else {
                        tried.push({ strategy: variant.strategy, sortMode: variant.sortMode, seed: variant.seed, error: (result && result.error) || 'failed' });
                    }
                };

                let picked = [];

                if (e.data.keep) {
                    // keep mode: the standing city with a few differently seeded searches
                    const restarts = 3;
                    const seen = {};
                    for (let seed = 1; seed <= restarts; seed++) {
                        const variant = { strategy: 'keep', sortMode: 'height', seed: seed, roads: e.data.roads };
                        const optimizer = new CityOptimizerBrowser(e.data.mapData, e.data.buildingsData, variant);
                        const result = optimizer.runKeep(Math.max(200, (budgetMs - elapsed()) / (restarts - seed + 1)));
                        log(variant, result);
                        ping();
                        if (!result || !result.success || seen[fingerprint(result.stats)]) continue;
                        seen[fingerprint(result.stats)] = true;
                        picked.push({ result: result, rankVec: rank(result) });
                    }
                } else {
                    // deterministic base variants first, then randomized restarts
                    // with jittered build orders
                    const maxRuns = 1000;
                    const strategies = ['bands', 'bands-vertical', 'organic'];
                    const sortModes = ['height', 'area', 'width'];

                    const baseVariants = [];
                    for (const strategy of strategies) {
                        for (const sortMode of sortModes) baseVariants.push({ strategy: strategy, sortMode: sortMode, seed: 0 });
                    }

                    // the first part of the time tries street layouts, each with
                    // a short gap closing - how well a layout closes only shows
                    // afterwards; the rest of the time goes into the best ones
                    const exploreMs = budgetMs * 0.6;
                    const quickMs = 120;

                    // bounded top list: the best runs are kept as selectable
                    // variants, not only the single winner - different strategies
                    // trade road savings against compactness and the user picks
                    const top = [];
                    const topLimit = 18;

                    // best run per strategy, tracked separately: the global top
                    // list may be dominated by one strategy, but every strategy
                    // must stay selectable with its own best layout
                    const bestByStrategy = {};

                    let round = 0;
                    while (tried.length < maxRuns) {
                        let variant;
                        if (baseVariants.length) {
                            variant = baseVariants.shift();
                        } else {
                            variant = {
                                strategy: strategies[round % strategies.length],
                                sortMode: sortModes[((round / strategies.length) | 0) % sortModes.length],
                                seed: 1 + round
                            };
                            round++;
                        }

                        const optimizer = new CityOptimizerBrowser(e.data.mapData, e.data.buildingsData, variant);
                        let result = optimizer.run();
                        if (result && result.success) result = optimizer.polish(quickMs);
                        log(variant, result);
                        if (result && result.success) {
                            const entry = { optimizer: optimizer, result: result, rankVec: rank(result) };
                            if (top.length < topLimit || cmpRank(entry.rankVec, top[top.length - 1].rankVec) < 0) {
                                let at = 0;
                                while (at < top.length && cmpRank(top[at].rankVec, entry.rankVec) <= 0) at++;
                                top.splice(at, 0, entry);
                                if (top.length > topLimit) top.pop();
                            }

                            const curBest = bestByStrategy[variant.strategy];
                            if (!curBest || cmpRank(entry.rankVec, curBest.rankVec) < 0) bestByStrategy[variant.strategy] = entry;
                        }

                        if (tried.length % 5 === 0) ping();
                        if (elapsed() > exploreMs && !baseVariants.length) break;
                    }

                    // diversity guarantee first, then fill with the globally
                    // best distinct layouts up to the picker limit
                    const seen = {};
                    const push = (entry) => {
                        const key = fingerprint(entry.result.stats);
                        if (seen[key]) return;
                        seen[key] = true;
                        picked.push(entry);
                    };
                    for (const strategy of strategies) {
                        if (bestByStrategy[strategy]) push(bestByStrategy[strategy]);
                    }
                    for (const entry of top) {
                        if (picked.length >= 9) break;
                        push(entry);
                    }

                    // gap closing in turns, so every finalist gets the same
                    // share and the loading bar keeps moving: the best layout
                    // of every strategy and the best of the rest
                    const finalists = picked.slice().sort((a, b) => cmpRank(a.rankVec, b.rankVec)).slice(0, 4);
                    for (const entry of picked.slice(0, strategies.length)) {
                        if (!finalists.includes(entry)) finalists.push(entry);
                    }
                    // a finalist that gained nothing three turns in a row is done
                    let active = finalists;
                    while (active.length && elapsed() < budgetMs) {
                        for (const entry of active) {
                            const left = budgetMs - elapsed();
                            if (left <= 0) break;
                            const result = entry.optimizer.polish(Math.min(300, left));
                            const rankVec = rank(result);
                            entry.stale = cmpRank(rankVec, entry.rankVec) < 0 ? 0 : (entry.stale || 0) + 1;
                            entry.result = result;
                            entry.rankVec = rankVec;
                            ping();
                        }
                        active = active.filter(entry => (entry.stale || 0) < 3);
                    }
                }

                if (picked.length) {
                    picked.sort((a, b) => cmpRank(a.rankVec, b.rankVec));

                    const variants = picked.map(entry => ({ layout: entry.result.layout, unplaced: entry.result.unplaced, stats: entry.result.stats }));
                    variants[0].stats.runs = tried.length;
                    variants[0].stats.tried = tried;
                    self.postMessage({ success: true, variants: variants });
                } else {
                    const failed = tried.find(t => t.error);
                    self.postMessage({ success: false, error: (failed && failed.error) || 'Kein Layout gefunden' });
                }
            } catch (err) {
                self.postMessage({ success: false, error: err.message });
            }
        };`;
