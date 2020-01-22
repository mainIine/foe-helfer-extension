/*
 * **************************************************************************************
 *
 * Dateiname:                 read-buildings.js
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

// https://foede.innogamescdn.com/start/metadata?id=city_entities-xxxxxxx

// nicht plünderbare Gebäude

let BlackListBuildingsArray = [
    
];

let BlackListBuildingsString = [
	'R_MultiAge_SummerBonus19', //Großer Leuchtturm
	'R_MultiAge_Battlegrounds1' //Ehrenstatue
];

// grau darzustellende Produktionen
let UnimportantProds = [
	'supplies', // Vorräte
	'money'     // Münzen
];

/**
 *
 * @type {{data: {}, CityEntities: [], ShowFunction: Reader.ShowFunction, OtherPlayersBuildings: Reader.OtherPlayersBuildings, player_name: string, showResult: Reader.showResult}}
 */
let Reader = {

	data: {},
	player_name: '',
	CityEntities: [],

	/**
	 * Die Gebäude ermitteln
	 *
	 * @param dp
	 */
	OtherPlayersBuildings: (dp) => {

		Reader.data = {
			ready: [],
			work: []
		};

		// Werte des letzten Nachbarn löschen
		CityMap.CityData = null;

		Reader.player_name = dp['other_player']['name'];

		$('#ResultBox').remove();

		let d = dp['city_map']['entities'];

        Reader.CityEntities = d;      

        for (let i in d) {
            if (d.hasOwnProperty(i)) {
                let id = d[i]['cityentity_id'];
                
                if (BlackListBuildingsArray.includes(id) === false && BlackListBuildingsString.indexOf(id.substring(0, id.length-1)) === -1) {
                    if (d[i]['state'] !== undefined && d[i]['state']['current_product'] !== undefined) {
                        if (d[i]['type'] === 'goods') {
                            GoodsParser.readType(d[i]);
                        }
                        else if ((d[i]['type'] === 'residential' || d[i]['type'] === 'production') && d[i]['state']['is_motivated'] === false) {
                            GoodsParser.readType(d[i]);
                        }
                    }
                }
            }
        }

		// was gefunden?
		if (Reader.data.ready.length > 0 || Reader.data.work.length > 0) {
			Reader.showResult();

		} else {
			if ($('#ResultBox').length > 0) {
				$('#ResultBox').remove();
			}
		}
	},


	/**
	 *  HTML Box anzeigen
	 */
	showResult: () => {

		// let d = helper.arr.multisort(Reader.data, ['name'], ['ASC']);
		let rd = helper.arr.multisort(Reader.data.ready, ['name'], ['ASC']);
		rd = helper.arr.multisort(rd, ['isImportant'], ['DESC']);
		
		let wk = helper.arr.multisort(Reader.data.work, ['name'], ['ASC']);
		wk = helper.arr.multisort(wk, ['isImportant'], ['DESC']);

		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if ($('#ResultBox').length === 0) {
			HTML.Box({
				'id': 'ResultBox',
				'title': i18n['Boxes']['Neighbors']['Title'] + '<em>' + Reader.player_name + '</em>',
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('read-buildings');
		}

		let div = $('#ResultBox'),
			h = [];


		if (rd.length > 0) {

			h.push('<table class="foe-table" style="margin-bottom: 15px">');

			h.push('<thead>');

			h.push('<tr>');
			h.push('<th colspan="3"><strong>' + i18n['Boxes']['Neighbors']['ReadyProductions'] + '</strong></th>');
			h.push('</tr>');

			h.push('</thead>');
			h.push('<tbody>');

			for (let i in rd) {
				if (rd.hasOwnProperty(i)) {
					h.push('<tr class="success">');
					h.push('<td>' + rd[i]['name'] + '</td>');
					h.push('<td>' + rd[i]['amount'] + '</td>');
					h.push('<td><span class="show-entity" data-id="' + rd[i]['id'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/open-eye.png"></span></td>');
					h.push('</tr>');
				}
			}

			h.push('</tbody>');
			h.push('</table>');
		}


		if (wk.length > 0) {

			h.push('<table class="foe-table">');

			h.push('<thead>');

			h.push('<tr>');
			h.push('<th colspan="3"><strong>' + i18n['Boxes']['Neighbors']['OngoingProductions'] + '</strong></th>');
			h.push('</tr>');

			h.push('</thead>');
			h.push('<tbody>');

			for (let i in wk) {
				if (wk.hasOwnProperty(i)) {
					h.push('<tr>');
					h.push('<td>' + wk[i]['name'] + '</td>');
					h.push('<td>' + wk[i]['amount'] + '</td>');
					h.push('<td><span class="show-entity" data-id="' + wk[i]['id'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/open-eye.png"></span></td>');
					h.push('</tr>');
				}
			}

			h.push('</tbody>');
			h.push('</table>');
		}

		div.find('#ResultBoxBody').html(h.join(''));
		div.show();

		// Ein Gebäude soll auf der Karte dargestellt werden
		$('body').on('click', '.foe-table .show-entity', function () {
			Reader.ShowFunction($(this).data('id'));
		});
	},


	/**
	 * Zeigt pulsierend ein Gebäude auf der Map
	 *
	 * @param id
	 */
	ShowFunction: (id) => {

		let h = CityMap.hashCode(Reader.player_name);

		// CSS in den DOM prügeln
		HTML.AddCssFile('citymap');

		if ($('#map' + h).length < 1) {
			CityMap.init(Reader.CityEntities, Reader.player_name);
		}

		$('[data-entityid]').removeClass('pulsate');

		setTimeout(() => {
			let target = $('[data-entityid="' + id + '"]');

			$('#map-container').scrollTo(target, 800, {offset: {left: -280, top: -280}, easing: 'swing'});

			target.addClass('pulsate');
		}, 200);
	}
};


/**
 *
 * @type {
 * 		{
 * 		emptyGoods: GoodsParser.emptyGoods,
 * 		bazaarBuilding: GoodsParser.bazaarBuilding,
 * 		sumGoods: (function(*): number),
 * 		readType: GoodsParser.readType,
 * 		getProducts: (function(*): {amount: (string), state: boolean, isImportant: boolean})
 * 		}
 * 	}
 */
let GoodsParser = {

	/**
	 * Ist es ein Produkt das man "mitzählen" kann?
	 *
	 * @param d
	 */
	readType: (d)=> {

		// Ruhmeshallen ausgrenzen
		/*
		if(d['state']['current_product']['asset_name'] !== undefined && d['state']['current_product']['asset_name'].indexOf('bazaar_') > -1){
			GoodsParser.bazaarBuilding(d);
		}
		*/

		// produziert nix
		//else
			if(d['state']['current_product'] === undefined) {
			GoodsParser.emptyGoods(d);
		}

		// alle anderen
		else {

			let p = GoodsParser.getProducts(d);

			if(p['amount'] !== undefined){
				let entry = {
					name: BuildingNamesi18n[d['cityentity_id']]['name'],
					amount: p['amount'],
					state: p['state'],
					id: d['id'],
					isImportant: p['isImportant']
				};
				
				if (p['isImportant'] === false ) {
					entry.name = '<spark style="color:grey;">' + BuildingNamesi18n[d['cityentity_id']]['name'] + '</spark>';
					entry.amount = '<spark style="color:grey;">' + p['amount'] + '</spark>';
				}

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
	 * @returns {{amount: number, name: (*|string), state: boolean, isImportant: boolean}}
	 */
	getProducts: (d) => {

		let amount,
			state = d['state']['__class__'] === 'ProductionFinishedState',
			isImportant = false
		let g = [];

		let a;
		if (d['state']['current_product']['product'] !== undefined && d['state']['current_product']['product']['resources'] !== undefined) {
			a = d['state']['current_product']['product']['resources'];

			for (let k in a) {
				if (a.hasOwnProperty(k)) {
					if (!isImportant)
						isImportant = !UnimportantProds.includes(k);

					if (k === 'strategy_points') {
						g.push('<strong>' + a[k] + ' ' + GoodsData[k]['name'] + '</strong>');

					} else {
						if (isImportant)
							g.push(a[k] + ' ' + GoodsData[k]['name'] + ' (' + ResourceStock[k] + ')');
						else
							g.push(a[k] + ' ' + GoodsData[k]['name']);
					}
				}
			}
		}

		if (d['state']['current_product']['clan_power'] !== undefined) {
			isImportant = true;
			g.push(d['state']['current_product']['clan_power'] + ' ' + d['state']['current_product']['name']);
		}

		amount = g.join('<br>');
		
		return {
			amount: amount,
			state: state,
			isImportant: isImportant
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
			name: BuildingNamesi18n[d['cityentity_id']]['name'],
			fp: '-',
			product: 'unbenutzt',
			// cords: {x: d[i]['x'], y: d[i]['y']}
		};

		Reader.data.work.push(data);
	}

};