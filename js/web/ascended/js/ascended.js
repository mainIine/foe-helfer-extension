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
	// refresh the menu counter and the open box when the city or the inventory
	// changes (building re-ascended, kit gained, building decayed, ...);
	// a debounce collapses bundled message bursts
	let refreshTimer = null;
	const refresh = () => {
		clearTimeout(refreshTimer);
		refreshTimer = setTimeout(() => {
			Ascended.UpdateMenuCounter();
			if ($('#ascended').length === 0) return;
			Ascended.RenderList();
		}, 250);
	};
	FoEproxy.addFoeHelperHandler('CityMapUpdated', refresh);
	FoEproxy.addFoeHelperHandler('InventoryUpdated', refresh);
}


/**
 * @typedef AscendedRow
 * @property {number|string} entityId placed entity id (key of MainParser.CityMapData)
 * @property {string} metaId city entity id of the limited building (for expired
 *                           buildings the original id before the decay)
 * @property {string} name display name of the limited building
 * @property {string} icon building screenshot url
 * @property {boolean} expired true when the building already decayed
 * @property {number} remaining remaining seconds until the decay (0 when expired)
 * @property {number} duration full limited runtime in seconds
 * @property {string} targetName name of the building it decays into
 * @property {?string} kitId upgrade kit id that restores the limited state
 * @property {?string} kitName display name of the kit
 * @property {number} kitStock kits available in the inventory (incl. selection
 *                             kits and complete fragment sets)
 * @property {number} count number of instances of this building in the city
 *                          (active and expired together)
 */

/**
 * Overview of all time limited ("ascended") buildings in the city: countdown with
 * progress bar until each building loses its state, the full runtime, the kits
 * available to restore it and a marker button to find the building on the map.
 * Uses the same detection as the desktop notification for expired limited
 * buildings in {@link MainParser.Inactives}.
 * @namespace
 */
let Ascended = {

	/** @type {string} current name filter (supports `||` separated regular expressions) */
	SearchText: '',

	/** @type {string} status filter: '' = all, 'active' or 'expired' */
	StatusFilter: '',

	/** @type {string} kit filter: '' = all, 'available' or 'missing' */
	KitFilter: '',

	/** @type {string} sort key: 'remaining', 'name', 'duration' or 'kits' */
	SortBy: 'remaining',

	/** @type {boolean} true = descending sort order */
	SortDescending: false,

	/** @type {?number} interval id of the countdown refresh while the box is open */
	RefreshTimer: null,

	/** @type {?Object<string,{id:string,name:string}>} building id => kit restoring it */
	KitIndex: null,


	/**
	 * Opens the box (or closes an already open one).
	 */
	init: () => {
		if ($('#ascended').length !== 0) {
			HTML.CloseOpenBox('ascended');
			return;
		}

		HTML.AddCssFile('ascended');

		HTML.Box({
			id: 'ascended',
			title: i18n('Boxes.Ascended.Title'),
			auto_close: true,
			dragdrop: true,
			minimize: true,
			resize: true,
			popout: () => MainParser.PopOut('ascended', 820, 480),
		});

		Ascended.BuildBox();
	},


	/**
	 * Creates the box skeleton: topbar with search, status, kit and sort filters,
	 * the building table and a bottombar with the result counter.
	 */
	BuildBox: () => {
		$('#ascendedBody').append(
			$('<div />').attr('id', 'ascendedTopbar').append(
				$('<input />').attr({
					id: 'ascendedSearch',
					class: 'game-cursor',
					type: 'text',
					placeholder: i18n('Boxes.General.FilterItems')
				}).on('input', () => {
					Ascended.SearchText = String($('#ascendedSearch').val());
					Ascended.RenderList();
				}),
				$('<select />').attr({id: 'ascendedStatus', class: 'game-cursor'}).append(
					$('<option />').attr('value', '').text(i18n('Boxes.Ascended.StatusAll')),
					$('<option />').attr('value', 'active').text(i18n('Boxes.Ascended.StatusActive')),
					$('<option />').attr('value', 'expired').text(i18n('Boxes.Ascended.StatusExpired'))
				).on('change', () => {
					Ascended.StatusFilter = String($('#ascendedStatus').val());
					Ascended.RenderList();
				}),
				$('<select />').attr({id: 'ascendedKitFilter', class: 'game-cursor'}).append(
					$('<option />').attr('value', '').text(i18n('Boxes.Ascended.KitsAll')),
					$('<option />').attr('value', 'available').text(i18n('Boxes.Ascended.KitsAvailable')),
					$('<option />').attr('value', 'missing').text(i18n('Boxes.Ascended.KitsMissing'))
				).on('change', () => {
					Ascended.KitFilter = String($('#ascendedKitFilter').val());
					Ascended.RenderList();
				}),
				$('<select />').attr({id: 'ascendedSort', class: 'game-cursor'}).append(
					$('<option />').attr('value', 'remaining').text(i18n('Boxes.Ascended.SortRemaining')),
					$('<option />').attr('value', 'name').text(i18n('Boxes.Ascended.SortName')),
					$('<option />').attr('value', 'duration').text(i18n('Boxes.Ascended.SortDuration')),
					$('<option />').attr('value', 'kits').text(i18n('Boxes.Ascended.SortKits'))
				).on('change', () => {
					Ascended.SortBy = String($('#ascendedSort').val());
					Ascended.RenderList();
				}),
				$('<span />').attr({
					id: 'ascendedSortDir',
					class: 'btn btn-slim',
					title: i18n('Boxes.Ascended.SortDirection')
				}).text('▲').on('click', () => {
					Ascended.SortDescending = !Ascended.SortDescending;
					$('#ascendedSortDir').text(Ascended.SortDescending ? '▼' : '▲');
					Ascended.RenderList();
				})
			),
			$('<div />').attr('id', 'ascendedInner').on('click', '.show-entity', async (e) => {
				// mark every instance of the building, not just the clicked row
				const ids = Ascended.InstanceIds($(e.currentTarget).data('meta_id'));

				if (ids.length > 0 && !await BuildingMarker.show(ids)) {
					Productions.ShowOnMap(ids);
				}
			}).on('scroll', (e) => {
				// fade the sticky table header once the list is scrolled
				e.currentTarget.classList.toggle('scrolled', e.currentTarget.scrollTop > 0);
			}),
			$('<div />').attr('id', 'ascendedBottombar')
		);

		// tick the countdowns while the box is open
		Ascended.RefreshTimer = setInterval(() => {
			if ($('#ascended').length === 0) {
				clearInterval(Ascended.RefreshTimer);
				Ascended.RefreshTimer = null;
				return;
			}
			Ascended.RenderList();
		}, 30000);

		Ascended.RenderList();
	},


	/**
	 * Builds {@link Ascended.KitIndex}: maps every non-base building of an upgrade
	 * chain to the kit that upgrades onto it, so the kit restoring a limited
	 * building (e.g. the ascension kit) can be looked up directly.
	 */
	BuildKitIndex: () => {
		const index = {};

		for (const upgrade of Object.values(MainParser.BuildingUpgrades || {})) {
			for (let i = 1; i < upgrade.upgradeSteps.length; i++) {
				for (const buildingId of upgrade.upgradeSteps[i].buildingIds) {
					if (!index[buildingId]) {
						index[buildingId] = {id: upgrade.upgradeItem.id, name: upgrade.upgradeItem.name};
					}
				}
			}
		}

		Ascended.KitIndex = index;
	},


	/**
	 * Counts how many kits are available in the inventory: the kit itself,
	 * selection kits providing it and complete fragment sets.
	 * @param {string} kitId upgrade kit id
	 * @param {Object<string,Object>} inv flattened inventory from {@link Kits.GetInventoryArray}
	 * @returns {number}
	 */
	KitStock: (kitId, inv) => {
		let stock = inv[kitId]?.inStock || 0;

		for (const kit of (Kits.selectionOptions?.[kitId] || [])) {
			stock += inv[kit]?.inStock || 0;
		}

		const fragments = inv['fragment#' + kitId];
		if (fragments?.required) {
			stock += Math.floor(fragments.inStock / fragments.required);
		}

		return stock;
	},


	/**
	 * Collects all time limited buildings of the city: active ones via their
	 * `limited` component, already expired ones via `decayedFromCityEntityId`.
	 * @returns {AscendedRow[]}
	 */
	CollectBuildings: () => {
		if (Ascended.KitIndex === null && MainParser.BuildingUpgrades) {
			Ascended.BuildKitIndex();
		}

		const inv = Kits.GetInventoryArray();
		const now = GameTime.get();
		const rows = [];

		for (const entity of Object.values(MainParser.CityMapData || {})) {
			// a re-ascended building keeps a stale decayedFromCityEntityId (the game
			// only clears it on the next full reload), so a building counts as
			// expired only when its current version is not itself time limited
			const currentlyLimited = !!MainParser.CityEntities?.[entity.cityentity_id]?.components?.AllAge?.limited?.config?.expireTime;
			const expired = !currentlyLimited && entity.decayedFromCityEntityId !== undefined;
			const metaId = expired ? entity.decayedFromCityEntityId : entity.cityentity_id;
			const meta = MainParser.CityEntities?.[metaId];
			const config = meta?.components?.AllAge?.limited?.config;

			if (!config?.expireTime) continue;

			// the game delivers the decay timestamp directly (state.decaysAt);
			// constructionFinishedAt is only a fallback as it is often missing
			const expireAt = !expired
				? (entity.state?.decaysAt
					|| (entity.state?.constructionFinishedAt ? entity.state.constructionFinishedAt + config.expireTime : null))
				: null;
			const kit = Ascended.KitIndex?.[metaId] || null;

			rows.push({
				entityId: entity.id,
				metaId: metaId,
				name: meta.name,
				icon: Ascended.BuildingIcon(metaId),
				expired: expired,
				remaining: (expireAt !== null) ? Math.max(0, expireAt - now) : null,
				duration: config.expireTime,
				targetId: config.targetCityEntityId,
				targetName: MainParser.CityEntities?.[config.targetCityEntityId]?.name || '',
				kitId: kit?.id || null,
				kitName: kit?.name || null,
				kitStock: kit ? Ascended.KitStock(kit.id, inv) : 0
			});
		}

		// count the instances of each building type (active and expired together)
		const counts = {};
		for (const row of rows) {
			counts[row.metaId] = (counts[row.metaId] || 0) + 1;
		}
		for (const row of rows) {
			row.count = counts[row.metaId];
		}

		return rows;
	},


	/**
	 * Collects the placed entity ids of all instances of a limited building
	 * (active ones and already decayed ones).
	 * @param {string} metaId city entity id of the limited building
	 * @returns {Array<number|string>}
	 */
	InstanceIds: (metaId) => {
		return Object.values(MainParser.CityMapData || {})
			.filter(entity => (entity.decayedFromCityEntityId || entity.cityentity_id) === metaId)
			.map(entity => entity.id);
	},


	/**
	 * Resolves the screenshot url of a building.
	 * @param {string} metaId city entity id
	 * @returns {string}
	 */
	BuildingIcon: (metaId) => {
		const asset = MainParser.CityEntities?.[metaId]?.asset_id;

		if (typeof asset !== 'string') return '';

		return srcLinks.get('/city/buildings/' + [asset.slice(0, 1), '_SS', asset.slice(1)].join('') + '.png', true);
	},


	/**
	 * Formats a remaining runtime as a compact countdown (e.g. `12d 05h`, `4h 31m`).
	 * @param {number} seconds remaining seconds
	 * @returns {string}
	 */
	FormatRemaining: (seconds) => {
		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const dayUnit = i18n('Boxes.Ascended.DayShort');

		if (days > 0) return `${days}${dayUnit} ${String(hours).padStart(2, '0')}h`;
		if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;

		return `${minutes}m`;
	},


	/**
	 * Applies the current filters and sort order.
	 * @param {AscendedRow[]} rows all collected buildings
	 * @returns {AscendedRow[]}
	 */
	FilterAndSort: (rows) => {
		const patterns = Ascended.SearchText.split('||')
			.filter(it => it.trim().length > 0)
			.map(it => { try { return new RegExp(it, 'i'); } catch (e) { return null; } })
			.filter(Boolean);

		let result = rows.filter(row => {
			if (Ascended.StatusFilter === 'active' && row.expired) return false;
			if (Ascended.StatusFilter === 'expired' && !row.expired) return false;
			if (Ascended.KitFilter === 'available' && row.kitStock === 0) return false;
			if (Ascended.KitFilter === 'missing' && row.kitStock > 0) return false;
			if (patterns.length > 0 && !patterns.some(p => p.test(row.name) || p.test(row.targetName))) return false;
			return true;
		});

		const direction = Ascended.SortDescending ? -1 : 1;
		const sorters = {
			// expired buildings first, then by remaining runtime (unknown runtimes last)
			remaining: (a, b) => (a.expired === b.expired)
				? (a.remaining ?? Number.MAX_SAFE_INTEGER) - (b.remaining ?? Number.MAX_SAFE_INTEGER)
				: (a.expired ? -1 : 1),
			name: (a, b) => a.name.localeCompare(b.name),
			duration: (a, b) => a.duration - b.duration,
			kits: (a, b) => a.kitStock - b.kitStock
		};

		result.sort((a, b) => direction * (sorters[Ascended.SortBy] || sorters.remaining)(a, b));

		return result;
	},


	/**
	 * Tooltip callback: renders the normal (left) and the ascended (right)
	 * version of a building side by side as a direct comparison. Each side is
	 * the unmodified standard building tooltip of {@link Tooltips.buildingTT}
	 * (called with a synthetic event), so the look stays identical to the
	 * efficiency rating tooltips.
	 * @param {Event} e mouseover event carrying base_id, ascended_id and entity_id
	 * @returns {Promise<string>} tooltip html
	 */
	CompareTT: async (e) => {
		const ds = e.currentTarget.dataset;
		const entity = MainParser.CityMapData?.[ds.entity_id];
		const era = Technologies.InnoEraNames[entity?.level] || '';
		const sides = [];

		for (const id of [ds.base_id, ds.ascended_id]) {
			if (!MainParser.CityEntities?.[id]) continue;

			const side = await Tooltips.buildingTT({currentTarget: {dataset: {meta_id: id, era: era}}});
			if (side) {
				sides.push(`<div class="compare-side${id === ds.ascended_id ? ' is-ascended' : ''}">${side}</div>`);
			}
		}

		if (sides.length === 0) return '';

		return `<div class="ascendedCompareTT">${sides.join('')}</div>`;
	},


	/**
	 * Updates the red counter on the menu button: total number of expired
	 * limited buildings in the city (hidden while there are none).
	 */
	UpdateMenuCounter: () => {
		const count = Object.values(MainParser.CityMapData || {}).filter(entity =>
			entity.decayedFromCityEntityId !== undefined
			&& !MainParser.CityEntities?.[entity.cityentity_id]?.components?.AllAge?.limited?.config?.expireTime
		).length;

		const badge = $('#ascended-expired-count');
		if (count > 0) {
			badge.text(count).show();
		} else {
			badge.hide();
		}
	},


	/**
	 * Renders the building table and the counter in the bottombar.
	 */
	RenderList: () => {
		const all = Ascended.CollectBuildings();
		const rows = Ascended.FilterAndSort(all);
		const table = [];

		table.push('<table class="foe-table"><thead><tr>');
		table.push('<th></th>');
		table.push(`<th>${i18n('Boxes.Ascended.ColBuilding')}</th>`);
		table.push(`<th class="text-center" title="${i18n('Boxes.Ascended.KitStockTT')}">${i18n('Boxes.Ascended.ColKits')}</th>`);
		table.push(`<th class="text-center">${i18n('Boxes.Ascended.ColDuration')}</th>`);
		table.push(`<th>${i18n('Boxes.Ascended.ColRemaining')}</th>`);
		table.push('<th></th>');
		table.push('</tr></thead><tbody>');

		for (const row of rows) {
			const percent = (!row.expired && row.remaining !== null && row.duration > 0)
				? Math.max(0, Math.min(100, 100 * row.remaining / row.duration))
				: 0;
			// green while running, yellow once 90% of the runtime is over, red when expired
			const barClass = row.expired ? 'crit' : (percent <= 10 ? 'warn' : 'ok');
			const remainingText = row.expired
				? i18n('Boxes.Ascended.Expired')
				: (row.remaining === null ? '–' : Ascended.FormatRemaining(row.remaining));
			const kitTitle = row.kitName ? ` title="${HTML.escapeHtml(row.kitName)}"` : '';

			table.push(`<tr class="${row.expired ? 'is-expired' : ''}">`);
			table.push(`<td class="ascended-icon"><img src="${row.icon}" alt="">`);
			if (row.count > 1) {
				table.push(`<span class="count-badge" title="${i18n('Boxes.Ascended.CountTT')}">${row.count}×</span>`);
			}
			table.push('</td>');
			table.push(`<td class="ascended-name fh-tooltip game-cursor" data-callback_tt="Ascended.CompareTT" data-base_id="${row.targetId}" data-ascended_id="${row.metaId}" data-entity_id="${row.entityId}">`);
			table.push(`<span class="name">${row.name}</span>`);
			if (row.targetName) {
				table.push(`<span class="decays-to">→ ${row.targetName}</span>`);
			}
			table.push('</td>');
			table.push(`<td class="text-center"><span class="kit-stock ${row.kitStock > 0 ? 'available' : 'missing'}"${kitTitle}>${row.kitId ? row.kitStock : '–'}</span></td>`);
			table.push(`<td class="text-center">${i18n('Boxes.Ascended.Days').replace('__days__', String(Math.round(row.duration / 86400)))}</td>`);
			table.push('<td class="ascended-remaining">');
			table.push(`<span class="time ${barClass}">${remainingText}</span>`);
			table.push(`<span class="ascended-bar"><span class="${barClass}" style="width:${percent}%"></span></span>`);
			table.push('</td>');
			table.push(`<td class="text-right"><span class="show-entity game-cursor" data-meta_id="${row.metaId}" title="${i18n('Boxes.Ascended.ShowOnMap')}"><img class="game-cursor" src="${extUrl}css/images/hud/open-eye.png" alt=""></span></td>`);
			table.push('</tr>');
		}

		table.push('</tbody></table>');

		if (rows.length === 0) {
			table.push(`<div class="no-results">${i18n('Boxes.Ascended.NoResults')}</div>`);
		}

		$('#ascendedInner').html(table.join(''));

		const expiredCount = all.filter(row => row.expired).length;
		$('#ascendedBottombar').html(
			i18n('Boxes.Ascended.Summary')
				.replace('__total__', String(all.length))
				.replace('__active__', String(all.length - expiredCount))
				.replace('__expired__', String(expiredCount))
		);
	}
};

{
	let boxRefreshTimer = null;
	const queueBoxRefresh = () => {
		clearTimeout(boxRefreshTimer);
		boxRefreshTimer = setTimeout(() => {
			if ($('#ascended').length === 0) return;
			Ascended.RenderList();
		}, 250);
	};

	const queueAscendedChangeRefresh = () => {
		queueBoxRefresh();
	};

	FoEproxy.addHandler('CityMapService', 'placeBuilding', queueAscendedChangeRefresh);
	FoEproxy.addHandler('CityMapService', 'removeBuilding', queueAscendedChangeRefresh);
	FoEproxy.addHandler('InventoryService', 'useItem', queueAscendedChangeRefresh);
	FoEproxy.addHandler('InventoryService', 'updateItem', queueAscendedChangeRefresh);
}