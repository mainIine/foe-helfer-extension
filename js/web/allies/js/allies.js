/*
 * ************************************************************************************
 *
 *  Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 *  You may use, distribute and modify this code under the
 *  terms of the AGPL license.
 *
 *  See file LICENSE.md or go to
 *  https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 *  for full license details.
 *
 *  *************************************************************************************
 *
 */

/**
 * Manages historical allies: player data from the AllyService, static meta data
 * (names, rarities, types) and the ally overview box.
 */
let Allies = {

	/** @type {?Object<number, Object>} All allies of the player, indexed by ally instance id */
	allyList: null,

	/** @type {?Object<number, Object<number, number>>} Ally instance ids grouped by the map entity they are assigned to */
	buildingList: null,

	/** @type {?Object<string, Object>} Static ally meta data (name, portrait, …), indexed by ally meta id */
	meta: null,

	/** @type {?Object<string, Object>} Rarity definitions, indexed by rarity id */
	rarities: null,

	/** @type {?Object<string, Object>} Ally type definitions, indexed by type id */
	types: null,

	/** @type {Object[]} Summed up boosts of all currently assigned allies */
	buildingBoostSums: [],

	/** @type {{rarity: string, term: string}} Active list filters, preserved across re-renders */
	filter: { rarity: '', term: '' },


	/**
	 * Stores the full ally list and rebuilds the building assignment index.
	 *
	 * @param {Object[]} allies Ally objects, each with an `id` and optionally a `mapEntityId`
	 */
	getAllies: (allies) => {
		Allies.allyList = Object.assign({}, ...allies.map(a => ({ [a.id]: a })));

		let list = Allies.buildingList = {};

		for (let ally of allies) {
			if (!ally.mapEntityId) continue;

			if (list[ally.mapEntityId]) {
				list[ally.mapEntityId][ally.id] = ally.id;
			}
			else {
				list[ally.mapEntityId] = { [ally.id]: ally.id };
			}
		}

		Allies.updateAllyList();
	},


	/**
	 * Updates a single ally and keeps the building assignment index in sync.
	 * With a `mapEntityId` the ally is (re-)assigned to that building,
	 * without one it is removed from its previous building.
	 *
	 * @param {Object} ally The ally object
	 * @param {number} ally.id Unique ally instance id
	 * @param {number} [ally.mapEntityId] Id of the map entity the ally is assigned to
	 */
	updateAlly: (ally) => {
		if (ally.mapEntityId) {
			let list = Allies.buildingList;

			if (list[ally.mapEntityId]) {
				list[ally.mapEntityId][ally.id] = ally.id;
			}
			else {
				list[ally.mapEntityId] = { [ally.id]: ally.id };
			}
		}
		else {
			let mapID = Allies.allyList[ally.id]?.mapEntityId;

			if (mapID) {
				delete Allies.buildingList[mapID][ally.id];

				if (Object.keys(Allies.buildingList[mapID]).length === 0) {
					delete Allies.buildingList[mapID];
				}
			}
		}

		Allies.allyList[ally.id] = ally;
		Allies.updateAllyList();
	},


	/**
	 * Adds a newly acquired ally to the list.
	 *
	 * @param {Object} ally The ally object
	 * @param {number} ally.id Unique ally instance id
	 */
	addAlly: (ally) => {
		Allies.allyList[ally.id] = ally;
		Allies.updateAllyList();
	},


	/**
	 * Stores the static ally meta data (from the `allies` metadata file).
	 *
	 * @param {Object[]} raw Ally meta objects, each with an `id` property
	 */
	setMeta: (raw) => {
		let meta = Allies.meta = {};

		for (let ally of raw) {
			meta[ally.id] = ally;
		}
	},


	/**
	 * Stores the rarity definitions (from the `ally_rarities` metadata file).
	 *
	 * @param {Object[]} raw Rarity objects, each with an `id.value` property
	 */
	setRarities: (raw) => {
		Allies.rarities = Object.assign({}, ...raw.map(r => ({ [r.id.value]: r })));
	},


	/**
	 * Stores the ally type definitions (from the `ally_types` metadata file).
	 *
	 * @param {Object[]} raw Type objects, each with an `id` property
	 */
	setTypes: (raw) => {
		Allies.types = Object.assign({}, ...raw.map(t => ({ [t.id]: t })));
	},


	/**
	 * Returns the summed boost production of all allies assigned to a building.
	 *
	 * @param {number} CityMapId Id of the map entity
	 * @returns {?Object} Object with a `boosts` array, or null if no ally is assigned
	 */
	getProd: (CityMapId) => {
		if (!Allies.buildingList?.[CityMapId]) return null;

		let prod = {};

		Object.values(Allies.buildingList[CityMapId]).forEach(id => {
			let ally = Allies.allyList[id];
			let boosts = ally.currentLevel?.boosts || ally.boosts;

			if (boosts) {
				prod.boosts = (prod.boosts || []).concat(boosts);
			}
		});

		return prod;
	},


	/**
	 * Builds the `data-allies` attribute for building tooltips.
	 *
	 * @param {number} id Id of the map entity
	 * @returns {string} Attribute string, or an empty string if no ally is assigned
	 */
	tooltip: (id) => {
		if (!Allies.buildingList?.[id]) return '';

		return `data-allies ="${JSON.stringify(Object.values(Allies.buildingList[id]))}"`;
	},


	/**
	 * Returns a flattened copy of an ally, enriched with meta data
	 * (name, type name) for display purposes.
	 *
	 * @param {number} id Unique ally instance id
	 * @returns {Object} Enriched ally object
	 */
	getAllieData: (id) => {
		let ally = structuredClone(Allies.allyList[id]);

		ally.rarity = ally.rarity.value;
		ally.name = Allies.meta[ally.allyId]?.name;
		ally.typeName = Allies.types[ally.type]?.name;
		ally.type = Allies.meta[ally.allyId]?.allyType;

		return ally;
	},


	/**
	 * Calculates the level-up cost and gain of an ally room entry.
	 *
	 * @param {Object} r Room entry built by `updateAllyList`
	 * @returns {?{missing: number, gain: number, efficiency: number}}
	 *          `missing` XP until the next level, `gain` as summed boost increase and
	 *          `efficiency` as boost gain per 100 XP (Infinity when the level-up is ready).
	 *          Null when no level data is available (fragments, empty rooms, max level).
	 */
	levelUpStats: (r) => {
		if (r.isMax || r.xpNeeded == null || !r.nextBoosts) return null;

		const sum = (list) => (list || []).reduce((s, b) => s + b.value, 0);
		const missing = Math.max(0, r.xpNeeded - (r.xp || 0));
		const gain = sum(r.nextBoosts) - sum(r.allyBoosts);

		return {
			missing: missing,
			gain: gain,
			efficiency: missing > 0 ? gain * 100 / missing : Infinity
		};
	},


	/**
	 * Opens the ally overview box (or closes it when already open).
	 *
	 * @param {boolean} [closeIfOpen=false] Close the box if it is already open
	 */
	showAllyList: (closeIfOpen = false) => {
		if ($('#AllyList').length === 0) {
			HTML.AddCssFile('allies');

			HTML.Box({
				id: 'AllyList',
				title: i18n('Boxes.AllyList.Title'),
				ask: i18n('Boxes.AllyList.HelpLink'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
				popout: 'MainParser.PopOut(\'AllyList\', 970, 600)',
				settings: 'Allies.ShowSettings()',
				active_maps: 'main',
			});
		}
		else if (closeIfOpen) {
			HTML.CloseOpenBox('AllyList');
			return;
		}

		Allies.updateAllyList();
	},


	/**
	 * Rebuilds the content of the ally overview box: one row per ally room
	 * (assigned allies, unassigned allies, empty rooms and ally fragments)
	 * plus the boost sums of all assigned allies.
	 *
	 * Two views are available (toggle button, persisted in localStorage):
	 * - `compact`: boosts as chips in one column plus the level-up efficiency
	 *   columns (XP until level-up, boost gain, boost gain per 100 XP)
	 * - `matrix`: one column per boost type/feature for sorting and comparing
	 *
	 * Does nothing while the box is closed.
	 */
	updateAllyList: () => {
		Allies.buildingBoostSums = [];

		if ($('#AllyList').length === 0) return;

		const view = localStorage.getItem('AllyListView') || 'compact';

		// all buildings providing ally rooms, indexed by map entity id
		let buildings = Object.assign({}, ...Object.values(MainParser.CityMapData)
			.map(x => ({
				id: x.id,
				metaID: x.cityentity_id,
				rooms: structuredClone(MainParser.CityEntities[x.cityentity_id]?.components?.AllAge?.ally?.rooms)
			}))
			.filter(x => x.rooms !== undefined)
			.map(x => ({ [x.id]: x }))
		);

		let rooms = {};
		let unassigned = 0;

		// column layout of the boost matrix view
		const boostList = [
			{ feature: 'all', type: 'att_boost_attacker' },
			{ feature: 'all', type: 'att_boost_defender' },
			{ feature: 'battleground', type: 'att_boost_attacker' },
			{ feature: 'battleground', type: 'att_boost_defender' },
			{ feature: 'guild_expedition', type: 'att_boost_attacker' },
			{ feature: 'guild_expedition', type: 'att_boost_defender' },
			{ feature: 'all', type: 'def_boost_attacker' },
			{ feature: 'all', type: 'def_boost_defender' },
			{ feature: 'battleground', type: 'def_boost_attacker' },
			{ feature: 'battleground', type: 'def_boost_defender' },
			{ feature: 'guild_expedition', type: 'def_boost_attacker' },
			{ feature: 'guild_expedition', type: 'def_boost_defender' },
		];

		// level/XP fields shared by assigned and unassigned allies
		const levelData = (a) => ({
			allyLevel: a.level || null,
			allyBoosts: a.currentLevel?.boosts || a.boosts || null,
			xp: a.experience ?? null,
			xpNeeded: a.currentLevel?.experience ?? null,
			nextBoosts: a.nextLevel?.boosts || null,
			isMax: !!(a.currentLevel && !a.nextLevel),
		});

		// match assigned allies to their building rooms, collect unassigned allies
		Object.values(Allies.allyList).forEach(x => {
			if (x.mapEntityId) {
				let rs = buildings[x.mapEntityId].rooms;

				// prefer a room matching the ally's rarity …
				for (let r of rs) {
					if (!r.ally && r.rarity?.value === x.rarity.value) {
						r.ally = x;
						return;
					}
				}
				// … otherwise take a room without rarity restriction
				for (let r of rs) {
					if (!r.ally && !r.rarity) {
						r.ally = x;
					}
				}
			}
			else {
				rooms['0#' + unassigned] = {
					allyRarity: x.rarity?.value || '',
					allyName: Allies.meta[x.allyId]?.name || '',
					...levelData(x),
				};
				unassigned++;
			}
		});

		// one entry per building room (occupied or empty)
		Object.values(buildings).forEach(b => {
			for (let [i, r] of Object.entries(b.rooms)) {
				rooms[b.id + '#' + i] = {
					buildingName: MainParser.CityEntities[b.metaID].name,
					buildingMeta: b.metaID,
					roomRarity: r.rarity?.value || Object.keys(Allies.rarities).join('#'),
					allyRarity: r.ally?.rarity?.value || '',
					allyName: Allies.meta[r.ally?.allyId]?.name || '',
					...(r.ally ? levelData(r.ally) : { allyLevel: null, allyBoosts: null }),
				};
			}
		});

		// allies still in fragments (from the inventory)
		Object.values(MainParser.Inventory)
			.filter(x => x?.item?.reward?.assembledReward?.type === 'ally')
			.forEach(x => {
				if (!x.inStock) return;

				rooms['0#' + unassigned] = {
					fragmentsAmount: x.inStock,
					fragmentsNeeded: x.item.reward.requiredAmount,
					allyRarity: x.item.reward.assembledReward.rarity?.value || '',
					allyLevel: x.item.reward.assembledReward.level || null,
					allyBoosts: x.item.reward.assembledReward.boosts || null,
					allyName: x.item.reward.assembledReward.name,
				};
				unassigned++;
			});

		// level-up stats per room; ranking determines the highlighted top candidates
		const statsById = {};

		for (const [roomId, r] of Object.entries(rooms)) {
			const stats = Allies.levelUpStats(r);
			if (stats) statsById[roomId] = stats;
		}

		const ranking = Object.entries(statsById)
			.sort((a, b) => b[1].efficiency - a[1].efficiency)
			.map(([id]) => id);

		// toolbar: rarity filter, text search and view toggle
		let html = `<div class="dark-bg ally-toolbar">
			<select id="AllyFilter"><option value="">${i18n('Boxes.AllyList.All')}</option>`;

		for (let r of Object.values(Allies.rarities)) {
			html += `<option value="${r.id.value}"${Allies.filter.rarity === r.id.value ? ' selected' : ''}>${r.name}</option>`;
		}

		html += `</select>
			<input id="AllySearch" type="text" placeholder="${i18n('Boxes.AllyList.Search')}" value="${Allies.filter.term.replace(/"/g, '&quot;')}">
			<button id="AllyViewToggle" class="btn">${view === 'compact' ? i18n('Boxes.AllyList.ViewMatrix') : i18n('Boxes.AllyList.ViewCompact')}</button>
		</div>`;

		html += `<table id="AllyListTable" class="foe-table">`;
		html += `<thead class="sticky"><tr class="sorter-header sort2">
				<th class="no-sort">${i18n('Boxes.AllyList.Ally')}</th>
				<th class="is-number" data-type="ally-list">${i18n('Boxes.AllyList.Level')}</th>`;

		if (view === 'compact') {
			html += `<th class="is-number" data-type="ally-list">${i18n('Boxes.AllyList.XPMissing')}</th>
				<th class="is-number" data-type="ally-list">${i18n('Boxes.AllyList.BoostGain')}</th>
				<th class="is-number" data-type="ally-list">${i18n('Boxes.AllyList.Efficiency')}</th>
				<th class="no-sort">${i18n('Boxes.AllyList.Boosts')}</th>`;
		}
		else {
			for (const b of boostList) {
				html += `<th class="is-number" data-type="ally-list"><span class="resicon ${b.type}-${b.feature}"></span></th>`;
			}
		}

		html += `<th class="no-sort">${i18n('Boxes.AllyList.Building')}</th>
				</tr>
			</thead>
			<tbody class="ally-list">`;

		// unassigned first, then assigned, fragments last; each group sorted by rarity
		const sortRank = (r) => Object.keys(Allies.rarities).indexOf(r.allyRarity) + (r.buildingName ? 10 : 0) + (r.fragmentsAmount ? 100 : 0);
		const sortedRooms = Object.entries(rooms).sort((a, b) => sortRank(a[1]) - sortRank(b[1]));

		const columnCount = view === 'compact' ? 7 : 15;

		for (let [roomId, r] of sortedRooms) {
			let buildingId = roomId.split('#')[0];
			let rarities = r.roomRarity?.split('#') || [];

			rarities.push(r.allyRarity);
			rarities = rarities.map(x => 'Rarity-' + x);

			const rowClasses = ['allyRoomRow', ...rarities];
			if (r.isMax) rowClasses.push('ally-max');

			const searchText = ((r.allyName || '') + ' ' + (r.buildingName || '')).toLowerCase().replace(/"/g, '&quot;');

			// name cell, for fragments with progress bar
			let fragments = '';
			if (r.fragmentsAmount) {
				fragments = `${srcLinks.icons('icon_tooltip_fragment')} ${r.fragmentsAmount}/${r.fragmentsNeeded}
					<div class="xp-bar"><span style="width:${Math.min(100, r.fragmentsAmount * 100 / r.fragmentsNeeded)}%"></span></div>`;
			}

			html += `<tr class="${rowClasses.join(' ')}" data-search="${searchText}">
					<td style="white-space:nowrap">
						${Allies.rarityStars(r.allyRarity)}
						${r.allyName || ''}${fragments}
					</td>`;

			// level cell with XP progress bar
			let xpBar = '';
			if (r.allyLevel && r.xpNeeded && !r.isMax) {
				xpBar = `<div class="xp-bar" title="${r.xp || 0} / ${r.xpNeeded} XP"><span style="width:${Math.min(100, (r.xp || 0) * 100 / r.xpNeeded)}%"></span></div>`;
			}
			html += `<td data-number="${(r.allyLevel || 0)}">${r.allyLevel || ''}${xpBar}</td>`;

			if (view === 'compact') {
				const stats = statsById[roomId];

				if (stats) {
					const ready = stats.missing === 0;
					const effClass = roomId === ranking[0] ? 'eff-best' : (ranking.slice(1, 3).includes(roomId) ? 'eff-top' : '');

					html += `<td data-number="${stats.missing}" class="${ready ? 'lvlup-ready' : ''}">${ready ? i18n('Boxes.AllyList.LevelUpReady') : HTML.Format(stats.missing)}</td>
						<td data-number="${stats.gain}">+${stats.gain}</td>
						<td data-number="${isFinite(stats.efficiency) ? stats.efficiency.toFixed(3) : 99999}" class="${effClass}">${isFinite(stats.efficiency) ? stats.efficiency.toFixed(2) : '∞'}</td>`;
				}
				else {
					html += `<td data-number="-1">${r.isMax ? i18n('Boxes.AllyList.MaxLevel') : '-'}</td>
						<td data-number="-1">-</td>
						<td data-number="-1">-</td>`;
				}

				html += `<td class="ally-chips">${Allies.boosts(r.allyBoosts || [])}</td>`;
			}
			else {
				const allyBoosts = Allies.boostsArray(r.allyBoosts);

				for (let b of boostList) {
					let boost = allyBoosts.find(x => x.type === b.type && x.feature === b.feature);

					html += `<td data-number="${(boost ? boost.value : 0)}">${(boost ? boost.value : '-')}</td>`;
				}
			}

			html += `<td ${buildingId != 0 ? `class="fh-tooltip"
						data-id="${buildingId}"
						data-era="${Technologies.InnoEraNames[MainParser.CityMapData[buildingId].level]}"
						data-callback_tt="Tooltips.buildingTT"
						` : ``}
					>
						${r.buildingName || ''}
						${buildingId != 0 ? `<span class="show-entity" data-id="${buildingId}"><img class="game-cursor" src="${extUrl + 'css/images/hud/open-eye.png'}"></span>` : ''}
					</td>
				</tr>`;

			// gather sums of all boosts
			if (buildingId != 0 && r.allyBoosts != null) {
				for (let boost of r.allyBoosts) {
					let bBoost = Allies.buildingBoostSums.find(x => x.type === boost.type && x.targetedFeature === boost.targetedFeature);

					if (bBoost) {
						bBoost.value += boost.value;
					}
					else {
						Allies.buildingBoostSums.push(structuredClone(boost));
					}
				}
			}
		}

		Allies.buildingBoostSums.sort((a, b) => {
			if (a.type < b.type) return -1;
			if (a.type > b.type) return 1;
			return 0;
		});
		Allies.buildingBoostSums.sort((a, b) => {
			if (a.targetedFeature < b.targetedFeature) return -1;
			if (a.targetedFeature > b.targetedFeature) return 1;
			return 0;
		});

		html += `</tbody><tfoot><tr><td colspan="${columnCount}" class="text-center dark-bg">
			${Allies.boosts(Allies.buildingBoostSums)}
			</td></tr></tfoot></table>`;

		$('#AllyListBody').html(html).promise().done(function () {
			$('#AllyListTable').tableSorter();
		});

		$('#AllyFilter').on('change', () => {
			Allies.filter.rarity = $('#AllyFilter option:selected').val();
			Allies.applyFilters();
		});

		$('#AllySearch').on('input', () => {
			Allies.filter.term = ($('#AllySearch').val() || '').toLowerCase();
			Allies.applyFilters();
		});

		$('#AllyViewToggle').on('click', () => {
			localStorage.setItem('AllyListView', view === 'compact' ? 'matrix' : 'compact');
			Allies.updateAllyList();
		});

		$('#AllyListBody .foe-table .show-entity').on('click', function () {
			Productions.ShowOnMap($(this).data('id'));
		});

		Allies.applyFilters();
	},


	/**
	 * Shows/hides the list rows according to the active rarity filter and search term.
	 */
	applyFilters: () => {
		const rarity = Allies.filter.rarity;
		const term = Allies.filter.term;

		$('.allyRoomRow').each((i, e) => {
			const matchesRarity = rarity === '' || $(e).hasClass('Rarity-' + rarity);
			const matchesTerm = term === '' || ('' + $(e).data('search')).includes(term);

			$(e).toggle(matchesRarity && matchesTerm);
		});
	},


	/**
	 * Renders the rarity of an ally as star icons.
	 *
	 * @param {string} r Rarity id (e.g. "common", "rare")
	 * @returns {string} HTML string with the rarity icons
	 */
	rarityStars: (r) => {
		if (!r || r === '') return '';

		let i = Object.keys(Allies.rarities).indexOf(r);

		if (i === -1) return `<img style="filter: drop-shadow(0px 2px 2px black)"  src="${srcLinks.get(`/shared/icons/when_motivated.png`, true)}">`;
		if (i === 0) return `<span style="font-size: large; color: transparent; text-shadow: 0px 0px 4px black;" >☆</span>`;

		let ret = '';
		let star = `<img style="margin-left:-3px"  src="${srcLinks.get(`/historical_allies/portraits/historical_allies_portrait_rarity_icon.png`, true)}">`;

		for (let j = 0; j < i; j++) {
			ret += star;
			star = `<img style="margin-left:-15px" src="${srcLinks.get(`/historical_allies/portraits/historical_allies_portrait_rarity_icon.png`, true)}">`;
		}

		return ret;
	},


	/**
	 * Renders a boost list as icon + value chips.
	 *
	 * @param {Object[]} boosts Boost objects with `type`, `value` and `targetedFeature`
	 * @returns {string} HTML string with one span per boost
	 */
	boosts: (boosts) => {
		const feature = {
			'all': '',
			'battleground': '_gbg',
			'guild_expedition': '_gex',
			'guild_raids': '_gr'
		};

		let ret = '';

		for (let b of boosts || []) {
			ret += `<span class="${b.targetedFeature}">${srcLinks.icons(b.type + feature[b.targetedFeature])} ${b.value + Boosts.percent(b.type)}</span>`;
		}

		return ret;
	},


	/**
	 * Normalizes a boost list: combined boost types (e.g. att/def) are split
	 * into their single types and duplicate entries are summed up.
	 *
	 * @param {Object[]} boosts Boost objects with `type`, `value` and `targetedFeature`
	 * @returns {Object[]} Flat list of `{feature, type, value}` objects
	 */
	boostsArray: (boosts) => {
		let ret = [];

		for (let b of boosts || []) {
			let combinedBoosts = Boosts.Mapper[b.type];
			let types = combinedBoosts || [b.type];

			for (let type of types) {
				let foundBoost = ret.find(x => x.feature === b.targetedFeature && x.type === type);

				if (foundBoost) {
					foundBoost.value += b.value;
				}
				else {
					ret.push({ feature: b.targetedFeature, value: b.value, type: type });
				}
			}
		}

		return ret;
	},


	/**
	 * Renders the settings panel of the ally overview box.
	 */
	ShowSettings: () => {
		let autoOpen = Settings.GetSetting('ShowAllyList');

		let h = [];
		h.push(`<p><label><input id="allyListAutoOpen" type="checkbox" ${(autoOpen === true) ? ' checked="checked"' : ''} />${i18n('Boxes.Settings.Autostart')}</label></p>`);
		h.push(`<p><button onclick="Allies.SaveSettings()" id="save-bghelper-settings" class="btn" style="width:100%">${i18n('Boxes.Settings.Save')}</button></p>`);

		$('#AllyListSettingsBox').html(h.join(''));
	},


	/**
	 * Persists the settings of the ally overview box and closes the panel.
	 */
	SaveSettings: () => {
		let value = false;

		if ($('#allyListAutoOpen').is(':checked')) {
			value = true;
		}

		localStorage.setItem('ShowAllyList', value);

		$(`#AllyListSettingsBox`).remove();
	},
};


// --- FoEproxy handlers ---------------------------------------------------------------

// static meta data (names, portraits, rarities, types)
FoEproxy.addMetaHandler('allies', (xhr) => {
	Allies.setMeta(JSON.parse(xhr.responseText));
});

FoEproxy.addMetaHandler('ally_rarities', (xhr) => {
	Allies.setRarities(JSON.parse(xhr.responseText));
});

FoEproxy.addMetaHandler('ally_types', (xhr) => {
	Allies.setTypes(JSON.parse(xhr.responseText));
});

// player data
FoEproxy.addHandler('AllyService', 'getAllies', (data, postData) => {
	Allies.getAllies(data.responseData);

	if (!Settings.GetSetting('ShowAllyList')) return;

	if (postData[0].requestMethod === 'getAllies') {
		Allies.showAllyList();
	}
});

FoEproxy.addHandler('AllyService', 'getAssignedAllies', (data) => {
	Allies.getAllies(data.responseData);
});

FoEproxy.addHandler('AllyService', 'updateAlly', (data) => {
	Allies.buildingBoostSums = [];
	Allies.updateAlly(data.responseData);
});

FoEproxy.addHandler('AllyService', 'addAlly', (data) => {
	Allies.addAlly(data.responseData);
});

// fragments of allies live in the inventory
FoEproxy.addFoeHelperHandler('InventoryUpdated', () => {
	Allies.updateAllyList();
});
