/*
 * **************************************************************************************
 *
 * Dateiname:                 _main.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 13:49 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

{
	// jQuery detection
	let intval = -1;
	function checkForJQuery() {
		if (typeof jQuery !== 'undefined'){
			clearInterval(intval);
			window.dispatchEvent(new CustomEvent('foe-helper#jQuery-loaded'));
		}
	}
	intval = setInterval(checkForJQuery, 1);
}

let ApiURL = 'https://api.foe-rechner.de/',
	ActiveMap = 'main',
	LastMapPlayerID = null,
	ExtPlayerID = 0,
	ExtPlayerName = null,
	ExtGuildID = 0,
	ExtWorld = '',
	CurrentEra = null,
	CurrentEraID = null,
	GoodsData = [],
	GoodsList = [],
	PlayerDict = {},
	PlayerDictNeighborsUpdated = false,
	PlayerDictGuildUpdated = false,
	PlayerDictFriendsUpdated = false,
	ResourceStock = [],
	MainMenuLoaded = false,
	LGCurrentLevelMedals = undefined,
	IsLevelScroll = false,
	EventCountdown = false,
	GameTimeOffset = 0,
	StartUpDone = false,
	possibleMaps = ['main', 'gex', 'gg', 'era_outpost', 'gvg'];

// Übersetzungen laden
let i18n_loaded = false;
const i18n_loadPromise = (async() => {
	const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));
	const vendorsLoadedPromise = new Promise(resolve =>
		window.addEventListener('foe-helper#vendors-loaded', resolve, {passive: true, once: true})
	);

	try {
		let languages = [];

		// Englisches Fallback laden
		if (GuiLng !== 'en') {
			languages.push('en');
		}

		languages.push(GuiLng);

		// parrallel mache:
		const languageDatas = await Promise.all(
			languages
				.map(lang =>
					// frage die Sprachdatei an
					fetch(extUrl + 'js/web/_i18n/'+lang+'.json')
						// lade die antwort als JSON
						.then(response => response.text())
						// im fehlerfall wird ein leeres Objekt zurück gegeben
						.catch(()=>({}))
				)
		);

		// warte dass i18n geladen ist
		await vendorsLoadedPromise;

		for (let languageData of languageDatas) {
			i18n.translator.add({ 'values': JSON.parse(languageData) });
		}

		i18n_loaded = true;

	} catch (err) {
		console.error('i18n translation loading error:', err);
	}
})();


document.addEventListener("DOMContentLoaded", function(){
	// note current world
	ExtWorld = window.location.hostname.split('.')[0];
	localStorage.setItem('current_world', ExtWorld);

	// register resize functions
	window.addEventListener('resize', ()=>{
		MainParser.ResizeFunctions();
	});

	// Detect and process fullscreen
	$(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange', function(){
		if (!window.screenTop && !window.screenY) {
			HTML.LeaveFullscreen();
		} else {
			HTML.EnterFullscreen();
		}
	});
});

const FoEproxy = (function () {
	const requestInfoHolder = new WeakMap();
	function getRequestData(xhr) {
		let data = requestInfoHolder.get(xhr);
		if (data != null) return data;

		data = {url: null, method: null, postData: null};
		requestInfoHolder.set(xhr, data);
		return data;
	}

	let proxyEnabled = true;

	// XHR-handler
	/** @type {Record<string, undefined|Record<string, undefined|((data: FoE_NETWORK_TYPE, postData: any) => void)[]>>} */
	const proxyMap = {};

	/** @type {Record<string, undefined|((data: any, requestData: any) => void)[]>} */
	const proxyMetaMap = {};

	/** @type {((data: any, requestData: any) => void)[]} */
	let proxyRaw = [];

	// Websocket-Handler
	const wsHandlerMap = {};
	let wsRawHandler = [];

	// startup Queues
	let xhrQueue = [];
	let wsQueue = [];

	const proxy = {
		/**
		 * Fügt einen datenhandler für Antworten von game/json hinzu.
		 * @param {string} service Der Servicewert, der in der Antwort gesetzt sein soll oder 'all'
		 * @param {string} method Der Methodenwert, der in der Antwort gesetzt sein soll oder 'all'
		 * TODO: Genaueren Typ für den Callback definieren
		 * @param {(data: FoE_NETWORK_TYPE, postData: any) => void} callback Der Handler, welcher mit der Antwort aufgerufen werden soll.
		 */
		addHandler: function(service, method, callback) {
			// default service and method to 'all'
			if (method === undefined) {
				// @ts-ignore
				callback = service;
				service = method = 'all';
			} else if (callback === undefined) {
				// @ts-ignore
				callback = method;
				method = 'all';
			}

			let map = proxyMap[service];
			if (!map) {
				proxyMap[service] = map = {};
			}
			let list = map[method];
			if (!list) {
				map[method] = list = [];
			}
			if (list.indexOf(callback) !== -1) {
				// already registered
				return;
			}
			list.push(callback);
		},

		removeHandler: function(service, method, callback) {
			// default service and method to 'all'
			if (method === undefined) {
				callback = service;
				service = method = 'all';
			} else if (callback === undefined) {
				callback = method;
				method = 'all';
			}

			let map = proxyMap[service];
			if (!map) {
				return;
			}
			let list = map[method];
			if (!list) {
				return;
			}
			map[method] = list.filter(c => c !== callback);
		},

		// for metadata requests: metadata?id=<meta>-<hash>
		addMetaHandler: function(meta, callback) {
			let list = proxyMetaMap[meta];
			if (!list) {
				proxyMetaMap[meta] = list = [];
			}
			if (list.indexOf(callback) !== -1) {
				// already registered
				return;
			}

			list.push(callback);
		},

		removeMetaHandler: function(meta, callback) {
			let list = proxyMetaMap[meta];
			if (!list) {
				return;
			}
			proxyMetaMap[meta] = list.filter(c => c !== callback);
		},

		// for raw requests access
		addRawHandler: function(callback) {
			if (proxyRaw.indexOf(callback) !== -1) {
				// already registered
				return;
			}

			proxyRaw.push(callback);
		},

		removeRawHandler: function(callback) {
			proxyRaw = proxyRaw.filter(c => c !== callback);
		},

		/**
		 * Fügt einen Datenhandler für Nachrichten des WebSockets hinzu.
		 * @param {string} service Der Servicewert, der in der Nachricht gesetzt sein soll oder 'all'
		 * @param {string} method Der Methodenwert, der in der Nachricht gesetzt sein soll oder 'all'
		 * TODO: Genaueren Typ für den Callback definieren
		 * @param {(data: FoE_NETWORK_TYPE) => void} callback Der Handler, welcher mit der Nachricht aufgerufen werden soll.
		 */
		addWsHandler: function(service, method, callback) {
			// default service and method to 'all'
			if (method === undefined) {
				// @ts-ignore
				callback = service;
				service = method = 'all';
			} else if (callback === undefined) {
				// @ts-ignore
				callback = method;
				method = 'all';
			}

			let map = wsHandlerMap[service];
			if (!map) {
				wsHandlerMap[service] = map = {};
			}
			let list = map[method];
			if (!list) {
				map[method] = list = [];
			}
			if (list.indexOf(callback) !== -1) {
				// already registered
				return;
			}
			list.push(callback);
		},

		removeWsHandler: function(service, method, callback) {
			// default service and method to 'all'
			if (method === undefined) {
				callback = service;
				service = method = 'all';
			} else if (callback === undefined) {
				callback = method;
				method = 'all';
			}

			let map = wsHandlerMap[service];
			if (!map) {
				return;
			}
			let list = map[method];
			if (!list) {
				return;
			}
			map[method] = list.filter(c => c !== callback);
		},

		// for raw requests access
		addRawWsHandler: function(callback) {
			if (wsRawHandler.indexOf(callback) !== -1) {
				// already registered
				return;
			}

			wsRawHandler.push(callback);
		},

		removeRawWsHandler: function(callback) {
			wsRawHandler = wsRawHandler.filter(c => c !== callback);
		}
	};

	window.addEventListener('foe-helper#loaded', () => {
		const xhrQ = xhrQueue;
		xhrQueue = null;
		const wsQ = wsQueue;
		wsQueue = null;

		xhrQ.forEach(xhrRequest => xhrOnLoadHandler.call(xhrRequest));
		wsQ.forEach(wsMessage => wsMessageHandler(wsMessage));
	}, {capture:false, once: true, passive: true});

	window.addEventListener('foe-helper#error-loading', () => {
		xhrQueue = null;
		wsQueue = null;
		proxyEnabled = false;
	}, {capture:false, once: true, passive: true});

	// ###########################################
	// ############## Websocket-Proxy ############
	// ###########################################
	/**
	 * This function gets the callbacks from wsHandlerMap[service][method] and executes them.
	 * @param {string} service
	 * @param {string} method
	 * @param {FoE_NETWORK_TYPE} data
	 */
	function _proxyWsAction(service, method, data) {
		const map = wsHandlerMap[service];
		if (!map) {
			return;
		}
		const list = map[method];
		if (!list) {
			return;
		}
		for (let callback of list) {
			try {
				callback(data);
			} catch (e) {
				console.error(e);
			}
		}
	}

	/**
	 * This function gets the callbacks from wsHandlerMap[service][method],wsHandlerMap[service]['all'],wsHandlerMap['all'][method] and wsHandlerMap['all']['all'] and executes them.
	 * @param {string} service
	 * @param {string} method
	 * @param {FoE_NETWORK_TYPE} data
	 */
	function proxyWsAction(service, method, data) {
		_proxyWsAction(service, method, data);
		_proxyWsAction('all', method, data);
		_proxyWsAction(service, 'all', data);
		_proxyWsAction('all', 'all', data);
	}

	/**
	 * @this {WebSocket}
	 * @param {MessageEvent} evt
	 */
	function wsMessageHandler(evt) {
		if (wsQueue) {
			wsQueue.push(evt);
			return;
		}
		try {
			if (evt.data === 'PONG') return;
			/** @type {FoE_NETWORK_TYPE[]|FoE_NETWORK_TYPE} */
			const data  = JSON.parse(evt.data);

			// do raw-ws-handlers
			for (let callback of wsRawHandler) {
				try {
					callback(data);
				} catch (e) {
					console.error(e);
				}
			}

			// do ws-handlers
			if (data instanceof Array) {
				for (let entry of data) {
					proxyWsAction(entry.requestClass, entry.requestMethod, entry);
				}
			} else if (data.__class__ === "ServerResponse") {
				proxyWsAction(data.requestClass, data.requestMethod, data);
			}
		} catch (e) {
			console.error(e);
		}
	}

	// Achtung! Die WebSocket.prototype.send funktion wird nicht zurück ersetzt, falls anderer code den prototypen auch austauscht.
	const observedWebsockets = new WeakSet();
	const oldWSSend = WebSocket.prototype.send;
	WebSocket.prototype.send = function (data) {
		oldWSSend.call(this, data);
		if (proxyEnabled && !observedWebsockets.has(this)) {
			observedWebsockets.add(this);
			this.addEventListener('message', wsMessageHandler, {capture: false, passive: true});
		}
	};

	// ###########################################
	// ################# XHR-Proxy ###############
	// ###########################################

	/**
	 * This function gets the callbacks from proxyMap[service][method] and executes them.
	 */
	function _proxyAction(service, method, data, postData) {
		const map = proxyMap[service];
		if (!map) {
			return;
		}
		const list = map[method];
		if (!list) {
			return;
		}
		for (let callback of list) {
			try {
				callback(data, postData);
			} catch (e) {
				console.error(e);
			}
		}
	}

	/**
	 * This function gets the callbacks from proxyMap[service][method],proxyMap[service]['all'] and proxyMap['all']['all'] and executes them.
	 */
	function proxyAction(service, method, data, postData) {
		_proxyAction(service, method, data, postData);
		_proxyAction('all', method, data, postData);
		_proxyAction(service, 'all', data, postData);
		_proxyAction('all', 'all', data, postData);
	}

	// Achtung! Die XMLHttpRequest.prototype.open und XMLHttpRequest.prototype.send funktionen werden nicht zurück ersetzt,
	//          falls anderer code den prototypen auch austauscht.
	const XHR = XMLHttpRequest.prototype,
		open = XHR.open,
		send = XHR.send;

	/**
	 * @param {string} method
	 * @param {string} url
	 */
	XHR.open = function(method, url){
		if (proxyEnabled) {
			const data = getRequestData(this);
			data.method = method;
			data.url = url;
		}
		// @ts-ignore
		return open.apply(this, arguments);
	};

	/**
	 * @this {XHR}
	 */
	function xhrOnLoadHandler() {
		if (!proxyEnabled) return;
		if (xhrQueue) {
			xhrQueue.push(this);
			return;
		}
		const requestData = getRequestData(this);
		const url = requestData.url;
		const postData = requestData.postData;

		// handle raw request handlers
		for (let callback of proxyRaw) {
			try {
				callback(this, requestData);
			} catch (e) {
				console.error(e);
			}
		}

		// handle metadata request handlers
		const metadataIndex = url.indexOf("metadata?id=");
		if (metadataIndex > -1) {
			const metaURLend = metadataIndex + "metadata?id=".length,
				metaArray = url.substring(metaURLend).split('-', 2),
				meta = metaArray[0];

			if(meta === 'city_entities'){
				MainParser.CityMetaId = metaArray[1];
			}

			const metaHandler = proxyMetaMap[meta];

			if (metaHandler) {
				for (let callback of metaHandler) {
					try {
						callback(this, postData);
					} catch (e) {
						console.error(e);
					}
				}
			}
		}

		// nur die jSON mit den Daten abfangen
		if (url.indexOf("game/json?h=") > -1) {

			let d = /** @type {FoE_NETWORK_TYPE[]} */(JSON.parse(this.responseText));

			let requestData = postData;
			try {
				requestData = JSON.parse(new TextDecoder().decode(postData));
				// StartUp Service zuerst behandeln
				for (let entry of d) {
					if (entry['requestClass'] === 'StartupService' && entry['requestMethod'] === 'getData') {
						proxyAction(entry.requestClass, entry.requestMethod, entry, requestData);
					}
				}

				for (let entry of d) {
					if (!(entry['requestClass'] === 'StartupService' && entry['requestMethod'] === 'getData')) {
						proxyAction(entry.requestClass, entry.requestMethod, entry, requestData);
					}
				}
			} catch (e) {
				console.log('Can\'t parse postData: ', postData);
			}

		}
	}

	XHR.send = function(postData) {
		if (proxyEnabled) {
			const data = getRequestData(this);
			data.postData = postData;
			this.addEventListener('load', xhrOnLoadHandler, {capture: false, passive: true});
		}

		// @ts-ignore
		return send.apply(this, arguments);
	};

	return proxy;
})();

(function() {

	// globale Handler
	// die Gebäudenamen übernehmen
	FoEproxy.addMetaHandler('city_entities', (xhr, postData) => {
		let EntityArray = JSON.parse(xhr.responseText);
		MainParser.CityEntities = Object.assign({}, ...EntityArray.map((x) => ({ [x.id]: x })));;
	});

	// Portrait-Mapping für Spieler Avatare
	FoEproxy.addRawHandler((xhr, requestData) => {
		const idx = requestData.url.indexOf("/assets/shared/avatars/Portraits");

		if(idx !== -1) {
			MainParser.InnoCDN = requestData.url.substring(0, idx+1);
			MainParser.sendExtMessage({type: 'setInnoCDN', url: MainParser.InnoCDN});
			let portraits = {};

			$(xhr.responseText).find('portrait').each(function(){
				portraits[$(this).attr('name')] = $(this).attr('src');
			});

			MainParser.PlayerPortraits = portraits;
		}
	});

	// --------------------------------------------------------------------------------------------------
	// Player- und Gilden-ID setzen
	FoEproxy.addHandler('StartupService', 'getData', (data, postData) => {

		// Player-ID, Gilden-ID und Name setzten
		MainParser.StartUp(data.responseData.user_data);

		// check if DB exists
		StrategyPoints.checkForDB(ExtPlayerID);
		EventHandler.checkForDB(ExtPlayerID);
		UnitGex.checkForDB(ExtPlayerID);

		// which tab is active in StartUp Object?
		let vals = {
			getNeighborList: 0,
			getFriendsList: 0,
			getClanMemberList: 0,
		}

		for(let i in data.responseData.socialbar_list){
			vals.getNeighborList += (data.responseData.socialbar_list[i].is_neighbor ? 1 : 0);
			vals.getFriendsList += (data.responseData.socialbar_list[i].is_friend ? 1 : 0);
			vals.getClanMemberList += (data.responseData.socialbar_list[i].is_guild_member ? 1 : 0);
		}

		MainParser.UpdatePlayerDict(
			data.responseData.socialbar_list,
			'PlayerList',
			Object.keys(vals).reduce((a, b) => vals[a] > vals[b] ? a : b)
		);

		// eigene Daten, Maximal alle 6h updaten
		MainParser.SelfPlayer(data.responseData.user_data);

		// Alle Gebäude sichern
		LastMapPlayerID = ExtPlayerID;
		MainParser.CityMapData = Object.assign({}, ...data.responseData.city_map.entities.map((x) => ({ [x.id]: x })));
		MainParser.SaveBuildings(MainParser.CityMapData);

		// Güterliste
		GoodsList = data.responseData.goodsList;

		// freigeschaltete Erweiterungen sichern
		CityMap.UnlockedAreas = data.responseData.city_map.unlocked_areas;

		// EventCountdown
		let eventCountDownFeature = data.responseData.feature_flags.features.filter((v)=>{return (v.feature === "event_start_countdown")});
		EventCountdown = eventCountDownFeature.length > 0 ? eventCountDownFeature[0]["time_string"] : false;
	});

	// --------------------------------------------------------------------------------------------------
	// Bonus notieren, enthält tägliche Rathaus FP
	FoEproxy.addHandler('BonusService', 'getBonuses', (data, postData) => {
		MainParser.BonusService = data.responseData;
	});

	// Limited Bonus (Archenbonus, Kraken etc.)
	FoEproxy.addHandler('BonusService', 'getLimitedBonuses', (data, postData) => {
		MainParser.SetArkBonus(data.responseData);
	});

	// --------------------------------------------------------------------------------------------------
	// Botschafter notieren, enthält Bonus FPs oder Münzen
	FoEproxy.addHandler('EmissaryService', 'getAssigned', (data, postData) => {
		MainParser.EmissaryService = data.responseData;
	});

	// --------------------------------------------------------------------------------------------------
	// Boosts zusammen tragen
	FoEproxy.addHandler('BoostService', 'getAllBoosts', (data, postData) => {
		MainParser.CollectBoosts(data.responseData);
	});


	// --------------------------------------------------------------------------------------------------
	// Karte wird gewechselt zum Außenposten
	FoEproxy.addHandler('CityMapService', 'getCityMap', (data, postData) => {
		ActiveMap = data.responseData.gridId;

		// update FP-Bar for more customizable
		// $('#fp-bar').removeClass(possibleMaps).addClass(ActiveMap);

		if (ActiveMap === 'era_outpost') {
			MainParser.CityMapEraOutpostData = Object.assign({}, ...data.responseData['entities'].map((x) => ({ [x.id]: x })));
		}
	});


	// Stadt wird wieder aufgerufen
	FoEproxy.addHandler('CityMapService', 'getEntities', (data, postData) => {

		if (ActiveMap === 'gg') return; //getEntities wurde in den GG ausgelöst => Map nicht ändern

		let MainGrid = false;
		for (let i = 0; i < postData.length; i++) {
			let postDataItem = postData[i];

			if (postDataItem['requestClass'] === 'CityMapService' && postDataItem['requestMethod'] === 'getEntities') {
				if (postDataItem['requestData'][0] === 'main') {
					MainGrid = true;
				}
				break;
			}
		}

		if (!MainGrid) return; // getEntities wurde in einer fremden Stadt ausgelöst => ActiveMap nicht ändern

		LastMapPlayerID = ExtPlayerID;

		MainParser.CityMapData = Object.assign({}, ...data.responseData.map((x) => ({ [x.id]: x })));;

		ActiveMap = 'main';
		$('#fp-bar').removeClass(possibleMaps).addClass(ActiveMap);
	});


	// main is entered
	FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
		ActiveMap = 'main';
		$('#fp-bar').removeClass(possibleMaps).addClass(ActiveMap);
	});

	// gex is entered
	FoEproxy.addHandler('GuildExpeditionService', 'getOverview', (data, postData) => {
		ActiveMap = 'gex';
		$('#fp-bar').removeClass(possibleMaps).addClass(ActiveMap);
	});

	// gg is entered
	FoEproxy.addHandler('GuildBattlegroundService', 'getBattleground', (data, postData) => {
		ActiveMap = 'gg';
		$('#fp-bar').removeClass(possibleMaps).addClass(ActiveMap);
	});

	// gvg is entered
	FoEproxy.addHandler('ClanBattleService', 'getContinent', (data, postData) => {
		ActiveMap = 'gvg';
		$('#fp-bar').removeClass(possibleMaps).addClass(ActiveMap);
	});


	// Besuche anderen Spieler
	FoEproxy.addHandler('OtherPlayerService', 'visitPlayer', (data, postData) => {
		LastMapPlayerID = data.responseData['other_player']['player_id'];
		MainParser.OtherPlayerCityMapData = Object.assign({}, ...data.responseData['city_map']['entities'].map((x) => ({ [x.id]: x })));
	});


	FoEproxy.addHandler('CityMapService', (data, postData) => {
		if (data.requestMethod === 'moveEntity' || data.requestMethod === 'moveEntities' || data.requestMethod === 'updateEntity') {
			MainParser.UpdateCityMap(data.responseData);
		}
		else if (data.requestMethod === 'placeBuilding') {
			let Building = data.responseData[0];
			if (Building && Building['id']) {
				MainParser.CityMapData[Building['id']] = Building;
			}
		}
		else if (data.requestMethod === 'removeBuilding') {
			let ID = postData[0].requestData[0];
			if (ID && MainParser.CityMapData[ID]) {
				delete MainParser.CityMapData[ID];
			}
		}
	});


	// Produktion wird eingesammelt/gestartet/abgebrochen
	FoEproxy.addHandler('CityProductionService', (data, postData) => {
		if (data.requestMethod === 'pickupProduction' || data.requestMethod === 'pickupAll' || data.requestMethod === 'startProduction' || data.requestMethod === 'cancelProduction') {
			let Buildings = data.responseData['updatedEntities'];
			if (!Buildings) return;

			MainParser.UpdateCityMap(Buildings)
		}
	});

	// Freund entfernt
	FoEproxy.addHandler('FriendService', 'deleteFriend', (data, postData) => {
		let FriendID = data.responseData;
		if (PlayerDict[FriendID]) {
			PlayerDict[FriendID]['isFriend'] = false;
		}

		if ($('#moppelhelper').length === 0) {
			EventHandler.CalcMoppelHelperTable();
		}
	});


	// Nachricht geöffnet
	FoEproxy.addHandler('ConversationService', 'getConversation', (data, postData) => {
		MainParser.UpdatePlayerDict(data.responseData, 'Conversation');
	});


	// Nachbarn/Gildenmitglieder/Freunde Tab geöffnet
	FoEproxy.addHandler('OtherPlayerService', 'all', (data, postData) => {
		if (data.requestMethod === 'getNeighborList' || data.requestMethod === 'getFriendsList' || data.requestMethod === 'getClanMemberList') {
			MainParser.UpdatePlayerDict(data.responseData, 'PlayerList', data.requestMethod);
		}
	});


	// --------------------------------------------------------------------------------------------------
	// Übersetzungen der Güter
	FoEproxy.addHandler('ResourceService', 'getResourceDefinitions', (data, postData) => {
		MainParser.setGoodsData(data.responseData);
	});


	// Required by the kits
	FoEproxy.addHandler('InventoryService', 'getItems', (data, postData) => {
		MainParser.UpdateInventory(data.responseData);
	});


	// Required by the kits
	FoEproxy.addHandler('InventoryService', 'getInventory', (data, postData) => {
		MainParser.UpdateInventory(data.responseData.inventoryItems);
	});


	// --------------------------------------------------------------------------------------------------
	// --------------------------------------------------------------------------------------------------
	// Es wurde das LG eines Mitspielers angeklickt, bzw davor die Übersicht

	// Übersicht der LGs eines Nachbarn
	FoEproxy.addHandler('GreatBuildingsService', 'getOtherPlayerOverview', (data, postData) => {
		MainParser.UpdatePlayerDict(data.responseData, 'LGOverview');
	});

	// es wird ein LG eines Spielers geöffnet

	// lgUpdateData sammelt die informationen aus mehreren Handlern
	let lgUpdateData = null;

	FoEproxy.addHandler('GreatBuildingsService', 'all', (data, postData) => {
		let getConstruction = data.requestMethod === 'getConstruction' ? data : null;
		let getConstructionRanking = data.requestMethod === 'getConstructionRanking' ? data : null;
		let contributeForgePoints = data.requestMethod === 'contributeForgePoints' ? data : null;
		let Rankings, Bonus = {};

		if (getConstruction != null) {
			Rankings = getConstruction.responseData.rankings;
			Bonus['passive'] = getConstruction.responseData.next_passive_bonus;
			Bonus['production'] = getConstruction.responseData.next_production_bonus;
			IsLevelScroll = false;
		}
		else if (getConstructionRanking != null) {
			Rankings = getConstructionRanking.responseData;
			IsLevelScroll = true;
		}
		else if (contributeForgePoints != null) {
				Rankings = contributeForgePoints.responseData;
				IsLevelScroll = false;
			}

		if (Rankings) {
			if (!lgUpdateData || !lgUpdateData.CityMapEntity) {
				lgUpdateData = { Rankings: Rankings, CityMapEntity: null, Bonus: null};
				// reset lgUpdateData sobald wie möglich (nachdem alle einzelnen Handler ausgeführt wurden)
				Promise.resolve().then(()=>lgUpdateData = null);

			} else {
				lgUpdateData.Rankings = Rankings;
				lgUpdateData.Bonus = Bonus;

				if(lgUpdateData.Rankings && lgUpdateData.CityMapEntity){
					MainParser.OwnLGData(lgUpdateData);
				}

				lgUpdate();
			}
		}
	});

	FoEproxy.addHandler('GreatBuildingsService', 'getContributions', (data, postData) => {
		MainParser.UpdatePlayerDict(data.responseData, 'LGContributions');
	});

	FoEproxy.addHandler('CityMapService', 'updateEntity', (data, postData) => {
		if (!lgUpdateData || !lgUpdateData.Rankings) {
			lgUpdateData = { Rankings: null, CityMapEntity: data};
			// reset lgUpdateData sobald wie möglich (nachdem alle einzelnen Handler ausgeführt wurden)
			Promise.resolve().then(()=>lgUpdateData = null);
		} else {
			lgUpdateData.CityMapEntity = data;
			lgUpdate();
		}
	});

	// Update Funktion, die ausgeführt wird, sobald beide Informationen in lgUpdateData vorhanden sind.
	function lgUpdate()
	{
		const { CityMapEntity, Rankings, Bonus} = lgUpdateData;
		lgUpdateData = null;
		let IsPreviousLevel = false;

		//Eigenes LG
		if (CityMapEntity.responseData[0].player_id === ExtPlayerID || Settings.GetSetting('ShowOwnPartOnAllGBs')) {
			//LG Scrollaktion: Beim ersten mal Öffnen Medals von P1 notieren. Wenn gescrollt wird und P1 weniger Medals hat, dann vorheriges Level, sonst aktuelles Level
			if (IsLevelScroll) {
				let Medals = 0;
				for (let i = 0; i < Rankings.length; i++) {
					if (Rankings[i]['reward'] !== undefined) {
						Medals = Rankings[i]['reward']['resources']['medals'];
						break;
					}
				}

				if (Medals !== LGCurrentLevelMedals) {
					IsPreviousLevel = true;
				}
			}
			else {
				let Medals = 0;
				for (let i = 0; i < Rankings.length; i++) {
					if (Rankings[i]['reward'] !== undefined) {
						Medals = Rankings[i]['reward']['resources']['medals'];
						break;
					}
				}
				LGCurrentLevelMedals = Medals;
			}

			Parts.CityMapEntity = CityMapEntity.responseData[0];
			Parts.Rankings = Rankings;
			Parts.IsPreviousLevel = IsPreviousLevel;

			// das erste LG wurde geladen
			$('#partCalc-Btn').removeClass('hud-btn-red');
			$('#partCalc-Btn-closed').remove();

			if ($('#OwnPartBox').length > 0) {
				Parts.Show();
			}

			if (!IsLevelScroll) {
				MainParser.OwnLG(CityMapEntity.responseData[0]);
			}
		}

		//Fremdes LG
		if (CityMapEntity.responseData[0].player_id !== ExtPlayerID && !IsLevelScroll)
		{
			LastKostenrechnerOpenTime = MainParser.getCurrentDateTime()

			$('#calculator-Btn').removeClass('hud-btn-red');
			$('#calculator-Btn-closed').remove();

			Calculator.Rankings = Rankings;
			Calculator.CityMapEntity = CityMapEntity['responseData'][0];

			// wenn schon offen, den Inhalt updaten
			if ($('#costCalculator').is(':visible')) {
				Calculator.Show(Rankings, CityMapEntity.responseData[0]);
			}
		}

	}

	// --------------------------------------------------------------------------------------------------
	// Gilden-GüterLog wird aufgerufen

	/*
	FoEproxy.addHandler('ClanService', 'getTreasuryLogs', (data, postData) => {
		if (Settings.GetSetting('GlobalSend')) {
			MainParser.SendGoodsLog(data['responseData']['logs']);
		}
	});
	*/


	// Güter des Spielers ermitteln
	FoEproxy.addHandler('ResourceService', 'getPlayerResources', (data, postData) => {
		ResourceStock = data.responseData.resources; // Lagerbestand immer aktualisieren. Betrifft auch andere Module wie Technologies oder Negotiation
		Outposts.CollectResources();
		StrategyPoints.ShowFPBar();
	});


	// Verarbeite Daten die an foe-rechner.de geschickt werden können

	// eigene LG Daten speichern
	FoEproxy.addHandler('InventoryService', 'getGreatBuildings', (data, postData) => {
		if (!Settings.GetSetting('GlobalSend')) {
			return;
		}
		MainParser.SaveLGInventory(data.responseData);
	});


	//--------------------------------------------------------------------------------------------------
	//--------------------------------------------------------------------------------------------------


	// LGs des eigenen Clans auslesen
	FoEproxy.addHandler('OtherPlayerService', 'visitPlayer', (data, postData) => {
		if (!Settings.GetSetting('GlobalSend') || !Settings.GetSetting('SendGildMemberLGInfo')) {
			return;
		}
		MainParser.OtherPlayersLGs(data['responseData']);
	});

	//--------------------------------------------------------------------------------------------------
	//--------------------------------------------------------------------------------------------------


	// Gildenmitglieder in der GEX (Fortschritt, Plazierung usw.)
	FoEproxy.addHandler('GuildExpeditionService', 'getContributionList', (data, postData) => {
		if (!Settings.GetSetting('GlobalSend') || !Settings.GetSetting('SendGEXInfo')) {
			return;
		}
		if (MainParser.checkNextUpdate('GuildExpedition') !== true) {
			return;
		}
		MainParser.GuildExpedition(data.responseData);
	});

	//--------------------------------------------------------------------------------------------------
	//--------------------------------------------------------------------------------------------------


	// Gildenplatzierung in der GEX
	FoEproxy.addHandler('ChampionshipService', 'getOverview', (data, postData) => {
		if (!Settings.GetSetting('GlobalSend') || !Settings.GetSetting('SendGEXInfo')) {
			return;
		}
		if (MainParser.checkNextUpdate('Championship') !== true){
			return;
		}
		MainParser.Championship(data.responseData);
	});


	//--------------------------------------------------------------------------------------------------
	//--------------------------------------------------------------------------------------------------


	// Greatbuildings: LG Belohnungen von Arche in Events zählen
	FoEproxy.addHandler('OtherPlayerService', 'getEventsPaginated', (data, postData) => {
		if (data.responseData['events']) {
			GreatBuildings.HandleEventPage(data.responseData['events']);
		}
	});

	// ende der Verarbeiter von data für foe-rechner.de


	FoEproxy.addHandler('TimeService', 'updateTime', (data, postData) => {
		if (!StartUpDone) return;

		// erste Runde
		if(MainMenuLoaded === false){
			MainMenuLoaded = data.responseData.time;
		}
		// zweite Runde
		else if (MainMenuLoaded !== false && MainMenuLoaded !== true){
			let MenuSetting = localStorage.getItem('SelectedMenu');
			MenuSetting = MenuSetting || 'BottomBar';
			MainParser.SelectedMenu = MenuSetting;
			_menu.CallSelectedMenu(MenuSetting);
			MainMenuLoaded = true;

			MainParser.setLanguage();
		}
		GameTimeOffset = data.responseData.time*1000 - new Date().getTime();
	});


	// --------------------------------------------------------------------------------------------------
	// GüterUpdate nach angenommenen Handel
	FoEproxy.addRawWsHandler((data) => {
		let Msg = data[0];
		if(Msg === undefined || Msg['requestClass'] === undefined){
			return ;
		}
		if(Msg['requestMethod'] === "newEvent" && Msg['responseData']['type'] === "trade_accepted"){
			let d = Msg['responseData'];
			ResourceStock[d['need']['good_id']] += d['need']['value'];
		}
	});

	// --------------------------------------------------------------------------------------------------
	// Quests
	FoEproxy.addHandler('QuestService', 'getUpdates', (data, PostData) => {
		if (PostData[0].requestClass === 'QuestService' && PostData[0].requestMethod === 'advanceQuest') {
			FPCollector.HandleAdvanceQuest(PostData[0]);
		}

		MainParser.Quests = data.responseData;

		if($('#costCalculator').length > 0){
			Calculator.Show();
		}
		if ($('#OwnPartBox').length > 0) {
			Parts.Show();
		}
	});


	// Alte, nich mehr benötigte localStorage einträge löschen (in 2 min)
	setTimeout(()=>{
		const keys = Object.keys(localStorage);
		for (let k of keys) {
			if (/^(OV_)?[0-9]+\/X_[A-Za-z_]+[0-9]*$/.test(k)) {
				localStorage.removeItem(k);
			} else if (/^OtherPlayersMotivation-[0-9]+$/.test(k)) {
				localStorage.removeItem(k);
			}
		}
	}, 1000*60*2);


})();

let HelperBeta = {
	load: (active) => {
		if (active !== false) active = true;
		localStorage.setItem('HelperBetaActive', active);
		location.reload();
	},
	menu: [
		'alerts',
		'unitsGex'
	],
	active: JSON.parse(localStorage.getItem('HelperBetaActive'))
};

/**
 * @type {{BuildingSelectionKits: null, StartUpType: null, SetArkBonus: MainParser.SetArkBonus, setGoodsData: MainParser.setGoodsData, SaveLGInventory: MainParser.SaveLGInventory, SaveBuildings: MainParser.SaveBuildings, Conversations: [], UpdateCityMap: MainParser.UpdateCityMap, UpdateInventory: MainParser.UpdateInventory, SelectedMenu: string, CityEntities: null, ArkBonus: number, InnoCDN: string, OtherPlayersMotivation: MainParser.OtherPlayersMotivation, obj2FormData: obj2FormData, GuildExpedition: (function(*=): undefined), CityMetaId: null, UpdatePlayerDict: MainParser.UpdatePlayerDict, PlayerPortraits: null, Quests: null, i18n: null, ResizeFunctions: MainParser.ResizeFunctions, getAddedDateTime: (function(*=, *=): number), loadJSON: MainParser.loadJSON, ExportFile: MainParser.ExportFile, getCurrentDate: (function(): Date), SocialbarList: (function(*): undefined), Championship: (function(*): undefined), activateDownload: boolean, Inventory: {}, compareTime: (function(number, number): (string|boolean)), EmissaryService: null, setLanguage: MainParser.setLanguage, BoostMapper: Record<string, string>, SelfPlayer: (function(*): undefined), UnlockedAreas: null, CollectBoosts: MainParser.CollectBoosts, sendExtMessage: (function(*): Promise<*|undefined>), ClearText: (function(*): *), VersionSpecificStartupCode: MainParser.VersionSpecificStartupCode, checkNextUpdate: (function(*=): string|boolean), Language: string, UpdatePlayerDictCore: MainParser.UpdatePlayerDictCore, BonusService: null, OwnLGData: (function(*): boolean), setConversations: MainParser.setConversations, StartUp: MainParser.StartUp, OtherPlayersLGs: (function(*): boolean), CityMapData: {}, AllBoosts: {supply_production: number, coin_production: number, def_boost_defender: number, att_boost_attacker: number, happiness_amount: number}, OtherPlayerCityMapData: {}, CityMapEraOutpostData: null, getCurrentDateTime: (function(): number), OwnLG: (function(*=): boolean), round: (function(number): number), savedFight: null, BuildingSets: null, loadFile: MainParser.loadFile, send2Server: MainParser.send2Server}}
 */
let MainParser = {

	activateDownload: false,
	savedFight:null,
	Language: 'en',
	SelectedMenu: 'BottomBar',
	i18n: null,
	BonusService: null,
	EmissaryService: null,
	PlayerPortraits: null,
	Conversations: [],
	CityMetaId: null,
	CityEntities: null,
	StartUpType: null,

	// all buildings of the player
	CityMapData: {},
	CityMapEraOutpostData: null,
	OtherPlayerCityMapData: {},

	// Unlocked extensions
	UnlockedAreas: null,
	Quests: null,
	ArkBonus: 0,
	Inventory: {},

	// Update levels of the event buildings
	BuildingSelectionKits: null,

	// Building sets
	BuildingSets: null,


	InnoCDN: 'https://foede.innogamescdn.com/',


	/**
	* Version specific StartUp Code
    * Todo: Add code that should be executed only until the next update
	*
	*/
	VersionSpecificStartupCode: () => {
		let LastStartedVersion = localStorage.getItem('LastStartedVersion');
		let LastAgreedVersion = localStorage.getItem('LastAgreedVersion');

		if (!LastStartedVersion) {
			MainParser.StartUpType = 'DeletedSettings';
			/* Fresh install of deleted settings */
			/* Attention: If you do stuff here it might be executed every start when surfing in incognito mode */
		}
		else if (LastStartedVersion !== extVersion) {
			MainParser.StartUpType = 'UpdatedVersion';
			/* We have a new version installed and started the first time */
		}
		else if (LastAgreedVersion !== extVersion) {
			MainParser.StartUpType = 'NotAgreed';
			/* This is a second start, but the player has not yet agreed to the new prompt */
		}
		else {
			MainParser.StartUpType = 'RegularStart';
			/* Normal start */
        }

		localStorage.setItem('LastStartedVersion', extVersion);
		localStorage.setItem('LastAgreedVersion', extVersion); //Comment out this line if you have something the player must agree on
    },


	/** @type {Record<string,string>} */
	BoostMapper: {
		'supplies_boost': 'supply_production',
		'happiness' : 'happiness_amount',
		'military_boost' : 'att_boost_attacker',
		'money_boost' : 'coin_production'
	},


	/**
	 * Speichert alle aktiven Boosts
	 */
	AllBoosts: {
		'def_boost_defender': 0,
		'happiness_amount': 0,
		'att_boost_attacker': 0,
		'coin_production': 0,
		'supply_production': 0
	},


	/**
	 * Etwas zur background.js schicken
	 *
	 * @param {any & {type: string}} data
	 */
	sendExtMessage: async (data) => {
		let response = null;
		// @ts-ignore
		if (typeof chrome !== 'undefined') {
			// @ts-ignore
			response = await new Promise(resolve => chrome.runtime.sendMessage(extID, data, resolve));
		} else if (typeof browser !== 'undefined') {
			response = await browser.runtime.sendMessage(extID, data);
		} else {
			// TODO: implement
			window.dispatchEvent(new CustomEvent(extID+'#message', {detail: data}));
			throw new Error("backwards Communication from Extension not implemented");
		}

		if (response.ok) {
			return response.data;
		} else {
			throw new Error('EXT-API error: '+response.error);
		}
	},


	/**
	 *
	 */
	setLanguage: ()=>{
		// Translation
		MainParser.Language = GuiLng;
	},


	/**
	 * Add x minutes or x hours to the current time
	 *
	 * @param hrs
	 * @param min
	 * @returns {number}
	 */
	getAddedDateTime: (hrs, min = 0)=> {

		let time = MainParser.getCurrentDateTime(),
			h = hrs || 0,
			m = min || 0,

			// Zeit aufschlagen
			newTime = time + (1000*60*m) + (1000*60*60*h),

			// daraus neues Datumsobjekt erzeugen
			newDate = new Date(newTime);

		return newDate.getTime();
	},


	/**
	 * Returns the current date time
	 *
	 * @returns {number}
	 */
	getCurrentDateTime: () => {
		return MainParser.getCurrentDate().getTime();
	},


	/**
	 * Returns the current date in playing time
	 *
	 * @returns {Date}
	 */
	getCurrentDate: () => {
		return new Date(Date.now() + GameTimeOffset);
	},


	/**
	 * Performs rounding taking into account floating point inaccuracy
	 *
	 * @param {number} value
	 * @returns {number}
	 */
	round: (value) => {
		let Epsilon = 0.000001;

		if (value >= 0) {
			return Math.round(value + Epsilon);
		}
		else {
			return Math.round(value - Epsilon);
		}
	},


	/**
	 * Storage has always had a time surcharge
	 *
	 * @param {number} actual
	 * @param {number} storage
	 * @returns {string|boolean}
	 */
	compareTime: (actual, storage)=> {

		// es gibt noch keinen Eintrag
		if(storage === null){
			return true;

		} else if(actual > storage){
			return true;

			// Zeit Differenz berechnen
		} else if(storage > actual){

			let diff = Math.abs(actual - storage),
				timeDiff = new Date(diff);

			let hh = Math.floor(timeDiff / 1000 / 60 / 60);
			if(hh < 10) {
				hh = '0' + hh;
			}
			timeDiff -= hh * 1000 * 60 * 60;

			let mm = Math.floor(timeDiff / 1000 / 60);
			if(mm < 10) {
				mm = '0' + mm;
			}
			timeDiff -= mm * 1000 * 60;

			let ss = Math.floor(timeDiff / 1000);
			if(ss < 10) {
				ss = '0' + ss;
			}

			return mm + "min und " + ss + 's';
		}
	},


	/**
	 * Check whether an update is necessary
	 *
	 * @param ep
	 * @returns {*}
	 */
	checkNextUpdate: (ep)=> {
		let s = localStorage.getItem(ep),
			a = MainParser.getCurrentDateTime();

		return MainParser.compareTime(a, s);
	},


	/**
	 * Adds a value to a FormData object under the specified prefix/key, serialising objects/arrays.
	 *
	 * @param {FormData} formData the formdata to add this data to
	 * @param {string} prefix the prefix/key for the value to store
	 * @param {any} value the value to store
	 */
	obj2FormData: (() => {// closure
		// Funktion wird im scope definiert, damit die rekursion direkt darauf zugreifen kann.
		function obj2FormData(formData, prefix, value) {
			if (typeof value === 'object') {
				for (let k in value) {
					if (!value.hasOwnProperty(k)) continue;
					obj2FormData(formData, `${prefix}[${k}]`, value[k]);
				}
			} else {
				formData.append(prefix, ''+value);
			}
		}
		return obj2FormData;
	})(),


	/**
	 * Sending data "home"
	 *
	 * @param data
	 * @param ep
	 * @param successCallback
	 */
	send2Server: (data, ep, successCallback)=> {

		const pID = ExtPlayerID;
		const cW = ExtWorld;
		const gID = ExtGuildID;


		let req = fetch(
			ApiURL + ep + '/?player_id=' + pID + '&guild_id=' + gID + '&world=' + cW,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({data})
			}
		);

		if (successCallback !== undefined) {
			req
				.then(response => {
					if (response.status === 200) {
						response
							.json()
							.then(successCallback)
						;
					}
				})
			;
		}
	},


	/**
	 * Stitching through guild members
	 *
	 * @param d
	 */
	SocialbarList: (d)=> {

		if(!Settings.GetSetting('GlobalSend') || !MainParser.checkNextUpdate('OtherPlayers'))
		{
			return ;
		}

		let player = [];

		// guild members on website
		for(let k in d){
			if(d.hasOwnProperty(k)){

				const p = d[k];

				// if is a guild member, update data
				if(ExtGuildID === p['clan_id']){
					let info = {
						avatar: p['avatar'],
						city_name: p['city_name'],
						clan_id: p['clan_id'],
						name: p['name'],
						player_id: p['player_id'],
						rank: p['rank'],
						title: p['title'],
						won_battles: p['won_battles'],
						score: p['score'],
						profile_text: p['profile_text'],
					};

					player.push(info);
				}
			}
		}


		// not empty, send it
		if(player.length > 0){
			MainParser.sendExtMessage({
				type: 'send2Api',
				url: ApiURL + 'OtherPlayers/?player_id=' + ExtPlayerID + '&guild_id=' + ExtGuildID + '&world=' + ExtWorld,
				data: JSON.stringify(player)
			});
		}
	},


	/**
	 * Update own LGs
	 * Time slot - 15min
	 *
	 * @param d
	 * @returns {boolean}
	 */
	OwnLG: (d)=> {

		let lg_name = 'LG-' + d['cityentity_id'] + '-' + ExtPlayerID,
			time = MainParser.checkNextUpdate(lg_name);

		// noch nicht wieder updaten oder es ist kein "eigenes" LG
		if (!time || d['player_id'] !== ExtPlayerID) {
			return false;
		}

		MainParser.send2Server(d, 'OwnLG', function (r) {

			// nach Erfolg, Zeitstempel in den LocalStorage
			if (r['status'] === 'OK') {
				localStorage.setItem(lg_name, MainParser.getAddedDateTime(0, 15));
			}
		});
	},


	/**
	 * Collect some stats
	 *
	 * @param d
	 * @returns {boolean}
	 * @constructor
	 */
	OwnLGData: (d)=> {

		const dataEntity = d['CityMapEntity']['responseData'][0],
			realData = {
				entity: dataEntity,
				ranking: d['Rankings'],
				bonus: d['Bonus'],
				era: CurrentEraID
			}

		if (dataEntity['player_id'] !== ExtPlayerID)
		{
			return false;
		}

		MainParser.sendExtMessage({
			type: 'send2Api',
			url: `${ApiURL}OwnLGData/?world=${ExtWorld}`,
			data: JSON.stringify(realData)
		});
	},


	/**
	 * Update other players' LGs, but only guilds' own LGs.
	 *
	 * @param d
	 * @returns {boolean}
	 */
	OtherPlayersLGs: (d)=> {

		// gehört nicht zur Gilde
		if(ExtGuildID !== d['other_player']['clan_id']){
			return false;
		}

		let lg = d['city_map']['entities'],
			data = [],
			player = {
				player_id: d['other_player']['player_id'],
				name: d['other_player']['name'],
				guild_id: d['other_player']['clan_id'],
			},
			lgs = [];

		data.push(player);

		for(let k in lg){

			if(!lg.hasOwnProperty(k)){
				break;
			}

			// nur wenn es eines dieser Gebäude ist
			if(lg[k]['type'] === 'greatbuilding')
			{
				let lgd = {

					cityentity_id: lg[k]['cityentity_id'],
					level: lg[k]['level'],
					max_level: lg[k]['max_level'],
					invested_forge_points: lg[k]['state']['invested_forge_points'],
					forge_points_for_level_up: lg[k]['state']['forge_points_for_level_up']
				};

				lgs.push(lgd);
			}
		}

		if(lgs.length > 0){
			data.push({lgs: lgs});

			// ab zum Server
			MainParser.sendExtMessage({
				type: 'send2Api',
				url: ApiURL + 'OtherPlayersLGs/?player_id=' + ExtPlayerID + '&guild_id=' + ExtGuildID + '&world=' + ExtWorld,
				data: JSON.stringify(data)
			});

			if (!Settings.GetSetting('ShowNotifications')) return;

			$.toast({
				heading: d['other_player']['name'] + ' geupdated',
				text: HTML.i18nReplacer(
					i18n('API.LGGildMember'),
					{
						'player' : d['other_player']['name']
					}
				),
				icon: 'success',
				position: Settings.GetSetting('NotificationsPosition', true)
			});
		}
	},


	/**
	 * Collect gex stats from players for website
	 *
	 * @param d
	 */
	GuildExpedition: (d)=> {

		// Suppress double sending
		let time = MainParser.checkNextUpdate('API-GEXPlayer');

		if(time !== true){
			return;
		}

		MainParser.sendExtMessage({
			type: 'send2Api',
			url: ApiURL + 'GEXPlayer/?player_id=' + ExtPlayerID + '&guild_id=' + ExtGuildID + '&world=' + ExtWorld,
			data: JSON.stringify(d)
		});

		if(Settings.GetSetting('ShowNotifications'))
		{
			$.toast({
				heading: i18n('API.UpdateSuccess'),
				text: i18n('API.GEXPlayer'),
				icon: 'success',
				position: Settings.GetSetting('NotificationsPosition', true)
			});
		}

		localStorage.setItem('API-GEXPlayer', MainParser.getAddedDateTime(0, 1));
	},


	/**
	 * Collect gild overview from current gex
	 *
	 * @param d
	 */
	Championship: (d)=> {

		let data = {
			participants: d['participants'],
			ranking: d['ranking'],
		};

		MainParser.sendExtMessage({
			type: 'send2Api',
			url: ApiURL + 'GEXChampionship/?player_id=' + ExtPlayerID + '&guild_id=' + ExtGuildID + '&world=' + ExtWorld,
			data: JSON.stringify(data)
		});

		if (!Settings.GetSetting('ShowNotifications')) return;

		$.toast({
			heading: i18n('API.UpdateSuccess'),
			text: i18n('API.GEXChampionship'),
			icon: 'success',
			position: Settings.GetSetting('NotificationsPosition', true)
		});
	},


	/**
	 * Back up player data
	 *
	 * @param d
	 */
	StartUp: (d) => {
		Settings.Init(false);

		MainParser.VersionSpecificStartupCode();

		StartUpDone = true;
		ExtGuildID = d['clan_id'];
		ExtWorld = window.location.hostname.split('.')[0];
		CurrentEra = d['era'];
		if (CurrentEra['era']) CurrentEra = CurrentEra['era'];
		CurrentEraID = Technologies.Eras[CurrentEra];

		MainParser.sendExtMessage({
			type: 'storeData',
			key: 'current_guild_id',
			data: ExtGuildID
		});
		localStorage.setItem('current_guild_id', ExtGuildID);

		ExtPlayerID = d['player_id'];
		MainParser.sendExtMessage({
			type: 'storeData',
			key: 'current_player_id',
			data: ExtPlayerID
		});
		localStorage.setItem('current_player_id', ExtPlayerID);

		IndexDB.Init(ExtPlayerID);

		MainParser.sendExtMessage({
			type: 'storeData',
			key: 'current_world',
			data: ExtWorld
		});
		localStorage.setItem('current_world', ExtWorld);

		ExtPlayerName = d['user_name'];
		MainParser.sendExtMessage({
			type: 'storeData',
			key: 'current_player_name',
			data: ExtPlayerName
		});

		MainParser.sendExtMessage({
			type: 'setPlayerData',
			data: {
				world: ExtWorld,
				player_id: ExtPlayerID,
				name: d.user_name,
				portrait: d.portrait_id,
				guild_id: d.clan_id,
				guild_name: d.clan_name
			}
		});

		Infoboard.Init();
	},


	/**
	 * Update own data (guild change etc)
	 *
	 * @param d
	 */
	SelfPlayer: (d)=>{

		if(Settings.GetSetting('GlobalSend') === false)
		{
			return;
		}

		let data = {
			player_id: d['player_id'],
			user_name: d['user_name'],
			portrait_id: d['portrait_id'],
			clan_id: d['clan_id'],
		};

		MainParser.sendExtMessage({
			type: 'send2Api',
			url: `${ApiURL}SelfPlayer/?player_id=${ExtPlayerID}&guild_id=${ExtGuildID}&world=${ExtWorld}&v=${extVersion}`,
			data: JSON.stringify(data)
		});
	},


	/**
	 * Alle Gebäude sichern,
	 * Update your own LGs
	 *
	 * @param d
	 */
	SaveBuildings: (d)=>{
		let lgs = [];

		for(let i in d)
		{
			if (!d.hasOwnProperty(i)) continue;

			if (d[i]['type'] === 'greatbuilding') {
				let b = {
					cityentity_id: d[i]['cityentity_id'],
					level: d[i]['level'],
					max_level: d[i]['max_level'],
					invested_forge_points: d[i]['state']['invested_forge_points'] || 0,
					forge_points_for_level_up: d[i]['state']['forge_points_for_level_up']
				};

				lgs.push(b);

				if(d[i]['bonus'] !== undefined && MainParser.BoostMapper[d[i]['bonus']['type']] !== undefined)
				{
					if (d[i]['bonus']['type'] !== 'happiness') { //Nicht als Boost zählen => Wird Productions extra geprüft und ausgewiesen
						MainParser.AllBoosts[MainParser.BoostMapper[d[i]['bonus']['type']]] += d[i]['bonus']['value']
					}
				}
			}
		}

		if (lgs.length > 0) {
			// ab zum Server
			MainParser.sendExtMessage({
				type: 'send2Api',
				url: ApiURL + 'SelfPlayerLGs/?player_id=' + ExtPlayerID + '&guild_id=' + ExtGuildID + '&world=' + ExtWorld,
				data: JSON.stringify(lgs)
			});
		}
	},


	/**
	 * Collects active boosts from the city
	 *
	 * @param d
	 */
	CollectBoosts: (d)=>{
		for(let i in d)
		{
			if (!d.hasOwnProperty(i)) continue;

			if (MainParser.AllBoosts[d[i]['type']] !== undefined)
			{
				MainParser.AllBoosts[d[i]['type']] += d[i]['value']
			}

			if (d[i]['type'] === 'extra_negotiation_turn') {
				Negotiation.TavernBoostExpireTime = d[i]['expireTime'];
			}
		}
	},


	/**
	 * Save LGs of the player
	 *
	 * @param d
	 */
	SaveLGInventory: (d)=>{
		MainParser.sendExtMessage({
			type: 'send2Api',
			url: ApiURL + 'LGInventory/?player_id=' + ExtPlayerID + '&guild_id=' + ExtGuildID + '&world=' + ExtWorld,
			data: JSON.stringify(d)
		});
	},


	/**
	 * Motivating Polishing Tracking, if desired
	 *
	 * @param d
	 */
	OtherPlayersMotivation: (d)=>{

		let page = d['page'],
			ev = d['events'],
			data = [],
			pm = [];

		data.push({page: page});

		for(let i in ev){

			if (ev.hasOwnProperty(i)) {

				let pd = { };

				if(ev[i]['type'] === 'social_interaction' || ev[i]['type'] === 'friend_tavern_sat_down' || ev[i]['type'] === 'battle') {
					pd = {
						id: ev[i]['id'],
						date: ev[i]['date'],
						entity_id: '',
						is_friend: ev[i]['other_player']['is_friend'],
						is_guild_member: ev[i]['other_player']['is_guild_member'],
						is_neighbor: ev[i]['other_player']['is_neighbor'],
						name: ev[i]['other_player']['name'],
						player_id: ev[i]['other_player']['player_id']
					};

					let entity =  '';

					if(ev[i]['entity_id'] !== undefined){
						entity = MainParser.CityEntities[ev[i]['entity_id']]['name'];
					}

					if(ev[i]['type'] === 'social_interaction'){
						pd['entity_id'] = entity;
						pd['action'] = ev[i]['interaction_type'] || '';

					} else if (ev[i]['type'] === 'friend_tavern_sat_down'){
						pd['action'] = 'friend_tavern_sat_down';

					}  else if (ev[i]['type'] === 'battle'){
						pd['action'] = 'battle|' + ev[i]['status'];
						pd['entity_id'] = entity;
					}

					pm.push(pd);
				}
			}
		}

		if(pm.length > 0){
			data.push({players: pm});

			MainParser.send2Server(data, 'OtherPlayersMotivation', function(r){

				// nach Erfolg, Zeitstempel in den LocalStorage
				if(r['status'] === 'OK'){
					localStorage.setItem('OtherPlayersMotivation-' + page, MainParser.getAddedDateTime(0, 10));

					if (!Settings.GetSetting('ShowNotifications')) return;

					$.toast({
						heading: i18n('Boxes.Investment.PlayerFound'),
						text: HTML.i18nReplacer(
							r.new === 1 ? i18n('Boxes.Investment.PlayerFoundCount') : i18n('Boxes.Investment.PlayerFoundCounter'),
							{
								count: r.new
							}
						),
						icon: 'success',
						hideAfter: 2600,
						position: Settings.GetSetting('NotificationsPosition', true)
					});

				} else if (r['status'] === 'NOTICE') {
					localStorage.setItem('OtherPlayersMotivation-' + page, MainParser.getAddedDateTime(1, 0));

					if (!Settings.GetSetting('ShowNotifications')) return;

					$.toast({
						heading: i18n('Boxes.Investment.AllUpToDate'),
						text: i18n('Boxes.Investment.AllUpToDateDesc'),
						icon: 'info',
						hideAfter: 6000,
						position: Settings.GetSetting('NotificationsPosition', true)
					});
				}
			});
		}
	},


	/**
	 * Determine ark bonus globally
	 *
	 * @param LimitedBonuses
	 */
	SetArkBonus: (LimitedBonuses) => {
		let ArkBonus = 0;

		for (let i in LimitedBonuses) {

			if(!LimitedBonuses.hasOwnProperty(i)){break}

			if (LimitedBonuses[i].type === 'contribution_boost') {
				ArkBonus += LimitedBonuses[i].value;
			}
		}

		MainParser.ArkBonus = ArkBonus;
	},


	/**
	 * Player information Updating message list & Website data
	 *
	 * @param d
	 * @param Source
	 * @param ListType
	 * @constructor
	 */
	UpdatePlayerDict: (d, Source, ListType = undefined) => {
		if (Source === 'Conversation')
		{
			for (let i in d['messages'])
			{
				if(!d['messages'].hasOwnProperty(i))
					continue;

				let Message = d['messages'][i];

				if (Message.sender !== undefined)
				{
					MainParser.UpdatePlayerDictCore(Message.sender);
				}
			}
		}

		else if (Source === 'LGOverview')
		{
			MainParser.UpdatePlayerDictCore(d[0].player);
		}

		else if (Source === 'LGContributions')
		{
			for (let i in d)
			{
				if(!d.hasOwnProperty(i))
					continue;

				MainParser.UpdatePlayerDictCore(d[i].player);
			}
		}

		else if (Source === 'PlayerList')
		{
			for (let i in d)
			{
				if(!d.hasOwnProperty(i))
					continue;

				MainParser.UpdatePlayerDictCore(d[i]);
			}

			if (ListType === 'getNeighborList')
			{
				PlayerDictNeighborsUpdated = true;
			}
			else if (ListType === 'getClanMemberList')
			{
				PlayerDictGuildUpdated = true;
			}
			else if (ListType === 'getFriendsList')
			{
					PlayerDictFriendsUpdated = true;
			}

			if ($('#moppelhelper').length > 0)
			{
				EventHandler.CalcMoppelHelperBody();
			}

			if (Settings.GetSetting('GlobalSend') && ListType === 'getClanMemberList')
			{
				MainParser.sendExtMessage({
					type: 'send2Api',
					url: `${ApiURL}GuildMembers/?player_id=${ExtPlayerID}&guild_id=${ExtGuildID}&world=${ExtWorld}`,
					data: JSON.stringify(d)
				});
			}
		}
	},


	/**
	 * Update player information
	 *
	 * @param Player
	 * @constructor
	 */
	UpdatePlayerDictCore: (Player) => {

		let PlayerID = Player['player_id'];

		if (PlayerID !== undefined)
		{
			if (PlayerDict[PlayerID] === undefined) PlayerDict[PlayerID] = {};

			PlayerDict[PlayerID]['PlayerID'] = PlayerID;
			if (Player['name'] !== undefined) PlayerDict[PlayerID]['PlayerName'] = Player['name'];
			if (Player['clan'] !== undefined) PlayerDict[PlayerID]['ClanName'] = Player['clan']['name'];
			if (Player['clan_id'] !== undefined) PlayerDict[PlayerID]['ClanId'] = Player['clan_id'];
			if (Player['avatar'] !== undefined) PlayerDict[PlayerID]['Avatar'] = Player['avatar'];
			if (Player['is_neighbor'] !== undefined) PlayerDict[PlayerID]['IsNeighbor'] = Player['is_neighbor'];
			if (Player['is_guild_member'] !== undefined) PlayerDict[PlayerID]['IsGuildMember'] = Player['is_guild_member'];
			if (Player['is_friend'] !== undefined) PlayerDict[PlayerID]['IsFriend'] = Player['is_friend'];
			if (Player['is_self'] !== undefined) PlayerDict[PlayerID]['IsSelf'] = Player['is_self'];
			if (Player['score'] !== undefined) PlayerDict[PlayerID]['Score'] = Player['score'];
		}
	},


	/**
	 * Compose translations for the goods
	 *
	 * @param d
	 */
	setGoodsData: (d)=> {
		for(let i in d){
			if(d.hasOwnProperty(i)) {
				GoodsData[d[i]['id']] = d[i];
			}
		}
	},


	/**
	 * Updates the inventory
	 *
	 * @param Items
	 */
	UpdateInventory: (Items) => {
		MainParser.Inventory = {};
		for (let i = 0; i < Items.length; i++) {
			let ID = Items[i]['id'];
			MainParser.Inventory[ID] = Items[i];
		}
	},


	/**
	 * Updates a building from CityMapData or CityMapEraOutpost
	 *
	 * @param Buildings
	 * */
	UpdateCityMap: (Buildings) => {
		for (let i in Buildings) {
			if (!Buildings.hasOwnProperty(i)) continue;

			if (Buildings[i]['player_id'] !== ExtPlayerID) continue; //Fremdes Gebäude (z.B. Nachbarn besuchen und LG öffnen)

			let ID = Buildings[i]['id'];
			if (MainParser.CityMapData[ID]) {
				MainParser.CityMapData[ID] = Buildings[i];
			}
			if (MainParser.CityMapEraOutpostData && MainParser.CityMapEraOutpostData[ID]) {
				MainParser.CityMapEraOutpostData[ID] = Buildings[i];
			}
		}

		if ($('#bluegalaxy').length > 0) {
			BlueGalaxy.CalcBody();
		}

		FPCollector.CityMapDataNew = Buildings;
	},


	/**
	 * Collect titles of the chats
	 *
	 * @param d
	 */
	setConversations: (d)=> {

		// If the cache is empty, read out the memory.
		if (MainParser.Conversations.length === 0)
		{
			let StorageHeader = localStorage.getItem('ConversationsHeaders');
			if (StorageHeader !== null)
			{
				MainParser.Conversations = JSON.parse(StorageHeader);
			}
		}

		if (d['teasers'])
		{
			for (let k in d['teasers'])
			{
				if (!d['teasers'].hasOwnProperty(k))
				{
					continue;
				}

				let key = MainParser.Conversations.findIndex((obj)=> (obj.id === d['teasers'][k]['id']));

				// Is a key already available?
				if (key !== -1)
				{
					MainParser.Conversations[key]['type'] = d['type'];
					MainParser.Conversations[key]['title'] = d['teasers'][k]['title'];
					MainParser.Conversations[key]['hidden'] = d['teasers'][k]['isHidden'];
					MainParser.Conversations[key]['favorite'] = d['teasers'][k]['isFavorite'];
					MainParser.Conversations[key]['important'] = d['teasers'][k]['isImportant'];
				}
				// → Create key
				else {
					MainParser.Conversations.push({
						type: d['type'],
						id: d['teasers'][k]['id'],
						title: d['teasers'][k]['title'],
						hidden: d['teasers'][k]['isHidden'],
						favorite: d['teasers'][k]['isFavorite'],
						favorite: d['teasers'][k]['isImportant']
					});
				}

			}

		}
		else if (d['category'] && d['category']['teasers'])
		{
			for (let k in d['category']['teasers'])
			{
				if (!d['category']['teasers'].hasOwnProperty(k))
				{
					continue;
				}

				let key = MainParser.Conversations.findIndex((obj)=> (obj.id === d['category']['teasers'][k]['id']));

				// Is a key already available?
				if (key !== -1)
				{
					MainParser.Conversations[key]['type'] = d['category']['type'];
					MainParser.Conversations[key]['title'] = d['category']['teasers'][k]['title'];
					MainParser.Conversations[key]['hidden'] = d['category']['teasers'][k]['isHidden'];
					MainParser.Conversations[key]['favorite'] = d['category']['teasers'][k]['isFavorite'];
					MainParser.Conversations[key]['important'] = d['category']['teasers'][k]['isImportant'];
				}

				// → Create key
				else {
					MainParser.Conversations.push({
						type: d['category']['type'],
						id: d['category']['teasers'][k]['id'],
						title: d['category']['teasers'][k]['title'],
						hidden: d['category']['teasers'][k]['isHidden'],
						favorite: d['category']['teasers'][k]['isFavorite'],
						favorite: d['category']['teasers'][k]['isImportant']
					});
				}
			}
		}

		if (MainParser.Conversations.length > 0) {
			// Dopplungen entfernen und Daten lokal abspeichern
			MainParser.Conversations = [...new Set(MainParser.Conversations.map(s => JSON.stringify(s)))].map(s => JSON.parse(s));
			localStorage.setItem('ConversationsHeaders', JSON.stringify(MainParser.Conversations));
		}
	},


	/**
	 * Get a jSON via Ajax
	 *
	 */
	loadJSON: (url, callback)=> {

		let xobj = new XMLHttpRequest();
		xobj.overrideMimeType("application/json");
		xobj.open('GET', url, true);
		xobj.onreadystatechange = function () {
			if (xobj.readyState === 4 && xobj.status === 200) {
				callback(xobj.responseText);
			}
		};
		xobj.send(null);
	},


	loadFile: (url, callback)=> {

		let xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'blob';
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4 && xhr.status === 200) {
				let reader = new FileReader();
				reader.readAsArrayBuffer(xhr.response);
				reader.onload =  function(e){
					callback(e.target.result);
				};
			} else {
				callback(false);
			}
		};
		xhr.send();

	},


	ClearText: (text)=> {
		let RegEx = new RegExp(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi);

		return text.replace(RegEx, '');
	},


	ResizeFunctions: ()=> {

		// FP-Bar
		StrategyPoints.HandleWindowResize();
	},


	/**
	 * Create a blob for file download
	 *
	 * @param Blob
	 * @param FileName
	 * @constructor
	 */
	ExportFile: (Blob, FileName) => {
		// Browsercheck
		let isIE = !!document.documentMode;

		if (isIE)
		{
			window.navigator.msSaveBlob(Blob, FileName);
		}
		else {
			let url = window.URL || window.webkitURL,
				link = url.createObjectURL(Blob),
				a = document.createElement('a');

			a.download = FileName;
			a.href = link;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		}
	}
};
