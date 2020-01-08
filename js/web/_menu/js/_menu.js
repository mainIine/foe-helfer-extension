/*
 * **************************************************************************************
 *
 * Dateiname:                 _menu.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 13:49 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let _menu = {

	isBottom: false,
	MenuScrollTop: 0,
	SlideParts: 0,
	ActiveSlide: 1,
	HudCount: 0,
	HudHeight: 0,


	/**
	 *
	 */
	BuildOverlayMenu: ()=>{

		let hud = $('<div />').attr('id', 'ant-hud').addClass('game-cursor'),
			hudWrapper = $('<div />').attr('id', 'ant-hud-wrapper'),
			hudInner = $('<div />').attr('id', 'ant-hud-slider');

		hudWrapper.append(hudInner);


		let btnUp = $('<span />').addClass('hud-btn-up'),
			btnDown = $('<span />').addClass('hud-btn-down hud-btn-down-active');

		hud.append(btnUp);
		hud.append(hudWrapper)
		hud.append(btnDown);

		$('body').append( hud ).ready(function () {

			// Buttons einfügen
			_menu.ListLinks();

			_menu.SetMenuHeight();
		});

		// Wenn sie die Fenstergröße verändert, neu berechnen
		window.onresize = function(event) {
			_menu.SetMenuHeight();
		};
	},


	/**
	 * Sammelfunktion
	 *
	 */
	SetMenuHeight: ()=> {
		// Höhe ermitteln und setzten
		_menu.Prepare();

		// Tool-Tipp "top" setzen
		_menu.SetToolTippTop();
	},


	/**
	 * Ermittelt die Fensterhöhe und ermittelt die passende Höhe
	 *
	 */
	Prepare: ()=> {

		_menu.HudCount = Math.floor( (( $(window).outerHeight() - 50 ) - $('#ant-hud').position().top) / 55 );
		_menu.HudHeight = (_menu.HudCount * 55);
		_menu.SlideParts = Math.ceil($("#ant-hud-slider").children().length / _menu.HudCount);

		$('#ant-hud').height(_menu.HudHeight + 2);
		$('#ant-hud-wrapper').height(_menu.HudHeight);
	},


	/**
	 * Bindet alle benötigten Button ein
	 *
	 */
	ListLinks: ()=> {
		let hudSlider = $('#ant-hud-slider');


		/**
		 * Kostenrechner
		 */
		hudSlider.append( _menu.calcFP_Btn() );


		/**
		 * Eigenanteilsrechner
		 */
		hudSlider.append( _menu.ownFP_Btn() );


        /**
        * Außenposten
        */
		if(Settings.GetSetting('ShowOutpost')){
			hudSlider.append( _menu.outP_Btn() );
        }

        /**
        * Technologien
        */
        hudSlider.append(_menu.Technologies_Btn());

		/**
        * Kampange
        */
	   	hudSlider.append(_menu.CampagneMap_Btn());

        /**
        * Negotiation
        */
        hudSlider.append(_menu.Negotiation_Btn());


		/**
		 * Armeen
		 */
		hudSlider.append(_menu.Unit_Btn())

		/**
		 * Live-Chat
		 */
		hudSlider.append( _menu.Chat_Btn() );


		/**
		 * FP - Berechnen
		 */
		hudSlider.append( _menu.getFP_Btn() );


		/**
		 * InfoBox
		 */
		hudSlider.append( _menu.Info_Btn() );


		/**
		 * Einstellungen
		 */
		hudSlider.append( _menu.Setting_Btn() );


		/**
		 * Forum
		 */
		hudSlider.append( _menu.Forum_Btn() );


		/**
		 * Frage / Antwort
		 */
		hudSlider.append( _menu.Ask_Btn() );


		/**
		 * Bug Buttons
		 */
		hudSlider.append( _menu.Bug_Btn() );

		_menu.CheckButtons();
	},


	/**
	 * Panel scrollbar machen
	 *
	 */
	CheckButtons: ()=>{

		let activeIdx = 0;


		$('.hud-btn').click(function(){
			activeIdx = $(this).index('.hud-btn');
		});


		// Klick auf Pfeil nach unten
		$('body').on('click', '.hud-btn-down-active', function(){

			_menu.ActiveSlide++;
			_menu.MenuScrollTop -= _menu.HudHeight;

			$('#ant-hud-slider').css({
				'top': _menu.MenuScrollTop + 'px'
			});

			if(_menu.ActiveSlide > 1) {
				$('.hud-btn-up').addClass('hud-btn-up-active');
			}

			if(_menu.ActiveSlide === _menu.SlideParts){
				$('.hud-btn-down').removeClass('hud-btn-down-active');

			} else if (_menu.ActiveSlide < _menu.SlideParts) {
				$('.hud-btn-down').addClass('hud-btn-down-active');
			}
		});


		// Klick auf Pfeil nach oben
		$('body').on('click', '.hud-btn-up-active', function(){

			_menu.ActiveSlide--;
			_menu.MenuScrollTop += _menu.HudHeight;

			$('#ant-hud-slider').css({
				'top': _menu.MenuScrollTop + 'px'
			});

			if(_menu.ActiveSlide === 1){
				$('.hud-btn-up').removeClass('hud-btn-up-active');
			}

			if(_menu.ActiveSlide < _menu.SlideParts) {
				$('.hud-btn-down').addClass('hud-btn-down-active');

			} else if(_menu.ActiveSlide === _menu.SlideParts){
				$('.hud-btn-down').removeClass('hud-btn-down-active');
			}
		});


		// Tooltipp einblenden
		$('.hud-btn').hover(function() {
			let id = $(this).attr('id');

			$('[data-btn="' + id + '"]').show();

		}, function() {
			let id = $(this).attr('id');

			$('[data-btn="' + id + '"]').hide();
		});
	},


	/**
	 * Tooltip Box
	 *
	 * @param {string} title
	 * @param {string} desc
	 * @param {string} id
	 */
	toolTippBox: (title, desc, id)=> {

		let ToolTipp = $('<div />').addClass('toolTipWrapper').html(desc).attr('data-btn', id);

		ToolTipp.prepend( $('<div />').addClass('toolTipHeader').text(title) );

		$('#ant-hud').append( ToolTipp );
	},


	/**
	 * Ermittelt die Anzahl der sichtbaren Punkte
	 * und setzt das Top-Value
	 *
	 */
	SetToolTippTop: ()=> {

		let cnt = 1,
			TTtop = 53;

		$('.toolTipWrapper').each(function(){

			$(this).css({'top': TTtop + 'px'});

			if(cnt === _menu.HudCount){
				cnt = 1;
				TTtop = 53;
			} else {
				cnt++;
				TTtop += 55;
			}
		});
	},

	/*----------------------------------------------------------------------------------------------------------------*/


	/**
	 * FP Gesamtanzahl Button
	 *
	 * @returns {*|jQuery}
	 */
	getFP_Btn: ()=> {
		let btn_FPsBG = $('<div />').attr('id', 'getFPs').addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['Productions']['Title'], i18n['Menu']['Productions']['Desc'], 'getFPs');


		let btn_FPs = $('<span />');

		btn_FPs.bind('click', function(){
			Productions.init();
		});

		btn_FPsBG.append(btn_FPs);

		return btn_FPsBG;
	},


	/**
	 * Kostenrechner Button
	 *
	 * @returns {*|jQuery}
	 */
	calcFP_Btn: ()=> {
        sessionStorage.removeItem('OtherActiveBuilding');
        sessionStorage.removeItem('OtherActiveBuildingData');
        sessionStorage.removeItem('OtherActiveBuildingOverview');

		let btn_CalcBG = $('<div />').attr('id', 'calcFPs').addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['Calculator']['Title'], '<em id="calcFPs-closed" class="tooltip-error">' + i18n['Menu']['Calculator']['Warning'] +  '<br></em>' + i18n['Menu']['Calculator']['Desc'], 'calcFPs');

		let btn_Calc = $('<span />');

		btn_Calc.bind('click', function() {
            let RankingsJSON = sessionStorage.getItem('OtherActiveBuilding'),
                UpdateEntityJSON = sessionStorage.getItem('OtherActiveBuildingData'),
                OverviewJSON = sessionStorage.getItem('OtherActiveBuildingOverview');

            let Rankings = RankingsJSON !== null ? JSON.parse(RankingsJSON) : undefined,
                UpdateEntity = UpdateEntityJSON !== null ? JSON.parse(UpdateEntityJSON) : undefined,
                Overview = OverviewJSON !== null ? JSON.parse(OverviewJSON) : undefined;
            
			// Nur Übersicht verfügbar
            if (Overview !== undefined && UpdateEntity === undefined) {
                Calculator.ShowOverview(false);
            }

            // Nur Detailansicht verfügbar
            else if (UpdateEntity !== undefined && Overview === undefined) {
                Calculator.Show(Rankings, UpdateEntity);
            }

            // Beide verfügbar
            else if (UpdateEntity !== undefined && Overview !== undefined) {
                let BuildingInfo = Overview.find(obj => {
                    return obj['city_entity_id'] === UpdateEntity['cityentity_id'] && obj['player']['player_id'] === UpdateEntity['player_id'];
                });

                // Beide gehören zum selben Spieler => beide anzeigen
                if (BuildingInfo !== undefined) {
                    Calculator.ShowOverview();
                    Calculator.Show(Rankings, UpdateEntity);
                }

                // Unterschiedliche Spieler => Öffne die neuere Ansicht
                else {
                    let DetailViewIsNewer = sessionStorage.getItem('DetailViewIsNewer');
                    if (DetailViewIsNewer === "true") {
                        Calculator.Show(Rankings, UpdateEntity);
                    }
                    else {
                        Calculator.ShowOverview();
                    }
                }

            }
		});

		btn_CalcBG.append(btn_Calc);

		return btn_CalcBG;
	},


	/**
	 * Outpost Button
	 *
	 * @returns {*|jQuery}
	 */
	outP_Btn: ()=> {

		let btn_outPBG = $('<div />').attr('id', 'outPostBtn').addClass('hud-btn'),
			desc = i18n['Menu']['OutP']['Desc'];

        if (Outposts.OutpostData === null) {
            btn_outPBG.addClass('hud-btn-red');
            desc = i18n['Menu']['OutP']['DescWarningOutpostData'];
        }
		if(localStorage.getItem('OutpostBuildings') === null){
			btn_outPBG.addClass('hud-btn-red');
			desc = i18n['Menu']['OutP']['DescWarningBuildings'];
		}

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['OutP']['Title'], desc, 'outPostBtn');

		let btn_outpost = $('<span />');

		btn_outpost.bind('click', function(){
            let OutpostBuildings = localStorage.getItem('OutpostBuildings');

			if(OutpostBuildings !== null){
				Outposts.BuildInfoBox();
			}
		});

		btn_outPBG.append(btn_outpost);

		return btn_outPBG;
	},


	/**
	 * Eigenanteilsrechner Button
	 *
	 * @returns {*|jQuery}
	 */
    ownFP_Btn: () => {
        localStorage.removeItem('OwnCurrentBuildingCity');
        localStorage.removeItem('OwnCurrentBuildingGreat');

		let btn_OwnBG = $('<div />').attr('id', 'ownFPs').addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['OwnpartCalculator']['Title'], '<em id="ownFPs-closed" class="tooltip-error">' + i18n['Menu']['OwnpartCalculator']['Warning'] +  '<br></em>' + i18n['Menu']['OwnpartCalculator']['Desc'], 'ownFPs');

		let btn_Own = $('<span />');

		btn_Own.on('click', function() {
			// nur wenn es für diese Session ein LG gibt zünden
			if( localStorage.getItem('OwnCurrentBuildingGreat') !== null ){
				Parts.buildBox();
			}
		});

		btn_OwnBG.append(btn_Own);

		return btn_OwnBG;
	},


	/**
	 * Chat Button
	 *
	 * @returns {*|jQuery}
	 */
	Chat_Btn: ()=> {

		let btn = $('<div />').attr('id', 'ChatBtn').addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['Chat']['Title'], i18n['Menu']['Chat']['Desc'], 'ChatBtn');

		let btn_sp = $('<span />');

		btn_sp.on('click', function() {
			chrome.runtime.sendMessage(extID, {type: 'chat', player: ExtPlayerID, guild: ExtGuildID, world: ExtWorld});
		});

		btn.append(btn_sp);


		return btn;
    },


	/**
	 * Technologien
	 *
	 * @returns {*|jQuery}
	 */
	Technologies_Btn: ()=> {
        let btn_TechBG = $('<div />').attr('id', 'Tech').addClass('hud-btn hud-btn-red');

        // Tooltip einbinden

        _menu.toolTippBox(i18n['Menu']['Technologies']['Title'], '<em id="Tech-closed" class="tooltip-error">' + i18n['Menu']['Technologies']['Warning'] + '<br></em>' + i18n['Menu']['Technologies']['Desc'], 'Tech');

        let btn_Tech = $('<span />');

        btn_Tech.on('click', function () {
            if (Technologies.AllTechnologies !== null) {
                Technologies.Show();
            }
        });

        btn_TechBG.append(btn_Tech);

        return btn_TechBG;
    },


	/**
	 * KampanienMap
	 *
	 * @returns {*|jQuery}
	 */
	CampagneMap_Btn: ()=> {
        let btn_MapBG = $('<div />').attr('id', 'Map').addClass('hud-btn hud-btn-red');

        // Tooltip einbinden
        _menu.toolTippBox(i18n['Menu']['Campagne']['Title'], '<em id="map-closed" class="tooltip-error">' + i18n['Menu']['Campagne']['Warning'] + '<br></em>' + i18n['Menu']['Campagne']['Desc'], 'Map');

        let btn_Map = $('<span />');

        btn_Map.on('click', function () {
            if (KampagneMap.Provinces !== null) {
                KampagneMap.Show();
            }
        });

        btn_MapBG.append(btn_Map);

        return btn_MapBG;
    },


    /**
	 * Negotiation
	 *
	 * @returns {*|jQuery}
	 */
    Negotiation_Btn: () => {
        let btn_NegotiationBG = $('<div />').attr('id', 'negotationBtn').addClass('hud-btn hud-btn-red');

        // Tooltip einbinden
        _menu.toolTippBox(i18n['Menu']['Negotiation']['Title'], '<em id="negotiation-closed" class="tooltip-error">' + i18n['Menu']['Negotiation']['Warning'] + '<br></em>' + i18n['Menu']['Negotiation']['Desc'], 'negotationBtn');

        let btn_Negotiation = $('<span />');

		btn_Negotiation.bind('click', function () {
			if( $('#negotationBtn').hasClass('hud-btn-red') === false) {
				Negotiation.Show();
			}
		});

        btn_NegotiationBG.append(btn_Negotiation);

        return btn_NegotiationBG;
    },


	/**
	 * Armeen
	 * @returns {*|jQuery}
	 */
	Unit_Btn: ()=> {
		let btn_UnitBG = $('<div />').attr('id', 'unitBtn').addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['Unit']['Title'], '<em id="unit-closed" class="tooltip-error">' + i18n['Menu']['Unit']['Warning'] + '<br></em>' + i18n['Menu']['Unit']['Desc'], 'unitBtn');

		let btn_Unit = $('<span />');

		btn_Unit.on('click', function () {
			if(Unit.Cache !== null){
				Unit.Show();
			}
		});

		btn_UnitBG.append(btn_Unit);

		return btn_UnitBG;
	},


	/**
	 * Einstellungen
	 *
	 */
	Setting_Btn: ()=> {

		let btn = $('<div />').attr('id', 'SettingBtn').addClass('hud-btn');

		_menu.toolTippBox(i18n['Menu']['Settings']['Title'], i18n['Menu']['Settings']['Desc'], 'SettingBtn');

		let btn_Set = $('<span />');

		btn_Set.on('click', function(){
			Settings.init();
		});

		btn.append(btn_Set);

		return btn;
	},


	/**
	 * Frage/Antwort
	 *
	 * @returns {*|jQuery}
	 */
	Ask_Btn: ()=> {

		let btn = $('<div />').attr('id', 'AskBtn').addClass('hud-btn');

		_menu.toolTippBox(i18n['Menu']['Ask']['Title'], i18n['Menu']['Ask']['Desc'], 'AskBtn');

		let btn_Ask = $('<span />');

		btn_Ask.on('click', function() {
			let win = window.open('https://foe-rechner.de/extension/index', '_blank');
			win.focus();
		});

		btn.append(btn_Ask);

		return btn;
	},


	/**
	 * Forum
	 *
	 * @returns {*|jQuery}
	 */
	Forum_Btn: ()=> {

		let btn = $('<div />').attr('id', 'ForumBtn').addClass('hud-btn');

		_menu.toolTippBox(i18n['Menu']['Forum']['Title'], i18n['Menu']['Forum']['Desc'], 'ForumBtn');

		let btn_Forum = $('<span />');

		btn_Forum.on('click', function() {
			let win = window.open('https://forum.foe-rechner.de', '_blank');
			win.focus();
		});

		btn.append(btn_Forum);

		return btn;
	},


	/**
	 * Bug-Link
	 *
	 * @returns {*|jQuery}
	 */
	Bug_Btn: ()=> {

		let btn = $('<div />').attr('id', 'BugBtn').addClass('hud-btn');

		_menu.toolTippBox(i18n['Menu']['Bugs']['Title'], i18n['Menu']['Bugs']['Desc'], 'BugBtn');

		let btn_Bug = $('<span />');

		btn_Bug.on('click', function() {
			let win = window.open('https://github.com/dsiekiera/foe-helfer-extension/issues', '_blank');
			win.focus();
		});

		btn.append(btn_Bug);

		return btn;
	},


	/**
	 * InfoBox für den Hintergrund "Verkehr"
	 *
	 * @returns {*|jQuery}
	 */
	Info_Btn: ()=> {

		let btn_Info = $('<div />').attr('id', 'InfoBox').addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['Info']['Title'], i18n['Menu']['Info']['Desc'], 'InfoBox');

		let btn_Inf = $('<span />');

		btn_Inf.on('click', function() {
			Infoboard.init();
		});

		btn_Info.append(btn_Inf);


		return btn_Info;
	}
};
