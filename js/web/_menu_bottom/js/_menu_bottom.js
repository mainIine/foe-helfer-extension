/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
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

			// Insert buttons
			_menu.ListLinks(_menu_bottom.InsertMenuItem);
			_menu_bottom.CheckButtons();

			// Determine the correct place for the menu
			_menu_bottom.SetMenuWidth();

			window.dispatchEvent(new CustomEvent('foe-helper#menu_loaded'));
		});

		// If the window size changes, recalculate
		window.onresize = function (event) {
			_menu_bottom.SetMenuWidth(true);
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
	* Fügt ein MenüItem ein
	*
	* @param MenuItem
	*/
	InsertMenuItem: (MenuItem) => {
		$('#foe-helper-hud-slider').append(MenuItem);
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
		BlueGalaxy.SetCounter();
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
