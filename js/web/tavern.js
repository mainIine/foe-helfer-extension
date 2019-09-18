/*
 * **************************************************************************************
 *
 * Dateiname:                 tavern.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       18.09.19, 15:37 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

/**
 * Wird in der Funktion Menu.CheckButtons() geladen
 *
 * @type {
 * 		{
 * 		TavernBoost: Tavern.TavernBoost,
 * 		CheckTavernBoost: Tavern.CheckTavernBoost,
 * 		BuildBox: Tavern.BuildBox,
 * 		BoosterCountDown: Tavern.BoosterCountDown
 * 		}
 * 	}
 */

let Tavern = {

	gl: null,

	/**
	 * Enthält die setInterval-ID
	 */
	cID: null,

	/**
	 * Liest einen Tavernenboost aus und stellt ihn dar
	 *
	 * @param d
	 * @constructor
	 */
	TavernBoost: (d)=>{

		// extra_negotiation_turn => Extra Zug

		if(d['type'] !== 'extra_negotiation_turn'){
			return ;
		}

		localStorage.setItem('TavernBoostType', d['type']);
		localStorage.setItem('TavernBoostExpire', d['expireTime']);

		Tavern.BuildBox();

		setTimeout(()=>{
			Tavern.BoosterCountDown( moment.unix(d['expireTime']));
		}, 200);
	},


	/**
	 * Checkt ob bereits ein Booster läuft
	 *
	 * @constructor
	 */
	CheckTavernBoost: ()=> {
		let e = localStorage.getItem('TavernBoostExpire');

		if(e !== null){
			Tavern.cID = setInterval(Tavern.InjectBadge, 10)
		}
	},


	/**
	 * Rotierende Funktion bis "moment-JS" komplett geladen ist
	 *
	 * @constructor
	 */
	InjectBadge: ()=> {
		if(typeof moment !== "undefined"){

			Tavern.BuildBox();
			Tavern.BoosterCountDown( moment.unix(localStorage.getItem('TavernBoostExpire')) );

			clearInterval(Tavern.cID);
		}
	},


	/**
	 * Setzt das Overlay-Badge zusammen
	 *
	 * @constructor
	 */
	BuildBox: ()=> {

		if( $('#tavern-boost').length === 0 ){
			let tb = $('<div />').attr('id', 'tavern-boost').addClass('cursor-default'),
				cords = localStorage.getItem( 'tavern-boostCords');

			if(cords !== null){
				let c = cords.split('|');
				tb.offset({ top: c[0], left: c[1]});
			}

			let sp = '<span id="tavern-boostHeader" class="game-cursor">' +
				'<span id="Booster-Timer-hours">00h</span> ' +
				'<span id="Booster-Timer-mins">00m</span> ' +
				'<span id="Booster-Timer-secs">00s</span>' +
				'</span>';

			$('body').append(tb.append(sp));
		}
	},


	/**
	 * Zählt die verbleibende Zeit runter
	 *
	 * @param endDate
	 * @constructor
	 */
	BoosterCountDown: (endDate)=> {

		setTimeout(()=>{
			HTML.DragBox(document.getElementById('tavern-boost'));
		}, 200);

		let Timer = setInterval(function(){

			let now = new Date().getTime();
			let t = endDate - now;

			if (t >= 0) {

				let hours = Math.floor((t % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
				let mins = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
				let secs = Math.floor((t % (1000 * 60)) / 1000);

				document.getElementById('Booster-Timer-hours').innerHTML = ("0" + hours).slice(-2) + '<span class="label">h</span>';

				document.getElementById('Booster-Timer-mins').innerHTML = ("0" + mins).slice(-2) + '<span class="label">m</span>';

				document.getElementById('Booster-Timer-secs').innerHTML = ("0" + secs).slice(-2) + '<span class="label">s</span>';

			} else {

				clearInterval(Timer);

				$('#tavern-boost').fadeToggle(function(){
					$(this).remove();
				});

				localStorage.removeItem('TavernBoostExpire');
			}

		}, 1000);
	},
};

Tavern.CheckTavernBoost();