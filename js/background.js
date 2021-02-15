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

// @ts-ignore
let alertsDB = new Dexie("Alerts");
// Define Database Schema
alertsDB.version(1).stores({
	alerts: "++id,[server+playerId],data.expires"
});

// separate code from global scope
{

	/**
	 * removes an prefix from a string if present
	 * @param {string} str the string to remove the prefix from
	 * @param {string} prefix the prefix to remove
	 * @returns the string without the prefix
	*/
	function trimPrefix(str, prefix) {
		if (str.startsWith(prefix)) {
			return str.slice(prefix.length);
		} else {
			return str;
		}
	}


	/**
	 * @typedef FoEAlertData
	 * @type {object}
	 * @property {string} title
	 * @property {string} body
	 * @property {number} expires
	 * @property {number} repeat
	 * @property {any[]|null} actions
	 * @property {string} category
	 * @property {boolean} persistent
	 * @property {string} tag
	 * @property {boolean} vibrate
	 */
	/**
	 * @typedef FoEAlert
	 * @type {object}
	 * @property {number} [id]
	 * @property {string} server
	 * @property {number} playerId
	 * @property {FoEAlertData} data
	 * @property {boolean} triggered
	 * @property {boolean} handled
	 * @property {boolean} hasNotification
	 * @property {boolean} delete
	 */

	const Alerts = (() => {
		"use strict";
		const db = alertsDB;
		const prefix = 'foe-alert:';
		const previevId = 'foe-alert-preview';

		/**
		 * checks and limits the data for an alert
		 * @param {any} data
		 * @returns {FoEAlertData} a valid data object for alerts
		 */
		function getValidateAlertData(data) {
			if (typeof data !== 'object') throw 'Alert: "data" needs to be an object';

			// convert if possible
			if (typeof data.expires === 'string') data.expires = Number.parseInt(data.expires);
			if (data.expires === undefined && typeof data.datetime === 'string') data.expires = new Date(data.datetime).getTime();
			if (typeof data.repeat  === 'string') data.repeat  = Number.parseInt(data.repeat);
			if (data.category === undefined) data.category = '';
			if (data.tag === undefined) data.tag = '';
			if (data.vibrate === undefined) data.vibrate = false;

			// todo: add string-length check
			// check attribute types
			if (typeof data.title !== 'string')       throw 'Alert: "data.title" needs to be a string';
			if (typeof data.body  !== 'string')       throw 'Alert: "data.body" needs to be a string';
			if (!Number.isInteger(data.expires))      throw 'Alert: "data.expires" needs to be a integer';
			if (!Number.isInteger(data.repeat))       throw 'Alert: "data.repeat" needs to be a integer';
			if (data.actions instanceof Array)        throw 'Alert: "data.actions" needs to be an array';
			if (typeof data.category   !== 'string')  throw 'Alert: "data.category" needs to be a string';
			if (typeof data.persistent !== 'boolean') throw 'Alert: "data.persistent" needs to be a boolean';
			if (typeof data.tag        !== 'string')  throw 'Alert: "data.tag" needs to be a string';
			if (typeof data.vibrate    !== 'boolean') throw 'Alert: "data.vibrate" needs to be a boolean';
			
			// copy attributes to prevent additional attributes
			return {
				title:   data.title,
				body:    data.body,
				expires: data.expires,
				repeat:  data.repeat,

				actions:    data.actions,
				category:   data.category,
				persistent: data.persistent,
				tag:        data.tag,
				vibrate:    data.vibrate,
			};
		}

		/**
		 * get alert by id
		 * @param {!number} id the id of the requested alert
		 * @returns {Promise<undefined|FoEAlert>}
		 */
		function getAlert(id) {
			return db.alerts.get(id);
		}
		/**
		 * returns a Promise with all Alerts matching server and playerId if provided
		 * @param {{server: !string, playerId: !number}|null} filter the server and playerId to filter on
		 * @returns {Promise<FoEAlert[]>}
		 */
		function getAllAlerts(filter) {
			if (filter == null) {
				return db.alerts.toArray();
			} else {
				const {server, playerId} = filter;
				return db.alerts.where({
					server: server,
					playerId: playerId
				}).toArray();
			}
		}
		/**
		 * creates a new alert dataset with no db entry and no triggering browser-alert
		 * @param {FoEAlertData} data the associated data
		 * @param {!string} server the associated origin
		 * @param {!number} playerId the associated playerId
		 * @returns {FoEAlert} the resulting alert dataset
		 */
		function createAlertData(data, server, playerId) {
			return {
				server: server,
				playerId: playerId,
				data: data,
				triggered: false,
				handled: false,
				hasNotification: false,
				delete: false,
			};
		}
		/**
		 * creates a new alert
		 * @param {FoEAlertData} data the associated data
		 * @param {!string} server the associated origin
		 * @param {!number} playerId the associated playerId
		 * @returns {Promise<number>} the id number of the new alert
		 */
		function createAlert(data, server, playerId) {
			/** @type {FoEAlert} */
			const alert = createAlertData(data, server, playerId);
			return db.alerts
				.add(alert)
				.then((/** @type {!number} */id) => {
					browser.alarms.create(
						`foe-alert:${id}`,
						{
							when: data.expires
						}
					);
					return id;
				})
			;
		}
		/**
		 * set alarm-data and reset alarm
		 * @param {number} id the id of the alarm to update
		 * @param {FoEAlertData} data the new associated data
		 */
		async function setAlertData(id, data) {
			const tagId = prefix + id;
			await Promise.all([
				db.alerts.update(id, { data: data, triggered: false, handled: false }),
				browser.alarms.clear(tagId),
			]);
			browser.alarms.create(
				`foe-alert:${id}`,
				{
					when: data.expires
				}
			);
			return id;
		}
		/**
		 * delets an alert
		 * @param {!number} id Alert-ID which should be deleted
		 * @returns {Promise<void>} Alarm removed
		 */
		async function deleteAlert(id) {
			const tagId = prefix + id;
			// delete alarm-trigger
			const alarmClearP = browser.alarms.clear(tagId);
			// don't actually delete an alarm with notification since the user can still interact with the notification
			const notifications = await browser.notifications.getAll();
			if (notifications[tagId]) {
				// mark this alarm for deletion so it is deletet from the API point of view
				await db.alerts.update(id, {delete: true});
			} else {
				await db.alerts.delete(id);
			}
			// make sure the alarm got cleared before finishing
			await alarmClearP;
		}
		/**
		 * triggers the notification for the given alert
		 * @param {FoEAlert} alert
		 * @returns {Promise<string>} the id of the new notification
		 */
		function triggerAlert(alert) {
			return browser.notifications.create(
				alert.id != null ? (prefix + alert.id) : previevId,
				{
					type: 'basic',
					title: alert.data.title,
					message: alert.data.body,
					// @ts-ignore
					contextMessage: 'FoE-Helper − '+trimPrefix(alert.server, "https://"),
					iconUrl: '/images/app128.png',
					eventTime: alert.data.expires
				}
			);
		}

		// Alarm triggered => show Notification
		browser.alarms.onAlarm.addListener(async (alarm) => {
			if (!alarm.name.startsWith(prefix)) return;

			const alertId = Number.parseInt(alarm.name.substr(prefix.length));
			if (!Number.isInteger(alertId) || alertId > Number.MAX_SAFE_INTEGER || alertId < 0) return;

			const alertData = await db.transaction('rw', db.alerts, async () => {
				const alertData = await Alerts.get(alertId);
				if (alertData == null) return null;
				alertData.triggered = true;
				await db.alerts.put(alertData);
				return alertData;
			});
			if (alertData == null) return;

			triggerAlert(alertData);
		});


		// Notification clicked => search and open Webseite
		browser.notifications.onClicked.addListener(async (notificationId) => {
			if (!notificationId.startsWith(prefix)) return;

			const alertId = Number.parseInt(notificationId.substr(prefix.length));
			if (!Number.isInteger(alertId) || alertId > Number.MAX_SAFE_INTEGER || alertId < 0) return;

			const alertData = await db.transaction('rw', db.alerts, async () => {
				const alertData = await Alerts.get(alertId);
				if (alertData == null) return null;
				alertData.handled = true;
				await db.alerts.put(alertData);
				return alertData;
			});
			if (alertData == null) return;

			const list = await browser.tabs.query({url: alertData.server+'/*'});

			if (list.length > 0) {
				const tab = list[0];
				browser.tabs.update(tab.id, {active: true});
				browser.windows.update(tab.windowId, {focused: true});
			} else {
				browser.tabs.create({url: alertData.server+'/game/index'});
			}
		});


		browser.notifications.onClosed.addListener(async (notificationId) => {
			if (!notificationId.startsWith(prefix)) return;

			const alertId = Number.parseInt(notificationId.substr(prefix.length));
			const alert = await getAlert(alertId);
			if (alert) {
				if (alert.delete) {
					db.alert.delete(alertId);
				} else {
					db.alert.update(alertId, {handled: true});
				}
			}
		});



		return {
			getValidData: getValidateAlertData,
			/**
			 * get Alert by id
			 * @param {!number} id the id of the requested alert
			 * @returns {Promise<undefined|FoEAlert>}
			 */
			get: async (id) => {
				const alert = await getAlert(id);
				return alert && !alert.delete ? alert : undefined;
			},
			/**
			 * returns a Promise with all Alerts matching server and playerId if provided
			 * @param {{server: !string, playerId: !number}|null} filter the server and playerId to filter on
			 * @returns {Promise<FoEAlert[]>}
			 */
			getAll: async (filter) => {
				const alerts = await getAllAlerts(filter);
				return alerts.filter(a => !a.delete);
			},
			delete: deleteAlert,
			create: createAlert,
			createTemp: createAlertData,
			setData: setAlertData,
			trigger: triggerAlert
		};
	})();




	browser.runtime.onInstalled.addListener(() => {
		"use strict";
		const version = browser.runtime.getManifest().version;
		let lng = browser.i18n.getUILanguage();
		const ask = {
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

		/** @type {string} */
		// @ts-ignore
		const askText = ask[lng];
		// No developer and player ask if the game can be reloaded
		if(!isDevMode() && confirm(unescape(askText)) === true){
			browser.tabs.query({active: true, currentWindow: true}).then((tabs)=> {
				// are we in FoE?
				if(tabs[0].url && tabs[0].url.indexOf('forgeofempires.com/game/index') > -1){

					// Yes? then reload
					browser.tabs.reload(tabs[0].id);
				}
			});

			browser.tabs.create({
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
		return !('update_url' in browser.runtime.getManifest());
	}


	const defaultInnoCDN = 'https://foede.innogamescdn.com/';

	// // automatic update of local data
	// window.addEventListener('storage', evt => {
	// 	if (!evt.isTrusted) return;
	// 	if (evt.key === 'PlayerData') {
	// 		ChatData.player = JSON.parse(evt.newValue);
	// 	}
	// });

	/**
	 * creates the return value for a successfull api-call
	 * @param {any} data the data to send as an response
	 * @returns {{ok: true, data: any}}
	 */
	function APIsuccess(data) {
		return {ok: true, data: data};
	}

	/**
	 * creates the return value for an error
	 * @param {string} message the error message
	 * @returns {{ok: false, error: string}}
	 */
	function APIerror(message) {
		return {ok: false, error: message};
	}

	/**
	 * handles internal and external extension communication
	 * @param {any} request 
	 * @param {browser.runtime.MessageSender} sender 
	 * @returns {Promise<{ok: true, data: any} | {ok: false, error: string}>}
	 */
	async function handleWebpageRequests(request, sender) {
		"use strict";
		if (!sender.origin) sender.origin = sender.url;
		// remove sender.id if it was just a forwarded message, so it can't run into private API's
		if (typeof request === 'object' && request.type === 'packed') {
			delete sender.id;
			request = request.data;
		}
		if (typeof request !== 'object') return APIerror('expecting an object as message');
		if (typeof request.type !== 'string') return APIerror('expecting an "type": string');

		/** @type {string} */
		const type = request.type;

		switch (type) {
		case 'test': { // type
			return APIsuccess({type: 'testresponse', data: request});
		}

		case 'alerts': { // type
			// extended alerts-API for internal use
			if (sender.id === browser.runtime.id) {
				if (typeof request.action !== 'string') return APIerror('expecting an "action": string');
				const action = request.action;

				switch (action) {
				case 'getAll': { // action
					const alerts = await Alerts.getAll(null);
					const strippedAlerts = alerts.map(a => ({
						id: a.id,
						data: a.data,
						triggered: a.triggered,
						handled: a.handled,
						hasNotification: a.hasNotification,
					}));
					return APIsuccess(strippedAlerts);
				}

				case 'getAllRaw': { // action
					const alerts = await Alerts.getAll(null);
					return APIsuccess(alerts);
				}

				case 'setData': { // action
					const id = request.id;
					if (!Number.isInteger(id)) return APIerror('expecting an "id": integer');
					const data = Alerts.getValidData(request.data);
					const retId = await Alerts.setData(id, data);
					return APIsuccess(retId);
				}

				case 'previewId': { // action
					const id = request.id;
					if (!Number.isInteger(id)) return APIerror('expecting an "id": integer');

					const alert = await Alerts.get(id);
					if (alert == null) return APIerror(`alert #${id} not found`);

					// Deaktiviere die standard behandlung durch die entfernung der id
					delete alert.id;
					await Alerts.trigger(alert)
					return APIsuccess(true);
				}

				case 'delete': { // action
					const id = request.id;
					if (!Number.isInteger(id)) return APIerror('expecting an "id": integer');

					await Alerts.delete(id);
					return APIsuccess(true);
				}

				} // end of switch action

			} else { // limited alerts-API for external use
				if (!Number.isInteger(request.playerId)) return APIerror('malformed request: expected "playerId": integer');
				if (typeof request.action !== 'string') return APIerror('malformed request: expected "action": string');

				const playerId = request.playerId;
				const action = request.action;
				// @ts-ignore
				const server = sender.origin;

				switch (action) {
				case 'getAll': { // action
					const alerts = await Alerts.getAll({server, playerId});
					const strippedAlerts = alerts.map(a => (
						{
							id: a.id,
							data: a.data,
							triggered: a.triggered,
							handled: a.handled,
							hasNotification: a.hasNotification,
						}
					));
					return APIsuccess(strippedAlerts);
				}

				case 'get': { // action
					const id = request.id;
					if (!Number.isInteger(id)) return APIerror('malformed request: expected "id": integer');

					const alert = await Alerts.get(id);
					if (alert == null || alert.server !== server || alert.playerId !== playerId) return APIsuccess(undefined);
					const strippedAlert = {
						id: alert.id,
						data: alert.data,
						triggered: alert.triggered,
						handled: alert.handled,
						hasNotification: alert.hasNotification,
					};
					return APIsuccess(strippedAlert);
				}

				case 'create': { // action
					let data = null;
					try {
						data = Alerts.getValidData(request.data);
					} catch (e) {
						return APIerror(e);
					}
					const alertId = await  Alerts.create(data, server, playerId);
					return APIsuccess(alertId);
				}

				case 'setData': { // action
					const id = request.id;
					if (!Number.isInteger(id)) return APIerror('malformed request: expected "id": integer');

					let data = null;
					try {
						data = Alerts.getValidData(request.data);
					} catch (e) {
						return APIerror(e);
					}

					const alert = await Alerts.get(id);
					if (!alert || alert.server !== server || alert.playerId !== playerId) return APIsuccess(false);

					await Alerts.setData(id, data);
					return APIsuccess(true);
				}

				case 'preview': { // action
					let data = null;
					try {
						data = Alerts.getValidData(request.data);
					} catch (e) {
						return APIerror(e);
					}

					const alert = Alerts.createTemp(data, server, playerId);
					const id = await Alerts.trigger(alert);
					setTimeout(() => {
						browser.notifications.clear(id);
					}, 5000);

					return APIsuccess(true);
				}

				case 'delete': { // action
					const id = request.id;
					if (!Number.isInteger(id)) return APIerror('malformed request: expected "id": integer');

					const alert = await Alerts.get(id);
					if (!alert || alert.server !== server || alert.playerId !== playerId) return APIsuccess(false);
					await Alerts.delete(id);
					return APIsuccess(true);
				}

				} // end of switch action

			} // end of limited alerts-API

		} // end of alerts-API

		case 'message': { // type
			let t = request.time;
			const opt = {
				type: "basic",
				title: request.title,
				message: request.msg,
				iconUrl: "images/app48.png"
			};

			// Compose desktop message
			// @ts-ignore
			await browser.notifications.create(null, opt).then(id => {
				// Remove automatically after a defined timeout
				setTimeout(()=> {browser.notifications.clear(id)}, t);
			});
			return APIsuccess(true);
		}

		case 'chat': { // type
			const url = `js/web/ws-chat/html/chat.html?player=${request.player}&world=${request.world}&lang=${request.lang}`;
			const popupUrl = browser.runtime.getURL(url);

			// Check whether a popup with this URL already exists
			const tabs = await browser.tabs.query({url: popupUrl});

			// only open if not already done
			if (tabs.length >= 1) {
				// already exists, bring it to the "front"
				await browser.windows.update(tabs[0].windowId, {
					focused: true
				});
			} else {
				// create a new popup
				await browser.windows.create({
					url: url,
					type: 'popup',
					width: 500,
					height: 520,
					// @ts-ignore
					focused: true,
				});
			}
			return APIsuccess(true);
		}

		case 'storeData': { // type
			await browser.storage.local.set({ [request.key] : request.data });
			return APIsuccess(true);
		}

		case 'send2Api': { // type
			let xhr = new XMLHttpRequest();

			xhr.open('POST', request.url);
			xhr.setRequestHeader('Content-Type', 'application/json');
			xhr.send(request.data);

			return APIsuccess(true);
		}

		case 'setInnoCDN': { // type
			localStorage.setItem('InnoCDN', request.url);
			return APIsuccess(true);
		}

		case 'getInnoCDN': { // type
			let cdnUrl = localStorage.getItem('InnoCDN');
			return APIsuccess([cdnUrl || defaultInnoCDN, cdnUrl != null]);
		}

		case 'setPlayerData': { // type
			const data = request.data;

			const playerdata = JSON.parse(localStorage.getItem('PlayerIdentities') || '{}');
			playerdata[data.world+'-'+data.player_id] = data;
			localStorage.setItem('PlayerIdentities', JSON.stringify(playerdata));

			return APIsuccess(true);
		}

		case 'getPlayerData': { // type
			const playerdata = JSON.parse(localStorage.getItem('PlayerIdentities') || '{}');
			return APIsuccess(playerdata[request.world+'-'+request.player_id]);
		}

		case 'showNotification': { // type
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
				return APIsuccess(false);
			}
			return APIsuccess(true);
		}

		} // end of switch type

		return APIerror(`unknown request type: ${type}`);
	}

	browser.runtime.onMessage.addListener(handleWebpageRequests);
	browser.runtime.onMessageExternal.addListener(handleWebpageRequests);

	// End of the separation from the global scope
}
