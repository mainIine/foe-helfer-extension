/*
 * *************************************************************************************
 *
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

/*
Example:

let peoples = [
	{name: 'Jean', lastname: 'Rodrigues', points: 30},
	{name: 'Sara', lastname: 'Hope', points: 30},
	{name: 'Igor', lastname: 'Leroy', points: 25},
	{name: 'Foo', lastname: 'Bar', points: 55}
];

// sort this list by points, if points is equal, sort by name.
let ranking = helper.arr.multisort(peoples, ['points', 'name'], ['DESC','ASC']);

*/

if (typeof helper === 'undefined') {
	var helper = {};
}

helper.str = {
	/**
	 * Copies a string to the clipboard
	 *
	 * @param {string} textToCopy Source string
	 * @returns {Promise|undefined}
	 */
	copyToClipboard: async (textToCopy) => {
		if (!document.hasFocus()) return;

		if (navigator?.clipboard?.writeText) {
			return navigator.clipboard.writeText(textToCopy);
		}

		helper.str.copyToClipboardLegacy(textToCopy);
	},


	/**
	 * Copies a string to the clipboard via a temporary textarea
	 *
	 * @param {string} textToCopy Source string
	 */
	copyToClipboardLegacy: (textToCopy) => {
		const copyFrom = $('<textarea/>').text(textToCopy);

		$('body').append(copyFrom);
		copyFrom.select();
		document.execCommand('copy');
		copyFrom.remove();
	},


	/**
	 * Normalizes a string for sorting: lowercase, umlauts transliterated, non-word characters removed
	 *
	 * @param {string} textToCleanup Source string
	 * @returns {string}
	 */
	cleanup: (textToCleanup) => {
		return textToCleanup.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/[\W_ ]+/g, '');
	},
};

helper.arr = {
	/**
	 * Sorts a multidimensional array by multiple columns
	 *
	 * @param {array} arr Source array
	 * @param {array} [columns] List of columns to sort by
	 * @param {array} [order_by] List of directions (ASC, DESC)
	 * @returns {array}
	 */
	multisort: (arr, columns, order_by) => {
		if (typeof columns === 'undefined') {
			columns = Array.from({ length: arr[0].length }, (_, x) => x);
		}

		if (typeof order_by === 'undefined') {
			order_by = new Array(arr[0].length).fill('ASC');
		}

		function multisort_recursive(a, b, columns, order_by, index) {
			const descending = order_by[index] === 'DESC';
			const is_numeric = !isNaN(+a[columns[index]] - +b[columns[index]]);

			const x = is_numeric ? +a[columns[index]] : a[columns[index]].toLowerCase();
			const y = is_numeric ? +b[columns[index]] : b[columns[index]].toLowerCase();

			if (x < y) {
				return descending ? 1 : -1;
			}

			if (x === y) {
				return columns.length - 1 > index ? multisort_recursive(a, b, columns, order_by, index + 1) : 0;
			}

			return descending ? -1 : 1;
		}

		return arr.sort((a, b) => multisort_recursive(a, b, columns, order_by, 0));
	}
};

/**
 * Generator yielding all permutations of the given elements
 *
 * @param {array} elements Source array
 * @yields {array}
 */
helper.permutations = function* permutations(elements) {
	if (elements.length === 1) {
		yield elements;
		return;
	}

	const [first, ...rest] = elements;

	for (const perm of permutations(rest)) {
		for (let i = 0; i < elements.length; i++) {
			yield [...perm.slice(0, i), first, ...perm.slice(i)];
		}
	}
};

helper.sounds = {
	ping: new Audio(extUrl + 'vendor/sounds/ping.mp3'),
	message: new Audio(extUrl + 'vendor/sounds/message.mp3'),

	/**
	 * Plays a named sound if sound is enabled in the settings
	 *
	 * @param {string} sound Key of the sound to play
	 */
	play: (sound) => {
		if (Settings.GetSetting('EnableSound')) helper.sounds[sound].play();
	},
};

helper.preloader = {
	/**
	 * Shows a loading spinner inside the given container
	 *
	 * @param {string} id Container selector
	 */
	show: (id) => {
		$(id + ' .loading-data').remove();
		$(id).append('<div class="loading-data"><div class="loadericon"></div></div>');
	},


	/**
	 * Fades out and removes the loading spinner of the given container
	 *
	 * @param {string} id Container selector
	 */
	hide: (id) => {
		$(id + ' .loading-data').fadeOut(600, 'easeInCubic', function () {
			$(this).remove();
		});
	}
};

let HTML = {

	customFunctions: [],
	IsReversedFloatFormat: undefined,
	boxWasMinimizedForBattle: false,

	/**
	 * Creates a customizable UI box element with various properties and behaviors.
	 *
	 * @param {Object} args - Configuration object for the box.
	 * @param {string} args.id - Unique identifier for the box element.
	 * @param {string} args.title - Title to be displayed on the box.
	 * @param {boolean} [args.onlyTitle=false] - Whether to display only the specified title without additional elements.
	 * @param {boolean} [args.auto_close=true] - Whether the box should include an auto-close feature.
	 * @param {string} [args.active_maps] - A comma-separated list of maps that determines activity-specific states.
	 * @param {boolean} [args.minimize=false] - Whether the box can be minimized.
	 * @param {boolean|Function} [args.settings=false] - Whether the box includes a settings button. Can also accept a callback function for custom settings behavior.
	 * @param {boolean|Function} [args.popout=false] - Whether the box includes a popout button. Can also accept a callback function for custom behavior.
	 * @param {boolean|Function} [args.map=false] - Whether the box includes a map button. Can also accept a callback function for custom behavior.
	 * @param {boolean|Function} [args.dragdrop=false] - Whether the box is draggable. Can include a callback function to save the box's new position.
	 * @param {boolean} [args.saveCords=false] - Whether the box's position should be saved and restored on reload.
	 * @param {boolean} [args.resize=false] - Whether the box should be resizable.
	 * @param {boolean} [args.keepRatio=false] - Whether resizing should maintain the original aspect ratio.
	 * @param {boolean|string} [args.speaker=false] - Include a speaker control button and specify the localStorage key for saved state.
	 * @param {string} [args.ask] - URL for documentation linked via an info button.
	 * @param {string} [args.class] - Additional CSS classes to add to the box element.
	 * @returns {void}
	 */
	Box: (args) => {
		const titleHtml = args.onlyTitle === true
			? args.title
			: (extVersion.indexOf('beta') > -1 ? '(Beta) ' : '') + args.title + ' <small><em> - FoE Helper</em></small>';

		const title = $('<span />').addClass('title').html(titleHtml);
		title.attr('title', title[0].textContent);

		const buttons = $('<div />').attr('id', args.id + 'Buttons').addClass('box-buttons'),
			head = $('<div />').attr('id', args.id + 'Header').attr('class', 'window-head').append(title),
			body = $('<div />').attr('id', args.id + 'Body').attr('class', 'window-body'),
			div = $('<div />').attr('id', args.id).attr('class', 'window-box open').append(head).append(body).hide();

		let cords = localStorage.getItem(args.id + 'Cords');

		// close button (note: the click handler below is only bound if auto_close is explicitly truthy)
		if (args.auto_close !== false) {
			buttons.append($('<span />').attr('id', args.id + 'close').addClass('window-close'));
		}

		if (args.active_maps && args.active_maps.length > 0) {
			const maps = args.active_maps.replace(/\s/g, '').split(',').map(x => 'ActiveOn' + x);
			div.addClass('MapActivityCheck ' + maps.join(' '));
		}

		if (args.minimize) {
			buttons.prepend($('<span />').addClass('window-minimize'));
		}

		// buttons with optional custom callback: [args key, css class, customFunctions suffix, extra attributes]
		const buttonDefs = [
			['settings', 'window-settings', 'Settings', {}],
			['popout', 'window-popout', 'PopOut', { title: i18n('PopUp.TooltipButton') }],
			['map', 'window-map', 'Map', {}],
		];

		for (const [key, cssClass, fnSuffix, attrs] of buttonDefs) {
			if (!args[key]) continue;

			buttons.prepend($('<span />').addClass(cssClass).attr('id', `${args.id}-${key}`).attr(attrs));

			if (typeof args[key] !== 'boolean') {
				HTML.customFunctions[`${args.id}${fnSuffix}`] = args[key];
			}
		}

		// sounds (was in the calculators)
		if (args.speaker) {
			buttons.prepend($('<span />').addClass('window-speaker').attr('id', args.speaker));
		}

		// initialize position of movable windows and prevent them from being placed off-screen
		if (args.dragdrop) {
			div.css({
				'--x': '0px',
				'--y': '0px',
				'left': 'calc(min(max(50vw + var(--x),0px),100vw - 60px))',
				'top': 'calc(min(max(50vh + var(--y),0px), 100vh - 60px))'
			});
		}

		// load saved coords
		if (cords) {
			if (cords.includes('|')) {
				cords = cords.split('|');
				cords = mouseActions.calcCoords([Number(cords[1]), Number(cords[0])], 'Center');
			} else {
				cords = JSON.parse(cords);
			}
			div.css({ '--x': cords[0] + 'px', '--y': cords[1] + 'px' });
		}

		// link to documentation
		if (args.ask) {
			buttons.prepend($('<span />').addClass('window-ask').attr('data-url', args.ask));
		}

		if (args.class) {
			div.addClass(args.class);
		}

		head.append(buttons);

		// once the box is in the DOM, refine it
		$('body').append(div).promise().done(function () {

			// necessary delay hack
			setTimeout(() => {
				HTML.BringToFront(div);
			}, 300);

			$(`#${args.id}Header .box-buttons span`).on('pointerdown', (e) => {
				e.stopPropagation();
			});

			if (args.auto_close) {
				$(`#${args.id}`).on('click', `#${args.id}close`, function () {

					// remove settings box if open
					$(`#${args.id}`).find('.settingsbox-wrapper').remove();

					$(`#${args.id}`).fadeToggle('fast', function () {
						$(this).remove();
						Tooltips.deactivate();
						$('div.tooltip').remove();
					});
				});
			}

			if (args.ask) {
				$(`#${args.id}`).on('click', '.window-ask', function () {
					window.open($(this).data('url'), '_blank');
				});
			}

			if (args.dragdrop) {
				HTML.DragBox(document.getElementById(args.id), args.saveCords);

				// is there a callback function?
				if (typeof args.dragdrop !== 'boolean') {
					HTML.customFunctions[args.id] = args.dragdrop;
				}
			}

			if (args.settings && typeof args.settings !== 'boolean') {
				$(`#${args.id}`).on('click', `#${args.id}-settings`, function () {

					// exists? remove! otherwise create a new one
					if ($(`#${args.id}SettingsBox`).length > 0) {
						$(`#${args.id}SettingsBox`).fadeToggle('fast', function () {
							$(this).remove();
						});
					} else {
						HTML.SettingsBox(args.id);
					}
				});
			}

			if (args.popout && typeof args.popout !== 'boolean') {
				$(`#${args.id}`).on('click', `#${args.id}-popout`, function () {
					HTML.PopOutBox(args.id);
				});
			}

			if (args.map && typeof args.map !== 'boolean') {
				$(`#${args.id}`).on('click', `#${args.id}-map`, function () {

					// exists? remove! otherwise create a new one
					if ($(`#${args.id}MapBox`).length > 0) {
						$(`#${args.id}MapBox`).fadeToggle('fast', function () {
							$(this).remove();
						});
					} else {
						HTML.MapBox(args.id);
					}
				});
			}

			if (args.resize) {
				HTML.Resizeable(args.id, args.keepRatio);
			}

			if (args.minimize) {
				HTML.MinimizeBox(div);
			}

			if (args.speaker) {
				$('#' + args.speaker).addClass(localStorage.getItem(args.speaker));
			}

			div.fadeToggle('fast');

			// stop propagation of key events out of inputs in this box to FoE
			$(`#${args.id}`).on('keydown keyup', (e) => {
				e.stopPropagation();
			});

			// brings the clicked window to the front
			$('body').on('click', '.window-box', function () {
				HTML.BringToFront($(this));
			});

			return true;
		});
	},


	/**
	 * Toggles a box between open and minimized on click of its minimize button
	 *
	 * @param {HTMLElement|jQuery} div Box element
	 */
	MinimizeBox: (div) => {
		$(div).find('.window-minimize').on('click', function () {
			const box = $(this).closest('.window-box'),
				open = box.hasClass('open');

			box.toggleClass('open', !open).toggleClass('closed', open);
			box.find('.window-body').css('visibility', open ? 'hidden' : 'visible');
		});
	},


	/**
	 * Minimizes the menu box
	 */
	Minimize: () => {
		$('#menu_box').removeClass('open').addClass('closed')
			.find('.window-body').css('visibility', 'hidden');
	},


	/**
	 * Restores the minimized menu box
	 */
	Maximize: () => {
		$('#menu_box').removeClass('closed').addClass('open')
			.find('.window-body').css('visibility', 'visible');
	},


	/**
	 * Minimizes the helper menu when a battle starts (if enabled in the settings)
	 */
	MinimizeBeforeBattle: () => {
		const HideHelperDuringBattle = localStorage.getItem('HideHelperDuringBattle'),
			MenuSetting = localStorage.getItem('SelectedMenu');

		if (HideHelperDuringBattle === 'true' && MenuSetting === 'Box' && $('#menu_box').hasClass('open')) {
			HTML.Minimize();
			HTML.boxWasMinimizedForBattle = true;
		}
	},


	/**
	 * Restores the helper menu after a battle if it was minimized for it
	 */
	MaximizeAfterBattle: () => {
		const MenuSetting = localStorage.getItem('SelectedMenu');

		if (MenuSetting === 'Box' && HTML.boxWasMinimizedForBattle) {
			HTML.Maximize();
			HTML.boxWasMinimizedForBattle = false;
		}
	},


	/**
	 * Makes an HTML box draggable
	 *
	 * @param {HTMLElement} el Box element
	 * @param {boolean} [save=true] Whether to persist the position in localStorage
	 */
	DragBox: (el, save = true) => {
		const id = el.id,
			header = document.getElementById(id + 'Header');

		let xStartM = 0, yStartM = 0, xStartEl = 0, yStartEl = 0;

		header?.removeEventListener('pointerdown', dragMouseDown);

		if (header) {
			header.onpointerdown = dragMouseDown;
		} else {
			el.onpointerdown = dragMouseDown;
		}

		function dragMouseDown(e) {
			e = e || window.event;
			e.preventDefault();

			// offsetLeft/offsetTop include CSS margins (e.g. the expanded player profile),
			// while the --x/--y positioning does not — subtract them to avoid a jump
			const style = window.getComputedStyle(el);

			xStartM = e.clientX;
			yStartM = e.clientY;
			xStartEl = el.offsetLeft - (parseFloat(style.marginLeft) || 0);
			yStartEl = el.offsetTop - (parseFloat(style.marginTop) || 0);

			document.onpointerup = closeDragElement;
			document.onpointermove = elementDrag;
		}

		function elementDrag(e) {
			e = e || window.event;
			e.preventDefault();

			const cords = mouseActions.calcCoords([xStartEl - xStartM + e.clientX, yStartEl - yStartM + e.clientY], 'Center');

			$(el).css({ '--x': cords[0] + 'px', '--y': cords[1] + 'px' });

			if (save === true) {
				localStorage.setItem(id + 'Cords', JSON.stringify(cords));
			}
		}

		function closeDragElement() {
			document.onpointerup = null;
			document.onpointermove = null;

			// is there a callback function after drag&drop
			if (typeof HTML.customFunctions[id] === 'function') {
				HTML.customFunctions[id]();
			}
		}
	},


	/**
	 * Makes a box resizable and persists its size in localStorage
	 *
	 * @param {string} id Box element ID
	 * @param {boolean} [keepRatio] Whether resizing should keep the aspect ratio
	 */
	Resizeable: (id, keepRatio) => {
		const box = $('#' + id),
			grip = $('<div />').addClass('window-grippy'),
			sizeLS = localStorage.getItem(id + 'Size');

		if (sizeLS !== null) {
			const s = sizeLS.split('|');

			// if the saved height does not fit into the viewport, only restore the width
			if ($(window).height() - s[1] < 20) {
				box.width(s[0]);
			} else {
				box.width(s[0]).height(s[1]);
			}
		} else {
			setTimeout(() => {
				box.width(box.width()).height(box.height());
			}, 800);
		}

		box.append(grip);

		const options = {
			handles: {
				ne: '.window-grippy',
				se: '.window-grippy',
				sw: '.window-grippy',
				nw: '.window-grippy'
			},
			minHeight: 100,
			minWidth: 220,
			stop: (e, $el) => {
				let w = $el.element.width(),
					h = $el.element.height();
				const t = $el.element.offset().top,
					l = $el.element.offset().left;

				if (window.innerHeight < h + t) {
					h = window.innerHeight - t - 5;
					$el.element.height(h);
				}
				if (window.innerWidth < l + w) {
					w = window.innerWidth - l - 5;
					$el.element.width(w);
				}

				localStorage.setItem(id + 'Size', w + '|' + h);
			}
		};

		// except the "menu box"
		if (id === 'menu_box') {
			options.minWidth = 101;
			options.minHeight = 87;
		}

		if (keepRatio) {
			options.aspectRatio = box.width() + ' / ' + box.height();
		}

		box.resizable(options);
	},


	/**
	 * Creates the settings box wrapper and invokes the module's settings callback
	 *
	 * @param {string} id Box element ID
	 */
	SettingsBox: (id) => {
		const box = $('<div />').attr({
			id: `${id}SettingsBox`,
			class: 'settingsbox-wrapper'
		});

		$(`#${id}`).append(box);

		setTimeout(() => {
			if (typeof HTML.customFunctions[id + 'Settings'] === 'function') {
				HTML.customFunctions[id + 'Settings']();
			}
		}, 100);
	},


	/**
	 * Invokes the module's popout callback
	 *
	 * @param {string} id Box element ID
	 */
	PopOutBox: (id) => {
		if (typeof HTML.customFunctions[id + 'PopOut'] === 'function') {
			HTML.customFunctions[id + 'PopOut']();
		}
	},


	/**
	 * Invokes the module's map callback
	 *
	 * @param {string} id Box element ID
	 */
	MapBox: (id) => {
		setTimeout(() => {
			if (typeof HTML.customFunctions[id + 'Map'] === 'function') {
				HTML.customFunctions[id + 'Map']();
			}
		}, 100);
	},


	/**
	 * A second click on the menu icon closes any open box
	 *
	 * @param {string} cssid Box element ID
	 * @returns {boolean}
	 */
	CloseOpenBox: (cssid) => {
		const box = $('#' + cssid);

		if (box.length > 0) {
			box.fadeToggle('fast', function () {
				$(this).remove();
			});
		}

		return false;
	},


	/**
	 * Injects a module's CSS file into the DOM (once)
	 *
	 * @param {string} modul Module name
	 */
	AddCssFile: (modul) => {
		// already loaded?
		if ($('#' + modul + '-css').length > 0) {
			return;
		}

		const cssUrl = `${extUrl}js/web/${modul}/css/${modul}.css?v=${extVersion}`;

		const css = $('<link />')
			.attr('href', cssUrl)
			.attr('id', modul + '-css')
			.attr('rel', 'stylesheet');

		$('head').append(css);
	},


	/**
	 * Formats a number localized, returns "-" for 0
	 *
	 * @param {number|string} number
	 * @returns {string}
	 */
	Format: (number) => {
		if (number === 0) {
			return '-';
		}

		if (typeof number !== 'number' && isNaN(Number(number))) return '' + number;

		return Number(number).toLocaleString(i18n('Local'));
	},


	/**
	 * Formats a number in compact notation (e.g. 1.2M), optionally returns "-" for 0
	 *
	 * @param {number|string} number
	 * @param {boolean} [replaceZero=true] Whether 0 should be rendered as "-"
	 * @param {string} [language='Local'] i18n key of the locale to use
	 * @returns {string}
	 */
	FormatNumberShort: (number, replaceZero = true, language = 'Local') => {
		if (number === 0 && replaceZero) {
			return '-';
		}

		return Intl.NumberFormat(i18n(language), {
			notation: 'compact',
			maximumFractionDigits: 1
		}).format(Number(number));
	},


	/**
	 * Interpolates linearly between two hex colors
	 *
	 * @param {number} Value Current value
	 * @param {number} MinValue Value mapped to Color1
	 * @param {number} MaxValue Value mapped to Color2
	 * @param {string} Color1 Hex color without "#"
	 * @param {string} Color2 Hex color without "#"
	 * @returns {string} Interpolated hex color without "#"
	 */
	GetColorGradient: (Value, MinValue, MaxValue, Color1, Color2) => {
		const Factor2 = Math.min(Math.max((Value - MinValue) / (MaxValue - MinValue), 0), 1);
		const Factor1 = 1 - Factor2;

		const Color1Int = parseInt(Color1, 16);
		const Color2Int = parseInt(Color2, 16);

		const Rgb1 = [Math.floor(Color1Int / 256 / 256), Math.floor(Color1Int / 256) % 256, Color1Int % 256];
		const Rgb2 = [Math.floor(Color2Int / 256 / 256), Math.floor(Color2Int / 256) % 256, Color2Int % 256];

		const RgbRet = Rgb1.map((c, i) => Math.round(c * Factor1 + Rgb2[i] * Factor2));
		const ColorRet = RgbRet[0] * 256 * 256 + RgbRet[1] * 256 + RgbRet[2];

		return ColorRet.toString(16).padStart(6, '0');
	},


	/**
	 * Replaces __key__ placeholders in a string with the given arguments
	 *
	 * @param {string} string
	 * @param {Object} args Placeholder values keyed by name
	 * @returns {string|undefined}
	 */
	i18nReplacer: (string, args) => {
		if (string === undefined || args === undefined) {
			return;
		}

		for (const key of Object.keys(args)) {
			string = string.replace(new RegExp(`__${key}__`, 'g'), args[key]);
		}

		return string;
	},


	/**
	 * Replaces " with &quot;
	 *
	 * @param {string} string
	 * @returns {string}
	 */
	i18nTooltip: (string) => {
		return string.replace(/"/g, '&quot;');
	},


	/**
	 * Moves the given window box above all others
	 *
	 * @param {jQuery} $this Box element
	 */
	BringToFront: ($this) => {
		$('.window-box').removeClass('on-top');
		$this.addClass('on-top');
	},


	/**
	 * Wires up custom select dropdowns (option selection, open/close, outside click)
	 */
	Dropdown: () => {
		for (const option of document.querySelectorAll('.custom-option')) {
			option.addEventListener('click', function () {
				if (!this.classList.contains('selected')) {
					const $this = $(this),
						txt = $this.text();

					$this.parent().find('.custom-option.selected').removeClass('selected');
					$this.addClass('selected');

					setTimeout(() => {
						$this.closest('.custom-select-wrapper').find('.trigger').text(txt);
					}, 150);
				}
			});
		}

		for (const dropdown of document.querySelectorAll('.custom-select-wrapper')) {
			dropdown.addEventListener('click', function () {
				this.querySelector('.custom-select').classList.toggle('dd-open');
			});
		}

		window.addEventListener('click', (e) => {
			for (const select of document.querySelectorAll('.custom-select')) {
				if (!select.contains(e.target)) {
					select.classList.remove('dd-open');
				}
			}
		});
	},


	EnterFullscreen: () => {

	},


	LeaveFullscreen: () => {

	},


	/**
	 * Escapes HTML special characters in a string
	 *
	 * @param {string} text
	 * @returns {string}
	 */
	escapeHtml: (text) => {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	},


	/**
	 * Shows a toast notification
	 *
	 * @param {Object} d Toast options (head, text, type, hideAfter, allowToastClose, show)
	 */
	ShowToastMsg: (d) => {
		if (!Settings.GetSetting('ShowNotifications') && !d.show) return;

		$.toast({
			heading: d.head,
			text: d.text,
			icon: d.type,
			hideAfter: d.hideAfter,
			allowToastClose: d.allowToastClose,
			position: Settings.GetSetting('NotificationsPosition', true),
			extraClass: localStorage.getItem('SelectedMenu') || 'RightBar',
			stack: localStorage.getItem('NotificationStack') || 4
		});
	},


	/**
	 * Opens a popout browser window prepared with the extension's stylesheets
	 *
	 * @param {Object} params Options: id, width, height
	 * @returns {Window} Reference to the opened window
	 */
	PopOutBoxBuilder: (params) => {
		const id = params.id;

		const winHtml = `<!DOCTYPE html>
						<html>
							<head id="popout-${id}-head">
								<title>PopOut Test - ${i18n('Boxes.Outpost.Title')}</title>
								<link rel="stylesheet" href="${extUrl}css/web/variables.css">
								<link rel="stylesheet" href="${extUrl}css/web/boxes.css">
								<link rel="stylesheet" href="${extUrl}css/web/goods.css">
								<style id="goods-sprite-css">${localStorage.getItem('GoodsSpriteCSS') || ''}</style>
							</head>
							<body id="popout-${id}-body"></body>
						</html>`;

		const winUrl = URL.createObjectURL(
			new Blob([winHtml], { type: 'text/html' })
		);

		return window.open(
			winUrl,
			`popOut-${id}`,
			`width=${params.width},height=${params.height},screenX=200,screenY=200`
		);
	},


	/**
	 * Exports an HTML table as JSON or CSV download
	 *
	 * @param {string|jQuery} Table Table selector or element
	 * @param {string} Format 'json' or 'csv'
	 * @param {string} FileName Base name of the exported file
	 */
	ExportTable: (Table, Format, FileName) => {
		if (!Table || Table.length === 0) return;

		$(Table).each(function () {
			const ColumnNames = [];
			let index = 0;

			const findBy = $(Table).find('.exportheader th').length > 0 ? '.exportheader th' : 'th';

			$(Table).find(findBy).each(function () {
				const ColumnCount = Number($(this).attr('colspan')) || 1;

				if (ColumnCount === 1) {
					ColumnNames[index] = $(this).data('export');
					index++;
				} else {
					for (let i = 0; i < ColumnCount; i++) {
						ColumnNames[index] = $(this).data('export' + (i + 1));
						index++;
					}
				}
			});

			const DataRows = [];

			$(Table).find('tr').each(function () {
				const CurrentRow = {};
				let ColumnID = 0;

				$(this).find('td').each(function () {
					if (ColumnNames[ColumnID]) { // skip if no column name set
						const Key = ColumnNames[ColumnID];
						let Value;

						if ($(this).attr('exportvalue')) {
							Value = HTML.ParseFloatNonLocalIfPossible($(this).attr('exportvalue'));
						} else if ($(this).attr('data-number')) {
							Value = HTML.ParseFloatNonLocalIfPossible($(this).attr('data-number'));
						} else {
							Value = $(this).text();
							if (Value === '-') Value = '0';
							Value = HTML.ParseFloatLocalIfPossible(Value);
						}

						CurrentRow[Key] = Value;
					}

					ColumnID += Number($(this).attr('colspan')) || 1;
				});

				if (Object.keys(CurrentRow).length > 0) DataRows.push(CurrentRow); // don't push empty rows
			});

			let FileContent;

			if (Format === 'json') {
				FileContent = JSON.stringify(DataRows);
			} else if (Format === 'csv') {
				const ValidColumnNames = ColumnNames.filter(a => a !== undefined);
				const Rows = [ValidColumnNames.join(';')];

				for (const DataRow of DataRows) {
					const CurrentCells = ValidColumnNames.map(Name => {
						const CurrentCell = DataRow[Name];
						if (CurrentCell === undefined) return '';

						return $.isNumeric(CurrentCell)
							? Number(CurrentCell).toLocaleString(i18n('Local'), { useGrouping: false })
							: CurrentCell;
					});

					Rows.push(CurrentCells.join(';'));
				}

				FileContent = Rows.join('\r\n');
			} else { // invalid format
				return;
			}

			// with UTF-8 BOM
			const BlobData = new Blob(['\uFEFF' + FileContent], { type: 'application/octet-binary;charset=ANSI' });
			MainParser.ExportFile(BlobData, FileName + '-' + moment().format('YYYY-MM-DD') + '.' + Format);
		});
	},


	/**
	 * Wires up a text input to filter the rows of its parent table
	 *
	 * @param {string} selector Input selector
	 */
	FilterTable: (selector) => {
		$(selector).on('click', (e) => { e.stopPropagation(); });

		$(selector).on('keyup', function () {
			const filter = $(this).val().toLowerCase(),
				rows = $('tbody tr', $(this).parents('table'));

			if (filter.length >= 2) {
				rows.hide();
				rows.each(function () {
					if ($(this).text().toLowerCase().indexOf(filter) > -1) {
						$(this).show();
					}
				});
			} else {
				rows.show();
			}
		});
	},


	/**
	 * Parses a locale-formatted number string, returns the input unchanged if not numeric
	 *
	 * @param {string} NumberString
	 * @returns {number|string}
	 */
	ParseFloatLocalIfPossible: (NumberString) => {
		// determine float format once
		if (HTML.IsReversedFloatFormat === undefined) {
			HTML.IsReversedFloatFormat = Number(1.2).toLocaleString(i18n('Local')).charAt(1) === ',';
		}

		const Ret = HTML.IsReversedFloatFormat
			? NumberString.replace(/\./g, '').replace(/,/g, '.') // strip thousands separators, comma becomes decimal point
			: NumberString.replace(/,/g, ''); // strip thousands separators

		const RetNumber = Number(Ret);

		return isNaN(RetNumber) ? NumberString : RetNumber;
	},


	/**
	 * Parses a non-localized number string, returns the input unchanged if not numeric
	 *
	 * @param {string} NumberString
	 * @returns {number|string}
	 */
	ParseFloatNonLocalIfPossible: (NumberString) => {
		const Ret = Number(NumberString);

		return isNaN(Ret) ? NumberString : Ret;
	},
};

FoEproxy.addFoeHelperHandler('ActiveMapUpdated', () => {
	$(`.MapActivityCheck:not(.ActiveOn${ActiveMap})`).remove();
	$('.MapActivityHide').hide();
	$(`.MapActivityHide.ActiveOn${ActiveMap}`).show();
});
