/*
 * **************************************************************************************
 *
 * Dateiname:                 _menu_right.js
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

let _menu_right = {

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
			_menu.ListLinks(_menu_right.InsertMenuItem);
			_menu_right.CheckButtons();

			// korrekten Platz für das Menu ermitteln
			_menu_right.SetMenuHeight();

			window.dispatchEvent(new CustomEvent('foe-helper#menu_loaded'));
		});


		// Wenn sie die Fenstergröße verändert, neu berechnen
		window.onresize = function (event) {
			_menu_right.SetMenuHeight(true);
		};
	},


	/**
	* Fügt ein MenüItem ein
	*
	* @param MenuItem
	*/
	InsertMenuItem: (MenuItem) => {
		$('#foe-helper-hud-slider').append(MenuItem);
    },


	/**
	 * Collective function
	 *
	 * @param reset
	 */
	SetMenuHeight: (reset = true) => {
		// Höhe ermitteln und setzten
		_menu_right.Prepare();

		if (reset) {
			// Slider nach oben resetten
			$('#foe-helper-hud-slider').css({
				'top': '0'
			});

			_menu.MenuScrollTop = 0;
			_menu.ActiveSlide = 1;

			$('.hud-btn-up').removeClass('hud-btn-up-active');

			if (_menu.SlideParts > 1) {
				$('.hud-btn-down').addClass('hud-btn-down-active');
			}
			else { //Gesamtes Menü passt auf 1 Seite => Kein Scrollbutton nach unten
				$('.hud-btn-down').removeClass('hud-btn-down-active');	
			}
		}
	},


	/**
	 * Determines the window height and determines the appropriate height
	 *
	 */
	Prepare: () => {
		let MenuItemCount = $("#foe-helper-hud-slider").children().length;

		_menu.HudCount = Math.floor((($(window).outerHeight() - 50) - $('#foe-helper-hud').offset().top) / 55);
		_menu.HudCount = Math.min(_menu.HudCount, MenuItemCount);

		// hat der Spieler eine Länge vorgebeben?
		let MenuLength = localStorage.getItem('MenuLength');

		if (MenuLength !== null && MenuLength < _menu.HudCount) {
			_menu.HudCount = _menu.HudLength = parseInt(MenuLength);
		}

		_menu.HudHeight = (_menu.HudCount * 55);
		_menu.SlideParts = Math.ceil(MenuItemCount / _menu.HudCount);

		$('#foe-helper-hud').height(_menu.HudHeight + 2);
		$('#foe-helper-hud-wrapper').height(_menu.HudHeight);
	},


	/**
	 * Make panel scrollable
	 */
	CheckButtons: () => {

		let activeIdx = 0;


		$('.hud-btn').click(function () {
			activeIdx = $(this).index('.hud-btn');
		});


		// Klick auf Pfeil nach unten
		$('body').on('click', '.hud-btn-down-active', function () {
			_menu_right.ClickButtonDown();
		});


		// Klick auf Pfeil nach oben
		$('body').on('click', '.hud-btn-up-active', function () {
			_menu_right.ClickButtonUp();
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
			distance: 15,
			start: function () {
				$('#foe-helper-hud').addClass('is--sorting');
			},
			sort: function () {

				$('.is--sorting .hud-btn-up-active').mouseenter(function (e) {
					$('.hud-btn-up-active').stop().addClass('hasFocus');

					setTimeout(() => {
						if ($('.is--sorting .hud-btn-up-active').hasClass('hasFocus')) {
							_menu_right.ClickButtonUp();
						}
					}, 1000);

				}).mouseleave(function () {
					$('.is--sorting .hud-btn-up-active').removeClass('hasFocus');
				});

				$('.is--sorting .hud-btn-down-active').mouseenter(function (e) {
					$('.is--sorting .hud-btn-down-active').stop().addClass('hasFocus');

					setTimeout(() => {
						if ($('.is--sorting .hud-btn-down-active').hasClass('hasFocus')) {
							_menu_right.ClickButtonDown();
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
	 * Click function
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
	 * Click function
	 */
	ClickButtonUp: () => {
		$('.hud-btn-up').removeClass('hasFocus');

		_menu.ActiveSlide--;
		_menu.MenuScrollTop += _menu.HudHeight;

		$('#foe-helper-hud-slider').css({
			'top': _menu.MenuScrollTop + 'px'
		});

		if (_menu.ActiveSlide === 1){
			$('.hud-btn-up').removeClass('hud-btn-up-active');
		}

		if (_menu.ActiveSlide < _menu.SlideParts){
			$('.hud-btn-down').addClass('hud-btn-down-active');

		} else if (_menu.ActiveSlide === _menu.SlideParts){
			$('.hud-btn-down').removeClass('hud-btn-down-active');
		}
	},
};
