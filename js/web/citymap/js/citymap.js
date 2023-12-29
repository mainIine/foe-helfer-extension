/*
 * **************************************************************************************
 * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
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
 * @type {{highlightOldBuildings: CityMap.highlightOldBuildings, EfficiencyFactor: number, init: CityMap.init, UnlockedAreas: null, BlockedAreas: null, SubmitData: CityMap.SubmitData, SetBuildings: CityMap.SetBuildings, CityData: null, ScaleUnit: number, CityView: string, CityEntities: null, hashCode: (function(*): *), OccupiedArea: number, IsExtern: boolean, showSubmitBox: CityMap.showSubmitBox, getAreas: CityMap.getAreas, PrepareBox: CityMap.PrepareBox, GetBuildingSize: (function(*): {}), BuildGrid: CityMap.BuildGrid, copyMetaInfos: CityMap.copyMetaInfos}, GetBuildingEra: (function(*): {})}
 */
let CityMap = {
	CityData: null,
	CityEntities: null,
	ScaleUnit: 100,
	CityView: 'skew',
	UnlockedAreas: null,
	BlockedAreas: null,
	OccupiedArea: 0,
	EfficiencyFactor: 0,
	IsExtern: false,


	/**
	 * Zündung...
	 *
	 * @param event
	 * @param event
	 * @param Data The City data
	 * @param Title Name of the city
	 */
	init: (event, Data = null, Title = i18n('Boxes.CityMap.YourCity') + '...')=> {

		if (Data === null) { // No data => own city
			CityMap.IsExtern = false;
			Data = MainParser.CityMapData;
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

			$('#map-container').scrollTo( $('.pulsate') , 800, {offset: {left: -280, top: -280}, easing: 'swing'});
			$('.to-old-legends').hide();
			$('.building-count-area').show();
		});

		// Button for submit Box
		if (CityMap.IsExtern === false) {
			menu.append($('<button />').addClass('btn-default ml-auto').attr({ id: 'highlight-old-buildings', onclick: 'CityMap.highlightOldBuildings()' }).text(i18n('Boxes.CityMap.HighlightOldBuildings')));
			menu.append($('<input type="text" id="BuildingsFilter" placeholder="'+ i18n('Boxes.CityMap.FilterBuildings') +'" oninput="CityMap.filterBuildings(this.value)">'));
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

		let ActiveId = $('#grid-outer').find('.pulsate').data('entityid') || null;

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

				f = $('<span />').addClass('entity ' + d['type']).css({
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
				f.addClass('pulsate');
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
			aW.append( $('<p />').addClass('building-count-area') );
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

			let str = `${TypeName}:<br> ${count} (${pct}%)<br>`;

			if (type === 'street') {
				str = str + HTML.Format(Math.round(CityMap.EfficiencyFactor * 10000) / 100) + '% ' + i18n('Boxes.Citymap.Efficiency') + '<br>';
			}
			str = `<span class="square ${type}"></span>${str}<br>`;
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
				$(sp).addClass('blinking');
			} else {
				$(sp).removeClass('blinking');
			}

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
	}
};
