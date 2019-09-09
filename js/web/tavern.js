/*
 * **************************************************************************************
 *
 * Dateiname:                 tavern.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       05.09.19, 13:17 Uhr
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

Tavern = {

	gl: null,

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
			Tavern.BuildBox();
			Tavern.BoosterCountDown( moment.unix(e) );
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

	/*
	createTexture: ()=>{

		$('body').append( $('<canvas />').attr('id', 'canvas').width(500).height(500) );

		setTimeout(()=>{
			let canvas = document.getElementById('canvas');

			Tavern.gl = canvas.getContext('webgl');

			let texture_object = Tavern.gl.createTexture(),
				building = new Image();

			building.onload = function(){
				Tavern.handleLoadedTexture(building, texture_object);
			};

			building.src = 'https://foede.innogamescdn.com/assets/city/buildings/textures/R_SS_MultiAge_HalloweenBonus18_0.atf';

			// return texture_object;
		}, 100);
	},

	handleLoadedTexture:(img, texture)=> {

		Tavern.gl.bindTexture(Tavern.gl.TEXTURE_2D, texture);

		// Set parameters of the texture object. We will set other properties
		// of the texture map as we develop more sophisticated texture maps.
		Tavern.gl.texParameteri(Tavern.gl.TEXTURE_2D, Tavern.gl.TEXTURE_WRAP_S, Tavern.gl.CLAMP_TO_EDGE);
		Tavern.gl.texParameteri(Tavern.gl.TEXTURE_2D, Tavern.gl.TEXTURE_WRAP_T, Tavern.gl.CLAMP_TO_EDGE);
		Tavern.gl.texParameteri(Tavern.gl.TEXTURE_2D, Tavern.gl.TEXTURE_MIN_FILTER, Tavern.gl.NEAREST);
		Tavern.gl.texParameteri(Tavern.gl.TEXTURE_2D, Tavern.gl.TEXTURE_MAG_FILTER, Tavern.gl.NEAREST);

		// Tell gl to flip the orientation of the image on the Y axis. Most
		// images have their origin in the upper-left corner. WebGL expects
		// the origin of an image to be in the lower-left corner.
		Tavern.gl.pixelStorei(Tavern.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);


		// Store in the image in the GPU's texture object
		Tavern.gl.texImage2D(Tavern.gl.TEXTURE_2D, 0, Tavern.gl.ALPHA, 303, 250, 0, Tavern.gl.ALPHA, Tavern.gl.UNSIGNED_BYTE, img);

		//gl.bindTexture(gl.TEXTURE_2D, null);
	},
	*/
};

Tavern.CheckTavernBoost();