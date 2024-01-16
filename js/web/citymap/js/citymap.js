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
 *
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


	/**
	 * @param event
	 * @param event
	 * @param Data The City data
	 * @param Title Name of the city
	 */
	init: (event, Data = null, Title = i18n('Boxes.CityMap.YourCity') + '...')=> {

		if (Data === null) { // No data => own city
			CityMap.IsExtern = false
			Data = MainParser.CityMapData
			CityMap.OwnCityData = MainParser.NewCityMapData
		}
		// Neighbor or other modul
		else {
			CityMap.IsExtern = true;
		}

		CityMap.CityData = Object.values(Data).sort(function (X1, X2) {
			if (X1.x < X2.x) return -1;
			if (X1.x > X2.x) return 1;
		});

		let scale = localStorage.getItem('CityMapScale'),
			view = localStorage.getItem('CityMapView');

		// a scaling has already been set?
		if(null !== scale){
			CityMap.ScaleUnit = parseInt(scale);
		}

		// a view has already been set?
		if(null !== view){
			CityMap.CityView = view;
		}


		if( $('#city-map-overlay').length < 1 )
		{
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
		else if (!event)
		{
			HTML.CloseOpenBox('city-map-overlay');
			return;
		}

		setTimeout(()=>{

			// separate city
			if(Data === false)
			{
				setTimeout(()=>{
					CityMap.SetBuildings();

				}, 100);

			} else {
				CityMap.SetBuildings(Data);
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
			w = $('<div />').attr({'id':'citymap-wrapper'});

		w.append( $('<div />').attr('id', 'map-container').append( $('<div />').attr('id', 'grid-outer').attr('data-unit', CityMap.ScaleUnit).attr('data-view', CityMap.CityView).append( $('<div />').attr('id', 'map-grid') ) ) ).append( $('<div />').attr({'id': 'sidebar'}) );

		$('#city-map-overlayHeader > .title').attr('id', 'map' + CityMap.hashCode(Title));

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


		/* Scalierung wechseln */
		let scaleView = $('<select />').attr('id', 'scale-view').addClass('game-cursor')
			.append( $('<option />').prop('selected', CityMap.ScaleUnit === 60).attr('data-scale', 60).text('60%').addClass('game-cursor') )
			.append( $('<option />').prop('selected', CityMap.ScaleUnit === 80).attr('data-scale', 80).text('80%').addClass('game-cursor') )
			.append( $('<option />').prop('selected', CityMap.ScaleUnit === 100).attr('data-scale', 100).text('100%').addClass('game-cursor') )
			.append( $('<option />').prop('selected', CityMap.ScaleUnit === 120).attr('data-scale', 120).text('120%').addClass('game-cursor') )
			.append( $('<option />').prop('selected', CityMap.ScaleUnit === 140).attr('data-scale', 140).text('140%').addClass('game-cursor') )
			.append( $('<option />').prop('selected', CityMap.ScaleUnit === 160).attr('data-scale', 160).text('160%').addClass('game-cursor') )
			.append( $('<option />').prop('selected', CityMap.ScaleUnit === 180).attr('data-scale', 180).text('180%').addClass('game-cursor') )
		;

		menu.append(scaleView);

		$('#city-map-overlay').on('change', '#scale-view', function(){
			let unit = parseInt($('#scale-view option:selected').data('scale'));

			CityMap.ScaleUnit = unit;

			$('#grid-outer').attr('data-unit', unit);
			localStorage.setItem('CityMapScale', unit);

			CityMap.SetBuildings(CityMap.CityData, false);

			$('#map-container').scrollTo( $('.highlighted') , 800, {offset: {left: -280, top: -280}, easing: 'swing'});
			$('.to-old-legends').hide();
			$('.building-count-area').show();
		});

		// Button for submit Box
		if (CityMap.IsExtern === false) {
			menu.append($('<input type="text" id="BuildingsFilter" placeholder="'+ i18n('Boxes.CityMap.FilterBuildings') +'" oninput="CityMap.filterBuildings(this.value)">'));
			menu.append($('<button />').addClass('btn-default ml-auto').attr({ id: 'highlight-old-buildings', onclick: 'CityMap.highlightOldBuildings()' }).text(i18n('Boxes.CityMap.HighlightOldBuildings')));
			menu.append($('<button />').addClass('btn-default ml-auto').attr({ id: 'copy-meta-infos', onclick: 'CityMap.copyMetaInfos()' }).text(i18n('Boxes.CityMap.CopyMetaInfos')));
			menu.append($('<button />').addClass('btn-default ml-auto').attr({ id: 'show-submit-box', onclick: 'CityMap.showSubmitBox()' }).text(i18n('Boxes.CityMap.ShowSubmitBox')));
		}


		/* In das Menü "schieben" */
		w.prepend(menu);
		oB.append(w);
	},


	/**
	 * Erzeugt ein Raster für den Hintergrund
	 *
	 */
	BuildGrid:()=> {

		let ua = CityMap.UnlockedAreas;

		for(let i in ua)
		{
			if(!ua.hasOwnProperty(i)){
				break;
			}

			let w = ((ua[i]['width'] * CityMap.ScaleUnit) / 100 ),
				h = ((ua[i]['length'] * CityMap.ScaleUnit) / 100 ),
				x = ((ua[i]['x'] * CityMap.ScaleUnit) / 100 ),
				y = ((ua[i]['y'] * CityMap.ScaleUnit) / 100 ),

				G = $('#map-grid'),

				a = $('<span />')
					.addClass('map-bg')
					.css({
						width: w + 'em',
						height: h + 'em',
						left: x + 'em',
						top: y + 'em',
					});

			// Ist es das Startfeld?
			if(ua[i]['width'] === 16 && ua[i]['length'] === 16){
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
	SetBuildings: (Data = null)=> {

		// https://foede.innogamescdn.com/assets/city/buildings/R_SS_MultiAge_SportBonus18i.png

		let ActiveId = $('#grid-outer').find('.highlighted').data('entityid') || null;

		// einmal komplett leer machen, wenn gewünscht
		$('#grid-outer').find('.map-bg').remove();
		$('#grid-outer').find('.entity').remove();

		CityMap.OccupiedArea = 0;
		CityMap.OccupiedArea2 = [];
		let StreetsNeeded = 0;

		if(CityMap.IsExtern === false) {
			// Unlocked Areas rendern
			CityMap.BuildGrid();
		}

		let MinX = 0,
			MinY = 0,
			MaxX = 71,
			MaxY = 71;

		for (let b in CityMap.CityData)
		{
			if (!CityMap.CityData.hasOwnProperty(b) || CityMap.CityData[b]['x'] < MinX || CityMap.CityData[b]['x'] > MaxX || CityMap.CityData[b]['y'] < MinY || CityMap.CityData[b]['y'] > MaxY) continue;

			let CityMapEntity = CityMap.CityData[b],
				d = MainParser.CityEntities[CityMapEntity['cityentity_id']],
				BuildingSize = CityMap.GetBuildingSize(CityMapEntity),

				x = (CityMap.CityData[b]['x'] === undefined ? 0 : ((parseInt(CityMap.CityData[b]['x']) * CityMap.ScaleUnit) / 100)),
				y = (CityMap.CityData[b]['y'] === undefined ? 0 : ((parseInt(CityMap.CityData[b]['y']) * CityMap.ScaleUnit) / 100)),
				xsize = ((parseInt(BuildingSize['xsize']) * CityMap.ScaleUnit) / 100),
				ysize = ((parseInt(BuildingSize['ysize']) * CityMap.ScaleUnit) / 100),
				noStreet = '', isSpecial = '', chainBuilding = ''

				if(CityMap.IsExtern === false) {
					noStreet = (MainParser.NewCityMapData[CityMap.CityData[b]['id']].needsStreet == 0 ? ' noStreet' : '')
					isSpecial = (MainParser.NewCityMapData[CityMap.CityData[b]['id']].isSpecial ? ' special' : '')
					chainBuilding = (MainParser.NewCityMapData[CityMap.CityData[b]['id']].chainBuilding != undefined ? ' chain' : '')
				}
				
				f = $('<span />').addClass('entity ' + d['type'] + noStreet + isSpecial + chainBuilding).css({
					width: xsize + 'em',
					height: ysize + 'em',
					left: x + 'em',
					top: y + 'em'
				})
					.attr('title', d['name'])
					.attr('data-entityid', CityMap.CityData[b]['id']);

			CityMap.OccupiedArea += (BuildingSize['building_area']);

			if (!CityMap.OccupiedArea2[d.type]) CityMap.OccupiedArea2[d.type] = 0;
			CityMap.OccupiedArea2[d.type] += (BuildingSize['building_area']);

			StreetsNeeded += BuildingSize['street_area'];

			let era = CityMap.GetBuildingEra(CityMapEntity);

			if(era){
				f.attr({
					title: `${d['name']}<br><em>${i18n('Eras.' + era )}</em>`
				})

				if (era < CurrentEraID) {
                    f.addClass('oldBuildings');

					let eraDiff = CurrentEraID - era;
					
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
			if (ActiveId !== null && ActiveId === CityMap.CityData[b]['id'])
			{
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
		let total = ((CityMap.UnlockedAreas.length -1) * 16) + 256, // x + (4*4) und 1x die Startflache 16 * 16
			occupied = CityMap.OccupiedArea,
			txtTotal = i18n('Boxes.CityMap.WholeArea') + total,
			txtFree = i18n('Boxes.CityMap.FreeArea') + (total - occupied);

		if( $('#area-state').length === 0 ){
			let aW = $('<div />').attr('id', 'area-state');

			aW.append( $('<p />').addClass('total-area') );
			aW.append( $('<p />').addClass('occupied-area') );
			aW.append( $('<div />').addClass('building-count-area') );
			aW.append( $('<p />').addClass('to-old-legends').hide() );

			$('#sidebar').append(aW);
		}

		// Non player city => Unlocked areas cant be detected => dont show free space
		if (!CityMap.IsExtern) {
			$('.total-area').html(txtTotal);
			$('.occupied-area').html(txtFree);
		}

		let sortable = [];
		for(let x in CityMap.OccupiedArea2) sortable.push([x, CityMap.OccupiedArea2[x]]);
		sortable.sort((a, b) => a[1] - b[1]);
		sortable.reverse();

		let txtCount = [];

		for(let x in sortable )
		{
			if(!sortable.hasOwnProperty(x)){
				break;
			}

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
		$('.building-count-area, .to-old-legends').fadeToggle();
	},


	/**
	 * Send citydata to the server
	 *
	 */
	SubmitData: ()=> {

		let currentDate = new Date(),
			d = {
				time: currentDate.toISOString().split('T')[0] + ' ' + currentDate.getHours() + ':' + currentDate.getMinutes() + ':' + currentDate.getSeconds(),
				player: {
					name: ExtPlayerName,
					id: ExtPlayerID,
					world: ExtWorld,
					avatar: ExtPlayerAvatar
				},
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

			if(resp.status === 'OK')
			{
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
					text: [
						i18n('Boxes.CityMap.SubmitError'),
						'<a href="https://github.com/mainIine/foe-helfer-extension/issues" target="_blank">Github</a>'
					],
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

			if (CityEntity['type'] !== 'street') {
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
	getPopulation: (ceData, data, era) => {
		let population = 0;
		let eraId = Technologies.InnoEras[era];

		if (data.type != "generic_building") { // not a generic building
			if (ceData.entity_levels.length > 0) {  // special building
				if (ceData.entity_levels[eraId].required_population)
					return ceData.entity_levels[eraId].required_population * -1; 	// needs population, e.g. military
				else if (ceData.entity_levels[eraId].provided_population)
					return ceData.entity_levels[eraId].provided_population; 		// provides population, e.g. residential
			}
			else if (ceData.requirements) {
				if (ceData.requirements.cost)
					return ceData.requirements.cost.resources.population * -1;
			}
		}
		else { // generic building
			if (ceData.components[era]) { // (time) limited buildings lose their era data after expiring
				let staticResources = ceData.components[era].staticResources;
				if (staticResources) {
					population = staticResources.resources.resources.population;
					return population;
				}
			}
		}
		return population;
	},
	
	// returns 0 if building does not provide or substract happiness
	getHappiness(ceData, data, era) {
		let happiness = 0;
		let eraId = Technologies.InnoEras[era];

		let bgHappiness = data.bonus;
		if (data.type != "generic_building") {
			if (ceData.entity_levels.length > 0) { // special building
				if (ceData.entity_levels[eraId].provided_happiness)
					return ceData.entity_levels[eraId].provided_happiness;
				return happiness;
			}
			else if (bgHappiness)  // great building, e.g. Alcatraz
				return bgHappiness.value;
			else if (ceData.provided_happiness)  // decorations etc.
				return ceData.provided_happiness;
			else 
				return happiness;
		}
		else { //generic building
			if (ceData.components[era]) {
				let bHappiness = ceData.components[era].happiness;
				if (bHappiness)
					return (bHappiness.provided ? bHappiness.provided : happiness);
				return happiness;
			}
		}
	},
	
	// returns undefined if building cannot be motivated or polished
	getPolivation(data, ceData) { 
		let isPolivationable = false;
		let isPolishable = false;
		ceData.abilities.forEach(ability => {
			if (ability.__class__ == "MotivatableAbility")
				isPolivationable = true
			else if (ability.__class__ == "PolishableAbility") {
				isPolivationable = true
				isPolishable = true
			}
		});
		if (data.type == "generic_building")
			isPolivationable = (ceData.components.AllAge.socialInteraction != undefined);
		
		if (isPolivationable) {
			if (data.type != "generic_building") {
					if (data.state.boosted)
						return data.state.boosted;
					else if (data.state.is_motivated) 
						return true;
					else if (isPolishable) { // decorations etc.
						if (data.state.next_state_transition_in) 
							return true;
					}
					return false;
			}
			else { // generic buildings
				if (data.state.socialInteractionStartedAt > 0) 
					return true;
				else
					return false;
			}
		}
		return undefined;
	},
	
	// returns chainId (string), returns undefined if not a chain building
	getChainBuilding(ceData) {
		let chainId = undefined;
		ceData.abilities.forEach(ability => {
			if (ability.chainId)
				chainId = ability.chainId;
		});
		return chainId;
	},

	// returns setId (string), returns undefined if not a chain building
	getSetBuilding(ceData) {
		let setId = undefined;
		ceData.abilities.forEach(ability => {
			if (ability.setId)
				setId = ability.setId;
		});
		return setId;
	},

	// returns an object with the buildings size
	getSize(ceData) {
		let size = { width: 0, length: 0 }
		if (ceData.length)
			size = { width: ceData.width, length: ceData.length }
		else {
			size.width = ceData.components.AllAge.placement.size.x
			size.length = ceData.components.AllAge.placement.size.y
		}
		return size
	},
	
	// returns an array with all boosts, array is empty when there are none
	getBuildingBoosts(ceData, data, era) {
		let eraName = (era == 'AllAge' ? 'BronzeAge' : era); // for some reason Watchtower Level 2 (example) has an era list even though the boost is the same everywhere. thx inno
		let boosts = [];
		if (data.type != "generic_building") {
			ceData.abilities.forEach(ability => {
				if (ability.boostHints) {
					ability.boostHints.forEach(abilityBoost => {
						if (abilityBoost.boostHintEraMap[eraName] != undefined) { // has different boosts for different eras
							// example data: targetedFeature: "all", type: "att_boost_attacker", value: 11
							let boost = {
								feature: abilityBoost.boostHintEraMap[eraName].targetedFeature,
								type: abilityBoost.boostHintEraMap[eraName].type,
								value: abilityBoost.boostHintEraMap[eraName].value
							};
							boosts.push(boost);
						}
						else { // if only AllAge boost
							let boost = {
								feature: abilityBoost.boostHintEraMap.AllAge.targetedFeature,
								type: abilityBoost.boostHintEraMap.AllAge.type,
								value: abilityBoost.boostHintEraMap.AllAge.value
							};
							boosts.push(boost);
						}
					});
				}
			});
		}
		else {
			if (ceData.components[era]) 
				if (ceData.components[era].boosts) {
					ceData.components[era].boosts.boosts.forEach(abilityBoost => {
						let boost = {
							feature: abilityBoost.targetedFeature,
							type: abilityBoost.type,
							value: abilityBoost.value,
						};
						boosts.push(boost);
					});
				}
		}
		return boosts;
	},

	

	getState(data) { 
		if (data.state.__class__ == "IdleState")
			return "idle";
		else if (data.state.__class__ == "ProductionFinishedState")
			return "collectable";
		else if (data.state.__class__ == "PlunderedState")
			return "pludered";
		return "producing";
	},

	// building is not in construction menu
	isSpecialBuilding(ceData) { 
		if (ceData.__class__ == "GenericCityEntity")
			return true; // generic buildings are always special
		return ceData.is_special;
	},

	// returns street level (1 or 2) or 0
	needsStreet(ceData, data) {
		let needsStreet = 0;
		if (data.type != "generic_building") {
			if (data.type != "tower" && data.type != "decoration") 
				needsStreet = ceData.requirements.street_connection_level
		}
		else {
			ceData.abilities.forEach(ability => {
				if (ability.__class__ == "StreetConnectionRequirementComponent")
					needsStreet = 1
			});
			if (ceData.components.AllAge.streetConnectionRequirement)
				needsStreet = ceData.components.AllAge.streetConnectionRequirement.requiredLevel
		}
		return needsStreet
	},
	
	getStateTimes(data) {
		let state = this.getState(data);
		if (state == "producing")
			return { at: data.state.next_state_transition_at, in: data.state.next_state_transition_in }
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

	// returns false or time or total collections, todo: needs more data returned
	isLimitedBuilding(data, ceData) {
		if (data.type == "generic_building")
			if (ceData.components.AllAge.limited != undefined) {
				if (ceData.components.AllAge.limited.config.expireTime != undefined)
					return ceData.components.AllAge.limited.config.expireTime;
				if (ceData.components.AllAge.limited.config.collectionAmount != undefined)
					return ceData.components.AllAge.limited.config.collectionAmount;
			}
		return false;
	},

	// returns undefined or time the building was built
	getBuildTime(data) {
		if (data.type == "generic_building")
			if (data.state.constructionFinishedAt != undefined) 
				return data.state.constructionFinishedAt;
		return undefined;
	},

	// returns true or false
	getConnection(ceData, data) {
		return (this.needsStreet(ceData, data) == 0);
	},

	// returns undefined if building is idle, returns an empty array if there are no productions (yet)
	getCurrentProductions(data, ceData, era) {
		let productions = {
			time: 0, 
			resources: []
		};
		if (data.state.__class__ != "IdleState") {
			if (data.type != "generic_building") {
				if (data.state.current_product) {
					productions.time = data.state.current_product.production_time;

					if (data.state.current_product.guildProduct) {
						let production = {
							resources: data.state.current_product.guildProduct,
							type: "guildResources",
						}
						productions.resources.push(production);
					}
					if (data.state.current_product.product) {
						if (data.state.current_product.product.resources) {
							let production = {
								resources: data.state.current_product.product.resources,
								type: "resources",
							}
							productions.resources.push(production);
						}
					}
					if (data.state.current_product.goods) { // great buildings
						if (data.type == "greatbuilding") {
							if (data.state.current_product.name == "clan_goods") {
								let resources = {}
								data.state.current_product.goods.forEach(good => {
									resources[good.good_id] = good.value;
								});
								let production = {
									resources: resources,
									type: "guildResources",
								}
								productions.resources.push(production);
							}
						}
					}
					// todo: e.g. panda shrine units missing, because they are here: ceData.abilities["RandomUnitOfAgeWhenMotivatedAbility"]
				}
			}
			else { // generic building
				if (data.state.productionOption) {
					// productions.time todo
					data.state.productionOption.products.forEach(componentProduction => {
						let resource = {
							type: componentProduction.type,
							resources: {}
						}
						if (componentProduction.type == "resources")
							resource.resources = componentProduction.playerResources.resources;
						else if (componentProduction.type == "guildResources")
							resource.resources = componentProduction.guildResources.resources;
						else if (componentProduction.type == "genericReward") 
							resource.resources = this.getGenericReward(componentProduction, ceData, data, era);
						else 
							console.log(ceData.name, "production is missing")
						
						productions.resources.push(resource);
					});
				}
			}
			return productions;
		}
		return undefined;
	},
	
	getGenericReward(product, ceData, data, era) {
		let amount = 0

		if (product.reward.amount != undefined) {
			amount = product.reward.amount;
		}

		let lookupData = false;
		if (ceData.components[era]) {
			if (product.reward.id.search("blueprint") != -1) {
				if (ceData.components[era].lookup.rewards[product.reward.id])
					lookupData = ceData.components[era].lookup.rewards[product.reward.id]
				else {
					for (const [key, reward] of Object.entries(ceData.components[era].lookup.rewards)) {
						if (reward.id.search("blueprint") != -1)
							lookupData = reward;
					}
				}
			}
			else if (product.reward.id.search("unit") != -1) {
				if (ceData.components[era].lookup.rewards[product.reward.id])
					lookupData = ceData.components[era].lookup.rewards[product.reward.id]
				else {
					for (const [key, reward] of Object.entries(ceData.components[era].lookup.rewards)) {
						if (reward.id.search("unit") != -1)
							lookupData = reward;
					}
				}
			}
			else
				lookupData = ceData.components[era].lookup.rewards[product.reward.id];
		}
		if (amount == 0) {
			amount = lookupData.amount;
		}

		let name = ""
		if (lookupData) {
			name = this.getRewardNameFromLookupData(lookupData, ceData)
		}
		else {
			console.log("BUILDING DATA MISSING", ceData.name, ceData, data);
			name = "DEFINE NAME"
		}
		
		// random units
		if (lookupData.type == "chest" && lookupData.id.search("genb_random_unit_chest") != -1) {
			lookupData.subType = "unit"
			amount = parseInt(lookupData.id.replace("genb_random_unit_chest",""))
		}
		// trees of patience
		if (lookupData.type == "set") {
			lookupData.type = "consumable"
			lookupData.subType = lookupData.rewards[0].subType
			amount = lookupData.totalAmount
		}

		let reward = {
			id: product.reward.id,
			name: name,
			type: lookupData.type,
			subType: lookupData.subType,
			amount: amount, // amount can be undefined for blueprints or units if buiilding is not motivated
			icon: lookupData.iconAssetName
		}
		return reward;
	},

	getRewardNameFromLookupData(lookupData, ceData) {
		let name = ""
		if (lookupData.subType == "fragment") 
			name = lookupData.assembledReward.name
		else if (lookupData.__class__ == "GenericRewardSet") { // this is a dirty workaround for trees of patience, because i lack patience
			name = lookupData.rewards[0].name 
		}
		else if (lookupData.subType == "speedup_item" || lookupData.subType == "reward_item" || lookupData.type == "chest" || lookupData.subType == "boost_item" || lookupData.type == "forgepoint_package" || lookupData.type == "resource" || lookupData.type == "blueprint") 
			name = lookupData.name
		else if (lookupData.type == "unit")
			name = lookupData.unit.unitTypeId
		else {
			console.log("undefined name from type", ceData.name, lookupData, lookupData.type, lookupData.subType)
		}
		return name
	},

	getOldProductionResourceFromAbility(ability, era) {
		let resource = {
			type: 'resources',
			needsMotivation: (ability.__class__ == "AddResourcesAbility" || ability.__class__ == "AddResourcesWhenMotivatedAbility"),
			resources: {}
		}
		if (ability.__class__ === "AddResourcesToGuildTreasuryAbility")
			resource.type = 'guildResources'

		if (ability.__class__ === "RandomUnitOfAgeWhenMotivatedAbility")
			resource.resources = { random_units_of_age: ability.amount }

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

	// returns false if building is idle or does not produce anything
	getAllProductions(ceData, data, era) {
		if (data.type != "generic_building" && data.type != "greatbuilding") {
			let productions = {
				time: 0, // todo
				resources: []
			};
			if (ceData.is_special) { // special building
				if (ceData.available_products !== undefined) { // TO DO production buildings
					if (Array.isArray(ceData.available_products))
						ceData.available_products.forEach(product => {
							let resource = {
								type: "unknown", 
								needsMotivation: false,
								resources: {}
							}
						});
				}
				if (ceData.entity_levels[Technologies.InnoEras[era]] !== undefined) { // base money is here
					let money = ceData.entity_levels[Technologies.InnoEras[era]].produced_money
					if (money)
						productions.resources.push({type: 'resources', needsMotivation: false, money: money, doubleWhenMotivated: true})
				}
				ceData.abilities.forEach(ability => {
					let resource = this.getOldProductionResourceFromAbility(ability, era)
					
					if (Object.keys(resource.resources).length > 0) 
						productions.resources.push(resource)
				});
			}
			// to do: to think about: should all goods production options be gathered here?
			if (Object.keys(productions.resources).length > 0)
				return productions
			else
				return false
		}
		else if (data.type === "generic_building") {
			if (ceData.components[era]) 
				if (ceData.components[era].production) {
					productions = {
						time: ceData.components[era].production.options[0].time, // TODO
						resources: []
					};
					ceData.components[era].production.options[0].products.forEach(product => {
						let resource = {
							type: product.type,
							needsMotivation: (product.onlyWhenMotivated == true),
							resources: {}
						};
						if (product.type == "resources") {
							resource.resources = product.playerResources.resources;
						}
						else if (product.type == "guildResources") {
							resource.resources = product.guildResources.resources;
						}
						else if (product.type == "random") {
							let rewards = [];
							if (product.products.length > 1) {
								product.products.forEach(reward => {
									let lookupData = ceData.components[era].lookup.rewards[reward.product.reward.id]
									let name = this.getRewardNameFromLookupData(lookupData, ceData)
									// 
									/*if (lookupData.type == "unit")
										name = lookupData.unit.unitTypeId
									else if (lookupData.subType == "fragment")
										name = lookupData.assembledReward.name
									else if (lookupData.type == "resource")
										name = lookupData.iconAssetName
									else if (lookupData.type == "blueprint")
										name = lookupData.iconAssetName*/
									let newReward = {
										id: reward.product.reward.id,
										name: name,
										type: lookupData.type,
										subType: lookupData.subType,
										amount: lookupData.amount,
										dropChance: reward.dropChance,
									}
									rewards.push(newReward);
								});
								resource.resources = rewards;
							}
						}
						else if (product.type == "genericReward") {
							resource.resources = this.getGenericReward(product, ceData, data, era);
						}
						else {
							console.log("getAllProductions() is missing an option")
						}
						productions.resources.push(resource);
					});
				}
			return productions;
		}
		// to do: GB handling
	},
	
	createNewCityMapEntity(ceData, data, era) {
		let entity = {
			player_id: data.player_id,
			id: data.id,

			entityId: data.cityentity_id,
			name: ceData.name,
			type: data.type,
			isSpecial: this.isSpecialBuilding(ceData),
			isExpired: this.isExpiredBuilding(data),
			isLimited: this.isLimitedBuilding(data, ceData),
			buildTime: this.getBuildTime(data),
			times: this.getStateTimes(data),
			
			coords: { x: data.x, y: data.y },
			size: this.getSize(ceData),

			population: this.getPopulation(ceData, data, era), 
			happiness: this.getHappiness(ceData, data, era),
			needsStreet: this.needsStreet(ceData, data),
			
			state: {
				name: this.getState(data),
				isPolivated: this.getPolivation(data, ceData),
				connected: this.getConnection(ceData, data), // fyi: decorations are always connected
				production: this.getCurrentProductions(data, ceData, era),
			},
			eraName: era,
			
			chainBuilding: this.getChainBuilding(ceData),
			setBuilding: this.getSetBuilding(ceData),

			boosts: this.getBuildingBoosts(ceData, data, era),
			production: this.getAllProductions(ceData, data, era),

			// todo GBs probably need more stuff
			level: (data.type == "greatbuilding" ? data.level : undefined), // level also includes eraId in raw data, we do not like that
			max_level: (data.type == "greatbuilding" ? data.max_level : undefined)
		}
		console.log('entity',entity.name, entity, ceData, data)
		return entity
	},
};
