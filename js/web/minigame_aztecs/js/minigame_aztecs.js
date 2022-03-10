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

    AztecsHelper.Show();
    AztecsHelper.mapHeight = r.height;
    AztecsHelper.mapWidth = r.width;
    AztecsHelper.boughtSomething = false;
    let arr = new Array(AztecsHelper.mapHeight);
    for (var i = 0; i < AztecsHelper.mapHeight; i++) {
        arr[i] = new Array(AztecsHelper.mapWidth);
        for (let j = 0; j < arr[i].length; j++) {
            arr[i][j] = {content: AztecsHelper.unknownCell, adjacent: [], prob: 0};
        }
    }
    AztecsHelper.grid = arr;
    if (r.reward.resources === undefined || Object.values(r.reward.resources) <= 0) return;
    AztecsHelper.ResourcesLeft = Object.values(r.reward.resources)[0];
    AztecsHelper.CalcBody();
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
                HTML.CloseOpenBox('aztecsHelper');
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
    AztecsHelper.CalcBody();
    AztecsHelper.CalcAdjacentCells();
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
        AztecsHelper.Show();
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
    resourceCell: "X",
    emptyCell: " ",
    unknownCell: "?",

    firstMoveDone: false,
    boughtSomething: false,

    MovesDone: 0,
    MovesLeft: 0,
    ResourcesLeft: 0,

    mapHeight: 0,
    mapWidth: 0,

    possibleRessources: [],
    grid: [],

    Show: () => {
        if ($('#aztecsHelper').length === 0) {

            // Box in den DOM
            HTML.Box({
                'id': 'aztecsHelper',
                'title': "Azteken Helfer",
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
            AztecsHelper.grid.forEach((rowData) => {
                var row = document.createElement('tr');
                rowData.forEach((cellData) => {
                    var cell = document.createElement('td');
                    if(typeof cellData.content !== "number") cell.appendChild(document.createTextNode(cellData.content));
                    if(cellData.prob >= 0.0 && cellData.prob < 0.4){
                        cell.className = " aztec color-red";
                    }  
                    else if(cellData.prob >= 0.4 && cellData.prob < 0.8) {
                        cell.className = "aztec color-orangered";
                    }
                    else if(cellData.prob >= 0.8 && cellData.prob < 1.0) {
                        cell.className = "aztec color-orange";
                    }
                    else if(cellData.prob >= 1.0 && cellData.prob < 1.4) {
                        cell.className = "aztec color-yellow";
                    }
                    else if(cellData.prob >= 1.4 && cellData.prob < 1.8) {
                        cell.className = "aztec color-yellowgreen";
                    }
                    else if(cellData.prob >= 1.8 && cellData.prob < 2.2) {
                        cell.className = "aztec color-chartreuse";
                    }
                    else if(cellData.prob >= 2.2) {
                        cell.className = "aztec color-green";
                    }
                    row.appendChild(cell);
                });
                tableBody.appendChild(row);
            });
            table.className = "aztecTable"
            table.appendChild(tableBody);
            $('#aztecsHelperBody').append(table);    
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
        var rC = AztecsHelper.resourceCell;
        var uC = AztecsHelper.unknownCell;

        //reset prob attribute
        for (let y = 0; y < AztecsHelper.mapHeight; y++) {
            for (let x = 0; x < AztecsHelper.mapWidth; x++) {
                map[y][x].prob = 0;
            }
        }
        
        for (let y = 0; y < AztecsHelper.mapHeight; y++) {
            for (let x = 0; x < AztecsHelper.mapWidth; x++) {
                var cell = map[y][x];
                if(typeof cell.content === "number"){
                    var surrUnCells = [];
                    var surrResCells = [];
                    //Wenn drumherum unbekannte Felder vorhanden sind
                    if((surrUnCells = AztecsHelper.GetSurroundingCell(x,y,uC)).length > 0){
                        //Hole, falls vorhanden, alle schon entdeckten Felder mit Ressourcen
                        surrResCells = AztecsHelper.GetSurroundingCell(x,y,rC);
                        //Berechne unaufgedeckte Ressourcen (Math.abs, weil eine negative Zahl raus kommt)
                        let unrevRes = Math.abs(surrResCells.length - cell.content);
                        if(unrevRes > 0){
                            //Berechne 'Wahrscheinlichkeit' für jedes der Unbekannten Felder
                            let local_prob = unrevRes / surrUnCells.length;
                            //Füge alle unbekannten Felder als Referenze zum aktuellen Feld
                            cell.adjacent = cell.adjacent.concat(surrUnCells);
                            for (let i = 0; i < surrUnCells.length; i++) {
                                const surrCell = surrUnCells[i];
                                //Addiere die 'Wahrscheinlichkeit' zur jeweiligen Zelle
                                map[surrCell.y][surrCell.x].prob += local_prob;
                                //Füge eine Referenz des aktuellen Feldes zum Feld der Unbekannten 
                                map[surrCell.y][surrCell.x].adjacent.push(cell);
                                if(AztecsHelper.possibleRessources.filter(pR=>pR.x === surrCell.x && pR.y === surrCell.y).length <= 0){
                                    AztecsHelper.possibleRessources = AztecsHelper.possibleRessources.filter(pR=>pR.x !== surrCell.x && pR.y !== surrCell.y)
                                    AztecsHelper.possibleRessources.push({"x":surrCell.x,"y":surrCell.y,"prob":map[surrCell.y][surrCell.x].prob});
                                }
                            }
                        }
                    }
                }
            }
        }
        AztecsHelper.possibleRessources = AztecsHelper.possibleRessources.sort((a, b) => b.prob - a.prob);
        AztecsHelper.CalcBody();
    },
    /**
     * |    -1/-1 - 0/-1 - +1/-1
     * |    -1/0  - 0/0  - +1/0
     * |    -1/+1 - 0/+1 - +1/+1
     * @param {*} width //x
     * @param {*} height //y
     */
    HasSurroundingCell: (width,height, cellContent) => {
        var map = AztecsHelper.grid;
        var uC = cellContent;
        var has = false;
        if(width > 0) if(map[height][width-1].content === uC) has = true;// 0/-1
        if(height > 0) if(map[height-1][width].content === uC) has = true;// -1/0
        if(width < AztecsHelper.mapwidth-1) if(map[height][width+1].content === uC) has = true;// 0/+1
        if(height < AztecsHelper.mapHeight-1) if(map[height+1][width].content === uC) has = true;// +1/0
        if(height < AztecsHelper.mapHeight-1 && width > 0) if(map[height+1][width-1].content === uC) has = true;// +1/-1
        if(width < AztecsHelper.mapwidth-1 && height > 0) if(map[height-1][width+1].content === uC) has = true;// -1/+1
        if(height < AztecsHelper.mapHeight-1 && width < AztecsHelper.mapwidth-1) if(map[height+1][width+1].content === uC) has = true;// +1/+1
        if(width > 0 && height > 0) if(map[height-1][width-1].content === uC) has = true;// -1/-1
        return has;
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
        var uC = cellContent;
        var arr = [];
        if(width > 0) if(map[height][width-1].content === uC) arr.push({"x":width-1,"y":height});// height0/width-1
        if(height > 0) if(map[height-1][width].content === uC) arr.push({"x":width,"y":height-1});// height-1/width0
        if(width < AztecsHelper.mapWidth-1) if(map[height][width+1].content === uC) arr.push({"x":width+1,"y":height});// height0/width+1
        if(height < AztecsHelper.mapHeight-1) if(map[height+1][width].content === uC) arr.push({"x":width,"y":height+1});// height+1/width0
        if(height < AztecsHelper.mapHeight-1 && width > 0) if(map[height+1][width-1].content === uC) arr.push({"x":width-1,"y":height+1});// height+1/width-1
        if(width < AztecsHelper.mapWidth-1 && height > 0) if(map[height-1][width+1].content === uC) arr.push({"x":width+1,"y":height-1});// height-1/width+1
        if(height < AztecsHelper.mapHeight-1 && width < AztecsHelper.mapWidth-1) if(map[height+1][width+1].content === uC) arr.push({"x":width+1,"y":height+1});// +1/+1
        if(width > 0 && height > 0) if(map[height-1][width-1].content === uC) arr.push({"x":width-1,"y":height-1});// -1/-1
        return arr;
    }
};