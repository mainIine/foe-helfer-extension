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

// Guild Battlegrounds leader board log
// Gildengefechte
FoEproxy.addHandler('GuildBattlegroundService', 'getPlayerLeaderboard', async (data, postData) => {
	Stats.HandlePlayerLeaderboard(data.responseData);
});

// Gildengefechte
FoEproxy.addHandler('GuildBattlegroundStateService', 'getState', async (data, postData) => {
	if (data.responseData['stateId'] !== 'participating') {
		Stats.HandlePlayerLeaderboard(data.responseData['playerLeaderboardEntries']);
	}
});
//Currently in Outpost
var isCurrentlyInOutpost = 0;
FoEproxy.addHandler('CityMapService', 'getCityMap', async (data, postData) => {
	if (data.responseData['gridId'] === 'cultural_outpost') {
		isCurrentlyInOutpost=1;
	}
});
FoEproxy.addHandler('CityMapService', 'getEntities', async (data, postData) => {
		isCurrentlyInOutpost=0;
});

// Reward log
FoEproxy.addHandler('RewardService', 'collectReward', async (data, postData) => {
	const r = data.responseData;
	if (!Array.isArray(r)) {
		return;
	}
	var [rewards, rewardIncidentSource] = r; // pair, 1st is reward list, second source of incident, e.g spoilsOfWar
    await IndexDB.getDB();
	
	for (let reward of rewards) {

		if (rewardIncidentSource === 'default') {
			//split flying island incidents from normal ones
			if (isCurrentlyInOutpost === 1){
				rewardIncidentSource = 'shards';
			}
			//split league rewards and fragment assembly from incidents
			if(postData[0].requestMethod === 'useItem'){
				continue;
			}
			//split quest rewards from incidents
			if(postData[0].requestMethod === 'advanceQuest'){
				continue;
			}
		}
		// Add reward info to the db
		if (!(await IndexDB.db.statsRewardTypes.get(reward.id))) {
			// Reduce amount of saved data
			if (reward.unit) {
				delete reward.unit;
			}
			delete reward.__class__;
			await IndexDB.db.statsRewardTypes.put(reward);
		}

		// Add reward incident record

		await Stats.addReward(rewardIncidentSource, reward.amount ||0, reward.id);
	}
});

// Player treasure log
FoEproxy.addHandler('ResourceService', 'getPlayerResources', async (data, postData) => {
	const r = data.responseData;
	if (!r.resources) {
		return;
	}

    await IndexDB.getDB();

    await IndexDB.db.statsTreasurePlayerD.put({
		date: moment().startOf('day').toDate(),
		resources: r.resources
	});

	await IndexDB.db.statsTreasurePlayerH.put({
		date: moment().startOf('hour').toDate(),
		resources: r.resources
	});

	StockAlarm.checkResources();
});

// Clan Treasure log
FoEproxy.addHandler('ClanService', 'getTreasury', async (data, postData) => {
	const r = data.responseData;
	if (!r.resources) {
		return;
	}

    await IndexDB.getDB();

	await IndexDB.db.statsTreasureClanD.put({
		date: moment().startOf('day').toDate(),
		clanId: ExtGuildID,
		resources: r.resources
	});

	await IndexDB.db.statsTreasureClanH.put({
		date: moment().startOf('hour').toDate(),
		clanId: ExtGuildID,
		resources: r.resources
	});
	
	StockAlarm.checkTreasury();
});

// Player Army log
FoEproxy.addHandler('ArmyUnitManagementService', 'getArmyInfo', async (data, postData) => {
	if (ActiveMap !== 'main') {
		return;
	}

	const r = data.responseData;

	// Convert array to hash to be more compact
	const army = r.counts.reduce((acc, val) => {
		acc[val.unitTypeId] = (val.attached || 0) + (val.unattached || 0);
		return acc;
	}, {});

    await IndexDB.getDB();

	await IndexDB.db.statsUnitsD.put({
		date: moment().startOf('day').toDate(),
		army
	});

    await IndexDB.db.statsUnitsH.put({
		date: moment().startOf('hour').toDate(),
		army
	});

	StockAlarm.checkArmy();
});

/**
 * @type {{RenderOptions: (function(): string), isSelectedUnitSources: (function(): boolean), DatePickerObj: null, applyDeltaToSeriesIfNeed: (function({series: *, [p: string]: *}): {series: *, chartType: string}), shortEraName: (function(*): (void|string|*)), Render: (function(): Promise<void>), RenderButton: (function({name: *, isActive?: *, dataType: *, value: *, title?: *, disabled?: *}): string), updateCharts: (function(): Promise<void>), getSelectedEras: (function(): string[]), updateOptions: Stats.updateOptions, treasureSources: [string, string, string, string], createUnitsSeries: (function(): Promise<{series, pointFormat: string, footerFormat: string}>), loadHighcharts: (function(): Promise<void>), RemoveTable: Stats.RemoveTable, createTreasureSeries: (function(): Promise<{series, pointFormat: string, colors: *[], footerFormat: string}>), ResMap: {NoAge: [string, string, string, string, string], special: [string, string, string, string]}, RenderCheckbox: (function({name: *, isActive: *, dataType: *, value: *}): string), state: {eras: {}, showAnnotations: boolean, currentType: null, chartType: string, rewardSource: string, eraSelectOpen: boolean, source: string, isGroupByEra: boolean}, createRewardSeries: (function(): Promise<{series: {data: this, name: string}[], title: string}>), isVisitingCulturalOutpost: boolean, isSelectedGBGSources: (function(): boolean), gbgSources: [string], promisedLoadCode: (function(*=): Promise<unknown>), createGBGSeries: (function(*=): Promise<{series: {data, avatarUrl: (string), name: string}[], pointFormat: string}>), createTreasureGroupByEraSeries: (function(): Promise<{series: {data, name: *}[]}>), RenderTab: (function({name: *, isActive?: *, dataType: *, value: *, title?: *, disabled?: *}): string), kilos: (function(*=): string), HandlePlayerLeaderboard: (function(*=): Promise<undefined>), isSelectedTreasureSources: (function(): boolean), RenderBox: (function({name: *, isActive: *, disabled: *, dataType: *, value: *}): string), getAnnotations: (function(): Promise<{xAxisPlotLines: {color: string, dashStyle: string, width: number, value: *}[], annotations: {useHTML: boolean, labelOptions: {verticalAlign: string, backgroundColor: string, y: number, style: {fontSize: string}}, labels: {text: string, point: {xAxis: number, x: *, y: number}}[]}[]}>), updateCommonChart: (function({series: *, colors?: *, pointFormat?: *, footerFormat?: *, chartType?: *}): Promise<void>), RenderSecondaryOptions: (function(): string), PlayableEras: string[], unitSources: [string, string], equals: (function(*=, *=): boolean), isSelectedRewardSources: (function(): boolean), Show: Stats.Show, RenderEraSwitchers: (function(): string), updateRewardCharts: Stats.updateRewardCharts, rewardSources: [string]}}
 */
let Stats = {

	isVisitingCulturalOutpost: false,

	ResMap: {
		NoAge: ['money', 'supplies', 'tavern_silver', 'medals', 'premium'],
		special: ['promethium', 'orichalcum', 'mars_ore', 'asteroid_ice', 'venus_carbon', 'unknown_dna','crystallized_hydrocarbons'],
	},

	PlayableEras: [],

	// State for UI
	state: {
		source: 'statsTreasurePlayerD', // Source of data - indexdb table name
		chartType: 'line', // chart type
		eras: {}, // Selected era for filtering data,
		eraSelectOpen: false, // Dropdown
		isGroupByEra: false,
		showAnnotations: false, // GvG annotations
		rewardSource: 'battlegrounds_conquest', // filter by type of reward
		currentType: null,
		filter:"",
	},

	/*
	 * Initializes ResMap and PlayableEras
	 */
	Init: () => {
		for (let Era = Technologies.Eras.BronzeAge; Era < Technologies.Eras.NextEra; Era++) {
			let EraName = Technologies.EraNames[Era];
			if (!EraName) continue;

			if (GoodsList.length < 5 * (Era - 1)) break; // Era does not exist yet

			Stats.PlayableEras.push(EraName);
			Stats.ResMap[EraName] = [];

			for (let i = 0; i < 5; i++) {
				if (GoodsList[(Era - 2) * 5 + i]) Stats.ResMap[EraName].push(GoodsList[(Era - 2) * 5 + i].id);
            }
		}
    },

	DatePickerObj: null,
	DatePickerStart: moment(MainParser.getCurrentDate()).subtract(6, 'days'),
	DatePickerEnd: moment(MainParser.getCurrentDateTime()),//.toDate(),

	minDateFilter: null,
	maxDateFilter: moment(MainParser.getCurrentDate()).toDate(),
	DatePickerFrom: null, //moment(MainParser.getCurrentDate()).subtract(6, 'days'),//.format('YYYY-MM-DD'),
	DatePickerTo: null, //moment(MainParser.getCurrentDateTime()),//.format('YYYY-MM-DD'),

	lockDates: [],
	TodayEntries: null,

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


	/**
	 * Show Box
	 */
	Show: (event) => {
		if ($('#stats').length === 0) {
			let args = {
				'id': 'stats',
				'title': i18n('Boxes.Stats.Title'),
				'ask': i18n('Boxes.Stats.HelpLink'),
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			};

			HTML.Box(args);
			moment.locale(i18n('Local'));
			HTML.AddCssFile('stats');
			HTML.AddCssFile('unit');
		}
		else if (!event)
		{
			HTML.CloseOpenBox('stats');
			return;
		}

		// If not selected any era, preselect 2 last eras of user
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
		$('#statsBody').on('click', '[data-type]', function(){
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

				case 'selectEras':
					Stats.state.eras = {};
					const values = (value || '').split(',');
					values.forEach(it => Stats.state.eras[it] = true);
					break;

				case 'groupByToggle':
					Stats.state.isGroupByEra = !Stats.state.isGroupByEra;
					break;

				case 'selectSource':
					const isChangedToUnit = Stats.unitSources.includes(value) && !Stats.isSelectedUnitSources();
					const isChangedToPlayerSource = ['statsTreasurePlayerH', 'statsTreasurePlayerD'].includes(value) && !Stats.isSelectedPlayerSources();
					const isChangedToClanTreasure = ['statsTreasureClanH', 'statsTreasureClanD'].includes(value) && !Stats.isSelectedTreasureSources();
					const isChangedToReward = Stats.rewardSources.includes(value) && !Stats.isSelectedRewardSources();
					const isChangedToGBG = Stats.gbgSources.includes(value) && !Stats.isSelectedGBGSources();

					if (isChangedToUnit) {
						// if Changed to units than select all eras by default
						Stats.state.eras = {};
						Object.keys(Stats.ResMap).map(it => Stats.state.eras[it] = true);

					} else if (isChangedToPlayerSource) {
						// If changed to player's treasure select 2 last eras
						Stats.state.eras = {};
						Stats.state.eras = {
							[Technologies.EraNames[CurrentEraID]]: true,
						};
						if (CurrentEraID > 2) {
							Stats.state.eras[Technologies.EraNames[CurrentEraID - 1]] = true;
						}

					} else if (isChangedToClanTreasure) {
						// If changed to treasure select all playable eras
						Stats.state.eras = {};
						Stats.PlayableEras.forEach(era => Stats.state.eras[era] = true);

					} else if (isChangedToGBG) {
						Stats.state.chartType = 'delta';
						Stats.isGG = true;

					} else if (isChangedToReward) {
						Stats.state.rewardSource = 'battlegrounds_conquest';

					}

					Stats.state.source = value || 'statsTreasurePlayerD';
					break;

				case 'setChartType':
					Stats.state.chartType = value;
					break;

				case 'setRewardSource':
					Stats.state.rewardSource = value;
					Stats.RemoveTable();
					break;

				case 'toggleAnnotations':
					Stats.state.showAnnotations = !Stats.state.showAnnotations;
					break;

				default:
					return;
			}

			Stats.updateOptions();
			Stats.updateCharts();
		});
	},


	/**
	 * Remove previous data-table
	 */
	RemoveTable: () => {
		$('.highcharts-data-table').remove();
	},


	/**
	 * Render box content
	 *
	 * @returns {Promise<void>}
	 */
	Render: async () => {
		$('#statsBody').html(`<div class="options">${Stats.RenderOptions()}</div><div class="options-2"></div><div id="highcharts">Loading...</div>`);

		Stats.updateOptions();
		await Stats.loadHighcharts();
		await Stats.updateCharts(Stats.DatePickerStart, Stats.DatePickerEnd);
	},


	/**
	 * Update options
	 */
	updateOptions: () => {
		//console.log('updateOptions');
		$('#statsBody .options').html(Stats.RenderOptions());

		$('#statsBody').promise().done(function(){
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
						$('#StatsDatePicker').text(`${Stats.formatRange()}`);

						// get now if day is today
						if (end.getDate() === MainParser.getCurrentDate().getDate() && end.getMonth() === MainParser.getCurrentDate().getMonth()) 
							end = MainParser.getCurrentDate();

						Stats.DatePickerFrom = start;
						Stats.DatePickerTo = end;

						return await Stats.updateCharts({ s: start, e: end });
					},
				});
			}
			else {
				Stats.DatePickerObj = null;
            }
		});
	},


	/**
	 * @param x
	 * @param y
	 * @returns {boolean}
	 */
	equals: (x, y) => JSON.stringify(x) == JSON.stringify(y),


	/**
	 * Render main options
	 *
	 * @returns {string}
	 */
	RenderOptions: () => {
		const selectedEras = Stats.getSelectedEras().sort();

		const btnSelectNoEra = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnNoEra'),
			isActive: selectedEras.length === 1 && selectedEras[0] === 'NoAge',
			dataType: 'selectEras',
			disabled: !Stats.isSelectedPlayerSources() && !Stats.isSelectedTreasureSources() && !Stats.isSelectedUnitSources(),
			value: 'NoAge',
		});

		const btnSelectMyEra = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnMyEra'),
			isActive: selectedEras.length === 1 && selectedEras[0] === Technologies.EraNames[CurrentEraID],
			dataType: 'selectEras',
			disabled: !Stats.isSelectedPlayerSources() && !Stats.isSelectedTreasureSources() && !Stats.isSelectedUnitSources(),
			value: Technologies.EraNames[CurrentEraID]
		});

		const btnSelectAll = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnAll'),
			title: i18n('Boxes.Stats.BtnAllTittle'),
			isActive: Object.keys(Stats.ResMap).length == selectedEras.length,
			dataType: 'selectEras',
			disabled: !Stats.isSelectedPlayerSources() && !Stats.isSelectedTreasureSources() && !Stats.isSelectedUnitSources(),
			value: Object.keys(Stats.ResMap).join(','),
		});

		const btnSelectTwoLastEra = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnLastEras'),
			title: i18n('Boxes.Stats.BtnLastErasTitle'),
			isActive: (selectedEras.length === 2 &&
				selectedEras.includes(Technologies.EraNames[CurrentEraID]) &&
				selectedEras.includes(Technologies.EraNames[CurrentEraID - 1])),
			disabled: !Stats.isSelectedPlayerSources() && !Stats.isSelectedTreasureSources() && !Stats.isSelectedUnitSources(),
			dataType: 'selectEras',
			value: Technologies.EraNames[CurrentEraID] + ',' + Technologies.EraNames[CurrentEraID - 1]
		});

		const btnSelectAllEra = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnAllPlayableEras'),
			title: i18n('Boxes.Stats.BtnAllPlayableErasTitle'),
			isActive: Stats.equals(selectedEras, Stats.PlayableEras.slice().sort()),
			dataType: 'selectEras',
			disabled: !Stats.isSelectedPlayerSources() && !Stats.isSelectedTreasureSources() && !Stats.isSelectedUnitSources(),
			value: Stats.PlayableEras.join(',')
		});

		const btnGroupByEra = Stats.RenderBox({
			name: i18n('Boxes.Stats.BtnToggleGroupBy'),
			title: i18n('Boxes.Stats.BtnToggleGroupByTitle'),
			disabled: !Stats.isSelectedPlayerSources() && !Stats.isSelectedTreasureSources(),
			isActive: Stats.state.isGroupByEra,
			dataType: 'groupByToggle',
		});

		const btnTglAnnotations = Stats.RenderBox({
			name: i18n('Boxes.Stats.BtnToggleAnnotations'),
			title: i18n('Boxes.Stats.BtnToggleAnnotationsTitle'),
			disabled: Stats.isSelectedRewardSources(),
			isActive: Stats.state.showAnnotations,
			dataType: 'toggleAnnotations',
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
			disabled: !Stats.isSelectedPlayerSources() && !Stats.isSelectedTreasureSources() && !Stats.isSelectedUnitSources() && !Stats.isSelectedGBGSources(),
			value: it
		}));

		let moreOptions = ``;
		if (Stats.isSelectedRewardSources()) {
			const btnsRewardSelect = [
				'default', //incidents
				'__event', //event rewards
				'battlegrounds_conquest', // Battlegrounds
				'guildExpedition', // Temple of Relics
				'pvp_arena', //PvP Arena
				'spoilsOfWar', // Himeji Castle
				'diplomaticGifts', //Space Carrier
				'shards', //Flying Island
			].map(it => Stats.RenderTab({
				name: i18n('Boxes.Stats.Rewards.Source.' + it),
				title: i18n('Boxes.Stats.Rewards.SourceTitle.' + it),
				isActive: Stats.state.rewardSource === it,
				dataType: 'setRewardSource',
				value: it,
			}));
	
			moreOptions =	`<div class="tabs option-2-reward-source">
								<ul class="horizontal">
									${btnsRewardSelect.join('')}
								</ul>
							</div>
							<div class="StatsRewardFilter">
								<input type="text" id="StatsRewardFilter" placeholder="${i18n("Boxes.Stats.FilterRewards")}" value="${Stats.state.filter}" oninput="Stats.state.filter=this.value;Stats.updateCharts();">
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
					${CurrentEraID > 2 ? btnSelectTwoLastEra : ''}
					${btnSelectAll}
					${btnSelectNoEra}
					</span>
				</div>
				<div class="option-chart-type-wrap text-center">
					${btnTglAnnotations}<br>
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
				`<div class="datepicker"><button class="btn btn-default" id="StatsDatePicker">${Stats.formatRange()}</button></div>`;
	},

	formatRange: ()=> {
		let text = undefined;
		let dateStart = moment(MainParser.getCurrentDateTime()).subtract(10, 'days');
		let dateEnd = moment(MainParser.getCurrentDateTime());

		if (Stats.DatePickerFrom !== null && Stats.DatePickerTo !== null) {
			dateStart = moment(Stats.DatePickerFrom);
			dateEnd = moment(Stats.DatePickerTo);
		}

		if (dateStart.isSame(dateEnd)){
			text = `${dateStart.format(i18n('Date'))}`;
		}
		else if (dateStart.year() !== (dateEnd.year())){
			text = `${dateStart.format(i18n('Date'))}` + ' - ' + `${dateEnd.format(i18n('Date'))}`;
		}
		else {
			text = `${dateStart.format(i18n('DateShort'))}` + ' - ' + `${dateEnd.format(i18n('Date'))}`;
		}

		if (Stats.DatePickerFrom == null && Stats.DatePickerTo == null) {
			text = i18n('Boxes.Stats.DatePicker');
		}

		//console.log(dateStart,dateEnd);

		return text;
	},


	/**
	 * Dropdown for eras
	 *
	 * @returns {string}
	 */
	RenderEraSwitchers: () => {
		const ages = [
			'NoAge',
		].concat(Stats.PlayableEras);
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
	 * Render a checkbox
	 *
	 * @param name
	 * @param isActive
	 * @param dataType
	 * @param value
	 * @returns {string}
	 */
	RenderCheckbox: ({name, isActive, dataType, value}) => `<li>
		<label class="game-cursor">
			<input type="checkbox" data-type="${dataType}" data-value="${value}" class="filter-msg game-cursor" ${isActive ? 'checked' : ''}>${name}</label>
		</li>`,

	/**
	 * Render a checkbox (without list)
	 *
	 * @param name
	 * @param isActive
	 * @param dataType
	 * @param value
	 * @returns {string}
	 */
	RenderBox: ({name, isActive, disabled, dataType, value}) => `<label class="game-cursor${disabled ? ' hidden' : ''}">
			<input type="checkbox" data-type="${dataType}" data-value="${value}" class="filter-msg game-cursor" ${isActive ? 'checked' : ''}>${name}</label>`,


	/**
	 * Render a button
	 *
	 * @param name		Name
	 * @param isActive	Activated
	 * @param dataType	Typ
	 * @param value		Default Value
	 * @param title		Title for button
	 * @param disabled	Disabled button
	 * @returns {string}
	 */
	RenderButton: ({ name, isActive, dataType, value, title, disabled }) => `<button ${disabled ? 'disabled' : ''} class="btn btn-default btn-tight${!disabled && isActive ? ' btn-active' : ''} ${dataType}" data-type="${dataType}" data-value="${value}" title="${(title || '').replace(/"/g,'&quot;')}"><span>${name}</span></button>`,


	/**
	 * Render a tab
	 *
	 * @param name		Name
	 * @param isActive	Activated
	 * @param dataType	Typ
	 * @param value		Default Value
	 * @param title		Title for button
	 * @param disabled	Disabled button
	 * @returns {string}
	 */
	RenderTab: ({ name, isActive, dataType, value, title, disabled }) => `<li ${disabled ? 'disabled' : ''} class="${value} ${!disabled && isActive ? 'active' : ''}" data-type="${dataType}" data-value="${value}" title="${(title || '').replace(/"/g, '&quot;')}"><a><span>&nbsp;</span></a></li>`,


	/**
	 * Update charts
	 *
	 * @returns {Promise<void>}
	 */
	updateCharts: async (dates = null) => {
		dates = {s: Stats.DatePickerFrom, e: Stats.DatePickerTo};
		if (Stats.isSelectedGBGSources()) {
			return await Stats.updateCommonChart(Stats.applyDeltaToSeriesIfNeed(await Stats.createGBGSeries()));
		}

		if (Stats.isSelectedUnitSources()) {
			return await Stats.updateCommonChart(Stats.applyDeltaToSeriesIfNeed(await Stats.createUnitsSeries()));
		}

		if (Stats.isSelectedTreasureSources()) {
			if (Stats.state.isGroupByEra) {
				return await Stats.updateCommonChart(Stats.applyDeltaToSeriesIfNeed(await Stats.createTreasureGroupByEraSeries()));
			} else {
				return await Stats.updateCommonChart(Stats.applyDeltaToSeriesIfNeed(await Stats.createTreasureSeries()));
			}
		}

		if (Stats.isSelectedPlayerSources()) {
			if (Stats.state.isGroupByEra) {
				return await Stats.updateCommonChart(Stats.applyDeltaToSeriesIfNeed(await Stats.createPlayerSourcesGroupByEraSeries()));
			} else {
				return await Stats.updateCommonChart(Stats.applyDeltaToSeriesIfNeed(await Stats.createPlayerSourcesSeries()));
			}
		}

		if (Stats.isSelectedRewardSources) {
			return Stats.updateRewardCharts(await Stats.createRewardSeries());
		}
	},


	/**
	 * Battlegrounds series for highcharts
	 *
	 * @param dates		Date obj with {start, end}
	 * @returns {Promise<{series: {data, avatarUrl: (string|string), name: string}[], pointFormat: string}>}
	 */
	createGBGSeries: async () => {
		let data;

		if(Stats.DatePickerFrom !== null && Stats.DatePickerTo !== null){
			data = await IndexDB.db.statsGBGPlayers.where('date').between(Stats.DatePickerFrom, Stats.DatePickerTo).sortBy('date');
		} else {
			data = await IndexDB.db.statsGBGPlayers.orderBy('date').toArray();
		}

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
			const playerInfo = playerKV[playerId] || {name: '' + playerId};
			const avatarUrl = srcLinks.GetPortrait(playerInfo.avatar);
			return {
				name: playerInfo.name,
				avatarUrl,
				data: data.map(({date, players}) => {
					const player = players[playerId];
					const score = player && (2 * (player.n || 0) + (player.b || 0))
					return [+date, score];
				})
			}
		});

		return {
			series,
			pointFormat: `<tr>
							<td>
								<img src="{series.options.avatarUrl}" style="width: 45px; height: 45px; border: 1px white solid; margin-right: 4px;"/>
							</td>
							<td>
								<span style="margin: 0 5px;"><span style="color:{point.color}">●</span> {series.name}: </span>
							</td>
							<td class="text-right">
								<b>{point.y}</b>
							</td>
						</tr>`,
		};
	},


	/**
	 * Unit series
	 *
	 * @returns {Promise<{series, pointFormat: string, footerFormat: string}>}
	 */
	createUnitsSeries: async () => {
		let data = null;

		if(Stats.DatePickerFrom !== null && Stats.DatePickerTo !== null) {
			let days = (Stats.DatePickerTo - Stats.DatePickerFrom)/60/60/24/1000;

			let matchingDB = 'statsUnitsD';
			if (days <= 7) 
				matchingDB = 'statsUnitsH';

			data = await IndexDB.db[matchingDB].where('date').between(Stats.DatePickerFrom, Stats.DatePickerTo).sortBy('date');
		} 
		else
			data = await IndexDB.db.statsUnitsD.orderBy('date').toArray();

		const unitsTypes = data.reduce((acc, it) => {
			const unitIds = Object.keys(it.army);
			unitIds.forEach(it => acc[it] = true)
			return acc;
		}, {});

		const selectedEras = Stats.getSelectedEras();

		const filteredUnitIds = Object.keys(unitsTypes).filter(unitId => {
			const unitInfo = Unit.Types.find(it => it.unitTypeId == unitId);
			const unitEra = unitInfo && unitInfo.minEra;
			return selectedEras.includes(unitEra);
		});

		const series = filteredUnitIds.map(unitId => {
			const unitInfo = Unit.Types.find(it => it.unitTypeId == unitId) || {minEra: ''};
			const era = unitInfo.minEra;
			return {
				name: unitInfo.name,
				era: era ? i18n('Eras.' + Technologies.Eras[era]) : '',
				unitId,
				unitUrl:srcLinks.get("/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_"+unitId+".jpg", true),
				data: data.map(({date, army}) => [
					+date,
					army[unitId] || 0
				])
			}
		});
		return {
			series,
			pointFormat: `<tr>
								<td>
									<img src="{series.options.unitUrl}" style="width: 45px; height: 45px; border: 1px white solid; margin-right: 4px;"/>
								</td>
								<td>
									<span style="margin: 0 5px;"><span style="color:{point.color}">●</span> {series.name}: </span>
								</td>
								<td class="text-right">
									<b>{point.y}</b>
								</td>
							</tr>`,
			footerFormat: '</table><br/><small>{series.options.era}</small>'
		};
	},


	/**
	 *
	 * @returns {Promise<{series: {data, name: *}[]}>}
	 */
	createTreasureGroupByEraSeries: async () => {
		// todo: ggf gildenid abfangen
		let data = null;

		if(Stats.DatePickerFrom !== null && Stats.DatePickerTo !== null){
			let days = (Stats.DatePickerTo - Stats.DatePickerFrom)/60/60/24/1000;

			let matchingDB = 'statsTreasureClanD';
			if (days <= 7) 
				matchingDB = 'statsTreasureClanH';

			data = await IndexDB.db[matchingDB].where('date').between(Stats.DatePickerFrom, Stats.DatePickerTo).sortBy('date');
		} 
		else
			data = await IndexDB.db.statsTreasureClanD.orderBy('date').toArray();

		const series = Stats.getSelectedEras().map(era => {
			return {
				name: i18n('Eras.' + Technologies.Eras[era]),
				// Group by era's resources
				data: data.map(({date, resources}) => [
					+date,
					Stats.ResMap[era].reduce((acc, resName) => acc + (resources[resName] || 0), 0)
				]),
			}
		});
		return {series};
	},


	/**
	 *
	 * @returns {Promise<{series, pointFormat: string, colors: *[], footerFormat: string}>}
	 */
	createTreasureSeries: async () => {
		const selectedEras = Stats.getSelectedEras();
		const hcColors = Highcharts.getOptions().colors;
		let data = null;

		if(Stats.DatePickerFrom !== null && Stats.DatePickerTo !== null){
			let days = (Stats.DatePickerTo - Stats.DatePickerFrom)/60/60/24/1000;

			let matchingDB = 'statsTreasureClanD';
			if (days <= 7) 
				matchingDB = 'statsTreasureClanH';

			data = await IndexDB.db[matchingDB].where('date').between(Stats.DatePickerFrom, Stats.DatePickerTo).sortBy('date');
		} 
		else
			data = await IndexDB.db.statsTreasureClanD.orderBy('date').toArray();

		let colors;

		// Build color set - brighten each per
		if (selectedEras.length > 1) {
			let colorIndex = 0;
			colors = [];
			selectedEras.forEach(era => {
				const baseColor = colorIndex % 9; // there is only 9 colors in theme
				colorIndex++;
				Stats.ResMap[era].forEach((it, index) => {
					colors.push(Highcharts.color(hcColors[baseColor]).brighten(index * 0.05).get())
				});
			});
		}

		const selectedResources = Stats.getSelectedEras()
			.map(it => Stats.ResMap[it]) // map to arrays of goods of filtered eras
			.reduce((acc, it) => acc.concat(it), []);// unflat array

		const series = selectedResources.map(it => {
			const goodsData = (GoodsData[it] || {name: it})
			return {
				era: goodsData.era ? i18n('Eras.' + Technologies.Eras[goodsData.era]) : '',
				goodsId: it,
				name: goodsData.name,
				data: data.map(({date, resources}) => {
					return [+date, resources[it] || 0];
				}),
			};
		});

		return {
			series,
			colors,
			pointFormat: `<tr>
								<td>
									<span class="goods-sprite-50 {series.options.goodsId}"></span>
								</td>
								<td>
									<span style="margin: 0 5px;"><span style="color:{point.color}">●</span> {series.name}: </span>
								</td>
								<td class="text-right">
									<b>{point.y}</b>
								</td>
							</tr>`,
			footerFormat: '</table><br/><small>{series.options.era}</small>'
		};
	},

	/**
	 *
	 * @returns {Promise<{series: {data, name: *}[]}>}
	 */
	 createPlayerSourcesGroupByEraSeries: async () => {
		// todo: ggf gildenid abfangen
		let data = null;

		if(Stats.DatePickerFrom !== null && Stats.DatePickerTo !== null){
			let days = (Stats.DatePickerTo - Stats.DatePickerFrom)/60/60/24/1000;

			let matchingDB = 'statsTreasurePlayerD';
			if (days <= 7) 
				matchingDB = 'statsTreasurePlayerH';

			data = await IndexDB.db[matchingDB].where('date').between(Stats.DatePickerFrom, Stats.DatePickerTo).sortBy('date');
		} 
		else
			data = await IndexDB.db.statsTreasurePlayerD.orderBy('date').toArray();

		const series = Stats.getSelectedEras().map(era => {
			return {
				name: i18n('Eras.' + Technologies.Eras[era]),
				// Group by era's resources
				data: data.map(({date, resources}) => [
					+date,
					Stats.ResMap[era].reduce((acc, resName) => acc + (resources[resName] || 0), 0)
				]),
			}
		});
		return {series};
	},


	/**
	 *
	 * @returns {Promise<{series, pointFormat: string, colors: *[], footerFormat: string}>}
	 */
	createPlayerSourcesSeries: async () => {
		const selectedEras = Stats.getSelectedEras();
		const hcColors = Highcharts.getOptions().colors;
		let data = null;

		if(Stats.DatePickerFrom !== null && Stats.DatePickerTo !== null){
			let days = (Stats.DatePickerTo - Stats.DatePickerFrom)/60/60/24/1000;

			let matchingDB = 'statsTreasurePlayerD';
			if (days <= 7) 
				matchingDB = 'statsTreasurePlayerH';

			data = await IndexDB.db[matchingDB].where('date').between(Stats.DatePickerFrom, Stats.DatePickerTo).sortBy('date');
		} 
		else
			data = await IndexDB.db.statsTreasurePlayerD.orderBy('date').toArray();

		let colors;

		// Build color set - brighten each per
		if (selectedEras.length > 1) {
			let colorIndex = 0;
			colors = [];
			selectedEras.forEach(era => {
				const baseColor = colorIndex % 9; // there is only 9 colors in theme
				colorIndex++;
				Stats.ResMap[era].forEach((it, index) => {
					colors.push(Highcharts.color(hcColors[baseColor]).brighten(index * 0.05).get())
				});
			});
		}

		const selectedResources = Stats.getSelectedEras()
			.map(it => Stats.ResMap[it]) // map to arrays of goods of filtered eras
			.reduce((acc, it) => acc.concat(it), []);// unflat array

		const series = selectedResources.map(it => {
			const goodsData = (GoodsData[it] || {name: it})
			return {
				era: goodsData.era ? i18n('Eras.' + Technologies.Eras[goodsData.era]) : '',
				goodsId: it,
				name: goodsData.name,
				data: data.map(({date, resources}) => {
					return [+date, resources[it] || 0];
				}),
			};
		});

		return {
			series,
			colors,
			pointFormat: `<tr>
								<td>
									<span class="goods-sprite-50 {series.options.goodsId}"></span>
								</td>
								<td>
									<span style="margin: 0 5px;"><span style="color:{point.color}">●</span> {series.name}: </span>
								</td>
								<td class="text-right">
									<b>{point.y}</b>
								</td>
							</tr>`,
			footerFormat: '</table><br/><small>{series.options.era}</small>'
		};
	},


	/**
	 * Calculate diff between points and use it as 'y', change chartType to 'line'
	 *
	 * @param series
	 * @param args
	 * @returns {{series: *, chartType: (string)}}
	 */
	applyDeltaToSeriesIfNeed: ({series, ...args}) => {
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
			series = series.filter(s => (s.data?.length | 0) > 0);
		}

		return {
			...args,
			series,
			chartType
		}
	},


	/**
	 * Human readable
	 * e.g. 5123 => 5k, 2123 => 2.1k
	 *
	 * @param n
	 * @returns {string}
	 */
	kilos: (n) => (n / 1000).toFixed(Math.abs(n) < 5000 ? 1 : 0) + 'k',


	/**
	 * Get shortname
	 * e.g shortEraName('BronzeAge'); => 'BA'
	 *
	 * @param eraId
	 * @returns {void | string | *}
	 */
	shortEraName: (eraId) => eraId.replace(/([^A-Z])/g, ''),


	/**
	 * Get annotations
	 *
	 * @returns {Promise<{xAxisPlotLines: {color: string, dashStyle: string, width: number, value: *}[], annotations: [{useHTML: boolean, labelOptions: {verticalAlign: string, backgroundColor: string, y: number, style: {fontSize: string}}, labels: {text: string, point: {xAxis: number, x: *, y: number}}[]}]}>}
	 */
	getAnnotations: async () => {
		let data = await IndexDB.db.statsTreasureClanH.orderBy('date').toArray();
		data = data.filter(it => it.clanId === ExtGuildID);

		const gvgDates = [];
		const BASE_LEVEL = -100; // only create annotation when more than 100 goods are lost

		data.forEach((dataItem, index) => {
			if (!index) return; // skip first
			const prevDataItem = data[index - 1];
			const resources = dataItem.resources;
			const prevResources = prevDataItem.resources;
			const delta = Object.keys(resources).reduce((acc, goodsName) => {
				acc[goodsName] = (resources[goodsName] || 0) - (prevResources[goodsName] || 0);
				return acc;
			}, {});

			// Find era where minimum 3 kind of goods are reduce with almost same value (15% deviation)
			const erasGvG = {};
			Stats.PlayableEras.forEach(era => {
				const goodsDiffs = Stats.ResMap[era].map(goodsName => delta[goodsName]);
				if (goodsDiffs.length > 1) {
					const matchedIndexes = [];
					let decreasedGoods = 0;
					for (let i = 0; i < goodsDiffs.length; i++) {
						const a = goodsDiffs[i];
						const b = i - 1 < 0 ? goodsDiffs[goodsDiffs.length - 1] : goodsDiffs[i - 1];
						const diffBetween2Goods = Math.abs((a - b) / a);
						if (diffBetween2Goods < 0.15 && a < BASE_LEVEL) {
							matchedIndexes.push(i);
							if (a < decreasedGoods) {
								decreasedGoods = a;
							}
						}
					}
					if (matchedIndexes.length >= 3) {
						erasGvG[era] = decreasedGoods * goodsDiffs.length;
					}
				}

				if (delta.medals < BASE_LEVEL) {
					erasGvG.NoAge = delta.medals;
				}

				if (Object.keys(erasGvG).length) {
					gvgDates.push([+dataItem.date, erasGvG]);
				}
			});
		});

		const annotationLabels = gvgDates.map(([date, eras]) => {
			const statsStr = Object.keys(eras).map(it => `${Stats.shortEraName(it)}: ${Stats.kilos(eras[it])}`).join('<br />');
			return {
				point: {
					xAxis: 0,
					x: date,
					y: 0
				},
				text: 'GvG<br/>' + statsStr
			}
		});

		// Highchart annotations
		const annotations = [{
			useHTML: true,
			labelOptions: {
				style: {
					fontSize: '10px'
				},
				backgroundColor: 'rgba(200,200,128,0.9)',
				verticalAlign: 'top',
				y: 18
			},
			labels: annotationLabels
		}];

		// Highchart's line for highlight GvG
		const xAxisPlotLines = gvgDates.map(([it, eras]) => ({
			dashStyle: 'Dot',
			color: '#b20000',
			width: 1,
			value: it
		}));

		return {
			annotations,
			xAxisPlotLines
		};
	},


	/**
	 * Update chart
	 *
	 * @param series
	 * @param colors
	 * @param pointFormat
	 * @param footerFormat
	 * @param chartType
	 * @returns {Promise<void>}
	 */
	updateCommonChart: async ({series, colors, pointFormat, footerFormat, chartType}) => {
		colors = colors || Highcharts.getOptions().colors;
		pointFormat = pointFormat || '<tr><td><span style="color:{point.color}">●</span> {series.name}:</td><td class="text-right"><b>{point.y}</b></td></tr>';
		footerFormat = footerFormat || '</table>';

		const {annotations, xAxisPlotLines} = Stats.state.showAnnotations ? (await Stats.getAnnotations()) : {};
		const title = i18n('Boxes.Stats.SourceTitle.' + Stats.state.source);

		Highcharts.chart('highcharts', {
			chart: {
				type: chartType,
				marginTop: 30,
				zoomType: 'xy'
			},
			boost: {
				useAlpha: false,
				seriesThreshold: (chartType === 'column') ? 300 : 30,
				// debug: {
				//	timeSetup: true,
				//	timeSeriesProcessing: true,
				//	timeBufferCopy: true,
				//	timeKDTree: true,
				//	showSkipSummary: true,
				// },
				useGPUTranslations: true,
			},
			colors,
			title: {
				floating: true,
				align: 'center',
				text: title
			},
			xAxis: {
				type: 'datetime',
				plotLines: xAxisPlotLines,
			},
			tooltip: {
				useHTML: true,
				shared: series.length <= 8 || series.filter((x, index, array) => x.era == array[0].era && x.era != undefined).length == series.length,
				headerFormat: '<small>{point.key}</small><br/><table>',
				borderWidth: series.length <= 5 ? 0 : 1,
				pointFormat,
				footerFormat,
			},
			yAxis: {
				maxPadding: annotations ? 0.2 : 0,
				title: {text: null},
				visible: chartType !== 'streamgraph',
				startOnTick: chartType !== 'streamgraph',
				endOnTick: chartType !== 'streamgraph',
			},
			annotations,
			legend: {enabled: series.length < 26},
			plotOptions: {
				series: {
					marker: {
						enabled: false
					}
				},
				column: {
					stacking: 'normal',
					pointPadding: 0,
					groupPadding: 0,
					dataLabels: {
						enabled: false
					}
				},
			},
			series,
			exporting: {
				buttons: {
					contextButton: {
						// Because of FOE freezing removed next: "printChart", downloadPNG", "downloadJPEG", "downloadPDF", "downloadSVG"
						menuItems: ['viewFullscreen', 'separator', 'downloadCSV', 'downloadXLS', 'viewData'],
					}
				},
				sourceWidth: 800,
				sourceHeight: 600
			},
		});
	},


	/**
	 * Create series
	 *
	 * @returns {Promise<{series: [{data: this, name: string}], title: string}>}
	 */
	createRewardSeries: async () => {
		const {rewardSource} = Stats.state;		
		let data = null;

		if(Stats.DatePickerFrom !== null && Stats.DatePickerTo !== null){
			data = await IndexDB.db.statsRewards.where('date').between(Stats.DatePickerFrom, Stats.DatePickerTo).sortBy('date');
		} 
		else
			data = await IndexDB.db.statsRewards.orderBy('date').toArray();

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
			const rewardInfo = (rewardTypes.find(r => r.id === it) || {name: it});
			const iconClass = "";
			//if (rewardInfo.type === 'unit') {
			//	iconClass = `unit_icon ${rewardInfo.subType}" style="background-image:url('${srcLinks.get("/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_"+rewardInfo.subType+".jpg", true)}')`;
			//	console.log(rewardInfo)
			//} 
			// Asset image if not unit
			let pointImage = '';
			if (rewardInfo.type != 'unit') {
				let url = '';
				if ((rewardInfo.iconAssetName || rewardInfo.assembledReward && rewardInfo.assembledReward.iconAssetName)) {
					const icon = rewardInfo.assembledReward && rewardInfo.assembledReward.iconAssetName ? rewardInfo.assembledReward.iconAssetName : rewardInfo.iconAssetName;
					url = srcLinks.getReward(icon);
					//fix for fragment missing images for buildings
					if (rewardInfo.type == 'good' && rewardInfo.iconAssetName == 'random_goods' && rewardInfo.subType) {
						url = srcLinks.get(`/shared/icons/reward_icons/reward_icon_random_goods.png`, true);
					}
					if (rewardInfo.subType == 'fragment' && rewardInfo.subType) {
						if (rewardInfo.assembledReward.type == 'building' && rewardInfo.subType){
							url = srcLinks.get(`/city/buildings/${rewardInfo.assembledReward.subType.replace(/^(\w)_/, '$1_SS_')}.png`, true);
						}
					}
				}else if (rewardInfo.type == 'building' && rewardInfo.subType) {
						url = srcLinks.get(`/city/buildings/${rewardInfo.subType.replace(/^(\w)_/, '$1_SS_')}.png`, true);
				}
				if (url) {
					pointImage = `<img src="${url}" style="width: 45px; height: 45px; margin-right: 4px;">`
				}
				return {
					iconClass,
					pointImage,
					name: rewardInfo.name,
					y: seriesMapBySource[it]
				};
			}
			else {
				let url	= srcLinks.get("/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_"+rewardInfo.subType+".jpg", true);
				pointImage = `<img src="${url}" style="width: 45px; height: 45px; margin-right: 4px;">`
				console.log(rewardInfo)
				return {
					iconClass,
					pointImage,
					name: rewardInfo.name,
					y: seriesMapBySource[it]
				};
			}

		}).sort((a, b) => b.y - a.y);

		if (Stats.state.filter !="") {
			serieData = serieData.filter( a => a.name.toLowerCase().includes(Stats.state.filter.toLowerCase()))
		}


		return {
			title: i18n('Boxes.Stats.Rewards.SourceTitle.' + rewardSource),
			series: [{
				name: rewardSource,
				data: serieData
			}]
		}
	},


	/**
	 * Update reward chart
	 *
	 * @param series
	 * @param title
	 */
	updateRewardCharts: ({series, title}) => {
		Highcharts.chart('highcharts', {
			chart: {
				plotBackgroundColor: null,
				plotBorderWidth: null,
				plotShadow: false,
				type: 'pie',
			},
			title: {
				text: title,
			},
			tooltip: {
				useHTML: true,
				headerFormat: '',
				pointFormat: '<span class="{point.iconClass}"></span>{point.pointImage} {point.name}: <b>{point.y} ({point.percentage:.1f}%)</b>'
			},
			accessibility: {
				point: {
					valueSuffix: '%'
				}
			},
			plotOptions: {
				pie: {
					allowPointSelect: true,
					cursor: 'pointer',
					dataLabels: {
						enabled: true,
						format: '<b>{point.name}</b>: {point.y} ({point.percentage:.1f} %)'
					}
				}
			},
			series: series,
			exporting: {
				buttons: {
					contextButton: {
						// Because of FOE freezing removed next: "printChart", downloadPNG", "downloadJPEG", "downloadPDF", "downloadSVG"
						menuItems: ['viewFullscreen', 'separator', 'downloadCSV', 'downloadXLS', 'viewData'],
					}
				},
				sourceWidth: 800,
				sourceHeight: 600
			}
		});
	},


	/**
	 * Get ereas
	 *
	 * @returns {string[]}
	 */
	getSelectedEras: () => {
		const selectedEras = Object.keys(Stats.state.eras).filter(it => Stats.state.eras[it]);
		// preserv order or era, filter again using ResMap keys
		return Object.keys(Stats.ResMap).filter(era => selectedEras.includes(era));
	},


	/**
	 *
	 * @param src
	 * @returns {Promise<unknown>}
	 */
	promisedLoadCode: (src) => {
		return new Promise(async (resolve, reject) => {
			let sc = document.createElement('script');
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
	 * Load Highcharts
	 *
	 * @returns {Promise<void>}
	 */
	loadHighcharts: function () {
		if (!Stats._highChartPromise) {
			Stats._highChartPromise = load();
		}

		return Stats._highChartPromise;

		async function load()
		{
			const sources = [
				'highcharts.js',
				'modules/streamgraph.js',
				'modules/exporting.js',
				'modules/export-data.js',
				'modules/boost.js',
				'modules/annotations.js',
			];

			for (const file of sources) {
				const baseUrl = extUrl + 'vendor/highchart-8.0.4/';
				await Stats.promisedLoadCode(baseUrl + file);
			}

			await Stats.promisedLoadCode(extUrl + 'vendor/highchart-8.0.4/foe/foe-theme.js');

			// Use local timezone
			const timezone = new Date().getTimezoneOffset();

			Highcharts.setOptions({
				global: {
					timezoneOffset: timezone
				}
			});
		}
	},


	/* Handlers */
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

	addReward: async (type,amount,reward) => {
		//console.log(`add ${type} -  ${reward}: ${amount}`);
		IndexDB.db.statsRewards.add({
			date: MainParser.getCurrentDate(),
			type: type,
			amount: amount,
			reward: reward
		}).catch(error => {
			if (error.message == "Key already exists in the object store.") {
				setTimeout(()=>{Stats.addReward(type,amount,reward)},1) //retry if two rewards came in "at the same time"
			} else {
				console.log(error)
			}
		});
	}
};
let StockAlarm = {
	Alarms: JSON.parse(localStorage.getItem('StockAlarms') || '[]'),
	triggered: [],
	OptionsR: "",
	OptionsT: "",
	OptionsA: "",
	Type: null,
	Repeat: null,
			
	checkArmy: async () => {
		if (StockAlarm.Alarms == []) return;
		let alm = StockAlarm.Alarms.filter(data => data.type=="A")
		if (alm.length == 0) return
		await IndexDB.getDB();
		let x=IndexDB.db.statsUnitsH.orderBy('date').reverse().limit(2).toArray();
		await x;
		let oldX = x._value[1]?.army || {};
		let newX = x._value[0]?.army || {};
		StockAlarm.check(alm, oldX, newX);
	},

	checkResources: async () => {
		if (StockAlarm.Alarms == []) return;
		let alm = StockAlarm.Alarms.filter(data => data.type=="R")
		if (alm.length == 0) return
		await IndexDB.getDB();
		let x=IndexDB.db.statsTreasurePlayerH.orderBy('date').reverse().limit(2).toArray();
		await x;
		let oldX = x._value[1]?.resources || {};
		let newX = x._value[0]?.resources || {};
		StockAlarm.check(alm, oldX, newX);
	},

	checkTreasury: async () => {
		if (StockAlarm.Alarms == []) return;
		let alm = StockAlarm.Alarms.filter(data => data.type=="T")
		if (alm.length == 0) return
		await IndexDB.getDB();
		let x=IndexDB.db.statsTreasureClanH.orderBy('date').reverse().limit(2).toArray();
		await x;
		let oldX = x._value[1]?.resources || {};
		let newX = x._value[0]?.resources || {};
		StockAlarm.check(alm, oldX, newX);
	},

	check: (alm, oldX, newX) => {
		for (a of alm) {
			if (newX[a.id]<a.value) {
				switch (a.repeat) {
					case 0: //alarm every time
						trigger(a);
						break;
					case 1: //alarm once per session
						if (!StockAlarm.triggered.some(e => (e.id === a.id && e.type===a.type))) {
							trigger(a)
						}
						break;
					case 2: //alarm once
						if (oldX[a.id] > a.value) trigger(a);
						break;

				}
			}
		}
	},

	trigger: (alm) => {
		StockAlarm.triggered.push({type:alm.type,id:alm.id})
		HTML.ShowToastMsg({
			head: i18n('Boxes.LowStock.LowStockHeader'),
			text: replace(replace(i18n('Boxes.LowStock.LowStockMessage'),'%name%',alm.name),'%amount%',alm.value),
			type: 'warning',
			hideAfter: 20000,
		});
	},

	showDialogue: async () => {
		StockAlarm.Type ="R";
		StockAlarm.Repeat = 1;
	
		await IndexDB.getDB();
		let xA=IndexDB.db.statsUnitsH.orderBy('date').reverse().limit(1).toArray();
		await xA;
		let A=xA._value[0]?.army || {};
		let xR=IndexDB.db.statsTreasurePlayerH.orderBy('date').reverse().limit(1).toArray();
		await xR;
		let R = xR._value[0]?.resources || {};
		let xT=IndexDB.db.statsTreasureClanH.orderBy('date').reverse().limit(1).toArray();
		await xT;
		let T = xT._value[0]?.resources || {};
		let OR = [];
		let OT = [];
		let OA = [];
		era="";
		setClass = true;
		for (x of GoodsList) {
			if (era != x.era) {
				setClass = !setClass;
				era = x.era;
			}
			if (R[x.id]>0) OR.unshift(`<option value="${x.id}" data-name="${x.name}" class="${setClass ? 'LShighlight':''}">${x.name} (${R[x.id]})</option>`)
			if (T[x.id]>0) OT.unshift(`<option value="${x.id}" data-name="${x.name}" class="${setClass ? 'LShighlight':''}">${x.name} (${T[x.id]})</option>`)
		};
		era="";
		setClass = true;
		for (x of Unit.Types) {
			if (era != x.minEra) {
				setClass = !setClass;
				era = x.minEra;
			}
			if (A[x.unitTypeId]>0) OA.unshift(`<option value="${x.unitTypeId}" data-name="${x.name}" class="${setClass ? 'LShighlight':''}">${x.name} (${A[x.unitTypeId]})</option>`)
		};
		StockAlarm.OptionsR=OR.join();
		StockAlarm.OptionsA=OA.join();
		StockAlarm.OptionsT=OT.join();
		
		HTML.AddCssFile('stats');
        
        HTML.Box({
            id: 'LowStock',
            title: i18n('Boxes.LowStock.Title'),
            auto_close: true,
            dragdrop: true,
            minimize: true,
			resize : true
        });

		let htmltext = `<span id="LowStockType">`;
		htmltext += `<img class="options selected" data-type="R" src="${srcLinks.get("/shared/icons/reward_icons/reward_icon_random_goods.png",true)}">`;
		htmltext += `<img class="options" data-type="T" src="${srcLinks.get("/shared/icons/reward_icons/reward_icon_treasury_goods.png",true)}">`;
		htmltext += `<img class="options" data-type="A" src="${srcLinks.get("/shared/icons/reward_icons/reward_icon_all_units.png",true)}"></span>`;
		htmltext += `<select id="LowStockID">${StockAlarm.OptionsR}</select>`;
		htmltext += `<input id="LowStockValue" "type="Number" placeholder="alert threshold">`; //Add i18n!!
		htmltext += `<span id="LowStockRepeat">`;
		htmltext += `<img class="options" data-repeat="2" src="${extUrl}js/web/stats/images/once.png">`;
		htmltext += `<img class="options  selected" data-repeat="1" src="${extUrl}js/web/stats/images/once_per_session.png">`;
		htmltext += `<img class="options" data-repeat="0" src="${extUrl}js/web/stats/images/always.png"></span>`
		htmltext += `<span id="LowStockAddBtn" class="btn btn-default btn-green" onclick="StockAlarm.addbtn">+</span>`;
		htmltext += `<table class="foe-table" id="LowStockAlarmsList">`;
		htmltext += `<tr><th>type</th><th>name</th><th>threshold</th><th>repeat</th><th></th></tr>` //Add i18n!!
		htmltext += `</table>`;
		
		
		$('#LowStockBody').html(htmltext);

		for (let x of StockAlarm.Alarms) {
			StockAlarm.addline(x.type, x.id, x.name, x.value, x.repeat);
		}

		$('#LowStockType .options').on("click", (e) => {
			$('#LowStockType .options').removeClass("selected");
			e.target.classList.add("selected");
			StockAlarm.Type = e.target.dataset.type;
			$('#LowStockID').html(StockAlarm["Options" + StockAlarm.Type]);
		});
		$('#LowStockRepeat .options').on("click", (e) => {
			$('#LowStockRepeat .options').removeClass("selected");
			e.target.classList.add("selected");
			StockAlarm.Repeat = Number(e.target.dataset.repeat);
		});
		$('#LowStockAddBtn').on("click", (e) => {
			let IDel = document.getElementById("LowStockID");
			let id = IDel.value;
			let name = IDel.options[IDel.selectedIndex].dataset.name;
			let value = Number(document.getElementById("LowStockValue").value);
			StockAlarm.add(StockAlarm.Type,id, name,value,StockAlarm.Repeat);
			StockAlarm.addline(StockAlarm.Type,id, name,value,StockAlarm.Repeat);
		});
	},

	rembtn:(e) =>{
		let line= e.target.parentElement.parentElement;
		let type= e.target.dataset.type;
		let id= e.target.dataset.id;
		let name= e.target.dataset.name;
		let value= Number(e.target.dataset.value);
		let repeat= Number(e.target.dataset.repeat);
		StockAlarm.remove(type,id, name,value,repeat)
		line.remove()
	},
	
	add: (type, id, name, value, repeat) => {
		StockAlarm.Alarms.push({
			type: type,
			id: id,
			name: name,
			value: value,
			repeat: repeat
		})
		localStorage.setItem("StockAlarms",JSON.stringify(StockAlarm.Alarms));
	},

	addline: (type, id, name, value, repeat)=>{
		let table = document.getElementById('LowStockAlarmsList');
		let row = table.insertRow(1);
		let typeImg = '';
		switch (type) {
			case "R": 
				typeImg = srcLinks.get("/shared/icons/reward_icons/reward_icon_random_goods.png",true);
				break;
			case "T":
				typeImg = srcLinks.get("/shared/icons/reward_icons/reward_icon_treasury_goods.png",true);
				break;
			case "A":
				typeImg = srcLinks.get("/shared/icons/reward_icons/reward_icon_all_units.png",true);
				break;
		}
		let repeatImg = '';
		switch (repeat) {
			case 0: 
				repeatImg = extUrl + "js/web/stats/images/always.png";
				break;
			case 1:
				repeatImg = extUrl + "js/web/stats/images/once_per_session.png";
				break;
			case 2:
				repeatImg = extUrl + "js/web/stats/images/once.png";
				break;
		}
		html = `<td><img src="${typeImg}"></td>`;
		html += `<td>${name}</td>`;
		html += `<td>${value}</td>`;
		html += `<td><img src="${repeatImg}"></td>`;
		html += `<td><span class="btn btn-default btn-delete LowStockRemBtn" data-id="${id}" data-name="${name}" data-value="${value}" data-repeat="${repeat}" data-type="${type}" onclick="StockAlarm.rembtn(event)">-</span></td>`;
		
		row.innerHTML = html;
		
	},

	remove: (type, id, name, value, repeat) => {
		let i = StockAlarm.Alarms.findIndex( x => x.type==type && x.id==id && x.name == name && x.repeat == repeat && x.value == value);
		if (i>-1) {
			StockAlarm.Alarms.splice(i,1);
			localStorage.setItem("StockAlarms",JSON.stringify(StockAlarm.Alarms));
			$(`#LowStockType [data-type="${type}"]`).trigger("click");
			$(`#LowStockRepeat [data-repeat="${repeat}"]`).trigger("click");
			$(`#LowStockValue`).val(value);
			$(`#LowStockValue option[value="${id}"]`).prop('selected', true)
		}
	}

}