/*
 * **************************************************************************************
 *
 * Dateiname:                 part-calc.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       04.09.19, 20:59 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

Parts = {

	CurrentBuildingID : false,
	CurrentBuildingStep : false,
	CurrentBuildingPercent: 90,
	Input: [],
	InputOriginal: [],
	InputCount: 0,
	InputTotal: 0,


	/**
	 * HTML Box in den DOM drücken und ggf. Funktionen binden
	 */
	buildBox: ()=> {

		// Gibt es schon? Raus...
		if( $('#OwnPartBox').length > 0 ){
			return;
		}

		let perc = localStorage.getItem('CurrentBuildingPercent');
		if(perc !== null){
			Parts.CurrentBuildingPercent = perc;
		}

		// Box in den DOM
		HTML.Box('OwnPartBox', i18n['Boxes']['OwnpartCalculator']['Title'], i18n['Boxes']['OwnpartCalculator']['HelpLink']);

		// Body zusammen fummeln
		Parts.BoxBody();


		$('body').on('blur', '#arc-percent', function(){
			let p = $(this).val();
			localStorage.setItem('CurrentBuildingPercent', p);
			Parts.CurrentBuildingPercent = p;

			Parts.collectExternals();
		});

		// Es wird ein exerner Platz eingetragen
		$('body').on('blur', '.own-part-input', function(){
			Parts.collectExternals();
		});
	},


	/**
	 * Externe Plätze einsammeln und ggf. übergeben
	 */
	collectExternals: ()=> {
		Parts.InputTotal = 0;
		Parts.InputCount = 0;

		$('.own-part-input').each(function(i){

			let v = $(this).val();

			if(v === ''){
				$(this).val(0);
				v = 0;
			}

			if(i > 0){
				Parts.InputTotal += parseInt(v);
			}

			if(parseInt(v) > 0){
				Parts.InputCount++;
			}

			Parts.Input[i] = {
				value: parseInt(v),
				type: 'input'
			};

			Parts.InputOriginal[i] = {
				value: parseInt(v),
				type: 'input'
			};
		});

		// Prüfen ob alle "null" sind
		const isAllZero = !Parts.Input.some(el => el.value !== 0);

		if(isAllZero !== true){
			Parts.BoxBody(Parts.Input);
		} else {
			Parts.BoxBody();
		}
	},


	/**
	 * Sichtbarer Teil
	 *
	 * @constructor
	 */
	BoxBody: (input)=> {

		let d = JSON.parse(localStorage.getItem('OwnCurrentBuildingCity')),
			rankings = JSON.parse(localStorage.getItem('OwnCurrentBuildingGreat')),
			cityentity_id = d['cityentity_id'],
			level = d['level'],
			total_lg = parseInt(d['state']['forge_points_for_level_up']),
			total_lg_org = parseInt(d['state']['forge_points_for_level_up']),
			arc = ((parseFloat( Parts.CurrentBuildingPercent ) + 100) / 100 ),
			total_maezen = 0,
			maezenTmp = 0,
			places = {},
			placesExt = {},
			placesTmp = [],
			inputTmp = [],
			meds = [],
			bps = [],
			h = [],
			input_total = 0,

			ot = 0;

		Parts.CurrentBuildingID = cityentity_id;


		// 6x Durchlauf um die Plätze + Mäzen zu errechnen
		// nur einer kann der eigenen sein
		for(let x = 0; x < 6; x++) {
			if(rankings.hasOwnProperty(x))
			{
				// LG Besitzer überspringen oder Besitzer ist nicht dabei,
				// dann P6 überspringen der er nichts mehr bekommt
				if(rankings[x]['player']['is_self'] === true || rankings[x]['reward'] === undefined){
					continue;
				}

				let spa = (rankings[x]['reward']['strategy_point_amount'] !== undefined ? parseInt(rankings[x]['reward']['strategy_point_amount']) : 0),
					place = Math.round( spa * arc),
					p = (rankings[x]['rank'] -1);

				// Werte für die Kopierbutton
				places[p] = place;

				maezenTmp += place;

				// originale Plätze des LGs
				placesTmp[p] = {
					value: place,
					type: 'original'
				};

				// Medallien berechnen
				let m = (rankings[x]['reward']['resources'] !== undefined ? parseInt(rankings[x]['reward']['resources']['medals']) : 0);
				meds[ rankings[x]['rank'] ] = HTML.Format(Math.ceil( m * arc));

				// Blaupausen berechnen
				let b = (rankings[x]['reward']['blueprints'] !== undefined ? parseInt(rankings[x]['reward']['blueprints']) : 0);
				bps[ rankings[x]['rank'] ] = HTML.Format(Math.ceil( b * arc));
			}
		}

		// Spieler hat externe FP eingetragen, bissel was vorbereiten
		if(input !== undefined){

			// Durcheinander? Schick von groß nach klein Sortieren
			inputTmp = input.sort(Parts.compareValues('value', 'desc'));

			//
			placesExt = Parts.extend(placesTmp, inputTmp);

			if(Parts.InputCount > 1 && placesExt[0]['type'] !== 'input'){
				total_lg -= Parts.InputTotal;
			}

			for(let i = 0; i < 5; i++){

				if(placesExt[i]['type'] === 'input' && placesExt[i]['value'] > 0)
				{
					input_total += placesExt[i]['value'];
				}

				if(placesExt[i]['type'] === 'original'){
					total_maezen += placesExt[i]['value'];
				}
			}

		} else {

			// Standard Berechnung
			placesExt = placesTmp;
			total_maezen = maezenTmp;
		}


		// Info-Block
		h.push('<table style="width: 100%"><tr><td style="width: 50%">');
		h.push('<p class="lg-info text-center"><strong>' + BuildingNamesi18n[cityentity_id]['name'] + ' </strong><br>' + i18n['Boxes']['OwnpartCalculator']['Step'] + ' '+ level +' &rarr; '+ (parseInt(level) +1) +'</p>');
		h.push('</td>');
		h.push('<td class="text-right">');
		h.push('<span>' + i18n['Boxes']['OwnpartCalculator']['ArcBonus'] +  ':</span><input type="number" id="arc-percent" step="0.1" min="12" max="200" value="'+ Parts.CurrentBuildingPercent +'"><span>%</span>');
		h.push('</td>');
		h.push('</tr></table>');

		// Platzhalter für die Berechnung
		let own_1_1 = 0,
			own_2_1 = 0,
			own_2_2 = 0,
			own_3_1 = 0,
			own_3_2 = 0,
			own_4_1 = 0,
			own_4_2 = 0,
			own_5_1 = 0,

			own_parts = {
				0: 0,
				1: 0,
				2: 0,
				3: 0,
				4: 0,
				5: 0
			},
			ownpart_total = 0;


		if(placesExt[0]['type'] === 'input' && placesExt[0]['value'] > 0){
			own_1_1 = Math.round( total_lg - placesExt[0]['value'] - (placesExt[1]['value'] * 2) );

			if(own_1_1 < 0){
				own_1_1 = 0;
			}
			own_parts[0] = own_1_1;

		} else {
			own_1_1 = Math.round( total_lg - (placesExt[0]['value'] * 2) );

			if(own_1_1 < 0){
				own_1_1 = 0;
			}
			own_parts[0] = own_1_1;
		}

		
		// -----------------------------------------------
		
		own_2_1 = parseInt(total_lg - (placesExt[2]['value'] * 2));
		own_2_2 = Math.round( own_2_1 - own_1_1 - placesExt[0]['value'] - placesExt[1]['value'] );

		if(own_2_2 < 0){
			own_2_2 = 0;
		}
		
		own_parts[1] = own_2_2;
	
		// -----------------------------------------------
		
		own_3_1 = parseInt( total_lg - (placesExt[3]['value'] * 2) );
		own_3_2 = Math.round( own_3_1 - own_2_2 - own_1_1 - placesExt[0]['value'] - placesExt[1]['value'] - placesExt[2]['value'] );
		
		if(own_3_2 < 0 || placesExt[3]['type'] === 'input'){
			own_3_2 = 0;
		}

		own_parts[2] = own_3_2;
		
		// -----------------------------------------------
		
		if(placesExt[3]['value'] > 0){
			own_4_1 = (total_lg - ( placesExt[4]['value'] * 2 ));
			own_4_2 = Math.round( own_4_1 - own_3_2 - own_2_2 - own_1_1 - placesExt[0]['value'] - placesExt[1]['value'] - placesExt[2]['value'] - placesExt[3]['value'] );
			
			if(own_4_2 < 0 || placesExt[3]['type'] === 'input'){
				own_4_2 = 0;
			}
		}

		if(Parts.InputCount > 1 && placesExt[4]['value'] === 0){
			own_4_2 += Parts.InputTotal;
		}
		
		own_parts[3] = own_4_2;
		
		// -----------------------------------------------
		
		own_5_1 = Math.round( total_lg - own_4_2 - own_3_2 - own_2_2 - own_1_1 - placesExt[0]['value'] - placesExt[1]['value'] - placesExt[2]['value'] - placesExt[3]['value'] - placesExt[4]['value']);

		if(own_5_1 < 0){
			own_5_1 = 0;
		}

		// Spezielle Korrekturen
		if(Parts.InputCount > 1 && placesExt[4]['value'] > 0){
			own_5_1 += Parts.InputTotal;
		}

		own_parts[4] = own_5_1;


		if(Parts.InputCount > 1 && (placesExt[1]['type'] === 'input' && placesExt[2]['value'] === 'original' && placesExt[3]['type'] === 'input')){
			own_2_2 += Parts.InputTotal;
		}

		if(Parts.InputCount > 1 && (placesExt[0]['type'] === 'input' && placesExt[1]['type'] === 'original' && placesExt[2]['type'] === 'input' && placesExt[3]['type'] === 'original')){
			own_3_2 += own_2_2;
			own_parts[2] = own_3_2

			own_2_2 = 0;
			own_parts[1] = 0;
		}

		if(Parts.InputCount > 1 && (placesExt[1]['type'] === 'original' && placesExt[2]['type'] === 'input' && placesExt[3]['type'] === 'input' && placesExt[3]['type'] === 'original')){
			own_4_2 += Parts.InputTotal;
			own_parts[3] = own_4_2;
		}

		// Eigenanteil 4 korrigieren
		if(Parts.InputCount > 1 && (placesExt[2]['type'] === 'input' && placesExt[3]['type'] === 'input' && placesExt[4]['type'] === 'input')){
			ownpart_total -= own_4_2;
			own_parts[3] = 0;
		}

		if(Parts.InputCount > 1 && (placesExt[0]['type'] === 'input' && placesExt[1]['type'] === 'original' && placesExt[2]['type'] === 'input' && placesExt[3]['type'] === 'original' && placesExt[4]['type'] === 'original')){
			own_4_2 -= Parts.InputTotal;
			own_parts[3] = own_4_2;
		}

		ownpart_total += own_1_1;
		ownpart_total += own_2_2;
		ownpart_total += own_3_2;
		ownpart_total += own_4_2;
		ownpart_total += own_5_1;


		h.push('<table class="foe-table" style="margin-bottom: 10px;">');

		h.push('<thead>');

		h.push('<tr>');
		h.push('<th class="text-center" colspan="3" style="width: 50%">Mäzen Anteil: <strong>' + total_maezen + (input_total > 0 ? ' <strong class="info">+' + input_total + '</strong>' : '') + '</strong></th>');
		h.push('<th class="text-center" colspan="3">' + i18n['Boxes']['OwnpartCalculator']['OwnPart'] + ': <strong class="success">' + ownpart_total + '</strong></th>');
		h.push('</tr>');

		h.push('<tr>');
		if(input_total > 0){
			h.push('<th colspan="3" class="text-center" style="width: 50%">' + i18n['Boxes']['OwnpartCalculator']['Step'] + ': <strong class="normal">' + total_lg_org + '</strong></th>');
			h.push('<th colspan="3" class="text-center">' + i18n['Boxes']['OwnpartCalculator']['ExternalFP'] + ': <strong class="info">' + input_total + '</strong></th>');
		} else {
			h.push('<th colspan="6" class="text-center">' + i18n['Boxes']['OwnpartCalculator']['LGTotalFP'] + ': <strong class="normal">' + total_lg_org + '</strong></th>');
		}

		h.push('</tr>');

		h.push('</thead>');
		h.push('</table>');

		h.push('<table id="OwnPartTable" class="foe-table">');
		h.push('<tbody>');

		h.push('<tr>');
		h.push('<td>' + i18n['Boxes']['OwnpartCalculator']['Order'] + '</td>');
		h.push('<td class="text-center">' + i18n['Boxes']['OwnpartCalculator']['Deposit'] + '</td>');
		h.push('<td class="text-center">Ext.</td>');
		h.push('<td class="text-center">BPs</td>');
		h.push('<td class="text-center">Meds</td>');
		h.push('<td class="text-center">Ext.</td>');
		h.push('</tr>');


		if(own_parts[0] > 0 && placesExt[0]['type'] === 'original'){

			h.push('<tr>');
			h.push('<td>' + i18n['Boxes']['OwnpartCalculator']['OwnPart'] + '</td>');
			h.push('<td class="text-center"><strong class="success">' + own_parts[0] + '</strong></td>');
			h.push('<td colspan="4"></td>');
			h.push('</tr>');

			ot += parseInt(own_parts[0]);
		}


		/**
		 * Platz 1
		 */
		h.push('<tr>');
		h.push('<td>Platz 1</td>');

		if(placesExt[0]['type'] === 'input'){
			h.push('<td class="text-center">-</td>');
			h.push('<td class="text-center"><strong class="info">' + placesExt[0]['value'] + '</strong></td>');
		} else {
			let o50 = (placesExt[0]['value'] > (total_lg_org / 2));

			h.push('<td class="text-center"><strong>' + placesExt[0]['value'] + '</strong>' + (o50 ? ' <strong><small class="nw danger">(>50% !)</small></strong>' : '') + '</td>');
			h.push('<td class="text-center">-</td>');
		}

		h.push('<td class="text-center">' + bps[1] + '</td>');
		h.push('<td class="text-center">' + meds[1] + '</td>');
		h.push('<td class="text-center"><input min="0" step="1" type="number" class="own-part-input" value="' + (input !== undefined ? Parts.InputOriginal[0]['value'] : 0 ) + '"></td>');
		h.push('</tr>');


		if(own_parts[0] > 0 && placesExt[0]['type'] === 'input'){

			h.push('<tr>');
			h.push('<td>Eigenanteil</td>');
			h.push('<td class="text-center"><strong class="success">' + own_parts[0] + '</strong></td>');
			h.push('<td colspan="4"></td>');
			h.push('</tr>');

			ot += parseInt(own_parts[0]);
		}


		/**
		 * 	Platz 2
		 */
		h.push('<tr>');
		h.push('<td>Platz 2</td>');

		if(placesExt[1]['type'] === 'input'){
			h.push('<td class="text-center">-</td>');
			h.push('<td class="text-center"><strong class="info">' + placesExt[1]['value'] + '</strong></td>');
		} else {
			h.push('<td class="text-center"><strong>' + placesExt[1]['value'] + '</strong></td>');
			h.push('<td class="text-center">-</td>');
		}

		h.push('<td class="text-center">' + bps[2] + '</td>');
		h.push('<td class="text-center">' + meds[2] + '</td>');
		h.push('<td class="text-center"><input min="0" step="1" type="number" class="own-part-input" value="' + (input !== undefined ? Parts.InputOriginal[1]['value'] : 0 ) + '"></td>');
		h.push('</tr>');


		if(own_parts[1] > 0){
			ot += parseInt(own_parts[1]);

			h.push('<tr>');
			h.push('<td>' + i18n['Boxes']['OwnpartCalculator']['OwnPart'] + '</td>');

			h.push('<td class="text-center"><strong class="success">' + own_parts[1] + (own_parts[0] > 0 && own_parts[1] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
			h.push('<td colspan="4"></td>');
			h.push('</tr>');
		}


		h.push('<tr>');
		h.push('<td>Platz 3</td>');

		if(placesExt[2]['type'] === 'input'){
			h.push('<td class="text-center">-</td>');
			h.push('<td class="text-center"><strong class="info">' + placesExt[2]['value'] + '</strong></td>');
		} else {
			h.push('<td class="text-center"><strong>' + placesExt[2]['value'] + '</strong></td>');
			h.push('<td class="text-center">-</td>');
		}

		h.push('<td class="text-center">' + bps[3] + '</td>');
		h.push('<td class="text-center">' + meds[3] + '</td>');
		h.push('<td class="text-center"><input min="0" step="1" type="number" class="own-part-input" value="' + (input !== undefined ? Parts.InputOriginal[2]['value'] : 0 ) + '"></td>');
		h.push('</tr>');



		if(own_parts[2] > 0){
			ot += parseInt(own_parts[2]);

			h.push('<tr>');
			h.push('<td>' + i18n['Boxes']['OwnpartCalculator']['OwnPart'] + '</td>');

			h.push('<td class="text-center"><strong class="success">' + own_parts[2] + (own_parts[1] > 0 && own_parts[2] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
			h.push('<td colspan="4"></td>');
			h.push('</tr>');
		}


		/**
		 * 	Platz 4
		 */
		h.push('<tr>');
		h.push('<td>Platz 4</td>');

		if(placesExt[3]['type'] === 'input'){
			h.push('<td class="text-center">-</td>');
			h.push('<td class="text-center"><strong class="info">' + placesExt[3]['value'] + '</strong></td>');
		} else {
			h.push('<td class="text-center"><strong>' +placesExt[3]['value'] + '</strong></td>');
			h.push('<td class="text-center">-</td>');
		}

		h.push('<td class="text-center">' + bps[4] + '</td>');
		h.push('<td class="text-center">' + meds[4] + '</td>');
		h.push('<td class="text-center"><input min="0" step="1" type="number" class="own-part-input" value="' + (input !== undefined ? Parts.InputOriginal[3]['value'] : 0 ) + '"></td>');
		h.push('</tr>');


		if(own_parts[3] > 0){
			ot += parseInt(own_parts[3]);

			h.push('<tr>');
			h.push('<td>' + i18n['Boxes']['OwnpartCalculator']['OwnPart'] + '</td>');

			h.push('<td class="text-center"><strong class="success">' + own_parts[3] + (own_parts[2] > 0 && own_parts[3] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
			h.push('<td colspan="4"></td>');
			h.push('</tr>');
		}


		/**
		 * 	Platz 5
		 */
		h.push('<tr>');
		h.push('<td>Platz 5</td>');

		if(placesExt[4]['type'] === 'input' && placesExt[4]['value'] > 0){
			h.push('<td class="text-center">-</td>');
			h.push('<td class="text-center"><strong class="info">' + placesExt[4]['value'] + '</strong></td>');
		} else {
			h.push('<td class="text-center"><strong>' + placesExt[4]['value'] + '</strong></td>');
			h.push('<td class="text-center">-</td>');
		}

		h.push('<td class="text-center">' + bps[5] + '</td>');
		h.push('<td class="text-center">' + meds[5] + '</td>');
		h.push('<td class="text-center"><input min="0" step="1" type="number" class="own-part-input" value="' + (input !== undefined ? Parts.InputOriginal[4]['value'] : 0 ) + '"></td>');
		h.push('</tr>');


		if(own_parts[4] > 0){
			h.push('<tr>');
			h.push('<td>' + i18n['Boxes']['OwnpartCalculator']['OwnPart'] + '</td>');

			ot += parseInt(own_parts[4]);

			h.push('<td class="text-center"><strong class="success">' + own_parts[4] + (own_parts[3] > 0 && own_parts[4] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
			h.push('<td colspan="4"></td>');
			h.push('</tr>');
		}

		h.push('<tbody>');
		h.push('</table>');

		$('#OwnPartBoxBody').html( h.join('') );

		Parts.BuildBackgroundBody(places);
	},


	/**
	 * Neues Objekt mit den Original-Plätzen und ggf überschrieben externen Plätzen
	 *
	 * @param plc
	 * @param inp
	 * @returns {Array}
	 */
	extend: (plc, inp)=> {

		let obj = [];

		for(let i in plc)
		{

			for(let x in inp)
			{
				if(inp[x]['value'] >= plc[i]['value'] && inp[x]['value'] > 0)
				{
					if((obj[i] === undefined))
					{
						obj[i] = inp[x];
					}

					delete inp[x];
				}
			}

			if(obj[i] === undefined){
				obj[i] = plc[i];
			}
		}

		return obj;
	},


	/**
	 * Sortierung eines Objekts in die entsprechende Richtung
	 *
	 * @param key
	 * @param order
	 * @returns {Function}
	 */
	compareValues: (key, order = 'asc')=> {
		return function(a, b) {

			if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
				return 0;
			}

			const varA = (typeof a[key] === 'string') ?	a[key].toUpperCase() : a[key];
			const varB = (typeof b[key] === 'string') ?	b[key].toUpperCase() : b[key];

			let comparison = 0;

			if (varA > varB) {
				comparison = 1;

			} else if (varA < varB) {
				comparison = -1;
			}

			return ((order == 'desc') ?	(comparison * -1) : comparison);
		};
	},


	/**
	 * Daten für die Kopierbuttons
	 *
	 * @param p
	 * @constructor
	 */
	BuildBackgroundBody: (p)=>{
		let b = [],
			n = localStorage.getItem('PlayerCopyName'),
			m = localStorage.getItem('current_player_name'),
			h = p,
			k = p,
			bn = localStorage.getItem(Parts.CurrentBuildingID);

		b.push('<p><span class="header"><strong>' + i18n['Boxes']['OwnpartCalculator']['CopyValues'] + '</strong></span></p>');

		b.push('<div><span>Spieler:</span><input type="text" id="player-name" placeholder="' + i18n['Boxes']['OwnpartCalculator']['YourName'] + '" value="' + (n !== null ? n : m) + '"></div>');
		b.push('<div><span>Gebäude:</span><input type="text" id="build-name" placeholder="' + i18n['Boxes']['OwnpartCalculator']['IndividualName'] + '"  value="' + (bn !== null ? bn : BuildingNamesi18n[ Parts.CurrentBuildingID ]['name']) + '"></div>');

		let drp = '<div><span>Schema:</span><select id="chain-scheme">' +
			'<option value="" disabled>-- ' + i18n['Boxes']['OwnpartCalculator']['OutputScheme'] + ' --</option>' +
			'<option value="1">Name LG P5 P4 P3 P2 P1</option>' +
			'<option value="2">Name LG P1 P2 P3 P4 P5</option>' +
			'<option value="3">Name LG P5/4/3/2/1</option>' +
			'<option value="4">Name LG P1/2/3/4/5</option>' +
			'<option value="5" selected>Name LG P5(FP) P4(FP) P3(FP) P2(FP) P1(FP)</option>' +
			'<option value="6">Name LG P1(FP) P2(FP) P3(FP) P4(FP) P5(FP)</option>' +
			'</select></div>';

		b.push(drp);

		let cb = '<div class="checkboxes">' +
			'<label class="form-check-label" for="chain-p1"><input type="checkbox" id="chain-p1" data-place="1"> ' + i18n['Boxes']['OwnpartCalculator']['Place'] + ' 1.</label>' +

			'<label class="form-check-label" for="chain-p2"><input type="checkbox" class="form-check-input chain-place" id="chain-p2" data-place="2"> ' + i18n['Boxes']['OwnpartCalculator']['Place'] + ' 2.</label>' +

			'<label class="form-check-label" for="chain-p3"><input type="checkbox" class="form-check-input chain-place" id="chain-p3" data-place="3"> ' + i18n['Boxes']['OwnpartCalculator']['Place'] + ' 3.</label>' +

			'<label class="form-check-label" for="chain-p4"><input type="checkbox" class="form-check-input chain-place" id="chain-p4" data-place="4"> ' + i18n['Boxes']['OwnpartCalculator']['Place'] + ' 4.</label>' +

			'<label class="form-check-label" for="chain-p5"><input type="checkbox" class="form-check-input chain-place" id="chain-p5" data-place="5"> ' + i18n['Boxes']['OwnpartCalculator']['Place'] + ' 5.</label>' +

			'<label class="form-check-label" for="chain-level"><input type="checkbox" class="form-check-input chain-place" id="chain-level" data-place="level"> ' + i18n['Boxes']['OwnpartCalculator']['Levels'] + '</label>' +
			'</div>';

		b.push(cb);

		b.push('<div class="btn-outer text-center" style="margin-top: 10px"><span class="button-own">' + i18n['Boxes']['OwnpartCalculator']['CopyValues'] + '</span></div>');

		// ---------------------------------------------------------------------------------------------


		// es soll etwas kopiert werden
		// Player-Namen und individuellen LG Namen ermittlen
		new ClipboardJS('.button-own', {
			text: function(trigger) {

				let pn = $('#player-name').val(),
					bn = $('#build-name').val();

				if(pn.length !=''){
					localStorage.setItem('PlayerCopyName', pn);
				}

				if(bn.length !=''){
					localStorage.setItem(Parts.CurrentBuildingID, bn);
				}

				$(trigger).addClass('border-success');

				// nach 4s den grünen Rahmen wieder ausblenden
				setTimeout(function(){
					$(trigger).removeClass('border-success');

					// wieder zuklappen
					Parts.BackGroundBoxAnimation(false);

				}, 3000);


				let s = $('#chain-scheme').val();

				let sol = {
						1: 'Pi',
						2: 'Pi',
						3: '/i',
						4: '/i',
						5: 'Pi(fp)',
						6: 'Pi(fp)',
					},
					sop = {
						1: {d: 'd'},
						2: {d: 'u'},
						3: {d: 'd'},
						4: {d: 'u'},
						5: {d: 'd'},
						6: {d: 'u'}
					};

				let parts = [];

				// Spieler Name
				parts.push(pn);

				// LG Name
				parts.push(bn);

				if( $('#chain-level').prop('checked') ){
					parts.push('Bitte Leveln');
				}

				// Plätze wenn angehakt
				if(sop[s]['d'] === 'u'){
					for(let i = 1; i < 6; i++){
						if( $('#chain-p'+i).prop('checked') ){
							let p = sol[s].replace(/i/, i);
							p = p.replace(/fp/, h[ (i  -1) ]);
							parts.push(p);
						}
					}

				} else {
					for(let i = 5; i > 0; i--){
						if( $('#chain-p'+i).prop('checked') ){
							let p = sol[s].replace(/i/, i);
							p = p.replace(/fp/, h[ (i  -1) ]);
							parts.push(p);
						}
					}
				}

				return parts.join(' ');
			}
		});


		// Box wurde schon in den DOM gelegt?
		if( $('.OwnPartBoxBackground').length > 0 ){
			$('.OwnPartBoxBackgroundBody').html( b.join('') );

			// und raus...
			return;
		}

		// Container zusammen setzen
		let div = $('<div />').addClass('OwnPartBoxBackground'),
			a = $('<div />').addClass('outerArrow').append( $('<span />').addClass('arrow game-cursor') ).append( $('<div />').addClass('OwnPartBoxBackgroundBody window-box').append(b.join('')) );

		$('#OwnPartBox').append( div.append(a) );

		$('#OwnPartBox').append( $('<div />').addClass('black-bg').hide() );

		// der "Toogle"-Pfeil wurde geklickt,
		// lasst die Spiele beginnen
		$('.arrow').bind('click', function(){
			if( $('#OwnPartBox').hasClass('show') ){
				Parts.BackGroundBoxAnimation(false);
			} else {
				Parts.BackGroundBoxAnimation(true);
			}
		});
	},


	/**
	 * Lecker Animation für das Anzeigen der Kopieren Buttons
	 *
	 * @param show
	 * @constructor
	 */
	BackGroundBoxAnimation: (show)=> {
		let $box = $('#OwnPartBox');


		if(show === true){
			$('.OwnPartBoxBackgroundBody').animate({height: 230, opacity: 1}, 250, function () {
				$box.addClass('show');
				$box.find('.black-bg').show();
			});

		} else {
			$('.OwnPartBoxBackgroundBody').animate({height: 0, opacity: 0}, 250, function () {
				$box.removeClass('show');
				$box.find('.black-bg').hide();
			});
		}
	},


	/**
	 * Die Box ist schon offen, Content updaten
	 *
	 * @param d
	 * @constructor
	 */
	RefreshData: ()=> {
		Parts.BoxBody();
	}
};
