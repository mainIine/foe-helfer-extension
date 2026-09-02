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

/**
 * @typedef CitySearchGroup
 * @property {string} name display name of the building
 * @property {(number|string)[]} ids entity ids of all instances in the city
 */

/**
 * @typedef CitySearchSize
 * @property {number} area footprint in tiles (width × length)
 * @property {(number|string)[]} ids entity ids of all buildings with that footprint
 */

/**
 * Finds buildings of the own city by name or by footprint size and marks
 * every match with the golden BuildingMarker arrows. While typing, an
 * autocomplete list offers only names that actually exist in the city, so a
 * single letter never floods the map with markers — picking a suggestion
 * marks exactly that building type. The size dropdown lists only footprints
 * present in the city; both search modes are exclusive.
 * @namespace
 */
let CitySearch = {

	/** @type {CitySearchGroup[]} distinct building names of the city, sorted */
	Index: [],

	/** @type {CitySearchSize[]} distinct footprints of the city, ascending */
	Sizes: [],

	/** @type {CitySearchGroup[]} suggestions currently shown below the input */
	Current: [],

	/** @type {number} index of the keyboard-highlighted suggestion (-1 = none) */
	Highlight: -1,

	/**
	 * Entity types without a position on the city grid (e.g. the space
	 * carrier, antiques dealer, outpost ship, settlement hubs) or that are
	 * not buildings at all (impediments). They cannot be marked, so they
	 * are left out of both indexes.
	 * @type {string[]}
	 */
	SkipTypes: ['off_grid', 'outpost_ship', 'hub_main', 'hub_part', 'friends_tavern', 'impediment'],


	/**
	 * Menu button: opens the box (or closes an already open one).
	 */
	init: () => {
		if ($('#citysearch').length !== 0) {
			HTML.CloseOpenBox('citysearch');
			return;
		}

		CitySearch.OpenBox();
	},


	/**
	 * Creates the box with the search bar.
	 */
	OpenBox: () => {
		HTML.AddCssFile('citysearch');

		HTML.Box({
			id: 'citysearch',
			title: i18n('Boxes.CitySearch.Title'),
			auto_close: true,
			dragdrop: true
		});

		CitySearch.BuildIndex();
		CitySearch.BuildBox();
	},


	/**
	 * Collects the distinct building names and footprints of the city with
	 * the entity ids of all their instances. Rebuilt on every open and
	 * search, so moved, sold or freshly built buildings are always up to date.
	 */
	BuildIndex: () => {
		const byName = new Map(),
			bySize = new Map();

		for (const entity of Object.values(MainParser.CityMapData || {})) {
			const meta = MainParser.CityEntities ? MainParser.CityEntities[entity.cityentity_id] : null;

			if (!meta || !meta.name || CitySearch.SkipTypes.includes(meta.type)) continue;

			const key = meta.name.toLowerCase();
			const group = byName.get(key) || {name: meta.name, ids: []};

			group.ids.push(entity.id);
			byName.set(key, group);

			const area = CityMap.GetBuildingSize(entity).building_area;

			if (area > 0) {
				const size = bySize.get(area) || {area, ids: []};

				size.ids.push(entity.id);
				bySize.set(area, size);
			}
		}

		CitySearch.Index = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
		CitySearch.Sizes = [...bySize.values()].sort((a, b) => a.area - b.area);
	},


	/**
	 * Creates the box content and wires input, keyboard and click handlers.
	 */
	BuildBox: () => {
		$('#citysearchBody').append(
			$('<div />').attr('id', 'citysearchBar').append(
				$('<input />').attr({
					id: 'citysearchInput',
					type: 'text',
					placeholder: i18n('Boxes.CitySearch.Placeholder'),
					autocomplete: 'off',
					spellcheck: 'false'
				})
					.on('input', () => CitySearch.UpdateSuggestions())
					.on('keydown', (e) => CitySearch.HandleKey(e)),
				$('<select />').attr({id: 'citysearchSize', class: 'game-cursor fh-tooltip', title: HTML.i18nTooltip(i18n('Boxes.CitySearch.SizeTT'))})
					.on('change', (e) => CitySearch.SearchSize(Number($(e.currentTarget).val()))),
				$('<button />').attr({id: 'citysearchGo', class: 'btn game-cursor', title: i18n('Boxes.CitySearch.Title')})
					.append($('<img />').attr({src: `${extUrl}js/web/citysearch/images/citysearch.png`, alt: ''}))
					.on('click', () => CitySearch.Search($('#citysearchInput').val()))
			),
			$('<div />').attr('id', 'citysearchSuggestions')
				.on('click', '.citysearch-suggestion', (e) => {
					CitySearch.SelectSuggestion(Number($(e.currentTarget).data('idx')));
				}),
			$('<div />').attr('id', 'citysearchResult')
		);

		CitySearch.RenderSizes();
		$('#citysearchInput').trigger('focus');
	},


	/**
	 * Fills the size dropdown with the footprints present in the city and
	 * keeps the current selection if it still exists.
	 */
	RenderSizes: () => {
		const $select = $('#citysearchSize'),
			selected = String($select.val() || '');
		const options = CitySearch.Sizes.map(size => `<option value="${size.area}">${size.area}</option>`);

		$select.html(`<option value="">${i18n('Boxes.CitySearch.Size')}</option>${options.join('')}`).val(selected);

		if ($select.val() === null) $select.val('');
	},


	/**
	 * Keyboard handling of the input: arrows move the highlight through the
	 * suggestions, Enter picks the highlighted one (or searches the raw
	 * text), Escape closes the suggestion list.
	 * @param {JQuery.KeyDownEvent} e keydown event of the input
	 */
	HandleKey: (e) => {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();

			if (CitySearch.Current.length === 0) return;

			const step = (e.key === 'ArrowDown') ? 1 : -1;
			CitySearch.Highlight = (CitySearch.Highlight + step + CitySearch.Current.length) % CitySearch.Current.length;
			CitySearch.RenderSuggestions();
		}
		else if (e.key === 'Enter') {
			e.preventDefault();

			if (CitySearch.Highlight >= 0) {
				CitySearch.SelectSuggestion(CitySearch.Highlight);
			}
			else {
				CitySearch.Search($('#citysearchInput').val());
			}
		}
		else if (e.key === 'Escape') {
			CitySearch.Current = [];
			CitySearch.Highlight = -1;
			CitySearch.RenderSuggestions();
		}
	},


	/**
	 * Recomputes the suggestion list for the current input value: names
	 * starting with the query first, then names merely containing it.
	 */
	UpdateSuggestions: () => {
		const query = String($('#citysearchInput').val() || '').trim().toLowerCase();

		$('#citysearchSize').val('');

		if (query === '') {
			CitySearch.Current = [];
		}
		else {
			const starts = [],
				contains = [];

			for (const group of CitySearch.Index) {
				const name = group.name.toLowerCase();

				if (name.startsWith(query)) starts.push(group);
				else if (name.includes(query)) contains.push(group);
			}

			CitySearch.Current = [...starts, ...contains].slice(0, 12);
		}

		CitySearch.Highlight = -1;
		$('#citysearchResult').empty();
		CitySearch.RenderSuggestions();
	},


	/**
	 * Renders the suggestion list (name plus instance count per entry).
	 */
	RenderSuggestions: () => {
		const rows = CitySearch.Current.map((group, idx) =>
			`<div class="citysearch-suggestion game-cursor${idx === CitySearch.Highlight ? ' is-highlighted' : ''}" data-idx="${idx}">
				<span>${HTML.escapeHtml(group.name)}</span>
				<em>${group.ids.length}×</em>
			</div>`
		);

		$('#citysearchSuggestions').html(rows.join(''));
	},


	/**
	 * Picks one suggestion: fills the input with the full name and marks
	 * exactly the instances of that building.
	 * @param {number} idx index into the current suggestion list
	 */
	SelectSuggestion: (idx) => {
		const group = CitySearch.Current[idx];

		if (!group) return;

		$('#citysearchInput').val(group.name);
		CitySearch.Current = [];
		CitySearch.Highlight = -1;
		CitySearch.RenderSuggestions();
		CitySearch.Mark(group.ids);
	},


	/**
	 * Free text search via Enter or the magnifier button: an exact name
	 * match marks only that building type, otherwise every building whose
	 * name contains the query is marked. An empty name repeats the size
	 * search of the dropdown instead.
	 * @param {string} term raw input value
	 */
	Search: (term) => {
		const query = String(term || '').trim().toLowerCase();

		if (query === '') {
			CitySearch.SearchSize(Number($('#citysearchSize').val()));
			return;
		}

		$('#citysearchSize').val('');
		CitySearch.BuildIndex();
		CitySearch.RenderSizes();

		const exact = CitySearch.Index.find(group => group.name.toLowerCase() === query);
		const groups = exact ? [exact] : CitySearch.Index.filter(group => group.name.toLowerCase().includes(query));

		CitySearch.Current = [];
		CitySearch.Highlight = -1;
		CitySearch.RenderSuggestions();
		CitySearch.Mark(groups.flatMap(group => group.ids));
	},


	/**
	 * Size search via the dropdown: marks every building whose footprint
	 * (width × length) equals the chosen area. Exclusive to the name search,
	 * so the input and its suggestions are cleared.
	 * @param {number} area footprint in tiles, 0 or NaN clears the result
	 */
	SearchSize: (area) => {
		$('#citysearchInput').val('');
		CitySearch.Current = [];
		CitySearch.Highlight = -1;
		CitySearch.RenderSuggestions();

		if (!(area > 0)) {
			$('#citysearchResult').empty();
			return;
		}

		CitySearch.BuildIndex();
		CitySearch.RenderSizes();

		const size = CitySearch.Sizes.find(entry => entry.area === area);

		CitySearch.Mark(size ? size.ids : []);
	},


	/**
	 * Marks the given entities with BuildingMarker arrows and reports the
	 * outcome below the search bar.
	 * @param {(number|string)[]} ids entity ids to mark
	 */
	Mark: (ids) => {
		if (ids.length === 0) {
			$('#citysearchResult').html(`<span class="citysearch-nomatch">${i18n('Boxes.CitySearch.NoMatch')}</span>`);
			return;
		}

		BuildingMarker.show(ids).then((shown) => {
			$('#citysearchResult').html(shown
				? i18n('Boxes.CitySearch.Marked').replace('__count__', String(ids.length))
				: `<span class="citysearch-nomatch">${i18n('Boxes.CitySearch.NotSupported')}</span>`
			);
		});
	}
};
