/*
 * **************************************************************************************
 *
 * Dateiname:                 _menu_bottom.js
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

let _menu_bottom = {

	btnSize: 45,

	/**
	 * Create the div holders and put them to the DOM
	 *
	 * @constructor
	 */

	BuildOverlayMenu: () => {

		let hud = $('<div />').attr('id', 'foe-helper-hud').addClass('game-cursor'),
			hudWrapper = $('<div />').attr('id', 'foe-helper-hud-wrapper'),
			hudInner = $('<div />').attr('id', 'foe-helper-hud-slider');

		hudWrapper.append(hudInner);


		let btnUp = $('<span />').addClass('hud-btn-left'),
			btnDown = $('<span />').addClass('hud-btn-right hud-btn-right-active');

		hud.append(btnUp);
		hud.append(hudWrapper)
		hud.append(btnDown);

		$('body').append(hud).promise().done(function(){

			// Buttons einfügen
			_menu_bottom.ListLinks();

			// korrekten Platz für das Menu ermitteln
			_menu_bottom.SetMenuWidth();

			window.dispatchEvent(new CustomEvent('foe-helper#menu_loaded'));
		});

		// Wenn sie die Fenstergröße verändert, neu berechnen
		window.onresize = function (event) {
			_menu_bottom.SetMenuWidth(true);
		};
	},


	/**
	 * Sammelfunktion
	 *
	 * @param reset
	 */
	SetMenuWidth: (reset = true) => {
		// Breite ermitteln und setzten
		_menu_bottom.Prepare();

		if (reset) {
			// Slider nach links resetten
			$('#foe-helper-hud-slider').css({ 
				left: 0
			});

			_menu.MenuScrollLeft = 0;
			_menu.ActiveSlide = 1;

			$('.hud-btn-left').removeClass('hud-btn-left-active');

			if (_menu.SlideParts > 1) {
				$('.hud-btn-right').addClass('hud-btn-right-active');
			}
			else { //Gesamtes Menü passt auf 1 Seite => Kein Scrollbutton nach unten
				$('.hud-btn-right').removeClass('hud-btn-right-active');
			}
		}
	},


	/**
	 * Ermittelt die Fensterhöhe und ermittelt die passende Höhe
	 *
	 */
	Prepare: () => {
		let MenuItemCount = $("#foe-helper-hud-slider").children().length;

		_menu.HudCount = Math.floor((($(window).outerWidth() - 50) - $('#foe-helper-hud').offset().left) / _menu_bottom.btnSize);
		_menu.HudCount = Math.min(_menu.HudCount, MenuItemCount);

		// hat der Spieler eine Länge vorgebeben?
		let MenuLength = localStorage.getItem('MenuLength');

		if (MenuLength !== null && MenuLength < _menu.HudCount)
		{
			_menu.HudCount = _menu.HudLength = parseInt(MenuLength);
		}

		_menu.HudWidth = (_menu.HudCount * _menu_bottom.btnSize);
		_menu.SlideParts = Math.ceil(MenuItemCount / _menu.HudCount);

		$('#foe-helper-hud').width(_menu.HudWidth + 3);
		$('#foe-helper-hud-wrapper').width(_menu.HudWidth + 3);
		$('#foe-helper-hud-slider').width( ($("#foe-helper-hud-slider").children().length * _menu_bottom.btnSize));
	},


	/**
	 * Bindet alle benötigten Button ein
	 *
	 */
	ListLinks: () => {
		let hudSlider = $('#foe-helper-hud-slider'),
			StorgedItems = localStorage.getItem('MenuSort');

		// Beta-Funktionen
		if (HelperBeta.active) {
			_menu.Items.unshift(...HelperBeta.menu);
		}

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

		// Beta-Funktionen rausfiltern
		_menu.Items = _menu.Items.filter(e => {
			if (HelperBeta.active) return true;
			if (HelperBeta.menu.includes(e)) return false;
			return true;
		});

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

		_menu.Items = _menu.Items.filter(e => e);
		_menu_bottom.CheckButtons();
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
		$('body').on('click', '.hud-btn-right-active', function () {
			_menu_bottom.ClickButtonRight();
		});


		// Klick auf Pfeil nach oben
		$('body').on('click', '.hud-btn-left-active', function () {
			_menu_bottom.ClickButtonLeft();
		});


		// Tooltipp top ermitteln und einblenden
		$('.hud-btn').stop().hover(function(){
			let $this = $(this),
				id = $this.attr('id'),
				x = ($this.offset().left + 30);

			$('[data-btn="' + id + '"]').css({ left: x + 'px' }).show();

		}, function(){
			let id = $(this).attr('id');

			$('[data-btn="' + id + '"]').hide();
		});

		// Sortierfunktion der Menü-items
		$('#foe-helper-hud-slider').sortable({
			placeholder: 'menu-placeholder',
			axis: 'x',
			distance: 15,
			start: function () {
				$('#foe-helper-hud').addClass('is--sorting');
			},
			sort: function () {

				$('.is--sorting .hud-btn-left-active').mouseenter(function (e) {
					$('.hud-btn-left-active').stop().addClass('hasFocus');

					setTimeout(() => {
						if ($('.is--sorting .hud-btn-left-active').hasClass('hasFocus')) {
							_menu_bottom.ClickButtonLeft();
						}
					}, 1000);

				}).mouseleave(function () {
					$('.is--sorting .hud-btn-left-active').removeClass('hasFocus');
				});

				$('.is--sorting .hud-btn-right-active').mouseenter(function (e) {
					$('.is--sorting .hud-btn-right-active').stop().addClass('hasFocus');

					setTimeout(() => {
						if ($('.is--sorting .hud-btn-right-active').hasClass('hasFocus')) {
							_menu_bottom.ClickButtonRight();
						}
					}, 1000);

				}).mouseleave(function () {
					$('.is--sorting .hud-btn-right-active').removeClass('hasFocus');
				});
			},
			stop: function () {
				// Sortierung zwischenspeichern
				let storedItems = _menu.Items;
				_menu.Items = [];

				$('.hud-btn').each(function () {
					_menu.Items.push($(this).data('slug'));
				});

				localStorage.setItem('MenuSort', JSON.stringify(_menu.Items));

				$('#foe-helper-hud').removeClass('is--sorting');
				if (_menu.equalTo(storedItems)) return;

				HTML.ShowToastMsg({
					show: 'force',
					head: i18n('Menu.SaveMessage.Title'),
					text: i18n('Menu.SaveMessage.Desc'),
					type: 'success',
					hideAfter: 5000
				});
			}
		});

		HiddenRewards.SetCounter();
	},

	/**
	 * Klick Funktion
	 */
	ClickButtonRight: () => {
		$('.hud-btn-right').removeClass('hasFocus');

		_menu.ActiveSlide++;
		_menu.MenuScrollLeft -= _menu.HudWidth;

		$('#foe-helper-hud-slider').css({
			left: _menu.MenuScrollLeft + 'px'
		});

		if (_menu.ActiveSlide > 1) {
			$('.hud-btn-left').addClass('hud-btn-left-active');
		}

		if (_menu.ActiveSlide === _menu.SlideParts) {
			$('.hud-btn-right').removeClass('hud-btn-right-active');

		} else if (_menu.ActiveSlide < _menu.SlideParts) {
			$('.hud-btn-right').addClass('hud-btn-right-active');
		}
	},

	/**
	 * Klick Funktion
	 */
	ClickButtonLeft: () => {
		$('.hud-btn-left').removeClass('hasFocus');

		_menu.ActiveSlide--;
		_menu.MenuScrollLeft += _menu.HudWidth;

		$('#foe-helper-hud-slider').css({
			left: _menu.MenuScrollLeft + 'px'
		});

		if (_menu.ActiveSlide === 1){
			$('.hud-btn-left').removeClass('hud-btn-left-active');
		}

		if (_menu.ActiveSlide < _menu.SlideParts){
			$('.hud-btn-right').addClass('hud-btn-right-active');

		} else if (_menu.ActiveSlide === _menu.SlideParts){
			$('.hud-btn-right').removeClass('hud-btn-right-active');
		}
	},
};
