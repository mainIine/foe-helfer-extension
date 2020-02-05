/*
 * **************************************************************************************
 *
 * Dateiname:                 ws-chat.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 14:12 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let Chat = {

	GildID: 0,
	PlayerID: 0,
	World: '',
	OtherPlayers: [],
	PlayersPortraits: {},
	OnlinePlayers: [],
	OwnName: '',
	WebsocketChat : null,
	ReadMode: 'live',
	Token: '',
	ConnectionId: '',
	InnoCDN: '',

	/**
	 * Holt die Daten für den Chat
	 */
	getData: ()=> {

		let data = Object.fromEntries( new URLSearchParams(location.search) );

		Chat.GildID = +data['guild'];
		Chat.PlayerID = +data['player'];
		Chat.World = data['world'];

		Chat.loadPortraits();

		let pD = localStorage.getItem('PlayersData'),
			pT = localStorage.getItem('PlayersDataTimestamp');


		// prüfen ob es eine gültige Cache Version gibt
		if(pD === null || pT === null || Chat.compareTime(new Date().getTime(), pT) === false)
		{
			console.log('AJAX-getData-Members4Chat')
			// $.ajax({
			// 	type: 'POST',
			// 	url: 'https://api.foe-rechner.de/Members4Chat/?guild_id=' + data['guild'] + '&world=' + data['world'],
			// 	dataType: 'json',
			// 	success: function(r){

			// 		localStorage.setItem('PlayersData', JSON.stringify(r['data']));
			// 		localStorage.setItem('PlayersDataTimestamp', Chat.getTimestamp(12));

			// 		Chat.OtherPlayers = r['data'];

			// 		// alles da, zünden
			// 		Chat.Init();
			// 	}
			// });

		} else {
			Chat.OtherPlayers = JSON.parse(pD);

		}

		chrome.runtime.sendMessage({
			type: 'getInnoCDN'
		}, ([cdn, wasSet]) => Chat.InnoCDN = cdn);
		
		chrome.runtime.sendMessage({
			type: 'getPlayerData'
		}, (data) => {
			if(!data) return;
			let Player = Chat.OtherPlayers.find(p => p.player_id === Chat.PlayerID);
			if (Player) {
				Player.player_name = data.name;
				Player.avatar = data.portrait;
			} else {
				Chat.OtherPlayers.push({player_id: Chat.PlayerID, player_name: data.name, avatar: data.portrait});
			}
		});

		// alles da, zünden
		Chat.Init();
	},


	/**
	 * Zündet die Chatbox und stellt eine Verbindung mit dem WebSocket Server her
	 */
	Init: ()=> {

		const template = document.createElement('template');
		template.innerHTML = `
			<div class="chat-wrapper">
				<div id="users"><div class="head">Im Raum <span id="modus"><i title="Lesemodus deaktiviert" class="fa fa-eye-slash" aria-hidden="true"></i></span></div></div>
				<div class="message_box" id="message_box"></div>
			</div>
			<div class="chat-panel">
				<input id="message-input" autocomplete="off" spellcheck="false" aria-autocomplete="none"><button id="send-btn">Senden</button>
			</div>
		`;

		const box = document.getElementById('ChatBody');
		box.appendChild(template.content);
		//$('#ChatBody').append(div);


		setTimeout(
			function(){
				Chat.Functions();
				Chat.Members();

				// alles geladen, Loader entfernen
				document.getElementById('ChatBody').classList.remove('loader');
				// $('#ChatBody').removeClass('loader');
			}, 100
		);

		// get a random connection id if this tab doesn't already have one
		let connectionId = sessionStorage.getItem('websocket-connection-id') || '';
		if (!connectionId) {
			var randArray = new Uint8Array(24);
			window.crypto.getRandomValues(randArray);
			const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!$";
			let rest = 0;
			let bits = 0;
			for (let i = 0; i<24; i++) {
				rest = rest << 8 | randArray[i];
				bits += 8;
				while (bits >= 6) {
					bits -= 6;
					let num = (rest >> bits) & 0x3f;
					connectionId += chars[num];
				}
			}
			sessionStorage.setItem('websocket-connection-id', connectionId);
		}
		Chat.ConnectionId = connectionId;
		
		let wsUri = 'ws://ws.foe-rechner.de:9000/';

		Chat.WebsocketChat = new WebSocket(wsUri);


		// Verbindung wurde hergestellt
		Chat.WebsocketChat.onopen = ()=> {
			Chat.WebsocketChat.send(
				JSON.stringify({
					world: Chat.World,
					guild: Chat.GildID,
					player: Chat.PlayerID,
					connectionId: connectionId,
					secret:'trust me!'
				})
			);
			Chat.SystemRow('Verbunden!', 'success');

			// setTimeout(
			// 	function(){
			// 		Chat.SendMsg('onlyOthers', 'entered');
			// 	}, 500
			// );
		};


		// jemand anderes hat etwas geschrieben
		Chat.WebsocketChat.onmessage = function(ev) {
			let msg = JSON.parse(ev.data);

			Chat.TextRow(msg);
		};


		// Error, da geht was nicht
		Chat.WebsocketChat.onerror	= function(ev){
			Chat.SystemRow('Es ist ein Fehler aufgetreten - ' + ev.data, 'error');
		};


		// User hat das [X] geklickt
		Chat.WebsocketChat.onclose 	= function(){
			Chat.SystemRow('Verbindung geschlossen', 'error');
		};
	},


	/**
	 * Bindet die Funktionen der Buttons an Events
	 *
	 */
	Functions: ()=> {

		// User benutzt [Enter] zum schreiben
		document.getElementById('message-input').addEventListener('keydown', function(e) {
			if (e.which == 13 || e.keyCode == 13) {
				e.preventDefault();

				Chat.SendMsg();
			}
		});

		document.getElementById('send-btn').addEventListener('click', function(){
			Chat.SendMsg()
		});

		document.getElementById('modus').addEventListener('click', function(){
			if( Chat.ReadMode === 'live' ){
				Chat.ReadMode = 'read';
				document.querySelector('.head span').innerHTML = '<i title="Lesemodus aktivert" class="fa fa-eye" aria-hidden="true"></i>';
				// $('.head').find('span').html('<i title="Lesemodus aktivert" class="fa fa-eye" aria-hidden="true"></i>');
			} else {
				Chat.ReadMode = 'live';
				document.querySelector('.head span').innerHTML = '<i title="Lesemodus deaktiviert" class="fa fa-eye-slash" aria-hidden="true"></i>';
				// $('.head').find('span').html('<i title="Lesemodus deaktiviert" class="fa fa-eye-slash" aria-hidden="true"></i>');
			}
		});

		Chat.EmoticonBar();
		Chat.FindUserName();

		// https://github.com/joypixels/emojify.js/blob/master/src/emojify.js
		emojify.setConfig({
			img_dir: '../../../../../vendor/emoyify/images/emoji'
		});

		document.getElementById('message-input').focus();
		// $('#message-input').focus();

		window.addEventListener('beforeunload', /*$(window).on("beforeunload",*/ function(){

			this.document.getElementById('ChatBody').classList.add('loader');
			// $('#ChatBody').addClass('loader');

			Chat.Close();

			console.log('AJAX-Functions-BeforeUnload')
			// $.ajax({
			// 	type: 'POST',
			// 	async: false,
			// 	data: {room_id: 1, dir: 'leave'},
			// 	url: 'https://api.foe-rechner.de/GuildChat/?guild_id=' + Chat.GildID + '&player_id=' + Chat.PlayerID + '&world=' + Chat.World
			// });
		});
	},


	/**
	 * Holt alle "anwesenden" aus der DB
	 *
	 */
	Members: ()=> {
		console.log('AJAX-Members')
		// $.ajax({
		// 	type: 'POST',
		// 	url: 'https://api.foe-rechner.de/GuildChat/?guild_id=' + Chat.GildID + '&player_id=' + Chat.PlayerID + '&world=' + Chat.World,
		// 	data: {room_id: 1, dir: 'enter'},
		// 	dataType: 'json',
		// 	success: function(r){

		// 		for(let i in r['data']){

		// 			let Player = Chat.OtherPlayers.find(obj => {
		// 				return obj.player_id === r['data'][i];
		// 			});

		// 			if(Player['player_id'] === Chat.PlayerID){
		// 				Chat.OwnName =  Player['player_name'];
		// 			}

		// 			Chat.UserEnter(Player);
		// 		}
		// 	}
		// });
	},


	/**
	 * Nachricht senden
	 *
	 */
	SendMsg: (type, SystemMsg)=> {
		let MyMsg = SystemMsg !== undefined ? SystemMsg : /** @type {HTMLInputElement} */(document.getElementById('message-input')).value//$('#message-input').val();

		if(MyMsg === ''){
			return;
		}

		// $('.emoticon-bar').removeClass('show');
		document.querySelector('.emoticon-bar').classList.remove('show');

		// let today = new Date(),
		// 	HH = today.getHours(),
		// 	ii = today.getMinutes(),
		// 	ss = today.getSeconds(),
		// 	dateTime;

		// if(HH < 10) HH = '0' + HH;
		// if(ii < 10) ii = '0' + ii;
		// if(ss < 10) ss = '0' + ss;

		// dateTime = HH + ':' + ii + ':' + ss;

		let msg = {
			message: MyMsg,
			from: Chat.PlayerID,
			time: Date.now(),
			type: 'message'
		};

		Chat.WebsocketChat.send(JSON.stringify({message: MyMsg}));

		if(type !== 'onlyOthers'){
			Chat.TextRow(msg);
		}

		// $('#message-input').val('');
		/** @type {HTMLInputElement} */(document.getElementById('message-input')).value = '';
	},


	/**
	 * Setzt einen Nachrichtenzeile für die Chatbox zusammen
	 *
	 * @param id
	 * @param text
	 * @param time
	 */
	TextRow: (message)=> {
		// let PlayerName = '',
		// 	PlayerImg = '',
		// 	ExtClass = '',
		// 	TextR = '';

		/**
		 * Communication:
		 * 
		 * Client:
		 * connect setup message:
		 *  {world: string, guild: number, player: number, connectionId: string, secret?: string}  // limits: world.length<5, guild & player: integer>=0
		 * For each Message to send:
		 *  {message: string, secretOnly?: boolean} // limit: message.length < 1024
		 * 
		 * Server:
		 * after connection setup message:
		 *  {type: 'members', members:  {playerId: number, secretsMatch: boolean}[]} // list of playerID's in this chat-room and weather theire 
		 * on error/ping timeout:
		 *  {type: 'error', error: string}
		 * 
		 * on player join:
		 *  {type: 'switch', player: number, time: number, secretsMatch: boolean} // player was in room and switched connection
		 *  {type: 'join', player: number, time: number,secretsMatch: boolean} // player entered room
		 * on player leave:
		 *  {type: 'leave', player: number, time: number}
		 * on players secretMatching changed:
		 *  {type: 'secretChange', player: number, secretsMatch: boolean}
		 * 
		 * on message:
		 *  {type: 'message', message: string, from: number, time: number, secretOnly: boolean}
		 * 
		 * on connection with other device:
		 *  {type: 'disconnect', reason: string}
		 */

		switch (message.type) {
			case 'members': {
				/** @type {{playerId: number, secretsMatch: boolean}[]} */
				const members = message.members;
				// TODO: verwende diese liste von playerID's um die Anzeige zu füllen
				for (let data of members) {
					let {playerId: player_id, secretsMatch} = data;
					const Player = Chat.OtherPlayers.find(p => p.player_id === player_id)||{player_name: 'Unbekannt'+(secretsMatch?'(trusted)':'')+'#'+player_id,player_id};
					Chat.UserEnter(Player);
				}
				break;
			}
			case 'message': {
				const player_id = message.from;
				if (player_id === Chat.PlayerID) {
					let TextR = emojify.replace(message.message);
					TextR = Chat.MakeImage(TextR);
					TextR = Chat.MakeURL(TextR);
		
					Chat.SmallBox('user-self', TextR, '', Chat.timeStr(message.time));
		
				} else {
					const Player = Chat.OtherPlayers.find(p => p.player_id === player_id)||{player_name: 'Unbekannt#'+player_id,player_id};
		
					const PlayerName = Player['player_name'];
					// TODO: fix image url
					const PlayerImg = '';//'https://foede.innogamescdn.com/assets/shared/avatars/' + Chat.PlayersPortraits[Player['avatar']] + '.jpg';
					let TextR = Chat.MakeImage(message.message);
					TextR = emojify.replace(TextR);
					TextR = Chat.MakeURL(TextR);
		
					Chat.BigBox('user-other', TextR, PlayerImg, PlayerName, Chat.timeStr(message.time));
		
					Chat.PlaySound('notification-sound');
				}
				break;
			}
			case 'switch': {
				const player_id = message.player;
				const Player = Chat.OtherPlayers.find(p => p.player_id === player_id)||{player_name: 'Unbekannt#'+player_id,player_id};
				const TextR = '<em>' + Player['player_name'] + ' hat den Chat erneut betreten</em>';
				Chat.UserEnter(Player);
				Chat.PlaySound('user-enter');
				Chat.SmallBox('user-notification', TextR, '', Chat.timeStr(message.time));
				break;
			}
			case 'join': {
				const player_id = message.player;
				const Player = Chat.OtherPlayers.find(p => p.player_id === player_id)||{player_name: 'Unbekannt#'+player_id,player_id};
				const TextR = '<em>' + Player['player_name'] + ' hat den Chat betreten</em>';
				Chat.UserEnter(Player);
				Chat.PlaySound('user-enter');
				Chat.SmallBox('user-notification', TextR, '', Chat.timeStr(message.time));
				break;
			}
			case 'leave': {
				const player_id = message.player;
				const Player = Chat.OtherPlayers.find(p => p.player_id === player_id)||{player_name: 'Unbekannt#'+player_id,player_id};
				const TextR = '<em>' + Player['player_name'] + ' ist gegangen</em>';
				Chat.UserLeave(Player);
				Chat.PlaySound('user-leave');
				Chat.SmallBox('user-notification', TextR, '', Chat.timeStr(message.time));
				break;
			}
			case 'disconnect':
			case 'error': {
				break;
			}
		}

		// if (id === Chat.PlayerID) {
		// 	PlayerName = '';
		// 	ExtClass = 'user-self';
		// 	TextR = emojify.replace(text);
		// 	TextR = Chat.MakeImage(TextR);
		// 	TextR = Chat.MakeURL(TextR);

		// 	Chat.SmallBox(ExtClass, TextR, PlayerName, time);

		// } else if(type === 'onlyOthers'){
		// 	let Player = Chat.OtherPlayers.find(obj => {
		// 		return obj.player_id === id;
		// 	});

		// 	if(text === 'entered'){
		// 		TextR = '<em>' + Player['player_name'] + ' hat den Chat betreten</em>';
		// 		Chat.UserEnter(Player);
		// 		Chat.PlaySound('user-enter');

		// 	} else if(text === 'leaved') {
		// 		TextR = '<em>' + Player['player_name'] + ' ist gegangen</em>';
		// 		Chat.UserLeave(Player);
		// 		Chat.PlaySound('user-leave');
		// 	}

		// 	ExtClass = 'user-notification';
		// 	PlayerName = '';

		// 	Chat.SmallBox(ExtClass, TextR, PlayerName, time);

		// } else {

		// 	let Player = Chat.OtherPlayers.find(obj => {
		// 		return obj.player_id === id;
		// 	});

		// 	PlayerName = Player['player_name'];
		// 	PlayerImg = 'https://foede.innogamescdn.com/assets/shared/avatars/' + Chat.PlayersPortraits[Player['avatar']] + '.jpg';
		// 	ExtClass = 'user-other';
		// 	TextR = Chat.MakeImage(text);
		// 	TextR = emojify.replace(TextR);
		// 	TextR = Chat.MakeURL(TextR);

		// 	Chat.BigBox(ExtClass, TextR, PlayerImg, PlayerName, time);

		// 	Chat.PlaySound('notification-sound');
		// }

		if( Chat.ReadMode === 'live' ){
			// TODO: fix animation
			const box = document.getElementById('message_box');
			box.scrollTop = box.scrollHeight;
			// $('#message_box').animate({
			// 	scrollTop: $('#message_box').prop('scrollHeight')
			// });
		}
	},


	/**
	 * Passenden Sound abspielen
	 *
	 * @param id
	 * @param vol
	 */
	PlaySound: (id, vol = 0.4)=> {
		// wenn der CHat im Hintergrund liegt, Ping machen
		if (document.hasFocus() === false){
			const audio = /** @type {HTMLAudioElement} */(document.getElementById(id));
			audio.volume = vol;
			audio.play();
		}
	},


	/**
	 * Zeile des Users mit Name und Bild einfügen
	 *
	 * @param Player
	 */
	UserEnter: (Player)=> {

		// Spieler ist bereits in der Liste
		if( document.querySelector('[data-id="' + Player['player_id'] +'"]')){
			return;
		}

		const d = document.createElement('div');
		d.dataset.id = Player['player_id'];

		const img = document.createElement('img');
		// TODO: fix url
		//img.src = 'https://foede.innogamescdn.com/assets/shared/avatars/' + Chat.PlayersPortraits[Player['avatar']] + '.jpg';

		const s = document.createElement('span');
		s.innerText = Player['player_name'];
		d.appendChild(s);
		
		// let pR = $('<div />').addClass('player').attr('data-id', Player['player_id'])
		// 	.append( $('<img />').attr('src', 'https://foede.innogamescdn.com/assets/shared/avatars/' + Chat.PlayersPortraits[Player['avatar']] + '.jpg') )
		// 	.append( $('<span />').text( Player['player_name'] ) );

		document.getElementById('users').appendChild(d);
		// $('#users').append(pR);

		Chat.OnlinePlayers.push(Player['player_name']);
	},


	/**
	 * User verlässt den Chat
	 *
	 * @param Player
	 */
	UserLeave: (Player)=> {
		if( Chat.ReadMode === 'live' ){
			// TODO: fix animation
			const box = document.getElementById('message_box');
			box.scrollTop = box.scrollHeight;
			// $('[data-id="' + Player['player_id'] + '"]').fadeToggle(function(){
			// 	$(this).remove();
			// });
		}

		if(Chat.OnlinePlayers[Player['player_name']] !== undefined){
			delete Chat.OnlinePlayers[Player['player_name']];
		}
	},


	/**
	 * schmale Text-Zeile für Status + eigener Text
	 *
	 * @param Class
	 * @param Text
	 * @param Name
	 * @param Time
	 */
	SmallBox: (Class, Text, Name, Time)=> {
		const template = document.createElement('template');
		template.innerHTML = 
			'<div class="' + Class + '">' +
				'<span class="user-message">' + Text + '</span>' +
				'<div class="message-data">' +
					'<span class="user-name">' + Name + '</span>' +
					'<span class="message-time">' + Time + ' Uhr</span>' +
				'</div>' +
			'</div>'
		;

		document.getElementById('message_box').appendChild(template.content);
	},


	/**
	 * Text-Zeile mit Avatar, Gesprächspartner
	 *
	 * @param Class
	 * @param Text
	 * @param Img
	 * @param Name
	 * @param Time
	 */
	BigBox: (Class, Text, Img, Name, Time) => {

		Text = Chat.MarkUserName(Text);

		const template = document.createElement('template');
		template.innerHTML =
			'<div class="big-box ' + Class + '">' +
				'<div class="image">' +
					'<img src="' + Img + '" alt="">' +
				'</div>' +
				'<div>' +
					'<span class="user-message">' + Text + '</span>' +
					'<div class="message-data">' +
						'<span class="user-name">' + Name + '</span>' +
						'<span class="message-time">' + Time + ' Uhr</span>' +
					'</div>' +
				'</div>' +
			'</div>'
		;

		document.getElementById('message_box').appendChild(template.content);
	},


	/**
	 * Player vorschlagen die dann farblich markiert werden
	 *
	 */
	FindUserName: ()=> {
		document.getElementById('message-input').addEventListener('keyup', /*$('#message-input').on('keyup',*/ function(e){
			let t = /** @type {HTMLInputElement} */(e.currentTarget).value/*$(this).val()*/.toLowerCase(),
				tl = t.slice(1, t.length),
				found = [];

			if( t.slice(0, 1) === '@' && t.length > 2 ){

				// Alle Online Spieler durchsteppen
				for(let i in Chat.OnlinePlayers)
				{
					// den eigenen Namen übersrpingen
					if(Chat.OnlinePlayers[i] === Chat.OwnName)
					{
						continue;
					}

					// passen die getippten Buchstaben auf einen Namen?
					if(Chat.OnlinePlayers[i].toLowerCase().slice(0, tl.length) === tl)
					{
						found.push('<li>' + Chat.OnlinePlayers[i] + '</li>');
					}
				}

				if( found.length > 0){
					if( !document.getElementById('player-result')/*$('#player-result').length === 0*/ ){
						//let d = $('<div />').attr('id', 'player-result').hide().append( $('<ul />') );
						const d = document.createElement('div');
						d.id = 'player-result';
						d.style.display = 'none';
						d.appendChild(document.createElement('ul'));

						document.querySelector('.chat-panel').appendChild(d);
						// $('.chat-panel').append( d );
					}

					// let ul = $('#player-result ul');
					const ul = document.querySelector('#player-result ul');

					// ul.html( found.join('') );
					// $('#player-result').show();
					ul.innerHTML = found.join();
					document.getElementById('player-result').style.display = '';

				} else if( $('#player-result').length > 0){
					const ul = document.querySelector('#player-result ul');
					if (ul) ul.innerHTML = '';
					const result = document.getElementById('player-result');
					if (result) result.style.display = 'none';
						// $('#player-result').hide();
					// $('#player-result ul').html('');
				}

			} else {
				const ul = document.querySelector('#player-result ul');
				if (ul) ul.innerHTML = '';
				const result = document.getElementById('player-result');
				if (result) result.style.display = 'none';
				// $('#player-result').hide();
				// $('#player-result ul').html('');
			}
		});

		// Treffer wurde angeklickt
		// $('body').on('click', '#player-result ul li', function(){
		// 	$('#message-input').val( '@' + $(this).text() + ': ' );

		// 	$('#player-result').hide();
		// 	$('#player-result ul').html('');
		// 	$('#message-input').focus();
		// });
		document.addEventListener('click', e => {
			if (/** @type {HTMLElement} */(e.target).matches('#player-result ul li')) {
				const input = /** @type {HTMLInputElement} */(document.getElementById('message-input'));
				input.value = '@' + $(this).text() + ': ';
				input.focus();
				document.querySelector('#player-result ul').innerHTML = '';
				document.getElementById('player-result').style.display = 'none';
			}
		});
	},


	/**
	 * Ist der Text eine URL?
	 *
	 * @param text
	 * @returns {*}
	 */
	MakeURL: (text)=> {

		let regex = new RegExp('^(https?:\\/\\/)?'+ // protocol
			'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
			'((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
			'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
			'(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
			'(\\#[-a-z\\d_]*)?$','i'); // fragment locator

		if(regex.test(text)){
			return '<a href="'+ text +'" target="_blank">'+ ((text.length > 45) ? text.substring(0, 45) + '...' : text) +'</a>';

		} else {
			return text;
		}
	},


	/**
	 * Ist der Text eine Bild-URL
	 *
	 * @param text
	 * @returns {*}
	 */
	MakeImage: (text)=> {
		let expression = '^https?://(?:[a-z0-9\-]+\.)+[a-z]{2,6}(?:/[^/#?]+)+\.(?:jpg|gif|png)$',
			regex = new RegExp(expression);

		if(text.match(regex)){
			return '<a href="'+ text +'" target="_blank"><img src="'+ text +'" alt="" class="image-preview"></a>';
		} else {
			return text;
		}
	},


	/**
	 * Wenn der eigenen Namen erwähnt wird, markieren
	 *
	 * @param text
	 * @returns {void | string}
	 */
	MarkUserName: (text)=> {

		let expression = '^(@.*?:)',
			regex = new RegExp(expression),
			check = text.match(regex);

		if(check !== null && check[0] === '@' + Chat.OwnName + ':'){
			text = text.replace(check[0], '<span class="mark-user">' + check[0].slice(0, -1) + '</span>');
		}

		return text;
	},


	/**
	 *	System Nachricht
	 *
	 * @param text
	 */
	SystemRow: (text, type)=> {
		const box = document.getElementById('message_box');

		const s = document.createElement('span');
		s.classList.add(type);
		s.innerText = text;
		
		const d = document.createElement('div');
		d.classList.add('system-message');
		d.appendChild(s);

		box.appendChild(d);

		// $('#message_box').append(
		// 	'<div class="system-message">' +
		// 	'<span class="' + type + '">' + text + '</span>' +
		// 	'</div>'
		// );

		// $('#message_box').animate({
		// 	scrollTop: $('#message_box').prop('scrollHeight')
		// });
	},


	/**
	 * Trennt die Verbindung
	 *
	 */
	Close: ()=> {

		console.log('AJAX-Close')
		//$.post('https://api.foe-rechner.de/GuildChat/?guild_id=' + Chat.GildID + '&player_id=' + Chat.PlayerID + '&world=' + Chat.World, {room_id: 1, dir: 'leave'});

		//Chat.SendMsg('onlyOthers', 'leaved');

		setTimeout(
			function(){
				Chat.WebsocketChat.close();
			}, 500
		);
	},


	/**
	 *
	 */
	EmoticonBar: ()=> {
		let icons = Chat.EmoticonBarIcons(),
			bar = document.createElement('div')//$('<div />').addClass('emoticon-bar');
		bar.classList.add('emoticon-bar');

		for(let i in icons)
		{
			if(icons.hasOwnProperty(i)){
				const img = document.createElement('img');
				img.classList.add('add-icon');
				img.src = '/vendor/emoyify/images/emoji/'+ icons[i] +'.png';
				img.setAttribute('alt', ':'+ icons[i] +':');
				img.setAttribute('title', ':'+ icons[i] +':');
				bar.appendChild(img);
				// bar.append(
				// 	$('<img />').addClass('add-icon').attr('src', '../vendor/emoyify/images/emoji/'+ icons[i] +'.png').attr('alt', ':'+ icons[i] +':').attr('title', ':'+ icons[i] +':')
				// );
			}
		}

		document.body.appendChild(bar);
		//$('body').append(bar);

		//let btn = $('<img />').attr('src', '../css/images/face.png').addClass('toggle-emoticon-bar');
		const btn = document.createElement('img');
		btn.src = '../images/face.png';
		btn.classList.add('toggle-emoticon-bar');


		document.querySelector('.chat-panel').appendChild(btn);
		//$('.chat-panel').append(btn);

		// Functions

		btn.addEventListener('click', /*$('body').on('click', '.toggle-emoticon-bar',*/ function()
		{
			document.querySelector('.emoticon-bar').classList.toggle('show');
			// if( $('.emoticon-bar').hasClass('show') ){
			// 	$('.emoticon-bar').removeClass('show');

			// } else {
			// 	$('.emoticon-bar').addClass('show');
			// }
		});


		document.body.addEventListener('click', e => {
			const target = /** @type {HTMLElement} */(e.target);
			if (target.classList.contains('add-icon')) {
				const ico = target.getAttribute('alt');
				const input = /** @type {HTMLInputElement} */(document.getElementById('message-input'))
				input.value += ' ' + ico;
			}
		});
		// $('body').on('click', '.add-icon', function()
		// {
		// 	let ico = $(this).attr('alt'),
		// 		val = $('#message-input').val();

		// 	$('#message-input').val( val + ' ' + ico);
		// })
	},


	/**
	 * Icons für den Chat
	 *
	 * @returns {string[]}
	 */
	EmoticonBarIcons: ()=> {
		return 'angry,anguished,astonished,blush,bowtie,cold_sweat,disappointed_relieved,confounded,confused,cry,disappointed,dizzy_face,expressionless,flushed,fearful,frowning,grimacing,grin,grinning,heart_eyes,hushed,innocent,joy,kissing,laughing,mask,neutral_face,no_mouth,open_mouth,pensive,persevere,relaxed,relieved,satisfied,scream,sleeping,sleepy,smile,smiley,smirk,stuck_out_tongue,stuck_out_tongue_closed_eyes,stuck_out_tongue_winking_eye,sunglasses,sob,sweat,triumph,tired_face,unamused,wink,worried,yum,+1,-1,100,1234,8ball,a,ab,abc,abcd,accept,aerial_tramway,airplane,alarm_clock,alien,ambulance,anchor,angel,anger,ant,apple,aquarius,aries,arrow_backward,arrow_double_down,arrow_double_up,arrow_down,arrow_down_small,arrow_forward,arrow_heading_down,arrow_heading_up,arrow_left,arrow_lower_left,arrow_lower_right,arrow_right,arrow_right_hook,arrow_up,arrow_up_down,arrow_up_small,arrow_upper_left,arrow_upper_right,arrows_clockwise,arrows_counterclockwise,art,articulated_lorry,atm,b,baby,baby_bottle,baby_chick,baby_symbol,back,baggage_claim,balloon,ballot_box_with_check,bamboo,banana,bangbang,bank,bar_chart,barber,baseball,basketball,bath,bathtub,battery,bear,bee,beer,beers,beetle,beginner,bell,bento,bicyclist,bike,bikini,bird,birthday,black_circle,black_joker,black_medium_small_square,black_medium_square,black_nib,black_small_square,black_square,black_square_button,blossom,blowfish,blue_book,blue_car,blue_heart,boar,boat,bomb,book,bookmark,bookmark_tabs,books,boom,boot,bouquet,bow,bowling,boy,bread,bride_with_veil,bridge_at_night,briefcase,broken_heart,bug,bulb,bullettrain_front,bullettrain_side,bus,busstop,bust_in_silhouette,busts_in_silhouette,cactus,cake,calendar,calling,camel,camera,cancer,candy,capital_abcd,capricorn,car,card_index,carousel_horse,cat,cat2,cd,chart,chart_with_downwards_trend,chart_with_upwards_trend,checkered_flag,cherries,cherry_blossom,chestnut,chicken,children_crossing,chocolate_bar,christmas_tree,church,cinema,circus_tent,city_sunrise,city_sunset,cl,clap,clapper,clipboard,clock1,clock10,clock1030,clock11,clock1130,clock12,clock1230,clock130,clock2,clock230,clock3,clock330,clock4,clock430,clock5,clock530,clock6,clock630,clock7,clock730,clock8,clock830,clock9,clock930,closed_book,closed_lock_with_key,closed_umbrella,cloud,clubs,cn,cocktail,coffee,collision,computer,confetti_ball,congratulations,construction,construction_worker,convenience_store,cookie,cool,cop,copyright,corn,couple,couple_with_heart,couplekiss,cow,cow2,credit_card,crescent_moon,crocodile,crossed_flags,crown,crying_cat_face,crystal_ball,cupid,curly_loop,currency_exchange,curry,custard,customs,cyclone,dancer,dancers,dango,dart,dash,date,de,deciduous_tree,department_store,diamond_shape_with_a_dot_inside,diamonds,dizzy,do_not_litter,dog,dog2,dollar,dolls,dolphin,donut,door,doughnut,dragon,dragon_face,dress,dromedary_camel,droplet,dvd,e-mail,ear,ear_of_rice,earth_africa,earth_americas,earth_asia,egg,eggplant,eight,eight_pointed_black_star,eight_spoked_asterisk,electric_plug,elephant,email,end,envelope,es,euro,european_castle,european_post_office,evergreen_tree,exclamation,eyeglasses,eyes,facepunch,factory,fallen_leaf,family,fast_forward,fax,feelsgood,feet,ferris_wheel,file_folder,finnadie,fire,fire_engine,fireworks,first_quarter_moon,first_quarter_moon_with_face,fish,fish_cake,fishing_pole_and_fish,fist,five,flags,flashlight,floppy_disk,flower_playing_cards,foggy,football,fork_and_knife,fountain,four,four_leaf_clover,fr,free,fried_shrimp,fries,frog,fu,fuelpump,full_moon,full_moon_with_face,game_die,gb,gem,gemini,ghost,gift,gift_heart,girl,globe_with_meridians,goat,goberserk,godmode,golf,grapes,green_apple,green_book,green_heart,grey_exclamation,grey_question,guardsman,guitar,gun,haircut,hamburger,hammer,hamster,hand,handbag,hankey,hash,hatched_chick,hatching_chick,headphones,hear_no_evil,heart,heart_decoration,heart_eyes_cat,heartbeat,heartpulse,hearts,heavy_check_mark,heavy_division_sign,heavy_dollar_sign,heavy_exclamation_mark,heavy_minus_sign,heavy_multiplication_x,heavy_plus_sign,helicopter,herb,hibiscus,high_brightness,high_heel,hocho,honey_pot,honeybee,horse,horse_racing,hospital,hotel,hotsprings,hourglass,hourglass_flowing_sand,house,house_with_garden,hurtrealbad,ice_cream,icecream,id,ideograph_advantage,imp,inbox_tray,incoming_envelope,information_desk_person,information_source,interrobang,iphone,it,izakaya_lantern,jack_o_lantern,japan,japanese_castle,japanese_goblin,japanese_ogre,jeans,joy_cat,jp,key,keycap_ten,kimono,kiss,kissing_cat,kissing_face,kissing_heart,kissing_smiling_eyes,koala,koko,kr,large_blue_circle,large_blue_diamond,large_orange_diamond,last_quarter_moon,last_quarter_moon_with_face,leaves,ledger,left_luggage,left_right_arrow,leftwards_arrow_with_hook,lemon,leo,leopard,libra,light_rail,link,lips,lipstick,lock,lock_with_ink_pen,lollipop,loop,loudspeaker,love_hotel,love_letter,low_brightness,m,mag,mag_right,mahjong,mailbox,mailbox_closed,mailbox_with_mail,mailbox_with_no_mail,man,man_with_gua_pi_mao,man_with_turban,mans_shoe,maple_leaf,massage,meat_on_bone,mega,melon,memo,mens,metal,metro,microphone,microscope,milky_way,minibus,minidisc,mobile_phone_off,money_with_wings,moneybag,monkey,monkey_face,monorail,mortar_board,mount_fuji,mountain_bicyclist,mountain_cableway,mountain_railway,mouse,mouse2,movie_camera,moyai,muscle,mushroom,musical_keyboard,musical_note,musical_score,mute,nail_care,name_badge,neckbeard,necktie,negative_squared_cross_mark,new,new_moon,new_moon_with_face,newspaper,ng,nine,no_bell,no_bicycles,no_entry,no_entry_sign,no_good,no_mobile_phones,no_pedestrians,no_smoking,non-potable_water,nose,notebook,notebook_with_decorative_cover,notes,nut_and_bolt,o,o2,ocean,octocat,octopus,oden,office,ok,ok_hand,ok_woman,older_man,older_woman,on,oncoming_automobile,oncoming_bus,oncoming_police_car,oncoming_taxi,one,open_file_folder,open_hands,ophiuchus,orange_book,outbox_tray,ox,package,page_facing_up,page_with_curl,pager,palm_tree,panda_face,paperclip,parking,part_alternation_mark,partly_sunny,passport_control,paw_prints,peach,pear,pencil,pencil2,penguin,performing_arts,person_frowning,person_with_blond_hair,person_with_pouting_face,phone,pig,pig2,pig_nose,pill,pineapple,pisces,pizza,plus1,point_down,point_left,point_right,point_up,point_up_2,police_car,poodle,poop,post_office,postal_horn,postbox,potable_water,pouch,poultry_leg,pound,pouting_cat,pray,princess,punch,purple_heart,purse,pushpin,put_litter_in_its_place,question,rabbit,rabbit2,racehorse,radio,radio_button,rage,rage1,rage2,rage3,rage4,railway_car,rainbow,raised_hand,raised_hands,raising_hand,ram,ramen,rat,recycle,red_car,red_circle,registered,repeat,repeat_one,restroom,revolving_hearts,rewind,ribbon,rice,rice_ball,rice_cracker,rice_scene,ring,rocket,roller_coaster,rooster,rose,rotating_light,round_pushpin,rowboat,ru,rugby_football,runner,running,running_shirt_with_sash,sa,sagittarius,sailboat,sake,sandal,santa,satellite,saxophone,school,school_satchel,scissors,scorpius,scream_cat,scroll,seat,secret,see_no_evil,seedling,seven,shaved_ice,sheep,shell,ship,shipit,shirt,shit,shoe,shower,signal_strength,six,six_pointed_star,ski,skull,slot_machine,small_blue_diamond,small_orange_diamond,small_red_triangle,small_red_triangle_down,smile_cat,smiley_cat,smiling_imp,smirk_cat,smoking,snail,snake,snowboarder,snowflake,snowman,soccer,soon,sos,sound,space_invader,spades,spaghetti,sparkle,sparkler,sparkles,sparkling_heart,speak_no_evil,speaker,speech_balloon,speedboat,squirrel,star,star2,stars,station,statue_of_liberty,steam_locomotive,stew,straight_ruler,strawberry,sun_with_face,sunflower,sunny,sunrise,sunrise_over_mountains,surfer,sushi,suspect,suspension_railway,sweat_drops,sweat_smile,sweet_potato,swimmer,symbols,syringe,tada,tanabata_tree,tangerine,taurus,taxi,tea,telephone,telephone_receiver,telescope,tennis,tent,thought_balloon,three,thumbsdown,thumbsup,ticket,tiger,tiger2,tm,toilet,tokyo_tower,tomato,tongue,top,tophat,tractor,traffic_light,train,train2,tram,triangular_flag_on_post,triangular_ruler,trident,trolleybus,trollface,trophy,tropical_drink,tropical_fish,truck,trumpet,tshirt,tulip,turtle,tv,twisted_rightwards_arrows,two,two_hearts,two_men_holding_hands,two_women_holding_hands,u5272,u5408,u55b6,u6307,u6708,u6709,u6e80,u7121,u7533,u7981,u7a7a,uk,umbrella,underage,unlock,up,us,v,vertical_traffic_light,vhs,vibration_mode,video_camera,video_game,violin,virgo,volcano,vs,walking,waning_crescent_moon,waning_gibbous_moon,warning,watch,water_buffalo,watermelon,wave,wavy_dash,waxing_crescent_moon,waxing_gibbous_moon,wc,weary,wedding,whale,whale2,wheelchair,white_check_mark,white_circle,white_flower,white_large_square,white_medium_small_square,white_medium_square,white_small_square,white_square_button,wind_chime,wine_glass,wolf,woman,womans_clothes,womans_hat,womens,wrench,x,yellow_heart,yen,zap,zero,zzz'.split(/,/);
	},


	/**
	 * Neue Zeit errechnen
	 *
	 * @param {number} hrs
	 * @returns {number}
	 */
	getTimestamp: (hrs)=>{

		let time = new Date().getTime(),
			h = hrs || 0,
			m = 0,

			// Zeit aufschlagen
			newTime = time + (1000*60*m) + (1000*60*60*h),

			// daraus neues Datumsobjekt erzeugen
			newDate = new Date(newTime);

		return newDate.getTime();
	},


	/**
	 * Zeit vergleichen
	 *
	 * @param actual
	 * @param storage
	 * @returns {boolean}
	 */
	compareTime: (actual, storage)=> {

		// es gibt noch keinen Eintrag
		if(storage === null){
			return true;

		// ist noch "jünger"
		} else if(actual > storage){
			return true;

		// ist abgelaufen
		} else if(storage > actual){
			return false;
		}
	},


	/**
	 * Grafiken von Inno holen und in ein kleines Objekt zwischen speichern
	 */
	loadPortraits: ()=> {

		let pPortraits = localStorage.getItem('PlayersPortraits'),
			pPortraitsTimestamp = localStorage.getItem('PlayersPortraitsTimestamp');

		if(pPortraits === null || Chat.compareTime(new Date().getTime(), pPortraitsTimestamp) === false)
		{
			let portraits = {};
			console.log('AJAX-Load-Portraits')
			$.ajax({
				type: 'GET',
				url: 'https://foede.innogamescdn.com/assets/shared/avatars/Portraits.xml',
				dataType: 'xml',
				success: function(xml){

					$(xml).find('portrait').each(function(){
						portraits[$(this).attr('name')] = $(this).attr('src');
					});

					localStorage.setItem('PlayersPortraits', JSON.stringify(portraits));
					localStorage.setItem('PlayersPortraitsTimestamp', ''+Chat.getTimestamp(24));

					Chat.PlayersPortraits = portraits;
				}
			});

		} else {
			Chat.PlayersPortraits = JSON.parse(pPortraits);
		}
	},

	timeStr: time => {
		const date = new Date(time);
		const h = (''+date.getHours()).padStart(2, '0');
		const m = (''+date.getMinutes()).padStart(2, '0');
		const s = (''+date.getSeconds()).padStart(2, '0');
		return `${h}:${m}:${s}`;
	}
};

document.addEventListener("DOMContentLoaded", function(){
	Chat.getData();
});
