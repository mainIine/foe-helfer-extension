/*
 * **************************************************************************************
 *
 * Dateiname:                 part-calc.js
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

let Parts = {
	CityMapEntity: undefined,
	Rankings: undefined,
	IsPreviousLevel: false,

	CurrentBuildingID: false,
	CurrentBuildingStep: false,
    CurrentBuildingPercents: [90, 90, 90, 90, 90],
    Input: [],
	SaveCopy: [],
	PlayInfoSound: null,

	CurrentMaezens: [],
	RemainingOwnPart : null,

	PowerLevelingMaxLevel: 999999,

	/**
	 * HTML Box in den DOM drücken und ggf. Funktionen binden
	 */
	buildBox: ()=> {

		// Gibt es schon? Raus...
		if( $('#OwnPartBox').length > 0 ){
			HTML.CloseOpenBox('OwnPartBox');

			return;
		}

		let spk = localStorage.getItem('PartsTone');

		if (spk === null) {
			localStorage.setItem('PartsTone', 'deactivated');
			Parts.PlayInfoSound = false;
		}
		else {
			Parts.PlayInfoSound = (spk !== 'deactivated');
		}

		// prüfen ob es hinterlegte Werte gibt
		let perc = localStorage.getItem('CurrentBuildingPercentArray');

		// Array zurück holen
		if(perc !== null){
			Parts.CurrentBuildingPercents = JSON.parse(perc);
		}

		// Box in den DOM
		HTML.Box({
			'id': 'OwnPartBox',
			'title': i18n('Boxes.OwnpartCalculator.Title'),
			'ask': i18n('Boxes.OwnpartCalculator.HelpLink'),
			'auto_close': true,
			'dragdrop': true,
			'minimize': true,
			'speaker': 'PartsTone'
		});

		// CSS in den DOM prügeln
		HTML.AddCssFile('part-calc');

		// Body zusammen fummeln
		Parts.Show();

		// Für einen Platz wurde der Wert geändert, alle durchsteppen, übergeben und sichern
		$('#OwnPartBox').on('blur', '.arc-percent-input', function(){
			let aprc = [];

			$('.arc-percent-input').each(function () {
				let ArkBonus = parseFloat($(this).val());
				if (ArkBonus !== ArkBonus) ArkBonus = 0; //NaN => 0
				aprc.push(ArkBonus);
			});

			Parts.CurrentBuildingPercents = aprc;
            localStorage.setItem('CurrentBuildingPercentArray', JSON.stringify(aprc));

            Parts.collectExternals();
		});


		// Es wird ein externer Platz eingetragen
		$('#OwnPartBox').on('blur', '.ext-part-input', function(){
			Parts.collectExternals();
		});


		// eine neuer globaler Arche-Satz wird gewählt
		$('#OwnPartBox').on('click', '.btn-set-arc', function(){
			let ArkBonus = parseFloat($(this).data('value'));
			if (ArkBonus !== ArkBonus) ArkBonus = 0; //NaN => 0

			for(let i = 0; i < 5; i++)
			{
				Parts.CurrentBuildingPercents[i] = ArkBonus;
				$('.arc-percent-input').eq(i).val(ArkBonus);
			}

			localStorage.setItem('CurrentBuildingPercentArray', JSON.stringify(Parts.CurrentBuildingPercents));

			Parts.collectExternals();
		});

		$('#OwnPartBox').on('click', '#PartsTone', function () {

			let disabled = $(this).hasClass('deactivated');

			localStorage.setItem('PartsTone', (disabled ? '' : 'deactivated'));
			Parts.PlayInfoSound = !!disabled;

			if (disabled === true) {
				$('#PartsTone').removeClass('deactivated');
			} else {
				$('#PartsTone').addClass('deactivated');
			}
		});

		$('#OwnPartBox').on('click', '.button-powerleveling', function () {
			Parts.ShowPowerLeveling();
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
			Parts.Show(Parts.Input);
		} else {
			Parts.Show();
		}
	},


	/**
	 * Sichtbarer Teil
	 *
	 * @param input
	 */
	Show: (input)=> {

        let cityentity_id = Parts.CityMapEntity['cityentity_id'],
			Level = Parts.CityMapEntity['level'],
            arcs = [],
            FPRewards = [], // FP Maezenboni pro Platz (0 basiertes Array)
            MedalRewards = [], // Medaillen Maezenboni pro Platz (0 basiertes Array)
            BPRewards = [], // Blaupause Maezenboni pro Platz (0 basiertes Array)
            h = [],
            EigenStart = 0, // Bereits eingezahlter Eigenanteil (wird ausgelesen)
            Eigens = [], // Feld aller Eigeneinzahlungen pro Platz (0 basiertes Array)
            Dangers = [0, 0, 0, 0, 0], // Feld mit Dangerinformationen. Wenn > 0, dann die gefährdeten FP
            Maezens = [], // Feld aller Fremdeinzahlungen pro Platz (0 basiertes Array)
            LeveltLG = [false, false, false, false, false],
			Total = parseInt(Parts.CityMapEntity['state']['forge_points_for_level_up']), // Gesamt FP des aktuellen Levels
            MaezenTotal = 0, // Summe aller Fremdeinzahlungen
            EigenTotal, // Summe aller Eigenanteile
            ExtTotal = 0, // Summe aller Externen Einzahlungen
            EigenCounter = 0, // Eigenanteile Counter während Tabellenerstellung
            Rest = Total, // Verbleibende FP: Counter während Berechnung
            NonExts = [false, false, false, false, false]; // Wird auf true gesetz, wenn auf einem Platz noch eine (nicht externe) Zahlung einzuzahlen ist (wird in Spalte Einzahlen angezeigt)


        Parts.CurrentBuildingID = cityentity_id;
        if (Parts.IsPreviousLevel) {
            Total = 0;
            for (let i = 0; i < Parts.Rankings.length; i++) {
				let ToAdd = Parts.Rankings[i]['forge_points'];
                if (ToAdd !== undefined) Total += ToAdd;
            }
            Rest = Total;
        }

        if (Level === undefined) {
            Level = 0;
        }

        for (let i = 0; i < 5; i++) {
            arcs[i] = ((parseFloat(Parts.CurrentBuildingPercents[i]) + 100) / 100);
        }

        // Wenn in Rankings nichts mehr steht, dann abbrechen
		for (let i = 0; i < Parts.Rankings.length; i++) {
			if (Parts.Rankings[i]['rank'] === undefined || Parts.Rankings[i]['rank'] < 0) { //undefined => Eigentümer oder gelöscher Spieler P1-5, -1 => gelöschter Spieler ab P6 abwärts
				EigenStart = Parts.Rankings[i]['forge_points'];
                Rest -= EigenStart;
                continue;
            }

			let Place = Parts.Rankings[i]['rank'] - 1,
				MedalCount = 0;

			Maezens[Place] = Parts.Rankings[i]['forge_points'];
            if (Maezens[Place] === undefined) Maezens[Place] = 0;

			if (Place < 5) {
				if (Parts.Rankings[i]['reward'] !== undefined) {
					let FPCount = (Parts.Rankings[i]['reward']['strategy_point_amount'] !== undefined ? parseInt(Parts.Rankings[i]['reward']['strategy_point_amount']) : 0);
					FPRewards[Place] = Math.round(FPCount * arcs[Place]);
					if (FPRewards[Place] === undefined) FPRewards[Place] = 0;

					// Medallien berechnen
					MedalCount = (Parts.Rankings[i]['reward']['resources'] !== undefined ? parseInt(Parts.Rankings[i]['reward']['resources']['medals']) : 0);
					MedalRewards[Place] = Math.round(MedalCount * arcs[Place]);
					if (MedalRewards[Place] === undefined) MedalRewards[Place] = 0;

					// Blaupausen berechnen
					let BlueprintCount = (Parts.Rankings[i]['reward']['blueprints'] !== undefined ? parseInt(Parts.Rankings[i]['reward']['blueprints']) : 0);
					BPRewards[Place] = Math.round(BlueprintCount * arcs[Place]);
					if (BPRewards[Place] === undefined) BPRewards[Place] = 0;
				}
				else {
					FPRewards[Place] = 0;
					MedalRewards[Place] = 0;
					BPRewards[Place] = 0;
				}
            }
        }

        //Vorheriges Level und Platz nicht belegt => Wird nicht mitgesendet daher mit 0 füllen
        for (let i = Maezens.length; i < 5; i++) {
			Maezens[i] = 0;
			FPRewards[i] = 0;
			MedalRewards[i] = 0;
			BPRewards[i] = 0;
        }

        if (input !== undefined) {
            for (let i = 0; i < input.length; i++) {
                if (input[i] > 0) {
                    Maezens[Maezens.length] = input[i];
                }
            }
        }

        Maezens.sort(function (a, b) { return b - a });

        for (let i = 0; i < Maezens.length; i++) {
            if (Maezens[i] === 0) {
                Maezens.length = Math.max(i, 5);
                break;
            }

            ExtTotal += Maezens[i];
        }

        Rest -= ExtTotal;

        for (let i = 0; i < 5; i++) {
            if (FPRewards[i] <= Maezens[i] || Rest <= Maezens[i]) {
				Eigens[i] = Math.ceil(Rest + (Maezens[i + 1] !== undefined ? Maezens[i + 1] : 0) - Maezens[i]);
				Eigens[i] = Math.max(Eigens[i], 0);
				Rest -= Eigens[i];
                continue;
            }

            Eigens[i] = Math.ceil(Rest + Maezens[i] - 2 * FPRewards[i]);
            if (Eigens[i] < 0) {
                Dangers[i] = Math.floor(0 - Eigens[i]/2);
                Eigens[i] = 0;
            }

            for (let j = Maezens.length - 1; j >= i; j--) {
                if (Maezens[j] > 0) {
                    Maezens[j + 1] = Maezens[j];
                }
            }
            Maezens[i] = FPRewards[i];
            if (Maezens[i] >= Rest) {
                LeveltLG[i] = true;
                if (Dangers[i] > 0)
                    Dangers[i] -= Maezens[i] - Rest;
                Maezens[i] = Rest;
            }
            NonExts[i] = true;
            MaezenTotal += Maezens[i];
            Rest -= Eigens[i] + Maezens[i];
        }

        if(Rest>0) Eigens[5] = Rest;

        EigenTotal = EigenStart;
        for (let i = 0; i < Eigens.length; i++) {
            EigenTotal += Eigens[i];
        }

        for (let i = FPRewards.length; i < Maezens; i++)
            FPRewards[i] = 0;

        for (let i = MedalRewards.length; i < Maezens; i++)
            MedalRewards[i] = 0;

        for (let i = BPRewards.length; i < Maezens; i++)
			BPRewards[i] = 0;

		let PlayerName = undefined,
			PlayerID = Parts.CityMapEntity['player_id'];

		if (PlayerID !== ExtPlayerID) { //LG eines anderen Spielers
			PlayerName = PlayerDict[PlayerID]['PlayerName'];
		}

		for (let i = 0; i < 5; i++) {
			Parts.CurrentMaezens[i] = Maezens[i] | 0;
		}
		Parts.RemainingOwnPart = EigenTotal - EigenStart;
				
        // Info-Block
        h.push('<div class="dark-bg">');
        h.push('<table style="width: 100%"><tr><td style="width: 65%" class="text-center">');
		h.push('<h1 class="lg-info">' + MainParser.CityEntities[cityentity_id]['name'] + '</h1>');
		if(PlayerName) h.push('<strong>' + PlayerName + '</strong> - ');
		h.push((Parts.IsPreviousLevel ? i18n('Boxes.OwnpartCalculator.OldLevel') : i18n('Boxes.OwnpartCalculator.Step') + ' ' + Level + ' &rarr; ' + (parseInt(Level) + 1)) + '</p>');
        h.push('</td>');
        h.push('<td class="text-right">');

		// different arc bonus-buttons
		let investmentSteps = [80,85,90];

		investmentSteps.sort((a, b) => a - b);
		investmentSteps.forEach(bonus => {
			h.push(`<button class="btn btn-default btn-set-arc${( Parts.CurrentBuildingPercents[0] === bonus ? ' btn-default-active' : '')}" data-value="${bonus}">${bonus}%</button>`);
		});

        h.push('</td>');
        h.push('</tr></table>');

        h.push('<table style="margin-bottom: 3px; width: 100%">');

        h.push('<tr>');
		h.push('<td class="text-center" colspan="2" style="width: 50%">' + i18n('Boxes.OwnpartCalculator.PatronPart') + ': <strong class="' + (PlayerID === ExtPlayerID ? '' : 'success') + '">' + HTML.Format(MaezenTotal + ExtTotal) + '</strong></td>');
		h.push('<td class="text-center" colspan="2">' + i18n('Boxes.OwnpartCalculator.OwnPart') + ': <strong class="' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + HTML.Format(EigenTotal) + '</strong></td>');
		if (! Parts.IsPreviousLevel) {
			h.push('<td colspan="2" rowspan="2"><span class="btn-default button-powerleveling">' + i18n('Boxes.OwnpartCalculator.PowerLeveling') + '</span></td>')
		}
        h.push('</tr>');

        h.push('<tr>');
        if (EigenStart > 0) {
            h.push('<td colspan="2" class="text-center" style="width: 50%">' + i18n('Boxes.OwnpartCalculator.LGTotalFP') + ': <strong class="normal">' + HTML.Format(Total) + '</strong></td>');
			h.push('<td colspan="2" class="text-center">' + i18n('Boxes.OwnpartCalculator.OwnPartRemaining') + ': <strong class="' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + HTML.Format(EigenTotal - EigenStart) + '</strong></td>');
        }
        else {
            h.push('<td colspan="2" class="text-center">' + i18n('Boxes.OwnpartCalculator.LGTotalFP') + ': <strong class="normal">' + HTML.Format(Total) + '</strong></th>');
        }
        h.push('</tr>');

        h.push('</table>');
        h.push('</div>');

        h.push('<table id="OwnPartTable" class="foe-table">');
        h.push('<thead>');

        h.push('<tr>');
        h.push('<th>' + i18n('Boxes.OwnpartCalculator.Order') + '</th>');
        h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.Deposit') + '</th>');
        h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.Done') + '</th>');
		h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.BPs') + '</th>');
		h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.Meds') + '</th>');
		h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.Ext') + '</th>');
		h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.Arc') + '</th>');
        h.push('</tr>');
        h.push('</thead>');
        h.push('<tbody>');

        for (let i = 0; i < 5; i++) {
            EigenCounter += Eigens[i];
            if (i === 0 && EigenStart > 0) {
                EigenCounter += EigenStart;

                h.push('<tr>');
                h.push('<td>' + i18n('Boxes.OwnpartCalculator.OwnPart') + '</td>');
				h.push('<td class="text-center"><strong class="' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + (Eigens[i] > 0 ? HTML.Format(Eigens[i]) + ' <small>(=' + HTML.Format(Eigens[i] + EigenStart) + ')</small>' : '-') + '</strong></td>');
				h.push('<td class="text-center"><strong class="info">' + HTML.Format(EigenStart) + '</strong></td>');
                h.push('<td colspan="4"></td>');
                h.push('</tr>');
            }
            else {
                if (Eigens[i] > 0) {
                    h.push('<tr>');
                    h.push('<td>' + i18n('Boxes.OwnpartCalculator.OwnPart') + '</td>');
					h.push('<td class="text-center"><strong class="' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + HTML.Format(Eigens[i]) + (EigenCounter > Eigens[i] ? ' <small>(=' + HTML.Format(EigenCounter) + ')</small>' : '') + '</strong></td>');
                    h.push('<td colspan="5"></td>');
                    h.push('</tr>');
                }
            }

            h.push('<tr>');
            h.push('<td>' + i18n('Boxes.OwnpartCalculator.Place') + ' ' + (i+1) + '</td>');

            if (NonExts[i]) {
				h.push('<td class="text-center"><strong class="' + (PlayerID === ExtPlayerID ? '' : 'success') + '">' + (Maezens[i] > 0 ? HTML.Format(Maezens[i]) : '-') + '</strong >' + '</td>');
                if (LeveltLG[i]) {
                    h.push('<td class="text-center"><strong class="error">levelt</strong></td>');
                }
                else if (Dangers[i] > 5) {
					h.push('<td class="text-center"><strong class="error">danger (' + HTML.Format(Dangers[i]) + 'FP)</strong></td>');
                }
                else {
                    h.push('<td class="text-center"><strong class="info">-</strong></td>');
                }
            }
            else {
                h.push('<td class="text-center"><strong>-</strong></td>');
				let MaezenString = Maezens[i] > 0 ? HTML.Format(Maezens[i]) : '-';
                let MaezenDiff = Maezens[i] - FPRewards[i];
                let MaezenDiffString = '';
                if (Maezens[i] > 0) {
                    if (MaezenDiff > 0) {
						MaezenDiffString = ' <strong class="success"><small>(+' + HTML.Format(MaezenDiff) + ')</small></strong>';
                    }
                    else if (MaezenDiff < 0) {
						MaezenDiffString = ' <strong class="error"><small>(' + HTML.Format(MaezenDiff) + ')</small></strong>';
                    }
                }

                h.push('<td class="text-center"><strong class="info">' + MaezenString + '</strong>' + MaezenDiffString + '</td>');
            }

			h.push('<td class="text-center">' + HTML.Format(BPRewards[i]) + '</td>');
            h.push('<td class="text-center">' + HTML.Format(MedalRewards[i]) + '</td>');
            h.push('<td class="text-center"><input min="0" step="1" type="number" class="ext-part-input" value="' + (input !== undefined ? Parts.Input[i] : 0) + '"></td>');
            h.push('<td class="text-center"><input type="number" class="arc-percent-input" step="0.1" min="12" max="200" value="' + Parts.CurrentBuildingPercents[i] + '"></td>');

            h.push('</tr>');
        }

        let MaezenRest = 0;
        for (let i = 5; i < Maezens.length; i++) {
            MaezenRest += Maezens[i];
        }

        //Bestehende Einzahlungen, die aus den P5 raus geschoben wurden
        if (MaezenRest > 0) {
            h.push('<tr>');
            h.push('<td>' + i18n('Boxes.OwnpartCalculator.Place') + ' 6' + (Maezens.length > 6 ? ('-' + Maezens.length) : '') + '</td>');
            h.push('<td class="text-center">-</td>');
			h.push('<td class="text-center"><strong class="info">' + HTML.Format(MaezenRest) + '</strong></td>');
            h.push('<td colspan="4"></td>');
            h.push('</tr>');
        }

        //Restzahlung
        if (Eigens[5] > 0) {
            EigenCounter += Eigens[5];

            h.push('<tr>');
            h.push('<td>' + i18n('Boxes.OwnpartCalculator.OwnPart') + '</td>');
			h.push('<td class="text-center"><strong class="success">' + Eigens[5] + (EigenCounter > HTML.Format(Eigens[5]) ? ' <small>(=' + HTML.Format(EigenCounter) + ')</small>' : '') + '</strong></td>');
            h.push('<td colspan="5"></td>');
            h.push('</tr>');
        }

        h.push('<tbody>');
        h.push('</table>');

        Parts.BuildBackgroundBody(Maezens, Eigens, NonExts);

        // Wieviel fehlt noch bis zum leveln?
        if (Parts.IsPreviousLevel === false) {
			let rest = (Parts.CityMapEntity['state']['invested_forge_points'] === undefined ? Parts.CityMapEntity['state']['forge_points_for_level_up'] : Parts.CityMapEntity['state']['forge_points_for_level_up'] - Parts.CityMapEntity['state']['invested_forge_points']);
            h.push('<div class="text-center" style="margin-top:5px;margin-bottom:5px;"><em>' + i18n('Boxes.Calculator.Up2LevelUp') + ': <span id="up-to-level-up" style="color:#FFB539">' + HTML.Format(rest) + '</span> ' + i18n('Boxes.Calculator.FP') + '</em></div>');
        }

		h.push(Calculator.GetRecurringQuestsLine(Parts.PlayInfoSound));

		$('#OwnPartBoxBody').html( h.join('') );
	},


	/**
	 * Daten für die Kopierbuttons
	 *
	 * @param Maezens
	 * @param Eigens
	 * @param NonExts
	 */
	BuildBackgroundBody: (Maezens, Eigens, NonExts)=>{
		let b = [],
			PlayerName,
			s = localStorage.getItem('DropdownScheme'),
			bn = localStorage.getItem(Parts.CurrentBuildingID);

		if (Parts.CityMapEntity['player_id'] === ExtPlayerID) { //Eigenes LG
			let CopyName = localStorage.getItem(ExtPlayerID + '_PlayerCopyName');
			if (CopyName) {
				PlayerName = CopyName;
			}
			else {
				PlayerName = ExtPlayerName;
			}

		}
		else { //fremdes LG
			PlayerName = PlayerDict[Parts.CityMapEntity['player_id']]['PlayerName'];
        }

		b.push('<p><span class="header"><strong>' + i18n('Boxes.OwnpartCalculator.CopyValues') + '</strong></span></p>');

		b.push('<div><span>' + i18n('Boxes.OwnpartCalculator.PlayerName') + ':</span><input type="text" id="player-name" placeholder="' + i18n('Boxes.OwnpartCalculator.YourName') + '" value="' + PlayerName + '"></div>');
		b.push('<div><span>' + i18n('Boxes.OwnpartCalculator.BuildingName') + ':</span><input type="text" id="build-name" placeholder="' + i18n('Boxes.OwnpartCalculator.IndividualName') + '"  value="' + (bn !== null ? bn : MainParser.CityEntities[Parts.CurrentBuildingID]['name']) + '"></div>');

		let drp = '<div><span>' + i18n('Boxes.OwnpartCalculator.Scheme') + ':</span><select id="chain-scheme">' +
			'<option value="" disabled>-- ' + i18n('Boxes.OwnpartCalculator.OutputScheme') + ' --</option>' +
			'<option value="1"' + (s === '1' ? ' selected' : '') + '>Name LG P5 P4 P3 P2 P1</option>' +
			'<option value="2"' + (s === '2' ? ' selected' : '') + '>Name LG P1 P2 P3 P4 P5</option>' +
			'<option value="3"' + (s === '3' ? ' selected' : '') + '>Name LG P5/4/3/2/1</option>' +
			'<option value="4"' + (s === '4' ? ' selected' : '') + '>Name LG P1/2/3/4/5</option>' +
            '<option value="5"' + (s === '5' ? ' selected' : (s === null ? ' selected' : '')) + '>Name LG P5(FP) P4(FP) P3(FP) P2(FP) P1(FP)</option>' +
            '<option value="6"' + (s === '6' ? ' selected' : '' ) + '>Name LG P1(FP) P2(FP) P3(FP) P4(FP) P5(FP)</option>' +
            '</select></div>';

        b.push(drp);

        let cb = '<div class="checkboxes">' +
            '<label class="form-check-label game-cursor" for="chain-auto"><input type="checkbox" class="form-check-input" id="chain-auto" data-place="auto" checked> ' + i18n('Boxes.OwnpartCalculator.Auto') + '</label>' +

			'<label class="form-check-label game-cursor" for="chain-p1"><input type="checkbox" class="form-check-input chain-place" id="chain-p1" data-place="1"> ' + i18n('Boxes.OwnpartCalculator.Place') + ' 1</label>' +

			'<label class="form-check-label game-cursor" for="chain-p2"><input type="checkbox" class="form-check-input chain-place" id="chain-p2" data-place="2"> ' + i18n('Boxes.OwnpartCalculator.Place') + ' 2</label>' +

			'<label class="form-check-label game-cursor" for="chain-p3"><input type="checkbox" class="form-check-input chain-place" id="chain-p3" data-place="3"> ' + i18n('Boxes.OwnpartCalculator.Place') + ' 3</label>' +

			'<label class="form-check-label game-cursor" for="chain-p4"><input type="checkbox" class="form-check-input chain-place" id="chain-p4" data-place="4"> ' + i18n('Boxes.OwnpartCalculator.Place') + ' 4</label>' +

			'<label class="form-check-label game-cursor" for="chain-p5"><input type="checkbox" class="form-check-input chain-place" id="chain-p5" data-place="5"> ' + i18n('Boxes.OwnpartCalculator.Place') + ' 5</label>' +

			'<label class="form-check-label game-cursor" for="chain-all"><input type="checkbox" class="form-check-input chain-place" id="chain-all" data-place="all"> ' + i18n('Boxes.OwnpartCalculator.All') + '</label>' +

			'<label class="form-check-label game-cursor" for="chain-level"><input type="checkbox" class="form-check-input chain-place" id="chain-level" data-place="level"> ' + i18n('Boxes.OwnpartCalculator.Levels') + '</label>' +
			'</div>';

		b.push(cb);

		b.push('<div class="btn-outer text-center" style="margin-top: 10px">' +
				'<span class="btn-default button-own">' + i18n('Boxes.OwnpartCalculator.CopyValues') + '</span> ' +
				'<span class="btn-default button-save-own">' + i18n('Boxes.OwnpartCalculator.Note') + '</span>' +
			'</div>');

		// ---------------------------------------------------------------------------------------------
		$('#OwnPartBox').off("click",'.button-own');
		$('#OwnPartBox').on('click', '.button-own', function(){
			let copyParts = Parts.CopyFunction(Maezens, Eigens, NonExts, $(this), 'copy');
			helper.str.copyToClipboard(copyParts);
		});
		$('#OwnPartBox').off("click",'.button-save-own');
		$('#OwnPartBox').on('click', '.button-save-own', function(){
			Parts.CopyFunction(Maezens, Eigens, NonExts, $(this), 'save');
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

		$('#OwnPartBox').on('click', '.form-check-input', function(){
			let Name = $(this).data('place');

			if (Name === 'auto') { //auto: all und P1-5 deaktivieren, auto aktivieren
				$('#chain-auto').prop('checked', true);
				$('#chain-all').prop('checked', false);

				for (let i = 0; i < 5; i++) {
					$('#chain-p' + (i + 1)).prop('checked', false);
                }
			}
			else if (Name === 'all') { //all: auto und P1-5 deaktivieren, all aktivieren
				$('#chain-auto').prop('checked', false);
				$('#chain-all').prop('checked', true);

				for (let i = 0; i < 5; i++) {
					$('#chain-p' + (i + 1)).prop('checked', true);
				}
			}
			else if (Name === 'level') { 
				; //Do nothing
			}
			else { //P1-5: auto und all deaktivieren
				$('#chain-auto').prop('checked', false);
				$('#chain-all').prop('checked', false);
            }

			/*
			$('.form-check-input').prop('checked', false);

			$('.form-check-input').each(function(){
				let $this = $(this),
					val = $this.data('place');

				if( Number.isInteger(val) && val > 0 ){
					$this.prop('checked', true);
				}
			});
			*/
		});
	},


	/**
	 * Ausgeben oder Merken
	 *
	 * @param Maezens
	 * @param Eigens
	 * @param NonExts
	 * @param Event
	 * @param Action
	 * @returns {string}
	 */
	CopyFunction: (Maezens, Eigens, NonExts, Event, Action)=> {

		let pn = $('#player-name').val(),
			bn = $('#build-name').val(),
			cs = $('#chain-scheme').val();

		if (Parts.CityMapEntity['player_id'] === ExtPlayerID){
			localStorage.setItem(ExtPlayerID + '_PlayerCopyName', pn);
			localStorage.setItem(Parts.CurrentBuildingID, bn);
		}

		// Schema speichern
		localStorage.setItem('DropdownScheme', cs);

		$(Event).addClass('btn-green');

		// nach 1,75s den grünen Rahmen wieder ausblenden
		setTimeout(function(){
			$(Event).removeClass('btn-green');

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

		let PrintPlace = [false, false, false, false, false];
		let NoPlaceSafe = false;

		// automatisch ermitteln
		if ($('#chain-auto').prop('checked')) {
			NoPlaceSafe = true;

			for (let i = 0; i < 5; i++) {
				if (Eigens[i] > 0)
					break;
				if (NonExts[i]) {
					PrintPlace[i] = true;
					NoPlaceSafe = false;
				}
			}
		}
		else if ($('#chain-all').prop('checked')){
			for (let i = 0; i < 5; i++){
				PrintPlace[i] = true;
            }
        }
		// einzelne Plätze wurde angehakt
		else {
			for (let i = 0; i < 5; i++) {
				if ($('#chain-p' + (i+1)).prop('checked'))
					PrintPlace[i] = true;
			}
		}

		// Plätze formatieren
		if (!NoPlaceSafe) {
			if (sop[cs]['d'] === 'u') {
				for (let i = 0; i < 5; i++) {
					if (PrintPlace[i]) {
						let p = sol[cs].replace(/i/, (i + 1));
						p = p.replace(/fp/, Maezens[i]);
						parts.push(p);
					}
				}

			} else { //NoPlaceSafe
				for (let i = 5 - 1; i >= 0; i--) {
					if (PrintPlace[i]) {
						let p = sol[cs].replace(/i/, (i + 1));
						p = p.replace(/fp/, Maezens[i]);
						parts.push(p);
					}
				}
			}
		}
		else {
			parts.push(i18n('Boxes.OwnpartCalculator.NoPlaceSafe'));
		}

		if(Parts.SaveCopy.length > 0){
			for(let i = 0; i < Parts.SaveCopy.length; i++)
			{
				// prüfen ob dieses LG mit diesem Namen schon enthalten ist, löschen
				if(Parts.SaveCopy[i].indexOf(bn) > -1)
				{
					// raus löschen
					Parts.SaveCopy.splice(i, 1);
				}
			}
		}

		// wenn dieser Wert noch nicht im Array liegt...
		if(Parts.SaveCopy.includes(parts.join(' ')) === false){
			Parts.SaveCopy.push(parts.join(' '));
		}

		// Nur wenn "Kopieren" etwas ausgeben
		if(Action === 'copy')
		{
			let copy = Parts.SaveCopy.join('\n');

			// wieder leer machen
			Parts.SaveCopy = [];

			return copy;
		}
	},


	/**
	 * Lecker Animation für das Anzeigen der Kopieren Buttons
	 *
	 * @param show
	 */
	BackGroundBoxAnimation: (show)=> {
		let $box = $('#OwnPartBox');


		if(show === true){
			let e = /** @type {HTMLElement} */ (document.getElementsByClassName('OwnPartBoxBackgroundBody')[0]);
			e.style.height = 'auto';
			let h = e.offsetHeight;
			e.style.height = '0px';

			$('.OwnPartBoxBackgroundBody').animate({height: h, opacity: 1}, 250, function () {
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


	ShowPowerLeveling: () => {
		// Gibt es schon? Raus...
		if ($('#PowerLevelingBox').length > 0) {
			return;
		}

		Parts.BuildBoxPowerLeveling();
	},

	
	BuildBoxPowerLeveling: () => {
		// Box in den DOM
		HTML.Box({
			'id': 'PowerLevelingBox',
			'title': i18n('Boxes.PowerLeveling.Title'),
			'auto_close': true,
			'dragdrop': true,
			'minimize': true,
		});

		$('#PowerLevelingBox').on('blur', '#maxlevel', function () {
			Parts.PowerLevelingMaxLevel = parseFloat($('#maxlevel').val());
			Parts.CalcBodyPowerLeveling();
		});

		// Body zusammen fummeln
		Parts.CalcBodyPowerLeveling();
	},

	CalcBodyPowerLeveling: () => {
		let EntityID = Parts.CityMapEntity['cityentity_id'],
			CityEntity = MainParser.CityEntities[EntityID],
			EraName = GreatBuildings.GetEraName(EntityID),
			Era = Technologies.Eras[EraName],
			MinLevel = Parts.CityMapEntity['level'],
			MaxLevel = Math.min(Parts.PowerLevelingMaxLevel, GreatBuildings.Rewards[Era].length);

		let Totals = [],
			P1s = [],
			P2s = [],
			P3s = [],
			P4s = [],
			P5s = [],
			EigenBruttos = [],
			DoubleCollections = [],
			EigenNettos = [];

		let OwnPartSum = 0;

		for (let i = MinLevel; i < MaxLevel; i++) {
			if (i < 10) {
				Totals[i] = CityEntity['strategy_points_for_upgrade'][i];
			}
			else {
				Totals[i] = Math.ceil(CityEntity['strategy_points_for_upgrade'][9] * Math.pow(1.025, i - 9));
            }

			if (i > MinLevel) {
				P1s[i] = GreatBuildings.Rewards[Era][i];
				P2s[i] = 5 * Math.round(P1s[i] / 2 / 5);
				P3s[i] = 5 * Math.round(P2s[i] / 3 / 5);
				P4s[i] = 5 * Math.round(P3s[i] / 4 / 5);
				P5s[i] = 5 * Math.round(P4s[i] / 5 / 5);

				P1s[i] = Math.round(P1s[i] * (100 + Parts.CurrentBuildingPercents[0]) / 100);
				P2s[i] = Math.round(P2s[i] * (100 + Parts.CurrentBuildingPercents[1]) / 100);
				P3s[i] = Math.round(P3s[i] * (100 + Parts.CurrentBuildingPercents[2]) / 100);
				P4s[i] = Math.round(P4s[i] * (100 + Parts.CurrentBuildingPercents[3]) / 100);
				P5s[i] = Math.round(P5s[i] * (100 + Parts.CurrentBuildingPercents[4]) / 100);

				EigenBruttos[i] = Totals[i] - P1s[i] - P2s[i] - P3s[i] - P4s[i] - P5s[i];
			}
			else {
				P1s[i] = Parts.CurrentMaezens[0];
				P2s[i] = Parts.CurrentMaezens[1];
				P3s[i] = Parts.CurrentMaezens[2];
				P4s[i] = Parts.CurrentMaezens[3];
				P5s[i] = Parts.CurrentMaezens[4];

				EigenBruttos[i] = Parts.RemainingOwnPart;
            }
			
			let FPGreatBuilding = GreatBuildings.FPGreatBuildings.find(obj => (obj.ID === EntityID));
			if (FPGreatBuilding && EntityID !== 'X_FutureEra_Landmark1') { //FP produzierende LGs ohne Arche
				if (i < FPGreatBuilding.Productions.length) {
					DoubleCollections[i] = FPGreatBuilding.Productions[i];
				}
				else {
					DoubleCollections[i] = Math.round(FPGreatBuilding.Productions[9] * (i + 1) / 10);
                }
			}
			else {
				DoubleCollections[i] = 0;
			}

			EigenNettos[i] = EigenBruttos[i] - DoubleCollections[i];
			OwnPartSum += EigenNettos[i];
        }

		let h = [];

		h.push('<table>');

		h.push('<tr>');
		h.push('<td>' + i18n('Boxes.PowerLeveling.MaxLevel') + ':</td>');
		h.push('<td><input type="number" id="maxlevel" step="1" min=10" max="1000" value="' + MaxLevel + '""></td>');
		h.push('<td colspan="2" rowspan="2"><strong>' + CityEntity['name'] + '</strong></td>')
		h.push('</tr>');

		h.push('<tr>');
		h.push('<td>' + i18n('Boxes.PowerLeveling.OwnPartSum') + ':</td>');
		h.push('<td>' + HTML.Format(Math.round(OwnPartSum)) + '</td>')
		h.push('</tr>');
		h.push('</table>');


		h.push('<table class="foe-table">');

		h.push('<thead>');
		h.push('<tr>');
		h.push('<td><strong>' + i18n('Boxes.PowerLeveling.Level') + '</strong></td>');
		h.push('<td><strong>' + i18n('Boxes.PowerLeveling.P1') + '</strong></td>');
		h.push('<td><strong>' + i18n('Boxes.PowerLeveling.P2') + '</strong></td>');
		h.push('<td><strong>' + i18n('Boxes.PowerLeveling.P3') + '</strong></td>');
		h.push('<td><strong>' + i18n('Boxes.PowerLeveling.P4') + '</strong></td>');
		h.push('<td><strong>' + i18n('Boxes.PowerLeveling.P5') + '</strong></td>');
		h.push('<td><strong>' + i18n('Boxes.PowerLeveling.OwnPartBrutto') + '</strong></td>');
		h.push('<td><strong>' + i18n('Boxes.PowerLeveling.DoubleCollection') + '</strong></td>');
		h.push('<td><strong>' + i18n('Boxes.PowerLeveling.OwnPartNetto') + '</strong></td>');
		h.push('</tr>');
		h.push('</thead>');

		h.push('<tbody>');
        for (let i = MinLevel; i < MaxLevel; i++) {
			h.push('<tr>');
			h.push('<td style="white-space:nowrap">' + i + '&rarr;' + (i+1) + '</td>');
			h.push('<td>' + HTML.Format(P1s[i]) + '</td>');
			h.push('<td>' + HTML.Format(P2s[i]) + '</td>');
			h.push('<td>' + HTML.Format(P3s[i]) + '</td>');
			h.push('<td>' + HTML.Format(P4s[i]) + '</td>');
			h.push('<td>' + HTML.Format(P5s[i]) + '</td>');
			h.push('<td>' + HTML.Format(EigenBruttos[i]) + '</td>');
			h.push('<td>' + HTML.Format(Math.round(DoubleCollections[i])) + '</td>');
			h.push('<td><strong>' + HTML.Format(Math.round(EigenNettos[i])) + '</strong></td>');
			h.push('</tr>');
        }
		h.push('</tbody>');

		h.push('</table>');

		$('#PowerLevelingBoxBody').html(h.join(''));

    },
};


