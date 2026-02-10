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

if( typeof helper == 'undefined' ) {
	var helper = { } ;
}

helper.str = {
	/**
	 * Function to copy string to clipboard
	 *
	 * <a href="/param">@param</a> {string} [textToCopy] Source string
	 */
	copyToClipboard: async(textToCopy) => {
		if (!document.hasFocus()) return;
		if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
			return navigator.clipboard.writeText(textToCopy);
		} else {
			return new Promise(async (resolve) => {
				let copyFrom = $('<textarea/>');
				copyFrom.text(textToCopy);
				$('body').append(copyFrom);
				copyFrom.select();
				document.execCommand('copy');
				copyFrom.remove();
				resolve();
			});
		}
	},

	copyToClipboardLegacy: (textToCopy) => {
		let copyFrom = $('<textarea/>');
		copyFrom.text(textToCopy);
		$('body').append(copyFrom);
		copyFrom.select();
		document.execCommand('copy');
		copyFrom.remove();
	},

	cleanup: (textToCleanup) => {
		return textToCleanup.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/[\W_ ]+/g, '')
	},
};

helper.arr = {
	/**
	 * Function to sort multidimensional array
	 *
	 * <a href="/param">@param</a> {array} [arr] Source array
	 * <a href="/param">@param</a> {array} [columns] List of columns to sort
	 * <a href="/param">@param</a> {array} [order_by] List of directions (ASC, DESC)
	 * @returns {array}
	 */
	multisort: function(arr, columns, order_by)
	{
		if(typeof columns == 'undefined') {
			columns = [];
			for(let x = 0; x < arr[0].length; x++) {
				columns.push(x);
			}
		}

		if(typeof order_by == 'undefined') {
			order_by = [];
			for(let x = 0; x < arr[0].length; x++) {
				order_by.push('ASC');
			}
		}

		function multisort_recursive(a, b, columns, order_by, index) {
			var direction = order_by[index] === 'DESC' ? 1 : 0;

			var is_numeric = !isNaN(+a[columns[index]] - +b[columns[index]]);


			var x = is_numeric ? +a[columns[index]] : a[columns[index]].toLowerCase();
			var y = is_numeric ? +b[columns[index]] : b[columns[index]].toLowerCase();



			if(x < y) {
				return direction === 0 ? -1 : 1;
			}

			if(x === y)  {
				return columns.length-1 > index ? multisort_recursive(a, b, columns, order_by,index+1) : 0;
			}

			return direction === 0 ? 1 : -1;
		}

		return arr.sort(function(a, b) {
			return multisort_recursive(a, b, columns, order_by,0);
		});
	}
};

helper.permutations = (()=>{
	const permutations = function *(elements) {
		if (elements.length === 1) {
			yield elements;
		} else {
			let [first, ...rest] = elements;
			for (let perm of permutations(rest)) {
				for (let i = 0; i < elements.length; i++) {
					let start = perm.slice(0, i);
					let rest = perm.slice(i);
					yield [...start, first, ...rest];
				}
			}
		}
	};
	return permutations;
})();

helper.sounds = {
	ping: new Audio(extUrl + 'vendor/sounds/ping.mp3'),
    message: new Audio(extUrl + 'vendor/sounds/message.mp3'),
	play: (sound) => {
		if (Settings.GetSetting('EnableSound')) helper.sounds[sound].play();
	},
};

helper.preloader = { 
	show: function(id) {
		$(id+' .loading-data').remove();
		$(id).append('<div class="loading-data"><div class="loadericon"></div></div>');
	},

	hide: function(id) {
		$(id+' .loading-data').fadeOut(600, 'easeInCubic', function () {
			$(this).remove();
		})
	}
};

let HTML = {

	customFunctions: [],
	IsReversedFloatFormat: undefined,

	/**
	 * Creates an HTML box in the DOM
	 *
	 * id
	 * title
	 * ask = null
	 * auto_close = true
	 * onlyTitle = title
	 * dragdrop = true
	 * resize = false
	 * speaker = false
	 * minimize = true
	 * saveCords = true
	 *
	 * @param args
	 */
	Box: (args) => {

		let title = $('<span />').addClass('title').html(args['title']);
		
		if (args['onlyTitle'] !== true) {
			title = $('<span />').addClass('title').html((extVersion.indexOf("beta") > -1 ? '(Beta) ': '') + args['title'] + ' <small><em> - FoE Helper</em></small>');
		}
		title = title.attr('title', title[0].textContent);
		let	buttons = $('<div />').attr('id', args['id'] + 'Buttons').addClass('box-buttons'),
			head = $('<div />').attr('id', args['id'] + 'Header').attr('class', 'window-head').append(title),
			body = $('<div />').attr('id', args['id'] + 'Body').attr('class', 'window-body'),
			div = $('<div />').attr('id', args['id']).attr('class', 'window-box open').append(head).append(body).hide(),
			cords = localStorage.getItem(args['id'] + 'Cords');
		
		// close button
		let close = $('<span />').attr('id', args['id'] + 'close').addClass('window-close');

		if (args['auto_close'] !== false) {
			buttons.append(close);
		}
		if (args["active_maps"] && args["active_maps"].length > 0) {
			let maps = args["active_maps"].replace(" ","").split(",").map(x => "ActiveOn"+x);
			div.addClass("MapActivityCheck "+maps.join(" "));
		}
		// minimize
		if (args['minimize']) {
			let min = $('<span />').addClass('window-minimize');
			buttons.prepend(min);
		}

		// insert a wrench icon, set a click event on it
		if (args['settings']) {
			let set = $('<span />').addClass('window-settings').attr('id', `${args['id']}-settings`);
			buttons.prepend(set);

			if (typeof args['settings'] !== 'boolean') {
				HTML.customFunctions[`${args['id']}Settings`] = args['settings'];
			}
		}

		if (args['popout']) {
			let set = $('<span />').addClass('window-settings').attr('id', `${args['id']}-popout`);
			buttons.prepend(set);

			if (typeof args['popout'] !== 'boolean') {
				HTML.customFunctions[`${args['id']}PopOut`] = args['popout'];
			}
		}

		if (args['map']) {
			let set = $('<span />').addClass('window-map').attr('id', `${args['id']}-map`);
			buttons.prepend(set);

			if (typeof args['map'] !== 'boolean') {
				HTML.customFunctions[`${args['id']}Map`] = args['map'];
			}
		}

		// Sounds (was in the calculators)
		if (args['speaker']) {
			let spk = $('<span />').addClass('window-speaker').attr('id', args['speaker']);
			buttons.prepend(spk);

			$('#' + args['speaker']).addClass(localStorage.getItem(args['speaker']));
		}
		
		// Position von beweglichen Fenstern initialisieren und Verhindern, dass Fenster außerhalb plaziert werden
		if (args.dragdrop) div.css({"--x": "0px","--y": "0px","left":"calc(min(max(50vw + var(--x),0px),100vw - 60px))","top":"calc(min(max(50vh + var(--y),0px), 100vh - 60px))"});

		// load saved coords
		if (cords) {
			c = null
			if (cords.includes('|')) {
				cords = cords.split('|') 
				cords = mouseActions.calcCoords([Number(cords[1]), Number(cords[0])], "Center")
			} else {
				cords = JSON.parse(cords)
			}
			// Verhindere, dass Fenster außerhalb plaziert werden
			div.css({"--x": cords[0]+"px","--y": cords[1]+"px"});
		}

		// link to documentation
		if (args['ask']) {
			let ask = $('<span />').addClass('window-ask').attr('data-url', args['ask']);
			buttons.prepend(ask);
		}

		if (args['class']) {
			div.addClass(args['class']);
		}

		head.append(buttons);

		// wenn Box im DOM, verfeinern
		$('body').append(div).promise().done(function () {

			// necessary delay hack
			setTimeout(() => {
				HTML.BringToFront(div);
			}, 300);

			$("#"+args['id'] + 'Header .box-buttons span').on("pointerdown",(e)=>{
				e.stopPropagation()
			})

			if (args['auto_close']) {
				$(`#${args.id}`).on('click', `#${args['id']}close`, function () {

					// remove settings box if open
					$(`#${args.id}`).find('.settingsbox-wrapper').remove();

					$('#' + args['id']).fadeToggle('fast', function () {
						$(this).remove();
						Tooltips.deactivate()
						$("div.tooltip").remove();
					});
				});
			}

			if (args['ask']) {
				$(`#${args.id}`).on('click', '.window-ask', function () {
					window.open($(this).data('url'), '_blank');
				});
			}

			if (args['dragdrop']) {
				HTML.DragBox(document.getElementById(args['id']), args['saveCords']);

				// is there a callback function?
				if (typeof args['dragdrop'] !== 'boolean') {
					HTML.customFunctions[args['id']] = args['dragdrop'];
				}
			}

			// is there a callback function?
			if (args['settings']) {
				if (typeof args['settings'] !== 'boolean') {
					$(`#${args['id']}`).on('click', `#${args['id']}-settings`, function () {

						// exist? remove!
						if ($(`#${args['id']}SettingsBox`).length > 0) {
							$(`#${args['id']}SettingsBox`).fadeToggle('fast', function () {
								$(this).remove();
							});
						}

						// create a new one
						else {
							HTML.SettingsBox(args['id']);
						}
					});
				}
			}

			if (args['popout']) {
				if (typeof args['popout'] !== 'boolean') {
					$(`#${args['id']}`).on('click', `#${args['id']}-popout`, function () {
						HTML.PopOutBox(args['id']);
					});
				}
			}

			if (args['map']) {
				if (typeof args['map'] !== 'boolean') {
					$(`#${args['id']}`).on('click', `#${args['id']}-map`, function () {

						// exist? remove!
						if ($(`#${args['id']}MapBox`).length > 0) {
							$(`#${args['id']}MapBox`).fadeToggle('fast', function () {
								$(this).remove();
							});
						}

						// create a new one
						else {
							HTML.MapBox(args['id']);
						}
					});
				}
			}

			if (args['resize']) {
				HTML.Resizeable(args['id'], args['keepRatio']);
			}

			if (args['minimize']) {
				HTML.MinimizeBox(div);
			}

			if (args['speaker']) {
				$('#' + args['speaker']).addClass(localStorage.getItem(args['speaker']));
			}

			div.fadeToggle('fast');

			// Stop propagation of key event out of inputs in this box to FOE
			$(`#${args['id']}`).on('keydown keyup', (e) => {
				e.stopPropagation();
			});

			// Brings the clicked window to the front
			$('body').on('click', '.window-box', function () {
				HTML.BringToFront($(this));
			});

			return true;
		});
	},


	/**
	 * Click to minimise the box
	 *
	 * @param div
	 */
	MinimizeBox: (div) => {
		let btn = $(div).find('.window-minimize');

		$(btn).bind('click', function () {
			let box = $(this).closest('.window-box'),
				open = box.hasClass('open');

			if (open === true) {
				box.removeClass('open');
				box.addClass('closed');
				box.find('.window-body').css("visibility", "hidden");
			}
			else {
				box.removeClass('closed');
				box.addClass('open');
				box.find('.window-body').css("visibility", "visible");
			}
		});
	},


	Minimize: () => {
		$('body').find('#menu_box').removeClass('open');
		$('body').find('#menu_box').addClass('closed');
		$('#menu_box').find('.window-body').css("visibility", "hidden");
	},


	Maximize: () => {
		$('body').find("#menu_box").removeClass('closed');
		$('body').find("#menu_box").addClass('open');
		$('#menu_box').find('.window-body').css("visibility", "visible");
	},


	/**
	 * Handle minimizing helper during battle
	 */
	MinimizeBeforeBattle: () => {
		let HideHelperDuringBattle = localStorage.getItem('HideHelperDuringBattle');
		let MenuSetting = localStorage.getItem('SelectedMenu');

		if (HideHelperDuringBattle === 'true' && MenuSetting === 'Box' && $('body').find("#menu_box").hasClass('open')) {
			HTML.Minimize();
			HTML.boxWasMinimizedForBattle = true;
		}
	},


	MaximizeAfterBattle: () => {
		let MenuSetting = localStorage.getItem('SelectedMenu');
		if (MenuSetting == 'Box' && HTML.boxWasMinimizedForBattle) {
			HTML.Maximize();
			HTML.boxWasMinimizedForBattle = false;
		}
	},


	/**
	 * Makes an HTML BOX Dragable
	 *
	 * @param el
	 * @param save
	 */
	DragBox: (el, save = true) => {

		document.getElementById(el.id + "Header").removeEventListener("pointerdown", dragMouseDown);

		let xStartM=0, yStartM=0, xStartEl=0, yStartEl=0;			

		let id = el.id;

		if (document.getElementById(el.id + "Header")) {
			document.getElementById(el.id + "Header").onpointerdown = dragMouseDown;
		} else {
			el.onpointerdown = dragMouseDown;
		}

		function dragMouseDown(e) {
			e = e || window.event;
			e.preventDefault();

			xStartM = e.clientX;
			yStartM = e.clientY;
			xStartEl = el.offsetLeft;
			yStartEl = el.offsetTop;

			document.onpointerup = closeDragElement;
			document.onpointermove = elementDrag;
		}

		function elementDrag(e) {
			e = e || window.event;
			e.preventDefault();

			let cords = mouseActions.calcCoords([(xStartEl - xStartM + e.clientX), yStartEl - yStartM + e.clientY], "Center");
			//let cords = mouseActions.calcCoords([e.clientX, e.clientY], "Center");

			$(el).css({"--x":cords[0]+"px","--y":cords[1]+"px"})

			if (save === true) {
				localStorage.setItem(id + 'Cords', JSON.stringify(cords));
			}
		}

		function closeDragElement() {
			document.onpointerup = null;
			document.onpointermove = null;

			// is there a callback function after drag&drop
			if (HTML.customFunctions[id]) {
				new Function(`${HTML.customFunctions[id]}`)();
			}
		}
	},


	/**
	 * Box can be resized
	 *
	 * @param id
	 * @param keepRatio
	 * @constructor
	 */
	Resizeable: (id, keepRatio) => {
		let box = $('#' + id),
			grip = $('<div />').addClass('window-grippy'),
			sizeLS = localStorage.getItem(id + 'Size');

		// Size was defined, set
		if (sizeLS !== null) {
			let s = sizeLS.split('|');

			// Does the box fit into the Viewport in terms of height?
			// No, height is set automatically, width taken over
			if ($(window).height() - s[1] < 20) {
				box.width(s[0]);
			}
			// ja, gespeicherte Daten sezten
			else {
				box.width(s[0]).height(s[1]);
			}
		}
		else {
			setTimeout(()=>{
				box.width(box.width()).height(box.height());
			}, 800);
		}

		box.append(grip);

		let options = {
			handles: {
				ne: '.window-grippy',
				se: '.window-grippy',
				sw: '.window-grippy',
				nw: '.window-grippy'
			},
			minHeight: 100,
			minWidth: 220,
			stop: (e, $el) => {
				let w = $el.element.width();
				let h = $el.element.height();
				let t = $el.element.offset().top;
				let l = $el.element.offset().left;
				if (window.innerHeight<h+t) {
					let h= window.innerHeight-t-5;
					$el.element.height(h);
				}
				if (window.innerWidth<l+w) {
					let w= window.innerWidth-l-5;
					$el.element.width(w);
				}
				
				let size = w + '|' + h;

				localStorage.setItem(id + 'Size', size);
			}
		};

		// Except the "menu Box"
		if(id === 'menu_box')
		{
			options['minWidth'] = 101;
			options['minHeight'] = 87;
		}

		// keep aspect ratio
		if (keepRatio) {
			options['aspectRatio'] = box.width() + ' / ' + box.height();

			box.resizable(options);
		}

		// default
		else {
			box.resizable(options);
		}
	},


	SettingsBox: (id) => {

		let box = $('<div />').attr({
			id: `${id}SettingsBox`,
			class: 'settingsbox-wrapper'
		});

		$(`#${id}`).append(box);

		setTimeout(() => {
			new Function(`${HTML.customFunctions[id + 'Settings']}`)();
		}, 100);
	},


	PopOutBox: (id) => {
		new Function(`${HTML.customFunctions[id + 'PopOut']}`)();
	},


	MapBox: (id) => {
		setTimeout(() => {
			new Function(`${HTML.customFunctions[id + 'Map']}`)();
		}, 100);
	},


	/**
	 * A second click on the menu icon closes any open box
	 *
	 * @param cssid
	 * @returns {boolean}
	 */
	CloseOpenBox: (cssid) => {

		let box = $('#' + cssid);

		if (box.length > 0) {
			$(box).fadeToggle('fast', function () {
				$(this).remove();
			});
		}

		return false;
	},


	/**
	 * Bindet auf Wunsch eine weitere CSS eines Modules ein
	 *
	 * @param modul
	 */
	AddCssFile: (modul) => {
		// prüfen ob schon geladen
		if ($('#' + modul + '-css').length > 0) {
			return;
		}

		// noch nicht im DOM, einfügen
		let url = extUrl + 'js/web/' + modul + '/',
			cssUrl = url + 'css/' + modul + '.css?v=' + extVersion;

		let css = $('<link />')
			.attr('href', cssUrl)
			.attr('id', modul + '-css')
			.attr('rel', 'stylesheet');

		$('head').append(css);
	},


	/**
	 * Formatiert Zahlen oder gibt = 0 einen "-" aus
	 *
	 * @param number
	 * @returns {*}
	 */
	Format: (number) => {
		if (number === 0) {
			return '-';
		} else {
			if (typeof number !== 'number' && isNaN(Number(number))) return "" + number;
			return Number(number).toLocaleString(i18n('Local'));
		}
	},


	/**
	 * Formatiert Zahlen oder gibt = 0 einen "-" aus
	 *
	 * @param number
	 * @returns {*}
	 */
	FormatNumberShort: (number,replaceZero=true,language='Local') => {
		if (number === 0 && replaceZero) {
			return '-';
		} else {
			return Intl.NumberFormat(i18n(language), {
				notation: "compact",
				maximumFractionDigits: 1
			  }).format(Number(number));
		}
	},


	/**
	* Returns strong class for formating mopppel date
	*
	* @param Value
	* @param MinValue
	* @param MaxValue
	* @param Color1
	* @param Color2
	*/
	GetColorGradient: (Value, MinValue, MaxValue, Color1, Color2) => {
		let Factor2 = (Value - MinValue) / (MaxValue - MinValue);
		Factor2 = Math.max(Factor2, 0);
		Factor2 = Math.min(Factor2, 1);

		let Factor1 = 1 - Factor2;

		let Color1Int = parseInt(Color1, 16);
		let Color2Int = parseInt(Color2, 16);

		let Rgb1 = [Math.floor(Color1Int / 256 / 256), Math.floor(Color1Int / 256) % 256, Color1Int % 256];
		let Rgb2 = [Math.floor(Color2Int / 256 / 256), Math.floor(Color2Int / 256) % 256, Color2Int % 256];

		let RgbRet = [];
		for (let i = 0; i < 3; i++) {
			RgbRet[i] = Math.round(Rgb1[i] * Factor1 + Rgb2[i] * Factor2);
		}

		let ColorRet = RgbRet[0] * 256 * 256 + RgbRet[1] * 256 + RgbRet[2];

		let Ret = ColorRet.toString(16);
		while (Ret.length < 6) {
			Ret = '0' + Ret;
		}
		return Ret;
	},


	/**
	 * Replaces variables in a string with arguments
	 *
	 * @param string
	 * @param args
	 * @returns {*}
	 */
	i18nReplacer: (string, args) => {
		if (string === undefined || args === undefined) {
			return;
		}

		for (let key in args) {
			if (!args.hasOwnProperty(key)) {
				break;
			}

			const regExp = new RegExp('__' + key + '__', 'g');
			string = string.replace(regExp, args[key]);
		}
		return string;
	},


	/**
	 * Replaces " with &quot;
	 *
	 * @param string
	 * @returns {*}
	 */
	i18nTooltip: (string) => {
		return string.replace(/"/g, "&quot;")
	},


	BringToFront: ($this) => {
		$('.window-box').removeClass('on-top');

		$this.addClass('on-top');
	},


	Dropdown: () => {

		for (const option of document.querySelectorAll(".custom-option")) {
			option.addEventListener('click', function () {
				if (!this.classList.contains('selected')) {
					let $this = $(this),
						txt = $this.text();

					$this.parent().find('.custom-option.selected').removeClass('selected');
					$this.addClass('selected');

					setTimeout(() => {
						$this.closest('.custom-select-wrapper').find('.trigger').text(txt);
					}, 150);
				}
			})
		}

		for (const dropdown of document.querySelectorAll(".custom-select-wrapper")) {
			dropdown.addEventListener('click', function () {
				this.querySelector('.custom-select').classList.toggle('dd-open');
			})
		}

		window.addEventListener('click', function (e) {
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


	escapeHtml: (text)=> {
		return text
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	},


	ShowToastMsg: (d) => {

		if (!Settings.GetSetting('ShowNotifications') && !d['show']) return;

		$.toast({
			heading: d['head'],
			text: d['text'],
			icon: d['type'],
			hideAfter: d['hideAfter'],
			allowToastClose:  d['allowToastClose'],
			position: Settings.GetSetting('NotificationsPosition', true),
			extraClass: localStorage.getItem('SelectedMenu') || 'RightBar',
			stack: localStorage.getItem('NotificationStack') || 4
		});
	},


	PopOutBoxBuilder: (params) => {

		let id = params['id'];

		const winHtml = `<!DOCTYPE html>
						<html>
							<head id="popout-${id}-head">
								<title>PopOut Test - ${i18n('Boxes.Outpost.Title')}</title>
								<link rel="stylesheet" href="${extUrl}css/web/variables.css">
								<link rel="stylesheet" href="${extUrl}css/web/boxes.css">
								<link rel="stylesheet" href="${extUrl}css/web/goods.css">
							</head>
							<body id="popout-${id}-body"></body>
						</html>`;

		const winUrl = URL.createObjectURL(
			new Blob([winHtml], { type: "text/html" })
		);

		const winObject = window.open(
			winUrl,
			`popOut-${id}`,
			`width=${params['width']},height=${params['height']},screenX=200,screenY=200`
		);

		return winObject;
	},


	ExportTable: (Table, Format, FileName) => {
		if (!Table || Table.length === 0) return;

		$(Table).each(function () {
			let ColumnNames = [];
			let findBy = "th"
			if ($(Table).find('.exportheader th').length > 0){
				findBy = '.exportheader th';
			}
			
			$(Table).find(findBy).each(function () {
				let ColumnCount = $(this).attr('colspan');
				if (ColumnCount) {
					ColumnCount = ColumnCount - 0;
				}
				else {
					ColumnCount = 1;
                }

				if (ColumnCount === 1) {
					ColumnNames.push($(this).data('export'))
				}
				else {
					for (let i = 0; i < ColumnCount; i++) {
						ColumnNames.push($(this).data('export' + (i + 1)));
					}
                }
			});

			let DataRows = [];
			$(Table).find('tr').each(function () {
				let CurrentRow = {};
				let ColumnID = 0;
				$(this).find('td').each(function () {
					if (ColumnNames[ColumnID]) { //skip if no columnname set
						let Key = ColumnNames[ColumnID];
						let Value;
						if ($(this).attr('exportvalue')) {
							Value = $(this).attr('exportvalue');
							Value = HTML.ParseFloatNonLocalIfPossible(Value);
						}
						else if ($(this).attr('data-number')) {
							Value = $(this).attr('data-number');
							Value = HTML.ParseFloatNonLocalIfPossible(Value);
						}
						else {
							Value = $(this).text();
							if (Value === '-') Value = '0';
							Value = HTML.ParseFloatLocalIfPossible(Value);
						}
						
						CurrentRow[Key] = Value;
					}

					let ColumnCount = $(this).attr('colspan');
					if (ColumnCount) {
						ColumnID += ColumnCount;
					}
					else {
						ColumnID += 1;
					}
					 ColumnCount;
				});

				if(Object.keys(CurrentRow).length > 0) DataRows.push(CurrentRow); //Dont push empty rows
			});

			let FileContent;
			if (Format === 'json') {
				FileContent = JSON.stringify(DataRows);
			}
			else if (Format === 'csv') {
				let Rows = [];

				let ValidColumnNames = ColumnNames.filter(function (a) { return a !== undefined });
				Rows.push(ValidColumnNames.join(';'));

				for (let i = 0; i < DataRows.length; i++) {
					let DataRow = DataRows[i];
					let CurrentCells = [];

					for (let j = 0; j < ValidColumnNames.length; j++) {
						let CurrentCell = DataRow[ValidColumnNames[j]];
						if (CurrentCell !== undefined) {
							if ($.isNumeric(CurrentCell)) {
								CurrentCells.push(Number(CurrentCell).toLocaleString(i18n('Local'),{useGrouping:false}));
							}
							else {
								CurrentCells.push(CurrentCell);
                            }
						}
						else {
							CurrentCells.push('');
                        }
					}
					Rows.push(CurrentCells.join(';'));
				}
				FileContent = Rows.join('\r\n');
			}
			else { //Invalid format
				return;
			}

			// with UTF-8 BOM
			let BlobData = new Blob(["\uFEFF" + FileContent], { type: "application/octet-binary;charset=ANSI" });
			MainParser.ExportFile(BlobData, FileName + '-' + moment().format('YYYY-MM-DD') + '.' + Format);
		});
	},


	FilterTable: (selector) => {
		$(selector).on('click', (e) => {e.stopPropagation()})
		$(selector).on('keyup', function (e) {
			let filter = $(this).val().toLowerCase()
			let table = $(this).parents("table")
			if (filter.length >= 2) {
				$("tbody tr", table).hide()
				$("tbody tr", table).filter(function() {
					let foundText = ($(this).text().toLowerCase().indexOf(filter) > -1)
					if (foundText)
						$(this).show()
				});
			}
			else {
				$("tbody tr", table).show()
			}
		});
	},


	ParseFloatLocalIfPossible: (NumberString) => {
		if (HTML.IsReversedFloatFormat === undefined) { //FloatFormat bestimmen, wenn noch unbekannt
			let ExampleNumberString = Number(1.2).toLocaleString(i18n('Local'))
			if (ExampleNumberString.charAt(1) === ',') {
				HTML.IsReversedFloatFormat = true;
			}
			else {
				HTML.IsReversedFloatFormat = false;
			}
		}

		let Ret = NumberString;
		if (HTML.IsReversedFloatFormat) {
			Ret = Ret.replace(/\./g, "") //1000er Trennzeichen entfernen
			Ret = Ret.replace(/,/g, ".") //Komma ersetzen
		}
		else {
			Ret = Ret.replace(/,/g, "") //1000er Trennzeichen entfernen
		}

		let RetNumber = Number(Ret);
		if (isNaN(RetNumber)) {
			return NumberString;
		}
		else {
			return RetNumber;
		}
	},


	ParseFloatNonLocalIfPossible: (NumberString) => {
		let Ret = Number(NumberString);
		if (isNaN(Ret)) {
			return NumberString;
		}
		else {
			return Ret;
        }
	},
};

FoEproxy.addFoeHelperHandler('ActiveMapUpdated', () => {
	$('.MapActivityCheck:not(.ActiveOn'+ActiveMap+")").remove();
	$('.MapActivityHide').hide();
	$('.MapActivityHide.ActiveOn'+ActiveMap).show();

});