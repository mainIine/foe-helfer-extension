/*
 * **************************************************************************************
 *
 * Dateiname:                 citymap.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       28.09.19, 17:17 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let CityMap = {

	CityData: null,
	ScaleUnit: 1,

	/**
	 * Zündung...
	 *
	 * @param Data
	 * @param Title
	 */
	init: (Data = false, Title = 'Deine Stadt...')=> {

		// es wurde bereits eine Scallierung gesetzt?
		CityMap.ScaleUnit = localStorage.getItem('CityMapScale') || 1;

		if( $('#city-map-overlay').length < 1 )
		{
			let args = {
				'id': 'city-map-overlay',
				'title': Title,
				'auto_close': true,
				'dragdrop': true,
				'resize': true
			};

			HTML.Box(args);

			setTimeout(()=>{
				CityMap.PrepareBox(Title);
			}, 100);
		}


		setTimeout(()=>{

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
	 * @constructor
	 */
	PrepareBox: (Title)=> {
		let oB = $('#city-map-overlayBody'),
			CityView = localStorage.getItem('CityMapView') || 'skew',
			CityScale = localStorage.getItem('CityMapScale') || 1;

		oB.append( $('<div />').attr('id', 'map-container').append( $('<div />').attr('id', 'grid-outer').attr('data-unit', CityScale).attr('data-view', CityView).append( $('<div />').attr('id', 'map-grid') ) ) );

		$('#city-map-overlayHeader > .title').attr('id', 'map' + CityMap.hashCode(Title));

		let menu = $('<div />').attr('id', 'city-map-menu');

		/* Ansicht wechseln */
		let dropView = $('<select />').attr('id', 'menu-view').addClass('game-cursor')
			.append( $('<option />').prop('selected', CityView === 'normal').attr('data-view', 'normal').text('Normal').addClass('game-cursor') )
			.append( $('<option />').prop('selected', CityView === 'skew').attr('data-view', 'skew').text('Kavalier Persp.').addClass('game-cursor') );

		menu.append(dropView);

		$('body').on('change', '#menu-view', function(){
			let view = $('#menu-view option:selected').data('view');

			$('#grid-outer').attr('data-view', view);
			localStorage.setItem('CityMapView', view);
		});


		/* Scalierung wechseln */
		let scaleView = $('<select />').attr('id', 'scale-view').addClass('game-cursor')
			.append( $('<option />').prop('selected', CityScale === '2').attr('data-scale', 2).text('Scale 3').addClass('game-cursor') )
			.append( $('<option />').prop('selected', CityScale === '1.5').attr('data-scale', 1.5).text('Scale 2').addClass('game-cursor') )
			.append( $('<option />').prop('selected', CityScale === '1').attr('data-scale', 1).text('Scale 1').addClass('game-cursor') );

		menu.append(scaleView);

		$('body').on('change', '#scale-view', function(){
			let unit = $('#scale-view option:selected').data('scale');

			CityMap.ScaleUnit = unit;
			$('#grid-outer').attr('data-unit', unit);
			localStorage.setItem('CityMapScale', unit);

			CityMap.SetBuildings(CityMap.CityData, false);

			$('#map-container').scrollTo( $('.pulsate') , 800, {offset: {left: -280, top: -280}, easing: 'swing'});
		});


		/* In das Menü "schieben" */
		oB.prepend(menu);
	},


	/**
	 * Erzeugt ein Raster für den Hintergrund
	 *
	 * @constructor
	 */
	BuildGrid:()=> {

		let xWidth = 60,
			yHeigth = 64,
			G = $('#map-grid');

		// Zeile für Zeile nach unten
		for (let y = 1; yHeigth >= y; y++)
		{
			// immer 60 Felder nach rechts
			for(let x = 1; xWidth >= x; x++)
			{
				G.append(
					$('<span />').attr('data-grid', x + '-' + y)
				);
			}
		}
	},


	/**
	 * Container gemäß den Koordianten zusammensetzen
	 *
	 * @param Data
	 * @constructor
	 */
	SetBuildings: (Data = null)=> {

		// https://foede.innogamescdn.com/assets/city/buildings/R_SS_MultiAge_SportBonus18i.png

		let MapData,
			MapDataSorted,
			ActiveId = $('#grid-outer').find('.pulsate').data('entityid') || null;

		// einmal komplett leer machen, wenn gewünscht
		$('#grid-outer').find('.entity').remove();

		if(CityMap.CityData === null)
		{
			// kommt von extern
			if(Data !== null)
			{
				MapData = Data;
			}
			// eigene Stadt
			else {
				MapData = CityMapData;
			}

			MapDataSorted = MapData.sort( function(X1, X2) {
				if (X1.x < X2.x) return -1;
				if (X1.x > X2.x) return 1;
			});

			CityMap.CityData = MapDataSorted;

		} else {
			MapDataSorted = CityMap.CityData;
		}


		for(let b in MapDataSorted)
		{
			if(MapDataSorted.hasOwnProperty(b) && MapDataSorted[b]['type'] !== 'friends_tavern' && MapDataSorted[b]['type'] !== 'off_grid')
			{
				let d = BuildingNamesi18n[ MapDataSorted[b]['cityentity_id'] ],
					f = $('<span />').addClass('entity ' + d['type']).css({
						width: (parseInt(d['width']) / CityMap.ScaleUnit) + 'em',
						height: (parseInt(d['height']) / CityMap.ScaleUnit) + 'em',
						left: (MapDataSorted[b]['x']=== undefined ? 0 : (parseInt(MapDataSorted[b]['x']) / CityMap.ScaleUnit)) + "em",
						top: (MapDataSorted[b]['y'] === undefined ? 0 : (parseInt(MapDataSorted[b]['y']) / CityMap.ScaleUnit)) + "em"
					})
						.attr('title', d['name'])
						.attr('data-entityid', MapDataSorted[b]['id']);

				// die Größe wurde geändert, wieder aktivieren
				if(ActiveId !== null && ActiveId === MapDataSorted[b]['id'])
				{
					f.addClass('pulsate');
				}

				$('#grid-outer').append( f );
			}
		}

		// Gebäudenamen via Tooltip
		$('.entity').tooltip({
			container: '#map-container'
		});
	},


	/**
	 * Erzeugt einen Hash vom String
	 *
	 * @param str
	 * @returns {number}
	 */
	hashCode: (str)=>{
		return str.split('').reduce((prevHash, currVal) => (((prevHash << 5) - prevHash) + currVal.charCodeAt(0))|0, 0);
	}
};
