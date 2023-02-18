/*
 * **************************************************************************************
 * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('MergerGameService', 'getOverview', (data, postData) => {
	//Do not show window if deactivated in settings
	if(!Settings.GetSetting('ShowEventChest')){
		return;
	}
	mergerGame.cells = data.responseData.cells;
	mergerGame.init()
	mergerGame.checkSave();

	// Don't create a new box while another one is still open
    if ($('#mergerGameDialog').length === 0) {
		mergerGame.ShowDialog();
	}
});

FoEproxy.addHandler('MergerGameService', 'resetBoard', (data, postData) => {
	//Do not show window if deactivated in settings
	if(!Settings.GetSetting('ShowEventChest')){
		return;
	}
	mergerGame.cells = data.responseData.cells;
	mergerGame.init()
	mergerGame.UpdateDialog();

// Don't create a new box while another one is still open
if ($('#mergerGameDialog').length === 0) {
	mergerGame.ShowDialog();
}

});

FoEproxy.addHandler('MergerGameService', 'spawnPieces', (data, postData) => {
	// Don't handle when module not open
    if ($('#mergerGameDialog').length === 0) {
		return;
	}
	
	mergerGame.cells.push(data.responseData)
	mergerGame.state.energyUsed += 10;
	mergerGame.updateTable();
	mergerGame.saveState();
	mergerGame.UpdateDialog();
});

FoEproxy.addHandler('MergerGameService', 'mergePieces', (data, postData) => {
	// Don't handle when module not open
    if ($('#mergerGameDialog').length === 0) {
		return;
	}
	
	let t = data.responseData.id;
	let o = postData[0].requestData[1];
	if (o==t) o = postData[0].requestData[2];

	let target = mergerGame.cells.findIndex((e) => e.id == t);
	let origin = mergerGame.cells.findIndex((e) => e.id == o);

	if (mergerGame.cells[target].isFixed) mergerGame.state.progress += Math.pow(2,mergerGame.cells[target].level-1)
	mergerGame.cells[target] = data.responseData;
	mergerGame.cells.splice(origin,1);

	mergerGame.updateTable();
	mergerGame.saveState();

	mergerGame.UpdateDialog();
});

FoEproxy.addHandler('MergerGameService', 'convertPiece', (data, postData) => {
	// Don't handle when module not open
    if ($('#mergerGameDialog').length === 0) {
		return;
	}
	
	target = mergerGame.cells.findIndex((e) => e.id == postData[0].requestData[1]);
	
	mergerGame.state.keys += mergerGame.cells[target].level == 3 ? 1 : 3;
	mergerGame.cells.splice(target,1);

	mergerGame.updateTable();
	mergerGame.saveState();

	mergerGame.UpdateDialog();
});

let mergerGame = {

	cells:[],

	state: {},

	init: ()=> {
	
		mergerGame.state["maxProgress"]= 0;
		mergerGame.state["energyUsed"]= 0;
		mergerGame.state["progress"]= 0;
		mergerGame.state["keys"]= 0;
		for (let x of mergerGame.cells) {
			if (x.isFixed) mergerGame.state.maxProgress += Math.pow(2,x.level-1);
		};
		mergerGame.updateTable();

	},
	
	updateTable: () => {
		let table = {
			white:  {level4:{top:0,bottom:0,full:0},level3:{top:0,bottom:0,full:0},level2:{top:0,bottom:0,full:0},level1:{top:0,bottom:0,full:0}},
			yellow: {level4:{top:0,bottom:0,full:0},level3:{top:0,bottom:0,full:0},level2:{top:0,bottom:0,full:0},level1:{top:0,bottom:0,full:0}},
			blue:   {level4:{top:0,bottom:0,full:0},level3:{top:0,bottom:0,full:0},level2:{top:0,bottom:0,full:0},level1:{top:0,bottom:0,full:0}}}
		
			for (let x of mergerGame.cells) {
				if (! x.id || x.id<0) continue;
				if (x.keyType?.value && x.keyType?.value != "none" ) table[x.type.value]["level" + x.level][x.keyType.value]++;
			};
			mergerGame.state["table"] = table;
	},

	checkSave: () => {
		let x = localStorage.getItem("mergerGameState");
		if (!x) return;
		let oldState=JSON.parse(x);
		let oldTable=JSON.stringify(oldState.table);
		let newTable=JSON.stringify(mergerGame.state.table);
		console.log(oldTable)		
		console.log(newTable)		
		if (oldTable==newTable) {
			mergerGame.state.maxProgress = oldState.maxProgress;
			mergerGame.state.progress = oldState.progress;
			mergerGame.state.energyUsed = oldState.energyUsed;
			mergerGame.state.keys = oldState.keys;
		}
	},
	saveState:() => {
		localStorage.setItem("mergerGameState",JSON.stringify(mergerGame.state))
	},

	keyValue:() => {
		let sum = 0;
		for (let x of mergerGame.cells) {
			if (x.keyType?.value == "full") sum += x.level == 3 ? 1 : 3
		}
		return mergerGame.state.keys + sum;
	},

    /**
     * Shows a User Box with the current production stats
     *
     * @constructor
     */
    ShowDialog: () => {
        HTML.AddCssFile('mergergame');
        
        HTML.Box({
            id: 'mergerGameDialog',
            title: 'Merger Game',
            auto_close: true,
            dragdrop: true,
            minimize: true,
			resize : true
        });

		mergerGame.UpdateDialog();

    },

	
	UpdateDialog: () => {
		if ($('#mergerGameDialog').length === 0) {
			return;
		}
		htmltext=``
		
		let table = mergerGame.state.table
	
		let remainingProgress = mergerGame.state.maxProgress - mergerGame.state.progress;
		let totalValue = mergerGame.state.progress + mergerGame.keyValue();
		let efficiency = (totalValue / mergerGame.state.energyUsed).toFixed(2);
		
		let colors = ["white","yellow","blue"];
		let order = ["bottom","top","full"]
		
		html = `<table class="foe-table">`
		html += `<tr><td>Remaining Progress:</td><td>${remainingProgress} / ${mergerGame.state.maxProgress} <img src="${srcLinks.get("/shared/seasonalevents/league/league_anniversary_icon_progress.png",true)}"></td></tr>`
		html += `<tr><td>Energy used:</td><td>${mergerGame.state.energyUsed} <img src="${srcLinks.get("/shared/seasonalevents/anniversary/event/anniversary_energy.png",true)}"></td></tr>`
		html += `<tr><td>Efficiency (incl. keys):</td><td style="font-weight:bold; color: ${efficiency > 0.4 ? 'var(--text-success)' : efficiency < 0.3 ? 'red' : 'var(--text-bright)'}">${efficiency} <img src="${srcLinks.get("/shared/seasonalevents/league/league_anniversary_icon_progress.png",true)}"> /<img src="${srcLinks.get("/shared/seasonalevents/anniversary/event/anniversary_energy.png",true)}"></td></tr>`
		html += `</table>`
		
		/**vertical table
		for (let i of colors) {
			html += `<table class="Foe-Table"><tr><th></th>`
			for (let o of order) {
				html += `<th><img src="${srcLinks.get("/shared/seasonalevents/anniversary/event/anniversay_icon_key_"+o+"_"+i+".png",true)}"></th>`
			}
			for (let lev = 4; lev>0; lev--) {
				html += `</tr><tr><td><img src="${srcLinks.get("/shared/seasonalevents/anniversary/event/anniversary_gem_"+i+"_"+lev+".png",true)}"></td>`
				for (let o of order) {
					html += `<td>${table[i]["level"+lev][o]}</td>`
				}
			}
			html += `</tr><tr><td></td>`
			for (let o of order) {
				html += `<td>${table[i].level1[o] + table[i].level2[o] + table[i].level3[o] + table[i].level4[o]}</td>`
			}
			html += `</tr></table>`
		}
		*/

		/* horizontal table*/
		let totalPieces = {"white": {"top":0,"bottom":0,"full:":0,"min":0},"yellow": {"top":0,"bottom":0,"full:":0,"min":0},"blue": {"top":0,"bottom":0,"full:":0,"min":0},}
		for (let i of colors) {
			for (let o of order) {
				totalPieces[i][o] = table[i].level1[o] + table[i].level2[o] + table[i].level3[o] + table[i].level4[o];
			}
			totalPieces[i].min = Math.min(totalPieces[i].bottom,totalPieces[i].top);
		}

		for (let i of colors) {
			html += `<table class="foe-table"><tr><th></th>`
			for (let lev = 4; lev>0; lev--) {
				html += `<th><img src="${srcLinks.get("/shared/seasonalevents/anniversary/event/anniversary_gem_"+i+"_"+lev+".png",true)}"></th>`
			}
			for (let o of order) {
				let m = totalPieces[i].min;
				let t = totalPieces[i][o];
				html += `</tr><tr><td ${(t==m && o != "full") ? 'style="font-weight:bold"' : ''}>${t}${(o == "full") ? '/'+ (t+m) : ''}`;
				html += `<img src="${srcLinks.get("/shared/seasonalevents/anniversary/event/anniversay_icon_key_"+o+"_"+i+".png",true)}"></td>`
				for (let lev = 4; lev>0; lev--) {
					html += `<td ${(o=="full" && lev==3 && table[i]["level"+lev][o]>1)?'style="font-weight:bold; color:red"':''}>${table[i]["level"+lev][o]}</td>`
				}
			}
			html += `</tr></table>`
		}
		


		$('#mergerGameDialogBody').html(html);
	},
};

