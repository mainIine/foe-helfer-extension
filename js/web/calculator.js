/*
 * **************************************************************************************
 *
 * Dateiname:                 calculator.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              04.02.19 15:31 Uhr
 * zu letzt bearbeitet:       04.02.19 15:30 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

Calculator = {

	ArcBonus: 90,
	EntityOverview: [],


	/**
	 * Kostenrechner anzeigen
	 *
	 * @param d
	 * @param e
	 * @constructor
	 */
	Show: function(d, e){

		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if( $('#costCalculator').length === 0 ){

			// moment.js global setzen
			moment.locale('de');

			let ab = localStorage.getItem('CalculatorArcBonus');

			// alten Wert übernehmen, wenn vorhanden
			if(cost_calc > 0 && ab === null){
				Calculator.ArcBonus = cost_calc;
				localStorage.setItem('CalculatorArcBonus', Calculator.ArcBonus);

			} else if(ab !== null){
				Calculator.ArcBonus = parseFloat(ab);
			}

			HTML.Box('costCalculator', 'Kostenrechner');
		}

		// Übersicht laden + passendes LG
		Calculator.EntityOverview = JSON.parse( localStorage.getItem('OtherActiveBuildingOverview') );


		let div = $('#costCalculator'),
			afp = d['availablePackagesForgePointSum'],
			h = [],
			lsp;


		let BuildingInfo = Calculator.EntityOverview.find(obj => {
			return obj.city_entity_id === e['cityentity_id'];
		});


		h.push('<div class="text-center dark-bg" style="padding:5px 0 3px;">');

		// LG - Daten + Spielername
		h.push('<p><strong>' + BuildingInfo['name']  + ' - ' + BuildingInfo['player']['name'] + ' </strong><br>Stufe '+ e['level'] +' &rarr; '+ (parseInt(e['level']) +1) +'</p>');


		// FP im Lager
		h.push('<p>Verfügbare Forgepunke: <strong class="fp-storage">' + (afp || 0)  + '</strong></p>');

		if($('.fp-storage').length > 0){
			$('.fp-storage').text(afp);
		}

		h.push('<p class="costFactorWrapper">Arche Bonus - <input type="number" id="costFactor" step="0.1" min="12" max="120" value="'+ Calculator.ArcBonus +'">%</p>');

		h.push('</div>');


		h.push('<table id="costTable" class="foe-table">');

		h.push('<thead><th>#</th><th>Ertrag</th><th>BP</th><th>Meds</th><th>Einsatz</th><th>Gewinn</th></thead>');

		let r = d['rankings'],
			places = [],
			arc = ((parseFloat( Calculator.ArcBonus ) + 100) / 100 );

		for(let i in r)
		{

			if (r.hasOwnProperty(i)) {

				// ist es nicht der Besitzer?
				if(r[i]['reward'] !== undefined && r[i]['rank'] !== undefined){

					// gibt es für diesen Platz FPs zurück?
					if(r[i]['reward']['strategy_point_amount'] === undefined){

						let arr = {
							p: r[i]['rank'],
							fp: 0,
							blp: 0,
							med: 0,
							gespFP: 0,
							invFP: 0,
							frFP: 0,
							einsatz: 0
						};

						// Platz + Grund-FP "merken"
						places.push(arr);

						h.push('<tr>' +
							'<td><strong>' + r[i]['rank'] + '</strong></td>' +
							'<td colspan="5" class="text-center"><small><em>keine FPs</em></small></td>' +
							'</tr>');

					} else {

						let gespFP = ((isNaN(parseInt(r[i]['forge_points']))) ? 0 : parseInt(r[i]['forge_points'])),
							invFP = ((isNaN(parseInt(e['state']['invested_forge_points']))) ? 0 : parseInt(e['state']['invested_forge_points'])),
							frFP  = parseInt(e['state']['forge_points_for_level_up']) - invFP,
							einsatz = Math.round(( frFP + gespFP ) / 2);

						let spa = parseInt(r[i]['reward']['strategy_point_amount']),
							blp = r[i]['reward']['blueprints'] !== undefined ? Math.round(parseInt(r[i]['reward']['blueprints']) * arc) : 0,
							med = r[i]['reward']['resources']['medals'] !== undefined ? Math.round(parseInt(r[i]['reward']['resources']['medals']) * arc) : 0,
							sum = Math.round(spa * arc),
							arr = {
								p: r[i]['rank'],
								fp: spa,
								blp: blp,
								med: med,
								gespFP: gespFP,
								invFP: invFP,
								frFP: frFP,
								einsatz: einsatz
							};

						// Platz + Grund-FP "merken"
						places.push(arr);

						h.push('<tr><td><strong>' + r[i]['rank'] + '</strong></td>' +
							'<td class="text-center"><strong class="'+ (sum > afp ? 'error' : 'success') +'">' + HTML.Format(sum) + '</strong></td>' +
							'<td class="text-center">' + HTML.Format(blp) + '</td>' +
							'<td class="text-center">' + HTML.Format(med) + '</td>');

						// wenn nix rumkommt, bleibt es leer
						if(gespFP >= einsatz || sum - einsatz < 1){
							h.push('<td class="text-center">-</td><td class="text-center">-</td></tr>');

						} else {
							h.push('<td class="text-center">' + HTML.Format(einsatz) + '</td>');
							let w = (sum - einsatz);
							h.push('<td class="text-center"><strong class="success">' + ( w === 0 ? '+-0' : HTML.Format(w)) + '</strong></td></tr>');
						}
					}
				}
			}
		}

		h.push('</table>');

		lsp = moment.unix(BuildingInfo['last_spent']).fromNow();
		h.push('<p class="text-center" style="margin: 5px 0 0 0;"><small><em>Letzte Einzahlung: ' + lsp  + '</em></small></p>');

		// in die bereits vorhandene Box drücken
		div.find('#costCalculatorBody').html(h.join(''));


		// wenn der Wert des Archebonus verändert wird, Event feuern
		$('body').on('blur', '#costFactor', function(){

			let ab = parseFloat( $('#costFactor').val() );
			Calculator.ArcBonus = ab;

			localStorage.setItem('CalculatorArcBonus', ab);

			let arc = ((ab + 100) / 100 ),
				h = [];

			h.push('<thead>' +
				'<th>#</th>' +
				'<th>Ertrag</th>' +
				'<th>BP</th>' +
				'<th>Meds</th>' +
				'<th>Einsatz</th>' +
				'<th>Gewinn</th>' +
				'</thead>');

			for(let i in places){
				let spa = parseInt(places[i]['fp']),
					sum = Math.round(spa * arc);

				h.push('<tr><td><strong>' + places[i]['p'] + '</strong></td>' +
					'<td class="text-center"><strong class="'+ (sum > afp ? 'error' : 'success') +'">' + HTML.Format(sum) + '</strong></td>' +
					'<td class="text-center">' + HTML.Format(places[i]['blp']) + '</td>' +
					'<td class="text-center">' + HTML.Format(places[i]['med']) + '</td>');


				// wenn nix rumkommt, bleibt es leer
				if(places[i]['gespFP'] >= places[i]['einsatz'] || sum - places[i]['einsatz'] < 1){
					h.push('<td class="center">-</td><td class="text-center">-</td></tr>');

				} else {

					h.push('<td class="text-center">' + HTML.Format(places[i]['einsatz']) + '</td>');

					let w = sum - places[i]['einsatz'];
					h.push('<td class="text-center"><strong class="success">' + ( w === 0 ? '+-0' : HTML.Format(w)) + '</strong></td></tr>');
				}
			}

			$('#costTable').html(h.join(''));
			$('#costCalculator').show();
		});

		// Schliessen Button binden
		$('#costCalculatorclose').bind('click', function() {
			$('#costCalculator').remove();
		});
	}
};
