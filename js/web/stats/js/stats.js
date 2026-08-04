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

// Guild Battlegrounds leader board log
FoEproxy.addHandler('GuildBattlegroundService', 'getPlayerLeaderboard', async (data, postData) => {
	Stats.HandlePlayerLeaderboard(data.responseData);
});

FoEproxy.addHandler('GuildBattlegroundStateService', 'getState', async (data, postData) => {
	if (data.responseData['stateId'] !== 'participating') {
		Stats.HandlePlayerLeaderboard(data.responseData['playerLeaderboardEntries']);
	}
});

// Reward log
FoEproxy.addHandler('RewardService', 'collectReward', async (data, postData) => {
	const r = data.responseData;
	if (!Array.isArray(r)) {
		return;
	}
	let [rewards, rewardIncidentSource] = r; // pair, 1st is reward list, second source of incident, e.g spoilsOfWar
	await IndexDB.getDB();

	if (rewardIncidentSource === 'event_pass') {
		if (postData[0].requestData[0].indexOf('guild_raids') >= 0) rewardIncidentSource = 'guild_raids';
	}

	for (const reward of rewards) {
		if (rewardIncidentSource === 'hidden_reward') {
			// split flying island incidents from Ad-chests
			if (ActiveMap === 'cultural_outpost') {
				rewardIncidentSource = 'shards';
			}
		}
		if (rewardIncidentSource === 'living_city') {
			rewardIncidentSource = 'hidden_reward';
		}

		if (rewardIncidentSource === 'default') {
			// ignore league rewards, fragment assembly and quest rewards
			if (postData[0].requestMethod === 'useItem' || postData[0].requestMethod === 'advanceQuest') {
				continue;
			}
		}

		await Stats.saveRewardType(reward);
		await Stats.addReward(rewardIncidentSource, reward.amount || 0, reward.id);
	}
});

FoEproxy.addHandler('RewardService', 'collectRewardSet', async (data, postData) => {
	let rewardIncidentSource = data.responseData.context;

	// QI-Pass detection
	if (rewardIncidentSource !== 'guild_raids' && rewardIncidentSource.indexOf('guild_raids') >= 0) rewardIncidentSource = 'guild_raidsP';
	// exclude main city "collect all" / "aid all"
	if (rewardIncidentSource.indexOf('event') < 0 && !['guild_raids', 'guild_raidsP'].includes(rewardIncidentSource)) return;

	const rewards = data.responseData.reward.rewards;
	await IndexDB.getDB();

	for (let reward of rewards) {
		// QI reward splitting: a collected stack may be n identical rewards
		let n = 1;
		if (rewardIncidentSource === 'guild_raids') {
			let ref = null;
			for (ref of (Stats.QI.RewardLookUp?.[Stats.QI.currentNode]?.[reward.type + '#' + reward.subType] || [])) {
				n = reward.amount / ref.amount;
				if (n !== Math.floor(n)) {
					n = 1;
				} else {
					break;
				}
			}
			if (n !== 1) reward = ref;
		}

		await Stats.saveRewardType(reward);

		for (let i = 0; i < n; i++) {
			const ris = rewardIncidentSource === 'guild_raidsP' ? 'guild_raids' : rewardIncidentSource;
			await Stats.addReward(ris, reward.amount || 0, reward.id);
		}
	}
});

// reward split for QI
FoEproxy.addHandler('GuildRaidsMapService', 'getNodeExtendedInfo', async (data, postData) => {
	const rewards = data.responseData?.reward?.reward?.possible_rewards;
	const nodeId = postData?.[0]?.requestData?.[0];

	if (!nodeId) return;

	Stats.QI.RewardLookUp[nodeId] = {};

	if (!rewards) return;

	const register = (reward) => {
		const key = reward.type + '#' + reward.subType;
		if (!Stats.QI.RewardLookUp[nodeId][key]) Stats.QI.RewardLookUp[nodeId][key] = [];
		Stats.QI.RewardLookUp[nodeId][key].push(reward);
	};

	for (const r of rewards) {
		if (r.reward.type === 'chest') {
			r.reward.possible_rewards.forEach(c => register(c.reward));
		} else {
			register(r.reward);
		}
	}
});

FoEproxy.addHandler('GuildRaidsMapService', 'getOverview', async (data, postData) => {
	Stats.QI.currentNode = data.responseData.currentNode;
});

FoEproxy.addHandler('GuildRaidsMapService', 'move', async (data, postData) => {
	Stats.QI.currentNode = postData[0].requestData[0].pop();
});

// Player treasure log
FoEproxy.addHandler('ResourceService', 'getPlayerResources', async (data, postData) => {
	const r = data.responseData;
	if (!r.resources) {
		return;
	}

	await Stats.saveSnapshots('statsTreasurePlayerD', 'statsTreasurePlayerH', { resources: r.resources });
	StockAlarm.checkResources();
});

FoEproxy.addHandler('ResourceService', 'getPlayerResourceBag', async (data, postData) => {
	if (data.responseData?.type?.value && data.responseData?.type?.value !== 'PlayerMain') return; // for now ignore all other source types
	const r = data.responseData?.resources?.resources || data.responseData?.resources;
	if (!r) return;

	await Stats.saveSnapshots('statsTreasurePlayerD', 'statsTreasurePlayerH', { resources: r });
	StockAlarm.checkResources();
});

// Clan Treasure log
FoEproxy.addHandler('ClanService', 'getTreasury', async (data, postData) => {
	const r = data.responseData;
	if (!r.resources) {
		return;
	}

	await Stats.saveSnapshots('statsTreasureClanD', 'statsTreasureClanH', { clanId: ExtGuildID, resources: r.resources });
	StockAlarm.checkTreasury();
});

FoEproxy.addHandler('ClanService', 'getTreasuryBag', async (data, postData) => {
	if (data.responseData?.type?.value && data.responseData?.type?.value !== 'ClanMain') return; // for now ignore all other source types
	const r = data.responseData?.resources?.resources || data.responseData?.resources;
	if (!r) return;

	await Stats.saveSnapshots('statsTreasureClanD', 'statsTreasureClanH', { clanId: ExtGuildID, resources: r });
	StockAlarm.checkTreasury();
});

// Player Army log
FoEproxy.addHandler('ArmyUnitManagementService', 'getArmyInfo', async (data, postData) => {
	if (ActiveMap !== 'main') {
		return;
	}

	// Convert array to hash to be more compact
	const army = data.responseData.counts.reduce((acc, val) => {
		acc[val.unitTypeId] = (val.attached || 0) + (val.unattached || 0);
		return acc;
	}, {});

	await Stats.saveSnapshots('statsUnitsD', 'statsUnitsH', { army });
	StockAlarm.checkArmy();
});


/**
 * Statistics module: tracks resources, treasury, units, GBG leaderboards and
 * rewards in IndexDB and visualizes them with Apache ECharts.
 */
let Stats = {

	isVisitingCulturalOutpost: false,
	goodsSubTypes: [],

	/** era name -> resource ids shown for that era */
	ResMap: {
		NoAge: ['money', 'supplies', 'tavern_silver', 'medals', 'premium', 'guild_raids_medals'],
		special: ['promethium', 'orichalcum', 'mars_ore', 'asteroid_ice', 'venus_carbon', 'unknown_dna', 'crystallized_hydrocarbons', 'dark_matter'],
	},

	QI: {
		RewardLookUp: {},
		stage: '',
		currentNode: ''
	},

	PlayableEras: [],

	// State for UI
	state: {
		source: 'statsTreasurePlayerD', // Source of data - indexdb table name
		chartType: 'line', // chart type
		eras: {}, // Selected era for filtering data
		eraSelectOpen: false, // Dropdown
		isGroupByEra: false,
		isRenormalize: false,
		rewardSource: 'battlegrounds_conquest', // filter by type of reward
		currentType: null,
		filter: ''
	},

	DatePickerObj: null,
	DatePickerFrom: null,
	DatePickerTo: null,

	playerSources: ['statsTreasurePlayerH', 'statsTreasurePlayerD'],
	treasureSources: ['statsTreasureClanH', 'statsTreasureClanD'],
	unitSources: ['statsUnitsH', 'statsUnitsD'],
	rewardSources: ['statsRewards'],
	gbgSources: ['statsGBGPlayers'],

	isSelectedPlayerSources: () => Stats.playerSources.includes(Stats.state.source),
	isSelectedTreasureSources: () => Stats.treasureSources.includes(Stats.state.source),
	isSelectedUnitSources: () => Stats.unitSources.includes(Stats.state.source),
	isSelectedRewardSources: () => Stats.rewardSources.includes(Stats.state.source),
	isSelectedGBGSources: () => Stats.gbgSources.includes(Stats.state.source),

	/** series color palette (dark background friendly) */
	ChartColors: ['#f2c14e', '#61a0ff', '#5fd068', '#ef5350', '#4dd0e1', '#f06292', '#ba68c8', '#ffa726', '#26a69a', '#9ccc65', '#7986cb', '#d4e157'],

	/** currently rendered chart data, used for the data table and CSV export */
	ChartData: null,

	ChartInstance: null,
	_chartLibPromise: null,
	_chartResizeObserver: null,
	_tooltipMeta: null,


	/**
	 * Initializes ResMap and PlayableEras once the game meta data is available.
	 */
	Init: () => {
		for (let Era = Technologies.Eras.BronzeAge; Era < Technologies.Eras.NextEra; Era++) {
			const EraName = Technologies.EraNames[Era];
			if (!EraName) continue;

			if (GoodsList.length < 5 * (Era - 1)) break; // Era does not exist yet

			Stats.PlayableEras.push(EraName);
			Stats.ResMap[EraName] = [];

			for (let i = 0; i < 5; i++) {
				if (GoodsList[(Era - 2) * 5 + i]) {
					const g = GoodsList[(Era - 2) * 5 + i].id;
					Stats.ResMap[EraName].push(g);
					Stats.goodsSubTypes.push(g);
				}
			}
		}
	},


	/**
	 * Stores a snapshot in the daily and hourly IndexDB table.
	 *
	 * @param {string} dailyTable name of the daily table
	 * @param {string} hourlyTable name of the hourly table
	 * @param {Object} payload record content (without date)
	 * @returns {Promise<void>}
	 */
	saveSnapshots: async (dailyTable, hourlyTable, payload) => {
		await IndexDB.getDB();

		await IndexDB.db[dailyTable].put({ date: moment().startOf('day').toDate(), ...payload });
		await IndexDB.db[hourlyTable].put({ date: moment().startOf('hour').toDate(), ...payload });
	},


	/**
	 * Stores the (reduced) reward meta data once per reward id.
	 *
	 * @param {Object} reward reward info from the game response
	 * @returns {Promise<void>}
	 */
	saveRewardType: async (reward) => {
		if (await IndexDB.db.statsRewardTypes.get(reward.id)) return;

		// Reduce amount of saved data
		if (reward.unit) {
			delete reward.unit;
		}
		delete reward.__class__;
		await IndexDB.db.statsRewardTypes.put(reward);
	},


	/**
	 * Shows the statistics box.
	 */
	Show: (event) => {
		if ($('#stats').length === 0) {
			HTML.Box({
				id: 'stats',
				title: i18n('Boxes.Stats.Title'),
				ask: i18n('Boxes.Stats.HelpLink'),
				auto_close: true,
				dragdrop: true,
				popout: () => MainParser.PopOut('stats', 1100, 600),
				minimize: true
			});

			HTML.AddCssFile('stats');
			HTML.AddCssFile('unit');
		}
		else if (!event) {
			HTML.CloseOpenBox('stats');
			return;
		}

		// If no era is selected, preselect the players current (and previous) era
		if (!Object.keys(Stats.state.eras).length) {
			Stats.state.eras = {
				[Technologies.EraNames[CurrentEraID]]: true,
			};
			if (CurrentEraID > 2) {
				Stats.state.eras[Technologies.EraNames[CurrentEraID - 1]] = true;
			}
		}

		Stats.Render();

		// Click action handlers
		$('#statsBody').off('click.stats').on('click.stats', '[data-type]', function () {
			const type = $(this).data('type');
			const value = $(this).data('value');

			switch (type) {

				case 'toggleEra':
					Stats.state.eras[value] = !Stats.state.eras[value];
					break;

				case 'eraSelectOpen':
					Stats.state.eraSelectOpen = !Stats.state.eraSelectOpen;
					if (!value) {
						return;
					}
					break;

				case 'selectEras': {
					Stats.state.eras = {};
					const values = (value || '').split(',');
					values.forEach(it => Stats.state.eras[it] = true);
					break;
				}

				case 'groupByToggle':
					Stats.state.isGroupByEra = !Stats.state.isGroupByEra;
					break;

				case 'renormalizeToggle':
					Stats.state.isRenormalize = !Stats.state.isRenormalize;
					break;

				case 'selectSource': {
					const isChangedToUnit = Stats.unitSources.includes(value) && !Stats.isSelectedUnitSources();
					const isChangedToPlayerSource = Stats.playerSources.includes(value) && !Stats.isSelectedPlayerSources();
					const isChangedToClanTreasure = Stats.treasureSources.includes(value) && !Stats.isSelectedTreasureSources();
					const isChangedToReward = Stats.rewardSources.includes(value) && !Stats.isSelectedRewardSources();
					const isChangedToGBG = Stats.gbgSources.includes(value) && !Stats.isSelectedGBGSources();

					if (isChangedToUnit) {
						// if changed to units then select all eras by default
						Stats.state.eras = {};
						Object.keys(Stats.ResMap).forEach(it => Stats.state.eras[it] = true);

					} else if (isChangedToPlayerSource) {
						// if changed to player's treasure select the 2 last eras
						Stats.state.eras = {
							[Technologies.EraNames[CurrentEraID]]: true,
						};
						if (CurrentEraID > 2) {
							Stats.state.eras[Technologies.EraNames[CurrentEraID - 1]] = true;
						}

					} else if (isChangedToClanTreasure) {
						// if changed to treasury select all playable eras
						Stats.state.eras = {};
						Stats.PlayableEras.forEach(era => Stats.state.eras[era] = true);

					} else if (isChangedToGBG) {
						Stats.state.chartType = 'delta';

					} else if (isChangedToReward) {
						Stats.state.rewardSource = 'battlegrounds_conquest';
					}

					Stats.state.source = value || 'statsTreasurePlayerD';
					break;
				}

				case 'setChartType':
					Stats.state.chartType = value;
					break;

				case 'setRewardSource':
					Stats.state.rewardSource = value;
					break;

				default:
					return;
			}

			Stats.updateOptions();
			Stats.updateCharts();
		});
	},


	/**
	 * Renders the box content.
	 *
	 * @returns {Promise<void>}
	 */
	Render: async () => {
		$('#statsBody').html(`<div class="options">${Stats.RenderOptions()}</div><div class="options-2"></div><div id="statsChart">Loading...</div>`);

		Stats.updateOptions();
		await Stats.loadChartLib();
		await Stats.updateCharts();
	},


	/**
	 * Re-renders the option bar and (re)creates the date picker.
	 */
	updateOptions: () => {
		$('#statsBody .options').html(Stats.RenderOptions());

		$('#statsBody').promise().done(function () {
			if ($('#StatsDatePicker').length > 0) {
				$('#StatsDatePicker').text(`${Stats.formatRange()}`);

				Stats.DatePickerObj = new Litepicker({
					element: document.getElementById('StatsDatePicker'),
					format: i18n('Date'),
					lang: MainParser.Language,
					singleMode: false,
					maxDate: MainParser.getCurrentDateTime(),
					showWeekNumbers: true,
					endDate: Stats.DatePickerTo,
					startDate: Stats.DatePickerFrom,
					resetButton: true,
					onSelect: async function (start, end) {
						const now = MainParser.getCurrentDate();

						if (end.getDate() === now.getDate() && end.getMonth() === now.getMonth() && end.getYear() === now.getYear()) {
							// end is today: use "now"
							end = MainParser.getCurrentDateTime();
						}
						else {
							// otherwise take the end of the day
							end.setHours(23, 59, 59, 999);
						}

						Stats.DatePickerFrom = start;
						Stats.DatePickerTo = end;

						$('#StatsDatePicker').text(`${Stats.formatRange()}`);

						return await Stats.updateCharts();
					},
				});
			}
			else {
				Stats.DatePickerObj = null;
			}
		});
	},


	/**
	 * Deep-compares two values via JSON.
	 *
	 * @param x
	 * @param y
	 * @returns {boolean}
	 */
	equals: (x, y) => JSON.stringify(x) === JSON.stringify(y),


	/**
	 * Renders the main option bar.
	 *
	 * @returns {string}
	 */
	RenderOptions: () => {
		const selectedEras = Stats.getSelectedEras().sort();
		const noEraSources = !Stats.isSelectedPlayerSources() && !Stats.isSelectedTreasureSources() && !Stats.isSelectedUnitSources();

		const btnSelectNoEra = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnNoEra'),
			isActive: selectedEras.length === 1 && selectedEras[0] === 'NoAge',
			dataType: 'selectEras',
			disabled: noEraSources,
			value: 'NoAge',
		});

		const btnSelectMyEra = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnMyEra'),
			isActive: selectedEras.length === 1 && selectedEras[0] === Technologies.EraNames[CurrentEraID],
			dataType: 'selectEras',
			disabled: noEraSources,
			value: Technologies.EraNames[CurrentEraID]
		});

		const btnSelectNextEra = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnNextEra'),
			isActive: selectedEras.length === 1 && selectedEras[0] === Technologies.EraNames[CurrentEraID + 1],
			dataType: 'selectEras',
			disabled: noEraSources,
			value: Technologies.EraNames[CurrentEraID + 1]
		});

		const btnSelectAll = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnAll'),
			title: i18n('Boxes.Stats.BtnAllTittle'),
			isActive: Object.keys(Stats.ResMap).length === selectedEras.length,
			dataType: 'selectEras',
			disabled: noEraSources,
			value: Object.keys(Stats.ResMap).join(','),
		});

		const btnSelectTwoLastEra = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnLastEras'),
			title: i18n('Boxes.Stats.BtnLastErasTitle'),
			isActive: (selectedEras.length === 2 &&
				selectedEras.includes(Technologies.EraNames[CurrentEraID]) &&
				selectedEras.includes(Technologies.EraNames[CurrentEraID - 1])),
			disabled: noEraSources,
			dataType: 'selectEras',
			value: Technologies.EraNames[CurrentEraID] + ',' + Technologies.EraNames[CurrentEraID - 1]
		});

		const btnSelectAllEra = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnAllPlayableEras'),
			title: i18n('Boxes.Stats.BtnAllPlayableErasTitle'),
			isActive: Stats.equals(selectedEras, Stats.PlayableEras.slice().sort()),
			dataType: 'selectEras',
			disabled: noEraSources,
			value: Stats.PlayableEras.join(',')
		});

		const btnGroupByEra = Stats.RenderBox({
			name: i18n('Boxes.Stats.BtnToggleGroupBy'),
			title: i18n('Boxes.Stats.BtnToggleGroupByTitle'),
			disabled: !Stats.isSelectedPlayerSources() && !Stats.isSelectedTreasureSources(),
			isActive: Stats.state.isGroupByEra,
			dataType: 'groupByToggle',
		});

		const btnGroupRenormalize = Stats.RenderBox({
			name: i18n('Boxes.Stats.BtnToggleRenormalize'),
			title: i18n('Boxes.Stats.BtnToggleRenormalizeTitle'),
			disabled: !Stats.isSelectedPlayerSources() && !Stats.isSelectedTreasureSources(),
			isActive: Stats.state.isRenormalize,
			dataType: 'renormalizeToggle',
		});

		const sourceBtns = [
			'statsTreasurePlayerD',
			'statsTreasureClanD',
			'statsUnitsD',
			'statsGBGPlayers',
			'statsRewards'
		].map(source => Stats.RenderTab({
			name: i18n('Boxes.Stats.BtnSource.' + source),
			title: i18n('Boxes.Stats.SourceTitle.' + source),
			isActive: Stats.state.source === source,
			dataType: 'selectSource',
			value: source
		}));

		const chartTypes = ['line', 'streamgraph', 'delta'].map(it => Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnChartType.' + it),
			title: i18n('Boxes.Stats.BtnChartTypeTitle.' + it),
			isActive: Stats.state.chartType === it,
			dataType: 'setChartType',
			disabled: noEraSources && !Stats.isSelectedGBGSources(),
			value: it
		}));

		let moreOptions;

		if (Stats.isSelectedRewardSources()) {
			const btnsRewardSelect = [
				'hidden_reward', // incidents
				'__event', // event rewards
				'battlegrounds_conquest', // Battlegrounds
				'guildExpedition', // Temple of Relics
				'guild_raids', // Quantum Incursion
				'pvp_arena', // PvP Arena
				'spoilsOfWar', // Himeji Castle
				'diplomaticGifts', // Space Carrier
				'shards', // Flying Island
			].map(it => Stats.RenderTab({
				name: i18n('Boxes.Stats.Rewards.Source.' + it),
				title: i18n('Boxes.Stats.Rewards.SourceTitle.' + it),
				isActive: Stats.state.rewardSource === it,
				dataType: 'setRewardSource',
				value: it,
			}));

			moreOptions = `<div class="tabs option-2-reward-source">
								<ul class="horizontal">
									${btnsRewardSelect.join('')}
								</ul>
							</div>
							<div class="StatsRewardFilter">
								<input type="text" id="StatsRewardFilter" placeholder="${i18n('Boxes.Stats.FilterRewards')}" value="${Stats.state.filter}" oninput="Stats.state.filter=this.value;Stats.updateCharts();">
							</div>`;
		}
		else {
			moreOptions = `<div class="option-era-dropdown">
					${Stats.RenderEraSwitchers()}
				</div>
				<div class="option-era-wrap text-center">
					<strong>${i18n('Boxes.Stats.Era')}:</strong> ${btnGroupByEra}<br>
					<span class="btn-group">
					${btnSelectAllEra}
					${btnSelectMyEra}
					${Technologies.EraNames[CurrentEraID + 1] ? btnSelectNextEra : ''}
					${CurrentEraID > 2 ? btnSelectTwoLastEra : ''}
					${btnSelectAll}
					${btnSelectNoEra}
					</span>
				</div>
				<div class="option-chart-type-wrap text-center">
					${btnGroupRenormalize}<br>
					<span class="btn-group">
					${chartTypes.join('')}
					</span>
				</div>`;
		}

		return `<div class="tabs">
					<ul class="horizontal">
					${sourceBtns.join('')}
					</ul>
				</div>`
				+ moreOptions +
				`<div class="datepicker"><button class="btn" id="StatsDatePicker">${Stats.formatRange()}</button></div>`;
	},


	/**
	 * Formats the selected date range for the date picker button.
	 *
	 * @returns {string}
	 */
	formatRange: () => {
		if (Stats.DatePickerFrom == null && Stats.DatePickerTo == null) {
			return i18n('Boxes.Stats.DatePicker');
		}

		const dateStart = moment(Stats.DatePickerFrom);
		const dateEnd = moment(Stats.DatePickerTo);

		if (dateStart.isSame(dateEnd)) {
			return dateStart.format(i18n('Date'));
		}
		if (dateStart.year() !== dateEnd.year()) {
			return dateStart.format(i18n('Date')) + ' - ' + dateEnd.format(i18n('Date'));
		}
		return dateStart.format(i18n('DateShort')) + ' - ' + dateEnd.format(i18n('Date'));
	},


	/**
	 * Renders the era dropdown.
	 *
	 * @returns {string}
	 */
	RenderEraSwitchers: () => {
		const ages = ['NoAge'].concat(Stats.PlayableEras);
		const selectedErasI18n = Stats.getSelectedEras().map(era => Technologies.Eras.hasOwnProperty(era) ? i18n('Eras.' + Technologies.Eras[era]) : era).join(',');

		return `<div class="dropdown">
					<input type="checkbox" class="dropdown-checkbox" id="toggle-era-dropdown" data-type="eraSelectOpen" data-value="${Stats.state.eraSelectOpen ? 0 : 1}" ${Stats.state.eraSelectOpen ? ' checked' : ''}>
					<label class="dropdown-label game-cursor" for="toggle-era-dropdown" title="${selectedErasI18n}">
						${selectedErasI18n || 'Select Era'}
					</label>
					<span class="arrow"></span>
					<ul>
						${Stats.RenderCheckbox({
							name: 'Special', // TODO I18n
							dataType: 'toggleEra',
							value: 'special',
							isActive: !!Stats.state.eras.special
						})}
						${ages.map(it => Stats.RenderCheckbox({
							name: i18n('Eras.' + Technologies.Eras[it]),
							dataType: 'toggleEra',
							value: it,
							isActive: !!Stats.state.eras[it]
						})).join('')}
					</ul>
				</div>`;
	},


	/**
	 * Renders a checkbox list item.
	 *
	 * @param name
	 * @param isActive
	 * @param dataType
	 * @param value
	 * @returns {string}
	 */
	RenderCheckbox: ({ name, isActive, dataType, value }) => `<li>
		<label class="game-cursor">
			<input type="checkbox" data-type="${dataType}" data-value="${value}" class="filter-msg game-cursor" ${isActive ? 'checked' : ''}>${name}</label>
		</li>`,


	/**
	 * Renders a checkbox (without list).
	 *
	 * @param name
	 * @param isActive
	 * @param disabled
	 * @param dataType
	 * @param value
	 * @returns {string}
	 */
	RenderBox: ({ name, isActive, disabled, dataType, value }) => `<label class="game-cursor${disabled ? ' hidden' : ''}">
			<input type="checkbox" data-type="${dataType}" data-value="${value}" class="filter-msg game-cursor" ${isActive ? 'checked' : ''}>${name}</label>`,


	/**
	 * Renders a button.
	 *
	 * @param name		Name
	 * @param isActive	Activated
	 * @param dataType	Type
	 * @param value		Default Value
	 * @param title		Title for button
	 * @param disabled	Disabled button
	 * @returns {string}
	 */
	RenderButton: ({ name, isActive, dataType, value, title, disabled }) => `<button ${disabled ? 'disabled' : ''} class="btn btn-slim${!disabled && isActive ? ' btn-active' : ''} ${dataType}" data-type="${dataType}" data-value="${value}" title="${(title || '').replace(/"/g, '&quot;')}"><span>${name}</span></button>`,


	/**
	 * Renders a tab.
	 *
	 * @param name		Name
	 * @param isActive	Activated
	 * @param dataType	Type
	 * @param value		Default Value
	 * @param title		Title for button
	 * @param disabled	Disabled button
	 * @returns {string}
	 */
	RenderTab: ({ name, isActive, dataType, value, title, disabled }) => `<li ${disabled ? 'disabled' : ''} class="${value} ${!disabled && isActive ? 'active' : ''}" data-type="${dataType}" data-value="${value}" title="${(title || '').replace(/"/g, '&quot;')}"><a><span>&nbsp;</span></a></li>`,


	/**
	 * Updates the chart for the current source selection.
	 *
	 * @returns {Promise<void>}
	 */
	updateCharts: async () => {
		if (Stats.isSelectedGBGSources()) {
			return Stats.updateCommonChart(Stats.applyDeltaToSeriesIfNeed(await Stats.createGBGSeries()));
		}

		if (Stats.isSelectedUnitSources()) {
			return Stats.updateCommonChart(Stats.applyDeltaToSeriesIfNeed(await Stats.createUnitsSeries()));
		}

		if (Stats.isSelectedTreasureSources()) {
			const source = Stats.state.isGroupByEra
				? await Stats.createEraGroupSeries('statsTreasureClanD', 'statsTreasureClanH')
				: await Stats.createResourceSeries('statsTreasureClanD', 'statsTreasureClanH');
			return Stats.updateCommonChart(Stats.applyDeltaToSeriesIfNeed(source));
		}

		if (Stats.isSelectedPlayerSources()) {
			const source = Stats.state.isGroupByEra
				? await Stats.createEraGroupSeries('statsTreasurePlayerD', 'statsTreasurePlayerH')
				: await Stats.createResourceSeries('statsTreasurePlayerD', 'statsTreasurePlayerH');
			return Stats.updateCommonChart(Stats.applyDeltaToSeriesIfNeed(source));
		}

		if (Stats.isSelectedRewardSources()) {
			return Stats.updateRewardCharts(await Stats.createRewardSeries());
		}
	},


	/**
	 * Loads the rows of a stats table for the selected date range.
	 * Falls back to the hourly table for ranges up to 7 days.
	 *
	 * @param {string} dailyTable name of the daily table
	 * @param {string|null} hourlyTable name of the hourly table (optional)
	 * @returns {Promise<Object[]>}
	 */
	fetchRange: async (dailyTable, hourlyTable = null) => {
		if (Stats.DatePickerFrom !== null && Stats.DatePickerTo !== null) {
			const days = (Stats.DatePickerTo - Stats.DatePickerFrom) / 86400000;
			const table = (hourlyTable && days <= 7) ? hourlyTable : dailyTable;

			return IndexDB.db[table].where('date').between(Stats.DatePickerFrom, Stats.DatePickerTo).sortBy('date');
		}

		return IndexDB.db[dailyTable].orderBy('date').toArray();
	},


	/**
	 * Guild Battlegrounds leaderboard series.
	 *
	 * @returns {Promise<{series: Object[]}>}
	 */
	createGBGSeries: async () => {
		const data = await Stats.fetchRange('statsGBGPlayers');
		const playerCache = await IndexDB.db.statsGBGPlayerCache.toArray();

		const playerKV = playerCache.reduce((acc, it) => {
			acc[it.id] = it;
			return acc;
		}, {});

		const knownIds = Object.keys(data.reduce((acc, row) => {
			Object.keys(row.players).forEach(it => acc[it] = true);
			return acc;
		}, {}));

		const series = knownIds.map(playerId => {
			const playerInfo = playerKV[playerId] || { name: '' + playerId };

			return {
				name: playerInfo.name,
				image: srcLinks.GetPortrait(playerInfo.avatar),
				data: data.map(({ date, players }) => {
					const player = players[playerId];
					const score = player ? (2 * (player.n || 0) + (player.b || 0)) : null;
					return [+date, score];
				})
			};
		});

		return { series };
	},


	/**
	 * Army unit series.
	 *
	 * @returns {Promise<{series: Object[]}>}
	 */
	createUnitsSeries: async () => {
		const data = await Stats.fetchRange('statsUnitsD', 'statsUnitsH');

		const unitsTypes = data.reduce((acc, it) => {
			Object.keys(it.army).forEach(unitId => acc[unitId] = true);
			return acc;
		}, {});

		const selectedEras = Stats.getSelectedEras();

		const filteredUnitIds = Object.keys(unitsTypes).filter(unitId => {
			const unitInfo = Unit.Types.find(it => it.unitTypeId == unitId);
			return selectedEras.includes(unitInfo && unitInfo.minEra);
		});

		const series = filteredUnitIds.map(unitId => {
			const unitInfo = Unit.Types.find(it => it.unitTypeId == unitId) || { minEra: '' };
			const era = unitInfo.minEra;

			return {
				name: unitInfo.name,
				era: era ? i18n('Eras.' + Technologies.Eras[era]) : '',
				image: srcLinks.get('/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_' + unitId + '.jpg', true),
				data: data.map(({ date, army }) => [+date, army[unitId] || 0])
			};
		});

		return { series };
	},


	/**
	 * Treasury/resource series grouped by era (one series per era).
	 *
	 * @param {string} dailyTable name of the daily table
	 * @param {string} hourlyTable name of the hourly table
	 * @returns {Promise<{series: Object[]}>}
	 */
	createEraGroupSeries: async (dailyTable, hourlyTable) => {
		const data = await Stats.fetchRange(dailyTable, hourlyTable);

		const series = Stats.getSelectedEras().map(era => ({
			name: i18n('Eras.' + Technologies.Eras[era]),
			data: data.map(({ date, resources }) => [
				+date,
				Stats.ResMap[era].reduce((acc, resName) => acc + (resources[resName] || 0), 0)
			]),
		}));

		return { series };
	},


	/**
	 * Treasury/resource series (one series per resource).
	 *
	 * @param {string} dailyTable name of the daily table
	 * @param {string} hourlyTable name of the hourly table
	 * @returns {Promise<{series: Object[], colors: string[]|null}>}
	 */
	createResourceSeries: async (dailyTable, hourlyTable) => {
		const selectedEras = Stats.getSelectedEras();
		const data = await Stats.fetchRange(dailyTable, hourlyTable);

		const selectedResources = selectedEras
			.map(it => Stats.ResMap[it])
			.flat();

		const series = selectedResources.map(it => {
			const goodsData = (GoodsData[it] || { name: it });

			return {
				era: goodsData.era ? i18n('Eras.' + Technologies.Eras[goodsData.era]) : '',
				spriteClass: `goods-sprite sprite-50 ${it}`,
				name: goodsData.name,
				data: data.map(({ date, resources }) => [+date, resources[it] || 0]),
			};
		});

		return {
			series,
			colors: Stats.eraShadedColors(selectedEras)
		};
	},


	/**
	 * Builds a color list where all resources of one era share a base color
	 * with slightly increasing brightness.
	 *
	 * @param {string[]} selectedEras
	 * @returns {string[]|null} color list or null to use the default palette
	 */
	eraShadedColors: (selectedEras) => {
		if (selectedEras.length <= 1) return null;

		const colors = [];
		selectedEras.forEach((era, eraIndex) => {
			const base = Stats.ChartColors[eraIndex % Stats.ChartColors.length];
			Stats.ResMap[era].forEach((resource, index) => {
				colors.push(Stats.shadeColor(base, index * 0.06));
			});
		});

		return colors;
	},


	/**
	 * Lightens a hex color towards white.
	 *
	 * @param {string} hex color like '#aabbcc'
	 * @param {number} amount 0 (unchanged) .. 1 (white)
	 * @returns {string} rgb() color
	 */
	shadeColor: (hex, amount) => {
		const num = parseInt(hex.slice(1), 16);
		const channel = (shift) => Math.min(255, Math.round(((num >> shift) & 0xff) * (1 - amount) + 255 * amount));

		return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`;
	},


	/**
	 * Calculates the diff between the points as 'y' for the delta view or
	 * renormalizes all series to their own maximum.
	 *
	 * @param series
	 * @param args
	 * @returns {{series: Object[], chartType: string}}
	 */
	applyDeltaToSeriesIfNeed: ({ series, ...args }) => {
		let chartType = Stats.state.chartType || 'line';
		const isNegativeValuesAllowed = !Stats.isSelectedGBGSources();

		if (chartType === 'delta') {
			chartType = 'column';
			series = series.map(s => {
				if (isNegativeValuesAllowed) {
					s.data = s.data.map((it, index, array) => [it[0], index > 0 ? ((it[1] || 0) - (array[index - 1][1] || 0)) : 0]);
				} else {
					s.data = s.data.map((it, index, array) => [it[0], index > 0 ? Math.max(0, ((it[1] || 0) - (array[index - 1][1] || 0))) : 0]);
				}
				s.data = s.data.filter(it => it[1] !== 0);
				return s;
			});
			series = series.filter(s => (s.data?.length || 0) > 0);
		} else if (Stats.state.isRenormalize) {
			series = series.map(s => {
				const max = Math.max(...s.data.map(x => x[1]));
				s.data = s.data.map(it => [it[0], max === 0 ? 1 : it[1] / max]);
				return s;
			});
		}

		return {
			...args,
			series,
			chartType
		};
	},


	/**
	 * Formats a number for tooltips and tables.
	 *
	 * @param {number|null} v
	 * @returns {string}
	 */
	formatNumber: (v) => {
		if (v == null) return '–';
		return Number(v).toLocaleString(undefined, { maximumFractionDigits: Math.abs(v) < 10 ? 2 : 0 });
	},


	/**
	 * Shared tooltip for the time based charts. Shows an icon per series
	 * (avatar, unit or goods sprite), sorted by value.
	 *
	 * @param params ECharts tooltip params
	 * @returns {string}
	 */
	timeTooltipFormatter: (params) => {
		if (!Array.isArray(params)) params = [params];

		const rows = params
			.map(p => {
				// themeRiver data: [date, value, name], line/bar data: [date, value]
				const isRiver = p.seriesType === 'themeRiver';
				const name = isRiver ? p.data[2] : p.seriesName;
				const value = isRiver ? p.data[1] : (Array.isArray(p.value) ? p.value[1] : p.value);
				return { marker: p.marker, name, value };
			})
			.filter(r => r.value != null)
			.sort((a, b) => b.value - a.value);

		const date = params[0]?.axisValue ?? params[0]?.data?.[0];
		let html = `<small>${moment(date).format(i18n('Date') + ' HH:mm')}</small><table>`;

		const maxRows = 15;
		rows.slice(0, maxRows).forEach(r => {
			const meta = Stats._tooltipMeta?.get(r.name) || {};
			let icon = '';
			if (meta.image) icon = `<img src="${meta.image}" style="width:28px;height:28px;vertical-align:middle;border:1px solid #606063;">`;
			if (meta.spriteClass) icon = `<span class="${meta.spriteClass}"></span>`;
			const era = meta.era ? ` <small style="opacity:0.65">${meta.era}</small>` : '';

			html += `<tr>
						<td>${icon}</td>
						<td style="padding:0 8px 0 4px;">${r.marker} ${r.name}${era}</td>
						<td style="text-align:right;"><b>${Stats.formatNumber(r.value)}</b></td>
					</tr>`;
		});
		html += '</table>';

		if (rows.length > maxRows) {
			html += `<small>+ ${rows.length - maxRows}</small>`;
		}

		return html;
	},


	/**
	 * Returns the ECharts instance for the stats box (creates it if needed)
	 * and keeps it resized to its container.
	 *
	 * @returns {Object|null} ECharts instance
	 */
	getChart: () => {
		const container = document.getElementById('statsChart');
		if (!container) return null;

		let chart = echarts.getInstanceByDom(container);
		if (!chart) {
			if (Stats.ChartInstance) {
				Stats.ChartInstance.dispose();
			}
			Stats._chartResizeObserver?.disconnect();

			container.textContent = '';
			chart = echarts.init(container, 'foe');
			Stats.ChartInstance = chart;

			Stats._chartResizeObserver = new ResizeObserver(() => chart.resize());
			Stats._chartResizeObserver.observe(container);
		}

		return chart;
	},


	/**
	 * Toolbox with PNG export, data table and CSV download.
	 *
	 * @returns {Object} ECharts toolbox option
	 */
	chartToolbox: () => ({
		right: 8,
		top: 2,
		itemGap: 10,
		feature: {
			saveAsImage: {
				title: 'PNG',
				name: 'foe-helper-stats',
				backgroundColor: '#2a2a2b'
			},
			dataView: {
				title: 'Data',
				readOnly: true,
				lang: ['', 'x', ''],
				backgroundColor: '#2a2a2b',
				textareaColor: '#2a2a2b',
				textColor: '#e0e0e3',
				buttonColor: '#4d5a6b',
				optionToContent: () => Stats.renderDataTable()
			},
			myCsv: {
				show: true,
				title: 'CSV',
				icon: 'path://M11,3 L13,3 L13,11 L16,11 L12,16 L8,11 L11,11 Z M4,18 L20,18 L20,20 L4,20 Z',
				onclick: () => Stats.downloadCSV()
			}
		}
	}),


	/**
	 * Renders the current chart data as an HTML table (toolbox data view).
	 *
	 * @returns {string}
	 */
	renderDataTable: () => {
		const cd = Stats.ChartData;
		if (!cd) return '';

		const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
		let html = '<div class="chart-data-table"><table class="foe-table">';

		if (cd.type === 'pie') {
			html += '<thead><tr><th></th><th class="text-right">#</th></tr></thead><tbody>';
			cd.series[0].data.forEach(d => {
				html += `<tr><td>${esc(d.name)}</td><td class="text-right">${Stats.formatNumber(d.value)}</td></tr>`;
			});
		}
		else {
			const stamps = [...new Set(cd.series.flatMap(s => s.data.map(d => d[0])))].sort((a, b) => a - b);
			const maps = cd.series.map(s => new Map(s.data));

			html += `<thead><tr><th></th>${cd.series.map(s => `<th class="text-right">${esc(s.name)}</th>`).join('')}</tr></thead><tbody>`;
			stamps.forEach(ts => {
				html += `<tr><td>${moment(ts).format(i18n('Date') + ' HH:mm')}</td>`;
				html += maps.map(m => `<td class="text-right">${Stats.formatNumber(m.get(ts))}</td>`).join('');
				html += '</tr>';
			});
		}

		html += '</tbody></table></div>';
		return html;
	},


	/**
	 * Downloads the current chart data as a CSV file.
	 */
	downloadCSV: () => {
		const cd = Stats.ChartData;
		if (!cd) return;

		const q = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
		const lines = [];

		if (cd.type === 'pie') {
			lines.push(['name', 'count'].map(q).join(';'));
			cd.series[0].data.forEach(d => lines.push([q(d.name), d.value].join(';')));
		}
		else {
			const stamps = [...new Set(cd.series.flatMap(s => s.data.map(d => d[0])))].sort((a, b) => a - b);
			const maps = cd.series.map(s => new Map(s.data));

			lines.push(['date', ...cd.series.map(s => s.name)].map(q).join(';'));
			stamps.forEach(ts => {
				lines.push([q(moment(ts).format('YYYY-MM-DD HH:mm')), ...maps.map(m => m.get(ts) ?? '')].join(';'));
			});
		}

		const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = 'foe-helper-stats.csv';
		a.click();
		URL.revokeObjectURL(a.href);
	},


	/**
	 * Renders the line / streamgraph / delta chart.
	 *
	 * @param series	series with meta data (name, data, image/spriteClass/era)
	 * @param colors	optional color list
	 * @param chartType	'line', 'streamgraph' or 'column'
	 * @returns {Promise<void>}
	 */
	updateCommonChart: async ({ series, colors, chartType }) => {
		await Stats.loadChartLib();
		const chart = Stats.getChart();
		if (!chart) return;

		Stats.ChartData = { type: 'time', series };
		Stats._tooltipMeta = new Map(series.map(s => [s.name, s]));

		const option = {
			color: colors || Stats.ChartColors,
			animation: series.length <= 40,
			title: {
				text: i18n('Boxes.Stats.SourceTitle.' + Stats.state.source),
				left: 'center',
				top: 4
			},
			legend: {
				type: 'scroll',
				top: 28,
				left: 60,
				right: 130,
				data: series.map(s => s.name)
			},
			toolbox: Stats.chartToolbox(),
			tooltip: {
				trigger: 'axis',
				confine: true,
				formatter: Stats.timeTooltipFormatter,
				axisPointer: { type: chartType === 'column' ? 'shadow' : 'line' }
			}
		};

		if (chartType === 'streamgraph') {
			const data = [];
			series.forEach(s => s.data.forEach(([t, v]) => data.push([t, v || 0, s.name])));

			Object.assign(option, {
				singleAxis: { type: 'time', top: 70, bottom: 40 },
				series: [{
					type: 'themeRiver',
					data,
					label: { show: false },
					emphasis: { itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0, 0, 0, 0.6)' } }
				}]
			});
		}
		else {
			const isColumn = chartType === 'column';

			Object.assign(option, {
				grid: { top: 64, left: 70, right: 30, bottom: 66 },
				xAxis: { type: 'time' },
				yAxis: { type: 'value' },
				dataZoom: [
					{ type: 'inside', xAxisIndex: 0 },
					{ type: 'slider', xAxisIndex: 0, height: 20, bottom: 10 }
				],
				series: series.map(s => ({
					name: s.name,
					type: isColumn ? 'bar' : 'line',
					stack: isColumn ? 'total' : undefined,
					large: isColumn,
					data: s.data,
					showSymbol: false,
					smooth: 0.2,
					sampling: isColumn ? undefined : 'lttb',
					emphasis: { focus: 'series' },
					lineStyle: { width: 1.5 }
				}))
			});
		}

		chart.setOption(option, true);
	},


	/**
	 * Creates the reward series for the pie chart.
	 *
	 * @returns {Promise<{series: Object[], title: string}>}
	 */
	createRewardSeries: async () => {
		const { rewardSource } = Stats.state;
		const data = await Stats.fetchRange('statsRewards');
		const rewardTypes = await IndexDB.db.statsRewardTypes.toArray();
		const groupedByRewardSource = {};

		data.forEach(it => {
			let type = it.type;
			if (/event/i.test(type)) {
				type = '__event';
			}
			groupedByRewardSource[type] = groupedByRewardSource[type] || {};
			groupedByRewardSource[type][it.reward] = groupedByRewardSource[type][it.reward] || 0;
			groupedByRewardSource[type][it.reward]++;
		});

		const seriesMapBySource = groupedByRewardSource[rewardSource] || {};

		let serieData = Object.keys(seriesMapBySource).map(it => {
			const rewardInfo = (rewardTypes.find(r => r.id === it) || { name: it });
			const amount = seriesMapBySource[it] || 1;
			let url = '';
			let text = rewardInfo.name;

			if (rewardInfo.type === 'resource' && Stats.goodsSubTypes.includes(rewardInfo.subType)) rewardInfo.type = 'good';

			switch (rewardInfo.type) {
				case 'unit':
					if (rewardInfo.subType === 'rogue') {
						url = srcLinks.get('/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_rogue.jpg', true);
					} else {
						url = srcLinks.get('/shared/gui/pvp_arena/hud/pvp_arena_icon_army.png', true);
						text = rewardInfo.amount + ' ' + (rewardInfo.amount > 1 ? i18n('General.Units') : i18n('General.Unit'));
					}
					break;

				case 'good':
					url = srcLinks.get('/shared/icons/goods/goods.png', true);
					text = rewardInfo.amount + ' ' + (rewardInfo.amount > 1 ? i18n('General.Goods') : i18n('General.Good'));
					break;

				default:
					if (rewardInfo.iconAssetName || rewardInfo.assembledReward?.iconAssetName) {
						const icon = rewardInfo.assembledReward?.iconAssetName || rewardInfo.iconAssetName;
						url = srcLinks.getReward(icon);

						// fix for fragment missing images for buildings
						if (rewardInfo.type === 'good' && rewardInfo.iconAssetName === 'random_goods' && rewardInfo.subType) {
							url = srcLinks.get('/shared/icons/reward_icons/reward_icon_random_goods.png', true);
						}
						if (rewardInfo.subType === 'fragment' && rewardInfo.assembledReward?.type === 'building') {
							url = srcLinks.get(`/city/buildings/${rewardInfo.assembledReward.subType.replace(/^(\w)_/, '$1_SS_')}.png`, true);
						}
					} else if (rewardInfo.type === 'building' && rewardInfo.subType) {
						url = srcLinks.get(`/city/buildings/${rewardInfo.subType.replace(/^(\w)_/, '$1_SS_')}.png`, true);
					}
			}

			return {
				pointImage: url ? `<img src="${url}" style="width: 45px; height: 45px; margin-right: 4px;">` : '',
				name: text,
				y: amount
			};
		});

		// merge entries with identical names (e.g. same reward from different ids)
		let i = 0;
		while (i < serieData.length) {
			const x = serieData.findIndex((it, j) => j > i && it.name === serieData[i].name);
			if (x >= 1) {
				serieData[i].y += serieData[x].y;
				serieData.splice(x, 1);
			} else {
				i += 1;
			}
		}

		serieData = serieData.sort((a, b) => b.y - a.y);

		if (Stats.state.filter !== '') {
			serieData = serieData.filter(a => a.name.toLowerCase().includes(Stats.state.filter.toLowerCase()));
		}

		return {
			title: i18n('Boxes.Stats.Rewards.SourceTitle.' + rewardSource),
			series: [{
				name: rewardSource,
				data: serieData
			}]
		};
	},


	/**
	 * Renders the reward pie chart.
	 *
	 * @param series
	 * @param title
	 */
	updateRewardCharts: async ({ series, title }) => {
		await Stats.loadChartLib();
		const chart = Stats.getChart();
		if (!chart) return;

		const data = series[0].data;
		Stats.ChartData = { type: 'pie', series: [{ name: title, data: data.map(d => ({ name: d.name, value: d.y })) }] };

		chart.setOption({
			color: Stats.ChartColors,
			title: {
				text: title,
				left: 'center',
				top: 4
			},
			toolbox: Stats.chartToolbox(),
			tooltip: {
				trigger: 'item',
				confine: true,
				formatter: (p) => {
					const src = data[p.dataIndex] || {};
					return `${src.pointImage || ''} ${p.name}: <b>${Stats.formatNumber(p.value)} (${p.percent}%)</b>`;
				}
			},
			series: [{
				type: 'pie',
				radius: ['32%', '68%'],
				center: ['50%', '54%'],
				minShowLabelAngle: 0.8,
				itemStyle: { borderColor: '#2a2a2b', borderWidth: 1, borderRadius: 3 },
				label: { color: '#e0e0e3', formatter: '{b}: {c} ({d}%)' },
				labelLine: { lineStyle: { color: '#8a8a8d' } },
				emphasis: { scale: true, scaleSize: 5, label: { fontWeight: 'bold' } },
				data: data.map(d => ({ name: d.name, value: d.y }))
			}]
		}, true);
	},


	/**
	 * Returns the selected eras in ResMap order.
	 *
	 * @returns {string[]}
	 */
	getSelectedEras: () => {
		const selectedEras = Object.keys(Stats.state.eras).filter(it => Stats.state.eras[it]);
		// preserve order of eras, filter again using ResMap keys
		return Object.keys(Stats.ResMap).filter(era => selectedEras.includes(era));
	},


	/**
	 * Loads a script into the page and resolves when it is ready.
	 *
	 * @param {string} src script url
	 * @returns {Promise<void>}
	 */
	promisedLoadCode: (src) => {
		return new Promise(async (resolve, reject) => {
			const sc = document.createElement('script');
			sc.src = src;

			sc.addEventListener('load', function () {
				this.remove();
				resolve();
			});

			sc.addEventListener('error', function () {
				console.error('error loading script ' + src);
				this.remove();
				reject();
			});

			while (!document.head && !document.documentElement) await new Promise((resolve) => {
				// @ts-ignore
				requestIdleCallback(resolve);
			});

			(document.head || document.documentElement).appendChild(sc);
		});
	},


	/**
	 * Loads Apache ECharts once and registers the FoE theme.
	 * Also used by the GexStat module.
	 *
	 * @returns {Promise<void>}
	 */
	loadChartLib: () => {
		if (!Stats._chartLibPromise) {
			Stats._chartLibPromise = (async () => {
				await Stats.promisedLoadCode(extUrl + 'vendor/echarts/echarts.min.js');
				echarts.registerTheme('foe', Stats.chartTheme());
			})();
		}

		return Stats._chartLibPromise;
	},


	/**
	 * Dark theme matching the FoE Helper boxes.
	 *
	 * @returns {Object} ECharts theme
	 */
	chartTheme: () => {
		const axis = {
			axisLine: { lineStyle: { color: '#707073' } },
			axisTick: { lineStyle: { color: '#707073' } },
			axisLabel: { color: '#e0e0e3' },
			splitLine: { lineStyle: { color: '#3a3a3d' } },
			nameTextStyle: { color: '#a0a0a3' }
		};

		return {
			color: Stats.ChartColors,
			backgroundColor: 'transparent',
			textStyle: { color: '#e0e0e3' },
			title: {
				textStyle: { color: '#e0e0e3', fontSize: 15 },
				subtextStyle: { color: '#a0a0a3' }
			},
			legend: {
				textStyle: { color: '#e0e0e3' },
				inactiveColor: '#606063',
				pageTextStyle: { color: '#e0e0e3' },
				pageIconColor: '#e0e0e3',
				pageIconInactiveColor: '#606063'
			},
			tooltip: {
				backgroundColor: 'rgba(20, 20, 22, 0.92)',
				borderColor: '#606063',
				textStyle: { color: '#f0f0f0' }
			},
			toolbox: { iconStyle: { borderColor: '#e0e0e3' } },
			dataZoom: {
				borderColor: '#606063',
				textStyle: { color: '#e0e0e3' },
				brushStyle: { color: 'rgba(224, 224, 227, 0.15)' },
				handleStyle: { color: '#8a8a8d', borderColor: '#e0e0e3' },
				moveHandleStyle: { color: '#8a8a8d' },
				emphasis: {
					handleStyle: { borderColor: '#ffffff' },
					moveHandleStyle: { color: '#a0a0a3' }
				}
			},
			categoryAxis: axis,
			valueAxis: axis,
			timeAxis: axis,
			logAxis: axis
		};
	},


	/**
	 * Stores a Guild Battlegrounds leaderboard snapshot.
	 *
	 * @param r leaderboard entries
	 * @returns {Promise<void>}
	 */
	HandlePlayerLeaderboard: async (r) => {
		if (!Array.isArray(r)) {
			return;
		}

		const players = r.reduce((acc, it) => {
			acc[it.player.player_id] = {
				id: it.player.player_id,
				n: it.negotiationsWon || 0,
				b: it.battlesWon || 0,
				r: it.rank || 1
			};
			return acc;
		}, {});
		const timeNow = MainParser.getCurrentDate();

		await IndexDB.getDB();

		await IndexDB.db.statsGBGPlayers.add({
			date: timeNow,
			players
		});

		const playersForCache = r.map(({ player }) => ({
			id: player.player_id,
			name: player.name,
			avatar: player.avatar,
			date: timeNow
		}));
		await IndexDB.db.statsGBGPlayerCache.bulkPut(playersForCache);
	},


	/**
	 * Stores a single reward incident.
	 *
	 * @param {string} type reward incident source
	 * @param {number} amount
	 * @param {string} reward reward id
	 */
	addReward: async (type, amount, reward) => {
		IndexDB.db.statsRewards.add({
			date: MainParser.getCurrentDate(),
			type: type,
			amount: amount,
			reward: reward
		}).catch(error => {
			if (error.inner.name === 'ConstraintError') {
				// retry if two rewards came in "at the same time"
				setTimeout(() => { Stats.addReward(type, amount, reward); }, 1);
			} else {
				console.log(error);
			}
		});
	}
};


/**
 * Low stock alarms for resources, treasury and units.
 */
let StockAlarm = {

	Alarms: JSON.parse(localStorage.getItem('StockAlarms') || '[]'),
	triggered: [],
	OptionsR: '',
	OptionsT: '',
	OptionsA: '',
	Type: null,
	Repeat: null,


	/**
	 * Checks the army alarms against the two most recent snapshots.
	 */
	checkArmy: async () => {
		await StockAlarm.checkLatest('A', 'statsUnitsH', 'army');
	},


	/**
	 * Checks the resource alarms against the two most recent snapshots.
	 */
	checkResources: async () => {
		await StockAlarm.checkLatest('R', 'statsTreasurePlayerH', 'resources');
	},


	/**
	 * Checks the treasury alarms against the two most recent snapshots.
	 */
	checkTreasury: async () => {
		await StockAlarm.checkLatest('T', 'statsTreasureClanH', 'resources');
	},


	/**
	 * Loads the two most recent snapshots of a table and runs the alarm check.
	 *
	 * @param {string} type alarm type ('R', 'T' or 'A')
	 * @param {string} table hourly stats table
	 * @param {string} field record field holding the values
	 */
	checkLatest: async (type, table, field) => {
		const alarms = StockAlarm.Alarms.filter(data => data.type === type);
		if (alarms.length === 0) return;

		await IndexDB.getDB();
		const rows = await IndexDB.db[table].orderBy('date').reverse().limit(2).toArray();

		const oldX = rows[1]?.[field] || {};
		const newX = rows[0]?.[field] || {};
		StockAlarm.check(alarms, oldX, newX);
	},


	/**
	 * Triggers matching alarms depending on their repeat mode.
	 *
	 * @param {Object[]} alm alarms to check
	 * @param {Object} oldX previous values by id
	 * @param {Object} newX current values by id
	 */
	check: (alm, oldX, newX) => {
		for (const a of alm) {
			if (newX[a.id] < a.value) {
				switch (a.repeat) {
					case 0: // alarm every time
						StockAlarm.trigger(a);
						break;
					case 1: // alarm once per session
						if (!StockAlarm.triggered.some(e => (e.id === a.id && e.type === a.type))) {
							StockAlarm.trigger(a);
						}
						break;
					case 2: // alarm once
						if (oldX[a.id] > a.value) StockAlarm.trigger(a);
						break;
				}
			}
		}
	},


	/**
	 * Shows the alarm toast.
	 *
	 * @param {Object} alm triggered alarm
	 */
	trigger: (alm) => {
		StockAlarm.triggered.push({ type: alm.type, id: alm.id });
		HTML.ShowToastMsg({
			head: i18n('Boxes.LowStock.LowStockHeader'),
			text: replace(replace(i18n('Boxes.LowStock.LowStockMessage'), '%name%', alm.name), '%amount%', alm.value),
			type: 'warning',
			hideAfter: 20000,
		});
	},


	/**
	 * Shows the alarm configuration box.
	 */
	showDialogue: async () => {
		StockAlarm.Type = 'R';
		StockAlarm.Repeat = 1;

		await IndexDB.getDB();
		const A = (await IndexDB.db.statsUnitsH.orderBy('date').reverse().limit(1).toArray())[0]?.army || {};
		const R = (await IndexDB.db.statsTreasurePlayerH.orderBy('date').reverse().limit(1).toArray())[0]?.resources || {};
		const T = (await IndexDB.db.statsTreasureClanH.orderBy('date').reverse().limit(1).toArray())[0]?.resources || {};

		const OR = [];
		const OT = [];
		const OA = [];
		let era = '';
		let setClass = true;

		for (const x of GoodsList) {
			if (era !== x.era) {
				setClass = !setClass;
				era = x.era;
			}
			if (R[x.id] > 0) OR.unshift(`<option value="${x.id}" data-name="${x.name}" class="${setClass ? 'LShighlight' : ''}">${x.name} (${R[x.id]})</option>`);
			if (T[x.id] > 0) OT.unshift(`<option value="${x.id}" data-name="${x.name}" class="${setClass ? 'LShighlight' : ''}">${x.name} (${T[x.id]})</option>`);
		}

		era = '';
		setClass = true;
		for (const x of Unit.Types) {
			if (era !== x.minEra) {
				setClass = !setClass;
				era = x.minEra;
			}
			if (A[x.unitTypeId] > 0) OA.unshift(`<option value="${x.unitTypeId}" data-name="${x.name}" class="${setClass ? 'LShighlight' : ''}">${x.name} (${A[x.unitTypeId]})</option>`);
		}

		StockAlarm.OptionsR = OR.join();
		StockAlarm.OptionsA = OA.join();
		StockAlarm.OptionsT = OT.join();

		HTML.AddCssFile('stats');

		HTML.Box({
			id: 'LowStock',
			title: i18n('Boxes.LowStock.Title'),
			auto_close: true,
			dragdrop: true,
			minimize: true,
			resize: true
		});

		let htmltext = `<span id="LowStockType">`;
		htmltext += `<img alt="" class="options selected" data-type="R" src="${srcLinks.get('/shared/icons/reward_icons/reward_icon_random_goods.png', true)}">`;
		htmltext += `<img alt="" class="options" data-type="T" src="${srcLinks.get('/shared/icons/reward_icons/reward_icon_treasury_goods.png', true)}">`;
		htmltext += `<img alt="" class="options" data-type="A" src="${srcLinks.get('/shared/icons/reward_icons/reward_icon_all_units.png', true)}"></span>`;
		htmltext += `<select id="LowStockID">${StockAlarm.OptionsR}</select>`;
		htmltext += `<input id="LowStockValue" type="Number" placeholder="alert threshold">`; // Add i18n!!
		htmltext += `<span id="LowStockRepeat">`;
		htmltext += `<img alt="" class="options" data-repeat="2" src="${extUrl}js/web/stats/images/once.png">`;
		htmltext += `<img alt="" class="options  selected" data-repeat="1" src="${extUrl}js/web/stats/images/once_per_session.png">`;
		htmltext += `<img alt="" class="options" data-repeat="0" src="${extUrl}js/web/stats/images/always.png"></span>`;
		htmltext += `<span id="LowStockAddBtn" class="btn btn-green">+</span>`;
		htmltext += `<table class="foe-table" id="LowStockAlarmsList">`;
		htmltext += `<tr><th>type</th><th>name</th><th>threshold</th><th>repeat</th><th></th></tr>`; // Add i18n!!
		htmltext += `</table>`;

		$('#LowStockBody').html(htmltext);

		for (const x of StockAlarm.Alarms) {
			StockAlarm.addline(x.type, x.id, x.name, x.value, x.repeat);
		}

		$('#LowStockType .options').on('click', (e) => {
			$('#LowStockType .options').removeClass('selected');
			e.target.classList.add('selected');
			StockAlarm.Type = e.target.dataset.type;
			$('#LowStockID').html(StockAlarm['Options' + StockAlarm.Type]);
		});
		$('#LowStockRepeat .options').on('click', (e) => {
			$('#LowStockRepeat .options').removeClass('selected');
			e.target.classList.add('selected');
			StockAlarm.Repeat = Number(e.target.dataset.repeat);
		});
		$('#LowStockAddBtn').on('click', (e) => {
			const IDel = document.getElementById('LowStockID');
			const id = IDel.value;
			const name = IDel.options[IDel.selectedIndex].dataset.name;
			const value = Number(document.getElementById('LowStockValue').value);
			StockAlarm.add(StockAlarm.Type, id, name, value, StockAlarm.Repeat);
			StockAlarm.addline(StockAlarm.Type, id, name, value, StockAlarm.Repeat);
		});
	},


	/**
	 * Removes an alarm via its table row button.
	 *
	 * @param e click event
	 */
	rembtn: (e) => {
		const line = e.target.parentElement.parentElement;
		const { type, id, name } = e.target.dataset;
		const value = Number(e.target.dataset.value);
		const repeat = Number(e.target.dataset.repeat);

		StockAlarm.remove(type, id, name, value, repeat);
		line.remove();
	},


	/**
	 * Adds an alarm and persists the list.
	 *
	 * @param {string} type alarm type ('R', 'T' or 'A')
	 * @param {string} id resource or unit id
	 * @param {string} name display name
	 * @param {number} value alert threshold
	 * @param {number} repeat repeat mode (0=always, 1=per session, 2=once)
	 */
	add: (type, id, name, value, repeat) => {
		StockAlarm.Alarms.push({
			type: type,
			id: id,
			name: name,
			value: value,
			repeat: repeat
		});
		localStorage.setItem('StockAlarms', JSON.stringify(StockAlarm.Alarms));
	},


	/**
	 * Adds an alarm row to the configuration table.
	 *
	 * @param {string} type alarm type ('R', 'T' or 'A')
	 * @param {string} id resource or unit id
	 * @param {string} name display name
	 * @param {number} value alert threshold
	 * @param {number} repeat repeat mode (0=always, 1=per session, 2=once)
	 */
	addline: (type, id, name, value, repeat) => {
		const table = document.getElementById('LowStockAlarmsList');
		const row = table.insertRow(1);

		const typeImgs = {
			R: srcLinks.get('/shared/icons/reward_icons/reward_icon_random_goods.png', true),
			T: srcLinks.get('/shared/icons/reward_icons/reward_icon_treasury_goods.png', true),
			A: srcLinks.get('/shared/icons/reward_icons/reward_icon_all_units.png', true)
		};
		const repeatImgs = {
			0: extUrl + 'js/web/stats/images/always.png',
			1: extUrl + 'js/web/stats/images/once_per_session.png',
			2: extUrl + 'js/web/stats/images/once.png'
		};

		let html = `<td><img alt="" src="${typeImgs[type] || ''}"></td>`;
		html += `<td>${name}</td>`;
		html += `<td>${value}</td>`;
		html += `<td><img alt="" src="${repeatImgs[repeat] || ''}"></td>`;
		html += `<td><span class="btn btn-delete LowStockRemBtn" data-id="${id}" data-name="${name}" data-value="${value}" data-repeat="${repeat}" data-type="${type}" onclick="StockAlarm.rembtn(event)">-</span></td>`;

		$(row).html(html);
	},


	/**
	 * Removes an alarm, persists the list and restores the form values.
	 *
	 * @param {string} type alarm type ('R', 'T' or 'A')
	 * @param {string} id resource or unit id
	 * @param {string} name display name
	 * @param {number} value alert threshold
	 * @param {number} repeat repeat mode (0=always, 1=per session, 2=once)
	 */
	remove: (type, id, name, value, repeat) => {
		const i = StockAlarm.Alarms.findIndex(x => x.type === type && x.id === id && x.name === name && x.repeat === repeat && x.value === value);
		if (i > -1) {
			StockAlarm.Alarms.splice(i, 1);
			localStorage.setItem('StockAlarms', JSON.stringify(StockAlarm.Alarms));
			$(`#LowStockType [data-type="${type}"]`).trigger('click');
			$(`#LowStockRepeat [data-repeat="${repeat}"]`).trigger('click');
			$(`#LowStockValue`).val(value);
			$(`#LowStockValue option[value="${id}"]`).prop('selected', true);
		}
	}
};
