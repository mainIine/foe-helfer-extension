/*
 * **************************************************************************************
 *
 * Dateiname:                 part_calc.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              01.02.19 14:20 Uhr
 * zu letzt bearbeitet:       01.02.19 14:20 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 *
 * i18n
 * https://foede.innogamescdn.com/start/metadata?id=city_entities-ca34975f8e60acb4cce76ba85325ac1ba42e5e21
 */

let all_LGs = [];

Parts = {

	CurrentBuildingID : false,
	CurrentBuildingStep : false,
	CurrentBuildingPercent: 90,
	Input: [],
	InputOriginal: [],
	InputCount: 0,
	InputTotal: 0,

	TimeOut: null,


	buildBox: ()=> {

		let perc = localStorage.getItem('CurrentBuildingPercent');
		if(perc !== null){
			Parts.CurrentBuildingPercent = perc;
		}

		// Gibt es schon? Raus...
		if( $('#OwnPartBox').length > 0 ){
			return;
		}

		// Box in den DOM
		HTML.Box('OwnPartBox', 'Eigenanteils Rechner');

		// Body zusammen fummeln
		Parts.BoxBody();

		// Schliessenbutton Event
		$('#OwnPartBoxclose').bind('click', ()=> {
			$('#OwnPartBox').remove();
		});


		$('body').on('blur', '#arc-percent', function() {
			let p = $(this).val();
			localStorage.setItem('CurrentBuildingPercent', p);
			Parts.CurrentBuildingPercent = p;

			Parts.BoxBody();
		});

		// Es wird ein exerner Platz eingetragen
		$('body').on('blur', '.own-part-input', function(){

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

			const isAllZero = !Parts.Input.some(el => el.value !== 0);

			if(isAllZero !== true){
				Parts.BoxBody(Parts.Input);
			} else {
				Parts.BoxBody();
			}
		});
	},


	extend: (plc, inp)=> {

		let obj = [];

		for(let i in plc)
		{

			for(let x in inp)
			{
				if(inp[x]['value'] > plc[i]['value'])
				{
					obj[i] = inp[x];
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
			places = {},
			placesExt = {},
			placesTmp = [],
			inputTmp = [],
			nextOwnAdd = 0,
			meds = [],
			bps = [],
			h = [],
			input_total = 0,
			ext = {
				0: 0,
				1: 0,
				2: 0,
				3: 0,
				4: 0,
				5: 0
			},
			ot = 0;

		Parts.CurrentBuildingID = cityentity_id;



		// 6x Durchlauf um die Plätze + Mäzen zu errechnen
		// nur einer kann der eigenen sein
		for(let x = 0; x < 6; x++) {
			if(rankings.hasOwnProperty(x))
			{
				// LG Besitzer überspringen
				if(rankings[x]['player']['is_self'] === true){
					continue;
				}

				let spa = (rankings[x]['reward']['strategy_point_amount'] !== undefined ? parseInt(rankings[x]['reward']['strategy_point_amount']) : 0),
					place = Math.round( spa * arc),
					p = (rankings[x]['rank'] -1);

				// Platz + Mäzenbonus
				places[p] = place;

				// placesExt[p] = place;

				placesTmp[p] = {
					value: place,
					type: 'original'
				};

				//total_maezen += place;

				// Medallien berechnen
				let m = (rankings[x]['reward']['resources'] !== undefined ? parseInt(rankings[x]['reward']['resources']['medals']) : 0);
				meds[ rankings[x]['rank'] ] = HTML.Format(Math.ceil( m * arc));

				// Blaupausen berechnen
				let b = (rankings[x]['reward']['blueprints'] !== undefined ? parseInt(rankings[x]['reward']['blueprints']) : 0);
				bps[ rankings[x]['rank'] ] = HTML.Format(Math.ceil( b * arc));
			}
		}


		console.log('placesExt - Before: ', placesExt);
		console.log('places - Before: ', places);
		

		if(input !== undefined){

			console.log('total_lg - Before: ', total_lg);
			console.log('Parts.InputTotal: ', Parts.InputTotal);

			if(Parts.InputCount > 1){
				total_lg -= Parts.InputTotal;
			}

			inputTmp = input.sort(Parts.compareValues('value', 'desc'));

			placesExt = Parts.extend(placesTmp, inputTmp);


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
			placesExt = placesTmp;
		}

		console.log('total_lg - After: ', total_lg);
		console.log('placesExt - After: ', placesExt);
		console.log('-------------------------------------------------------------');

		// Info-Block

		h.push('<table style="width: 100%"><tr><td style="width: 50%">');
		h.push('<p class="lg-info text-center"><strong>' + BuildingNamesi18n[ cityentity_id] + ' </strong><br>Stufe '+ level +' &rarr; '+ (parseInt(level) +1) +'</p>');
		h.push('</td>');
		h.push('<td class="text-right">');
		h.push('<span>Arche:</span><input type="number" id="arc-percent" step="0.1" min="12" max="200" value="'+ Parts.CurrentBuildingPercent +'"><span>%</span>');
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


		if(placesExt[0]['value'] > 0 && places[0]){
			own_1_1 = Math.round( total_lg - (placesExt[0]['value'] + places[0]) );

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
		
		if(own_2_2 < 0 || placesExt[3]['type'] === 'input'){
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
		
		if(places[4] > 0 || placesExt[3]['value'] > 0){
			own_4_1 = (total_lg - ( places[4] * 2 ));
			own_4_2 = Math.round( own_4_1 - own_3_2 - own_2_2 - own_1_1 - placesExt[0]['value'] - placesExt[1]['value'] - placesExt[2]['value'] - placesExt[3]['value'] );
			
			if(own_4_2 < 0 || placesExt[3]['type'] === 'input'){
				own_4_2 = 0;
			}
		}

		if(Parts.InputCount > 1 && placesExt[4]['value'] === 0){
			nextOwnAdd += own_4_2;
			own_4_2 += Parts.InputTotal;
		}
		
		own_parts[3] = own_4_2;
		
		// -----------------------------------------------
		
		own_5_1 = Math.round( total_lg - own_4_2 - own_3_2 - own_2_2 - own_1_1 - placesExt[0]['value'] - placesExt[1]['value'] - placesExt[2]['value'] - placesExt[3]['value'] - placesExt[4]['value']);

		if(own_5_1 < 0){
			own_5_1 = 0;
		}

		if(Parts.InputCount > 1 && placesExt[4]['value'] > 0){
			own_5_1 += Parts.InputTotal;
		}

		/*
		if(Parts.InputCount > 1 && (placesExt[3]['type'] === 'original' && placesExt[3]['value'] > 0 && placesExt[4]['type'] === 'input')){
			own_3_2 += 0;
		}
		*/


		
		own_parts[4] = own_5_1;

		ownpart_total = own_1_1;
		ownpart_total += own_2_2;
		ownpart_total += own_3_2;
		ownpart_total += own_4_2;
		ownpart_total += own_5_1;



		//console.log('own_parts[]: ', own_parts);

		h.push('<table id="OwnPartTable" class="foe-table">');

		h.push('<thead>');

		h.push('<tr>');
		h.push('<th class="text-center" colspan="3" style="width: 50%">Mäzen Anteil: <strong>' + total_maezen + (input_total > 0 ? ' <strong class="info">+ ' + input_total + '</strong>' : '') + '</strong></th>');
		h.push('<th class="text-center" colspan="3">Eigenanteil: <strong class="success">' + ownpart_total + '</strong></th>');
		h.push('</tr>');

		h.push('<tr>');
		if(input_total > 0){
			h.push('<th colspan="3" class="text-center" style="width: 50%">LG Gesamt-FP: <strong class="normal">' + total_lg_org + '</strong></th>');
			h.push('<th colspan="3" class="text-center">Externe FP: <strong class="info">' + input_total + '</strong></th>');
		} else {
			h.push('<th colspan="6" class="text-center">LG Gesamt-FP: <strong class="normal">' + total_lg_org + '</strong></th>');
		}

		h.push('</tr>');

		h.push('</thead>');
		h.push('<tbody>');

		h.push('<tr>');
		h.push('<td>Reihenfolge</td>');
		h.push('<td class="text-center">Einzahlen</td>');
		h.push('<td class="text-center">Ext.</td>');
		h.push('<td class="text-center">BPs</td>');
		h.push('<td class="text-center">Meds</td>');
		h.push('<td class="text-center">Ext.</td>');
		h.push('</tr>');


		if(own_parts[0] > 0 && ext[0] < places[0]){

			h.push('<tr>');
			h.push('<td>Eigenanteil</td>');
			h.push('<td class="text-center"><strong class="success">' + own_parts[0] + '</strong></td>');
			h.push('<td colspan="4"></td>');
			h.push('</tr>');

			ot += parseInt(own_parts[0]);
		}


		h.push('<tr>');
		h.push('<td>Platz 1</td>');

		if(placesExt[0]['type'] === 'input'){
			h.push('<td class="text-center">-</td>');
			h.push('<td class="text-center"><strong class="info">' + placesExt[0]['value'] + '</strong></td>');
		} else {
			h.push('<td class="text-center"><strong>' + places[0] + '</strong></td>');
			h.push('<td class="text-center">-</td>');
		}

		h.push('<td class="text-center">' + bps[1] + '</td>');
		h.push('<td class="text-center">' + meds[1] + '</td>');
		h.push('<td class="text-center"><input min="0" step="1" type="number" class="own-part-input" value="' + (input !== undefined ? Parts.InputOriginal[0]['value'] : 0 ) + '"></td>');
		h.push('</tr>');

		if(own_parts[0] > 0 && ext[0] > places[0]){

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
			h.push('<td class="text-center"><strong>' + places[1] + '</strong></td>');
			h.push('<td class="text-center">-</td>');
		}

		h.push('<td class="text-center">' + bps[2] + '</td>');
		h.push('<td class="text-center">' + meds[2] + '</td>');
		h.push('<td class="text-center"><input min="0" step="1" type="number" class="own-part-input" value="' + (input !== undefined ? Parts.InputOriginal[1]['value'] : 0 ) + '"></td>');
		h.push('</tr>');


		h.push('<tr>');
		h.push('<td>Eigenanteil</td>');

		if(own_parts[1] > 0){
			ot += parseInt(own_parts[1]);
		}

		h.push('<td class="text-center"><strong class="success">' + own_parts[1] + (own_parts[0] > 0 && own_parts[1] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
		h.push('<td colspan="4"></td>');
		h.push('</tr>');


		h.push('<tr>');
		h.push('<td>Platz 3</td>');

		if(placesExt[2]['type'] === 'input'){
			h.push('<td class="text-center">-</td>');
			h.push('<td class="text-center"><strong class="info">' + placesExt[2]['value'] + '</strong></td>');
		} else {
			h.push('<td class="text-center"><strong>' + places[2] + '</strong></td>');
			h.push('<td class="text-center">-</td>');
		}

		h.push('<td class="text-center">' + bps[3] + '</td>');
		h.push('<td class="text-center">' + meds[3] + '</td>');
		h.push('<td class="text-center"><input min="0" step="1" type="number" class="own-part-input" value="' + (input !== undefined ? Parts.InputOriginal[2]['value'] : 0 ) + '"></td>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<td>Eigenanteil</td>');

		if(own_parts[2] > 0){
			ot += parseInt(own_parts[2]);
		}
		h.push('<td class="text-center"><strong class="success">' + own_parts[2] + (own_parts[1] > 0 && own_parts[2] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
		h.push('<td colspan="4"></td>');
		h.push('</tr>');

		/**
		 * 	Platz 4
		 */
		h.push('<tr>');
		h.push('<td>Platz 4</td>');

		if(placesExt[3]['type'] === 'input'){
			h.push('<td class="text-center">-</td>');
			h.push('<td class="text-center"><strong class="info">' + placesExt[3]['value'] + '</strong></td>');
		} else {
			h.push('<td class="text-center"><strong>' + places[3] + '</strong></td>');
			h.push('<td class="text-center">-</td>');
		}

		h.push('<td class="text-center">' + bps[4] + '</td>');
		h.push('<td class="text-center">' + meds[4] + '</td>');
		h.push('<td class="text-center"><input min="0" step="1" type="number" class="own-part-input" value="' + (input !== undefined ? Parts.InputOriginal[3]['value'] : 0 ) + '"></td>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<td>Eigenanteil</td>');
		if(own_parts[3] > 0){
			ot += parseInt(own_parts[3]);
		}
		h.push('<td class="text-center"><strong class="success">' + own_parts[3] + (own_parts[2] > 0 && own_parts[3] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
		h.push('<td colspan="4"></td>');
		h.push('</tr>');


		/**
		 * 	Platz 5
		 */
		h.push('<tr>');
		h.push('<td>Platz 5</td>');

		if(placesExt[4]['type'] === 'input'){
			h.push('<td class="text-center">-</td>');
			h.push('<td class="text-center"><strong class="info">' + placesExt[4]['value'] + '</strong></td>');
		} else {
			h.push('<td class="text-center"><strong>' + places[4] + '</strong></td>');
			h.push('<td class="text-center">-</td>');
		}

		h.push('<td class="text-center">' + bps[5] + '</td>');
		h.push('<td class="text-center">' + meds[5] + '</td>');
		h.push('<td class="text-center"><input min="0" step="1" type="number" class="own-part-input" value="' + (input !== undefined ? Parts.InputOriginal[4]['value'] : 0 ) + '"></td>');
		h.push('</tr>');


		if(own_parts[4] > 0){
			h.push('<tr>');
			h.push('<td>Eigenanteil</td>');

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

	compareValues: (key, order='asc')=> {
		return function(a, b) {
			if(!a.hasOwnProperty(key) ||
				!b.hasOwnProperty(key)) {
				return 0;
			}

			const varA = (typeof a[key] === 'string') ?
				a[key].toUpperCase() : a[key];
			const varB = (typeof b[key] === 'string') ?
				b[key].toUpperCase() : b[key];

			let comparison = 0;
			if (varA > varB) {
				comparison = 1;
			} else if (varA < varB) {
				comparison = -1;
			}
			return (
				(order == 'desc') ?
					(comparison * -1) : comparison
			);
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
			h = p,
			k = p,
			bn = localStorage.getItem(Parts.CurrentBuildingID);

		b.push('<span class="header"><strong>Werte kopieren</strong></span>');

		b.push('<input type="text" id="player-name" placeholder="Dein Name"' + (n !== null ? ' value="'+ n +'"' : '') + '>');
		b.push('<input type="text" id="build-name" placeholder="Individueller LG Name"  value="' + (bn !== null ? bn : BuildingNamesi18n[ Parts.CurrentBuildingID ]) + '">');

		// 5x hoch zählen
		for (let i = 1; i < 5; i++){

			let e = [];

			for(let x = i; x < 5; x++){
				if(parseInt(h[x]) > 0){
					e.push('P'+ x + '('+ h[x] + ')');
				}
			}

			// delete h[i];

			// Kopierbutton zusammen fummeln
			if(e.length > 0){
				let en = e.reverse().join(' ');
				b.push('<div class="btn-outer"><span title="' + en + '" class="button-own" data-clipboard-text="' + en +'">' + en +'</span></div>');
			}
		}

		b.push('<span class="divider"></span>');

		// 5x hoch zählen
		for (let j = 1; j < 5; j++){

			let ps = [];

			for(let x = j; x < 5; x++){
				if(parseInt(k[x]) > 0){
					ps.push('P'+ x);
				}
			}

			delete k[j];

			// Kopierbutton zusammen fummeln
			if(ps.length > 0){
				let psn = ps.reverse().join(' ');
				b.push('<div class="btn-outer"><span title="' + psn + '" class="button-own" data-clipboard-text="' + psn +'">' + psn +'</span></div>');
			}
		}

		// es soll etwas kopiert werden
		// Player-Namen und individuellen LG Namen ermittlen
		new ClipboardJS('.button-own', {
			text: function(trigger) {
				let pc = trigger.getAttribute('data-clipboard-text'),
					pn = $('#player-name').val(),
					bn = $('#build-name').val();

				if(pn.length !==''){
					localStorage.setItem('PlayerCopyName', pn);
				}

				if(bn.length !==''){
					localStorage.setItem(Parts.CurrentBuildingID, bn);
				}

				$(trigger).addClass('border-success');

				// nach 4s den grünen Rahmen wieder ausblenden
				setTimeout(function(){
					$(trigger).removeClass('border-success');
				}, 4000);

				return (pn ? pn+' ' : '') + bn + ' ' + pc;
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
			a = $('<div />').addClass('outerArrow').append( $('<span />').addClass('arrow') ).append( $('<div />').addClass('OwnPartBoxBackgroundBody').append(b.join('')) );

		$('#OwnPartBox').append( div.append(a) );


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
		let $box = $('#OwnPartBox'),
			ep = $box.position(),
			abl = ep.left,
			nbl = abl - 200;

		if(show === true){
			$('#OwnPartBox').addClass('show');
			$('#OwnPartBox').animate({left: nbl + 'px', paddingLeft: '200px'}, 250, function(){
				$('.OwnPartBoxBackgroundBody').animate({width: '178px', height: '350px'}, 250);
			});

		} else {
			$('#OwnPartBox').removeClass('show');

			$('.OwnPartBoxBackgroundBody').animate({width: '0px', height: '0px'}, 250, function () {
				$('#OwnPartBox').animate({left: (abl + 200) + 'px', paddingLeft: '10px'}, 250);
			});
		}
	},


	/**
	 *
	 * @constructor
	 */
	LoadLGList: ()=> {
		let list = localStorage.getItem('LG_List');

		if(list !== null){
			all_LGs = JSON.parse(list);

		} else {
			// Daten holen und aufbereiten
			MainParser.send2Server({get:'all'}, 'GetAllLGData', function(r){
				if(r.status === 'OK'){
					localStorage.setItem('LG_List', JSON.stringify(r.data));
					all_LGs = r.data;
				}
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
