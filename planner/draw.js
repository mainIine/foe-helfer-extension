'use strict';

window.PlannerApp = window.PlannerApp || {};

(function (app) {
    const state = app.state;
    const dom = app.dom;
    const SIZE = app.SIZE;
    const FONT_SIZE = 15;
    const FONT = FONT_SIZE + 'px Arial';
    const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

    const canvas = dom.canvas;
    const ctx = canvas.getContext('2d', { alpha: true });

    ctx.textBaseline = 'middle';
    ctx.font = FONT;
    ctx.textAlign = 'center';
    ctx.lineWidth = 2;

    function resizeCanvasToCSSSize() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        const newW = Math.max(1, Math.round(rect.width * dpr));
        const newH = Math.max(1, Math.round(rect.height * dpr));

        if (canvas.width !== newW) canvas.width = newW;
        if (canvas.height !== newH) canvas.height = newH;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.font = FONT;
        ctx.lineWidth = 2;
    }

    function getCanvasPointElem(evt) {
        const rect = canvas.getBoundingClientRect();
        const cssX = evt.clientX - rect.left;
        const cssY = evt.clientY - rect.top;

        return {
            x: cssX / state.zoomScale + state.camX,
            y: cssY / state.zoomScale + state.camY
        };
    }

    function rebuildGridLayer() {
        const dpr = window.devicePixelRatio || 1;

        state.gridCanvas = document.createElement('canvas');
        state.gridCanvas.width = canvas.width;
        state.gridCanvas.height = canvas.height;
        state.gridCtx = state.gridCanvas.getContext('2d');

        state.gridCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        if (state.mapData) {
            for (const exp of state.mapData) drawExpansion(exp, state.gridCtx);
        }
    }

    function drawExpansion(expansion, context) {
        context.fillStyle = '#fffead';
        context.strokeStyle = '#cbca4a';
        context.lineWidth = 0.5;

        for (let a = 0; a < expansion.length; a++) {
            for (let b = 0; b < expansion.width; b++) {
                createMapGridPart(
                    {
                        x: ((expansion.x === undefined || Number.isNaN(expansion.x)) ? 0 : expansion.x) + a,
                        y: (expansion.y === undefined ? 0 : expansion.y) + b
                    },
                    context
                );
            }
        }

        context.strokeStyle = '#8c8a19';
        context.strokeRect((expansion.x || 0) * SIZE, (expansion.y || 0) * SIZE, expansion.width * SIZE, expansion.length * SIZE);
    }

    function createMapGridPart(data, context) {
        const top = data.y * SIZE;
        const left = data.x * SIZE;

        context.fillRect(left, top, SIZE, SIZE);
        context.strokeRect(left, top, SIZE, SIZE);
    }

    function drawBuildingCopy(context, building, x, y, valid) {
        context.save();

        context.globalAlpha = 0.55;
        context.fillStyle = valid ? '#66c440' : '#ff4d4d';
        context.fillRect(x, y, building.width, building.height);

        context.globalAlpha = 1;
        context.strokeStyle = valid ? '#1d6b2a' : '#8b0000';
        context.lineWidth = 2 / state.zoomScale;
        context.setLineDash([6 / state.zoomScale, 4 / state.zoomScale]);
        context.strokeRect(x, y, building.width, building.height);

        context.restore();
    }

    function drawMap() {
        const city = Object.values(state.cityData);
        state.mapBuildings = [];

        for (const building of city) {
            const buildingData = state.metaById.get(building.cityentity_id);
            if (!buildingData) continue;

            if (
                buildingData.type !== 'off_grid' &&
                buildingData.type !== 'outpost_ship' &&
                buildingData.type !== 'friends_tavern' &&
                !String(buildingData.type).includes('hub')
            ) {
                const newBuilding = new app.MapBuilding({ ...building }, buildingData);
                state.mapBuildings.push(newBuilding);
            }
        }

        app.rebuildOccupiedTiles();
        redrawMap();
    }

    function drawEmptyMap() {
        state.mapBuildings = [];
        app.rebuildOccupiedTiles();
        redrawMap();
    }

    function redrawMap() {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        const dpr = window.devicePixelRatio || 1;

        ctx.setTransform(
            dpr * state.zoomScale, 0,
            0, dpr * state.zoomScale,
            -state.camX * dpr * state.zoomScale,
            -state.camY * dpr * state.zoomScale
        );

        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.font = FONT;
        ctx.lineWidth = 1 / state.zoomScale;

        if (state.gridCanvas) {
            ctx.drawImage(state.gridCanvas, 0, 0);
        }

        for (const building of state.mapBuildings) {
            building.draw(ctx);
        }

        if (state.dragCopy) {
            drawBuildingCopy(ctx, state.dragCopy.building, state.dragCopy.x, state.dragCopy.y, state.dragCopy.valid);
        }

        drawStreetPreview(ctx);
    }

    function updateStats() {
        const oldStreetAmount = Object.values(state.cityData).filter(x => x.type === 'street').length;
        dom.oldStreetsEl.textContent = oldStreetAmount;

        const streetAmount = state.mapBuildings.filter(x => x.data.type === 'street').length;
        dom.newStreetsEl.textContent = streetAmount;
    }

    function clampZoomToSteps(dir) {
        let idx = 0;
        for (let i = 0; i < ZOOM_STEPS.length; i++) {
            if (ZOOM_STEPS[i] <= state.zoomScale) idx = i;
        }
        const nextIdx = Math.min(ZOOM_STEPS.length - 1, Math.max(0, idx + dir));
        return ZOOM_STEPS[nextIdx];
    }

    function zoomAtScreenPoint(newZoomScale, screenX, screenY) {
        const pointBefore = {
            x: screenX / state.zoomScale + state.camX,
            y: screenY / state.zoomScale + state.camY
        };

        state.zoomScale = newZoomScale;
        state.camX = pointBefore.x - screenX / state.zoomScale;
        state.camY = pointBefore.y - screenY / state.zoomScale;

        redrawMap();
    }

    function zoomIn() {
        const rect = canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const newScale = clampZoomToSteps(+1);
        zoomAtScreenPoint(newScale, cx, cy);
    }

    function zoomOut() {
        const rect = canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;

        const newScale = clampZoomToSteps(-1);
        zoomAtScreenPoint(newScale, cx, cy);
    }

    function drawStreetPreview(context) {
        const streetState = state.streetPlacement;
        if (!streetState.active || !streetState.previewTiles.length) return;

        context.save();

        for (const tile of streetState.previewTiles) {
            const blocked = app.isTileOccupiedByNonStreet(tile.x, tile.y);

            context.globalAlpha = 0.55;
            context.fillStyle = blocked ? '#ff4d4d' : '#66c440';
            context.fillRect(tile.x * SIZE, tile.y * SIZE, SIZE, SIZE);

            context.globalAlpha = 1;
            context.strokeStyle = blocked ? '#8b0000' : '#1d6b2a';
            context.lineWidth = 2 / state.zoomScale;
            context.setLineDash([6 / state.zoomScale, 4 / state.zoomScale]);
            context.strokeRect(tile.x * SIZE, tile.y * SIZE, SIZE, SIZE);
        }

        context.restore();
    }

    app.ctx = ctx;
    app.resizeCanvasToCSSSize = resizeCanvasToCSSSize;
    app.getCanvasPointElem = getCanvasPointElem;
    app.rebuildGridLayer = rebuildGridLayer;
    app.drawExpansion = drawExpansion;
    app.createMapGridPart = createMapGridPart;
    app.drawBuildingCopy = drawBuildingCopy;
    app.drawMap = drawMap;
    app.drawEmptyMap = drawEmptyMap;
    app.redrawMap = redrawMap;
    app.updateStats = updateStats;
    app.clampZoomToSteps = clampZoomToSteps;
    app.zoomAtScreenPoint = zoomAtScreenPoint;
    app.zoomIn = zoomIn;
    app.zoomOut = zoomOut;
    app.drawStreetPreview = drawStreetPreview;
})(window.PlannerApp);