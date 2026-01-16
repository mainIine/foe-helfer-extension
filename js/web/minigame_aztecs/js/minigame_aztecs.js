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

FoEproxy.addHandler('CollectingMinigameService', 'start', (data, postData) => {
    //Start Minigame
    const r = data.responseData;
    if (r.context !== "merchant") {
        return;
    }
    AztecsHelper.startData = r;
    AztecsHelper.timeout = setTimeout(() => {
        AztecsHelper.start()
    }, 200);
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
    if(postData[0].requestData.filter(x => x?.mainType === "cultural_outpost" && x?.subType === "collecting_minigame_buy_turns")){
        if(postData[0].requestData.filter(x => x?.["resources"] !== undefined)?.[0]?.resources?.aztecs_collecting_minigame_turns > 0){
            AztecsHelper.boughtSomething = true;
        }else{
            AztecsHelper.boughtSomething = false;
        }
    }else{
        AztecsHelper.boughtSomething = false;
    }
});

FoEproxy.addHandler('ResourceService', 'getPlayerResources', (data, postData) => {
    AztecsHelper.processResources(data,postData);
    if (AztecsHelper.timeout !== null) {
        AztecsHelper.start()
    }
});
FoEproxy.addHandler('ResourceService', 'getPlayerResourceBag', (data, postData) => {
    AztecsHelper.processResources(data,postData);
    if (AztecsHelper.timeout !== null) {
        AztecsHelper.start()
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
    timeout: null,
    startData: null,
    start: () => {
        let r = AztecsHelper.startData;
        if (AztecsHelper.timeout !== null) {
            clearTimeout(AztecsHelper.timeout);
            AztecsHelper.timeout = null;
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
    },


    Show: () => {
        if ($('#aztecsHelper').length === 0) {

            // Box in den DOM
            HTML.Box({
                'id': 'aztecsHelper',
                'title': i18n('Boxes.AztecMiniGame.Title'),
                'auto_close': true,
                'minimize': true,
                'dragdrop': false,
			    active_maps:"cultural_outpost"
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
                        cell.className = cellData.content == AztecsHelper.unknownCell 
                            ? "aztec colorU" 
                            : "aztec color0";
                    }  
                    else if(cellData.prob > 0 && cellData.prob < 0.33) {
                        cell.className = "aztec color1";
                    }
                    else if(cellData.prob >= 0.33 && cellData.prob < 0.5) {
                        cell.className = "aztec color2";
                    }
                    else if(cellData.prob >= 0.5 && cellData.prob < 0.66) {
                        cell.className = "aztec color3";
                    }
                    else if(cellData.prob >= 0.66 && cellData.prob < 0.75) {
                        cell.className = "aztec color4";
                    }
                    else if(cellData.prob >= 0.75 && cellData.prob < 1) {
                        cell.className = "aztec color5";
                    }
                    else if(cellData.prob == 1) {
                        cell.className = "aztec color6";
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
            
            span = document.createElement('span');
            span.innerHTML= '&nbsp;'+AztecsHelper.nonresourceCell+'&nbsp;0%';
            span.className = 'aztec color0';
            span.style='font-weight:bold'
            divDes.appendChild(span);
            span = document.createElement('span');
            span.innerHTML= '&nbsp;➜';
            span.className = 'aztec color1';
            span.style='font-weight:bold'
            divDes.appendChild(span);
            span = document.createElement('span');
            span.innerHTML= '&nbsp;33%➜';
            span.className = 'aztec color2';
            span.style='font-weight:bold'
            divDes.appendChild(span);
            span = document.createElement('span');
            span.innerHTML= '&nbsp;50%➜';
            span.className = 'aztec color3';
            span.style='font-weight:bold'
            divDes.appendChild(span);
            span = document.createElement('span');
            span.innerHTML= '&nbsp;66%➜';
            span.className = 'aztec color4';
            span.style='font-weight:bold'
            divDes.appendChild(span);
            span = document.createElement('span');
            span.innerHTML= '&nbsp;75%➜';
            span.className = 'aztec color5';
            span.style='font-weight:bold'
            divDes.appendChild(span);
            span = document.createElement('span');
            span.innerHTML= '&nbsp;100%&nbsp;'+AztecsHelper.resourceCell;
            span.className = 'aztec color6';
            span.style='font-weight:bold'
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
        var map = AztecsHelper.grid;
        const rC = AztecsHelper.resourceCell,
            uC = AztecsHelper.unknownCell,
            nrC = AztecsHelper.nonresourceCell;
        
        var numberCells = {};
        var unknownCells = {};
        var leftRes = AztecsHelper.ResourcesLeft+0;
        var run=0;

        //reset prob and eval attribute
        for (let y = 0; y < AztecsHelper.mapHeight; y++) {
            for (let x = 0; x < AztecsHelper.mapWidth; x++) {
                map[y][x].prob = 0;
            }
        }
        
        for (let y = 0; y < AztecsHelper.mapHeight; y++) {
            for (let x = 0; x < AztecsHelper.mapWidth; x++) {
                var cell = map[y][x];
                if (cell.content === nrC) {cell.prob = 0};
                if (cell.content === rC) {cell.prob = 1};
                if (cell.content === uC) {
                    unknownCells[`y${y}x${x}`] = {"x":x,"y":y};
                    cell.surrNumCells = AztecsHelper.GetSurroundingCell(x,y,"number"); //alle Nachbarzellen mit Zahl
                }
                if (typeof cell.content === "number"){
                    
                    cell.surrUnCells = AztecsHelper.GetSurroundingCell(x,y,uC); //alle unbekannten Nachbarzellen 
                    cell.surrResCells = AztecsHelper.GetSurroundingCell(x,y,rC);//alle Nachbarzellen mit Ressource
                    cell.surrNumCells = AztecsHelper.GetSurroundingCell(x,y,"number"); // alle Nachbarzellen mit Zahl
                    numberCells[`y${y}x${x}`] = {"x":x,"y":y};
                    
                }
            }
        }
        let tmp = JSON.parse(JSON.stringify(numberCells));
        while (Object.keys(tmp).length > 0 && run<20) {
            let tmp2 = {};
            for (let c in tmp) {
                if (tmp2.hasOwnProperty(c)) delete tmp2[c];
                //if (leftRes == 0) break;
                
                let cell = map[tmp[c].y][tmp[c].x];
                cell.surrUnCells = AztecsHelper.GetSurroundingCell(tmp[c].x,tmp[c].y,uC);
                cell.surrResCells = AztecsHelper.GetSurroundingCell(tmp[c].x,tmp[c].y,rC);
                
                //Wenn drumherum unbekannte Felder vorhanden sind
                if (cell.surrUnCells.length > 0){
                    let unrevRes = cell.content - cell.surrResCells.length; //Anzahl übriger Güter
                    if (unrevRes == 0 || unrevRes == cell.surrUnCells.length){ //Anzahl übriger Güter ist 0 oder entspricht der Anzahl unbekannter Felder 
                        let prob = (unrevRes == 0) ? 0 : 1;
                        let content = (unrevRes == 0) ? nrC : rC;
                        for (let cx of cell.surrUnCells) { //surrUnCells sind alle bekannt - entweder Ressource oder keine Ressource 
                            let uC = map[cx.y][cx.x];
                            uC.content = content;
                            uC.prob = prob;
                            for (let snC of uC.surrNumCells) {  //Zahlennachbarn der vormals unbekannten Nachbarzelle prüfen und diese der erneuten Prüfung unterziehen
                                tmp2[`y${snC.y}x${snC.x}`] = snC;                                    
                            }
                            if (prob == 1) leftRes -= 1;
                            let uIndex = `y${cx.y}x${cx.x}`; //Zelle aus der Liste unbekannter Zellen entfernen
                            if (unknownCells.hasOwnProperty(uIndex)) delete unknownCells[uIndex];
                        }
                        cell.surrUnCells = []; //keine unbekannten Nachbarzellen mehr
                    } else {
                        for (let other in numberCells) { //andere Zahlenzellen durchgehen
                            if (other == c) continue;
                            let otherCell = map[numberCells[other].y][numberCells[other].x];
                                otherCell.surrUnCells = AztecsHelper.GetSurroundingCell(numberCells[other].x,numberCells[other].y,uC);
                                otherCell.surrResCells = AztecsHelper.GetSurroundingCell(numberCells[other].x,numberCells[other].y,rC);
                
                            let Overlap = [], Diff=[];
                            [Overlap, Diff] = AztecsHelper.Compare(cell.surrUnCells, otherCell.surrUnCells); //Überlapp und Unterschied der auf unbekannten Nachbarn zwischen der Zelle und der anderen Zelle bestimmen
                            
                            if (Overlap.length!=0) { //wenn es einen Überlapp gibt
                                let testP= Math.max(0,
                                                    otherCell.content + Overlap.length - otherCell.surrUnCells.length - otherCell.surrResCells.length);
                                //for (let oC of Overlap) { //Summe der Wahrscheinlichkeiten der Überlappzellen in Bezug auf die andere Zelle bestimmen
                                //    if (map[oC.y][oC.x].hasOwnProperty("probList")) {
                                //        testP += map[oC.y][oC.x].probList[other] || 0;
                                //    } 
                                //}
                                let min = unrevRes - (otherCell.content - otherCell.surrResCells.length);  //min Anzahl der Diff-Zellen die eine Ressource haben
                                if (min < 0) min = 0;
                                let max = unrevRes - testP; //max Anzahl der Diff Zellen die eine Ressource haben können

                                if (Diff.length == min || max == 0){ // Anzahl Diffzellen entspricht dem minimum oder das max ist 0
                                    let prob = (max == 0) ? 0 : 1;
                                    let content = (max == 0) ? nrC : rC;
                                    for (let cx of Diff) {  //Diff Zellen sind alle bekannt - entweder Ressource oder keine Ressource 
                                        let uC = map[cx.y][cx.x];
                                        uC.content = content;
                                        uC.prob = prob;
                                        for (let snC of uC.surrNumCells) {  //Zahlennachbarn der vormals unbekannten Nachbarzelle prüfen und diese der erneuten Prüfung unterziehen
                                            tmp2[`y${snC.y}x${snC.x}`] = snC;                                    
                                        }
                                        if (prob == 1) leftRes -= 1;
                                        let uIndex=`y${cx.y}x${cx.x}`;
                                        if (unknownCells.hasOwnProperty(uIndex)) delete unknownCells[uIndex]; //entferne Zelle aus Liste unbekannter Zellen
                                    }
                                    cell.surrUnCells = JSON.parse(JSON.stringify(Overlap)); // da alle Diff-Zellen bekannt, werden unbekannte Nachbarzellen reduziert auf Überlapp
                                    unrevRes -= (max == 0) ? 0 : min; //anzahl übrige Ressourcen um Zelle reduzieren
                                }
                            }
                        }
                        if (cell.surrUnCells.length > 0) {//} && leftRes > 0) { //es sind noch unbekannte Nachbarzellen vorhanden
                            for (let dC of cell.surrUnCells) {//unbekannte Nachbarzellen durchgehen
                                let newP = unrevRes / cell.surrUnCells.length; //wahrscheinlichkeit, dass Nachbarzelle eine Ressource hat ist Anzahl Ressourcen/Anzahl unbekannter Nachbarn 
                                if (!map[dC.y][dC.x].hasOwnProperty("probList")) map[dC.y][dC.x].probList = []; //probList anlegen, falls noch nicht vorhanden
                                let oldP = map[dC.y][dC.x].probList[c] || 0; //bisherige Wahrscheinlichkeit auslesen
                                if (oldP != newP) {//wenn sich Wahrscheinlichkeit geändert hat
                                    map[dC.y][dC.x].probList[c] = newP; //neue Wahrscheinlichkeit zuweisen
                                    for (snC of map[dC.y][dC.x].surrNumCells) { // und benachbarte Zahlenzellen erneuter Prüfung unterziehen
                                        tmp2[`y${snC.y}x${snC.x}`] = snC;                                   
                                    }
                                }
                            }
                        } 
                    }
                }
            }
            tmp = JSON.parse(JSON.stringify(tmp2));
            run = run+1;
            if (run>=10) {
                console.log("Endlosschleife???");
            }

        }  
        
        for (let c in unknownCells) { //alle noch unbekannten Zellen durchgehen
            if (!unknownCells.hasOwnProperty(c)) continue;
            let cell = unknownCells[c];
            if (leftRes==0) {
                map[cell.y][cell.x].prob = 0;
                map[cell.y][cell.x].content = nrC;
                if (!(!map[cell.y][cell.x].probList)) delete map[cell.y][cell.x].probList
                continue;
            }

            if (!map[cell.y][cell.x].probList) continue; //wenn probList nicht existiert
            map[cell.y][cell.x].prob = Math.max(...AztecsHelper.remIndex(map[cell.y][cell.x].probList)); //maximum der probList als Wahrscheilichkeit notieren
            delete map[cell.y][cell.x].probList; //probList entfernen
        }
        
        
        AztecsHelper.CalcBody();
        if(AztecsHelper.MovesLeft <= 0) return $('#aztecsHelper').length > 0 && HTML.CloseOpenBox('aztecsHelper');
        
    },

    Compare: (BaseArray, CompareArray)=>{
        const Overlap = BaseArray.filter(value => CompareArray.filter(value2 => value.y==value2.y && value.x==value2.x).length > 0);
        const Diff = BaseArray.filter(value => CompareArray.filter(value2 => value.y==value2.y && value.x==value2.x).length == 0);
        //let Overlap=[];
        //let Diff=[];
        //BaseArray.forEach(value => {
        //    if (CompareArray.filter(value2 => value.y==value2.y && value.x==value2.x).length > 0) {
        //        Overlap.push(value);
        //    }else{
        //        Diff.push(value);
        //    }
        //})

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

    remIndex: (array) => {
        let out=[];
        for (x in array) {
            if (array.hasOwnProperty(x)) out.push(array[x]);
        }
        return out;
    },

    density: (goods, tries) => {
        let w=11;
        let h=7;

        let map=[];
        let heat=[];
        
        for (let y=0; y<h;y++) {
            heat[y] = [];
            map[y] = [];
            for (let x=0; x<w;x++) {
                heat[y][x] = 0;
                map[y][x] = "";
            }
        }
        
        for (let j=0;j<tries;j++) {
            let i=goods;
            while (i>0) {
                let x=Math.random()*w |0;
                let y=Math.random()*h |0;

                if (map[y][x] != 'G') {

                    if(x > 0) if(map[y][x-1] !== 'G') map[y][x-1] = 'N';// y0/x-1
                    if(y > 0) if(map[y-1][x] !== 'G') map[y-1][x] = 'N';// y-1/x0
                    if(x < w-1) if(map[y][x+1] !== 'G') map[y][x+1]='N';// y0/x+1
                    if(y < h-1) if(map[y+1][x] !== 'G') map[y+1][x]='N';// y+1/x0
                    if(y < h-1 && x > 0) if(map[y+1][x-1] !== 'G') map[y+1][x-1]='N';// y+1/x-1
                    if(x < w-1 && y > 0) if(map[y-1][x+1] !== 'G') map[y-1][x+1]='N';// y-1/x+1
                    if(y < h-1 && x < w-1) if(map[y+1][x+1] !== 'G') map[y+1][x+1]='N';// +1/+1
                    if(x > 0 && y > 0) if(map[y-1][x-1] !== 'G') map[y-1][x-1]='N';// -1/-1
                    i--
                }
                
            }

            for (let x=0; x<w;x++) {
                for (let y=0; y<h;y++) {
                    if (map[y][x] == "N") heat[y][x]++;
                    map[y][x] = "";
                }
            }
        }
        for (let x=0; x<w;x++) {
            for (let y=0; y<h;y++) {
                heat[y][x] = Math.floor(heat[y][x]/tries*100)/100;
            }
        }
        console.log(heat);
    },

    test:()=>{
        AztecsHelper.mapHeight=7;
        AztecsHelper.mapWidth=11;
        AztecsHelper.grid = JSON.parse('[[{"content":1},{"content":1},{"content":" "},{"content":" "},{"content":" "},{"content":1},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"}],[{"content":"?"},{"content":1},{"content":" "},{"content":" "},{"content":" "},{"content":2},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"}],[{"content":1},{"content":1},{"content":" "},{"content":" "},{"content":" "},{"content":1},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"}],[{"content":" "},{"content":" "},{"content":" "},{"content":" "},{"content":" "},{"content":2},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"}],[{"content":1},{"content":1},{"content":1},{"content":" "},{"content":" "},{"content":1},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"}],[{"content":"?"},{"content":"?"},{"content":3},{"content":2},{"content":1},{"content":2},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"}],[{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"},{"content":"?"}]]');
        AztecsHelper.CalcAdjacentCells();
    },
    processResources: (data,postData)=>{
	    if (data.responseData?.type?.value && data.responseData?.type?.value != 'PlayerMain') return; // for now ignore all other source types
        if (postData[0].requestData.filter(x => x?.mainType === "cultural_outpost" && x?.subType === "collecting_minigame_buy_turns").length > 0){
            if (postData[0].requestData.filter(x => x?.["resources"] !== undefined)?.[0]?.resources?.aztecs_collecting_minigame_turns > 0){
                AztecsHelper.boughtSomething = true;
            }else{
                AztecsHelper.boughtSomething = false;
            }
        } else {
            AztecsHelper.boughtSomething = false;
        }

        const r = data?.responseData?.resources?.resources || data?.responseData?.resources
        if (!r) return
        
        AztecsHelper.MovesLeft = r.aztecs_collecting_minigame_turns || 0;

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
    }

};