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


    /**
     * Initialisiert die optimierte Stadtkarte
     */
    init: async () => {
        if ($('#CityBuilderBox').length > 0) {
            HTML.CloseOpenBox('CityBuilderBox');
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
            resize: true
        });

        // Ladebalken anzeigen
        $('#CityBuilderBoxBody').html(`<div style="padding:20px; text-align:center;">
            <div class="loader"></div>
            <br>
            ${i18n('Boxes.CityBuilder.Calculating') || 'Generiere Stadtlayout...'}
        </div>`);

        // Daten sammeln und Berechnung starten
        await CityBuilder.MergeData();
    },


    /**
     * Rendert die Stadtkarte
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
        h.push(`<div class="city-builder-controls">`);
        h.push(`<span>${i18n('Boxes.CityBuilder.Zoom')}: </span>`);
        h.push(`<input type="range" class="scale-slider" name="optimizedcityscale" min="50" max="200" step="1" value="${storedUnit}" />`);
        h.push(`<span class="scale-value">${storedUnit}</span>`);

        h.push(`<span style="margin-left:8px">${i18n('Boxes.CityBuilder.Opacity')}: </span>`);
        h.push(`<input type="range" class="opacity-slider" name="opacity" min="0.1" max="1" step="0.05" value="${storedOpacity}" />`);

        h.push(`</div>`);

        h.push(`<div class="map-grid-wrapper" style="--scale:${storedUnit}; opacity:${storedOpacity};">`);

        // Canvas für die Karte
        h.push(`<canvas id="city-builder-canvas" class="map-grid-canvas"></canvas>`);

        // Tooltip Layer (unsichtbare Spans für helperTT)
        h.push(`<div class="map-grid-tooltips">`);
        for (let building of CityBuilder.Data) {
            h.push(CityBuilder.placeBuilding(building));
        }
        h.push(`</div>`);

        h.push(`</div>`);

        $('#CityBuilderBoxBody').html(h.join('')).promise().done(function() {

            CityBuilder.renderCanvas();

            $('.scale-slider').on('input', function() {
                let unit = parseFloat($(this).val());
                localStorage.setItem('CityBuilderScale', unit);
                $('#CityBuilderBoxBody .map-grid-wrapper').css('--scale', unit);
                $('.scale-value').text(unit);
            });

            $('.opacity-slider').on('input', function() {
                let val = $(this).val();
                localStorage.setItem('CityBuilderOpacity', val);
                $('#CityBuilderBoxBody .map-grid-wrapper').css('opacity', val);
            });
        });
    },


    /**
     * Zeichnet die Stadtkarte auf das Canvas
     */
    renderCanvas: () => {
        const canvas = document.getElementById('city-builder-canvas');
        if (!canvas) {
            console.warn('CityBuilder: Canvas element not found!');
            return;
        }

        const ctx = canvas.getContext('2d');

        // 1. Datenquellen sicher abrufen (verhindert Abstürze wenn Variablen fehlen)
        let areas = [];
        try {
            if (typeof CityMap !== 'undefined') {
                if (typeof ActiveMap !== 'undefined' && ActiveMap === 'era_outpost') areas = CityMap.EraOutpostAreas;
                else if (typeof ActiveMap !== 'undefined' && ActiveMap === 'guild_raids') areas = CityMap.QIAreas;
                else if (typeof ActiveMap !== 'undefined' && ActiveMap === 'cultural_outpost') areas = CityMap.CulturalOutpostAreas;
                else areas = CityMap.UnlockedAreas;
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
     * Zeichnet den Umriss der Stadtkarte auf das Canvas
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
     * HTML für ein einzelnes Gebäude erzeugen
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
        // Wir geben Straßen keine 'helperTT' Klasse, damit kein leeres Popup kommt
        let tooltipClass = (type === 'street') ? '' : 'helperTT';

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


    MergeData: async ()=> {
        let mapData = MainParser.CityMapData;
        const entities = MainParser.CityEntities;

        if (ActiveMap === 'era_outpost') mapData = CityMap.EraOutpostData;
        else if (ActiveMap === 'guild_raids') mapData = CityMap.QIData;
        else if (ActiveMap === 'cultural_outpost') mapData = CityMap.CulturalOutpostData;

        if (!mapData || !entities) {
            console.error("Daten nicht gefunden!", {mapData, entities, ActiveMap});
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


    CalculateNewCity: (buildingsInput)=> {

        const mapData = CityMap.UnlockedAreas;
        const blob = new Blob([CityBuilder.WorkerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);

        console.log("🚀 Starte Stadt-Erstellung mit Worker...");

        worker.postMessage({
            mapData: mapData,
            buildingsData: buildingsInput
        });

        worker.onmessage = function(e) {
            const data = e.data;
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
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
        };
    },


    WorkerCode: `class CityOptimizerBrowser {
            constructor(mapData, buildingsData) {
                this.grid = new Map();
                this.buildings = [];
                this.placedBuildings = [];
                this.mapBounds = { minX: 1000, maxX: 0, minY: 1000, maxY: 0 };
                this.townHall = null;
                this.townHallPos = null;
                this.roadTiles = new Set();
                this.protectedRoadTiles = new Set();
                
                this.processData(mapData, buildingsData);
            }
    
            processData(rawMap, rawBuildings) {
                const validTiles = new Set();
                const mapArray = Array.isArray(rawMap) ? rawMap : Object.values(rawMap);
    
                mapArray.forEach(area => {
                    const ax = area.x || 0;
                    const ay = area.y || 0;
                    const aw = area.width || 4;
                    const al = area.length || 4;
    
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
                    if (bCopy.type === 'main_building') {
                        this.townHall = bCopy;
                        this.townHall.street_level = 1;
                    } else {
                        this.buildings.push(bCopy);
                    }
                });
    
                this.buildings.sort((a, b) => {
                    if (b.street_level !== a.street_level) return b.street_level - a.street_level;
                    const sizeA = a.width * a.height;
                    const sizeB = b.width * b.height;
                    if (sizeB !== sizeA) return sizeB - sizeA;
                    return a.name.localeCompare(b.name);
                });
            }
    
            placeRoadTile(x, y, isProtected = false) {
                const key = x + ',' + y;
                if (this.grid.get(key) === 0) {
                    this.grid.set(key, 2);
                    this.roadTiles.add(key);
                    if (isProtected) this.protectedRoadTiles.add(key);
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
    
            buildFishboneStar() {
                const [tx, ty] = this.townHallPos;
                const tw = this.townHall.width;
                const th = this.townHall.height;
    
                // 1. Die 4 Hauptarme
                // Oben
                this.placeRoadTile(tx, ty - 1, true); 
                for (let y = ty - 2; y >= this.mapBounds.minY; y--) this.placeRoadTile(tx, y, false);
    
                // Rechts
                this.placeRoadTile(tx + tw, ty, true);
                for (let x = tx + tw + 1; x < this.mapBounds.maxX; x++) this.placeRoadTile(x, ty, false);
    
                // Unten
                this.placeRoadTile(tx + tw - 1, ty + th, true);
                for (let y = ty + th + 1; y < this.mapBounds.maxY; y++) this.placeRoadTile(tx + tw - 1, y, false);
    
                // Links
                this.placeRoadTile(tx - 1, ty + th - 1, true);
                for (let x = tx - 2; x >= this.mapBounds.minX; x--) this.placeRoadTile(x, ty + th - 1, false);
    
                // 2. Rippen
                const gap = 10;
                const step = 10;
    
                // A. Vom Oberen Arm (Links/Rechts)
                for (let y = ty - gap; y >= this.mapBounds.minY; y -= step) {
                    for (let x = tx - 1; x >= this.mapBounds.minX; x--) this.placeRoadTile(x, y, false);
                    for (let x = tx + 1; x < this.mapBounds.maxX; x++) this.placeRoadTile(x, y, false);
                }
    
                // B. Vom Unteren Arm (Links/Rechts)
                for (let y = ty + th + gap; y < this.mapBounds.maxY; y += step) {
                    for (let x = tx + tw - 2; x >= this.mapBounds.minX; x--) this.placeRoadTile(x, y, false);
                    for (let x = tx + tw; x < this.mapBounds.maxX; x++) this.placeRoadTile(x, y, false);
                }
            }
    
            pruneRoadsSmart() {
                const streetBuildings = this.placedBuildings.filter(b => b.street_level > 0 && b.type !== 'main_building');
                
                while (true) {
                    const toRemove = [];
                    for (const key of this.roadTiles) {
                        if (this.protectedRoadTiles.has(key)) continue;
                        const [rx, ry] = key.split(',').map(Number);
                        
                        let neighbors = 0;
                        if (this.grid.get((rx-1) + ',' + ry) === 2) neighbors++;
                        if (this.grid.get((rx+1) + ',' + ry) === 2) neighbors++;
                        if (this.grid.get(rx + ',' + (ry-1)) === 2) neighbors++;
                        if (this.grid.get(rx + ',' + (ry+1)) === 2) neighbors++;
    
                        let needed = false;
                        const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                        for (const [dx, dy] of deltas) {
                            const nx = rx + dx;
                            const ny = ry + dy;
                            if (this.grid.get(nx + ',' + ny) === 1) {
                                for (const b of streetBuildings) {
                                    if (nx >= b.x && nx < b.x + b.width && ny >= b.y && ny < b.y + b.height) {
                                        needed = true; break;
                                    }
                                }
                            }
                            if (needed) break;
                        }
    
                        if (neighbors <= 1 && !needed) toRemove.push(key);
                    }
    
                    if (toRemove.length === 0) break;
                    for (const key of toRemove) {
                        this.grid.set(key, 0);
                        this.roadTiles.delete(key);
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
                return exportList;
            }
    
            run() {
                const mapW = this.mapBounds.maxX - this.mapBounds.minX;
                const goldenRatioX = Math.floor(this.mapBounds.minX + mapW * 0.382);
                const cy = Math.floor((this.mapBounds.minY + this.mapBounds.maxY) / 2);
    
                let placedTh = false;
                for (let x = goldenRatioX - 5; x < goldenRatioX + 5; x++) {
                    for (let y = cy - 10; y < cy + 10; y++) {
                        if (this.canPlace(x, y, this.townHall.width, this.townHall.height)) {
                            this.placeEntity(this.townHall, x, y, 9);
                            this.townHallPos = [x, y];
                            placedTh = true; break;
                        }
                    }
                    if (placedTh) break;
                }
    
                if (!placedTh) return { error: "Rathaus konnte nicht platziert werden" };
    
                this.buildFishboneStar();
    
                const streetBuildings = this.buildings.filter(b => b.street_level > 0);
                const decos = this.buildings.filter(b => b.street_level === 0);
    
                const thCenterX = this.townHallPos[0] + Math.floor(this.townHall.width / 2);
                const thCenterY = this.townHallPos[1] + Math.floor(this.townHall.height / 2);
    
                const allCoords = [];
                for (let x = this.mapBounds.minX; x < this.mapBounds.maxX; x++) {
                    for (let y = this.mapBounds.minY; y < this.mapBounds.maxY; y++) {
                        allCoords.push([x, y]);
                    }
                }
                allCoords.sort((a, b) => {
                    const distA = Math.abs(a[0] - thCenterX) + Math.abs(a[1] - thCenterY);
                    const distB = Math.abs(b[0] - thCenterX) + Math.abs(b[1] - thCenterY);
                    return distA - distB;
                });
    
                for (const b of streetBuildings) {
                    let placed = false;
                    for (const [cx, cy] of allCoords) {
                        if (this.grid.get(cx + ',' + cy) === 0) {
                            if (this.canPlace(cx, cy, b.width, b.height)) {
                                if (this.isConnectedToRoad(cx, cy, b.width, b.height)) {
                                    this.placeEntity(b, cx, cy, 1);
                                    placed = true; break;
                                }
                            }
                        }
                    }
                }
    
                this.pruneRoadsSmart();
    
                decos.sort((a, b) => (b.width * b.height) - (a.width * a.height));
                for (const b of decos) {
                    for (const [cx, cy] of allCoords) {
                        if (this.grid.get(cx + ',' + cy) === 0) {
                            if (this.canPlace(cx, cy, b.width, b.height)) {
                                this.placeEntity(b, cx, cy, 1);
                                break;
                            }
                        }
                    }
                }
    
                return {
                    success: true,
                    layout: this.generateExportData(),
                    stats: {
                        roads: this.roadTiles.size,
                        buildings: this.placedBuildings.length,
                        missing: this.buildings.length - this.placedBuildings.length + 1
                    }
                };
            }
        }
    
        self.onmessage = function(e) {
            try {
                const optimizer = new CityOptimizerBrowser(e.data.mapData, e.data.buildingsData);
                const result = optimizer.run();
                self.postMessage(result);
            } catch (err) {
                self.postMessage({ success: false, error: err.message });
            }
        };`,
};