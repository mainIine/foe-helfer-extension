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
 * Build progress on the map: compares the planned layout with the live city
 * (or the open reconstruction draft) and hatches the result.
 *
 * - green: a building of the planned type stands exactly on its planned spot
 * - orange: a building overlapping an open planned spot of its own type, but
 *   not exactly on it - drawn at its real position
 * - red: a building moved in the draft that stands on no planned spot of its
 *   type - drawn at its real position
 *
 * Copies are matched by type, not by entity id: the reconstruction menu hands
 * out any copy of a card, so the player cannot pick the planned one.
 * Streets are not checked. Only the main city is compared.
 */
CityBuilder.Progress = {

    /** @type {?Object<string, Object>} reconstruction draft by entity id, null outside the reconstruction mode */
    Draft: null,

    /** @type {?number} debounce timer of the redraw */
    Timer: null,


    /**
     * Redraws the open map once a burst of changes is over. The delay also
     * lets other handlers of the same message finish first.
     */
    refresh: () => {
        clearTimeout(CityBuilder.Progress.Timer);
        CityBuilder.Progress.Timer = setTimeout(() => {
            if (CityBuilder.Data?.length > 0 && $('#city-builder-canvas').length > 0) CityBuilder.Renderer.render();
        }, 250);
    },


    /**
     * Collects the buildings of the main city at their current position: the
     * draft position while rebuilding, otherwise the city map position.
     * Stored buildings, streets and off-grid entities are left out.
     *
     * @returns {Object[]} { id, cid, x, y, width, height, moved }
     */
    liveBuildings: () => {
        const draft = CityBuilder.Progress.Draft;
        const list = [];

        for (const e of Object.values(MainParser.CityMapData || {})) {
            if (!e || ['street', 'off_grid', 'outpost_ship', 'hub_main', 'hub_part', 'friends_tavern', 'impediment'].includes(e.type)) continue;

            // the game leaves out coordinates that are 0
            let x = parseInt(e.x || 0), y = parseInt(e.y || 0), moved = false;
            const d = draft?.[e.id];
            if (d) {
                if (!d.position) continue;
                const dx = parseInt(d.position.x || 0), dy = parseInt(d.position.y || 0);
                moved = dx !== x || dy !== y;
                x = dx;
                y = dy;
            }
            if (x < 0 || y < 0) continue;

            const size = CityMap.GetBuildingSize(e);
            list.push({ id: e.id, cid: e.cityentity_id, x, y, width: parseInt(size.xsize) || 1, height: parseInt(size.ysize) || 1, moved });
        }

        return list;
    },


    /**
     * Matches the planned buildings with the live ones. A planned spot is done
     * when a building of the same type stands exactly there (every live
     * building counts for one spot only).
     *
     * @returns {{done: Object[], near: Object[], wrong: Object[]}} planned entries done, live
     *          buildings overlapping an open spot of their type, moved buildings elsewhere
     */
    compare: () => {
        const planned = (CityBuilder.Data || []).filter(b => b.asset_id && b.type !== 'reserved' && !(b.type || '').includes('street'));
        const live = CityBuilder.Progress.liveBuildings();

        const at = new Map();
        for (const l of live) {
            const key = `${l.cid}@${l.x},${l.y}`;
            if (!at.has(key)) at.set(key, []);
            at.get(key).push(l);
        }

        const done = [], open = new Map(), used = new Set();
        for (const b of planned) {
            const match = at.get(`${b.asset_id}@${parseInt(b.x)},${parseInt(b.y)}`)?.pop();
            if (match) {
                done.push(b);
                used.add(match);
                continue;
            }
            // tiles of the open spots, to spot buildings standing almost right
            for (let x = 0; x < b.width; x++) {
                for (let y = 0; y < b.height; y++) {
                    const key = `${parseInt(b.x) + x},${parseInt(b.y) + y}`;
                    if (!open.has(key)) open.set(key, new Set());
                    open.get(key).add(b.asset_id);
                }
            }
        }

        const nearOwnSpot = (l) => {
            for (let x = 0; x < l.width; x++) {
                for (let y = 0; y < l.height; y++) {
                    if (open.get(`${l.x + x},${l.y + y}`)?.has(l.cid)) return true;
                }
            }
            return false;
        };

        const near = [], wrong = [];
        for (const l of live) {
            if (used.has(l)) continue;
            if (nearOwnSpot(l)) near.push(l);
            else if (l.moved) wrong.push(l);
        }

        return { done, near, wrong };
    },


    /**
     * Fills a rectangle with diagonal hatching and a solid border.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Object} b - Rectangle in tiles { x, y, width, height }.
     * @param {number} scale - Canvas pixels per map tile.
     * @param {string} color - Line color.
     */
    hatch: (ctx, b, scale, color) => {
        const x = parseInt(b.x) * scale, y = parseInt(b.y) * scale;
        const w = b.width * scale, h = b.height * scale;
        const step = Math.max(4, scale * 0.45);

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1.5, scale * 0.12);
        ctx.beginPath();
        for (let d = -h; d < w; d += step) {
            ctx.moveTo(x + d, y + h);
            ctx.lineTo(x + d + h, y);
        }
        ctx.stroke();

        ctx.lineWidth = Math.max(2, scale * 0.15);
        ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
        ctx.restore();
    }
};


// below the names, so labels stay readable on top of the hatching
CityBuilder.Renderer.registerLayer('progress', (v) => {
    if (!CityBuilder.Data?.length || (typeof ActiveMap !== 'undefined' && ActiveMap !== 'main')) return;

    const P = CityBuilder.Progress;
    const { done, near, wrong } = P.compare();

    for (const b of done) P.hatch(v.ctx, b, v.scale, 'rgba(70, 235, 70, 0.9)');
    for (const b of near) P.hatch(v.ctx, b, v.scale, 'rgba(255, 160, 0, 0.95)');
    for (const b of wrong) P.hatch(v.ctx, b, v.scale, 'rgba(255, 60, 60, 0.95)');
}, 'labels');


// keep the hatching in sync while rebuilding: the draft holds the positions
// of every building touched in the reconstruction mode
FoEproxy.addHandler('CityReconstructionService', 'getDraft', (data) => {
    CityBuilder.Progress.Draft = Object.fromEntries((data?.responseData || []).map(b => [b.entityId, b]));
    CityBuilder.Progress.refresh();
});

FoEproxy.addRequestHandler('CityReconstructionService', 'saveDraft', (data) => {
    const P = CityBuilder.Progress;
    if (!P.Draft) P.Draft = {};
    for (const b of data?.requestData?.[0] || []) P.Draft[b.entityId] = b;
    P.refresh();
});

// back in the city: the reconstruction mode is over
FoEproxy.addHandler('AutoAidService', 'getStates', () => {
    if (!CityBuilder.Progress.Draft) return;
    CityBuilder.Progress.Draft = null;
    CityBuilder.Progress.refresh();
});

FoEproxy.addFoeHelperHandler('CityMapUpdated', () => CityBuilder.Progress.refresh());
