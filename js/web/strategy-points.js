/*
 * **************************************************************************************
 *
 * Dateiname:                 strategy-points.js
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

let BuildingTypes = {
	greatbuilding: 'Legendäre Gebäude',
	production : 'Produktionsgebäude',
	random_production : 'Zufalls - Produktionen',
	residential : 'Eventgebäude',
};

StrategyPoints = {

	entities : [],
	completeBuildings: [],
	points : 0,
	BuildingNames : [],


	/**
	 *  Start der ganzen Prozedur
	 */
	init: ()=> {

		StrategyPoints.completeBuildings = [];
		StrategyPoints.points = 0;

		StrategyPoints.entities = StrategyPoints.GetSavedData();

		StrategyPoints.ReadData();
	},


	/**
	 * ALle Gebäude aus dem Cache holen
	 *
	 * @returns {any}
	 * @constructor
	 */
	GetSavedData: ()=> {
		let data = MainParser.getStorage('PlayerBuildings');

		return JSON.parse(data);
	},


	/**
	 * Alle Gebäude durchsteppen
	 *
	 * @constructor
	 */
	ReadData: ()=>{

		let d = StrategyPoints.entities;

		for(let i in d)
		{
			if (d.hasOwnProperty(i))
			{
				let building = StrategyPoints.ReadBuildings(d[i]);

				if(building !== false){

					// Typ ist noch kein Array?
					if(Array.isArray(StrategyPoints.completeBuildings[building['type']]) === false){
						StrategyPoints.completeBuildings[building['type']] = [];
					}

					let index = StrategyPoints.completeBuildings[building['type']].map((el) => el.entity_id).indexOf(d[i]['cityentity_id']);

					if(index === -1){
						StrategyPoints.completeBuildings[building['type']].push(building);

					} else {
						StrategyPoints.completeBuildings[building['type']][ index ]['points'] += parseInt(building['points']);
						StrategyPoints.completeBuildings[building['type']][ index ]['count']++;
					}


					StrategyPoints.points += parseInt(building['points']);
				}
			}
		}


		// Sortieren
		for(let type in StrategyPoints.completeBuildings)
		{
			if(StrategyPoints.completeBuildings.hasOwnProperty(type))
			{
				StrategyPoints.completeBuildings[type] = helper.arr.multisort(StrategyPoints.completeBuildings[type], ['name'], ['ASC']);
			}
		}


		if(typeof StrategyPoints.completeBuildings === "object"){
			StrategyPoints.showInfoBox();
		}
	},


	/**
	 * Prüfung ob das Gebäude FPs produziert
	 *
	 * @param d
	 * @returns {*}
	 * @constructor
	 */
	ReadBuildings: (d)=> {

		if(	d.state !== undefined &&
			d.state.current_product !== undefined &&
			d.state.current_product.product !== undefined &&
			d.state.current_product.product.resources !== undefined &&
			d.state.current_product.product.resources.strategy_points !== undefined
		){

			return {
				entity_id: d.cityentity_id,
				type : d.type,
				count: 1,
				name: BuildingNamesi18n[d.cityentity_id],
				points: parseInt(d['state']['current_product']['product']['resources']['strategy_points'])
			}
		}

		return false;
	},


	/**
	 * HTML Box erstellen und einblenden
	 */
	showInfoBox: ()=>{

		if( $('#FPBox').length > 0 ){
			return ;
		}

		HTML.Box('FPBox', 'FP - Produktionen');


		let h = [];

		h.push('<table id="ResultBoxTable" class="foe-table">');

		h.push('<thead>');

		h.push('<tr>');
		h.push('<th colspan="3" class="text-center">Gesamt FP aus allen Gebäuden: <strong>' + StrategyPoints.points + '</strong></th>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<th></th>');
		h.push('<th class="text-center"><strong>Anzahl</strong></th>');
		h.push('<th class="text-center"><strong>FP</strong></th>');
		h.push('</tr>');

		h.push('</thead>');
		h.push('<tbody>');

		let cB = StrategyPoints.completeBuildings;

		for (let type in cB)
		{
			if (cB.hasOwnProperty(type))
			{
				h.push('<tr class="building-type">');
				h.push('<td colspan="3"><strong>' + BuildingTypes[ type ] + '</strong></td>');
				h.push('</tr>');

				for(let b in cB[type])
				{
					if(cB[type].hasOwnProperty(b))
					{
						h.push('<tr>');
						h.push('<td>' + cB[type][b]['name'] + '</td>');
						h.push('<td class="text-center">' + cB[type][b]['count'] + '</td>');
						h.push('<td class="text-center">' + cB[type][b]['points'] + '</td>');
						h.push('</tr>');
					}
				}
			}
		}

		h.push('<tbody>');
		h.push('</table>');

		$('#FPBox').find('#FPBoxBody').html(h.join(''));

		$('#FPBoxclose').bind('click', function () {
			$('#FPBox').remove();
		});
	},


	/**
	 * Kleine FP-Bar im Header
	 *
	 * @param fp
	 * @constructor
	 */
	ForgePointBar: (fp)=> {

		// noch nicht im DOM?
		if( $('#fp-bar').length < 1 ){
			let div = $('<div />').attr('id', 'fp-bar').text('FP-Lager: ').append( $('<strong />').addClass('fp-storage') );

			$('body').append(div);
		}

		// Update
		$('.fp-storage').text(fp);
	},
};
