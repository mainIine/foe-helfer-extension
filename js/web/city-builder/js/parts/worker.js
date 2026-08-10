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
                    let al = area.length || 4;
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
    
                for (let x = this.mapBounds.minX; x < this.mapBounds.maxX; x++) {
                    for (let y = this.mapBounds.minY; y < this.mapBounds.maxY; y++) {
                        this.grid.set(x + ',' + y, validTiles.has(x + ',' + y) ? 0 : -1);
                    }
                }
    
                const ignore = ["Hafen", "Terminal", "Hub", "Außenposten"];
                rawBuildings.forEach(b => {
                    if ((b.width || 0) <= 0) return;
                    if (['hub_main', 'hub_part', 'off_grid'].includes(b.type)) return;
                    if (ignore.some(ig => b.name.includes(ig))) return;
    
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
                    if (b.chain_id && b.chain_pos >= 0) {
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

            // connect every placed street building that has no road yet with the
            // shortest possible stub - one touching tile is enough
            connectPlacedBuildings() {
                const unconn = (b) => {
                    const r = this.connRect(b);
                    return b.street_level > 0 && !this.isConnectedToRoad(r.x, r.y, r.width, r.height);
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
                    if (b.type === 'main_building' || !(b.street_level > 0)) continue;
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
                    if ((b.street_level || 0) < 2) continue;
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

            countAdjacentRoadTiles(b) {
                let count = 0;
                for (let i = b.x; i < b.x + b.width; i++) {
                    if (this.roadTiles.has(i + ',' + (b.y - 1))) count++;
                    if (this.roadTiles.has(i + ',' + (b.y + b.height))) count++;
                }
                for (let j = b.y; j < b.y + b.height; j++) {
                    if (this.roadTiles.has((b.x - 1) + ',' + j)) count++;
                    if (this.roadTiles.has((b.x + b.width) + ',' + j)) count++;
                }
                return count;
            }
    
            pruneRoadsSmart() {
                // the town hall counts too: its last road tile must survive -
                // chain composites only guard the road at their head member
                const streetBuildings = this.placedBuildings.filter(b => b.street_level > 0).map(b => this.connRect(b));

                const buildingsTouching = (rx, ry) => streetBuildings.filter(b =>
                    ((ry === b.y - 1 || ry === b.y + b.height) && rx >= b.x && rx < b.x + b.width) ||
                    ((rx === b.x - 1 || rx === b.x + b.width) && ry >= b.y && ry < b.y + b.height)
                );

                // a road tile may go when every remaining tile still reaches the
                // town hall through roads (adjacency to the town hall is the
                // anchor - that keeps networks of several town-hall-anchored
                // components prunable) and no adjacent building loses its last
                // road tile - unlike pure dead-end peeling this also removes
                // parallel double roads, which are connected at both ends and
                // would survive forever otherwise
                const th = this.townHallPos
                    ? { x: this.townHallPos[0], y: this.townHallPos[1], width: this.townHall.width, height: this.townHall.height }
                    : null;
                const stillConnected = (skipKey) => {
                    const seeds = [];
                    if (th) {
                        for (let i = th.x; i < th.x + th.width; i++) {
                            for (const k of [i + ',' + (th.y - 1), i + ',' + (th.y + th.height)]) {
                                if (k !== skipKey && this.roadTiles.has(k)) seeds.push(k);
                            }
                        }
                        for (let j = th.y; j < th.y + th.height; j++) {
                            for (const k of [(th.x - 1) + ',' + j, (th.x + th.width) + ',' + j]) {
                                if (k !== skipKey && this.roadTiles.has(k)) seeds.push(k);
                            }
                        }
                    } else {
                        for (const key of this.roadTiles) { if (key !== skipKey) { seeds.push(key); break; } }
                    }
                    if (!seeds.length) return this.roadTiles.size <= 1;
                    const seen = new Set([skipKey, ...seeds]);
                    const stack = [...seeds];
                    let count = seeds.length;
                    while (stack.length) {
                        const k = stack.pop();
                        const parts = k.split(',');
                        const kx = +parts[0], ky = +parts[1];
                        for (const nk of [(kx-1)+','+ky, (kx+1)+','+ky, kx+','+(ky-1), kx+','+(ky+1)]) {
                            if (this.roadTiles.has(nk) && !seen.has(nk)) {
                                seen.add(nk);
                                count++;
                                stack.push(nk);
                            }
                        }
                    }
                    return count === this.roadTiles.size - 1;
                };

                let changed = true;
                while (changed) {
                    changed = false;
                    for (const key of [...this.roadTiles]) {
                        const [rx, ry] = key.split(',').map(Number);

                        // two-lane tiles are deliberate 2x2 blocks - never prune them
                        if ((this.roadLevel.get(key) || 1) >= 2) continue;

                        // One connection tile per building is enough - keep this tile
                        // if some adjacent building would lose its last road tile
                        if (buildingsTouching(rx, ry).some(b => this.countAdjacentRoadTiles(b) <= 1)) continue;

                        let neighbors = 0;
                        if (this.grid.get((rx-1) + ',' + ry) === 2) neighbors++;
                        if (this.grid.get((rx+1) + ',' + ry) === 2) neighbors++;
                        if (this.grid.get(rx + ',' + (ry-1)) === 2) neighbors++;
                        if (this.grid.get(rx + ',' + (ry+1)) === 2) neighbors++;

                        // endpoints can never split the tile graph - but a tile
                        // on the town hall perimeter can be the anchor of its
                        // whole branch, so it always takes the reachability check
                        const anchorTile = th
                            && (((ry === th.y - 1 || ry === th.y + th.height) && rx >= th.x && rx < th.x + th.width)
                                || ((rx === th.x - 1 || rx === th.x + th.width) && ry >= th.y && ry < th.y + th.height));
                        if ((neighbors > 1 || anchorTile) && !stillConnected(key)) continue;

                        this.grid.set(key, 0);
                        this.roadTiles.delete(key);
                        this.roadLevel.delete(key);
                        changed = true;
                    }
                }
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

                // free-space fragmentation of the pure building layout, measured
                // before the decorations plug the holes: every free tile outside
                // the largest connected free region is a scattered speckle the
                // final layout should not have
                let fragmentTiles = 0;
                {
                    let totalFree = 0, largestFree = 0;
                    const seen = new Set();
                    for (const [key, val] of this.grid) {
                        if (val !== 0) continue;
                        totalFree++;
                        if (seen.has(key)) continue;
                        let size = 0;
                        const stack = [key];
                        seen.add(key);
                        while (stack.length) {
                            const k = stack.pop();
                            size++;
                            const parts = k.split(',');
                            const kx = +parts[0], ky = +parts[1];
                            for (const nk of [(kx-1)+','+ky, (kx+1)+','+ky, kx+','+(ky-1), kx+','+(ky+1)]) {
                                if (this.grid.get(nk) === 0 && !seen.has(nk)) { seen.add(nk); stack.push(nk); }
                            }
                        }
                        if (size > largestFree) largestFree = size;
                    }
                    fragmentTiles = totalFree - largestFree;
                }

                // Roadless buildings: plug the dead pockets between the buildings
                // first, then pack the rest row by row from the top-left, tight
                // against the built-up city - and never cut the big free area in
                // two, it stays in one piece for expansion. Height-major order
                // builds rows of uniform height, so the rows stack flush instead
                // of leaving stripes of free tiles between jagged edges
                decos.sort((a, b) => b.height - a.height || (b.width * b.height) - (a.width * a.height));
                for (const b of decos) {
                    // fresh free regions (roads count as walls here)
                    const regionOf = new Map();
                    const regionSizes = [];
                    for (const [key, val] of this.grid) {
                        if (val !== 0 || regionOf.has(key)) continue;
                        const id = regionSizes.length;
                        let size = 0;
                        const stack = [key];
                        regionOf.set(key, id);
                        while (stack.length) {
                            const k = stack.pop();
                            size++;
                            const parts = k.split(',');
                            const kx = +parts[0], ky = +parts[1];
                            for (const nk of [(kx-1)+','+ky, (kx+1)+','+ky, kx+','+(ky-1), kx+','+(ky+1)]) {
                                if (this.grid.get(nk) === 0 && !regionOf.has(nk)) {
                                    regionOf.set(nk, id);
                                    stack.push(nk);
                                }
                            }
                        }
                        regionSizes.push(size);
                    }
                    let largestId = -1;
                    regionSizes.forEach((s, i) => { if (largestId === -1 || s > regionSizes[largestId]) largestId = i; });

                    // free tiles of the largest region that a footprint would cut
                    // off from its biggest remaining part - 0 means the region
                    // just shrinks compactly. Every separated part borders the
                    // footprint, so seeding the BFS around it finds them all
                    const sealedAfter = (x, y, w, h) => {
                        const inFoot = (px, py) => px >= x && px < x + w && py >= y && py < y + h;
                        const target = regionSizes[largestId] - w * h;
                        if (target <= 0) return 0;
                        const seeds = [];
                        for (let i = x - 1; i <= x + w; i++) {
                            for (const j of [y - 1, y + h]) {
                                if (regionOf.get(i + ',' + j) === largestId) seeds.push(i + ',' + j);
                            }
                        }
                        for (let j = y; j < y + h; j++) {
                            for (const i of [x - 1, x + w]) {
                                if (regionOf.get(i + ',' + j) === largestId) seeds.push(i + ',' + j);
                            }
                        }
                        const seen = new Set();
                        let largest = 0;
                        for (const seed of seeds) {
                            if (seen.has(seed)) continue;
                            let size = 0;
                            const stack = [seed];
                            seen.add(seed);
                            while (stack.length) {
                                const k = stack.pop();
                                size++;
                                const parts = k.split(',');
                                const kx = +parts[0], ky = +parts[1];
                                for (const nk of [(kx-1)+','+ky, (kx+1)+','+ky, kx+','+(ky-1), kx+','+(ky+1)]) {
                                    if (seen.has(nk) || regionOf.get(nk) !== largestId) continue;
                                    const p2 = nk.split(',');
                                    if (inFoot(+p2[0], +p2[1])) continue;
                                    seen.add(nk);
                                    stack.push(nk);
                                }
                            }
                            if (size > largest) largest = size;
                        }
                        return target - largest;
                    };

                    let done = false;
                    // 1) dead pockets between the buildings - smallest pockets
                    // first, so the speckles get erased completely before a
                    // decoration bites into a bigger pocket
                    const pocketOrder = [];
                    for (const [cx, cy] of allCoords) {
                        const rid = regionOf.get(cx + ',' + cy);
                        if (rid === undefined || rid === largestId) continue;
                        pocketOrder.push([regionSizes[rid], cx, cy]);
                    }
                    pocketOrder.sort((p, q) => p[0] - q[0]);
                    for (const pc of pocketOrder) {
                        const cx = pc[1], cy = pc[2];
                        if (this.grid.get(cx + ',' + cy) !== 0) continue;
                        if (!this.canPlace(cx, cy, b.width, b.height)) continue;
                        this.placeEntity(b, cx, cy, 1);
                        done = true;
                        break;
                    }
                    // 2) pack against the built-up city, row by row from the
                    // top-left: the roadless buildings form one solid block right
                    // behind the street buildings, so the spare space collects as
                    // a single area at the far end of the map. A spot that
                    // strands no free tile wins instantly; otherwise the spot
                    // stranding the fewest wins - a small sealed notch beats the
                    // stripes of free tiles a strict rejection would leave
                    if (!done) {
                        let best = null;
                        let candidates = 0;
                        for (const [cx, cy] of allCoords) {
                            const key = cx + ',' + cy;
                            if (this.grid.get(key) !== 0 || regionOf.get(key) !== largestId) continue;
                            if (!this.canPlace(cx, cy, b.width, b.height)) continue;
                            const sealed = sealedAfter(cx, cy, b.width, b.height);
                            if (sealed <= 0) { best = [0, cx, cy]; break; }
                            if (!best || sealed < best[0]) best = [sealed, cx, cy];
                            if (++candidates >= 40) break;
                        }
                        if (best) {
                            this.placeEntity(b, best[1], best[2], 1);
                            done = true;
                        }
                    }
                    // 3) fallback: anywhere it fits, splitting allowed as the
                    // last resort
                    if (!done) {
                        for (const [cx, cy] of allCoords) {
                            if (this.grid.get(cx + ',' + cy) !== 0) continue;
                            if (this.canPlace(cx, cy, b.width, b.height)) {
                                this.placeEntity(b, cx, cy, 1);
                                break;
                            }
                        }
                    }
                }
    
                // compaction: slide every roadless building up and left until it
                // rests against the city - this closes the thin seams of free
                // tiles the placement order leaves between the rows, so the
                // roadless mass stands as one solid block
                {
                    const fitsAt = (b, nx, ny) => {
                        for (let i = nx; i < nx + b.width; i++) {
                            for (let j = ny; j < ny + b.height; j++) {
                                const v = this.grid.get(i + ',' + j);
                                if (v === 0) continue;
                                if (v === 1 && i >= b.x && i < b.x + b.width && j >= b.y && j < b.y + b.height) continue;
                                return false;
                            }
                        }
                        return true;
                    };
                    const applyMove = (b, nx, ny, val) => {
                        for (let i = b.x; i < b.x + b.width; i++) {
                            for (let j = b.y; j < b.y + b.height; j++) this.grid.set(i + ',' + j, 0);
                        }
                        for (let i = nx; i < nx + b.width; i++) {
                            for (let j = ny; j < ny + b.height; j++) this.grid.set(i + ',' + j, val);
                        }
                        b.x = nx;
                        b.y = ny;
                    };
                    // pure top-left gravity, processed in top-left order so a
                    // whole row cascades within one pass; a temporary gap behind
                    // a sliding building is closed by the neighbours that follow.
                    // If a slide seals a pocket for good, the wasted metric makes
                    // that variant lose the selection - no veto needed here
                    let movedAny = true, cGuard = 0;
                    while (movedAny && cGuard++ < 15) {
                        movedAny = false;
                        const order = this.placedBuildings
                            .filter(b => b.street_level === 0 && b.type !== 'main_building')
                            .sort((p, q) => (p.x + p.y) - (q.x + q.y) || p.y - q.y);
                        for (const b of order) {
                            for (const [dx, dy] of [[0, -1], [-1, 0]]) {
                                while (fitsAt(b, b.x + dx, b.y + dy)) {
                                    applyMove(b, b.x + dx, b.y + dy, 1);
                                    movedAny = true;
                                }
                            }
                        }
                    }
                }

                // usable spare space: the largest empty rectangle left on the map.
                // "connected" alone is not enough - a thin ring around the city is
                // connected but useless; free tiles outside the biggest rectangle
                // count as waste, so compact corner layouts win the selection
                let wastedFree = 0;
                {
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
                    wastedFree = finalFree - largestRect;
                }

                // built building area minus road area: the winning strategy places
                // as much as possible while spending the fewest road tiles; a placed
                // building that never got a road counts like a missing one
                let builtTiles = 0;
                let unconnected = 0;
                const l2linked = this.linkedTwoLaneTiles();
                for (const b of this.placedBuildings) {
                    const r = this.connRect(b);
                    const bad = (b.street_level > 0 && !this.isConnectedToRoad(r.x, r.y, r.width, r.height))
                        || ((b.street_level || 0) >= 2 && !this.touchesTwoLane(r, l2linked));
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

                return {
                    success: true,
                    layout: this.generateExportData(),
                    unplaced: unplaced,
                    stats: {
                        strategy: this.strategy,
                        sortMode: this.sortMode,
                        seed: this.seed,
                        score: builtTiles - this.roadTiles.size,
                        fragments: fragmentTiles,
                        wasted: wastedFree,
                        roads: this.roadTiles.size,
                        l2: [...this.roadTiles].filter(k => (this.roadLevel.get(k) || 1) >= 2).length,
                        buildings: this.placedBuildings.length,
                        missing: this.buildings.length - this.placedBuildings.length + 1,
                        unconnected: unconnected
                    }
                };
            }
        }
    
        self.onmessage = function(e) {
            try {
                // time-boxed search: deterministic base variants first, then randomized
                // restarts with jittered build orders - the best score wins
                const budgetMs = 10000;
                const maxRuns = 1000;
                const started = performance.now();
                const strategies = ['bands', 'bands-vertical', 'organic'];
                const sortModes = ['height', 'area', 'width'];

                const baseVariants = [];
                for (const strategy of strategies) {
                    for (const sortMode of sortModes) baseVariants.push({ strategy: strategy, sortMode: sortMode, seed: 0 });
                }

                // lexicographic ranking: complete layouts first, then the
                // fewest two-lane tiles (two-lane roads exist purely as a
                // requirement, every spare piece wastes the space that was
                // won), then the least disorder: free tiles outside the
                // largest empty rectangle (wasted) plus speckle pockets
                // the decorations had to plug (fragments) - then best
                // score, then fewest roads
                const rank = (r) => [
                    r.stats.missing + r.stats.unconnected,
                    r.stats.l2,
                    r.stats.wasted + r.stats.fragments,
                    -r.stats.score,
                    r.stats.roads
                ];
                const cmpRank = (a, b) => {
                    for (let i = 0; i < a.length; i++) {
                        if (a[i] !== b[i]) return a[i] - b[i];
                    }
                    return 0;
                };

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
                const tried = [];

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
                    const result = optimizer.run();
                    if (result && result.success) {
                        tried.push({ strategy: variant.strategy, sortMode: variant.sortMode, seed: variant.seed, score: result.stats.score, fragments: result.stats.fragments, wasted: result.stats.wasted, roads: result.stats.roads, l2: result.stats.l2, missing: result.stats.missing, unconnected: result.stats.unconnected });

                        const rv = rank(result);
                        if (top.length < topLimit || cmpRank(rv, top[top.length - 1].rankVec) < 0) {
                            let at = 0;
                            while (at < top.length && cmpRank(top[at].rankVec, rv) <= 0) at++;
                            top.splice(at, 0, { result: result, rankVec: rv });
                            if (top.length > topLimit) top.pop();
                        }

                        const curBest = bestByStrategy[variant.strategy];
                        if (!curBest || cmpRank(rv, curBest.rankVec) < 0) {
                            bestByStrategy[variant.strategy] = { result: result, rankVec: rv };
                        }
                    } else {
                        tried.push({ strategy: variant.strategy, sortMode: variant.sortMode, seed: variant.seed, error: (result && result.error) || 'failed' });
                    }

                    // progress ping for the loading bar: the time budget is the
                    // limiting factor, so the percentage follows the clock
                    if (tried.length % 5 === 0) {
                        const pct = Math.min(99, Math.round((performance.now() - started) * 100 / budgetMs));
                        self.postMessage({ progress: pct });
                    }

                    if (performance.now() - started > budgetMs && !baseVariants.length) break;
                }

                if (top.length) {
                    // near-identical layouts (seeded restarts of the same strategy
                    // usually converge) collapse via their stats fingerprint; the
                    // strategy is part of the key, so equal numbers from different
                    // strategies - visually different cities - both survive
                    const seen = {};
                    const picked = [];
                    const push = (entry) => {
                        const s = entry.result.stats;
                        const key = [s.strategy, s.missing, s.unconnected, s.l2, s.wasted, s.fragments, s.score, s.roads, s.buildings].join('|');
                        if (seen[key]) return;
                        seen[key] = true;
                        picked.push(entry);
                    };

                    // diversity guarantee first, then fill with the globally
                    // best distinct layouts up to the picker limit
                    for (const strategy of strategies) {
                        if (bestByStrategy[strategy]) push(bestByStrategy[strategy]);
                    }
                    for (const entry of top) {
                        if (picked.length >= 9) break;
                        push(entry);
                    }
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
