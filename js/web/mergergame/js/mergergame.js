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
	mergerGame.resetCost = data.responseData.resetCost?.resources?.anniversary_energy || 0;
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
	mergerGame.state.energyUsed += mergerGame.resetCost;
	mergerGame.resetCost = data.responseData.resetCost?.resources?.anniversary_energy || 0;
	mergerGame.saveState();
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
	
	mergerGame.cells.push(data.responseData[0])
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
	
	let t_id = data.responseData.id;
	let o_id = postData[0].requestData[1];
	if (o_id==t_id) o_id = postData[0].requestData[2];

	let target = mergerGame.cells.findIndex((e) => e.id == t_id);
	let origin = mergerGame.cells.findIndex((e) => e.id == o_id);

	if (mergerGame.cells[target].isFixed) mergerGame.state.progress += Math.pow(2,mergerGame.cells[target].level-1);
	if (mergerGame.state.progress == mergerGame.state.maxProgress) mergerGame.resetCost = 0;
	
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

	resetCost: 0,

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
		let keys = mergerGame.keyValue();
		let totalValue = mergerGame.state.progress + keys;
		let efficiency = (totalValue / mergerGame.state.energyUsed).toFixed(2);
		
		let colors = ["white","yellow","blue"];
		let order = ["bottom","top","full"]
		
		html = `<table class="foe-table">`
		html += `<tr><td>${i18n("Boxes.MergerGame.Progress")}</td><td>${remainingProgress} / ${mergerGame.state.maxProgress} <img src="${srcLinks.get("/shared/seasonalevents/league/league_anniversary_icon_progress.png",true)}"></td></tr>`
		html += `<tr><td>${i18n("Boxes.MergerGame.Energy")}</td><td>${mergerGame.state.energyUsed} <img src="${srcLinks.get("/shared/seasonalevents/anniversary/event/anniversary_energy.png",true)}"></td></tr>`
		html += `<tr><td>${i18n("Boxes.MergerGame.Keys")}</td><td>${keys} <img src="${srcLinks.get("/shared/seasonalevents/anniversary/event/anniversay_icon_key_full_white.png",true)}"><img src="${srcLinks.get("/shared/seasonalevents/anniversary/event/anniversay_icon_key_full_yellow.png",true)}"><img src="${srcLinks.get("/shared/seasonalevents/anniversary/event/anniversay_icon_key_full_blue.png",true)}"></td></tr>`
		html += `<tr><td>${i18n("Boxes.MergerGame.Efficiency")}</td><td style="font-weight:bold; color: ${efficiency > 0.4 ? 'var(--text-success)' : efficiency < 0.3 ? 'red' : 'var(--text-bright)'}">${efficiency} <img src="${srcLinks.get("/shared/seasonalevents/league/league_anniversary_icon_progress.png",true)}"> /<img src="${srcLinks.get("/shared/seasonalevents/anniversary/event/anniversary_energy.png",true)}"></td></tr>`
		html += `</table>`

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
				html += `</tr><tr><td ${((t==m && o != "full") || (0==m && o == "full") ) ? 'style="font-weight:bold"' : ''}>${t}${(o == "full") ? '/'+ (t+m) : ''}`;
				html += `<img src="${srcLinks.get("/shared/seasonalevents/anniversary/event/anniversay_icon_key_"+o+"_"+i+".png",true)}"></td>`
				for (let lev = 4; lev>0; lev--) {
					val = table[i]["level"+lev][o];
					if (val==0) val = "-";
					html += `<td style="${val != "-" ? 'font-weight:bold;' : ''}${(o=="full" && lev==3 && table[i]["level"+lev][o]>1)?' color:red"': ''}">${val}</td>`
				}
			}
			html += `</tr></table>`
		}
		


		$('#mergerGameDialogBody').html(html);
	},
};

