'use strict'

const submitWindow = document.querySelector('.overlay');
const submitBtn = document.querySelector('.overlay button');
const submitError = document.querySelector('.overlay .error');
const storeBuildingsBtn = document.querySelector('#storeAll');
const storeSelectionBtn = document.querySelector('#storeSelection');
let buildingsListEl = document.querySelector('#buildings ul');
const mapWrapper = document.querySelector('#canvasWrapper');

const zoomInBtn = document.querySelector('#zoomIn');
const zoomOutBtn = document.querySelector('#zoomOut');
let zoomScale = 0.75;
let camX = 0;
let camY = 0;
const zoomSteps = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

const fontSize = 15;
const font = fontSize + 'px Arial';

let canvas = document.getElementById('planner');
const ctx = canvas.getContext('2d', { alpha: true });

ctx.textBaseline = 'middle';
ctx.font = font;
ctx.textAlign = 'center';
ctx.lineWidth = 2;

let metaData = {};
let cityData = {};
let mapData = {};
let occupiedTiles = new Map();
let mapBuildings = [];
let storedBuildings = [];
let selectedBuildings = [];
let activeBuilding = null;
let placingBuilding = null;
let dragCopy = null;
let zoom = 2500;

const size = 30;

let metaById = new Map();

let gridCanvas = null;
let gridCtx = null;
let lastMouseElem = null;

let sidebarState = {
    sortBy: 'area-desc',   // 'name-asc', 'name-desc', 'width-asc', 'width-desc', 'height-asc', 'height-desc', 'area-desc', ...
    filterText: '',
    filterType: 'all',     // e.g. 'all', 'residential', 'production', ...
    filterStreetReq: 'all' // 'all', 'street', 'nostreet'
};

function init(data) {
    metaData = data.CityEntities;
    cityData = data.CityMapData;
    mapData = data.UnlockedAreas;

    metaById = new Map(Object.values(metaData).map(m => [m.id, m]));

    resizeCanvasToCSSSize(canvas, ctx);
    rebuildGridLayer();

    drawMap();
    updateStats();
    mapDrag();
}

function tileKey(x, y) {
    return x + ',' + y;
}

function canvasToTileX(x) {
    return Math.round(x / size);
}

function canvasToTileY(y) {
    return Math.round(y / size);
}

function getBuildingTileRect(building, x = building.x, y = building.y) {
    return {
        x: canvasToTileX(x),
        y: canvasToTileY(y),
        w: Math.round(building.width / size),
        h: Math.round(building.height / size)
    };
}

function rebuildOccupiedTiles() {
    occupiedTiles.clear();

    for (const building of mapBuildings) {
        addBuildingToOccupiedTiles(building);
    }
}

function addBuildingToOccupiedTiles(building) {
    const rect = getBuildingTileRect(building);

    for (let ty = rect.y; ty < rect.y + rect.h; ty++) {
        for (let tx = rect.x; tx < rect.x + rect.w; tx++) {
            occupiedTiles.set(tileKey(tx, ty), building);
        }
    }
}

function removeBuildingFromOccupiedTiles(building) {
    const rect = getBuildingTileRect(building);

    for (let ty = rect.y; ty < rect.y + rect.h; ty++) {
        for (let tx = rect.x; tx < rect.x + rect.w; tx++) {
            const key = tileKey(tx, ty);
            if (occupiedTiles.get(key) === building) {
                occupiedTiles.delete(key);
            }
        }
    }
}

function getStoredBuildingGroups() {
    const groups = new Map();

    for (const building of storedBuildings) {
        if (building.meta.type === 'street') continue;

        const id = String(building.meta.id);
        const width = building.meta.width ?? building.meta.components?.AllAge?.placement?.size?.x ?? 1;
        const height = building.meta.length ?? building.meta.components?.AllAge?.placement?.size?.y ?? 1;

        if (!groups.has(id)) {
            groups.set(id, {
                id,
                name: building.meta.name,
                type: building.meta.type,
                width,
                height,
                area: width * height,
                noStreet: building.streetReq === 0,
                amount: 1,
                sample: building
            });
        } else {
            groups.get(id).amount += 1;
        }
    }

    return Array.from(groups.values());
}

function filterStoredBuildingGroups(groups) {
    return groups.filter(item => {
        if (sidebarState.filterType !== 'all' && item.type !== sidebarState.filterType) {
            return false;
        }

        if (sidebarState.filterStreetReq === 'street' && item.noStreet) {
            return false;
        }

        if (sidebarState.filterStreetReq === 'nostreet' && !item.noStreet) {
            return false;
        }

        if (sidebarState.filterText) {
            const text = sidebarState.filterText.toLowerCase();
            const haystack = `${item.name} ${item.width}x${item.height} ${item.type}`.toLowerCase();
            if (!haystack.includes(text)) return false;
        }

        return true;
    });
}

function sortStoredBuildingGroups(groups) {
    const arr = [...groups];

    arr.sort((a, b) => {
        switch (sidebarState.sortBy) {
            case 'name-asc':
                return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);

            case 'name-desc':
                return b.name.localeCompare(a.name) || a.id.localeCompare(b.id);

            case 'width-asc':
                return a.width - b.width || a.height - b.height || a.name.localeCompare(b.name);

            case 'width-desc':
                return b.width - a.width || b.height - a.height || a.name.localeCompare(b.name);

            case 'height-asc':
                return a.height - b.height || a.width - b.width || a.name.localeCompare(b.name);

            case 'height-desc':
                return b.height - a.height || b.width - a.width || a.name.localeCompare(b.name);

            case 'area-asc':
                return a.area - b.area || a.name.localeCompare(b.name);

            case 'area-desc':
            default:
                return b.area - a.area || a.name.localeCompare(b.name);
        }
    });

    return arr;
}

function updateStats() {
    const oldStreetsEl = document.querySelector('.old .streets');
    const oldStreetAmount = Object.values(cityData).filter(x => x.type === 'street').length;
    oldStreetsEl.textContent = oldStreetAmount;

    const newStreetsEl = document.querySelector('.new .streets');
    const streetAmount = mapBuildings.filter(x => x.data.type === 'street').length;
    newStreetsEl.textContent = streetAmount;
}

function rebuildGridLayer() {
    const dpr = window.devicePixelRatio || 1;

    gridCanvas = document.createElement('canvas');
    gridCanvas.width = canvas.width;
    gridCanvas.height = canvas.height;
    gridCtx = gridCanvas.getContext('2d');

    gridCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (mapData) {
        for (const exp of mapData) drawExpansion(exp, gridCtx);
    }
}

function getCanvasPointElem(canvasEl, evt) {
    const rect = canvasEl.getBoundingClientRect();
    const cssX = evt.clientX - rect.left;
    const cssY = evt.clientY - rect.top;

    return {
        x: cssX / zoomScale + camX,
        y: cssY / zoomScale + camY
    };
}

function resizeCanvasToCSSSize(canvasEl, context) {
    const rect = canvasEl.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const newW = Math.max(1, Math.round(rect.width * dpr));
    const newH = Math.max(1, Math.round(rect.height * dpr));

    if (canvasEl.width !== newW) canvasEl.width = newW;
    if (canvasEl.height !== newH) canvasEl.height = newH;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    context.font = font;
    context.lineWidth = 2;
}

function drawBuildingCopy(context, building, x, y, valid) {
    context.save();

    context.globalAlpha = 0.55;
    context.fillStyle = valid ? '#66c440' : '#ff4d4d';
    context.fillRect(x, y, building.width, building.height);

    context.globalAlpha = 1;
    context.strokeStyle = valid ? '#1d6b2a' : '#8b0000';
    context.lineWidth = 2 / zoomScale;
    context.setLineDash([6 / zoomScale, 4 / zoomScale]);
    context.strokeRect(x, y, building.width, building.height);

    context.restore();
}

function drawMap() {
    const city = Object.values(cityData);
    mapBuildings = [];

    for (const building of city) {
        const buildingData = metaById.get(building.cityentity_id);
        if (!buildingData) continue;

        if (
            buildingData.type !== 'off_grid' &&
            buildingData.type !== 'outpost_ship' &&
            buildingData.type !== 'friends_tavern' &&
            !String(buildingData.type).includes('hub')
        ) {
            const newBuilding = new MapBuilding(building, buildingData);
            mapBuildings.push(newBuilding);
        }
    }

    rebuildOccupiedTiles();
    redrawMap();
}

function drawEmptyMap() {
    mapBuildings = [];
    rebuildOccupiedTiles();
    redrawMap();
}

function redrawMap() {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const dpr = window.devicePixelRatio || 1;

    ctx.setTransform(
        dpr * zoomScale, 0,
        0, dpr * zoomScale,
        -camX * dpr * zoomScale,
        -camY * dpr * zoomScale
    );

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = font;
    ctx.lineWidth = 1 / zoomScale;

    if (gridCanvas) {
        ctx.drawImage(gridCanvas, 0, 0);
    }

    for (const building of mapBuildings) {
        building.draw(ctx);
    }

    if (dragCopy) {
        drawBuildingCopy(ctx, dragCopy.building, dragCopy.x, dragCopy.y, dragCopy.valid);
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
    context.strokeRect((expansion.x || 0) * size, (expansion.y || 0) * size, expansion.width * size, expansion.length * size);
}

function createMapGridPart(data, context) {
    const top = data.y * size;
    const left = data.x * size;

    context.fillRect(left, top, size, size);
    context.strokeRect(left, top, size, size);
}

function snapToGrid(v) {
    return Math.round(v / size) * size;
}

function rectsOverlap(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

function canPlaceAt(building, newX, newY) {

    const rect = getBuildingTileRect(building, newX, newY);

    for (let ty = rect.y; ty < rect.y + rect.h; ty++) {
        for (let tx = rect.x; tx < rect.x + rect.w; tx++) {
            const occupant = occupiedTiles.get(tileKey(tx, ty));
            if (occupant && occupant !== building) {
                return false;
            }
        }
    }

    return true;
}

function hitTestBuilding(pointX, pointY) {
    for (let i = mapBuildings.length - 1; i >= 0; i--) {
        const b = mapBuildings[i];
        if (b.meta.type === 'street') continue;

        if (
            pointX >= b.x && pointX <= b.x + b.width &&
            pointY >= b.y && pointY <= b.y + b.height
        ) {
            return b;
        }
    }
    return null;
}



function storeSelectedBuildings() {
    for (const building of selectedBuildings) {
        building.store();
    }

    selectedBuildings = [];
    document.querySelector('#storeSelection span').textContent = '';
    storeSelectionBtn.classList.remove('show');

    showStoredBuildings();
    redrawMap();
    updateStats();
}

function showStoredBuildings() {
    let groups = getStoredBuildingGroups();
    groups = filterStoredBuildingGroups(groups);
    groups = sortStoredBuildingGroups(groups);

    const html = groups.map(item => {
        const noStreet = item.noStreet ? ' nostreet' : '';

        return (
            '<li data-id="' + item.id + '" class="' + item.type + noStreet + '">' +
                '<span class="name">' + item.name + ' (' + item.height + 'x' + item.width + ')</span>' +
                '<span class="amount">' + (item.amount > 1 ? item.amount : '') + '</span>' +
            '</li>'
        );
    });

    buildingsListEl.innerHTML = html.join('');
}

document.querySelector('#buildings ul').addEventListener('click', (e) => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;

    const metaId = li.dataset.id;
    startPlacingStoredBuilding(metaId);
});

function startPlacingStoredBuilding(metaId) {
    const stored = storedBuildings.find(b => String(b.meta.id) === String(metaId));
    if (!stored) return;

    if (activeBuilding) {
        activeBuilding.isActive = false;
        activeBuilding = null;
    }

    placingBuilding = new MapBuilding(
        {
            ...stored.data,
            x: 0,
            y: 0
        },
        stored.meta
    );

    placingBuilding.isActive = true;
    updatePlacingBuildingPreview();
}

function clampZoomToSteps(target, dir) {
    const steps = zoomSteps;

    let idx = 0;
    for (let i = 0; i < steps.length; i++) {
        if (steps[i] <= zoomScale) idx = i;
    }
    const nextIdx = Math.min(steps.length - 1, Math.max(0, idx + dir));
    return steps[nextIdx];
}

function zoomAtScreenPoint(newZoomScale, screenX, screenY) {
    const pointBefore = {
        x: screenX / zoomScale + camX,
        y: screenY / zoomScale + camY
    };

    zoomScale = newZoomScale;

    camX = pointBefore.x - screenX / zoomScale;
    camY = pointBefore.y - screenY / zoomScale;

    redrawMap();
}

function zoomIn() {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const newScale = clampZoomToSteps(zoomScale, +1);
    zoomAtScreenPoint(newScale, cx, cy);
}

function zoomOut() {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const newScale = clampZoomToSteps(zoomScale, -1);
    zoomAtScreenPoint(newScale, cx, cy);
}

submitBtn.addEventListener('click', async () => {
    try {
        const clipboardContents = await navigator.clipboard.readText();
        const data = JSON.parse(clipboardContents);
        submitWindow.classList.add('hidden');
        init(data);
    } catch (error) {
        console.error(error);
        submitError.textContent = 'The data is corrupted.';
    }
});

zoomInBtn.addEventListener('click', zoomIn);
zoomOutBtn.addEventListener('click', zoomOut);

storeBuildingsBtn.addEventListener('click', () => {
    storedBuildings = storedBuildings.concat(mapBuildings);

    storedBuildings.sort((a, b) => {
        const aArea = (a.meta.length ?? a.meta.components?.AllAge?.placement?.size?.y ?? 1) *
            (a.meta.width ?? a.meta.components?.AllAge?.placement?.size?.x ?? 1);
        const bArea = (b.meta.length ?? b.meta.components?.AllAge?.placement?.size?.y ?? 1) *
            (b.meta.width ?? b.meta.components?.AllAge?.placement?.size?.x ?? 1);
        return bArea - aArea;
    });

    mapBuildings = [];
    rebuildOccupiedTiles();
    activeBuilding = null;
    showStoredBuildings();
    updateStats();
    drawEmptyMap();
});

storeSelectionBtn.addEventListener('click', storeSelectedBuildings);

canvas.addEventListener('click', (e) => {
    if (placingBuilding) return;
    if (e.altKey || e.ctrlKey) return;

    const { x, y } = getCanvasPointElem(canvas, e);

    for (let i = mapBuildings.length - 1; i >= 0; i--) {
        const building = mapBuildings[i];
        if (building.meta.type === 'street') continue;

        if (
            x >= building.x && x <= building.x + building.width &&
            y >= building.y && y <= building.y + building.height
        ) {
            const currentActiveBuilding = mapBuildings.find(x => x.isActive);

            if (currentActiveBuilding && currentActiveBuilding !== building) {
                currentActiveBuilding.isActive = false;
                activeBuilding = building;
                building.isActive = true;
            } else if (currentActiveBuilding === building) {
                building.isActive = false;
                activeBuilding = null;
            } else {
                activeBuilding = building;
                building.isActive = true;
            }

            redrawMap();
            break;
        }
    }
});

document.getElementById('removeStreets').addEventListener('click', () => {
    mapBuildings = mapBuildings.filter(x => x.data.type !== 'street');
    rebuildOccupiedTiles();
    redrawMap();
    updateStats();
});

document.getElementById('reset').addEventListener('click', () => {
    const reset = confirm('Do you want to restart from scratch? Your changes will not be saved');
    if (reset) resetCity();
});

function resetCity() {
    mapBuildings = [];
    storedBuildings = [];
    selectedBuildings = [];
    activeBuilding = null;
    placingBuilding = null;
    dragCopy = null;
    zoom = 2500;

    drawMap();
    updateStats();
    showStoredBuildings();
}

function updatePlacingBuildingPreview() {
    if (!placingBuilding || !lastMouseElem) {
        dragCopy = null;
        redrawMap();
        return;
    }

    const snappedX = snapToGrid(lastMouseElem.x - placingBuilding.width / 2);
    const snappedY = snapToGrid(lastMouseElem.y - placingBuilding.height / 2);

    dragCopy = {
        building: placingBuilding,
        x: snappedX,
        y: snappedY,
        valid: canPlaceAt(placingBuilding, snappedX, snappedY)
    };

    redrawMap();
}

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    if (placingBuilding) {
        placingBuilding = null;
        dragCopy = null;
        redrawMap();
        return;
    }

    for (const b of selectedBuildings) b.isSelected = false;
    selectedBuildings = [];
    document.querySelector('#storeSelection span').textContent = '';
    storeSelectionBtn.classList.remove('show');
    redrawMap();
});

window.addEventListener('resize', () => {
    resizeCanvasToCSSSize(canvas, ctx);
    rebuildGridLayer();
    redrawMap();
});

canvas.addEventListener('mousemove', (e) => {
    lastMouseElem = getCanvasPointElem(canvas, e);

    if (!placingBuilding) return;

    const snappedX = snapToGrid(lastMouseElem.x - placingBuilding.width / 2);
    const snappedY = snapToGrid(lastMouseElem.y - placingBuilding.height / 2);

    const valid = canPlaceAt(placingBuilding, snappedX, snappedY);

    dragCopy = {
        building: placingBuilding,
        x: snappedX,
        y: snappedY,
        valid
    };

    redrawMap();
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (!placingBuilding || !dragCopy) return;
    if (e.altKey || e.ctrlKey) return;
    if (!dragCopy.valid) return;

    const placedMetaId = placingBuilding.meta.id;

    placingBuilding.x = dragCopy.x;
    placingBuilding.y = dragCopy.y;
    placingBuilding.data.x = dragCopy.x / size;
    placingBuilding.data.y = dragCopy.y / size;
    placingBuilding.isActive = false;

    mapBuildings.push(placingBuilding);
    addBuildingToOccupiedTiles(placingBuilding);

    const idx = storedBuildings.findIndex(b => String(b.meta.id) === String(placedMetaId));
    if (idx !== -1) storedBuildings.splice(idx, 1);

    showStoredBuildings();
    updateStats();

    continuePlacingStoredBuilding(placedMetaId);
});

function continuePlacingStoredBuilding(metaId) {
    const nextStored = storedBuildings.find(b => String(b.meta.id) === String(metaId));

    if (!nextStored) {
        placingBuilding = null;
        dragCopy = null;
        redrawMap();
        return;
    }

    placingBuilding = new MapBuilding(
        {
            ...nextStored.data,
            x: 0,
            y: 0
        },
        nextStored.meta
    );

    placingBuilding.isActive = true;
    updatePlacingBuildingPreview();
}

document.querySelector('#buildingSort').addEventListener('change', (e) => {
    sidebarState.sortBy = e.target.value;
    showStoredBuildings();
});

document.querySelector('#buildingFilterText').addEventListener('input', (e) => {
    sidebarState.filterText = e.target.value.trim();
    showStoredBuildings();
});

document.querySelector('#buildingTypeFilter').addEventListener('change', (e) => {
    sidebarState.filterType = e.target.value;
    showStoredBuildings();
});

document.querySelector('#buildingStreetFilter').addEventListener('change', (e) => {
    sidebarState.filterStreetReq = e.target.value;
    showStoredBuildings();
});

function mapDrag() {
    let drag = null;

    const mouseDownHandler = (e) => {
        if (e.button !== 0) return;
        if (placingBuilding) return;

        let mode = null;

        if (e.altKey) mode = 'pan';
        else if (e.ctrlKey) mode = 'select';
        else {
            if (activeBuilding) {
                const p = getCanvasPointElem(canvas, e);
                if (
                    p.x >= activeBuilding.x && p.x <= activeBuilding.x + activeBuilding.width &&
                    p.y >= activeBuilding.y && p.y <= activeBuilding.y + activeBuilding.height
                ) {
                    mode = 'move';
                }
            }
        }

        if (!mode) return;
        e.preventDefault();

        const startElem = getCanvasPointElem(canvas, e);

        drag = {
            mode,
            startClientX: e.clientX,
            startClientY: e.clientY,
            startCamX: camX,
            startCamY: camY,
            startElem,
            endElem: startElem
        };

        if (mode === 'move') {
            drag.building = activeBuilding;
            removeBuildingFromOccupiedTiles(drag.building);

            dragCopy = {
                building: drag.building,
                x: drag.building.x,
                y: drag.building.y,
                valid: true
            };

            drag.grabOffsetX = startElem.x - drag.building.x;
            drag.grabOffsetY = startElem.y - drag.building.y;

            drag.startBuildingX = drag.building.x;
            drag.startBuildingY = drag.building.y;
        }

        document.addEventListener('mousemove', mouseMoveHandler, { passive: false });
        document.addEventListener('mouseup', mouseUpHandler, { passive: false });
    };

    const mouseMoveHandler = (e) => {
        if (!drag) return;
        e.preventDefault();

        if (drag.mode === 'pan') {
            const dx = (e.clientX - drag.startClientX) / zoomScale;
            const dy = (e.clientY - drag.startClientY) / zoomScale;
            camX = drag.startCamX - dx;
            camY = drag.startCamY - dy;
            redrawMap();
            return;
        }

        if (drag.mode === 'select') {
            drag.endElem = getCanvasPointElem(canvas, e);
            return;
        }

        if (drag.mode === 'move') {
            const p = getCanvasPointElem(canvas, e);

            const desiredX = p.x - drag.grabOffsetX;
            const desiredY = p.y - drag.grabOffsetY;

            const snappedX = snapToGrid(desiredX);
            const snappedY = snapToGrid(desiredY);

            const valid = canPlaceAt(drag.building, snappedX, snappedY);

            dragCopy = {
                building: drag.building,
                x: snappedX,
                y: snappedY,
                valid
            };

            if (valid) {
                drag.building.x = snappedX;
                drag.building.y = snappedY;
                drag.building.data.x = snappedX / size;
                drag.building.data.y = snappedY / size;
            }

            redrawMap();
            return;
        }
    };

    const mouseUpHandler = (e) => {
        if (!drag) return;
        e.preventDefault();

        if (drag.mode === 'select') {
            const endElem = getCanvasPointElem(canvas, e);

            const min = {
                x: Math.min(drag.startElem.x, endElem.x),
                y: Math.min(drag.startElem.y, endElem.y)
            };
            const max = {
                x: Math.max(drag.startElem.x, endElem.x),
                y: Math.max(drag.startElem.y, endElem.y)
            };

            let changed = false;

            for (const building of mapBuildings) {
                if (building.meta.type === 'street') continue;

                const intersects =
                    building.x <= max.x &&
                    building.y <= max.y &&
                    (building.x + building.width) >= min.x &&
                    (building.y + building.height) >= min.y;

                if (intersects) {
                    if (!building.isSelected) {
                        building.isSelected = true;
                        selectedBuildings.push(building);
                        changed = true;
                    } else {
                        building.isSelected = false;
                        selectedBuildings = selectedBuildings.filter(b => b !== building);
                        changed = true;
                    }
                }
            }

            if (changed) {
                document.querySelector('#storeSelection span').textContent = selectedBuildings.length;
                storeSelectionBtn.classList.add('show');
                redrawMap();
            }
        }

        if (drag.mode === 'move') {
            addBuildingToOccupiedTiles(drag.building);
            dragCopy = null;
            redrawMap();
        }

        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        drag = null;
        dragCopy = null;
    };

    canvas.addEventListener('mousedown', mouseDownHandler);
}