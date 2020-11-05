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


// @ts-ignore
const html = litHtml.html;
// @ts-ignore
const render = litHtml.render;
/** @type {any} */
var emojify;

class Player {

	/**
	 * @param {{id: string, name: string, portrait: string, isDev?: boolean, secretsMatch?: boolean}} data
	 */
	constructor ({id: id, name: name, portrait: portrait, isDev: isDev, secretsMatch: secretsMatch}) {
		this.id = id;
		/** @type {string} */
		this.name = name;
		/** @type {string} */
		this.portrait = portrait;
		/** @type {boolean} */
		this.isDev = isDev || false;
		/** @type {boolean} */
		this.secretsMatch = secretsMatch || false;
		/** @type {HTMLElement} */
		this.elem = document.createElement('div');
		/** @type {HTMLImageElement?} */
		this.portraitImg = null;
		/** @type {HTMLElement} */
		this.nameSpan = document.createElement('span');
		
		this.elem.appendChild(this.nameSpan);
		const usersElem = document.getElementById('users');
		if (usersElem) usersElem.appendChild(this.elem);
		// make sure all DOM-values are set according
		this.setName(this.name);
		this.setPortrait(this.portrait);
		this.setIsDev(this.isDev);
		this.setSecretsMatch(this.secretsMatch);
	}

	/**
	 * @param {{name?: string, portrait?: string, isDev?: boolean, secretsMatch?: boolean}} data
	 */
	update({name: name, portrait: portrait, isDev: isDev, secretsMatch: secretsMatch}) {
		if (name != null) {
			this.updateName(name);
		}
		if (portrait != null) {
			this.updatePortrait(portrait);
		}
		if (secretsMatch != null) {
			this.updateSecretsMatch(secretsMatch);
		}
		if (isDev != null) {
			this.updateIsDev(isDev);
		}
	}

	/**
	 * @param {string} name
	 */
	updateName(name) {
		if (this.name === name) return;
		this.setName(name);
	}

	/**
	 * @param {string} name
	 */
	setName(name) {
		// update name
		this.name = name;
		this.nameSpan.innerText = name;
	}

	/**
	 * @param {boolean} isDev
	 */
	updateIsDev(isDev) {
		if (this.isDev === isDev) return;
		this.setIsDev(isDev);
	}

	/**
	 * @param {boolean} isDev
	 */
	setIsDev(isDev) {
		// update isdev
		this.isDev = isDev;
		isDev ? this.nameSpan.className = "dev" : this.nameSpan.className = "";
	}

	/**
	 * @param {string} portrait
	 */
	updatePortrait(portrait) {
		if (this.portrait === portrait) return;
		this.setPortrait(portrait);
	}

	/**
	 * @param {string} portrait
	 */
	setPortrait(portrait) {
		// update Portrait image
		this.portrait = portrait;
		const portraitFile = this.getPortraitURL();
		if (portraitFile) {
			let img = this.portraitImg;

			// create new if needed
			if (!img) {
				img = document.createElement('img');
				this.elem.insertBefore(img, this.nameSpan);
				this.portraitImg = img;
			}
	
			// update src if needed
			if (portrait !== this.portrait || img.src.length <=0 || img.src !== `${portraitFile}`) {
				img.src = `${portraitFile}`;
			}
		} else {
			// remove if needed
			if (this.portraitImg) {
				this.portraitImg.remove();
			}
		}
	}

	/**
	 * @param {boolean} secretsMatch
	 */
	updateSecretsMatch(secretsMatch) {
		if (this.secretsMatch === secretsMatch) return;
		this.setSecretsMatch(secretsMatch);
	}

	/**
	 * @param {boolean} secretsMatch
	 */
	setSecretsMatch(secretsMatch) {
		this.secretsMatch = secretsMatch;
		// update "trusted" class
		if (secretsMatch) {
			this.elem.classList.add('trusted');
		} else {
			this.elem.classList.remove('trusted');
		}
	}

	remove() {
		this.elem.remove();
		Player.all.delete(this.id);
	}

	getPortraitURL() {
		const portraitFile = Chat.PlayersPortraits[this.portrait];
		if (portraitFile) {
			return `${Chat.InnoCDN}assets/shared/avatars/${portraitFile}.jpg`;
		}
		return null;
	}



	/**
	 *
	 * @param {{id: string, name?: string, portrait?: string, isDev?: boolean, secretsMatch?: boolean}} data
	 * @returns {Player}
	 */
	static get(data) {
		let player = Player.all.get(data.id);
		if (player == null) {
			player = new Player({
				id: data.id,
				name: data.name||'Unknown#'+data.id,
				portrait: data.portrait || '',
				isDev: data.isDev || false,
				secretsMatch: data.secretsMatch || false
			});
			Player.all.set(data.id, player);

		} else {
			player.update(data);
		}
		return player;
	}
}

/**
 * @type {Map<string, Player|undefined>}
 */
Player.all = new Map();


/**
 * @type {function(string): any}
 */
const messageFormatter = (() => {
	const defaultRules = SimpleMarkdown.defaultRules;
	
	/** @type {SimpleMarkdown.ParserRule & SimpleMarkdown.HtmlOutputRule} */
	const lineRule = {
		match: SimpleMarkdown.inlineRegex(/^([^\n]*)\n/),
		order: defaultRules.text.order - 0.5,
		parse: SimpleMarkdown.defaultRules.strong.parse,
		html: (node, output, state) => output(node.content, state)+'<br>'
	};

	/** @type {SimpleMarkdown.ParserRule & SimpleMarkdown.HtmlOutputRule} */
	const emojiRule = {
		match: text => {
			let match = /^:(\S+):/.exec(text);
			if(match && emojify.emojiNames.indexOf(match[1]) !== -1) {
				return match;
			}
			return null;
		},
		order: defaultRules.em.order - 0.5,
		parse: (capture, parse, state) => ({emoji: capture[1]}),
		html: (node, output, state) => {
			console.log(node, output, state);
			return emojify.replace(`:${node.emoji}:`);
		}
	};

	/** @type {SimpleMarkdown.ParserRule & SimpleMarkdown.HtmlOutputRule} */
	const imageRule = {
		match: text => {
			let match = /(?:(https:\/\/)|(http:\/\/))(.*?)\/(.+?)(?:\/|\?|\#|$|\n).*.(jpg|png|jpeg)/.exec(text);
			if(match) {
				return match;
			}
			return null;
		},
		order: defaultRules.em.order - 0.5,
		parse: (capture, parse, state) => ({image: capture[0]}),
		html: (node, output, state) => {
			return `${node.image}`;
		}
	};

	const rules = {
		Array: defaultRules.Array,
		list: defaultRules.list,
		table: defaultRules.table,
		escape: defaultRules.escape,
		url: defaultRules.url,
		link: defaultRules.link,
		emoji: emojiRule,
		em: defaultRules.em,
		strong: defaultRules.strong,
		u: defaultRules.u,
		inlineCode: defaultRules.inlineCode,
		line: lineRule,
		text: defaultRules.text
	}

	const parser = SimpleMarkdown.parserFor(rules, {inline: true});
	const renderer = SimpleMarkdown.outputFor(rules, 'html');

	/**
	 * @param {string} input
	 * @returns {string}
	 */
	function formatter(input) {
		return renderer(parser(input));
	}

	return formatter;
})();


let Chat = {

	wsUri: 'ws://ws.foe-helper.com:9000/',
	GuildID: 0,
	GuildName: '',
	PlayerID: 0,
	PlayerName: null,
	PlayerPortrait: null,
	World: '',
	Lang: 'en',
	OtherPlayers: /** @type {{player_name: string, player_id: Number, avatar: string, secretsMatch: boolean}[]} */([]),
	PlayersPortraits: /** @type {Record<string, string|undefined>} */({}),
	OnlinePlayers: [],
	OwnName: '',
	WebsocketChat : /** @type {WebSocket|null} */(null),
	ReadMode: 'live',
	Token: '',
	ConnectionId: '',
	InnoCDN: '',
	ChatRoom: '',

	/**
	 * Get the datas for the chat
	 */
	getData: async () => {

		const URLdata = Object.fromEntries( new URLSearchParams(location.search) );

		let player_id = -1;
		let world = '';
		Chat.ChatRoom = URLdata['chat'] || '';
		Chat.Lang = URLdata['lang'] || '';

		const sessionPlayer = sessionStorage.getItem('ChatPlayer');

		if (sessionPlayer) {
			const data = JSON.parse(sessionPlayer);
			player_id = data.player_id;
			world = data.world;

		} else {

			player_id = +URLdata['player'];
			world     = URLdata['world'];

			if (!/^[a-z]{2}\d{1,2}$/.test(world)) {
				throw "Invalid World-Name '"+world+"'";
			}

			sessionStorage.setItem('ChatPlayer', JSON.stringify({player_id, world}));
		}

		if(Chat.Lang === ''){
			Chat.Lang = sessionStorage.getItem('ChatLang');

		} else {
			Chat.Lang = URLdata['lang'];
			sessionStorage.setItem('ChatLang', URLdata['lang']);
		}

		let languages = [];

		// Englisches Fallback laden
		if (Chat.Lang !== 'en') {
			languages.push('en');
		}

		languages.push(Chat.Lang);

		const languageDatas = await Promise.all(
			languages
				.map(lang =>
					// frage die Sprachdatei an
					fetch('/js/web/_i18n/'+lang+'.json')
						// lade die antwort als JSON
						.then(response => response.json())
						// im fehlerfall wird ein leeres Objekt zurück gegeben
						.catch(()=>({}))
				)
		);

		for (let languageData of languageDatas) {
			i18n.translator.add({ 'values': languageData });
		}

		Chat.PlayerID = player_id;
		Chat.World = world;
		// Chat.GildID = +data['guild'];
		// Chat.PlayerName = decodeURI(data['name']);

		const cdnRecivedPromise =
			new Promise(resolve =>
				chrome.runtime.sendMessage(
					{
						type: 'getInnoCDN'
					},
					resolve
				)
			)
			.then(([cdn, wasSet]) => {
				Chat.InnoCDN = cdn;
				Chat.loadPortraits();
			})
		;

		const playerIdentities = JSON.parse(localStorage.getItem('PlayerIdentities')||'{}');
		const playerData = playerIdentities[world+'-'+player_id];

		if (playerData) {
			Chat.PlayerName = playerData.name;
			Chat.PlayerPortrait = playerData.portrait;

			Chat.GuildID = playerData.guild_id;
			Chat.GuildName = playerData.guild_name;

		} else {
			throw "Missing Player Data";
		}

		moment.locale(Chat.Lang);

		cdnRecivedPromise.then(() => Chat.Init());
	},


	/**
	 * Zündet die Chatbox und stellt eine Verbindung mit dem WebSocket Server her
	 */
	Init: () => {

		// const template = document.createElement('template');
		// template.innerHTML
		const template = html`
			<div class="chat-wrapper">
				<div id="chat">
					<div class="tabs">
					<ul id="top-bar" class="horizontal">
						<li class="${Chat.ChatRoom === ''       ? ' active':''}"><a href="chat.html?"><span>${i18n('WsChat.Guild')} ${Chat.GuildName}</span></a></li>
						<li class="${Chat.ChatRoom === 'global' ? ' active':''}"><a href="chat.html?chat=global"><span>${i18n('WsChat.World')} ${Chat.World}</span></a></li>
						<li class="${Chat.ChatRoom === 'dev'    ? ' active':''}"><a href="chat.html?chat=dev"><span>${i18n('WsChat.Developer')}</span></a></li>
					</ul>
					</div>
					<div class="message_box" id="message_box"></div>
				</div>
				<div id="users"><div class="head">${i18n('WsChat.InRoom')} <span id="modus"><i title="${i18n('WsChat.ReadmodeDeactivated')}" class="fa fa-eye-slash" aria-hidden="true"></i></span></div></div>
			</div>
			<div class="chat-panel">
				<textarea id="message-input" autocomplete="off" spellcheck="false" aria-autocomplete="none"></textarea><button id="send-btn">${i18n('WsChat.SendBtn')}</button>
			</div>
		`;

		const box = document.getElementById('ChatBody');
		// box.appendChild(template.content);
		render(template, box);
		//$('#ChatBody').append(div);


		setTimeout(
			function(){
				Chat.Functions();

				// alles geladen, Loader entfernen
				$('#ChatBody').removeClass('loader');
			}, 100
		);

		Chat.connectWebSocket();
	},

	connectWebSocket: () => {
		// get a random connection id if this tab doesn't already have one
		let connectionId = sessionStorage.getItem('websocket-connection-id') || '';
		if (!connectionId) {
			let randArray = new Uint8Array(24);
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
		
		if (Chat.WebsocketChat) Chat.WebsocketChat.close();
		const websocket = new WebSocket(Chat.wsUri);
		Chat.WebsocketChat = websocket;


		// Verbindung wurde hergestellt
		websocket.onopen = () => {
			const setupData = {
				world: Chat.ChatRoom === 'dev' ? 'dev' : Chat.World,
				guild: Chat.ChatRoom !== '' ? 0 : Chat.GuildID,
				player: Chat.PlayerID,
				isDev: false,
				name: Chat.PlayerName || 'Unknown#'+Chat.PlayerID,
				portrait: Chat.PlayerPortrait || '',
				connectionId: connectionId
			};
			// console.log('setup', setupData);
			websocket.send(JSON.stringify(setupData));

			Chat.SystemRow(i18n('WsChat.Connected'), 'success');
		};


		// jemand anderes hat etwas geschrieben
		websocket.onmessage = function(ev) {
			let msg = JSON.parse(ev.data);
			if (typeof msg !== 'object') return;
			if (typeof msg.type !== 'string') return;

			Chat.TextRow(msg);
		};


		// Error, da geht was nicht
		websocket.onerror	= function(ev){
			Chat.SystemRow(i18n('WsChat.ErrorOccurred') + ev.data, 'error');
		};


		// User hat das [X] geklickt
		websocket.onclose 	= function(){
			Chat.SystemRow(i18n('WsChat.ConnectionClosed'), 'error');
		};
	},


	/**
	 * Bindet die Funktionen der Buttons an Events
	 *
	 */
	Functions: ()=> {

		function autosize(el) {
			setTimeout(function() {
				el.style.cssText = 'height:auto; padding:0';
				// for box-sizing other than "content-box" use:
				// el.style.cssText = '-moz-box-sizing:content-box';
				el.style.cssText = 'height:' + Math.min(el.scrollHeight, 150) + 'px';
			}, 0);
		}

		// User benutzt [Enter] zum schreiben
		const input = document.getElementById('message-input');
		input.addEventListener('keydown', function(e) {
			
			if (e.which == 13 || e.keyCode == 13) {
				const shift = e.shiftKey;
				const kombi = e.ctrlKey || e.altKey || e.metaKey;

				if (!kombi && !shift) {
					Chat.SendMsg();
				}

				if (kombi || !shift) {
					e.preventDefault();
				}

			}

			autosize(e.currentTarget);
		});

		document.getElementById('send-btn').addEventListener('click', function(){
			Chat.SendMsg()
		});

		document.getElementById('modus').addEventListener('click', function(){
			if( Chat.ReadMode === 'live' ){
				Chat.ReadMode = 'read';
				document.querySelector('.head span').innerHTML = `<i title="${i18n('WsChat.ReadmodeActivated')}" class="fa fa-eye" aria-hidden="true"></i>`;
				// $('.head').find('span').html('<i title="Lesemodus aktivert" class="fa fa-eye" aria-hidden="true"></i>');
			} else {
				Chat.ReadMode = 'live';
				document.querySelector('.head span').innerHTML = `<i title="${i18n('WsChat.ReadmodeDeactivated')}" class="fa fa-eye-slash" aria-hidden="true"></i>`;
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

			$('#ChatBody').addClass('loader');

			localStorage.removeItem('CurrentPlayerID');
			localStorage.removeItem('CurrentPlayerName');
			localStorage.removeItem('CurrentGuildID');
			localStorage.removeItem('CurrentWorld');

			Chat.Close();
		});
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

		// let today = MainParser.getCurrentDate(),
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

		if (Chat.WebsocketChat) {
			if (type !== 'onlyOthers'){
				Chat.TextRow(msg);
			}
			
			Chat.WebsocketChat.send(JSON.stringify({message: MyMsg}));
			// $('#message-input').val('');
			/** @type {HTMLInputElement} */(document.getElementById('message-input')).value = '';
		}
	},


	/**
	 * The message for the textbox
	 *
	 * @param {any} message
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
		 *  {type: 'members', members:  {playerId: number, name: string, portrait: string, secretsMatch: boolean}[]} // list of playerID's in this chat-room and weather theire 
		 * on error/ping timeout:
		 *  {type: 'error', error: string}
		 * 
		 * on player join:
		 *  {type: 'switch', player: number, name: string, portrait: string, time: number, secretsMatch: boolean} // player was in room and switched connection
		 *  {type: 'join', player: number, name: string, portrait: string, time: number,secretsMatch: boolean} // player entered room
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
				/** @type {{playerId: string, name: string, portrait: string, isDev: boolean, secretsMatch: boolean}[]} */
				const members = message.members;
				// console.log(message)
				for (let data of members) {
					const {playerId, name, portrait, isDev, secretsMatch} = data;
					Player.get({id: playerId, name, portrait, isDev, secretsMatch});
					//Chat.UserEnter(Player);
				}
				break;
			}
			case 'secretChange': {
				const player = Player.get({id: message.player});
				player.updateSecretsMatch(message.secretsMatch);
				// 	Chat.UserEnter(Player);
				break;
			}
			case 'message': {
				const player_id = message.from;

				if (player_id === Chat.PlayerID) {
					const m = messageFormatter(message.message);
					let TextR = litHtml.unsafeHTML(m);
					// let TextR = emojify.replace(message.message);
					// TextR = Chat.MakeImage(TextR);
					// TextR = Chat.MakeURL(TextR);
		
					Chat.SmallBox('user-self', TextR, '', message.time);
		
				} else {
					const player = Player.get({id: player_id});

					// let TextR = Chat.MakeImage(message.message);
					// TextR = emojify.replace(TextR);
					// TextR = Chat.MakeURL(TextR);
					const m = messageFormatter(message.message);
					let TextR = litHtml.unsafeHTML(m);
		
					Chat.BigBox(
						'user-other',
						TextR,
						player.portraitURL||'',
						player.name,
						message.time
					);

					Chat.PlaySound('notification-sound');
				}
				break;
			}
			case 'switch': {
				const player = Player.get({
					id: message.player,
					name: message.name,
					portrait: message.portrait,
					isDev: message.isDev,
					secretsMatch: message.secretsMatch
				});

				const TextR = document.createElement('em');
				TextR.innerText = `${player.name} ${i18n('WsChat.UserReEnter')}`;

				Chat.PlaySound('user-enter');
				Chat.SmallBox('user-notification', TextR, '', message.time);
				break;
			}
			case 'join': {
				const player = Player.get({
					id: message.player,
					name: message.name,
					portrait: message.portrait,
					isDev: message.isDev,
					secretsMatch: message.secretsMatch
				});

				const TextR = document.createElement('em');
				TextR.innerText = `${player.name} ${i18n('WsChat.UserEnter')}`;

				Chat.PlaySound('user-enter');
				Chat.SmallBox('user-notification', TextR, '', message.time);
				break;
			}
			case 'leave': {
				const player = Player.get({id: message.player});

				const TextR = document.createElement('em');
				TextR.innerText = `${player.name} ${i18n('WsChat.UserLeave')}`;

				player.remove();
				Chat.PlaySound('user-leave');
				Chat.SmallBox('user-notification', TextR, '', message.time);
				break;
			}
			case 'disconnect': {
				Chat.SystemRow(i18n('WsChat.DisconnectError') + '(' + message.reason + ')', 'error');
				break;
			}
			case 'error': {
				Chat.SystemRow(i18n('WsChat.ConnectionError') + '('+message.error+')', 'error');
				break;
			}
		}


		if( Chat.ReadMode === 'live' ){
			// TODO: fix animation
			const box = document.getElementById('message_box').parentElement;
			box.scrollTop = box.scrollHeight;
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
			const audio = /** @type {HTMLAudioElement|undefined} */(document.getElementById(id));
			if (audio) {
				audio.volume = vol;
				audio.play();
			}
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
		if (Chat.PlayersPortraits[Player.avatar]) {
			img.src = img.src = Chat.PlayersPortraits[Player.avatar];
		}

		const s = document.createElement('span');
		s.innerText = Player['player_name'];
		Player.isdev ? s.classList = "dev" : s.classList = "";
		
		d.appendChild(s);

		document.getElementById('users').appendChild(d);

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
		}

		if(Chat.OnlinePlayers[Player['player_name']] !== undefined){
			delete Chat.OnlinePlayers[Player['player_name']];
		}
	},


	/**
	 * schmale Text-Zeile für Status + eigener Text
	 *
	 * @param {string} class_name
	 * @param {string|HTMLElement} text
	 * @param {string} name
	 * @param {number} time
	 */
	SmallBox: (class_name, text, name, time)=> {
		const $container = document.createElement('div');
		$container.classList.add(class_name);

		render(
			html`<span class="user-message">${text}</span>
				<div class="message-data">
					<span class="user-name">${name}</span>
					<span class="message-time">${Chat.timeStr(time)}</span>
				</div>`,
			$container
		);

		document.getElementById('message_box').appendChild($container);
	},


	/**
	 * Text-Zeile mit Avatar, Gesprächspartner
	 *
	 * @param {string} class_name
	 * @param {string|HTMLElement} text
	 * @param {string} img
	 * @param {string} name
	 * @param {number} time
	 */
	BigBox: (class_name, text, img, name, time) => {
		//text = Chat.MarkUserName(text);

		const $container = document.createElement('div');
		$container.classList.add('big-box', class_name);

		render(
			html`<div class="image">
					<img src="${img}" alt="">
				</div>
				<div>
					<span class="user-message">${text}</span>
					<div class="message-data">
						<span class="user-name">${name}</span>
						<span class="message-time">${Chat.timeStr(time)}</span>
					</div>
				</div>`,
			$container
		);

		document.getElementById('message_box').appendChild($container);
	},


	/**
	 * Player vorschlagen die dann farblich markiert werden
	 *
	 */
	FindUserName: () => {
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
	 * @returns {string}
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

		// $('#message_box').animate({
		// 	scrollTop: $('#message_box').prop('scrollHeight')
		// });
	},


	/**
	 * Trennt die Verbindung
	 *
	 */
	Close: ()=> {

		// console.log('AJAX-Close')
		//$.post('https://api.foe-rechner.de/GuildChat/?guild_id=' + Chat.GildID + '&player_id=' + Chat.PlayerID + '&world=' + Chat.World, {room_id: 1, dir: 'leave'});

		//Chat.SendMsg('onlyOthers', 'leaved');

		setTimeout(
			function(){
				if (Chat.WebsocketChat) Chat.WebsocketChat.close();
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

		for(let icon of icons) {
			const img = document.createElement('img');
			img.classList.add('add-icon');
			img.src = '/vendor/emoyify/images/emoji/'+ icon +'.png';
			img.setAttribute('alt', ':'+ icon +':');
			img.setAttribute('title', ':'+ icon +':');
			bar.appendChild(img);
		}

		document.body.appendChild(bar);

		const btn = document.createElement('img');
		btn.src = '../images/face.png';
		btn.classList.add('toggle-emoticon-bar');


		const panel = document.querySelector('.chat-panel');
		panel.appendChild(bar);
		panel.appendChild(btn);

		// Functions
		btn.addEventListener('click', function()
		{
			document.querySelector('.emoticon-bar').classList.toggle('show');
		});


		document.body.addEventListener('click', e => {
			const target = /** @type {HTMLElement} */(e.target);
			if (target.classList.contains('add-icon')) {
				const ico = target.getAttribute('alt');
				const input = /** @type {HTMLInputElement} */(document.getElementById('message-input'))
				input.value += ' ' + ico;
			}
		});
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

		let time = new Date(Date.now()).getTime(),
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

		if(pPortraits === null || Chat.compareTime(Date.now(), pPortraitsTimestamp) === false)
		{
			let portraits = {};
			// console.log('AJAX-Load-Portraits')
			$.ajax({
				type: 'GET',
				url: Chat.InnoCDN + 'assets/shared/avatars/Portraits.xml',
				dataType: 'xml',
				success: function(xml){

					$(xml).find('portrait').each(function(){
						portraits[$(this).attr('name')] = $(this).attr('src');
					});

					localStorage.setItem('PlayersPortraits', JSON.stringify(portraits));
					localStorage.setItem('PlayersPortraitsTimestamp', '' + Chat.getTimestamp(24));

					Chat.PlayersPortraits = portraits;
				}
			});

		} else {
			Chat.PlayersPortraits = JSON.parse(pPortraits);
		}
	},


	timeStr: time => {
		return moment(time).format(i18n('Time'));
	}
};

document.addEventListener("DOMContentLoaded", function(){
	Chat.getData();
});
