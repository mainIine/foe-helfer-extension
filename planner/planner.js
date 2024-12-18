'use strict'

const submitWindow = document.querySelector('.overlay')
const submitBtn = document.querySelector('.overlay button')
const submitError = document.querySelector('.overlay .error')
const storeBuildingsBtn = document.querySelector('#storeAll')
const storeSelectionBtn = document.querySelector('#storeSelection')
let buildingsListEl = document.querySelector('#buildings ul')
const mapWrapper = document.querySelector('#canvasWrapper')
const sidebarBuilding = document.querySelector('#buildings li')
const zoomEl = document.querySelector('#zoom')

const fontSize = 15
const font = fontSize + "px Arial"

let canvas = document.getElementById('planner')
const ctx = canvas.getContext("2d")
ctx.textBaseline = "middle"
ctx.font = font
ctx.textAlign = "center"
ctx.lineWidth = 1

let metaData = {}
let cityData = {}
let mapData = {}
let mapBuildings = []
let storedBuildings = []
let selectedBuildings = []
let zoom = 2500

// size of a 1x1 tile
const size = 30

function init (data) {
    metaData = data.CityEntities
    cityData = data.CityMapData
    mapData = data.UnlockedAreas

    console.log(data)

    drawMap()
    updateStats()
    mapDrag()
}

function updateStats () {
    // initial amount of streets 
    let oldStreetsEl = document.querySelector('.old .streets')
    let oldStreetAmount = Object.values(cityData).filter(x => x.type === 'street').length
    oldStreetsEl.innerHTML = oldStreetAmount
    
    let newStreetsEl = document.querySelector('.new .streets')
    let streetAmount = Object.values(mapBuildings).filter(x => x.data.type === 'street').length
    newStreetsEl.innerHTML = streetAmount
}

function drawMap () {
    let city = Object.values(cityData)
    mapBuildings = []

    if (mapData !== undefined) {
        for (let expansion of mapData) {
            drawExpansion(expansion)
        }
    }

    for (let building of city) {
        let buildingData = Object.values(metaData).find(x => x.id === building.cityentity_id)

        if (buildingData.type !== "off_grid" && buildingData.type !== "outpost_ship" && buildingData.type !== "friends_tavern" && !buildingData.type.includes("hub")) {
            let newBuilding = new MapBuilding(building, buildingData)
            mapBuildings.push(newBuilding)
            newBuilding.draw()
        }
    }
}

function drawEmptyMap () {
    mapBuildings = []

    for (let expansion of mapData) {
        drawExpansion(expansion)
    }
}

function drawExpansion (expansion) {
    ctx.fillStyle = '#fffead'
    ctx.strokeStyle = '#cbca4a'
    ctx.lineWidth = 0.5

    // ctx.fillRect((expansion.x || 0) * size, (expansion.y || 0) * size, expansion.width * size, expansion.length * size)
    // ctx.strokeRect((expansion.x || 0) * size, (expansion.y || 0) * size, expansion.width * size, expansion.length * size)

    // draw the 1x1 squares for each expansion
    for (let a = 0; a < expansion.length; a++)
    {
        for (let b = 0; b < expansion.width; b++)
        {
            createMapGridPart({
                x: ((expansion.x === undefined || isNaN(expansion.x)) ? 0 : expansion.x) + a,
                y: (expansion.y === undefined ? 0 : expansion.y) + b
            });
        }
    }

    ctx.strokeStyle = '#8c8a19'
    ctx.strokeRect((expansion.x || 0) * size, (expansion.y || 0) * size, expansion.width * size, expansion.length * size)
}

function createMapGridPart(data) {
    let top = data.y * size,
        left = data.x * size;

    ctx.fillRect(left, top, size, size);
    ctx.strokeRect(left, top, size, size);
}

class MapBuilding {
    
    constructor(data, metaData) {
        this.data = data
        this.meta = metaData
        this.name = metaData.name
        this.x = (data.x * size) || 0
        this.y = (data.y * size) || 0
        this.width = size * (metaData.width || metaData.components.AllAge.placement.size.x)
        this.height = size * (metaData.length || metaData.components.AllAge.placement.size.y)
        this.isSelected = false
    }

    needsStreet = function() {
        let needsStreet = this.meta.requirements?.street_connection_level
        if (needsStreet === undefined) {
            this.meta.abilities.forEach(ability => {
                if (ability.__class__ === "StreetConnectionRequirementComponent")
                    needsStreet = 1
            });
            if (this.meta.components?.AllAge?.streetConnectionRequirement !== undefined)
                needsStreet = this.meta.components.AllAge.streetConnectionRequirement.requiredLevel
        }
        return (needsStreet === undefined ? 0 : needsStreet)
    }

    setColorByType = function() {
        let color = '#888'
    
        if (this.meta.type === 'main_building')
            color = '#ffb300'
        else if (this.meta.type === 'military')
            color = '#fff'
        else if (this.meta.type === 'greatbuilding')
            color = '#e6542f'
        else if (this.meta.type === 'residential')
            color = '#7abaff'
        else if (this.meta.type === 'production')
            color = '#416dff'
        if (this.needsStreet() === 0)
            color = '#793bc9'
    
        return color
    }

    setStrokeColorByType = function() {
        let color = '#888'
    
        if (this.meta.type == 'main_building')
            color = '#ffb300'
        else if (this.meta.type == 'greatbuilding')
            color = '#af3d2b'
        else if (this.meta.type == 'residential')
            color = '#219eff'
        else if (this.meta.type == 'production')
            color = '#2732ff'
        if (this.needsStreet() == 0)
            color = '#3d2783'
    
        return color
    }

    draw = function() {
        ctx.fillStyle = this.setColorByType()
        ctx.strokeStyle = this.setStrokeColorByType()
        ctx.fillRect(this.x, this.y, this.width, this.height)
        if (this.isSelected) ctx.strokeStyle = '#000'
        ctx.strokeRect(this.x, this.y, this.width, this.height)

        this.drawName()
    }

    drawName = function () {
        if (this.meta.type == "street" || this.height == size || this.width == size) return

        ctx.fillStyle = "#000"
        ctx.font = font
        if (this.isSelected) ctx.font = "bold " + font;
        let text = ctx.measureText(this.name)
        let sizeOffset = fontSize + Math.ceil(fontSize*0.4)

        if (text.width < this.width) { // name can fit in one line
            ctx.fillText(this.name, this.x + this.width/2, this.y + this.height/2 - Math.ceil(fontSize*0.3))
            sizeOffset = fontSize-2
        }
        else if (this.height > size && this.width > size) { // name is longer
            let ratio = Math.ceil(text.width / (this.width - 30))
            let textStart = 0
            let textEnd = Math.ceil(this.name.length / ratio)

            // two lines of text
            ctx.fillText(this.name.slice(textStart, textEnd), this.x + this.width/2, this.y + this.height/2 - Math.ceil(fontSize*0.9))
            textStart = textEnd
            textEnd = Math.ceil(this.name.length / ratio) + textStart
            let more = (textEnd >= this.name.length) ? '' : '…'
            ctx.fillText(this.name.slice(textStart, textEnd) + more, this.x + this.width/2, this.y + this.height/2 + Math.ceil(fontSize*0.2))
        }

        let totalSize = this.height/size + "x" + this.width/size
        ctx.font = "12px Arial"
        ctx.fillText(totalSize, this.x + this.width/2, this.y + this.height/2 + sizeOffset)
    }

    store = function () {
        mapBuildings.find(x => x == this)
        mapBuildings.splice(mapBuildings.indexOf(this), 1)
        this.x = 0
        this.y = 0
        storedBuildings.push(this)
    }
}

function redrawMap () {
    ctx.clearRect(0,0,canvas.width,canvas.height)

    if (mapData !== undefined) {
        for (let expansion of mapData) {
            drawExpansion(expansion)
        }
    }

    for (let building of mapBuildings) {
        building.draw()
    }
}

function storeSelectedBuildings () {
    for (let building of selectedBuildings) {
        building.store()
    }
    showStoredBuildings()
    redrawMap()
    selectedBuildings = []
    document.querySelector('#storeSelection span').innerHTML = ''
}

function showStoredBuildings () {
    let html = []
    let buildingsAmount = new Map()

    // generate amount
    for (let building of storedBuildings) {
        if (building.meta.type === 'street') continue
        let amount = buildingsAmount.get(building.meta.id)
        
        if (amount === undefined)
            buildingsAmount.set(building.meta.id, 1)
        else 
            buildingsAmount.set(building.meta.id, ++amount)
    }

    buildingsAmount.forEach((amount, buildingId) => {
        let building = storedBuildings.find(x => x.meta.id === buildingId)
        let noStreet = (building.needsStreet() === 0) ? ' nostreet' : ''
        html.push('<li id="'+building.meta.id+'" class="'+building.meta.type + noStreet+'">'+
            '<span class="name">'+building.meta.name + ' (' + (building.meta.length || building.meta.components.AllAge.placement.size.y)+'x'+(building.meta.width || building.meta.components.AllAge.placement.size.x) +')</span>' +
            '<span class="amount">'+(amount > 1 ? amount : '')+'</span></li>'
        )
    })

    buildingsListEl.innerHTML = html.join('')
}

/*zoomEl.addEventListener('click', async () => {
    if (zoom == 2500)
        zoom = 1700
    else if (zoom == 1700)
        zoom = 1000
    else if (zoom == 1000)
        zoom = 2500

    canvas.style.width = zoom + 'px'
    canvas.style.height = zoom + 'px'
})*/


submitBtn.addEventListener('click', async () => {
    try {
        const clipboardContents = await navigator.clipboard.readText()
        let data = JSON.parse(clipboardContents)
        submitWindow.classList.add('hidden')
        init(data)
    }
    catch (error) {
        console.error(error)
        submitError.innerHTML = "The data is corrupted."
    }
})

storeBuildingsBtn.addEventListener('click', () => {
    storedBuildings = storedBuildings.concat(mapBuildings)
    // sort storedBuildings array by size
    storedBuildings.sort((a,b) => {
        a = (a.meta.length || a.meta.components.AllAge.placement.size.y) * (a.meta.width || a.meta.components.AllAge.placement.size.x)
        b = (b.meta.length || b.meta.components.AllAge.placement.size.y) * (b.meta.width || b.meta.components.AllAge.placement.size.x)
        if (a > b) { return -1 }
        if (a < b) { return 1 }
        return 0
    })
    mapBuildings = []
    showStoredBuildings()
    updateStats()
    drawEmptyMap()
})

storeSelectionBtn.addEventListener('click', storeSelectedBuildings)

// select a building
canvas.addEventListener('click', (e) => {
    // todo: does not work when zoomed out

    // do no fire when dragging the map
    if (e.altKey || e.ctrlKey) return

    // find building
    for (let building of mapBuildings) {
        // exclude streets, we do not store them
        if (building.meta.type === 'street') continue

        if (building.x <= e.offsetX && (building.x + building.width) >= e.offsetX) {
            if (building.y <= e.offsetY && (building.y + building.height) >= e.offsetY) {
                if (!building.isSelected) {
                    // add building to selection
                    selectedBuildings.push(building)
                }
                else {
                    // remove building from selection
                    selectedBuildings.filter((val, index, arr) => {
                        if (val == building) {
                            arr.splice(index, 1)
                            return true
                        }
                        return false
                    })
                }
                
                document.querySelector('#storeSelection span').innerHTML = selectedBuildings.length
                building.isSelected  = !building.isSelected
                building.draw() // draw again
            }
        }
    }
})

document.getElementById('removeStreets').addEventListener('click', () => { 
    mapBuildings = mapBuildings.filter(x => x.data.type !== 'street')
    redrawMap()
    updateStats()
})

document.getElementById('reset').addEventListener('click', () => { 
    let reset = confirm('Do you want to restart from scratch? Your changes will not be saved')
    if (reset) 
        resetCity()
})

function resetCity () {
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

    selectedBuildings.forEach((building) => { building.isSelected = false })
    selectedBuildings = []
    document.querySelector('#storeSelection span').innerHTML = ''
    redrawMap()
 })

function mapDrag () {
    let pos = { top: 0, left: 0, x: 0, y: 0 }
    let mouseDownPos = { x: 0, y: 0 }
            
    const mouseDownHandler = function(e) {
        if (!e.altKey && !e.ctrlKey) return 

        pos = {
            left: mapWrapper.scrollLeft,
            top: mapWrapper.scrollTop,
            x: e.clientX,
            y: e.clientY,
        }
        
        mouseDownPos = {
            x: e.offsetX,
            y: e.offsetY
        }

        ctx.fillRect(mouseDownPos.x, mouseDownPos.y, 2, 2)

        if (e.altKey)
            document.addEventListener('mousemove', mapMoveHandler)

        document.addEventListener('mouseup', mouseUpHandler)
    }

    const mapMoveHandler = function(e) {
        const dx = e.clientX - pos.x
        const dy = e.clientY - pos.y
        mapWrapper.scrollTop = pos.top - dy
        mapWrapper.scrollLeft = pos.left - dx
    }

    const mouseUpHandler = function (e) {
        if (e.ctrlKey) {
            // generate new points with min.x&y and max.x&y to be able to select from all for sides
            let min = {x: Math.min(mouseDownPos.x, e.offsetX), y: Math.min(mouseDownPos.y, e.offsetY)}
            let max = {x: Math.max(mouseDownPos.x, e.offsetX), y: Math.max(mouseDownPos.y, e.offsetY)}

            // select buildings in that range
            for (let building of mapBuildings) {
                if (building.meta.type === 'street') continue

                if (building.x <= max.x && building.y <= max.y && (building.x + building.width) >= min.x && (building.y + building.height) >= min.y)
                    if (!building.isSelected) {
                        // add building to selection
                        selectedBuildings.push(building)
                        
                        document.querySelector('#storeSelection span').innerHTML = selectedBuildings.length
                        building.isSelected = !building.isSelected // is always true, because 5 rows below > if (!building.isSelected) {
                        building.draw() // draw again
                    }
            }
        }
        document.removeEventListener('mousemove', mapMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
    }

    canvas.addEventListener('mousedown', function (e) {
        mapWrapper.addEventListener('mousedown', mouseDownHandler);
    }, false)
}