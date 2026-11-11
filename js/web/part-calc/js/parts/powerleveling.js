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

// Power leveling box (#PowerLevelingBox) — split out of part-calc.js.
// Loaded after part-calc.js via the "parts" mechanism in js/internal.json,
// so it can safely extend the existing Parts object.

// unlock costs of the next level of an own GB, the game requests them for its unlock dialog
FoEproxy.addHandler('GreatBuildingsService', 'getUnlockCosts', (data, postData) => {
	Parts.SaveUnlockCosts(data.responseData, postData[0]?.requestData?.[0]);
});

// the level the unlock costs were requested for got unlocked
FoEproxy.addHandler('GreatBuildingsService', 'unlockLevel', (data, postData) => {
	const { EntityID, Target } = Parts.UnlockPending || {},
		Requested = postData[0]?.requestData?.[0];

	// the request names the GB by its entity id, a map id of that GB is accepted as well
	if (!EntityID || (Requested !== undefined && Requested !== EntityID && MainParser.CityMapData[Requested]?.['cityentity_id'] !== EntityID)) return;

	Parts.UnlockedLevels[EntityID] = Math.max(Parts.UnlockedLevels[EntityID] || 0, Target);
	Parts.UpdateTableBodyPowerLeveling();
});

// blueprint inventory of all GBs (inventory window) or of the opened own GB
FoEproxy.addHandler('InventoryService', 'getGreatBuildings', data => Parts.SetBlueprintSets(data.responseData));
FoEproxy.addHandler('BlueprintService', 'getGreatBuildingInventoryForGreatBuilding', data => Parts.SetBlueprintSets(data.responseData));


Object.assign(Parts, {

	/** @type {?Object} Unlock cost table of data/unlock-costs.json (lazy, see LoadUnlockCosts) */
	UnlockCostsModel: null,

	/** @type {?Object<string, Object<string, Object<string, number>>>} Unlock costs the game reported, per GB and unlocked level (lazy, see GetSeenUnlockCosts) */
	UnlockCostsSeen: null,

	/** @type {?{EntityID: string, Target: number}} GB level the game last requested the unlock costs for */
	UnlockPending: null,

	/** @type {Object<string, number>} Highest level unlocked in this session per own GB (the city data can lag behind) */
	UnlockedLevels: {},

	/** @type {Object<string, {blueprint_copper: number, blueprint_gold: number}>} Complete blueprint sets per own GB */
	BlueprintSets: {},

	/** @type {string[]} Unlock cost resources apart from blueprints and goods, in display order */
	UnlockBulkResources: ['money', 'supplies', 'medals'],


	/**
	 * Opens (or updates) the power leveling box for the GB shown in the own part calculator.
	 *
	 * @param {boolean} event - true keeps an already open box and only refreshes its content
	 */
	ShowPowerLeveling: (event) => {
		Parts.BuildBoxPowerLeveling(event);
	},


	/**
	 * Creates the power leveling box in the DOM (including all input events) or
	 * closes it again when it is already open and no refresh was requested.
	 * The unlock cost table is loaded before the content is rendered.
	 *
	 * @param {boolean} event - true keeps an already open box and only refreshes its content
	 * @returns {Promise<void>}
	 */
	BuildBoxPowerLeveling: async (event) => {
		if ($('#PowerLevelingBox').length === 0) {
			HTML.Box({
				'id': 'PowerLevelingBox',
				'title': i18n('Boxes.PowerLeveling.Title'),
				'auto_close': true,
				'dragdrop': true,
				'minimize': true,
				active_maps: 'main',
			});

			const box = $('#PowerLevelingBox');

			// Events on the `startLevel` input field
			box.on('blur', '#startLevel', function () {
				Parts.PowerLevelingStartLevel = parseFloat($('#startLevel').val());
				Parts.UpdateTableBodyPowerLeveling();
			});
			box.on('keydown', '#startLevel', function (e) {
				const key = e.key;
				const input = e.target;
				if (key === "ArrowUp") {
					Parts.PowerLevelingStartLevel = Number.parseInt(input.value) + 1;
					Parts.UpdateTableBodyPowerLeveling();
					e.preventDefault();
				} else if (key === "ArrowDown") {
					Parts.PowerLevelingStartLevel = Number.parseInt(input.value) - 1;
					Parts.UpdateTableBodyPowerLeveling();
					e.preventDefault();
				} else if (key === "Enter") {
					Parts.PowerLevelingStartLevel = Number.parseInt(input.value);
					Parts.UpdateTableBodyPowerLeveling();
				}
			});

			// Events on the `endLevel` input field
			box.on('blur', '#endLevel', function () {
				Parts.PowerLevelingEndLevel = parseFloat($('#endLevel').val());
				Parts.UpdateTableBodyPowerLeveling();
				//Parts.CalcBodyPowerLeveling();
			});
			box.on('keydown', '#endLevel', function (e) {
				const key = e.key;
				const input = e.target;
				if (key === "ArrowUp") {
					Parts.PowerLevelingEndLevel = Number.parseInt(input.value) + 1;
					Parts.UpdateTableBodyPowerLeveling();
					e.preventDefault();
				} else if (key === "ArrowDown") {
					Parts.PowerLevelingEndLevel = Number.parseInt(input.value) - 1;
					Parts.UpdateTableBodyPowerLeveling();
					e.preventDefault();
				} else if (key === "Enter") {
					Parts.PowerLevelingEndLevel = Number.parseInt(input.value);
					Parts.UpdateTableBodyPowerLeveling();
				}
			});

			// Event on the "Copy values" button in each row
			box.on('click', '.button-powerlevel-copy', function () {
				let gb_level = parseInt($(this).parent().find(".hidden-text").html());

				let PlaceCount = Parts.PowerLevelingData.Places[gb_level].length;
				let CopyParts = Parts.GetCopyStringEx(Places=Array(PlaceCount).fill(true), Maezens=Parts.PowerLevelingData.Places[gb_level], Level=gb_level, OwnPart=Parts.PowerLevelingData.EigenNettos[gb_level], PlaceAll=true, PlaceAuto=false, PlaceAutoUnsafe=false, DangerPlaces=Array(PlaceCount).fill(0), LeveltLG=Array(PlaceCount).fill(false));
				helper.str.copyToClipboardLegacy(CopyParts);
			});

			// unlock cost column and summary on/off
			box.on('click', '.show-unlock-costs', function () {
				localStorage.setItem('PowerLevelingUnlockCosts', $(this).prop('checked'));
				Parts.CalcBodyPowerLeveling();
			});
		}
		else if (!event) {
			HTML.CloseOpenBox('PowerLevelingBox');
			return;
		}

		await Parts.LoadUnlockCosts();
		Parts.CalcBodyPowerLeveling();
	},


	/**
	 * Loads the unlock cost table shipped with the module (cached).
	 *
	 * @returns {Promise<Object>} Content of data/unlock-costs.json, empty when it could not be loaded
	 */
	LoadUnlockCosts: async () => {
		if (Parts.UnlockCostsModel !== null) return Parts.UnlockCostsModel;

		try {
			Parts.UnlockCostsModel = await (await fetch(`${extUrl}js/web/part-calc/data/unlock-costs.json?v=${extVersion}`)).json();
		}
		catch (error) {
			console.error('Parts: loading unlock-costs.json failed', error);
			Parts.UnlockCostsModel = {};
		}

		return Parts.UnlockCostsModel;
	},


	/**
	 * Unlock costs the game reported so far (kept in the localStorage), per GB and unlocked level.
	 *
	 * @returns {Object<string, Object<string, Object<string, number>>>}
	 */
	GetSeenUnlockCosts: () => {
		Parts.UnlockCostsSeen ??= JSON.parse(localStorage.getItem(Parts.GetStorageKey('UnlockCosts', null)) || '{}');

		return Parts.UnlockCostsSeen;
	},


	/**
	 * Stores the unlock costs the game reported for the next level of an own GB.
	 * They replace the table values of that level (see CalcUnlockCosts).
	 *
	 * @param {Object} Response GreatBuildingUnlockCost: {cityEntityId, resourceCosts, blueprintCosts: [{tier, blueprintSetAmount}]}
	 * @param {string} [RequestID] City entity id of the request, used when the response carries none
	 */
	SaveUnlockCosts: (Response, RequestID) => {
		const EntityID = Response?.['cityEntityId'] || RequestID,
			MaxLevel = Object.values(MainParser.CityMapData).find(Building => Building['cityentity_id'] === EntityID)?.['max_level'];

		if (!Response || !(MaxLevel > 0)) return; // unlocked level unknown: the costs cannot be assigned to a level

		const Target = Math.max(MaxLevel, Parts.UnlockedLevels[EntityID] || 0) + 1,
			Seen = Parts.GetSeenUnlockCosts(),
			Costs = Object.fromEntries([
				...(Response['blueprintCosts'] || []).map(Blueprint => [`blueprint_${Blueprint['tier']?.['value'] || Blueprint['tier'] || 'copper'}`, Blueprint['blueprintSetAmount']]),
				...Object.entries(Response['resourceCosts']?.['resources'] || Response['resourceCosts'] || {})
			].filter(([, Amount]) => Amount > 0));

		Seen[EntityID] = { ...Seen[EntityID], [Target]: Costs };
		localStorage.setItem(Parts.GetStorageKey('UnlockCosts', null), JSON.stringify(Seen));

		Parts.UnlockPending = { EntityID, Target };
		Parts.UpdateTableBodyPowerLeveling();
	},


	/**
	 * Takes over the blueprint inventory of own GBs as complete sets per tier
	 * (a set needs each of the nine pieces once).
	 *
	 * @param {Object|Object[]} Inventory InventoryGreatBuilding(s): {cityentity_id, blueprints: [{piece_number, tier: {value}, amount}]}
	 */
	SetBlueprintSets: (Inventory) => {
		for (const Building of [].concat(Inventory || [])) {
			if (!Building?.['cityentity_id'] || !Array.isArray(Building['blueprints'])) continue;

			const Pieces = { blueprint_copper: Array(9).fill(0), blueprint_gold: Array(9).fill(0) };
			for (const Blueprint of Building['blueprints']) {
				const Tier = Pieces[`blueprint_${Blueprint?.['tier']?.['value'] || Blueprint?.['tier'] || 'copper'}`];
				// the server leaves out zero values: the first piece comes without piece_number, a missing piece without amount
				if (Tier) Tier[Blueprint['piece_number'] || 0] = Blueprint['amount'] || 0;
			}

			Parts.BlueprintSets[Building['cityentity_id']] = { blueprint_copper: Math.min(...Pieces.blueprint_copper), blueprint_gold: Math.min(...Pieces.blueprint_gold) };
		}

		Parts.UpdateTableBodyPowerLeveling();
	},


	/**
	 * Goods a GB pays its unlock costs in: the goods of its construction costs,
	 * without them the goods the game reported, otherwise the placeholder 'goods'.
	 *
	 * @param {string} EntityID Entity id of the great building
	 * @returns {string[]} Resource ids
	 */
	GetUnlockGoods: (EntityID) => {
		const Lists = [
			// the build costs also list coins, supplies, population and diamonds with an amount of 0, only the goods have one
			Object.entries(MainParser.CityEntities[EntityID]?.['requirements']?.['cost']?.['resources'] || {}).filter(([id, amount]) => amount > 0 && GoodsData[id]).map(([id]) => id),
			...Object.values(Parts.GetSeenUnlockCosts()[EntityID] || {}).map(Costs => Object.keys(Costs))
		];

		return Lists.map(List => List.filter(id => !id.startsWith('blueprint_') && !Parts.UnlockBulkResources.includes(id))).find(List => List.length > 0) || ['goods'];
	},


	/**
	 * Unlock costs of a GB level from the table of data/unlock-costs.json: blueprint
	 * sets per tier are constant within a segment, resources grow by a fixed step per level.
	 *
	 * @param {string} EntityID Entity id of the great building
	 * @param {number} Target Level that gets unlocked
	 * @returns {?Object<string, number>} Amount per resource id (blueprint_copper / blueprint_gold = sets), null without data
	 */
	GetModelUnlockCosts: (EntityID, Target) => {
		const Model = Parts.UnlockCostsModel,
			[Blueprints, Resources, LastLevel] = Model?.['buildings']?.[EntityID] || [];

		if (!Blueprints || Target > LastLevel) return null;

		const Segment = (Segments) => Segments.filter(([First]) => First <= Target).pop(),
			[, Copper, Gold] = Segment(Model['blueprints'][Blueprints]) || [],
			Costs = {};

		if (Copper) Costs['blueprint_copper'] = Copper;
		if (Gold) Costs['blueprint_gold'] = Gold;

		for (const [id, Segments] of Object.entries(Model['resources'][Resources] || {})) {
			const [First, Amount, Step] = Segment(Segments) || [];
			if (First === undefined) continue;

			for (const Resource of (id === 'goods' ? Parts.GetUnlockGoods(EntityID) : [id])) {
				Costs[Resource] = Amount + Step * (Target - First);
			}
		}

		return Costs;
	},


	/**
	 * Unlock costs of the levels of a power leveling range: costs the game reported
	 * win over the table, levels the GB has already unlocked cost nothing. A GB whose
	 * reported costs contradict the table only shows reported costs. For own GBs every
	 * level also lists what the stock no longer covers up to that level.
	 *
	 * @param {number} StartLevel First level of the range
	 * @param {number} EndLevel Level the range ends with
	 * @returns {?{Rows: Object[], Sums: Object<string, number>, Unknown: number, Mismatch: boolean, IsOwn: boolean}} null without unlock costs (classic world)
	 */
	CalcUnlockCosts: (StartLevel, EndLevel) => {
		const Entity = Parts.CurrentGB.Entity,
			EntityID = Entity['cityentity_id'];

		if (!GreatBuildings.IsRework(EntityID)) return null;

		const IsOwn = (Entity['player_id'] === ExtPlayerID),
			// own GBs: the city data and unlocks of this session can be ahead of the opened GB
			OwnLevels = (IsOwn ? [MainParser.CityMapData[Entity['id']]?.['max_level'], Parts.UnlockedLevels[EntityID]] : []),
			Unlocked = Math.max(...[Entity['level'], Entity['max_level'], ...OwnLevels].map(Level => Level || 0)),
			Seen = Parts.GetSeenUnlockCosts()[EntityID] || {},
			Mismatch = Object.keys(Seen).some(Target => {
				const Model = Parts.GetModelUnlockCosts(EntityID, Number(Target));

				return Model !== null && JSON.stringify(Object.entries(Model).sort()) !== JSON.stringify(Object.entries(Seen[Target]).sort());
			}),
			Rows = [],
			Sums = {};
		let Unknown = 0;

		for (let i = StartLevel; i < EndLevel; i++) {
			const Costs = (i < Unlocked ? {} : (Seen[i + 1] || (Mismatch ? null : Parts.GetModelUnlockCosts(EntityID, i + 1)))),
				Missing = {};

			if (!Costs) Unknown++;

			for (const [id, Amount] of Object.entries(Costs || {})) {
				const Stock = Parts.GetUnlockStock(EntityID, id);

				Sums[id] = (Sums[id] || 0) + Amount;
				if (IsOwn && Sums[id] > Stock) Missing[id] = Sums[id] - Stock;
			}

			Rows[i] = { Costs, Missing, Done: i < Unlocked };
		}

		return { Rows, Sums, Unknown, Mismatch, IsOwn };
	},


	/**
	 * Stock of an unlock cost resource: complete blueprint sets of the GB or the resource stock.
	 *
	 * @param {string} EntityID Entity id of the great building
	 * @param {string} id Resource id, blueprint_copper or blueprint_gold
	 * @returns {number|undefined} undefined when the stock is not known
	 */
	GetUnlockStock: (EntityID, id) => {
		if (id.startsWith('blueprint_')) return Parts.BlueprintSets[EntityID]?.[id];

		return (id === 'goods' ? undefined : (ResourceStock[id] || 0));
	},


	/**
	 * Ids of unlock costs in display order: blueprint sets, goods, then coins, supplies and medals.
	 *
	 * @param {Object<string, number>} Costs Amount per resource id
	 * @returns {string[]}
	 */
	SortUnlockCosts: (Costs) => {
		const Rank = id => (id.startsWith('blueprint_') ? 0 : 2 + Parts.UnlockBulkResources.indexOf(id)); // goods: 1

		return Object.keys(Costs).sort((a, b) => Rank(a) - Rank(b) || (Rank(a) ? 0 : a.localeCompare(b)));
	},


	/**
	 * Name of an unlock cost resource, blueprint sets are named by their tier.
	 *
	 * @param {string} id Resource id, blueprint_copper or blueprint_gold
	 * @returns {string}
	 */
	GetUnlockCostName: (id) => {
		if (id === 'goods') return i18n('Boxes.PowerLeveling.UnlockPerGood');
		if (!id.startsWith('blueprint_')) return GoodsData[id]?.['name'] || id;

		return `${i18n('Boxes.PowerLeveling.UnlockSets')} (${i18n(`Boxes.OwnpartCalculator.Tier${id === 'blueprint_gold' ? 'Gold' : 'Copper'}`)})`;
	},


	/**
	 * Game icon of an unlock cost resource, blueprint sets use the blueprint icon of their tier.
	 *
	 * @param {string} id Resource id, blueprint_copper or blueprint_gold
	 * @returns {string} HTML, empty for the goods placeholder
	 */
	GetUnlockCostIcon: (id) => (id === 'goods' ? '' : srcLinks.icons({ blueprint_copper: 'reward_blueprint', blueprint_gold: 'reward_blueprint_gold' }[id] || id)),


	/**
	 * Unlock cost cell of a level: blueprint sets and goods exactly, coins, supplies and
	 * medals shortened, all details in the tooltip. Costs the stock no longer covers up
	 * to this level are shown in the warning colour.
	 *
	 * @param {{Costs: ?Object<string, number>, Missing: Object<string, number>, Done: boolean}} Row Level row of CalcUnlockCosts
	 * @returns {string} HTML
	 */
	GetUnlockCostCell: ({ Costs, Missing, Done }) => {
		if (Done) return `<span class="text-success" title="${HTML.i18nTooltip(i18n('Boxes.PowerLeveling.UnlockDone'))}">&#10003;</span>`;
		if (!Costs) return '?';
		if (Object.keys(Costs).length === 0) return '-';

		const ids = Parts.SortUnlockCosts(Costs),
			Goods = ids.filter(id => !id.startsWith('blueprint_') && !Parts.UnlockBulkResources.includes(id)),
			// goods of the same amount share one entry ("5×92")
			Grouped = (Goods.length > 1 && Goods.every(id => Costs[id] === Costs[Goods[0]])),
			Cells = ids.filter(id => !Grouped || !Goods.slice(1).includes(id)).map(id => {
				const Members = (Grouped && id === Goods[0] ? Goods : [id]),
					Amount = (Parts.UnlockBulkResources.includes(id) ? HTML.FormatNumberShort(Costs[id]) : HTML.Format(Costs[id]));

				return `<span class="unlock-cost${Members.some(Member => Missing[Member]) ? ' text-danger' : ''}">${Members.length > 1 ? `${Members.length}&times;` : ''}${Amount}${Parts.GetUnlockCostIcon(id)}</span>`;
			}),
			Tooltip = ids.map(id => `${Parts.GetUnlockCostName(id)}: ${HTML.Format(Costs[id])}${Missing[id] ? ` <span class='text-danger'>(${i18n('Boxes.ShopAssist.Missing')}: ${HTML.Format(Missing[id])})</span>` : ''}`);

		return `<span class="td-tooltip" data-original-title="${HTML.i18nTooltip(Tooltip.join('<br>'))}">${Cells.join(' ')}</span>`;
	},


	/**
	 * Unlock cost summary of the power leveling range: the total per resource, for own
	 * GBs compared with the stock, plus hints about levels without data.
	 *
	 * @returns {string} HTML, empty when the unlock costs are not shown
	 */
	GetUnlockCostSummary: () => {
		const { Unlock, StartLevel, EndLevel } = Parts.PowerLevelingData,
			ids = Parts.SortUnlockCosts(Unlock?.Sums || {});

		if (!Unlock || (ids.length === 0 && Unlock.Unknown === 0 && !Unlock.Mismatch)) return '';

		const Stock = id => Parts.GetUnlockStock(Parts.CurrentGB.Entity['cityentity_id'], id),
			Row = (Label, Cell) => `<tr><td>${Label}</td>${ids.map(id => `<td>${Cell(id)}</td>`).join('')}</tr>`,
			h = [];

		if (ids.length > 0) {
			h.push(`<table class="foe-table no-hover unlock-sum"><thead><tr><th>${StartLevel} → ${EndLevel}</th>`);
			h.push(ids.map(id => `<th title="${HTML.i18nTooltip(Parts.GetUnlockCostName(id))}">${Parts.GetUnlockCostIcon(id) || Parts.GetUnlockCostName(id)}</th>`).join(''));
			h.push('</tr></thead><tbody>');
			h.push(Row(i18n('Boxes.Technologies.DescRequired'), id => HTML.Format(Unlock.Sums[id])));

			if (Unlock.IsOwn) {
				// only the blueprint stock becomes known by opening the building or the inventory
				const Unknown = id => (id.startsWith('blueprint_') ? `<span title="${HTML.i18nTooltip(i18n('Boxes.PowerLeveling.UnlockStockUnknown'))}">?</span>` : '?');

				h.push(Row(i18n('Boxes.Technologies.DescInStock'), id => (Stock(id) === undefined ? Unknown(id) : HTML.Format(Stock(id)))));
				h.push(Row(i18n('Boxes.ShopAssist.Missing'), id => {
					if (Stock(id) === undefined) return Unknown(id);

					return (Unlock.Sums[id] > Stock(id) ? `<strong class="text-danger">${HTML.Format(Unlock.Sums[id] - Stock(id))}</strong>` : '<span class="text-success">&#10003;</span>');
				}));
			}

			h.push('</tbody></table>');
		}

		const Hints = [i18n('Boxes.PowerLeveling.UnlockHint')];
		if (Unlock.Unknown > 0) Hints.push(HTML.i18nReplacer(i18n('Boxes.PowerLeveling.UnlockUnknown'), { count: Unlock.Unknown }));
		if (Unlock.Mismatch) Hints.push(i18n('Boxes.PowerLeveling.UnlockMismatch'));
		h.push(`<div class="text-center unlock-hint"><em>${Hints.join(' ')}</em></div>`);

		return h.join('');
	},


	/**
	 * Calculates the power leveling table data for the configured level range:
	 * the total FP per level, the FP of the patron spots (five, seven on gold
	 * tier levels), the own part (gross and net), the double collection of
	 * FP producing GBs and, after the prestige rework, the unlock costs of the levels.
	 *
	 * @returns {{HasDoubleCollection: boolean, Places: number[][], PlaceCount: number, CityEntity: object, OwnPartSum: number, StartLevel: number, EndLevel: number, EigenBruttos: number[], DoubleCollections: number[], EigenNettos: number[], IsEstimated: boolean, HasUnlockCosts: boolean, Unlock: ?Object}} Unlock: see CalcUnlockCosts, null when hidden or not available
	 */
	CalcBodyPowerLevelingData: () => {
		let EntityID = Parts.CurrentGB.Entity['cityentity_id'],
			CityEntity = MainParser.CityEntities[EntityID],
			EraName = GreatBuildings.GetEraName(EntityID),
			Era = Technologies.Eras[EraName],
			IsRework = GreatBuildings.IsRework(EntityID),
			// classic worlds end with the reward table, the prestige rework with the maximum level (capped to keep the table usable)
			MaxLevel = (IsRework ? Math.min(GreatBuildings.GetReworkMaxLevel(EntityID), 1000) : GreatBuildings.GetP1MaxLevel(Era)),
			StartLevel = Parts.PowerLevelingStartLevel,
			EndLevel = Math.min(Parts.PowerLevelingEndLevel, MaxLevel);

		// without a chosen end level the table of an uncapped gold building ends with the last bonus breakpoint
		if (IsRework && Parts.PowerLevelingEndLevel === 999999 && StartLevel < 500) EndLevel = Math.min(EndLevel, 500);

		// Limit minimum value for the power leveling range
		StartLevel = StartLevel < 0 ? 0 : StartLevel;
		EndLevel = EndLevel <= 0 ? 1 : EndLevel;

		// StartLevel must be a smaller number than EndLevel
		StartLevel = StartLevel >= EndLevel ? EndLevel - 1 : StartLevel;

		let Totals = [],
			Places = [],
			EigenBruttos = [],
			HasDoubleCollection = false,
			DoubleCollections = [],
			EigenNettos = [];

		let OwnPartSum = 0,
			PlaceCount = 5;

		// prestige rework: the FP production is a tier bonus of the metadata
		const ReworkFPBonus = (IsRework ? (CityEntity['bonuses'] || []).flatMap(Tier => Tier['bonuses'] || [])
			.find(Bonus => Bonus['type'] === 'strategy_points' && Bonus['bonusCategory']?.['value'] === 'productionBonus') : undefined);

		// arc percents per tier, gold tier level-ups have their own
		const ArcPercents = { false: Parts.GetArcPercents(false), true: Parts.GetArcPercents(true) };

		for (let i = StartLevel; i < EndLevel; i++) {
			// How many FPs are needed in total to level the GB
			Totals[i] = GreatBuildings.GetBruttoCosts(EntityID, i);

			// How many FPs are needed for each spot.
			// For non-current levels, calculate the FPs for each spot...
			// (the live values are also unusable when no level is open, e.g. a locked rework level)
			if (i != Parts.Level || !Number.isFinite(Parts.RemainingOwnPart)) {
				Places[i] = (Totals[i] !== undefined ? GreatBuildings.GetPatronRewards(EntityID, i, ArcPercents[Parts.IsGoldLevel(i)], Totals[i]) : undefined);

				// no cost or reward data from this level on: the table ends here
				if (!Places[i]) {
					delete Totals[i];
					delete Places[i];
					EndLevel = i;
					break;
				}

				EigenBruttos[i] = Totals[i] - Places[i].reduce((sum, fp) => sum + fp, 0)
			}
			// ...and for the current, it's already calculated
			else {
				Places[i] = Parts.CurrentMaezens;

				EigenBruttos[i] = Parts.RemainingOwnPart;
			}

			PlaceCount = Math.max(PlaceCount, Places[i].length);

			let FPGreatBuilding = (IsRework ? undefined : GreatBuildings.GreatBuildingsData.find(obj => (obj.ID === EntityID && obj.FPProductions)));
			if (ReworkFPBonus) {
				// prestige rework: FP production of the reached level from the bonus curve of the metadata
				HasDoubleCollection = true;
				DoubleCollections[i] = GreatBuildings.MetaBonusValue(ReworkFPBonus, i + 1);
			}
			else if (FPGreatBuilding && !['X_FutureEra_Landmark1','X_AllAge_Expedition'].includes(EntityID)) { //FP produzierende LGs ohne Arche
				HasDoubleCollection = true;
				if (i < FPGreatBuilding.FPProductions.length) {
					DoubleCollections[i] = FPGreatBuilding.FPProductions[i];
				}
				else {
					DoubleCollections[i] = MainParser.round(FPGreatBuilding.FPProductions[9] * (i + 1) / 10);
				}
			}
			else {
				HasDoubleCollection = false;
				DoubleCollections[i] = 0;
			}

			EigenNettos[i] = EigenBruttos[i] - DoubleCollections[i];
			OwnPartSum += EigenNettos[i];
		}

		return {
			HasDoubleCollection,
			Places,
			PlaceCount,
			CityEntity,
			OwnPartSum,
			StartLevel,
			EndLevel,
			EigenBruttos,
			DoubleCollections,
			EigenNettos,
			IsEstimated: (!IsRework && !GreatBuildings.Rewards[Era]),
			HasUnlockCosts: IsRework,
			// shown by default, only an explicit 'false' hides the unlock costs
			Unlock: (localStorage.getItem('PowerLevelingUnlockCosts') !== 'false' ? Parts.CalcUnlockCosts(StartLevel, EndLevel) : null)
		};
	},


	/**
	 * Renders the table rows (one per level) from the precalculated Parts.PowerLevelingData.
	 *
	 * @param {string[]} h - Array the HTML strings are pushed into
	 */
	CalcTableBodyPowerLeveling: (h) => {
		const {
			HasDoubleCollection,
			Places,
			PlaceCount,
			StartLevel,
			EndLevel,
			EigenBruttos,
			DoubleCollections,
			EigenNettos,
			Unlock
		} = Parts.PowerLevelingData;



		for (let i = StartLevel; i < EndLevel; i++) {
			h.push('<tr>');
			h.push('<td class="bright" style="white-space:nowrap">' + i + ' → ' + (i + 1) + '</td>');
			for (let Place = 0; Place < PlaceCount; Place++) {
				// copper tier levels have fewer reward places than the gold tier ones
				if (Places[i][Place] === undefined) {
					h.push('<td' + (Place % 2 ? ' class="text-light"' : '') + '></td>');
					continue;
				}
				h.push('<td' + (Place % 2 ? ' class="text-light"' : '') + '><span class="hidden-text"> - #' + (Place + 1) + ' (</span>' + HTML.Format(Places[i][Place]) + '<span class="hidden-text">)</span></td>');
			}
			if (HasDoubleCollection) {
				h.push('<td class="success no-select"><strong>' + HTML.Format(EigenBruttos[i]) + '</strong></td>');
				h.push('<td class="no-select">' + HTML.Format(MainParser.round(DoubleCollections[i])) + '</td>');
			}
			h.push('<td><strong class="info no-select">' + HTML.Format(MainParser.round(EigenNettos[i])) + '</strong></td>');
			if (Unlock) h.push('<td class="no-select unlock-costs">' + Parts.GetUnlockCostCell(Unlock.Rows[i]) + '</td>');
			h.push('<td><span class="hidden-text">' + i + '</span><span class="btn btn-slim button-powerlevel-copy">' + i18n('Boxes.PowerLeveling.CopyValues') + '</span></td>');
			h.push('</tr>');
		}
	},


	/**
	 * Recalculates the data and refreshes only the table body and the summary
	 * fields of an already open power leveling box (used by the level inputs
	 * and when the game reports unlock costs or blueprints).
	 */
	UpdateTableBodyPowerLeveling: () => {
		const tableBody = document.getElementById('PowerLevelingBoxTableBody');
		if (tableBody) {
			Parts.PowerLevelingData = Parts.CalcBodyPowerLevelingData();

			// another level range can bring other columns (reward places 6 and 7 of gold levels): the head has to follow
			if (tableBody.parentElement.dataset.columns !== Parts.GetPowerLevelingColumns()) {
				Parts.CalcBodyPowerLeveling();
				return;
			}

			/** @type {string[]} */
			const h = [];

			Parts.CalcTableBodyPowerLeveling(h);

			$(tableBody).html(h.join(''));

			// Startlevel
			const startLevel = /** @type {HTMLInputElement} */(document.getElementById('startLevel'));
			if (startLevel.value != '' + Parts.PowerLevelingData.StartLevel) {
				startLevel.value = '' + Parts.PowerLevelingData.StartLevel;
			}
			Parts.PowerLevelingStartLevel = Parts.PowerLevelingData.StartLevel;

			// EndLevel
			const endLevel = /** @type {HTMLInputElement} */(document.getElementById('endLevel'));
			if (endLevel.value != '' + Parts.PowerLevelingData.EndLevel) {
				endLevel.value = '' + Parts.PowerLevelingData.EndLevel;
			}
			Parts.PowerLevelingEndLevel = Parts.PowerLevelingData.EndLevel;

			const ownPartSum = /** @type {HTMLElement} */(document.getElementById('PowerLevelingBoxOwnPartSum'));
			ownPartSum.innerText = HTML.Format(MainParser.round(Parts.PowerLevelingData.OwnPartSum));

			$('#PowerLevelingBoxUnlockSum').html(Parts.GetUnlockCostSummary());
			Parts.InitPowerLevelingTooltips();
		}
	},


	/**
	 * Describes the columns the current power leveling data needs, the table remembers the ones it was built with.
	 *
	 * @returns {string}
	 */
	GetPowerLevelingColumns: () => {
		const { PlaceCount, HasDoubleCollection, Unlock } = Parts.PowerLevelingData;

		return [PlaceCount, !!HasDoubleCollection, !!Unlock].join('|');
	},


	/**
	 * Activates the tooltips of the unlock cost cells.
	 */
	InitPowerLevelingTooltips: () => {
		$('#PowerLevelingBox [data-original-title]').tooltip({
			html: true,
			container: 'body'
		});
	},


	/**
	 * Builds the complete content of the power leveling box: header with the
	 * level range inputs, own part sum and the unlock cost summary, below it
	 * the table for the configured range.
	 */
	CalcBodyPowerLeveling: () => {
		Parts.PowerLevelingData = Parts.CalcBodyPowerLevelingData();

		const {
			HasDoubleCollection,
			PlaceCount,
			CityEntity,
			OwnPartSum,
			StartLevel,
			EndLevel,
			IsEstimated,
			HasUnlockCosts,
			Unlock,
		} = Parts.PowerLevelingData;

		let h = [];
		h.push('<div class="dark-bg" style="margin-bottom:3px;padding: 5px;">');
		h.push('<h1 class="text-center">' + CityEntity['name'] + '</h1>')

		h.push('<div class="d-flex justify-content-center">');
		h.push('<div style="margin: 5px 10px 0 0;">' + i18n('Boxes.PowerLeveling.StartLevel') + ': <input type="number" id="startLevel" step="1" min="0" max="1000" value="' + StartLevel + '"></div>');
		h.push('<div style="margin: 5px 10px 0 0;">' + i18n('Boxes.PowerLeveling.EndLevel') + ': <input type="number" id="endLevel" step="1" min="10" max="1000" value="' + EndLevel + '"></div>');
		h.push('<div>' + i18n('Boxes.PowerLeveling.OwnPartSum') +': <strong class="info" id="PowerLevelingBoxOwnPartSum">'+ HTML.Format(MainParser.round(OwnPartSum)) + '</strong></div>')
		h.push('</div>');
		if (HasUnlockCosts) {
			h.push(`<div class="text-center" style="margin-top:5px;"><input id="showUnlockCosts" class="show-unlock-costs game-cursor" ${Unlock ? 'checked' : ''} type="checkbox"> <label for="showUnlockCosts">${i18n('Boxes.PowerLeveling.UnlockCosts')}</label></div>`);
			h.push(`<div id="PowerLevelingBoxUnlockSum">${Parts.GetUnlockCostSummary()}</div>`);
		}
		if (IsEstimated) {
			h.push('<div class="text-center" style="margin-top:5px;"><em>' + i18n('Boxes.PowerLeveling.Estimated') + '</em></div>');
		}
		h.push('</div>');

		h.push(`<table class="foe-table" data-columns="${Parts.GetPowerLevelingColumns()}">`);

		h.push('<thead class="sticky">');
		h.push('<tr>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.Level') + '</th>');
		for (let Place = 1; Place <= PlaceCount; Place++) {
			h.push('<th>' + i18n('Boxes.PowerLeveling.P' + Place) + '</th>');
		}
		if (HasDoubleCollection) {
			h.push('<th class="no-select">' + i18n('Boxes.PowerLeveling.OwnPartBrutto') + '</th>');
			h.push('<th class="no-select">' + i18n('Boxes.PowerLeveling.DoubleCollection') + '</th>');
		}
		h.push('<th class="no-select">' + i18n('Boxes.PowerLeveling.OwnPartNetto') + '</th>');
		if (Unlock) h.push('<th class="no-select">' + i18n('Boxes.PowerLeveling.UnlockCosts') + '</th>');
		h.push('<th></th>');
		h.push('</tr>');
		h.push('</thead>');

		h.push('<tbody id="PowerLevelingBoxTableBody">');
		Parts.CalcTableBodyPowerLeveling(h);
		h.push('</tbody>');

		h.push('</table>');

		$('#PowerLevelingBoxBody').html(h.join(''));
		Parts.InitPowerLevelingTooltips();
	},
});
