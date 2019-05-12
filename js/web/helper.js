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

		return arr.sort(function (a,b) {
			return multisort_recursive(a,b,columns,order_by,0);
		});
	}
};


HTML = {

	/**
	 * Erzeugt eine HTML Box im DOM
	 *
	 * @param id
	 * @param title
	 * @constructor
	 */
	Box: (id, title)=> {
		let head = $('<div />').attr('id', id + 'Header').attr('class', 'window-head').html('<span class="title">' + title + '</span><span id="'+ id + 'close" class="window-close"></span>'),
			div = $('<div />').attr('id', id).attr('class', 'window-box').append( head ).append( $('<div />').attr('id', id + 'Body').attr('class', 'window-body') );


		$('body').append(div);

		setTimeout(
			() => {
				HTML.dragElement(document.getElementById(id));
			}, 50
		);
	},


	/**
	 * Macht eine HTML BOX DragAble
	 *
	 * @param el
	 */
	dragElement: (el)=> {

		document.getElementById(el.id + "Header").removeEventListener("mousedown", dragMouseDown);

		// document.getElementById(el.id + "Header").onmousedown = null;
		document.onmouseup = null;
		document.onmousemove = null

		let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

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

			el.style.top = (el.offsetTop - pos2) + "px";
			el.style.left = (el.offsetLeft - pos1) + "px";
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
	},


	/**
	 * Konvertierung von Unix zu "lesbar"
	 *
	 * @param timestamp
	 * @returns {string}
	 */
	timeConvert: (timestamp) => {
	let a = new Date(timestamp * 1000),
		months = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
		year = a.getFullYear(),
		month = months[a.getMonth()],
		day = a.getDate(),
		hour = a.getHours(),
		min = a.getMinutes(),
		sec = a.getSeconds(),
		r = {
			day: day,
			month: month,
			year: year,
			hour: hour,
			min: min,
			sec: sec
		};

		return r;
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