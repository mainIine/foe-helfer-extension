/*
 * **************************************************************************************
 *
 * Dateiname:                 menu.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       28.05.19 09:22 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

Menu = {

	isBottom: false,
	ToolTippCount: 0,
	ToolTippTop: 0,

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
			btnDown = $('<span />').addClass('hud-btn-down');

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
		 * Live-Chat
		 */
		// hudSlider.append( Menu.Chat_Btn() );


		/**
		 * FP - Berechnen
		 */
		hudSlider.append( Menu.getFP_Btn() );


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
		hudSlider.append( Menu.Bug_Btn() )


		// hudSlider.append( Menu.BH_Btn() );


		Menu.CheckButtons();
	},


	/**
	 * Panel scrollbar machen
	 *
	 * @constructor
	 */
	CheckButtons: ()=>{

		if( $("#ant-hud-slider").children().length > 4){
			$('.hud-btn-down').addClass('hud-btn-down-active');

			$('body').on('click', '.hud-btn-down-active', function(){
				$('#ant-hud-slider').css({
					'top':'-220px'
				});

				$('.hud-btn-down').removeClass('hud-btn-down-active');

				$('.hud-btn-up').addClass('hud-btn-up-active');
			});

			$('body').on('click', '.hud-btn-up-active', function(){
				$('#ant-hud-slider').css({
					'top':'0px'
				});

				$('.hud-btn-up').removeClass('hud-btn-up-active');

				$('.hud-btn-down').addClass('hud-btn-down-active');
			});
		}


		$('.hud-btn').hover(function() {
			let id = $(this).attr('id'),
				pos = $(this).position();

			$('[data-btn="' + id + '"]').show();

		}, function() {
			let id = $(this).attr('id');

			$('[data-btn="' + id + '"]').hide();
		});
	},


	/**
	 * FP Gesamtanzahl Button
	 *
	 * @returns {*|jQuery}
	 */
	getFP_Btn: ()=> {
		let btn_FPsBG = $('<div />').attr('id', 'getFPs').addClass('hud-btn');

		// Tooltip einbinden
		Menu.toolTippBox('FP Produktion', 'Zeigt die derzeitige Anzahl aller sammelbaren FPs an.', 'getFPs');


		let btn_FPs = $('<span />');

		btn_FPs.bind('click', function(){
			StrategyPoints.init();
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

		localStorage.removeItem('OtherActiveBuilding');

		let btn_CalcBG = $('<div />').attr('id', 'calcFPs').addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		Menu.toolTippBox('Kostenrechner', '<em id="calcFPs-closed" class="tooltip-error">Deaktiviert: Öffne zuerst das LG eines anderen Spielers!<br></em>Rechnet für dich alle Plätze aus', 'calcFPs');

		let btn_Calc = $('<span />');

		btn_Calc.bind('click', function() {
			let b = localStorage.getItem('OtherActiveBuilding'),
				d = localStorage.getItem('OtherActiveBuildingData');

			if(b !== null){
				Calculator.Show( JSON.parse(b), JSON.parse(d));
			}
		});

		btn_CalcBG.append(btn_Calc);

		return btn_CalcBG;
	},


	/**
	 * Eigenanteilsrechner Button
	 *
	 * @returns {*|jQuery}
	 */
	ownFP_Btn: ()=> {

		let btn_OwnBG = $('<div />').attr('id', 'ownFPs').addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		Menu.toolTippBox('Eigenanteilsrechner', '<em id="ownFPs-closed" class="tooltip-error">Deaktiviert: Öffne zuerst eines deiner LGs!<br></em>Zahlplan erstellen und kopieren', 'ownFPs');

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
	 * Eigenanteilsrechner Button
	 *
	 * @returns {*|jQuery}
	 */
	Chat_Btn: ()=> {

		let btn = $('<div />').attr('id', 'ChatBtn').addClass('hud-btn');

		// Tooltip einbinden
		Menu.toolTippBox('Gilden Live-Chat', 'In Echtzeit mit allen quatschen', 'ChatBtn');

		let btn_sp = $('<span />');

		btn_sp.on('click', function() {
			chrome.runtime.sendMessage(extID, {type: 'chat'});
		});

		btn.append(btn_sp);


		return btn;
	},



	/**
	 * Einstellungen
	 *
	 * @constructor
	 */
	Setting_Btn: ()=> {

		let btn = $('<div />').attr('id', 'SettingBtn').addClass('hud-btn');

		Menu.toolTippBox('Einstellungen', 'Hier stellst du ein paar Kleinigkeiten ein', 'SettingBtn');

		let btn_Set = $('<span />');

		btn_Set.on('click', function() {
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

		Menu.toolTippBox('Frage / Antwort', 'Du weißt nicht wie etwas funktioniert?<br>Schau nach!', 'AskBtn');

		let btn_Ask = $('<span />');

		btn_Ask.on('click', function() {
			let win = window.open('https://foe-rechner.de/extension/index', '_blank');
			win.focus();
		});

		btn.append(btn_Ask);

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

		Menu.toolTippBox('Fehler / Wünsche', 'Etwas geht nicht wie es soll oder du hast eine Idee?', 'BugBtn');

		let btn_Bug = $('<span />');

		btn_Bug.on('click', function() {
			let win = window.open('https://github.com/dsiekiera/foe-helfer-extension/issues', '_blank');
			win.focus();
		});

		btn.append(btn_Bug);

		return btn;
	},


	BH_Btn: ()=> {

		let btn_BHBG = $('<div />').attr('id', 'BHBox').addClass('hud-btn');

		// Tooltip einbinden
		Menu.toolTippBox('BlackHad Sniffer', 'Mal gucken was alles durch den Kanal geht...', 'BHBox');

		let btn_BH = $('<span />');

		btn_BH.on('click', function() {
			AntSocket.init();
		});

		btn_BHBG.append(btn_BH);


		return btn_BHBG;
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

		if(Menu.ToolTippCount % 5 === 0){
			Menu.ToolTippTop = 53;
		} else {
			Menu.ToolTippTop += 55;
		}

		let ToolTipp = $('<div />').addClass('toolTipWrapper').html(desc).attr('data-btn', id).css({'top'  : Menu.ToolTippTop + 'px'});

		ToolTipp.prepend( $('<div />').addClass('toolTipHeader').text(title) );

		$('#ant-hud').append( ToolTipp );
	},
};
