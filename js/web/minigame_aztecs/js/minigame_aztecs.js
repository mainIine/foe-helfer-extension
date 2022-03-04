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
    debugger;
    const r = data.responseData;
    if (r.context !== "merchant") {
        return;
    }
    AztecsHelper.mapHeight = r.height;
    AztecsHelper.mapWidth = r.width;
    AztecsHelper.grid = [...Array(AztecsHelper.mapHeight)].map(e => Array(AztecsHelper.mapWidth).fill(AztecsHelper.unknownCell));
    if (r.reward.resources === undefined || Object.values(r.reward.resources) <= 0) return;
    AztecsHelper.ResourcesLeft = Object.values(r.reward.resources)[0];
    AztecsHelper.CalcBody();
});

FoEproxy.addHandler('CollectingMinigameService', 'submitMove', (data, postData) => {
    //DoTurn
    debugger;
    const r = data.responseData;
    AztecsHelper.firstMoveDone = true;
    if (r.length > 0 && r.length == 1) {
        if (r[0]["__class__"] === "CollectingMinigameRewardTile") {
            r[0]["x"] = r[0]["x"] || 0;
            r[0]["y"] = r[0]["y"] || 0;
            if (AztecsHelper.MovesDone < AztecsHelper.MaxMoves) AztecsHelper.MovesDone += 1;
            if (AztecsHelper.ResourcesLeft > 0) AztecsHelper.ResourcesLeft -= 1;
            AztecsHelper.firstMoveDone = true;
            AztecsHelper.grid[r[0].y][r[0].x] = AztecsHelper.resourceCell;
        }
        else if (r[0]["__class__"] === "CollectingMinigameEmptyTile") {
            r[0]["x"] = r["x"] || 0;
            r[0]["y"] = r["y"] || 0;
            if (r[0]["adjacentRewards"] !== undefined) {
                AztecsHelper.grid[r[0].y][r[0].x] = r[0]["adjacentRewards"];
            }
            else {
                AztecsHelper.grid[r[0].x][r[0].y] = AztecsHelper.emptyCell;
            }
        }
    } else if (r.length > 1) {
        for (let i = 0; i < r.length; i++) {
            const cell = r[i];
            if (cell["__class__"] === "CollectingMinigameEmptyTile") {
                cell["x"] = cell["x"] || 0;
                cell["y"] = cell["y"] || 0;
                if (cell["adjacentRewards"] !== undefined) {
                    AztecsHelper.grid[cell.y][cell.x] = cell["adjacentRewards"];
                }
                else {
                    AztecsHelper.grid[cell.y][cell.x] = AztecsHelper.emptyCell;
                }
            }
        }

    }
    AztecsHelper.CalcBody();
});

FoEproxy.addHandler('ResourceService', 'getPlayerResources', (data, postData) => {
    const r = data.responseData;
    if (!r.resources) {
        return;
    }
    AztecsHelper.MaxMoves = r.resources.aztecs_collecting_minigame_turns || 0;
});


let AztecsHelper = {
    resourceCell: "X",
    emptyCell: " ",
    unknownCell: "?",

    grid: [],
    firstMoveDone: false,
    MovesDone: 0,
    MaxMoves: 0,
    ResourcesLeft: 0,

    mapHeight: 0,
    mapWidth: 0,

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
    CalcBody: function () {
        $('#aztecsHelperBody').empty();
        var table = document.createElement('table');
        var tableBody = document.createElement('tbody');

        AztecsHelper.grid.forEach((rowData) => {
            var row = document.createElement('tr');

            rowData.forEach((cellData) => {
                var cell = document.createElement('td');
                cell.appendChild(document.createTextNode(cellData));
                row.appendChild(cell);
            });

            tableBody.appendChild(row);
        });
        table.className = "aztecTable"
        table.appendChild(tableBody);
        $('#aztecsHelperBody').append(table);
    },
    /**
     * Checks adjacent cells for possible Resources
     * @param {number} x 
     * @param {number} y 
     * @param {number} adj 
     */
    CalcAdjacentCells: () => {
        var map = AztecsHelper.grid;
        var rC = AztecsHelper.resourceCell;
        var eC = AztecsHelper.emptyCell;
        var uC = AztecsHelper.unknownCell;

        var possibleRessources = [];

        for (let x = 0; x < AztecsHelper.mapWidth; x++) {
            for (let y = 0; y < AztecsHelper.mapHeight; y++) {
                var cell = map[x][y];
                if(typeof cell === "number"){
                    var surrUnCells = [];
                    var surrResCells = [];
                    if((surrUnCells = AztecsHelper.GetSurroundingCell(x,y,uC)).length > 0){
                        surrResCells = AztecsHelper.GetSurroundingCell(x,y,rC);
                    }
                }
            }
        }

    },
    /**
     * |    -1/-1 - 0/-1 - +1/-1
     * |    -1/0  - 0/0  - +1/0
     * |    -1/+1 - 0/+1 - +1/+1
     * @param {*} x 
     * @param {*} y 
     */
    HasSurroundingCell: (x,y, cellContent) => {
        var map = AztecsHelper.grid;
        var uC = cellContent;
        var has = false;
        if(y > 0) if(map[x][y-1] === uC) has = true;// 0/-1
        if(x > 0) if(map[x-1][y] === uC) has = true;// -1/0
        if(y < AztecsHelper.mapHeight-1) if(map[x][y+1] === uC) has = true;// 0/+1
        if(x < AztecsHelper.mapWidth-1) if(map[x+1][y] === uC) has = true;// +1/0
        if(x < AztecsHelper.mapWidth-1 && y > 0) if(map[x+1][y-1] === uC) has = true;// +1/-1
        if(y < AztecsHelper.mapHeight-1 && x > 0) if(map[x-1][y+1] === uC) has = true;// -1/+1
        if(x < AztecsHelper.mapWidth-1 && y < AztecsHelper.mapHeight-1) if(map[x+1][y+1] === uC) has = true;// +1/+1
        if(y > 0 && x > 0) if(map[x-1][y-1] === uC) has = true;// -1/-1
        return has;
    },
    /**
     * |    -1/-1 - 0/-1 - +1/-1
     * |    -1/0  - 0/0  - +1/0
     * |    -1/+1 - 0/+1 - +1/+1
     * @param {*} x 
     * @param {*} y 
     */
    GetSurroundingCell: (x,y, cellContent) => {
        var map = AztecsHelper.grid;
        var uC = cellContent;
        var arr = [];
        if(y > 0) if(map[x][y-1] === uC) arr.push({"x":x,"y":y-1});// 0/-1
        if(x > 0) if(map[x-1][y] === uC) arr.push({"x":x-1,"y":y});// -1/0
        if(y < AztecsHelper.mapHeight-1) if(map[x][y+1] === uC) arr.push({"x":x,"y":y+1});// 0/+1
        if(x < AztecsHelper.mapWidth-1) if(map[x+1][y] === uC) arr.push({"x":x+1,"y":y});// +1/0
        if(x < AztecsHelper.mapWidth-1 && y > 0) if(map[x+1][y-1] === uC) arr.push({"x":x+1,"y":y-1});// +1/-1
        if(y < AztecsHelper.mapHeight-1 && x > 0) if(map[x-1][y+1] === uC) arr.push({"x":x-1,"y":y+1});// -1/+1
        if(x < AztecsHelper.mapWidth-1 && y < AztecsHelper.mapHeight-1) if(map[x+1][y+1] === uC) arr.push({"x":x+1,"y":y+1});// +1/+1
        if(y > 0 && x > 0) if(map[x-1][y-1] === uC) arr.push({"x":x-1,"y":y-1});// -1/-1
        return arr;
    },
};