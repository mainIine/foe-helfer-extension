/*
 * **************************************************************************************
 *
 * Dateiname:                 menu.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       20.11.19, 17:21 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let Menu = {

	isBottom: false,
	ToolTippCount: 0,
	ToolTippTop: 53,
	MenuScrollTop: 0,
	SlideParts: 0,
	ActiveSlide: 1,

	/**
	 *
	 * @constructor
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

		$('body').append( hud );

		Menu.ListLinks();
	},


	/**
	 * Bindet alle benötigten Button ein
	 *
	 * @constructor
	 */
	ListLinks: ()=> {
		let hudSlider = $('#ant-hud-slider');


		/**
		 * Kostenrechner
		 */
		hudSlider.append( Menu.calcFP_Btn() );


		/**
		 * Eigenanteilsrechner
		 */
		hudSlider.append( Menu.ownFP_Btn() );


        /**
        * Außenposten
        */
		if(Settings.GetSetting('ShowOutpost')){
			hudSlider.append( Menu.outP_Btn() );
        }

        /**
        * Technologien
        */
        hudSlider.append(Menu.Technologies_Btn());


        /**
        * Negotiation
        */
        hudSlider.append(Menu.Negotiation_Btn());


		/**
		 * Armeen
		 */
		hudSlider.append(Menu.Unit_Btn())


		/**
		 * Forum
		 */
		hudSlider.append( Menu.Forum_Btn() );


		/**
		 * Live-Chat
		 */
		hudSlider.append( Menu.Chat_Btn() );


		/**
		 * FP - Berechnen
		 */
		hudSlider.append( Menu.getFP_Btn() );


		/**
		 * InfoBox
		 */
		hudSlider.append( Menu.Info_Btn() );


		/**
		 * Einstellungen
		 */
		hudSlider.append( Menu.Setting_Btn() );


		/**
		 * Frage / Antwort
		 */
		hudSlider.append( Menu.Ask_Btn() );


		/**
		 * Bug Buttons
		 */
		hudSlider.append( Menu.Bug_Btn() );


		// hudSlider.append( Menu.BH_Btn() );
		// wie viele Elemente und wieviele Abschnitte sind es
		setTimeout(()=>{
			Menu.SlideParts = Math.ceil($("#ant-hud-slider").children().length / 4);
		}, 100);

		Menu.CheckButtons();
	},


	/**
	 * Panel scrollbar machen
	 *
	 * @constructor
	 */
	CheckButtons: ()=>{

		let childs = $("#ant-hud-slider").children().length,
			activeIdx = 0;


		$('.hud-btn').click(function() {
			activeIdx = $(this).index('.hud-btn');
		});


		// Klick auf Pfeil nach unten
		$('body').on('click', '.hud-btn-down-active', function(){

			Menu.ActiveSlide++;
			Menu.MenuScrollTop -= 220;

			$('#ant-hud-slider').css({
				'top': Menu.MenuScrollTop + 'px'
			});

			if(Menu.ActiveSlide > 1) {
				$('.hud-btn-up').addClass('hud-btn-up-active');
			}

			if(Menu.ActiveSlide === Menu.SlideParts){
				$('.hud-btn-down').removeClass('hud-btn-down-active');

			} else if (Menu.ActiveSlide < Menu.SlideParts) {
				$('.hud-btn-down').addClass('hud-btn-down-active');
			}
		});


		// Klick auf Pfeil nach oben
		$('body').on('click', '.hud-btn-up-active', function(){

			Menu.ActiveSlide--;
			Menu.MenuScrollTop += 220;

			$('#ant-hud-slider').css({
				'top': Menu.MenuScrollTop + 'px'
			});

			if(Menu.ActiveSlide === 1){
				$('.hud-btn-up').removeClass('hud-btn-up-active');
			}

			if(Menu.ActiveSlide < Menu.SlideParts) {
				$('.hud-btn-down').addClass('hud-btn-down-active');

			} else if(Menu.ActiveSlide === Menu.SlideParts){
				$('.hud-btn-down').removeClass('hud-btn-down-active');
			}
		});


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
	 * @param title
	 * @param desc
	 * @param id
	 */
	toolTippBox: (title, desc, id)=> {

		Menu.ToolTippCount++;

		let ToolTipp = $('<div />').addClass('toolTipWrapper').html(desc).attr('data-btn', id).css({'top'  : Menu.ToolTippTop + 'px'});

		if(Menu.ToolTippCount % 4 === 0){
			Menu.ToolTippTop = 53;
		} else {
			Menu.ToolTippTop += 55;
		}

		ToolTipp.prepend( $('<div />').addClass('toolTipHeader').text(title) );

		$('#ant-hud').append( ToolTipp );
	},

	/*----------------------------------------------------------------------------------------------------------------*/
	/*----------------------------------------------------------------------------------------------------------------*/
	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * FP Gesamtanzahl Button
	 *
	 * @returns {*|jQuery}
	 */
	getFP_Btn: ()=> {
		let btn_FPsBG = $('<div />').attr('id', 'getFPs').addClass('hud-btn');

		// Tooltip einbinden
		Menu.toolTippBox(i18n['Menu']['Productions']['Title'], i18n['Menu']['Productions']['Desc'], 'getFPs');


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
		Menu.toolTippBox(i18n['Menu']['Calculator']['Title'], '<em id="calcFPs-closed" class="tooltip-error">' + i18n['Menu']['Calculator']['Warning'] +  '<br></em>' + i18n['Menu']['Calculator']['Desc'], 'calcFPs');

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
		Menu.toolTippBox(i18n['Menu']['OutP']['Title'], desc, 'outPostBtn');

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
		Menu.toolTippBox(i18n['Menu']['OwnpartCalculator']['Title'], '<em id="ownFPs-closed" class="tooltip-error">' + i18n['Menu']['OwnpartCalculator']['Warning'] +  '<br></em>' + i18n['Menu']['OwnpartCalculator']['Desc'], 'ownFPs');

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
		Menu.toolTippBox(i18n['Menu']['Chat']['Title'], i18n['Menu']['Chat']['Desc'], 'ChatBtn');

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
	 * @constructor
	 */
	Technologies_Btn: ()=> {
        let btn_TechBG = $('<div />').attr('id', 'Tech').addClass('hud-btn hud-btn-red');

        // Tooltip einbinden

        Menu.toolTippBox(i18n['Menu']['Technologies']['Title'], '<em id="Tech-closed" class="tooltip-error">' + i18n['Menu']['Technologies']['Warning'] + '<br></em>' + i18n['Menu']['Technologies']['Desc'], 'Tech');

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
	 * Negotiation
	 *
	 * @returns {*|jQuery}
	 * @constructor
	 */
    Negotiation_Btn: () => {
        let btn_NegotiationBG = $('<div />').attr('id', 'negotationBtn').addClass('hud-btn hud-btn-red');

        // Tooltip einbinden
        Menu.toolTippBox(i18n['Menu']['Negotiation']['Title'], '<em id="negotiation-closed" class="tooltip-error">' + i18n['Menu']['Negotiation']['Warning'] + '<br></em>' + i18n['Menu']['Negotiation']['Desc'], 'negotationBtn');

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
	 * @constructor
	 */
	Unit_Btn: ()=> {
		let btn_UnitBG = $('<div />').attr('id', 'unitBtn').addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		Menu.toolTippBox(i18n['Menu']['Unit']['Title'], '<em id="unit-closed" class="tooltip-error">' + i18n['Menu']['Unit']['Warning'] + '<br></em>' + i18n['Menu']['Unit']['Desc'], 'unitBtn');

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
	 * @constructor
	 */
	Setting_Btn: ()=> {

		let btn = $('<div />').attr('id', 'SettingBtn').addClass('hud-btn');

		Menu.toolTippBox(i18n['Menu']['Settings']['Title'], i18n['Menu']['Settings']['Desc'], 'SettingBtn');

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
	 * @constructor
	 */
	Ask_Btn: ()=> {

		let btn = $('<div />').attr('id', 'AskBtn').addClass('hud-btn');

		Menu.toolTippBox(i18n['Menu']['Ask']['Title'], i18n['Menu']['Ask']['Desc'], 'AskBtn');

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
	 * @constructor
	 */
	Forum_Btn: ()=> {

		let btn = $('<div />').attr('id', 'ForumBtn').addClass('hud-btn');

		Menu.toolTippBox(i18n['Menu']['Forum']['Title'], i18n['Menu']['Forum']['Desc'], 'ForumBtn');

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
	 * @constructor
	 */
	Bug_Btn: ()=> {

		let btn = $('<div />').attr('id', 'BugBtn').addClass('hud-btn');

		Menu.toolTippBox(i18n['Menu']['Bugs']['Title'], i18n['Menu']['Bugs']['Desc'], 'BugBtn');

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
	 * @constructor
	 */
	Info_Btn: ()=> {

		let btn_Info = $('<div />').attr('id', 'InfoBox').addClass('hud-btn');

		// Tooltip einbinden
		Menu.toolTippBox(i18n['Menu']['Info']['Title'], i18n['Menu']['Info']['Desc'], 'InfoBox');

		let btn_Inf = $('<span />');

		btn_Inf.on('click', function() {
			Infoboard.init();
		});

		btn_Info.append(btn_Inf);


		return btn_Info;
	}
};
