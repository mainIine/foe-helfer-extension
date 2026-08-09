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
 * Modular canvas renderer for the City Builder map.
 *
 * The map is drawn as a stack of independent layers; each layer receives a
 * view object with the canvas context and the map geometry. New features
 * plug in through registerLayer() without touching the existing drawing
 * code. Works in the game overlay and in the pop-out window alike - the
 * canvas is looked up through the popup-aware jQuery patch.
 */
CityBuilder.Renderer = {

    /**
     * Highlight request drawn by the topmost layer, set by the interaction
     * part: { building, mode: 'hover' | 'remove' } or null.
     */
    Highlight: null,

    /**
     * Fixed skew part of the on-screen CSS transform, without the uniform
     * zoom factor: skewX(-63.5deg) skewY(14deg) scale(1, 0.25). Labels are
     * drawn with the inverse of this matrix (undistorted glyphs, uniform
     * zoom only) and then rotated onto the on-screen angle of a building
     * axis, so they run along the buildings in the city raster.
     *
     * axisX/axisY: for each map axis the on-screen shrink factor of one
     * canvas pixel and the on-screen angle, flipped where needed so text
     * never renders right-to-left.
     */
    SkewMatrix: (() => {
        const tanX = Math.tan(-63.5 * Math.PI / 180);
        const tanY = Math.tan(14 * Math.PI / 180);
        const a = 1 + tanX * tanY, b = tanY, c = 0.25 * tanX, d = 0.25;
        const det = a * d - b * c;

        const axis = (dx, dy) => {
            let angle = Math.atan2(dy, dx);
            if (Math.cos(angle) < 0) angle += Math.PI;
            if (angle > Math.PI) angle -= 2 * Math.PI;
            return { f: Math.hypot(dx, dy), angle };
        };

        return {
            a, b, c, d,
            inv: { a: d / det, b: -b / det, c: -c / det, d: a / det },
            axisX: axis(a, b),
            axisY: axis(c, d)
        };
    })(),


    /**
     * Renders the whole map: builds the view (canvas size, unlocked areas)
     * and lets every registered layer draw onto it. A failing layer is
     * logged and skipped so a broken extension layer cannot kill the map.
     */
    render: () => {
        // jQuery lookup on purpose: the PopupAwareInit patch also searches
        // open pop-up windows, plain document.getElementById would miss the
        // canvas after the box was popped out
        const canvas = $('#city-builder-canvas')[0];
        if (!canvas) {
            console.warn('CityBuilder: Canvas element not found!');
            return;
        }

        const view = CityBuilder.Renderer.buildView(canvas);

        for (const layer of CityBuilder.Renderer.Layers) {
            try {
                layer.draw(view);
            } catch (err) {
                console.error(`CityBuilder: Layer "${layer.name}" failed`, err);
            }
        }
    },


    /**
     * Registers an additional drawing layer.
     *
     * @param {string} name - Unique layer name.
     * @param {Function} draw - Callback invoked with the view object.
     * @param {string} [before] - Insert before this layer; appended when omitted.
     */
    registerLayer: (name, draw, before) => {
        const layers = CityBuilder.Renderer.Layers;
        const entry = { name, draw };
        const idx = before ? layers.findIndex(l => l.name === before) : -1;
        if (idx >= 0) layers.splice(idx, 0, entry);
        else layers.push(entry);
    },


    /**
     * Collects everything the layers need: the unlocked map areas, the map
     * extent and the sized, cleared canvas context.
     *
     * @param {HTMLCanvasElement} canvas - The map canvas.
     * @returns {Object} View object { canvas, ctx, areas, maxX, maxY, scale, width, height }.
     */
    buildView: (canvas) => {
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
        if (!areas) areas = [];

        let maxX = 0, maxY = 0;
        for (const area of areas) {
            maxX = Math.max(maxX, parseInt(area.x || 0) + parseInt(area.width || 16));
            maxY = Math.max(maxY, parseInt(area.y || 0) + parseInt(area.length || area.height || 16));
        }

        // fallback: derive the extent from the buildings when areas are missing
        if ((maxX === 0 || maxY === 0) && CityBuilder.Data && CityBuilder.Data.length > 0) {
            for (const b of CityBuilder.Data) {
                maxX = Math.max(maxX, parseInt(b.x || 0) + parseInt(b.width || 0));
                maxY = Math.max(maxY, parseInt(b.y || 0) + parseInt(b.height || 0));
            }
            maxX += 4;
            maxY += 4;
        }

        maxX = Math.max(maxX, 60);
        maxY = Math.max(maxY, 60);

        const scale = CityBuilder.MapScale;
        const width = maxX * scale;
        const height = maxY * scale;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        return { canvas, ctx, areas, maxX, maxY, scale, width, height };
    },


    /**
     * Resolves the fill color for a building, preferring the shared CSS
     * variables so the map matches the city map module's color scheme.
     *
     * @param {Object} b - Layout entry.
     * @param {Map} cache - Per-render cache for resolved CSS variables.
     * @returns {string} CSS color.
     */
    buildingColor: (b, cache) => {
        let type = b.type || 'generic_building';
        if (type.includes('street') || b.name === 'Road') type = 'street';
        if (b.street_level === 0 && type !== 'street') type = 'roadless';

        if (type === 'street') return (parseInt(b.level) >= 2) ? '#111111' : '#333333';
        if (type === 'roadless') return '#8A2BE2';

        const fallbacks = {
            main_building: '#FFD700',
            greatbuilding: '#FF4500',
            generic_building: '#A0A0A0'
        };

        if (!cache.has(type)) {
            let color = '';
            try {
                color = getComputedStyle(document.documentElement)
                    .getPropertyValue(`--background-color-${type}`).trim();
            } catch (e) { /* variables stylesheet not available */ }
            cache.set(type, color || fallbacks[type] || '#87CEEB');
        }
        return cache.get(type);
    },


    /**
     * Draws one building name along the building's longer axis: the label is
     * rendered through the inverse skew matrix (undistorted glyphs, plain
     * uniform zoom) and rotated onto the on-screen angle of that axis, so it
     * follows the building direction in the city raster. Names that do not
     * fit one line are word-wrapped when the footprint offers room for more
     * lines, shrunk once, and end with an ellipsis as the last resort.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Object} b - Layout entry with a name.
     * @param {number} scale - Canvas pixels per map tile.
     */
    drawLabel: (ctx, b, scale) => {
        const M = CityBuilder.Renderer.SkewMatrix;
        const alongX = b.width >= b.height;
        const axis = alongX ? M.axisX : M.axisY;
        const longPx = (alongX ? b.width : b.height) * scale;
        const shortPx = (alongX ? b.height : b.width) * scale;

        // usable box in screen units: the text chord along the building axis
        // and the perpendicular room where additional lines can stack
        const maxW = longPx * axis.f * 0.92;
        const maxH = shortPx * 0.44;
        if (maxW < 22 || maxH < 9) return;

        let font = Math.max(7, Math.min(13, Math.round(maxH * 0.5)));

        // greedy word wrap (spaces and hyphen joints are break points) onto
        // as many lines as the cross room allows, at most three
        const wrap = (fontPx) => {
            ctx.font = `${fontPx}px sans-serif`;
            const lineHeight = Math.round(fontPx * 1.15);
            const maxLines = Math.max(1, Math.min(3, Math.floor(maxH / lineHeight)));
            const words = b.name.split(/\s+/).flatMap(w => w.split(/(?<=-)/));
            const lines = [];
            let line = '';
            for (const word of words) {
                const probe = line ? line + (line.endsWith('-') ? '' : ' ') + word : word;
                if (line && ctx.measureText(probe).width > maxW) {
                    lines.push(line);
                    line = word;
                } else {
                    line = probe;
                }
            }
            if (line) lines.push(line);
            return { lines, lineHeight, maxLines };
        };

        let { lines, lineHeight, maxLines } = wrap(font);
        if ((lines.length > maxLines || lines.some(l => ctx.measureText(l).width > maxW)) && font > 7) {
            font = Math.max(7, Math.floor(font * 0.75));
            ({ lines, lineHeight, maxLines } = wrap(font));
        }
        if (lines.length > maxLines) {
            lines = lines.slice(0, maxLines);
            lines[maxLines - 1] += '…';
        }
        lines = lines.map(l => {
            if (ctx.measureText(l).width <= maxW) return l;
            let t = l.replace(/…$/, '');
            while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
            return t + '…';
        });

        ctx.save();
        ctx.translate((b.x + b.width / 2) * scale, (b.y + b.height / 2) * scale);
        ctx.transform(M.inv.a, M.inv.b, M.inv.c, M.inv.d, 0, 0);
        ctx.rotate(axis.angle);
        for (let i = 0; i < lines.length; i++) {
            const y = (i - (lines.length - 1) / 2) * lineHeight;
            ctx.strokeText(lines[i], 0, y);
            ctx.fillText(lines[i], 0, y);
        }
        ctx.restore();
    },


    /**
     * Draws the outline around the unlocked areas: shared edges of adjacent
     * areas cancel out, only the true border of the city remains.
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context.
     * @param {Array<Object>} areas - Unlocked area rectangles.
     * @param {number} scale - Canvas pixels per map tile.
     */
    drawOutline: (ctx, areas, scale) => {
        const edges = {};

        const addEdge = (x1, y1, x2, y2) => {
            const key = x1 < x2 || (x1 === x2 && y1 < y2)
                ? `${x1},${y1}-${x2},${y2}`
                : `${x2},${y2}-${x1},${y1}`;
            if (edges[key]) delete edges[key];
            else edges[key] = { x1, y1, x2, y2 };
        };

        for (const area of areas) {
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
        for (const key in edges) {
            const edge = edges[key];
            ctx.moveTo(edge.x1 * scale, edge.y1 * scale);
            ctx.lineTo(edge.x2 * scale, edge.y2 * scale);
        }
        ctx.stroke();
    }
};


/**
 * The built-in layer stack, drawn bottom to top.
 */
CityBuilder.Renderer.Layers = [
    {
        // green overlay for the unlocked areas, neutral fallback otherwise
        name: 'background',
        draw: (v) => {
            if (v.areas.length > 0) {
                v.ctx.fillStyle = 'rgba(124, 230, 76, 0.3)';
                for (const area of v.areas) {
                    v.ctx.fillRect(
                        parseInt(area.x) * v.scale,
                        parseInt(area.y) * v.scale,
                        parseInt(area.width || 16) * v.scale,
                        parseInt(area.length || area.height || 16) * v.scale
                    );
                }
            } else {
                v.ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
                v.ctx.fillRect(0, 0, v.width, v.height);
            }
        }
    },
    {
        // fine 1x1 tile raster
        name: 'grid',
        draw: (v) => {
            v.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            v.ctx.lineWidth = 1;
            v.ctx.beginPath();
            for (let x = 0; x <= v.maxX; x++) {
                v.ctx.moveTo(x * v.scale, 0);
                v.ctx.lineTo(x * v.scale, v.height);
            }
            for (let y = 0; y <= v.maxY; y++) {
                v.ctx.moveTo(0, y * v.scale);
                v.ctx.lineTo(v.width, y * v.scale);
            }
            v.ctx.stroke();
        }
    },
    {
        // area borders, or a coarse 4x4 raster when areas are missing
        name: 'sectors',
        draw: (v) => {
            v.ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            v.ctx.lineWidth = 1.5;
            v.ctx.beginPath();
            if (v.areas.length > 0) {
                for (const area of v.areas) {
                    v.ctx.rect(
                        parseInt(area.x) * v.scale,
                        parseInt(area.y) * v.scale,
                        parseInt(area.width || 16) * v.scale,
                        parseInt(area.length || area.height || 16) * v.scale
                    );
                }
            } else {
                for (let x = 0; x <= v.maxX; x += 4) {
                    v.ctx.moveTo(x * v.scale, 0);
                    v.ctx.lineTo(x * v.scale, v.height);
                }
                for (let y = 0; y <= v.maxY; y += 4) {
                    v.ctx.moveTo(0, y * v.scale);
                    v.ctx.lineTo(v.width, y * v.scale);
                }
            }
            v.ctx.stroke();
        }
    },
    {
        // all buildings and roads of the planned layout
        name: 'buildings',
        draw: (v) => {
            if (!CityBuilder.Data) return;
            const cssCache = new Map();

            for (const b of CityBuilder.Data) {
                const isStreet = (b.type || '').includes('street') || b.name === 'Road';
                const bx = parseInt(b.x || 0) * v.scale;
                const by = parseInt(b.y || 0) * v.scale;
                const bw = parseInt(b.width || 1) * v.scale;
                const bh = parseInt(b.height || 1) * v.scale;

                v.ctx.fillStyle = CityBuilder.Renderer.buildingColor(b, cssCache);
                v.ctx.fillRect(bx, by, bw, bh);

                if (!isStreet) {
                    v.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
                    v.ctx.lineWidth = 1;
                    v.ctx.strokeRect(bx, by, bw, bh);
                } else if (parseInt(b.level) >= 2 && parseInt(b.width || 1) >= 2) {
                    // two-lane pieces are 2x2 blocks - outline them so they are
                    // distinguishable from two parallel one-lane roads
                    v.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                    v.ctx.lineWidth = 1.5;
                    v.ctx.strokeRect(bx + 1.5, by + 1.5, bw - 3, bh - 3);
                }
            }
        }
    },
    {
        // bright border around the unlocked city area
        name: 'outline',
        draw: (v) => {
            if (v.areas.length > 0) CityBuilder.Renderer.drawOutline(v.ctx, v.areas, v.scale);
        }
    },
    {
        // building names, toggled by the names option in the controls
        name: 'labels',
        draw: (v) => {
            if (!CityBuilder.ShowNames || !CityBuilder.Data) return;
            v.ctx.save();
            v.ctx.textAlign = 'center';
            v.ctx.textBaseline = 'middle';
            v.ctx.lineWidth = 3;
            v.ctx.lineJoin = 'round';
            v.ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
            v.ctx.fillStyle = '#ffffff';
            for (const b of CityBuilder.Data) {
                if (!b.name || b.name === 'Road' || (b.type || '').includes('street')) continue;
                CityBuilder.Renderer.drawLabel(v.ctx, b, v.scale);
            }
            v.ctx.restore();
        }
    },
    {
        // hover / remove highlight requested by the interaction part
        name: 'highlight',
        draw: (v) => {
            const h = CityBuilder.Renderer.Highlight;
            if (!h || !h.building) return;
            const b = h.building;
            const bx = b.x * v.scale, by = b.y * v.scale;
            const bw = b.width * v.scale, bh = b.height * v.scale;

            if (h.mode === 'remove') {
                v.ctx.fillStyle = 'rgba(255, 60, 60, 0.45)';
                v.ctx.strokeStyle = '#ff5050';
            } else {
                v.ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                v.ctx.strokeStyle = '#ffffff';
            }
            v.ctx.fillRect(bx, by, bw, bh);
            v.ctx.lineWidth = 2.5;
            v.ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2);
        }
    }
];
