/*
 * **************************************************************************************
 *
 * Dateiname:                 calculator.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       13.08.19 20:41 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

Calculator = {

	ArcBonus: 90,
	EntityOverview: [],
	CurrentPlayer: 0,
	Timer: null,


	/**
	 * Kostenrechner anzeigen
	 *
	 * @param d
	 * @param e
	 * @constructor
	 */
	Show: function(d, e){

		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if( $('#costCalculator').length === 0 )
		{
			// moment.js global setzen
			moment.locale(MainParser.getLanguage());

			let ab = localStorage.getItem('CalculatorArcBonus');

			// alten Wert übernehmen, wenn vorhanden
			if(ab !== null){
				Calculator.ArcBonus = parseFloat(ab);
			}


			HTML.Box('costCalculator', i18n['Boxes']['Calculator']['Title'], i18n['Boxes']['Calculator']['HelpLink'], false);

			Calculator.CurrentPlayer = parseInt(localStorage.getItem('current_player_id'));
		}

		clearInterval(Calculator.Timer);

		// Übersicht laden + passendes LG
		Calculator.EntityOverview = JSON.parse(localStorage.getItem('OtherActiveBuildingOverview'));

		let div = $('#costCalculator'),
			afp = d['availablePackagesForgePointSum'],
			h = [],
			lsp;


		let BuildingInfo = Calculator.EntityOverview.find(obj => {
			return obj['city_entity_id'] === e['cityentity_id'];
		});


		h.push('<div class="text-center dark-bg" style="padding:5px 0 3px;">');

		// LG - Daten + Spielername
		h.push('<p><strong>' + BuildingInfo['name']  + ' - ' + BuildingInfo['player']['name'] + ' </strong><br>' + i18n['Boxes']['Calculator']['Step'] + '' + e['level'] + ' &rarr; ' + (parseInt(e['level']) +1) +'</p>');


		// FP im Lager
		h.push('<p>'+ i18n['Boxes']['Calculator']['AvailableFP'] +': <strong class="fp-storage">' + (afp || 0)  + '</strong></p>');

		if($('.fp-storage').length > 0){
			$('.fp-storage').text(afp);
		}


		h.push('<p class="costFactorWrapper">'+ i18n['Boxes']['Calculator']['ArcBonus'] +' - <input type="number" id="costFactor" step="'+ (Calculator.ArcBonus > 80 ? '0.1' : '0.5') +'" min="12" max="200" value="'+ Calculator.ArcBonus +'">%</p>');

		h.push('</div>');


		h.push('<table id="costTable" class="foe-table">');

		h.push('<thead>' +
			'<th>#</th>' +
			'<th>'+ i18n['Boxes']['Calculator']['Earnings'] +'</th>' +
			'<th>BP</th>' +
			'<th>Meds</th>' +
			// '<th>'+ i18n['Boxes']['Calculator']['Save'] +'</th>' +
			'<th>'+ i18n['Boxes']['Calculator']['Commitment'] +'</th>' +
			'<th>'+ i18n['Boxes']['Calculator']['Profit'] +'</th>' +
			'</thead>');

		let r = d['rankings'],
			places = [],
			arc = ((parseFloat( Calculator.ArcBonus ) + 100) / 100 );


		for(let i in r)
		{
			if (r.hasOwnProperty(i))
			{

				// hier sitzt der LG Besitzer drin oder der User wurde gelöscht
				if(r[i]['rank'] === undefined || r[i]['rank'] === -1)
				{
					continue;
				}
				

				let isSelf = (r[i]['player']['player_id'] !== undefined && r[i]['player']['player_id'] === Calculator.CurrentPlayer);

				// gibt es für diesen Platz FPs zurück?
				if(r[i]['reward'] === undefined)
				{

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
						'<td colspan="5" class="text-center"><small><em>' + i18n['Boxes']['Calculator']['NoFPorMedsAvailable'] + '</em></small></td>' +
						'</tr>');


				} else if(r[i]['reward'] !== undefined && r[i]['reward']['strategy_point_amount'] === undefined)
				{
					let blp = r[i]['reward']['blueprints'] !== undefined ? Math.round(parseInt(r[i]['reward']['blueprints']) * arc) : 0,
						med = r[i]['reward']['resources']['medals'] !== undefined ? Math.round(parseInt(r[i]['reward']['resources']['medals']) * arc) : 0,
						arr = {
							p: r[i]['rank'],
							fp: 0,
							blp: blp,
							med: med,
							gespFP: 0,
							invFP: 0,
							frFP: 0,
							einsatz: 0
						};

					// Platz + Grund-FP "merken"
					places.push(arr);

					h.push('<tr><td><strong>' + r[i]['rank'] + '</strong></td>' +
						'<td class="text-center">' +
							'<strong class="'+ (isSelf ? 'info' : 'success') +'">0</strong>' +
						'</td>' +
						'<td class="text-center">' + HTML.Format(blp) + '</td>' +
						'<td class="text-center">' + HTML.Format(med) + '</td>');

					// h.push('<td class="text-center"></td>');

					if(isSelf && r[i]['forge_points'] > 0)
					{
						h.push('<td class="text-center">' + r[i]['forge_points'] + '</td>' +
							'<td class="text-center"><strong class="info">0</strong></td>');

					} else
					{
						h.push('<td class="text-center">-</td><td class="text-center">-</td>');
					}

					h.push('</tr>');


				} else
				{

					let gespFP = (isNaN(parseInt(r[i]['forge_points']))) ? 0 : parseInt(r[i]['forge_points']),
						invFP = (isNaN(parseInt(e['state']['invested_forge_points']))) ? 0 : parseInt(e['state']['invested_forge_points']),
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


					h.push('<tr' + (isSelf ? ' class="info-row"' : '') + '><td><strong>' + r[i]['rank'] + '</strong></td>' +
						'<td class="text-center">' +
							'<strong class="'+ (sum > afp ? 'error' : 'success') +'">' +
								HTML.Format(sum) +
							'</strong>' +
						'</td>' +
						'<td class="text-center">' + HTML.Format(blp) + '</td>' +
						'<td class="text-center">' + HTML.Format(med) + '</td>');

					/*
					if(isSelf){

						console.log('gespFP: ', gespFP);
						console.log('einsatz: ', einsatz);
						console.log('sum - einsatz: ', sum - einsatz);
						console.log('gespFP - einsatz: ', gespFP - einsatz);
						console.log('frFP + gespFP: ', Math.round(( frFP - gespFP ) / 2));
						console.log('-----------------------------------------');

						// eingezahlt ist weniger als "save"
						if(gespFP < einsatz)
						{
							h.push('<td class="text-center"><strong class="error">' + HTML.Format( gespFP) + '</strong></td>');

						} else if(gespFP === einsatz){
							h.push('<td class="text-center"><strong class="success">&#10004;</strong></td>');

						} else if(gespFP > einsatz){
							h.push('<td class="text-center"><strong class="error">&#10060;</strong></td>');
						}

					} else {
						h.push('<td class="text-center"></td>');
					}
					*/

					
					if(isSelf)
					{
						if(gespFP === sum)
						{
							h.push('<td class="text-center">' + HTML.Format(gespFP) + '</td><td class="text-center"><strong>0</strong></td>');

						}
						else if(gespFP > 0) {
							h.push('<td class="text-center">' + HTML.Format(gespFP) + '</td>');
							let w = (sum - gespFP);
							h.push('<td class="text-center"><strong>' + ( w === 0 ? '0' : HTML.Format(w)) + '</strong></td>');

						}
						else {
							h.push('<td class="text-center">-</td>');
							h.push('<td class="text-center">-</td>');
						}

					}
					else {

						if(sum - einsatz === 0){
							h.push('<td class="text-center">' + HTML.Format(einsatz) + '</td><td class="text-center"><strong class="success">0</strong></td>');
						}
						else if(gespFP >= einsatz || sum - einsatz < 1) {
							h.push('<td class="text-center">-</td><td class="text-center">-</td>');

						}
						else if(einsatz > 0) {
							h.push('<td class="text-center">' + HTML.Format(einsatz) + '</td>');

							let w = (sum - einsatz);
							h.push('<td class="text-center"><strong class="success">' + ( w === 0 ? '0' : HTML.Format(w)) + '</strong></td>');

						} else
						{
							h.push('<td class="text-center">-</td>');
							h.push('<td class="text-center">-</td>');
						}
					}

					/*
					if(gespFP >= einsatz || sum - einsatz < 1)
					{
						h.push('<td class="text-center">-</td>' +
							'<td class="text-center">-</td>');

					}
					else if(einsatz > 0) {
						h.push('<td class="text-center">' + HTML.Format(gespFP) + '</td>');

						let w = (sum - einsatz);
						h.push('<td class="text-center"><strong class="success">' + ( w === 0 ? '0' : HTML.Format(w)) + '</strong></td>');

					} else
					{
						h.push('<td class="text-center">-</td>');
						h.push('<td class="text-center">-</td>');
					}
					*/

					h.push('</tr>');
				}

				// nach dem Platz 5 raus...
				if(r[i]['rank'] === 5)
				{
					break;
				}
			}
		}

		h.push('</table>');

		// in die bereits vorhandene Box drücken
		div.find('#costCalculatorBody').html(h.join(''));

		Calculator.CountDown( moment.unix(e['state']['next_state_transition_at']) );

		// wenn der Wert des Archebonus verändert wird, Event feuern
		$('body').on('blur', '#costFactor', function(){

			let ab = parseFloat( $('#costFactor').val() );
			Calculator.ArcBonus = ab;

			localStorage.setItem('CalculatorArcBonus', ab);

			let arc = ((ab + 100) / 100 ),
				h = [];

			h.push('<thead><th>#</th><th>'+ i18n['Boxes']['Calculator']['Earnings'] +'</th><th>BP</th><th>Meds</th><th>'+ i18n['Boxes']['Calculator']['Commitment'] +'</th><th>'+ i18n['Boxes']['Calculator']['Profit'] +'</th></thead>');

			for(let i in places){
				let spa = parseInt(places[i]['fp']),
					sum = Math.round(spa * arc);

				h.push('<tr><td><strong>' + places[i]['p'] + '</strong></td>' +
					'<td class="text-center"><strong class="'+ (sum > afp ? 'error' : 'success') +'">' + HTML.Format(sum) + '</strong></td>' +
					'<td class="text-center">' + HTML.Format(places[i]['blp']) + '</td>' +
					'<td class="text-center">' + HTML.Format(places[i]['med']) + '</td>');


				// wenn nix rumkommt, bleibt es leer
				if(places[i]['gespFP'] >= places[i]['einsatz'] || sum - places[i]['einsatz'] < 1){
					h.push('<td class="text-center">-</td><td class="text-center">-</td></tr>');

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
		$('#costCalculatorclose').bind('click', function(){
			$('#costCalculator').remove();

			clearInterval(Calculator.Timer);
		});
	},


	CountDown: (endDate)=> {
		Calculator.Timer = setInterval(function(){

			let now = new Date().getTime();
			let t = endDate - now;

			if (t >= 0) {

				let hours = Math.floor((t % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
				let mins = Math.floor((t % (1000 * 60 * 60)) / (1000 * 60));
				let secs = Math.floor((t % (1000 * 60)) / 1000);

				document.getElementById('timer-hours').innerHTML = ("0" + hours).slice(-2) + '<span class="label">h</span>';

				document.getElementById('timer-mins').innerHTML = ("0" + mins).slice(-2) + '<span class="label">m</span>';

				document.getElementById('timer-secs').innerHTML = ("0" + secs).slice(-2) + '<span class="label">s</span>';

			} else {
				document.getElementById('timer').innerHTML = 'Erntezeit!';
			}

		}, 1000);
	}
};
