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
    MapScale: 20,
    Worker: null,


    /**
     * Initialisiert den Builder
     */
    init: async () => {
        if ($('#CityBuilderBox').length > 0) {
            HTML.CloseOpenBox('CityBuilderBox');
            if (CityBuilder.Worker) {
                CityBuilder.Worker.terminate();
                CityBuilder.Worker = null;
            }
            return;
        }

        CityBuilder.Data = []; // Daten zurücksetzen beim Öffnen
        HTML.AddCssFile('city-builder');

        HTML.Box({
            id: 'CityBuilderBox',
            title: i18n('Boxes.CityBuilder.Title'),
            auto_close: true,
            dragdrop: true,
            minimize: true,
            popout: 'CityBuilder.PopOut()',
            resize: true
        });

        // Ladebalken anzeigen
        $('#CityBuilderBoxBody').html(`<div style="padding:20px; text-align:center;">
            <div class="loader"></div>
            <br>
            ${i18n('Boxes.CityBuilder.Calculating') || 'Generiere Stadtlayout...'} <span class="calc-progress"></span>
        </div>`);

        // Daten sammeln und Berechnung starten
        await CityBuilder.MergeData();
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
                CityBuilder.fitPopout();
                wrapper.ownerDocument.defaultView.addEventListener('resize', CityBuilder.fitPopout);
            }
            else if (++tries > 150) {
                clearInterval(waitForAdopt);
            }
        }, 100);
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

        // the translate() runs before the linear part - solve for the offset that centers the map
        const cx = (body.clientWidth - (maxX - minX)) / 2 - minX;
        const cy = (body.clientHeight - (maxY - minY)) / 2 - minY;
        const det = a * d - b * c;
        const tx = (d * cx - c * cy) / det;
        const ty = (a * cy - b * cx) / det;

        wrapper.style.transform = `skewX(-63.5deg) skewY(14deg) scale(${sx}, ${sy}) translate(${tx}px, ${ty}px)`;
    },


    /**
     * Displays the City Builder map within the container and applies interactive controls for zoom and opacity.
     *
     * - Retrieves and applies user preferences for scale and opacity from local storage, or uses default values.
     * - If the data for buildings (`CityBuilder.Data`) is empty, displays a "No Data" message.
     * - Generates the map grid structure, zoom and opacity controls, and tooltip layers for building details.
     * - Renders the map via a canvas element and positions buildings using the `CityBuilder.placeBuilding` method.
     * - Allows for real-time adjustment of zoom and opacity through input sliders, saving the updates to local storage.
     * - Dynamically updates the CSS custom properties (`--scale` and opacity) and adjusts the popout container size to fit the content.
     */
    showMap: () => {

        let storedUnit = parseInt(localStorage.getItem('CityBuilderScale') || 80);
        let storedOpacity = parseFloat(localStorage.getItem('CityBuilderOpacity') || 0.9);

        if (!CityBuilder.Data || CityBuilder.Data.length === 0) {
            $('#CityBuilderBoxBody').html('<div style="padding:20px;">' + i18n('Boxes.CityBuilder.NoData') + '</div>');
            return;
        }

        let h = [];

        // Zoom Steuerungen oben rechts
        h.push(`<div class="optimized-city-controls">`);
        h.push(`<span>${i18n('Boxes.CityBuilder.Zoom')}: </span>`);
        h.push(`<input type="range" class="scale-slider" name="optimizedcityscale" min="50" max="200" step="1" value="${storedUnit}" />`);
        h.push(`<span class="scale-value">${storedUnit}</span>`);

        h.push(`<span style="margin-left:8px">${i18n('Boxes.CityBuilder.Opacity')}: </span>`);
        h.push(`<input type="range" class="opacity-slider" name="opacity" min="0.1" max="1" step="0.05" value="${storedOpacity}" />`);

        h.push(`</div>`);

        h.push(`<div class="map-grid-wrapper" style="--scale:${storedUnit}; opacity:${storedOpacity};">`);

        // Canvas für die Karte
        h.push(`<canvas id="city-builder-canvas" class="map-grid-canvas"></canvas>`);

        // Tooltip Layer (unsichtbare Spans für fh-tooltip)
        h.push(`<div class="map-grid-tooltips">`);
        for (let building of CityBuilder.Data) {
            h.push(CityBuilder.placeBuilding(building));
        }
        h.push(`</div>`);

        h.push(`</div>`);

        $('#CityBuilderBoxBody').html(h.join('')).promise().done(function() {

            CityBuilder.renderCanvas();
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
        });
    },


    /**
     * Renders the canvas element for the CityBuilder application.
     * The function dynamically calculates the canvas size, draws the background grid,
     * highlights unlocked areas, and displays buildings based on the current map data.
     * It also includes fallback mechanisms for missing or incomplete data.
     *
     * Key Steps:
     * 1. Fetch the canvas element and ensure it exists.
     * 2. Retrieve and process the map data to calculate the canvas dimensions.
     * 3. Define a minimum canvas size and set its dimensions based on the calculated values.
     * 4. Draw the background green overlay for unlocked areas or a fallback background.
     * 5. Render both fine and sector grids.
     * 6. Draw all buildings with color coding for various types (e.g., streets, great buildings, generic buildings).
     * 7. Optionally, call an external function to draw a canvas outline.
     *
     * Warnings and Errors:
     * - Logs a warning if the canvas element is not found.
     * - Logs an error if there's an issue accessing the `CityMap` object or its properties.
     *
     * Dependencies:
     * - Relies on global variables such as `CityBuilder`, `CityMap`, and `ActiveMap`.
     * - Utilizes CSS variables for dynamic color assignment when applicable.
     */
    renderCanvas: () => {
        // jQuery lookup on purpose: the PopupAwareInit patch also searches open
        // pop-up windows, plain document.getElementById would miss the canvas
        // after the box was popped out during the calculation
        const canvas = $('#city-builder-canvas')[0];
        if (!canvas) {
            console.warn('CityBuilder: Canvas element not found!');
            return;
        }

        const ctx = canvas.getContext('2d');

        // 1. Datenquellen sicher abrufen (verhindert Abstürze wenn Variablen fehlen)
        let areas = [];
        try {
            if (typeof CityMap !== 'undefined') {
                if (typeof ActiveMap !== 'undefined' && ActiveMap === 'era_outpost') areas = CityMap.EraOutpost.areas;
                else if (typeof ActiveMap !== 'undefined' && ActiveMap === 'guild_raids') areas = CityMap.QI.areas;
                else if (typeof ActiveMap !== 'undefined' && ActiveMap === 'cultural_outpost') areas = CityMap.CulturalOutpost.areas;
                else areas = CityMap.Main.unlockedAreas;
            }
        } catch (err) {
            console.error('CityBuilder: Error accessing CityMap', err);
        }

        // Falls null/undefined
        if (!areas) areas = [];

        // 2. Größe berechnen
        let maxX = 0, maxY = 0;

        // Versuch 1: Aus den freigeschalteten Flächen
        if (areas.length > 0) {
            for (let area of areas) {
                const ax = parseInt(area.x || 0);
                const ay = parseInt(area.y || 0);
                const aw = parseInt(area.width || 16);
                const al = parseInt(area.length || area.height || 16);

                maxX = Math.max(maxX, ax + aw);
                maxY = Math.max(maxY, ay + al);
            }
        }

        // Versuch 2: Aus den Gebäuden (Fallback, falls Areas fehlen oder 0 sind)
        if ((maxX === 0 || maxY === 0) && CityBuilder.Data && CityBuilder.Data.length > 0) {
            console.log('CityBuilder: Calculating size from buildings...');
            for (let b of CityBuilder.Data) {
                const bx = parseInt(b.x || 0);
                const by = parseInt(b.y || 0);
                const bw = parseInt(b.width || 0);
                const bh = parseInt(b.height || 0);

                maxX = Math.max(maxX, bx + bw);
                maxY = Math.max(maxY, by + bh);
            }
            // Etwas Rand hinzufügen
            maxX += 4;
            maxY += 4;
        }

        // Absolute Mindestgröße (damit Canvas nie 0 ist)
        maxX = Math.max(maxX, 60);
        maxY = Math.max(maxY, 60);

        const width = maxX * CityBuilder.MapScale;
        const height = maxY * CityBuilder.MapScale;

        // Canvas Größe setzen
        canvas.width = width;
        canvas.height = height;

        // Canvas löschen
        ctx.clearRect(0, 0, width, height);

        // 3. Hintergrund zeichnen
        // FoE Grün, 30% Deckkraft (fest codiert, um CSS Fehler zu vermeiden)
        ctx.fillStyle = 'rgba(124, 230, 76, 0.3)';

        if (areas.length > 0) {
            for (let area of areas) {
                const ax = parseInt(area.x) * CityBuilder.MapScale;
                const ay = parseInt(area.y) * CityBuilder.MapScale;
                const aw = parseInt(area.width || 16) * CityBuilder.MapScale;
                const ah = parseInt(area.length || area.height || 16) * CityBuilder.MapScale;

                ctx.fillRect(ax, ay, aw, ah);
            }
        } else {
            // Fallback: Einfaches Rechteck über alles
            ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
            ctx.fillRect(0, 0, width, height);
        }

        // 4. Feines Raster (1x1)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let x = 0; x <= maxX; x++) {
            ctx.moveTo(x * CityBuilder.MapScale, 0);
            ctx.lineTo(x * CityBuilder.MapScale, height);
        }
        for (let y = 0; y <= maxY; y++) {
            ctx.moveTo(0, y * CityBuilder.MapScale);
            ctx.lineTo(width, y * CityBuilder.MapScale);
        }
        ctx.stroke();

        // 5. Sektoren Raster (4x4 oder Area-Grenzen)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        if (areas.length > 0) {
            for (let area of areas) {
                const ax = parseInt(area.x);
                const ay = parseInt(area.y);
                const aw = parseInt(area.width || 16);
                const ah = parseInt(area.length || area.height || 16);

                ctx.rect(
                    ax * CityBuilder.MapScale,
                    ay * CityBuilder.MapScale,
                    aw * CityBuilder.MapScale,
                    ah * CityBuilder.MapScale
                );
            }
        } else {
            // Fallback: 4er Gitter
            for (let x = 0; x <= maxX; x += 4) {
                ctx.moveTo(x * CityBuilder.MapScale, 0);
                ctx.lineTo(x * CityBuilder.MapScale, height);
            }
            for (let y = 0; y <= maxY; y += 4) {
                ctx.moveTo(0, y * CityBuilder.MapScale);
                ctx.lineTo(width, y * CityBuilder.MapScale);
            }
        }
        ctx.stroke();

        // 6. Gebäude zeichnen
        if (CityBuilder.Data) {
            for (let b of CityBuilder.Data) {
                let type = b.type || 'generic_building';
                if (type.includes('street') || b.name === 'Road') type = 'street';
                if (b.street_level === 0 && type !== 'street') type = 'roadless';

                const bx = parseInt(b.x || 0) * CityBuilder.MapScale;
                const by = parseInt(b.y || 0) * CityBuilder.MapScale;
                const bw = parseInt(b.width || 1) * CityBuilder.MapScale;
                const bh = parseInt(b.height || 1) * CityBuilder.MapScale;

                let bgColor = '#ccc';
                if (type === 'street') bgColor = '#333333';
                else if (type === 'roadless') bgColor = '#8A2BE2';
                else if (type === 'main_building') bgColor = '#FFD700';
                else if (type === 'greatbuilding') bgColor = '#FF4500';
                else {
                    // CSS Variable lesen (mit try catch, da getComputedStyle manchmal zickt)
                    try {
                        let cssVar = getComputedStyle(document.documentElement).getPropertyValue(`--background-color-${type}`).trim();
                        if (cssVar) bgColor = cssVar;
                        else bgColor = '#87CEEB';
                    } catch(e) { bgColor = '#87CEEB'; }

                    if (b.street_level === 0) bgColor = '#8A2BE2';
                }

                ctx.fillStyle = bgColor;
                ctx.fillRect(bx, by, bw, bh);

                if (type !== 'street') {
                    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bx, by, bw, bh);
                }
            }
        }

        // 7. Outline
        if (areas.length > 0) {
            CityBuilder.drawCanvasOutline(ctx, areas);
        }
    },


    /**
     * Draws the outline of specified areas on a canvas context.
     * The function calculates the unique edges of the rectangular areas passed in the `areas` array.
     * Duplicate edges (shared by adjacent areas) are removed, and the remaining edges are drawn on the canvas.
     *
     * @param {CanvasRenderingContext2D} ctx - The canvas rendering context used to draw the outline.
     * @param {Array<Object>} areas - An array of rectangular area objects.
     *     Each object should have the following properties:
     *       - {number|string} x: The x-coordinate of the top-left corner of the area.
     *       - {number|string} y: The y-coordinate of the top-left corner of the area.
     *       - {number|string} [width=16]: The width of the area. Defaults to 16 if not specified.
     *       - {number|string} [length|height=16]: The height (or length) of the area. Defaults to 16 if not specified.
     */
    drawCanvasOutline: (ctx, areas) => {
        let edges = {};

        const addEdge = (x1, y1, x2, y2) => {
            const key = x1 < x2 || (x1 === x2 && y1 < y2)
                ? `${x1},${y1}-${x2},${y2}`
                : `${x2},${y2}-${x1},${y1}`;
            if (edges[key]) {
                delete edges[key];
            } else {
                edges[key] = { x1, y1, x2, y2 };
            }
        };

        for (let area of areas) {
            const x = parseInt(area.x);
            const y = parseInt(area.y);
            const w = parseInt(area.width || 16);
            const h = parseInt(area.length || area.height || 16);

            addEdge(x, y, x + w, y);
            addEdge(x + w, y, x + w, y + h);
            addEdge(x + w, y + h, x, y + h);
            addEdge(x, y + h, x, y);
        }

        ctx.strokeStyle = '#CCFF00';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let key in edges) {
            let edge = edges[key];
            ctx.moveTo(edge.x1 * CityBuilder.MapScale, edge.y1 * CityBuilder.MapScale);
            ctx.lineTo(edge.x2 * CityBuilder.MapScale, edge.y2 * CityBuilder.MapScale);
        }
        ctx.stroke();
    },


    /**
     * Places a building on the map based on its attributes and generates the corresponding HTML element.
     * The building type and tooltip attributes are configured according to the building's properties.
     *
     * @param {Object} building - The building object containing its details.
     * @param {string} [building.type='generic_building'] - The type of the building.
     * @param {string} [building.name] - The name of the building.
     * @param {number} [building.street_level=0] - Indicates whether the building is on a road level.
     * @param {number|string} building.x - The X-coordinate of the building's position.
     * @param {number|string} building.y - The Y-coordinate of the building's position.
     * @param {number|string} building.width - The width of the building.
     * @param {number|string} building.height - The height of the building.
     * @param {number|string} [building.asset_id] - The unique asset ID of the building.
     *
     * @returns {string} The HTML markup for the building's representation on the map.
     * Returns an empty string if the coordinates or dimensions are invalid.
     */
    placeBuilding: (building) => {
        let type = building.type || 'generic_building';

        // Straßen explizit als Typ setzen, damit CSS greift
        if (type === 'street' || building.name === 'Road') {
            type = 'street';
        }

        let street = (building.street_level === 0 && type !== 'street') ? ' roadless' : '';

        const x = parseInt(building.x);
        const y = parseInt(building.y);
        const w = parseInt(building.width);
        const h = parseInt(building.height);

        if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) return '';

        // Tooltip-Attribute (Straßen brauchen meist keinen Tooltip, aber wir rendern das Element trotzdem)
        // Wir geben Straßen keine 'fh-tooltip' Klasse, damit kein leeres Popup kommt
        let tooltipClass = (type === 'street') ? '' : 'fh-tooltip';

        let tooltipAttrs = `
            class="map-building ${type}${street} ${tooltipClass}" 
            data-callback_tt="Tooltips.buildingTT" 
            data-meta_id="${building.asset_id}" 
            data-title="${building.name}" 
            data-size="${h}x${w}"
        `;

        return `
            <span ${tooltipAttrs} class="map-building ${type}${street}"
                style="left:${x * CityBuilder.MapScale}px;top:${y * CityBuilder.MapScale}px;width:${w * CityBuilder.MapScale}px;height:${h * CityBuilder.MapScale}px;">
            </span>
        `;
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

        for (const [id, instance] of Object.entries(mapData)) {
            if (!instance) continue;

            // Filter
            if (instance.x < 0 || instance.y < 0) continue;
            if (instance.type === 'street' || instance.type === 'off_grid') continue;

            const meta = entities[instance.cityentity_id];
            if (!meta) continue;

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

            buildingsInput.push({
                id: instance.id,
                asset_id: instance.cityentity_id,
                name: meta.name,
                type: instance.type,
                x: b_x,
                y: b_y,
                width: b_width,
                height: b_height,
                street_level: reqStreet
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
                $('#CityBuilderBoxBody .calc-progress').text(data.progress);
                return;
            }

            if (data.success) {
                console.log("✅ Fertig!", data.stats);

                // Daten übernehmen statt herunterladen
                CityBuilder.Data = data.layout;

                // Karte anzeigen
                CityBuilder.showMap();

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


    /**
     * A class that optimizes placement of buildings and roads within a grid-based city
     * layout. It processes map data, handles building placement, and ensures proper road
     * connectivity while adhering to defined constraints.
     */
    WorkerCode: `class CityOptimizerBrowser {
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
                    if (bCopy.type === 'main_building') {
                        this.townHall = bCopy;
                        this.townHall.street_level = 1;
                    } else {
                        this.buildings.push(bCopy);
                    }
                });
    
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

            // connect every placed street building that has no road yet with the
            // shortest possible stub - one touching tile is enough
            connectPlacedBuildings() {
                let todo = this.placedBuildings.filter(b => b.street_level > 0 && !this.isConnectedToRoad(b.x, b.y, b.width, b.height));

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
                        const per = [];
                        for (let i = b.x; i < b.x + b.width; i++) per.push(i + ',' + (b.y - 1), i + ',' + (b.y + b.height));
                        for (let j = b.y; j < b.y + b.height; j++) per.push((b.x - 1) + ',' + j, (b.x + b.width) + ',' + j);
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
                    todo = todo.filter(b => !this.isConnectedToRoad(b.x, b.y, b.width, b.height));
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
                    const todo = this.placedBuildings.filter(b => b.street_level > 0 && !this.isConnectedToRoad(b.x, b.y, b.width, b.height));
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
                        const per = [];
                        for (let i = b.x; i < b.x + b.width; i++) per.push(i + ',' + (b.y - 1), i + ',' + (b.y + b.height));
                        for (let j = b.y; j < b.y + b.height; j++) per.push((b.x - 1) + ',' + j, (b.x + b.width) + ',' + j);
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
                        let spot = null;
                        for (const [cx, cy] of coords) {
                            if (this.grid.get(cx + ',' + cy) !== 0 || !this.canPlace(cx, cy, b.width, b.height)) continue;
                            if (!this.gbKeepsStubSpace(cx, cy, b.width, b.height)) continue;
                            if (this.isConnectedToRoad(cx, cy, b.width, b.height)) { spot = [cx, cy]; break; }
                            if (!spot) {
                                let touches = false;
                                for (let i = cx; i < cx + b.width && !touches; i++) {
                                    if (reach.has(i + ',' + (cy - 1)) || reach.has(i + ',' + (cy + b.height))) touches = true;
                                }
                                for (let j = cy; j < cy + b.height && !touches; j++) {
                                    if (reach.has((cx - 1) + ',' + j) || reach.has((cx + b.width) + ',' + j)) touches = true;
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
                if (!this.roadTiles.size || !this.townHallPos) return;

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

                // the component touching the town hall is the main one
                const [tx, ty] = this.townHallPos;
                const per = [];
                for (let i = tx; i < tx + this.townHall.width; i++) per.push(i + ',' + (ty - 1), i + ',' + (ty + this.townHall.height));
                for (let j = ty; j < ty + this.townHall.height; j++) per.push((tx - 1) + ',' + j, (tx + this.townHall.width) + ',' + j);
                let mainIdx = -1;
                for (const pt of per) {
                    if (compOf.has(pt)) { mainIdx = compOf.get(pt); break; }
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
                    }
                }
            }
    
            placeRoadTile(x, y) {
                const key = x + ',' + y;
                if (this.grid.get(key) === 0) {
                    this.grid.set(key, 2);
                    this.roadTiles.add(key);
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
                        if (etype === 2) this.roadTiles.add(key);
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
                // the town hall counts too: its last road tile must survive
                const streetBuildings = this.placedBuildings.filter(b => b.street_level > 0);

                const buildingsTouching = (rx, ry) => streetBuildings.filter(b =>
                    ((ry === b.y - 1 || ry === b.y + b.height) && rx >= b.x && rx < b.x + b.width) ||
                    ((rx === b.x - 1 || rx === b.x + b.width) && ry >= b.y && ry < b.y + b.height)
                );

                // a road tile may go when the network stays one piece without it
                // and no adjacent building loses its last road tile - unlike pure
                // dead-end peeling this also removes parallel double roads, which
                // are connected at both ends and would survive forever otherwise
                const stillConnected = (skipKey) => {
                    let start = null;
                    for (const key of this.roadTiles) { if (key !== skipKey) { start = key; break; } }
                    if (!start) return true;
                    const seen = new Set([start, skipKey]);
                    const stack = [start];
                    let count = 1;
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

                        // One connection tile per building is enough - keep this tile
                        // if some adjacent building would lose its last road tile
                        if (buildingsTouching(rx, ry).some(b => this.countAdjacentRoadTiles(b) <= 1)) continue;

                        let neighbors = 0;
                        if (this.grid.get((rx-1) + ',' + ry) === 2) neighbors++;
                        if (this.grid.get((rx+1) + ',' + ry) === 2) neighbors++;
                        if (this.grid.get(rx + ',' + (ry-1)) === 2) neighbors++;
                        if (this.grid.get(rx + ',' + (ry+1)) === 2) neighbors++;

                        // endpoints can never disconnect the network, everything
                        // else must pass the connectivity check
                        if (neighbors > 1 && !stillConnected(key)) continue;

                        this.grid.set(key, 0);
                        this.roadTiles.delete(key);
                        changed = true;
                    }
                }
            }
    
            generateExportData() {
                const exportList = [...this.placedBuildings];
                this.roadTiles.forEach(key => {
                    const [x, y] = key.split(',').map(Number);
                    exportList.push({
                        x: x, y: y, width: 1, height: 1, type: 'street', name: 'Road', street_level: 0
                    });
                });
                if (this.transposed) {
                    // back to real map coordinates
                    return exportList.map(item => ({ ...item, x: item.y, y: item.x, width: item.height, height: item.width }));
                }
                return exportList;
            }
    
            layoutBands(street) {
                const minX = this.mapBounds.minX, maxX = this.mapBounds.maxX;
                const minY = this.mapBounds.minY, maxY = this.mapBounds.maxY;

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
                for (let y = trunkTop; y < trunkBottom; y++) this.placeRoadTile(trunkX, y);

                // hook up the pre-placed great buildings while the rows are still
                // empty - once the bands are built they wall off the free pockets
                // and no stub can reach the trunk anymore (pruneRoadsSmart removes
                // stubs that band roads make obsolete afterwards)
                this.connectPlacedBuildings();

                // build order comes from the variant: bands of similar height need the
                // fewest road rows, and every building touches its road row by construction
                const queue = this.sortBuildings([this.townHall, ...street]);

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

                // bands top-down: [buildings above][road row][buildings below] ...
                let y = minY;
                while (queue.length && y < maxY) {
                    const roadY = y + queue[0].height;
                    if (roadY >= maxY) break;

                    // the road row must exist and cross the trunk to stay connected
                    const range = rowRange.get(roadY);
                    if (!range || roadY < trunkTop || roadY >= trunkBottom || trunkX < range[0] || trunkX >= range[1]) { y++; continue; }

                    // roads first so the row packing sees them, side stretches get
                    // linked to the trunk by the unify pass afterwards
                    for (const run of rowRuns.get(roadY)) {
                        for (let x = run[0]; x < run[1]; x++) this.placeRoadTile(x, roadY);
                    }
                    placeRow(roadY, 'above');
                    const hBelow = placeRow(roadY, 'below');

                    y = roadY + 1 + hBelow;
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
                // that region
                for (const [x, y] of coords) {
                    if (thRegionOf.get(x + ',' + y) !== thLargest) continue;
                    if (this.canPlace(x, y, this.townHall.width, this.townHall.height)) {
                        this.townHallPos = [x, y];
                        this.placeEntity(this.townHall, x, y, 9);
                        break;
                    }
                }
                // fallback: anywhere it fits
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

                const queue = this.sortBuildings([...street]);

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

                for (const b of queue) {
                    // free area that must stay reachable for the buildings after this one
                    remaining -= b.width * b.height;
                    const needed = remaining;

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

                const allCoords = [];
                for (let cy = minY; cy < maxY; cy++) {
                    for (let cx = minX; cx < maxX; cx++) allCoords.push([cx, cy]);
                }

                // leftovers: whatever the strategy could not place gets any free
                // spot next to the existing road network
                const placedIds = new Set(this.placedBuildings.map(b => b.id));
                const leftovers = [this.townHall, ...street].filter(b => !placedIds.has(b.id));
                for (const b of leftovers) {
                    for (const [cx, cy] of allCoords) {
                        if (this.grid.get(cx + ',' + cy) === 0
                            && this.canPlace(cx, cy, b.width, b.height)
                            && this.isConnectedToRoad(cx, cy, b.width, b.height)
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
                // two, it stays in one piece for expansion
                decos.sort((a, b) => (b.width * b.height) - (a.width * a.height));
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

                    // the big free area must stay connected around the footprint
                    const staysConnected = (x, y, w, h) => {
                        const inFoot = (px, py) => px >= x && px < x + w && py >= y && py < y + h;
                        const target = regionSizes[largestId] - w * h;
                        if (target <= 0) return true;
                        let seed = null;
                        for (let i = x - 1; i <= x + w && !seed; i++) {
                            for (const j of [y - 1, y + h]) {
                                if (regionOf.get(i + ',' + j) === largestId) { seed = i + ',' + j; break; }
                            }
                        }
                        for (let j = y; j < y + h && !seed; j++) {
                            for (const i of [x - 1, x + w]) {
                                if (regionOf.get(i + ',' + j) === largestId) { seed = i + ',' + j; break; }
                            }
                        }
                        if (!seed) return false;
                        const seen = new Set([seed]);
                        const stack = [seed];
                        let count = 0;
                        while (stack.length) {
                            const k = stack.pop();
                            count++;
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
                        return count >= target;
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
                    // a single area at the far end of the map
                    if (!done) {
                        for (const [cx, cy] of allCoords) {
                            const key = cx + ',' + cy;
                            if (this.grid.get(key) !== 0 || regionOf.get(key) !== largestId) continue;
                            if (!this.canPlace(cx, cy, b.width, b.height)) continue;
                            if (!staysConnected(cx, cy, b.width, b.height)) continue;
                            this.placeEntity(b, cx, cy, 1);
                            done = true;
                            break;
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
                for (const b of this.placedBuildings) {
                    if (b.street_level > 0 && !this.isConnectedToRoad(b.x, b.y, b.width, b.height)) {
                        unconnected++;
                        continue;
                    }
                    builtTiles += b.width * b.height;
                }

                return {
                    success: true,
                    layout: this.generateExportData(),
                    stats: {
                        strategy: this.strategy,
                        sortMode: this.sortMode,
                        seed: this.seed,
                        score: builtTiles - this.roadTiles.size,
                        fragments: fragmentTiles,
                        wasted: wastedFree,
                        roads: this.roadTiles.size,
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

                let best = null;
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
                        tried.push({ strategy: variant.strategy, sortMode: variant.sortMode, seed: variant.seed, score: result.stats.score, fragments: result.stats.fragments, wasted: result.stats.wasted, roads: result.stats.roads, missing: result.stats.missing, unconnected: result.stats.unconnected });
                        // complete layouts first, then the least disorder: free
                        // tiles outside the largest empty rectangle (wasted) plus
                        // speckle pockets the decorations had to plug (fragments) -
                        // then best score, then fewest roads
                        const badness = (r) => r.stats.missing + r.stats.unconnected;
                        const disorder = (r) => r.stats.wasted + r.stats.fragments;
                        const beats = !best
                            || badness(result) < badness(best)
                            || (badness(result) === badness(best) && disorder(result) < disorder(best))
                            || (badness(result) === badness(best) && disorder(result) === disorder(best) && result.stats.score > best.stats.score)
                            || (badness(result) === badness(best) && disorder(result) === disorder(best) && result.stats.score === best.stats.score && result.stats.roads < best.stats.roads);
                        if (beats) {
                            best = result;
                        }
                    } else {
                        tried.push({ strategy: variant.strategy, sortMode: variant.sortMode, seed: variant.seed, error: (result && result.error) || 'failed' });
                    }

                    // lightweight progress ping for the loader in the main thread
                    if (tried.length % 20 === 0) self.postMessage({ progress: tried.length });

                    if (performance.now() - started > budgetMs && !baseVariants.length) break;
                }

                if (best) {
                    best.stats.runs = tried.length;
                    best.stats.tried = tried;
                    self.postMessage(best);
                } else {
                    const failed = tried.find(t => t.error);
                    self.postMessage({ success: false, error: (failed && failed.error) || 'Kein Layout gefunden' });
                }
            } catch (err) {
                self.postMessage({ success: false, error: err.message });
            }
        };`,
};