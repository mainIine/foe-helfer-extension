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

{
	// refresh the open box when the city, the inventory, the stock or the boosts
	// change; a debounce collapses bundled message bursts
	let refreshTimer = null;
	const refresh = (resetYields = false) => {
		if (resetYields) GBGoods.yieldCache = {};

		clearTimeout(refreshTimer);
		refreshTimer = setTimeout(() => {
			if ($('#gbGoods').length === 0) return;
			GBGoods.Render();
		}, 400);
	};

	FoEproxy.addFoeHelperHandler('CityMapUpdated', () => refresh());
	FoEproxy.addFoeHelperHandler('InventoryUpdated', () => refresh());
	FoEproxy.addFoeHelperHandler('ResourcesUpdated', () => refresh());
	// the goods production boost is part of the cached yields
	FoEproxy.addFoeHelperHandler('BoostsUpdated', () => refresh(true));
}


/**
 * @typedef GBGoodsBuilding
 * @property {string} entityId city entity id of the placed great building
 * @property {string} name display name
 * @property {string} icon building screenshot url
 * @property {number} level current level
 * @property {number} maxLevel unlocked levels
 * @property {?Object} tier current prestige tier (GreatBuildingTier enum), null on classic worlds
 * @property {boolean} rework true when the building has level unlock costs (prestige rework)
 * @property {number} from first level of the planned unlocks
 * @property {number} to last planned level with known costs (from - 1 when none is known)
 * @property {Object<string, number>} need demand per good id over the planned unlocks
 * @property {number} perGood highest demand of a single good
 * @property {boolean} unknown true when a planned level has no known costs
 */

/**
 * @typedef GBGoodsEra
 * @property {number} eraId era id of the goods (see Technologies.InnoEras)
 * @property {string} eraName era name, e.g. 'BronzeAge'
 * @property {GBGoodsBuilding[]} gbs placed great buildings paying their unlocks in goods of this era
 * @property {string[]} goods ids of the goods of this era
 * @property {Object<string, number>} need demand per good id
 * @property {number} needSum demand of all goods
 * @property {number} missing amount the stock does not cover, summed over all goods
 * @property {boolean} unknown true when a planned unlock has no known costs
 */

/**
 * @typedef GBGoodsKitRoute
 * @property {{kit: string, amount: number}[]} steps kits to use in this order
 * @property {number} total number of kits
 * @property {boolean} possible true when the stock covers every step
 * @property {?GBGoodsKitRoute} alternative the other way to reach the era, null when no kit is needed
 */

/**
 * @typedef GBGoodsCandidate
 * @property {string} entityId city entity id of the building
 * @property {string} name display name
 * @property {string} icon building screenshot url
 * @property {number} stock buildings obtainable from the inventory, for city buildings the number standing in that era
 * @property {?number} fromEra era id a building of the city stands in, null for buildings from the inventory
 * @property {Object<string, number>} standing goods a building of the city yields where it stands, per era id of the goods
 * @property {number} gain goods of the era per day the building adds to what it already yields
 * @property {{label: string, tiles: number}} size footprint
 * @property {number} perDay goods of the era per day
 * @property {number} perTile goods of the era per day and tile
 * @property {boolean} random true when the amount is the average of a random production
 * @property {number} buildingEra era id the building has to stand in
 * @property {Object<string, number>} others goods of other eras the building yields in that era, per era id
 * @property {GBGoodsKitRoute} kits kits needed to bring the building to that era
 * @property {string} limited hint for time or collection limited buildings, '' otherwise
 */

/**
 * Goods planner for great buildings: since the prestige rework level unlocks cost
 * goods of the era of the great building, so players need goods of long passed
 * eras again. The box lists the placed great buildings by the era of their goods
 * with demand and stock, and ranks the buildings of the inventory by the goods of
 * that era they would yield once brought to the fitting era with One Down Kits
 * (or with a Reversion Kit and One Up Kits). Buildings of the city that already
 * stand in another era than the player's are ranked as well, they can be moved
 * on with One Up Kits.
 * @namespace
 */
let GBGoods = {

	/** @type {string} shown eras: 'missing' (stock does not cover the demand), 'own' (eras of the placed great buildings) or 'all' */
	EraFilter: 'own',

	/** @type {number} number of level unlocks per great building the demand covers */
	Horizon: 1,

	/** @type {string} order of the inventory buildings: 'perDay' or 'perTile' */
	SortBy: 'perDay',

	/** @type {Object<string, boolean>} era id => card body visible (unset: open while goods are missing) */
	Expanded: {},

	/** @type {Object<string, boolean>} era id => all inventory buildings listed */
	ShowAll: {},

	/** @type {number} inventory buildings listed per era until "show more" is clicked */
	TopCount: 5,

	/** @type {Object<string, (string|number)[]>} selectable values of the display options that are remembered */
	Options: {
		EraFilter: ['missing', 'own', 'all'],
		Horizon: [1, 5, 10, 25],
		SortBy: ['perDay', 'perTile']
	},

	/** @type {string[]} era changing kits in display order */
	KitIds: ['one_down_kit', 'reversion_kit', 'one_up_kit', 'renovation_kit'],

	/**
	 * @type {Object<string, string>} arrow shown with every kit name - the names of the One Up and the
	 * One Down Kit are easily mixed up: one era down/up, straight down to the Bronze Age / up to the player's era
	 */
	KitArrows: { one_down_kit: '↓', reversion_kit: '⇊', one_up_kit: '↑', renovation_kit: '⇈' },

	/** @type {Object<string, {changeable: boolean, random: boolean, eras: Object}>} goods yields per city entity id (see BuildingYields) */
	yieldCache: {},


	/**
	 * Opens the box (or closes an already open one).
	 * @returns {Promise<void>}
	 */
	init: async () => {
		if ($('#gbGoods').length !== 0) {
			HTML.CloseOpenBox('gbGoods');
			return;
		}

		HTML.AddCssFile('gbgoods');
		GBGoods.LoadOptions();

		HTML.Box({
			id: 'gbGoods',
			title: i18n('Boxes.GBGoods.Title'),
			auto_close: true,
			dragdrop: true,
			minimize: true,
			resize: true,
			popout: () => MainParser.PopOut('gbGoods', 1060, 620),
		});

		// boxes open with their top left corner in the middle of the screen, which
		// cuts off a box of this size: centre it unless the player has moved it
		if (!localStorage.getItem('gbGoodsCords')) {
			$('#gbGoods').css({ '--x': '-520px', '--y': '-300px' });
		}

		// the level unlock costs come from the table of the power leveling box
		await Parts.LoadUnlockCosts();

		GBGoods.BuildBox();
	},


	/**
	 * Creates the box skeleton: topbar with the era filter, the number of planned
	 * unlocks, the sort order and the kit stock, the era list and a bottombar.
	 */
	BuildBox: () => {
		const select = (id, value, options, title) => $('<select />').attr({ id, class: 'game-cursor', title }).append(
			options.map(([key, label]) => $('<option />').attr('value', key).text(label))
		).val(String(value));

		$('#gbGoodsBody').append(
			$('<div />').attr('id', 'gbGoodsTopbar').append(
				select('gbGoodsEraFilter', GBGoods.EraFilter, [
					['missing', i18n('Boxes.GBGoods.FilterMissing')],
					['own', i18n('Boxes.GBGoods.FilterOwn')],
					['all', i18n('Boxes.GBGoods.FilterAll')]
				]).on('change', (e) => GBGoods.SetOption('EraFilter', String($(e.currentTarget).val()))),
				select('gbGoodsHorizon', GBGoods.Horizon, GBGoods.Options.Horizon.map(count => [
					count,
					(count === 1 ? i18n('Boxes.GBGoods.HorizonNext') : HTML.i18nReplacer(i18n('Boxes.GBGoods.HorizonLevels'), { count }))
				]), i18n('Boxes.GBGoods.HorizonTT')).on('change', (e) => GBGoods.SetOption('Horizon', Number($(e.currentTarget).val()))),
				select('gbGoodsSort', GBGoods.SortBy, [
					['perDay', i18n('Boxes.GBGoods.SortPerDay')],
					['perTile', i18n('Boxes.GBGoods.SortPerTile')]
				], i18n('Boxes.GBGoods.SortTT')).on('change', (e) => GBGoods.SetOption('SortBy', String($(e.currentTarget).val()))),
				$('<span />').attr('id', 'gbGoodsKits')
			),
			$('<div />').attr('id', 'gbGoodsInner')
				.on('click', '.gbg-header', (e) => {
					const card = $(e.currentTarget).closest('.gbg-card');
					GBGoods.Expanded[card.data('era')] = !card.hasClass('open');
					GBGoods.Render();
				})
				.on('click', '.gbg-more', (e) => {
					const eraId = $(e.currentTarget).closest('.gbg-card').data('era');
					GBGoods.ShowAll[eraId] = !GBGoods.ShowAll[eraId];
					GBGoods.Render();
				}),
			$('<div />').attr('id', 'gbGoodsBottombar')
		);

		GBGoods.Render();
	},


	/**
	 * Restores the remembered display options, unknown values are ignored.
	 */
	LoadOptions: () => {
		let saved = {};

		try {
			saved = JSON.parse(localStorage.getItem('GBGoodsSettings') || '{}') || {};
		}
		catch (error) {
			// broken entry: keep the defaults
		}

		for (const [option, values] of Object.entries(GBGoods.Options)) {
			if (values.includes(saved[option])) GBGoods[option] = saved[option];
		}
	},


	/**
	 * Changes a display option, remembers it and renders the list again.
	 * @param {string} option 'EraFilter', 'Horizon' or 'SortBy'
	 * @param {string|number} value
	 */
	SetOption: (option, value) => {
		GBGoods[option] = value;
		localStorage.setItem('GBGoodsSettings', JSON.stringify(
			Object.fromEntries(Object.keys(GBGoods.Options).map(key => [key, GBGoods[key]]))
		));

		// the era list changes with the filter and the demand, so the manual toggles no longer fit
		if (option !== 'SortBy') GBGoods.Expanded = {};

		GBGoods.Render();
	},


	/**
	 * Formats a number for display. Unlike HTML.Format a zero stays a zero, an
	 * empty stock is an information here.
	 * @param {number} number
	 * @returns {string}
	 */
	Format: (number) => (number === 0 ? '0' : HTML.Format(number)),


	/**
	 * Translated name of an era.
	 * @param {number} eraId era id (see Technologies.InnoEras)
	 * @returns {string}
	 */
	EraName: (eraId) => i18n('Eras.' + Technologies.Eras[Technologies.InnoEraNames[eraId]]),


	/**
	 * Screenshot of a building as shown in the game's construction menu.
	 * @param {Object} meta city entity metadata
	 * @returns {string} url
	 */
	BuildingIcon: (meta) => srcLinks.get(`/city/buildings/${String(meta.asset_id).replace(/^(\D_)(.*?)/, '$1SS_$2')}.png`, true),


	/**
	 * Stock, name, icon, direction arrow and effect of the kits that change the era
	 * of a building. Complete fragment sets count as kits.
	 * @returns {Object<string, {stock: number, name: string, icon: string, arrow: string, effect: string}>} keyed by kit id
	 */
	KitInfo: () => {
		const classes = {
			OneDownKitPayload: 'one_down_kit',
			ReversionKitPayload: 'reversion_kit',
			OneUpKitPayload: 'one_up_kit',
			RenovationKitPayload: 'renovation_kit'
		};
		const kits = {};

		for (const id of GBGoods.KitIds) {
			kits[id] = {
				stock: 0,
				name: i18n('Boxes.GBGoods.Kit.' + id),
				icon: srcLinks.get(`/shared/icons/reward_icons/reward_icon_${id}.png`, true),
				arrow: GBGoods.KitArrows[id],
				effect: i18n('Boxes.GBGoods.KitEffect.' + id)
			};
		}

		for (const entry of Object.values(MainParser.Inventory || {})) {
			const id = classes[entry.item?.__class__] || entry.itemAssetName;

			if (kits[id]) {
				kits[id].stock += entry.inStock;
				kits[id].name = entry.name || kits[id].name; // the game's own name
				continue;
			}

			const reward = entry.item?.reward;
			const assembled = kits[reward?.assembledReward?.id];
			if (entry.item?.__class__ === 'FragmentItemPayload' && assembled) {
				assembled.stock += Math.floor(entry.inStock * (reward.amount || 1) / (reward.requiredAmount || 1));
			}
		}

		return kits;
	},


	/**
	 * Goods the level unlocks of a great building are paid in: the goods of its build costs.
	 * @param {string} entityId city entity id of the great building
	 * @returns {string[]} good ids, empty when unknown
	 */
	UnlockGoods: (entityId) => Parts.GetUnlockGoods(entityId).filter(id => Technologies.InnoEras[GoodsData[id]?.era] > 0),


	/**
	 * Goods demand of the next level unlocks of a placed great building.
	 * @param {string} entityId city entity id of the great building
	 * @param {number} maxLevel unlocked levels
	 * @param {string[]} goods ids of the goods the unlocks are paid in
	 * @returns {{from: number, to: number, need: Object<string, number>, unknown: boolean}}
	 */
	Demand: (entityId, maxLevel, goods) => {
		const demand = { from: maxLevel + 1, to: maxLevel, need: {}, unknown: false };

		for (let target = demand.from; target < demand.from + GBGoods.Horizon; target++) {
			const costs = Parts.GetLevelUnlockCosts(entityId, target);

			if (!costs) {
				demand.unknown = true;
				break;
			}

			for (const id of goods) {
				if (costs[id] > 0) demand.need[id] = (demand.need[id] || 0) + costs[id];
			}
			demand.to = target;
		}

		return demand;
	},


	/**
	 * Collects the placed great buildings with the goods demand of their next level
	 * unlocks, grouped by the era of these goods. The filter 'all' adds every era
	 * from the Bronze Age to the player's era, 'missing' only keeps eras whose
	 * demand the stock does not cover.
	 * @returns {GBGoodsEra[]} sorted by era
	 */
	CollectEras: () => {
		const eras = {};
		const group = (eraId) => eras[eraId] ??= {
			eraId: eraId,
			eraName: Technologies.InnoEraNames[eraId],
			gbs: [],
			goods: [],
			need: {},
			needSum: 0,
			missing: 0,
			unknown: false
		};

		for (const entity of Object.values(MainParser.CityMapData || {})) {
			if (entity.type !== 'greatbuilding') continue;

			const meta = MainParser.CityEntities[entity.cityentity_id];
			const goods = (meta ? GBGoods.UnlockGoods(meta.id) : []);
			const eraId = Technologies.InnoEras[GoodsData[goods[0]]?.era];
			if (!eraId) continue;

			const rework = GreatBuildings.IsRework(meta.id);
			// level 0 comes without level field, unlocks of this session can be ahead of the city data
			const level = entity.level || 0;
			const maxLevel = Math.max(entity.max_level || 0, Parts.UnlockedLevels[meta.id] || 0);
			const demand = (rework ? GBGoods.Demand(meta.id, maxLevel, goods) : { from: maxLevel + 1, to: maxLevel, need: {}, unknown: false });
			const era = group(eraId);

			era.gbs.push({
				entityId: meta.id,
				name: meta.name,
				icon: GBGoods.BuildingIcon(meta),
				level: level,
				maxLevel: maxLevel,
				tier: MainParser.GetGBTierForLevel(meta, level),
				rework: rework,
				...demand,
				perGood: Math.max(0, ...Object.values(demand.need))
			});

			era.unknown ||= demand.unknown;
			for (const [id, amount] of Object.entries(demand.need)) {
				era.need[id] = (era.need[id] || 0) + amount;
			}
		}

		if (GBGoods.EraFilter === 'all') {
			for (let eraId = Technologies.InnoEras.BronzeAge; eraId <= Technologies.InnoEras[CurrentEra]; eraId++) group(eraId);
		}

		for (const era of Object.values(eras)) {
			era.goods = GoodsList.filter(good => good.era === era.eraName).map(good => good.id);
			era.gbs.sort((a, b) => (b.perGood - a.perGood) || a.name.localeCompare(b.name));

			for (const [id, amount] of Object.entries(era.need)) {
				era.needSum += amount;
				era.missing += Math.max(0, amount - (ResourceStock[id] || 0));
			}
		}

		return Object.values(eras)
			.filter(era => GBGoods.EraFilter !== 'missing' || era.missing > 0)
			.sort((a, b) => a.eraId - b.eraId);
	},


	/**
	 * Buildings obtainable from the inventory: stocked buildings, complete fragment
	 * sets, selection kits and upgrade chains. Chains that upgrade a building
	 * standing in the city are left out, they are no additional building.
	 * @returns {{entityId: string, stock: number}[]}
	 */
	InventoryBuildings: () => {
		if (!Kits.UpgradeSchemes) return [];

		const buildings = [];
		for (const [entityId, data] of Object.entries(Kits.BuildingsFromInventory())) {
			const stock = (data.chains || [])
				.filter(entry => entry.chain[0]?.from !== 'city')
				.reduce((sum, entry) => sum + entry.count, 0);

			if (stock > 0 && MainParser.CityEntities[entityId]) buildings.push({ entityId, stock });
		}

		return buildings;
	},


	/**
	 * Buildings of the own city that stand in another era than the player's: they
	 * were brought down with kits (or left behind in an older era) and can be moved
	 * on to the era whose goods are needed next. Only buildings the kits work on,
	 * grouped by building and era. A building is busy while goods it yields where
	 * it stands are still missing - it is not suggested for another era then.
	 * @param {Object<string, number>} missing missing goods per era id (see CollectEras)
	 * @returns {{entityId: string, stock: number, fromEra: number, standing: Object<string, number>, busy: boolean}[]}
	 *          standing: goods the building yields per day where it stands, per era id of the goods
	 */
	ShiftedCityBuildings: (missing) => {
		const current = Technologies.InnoEras[CurrentEra];
		const groups = {};

		for (const entity of Object.values(MainParser.CityMapData || {})) {
			const meta = MainParser.CityEntities[entity.cityentity_id];
			const fromEra = entity.level; // the level of these buildings is their era id

			if (!meta || meta.type === 'greatbuilding' || !(fromEra > 0) || fromEra === current) continue;
			if (!GBGoods.PlaceableEras(meta).changeable) continue;

			const key = `${meta.id}|${fromEra}`;
			if (!groups[key]) {
				const standing = GBGoods.BuildingYields(meta.id).eras[fromEra] || {};

				groups[key] = {
					entityId: meta.id,
					stock: 0,
					fromEra: fromEra,
					standing: standing,
					busy: Object.entries(standing).some(([eraId, amount]) => amount >= 1 && missing[eraId] > 0)
				};
			}
			groups[key].stock++;
		}

		return Object.values(groups);
	},


	/**
	 * Era ids a building can be brought to. Like the game's renovation
	 * mode, the kits only work on buildings whose values depend on their era: generic
	 * buildings without a fixed era and without the flag that makes them follow the
	 * player's era (4), classic buildings marked as multi age. A kit never goes below
	 * the Bronze Age or above the player's era. Every other building keeps its era.
	 * @param {Object} meta city entity metadata
	 * @returns {{changeable: boolean, eras: number[]}}
	 */
	PlaceableEras: (meta) => {
		const bronze = Technologies.InnoEras.BronzeAge;
		const current = Technologies.InnoEras[CurrentEra];
		const allAge = meta.components?.AllAge;
		const changeable = (meta.__class__ === 'GenericCityEntity'
			? allAge?.era === undefined && ((allAge?.flags?.flags || 0) & 4) === 0
			: !!meta.is_multi_age && meta.requirements?.min_era !== 'AllAge');

		if (changeable) {
			return { changeable, eras: Array.from({ length: Math.max(0, current - bronze + 1) }, (_, i) => bronze + i) };
		}

		// fixed era from the era component or the entity id, buildings of all ages follow the player
		const fixed = Technologies.InnoEras[allAge?.era?.era || meta.id.split('_')[1]];

		return { changeable, eras: [fixed > 0 ? fixed : current] };
	},


	/**
	 * Goods yields per day of a building for every era it can stand in,
	 * including the goods production boost and with the building motivated (cached).
	 * @param {string} entityId city entity id
	 * @returns {{changeable: boolean, random: boolean, eras: Object<string, Object<string, number>>}}
	 *          eras: building era id => { era id of the goods => amount }
	 */
	BuildingYields: (entityId) => {
		if (GBGoods.yieldCache[entityId] !== undefined) return GBGoods.yieldCache[entityId];

		const meta = MainParser.CityEntities[entityId];
		const yields = { changeable: false, random: false, eras: {} };

		// cheap pre-check: most inventory buildings do not yield goods at all
		if (meta && JSON.stringify(meta).includes('good')) {
			const placeable = GBGoods.PlaceableEras(meta);
			yields.changeable = placeable.changeable;

			for (const eraId of placeable.eras) {
				try {
					const building = CityBuildings.createBuilding(meta, Technologies.InnoEraNames[eraId]);
					const goods = CityBuildings.getBuildingGoodsByEra(false, building, true);
					if (Object.keys(goods.eras).length === 0) continue;

					yields.eras[eraId] = goods.eras;
					yields.random ||= goods.hasRandomProduction;
				}
				catch (error) {
					// a building with unexpected metadata must not break the whole list
					console.error('GBGoods: yields of', entityId, 'failed', error);
				}
			}
		}

		return GBGoods.yieldCache[entityId] = yields;
	},


	/**
	 * Kits that bring a building from the era it stands in to another era.
	 * Down: One Down Kits step by step, or one Reversion Kit down to the Bronze Age
	 * followed by One Up Kits. Up: One Up Kits step by step, or one Renovation Kit up
	 * to the player's era followed by One Down Kits. The way the stock covers wins,
	 * then the one needing fewer kits.
	 * @param {number} eraId era id the building has to stand in
	 * @param {Object<string, {stock: number}>} kits kit stock (see KitInfo)
	 * @param {number} [fromEra] era id the building stands in; buildings from the inventory arrive in the player's era
	 * @returns {GBGoodsKitRoute}
	 */
	KitRoute: (eraId, kits, fromEra = Technologies.InnoEras[CurrentEra]) => {
		if (eraId === fromEra) return { steps: [], total: 0, possible: true, alternative: null };

		const ways = (eraId < fromEra
			? [
				[['one_down_kit', fromEra - eraId]],
				[['reversion_kit', 1], ['one_up_kit', eraId - Technologies.InnoEras.BronzeAge]]
			]
			: [
				[['one_up_kit', eraId - fromEra]],
				[['renovation_kit', 1], ['one_down_kit', Technologies.InnoEras[CurrentEra] - eraId]]
			]);

		const routes = ways.map(way => {
			const steps = way.filter(([, amount]) => amount > 0).map(([kit, amount]) => ({ kit, amount }));

			return {
				steps: steps,
				total: steps.reduce((sum, step) => sum + step.amount, 0),
				possible: steps.every(step => kits[step.kit].stock >= step.amount),
				alternative: null
			};
		}).sort((a, b) => (b.possible - a.possible) || (a.total - b.total));

		return { ...routes[0], alternative: routes[1] };
	},


	/**
	 * Hint for buildings that expire after a time or a number of collections.
	 * @param {Object} meta city entity metadata
	 * @returns {string} translated hint, '' for permanent buildings
	 */
	LimitedHint: (meta) => {
		const config = meta.components?.AllAge?.limited?.config;

		if (config?.expireTime) {
			return HTML.i18nReplacer(i18n('Boxes.GBGoods.LimitedDays'), { days: Math.round(config.expireTime / 86400) });
		}
		if (config?.collectionAmount) {
			return HTML.i18nReplacer(i18n('Boxes.GBGoods.LimitedCollections'), { count: config.collectionAmount });
		}

		return '';
	},


	/**
	 * Ranks buildings by the goods of an era they yield. Every building counts in
	 * the era it yields the most of these goods in (buildings producing goods of
	 * the previous or next era stand one era off). A building of the city only
	 * counts where it would yield more of these goods than it does where it stands.
	 * @param {number} eraId era id of the goods
	 * @param {{entityId: string, stock: number, fromEra: (number|undefined), standing: (Object|undefined)}[]} sources
	 *        buildings from the inventory (see InventoryBuildings) and of the city (see ShiftedCityBuildings, with fromEra and standing)
	 * @param {Object<string, {stock: number}>} kits kit stock (see KitInfo)
	 * @returns {GBGoodsCandidate[]} best first
	 */
	Candidates: (eraId, sources, kits) => {
		const noKits = { steps: [], total: 0, possible: true, alternative: null };
		const candidates = [];

		for (const { entityId, stock, fromEra, standing = {} } of sources) {
			const yields = GBGoods.BuildingYields(entityId);
			const inCity = (fromEra !== undefined);
			const yieldsNow = standing[eraId] || 0;
			let best = null;

			for (const [era, goods] of Object.entries(yields.eras)) {
				const buildingEra = Number(era);
				const perDay = goods[eraId] || 0;

				if (perDay < 1 || (inCity && (buildingEra === fromEra || perDay <= yieldsNow))) continue;

				const route = (yields.changeable ? GBGoods.KitRoute(buildingEra, kits, fromEra) : noKits);
				if (best === null || perDay > best.perDay || (perDay === best.perDay && route.total < best.kits.total)) {
					best = { perDay: perDay, buildingEra: buildingEra, kits: route, goods: goods };
				}
			}
			if (best === null) continue;

			const meta = MainParser.CityEntities[entityId];
			const size = CityBuildings.setSize(meta);
			const tiles = (size.width * size.length) || 1;

			candidates.push({
				entityId: entityId,
				name: meta.name,
				icon: GBGoods.BuildingIcon(meta),
				stock: stock,
				fromEra: (inCity ? fromEra : null),
				standing: standing,
				size: { label: `${size.length}x${size.width}`, tiles: tiles },
				perDay: best.perDay,
				perTile: best.perDay / tiles,
				gain: best.perDay - yieldsNow,
				random: yields.random,
				buildingEra: best.buildingEra,
				others: Object.fromEntries(Object.entries(best.goods).filter(([id, amount]) => Number(id) !== eraId && amount >= 1)),
				kits: best.kits,
				limited: GBGoods.LimitedHint(meta)
			});
		}

		const key = GBGoods.SortBy;

		return candidates.sort((a, b) => (b[key] - a[key]) || (a.kits.total - b.kits.total) || a.name.localeCompare(b.name));
	},


	/**
	 * Goods the own city currently yields per day, by the era of the goods
	 * (all buildings, with the goods production boost).
	 * @returns {Object<string, number>} era id => amount
	 */
	CityProduction: () => {
		const sums = {};

		for (const entity of Object.values(MainParser.CityMapData || {})) {
			const meta = MainParser.CityEntities[entity.cityentity_id];
			if (!meta || meta.type === 'street') continue;

			try {
				const building = CityBuildings.createBuilding(meta, Technologies.getEraName(entity.cityentity_id, entity.level), entity);

				for (const [eraId, amount] of Object.entries(CityBuildings.getBuildingGoodsByEra(false, building, true).eras)) {
					sums[eraId] = (sums[eraId] || 0) + amount;
				}
			}
			catch (error) {
				console.error('GBGoods: production of', entity.cityentity_id, 'failed', error);
			}
		}

		return sums;
	},


	/**
	 * Renders the kit stock, the era cards and the bottombar.
	 */
	Render: () => {
		const kits = GBGoods.KitInfo();
		const eras = GBGoods.CollectEras();
		const city = GBGoods.ShiftedCityBuildings(Object.fromEntries(eras.map(era => [era.eraId, era.missing])));
		const sources = [...GBGoods.InventoryBuildings(), ...city.filter(building => !building.busy)];
		const production = GBGoods.CityProduction();

		$('#gbGoodsKits').html(GBGoods.KitIds.map(id =>
			`<span class="gbg-kit" title="${HTML.i18nTooltip(`${kits[id].name}: ${kits[id].effect}`)}"><img src="${kits[id].icon}" alt="">${kits[id].name} <span class="gbg-arrow">${kits[id].arrow}</span>: <strong>${GBGoods.Format(kits[id].stock)}</strong></span>`
		).join(''));

		// keep the scroll position, the list is rendered again on every game update
		const inner = $('#gbGoodsInner');
		const scroll = inner.scrollTop();

		inner.html(eras.length > 0
			? eras.map(era => GBGoods.BuildCard(
				era,
				GBGoods.Candidates(era.eraId, sources, kits),
				kits,
				production[era.eraId] || 0,
				city.filter(building => building.standing[era.eraId] >= 1)
			)).join('')
			: `<div class="no-data"><em>${i18n(GBGoods.EraFilter === 'missing' ? 'Boxes.GBGoods.NothingMissing' : 'Boxes.GBGoods.NoGBs')}</em></div>`
		).scrollTop(scroll);

		$('#gbGoodsBottombar').html(HTML.i18nReplacer(i18n('Boxes.GBGoods.Footer'), { boost: GBGoods.Format(Boosts.Sums?.goods_production || 0) }));
	},


	/**
	 * Renders one era as a card: clickable header with the goods stock and the
	 * state of the demand, below it the great buildings, the current production
	 * of the city with the buildings already moved for these goods, and the ranked
	 * buildings.
	 * @param {GBGoodsEra} era
	 * @param {GBGoodsCandidate[]} candidates buildings yielding goods of the era, best first
	 * @param {Object<string, {stock: number, name: string, icon: string}>} kits see KitInfo
	 * @param {number} production goods of the era the city yields per day
	 * @param {Object[]} working buildings of the city standing in another era than the player's that yield goods of the era (see ShiftedCityBuildings)
	 * @returns {string} HTML
	 */
	BuildCard: (era, candidates, kits, production, working) => {
		const expanded = GBGoods.Expanded[era.eraId] ?? (era.missing > 0);
		const h = [];

		let state = `<span class="gbg-state gbg-muted">${i18n('Boxes.GBGoods.NoDemand')}</span>`;
		if (era.missing > 0) {
			state = `<span class="gbg-state text-danger">${HTML.i18nReplacer(i18n('Boxes.GBGoods.Missing'), { amount: GBGoods.Format(era.missing) })}</span>`;
		}
		else if (era.needSum > 0) {
			state = `<span class="gbg-state text-success">${i18n('Boxes.GBGoods.Covered')}</span>`;
		}

		h.push(`<div class="gbg-card${expanded ? ' open' : ''}" data-era="${era.eraId}">`);
		h.push('<div class="gbg-header game-cursor">');
		h.push(`<span class="gbg-chevron">${expanded ? '▼' : '▶'}</span>`);
		h.push(`<span class="gbg-era">${GBGoods.EraName(era.eraId)}</span>`);
		h.push(`<span class="gbg-goods">${era.goods.map(id => GBGoods.GoodChip(id, era.need[id] || 0)).join('')}</span>`);
		h.push(state);
		h.push('</div>');

		if (expanded) {
			h.push('<div class="gbg-body">');
			h.push(era.gbs.map(gb => GBGoods.BuildGBLine(gb)).join(''));
			h.push(`<div class="gbg-production">${HTML.i18nReplacer(i18n('Boxes.GBGoods.CityProduction'), { amount: GBGoods.Format(Math.round(production)) })}`);
			if (working.length > 0) {
				h.push(' ' + i18n('Boxes.GBGoods.Working') + ' ' + working.map(building =>
					`${building.stock}× ${HTML.escapeHtml(MainParser.CityEntities[building.entityId].name)} (${GBGoods.Format(Math.round(building.standing[era.eraId] * building.stock))})`
				).join(', '));
			}
			h.push('</div>');
			h.push(GBGoods.BuildCandidateTable(era, candidates, kits));
			h.push('</div>');
		}

		h.push('</div>');

		return h.join('');
	},


	/**
	 * Renders the stock of one good, coloured by whether it covers the demand.
	 * @param {string} id good id
	 * @param {number} need demand of the planned unlocks
	 * @returns {string} HTML
	 */
	GoodChip: (id, need) => {
		const stock = ResourceStock[id] || 0;
		const state = (need > stock ? 'text-danger' : (need > 0 ? 'text-success' : ''));
		const title = [`${GoodsData[id]?.name || id} – ${i18n('Boxes.Kits.InStock')}: ${GBGoods.Format(stock)}`];

		if (need > 0) title.push(`${i18n('Boxes.GBGoods.Demand')}: ${GBGoods.Format(need)}`);
		if (need > stock) title.push(`${i18n('Boxes.ShopAssist.Missing')}: ${GBGoods.Format(need - stock)}`);

		return `<span class="gbg-good ${state}" title="${HTML.i18nTooltip(title.join(', '))}">${srcLinks.icons(id)}${GBGoods.Format(stock)}</span>`;
	},


	/**
	 * Renders one placed great building with its level, tier and the goods the
	 * planned level unlocks cost.
	 * @param {GBGoodsBuilding} gb
	 * @returns {string} HTML
	 */
	BuildGBLine: (gb) => {
		let plan = '';

		if (gb.rework && gb.to >= gb.from) {
			const levels = (gb.to > gb.from
				? HTML.i18nReplacer(i18n('Boxes.GBGoods.UnlockLevels'), { from: gb.from, to: gb.to })
				: HTML.i18nReplacer(i18n('Boxes.GBGoods.UnlockLevel'), { level: gb.from }));

			plan = `${levels}: ` + (gb.perGood > 0
				? `<strong>${HTML.i18nReplacer(i18n('Boxes.GBGoods.PerGood'), { amount: GBGoods.Format(gb.perGood) })}</strong>`
				: i18n('Boxes.GBGoods.NoGoods'));
		}
		if (gb.unknown) {
			plan += (plan !== '' ? ', ' : '') + HTML.i18nReplacer(i18n('Boxes.GBGoods.UnlockUnknown'), { level: gb.to + 1 });
		}

		return `<div class="gbg-gb">
					<img class="gbg-gb-icon" src="${gb.icon}" alt="">
					<span class="gbg-gb-name">${HTML.escapeHtml(gb.name)}</span>
					<span class="gbg-gb-level">${i18n('General.Level')} ${gb.level}/${gb.maxLevel}</span>
					${GreatBuildings.TierBadge(gb.tier)}
					<span class="gbg-gb-plan">${plan}</span>
				</div>`;
	},


	/**
	 * Renders the ranked buildings of an era as a table. Only the best ones are
	 * listed until "show more" is clicked.
	 * @param {GBGoodsEra} era
	 * @param {GBGoodsCandidate[]} candidates best first
	 * @param {Object<string, {stock: number, name: string, icon: string}>} kits see KitInfo
	 * @returns {string} HTML
	 */
	BuildCandidateTable: (era, candidates, kits) => {
		if (candidates.length === 0) {
			return `<div class="gbg-none"><em>${i18n('Boxes.GBGoods.NoCandidates')}</em></div>`;
		}

		const showAll = !!GBGoods.ShowAll[era.eraId];
		const rows = (showAll ? candidates : candidates.slice(0, GBGoods.TopCount));
		const withDays = (era.missing > 0);
		const h = [];

		h.push('<table class="foe-table gbg-table"><thead><tr>');
		h.push(`<th colspan="2" title="${HTML.i18nTooltip(i18n('Boxes.GBGoods.ColBuildingTT'))}">${i18n('Boxes.GBGoods.ColBuilding')}</th>`);
		h.push(`<th class="text-center">${i18n('Boxes.GBGoods.ColSize')}</th>`);
		h.push(`<th class="text-center">${i18n('Boxes.GBGoods.ColCount')}</th>`);
		h.push(`<th class="text-right">${i18n('Boxes.GBGoods.ColPerDay')}</th>`);
		h.push(`<th class="text-right">${i18n('Boxes.GBGoods.ColPerTile')}</th>`);
		h.push(`<th title="${HTML.i18nTooltip(i18n('Boxes.GBGoods.ColKitsTT'))}">${i18n('Boxes.GBGoods.ColKits')}</th>`);
		if (withDays) h.push(`<th class="text-right" title="${HTML.i18nTooltip(i18n('Boxes.GBGoods.ColDaysTT'))}">${i18n('Boxes.GBGoods.ColDays')}</th>`);
		h.push('</tr></thead><tbody>');

		for (const candidate of rows) {
			const average = (candidate.random ? `<span class="gbg-muted" title="${HTML.i18nTooltip(i18n('Boxes.GBGoods.AverageTT'))}">Ø </span>` : '');
			const others = Object.entries(candidate.others)
				.map(([eraId, amount]) => `+ ${GBGoods.Format(Math.round(amount))} ${GBGoods.EraName(Number(eraId))}`)
				.join(', ');
			const eraName = Technologies.InnoEraNames[candidate.buildingEra];
			// a building of the city: where it stands and what it yields there so far
			let inCity = '';
			if (candidate.fromEra !== null) {
				const yieldsThere = Object.entries(candidate.standing)
					.filter(([, amount]) => amount >= 1)
					.map(([eraId, amount]) => `${GBGoods.Format(Math.round(amount))} ${GBGoods.EraName(Number(eraId))}`)
					.join(', ');

				inCity = HTML.i18nReplacer(i18n('Boxes.GBGoods.InCity'), { era: GBGoods.EraName(candidate.fromEra) })
					+ (yieldsThere !== '' ? ', ' + HTML.i18nReplacer(i18n('Boxes.GBGoods.InCityYields'), { goods: yieldsThere }) : '');
			}

			h.push(`<tr${candidate.fromEra !== null ? ' class="gbg-city"' : ''}>`);
			h.push(`<td class="gbg-icon-cell"><img class="gbg-building-icon" loading="lazy" src="${candidate.icon}" alt=""></td>`);
			h.push(`<td class="gbg-building fh-tooltip game-cursor" data-meta_id="${candidate.entityId}" data-era="${eraName}" data-callback_tt="Tooltips.buildingTT">`);
			h.push(`<span class="gbg-building-name">${HTML.escapeHtml(candidate.name)}</span>`);
			if (candidate.limited !== '') h.push(`&nbsp;<span class="gbg-limited" title="${HTML.i18nTooltip(candidate.limited)}">⏳</span>`);
			// buildings yielding goods of the previous or next era stand one era off
			if (candidate.buildingEra !== era.eraId) {
				h.push(`<span class="gbg-other-era text-warning">${HTML.i18nReplacer(i18n('Boxes.GBGoods.BuildingEra'), { era: GBGoods.EraName(candidate.buildingEra) })}</span>`);
			}
			if (others !== '') h.push(`<span class="gbg-others">${others}</span>`);
			if (inCity !== '') h.push(`<span class="gbg-in-city">${inCity}</span>`);
			h.push('</td>');
			h.push(`<td class="text-center">${candidate.size.label}</td>`);
			h.push(`<td class="text-center">${GBGoods.Format(candidate.stock)}</td>`);
			h.push(`<td class="text-right gbg-per-day">${average}${GBGoods.Format(Math.round(candidate.perDay))}</td>`);
			h.push(`<td class="text-right">${GBGoods.Format(Math.round(candidate.perTile * 10) / 10)}</td>`);
			h.push(`<td>${GBGoods.KitsCell(candidate.kits, kits)}</td>`);
			if (withDays) h.push(`<td class="text-right">${GBGoods.Format(Math.ceil(era.missing / candidate.gain))}</td>`);
			h.push('</tr>');
		}

		h.push('</tbody></table>');

		if (candidates.length > GBGoods.TopCount) {
			h.push(`<div class="gbg-more game-cursor">${showAll
				? i18n('Boxes.GBGoods.ShowLess')
				: HTML.i18nReplacer(i18n('Boxes.GBGoods.ShowMore'), { count: candidates.length - GBGoods.TopCount })}</div>`);
		}

		return h.join('');
	},


	/**
	 * Renders the kits a building needs to reach its era: the preferred way and
	 * below it the other one, each green when the stock covers it and red
	 * otherwise. Every kit carries its name and its direction arrow, the steps of
	 * a way are joined by "then"; the tooltip explains what each kit does and
	 * shows its stock.
	 * @param {GBGoodsKitRoute} route
	 * @param {Object<string, {stock: number, name: string, arrow: string, effect: string}>} kits see KitInfo
	 * @returns {string} HTML
	 */
	KitsCell: (route, kits) => {
		if (route.total === 0) return '<span class="gbg-muted">–</span>';

		const way = ({ steps, possible }) => {
			const title = steps.map(step => {
				const kit = kits[step.kit];

				return `${GBGoods.Format(step.amount)}× ${kit.name} ${kit.arrow} – ${kit.effect} (${i18n('Boxes.Kits.InStock')}: ${GBGoods.Format(kit.stock)})`;
			}).join('\n');

			return `<span class="${possible ? 'text-success' : 'text-danger'}" title="${HTML.i18nTooltip(title)}">`
				+ steps.map(step => `${GBGoods.Format(step.amount)}× ${kits[step.kit].name} <span class="gbg-arrow">${kits[step.kit].arrow}</span>`)
					.join(`, ${i18n('Boxes.GBGoods.Then')} `)
				+ '</span>';
		};

		return `<span class="gbg-route">${way(route)}</span>`
			+ (route.alternative ? `<span class="gbg-route gbg-alternative">${i18n('Boxes.GBGoods.Or')} ${way(route.alternative)}</span>` : '');
	},
};
