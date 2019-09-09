/*
 * **************************************************************************************
 *
 * Dateiname:                 background.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       09.09.19, 15:23 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

chrome.runtime.onInstalled.addListener(() => {
	let version = chrome.app.getDetails().version;

	chrome.tabs.query({active: true, currentWindow: true}, (tabs)=> {
		// sind wir in FoE?
		if(tabs[0].url.indexOf('forgeofempires.com/game/index') > -1){

			// ja? dann neu laden
			if(!isDevMode()){
				chrome.tabs.reload(tabs[0].id);
			}
		}
	});

	if(!isDevMode()){
		chrome.tabs.create({url: "https://foe-rechner.de/extension/chrome?v=" + version});
	}
});


/**
 * Sind wir im DevMode?
 *
 * @returns {boolean}
 */
function isDevMode()
{
	return !('update_url' in chrome.runtime.getManifest());
}


/**
 * Sended via chrome.extension.getBackgroundPage() Daten an die chat-popup.js
 *
 * @returns {array}
 */
function getDataForChat()
{
	let data = [];

	chrome.storage.local.get(['OtherPlayers'], function(result) {
		data['OtherPlayers'] = result.OtherPlayers;
	});

	chrome.storage.local.get(['current_guild_id'], function(result) {
		data['current_guild_id'] = result.current_guild_id;
	});

	chrome.storage.local.get(['current_player_id'], function(result) {
		data['current_player_id'] = result.current_player_id;
	});

	return data;
}


let popupWindowId = 0;

/**
 * Auf einen response von ant.js lauschen
 */
chrome.runtime.onMessageExternal.addListener((request) => {

	if (request.type === 'message') {
		let t = request.time,
			opt = {
			type: "basic",
			title: request.title,
			message: request.msg,
			iconUrl: "images/app48.png"
		};

		// Desktop Meldung zusammen setzen
		chrome.notifications.create('', opt, (id)=> {

			// nach definiertem Timeout automatisch entfernen
			setTimeout(()=> {chrome.notifications.clear(id)}, t);
		});

	} else if(request.type === 'chat'){

		let url = 'content/chat.html?player=' + request.player + '&guild=' + request.guild + '&world=' + request.world,
			popupUrl = chrome.runtime.getURL(url);

		// Prüfen ob ein PopUp mit dieser URL bereits existiert
		chrome.tabs.query({url:popupUrl}, (tab)=>{

			// nur öffnen wenn noch nicht passiert
			if(tab.length < 1){

				let o = {
					url: url,
					type: 'popup',
					width: 500,
					height: 520,
					focused: true
				};

				// Popup erzeugen
				let id = chrome.windows.create(o, (win)=> {
					popupWindowId = win.id;
				});

			// gibt es schon, nach "vorn" holen
			} else {
				chrome.windows.update(popupWindowId, {
					focused:true
				});
			}
		});

	} else if(request.type === 'storeData'){
		chrome.storage.local.set({ [request.key] : request.data });
	}
});
