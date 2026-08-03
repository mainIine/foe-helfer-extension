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
	// track stock additions and refresh the open box when the inventory changes
	// (WS pushes, item usage, store purchases, ...); a debounce collapses
	// bundled message bursts
	let refreshTimer = null;
	FoEproxy.addFoeHelperHandler('InventoryUpdated', () => {
		clearTimeout(refreshTimer);
		refreshTimer = setTimeout(() => {
			InventoryOverview.TrackAdditions();
			if ($('#inventoryOverview').length === 0) return;
			InventoryOverview.buildingCache = {};
			InventoryOverview.RenderList();
		}, 250);
	});

	// harvest the game's own inventory log whenever the player opens it ingame:
	// it delivers the exact "added to inventory" history (order + date labels)
	// straight from the server, including additions made while the extension was off
	const harvestLog = (data) => InventoryOverview.HarvestGameLog(data.responseData);
	FoEproxy.addHandler('InventoryService', 'getLogs', harvestLog);
	FoEproxy.addWsHandler('InventoryService', 'getLogs', harvestLog);
}

/**
 * @typedef InventoryOverviewItem
 * @property {string} id flattened inventory id (see {@link Kits.GetInventoryArray})
 * @property {string} name display name
 * @property {number} inStock stocked amount (for fragments: stocked fragments)
 * @property {?number} required fragments required for assembly, null for regular items
 * @property {boolean} isFragment true when the item is a fragment stack
 * @property {string} kind item category: 'building', 'fragment', 'kit' or 'other'
 * @property {?string} entityId city entity id when the item (or its assembled
 *                              reward) is a building, null otherwise
 * @property {string} icon icon url
 * @property {number} [value] value of the selected property (only while a property filter is active)
 * @property {number} [added] sort key (ms) of the last stock increase, 0 = unknown (only while sorting by additions)
 * @property {?string} [addedLabel] the game's own date label from the ingame inventory log, null = use the tracked time
 */

/**
 * A searchable inventory overview: lists all inventory items and can filter and
 * sort them by building properties (forge points, unit boosts, goods, ...).
 * The property values are calculated with the same logic the efficiency rating
 * uses, so buildings and their fragments become comparable at a glance.
 * @namespace
 */
let InventoryOverview = {

	/** @type {string} selected property type, '' = no property filter */
	FilterType: '',

	/** @type {boolean} true = descending sort order */
	SortDescending: true,

	/** @type {string} current name filter (supports `||` separated regular expressions) */
	SearchText: '',

	/** @type {Object<string,Object>} processed buildings keyed by entity id (reset on inventory updates) */
	buildingCache: {},

	/** @type {?Object<string,number>} timestamps (ms) of the last stock increase per item id, null until loaded */
	AddedTimes: null,

	/** @type {?Object<string,number>} last known stock per item id, null until the first inventory sync */
	StockSnapshot: null,

	/** @type {?{at:number,order:string[],dates:Object<string,string>}} snapshot of the ingame inventory log, null until loaded */
	GameLog: null,

	/** @type {string|null} CDN url of the fragment icon */
	fragmentURL: null,


	/**
	 * Opens the box (or closes an already open one).
	 */
	init: () => {
		if ($('#inventoryOverview').length !== 0) {
			HTML.CloseOpenBox('inventoryOverview');
			return;
		}

		HTML.AddCssFile('inventory');

		HTML.Box({
			id: 'inventoryOverview',
			title: i18n('Boxes.Inventory.Title'),
			auto_close: true,
			dragdrop: true,
			minimize: true,
			resize: true
		});

		InventoryOverview.BuildBox();
	},


	/**
	 * Creates the box skeleton: topbar with search, property filter and sort
	 * direction, the item grid and a bottombar with the result counter.
	 */
	BuildBox: () => {
		$('#inventoryOverviewBody').append(
			$('<div />').attr('id', 'inventoryOverviewTopbar').append(
				$('<input />').attr({
					id: 'inventoryOverviewSearch',
					class: 'game-cursor',
					type: 'text',
					placeholder: i18n('Boxes.General.FilterItems')
				}).on('input', () => {
					InventoryOverview.SearchText = String($('#inventoryOverviewSearch').val());
					InventoryOverview.RenderList();
				}),
				$('<select />').attr({
					id: 'inventoryOverviewProperty',
					class: 'game-cursor',
					'data-original-title': i18n('Boxes.Inventory.PropertyFilterHint'),
					'data-toggle': 'tooltip'
				}).append(InventoryOverview.PropertyOptions()).on('change', () => {
					InventoryOverview.FilterType = String($('#inventoryOverviewProperty').val());
					InventoryOverview.RenderList();
				}),
				$('<span />').attr({
					id: 'inventoryOverviewSort',
					class: 'btn btn-slim',
					'data-original-title': i18n('Boxes.Inventory.SortDirection'),
					'data-toggle': 'tooltip'
				}).text('▼').on('click', () => {
					InventoryOverview.SortDescending = !InventoryOverview.SortDescending;
					$('#inventoryOverviewSort').text(InventoryOverview.SortDescending ? '▼' : '▲');
					InventoryOverview.RenderList();
				})
			),
			$('<div />').attr('id', 'inventoryOverviewInner'),
			$('<div />').attr('id', 'inventoryOverviewBottombar')
		);

		$('#inventoryOverview [data-toggle="tooltip"]').tooltip({
			html: true,
			container: '#inventoryOverview'
		});

		InventoryOverview.RenderList();
	},


	/**
	 * Stamps inventory additions: compares the current stock with the last
	 * snapshot and remembers the time of every increase. The first sync of a
	 * session only primes the snapshot, so gains collected while the extension
	 * was inactive are not stamped as new. Timestamps survive reloads.
	 */
	TrackAdditions: () => {
		const snapshot = {};
		for (const entry of Object.values(Kits.GetInventoryArray())) {
			snapshot[entry.id] = entry.inStock;
		}

		if (InventoryOverview.AddedTimes === null) {
			InventoryOverview.AddedTimes = JSON.parse(localStorage.getItem('InventoryOverview.AddedTimes') || '{}');
		}

		if (InventoryOverview.StockSnapshot !== null) {
			const now = Date.now();
			for (const [id, amount] of Object.entries(snapshot)) {
				if (amount > (InventoryOverview.StockSnapshot[id] || 0)) {
					InventoryOverview.AddedTimes[id] = now;
				}
			}
			// forget timestamps of items that left the inventory
			for (const id of Object.keys(InventoryOverview.AddedTimes)) {
				if (snapshot[id] === undefined) delete InventoryOverview.AddedTimes[id];
			}
			localStorage.setItem('InventoryOverview.AddedTimes', JSON.stringify(InventoryOverview.AddedTimes));
		}

		InventoryOverview.StockSnapshot = snapshot;
	},


	/**
	 * Stores the game's inventory log (sent when the player opens the ingame
	 * "inventory log" window): recency order and the game's own date labels.
	 * The log is server-side history, so it also covers additions made while
	 * the extension was inactive.
	 * @param {{items: Object[], count: number}} overview InventoryLogOverview response
	 */
	HarvestGameLog: (overview) => {
		if (!overview || !Array.isArray(overview.items)) return;

		const inv = Kits.GetInventoryArray();
		const log = { at: Date.now(), order: [], dates: {} };

		for (const entry of overview.items) { // items arrive newest first
			const id = InventoryOverview.LogRewardId(entry.reward, inv);
			if (id === null || log.dates[id] !== undefined) continue;
			log.order.push(id);
			log.dates[id] = entry.date;
		}

		InventoryOverview.GameLog = log;
		localStorage.setItem('InventoryOverview.GameLog', JSON.stringify(log));

		if ($('#inventoryOverview').length > 0 && InventoryOverview.FilterType === '@added') {
			InventoryOverview.RenderList();
		}
	},


	/**
	 * Maps a reward of the game's inventory log onto the flattened inventory id
	 * used by {@link Kits.GetInventoryArray}. Building fragments are logged under
	 * their asset name, so the id is recomputed from the assembled reward.
	 * @param {Object} reward FragmentReward or GenericReward of an InventoryLogItem
	 * @param {Object<string,Object>} inv flattened inventory
	 * @returns {?string} flattened id or null when nothing matches the inventory
	 */
	LogRewardId: (reward, inv) => {
		if (!reward) return null;

		const candidates = [reward.id];
		const assembled = reward.assembledReward;
		if (assembled) {
			candidates.push('fragment#' + (assembled.type === 'building' ? assembled.subType : (assembled.id || assembled.iconAssetName)));
		}
		candidates.push(reward.iconAssetName);

		return candidates.find(id => id && inv[id] !== undefined) || null;
	},


	/**
	 * Builds the `option` elements of the property dropdown from the efficiency
	 * rating configuration: every ratable production/boost type becomes a filter,
	 * grouped like the rating settings (production, battle, quantum incursion).
	 * @returns {JQuery[]}
	 */
	PropertyOptions: () => {
		const types = Object.entries(Productions.Rating.getDefaultData())
			.sort((a, b) => a[1].order - b[1].order);

		const groupLabels = {
			1: i18n('Boxes.Inventory.GroupProduction'),
			2: i18n('General.Battle'),
			3: i18n('Boxes.General.Quantum_Incursion')
		};

		const options = [
			$('<option />').attr('value', '').text(i18n('Boxes.Inventory.AllItems')),
			$('<option />').attr('value', '@added').text(i18n('Boxes.Inventory.SortAdded'))
		];
		let currentGroup = null;

		for (const [type, config] of types) {
			if (config.group !== currentGroup) {
				currentGroup = config.group;
				options.push($('<optgroup />').attr('label', groupLabels[currentGroup] || ''));
			}
			options[options.length - 1].append(
				$('<option />').attr('value', type).text(Productions.GetTypeName(type))
			);
		}

		return options;
	},


	/**
	 * Flattens the inventory into displayable items. Buildings and building
	 * fragments carry their entity id so property values can be calculated.
	 * @returns {InventoryOverviewItem[]}
	 */
	CollectItems: () => {
		const inv = Kits.GetInventoryArray();
		const items = [];

		// historical allies are managed in their own box - collect their flattened
		// ids (they only occur as fragments, plus a defensive whole-item check)
		const allyIds = new Set();
		for (const entry of Object.values(MainParser.Inventory || {})) {
			const assembled = entry.item?.reward?.assembledReward;
			if (assembled?.type === 'ally') {
				allyIds.add('fragment#' + (assembled.id || assembled.iconAssetName));
			}
			if (entry.item?.reward?.type === 'ally') {
				allyIds.add(entry.item.reward.id || entry.itemAssetName);
			}
		}

		for (const entry of Object.values(inv)) {
			if (allyIds.has(entry.id)) continue;
			const isFragment = entry.id.startsWith('fragment#');
			const targetId = (isFragment ? entry.id.substring(9) : entry.id);
			const isBuilding = (targetId.substring(1, 2) === '_' && MainParser.CityEntities[targetId] !== undefined);

			let kind = 'other';
			if (isFragment) {
				kind = 'fragment';
			} else if (isBuilding) {
				kind = 'building';
			} else if (MainParser.SelectionKits?.[entry.id] !== undefined || MainParser.BuildingUpgrades?.[entry.id] !== undefined) {
				kind = 'kit';
			}

			items.push({
				id: entry.id,
				name: entry.name || targetId,
				inStock: entry.inStock,
				required: entry.required,
				isFragment: isFragment,
				kind: kind,
				entityId: (isBuilding ? targetId : null),
				icon: InventoryOverview.ItemIcon(entry, isBuilding, targetId)
			});
		}

		return items;
	},


	/**
	 * Resolves the icon url of an item: building screenshot for buildings,
	 * reward icon for everything else.
	 * @param {Object} entry flattened inventory entry
	 * @param {boolean} isBuilding
	 * @param {string} targetId entity id of the (assembled) building
	 * @returns {string}
	 */
	ItemIcon: (entry, isBuilding, targetId) => {
		if (isBuilding) {
			const asset = MainParser.CityEntities[targetId].asset_id;
			if (typeof asset === 'string') {
				return srcLinks.get('/city/buildings/' + [asset.slice(0, 1), '_SS', asset.slice(1)].join('') + '.png', true);
			}
		}

		const asset = Kits.specialCases[entry.itemAssetName] || entry.itemAssetName;
		return srcLinks.get('/shared/icons/reward_icons/reward_icon_' + asset + '.png', true);
	},


	/**
	 * Calculates the value of the selected property for a building entity.
	 * Uses the same value extraction as the efficiency rating; set buildings are
	 * treated as fully linked so their potential bonuses count.
	 * @param {string} entityId
	 * @param {string} type property type (efficiency rating type key)
	 * @returns {number}
	 */
	PropertyValue: (entityId, type) => {
		let building = InventoryOverview.buildingCache[entityId];

		if (building === undefined) {
			building = CityBuildings.createBuilding(MainParser.CityEntities[entityId], CurrentEra);
			if (building.setBuilding) {
				building.setBuilding.uniqueAdjacentCount = 99; // assume a fully linked set
			}
			InventoryOverview.buildingCache[entityId] = building;
		}

		return Productions.getRatingValueForType(building, type) || 0;
	},


	/**
	 * Applies the current search and property filter, sorts and renders the item grid.
	 */
	RenderList: () => {
		if (!InventoryOverview.fragmentURL) {
			InventoryOverview.fragmentURL = srcLinks.get('/shared/icons/icon_tooltip_fragment.png', true);
		}

		const type = InventoryOverview.FilterType;
		const isProperty = (type !== '' && type !== '@added');
		let items = InventoryOverview.CollectItems();

		// property filter: only buildings (and their fragments) with a value
		if (isProperty) {
			items = items.filter(item => item.entityId !== null);
			for (const item of items) {
				item.value = InventoryOverview.PropertyValue(item.entityId, type);
			}
			items = items.filter(item => item.value !== 0);
		}

		// "recently added" sort: merge the tracked stock increases with the ingame
		// inventory log. Log entries get pseudo-timestamps just below their capture
		// time (1s per position keeps their order), so anything tracked afterwards
		// sorts as newer; the fresher of both sources wins per item.
		if (type === '@added') {
			if (InventoryOverview.StockSnapshot === null) {
				InventoryOverview.TrackAdditions();
			}
			if (InventoryOverview.GameLog === null) {
				InventoryOverview.GameLog = JSON.parse(localStorage.getItem('InventoryOverview.GameLog') || 'null') || { at: 0, order: [], dates: {} };
			}
			const log = InventoryOverview.GameLog;
			for (const item of items) {
				const tracked = InventoryOverview.AddedTimes[item.id] || 0;
				const pos = log.order.indexOf(item.id);
				const fromLog = (pos !== -1 ? log.at - (pos + 1) * 1000 : 0);
				item.added = Math.max(tracked, fromLog);
				item.addedLabel = (pos !== -1 && fromLog >= tracked ? log.dates[item.id] : null);
			}
		}

		// name filter (`||` separated regular expressions, like the kits box);
		// half-typed invalid patterns fall back to a plain text search
		const filterRegExps = InventoryOverview.SearchText
			.split('||').filter(it => it.trim().length > 0).map(it => {
				try {
					return new RegExp(it, 'i');
				} catch (e) {
					return { test: (name) => name.toLowerCase().includes(it.toLowerCase()) };
				}
			});
		if (filterRegExps.length > 0) {
			items = items.filter(item => filterRegExps.some(it => it.test(item.name)));
		}

		const direction = (InventoryOverview.SortDescending ? -1 : 1);
		items.sort((a, b) => {
			if (type === '@added' && a.added !== b.added) return (a.added - b.added) * direction;
			if (isProperty && a.value !== b.value) return (a.value - b.value) * direction;
			return a.name.localeCompare(b.name) * (type !== '' ? 1 : direction);
		});

		$('#inventoryOverviewInner').html(
			items.length > 0
				? items.map(item => InventoryOverview.ItemDiv(item, type)).join('')
				: '<p class="no-results">' + i18n('Boxes.Inventory.NoResults') + '</p>'
		);
		// result counter with a small per-category breakdown of the visible items
		const counts = {};
		for (const item of items) {
			counts[item.kind] = (counts[item.kind] || 0) + 1;
		}
		const breakdown = [
			['building', 'TypeBuildings'],
			['fragment', 'TypeFragments'],
			['kit', 'TypeKits'],
			['other', 'TypeOther']
		]
			.filter(([kind]) => counts[kind] > 0)
			.map(([kind, key]) => counts[kind] + ' ' + i18n('Boxes.Inventory.' + key));

		$('#inventoryOverviewBottombar').html(
			items.length + ' ' + i18n('Boxes.Inventory.Items')
			+ (breakdown.length > 0 ? '<span class="type-split">' + breakdown.join(', ') + '</span>' : '')
		);

		$('#inventoryOverviewInner [data-original-title]').tooltip({
			html: true,
			container: '#inventoryOverview'
		});
	},


	/**
	 * Creates the tile `div` for one item.
	 * @param {InventoryOverviewItem} item
	 * @param {string} type active property type ('' = none, '@added' = sort by additions)
	 * @returns {string} html string
	 */
	ItemDiv: (item, type) => {
		const safeName = item.name.replace(/"/g, '&quot;');
		// buildings get the rich building tooltip, everything else at least the
		// full name as native tooltip (names are truncated to one line)
		const tooltip = (item.entityId !== null
			? ` data-meta_id="${item.entityId}" data-era="${CurrentEra}" data-callback_tt="Tooltips.buildingTT" class="item fh-tooltip game-cursor"`
			: ` class="item" title="${safeName}"`);

		let fragments = '';
		if (item.isFragment) {
			const percent = Math.min(100, Math.round(item.inStock / (item.required || 1) * 100));
			fragments = `<span class="fragments"><img class="ItemFragment" src="${InventoryOverview.fragmentURL}" alt=""> ${item.inStock}/${item.required}</span>
				<span class="fragment-bar"><span style="width:${percent}%"></span></span>`;
		}

		let value = '';
		if (type === '@added') {
			const label = item.addedLabel || (item.added > 0 ? moment(item.added).fromNow() : '');
			value = (label !== ''
				? `<strong class="prop-value added-time">${label}</strong>`
				: '');
		} else if (type !== '') {
			value = `<strong class="prop-value">${HTML.Format(Math.round(item.value * 100) / 100)}</strong>`;
		}

		const stock = (item.isFragment
			? ''
			: `<strong class="in-stock" data-original-title="${i18n('Boxes.Kits.InStock')}">${item.inStock}</strong>`);

		return `<div${tooltip}>
					<div class="image"><img loading="lazy" src="${item.icon}" alt="${safeName}" /></div>
					${stock}
					<span class="item-name">${item.name}</span>
					${fragments}
					${value}
				</div>`;
	}
};
