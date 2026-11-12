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

// the production sums depend on the placed buildings
FoEproxy.addFoeHelperHandler('CityMapUpdated', () => {
	Technologies.Forecast.Production = null;
});


/**
 * @typedef ForecastIncome
 * @property {number} production daily production of the own buildings (0 when unknown)
 * @property {?number} trend measured stock change per day, null without enough statistics
 * @property {?number} manual daily value set by the player
 * @property {number} used value the forecast counts with
 */

/**
 * Research forecast of the technologies box: how many days the daily income
 * needs to cover what is still missing, and which resource takes longest.
 *
 * The daily income of a resource is the higher of two values: the production
 * of the own buildings (the numbers of the production overview) and the stock
 * growth the statistics measured over the last days, which also contains
 * rewards and trades. The player can replace it with an own value per resource.
 */
Technologies.Forecast = {

	/** @type {boolean} show the forecast columns and summary */
	Enabled: true,

	/** @type {number} days of statistics the measured values look back */
	TrendDays: 14,

	/** @type {number} ms the measured values stay valid */
	MeasuredLifetime: 600000,

	/** @type {?Object<string,number>} cached daily production per resource id */
	Production: null,

	/** @type {?{time: number, days: number, trend: Object<string,number>, fpExtra: number}} cached measured values */
	Measured: null,

	/** @type {boolean} a statistics query is running */
	Loading: false,

	/** @type {?Object<string,number>} daily values set by the player */
	Overrides: null,


	/**
	 * Reads the stored settings and own daily values.
	 */
	Init: () => {
		const Forecast = Technologies.Forecast;

		Forecast.Enabled = localStorage.getItem('TechnologiesShowForecast') !== 'false';

		try {
			Forecast.Overrides = JSON.parse(localStorage.getItem('TechnologiesForecastOverrides_' + ExtPlayerID)) || {};
		}
		catch (err) {
			Forecast.Overrides = {};
		}
	},


	/**
	 * Stores or removes the own daily value of a resource.
	 *
	 * @param {string} id Resource id.
	 * @param {string|number} value New daily value; empty or negative removes it.
	 * @returns {boolean} Whether something changed.
	 */
	SetOverride: (id, value) => {
		const Forecast = Technologies.Forecast,
			Amount = (value === '' || value === null ? NaN : Number(value)),
			Before = Forecast.Overrides[id];

		if (isNaN(Amount) || Amount < 0) delete Forecast.Overrides[id];
		else Forecast.Overrides[id] = Amount;

		if (Before === Forecast.Overrides[id]) return false;

		localStorage.setItem('TechnologiesForecastOverrides_' + ExtPlayerID, JSON.stringify(Forecast.Overrides));
		return true;
	},


	/**
	 * Adds the goods of one production entry to the daily sums. Placeholders for
	 * the goods of an era are spread evenly over its five goods; placeholders for
	 * special goods are skipped, their split is unknown.
	 *
	 * @param {Object<string,number>} Sums Daily sums per resource id.
	 * @param {string} name Resource id or placeholder (e.g. random_good_of_previous_age).
	 * @param {number} amount Unboosted amount.
	 * @param {Object} building Processed building the production belongs to.
	 * @param {number} [chance=1] Drop chance of a random production.
	 */
	AddGoods: (Sums, name, amount, building, chance = 1) => {
		amount = parseFloat(amount);
		if (!name || !amount) return;

		const Add = (id, value) => { Sums[id] = (Sums[id] || 0) + value * chance; },
			Boost = (building.isBoostable ? Boosts.Sums['goods_production'] || 0 : 0);

		if (/(random_good|all_goods)_of_/.test(name)) {
			const Goods = Technologies._expandGenericGood(name, building.eraName);
			if (Goods.length === 0) return;

			// "all goods" are boosted per good, a random good as a whole
			const Each = (name.includes('all_goods_of_')
				? amount / 5 + Math.round(amount / 5 * Boost / 100)
				: (amount + Math.round(amount * Boost / 100)) / Goods.length);

			for (const id of Goods) Add(id, Each);
		}
		else if (GoodsList.some(Good => Good['id'] === name)) {
			Add(name, amount + Math.round(amount * Boost / 100));
		}
		else if (FHResourcesList.some(Resource => Resource['id'] === name && Resource['abilities']?.['specialResource']?.['type'] === 'specialResource')) {
			Add(name, amount + Math.round(amount * (Boosts.Sums['special_goods_production'] || 0) / 100));
		}
	},


	/**
	 * Daily production of the own city per resource id: forge points (with
	 * packages and the Blue Galaxy average), coins, supplies and goods, boosted
	 * like in the production overview. Production buildings count with their
	 * one day option, classic goods buildings only while they are producing.
	 *
	 * @returns {?Object<string,number>} Daily sums, null while another player's city is shown.
	 */
	GetProduction: () => {
		const Forecast = Technologies.Forecast;

		if (Forecast.Production) return Forecast.Production;
		// the building data belongs to the visited player there
		if (ActiveMap === 'OtherPlayer' || !MainParser.CityMapData) return null;

		const Buildings = Object.values(CityBuildings.createBuildings(Object.values(MainParser.CityMapData))),
			Sums = { strategy_points: GreatBuildings.DailyHarvest()['galaxy'] },
			Others = Productions.BuildingsAll;

		// merges chains into their start building, the linked parts are skipped below
		Productions.BuildingsAll = Buildings;
		Productions.setChainsAndSets(Buildings);
		Productions.BuildingsAll = Others;

		let Happiness = 0,
			Population = 0;

		for (const Building of Buildings) {
			if (Building.happiness) Happiness += Building.happiness;
			if (Building.population > 0) Population += Building.population;
		}

		const Mood = (Happiness < Population ? -50 : (Happiness < 1.4 * Population ? 0 : 20)),
			Rates = {
				money: 1 + ((Boosts.Sums['coin_production'] || 0) + Mood) / 100,
				supplies: 1 + ((Boosts.Sums['supply_production'] || 0) + Mood) / 100,
			},
			FPRate = 1 + (Boosts.Sums['forge_points_production'] || 0) / 100;

		for (const Building of Buildings) {
			if (Building.player_id !== ExtPlayerID || Building.chainBuilding?.type === 'linked') continue;

			if (!Array.isArray(Building.production)) {
				Forecast.AddClassicGoods(Sums, Building);
				continue;
			}

			const FP = Productions.getBuildingProductionByCategory(false, Building, 'strategy_points');
			Sums['strategy_points'] += (Building.isBoostable ? FP.amount * FPRate : FP.amount) + FP.packageFP;

			for (const Type of ['money', 'supplies']) {
				const Production = Productions.getBuildingProductionByCategory(false, Building, Type);
				Sums[Type] = (Sums[Type] || 0) + (Building.isBoostable ? (Production.amount + Production.doubledAmount) * Rates[Type] : Production.amount);
			}

			for (const Production of (Building.type === 'production' ? Building.production.slice(-1) : Building.production)) {
				if (!Production) continue;

				if (Production.type === 'resources' || Production.type === 'special_goods') {
					for (const [name, amount] of Object.entries(Production.resources)) {
						Forecast.AddGoods(Sums, name, amount, Building);
					}
				}
				else if (Production.type === 'random') {
					for (const Resource of Production.resources) {
						Forecast.AddGoods(Sums, [Resource.subType, Resource.type].find(name => /goods?_of_/.test(name || '')), Resource.amount, Building, Resource.dropChance);
					}
				}
			}
		}

		return Forecast.Production = Sums;
	},


	/**
	 * Adds the one day production of a classic goods building, as long as a
	 * production is running in it.
	 *
	 * @param {Object<string,number>} Sums Daily sums per resource id.
	 * @param {Object} building Processed building.
	 */
	AddClassicGoods: (Sums, building) => {
		if (building.type !== 'goods' || !MainParser.CityMapData[building.id]?.['state']?.['current_product']) return;

		const Day = (MainParser.CityEntities[building.entityId]?.['available_products'] || []).find(Product => Product['production_time'] === 86400);

		for (const [name, amount] of Object.entries(Day?.['product']?.['resources'] || {})) {
			Technologies.Forecast.AddGoods(Sums, name, amount, building);
		}
	},


	/**
	 * Loads the measured values from the statistics: the stock change per day
	 * and resource over the last TrendDays days and the average forge points
	 * from rewards (the Blue Galaxy is part of the production). Renders the
	 * box again once they arrived.
	 *
	 * @returns {Promise<void>}
	 */
	LoadMeasured: async () => {
		const Forecast = Technologies.Forecast;

		if (Forecast.Loading) return;
		Forecast.Loading = true;

		const Measured = { time: Date.now(), days: 0, trend: {}, fpExtra: 0 },
			Since = moment().subtract(Forecast.TrendDays, 'days').startOf('day');

		try {
			await IndexDB.getDB();

			const Days = await IndexDB.db.statsTreasurePlayerD.where('date').aboveOrEqual(Since.toDate()).sortBy('date'),
				First = Days[0],
				Last = Days[Days.length - 1];

			if (Days.length > 1) Measured.days = Math.round(moment(Last.date).diff(First.date, 'days', true));

			// a single day says nothing about a trend
			if (Measured.days >= 2) {
				for (const [id, amount] of Object.entries(Last.resources || {})) {
					Measured.trend[id] = (amount - (First.resources?.[id] || 0)) / Measured.days;
				}
				// only the bar is part of the snapshots, not the forge point packages
				delete Measured.trend['strategy_points'];
			}

			const Rewards = await StrategyPoints.db.ForgePointsStats.where('date').aboveOrEqual(Since.format('YYYY-MM-DD')).toArray();

			if (Rewards.length > 0) {
				const Span = Math.max(3, moment().startOf('day').diff(moment.min(Rewards.map(Reward => moment(Reward.date))), 'days') + 1);
				Measured.fpExtra = Rewards.reduce((Sum, Reward) => Sum + (Reward.event === 'double_collection' ? 0 : Reward.amount || 0), 0) / Span;
			}
		}
		catch (err) {
			console.warn('Technologies.Forecast.LoadMeasured failed:', err);
		}

		Forecast.Measured = Measured;
		Forecast.Loading = false;

		if ($('#technologies').length !== 0) Technologies.CalcBody();
	},


	/**
	 * Daily income of a resource from all sources.
	 *
	 * @param {string} id Resource id.
	 * @returns {ForecastIncome}
	 */
	GetIncome: (id) => {
		const Forecast = Technologies.Forecast,
			Measured = Forecast.Measured || { trend: {}, fpExtra: 0 },
			Production = (Forecast.GetProduction()?.[id] || 0) + (id === 'strategy_points' ? Measured.fpExtra : 0),
			Trend = Measured.trend[id] ?? null,
			Manual = Forecast.Overrides[id] ?? null;

		return {
			production: Production,
			trend: Trend,
			manual: Manual,
			used: Manual ?? Math.max(Production, Trend || 0),
		};
	},


	/**
	 * Calculates the days until the daily income covers the missing amounts.
	 * Starts loading the measured values when they are missing or outdated.
	 *
	 * @param {Object<string,number>} Missing Missing amount per resource id (only positive values count).
	 * @returns {{rows: Object<string,{income: ForecastIncome, days: number}>, days: number, bottleneck: ?string, stuck: string[]}}
	 *     days per resource (Infinity without income), the longest finite duration with its resource, and the resources without income
	 */
	Calc: (Missing) => {
		const Forecast = Technologies.Forecast,
			Result = { rows: {}, days: 0, bottleneck: null, stuck: [] };

		if (Forecast.Overrides === null) Forecast.Init();
		if (!Forecast.Measured || Date.now() - Forecast.Measured.time > Forecast.MeasuredLifetime) Forecast.LoadMeasured();

		for (const [id, amount] of Object.entries(Missing)) {
			const Income = Forecast.GetIncome(id),
				Days = (amount > 0 ? (Income.used > 0 ? Math.ceil(amount / Income.used) : Infinity) : 0);

			Result.rows[id] = { income: Income, days: Days };

			if (Days === Infinity) Result.stuck.push(id);
			else if (Days > Result.days) {
				Result.days = Days;
				Result.bottleneck = id;
			}
		}

		return Result;
	},


	/**
	 * Translation with its __name__ placeholders filled in.
	 *
	 * @param {string} key i18n key below Boxes.Technologies.
	 * @param {Object<string,string|number>} values Placeholder name -> value.
	 * @returns {string}
	 */
	Text: (key, values) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll('__' + name + '__', value), i18n('Boxes.Technologies.' + key)),


	/**
	 * Formats a daily value: whole numbers from 100 on, one decimal below.
	 *
	 * @param {number} value Daily value.
	 * @returns {string}
	 */
	Num: (value) => {
		if (!value) return '-';
		if (Math.abs(value) >= 10000) return HTML.FormatNumberShort(Math.round(value));

		return Number(Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10).toLocaleString(i18n('Local'));
	},


	/**
	 * Tooltip of a daily value: where it comes from.
	 *
	 * @param {string} id Resource id.
	 * @param {ForecastIncome} Income Daily income of the resource.
	 * @returns {string} Tooltip text, ready for a title attribute.
	 */
	IncomeTooltip: (id, Income) => {
		const Forecast = Technologies.Forecast,
			Lines = [];

		if (Income.manual !== null) Lines.push(Forecast.Text('ForecastTTManual', { value: Forecast.Num(Income.manual) }));

		Lines.push(Forecast.Text(id === 'strategy_points' ? 'ForecastTTProductionFP' : 'ForecastTTProduction', { value: Forecast.Num(Income.production), days: Forecast.TrendDays }));

		if (Income.trend !== null) {
			Lines.push(Forecast.Text('ForecastTTTrend', { value: (Income.trend > 0 ? '+' : (Income.trend < 0 ? '−' : '')) + Forecast.Num(Math.abs(Income.trend)), days: Forecast.Measured.days }));
		}
		else if (id !== 'strategy_points') {
			Lines.push(i18n('Boxes.Technologies.ForecastTTNoTrend'));
		}

		Lines.push(i18n('Boxes.Technologies.ForecastTTEdit'));

		return HTML.i18nTooltip(Lines.join('<br>'));
	},


	/**
	 * Summary above the table: when everything is covered and what takes longest.
	 *
	 * @param {{days: number, bottleneck: ?string, stuck: string[]}} Result Output of Calc().
	 * @param {number} EraID Era the table is calculated up to.
	 * @returns {string} HTML
	 */
	Summary: (Result, EraID) => {
		const Forecast = Technologies.Forecast,
			Name = (id) => GoodsData[id]?.['name'] || id,
			Era = i18n('Eras.' + EraID),
			Lines = [];

		if (Result.bottleneck === null && Result.stuck.length === 0) {
			Lines.push(Forecast.Text('ForecastDone', { era: Era }));
		}
		else {
			if (Result.bottleneck !== null) {
				Lines.push(Forecast.Text(Result.stuck.length === 0 ? 'ForecastDays' : 'ForecastDaysRest', {
					era: Era,
					days: HTML.Format(Result.days),
					date: moment().add(Result.days, 'days').format('L'),
					resource: Name(Result.bottleneck),
				}));
			}
			if (Result.stuck.length > 0) {
				Lines.push(Forecast.Text('ForecastStuck', { resources: Result.stuck.map(Name).join(', ') }));
			}
		}

		return '<div class="technologies-forecast">' + Lines.join('<br>') + '</div>';
	},
};
