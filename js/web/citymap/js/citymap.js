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
 * CityMap class
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

	AscendingBuildings: new Promise((resolve) => {
		let timer = () => {
			if (!MainParser.BuildingUpgrades) {
				setTimeout(timer,500)
			} else {
				resolve (Object.assign({},...Object.values(MainParser.BuildingUpgrades).filter(x => x.upgradeItem.id.includes("ascended")).map(x=>x.upgradeSteps[0].buildingIds.map((Id,i)=>({[Id]:x.upgradeSteps[1].buildingIds[i]}))).flat())) 
			}
		}
		timer()
	  }),

	/**
	 * @param event
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
	 * Sidebar Menu
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
			$('#citymap-wrapper').append('<img class="clickable openOverview" data-original-title="'+i18n('Menu.OutP.Title')+'" onClick="Outposts.BuildInfoBox()" src="' + extUrl + 'css/images/menu/vikings_ship.png">');

		if (ActiveMap === 'OtherPlayer') {
			let townhall = (Object.values(CityMap.OtherPlayer.mapData).find(x => x.type === 'main_building'));
			CityMap.OtherPlayer.eraName = townhall.cityentity_id?.split('_')[1] || townhall.entityId?.split('_')[1];

			$("#sidebar").append($('<a id="openEfficiencyRating" class="btn" onclick="Productions.ShowRating(true,\''+CityMap.OtherPlayer.eraName+'\')">'+ i18n('Menu.ProductionsRating.Title') +'</a>'));
		}
	},


	/**
	 * Builds the background grid
	 */
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
				let hours = Math.round(CityMapEntity.state.next_state_transition_in/60/60*100);
				if (ActiveMap === "guild_raids" && CityMapEntity.state.__class__ === "ProducingState" && CityMapEntity.state.next_state_transition_in < thresholdTime) {
					collectSoon = " collectSoon collect" + (hours < 100 ? "" : hours);
				}
				let collectionString = HTML.i18nReplacer(i18n('Boxes.CityMap.CollectSoon'), {hours: hours/100})
				f = $('<span />').addClass('entity ' + d['type'] + collectSoon).css({
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
			container: '#citymap-main',
			html: true,
		});

		$('#grid-outer').draggable();
	},


	showQIStats: () => {
		if (!CityMap.QI.data) return;

		out = '<div class="qiSums">';
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

		let building = {
			name: data.name,
			boosts: boosts || null,
			euphoria: euphoria || 0,
			population: population || 0,
			production: production || null,
			type: data.type,
			entityId: data.asset_id,
			count: 1,
		}

		return building
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
		out += '<thead><tr><th colspan="2">'+i18n('Boxes.CityMap.Building')+'</th><th class="population textright"></th><th><span class="goods-sprite diplomacy"></span></th>'+
		'<th>'+i18n('Boxes.CityMap.Boosts')+'</th></tr></thead>'
		out += "<tbody>"

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
			}
		}
		out += "</tbody></table>";
		return out;
	},


	/**
	 * Container gemäß den Koordianten zusammensetzen
	 * @param Data
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
		rating10 = buildingRatings[parseInt(buildingRatings.length/10)];
		rating20 = buildingRatings[parseInt(buildingRatings.length/5)];
		rating30 = buildingRatings[parseInt(buildingRatings.length/3)];

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
			let rating = (building.rating?.totalScore*100 <= (rating10) ? ' rating10' : 
						(building.rating?.totalScore*100 <= (rating20) ? ' rating20' :	
						(building.rating?.totalScore*100 <= (rating30) ? ' rating30' : '')))
			
			f = $('<span '+ MainParser.Allies.tooltip(building.id) + '/>').addClass('entity helperTT ' + building.type + noStreet + isSpecial + canAscend + isDecayed + chainBuilding + rating + isLimited + fromQI + fromGBG).css({
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
				.attr('data-meta_id',building.entityId);


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
			CityMap.metrics.area = ((CityMap.Main.unlockedAreas.length -1) * 16) + 256; // x + (4*4) + 16*16
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
			container: '#citymap-main',
			html: true,
		});
	},


	/**
	 * Sidebar for own and other player cities
	 */
	getAreas: ()=>{
		let total = ((CityMap.Main.unlockedAreas.length -1) * 16) + 256, // x + (4*4) + 16*16
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
			'<li onClick="CityMap.highlightDecayedBuildings()" class="clickable"><span data-original-title="'+i18n('Boxes.CityMap.ShowDecayedBuildings')+', '+parseFloat(100*CityMap.metrics.decayedBuildings/CityMap.metrics.buildings).toFixed(1)+'%"><img style="filter:saturate(0.5)" src="'+srcLinks.get(`/shared/icons/limited_building_downgrade.png`,true)+'" />' + CityMap.metrics.decayedBuildings + '</span> <span><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)+'" />' + CityMap.metrics.decayedBuildingsArea + '</span></li>');

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
	 * Create a hash from string
	 */
	hashCode: (str)=>{
		return str.split('').reduce((prevHash, currVal) => (((prevHash << 5) - prevHash) + currVal.charCodeAt(0))|0, 0);
	},


	/**
	 * Show the submit box for foe-helper.com
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


	/**
	 * Sidebar building highlighting
	 */
	highlightOldBuildings: ()=> {
		$('.oldBuildings').toggleClass('diagonal');
		$('.too-old-legends').slideToggle();
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
	highlightQIBuildings: ()=> {
		$('#grid-outer').toggleClass('showQI');
	},
	highlightWorstBuildings: ()=> {
		$('.rating10').toggleClass('highlight4');
		$('.rating20').toggleClass('highlight4');
		$('.rating30').toggleClass('highlight4');
	},


	/**
	 * Send citydata to the foe-helper.com
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
				eras: Technologies.Eras,
				entities: CityMap.removeDoubleUnderscoreKeys(MainParser.CityMapData),
				areas: CityMap.removeDoubleUnderscoreKeys(CityMap.Main.unlockedAreas),
				blockedAreas: CityMap.removeDoubleUnderscoreKeys(CityMap.Main.blockedAreas),
				goods: GoodsData,
				metaIDs: {
					entity: MainParser.MetaIds['city_entities'],
					set: MainParser.MetaIds['building_sets'],
					upgrade: MainParser.MetaIds['building_upgrades']
				}
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
	 * Copy citydata to the clipboard
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

		Ret['is_connected'] = (CityMapEntity['state']['__class__'] !== 'UnconnectedState' && CityMapEntity['state']['pausedAt'] === undefined && CityMapEntity['state']['pausedState'] === undefined);

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
			let Size = CityEntity['components']['AllAge']['placement']['size'];

			Ret['xsize'] = Size['x'];
			Ret['ysize'] = Size['y'];
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
		for (sp of spans) {
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
				era = Technologies.Eras[testEra[1]];

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
	 * Removes any keys that start with "__class__" or "__enum__" from the provided object or its nested structures.
	 * The function traverses objects and arrays recursively to apply the rule at any depth.
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

// // // // // // // // // // // // //
// Data for MainParser.CityBuildingsData
// // // // // // // // // // // // //
let CityBuildings = {
	// returns negative numbers for builidings that use population, 0 for buildings that dont provide or use it
	setPopulation: (metaData, data, era) => {
		let population = 0
		let eraId = Technologies.InnoEras[era]
		
		if (metaData.__class__ !== "GenericCityEntity") { // not a generic building
			if (metaData.entity_levels.length > 0) {  // special building
				if (metaData.entity_levels[eraId].required_population)
					return metaData.entity_levels[eraId].required_population * -1		// needs population, e.g. military
				else if (metaData.entity_levels[eraId].provided_population)
					return metaData.entity_levels[eraId].provided_population			// provides population, e.g. residential
			}
			else if (metaData.requirements) {
				if (metaData.requirements.cost) {
					if (metaData.type === "decoration")
						return 0
					else if (metaData.type === "greatbuilding") 
						if (data.bonus)
							if (data.bonus.type === "population")
								return data.bonus.value
					
					return metaData.requirements.cost.resources.population * -1
				}
			}
		}
		else { // generic building
			if (metaData.components[era]) { // (time) limited buildings lose their era data after expiring
				let staticResources = metaData.components[era].staticResources;
				if (staticResources) {
					population = staticResources.resources.resources.population;
					return population;
				}
			}
		}
		return population
	},

	// returns 0 if building does not provide or substract happiness
	setHappiness(metaData, data, era) {
		let happiness = 0
		let eraId = Technologies.InnoEras[era]
		let isPolivated = CityBuildings.setPolivation(data, metaData)

		let bgHappiness = data.bonus
		if (metaData.__class__ !== "GenericCityEntity") {
			if (metaData.entity_levels.length > 0) { // special building
				if (metaData.entity_levels[eraId].provided_happiness) 
					return (data?.state?.__class__ === "PolishedState" ? metaData.entity_levels[eraId].provided_happiness*2 : metaData.entity_levels[eraId].provided_happiness)
				return happiness
			}
			else if (bgHappiness) { // great building, e.g. Alcatraz
				if (bgHappiness.type === "happiness") 
					return bgHappiness.value
				return 0
			} 
			else if (metaData.provided_happiness) { // decorations etc.
				return (isPolivated ? metaData.provided_happiness*2 : metaData.provided_happiness)
			}
			else 
				return happiness
		}
		else { // generic building
			if (metaData.components[era]) {
				let bHappiness = metaData.components[era].happiness
				if (bHappiness) {
					return (bHappiness.provided ? bHappiness.provided : happiness)
				}
				return happiness
			}
			else if (metaData.components.AllAge) {
				let bHappiness = metaData.components.AllAge.happiness
				if (bHappiness) {
					if (isPolivated) 
						return (bHappiness.provided ? bHappiness.provided*2 : happiness)
					else
						return (bHappiness.provided ? bHappiness.provided : happiness)
				}
				return happiness
			}
		}
	},

	// returns undefined if building cannot be motivated or polished
	setPolivation(data, metaData) { 
		let isPolivationable = false;
		let isPolishable = false;
		metaData.abilities.forEach(ability => {
			if (ability.__class__ === "MotivatableAbility")
				isPolivationable = true
			else if (ability.__class__ === "PolishableAbility") {
				isPolivationable = true
				isPolishable = true
			}
		})
		if (metaData.__class__ === "GenericCityEntity")
			isPolivationable = (metaData.components.AllAge.socialInteraction !== undefined)
		
		if (isPolivationable) {
			if (metaData.__class__ !== "GenericCityEntity") {
				if (data?.state?.boosted)
					return data?.state?.boosted;
				else if (data?.state?.is_motivated) 
					return true;
				else if (isPolishable) { // decorations etc.
					if (data?.state?.next_state_transition_in) 
						return true
				}
				return false
			}
			else { // generic buildings
				if (data?.state?.socialInteractionStartedAt > 0 && data?.state?.socialInteractionId === "polish") {
					if (data?.state?.socialInteractionStartedAt + 43200 - parseInt(Date.now()/1000) < 0)
						return false
					return true
				}
				else if (data?.state?.socialInteractionStartedAt > 0 && data?.state?.socialInteractionId === "motivate") 
					return true
				else
					return false
			}
		}
		return undefined
	},

	// returns undefined if building cannot be motivated or polished
	setPolivationable(metaData) {
		let isPolivationable = false
		metaData.abilities.forEach(ability => {
			if (ability.__class__ === "MotivatableAbility")
				isPolivationable = true
			else if (ability.__class__ === "PolishableAbility") {
				isPolivationable = true
			}
		})
		if (metaData.__class__ === "GenericCityEntity")
			isPolivationable = (metaData.components.AllAge.socialInteraction !== undefined)
		return isPolivationable
	},

	// returns chainId (string), returns undefined if not a chain building
	setChainBuilding(metaData) {
		let chainId = undefined;
		let type = null, x = 0, y = 0;
		if (metaData.__class__ === "GenericCityEntity") {
			chainId = metaData.components?.AllAge?.chain?.chainId;
			type = (metaData.components?.AllAge?.chain?.config?.__class__ === "ChainStartConfig" ? "start" : "link");
			// currently all chains only have ONE side where you can attach builidings (except mughals main building and hippodrome tracks)
			x = metaData.components?.AllAge?.chain?.linkPositions[0].topLeftPoint.x || 0;
			y = metaData.components?.AllAge?.chain?.linkPositions[0].topLeftPoint.y || 0;
		}
		else {
			metaData.abilities.forEach(ability => {
				if (ability.chainId) {
					chainId = ability.chainId
					type = (ability.__class__ === "ChainStartAbility" ? "start" : "link");
					// currently all chains only have ONE side where you can attach builidings (except mughals main building and hippodrome tracks)
					x = ability.linkPositions[0].topLeftPoint.x || 0;
					y = ability.linkPositions[0].topLeftPoint.y || 0;
				}
			});
		}
		if (chainId !== undefined)
			return { name: chainId, type: type, chainPosX: x, chainPosY: y }
	},

	// this creates a pseudo building for effiency ratings etc
	createChainedBuilding(allLinkedBuildings = []) {
		let chainedBuilding = allLinkedBuildings[0]; // first building is the start building

		for (link of allLinkedBuildings) {
			if (link.chainBuilding.type === "start") continue;
			chainedBuilding.size.width = chainedBuilding.size.width + (link.coords.x !== chainedBuilding.coords.x ? link.size.width : 0);
			chainedBuilding.size.length = chainedBuilding.size.length + (link.coords.y !== chainedBuilding.coords.y ? link.size.length : 0);
			chainedBuilding.happiness += link.happiness;

			if (link.boosts !== undefined) 
				chainedBuilding.boosts = [...chainedBuilding.boosts || [], ...link.boosts];
			if (link.production !== undefined && link.production !== false) {
				chainedBuilding.production = [...chainedBuilding.production, ...link.production];
			}
			link.chainBuilding.type = "linked";
		}
		if (allLinkedBuildings.length > 1) {
			chainedBuilding.name = chainedBuilding.name + " +" + (allLinkedBuildings.length-1);
		}
		chainedBuilding.rating = Productions.rateBuilding(chainedBuilding);
		return chainedBuilding;
	},

	// returns setId (string), returns undefined if not a set building
	setSetBuilding(metaData) {
		let setId = undefined
		metaData.abilities.forEach(ability => {
			if (ability.setId)
				setId = ability.setId
		});
		if (setId !== undefined)
			return { name: setId }
	},

	// returns an object with the building size
	setSize(metaData) {
		let size = { width: 0, length: 0 }
		if (metaData.length)
			size = { width: metaData.width, length: metaData.length }
		else {
			size.width = metaData.components.AllAge.placement.size.x
			size.length = metaData.components.AllAge.placement.size.y
		}
		return size
	},

	// returns an array with all boosts, returns undefined when there are none
	setBuildingBoosts(metaData, data, era, withAlly=true) {
		let eraName = (era === 'AllAge' ? 'BronzeAge' : era) // for some reason Watchtower Level 2 (example) has an era list even though the boost is the same everywhere. thx inno
		let boosts = []
		let isSet = this.setSetBuilding(metaData)
		let isChain = this.setChainBuilding(metaData)
		if (metaData.__class__ !== "GenericCityEntity") {
			metaData.abilities.forEach(ability => {
				if (ability.boostHints) {
					ability.boostHints.forEach(abilityBoost => {
						if (abilityBoost.boostHintEraMap[eraName] !== undefined) { // has different boosts for different eras
							// example data: targetedFeature: "all", type: [], value: 11
							let boost = {
								feature: abilityBoost.boostHintEraMap[eraName].targetedFeature,
								type: Boosts.Mapper[abilityBoost.boostHintEraMap[eraName].type] || [abilityBoost.boostHintEraMap[eraName].type],
								value: abilityBoost.boostHintEraMap[eraName].value
							}
							boosts.push(boost)
						}
						else { // if only AllAge boost
							let boost = {
								feature: abilityBoost.boostHintEraMap.AllAge.targetedFeature,
								type: Boosts.Mapper[abilityBoost.boostHintEraMap.AllAge.type] || [abilityBoost.boostHintEraMap.AllAge.type],
								value: abilityBoost.boostHintEraMap.AllAge.value
							}
							boosts.push(boost)
						}
					})
				}
				if ((isSet !== undefined && ability.__class__ === "BonusOnSetAdjacencyAbility") || (isChain !== undefined && ability.__class__ === "ChainLinkAbility")) {
					for (const bonus of ability.bonuses) {
						if (bonus.boost.length === 0) return
						else {
							if (bonus.boost[eraName]) {
								let boost = {
									feature: bonus.boost[eraName].targetedFeature,
									type: Boosts.Mapper[bonus.boost[eraName].type] || [bonus.boost[eraName].type],
									value: bonus.boost[eraName].value,
									needsLink: true
								}
								boosts.push(boost)
							}
							else if (bonus.boost.AllAge) {
								let boost = {
									feature: bonus.boost.AllAge.targetedFeature,
									type: Boosts.Mapper[bonus.boost.AllAge.type] || [bonus.boost.AllAge.type],
									value: bonus.boost.AllAge.value,
									needsLink: true
								}
								boosts.push(boost)
							}
						}
					}
				}
			})
			if (metaData.type === "greatbuilding") { 
				if (data.bonus?.type) {
					let boost = {
						feature: "all",
						type: Boosts.Mapper[data.bonus.type] || [data.bonus.type],
						value: data.bonus.value
					}
					if (data.bonus.type !== "happiness_amount" && data.bonus.type !== "population")
						boosts.push(boost)
				}
			}
			else if (metaData.id.includes("CastleSystem")) {
				for (castleBoost of (Boosts?.CastleSystem || [])) {
					let boost = {
						feature: "all",
						type: Boosts.Mapper[castleBoost.type] || [castleBoost.type],
						value: castleBoost.value
					}
					boosts.push(boost)
				}
			}
		}
		else {
			if (metaData.components[era]?.boosts) {
				metaData.components[era].boosts.boosts.forEach(abilityBoost => {
					let boost = {
						feature: abilityBoost.targetedFeature,
						type: Boosts.Mapper[abilityBoost.type] || [abilityBoost.type],
						value: abilityBoost.value,
					};
					boosts.push(boost);
				})
			}
			let allAgeBoosts = metaData.components.AllAge?.boosts;
			if (metaData.components.AllAge?.chain?.config?.__class__ !== "ChainStartConfig" && isChain)
				allAgeBoosts = metaData.components.AllAge.chain?.config?.bonuses[0];
			if (allAgeBoosts) {
				allAgeBoosts.boosts.forEach(abilityBoost => {
					let boost = {
						feature: abilityBoost.targetedFeature,
						type: Boosts.Mapper[abilityBoost.type] || [abilityBoost.type],
						value: abilityBoost.value,
					};
					boosts.push(boost);
				})
			}
		}
		if (withAlly) {
			let allyStats = MainParser.Allies.getProd(data.id||0)
			if (allyStats?.currentLevel?.boosts||allyStats?.boosts) {
				(allyStats?.currentLevel?.boosts||allyStats?.boosts||[]).forEach(abilityBoost => {
					let boost = {
						feature: abilityBoost.targetedFeature,
						type: Boosts.Mapper[abilityBoost.type] || [abilityBoost.type],
						value: abilityBoost.value,
					};
					boosts.push(boost)
				})
			}
		}
		
		if (boosts.length > 0)
			return boosts
		return undefined
	},

	setState(data) { 
		if ((data?.state?.__class__ === "IdleState" && !data?.cityentity_id?.includes("CastleSystem")) || data?.state?.__class__ === undefined)
			return "idle"
		else if (data.state.__class__ === "ProductionFinishedState")
			return "collectable"
		else if (data.state.__class__ === "PlunderedState" )
			return "plundered"
		else if (data.cityentity_id.includes("CastleSystem"))
			return "producing"
		return "producing"
	},

	// building is not in construction menu
	isSpecialBuilding(metaData) { 
		if (metaData.__class__ === "GenericCityEntity")
			return true // generic buildings are always special
		return metaData.is_special
	},

	// returns street level (1 or 2) or 0
	needsStreet(metaData) {
		let needsStreet = metaData.requirements?.street_connection_level
		if (needsStreet === undefined) {
			metaData.abilities.forEach(ability => {
				if (ability.__class__ === "StreetConnectionRequirementComponent")
					needsStreet = 1
			});
			if (metaData.components?.AllAge?.streetConnectionRequirement !== undefined)
				needsStreet = metaData.components.AllAge.streetConnectionRequirement.requiredLevel
		}
		return (needsStreet === undefined ? 0 : needsStreet)
	},

	setStateTimes(data) {
		let state = this.setState(data)
		
		if (state === "producing") {
			if (data.cityentity_id.includes("CastleSystem")) {
				return { at: MainParser.CastleSystemChest.dailyRewardCollectionAvailableAt, in: MainParser.CastleSystemChest.dailyRewardCollectionAvailableAt - parseInt(Date.now()/1000) }
			}
			return { at: data?.state?.next_state_transition_at, in: data?.state?.next_state_transition_in }
		}
		else if (state === "collectable")
			return { at: moment().unix(), in: 0 }
		return { at: undefined, in: undefined };
	},

	isExpiredBuilding(data) {
		if (data.type === "generic_building")
			if (data.decayedFromCityEntityId !== undefined)
				return true;
		return false;
	},

	// returns false, time or total collections
	isLimitedBuilding(metaData) {
		if (metaData.components?.AllAge?.limited !== undefined) {
			if (metaData.components?.AllAge?.limited.config.expireTime !== undefined)
				return metaData.components.AllAge.limited.config.expireTime
			if (metaData.components?.AllAge?.limited.config.collectionAmount !== undefined)
				return metaData.components.AllAge.limited.config.collectionAmount
		}
		return false
	},

	isBoostableBuilding(metaData) {
		if (metaData.type === 'greatbuilding' || metaData.type === 'main_building') {
			return false
		}
		else if (metaData.id.includes('CastleSystem')) {
			return false
		}
		// wishingwell types
		else if (metaData.id.includes("L_AllAge_EasterBonus1") || metaData.id.includes("L_AllAge_Expedition16") || metaData.id.includes("L_AllAge_ShahBonus17")) {
			return false
		}
		return true
	},

	// returns undefined or time the building was built
	setBuildTime(data) {
		if (data.type === "generic_building")
			if (data?.state?.constructionFinishedAt !== undefined) 
				return data?.state?.constructionFinishedAt;
		return undefined;
	},

	// returns true or false
	setConnection(metaData, data) {
		let connected = (this.needsStreet(metaData, data) === 0)
		if (!connected) 
			connected = (data?.connected === 1)
		return connected
	},

	// find out if a chain start building has links, return all buildings in an array
	hasLinks(building, connectedBuildings = [], dirX = 0, dirY = 0) {
		connectedBuildings.push(building);
		
		if (building.chainBuilding?.type === "start") {
			dirX = building?.chainBuilding?.chainPosX !== 0 ? parseInt(building?.chainBuilding?.chainPosX / Math.abs(building?.chainBuilding?.chainPosX)) : 0 // e.g. (-3/3) || 0
			dirY = building?.chainBuilding?.chainPosY !== 0 ? parseInt(building?.chainBuilding?.chainPosY / Math.abs(building?.chainBuilding?.chainPosY)) : 0
		}
		let x = building.coords.x + dirX;
		let y = building.coords.y + dirY;

		let nextBuilding = CityBuildings.getBuildingByCoords(x, y);
		let x1 = x + dirX;
		let y1 = y + dirY;
		while (nextBuilding === undefined) {
			nextBuilding = CityBuildings.getBuildingByCoords(x1, y1);
			x1 += dirX;
			y1 += dirY;
			if (x1 < 0 || y1 < 0 || x1 > 72 || y1 > 72) break; // min and max of current map
		}

		if (x < 0 || x < 0 || y > 72 || y > 72) return connectedBuildings; // min and max of current map
		else {
			if (nextBuilding === undefined || nextBuilding.chainBuilding === undefined || nextBuilding.chainBuilding?.name !== building.chainBuilding.name || nextBuilding.chainBuilding?.type === "start")
				return connectedBuildings;

			return this.hasLinks(nextBuilding, connectedBuildings, dirX, dirY);
		}
	},

	// find out if a chain link building is connected to the chain start building (through other links)
	isLinked(building, x = 0, y = 0) {
		if (typeof building?.chainBuilding?.chainPosX === 'number') {
			let posX = building?.chainBuilding?.chainPosX
			let posY = building?.chainBuilding?.chainPosY
			let xNeg = posX > 0 ? -1 : 1
			let yNeg = posY > 0 ? -1 : 1
			let x1 = (posX !== 0 ? posX / Math.abs(posX) : 0) - x*xNeg
			let y1 = (posY !== 0 ? posY / Math.abs(posY) : 0) - y*yNeg

			let prevBuilding = CityBuildings.getBuildingByCoords(building?.coords?.x - x1, building?.coords?.y - y1)

			if (y1 < 0 || x1 < 0 || x1 > 72 || y1 > 72) return false // min and max of current map
			else {
				if (prevBuilding !== undefined) {
					if (prevBuilding.chainBuilding === undefined || prevBuilding.chainBuilding?.name !== building.chainBuilding.name) return false
					if (prevBuilding.chainBuilding?.name === building.chainBuilding.name && prevBuilding.chainBuilding?.type === ("linked" || "start")) {
						return true
					}
				}
				return this.isLinked(building, x1, y1)
			}
		}
	},

	// todo: need it for sets
	findAdjacentSetBuildingByCoords(x,y, linkName = "") {
		for (let i = x; i >= (x-10); i--) {
			for (let j = y; j >= (y-10); j--) {
				let building = this.getBuildingByCoords(i,j)
				//if (building !== undefined && building?.setBuilding?.name === linkName) {
				//	return console.log(building)
				//}
			}
		}
	},

	// returns false if building does not produce anything
	// production types: resources (coins, supplies, goods, medals etc), unit, genericReward (consumables like fragments), random, guildResources (power and goods)
	setAllProductions(metaData, data, era) {
		let productions = []
		if (metaData.__class__ !== "GenericCityEntity" && metaData.type !== "greatbuilding") {
			if (metaData.is_special) { // special building
				if (metaData.available_products !== undefined) { 
					// to do: to think about: should all goods production options be gathered here?
					if (Array.isArray(metaData.available_products))
						metaData.available_products.forEach(product => {
							if (product.name !== "Daily Bonus") return
							resource = {
								type: "resources", 
								needsMotivation: false,
								resources: product.product.resources
							}
							productions.push(resource)
						});
				}
				if (metaData.entity_levels[Technologies.InnoEras[era]] !== undefined) { // base money is here
					let money = metaData.entity_levels[Technologies.InnoEras[era]].produced_money
					if (money)
						productions.push({ type: 'resources', needsMotivation: false, resources: { money: money }, doubleWhenMotivated: this.setPolivationable(metaData)})
					let power = metaData.entity_levels[Technologies.InnoEras[era]].clan_power // hall of fame lvl 1
					if (power)
						productions.push({ type: 'guildResources', needsMotivation: false, resources: { clan_power: power }, doubleWhenMotivated: true})
				}
				metaData.abilities.forEach(ability => {
					let resource = this.setOldProductionResourceFromAbility(ability, era)
					
					if (Object.keys(resource.resources).length > 0) 
						productions.push(resource)
				})
				if (metaData.__class__ === "CityEntityRandomProductProductionBuilding") { // if weird old building, use current production
					let currentProduction = this.setCurrentProductions(data, metaData, era)
					productions = currentProduction
				}
			}
			if (metaData.type === "main_building") { // add emissary production to town hall
				MainParser.EmissaryService?.forEach(emissary => {
					let resource = {
						type: (emissary.bonus.type !== "unit" ? "resources" : emissary.bonus.type),
						needsMotivation: false,
						resources: (emissary.bonus.type === "unit" ? this.setUnitReward(emissary.bonus, true) : {[emissary.bonus.subType]: emissary.bonus.amount} )
					}
					productions.push(resource)
				})
				MainParser.BonusService?.forEach(bonus => { // guild FP
					if (bonus.type === "daily_strategypoint") {
						let resource = {
							type: "resources",
							needsMotivation: false,
							resources: { strategy_points: bonus.value} 
						}
						productions.push(resource)
					}
				})
			}
			if (metaData.id.includes("CastleSystem")) { // add castle system stuff
				let currentLevel = Castle.curLevel
				era = CurrentEra 
				if (MainParser.CastleSystemLevels[(currentLevel-1)] !== undefined)
					MainParser.CastleSystemLevels[(currentLevel-1)].dailyReward[era].rewards.forEach(reward => {
						let resources = {[reward.subType]: reward.amount} 
						if (reward.id.search("#") !== -1) { // "goods#random#CurrentEra#30" "goods#random#PreviousEra#15"
							amount = reward.id.match(/\d+$/)[0]
							if (reward.id.search("goods") !== -1 && reward.id.search("CurrentEra") !== -1)
								resources = { 'random_good_of_age': amount }
							else if (reward.id.search("goods") !== -1 && reward.id.search("PreviousEra") !== -1)
								resources = { 'random_good_of_previous_age': amount }
						}
						let resource = {
							type: "resources",
							needsMotivation: false,
							resources: resources
						}
						productions.push(resource)
					})
			}
			let isChain = this.setChainBuilding(metaData)
			if (isChain !== undefined) {
				for (const ability of metaData.abilities) {
					if (ability.__class__ === "ChainLinkAbility")
						for (const bonus of ability.bonuses) {
							if (bonus.revenue.length === 0) return
							else {
								if (bonus.revenue[Technologies.InnoEras[era]]) {
									let resource = {
										type: "resources", // currently there are no chains that give anything else
										needsMotivation: false,
										resources: bonus.revenue[Technologies.InnoEras[era]].resources
									}
									productions.push(resource)
								}
								else if (bonus.revenue.AllAge) {
									let resource = {
										type: "resources", // currently there are no chains that give anything else
										needsMotivation: false,
										resources: bonus.revenue.AllAge.resources
									}
									productions.push(resource)
								}
							}
						}
				}
			}

			if (productions?.length > 0) 
				return productions
			
			return false
		}
		else if (metaData.__class__ === "GenericCityEntity") {
			// fyi: generic_building supplies and coins are doubled when motivated if they do not need motivation
			let production = metaData.components[era]?.production || metaData.components.AllAge.production; // currently it is either allage or era, never both

			// attached chain buildings
			if (metaData.components.AllAge?.chain !== undefined && metaData.components.AllAge?.chain?.config?.__class__ !== "ChainStartConfig") {
				// resources are located here
				let chainProductions = metaData.components.AllAge?.chain?.config?.bonuses[0]?.productions;
				if (chainProductions !== undefined)
					for (const prod of chainProductions) {
						let resource = {
							type: "resources",
							needsMotivation: false,
							doubleWhenMotivated: false,
							resources: undefined,
						};
						// regular resources
						if (prod.playerResources?.resources !== undefined) {
							resource.resources = prod.playerResources?.resources;
						}
						// generic reward
						else if (prod.reward !== undefined) {
							let lookUp = metaData.components.AllAge?.lookup?.rewards[prod.reward.id];
							resource.resources = {
								id: prod.reward.id,
								name: lookUp?.name,
								amount: lookUp?.amount,
								type: lookUp?.type,
								subType: lookUp?.subType
							};
							resource.type = "genericReward";
						}
						productions.push(resource);
					}
				return productions || false;
			}

			if (production) {
				if (metaData.type === "production") { // production buildings do not have a default production
					for (product of production.options) {
						let resource = {
							type: product.products[0].type,
							needsMotivation: false,
							doubleWhenMotivated: true,
							resources: product.products[0].playerResources?.resources, // breaks if buildings with guildresources or multiple productions would be added
							time: product.time
						}
						productions.push(resource)
					}
					return productions 
				} 
				production.options[0].products.forEach(product => {
					let resource = {
						type: product.type,
						needsMotivation: (product.onlyWhenMotivated === true),
						doubleWhenMotivated: false,
						resources: {}
					}
					if (product.type === "resources") {
						resource.resources = product.playerResources.resources;
						if (product.onlyWhenMotivated !== true)
							resource.doubleWhenMotivated = true;
						// make special goods their own type
						let specialGood = Object.keys(resource.resources).find(x => x.includes("special_good"));
						let resourceAmount = Object.keys(resource.resources).length;
						if (specialGood && resourceAmount === 1) 
							resource.type = "special_goods";
						else if (specialGood && resourceAmount > 1) {
							let special_good = {
								type: "special_goods",
								needsMotivation: resource.needsMotivation,
								doubleWhenMotivated: resource.doubleWhenMotivated,
								resources: {[specialGood]:resource.resources[specialGood]}
							}
							productions.push(special_good);
							delete resource.resources[specialGood];
						}
					}
					else if (product.type === "guildResources") {
						resource.resources = product.guildResources.resources
					}
					else if (product.type === "genericReward" || product.type === "blueprint") {
						resource.resources = this.setGenericReward(product, metaData, era);

						// genericReward can also return unit rewards or goods, change type
						let objectKey = (Object.keys(resource.resources).length === 1 ? Object.keys(resource.resources)[0] : null)
						if (objectKey?.includes('good')) {
							resource.type = "resources"
						}
						else if (objectKey !== null) {
							resource.type = "unit"
						}
					}
					else if (product.type === "unit") {
						resource.resources = this.setUnitReward(product)
					}
					else if (product.type === "random") {
						let rewards = [];
						if (product.products.length > 1) {
							product.products.forEach(reward => {
								if (reward.product.type === "genericReward") { // currently: everything but forge points
									let lookupData = metaData.components[era]?.lookup.rewards[reward.product.reward.id] || metaData.components.AllAge.lookup.rewards[reward.product.reward.id]
									let subType = lookupData.subType
									let amount = (lookupData.totalAmount || lookupData.amount)
									let type = (lookupData.type === "set" ? "consumable" : lookupData.type)

									if (reward.product.reward.id.search('good') !== -1 && reward.product.reward.id.search('fragment') === -1) {
										subType = Object.keys(this.setGoodsRewardFromGeneric(lookupData))[0];
										amount = Object.values(this.setGoodsRewardFromGeneric(lookupData))[0];
										type = "goods";
									}

									let name = this.setRewardNameFromLookupData(lookupData, metaData)
									let newReward = {
										id: reward.product.reward.id,
										name: name,
										type: type,
										subType: subType,
										amount: amount,
										dropChance: reward.dropChance,
									}
									rewards.push(newReward)
								}
								else if (reward.product.type === "resources") {
									if (reward.product.playerResources.resources.strategy_points !== undefined) { // FP
										let newReward = {
											id: null,
											type: "resources",
											name: i18n('Boxes.OwnpartCalculator.OptionsFP'), // ugly
											subType: Object.keys(reward.product.playerResources.resources)[0],
											amount: reward.product.playerResources.resources.strategy_points,
											dropChance: reward.dropChance,
										}
										rewards.push(newReward)
									}
									else { // some goods, nextage are genericReward
										let type = Object.keys(reward.product.playerResources.resources)[0];
										type = type.includes("good") ? "goods" : "resources";
										let newReward = {
											id: Object.keys(reward.product.playerResources.resources)[0],
											type: type,
											name: i18n('Boxes.BlueGalaxy.Goods'),
											subType: Object.keys(reward.product.playerResources.resources)[0],
											amount: Object.values(reward.product.playerResources.resources)[0],
											dropChance: reward.dropChance,
										}
										//console.log(metaData.name, reward.product, newReward)
										rewards.push(newReward)
									}
								}
							});
							resource.resources = rewards;
							resource.type = "random"
						}
					}
					else {
						console.log("setAllProductions() is missing an option for ",metaData.name)
					}
					productions.push(resource);
				});
			}
			if (productions.length > 0)
				return productions
			return false
		}
		else if (metaData.type === 'greatbuilding') {
			productions = this.setCurrentProductions(data, metaData, era)
			
			if (productions?.length > 0)
				return productions
			return false
		}
	},

	// returns undefined if building is idle or there are no productions (yet)
	setCurrentProductions(data, metaData, era) {
		let productions = [];
		let state = CityBuildings.setState(data);
		if (state !== "idle") {
			if (metaData.__class__ !== "GenericCityEntity") {
				if (data.state.current_product) {
					if (data.state.current_product.guildProduct) {
						let production = {
							resources: data.state.current_product.guildProduct.resources,
							type: "guildResources",
						}
						productions.push(production)
					}
					if (data.state.current_product.clan_power) { // HoF
						let production = {
							resources: { clan_power: data.state.current_product.clan_power },
							type: "guildResources",
						}
						productions.push(production)
					}
					if (data.state.current_product.product) {
						if (data.state.current_product.product.resources) {
							let production = {
								resources: data.state.current_product.product.resources,
								type: "resources",
							}
							if (data.state.current_product.name === 'special_goods') { // space carrier
								production.type = "special_goods"
							}
							productions.push(production)
						}
					}
					if (data.state.current_product.goods) { // great buildings
						if (data.type === "greatbuilding") {
							if (data.state.current_product.name === "clan_goods") {
								let resources = {}
								data.state.current_product.goods.forEach(good => {
									resources[good.good_id] = good.value
								})
								let production = {
									resources: resources,
									type: "guildResources",
								}
								productions.push(production)
							}
						}
					}
					if (data.state.current_product.name === 'penal_unit') { // alcatraz
						let production = {
							resources: {'random': parseFloat(data.state.current_product.amount)},
							type: "unit",
						}
						productions.push(production)
					}
					if (data.state.is_motivated) { 
						metaData.abilities.forEach(ability => { // random units are not in the data, they are in the metaData for some reason
							if (ability.__class__ === "RandomUnitOfAgeWhenMotivatedAbility") {
								let production = {
									resources: { "random": ability.amount },
									type: "unit",
								}
								productions.push(production)
							}
						})
					}
				}
				if (data.type === "main_building") {
					let prod = CityBuildings.setAllProductions(metaData, data, era)
					return prod
				}
			}
			else { // generic building
				if (data.state.productionOption) {
					data.state.productionOption.products.forEach(production => {
						let resource = {
							type: production.type,
							resources: {}
						}
						if (production.type === "resources") {
							resource.resources = production.playerResources.resources;
							
							// check if first resource is a special good and change the type accordingly
							let specialGood = FHResourcesList.find(x => x.id === Object.keys(production.playerResources?.resources)[0] && x.abilities.specialResource?.type === "specialResource")
							if (specialGood)
								resource.type = "special_goods";
						}
						else if (production.type === "guildResources")
							resource.resources = production.guildResources.resources
						else if (production.type === "unit") 
							resource.resources = this.setUnitReward(production)
						else if (production.type === "genericReward") {
							let reward = this.setGenericReward(production, metaData, era);
							resource.resources = reward;
							let objectKey = (Object.keys(resource.resources).length === 1 ? Object.keys(resource.resources)[0] : null)
							if (objectKey?.includes('good')) {
								resource.type = "resources"
							}
							else if (objectKey !== null) {
								resource.type = "unit"
							}
						}
						else
							console.log(metaData.name, "setCurrentProductions() production is missing")
						
						productions.push(resource)
					});
				}
			}
			if (productions.length > 0) {
				return productions
			}
		}
		if (data?.cityentity_id?.includes("CastleSystem")) {
			return this.setAllProductions(metaData, data, era)
		}
		return undefined
	},

	// todo: set buildings
	
	// returns a generic reward or a unit reward
	setGenericReward(product, metaData, era) {
		let amount = 0;
		let lookupData = false;

		let reward = {
			id: product.reward.id,
			name: '',
			type: '',
			subType: '',
			amount: amount, // amount can be undefined for blueprints or units if building is not motivated
			icon: ''
		}

		if (product.reward.amount) 
			amount = product.reward.amount;
		if (product.reward.totalAmount) 
			amount = product.reward.totalAmount;

		if (metaData.components[era]) {
			let lookupRewards = structuredClone(metaData.components[era].lookup?.rewards||{})
			if (metaData.components?.AllAge?.chain) {
				MainParser.BuildingChains[metaData.components.AllAge.chain.chainId]?.cityEntityIds.forEach(chainBuilding => {
					Object.assign(lookupRewards, MainParser.CityEntities[chainBuilding]?.components?.[era]?.lookup?.rewards||{})
				})
			}
			if (product.reward.id.search("blueprint") !== -1) {
				if (lookupRewards[product.reward.id]) {
					lookupData = lookupRewards[product.reward.id]
				}
				else { // blueprint chest, e.g. vineyard
					for (const [key, reward] of Object.entries(lookupRewards)) {
						if (reward.id.search("blueprint") !== -1)
							lookupData = reward
					}
				}
			}
			else if (product.reward.type === "good") { // this can break if there is more than one generic goods reward for a building
				for (const [key, reward] of Object.entries(lookupRewards)) {
					if (reward.id.includes("good"))
						lookupData = reward
				}
			}
			else if (product.reward.id.includes('goods') && !/(fragment|rush)/.test(product.reward.id)) { // for nextage goods, because they are in a chest (random ones)
				// todo: this not only covers chests now, so implementation needs to be looked at more carefully
				lookupData = lookupRewards[product.reward.id]; // take first chest reward and work with that
				reward = {
					id: product.reward.id,
					name: lookupData.name.replace(/^\d+\s*/,""),
					type: "resources",
					subType: "good",
					amount: lookupData.totalAmount || parseInt(product.reward.id.match(/\d+$/)[0]),
					icon: lookupData.iconAssetName
				}
				return this.setGoodsRewardFromGeneric(reward)
			}
			else {
				lookupData = lookupRewards[product.reward.id];
				if (lookupData === undefined) {
					let chest = Object.keys(lookupRewards).find(x => x.includes("chest" || "random_unit")) // currently only applies to wish fountain or things with "random unit chest"
					if (lookupRewards[chest]?.possible_rewards)
						for (possibleReward of lookupRewards[chest]?.possible_rewards) {
							if (possibleReward.reward.id === product.reward.id)
								lookupData = possibleReward.reward;
						}
				}
				else {
					amount = lookupData.totalAmount || lookupData.amount;
				}
			}
		}
		if (amount === 0) {
			amount = Number(lookupData?.name?.replace(/^([+-]*[0-9]+?) .*/,"$1"));
			if (isNaN(amount)) amount = lookupData.amount
		}

		let name = ""
		if (lookupData) 
			name = this.setRewardNameFromLookupData(lookupData, metaData)
		else {
			console.log("setGenericReward() data missing for", metaData.name, metaData, product);
			name = "DEFINE NAME";
		}
		
		// units
		if (lookupData?.type === "chest" && lookupData.id.search("genb_random_") !== -1 && lookupData.id.search("fragment") === -1 || lookupData?.type === "unit"|| lookupData?.icon === "military") {
			let units = this.setUnitReward(product)
			return units
		}
		// wish fountain (AllProductions)
		else if (lookupData?.type === "chest" && lookupData.id.search("fragment") !== -1) {
			lookupData.type = "consumable"
		}
		// self aid kits have type set
		if (lookupData?.type === "set") {
			lookupData.type = "consumable"
			lookupData.subType = lookupData.rewards[0].subType
		}

		if (metaData.components?.AllAge?.chain === undefined || (metaData.components?.AllAge?.chain !== undefined && product.reward.subType !== "fragment"))
			reward = {
				id: product.reward.id,
				name: name,
				type: lookupData?.type || "consumable",
				subType: lookupData?.subType,
				amount: amount, // amount can be undefined for blueprints or units if building is not motivated
				icon: lookupData?.iconAssetName
		}
		// chain attachments with generic production need extra handling
		else {
			reward = {
				id: product.reward.id,
				name: product.reward.name,
				type: product.reward.type,
				subType: product.reward.subType,
				amount: product.reward.amount,
				icon: product.reward.iconAssetName
			}
		}

		if (reward.type === "good")
			return this.setGoodsRewardFromGeneric(reward)

		return reward
	},

	// random_good_of_previous_age   random_good_of_age   random_good_of_next_age
	// all_goods_of_previous_age   all_goods_of_age   all_goods_of_next_age
	// special_goods_of_any_age
	setGoodsRewardFromGeneric(reward) {
		let amount = reward.amount


		if (reward.possible_rewards !== undefined) // random productions
			amount = parseInt(reward.id.split('#').reverse()[0]) // grab the amount from the id "goods#random#NextEra#508"

		let eraString = '' // current era needs nothing
		let typeString = 'random_good_' // random = one random good of the era

		if (reward.id.includes("NextEra") && !reward.id.includes("special_goods")) {
			eraString = 'next_'
		}
		else if (reward.id.includes("PreviousEra")) { // currently unused
			eraString = 'previous_'
		}
		else if (reward.id.includes("special_goods")) {
			eraString = 'any_'
			typeString = 'special_goods_'
		}

		if (reward.id.includes("each")) {
			typeString = 'all_goods_'
		}
		return {[typeString + 'of_' + eraString + 'age']: amount}
	},

	// returns { unit_type: amount } 
	// unit_type can be: random, rogue, light_melee, heavy_melee, short_ranged, long_ranged, fast, next#light_melee -> next# for next era units
	setUnitReward(product, isEmissary = false) {
		let amount, type
		if (isEmissary) {
			amount = product.amount
			if (product.id.search("#") !== -1) { // era_unit#light_melee#NextEra#1
				let prefix = ""
				if (product.id.search("NextEra") !== -1) 
					prefix = "next#"
				
				type = prefix + product.id.split("#")[1]
			}
			else 
				type = "random"
		}
		else if (product.type === 'genericReward') {
			let amountFromString = product.reward.id.match(/\d+$/)
			amount = parseInt(amountFromString ? amountFromString[0] : 1) 	// if its only one unit, there is no number in the string
			type = product.reward.id.replace("unit_","").replace(/\d+/,"") 	// grabs e.g. "heavy_melee" from unit_heavy_melee3 or rogue from unit_rogue3 
			if (type.search("random") !== -1) type = "random"
			if (product.reward.id.search("#") !== -1) { // era_unit#light_melee#NextEra#1
				let prefix = ""
				if (product.reward.id.search("NextEra") !== -1) 
					prefix = "next#"
				
				type = prefix + product.reward.id.split("#")[1]
			}
		}
		else if (product.type === 'unit') {
			amount = product.amount
			type = product.unitTypeId
		}
		return { [type]: amount }
	},

	setRewardNameFromLookupData(lookupData, metaData) {
		let name = ""
		if (lookupData.subType === "fragment") 
			name = lookupData.assembledReward.name
		else if (lookupData.__class__ === "GenericRewardSet") // this is a dirty workaround for trees of patience, because i lack patience
			name = lookupData.rewards[0]?.name 
		else if (lookupData.subType === "speedup_item" || lookupData.subType === "reward_item" || lookupData.subType === "boost_item" || lookupData.type === "forgepoint_package" || lookupData.type === "resource") 
			name = lookupData.name
		else if (lookupData.type === "unit") { // -> (next_)light_melee
			if (lookupData.id.search("#") !== -1) { // era_unit#light_melee#NextEra#1
				let prefix = ""
				if (lookupData.id.search("NextEra") !== -1) 
					prefix = "next_"
				
				name = prefix + lookupData.id.split("#")[1]
			}
			else 
				name = lookupData.id.replace("unit_","").replace(/\d+/,"")
		}
		else if (lookupData.type === "blueprint")  // id: "blueprint#random#3"
			name = lookupData.name.replace(/^\+?\d+\s*/,"")
		else if (lookupData.type === "chest" && lookupData.id.includes("blueprint")) { // remove +20 from the name becuase the amount is in the amount
			name = lookupData.name.replace(/^\+?\d+\s*/,"")
		}
		else if (lookupData.type === "chest") { // chest can be: BP - see above, units, goods (next age)
			name = lookupData.name
		}
		else if (lookupData.type === "consumable")
			name = lookupData.name
		else if (lookupData.type === "good"){
			name = lookupData.name.replace(/^\+?\d+\s]*/,"")
		} else {
			console.log("setRewardNameFromLookupData(): undefined name from type", metaData.name, lookupData, lookupData.type, lookupData.subType)
		}
		return name
	},

	setOldProductionResourceFromAbility(ability, era) {
		let resource = {
			type: 'resources',
			needsMotivation: (ability.__class__ === "AddResourcesAbility" || ability.__class__ === "AddResourcesWhenMotivatedAbility"),
			resources: {}
		}
		if (ability.__class__ === "AddResourcesToGuildTreasuryAbility")
			resource.type = 'guildResources'

		else if (ability.__class__ === "RandomUnitOfAgeWhenMotivatedAbility") {
			resource.resources = { random: ability.amount }
			resource.type = 'unit'
		}
		else if (ability.__class__ === "RandomChestRewardAbility") {
			resource.type = 'random'
			let rewards = []
			ability.rewards[era].possible_rewards.forEach(reward => {
				let amount = reward.reward.amount
				let type = reward.reward.subType
				if (reward.reward.type === "chest") {
					if (reward.reward.possible_rewards[0].reward.amount) 
						amount = reward.reward.possible_rewards[0].reward.amount
					type = "random_good_of_age" // duplicates, e.g. sunflower oil press
				}
				else if (reward.reward.type === "good") {
					amount = reward.reward.totalAmount
					type = "all_goods_of_age"
				}
				else if (reward.reward.type === "guild_goods") {
					amount = reward.reward.totalAmount
					type = "guild_goods"
				}

				let newReward = {
					id: reward.reward.id,
					name: (type.includes("good") ? reward.reward.name.replace(/^\d+\s*/,"") : reward.reward.name),
					type: type,
					amount: amount,
					dropChance: reward.drop_chance / 100, // the generic buildings data is 0.05 while this is 5
				}
				rewards.push(newReward)
			})
			resource.resources = rewards
		}

		let multiAgeProduct = {}
		let allAgeProduct = {}
		if (ability.additionalResources) {
			if (ability.additionalResources[era]) // MultiAge
				multiAgeProduct = ability.additionalResources[era]
			if (ability.additionalResources.AllAge)  // some buildings have only AllAge productions, some have additional AllAge productions
				allAgeProduct = ability.additionalResources.AllAge
		}

		// mash all resources into one thing
		if (Object.keys(multiAgeProduct).length > 0) 
			for (const [key, value] of Object.entries(multiAgeProduct.resources)) 
				resource.resources[key] = value
		if (Object.keys(allAgeProduct).length > 0) 
			for (const [key, value] of Object.entries(allAgeProduct.resources)) 
				resource.resources[key] = value

		return resource
	},

	getBuildingById(id) {
		return Object.values(MainParser.CityBuildingsData).find(x => x.id === id)
	},

	getBuildingByCoords(x,y) {
		return Object.values(MainParser.CityBuildingsData).find(b => b.coords.x === x && b.coords.y === y)
	},

	getBuildingGoodsByEra(current, building, boosted = false) {
		let productions = (current ? building.state.production : building.production)
		let goods = {
			hasRandomProduction: false,
			eras: {}
		}
		

		if (productions) {
			let goodsBoost = 0;
			if (boosted)
				goodsBoost = Boosts.Sums.goods_production || 1;
			
			// only evaluate 1 day production for production buildings
			if (building.type === "production") {
				productions = [productions[productions.length-1]];
			}

			for (let production of productions) {
				if (production === undefined) continue;

				if (production.type === 'resources' || production.type === 'special_goods') {
					Object.keys(production.resources).forEach(resourceName => {
						let good = GoodsList.find(x => x.id === resourceName)
						let specialGood = FHResourcesList.find(x => x.id === resourceName && x.abilities.specialResource?.type === "specialResource")
						let goodEra = Technologies.InnoEras[building.eraName]
						let isGood = false

						if (good !== undefined) {
							goodEra = Technologies.InnoEras[good.era]
							resourceName = good.id
							isGood = true
						}
						else if (specialGood !== undefined) {
							isGood = false
						}
						else if (resourceName.includes('previous_age')) {
							goodEra = Technologies.getPreviousEraIdByCurrentEraName(building.eraName)
							isGood = true
						}
						else if (resourceName.includes('next_age')) {
							goodEra = Technologies.getNextEraIdByCurrentEraName(building.eraName)
							isGood = true
						}
						else if (resourceName.includes('random_good_of_') || resourceName.includes('all_goods_of_')) {
							isGood = true
						}

						if (isGood) {
							let boostedExtra = Math.round(production.resources[resourceName]*goodsBoost/100)
							if (resourceName.includes('all_goods_of_')) 
								boostedExtra = Math.round(production.resources[resourceName]/5*goodsBoost/100)*5;
							
							if (goods.eras[goodEra] === undefined) 
								goods.eras[goodEra] = parseInt(production.resources[resourceName])+boostedExtra;
							else
								goods.eras[goodEra] += parseInt(production.resources[resourceName])+boostedExtra;
						}
					})
				}
				if (production.type === 'random') { // e.g. gentania windmill, eerie terror coaster
					let goodEra = Technologies.InnoEras[building.eraName]
					for (const resource of production.resources) {
						if (resource.type?.includes("good") && !resource.type?.includes("guild")) {
							goods.hasRandomProduction = true // this is not a perfect solution, because it is general & not per good

							if (resource.type.includes('previous') || resource.subType?.toLowerCase().includes('previous') || resource.id?.toLowerCase().includes('previous'))
								goodEra = Technologies.getPreviousEraIdByCurrentEraName(building.eraName);
							else if (resource.type.includes('next') || resource.subType?.toLowerCase().includes('next') || resource.id?.toLowerCase().includes('next'))
								goodEra = Technologies.getNextEraIdByCurrentEraName(building.eraName);
							else
								goodEra = Technologies.getEraIdByCurrentEraName(building.eraName);

							let boostedExtra = Math.round(resource.amount*goodsBoost/100)

							if (goods.eras[goodEra] === undefined)
								goods.eras[goodEra] = parseFloat((resource.amount + boostedExtra) * resource.dropChance);
							else
								goods.eras[goodEra] += parseFloat((resource.amount + boostedExtra) * resource.dropChance);
						}
					}
				}
				if (production.type === 'genericReward' && /good/.test(production.resources?.icon)) { // e.g. eco hub
					let goodEra = Technologies.InnoEras[building.eraName];
					if (production.resources.id.includes('previous'))
						goodEra = Technologies.getPreviousEraIdByCurrentEraName(building.eraName);
					else if (production.resources.icon === "next_age_goods" || production.resources.id.includes('next'))
						goodEra = Technologies.getNextEraIdByCurrentEraName(building.eraName);
					if (goods.eras[goodEra] === undefined)
						goods.eras[goodEra] = parseInt(production.resources.amount);
					else 
						goods.eras[goodEra] += parseInt(production.resources.amount);
				}
			}
		}
		if (Object.keys(goods).length > 0) {
			return goods;
		}
	},

	getBuildingGuildGoodsByEra(current, building, boosted = false) {
		let productions = (current ? building.state.production : building.production)
		let goods = {
			eras: {}
		}
		if (productions) {
			let goodsBoost = 0;
			if (boosted)
				goodsBoost = Boosts.Sums.guild_goods_production || 1;
			for (let production of productions) {
				if (production.type !== 'guildResources' || production.resources === undefined) continue;

				for (let resourceName of Object.keys(production?.resources)) {
					let good = GoodsList.find(x => x.id === resourceName);
					let goodEra = Technologies.InnoEras[building.eraName];
					let isGood = false;

					if (good !== undefined) {
						goodEra = Technologies.InnoEras[good.era]
						resourceName = good.id
						isGood = true
					}
					else if (resourceName.includes('random_good_of_') || resourceName.includes('all_goods_of_')) {
						isGood = true
					}

					if (isGood) {
						let boostedExtra = Math.round(production.resources[resourceName]*goodsBoost/100)
						if (resourceName.includes('all_goods_of_')) 
							boostedExtra = Math.round(production.resources[resourceName]/5*goodsBoost/100)*5;
						// dont apply boost to GBs
						if (building.type == "greatbuilding")
							boostedExtra = 0;
						
						if (goods.eras[goodEra] === undefined) 
							goods.eras[goodEra] = parseInt(production.resources[resourceName])+boostedExtra;
						else
							goods.eras[goodEra] += parseInt(production.resources[resourceName])+boostedExtra;
					}
				}
			}
		}
		if (Object.keys(goods.eras).length > 0) {
			return goods;
		}
	},

	setType(metaData) {
		return metaData.type
	},

	setDecayed(data) {
		return (data.decayedFromCityEntityId !== undefined)
	},

	async canAscend(buildingEntityId) {
		return (await CityMap.AscendingBuildings).hasOwnProperty(buildingEntityId);
	},

	createBuildings(data=Object.values(MainParser.CityMapData),withAllies=true) {
		data = Object.values(MainParser.CityMapData);
		if (ActiveMap === 'OtherPlayer') {
			data = Object.values(CityMap.OtherPlayer.mapData);
		}

		for (building of data) {
			if (ActiveMap === 'OtherPlayer' && building.eraName !== undefined) continue
			let metaData = Object.values(MainParser.CityEntities).find(x => x.id === building.cityentity_id)
			let era = Technologies.getEraName(building.cityentity_id, building.level);
			let newCityEntity = CityBuildings.createBuilding(metaData, era, building,withAllies);

			if (ActiveMap === 'OtherPlayer') 
				CityMap.OtherPlayer.mapData[building.id] = newCityEntity
			else
				MainParser.CityBuildingsData[building.id] = newCityEntity
		}

		return (ActiveMap === 'OtherPlayer' ? CityMap.OtherPlayer.mapData : MainParser.CityBuildingsData) 
	},

	createBuilding(metaData, era=CurrentEra, data={}, withAlly=true) {
		if (typeof(metaData)=="string") {
			metaData=MainParser.CityEntities[metaData];
		}
		let entity = {
			player_id: data.player_id||0,
			id: data.id||0,

			entityId: data.cityentity_id||metaData.id,
			allyRoom: metaData.components?.AllAge?.ally?.rooms[0]?.allyType || null,
			name: metaData.name,
			type: this.setType(metaData),
			eraName: ((data.cityentity_id||metaData.id).includes("CastleSystem") ? CurrentEra : era),
			isSpecial: this.isSpecialBuilding(metaData),
			isLimited: this.isLimitedBuilding(metaData),
			isInInventory: false,
			isBoostable: this.isBoostableBuilding(metaData),
			chainBuilding: this.setChainBuilding(metaData),
			setBuilding: this.setSetBuilding(metaData),
			size: this.setSize(metaData),

			population: this.setPopulation(metaData, data, era), 
			happiness: this.setHappiness(metaData, data, era),
			needsStreet: this.needsStreet(metaData),
			
			boosts: this.setBuildingBoosts(metaData, data, era, withAlly),
			production: this.setAllProductions(metaData, data, era),
			rating: null,

			coords: { x: data.x || 0, y: data.y || 0 },
			
			state: {
				name: this.setState(data),
				times: this.setStateTimes(data),
				isPolivated: this.setPolivation(data, metaData),
				connected: this.setConnection(metaData, data), // fyi: decorations are always connected
				production: this.setCurrentProductions(data, metaData, era),
				isExpired: this.isExpiredBuilding(data),
				buildTime: this.setBuildTime(data),
				level: (data.type === "greatbuilding" ? data.level : null), // level also includes eraId in raw data, we do not like that
				max_level: (data.type === "greatbuilding" ? data.max_level : null),
				isDecayed: this.setDecayed(data)
			}
		}

		entity.rating = Productions.rateBuilding(entity);

		// no idea why this is called here? so, away it goes
		//this.getBuildingGuildGoodsByEra(false, entity, false);
		
		//if (entity.type !== "street")
		//	console.log('entity ', entity.name, entity, entity.allyRoom, data);
		return entity;
	},
};