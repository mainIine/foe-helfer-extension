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


	/**
	 * A Promise that resolves with an object mapping building IDs to their corresponding upgraded building IDs
	 * for buildings related to ascended upgrades.
	 */
	AscendingBuildings: new Promise((resolve) => {
		let timer = () => {
			if (!MainParser.BuildingUpgrades) {
				setTimeout(timer,500)
			} else {
				resolve (Object.assign({},...Object.values(MainParser.BuildingUpgrades).filter(x => x.upgradeItem.id.includes("ascended")).map(x=>x.upgradeSteps[0].buildingIds.map((Id,i)=>({[Id]:x.upgradeSteps[1].buildingIds[i]}))).flat())) 
			}
		}

		timer();
	}),


	/**
	 * Initializes the City Map based on the selected map type and user preferences.
	 * This function handles retrieving map scale, view settings, and map data,
	 * and manages the creation or update of the City Map UI.
	 *
	 * @param {Object} event - An optional event object passed when triggered. If not provided, it toggles the visibility of the map UI.
	 */
	init: (event)=> {
		let Title = i18n('Boxes.CityMap.YourCity');

		// grid sizing and view
		let scale = localStorage.getItem('CityMapScale'),
			outpostScale = localStorage.getItem('OutpostMapScale'),
			view = localStorage.getItem('CityMapView');
		if(null !== scale)
			CityMap.map.scale = parseInt(scale);
		if(null !== view)
			CityMap.map.view = view;
		if(null !== outpostScale)
			CityMap.map.outpostScale = parseInt(outpostScale);

		let Data = MainParser.CityMapData;
		if (ActiveMap === "cultural_outpost") 
			Data = CityMap.CulturalOutpost.data;
		else if (ActiveMap === "era_outpost") 
			Data = CityMap.EraOutpost.data;
		else if (ActiveMap === "guild_raids") {
			Data = CityMap.QI.data;
			Title = i18n('Boxes.General.Quantum_Incursion.short')+' '+i18n('Boxes.General.Level')+' '+CityMap.QI.level;
		}
		else if (ActiveMap === "OtherPlayer") {
			Data = CityMap.OtherPlayer.mapData;
			Title = CityMap.OtherPlayer.name;
		}

		if( $('#citymap-main').length < 1 ) {
			HTML.AddCssFile('citymap');

			HTML.Box({
				id: 'citymap-main',
				title: Title,
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize : true,
				ask: i18n('Boxes.CityMap.HelpLink'),
			});

			setTimeout(()=>{
				CityMap.PrepareBox(Title,'citymap-main');
			}, 100);
		}
		else if (!event) {
			HTML.CloseOpenBox('citymap-main');
			return;
		}

		setTimeout(()=>{
			CityMap.SetMapBuildings(Data);
		}, 100);
	},


	/**
	 * Prepares and initializes the main UI box and sidebar for the City Map.
	 *
	 * This function:
	 * - Sets up the HTML structure for the map container and sidebar.
	 * - Initializes map scale and perspective (view) settings from local storage.
	 * - Adds event listeners for view changes and scale adjustments.
	 * - Configures filters and action buttons (e.g., meta info copy, submit box).
	 * - Handles different map contexts: main city, cultural outposts, era outposts, guild raids, and other players.
	 * - Populates the sidebar with statistics or building lists specific to the active map.
	 *
	 * @param {string} Title - The title of the map box.
	 * @param {string} [elemId="citymap-main"] - The ID of the box element.
	 */
	PrepareBox: (Title,elemId="citymap-main")=> {	
		let oB = $('#'+elemId+'Body'),
			wrapper = $('<div id="citymap-wrapper" />'),
			menu = $('<div id="city-map-menu" />');

		/* scale */
		let scaleUnit = CityMap.map.scale;
		if (ActiveMap === "cultural_outpost" || ActiveMap === "era_outpost" || ActiveMap === "guild_raids") 
			scaleUnit = CityMap.map.outpostScale;

		wrapper
			.append($('<div id="map-container" />')
				.append($(`<div id="grid-outer" data-unit="${scaleUnit}" data-view="${CityMap.map.view}" />`)
					.append($('<div id="map-grid" />'))
					.append($('<div id="map-buildings" />'))))
			.append($('<div id="sidebar" />')
				.append($('<div id="map-filters" />')));

		$('#'+elemId+'Header > .title').attr('id', 'map' + CityMap.hashCode(Title));

		if (ActiveMap === "cultural_outpost" || ActiveMap === "era_outpost" || ActiveMap === "guild_raids") {
			oB.addClass('outpost').addClass(ActiveMap)
		}

		/* change view */
		let dropView = $('<select id="menu-view" class="game-cursor" />')
			.append($('<option class="game-cursor" data-view="normal" />').prop('selected', CityMap.map.view === 'normal').text(i18n('Boxes.CityMap.NormalPerspecitve')) )
			.append($('<option class="game-cursor" data-view="skew" />').prop('selected', CityMap.map.view === 'skew').text(i18n('Boxes.CityMap.CavalierPerspecitve')) );

		$('#'+elemId).on('change', '#menu-view', function(){
			let view = $('#menu-view option:selected').data('view');
			$('#grid-outer').attr('data-view', view);
			localStorage.setItem('CityMapView', view);
		});
		
		let scaleView = $('<select id="scale-view" class="game-cursor" />')
			.append( $('<option class="game-cursor" data-scale="60" />').prop('selected', scaleUnit === 60).text('60%') )
			.append( $('<option class="game-cursor" data-scale="80" />').prop('selected', scaleUnit === 80).text('80%') )
			.append( $('<option class="game-cursor" data-scale="100" />').prop('selected', scaleUnit === 100).text('100%') )
			.append( $('<option class="game-cursor" data-scale="120" />').prop('selected', scaleUnit === 120).text('120%') )
			.append( $('<option class="game-cursor" data-scale="140" />').prop('selected', scaleUnit === 140).text('140%') )
			.append( $('<option class="game-cursor" data-scale="160" />').prop('selected', scaleUnit === 160).text('160%') )
			.append( $('<option class="game-cursor" data-scale="180" />').prop('selected', scaleUnit === 180).text('180%') )
		;

		menu.append(dropView).append(scaleView);

		$('#'+elemId).on('change', '#scale-view', function(){
			let unit = parseInt($('#scale-view option:selected').data('scale'));
			$('#grid-outer').attr('data-unit', unit);

			if (ActiveMap === "cultural_outpost" || ActiveMap === "era_outpost" || ActiveMap === "guild_raids") {
				localStorage.setItem('OutpostMapScale', unit);
				CityMap.map.outpostScale = unit;
			}
			else {
				localStorage.setItem('CityMapScale', unit);
				CityMap.map.scale = unit;	
			}

			$('#map-container').scrollTo( $('.highlighted') , 800, {offset: {left: -280, top: -280}, easing: 'swing'});
		});

		// Button for submit Box
		if (ActiveMap === 'main') {
			menu.append($('<input type="text" id="BuildingsFilter" placeholder="'+ i18n('Boxes.CityMap.FilterBuildings') +'" oninput="CityMap.filterBuildings(this.value)">'));
			menu.append(
				$('<div class="btn-group" />')
					.append($('<button class="btn ml-auto" />').attr({ id: 'copy-meta-infos', onclick: 'CityMap.copyMetaInfos()' }).text(i18n('Boxes.CityMap.CopyMetaInfos')))
					.append($('<button class="btn ml-auto" />').attr({ id: 'show-submit-box', onclick: 'CityMap.showSubmitBox()' }).text(i18n('Boxes.CityMap.ShowSubmitBox')))
			);
		}
		oB.append(wrapper);

		if (ActiveMap === "guild_raids")
			if (CityMap.QI.data) {
				menu.append($(`<button class="btn ml-auto" id="copy-meta-infos" onclick="CityMap.copyMetaInfos()" style="margin-left:auto" />`).text(i18n('Boxes.CityMap.CopyMetaInfos')));
				$("#sidebar").append(CityMap.showQIBuildingList());
			}

		wrapper.append(menu);

		if (ActiveMap === "cultural_outpost" || ActiveMap === "era_outpost") 
			$("#sidebar").append(CityMap.showOutpostBuildings());
		
		if (ActiveMap === "cultural_outpost")
			$('#citymap-wrapper').append('<span class="btn btn-mid openOverview" onClick="Outposts.BuildInfoBox()">'+i18n('Menu.OutP.Title')+'</span>');

		if (ActiveMap === 'OtherPlayer') {
			let townhall = (Object.values(CityMap.OtherPlayer.mapData).find(x => x.type === 'main_building'));
			CityMap.OtherPlayer.eraName = townhall.cityentity_id?.split('_')[1] || townhall.entityId?.split('_')[1];

			$("#sidebar").append($('<a id="openEfficiencyRating" class="btn" onclick="Productions.ShowRating(true,\''+CityMap.OtherPlayer.eraName+'\')">'+ i18n('Menu.ProductionsRating.Title') +'</a>'));
		}
	},


	BuildGrid: () => {	
		let ua = CityMap.Main.unlockedAreas;
		if (ActiveMap === "OtherPlayer")
			ua = CityMap.OtherPlayer.unlockedAreas;
		let xOffset = 0;
		let yOffset = 0;
		if (ActiveMap === "cultural_outpost") {
			ua = CityMap.CulturalOutpost.areas;
			xOffset = 500;
		}
		else if (ActiveMap === "era_outpost") {
			ua = CityMap.EraOutpost.areas;
			yOffset = 500;
		}
		else if (ActiveMap === "guild_raids") {
			ua = CityMap.QI.areas;
			yOffset = 500;
			xOffset = 500;
		}

		for(let i in ua) {
			if(!ua.hasOwnProperty(i))
				break;

			let x = (((ua[i]['x']-xOffset) * CityMap.map.gridSize) ),
				y = (((ua[i]['y']-yOffset) * CityMap.map.gridSize) );

			let a = $('<span />')
				.addClass('map-bg')
				.css({
					left: x + 'em',
					top: y + 'em',
				});

			// initial grid
			if(ua[i]['width'] === 16 && ua[i]['length'] === 16) {
				a.addClass('startmap');
			}

			$('#map-grid').append(a);
		}
	},


	SetOutpostBuildings: () => {
		$('#grid-outer').find('.map-bg').remove();
		$('#grid-outer').find('.entity').remove();

		CityMap.BuildGrid();

		let buildings = CityMap.CulturalOutpost.data;
		let xOffset = 0, yOffset = 0;
		if (ActiveMap === "era_outpost") {
			buildings = CityMap.EraOutpost.data;
			yOffset = 500;
		}
		else if (ActiveMap === "cultural_outpost") {
			xOffset = 500;
		}
		else if (ActiveMap === "guild_raids") {
			buildings = CityMap.QI.data;
			xOffset = 500;
			yOffset = 500;
		}

		for (let b in buildings) {
			let x = (buildings[b]['x'] || 0) - xOffset;
			let y = (buildings[b]['y'] || 0) - yOffset;
			let CityMapEntity = buildings[b],
				d = MainParser.CityEntities[CityMapEntity['cityentity_id']],
				BuildingSize = CityMap.GetBuildingSize(CityMapEntity),

				xx = (parseInt(x) * CityMap.map.gridSize),
				yy = (parseInt(y) * CityMap.map.gridSize),
				xsize = ((parseInt(BuildingSize['xsize']) * CityMap.map.gridSize)),
				ysize = ((parseInt(BuildingSize['ysize']) * CityMap.map.gridSize))
				
				let collectSoon = "";
				let thresholdTime = 10800;
				let hours = CityMapEntity.state?.next_state_transition_in ? Math.round(CityMapEntity.state.next_state_transition_in/60/60*100) : 0;
				if (ActiveMap === "guild_raids" && CityMapEntity.state?.__class__ === "ProducingState" && CityMapEntity.state.next_state_transition_in < thresholdTime) {
					collectSoon = " collectSoon collect" + (hours < 100 ? "" : hours);
				}
				let collectionString = HTML.i18nReplacer(i18n('Boxes.CityMap.CollectSoon'), {hours: hours/100})
				let f = $('<span />').addClass('entity ' + d['type'] + collectSoon).css({
					width: xsize + 'em',
					height: ysize + 'em',
					left: xx + 'em',
					top: yy + 'em'
				})
				.attr('data-original-title', d['name'] + ', ' + BuildingSize['ysize']+ 'x' +BuildingSize['xsize'] + 
					(collectSoon != "" ? '<br>'+collectionString : '') )
				.attr('data-entityid', CityMapEntity['id']);

			$('#map-buildings').append( f );
		}

		$('[data-original-title]').tooltip({
			container: 'body',
			html: true,
		});

		$('#grid-outer').draggable();
	},


	showQIStats: () => {
		if (!CityMap.QI.data) return;

		let out = '<div class="metaSums">';
		out += '<p class="text-center"><i>'+i18n('Boxes.CityMap.QIHint')+'</i></p>';
		out += '<div class="flex between" style="margin-bottom: 10px;">';
        out += '<span><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)+'" />' +  CityMap.QI.areas.length + '</span>';
		out += '<div class="popStats"><span class="prod population">'+CityMap.QI.stats.availablePopulation+'/'+CityMap.QI.stats.totalPopulation+'</span> ';
		let euphoria = Math.round(CityMap.QI.stats.euphoriaBoost*100);
		out += '<span class="prod happiness euphoria'+euphoria+'" title="'+CityMap.QI.stats.euphoria+'">'+euphoria+'%</span></div>';
		out += '</div>';

		out += '<div class="productions">';
		for (let [prod, value] of Object.entries(CityMap.QI.stats.resources)) {
			out += '<span class="'+prod+'">'+srcLinks.icons(prod);
				out += HTML.Format(value);
			out += "</span> ";
		}
		out += '</div><div class="boosts">';
		for (let [boost, value] of Object.entries(CityMap.QI.stats.boosts)) {
			if (boost.includes("action_points"))
				out += '<span class="'+boost+'">'+srcLinks.icons(boost)+value+"</span> ";
			else 
				out += '<span class="'+boost+'">'+srcLinks.icons(boost)+value+"%</span> ";
		}
		
		out += "</div></div>";
		return out;
	},


	showQIBuildingList: () => {
		if (!CityMap.QI.data) return;
		let boosts = Boosts.Sums;
		let buildings = Object.values(CityMap.QI.data);
		
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

		let out = '<table class="foe-table allBuildings">'
		out += '<thead><tr><th colspan="2">'+i18n('Boxes.CityMap.Building')+'</th><th class="population textright"></th><th class="happiness textright"></th><th>'+i18n('Boxes.CityMap.Boosts')+'</th></tr></thead>'
		out += "<tbody>"

		let uniques = {};
		for (let b of buildings) {
			if (!uniques[b.cityentity_id]) 
				uniques[b.cityentity_id] = 1
			else 
				uniques[b.cityentity_id] += 1
		}
		let uniqueBuildings = [];
		for (let [id,count] of Object.entries(uniques)){
			let building = CityMap.setQIBuilding(MainParser.CityEntities[id]);
			building.count = count;
			uniqueBuildings.push(building);
			
			CityMap.QI.stats.euphoria += building.euphoria*count || 0;
			CityMap.QI.stats.totalPopulation += (building.population >= 0 ? building.population*count : 0);
			CityMap.QI.stats.availablePopulation += building.population*count;
		}
		uniqueBuildings.sort((a, b) => {
			if (a.entityId < b.entityId) return -1
			if (a.entityId > b.entityId) return 1
			return 0
		});


		let euphoriaFactor = CityMap.QI.stats.euphoria/CityMap.QI.stats.totalPopulation;
		CityMap.QI.stats.euphoriaBoost = 1.5;
		if (euphoriaFactor <= 0.2) CityMap.QI.stats.euphoriaBoost = 0.2;
		else if (euphoriaFactor > 0.20 && euphoriaFactor <= 0.60) CityMap.QI.stats.euphoriaBoost = 0.6;
		else if (euphoriaFactor > 0.60 && euphoriaFactor <= 0.80) CityMap.QI.stats.euphoriaBoost = 0.8;
		else if (euphoriaFactor > 0.80 && euphoriaFactor <= 1.20) CityMap.QI.stats.euphoriaBoost = 1;
		else if (euphoriaFactor > 1.20 && euphoriaFactor <= 1.40) CityMap.QI.stats.euphoriaBoost = 1.1;
		else if (euphoriaFactor > 1.40 && euphoriaFactor < 2.0) CityMap.QI.stats.euphoriaBoost = 1.2;

		for (let building of uniqueBuildings) {
			if (building.type === "impediment" || building.type === "street") continue;
			out += "<tr class='"+building.type+"'>" + 
					"<td><div class='building' data-original-title='"+building.name+"'>" + 
						"<img src='" + srcLinks.get("/city/buildings/"+building.entityId.replace(/^(\D_)(.*?)/,"$1SS_$2")+".png",true) + "'>" +
					"</div></td>" +
					"<td>" + (building.count>1?"x"+building.count:"") + "</td>"
			out += '<td class="textright">' + building.population + "</td>"
			out += '<td class="textright">' + building.euphoria + "</td>"
			out += "<td>"
			if (building.production !== null) {
				if (building.type === "goods" || building.type === "military") {
					out += (building.type === "goods" ? "+20 = " : "+10 = ")
					out += (building.production.guild_raids_supplies ? '<span class="prod guild_raids_supplies">'+HTML.Format(building.production.guild_raids_supplies*-1.0)+'</span> ' : " ")
					out += (building.production.guild_raids_money ? '<span class="prod guild_raids_money">'+HTML.Format(building.production.guild_raids_money*-1.0)+'</span> ' : "")	
				}
				else {
					let euphoriaBoost = CityMap.QI.stats.euphoriaBoost;
					for (let [prod, value] of Object.entries(building.production)) {
						// add coin and supply boosts
						let boost = 0;
						if (prod.includes('suppl')) 
							boost += boosts.guild_raids_supplies_production || 0;
						else if (prod.includes('money')) 
							boost += boosts.guild_raids_coins_production || 0;

						// dont boost main building productions
						if (building.type === "main_building") {
							euphoriaBoost = 1;
							boost = 0;
						}
						let boostedValue = Math.round(value*(euphoriaBoost+(boost/100)))
						out += srcLinks.icons(prod)+HTML.Format(boostedValue)+" ";
						CityMap.QI.stats.resources[prod] += boostedValue*building.count;
					}
				}
			}
			if (building.boosts !== null) {
				for (let boost of building.boosts) {
					let percentChar = (boost.type.includes("action_points") ? " " : "% ")
					out += srcLinks.icons(boost.type)+boost.value+percentChar;
					CityMap.QI.stats.boosts.hasOwnProperty(boost.type) ? CityMap.QI.stats.boosts[boost.type] += boost.value*building.count : CityMap.QI.stats.boosts[boost.type] = boost.value*building.count;
				}
			}
			out += "</td></tr>";
		}
		out += "</tbody></table>";

		let stats = CityMap.showQIStats();

		return stats + out;
	},


	setQIBuilding: (data) => {
		let production = data.components?.AllAge?.production?.options
		if (production !== undefined && production.length === 1) // goods and units have multiple production options, rest has one
			production = data.components?.AllAge?.production?.options[0]?.products[0]?.playerResources?.resources
		else if (production !== undefined && production.length > 1) 
			production = data.components?.AllAge?.production?.options[3]?.products[0]?.requirements?.resources
		if (data.type === "main_building")
			production = data.available_products[0].product.resources

		let euphoria = data.components?.AllAge?.staticResources?.resources?.resources?.guild_raids_happiness
		let boosts = data.components?.AllAge?.boosts?.boosts
		let population = data.components?.AllAge?.staticResources?.resources?.resources.guild_raids_population

		return {
			name: data.name,
			boosts: boosts || null,
			euphoria: euphoria || 0,
			population: population || 0,
			production: production || null,
			type: data.type,
			entityId: data.asset_id,
			count: 1,
		}
	},


	setOutpostBuilding: (data) => {
		let production = data.components?.AllAge?.production?.options;
		if (production !== undefined && production.length === 1) // goods and units have multiple production options, rest has one
			production = data.components?.AllAge?.production?.options[0]?.products[0]?.playerResources?.resources;
		else if (production !== undefined && production.length > 1) 
			production = data.components?.AllAge?.production?.options[3]?.products[0]?.requirements?.resources;
		if (data.type === "main_building" || data.type === "residential")
			production = data.available_products[0]?.product?.resources;

		// grab the name of the population from the building id
		/// cultural settlements
		let populationName = data.id.split("_")[1].toLowerCase(); // id parts: vikings, japanese, egyptians, aztecs, muhgals, polynesia
		/// era settlements
		if (ActiveMap === "era_outpost") populationName = "colonists";

		// for buildings adding pop
		let population = Object.keys(data.staticResources?.resources).find(x => x.includes(populationName))
		population = data.staticResources?.resources[population];
		// for buildings requiring pop
		if (population === undefined) {
			population = Object.keys(data.requirements?.cost?.resources).find(x => x.includes(populationName))
			population = data.requirements.cost?.resources[populationName]*-1;
		}
		let diplomacy = data.staticResources?.resources?.diplomacy || 0;

		let building = {};
		if (ActiveMap === "cultural_outpost")
			building = {
				name: data.name,
				population: population || 0,
				production: production || null,
				diplomacy: diplomacy,
				type: data.type,
				entityId: data.asset_id,
			};
		else if (ActiveMap === "era_outpost")
			building = {
				name: data.name,
				population: population || 0,
				production: production || null,
				diplomacy: null,
				type: data.type,
				entityId: data.asset_id,
			};

		return building;
	},


	showOutpostBuildings: () => {
		let buildings = Object.values(CityMap.CulturalOutpost.data);
		if (ActiveMap === "era_outpost")
			buildings = Object.values(CityMap.EraOutpost.data);

		let uniques = {};
		for (let b of buildings) {
			if (!uniques[b.cityentity_id]) 
				uniques[b.cityentity_id] = 1
			else 
				uniques[b.cityentity_id] += 1
		}

		let uniqueBuildings = [];
		for (let [id,count] of Object.entries(uniques)) {
			let building = CityMap.setOutpostBuilding(MainParser.CityEntities[id]);
			building.count = count;
			uniqueBuildings.push(building);
		}

		uniqueBuildings.sort((a, b) => {
			if (a.entityId < b.entityId) return -1
			if (a.entityId > b.entityId) return 1
			return 0
		});

		let out = '<table class="foe-table allBuildings">'
		out += `<thead><tr>
			<th colspan="2">${i18n('Boxes.CityMap.Building')}</th>
			<th class="population textright"></th>
			<th><span class="goods-sprite ${(ActiveMap !== "era_outpost"?'diplomacy':'')}"></span></th>
			<th>${i18n('Boxes.CityMap.Boosts')}</th></tr></thead>`
		out += "<tbody>"

		let totals = {
			diplomacy: 0,
			population: 0,
		};
		for (let building of uniqueBuildings) {
			if (building.type !== "impediment" && building.type !== "street" && building.type !== "off_grid") {				
				out += "<tr class='"+building.type+"'>" + 
					"<td><div class='building' data-original-title='"+building.name+"'>" + 
						"<img src='" + srcLinks.get("/city/buildings/"+building.entityId.replace(/^(\D_)(.*?)/,"$1SS_$2")+".png",true) + "'>" +
					"</div></td>" +
					"<td>" + (building.count>1?"x"+building.count:"") + "</td>";
				out += '<td class="textright">' + building.population + "</td>";
				out += '<td class="textright">' + (building.diplomacy>0?building.diplomacy:'') + "</td>";
				out += "<td>";
				if (building.production !== null) {
					for (let [prod, value] of Object.entries(building.production)) {
						out += srcLinks.icons(prod)+HTML.Format(Math.round(value))+" ";
					}
				}
				out += "</td></tr>";

				if (building.diplomacy>0) {
					totals.diplomacy += building.diplomacy*building.count;
				}
				totals.population += building.population*building.count;
			}
		}

		let meta = "";
		if (totals.diplomacy > 0) {
			meta += `<div class="metaSums p5 text-center">
						<i>${i18n('Boxes.CityMap.QIHint')}</i><br/> 
						<span class="population"></span>${totals.population}
						<span class="goods-sprite diplomacy"></span>${totals.diplomacy}
					</div>`;
		}

		out += "</tbody></table>";
		return meta + out;
	},


	/**
	 * Asynchronously sets and renders buildings on the map depending on the active map type and provided data.
	 *
	 * This function clears the currently displayed map, initializes metrics for various building types,
	 * and determines the placement and characteristics of buildings to be displayed on the grid. Metrics
	 * are updated based on building attributes, and additional styles and highlights are applied to the
	 * rendered elements.
	 *
	 * Key functionalities:
	 * - Resets the map for specific active map types (`cultural_outpost`, `era_outpost`, or `guild_raids`)
	 *   or proceeds with city or other player map configurations.
	 * - Clears all previous map elements such as previously drawn buildings or roads.
	 * - Recalculates city metrics including counts and areas for roadless buildings, connected buildings,
	 *   limited buildings, decayed buildings, and others.
	 * - Constructs a grid bounding box for the map with default dimensions and constraints.
	 * - Creates visual representations of buildings based on their attributes (e.g., type, state, size,
	 *   connectivity) and assigns corresponding CSS classes for styling and tooltips for additional details.
	 * - Highlights "old" buildings based on their era relative to the current era.
	 * - Computes efficiency factors related to road usage and sets up drag-and-drop functionality for the map grid.
	 *
	 * Metrics:
	 * - Keeps track of different building types, area metrics, and available space for buildings.
	 * - Differentiates buildings by their requirements, such as streets, and their states, such as decayed or ascendable.
	 *
	 * Highlights:
	 * - Applies specific style classes to buildings based on their rating, era, and other attributes.
	 * - Supports differentiation for buildings from external sources like expeditions or guild battlegrounds.
	 *
	 * @param {Object|null} [Data=null] - Input data used to populate the buildings on the map.
	 *                                    Defaults to `null` and uses internal map data when not provided.
	 *
	 * @returns {Promise<void>}
	 */
	SetMapBuildings: async (Data = null)=> {
		if (ActiveMap === "cultural_outpost" || ActiveMap === "era_outpost" || ActiveMap === "guild_raids") {
			CityMap.SetOutpostBuildings();
			return;
		}

		let ActiveId = $('#grid-outer').find('.highlighted').data('entityid') || null;

		// einmal komplett leer machen, wenn gewünscht
		$('#grid-outer').find('.map-bg').remove();
		$('#grid-outer').find('.entity').remove();

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
		}
		let StreetsNeeded = 0;

		CityMap.BuildGrid();

		let MinX = 0,
			MinY = 0,
			MaxX = 71,
			MaxY = 71;

		let buildingData;
		if (ActiveMap === 'OtherPlayer')
			buildingData = CityBuildings.createBuildings(Object.values(CityMap.OtherPlayer.mapData))
		else
			buildingData = CityBuildings.createBuildings(Object.values(MainParser.CityMapData))

		// find highest rating in all buildings, do not include roads
		let buildingsWithoutStreets = Object.values(buildingData).filter((x) => x.type !== "street");
		let buildingRatings = Object.values(buildingsWithoutStreets).map((x) => parseInt(x.rating.totalScore *100));
		buildingRatings.sort((a, b) => {
			if (a < b) return -1
			if (a > b) return 1
			return 0
		});
		let rating10 = buildingRatings[parseInt(buildingRatings.length/10)];
		let rating20 = buildingRatings[parseInt(buildingRatings.length/5)];
		let rating30 = buildingRatings[parseInt(buildingRatings.length/3)];

		let unlockedAreas = (ActiveMap === 'OtherPlayer' ? CityMap.OtherPlayer.unlockedAreas : CityMap.Main.unlockedAreas);

		// create building elements
		for (const building of Object.values(buildingData)) {
			if (building.coords.x < MinX || building.coords.x > MaxX || building.coords.y < MinY || building.coords.y > MaxY) continue

			let x = (building.coords.x === undefined ? 0 : parseInt((building.coords.x * CityMap.map.gridSize))),
			y = (building.coords.y === undefined ? 0 : parseInt((building.coords.y * CityMap.map.gridSize))),
			xsize = (building.size.width * CityMap.map.gridSize),
			ysize = (building.size.length * CityMap.map.gridSize)

			let noStreet = (building.needsStreet === 0 ? ' noStreet' : '');
			let isLimited = (building.isLimited ? ' isLimited' : '');
			let fromQI = (building.entityId.includes("_GR") ? ' fromQI' : '');
			let fromGBG = (building.entityId.includes("_GBG") ? ' fromGBG' : '');
			let canAscend = (await CityBuildings.canAscend(building.entityId) ? ' ascendable' : '');
			let isDecayed = (building.state.isDecayed ? ' decayed' : '');
			let isSpecial = (building.isSpecial ? ' special' : '');
			let chainBuilding = (building.chainBuilding !== undefined ? ' chain' : '');
			let setBuilding = (building.setBuilding !== undefined ? ' set' : '');
			let rating = (building.rating?.totalScore*100 <= (rating10) ? ' rating10' : 
						(building.rating?.totalScore*100 <= (rating20) ? ' rating20' :	
						(building.rating?.totalScore*100 <= (rating30) ? ' rating30' : '')))
			
			let f = $('<span '+ MainParser.Allies.tooltip(building.id) + '/>').addClass('entity helperTT ' + building.type + noStreet + isSpecial + canAscend + isDecayed + chainBuilding + setBuilding + rating + isLimited + fromQI + fromGBG).css({
				width: xsize + 'em',
				height: ysize + 'em',
				left: x + 'em',
				top: y + 'em'
			})
				.attr('data-callback_tt','Tooltips.buildingTT')
				.attr('data-era', building.eraName)
				.attr('data-size', building.size.length + 'x' + building.size.width)
				.attr('data-id', building.id)
				.attr('data-title', building.name)
				.attr('data-meta_id',building.entityId)
				.on('click', function() {
					let chainId = $(this).attr('data-chain-id');
					let setId = $(this).attr('data-set-id');
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
			if (building.type === "street") {
				CityMap.metrics.roads++;
				CityMap.metrics.roadsArea += building.size.width * building.size.length;
			}
			else {
				CityMap.metrics.buildings++;
				if (building.needsStreet === 0) {
					CityMap.metrics.roadlessBuildings++;
					CityMap.metrics.roadlessBuildingsArea += building.size.width * building.size.length;
				}
				else if (building.needsStreet !== 0 && building.state.connected) {
					CityMap.metrics.connectedBuildings++;
					CityMap.metrics.connectedBuildingsArea += building.size.width * building.size.length;
				}

				if (canAscend !== '') {
					CityMap.metrics.ascendableBuildings++;
					CityMap.metrics.ascendableBuildingsArea += building.size.width * building.size.length;
				}
				if (building.state.isDecayed) {
					CityMap.metrics.decayedBuildings++;
					CityMap.metrics.decayedBuildingsArea += building.size.width * building.size.length;
				}
				else if (building.isLimited) {
					CityMap.metrics.limitedBuildings++;
					CityMap.metrics.limitedBuildingsArea += building.size.width * building.size.length;
				}

				if (building.chainBuilding !== undefined) {
					CityMap.metrics.chainBuildings++;
					CityMap.metrics.chainArea += building.size.width * building.size.length;
				}
				if (building.setBuilding !== undefined) {
					CityMap.metrics.setBuildings++;
					CityMap.metrics.setArea += building.size.width * building.size.length;
				}

				if (building.entityId.includes("_GR")) {
					CityMap.metrics.qiBuildings++;
					CityMap.metrics.qiArea += building.size.width * building.size.length;
				}
				else if (building.entityId.includes("_GBG")) {
					CityMap.metrics.gbgBuildings++;
					CityMap.metrics.gbgArea += building.size.width * building.size.length;
				}
				else if (building.entityId.includes("_Expedition")) {
					CityMap.metrics.geBuildings++;
					CityMap.metrics.geArea += building.size.width * building.size.length;
				}
			}

			CityMap.metrics.areaOccupied += (building.size.width * building.size.length);
			if (!CityMap.metrics.buildingAreas[building.type]) 
				CityMap.metrics.buildingAreas[building.type] = 0;
			CityMap.metrics.buildingAreas[building.type] += (building.size.width * building.size.length);
			if (!CityMap.metrics.buildingTypes[building.type]) 
				CityMap.metrics.buildingTypes[building.type] = 0;
			CityMap.metrics.buildingTypes[building.type]++;
			CityMap.metrics.area = ((unlockedAreas?.length || 1) -1) * 16 + 256; // x + (4*4) + 16*16
			CityMap.metrics.areaAvailable = CityMap.metrics.area - CityMap.metrics.areaOccupied;
			StreetsNeeded += (building.state.connected && building.type !== "street" ? parseFloat(Math.min(building.size.width, building.size.length)) * building.needsStreet / 2 : 0)

			// highlights for older buildings
			if (building.eraName) {
				let era = Technologies.Eras[building.eraName]

				if (era < CurrentEraID && building.type !== "greatbuilding" && era !== 0) {
					f.addClass('oldBuildings')
					let eraDiff = CurrentEraID - era
					
					switch(eraDiff){
						case 1:
							f.addClass('older-1');
							break;

						case 2:
							f.addClass('older-2');
							break;

						case 3:
							f.addClass('older-3');
							break;

						default: 
							f.addClass('too-old');
							break;
					}
                }
			}

			// size changed, activate again
			if (ActiveId !== null && ActiveId === building.id) {
				f.addClass('highlighted');
			}

			$('#map-buildings').append( f );
		}

		let StreetsUsed = CityMap.metrics.buildingAreas['street'] | 0;
		CityMap.EfficiencyFactor = StreetsNeeded / StreetsUsed;

		$('#grid-outer').draggable();
		CityMap.getAreas();
		
		$('[data-original-title]').tooltip({
			container: 'body',
			html: true,
		});
	},


	/**
	 * Updates and manages the display of area-related statistics and highlights on the CityMap.
	 * This function calculates total areas, occupied areas, and free areas, and updates
	 * the relevant UI elements in the sidebar. It also provides detailed breakdowns of
	 * building types and their associated statistics. Additionally, it manages interactive
	 * UI elements for highlighting specific categories of buildings.
	 *
	 * Functionality includes:
	 * - Calculating total, occupied, and free areas.
	 * - Rendering and updating the sidebar with building and area statistics.
	 * - Sorting and displaying building types by count with visual and numerical indicators.
	 * - Providing interactive options to highlight specific building subsets, such as roadless
	 *   buildings, buildings from special sources, and buildings based on certain conditions.
	 * - Managing the display of building stats legends related to building age and other properties.
	 *
	 * Notes:
	 * - The method dynamically creates and updates elements in the DOM, specifically within
	 *   the sidebar and the "#area-state" and "#map-stats" containers.
	 * - Highlights include clickable elements to toggle visibility or settings for subsets of buildings.
	 * - Uses localization (`i18n`) for consistent support across multiple languages.
	 * - Depends on various global variables such as `CityMap`, `ActiveMap`, and `srcLinks`.
	 */
	getAreas: ()=>{
		let unlockedAreas = (ActiveMap === 'OtherPlayer' ? CityMap.OtherPlayer.unlockedAreas : CityMap.Main.unlockedAreas);
		let total = (((unlockedAreas?.length || 1) -1) * 16) + 256, // x + (4*4) + 16*16
			occupied = CityMap.metrics.areaOccupied,
			txtFree = (total - occupied);

		if( $('#area-state').length === 0 ) {
			let aW = $('<div id="area-state" />');
			let aS = $('<div id="map-stats" />');

			aW.append( $('<div class="building-count-area" />') );
			aW.append( $('<p class="too-old-legends" />').hide() );
			aS.append( $('<div class="building-stats" />') );

			aW.prepend(aS)
			$('#sidebar').append(aW);
			$('#sidebar').addClass('main');
		}


		if (ActiveMap !== 'OtherPlayer') {
			$('.building-stats').html(
				'<img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)+'" />'+
				'<span data-original-title="'+i18n('Boxes.CityMap.FreeArea')+'">' + txtFree + 
				'</span> / <span data-original-title="'+i18n('Boxes.CityMap.WholeArea')+'">' + total + '</span>').addClass('text-right');
		}

		let sortedBldTypes = [];
		for(let x in CityMap.metrics.buildingTypes) sortedBldTypes.push([x, CityMap.metrics.buildingTypes[x]]);
		sortedBldTypes.sort((a, b) => a[1] - b[1]);
		sortedBldTypes.reverse();

		let areaStats = [];
		areaStats.push('<p class="text-center"><b>'+ CityMap.metrics.buildings +' '+ i18n('Boxes.CityMap.BuildingsAmount') + '</b></p>');
		areaStats.push('<ul>');
		for(let x in sortedBldTypes) {
			if(!sortedBldTypes.hasOwnProperty(x)) break;

			let type = sortedBldTypes[x][0];

			let TypeName = i18n('Boxes.CityMap.' + type)
			const count = sortedBldTypes[x][1];
			const pct = parseFloat(100*count/CityMap.metrics.buildings).toFixed(1);

			let str = `<span data-original-title="${pct}%"><span class="square ${type}"></span>${count}x ${TypeName}</span> <span><img src="${srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)}" />${CityMap.metrics.buildingAreas[type]}</span>`;

			if (type === 'street') {
				str = `<span data-original-title="${pct}%"><span class="square ${type}"></span>${count}x ${TypeName}</span> <small class="street-eff">${HTML.Format(Math.round(CityMap.EfficiencyFactor * 10000) / 100)}% ${i18n('Boxes.Citymap.Efficiency')}</small>`;
			}
			str = `<li>${str}</li>`;
			areaStats.push(str);
		}
		areaStats.push('</ul>');

		areaStats.push(`<b>${i18n('Boxes.CityMap.Highlight')}</b>`)
		areaStats.push('<ul class="highlight-map">' +
			'<li onClick="CityMap.highlightNoStreetBuildings()" class="clickable"><span data-original-title="'+i18n('Boxes.CityMap.roadless')+', '+parseFloat(100*CityMap.metrics.roadlessBuildings/CityMap.metrics.buildings).toFixed(1)+'%"><img src="'+srcLinks.get(`/shared/gui/buffbar/buffbar_icon_buff_unconnected.png`,true)+'" />' + CityMap.metrics.roadlessBuildings + '</span> <span><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)+'" />' + CityMap.metrics.roadlessBuildingsArea + '</span></li>' +
			'<li onClick="CityMap.highlightGBGBuildings()" class="clickable"><span data-original-title="'+i18n('Boxes.CityMap.buildingFromGBG')+', '+parseFloat(100*CityMap.metrics.gbgBuildings/CityMap.metrics.buildings).toFixed(1)+'%"><img src="'+srcLinks.get(`/cash_shop/gui/cash_shop_icon_navi_gbg_selected.png`,true)+'" />' + CityMap.metrics.gbgBuildings + '</span> <span><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)+'" />' + CityMap.metrics.gbgArea+ '</span></li>' +
			'<li onClick="CityMap.highlightQIBuildings()" class="clickable"><span data-original-title="'+i18n('Boxes.CityMap.buildingFromQI')+', '+parseFloat(100*CityMap.metrics.qiBuildings/CityMap.metrics.buildings).toFixed(1)+'%"><img src="'+srcLinks.get(`/guild_raids/windows/guild_raids_guild_raid_emblem.png`,true)+'" />' + CityMap.metrics.qiBuildings + '</span> <span><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)+'" />' + CityMap.metrics.qiArea+ '</span></li>' + 
			'<li onClick="CityMap.highlightLimitedBuildings()" class="clickable"><span data-original-title="'+i18n('Boxes.CityMap.limited')+', '+parseFloat(100*CityMap.metrics.limitedBuildings/CityMap.metrics.buildings).toFixed(1)+'%"><img src="'+srcLinks.get(`/shared/gui/upgrade/upgrade_icon_limited_building.png`,true)+'" />' + CityMap.metrics.limitedBuildings + '</span> <span><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)+'" />' + CityMap.metrics.limitedBuildingsArea + '</span></li>' +
			'<li onClick="CityMap.highlightAscendableBuildings()" class="clickable"><span data-original-title="'+i18n('Boxes.CityMap.ShowAscendableBuildings')+', '+parseFloat(100*CityMap.metrics.ascendableBuildings/CityMap.metrics.buildings).toFixed(1)+'%"><img src="'+srcLinks.get(`/shared/icons/limited_building_upgrade.png`,true)+'" />' + CityMap.metrics.ascendableBuildings + '</span> <span><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)+'" />' + CityMap.metrics.ascendableBuildingsArea + '</span></li>' +
			'<li onClick="CityMap.highlightDecayedBuildings()" class="clickable"><span data-original-title="'+i18n('Boxes.CityMap.ShowDecayedBuildings')+', '+parseFloat(100*CityMap.metrics.decayedBuildings/CityMap.metrics.buildings).toFixed(1)+'%"><img style="filter:saturate(0.5)" src="'+srcLinks.get(`/shared/icons/limited_building_downgrade.png`,true)+'" />' + CityMap.metrics.decayedBuildings + '</span> <span><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)+'" />' + CityMap.metrics.decayedBuildingsArea + '</span></li>' +
			'<li onClick="CityMap.highlightChainBuildings()" class="clickable"><span data-original-title="'+i18n('Boxes.CityMap.ChainBuildings')+', '+parseFloat(100*CityMap.metrics.chainBuildings/CityMap.metrics.buildings).toFixed(1)+'%"><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)+'" />' + CityMap.metrics.chainBuildings + '</span> <span><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)+'" />' + CityMap.metrics.chainArea + '</span></li>' +
			'<li onClick="CityMap.highlightSetBuildings()" class="clickable"><span data-original-title="'+i18n('Boxes.CityMap.SetBuildings')+', '+parseFloat(100*CityMap.metrics.setBuildings/CityMap.metrics.buildings).toFixed(1)+'%"><img src="'+srcLinks.get(`/shared/gui/upgrade/upgrade_icon_limited_building.png`,true)+'" />' + CityMap.metrics.setBuildings + '</span> <span><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)+'" />' + CityMap.metrics.setArea + '</span></li>');

		areaStats.push('<li class="ratings clickable">')
			areaStats.push(`<label for="show-worst-buildings"><input type="checkbox" id="show-worst-buildings" onclick="CityMap.highlightWorstBuildings()" /> ${i18n('Boxes.CityMap.ShowWorstBuildings')}</label>`)
			if (ActiveMap !== 'OtherPlayer') 
				areaStats.push('<span onclick="Productions.ShowRating()" class="clickable"></span>')
		areaStats.push('</li>')

		if (ActiveMap !== 'OtherPlayer') 
			areaStats.push(`<li class="clickable"><label for="highlight-old-buildings"><input type="checkbox" id="highlight-old-buildings" onclick="CityMap.highlightOldBuildings()"> ${i18n('Boxes.CityMap.HighlightOldBuildings')}</label></li>`)
		areaStats.push('</ul>')

		// let cityEfficiency = parseFloat(CityMap.metrics.connectedBuildingsArea / CityMap.metrics.roadsArea * 100).toFixed(0);
		// areaStats.push('<p data-original-title="'+i18n('Boxes.CityMap.CityGridScoreText')+'" class="text-center"><b>'+i18n('Boxes.CityMap.CityGridScore')+':</b> '+cityEfficiency+'</p>');

		$('.building-count-area').html(areaStats.join('')).promise().done(function() {
			$('.building-count-area ul.highlight-map li').click(function(){
				$(this).toggleClass('active');
			})
		});
		
		let legends = [];
		
		legends.push(`<span class="older-1 diagonal"></span> ${$('#map-container .older-1').length} ${i18n('Boxes.CityMap.OlderThan1Era')}<br>`);
		legends.push(`<span class="older-2 diagonal"></span> ${$('#map-container .older-2').length} ${i18n('Boxes.CityMap.OlderThan2Era')}<br>`);
		legends.push(`<span class="older-3 diagonal"></span> ${$('#map-container .older-3').length} ${i18n('Boxes.CityMap.OlderThan3Era')}<br>`);
		legends.push(`<span class="too-old diagonal"></span> ${$('#map-container .too-old').length} ${i18n('Boxes.CityMap.OlderThan4Era')}<br>`);

		$('.too-old-legends').html(legends.join(''));
	},


	/**
	 * Generates a hash code for a given string.
	 *
	 * @param {string} str - The input string for which the hash code will be generated.
	 * @returns {number} The computed hash code for the given string.
	 */
	hashCode: (str)=>{
		return str.split('').reduce((prevHash, currVal) => (((prevHash << 5) - prevHash) + currVal.charCodeAt(0))|0, 0);
	},


	/**
	 * Displays the submit box for the City Map feature.
	 *
	 * This function manages the visibility of the City Map Submit Box. If the box is already present
	 * in the DOM, it removes it. If the box is not present, it creates a new submit box with the necessary
	 * content and styling. The box includes a localized title and description, as well as a button
	 * that triggers the `CityMap.SubmitData` functionality.
	 *
	 * Dependencies:
	 * - Requires the presence of the `HTML.Box` and `HTML.AddCssFile` functions for creating the box
	 *   and applying styles.
	 * - Utilizes the `i18n` function for localization of text elements.
	 * - Expects an element with `id="CityMapSubmitBody"` to populate with box content.
	 *
	 * Side effects:
	 * - Adds or removes the submit box in the DOM.
	 * - Dynamically loads the `citymap` CSS file if it doesn't already exist in the scope.
	 */
	showSubmitBox: () => {
		let $CityMapSubmit = $('#CityMapSubmit');

		if ($CityMapSubmit.length > 0) {
			$CityMapSubmit.remove();
		}

		if ($CityMapSubmit.length < 1) {
			HTML.Box({
				'id': 'CityMapSubmit',
				'title': i18n('Boxes.CityMap.TitleSend'),
				'auto_close': true,
				'saveCords': false
			});

			HTML.AddCssFile('citymap');

			let desc = '<p class="text-center">' + i18n('Boxes.CityMap.Desc1') + '</p>';
			desc += '<p class="text-center" id="msg-line"><button class="btn" onclick="CityMap.SubmitData()">' + i18n('Boxes.CityMap.Submit') + '</button></p>';

			$('#CityMapSubmitBody').html(desc);
		}
	},


	highlightOldBuildings: ()=> {
		$('.oldBuildings').toggleClass('diagonal');
		$('.too-old-legends').slideToggle();
	},


	/**
	 * Highlights all buildings belonging to the same chain or set.
	 *
	 * @param {string} id - The chain ID or set ID.
	 * @param {string} type - 'chain' or 'set'.
	 */
	highlightRelatedBuildings: (id, type) => {
		let spans = $('span.entity');
		let found = false;

		for (let sp of spans) {
			let chainId = $(sp).attr('data-chain-id');
			let setId = $(sp).attr('data-set-id');

			if ((type === 'chain' && chainId === id) || (type === 'set' && setId === id)) {
				$(sp).addClass('highlighted');
				found = true;
			} else {
				$(sp).removeClass('highlighted');
			}
		}

		if (found) {
			$('#grid-outer').addClass('desaturate');
		} else {
			$('#grid-outer').removeClass('desaturate');
		}
	},


	highlightNoStreetBuildings: ()=> {
		$('.noStreet').toggleClass('highlight');
	},


	highlightAscendableBuildings: ()=> {
		$('.ascendable').toggleClass('highlight2');
	},


	highlightDecayedBuildings: ()=> {
		$('.decayed').toggleClass('highlight3');
	},


	highlightLimitedBuildings: ()=> {
		$('#grid-outer').toggleClass('showLimited');
	},


	highlightGBGBuildings: ()=> {
		$('#grid-outer').toggleClass('showGBG');
	},


	highlightChainBuildings: ()=> {
		$('#grid-outer').toggleClass('showChains');
	},


	highlightSetBuildings: ()=> {
		$('#grid-outer').toggleClass('showSets');
	},


	highlightQIBuildings: ()=> {
		$('#grid-outer').toggleClass('showQI');
	},


	highlightWorstBuildings: ()=> {
		$('.rating10').toggleClass('highlight4');
		$('.rating20').toggleClass('highlight4');
		$('.rating30').toggleClass('highlight4');
	},


	/**
	 * Collects and submits the city map data to the server.
	 *
	 * This method gathers information about the current player, their active map's entities,
	 * unlocked areas, blocked areas, goods, and city entities. It then sends this data
	 * to the server via `MainParser.send2Server`. Upon successful submission, a toast message is
	 * displayed. In case of an error, an error toast message is shown.
	 *
	 * Workflow:
	 * - Validates the existence of an API token.
	 * - Identifies the active map and retrieves corresponding entity and area data.
	 * - Compiles a data object including player info, map data, and various city entities.
	 * - Sends the compiled data to the 'CityPlanner' endpoint on the server.
	 * - Displays success or error feedback through toast notifications.
	 * - Removes the submission button after completion.
	 */
	SubmitData: ()=> {
		let apiToken = localStorage.getItem('ApiToken');

		if(apiToken === null) {
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

		let currentDate = new Date(),
			d = {
				time: currentDate.toISOString().split('T')[0] + ' ' + currentDate.getHours() + ':' + currentDate.getMinutes() + ':' + currentDate.getSeconds(),
				player: {
					name: ExtPlayerName,
					id: ExtPlayerID,
					world: ExtWorld,
					avatar: ExtPlayerAvatar,
					avatarUrl: srcLinks.GetPortrait(ExtPlayerAvatar)
				},
				apiToken: apiToken,
				type: ActiveMap === 'cultural_outpost' ? localStorage.getItem('OutpostType') : (ActiveMap === 'era_outpost' ? 'era_outpost' : (ActiveMap === 'guild_raids' ? 'guild_raids' : 'main')),
				eras: Technologies.Eras,
				entities: CityMap.removeDoubleUnderscoreKeys(entities),
				areas: CityMap.removeDoubleUnderscoreKeys(areas),
				blockedAreas: CityMap.removeDoubleUnderscoreKeys(blockedAreas),
				goods: GoodsData,
				cityEntities: CityMap.removeDoubleUnderscoreKeys(MainParser.CityEntities),
				allEntities: CityMap.removeDoubleUnderscoreKeys(Outposts.Advancements),
				mainEntities: ActiveMap !== 'main' ? CityMap.removeDoubleUnderscoreKeys(MainParser.CityMapData) : null
			};

		MainParser.send2Server(d, 'CityPlanner', function(resp){

			if(resp.status === 'OK') {
				HTML.ShowToastMsg({
					head: i18n('Boxes.CityMap.SubmitSuccessHeader'),
					text: [
						i18n('Boxes.CityMap.SubmitSuccess'),
						'<a target="_blank" href="https://foe-helper.com/citymap/overview">foe-helper.com</a>'
					],
					type: 'success',
					hideAfter: 10000,
				});
			}
			else {
				HTML.ShowToastMsg({
					head: i18n('Boxes.CityMap.SubmitErrorHeader'),
					text: resp['msg'],
					type: 'error',
					hideAfter: 10000,
				});
			}

			$('#CityMapSubmit').fadeToggle(function(){
				$(this).remove();
			});
		});
	},


	/**
	 * Copies metadata information based on the currently active map and prepares it to be shared via the clipboard.
	 * The method retrieves specific map-related data, removes keys with double underscores, and formats it
	 * into a JSON structure before copying it to the clipboard. A toast message is displayed to indicate success.
	 *
	 * Workflow:
	 * - Determines the active map type (`guild_raids` or others).
	 * - Extracts and processes map data using `CityMap.removeDoubleUnderscoreKeys` for various properties.
	 * - Serializes the processed data to JSON format.
	 * - Copies the serialized data to the clipboard using `helper.str.copyToClipboard`.
	 * - Displays a toast notification upon successful copying.
	 *
	 * Structure of the data object:
	 * - CityMapData: Processed map data related to the city.
	 * - UnlockedAreas: List of areas unlocked in the city.
	 * - CityEntities (if applicable): Entities present in the city.
	 */
	copyMetaInfos: () => {
        let data = {};
        switch (ActiveMap) {
            case 'guild_raids':
                data.CityMapData = CityMap.removeDoubleUnderscoreKeys(CityMap.QI.data);
                data.UnlockedAreas = CityMap.removeDoubleUnderscoreKeys(CityMap.QI.areas);
                break;
            default:
                data.CityMapData = CityMap.removeDoubleUnderscoreKeys(MainParser.CityMapData);
                data.UnlockedAreas = CityMap.removeDoubleUnderscoreKeys(CityMap.Main.unlockedAreas);
				data.CityEntities = CityMap.removeDoubleUnderscoreKeys(MainParser.CityEntities);
                break;
        }
        data.CityEntities = CityMap.removeDoubleUnderscoreKeys(MainParser.CityEntities);

        helper.str.copyToClipboard(
            JSON.stringify(data)
        ).then(() => {
            HTML.ShowToastMsg({
                head: i18n('Boxes.CityMap.ToastHeadCopyData'),
                text: i18n('Boxes.CityMap.ToastBodyCopyData'),
                type: 'info',
                hideAfter: 4000,
            })
        });
	},


	GetBuildingSize: (CityMapEntity) => {
		let CityEntity = MainParser.CityEntities[CityMapEntity['cityentity_id']];

		let Ret = {};

		Ret['is_connected'] = (CityMapEntity['state']?.__class__ !== 'UnconnectedState' && CityMapEntity['state']?.pausedAt === undefined && CityMapEntity['state']?.pausedState === undefined);

		if (CityEntity['requirements']) {
			Ret['xsize'] = CityEntity['width'];
			Ret['ysize'] = CityEntity['length'];

			if (!['street','main_building'].includes(CityEntity['type'])) {
				Ret['streets_required'] = CityEntity['requirements']['street_connection_level'] | 0;
			}
			else {
				Ret['streets_required'] = 0;
			}
		}
		else {
			let Size = CityEntity?.components?.AllAge?.placement?.size;

			Ret['xsize'] = Size?.x || 0;
			Ret['ysize'] = Size?.y || 0;
			Ret['streets_required'] = CityEntity?.components?.AllAge?.streetConnectionRequirement?.requiredLevel | 0;
		}

		Ret['building_area'] = Ret['xsize'] * Ret['ysize'];
		Ret['street_area'] = (Ret['is_connected'] ? parseFloat(Math.min(Ret['xsize'], Ret['ysize'])) * Ret['streets_required'] / 2 : 0);
		Ret['total_area'] = Ret['building_area'] + Ret['street_area'];

		return Ret;
	},


	filterBuildings: (string) => {
		let spans = $('span.entity');
		if (/[0-9]+x[0-9]*/.test(string)) string = ","+string
		for (let sp of spans) {
			let title = $(sp).attr('data-title') +","+ $(sp).attr('data-size');
			if ((string !== "") && (title.substr(0,title.toLowerCase().indexOf(string.toLowerCase()) > -1))) {
				$(sp).addClass('highlighted');
			} else {
				$(sp).removeClass('highlighted');
			}
		}
		$('#grid-outer').addClass('desaturate');
		if (string === '') {
			$('#grid-outer').removeClass('desaturate');
		}
	},


	/**
	 * @returns {number|string} - The era id for the building
	 */
	GetBuildingEra: (CityMapEntity) => {
		let CityEntity = MainParser.CityEntities[CityMapEntity['cityentity_id']];

		// Great building
		if (CityEntity['type'] === 'greatbuilding') {
			return CurrentEraID;
		}
		// AllAge
		else if (CityMapEntity['cityentity_id'].indexOf("AllAge") > -1) {
			return CurrentEraID;
		}
		// Multi era
		else if (CityMapEntity['level']) {
			return CityMapEntity['level'] + 1;
		}
		// new format
		else if (CityEntity?.components?.AllAge?.era?.era) {
			return Technologies.Eras[CityEntity.components.AllAge.era.era];
		}
		// Zeitalter suchen
		else {
			let regExString = new RegExp("(?:_)((.[\\s\\S]*))(?:_)", "ig"),
				testEra = regExString.exec(CityMapEntity['cityentity_id']);

			if (testEra && testEra.length > 1) {
				let era = Technologies.Eras[testEra[1]];

				// AllAge => Current era
				if (era === 0) {
					era = CurrentEraID;
				}
				return era;
			}
			else {
				return CurrentEraID;
			}
		}
	},


	/**
	 * Removes all keys from an object that start with "__class__" or "__enum__", including keys in nested objects or arrays.
	 *
	 * @param {Object|Array} obj - The object or array to process. Non-object or null values are returned as-is.
	 * @return {Object|Array} A new object or array with the specified keys removed, preserving the structure of the input.
	 */
	removeDoubleUnderscoreKeys (obj) {
		if (typeof obj !== 'object' || obj === null) {
			return obj; // Only process objects/arrays
		}

		if (Array.isArray(obj)) {
			return obj.map(item => CityMap.removeDoubleUnderscoreKeys(item)); // Process arrays recursively
		}

		const newObj = {};

		for (const key in obj) {
			if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

			const value = obj[key];

			// Remove any keys that start with "__class__" or "__enum__"
			if (key.startsWith('__class__') || key.startsWith('__enum__')) {
				continue;
			}

			// Keep everything else, but apply the rule recursively to nested structures
			newObj[key] = CityMap.removeDoubleUnderscoreKeys(value);
		}

		return newObj;
	},
};