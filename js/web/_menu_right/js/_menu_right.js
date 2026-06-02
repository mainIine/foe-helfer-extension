/*
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * Licensed under AGPL - see LICENSE.md for details.
 */

let _menu_right = {

	/**
	 *
	 */
	BuildOverlayMenu: () => {
		let hud = $('<div />').attr({'id': 'forgehammer-hud','class': 'hud-right'}).addClass('game-cursor'),
			hudWrapper = $('<div />').attr('id', 'forgehammer-hud-wrapper'),
			hudInner = $('<div />').attr('id', 'forgehammer-hud-slider');

		hudWrapper.append(hudInner);

		let btnUp = $('<span />').addClass('hud-btn-up'),
			btnDown = $('<span />').addClass('hud-btn-down hud-btn-down-active');

		hud.append(btnUp);
		hud.append(hudWrapper)
		hud.append(btnDown);

		window.onresize = function (event) {
			if (event.target == window) _menu_right.SetMenuHeight(true);
		};

		$('body').append(hud).ready(async function () {

			_menu.ListLinks(_menu_right.InsertMenuItem);
			await _menu_right.CheckButtons();

			_menu_right.SetMenuHeight();

			window.dispatchEvent(new CustomEvent('forgehammer#menu_loaded'));
		});

	},


	/**
	* Fügt ein MenüItem ein
	*
	* @param MenuItem
	*/
	InsertMenuItem: (MenuItem) => {
		$('#forgehammer-hud-slider').append(MenuItem);
    },


	/**
	 * Collective function
	 */
	SetMenuHeight: (reset = true) => {
		// calibrate height
		_menu_right.Prepare();

		if (reset) {
			// Slider nach oben resetten
			$('#forgehammer-hud-slider').css({
				'top': '0'
			});

			_menu.MenuScrollTop = 0;
			_menu.ActiveSlide = 1;

			$('.hud-btn-up').removeClass('hud-btn-up-active');

			if (_menu.SlideParts > 1) 
				$('.hud-btn-down').addClass('hud-btn-down-active');
			else // button not needed
				$('.hud-btn-down').removeClass('hud-btn-down-active');	
		}
	},


	/**
	 * Determines the window height and determines the appropriate height
	 *
	 */
	Prepare: () => {
		let MenuItemCount = $("#forgehammer-hud-slider").children().length;

		_menu.HudCount = Math.floor((($(window).outerHeight() - 20) - $('#forgehammer-hud').offset().top) / 48);
		_menu.HudCount = Math.min(_menu.HudCount, MenuItemCount);

		if (_menu.HudCount <= 0) {
			$('#forgehammer-hud').remove();
			_menu.CallSelectedMenu('Box')
		}
			
		// has a length been set manually?
		let MenuLength = localStorage.getItem('MenuLength');

		if (MenuLength !== null && MenuLength < _menu.HudCount) {
			_menu.HudCount = _menu.HudLength = parseInt(MenuLength);
		}

		_menu.HudHeight = (_menu.HudCount * 47);
		_menu.SlideParts = Math.ceil(MenuItemCount / _menu.HudCount);

		$('#forgehammer-hud').height(_menu.HudHeight + 2);
		$('#forgehammer-hud-wrapper').height(_menu.HudHeight);
	},


	/**
	 * Make panel scrollable
	 */
	CheckButtons: async () => {
		let activeIdx = 0;

		await ExistenceConfirmed("jQuery._data($('body').get(0), 'events' ).click||$('.hud-btn')");

		$('.hud-btn').click(function () {
			activeIdx = $(this).index('.hud-btn');
		});

		if (jQuery._data($('body').get(0), 'events' ).click.filter((elem) => elem.selector == ".hud-btn-down-active").length == 0) {
			// Klick auf Pfeil nach unten
			$('body').on('click', '.hud-btn-down-active', function () {
				_menu_right.ClickButtonDown();
			});
		};

		if (jQuery._data($('body').get(0), 'events' ).click.filter((elem) => elem.selector == ".hud-btn-up-active").length == 0) {
			// Klick auf Pfeil nach oben
			$('body').on('click', '.hud-btn-up-active', function () {
				_menu_right.ClickButtonUp();
			});
		};

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
		$('#forgehammer-hud-slider').sortable({
			placeholder: 'menu-placeholder',
			axis: 'y',
			distance: 22,
			start: function () {
				$('#forgehammer-hud').addClass('is--sorting');
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

				$('#forgehammer-hud').removeClass('is--sorting');

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
	 * Click function
	 */
	ClickButtonDown: () => {
		$('.hud-btn-down').removeClass('hasFocus');

		_menu.ActiveSlide++;

		_menu.MenuScrollTop -= _menu.HudHeight;
		if (_menu.ActiveSlide * _menu.HudHeight > $('#forgehammer-hud-slider').height())
			_menu.MenuScrollTop = - (($('#forgehammer-hud-slider').height()/_menu.HudHeight) - 1) *_menu.HudHeight;

		$('#forgehammer-hud-slider').css({
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
		
		if (_menu.ActiveSlide == 1) 
			_menu.MenuScrollTop = 0;
		else
			_menu.MenuScrollTop += _menu.HudHeight;

		$('#forgehammer-hud-slider').css({
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
