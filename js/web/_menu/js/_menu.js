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
	HudLength: 0,
	HudHeight: 0,

	Items : [
		'hiddenRewards',
		'calculator',
		'partCalc',
		'outpost',
		'productions',
		'negotiation',
		'infobox',
		'questlist',
		'technologies',
		'campagneMap',
		'citymap',
		'unit',
		'settings',
		'forum',
		'ask',
		'github',
		// 'chat'
	],


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
			_menu.SetMenuHeight(true);
		};
	},


	/**
	 * Sammelfunktion
	 *
	 * @param reset
	 */
	SetMenuHeight: (reset = true)=> {
		// Höhe ermitteln und setzten
		_menu.Prepare();

		if(reset){
			// Slider nach oben resetten
			$('#ant-hud-slider').css({
				'top': '0'
			});

			_menu.MenuScrollTop = 0;
			_menu.ActiveSlide = 1;

			$('.hud-btn-up').removeClass('hud-btn-up-active');
			$('.hud-btn-down').addClass('hud-btn-down-active');
		}
	},


	/**
	 * Ermittelt die Fensterhöhe und ermittelt die passende Höhe
	 *
	 */
	Prepare: ()=> {

		_menu.HudCount = Math.floor( (( $(window).outerHeight() - 50 ) - $('#ant-hud').offset().top) / 55 );

		// hat der Spieler eine LÄnge vorgebeben?
		let MenuLength = localStorage.getItem('MenuLength');

		if(MenuLength !== null && MenuLength < _menu.HudCount){
			_menu.HudCount = _menu.HudLength = parseInt(MenuLength);
		}

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
		let hudSlider = $('#ant-hud-slider'),
			StorgedItems = localStorage.getItem('MenuSort');

		if(StorgedItems !== null){
			let storedItems = JSON.parse(StorgedItems);

			// es ist kein neues Item hinzugekommen
			if(_menu.Items.length === storedItems.length) {
				_menu.Items = JSON.parse(StorgedItems);
			}

			// ermitteln in welchem Array was fehlt...
			else {
				let missingMenu = storedItems.filter(function(sI){
					return !_menu.Items.some(function(mI) {
						return sI === mI;
					});
				});

				let missingStored = _menu.Items.filter(function(mI){
					return !storedItems.some(function(sI) {
						return sI === mI;
					});
				});

				let items = missingMenu.concat(missingStored);

				// es gibt tatsächlich was neues...
				if( items.length > 0 ){
					for(let i in items){
						if(!items.hasOwnProperty(i)){
							break;
						}

						// ... neues kommt vorne dran ;-)
						_menu.Items.unshift(items[i]);
					}
				}
			}
		}

		// Dubletten rausfiltern
		function unique(arr) {
			return arr.filter(function (value, index, self) {
				return self.indexOf(value) === index;
			});
		};

		_menu.Items = unique(_menu.Items);

		// Menüpunkte einbinden
		for(let i in _menu.Items){
			if(!_menu.Items.hasOwnProperty(i)){
				break;
			}

			const name = _menu.Items[i] + '_Btn';

			// gibt es eine Funktion?
			if( _menu[name] !== undefined){
				hudSlider.append( _menu[name]() );
			}
		}

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
			_menu.ClickButtonDown();
		});


		// Klick auf Pfeil nach oben
		$('body').on('click', '.hud-btn-up-active', function(){
			_menu.ClickButtonUp();
		});


		// Tooltipp top ermitteln und einblenden
		$('.hud-btn').stop().hover(function() {
			let $this = $(this),
				id = $this.attr('id'),
				y = ($this.offset().top +30);

			$('[data-btn="' + id + '"]').css({'top': y +'px'}).show();

		}, function() {
			let id = $(this).attr('id');

			$('[data-btn="' + id + '"]').hide();
		});

		// Sortierfunktion der Menü-items
		$('#ant-hud-slider').sortable({
			placeholder: 'menu-placeholder',
			axis: 'y',
			start: function(){
				$('#ant-hud').addClass('is--sorting');
			},
			sort: function(){

				$('.is--sorting .hud-btn-up-active').mouseenter(function(e) {
					$('.hud-btn-up-active').stop().addClass('hasFocus');

					setTimeout(()=>{
						if($('.is--sorting .hud-btn-up-active').hasClass('hasFocus')) {
							_menu.ClickButtonUp();
						}
					}, 1000);

				}).mouseleave(function() {
					$('.is--sorting .hud-btn-up-active').removeClass('hasFocus');
				});

				$('.is--sorting .hud-btn-down-active').mouseenter(function(e) {
					$('.is--sorting .hud-btn-down-active').stop().addClass('hasFocus');

					setTimeout(()=>{
						if($('.is--sorting .hud-btn-down-active').hasClass('hasFocus')) {
							_menu.ClickButtonDown();
						}
					}, 1000);

				}).mouseleave(function() {
					$('.is--sorting .hud-btn-down-active').removeClass('hasFocus');
				});
			},
			stop: function(){
				_menu.Items = [];

				$('.hud-btn').each(function(){
					_menu.Items.push( $(this).data('slug') );
				});

				localStorage.setItem('MenuSort', JSON.stringify(_menu.Items));

				$('#ant-hud').removeClass('is--sorting');
			}
		});
	},


	/**
	 * Klick Funktion
	 */
	ClickButtonDown: ()=>{
		$('.hud-btn-down').removeClass('hasFocus');

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
	},


	/**
	 * Klick Funktion
	 */
	ClickButtonUp: ()=> {
		$('.hud-btn-up').removeClass('hasFocus');

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

		$('body').append( ToolTipp );
	},

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Kostenrechner Button
	 *
	 * @returns {*|jQuery}
	 */
	calculator_Btn: ()=> {
        sessionStorage.removeItem('OtherActiveBuilding');
        sessionStorage.removeItem('OtherActiveBuildingData');
        sessionStorage.removeItem('OtherActiveBuildingOverview');

		let btn_CalcBG = $('<div />').attr({'id': 'calculator-Btn', 'data-slug': 'calculator'}).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['Calculator']['Title'], '<em id="calculator-Btn-closed" class="tooltip-error">' + i18n['Menu']['Calculator']['Warning'] +  '<br></em>' + i18n['Menu']['Calculator']['Desc'], 'calculator-Btn');

		let btn_Calc = $('<span />');

		btn_Calc.bind('click', function() {
			Calculator.Open();
		});

		btn_CalcBG.append(btn_Calc);

		return btn_CalcBG;
	},

	/**
	 * Eigenanteilsrechner Button
	 *
	 * @returns {*|jQuery}
	 */
	partCalc_Btn: () => {
        localStorage.removeItem('OwnCurrentBuildingCity');
        localStorage.removeItem('OwnCurrentBuildingGreat');

		let btn_OwnBG = $('<div />').attr({'id': 'partCalc-Btn', 'data-slug': 'partCalc'}).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['OwnpartCalculator']['Title'], '<em id="partCalc-Btn-closed" class="tooltip-error">' + i18n['Menu']['OwnpartCalculator']['Warning'] +  '<br></em>' + i18n['Menu']['OwnpartCalculator']['Desc'], 'partCalc-Btn');

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
	 * Outpost Button
	 *
	 * @returns {*|jQuery}
	 */
	outpost_Btn: ()=> {

		let btn_outPBG = $('<div />').attr({'id': 'outpost-Btn', 'data-slug': 'outpost'}).addClass('hud-btn'),
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
		_menu.toolTippBox(i18n['Menu']['OutP']['Title'], desc, 'outpost-Btn');

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
	 * FP Gesamtanzahl Button
	 *
	 * @returns {*|jQuery}
	 */
	productions_Btn: ()=> {
		let btn_FPsBG = $('<div />').attr({'id': 'productions-Btn', 'data-slug': 'productions'}).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['Productions']['Title'], i18n['Menu']['Productions']['Desc'], 'productions-Btn');


		let btn_FPs = $('<span />');

		btn_FPs.bind('click', function(){
			Productions.init();
		});

		btn_FPsBG.append(btn_FPs);

		return btn_FPsBG;
	},

	/**
	 * Negotiation
	 *
	 * @returns {*|jQuery}
	 */
	negotiation_Btn: () => {
		let btn_NegotiationBG = $('<div />').attr({'id': 'negotiation-Btn', 'data-slug': 'negotiation'}).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['Negotiation']['Title'], '<em id="negotiation-Btn-closed" class="tooltip-error">' + i18n['Menu']['Negotiation']['Warning'] + '<br></em>' + i18n['Menu']['Negotiation']['Desc'], 'negotiation-Btn');

		let btn_Negotiation = $('<span />');

		btn_Negotiation.bind('click', function () {
			if( $('#negotiation-Btn').hasClass('hud-btn-red') === false) {
				Negotiation.Show();
			}
		});

		btn_NegotiationBG.append(btn_Negotiation);

		return btn_NegotiationBG;
	},

	/**
	 * InfoBox für den Hintergrund "Verkehr"
	 *
	 * @returns {*|jQuery}
	 */
	infobox_Btn: ()=> {

		let btn_Info = $('<div />').attr({'id': 'infobox-Btn', 'data-slug': 'infobox'}).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['Info']['Title'], i18n['Menu']['Info']['Desc'], 'infobox-Btn');

		let btn_Inf = $('<span />');

		btn_Inf.on('click', function() {
			Infoboard.init();
		});

		btn_Info.append(btn_Inf);


		return btn_Info;
	},

	/**
	 * Technologien
	 *
	 * @returns {*|jQuery}
	 */
	technologies_Btn: ()=> {
        let btn_TechBG = $('<div />').attr({'id': 'technologies-Btn', 'data-slug': 'technologies'}).addClass('hud-btn hud-btn-red');

        // Tooltip einbinden

        _menu.toolTippBox(i18n['Menu']['Technologies']['Title'], '<em id="technologies-Btn-closed" class="tooltip-error">' + i18n['Menu']['Technologies']['Warning'] + '<br></em>' + i18n['Menu']['Technologies']['Desc'], 'technologies-Btn');

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
	campagneMap_Btn: ()=> {
        let btn_MapBG = $('<div />').attr({'id': 'campagneMap-Btn', 'data-slug': 'campagneMap'}).addClass('hud-btn hud-btn-red');

        // Tooltip einbinden
        _menu.toolTippBox(i18n['Menu']['Campagne']['Title'], '<em id="campagneMap-Btn-closed" class="tooltip-error">' + i18n['Menu']['Campagne']['Warning'] + '<br></em>' + i18n['Menu']['Campagne']['Desc'], 'campagneMap-Btn');

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
	 * citymap
	 *
	 * @returns {*|jQuery}
	 */
	citymap_Btn: ()=> {
        let btn_CityBG = $('<div />').attr({'id': 'citymap-Btn', 'data-slug': 'citymap'}).addClass('hud-btn');

        // Tooltip einbinden
        _menu.toolTippBox(i18n['Menu']['Citymap']['Title'], i18n['Menu']['Citymap']['Desc'], 'citymap-Btn');

        let btn_City = $('<span />');

		btn_City.on('click', function () {
            CityMap.init();
        });

		btn_CityBG.append(btn_City);

        return btn_CityBG;
    },

	/**
	 * QuestList
	 *
	 * @returns {*|jQuery}
	 */
	questlist_Btn: ()=> {
        let btn_EventBG = $('<div />').attr({'id': 'questlist_Btn', 'data-slug': 'questlist'}).addClass('hud-btn');

        // Tooltip einbinden
        _menu.toolTippBox(i18n['Menu']['Event']['Title'], i18n['Menu']['Event']['Desc'], 'questlist_Btn');

        let btn_Event = $('<span />');

        btn_Event.on('click', function () {
			EventQuest.Visible = true;
            EventQuest.Show();
			EventQuest.Visible = false;
        });

        btn_EventBG.append(btn_Event);

        return btn_EventBG;
    },

	hiddenRewards_Btn: ()=> {
		let btn_RewardsBG = $('<div />').attr({'id': 'hiddenRewards-Btn', 'data-slug': 'hiddenRewards'}).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['HiddenRewards']['Title'], i18n['Menu']['HiddenRewards']['Desc'], 'hiddenRewards-Btn');

		let btn_Rewards = $('<span />');

		btn_Rewards.on('click', function () {
			HiddenRewards.init();
		})

		btn_RewardsBG.append(btn_Rewards);

		return btn_RewardsBG;
	},

	/**
	 * Armeen
	 * @returns {*|jQuery}
	 */
	unit_Btn: ()=> {
		let btn_UnitBG = $('<div />').attr({'id': 'unit-Btn', 'data-slug': 'unit'}).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['Unit']['Title'], '<em id="unit-Btn-closed" class="tooltip-error">' + i18n['Menu']['Unit']['Warning'] + '<br></em>' + i18n['Menu']['Unit']['Desc'], 'unit-Btn');

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
	settings_Btn: ()=> {

		let btn = $('<div />').attr({'id': 'settings-Btn', 'data-slug': 'settings'}).addClass('hud-btn');

		_menu.toolTippBox(i18n['Menu']['Settings']['Title'], i18n['Menu']['Settings']['Desc'], 'settings-Btn');

		let btn_Set = $('<span />');

		btn_Set.on('click', function(){
			Settings.init();
		});

		btn.append(btn_Set);

		return btn;
	},

	/**
	 * Forum
	 *
	 * @returns {*|jQuery}
	 */
	forum_Btn: ()=> {

		let btn = $('<div />').attr({'id': 'forum-Btn', 'data-slug': 'forum'}).addClass('hud-btn');

		_menu.toolTippBox(i18n['Menu']['Forum']['Title'], i18n['Menu']['Forum']['Desc'], 'forum-Btn');

		let btn_Forum = $('<span />');

		btn_Forum.on('click', function() {
			let win = window.open('https://forum.foe-rechner.de', '_blank');
			win.focus();
		});

		btn.append(btn_Forum);

		return btn;
	},

	/**
	 * Frage/Antwort
	 *
	 * @returns {*|jQuery}
	 */
	ask_Btn: ()=> {

		let btn = $('<div />').attr({'id': 'ask-Btn', 'data-slug': 'ask'}).addClass('hud-btn');

		_menu.toolTippBox(i18n['Menu']['Ask']['Title'], i18n['Menu']['Ask']['Desc'], 'ask-Btn');

		let btn_Ask = $('<span />');

		btn_Ask.on('click', function() {
			let win = window.open('https://foe-rechner.de/extension/index', '_blank');
			win.focus();
		});

		btn.append(btn_Ask);

		return btn;
	},

	/**
	 * Github-Link
	 *
	 * @returns {*|jQuery}
	 */
	github_Btn: ()=> {

		let btn = $('<div />').attr({'id': 'github-Btn', 'data-slug': 'github'}).addClass('hud-btn');

		_menu.toolTippBox(i18n['Menu']['Bugs']['Title'], i18n['Menu']['Bugs']['Desc'], 'github-Btn');

		let btn_Bug = $('<span />');

		btn_Bug.on('click', function() {
			let win = window.open('https://github.com/dsiekiera/foe-helfer-extension/issues', '_blank');
			win.focus();
		});

		btn.append(btn_Bug);

		return btn;
	},

	/**
	 * Chat Button
	 *
	 * @returns {*|jQuery}
	 */
	chat_Btn: ()=> {

		let btn = $('<div />').attr({'id': 'chat-Btn', 'data-slug': 'chat'}).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n['Menu']['Chat']['Title'], i18n['Menu']['Chat']['Desc'], 'chat-Btn');

		let btn_sp = $('<span />');

		btn_sp.on('click', function() {
			MainParser.sendExtMessage({type: 'chat', player: ExtPlayerID, guild: ExtGuildID, world: ExtWorld});
		});

		btn.append(btn_sp);


		return btn;
	},
};
