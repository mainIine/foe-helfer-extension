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
	// refresh the open box when the city changes (great building built or leveled);
	// a debounce collapses bundled message bursts
	let refreshTimer = null;
	FoEproxy.addFoeHelperHandler('CityMapUpdated', () => {
		clearTimeout(refreshTimer);
		refreshTimer = setTimeout(() => {
			if ($('#gbBonuses').length === 0) return;
			GBBonuses.RenderList();
		}, 250);
	});
}


/**
 * @typedef GBBonusCard
 * @property {string} metaId city entity id of the great building
 * @property {string} name display name
 * @property {number} eraId sort id of the era (-1 for AllAge buildings)
 * @property {string} eraName translated era name ('' for AllAge buildings)
 * @property {string} icon building screenshot url
 * @property {Object[]} tiers `bonuses` metadata: one entry per prestige tier with
 *                            its GreatBuildingBonus list and level breakpoints
 * @property {string} maxTier highest available prestige tier (copper/silver/gold)
 * @property {?number} level current level when built in the own city
 * @property {?number} maxLevel unlocked levels when built in the own city
 * @property {Object[]} currentBonuses live bonus values of the placed building
 */

/**
 * Bonus overview of all great buildings after the multi-tier rework: the level
 * breakpoint values of every bonus per prestige tier straight from the
 * `city_entities` metadata, combined with the own progress (current level,
 * unlocked levels and live bonus values) of the buildings in the own city.
 * @namespace
 */
let GBBonuses = {

	/** @type {string} current name filter */
	SearchText: '',

	/** @type {string} built filter: '' = all, 'built' or 'unbuilt' */
	BuiltFilter: '',

	/** @type {string} bonus type filter, '' = all */
	TypeFilter: '',

	/** @type {Object<string, boolean>} metaId => detail table visible */
	Expanded: {},

	/** @type {boolean} state of the expand/collapse all toggle */
	AllExpanded: false,

	// bonus types whose game icon file name differs from the type itself
	IconMap: {
		attack_boost: 'attacking_attack',
		attacker_defense_boost: 'attacking_defense',
		defender_attack_boost: 'defending_attack',
		defense_boost: 'defending_defense',
		military_boost: 'attacking_all',
		money: 'coins',
		money_boost: 'coins',
		supplies_boost: 'supplies',
		strategy_points: 'forgepoints',
		random_goods: 'goods',
		previous_era_goods: 'previous_era_good_production',
		clan_goods: 'guild_goods',
		happiness: 'happy',
		double_collection: 'double_collect',
		quest_boost: 'scroll',
		aid_boost: 'aid_blueprints',
	},

	// passive bonuses displayed as a percentage, everything else is an absolute amount
	PercentTypes: new Set([
		'attack_boost', 'attacker_defense_boost', 'defender_attack_boost', 'defense_boost',
		'military_boost', 'fierce_resistance', 'advanced_tactics', 'critical_hit_chance',
		'first_strike', 'double_collection', 'missile_launch', 'plunder_and_pillage',
		'plunder_goods', 'plunder_repel', 'spoils_of_war', 'helping_hands', 'algorithmic_core',
		'money_boost', 'supplies_boost', 'aid_boost', 'quest_boost', 'contribution_boost',
	]),


	/**
	 * Opens the box (or closes an already open one).
	 */
	init: () => {
		if ($('#gbBonuses').length !== 0) {
			HTML.CloseOpenBox('gbBonuses');
			return;
		}

		HTML.AddCssFile('gbbonus');

		HTML.Box({
			id: 'gbBonuses',
			title: i18n('Boxes.GBBonuses.Title'),
			auto_close: true,
			dragdrop: true,
			minimize: true,
			resize: true,
			popout: () => MainParser.PopOut('gbBonuses', 900, 560),
		});

		GBBonuses.BuildBox();
	},


	/**
	 * Creates the box skeleton: topbar with search, built state, bonus type and
	 * expand-all controls, the card list and a bottombar with the counter.
	 */
	BuildBox: () => {
		$('#gbBonusesBody').append(
			$('<div />').attr('id', 'gbBonusesTopbar').append(
				$('<input />').attr({
					id: 'gbBonusesSearch',
					class: 'game-cursor',
					type: 'text',
					placeholder: i18n('Boxes.General.FilterItems')
				}).on('input', () => {
					GBBonuses.SearchText = String($('#gbBonusesSearch').val());
					GBBonuses.RenderList();
				}),
				$('<select />').attr({id: 'gbBonusesBuilt', class: 'game-cursor'}).append(
					$('<option />').attr('value', '').text(i18n('Boxes.GBBonuses.BuiltAll')),
					$('<option />').attr('value', 'built').text(i18n('Boxes.GBBonuses.BuiltOnly')),
					$('<option />').attr('value', 'unbuilt').text(i18n('Boxes.GBBonuses.UnbuiltOnly'))
				).on('change', () => {
					GBBonuses.BuiltFilter = String($('#gbBonusesBuilt').val());
					GBBonuses.RenderList();
				}),
				$('<select />').attr({id: 'gbBonusesType', class: 'game-cursor'}).on('change', () => {
					GBBonuses.TypeFilter = String($('#gbBonusesType').val());
					GBBonuses.RenderList();
				}),
				$('<span />').attr({
					id: 'gbBonusesExpandAll',
					class: 'btn btn-slim',
					title: i18n('Boxes.GBBonuses.ExpandAll')
				}).text('▼').on('click', () => {
					GBBonuses.AllExpanded = !GBBonuses.AllExpanded;
					GBBonuses.Expanded = {};
					$('#gbBonusesExpandAll').text(GBBonuses.AllExpanded ? '▲' : '▼');
					GBBonuses.RenderList();
				})
			),
			$('<div />').attr('id', 'gbBonusesInner').on('click', '.gbb-header', (e) => {
				const metaId = $(e.currentTarget).closest('.gbb-card').data('meta_id');
				GBBonuses.Expanded[metaId] = !GBBonuses.IsExpanded(metaId);
				GBBonuses.RenderList();
			}),
			$('<div />').attr('id', 'gbBonusesBottombar')
		);

		GBBonuses.FillTypeSelect();
		GBBonuses.RenderList();
	},


	/**
	 * Collects every great building carrying the multi-tier `bonuses` metadata
	 * and merges the state of the buildings placed in the own city.
	 * @returns {GBBonusCard[]}
	 */
	CollectGBs: () => {
		const own = {};
		for (const entity of Object.values(MainParser.CityMapData || {})) {
			if (entity.type === 'greatbuilding') own[entity.cityentity_id] = entity;
		}

		const cards = [];
		for (const meta of Object.values(MainParser.CityEntities || {})) {
			if (meta.strategy_points_for_upgrade === undefined || !Array.isArray(meta.bonuses) || meta.bonuses.length === 0) continue;

			const placed = own[meta.id];
			const eraToken = meta.id.split('_')[1];
			const eraNum = (eraToken !== 'AllAge' ? Technologies.Eras?.[eraToken] : undefined);

			cards.push({
				metaId: meta.id,
				name: meta.name,
				eraId: Technologies.InnoEras[eraToken] ?? -1,
				eraName: (eraNum !== undefined ? i18n('Eras.' + eraNum) : ''),
				icon: srcLinks.get(`/city/buildings/${meta.asset_id.replace(/^(\D_)(.*?)/, '$1SS_$2')}.png`, true),
				tiers: meta.bonuses,
				maxTier: meta.maxTier?.value || 'copper',
				level: (placed ? placed.level : null),
				maxLevel: (placed ? placed.max_level : null),
				currentBonuses: (placed ? CityBuildings.getGBBonuses(placed) : []),
			});
		}

		return cards;
	},


	/**
	 * Fills the bonus type dropdown with every type occurring in the metadata,
	 * sorted by the translated name.
	 */
	FillTypeSelect: () => {
		const types = new Set();
		for (const card of GBBonuses.CollectGBs()) {
			for (const tier of card.tiers) {
				for (const bonus of tier.bonuses) types.add(bonus.type);
			}
		}

		const options = [...types]
			.map(type => ({type: type, name: GBBonuses.TypeName(type)}))
			.sort((a, b) => a.name.localeCompare(b.name));

		const select = $('#gbBonusesType').empty().append(
			$('<option />').attr('value', '').text(i18n('Boxes.GBBonuses.AllTypes'))
		);
		for (const option of options) {
			select.append($('<option />').attr('value', option.type).text(option.name));
		}
	},


	/**
	 * Checks whether the detail table of a card is currently visible.
	 * @param {string} metaId city entity id of the great building
	 * @returns {boolean}
	 */
	IsExpanded: (metaId) => {
		return GBBonuses.Expanded[metaId] ?? GBBonuses.AllExpanded;
	},


	/**
	 * Applies search and filters, sorts the cards (own buildings by level first,
	 * the rest by era and name) and renders the list and the counter.
	 */
	RenderList: () => {
		const all = GBBonuses.CollectGBs();

		if (all.length === 0) {
			$('#gbBonusesInner').html(`<div class="no-data"><em>${i18n('Boxes.GBBonuses.NoData')}</em></div>`);
			$('#gbBonusesBottombar').empty();
			return;
		}

		let cards = all;
		if (GBBonuses.SearchText !== '') {
			const search = GBBonuses.SearchText.toLowerCase();
			cards = cards.filter(card => card.name.toLowerCase().includes(search));
		}
		if (GBBonuses.BuiltFilter !== '') {
			cards = cards.filter(card => (GBBonuses.BuiltFilter === 'built') === (card.level !== null));
		}
		if (GBBonuses.TypeFilter !== '') {
			cards = cards.filter(card => card.tiers.some(tier => tier.bonuses.some(bonus => bonus.type === GBBonuses.TypeFilter)));
		}

		cards.sort((a, b) => {
			if ((a.level !== null) !== (b.level !== null)) return (a.level !== null ? -1 : 1);
			if (a.level !== null && b.level !== a.level) return b.level - a.level;
			if (a.eraId !== b.eraId) return a.eraId - b.eraId;
			return a.name.localeCompare(b.name);
		});

		$('#gbBonusesInner').html(cards.map(card => GBBonuses.BuildCard(card)).join(''));

		$('#gbBonusesBottombar').html(HTML.i18nReplacer(i18n('Boxes.GBBonuses.Count'), {
			count: cards.length,
			built: cards.filter(card => card.level !== null).length
		}));
	},


	/**
	 * Renders one great building as a card: clickable header with icon, name,
	 * era, tier badge and own progress plus the collapsible breakpoint table.
	 * @param {GBBonusCard} card
	 * @returns {string} HTML
	 */
	BuildCard: (card) => {
		const expanded = GBBonuses.IsExpanded(card.metaId);
		const h = [];

		h.push(`<div class="gbb-card${expanded ? ' open' : ''}" data-meta_id="${card.metaId}">`);
		h.push('<div class="gbb-header game-cursor">');
		h.push(`<span class="gbb-chevron">${expanded ? '▼' : '▶'}</span>`);
		h.push(`<img class="gbb-icon" src="${card.icon}" alt="">`);

		h.push('<div class="gbb-title">');
		h.push(`<span class="gbb-name">${HTML.escapeHtml(card.name)}</span>`);
		if (card.eraName !== '') h.push(`<span class="gbb-era">${card.eraName}</span>`);
		h.push('</div>');

		h.push(`<span class="gbb-tier">${GreatBuildings.TierBadge({value: GBBonuses.CurrentTier(card)})}</span>`);

		if (card.level !== null) {
			const percent = (card.maxLevel > 0 ? Math.min(100, 100 * card.level / card.maxLevel) : 0);
			h.push('<div class="gbb-progress">');
			h.push(`<span class="gbb-level">${i18n('General.Level')} ${card.level}</span>`);
			h.push(`<span class="gbb-unlocked">${HTML.i18nReplacer(i18n('Boxes.GBBonuses.Unlocked'), {max: HTML.Format(card.maxLevel)})}</span>`);
			h.push(`<span class="gbb-bar"><span style="width:${percent}%"></span></span>`);
			h.push('</div>');
		}
		else {
			h.push(`<div class="gbb-progress"><span class="gbb-notbuilt">${i18n('Boxes.GBBonuses.NotBuilt')}</span></div>`);
		}

		h.push('</div>');

		if (expanded) h.push(GBBonuses.BuildDetailTable(card));

		h.push('</div>');

		return h.join('');
	},


	/**
	 * Renders the breakpoint table of one great building: a row per bonus grouped
	 * by prestige tier, a column per level breakpoint and — for built buildings —
	 * the live values as last column. The breakpoint reached with the current
	 * level is highlighted.
	 * @param {GBBonusCard} card
	 * @returns {string} HTML
	 */
	BuildDetailTable: (card) => {
		// union of the level breakpoints over all tiers (differs between
		// gold buildings: 1/101/201/301/400 and copper only ones: 1/101/200)
		const breakpoints = [...new Set(
			card.tiers.flatMap(tier => tier.bonuses.flatMap(bonus => Object.keys(bonus.valuesMap).map(Number)))
		)].sort((a, b) => a - b);

		// highlight the highest breakpoint the building has already reached
		const reached = (card.level !== null ? Math.max(...breakpoints.filter(level => level <= card.level), 0) : null);

		const h = [];
		h.push('<table class="foe-table gbb-table"><thead><tr>');
		h.push(`<th colspan="2">${i18n('Boxes.GBBonuses.ColBonus')}</th>`);
		for (const level of breakpoints) {
			h.push(`<th class="text-center${level === reached ? ' current-col' : ''}">${HTML.i18nReplacer(i18n('Boxes.GBBonuses.ColLevel'), {lvl: level})}</th>`);
		}
		if (card.level !== null) h.push(`<th class="text-center gbb-current">${i18n('Boxes.GBBonuses.ColCurrent')}</th>`);
		h.push('</tr></thead><tbody>');

		for (const tier of card.tiers) {
			const tierName = tier.tier?.value || 'copper';
			let firstRow = true;

			for (const bonus of tier.bonuses) {
				h.push(`<tr class="tier-${tierName}">`);
				if (firstRow) {
					h.push(`<td class="gbb-tier-cell" rowspan="${tier.bonuses.length}">${GreatBuildings.TierBadge(tier.tier)}</td>`);
					firstRow = false;
				}
				h.push(`<td class="gbb-bonus-name">${GBBonuses.TypeIcon(bonus.type)}${GBBonuses.TypeName(bonus.type)}</td>`);

				for (const level of breakpoints) {
					const value = bonus.valuesMap[level]?.value;
					h.push(`<td class="text-center${level === reached ? ' current-col' : ''}">${GBBonuses.FormatValue(bonus, value)}</td>`);
				}

				if (card.level !== null) {
					const current = card.currentBonuses.find(entry => entry.type === bonus.type);
					h.push(`<td class="text-center gbb-current">${GBBonuses.FormatValue(bonus, current?.value)}</td>`);
				}
				h.push('</tr>');
			}
		}

		h.push('</tbody></table>');

		return h.join('');
	},


	/**
	 * Derives the current prestige tier of a card: the highest tier that already
	 * provides a non zero bonus at the current level (unbuilt buildings show the
	 * highest available tier).
	 * @param {GBBonusCard} card
	 * @returns {string} copper, silver or gold
	 */
	CurrentTier: (card) => {
		if (card.level === null) return card.maxTier;

		let current = 'copper';
		for (const tier of card.tiers) {
			const start = Math.min(...tier.bonuses.flatMap(bonus =>
				Object.keys(bonus.valuesMap).map(Number).filter(level => bonus.valuesMap[level].value > 0)
			), Infinity);
			if (start <= card.level) current = tier.tier?.value || current;
		}

		return current;
	},


	/**
	 * Translated display name of a bonus type, prettified type as fallback.
	 * @param {string} type e.g. 'fierce_resistance'
	 * @returns {string}
	 */
	TypeName: (type) => {
		const key = 'Boxes.GBBonuses.Type.' + type;
		const name = i18n(key);
		if (name !== key) return name;

		return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
	},


	/**
	 * Game icon of a bonus type as <img>, empty string when the asset is not
	 * part of the ForgeHX file index.
	 * @param {string} type e.g. 'fierce_resistance'
	 * @returns {string} HTML or empty string
	 */
	TypeIcon: (type) => {
		const file = GBBonuses.IconMap[type] || type;
		const link = srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_${file}.png`, true, true);

		if (link.includes('antiquedealer_flag') || link.includes('-undefined.')) return '';

		return `<img class="gbb-bonus-icon" src="${link}" alt="">`;
	},


	/**
	 * Formats a bonus value like the game does: productions as amount per day,
	 * passive boosts as percentage, remaining passives as plain amount.
	 * Missing or zero values become a dash.
	 * @param {Object} bonus GreatBuildingBonus metadata entry
	 * @param {number|undefined} value
	 * @returns {string}
	 */
	FormatValue: (bonus, value) => {
		if (!value) return '–';

		if (bonus.bonusCategory?.value === 'productionBonus') {
			return `${HTML.Format(value)}<span class="per-day">${i18n('Boxes.GBBonuses.PerDay')}</span>`;
		}
		if (GBBonuses.PercentTypes.has(bonus.type)) {
			return `+${HTML.Format(value)}%`;
		}

		return HTML.Format(value);
	},
};
