/*
 * **************************************************************************************
 *
 * Dateiname:                 guildfights.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              16.12.19, 18:08 Uhr
 * zuletzt bearbeitet:       16.12.19, 18:07 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let GildFights = {

	PrevAction: null,
	NewAction: null,
	MapData: null,

	InjectionLoaded: false,

	init: ()=> {


		if(GildFights.InjectionLoaded === false){
			WebSocket.prototype._send = WebSocket.prototype.send;

			WebSocket.prototype.send = function (data) {

				this._send(data);

				this.addEventListener('message', function(msg) {
					//if(msg.data !== 'PONG' && $('#BackgroundInfo').length > 0){

					if(msg.data !== 'PONG'){
						let d = JSON.parse(msg.data)[0];

						if(d['requestClass'] === 'GuildBattlegroundService'){
							// GildFights.BoxContent('in', JSON.parse(msg.data));
							console.log('msg', d['responseData'][0]);
						}
					}

				}, false);

				this.send = function (data) {
					this._send(data);
				};
			};

			GildFights.InjectionLoaded = true;
		}
	},


	ShowBox: ()=> {
		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if( $('#LiveGildFighting').length === 0 ){

			HTML.Box({
				'id': 'LiveGildFighting',
				'title': 'Live Mitglieder Gefechte',
				'auto_close': true,
				'dragdrop': true,
				'resize': true
			});
		}
	}
};
