/*
 * **************************************************************************************
 *
 * Dateiname:                 read-buildings.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       26.07.19 17:27 Uhr
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
	'R_MultiAge_ArcheologyBonus19',		// Weltausstellung
];

let Whitelist = [
	'R_MultiAge_SummerBonusSetA17a'
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

		Reader.data = {
			ready : [],
			work: []
		};
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

				if((d[i]['type'] === 'production' || d[i]['type'] === 'goods') && d[i]['state'] !== undefined && d[i]['state']['current_product'] !== undefined){
					// console.log('LG '+ BuildingNamesi18n[d[i]['cityentity_id']]+':' , d[i]);
					GoodsParser.readType(d[i]);

				} else if(d[i]['type'] === 'residential' && d[i]['state'] !== undefined && d[i]['state']['current_product'] !== undefined) {

					// Residental Multiage ausschliessen
					if(id.indexOf('R_MultiAge_') === -1 || Whitelist.includes(id))
					// if(BlackListBuildingsArray.includes(id) === false && BlackListBuildingsString.indexOf(id.substring(0, id.length-1)) === -1)
					{
						GoodsParser.readType(d[i]);
					}

				} else if(d[i]['type'] === 'greatbuilding' && d[i]['state']['current_product'] !== undefined){
					// console.log('LG '+ BuildingNamesi18n[d[i]['cityentity_id']]+':' , d[i]);
				}

			}
		}

		// was gefunden?
		if(Reader.data.ready.length > 0 || Reader.data.work.length > 0){
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

		// let d = helper.arr.multisort(Reader.data, ['name'], ['ASC']);
		let rd = helper.arr.multisort(Reader.data.ready, ['name'], ['ASC']);
		let wk = helper.arr.multisort(Reader.data.work, ['name'], ['ASC']);

		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if( $('#ResultBox').length === 0 ){

			HTML.Box('ResultBox', i18n['Boxes']['Neighbors']['Title'] + Reader.player_name);
		}

		let div = $('#ResultBox'),
			h = [];


		if(rd.length > 0){

			h.push('<table class="foe-table" style="margin-bottom: 15px">');

			h.push('<thead>');

			h.push('<tr>');
			h.push('<th colspan="2"><strong>' + i18n['Boxes']['Neighbors']['ReadyProductions'] + '</strong></th>');
			h.push('</tr>');

			h.push('</thead>');
			h.push('<tbody>');

			for (let i in rd)
			{
				if (rd.hasOwnProperty(i))
				{
					h.push('<tr class="success">');
					h.push('<td>' + rd[i]['name'] + '</td>');
					h.push('<td>' + rd[i]['amount'] + '</td>');
					h.push('</tr>');
				}
			}

			h.push('</tbody>');
			h.push('</table>');
		}


		if(wk.length > 0){

			h.push('<table class="foe-table">');

			h.push('<thead>');

			h.push('<tr>');
			h.push('<th colspan="2"><strong>' + i18n['Boxes']['Neighbors']['OngoingProductions'] + '</strong></th>');
			h.push('</tr>');

			h.push('</thead>');
			h.push('<tbody>');

			for (let i in wk)
			{
				if (wk.hasOwnProperty(i))
				{
					h.push('<tr>');
					h.push('<td>' + wk[i]['name'] + '</td>');
					h.push('<td>' + wk[i]['amount'] + '</td>');
					h.push('</tr>');
				}
			}

			h.push('</tbody>');
			h.push('</table>');
		}

		div.find('#ResultBoxBody').html(h.join(''));
		div.show();
	},
};


/**
 *
 * @type {
 * 		{
 * 		emptyGoods: GoodsParser.emptyGoods,
 * 		bazaarBuilding: GoodsParser.bazaarBuilding,
 * 		sumGoods: (function(*): number),
 * 		readType: GoodsParser.readType,
 * 		getProducts: (function(*): {amount: (string), state: boolean})
 * 		}
 * 	}
 */
GoodsParser = {

	/**
	 * Ist es ein Produkt das man "mitzählen" kann?
	 *
	 * @param d
	 */
	readType: (d)=> {

		// console.log('d[\'state\'][\'current_product\']: ', d['state']['current_product']);

		let name = d['state']['current_product']['asset_name'];

		// Ruhmeshallen ausgrenzen
		if(name.includes('bazaar_')){
			//console.log('d[\'state\'][\'current_product\']: ', d['state']['current_product']);

			GoodsParser.bazaarBuilding(d);
		}

		else if(d['state']['current_product'] === undefined) {
			GoodsParser.emptyGoods(d);

		} else {

			let p = GoodsParser.getProducts(d);

			if(p['amount'] !== undefined){
				let entry = {
					name: BuildingNamesi18n[d['cityentity_id']],
					amount: p['amount'],
					state: p['state']
				};

				if( entry['state'] === true ){
					Reader.data.ready.push(entry);
				} else {
					Reader.data.work.push(entry);
				}

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
						g.push('<strong>' + a[k] + ' ' + n + '</strong>');
					} else {
						g.push(a[k] + ' ' + n);
					}
				}
			}

			amount = g.join('<br>');

		} else if(d['state']['current_product']['product']['resources']['supplies'] !== undefined) {
			amount = d['state']['current_product']['product']['resources']['supplies'] + ' Werkzeuge';

		} else {
			let a = d['state']['current_product']['product']['resources'],
				g = [];

			for(let k in a) {
				if(a.hasOwnProperty(k)) {
					let n = GoodsNames[k];

					if(n === 'Forge-Punkte'){
						g.push('<strong>' + a[k] + ' ' + n + '</strong>');
					} else {
						g.push(a[k] + ' ' + n);
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
	 * Gebäude mit "Gildenmacht"
	 *
	 * @param d
	 */
	bazaarBuilding: (d)=> {

		let entry = {
			name: d['state']['current_product']['name'],
			amount: d['state']['current_product']['clan_power'] + ' ' + d['state']['current_product']['name'],
			state: d['state']['__class__'] === 'ProductionFinishedState'
		};

		if( entry['state'] === true ){
			Reader.data.ready.push(entry);
		} else {
			Reader.data.work.push(entry);
		}
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
		let data = {
			name: BuildingNamesi18n[d['cityentity_id']],
			fp: '-',
			product: 'unbenutzt',
			// cords: {x: d[i]['x'], y: d[i]['y']}
		};

		Reader.data.work.push(data);
	}

};