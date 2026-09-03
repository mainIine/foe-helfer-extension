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

FoEproxy.addHandler('IdleGameService', 'getState', (data, postData) => {
	// Do not show the window if deactivated in the settings
	if (!Settings.GetSetting('ShowEventChest') || !(Settings.GetSetting('EventHelperIdle') ?? true)) {
		return;
	}

	// The idle_game metadata normally arrives with the startup batch — if it is
	// still missing, keep the state and apply it as soon as the meta handler fires
	if (!idleGame.meta) {
		idleGame.pendingState = data.responseData;
		return;
	}
	idleGame.applyState(data.responseData);
});

FoEproxy.addRequestHandler('IdleGameService', 'performActions', (postData) => {
	if (postData['requestClass'] !== 'IdleGameService') return;

	for (const action of Object.values(postData['requestData'][1])) {
		if (!action.characterId && !action.taskId) continue;

		if (action.type === 'upgrade_level') {
			idleGame.data[action.characterId].level += action.amount || 1;
		}
		if (action.type === 'upgrade_manager') {
			idleGame.data[action.characterId].manager += action.amount || 1;
		}
		if (action.type === 'collect_task') {
			idleGame.Taskprogress[action.taskId] = {};
			const index = idleGame.Tasklist.indexOf(action.taskId);
			if (index > -1) {
				idleGame.Tasklist.splice(index, 1);
			}
		}
	}

	if ($('#idleGameDialog').length > 0) {
		idleGame.idleGameUpdateDialog();
	}
});

FoEproxy.addMetaHandler('idle_game', (data, postData) => {
	idleGame.meta = JSON.parse(data['response']);
	if (idleGame.pendingState) {
		const state = idleGame.pendingState;
		idleGame.pendingState = null;
		idleGame.applyState(state);
	}
});


const idleGame = {

	finishTown: 8.4,
	finishTownDegree: 5,
	finishTownDiscount: 0,

	data: Object.fromEntries(
		Object.entries({ workshop_1: 'work', workshop_2: 'work', workshop_3: 'work', workshop_4: 'work', workshop_5: 'work', transport_1: 'ship', market_1: 'fest' })
			.map(([id, type]) => [id, { level: 0, manager: 0, baseData: null, production: 0, degree: 0, next: 0, need: 0, ndegree: 0, type }])
	),

	images: {
		st_patricks_event: {
			idleCurrency: "/shared/seasonalevents/stpatricks/event/stpatrick_task_idle_currency_thumb.png",
			workshop_1: "/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_hats_thumb.png",
			workshop_2: "/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_flowers_thumb.png",
			workshop_3: "/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_cake_thumb.png",
			workshop_4: "/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_drinks_thumb.png",
			workshop_5: "/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_fireworks_thumb.png",
			transport_1: "/shared/seasonalevents/stpatricks/event/stpatrick_task_shipyard_thumb.png",
			market_1: "/shared/seasonalevents/stpatricks/event/stpatrick_task_parade_thumb.png"
		},
		fellowship_event: {
			idleCurrency: "/shared/seasonalevents/fellowship/event/fellowship_task_idle_currency_thumb.png",
			workshop_1: "/shared/seasonalevents/fellowship/event/fellowship_task_goods_spices_thumb.png",
			workshop_2: "/shared/seasonalevents/fellowship/event/fellowship_task_goods_drinks_thumb.png",
			workshop_3: "/shared/seasonalevents/fellowship/event/fellowship_task_goods_farm_thumb.png",
			workshop_4: "/shared/seasonalevents/fellowship/event/fellowship_task_goods_bakery_thumb.png",
			workshop_5: "/shared/seasonalevents/fellowship/event/fellowship_task_goods_butchery_thumb.png",
			transport_1: "/shared/seasonalevents/fellowship/event/fellowship_task_carriage_thumb.png",
			market_1: "/shared/seasonalevents/fellowship/event/fellowship_task_banquette_thumb.png"
		}
	},
	texts: {
		st_patricks_event: {
			Production: i18n('Boxes.idleGame.Production.StPat')
		},
		fellowship_event: {
			Production: i18n('Boxes.idleGame.Production.StPat')
		}
	},

	event: "fellowship_event",

	Tasks: {},
	Tasklist: [],
	Taskprogress: {},

	settings: JSON.parse(localStorage.getItem('idleGameSettings') || '{"hiddenTables":[],"minimized":false,"Strategy":{},"targets":{"workshop_1": 0, "workshop_2": 0, "workshop_3": 0, "workshop_4": 0, "workshop_5": 0, "transport_1": 0, "market_1": 0}}'),

	Progress: 0,
	ProgressDegree: 0,
	Stage: 0,

	iGNums: {
		0: "",
		1: "K",
		2: "M",
		3: "B",
		4: "T",
		5: "Q",
		6: "QT"
	},
	iGNumTitles: {
		0: "",
		1: i18n('Boxes.idleGame.K'),
		2: i18n('Boxes.idleGame.M'),
		3: i18n('Boxes.idleGame.B'),
		4: i18n('Boxes.idleGame.T'),
		5: i18n('Boxes.idleGame.Q'),
		6: i18n('Boxes.idleGame.QT')
	},


	/**
	 * Returns a fresh set of default upgrade targets (one per station)
	 *
	 * @returns {Object<string, number>}
	 */
	defaultTargets: () => ({ workshop_1: 0, workshop_2: 0, workshop_3: 0, workshop_4: 0, workshop_5: 0, transport_1: 0, market_1: 0 }),


	/**
	 * Returns the strategy step list for the current event and variant
	 *
	 * @returns {Object[]|undefined}
	 */
	strategy: () => idleGame.settings.Strategy[idleGame.event][idleGame.Variant],


	/**
	 * Shifts a value into the 0-999 display range by raising its degree
	 *
	 * @param {number} value
	 * @param {number} degree current thousands-degree (0=none, 1=K, 2=M, ...)
	 * @returns {[number, number]} normalized value and degree
	 */
	normalize: (value, degree) => {
		while (value >= 1000 && degree < 6) {
			value /= 1000;
			degree += 1;
		}
		return [value, degree];
	},


	/**
	 * Adopts a full IdleGameService.getState response (levels, managers, tasks, currency, stage)
	 *
	 * @param {Object} state responseData of getState
	 * @returns {void}
	 */
	applyState: (state) => {
		idleGame.event = state.context;
		idleGame.selectEventData();

		if (!idleGame.settings.Strategy) idleGame.settings.Strategy = {};
		if (!idleGame.settings.Strategy[idleGame.event]) idleGame.settings.Strategy[idleGame.event] = {};
		if (idleGame.settings.currentEvent !== idleGame.event) {
			idleGame.settings.Strategy.CurrentVariant = 0;
			idleGame.settings.currentEvent = idleGame.event;
		}

		// Don't create a new box while another one is still open
		if ($('#idleGameDialog').length === 0) {
			idleGame.ShowDialog();
		}

		for (const building of Object.values(idleGame.data)) {
			Object.assign(building, { level: 0, manager: 0, production: 0, degree: 0, next: 0, need: 0, ndegree: 0 });
		}

		for (const character of Object.values(state.characters)) {
			idleGame.data[character.id].level = character.level || 0;
			idleGame.data[character.id].manager = character.managerLevel || 0;
		}

		idleGame.Tasklist = state.taskHandler.taskOrder;

		for (const taskId of Object.values(state.taskHandler.completedTasks)) {
			const index = idleGame.Tasklist.indexOf(taskId);
			if (index > -1) {
				idleGame.Tasklist.splice(index, 1);
			}
		}

		idleGame.Progress = Number(state.idleCurrencyAmount.value) || 0;
		idleGame.ProgressDegree = Number(state.idleCurrencyAmount.degree) || 0;

		for (const task of state.taskHandler.inProgressTasks || []) {
			idleGame.Taskprogress[task.id] = { value: task.currentProgress.value || 0, degree: task.currentProgress.degree || 0 };
		}

		if (state.stage) {
			idleGame.Stage = state.stage;
			idleGame.Variant = (idleGame.Stage - 1) % 3 + 1;
			if (!idleGame.settings.Strategy.CurrentVariant) idleGame.settings.Strategy.CurrentVariant = 0;
			if (idleGame.Variant !== idleGame.settings.Strategy.CurrentVariant) {
				idleGame.settings.Strategy.CurrentVariant = idleGame.Variant;
				if (!idleGame.strategy()) idleGame.settings.Strategy[idleGame.event][idleGame.Variant] = [];
				for (const step of idleGame.strategy()) {
					step.check = false;
				}
				idleGame.settings.targets = idleGame.defaultTargets();
				idleGame.saveSettings();
			}
			if (!idleGame.strategy()) idleGame.settings.Strategy[idleGame.event][idleGame.Variant] = [];
		}

		idleGame.idleGameUpdateDialog();
	},


	/**
	 * 1:1 port of the game's IdleGameNumber (value 1-999 plus a thousands degree).
	 * Every operation re-fits the degree AND rounds: to 6 decimals whenever the
	 * degree changes and to a whole number while the degree is 0 — this is why
	 * +20 % on a level-1 factory yields nothing (1 × 1.2 → 1) and why upgrade
	 * costs are whole coins early on.
	 */
	Num: class {
		/**
		 * @param {number} [value]
		 * @param {number} [degree]
		 */
		constructor(value, degree) {
			this.value = 0;
			this.degree = 0;
			this.set(value || 0, degree || 0);
		}

		/**
		 * @param {number} value
		 * @param {number} [degree]
		 * @returns {this}
		 */
		set(value, degree) {
			this.value = value;
			this.degree = degree || 0;
			this.fit();
			return this;
		}

		/**
		 * @param {number} degree
		 * @returns {number} value expressed at the given degree
		 */
		valueFor(degree) {
			return this.value * Math.pow(1000, this.degree - degree);
		}

		/**
		 * @param {idleGame.Num} n
		 * @returns {this}
		 */
		add(n) {
			const d = Math.max(n.degree, this.degree) | 0;
			this.value = this.valueFor(d) + n.valueFor(d);
			this.degree = d;
			this.fit();
			return this;
		}

		/**
		 * @param {idleGame.Num} n
		 * @returns {this}
		 */
		subtract(n) {
			const d = Math.max(n.degree, this.degree) | 0;
			this.value = this.valueFor(d) - n.valueFor(d);
			this.degree = d;
			this.fit();
			return this;
		}

		/**
		 * multiplyByNativeNumber
		 *
		 * @param {number} x
		 * @returns {this}
		 */
		mul(x) {
			this.value *= x;
			this.fit();
			return this;
		}

		/**
		 * @param {idleGame.Num} n
		 * @returns {boolean}
		 */
		gt(n) {
			return this.degree !== n.degree ? this.degree > n.degree : this.value > n.value;
		}

		/**
		 * @returns {number} plain float
		 */
		toFloat() {
			return this.value * Math.pow(1000, this.degree);
		}

		/**
		 * _adjustDegreeToBestFit of the game
		 *
		 * @returns {void}
		 */
		fit() {
			if (this.value === 0) {
				this.degree = 0;
				return;
			}
			let a = Math.abs(this.value);
			if (a >= 1000) {
				this.toDegree(this.degree + (Math.log(a) / Math.log(1000) | 0));
			} else {
				while (a < 1 && this.degree > 0) {
					this.toDegree(this.degree - 1);
					a = Math.abs(this.value);
				}
			}
			if (this.degree === 0) this.value = Math.round(this.value);
		}

		/**
		 * _adjustToDegree of the game (6 decimals, rounded)
		 *
		 * @param {number} d
		 * @returns {void}
		 */
		toDegree(d) {
			this.value = Math.round(this.value * Math.pow(1000, this.degree - d) * 1e6) / 1e6;
			this.degree = d;
			if (this.degree < 0) {
				this.value = 0;
				this.degree = 0;
			}
		}
	},


	/**
	 * Array or object values of a meta list (the JSON delivers both forms)
	 *
	 * @param {Array|Object} x
	 * @returns {Array}
	 */
	list: (x) => Array.isArray(x) ? x : Object.values(x || {}),


	/**
	 * Rank bonus production modifier (IdleGameCharacter._getRankBonusProductionModifier):
	 * every reached rank threshold, then the endless rank every N levels
	 *
	 * @param {Object} base meta character
	 * @param {number} level
	 * @returns {number} multiplier
	 */
	rankModifier: (base, level) => {
		const levels = idleGame.list(base.rankProductionLevels);
		const mods = idleGame.list(base.rankProductionModifiers);
		let c = 1;
		for (let i = 0; i < levels.length; i++) {
			if (level >= levels[i]) c *= 1 + (mods[i] || 0);
			else break;
		}
		const step = base.rankProductionEndlessLevel || 0;
		if (step > 0) {
			for (let a = (levels.length ? levels[levels.length - 1] : 0) + step; level >= a; a += step) {
				c *= 1 + (base.rankProductionEndlessModifier || 0);
			}
		}
		return c;
	},


	/**
	 * First level of the NEXT rank (IdleGameCharacter._buildCachedLevelProgress)
	 *
	 * @param {Object} base meta character
	 * @param {number} level
	 * @returns {number}
	 */
	nextRank: (base, level) => {
		const levels = idleGame.list(base.rankProductionLevels);
		const step = base.rankProductionEndlessLevel || 0;
		let d = 0, start = 0, next = 0;
		for (const g of levels) {
			d = g;
			if (level >= g) start = g;
			next = g;
			if (start !== next) break;
		}
		if (start === next) {
			d = (levels.length ? levels[levels.length - 1] : 0) + step;
			if (level >= d) start = d;
			next = d;
		}
		if (step <= 0) return start === next ? level + 1 : next;
		while (start === next) {
			d += step;
			if (level >= d) start = d;
			next = d;
		}
		return next;
	},


	/**
	 * Active manager bonuses summed per type (IdleGameCharacter._getActiveBonuses):
	 * every bonus whose level is reached counts, whatever the list order
	 *
	 * @param {Object} base meta character
	 * @param {number} manager manager level
	 * @returns {{production?: number, speed?: number}}
	 */
	bonuses: (base, manager) => {
		const out = {};
		for (const b of idleGame.list(base.bonuses)) {
			if (b.level > manager) continue;
			out[b.type] = (out[b.type] || 0) + (b.amount || 0);
		}
		return out;
	},


	/**
	 * Amount produced per cycle (IdleGameFormulas.updateCharacterMaxProduceAmount):
	 * base × level × productionGrowthRate × (1 + production bonus) × rank modifier,
	 * each factor applied through IdleGameNumber (rounded after every step)
	 *
	 * @param {Object} base meta character
	 * @param {number} level
	 * @param {number} manager manager level
	 * @returns {idleGame.Num}
	 */
	produce: (base, level, manager) => {
		const n = new idleGame.Num(base.baseProductionValue, base.baseProductionDegree || 0);
		n.mul(level);
		const growth = Number(base.productionGrowthRate);
		n.mul(isFinite(growth) && growth > 0 ? growth : 1);
		const b = idleGame.bonuses(base, manager);
		if (b.production) n.mul(1 + b.production);
		n.mul(idleGame.rankModifier(base, level));
		return n;
	},


	/**
	 * Cost of the upgrade level → level+1 (IdleGameFormulas.updateCharacterUpgradeCost):
	 * base × growth^(level-1), multiplied in chunks of 50 like the game
	 *
	 * @param {Object} base meta character
	 * @param {number} level current level (≥ 1)
	 * @returns {idleGame.Num}
	 */
	levelCost: (base, level) => {
		const b = level - 1;
		const n = new idleGame.Num(base.baseUpgradeCostValue, base.baseUpgradeCostDegree || 0);
		const g = base.upgradeCostGrowthRate;
		const chunks = Math.floor(b / 50);
		const big = Math.pow(g, 50);
		for (let i = 0; i < chunks; i++) n.mul(big);
		n.mul(Math.pow(g, b % 50));
		return n;
	},


	/**
	 * Total cost of the upgrades from → to, summed level by level like the MAX purchase
	 *
	 * @param {Object} base meta character
	 * @param {number} from
	 * @param {number} to
	 * @returns {idleGame.Num}
	 */
	rangeCost: (base, from, to) => {
		const total = new idleGame.Num();
		for (let u = from; u < to; u++) total.add(idleGame.levelCost(base, u));
		return total;
	},


	/**
	 * Copies base data of the current event (characters, tasks, stage costs) from the meta data
	 *
	 * @returns {void}
	 */
	selectEventData: () => {
		const configs = Object.values(idleGame.meta.configs);
		const config = configs.find(c => c.context === idleGame.event) ?? configs.at(-1);

		for (const character of Object.values(config.characters)) {
			if (!character.id) continue;
			idleGame.data[character.id].baseData = character;
		}
		for (const task of Object.values(config.tasks)) {
			if (!task.id) continue;
			idleGame.Tasks[task.id] = task;
		}

		idleGame.finishTown = config.stageCostValue;
		idleGame.finishTownDegree = config.stageCostDegree;
		idleGame.finishTownDiscount = 1 - config.nextStageCostReductionPercentage / 100;
	},


	/**
	 * Shows a user box with the current production stats
	 *
	 * @constructor
	 */
	ShowDialog: () => {
		HTML.AddCssFile('idleGame');

		HTML.Box({
			id: 'idleGameDialog',
			title: i18n('Boxes.idleGame.Title'),
			auto_close: true,
			dragdrop: true,
			minimize: true,
			resize: true,
			active_maps: "main",
		});

		let htmltext = `<table id="idleGame_Table" style="width:100%"><thead><tr><th colspan="2">`;
		htmltext += `<img src="${srcLinks.get(idleGame.images[idleGame.event].idleCurrency, true)}" alt="" > `;
		htmltext += `${i18n('Boxes.idleGame.Hourly')}</th></tr></thead><tr>`;
		htmltext += `<td colspan="2"><div class="flex"><div><p>${idleGame.data.market_1.baseData.name}<br><span id="idleGame_Fest"></span></p>`;
		htmltext += `${idleGame.data.transport_1.baseData.name}<br><span id="idleGame_Ship"></span></div>`;
		htmltext += `<div>${idleGame.texts[idleGame.event].Production}<br><span id="idleGame_Work"></span></div></div></td>`;
		htmltext += `</tr><tr class="town_info"><td><div class="idleGame_Town"></div></td>`;
		htmltext += `<td data-original-title="${i18n('Boxes.idleGame.Warning')}">${i18n('General.Disclaimer')}</td></tr></table>`;

		htmltext += `<table id="idleGame_Next" class="foe-table" style="width:100%"><tr><th colspan="4" onclick="idleGame.hide('#idleGame_Next')">${i18n('Boxes.idleGame.BuildingUpgrades')}<i></i></th></tr>`;
		for (const [id, building] of Object.entries(idleGame.data)) {
			htmltext += `<tr>`;
			htmltext += `<td><img data-original-title="${building.baseData.name}" src="${srcLinks.get(idleGame.images[idleGame.event][id], true)}" alt="" ></td>`;
			htmltext += `<td><span id="idleGame_${id}Level" class="levelSelect" data-station="${id}"></span></td>`;
			htmltext += `<td><span id="idleGame_${id}"></span></td>`;
			htmltext += `<td class="align-right"><span id="idleGame_${id}Time"></span></td></tr>`;
		}
		htmltext += `</table>`;

		htmltext += `<table id="idleGame_TasksActive" class="foe-table" style="width:100%"><tr><th colspan="2" onclick="idleGame.hide('#idleGame_TasksActive')">${i18n('Boxes.idleGame.ActiveTasks')}<i></i></th></tr>`;
		for (let t = 0; t < 3; t++) {
			htmltext += `<tr><td class="align-left" id="idleGame_Task${t}"></td><td id="time${t}"></td></tr>`;
		}
		htmltext += `</table>`;

		htmltext += `<table id="idleGame_Tasks" class="foe-table" style="width:100%"><tr><th onclick="idleGame.hide('#idleGame_Tasks')">${i18n('Boxes.idleGame.UpcomingTasks')}<i></i></th></tr>`;
		for (let t = 3; t < 9; t++) {
			htmltext += `<tr><td id="idleGame_Task${t}"></td></tr>`;
		}
		htmltext += `</table>`;

		htmltext += `<table id="idleGame_Strategy" class="foe-table" style="width:100%"><tr>`;
		htmltext += `<th class="clickable" style="width:25px" onclick="idleGame.modifyStrategy()">✏️</th>`;
		htmltext += `<th colspan="2" onclick="idleGame.hide('#idleGame_Strategy')"><span style="margin-right:25px">${i18n('Boxes.idleGame.Strategy')}</span><i></i></th></tr>`;
		htmltext += `<tr><td colspan="2" id="idleGame_StratPrev"></td><td style="width:25px" id="idleGame_StratUndo" onclick="idleGame.StratUndo()"></td></tr>`;
		htmltext += `<tr><td colspan="2" id="idleGame_Strat"></td><td id="idleGame_StratCheck" onclick="idleGame.StratCheck()"></td></tr>`;
		htmltext += `<tr><td colspan="2" id="idleGame_StratNext"></td><td></td></tr>`;
		htmltext += `</table>`;
		htmltext += `<div id="idleGame_Town" style="color:var(--text-bright); font-weight:bold"></div>`;

		$('#idleGameDialogBody').html(htmltext);

		for (const table of idleGame.settings.hiddenTables) {
			$(table).toggleClass("hide");
		}

		const box = $('#idleGameDialog');
		if (box.hasClass('open') && idleGame.settings.minimized) {
			box.removeClass('open').addClass('closed');
			box.find('.window-body').css("visibility", "hidden");
		} else {
			box.removeClass('closed').addClass('open');
			box.find('.window-body').css("visibility", "visible");
		}

		$('#idleGameDialogHeader > span.window-minimize').on('click', () => {
			idleGame.settings.minimized = !idleGame.settings.minimized;
			idleGame.saveSettings();
		});

		$('.levelSelect').on('click', function () {
			const input = document.createElement('input');
			input.setAttribute('type', 'text');
			input.setAttribute('data-station', this.dataset.station);
			input.setAttribute('data-replace', this.id);
			input.setAttribute('style', 'width: 80px');
			input.setAttribute('onkeyup', 'idleGame.updateTarget(event)');
			input.setAttribute('onfocusout', 'idleGame.removeInput(event)');
			this.style.display = "none";
			this.parentElement.append(input);
			input.focus();
		});
	},


	/**
	 * Stores the level target of an input field (clamped to 0-999) in the settings
	 *
	 * @param {HTMLInputElement} input
	 * @returns {void}
	 */
	commitTarget: (input) => {
		idleGame.settings.targets[input.dataset.station] = Math.max(Math.floor(Math.min(Number(input.value), 999) || 0), 0);
		idleGame.saveSettings();
	},


	/**
	 * Keyup handler of the level target input: Enter saves, Escape cancels
	 *
	 * @param {KeyboardEvent} event
	 * @returns {void}
	 */
	updateTarget: (event) => {
		if (event.key !== 'Enter' && event.key !== 'Escape') return;

		if (event.key === 'Enter') {
			idleGame.commitTarget(event.target);
		}

		$('#' + event.target.dataset.replace)[0].style.display = "block";
		event.target.setAttribute('onfocusout', '');
		event.target.remove();
		idleGame.idleGameUpdateDialog();
	},


	/**
	 * Focusout handler of the level target input: saves the value and removes the field
	 *
	 * @param {FocusEvent} event
	 * @returns {void}
	 */
	removeInput: (event) => {
		idleGame.commitTarget(event.target);

		$('#' + event.target.dataset.replace)[0].style.display = "block";
		event.target.remove();
		idleGame.idleGameUpdateDialog();
	},


	/**
	 * Recalculates all productions and refreshes the dialog contents
	 *
	 * @returns {void}
	 */
	idleGameUpdateDialog: () => {
		for (const building of Object.values(idleGame.data)) {
			idleGame.Production(building);
		}

		// Sum up all workshop productions on a common degree
		let degree = 0;
		let sum = 0;
		let worktitle = '';
		const tappedNames = [];

		for (const building of Object.values(idleGame.data)) {
			if (building.type === 'work' && building.degree > degree) {
				degree = building.degree;
			}
		}
		for (const building of Object.values(idleGame.data)) {
			if (building.type !== 'work') continue;
			sum += Math.pow(1000, building.degree - degree) * building.production;
			if (building.tapped) tappedNames.push(building.baseData.name);
			worktitle += `<br/>${building.tapped ? '🖱 ' : ''}${building.baseData.name}: ${building.production.toPrecision(3)} ${idleGame.iGNums[building.degree]}`;
		}
		if (tappedNames.length) {
			worktitle += `<br/><i>${i18n('Boxes.idleGame.Tapped').replace('__names__', tappedNames.join(', '))}</i>`;
		}

		while (Number(sum.toPrecision(3)) >= 1000 && degree < 6) {
			sum /= 1000;
			degree += 1;
		}

		// Find the bottleneck: the slowest of workshops, ship and festival
		let ident = '#idleGame_Work';
		const work = sum;
		const workd = degree;
		const ship = idleGame.data.transport_1.production;
		const shipd = idleGame.data.transport_1.degree;
		const fest = idleGame.data.market_1.production;
		const festd = idleGame.data.market_1.degree;

		if (shipd < degree || (shipd === degree && ship < sum)) {
			degree = shipd;
			sum = ship;
			ident = '#idleGame_Ship';
		}
		if (festd < degree || (festd === degree && fest < sum)) {
			ident = '#idleGame_Fest';
			sum = fest;
			degree = festd;
		}

		$('#idleGame_Work, #idleGame_Ship, #idleGame_Fest').removeClass("highlight");
		$(ident).addClass("highlight");

		for (const [id, building] of Object.entries(idleGame.data)) {
			$(`#idleGame_${id}Level`).text(`${building.level} → ${building.next}`);
			$(`#idleGame_${id}`)
				.text(`${idleGame.bigNum(building.need)}${idleGame.iGNums[building.ndegree]}`)
				.attr('data-original-title', `${idleGame.bigNum(building.need)} ${idleGame.iGNumTitles[building.ndegree]}`);
			$(`#idleGame_${id}Time`).html(idleGame.time(building.need, building.ndegree, sum, degree, 0, 0, fest, festd));
		}

		$('#idleGame_Work').text(`${idleGame.bigNum(work)} ${idleGame.iGNums[workd]}`)
			.attr('data-original-title', `${idleGame.bigNum(work)} ${idleGame.iGNumTitles[workd]}<br>${worktitle}`);
		$('#idleGame_Ship').text(`${idleGame.bigNum(ship)} ${idleGame.iGNums[shipd]}`)
			.attr('data-original-title', `${idleGame.bigNum(ship)} ${idleGame.iGNumTitles[shipd]}`);
		$('#idleGame_Fest').text(`${idleGame.bigNum(fest)} ${idleGame.iGNums[festd]}`)
			.attr('data-original-title', `${idleGame.bigNum(fest)} ${idleGame.iGNumTitles[festd]}`);

		const taskCount = Math.min(idleGame.Tasklist.length, 9);

		for (let t = 0; t < 3; t++) {
			$('#idleGame_Task' + t).text('').addClass('hide');
			$('#time' + t).text('').addClass('hide');
			if (t >= taskCount) continue;

			const Task = idleGame.Tasks[idleGame.Tasklist[t]];
			if (Task.type !== "collect_idle_currency") continue;

			$('#idleGame_Task' + t).text(Task.description).removeClass('hide');

			const target = Task.targets[0];
			let targetProduction = idleGame.data[target].production;
			let targetDegree = idleGame.data[target].degree;
			if (target === 'market_1') {
				targetProduction = sum;
				targetDegree = degree;
			}
			if (target === 'transport_1' && targetProduction * Math.pow(1000, targetDegree - workd) > work) {
				targetProduction = work;
				targetDegree = workd;
			}
			if (Task.targets.length === 5) {
				targetProduction = work;
				targetDegree = workd;
			}

			const progress = idleGame.Taskprogress[idleGame.Tasklist[t]];
			$('#time' + t)
				.html(idleGame.time(Task.requiredProgress.value, Task.requiredProgress.degree, targetProduction, targetDegree, progress?.value || 0, progress?.degree || 0, 0, 0))
				.removeClass('hide');
		}

		for (let t = 3; t < 9; t++) {
			if (t < taskCount) {
				$('#idleGame_Task' + t).text(idleGame.Tasks[idleGame.Tasklist[t]].description).removeClass('hide');
			} else {
				$('#idleGame_Task' + t).text('').addClass('hide');
			}
		}

		idleGame.DisplayStrat(idleGame.checkStrat());

		const text_currentrun = `${i18n('Boxes.idleGame.CurrentRun')}: ${idleGame.Stage} / ${i18n('Boxes.idleGame.Variant')}: ${idleGame.Variant}`;
		const text_currentrun_short = `${idleGame.Stage}/${idleGame.Variant}`;
		const Tt = idleGame.Stage === 1 ? 1 : idleGame.finishTown;
		const Td = idleGame.Stage === 1 ? 2 : idleGame.finishTownDegree;
		const discounted = Math.round(idleGame.finishTownDiscount * Tt * 100) / 100;
		const town_time = idleGame.time(Tt, Td, sum, degree, idleGame.Progress, idleGame.ProgressDegree, fest, festd);
		const discounted_time = idleGame.time(discounted, Td, sum, degree, idleGame.Progress, idleGame.ProgressDegree, fest, festd);

		let text_nexttown = `${i18n('Boxes.idleGame.NextTown')} ${Tt} ${idleGame.iGNums[Td]}: ${town_time}<br/>`;
		text_nexttown += `${discounted} ${idleGame.iGNums[Td]}: ${discounted_time}`;
		$('#idleGame_Town').html(`${text_currentrun}<br/>${text_nexttown}`);

		text_nexttown = `${Tt}${idleGame.iGNums[Td]}: ${town_time}`;
		if (!discounted_time.includes("999")) {
			text_nexttown += `, ${discounted}${idleGame.iGNums[Td]}: ${discounted_time}`;
		}
		$('.idleGame_Town').html(`<span data-original-title="${text_currentrun}">${text_currentrun_short}</span> &middot; ${text_nexttown}`);

		$('#idleGameDialogBody [data-original-title]').tooltip();
	},


	/**
	 * Calculates the hourly production and the cost of the next upgrade for one building
	 * — exact port of the game's IdleGameCharacter/IdleGameFormulas math (see idleGame.Num)
	 *
	 * @param {Object} building entry of idleGame.data (mutated in place)
	 * @returns {Object} the same building object
	 */
	Production: (building) => {
		const base = building.baseData;

		if (building.level === 0) {
			const buy = new idleGame.Num(base.buyCostValue, base.buyCostDegree || 0);
			building.next = 1;
			building.need = buy.value;
			building.ndegree = buy.degree;
			return building;
		}

		// First level of the next rank — or the user's own target when above the level
		let x = idleGame.nextRank(base, building.level);
		if (idleGame.settings.targets[base.id] > building.level) {
			x = idleGame.settings.targets[base.id];
		}
		building.next = x;

		const need = idleGame.rangeCost(base, building.level, x);
		building.need = need.value;
		building.ndegree = need.degree;

		// Coins per cycle (whole coins while below 1K) and the cycle time incl. speed bonus
		const amount = idleGame.produce(base, building.level, building.manager);
		const bonus = idleGame.bonuses(base, building.manager);
		const cycle = (base.productionDuration + base.rechargeDuration) * (bonus.speed ? 1 / (1 + bonus.speed) : 1);

		const [p, d] = idleGame.normalize(amount.toFloat() * 3600 / cycle, 0);

		// Without a manager the station produces only when tapped — the player
		// (or an auto-tapper) taps it every cycle, so its goods are real and
		// flow through the chain. Counting it as 0 hid the actual bottleneck
		// (the carriage starving the banquet while the factories overflowed).
		building.tapped = building.manager === 0;
		building.production = p;
		building.degree = d;

		return building;
	},


	/**
	 * Renders the remaining time until an amount is reached, incl. a no-bottleneck tooltip and a timer button
	 *
	 * @param {number} amount required amount
	 * @param {number} da degree of the required amount
	 * @param {number} hourly hourly production (bottleneck)
	 * @param {number} dh degree of the hourly production
	 * @param {number} stock current stock
	 * @param {number} ds degree of the stock
	 * @param {number} fest festival production (no-bottleneck comparison)
	 * @param {number} df degree of the festival production
	 * @returns {string} HTML string
	 */
	time: (amount, da, hourly, dh, stock, ds, fest, df) => {
		const t = (hourlyValue, hourlyDegree) => {
			const diff = amount - stock * Math.pow(1000, ds - da);
			if (diff <= 0) return { h: 0, m: 0 };
			const total = Math.ceil(diff / hourlyValue * Math.pow(1000, da - hourlyDegree) * 60);
			const hours = Math.floor(total / 60);
			return { h: hours, m: total - hours * 60, t: total };
		};
		const tf = (time) => time.h >= 1000 ? `>999h` : `${time.h}h` + (time.h < 24 ? `:${time.m}m` : ``);

		const t0 = t(hourly, dh);
		const tNB = t(fest, df);

		let time = `<span ${(t0.t > tNB.t) ? 'data-original-title="' + tf(tNB) + '<br>' + i18n("Boxes.idleGame.noBottleneck") + '"' : ''}>${tf(t0)}</span>`;
		time += (t0.h < 24) ? ` <img class="clickable" data-original-title="${i18n("Boxes.idleGame.SetTimer")}" src="${srcLinks.get("/shared/gui/plus_offer/plus_offer_time.png", true)}" alt="" onclick="idleGame.addAlert(${t0.h},${t0.m})">` : ``;
		return time;
	},


	/**
	 * Formats a number with 3 significant digits (integers from 1000 upwards)
	 *
	 * @param {number} number
	 * @returns {string}
	 */
	bigNum: (number) => Number(number.toPrecision(3)) >= 1000 ? `${Math.floor(number)}` : number.toPrecision(3),


	/**
	 * Toggles the visibility of a dialog table and persists it
	 *
	 * @param {string} id jQuery selector of the table
	 * @returns {void}
	 */
	hide: (id) => {
		$(id).toggleClass("hide");
		const i = idleGame.settings.hiddenTables.indexOf(id);
		if (i > -1) {
			idleGame.settings.hiddenTables.splice(i, 1);
		} else {
			idleGame.settings.hiddenTables.push(id);
		}
		idleGame.saveSettings();
	},


	/**
	 * Persists the settings in localStorage
	 *
	 * @returns {void}
	 */
	saveSettings: () => {
		localStorage.setItem('idleGameSettings', JSON.stringify(idleGame.settings));
	},


	/**
	 * Returns the index of the first unchecked strategy step
	 *
	 * @returns {number}
	 */
	firstUnchecked: () => {
		const steps = idleGame.strategy();
		let strat = 0;
		while (strat < steps.length && steps[strat].check) strat++;
		return strat;
	},


	/**
	 * Unchecks the last completed strategy step
	 *
	 * @returns {void}
	 */
	StratUndo: () => {
		const steps = idleGame.strategy();
		let strat = idleGame.firstUnchecked();
		if (strat === 0) return;
		if (strat === steps.length) $('#idleGame_StratCheck').html("check");
		strat--;
		steps[strat].check = false;

		idleGame.DisplayStrat(strat);
		idleGame.saveSettings();
	},


	/**
	 * Checks off the current strategy step
	 *
	 * @returns {void}
	 */
	StratCheck: () => {
		const steps = idleGame.strategy();
		const strat = idleGame.firstUnchecked();
		if (strat === steps.length) return;
		steps[strat].check = true;
		idleGame.DisplayStrat(strat + 1);
		idleGame.saveSettings();
	},


	/**
	 * Evaluates a single strategy condition against the current game state
	 *
	 * @param {string} condition e.g. "T#42" (task done), "W#42" (task active), "M1#5" (manager level), "L1#10" (building level)
	 * @returns {boolean} true if the condition is fulfilled
	 */
	checkCondition: (condition) => {
		const type = condition[0];

		if (type === "M" || type === "L") {
			let building = condition[1];
			switch (building) {
				case "F": building = "market_1"; break;
				case "T": building = "transport_1"; break;
				default: building = "workshop_" + building;
			}
			const value = Number(condition.slice(3));
			return type === "M" ? idleGame.data[building].manager >= value : idleGame.data[building].level >= value;
		}

		const value = Number(condition.slice(2));
		if (type === "T") return idleGame.Tasklist.indexOf(value) < 0; // task complete?
		if (type === "W") return idleGame.Tasklist.indexOf(value) < 3; // task active or complete?
		return true;
	},


	/**
	 * Auto-checks strategy steps whose conditions are all fulfilled and returns the current step index
	 *
	 * @returns {number}
	 */
	checkStrat: () => {
		const steps = idleGame.strategy();
		let strat = 0;
		for (strat = 0; strat < steps.length; strat++) {
			if (steps[strat].check) continue;
			const conditions = steps[strat].conditions || [];
			if (conditions.length === 0) break;
			if (!conditions.every(idleGame.checkCondition)) break;
			steps[strat].check = true;
		}
		return strat;
	},


	/**
	 * Renders the previous, current and next strategy step
	 *
	 * @param {number} strat index of the current step
	 * @returns {void}
	 */
	DisplayStrat: (strat) => {
		const steps = idleGame.strategy();

		if (strat - 1 >= 0) {
			$('#idleGame_StratPrev').html(steps[strat - 1].text);
			$('#idleGame_StratUndo').html('☑');
		} else {
			$('#idleGame_StratPrev').html('');
			$('#idleGame_StratUndo').html('');
		}

		if (strat < steps.length) {
			$('#idleGame_StratCheck').html('☐');
			$('#idleGame_Strat').html(steps[strat].text);
		} else {
			$('#idleGame_StratCheck').html('');
			$('#idleGame_Strat').html('');
		}

		if (strat + 1 < steps.length) {
			$('#idleGame_StratNext').html(steps[strat + 1].text);
		} else {
			$('#idleGame_StratNext').html('');
		}
	},


	/**
	 * Opens the strategy editor dialog with the current step list as text
	 *
	 * @returns {void}
	 */
	modifyStrategy: () => {
		const list = idleGame.strategy().map(x => x.text + (x.conditions.length > 0 ? "#" : "") + x.conditions.join('#')).join('\n');
		if ($('#idleGameStrategyDialog').length === 0) {
			HTML.Box({
				id: 'idleGameStrategyDialog',
				title: i18n('Boxes.idleGame.Strategy.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: false,
				resize: true
			});
		}
		$('#idleGameStrategyDialogBody').html(`<textarea id="idleGameStratText">${list}</textarea><button id="idleGameStratSave" class="btn" onclick="idleGame.saveStrategy()">${i18n('General.Save')}</button>`);
	},


	/**
	 * Parses the strategy editor text (one step per line, conditions separated by #) and saves it
	 *
	 * @returns {void}
	 */
	saveStrategy: () => {
		const lines = $('#idleGameStratText').val().split('\n');

		idleGame.settings.Strategy[idleGame.event][idleGame.Variant] = lines.map(x => {
			const conditions = x.split('#');
			return { text: conditions[0], check: false, conditions: conditions.slice(1) };
		});
		idleGame.saveSettings();
		idleGame.DisplayStrat(0);
		HTML.CloseOpenBox('idleGameStrategyDialog');
	},


	/**
	 * Opens the dialog with meta data only (development helper)
	 *
	 * @returns {void}
	 */
	test: () => {
		idleGame.Variant = 1;
		idleGame.selectEventData();
		idleGame.ShowDialog();
		idleGame.idleGameUpdateDialog();
	},


	/**
	 * Creates a browser alert that fires when the calculated time has passed
	 *
	 * @param {number} hours
	 * @param {number} minutes
	 * @returns {void}
	 */
	addAlert: (hours, minutes) => {
		const data = {
			title: "Idle Game",
			body: i18n("Boxes.idleGame.AlertText"),
			expires: moment().add(hours, "hours").add(minutes, "minutes").valueOf(),
			repeat: -1,
			persistent: true,
			tag: '',
			category: 'event',
			vibrate: false,
			actions: [{ title: "OK" }]
		};

		MainParser.sendExtMessage({
			type: 'alerts',
			playerId: ExtPlayerID,
			action: 'create',
			data: data,
		}).then(() => {
			HTML.ShowToastMsg({
				head: "Idle Game",
				text: HTML.i18nReplacer(i18n('Boxes.idleGame.AlertSetText'), { minutes: minutes, hours: hours }),
				type: 'success',
				hideAfter: 5000
			});
		});
	}
};
