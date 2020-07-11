/*
 * **************************************************************************************
 *
 * Dateiname:                 citymap.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 14:31 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */


/**
 *
 * @type {{init: CityMap.init, showSumbitBox: CityMap.showSumbitBox, UnlockedAreas: null, SubmitData: CityMap.SubmitData, SetBuildings: CityMap.SetBuildings, CityData: null, ScaleUnit: number, CityView: string, hashCode: (function(*): number), OccupiedArea: number, IsExtern: boolean, getAreas: CityMap.getAreas, PrepareBox: CityMap.PrepareBox, BuildGrid: CityMap.BuildGrid}}
 */
let CityMap = {
	CityData: null,
	CityEntities: null,
	ScaleUnit: 100,
	CityView: 'skew',
	UnlockedAreas: null,
	OccupiedArea: 0,
	IsExtern: false,


	/**
	 * Zündung...
	 *
	 * @param Data
	 * @param Title
	 */
	init: (Data = null, Title = i18n('Boxes.CityMap.YourCity') + '...')=> {

		if (Data === null) { // No data => own city
			CityMap.IsExtern = false;
			Data = MainParser.CityMapData;
		}
		// Neighbour
		else {
			CityMap.IsExtern = true;
		}

		CityMap.CityData = Object.values(Data).sort(function (X1, X2) {
			if (X1.x < X2.x) return -1;
			if (X1.x > X2.x) return 1;
		});

		let scale = localStorage.getItem('CityMapScale'),
			view = localStorage.getItem('CityMapView');

		// es wurde bereits eine Scallierung gesetzt?
		if(null !== scale){
			CityMap.ScaleUnit = parseInt(scale);
		}

		// es wurde bereits eine Ansicht gesetzt?
		if(null !== view){
			CityMap.CityView = view;
		}


		if( $('#city-map-overlay').length < 1 )
		{
			// CSS in den DOM prügeln
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
		// Close temporär deaktivert, bis der Bug mit dem doppelten Handler am Auge Icon gefixed ist
		//else {
		//	HTML.CloseOpenBox('city-map-overlay');
		//}

		setTimeout(()=>{

			// eigene Stadt
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
			w = $('<div />').attr({'id':'wrapper'});

		if(CityMap.IsExtern === false){
			w.append( $('<div />').attr('id', 'map-container').append( $('<div />').attr('id', 'grid-outer').attr('data-unit', CityMap.ScaleUnit).attr('data-view', CityMap.CityView).append( $('<div />').attr('id', 'map-grid') ) ) ).append( $('<div />').attr({'id': 'sidebar'}) );
		} else {
			w.append( $('<div />').attr('id', 'map-container').addClass('with-sidebar').append( $('<div />').attr('id', 'grid-outer').attr('data-unit', CityMap.ScaleUnit).attr('data-view', CityMap.CityView).append( $('<div />').attr('id', 'map-grid') ) ) );
		}


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
		});

		// Button for submit Box
		if (CityMap.IsExtern === false) {
			menu.append($('<button />').addClass('btn-default ml-auto').attr({ id: 'show-submit-box', onclick: 'CityMap.showSumbitBox()' }).text(i18n('Boxes.CityMap.ShowSubmitBox')));
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

		if(CityMap.IsExtern === false) {
			// Unlocked Areas rendern
			CityMap.BuildGrid();
		}
		
		let MinX = 0,
			MinY = 0,
			MaxX = 63,
			MaxY = 63;

		for (let b in CityMap.CityData)
		{
			if (!CityMap.CityData.hasOwnProperty(b) || CityMap.CityData[b]['x'] < MinX || CityMap.CityData[b]['x'] > MaxX || CityMap.CityData[b]['y'] < MinY || CityMap.CityData[b]['y'] > MaxY)
				continue;

			let	d = MainParser.CityEntities[ CityMap.CityData[b]['cityentity_id'] ],

				x = (CityMap.CityData[b]['x'] === undefined ? 0 : ((parseInt(CityMap.CityData[b]['x']) * CityMap.ScaleUnit) / 100 )),
				y = (CityMap.CityData[b]['y'] === undefined ? 0 : ((parseInt(CityMap.CityData[b]['y']) * CityMap.ScaleUnit) / 100 )),
				w = ((parseInt(d['width']) * CityMap.ScaleUnit) / 100),
				h = ((parseInt(d['length']) * CityMap.ScaleUnit) / 100),

				f = $('<span />').addClass('entity ' + d['type']).css({
						width: w + 'em',
						height: h + 'em',
						left: x + 'em',
						top: y + 'em'
					})
					.attr('title', d['name'])
					.attr('data-entityid', CityMap.CityData[b]['id']),
				era;

			CityMap.OccupiedArea += (parseInt(d['width']) * parseInt(d['length']));

			// Search age
			if (d['is_multi_age'] && CityMap.CityData[b]['level']) {
				era = CityMap.CityData[b]['level'] + 1;

			}
			// Great building
			else if (d['strategy_points_for_upgrade']) {
				era = CurrentEraID;
			}
			else {
				let regExString = new RegExp("(?:_)((.[\\s\\S]*))(?:_)", "ig"),
					testEra = regExString.exec(d['id']);

				if (testEra && testEra.length > 1) {
					era = Technologies.Eras[testEra[1]];

					// AllAge => Current era
					if (era === 0) {
						era = CurrentEraID;
					}
				}
			}

			if(era){
				f.attr({
					title: `${d['name']}<br><em>${i18n('Eras.' + era )}</em>`
				})
			}

			// die Größe wurde geändert, wieder aktivieren
			if (ActiveId !== null && ActiveId === CityMap.CityData[b]['id'])
			{
				f.addClass('pulsate');
			}

			$('#grid-outer').append( f );
		}

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

			$('#sidebar').append(aW);

		}

		$('.total-area').html(txtTotal);
		$('.occupied-area').html(txtFree);

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
	showSumbitBox: ()=> {
		if( $('#city-map-submit').length < 1 )
		{
			HTML.Box({
				'id': 'CityMapSubmit',
				'title': i18n('Boxes.CityMap.TitleSend'),
				'auto_close': true,
				'saveCords': false
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('citymap');

			let desc = '<p class="text-center">' + i18n('Boxes.CityMap.Desc1') + '</p>';

			desc += '<p class="text-center" id="msg-line"><button class="btn-default" onclick="CityMap.SubmitData()">' + i18n('Boxes.CityMap.Desc2') + '</button></p>';

			$('#CityMapSubmitBody').html(desc);
		}
	},


	/**
	 * Send citydata to the server
	 *
	 */
	SubmitData: ()=> {

		let d = {
			entities: MainParser.CityMapData,
			areas: CityMap.UnlockedAreas,
			metaid: MainParser.CityMetaId
		};

		MainParser.send2Server(d, 'CityPlanner', function(){
			$('#CityMapSubmitBody').html('<p><span class="text-success">' + i18n('Boxes.CityMap.SubmitSuccess') + '</p><a class="btn-default" target="_blank" href="https://foe-rechner.de">foe-rechner.de</a></span>');
		});
	},
};
