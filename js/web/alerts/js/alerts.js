/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

/**
 * Project  foe-chrome
 * Date     2020-03-27
 * License  MIT
 *
 * @author  Tomas Vorobjov <contact@tomasvorobjov.com>
 *
 */

/* core */
/* nice to have // next release */
// TODO change the edit buttons from text to icons (eye, pencil, x --- check FoEs icons, e.g. guild management)
// TODO add a delete confirmation (currently clicking the delete button just deletes the alert)
// TODO show alert in an overlay (button on/off next to the edit)
// TODO automated alerts tab
// TODO - enable auto alert for collection [list suitable buildings from the city]
// TODO - implement a keyboard shortcut (one which inno will hopefully never use in-game) to pre-fill the New Alert
//          time based on the most recent time display, e.g. antiques dealer, or when a gbg sector opens, or a
//          building collection timer expires, etc.
// TODO - Alerts set up for collection (on GB or other buildings) should reset on collection (i.e. alert categories)

// @ts-ignore
Dexie.delete('foe_helper_alerts_database');
// persistent alerts will be stored only once and the expires time will be updated before garbage collection so that
// all expired alerts can be removed without having to use compound indexes or "compound where = collection filtering)
// e.g. where('expires').above(_current_timestamp_) and where('persistent').equals('1') as that is not supported by Dixie.

// xhr listener: store gbg sector unlock times
// xhr listener: antique dealer (get the auction timer)

const BattlegroundSectorNames = {
	volcano_archipelago: {
		0: {title: "A1", name: "Mati Tudokk"},
		1: {title: "B1", name: "Ofrus Remyr"},
		2: {title: "C1", name: "Niali Diath"},
		3: {title: "D1", name: "Brurat Andgiry"},
		4: {title: "A2S", name: "Sladisk Icro"},
		5: {title: "A2T", name: "Tevomospa"},
		6: {title: "B2S", name: "Subeblic"},
		7: {title: "B2T", name: "Taspac"},
		8: {title: "C2S", name: "Shadsterning"},
		9: {title: "C2T", name: "Tayencoria"},
		10: {title: "D2S", name: "Slandmonii"},
		11: {title: "D2T", name: "Tachmazer"},
		12: {title: "A3V", name: "Vobolize"},
		13: {title: "A3X", name: "Xemga"},
		14: {title: "A3Y", name: "Yelili"},
		15: {title: "A3Z", name: "Zamva"},
		16: {title: "B3V", name: "Vishrain"},
		17: {title: "B3X", name: "Xidorpupo"},
		18: {title: "B3Y", name: "Yepadlic"},
		19: {title: "B3Z", name: "Zilsier"},
		20: {title: "C3V", name: "Vilipne"},
		21: {title: "C3X", name: "Xistan"},
		22: {title: "C3Y", name: "Yeraim"},
		23: {title: "C3Z", name: "Zeaslo"},
		24: {title: "D3V", name: "Verdebu"},
		25: {title: "D3X", name: "Xiwait"},
		26: {title: "D3Y", name: "Yerat"},
		27: {title: "D3Z", name: "Zilgypt"},
		28: {title: "A4A", name: "Aithmirash"},
		29: {title: "A4B", name: "Bangma Mynia"},
		30: {title: "A4C", name: "Cuatishca"},
		31: {title: "A4D", name: "Dilandmoor"},
		32: {title: "A4E", name: "Eda Monwe"},
		33: {title: "A4F", name: "Frimoandbada"},
		34: {title: "A4G", name: "Gosolastan"},
		35: {title: "A4H", name: "Hasaint"},
		36: {title: "B4A", name: "Aguime"},
		37: {title: "B4B", name: "Bliclatan"},
		38: {title: "B4C", name: "Capepesk"},
		39: {title: "B4D", name: "Dalomstates"},
		40: {title: "B4E", name: "Engthio"},
		41: {title: "B4F", name: "Fradistaro"},
		42: {title: "B4G", name: "Goima"},
		43: {title: "B4H", name: "Hranreka"},
		44: {title: "C4A", name: "Andgalbou"},
		45: {title: "C4B", name: "Bangne Casau"},
		46: {title: "C4C", name: "Cagalpo"},
		47: {title: "C4D", name: "Denwana"},
		48: {title: "C4E", name: "Eastkiabumi"},
		49: {title: "C4F", name: "Francedian"},
		50: {title: "C4G", name: "Guayla"},
		51: {title: "C4H", name: "Hoguay"},
		52: {title: "D4A", name: "Arasruhana"},
		53: {title: "D4B", name: "Basainti"},
		54: {title: "D4C", name: "Camehermenle"},
		55: {title: "D4D", name: "Dabiala"},
		56: {title: "D4E", name: "Enggreboka"},
		57: {title: "D4F", name: "Finnited"},
		58: {title: "D4G", name: "Guayre Bhugera"},
		59: {title: "D4H", name: "Honbo"}
	},
	waterfall_archipelago: {
		0: {title: "X1", name: "Elleorus"},
		1: {title: "A2", name: "Flunnipia"},
		2: {title: "B2", name: "Achinata"},
		3: {title: "C2", name: "Enudran"},
		4: {title: "D2", name: "Zebbeasos"},
		5: {title: "E2", name: "Appatinaka"},
		6: {title: "F2", name: "Kracciarhia"},
		7: {title: "A3A", name: "Micianary"},
		8: {title: "A3B", name: "Sheaggasia"},
		9: {title: "B3A", name: "Birrathan"},
		10: {title: "B3B", name: "Phiodeanet"},
		11: {title: "C3A", name: "Ioppiorion"},
		12: {title: "C3B", name: "Acyalyn"},
		13: {title: "D3A", name: "Giobbolas"},
		14: {title: "D3B", name: "Briocealyn"},
		15: {title: "E3A", name: "Joviolmond"},
		16: {title: "E3B", name: "Ciobiathis"},
		17: {title: "F3A", name: "Preammirune"},
		18: {title: "F3B", name: "Exoryme"},
		19: {title: "A4A", name: "Phiossiania"},
		20: {title: "A4B", name: "Klitimelan"},
		21: {title: "A4C", name: "Ioclequey"},
		22: {title: "B4A", name: "Lastaruz"},
		23: {title: "B4B", name: "Ecceacyre"},
		24: {title: "B4C", name: "Yastalyn"},
		25: {title: "C4A", name: "Chobbiabis"},
		26: {title: "C4B", name: "Mioccijan"},
		27: {title: "C4C", name: "Cheabenium"},
		28: {title: "D4A", name: "Diodiriel"},
		29: {title: "D4B", name: "Driqela"},
		30: {title: "D4C", name: "Gakiaran"},
		31: {title: "E4A", name: "Phulotora"},
		32: {title: "E4B", name: "Iccothaer"},
		33: {title: "E4C", name: "Ohephere"},
		34: {title: "F4A", name: "Xioceomos"},
		35: {title: "F4B", name: "Oglilyn"},
		36: {title: "F4C", name: "Omialanto"},
		37: {title: "A5A", name: "Appiatoph"},
		38: {title: "A5B", name: "Cuchrarahe"},
		39: {title: "A5C", name: "Eokkirune"},
		40: {title: "A5D", name: "Iyoriyaz"},
		41: {title: "B5A", name: "Strennearial"},
		42: {title: "B5B", name: "Atherathios"},
		43: {title: "B5C", name: "Xeaxudin"},
		44: {title: "B5D", name: "Stronolyn"},
		45: {title: "C5A", name: "Stuckodod"},
		46: {title: "C5B", name: "Kazazriel"},
		47: {title: "C5C", name: "Pilitallios"},
		48: {title: "C5D", name: "Xishotish"},
		49: {title: "D5A", name: "Gegleadore"},
		50: {title: "D5B", name: "Wrorrulan"},
		51: {title: "D5C", name: "Cleoseotophy"},
		52: {title: "D5D", name: "Equioque"},
		53: {title: "E5A", name: "Eatutiar"},
		54: {title: "E5B", name: "Kaweariael"},
		55: {title: "E5C", name: "Yossiryon"},
		56: {title: "E5D", name: "Ecladorth"},
		57: {title: "F5A", name: "Udriomond"},
		58: {title: "F5B", name: "Kreamenon"},
		59: {title: "F5C", name: "Jokuthriaz"},
		60: {title: "F5D", name: "Gleoleaterra"}
	}
};

let Alerts = function(){
	let tmp = {};

	tmp.debug = true;
	tmp.log = function(/** @type {any} */o){ if (tmp.debug){ console.log(o); } };

	tmp.extAlerts = {

		/**
		 * gets an alert by it's id
		 * @param {number} id the id of the alert to get
		 * @returns {Promise<FoEAlert|undefined>}
		 */
		get: (id) => {
			return MainParser.sendExtMessage({
				type: 'alerts',
				playerId: ExtPlayerID,
				action: 'get',
				id: +id,
			});
		},

		/**
		 * gets all alerts (for this origin)
		 * @returns {Promise<FoEAlert[]>}
		 */
		getAll: () => {
			return MainParser.sendExtMessage({
				type: 'alerts',
				playerId: ExtPlayerID,
				action: 'getAll',
			});
		},

		/**
		 * creates a new alert
		 * @param {FoEAlertData} data the data to associate with the new alert
		 * @returns {Promise<void>}
		 */
		create: (data) => {
			return MainParser.sendExtMessage({
				type: 'alerts',
				playerId: ExtPlayerID,
				action: 'create',
				data: data,
			});
		},

		/**
		 * replaces the data of an alert
		 * @param {number} id the id of the alert to replace the data of
		 * @param {FoEAlertData} data the new data to set
		 * @returns {Promise<number>} the id of the possibly changed alert
		 */
		setData: (id, data) => {
			return MainParser.sendExtMessage({
				type: 'alerts',
				playerId: ExtPlayerID,
				action: 'setData',
				data: data,
				id: +id,
			});
		},

		/**
		 * deletes an alert
		 * @param {number} id the id of the alert to delete
		 * @returns {Promise<boolean>} true if an alert was deleted
		 */
		delete: (id) => {
			return MainParser.sendExtMessage({
				type: 'alerts',
				playerId: ExtPlayerID,
				action: 'delete',
				id: +id,
			});
		},

		/**
		 * triggers a preview of an alert
		 * @param {FoEAlertData} data the alert data to create an alert preview from
		 */
		preview: (data) => {
			return MainParser.sendExtMessage({
				type: 'alerts',
				playerId: ExtPlayerID,
				action: 'preview',
				data: data,
			});
		},
	};


	tmp.data = {
		options: {
			timestamp: {
				// the next() function will return all alerts set to expires between Date.now() and
				// the nextTimeStamp value
				next: null,
				// we'll fetch data from the db only once in this many milliseconds
				increment: 5000
			}
		},
		flatenData: alarm => {
			alarm.data.id = alarm.id;
			return alarm.data;
		},
		active: () => {
			let ts = moment().valueOf();
			return tmp.extAlerts.getAll()
				.then(arr =>
					(arr || [])
						.filter(elem => elem.data.expires > ts)
						.map(tmp.data.flatenData)
				)
				;
		},
		add: (alert) => {

			// reset the next timestamp if the new alert is set to expires before
			// this can happen if, for example, currently there are no new alerts in the db and tmp.data.next()
			// has been just called (so that it will not be called again for the duration
			// of tmp.data.nextTimestampIncrement) and this new alert is set to expire before tmp.data.next()
			// is called the next time. In such case, the alert would never be triggered.
			if ( alert && ( alert.expires < tmp.data.options.timestamp.next ) ) {
				tmp.data.options.timestamp.next = null;
			}

			// be explicit about the fields we want to add
			const cleanData = {
				title: alert.title,
				body: alert.body,
				expires: alert.expires,
				repeat: alert.repeat,
				persistent: alert.persistent,
				tag: '',
				category: 'default',
				vibrate: false,
				actions: null
			};

			return tmp.extAlerts.create(cleanData);
		},
		addBulk: (alerts) => {
			let items = [];
			/** @type {Promise<number>} */
			let lastInsert = Promise.reject();
			for( let i = 0; i < alerts.length; i++ ){
				let alert = alerts[i];
				const cleanData = {
					title: alert.title,
					body: alert.body,
					expires: alert.expires,
					repeat: alert.repeat,
					persistent: alert.persistent,
					tag: '',
					category: 'default',
					vibrate: false,
					actions: null
				};

				lastInsert = tmp.extAlerts.create(cleanData);

				items.push(cleanData);
			}
			return lastInsert;
		},
		delete: (id) => {
			return tmp.extAlerts.delete( parseInt(id) );
		},
		garbage: async () => {
			const timestamp = Date.now()-1000;
			try {
				await tmp.data.refresh();
				// TODO modify this to enable the display of alerts which expired while offline
				// one option ^ is to modify refresh
				const alerts = await tmp.extAlerts.getAll();
				for (let alert of alerts) {
					if (alert.data.expires < timestamp) {
						tmp.extAlerts.delete(alert.id);
					}
				}
			} catch (error) {
				tmp.log('Alerts - Garbage collection failed');
				tmp.log(error);
			}
		},
		get: (id) => {
			id = +id;
			return tmp.extAlerts.get(id).then(tmp.data.flatenData);
		},
		next: () => {

			let now = Date.now()-1000;
			if ( now < tmp.data.options.timestamp.next ){ return null; }

			if ( !tmp.data.options.timestamp.next ) { tmp.data.options.timestamp.next = now };
			let n = tmp.data.options.timestamp.next;
			tmp.data.options.timestamp.next = now + tmp.data.options.timestamp.increment;

			return tmp.extAlerts.getAll()
				.then(arr => (arr || []).filter(
						elem => elem.data.expires >= n
							&& elem.data.expires <= tmp.data.options.timestamp.next
					)
						.map(tmp.data.flatenData)
				)
				;
		},
		refresh: async () => {
			let timestamp = Date.now()-1000;
			const alerts = await tmp.extAlerts.getAll();
			const tasks = [];
			for (let alert of alerts) {
				if (alert.data.repeat <= -1) continue;
				const newExpire = tmp.repeat.nextExpiration( alert.data.expires, alert.data.repeat, timestamp );
				if (alert.data.expires !== newExpire) {
					alert.data.expires = newExpire;
					tasks.push(tmp.extAlerts.setData(alert.id, alert.data));
				}
			}
			return Promise.all(tasks);
		},
		update: async (id, changes) => {
			// @see tmp.data.add
			if ( changes && ( changes.expires < tmp.data.options.timestamp.next ) ) {
				tmp.data.options.timestamp.next = null;
			}
			const data = await tmp.data.get(id);
			return tmp.extAlerts.setData(id, Object.assign(data, changes));
		}
	};

	tmp.model = {
		antique: {
			auction: null,
			cooldown: null,
			exchange: null,
		},
		battlegrounds :{
			participants: null,
			provinces : null,
		},
		neighbors: {}
	},

		tmp.preferences = {
			// [pref] option to create a new alert when plunder (to return in 24 hours) ?
			aux: {
				key: {
					generate: (key) => { return 'foe-helper-alerts-' + key; }
				}
			},

			alertsUpdateTime: 60,

			/** @type {Object.<string,{info: string, title: string, value: number|boolean}>} */
			data: {
				early: {
					info: i18n('Boxes.Alerts.Preferences.Early.Info'),
					title: i18n('Boxes.Alerts.Preferences.Early.Title'),
					value: 30
				},
				auction: {
					info: i18n('Boxes.Alerts.Preferences.Auction.Info'),
					title: i18n('Boxes.Alerts.Preferences.Auction.Title'),
					value: false
				},
				gbg: {
					info: i18n('Boxes.Alerts.Preferences.Battlegrounds.Info'),
					title: i18n('Boxes.Alerts.Preferences.Battlegrounds.Title'),
					value: false
				},
				icon: {
					info: i18n('Boxes.Alerts.Preferences.MenuIcon.Info'),
					title: i18n('Boxes.Alerts.Preferences.MenuIcon.Title'),
					value: false
				},
				ingame: {
					info: i18n('Boxes.Alerts.Preferences.InGame.Info'),
					title: i18n('Boxes.Alerts.Preferences.InGame.Title'),
					value: false
				},
				start: {
					info: i18n('Boxes.Alerts.Preferences.Start.Info'),
					title: i18n('Boxes.Alerts.Preferences.Start.Title'),
					value: false
				},
				suggestions: {
					info: i18n('Boxes.Alerts.Preferences.Suggestions.Info'),
					title: i18n('Boxes.Alerts.Preferences.Suggestions.Title'),
					value: false
				},
			},

			init: () => {
				let keys = Object.keys( tmp.preferences.data );
				for (const key of keys){
					tmp.preferences.data[key].value = tmp.preferences.get(key);
				}
			},

			entry: ( key ) => {
				if ( tmp.preferences.data[key] ) {
					tmp.preferences.data[key];
				}
				return null;
			},

			get: ( key ) => {
				if ( tmp.preferences.data[key] ) {
					let id = tmp.preferences.aux.key.generate( key );
					let value = localStorage.getItem( id );

					if ( value ) {
						return JSON.parse( value );
					}
					return tmp.preferences.data[key].value;
				}
				return null;
			},

			set: ( key, value ) => {
				if ( tmp.preferences.data[key] ){
					tmp.preferences.data[key].value = value;

					let id = tmp.preferences.aux.key.generate( key );
					localStorage.setItem( id, value )
				}
			},
		},

		tmp.repeat = {
			nextExpiration: ( expires, repeat, timestamp ) => {
				repeat = parseInt( repeat ) * 1000;
				if ( repeat > -1 ){
					while( expires < timestamp ){
						expires += repeat;
					}
				}
				return expires;
			},

			refresh: () => {
				tmp.data.refresh();
			},

			update: ( alert, timestamp ) => {

				// if the alert has a repeat value set, update the alert's expire as old expiration + the repeat value
				let repeat = parseInt( alert.repeat );
				if ( repeat > -1 ) {
					let changes = {
						expires: tmp.repeat.nextExpiration( alert.expires, repeat, timestamp )
					};
					tmp.data.update( alert.id, changes ).then( function ( updated ){
						tmp.web.body.tabs.updateAlerts();
					});
				}
				else {
					tmp.web.body.tabs.updateAlerts();
				}
			}
		},

		// this object is the Observer for (is subscribed to) the TimeManager
		tmp.timer = {
			nextAlerts: {},

			isUpdating: false,

			addNext: (alert) => {
				tmp.timer.nextAlerts[ alert.id ] = alert;
			},

			process: ( timestamp ) => {

				for ( var id in tmp.timer.nextAlerts ){
					let alert = tmp.timer.nextAlerts[id];
					let next = alert.expires;
					if ( timestamp > next ){
						// show the notification
						if ( ! alert ){
							tmp.log('tmp.timer.process invalid data');
							return;
						}

						tmp.repeat.update(alert, timestamp);
						delete tmp.timer.nextAlerts[id];


					}
				}
			},

			/**
			 * @param {number} timestamp
			 */
			update: (timestamp) => {

				// do the visual updates only iff the box is visible
				if ( $( '#Alerts' ).length > 0 ) {

					// if the alerts table is visible update it every 60 seconds
					if ( $('#alerts-tab-list').is(':visible') ){
						let s = timestamp / 1000 >> 0;
						if ( s % tmp.preferences.alertsUpdateTime == 0 ){
							tmp.web.body.tabs.updateAlerts();
						}
					}
				}

				// make sure that we don't run more than one update on the db
				// this could happen if the db transaction is taking too long and the tmp.timer.update is executed before
				// the last update finished
				if ( !tmp.timer.isUpdating ) {

					tmp.timer.isUpdating = true;

					let promise = tmp.data.next();
					if ( promise == null ) {
						tmp.timer.process( timestamp );
						tmp.timer.isUpdating = false;
						return;
					}

					promise.then( function ( alerts ) {
						for(let alert of alerts) tmp.timer.addNext( alert );
						tmp.timer.process( timestamp );
						tmp.timer.isUpdating = false;
					} );
				}
				else {
					//tmp.timer.process( timestamp );
				}
			}

		},

		tmp.web = {
			body: {
				build: () => {

					let labels = {
						alerts: '<span>'+i18n('Boxes.Alerts.Tabs.Alerts')+'</span>',
						preferences: '<span>'+i18n('Boxes.Alerts.Tabs.Preferences')+'</span>',
					}

					tmp.web.body.tabs.clean();
					$( '#AlertsBody' ).empty();

					tmp.web.body.tabs.addHead( 'alerts-tab-list', labels.alerts );
					tmp.web.body.tabs.addHead( 'alerts-tab-preferences', labels.preferences );

					tmp.web.body.tabs.addContent( 'alerts-tab-list', tmp.web.body.tabs.tabListContent() );
					tmp.web.body.tabs.addContent( 'alerts-tab-preferences', tmp.web.body.tabs.tabPreferencesContent() );

					// compile it all into html and inject
					let html = [];

					html.push( '<div class="alerts-tabs tabs">' );
					html.push( tmp.web.body.tabs.renderHead() );
					html.push( tmp.web.body.tabs.renderContent() );
					html.push( '</div>' );


					$( '#AlertsBody' ).html( html.join( '' ) ).promise().done( function () {
						$( '.alerts-tabs' ).tabslet( {active: 1} );

						tmp.web.body.tabs.updateAlerts();

						$('#AlertsBody').find('span.button-alert-popup-new').on('click', function(){
							tmp.web.popup.type.create.show();
						});

						$('#AlertsBody').find('span.button-alert-create-all-sectors').on('click', function(){
							let reset = confirm(i18n('Boxes.Alerts.Form.ConfirmSectorAlerts'))
							if (reset) 
								tmp.web.forms.actions.createSectors().then(function(){});
						});

						$('#alerts-preferences').find('input').on('change', function(){
							let key = $(this).data('key');
							let value = $(this).val();
							// booleans
							if ( value === 'active' ){ value = true; }
							if ( value === 'inactive' ){ value = false; }
							// numbers and others
							tmp.preferences.set(key, value);
						});

						// $('#AlertsBody').find('span.check input').on('click', function(){
						//     let el = $(this);
						//     let input = el.find('input');
						//     let id = input.prop
						//     let checked = $(this).data('action');
						// });

					});

					tmp.web.body.overlay.permissions.render();
				},
				overlay: {
					permissions: {
						render: () => {

							// remove an overlays currently present (if any)
							$('#AlertsBody .no-permission').remove();
						},
					},
				},
				tabs: {

					/** @type {string[]} */
					head: [],
					/** @type {string[]} */
					content: [],

					/**
					 * @param {string} id
					 * @param {string} label
					 */
					addHead: ( id, label ) => {
						tmp.web.body.tabs.head.push(
							`<li class="${id} long-tab game-cursor"><a href="#${id}" class="game-cursor">${label}</a></li>`
						);
					},

					/**
					 * @param {string} id
					 * @param {string} content
					 */
					addContent: ( id, content ) => {
						tmp.web.body.tabs.content.push( `<div id="${id}">${content}</div>` );
					},

					clean: () => {
						tmp.web.body.tabs.head = [];
						tmp.web.body.tabs.content = [];
					},
					renderHead: () => {
						return '<ul class="horizontal dark-bg">' + tmp.web.body.tabs.head.join( '' ) + '</ul>';
					},
					renderContent: () => {
						return tmp.web.body.tabs.content.join( '' );
					},
					tabListContent: () => {

						let labels = {
							create: i18n('Boxes.Alerts.Form.CreateAlert'),
							allsectors: i18n('Boxes.Alerts.Form.CreateAllSectors'),
							expiration: i18n('Boxes.Alerts.Form.Expiration'),
							title: i18n('Boxes.Alerts.Form.Title'),
							repeat: i18n('Boxes.Alerts.Form.Repeat'),
							persistent: i18n('Boxes.Alerts.Form.Persistent'),
						};

						let allSectorsHtml = ``;

						if ( tmp.model.battlegrounds.provinces ){
							allSectorsHtml = `<span class="btn button-alert-create-all-sectors">${labels.allsectors}</span>`;
						}

						// list alerts
						let html = `<div class="scrollable">
					<table id="alerts-table" class="foe-table">
						<thead>
							<tr>
								<th colspan="2">${labels.persistent}</th>
								<th>${labels.expiration}</th>
								<th><span title="${labels.repeat}" class="icon-repeat"></span></th>
								<th>&nbsp;</th>
							 </tr>
						</thead>
						<tbody></tbody>
					</table>
				</div>
				<div class="flex dark-bg p2">
					${allSectorsHtml}
					<span class="btn button-alert-popup-new btn-green">${labels.create}</span>
				</div>`;

						return html;
					},
					tabPreferencesContent: () => {

						let labels = {
							active: i18n('Boxes.Settings.Active'),
							inactive: i18n('Boxes.Settings.Inactive'),
							soon: i18n('Boxes.Alerts.Preferences.ComingSoon')
						};

						let html = '';

						let entries = Object.entries(tmp.preferences.data);
						for( const [key, entry] of entries ){

							html += `<div class="item">
						<div class="title">${entry.title}</div>
						<div class="item-row">
							<div class="description">${entry.info}</div>
							<div class="value">`;

							// for boolean values use on-off
							if ( entry.value === true || entry.value === false ) {

								let checked_active = (entry.value === true) ? 'checked="checked"' : '';
								let checked_inactive = (entry.value === false) ? 'checked="checked"' : '';

								html += `<p class="text-center radio-toolbar">
							<input id="alert-${key}-inactive" type="radio" name="alert-${key}"${checked_inactive} data-key="${key}" value="inactive">
							<label for="alert-${key}-inactive">${labels.inactive}</label>
							<input id="alert-${key}-active" type="radio" name="alert-${key}"${checked_active} data-key="${key}" value="active">
							<label for="alert-${key}-active">${labels.active}</label>
						</p>`;
							}
							// for numeric values
							else if ( Number.isInteger( entry.value ) ){
								html += `<p class="text-center">
							<input class="setting-input text-center" type="number" name="alert-${key}" data-key="${key}" value="${entry.value}">                                        
						</p>`;
							}
							else {
								html += `<p class="text-center">
							<input class="setting-input text-center" type="text" name="alert-${key}" data-key="${key}" value="${entry.value}">                                        
						</p>`;
							}

							html += `</div>
						</div>
					</div>`;
						}

						return `<div class="scrollable">
					<div id="alerts-preferences" class="content">
						<form>
							${html}
						</form>
						<div class="overlay-disable text-center"><p>${labels.soon}</p></div>
					</div>
				</div>`;
					},
					updateAlerts: () => {

						// no need to update the alerts list if the alerts box is not shown
						if ( ! tmp.web.visible() ) { return; }

						let labels = {
							preview: i18n('Boxes.Alerts.Form.Preview'),
							edit: i18n('Boxes.Alerts.Form.Edit'),
							delete: i18n('Boxes.Alerts.Form.Delete'),
							repeats: {
								'-1': '-',
								'60': i18n('Boxes.Alerts.Time.1m'),
								'300': i18n('Boxes.Alerts.Time.5m'),
								'900': i18n('Boxes.Alerts.Time.15m'),
								'3600': i18n('Boxes.Alerts.Time.1h'),
								'14400': i18n('Boxes.Alerts.Time.4h'),
								'18000': i18n('Boxes.Alerts.Time.5h'),
								'28800': i18n('Boxes.Alerts.Time.8h'),
								'36000': i18n('Boxes.Alerts.Time.10h'),
								'86400': i18n('Boxes.Alerts.Time.1d'),
								'604800': i18n('Boxes.Alerts.Time.7d'),
							}
						};

						let html = '';
						let dt = moment();

						const alerts = tmp.data.active();

						alerts.then(function(alerts){
							for (let alert of alerts) {
								let persist = ( alert.persistent ) ? ' checked="checked"' : '';
								html += `<tr id="alert-id-${alert.id}">
							<td><input type="checkbox"${persist}></td>
							<td>${alert.title}</td>
							<td>${moment(alert.expires).from(dt)}</td>
							<td>${labels.repeats[alert.repeat+""]}</td>
							<td class="text-right">
								<div class="btn-group">
								<span class="btn btn-slim alert-button" data-id="${alert.id}" data-action="preview">${labels.preview}</span>
								<span class="btn btn-slim alert-button btn-edit" data-id="${alert.id}" data-action="edit" title="${labels.edit}"></span>
								<span class="btn btn-slim alert-button btn-delete" data-id="${alert.id}" data-action="delete" title="${labels.delete}"></span>
								</div>
							</td>
						</tr>`;
							}
						})
							.then( () => {
								$( '#alerts-table tbody' ).empty().append( html ).promise().done( function () {

									$('#alerts-table').find('span.alert-button').on('click', function(){
										let id = $(this).data('id');
										let action = $(this).data('action');
										let p = tmp.data.get(id);
										p.then( function(result){

											if ( action === 'preview' ){
												tmp.web.forms.actions.preview( result );
												return;
											}
											if ( action === 'edit' ){
												tmp.web.popup.type.edit.show( result );
												return;
											}
											if ( action === 'delete' ){
												tmp.data.delete(id).then(function(){
													tmp.web.body.tabs.updateAlerts();
												}).catch(function(error){
													console.log(error);
												});
											}
										})
									});
								} );
							});
					}
				},
			},

			forms: {
				aux:{
					formatIsoDate: (moment) => {
						return moment.toISOString(true).substring(0,19);
					},
					repeats: (repeat) => {
						let repeats = {
							'-1' : '',
							'300' : '',
							'900' : '',
							'3600' : '',
							'14400' : '',
							'28800' : '',
							'86400' : '',
							'604800' : ''
						};
						repeats[ repeat + '' ] = ' checked="checked"';
						return repeats;
					},
					textareaRoot: null,
					textareaCounter: null,
					textareaUpdateCounter: (textarea, counter) => {

						if ( ! tmp.web.forms.aux.textareaRoot ){
							tmp.web.forms.aux.textareaRoot = $(textarea);
						}
						if ( ! tmp.web.forms.aux.textareaCounter ){
							tmp.web.forms.aux.textareaCounter = $(counter);
						}

						let root = tmp.web.forms.aux.textareaRoot;

						let maxlength = root.prop('maxlength');
						let value = root.val();
						if ( value.length > maxlength ){
							this.val( this.value.substring(0, maxlength) );
						}
						tmp.web.forms.aux.textareaCounter.text(`(${value.length}/${maxlength})`);
					}
				},

				actions: {
					createSectors: () => {

						let items = [];

						if ( tmp.model.battlegrounds.provinces ) {
							tmp.model.battlegrounds.provinces.forEach( function ( province, id ) {
								let expires = ( province['lockedUntil'] - tmp.preferences.data.early.value ) * 1000;
								if ( ! isNaN( expires ) ) {
									let alert = {
										id: null,
										title: `${province.title} (${province.owner})`,
										body: '',
										expires: expires,
										repeat: -1,
										persistent: true
									};
									items.push( alert );
								}
							});
						}
						let promise = tmp.data.addBulk( items );

						promise.then( function( result ){
							tmp.web.body.tabs.updateAlerts();
							$('.alerts-tab-list').trigger('click');
						}).catch( function( error ){
							tmp.log('Alerts.tmp.web.forms.actions.createSectors error');
							tmp.log(error);
						});

						return promise;

					},
					create: () => {

						if ( ! tmp.web.forms.actions.validate() ){
							tmp.log('tmp.web.forms.actions.create failed validation');
							return false;
						}
						let data = tmp.web.forms.data();

						let alert = {
							id: null,
							title: data.title,
							body: data.body,
							expires: moment(data.datetime).valueOf(),
							repeat: data.repeat,
							persistent: data.persistent
						};

						let promise = tmp.data.add( alert );

						// switch the list tab
						promise.then( function( result ){

							tmp.web.body.tabs.updateAlerts();
							$('.alerts-tab-list').trigger('click');

						}).catch( function( error ){
							tmp.log('Alerts.tmp.web.forms.actions.create error');
							tmp.log(error);
						});

						return promise;

					},
					edit: () => {

						if ( ! tmp.web.forms.actions.validate() ){
							tmp.log('tmp.web.forms.actions.edit failed validation');
							return false;
						}

						let data = tmp.web.forms.data();
						let alert = {
							title: data.title,
							body: data.body,
							expires: moment(data.datetime).valueOf(),
							repeat: data.repeat,
							persistent: data.persistent
						};
						let id = data.id;
						let promise = tmp.data.update( id, alert );

						promise.then( function( result ) {

							tmp.web.body.tabs.updateAlerts();
							$('.alerts-tab-list').trigger('click');

						}).catch( function( error ){
							tmp.log('Alerts.tmp.web.forms.actions.edit error');
							tmp.log(error);
						});

						return promise;
					},
					init: () => {
						tmp.web.forms.aux.textareaRoot = null;
						tmp.web.forms.aux.textareaCounter = null;
						// tmp.web.forms.actions.preset.add(0,id); // this re-sets the datetime value (bad for edits) :(
					},
					/**
					 * @param value - the number of seconds (to add)
					 * @param target - the id (including #) of the target DOM element
					 */
					preset: {
						add: (value, target) => {
							let data = tmp.web.forms.data();
							let m = moment( data.datetime ).add( value, 'seconds' );
							// timezone corrected ISO string & remove the milliseconds + tz
							let dt = tmp.web.forms.aux.formatIsoDate( m );
							$( target ).val( dt ).trigger( 'change' );

							// tmp.web.forms.actions.preset.set( m.valueOf() );
						},
						set: (value, target) => {
							let m = moment(value);
							// timezone corrected ISO string & remove the milliseconds + tz
							let dt = tmp.web.forms.aux.formatIsoDate( m );
							$( target ).val( dt ).trigger( 'change' );
						},
						setTitle: (value, target) => {
							$( target ).val( value );
						}
					},
					preview: ( data ) => {
						if ( ! data ){
							tmp.log('tmp.web.forms.actions.preview: invalid data');
							return;
						}
						const cpy = {
							expires: new Date(data.datetime).getTime(),
							category: '',
							tag: '',
							vibrate: false,
							...data,
						}
						tmp.extAlerts.preview(cpy);
					},
					previewNew: () => {
						if ( ! tmp.web.forms.actions.validate() ) {
							tmp.log( 'tmp.web.forms.actions.previewNew failed validation' );
							return false;
						}
						let data = tmp.web.forms.data();
						tmp.web.forms.actions.preview( data );
					},
					update: () => {
						let labels = {
							expires: i18n('Boxes.Alerts.Form.Expires'),
							expired: i18n('Boxes.Alerts.Form.Expired'),
						};

						let data = tmp.web.forms.data();
						let dt = moment(data.datetime);
						let m = moment();
						if ( dt >= m ) {
							$( '#alert-expires' ).text( `${labels.expires} ${dt.from( m )}` );
						}
						else {
							$( '#alert-expires' ).text( `${labels.expired} ${dt.from( m )}` );
						}
					},
					validate: () => {
						let data = tmp.web.forms.data();

						if ( !data ){ return false; }

						let input = $( '#alert-title' );
						let label = input.siblings('label');
						if ( !data.title ){
							input.addClass('error-box');
							label.addClass('error-text');
							return false;
						}
						else {
							input.removeClass('error-box');
							label.removeClass('error-text');
						}

						input = $('#alert-datetime');
						label = input.siblings('label');
						let expires = moment(data.datetime).valueOf();
						if ( expires < Date.now() ){
							input.addClass('error-box');
							label.addClass('error-text');
							return false;
						}
						else {
							input.removeClass('error-box');
							label.removeClass('error-text');
						}

						return true;
					}
				},

				data: () => {
					return {
						id: $( '#alert-id' ).val(),
						title: $( '#alert-title' ).val(),
						body: $( '#alert-body' ).val(),
						datetime: $( '#alert-datetime' ).val(),
						repeat: $( 'input[name=alert-repeat]:checked', '#alert-form' ).val(),
						persistent: $( 'input[name=alert-persistent]:checked', '#alert-form' ).val() === 'on'
					};
				},

				/**
				 * The data object should include the following fields:
				 *      data.alert                  = alert object data
				 *          data.alert.id           = alert id (0 if creating a new alert)
				 *          data.alert.expires      = the expiration unix timestamp (Date.now() for new alert)
				 *          data.alert.title        = alert title
				 *          data.alert.body         = alert body
				 *          data.alert.repeat       = repeat (-1 or the number of seconds after which to repeat)
				 *          data.alert.persistent   = true / false
				 *          data.alert.tag          = alert tag
				 *      data.form                   = form data
				 *          data.form.header        = the form header (new / edit)
				 *      data.buttons                = buttons object data
				 *          data.buttons.left      = an array of buttons to be shown on the left
				 *          data.buttons.right      = an array of buttons to be shown on the right
				 * @param data
				 * @returns {string}
				 */
				render: (data) => {

					let labels = {
						title: i18n('Boxes.Alerts.Form.Title'),
						body: i18n('Boxes.Alerts.Form.Body'),
						datetime: i18n('Boxes.Alerts.Form.Datetime'),
						presets: {
							header: i18n('Boxes.Alerts.Form.Presets'),
							now: i18n('Boxes.Alerts.Form.Preset.Now'),
							antique: i18n('Boxes.Alerts.Form.Antiques.Dealer'),
							auction: i18n('Boxes.Alerts.Form.Antiques.Auction'),
							cooldown: i18n('Boxes.Alerts.Form.Antiques.Cooldown'),
							exchange: i18n('Boxes.Alerts.Form.Antiques.Exchange'),
							battlegrounds: i18n('Boxes.Alerts.Form.Battleground'),
							neighborhood: i18n('Boxes.Alerts.Form.Neighborhood'),
						},
						repeats: {
							repeat: i18n('Boxes.Alerts.Form.Repeat'),
							never: i18n('Boxes.Alerts.Form.Repeat.Never'),
							every: i18n('Boxes.Alerts.Form.Repeat.Every'),
						},
						persist: {
							persistence: i18n('Boxes.Alerts.Form.Persistence'),
							on: i18n('Boxes.Alerts.Form.Persistence.On'),
							off: i18n('Boxes.Alerts.Form.Persistence.Off'),
							description: i18n('Boxes.Alerts.Form.Persistence.Description'),
						},
						buttons: {
							create: i18n('Boxes.Alerts.Form.Create'),
							discard: i18n('Boxes.Alerts.Form.Discard'),
							preview: i18n('Boxes.Alerts.Form.Preview'),
							save: i18n('Boxes.Alerts.Form.Save'),
						},
						times: {
							'1m': i18n('Boxes.Alerts.Time.1m'),
							'5m': i18n('Boxes.Alerts.Time.5m'),
							'15m': i18n('Boxes.Alerts.Time.15m'),
							'1h': i18n('Boxes.Alerts.Time.1h'),
							'4h': i18n('Boxes.Alerts.Time.4h'),
							'5h': i18n('Boxes.Alerts.Time.5h'),
							'8h': i18n('Boxes.Alerts.Time.8h'),
							'10h': i18n('Boxes.Alerts.Time.10h'),
							'1d': i18n('Boxes.Alerts.Time.1d'),
							'7d': i18n('Boxes.Alerts.Time.7d'),
						},
						tags: {
							header: i18n('Boxes.Alerts.Form.Tag'),
							description: i18n('Boxes.Alerts.Form.Tag.Description'),
						}
					};
					let id = (data.alert.id) ? data.alert.id : 0;

					// need to store the data.alert.expires in a variable because javascript passes by reference (not by
					// value) so setting data.alert.expires directly would overwrite the null value in tmp.web.popup.options.create
					let timestamp = data.alert.expires;
					if ( ! timestamp ){ timestamp = Date.now(); }
					else { labels.presets.now = data.alert.title; }

					let m = moment(timestamp);
					let expires = tmp.web.forms.aux.formatIsoDate( m );
					let now = m.valueOf();

					let repeats = tmp.web.forms.aux.repeats(data.alert.repeat);

					let persistent_off = ' checked="checked"';
					let persistent_on = '';
					if ( data.alert.persistent ){
						persistent_on = ' checked="checked"';
						persistent_off = '';
					}

					let antiqueOptions = '';
					if ( tmp.model.antique.auction ){
						antiqueOptions += `<option value="${tmp.model.antique.auction}">${labels.presets.auction}</option>`;
					}
					if ( tmp.model.antique.cooldown ){
						antiqueOptions += `<option value="${tmp.model.antique.cooldown}">${labels.presets.cooldown}</option>`;
					}
					if ( tmp.model.antique.exchange ){
						antiqueOptions += `<option value="${tmp.model.antique.exchange}">${labels.presets.exchange}</option>`;
					}

					let battlegroundOptions = '';
					if ( tmp.model.battlegrounds.provinces ) {
						tmp.model.battlegrounds.provinces.forEach( function ( province, id ) {
							let value = ( province['lockedUntil'] - tmp.preferences.data.early.value ) * 1000;
							// if the sector is currently taken
							if ( ! isNaN( value ) ) {
								let text = `${province.title} (${province.owner})`;
								battlegroundOptions += `<option value="${value}">${text}</option>`;
							}
						});
					}

					let buttonsLeft = '';
					data.buttons.left.forEach( element => {
						buttonsLeft += `<span class="btn button-${element}-alert">${labels.buttons[element]}</span> `;
					} );
					let buttonsRight = '';
					data.buttons.right.forEach( element => {
						buttonsRight += `<span class="btn button-${element}-alert">${labels.buttons[element]}</span> `;
					} );

					return `<form id="alert-form">
				<input type="hidden" id="alert-id" value="${id}"/>
				<div class="full-width">
					<label for="alert-title">${labels.title}</label>
					<input type="text" id="alert-title" name="title" placeholder="${labels.title}" value="${data.alert.title}">
					<textarea id="alert-body" name="body" maxlength="176">${data.alert.body}</textarea>
					<div class="text-right">
						<small id="alert-body-counter"></small>
					</div>
				</div>
				<div class="col">
					<label for="alert-datetime">${labels.datetime}</label>
					<input type="datetime-local" id="alert-datetime" name="alert-datetime" value="${expires}" step="1">
					<span id="alert-expires"></span>
				
					<div class="btn-group" role="group" aria-label="Date Group">						
						<span class="btn datetime-preset" data-time="-60">-${labels.times['1m']}</span>
						<span class="btn datetime-preset" data-time="60">${labels.times['1m']}</span>
						<span class="btn datetime-preset" data-time="300">${labels.times['5m']}</span>
						<span class="btn datetime-preset" data-time="900">${labels.times['15m']}</span>
						<span class="btn datetime-preset" data-time="3600">${labels.times['1h']}</span>
						<span class="btn datetime-preset" data-time="14400">${labels.times['4h']}</span>
						<span class="btn datetime-preset" data-time="18000">${labels.times['5h']}</span>
						<span class="btn datetime-preset" data-time="28800">${labels.times['8h']}</span>
						<span class="btn datetime-preset" data-time="36000">${labels.times['10h']}</span>
						<span class="btn datetime-preset" data-time="86400">${labels.times['1d']}</span>
						<span class="btn datetime-preset" data-time="604800">${labels.times['7d']}</span>
					</div>
				</div>
				<div class="col">
					<label for="alert-auto">${labels.presets.header}</label>
<!--                        <select id="alert-presets-categories">
						<option value="">${labels.presets.antique}</option>
						<option value="">${labels.presets.battlegrounds}</option>
						<option value="">${labels.presets.neighborhood}</option>
					</select>
-->
					<select id="alert-presets">
						<option value="${now}" selected>${labels.presets.now}</option>
						<optgroup label="${labels.presets.antique}">
						${antiqueOptions}
						</optgroup>
						<optgroup label="${labels.presets.battlegrounds}">
						${battlegroundOptions}
						</optgroup>
					</select>
				</div>
				
				<p class="full-width radio-toolbar extra-vs-8">
					${labels.repeats.repeat}
					<input id="alert-repeat-never" type="radio" name="alert-repeat" value="-1"${repeats['-1']}>
					<label for="alert-repeat-never" class="btn">${labels.repeats.never}</label>
					${labels.repeats.every}
					<span class="btn-group" role="group" aria-label="Date Group">	
						<label for="alert-repeat-5m" class="btn">${labels.times['5m']}</label>
						<input id="alert-repeat-5m" type="radio" name="alert-repeat" class="hidden" value="300"${repeats['300']}>
						<input id="alert-repeat-15m" type="radio" name="alert-repeat" class="hidden" value="900"${repeats['900']}>
						<label for="alert-repeat-15m" class="btn">${labels.times['15m']}</label>
						<input id="alert-repeat-1h" type="radio" name="alert-repeat" class="hidden" value="3600"${repeats['3600']}>
						<label for="alert-repeat-1h" class="btn">${labels.times['1h']}</label>
						<input id="alert-repeat-4h" type="radio" name="alert-repeat" class="hidden" value="14400"${repeats['14400']}>
						<label for="alert-repeat-4h" class="btn">${labels.times['4h']}</label>
						<input id="alert-repeat-5h" type="radio" name="alert-repeat" class="hidden" value="18000"${repeats['18000']}>
						<label for="alert-repeat-5h" class="btn">${labels.times['5h']}</label>
						<input id="alert-repeat-8h" type="radio" name="alert-repeat" class="hidden" value="28800"${repeats['28800']}>
						<label for="alert-repeat-8h" class="btn">${labels.times['8h']}</label>
						<input id="alert-repeat-10h" type="radio" name="alert-repeat" class="hidden" value="36000"${repeats['36000']}>
						<label for="alert-repeat-10h" class="btn">${labels.times['10h']}</label>
						<input id="alert-repeat-1d" type="radio" name="alert-repeat" class="hidden" value="86400"${repeats['86400']}>
						<label for="alert-repeat-1d" class="btn">${labels.times['1d']}</label>
						<input id="alert-repeat-7d" type="radio" name="alert-repeat" class="hidden" value="604800"${repeats['604800']}>
						<label for="alert-repeat-7d" class="btn">${labels.times['7d']}</label>
					</span>
				</p>
				
				<p class="full-width radio-toolbar">
					${labels.persist.persistence}
					<span class="btn-group">
						<label for="alert-persistent-off" class="btn">${labels.persist.off}</label>
						<input id="alert-persistent-off" type="radio" name="alert-persistent"${persistent_off} value="off">
						<input id="alert-persistent-on" type="radio" name="alert-persistent"${persistent_on} value="on">
						<label for="alert-persistent-on" class="btn">${labels.persist.on}</label>
					</span>
					<br><small>${labels.persist.description}</small>
				</p>
				
				<!--
				<p class="full-width">
					<label for="tag">${labels.tags.header}</label>
					<input type="text" id="tag" name="tag" value="${data.tag}">
					<small>${labels.tags.description}</small>
				</p>
				-->
				
				<!-- left column -->
				<p>
					${buttonsLeft}
				</p>
				<p class="text-right">
					${buttonsRight}
				 </p>
	
			</form>`;
				}
			},

			popup: {

				options: {
					create: {
						alert: {
							id: 0,
							expires: null,
							title: '',
							body: '',
							repeat: -1,
							persistent: false,
							tag: ''
						},

						form: {
							header: i18n('Boxes.Alerts.Form.CreateAlert')
						},

						buttons: {
							left: [],
							right: ['preview', 'create'],
						}
					},

					edit: {
						alert: null,
						form: {
							header: i18n('Boxes.Alerts.Form.EditAlert')
						},
						buttons: {
							left: ['discard'],
							right: ['preview', 'save'],
						}
					}
				},

				content: {
					form: {
						render: (options) => {
							let form = tmp.web.forms.render(options);
							return `<div class="box-inner">
									${form}
								</div>`;
						}
					},
				},

				type: {
					common: {
						boxId: 'AlertsManage',
						build: ( options ) => {
							let boxId = tmp.web.popup.type.common.boxId;
							let bodyId = '#' + boxId + 'Body';
							$( bodyId ).empty()

							let html = [];

							html.push( '<div class="alert-popup">' );
							html.push( tmp.web.popup.content.form.render(options) );
							html.push( '</div>' );

							$( bodyId ).html( html.join( '' ) ).promise().done( function () {
								tmp.web.popup.type.common.setActions( bodyId );
							});
						},
						setActions: ( parent ) => {

							// disable keydown propagation from the form so that the canvas (the game) is not getting the
							// keyboard shortcuts (otherwise, it's impossible to type into input/textarea without affecting the game)
							$( parent ).find('input').on('keydown', function(e){e.stopPropagation(); });
							$( parent ).find('textarea').on('keydown', function(e){e.stopPropagation(); });

							$( parent ).find('#alert-presets').on('change', function(){
								let value = parseInt( $(this).val() );
								let title = $('#alert-presets option:selected').text();
								tmp.web.forms.actions.preset.set(value, '#alert-datetime');
								tmp.web.forms.actions.preset.setTitle(title, '#alert-title');
							});

							$( parent ).find('#alert-body').on('propertychange input', function(){
								tmp.web.forms.aux.textareaUpdateCounter('#alert-body','#alert-body-counter');
							});

							$( parent ).find('span.button-discard-alert').on('click', function(){
								tmp.web.popup.type.edit.close();
							});

							$( parent ).find('span.button-save-alert').on('click', function(){
								tmp.web.forms.actions.edit().then(function(){
									tmp.web.popup.type.edit.close();
								});
							});

							$( parent ).find('span.button-create-alert').on('click', function(){
								tmp.web.forms.actions.create().then(function(){
									tmp.web.popup.type.create.close();
								});
							});

							$( parent ).find('span.button-preview-alert').on('click', function(){
								tmp.web.forms.actions.previewNew();
							});

							$( parent ).find('span.datetime-preset').on('click', function(){
								let value = $(this).attr('data-time');
								tmp.web.forms.actions.preset.add(value,'#alert-datetime');
							});

							$('#alert-datetime').on('change keyup paste', function(){
								tmp.web.forms.actions.update();
							});

							tmp.web.forms.actions.init();
							tmp.web.forms.aux.textareaUpdateCounter('#alert-body','#alert-body-counter');

						},
						close: () => {
							let boxId = tmp.web.popup.type.common.boxId;
							HTML.CloseOpenBox( boxId );
						},
						show: ( labels, options ) => {
							let boxId = tmp.web.popup.type.common.boxId;

							if ( $( '#' + boxId ).length < 1 ) {
								HTML.Box( {
									id: boxId,
									title: labels.title,
									auto_close: true,
									dragdrop: true,
									minimize: true
								} );
								tmp.web.popup.type.common.build( options );
							}
							else {
								tmp.web.popup.type.common.close();
							}
						}
					},
					create: {

						close: () => {
							tmp.web.popup.type.common.close();
						},
						show: () => {
							let labels = {
								title: i18n('Boxes.Alerts.Form.CreateNewAlert'),
							};
							let options = tmp.web.popup.options.create;
							tmp.web.popup.type.common.show(labels, options);
						},
					},
					edit: {
						close: () => {
							tmp.web.popup.type.common.close();
						},
						show: ( alert ) => {
							let labels = {
								title: i18n('Boxes.Alerts.Form.EditAlert'),
							};
							let options = tmp.web.popup.options.edit;
							options.alert = alert;
							tmp.web.popup.type.common.show(labels, options);
						},
					},
				},

			},

			show: () => {

				if ( tmp.web.visible() ) {
					HTML.CloseOpenBox( 'Alerts' );
				}
				else {
					// override the CSS already in DOM
					HTML.AddCssFile( 'alerts' );

					HTML.Box( {
						id: 'Alerts',
						title: i18n( 'Boxes.Alerts.Title', 'Alerts' ),
                		ask: i18n('Boxes.Alerts.HelpLink'),
						auto_close: true,
						dragdrop: true,
						minimize: true,
						resize: true
					} );
					tmp.web.body.build();
				}
			},

			visible: () => {
				return ( $( '#Alerts' ).length > 0 );
			}
		};

	let pub = {
		debug: () => {
			return {
				model: tmp.model,
			}
		},

		init: () => {
			// the preferences init is assumed to be synchronous (based on localStorage implementation)
			tmp.preferences.init();

			tmp.data.garbage();
			TimeManager.subscribe( tmp.timer );
		},

		show: () => {
			tmp.web.show();
		},

		update: {
			data: {
				battlegrounds: (responseData) => {
					if ( responseData && responseData.map && responseData.map.provinces ) {

						let participants = {};
						if ( responseData.battlegroundParticipants ) {
							responseData.battlegroundParticipants.forEach( function ( participant, id ){
								participants[ participant.participantId ] = participant;
							});
							tmp.model.battlegrounds.participants = participants;
						}

						let provinces = responseData.map.provinces;
						// for some reason the returned json doesn't give province id for the 0th index sector
						if ( ! provinces[0].id ){ provinces[0].id = 0; }
						provinces.forEach( function( province, id ){
							let mapname = responseData.map['id'];
							let sector = BattlegroundSectorNames[mapname][id];
							province.title = sector.title;
							province.name = sector.name;
							if ( participants[province.ownerId] && participants[province.ownerId].clan ) {
								province.owner = participants[province.ownerId].clan.name;
							}
						});
						tmp.model.battlegrounds.provinces = provinces;
					}
					else {
						tmp.log('Alerts.update.data.battlegrounds - invalid data supplied');
					}
				},
				timers: (responseData) => {

					// antiques dealer reset
					tmp.model.antique.auction = null;
					tmp.model.antique.cooldown = null;
					tmp.model.antique.exchange = null;

					if ( responseData && responseData.forEach ){
						responseData.forEach( function( item, index ){

							if ( item && item.type ){
								switch (item.type) {
									case 'antiquesExchange' : {
										tmp.model.antique.exchange = ( item.time - tmp.preferences.data.early.value ) * 1000;
										break;
									}
									case 'antiquesAuction' : {
										tmp.model.antique.auction = ( item.time - tmp.preferences.data.early.value )  * 1000;
										break;
									}
									case 'antiquesAuctionCooldown' : {
										tmp.model.antique.cooldown = ( item.time - tmp.preferences.data.early.value )  * 1000;
										break;
									}
									case 'battlegroundsAttrition' : {
										// the battleground attrition reset timer
										break;
									}
								}
							}
						});
					}
					else {
						tmp.log('Alerts.update.data.timers - invalid data supplied');
					}
				},
			},
		},

		getAll: () => {
			return tmp.extAlerts.getAll();
		}
	};

	return pub;
}();

FoEproxy.addHandler('GuildBattlegroundService', 'getBattleground', (data, postData) => {
	Alerts.update.data.battlegrounds( data['responseData'] );
});

FoEproxy.addHandler('TimerService', 'getTimers', (data, postData) => {
	Alerts.update.data.timers( data['responseData'] );
});


/**
 * Observable pattern using subscribe/unsubscribe (instead of add/remove observer). The notify is private
 * and executes every second after TimeManager.start(). Subscribers should implement 'update(unix timestamp)'
 */
let TimeManager = function(){

	// private
	let tmp = {
		interval: null,
		time: null,
		observers: [],
		/**
		 * Returns true iff the given object is in the list of observers
		 * @param o
		 * @returns {boolean}
		 */
		isSubscribed: (o) => { return ( tmp.observers.filter(observer => observer === o).length === 1 ); },
		notify: (data) => {
			tmp.observers.forEach( observer => {
				if (observer.update){ observer.update(data); }
				else { /* throw and error */ }
			});
		}
	};

	// public
	let pub = {

		/**
		 * Starts the "clock"
		 */
		start: ()=> {
			pub.stop();
			tmp.interval = setInterval( function(){ tmp.notify( Date.now() ); }, 1000 );
		},

		/**
		 * Stops the "clock"
		 */
		stop: ()=> {
			if ( tmp.interval != null ){
				clearInterval( tmp.interval );
				tmp.interval = null;
			}
		},

		/**
		 * Adds the provided object to the observers of this observable object
		 * @param o
		 */
		subscribe: (o)=> {
			if ( !tmp.isSubscribed(o) ){
				tmp.observers.push(o);
			}
		},

		/**
		 * Removes the provided objects from the observers (if it is among them)
		 * @param o
		 */
		unsubscribe: (o)=> {
			tmp.observers = tmp.observers.filter(observer => observer !== o);
		},
	};

	return pub;

}();

// class Timer {
//     constructor(){}
//     update(t){ console.log(t); }
// }
// let timer = new Timer();
// TimeManager.subscribe(timer);
TimeManager.start();