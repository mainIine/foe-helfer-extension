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

	Items: [
		'calculator',
		'partCalc',
		'outpost',
		'productions',
		'hiddenRewards',
		'negotiation',
		'infobox',
		'notice',
		'technologies',
		'campagneMap',
		'citymap',
		'unit',
		'settings',
		'stats',
		'chat',
		'kits',
		'alerts',
		'greatbuildings',
	],


	/**
	 *
	 */
	BuildOverlayMenu: () => {

		let hud = $('<div />').attr('id', 'foe-helper-hud').addClass('game-cursor'),
			hudWrapper = $('<div />').attr('id', 'foe-helper-hud-wrapper'),
			hudInner = $('<div />').attr('id', 'foe-helper-hud-slider');

		hudWrapper.append(hudInner);


		let btnUp = $('<span />').addClass('hud-btn-up'),
			btnDown = $('<span />').addClass('hud-btn-down hud-btn-down-active');

		hud.append(btnUp);
		hud.append(hudWrapper)
		hud.append(btnDown);

		$('body').append(hud).ready(function () {

			// Buttons einfügen
			_menu.ListLinks();

			// korrekten Platz für das Menu ermitteln
			_menu.SetMenuHeight();
		});

		window.dispatchEvent(new CustomEvent('foe-helper#menu_loaded'));

		// Wenn sie die Fenstergröße verändert, neu berechnen
		window.onresize = function (event) {
			_menu.SetMenuHeight(true);
		};
	},


	/**
	 * Sammelfunktion
	 *
	 * @param reset
	 */
	SetMenuHeight: (reset = true) => {
		// Höhe ermitteln und setzten
		_menu.Prepare();

		if (reset) {
			// Slider nach oben resetten
			$('#foe-helper-hud-slider').css({
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
	Prepare: () => {

		_menu.HudCount = Math.floor((($(window).outerHeight() - 50) - $('#foe-helper-hud').offset().top) / 55);

		// hat der Spieler eine Länge vorgebeben?
		let MenuLength = localStorage.getItem('MenuLength');

		if (MenuLength !== null && MenuLength < _menu.HudCount) {
			_menu.HudCount = _menu.HudLength = parseInt(MenuLength);
		}

		_menu.HudHeight = (_menu.HudCount * 55);
		_menu.SlideParts = Math.ceil($("#foe-helper-hud-slider").children().length / _menu.HudCount);

		$('#foe-helper-hud').height(_menu.HudHeight + 2);
		$('#foe-helper-hud-wrapper').height(_menu.HudHeight);
	},


	/**
	 * Bindet alle benötigten Button ein
	 *
	 */
	ListLinks: () => {
		let hudSlider = $('#foe-helper-hud-slider'),
			StorgedItems = localStorage.getItem('MenuSort');

		if (StorgedItems !== null) {
			let storedItems = JSON.parse(StorgedItems);

			// es ist kein neues Item hinzugekommen
			if (_menu.Items.length === storedItems.length) {
				_menu.Items = JSON.parse(StorgedItems);
			}

			// ermitteln in welchem Array was fehlt...
			else {
				let missingMenu = storedItems.filter(function (sI) {
					return !_menu.Items.some(function (mI) {
						return sI === mI;
					});
				});

				let missingStored = _menu.Items.filter(function (mI) {
					return !storedItems.some(function (sI) {
						return sI === mI;
					});
				});

				_menu.Items = JSON.parse(StorgedItems);

				let items = missingMenu.concat(missingStored);

				// es gibt tatsächlich was neues...
				if (items.length > 0) {
					for (let i in items) {
						if (!items.hasOwnProperty(i)) {
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
		}

		_menu.Items = unique(_menu.Items);

		// Menüpunkte einbinden
		for (let i in _menu.Items) {
			if (!_menu.Items.hasOwnProperty(i)) {
				break;
			}

			const name = _menu.Items[i] + '_Btn';

			// gibt es eine Funktion?
			if (_menu[name] !== undefined) {
				hudSlider.append(_menu[name]());
			}
		}

		_menu.CheckButtons();
	},


	/**
	 * Panel scrollbar machen
	 *
	 */
	CheckButtons: () => {

		let activeIdx = 0;


		$('.hud-btn').click(function () {
			activeIdx = $(this).index('.hud-btn');
		});


		// Klick auf Pfeil nach unten
		$('body').on('click', '.hud-btn-down-active', function () {
			_menu.ClickButtonDown();
		});


		// Klick auf Pfeil nach oben
		$('body').on('click', '.hud-btn-up-active', function () {
			_menu.ClickButtonUp();
		});


		// Tooltipp top ermitteln und einblenden
		$('.hud-btn').stop().hover(function () {
			let $this = $(this),
				id = $this.attr('id'),
				y = ($this.offset().top + 30);

			$('[data-btn="' + id + '"]').css({ 'top': y + 'px' }).show();

		}, function () {
			let id = $(this).attr('id');

			$('[data-btn="' + id + '"]').hide();
		});

		// Sortierfunktion der Menü-items
		$('#foe-helper-hud-slider').sortable({
			placeholder: 'menu-placeholder',
			axis: 'y',
			start: function () {
				$('#foe-helper-hud').addClass('is--sorting');
			},
			sort: function () {

				$('.is--sorting .hud-btn-up-active').mouseenter(function (e) {
					$('.hud-btn-up-active').stop().addClass('hasFocus');

					setTimeout(() => {
						if ($('.is--sorting .hud-btn-up-active').hasClass('hasFocus')) {
							_menu.ClickButtonUp();
						}
					}, 1000);

				}).mouseleave(function () {
					$('.is--sorting .hud-btn-up-active').removeClass('hasFocus');
				});

				$('.is--sorting .hud-btn-down-active').mouseenter(function (e) {
					$('.is--sorting .hud-btn-down-active').stop().addClass('hasFocus');

					setTimeout(() => {
						if ($('.is--sorting .hud-btn-down-active').hasClass('hasFocus')) {
							_menu.ClickButtonDown();
						}
					}, 1000);

				}).mouseleave(function () {
					$('.is--sorting .hud-btn-down-active').removeClass('hasFocus');
				});
			},
			stop: function () {
				_menu.Items = [];

				$('.hud-btn').each(function () {
					_menu.Items.push($(this).data('slug'));
				});

				localStorage.setItem('MenuSort', JSON.stringify(_menu.Items));

				$('#foe-helper-hud').removeClass('is--sorting');
			}
		});

		HiddenRewards.SetCounter();
	},


	/**
	 * Klick Funktion
	 */
	ClickButtonDown: () => {
		$('.hud-btn-down').removeClass('hasFocus');

		_menu.ActiveSlide++;
		_menu.MenuScrollTop -= _menu.HudHeight;

		$('#foe-helper-hud-slider').css({
			'top': _menu.MenuScrollTop + 'px'
		});

		if (_menu.ActiveSlide > 1) {
			$('.hud-btn-up').addClass('hud-btn-up-active');
		}

		if (_menu.ActiveSlide === _menu.SlideParts) {
			$('.hud-btn-down').removeClass('hud-btn-down-active');

		} else if (_menu.ActiveSlide < _menu.SlideParts) {
			$('.hud-btn-down').addClass('hud-btn-down-active');
		}
	},


	/**
	 * Klick Funktion
	 */
	ClickButtonUp: () => {
		$('.hud-btn-up').removeClass('hasFocus');

		_menu.ActiveSlide--;
		_menu.MenuScrollTop += _menu.HudHeight;

		$('#foe-helper-hud-slider').css({
			'top': _menu.MenuScrollTop + 'px'
		});

		if (_menu.ActiveSlide === 1) {
			$('.hud-btn-up').removeClass('hud-btn-up-active');
		}

		if (_menu.ActiveSlide < _menu.SlideParts) {
			$('.hud-btn-down').addClass('hud-btn-down-active');

		} else if (_menu.ActiveSlide === _menu.SlideParts) {
			$('.hud-btn-down').removeClass('hud-btn-down-active');
		}
	},

	/**
     * Versteckt ein Button. Der HUD Slider muss dafür schon befüllt sein
     *
     * @param d
     * @returns {{msg: string, type: string, class: string}}
     */
	HideButton: (buttonId) => {
		if ($('#foe-helper-hud-slider').has(`div#${buttonId}`).length > 0)
			$($('#foe-helper-hud-slider').children(`div#${buttonId}`)[0]).hide();

	},

	/**
	 * Zeigt ein versteckten Button wieder.
	 */
	ShowButton: (buttonId) => {
		if ($('#foe-helper-hud-slider').has(`div#${buttonId}`))
			$($('#foe-helper-hud-slider').children(`div#${buttonId}`)[0]).show();
	},

	/**
	 * Tooltip Box
	 *
	 * @param {string} title
	 * @param {string} desc
	 * @param {string} id
	 */
	toolTippBox: (title, desc, id) => {

		let ToolTipp = $('<div />').addClass('toolTipWrapper').html(desc).attr('data-btn', id);

		ToolTipp.prepend($('<div />').addClass('toolTipHeader').text(title));

		$('body').append(ToolTipp);
	},

	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Kostenrechner Button
	 *
	 * @returns {*|jQuery}
	 */
	calculator_Btn: () => {
		let btn_CalcBG = $('<div />').attr({ 'id': 'calculator-Btn', 'data-slug': 'calculator' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Calculator.Title'), '<em id="calculator-Btn-closed" class="tooltip-error">' + i18n('Menu.Calculator.Warning') + '<br></em>' + i18n('Menu.Calculator.Desc'), 'calculator-Btn');

		let btn_Calc = $('<span />');

		btn_Calc.bind('click', function () {
			if (Calculator.CityMapEntity) {
				Calculator.Show();
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
	partCalc_Btn: () => {
		let btn_OwnBG = $('<div />').attr({ 'id': 'partCalc-Btn', 'data-slug': 'partCalc' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.OwnpartCalculator.Title'), '<em id="partCalc-Btn-closed" class="tooltip-error">' + i18n('Menu.OwnpartCalculator.Warning') + '<br></em>' + i18n('Menu.OwnpartCalculator.Desc'), 'partCalc-Btn');

		let btn_Own = $('<span />');

		btn_Own.on('click', function () {
			// nur wenn es für diese Session ein LG gibt zünden
			if (Parts.CityMapEntity !== undefined && Parts.Rankings !== undefined) {
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
	outpost_Btn: () => {

		let btn_outPBG = $('<div />').attr({ 'id': 'outpost-Btn', 'data-slug': 'outpost' }).addClass('hud-btn'),
			desc = i18n('Menu.OutP.Desc');

		if (Outposts.OutpostData === null) {
			btn_outPBG.addClass('hud-btn-red');
			desc = i18n('Menu.OutP.DescWarningOutpostData');
		}
		if (localStorage.getItem('OutpostBuildings') === null) {
			btn_outPBG.addClass('hud-btn-red');
			desc = i18n('Menu.OutP.DescWarningBuildings');
		}

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.OutP.Title'), desc, 'outpost-Btn');

		let btn_outpost = $('<span />');

		btn_outpost.bind('click', function () {
			let OutpostBuildings = localStorage.getItem('OutpostBuildings');

			if (OutpostBuildings !== null) {
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
	productions_Btn: () => {
		let btn_FPsBG = $('<div />').attr({ 'id': 'productions-Btn', 'data-slug': 'productions' }).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Productions.Title'), i18n('Menu.Productions.Desc'), 'productions-Btn');


		let btn_FPs = $('<span />');

		btn_FPs.bind('click', function () {
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
		let btn_NegotiationBG = $('<div />').attr({ 'id': 'negotiation-Btn', 'data-slug': 'negotiation' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Negotiation.Title'), '<em id="negotiation-Btn-closed" class="tooltip-error">' + i18n('Menu.Negotiation.Warning') + '<br></em>' + i18n('Menu.Negotiation.Desc'), 'negotiation-Btn');

		let btn_Negotiation = $('<span />');

		btn_Negotiation.bind('click', function () {
			if ($('#negotiation-Btn').hasClass('hud-btn-red') === false) {
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
	infobox_Btn: () => {

		let btn_Info = $('<div />').attr({ 'id': 'infobox-Btn', 'data-slug': 'infobox' }).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Info.Title'), i18n('Menu.Info.Desc'), 'infobox-Btn');

		let btn_Inf = $('<span />');

		btn_Inf.on('click', function () {
			Infoboard.Show();
		});

		btn_Info.append(btn_Inf);


		return btn_Info;
	},

	/**
	 * Technologien
	 *
	 * @returns {*|jQuery}
	 */
	technologies_Btn: () => {
		let btn_TechBG = $('<div />').attr({ 'id': 'technologies-Btn', 'data-slug': 'technologies' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden

		_menu.toolTippBox(i18n('Menu.Technologies.Title'), '<em id="technologies-Btn-closed" class="tooltip-error">' + i18n('Menu.Technologies.Warning') + '<br></em>' + i18n('Menu.Technologies.Desc'), 'technologies-Btn');

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
	campagneMap_Btn: () => {
		let btn_MapBG = $('<div />').attr({ 'id': 'campagneMap-Btn', 'data-slug': 'campagneMap' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Campagne.Title'), '<em id="campagneMap-Btn-closed" class="tooltip-error">' + i18n('Menu.Campagne.Warning') + '<br></em>' + i18n('Menu.Campagne.Desc'), 'campagneMap-Btn');

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
	citymap_Btn: () => {
		let btn_CityBG = $('<div />').attr({ 'id': 'citymap-Btn', 'data-slug': 'citymap' }).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Citymap.Title'), i18n('Menu.Citymap.Desc'), 'citymap-Btn');

		let btn_City = $('<span />');

		btn_City.on('click', function () {
			CityMap.init();
		});

		btn_CityBG.append(btn_City);

		return btn_CityBG;
	},

	/**
	 * Evente in der Stadt und der Umgebung
	 *
	 * @returns {null|undefined|jQuery}
	 */
	hiddenRewards_Btn: () => {
		let btn_RewardsBG = $('<div />').attr({ 'id': 'hiddenRewards-Btn', 'data-slug': 'hiddenRewards' }).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.HiddenRewards.Title'), i18n('Menu.HiddenRewards.Desc'), 'hiddenRewards-Btn');

		let btn_Rewards = $('<span />');

		btn_Rewards.on('click', function () {
			HiddenRewards.init();
		})

		btn_RewardsBG.append(btn_Rewards, $('<span id="hidden-reward-count" class="hud-counter">0</span>'));

		return btn_RewardsBG;
	},

	/**
	 * Armeen
	 * @returns {*|jQuery}
	 */
	unit_Btn: () => {
		let btn_UnitBG = $('<div />').attr({ 'id': 'unit-Btn', 'data-slug': 'unit' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Unit.Title'), '<em id="unit-Btn-closed" class="tooltip-error">' + i18n('Menu.Unit.Warning') + '<br></em>' + i18n('Menu.Unit.Desc'), 'unit-Btn');

		let btn_Unit = $('<span />');

		btn_Unit.on('click', function () {
			if (Unit.Cache !== null) {
				Unit.Show();
			}
		});

		btn_UnitBG.append(btn_Unit);

		return btn_UnitBG;
	},

	/**
	 * Notice function
	 *
	 * @returns {null|undefined|jQuery|HTMLElement|void}
	 */
	notice_Btn: () => {
		let btn_NoticeBG = $('<div />').attr({ 'id': 'notice-Btn', 'data-slug': 'notice' }).addClass('hud-btn');

		_menu.toolTippBox(i18n('Menu.Notice.Title'), i18n('Menu.Notice.Desc'), 'notice-Btn');

		let btn_Notice = $('<span />');

		btn_Notice.on('click', function () {
			Notice.init();
		});

		btn_NoticeBG.append(btn_Notice);

		return btn_NoticeBG;
	},

	/**
	 * Einstellungen
	 *
	 */
	settings_Btn: () => {

		let btn = $('<div />').attr({ 'id': 'settings-Btn', 'data-slug': 'settings' }).addClass('hud-btn');

		_menu.toolTippBox(i18n('Menu.Settings.Title'), i18n('Menu.Settings.Desc'), 'settings-Btn');

		let btn_Set = $('<span />');

		btn_Set.on('click', function () {
			Settings.BuildBox();
		});

		btn.append(btn_Set);

		return btn;
	},

	/**
	 * Statistic
	 * @returns {*|jQuery}
	 */
	stats_Btn: () => {
		let btn_StatsBG = $('<div />').attr({ 'id': 'stats-Btn', 'data-slug': 'stats' }).addClass('hud-btn');

		_menu.toolTippBox(i18n('Menu.Stats.Title'), i18n('Menu.Stats.Desc'), 'stats-Btn');

		let btn_Stats = $('<span />');

		btn_Stats.on('click', function () {
			Stats.page = 1;
			Stats.filterByPlayerId = null;
			Stats.Show();
		});

		btn_StatsBG.append(btn_Stats);

		return btn_StatsBG;
	},

	/**
	 * Chat Button
	 *
	 * @returns {*|jQuery}
	 */
	/* @TODO chat_Btn: () => {

		let btn = $('<div />').attr({ 'id': 'chat-Btn', 'data-slug': 'chat' }).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Chat.Title'), i18n('Menu.Chat.Desc'), 'chat-Btn');

		let btn_sp = $('<span />');

		btn_sp.on('click', function () {
			MainParser.sendExtMessage({
				type: 'chat',
				player: ExtPlayerID,
				name: ExtPlayerName,
				guild: ExtGuildID,
				world: ExtWorld
			});
		});

		btn.append(btn_sp);

		return btn;
	},*/

	/**
	 * Set Übersicht
	 */
	kits_Btn: ()=> {

		let btn = $('<div />').attr({ 'id': 'kits-Btn', 'data-slug': 'kits' }).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Kits.Title'), i18n('Menu.Kits.Desc'), 'kits-Btn');

		let btn_sp = $('<span />');

		btn_sp.on('click', function(){
			Kits.BuildBox();
		});

		btn.append(btn_sp);

		return btn;
	},

	/**
	 * FP Produzierende LGs
	 */
	greatbuildings_Btn: () => {

		let btn = $('<div />').attr({ 'id': 'greatbuildings-Btn', 'data-slug': 'greatbuildings' }).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.greatbuildings.Title'), i18n('Menu.greatbuildings.Desc'), 'greatbuildings-Btn');

		let btn_sp = $('<span />');

		btn_sp.on('click', function () {
			GreatBuildings.Show();
		});

		btn.append(btn_sp);

		return btn;
	},

};
