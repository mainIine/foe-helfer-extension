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

{
    // tick off the plan while rebuilding: stored and placed buildings update
    // the open side box without a reload; a debounce collapses message bursts
    let refreshTimer = null;
    FoEproxy.addFoeHelperHandler('CityMapUpdated', () => {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => {
            if (CityBuilder.Planned && $('#CityBuilderUnplacedBox').length > 0) CityBuilder.showUnplaced();
        }, 250);
    });
}


let CityBuilder = {

    Data: [],
    Unplaced: [],
    Removed: [],
    Excluded: new Set(),
    Variants: [],
    VariantIndex: 0,
    Stats: null,
    RoadsBefore: 0,
    MapScale: 20,
    Worker: null,
    /** @type {function|null} stops the running worker and settles its promise */
    WorkerStop: null,
    PanX: 0,
    PanY: 0,
    EditMode: false,
    ShowNames: false,
    ShowTooltips: true,
    Reserve: '',
    ReserveOn: false,
    Optimize: false,
    /** @type {{removed: Object[], added: Object[], gain: number}|null} swap plan of the building optimization */
    Planned: null,
    /** @type {number|null} timestamp of the plan loaded from the storage */
    SavedAt: null,


    /**
     * Opens the builder. A plan saved for this world and map is shown right
     * away, so a city can be rebuilt over several days; otherwise the layout
     * is calculated.
     */
    init: async () => {
        if ($('#CityBuilderBox').length > 0) {
            HTML.CloseOpenBox('CityBuilderBox');
            if ($('#CityBuilderUnplacedBox').length > 0) HTML.CloseOpenBox('CityBuilderUnplacedBox');
            CityBuilder.stopWorker();
            return;
        }

        // reset all planning state on open
        CityBuilder.Data = [];
        CityBuilder.Removed = [];
        CityBuilder.Excluded = new Set();
        CityBuilder.Variants = [];
        CityBuilder.VariantIndex = 0;
        CityBuilder.EditMode = false;
        CityBuilder.Planned = null;
        CityBuilder.SavedAt = null;
        CityBuilder.Renderer.Highlight = null;
        CityBuilder.Interaction.Hover = null;

        HTML.AddCssFile('city-builder');

        HTML.Box({
            id: 'CityBuilderBox',
            title: i18n('Boxes.CityBuilder.Title'),
            auto_close: true,
            dragdrop: true,
            minimize: true,
            popout: () => CityBuilder.PopOut(),
            resize: true
        });

        const saved = CityBuilder.readPlan();
        if (saved) {
            CityBuilder.applyPlan(saved);
            return;
        }

        CityBuilder.showLoading();
        await CityBuilder.MergeData();
    },


    /**
     * Storage key of the saved plan: one plan per world and map.
     *
     * @returns {string} localStorage key.
     */
    planKey: () => 'CityBuilderPlan_' + ExtWorld + (ActiveMap && ActiveMap !== 'main' ? '_' + ActiveMap : ''),


    /**
     * Reads the saved plan of this world and map.
     *
     * @returns {Object|null} Saved plan or null.
     */
    readPlan: () => {
        try {
            const plan = JSON.parse(localStorage.getItem(CityBuilder.planKey()) || 'null');
            return (plan?.variants?.[0]?.layout?.length || plan?.variant?.layout?.length) ? plan : null;
        } catch (e) {
            return null;
        }
    },


    /**
     * Saves all layout variants with the shown one selected, together with the
     * removed and planned buildings, so the plan survives a reload, can be
     * rebuilt step by step and the variants stay switchable. If the storage is
     * too small for all of them, only the shown variant is kept.
     */
    savePlan: () => {
        if (!CityBuilder.Variants[CityBuilder.VariantIndex]) return;

        // the per-run search log is only needed right after a calculation
        const strip = (v) => ({ layout: v.layout, unplaced: v.unplaced || [], stats: Object.assign({}, v.stats, { tried: undefined }) });
        const plan = {
            version: 2,
            savedAt: Date.now(),
            variants: CityBuilder.Variants.map(strip),
            variantIndex: CityBuilder.VariantIndex,
            removed: CityBuilder.Removed,
            planned: CityBuilder.Planned,
            roadsBefore: CityBuilder.RoadsBefore
        };
        try {
            try {
                localStorage.setItem(CityBuilder.planKey(), JSON.stringify(plan));
            } catch (e) {
                plan.variants = [plan.variants[plan.variantIndex]];
                plan.variantIndex = 0;
                localStorage.setItem(CityBuilder.planKey(), JSON.stringify(plan));
            }
            CityBuilder.SavedAt = plan.savedAt;
            HTML.ShowToastMsg({
                head: i18n('Boxes.CityBuilder.Title'),
                text: i18n('Boxes.CityBuilder.PlanSaved'),
                type: 'success',
                hideAfter: 4000
            });
        } catch (e) {
            console.error('CityBuilder: plan could not be saved', e);
        }
        CityBuilder.showMap();
    },


    /**
     * Shows a saved plan instead of calculating a new layout.
     *
     * @param {Object} plan - Plan from readPlan().
     */
    applyPlan: (plan) => {
        CityBuilder.Variants = plan.variants || [plan.variant];
        CityBuilder.Removed = plan.removed || [];
        CityBuilder.Excluded = new Set(CityBuilder.Removed.map(b => b.id));
        CityBuilder.Planned = plan.planned || null;
        CityBuilder.RoadsBefore = plan.roadsBefore || 0;
        CityBuilder.SavedAt = plan.savedAt || null;
        CityBuilder.applyVariant(Math.min(plan.variantIndex || 0, CityBuilder.Variants.length - 1));
    },


    /**
     * Lets the user pick a plan file and shows it as template. The file must
     * be picked by a click, the browser allows no other way.
     */
    importFile: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                let plan = null;
                try {
                    plan = CityBuilder.planFromFile(JSON.parse(reader.result));
                } catch (e) {
                    console.error('CityBuilder: plan file could not be read', e);
                }
                if (!plan) {
                    HTML.ShowToastMsg({ head: i18n('Boxes.CityBuilder.Title'), text: i18n('Boxes.CityBuilder.ImportFailed'), type: 'error', hideAfter: 6000 });
                    return;
                }
                CityBuilder.applyPlan(plan);
                HTML.ShowToastMsg({ head: i18n('Boxes.CityBuilder.Title'), text: i18n('Boxes.CityBuilder.ImportDone'), type: 'success', hideAfter: 6000 });
            };
            reader.readAsText(file);
        });
        input.click();
    },


    /**
     * Turns an imported file into a plan. Accepts building lists like the ones
     * of the city planner on foe-helper.com - an array or an object with
     * buildings/entities/data - of objects with cityentity_id, x and y
     * (isUsed === false means not placed).
     * The template is compared with the live city: buildings the city lacks and
     * buildings the template does not use are listed in the side box.
     *
     * @param {Object|Object[]} data - Parsed file content.
     * @returns {Object|null} Plan for applyPlan() or null if nothing usable was found.
     */
    planFromFile: (data) => {
        let list = Array.isArray(data) ? data : (data?.buildings || data?.entities || data?.data || null);
        if (typeof list === 'string') list = JSON.parse(list);
        if (!Array.isArray(list)) return null;

        const CE = MainParser.CityEntities;
        const layout = [];
        list.forEach((b, i) => {
            if (!b || b.isUsed === false) return;
            // the game leaves out coordinates that are 0
            const x = parseInt(b.x ?? 0), y = parseInt(b.y ?? 0);
            if (isNaN(x) || isNaN(y)) return;

            const entityId = b.cityentity_id || null;
            const meta = entityId ? CE[entityId] : null;
            const isStreet = b.type === 'street' || meta?.type === 'street';
            const size = meta?.components?.AllAge?.placement?.size;
            const street = b.street_level ?? meta?.components?.AllAge?.streetConnectionRequirement?.requiredLevel ?? 0;
            layout.push({
                id: 'tpl_' + i,
                asset_id: isStreet ? undefined : entityId,
                name: isStreet ? 'Road' : (meta?.name || b.name || entityId || '?'),
                type: isStreet ? 'street' : (b.type || meta?.type || 'generic_building'),
                x: x,
                y: y,
                width: parseInt(size?.x || b.width) || 1,
                height: parseInt(size?.y || b.height || b.length) || 1,
                street_level: isStreet ? 0 : street,
                // two-lane road pieces are the 2x2 ones
                level: isStreet ? (b.level || ((parseInt(size?.x || b.width) || 1) >= 2 ? 2 : 1)) : undefined
            });
        });
        if (!layout.some(b => b.type !== 'street')) return null;

        // compare with the live city: what is missing, what is left over
        const count = (ids) => ids.reduce((m, id) => { m[id] = (m[id] || 0) + 1; return m; }, {});
        const want = count(layout.filter(b => b.asset_id && b.type !== 'reserved').map(b => b.asset_id));
        const city = Object.values(MainParser.CityMapData).filter(i => i && (i.x || 0) >= 0 && (i.y || 0) >= 0
            && !['street', 'off_grid', 'hub_main', 'hub_part'].includes(i.type));
        const have = count(city.map(i => i.cityentity_id));
        const entry = (id, extra) => {
            const size = CE[id]?.components?.AllAge?.placement?.size || {};
            return Object.assign({ entityId: id, name: CE[id]?.name || id, w: parseInt(size.x) || 1, h: parseInt(size.y) || 1, score: '' }, extra);
        };
        const added = [], removed = [];
        for (const [id, n] of Object.entries(want)) {
            for (let i = (have[id] || 0); i < n; i++) added.push(entry(id));
        }

        // star the copies the city lacks, like the new buildings of the optimization
        const lacking = count(added.map(a => a.entityId));
        for (let i = layout.length - 1; i >= 0; i--) {
            const b = layout[i];
            if (lacking[b.asset_id] > 0) {
                b.name = '★ ' + b.name;
                lacking[b.asset_id]--;
            }
        }
        const left = Object.assign({}, want);
        for (const inst of city) {
            if (left[inst.cityentity_id] > 0) left[inst.cityentity_id]--;
            else removed.push(entry(inst.cityentity_id, { id: inst.id }));
        }

        const tiles = (list) => list.reduce((s, b) => s + b.width * b.height, 0);
        const liveRoads = Object.values(MainParser.CityMapData).filter(i => i?.type === 'street').map(i => {
            const size = CE[i.cityentity_id]?.components?.AllAge?.placement?.size || {};
            return { width: parseInt(size.x) || 1, height: parseInt(size.y) || 1 };
        });
        return {
            version: 1,
            savedAt: null,
            variant: { layout: layout, unplaced: [], stats: { roads: tiles(layout.filter(b => b.type === 'street')), missing: 0 } },
            removed: [],
            planned: { source: 'template', removed: removed, added: added, gain: null, known: Object.keys(MainParser.CityMapData) },
            roadsBefore: tiles(liveRoads)
        };
    },


    /**
     * Deletes the saved plan of this world and map.
     */
    deletePlan: () => {
        localStorage.removeItem(CityBuilder.planKey());
        CityBuilder.SavedAt = null;
        CityBuilder.showMap();
    },


    /**
     * Downloads the plan as a top-down picture: every building with its name,
     * roads dark, the free space green - handy as a template next to the game.
     */
    exportImage: () => {
        const layout = CityBuilder.Data;
        if (!layout.length) return;

        const cell = 24;
        let maxX = 0, maxY = 0;
        for (const a of Object.values(CityMap.Main.unlockedAreas)) {
            maxX = Math.max(maxX, (a.x || 0) + a.width);
            maxY = Math.max(maxY, (a.y || 0) + a.length);
        }
        const canvas = document.createElement('canvas');
        canvas.width = maxX * cell;
        canvas.height = maxY * cell;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1b1b1b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // buildable area
        ctx.fillStyle = '#3d5a2a';
        for (const a of Object.values(CityMap.Main.unlockedAreas)) {
            ctx.fillRect((a.x || 0) * cell, (a.y || 0) * cell, a.width * cell, a.length * cell);
        }

        const cssCache = new Map();
        for (const b of layout) {
            const isStreet = (b.type || '').includes('street') || b.name === 'Road';
            ctx.fillStyle = CityBuilder.Renderer.buildingColor(b, cssCache);
            ctx.fillRect(b.x * cell, b.y * cell, b.width * cell, b.height * cell);
            if (isStreet) continue;
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(b.x * cell + 0.5, b.y * cell + 0.5, b.width * cell - 1, b.height * cell - 1);

            // name, wrapped into the footprint
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px sans-serif';
            ctx.textBaseline = 'top';
            const maxW = b.width * cell - 4;
            const lines = [];
            let line = '';
            for (const word of (b.name || '').split(' ')) {
                const test = line ? line + ' ' + word : word;
                if (ctx.measureText(test).width > maxW && line) {
                    lines.push(line);
                    line = word;
                } else {
                    line = test;
                }
            }
            if (line) lines.push(line);
            const maxLines = Math.max(1, Math.floor((b.height * cell - 4) / 11));
            lines.slice(0, maxLines).forEach((l, i) => ctx.fillText(l, b.x * cell + 2, b.y * cell + 2 + i * 11, maxW));
        }

        canvas.toBlob((blob) => download(blob, 'city-plan-' + ExtWorld + '-' + moment().format('YYMMDD-HHmm') + '.png', 'image/png'), 'image/png');
    },


    /**
     * Shows the loading panel with the progress bar fed by the worker's
     * percentage pings - solid background so it stays readable on top of
     * the live city. Also used when the layout is recalculated.
     */
    showLoading: () => {
        $('#CityBuilderBoxBody').html(`<div class="city-builder-loading">
            <div class="loading-title">${i18n('Boxes.CityBuilder.Calculating') || 'Generiere Stadtlayout...'}</div>
            <div class="loading-bar"><div class="loading-bar-fill"></div></div>
            <div class="calc-progress">0%</div>
        </div>`);
    },


    /**
     * Recalculates the layout with the current city data. Buildings the user
     * removed from the map stay excluded and are not planned in again until
     * they are restored from the unplaced-buildings box. Works in the game
     * overlay and in the pop-out window.
     */
    Recalculate: async () => {
        CityBuilder.Renderer.Highlight = null;
        CityBuilder.Interaction.Hover = null;
        if (typeof Tooltips !== 'undefined') Tooltips.deactivate();

        CityBuilder.SavedAt = null;
        CityBuilder.showLoading();
        await CityBuilder.MergeData();
    },


    /**
     * Switches the map to one of the computed layout variants. The variants
     * come pre-ranked from the worker; switching is instant because every
     * layout was already calculated. Buildings the user removed stay hidden
     * in every variant.
     *
     * @param {number} idx - Index into CityBuilder.Variants.
     */
    applyVariant: (idx) => {
        const v = CityBuilder.Variants[idx];
        if (!v) return;

        CityBuilder.VariantIndex = idx;
        CityBuilder.Data = v.layout.filter(b => !(b.id !== undefined && b.id !== null && CityBuilder.Excluded.has(b.id)));
        CityBuilder.Unplaced = v.unplaced || [];
        CityBuilder.Stats = v.stats || null;

        CityBuilder.Renderer.Highlight = null;
        CityBuilder.Interaction.Hover = null;
        if (typeof Tooltips !== 'undefined') Tooltips.deactivate();

        CityBuilder.showMap();
    },


    /**
     * Moves the box into its own pop-up window and centers the map there
     */
    PopOut: () => {
        Popup.PopOut('CityBuilderBox', {
            width: 1100,
            height: 580,
            onClose: () => {
                // back in the game: restore the overlay transform from the CSS
                const wrapper = $('#CityBuilderBoxBody .map-grid-wrapper')[0];
                if (wrapper) wrapper.style.transform = '';
            }
        });

        // the box is adopted by the pop-up asynchronously - center the map once it arrived
        let tries = 0;
        const waitForAdopt = setInterval(() => {
            const wrapper = $('#CityBuilderBoxBody .map-grid-wrapper')[0];
            if (wrapper && wrapper.ownerDocument.body.classList.contains('foe-helper-popup')) {
                clearInterval(waitForAdopt);
                CityBuilder.PanX = 0;
                CityBuilder.PanY = 0;
                CityBuilder.fitPopout();
                wrapper.ownerDocument.defaultView.addEventListener('resize', CityBuilder.fitPopout);
                CityBuilder.bindPopoutPan(wrapper.ownerDocument);
            }
            else if (++tries > 150) {
                clearInterval(waitForAdopt);
            }
        }, 100);
    },


    /**
     * Lets the user pan the map in the pop-up window by dragging it with the
     * mouse. The offsets feed into the centering math of fitPopout.
     *
     * @param {Document} doc - The pop-up window's document.
     */
    bindPopoutPan: (doc) => {
        const surface = doc.getElementById('CityBuilderBoxBody');
        if (!surface || surface.dataset.panBound) return;
        surface.dataset.panBound = '1';
        surface.style.cursor = 'grab';

        let dragging = false, lastX = 0, lastY = 0;

        surface.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            // leave the zoom slider and other controls alone
            if (e.target.closest('.optimized-city-controls')) return;
            dragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            surface.style.cursor = 'grabbing';
            e.preventDefault();
        });
        doc.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            CityBuilder.PanX += e.clientX - lastX;
            CityBuilder.PanY += e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            CityBuilder.fitPopout();
        });
        doc.addEventListener('mouseup', () => {
            dragging = false;
            surface.style.cursor = 'grab';
        });
    },


    /**
     * Centers the skewed map inside the pop-up window. The default transform
     * constants align the map with the live city behind the box instead, which
     * would leave most of the pop-up empty.
     */
    fitPopout: () => {
        const wrapper = $('#CityBuilderBoxBody .map-grid-wrapper')[0];
        if (!wrapper) return;

        if (!wrapper.ownerDocument.body.classList.contains('foe-helper-popup')) {
            wrapper.style.transform = '';
            return;
        }

        const canvas = wrapper.ownerDocument.getElementById('city-builder-canvas');
        const body = wrapper.parentElement;
        if (!canvas || !body) return;

        const scale = parseFloat(wrapper.style.getPropertyValue('--scale')) || 100;
        const sx = scale / 100;
        const sy = 0.25 * scale / 100;
        const tanX = Math.tan(-63.5 * Math.PI / 180);
        const tanY = Math.tan(14 * Math.PI / 180);

        // linear part of skewX(-63.5deg) skewY(14deg) scale(sx, sy), origin 0 0
        const a = (1 + tanX * tanY) * sx, c = tanX * sy;
        const b = tanY * sx, d = sy;

        // bounding box of the transformed canvas corners
        const xs = [], ys = [];
        for (const [px, py] of [[0, 0], [canvas.width, 0], [0, canvas.height], [canvas.width, canvas.height]]) {
            xs.push(a * px + c * py);
            ys.push(b * px + d * py);
        }
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);

        // the translate() runs before the linear part - solve for the offset that
        // centers the map, shifted by the user's drag panning
        const cx = (body.clientWidth - (maxX - minX)) / 2 - minX + CityBuilder.PanX;
        const cy = (body.clientHeight - (maxY - minY)) / 2 - minY + CityBuilder.PanY;
        const det = a * d - b * c;
        const tx = (d * cx - c * cy) / det;
        const ty = (a * cy - b * cx) / det;

        wrapper.style.transform = `skewX(-63.5deg) skewY(14deg) scale(${sx}, ${sy}) translate(${tx}px, ${ty}px)`;
    },


    /**
     * Displays the City Builder map within the container and applies interactive controls.
     *
     * - Retrieves and applies user preferences for scale, opacity and the names option from local storage.
     * - If the data for buildings (`CityBuilder.Data`) is empty, displays a "No Data" message.
     * - Builds the control bar (zoom, opacity, names toggle, remove mode, recalculate) and the map canvas.
     * - Renders the map through the modular canvas renderer and binds the pointer interaction.
     * - All controls are bound directly on their elements, so they keep working in the pop-out window,
     *   including after a recalculation replaced the box content there.
     */
    showMap: () => {

        let storedUnit = parseInt(localStorage.getItem('CityBuilderScale') || 80);
        let storedOpacity = parseFloat(localStorage.getItem('CityBuilderOpacity') || 0.9);
        CityBuilder.ShowNames = localStorage.getItem('CityBuilderShowNames') === '1';
        CityBuilder.ShowTooltips = localStorage.getItem('CityBuilderTooltips') !== '0';
        CityBuilder.Reserve = localStorage.getItem('CityBuilderReserve') || '5x5';
        CityBuilder.ReserveOn = localStorage.getItem('CityBuilderReserveOn') === '1';
        CityBuilder.Optimize = localStorage.getItem('CityBuilderOptimize') === '1';

        if (!CityBuilder.Data || CityBuilder.Data.length === 0) {
            $('#CityBuilderBoxBody').html('<div style="padding:20px;">' + i18n('Boxes.CityBuilder.NoData') + '</div>');
            return;
        }

        let h = [];

        // Zoom Steuerungen oben rechts
        h.push(`<div class="optimized-city-controls">`);
        h.push(`<div class="controls-row">`);

        // switch between the best computed layout variants, instant because
        // every one of them was already calculated by the worker
        if (CityBuilder.Variants.length > 1) {
            const strategyNames = {
                'bands': i18n('Boxes.CityBuilder.StrategyBands'),
                'bands-vertical': i18n('Boxes.CityBuilder.StrategyBandsVertical'),
                'organic': i18n('Boxes.CityBuilder.StrategyOrganic')
            };
            const strategyTag = CityBuilder.Stats && strategyNames[CityBuilder.Stats.strategy]
                ? ` &middot; ${strategyNames[CityBuilder.Stats.strategy]}`
                : '';
            h.push(`<span class="variant-control" title="${i18n('Boxes.CityBuilder.VariantHint')}">`);
            h.push(`<button class="btn variant-prev">&lsaquo;</button>`);
            h.push(`<span class="variant-label">${i18n('Boxes.CityBuilder.Variant')} ${CityBuilder.VariantIndex + 1}/${CityBuilder.Variants.length}${strategyTag}</span>`);
            h.push(`<button class="btn variant-next">&rsaquo;</button>`);
            h.push(`</span>`);
        }

        h.push(`<span>${i18n('Boxes.CityBuilder.Zoom')}: </span>`);
        h.push(`<input type="range" class="scale-slider" name="optimizedcityscale" min="50" max="200" step="1" value="${storedUnit}" />`);
        h.push(`<span class="scale-value">${storedUnit}</span>`);

        // opacity only matters for the in-game overlay - hidden in the pop-up via CSS
        h.push(`<span class="opacity-control">`);
        h.push(`<span style="margin-left:8px">${i18n('Boxes.CityBuilder.Opacity')}: </span>`);
        h.push(`<input type="range" class="opacity-slider" name="opacity" min="0.1" max="1" step="0.05" value="${storedOpacity}" />`);
        h.push(`</span>`);

        // options: building names on the map, hover tooltips, click-to-remove mode, recalculation
        h.push(`<label class="control-toggle"><input type="checkbox" class="names-toggle"${CityBuilder.ShowNames ? ' checked' : ''} />${i18n('Boxes.CityBuilder.ShowNames')}</label>`);
        h.push(`<label class="control-toggle" title="${i18n('Boxes.CityBuilder.ShowTooltipsHint')}"><input type="checkbox" class="tooltips-toggle"${CityBuilder.ShowTooltips ? ' checked' : ''} />${i18n('Boxes.CityBuilder.ShowTooltips')}</label>`);
        h.push(`<label class="control-toggle" title="${i18n('Boxes.CityBuilder.EditModeHint')}"><input type="checkbox" class="edit-toggle"${CityBuilder.EditMode ? ' checked' : ''} />${i18n('Boxes.CityBuilder.EditMode')}</label>`);
        h.push(`</div>`);

        // second row: planning options, recalculation and the saved plan
        h.push(`<div class="controls-row">`);
        h.push(`<label class="control-toggle" title="${i18n('Boxes.CityBuilder.ReserveHint')}"><input type="checkbox" class="reserve-toggle"${CityBuilder.ReserveOn ? ' checked' : ''} />${i18n('Boxes.CityBuilder.Reserve')}</label>`);
        h.push(`<input type="text" class="reserve-input" size="3" placeholder="5x5" value="${CityBuilder.Reserve}"${CityBuilder.ReserveOn ? '' : ' disabled'} />`);
        h.push(`<label class="control-toggle" title="${i18n('Boxes.CityBuilder.OptimizeHint')}"><input type="checkbox" class="optimize-toggle"${CityBuilder.Optimize ? ' checked' : ''} />${i18n('Boxes.CityBuilder.Optimize')}</label>`);
        h.push(`<button class="btn recalc-btn">${i18n('Boxes.CityBuilder.Recalculate')}</button>`);
        h.push(`<button class="btn save-btn" title="${i18n('Boxes.CityBuilder.SavePlanHint')}">${i18n('Boxes.CityBuilder.SavePlan')}</button>`);
        h.push(`<button class="btn image-btn" title="${i18n('Boxes.CityBuilder.ExportImageHint')}">${i18n('Boxes.CityBuilder.ExportImage')}</button>`);
        h.push(`<button class="btn import-btn" title="${i18n('Boxes.CityBuilder.ImportFileHint')}">${i18n('Boxes.CityBuilder.ImportFile')}</button>`);
        if (CityBuilder.SavedAt) {
            h.push(`<span class="saved-plan">${i18n('Boxes.CityBuilder.SavedAt')} ${moment(CityBuilder.SavedAt).format('DD.MM.YY HH:mm')}`);
            h.push(`<span class="delete-plan" title="${i18n('Boxes.CityBuilder.DeletePlan')}">&times;</span></span>`);
        }
        h.push(`</div>`);

        h.push(`</div>`);

        // road balance top-left: tiles in the live city vs the planned layout
        if (CityBuilder.Stats && CityBuilder.RoadsBefore > 0) {
            const before = CityBuilder.RoadsBefore;
            const after = CityBuilder.Stats.roads;
            const pct = Math.round((1 - after / before) * 100);
            const pctClass = pct >= 0 ? 'saving' : 'extra';
            h.push(`<div class="city-builder-stats">`);
            h.push(`<div>${i18n('Boxes.CityBuilder.RoadsBefore')}: <b>${before}</b></div>`);
            h.push(`<div>${i18n('Boxes.CityBuilder.RoadsAfter')}: <b>${after}</b></div>`);
            h.push(`<div>${i18n('Boxes.CityBuilder.Savings')}: <b class="${pctClass}">${pct} %</b></div>`);
            if (typeof CityBuilder.Planned?.gain === 'number') {
                const gain = CityBuilder.Planned.gain;
                h.push(`<div>${i18n('Boxes.CityBuilder.RatingGain')}: <b class="${gain >= 0 ? 'saving' : 'extra'}">${gain >= 0 ? '+' : ''}${gain}</b></div>`);
            }
            h.push(`</div>`);
        }

        h.push(`<div class="map-grid-wrapper" style="--scale:${storedUnit}; opacity:${storedOpacity};">`);

        // the whole city is drawn onto this canvas, tooltips and clicks
        // included - there is no HTML building layer anymore
        h.push(`<canvas id="city-builder-canvas" class="map-grid-canvas${CityBuilder.EditMode ? ' edit-mode' : ''}"></canvas>`);

        h.push(`</div>`);

        $('#CityBuilderBoxBody').html(h.join('')).promise().done(function() {

            CityBuilder.Renderer.render();
            CityBuilder.Interaction.bind($('#city-builder-canvas')[0]);
            CityBuilder.fitPopout();

            $('.scale-slider').on('input', function() {
                let unit = parseFloat($(this).val());
                localStorage.setItem('CityBuilderScale', unit);
                $('#CityBuilderBoxBody .map-grid-wrapper').css('--scale', unit);
                $('.scale-value').text(unit);
                CityBuilder.fitPopout();
            });

            $('.opacity-slider').on('input', function() {
                let val = $(this).val();
                localStorage.setItem('CityBuilderOpacity', val);
                $('#CityBuilderBoxBody .map-grid-wrapper').css('opacity', val);
            });

            $('.names-toggle').on('change', function() {
                CityBuilder.ShowNames = this.checked;
                localStorage.setItem('CityBuilderShowNames', this.checked ? '1' : '0');
                CityBuilder.Renderer.render();
            });

            $('.tooltips-toggle').on('change', function() {
                CityBuilder.ShowTooltips = this.checked;
                localStorage.setItem('CityBuilderTooltips', this.checked ? '1' : '0');
                if (!this.checked && typeof Tooltips !== 'undefined') Tooltips.deactivate();
            });

            $('.edit-toggle').on('change', function() {
                CityBuilder.EditMode = this.checked;
                $('#city-builder-canvas').toggleClass('edit-mode', this.checked);
                // recolor an already active highlight to the new mode
                CityBuilder.Interaction.setHighlight(CityBuilder.Interaction.Hover);
            });

            // free space and optimization take effect with the next calculation
            $('.reserve-toggle').on('change', function() {
                CityBuilder.ReserveOn = this.checked;
                localStorage.setItem('CityBuilderReserveOn', this.checked ? '1' : '0');
                $('#CityBuilderBoxBody .reserve-input').prop('disabled', !this.checked);
            });

            $('.reserve-input').on('change', function() {
                const size = CityBuilder.parseReserve(this.value);
                CityBuilder.Reserve = size ? size.join('x') : '5x5';
                this.value = CityBuilder.Reserve;
                localStorage.setItem('CityBuilderReserve', CityBuilder.Reserve);
            });

            $('.optimize-toggle').on('change', function() {
                CityBuilder.Optimize = this.checked;
                localStorage.setItem('CityBuilderOptimize', this.checked ? '1' : '0');
            });

            $('.recalc-btn').on('click', () => CityBuilder.Recalculate());
            $('.save-btn').on('click', () => CityBuilder.savePlan());
            $('.image-btn').on('click', () => CityBuilder.exportImage());
            $('.import-btn').on('click', () => CityBuilder.importFile());
            $('.delete-plan').on('click', () => CityBuilder.deletePlan());

            $('.variant-prev').on('click', () => {
                const n = CityBuilder.Variants.length;
                CityBuilder.applyVariant((CityBuilder.VariantIndex - 1 + n) % n);
            });
            $('.variant-next').on('click', () => {
                const n = CityBuilder.Variants.length;
                CityBuilder.applyVariant((CityBuilder.VariantIndex + 1) % n);
            });

            CityBuilder.showUnplaced();
        });
    },


    /**
     * Lists the buildings that are not part of the current layout in an own
     * draggable box: those the optimizer could not fit, and those the user
     * removed from the map by click. Removed buildings can be restored for
     * the next recalculation from here.
     */
    showUnplaced: () => {
        // finish a possibly still-running fade of the box synchronously:
        // HTML.CloseOpenBox removes asynchronously, and while old and new box
        // coexist under the same id, content and drag binding would go to the
        // dying element - the visible box stayed empty and undraggable
        $('#CityBuilderUnplacedBox').stop(true, true);

        const hasUnplaced = CityBuilder.Unplaced && CityBuilder.Unplaced.length > 0;
        const hasRemoved = CityBuilder.Removed && CityBuilder.Removed.length > 0;
        const planned = CityBuilder.Planned;
        const hasPlanned = planned && (planned.removed.length > 0 || planned.added.length > 0);

        if (!hasUnplaced && !hasRemoved && !hasPlanned) {
            if ($('#CityBuilderUnplacedBox').length > 0) HTML.CloseOpenBox('CityBuilderUnplacedBox');
            return;
        }

        // create the box once and reuse it afterward - updates only replace
        // the body content, so position and drag binding survive
        if ($('#CityBuilderUnplacedBox').length === 0) {
            HTML.Box({
                id: 'CityBuilderUnplacedBox',
                title: i18n('Boxes.CityBuilder.Unplaced'),
                auto_close: true,
                dragdrop: true,
                minimize: true,
                resize: true
            });

            // capped to the viewport until the user drags an own size
            const box = $('#CityBuilderUnplacedBox');
            if (localStorage.getItem('CityBuilderUnplacedBoxSize')) box.addClass('sized');
            box.on('resizestart', () => box.addClass('sized'));
        }

        // group identical buildings: name + size -> count (+ instance ids, done
        // copies); groups with open copies come first
        const groupList = (list) => {
            const groups = new Map();
            for (const b of list) {
                const key = b.name + '|' + b.width + 'x' + b.height;
                if (!groups.has(key)) groups.set(key, { ...b, count: 0, done: 0, ids: [] });
                const g = groups.get(key);
                g.count++;
                if (b.done) g.done++;
                g.ids.push(b.id);
            }
            const finished = (g) => g.done === g.count ? 1 : 0;
            return [...groups.values()].sort((a, b) => finished(a) - finished(b) || a.name.localeCompare(b.name));
        };

        let h = [];

        if (hasUnplaced) {
            h.push(`<div class="unplaced-hint">${i18n('Boxes.CityBuilder.UnplacedHint')}</div>`);
            h.push('<table class="foe-table unplaced-table"><tbody>');
            for (const g of groupList(CityBuilder.Unplaced)) {
                h.push('<tr>');
                h.push(`<td>${g.count}&times;</td>`);
                h.push(`<td class="fh-tooltip" data-callback_tt="Tooltips.buildingTT" data-meta_id="${g.asset_id}">${g.name}</td>`);
                h.push(`<td class="text-right">${g.height}x${g.width}</td>`);
                h.push('</tr>');
            }
            h.push('</tbody></table>');
        }

        if (hasRemoved) {
            h.push(`<div class="unplaced-hint">${i18n('Boxes.CityBuilder.RemovedHint')}</div>`);
            h.push('<table class="foe-table unplaced-table"><tbody>');
            for (const g of groupList(CityBuilder.Removed)) {
                h.push('<tr>');
                h.push(`<td>${g.count}&times;</td>`);
                h.push(`<td class="fh-tooltip" data-callback_tt="Tooltips.buildingTT" data-meta_id="${g.asset_id}">${g.name}</td>`);
                h.push(`<td class="text-right">${g.height}x${g.width}</td>`);
                h.push(`<td class="text-right"><span class="removed-restore" title="${i18n('Boxes.CityBuilder.Restore')}" data-restore_id="${g.ids[g.ids.length - 1]}">&#8630;</span></td>`);
                h.push('</tr>');
            }
            h.push('</tbody></table>');
        }

        // building optimization: what leaves the city and what comes from the inventory
        if (hasPlanned) {
            const progress = CityBuilder.planProgress();
            const plannedList = (list, hint, isDone) => {
                if (!list.length) return;
                const asLayout = list.map(b => ({ id: b.id, asset_id: b.entityId, name: b.name, width: b.w, height: b.h, score: b.score, done: isDone(b) }));
                const finished = asLayout.filter(b => b.done).length;
                h.push(`<div class="unplaced-hint">${hint}${finished ? ` <span class="plan-progress">&#10003; ${finished}/${asLayout.length}</span>` : ''}</div>`);
                h.push('<table class="foe-table unplaced-table"><tbody>');
                for (const g of groupList(asLayout)) {
                    const open = g.count - g.done;
                    h.push(`<tr${open ? '' : ' class="done"'}>`);
                    h.push(`<td>${open ? open + '&times;' : '&#10003;'}${open && g.done ? ` <span class="done-count">&#10003;${g.done}</span>` : ''}</td>`);
                    h.push(`<td class="fh-tooltip" data-callback_tt="Tooltips.buildingTT" data-meta_id="${g.asset_id}">${g.name}</td>`);
                    h.push(`<td class="text-right">${g.height}x${g.width}</td>`);
                    h.push(`<td class="text-right">${g.score}</td>`);
                    h.push('</tr>');
                }
                h.push('</tbody></table>');
            };
            const template = planned.source === 'template';
            plannedList(planned.removed, i18n(template ? 'Boxes.CityBuilder.TemplateRemoved' : 'Boxes.CityBuilder.PlannedRemoved'), progress.removed);
            plannedList(planned.added, i18n(template ? 'Boxes.CityBuilder.TemplateAdded' : 'Boxes.CityBuilder.PlannedAdded'), progress.added);
        }

        $('#CityBuilderUnplacedBoxBody').html(h.join(''));

        // restore one instance of the group for the next recalculation
        $('#CityBuilderUnplacedBoxBody .removed-restore').on('click', function() {
            CityBuilder.restoreRemoved($(this).data('restore_id'));
        });
    },


    /**
     * Compares the planned swaps with the live city: a building to remove is
     * done once it left the city (stored or sold), a building to add once a
     * copy appeared that was not in the city when the plan was made.
     *
     * @returns {{removed: function(Object): boolean, added: function(Object): boolean}}
     *          Checks per plan entry; `added` consumes one new copy per call.
     */
    planProgress: () => {
        const planned = CityBuilder.Planned;
        const city = MainParser.CityMapData || {};

        // plans saved before the ids were stored: the layout and the removals
        // hold every building id of that time (template layouts have none)
        let known = planned.known;
        if (!known && planned.source !== 'template') {
            known = [...CityBuilder.Variants.flatMap(v => v.layout), ...planned.removed, ...CityBuilder.Removed].map(b => b.id);
        }

        const placed = {};
        if (known) {
            const before = new Set(known.map(String));
            for (const b of Object.values(city)) {
                if (b && !before.has(String(b.id))) placed[b.cityentity_id] = (placed[b.cityentity_id] || 0) + 1;
            }
        }

        return {
            removed: (b) => b.id !== undefined && !city[b.id],
            added: (b) => {
                if (!(placed[b.entityId] > 0)) return false;
                placed[b.entityId]--;
                return true;
            }
        };
    },


    /**
     * Takes a removed building off the exclusion list again. It reappears on
     * the map with the next recalculation, not immediately - its old spot may
     * already be taken by the current layout.
     *
     * @param {number|string} id - Map instance id of the removed building.
     */
    restoreRemoved: (id) => {
        const idx = CityBuilder.Removed.findIndex(b => String(b.id) === String(id));
        if (idx < 0) return;

        CityBuilder.Excluded.delete(CityBuilder.Removed[idx].id);
        CityBuilder.Removed.splice(idx, 1);
        CityBuilder.showUnplaced();
    },


    /**
     * Parses the size of the area to keep free, e.g. "5x5", "4x6" or "5".
     *
     * @param {string} value - User input.
     * @returns {number[]|null} [width, height] or null if empty or invalid.
     */
    parseReserve: (value) => {
        const m = String(value || '').trim().match(/^(\d{1,2})(?:\s*[x×*]\s*(\d{1,2}))?$/i);
        if (!m) return null;
        const w = parseInt(m[1]), h = parseInt(m[2] || m[1]);
        return w > 0 && h > 0 ? [w, h] : null;
    },


    /**
     * Asynchronously merges and processes city map data and entities to construct
     * a dataset for further city calculations in the CityBuilder module.
     *
     * This function dynamically identifies the correct map data based on the
     * active map and validates the existence and types of the required data
     * structures. It ensures invalid or missing data is logged and prevents
     * further processing if encountered.
     *
     * Process:
     * - Iterates through the city map data entries.
     * - Filters out unnecessary or invalid entries such as streets, off-grid, or
     *   out-of-bound instances.
     * - Calculates and validates building dimensions (width, height) and positions
     *   (x, y).
     * - Determines requirements such as street connection levels based on meta
     *   information and building type.
     * - Assembles the processed data into a structure compatible with
     *   CityBuilder.CalculateNewCity.
     *
     * If successful, the processed data is passed to `CityBuilder.CalculateNewCity`
     * for further calculations.
     *
     * Logs error details and displays a user-facing message in case of an issue,
     * such as missing or invalid data.
     *
     * @async
     */
    MergeData: async ()=> {
        let mapData = MainParser.CityMapData;
        const entities = MainParser.CityEntities;

        if (ActiveMap === 'era_outpost') mapData = CityMap.EraOutpost.data;
        else if (ActiveMap === 'guild_raids') mapData = CityMap.QI.data;
        else if (ActiveMap === 'cultural_outpost') mapData = CityMap.CulturalOutpost.data;

        if (!mapData || typeof mapData !== 'object' || !entities || typeof entities !== 'object') {
            console.error("Daten nicht gefunden oder ungültig!", {mapData, entities, ActiveMap});
            $('#CityBuilderBoxBody').html('<div style="padding:20px; color:red;">' + i18n('Boxes.CityBuilder.NoData') + '</div>');
            return;
        }

        let buildingsInput = [];
        CityBuilder.RoadsBefore = 0;

        for (const [id, instance] of Object.entries(mapData)) {
            if (!instance) continue;

            // Filter
            if (instance.x < 0 || instance.y < 0) continue;
            if (instance.type === 'off_grid') continue;

            // buildings the user removed from the map stay out of the plan
            if (CityBuilder.Excluded.has(instance.id)) continue;

            const meta = entities[instance.cityentity_id];
            if (!meta) continue;

            // current road tiles of the live city - baseline for the savings
            // display (two-lane pieces count with their full 2x2 footprint)
            if (instance.type === 'street') {
                const sw = parseInt(meta.components?.AllAge?.placement?.size?.x || meta.width || 1);
                const sh = parseInt(meta.components?.AllAge?.placement?.size?.y || meta.length || 1);
                CityBuilder.RoadsBefore += sw * sh;
                continue;
            }

            // Größe ermitteln (Deep Check)
            let b_width = meta.width;
            let b_height = meta.length;

            if (meta.components?.AllAge?.placement?.size) {
                b_width = meta.components.AllAge.placement.size.x;
                b_height = meta.components.AllAge.placement.size.y;
            }

            // Fallback
            if (!b_width) b_width = 1;
            if (!b_height) b_height = 1;

            b_width = parseInt(b_width);
            b_height = parseInt(b_height);
            // the game leaves out coordinates that are 0
            let b_x = parseInt(instance.x || 0);
            let b_y = parseInt(instance.y || 0);

            // Straßen-Logik
            let reqStreet = 0;
            if (meta.components?.AllAge?.streetConnectionRequirement) {
                reqStreet = meta.components.AllAge.streetConnectionRequirement.requiredLevel;
            } else if (meta.components?.streetConnectionRequirement) {
                reqStreet = meta.components.streetConnectionRequirement.requiredLevel;
            } else if (meta.requirements && meta.requirements.street_connection_level) {
                reqStreet = meta.requirements.street_connection_level;
            }

            if (['greatbuilding', 'main_building', 'residential', 'production', 'goods'].includes(instance.type)) {
                if (reqStreet === 0) reqStreet = 1;
            }
            if (instance.type === 'decoration') reqStreet = 0;

            // Chain buildings: pass the chain id and the position inside the chain
            // so the worker can keep the members side by side, left to right
            let chainId = null;
            let chainPos = -1;
            const chainRef = meta.components?.AllAge?.chain?.chainId;
            if (chainRef && MainParser.BuildingChains) {
                const chainMeta = MainParser.BuildingChains[chainRef] || MainParser.BuildingChains[chainRef.toLowerCase()];
                if (chainMeta?.cityEntityIds) {
                    chainPos = chainMeta.cityEntityIds.indexOf(instance.cityentity_id);
                    if (chainPos >= 0) chainId = chainRef;
                }
            }

            buildingsInput.push({
                id: instance.id,
                asset_id: instance.cityentity_id,
                name: meta.name,
                type: instance.type,
                x: b_x,
                y: b_y,
                width: b_width,
                height: b_height,
                street_level: reqStreet,
                chain_id: chainId,
                chain_pos: chainPos
            });
        }

        // an area kept free on purpose (e.g. for a quest building) is planned
        // like a roadless building and drawn as free space
        const reserve = localStorage.getItem('CityBuilderReserveOn') === '1'
            ? CityBuilder.parseReserve(localStorage.getItem('CityBuilderReserve') || '5x5')
            : null;
        if (reserve) {
            buildingsInput.push({
                id: 'reserved',
                asset_id: null,
                name: i18n('Boxes.CityBuilder.Reserve') + ' ' + reserve.join('x'),
                type: 'reserved',
                x: 0,
                y: 0,
                width: reserve[0],
                height: reserve[1],
                street_level: 0,
                chain_id: null,
                chain_pos: -1
            });
        }

        CityBuilder.Planned = null;

        // building optimization: several layout rounds with swapped buildings
        if (localStorage.getItem('CityBuilderOptimize') === '1' && ActiveMap === 'main') {
            let best = null;
            try {
                best = await CityBuilder.Optimizer.calculate(buildingsInput);
            } catch (e) {
                console.error('CityBuilder: optimization failed', e);
            }
            if (best === undefined || $('#CityBuilderBox').length === 0) return;
            if (best) {
                // city ids at planning time: later ids are new placements
                CityBuilder.Planned = Object.assign(best.plan, { known: Object.keys(MainParser.CityMapData) });
                CityBuilder.Variants = best.result.variants;
                CityBuilder.applyVariant(0);
                return;
            }
        }

        CityBuilder.CalculateNewCity(buildingsInput);
    },


    /**
     * Calculates the new city layout in a web worker and shows the best
     * variants. Errors end up in the box instead of a spinning loader.
     *
     * @param {Object[]} buildingsInput - Worker input of the buildings.
     */
    CalculateNewCity: async (buildingsInput) => {
        const result = await CityBuilder.runWorker(buildingsInput, 0, (pct) => {
            $('#CityBuilderBoxBody .calc-progress').text(pct + '%');
            $('#CityBuilderBoxBody .loading-bar-fill').css('width', pct + '%');
        });
        // replaced by a newer run or the box was closed
        if (!result || $('#CityBuilderBox').length === 0) return;

        if (result.success) {
            // the worker returns the best distinct layouts, ranked -
            // the first one is shown, the others stay switchable
            CityBuilder.Variants = result.variants;
            CityBuilder.applyVariant(0);
        }
        else {
            console.error('CityBuilder:', result.error);
            $('#CityBuilderBoxBody').html('<div style="padding:20px; color:red;">' + i18n('Boxes.CityBuilder.Error') + ': ' + result.error + '</div>');
        }
    },


    /**
     * Stops a running layout search; its pending runWorker() promise resolves with null.
     */
    stopWorker: () => {
        if (CityBuilder.WorkerStop) CityBuilder.WorkerStop();
        else if (CityBuilder.Worker) CityBuilder.Worker.terminate();
        CityBuilder.Worker = null;
        CityBuilder.WorkerStop = null;
    },


    /**
     * Runs one layout search in a web worker.
     *
     * @param {Object[]} buildingsInput - Worker input of the buildings.
     * @param {number} budgetMs - Search time, 0 for the worker default.
     * @param {function(number)} onProgress - Receives the progress in percent.
     * @returns {Promise<Object|null>} Worker result, null when the run was replaced by a newer one.
     */
    runWorker: (buildingsInput, budgetMs, onProgress) => new Promise((resolve) => {
        const mapData = CityMap.Main.unlockedAreas;

        if (!mapData || Object.keys(mapData).length === 0) {
            resolve({ success: false, error: i18n('Boxes.CityBuilder.NoAreas') });
            return;
        }

        // a still-running worker from a closed and reopened box must not race
        // this run on the same DOM
        CityBuilder.stopWorker();

        const workerUrl = URL.createObjectURL(new Blob([CityBuilder.WorkerCode], { type: 'application/javascript' }));
        const worker = new Worker(workerUrl);
        CityBuilder.Worker = worker;

        const finish = (result) => {
            if (CityBuilder.Worker === worker) {
                CityBuilder.Worker = null;
                CityBuilder.WorkerStop = null;
            }
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
            resolve(result);
        };
        CityBuilder.WorkerStop = () => finish(null);

        worker.onmessage = (e) => {
            // progress ping while the search is still running
            if (e.data.progress !== undefined) {
                if (onProgress) onProgress(e.data.progress);
                return;
            }
            finish(e.data);
        };

        // a worker killed by the browser or failing outside its own try/catch
        // would otherwise leave the spinner spinning forever and leak the blob URL
        worker.onerror = (err) => finish({ success: false, error: (err && err.message) || 'Worker error' });

        worker.postMessage({ mapData: mapData, buildingsData: buildingsInput, budgetMs: budgetMs || 0 });
    }),

};
