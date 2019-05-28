/*
 * **************************************************************************************
 *
 * Dateiname:                 helper.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       28.05.19 09:22 Uhr
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
	multisort: function(arr, columns, order_by) {
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


HTML = {

	/**
	 * Erzeugt eine HTML Box im DOM
	 *
	 * @param id
	 * @param titel
	 * @param ask
	 * @constructor
	 */
	Box: (id, titel, ask = null)=> {
		let min = $('<span />').addClass('window-minimize'),
			close = $('<span />').attr('id', id + 'close').addClass('window-close'),
			title = $('<span />').addClass('title').text(titel),

			head = $('<div />').attr('id', id + 'Header').attr('class', 'window-head').append(title).append(min).append(close),
			body = $('<div />').attr('id', id + 'Body').attr('class', 'window-body'),
			div = $('<div />').attr('id', id).attr('class', 'window-box open').append( head ).append( body ),
			cords = localStorage.getItem(id + 'Cords');

		if(cords !== null){
			let c = cords.split('|');
			div.offset({ top: c[0], left: c[1]});
		}

		if(ask !== null){
			div.find(title).after( $('<span />').addClass('window-ask').attr('data-url', ask) );
		}

		$('body').append(div);

		setTimeout(
			()=> {

				$('body').on('click', '.window-ask', function(){
					window.open( $(this).data('url'), '_blank');
				});

				HTML.DragBox(document.getElementById(id));
				HTML.MinimizeBox(div);
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
			return new Intl.NumberFormat('de-DE', { style: 'decimal' }).format(number);
		}
	}
};


AntSocket = {

	InjectionLoaded: false,


	init: ()=> {

		AntSocket.Box();

		if(AntSocket.InjectionLoaded === false){
			WebSocket.prototype._send = WebSocket.prototype.send;

			WebSocket.prototype.send = function (data) {
				if(data !== 'PING'){
					// console.log("\u2192 ", JSON.parse(data));
					// AntSocket.BoxContent('out', JSON.parse(data));
				}

				this._send(data);

				this.addEventListener('message', function (msg) {
					if(msg.data !== 'PONG'){
						// console.log('\u2190', JSON.parse(msg.data));
						AntSocket.BoxContent('in', JSON.parse(msg.data));
					}


				}, false);

				this.send = function (data) {
					this._send(data);

					if(data !== 'PING'){
						// console.log("\u2192 ", JSON.parse(data));
						// AntSocket.BoxContent('out', JSON.parse(data));
					}
				};
			};

			AntSocket.InjectionLoaded = true;
		}
	},


	Box: ()=> {
		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if( $('#BHResultBox').length === 0 ){
			HTML.Box('BHResultBox', 'WebSocket Traffic');
		}

		let div = $('#BHResultBox'),
			h = [];

		h.push('<table id="BHResultBoxTable" class="foe-table">');

		h.push('<thead>');

		h.push('<tr>');
		h.push('<th width="1"><strong>Event / <em>Methode</em></strong></th>');
		h.push('<th><strong>Data</strong></th>');
		h.push('</tr>');

		h.push('</thead>');
		h.push('<tbody>');

		h.push('</tbody>');

		div.find('#BHResultBoxBody').html(h.join(''));
		div.show();

		div.resizable({
			resize: function( event, ui ) {
				$('#BHResultBoxBody').height( ui.size.height - 7 );
			}
		});

		$('body').on('click', '#BHResultBoxclose', ()=>{
			$('#BHResultBox').remove();
		});
	},


	BoxContent: (dir, data)=> {

		/*
		let Msg = data.find(obj => {
			return (obj.requestClass === 'ConversationService' && obj.requestMethod === 'getNewMessage') ||
				(obj.requestClass === 'GuildExpeditionService') ||
				(obj.requestClass === 'OtherPlayerService' && obj.requestMethod === 'newEvent');
		});

		if(Msg === undefined){
			return ;
		}
		*/

		let Msg = data[0];

		if(Msg === undefined || Msg['requestClass'] === undefined){
			return ;
		}

		if(Msg !== undefined && Msg['requestClass'] !== undefined && Msg['requestClass'] === 'FriendsTavernService' || (Msg !== undefined && Msg['requestClass'] !== undefined && Msg['requestClass'] === 'MessageService' && Msg['requestMethod'] === 'newMessage')){
			return ;
		}

		let tr = $('<tr />');

		tr.append(
			'<td>' + Msg['requestClass'] + '<br><em>' + Msg['requestMethod'] + '</em></td>' +
			'<td>' + JSON.stringify(Msg['responseData']) + '</td>'
		)

		$('#BHResultBoxTable tbody').prepend(tr);
	},
};