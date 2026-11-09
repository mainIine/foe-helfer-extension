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
 * Building optimization for the City Builder: swaps the weakest special
 * buildings of the city for better ones from the inventory and selection kits,
 * rated with the user's efficiency settings (Productions.Rating), and lets the
 * layout worker fill the space over several rounds.
 *
 * Rules: great buildings, the town hall, era buildings and buildings with an
 * ally stay. Limited buildings count with the value they decay into, unless a
 * fresh copy waits in the inventory to renew them. The number of buildings with
 * 5 minute productions never drops, happiness stays at least at today's ratio
 * and some free population is kept.
 */
CityBuilder.Optimizer = {

    /** @type {number} minimum rating gain (x100) for a swap to pay off */
    Margin: 120,

    /** @type {number} layout rounds, each one a full worker search */
    Rounds: 6,

    /** @type {number} search time per round in ms */
    RoundBudget: 12000,

    /** @type {Object[]} key figures of every round of the last run */
    Log: [],

    /** @type {number} free tiles the rounds aim for (single tiles at roads are unavoidable) */
    TargetFree: 35,


    /**
     * Rating of a building as shown in the efficiency box (x100).
     *
     * @param {Object} building - Building from CityBuildings.
     * @returns {number} Rating.
     */
    score: (building) => Math.round(Productions.rateBuilding(building).totalScore * 100),


    /**
     * Area a building takes including its share of road, the same weighting the
     * efficiency rating uses.
     *
     * @param {number} w - Width.
     * @param {number} h - Height.
     * @param {number} street - Street connection level.
     * @returns {number} Area in tiles.
     */
    area: (w, h, street) => w * h + (street ? ((w === 1 || h === 1) ? 0.5 : 1) : 0),


    /**
     * Footprint and street requirement from the metadata, in map orientation.
     *
     * @param {string} entityId - City entity id.
     * @returns {{w: number, h: number, street: number, name: string}} Placement data.
     */
    placement: (entityId) => {
        const meta = MainParser.CityEntities[entityId];
        const size = meta.components?.AllAge?.placement?.size || { x: meta.width, y: meta.length };
        const street = meta.components?.AllAge?.streetConnectionRequirement?.requiredLevel
            ?? meta.requirements?.street_connection_level ?? 0;
        return { w: parseInt(size.x) || 1, h: parseInt(size.y) || 1, street: street, name: meta.name };
    },


    /**
     * Whether a building offers a 5 minute production option.
     *
     * @param {string} entityId - City entity id.
     * @returns {boolean} True for 5 minute producers.
     */
    hasFiveMinutes: (entityId) => {
        const meta = MainParser.CityEntities[entityId];
        return Object.values(meta?.components || {}).some(c => c?.production?.options?.some(o => o.time === 300));
    },


    /**
     * Collects the city candidates, the inventory pool and the constraints.
     * Uses the efficiency rating of the productions module, so the user's
     * rating settings decide what counts as weak or strong.
     *
     * @returns {Object} Planning context.
     */
    prepare: () => {
        const O = CityBuilder.Optimizer;
        const CE = MainParser.CityEntities;

        Productions.Rating.load();
        Productions.CalcRatingBody();

        const stock = Object.assign({}, Kits.InventoryStock || {});
        const cityBuildings = Productions.BuildingsAll.filter(b => b && !b.isInInventory && b.id < 2000000000 && b.type !== 'street');

        // happiness and population of the live city
        let happiness = 0, popPlus = 0, popFree = 0;
        for (const b of cityBuildings) {
            happiness += b.happiness || 0;
            popFree += b.population || 0;
            if ((b.population || 0) > 0) popPlus += b.population;
        }

        const candidates = [];
        let fiveMinutesKept = 0;
        for (const b of cityBuildings) {
            if (CityBuilder.Excluded.has(b.id)) continue;
            const fixed = !b.isSpecial
                || ['greatbuilding', 'main_building'].includes(b.type) || b.type.includes('hub')
                || Allies.buildingList?.[b.id];
            const five = O.hasFiveMinutes(b.entityId);
            if (fixed) {
                if (five) fiveMinutesKept++;
                continue;
            }

            // limited buildings count with what they decay into, unless the
            // inventory holds a fresh copy to renew them
            let score = O.score(b);
            const limit = CE[b.entityId]?.components?.AllAge?.limited?.config;
            if (limit?.targetCityEntityId && CE[limit.targetCityEntityId] && !(stock[b.entityId] > 0)) {
                score = O.score(CityBuildings.createBuilding(CE[limit.targetCityEntityId], CurrentEra));
            }

            const p = O.placement(b.entityId);
            candidates.push({
                id: b.id, entityId: b.entityId, name: b.name, score: score, five: five,
                w: p.w, h: p.h, area: O.area(p.w, p.h, p.street),
                happiness: b.happiness || 0, population: b.population || 0
            });
        }

        return {
            candidates: candidates,
            pool: O.pool(stock),
            happiness: happiness,
            popPlus: popPlus,
            popFree: popFree,
            ratio: popPlus > 0 ? happiness / popPlus : 0,
            fiveMinutes: fiveMinutesKept + candidates.filter(c => c.five).length
        };
    },


    /**
     * Buildings that can be placed from the inventory, with honest counts:
     * the stock is handed out building by building, best rated first, so a
     * selection kit offering several buildings is only counted once.
     * Limited buildings and upgrades of buildings standing in the city are left out.
     *
     * @param {Object} stock - Flat inventory stock (consumed while counting).
     * @returns {Object[]} One entry per buildable copy, best rated first.
     */
    pool: (stock) => {
        const O = CityBuilder.Optimizer;
        const CE = MainParser.CityEntities;
        const rated = new Map(Productions.BuildingsAll.filter(b => b?.isInInventory).map(b => [b.entityId, b]));
        const options = [];

        for (const [entityId, data] of Object.entries(Productions.InventoryBuildings || {})) {
            const b = rated.get(entityId);
            const meta = CE[entityId];
            if (!b || !meta || !b.isSpecial || b.type === 'greatbuilding') continue;
            if (meta.components?.AllAge?.limited) continue;
            const score = O.score(b);
            if (score <= 0) continue;
            options.push({ entityId: entityId, building: b, score: score, chains: (data.chains || []).filter(c => !c.chain.some(el => el.from === 'city')) });
        }
        options.sort((a, b) => b.score - a.score);

        const pool = [];
        for (const opt of options) {
            const p = O.placement(opt.entityId);
            for (const c of opt.chains) {
                // build as many copies as this chain's ingredients allow
                while (c.chain.every(el => (stock[el.id] || 0) >= (el.count || 1))) {
                    for (const el of c.chain) stock[el.id] -= (el.count || 1);
                    pool.push({
                        entityId: opt.entityId, name: opt.building.name, score: opt.score,
                        w: p.w, h: p.h, street: p.street, area: O.area(p.w, p.h, p.street),
                        happiness: opt.building.happiness || 0, population: opt.building.population || 0,
                        five: O.hasFiveMinutes(opt.entityId)
                    });
                }
            }
        }
        return pool;
    },


    /**
     * Greedy swap plan: the best pool buildings replace the weakest city
     * buildings as long as the swap gains at least the margin. extraArea are
     * free tiles of the layout that may be filled on top of the freed space.
     *
     * @param {Object} ctx - Context from prepare().
     * @param {number} extraArea - Additional tiles to fill.
     * @returns {{removed: Object[], added: Object[], gain: number}} Plan.
     */
    swap: (ctx, extraArea) => {
        const O = CityBuilder.Optimizer;
        const removed = [], added = [];
        let hap = ctx.happiness, popPlus = ctx.popPlus, popFree = ctx.popFree;
        let freed = extraArea, used = 0;
        const popFloor = Math.max(0, ctx.popPlus * 0.05);
        const ratioFloor = ctx.ratio;

        const take = (n) => { added.push(n); used += n.area; hap += n.happiness; popFree += n.population; if (n.population > 0) popPlus += n.population; };
        const drop = (r) => { removed.push(r); freed += r.area; hap -= r.happiness; popFree -= r.population; if (r.population > 0) popPlus -= r.population; };

        // 5 minute producers: the best ones of city and pool together keep the count
        const fiveCity = ctx.candidates.filter(c => c.five);
        const fivePool = ctx.pool.filter(p => p.five);
        const fiveAll = fiveCity.map(c => ({ c: c })).concat(fivePool.map(p => ({ p: p })))
            .sort((a, b) => (b.c || b.p).score - (a.c || a.p).score);
        const fiveKeep = fiveAll.slice(0, fiveCity.length);
        for (const f of fiveKeep) if (f.p) take(f.p);
        for (const c of fiveCity) if (!fiveKeep.some(f => f.c === c)) drop(c);

        // everything else: weakest city buildings first, best pool buildings first
        const weak = ctx.candidates.filter(c => !c.five).sort((a, b) => a.score - b.score);
        const usedPool = new Set(fiveKeep.filter(f => f.p).map(f => f.p));
        for (const n of ctx.pool) {
            if (usedPool.has(n)) continue;
            if (popFree + n.population < popFloor) continue;
            while (freed < used + n.area && weak.length) {
                const r = weak[0];
                if (r.score > n.score - O.Margin) break;
                weak.shift();
                const nextPopPlus = popPlus - Math.max(r.population, 0);
                if (nextPopPlus > 0 && (hap - r.happiness) / nextPopPlus < ratioFloor) continue;
                if (popFree - r.population + n.population < popFloor) continue;
                drop(r);
            }
            if (freed >= used + n.area) take(n);
        }

        const value = (list) => list.reduce((s, x) => s + x.score * x.area, 0);
        return { removed: removed, added: added, gain: Math.round((value(added) - value(removed)) / 100) };
    },


    /**
     * Free tiles of a layout inside the unlocked areas.
     *
     * @param {Object[]} layout - Worker layout.
     * @returns {number} Free tiles.
     */
    freeTiles: (layout) => {
        const tiles = new Set();
        for (const a of Object.values(CityMap.Main.unlockedAreas)) {
            for (let x = a.x || 0; x < (a.x || 0) + a.width; x++) {
                for (let y = a.y || 0; y < (a.y || 0) + a.length; y++) tiles.add(x + ',' + y);
            }
        }
        for (const b of layout) {
            for (let x = b.x; x < b.x + b.width; x++) {
                for (let y = b.y; y < b.y + b.height; y++) tiles.delete(x + ',' + y);
            }
        }
        return tiles.size;
    },


    /**
     * Runs the optimization: plan, lay out, measure the leftover space and
     * adjust the amount of new buildings until the city is filled. The best
     * complete round wins.
     *
     * @param {Object[]} baseInput - Worker input of the current city (incl. a free space entry).
     * @returns {Promise<Object|null|undefined>} {result, plan} of the best round, null without a
     * usable round, undefined when the search was aborted.
     */
    calculate: async (baseInput) => {
        const O = CityBuilder.Optimizer;
        const ctx = O.prepare();
        // round one only swaps within the freed space and measures what is
        // left over, the following rounds fill that space
        let extra = 0;
        let best = null;
        let fits = null, overflows = null;
        O.Log = [];

        for (let round = 0; round < O.Rounds; round++) {
            const plan = O.swap(ctx, extra);
            const removedIds = new Set(plan.removed.map(r => r.id));
            const input = baseInput.filter(b => !removedIds.has(b.id));
            plan.added.forEach((n, i) => input.push({
                id: 'plan_' + i, asset_id: n.entityId, name: '★ ' + n.name, type: 'generic_building',
                x: 0, y: 0, width: n.w, height: n.h, street_level: n.street, chain_id: null, chain_pos: -1
            }));

            $('#CityBuilderBoxBody .loading-title').text(i18n('Boxes.CityBuilder.OptimizeRound').replace('__round__', round + 1).replace('__rounds__', O.Rounds));
            const result = await CityBuilder.runWorker(input, O.RoundBudget, (pct) => {
                const total = Math.round((round * 100 + pct) / O.Rounds);
                $('#CityBuilderBoxBody .calc-progress').text(total + '%');
                $('#CityBuilderBoxBody .loading-bar-fill').css('width', total + '%');
            });
            // aborted: undefined tells the caller to drop everything
            if (!result) return undefined;
            if (!result.success) return best;

            const v = result.variants[0];
            const free = O.freeTiles(v.layout);
            const missing = v.stats.missing;
            const missingArea = (v.unplaced || []).reduce((s, b) => s + b.width * b.height, 0);
            const rank = plan.gain - 5 * free;
            O.Log.push({ round: round + 1, extra: extra, missing: missing, free: free, gain: plan.gain, roads: v.stats.roads });
            if (!best || (missing === 0 && (best.missing > 0 || rank > best.rank)) || (best.missing > 0 && missing < best.missing)) {
                best = { result: result, plan: plan, missing: missing, rank: rank };
            }

            // bisection on the extra area: fits remembers the largest amount that
            // still fit, overflows the smallest that did not - the next round
            // tries the middle, before both are known it steps by the measured gap
            if (missing > 0) {
                overflows = overflows === null ? extra : Math.min(overflows, extra);
                extra = fits !== null ? Math.floor((fits + overflows) / 2) : extra - Math.max(4, missingArea);
            }
            else {
                if (free <= O.TargetFree) break;
                fits = fits === null ? extra : Math.max(fits, extra);
                extra = overflows !== null ? Math.floor((fits + overflows) / 2) : extra + Math.max(4, Math.floor((free - O.TargetFree) * 0.8));
            }
            if (fits !== null && overflows !== null && overflows - fits < 4) break;
        }
        return best;
    }
};
