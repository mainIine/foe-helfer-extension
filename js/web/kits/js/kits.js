/*
 * *************************************************************************************
 *
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

FoEproxy.addFoeHelperHandler('InventoryUpdated', () => {
	Kits.UpdateBoxIfVisible();
});

/**
 * @typedef SetEntry
 * @property {string} [groupname] group separator entry ('Chains', 'Sets', ...), no other properties
 * @property {string} [id] metadata id of the chain/set, used as favourite key and icon name
 * @property {string} [name] wiki page name, used for the external link and as favourite/title fallback
 * @property {string} [title] localized display name (taken from the game metadata)
 * @property {string} [icon] icon asset name for the chain/set icon
 * @property {string} [link] explicit wiki page override
 * @property {object[]} [buildings] one object per member building: `{first: <baseEntityId>}`,
 *                                  upgrade kit ids are added as additional keys at runtime
 * @property {string[]} [assets] attachable extension buildings (chain links)
 * @property {string[]} [kit] selection kit ids covering the member buildings (computed)
 * @property {string[]} [assetKits] selection kit ids covering the asset buildings (computed)
 */

/**
 * @typedef SetItem
 * @property {string} type 'first', 'update', 'kit' or 'asset'
 * @property {string|object} item inventory item, city entity metadata or raw id
 * @property {number} [fragments] fragments in stock
 * @property {number} [reqFragments] fragments required for assembly
 * @property {boolean} missing true when neither the item nor fragments of it are in stock
 * @property {boolean} showMissing false hides the item while it is missing (higher building levels)
 */

/**
 * A {@link HTML.Box box} listing owned (in inventory) and missing buildings of all
 * building chains and sets, together with the according upgrade and selection kits.
 *
 * The displayed list is generated from the game metadata the extension already receives
 * (building_chains / building_sets / building_upgrades / selection_kits), the same data
 * the game itself uses for its chain/set overview windows. Only groupings without any
 * game metadata (pure selection kit collections) are kept in {@link Kits.ManualSets}.
 * @namespace
 */
let Kits = {

	/**
	 * Manually maintained extra entries that cannot be derived from the game metadata:
	 * selection kit collections without a real building set/chain behind them.
	 * @type {SetEntry[]}
	 */
	ManualSets: [
		{
			group: 'Sets',
			name: 'Winterdeco_Set',
			link: 'Selection_Kit#Winter_Deco_Selection_Kit',
			buildings: [
				{first: 'D_MultiAge_ChristmasBonus2'},
				{first: 'D_MultiAge_ChristmasBonus16'},
				{first: 'D_MultiAge_ChristmasBonus1'},
				{first: 'D_MultiAge_ChristmasBonus15'},
				{first: 'A_MultiAge_ChristmasBonusSet1'},
				{first: 'D_MultiAge_ChristmasBonusSet1a'},
				{first: 'D_MultiAge_ChristmasBonusSet1b'}
			]
		}
	],

	/**
	 * The currently displayed list of set entries (generated + manual extras).
	 * @type {SetEntry[]|null}
	 */
	SetList: null,

	/**
	 * Determines which sets and assets to display. Valid values:
	 * - `0`: owned sets and assets only
	 * - `1`: owned sets with all their assets (owned and missing)
	 * - `2`: all known sets and assets
	 * @type {number}
	 */
	ShowMissing: 0,

	/** @type {string|null} CDN url of the fragment icon */
	fragmentURL: null,


	/** @type {string[]} favourite set names (persisted in localStorage) */
	favourites: JSON.parse(localStorage.getItem('Kits.favourites') || '[]'),

	/**
	 * Item ids whose icon asset name differs from the id itself.
	 * Extended at runtime while flattening the inventory.
	 * @type {Object<string,string>}
	 */
	specialCases: {
		'selection_kit_watchtower_1_gbg': 'selection_kit_watchtower1_gbg',
		'selection_kit_ind_palace_set': 'selection_kit_indian_palace',
		'selection_kit_ind_fountain_set': 'selection_kit_indian_fountain',
		'selection_kit_epic_FELL23': 'selection_kit_epic_FELLOW23',
		'selection_kit_FELL23A': 'selection_kit_FELLOW23A',
		'selection_kit_governors_villa': 'selection_kit_govenors_villa',
		'selection_kit_classic_garden_set': 'selection_kit_classical_garden',
		'selection_kit_winter_village_set': 'selection_kit_winter_village',
		'selection_kit_royal_garden_set': 'selection_kit_royal_garden',
		'selection_kit_gentiana_windmill_farmland': 'selection_kit_gentiana_farmland',
		'selection_kit_W_MultiAge_WIN22A': 'selection_kit_chocolatery',
		'selection_kit_winter_cars': 'selection_kit_winter_train_carriage',
		'selection_kit_hippodrome_tracks': 'selection_kit_hippodrome_track'
	},

	/**
	 * Merged upgrade chains keyed by their base (level 1) building id:
	 * `{upgradeList: <upgrade item ids>, buildingList: <higher level building ids>, upgradeCount: {type: count}}`
	 * @type {object|null}
	 */
	upgradeKits: null,


	/**
	 * Opens the {@link HTML.Box box}.
	 */
	init: () => {
		Kits.BuildBox();
	},


	/**
	 * Creates the {@link HTML.Box box} skeleton (or closes an already open box)
	 * and fills it with the set list.
	 */
	BuildBox: () => {
		if ($('#kits').length === 0) {
			HTML.AddCssFile('kits');

			HTML.Box({
				id: 'kits',
				title: i18n('Menu.Kits.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true
			});

			$('#kitsBody').append(
				$('<div />').attr('id', 'kitsBodyTopbar'),
				$('<div />').attr('id', 'kitsBodyInner'),
				$('<div />').attr('id', 'kitsBodyBottombar')
			);

			$('#kitsBodyTopbar').append(
				$('<label />').attr({class: 'game-cursor'}).text(i18n('Boxes.Kits.FilterSets') + ':\xA0').append(
					$('<input />').attr({
						class: 'game-cursor',
						type: 'text',
						'data-type': 'filter-sets-text',
						placeholder: 'e.g. sent||cherry||winter'
					}).on('change', Kits._filter)
				),
				$('<label />').attr({class: 'game-cursor'}).text(i18n('Boxes.General.FilterItems') + ':\xA0').append(
					$('<input />').attr({
						class: 'game-cursor',
						type: 'text',
						'data-type': 'filter-items-text',
						placeholder: 'e.g. car||field'
					}).on('change', Kits._filter)
				)
			);

			$('#kitsBodyBottombar').append(
				$('<span />').attr({
					id: 'kits-triplestate-button',
					class: 'btn btn-slim',
					onclick: 'Kits.ToggleView()'
				}).text(i18n('Boxes.Kits.TripleStateButton' + Kits.ShowMissing)),
				$('<span />').attr({
					id: 'kits-showFavourites',
					class: 'btn btn-slim',
					onclick: 'Kits.ToggleFavouritesBtn()'
				}).text(i18n('Boxes.Kits.ShowFavourites'))
			);
		}
		else {
			HTML.CloseOpenBox('kits');
		}

		Kits.ReadSets();
		Kits._filterMissing();
	},


	/**
	 * Refreshes the box content if it is currently open.
	 */
	UpdateBoxIfVisible: () => {
		if ($('#kits').length !== 0) {
			Kits.ReadSets();
			Kits._filter();
		}
	},


	/**
	 * Derives the upgrade type from an upgrade item id
	 * (e.g. `gold_upgrade_kit_x` => 'golden', `winter_upgrade_x` => 'winter').
	 * @param {string} upgradeItemId
	 * @returns {string}
	 */
	_upgradeTypeFromId: (upgradeItemId) => {
		const parts = upgradeItemId.split('_');

		return parts.includes('gold') ? 'golden' :
			parts.includes('silver') ? 'silver' :
			parts.includes('ascended') ? 'ascended' : parts[0];
	},


	/**
	 * Collects all building ids that are a higher level of an upgrade chain,
	 * i.e. everything except the base (level 1) buildings.
	 * @returns {Set<string>}
	 */
	_collectNonBaseLevels: () => {
		const nonBase = new Set();

		for (const upgrade of Object.values(MainParser.BuildingUpgrades || {})) {
			for (let i = 1; i < upgrade.upgradeSteps.length; i++) {
				for (const buildingId of upgrade.upgradeSteps[i].buildingIds) {
					nonBase.add(buildingId);
				}
			}
		}

		return nonBase;
	},


	/**
	 * Checks whether a city entity is the start building of a chain
	 * (as opposed to an attachable chain link).
	 * @param {object} entity city entity metadata
	 * @returns {boolean}
	 */
	_isChainStart: (entity) => {
		if (entity.__class__ === 'GenericCityEntity') {
			return entity.components?.AllAge?.chain?.config?.__class__ === 'ChainStartConfig';
		}

		return (entity.abilities || []).some(ability => ability.__class__ === 'ChainStartAbility');
	},


	/**
	 * Turns a metadata id into a wiki page name (`winter_village_set` => `Winter_Village_Set`).
	 * @param {string} id
	 * @returns {string}
	 */
	_wikiName: (id) => {
		return id.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('_');
	},


	/**
	 * Generates the displayed set list from the game metadata: every known building chain
	 * and building set with its member buildings, plus the manual extras from sets.json.
	 * @returns {SetEntry[]}
	 */
	GenerateSetList: () => {
		const entities = MainParser.CityEntities || {};
		const nonBase = Kits._collectNonBaseLevels();
		const groups = {Chains: [], Sets: []};

		// building chains: one start building (or several, e.g. hippodrome) + attachable links
		for (const chain of Object.values(MainParser.BuildingChains || {})) {
			const buildings = [];
			const assets = [];

			for (const id of chain.cityEntityIds || []) {
				if (!entities[id] || nonBase.has(id)) continue;
				if (Kits._isChainStart(entities[id])) {
					buildings.push({first: id});
				} else {
					assets.push(id);
				}
			}

			if (buildings.length === 0 && assets.length > 0) buildings.push({first: assets.shift()});
			if (buildings.length === 0) continue;

			groups.Chains.push({
				id: chain.id,
				name: Kits._wikiName(chain.id),
				title: chain.name,
				icon: chain.id,
				buildings: buildings,
				assets: assets.length ? assets : undefined
			});
		}

		// building sets: all members are standalone buildings
		for (const set of Object.values(MainParser.BuildingSets || {})) {
			const buildings = (set.cityEntityIds || [])
				.filter(id => entities[id] && !nonBase.has(id))
				.map(id => ({first: id}));

			if (buildings.length === 0) continue;

			groups.Sets.push({
				id: set.id,
				name: Kits._wikiName(set.id),
				title: set.name,
				icon: set.id.replace(/_set/g, ''),
				buildings: buildings
			});
		}

		// manual extras (skipped if the metadata meanwhile covers them)
		const knownBuildings = new Set(
			[...groups.Chains, ...groups.Sets].flatMap(entry => entry.buildings.map(b => b.first))
		);
		for (const extra of Kits.ManualSets || []) {
			if ((extra.buildings || []).some(b => knownBuildings.has(b.first))) continue;
			(groups[extra.group] || groups.Sets).push(structuredClone(extra));
		}

		for (const list of Object.values(groups)) {
			list.sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name));
		}

		const setList = [];
		for (const [groupname, list] of Object.entries(groups)) {
			if (list.length === 0) continue;
			setList.push({groupname: groupname}, ...list);
		}

		return setList;
	},


	/**
	 * Maps every obtainable item (building, upgrade kit, nested selection kit) to the
	 * selection kits and inventory reward sets it can be obtained from.
	 * @returns {Object<string,string[]>} item id => provider ids
	 */
	_collectSelectionKitProviders: () => {
		const providers = {};

		const add = (id, providerId) => {
			if (!providers[id]) providers[id] = [];
			providers[id].push(providerId);
		};

		const optionsOf = (selectionKit) =>
			selectionKit?.options || selectionKit?.eraOptions?.BronzeAge?.options || [];

		for (const [kitId, kit] of Object.entries(MainParser.SelectionKits || {})) {
			for (const option of optionsOf(kit)) {
				if (!['BuildingItemPayload', 'UpgradeKitPayload'].includes(option.item.__class__)) continue;
				add(option.item.upgradeItemId || option.item.selectionKitId || option.item.cityEntityId, kitId);
			}
		}

		// reward sets in the inventory (e.g. league rewards) act as providers as well
		const addRewards = (rewards, providerId) => {
			for (const reward of rewards) {
				if (reward.type === 'set') {
					addRewards(reward.rewards, providerId);
				} else if (reward.subType === 'selection_kit') {
					for (const option of optionsOf(MainParser.SelectionKits[reward.id])) {
						if (!['BuildingItemPayload', 'UpgradeKitPayload'].includes(option.item.__class__)) continue;
						add(option.item.upgradeItemId || option.item.selectionKitId || option.item.cityEntityId, providerId);
					}
				} else {
					add(reward.type === 'building' ? reward.subType : reward.id, providerId);
				}
			}
		};

		for (const item of Object.values(MainParser.Inventory || {})) {
			if (item?.item?.reward?.type === 'set') {
				addRewards(item.item.reward.rewards, item.item.reward.id);
			}
		}

		return providers;
	},


	/**
	 * Builds {@link Kits.upgradeKits} by merging consecutive upgrade chains
	 * (e.g. regular => silver => golden => ascended) into one entry per base building.
	 * Selection kits covering a higher chain part are propagated down to the base building.
	 * @param {Object<string,string[]>} selectionKits item id => provider ids (extended in place)
	 */
	_collectUpgradeKits: (selectionKits) => {
		Kits.upgradeKits = {};

		for (const upgrade of Object.values(MainParser.BuildingUpgrades || {})) {
			let upgradeList = [upgrade.upgradeItem.id];
			let buildingList = [];
			let upgradeCount = {[Kits._upgradeTypeFromId(upgrade.upgradeItem.id)]: upgrade.upgradeSteps.length - 1};
			const coveringKits = [];

			for (let i = 1; i < upgrade.upgradeSteps.length; i++) {
				for (const buildingId of upgrade.upgradeSteps[i].buildingIds) {
					buildingList.push(buildingId);

					// a follow-up chain starts at this level => absorb it
					if (Kits.upgradeKits[buildingId]) {
						buildingList = [...buildingList, ...Kits.upgradeKits[buildingId].buildingList];
						upgradeList = [...upgradeList, ...Kits.upgradeKits[buildingId].upgradeList];
						upgradeCount = {...upgradeCount, ...Kits.upgradeKits[buildingId].upgradeCount};
						delete Kits.upgradeKits[buildingId];
					}

					if (selectionKits[buildingId]) coveringKits.push(...selectionKits[buildingId]);
				}
			}

			for (const baseId of upgrade.upgradeSteps[0].buildingIds) {
				if (coveringKits.length > 0) {
					selectionKits[baseId] = Array.from(new Set([...coveringKits, ...(selectionKits[baseId] || [])]));
				}

				// this chain continues an already collected one => append to its entry
				const parentBase = Object.keys(Kits.upgradeKits)
					.find(id => Kits.upgradeKits[id].buildingList.includes(baseId));

				if (parentBase) {
					const parent = Kits.upgradeKits[parentBase];
					parent.buildingList = [...parent.buildingList, ...buildingList];
					parent.upgradeList = [...parent.upgradeList, ...upgradeList];
					parent.upgradeCount = {...parent.upgradeCount, ...upgradeCount};
				} else {
					Kits.upgradeKits[baseId] = {
						upgradeList: upgradeList,
						buildingList: buildingList,
						upgradeCount: upgradeCount
					};
				}
			}
		}
	},


	/**
	 * Computes the selection kits covering a set entry (entry.kit) and its
	 * assets (entry.assetKits). Upgrade kit ids of the member buildings are
	 * added to the building objects so they get rendered as items.
	 * @param {SetEntry} entry
	 * @param {Object<string,string[]>} selectionKits item id => provider ids
	 */
	_resolveEntryKits: (entry, selectionKits) => {
		if (entry.kit) {
			if (!Array.isArray(entry.kit)) entry.kit = [entry.kit];
			return;
		}

		let kits = [];
		for (const building of entry.buildings || []) {
			if (building.first && Kits.upgradeKits?.[building.first]?.upgradeList) {
				Kits.upgradeKits[building.first].upgradeList.forEach(id => building[id] = id);
			}
			for (const id of Object.values(building)) {
				kits.push(...(selectionKits[id] || []));
			}
		}
		entry.kit = Array.from(new Set(kits));

		if (entry.assets) {
			kits = [];
			for (const id of entry.assets) {
				kits.push(...(selectionKits[id] || []));
			}
			entry.assetKits = Array.from(new Set(kits));
		}
	},


	/**
	 * Creates one {@link SetItem} for the given id.
	 * @param {object} inv flattened inventory from {@link Kits.GetInventoryArray}
	 * @param {string} type 'first', 'update', 'kit' or 'asset'
	 * @param {string} id building / upgrade kit / selection kit id
	 * @param {boolean} [showMissing] false hides the item while it is missing
	 * @returns {SetItem}
	 */
	_createItem: (inv, type, id, showMissing = true) => {
		const fallback = (type === 'first' || type === 'asset') ? MainParser.CityEntities[id] : id;

		return {
			type: type,
			item: inv[id] || fallback,
			fragments: inv['fragment#' + id]?.inStock,
			reqFragments: inv['fragment#' + id]?.required,
			missing: ((inv[id]?.inStock || 0) < 1) && ((inv['fragment#' + id]?.inStock || 0) < 1),
			showMissing: showMissing
		};
	},


	/**
	 * Resolves the displayed heading of a set entry. Generated entries carry their
	 * localized title already, manual entries fall back to metadata / entity names.
	 * @param {SetEntry} entry
	 * @returns {{text: string, icon: string}} heading text and chain/set icon html
	 */
	_resolveHeading: (entry) => {
		if (entry.title) {
			const icon = entry.icon
				? '<img src="' + srcLinks.get('/shared/icons/' + entry.icon + '.png', true) + '" class="chain-set-ico">'
				: '';
			return {text: entry.title, icon: icon};
		}

		const name = entry.name;
		const metaName = name.toLowerCase().replace(/_set/g, '');
		let text, icon = '';

		if (name === 'Winterdeco_Set' && MainParser.SelectionKits?.selection_kit_winter_deco) {
			text = MainParser.SelectionKits.selection_kit_winter_deco.name;
		}
		else if (MainParser.BuildingChains?.[metaName]) {
			text = MainParser.BuildingChains[metaName].name;
			icon = '<img alt="' + text + '" src="' + srcLinks.get('/shared/icons/' + metaName + '.png', true) + '" class="chain-set-ico">';
		}
		else if (MainParser.BuildingSets?.[metaName]) {
			text = MainParser.BuildingSets[metaName].name;
			icon = '<img alt="' + text + '" src="' + srcLinks.get('/shared/icons/' + metaName + '.png', true) + '" class="chain-set-ico">';
		}
		else if (MainParser.CityEntities[entry.buildings?.[0]?.first]) {
			// strip the level suffix from the entity name ("Airship - Lv. 1" => "Airship")
			const itemName = MainParser.CityEntities[entry.buildings[0].first].name;
			let idx = itemName.indexOf(' - ');
			if (idx === -1) idx = itemName.indexOf(' – '); // looks the same but it isn't ¯\_(ツ)_/¯
			text = idx === -1 ? itemName : itemName.substring(0, idx);
		}
		else {
			text = name.replace(/_/g, ' ');
		}

		return {text: text, icon: icon};
	},


	/**
	 * Builds the upgrade count badge and the efficiency rating for a set entry heading.
	 * @param {SetEntry} entry
	 * @param {boolean} includeEff false skips the (expensive) efficiency rating,
	 *                             used when the heading does not display it anyway
	 * @returns {{upgrades: string, eff: string}} html snippets (empty when not applicable)
	 */
	_headingExtras: (entry, includeEff) => {
		const result = {upgrades: '', eff: ''};
		const firstId = entry.buildings?.[0]?.first;

		if (!firstId || !MainParser.CityEntities[firstId]) return result;

		const scheme = Kits.upgradeKits?.[firstId];

		if (scheme?.upgradeCount) {
			result.upgrades = '<span class="upgrades" data-original-title="' + i18n('Boxes.Kits.Upgrades') + '" data-toggle="tooltip">';
			let first = true;
			for (const type in scheme.upgradeCount) {
				if (!scheme.upgradeCount[type]) continue;
				result.upgrades += (first ? '<span class="base">1</span>' : '') + `<span class="${type}">${scheme.upgradeCount[type]}</span>`;
				first = false;
			}
			result.upgrades += '</span>';
		}

		if (includeEff && scheme?.buildingList) {
			const rating = Productions.rateBuildings([firstId, ...scheme.buildingList].slice(-3), true);
			if (rating) {
				let title = '';
				for (const r of rating) {
					const line = `${r.building?.name || r.name}: ${Math.round(100 * r.rating.totalScore)}`;
					title = title === '' ? line : line + '<br>' + title;
				}
				const top = rating.pop();
				result.eff = `<span class="kitsEff" data-original-title="${title}">${i18n('Boxes.Kits.Efficiency')}: `
					+ Math.round(100 * top?.rating.totalScore || 0)
					+ '</span>';
			}
		}

		return result;
	},


	/**
	 * Renders one set entry (heading, buildings with upgrades, kits and assets).
	 * @param {SetEntry} entry
	 * @param {object} inv flattened inventory from {@link Kits.GetInventoryArray}
	 * @returns {string} html
	 */
	_renderSet: (entry, inv) => {
		/** @type {SetItem[][]} one row per member building: base, higher levels, upgrade kits */
		const buildings = [];
		/** @type {SetItem[]} */
		const assetRow = [];
		/** @type {SetItem[]} */
		const kitRow = [];

		for (const building of entry.buildings || []) {
			/** @type {SetItem[]} */
			const itemRow = [];

			if (building.first) {
				itemRow.push(Kits._createItem(inv, 'first', building.first));
				for (const levelId of Kits.upgradeKits[building.first]?.buildingList || []) {
					itemRow.push(Kits._createItem(inv, 'first', levelId, false));
				}
			}

			for (const key in building) {
				if (!building.hasOwnProperty(key) || key === 'first') continue;
				itemRow.push(Kits._createItem(inv, 'update', building[key]));
			}

			buildings.push(itemRow);
		}

		for (const assetId of entry.assets || []) {
			assetRow.push(Kits._createItem(inv, 'asset', assetId));
			for (const levelId of Kits.upgradeKits[assetId]?.buildingList || []) {
				assetRow.push(Kits._createItem(inv, 'update', levelId, false));
			}
		}
		for (const kitId of entry.assetKits || []) {
			assetRow.push(Kits._createItem(inv, 'kit', kitId));
		}

		for (const kitId of entry.kit || []) {
			kitRow.push(Kits._createItem(inv, 'kit', kitId));
		}

		const showA = assetRow.some(item => !item.missing);
		const show = buildings.some(row => row.some(item => !item.missing))
			|| showA
			|| kitRow.some(item => !item.missing);

		// heading with favourite star, chain/set icon, upgrade badge and efficiency
		// (the efficiency is only displayed - and therefore only computed - without an icon)
		const heading = Kits._resolveHeading(entry);
		const extras = Kits._headingExtras(entry, heading.icon === '');
		const favKey = entry.id || entry.name;
		const starIcon = Kits.favourites.includes(favKey)
			? srcLinks.get('/shared/gui/guild_meta_layer/guild_meta_layer_recommend_star_fill.png', true)
			: srcLinks.get('/shared/gui/guild_meta_layer/guild_meta_layer_recommend_star_empty.png', true);
		const favourite = `<span class="FavStar" data-name="${favKey}" onclick="Kits.toggleFavourite(event)" style="background-image:url('${starIcon}')"></span>`;
		const favClass = Kits.favourites.includes(favKey) ? '' : ' notFavourite';
		const headText = MainParser.GetBuildingLink(entry.link || entry.name, heading.text);

		let t = '<div class="item-row' + (!show ? ' all-missing' : '') + favClass + '">';
		t += '<h2 class="head sticky">' + favourite + heading.icon + ' ' + headText
			+ (heading.icon !== '' ? '' : extras.eff) + extras.upgrades + '</h2>';

		for (const itemRow of buildings) {
			t += itemRow.map(item => Kits.ItemDiv(item)).join('');
		}

		t += kitRow.map(item => Kits.ItemDiv(item)).join('');

		if (assetRow.length) {
			const missingClass = !show ? 'all-missing' : (!showA ? 'row-missing' : '');
			t += `<h3 class="assets-header ${missingClass}">${i18n('Boxes.Kits.Extensions')}</h3>`;
			t += `<div class="item-row ${missingClass}">` + assetRow.map(item => Kits.ItemDiv(item)).join('') + '</div>';
		}

		t += '</div>';
		return t;
	},


	/**
	 * Regenerates the set list from the game metadata and renders it into the box.
	 */
	ReadSets: () => {
		const inv = Kits.GetInventoryArray();

		if (!Kits.fragmentURL) Kits.fragmentURL = srcLinks.get('/shared/icons/icon_tooltip_fragment.png', true);

		const selectionKits = Kits._collectSelectionKitProviders();
		Kits._collectUpgradeKits(selectionKits);

		Kits.SetList = Kits.GenerateSetList();
		for (const entry of Kits.SetList) {
			if (!entry.groupname) Kits._resolveEntryKits(entry, selectionKits);
		}

		let t = '<div class="foe-table">';
		let groupOpen = false;

		for (const entry of Kits.SetList) {
			if (entry.groupname) {
				const i18nKey = 'Boxes.Kits.' + entry.groupname;
				let groupTitle = i18n(i18nKey);
				if (groupTitle === i18nKey) groupTitle = entry.groupname.replace(/_/g, ' ');

				if (groupOpen) t += '</div>';
				t += `<div class="group"><h1 class="grouphead" onclick="Kits.toggleGroup(event)">${groupTitle}</h1>`;
				groupOpen = true;
				continue;
			}

			t += Kits._renderSet(entry, inv);
		}

		if (groupOpen) t += '</div>';
		t += '</div>';

		$('#kitsBodyInner').html(t);
		$('#kitsBodyInner [data-original-title]').tooltip({
			html: true,
			container: '#kits'
		});
	},


	/**
	 * Creates the `div` for one item.
	 * @param {SetItem} el
	 * @returns {string} html string of the `div` element
	 */
	ItemDiv: (el) => {
		if (!el?.item) return '';
		if (el.missing && !el.showMissing) return '';

		const item = el.item;
		const assetName = item.itemAssetName
			|| item.asset_id
			|| MainParser.BuildingUpgrades[item]?.upgradeItem?.iconAssetName
			|| Kits.specialCases[item]
			|| item;

		let url = '/shared/icons/reward_icons/reward_icon_' + assetName + '.png';
		if ((el.type === 'first' || el.type === 'asset') && typeof assetName === 'string') {
			url = '/city/buildings/' + [assetName.slice(0, 1), '_SS', assetName.slice(1)].join('') + '.png';
		}
		url = srcLinks.get(url, true);

		let title = item.name;
		if (!title) {
			if (el.type === 'update') {
				title = MainParser.BuildingUpgrades[item]?.upgradeItem.name || i18n('Boxes.Kits.UpgradeKit');
			}
			else if (el.type === 'kit') {
				title = MainParser.SelectionKits[item]?.name || i18n('Boxes.Kits.SelectionKit');
			}
		}

		return `<div class="item${el.missing ? ' is-missing' : ''}">
					<div class="image"><img loading="lazy" src="${url}" alt="${title}" /></div>
					<strong class="in-stock" data-original-title="${i18n('Boxes.Kits.InStock')}">${item.inStock ? item.inStock : '-'}</strong>
					<span>${title}</span>
					<span class="fragments">${el.fragments ? `<img class="ItemFragment" src="${Kits.fragmentURL}"> ` + el.fragments + '/' + el.reqFragments : ''}</span>
				</div>`;
	},


	/**
	 * Flattens {@link MainParser.Inventory} into one object keyed by item id.
	 * Fragments are stored under `fragment#<assembledItemId>`.
	 * @returns {Object<string,{id:string,name:string,inStock:number,required:?number,itemAssetName:string}>}
	 */
	GetInventoryArray: () => {
		const result = {};

		for (const entry of Object.values(MainParser.Inventory || {})) {
			let amount = entry.inStock;
			let required = null;
			let id = entry.item.upgradeItemId || entry.item.selectionKitId || entry.item.cityEntityId || entry.itemAssetName;
			let asset = entry.itemAssetName;
			let name = entry.name;

			if (entry.item.__class__ === 'BuildingItemPayload') {
				asset = MainParser.CityEntities[id].asset_id;
			}

			if (entry.item.__class__ === 'FragmentItemPayload') {
				const assembled = entry.item.reward.assembledReward;
				id = 'fragment#' + (assembled.type === 'building' ? assembled.subType : (assembled.id || assembled.iconAssetName));
				amount = entry.inStock * entry.item.reward.amount;
				required = entry.item.reward.requiredAmount;
				asset = assembled.iconAssetName;
				name = assembled.name;
			}

			if (entry.item?.reward?.type === 'set') {
				id = entry.item.reward.id;
				asset = entry.item.reward.iconAssetName;
			}

			if (!result[id]) {
				result[id] = {id: id, name: name, inStock: amount, required: required, itemAssetName: asset};
			} else {
				result[id].inStock += amount;
			}
		}

		return result;
	},


	/**
	 * Toggles the favourite state of a set (star icon in the heading).
	 * @param {Event} e click event of the star
	 */
	toggleFavourite: (e) => {
		const name = e.target.dataset.name;
		const index = Kits.favourites.indexOf(name);

		if (index === -1) {
			Kits.favourites.push(name);
		} else {
			Kits.favourites.splice(index, 1);
		}

		const starIcon = Kits.favourites.includes(name)
			? srcLinks.get('/shared/gui/guild_meta_layer/guild_meta_layer_recommend_star_fill.png', true)
			: srcLinks.get('/shared/gui/guild_meta_layer/guild_meta_layer_recommend_star_empty.png', true);
		e.target.style = `background-image:url('${starIcon}')`;

		localStorage.setItem('Kits.favourites', JSON.stringify(Kits.favourites));
		e.target.parentElement.parentElement.classList.toggle('notFavourite');
	},


	/**
	 * Cycles through displaying owned, owned+missing parts and all sets.
	 */
	ToggleView: () => {
		Kits.ShowMissing = (Kits.ShowMissing + 1) % 3;
		Kits._filter();
		$('#kits-triplestate-button').text(i18n('Boxes.Kits.TripleStateButton' + Kits.ShowMissing));
	},


	/**
	 * Toggles the favourites-only view.
	 */
	ToggleFavouritesBtn: () => {
		$('#kits-showFavourites')[0].classList.toggle('btn-active');
		Kits._filter();
	},


	/**
	 * Collapses/expands all sets of a group (click on the group heading).
	 * @param {Event} event click event of the group heading
	 */
	toggleGroup: (event) => {
		const groupElement = event.currentTarget.parentElement;

		for (const row of groupElement.querySelectorAll('.item-row')) {
			row.style.display = row.style.display === 'none' ? '' : 'none';
		}
	},


	/**
	 * Re-applies all active filters (text filters, missing filter, favourites).
	 */
	_filter: () => {
		$('#kitsBodyInner .item-row').show();
		$('#kitsBodyInner .item').show();
		Kits._filterSets();
		Kits._filterItems();
		Kits._filterMissing();
		if ($('#kits-showFavourites')[0].classList.contains('btn-active')) $('.notFavourite').hide();
	},


	/**
	 * Hides missing items/sets according to {@link Kits.ShowMissing}.
	 */
	_filterMissing: () => {
		if (Kits.ShowMissing === 0) {
			$('.is-missing').hide();
			$('.row-missing').hide();
			$('.all-missing').hide();
		}
		if (Kits.ShowMissing === 1) {
			$('.all-missing').hide();
		}
	},


	/**
	 * Filters whole sets by name patterns (`||` separated regular expressions).
	 */
	_filterSets: () => {
		const filterRegExps = $('#kitsBodyTopbar input[data-type="filter-sets-text"]').val()
			.split('||').filter(it => it.trim().length > 0).map(it => new RegExp(it, 'i'));

		if (filterRegExps.length < 1) return;

		$('#kitsBodyInner .head').each((i, e) => {
			const setHead = $(e);
			if (!filterRegExps.some(it => it.test(setHead.text()))) {
				setHead.parent('.item-row').hide();
			}
		});
	},


	/**
	 * Filters single items by name patterns (`||` separated regular expressions).
	 */
	_filterItems: () => {
		const filterRegExps = $('#kitsBodyTopbar input[data-type="filter-items-text"]').val()
			.split('||').filter(it => it.trim().length > 0).map(it => new RegExp(it, 'i'));

		if (filterRegExps.length < 1) return;

		$('#kitsBodyInner .item-row').each((i, e) => {
			const row = $(e);
			let visibleItemsCount = 0;

			row.find('.item').each((j, itemElement) => {
				const item = $(itemElement);
				if (filterRegExps.some(it => it.test(item.text()) || it.test(item.html()))) {
					visibleItemsCount++;
				} else {
					item.hide();
				}
			});

			if (visibleItemsCount < 1) {
				row.hide();
			}
		});
	},


	/**
	 * Upgrade schemes keyed by the fully upgraded (end) building id:
	 * `{upgrades: {upgradeItemId: count}, upgradeSteps: [{buildingId, upgradeId}]}`
	 * @type {object|null}
	 */
	UpgradeSchemes: null,

	/** @type {Object<string,string[]>|null} item id => selection kit ids providing it */
	selectionOptions: null,

	/** @type {Object<string,string>} display names of upgrade items and selection kits */
	Names: {},

	/**
	 * Builds {@link Kits.UpgradeSchemes}, {@link Kits.selectionOptions} and
	 * {@link Kits.allBuildingsUpgradeCounts} from the game metadata.
	 * Called by the metadata handlers as soon as both building_upgrades and
	 * selection_kits are available.
	 */
	CreateUpgradeSchemes: () => {
		const selectionOptions = {};

		for (const kit of Object.values(MainParser.SelectionKits)) {
			Kits.Names[kit.selectionKitId] = kit.name;

			for (const option of kit.options || kit.eraOptions[CurrentEra].options) {
				const id = option.item.cityEntityId || option.item.upgradeItemId;
				if (!id) continue;

				if (!selectionOptions[id]) {
					selectionOptions[id] = [kit.selectionKitId];
				} else {
					selectionOptions[id].push(kit.selectionKitId);
				}
			}
		}

		// merge consecutive upgrade chains: endBuildings maps the (current) end building
		// to all steps leading there, startBuildings maps a chain start to its end building
		const endBuildings = {};
		const startBuildings = {};

		for (const upgrade of Object.values(MainParser.BuildingUpgrades)) {
			if (['silver_upgrade_kit_BOWL22A'].includes(upgrade.upgradeItem.id)) continue; // faulty game data

			Kits.Names[upgrade.upgradeItem.id] = upgrade.upgradeItem.name;

			const upgradeId = upgrade.upgradeItem.id;
			let buildingList = upgrade.upgradeSteps.map(step => step.buildingIds);
			const finalBuildings = buildingList.pop();
			buildingList = buildingList.flat().map(buildingId => ({buildingId: buildingId, upgradeId: upgradeId}));

			// an already collected chain ends where this one starts => prepend it
			if (endBuildings[buildingList[0].buildingId]) {
				const buffer = buildingList[0].buildingId;
				buildingList.unshift(...endBuildings[buffer]);
				delete endBuildings[buffer];
				delete startBuildings[buildingList[0].buildingId];
			}

			for (const endBuilding of finalBuildings) {
				if (startBuildings[endBuilding]) {
					// an already collected chain starts where this one ends => prepend to it
					endBuildings[startBuildings[endBuilding]].unshift(...buildingList);
					startBuildings[buildingList[0].buildingId] = startBuildings[endBuilding];
					delete startBuildings[endBuilding];
				}
				else {
					startBuildings[buildingList[0].buildingId] = endBuilding;
					endBuildings[endBuilding] = buildingList;
				}
			}
		}

		const schemes = {};
		const allBuildingsUpgradeCounts = {};

		for (const [endBuilding, buildingList] of Object.entries(endBuildings)) {
			const upgrades = {};
			const upgradeCount = {};

			for (const step of buildingList) {
				if (!upgrades[step.upgradeId]) {
					upgrades[step.upgradeId] = 1;
				} else {
					upgrades[step.upgradeId]++;
				}

				allBuildingsUpgradeCounts[step.buildingId] = structuredClone(upgradeCount);

				const upgradeType = Kits._upgradeTypeFromId(step.upgradeId);
				if (!upgradeCount[upgradeType]) upgradeCount[upgradeType] = 0;
				upgradeCount[upgradeType]++;
			}

			allBuildingsUpgradeCounts[endBuilding] = structuredClone(upgradeCount);
			schemes[endBuilding] = {
				upgrades: upgrades,
				upgradeSteps: buildingList
			};
		}

		Kits.allBuildingsUpgradeCounts = allBuildingsUpgradeCounts;
		Kits.UpgradeSchemes = schemes;
		Kits.selectionOptions = selectionOptions;
	},


	/**
	 * Determines all buildings obtainable from the inventory: directly stocked buildings,
	 * buildings assemblable from fragments and selection kits, and buildings reachable by
	 * applying stocked upgrade kits to buildings in the city or inventory.
	 * @returns {object} building id => {amount, chains, kitsUsed, upgradeCount, ...}
	 */
	BuildingsFromInventory: () => {
		const output = {};
		const upgradeBuildings = Object.keys(Kits.UpgradeSchemes);
		upgradeBuildings.push(...Object.values(Kits.UpgradeSchemes).map(scheme => scheme.upgradeSteps.map(step => step.buildingId)).flat());

		// flatten the inventory; standalone buildings (not part of an upgrade scheme)
		// go straight to the output
		const Inventory = {};
		const InventoryAdd = (id, amount) => {
			if (amount === 0) return;
			Inventory[id] = (Inventory[id] || 0) + amount;

			if (id.substring(1, 2) == '_' && !upgradeBuildings.includes(id)) {
				if (output[id]) {
					output[id].chains[0].count += amount;
					output[id].amount += amount;
				} else {
					output[id] = {building: 'inInventory', amount: amount, chains: [{chain: [{type: 'building', id: id, from: 'inventory', count: 1}], count: amount}]};
				}
			}
		};
		const InventoryAddSet = (rewards, amount) => {
			for (const reward of rewards) {
				if (reward.type === 'building') {
					InventoryAdd(reward.subType, amount * reward.amount);
				} else if (reward.subType === 'upgrade_kit' || reward.subType === 'selection_kit') {
					InventoryAdd(reward.id, amount * reward.amount);
				} else if (reward.type === 'set') {
					InventoryAddSet(reward.rewards, amount * reward.amount);
				}
			}
		};

		for (const item of Object.values(MainParser.Inventory)) {
			if (item.itemAssetName === 'icon_fragment') {
				// one inventory unit can hold several fragments (reward.amount), same math as in GetInventoryArray
				const assembledCount = Math.floor(item.inStock * (item.item.reward.amount || 1) / item.item.reward.requiredAmount);
				const assembled = item.item.reward.assembledReward;

				if (assembled.subType === 'selection_kit' || assembled.subType == 'upgrade_kit') {
					InventoryAdd(assembled.id, assembledCount);
					if (assembled.iconAssetName != assembled.id) {
						Kits.specialCases[assembled.id] = assembled.iconAssetName;
					}
				}
				if (assembled.type == 'building') {
					InventoryAdd(assembled.subType, assembledCount);
				}
			} else if (item.item.selectionKitId) {
				InventoryAdd(item.item.selectionKitId, item.inStock);
				if (item.itemAssetName != item.item.selectionKitId) {
					Kits.specialCases[item.item.selectionKitId] = item.itemAssetName;
				}
			} else if (item.item.cityEntityId) {
				InventoryAdd(item.item.cityEntityId, item.inStock);
			} else if (item.item.upgradeItemId) {
				InventoryAdd(item.item.upgradeItemId, item.inStock);
				if (item.itemAssetName != item.item.upgradeItemId) {
					Kits.specialCases[item.item.upgradeItemId] = item.itemAssetName;
				}
			} else if (item.item?.reward?.type === 'set') { //check if this works when there is a league reward with nested sets
				InventoryAddSet(item.item.reward.rewards, item.inStock);
			}
		}

		// flatten the placed city buildings
		const cityBuildings = {};
		Object.values(MainParser.CityMapData).forEach(entity => {
			cityBuildings[entity.cityentity_id] = (cityBuildings[entity.cityentity_id] || 0) + 1;
		});

		// buildings only obtainable via selection kit (not part of an upgrade scheme)
		for (const [id, kits] of Object.entries(Kits.selectionOptions)) {
			if (id.substring(1, 2) != '_' || upgradeBuildings.includes(id)) continue;

			for (const kit of kits) {
				if (!Inventory[kit]) continue;
				const chain = {chain: [{type: 'selectionKit', id: kit, from: 'inventory', count: 1}], count: Inventory[kit]};

				if (output[id]) {
					output[id].kitsUsed = (output[id].kitsUsed || 0) + Inventory[kit];
					output[id].amount = (output[id].amount || 0) + Inventory[kit];
					output[id].chains.push(chain);
				} else {
					output[id] = {kitsUsed: Inventory[kit], amount: Inventory[kit], chains: [chain]};
				}
			}
		}

		// walk each upgrade scheme and assemble as many end buildings as the stock allows
		for (let [buildingId, scheme] of Object.entries(Kits.UpgradeSchemes)) {
			let ignoreAscended = false;

			do { // repeat for the non-ascended version if an ascended version is found
				const upgradeSteps = scheme.upgradeSteps;
				const upgrades = scheme.upgrades;
				const maxBuilding = buildingId;
				let maxLevel = 0;
				let amount = 0;
				let buildingsFromCity = 0;
				let buildingsFromInventory = 0;
				let kitCount = 0;
				let ascended = false;
				const chains = [];
				let level;

				if (ignoreAscended) buildingId = upgradeSteps[upgradeSteps.length - 1].buildingId;

				// binary-weight selection kit values: kits providing higher/multiple chain
				// items are more valuable and get consumed last
				const items = Object.keys(upgrades);
				items.push(...upgradeSteps.map(step => step.buildingId), buildingId);

				const SKs = Array.from(new Set(items.map(id => Kits.selectionOptions[id] || []).flat()));
				const sKvalues = Object.assign({}, ...SKs.map(id => ({[id]: 0})));
				const upgradesIndexed = Object.keys(upgrades);

				for (const sk of SKs) {
					// era based kits carry their options in eraOptions instead of options
					const skOptions = MainParser.SelectionKits[sk]?.options || MainParser.SelectionKits[sk]?.eraOptions?.[CurrentEra]?.options || [];
					for (const option of skOptions) {
						const idx = upgradesIndexed.indexOf(option.item.cityEntityId || option.item.upgradeItemId || 'test');
						if (idx > -1) {
							sKvalues[sk] += Math.pow(2, idx);
						} else {
							sKvalues[sk] += 0.01;
						}
					}
				}

				// local working copies so the loop can consume stock
				const SO = {};
				const city = {};
				for (const id of items) {
					if (Kits.selectionOptions[id]) {
						SO[id] = Kits.selectionOptions[id].sort((a, b) => sKvalues[a] - sKvalues[b]);
					}
					if (cityBuildings[id]) {
						city[id] = cityBuildings[id];
					}
				}

				const Inv = {};
				items.push(...SKs);
				for (const id of items) {
					if (Inventory[id]) {
						Inv[id] = Inventory[id];
					}
				}

				// max building already in the inventory (directly or via selection kit)
				if (Inv[buildingId]) {
					amount += Inv[buildingId];
					buildingsFromInventory += Inv[buildingId];
					for (let i = 0; i < Inv[buildingId]; i++) {
						chains.push([{type: 'building', from: 'inventory', id: buildingId}]);
					}
					maxLevel = upgradeSteps.length - (ignoreAscended ? 1 : 0);
					if (Object.keys(upgrades).join('').includes('ascended') && !ignoreAscended) ascended = true;
				}
				for (const kit of Kits.selectionOptions[buildingId] || []) {
					if (!Inv[kit]) continue;
					amount += Inv[kit];
					kitCount += Inv[kit];
					for (let i = 0; i < Inv[kit]; i++) {
						chains.push([{type: 'building', from: 'selectionKit', id: kit}]);
					}
					maxLevel = upgradeSteps.length - (ignoreAscended ? 1 : 0);
					if (Object.keys(upgrades).join('').includes('ascended') && !ignoreAscended) ascended = true;
				}

				// assemble buildings: find the highest available base, then apply upgrades upwards
				while (true) {
					const chain = [];
					// snapshot the usage counters: a chain that does not reach maxLevel is
					// discarded below and must not inflate them (#kit accounting)
					const kitCountBefore = kitCount;
					const fromCityBefore = buildingsFromCity;
					const fromInventoryBefore = buildingsFromInventory;

					level = upgradeSteps.length - (ignoreAscended ? 2 : 1);
					for (level; level >= 0; level--) {
						const b = upgradeSteps[level].buildingId;
						if (city[b]) {
							buildingsFromCity++;
							city[b]--;
							chain.push({type: 'building', from: 'city', id: b});
							break;
						}
						if (Inv[b]) {
							buildingsFromInventory++;
							Inv[b]--;
							chain.push({type: 'building', from: 'inventory', id: b});
							break;
						}
						if (SO[b]) {
							let found = false;
							for (const kit of SO[b]) {
								if (Inv[kit]) {
									Inv[kit]--;
									kitCount++;
									found = true;
									chain.push({type: 'building', from: 'selectionKit', id: kit});
									break;
								}
							}
							if (found) break;
						}
					}

					if (level >= 0) {
						for (level; level < upgradeSteps.length; level++) {
							const upgrade = upgradeSteps[level].upgradeId;
							if (Inv[upgrade]) {
								if (upgrade.includes('ascended')) {
									if (ignoreAscended) break;
									ascended = true;
								}
								Inv[upgrade]--;
								kitCount++;
								chain.push({type: 'upgrade', from: 'inventory', id: upgrade});
								continue;
							}
							let found = false;
							for (const kit of SO[upgrade] || []) {
								if (Inv[kit]) {
									if (upgrade.includes('ascended')) {
										if (ignoreAscended) break;
										ascended = true;
									}
									Inv[kit]--;
									kitCount++;
									chain.push({type: 'upgrade', from: 'selectionKit', id: kit});
									found = true;
									break;
								}
							}
							if (found) continue;
							break;
						}

						if (level <= upgradeSteps.length && maxLevel === 0 && kitCount + buildingsFromInventory > 0) {
							if (level < upgradeSteps.length) buildingId = upgradeSteps[level].buildingId;
							maxLevel = level;
						}
					}

					if (level === maxLevel) {
						amount++;
						chains.push(chain);
					} else {
						// discarded chain: keep the consumed stock (loop progress) but revert the counters
						kitCount = kitCountBefore;
						buildingsFromCity = fromCityBefore;
						buildingsFromInventory = fromInventoryBefore;
					}

					if (level < maxLevel) break;
				}

				if (amount > 0 && (buildingsFromInventory > 0 || kitCount > 0)) {
					// merge identical chains and compress repeated chain elements
					const flatChains = {};
					for (const chain of chains) {
						const compressed = [];
						for (const element of chain) {
							if (element.id === (compressed[compressed.length - 1]?.id || '')) {
								compressed[compressed.length - 1].count++;
							} else {
								compressed.push({id: element.id, type: element.type, from: element.from, count: 1});
							}
						}
						const chainId = JSON.stringify(compressed);
						if (!flatChains[chainId]) {
							flatChains[chainId] = {chain: compressed, count: 1};
						} else {
							flatChains[chainId].count++;
						}
					}

					const upgradeCount = {};
					for (const [upgradeId, stepCount] of Object.entries(upgrades)) {
						const upgradeType = Kits._upgradeTypeFromId(upgradeId);
						if (!upgradeCount[upgradeType]) upgradeCount[upgradeType] = {};
						upgradeCount[upgradeType].is = (upgradeCount[upgradeType].is || 0) + Math.min(stepCount, maxLevel);
						upgradeCount[upgradeType].max = (upgradeCount[upgradeType].max || 0) + stepCount;
						maxLevel -= Math.min(stepCount, maxLevel);
					}

					output[buildingId] = {
						kitsUsed: kitCount,
						includesAscended: ascended,
						buildingsFromCity: buildingsFromCity,
						buildingsFromInventory: buildingsFromInventory,
						amount: amount,
						chains: Object.values(flatChains),
						upgradeCount: upgradeCount,
						maxBuilding: maxBuilding
					};

					if (ascended) {
						const ascendedKit = Object.keys(upgrades).find(id => id.includes('ascended'));
						let ascendedStock = 0;
						if (Inventory[ascendedKit]) ascendedStock += Inventory[ascendedKit];
						for (const kit of SO[ascendedKit] || []) {
							if (Inventory[kit]) ascendedStock += Inventory[kit];
						}
						output[buildingId].ascendedStock = ascendedStock;
						ignoreAscended = true;
					} else {
						ignoreAscended = false;
					}
				} else {
					ignoreAscended = false;
				}
			} while (ignoreAscended);
		}

		return output;
	},


	/**
	 * Builds the tooltip html showing how a building can be assembled from
	 * inventory items (used via customTooltip callback "Kits.InventoryTooltip").
	 * @param {Event} e mouseover event carrying the building id in `data-id`
	 * @returns {string} tooltip html
	 */
	InventoryTooltip: (e) => {
		const id = e?.currentTarget?.dataset?.id || e?.currentTarget?.parentElement?.dataset?.id;
		let lng = ExtWorld.substring(0, 2);
		const mapper = {
			'us': 'en',
			'xs': 'en',
			'zz': 'en',
			'ar': 'es',
			'mx': 'es',
			'no': 'en'
		};
		lng = mapper[lng] || lng;

		const inventoryBuilding = Productions.InventoryBuildings[id];
		if (!inventoryBuilding) return '';

		const upgradeCount = inventoryBuilding.upgradeCount;
		let upgrades = '';
		let upgradesMax = '<span class="upgrades">';

		if (upgradeCount) {
			upgrades = '<span class="upgrades"><span class="base">1</span>';
			for (const type in upgradeCount) {
				if (!upgradeCount[type]) continue;
				if (upgradeCount[type].is) {
					upgrades += `<span class="${type}">${upgradeCount[type].is}</span>`;
				}
				if (upgradeCount[type].max - upgradeCount[type].is) {
					upgradesMax += `<span class="${type}">+${upgradeCount[type].max - upgradeCount[type].is}</span>`;
				}
			}
			upgrades += '</span>';
		}
		upgradesMax += '</span>';

		let tooltip = `<div class="inventoryTooltip" lang="${lng}">`;
		tooltip += `<h2>${inventoryBuilding.amount}x ${MainParser.CityEntities[id]?.name}${upgrades}</h2>`;
		tooltip += `<span style="padding:3px 8px;">${i18n('Boxes.Tooltip.Efficiency.description')}:</span>`;

		if (inventoryBuilding.includesAscended) {
			tooltip += `<span class="inventoryChainAscendedStock">${inventoryBuilding.ascendedStock}x</span>`;
		}

		tooltip += '<div class="inventoryChains">';
		for (const chain of inventoryBuilding.chains || []) {
			tooltip += '<div class="inventoryChain">';
			tooltip += `<span class="inventoryChainCount">${chain.count}x</span>`;

			for (const c of chain.chain) {
				tooltip += `<div class="inventoryChainItem ${c.type} ${c.from}">`;
				tooltip += `<div class="inventoryChainItemImg"><img src="${srcLinks.getReward(Kits.specialCases[c.id] || c.id)}" alt=""></div>`;
				tooltip += '<div class="inventoryChainItemDesc">';

				if (c.count > 1) {
					tooltip += `<span class="inventoryChainItemCount">${c.count}x</span>`;
				}

				tooltip += `<span>${Kits.Names[c.id] || MainParser.CityEntities[c.id]?.name}</span>`;
				tooltip += '</div></div>';
			}
			tooltip += '</div>';
		}
		tooltip += '</div>';

		if (upgradesMax !== '<span class="upgrades"></span>') {
			tooltip += '<div class="maxBuilding">';
			tooltip += `<h2>${i18n('Boxes.Kits.maxBuilding')}:</h2>`;
			tooltip += `<span class="maxBuildingDetails">${MainParser.CityEntities[inventoryBuilding.maxBuilding]?.name}${upgradesMax}</span>`;
			tooltip += '</div>';
		}

		tooltip += '</div>';
		return tooltip;
	}
};
