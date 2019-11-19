/*
 * **************************************************************************************
 *
 * Dateiname:                 helper.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       11.11.19, 20:38 Uhr
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


let HTML = {

	/**
	 * Erzeugt eine HTML Box im DOM
	 *
	 * @param id
	 * @param titel
	 * @param ask
	 * @param auto_close
	 * @param dragdrop
	 * @param resize Resize
	 * @constructor
	 */
	// Box: (id, titel, ask = null, auto_close = true, dragdrop = true, resize = false, speaker = #id)=> {
	/**
	 * id,
	 * title,
	 * ask = null,
	 * auto_close = true,
	 * dragdrop = true,
	 * resize = false
	 * minimize = true
	 *
	 * @param args
	 * @constructor
	 */
	Box: (args)=> {

		let close = $('<span />').attr('id', args['id'] + 'close').addClass('window-close'),
			title = $('<span />').addClass('title').text(args['title']),

			head = $('<div />').attr('id', args['id'] + 'Header').attr('class', 'window-head').append(title).append(close),
			body = $('<div />').attr('id', args['id'] + 'Body').attr('class', 'window-body'),
			div = $('<div />').attr('id', args['id']).attr('class', 'window-box open').append( head ).append( body ),
			cords = localStorage.getItem(args['id'] + 'Cords');

		// Minimierenbutton
		if(args['minimize'] !== undefined){
			let min = $('<span />').addClass('window-minimize');
			min.insertAfter(title);
		}

		// Lautsprecher für Töne
		if(args['speaker'] !== undefined){

			// Click Event grillen...
			$('body').off('click', '#' + args['speaker']);

			let spk = $('<span />').addClass('window-speaker').attr('id', args['speaker']);
			spk.insertAfter(title);

			$('#' + args['speaker']).addClass( localStorage.getItem(args['speaker']) );
		}

		// es gibt gespeicherte Koordinaten
		if(cords !== null){
			let c = cords.split('|');
			div.offset({ top: c[0], left: c[1]});
		}

		// Ein Link zu einer Seite
		if(args['ask'] !== undefined){
			div.find(title).after( $('<span />').addClass('window-ask').attr('data-url', args['ask']) );
		}

		$('body').append(div);

		setTimeout(
			()=> {

				if(args['auto_close'] !== undefined){
					$('body').on('click', '#' + args['id'] + 'close', ()=>{
						$('#' + args['id']).hide('fast', ()=>{
							$('#' + args['id']).remove();
						});
					});
				}

				if(args['ask'] !== undefined) {
					$('body').on('click', '.window-ask', function() {
						window.open( $(this).data('url'), '_blank');
					});
				}

				if(args['dragdrop'] !== undefined) {
					HTML.DragBox(document.getElementById(args['id']));
				}

				if(args['resize'] !== undefined){
					HTML.Resizeable(args['id']);
				}

				if(args['minimize'] !== undefined){
					HTML.MinimizeBox(div);
				}

				if(args['speaker'] !== undefined){
					$('#' + args['speaker']).addClass( localStorage.getItem(args['speaker']) );
				}

			}, 50
		);
	},


	/**
	 * Minimiert auf Klick die Box
	 *
	 * @param div
	 * @constructor
	 */
	MinimizeBox: (div)=> {
		let btn = $(div).find('.window-minimize');

		$(btn).bind('click', function(){
			let box = $(this).closest('.window-box'),
				open = box.hasClass('open');

			if(open === true){
				box.removeClass('open');
				box.addClass('closed');
			} else {
				box.removeClass('closed');
				box.addClass('open');
			}
		});
	},


	/**
	 * Macht eine HTML BOX DragAble
	 *
	 * @param el
	 */
	DragBox: (el)=> {

		document.getElementById(el.id + "Header").removeEventListener("mousedown", dragMouseDown);

		let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0, top = 0, left = 0, id;

		id = el.id;

		if (document.getElementById(el.id + "Header")) {
			document.getElementById(el.id + "Header").onmousedown = dragMouseDown;
		} else {
			el.onmousedown = dragMouseDown;
		}

		function dragMouseDown(e) {
			e = e || window.event;
			e.preventDefault();

			pos3 = e.clientX;
			pos4 = e.clientY;

			document.onmouseup = closeDragElement;
			document.onmousemove = elementDrag;
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

				document.onmouseup = null;
				document.onmousemove = null;
			}

			el.style.top = top + "px";
			el.style.left = left + "px";

			let cords = top + '|' + left;

			localStorage.setItem(id + 'Cords', cords);
		}

		function closeDragElement() {
			document.onmouseup = null;
			document.onmousemove = null;
		}
	},


	/**
	 * Box lässt sich in der Größe verändern
	 *
	 * @param id
	 * @constructor
	 */
	Resizeable: (id)=> {
		let box = $('#'+id),
			grip = $('<div />').addClass('window-grippy'),
			sizeLS = localStorage.getItem(id + 'Size');

		// Größe wurde definiert, setzten
		if(sizeLS !== null)
		{
			let s = sizeLS.split('|');

			// passt die Box von der Höhe her in den Viewport?
			// nein, Höhe wird automatisch gesetzt, Breite übernommen
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

		// Box wird in der GRöße verändert, speichern
		box.resizable({
			handleSelector: ".window-grippy",
			onDragEnd: (e, $el, opt)=>{
				let size = $el.width() + '|' + $el.height();

				localStorage.setItem(id + 'Size', size);
			},
		});
	},


	/**
	 * Formatiert Zahlen oder gibt = 0 einen "-" aus
	 *
	 * @param number
	 * @returns {*}
	 * @constructor
	 */
	Format: (number)=>{
		if(number === 0){
			return '-';
		} else {
			return Number(number).toLocaleString(i18n['Local']);
		}
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
			if(args.hasOwnProperty(key))
			{
				const regExp = new RegExp('__' + key + '__', 'g');
				string = string.replace(regExp, args[key]);
			}
		}
		return string;
	}
};
