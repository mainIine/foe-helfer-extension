/*
 * *************************************************************************************
 *
 * Copyright (C) 2024 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

let mouseActions = {
    actions:[],
    randomClickRadius:3,
    targetEl:null,
    lastMouseCoords:{},

    init: async () => {
        x = new Promise((resolve) => {
            let timer = () => {
                if ($("#openfl-content canvas").length==0) {
                    setTimeout(timer,50)
                } else {
                    resolve() 
                }
            }
            timer()
        }),
        await x
        mouseActions.targetEl = $("#openfl-content canvas")[0]
        $("#openfl-content").on("click",(e) => {
            let X=e.clientX,
                Y=e.clientY
            for (action of mouseActions.actions) {
                let coords1=mouseActions.calcCoords(action.area[0]),
                    coords2=mouseActions.calcCoords(action.area[1]),
                    [X1,X2]=coords1[0]<coords2[0]?[coords1[0],coords2[0]]:[coords2[0],coords1[0]],
                    [Y1,Y2]=coords1[1]<coords2[1]?[coords1[1],coords2[1]]:[coords2[1],coords1[1]],
                    inside = action.area[2] ?? true

                if ((X1<=X && X2>=X && Y1<=Y && Y2>=Y) ^ !inside){
                    action.callback(X,Y)
                }

            }
        })
        $("#openfl-content").on("mousemove",(e) => {
            mouseActions.lastMouseCoords = {clientX:e.clientX,clientY:e.clientY}
        })
    },
    
    addAction:(area,callback)=>{
        mouseActions.actions.push({area:area,callback:callback})
    },

    simulate: (element, eventName, options={}) => {
    
        if (!/^(?:click|dblclick|mouse(?:down|enter|leave|up|over|move|out))$/.test(eventName)) return
    
        let oEvent = new MouseEvent(eventName,options)
        element.dispatchEvent(oEvent)
        return ;
    },
    
    click: (vars={})=> {
        mouseActions.simulate(mouseActions.targetEl, "mousedown", vars)
        mouseActions.simulate(mouseActions.targetEl, "mouseup", vars)
    },
    
    calcCoords: (coords,anchorNew="TopLeft")=> {
        let H = window.innerHeight,
            W = window.innerWidth,
            xOld = coords[0],
            yOld = coords[1],
            x,y,xNew,yNew,       
            anchorOld = coords[2] || "TopLeft"

        if (anchorOld.includes("Center")){
            x = xOld + Math.floor(W/2)
            y = yOld + Math.floor(H/2)
        }
        if (anchorOld.includes("Top")) y = yOld
        if (anchorOld.includes("Bottom")) y = yOld + H
        if (anchorOld.includes("Left")) x = xOld
        if (anchorOld.includes("Right")) x = xOld + W
        
        if (anchorNew.includes("Center")){
            xNew = x - Math.floor(W/2)
            yNew = y - Math.floor(H/2)
        }
        if (anchorNew.includes("Top")) yNew = y
        if (anchorNew.includes("Bottom")) yNew = y - H
        if (anchorNew.includes("Left")) xNew = x
        if (anchorNew.includes("Right")) xNew = x - W
        return [xNew,yNew,anchorNew]
    },
    
    randomClick: (coords,n=1)=> {
        let previousCoords = Object.assign({},mouseActions.lastMouseCoords),      
            r = () => Math.floor(Math.random()*(2*mouseActions.randomClickRadius +1)) - mouseActions.randomClickRadius,
            limits = (min,value,max) => Math.min(Math.max(value+r(),min),max),
            TLCoords=mouseActions.calcCoords(coords,"TopLeft"),
            randomCoords = {clientX:limits(0,TLCoords[0],window.innerWidth-1),clientY:limits(0,TLCoords[1],window.innerHeight-1)}
    
        mouseActions.simulate(mouseActions.targetEl, "mousemove", randomCoords)
        for (let i=0;i<n;i++) {
            mouseActions.click(randomCoords)
        }
        mouseActions.simulate(mouseActions.targetEl, "mousemove", previousCoords)
    }
}

mouseActions.init()

//Build Repeat
mouseActions.addAction([[210, -487, 'BottomLeft'],[0,0,"BottomLeft"]],(X,Y)=>{
    buildRepeat.lastBuildClick = mouseActions.calcCoords([X,Y],"BottomLeft")
})    

FoEproxy.addRequestHandler("CityMapService","placeBuilding",(data)=>{
    if (MainParser.CityEntities[data.requestData[0].cityentity_id].type != "street") buildRepeat.click()
})

FoEproxy.addFoeHelperHandler('ReconstructionBuildingPlaced',(data)=>{
    if (MainParser.CityMapData[data.id].type != "street" && !data.last)  buildRepeat.click()
});

let buildRepeat = {
    lastBuildClick: null,
    click: () => {
        if(!Settings.GetSetting('RepeatSelectBuilding')) return;
        mouseActions.randomClick(buildRepeat.lastBuildClick)
    }
}
    
