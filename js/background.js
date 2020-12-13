/*
 * **************************************************************************************
 *
 * Dateiname:                 background.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       19.11.19, 09:44 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

// separate code from global scope
{

	chrome.runtime.onInstalled.addListener(() => {
		let version = chrome.runtime.getManifest().version,
			lng = chrome.i18n.getUILanguage(),
			ask = {
				de: 'Es wurde gerade ein Update f%FCr den FoE Helfer installiert.%0A%0ADarf das Spiel jetzt neu geladen werden oder m%F6chtest Du es sp%E4ter selber machen%3F',
				en: 'An update for the FoE Helper has just been installed.%0A%0ACan the game be reloaded now or do you want to do it yourself later%3F'
			};

		// is a "-" in there? ==> en-en, en-us, en-gb etc ...
		if(lng.indexOf('-') > -1){
			lng = lng.split('-')[0];
		}

		// Fallback to "en"
		if(lng !== 'de' && lng !== 'en'){
			lng = 'en';
		}

		// No developer and player ask if the game can be reloaded
		if(!isDevMode() && confirm(unescape(ask[lng])) === true){
			chrome.tabs.query({active: true, currentWindow: true}, (tabs)=> {
				// are we in FoE?
				if(tabs[0].url.indexOf('forgeofempires.com/game/index') > -1){

					// Yes? then reload
					chrome.tabs.reload(tabs[0].id);
				}
			});

			chrome.tabs.create({
				url: `https://foe-rechner.de/extension/update?v=${version}&lang=${lng}`
			});
		}
	});


	/**
	 * Are we in DevMode?
	 *
	 * @returns {boolean}
	 */
	function isDevMode()
	{
		return !('update_url' in chrome.runtime.getManifest());
	}


	let popupWindowId = 0;

	const defaultInnoCDN = 'https://foede.innogamescdn.com/';

	// // automatic update of local data
	// window.addEventListener('storage', evt => {
	// 	if (!evt.isTrusted) return;
	// 	if (evt.key === 'PlayerData') {
	// 		ChatData.player = JSON.parse(evt.newValue);
	// 	}
	// });


	function handleWebpageRequests(request, sender, callback) {
		if (request.type === 'message') {
			let t = request.time,
				opt = {
					type: "basic",
					title: request.title,
					message: request.msg,
					iconUrl: "images/app48.png"
				};

			// Compose desktop message
			chrome.notifications.create('', opt, (id)=> {

				// Remove automatically after a defined timeout
				setTimeout(()=> {chrome.notifications.clear(id)}, t);
			});

		} else if(request.type === 'chat'){

			let url = `js/web/ws-chat/html/chat.html?player=${request.player}&world=${request.world}&lang=${request.lang}`,
				popupUrl = chrome.runtime.getURL(url);

			// Check whether a popup with this URL already exists
			chrome.tabs.query({url:popupUrl}, (tab)=>{

				// only open if not already done
				if(tab.length < 1){

					let o = {
						url: url,
						type: 'popup',
						width: 500,
						height: 520,
						focused: true
					};

					// generate a popup
					let id = chrome.windows.create(o, (win)=> {
						popupWindowId = win.id;
					});

				// already exists, bring it to the "front"
				} else {
					chrome.windows.update(popupWindowId, {
						focused:true
					});
				}
			});

		} else if(request.type === 'storeData'){
			chrome.storage.local.set({ [request.key] : request.data });

		} else if(request.type === 'send2Api') {

			// console.log("type=send2Api got called!");
			let xhr = new XMLHttpRequest();

			xhr.open('POST', request.url);
			xhr.setRequestHeader('Content-Type', 'application/json');
			xhr.send(request.data);

		} else if(request.type === 'setInnoCDN') {
			localStorage.setItem('InnoCDN', request.url);

		} else if(request.type === 'getInnoCDN') {
			let cdnUrl = localStorage.getItem('InnoCDN');
			callback([cdnUrl || defaultInnoCDN, cdnUrl != null]);

		} else if(request.type === 'setPlayerData') {
			const data = request.data;

			const playerdata = JSON.parse(localStorage.getItem('PlayerIdentities') || '{}');
			playerdata[data.world+'-'+data.player_id] = data;
			localStorage.setItem('PlayerIdentities', JSON.stringify(playerdata));

		} else if(request.type === 'getPlayerData') {
			const playerdata = JSON.parse(localStorage.getItem('PlayerIdentities') || '{}');
			callback(playerdata[request.world+'-'+request.player_id]);

		} else if(request.type === 'showNotification') {
			try {
				const title = request.title;
				const options = request.options;
				new Notification( title, {
					actions: options.actions,
					body: options.body,
					dir: 'ltr',
					icon: options.icon,
					renotify: !!(options.tag),
					requireInteraction: options.persistent,
					vibrate: options.vibrate,
					tag: options.tag,
				});
			}
			catch( error ){
				console.error('NotificationManager.notify:');
				console.error( error );
			}
		}
	}

	/**
	 * Listen for a response from _main.js
	 */
	// @ts-ignore
	if (chrome.app) { // Chrome
		chrome.runtime.onMessageExternal.addListener(handleWebpageRequests);
	} else { // Firefox
	}
	chrome.runtime.onMessage.addListener(handleWebpageRequests);

	// End of the separation from the global scope
}

/*
chrome.runtime.onStartup.addListener(function() {

	// @Todo: Ticker der auf die expireTime runter zählt und dann die Nachricht anzeigt

	let opt = {
			type: "basic",
			title: 'Hello World',
			message: 'Diese Nachricht erscheint wenn der Chrome gestartet wurde...',
			iconUrl: "images/app48.png",
			silent: true // stumm ausgeben, aber mp3 abspielen
		};

	// Desktop Meldung zusammen setzen
	chrome.notifications.create('', opt, (id)=> {
		// hier könnte noch mehr gedöhns rein.
		// man kann auch Buttons in so eine Nachricht einbauen...

		// auf jeden Fall nen Alarm ;-)
		const sound = new Audio('sound.mp3').play();
	});
});
*/
