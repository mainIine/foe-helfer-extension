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


let CityMap = {

	CityData: null,
	EfficiencyFactor: 0,
	map: {
		scale: 100,
		outpostScale: 100,
		view: 'skew',
		gridSize: 1,
	},
	Main: {
		unlockedAreas: null,
		blockedAreas: null,
	},
	OtherPlayer: {
		mapData: {},
		unlockedAreas: null,
		eraName: null,
		name: ''
	},
	CulturalOutpost: {
		data: {},
		areas: []
	},
	EraOutpost: {
		data: null,
		areas: [],
	},
	QI: {
		data: null,
		stats: null,
		areas: [],
		level: 0
	},
	metrics: {
		buildings: 0,
		qiBuildings: 0,
		qiArea: 0,
		gbgBuildings: 0,
		gbgArea: 0,
		geBuildings: 0,
		geArea: 0,
		roadlessBuildings: 0,
		roadlessBuildingsArea: 0,
		connectedBuildings: 0,
		connectedBuildingsArea: 0,
		limitedBuildings: 0,
		limitedBuildingsArea: 0,
		roads: 0,
		roadsArea: 0,
		area: 0,
		areaOccupied: 0,
		areaAvailable: 0,
		buildingAreas: [],
		buildingTypes: []
	},

	/** Map types that use the outpost rendering (own scale, offset grid). */
	OutpostMaps: ['cultural_outpost', 'era_outpost', 'guild_raids'],


	/**
	 * Resolves with a map of building ids to their ascended upgrade building ids
	 * as soon as `MainParser.BuildingUpgrades` is available.
	 *
	 * @type {Promise<Object<string, string>>}
	 */
	AscendingBuildings: new Promise((resolve) => {
		const waitForUpgrades = () => {
			if (!MainParser.BuildingUpgrades) {
				setTimeout(waitForUpgrades, 500);
				return;
			}

			const pairs = Object.values(MainParser.BuildingUpgrades)
				.filter(upgrade => upgrade.upgradeItem.id.includes('ascended'))
				.flatMap(upgrade => upgrade.upgradeSteps[0].buildingIds.map((id, i) => ({ [id]: upgrade.upgradeSteps[1].buildingIds[i] })));

			resolve(Object.assign({}, ...pairs));
		};

		waitForUpgrades();
	}),


	/**
	 * Checks whether the currently active map is an outpost style map.
	 *
	 * @returns {boolean}
	 */
	isOutpostMap: () => CityMap.OutpostMaps.includes(ActiveMap),


	/**
	 * Initializes the City Map based on the selected map type and user preferences.
	 * Restores scale and view settings, resolves the map data of the active map
	 * and creates or toggles the City Map box.
	 *
	 * @param {Object} [event] - Optional event object. Without it an already open box is closed (toggle behaviour).
	 */
	init: (event) => {
		let Title = i18n('Boxes.CityMap.YourCity');

		// grid sizing and view
		const scale = localStorage.getItem('CityMapScale'),
			outpostScale = localStorage.getItem('OutpostMapScale'),
			view = localStorage.getItem('CityMapView');

		if (scale !== null) CityMap.map.scale = parseInt(scale);
		if (view !== null) CityMap.map.view = view;
		if (outpostScale !== null) CityMap.map.outpostScale = parseInt(outpostScale);

		let Data = MainParser.CityMapData;
		if (ActiveMap === 'cultural_outpost') {
			Data = CityMap.CulturalOutpost.data;
		}
		else if (ActiveMap === 'era_outpost') {
			Data = CityMap.EraOutpost.data;
		}
		else if (ActiveMap === 'guild_raids') {
			Data = CityMap.QI.data;
			Title = i18n('Boxes.General.Quantum_Incursion.short') + ' ' + i18n('Boxes.General.Level') + ' ' + CityMap.QI.level;
		}
		else if (ActiveMap === 'OtherPlayer') {
			Data = CityMap.OtherPlayer.mapData;
			Title = CityMap.OtherPlayer.name;
		}

		if ($('#citymap-main').length < 1) {
			HTML.AddCssFile('citymap');

			HTML.Box({
				id: 'citymap-main',
				title: Title,
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize: true,
				popout: 'MainParser.PopOut(\'citymap-main\', 1100, 580)',
				ask: i18n('Boxes.CityMap.HelpLink'),
			});

			setTimeout(() => {
				CityMap.PrepareBox(Title, 'citymap-main');
			}, 100);
		}
		else if (!event) {
			HTML.CloseOpenBox('citymap-main');
			return;
		}

		setTimeout(() => {
			CityMap.SetMapBuildings(Data);
		}, 100);
	},


	/**
	 * Prepares the main UI box and sidebar for the City Map: builds the map container,
	 * the view/scale menu, filter and action buttons and the sidebar content of the
	 * active map (main city, outposts, QI or another player).
	 *
	 * @param {string} Title - The title of the map box.
	 * @param {string} [elemId="citymap-main"] - The id of the box element.
	 */
	PrepareBox: (Title, elemId = 'citymap-main') => {
		const oB = $('#' + elemId + 'Body'),
			wrapper = $('<div id="citymap-wrapper" />'),
			menu = $('<div id="city-map-menu" />');

		const scaleUnit = (CityMap.isOutpostMap() ? CityMap.map.outpostScale : CityMap.map.scale);

		wrapper
			.append($('<div id="map-container" />')
				.append($(`<div id="grid-outer" data-unit="${scaleUnit}" data-view="${CityMap.map.view}" />`)
					.append($('<div id="map-grid" />'))
					.append($('<div id="map-buildings" />'))))
			.append($('<div id="sidebar" />')
				.append($('<div id="map-filters" />')));

		$('#' + elemId + 'Header > .title').attr('id', 'map' + CityMap.hashCode(Title));

		if (CityMap.isOutpostMap()) {
			oB.addClass('outpost').addClass(ActiveMap);
		}

		// perspective switch
		const dropView = $('<select id="menu-view" class="game-cursor" />')
			.append($('<option class="game-cursor" data-view="normal" />').prop('selected', CityMap.map.view === 'normal').text(i18n('Boxes.CityMap.NormalPerspecitve')))
			.append($('<option class="game-cursor" data-view="skew" />').prop('selected', CityMap.map.view === 'skew').text(i18n('Boxes.CityMap.CavalierPerspecitve')));

		$('#' + elemId).on('change', '#menu-view', function () {
			const view = $('#menu-view option:selected').data('view');
			$('#grid-outer').attr('data-view', view);
			localStorage.setItem('CityMapView', view);
		});

		// scale switch
		const scaleView = $('<select id="scale-view" class="game-cursor" />');
		[60, 80, 100, 120, 140, 160, 180].forEach(scaleOption => {
			scaleView.append($(`<option class="game-cursor" data-scale="${scaleOption}" />`).prop('selected', scaleUnit === scaleOption).text(scaleOption + '%'));
		});

		menu.append(dropView).append(scaleView);

		$('#' + elemId).on('change', '#scale-view', function () {
			const unit = parseInt($('#scale-view option:selected').data('scale'));
			$('#grid-outer').attr('data-unit', unit);

			if (CityMap.isOutpostMap()) {
				localStorage.setItem('OutpostMapScale', unit);
				CityMap.map.outpostScale = unit;
			}
			else {
				localStorage.setItem('CityMapScale', unit);
				CityMap.map.scale = unit;
			}

			$('#map-container').scrollTo($('.highlighted'), 800, { offset: { left: -280, top: -280 }, easing: 'swing' });
		});

		// Buttons for filter, meta info and submit box
		// The box renders the own main city on every map without a dedicated view
		// (e.g. gg/gex), so gate on the rendered city instead of the current map
		if (!CityMap.isOutpostMap() && ActiveMap !== 'OtherPlayer') {
			menu.append($('<input type="text" id="BuildingsFilter" placeholder="' + i18n('Boxes.CityMap.FilterBuildings') + '" oninput="CityMap.filterBuildings(this.value)">'));

			const btnGroup = $('<div class="btn-group" />')
				.append($('<button class="btn ml-auto" />').attr({ id: 'copy-meta-infos', onclick: 'CityMap.copyMetaInfos()' }).text(i18n('Boxes.CityMap.CopyMetaInfos')))
				.append($('<button class="btn ml-auto" />').attr({ id: 'download-meta-infos', onclick: 'CityMap.downloadMetaInfos()' }).text(i18n('Boxes.CityMap.DownloadMetaInfos')))
				.append($('<button class="btn ml-auto" />').attr({ id: 'show-submit-box', onclick: 'CityMap.showSubmitBox()' }).text(i18n('Boxes.CityMap.ShowSubmitBox')));

			// City builder only works with the main city, not while visiting gg/gex
			if (ActiveMap === 'main') {
				btnGroup.append($('<button class="btn ml-auto" />').attr({ id: 'open-city-builder', onclick: 'CityBuilder.init()' }).text(i18n('Boxes.CityBuilder.Title')));
			}

			menu.append(btnGroup);
		}
		oB.append(wrapper);

		if (ActiveMap === 'guild_raids' && CityMap.QI.data) {
			menu.append($('<div class="btn-group" />')
				.append($('<button class="btn ml-auto" id="copy-meta-infos" onclick="CityMap.copyMetaInfos()" style="margin-left:auto" />').text(i18n('Boxes.CityMap.CopyMetaInfos')))
				.append($('<button class="btn ml-auto" id="download-meta-infos" onclick="CityMap.downloadMetaInfos()" />').text(i18n('Boxes.CityMap.DownloadMetaInfos')))
			);
			$('#sidebar').append(CityMap.showQIBuildingList());
		}

		wrapper.append(menu);

		if (ActiveMap === 'cultural_outpost' || ActiveMap === 'era_outpost') {
			$('#sidebar').append(CityMap.showOutpostBuildings());
		}

		if (ActiveMap === 'cultural_outpost') {
			$('#citymap-wrapper').append('<span class="btn btn-mid openOverview" onClick="Outposts.BuildInfoBox()">' + i18n('Menu.OutP.Title') + '</span>');
		}

		if (ActiveMap === 'OtherPlayer') {
			const townhall = Object.values(CityMap.OtherPlayer.mapData).find(x => x.type === 'main_building');
			CityMap.OtherPlayer.eraName = townhall.cityentity_id?.split('_')[1] || townhall.entityId?.split('_')[1];

			$('#sidebar').append($('<a id="openEfficiencyRating" class="btn" onclick="Productions.ShowRating(true,\'' + CityMap.OtherPlayer.eraName + '\')">' + i18n('Menu.ProductionsRating.Title') + '</a>'));
		}
	},


	/**
	 * Builds and renders the grid of unlocked areas for the active map.
	 * Each area is positioned by its coordinates and the map specific offset;
	 * the initial 16x16 area gets a dedicated class.
	 */
	BuildGrid: () => {
		let unlockedAreas = CityMap.Main.unlockedAreas;
		let xOffset = 0,
			yOffset = 0;

		if (ActiveMap === 'OtherPlayer') {
			unlockedAreas = CityMap.OtherPlayer.unlockedAreas;
		}
		else if (ActiveMap === 'cultural_outpost') {
			unlockedAreas = CityMap.CulturalOutpost.areas;
			xOffset = 500;
		}
		else if (ActiveMap === 'era_outpost') {
			unlockedAreas = CityMap.EraOutpost.areas;
			yOffset = 500;
		}
		else if (ActiveMap === 'guild_raids') {
			unlockedAreas = CityMap.QI.areas;
			xOffset = 500;
			yOffset = 500;
		}

		for (const area of (unlockedAreas || [])) {
			const x = (area.x - xOffset) * CityMap.map.gridSize,
				y = (area.y - yOffset) * CityMap.map.gridSize;

			const gridCell = $('<span />')
				.addClass('map-bg')
				.css({
					left: x + 'em',
					top: y + 'em',
				});

			// initial grid
			if (area.width === 16 && area.length === 16) {
				gridCell.addClass('startmap');
			}

			$('#map-grid').append(gridCell);
		}
	},


	/**
	 * Renders the buildings of the active outpost map (cultural, era or QI).
	 * Rebuilds the grid, positions all buildings with map specific offsets and
	 * attaches tooltips. For guild raids, buildings whose production finishes
	 * within 3 hours are highlighted.
	 */
	SetOutpostBuildings: () => {
		const gridOuter = $('#grid-outer');
		gridOuter.find('.map-bg').remove();
		gridOuter.find('.entity').remove();

		CityMap.BuildGrid();

		let buildings = CityMap.CulturalOutpost.data;
		let xOffset = 0,
			yOffset = 0;

		if (ActiveMap === 'era_outpost') {
			buildings = CityMap.EraOutpost.data;
			yOffset = 500;
		}
		else if (ActiveMap === 'cultural_outpost') {
			xOffset = 500;
		}
		else if (ActiveMap === 'guild_raids') {
			buildings = CityMap.QI.data;
			xOffset = 500;
			yOffset = 500;
		}

		const thresholdTime = 10800; // 3 hours

		for (const CityMapEntity of Object.values(buildings)) {
			const CityEntity = MainParser.CityEntities[CityMapEntity.cityentity_id],
				BuildingSize = CityMap.GetBuildingSize(CityMapEntity),
				x = ((CityMapEntity.x || 0) - xOffset) * CityMap.map.gridSize,
				y = ((CityMapEntity.y || 0) - yOffset) * CityMap.map.gridSize,
				xsize = parseInt(BuildingSize.xsize) * CityMap.map.gridSize,
				ysize = parseInt(BuildingSize.ysize) * CityMap.map.gridSize;

			const hours = (CityMapEntity.state?.next_state_transition_in ? Math.round(CityMapEntity.state.next_state_transition_in / 60 / 60 * 100) : 0);

			let collectSoon = '';
			if (ActiveMap === 'guild_raids' && CityMapEntity.state?.__class__ === 'ProducingState' && CityMapEntity.state.next_state_transition_in < thresholdTime) {
				collectSoon = ' collectSoon collect' + (hours < 100 ? '' : hours);
			}
			const collectionString = HTML.i18nReplacer(i18n('Boxes.CityMap.CollectSoon'), { hours: hours / 100 });

			const buildingEl = $('<span />')
				.addClass('entity ' + CityEntity.type + collectSoon)
				.css({
					width: xsize + 'em',
					height: ysize + 'em',
					left: x + 'em',
					top: y + 'em'
				})
				.attr('data-original-title', CityEntity.name + ', ' + BuildingSize.ysize + 'x' + BuildingSize.xsize +
					(collectSoon !== '' ? '<br>' + collectionString : ''))
				.attr('data-entityid', CityMapEntity.id);

			$('#map-buildings').append(buildingEl);
		}

		// .add() also covers the box while it is popped out as a separate window
		$('[data-original-title]').add($('#citymap-main [data-original-title]')).tooltip({
			container: 'body',
			html: true,
		});

		gridOuter.draggable();
	},


	/**
	 * Renders the Quantum Incursion stats summary (area count, population,
	 * euphoria boost, resources and boosts) based on `CityMap.QI.stats`.
	 *
	 * @returns {string|undefined} HTML string with the QI statistics, or undefined if no QI data is available.
	 */
	showQIStats: () => {
		if (!CityMap.QI.data) return;

		const stats = CityMap.QI.stats;
		const euphoria = Math.round(stats.euphoriaBoost * 100);

		let out = '<div class="metaSums">';
		out += '<p class="text-center"><i>' + i18n('Boxes.CityMap.QIHint') + '</i></p>';
		out += '<div class="flex between" style="margin-bottom: 10px;">';
		out += '<span><img src="' + srcLinks.get('/shared/gui/constructionmenu/icon_expansion.png', true) + '" />' + CityMap.QI.areas.length + '</span>';
		out += '<div class="popStats"><span class="prod population">' + stats.availablePopulation + '/' + stats.totalPopulation + '</span> ';
		out += '<span class="prod happiness euphoria' + euphoria + '" title="' + stats.euphoria + '">' + euphoria + '%</span></div>';
		out += '</div>';

		out += '<div class="productions">';
		for (const [prod, value] of Object.entries(stats.resources)) {
			out += '<span class="' + prod + '">' + srcLinks.icons(prod) + HTML.Format(value) + '</span> ';
		}

		out += '</div><div class="boosts">';
		for (const [boost, value] of Object.entries(stats.boosts)) {
			const unit = (boost.includes('action_points') ? '' : '%');
			out += '<span class="' + boost + '">' + srcLinks.icons(boost) + value + unit + '</span> ';
		}

		out += '</div></div>';
		return out;
	},


	/**
	 * Counts how often each entity id occurs in a list of placed buildings.
	 *
	 * @param {Object[]} buildings - Placed building entities with a `cityentity_id`.
	 * @returns {Object<string, number>} Map of cityentity_id to placement count.
	 */
	countEntityOccurrences: (buildings) => {
		const counts = {};
		for (const building of buildings) {
			counts[building.cityentity_id] = (counts[building.cityentity_id] || 0) + 1;
		}
		return counts;
	},


	/**
	 * Comparator for sorting processed buildings by their entity id.
	 *
	 * @param {Object} a
	 * @param {Object} b
	 * @returns {number}
	 */
	compareByEntityId: (a, b) => {
		if (a.entityId < b.entityId) return -1;
		if (a.entityId > b.entityId) return 1;
		return 0;
	},


	/**
	 * Builds the sidebar table of all unique QI buildings including population,
	 * euphoria, boosts and boosted production values. Also (re)calculates
	 * `CityMap.QI.stats` (resources, boosts, euphoria and population sums).
	 *
	 * @returns {string|undefined} HTML string with stats summary and building table, or undefined if no QI data is available.
	 */
	showQIBuildingList: () => {
		if (!CityMap.QI.data) return;

		const boosts = Boosts.Sums;
		const buildings = Object.values(CityMap.QI.data);

		CityMap.QI.stats = {
			resources: {
				guild_raids_chrono_alloy: 0,
				guild_raids_money: 0,
				guild_raids_supplies: 0,
			},
			boosts: {},
			euphoria: 0,
			euphoriaBoost: 1.5,
			totalPopulation: 0,
			availablePopulation: 0
		};

		let out = '<table class="foe-table allBuildings">';
		out += '<thead><tr><th colspan="2">' + i18n('Boxes.CityMap.Building') + '</th><th class="population textright"></th><th class="happiness textright"></th><th>' + i18n('Boxes.CityMap.Boosts') + '</th></tr></thead>';
		out += '<tbody>';

		const uniques = CityMap.countEntityOccurrences(buildings);
		const uniqueBuildings = [];
		for (const [id, count] of Object.entries(uniques)) {
			const building = CityMap.setQIBuilding(MainParser.CityEntities[id]);
			building.count = count;
			uniqueBuildings.push(building);

			CityMap.QI.stats.euphoria += building.euphoria * count || 0;
			CityMap.QI.stats.totalPopulation += (building.population >= 0 ? building.population * count : 0);
			CityMap.QI.stats.availablePopulation += building.population * count;
		}
		uniqueBuildings.sort(CityMap.compareByEntityId);

		const euphoriaFactor = CityMap.QI.stats.euphoria / CityMap.QI.stats.totalPopulation;
		let euphoriaBoost = 1.5;
		if (euphoriaFactor <= 0.2) euphoriaBoost = 0.2;
		else if (euphoriaFactor <= 0.6) euphoriaBoost = 0.6;
		else if (euphoriaFactor <= 0.8) euphoriaBoost = 0.8;
		else if (euphoriaFactor <= 1.2) euphoriaBoost = 1;
		else if (euphoriaFactor <= 1.4) euphoriaBoost = 1.1;
		else if (euphoriaFactor < 2.0) euphoriaBoost = 1.2;
		CityMap.QI.stats.euphoriaBoost = euphoriaBoost;

		for (const building of uniqueBuildings) {
			if (building.type === 'impediment' || building.type === 'street') continue;

			out += "<tr class='" + building.type + "'>" +
					"<td><div class='building' data-original-title='" + building.name + "'>" +
						"<img src='" + srcLinks.get('/city/buildings/' + building.entityId.replace(/^(\D_)(.*?)/, '$1SS_$2') + '.png', true) + "'>" +
					'</div></td>' +
					'<td>' + (building.count > 1 ? 'x' + building.count : '') + '</td>';
			out += '<td class="textright">' + building.population + '</td>';
			out += '<td class="textright">' + building.euphoria + '</td>';
			out += '<td>';

			if (building.production !== null) {
				if (building.type === 'goods' || building.type === 'military') {
					out += (building.type === 'goods' ? '+20 = ' : '+10 = ');
					out += (building.production.guild_raids_supplies ? '<span class="prod guild_raids_supplies">' + HTML.Format(building.production.guild_raids_supplies * -1.0) + '</span> ' : ' ');
					out += (building.production.guild_raids_money ? '<span class="prod guild_raids_money">' + HTML.Format(building.production.guild_raids_money * -1.0) + '</span> ' : '');
				}
				else {
					let buildingEuphoriaBoost = CityMap.QI.stats.euphoriaBoost;
					for (const [prod, value] of Object.entries(building.production)) {
						// add coin and supply boosts
						let boost = 0;
						if (prod.includes('suppl')) {
							boost += boosts.guild_raids_supplies_production || 0;
						}
						else if (prod.includes('money')) {
							boost += boosts.guild_raids_coins_production || 0;
						}

						// dont boost main building productions
						if (building.type === 'main_building') {
							buildingEuphoriaBoost = 1;
							boost = 0;
						}

						const boostedValue = Math.round(value * (buildingEuphoriaBoost + (boost / 100)));
						out += srcLinks.icons(prod) + HTML.Format(boostedValue) + ' ';
						CityMap.QI.stats.resources[prod] += boostedValue * building.count;
					}
				}
			}

			if (building.boosts !== null) {
				for (const boost of building.boosts) {
					const percentChar = (boost.type.includes('action_points') ? ' ' : '% ');
					out += srcLinks.icons(boost.type) + boost.value + percentChar;
					CityMap.QI.stats.boosts[boost.type] = (CityMap.QI.stats.boosts[boost.type] || 0) + boost.value * building.count;
				}
			}
			out += '</td></tr>';
		}
		out += '</tbody></table>';

		return CityMap.showQIStats() + out;
	},


	/**
	 * Extracts the display relevant data of a QI building from its meta data.
	 *
	 * @param {Object} data - The city entity meta data of the QI building.
	 * @returns {Object} Building info: name, boosts, euphoria, population, production, type, entityId and count.
	 */
	setQIBuilding: (data) => {
		let production = data.components?.AllAge?.production?.options;
		if (production !== undefined && production.length === 1) { // goods and units have multiple production options, rest has one
			production = data.components?.AllAge?.production?.options[0]?.products[0]?.playerResources?.resources;
		}
		else if (production !== undefined && production.length > 1) {
			production = data.components?.AllAge?.production?.options[3]?.products[0]?.requirements?.resources;
		}
		if (data.type === 'main_building') {
			production = data.available_products[0].product.resources;
		}

		const euphoria = data.components?.AllAge?.staticResources?.resources?.resources?.guild_raids_happiness;
		const boosts = data.components?.AllAge?.boosts?.boosts;
		const population = data.components?.AllAge?.staticResources?.resources?.resources.guild_raids_population;

		return {
			name: data.name,
			boosts: boosts || null,
			euphoria: euphoria || 0,
			population: population || 0,
			production: production || null,
			type: data.type,
			entityId: data.asset_id,
			count: 1,
		};
	},


	/**
	 * Extracts the display relevant data of an outpost building from its meta data.
	 * Handles the population resource naming of cultural settlements vs era
	 * settlements and picks the correct production source per building type.
	 *
	 * @param {Object} data - The city entity meta data of the outpost building.
	 * @returns {Object} Building info: name, population, production, diplomacy (cultural outposts only), type and entityId.
	 */
	setOutpostBuilding: (data) => {
		let production = data.components?.AllAge?.production?.options;
		if (production !== undefined && production.length === 1) { // goods and units have multiple production options, rest has one
			production = data.components?.AllAge?.production?.options[0]?.products[0]?.playerResources?.resources;
		}
		else if (production !== undefined && production.length > 1) {
			production = data.components?.AllAge?.production?.options[3]?.products[0]?.requirements?.resources;
		}
		if (data.type === 'main_building' || data.type === 'residential') {
			production = data.available_products[0]?.product?.resources;
		}

		// grab the name of the population from the building id
		/// cultural settlements: id parts are vikings, japanese, egyptians, aztecs, mughals, polynesia
		let populationName = data.id.split('_')[1].toLowerCase();
		/// era settlements
		if (ActiveMap === 'era_outpost') populationName = 'colonists';

		// for buildings adding pop
		const populationKey = Object.keys(data.staticResources?.resources).find(x => x.includes(populationName));
		let population = data.staticResources?.resources[populationKey];
		// for buildings requiring pop
		if (population === undefined) {
			population = data.requirements.cost?.resources[populationName] * -1;
		}
		const diplomacy = data.staticResources?.resources?.diplomacy || 0;

		return {
			name: data.name,
			population: population || 0,
			production: production || null,
			diplomacy: (ActiveMap === 'cultural_outpost' ? diplomacy : null),
			type: data.type,
			entityId: data.asset_id,
		};
	},


	/**
	 * Builds the sidebar table of all unique outpost buildings (cultural or era
	 * outpost) with image, count, population, diplomacy and production values,
	 * plus a summary of the population and diplomacy totals.
	 *
	 * @returns {string} HTML string with the summary and the building table.
	 */
	showOutpostBuildings: () => {
		const buildings = Object.values(ActiveMap === 'era_outpost' ? CityMap.EraOutpost.data : CityMap.CulturalOutpost.data);

		const uniques = CityMap.countEntityOccurrences(buildings);
		const uniqueBuildings = [];
		for (const [id, count] of Object.entries(uniques)) {
			const building = CityMap.setOutpostBuilding(MainParser.CityEntities[id]);
			building.count = count;
			uniqueBuildings.push(building);
		}
		uniqueBuildings.sort(CityMap.compareByEntityId);

		let out = '<table class="foe-table allBuildings">';
		out += `<thead><tr>
			<th colspan="2">${i18n('Boxes.CityMap.Building')}</th>
			<th class="population textright"></th>
			<th><span class="goods-sprite ${(ActiveMap !== 'era_outpost' ? 'diplomacy' : '')}"></span></th>
			<th>${i18n('Boxes.CityMap.Boosts')}</th></tr></thead>`;
		out += '<tbody>';

		const totals = {
			diplomacy: 0,
			population: 0,
		};
		for (const building of uniqueBuildings) {
			if (building.type === 'impediment' || building.type === 'street' || building.type === 'off_grid') continue;

			out += "<tr class='" + building.type + "'>" +
				"<td><div class='building' data-original-title='" + building.name + "'>" +
					"<img src='" + srcLinks.get('/city/buildings/' + building.entityId.replace(/^(\D_)(.*?)/, '$1SS_$2') + '.png', true) + "'>" +
				'</div></td>' +
				'<td>' + (building.count > 1 ? 'x' + building.count : '') + '</td>';
			out += '<td class="textright">' + building.population + '</td>';
			out += '<td class="textright">' + (building.diplomacy > 0 ? building.diplomacy : '') + '</td>';
			out += '<td>';
			if (building.production !== null) {
				for (const [prod, value] of Object.entries(building.production)) {
					out += srcLinks.icons(prod) + HTML.Format(Math.round(value)) + ' ';
				}
			}
			out += '</td></tr>';

			if (building.diplomacy > 0) {
				totals.diplomacy += building.diplomacy * building.count;
			}
			totals.population += building.population * building.count;
		}

		let meta = '';
		if (totals.diplomacy > 0) {
			meta = `<div class="metaSums p5 text-center">
						<i>${i18n('Boxes.CityMap.QIHint')}</i><br/>
						<span class="population"></span>${totals.population}
						<span class="goods-sprite diplomacy"></span>${totals.diplomacy}
					</div>`;
		}

		out += '</tbody></table>';
		return meta + out;
	},


	/**
	 * Renders all buildings of the main city (or another player's city) on the map.
	 * Clears the current map, rebuilds the grid, recalculates all metrics
	 * (building counts, areas, street efficiency), applies highlight classes
	 * (rating, era age, chains/sets, QI/GBG/GE origin) and attaches tooltips
	 * and click handlers.
	 *
	 * Outpost maps are delegated to `SetOutpostBuildings`.
	 *
	 * @param {Object|null} [Data=null] - Legacy parameter, the rendered data is resolved from the active map.
	 * @returns {Promise<void>}
	 */
	SetMapBuildings: async (Data = null) => {
		if (CityMap.isOutpostMap()) {
			CityMap.SetOutpostBuildings();
			return;
		}

		const gridOuter = $('#grid-outer');
		const ActiveId = gridOuter.find('.highlighted').data('entityid') || null;

		// clear the map completely before re-rendering
		gridOuter.find('.map-bg').remove();
		gridOuter.find('.entity').remove();

		CityMap.metrics = {
			buildings: 0,
			qiBuildings: 0,
			qiArea: 0,
			gbgBuildings: 0,
			gbgArea: 0,
			geBuildings: 0,
			geArea: 0,
			ascendableBuildings: 0,
			ascendableBuildingsArea: 0,
			decayedBuildings: 0,
			decayedBuildingsArea: 0,
			roadlessBuildings: 0,
			roadlessBuildingsArea: 0,
			connectedBuildings: 0,
			connectedBuildingsArea: 0,
			limitedBuildings: 0,
			limitedBuildingsArea: 0,
			chainBuildings: 0,
			chainArea: 0,
			setBuildings: 0,
			setArea: 0,
			roads: 0,
			roadsArea: 0,
			greatBuildings: 0,
			area: 0,
			areaOccupied: 0,
			areaAvailable: 0,
			buildingAreas: [],
			buildingTypes: []
		};
		let StreetsNeeded = 0;

		CityMap.BuildGrid();

		const MinX = 0,
			MinY = 0,
			MaxX = 71,
			MaxY = 71;

		const buildingData = (ActiveMap === 'OtherPlayer'
			? CityBuildings.createBuildings(Object.values(CityMap.OtherPlayer.mapData))
			: CityBuildings.createBuildings(Object.values(MainParser.CityMapData)));

		// find rating percentiles over all buildings, roads excluded
		const buildingRatings = Object.values(buildingData)
			.filter(building => building.type !== 'street')
			.map(building => parseInt(building.rating.totalScore * 100))
			.sort((a, b) => a - b);
		const rating10 = buildingRatings[Math.floor(buildingRatings.length / 10)];
		const rating20 = buildingRatings[Math.floor(buildingRatings.length / 5)];
		const rating30 = buildingRatings[Math.floor(buildingRatings.length / 3)];

		const unlockedAreas = (ActiveMap === 'OtherPlayer' ? CityMap.OtherPlayer.unlockedAreas : CityMap.Main.unlockedAreas);
		const ascendingBuildings = await CityMap.AscendingBuildings;

		// create building elements
		for (const building of Object.values(buildingData)) {
			if (building.coords.x < MinX || building.coords.x > MaxX || building.coords.y < MinY || building.coords.y > MaxY) continue;

			const x = (building.coords.x === undefined ? 0 : parseInt(building.coords.x * CityMap.map.gridSize)),
				y = (building.coords.y === undefined ? 0 : parseInt(building.coords.y * CityMap.map.gridSize)),
				xsize = building.size.width * CityMap.map.gridSize,
				ysize = building.size.length * CityMap.map.gridSize,
				area = building.size.width * building.size.length;

			const noStreet = (building.needsStreet === 0 ? ' noStreet' : ''),
				isLimited = (building.isLimited ? ' isLimited' : ''),
				fromQI = (building.entityId.includes('_GR') ? ' fromQI' : ''),
				fromGBG = (building.entityId.includes('_GBG') ? ' fromGBG' : ''),
				canAscend = (ascendingBuildings.hasOwnProperty(building.entityId) ? ' ascendable' : ''),
				isDecayed = (building.state.isDecayed ? ' decayed' : ''),
				isSpecial = (building.isSpecial ? ' special' : ''),
				chainBuilding = (building.chainBuilding !== undefined ? ' chain' : ''),
				setBuilding = (building.setBuilding !== undefined ? ' set' : '');

			const rating = (building.rating?.totalScore * 100 <= rating10 ? ' rating10' :
				(building.rating?.totalScore * 100 <= rating20 ? ' rating20' :
				(building.rating?.totalScore * 100 <= rating30 ? ' rating30' : '')));

			const f = $('<span ' + Allies.tooltip(building.id) + '/>')
				.addClass('entity fh-tooltip ' + building.type + noStreet + isSpecial + canAscend + isDecayed + chainBuilding + setBuilding + rating + isLimited + fromQI + fromGBG)
				.css({
					width: xsize + 'em',
					height: ysize + 'em',
					left: x + 'em',
					top: y + 'em'
				})
				.attr('data-callback_tt', 'Tooltips.buildingTT')
				.attr('data-era', building.eraName)
				.attr('data-size', building.size.length + 'x' + building.size.width)
				.attr('data-id', building.id)
				.attr('data-title', building.name)
				.attr('data-meta_id', building.entityId)
				.on('click', function () {
					const chainId = $(this).attr('data-chain-id');
					const setId = $(this).attr('data-set-id');
					if (chainId || setId) {
						CityMap.highlightRelatedBuildings(chainId || setId, chainId ? 'chain' : 'set');
					} else {
						$('.entity').removeClass('highlighted');
						$('#grid-outer').removeClass('desaturate');
					}
				});

			if (building.chainBuilding) {
				f.attr('data-chain-id', building.chainBuilding.id);
			}
			if (building.setBuilding) {
				f.attr('data-set-id', building.setBuilding.name);
			}

			// collect metrics for sidebar
			if (building.type === 'street') {
				CityMap.metrics.roads++;
				CityMap.metrics.roadsArea += area;
			}
			else {
				CityMap.metrics.buildings++;
				if (building.needsStreet === 0) {
					CityMap.metrics.roadlessBuildings++;
					CityMap.metrics.roadlessBuildingsArea += area;
				}
				else if (building.state.connected) {
					CityMap.metrics.connectedBuildings++;
					CityMap.metrics.connectedBuildingsArea += area;
				}

				if (canAscend !== '') {
					CityMap.metrics.ascendableBuildings++;
					CityMap.metrics.ascendableBuildingsArea += area;
				}
				if (building.state.isDecayed) {
					CityMap.metrics.decayedBuildings++;
					CityMap.metrics.decayedBuildingsArea += area;
				}
				else if (building.isLimited) {
					CityMap.metrics.limitedBuildings++;
					CityMap.metrics.limitedBuildingsArea += area;
				}

				if (building.chainBuilding !== undefined) {
					CityMap.metrics.chainBuildings++;
					CityMap.metrics.chainArea += area;
				}
				if (building.setBuilding !== undefined) {
					CityMap.metrics.setBuildings++;
					CityMap.metrics.setArea += area;
				}

				if (building.entityId.includes('_GR')) {
					CityMap.metrics.qiBuildings++;
					CityMap.metrics.qiArea += area;
				}
				else if (building.entityId.includes('_GBG')) {
					CityMap.metrics.gbgBuildings++;
					CityMap.metrics.gbgArea += area;
				}
				else if (building.entityId.includes('_Expedition')) {
					CityMap.metrics.geBuildings++;
					CityMap.metrics.geArea += area;
				}
			}

			CityMap.metrics.areaOccupied += area;
			CityMap.metrics.buildingAreas[building.type] = (CityMap.metrics.buildingAreas[building.type] || 0) + area;
			CityMap.metrics.buildingTypes[building.type] = (CityMap.metrics.buildingTypes[building.type] || 0) + 1;
			StreetsNeeded += (building.state.connected && building.type !== 'street' ? Math.min(building.size.width, building.size.length) * building.needsStreet / 2 : 0);

			// highlights for older buildings
			if (building.eraName) {
				const era = Technologies.Eras[building.eraName];

				if (era < CurrentEraID && building.type !== 'greatbuilding' && era !== 0) {
					const eraDiff = CurrentEraID - era;
					f.addClass('oldBuildings').addClass(eraDiff <= 3 ? `older-${eraDiff}` : 'too-old');
				}
			}

			// size changed, activate again
			if (ActiveId !== null && ActiveId === building.id) {
				f.addClass('highlighted');
			}

			$('#map-buildings').append(f);
		}

		CityMap.metrics.area = ((unlockedAreas?.length || 1) - 1) * 16 + 256; // x * (4*4) + 16*16
		CityMap.metrics.areaAvailable = CityMap.metrics.area - CityMap.metrics.areaOccupied;

		const StreetsUsed = CityMap.metrics.buildingAreas['street'] || 0;
		CityMap.EfficiencyFactor = StreetsNeeded / StreetsUsed;

		gridOuter.draggable();
		CityMap.getAreas();

		// .add() also covers the box while it is popped out as a separate window
		$('[data-original-title]').add($('#citymap-main [data-original-title]')).tooltip({
			container: 'body',
			html: true,
		});
	},


	/**
	 * Updates the sidebar with area statistics: free/total area, building type
	 * counts with occupied area, the clickable highlight options (roadless, GBG,
	 * QI, limited, ascendable, decayed, chain and set buildings) and the legend
	 * for old building highlighting.
	 */
	getAreas: () => {
		const unlockedAreas = (ActiveMap === 'OtherPlayer' ? CityMap.OtherPlayer.unlockedAreas : CityMap.Main.unlockedAreas);
		const total = ((unlockedAreas?.length || 1) - 1) * 16 + 256, // x * (4*4) + 16*16
			occupied = CityMap.metrics.areaOccupied,
			txtFree = total - occupied;

		if ($('#area-state').length === 0) {
			const aW = $('<div id="area-state" />');
			const aS = $('<div id="map-stats" />');

			aW.append($('<div class="building-count-area" />'));
			aW.append($('<p class="too-old-legends" />').hide());
			aS.append($('<div class="building-stats" />'));

			aW.prepend(aS);
			$('#sidebar').append(aW).addClass('main');
		}

		const expansionIcon = `<img src="${srcLinks.get('/shared/gui/constructionmenu/icon_expansion.png', true)}" />`;

		if (ActiveMap !== 'OtherPlayer') {
			$('.building-stats').html(
				expansionIcon +
				'<span data-original-title="' + i18n('Boxes.CityMap.FreeArea') + '">' + txtFree +
				'</span> / <span data-original-title="' + i18n('Boxes.CityMap.WholeArea') + '">' + total + '</span>').addClass('text-right');
		}

		const sortedBldTypes = Object.entries(CityMap.metrics.buildingTypes).sort((a, b) => b[1] - a[1]);

		const areaStats = [];
		areaStats.push('<p class="text-center"><b>' + CityMap.metrics.buildings + ' ' + i18n('Boxes.CityMap.BuildingsAmount') + '</b></p>');
		areaStats.push('<ul>');
		for (const [type, count] of sortedBldTypes) {
			const TypeName = i18n('Boxes.CityMap.' + type);
			const pct = (100 * count / CityMap.metrics.buildings).toFixed(1);

			let str = `<span data-original-title="${pct}%"><span class="square ${type}"></span>${count}x ${TypeName}</span> <span>${expansionIcon}${CityMap.metrics.buildingAreas[type]}</span>`;

			if (type === 'street') {
				str = `<span data-original-title="${pct}%"><span class="square ${type}"></span>${count}x ${TypeName}</span> <small class="street-eff">${HTML.Format(Math.round(CityMap.EfficiencyFactor * 10000) / 100)}% ${i18n('Boxes.Citymap.Efficiency')}</small>`;
			}
			areaStats.push(`<li>${str}</li>`);
		}
		areaStats.push('</ul>');

		/**
		 * Builds one clickable highlight list entry for the sidebar.
		 *
		 * @param {string} onClick - The onClick handler as inline JS.
		 * @param {string} label - Tooltip label of the entry.
		 * @param {string} icon - HTML of the entry icon.
		 * @param {number} count - Number of matching buildings.
		 * @param {number} area - Occupied area of the matching buildings.
		 * @returns {string}
		 */
		const highlightItem = (onClick, label, icon, count, area) => {
			const pct = (100 * count / CityMap.metrics.buildings).toFixed(1);
			return `<li onClick="${onClick}" class="clickable"><span data-original-title="${label}, ${pct}%">${icon}${count}</span> <span>${expansionIcon}${area}</span></li>`;
		};

		const icon = (path, style = '') => `<img ${style} src="${srcLinks.get(path, true)}" />`;
		const m = CityMap.metrics;

		areaStats.push(`<b>${i18n('Boxes.CityMap.Highlight')}</b>`);
		areaStats.push('<ul class="highlight-map">' +
			highlightItem('CityMap.highlightNoStreetBuildings()', i18n('Boxes.CityMap.roadless'), icon('/shared/gui/buffbar/buffbar_icon_buff_unconnected.png'), m.roadlessBuildings, m.roadlessBuildingsArea) +
			highlightItem('CityMap.highlightGBGBuildings()', i18n('Boxes.CityMap.buildingFromGBG'), icon('/cash_shop/gui/cash_shop_icon_navi_gbg_selected.png'), m.gbgBuildings, m.gbgArea) +
			highlightItem('CityMap.highlightQIBuildings()', i18n('Boxes.CityMap.buildingFromQI'), icon('/guild_raids/windows/guild_raids_guild_raid_emblem.png'), m.qiBuildings, m.qiArea) +
			highlightItem('CityMap.highlightLimitedBuildings()', i18n('Boxes.CityMap.limited'), icon('/shared/gui/upgrade/upgrade_icon_limited_building.png'), m.limitedBuildings, m.limitedBuildingsArea) +
			highlightItem('CityMap.highlightAscendableBuildings()', i18n('Boxes.CityMap.ShowAscendableBuildings'), icon('/shared/icons/limited_building_upgrade.png'), m.ascendableBuildings, m.ascendableBuildingsArea) +
			highlightItem('CityMap.highlightDecayedBuildings()', i18n('Boxes.CityMap.ShowDecayedBuildings'), icon('/shared/icons/limited_building_downgrade.png', 'style="filter:saturate(0.5)"'), m.decayedBuildings, m.decayedBuildingsArea) +
			highlightItem('CityMap.highlightChainBuildings()', i18n('Boxes.CityMap.ChainBuildings'), expansionIcon, m.chainBuildings, m.chainArea) +
			highlightItem('CityMap.highlightSetBuildings()', i18n('Boxes.CityMap.SetBuildings'), icon('/shared/gui/upgrade/upgrade_icon_limited_building.png'), m.setBuildings, m.setArea));

		areaStats.push('<li class="ratings clickable">');
		areaStats.push(`<label for="show-worst-buildings"><input type="checkbox" id="show-worst-buildings" onclick="CityMap.highlightWorstBuildings()" /> ${i18n('Boxes.CityMap.ShowWorstBuildings')}</label>`);
		if (ActiveMap !== 'OtherPlayer') {
			areaStats.push('<span onclick="Productions.ShowRating()" class="clickable"></span>');
		}
		areaStats.push('</li>');

		if (ActiveMap !== 'OtherPlayer') {
			areaStats.push(`<li class="clickable"><label for="highlight-old-buildings"><input type="checkbox" id="highlight-old-buildings" onclick="CityMap.highlightOldBuildings()"> ${i18n('Boxes.CityMap.HighlightOldBuildings')}</label></li>`);
		}
		areaStats.push('</ul>');

		$('.building-count-area').html(areaStats.join('')).promise().done(function () {
			$('.building-count-area ul.highlight-map li').click(function () {
				$(this).toggleClass('active');
			});
		});

		const legends = [];
		legends.push(`<span class="older-1 diagonal"></span> ${$('#map-container .older-1').length} ${i18n('Boxes.CityMap.OlderThan1Era')}<br>`);
		legends.push(`<span class="older-2 diagonal"></span> ${$('#map-container .older-2').length} ${i18n('Boxes.CityMap.OlderThan2Era')}<br>`);
		legends.push(`<span class="older-3 diagonal"></span> ${$('#map-container .older-3').length} ${i18n('Boxes.CityMap.OlderThan3Era')}<br>`);
		legends.push(`<span class="too-old diagonal"></span> ${$('#map-container .too-old').length} ${i18n('Boxes.CityMap.OlderThan4Era')}<br>`);

		$('.too-old-legends').html(legends.join(''));
	},


	/**
	 * Generates a hash code for a given string.
	 *
	 * @param {string} str - The input string.
	 * @returns {number} The computed hash code.
	 */
	hashCode: (str) => {
		return str.split('').reduce((prevHash, currVal) => (((prevHash << 5) - prevHash) + currVal.charCodeAt(0)) | 0, 0);
	},


	/**
	 * Toggles the submit box for the City Map feature: removes the box when it
	 * is already open, otherwise creates it with description and submit button.
	 */
	showSubmitBox: () => {
		const $CityMapSubmit = $('#CityMapSubmit');

		if ($CityMapSubmit.length > 0) {
			$CityMapSubmit.remove();
			return;
		}

		HTML.Box({
			id: 'CityMapSubmit',
			title: i18n('Boxes.CityMap.TitleSend'),
			auto_close: true,
			saveCords: false
		});

		HTML.AddCssFile('citymap');

		let desc = '<p class="text-center">' + i18n('Boxes.CityMap.Desc1') + '</p>';
		desc += '<p class="text-center" id="msg-line"><button class="btn" onclick="CityMap.SubmitData()">' + i18n('Boxes.CityMap.Submit') + '</button></p>';

		$('#CityMapSubmitBody').html(desc);
	},


	/** Toggles the diagonal highlight and legend for buildings of older eras. */
	highlightOldBuildings: () => {
		$('.oldBuildings').toggleClass('diagonal');
		$('.too-old-legends').slideToggle();
	},


	/**
	 * Highlights all buildings belonging to the same chain or set.
	 *
	 * @param {string} id - The chain id or set id.
	 * @param {string} type - 'chain' or 'set'.
	 */
	highlightRelatedBuildings: (id, type) => {
		const attribute = (type === 'chain' ? 'data-chain-id' : 'data-set-id');
		let found = false;

		$('span.entity').each(function () {
			const isRelated = ($(this).attr(attribute) === id);
			$(this).toggleClass('highlighted', isRelated);
			found = found || isRelated;
		});

		$('#grid-outer').toggleClass('desaturate', found);
	},


	/** Toggles the highlight for buildings without street requirement. */
	highlightNoStreetBuildings: () => {
		$('.noStreet').toggleClass('highlight');
	},


	/** Toggles the highlight for buildings with a pending ascended upgrade. */
	highlightAscendableBuildings: () => {
		$('.ascendable').toggleClass('highlight2');
	},


	/** Toggles the highlight for decayed buildings. */
	highlightDecayedBuildings: () => {
		$('.decayed').toggleClass('highlight3');
	},


	/** Toggles the highlight for limited buildings. */
	highlightLimitedBuildings: () => {
		$('#grid-outer').toggleClass('showLimited');
	},


	/** Toggles the highlight for buildings from Guild Battlegrounds. */
	highlightGBGBuildings: () => {
		$('#grid-outer').toggleClass('showGBG');
	},


	/** Toggles the highlight for chain buildings. */
	highlightChainBuildings: () => {
		$('#grid-outer').toggleClass('showChains');
	},


	/** Toggles the highlight for set buildings. */
	highlightSetBuildings: () => {
		$('#grid-outer').toggleClass('showSets');
	},


	/** Toggles the highlight for buildings from Quantum Incursions. */
	highlightQIBuildings: () => {
		$('#grid-outer').toggleClass('showQI');
	},


	/** Toggles the highlight for the worst rated buildings (bottom 10/20/30%). */
	highlightWorstBuildings: () => {
		$('.rating10, .rating20, .rating30').toggleClass('highlight4');
	},


	/**
	 * Collects the city map data of the active map (entities, unlocked and
	 * blocked areas, goods, city entities) and submits it to the CityPlanner
	 * endpoint. Requires a stored API token; success, warnings and errors are
	 * reported via toast messages.
	 */
	SubmitData: () => {
		const apiToken = localStorage.getItem('ApiToken');

		if (apiToken === null) {
			HTML.ShowToastMsg({
				head: i18n('Boxes.CityMap.MissingApiKeyErrorHeader'),
				text: [
					i18n('Boxes.CityMap.MissingApiKeySubmitError'),
					`<a target="_blank" href="${i18n('Settings.ApiTokenUrl')}">${i18n('Settings.ApiTokenUrl')}</a>`
				],
				type: 'error',
				hideAfter: 10000,
			});

			return;
		}

		helper.preloader.show('#CityMapSubmit');

		$('#CityMapSubmit .loading-data').append(
			$('<div class="loading-message" />')
				.css({
					position: 'absolute',
					top: '75%',
					left: '0',
					width: '100%',
					textAlign: 'center',
					color: '#ffffff',
					padding: '0 20px',
					boxSizing: 'border-box',
					fontSize: '14px',
					textShadow: '1px 1px 2px #000'
				})
				.text(i18n('Boxes.CityMap.SubmitProcessing'))
		);

		let entities = MainParser.CityMapData,
			areas = CityMap.Main.unlockedAreas,
			blockedAreas = CityMap.Main.blockedAreas;

		if (ActiveMap === 'cultural_outpost') {
			entities = CityMap.CulturalOutpost.data;
			areas = CityMap.CulturalOutpost.areas;
			blockedAreas = [];
		}
		else if (ActiveMap === 'era_outpost') {
			entities = CityMap.EraOutpost.data;
			areas = CityMap.EraOutpost.areas;
			blockedAreas = [];
		}
		else if (ActiveMap === 'guild_raids') {
			entities = CityMap.QI.data;
			areas = CityMap.QI.areas;
			blockedAreas = [];
		}

		const currentDate = new Date(),
			d = {
				time: currentDate.toISOString().split('T')[0] + ' ' + currentDate.getHours() + ':' + currentDate.getMinutes() + ':' + currentDate.getSeconds(),
				player: {
					name: ExtPlayerName,
					id: ExtPlayerID,
					world: ExtWorld,
					avatar: ExtPlayerAvatar,
					avatarUrl: srcLinks.GetPortrait(ExtPlayerAvatar),
					era: CurrentEra,
					era_id: CurrentEraID
				},
				apiToken: apiToken,
				type: (ActiveMap === 'cultural_outpost' ? localStorage.getItem('OutpostType') : (CityMap.OutpostMaps.includes(ActiveMap) ? ActiveMap : 'main')),
				eras: Technologies.Eras,
				entities: CityMap.removeDoubleUnderscoreKeys(entities),
				areas: CityMap.removeDoubleUnderscoreKeys(areas),
				blockedAreas: CityMap.removeDoubleUnderscoreKeys(blockedAreas),
				goods: GoodsData,
				cityEntities: CityMap.removeDoubleUnderscoreKeys(MainParser.CityEntities),
				allEntities: CityMap.removeDoubleUnderscoreKeys(Outposts.Advancements),
				mainEntities: (CityMap.isOutpostMap() ? CityMap.removeDoubleUnderscoreKeys(MainParser.CityMapData) : null),
				selectionKits: MainParser.SelectionKits || null,
			};

		MainParser.send2Server(d, 'CityPlanner', function (resp) {
			if (resp.status === 'OK') {
				HTML.ShowToastMsg({
					head: i18n('Boxes.CityMap.SubmitSuccessHeader'),
					text: [
						i18n('Boxes.CityMap.SubmitSuccess'),
						'<a target="_blank" href="https://foe-helper.com/citymap/overview">foe-helper.com</a>'
					],
					type: 'success',
					hideAfter: 10000,
				});

				// show non critical server errors (cache files, avatar, ...) anyway
				if (Array.isArray(resp['warnings']) && resp['warnings'].length > 0) {
					HTML.ShowToastMsg({
						head: i18n('Boxes.CityMap.SubmitErrorHeader'),
						text: resp['warnings'].join('<br>'),
						type: 'warning',
						hideAfter: 15000,
					});
				}
			}
			else {
				HTML.ShowToastMsg({
					head: i18n('Boxes.CityMap.SubmitErrorHeader'),
					text: resp['msg'] || 'Unknown server error',
					type: 'error',
					hideAfter: 10000,
				});
			}

			$('#CityMapSubmit').fadeToggle(function () {
				$(this).remove();
			});
		}, function (errMsg) {
			HTML.ShowToastMsg({
				head: i18n('Boxes.CityMap.SubmitErrorHeader'),
				text: errMsg,
				type: 'error',
				hideAfter: 10000,
			});

			$('#CityMapSubmit').fadeToggle(function () {
				$(this).remove();
			});
		});
	},


	/**
	 * Collects the meta info of the active map (city map data, unlocked areas
	 * and city entities) with all `__class__`/`__enum__` keys removed.
	 *
	 * @returns {Object} The collected meta info data.
	 */
	collectMetaInfos: () => {
		const data = {};
		if (ActiveMap === 'guild_raids') {
			data.CityMapData = CityMap.removeDoubleUnderscoreKeys(CityMap.QI.data);
			data.UnlockedAreas = CityMap.removeDoubleUnderscoreKeys(CityMap.QI.areas);
		}
		else {
			data.CityMapData = CityMap.removeDoubleUnderscoreKeys(MainParser.CityMapData);
			data.UnlockedAreas = CityMap.removeDoubleUnderscoreKeys(CityMap.Main.unlockedAreas);
		}
		data.CityEntities = CityMap.removeDoubleUnderscoreKeys(MainParser.CityEntities);

		return data;
	},


	/**
	 * Copies the meta info of the active map as JSON to the clipboard and
	 * shows a confirmation toast.
	 */
	copyMetaInfos: () => {
		helper.str.copyToClipboard(
			JSON.stringify(CityMap.collectMetaInfos())
		).then(() => {
			HTML.ShowToastMsg({
				head: i18n('Boxes.CityMap.ToastHeadCopyData'),
				text: i18n('Boxes.CityMap.ToastBodyCopyData'),
				type: 'info',
				hideAfter: 4000,
			});
		});
	},


	/**
	 * Builds the same data object as `copyMetaInfos` and triggers a file
	 * download (JSON) instead of writing it to the clipboard.
	 */
	downloadMetaInfos: () => {
		const data = CityMap.collectMetaInfos();

		const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
		const fileName = (ActiveMap === 'guild_raids' ? 'QI' : ExtWorld) + '_citymap_' + moment().format('YYMMDD-HHmm') + '_' + ExtPlayerID + '.json';
		download(blob, fileName, 'application/json');

		HTML.ShowToastMsg({
			head: i18n('Boxes.CityMap.ToastHeadDownloadData'),
			text: i18n('Boxes.CityMap.ToastBodyDownloadData'),
			type: 'info',
			hideAfter: 4000,
		});
	},


	/**
	 * Determines size, street requirement and connection state of a placed building.
	 *
	 * @param {Object} CityMapEntity - The placed building entity from the city map data.
	 * @returns {Object} Size info: xsize, ysize, streets_required, is_connected, building_area, street_area and total_area.
	 */
	GetBuildingSize: (CityMapEntity) => {
		const CityEntity = MainParser.CityEntities[CityMapEntity['cityentity_id']];
		const Ret = {};

		Ret['is_connected'] = (CityMapEntity['state']?.__class__ !== 'UnconnectedState' && CityMapEntity['state']?.pausedAt === undefined && CityMapEntity['state']?.pausedState === undefined);

		if (CityEntity['requirements']) {
			Ret['xsize'] = CityEntity['width'];
			Ret['ysize'] = CityEntity['length'];
			Ret['streets_required'] = (['street', 'main_building'].includes(CityEntity['type']) ? 0 : CityEntity['requirements']['street_connection_level'] | 0);
		}
		else {
			const Size = CityEntity?.components?.AllAge?.placement?.size;

			Ret['xsize'] = Size?.x || 0;
			Ret['ysize'] = Size?.y || 0;
			Ret['streets_required'] = CityEntity?.components?.AllAge?.streetConnectionRequirement?.requiredLevel | 0;
		}

		Ret['building_area'] = Ret['xsize'] * Ret['ysize'];
		Ret['street_area'] = (Ret['is_connected'] ? Math.min(Ret['xsize'], Ret['ysize']) * Ret['streets_required'] / 2 : 0);
		Ret['total_area'] = Ret['building_area'] + Ret['street_area'];

		return Ret;
	},


	/**
	 * Highlights all buildings whose name or size matches the given filter string.
	 * A size pattern like "4x4" is matched against the building size.
	 *
	 * @param {string} string - The filter string; an empty string clears the filter.
	 */
	filterBuildings: (string) => {
		// prefix size searches with the separator so "4x4" matches the size, not a name
		if (/[0-9]+x[0-9]*/.test(string)) string = ',' + string;
		const search = string.toLowerCase();

		$('span.entity').each(function () {
			const title = ($(this).attr('data-title') + ',' + $(this).attr('data-size')).toLowerCase();
			$(this).toggleClass('highlighted', string !== '' && title.includes(search));
		});

		$('#grid-outer').toggleClass('desaturate', string !== '');
	},


	/**
	 * Determines the era id of a placed building. Great buildings, AllAge and
	 * unknown eras resolve to the current era; multi era buildings use their level.
	 *
	 * @param {Object} CityMapEntity - The placed building entity from the city map data.
	 * @returns {number|string} The era id for the building.
	 */
	GetBuildingEra: (CityMapEntity) => {
		const CityEntity = MainParser.CityEntities[CityMapEntity['cityentity_id']];

		// Great building
		if (CityEntity['type'] === 'greatbuilding') {
			return CurrentEraID;
		}
		// AllAge
		if (CityMapEntity['cityentity_id'].indexOf('AllAge') > -1) {
			return CurrentEraID;
		}
		// Multi era
		if (CityMapEntity['level']) {
			return CityMapEntity['level'] + 1;
		}
		// new format
		if (CityEntity?.components?.AllAge?.era?.era) {
			return Technologies.Eras[CityEntity.components.AllAge.era.era];
		}

		// derive the era from the entity id
		const regExString = new RegExp('(?:_)((.[\\s\\S]*))(?:_)', 'ig'),
			testEra = regExString.exec(CityMapEntity['cityentity_id']);

		if (testEra && testEra.length > 1) {
			const era = Technologies.Eras[testEra[1]];

			// AllAge => Current era
			return (era === 0 ? CurrentEraID : era);
		}

		return CurrentEraID;
	},


	/**
	 * Removes all keys starting with "__class__" or "__enum__" from an object,
	 * including keys in nested objects or arrays.
	 *
	 * @param {Object|Array} obj - The object or array to process. Non-object or null values are returned as-is.
	 * @returns {Object|Array} A new object or array with the specified keys removed, preserving the structure of the input.
	 */
	removeDoubleUnderscoreKeys(obj) {
		if (typeof obj !== 'object' || obj === null) {
			return obj; // only process objects/arrays
		}

		if (Array.isArray(obj)) {
			return obj.map(item => CityMap.removeDoubleUnderscoreKeys(item));
		}

		const newObj = {};

		for (const key in obj) {
			if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
			if (key.startsWith('__class__') || key.startsWith('__enum__')) continue;

			// keep everything else, but apply the rule recursively to nested structures
			newObj[key] = CityMap.removeDoubleUnderscoreKeys(obj[key]);
		}

		return newObj;
	},
};

{
	let mapRefreshTimer = null;
	const queueMapRefresh = () => {
		clearTimeout(mapRefreshTimer);
		mapRefreshTimer = setTimeout(() => {
			if ($('#citymap-main').length > 0 && ActiveMap === 'main') {
				CityMap.SetMapBuildings(MainParser.CityMapData);
			}
		}, 250);
	};

	const queueCityChangeRefresh = () => {
		queueMapRefresh();
	};

	FoEproxy.addHandler('CityMapService', 'placeBuilding', queueCityChangeRefresh);
	FoEproxy.addHandler('CityMapService', 'removeBuilding', queueCityChangeRefresh);
}
