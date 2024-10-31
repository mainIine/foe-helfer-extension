const submitWindow = document.querySelector('.overlay')
const submitBtn = document.querySelector('.overlay button')
const submitError = document.querySelector('.overlay .error')
const canvas = document.querySelector('canvas')
const ctx = canvas.getContext("2d")
let metaData = {}
let cityData = {}
let mapData = {}

ctx.textBaseline = "middle"
ctx.font = "15px Arial"
ctx.textAlign = "center"
ctx.lineWidth = 1

const size = 40

function init (data) {
    metaData = data.CityEntities
    cityData = data.CityMapData
    mapData = data.mapData

    drawMap(cityData)
}

function drawMap (cityData) {
    let city = Object.values(cityData)
    for (let building of city) {
        let buildingData = Object.values(metaData).find(x => x.id == building.cityentity_id)
        ctx.fillStyle = setColorByType(buildingData.type)
        ctx.strokeStyle = setStrokeColorByType(buildingData.type)

        if (buildingData.type != "off_grid" && buildingData.type != "outpost_ship" && buildingData.type != "friends_tavern" && !buildingData.type.includes("hub")) {
            let x = building.x * size
            let y = building.y * size
            let width = (buildingData.width || buildingData.components.AllAge.placement.size.x) * size
            let length = (buildingData.length || buildingData.components.AllAge.placement.size.y) * size
            ctx.fillRect(x, y, width, length)
            ctx.strokeRect(x, y, width, length)
            ctx.fillStyle = "#000"
            if (buildingData.type != "street") {
               ctx.fillText(buildingData.name, x + width/2, y + length/2)
            }
        }
    }
}

function setColorByType (type) {
    let color = '#888'

    if (type == 'main_building')
        color = '#ffb300'
    if (type == 'military')
        color = '#fff'
    if (type == 'greatbuilding')
        color = '#e6542f'
    if (type == 'residential')
        color = '#7abaff'
    if (type == 'production')
        color = '#416dff'

    return color
}

function setStrokeColorByType (type) {
    let color = '#888'

    if (type == 'main_building')
        color = '#ffb300'
    if (type == 'greatbuilding')
        color = '#af3d2b'
    if (type == 'residential')
        color = '#219eff'
    if (type == 'production')
        color = '#2732ff'

    return color
}

submitBtn.addEventListener('click', async () => {
    try {
        const clipboardContents = await navigator.clipboard.readText()
        let data = JSON.parse(clipboardContents)
        submitWindow.classList.add('hidden')
        init(data)
    }
    catch (error) {
        console.log(error)
        if (error.name == "SyntaxError")
            submitError.innerHTML = "The data is corrupted."
    }
})