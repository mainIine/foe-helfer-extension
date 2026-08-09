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
    PanX: 0,
    PanY: 0,
    EditMode: false,
    ShowNames: false,
    ShowTooltips: true,


    /**
     * Initialisiert den Builder
     */
    init: async () => {
        if ($('#CityBuilderBox').length > 0) {
            HTML.CloseOpenBox('CityBuilderBox');
            if ($('#CityBuilderUnplacedBox').length > 0) HTML.CloseOpenBox('CityBuilderUnplacedBox');
            if (CityBuilder.Worker) {
                CityBuilder.Worker.terminate();
                CityBuilder.Worker = null;
            }
            return;
        }

        // reset all planning state on open
        CityBuilder.Data = [];
        CityBuilder.Removed = [];
        CityBuilder.Excluded = new Set();
        CityBuilder.Variants = [];
        CityBuilder.VariantIndex = 0;
        CityBuilder.EditMode = false;
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

        CityBuilder.showLoading();

        // Daten sammeln und Berechnung starten
        await CityBuilder.MergeData();
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

        if (!CityBuilder.Data || CityBuilder.Data.length === 0) {
            $('#CityBuilderBoxBody').html('<div style="padding:20px;">' + i18n('Boxes.CityBuilder.NoData') + '</div>');
            return;
        }

        let h = [];

        // Zoom Steuerungen oben rechts
        h.push(`<div class="optimized-city-controls">`);

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
        h.push(`<button class="btn recalc-btn">${i18n('Boxes.CityBuilder.Recalculate')}</button>`);

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

            $('.recalc-btn').on('click', () => CityBuilder.Recalculate());

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

        if (!hasUnplaced && !hasRemoved) {
            if ($('#CityBuilderUnplacedBox').length > 0) HTML.CloseOpenBox('CityBuilderUnplacedBox');
            return;
        }

        // create the box once and reuse it afterwards - updates only replace
        // the body content, so position and drag binding survive
        if ($('#CityBuilderUnplacedBox').length === 0) {
            HTML.Box({
                id: 'CityBuilderUnplacedBox',
                title: i18n('Boxes.CityBuilder.Unplaced'),
                auto_close: true,
                dragdrop: true,
                minimize: true
            });
        }

        // group identical buildings: name + size -> count (+ instance ids)
        const groupList = (list) => {
            const groups = new Map();
            for (const b of list) {
                const key = b.name + '|' + b.width + 'x' + b.height;
                if (!groups.has(key)) groups.set(key, { ...b, count: 0, ids: [] });
                const g = groups.get(key);
                g.count++;
                g.ids.push(b.id);
            }
            return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
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

        $('#CityBuilderUnplacedBoxBody').html(h.join(''));

        // restore one instance of the group for the next recalculation
        $('#CityBuilderUnplacedBoxBody .removed-restore').on('click', function() {
            CityBuilder.restoreRemoved($(this).data('restore_id'));
        });
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

        if (ActiveMap === 'era_outpost') mapData = CityMap.EraOutpostData;
        else if (ActiveMap === 'guild_raids') mapData = CityMap.QIData;
        else if (ActiveMap === 'cultural_outpost') mapData = CityMap.CulturalOutpostData;

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
            let b_x = parseInt(instance.x);
            let b_y = parseInt(instance.y);

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

        CityBuilder.CalculateNewCity(buildingsInput);
    },


    /**
     * Calculates and constructs a new city layout using web workers.
     *
     * This method takes a set of building inputs and processes the city layout based on the unlocked map areas.
     * It leverages a web worker to offload the computation for asynchronous processing. If successful, the
     * method updates the city data and renders the city map. In case of an error, it logs the message
     * and displays the error output in the UI.
     *
     * @param {Object} buildingsInput - The input data representing the buildings to be included in the city layout.
     */
    CalculateNewCity: (buildingsInput)=> {

        const mapData = CityMap.Main.unlockedAreas;

        if (!mapData || (Array.isArray(mapData) && mapData.length === 0) || (typeof mapData === 'object' && Object.keys(mapData).length === 0)) {
            console.error("Keine freigeschalteten Gebiete gefunden!", mapData);
            $('#CityBuilderBoxBody').html('<div style="padding:20px; color:red;">Fehler: Keine freigeschalteten Gebiete gefunden!</div>');
            return;
        }

        // a still-running worker from a closed and reopened box must not race
        // this run on the same DOM
        if (CityBuilder.Worker) {
            CityBuilder.Worker.terminate();
            CityBuilder.Worker = null;
        }

        const blob = new Blob([CityBuilder.WorkerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);
        CityBuilder.Worker = worker;

        console.log("🚀 Starte Stadt-Erstellung mit Worker...");

        worker.postMessage({
            mapData: mapData,
            buildingsData: buildingsInput
        });

        const finish = () => {
            if (CityBuilder.Worker === worker) CityBuilder.Worker = null;
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
        };

        worker.onmessage = function(e) {
            const data = e.data;

            // progress ping while the search is still running
            if (data.progress !== undefined) {
                $('#CityBuilderBoxBody .calc-progress').text(data.progress + '%');
                $('#CityBuilderBoxBody .loading-bar-fill').css('width', data.progress + '%');
                return;
            }

            if (data.success) {
                console.log("✅ Fertig!", data.variants[0].stats);

                // the worker returns the best distinct layouts, ranked -
                // the first one is shown, the others stay switchable
                CityBuilder.Variants = data.variants;
                CityBuilder.applyVariant(0);

            } else {
                console.error("❌ Fehler:", data.error);
                $('#CityBuilderBoxBody').html('<div style="padding:20px; color:red;">Fehler: ' + data.error + '</div>');
            }
            finish();
        };

        // a worker killed by the browser or failing outside its own try/catch
        // would otherwise leave the spinner spinning forever and leak the blob URL
        worker.onerror = function(err) {
            console.error("❌ Worker error:", err);
            $('#CityBuilderBoxBody').html('<div style="padding:20px; color:red;">Fehler: ' + ((err && err.message) || 'Worker error') + '</div>');
            finish();
        };
    },

};
