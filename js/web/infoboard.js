

/*
 * **************************************************************************************
 *
 * Dateiname:                 infoboard.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       06.09.19, 18:07 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let Infoboard = {

	InjectionLoaded: false,


	/**
	 * Setzt einen ByPass auf den WebSocket und "hört" mit
	 */
	init: ()=> {

		let StorageHeader = localStorage.getItem('ConversationsHeaders');

		// wenn noch nichts drin , aber im LocalStorage vorhanden, laden
		if(Conversations.length === 0 && StorageHeader !== null){
			Conversations = JSON.parse(StorageHeader);
		}

		Infoboard.Box();

		if(Infoboard.InjectionLoaded === false){
			WebSocket.prototype._send = WebSocket.prototype.send;

			WebSocket.prototype.send = function (data) {

				this._send(data);

				this.addEventListener('message', function(msg) {
					if(msg.data !== 'PONG'){
						Infoboard.BoxContent('in', JSON.parse(msg.data));
					}

				}, false);

				this.send = function (data) {
					this._send(data);
				};
			};

			Infoboard.InjectionLoaded = true;
		}
	},


	/**
	 * Erzeugt die Box wenn noch nicht im DOM
	 *
	 * @constructor
	 */
	Box: ()=> {

		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if( $('#BackgroundInfo').length === 0 ){
			HTML.Box('BackgroundInfo', i18n['Menu']['Info']['Title']);
		}

		let div = $('#BackgroundInfo'),
			h = [];

		h.push('<table id="BackgroundInfoTable" class="foe-table">');

		h.push('<thead>');

		h.push('<tr>');
		h.push('<th width="1">Typ</th>');
		h.push('<th><strong>Message</strong></th>');
		h.push('</tr>');

		h.push('</thead>');
		h.push('<tbody>');

		h.push('</tbody>');

		div.find('#BackgroundInfoBody').html(h.join(''));

		div.show();

		$('body').on('click', '#BackgroundInfoclose', ()=>{
			$('#BackgroundInfo').remove();
		});
	},


	/**
	 * Setzt eine neue Zeile für die Box zusammen
	 *
	 * @param dir
	 * @param data
	 * @constructor
	 */
	BoxContent: (dir, data)=> {

		let Msg = data[0];

		if(Msg === undefined || Msg['requestClass'] === undefined){
			return ;
		}

		let c = Msg['requestClass'],
			m = Msg['requestMethod'],
			t = Msg['responseData']['type'] || '',
			s = c + '_' + m + t;

		// Gibt es eine Funktion dafür?
		if (s in Info === false) {
			return ;
		}

		let bd = Info[s](Msg['responseData']),
			tr = $('<tr />'),
			msg = bd['msg'];

		tr.append(
			'<td>' + bd['type'] + '<br><small><em>' + moment().format('HH:mm:ss') + '</em></small></td>' +
			'<td>' + msg + '</td>'
		)

		$('#BackgroundInfoTable tbody').prepend(tr);
	},
};


let Info = {

	/**
	 *
	 * @param d
	 * @returns {{msg: string, type: string}}
	 * @constructor
	 */
	ItemAuctionService_updateBid: (d)=> {
		return {
			type: 'Auktion',
			msg: '<strong>' + d['player']['name'] + '</strong> hat gerade ' + d['amount'] + ' Münzen geboten'
		};
	},


	/**
	 * Nachricht von jemandem
	 *
	 * @param d
	 * @constructor
	 */
	ConversationService_getNewMessage: (d)=> {
		let msg;

		if(d['text'] !== ''){
			msg = d['text'].replace(/(\r\n|\n|\r)/gm,"<br>");

		} else if(d['attachment'] !== undefined){

			if(d['attachment']['type'] === 'trade_offer'){
				msg = d['attachment']['offeredAmount'] + ' ' + GoodsNames[d['attachment']['offeredResource']] +' &#187; ' + d['attachment']['neededAmount'] + ' ' + GoodsNames[d['attachment']['neededResource']];
			}
		}

		return {
			type: 'Nachricht',
			msg: Info.GetConversationHeader(d['conversationId'], d['sender']['name']) + msg
		};
	},


	/**
	 * LG wurde gelevelt
	 *
	 * @param d
	 * @returns {{msg: string, type: string}}
	 * @constructor
	 */
	OtherPlayerService_newEventgreat_building_contribution: (d)=> {

		return {
			type: 'Level-Up',
			msg: d['other_player']['name'] + '\'s "' + d['great_building_name'] + '" hat Stufe ' + d['level'] + ' erreicht.<br>Du hast Platz '+ d['rank'] + ' belegt'
		};
	},


	/**
	 *
	 *
	 * @param d
	 * @returns {{msg: string, type: string}}
	 * @constructor
	 */
	GuildExpeditionService_receiveContributionNotification: (d)=> {
		return {
			type: 'GEX',
			msg: '<strong>' + d['player']['name'] + '</strong> hat gerade ' + Number(d['expeditionPoints']).toLocaleString('de-DE') + ' Punkte in der GEX bekommen.'
		};
	},


	/**
	 * Sucht den Titel einer Nachricht heraus
	 *
	 * @param id
	 * @returns {string}
	 * @constructor
	 */
	GetConversationHeader: (id, name)=> {
		if(Conversations.length > 0){
			let header = Conversations.find(obj => (obj['id'] === id));

			if(header !== undefined){
				return '<div><strong style="color:#ffb539">' + header['title'] + '</strong> - <em>' + name + '</em></div>';
			}
		}

		return '';
	}
};
