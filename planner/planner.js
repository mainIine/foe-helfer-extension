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


let metaData = {}
let cityData = {}
let mapData = {}
let mapBuildings = []
let storedBuildings = []
let selectedBuildings = []
let activeBuilding = null
let dragCopy = null
let zoom = 2500

const size = 30

let metaById = new Map()

let gridCanvas = null
let gridCtx = null

function init(data) {
    metaData = data.CityEntities
    cityData = data.CityMapData
    mapData = data.UnlockedAreas

    metaById = new Map(Object.values(metaData).map(m => [m.id, m]))

    resizeCanvasToCSSSize(canvas, ctx)

    rebuildGridLayer()

    drawMap()
    updateStats()
    mapDrag()
}

function updateStats() {
    const oldStreetsEl = document.querySelector('.old .streets')
    const oldStreetAmount = Object.values(cityData).filter(x => x.type === 'street').length
    oldStreetsEl.textContent = oldStreetAmount

    const newStreetsEl = document.querySelector('.new .streets')
    const streetAmount = mapBuildings.filter(x => x.data.type === 'street').length
    newStreetsEl.textContent = streetAmount
}


function rebuildGridLayer() {
  const dpr = window.devicePixelRatio || 1;

  gridCanvas = document.createElement('canvas');
  gridCanvas.width = canvas.width;
  gridCanvas.height = canvas.height;
  gridCtx = gridCanvas.getContext('2d');

  gridCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (mapData) for (const exp of mapData) drawExpansion(exp, gridCtx);
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
    const city = Object.values(cityData)
    mapBuildings = []

    for (const building of city) {
        const buildingData = metaById.get(building.cityentity_id)
        if (!buildingData) continue

        if (
            buildingData.type !== 'off_grid' &&
            buildingData.type !== 'outpost_ship' &&
            buildingData.type !== 'friends_tavern' &&
            !String(buildingData.type).includes('hub')
        ) {
            const newBuilding = new MapBuilding(building, buildingData)
            mapBuildings.push(newBuilding)
        }
    }

    redrawMap()
}

function drawEmptyMap() {
    mapBuildings = []
    redrawMap()
}

function redrawMap() {
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
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

    for (const building of mapBuildings) building.draw(ctx);

    if (dragCopy) {
        drawBuildingCopy(ctx, dragCopy.building, dragCopy.x, dragCopy.y, dragCopy.valid);
    }
}

function drawExpansion(expansion, context) {
    context.fillStyle = '#fffead'
    context.strokeStyle = '#cbca4a'
    context.lineWidth = 0.5

    for (let a = 0; a < expansion.length; a++) {
        for (let b = 0; b < expansion.width; b++) {
            createMapGridPart(
                {
                    x: ((expansion.x === undefined || Number.isNaN(expansion.x)) ? 0 : expansion.x) + a,
                    y: (expansion.y === undefined ? 0 : expansion.y) + b
                },
                context
            )
        }
    }

    context.strokeStyle = '#8c8a19'
    context.strokeRect((expansion.x || 0) * size, (expansion.y || 0) * size, expansion.width * size, expansion.length * size)
}

function createMapGridPart(data, context) {
    const top = data.y * size
    const left = data.x * size

    context.fillRect(left, top, size, size)
    context.strokeRect(left, top, size, size)
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
    const test = { x: newX, y: newY, w: building.width, h: building.height };

    for (const other of mapBuildings) {
        if (other === building) continue;
        const o = { x: other.x, y: other.y, w: other.width, h: other.height };
        if (rectsOverlap(test, o)) return false;
    }
    return true;
}

function hitTestBuilding(pointX, pointY) {
    for (let i = mapBuildings.length - 1; i >= 0; i--) {
        const b = mapBuildings[i];
        if (b.meta.type === 'street') continue;
        if (pointX >= b.x && pointX <= b.x + b.width &&
                pointY >= b.y && pointY <= b.y + b.height) {
            return b;
        }
    }
    return null;
}

class MapBuilding {
    constructor(data, meta) {
        this.data = data
        this.meta = meta
        this.name = meta.name

        this.x = (data.x * size) || 0
        this.y = (data.y * size) || 0

        const w = meta.width ?? meta.components?.AllAge?.placement?.size?.x ?? 1
        const h = meta.length ?? meta.components?.AllAge?.placement?.size?.y ?? 1
        this.width = size * w
        this.height = size * h

        this.isSelected = false
        this.isActive = false

        this.streetReq = this.setNeedsStreet()
        this.fill = this.setFillColor()
        this.stroke = this.setStrokeColor()
        this.hasLabel = !(this.meta.type === 'street' || this.height === size || this.width === size)
    }

    setNeedsStreet() {
        let needsStreet = this.meta.requirements?.street_connection_level

        if (needsStreet === undefined) {
            if (Array.isArray(this.meta.abilities)) {
                for (const ability of this.meta.abilities) {
                    if (ability?.__class__ === 'StreetConnectionRequirementComponent') {
                        needsStreet = 1
                        break
                    }
                }
            }
            const req = this.meta.components?.AllAge?.streetConnectionRequirement
            if (req !== undefined) needsStreet = req.requiredLevel
        }
        return (needsStreet === undefined ? 0 : needsStreet)
    }

    setFillColor() {
        let color = '#888'

        if (this.meta.type === 'main_building') color = '#ffb300'
        else if (this.meta.type === 'military') color = '#fff'
        else if (this.meta.type === 'greatbuilding') color = '#e6542f'
        else if (this.meta.type === 'residential') color = '#7abaff'
        else if (this.meta.type === 'production') color = '#416dff'

        if (this.streetReq === 0) color = '#793bc9'
        return color
    }

    setStrokeColor() {
        let color = '#888'

        if (this.meta.type === 'main_building') color = '#ffb300'
        else if (this.meta.type === 'greatbuilding') color = '#af3d2b'
        else if (this.meta.type === 'residential') color = '#219eff'
        else if (this.meta.type === 'production') color = '#2732ff'

        if (this.streetReq === 0) color = '#3d2783'
        return color
    }

    draw(context) {
        context.fillStyle = this.isSelected ? '#eee' : this.isActive ? '#66c440' : this.fill
        context.strokeStyle = this.isSelected ? '#111' : this.stroke

        context.fillRect(this.x, this.y, this.width, this.height)
        ctx.lineWidth = 2
        context.strokeRect(this.x, this.y, this.width, this.height)

        this.drawName(context)
    }

    drawName(context) {
        if (!this.hasLabel) return

        context.fillStyle = '#000'
        context.font = this.isSelected ? ('bold ' + font) : font

        const text = context.measureText(this.name)
        let sizeOffset = fontSize + Math.ceil(fontSize * 0.4)

        if (text.width < this.width) {
            // name can fit in one line
            context.fillText(this.name, this.x + this.width / 2, this.y + this.height / 2 - Math.ceil(fontSize * 0.3))
            sizeOffset = fontSize - 2
        } else if (this.height > size && this.width > size) {
            // name is longer (split into two lines)
            const ratio = Math.ceil(text.width / (this.width - 30))
            let textStart = 0
            let textEnd = Math.ceil(this.name.length / ratio)

            context.fillText(this.name.slice(textStart, textEnd), this.x + this.width / 2, this.y + this.height / 2 - Math.ceil(fontSize * 0.9))
            textStart = textEnd
            textEnd = Math.ceil(this.name.length / ratio) + textStart
            const more = (textEnd >= this.name.length) ? '' : '…'
            context.fillText(this.name.slice(textStart, textEnd) + more, this.x + this.width / 2, this.y + this.height / 2 + Math.ceil(fontSize * 0.2))
        }

        // size label
        const totalSize = (this.height / size) + 'x' + (this.width / size)
        context.font = '12px Arial'
        context.fillText(totalSize, this.x + this.width / 2, this.y + this.height / 2 + sizeOffset)

        // reset font to default
        context.font = font
    }

    store() {
        const idx = mapBuildings.indexOf(this)
        if (idx !== -1) mapBuildings.splice(idx, 1)
        this.x = 0
        this.y = 0
        storedBuildings.push(this)
    }
}


function storeSelectedBuildings() {
    for (const building of selectedBuildings) {
        building.store()
    }
    selectedBuildings = []
    document.querySelector('#storeSelection span').textContent = '';
    storeSelectionBtn.classList.remove('show');

    showStoredBuildings()
    redrawMap()
    updateStats()
}

function showStoredBuildings() {
    const html = []
    const buildingsAmount = new Map()

    for (const building of storedBuildings) {
        if (building.meta.type === 'street') continue;
        const amount = buildingsAmount.get(building.meta.id)
        buildingsAmount.set(building.meta.id, amount === undefined ? 1 : amount + 1)
    }

    buildingsAmount.forEach((amount, buildingId) => {
        const building = storedBuildings.find(x => x.meta.id === buildingId)
        if (!building) return
        const noStreet = (building.streetReq === 0) ? ' nostreet' : ''
        const w = building.meta.width ?? building.meta.components?.AllAge?.placement?.size?.x
        const h = building.meta.length ?? building.meta.components?.AllAge?.placement?.size?.y

        html.push(
            '<li id="' + building.meta.id + '" class="' + building.meta.type + noStreet + '">' +
            '<span class="name">' + building.meta.name + ' (' + h + 'x' + w + ')</span>' +
            '<span class="amount">' + (amount > 1 ? amount : '') + '</span></li>'
        )
    })

    buildingsListEl.innerHTML = html.join('')
}


submitBtn.addEventListener('click', async () => {
    try {
        const clipboardContents = await navigator.clipboard.readText()
        const data = JSON.parse(clipboardContents)
        submitWindow.classList.add('hidden')
        init(data)
    } catch (error) {
        console.error(error)
        submitError.textContent = 'The data is corrupted.'
    }
});

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

zoomInBtn.addEventListener('click', zoomIn);
zoomOutBtn.addEventListener('click', zoomOut);

storeBuildingsBtn.addEventListener('click', () => {
    storedBuildings = storedBuildings.concat(mapBuildings)

    // sort by size
    storedBuildings.sort((a, b) => {
        const aArea = (a.meta.length ?? a.meta.components?.AllAge?.placement?.size?.y ?? 1) *
                                    (a.meta.width ?? a.meta.components?.AllAge?.placement?.size?.x ?? 1)
        const bArea = (b.meta.length ?? b.meta.components?.AllAge?.placement?.size?.y ?? 1) *
                                    (b.meta.width ?? b.meta.components?.AllAge?.placement?.size?.x ?? 1)
        return bArea - aArea
    })

    mapBuildings = []
    showStoredBuildings()
    updateStats()
    drawEmptyMap()
})

storeSelectionBtn.addEventListener('click', storeSelectedBuildings)

canvas.addEventListener('click', (e) => {
    if (e.altKey || e.ctrlKey) return

    const { x, y } = getCanvasPointElem(canvas, e)

    for (let i = mapBuildings.length - 1; i >= 0; i--) {
        const building = mapBuildings[i]
        if (building.meta.type === 'street') continue

        if (x >= building.x && x <= building.x + building.width && y >= building.y && y <= building.y + building.height) {
            let currentActiveBuilding = mapBuildings.find(x => x.isActive);

            if (currentActiveBuilding) {
              currentActiveBuilding.isActive = false;
              activeBuilding = building
            }
            else {
              activeBuilding = null
            }
            building.isActive = !building.isActive

            redrawMap()
            break
        }
    }
})

document.getElementById('removeStreets').addEventListener('click', () => {
    mapBuildings = mapBuildings.filter(x => x.data.type !== 'street')
    redrawMap()
    updateStats()
})

document.getElementById('reset').addEventListener('click', () => {
    const reset = confirm('Do you want to restart from scratch? Your changes will not be saved')
    if (reset) resetCity()
})

function resetCity() {
    mapBuildings = []
    storedBuildings = []
    selectedBuildings = []
    zoom = 2500

    drawMap()
    updateStats()
    showStoredBuildings()
}

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault()
    for (const b of selectedBuildings) b.isSelected = false
    selectedBuildings = []
    document.querySelector('#storeSelection span').textContent = '';
    storeSelectionBtn.classList.remove('show');
    redrawMap()
})

window.addEventListener('resize', () => {
    resizeCanvasToCSSSize(canvas, ctx)
    rebuildGridLayer()
    redrawMap()
})


function mapDrag() {
    let drag = null;

    const mouseDownHandler = (e) => {
        let mode = null;

        if (e.altKey) mode = 'pan';
        else if (e.ctrlKey) mode = 'select';
        else {
            if (activeBuilding) {
                const p = getCanvasPointElem(canvas, e);
                // only start move if mousedown is on the active building
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

            let desiredX = p.x - drag.grabOffsetX;
            let desiredY = p.y - drag.grabOffsetY;

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

            const min = { x: Math.min(drag.startElem.x, endElem.x), y: Math.min(drag.startElem.y, endElem.y) };
            const max = { x: Math.max(drag.startElem.x, endElem.x), y: Math.max(drag.startElem.y, endElem.y) };

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