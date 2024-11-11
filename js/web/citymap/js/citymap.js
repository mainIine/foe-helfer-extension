/*
 * **************************************************************************************
 * Copyright (C) 2024 FoE-Helper team - All Rights Reserved
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
	OwnCityData: null,
	CityEntities: null,
	ScaleUnit: 100,
	CityView: 'skew',
	UnlockedAreas: null,
	BlockedAreas: null,
	OccupiedArea: 0,
	EfficiencyFactor: 0,
	IsExtern: false,
	OutpostScaleUnit: 100,
	CulturalOutpostData: {},
	CulturalOutpostAreas: [],
	EraOutpostData: null,
	EraOutpostAreas: [],
	QIData: null,
	QIStats: null,
	QIAreas: [],


	/**
	 * @param event
	 * @param event
	 * @param Data The City data
	 * @param Title Name of the city
	 */
	init: (event, Data = null, Title = i18n('Boxes.CityMap.YourCity'), isOtherPlayer = false)=> {
		CityMap.IsExtern = false
		if (isOtherPlayer) {
			CityMap.IsExtern = true
		}

		if (Data === null) { // No data => own city
			Data = MainParser.CityMapData
			CityMap.OwnCityData = MainParser.NewCityMapData
			if (ActiveMap === "cultural_outpost") {
				Data = CityMap.CulturalOutpostData
			}
			else if (ActiveMap === "era_outpost") {
				Data = CityMap.EraOutpostData
			}
			else if (ActiveMap === "guild_raids") {
				Data = CityMap.QIData
			}
		}

		CityMap.CityData = Object.values(Data).sort(function (X1, X2) {
			if (X1.x < X2.x) return -1;
			if (X1.x > X2.x) return 1;
		});

		let scale = localStorage.getItem('CityMapScale'),
			outpostScale = localStorage.getItem('OutpostMapScale'),
			view = localStorage.getItem('CityMapView');

		if(null !== scale) { // scaling has already been set?
			CityMap.ScaleUnit = parseInt(scale);
		}

		if(null !== view) { // view has already been set?
			CityMap.CityView = view;
		}

		if(null !== outpostScale) { // scaling has already been set?
			CityMap.OutpostScaleUnit = parseInt(outpostScale);
		}

		if( $('#city-map-overlay').length < 1 ) {
			HTML.AddCssFile('citymap');

			HTML.Box({
				id: 'city-map-overlay',
				title: Title,
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize : true
			});


			setTimeout(()=>{
				CityMap.PrepareBox(Title);
			}, 100);
		}
		else if (!event) {
			HTML.CloseOpenBox('city-map-overlay');
			return;
		}

		setTimeout(()=>{
			// separate city
			if (Data === false) {
				setTimeout(()=> {
					CityMap.SetMapBuildings();
				}, 100);

			} else {
				CityMap.SetMapBuildings(Data);
			}

		}, 100);
	},


	/**
	 * Stadtkarte vorbereiten => Menü rein
	 *
	 * @param Title
	 */
	PrepareBox: (Title)=> {
		let oB = $('#city-map-overlayBody'),
			wrapper = $('<div />').attr({'id':'citymap-wrapper'}),
			mapfilters = $('<div />').attr({'id': 'map-filters'});

		wrapper.append( 
			$('<div />').attr('id', 'map-container')
				.append( $('<div />').attr('id', 'grid-outer').attr('data-unit', CityMap.ScaleUnit).attr('data-view', CityMap.CityView)
					.append( $('<div />').attr('id', 'map-grid') ) 
				) 
			)
			.append( 
				$('<div />').attr({'id': 'sidebar'}) 
					.append( mapfilters )
			);

		$('#city-map-overlayHeader > .title').attr('id', 'map' + CityMap.hashCode(Title));

		if (ActiveMap === "cultural_outpost" || ActiveMap === "era_outpost" || ActiveMap === "guild_raids") {
			oB.addClass('outpost').addClass(ActiveMap)
		}

		let menu = $('<div />').attr('id', 'city-map-menu');

		/* Ansicht wechseln */
		let dropView = $('<select />').attr('id', 'menu-view').addClass('game-cursor')
			.append($('<option />').prop('selected', CityMap.CityView === 'normal').attr('data-view', 'normal').text(i18n('Boxes.CityMap.NormalPerspecitve')).addClass('game-cursor') )
			.append($('<option />').prop('selected', CityMap.CityView === 'skew').attr('data-view', 'skew').text(i18n('Boxes.CityMap.CavalierPerspecitve')).addClass('game-cursor') );

		menu.append(dropView);

		$('#city-map-overlay').on('change', '#menu-view', function(){
			let view = $('#menu-view option:selected').data('view');

			$('#grid-outer').attr('data-view', view);
			localStorage.setItem('CityMapView', view);
		});


		/* Skalierung wechseln */
		let scaleUnit = CityMap.ScaleUnit;
		if (ActiveMap == "cultural_outpost" || ActiveMap === "era_outpost" || ActiveMap === "guild_raids") {
			scaleUnit = CityMap.OutpostScaleUnit;
		}
		let scaleView = $('<select />').attr('id', 'scale-view').addClass('game-cursor')
			.append( $('<option />').prop('selected', scaleUnit === 60).attr('data-scale', 60).text('60%').addClass('game-cursor') )
			.append( $('<option />').prop('selected', scaleUnit === 80).attr('data-scale', 80).text('80%').addClass('game-cursor') )
			.append( $('<option />').prop('selected', scaleUnit === 100).attr('data-scale', 100).text('100%').addClass('game-cursor') )
			.append( $('<option />').prop('selected', scaleUnit === 120).attr('data-scale', 120).text('120%').addClass('game-cursor') )
			.append( $('<option />').prop('selected', scaleUnit === 140).attr('data-scale', 140).text('140%').addClass('game-cursor') )
			.append( $('<option />').prop('selected', scaleUnit === 160).attr('data-scale', 160).text('160%').addClass('game-cursor') )
			.append( $('<option />').prop('selected', scaleUnit === 180).attr('data-scale', 180).text('180%').addClass('game-cursor') )
		;

		menu.append(scaleView);

		$('#city-map-overlay').on('change', '#scale-view', function(){
			let unit = parseInt($('#scale-view option:selected').data('scale'));
			
			if(ActiveMap === 'main'){
				$('#highlight-old-buildings')[0].checked=false;
				$('#show-nostreet-buildings')[0].checked=false;
			}

			$('#grid-outer').attr('data-unit', unit);

			if (ActiveMap == "cultural_outpost" || ActiveMap === "era_outpost" || ActiveMap === "guild_raids") {
				localStorage.setItem('OutpostMapScale', unit);
				CityMap.OutpostScaleUnit = unit;
			}
			else {
				localStorage.setItem('CityMapScale', unit);
				CityMap.ScaleUnit = unit;	
			}

			CityMap.SetMapBuildings(false);

			$('#map-container').scrollTo( $('.highlighted') , 800, {offset: {left: -280, top: -280}, easing: 'swing'});
			$('.to-old-legends').hide();
			$('.building-count-area').show();
		});

		// Button for submit Box
		if (CityMap.IsExtern === false && ActiveMap === 'main') {
			menu.append($('<input type="text" id="BuildingsFilter" placeholder="'+ i18n('Boxes.CityMap.FilterBuildings') +'" oninput="CityMap.filterBuildings(this.value)">'));
			menu.append(
				$('<div />').addClass('btn-group')
					.append($('<button />').addClass('btn-default ml-auto').attr({ id: 'copy-meta-infos', onclick: 'CityMap.copyMetaInfos()' }).text(i18n('Boxes.CityMap.CopyMetaInfos')))
					.append($('<button />').addClass('btn-default ml-auto').attr({ id: 'show-submit-box', onclick: 'CityMap.showSubmitBox()' }).text(i18n('Boxes.CityMap.ShowSubmitBox')))
			);
		}

		mapfilters.append(
			$('<label />').attr({ for: 'highlight-old-buildings' }).text(i18n('Boxes.CityMap.HighlightOldBuildings'))
				.prepend($('<input />').attr({ type: 'checkbox', id: 'highlight-old-buildings', onclick: 'CityMap.highlightOldBuildings()' }))
			);

		mapfilters.append(
			$('<label />').attr({ for: 'show-nostreet-buildings' }).text(i18n('Boxes.CityMap.ShowNoStreetBuildings'))
				.prepend($('<input />').attr({ type: 'checkbox', id: 'show-nostreet-buildings', onclick: 'CityMap.showNoStreetBuildings()' }))
			);

		oB.append(wrapper)
		$('#citymap-wrapper').append(menu)

		if (ActiveMap === "guild_raids") {
			$("#sidebar").append(CityMap.showQIStats())
			$("#sidebar").append(CityMap.showQIBuildings())
		}
		if (CityMap.IsExtern === true) {
			$("#sidebar").append($('<a id="openEfficiencyRating" class="btn-default" onclick="Productions.ShowRating(true)">'+ i18n('Menu.ProductionsRating.Title') +'</a>'));
		}
	},


	/**
	 * Erzeugt ein Raster für den Hintergrund
	 */
	BuildGrid:()=> {
		let ua = CityMap.UnlockedAreas;
		let xOffset = 0;
		let yOffset = 0;
		let scaleUnit = CityMap.ScaleUnit;
		if (ActiveMap === "cultural_outpost") {
			ua = CityMap.CulturalOutpostAreas;
			xOffset = 500;
			scaleUnit = CityMap.OutpostScaleUnit;
		}
		else if (ActiveMap === "era_outpost") {
			ua = CityMap.EraOutpostAreas;
			yOffset = 500;
			scaleUnit = CityMap.OutpostScaleUnit;
		}
		else if (ActiveMap === "guild_raids") {
			ua = CityMap.QIAreas;
			yOffset = 500;
			xOffset = 500;
			scaleUnit = CityMap.OutpostScaleUnit;
		}

		for(let i in ua)
		{
			if(!ua.hasOwnProperty(i)){
				break;
			}

			let w = ((ua[i]['width'] * scaleUnit) / 100 ),
				h = ((ua[i]['length'] * scaleUnit) / 100 ),
				x = (((ua[i]['x']-xOffset) * scaleUnit) / 100 ),
				y = (((ua[i]['y']-yOffset) * scaleUnit) / 100 ),
				G = $('#map-grid')

			let a = $('<span />')
				.addClass('map-bg')
				.css({
					width: w + 'em',
					height: h + 'em',
					left: x + 'em',
					top: y + 'em',
				});

			// Ist es das Startfeld?
			if(ua[i]['width'] === 16 && ua[i]['length'] === 16) {
				a.addClass('startmap');
			}

			G.append(a);
		}
	},


	/**
	 * Container gemäß den Koordianten zusammensetzen
	 *
	 * @param Data
	 */
	SetOutpostBuildings: ()=> {
		// einmal komplett leer machen, wenn gewünscht
		$('#grid-outer').find('.map-bg').remove();
		$('#grid-outer').find('.entity').remove();

		CityMap.BuildGrid()

		let buildings = CityMap.CulturalOutpostData
		let xOffset = 0, yOffset = 0
		if (ActiveMap == "era_outpost") {
			buildings = CityMap.EraOutpostData
			yOffset = 500
		}
		else if (ActiveMap == "cultural_outpost") {
			xOffset = 500
		}
		else if (ActiveMap == "guild_raids") {
			buildings = CityMap.QIData
			xOffset = 500
			yOffset = 500
		}

		for (let b in buildings) {
			let x = (buildings[b]['x'] || 0) - xOffset
			let y = (buildings[b]['y'] || 0) - yOffset
			let CityMapEntity = buildings[b],
				d = MainParser.CityEntities[CityMapEntity['cityentity_id']],
				BuildingSize = CityMap.GetBuildingSize(CityMapEntity),

				xx = (parseInt(x) * CityMap.OutpostScaleUnit) / 100,
				yy = (parseInt(y) * CityMap.OutpostScaleUnit) / 100,
				xsize = ((parseInt(BuildingSize['xsize']) * CityMap.OutpostScaleUnit) / 100),
				ysize = ((parseInt(BuildingSize['ysize']) * CityMap.OutpostScaleUnit) / 100)
				
				f = $('<span />').addClass('entity ' + d['type']).css({
					width: xsize + 'em',
					height: ysize + 'em',
					left: xx + 'em',
					top: yy + 'em'
				})
				.attr('title', d['name'] + ', ' + BuildingSize['xsize']+ 'x' +BuildingSize['ysize'])
				.attr('data-entityid', CityMapEntity['id']);

			$('#grid-outer').append( f );
		}

		$('.entity').tooltip({
			container: '#city-map-overlayBody',
			html: true
		});

		$('#grid-outer').draggable();
	},


	showQIStats: () => {
		if (!CityMap.QIData) return
		let boosts = MainParser.BoostSums
		let supply_boost = boosts.guild_raids_supplies_production*0.01
		let coin_boost = boosts.guild_raids_coins_production*0.01
		let buildings = Object.values(CityMap.QIData)
		let population = 0, totalPopulation = 0, euphoria = 0, euphoriaBoost = 0, supplies = 0, money = 0, att_def_boost_attacker = 0, att_def_boost_defender = 0
		let actions = boosts.guild_raids_action_points_collection
		for (let b in buildings) {
			let building = CityMap.setQIBuilding(MainParser.CityEntities[buildings[b]['cityentity_id']])
			if (building.type !== "impediment" && building.type !== "street") {
				population += building.population
				totalPopulation += (building.population > 0 ? building.population : 0)
				euphoria += building.euphoria
			}
		}
		let euphoriaFactor = euphoria/totalPopulation
		if (euphoriaFactor <= 0.2)
			euphoriaBoost = 0.2
		else if (euphoriaFactor > 0.20 && euphoriaFactor <= 0.60)
			euphoriaBoost = 0.6
		else if (euphoriaFactor > 0.60 && euphoriaFactor <= 0.80)
			euphoriaBoost = 0.8
		else if (euphoriaFactor > 0.80 && euphoriaFactor <= 1.20)
			euphoriaBoost = 1
		else if (euphoriaFactor > 1.20 && euphoriaFactor <= 1.40)
			euphoriaBoost = 1.1
		else if (euphoriaFactor > 1.40 && euphoriaFactor < 2.0)
			euphoriaBoost = 1.2
		else 
			euphoriaBoost = 1.5

		let now = MainParser.getCurrentDateTime()/1000
		for (let b of buildings) {
			let building = CityMap.setQIBuilding(MainParser.CityEntities[b.cityentity_id])
			if (building.type !== "impediment" && building.type !== "street") {
				
				if (building.boosts !== null) {
					for (let i in building.boosts) {
						let boost = building.boosts[i]
						if (boost.type === "att_def_boost_attacker")
							att_def_boost_attacker += boost.value 
						if (boost.type === "att_def_boost_defender")
							att_def_boost_defender += boost.value
						if (boost.type === "guild_raids_action_points_collection" && b.state.constructionFinishedAt < now)
							actions += boost.value 
					}
				}
				if (building.production !== null) {
					if (building.type !== "military" && building.type !== "goods" && building.type !== "main_building") {
						if (building.production.guild_raids_supplies)
							supplies += Math.round(building.production.guild_raids_supplies*(euphoriaBoost+supply_boost))
						if (building.production.guild_raids_money)
							money += Math.round(building.production.guild_raids_money*(euphoriaBoost+coin_boost))
					}
				}
			}
		}

		CityMap.QIStats = {
			population: population,
			totalPopulation: totalPopulation,
			euphoria: euphoria,
			euphoriaBoost: euphoriaBoost,
			money: money,
			supplies: supplies,
			att_def_boost_attacker: att_def_boost_attacker,
			att_def_boost_defender: att_def_boost_defender,
			actions: actions,
		}

		out = '<div class="text-center" style="padding-bottom: 10px">'
		out += '<p><i>'+i18n('Boxes.CityMap.QIHint')+'</i></p>'
		out += '<span class="prod population">'+CityMap.QIStats.population+'/'+CityMap.QIStats.totalPopulation+'</span> '
		out += '<span class="prod happiness">'+CityMap.QIStats.euphoriaBoost*100+'%</span> <br>'
		out += '<span class="prod guild_raids_money">'+HTML.Format(CityMap.QIStats.money)+'</span> + '
		out += '<span class="prod guild_raids_supplies">'+HTML.Format(CityMap.QIStats.supplies)+'</span> '+i18n('Boxes.CityMap.QICycle')+'<br>'
		out += '<span class="prod att_def_boost_attacker">'+CityMap.QIStats.att_def_boost_attacker+'</span> '
		out += '<span class="prod att_def_boost_defender">'+CityMap.QIStats.att_def_boost_defender+'</span> '+'<br>'
		out += '<span class="prod guild_raids_action_points_collection">'+'+'+CityMap.QIStats.actions+'</span> '+i18n('Boxes.CityMap.QIActionRechargeCycle')
		
		out += "<div>"
		return out
	},


	showQIBuildings: () => {
		let boosts = MainParser.BoostSums
		let supply_boost = 0, coin_boost = 0
		coin_boost = boosts.guild_raids_coins_production*0.01
		supply_boost = boosts.guild_raids_supplies_production*0.01
		let buildings = Object.values(CityMap.QIData)
		buildings.sort((a, b) => {
			if (a.cityentity_id < b.cityentity_id) return -1
			if (a.cityentity_id > b.cityentity_id) return 1
			return 0
		})

		let out = '<table class="foe-table">'
		out += '<thead><tr><th colspan="2">'+i18n('Boxes.CityMap.Building')+'</th><th class="population textright"></th><th class="happiness textright"></th><th>'+i18n('Boxes.CityMap.Boosts')+'</th></tr></thead>'
		out += "<tbody>"

		let uniques = {}
		for (let b of buildings) {
			if (!uniques[b.cityentity_id]) 
				uniques[b.cityentity_id] = 1
			else
				uniques[b.cityentity_id] += 1
		}
		for (let [id,count] of Object.entries(uniques)) {
			let building = CityMap.setQIBuilding(MainParser.CityEntities[id])
			if (building.type !== "impediment" && building.type !== "street") {
				out += "<tr><td>" + building.name + "</td><td>" + (count>1?"x"+count:"") + "</td>"
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
						let eBoost = CityMap.QIStats.euphoriaBoost
						if (building.type === "main_building"){
							out += (building.production.guild_raids_supplies ? '<span class="prod guild_raids_supplies">'+HTML.Format(Math.round(building.production.guild_raids_supplies))+'</span> ' : " ")
							out += (building.production.guild_raids_money ? '<span class="prod guild_raids_money">'+HTML.Format(Math.round(building.production.guild_raids_money))+'</span> ' : "")
						} else{
							out += (building.production.guild_raids_supplies ? '<span class="prod guild_raids_supplies">'+HTML.Format(Math.round(building.production.guild_raids_supplies*(eBoost+supply_boost)))+'</span> ' : " ")
							out += (building.production.guild_raids_money ? '<span class="prod guild_raids_money">'+HTML.Format(Math.round(building.production.guild_raids_money*(eBoost+coin_boost)))+'</span> ' : "")
						}
					}
				}
				if (building.boosts !== null) {
					for (let i in building.boosts) {
						let boost = building.boosts[i]
						out += '<span class="prod '+boost.type+'">' + boost.value + '</span> '
					}
				}
				out += "</td></tr>"
			}
		}
		out += "</tbody></table>"
		return out
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
			type: data.type
		}

		return building
	},


	/**
	 * Container gemäß den Koordianten zusammensetzen
	 * @param Data
	 */
	SetMapBuildings: (Data = null)=> {
		if (ActiveMap === "cultural_outpost" || ActiveMap === "era_outpost" || ActiveMap === "guild_raids") {
			CityMap.SetOutpostBuildings() 
			return
		}

		let ActiveId = $('#grid-outer').find('.highlighted').data('entityid') || null;

		// einmal komplett leer machen, wenn gewünscht
		$('#grid-outer').find('.map-bg').remove();
		$('#grid-outer').find('.entity').remove();

		CityMap.OccupiedArea = 0;
		CityMap.OccupiedArea2 = [];
		CityMap.buildingsTotal = 0
		CityMap.streetsTotal = 0
		let StreetsNeeded = 0;

		if(CityMap.IsExtern === false) {
			// Unlocked Areas rendern
			CityMap.BuildGrid();
		}

		let MinX = 0,
			MinY = 0,
			MaxX = 71,
			MaxY = 71;

		if (CityMap.IsExtern == true)
			buildingData = CityMap.createNewCityMapEntities(Object.values(MainParser.OtherPlayerCityMapData))
		else
			buildingData = CityMap.createNewCityMapEntities(Object.values(MainParser.CityMapData))

		for (const building of Object.values(buildingData)) {
			if (building.coords.x < MinX || building.coords.x > MaxX || building.coords.y < MinY || building.coords.y > MaxY) continue

			let x = (building.coords.x === undefined ? 0 : parseInt((building.coords.x * CityMap.ScaleUnit)) / 100),
			y = (building.coords.y === undefined ? 0 : parseInt((building.coords.y * CityMap.ScaleUnit)) / 100),
			xsize = (building.size.width * CityMap.ScaleUnit) / 100,
			ysize = (building.size.length * CityMap.ScaleUnit) / 100,
			noStreet = '', isSpecial = '', chainBuilding = ''

			noStreet = (building.needsStreet == 0 ? ' noStreet' : '')
			isSpecial = (building.isSpecial ? ' special' : '')
			chainBuilding = (building.chainBuilding != undefined ? ' chain' : '')
			
			f = $('<span />').addClass('entity ' + building.type + noStreet + isSpecial + chainBuilding).css({
				width: xsize + 'em',
				height: ysize + 'em',
				left: x + 'em',
				top: y + 'em'
			})
				.attr('title', building.name)
				.attr('data-id', building.id);

			CityMap.OccupiedArea += (building.size.width * building.size.length);
			if (building.type == "street")
				CityMap.streetsTotal++
			else
				CityMap.buildingsTotal++

			if (!CityMap.OccupiedArea2[building.type]) CityMap.OccupiedArea2[building.type] = 0;
			CityMap.OccupiedArea2[building.type] += (building.size.width * building.size.length);

			StreetsNeeded += (building.state.connected && building.type != "street" ? parseFloat(Math.min(building.size.width, building.size.length)) * building.needsStreet / 2 : 0)

			if (building.eraName) {
				let era = Technologies.Eras[building.eraName]

				f.attr({
					title: `${building.name}, ${building.size.length}x${building.size.width}<br><em>${i18n('Eras.' + (era || 0) )}</em>`
				})

				if (era < CurrentEraID && building.type != "greatbuilding" && era != 0) {
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
							f.addClass('to-old');
							break;
					}
                }
			}

			// die Größe wurde geändert, wieder aktivieren
			if (ActiveId !== null && ActiveId === building.id) {
				f.addClass('highlighted');
			}

			$('#grid-outer').append( f );
		}

		let StreetsUsed = CityMap.OccupiedArea2['street'] | 0;
		CityMap.EfficiencyFactor = StreetsNeeded / StreetsUsed;

		// Gebäudenamen via Tooltip
		$('.entity').tooltip({
			container: '#city-map-overlayBody',
			html: true
		});

		$('#grid-outer').draggable();

		CityMap.getAreas();
	},


	/**
	 * Statistiken in die rechte Sidebar
	 */
	getAreas: ()=>{
		let total = ((CityMap.UnlockedAreas.length -1) * 16) + 256, // x + (4*4) + 16*16
			occupied = CityMap.OccupiedArea,
			txtTotal = i18n('Boxes.CityMap.WholeArea') + total,
			txtFree = i18n('Boxes.CityMap.FreeArea') + (total - occupied),
			txtTotalBuildings = i18n('Boxes.CityMap.BuildingsAmount') + CityMap.buildingsTotal,
			txtTotalStreets = i18n('Boxes.CityMap.StreetsAmount') + CityMap.streetsTotal;

		if( $('#area-state').length === 0 ){
			let aW = $('<div />').attr('id', 'area-state');

			aW.append( $('<div />').addClass('building-count-area') );
			aW.append( $('<p />').addClass('to-old-legends').hide() );
			aW.append( $('<p />').addClass('total-area') );
			aW.append( $('<p />').addClass('occupied-area') );
			aW.append( $('<p />').addClass('total-buildings') );

			$('#sidebar').append(aW);
		}

		// Non player city => Unlocked areas cant be detected => dont show free space
		if (!CityMap.IsExtern) {
			$('.total-area').html(txtTotal);
			$('.occupied-area').html(txtFree);
			$('.total-buildings').html(txtTotalBuildings);
		}

		let sortable = [];
		for(let x in CityMap.OccupiedArea2) sortable.push([x, CityMap.OccupiedArea2[x]]);
		sortable.sort((a, b) => a[1] - b[1]);
		sortable.reverse();

		let txtCount = [];

		for(let x in sortable ) {
			if(!sortable.hasOwnProperty(x))	break

			let type =  sortable[x][0];

			let TypeName = i18n('Boxes.CityMap.' + type)
			const count = sortable[x][1];
			const pct = parseFloat(100*count/CityMap.OccupiedArea).toFixed(1);

			let str = `${TypeName}:<br> ${count} (${pct}%)`;

			if (type === 'street') {
				str = str + '<br>' + HTML.Format(Math.round(CityMap.EfficiencyFactor * 10000) / 100) + '% ' + i18n('Boxes.Citymap.Efficiency');
			}
			str = `<p><span class="square ${type}"></span>${str}</p>`;
			txtCount.push(str);
		}
		$('.building-count-area').html(txtCount.join(''));
		
		let legends = [];
		
		legends.push(`<span class="older-1 diagonal"></span> ${$('#map-container .older-1').length} ${i18n('Boxes.CityMap.OlderThan1Era')}<br>`);
		legends.push(`<span class="older-2 diagonal"></span> ${$('#map-container .older-2').length} ${i18n('Boxes.CityMap.OlderThan2Era')}<br>`);
		legends.push(`<span class="older-3 diagonal"></span> ${$('#map-container .older-3').length} ${i18n('Boxes.CityMap.OlderThan3Era')}<br>`);
		legends.push(`<span class="to-old diagonal"></span> ${$('#map-container .to-old').length} ${i18n('Boxes.CityMap.OlderThan4Era')}<br>`);

		$('.to-old-legends').html(legends.join(''));
	},


	/**
	 * Erzeugt einen Hash vom String
	 *
	 * @param str
	 * @returns {number}
	 */
	hashCode: (str)=>{
		return str.split('').reduce((prevHash, currVal) => (((prevHash << 5) - prevHash) + currVal.charCodeAt(0))|0, 0);
	},


	/**
	 * Show the submit box
	 */
	showSubmitBox: () => {
		let $CityMapSubmit = $('#CityMapSubmit');

		if ($CityMapSubmit.length > 0)
		{
			$CityMapSubmit.remove();
		}

		if ($CityMapSubmit.length < 1)
		{
			HTML.Box({
				'id': 'CityMapSubmit',
				'title': i18n('Boxes.CityMap.TitleSend'),
				'auto_close': true,
				'saveCords': false
			});

			HTML.AddCssFile('citymap');

			let desc = '<p class="text-center">' + i18n('Boxes.CityMap.Desc1') + '</p>';

			desc += '<p class="text-center" id="msg-line"><button class="btn-default" onclick="CityMap.SubmitData()">' + i18n('Boxes.CityMap.Submit') + '</button></p>';

			$('#CityMapSubmitBody').html(desc);
		}
	},


	/**
	 * Highlight old buildings
	 */
	highlightOldBuildings: ()=> {
		$('.oldBuildings').toggleClass('diagonal');
		$('.building-count-area, .to-old-legends').toggle();
	},


	/**
	 * Show Buildings that do not need a street
	 */
	showNoStreetBuildings: ()=> {
		$('.noStreet').toggleClass('highlight');
	},


	/**
	 * Send citydata to the server
	 *
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
				entities: MainParser.CityMapData,
				areas: CityMap.UnlockedAreas,
				blockedAreas: CityMap.BlockedAreas,
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
		helper.str.copyToClipboard(
			JSON.stringify({CityMapData:MainParser.CityMapData,CityEntities:MainParser.CityEntities,UnlockedAreas:CityMap.UnlockedAreas})
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
		spans = $('span.entity');
		for (sp of spans) {
			let title = $(sp).attr('data-original-title');
			if ((string != "") && (title.substr(0,title.indexOf("<em>")).toLowerCase().indexOf(string.toLowerCase()) > -1)) {
				$(sp).addClass('highlighted');
			} else {
				$(sp).removeClass('highlighted');
			}
		}
		$('#grid-outer').addClass('desaturate');
		if (string == '') {
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

	// returns negative numbers for builidings that use population, 0 for buildings that dont provide or use it
	setPopulation: (metaData, data, era) => {
		let population = 0
		let eraId = Technologies.InnoEras[era]
		
		if (metaData.__class__ != "GenericCityEntity") { // not a generic building
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
		let isPolivated = CityMap.setPolivation(data, metaData)

		let bgHappiness = data.bonus
		if (metaData.__class__ != "GenericCityEntity") {
			if (metaData.entity_levels.length > 0) { // special building
				if (metaData.entity_levels[eraId].provided_happiness) 
					return (data?.state?.__class__ == "PolishedState" ? metaData.entity_levels[eraId].provided_happiness*2 : metaData.entity_levels[eraId].provided_happiness)
				return happiness
			}
			else if (bgHappiness) { // great building, e.g. Alcatraz
				if (bgHappiness.type == "happiness") 
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
			if (ability.__class__ == "MotivatableAbility")
				isPolivationable = true
			else if (ability.__class__ == "PolishableAbility") {
				isPolivationable = true
				isPolishable = true
			}
		})
		if (metaData.__class__ == "GenericCityEntity")
			isPolivationable = (metaData.components.AllAge.socialInteraction != undefined)
		
		if (isPolivationable) {
			if (metaData.__class__ != "GenericCityEntity") {
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
				if (data?.state?.socialInteractionStartedAt > 0 && data?.state?.socialInteractionId == "polish") {
					if (data?.state?.socialInteractionStartedAt + 43200 - parseInt(Date.now()/1000) < 0)
						return false
					return true
				}
				else if (data?.state?.socialInteractionStartedAt > 0 && data?.state?.socialInteractionId == "motivate") 
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
			if (ability.__class__ == "MotivatableAbility")
				isPolivationable = true
			else if (ability.__class__ == "PolishableAbility") {
				isPolivationable = true
			}
		})
		if (metaData.__class__ == "GenericCityEntity")
			isPolivationable = (metaData.components.AllAge.socialInteraction != undefined)
		return isPolivationable
	},
	
	// returns chainId (string), returns undefined if not a chain building
	setChainBuilding(metaData) {
		let chainId = undefined
		let type = null, x = 0, y = 0
		metaData.abilities.forEach(ability => {
			if (ability.chainId) {
				chainId = ability.chainId
				type = (ability.__class__ == "ChainStartAbility" ? "start" : "link")
				// currently all chains only have ONE side where you can attach builidings (except mughals main building and hippodrome tracks)
				x = ability.linkPositions[0].topLeftPoint.x || 0 
				y = ability.linkPositions[0].topLeftPoint.y || 0 
			}
		});
		if (chainId !== undefined)
			return { name: chainId, type: type, chainPosX: x, chainPosY: y }
	},

	// this creates a pseudo building for effiency ratings etc
	createChainedBuilding(allLinkedBuildings = []) {
		let chainedBuilding = allLinkedBuildings[0] // first building is the start building

		for (link of allLinkedBuildings) {
			if (link.chainBuilding.type != "start") {
				chainedBuilding.size.width = chainedBuilding.size.width + (link.coords.x != chainedBuilding.coords.x ? link.size.width : 0)
				chainedBuilding.size.length = chainedBuilding.size.length + (link.coords.y != chainedBuilding.coords.y ? link.size.length : 0)
				chainedBuilding.happiness += link.happiness

				if (link.boosts !== undefined) 
					chainedBuilding.boosts = [...chainedBuilding.boosts || [], ...link.boosts]
				if (link.production !== undefined && link.production !== false) {
					// console.log(link.production)
					chainedBuilding.production = [...chainedBuilding.production, ...link.production]
				}
				link.chainBuilding.type = "linked"
			}
		}
		if (allLinkedBuildings.length > 1) {
			chainedBuilding.name = chainedBuilding.name + " +" + (allLinkedBuildings.length-1)
		}
		return chainedBuilding
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

	// returns an object with the buildings size
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
	setBuildingBoosts(metaData, data, era) {
		let eraName = (era == 'AllAge' ? 'BronzeAge' : era) // for some reason Watchtower Level 2 (example) has an era list even though the boost is the same everywhere. thx inno
		let boosts = []
		let isSet = this.setSetBuilding(metaData)
		let isChain = this.setChainBuilding(metaData)
		if (metaData.__class__ != "GenericCityEntity") {
			metaData.abilities.forEach(ability => {
				if (ability.boostHints) {
					ability.boostHints.forEach(abilityBoost => {
						if (abilityBoost.boostHintEraMap[eraName] != undefined) { // has different boosts for different eras
							// example data: targetedFeature: "all", type: [], value: 11
							let boost = {
								feature: abilityBoost.boostHintEraMap[eraName].targetedFeature,
								type: MainParser.BoostMapper[abilityBoost.boostHintEraMap[eraName].type] || [abilityBoost.boostHintEraMap[eraName].type],
								value: abilityBoost.boostHintEraMap[eraName].value
							}
							boosts.push(boost)
						}
						else { // if only AllAge boost
							let boost = {
								feature: abilityBoost.boostHintEraMap.AllAge.targetedFeature,
								type: MainParser.BoostMapper[abilityBoost.boostHintEraMap.AllAge.type] || [abilityBoost.boostHintEraMap.AllAge.type],
								value: abilityBoost.boostHintEraMap.AllAge.value
							}
							boosts.push(boost)
						}
					})
				}
				if ((isSet !== undefined && ability.__class__ === "BonusOnSetAdjacencyAbility") || (isChain !== undefined && ability.__class__ === "ChainLinkAbility")) {
					for (const bonus of ability.bonuses) {
						if (bonus.boost.length == 0) return
						else {
							if (bonus.boost[eraName]) {
								let boost = {
									feature: bonus.boost[eraName].targetedFeature,
									type: MainParser.BoostMapper[bonus.boost[eraName].type] || [bonus.boost[eraName].type],
									value: bonus.boost[eraName].value,
									needsLink: true
								}
								boosts.push(boost)
							}
							else if (bonus.boost.AllAge) {
								let boost = {
									feature: bonus.boost.AllAge.targetedFeature,
									type: MainParser.BoostMapper[bonus.boost.AllAge.type] || [bonus.boost.AllAge.type],
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
						type: MainParser.BoostMapper[data.bonus.type] || [data.bonus.type],
						value: data.bonus.value
					}
					if (data.bonus.type !== "happiness_amount" && data.bonus.type !== "population")
						boosts.push(boost)
				}
			}
			else if (metaData.id.includes("CastleSystem")) {
				if (MainParser.Boosts[data.id] != undefined)
					MainParser.Boosts[data.id].forEach(castleBoost => {
						let boost = {
							feature: "all",
							type: MainParser.BoostMapper[castleBoost.type] || undefined, // do not include weird boosts
							value: castleBoost.value
						}
						if (boost.type !== undefined)
							boosts.push(boost)
					})
			}
		}
		else {
			if (metaData.components[era]?.boosts) {
				metaData.components[era].boosts.boosts.forEach(abilityBoost => {
					let boost = {
						feature: abilityBoost.targetedFeature,
						type: MainParser.BoostMapper[abilityBoost.type] || [abilityBoost.type],
						value: abilityBoost.value,
					};
					boosts.push(boost)
				})
			}
			if (metaData.components.AllAge?.boosts) {
				metaData.components.AllAge.boosts.boosts.forEach(abilityBoost => {
					let boost = {
						feature: abilityBoost.targetedFeature,
						type: MainParser.BoostMapper[abilityBoost.type] || [abilityBoost.type],
						value: abilityBoost.value,
					};
					boosts.push(boost)
				})
			}
		}
		let allyStats = MainParser.Allies.getProd(data.id||0)
		if (allyStats?.boosts) {
			allyStats?.boosts.forEach(abilityBoost => {
				let boost = {
					feature: abilityBoost.targetedFeature,
					type: MainParser.BoostMapper[abilityBoost.type] || [abilityBoost.type],
					value: abilityBoost.value,
				};
				boosts.push(boost)
			})
		}
		
		if (boosts.length > 0)
			return boosts
		return undefined
	},

	
	setState(data) { 
		if ((data?.state?.__class__ == "IdleState" && !data?.cityentity_id?.includes("CastleSystem")) || data?.state?.__class__ == undefined)
			return "idle"
		else if (data.state.__class__ == "ProductionFinishedState")
			return "collectable"
		else if (data.state.__class__ == "PlunderedState" )
			return "plundered"
		else if (data.cityentity_id.includes("CastleSystem"))
			return "producing"
		return "producing"
	},

	// building is not in construction menu
	isSpecialBuilding(metaData) { 
		if (metaData.__class__ == "GenericCityEntity")
			return true // generic buildings are always special
		return metaData.is_special
	},

	// returns street level (1 or 2) or 0
	needsStreet(metaData) {
		let needsStreet = metaData.requirements?.street_connection_level
		if (needsStreet == undefined) {
			metaData.abilities.forEach(ability => {
				if (ability.__class__ == "StreetConnectionRequirementComponent")
					needsStreet = 1
			});
			if (metaData.components?.AllAge?.streetConnectionRequirement != undefined)
				needsStreet = metaData.components.AllAge.streetConnectionRequirement.requiredLevel
		}
		return (needsStreet == undefined ? 0 : needsStreet)
	},
	
	setStateTimes(data) {
		let state = this.setState(data)
		
		if (state == "producing") {
			if (data.cityentity_id.includes("CastleSystem")) {
				return { at: MainParser.CastleSystemChest.dailyRewardCollectionAvailableAt, in: MainParser.CastleSystemChest.dailyRewardCollectionAvailableAt - parseInt(Date.now()/1000) }
			}
			return { at: data?.state?.next_state_transition_at, in: data?.state?.next_state_transition_in }
		}
		else if (state == "collectable")
			return { at: moment().unix(), in: 0 }
		return { at: undefined, in: undefined };
	},

	isExpiredBuilding(data) {
		if (data.type == "generic_building")
			if (data.decayedFromCityEntityId != undefined)
				return true;
		return false;
	},

	// returns false, time or total collections
	isLimitedBuilding(metaData) {
		if (metaData.components?.AllAge?.limited != undefined) {
			if (metaData.components?.AllAge?.limited.config.expireTime != undefined)
				return metaData.components.AllAge.limited.config.expireTime
			if (metaData.components?.AllAge?.limited.config.collectionAmount != undefined)
				return metaData.components.AllAge.limited.config.collectionAmount
		}
		return false
	},

	// returns undefined or time the building was built
	setBuildTime(data) {
		if (data.type == "generic_building")
			if (data?.state?.constructionFinishedAt != undefined) 
				return data?.state?.constructionFinishedAt;
		return undefined;
	},

	// returns true or false
	setConnection(metaData, data) {
		let connected = (this.needsStreet(metaData, data) == 0)
		if (!connected) 
			connected = (data?.connected == 1)
		return connected
	},

	// find out if a chain start building has links, return all buildings in an array
	hasLinks(building, connectedBuildings = [], dirX = 0, dirY = 0) {
		connectedBuildings.push(building)
		
		if (building.chainBuilding?.type == "start") {
			dirX = building?.chainBuilding?.chainPosX != 0 ? parseInt(building?.chainBuilding?.chainPosX / Math.abs(building?.chainBuilding?.chainPosX)) : 0 // e.g. (-3/3) || 0
			dirY = building?.chainBuilding?.chainPosY != 0 ? parseInt(building?.chainBuilding?.chainPosY / Math.abs(building?.chainBuilding?.chainPosY)) : 0
		}
		let x = building.coords.x + dirX
		let y = building.coords.y + dirY

		let nextBuilding = CityMap.getBuildingByCoords(x, y)
		let x1 = x + dirX
		let y1 = y + dirY
		while (nextBuilding == undefined) {
			nextBuilding = CityMap.getBuildingByCoords(x1, y1)
			x1 += dirX
			y1 += dirY
			if (x1 < 0 || y1 < 0 || x1 > 72 || y1 > 72) break // min and max of current map
		}

		if (x < 0 || x < 0 || y > 72 || y > 72) return connectedBuildings // min and max of current map
		else {
			if (nextBuilding == undefined || nextBuilding.chainBuilding == undefined || nextBuilding.chainBuilding?.name !== building.chainBuilding.name || nextBuilding.chainBuilding?.type == "start")
				return connectedBuildings

			return this.hasLinks(nextBuilding, connectedBuildings, dirX, dirY)
		}
	},

	// find out if a chain link building is connected to the chain start building (through other links)
	isLinked(building, x = 0, y = 0) {
		if (typeof building?.chainBuilding?.chainPosX === 'number') {
			let posX = building?.chainBuilding?.chainPosX
			let posY = building?.chainBuilding?.chainPosY
			let xNeg = posX > 0 ? -1 : 1
			let yNeg = posY > 0 ? -1 : 1
			let x1 = (posX != 0 ? posX / Math.abs(posX) : 0) - x*xNeg
			let y1 = (posY != 0 ? posY / Math.abs(posY) : 0) - y*yNeg

			let prevBuilding = CityMap.getBuildingByCoords(building?.coords?.x - x1, building?.coords?.y - y1)

			if (y1 < 0 || x1 < 0 || x1 > 72 || y1 > 72) return false // min and max of current map
			else {
				if (prevBuilding !== undefined) {
					if (prevBuilding.chainBuilding === undefined || prevBuilding.chainBuilding?.name !== building.chainBuilding.name) return false
					if (prevBuilding.chainBuilding?.name === building.chainBuilding.name && prevBuilding.chainBuilding?.type == ("linked" || "start")) {
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
				//if (building != undefined && building?.setBuilding?.name == linkName) {
				//	return console.log(building)
				//}
			}
		}
	},
	
	// returns false if building does not produce anything
	// production types: resources (coins, supplies, goods, medals etc), unit, genericReward (consumables like fragments), random, guildResources (power and goods)
	setAllProductions(metaData, data, era) {
		let productions = []
		if (metaData.__class__ != "GenericCityEntity" && metaData.type != "greatbuilding") {
			if (metaData.is_special) { // special building
				if (metaData.available_products !== undefined) { 
					// to do: to think about: should all goods production options be gathered here?
					if (Array.isArray(metaData.available_products))
						metaData.available_products.forEach(product => {
							if (product.name!="Daily Bonus") return
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
				if (metaData.__class__ == "CityEntityRandomProductProductionBuilding") { // if weird old building, use current production
					let currentProduction = this.setCurrentProductions(data, metaData, era)
					productions = currentProduction
				}
			}
			if (metaData.type == "main_building") { // add emissary production to town hall
				MainParser.EmissaryService?.forEach(emissary => {
					let resource = {
						type: (emissary.bonus.type != "unit" ? "resources" : emissary.bonus.type),
						needsMotivation: false,
						resources: (emissary.bonus.type == "unit" ? this.setUnitReward(emissary.bonus, true) : {[emissary.bonus.subType]: emissary.bonus.amount} )
					}
					productions.push(resource)
				})
				MainParser.BonusService?.forEach(bonus => { // guild FP
					if (bonus.type == "daily_strategypoint") {
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
				if (MainParser.CastleSystemLevels[(currentLevel-1)] != undefined)
					MainParser.CastleSystemLevels[(currentLevel-1)].dailyReward[era].rewards.forEach(reward => {
						let resources = {[reward.subType]: reward.amount} 
						if (reward.id.search("#") != -1) { // "goods#random#CurrentEra#30" "goods#random#PreviousEra#15"
							amount = reward.id.match(/\d+$/)[0]
							if (reward.id.search("goods") != -1 && reward.id.search("CurrentEra") != -1)
								resources = { random_good_of_age: amount }
							else if (reward.id.search("goods") != -1 && reward.id.search("PreviousEra") != -1)
								resources = { random_good_of_previous_age: amount }
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
					if (ability.__class__ == "ChainLinkAbility")
						for (const bonus of ability.bonuses) {
							if (bonus.revenue.length == 0) return
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
			let production = metaData.components[era]?.production || metaData.components.AllAge.production // currently it is either allage or era, never both
			if (production) {
				if (metaData.type == "production") { // production buildings do not have a default production
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
						needsMotivation: (product.onlyWhenMotivated == true),
						doubleWhenMotivated: false,
						resources: {}
					}
					if (product.type == "resources") {
						resource.resources = product.playerResources.resources
						if (product.onlyWhenMotivated !== true)
							resource.doubleWhenMotivated = true
					}
					else if (product.type == "guildResources") {
						resource.resources = product.guildResources.resources
					}
					else if (product.type == "genericReward" || product.type == "blueprint") {
						resource.resources = this.setGenericReward(product, metaData, era) 
						if (resource.resources.type === undefined)  // genericReward can also return a unit reward, change type
							resource.type = "unit"
					}
					else if (product.type == "unit") {
						resource.resources = this.setUnitReward(product)
					}
					else if (product.type == "random") {
						let rewards = [];
						if (product.products.length > 1) {
							product.products.forEach(reward => {
								if (reward.product.type === "genericReward") { // currently: everything but forge points
									let lookupData = metaData.components[era]?.lookup.rewards[reward.product.reward.id] || metaData.components.AllAge.lookup.rewards[reward.product.reward.id]
									let name = this.setRewardNameFromLookupData(lookupData, metaData)
									let newReward = {
										id: reward.product.reward.id,
										name: name,
										type: (lookupData.type == "set" ? "consumable" : lookupData.type),
										subType: lookupData.subType,
										amount: (lookupData.totalAmount || lookupData.amount),
										dropChance: reward.dropChance,
									}
									rewards.push(newReward)
								}
								else if (reward.product.type === "resources") {
									if (reward.product.playerResources.resources.strategy_points != undefined) { // FP
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
									else { // goods - for now - hacky
										let newReward = {
											id: null,
											type: "goods",
											name: i18n('Boxes.BlueGalaxy.Goods'),
											subType: Object.keys(reward.product.playerResources.resources)[0],
											amount: Object.values(reward.product.playerResources.resources)[0],
											dropChance: reward.dropChance,
										}
										rewards.push(newReward)
									}
								}
							});
							resource.resources = rewards
							resource.type = "random"
						}
					}
					else {
						console.log("CityMap.setAllProductions() is missing an option for ",metaData.name)
					}
					productions.push(resource)
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
		let productions = []
		let state = CityMap.setState(data)
		if (state != "idle") {
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
						if (data.type == "greatbuilding") {
							if (data.state.current_product.name == "clan_goods") {
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
				if (data.type == "main_building") {
					let prod = CityMap.setAllProductions(metaData, data, era)
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
						if (production.type == "resources")
							resource.resources = production.playerResources.resources
						else if (production.type == "guildResources")
							resource.resources = production.guildResources.resources
						else if (production.type == "unit") 
							resource.resources = this.setUnitReward(production)
						else if (production.type == "genericReward") {
							let reward = this.setGenericReward(production, metaData, era)
							resource.resources = reward
							if (reward.type == undefined) { // genericReward can also return a unit reward, change type
								resource.type = 'unit'
							}
						}
						else
							console.log(metaData.name, "CityMap.setCurrentProductions() production is missing")
						
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
		let amount = 0
		let lookupData = false

		if (product.reward.amount) {
			amount = product.reward.amount
		}
		if (product.reward.totalAmount) {
			amount = product.reward.totalAmount
		}

		if (metaData.components[era]) {
			if (product.reward.id.search("blueprint") != -1) {
				if (metaData.components[era].lookup.rewards[product.reward.id]) {
					lookupData = metaData.components[era].lookup.rewards[product.reward.id]
				}
				else { // blueprint chest, e.g. vineyard
					for (const [key, reward] of Object.entries(metaData.components[era].lookup.rewards)) {
						if (reward.id.search("blueprint") != -1)
							lookupData = reward
					}
					// amount = lookupData.possible_rewards[0].reward.amount // hacky, because every chest item could have a different amount of blueprints
					// console.log(metaData.name, amount)
				}
			}
			else if (product.reward.type == "good") { // this can break if there is more than one generic goods reward for a building
				for (const [key, reward] of Object.entries(metaData.components[era].lookup.rewards)) {
					if (reward.id.includes("good"))
						lookupData = reward
				}
			}
			else if (product.reward.id.includes('goods') && !/(fragment|rush)/.test(product.reward.id)) { // for nextage goods, because they are in a chest (random ones)
				// todo: this not only covers chests now, so implementation needs to be looked at more carefully
				lookupData = metaData.components[era].lookup.rewards[product.reward.id] // take first chest reward and work with that
				return {
					id: product.reward.id,
					name: lookupData.name.replace(/^\d+\s*/,""),
					type: "resources",
					subType: "good",
					amount: lookupData.totalAmount || parseInt(product.reward.id.match(/\d+$/)[0]),
					icon: lookupData.iconAssetName
				}
			}
			else {
				lookupData = metaData.components[era].lookup.rewards[product.reward.id]
				if (lookupData == undefined) {
					let chest = Object.keys(metaData.components[era].lookup.rewards).find(x => x.includes("chest")) // currently only applies to wish fountain
					for (possibleReward of metaData.components[era].lookup.rewards[chest].possible_rewards) {
						if (possibleReward.reward.id == product.reward.id)
							lookupData = possibleReward.reward
					}
				}
				else {
					amount = lookupData.totalAmount || lookupData.amount
				}
			}
		}
		if (amount == 0) {
			amount = Number(lookupData?.name.replace(/^([+-]*[0-9]+?) .*/,"$1"));
			if (isNaN(amount)) amount = lookupData.amount
		}

		let name = ""
		if (lookupData) 
			name = this.setRewardNameFromLookupData(lookupData, metaData)
		else {
			console.log("CityMap.setGenericReward() data missing for", metaData.name, metaData, product);
			name = "DEFINE NAME"
		}
		
		// units
		if (lookupData?.type == "chest" && lookupData.id.search("genb_random_") != -1 && lookupData.id.search("fragment") == -1 || lookupData?.type == "unit") {
			let units = this.setUnitReward(product)
			return units
		}
		// wish fountain (AllProductions)
		else if (lookupData?.type == "chest" && lookupData.id.search("fragment") != -1) {
			lookupData.type = "consumable"
		}
		// self aid kits have type set
		if (lookupData?.type == "set") {
			lookupData.type = "consumable"
			lookupData.subType = lookupData.rewards[0].subType
		}

		let reward = {
			id: product.reward.id,
			name: name,
			type: lookupData?.type || "consumable",
			subType: lookupData?.subType,
			amount: amount, // amount can be undefined for blueprints or units if building is not motivated
			icon: lookupData?.iconAssetName
		}

		return reward
	},

	// returns { unit_type: amount } 
	// unit_type can be: random, rogue, light_melee, heavy_melee, short_ranged, long_ranged, fast, next#light_melee -> next# for next era units
	setUnitReward(product, isEmissary = false) {
		let amount, type
		if (isEmissary) {
			amount = product.amount
			if (product.id.search("#") != -1) { // era_unit#light_melee#NextEra#1
				let prefix = ""
				if (product.id.search("NextEra") != -1) 
					prefix = "next#"
				
				type = prefix + product.id.split("#")[1]
			}
			else 
				type = "random"
		}
		else if (product.type == 'genericReward') {
			let amountFromString = product.reward.id.match(/\d+$/)
			amount = parseInt(amountFromString ? amountFromString[0] : 1) 	// if its only one unit, there is no number in the string
			type = product.reward.id.replace("unit_","").replace(/\d+/,"") 	// grabs e.g. "heavy_melee" from unit_heavy_melee3 or rogue from unit_rogue3 
			if (type.search("random") != -1) type = "random"
			if (product.reward.id.search("#") != -1) { // era_unit#light_melee#NextEra#1
				let prefix = ""
				if (product.reward.id.search("NextEra") != -1) 
					prefix = "next#"
				
				type = prefix + product.reward.id.split("#")[1]
			}
		}
		else if (product.type == 'unit') {
			amount = product.amount
			type = product.unitTypeId
		}
		return { [type]: amount }
	},

	setRewardNameFromLookupData(lookupData, metaData) {
		let name = ""
		if (lookupData.subType == "fragment") 
			name = lookupData.assembledReward.name
		else if (lookupData.__class__ == "GenericRewardSet") // this is a dirty workaround for trees of patience, because i lack patience
			name = lookupData.rewards[0].name 
		else if (lookupData.subType == "speedup_item" || lookupData.subType == "reward_item" || lookupData.subType == "boost_item" || lookupData.type == "forgepoint_package" || lookupData.type == "resource") 
			name = lookupData.name
		else if (lookupData.type == "unit") { // -> (next_)light_melee
			if (lookupData.id.search("#") != -1) { // era_unit#light_melee#NextEra#1
				let prefix = ""
				if (lookupData.id.search("NextEra") != -1) 
					prefix = "next_"
				
				name = prefix + lookupData.id.split("#")[1]
			}
			else 
				name = lookupData.id.replace("unit_","").replace(/\d+/,"")
		}
		else if (lookupData.type == "blueprint")  // id: "blueprint#random#3"
			name = lookupData.name.replace(/^\+?\d+\s*/,"")
		else if (lookupData.type == "chest" && lookupData.id.includes("blueprint")) { // remove +20 from the name becuase the amount is in the amount
			name = lookupData.name.replace(/^\+?\d+\s*/,"")
		}
		else if (lookupData.type == "chest") { // chest can be: BP - see above, units, goods (next age)
			name = lookupData.name
		}
		else if (lookupData.type == "consumable")
			name = lookupData.name
		else if (lookupData.type == "good"){
			name = lookupData.name.replace(/^\+?\d+\s]*/,"")
		} else {
			console.log("CityMap.setRewardNameFromLookupData(): undefined name from type", metaData.name, lookupData, lookupData.type, lookupData.subType)
		}
		return name
	},

	setOldProductionResourceFromAbility(ability, era) {
		let resource = {
			type: 'resources',
			needsMotivation: (ability.__class__ == "AddResourcesAbility" || ability.__class__ == "AddResourcesWhenMotivatedAbility"),
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
				if (reward.reward.type == "chest") {
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
		return Object.values(MainParser.NewCityMapData).find(x => x.id === id)
	},

	getBuildingByCoords(x,y) {
		return Object.values(MainParser.NewCityMapData).find(b => b.coords.x === x && b.coords.y === y)
	},

	getBuildingGoodsByEra(current, building) {
		let productions = (current ? building.state.production : building.production)
		let goods = {
			hasRandomProduction: false,
			eras: {}
		}
		if (productions) {
			productions.forEach(production => {
				if (production.type == 'resources' || production.type == 'special_goods') {
					Object.keys(production.resources).forEach(name => {
						let good = GoodsList.find(x => x.id == name)
						let specialGood = FHResourcesList.find(x => x.id == name && x.abilities.specialResource?.type == "specialResource")
						let goodEra = Technologies.InnoEras[building.eraName]
						let isGood = false
						if (good != undefined) {
							goodEra = Technologies.InnoEras[good.era]
							name = good.id
							isGood = true
						}
						else if (specialGood != undefined) {
							goodEra = Technologies.InnoEras[specialGood.era]
							name = specialGood.id
							isGood = true
						}
						else if (name.includes('previous')) {
							goodEra = Technologies.getPreviousEraIdByCurrentEraName(building.eraName)
							isGood = true
						}
						else if (name.includes('next')) {
							goodEra = Technologies.getNextEraIdByCurrentEraName(building.eraName)
							isGood = true
						}
						else if (name.includes('current') || name == 'random_good_of_age' || name == 'all_goods_of_age') {
							isGood = true
						}
						else if (name.includes('current') || name == 'random_good_of_age' || name == 'all_goods_of_age') {
							isGood = true
						}

						if (isGood) {
							if (goods.eras[goodEra] == undefined) 
								goods.eras[goodEra] = parseInt(production.resources[name])
							else
								goods.eras[goodEra] += parseInt(production.resources[name])
						}
					})
				}
				if (production.type == 'random') { // e.g. gentania windmill, eerie terror coaster
					let goodEra = Technologies.InnoEras[building.eraName]
					for (const resource of production.resources) {
						if (resource.type?.includes("good") && !resource.type?.includes("guild")) {
							goods.hasRandomProduction = true // this is not a perfect solution, because it is general & not per good

							if (resource.type.includes('previous') || resource.subType?.toLowerCase().includes('previous') || resource.id?.toLowerCase().includes('previous'))
								goodEra = Technologies.getPreviousEraIdByCurrentEraName(building.eraName)
							else if (resource.type.includes('next') || resource.subType?.toLowerCase().includes('next') || resource.id?.toLowerCase().includes('next'))
								goodEra = Technologies.getNextEraIdByCurrentEraName(building.eraName)

							if (goods.eras[goodEra] == undefined)
								goods.eras[goodEra] = parseFloat(resource.amount * resource.dropChance)
							else
								goods.eras[goodEra] += parseFloat(resource.amount * resource.dropChance)
						}
					}
				}
				if (production.type === 'genericReward' && /good/.test(production.resources?.icon)) { // e.g. eco hub
					let goodEra = Technologies.InnoEras[building.eraName]
					if (production.resources.id.includes('previous'))
						goodEra = Technologies.getPreviousEraIdByCurrentEraName(building.eraName)
					else if (production.resources.icon == "next_age_goods" || production.resources.id.includes('next'))
						goodEra = Technologies.getNextEraIdByCurrentEraName(building.eraName)

					if (goods.eras[goodEra] == undefined)
						goods.eras[goodEra] = parseInt(production.resources.amount)
					else 
						goods.eras[goodEra] += parseInt(production.resources.amount)
				}
			})
		}
		if (Object.keys(goods).length > 0) {
			return goods
		}
	},

	setType(metaData) {
		return metaData.type
	},

	createNewCityMapEntities(data) {
		if (data === undefined && !CityMap.IsExtern) {
			data = Object.values(MainParser.CityMapData)
		}
		else if (CityMap.IsExtern) {
			data = Object.values(MainParser.OtherPlayerCityMapData)
		}

		for (building of data) {
			if (CityMap.IsExtern === true && building.eraName !== undefined) continue
			let metaData = Object.values(MainParser.CityEntities).find(x => x.id == building.cityentity_id)
			let era = Technologies.getEraName(building.cityentity_id, building.level)
			let newCityEntity = CityMap.createNewCityMapEntity(metaData, era, building)

			if (CityMap.IsExtern === true) 
				MainParser.OtherPlayerCityMapData[building.id] = newCityEntity
			else
				MainParser.NewCityMapData[building.id] = newCityEntity
		}

		return (CityMap.IsExtern === true ? MainParser.OtherPlayerCityMapData : MainParser.NewCityMapData) 
	},

	// todo: fix it, use it
	setEra(data) {
		let era = (data.type != "greatbuilding" ? data.level : 1)
		return (data.cityentity_id.includes("CastleSystem") ? CurrentEra : Technologies.InnoEraNames[era])
	},
	
	createNewCityMapEntity(metaData, era=CurrentEra, data={}) {
		if (typeof(metaData)=="string") {
			metaData=MainParser.CityEntities[metaData];
		};
		let entity = {
			player_id: data.player_id||0,
			id: data.id||0,

			entityId: data.cityentity_id||metaData.id,
			name: metaData.name,
			type: this.setType(metaData),
			eraName: ((data.cityentity_id||metaData.id).includes("CastleSystem") ? CurrentEra : era),
			isSpecial: this.isSpecialBuilding(metaData),
			isLimited: this.isLimitedBuilding(metaData),
			chainBuilding: this.setChainBuilding(metaData),
			setBuilding: this.setSetBuilding(metaData),
			size: this.setSize(metaData),

			population: this.setPopulation(metaData, data, era), 
			happiness: this.setHappiness(metaData, data, era),
			needsStreet: this.needsStreet(metaData),
			
			boosts: this.setBuildingBoosts(metaData, data, era),
			production: this.setAllProductions(metaData, data, era),

			coords: { x: data.x || 0, y: data.y || 0 },
			
			state: {
				name: this.setState(data),
				times: this.setStateTimes(data),
				isPolivated: this.setPolivation(data, metaData),
				connected: this.setConnection(metaData, data), // fyi: decorations are always connected
				production: this.setCurrentProductions(data, metaData, era),
				isExpired: this.isExpiredBuilding(data),
				buildTime: this.setBuildTime(data),
				level: (data.type == "greatbuilding" ? data.level : null), // level also includes eraId in raw data, we do not like that
				max_level: (data.type == "greatbuilding" ? data.max_level : null)
			}
		}
		
		//if (entity.entityId != "street")
		//	console.log('entity ', entity.name, entity, metaData, data)
		return entity
	},
};
