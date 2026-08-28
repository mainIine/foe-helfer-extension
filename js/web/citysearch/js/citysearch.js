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
 * Finds buildings of the own city by name and marks every match with the
 * golden BuildingMarker arrows. While typing, an autocomplete list offers
 * only names that actually exist in the city, so a single letter never
 * floods the map with markers — picking a suggestion marks exactly that
 * building type.
 * @namespace
 */
let CitySearch = {

	/** @type {CitySearchGroup[]} distinct building names of the city, sorted */
	Index: [],

	/** @type {CitySearchGroup[]} suggestions currently shown below the input */
	Current: [],

	/** @type {number} index of the keyboard-highlighted suggestion (-1 = none) */
	Highlight: -1,


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
	 * Collects the distinct building names of the city with the entity ids
	 * of all their instances. Rebuilt on every open and search, so moved,
	 * sold or freshly built buildings are always up to date.
	 */
	BuildIndex: () => {
		const byName = new Map();

		for (const entity of Object.values(MainParser.CityMapData || {})) {
			const meta = MainParser.CityEntities ? MainParser.CityEntities[entity.cityentity_id] : null;

			if (!meta || !meta.name) continue;

			const key = meta.name.toLowerCase();
			const group = byName.get(key) || {name: meta.name, ids: []};

			group.ids.push(entity.id);
			byName.set(key, group);
		}

		CitySearch.Index = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
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

		$('#citysearchInput').trigger('focus');
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
	 * name contains the query is marked.
	 * @param {string} term raw input value
	 */
	Search: (term) => {
		const query = String(term || '').trim().toLowerCase();

		if (query === '') return;

		CitySearch.BuildIndex();

		const exact = CitySearch.Index.find(group => group.name.toLowerCase() === query);
		const groups = exact ? [exact] : CitySearch.Index.filter(group => group.name.toLowerCase().includes(query));

		CitySearch.Current = [];
		CitySearch.Highlight = -1;
		CitySearch.RenderSuggestions();
		CitySearch.Mark(groups.flatMap(group => group.ids));
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
