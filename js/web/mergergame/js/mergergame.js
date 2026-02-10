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

FoEproxy.addHandler('MergerGameService', 'all', (data, postData) => {
	
	if (data.requestMethod != "getOverview" && data.requestMethod != "resetBoard") return;
	//Do not show window if deactivated in settings
	if(!Settings.GetSetting('ShowEventChest') || !(Settings.GetSetting('EventHelperMerge') === undefined ? true : Settings.GetSetting('EventHelperMerge'))) {
		return;
	}
	let board = data.responseData.board || data.responseData;
	if (!mergerGame.state.day) mergerGame.state.day = moment.unix(GameTime.get()).dayOfYear()

	if (data.requestMethod == "resetBoard") {
		if (mergerGame.state.day == moment.unix(GameTime.get()).dayOfYear())  {//gleicher Tag wie zuvor
			mergerGame.state.daily.progress += mergerGame.state.progress;
			mergerGame.state.daily.energyUsed += mergerGame.state.energyUsed;
			mergerGame.state.daily.keys += mergerGame.state.keys;		
		} else {
			mergerGame.state.daily={progress:0,keys:0,energyUsed:0}
		}
		mergerGame.state.day = moment.unix(GameTime.get()).dayOfYear()
	}
	mergerGame.event = board.context.replace("_event","")
	mergerGame.cells = board.cells;
	mergerGame.levelValues = board?.lookup?.pieceConfig[0]?.grandPrizeProgress || {1:1,2:2,3:3,4:4};
	if (board?.lookup?.keyConversion) {
		mergerGame.keyValues = {};
		for (x of board?.lookup?.keyConversion) {
			mergerGame.keyValues[x.level] = x.amount;
		}
	}
	mergerGame.lookup = board?.lookup
	mergerGame.spawnCost = board?.cells[1]?.spawnCost?.resources[mergerGame.eventData[mergerGame.event].currency] || 10;
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
		mergerGame.resetCost = board.resetCost?.resources[mergerGame.eventData[mergerGame.event].currency] || 0;
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

FoEproxy.addHandler('MergerGameService', 'useBooster', (data, postData) => {
// Don't handle when module not open
	if ($('#mergerGameDialog').length === 0) {
		return;
	}

	for (tile of data.responseData.updatedPieces) {
		let target = mergerGame.cells.findIndex((e) => e.id == tile.id);
		if (target>0) {
			mergerGame.cells[target] = tile;
		} else {
			mergerGame.cells.push(tile)
		}
	}

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
	hasJoker:false,
	event:"anniversary",
	colors: ["white","yellow","blue","colorless"],
	types: ["top","bottom","full"],
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
	keyValues: {1:1, 2:1, 3:1, 4:3},
	settings: JSON.parse(localStorage.getItem("MergerGameSettings") || '{"keyValue":1.3,"targetProgress":3750,"availableCurrency":11000,"hideOverlay":true,"useAverage":0}'),
	eventData:{
		anniversary: {
			progress:"/shared/seasonalevents/league/league_anniversary_icon_progress.png",
			energy:"/shared/seasonalevents/anniversary/event/anniversary_energy.png",
			colors: ["white","yellow","blue","colorless"],
			types: ["top","bottom","full"],
			tile:"_gem",
			currency:`anniversary_energy`,
		},
		soccer:{
			progress:"/shared/icons/reward_icons/reward_icon_soccer_trophy.png",
			energy:"/shared/seasonalevents/soccer/event/soccer_football.png",
			colors: ["attacker","midfielder","defender"],
			types: ["left","right","full"],
			tile:"_player",
			currency:`soccer_football`,
		},
		care:{
			progress:"/shared/icons/reward_icons/reward_icon_care_globe.png",
			energy:"/shared/icons/reward_icons/reward_icon_care_worker.png",
			colors: ["red","green","blue","colorless"],
			types: ["top","bottom","full"],
			tile:"",
			currency:`care_worker`,
		}
	},
	solved: {keys:0,progress:0},
	simulation: {},
	simResult:null,
	hideDaily:true,

	updateTable: () => {
		mergerGame.hasJoker = false;
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
			if (x?.type?.value=="colorless") mergerGame.hasJoker = true;
			if (x.keyType.value !="none") {
				table[x.type.value][x.level][x.keyType.value]++;
			}
			if (!x.isFixed) {
				unlocked[x.type.value][x.level][x.keyType.value]++;
			}
		};
		mergerGame.state["table"] = table;
		mergerGame.state["unlocked"] = unlocked;
		
		if (!mergerGame.hasJoker) {
			mergerGame.solve();
		} else {
			mergerGame.solved = {keys:0,progress:0};
			mergerGame.simResult = {keys:{min:"?",max:"?",average:"?"},progress:{min:"?",max:"?",average:"?"}}
		}
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
				blocker.className = mergerGame.event+" helper-blocker";
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
				settings: 'mergerGame.ShowSettingsButton()',
			    active_maps:"main"
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
		let simEff = mergerGame.hasJoker?"???":Math.round((mergerGame.state.progress + mergerGame.solved.progress + (mergerGame.state.keys + mergerGame.solved.keys)*mergerGame.settings.keyValue)/mergerGame.state.energyUsed*100)/100||0
		
		let simMinEff = mergerGame.hasJoker?"?":Math.round((simEff * mergerGame.state.energyUsed + mergerGame.simResult.value.min)/(mergerGame.state.energyUsed + mergerGame.spawnCost)*100)/100
		let simMaxEff = mergerGame.hasJoker?"?":Math.round((simEff * mergerGame.state.energyUsed + mergerGame.simResult.value.max)/(mergerGame.state.energyUsed + mergerGame.spawnCost)*100)/100
		let simAvgEff = mergerGame.hasJoker?"?":Math.round((simEff * mergerGame.state.energyUsed + mergerGame.simResult.value.average)/(mergerGame.state.energyUsed + mergerGame.spawnCost)*100)/100

		let dailyEff = Math.round(((mergerGame.state.progress + mergerGame.state.daily.progress + (mergerGame.state.keys + mergerGame.state.daily.keys)*mergerGame.settings.keyValue)/(mergerGame.state.energyUsed+mergerGame.state.daily.energyUsed))*100)/100;

		let totalPieces = {}
		for (x of mergerGame.colors) {
			totalPieces[x]={}
			for (t of mergerGame.types) {
				totalPieces[x][t]=0;
			}
		}
		let maxKeys= keys;
		for (let i of mergerGame.colors) {
			for (let t of mergerGame.types) {
				totalPieces[i][t] = table[i][1][t] + table[i][2][t] + table[i][3][t] + table[i][4][t];
			}
			totalPieces[i]["min"] = Math.min(totalPieces[i][type1],totalPieces[i][type2]);
			maxKeys+=totalPieces[i]["min"]*mergerGame.keyValues[4];
		}
		let keyimg = (color,type) => {
			return srcLinks.get(`/shared/seasonalevents/${mergerGame.event}/event/${mergerGame.lookup.keyIconAssetIds[color][type]}.png`,true)
		}

		html = `<table class="foe-table ${mergerGame.hideDaily ? 'hideDaily':''}" id="MGstatus"><tr><th title="${i18n("Boxes.MergerGame.Status.Title")}">${i18n("Boxes.MergerGame.Status")}</th>`
		html += `<th onclick="$('#MGstatus').toggleClass('hideDaily'); mergerGame.hideDaily=!mergerGame.hideDaily" title="${i18n("Boxes.MergerGame.Round.Title")}">${i18n("Boxes.MergerGame.Round")}</th>`
		html += `<th onclick="$('#MGstatus').toggleClass('hideDaily'); mergerGame.hideDaily=!mergerGame.hideDaily" title="${i18n("Boxes.MergerGame.Day.Title")}">${i18n("Boxes.MergerGame.Day")}</th>`
		html += `<th style="border-left: 1px solid var(--border-tab)" title="${i18n("Boxes.MergerGame.Simulation.Title")}">${i18n("Boxes.MergerGame.Simulation")}</th>`
		html += `<th colspan="2" style="border-left: 1px solid var(--border-tab)" title="${i18n("Boxes.MergerGame.NextSpawn.Title")}">${i18n("Boxes.MergerGame.NextSpawn")}</th></tr>`
		//Energy/fooballs
		html += `<tr><td title="${i18n("Boxes.MergerGame.Energy."+mergerGame.event)}">`
		html += `<img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].energy,true)}"></td>`
		html += `<td title="${i18n("Boxes.MergerGame.EfficiencyTargetProgress."+mergerGame.event)+Math.floor(totalValue)+"/"+(Math.floor(mergerGame.state.energyUsed*targetEfficiency)||0)}">${mergerGame.state.energyUsed} </td>`
		html += `<td>${mergerGame.state.energyUsed+mergerGame.state.daily.energyUsed}</td>`
		html += `<td style="border-left: 1px solid var(--border-tab)"></td>`
		html += `<td colspan="2" style="border-left: 1px solid var(--border-tab)">${mergerGame.spawnCost}</td></tr>`
		//Progress
		html += `<tr><td title="${i18n("Boxes.MergerGame.ProgressCollected")}">`
		html += `<img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].progress,true)}"></td>`
		html += `<td>${mergerGame.state.progress} / ${mergerGame.state.maxProgress}</td>`
		html += `<td>${mergerGame.state.progress + mergerGame.state.daily.progress}</td>`
		html += `<td style="border-left: 1px solid var(--border-tab)">${mergerGame.state.progress + mergerGame.solved.progress}</td>`
		html += `<td title="min - max (avg)" style="border-left: 1px solid var(--border-tab); text-align:right">${mergerGame.simResult.progress.min} - ${mergerGame.simResult.progress.max}</td>`
		html += `<td title="min - max (avg)" style="text-align:left">(${mergerGame.simResult.progress.average})</td></tr>`
		//Keys/badges
		html += `<tr><td title="${i18n("Boxes.MergerGame.Keys."+mergerGame.event)}">`
		html += `<img src="${keyimg(mergerGame.colors[2],"full")}">`
		html += `<img style="margin-left: -15px" src="${keyimg(mergerGame.colors[1],"full")}">`
		html += `<img style="margin-left: -15px" src="${keyimg(mergerGame.colors[0],"full")}"></td>`
		html += `<td>${keys} / ${maxKeys}</td>`
		html += `<td>${keys + mergerGame.state.daily.keys}</td>`
		html += `<td style="border-left: 1px solid var(--border-tab)">${mergerGame.state.keys + mergerGame.solved.keys}</td>`
		html += `<td title="min - max (avg)" style="border-left: 1px solid var(--border-tab); text-align:right">${mergerGame.simResult.keys.min} - ${mergerGame.simResult.keys.max}</td>`
		html += `<td title="min - max (avg)" style="text-align:left">(${mergerGame.simResult.keys.average})</td></tr>`
		//Efficiency
		html += `<tr><td title="${i18n("Boxes.MergerGame.Efficiency."+mergerGame.event)}">`
		html += `<img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].progress,true)}">/<img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].energy,true)}"></td>`
		html += `<td style="font-weight:bold; color: ${effcolor(efficiency)}" title="${i18n("Boxes.MergerGame.EfficiencyTotalProgress") + Math.floor(efficiency*mergerGame.settings.availableCurrency)}">${efficiency} </td>`
		html += `<td style="font-weight:bold; color: ${effcolor(dailyEff)}">${dailyEff.toFixed(2)} </td>`
		html += `<td style="border-left: 1px solid var(--border-tab); color: ${effcolor(simEff)}">${simEff}</td>`
		html += `<td title="min - max (avg)" style="border-left: 1px solid var(--border-tab); text-align:right"><span style="color: ${effcolor(simMinEff)}">${simMinEff}</span> - <span style="color: ${effcolor(simMaxEff)}">${simMaxEff}</span></td>`
		html += `<td title="min - max (avg)" style="text-align:left;color: ${effcolor(simAvgEff)}">(${simAvgEff})</td></tr>`
		
		html += `</table>`

		for (let i of mergerGame.colors) {
			html += `<table class="foe-table"><tr><th></th>`
			for (let lev = 4; lev>0; lev--) {
				html += `<th>${mergerGame.state.unlocked[i][lev].none}<img src="${srcLinks.get(`/shared/seasonalevents/${mergerGame.event}/event/${mergerGame.event}${mergerGame.eventData[mergerGame.event].tile}_${i}_${lev}.png`,true)}" title="${mergerGame.spawnChances?.[i]?.[lev]||0}%"></th>`
			}
			for (let o of mergerGame.types) {
				let m = totalPieces[i].min;
				let t = totalPieces[i][o];
				html += `</tr><tr><td ${((t==m && o != "full") || (0==m && o == "full") ) ? 'style="font-weight:bold"' : ''}>${t}${(o == "full") ? '/'+ (t+m) : ''}`;
				html += `<img class="${"care" == mergerGame.event && o!="full" ? 'bottomrightcorner':''}" src="${keyimg(i,o)}"></td>`
				for (let lev = 4; lev>0; lev--) {
					val = table[i][lev][o];
					if (val==0) val = "-";
					html += `<td style="${val != "-" ? 'font-weight:bold;' : ''}${(o=="full" && lev==3 && table[i][lev][o]>1)?' color:red"': ((o=="full" && lev<3 && table[i][lev][o]>1)?' color:orange"': '')}">${val}</td>`
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

	solve:() => {
		let type1 = mergerGame.types[1],
			type2 = mergerGame.types[0];
		
		let solved = {}
		
		for (let c of mergerGame.colors) {
			let locked= {}
			locked[type1]=[]
			locked[type2]=[]
			let free = {full:[], none:[]}
			free[type1]=[]
			free[type2]=[]
			for (let t of mergerGame.types.concat(["none"])) {
				for (let l of [1,2,3,4]) {
					free[t].push(mergerGame.state.unlocked[c][l][t])
					if (t=="full"||t=="none") continue
					locked[t].push(mergerGame.state.table[c][l][t]-mergerGame.state.unlocked[c][l][t]);
					
				}
			}
			solved[c] = mergerGame.solver(locked,free,c,true);
		}

		let progress = 0
		for (let c of mergerGame.colors) {
			progress += solved[c].progress;
		}
		mergerGame.solved.progress = progress;
		//keys
		let keys = 0
		for (let c of mergerGame.colors) {
			keys += solved[c].keys;
		}
		mergerGame.solved.keys = keys;
		mergerGame.simResult = mergerGame.simulateNextSpawn(solved);
	},
	simulateNextSpawn:(solved) => {
		let keys = {min:10,max:0,average:0};
		let progress = {min:100,max:0,average:0};
		let value = {min:100,max:0,average:0};
		for (let c of mergerGame.colors) {
			if (c=="colorless") continue;
			for (let l of [1,2,3,4]) {
					let free = window.structuredClone(solved[c].free)
					free["none"][l-1] += 1
					let simulated = mergerGame.solver(window.structuredClone(solved[c].locked),window.structuredClone(free),c,true)
					let addKeys = simulated.keys - solved[c].keys;
					let addProgress = simulated.progress - solved[c].progress;
					let addValue = simulated.keys*mergerGame.settings.keyValue + simulated.progress - solved[c].progress - solved[c].keys*mergerGame.settings.keyValue;
					if (addKeys<keys.min) keys.min = addKeys;
					if (addKeys>keys.max) keys.max = addKeys;
					keys.average += mergerGame.spawnChances[c][l]/100*addKeys;
					if (addProgress<progress.min) progress.min = addProgress;
					if (addProgress>progress.max) progress.max = addProgress;
					progress.average += mergerGame.spawnChances[c][l]/100*addProgress;
					if (addValue<value.min) value.min = addValue;
					if (addValue>value.max) value.max = addValue;
					value.average += mergerGame.spawnChances[c][l]/100*addValue;
			}
		}
		keys.average = Math.round(keys.average *10)/10;
		progress.average = Math.round(progress.average *10)/10;
		return {keys:keys,progress:progress,value:value}
	}, 

	checkInconsistencies:(solved,c) => {
		let best = window.structuredClone(solved);
		for (let l of [1,2,3,4]) {
			if (solved.free.none[l-1] == 0) continue 
			let free = window.structuredClone(solved.free),
				locked=window.structuredClone(solved.locked);
			free["none"][l-1] -= 1;
			let simulated = mergerGame.solver(locked,free);
			if (simulated.keys*mergerGame.settings.keyValue+simulated.progress>best.keys*mergerGame.settings.keyValue+best.progress) best = window.structuredClone(simulated);
		}
		if (solved.progress>best.progress) {
			best.progress = solved.progress;
		}
		return best
	}, 

	solver: (locked,free,sim=false) =>{
		let result1 = mergerGame.solver1(window.structuredClone(locked),window.structuredClone(free));
		let result2 = mergerGame.solver2(window.structuredClone(locked),window.structuredClone(free));
		let result = null

		if (result1.keys*mergerGame.settings.keyValue+result1.progress>result2.keys*mergerGame.settings.keyValue+result2.progress) 
			result = result1
		else
			result = result2;
		
		if (sim) {
			result = mergerGame.checkInconsistencies(result)
		}
		
		return result;
		
	},
	
	solver1:(locked,free)=>{ //modified version of Moos solver - generally better but also has some oddities
		let lockedO = window.structuredClone(locked),
			freeO = window.structuredClone(free),
			type1 = mergerGame.types[0],
			type2 = mergerGame.types[1],
			total1_ = locked[type1].reduce((a, b) => a + b, 0)+free[type1].reduce((a, b) => a + b, 0),
			total2_ = locked[type2].reduce((a, b) => a + b, 0)+free[type2].reduce((a, b) => a + b, 0),
			total1_2 = total1_ - locked[type1][0],
			total2_2 = total2_ - locked[type2][0],
			startProgress = 0;

		//Progress:
		for (let t of [type1,type2]) {
			for (let l of [1,2,3,4]) {
				startProgress += locked[t][l-1]*mergerGame.levelValues[l]
			}
		}
		
		while (true) {
			if (free.none[0] == 0) break;
			
			if (locked[type2][0] == 0 && locked[type1][0] == 0) {
				if (free.none[0] >= 2) {
					free.none[0] -= 2
					free.none[1] += 1
					continue;
				} else break;
			}
			let pick = null
			if (total2_2 == total1_2) {
				if (locked[type1][0] > locked[type2][0])
					pick = type1
				else
					pick = type2
			} else if (total2_2 > total1_2) {
				if (locked[type1][0] > 0)
					pick = type1
				else
					pick = type2
			} else {
				if (locked[type2][0] > 0)
					pick = type2
				else
					pick = type1
			}        
			if (pick == type1) {
				free.none[0] -= 1
				free[type1][1] += 1
				locked[type1][0] -= 1
				total1_2 += 1
			} else {
				free.none[0] -= 1
				free[type2][1] += 1
				locked[type2][0] -= 1
				total2_2 += 1
			}
		}

		//Level 4 + 3 easy cleanup
		while (true) {
			if (free.none[3] > 0 && locked[type2][3] > 0 && locked[type1][3] > 0) {
				free.none[3] -= 1
				locked[type1][3] -= 1
				locked[type2][3] -= 1
				free.full[3] += 1
			} else if (free[type1][3] > 0 && locked[type2][3]>0) {
				free[type1][3] -= 1
				locked[type2][3] -= 1
				free.full[3] += 1
			} else if (free[type2][3] > 0 && locked[type1][3]>0) {
				free[type2][3] -= 1
				locked[type1][3] -= 1
				free.full[3] += 1
			} else if (free.none[2] >= locked[type2][3] + locked[type1][3] && 
						locked[type2][3] > 0 && locked[type1][2]>0) {
				locked[type2][3] -= 1
				locked[type1][2] -= 1
				free.none[2] -= 1
				free.full[3] += 1
			} else if (free.none[2] >= locked[type2][3] + locked[type1][3] && 
						locked[type1][3] > 0 && locked[type2][2]>0) {
				locked[type2][2] -= 1
				locked[type1][3] -= 1
				free.none[2] -= 1
				free.full[3] += 1
			} else if (free.none[2]> 0 && free.none[2] < locked[type2][3] + locked[type1][3] && 
						locked[type2][2]+locked[type2][1]+locked[type2][0]>=locked[type1][2]+locked[type1][1]+locked[type1][0] &&
						locked[type2][3] > 0 && locked[type1][2]>0) {
				locked[type2][3] -= 1
				locked[type1][2] -= 1
				free.none[2] -= 1
				free.full[3] += 1
			} else if (free.none[2]> 0 && free.none[2] < locked[type2][3] + locked[type1][3] && 
						locked[type2][2]+locked[type2][1]+locked[type2][0]<=locked[type1][2]+locked[type1][1]+locked[type1][0] &&
						locked[type1][3] > 0 && locked[type2][2]>0) {
				locked[type2][2] -= 1
				locked[type1][3] -= 1
				free.none[2] -= 1
				free.full[3] += 1
			} else break
		}

		let total1_3 = locked[type1][2] + locked[type1][3] + free[type1][2] + free[type1][3];
		let total2_3 = locked[type2][2] + locked[type2][3] + free[type2][2] + free[type2][3];
		let occupied1_3=0;
		let occupied2_3=0;
		while (true) {
			
			if (free.none[1] > free[type2][1] && locked[type1][1] > 0 && (locked[type2][2]+free[type2][2]-occupied2_3) > 0 && (total1_3<=total2_3 || locked[type2][1] == 0 )) {
				free.none[1] -= 1;
				locked[type1][1] -= 1;
				free[type1][2] += 1;
				total1_3 +=1;
				occupied1_3 += 1;
				occupied2_3 += 1;
			} else if (free.none[1] > free[type1][1] &&  locked[type2][1] > 0 && (locked[type1][2]+free[type1][2]-occupied1_3) > 0) {
				free.none[1] -= 1
				locked[type2][1] -= 1
				free[type2][2] += 1
				total2_3 +=1;
				occupied1_3 += 1;
				occupied2_3 += 1;
			} else if (free.none[1] > 1 && free.none[1] > free[type1][1]+free[type2][1] && (locked[type1][1]> 0) && (locked[type2][1]> 0) && (locked[type1][2] + free[type1][2] -occupied1_3> 0) && (locked[type2][2] + free[type2][2] -occupied2_3> 0)) {
				free.none[1] -= 1
				locked[type1][1] -= 1
				free[type1][2] += 1
				total1_3 +=1;
				free.none[1] -= 1
				locked[type2][1] -= 1
				free[type2][2] += 1
				total2_3 +=1;
				occupied1_3 += 2;
				occupied2_3 += 2;
			} else if (free[type1][1]> 0 && locked[type2][1]> 0 && (locked[type1][2] + free[type1][2] + locked[type2][2] + free[type2][2] - occupied1_3 - occupied2_3 - free.none[2] > 0)) {
				free[type1][1] -= 1
				locked[type2][1] -= 1
				free.full[2] += 1
				if (locked[type1][2]+free[type1][2]-occupied1_3>free[type2][2]+locked[type2][2]-occupied2_3) 
					occupied1_3 += 1 
				else 
					occupied2_3 += 1;
			} else if (free[type2][1]> 0 && locked[type1][1]> 0 && (locked[type1][2] + free[type1][2] + locked[type2][2] + free[type2][2] - occupied1_3 - occupied2_3 - free.none[2] > 0)) {
				free[type2][1] -= 1
				locked[type1][1] -= 1
				free.full[2] += 1
				if (locked[type1][2]+free[type1][2]-occupied1_3>free[type2][2]+locked[type2][2]-occupied2_3) 
					occupied1_3 += 1 
				else 
					occupied2_3 += 1;
			} else if (free.none[1] > 1 && free.none[1] > free[type1][1]+free[type2][1] && (locked[type1][1] + free[type1][1] > 0) && (locked[type2][1] + free[type2][1] > 0) && (locked[type1][2] + free[type1][2] -occupied1_3> 0) && (locked[type2][2] + free[type2][2] -occupied2_3> 0)) {
				if (locked[type1][1] > 0) {
					free.none[1] -= 1
					locked[type1][1] -= 1
					free[type1][2] += 1
				} else {
					free.none[1] -= 1
					free[type1][1] -= 1
					free[type1][2] += 1
				}
				if (locked[type2][1] > 0) {
					free.none[1] -= 1
					locked[type2][1] -= 1
					free[type2][2] += 1
				} else {
					free.none[1] -= 1
					free[type2][1] -= 1
					free[type2][2] += 1
				}
				occupied1_3 += 2;
				occupied2_3 += 2;
			} else if (free[type1][1] > 0 && locked[type2][1] > 0) {
				free[type1][1] -= 1
				free.full[2] += 1
				locked[type2][1] -= 1
			} else if (free[type2][1] > 0 && locked[type1][1] > 0) {
				free[type2][1] -= 1
				free.full[2] += 1
				locked[type1][1] -= 1
			} else if (free[type2][1] > 0 && free[type1][1] > 0) {
				free[type2][1] -= 1
				free[type1][1] -= 1
				free.full[2] += 1
			} else if (free.none[1] > 0 && (locked[type1][1] + locked[type2][1]) > 0) {
				let pick = null
				if (total2_3 == total1_3) {
					if (total2_ > total1_) {
						if (locked[type1][1] > 0)
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][1] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if (total2_3 > total1_3) {
					if (locked[type1][1] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][1] > 0)
						pick = type2
					else
						pick = type1
				}
				if (pick == type1) {
					free.none[1] -= 1
					free[type1][2] += 1
					locked[type1][1] -= 1
					total1_3 += 1
				} else {
					free.none[1] -= 1
					free[type2][2] += 1
					locked[type2][1] -= 1
					total2_3 += 1
				}
			} else if (free[type1][1] > 0 && locked[type1][1] > 0) {
				free[type1][1] -= 1
				locked[type1][1] -= 1
				free[type1][2] += 1
			} else if (free[type2][1] > 0 && locked[type2][1] > 0) {
				free[type2][1] -= 1
				locked[type2][1] -= 1
				free[type2][2] += 1
			} else if (free[type2][1] > 0 && free.none[1] > 0) {
				free[type2][1] -= 1
				free.none[1] -= 1
				free[type2][2] += 1
			} else if (free[type1][1] > 0 && free.none[1] > 0) {
				free[type1][1] -= 1
				free.none[1] -= 1
				free[type1][2] += 1
			} else if (free.none[1] >= 2) {
				free.none[1] -= 2
				free.none[2] += 1
			} else if (free[type1][1] >= 2) {
				free[type1][1] -= 2
				free[type1][2] += 1
			} else if (free[type2][1] >= 2) {
				free[type2][1] -= 2
				free[type2][2] += 1
			} else break
		}      
		let total1_4 = locked[type1][3] + free[type1][3];
		let total2_4 = locked[type2][3] + free[type2][3];
		let occupied1_4=0;
		let occupied2_4=0;
		while (true) {
			
			if (free.none[2] >= locked[type1][2]+locked[type2][2]+free[type1][2]+free[type2][2] + free["full"][2] && locked[type1][2]+locked[type2][2]+free[type1][2]+free[type2][2]+ free["full"][2] > 0) {
				free[type1][3] += locked[type1][2];
				free[type1][3] += free[type1][2];
				free[type2][3] += locked[type2][2];
				free[type2][3] += free[type2][2];
				free["full"][3] += free["full"][2];
				
				free.none[2] -= locked[type1][2]+locked[type2][2]+free[type1][2]+free[type2][2]+free["full"][2];
				locked[type1][2] = 0;
				free[type1][2] = 0;
				locked[type2][2] = 0;
				free[type2][2] = 0;
				free["full"][2] = 0;
				
			} else if (free.none[2] > 0 && locked[type1][2] > 0 && (locked[type2][3]+free[type2][3]-occupied2_4) > 0 && (total1_4<=total2_4 || locked[type2][2]==0)) {
				free.none[2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
				total1_4 +=1;
				occupied1_4 +=1;
				occupied2_4 +=1;
			} else if (free.none[2] > 0 &&  locked[type2][2] > 0 && (locked[type1][3]+free[type1][3]-occupied1_4) > 0) {
				free.none[2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
				total2_4 +=1;
				occupied1_4 +=1;
				occupied2_4 +=1;
			} else if (free.none[2] > 1 && (locked[type1][2] + free[type1][2] > 0) && (locked[type2][2] + free[type2][2] > 0) && (locked[type1][3] + free[type1][3] - occupied1_4 > 0) && (locked[type2][3] + free[type2][3] - occupied2_4 > 0)) {
				//console.log("L3 double used")
				if (locked[type1][2] > 0) {
					free.none[2] -= 1
					locked[type1][2] -= 1
					free[type1][3] += 1
				} else {
					free.none[2] -= 1
					free[type1][2] -= 1
					free[type1][3] += 1
				}
				if (locked[type2][2] > 0) {
					free.none[2] -= 1
					locked[type2][2] -= 1
					free[type2][3] += 1
				} else {
					free.none[2] -= 1
					free[type2][2] -= 1
					free[type2][3] += 1
				}
				occupied1_4 += 2;
				occupied2_4 += 2;
				
			} else if (free[type1][2] > 0 && locked[type2][2] > 0) {
				free[type1][2] -= 1
				locked[type2][2] -= 1
				free.full[3] += 1
			} else if ( free[type2][2] > 0 && locked[type1][2] > 0) {
				free[type2][2] -= 1
				locked[type1][2] -= 1
				free.full[3] += 1
			} else if ( free[type2][2] > 0 && free[type1][2] > 0) {
				free[type2][2] -= 1
				free[type1][2] -= 1
				free.full[3] += 1
			} else if ( free.none[2] > 0 && locked[type1][2] > 0 && (locked[type2][3] + free[type2][3] - occupied2_4) > 0) {
				free.none[2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
				occupied1_4 +=1
				occupied2_4 += 1
				
			} else if ( free.none[2] > 0 && locked[type2][2] > 0 && (locked[type1][3] + free[type1][3] - occupied1_4) > 0) {
				free.none[2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
				occupied1_4 +=1
				occupied2_4 += 1
				
			} else if (free.none[2] > 0 && free[type1][2] > 0 && (locked[type2][3] + free[type2][3] - occupied2_4) > 0) {
				free.none[2] -= 1
				free[type1][2] -= 1
				free[type1][3] += 1
				occupied1_4 +=1
				occupied2_4 += 1
				
			} else if (free.none[2] > 0 &&  free[type2][2] > 0 && (locked[type1][3] + free[type1][3] - occupied1_4) > 0) {
				free.none[2] -= 1
				free[type2][2] -= 1
				free[type2][3] += 1
				occupied1_4 += 1
				occupied2_4 += 1

			} else if (free[type1][2] >0 && locked[type1][2]>0 && (locked[type2][3] + free[type2][3] - occupied2_4) > 0) {
				free[type1][2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
				occupied1_4 += 1
				occupied2_4 += 1
			
			} else if (free[type2][2] >0 && locked[type2][2]>0 && (locked[type1][3] + free[type1][3] - occupied1_4)>0) {
				free[type2][2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
				occupied1_4 += 1
				occupied2_4 += 1
			
			} else if ((free.none[2]+locked[type1][2]+locked[type2][2] - free.full[2] > 1) && free.none[2]>1 && locked[type2][2]>0 && locked[type1][2]>0) {
				free.none[2] -= 2
				locked[type2][2] -= 1
				locked[type1][2] -= 1
				free[type2][3] += 1
				free[type1][3] += 1
				occupied1_4 += 1
				occupied2_4 += 1
			
			} else if (free.full[2] > 0 && ((free.none[2] + free[type2][2] + free[type1][2] + locked[type2][2] + locked[type1][2]) > 0 || free.full[2] >= 2)) {
				if (locked[type2][2] > 0) {
					free.full[2] -= 1
					locked[type2][2] -= 1
					free.full[3] += 1
				} else if ( locked[type1][2] > 0) {
					free.full[2] -= 1
					locked[type1][2] -= 1
					free.full[3] += 1
				} else if ( free.none[2] > 0) {
					free.full[2] -= 1
					free.none[2] -= 1
					free.full[3] += 1
				} else if ( free[type1][2] > 0) {
					free.full[2] -= 1
					free[type1][2] -= 1
					free.full[3] += 1
				} else if ( free[type2][2] > 0) {
					free.full[2] -= 1
					free[type2][2] -= 1
					free.full[3] += 1
				} else {
					free.full[2] -= 2
					free.full[3] += 1
				}
			} else if ( free.none[2] > 0 && (locked[type1][2] + locked[type2][2]) > 0) {
				pick = null
				if (total2_4 == total1_4) {
					if (total2_ > total1_) {
						if (locked[type1][2] > 0)
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][2] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if ( total2_4 > total1_4) {
					if (locked[type1][2] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][2] > 0)
						pick = type2
					else
						pick = type1
				}
				if (pick == type1) {
					free.none[2] -= 1
					free[type1][3] += 1
					locked[type1][2] -= 1
					total1_4 += 1
				} else {
					free.none[2] -= 1
					free[type2][3] += 1
					locked[type2][2] -= 1
					total2_4 += 1
				}
			} else if ( free[type1][2] > 0 && locked[type1][2] > 0) {
				free[type1][2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
			} else if ( free[type2][2] > 0 && locked[type2][2] > 0) {
				free[type2][2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
			} else if ( free[type2][2] > 0 && free.none[2] > 0) {
				free[type2][2] -= 1
				free.none[2] -= 1
				free[type2][3] += 1
			} else if ( free[type1][2] > 0 && free.none[2] > 0) {
				free[type1][2] -= 1
				free.none[2] -= 1
				free[type1][3] += 1
			} else if ( free.none[2] >= 2) {
				free.none[2] -= 2
				free.none[3] += 1
			} else if ( free[type1][2] >= 2) {
				free[type1][2] -= 2
				free[type1][3] += 1
			} else if ( free[type2][2] >= 2) {
				free[type2][2] -= 2
				free[type2][3] += 1
			} else break
		}            
		total2_4 = locked[type2][3]
		total1_4 = locked[type1][3]
		while (true) {
			if (free[type1][3] > 0 && locked[type2][3] > 0) {
				free[type1][3] -= 1
				free.full[3] += 1
				locked[type2][3] -= 1
			} else if ( free[type2][3] > 0 && locked[type1][3] > 0) {
				free[type2][3] -= 1
				free.full[3] += 1
				locked[type1][3] -= 1
			} else if ( free[type2][3] > 0 && free[type1][3] > 0) {
				free[type2][3] -= 1
				free[type1][3] -= 1
				free.full[3] += 1
			} else if ( free.none[3] > 0 && (locked[type1][3] + locked[type2][3]) > 0) {
				pick = null
				if (total2_4 == total1_4) {
					if (total2_ > total1_) {
						if (locked[type1][3] > 0) 
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][3] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if ( total2_4 > total1_4) {
					if (locked[type1][3] > 0) 
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][3] > 0)
						pick = type2
					else
						pick = type1
				}   
				if (pick == type1) {
					free.none[3] -= 1
					free[type1][3] += 1
					locked[type1][3] -= 1
					total1_4 -= 1
				} else {
					free.none[3] -= 1
					free[type2][3] += 1
					locked[type2][3] -= 1
					total2_4 -= 1
				}
			} else if (free.full[3] > 0 && (locked[type2][3] + locked[type1][3]) > 0) {
				if (locked[type2][3] > 0) {
					free.full[3] -= 1
					locked[type2][3] -= 1
					free.full[3] += 1
				} else if (locked[type1][3] > 0) {
					free.full[3] -= 1
					locked[type1][3] -= 1
					free.full[3] += 1
				}
			} else break
		}
		let endProgress = 0;
		//Progress:
		for (let t of [type1,type2]) {
			for (let l of [1,2,3,4]) {
				endProgress += locked[t][l-1]*mergerGame.levelValues[l]
			}
		}
		//Progress:
		let keys = 0
		for (let l of [3,4]) {
			keys += free["full"][l-1]*mergerGame.keyValues[l]
		}
			
		return {keys:keys, progress:startProgress-endProgress,locked:lockedO, free:freeO}
	},
	solver2:(locked,free)=>{ //Moo Original
		let lockedO = window.structuredClone(locked),
			freeO = window.structuredClone(free),
			type1 = mergerGame.types[0],
			type2 = mergerGame.types[1],
			total1_ = locked[type1].reduce((a, b) => a + b, 0)+free[type1].reduce((a, b) => a + b, 0),
			total2_ = locked[type2].reduce((a, b) => a + b, 0)+free[type2].reduce((a, b) => a + b, 0),
			total1_2 = total1_ - locked[type1][0],
			total2_2 = total2_ - locked[type2][0],
			startProgress = 0;
		//Progress:
		for (let t of [type1,type2]) {
			for (let l of [1,2,3,4]) {
				startProgress += locked[t][l-1]*mergerGame.levelValues[l]
			}
		}
		
		while (true) {
			if (free.none[0] == 0) break;
			
			if (locked[type2][0] == 0 && locked[type1][0] == 0) {
				if (free.none[0] >= 2) {
					free.none[0] -= 2
					free.none[1] += 1
					continue;
				} else break;
			}
			let pick = null
			if (total2_2 == total1_2) {
				if (total2_ > total1_) {
					if (locked[type1][0] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][0] > 0)
						pick = type2
					else
						pick = type1
				}
			} else if (total2_2 > total1_2) {
				if (locked[type1][0] > 0)
					pick = type1
				else
					pick = type2
			} else {
				if (locked[type2][0] > 0)
					pick = type2
				else
					pick = type1
			}        
			if (pick == type1) {
				free.none[0] -= 1
				free[type1][1] += 1
				locked[type1][0] -= 1
				total1_2 += 1
			} else {
				free.none[0] -= 1
				free[type2][1] += 1
				locked[type2][0] -= 1
				total2_2 += 1
			}
		}
		let total2_3 = locked[type2][2] + locked[type2][3];
		let total1_3 = locked[type1][2] + locked[type1][3];
		while (true) {
			
			
			if (free.none[1] > 1 && (locked[type1][1] + free[type1][1] > 0) && (locked[type2][1] + free[type2][1] > 0) && (locked[type1][2] + free[type1][2] > 0) && (locked[type2][2] + free[type2][2] > 0)) {
				if (locked[type1][1] > 0) {
					free.none[1] -= 1
					locked[type1][1] -= 1
					free[type1][2] += 1
				} else {
					free.none[1] -= 1
					free[type1][1] -= 1
					free[type1][2] += 1
				}
				if (locked[type2][1] > 0) {
					free.none[1] -= 1
					locked[type2][1] -= 1
					free[type2][2] += 1
				} else {
					free.none[1] -= 1
					free[type2][1] -= 1
					free[type2][2] += 1
				}
			} else if (free[type1][1] > 0 && locked[type2][1] > 0) {
				free[type1][1] -= 1
				free.full[2] += 1
				locked[type2][1] -= 1
			} else if (free[type2][1] > 0 && locked[type1][1] > 0) {
				free[type2][1] -= 1
				free.full[2] += 1
				locked[type1][1] -= 1
			} else if (free[type2][1] > 0 && free[type1][1] > 0) {
				free[type2][1] -= 1
				free[type1][1] -= 1
				free.full[2] += 1
			} else if (free.none[1] > 0 && (locked[type1][1] + locked[type2][1]) > 0) {
				let pick = null
				if (total2_3 == total1_3) {
					if (total2_ > total1_) {
						if (locked[type1][1] > 0)
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][1] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if (total2_3 > total1_3) {
					if (locked[type1][1] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][1] > 0)
						pick = type2
					else
						pick = type1
				}
				if (pick == type1) {
					free.none[1] -= 1
					free[type1][2] += 1
					locked[type1][1] -= 1
					total1_3 += 1
				} else {
					free.none[1] -= 1
					free[type2][2] += 1
					locked[type2][1] -= 1
					total2_3 += 1
				}
			} else if (free[type1][1] > 0 && locked[type1][1] > 0) {
				free[type1][1] -= 1
				locked[type1][1] -= 1
				free[type1][2] += 1
			} else if (free[type2][1] > 0 && locked[type2][1] > 0) {
				free[type2][1] -= 1
				locked[type2][1] -= 1
				free[type2][2] += 1
			} else if (free[type2][1] > 0 && free.none[1] > 0) {
				free[type2][1] -= 1
				free.none[1] -= 1
				free[type2][2] += 1
			} else if (free[type1][1] > 0 && free.none[1] > 0) {
				free[type1][1] -= 1
				free.none[1] -= 1
				free[type1][2] += 1
			} else if (free.none[1] >= 2) {
				free.none[1] -= 2
				free.none[2] += 1
			} else if (free[type1][1] >= 2) {
				free[type1][1] -= 2
				free[type1][2] += 1
			} else if (free[type2][1] >= 2) {
				free[type2][1] -= 2
				free[type2][2] += 1
			} else break
		}      
		let total2_4 = locked[type2][3]
		let total1_4 = locked[type1][3]
		while (true) {
			
			let numtopTrios = Math.min(free.none[3],locked[type1][3],locked[type2][3])
			if (free.none[2] > 1 && (locked[type1][2] + free[type1][2] > 0) && (locked[type2][2] + free[type2][2] > 0) && (locked[type1][3] - numtopTrios + free[type1][3] > 0) && (locked[type2][3] - numtopTrios + free[type2][3] > 0)) {
				if (locked[type1][2] > 0) {
					free.none[2] -= 1
					locked[type1][2] -= 1
					free[type1][3] += 1
				} else {
					free.none[2] -= 1
					free[type1][2] -= 1
					free[type1][3] += 1
				}
				if (locked[type2][2] > 0) {
					free.none[2] -= 1
					locked[type2][2] -= 1
					free[type2][3] += 1
				} else {
					free.none[2] -= 1
					free[type2][2] -= 1
					free[type2][3] += 1
				}
			} else if (free[type1][2] > 0 && locked[type2][2] > 0) {
				free[type1][2] -= 1
				free.full[3] += 1
				locked[type2][2] -= 1
			} else if ( free[type2][2] > 0 && locked[type1][2] > 0) {
				free[type2][2] -= 1
				free.full[3] += 1
				locked[type1][2] -= 1
			} else if ( free[type2][2] > 0 && free[type1][2] > 0) {
				free[type2][2] -= 1
				free[type1][2] -= 1
				free.full[3] += 1
			} else if ( free.none[2] > 0 && locked[type1][2] > 0 && (locked[type2][3] - numtopTrios) > free[type1][3]) {
				free.none[2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
			} else if ( free.none[2] > 0 && locked[type2][2] > 0 && (locked[type1][3] - numtopTrios) > free[type2][3]) {
				free.none[2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
			} else if ( free.full[2] > 0 && ((free.none[2] + free[type2][2] + free[type1][2] + locked[type2][2] + locked[type1][2]) > 0 || free.full[2] >= 2)) {
				if (locked[type2][2] > 0) {
					free.full[2] -= 1
					locked[type2][2] -= 1
					free.full[3] += 1
				} else if ( locked[type1][2] > 0) {
					free.full[2] -= 1
					locked[type1][2] -= 1
					free.full[3] += 1
				} else if ( free.none[2] > 0) {
					free.full[2] -= 1
					free.none[2] -= 1
					free.full[3] += 1
				} else if ( free[type1][2] > 0) {
					free.full[2] -= 1
					free[type1][2] -= 1
					free.full[3] += 1
				} else if ( free[type2][2] > 0) {
					free.full[2] -= 1
					free[type2][2] -= 1
					free.full[3] += 1
				} else {
					free.full[2] -= 2
					free.full[3] += 1
				}
			} else if ( free.none[2] > 0 && (locked[type1][2] + locked[type2][2]) > 0) {
				pick = null
				if (total2_4 == total1_4) {
					if (total2_ > total1_) {
						if (locked[type1][2] > 0)
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][2] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if ( total2_4 > total1_4) {
					if (locked[type1][2] > 0)
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][2] > 0)
						pick = type2
					else
						pick = type1
				}
				if (pick == type1) {
					free.none[2] -= 1
					free[type1][3] += 1
					locked[type1][2] -= 1
					total1_4 += 1
				} else {
					free.none[2] -= 1
					free[type2][3] += 1
					locked[type2][2] -= 1
					total2_4 += 1
				}
			} else if ( free[type1][2] > 0 && locked[type1][2] > 0) {
				free[type1][2] -= 1
				locked[type1][2] -= 1
				free[type1][3] += 1
			} else if ( free[type2][2] > 0 && locked[type2][2] > 0) {
				free[type2][2] -= 1
				locked[type2][2] -= 1
				free[type2][3] += 1
			} else if ( free[type2][2] > 0 && free.none[2] > 0) {
				free[type2][2] -= 1
				free.none[2] -= 1
				free[type2][3] += 1
			} else if ( free[type1][2] > 0 && free.none[2] > 0) {
				free[type1][2] -= 1
				free.none[2] -= 1
				free[type1][3] += 1
			} else if ( free.none[2] >= 2) {
				free.none[2] -= 2
				free.none[3] += 1
			} else if ( free[type1][2] >= 2) {
				free[type1][2] -= 2
				free[type1][3] += 1
			} else if ( free[type2][2] >= 2) {
				free[type2][2] -= 2
				free[type2][3] += 1
			} else break
		}            
		total2_4 = locked[type2][3]
		total1_4 = locked[type1][3]
		while (true) {
			if (free[type1][3] > 0 && locked[type2][3] > 0) {
				free[type1][3] -= 1
				free.full[3] += 1
				locked[type2][3] -= 1
			} else if ( free[type2][3] > 0 && locked[type1][3] > 0) {
				free[type2][3] -= 1
				free.full[3] += 1
				locked[type1][3] -= 1
			} else if ( free[type2][3] > 0 && free[type1][3] > 0) {
				free[type2][3] -= 1
				free[type1][3] -= 1
				free.full[3] += 1
			} else if ( free.none[3] > 0 && (locked[type1][3] + locked[type2][3]) > 0) {
				pick = null
				if (total2_4 == total1_4) {
					if (total2_ > total1_) {
						if (locked[type1][3] > 0) 
							pick = type1
						else
							pick = type2
					} else {
						if (locked[type2][3] > 0)
							pick = type2
						else
							pick = type1
					}
				} else if ( total2_4 > total1_4) {
					if (locked[type1][3] > 0) 
						pick = type1
					else
						pick = type2
				} else {
					if (locked[type2][3] > 0)
						pick = type2
					else
						pick = type1
				}   
				if (pick == type1) {
					free.none[3] -= 1
					free[type1][3] += 1
					locked[type1][3] -= 1
					total1_4 -= 1
				} else {
					free.none[3] -= 1
					free[type2][3] += 1
					locked[type2][3] -= 1
					total2_4 -= 1
				}
			} else if (free.full[3] > 0 && (locked[type2][3] + locked[type1][3]) > 0) {
				if (locked[type2][3] > 0) {
					free.full[3] -= 1
					locked[type2][3] -= 1
					free.full[3] += 1
				} else if (locked[type1][3] > 0) {
					free.full[3] -= 1
					locked[type1][3] -= 1
					free.full[3] += 1
				}
			} else break
		}
		
		let endProgress = 0;
		//Progress:
		for (let t of [type1,type2]) {
			for (let l of [1,2,3,4]) {
				endProgress += locked[t][l-1]*mergerGame.levelValues[l]
			}
		}
		//Progress:
		let keys = 0
		for (let l of [3,4]) {
			keys += free["full"][l-1]*mergerGame.keyValues[l]
		}
			
		return {keys:keys, progress:startProgress-endProgress,locked:lockedO, free:freeO}
	},
}