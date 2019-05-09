/*
 * **************************************************************************************
 *
 * Dateiname:                 read-buildings.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              01.02.19 14:20 Uhr
 * zu letzt bearbeitet:       01.02.19 14:20 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

// https://foede.innogamescdn.com/start/metadata?id=city_entities-xxxxxxx

// nicht plünderbare Gebäude
let BlackListBuildingsArray = [
	'R_MultiAge_EasterBonus5',			// Schrein des Wissens
	'Z_MultiAge_CupBonus1', 			// Ruhmeshalle
	'R_MultiAge_Expedition16b',			// Heilige Himmelswacht
	'R_MultiAge_SpringBonus17gBlue',	// Wasser-Pagode
	'R_MultiAge_SpringBonus17gGreen',	// Erd-Pagode
	'R_MultiAge_SpringBonus17gRed',		// Feuer-Pagode
	'R_MultiAge_SummerBonus18gPirate', 	// Piratenschiff
	'R_MultiAge_SummerBonus18gRoyal', 	// königliches Schiff
	'R_MultiAge_SummerBonus18gTrader', 	// Handelsschiff
	'R_MultiAge_FallBonus18gaqueous', 	// blaue Herbstmühle
	'R_MultiAge_FallBonus18gcolorful', 	// farbenfrohe Herbstmühle
	'R_MultiAge_FallBonus18gsunflower', // Sonnenblumen Herbstmühle
];

let BlackListBuildingsString = [
	'R_MultiAge_SportBonus19',			// Koloss
	'R_MultiAge_SpringBonus17',			// Pagode
	'R_MultiAge_SportBonus17',			// Monument der Helden
	'R_MultiAge_CulturalBuilding1', 	// Yggdrasil
	'R_MultiAge_SummerBonus18',			// Schiffe
	'R_MultiAge_WinterBonus18',			// Winterdom
	'R_MultiAge_SportBonus18',			// Tholos der Idole
	'R_MultiAge_CarnivalBonus18',		// Große Brücke
	'R_MultiAge_FallBonus18',			// Herbstmühle
];

/**
 *
 * @type {
 * {
 * 		loadJSON: Reader.loadJSON,
 * 		data: Array,
 * 		getBuildingName: (function(*): *),
 * 		OtherPlayersBuildings: Reader.OtherPlayersBuildings,
 * 		player_name: string,
 * 		showResult: Reader.showResult
 * 	}
 * 	}
 */
Reader = {

	data: [],
	player_name: '',


	/**
	 * Die Gebäude ermitteln
	 *
	 * @param dp
	 * @constructor
	 */
	OtherPlayersBuildings: (dp)=> {

		Reader.data = [];
		Reader.player_name = dp['other_player']['name'];

		$('#ResultBox').remove();

		let d = dp['city_map']['entities'];

		for (let i in d)
		{
			if (d.hasOwnProperty(i))
			{

				/*
				if(d[i]['type'] !== 'street'){
					console.log('LG '+ BuildingNamesi18n[d[i]['cityentity_id']]+':' , d[i]);
				}
				*/

				let id = d[i]['cityentity_id'];

				if((d[i]['type'] === 'production' || d[i]['type'] === 'goods') && d[i]['state']['current_product'] !== undefined){
					// console.log('LG '+ BuildingNamesi18n[d[i]['cityentity_id']]+':' , d[i]);
					GoodsParser.readType(d[i]);

				} else if(d[i]['type'] === 'residential' && d[i]['state']['current_product'] !== undefined){
					// GoodsParser.residentialBuilding(d[i]);

					// console.log(BuildingNamesi18n[d[i]['cityentity_id']] + ': ', BlackListBuildingsString.indexOf(id));

					if(BlackListBuildingsArray.includes(id) === false && BlackListBuildingsString.indexOf(id.substring(0, id.length-1)) === -1){
						// console.log('LG '+ BuildingNamesi18n[d[i]['cityentity_id']]+':' , d[i]);
						GoodsParser.readType(d[i]);
					}

				} else if(d[i]['type'] === 'greatbuilding' && d[i]['state']['current_product'] !== undefined){
					// console.log('LG '+ BuildingNamesi18n[d[i]['cityentity_id']]+':' , d[i]);
				}

			}
		}

		// was gefunden?
		if(Reader.data.length > 0){
			Reader.showResult();
		} else {
			if($('#ResultBox').length > 0)
			{
				$('#ResultBox').remove();
			}
		}
	},


	/**
	 *  HTML Box anzeigen
	 */
	showResult: ()=> {

		let d = helper.arr.multisort(Reader.data, ['name'], ['ASC']);

		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if( $('#ResultBox').length === 0 ){

			HTML.Box('ResultBox', 'Aktive Produktionen - ' + Reader.player_name);
		}

		let div = $('#ResultBox'),
			h = [];

		h.push('<table id="ResultBoxTable" class="foe-table">');

		h.push('<thead>');

		h.push('<tr>');
		h.push('<th width="1"><strong>Gebäude</strong></th>');
		// h.push('<th><strong>Produkt</strong></th>');
		h.push('<th><strong>Menge</strong></th>');
		h.push('</tr>');

		h.push('</thead>');
		h.push('<tbody>');

		for (let i in d)
		{
			if (d.hasOwnProperty(i))
			{
				h.push('<tr' + (d[i]['state'] === true ? ' class="success"' : '') + '>');
					h.push('<td>' + d[i]['name'] + '</td>');
					// h.push('<td>' + d[i]['product'] + '</td>');
					h.push('<td>' + d[i]['amount'] + '</td>');
				h.push('</tr>');
			}
		}

		h.push('<tbody>');
		h.push('</table>');

		div.find('#ResultBoxBody').html(h.join(''));
		div.show();

		$('body').on('click', '#ResultBoxclose', ()=>{
			$('#ResultBox').hide('fast', ()=>{
				$(this).remove();
			});
		});

	},
};


/**
 * Klasse zum auswerten der Güter die gerade produziert werden
 *
 * @type {{
	 * 	emptyGoods: GoodsParser.emptyGoods,
	 * 	sumGoods: (function(*): number),
	 * 	readType: GoodsParser.readType,
	 * 	getProducts: (function(*): {
	 * 		amount: number,
	 * 		name: (*|string),
	 * 		state: boolean
	 * 	})
 * 	}}
 */
GoodsParser = {

	/**
	 * Ist es ein Produkt das man "mitzählen" kann?
	 *
	 * @param d
	 */
	readType: (d)=> {

		if(d['state']['current_product'] === undefined) {
			GoodsParser.emptyGoods(d);

		} else {

			let p = GoodsParser.getProducts(d);

			if(p['amount'] !== undefined){
				let entry = {
					name: BuildingNamesi18n[d['cityentity_id']],
					// product: p['name'],
					type: p['type'],
					amount: p['amount'],
					state: p['state']
				};

				Reader.data.push(entry);
			}
		}
	},


	/**
	 * ermittelt die Produktart
	 *
	 * @param d
	 * @returns {{amount: number, name: (*|string), state: boolean}}
	 */
	getProducts: (d)=> {

		let amount = '',
			state = d['state']['__class__'] === 'ProductionFinishedState';

		if(d['state']['current_product']['asset_name'] === 'production_icon_money'){

			let g = [],
				a = d['state']['current_product']['product']['resources'];

			for(let k in a) {
				if(a.hasOwnProperty(k)) {
					let n = GoodsNames[k];

					if(n === 'Forge-Punkte'){
						g.push('<strong>'+ a[k] +' '+ n + '</strong>');
					} else {
						g.push(a[k] +' '+ n);
					}
				}
			}

			amount = g.join('<br>');

		} else if(d['state']['current_product']['product']['resources']['supplies'] !== undefined) {
			//name = 'Werkzeug';
			//amount = d['state']['current_product']['product']['resources']['supplies'];

			amount = 'Werkzeuge ' + d['state']['current_product']['product']['resources']['supplies'];

		/*
		} else if(d['state']['current_product']['deposit_id'] !== undefined) {

			let a = d['state']['current_product']['product']['resources'];

			for(let k in a) {
				if(a.hasOwnProperty(k)) {
					amount += parseInt(a[k]);
				}
			}

			name = d['state']['current_product']['name'];

		} else if(d['state']['current_product']['deposit_boost_factor'] !== undefined) {
			amount = GoodsParser.sumGoods(d['state']['current_product']['product']['resources']);
			name = 'Güter';
		*/
		} else {
			let a = d['state']['current_product']['product']['resources'],
				g = [];

			for(let k in a) {
				if(a.hasOwnProperty(k)) {
					let n = GoodsNames[k];

					if(n === 'Forge-Punkte'){
						g.push('<strong>'+ a[k] +' '+ n + '</strong>');
					} else {
						g.push(a[k] +' '+ n);
					}
				}
			}

			amount = g.join('<br>');
		}

		return {
			amount: amount,
			state: state
		};
	},


	/**
	 * Güter oder ggf. FPs zusammenrechnen
	 *
	 * @param d
	 * @returns {number}
	 */
	sumGoods: (d)=> {

		let sum = 0;

		for( let el in d ) {
			if( d.hasOwnProperty(el) ) {
				sum += parseFloat( d[el] );
			}
		}

		return sum;
	},


	/**
	 * Fertiges Array wenn nix drin ist
	 *
	 * @param d
	 */
	emptyGoods: (d)=> {
		let n = bn[d['cityentity_id']] !== undefined ? bn[d['cityentity_id']] : d['cityentity_id'],

			data = {
				name: n,
				fp: '-',
				product: 'unbenutzt',
				// cords: {x: d[i]['x'], y: d[i]['y']}
			};

		Reader.data.push(data);
	}

};