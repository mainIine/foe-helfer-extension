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

FoEproxy.addHandler('MergerGameService', 'all', (data, postData) => {
	
	if (data.requestMethod != "getOverview" && data.requestMethod != "resetBoard") return;
	//Do not show window if deactivated in settings
	if(!Settings.GetSetting('ShowEventChest')){
		return;
	}
	if (!mergerGame.state.day) mergerGame.state.day = moment.unix(GameTime).dayOfYear()
	if (data.requestMethod == "resetBoard") {
		if (mergerGame.state.day == moment.unix(GameTime).dayOfYear())  {//gleicher Tag wie zuvor
			mergerGame.state.daily.progress += mergerGame.state.progress;
			mergerGame.state.daily.energyUsed += mergerGame.state.energyUsed;
			mergerGame.state.daily.keys += mergerGame.state.keys;		
		} else {
			mergerGame.state.daily={progress:0,keys:0,energyUsed:0}
		}
		mergerGame.state.day = moment.unix(GameTime).dayOfYear()
	}
	mergerGame.event = data.responseData.context.replace("_event","")
	mergerGame.cells = data.responseData.cells;
	mergerGame.levelValues = data.responseData?.lookup?.pieceConfig[0]?.grandPrizeProgress || {1:1,2:2,3:3,4:4};
	mergerGame.keyValues = {3:data.responseData?.lookup?.keyConversion[0]?.amount || 1,4:data.responseData?.lookup?.keyConversion[1]?.amount|| 3};
	mergerGame.spawnCost = data.responseData?.cells[1]?.spawnCost?.resources[mergerGame.eventData[mergerGame.event].currency] || 10;
	mergerGame.state["maxProgress"]= 0;
	mergerGame.state["energyUsed"]= 0;
	mergerGame.state["progress"]= 0;
	mergerGame.state["keys"]= 0;
	mergerGame.colors = mergerGame.eventData[mergerGame.event].colors;
	mergerGame.types = mergerGame.eventData[mergerGame.event].types;
	for (let x of mergerGame.cells) {
		if (x.isFixed) mergerGame.state.maxProgress += mergerGame.levelValues[x.level];
	};
	for (let x of mergerGame.cells[1].spawnChances) {
		if (!x) continue;
		if (!mergerGame.spawnChances[x.type.value]) mergerGame.spawnChances[x.type.value] = {}
		mergerGame.spawnChances[x.type.value][x.level] = x.spawnChance;
	}
	mergerGame.updateTable();
	
	if (data.requestMethod == "getOverview") {
		mergerGame.checkSave();
		mergerGame.ShowDialog();
	} else { //resetBoard
		mergerGame.state.energyUsed += (mergerGame.settings.useAverage && mergerGame.settings.useAverage > 0) ? mergerGame.settings.useAverage : mergerGame.resetCost;
		mergerGame.saveState();
		mergerGame.updateDialog();
	}
	if (mergerGame.state.progress == mergerGame.state.maxProgress) {
		mergerGame.resetCost = 0;
	} else {
		mergerGame.resetCost = data.responseData.resetCost?.resources[mergerGame.eventData[mergerGame.event].currency] || 0;
	}
	
});


FoEproxy.addHandler('MergerGameService', 'spawnPieces', (data, postData) => {
	// Don't handle when module not open
    if ($('#mergerGameDialog').length === 0) {
		return;
	}
	
	mergerGame.cells.push(data.responseData[0])
	mergerGame.state.energyUsed += mergerGame.spawnCost;
	mergerGame.updateTable();
	mergerGame.saveState();
	mergerGame.updateDialog();
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

	if (mergerGame.cells[target].isFixed) mergerGame.state.progress += mergerGame.levelValues[mergerGame.cells[target].level];
	if (mergerGame.state.progress == mergerGame.state.maxProgress) mergerGame.resetCost = 0;

	mergerGame.cells[target] = data.responseData;
	mergerGame.cells.splice(origin,1);

	mergerGame.updateTable();
	mergerGame.saveState();

	mergerGame.updateDialog();

});

FoEproxy.addHandler('MergerGameService', 'convertPiece', (data, postData) => {
	// Don't handle when module not open
    if ($('#mergerGameDialog').length === 0) {
		return;
	}
	
	target = mergerGame.cells.findIndex((e) => e.id == postData[0].requestData[1]);
	
	mergerGame.state.keys += mergerGame.keyValues[mergerGame.cells[target].level];
	mergerGame.cells.splice(target,1);

	mergerGame.updateTable();
	mergerGame.saveState();

	mergerGame.updateDialog();
});

let mergerGame = {
	event:"soccer",
	colors: ["attacker","midfielder","defender"],
	types: ["left","right","full"],
	spawnCost: 5,
	cells:[],
	spawnChances:{white:{1:14,2:8,3:5,4:3},blue:{1:14,2:8,3:5,4:3},yellow:{1:19,2:10,3:7,4:4},defender:{1:14,2:8,3:5,4:3},attacker:{1:14,2:8,3:5,4:3},midfielder:{1:19,2:10,3:7,4:4}},
	state: {
		daily:{progress:0,keys:0,energyUsed:0},
		maxProgress: 0,
		energyUsed:0,
		progress:0,
		keys: 0
	},
	resetCost: 0,
	levelValues: {1:1,2:1,3:1,4:2},
	keyValues: {3:1, 4:3},
	settings: JSON.parse(localStorage.getItem("MergerGameSettings") || '{"keyValue":1.3,"targetProgress":3750,"availableCurrency":11000,"hideOverlay":true,"useAverage":0}'),
	eventData:{
		anniversary: {
			progress:"/shared/seasonalevents/league/league_anniversary_icon_progress.png",
			energy:"/shared/seasonalevents/anniversary/event/anniversary_energy.png",
			keyfile:"/shared/seasonalevents/anniversary/event/anniversay_icon_key_",
			colors: ["white","yellow","blue"],
			CSScolors: {white:"#7fecba",yellow:"#e14709",blue:"#08a9f7"},
			types: ["top","bottom","full"],
			partname:"key",
			tile:"gem",
			currency:`anniversary_energy`,
			solverOut:{top:"Tip",bottom:"Handle",full:"Full"}
		},
		soccer:{
			progress:"/shared/icons/reward_icons/reward_icon_soccer_trophy.png",
			energy:"/shared/seasonalevents/soccer/event/soccer_football.png",
			keyfile:"/shared/seasonalevents/soccer/event/soccer_icon_badge_",
			colors: ["attacker","midfielder","defender"],
			CSScolors: {attacker:"#ec673a",midfielder:"#e7d20a",defender:"#44d3e2"},
			types: ["left","right","full"],
			partname:"badge",
			tile:"player",
			currency:`soccer_football`,
			solverOut:{left:"Core",right:"Frame",full:"Full"}
		}
	},
	solved: {keys:0,progress:0},
	hideDaily:true,

	updateTable: () => {
		let table = {},
			unlocked = {};
		for (x of mergerGame.colors) {
			table[x]={}
			unlocked[x]={}
			for (l of [1,2,3,4]) {
				table[x][l]={}
				unlocked[x][l]={}
				for (t of mergerGame.types) {
					table[x][l][t]=0;
					unlocked[x][l][t]=0;
				}
				unlocked[x][l]["none"]=0;
			}
		}
		for (let x of mergerGame.cells) {
			if (! x.id || x.id<0) continue;
			if (!x.keyType?.value) continue;
			if (x.keyType.value !="none") {
				table[x.type.value][x.level][x.keyType.value]++;
			}
			if (!x.isFixed) {
				unlocked[x.type.value][x.level][x.keyType.value]++;
			}
		};
		mergerGame.state["table"] = table;
		mergerGame.state["unlocked"] = unlocked;
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
			mergerGame.state.day = oldState.day;
			mergerGame.state.daily = oldState.daily || {progress:0,keys:0,energyUsed:0}
		}
	},
	
	saveState:() => {
		localStorage.setItem("mergerGameState",JSON.stringify(mergerGame.state))
	},

	keySum:() => {
		let sum = 0;
		for (let x of mergerGame.cells) {
			if (x.keyType?.value == "full") sum += mergerGame.keyValues[x.level];
		}
		if (sum>0 && !($('#mergerGameDialog.closed').length > 0 && mergerGame.settings.hideOverlay)) {
			if ($('#mergerGameResetBlocker').length === 0) {
				let blocker = document.createElement("img");
				blocker.id = 'mergerGameResetBlocker';
				blocker.classList = mergerGame.event;
				blocker.src = srcLinks.get("/city/gui/great_building_bonus_icons/great_building_bonus_plunder_repel.png", true);
				blocker.title = i18n("Boxes.MergerGame.KeysLeft."+mergerGame.event);
				$('#game_body')[0].append(blocker);
				$('#mergerGameResetBlocker').on("click",()=>{$('#mergerGameResetBlocker').remove()});
			} 
		} else {
			$('#mergerGameResetBlocker').remove()
		}
		return mergerGame.state.keys + sum;
	},

    /**
     * Shows a User Box with the current production stats
     *
     * @constructor
     */
    ShowDialog: () => {
        
		// Don't create a new box while another one is still open
		if ($('#mergerGameDialog').length === 0) {
			HTML.AddCssFile('mergergame');
			
			HTML.Box({
				id: 'mergerGameDialog',
				title: 'Merger Game',
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize : true,
				ask: i18n('Boxes.MergerGame.HelpLink'),
				settings: 'mergerGame.ShowSettingsButton()'
			});

			$('#mergerGameDialogclose').on("click",()=>{$('#mergerGameResetBlocker').remove()});
			$('#mergerGameDialogButtons .window-minimize').on("click",()=>{
				if (mergerGame.settings.hideOverlay) $('#mergerGameResetBlocker').remove()
			});
		}
		
		mergerGame.updateDialog();
    },
	
	updateDialog: () => {
		let type1 = mergerGame.types[1],
			type2 = mergerGame.types[0];
		if ($('#mergerGameDialog').length === 0) {
			return;
		}
		htmltext=``
		
		let table = mergerGame.state.table
		let targetEfficiency = mergerGame.settings.targetProgress/mergerGame.settings.availableCurrency;
		let effcolor = (eff,target=targetEfficiency) => {
			return eff > target*1.15 ? 'var(--text-success)' : eff > target*1 ? 'yellow' : eff > target * 0.95 ? 'var(--text-bright)' : 'red';
		}
		let keys = mergerGame.keySum();
		let totalValue = mergerGame.state.progress + keys*mergerGame.settings.keyValue;
		let efficiency = (totalValue / mergerGame.state.energyUsed).toFixed(2);
		
		let dailyEff = Math.round(((mergerGame.state.progress + mergerGame.state.daily.progress + (mergerGame.state.keys + mergerGame.state.daily.keys)*mergerGame.settings.keyValue)/(mergerGame.state.energyUsed+mergerGame.state.daily.energyUsed))*100)/100;

		let totalPieces = {}
		for (x of mergerGame.colors) {
			totalPieces[x]={}
			for (t of mergerGame.types) {
				totalPieces[x][t]=0;
			}
		}
		let maxKeys= 0;
		for (let i of mergerGame.colors) {
			for (let t of mergerGame.types) {
				totalPieces[i][t] = table[i][1][t] + table[i][2][t] + table[i][3][t] + table[i][4][t];
			}
			totalPieces[i]["min"] = Math.min(totalPieces[i][type1],totalPieces[i][type2]);
			maxKeys+=totalPieces[i]["min"]*mergerGame.keyValues[4];
		}

		html = `<table class="foe-table ${mergerGame.hideDaily ? 'hideDaily':''}" id="MGstatus">`
		//Energy/fooballs
		html += `<tr><td class="textleft">${i18n("Boxes.MergerGame.Energy."+mergerGame.event)}</td>`
		html += `<td title="${i18n("Boxes.MergerGame.EfficiencyTargetProgress."+mergerGame.event)+Math.floor(totalValue)+"/"+Math.floor(mergerGame.state.energyUsed*targetEfficiency)|0}">${mergerGame.state.energyUsed} </td>`
		html += `<td><img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].energy,true)}"> ${mergerGame.state.energyUsed+mergerGame.state.daily.energyUsed}</td>`
		//Progress
		html += `<tr><td class="textleft">${i18n("Boxes.MergerGame.ProgressCollected")}</td>`
		html += `<td><img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].progress,true)}"> ${mergerGame.state.progress} / ${mergerGame.state.maxProgress}</td>`
		html += `<td>${mergerGame.state.progress + mergerGame.state.daily.progress}</td>`
		//Keys/badges
		html += `<tr><td class="textleft">${i18n("Boxes.MergerGame.Keys."+mergerGame.event)}</td>`
		html += `<td><img ${mergerGame.event=="soccer"?'class="toprightcorner full"':''} src="${srcLinks.get(`${mergerGame.eventData[mergerGame.event].keyfile}full_${mergerGame.colors[2]}.png`,true)}">`
		html += `<img ${mergerGame.event=="soccer"?'class="toprightcorner full"':''} style="margin-left: -15px" src="${srcLinks.get(`${mergerGame.eventData[mergerGame.event].keyfile}full_${mergerGame.colors[1]}.png`,true)}">`
		html += `<img ${mergerGame.event=="soccer"?'class="toprightcorner full"':''} style="margin-left: -15px" src="${srcLinks.get(`${mergerGame.eventData[mergerGame.event].keyfile}full_${mergerGame.colors[0]}.png`,true)}"> ${keys} / ${maxKeys}</td>`
		html += `<td>${keys + mergerGame.state.daily.keys}</td>`
		//Efficiency
		html += `<tr><td class="textleft">${i18n("Boxes.MergerGame.Efficiency."+mergerGame.event)}</td>`
		html += `<td style="font-weight:bold; color: ${effcolor(efficiency)}" title="${i18n("Boxes.MergerGame.EfficiencyTotalProgress") + Math.floor(efficiency*mergerGame.settings.availableCurrency)}"> <img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].progress,true)}">/<img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].energy,true)}">${efficiency} </td>`
		html += `<td style="font-weight:bold; color: ${effcolor(dailyEff)}">${dailyEff.toFixed(2)} </td>`
		
		html += `</table>`

		for (let i of mergerGame.colors) {
			html += `<table class="foe-table"><tr><th></th>`
			for (let lev = 4; lev>0; lev--) {
				html += `<th>${mergerGame.state.unlocked[i][lev].none}<img src="${srcLinks.get(`/shared/seasonalevents/${mergerGame.event}/event/${mergerGame.event}_${mergerGame.eventData[mergerGame.event].tile}_${i}_${lev}.png`,true)}" title="${mergerGame.spawnChances[i][lev]}%"></th>`
			}
			for (let o of mergerGame.types) {
				let m = totalPieces[i].min;
				let t = totalPieces[i][o];
				html += `</tr><tr><td ${((t==m && o != "full") || (0==m && o == "full") ) ? 'style="font-weight:bold"' : ''}>${t}${(o == "full") ? '/'+ (t+m) : ''}`;
				html += `<img class="${mergerGame.event=="soccer"? 'toprightcorner':''}${o=="full" ? ' full':''}" src="${srcLinks.get(`${mergerGame.eventData[mergerGame.event].keyfile}${o}_${i}.png`,true)}"></td>`
				for (let lev = 4; lev>0; lev--) {
					val = table[i][lev][o];
					if (val==0) val = "-";
					html += `<td style="${val != "-" ? 'font-weight:bold;' : ''}${(o=="full" && lev==3 && table[i][lev][o]>1)?' color:red"': ''}">${val}</td>`
				}
			}
			html += `</tr></table>`
		}
		
		$('#mergerGameDialogBody').html(html);
	},

	ShowSettingsButton: () => {
        let h = [];
		h.push(`<table class="foe-table"><tr><td>`)
        h.push(`${i18n('Boxes.MergerGame.KeyValue.'+mergerGame.event)}</td><td>`);
        h.push(`<input type="Number" id="MGkeyValue" oninput="mergerGame.SaveSettings()" value="${mergerGame.settings.keyValue}"></td></tr><tr><td>`);
        h.push(`${i18n('Boxes.MergerGame.availableCurrency.'+mergerGame.event)}</td><td>`);
        h.push(`<input type="Number" id="MGavailableCurrency" oninput="mergerGame.SaveSettings()" value="${mergerGame.settings.availableCurrency}"></td></tr><tr><td>`);
        h.push(`${i18n('Boxes.MergerGame.targetProgress')}</td><td>`);
        h.push(`<input type="Number" id="MGtargetProgress" oninput="mergerGame.SaveSettings()" value="${mergerGame.settings.targetProgress}"></td></tr><tr><td>`);
        h.push(`${i18n('Boxes.MergerGame.hideOverlay')}</td><td>`);
        h.push(`<input type="checkbox" id="MGhideOverlay" oninput="mergerGame.SaveSettings()"${mergerGame.settings.hideOverlay ? ' checked' : ''}></td></tr><tr><td>`);
        h.push(`${i18n('Boxes.MergerGame.useAverage')}</td><td>`);
        h.push(`<input type="Number" id="MGuseAverage" oninput="mergerGame.SaveSettings()" value="${mergerGame.settings.useAverage || 0}"></td></tr></table>`);
        
		$('#mergerGameDialogSettingsBox').html(h.join(''));
		$("#mergerGameDialogSettingsBox input").keyup(function(event) {
			if (event.keyCode === 13) {
				$("#mergerGameDialogButtons .window-settings").trigger("click");
			}
		});
    },
	
	SaveSettings: () => {
        mergerGame.settings["keyValue"] = Number($('#MGkeyValue').val()) || 1;
		mergerGame.settings["targetProgress"] = Number($('#MGtargetProgress').val()) || 3250;
		mergerGame.settings["availableCurrency"] = Number($('#MGavailableCurrency').val()) || 10500;
		mergerGame.settings["useAverage"] = Number($('#MGuseAverage').val()) || 0;
		mergerGame.settings["hideOverlay"] = $('#MGhideOverlay')[0].checked;
		localStorage.setItem('MergerGameSettings', JSON.stringify(mergerGame.settings));
        mergerGame.updateDialog();
    },
}
