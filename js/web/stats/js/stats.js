/*
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * Licensed under AGPL - see LICENSE.md for details.
 */

// GBG leader board log
FoEproxy.addHandler('GuildBattlegroundService', 'getPlayerLeaderboard', async (data, postData) => {
	Stats.HandlePlayerLeaderboard(data.responseData);
});

// Gildengefechte
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
	var [rewards, rewardIncidentSource] = r; // pair, 1st is reward list, second source of incident, e.g spoilsOfWar
    await IndexDB.getDB();
	
	if (rewardIncidentSource == "event_pass") {
		if (postData[0].requestData[0].indexOf('guild_raids') >=0) rewardIncidentSource = 'guild_raids'
	}
	for (let reward of rewards) {

		if (rewardIncidentSource === 'hidden_reward') {
			//split flying island incidents from Ad-chests
			if (ActiveMap == 'cultural_outpost'){
				rewardIncidentSource = 'shards';
			}
		}
		if (rewardIncidentSource === 'living_city') {
			rewardIncidentSource = 'hidden_reward'
		}
		
		if (rewardIncidentSource === 'default') {
			//ignore league rewards and fragment assembly
			if(postData[0].requestMethod === 'useItem'){
				continue;
			}
			//ignore quest rewards
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

FoEproxy.addHandler('RewardService', 'collectRewardSet', async (data, postData) => {
	let rewardIncidentSource = data.responseData.context;
	if (rewardIncidentSource!='guild_raids' && rewardIncidentSource.indexOf('guild_raids')>=0) rewardIncidentSource='guild_raidsP'; //QI-Pass detection
	if (rewardIncidentSource.indexOf('event')<0 && !["guild_raids","guild_raidsP"].includes(rewardIncidentSource)) return; //exclude Main city collection "collect all", "aid_all"
	let rewards = data.responseData.reward.rewards;
    await IndexDB.getDB();
	
	for (let reward of rewards) {
		
		//QI reward splitting
		let n = 1
		if (rewardIncidentSource == 'guild_raids') {
			let ref = null
			for (ref of (Stats.QI.RewardLookUp?.[Stats.QI.currentNode]?.[reward.type+"#"+reward.subType] || [])) {
				n = reward.amount / ref.amount;
				if (n!=Math.floor(n)) {
					n = 1;
				} else {
					break;
				}
			}			
			if (n!=1) reward = ref;
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
		for (let i=0;i<n;i++) {
			let ris = rewardIncidentSource == 'guild_raidsP' ? 'guild_raids' : rewardIncidentSource;
			await Stats.addReward(ris, reward.amount ||0, reward.id);
		}
	}
});

//reward split for QI
FoEproxy.addHandler('GuildRaidsMapService', 'getNodeExtendedInfo', async (data, postData) => {
	let rewards = data.responseData?.reward?.reward?.possible_rewards
	let nodeId = postData?.[0]?.requestData?.[0];
	
	if (!nodeId) return;
	
	Stats.QI.RewardLookUp[nodeId]={}
	
	if (!rewards) 	return
	
	for (let r of rewards) {
		if (r.reward.type == 'chest') {
			for (let c of r.reward.possible_rewards) {
				if (!Stats.QI.RewardLookUp[nodeId][c.reward.type+"#"+c.reward.subType]) Stats.QI.RewardLookUp[nodeId][c.reward.type+"#"+c.reward.subType]=[];
				Stats.QI.RewardLookUp[nodeId][c.reward.type+"#"+c.reward.subType].push(c.reward);
			}
		} else {
			if (!Stats.QI.RewardLookUp[nodeId][r.reward.type+"#"+r.reward.subType]) Stats.QI.RewardLookUp[nodeId][r.reward.type+"#"+r.reward.subType]=[];
			Stats.QI.RewardLookUp[nodeId][r.reward.type+"#"+r.reward.subType].push(r.reward);
		}
	}
}),

FoEproxy.addHandler('GuildRaidsMapService', 'getOverview', async (data, postData) => {
	Stats.QI.currentNode = data.responseData.currentNode;
}),
FoEproxy.addHandler('GuildRaidsMapService', 'move', async (data, postData) => {
	Stats.QI.currentNode = postData[0].requestData[0].pop();
}),


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
FoEproxy.addHandler('ResourceService', 'getPlayerResourceBag', async (data, postData) => {
	if (data.responseData?.type?.value && data.responseData?.type?.value != 'PlayerMain') return; // for now ignore all other source types
	const r = data.responseData?.resources?.resources || data.responseData?.resources;
	if (!r) return;
	
	await IndexDB.getDB();

    await IndexDB.db.statsTreasurePlayerD.put({
		date: moment().startOf('day').toDate(),
		resources: r
	});

	await IndexDB.db.statsTreasurePlayerH.put({
		date: moment().startOf('hour').toDate(),
		resources: r
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

FoEproxy.addHandler('ClanService', 'getTreasuryBag', async (data, postData) => {
	if (data.responseData?.type?.value && data.responseData?.type?.value != 'ClanMain') return; // for now ignore all other source types
	const r = data.responseData?.resources?.resources || data.responseData?.resources;
	if (!r) return;
	
    await IndexDB.getDB();

	await IndexDB.db.statsTreasureClanD.put({
		date: moment().startOf('day').toDate(),
		clanId: ExtGuildID,
		resources: r
	});

	await IndexDB.db.statsTreasureClanH.put({
		date: moment().startOf('hour').toDate(),
		clanId: ExtGuildID,
		resources: r
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


let Stats = {

	isVisitingCulturalOutpost: false,
	goodsSubTypes:[],
	ResMap: {
		NoAge: ['money', 'supplies', 'tavern_silver', 'medals', 'premium', 'guild_raids_medals'],
		special: ['promethium', 'orichalcum', 'mars_ore', 'asteroid_ice', 'venus_carbon', 'unknown_dna','crystallized_hydrocarbons','dark_matter'],
	},

	QI:{
		RewardLookUp:{},
		stage:"",
		currentNode:""
	},
	PlayableEras: [],

	// State for UI
	state: {
		source: 'statsTreasurePlayerD', // Source of data - indexdb table name
		chartType: 'line', // chart type
		eras: {}, // Selected era for filtering data,
		eraSelectOpen: false, // Dropdown
		isGroupByEra: false,
		isRenormalize: false,
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
				if (GoodsList[(Era - 2) * 5 + i]) {
					let g = GoodsList[(Era - 2) * 5 + i].id
					Stats.ResMap[EraName].push(g);
					Stats.goodsSubTypes.push(g);
				}
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
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			};

			HTML.Box(args);
			//moment.locale(18n('Local'));
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

				case 'renormalizeToggle':
					Stats.state.isRenormalize = !Stats.state.isRenormalize;
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
						Stats.state.chartType = 'line';
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
		$('.stats-data-table').remove();
	},


	/**
	 * Render box content
	 *
	 * @returns {Promise<void>}
	 */
	Render: async () => {
		$('#statsBody').html(`<div class="options">${Stats.RenderOptions()}</div>
							<div class="options-2"></div>
							<div id="statsWrapper"><div id="statsTitle"></div><canvas id="statsChart"></canvas>
							<div id="statsLegendWrapper">
								<div class="StatsRewardFilter">
									<input type="text" id="StatsRewardFilter" placeholder="${i18n("Boxes.Stats.FilterRewards")}" value="${Stats.state.filter}" oninput="Stats.state.filter=this.value;Stats.updateCharts();">
								</div>
								<div id="statsLegend"></div>
							</div>
							<div id="statsTooltip" style="display:none;"></div></div>`);

		Stats.updateOptions();
		await helper.loadChartJS();
		await Stats.updateCharts(Stats.DatePickerStart, Stats.DatePickerEnd);
	},


	/**
	 * Update options
	 */
	updateOptions: () => {
		$('#statsBody .options').html(Stats.RenderOptions());

		$('#statsBody').promise().done(function(){
			if ($('#StatsDatePicker').length > 0) {
				$('#StatsDatePicker').text(`${Stats.formatRange()}`);

				// remove from body, because it was attached every time stats were opened
				if (Stats.DatePickerObj) {
					Stats.DatePickerObj.destroy();
					Stats.DatePickerObj = null;
				}

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
						// get now if day is today
						if (end.getDate() === MainParser.getCurrentDate().getDate() && end.getMonth() === MainParser.getCurrentDate().getMonth() && end.getYear() === MainParser.getCurrentDate().getYear()) 
							end = MainParser.getCurrentDate();
						else
							// otherwise, take end of day for end date
							end.setHours(23);
							end.setMinutes(59);
							end.setSeconds(59);
							end.setMilliseconds(999);

						Stats.DatePickerFrom = start;
						Stats.DatePickerTo = end;
						
						$('#StatsDatePicker').text(`${Stats.formatRange()}`);

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

		const btnSelectNextEra = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnNextEra'),
			isActive: selectedEras.length === 1 && selectedEras[0] === Technologies.EraNames[CurrentEraID + 1],
			dataType: 'selectEras',
			disabled: !Stats.isSelectedPlayerSources() && !Stats.isSelectedTreasureSources() && !Stats.isSelectedUnitSources(),
			value: Technologies.EraNames[CurrentEraID + 1]
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

		const chartTypes = ['line', 'delta'].map(it => Stats.RenderButton({
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
				'hidden_reward', //incidents
				'__event', //event rewards
				'battlegrounds_conquest', // Battlegrounds
				'guildExpedition', // Temple of Relics
				'guild_raids', //Quantum Incursion
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
	RenderButton: ({ name, isActive, dataType, value, title, disabled }) => `<button ${disabled ? 'disabled' : ''} class="btn btn-slim${!disabled && isActive ? ' btn-active' : ''} ${dataType}" data-type="${dataType}" data-value="${value}" title="${(title || '').replace(/"/g,'&quot;')}"><span>${name}</span></button>`,


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
	 * Battlegrounds series
	 *
	 * @param dates		Date obj with {start, end}
	 * @returns {Promise<{series: {data, avatarUrl: (string|string), name: string}[]}>}
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
				era: era ? i18n('Eras.' + Technologies.Eras[era] + '.short') : '',
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
				name: i18n('Eras.' + Technologies.Eras[era] + '.short'),
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

		// Build color set - brighten each resource within an era from the era's base hue
		if (selectedEras.length > 1) {
			let colorIndex = 0;
			colors = [];
			selectedEras.forEach(era => {
				const hue = (colorIndex % 9) * 40; // spread 9 base hues across 360°
				colorIndex++;
				Stats.ResMap[era].forEach((it, index) => {
					const lightness = 45 + index * 5; // brighten each successive good
					colors.push(`hsl(${hue}, 70%, ${lightness}%)`);
				});
			});
		}

		const selectedResources = Stats.getSelectedEras()
			.map(it => Stats.ResMap[it])
			.reduce((acc, it) => acc.concat(it), []);

		const series = selectedResources.map(it => {
			const goodsData = (GoodsData[it] || {name: it})
			return {
				era: goodsData.era ? i18n('Eras.' + Technologies.Eras[goodsData.era] + '.short') : '',
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
				name: i18n('Eras.' + Technologies.Eras[era] + '.short'),
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

		// Build color set - brighten each resource within an era from the era's base hue
		if (selectedEras.length > 1) {
			let colorIndex = 0;
			colors = [];
			selectedEras.forEach(era => {
				const hue = (colorIndex % 9) * 40;
				colorIndex++;
				Stats.ResMap[era].forEach((it, index) => {
					const lightness = 45 + index * 5;
					colors.push(`hsl(${hue}, 70%, ${lightness}%)`);
				});
			});
		}

		const selectedResources = Stats.getSelectedEras()
			.map(it => Stats.ResMap[it])
			.reduce((acc, it) => acc.concat(it), []);

		const series = selectedResources.map(it => {
			const goodsData = (GoodsData[it] || {name: it})
			return {
				era: goodsData.era ? i18n('Eras.' + Technologies.Eras[goodsData.era] + '.short') : '',
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
		};
	},


	/**
	 * Calculate diff between points and use it as 'y', change chartType to 'bar'
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
		} else if (Stats.state.isRenormalize) {
			series = series.map(s => {
				let vals = s.data.map(x=>x[1])
				let min = Math.min(...vals);
				let max = Math.max(...vals);
				let range = max - min;
				s.data = s.data.map(it => [it[0], max==0 ? 1 : (it[1]) / max]);
				return s;
			});
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
	 * Add alpha to any CSS color string (hex, hsl, rgb)
	 *
	 * @param color
	 * @param alpha  0–1
	 * @returns {string}
	 */
	colorWithAlpha: (color, alpha) => {
		if (color.startsWith('hsl('))
			return color.replace('hsl(', 'hsla(').replace(')', `, ${alpha})`);
		if (color.startsWith('rgb('))
			return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
		// hex #rrggbb or #rgb — append two-digit alpha
		if (color.startsWith('#'))
			return color + Math.round(alpha * 255).toString(16).padStart(2, '0');
		return color;
	},


	/**
	 * Update chart
	 *
	 * @param series
	 * @param colors
	 * @param chartType
	 * @returns {Promise<void>}
	 */
	updateCommonChart: async ({series, colors, chartType}) => {
		const title = i18n('Boxes.Stats.SourceTitle.' + Stats.state.source);
		const isColumn = chartType === 'column';

		const defaultColors = [
			'#62a2df','#434357','#8ecf70','#db9255','#7478c7',
			'#d35572','#d4c33e','#2b908f','#d15959','#7acfc8'
		];
		const palette = colors || defaultColors;

		// Map series to Chart.js datasets; data is [[timestamp, value], ...]
		const datasets = series.map((s, i) => {
			const color = palette[i % palette.length];
			return {
				label: s.name,
				data: s.data.map(([x, y]) => ({x, y})),
				borderColor: color,
				backgroundColor: isColumn ? color : Stats.colorWithAlpha(color, 0.2),
				borderWidth: isColumn ? 0 : 1.5,
				barThickness: isColumn ? 3 : undefined,
				pointRadius: 0,
				pointHoverRadius: 4,
				fill: false,
				// custom metadata for tooltip and legend
				_meta: { era: s.era, goodsId: s.goodsId, unitUrl: s.unitUrl, avatarUrl: s.avatarUrl },
			};
		});

		const isSharedTooltip = series.length <= 8 ||
			series.every(x => x.era !== undefined && x.era === series[0].era);

		// Destroy previous instance and clear UI elements
		if (Stats._chartInstance) {
			Stats._chartInstance.destroy();
			Stats._chartInstance = null;
		}
		$('#statsLegend').empty();
		$('#statsTooltip').hide();
		$('#statsTitle').text(title);
		$('#statsBody').removeClass('stats-doughnut');

		const ctx = document.getElementById('statsChart');
		if (!ctx) return;

		ctx.style.maxHeight = '';

		const htmlLegendPlugin = {
			id: 'htmlLegend',
			afterUpdate(chart) {
				const container = document.getElementById('statsLegend');
				if (!container) return;

				const items = chart.options.plugins.legend.labels.generateLabels(chart);
				container.innerHTML = items.map(item => {
					const hidden = item.hidden ? 'stats-legend-hidden' : '';
					const meta = chart.data.datasets[item.datasetIndex]?._meta || {};
					const img = meta.unitUrl
						? `<img src="${meta.unitUrl}" class="stats-legend-img">`
						: meta.avatarUrl
							? `<img src="${meta.avatarUrl}" class="stats-legend-img">`
							: '';
					return `<div class="stats-legend-item ${hidden}" data-index="${item.datasetIndex}">
						<span class="stats-legend-swatch" style="background:${item.strokeStyle};border-color:${item.strokeStyle};"></span>
						${img}
						<span class="stats-legend-label">${item.text}</span>
					</div>`;
				}).join('');

				container.querySelectorAll('.stats-legend-item').forEach(el => {
					el.addEventListener('click', () => {
						const index = Number(el.dataset.index);
						const meta = chart.getDatasetMeta(index);
						meta.hidden = !meta.hidden;
						el.classList.toggle('stats-legend-hidden');
						chart.update();
					});
				});
			}
		};

		Stats._chartInstance = new Chart(ctx, {
			type: isColumn ? 'bar' : 'line',
			data: { datasets },
			options: {
				animation: false,
				responsive: true,
				maintainAspectRatio: true,
				layout: {
					padding: { top: 30, bottom: 50 }
				},
				plugins: {
					title: {
						display: false,
					},
					legend: {
						display: false,
					},
					tooltip: {
						enabled: false,
						mode: isSharedTooltip ? 'index' : 'nearest',
						intersect: false,
						external: ({chart, tooltip}) => {
							const el = document.getElementById('statsTooltip');
							if (!el) return;

							if (tooltip.opacity === 0) {
								el.style.display = 'none';
								return;
							}

							const dateTitle = tooltip.dataPoints?.length
								? moment(tooltip.dataPoints[0].parsed.x).format(i18n('Date'))
								: '';

							const rows = (tooltip.dataPoints || []).map(item => {
								const ds = item.dataset;
								const meta = ds._meta || {};
								const color = ds.borderColor;
								const val = item.parsed.y;
								const era = meta.era ? `${meta.era}:` : '';
								const img = meta.unitUrl
									? `<img src="${meta.unitUrl}" class="stats-tooltip-img">`
									: meta.avatarUrl
										? `<img src="${meta.avatarUrl}" class="stats-tooltip-img">`
										: meta.goodsId
											? `<span class="goods-sprite sprite-50 ${meta.goodsId}"></span>`
											: '';
								return `<li class="flex between">
									<span class="legend">${img} <span class="stats-tooltip-swatch" style="background:${color};"></span> ${era} ${ds.label}:</span>
									<b>${HTML.Format(val)}</b>
								</li>`;
							});

							el.innerHTML = `<div class="stats-tooltip-title">${dateTitle}</div>
								<ul class="simpleList">${rows.join('')}</ul>`;

							// Position relative to the chart canvas
							const canvasRect = chart.canvas.getBoundingClientRect();
							const bodyRect = document.body.getBoundingClientRect();
							const statsRect = document.getElementById('stats')?.getBoundingClientRect() || bodyRect;

							let left = canvasRect.left - statsRect.left + tooltip.caretX + 12;
							let top = canvasRect.top - statsRect.top + tooltip.caretY;

							el.style.display = 'block';

							// Flip horizontally if overflowing right edge
							if (left + el.offsetWidth > statsRect.width) {
								left = canvasRect.left - statsRect.left + tooltip.caretX - el.offsetWidth - 12;
							}

							el.style.left = left + 'px';
							el.style.top = top + 'px';
						},
					},
					zoom: {
						pan: { enabled: true, mode: 'xy' },
						zoom: {
							wheel: { enabled: true },
							pinch: { enabled: true },
							mode: 'xy',
						},
					},
				},
				scales: {
					x: {
						type: 'time',
						time: {
							tooltipFormat: i18n('Date'),
						},
					},
					y: {
						stacked: isColumn,
						ticks: {
							callback: (val) => Math.abs(val) >= 1000 ? Stats.kilos(val) : +val.toFixed(3),
						},
					},
				},
			},
			plugins: [htmlLegendPlugin],
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
			let url = '';
			let text = '';
			let amount = seriesMapBySource[it] || 1;
			if (rewardInfo.type == "resource" && Stats.goodsSubTypes.includes(rewardInfo.subType)) rewardInfo.type="good";
			switch (rewardInfo.type) {
				case 'unit':
					if (rewardInfo.subType == "rogue") {
						url	= srcLinks.get("/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_rogue.jpg", true);
						text = rewardInfo.name;
					} else {
						url = srcLinks.get("/shared/gui/pvp_arena/hud/pvp_arena_icon_army.png",true);
						text = rewardInfo.amount + " " + (rewardInfo.amount > 1 ? i18n("General.Units"):i18n("General.Unit"));
					}
					pointImage = `<img src="${url}" />`
					//console.log(rewardInfo)
					return {
						iconClass,
						pointImage,
						name: text,
						y: amount
					};
				case 'good':
					url = srcLinks.get("/shared/icons/goods/goods.png",true);
					text = rewardInfo.amount + " " + (rewardInfo.amount > 1 ? i18n("General.Goods"):i18n("General.Good"));

					pointImage = `<img src="${url}" />`
					return {
						iconClass,
						pointImage,
						name: text,
						y: amount
					};
				default:
					url = '';
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
					} else if (rewardInfo.type == 'building' && rewardInfo.subType) {
							url = srcLinks.get(`/city/buildings/${rewardInfo.subType.replace(/^(\w)_/, '$1_SS_')}.png`, true);
					}
					if (url) {
						pointImage = `<img src="${url}">`
					}
					return {
						iconClass,
						pointImage,
						name: rewardInfo.name,
						y: amount
					};
			}

		})
		let i=0;
		while (i<serieData.length) {
			let x = serieData.findIndex((it,j) => j > i && it.name == serieData[i].name)
			if (x>=1) {
				serieData[i].y+=serieData[x].y;
				serieData.splice(x,1);
			} else {
				i+=1;
			}
		} 

		serieData = serieData.sort((a, b) => b.y - a.y);

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
		// series[0].data is [{name, y, pointImage, iconClass}, ...]
		const serieData = series[0]?.data || [];

		// Destroy previous instance and clear UI elements
		if (Stats._chartInstance) {
			Stats._chartInstance.destroy();
			Stats._chartInstance = null;
		}
		$('#statsLegend').empty();
		$('#statsTooltip').hide();
		$('#statsTitle').text(title);
		$('#statsBody').addClass('stats-doughnut');

		const ctx = document.getElementById('statsChart');
		if (!ctx) return;

		ctx.style.maxHeight = '550px';

		const total = serieData.reduce((acc, d) => acc + d.y, 0);

		const defaultColors = [
			'#62a2df','#434357','#8ecf70','#db9255','#7478c7',
			'#d35572','#d4c33e','#2b908f','#d15959','#7acfc8'
		];

		const htmlLegendPlugin = {
			id: 'htmlLegend',
			afterUpdate(chart) {
				const container = document.getElementById('statsLegend');
				if (!container) return;

				const dataset = chart.data.datasets[0];
				const meta = chart.getDatasetMeta(0);
				container.innerHTML = chart.data.labels.map((label, i) => {
					const color = dataset.backgroundColor[i] || '#ccc';
					const hidden = meta.data[i]?.hidden ? 'stats-legend-hidden' : '';
					const pointImage = dataset._pointImages?.[i] || '';
					const pct = total > 0 ? ((serieData[i].y / total) * 100).toFixed(1) : 0;
					return `<span class="stats-legend-item ${hidden}" data-index="${i}">
						<span class="stats-legend-swatch" style="background:${color};"></span>
						${pointImage ? `<span class="stats-legend-img">${pointImage}</span>` : ''}
						<span class="stats-legend-label">${label}: ${HTML.Format(serieData[i].y)} (${pct}%)</span>
					</span>`;
				}).join('');

				container.querySelectorAll('.stats-legend-item').forEach(el => {
					el.addEventListener('click', () => {
						const index = Number(el.dataset.index);
						const pointMeta = chart.getDatasetMeta(0).data[index];
						pointMeta.hidden = !pointMeta.hidden;
						el.classList.toggle('stats-legend-hidden');
						chart.update();
					});
				});
			}
		};

		Stats._chartInstance = new Chart(ctx, {
			type: 'doughnut',
			data: {
				labels: serieData.map(d => d.name),
				datasets: [{
					data: serieData.map(d => d.y),
					backgroundColor: serieData.map((_, i) => defaultColors[i % defaultColors.length]),
					borderColor: '#222',
    				borderWidth: 0.5,
					_pointImages: serieData.map(d => d.pointImage || ''),
				}],
			},
			options: {
				animation: false,
				responsive: true,
				maintainAspectRatio: false,
				layout: {
					padding: 20,
				},
				plugins: {
					title: {
						display: false,
					},
					legend: {
						display: false,
					},
					tooltip: {
						enabled: false,
						external: ({chart, tooltip}) => {
							const el = document.getElementById('statsTooltip');
							if (!el) return;

							if (tooltip.opacity === 0) {
								el.style.display = 'none';
								return;
							}

							const item = tooltip.dataPoints?.[0];
							if (!item) return;

							const index = item.dataIndex;
							const dataset = chart.data.datasets[0];
							const label = chart.data.labels[index];
							const val = item.parsed;
							const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
							const pointImage = dataset._pointImages?.[index] || '';
							const color = dataset.backgroundColor[index] || '#ccc';

							el.innerHTML = `<div class="stats-tooltip-title">
									<span class="stats-tooltip-swatch" style="background:${color};"></span>
									${pointImage}
									<span>${label}</span>
								</div>
								<div class="stats-tooltip-value"><b>${val}</b> (${pct}%)</div>`;

							const canvasRect = chart.canvas.getBoundingClientRect();
							const statsRect = document.getElementById('stats')?.getBoundingClientRect() || document.body.getBoundingClientRect();

							let left = canvasRect.left - statsRect.left + tooltip.caretX + 12;
							let top = canvasRect.top - statsRect.top + tooltip.caretY;

							el.style.display = 'block';

							if (left + el.offsetWidth > statsRect.width) {
								left = canvasRect.left - statsRect.left + tooltip.caretX - el.offsetWidth - 12;
							}

							el.style.left = left + 'px';
							el.style.top = top + 'px';
						},
					},
				},
			},
			plugins: [htmlLegendPlugin],
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
			if (error.inner.name == "ConstraintError") {
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
		htmltext += `<span id="LowStockAddBtn" class="btn btn-green" onclick="StockAlarm.addbtn">+</span>`;
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
		html += `<td><span class="btn btn-delete LowStockRemBtn" data-id="${id}" data-name="${name}" data-value="${value}" data-repeat="${repeat}" data-type="${type}" onclick="StockAlarm.rembtn(event)">-</span></td>`;
		
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