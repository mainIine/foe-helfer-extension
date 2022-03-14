/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('CollectingMinigameService', 'start', (data, postData) => {
    //Start Minigame
    const r = data.responseData;
    if (r.context !== "merchant") {
        return;
    }

    if ($('#minigame_aztecs-Btn').hasClass('hud-btn-red')) {
        $('#minigame_aztecs-Btn').removeClass('hud-btn-red');
        $('#minigame_aztecs-Btn-closed').remove();
    }
    AztecsHelper.mapHeight = r.height;
    AztecsHelper.mapWidth = r.width;
    AztecsHelper.boughtSomething = false;
    let arr = new Array(AztecsHelper.mapHeight);
    for (var i = 0; i < AztecsHelper.mapHeight; i++) {
        arr[i] = new Array(AztecsHelper.mapWidth);
        for (let j = 0; j < arr[i].length; j++) {
            arr[i][j] = {content: AztecsHelper.unknownCell, prob: 0};
        }
    }
    AztecsHelper.grid = arr;
    if (r.reward.resources === undefined || Object.values(r.reward.resources) <= 0) return;
    AztecsHelper.ResourcesLeft = Object.values(r.reward.resources)[0];
    if (Settings.GetSetting('ShowAztecHelper')){
        AztecsHelper.Show();
        AztecsHelper.CalcBody();
    }
});

FoEproxy.addHandler('CollectingMinigameService', 'submitMove', (data, postData) => {
    //DoTurn
    const r = data.responseData;
    AztecsHelper.boughtSomething = false;
    AztecsHelper.firstMoveDone = true;
    if (r.length > 0 && r.length == 1) {
        if (r[0]["__class__"] === "CollectingMinigameRewardTile") {
            r[0]["x"] = r[0]["x"] || 0;
            r[0]["y"] = r[0]["y"] || 0;
            AztecsHelper.MovesDone += 1;
            if (AztecsHelper.ResourcesLeft > 0) AztecsHelper.ResourcesLeft -= 1;
            AztecsHelper.firstMoveDone = true;
            AztecsHelper.grid[r[0].y][r[0].x].content = AztecsHelper.resourceCell;
            if(AztecsHelper.ResourcesLeft == 0){
                if (!$('#minigame_aztecs-Btn').hasClass('hud-btn-red')) {
                    $('#minigame_aztecs-Btn').addClass('hud-btn-red');
                    _menu.toolTipp($('#minigame_aztecs-Btn'),"Aztec Helper", '<em id="minigame_aztecs-Btn-closed" class="tooltip-error">Opens automatically when starting a aztec mini game<br></em>Aztec Minigame Helper -BETA-');
                }
                if ($('#aztecsHelper').length === 1){
                    HTML.CloseOpenBox('aztecsHelper');
                }
            }
        }
        else if (r[0]["__class__"] === "CollectingMinigameEmptyTile") {
            r[0]["x"] = r[0]["x"] || 0;
            r[0]["y"] = r[0]["y"] || 0;
            AztecsHelper.MovesDone += 1;
            if (r[0]["adjacentRewards"] !== undefined) {
                AztecsHelper.grid[r[0].y][r[0].x].content = r[0]["adjacentRewards"];
            }
            else {
                AztecsHelper.grid[r[0].y][r[0].x].content = AztecsHelper.emptyCell;
            }
        }
    } else if (r.length > 1) {
        AztecsHelper.MovesDone += 1;
        for (let i = 0; i < r.length; i++) {
            const cell = r[i];
            if (cell["__class__"] === "CollectingMinigameEmptyTile") {
                cell["x"] = cell["x"] || 0;
                cell["y"] = cell["y"] || 0;
                if (cell["adjacentRewards"] !== undefined) {
                    AztecsHelper.grid[cell.y][cell.x].content = cell["adjacentRewards"];
                }
                else {
                    AztecsHelper.grid[cell.y][cell.x].content = AztecsHelper.emptyCell;
                }
            }
        }

    }
    if ($('#aztecsHelper').length === 1){
        AztecsHelper.CalcBody();
        AztecsHelper.CalcAdjacentCells();
    }
});

FoEproxy.addHandler('ResourceShopService', 'buyResources', (data, postData) => {
    if(postData[0].requestData.filter(x => x.mainType === "cultural_outpost" && x.subType === "collecting_minigame_buy_turns")){
        if(postData[0].requestData.filter(x => x["resources"] !== undefined)[0].resources.aztecs_collecting_minigame_turns > 0){
            AztecsHelper.boughtSomething = true;
        }else{
            AztecsHelper.boughtSomething = false;
        }
    }else{
        AztecsHelper.boughtSomething = false;
    }
});

FoEproxy.addHandler('ResourceService', 'getPlayerResources', (data, postData) => {

    if(postData[0].requestData.filter(x => x.mainType === "cultural_outpost" && x.subType === "collecting_minigame_buy_turns").length > 0){
        if(postData[0].requestData.filter(x => x["resources"] !== undefined)[0].resources.aztecs_collecting_minigame_turns > 0){
            AztecsHelper.boughtSomething = true;
        }else{
            AztecsHelper.boughtSomething = false;
        }
    }else{
        AztecsHelper.boughtSomething = false;
    }

    const r = data.responseData;
    if (!r.resources) {
        return;
    }
    AztecsHelper.MovesLeft = r.resources.aztecs_collecting_minigame_turns || 0;

    if(AztecsHelper.boughtSomething && AztecsHelper.MovesLeft > 0){
        AztecsHelper.boughtSomething = false;
        if (Settings.GetSetting('ShowAztecHelper')){
            AztecsHelper.Show();
        }
    }

    if(AztecsHelper.MovesLeft == 0 && $('#aztecsHelper').length > 0){
        if (!$('#minigame_aztecs-Btn').hasClass('hud-btn-red')) {
            $('#minigame_aztecs-Btn').addClass('hud-btn-red');
            _menu.toolTipp($('#minigame_aztecs-Btn'),"Aztec Helper", '<em id="minigame_aztecs-Btn-closed" class="tooltip-error">Opens automatically when starting a aztec mini game<br></em>Aztec Minigame Helper -BETA-');
        }
        HTML.CloseOpenBox('aztecsHelper');
    }
});


let AztecsHelper = {
    resourceCell: "✓",
    nonresourceCell: "X",
    emptyCell: " ",
    unknownCell: "?",

    firstMoveDone: false,
    boughtSomething: false,

    MovesDone: 0,
    MovesLeft: 0,
    ResourcesLeft: 0,

    mapHeight: 0,
    mapWidth: 0,

    grid: [],

    Show: () => {
        if ($('#aztecsHelper').length === 0) {

            // Box in den DOM
            HTML.Box({
                'id': 'aztecsHelper',
                'title': i18n('Boxes.AztecMiniGame.Title'),
                'auto_close': true,
                'minimize': true,
                'dragdrop': false
            });

            // CSS in den DOM prügeln
            HTML.AddCssFile('minigame_aztecs');

        } else {
            HTML.CloseOpenBox('aztecsHelper');
        }

        AztecsHelper.BuildBox();
    },
    BuildBox: () => {
        if (AztecsHelper.firstMoveDone == true) {
            AztecsHelper.CalcBody();
        }
    },
    RefreshBox: () => {
        if ($('#aztecsHelper').length > 0) {
            if (AztecsHelper.firstMoveDone == true) {
                AztecsHelper.CalcBody();
            }
        }
    },
    CalcBody: () => {
        $('#aztecsHelperBody').empty();
        var table = document.createElement('table');
        var tableBody = document.createElement('tbody');
        if(AztecsHelper.MovesLeft > 0){
            AztecsHelper.grid.forEach((rowData, x) => {
                var row = document.createElement('tr');
                rowData.forEach((cellData, y) => {
                    var cell = document.createElement('td');
                    if(typeof cellData.content !== "number" && cellData.content !== AztecsHelper.emptyCell) 
                        cell.appendChild(document.createTextNode(cellData.content));
                    if(cellData.prob == 0){
                        cell.className = "aztec color-red";
                    }  
                    else if(cellData.prob > 0 && cellData.prob < 0.5) {
                        cell.className = "aztec color-orangered";
                    }
                    else if(cellData.prob >= 0.5 && cellData.prob < 0.66) {
                        cell.className = "aztec color-orange";
                    }
                    else if(cellData.prob >= 0.66 && cellData.prob < 0.75) {
                        cell.className = "aztec color-yellow";
                    }
                    else if(cellData.prob >= 0.75 && cellData.prob < 1) {
                        cell.className = "aztec color-yellowgreen";
                    }
                    else if(cellData.prob == 1) {
                        cell.className = "aztec color-chartreuse";
                    }
                    row.appendChild(cell);
                });
                tableBody.appendChild(row);
            });
            table.className = "aztecTable"
            table.appendChild(tableBody);
            $('#aztecsHelperBody').append(table);
            var divDes = document.createElement('div');
            var span = document.createElement('span');
            span.appendChild(document.createTextNode(i18n('Boxes.AztecMiniGame.Description')));
            span.className = "aztecDescription";
            divDes.className = "aztecDescriptionWrapper";
            divDes.appendChild(span);
            $('#aztecsHelperBody').append(table);
            $('#aztecsHelperBody').append(divDes);
        }else{
            $('#aztecsHelper').length > 0 && HTML.CloseOpenBox('aztecsHelper');
        }
    },
    /**
     * Checks adjacent cells for possible Resources
     * @param {number} x //Width
     * @param {number} y //Height
     * @param {number} adj 
     */
    CalcAdjacentCells: () => {
        if(AztecsHelper.MovesLeft <= 0) return $('#aztecsHelper').length > 0 && HTML.CloseOpenBox('aztecsHelper');
        var map = AztecsHelper.grid;
        const rC = AztecsHelper.resourceCell,
            uC = AztecsHelper.unknownCell,
            nrC = AztecsHelper.nonresourceCell;
        
        var numberCells = {};
        var unknownCells = {};

        //reset prob and eval attribute
        for (let y = 0; y < AztecsHelper.mapHeight; y++) {
            for (let x = 0; x < AztecsHelper.mapWidth; x++) {
                map[y][x].prob = 0;
            }
        }
        
        for (let y = 0; y < AztecsHelper.mapHeight; y++) {
            for (let x = 0; x < AztecsHelper.mapWidth; x++) {
                var cell = map[y][x];
                if (cell.content === nrC) {cell.prob = 0}
                if (cell.content === rC) {cell.prob = 1}
                if (cell.content === uC) {
                    unknownCells[`y${y}x${x}`] = {"x":x,"y":y};
                    cell.surrNumCells = AztecsHelper.GetSurroundingCell(x,y,"number");
                }
                if (typeof cell.content === "number"){
                    //Hole, falls vorhanden, alle schon entdeckten Felder mit Ressourcen
                    cell.surrUnCells = AztecsHelper.GetSurroundingCell(x,y,uC);
                    cell.surrResCells = AztecsHelper.GetSurroundingCell(x,y,rC);
                    cell.surrNumCells = AztecsHelper.GetSurroundingCell(x,y,"number");
                    numberCells[`y${y}x${x}`] = {"x":x,"y":y};
                    
                }
            }
        }
        let tmp = JSON.parse(JSON.stringify(numberCells));
                
        while (Object.keys(tmp).length > 0) {
            let tmp2 = {};
            for (let c in tmp) {
                if (tmp2.hasOwnProperty(c)) delete tmp2[c];
                
                x=tmp[c].x;
                y=tmp[c].y;
                
                let cell = map[y][x];
                cell.surrUnCells = AztecsHelper.GetSurroundingCell(x,y,uC);
                cell.surrResCells = AztecsHelper.GetSurroundingCell(x,y,rC);
                
                //Wenn drumherum unbekannte Felder vorhanden sind
                if (cell.surrUnCells.length > 0){
                    let unrevRes = cell.content - cell.surrResCells.length; //Anzahl übriger Güter
                    if (unrevRes == 0 || unrevRes == cell.surrUnCells.length){ //Anzahl übriger Güter ist 0 oder entspricht der Anzahl unbekannter Felder 
                        let prob = (unrevRes == 0) ? 0 : 1;
                        let content = (unrevRes == 0) ? nrC : rC;
                        for (let cx of cell.surrUnCells) {
                            map[cx.y][cx.x].content = content;
                            map[cx.y][cx.x].prob = prob;
                            
                            let uIndex = `y${cx.y}x${cx.x}`;
                            if (unknownCells.hasOwnProperty(uIndex)) delete unknownCells[uIndex];
                        }
                        cell.surrUnCells = [];
                        for (cx of cell.surrNumCells) {
                            let uIndex=`y${cx.y}x${cx.x}`;
                            tmp2[uIndex] = cx;
                        }
                    } else {
                        for (let other in numberCells) {
                            if (other==c) continue;
                            let otherCell = map[numberCells[other].y][numberCells[other].x];
                            
                            let Overlap = [], Diff=[];
                            [Overlap, Diff] = AztecsHelper.Compare(cell.surrUnCells, otherCell.surrUnCells);
                            
                            if (Overlap.length!=0) {
                                let testP=0;
                                for (let oC of Overlap) {
                                    testP += map[oC.y][oC.x].prop[other] || 0;
                                }
                                let min = unrevRes - (otherCell.content - otherCell.surrResCells.length);
                                let max = unrevRes - Math.floor(testP);
                                if (Diff.length == min || max == 0){ 
                                    let prob = (max == 0) ? 0 : 1;
                                    let content = (max == 0) ? nrC : rC;
                                    for (let cx of Diff) {
                                        map[cx.y][cx.x].content = content;
                                        map[cx.y][cx.x].prob = prob;
                                        
                                        let uIndex=`y${cx.y}x${cx.x}`;
                                        if (unknownCells.hasOwnProperty(uIndex)) delete unknownCells[uIndex];
                                    }
                                    cell.surrUnCells = JSON.parse(JSON.stringify(Overlap));
                                    tmp2[other] = numberCells[other];
                                    unrevRes -= (max == 0) ? 0 : min;
                                }
                            }
                        }
                        if (cell.surrUnCells.length > 0) {
                            for (let dC of cell.surrUnCells) {
                                let newP = unrevRes / cell.surrUnCells.length;
                                if (!map[dC.y][dC.x].hasOwnProperty("probList")) map[dC.y][dC.x].probList = [];
                                let oldP = (!map[dC.y][dC.x].probList[c]) ? 0 : map[dC.y][dC.x].probList[c];
                                if (oldP != newP) {
                                    map[dC.y][dC.x].probList[c] = newP;
                                    for (cx of map[dC.y][dC.x].surrNumCells) {
                                        let uIndex=`y${cx.y}x${cx.x}`;
                                        tmp2[uIndex] = cx;
                                    }
                                }
                            }
                        } 
                    }
                }
            }
            tmp = tmp2;
        }  
        
        for (let c in unknownCells) {
            let cell = unknownCells[c];
            if (!map[cell.y][cell.x].probList) continue;
            map[cell.y][cell.x].prob = Math.max(...AztecsHelper.remIndex(map[cell.y][cell.x].probList));
            delete map[cell.y][cell.x].probList;
        }

        AztecsHelper.CalcBody();
    },

    Compare: (BaseArray, CompareArray)=>{
        const Overlap = BaseArray.filter(value => !(!CompareArray[`y${value.y}x${value.x}`]));
        const Diff = BaseArray.filter(value => !CompareArray[`y${value.y}x${value.x}`]);
        return [Overlap, Diff];
    },

    /**
     * |    -1/-1 - 0/-1 - +1/-1
     * |    -1/0  - 0/0  - +1/0
     * |    -1/+1 - 0/+1 - +1/+1
     * @param {*} width //x
     * @param {*} height //y
     */
    GetSurroundingCell: (width,height, cellContent) => {
        var map = AztecsHelper.grid;
        var arr = [];
        if (cellContent!=="number") {
            if(width > 0) if(map[height][width-1].content === cellContent) arr.push({"x":width-1,"y":height});// height0/width-1
            if(height > 0) if(map[height-1][width].content === cellContent) arr.push({"x":width,"y":height-1});// height-1/width0
            if(width < AztecsHelper.mapWidth-1) if(map[height][width+1].content === cellContent) arr.push({"x":width+1,"y":height});// height0/width+1
            if(height < AztecsHelper.mapHeight-1) if(map[height+1][width].content === cellContent) arr.push({"x":width,"y":height+1});// height+1/width0
            if(height < AztecsHelper.mapHeight-1 && width > 0) if(map[height+1][width-1].content === cellContent) arr.push({"x":width-1,"y":height+1});// height+1/width-1
            if(width < AztecsHelper.mapWidth-1 && height > 0) if(map[height-1][width+1].content === cellContent) arr.push({"x":width+1,"y":height-1});// height-1/width+1
            if(height < AztecsHelper.mapHeight-1 && width < AztecsHelper.mapWidth-1) if(map[height+1][width+1].content === cellContent) arr.push({"x":width+1,"y":height+1});// +1/+1
            if(width > 0 && height > 0) if(map[height-1][width-1].content === cellContent) arr.push({"x":width-1,"y":height-1});// -1/-1
        } else {
            if(width > 0) if(typeof map[height][width-1].content === cellContent) arr.push({"x":width-1,"y":height});// height0/width-1
            if(height > 0) if(typeof map[height-1][width].content === cellContent) arr.push({"x":width,"y":height-1});// height-1/width0
            if(width < AztecsHelper.mapWidth-1) if(typeof map[height][width+1].content === cellContent) arr.push({"x":width+1,"y":height});// height0/width+1
            if(height < AztecsHelper.mapHeight-1) if(typeof map[height+1][width].content === cellContent) arr.push({"x":width,"y":height+1});// height+1/width0
            if(height < AztecsHelper.mapHeight-1 && width > 0) if(typeof map[height+1][width-1].content === cellContent) arr.push({"x":width-1,"y":height+1});// height+1/width-1
            if(width < AztecsHelper.mapWidth-1 && height > 0) if(typeof map[height-1][width+1].content === cellContent) arr.push({"x":width+1,"y":height-1});// height-1/width+1
            if(height < AztecsHelper.mapHeight-1 && width < AztecsHelper.mapWidth-1) if(typeof map[height+1][width+1].content === cellContent) arr.push({"x":width+1,"y":height+1});// +1/+1
            if(width > 0 && height > 0) if(typeof map[height-1][width-1].content === cellContent) arr.push({"x":width-1,"y":height-1});// -1/-1
        
        }

        return arr;
    },

    test:()=>{
        AztecsHelper.mapHeight=7;
        AztecsHelper.mapWidth=11;
        AztecsHelper.grid = JSON.parse('[[{"content":" "},{"content":1},{"content":"✓"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":1},{"content":" "}],[{"content":" "},{"content":2},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"✓"},{"content":1},{"content":" "}],[{"content":" "},{"content":1},{"content":"✓"},{"content":"?"},{"content":"?"},{"content":"✓"},{"content":1},{"content":1},{"content":1},{"content":1},{"content":" "}],[{"content":1},{"content":2},{"content":"?"},{"content":"?"},{"content":1},{"content":1},{"content":1},{"content":" "},{"content":" "},{"content":" "},{"content":" "}],[{"content":"?"},{"content":"✓"},{"content":"?"},{"content":"?"},{"content":1},{"content":" "},{"content":" "},{"content":" "},{"content":" "},{"content":" "},{"content":" "}],[{"content":"?"},{"content":"?"},{"content":"?"},{"content":"✓"},{"content":1},{"content":" "},{"content":" "},{"content":" "},{"content":" "},{"content":" "},{"content":" "}],[{"content":1},{"content":2},{"content":"?"},{"content":"?"},{"content":1},{"content":" "},{"content":" "},{"content":" "},{"content":" "},{"content":" "},{"content":" "}]]');
        AztecsHelper.CalcAdjacentCells();
    },

    remIndex: (array) => {
        let out=[];
        for (x in array) {
            out.push(array[x]);
        }
        return out;
    },
};