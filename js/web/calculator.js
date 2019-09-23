/*
 * **************************************************************************************
 *
 * Dateiname:                 calculator.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       23.09.19, 08:56 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let Calculator = {

	ArcBonus: 90,
	EntityOverview: [],
	CurrentPlayer: 0,


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

			let args = {
				'id': 'costCalculator',
				'title': i18n['Boxes']['Calculator']['Title'],
				'ask': i18n['Boxes']['Calculator']['HelpLink'],
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			};

			HTML.Box(args);

			Calculator.CurrentPlayer = parseInt(localStorage.getItem('current_player_id'));
		}

		let div = $('#costCalculator'),
			afp = d['availablePackagesForgePointSum'],
			h = [],
			Overview = sessionStorage.getItem('OtherActiveBuildingOverview'),
			BuildingName,
			PlayerName = null;

		// wenn das LG über die Übersicht geladen wurde...
		if(Overview !== null)
		{
			// Übersicht laden + passendes LG
			Calculator.EntityOverview = JSON.parse(Overview);

			let BuildingInfo = Calculator.EntityOverview.find(obj => {
				return obj['city_entity_id'] === e['cityentity_id'];
			});

			BuildingName = BuildingInfo['name'];
			PlayerName = BuildingInfo['player']['name'];

			// direkt wieder löschen da beim nächsten sonst der falsche Name stehen könnte
			sessionStorage.removeItem('OtherActiveBuildingOverview');
		}

		// Name weg lassen wenn es auf dem Forum / einer Nachricht geladen wurde
		else {
			BuildingName = BuildingNamesi18n[ e['cityentity_id'] ]['name'];
		}


		h.push('<div class="text-center dark-bg" style="padding:5px 0 3px;">');

		// LG - Daten + Spielername
		h.push('<p class="header"><strong><span>' + BuildingName + '</span>' + (PlayerName !== null ? ' - ' + PlayerName : '') + ' </strong><br>' + i18n['Boxes']['Calculator']['Step'] + '' + e['level'] + ' &rarr; ' + (parseInt(e['level']) +1) +'</p>');


		// FP im Lager
		h.push('<p>'+ i18n['Boxes']['Calculator']['AvailableFP'] +': <strong class="fp-storage"></strong></p>');


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


		// Ränge durchsteppen
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
						EingezahltAufRang: 0,
						GesamtInvesFP: 0,
						RestFreieFPAufRang: 0,
						HalberEinzahlbarerPlatzAufRang: 0
					};

					// Platz + Grund-FP "merken"
					places.push(arr);

					h.push('<tr>' +
						'<td><strong>' + r[i]['rank'] + '</strong></td>' +
						'<td colspan="5" class="text-center"><small><em>' + i18n['Boxes']['Calculator']['NoFPorMedsAvailable'] + '</em></small></td>' +
						'</tr>');
				}

				else if(r[i]['reward'] !== undefined && r[i]['reward']['strategy_point_amount'] === undefined) {
					let blp = r[i]['reward']['blueprints'] !== undefined ? Math.round(parseInt(r[i]['reward']['blueprints']) * arc) : 0,
						med = r[i]['reward']['resources']['medals'] !== undefined ? Math.round(parseInt(r[i]['reward']['resources']['medals']) * arc) : 0,
						arr = {
							p: r[i]['rank'],
							fp: 0,
							blp: blp,
							med: med,
							EingezahltAufRang: 0,
							GesamtInvesFP: 0,
							RestFreieFPAufRang: 0,
							HalberEinzahlbarerPlatzAufRang: 0
						};

					// Platz + Grund-FP "merken"
					places.push(arr);

					h.push('<tr><td><strong>' + r[i]['rank'] + '</strong></td>' +
						'<td class="text-center">' +
							'<strong class="'+ (isSelf ? 'info' : 'success') +'">0</strong>' +
						'</td>' +
						'<td class="text-center">' + HTML.Format(blp) + '</td>' +
						'<td class="text-center">' + HTML.Format(med) + '</td>');


					if(isSelf && r[i]['forge_points'] > 0)
					{
						h.push('<td class="text-center">' + r[i]['forge_points'] + '</td>' +
							'<td class="text-center"><strong class="info">0</strong></td>');

					}

					else {
						h.push('<td class="text-center">-</td><td class="text-center">-</td>');
					}

					h.push('</tr>');
				}

				// Andere Spieler
				// "normal" einzahlen
				else {


					let // Gesamt LG FP
						TotalFP = parseInt(e['state']['forge_points_for_level_up']),

						// eingezahlte FP auf dem Rang
						EingezahltAufRang = (isNaN(parseInt(r[i]['forge_points']))) ? 0 : parseInt(r[i]['forge_points']),
						
						// gesamt investierte FPs
						GesamtInvesFP = (isNaN(parseInt(e['state']['invested_forge_points']))) ? 0 : parseInt(e['state']['invested_forge_points']),
						
						// restliche freie FP = gesamt LG FPs - bereits gesamt investierte
						RestFreieFPAufRang  = TotalFP - GesamtInvesFP,
						
						// 1/2 des möglichen HalberEinzahlbarerPlatzAufRanges = restliche freie FP - eingezahlte FP auf dem Rang
						HalberEinzahlbarerPlatzAufRang = Math.round(( RestFreieFPAufRang + EingezahltAufRang ) / 2);
					

					let // diese FPs gibt es für diesen Rang zurück
						NormalRangZurueck = parseInt(r[i]['reward']['strategy_point_amount']),
						
						// Blaupausen
						blp = r[i]['reward']['blueprints'] !== undefined ? Math.round(parseInt(r[i]['reward']['blueprints']) * arc) : 0,
						
						med = r[i]['reward']['resources']['medals'] !== undefined ? Math.round(parseInt(r[i]['reward']['resources']['medals']) * arc) : 0,
						
						MaezenRangTotal = Math.round(NormalRangZurueck * arc),
						
						arr = {
							p: r[i]['rank'],
							fp: NormalRangZurueck,
							blp: blp,
							med: med,
							EingezahltAufRang: EingezahltAufRang,
							GesamtInvesFP: GesamtInvesFP,
							RestFreieFPAufRang: RestFreieFPAufRang,
							HalberEinzahlbarerPlatzAufRang: HalberEinzahlbarerPlatzAufRang
						};

					// Platz + Grund-FP "merken"
					places.push(arr);

					let trClass = '';

					if(isSelf) {
						trClass = ' class="info-row"';
					}

					// kann nicht mehr eingezahlt werden, zu viel || ist schon mit (1,9) belegt oder überzahlt
					else if((GesamtInvesFP + HalberEinzahlbarerPlatzAufRang) > TotalFP || EingezahltAufRang >= MaezenRangTotal) {
						trClass = ' class="text-grey"';
					}

					// erste drei Spalten
					h.push('<tr' + trClass + '><td><strong>' + r[i]['rank'] + '</strong></td>' +
						'<td class="text-center">' +
							'<strong class="'+ (MaezenRangTotal > afp ? 'error' : 'success') +'">' +
								HTML.Format(MaezenRangTotal) +
							'</strong>' +
						'</td>' +
						'<td class="text-center">' + HTML.Format(blp) + '</td>' +
						'<td class="text-center">' + HTML.Format(med) + '</td>');


					// letzte beiden Spalten

					// Spieler selbst
					if(isSelf)
					{
						if(EingezahltAufRang === MaezenRangTotal)
						{
							h.push('<td class="text-center">' + HTML.Format(EingezahltAufRang) + '</td><td class="text-center"><strong>0</strong></td>');

						}
						else if(EingezahltAufRang > 0) {
							h.push('<td class="text-center">' + HTML.Format(EingezahltAufRang) + '</td>');
							let w = (MaezenRangTotal - EingezahltAufRang);
							h.push('<td class="text-center"><strong>' + ( w === 0 ? '0' : HTML.Format(w)) + '</strong></td>');

						}
						else {
							h.push('<td class="text-center">-</td>');
							h.push('<td class="text-center">-</td>');
						}

					}

					// andere Spieler oder leer
					else {

						// geht genau auf
						if(MaezenRangTotal - HalberEinzahlbarerPlatzAufRang === 1){
							h.push('<td class="text-center" data-case="1">' + HTML.Format(HalberEinzahlbarerPlatzAufRang) + '</td><td class="text-center"><strong class="success">1</strong></td>');
						}

						else if(EingezahltAufRang >= HalberEinzahlbarerPlatzAufRang || MaezenRangTotal - HalberEinzahlbarerPlatzAufRang < 1) {
							h.push('<td class="text-center">-</td><td class="text-center">-</td>');

						}
						else if(HalberEinzahlbarerPlatzAufRang > 0) {
							h.push('<td class="text-center" data-case="2">' + HTML.Format(HalberEinzahlbarerPlatzAufRang) + '</td>');

							let w = (MaezenRangTotal - HalberEinzahlbarerPlatzAufRang);

							// würde leveln
							if((GesamtInvesFP + HalberEinzahlbarerPlatzAufRang) === TotalFP)
							{
								h.push('<td class="text-center" data-case="3"><strong class="warning" title="ACHTUNG! Levelt das LG!">' + ( w === 0 ? '0' : HTML.Format(w)) + '</strong></td>');
							}
							else {
								h.push('<td class="text-center" data-case="4"><strong class="success">' + ( w === 0 ? '0' : HTML.Format(w)) + '</strong></td>');
							}
						}

						// letzte beiden leer
						else {
							h.push('<td class="text-center" data-case="5">-</td>');
							h.push('<td class="text-center">-</td>');
						}
					}

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

		// alle Ansichten aktualisieren
		StrategyPoints.ForgePointBar(afp);

		// wenn der Wert des Archebonus verändert wird, Event feuern
		$('body').on('blur', '#costFactor', function(){

			let ab = parseFloat( $('#costFactor').val() );
			Calculator.ArcBonus = ab;

			localStorage.setItem('CalculatorArcBonus', ab);

			let arc = ((ab + 100) / 100 ),
				h = [];

			h.push('<thead><th>#</th><th>'+ i18n['Boxes']['Calculator']['Earnings'] +'</th><th>BP</th><th>Meds</th><th>'+ i18n['Boxes']['Calculator']['Commitment'] +'</th><th>'+ i18n['Boxes']['Calculator']['Profit'] +'</th></thead>');

			for(let i in places){
				let NormalRangZurueck = parseInt(places[i]['fp']),
					MaezenRangTotal = Math.round(NormalRangZurueck * arc);

				h.push('<tr><td><strong>' + places[i]['p'] + '</strong></td>' +
					'<td class="text-center"><strong class="'+ (MaezenRangTotal > afp ? 'error' : 'success') +'">' + HTML.Format(MaezenRangTotal) + '</strong></td>' +
					'<td class="text-center">' + HTML.Format(places[i]['blp']) + '</td>' +
					'<td class="text-center">' + HTML.Format(places[i]['med']) + '</td>');


				// wenn nix rumkommt, bleibt es leer
				if(places[i]['EingezahltAufRang'] >= places[i]['HalberEinzahlbarerPlatzAufRang'] || MaezenRangTotal - places[i]['HalberEinzahlbarerPlatzAufRang'] < 1){
					h.push('<td class="text-center">-</td><td class="text-center">-</td></tr>');

				} else {

					h.push('<td class="text-center">' + HTML.Format(places[i]['HalberEinzahlbarerPlatzAufRang']) + '</td>');

					let w = MaezenRangTotal - places[i]['HalberEinzahlbarerPlatzAufRang'];
					h.push('<td class="text-center"><strong class="success">' + ( w === 0 ? '+-0' : HTML.Format(w)) + '</strong></td></tr>');
				}
			}

			$('#costTable').html(h.join(''));
			$('#costCalculator').show();
		});


		// Schliessen Button binden
		$('#costCalculatorclose').bind('click', function(){
			$('#costCalculator').remove();
		});
	},
};
