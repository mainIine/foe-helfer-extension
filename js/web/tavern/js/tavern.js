/*
 * **************************************************************************************
 *
 * Dateiname:                 tavern.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 14:31 Uhr
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
 * 		SetExpireTime: Tavern.SetExpireTime,
 * 		BuildBox: Tavern.BuildBox,
 * 		BoosterCountDown: Tavern.BoosterCountDown
 * 		}
 * 	}
 */

let Tavern = {

	ExpireTime: undefined,


	/**
	 * Aktualisiert die ExpireTime und zeigt den Badge an falls aktiviert
	 *
	 * @param d
	 */
	SetExpireTime: (ExpireTime)=>{
		Tavern.ExpireTime = ExpireTime;
		
		if (Settings.GetSetting('ShowTavernBadge')) {
			Tavern.BuildBox();
		}
	},


	/**
	 * Setzt das Overlay-Badge zusammen
	 *
	 */
	BuildBox: ()=> {

		if( $('#tavern-boost').length === 0 ){

			// CSS in den DOM prügeln
			HTML.AddCssFile('tavern');

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

			$('body').append(tb.append(sp)).promise().done(function(){
				Tavern.BoosterCountDown(moment.unix(Tavern.ExpireTime));
			});
		}
	},


	/**
	 * Zählt die verbleibende Zeit runter
	 *
	 * @param endDate
	 */
	BoosterCountDown: (endDate)=> {

		HTML.DragBox(document.getElementById('tavern-boost'));

		let Timer = setInterval(function(){

			let now = MainParser.getCurrentDateTime();
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
			}

		}, 1000);
	},
};