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
	CurrentBuildingExternal: [],

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
		$('body').on('blur', '.own-part-external', function(){

			//clearTimeout(Parts.TimeOut);

			// Kleiner Timeout um die ganze Zahl eingeben zu können
			//Parts.timeout = setTimeout(()=> {
				$('.own-part-external').each(function(i){
					Parts.CurrentBuildingExternal[i] = parseInt($(this).val());
				});

				// console.log('External readed');

				Parts.BoxBody(Parts.CurrentBuildingExternal);

			//}, 1000);
		});
	},


	/**
	 * Sichtbarer Teil
	 *
	 * @constructor
	 */
	BoxBody: (external)=> {

		let d = JSON.parse(localStorage.getItem('OwnCurrentBuildingCity')),
			rankings = JSON.parse(localStorage.getItem('OwnCurrentBuildingGreat')),
			cityentity_id = d['cityentity_id'],
			level = d['level'],
			total_lg = parseInt(d['state']['forge_points_for_level_up']),
			arc = ((parseFloat( Parts.CurrentBuildingPercent ) + 100) / 100 ),
			total_maezen = 0,
			places = [],
			meds = [],
			bps = [],
			own_parts = [],
			h = [],
			ot = 0;

		Parts.CurrentBuildingID = cityentity_id;

		// 6x Durchlauf um die Plätze + Mäzen zu errechnen
		// nur einer kann der eigenen sein
		for(let i = 0; i < 6; i++)
		{
			if(rankings.hasOwnProperty(i))
			{
				// LG Besitzer
				if(rankings[i]['player']['is_self'] === true){
					continue;
				}

				let spa = (rankings[i]['reward']['strategy_point_amount'] !== undefined ? parseInt(rankings[i]['reward']['strategy_point_amount']) : 0),
					place = Math.ceil( spa * arc);

				places[rankings[i]['rank']] = place;
				total_maezen += place;


				let m = (rankings[i]['reward']['resources'] !== undefined ? parseInt(rankings[i]['reward']['resources']['medals']) : 0),
					med = HTML.Format(Math.ceil( m * arc));

				meds[ rankings[i]['rank'] ] = med;


				let b = (rankings[i]['reward']['blueprints'] !== undefined ? parseInt(rankings[i]['reward']['blueprints']) : 0),
					bp = HTML.Format(Math.ceil( b * arc));

				bps[ rankings[i]['rank'] ] = bp;
			}
		}


		// Info-Block

		h.push('<table class="foe-table"><tr><td style="width: 50%">');
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
			ext_rest = 0,
			ownpart_total = 0;

		own_1_1 = Math.round( total_lg - (places[1] * 2) );
		
		if(own_1_1 < 0){
			own_1_1 = 0;
		}

		// gibt es was zum abziehen?
		/*
		if(own_1_1 > 0 && external !== undefined && external[0] > 0 && external[0] < own_1_1){
			own_1_1 = (own_1_1 - external[0]);
		}
		*/
		own_parts[1] = own_1_1;
		
		// -----------------------------------------------
		
		own_2_1 = parseInt(total_lg - (places[3] * 2));
		own_2_2 = Math.round( own_2_1 - own_1_1 - places[1] - places[2] );
		
		if(own_2_2 < 0){
			own_2_2 = 0;
		}
		
		own_parts[2] = own_2_2;
	
		// -----------------------------------------------
		
		own_3_1 = parseInt( total_lg - (places[4] * 2) );
		own_3_2 = Math.round( own_3_1 - own_2_2 - own_1_1 - places[1] - places[2] - places[3] );
		
		if(own_3_2 < 0){
			own_3_2 = 0;
		}
		
		own_parts[3] = own_3_2;
		
		// -----------------------------------------------
		
		if(places[5] > 0 || places[4] > 0){
			own_4_1 = (total_lg - ( places[5] * 2 ));
			own_4_2 = Math.round( own_4_1 - own_3_2 - own_2_2 - own_1_1 - places[1] - places[2] - places[3] - places[4] );
			
			if(own_4_2 < 0){
				own_4_2 = 0;
			}
		}
		
		own_parts[4] = own_4_2;
		
		// -----------------------------------------------
		
		own_5_1 = Math.round( total_lg - own_4_2 - own_3_2 - own_2_2 - own_1_1 - places[1] - places[2] - places[3] - places[4] - places[5] );
		
		if(own_5_1 < 0){
			own_5_1 = 0;
		}
		
		own_parts[5] = own_5_1;

		// "externe" Berechnung
		if(external !== undefined){

		}


		ownpart_total += own_1_1;
		ownpart_total += own_2_2;
		ownpart_total += own_3_2;
		ownpart_total += own_4_2;
		ownpart_total += own_5_1;

		h.push('<table id="OwnPartTable" class="foe-table">');

		h.push('<thead>');

		h.push('<tr>');
		h.push('<th class="text-center" colspan="2">Mäzen Anteil: <strong>' + total_maezen + '</strong></th>');
		h.push('<th class="text-center" colspan="2">Eigenanteil: <strong class="success">' + ownpart_total + '</strong></th>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<th colspan="4" class="text-center">LG Gesamt-FP: ' + total_lg + '</strong></th>');
		h.push('</tr>');

		h.push('</thead>');
		h.push('<tbody>');

		h.push('<tr>');
		h.push('<td><strong>Reihenfolge</strong></td>');
		h.push('<td class="text-center"><strong>FP Einzahlen</strong></td>');
		h.push('<td class="text-center">BPs</td>');
		h.push('<td class="text-center">Meds</td>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<td>1. Eigenanteil</td>');

		if(own_parts[1] > 0){
			ot += parseInt(own_parts[1]);
		}

		h.push('<td class="text-center"><strong class="success">' + own_parts[1] + '</strong></td>');
		h.push('<td colspan="2"></td>');
		h.push('</tr>');


		h.push('<tr>');
		h.push('<td>Platz 1</td>');
		h.push('<td class="text-center"><strong>' + places[1] + '</strong>'+ (total_lg - places[1] < 0 ? ' <span class="error"> >50%</span>' : '') +'</td>');
		h.push('<td class="text-center">' + bps[1] + '</td>');
		h.push('<td class="text-center">' + meds[1] + '</td>');
		h.push('</tr>');


		h.push('<tr>');
		h.push('<td>Platz 2</td>');
		h.push('<td class="text-center"><strong>' + places[2] + '</strong></td>');
		h.push('<td class="text-center">' + bps[2] + '</td>');
		h.push('<td class="text-center">' + meds[2] + '</td>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<td>2. Eigenanteil</td>');
		if(own_parts[2] > 0){
			ot += parseInt(own_parts[2]);
		}
		h.push('<td class="text-center"><strong class="success">' + own_parts[2] + (own_parts[1] > 0 && own_parts[2] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
		h.push('<td colspan="2"></td>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<td>Platz 3</td>');
		h.push('<td class="text-center"><strong>' + places[3] + '</strong></td>');
		h.push('<td class="text-center">' + bps[3] + '</td>');
		h.push('<td class="text-center">' + meds[3] + '</td>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<td>3. Eigenanteil</td>');

		if(own_parts[3] > 0){
			ot += parseInt(own_parts[3]);
		}
		h.push('<td class="text-center"><strong class="success">' + own_parts[3] + (own_parts[2] > 0 && own_parts[3] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
		h.push('<td colspan="2"></td>');
		h.push('</tr>');


		h.push('<tr>');
		h.push('<td>Platz 4</td>');
		h.push('<td class="text-center"><strong>' + places[4] + '</strong></td>');
		h.push('<td class="text-center">' + bps[4] + '</td>');
		h.push('<td class="text-center">' + meds[4] + '</td>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<td>4. Eigenanteil</td>');
		if(own_parts[4] > 0){
			ot += parseInt(own_parts[4]);
		}
		h.push('<td class="text-center"><strong class="success">' + own_parts[4] + (own_parts[3] > 0 && own_parts[4] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
		h.push('<td colspan="2"></td>');
		h.push('</tr>');


		h.push('<tr>');
		h.push('<td>Platz 5</td>');
		h.push('<td class="text-center"><strong>' + places[5] + '</strong></td>');
		h.push('<td class="text-center">' + bps[5] + '</td>');
		h.push('<td class="text-center">' + meds[5] + '</td>');
		h.push('</tr>');

		if(own_parts[5] > 0){
			h.push('<tr>');
			h.push('<td>5. Eigenanteil</td>');

			ot += parseInt(own_parts[5]);

			h.push('<td class="text-center"><strong class="success">' + own_parts[5] + (own_parts[4] > 0 && own_parts[5] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
			h.push('<td colspan="4"></td>');
			h.push('</tr>');
		}

		h.push('<tbody>');
		h.push('</table>');

		/*
		h.push('<table id="OwnPartTable" class="foe-table">');

		h.push('<thead>');

		h.push('<tr>');
		h.push('<th class="text-center" colspan="3">Mäzen Anteil: <strong>' + total_maezen + '</strong></th>');
		h.push('<th class="text-center" colspan="3">Eigenanteil: <strong class="success">' + ownpart_total + '</strong></th>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<th colspan="6" class="text-center">LG Gesamt-FP: ' + total_lg + '</strong></th>');
		h.push('</tr>');

		h.push('</thead>');
		h.push('<tbody>');

		h.push('<tr>');
		h.push('<td><strong>Reihenfolge</strong></td>');
		h.push('<td class="text-center"><strong>FP Einzahlen</strong></td>');
		h.push('<td class="text-center">Extern</td>');
		h.push('<td class="text-center">BPs</td>');
		h.push('<td class="text-center">Meds</td>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<td>1. Eigenanteil</td>');

		if(own_parts[1] > 0){
			ot += parseInt(own_parts[1]);
		}

		h.push('<td class="text-center"><strong class="success">' + own_parts[1] + '</strong></td>');
		h.push('<td colspan="4"></td>');
		h.push('</tr>');


		h.push('<tr>');
		h.push('<td>Platz 1</td>');
		h.push('<td class="text-center"><strong>' + places[1] + '</strong>'+ (total_lg - places[1] < 0 ? ' <span class="error"> >50%</span>' : '') +'</td>');
		h.push('<td><input id="ext_1" type="number" value="' + (Parts.CurrentBuildingExternal[0] || 0) + '" class="own-part-external"></td>');
		h.push('<td class="text-center">' + bps[1] + '</td>');
		h.push('<td class="text-center">' + meds[1] + '</td>');
		h.push('<td></td>');
		h.push('</tr>');


		h.push('<tr>');
		h.push('<td>Platz 2</td>');
		h.push('<td class="text-center"><strong>' + places[2] + '</strong></td>');
		h.push('<td><input id="ext_2" type="number" value="0" class="own-part-external"></td>');
		h.push('<td class="text-center">' + bps[2] + '</td>');
		h.push('<td class="text-center">' + meds[2] + '</td>');
		h.push('<td></td>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<td>2. Eigenanteil</td>');
		if(own_parts[2] > 0){
			ot += parseInt(own_parts[2]);
		}
		h.push('<td class="text-center"><strong class="success">' + own_parts[2] + (own_parts[1] > 0 && own_parts[2] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
		h.push('<td colspan="4"></td>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<td>Platz 3</td>');
		h.push('<td class="text-center"><strong>' + places[3] + '</strong></td>');
		h.push('<td><input id="ext_3" type="number" value="0" class="own-part-external"></td>');
		h.push('<td class="text-center">' + bps[3] + '</td>');
		h.push('<td class="text-center">' + meds[3] + '</td>');
		h.push('<td></td>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<td>3. Eigenanteil</td>');

		if(own_parts[3] > 0){
			ot += parseInt(own_parts[3]);
		}
		h.push('<td class="text-center"><strong class="success">' + own_parts[3] + (own_parts[2] > 0 && own_parts[3] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
		h.push('<td colspan="4"></td>');
		h.push('</tr>');


		h.push('<tr>');
		h.push('<td>Platz 4</td>');
		h.push('<td class="text-center"><strong>' + places[4] + '</strong></td>');
		h.push('<td><input id="ext_4" type="number" value="0" class="own-part-external"></td>');
		h.push('<td class="text-center">' + bps[4] + '</td>');
		h.push('<td class="text-center">' + meds[4] + '</td>');
		h.push('<td></td>');
		h.push('</tr>');

		h.push('<tr>');
		h.push('<td>4. Eigenanteil</td>');

		if(own_parts[4] > 0){
			ot += parseInt(own_parts[4]);
		}
		h.push('<td class="text-center"><strong class="success">' + own_parts[4] + (own_parts[3] > 0 && own_parts[4] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
		h.push('<td colspan="4"></td>');
		h.push('</tr>');


		h.push('<tr>');
		h.push('<td>Platz 5</td>');
		h.push('<td class="text-center"><strong>' + places[5] + '</strong></td>');
		h.push('<td><input id="ext_4" type="number" value="0" class="own-part-external"></td></td>');
		h.push('<td class="text-center">' + bps[5] + '</td>');
		h.push('<td class="text-center">' + meds[5] + '</td>');
		h.push('<td></td>');
		h.push('</tr>');

		if(own_parts[5] > 0){
			h.push('<tr>');
			h.push('<td>5. Eigenanteil</td>');

			ot += parseInt(own_parts[5]);

			h.push('<td class="text-center"><strong class="success">' + own_parts[5] + (own_parts[4] > 0 && own_parts[5] > 0 ? ' <small>(=' + ot + ')</small>' : '') + '</strong></td>');
			h.push('<td colspan="4"></td>');
			h.push('</tr>');
		}

		h.push('<tbody>');
		h.push('</table>');
		*/

		$('#OwnPartBoxBody').html( h.join('') );

		Parts.BuildBackgroundBody(places);
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
