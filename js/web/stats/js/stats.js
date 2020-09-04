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

// Reward log
FoEproxy.addHandler('RewardService', 'collectReward', async (data, postData) => {
	const r = data.responseData;
	if (!Array.isArray(r)) {
		return;
	}
	const [rewards, rewardIncidentSource] = r; // pair, 1st is reward list, second source of incident, e.g spoilsOfWar

    await IndexDB.getDB();

	for (let reward of rewards) {
		// default is incident reward
		if (rewardIncidentSource == 'default') {
			continue;
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
		await IndexDB.db.statsRewards.add({
			date: MainParser.getCurrentDate(),
			type: rewardIncidentSource,
			amount: reward.amount || 0,
			reward: reward.id
		});
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
});

// Player Army log
FoEproxy.addHandler('ArmyUnitManagementService', 'getArmyInfo', async (data, postData) => {
	const r = data.responseData;
	if (ActiveMap !== 'main') {
		return;
	}

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
});

let Stats = {

	isVisitingCulturalOutpost: false,

	ResMap: {
		NoAge: ['money', 'supplies', 'tavern_silver', 'medals', 'premium'],
		StoneAge: [],
		BronzeAge: ['dye', 'cypress', 'alabaster', 'sandstone', 'wine'],
		IronAge: ['cloth', 'ebony', 'lead', 'gems', 'limestone'],
		EarlyMiddleAge: ['marble', 'bronze', 'gold', 'granite', 'honey'],
		HighMiddleAge: ['brick', 'herbs', 'glass', 'ropes', 'salt'],
		LateMiddleAge: ['basalt', 'brass', 'gunpowder', 'silk', 'talc'],
		ColonialAge: ['coffee', 'porcelain', 'paper', 'tar', 'wire'],
		IndustrialAge: ['coke', 'fertilizer', 'rubber', 'textiles', 'whaleoil'],
		ProgressiveEra: ['asbestos', 'explosives', 'petroleum', 'machineparts', 'tinplate'],
		ModernEra: ['convenience_food', 'ferroconcrete', 'flavorants', 'luxury_materials', 'packaging'],
		PostModernEra: ['dna_data', 'filters', 'renewable_resources', 'semiconductors', 'steel'],
		ContemporaryEra: ['bionics', 'electromagnets', 'gas', 'plastics', 'robots'],
		TomorrowEra: ['nutrition_research', 'papercrete', 'preservatives', 'smart_materials', 'translucent_concrete'],
		FutureEra: ['algae', 'biogeochemical_data', 'nanoparticles', 'purified_water', 'superconductors'],
		ArcticFuture: ['ai_data', 'bioplastics', 'nanowire', 'paper_batteries', 'transester_gas'],
		OceanicFuture: ['artificial_scales', 'biolight', 'corals', 'pearls', 'plankton'],
		VirtualFuture: ['cryptocash', 'data_crystals', 'golden_rice', 'nanites', 'tea_silk'],
		SpaceAgeMars: ['biotech_crops', 'lubricants', 'fusion_reactors', 'mars_microbes', 'superalloys'],
		SpaceAgeAsteroidBelt: ['bromine', 'compound_fluid', 'processed_material', 'platinum_crystals', 'nickel'],
		SpaceAgeVenus: [],
		special: ['promethium', 'orichalcum', 'mars_ore', 'asteroid_ice']
	},

	PlayableEras: [
		'BronzeAge',
		'IronAge',
		'EarlyMiddleAge',
		'HighMiddleAge',
		'LateMiddleAge',
		'ColonialAge',
		'IndustrialAge',
		'ProgressiveEra',
		'ModernEra',
		'PostModernEra',
		'ContemporaryEra',
		'TomorrowEra',
		'FutureEra',
		'ArcticFuture',
		'OceanicFuture',
		'VirtualFuture',
		'SpaceAgeMars',
		'SpaceAgeAsteroidBelt',
		'SpaceAgeVenus'
	],

	// State for UI
	state: {
		source: 'statsTreasurePlayerH', // Source of data - indexdb table name
		chartType: 'streamgraph', // chart type
		eras: {}, // Selected era for filtering data,
		eraSelectOpen: false, // Dropdown
		isGroupByEra: false,
		showAnnotations: false, // GvG annotations
		period: 'today',
		rewardSource: 'guildExpedition', // filter by type of reward
		currentType: null
	},

	DatePickerObj: null,

	treasureSources: ['statsTreasurePlayerH', 'statsTreasurePlayerD', 'statsTreasureClanH', 'statsTreasureClanD'],
	unitSources: ['statsUnitsH', 'statsUnitsD'],
	rewardSources: ['statsRewards'],
	gbgSources: ['statsGBGPlayers'],
	isSelectedTreasureSources: () => Stats.treasureSources.includes(Stats.state.source),
	isSelectedUnitSources: () => Stats.unitSources.includes(Stats.state.source),
	isSelectedRewardSources: () => Stats.rewardSources.includes(Stats.state.source),
	isSelectedGBGSources: () => Stats.gbgSources.includes(Stats.state.source),

	/**
	 * Show Box
	 */
	Show: () => {
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
					const isChangedToMyTreasure = ['statsTreasurePlayerH', 'statsTreasurePlayerD'].includes(value) && !Stats.isSelectedTreasureSources();
					const isChangedToClanTreasure = ['statsTreasureClanH', 'statsTreasureClanD'].includes(value) && !Stats.isSelectedTreasureSources();
					const isChangedToReward = Stats.rewardSources.includes(value) && !Stats.isSelectedRewardSources();
					const isChangedToGBG = Stats.gbgSources.includes(value) && !Stats.isSelectedGBGSources();

					if (isChangedToUnit) {
						// if Changed to units than select all eras by default
						Stats.state.eras = {};
						Object.keys(Stats.ResMap).map(it => Stats.state.eras[it] = true);

					} else
						if (isChangedToMyTreasure) {
							// If changed to player's treasure select 2 last eras
							Stats.state.eras = {};
							Stats.state.eras = {
								[Technologies.EraNames[CurrentEraID]]: true,
							};

							if (CurrentEraID > 2) {
								Stats.state.eras[Technologies.EraNames[CurrentEraID - 1]] = true;
							}

						} else
							if (isChangedToClanTreasure) {
								// If changed to treasure select all playable eras
								Stats.state.eras = {};
								Stats.PlayableEras.forEach(era => Stats.state.eras[era] = true);

							} else
								if (isChangedToGBG) {
									Stats.state.chartType = 'delta';
									Stats.isGG = true;

								} else
									if (isChangedToReward) {
										Stats.state.period = 'sinceTuesday';
										Stats.state.rewardSource = 'guildExpedition';
									}

					Stats.state.source = value || 'statsTreasurePlayerH';
					break;

				case 'setChartType':
					Stats.state.chartType = value;
					break;

				case 'setPeriod':
					Stats.state.period = value;
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
		await Stats.updateCharts();
	},


	/**
	 * Update options
	 */
	updateOptions: () => {
		$('#statsBody .options').html(Stats.RenderOptions());
		let secondaryOptions = Stats.isSelectedRewardSources() ? Stats.RenderSecondaryOptions() : '';

		$('#statsBody .options-2').html(secondaryOptions).promise().done(function(){
			/*
			if ($('#GVGDatePicker').length > 0) {

				Stats.DatePickerObj = new Litepicker({
					element: document.getElementById('GVGDatePicker'),
					format: i18n('Date'),
					lang: MainParser.Language,
					singleMode: false,
					maxDate: MainParser.getCurrentDate(),
					showWeekNumbers: true,
					onSelect: async function (start, end) {
						$('#GVGDatePicker').text(`${start} - ${end}`);

						return await Stats.updateCommonChart(Stats.applyDeltaToSeriesIfNeed(await Stats.createGBGSeries({ s: start, e: end })));
					}
				});
			}
			else {
				Stats.DatePickerObj = null;
            }
			*/
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
			disabled: !Stats.isSelectedTreasureSources() && !Stats.isSelectedUnitSources(),
			value: 'NoAge',
		});

		const btnSelectMyEra = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnMyEra'),
			isActive: selectedEras.length === 1 && selectedEras[0] === Technologies.EraNames[CurrentEraID],
			dataType: 'selectEras',
			disabled: !Stats.isSelectedTreasureSources() && !Stats.isSelectedUnitSources(),
			value: Technologies.EraNames[CurrentEraID]
		});

		const btnSelectAll = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnAll'),
			title: i18n('Boxes.Stats.BtnAllTittle'),
			isActive: Object.keys(Stats.ResMap).length == selectedEras.length,
			dataType: 'selectEras',
			disabled: !Stats.isSelectedTreasureSources() && !Stats.isSelectedUnitSources(),
			value: Object.keys(Stats.ResMap).join(','),
		});

		const btnSelectTwoLastEra = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnLastEras'),
			title: i18n('Boxes.Stats.BtnLastErasTitle'),
			isActive: (selectedEras.length === 2 &&
				selectedEras.includes(Technologies.EraNames[CurrentEraID]) &&
				selectedEras.includes(Technologies.EraNames[CurrentEraID - 1])),
			disabled: !Stats.isSelectedTreasureSources() && !Stats.isSelectedUnitSources(),
			dataType: 'selectEras',
			value: Technologies.EraNames[CurrentEraID] + ',' + Technologies.EraNames[CurrentEraID - 1]
		});

		const btnSelectAllEra = Stats.RenderButton({
			name: i18n('Boxes.Stats.BtnAllPlayableEras'),
			title: i18n('Boxes.Stats.BtnAllPlayableErasTitle'),
			isActive: Stats.equals(selectedEras, Stats.PlayableEras.slice().sort()),
			dataType: 'selectEras',
			disabled: !Stats.isSelectedTreasureSources() && !Stats.isSelectedUnitSources(),
			value: Stats.PlayableEras.join(',')
		});

		const btnGroupByEra = Stats.RenderBox({
			name: i18n('Boxes.Stats.BtnToggleGroupBy'),
			title: i18n('Boxes.Stats.BtnToggleGroupByTitle'),
			disabled: !Stats.isSelectedTreasureSources(),
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
			'statsTreasurePlayerH',
			'statsTreasurePlayerD',
			'statsTreasureClanH',
			'statsTreasureClanD',
			'statsUnitsH',
			'statsUnitsD',
			'statsRewards',
			'statsGBGPlayers'
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
			disabled: !Stats.isSelectedTreasureSources() && !Stats.isSelectedUnitSources() && !Stats.isSelectedGBGSources(),
			value: it
		}));
		return `<div class="option-era-dropdown">
					${Stats.RenderEraSwitchers()}
				</div>
				<div class="option-era-wrap text-center">
					<strong>${i18n('Boxes.Stats.Era')}:</strong> ${btnGroupByEra}<br>
					${btnSelectAllEra}
					${btnSelectMyEra}
					${CurrentEraID > 2 ? btnSelectTwoLastEra : ''}
					${btnSelectAll}
					${btnSelectNoEra}
				</div>
				<div class="tabs">
					<ul class="horizontal">
					${sourceBtns.join('')}
					</ul>
				</div>
				<div class="option-chart-type-wrap text-center">
					${btnTglAnnotations}<br>
					${chartTypes.join('')}
				</div>`;
	},


	/**
	 *
	 * @returns {string}
	 */
	RenderSecondaryOptions: () => {
		const btnsPeriodSelect = [
			'today',
			'sinceTuesday',
			'last7days',
			'thisMonth',
			'last30days',
			'all'
		].map(it => Stats.RenderButton({
			name: i18n('Boxes.Stats.Period.' + it),
			title: i18n('Boxes.Stats.PeriodTitle.' + it),
			isActive: Stats.state.period === it,
			dataType: 'setPeriod',
			value: it,
		}));

		//btnsPeriodSelect.push('<input class="game-cursor" id="GVGDatePicker" type="text">');

		const btnsRewardSelect = [
			'__event',
			'battlegrounds_conquest', // Battle ground
			'guildExpedition', // Temple of Relics
			'spoilsOfWar', // Himeji Castle
			'diplomaticGifts',
		].map(it => Stats.RenderButton({
			name: i18n('Boxes.Stats.Rewards.Source.' + it),
			title: i18n('Boxes.Stats.Rewards.SourceTitle.' + it),
			isActive: Stats.state.rewardSource === it,
			dataType: 'setRewardSource',
			value: it,
		}));

		return `<div class="option-2-period">
					${btnsPeriodSelect.join('')}
				</div>
				<div class="option-2-reward-source">
					${btnsRewardSelect.join('')}
				</div>`;
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
	RenderButton: ({ name, isActive, dataType, value, title, disabled }) => `<button ${disabled ? 'disabled' : ''} class="btn btn-default btn-tight${!disabled && isActive ? ' btn-green' : ''}" data-type="${dataType}" data-value="${value}" title="${(title || '').replace(/"/g,'&quot;')}">${name}</button>`,

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
	updateCharts: async () => {
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
	createGBGSeries: async (dates = null) => {
		let data;

		if(dates !== null){

			let from = moment(dates.s).toDate(),
				to = moment(dates.e).toDate();

			data = await IndexDB.db['statsGBGPlayers'].where('date').between(from, to).sortBy('date');

		} else {
			data = await IndexDB.db['statsGBGPlayers'].orderBy('date').toArray();
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
			const avatarUrl = MainParser.PlayerPortraits[playerInfo.avatar] ? `${MainParser.InnoCDN}assets/shared/avatars/${MainParser.PlayerPortraits[playerInfo.avatar]}.jpg` : '#'
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
		const source = Stats.state.source;
		let data = await IndexDB.db[source].orderBy('date').toArray();

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
									<span class="units-icon {series.options.unitId}"></span>
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
		const source = Stats.state.source;
		let data = await IndexDB.db[source].orderBy('date').toArray();

		if (['statsTreasureClanH', 'statsTreasureClanD'].includes(source)) {
			data = data.filter(it => it.clanId === ExtGuildID);
		}

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
		const source = Stats.state.source;
		const selectedEras = Stats.getSelectedEras();
		const isClanTreasure = ['statsTreasureClanH', 'statsTreasureClanD'].includes(source);
		const hcColors = Highcharts.getOptions().colors;

		let data = await IndexDB.db[source].orderBy('date').toArray();

		if (isClanTreasure) {
			data = data.filter(it => it.clanId === ExtGuildID);
		}

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
			chartType = 'line';
			series = series.map(s => {
				if (isNegativeValuesAllowed) {
					s.data = s.data.map((it, index, array) => [it[0], index > 0 ? ((it[1] || 0) - (array[index - 1][1] || 0)) : 0]);
				} else {
					s.data = s.data.map((it, index, array) => [it[0], index > 0 ? Math.max(0, ((it[1] || 0) - (array[index - 1][1] || 0))) : 0]);
				}
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
			color: '#FF0000',
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
				seriesThreshold: 30,
				// debug: {
				//	timeSetup: true,
				//	timeSeriesProcessing: true,
				//	timeBufferCopy: true,
				//	timeKDTree: true,
				//	showSkipSummary: true,
				// },
				useGPUTranslations: true
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
				shared: series.length <= 5,
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
				}
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
		const {period, rewardSource} = Stats.state;

		const startDate = {
			today: moment().startOf('day').toDate(),
			yesterday: moment().startOf('day').subtract(1,'days').toDate(),
			sinceTuesday: ((moment().startOf('isoWeek').add(1, 'days').toDate() > MainParser.getCurrentDate()) ?
                           moment().startOf('isoWeek').subtract(1, 'weeks').add(1, 'days').toDate() : moment().startOf('isoWeek').add(1, 'days').toDate()),
			last7days: moment().subtract(1, 'weeks').toDate(),
			thisMonth: moment().startOf('month').toDate(),
			last30days: moment().subtract(30, 'days').toDate(),
			all: 0
		}[period] || 0;

		let data = await IndexDB.db.statsRewards.where('date').above(startDate).toArray();

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
		const serieData = Object.keys(seriesMapBySource).map(it => {
			const rewardInfo = (rewardTypes.find(r => r.id === it) || {name: it});
			const iconClass = rewardInfo.type === 'unit' ? `units-icon ${rewardInfo.subType}` :
				  rewardInfo.type === 'good' ? `goods-sprite ${rewardInfo.subType}` : '';
			// Asset image if not goods or goods sprite
			let pointImage = '';
			if (rewardInfo.type != 'good' && rewardInfo.type != 'unit') {
				let url = '';
				if ((rewardInfo.iconAssetName || rewardInfo.assembledReward && rewardInfo.assembledReward.iconAssetName)) {
					const icon = rewardInfo.assembledReward && rewardInfo.assembledReward.iconAssetName ? rewardInfo.assembledReward.iconAssetName : rewardInfo.iconAssetName;
					url = `${MainParser.InnoCDN}assets/shared/icons/reward_icons/reward_icon_${icon}.png`;
				} else if (rewardInfo.type == 'building' && rewardInfo.subType) {
					url = `${MainParser.InnoCDN}assets/city/buildings/${rewardInfo.subType.replace(/^(\w)_/, '$1_SS_')}.png`;
				}
				if (url) {
					pointImage = `<img src="${url}" style="width: 45px; height: 45px; margin-right: 4px;">`;
				}
			}
			return {
				iconClass,
				pointImage,
				name: rewardInfo.name,
				y: seriesMapBySource[it]
			};
		}).sort((a, b) => b.y - a.y);

		return {
			title: i18n('Boxes.Stats.Rewards.SourceTitle.' + rewardSource) + '. ' + i18n('Boxes.Stats.PeriodTitle.' + period),
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
				const loadFromLocal = true;
				const baseUrl = loadFromLocal ? (extUrl + 'vendor/highchart-8.0.4/') : 'https://code.highcharts.com/';
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
};
