/*
 * **************************************************************************************
 *
 * Dateiname:                 part-calc.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       04.11.19, 01:46 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let Parts = {

	CurrentBuildingID : false,
	CurrentBuildingStep : false,
    CurrentBuildingPercents: [90, 90, 90, 90, 90],
    Input: [],
    
	/**
	 * HTML Box in den DOM drücken und ggf. Funktionen binden
	 */
	buildBox: ()=> {

		// Gibt es schon? Raus...
		if( $('#OwnPartBox').length > 0 ){
			return;
		}

		let perc = localStorage.getItem('CurrentBuildingPercent0');
		if(perc !== null) Parts.CurrentBuildingPercents[0] = perc;

        perc = localStorage.getItem('CurrentBuildingPercent1');
        if (perc !== null) Parts.CurrentBuildingPercents[1] = perc;

        perc = localStorage.getItem('CurrentBuildingPercent2');
        if (perc !== null) Parts.CurrentBuildingPercents[2] = perc;

        perc = localStorage.getItem('CurrentBuildingPercent3');
        if (perc !== null) Parts.CurrentBuildingPercents[3] = perc;

        perc = localStorage.getItem('CurrentBuildingPercent4');
        if (perc !== null) Parts.CurrentBuildingPercents[4] = perc;

		// Box in den DOM
		HTML.Box({
			'id': 'OwnPartBox',
			'title': i18n['Boxes']['OwnpartCalculator']['Title'],
			'ask': i18n['Boxes']['OwnpartCalculator']['HelpLink'],
			'auto_close': true,
			'dragdrop': true,
			'minimize': true
		});

		// Body zusammen fummeln
		Parts.BoxBody();
        
		$('body').on('blur', '#arc-percent0', function(){
			let p = $(this).val();
			localStorage.setItem('CurrentBuildingPercent0', p);
            Parts.CurrentBuildingPercents[0] = p;

			Parts.collectExternals();
        });    

        $('body').on('blur', '#arc-percent1', function () {
            let p = $(this).val();
            localStorage.setItem('CurrentBuildingPercent1', p);
            Parts.CurrentBuildingPercents[1] = p;

            Parts.collectExternals();
        });  

        $('body').on('blur', '#arc-percent2', function () {
            let p = $(this).val();
            localStorage.setItem('CurrentBuildingPercent2', p);
            Parts.CurrentBuildingPercents[2] = p;

            Parts.collectExternals();
        });  

        $('body').on('blur', '#arc-percent3', function () {
            let p = $(this).val();
            localStorage.setItem('CurrentBuildingPercent3', p);
            Parts.CurrentBuildingPercents[3] = p;

            Parts.collectExternals();
        });  

        $('body').on('blur', '#arc-percent4', function () {
            let p = $(this).val();
            localStorage.setItem('CurrentBuildingPercent4', p);
            Parts.CurrentBuildingPercents[4] = p;

            Parts.collectExternals();
        });  

		// Es wird ein externer Platz eingetragen
		$('body').on('blur', '.ext-part-input', function(){
			Parts.collectExternals();
		});
	},


	/**
	 * Externe Plätze einsammeln und ggf. übergeben
	 */
	collectExternals: ()=> {
        $('.ext-part-input').each(function(i){

			let v = $(this).val();

            if (v === '') {
				$(this).val(0);
				v = 0;
			}
            
            Parts.Input[i] = parseInt(v);
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
            arcs = [],
            FPRewards = [], //FP Maezenboni pro Platz (0 basiertes Array)
            MedalRewards = [], //Medaillen Maezenboni pro Platz (0 basiertes Array)
            BPRewards = [], //Blaupause Maezenboni pro Platz (0 basiertes Array)
            h = [],
            EigenStart = 0 //Bereits eingezahlter Eigenanteil (wird ausgelesen)
            Eigens = [], //Feld aller Eigeneinzahlungen pro Platz (0 basiertes Array)
            Maezens = [], //Feld aller Fremdeinzahlungen pro Platz (0 basiertes Array)
            Total = parseInt(d['state']['forge_points_for_level_up']), //Gesamt FP des aktuellen Levels
            MaezenTotal = 0, //Summe aller Fremdeinzahlungen
            EigenTotal = 0, //Summe aller Eigenanteile
            ExtTotal = 0, //Summe aller Externen Einzahlungen
            EigenCounter = 0, //Eigenanteile Counter während Tabellenerstellung
            Rest = Total, //Verbleibende FP: Counter während Berechnung
            NonExts = [false, false, false, false, false],
            i=0;
			
        Parts.CurrentBuildingID = cityentity_id;

        for (i = 0; i < 5; i++) {
            arcs[i] = ((parseFloat(Parts.CurrentBuildingPercents[i]) + 100) / 100);
        }
        
        // Wenn in Rankings nichts mehr steht, dann abbrechen
        for (let x = 0; true; x++) {
            if (!rankings.hasOwnProperty(x)) break;

            if (rankings[x]['rank'] === undefined) {
                EigenStart = rankings[x]['forge_points'];
                Rest -= EigenStart;
                continue;
            }

            let Place = rankings[x]['rank'] - 1;

            Maezens[Place] = rankings[x]['forge_points'];
            if (Maezens[Place] === undefined) Maezens[Place] = 0;

            if (Place < 5) {
                let FPCount = (rankings[x]['reward']['strategy_point_amount'] !== undefined ? parseInt(rankings[x]['reward']['strategy_point_amount']) : 0);
                FPRewards[Place] = Math.round(FPCount * arcs[Place]);
                if (FPRewards[Place] === undefined) FPRewards[Place] = 0;

                // Medallien berechnen
                MedalCount = (rankings[x]['reward']['resources'] !== undefined ? parseInt(rankings[x]['reward']['resources']['medals']) : 0);
                MedalRewards[Place] = Math.ceil(MedalCount * arcs[Place]);
                if (MedalRewards[Place] === undefined) MedalRewards[Place] = 0;

                // Blaupausen berechnen
                let BlueprintCount = (rankings[x]['reward']['blueprints'] !== undefined ? parseInt(rankings[x]['reward']['blueprints']) : 0);
                BPRewards[Place] = Math.ceil(BlueprintCount * arcs[Place]);
                if (BPRewards[Place] === undefined) BPRewards[Place] = 0;
            }
        }

        if (input !== undefined) {
            for (let i = 0; i < input.length; i++) {
                if (input[i] > 0) {
                    Maezens[Maezens.length] = input[i];
                }
            }
        }
               
        Maezens.sort(function (a, b) { return b - a });

        for (i = 0; i < Maezens.length; i++) {
            if (Maezens[i] == 0) {
                Maezens.length = Math.max(i, 5);
                break;
            }
                        
            ExtTotal += Maezens[i];
        }

        Rest -= ExtTotal;
        
        i = 0;
        for (i = 0; i < 5; i++) {

            if (FPRewards[i] <= Maezens[i] || Rest <= Maezens[i]) {
                Eigens[i] = 0
                continue;
            }

            Eigens[i] = Math.max(Rest + Maezens[i] - 2 * FPRewards[i], 0);
            Eigens[i] = Math.ceil(Eigens[i]);
            for (let j = Maezens.length - 1; j >= i; j--) {
                if (Maezens[j] > 0) {
                    Maezens[j + 1] = Maezens[j];
                }
            }
            Maezens[i] = Math.min(FPRewards[i], Rest);
            NonExts[i] = true;
            MaezenTotal += Maezens[i];
            Rest -= Eigens[i] + Maezens[i];
        }

        if(Rest>0) Eigens[i] = Rest;
        
        EigenTotal = EigenStart;
        for (i = 0; i < Eigens.length; i++) {
            EigenTotal += Eigens[i];
        }      

        for (i = FPRewards.length; i < Maezens; i++)
            FPRewards[i] = 0;

        for (i = MedalRewards.length; i < Maezens; i++)
            MedalRewards[i] = 0;

        for (i = BPRewards.length; i < Maezens; i++)
            BPRewards[i] = 0;
        
        // Info-Block
        h.push('<table style="width: 100%"><tr><td style="width: 50%">');
        h.push('<p class="lg-info text-center"><strong>' + BuildingNamesi18n[cityentity_id]['name'] + ' </strong><br>' + i18n['Boxes']['OwnpartCalculator']['Step'] + ' ' + level + ' &rarr; ' + (parseInt(level) + 1) + '</p>');
        h.push('</td>');
        h.push('<td class="text-right">');
        h.push('</td>');
        h.push('</tr></table>');

        h.push('<table class="foe-table" style="margin-bottom: 10px;">');

        h.push('<thead>');

        h.push('<tr>');
        h.push('<th class="text-center" colspan="3" style="width: 50%">' + i18n['Boxes']['OwnpartCalculator']['PatronPart'] + ' <strong>' + MaezenTotal + (ExtTotal > 0 ? ' <strong class="info">+' + ExtTotal + '</strong>' : '') + '</strong></th>');
        h.push('<th class="text-center" colspan="3">' + i18n['Boxes']['OwnpartCalculator']['OwnPart'] + ': <strong class="success">' + EigenTotal + '</strong></th>');
        h.push('</tr>');

        h.push('<tr>');
        if (ExtTotal > 0) {
            h.push('<th colspan="3" class="text-center" style="width: 50%">' + i18n['Boxes']['OwnpartCalculator']['LGTotalFP'] + ': <strong class="normal">' + Total + '</strong></th>');
            h.push('<th colspan="3" class="text-center">' + i18n['Boxes']['OwnpartCalculator']['ExternalFP'] + ': <strong class="info">' + ExtTotal + '</strong></th>');
        }
        else {
            h.push('<th colspan="6" class="text-center">' + i18n['Boxes']['OwnpartCalculator']['LGTotalFP'] + ': <strong class="normal">' + Total + '</strong></th>');
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
        h.push('<td class="text-center">Arc</td>');
        h.push('</tr>');

        if (EigenStart > 0) {
            EigenCounter += EigenStart;

            h.push('<tr>');
            h.push('<td>' + i18n['Boxes']['OwnpartCalculator']['OwnPart'] + '</td>');
            h.push('<td class="text-center">-</td>');
            h.push('<td class="text-center"><strong class="success">' + EigenStart + '</strong></td>');
            h.push('<td colspan="4"></td>');
            h.push('</tr>');
        }

        for (i = 0; i < 5; i++) {
            if (Eigens[i] > 0) {
                EigenCounter += Eigens[i];

                h.push('<tr>');
                h.push('<td>' + i18n['Boxes']['OwnpartCalculator']['OwnPart'] + '</td>');
                h.push('<td class="text-center"><strong class="success">' + Eigens[i] + (EigenCounter > Eigens[i] ? ' <small>(=' + EigenCounter + ')</small>' : '') + '</strong></td>');
                h.push('<td colspan="5"></td>');
                h.push('</tr>');
            }

            h.push('<tr>');
            h.push('<td>' + i18n['Boxes']['OwnpartCalculator']['Place'] + ' ' + (i+1) + '</td>');

            if (NonExts[i]) {
                h.push('<td class="text-center"><strong>' + Maezens[i] + '</strong>' + '</td>');  //Todo: 50% Danger
                h.push('<td class="text-center">-</td>');
            }
            else {
                h.push('<td class="text-center">-</td>');
                h.push('<td class="text-center"><strong class="info">' + Maezens[i] + '</strong></td>');
            }

            h.push('<td class="text-center">' + BPRewards[i] + '</td>');
            h.push('<td class="text-center">' + MedalRewards[i] + '</td>');
            h.push('<td class="text-center"><input min="0" step="1" type="number" class="ext-part-input" value="' + (input !== undefined ? Parts.Input[i] : 0) + '"></td>');
            h.push('<td class="text-center"><input type="number" id="arc-percent' + i + '"step="0.1" min="12" max="200" value="' + Parts.CurrentBuildingPercents[i] + '"></td>');

            h.push('</tr>');
        }

        let MaezenRest = 0;
        for (i = 5; i < Maezens.length; i++) {
            MaezenRest += Maezens[i];
        }

        //Bestehende Einzahlungen, die aus den P5 raus geschoben wurden
        if (MaezenRest > 0) {
            h.push('<tr>');
            h.push('<td>' + i18n['Boxes']['OwnpartCalculator']['Place'] + ' 6' + (Maezens.length > 6 ? ('-' + Maezens.length) : '') + '</td>');
            h.push('<td class="text-center">-</td>');
            h.push('<td class="text-center"><strong class="info">' + MaezenRest + '</strong></td>');
            h.push('</tr>');
        }

        //Restzahlung
        if (Eigens[5] > 0) {
            EigenCounter += Eigens[5];

            h.push('<tr>');
            h.push('<td>' + i18n['Boxes']['OwnpartCalculator']['OwnPart'] + '</td>');
            h.push('<td class="text-center"><strong class="success">' + Eigens[5] + (EigenCounter > Eigens[5] ? ' <small>(=' + EigenCounter + ')</small>' : '') + '</strong></td>');
            h.push('<td colspan="4"></td>');
            h.push('</tr>');
        }
        
        h.push('<tbody>');
        h.push('</table>');

        Parts.BuildBackgroundBody(Maezens);

		$('#OwnPartBoxBody').html( h.join('') );
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
			s = localStorage.getItem(Parts.CurrentBuildingID + 'Scheme'),
			h = p,
			bn = localStorage.getItem(Parts.CurrentBuildingID);

		b.push('<p><span class="header"><strong>' + i18n['Boxes']['OwnpartCalculator']['CopyValues'] + '</strong></span></p>');

		b.push('<div><span>Spieler:</span><input type="text" id="player-name" placeholder="' + i18n['Boxes']['OwnpartCalculator']['YourName'] + '" value="' + (n !== null ? n : m) + '"></div>');
		b.push('<div><span>Gebäude:</span><input type="text" id="build-name" placeholder="' + i18n['Boxes']['OwnpartCalculator']['IndividualName'] + '"  value="' + (bn !== null ? bn : BuildingNamesi18n[ Parts.CurrentBuildingID ]['name']) + '"></div>');

		let drp = '<div><span>Schema:</span><select id="chain-scheme">' +
			'<option value="" disabled>-- ' + i18n['Boxes']['OwnpartCalculator']['OutputScheme'] + ' --</option>' +
			'<option value="1"' + (s === '1' ? ' selected' : '') + '>Name LG P5 P4 P3 P2 P1</option>' +
			'<option value="2"' + (s === '2' ? ' selected' : '') + '>Name LG P1 P2 P3 P4 P5</option>' +
			'<option value="3"' + (s === '3' ? ' selected' : '') + '>Name LG P5/4/3/2/1</option>' +
			'<option value="4"' + (s === '4' ? ' selected' : '') + '>Name LG P1/2/3/4/5</option>' +
			'<option value="5"' + (s === '5' ? ' selected' : (s === null ? ' selected' : '') ) + '>Name LG P5(FP) P4(FP) P3(FP) P2(FP) P1(FP)</option>' +
			'<option value="6"' + (s === '6' ? ' selected' : '') + '>Name LG P1(FP) P2(FP) P3(FP) P4(FP) P5(FP)</option>' +
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
					bn = $('#build-name').val(),
					cs = $('#chain-scheme').val();

				if(pn.length !=''){
					localStorage.setItem('PlayerCopyName', pn);
				}

				if(bn.length !=''){
					localStorage.setItem(Parts.CurrentBuildingID, bn);
				}

				// Schema speichern
				localStorage.setItem(Parts.CurrentBuildingID + 'Scheme', cs);

				$(trigger).addClass('border-success');

				// nach 4s den grünen Rahmen wieder ausblenden
				setTimeout(function(){
					$(trigger).removeClass('border-success');

					// wieder zuklappen
					Parts.BackGroundBoxAnimation(false);
				}, 1750);


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
				if(sop[cs]['d'] === 'u'){
					for(let i = 1; i < 6; i++){
						if( $('#chain-p'+i).prop('checked') ){
							let p = sol[cs].replace(/i/, i);
							p = p.replace(/fp/, h[ (i  -1) ]);
							parts.push(p);
						}
					}

				} else {
					for(let i = 5; i > 0; i--){
						if( $('#chain-p'+i).prop('checked') ){
							let p = sol[cs].replace(/i/, i);
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
