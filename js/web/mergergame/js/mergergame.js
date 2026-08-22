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

/**
 * Full board sync: a complete board arrives when the merge game is opened
 * ("getOverview") or the board is reset ("resetBoard"); rebuilds the whole
 * tracked state from it.
 */
FoEproxy.addHandler('MergerGameService', 'all', (data, postData) => {
	if (data.requestMethod != "getOverview" && data.requestMethod != "resetBoard") return;
	// Do not show the window if deactivated in the settings
	if (!Settings.GetSetting('ShowEventChest') || !(Settings.GetSetting('EventHelperMerge') === undefined ? true : Settings.GetSetting('EventHelperMerge'))) {
		return;
	}

	const board = data.responseData.board || data.responseData;
	if (!mergerGame.state.day) mergerGame.state.day = moment.unix(GameTime.get()).dayOfYear();

	if (data.requestMethod == "resetBoard") {
		if (mergerGame.state.day == moment.unix(GameTime.get()).dayOfYear()) { // same day as before
			mergerGame.state.daily.progress += mergerGame.state.progress;
			mergerGame.state.daily.energyUsed += mergerGame.state.energyUsed;
			mergerGame.state.daily.keys += mergerGame.state.keys;
		} else {
			mergerGame.state.daily = {progress: 0, keys: 0, energyUsed: 0};
		}
		mergerGame.state.day = moment.unix(GameTime.get()).dayOfYear();
	}

	mergerGame.event = board.context.replace("_event", "");
	mergerGame.cells = board.cells;
	mergerGame.levelValues = board?.lookup?.pieceConfig[0]?.grandPrizeProgress || {1: 1, 2: 2, 3: 3, 4: 4};
	if (board?.lookup?.keyConversion) {
		mergerGame.keyValues = {};
		for (const conversion of board.lookup.keyConversion) {
			mergerGame.keyValues[conversion.level] = conversion.amount;
		}
	}
	mergerGame.lookup = board?.lookup;
	mergerGame.spawnCost = board?.cells[1]?.spawnCost?.resources[mergerGame.eventData[mergerGame.event].currency] || 10;
	mergerGame.state.maxProgress = 0;
	mergerGame.state.energyUsed = 0;
	mergerGame.state.progress = 0;
	mergerGame.state.keys = 0;
	mergerGame.colors = mergerGame.eventData[mergerGame.event].colors;
	mergerGame.types = mergerGame.eventData[mergerGame.event].types;
	for (const cell of mergerGame.cells) {
		if (cell.isFixed) mergerGame.state.maxProgress += mergerGame.levelValues[cell.level];
	}
	for (const chance of mergerGame.cells[0].spawnChances) {
		if (!chance) continue;
		if (!mergerGame.spawnChances[chance.type.value]) mergerGame.spawnChances[chance.type.value] = {};
		mergerGame.spawnChances[chance.type.value][chance.level] = chance.spawnChance;
	}
	mergerGame.updateTable();

	if (data.requestMethod == "getOverview") {
		//mergerGame.checkSave();
		mergerGame.ShowDialog();
	} else { // resetBoard
		mergerGame.state.energyUsed += (mergerGame.settings.useAverage && mergerGame.settings.useAverage > 0) ? mergerGame.settings.useAverage : mergerGame.resetCost;
		//mergerGame.saveState();
		mergerGame.updateDialog();
	}
	if (mergerGame.state.progress == mergerGame.state.maxProgress) {
		mergerGame.resetCost = 0;
	} else {
		mergerGame.resetCost = board.resetCost?.resources[mergerGame.eventData[mergerGame.event].currency] || 0;
	}
});


/**
 * A new piece was spawned: add it and count the spent energy.
 */
FoEproxy.addHandler('MergerGameService', 'spawnPieces', (data, postData) => {
	// Don't handle when the module is not open
	if ($('#mergerGameDialog').length === 0) return;

	mergerGame.cells.push(data.responseData[0]);
	mergerGame.state.energyUsed += mergerGame.spawnCost;
	mergerGame.updateTable();
	//mergerGame.saveState();
	mergerGame.updateDialog();
});


/**
 * A booster (e.g. an essence) was used: take over every piece the game
 * reports as updated.
 */
FoEproxy.addHandler('MergerGameService', 'useBooster', (data, postData) => {
	// Don't handle when the module is not open
	if ($('#mergerGameDialog').length === 0) return;

	for (const tile of data.responseData.updatedPieces) {
		const target = mergerGame.cells.findIndex((e) => e.id == tile.id);
		if (target > 0) {
			mergerGame.cells[target] = tile;
		} else {
			mergerGame.cells.push(tile);
		}
	}

	mergerGame.updateTable();
	//mergerGame.saveState();
	mergerGame.updateDialog();
});


/**
 * Two pieces were merged: the merge result replaces the target piece, the
 * consumed piece is removed and unlocking a locked piece credits its progress.
 */
FoEproxy.addHandler('MergerGameService', 'mergePieces', (data, postData) => {
	// Don't handle when the module is not open
	if ($('#mergerGameDialog').length === 0) return;

	const t_id = data.responseData.id;
	let o_id = postData[0].requestData[1];
	if (o_id == t_id) o_id = postData[0].requestData[2];

	const target = mergerGame.cells.findIndex((e) => e.id == t_id);
	const origin = mergerGame.cells.findIndex((e) => e.id == o_id);

	if (mergerGame.cells[target].isFixed) mergerGame.state.progress += mergerGame.levelValues[mergerGame.cells[target].level];
	if (mergerGame.state.progress == mergerGame.state.maxProgress) mergerGame.resetCost = 0;

	mergerGame.cells[target] = data.responseData;
	mergerGame.cells.splice(origin, 1);

	mergerGame.updateTable();
	//mergerGame.saveState();
	mergerGame.updateDialog();
});


/**
 * A piece with a full key was turned in: credit the keys and remove the piece.
 */
FoEproxy.addHandler('MergerGameService', 'convertPiece', (data, postData) => {
	// Don't handle when the module is not open
	if ($('#mergerGameDialog').length === 0) return;

	const target = mergerGame.cells.findIndex((e) => e.id == postData[0].requestData[1]);

	mergerGame.state.keys += mergerGame.keyValues[mergerGame.cells[target].level];
	mergerGame.cells.splice(target, 1);

	mergerGame.updateTable();
	//mergerGame.saveState();
	mergerGame.updateDialog();
});


/**
 * Tracks the timed event tasks to warn as soon as a completed task is ready
 * to be collected.
 */
FoEproxy.addHandler('TimedTasksService', 'all', (data, postData) => {
	if (!["anniversary_event", "care_event"].includes(postData[0].requestData[0])) return;
	if (['getOverview', 'claimReward'].includes(data.requestMethod)) {
		data.responseData.slots.forEach(slot => {
			mergerGame.tasks[slot.type] = {
				currentProgress: slot.task.currentProgress || 0,
				requiredProgress: slot.task.requiredProgress,
				rewardResource: slot.task.reward.subType,
				rewardAmount: (slot.task.reward.amount || 1) * (slot.rewardMultiplier || 1),
				worldChallengeTokens: ({easy: 1, medium: 1, hard: 1})[slot.type],
				alerted: (data.requestMethod != "getOverview") && ((slot.task.currentProgress || 0) >= slot.task.requiredProgress)
			};
		});
	} else if (data.requestMethod == "pushTaskProgress") {
		mergerGame.tasks[data.responseData.slotType].currentProgress = data.responseData.currentProgress;
	} else return;
	mergerGame.checkTaskProgress();
});


/**
 * Helper for the merge mini game of the anniversary, soccer and care events:
 * tracks the board and shows per color how pieces, key parts and the still
 * locked progress are distributed. Warns before keys are lost on a reset and
 * when a completed event task waits to be collected.
 * @namespace
 */
let mergerGame = {

	/** @type {boolean} guard so a freshly shown task warning is not removed immediately */
	allowRemoveWarning: true,

	/** @type {Object<string,object>} timed event tasks by slot type ("easy", "medium", "hard") */
	tasks: {},

	/** @type {boolean} true while a joker (colorless) piece is on the board */
	hasJoker: false,

	/** @type {string} active event ("anniversary", "soccer" or "care") */
	event: "anniversary",

	/** @type {string[]} piece colors of the active event */
	colors: ["white", "yellow", "blue", "colorless"],

	/** @type {string[]} key part types of the active event (two halves + "full") */
	types: ["top", "bottom", "full"],

	/** @type {number} energy cost of the next spawn */
	spawnCost: 5,

	/** @type {object[]} all pieces currently on the board (raw game data) */
	cells: [],

	/** @type {Object<string,Object<number,number>>} spawn chance in % by color and level */
	spawnChances: {white: {1: 14, 2: 8, 3: 5, 4: 3}, blue: {1: 14, 2: 8, 3: 5, 4: 3}, yellow: {1: 19, 2: 10, 3: 7, 4: 4}, defender: {1: 14, 2: 8, 3: 5, 4: 3}, attacker: {1: 14, 2: 8, 3: 5, 4: 3}, midfielder: {1: 19, 2: 10, 3: 7, 4: 4}},

	/** @type {object} tracked totals of the current round and day plus the per color tables */
	state: {
		daily: {progress: 0, keys: 0, energyUsed: 0},
		maxProgress: 0,
		energyUsed: 0,
		progress: 0,
		keys: 0
	},

	/** @type {number} currency cost of a board reset (0 when everything is unlocked) */
	resetCost: 0,

	/** @type {Object<number,number>} grand prize progress gained per level when unlocking a locked piece */
	levelValues: {1: 1, 2: 1, 3: 1, 4: 2},

	/** @type {Object<number,number>} keys gained per level when turning in a full key piece */
	keyValues: {1: 1, 2: 1, 3: 1, 4: 3},

	/** @type {object} box settings, persisted in localStorage */
	settings: Object.assign({
		keyValue: 1.3,
		targetProgress: 3750,
		availableCurrency: 11000,
		hideOverlay: true,
		useAverage: 0,
		audibleTaskWarning: true,
		opticalTaskWarning: false
	}, JSON.parse(localStorage.getItem("MergerGameSettings") || '{}')),

	/** @type {object} static per event data: icons, colors, key part types and currency */
	eventData: {
		anniversary: {
			progress: "/shared/seasonalevents/league/league_anniversary_icon_progress.png",
			energy: "/shared/seasonalevents/anniversary/event/anniversary_energy.png",
			colors: ["white", "yellow", "blue", "colorless"],
			types: ["top", "bottom", "full"],
			tile: "_gem",
			currency: `anniversary_energy`,
		},
		soccer: {
			progress: "/shared/icons/reward_icons/reward_icon_soccer_trophy.png",
			energy: "/shared/seasonalevents/soccer/event/soccer_football.png",
			colors: ["attacker", "midfielder", "defender"],
			types: ["left", "right", "full"],
			tile: "_player",
			currency: `soccer_football`,
		},
		care: {
			progress: "/shared/icons/reward_icons/reward_icon_care_globe.png",
			energy: "/shared/icons/reward_icons/reward_icon_care_worker.png",
			colors: ["red", "green", "blue", "colorless"],
			types: ["top", "bottom", "full"],
			tile: "",
			currency: `care_worker`,
		}
	},

	/** @type {{keys:number,progress:number}} result of the disabled perfect play solver */
	solved: {keys: 0, progress: 0},

	/** @type {object} scratch data of the disabled next spawn simulation */
	simulation: {},

	/** @type {?object} min/max/average outcome of the disabled next spawn simulation */
	simResult: null,

	/** @type {boolean} true = show the round instead of the day column in the disabled status table */
	hideDaily: true,


	/**
	 * Rebuilds all per color statistics from the tracked pieces: counts by level
	 * and key part ("table": every piece with a key part, "unlocked": movable
	 * pieces only) and the grand prize progress still locked in each color —
	 * the points gained by unlocking all remaining locked pieces of that color,
	 * e.g. with a rainbow/prismatic essence.
	 */
	updateTable: () => {
		mergerGame.hasJoker = false;
		const table = {},
			unlocked = {},
			lockedProgress = {};
		for (const color of mergerGame.colors) {
			table[color] = {};
			unlocked[color] = {};
			lockedProgress[color] = 0;
			for (const level of [1, 2, 3, 4]) {
				table[color][level] = {};
				unlocked[color][level] = {};
				for (const type of mergerGame.types) {
					table[color][level][type] = 0;
					unlocked[color][level][type] = 0;
				}
				unlocked[color][level]["none"] = 0;
			}
		}
		for (const cell of mergerGame.cells) {
			if (!cell.id || cell.id < 0) continue;
			if (cell.isFixed && lockedProgress[cell.type?.value] !== undefined) {
				lockedProgress[cell.type.value] += mergerGame.levelValues[cell.level] || 0;
			}
			if (!cell.keyType?.value) continue;
			if (cell?.type?.value == "colorless") mergerGame.hasJoker = true;
			if (cell.keyType.value != "none") {
				table[cell.type.value][cell.level][cell.keyType.value]++;
			}
			if (!cell.isFixed) {
				unlocked[cell.type.value][cell.level][cell.keyType.value]++;
			}
		}
		mergerGame.state.table = table;
		mergerGame.state.unlocked = unlocked;
		mergerGame.state.lockedProgress = lockedProgress;
		/*
		if (!mergerGame.hasJoker) {
			mergerGame.solve();
		} else*/ {
			mergerGame.solved = {keys: 0, progress: 0};
			mergerGame.simResult = {keys: {min: "?", max: "?", average: "?"}, progress: {min: "?", max: "?", average: "?"}};
		}
	},

	/*
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
	},*/


	/**
	 * Keys currently collectable on the board: already converted keys plus the
	 * value of every piece with a full key. Also toggles a blocker overlay over
	 * the reset button while such keys would be lost by a reset.
	 * @returns {number} keys the current board is worth
	 */
	keySum: () => {
		let sum = 0;
		for (const cell of mergerGame.cells) {
			if (cell.keyType?.value == "full") sum += mergerGame.keyValues[cell.level];
		}
		if (sum > 0 && !($('#mergerGameDialog.closed').length > 0 && mergerGame.settings.hideOverlay)) {
			if ($('#mergerGameResetBlocker').length === 0) {
				const blocker = document.createElement("img");
				blocker.id = 'mergerGameResetBlocker';
				blocker.className = mergerGame.event + " helper-blocker";
				blocker.src = srcLinks.get("/city/gui/great_building_bonus_icons/great_building_bonus_plunder_repel.png", true);
				blocker.title = i18n("Boxes.MergerGame.KeysLeft." + mergerGame.event);
				$('#game_body')[0].append(blocker);
				$('#mergerGameResetBlocker').on("click", () => { $('#mergerGameResetBlocker').remove(); });
			}
		} else {
			$('#mergerGameResetBlocker').remove();
		}
		return mergerGame.state.keys + sum;
	},


	/**
	 * Opens the merge game box (if not already open) and renders the statistics.
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
				resize: true,
				ask: i18n('Boxes.MergerGame.HelpLink'),
				active_maps: "main"
			});

			$('#mergerGameDialogclose').on("click", () => { $('#mergerGameResetBlocker').remove(); });
			$('#mergerGameDialogButtons .window-minimize').on("click", () => {
				if (mergerGame.settings.hideOverlay) $('#mergerGameResetBlocker').remove();
			});
		}

		mergerGame.updateDialog();
	},


	/**
	 * Renders one table per color: the header shows the progress still locked in
	 * that color (what unlocking all of it, e.g. with an essence, would earn —
	 * the most valuable color is highlighted) and the free pieces without a key
	 * part per level, the rows below count the pieces per key half.
	 */
	updateDialog: () => {
		const type1 = mergerGame.types[1],
			type2 = mergerGame.types[0];
		if ($('#mergerGameDialog').length === 0) {
			return;
		}

		const table = mergerGame.state.table;
		//let targetEfficiency = mergerGame.settings.targetProgress/mergerGame.settings.availableCurrency;
		/*let effcolor = (eff,target=targetEfficiency) => {
			return eff > target*1.15 ? 'var(--success)' : eff > target*1 ? 'yellow' : eff > target * 0.95 ? 'var(--text-bright)' : 'red';
		}*/
		//let keys = mergerGame.keySum();
		//let totalValue = mergerGame.state.progress + keys*mergerGame.settings.keyValue;
		//let efficiency = (totalValue / mergerGame.state.energyUsed).toFixed(2);
		//let simEff = mergerGame.hasJoker?"???":Math.round((mergerGame.state.progress + mergerGame.solved.progress + (mergerGame.state.keys + mergerGame.solved.keys)*mergerGame.settings.keyValue)/mergerGame.state.energyUsed*100)/100||0

		//let simMinEff = mergerGame.hasJoker?"?":Math.round((simEff * mergerGame.state.energyUsed + mergerGame.simResult.value.min)/(mergerGame.state.energyUsed + mergerGame.spawnCost)*100)/100
		//let simMaxEff = mergerGame.hasJoker?"?":Math.round((simEff * mergerGame.state.energyUsed + mergerGame.simResult.value.max)/(mergerGame.state.energyUsed + mergerGame.spawnCost)*100)/100
		//let simAvgEff = mergerGame.hasJoker?"?":Math.round((simEff * mergerGame.state.energyUsed + mergerGame.simResult.value.average)/(mergerGame.state.energyUsed + mergerGame.spawnCost)*100)/100

		//let dailyEff = Math.round(((mergerGame.state.progress + mergerGame.state.daily.progress + (mergerGame.state.keys + mergerGame.state.daily.keys)*mergerGame.settings.keyValue)/(mergerGame.state.energyUsed+mergerGame.state.daily.energyUsed))*100)/100;

		const totalPieces = {};
		//let maxKeys= keys;
		for (const color of mergerGame.colors) {
			totalPieces[color] = {};
			for (const type of mergerGame.types) {
				totalPieces[color][type] = table[color][1][type] + table[color][2][type] + table[color][3][type] + table[color][4][type];
			}
			totalPieces[color]["min"] = Math.min(totalPieces[color][type1], totalPieces[color][type2]);
			//maxKeys+=totalPieces[color]["min"]*mergerGame.keyValues[4];
		}
		const keyimg = (color, type) => {
			return srcLinks.get(`/shared/seasonalevents/${mergerGame.event}/event/${mergerGame.lookup.keyIconAssetIds[color][type]}.png`, true);
		};
		// progress still locked per color = what unlocking the whole color (e.g. with an essence) would earn
		const lockedProgress = mergerGame.state.lockedProgress || {};
		const bestLocked = Math.max(...mergerGame.colors.map((color) => lockedProgress[color] || 0));
		let html = ``;
		/*
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
		*/
		for (const color of mergerGame.colors) {
			html += `<table class="foe-table"><tr>`;
			html += `<th class="lockedProgress${(bestLocked > 0 && lockedProgress[color] == bestLocked) ? ' best' : ''}" title="${i18n("Boxes.MergerGame.LockedProgress." + mergerGame.event)}">${lockedProgress[color] || 0}<img src="${srcLinks.get(mergerGame.eventData[mergerGame.event].progress, true)}"></th>`;
			for (let lev = 4; lev > 0; lev--) {
				html += `<th>${mergerGame.state.unlocked[color][lev].none}<img src="${srcLinks.get(`/shared/seasonalevents/${mergerGame.event}/event/${mergerGame.event}${mergerGame.eventData[mergerGame.event].tile}_${color}_${lev}.png`, true)}" title="${mergerGame.spawnChances?.[color]?.[lev] || 0}%"></th>`;
			}
			for (const part of mergerGame.types) {
				if (part == "full") continue;
				const total = totalPieces[color][part];
				// bold marks the limiting key half (the smaller total)
				html += `</tr><tr><td ${(total == totalPieces[color].min) ? 'style="font-weight:bold"' : ''}>${total}`;
				html += `<img class="${"care" == mergerGame.event ? 'bottomrightcorner' : ''}" src="${keyimg(color, part)}"></td>`;
				for (let lev = 4; lev > 0; lev--) {
					const count = table[color][lev][part];
					html += `<td style="${count != 0 ? 'font-weight:bold;' : ''}">${count || "-"}</td>`;
				}
			}
			html += `</tr></table>`;
		}

		$('#mergerGameDialogBody').html(html);
	},


	/**
	 * Warns (optically and/or audibly, according to the settings) as soon as a
	 * completed event task can be collected — including hints when collecting
	 * would overflow the event currency or the world challenge.
	 * @param {boolean} [warn] false only refreshes the overflow hints without alerting
	 */
	checkTaskProgress: (warn = true) => {
		// The task warning has its own setting, independent of the merge game box
		if (!Settings.GetSetting('ShowEventChest') || !(Settings.GetSetting('EventHelperMergeBlocker') === undefined ? true : Settings.GetSetting('EventHelperMergeBlocker'))) {
			return;
		}
		let raiseAlert = false;
		const rewardsSum = {};
		let wcSum = 0;
		for (const slot of Object.values(mergerGame.tasks)) {
			if (slot.currentProgress >= slot.requiredProgress) {
				if (!slot.alerted) {
					raiseAlert = true;
					slot.alerted = true;
				}
				rewardsSum[slot.rewardResource] = (rewardsSum[slot.rewardResource] || 0) + (slot.rewardAmount || 0);
				wcSum += slot.worldChallengeTokens || 0;
			}
		}
		// Overlay/sound toggles moved to the main settings; fall back to the values formerly stored in the box settings
		let optical = Settings.GetSetting('EventHelperMergeBlockerOptical');
		if (optical === undefined) optical = mergerGame.settings.opticalTaskWarning;
		let audible = Settings.GetSetting('EventHelperMergeBlockerAudible');
		if (audible === undefined) audible = mergerGame.settings.audibleTaskWarning;
		if (audible && warn && raiseAlert) {
			helper.sounds.play("message");
		}
		if (optical && warn && raiseAlert && $('#mergerGameTaskWarning').length === 0) {
			HTML.AddCssFile('mergergame');
			mergerGame.allowRemoveWarning = false;
			setTimeout(() => {
				mergerGame.allowRemoveWarning = true;
			}, 200);
			$(`<div id="mergerGameTaskWarning" class="mergerGameTaskWarning">
					<div class="foeHelper">
						${i18n("Global.BoxTitle")}
					</div>
					${i18n("Boxes.MergerGame.TaskReady")} ➤
					<div class="CurrencyOverflowWarning">
						${i18n("Boxes.MergerGame.CurrencyOverflowWarning")} ▲▲▲
					</div>
					<div class="WorldChallengeOverflowWarning">
						${i18n("Boxes.MergerGame.WorldChallengeOverflowWarning")} ▼▼▼
					</div>
				</div>`)
				.appendTo('body')
				.on("click", () => { $('#mergerGameTaskWarning').remove(); });
		} else {
			if (mergerGame.allowRemoveWarning && warn) $('#mergerGameTaskWarning').remove();
		}
		if (worldChallenge.currentPoints + wcSum > worldChallenge.requiredPoints)
			$('#mergerGameTaskWarning').addClass('showWorldChallengeOverflowWarning');
		for (const [resource, amount] of Object.entries(rewardsSum)) {
			if ((GoodsData[resource].abilities?.resourceCap?.amount || Infinity) < amount + ResourceStock[resource])
				$('#mergerGameTaskWarning').addClass('showCurrencyOverflowWarning');
		}
	}
	/*
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
	},*/
}