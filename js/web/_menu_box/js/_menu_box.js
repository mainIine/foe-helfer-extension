/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

let _menu_box = {

	/**
	 * Create the div holders and put them to the DOM
	 */
	BuildBoxMenu: () => {
		_menu_box.Show();
	},


	/**
	 * Create a html box and put it into the DOM
	 */
	Show: () => {
        //moment.locale(18n('Local'));

		HTML.Box({
			id: 'menu_box',
			title: i18n('Global.BoxTitle'),
			onlyTitle: true,
			dragdrop: '_menu_box.CheckButtons()',
			minimize: true,
			resize: true,
			auto_close: false
		});
		_menu_box.CalcBody();

		window.dispatchEvent(new CustomEvent('foe-helper#menu_loaded'));
	},


	CalcBody: () => {
		_menu.TopOffset = $('#menu_box').offset().top;
		_menu.ListLinks(_menu_box.InsertMenuItem);
		_menu_box.CheckButtons();
	},


	/**
	* Fügt ein MenüItem ein
	*
	* @param MenuItem
	*/
	InsertMenuItem: (MenuItem) => {
		$('#menu_boxBody').append(MenuItem);
	},
		

	/**
	 * Tooltips etc
	 *
	 */
	CheckButtons: () => {

		let activeIdx = 0,
			top = $('#menu_box').offset().top < 90;

		$('.hud-btn').click(function () {
			activeIdx = $(this).index('.hud-btn');
		});

		$('.hud-btn').stop().hover(function(){
			let $this = $(this),
				id = $this.attr('id'),
				y = ($this.offset().top - $('[data-btn="' + id + '"]').height()-30),
				x = ($this.offset().left + 23);

			$('[data-btn="' + id + '"]').removeClass('isOnTop');

			// not enougth space to top viewport
			if(top)
			{
				y = ($this.offset().top + 50);
				$('[data-btn="' + id + '"]').addClass('isOnTop');
			}

			$('[data-btn="' + id + '"]').css({ left: x, top: y}).show();

		}, function(){
			let id = $(this).attr('id');

			$('[data-btn="' + id + '"]').hide();
		});

		// Sorting function of the menu items
		$('#menu_boxBody').sortable({
			placeholder: 'menu-placeholder',
			distance: 15,
			start: function () {
				$('#menu_box').addClass('is--sorting');
			},
			sort: function () {
				$('.is--sorting .hud-btn-up-active').mouseenter(function (e) {
					$('.hud-btn-up-active').stop().addClass('hasFocus');
				}).mouseleave(function () {
					$('.is--sorting .hud-btn-up-active').removeClass('hasFocus');
				});

				$('.is--sorting .hud-btn-down-active').mouseenter(function (e) {
					$('.is--sorting .hud-btn-down-active').stop().addClass('hasFocus');
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

				$('#menu_box').removeClass('is--sorting');

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
	 * Hides a button. The HUD slider must already be filled for this.
	 *
	 * @param buttonId
	 * @constructor
	 */
	HideButton: (buttonId) => {
		if ($('#menu_boxBody').has(`div#${buttonId}`).length > 0)
			$($('#menu_boxBody').children(`div#${buttonId}`)[0]).hide();

	},


	/**
	 * Shows a hidden button again
	 */
	ShowButton: (buttonId) => {
		if ($('#menu_boxBody').has(`div#${buttonId}`))
			$($('#menu_boxBody').children(`div#${buttonId}`)[0]).show();
	},
};
