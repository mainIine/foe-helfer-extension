/*
 * **************************************************************************************
 *
 * Dateiname:                 helper.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 14:29 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
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
	copyToClipboard: function(textToCopy){
		let copyFrom = $('<textarea/>');
		copyFrom.text(textToCopy);
		$('body').append(copyFrom);
		copyFrom.select();
		document.execCommand('copy');
		copyFrom.remove();
	}
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


let HTML = {

	customFunctions: [],

	/**
	 * Erzeugt eine HTML Box im DOM
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
	Box: (args)=> {

		let title = $('<span />').addClass('title').html(args['title']);

		if(args['onlyTitle'] !== true){
			title = $('<span />').addClass('title').html(args['title'] + ' <small><em> - ' + i18n('Global.BoxTitle') + '</em></small>');
		}

		let close = $('<span />').attr('id', args['id'] + 'close').addClass('window-close'),

			head = $('<div />').attr('id', args['id'] + 'Header').attr('class', 'window-head').append(title),
			body = $('<div />').attr('id', args['id'] + 'Body').attr('class', 'window-body'),
			div = $('<div />').attr('id', args['id']).attr('class', 'window-box open').append( head ).append( body ).hide(),
			cords = localStorage.getItem(args['id'] + 'Cords');


		if(args['auto_close'] !== false){
			head.append(close);
		}

		// Minimierenbutton
		if(args['minimize']){
			let min = $('<span />').addClass('window-minimize');
			min.insertAfter(title);
		}

		// insert a wrench icon
		// set a click event on it
		if(args['settings']){
			let set = $('<span />').addClass('window-settings').attr('id', `${args['id']}-settings`);
			set.insertAfter(title);

			if (typeof args['settings'] !== 'boolean')
			{
				HTML.customFunctions[`${args['id']}Settings`] = args['settings'];
			}
		}

		// Lautsprecher für Töne
		if(args['speaker']){
			let spk = $('<span />').addClass('window-speaker').attr('id', args['speaker']);
			spk.insertAfter(title);

			$('#' + args['speaker']).addClass( localStorage.getItem(args['speaker']) );
		}

		// es gibt gespeicherte Koordinaten
		if(cords){
			let c = cords.split('|');

			// Verhindere, dass Fenster außerhalb plaziert werden
			div.offset({ top: Math.min(parseInt(c[0]), window.innerHeight - 50), left: Math.min(parseInt(c[1]), window.innerWidth - 100) });
		}

		// Ein Link zu einer Seite
		if(args['ask']){
			div.find(title).after( $('<span />').addClass('window-ask').attr('data-url', args['ask']) );
		}

		// wenn Box im DOM, verfeinern
		$('body').append(div).promise().done(function() {

			// necessary delay hack
			setTimeout(()=>{
				HTML.BringToFront(div);
			},300);


			if(args['auto_close']){
				$(`#${args.id}`).on('click', `#${args['id']}close`, function(){
					$('#' + args['id']).fadeToggle('fast', function(){
						$(this).remove();
					});
				});
			}

			if(args['ask']) {
				$(`#${args.id}`).on('click', '.window-ask', function() {
					window.open( $(this).data('url'), '_blank');
				});
			}

			if(args['dragdrop']) {
				HTML.DragBox(document.getElementById(args['id']), args['saveCords']);

				// is there a callback function?
				if (typeof args['dragdrop'] !== 'boolean')
				{
					HTML.customFunctions[args['id']] = args['dragdrop'];
				}
			}

			// is there a callback function?
			if(args['settings'])
			{
				if (typeof args['settings'] !== 'boolean')
				{
					$(`#${args['id']}`).on('click', `#${args['id']}-settings`, function(){

						// exist? remove!
						if( $(`#${args['id']}SettingsBox`).length > 0 )
						{
							$(`#${args['id']}SettingsBox`).fadeToggle('fast', function(){
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

			if(args['resize']) {
				HTML.Resizeable(args['id'], args['keepRatio']);
			}

			if(args['minimize']) {
				HTML.MinimizeBox(div);
			}

			if(args['speaker']) {
				$('#' + args['speaker']).addClass( localStorage.getItem(args['speaker']) );
			}

			div.fadeToggle('fast');

            // Stop propagation of key event out of inputs in this box to FOE
            $(`#${args['id']}`).on('keydown keyup', (e) => {
                e.stopPropagation();
            });

            // Brings the clicked window to the front
            $('body').on('click', '.window-box', function() {
				HTML.BringToFront($(this));
			});
		});
	},


	/**
	 * Click to minimise the box
	 *
	 * @param div
	 */
	MinimizeBox: (div)=> {
		let btn = $(div).find('.window-minimize');

		$(btn).bind('click', function(){
			let box = $(this).closest('.window-box'),
				open = box.hasClass('open');
			if(open === true){
				box.removeClass('open');
				box.addClass('closed');
				box.find('.window-body').css("visibility", "hidden");
			} else {
				box.removeClass('closed');
				box.addClass('open');
				box.find('.window-body').css("visibility", "visible");
			}
		});
	},


	/**
	 * Makes an HTML BOX DragAble
	 *
	 * @param el
	 * @param save
	 */
	DragBox: (el, save = true)=> {

		document.getElementById(el.id + "Header").removeEventListener("pointerdown", dragMouseDown);

		let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0, top = 0, left = 0, id;

		id = el.id;

		if (document.getElementById(el.id + "Header")) {
			document.getElementById(el.id + "Header").onpointerdown = dragMouseDown;
		} else {
			el.onpointerdown = dragMouseDown;
		}

		function dragMouseDown(e) {
			e = e || window.event;
			e.preventDefault();

			pos3 = e.clientX;
			pos4 = e.clientY;

			document.onpointerup = closeDragElement;
			document.onpointermove = elementDrag;
		}

		function elementDrag(e) {
			e = e || window.event;
			e.preventDefault();

			pos1 = pos3 - e.clientX;
			pos2 = pos4 - e.clientY;
			pos3 = e.clientX;
			pos4 = e.clientY;

			top = (el.offsetTop - pos2);
			left = (el.offsetLeft - pos1);

			// Schutz gegen "zu Hoch geschoben"
			if(top < 0) {
				top = 12;

				document.onpointerup = null;
				document.onpointermove = null;
			}

			el.style.top = top + "px";
			el.style.left = left + "px";

			if(save === true){
				let cords = top + '|' + left;

				localStorage.setItem(id + 'Cords', cords);
			}
		}

		function closeDragElement() {
			document.onpointerup = null;
			document.onpointermove = null;

			// is there a callback function after drag&drop
			if(HTML.customFunctions[id])
			{
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
	Resizeable: (id, keepRatio)=> {
		let box = $('#'+id),
			grip = $('<div />').addClass('window-grippy'),
			sizeLS = localStorage.getItem(id + 'Size');

		// Size was defined, set
		if(sizeLS !== null)
		{
			let s = sizeLS.split('|');

			// Does the box fit into the Viewport in terms of height?
			// No, height is set automatically, width taken over
			if( $(window).height() - s[1] < 20 )
			{
				box.width(s[0]);
			}
			// ja, gespeicherte Daten sezten
			else {
				box.width(s[0]).height(s[1]);
			}
		}

		box.append(grip);

		let options = {
			handles: {
				ne: '.window-grippy',
				se: '.window-grippy',
				sw: '.window-grippy',
				nw: '.window-grippy'
			},
			minHeight: $(box).css("min-width") || 200,
			minWidth: $(box).css("min-height") || 250,
			stop: (e, $el)=>{
				let size = $el.element.width() + '|' + $el.element.height();

				localStorage.setItem(id + 'Size', size);
			}
		};

		// keep aspect Ratio
		if(keepRatio){
			let width = box.width(),
				height = box.height();

			options['aspectRatio'] = width / height;

			box.resizable(options);
		}

		// default
		else {
			box.resizable(options);
		}
	},


	SettingsBox: (id)=> {

		let box = $('<div />').attr({
			id: `${id}SettingsBox`,
			class: 'settingsbox-wrapper'
		});

		$(`#${id}`).append(box);

		setTimeout(()=> {
			new Function(`${HTML.customFunctions[id + 'Settings']}`)();
		}, 100);
	},


	/**
	 * Zweiter Klick auf das Menü-Icon schliesst eine ggf. offene Box
	 *
	 * @param cssid
	 * @returns {boolean}
	 */
	CloseOpenBox: (cssid)=> {

		let box = $('#' + cssid);

		if( box.length > 0 ){
			$(box).fadeToggle('fast', function(){
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
	AddCssFile: (modul)=> {
		// prüfen ob schon geladen
		if( $('#' + modul + '-css').length > 0 ){
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
	Format: (number)=>{
		if(number === 0){
			return '-';
		} else {
			return Number(number).toLocaleString(i18n('Local'));
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
	 * Ersetzt Variablen in einem String mit Argumenten
	 *
	 * @param string
	 * @param args
	 * @returns {*}
	 */
	i18nReplacer: (string, args)=> {
		if(string === undefined || args === undefined){
			return ;
		}

		for(let key in args)
		{
			if(!args.hasOwnProperty(key)){
				break;
			}

			const regExp = new RegExp('__' + key + '__', 'g');
			string = string.replace(regExp, args[key]);
		}
		return string;
	},


	BringToFront: ($this)=> {
		$('.window-box').removeClass('on-top');

		$this.addClass('on-top');
	},


	Dropdown: ()=> {

		for (const option of document.querySelectorAll(".custom-option")) {
			option.addEventListener('click', function(){
				if (!this.classList.contains('selected')) {
					let $this = $(this),
						txt = $this.text();

					$this.parent().find('.custom-option.selected').removeClass('selected');
					$this.addClass('selected');

					setTimeout(()=>{
						$this.closest('.custom-select-wrapper').find('.trigger').text(txt);
					},150);
				}
			})
		}

		for (const dropdown of document.querySelectorAll(".custom-select-wrapper")) {
			dropdown.addEventListener('click', function() {
				this.querySelector('.custom-select').classList.toggle('dd-open');
			})
		}

		window.addEventListener('click', function(e) {
			for (const select of document.querySelectorAll('.custom-select')) {
				if (!select.contains(e.target)) {
					select.classList.remove('dd-open');
				}
			}
		});
	},


	EnterFullscreen: ()=> {

	},


	LeaveFullscreen:()=> {

	}
};
