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
	IsNextLevel: false,

	LockExistingPlaces: true,
	TrustExistingPlaces: false,

	Level: undefined,
	SafePlaces: undefined,
	Maezens: [],

	CurrentBuildingID: false,
	CurrentBuildingPercents: [90, 90, 90, 90, 90],
	Exts: [0, 0, 0, 0, 0],
	SaveCopy: [],
	PlayInfoSound: null,

	CurrentMaezens: [],
	RemainingOwnPart: null,

	PowerLevelingMaxLevel: 999999,

	InjectionLoaded: false,

	DefaultButtons: [
		80, 85, 90, 'ark'
	],

	/**
	 * HTML Box in den DOM drücken und ggf. Funktionen binden
	 */
	buildBox: () => {

		// Gibt es schon? Raus...
		if ($('#OwnPartBox').length > 0) {
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
		if (perc !== null) {
			Parts.CurrentBuildingPercents = JSON.parse(perc);
		}

		// Box in den DOM
		HTML.Box({
			id: 'OwnPartBox',
			title: i18n('Boxes.OwnpartCalculator.Title'),
			ask: i18n('Boxes.OwnpartCalculator.HelpLink'),
			auto_close: true,
			dragdrop: true,
			minimize: true,
			speaker: 'PartsTone',
			settings: 'Parts.ShowCalculatorSettings()'
		});

		// CSS in den DOM prügeln
		HTML.AddCssFile('part-calc');

		// if building is open, socket information would send if some payed in
		if(Parts.InjectionLoaded === false)
		{
			FoEproxy.addWsHandler('CityMapService', 'updateEntity', data => {
				console.log('data[\'responseData\'][0]: ', data['responseData'][0]);
			});
			Parts.InjectionLoaded = true;
		}

		// Body zusammen fummeln
		Parts.Show();

		// Für einen Platz wurde der Wert geändert, alle durchsteppen, übergeben und sichern
		$('#OwnPartBox').on('blur', '.arc-percent-input', function () {
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
		$('#OwnPartBox').on('blur', '.ext-part-input', function () {
			Parts.collectExternals();
		});


		// eine neuer globaler Arche-Satz wird gewählt
		$('#OwnPartBox').on('click', '.btn-set-arc', function () {
			let ArkBonus = parseFloat($(this).data('value'));
			if (ArkBonus !== ArkBonus) ArkBonus = 0; //NaN => 0

			for (let i = 0; i < 5; i++) {
				Parts.CurrentBuildingPercents[i] = ArkBonus;
				$('.arc-percent-input').eq(i).val(ArkBonus);
			}

			localStorage.setItem('CurrentBuildingPercentArray', JSON.stringify(Parts.CurrentBuildingPercents));

			Parts.collectExternals();
		});

		// Next/Previous level
		$('#OwnPartBox').on('click', '.btn-set-level', function () {
			let Level = parseFloat($(this).data('value'));
			if (Level !== Level) Level = 0; //NaN => 0
			Parts.Show(Level);
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
			Parts.PowerLevelingMaxLevel = 999999;
			Parts.ShowPowerLeveling();
		});
	},


	/**
	 * Externe Plätze einsammeln und ggf. übergeben
	 */
	collectExternals: () => {
		$('.ext-part-input').each(function (i) {

			let v = $(this).val();

			if (v === '') {
				$(this).val(0);
				v = 0;
			}

			Parts.Exts[i] = parseInt(v);
		});

		Parts.Show(Parts.Level);
	},


	/**
	 * Sichtbarer Teil
	 *
	 */
	Show: (NextLevel) => {
		if (Parts.CityMapEntity['level'] === NextLevel) {		
			NextLevel = 0;
		}
		
		let cityentity_id = Parts.CityMapEntity['cityentity_id'];
		let CityEntity = MainParser.CityEntities[cityentity_id];
		let EraName = GreatBuildings.GetEraName(CityEntity['asset_id']);
		let Era = Technologies.Eras[EraName];

		let Total; // Gesamt FP des aktuellen Levels

		if (NextLevel) {		
			Parts.IsPreviousLevel = false;
			Parts.IsNextLevel = true;
			Parts.Level = NextLevel;
			Total = GreatBuildings.GetBruttoCosts(cityentity_id, NextLevel);
		}
		else {
			Parts.IsNextLevel = false;
			Parts.Level = Parts.CityMapEntity['level'];
			Total = parseInt(Parts.CityMapEntity['state']['forge_points_for_level_up']);
		}

		let arcs = [],
			FPRewards = [], // FP Maezenboni pro Platz (0 basiertes Array)
			MedalRewards = [], // Medaillen Maezenboni pro Platz (0 basiertes Array)
			BPRewards = [], // Blaupause Maezenboni pro Platz (0 basiertes Array)
			h = [],
			EigenStart = 0, // Bereits eingezahlter Eigenanteil (wird ausgelesen)
			Eigens = [], // Feld aller Eigeneinzahlungen pro Platz (0 basiertes Array)
			Dangers = [0, 0, 0, 0, 0], // Feld mit Dangerinformationen. Wenn > 0, dann die gefährdeten FP
			LeveltLG = [false, false, false, false, false],
			MaezenTotal = 0, // Summe aller Fremdeinzahlungen
			EigenTotal, // Summe aller Eigenanteile
			ExtTotal = 0, // Summe aller Externen Einzahlungen
			EigenCounter = 0, // Eigenanteile Counter während Tabellenerstellung
			Rest = Total, // Verbleibende FP: Counter während Berechnung
			NonExts = [false, false, false, false, false]; // Wird auf true gesetz, wenn auf einem Platz noch eine (nicht externe) Zahlung einzuzahlen ist (wird in Spalte Einzahlen angezeigt)

		Parts.Maezens = [];

		Parts.CurrentBuildingID = cityentity_id;
		if (Parts.IsPreviousLevel)
		{
			Total = 0;
			for (let i = 0; i < Parts.Rankings.length; i++)
			{
				let ToAdd = Parts.Rankings[i]['forge_points'];
				if (ToAdd !== undefined) Total += ToAdd;
			}
			Rest = Total;
		}

		if (Parts.Level === undefined) {
			Parts.Level = 0;
		}

		for (let i = 0; i < 5; i++)
		{
			arcs[i] = ((parseFloat(Parts.CurrentBuildingPercents[i]) + 100) / 100);
		}

		// Wenn in Rankings nichts mehr steht, dann abbrechen
		if (! Parts.IsNextLevel)
		{
			for (let i = 0; i < Parts.Rankings.length; i++)
			{
				if (Parts.Rankings[i]['rank'] === undefined || Parts.Rankings[i]['rank'] < 0) { //undefined => Eigentümer oder gelöscher Spieler P1-5, -1 => gelöschter Spieler ab P6 abwärts
					EigenStart = Parts.Rankings[i]['forge_points'];
					Rest -= EigenStart;
					continue;
				}

				let Place = Parts.Rankings[i]['rank'] - 1,
					MedalCount = 0;

				Parts.Maezens[Place] = Parts.Rankings[i]['forge_points'];
				if (Parts.Maezens[Place] === undefined) Parts.Maezens[Place] = 0;

				if (Place < 5)
				{
					if (Parts.Rankings[i]['reward'] !== undefined)
					{
						let FPCount = (Parts.Rankings[i]['reward']['strategy_point_amount'] !== undefined ? parseInt(Parts.Rankings[i]['reward']['strategy_point_amount']) : 0);
						FPRewards[Place] = MainParser.round(FPCount * arcs[Place]);
						if (FPRewards[Place] === undefined) FPRewards[Place] = 0;

						// Medallien berechnen
						MedalCount = (Parts.Rankings[i]['reward']['resources'] !== undefined ? parseInt(Parts.Rankings[i]['reward']['resources']['medals']) : 0);
						MedalRewards[Place] = MainParser.round(MedalCount * arcs[Place]);
						if (MedalRewards[Place] === undefined) MedalRewards[Place] = 0;

						// Blaupausen berechnen
						let BlueprintCount = (Parts.Rankings[i]['reward']['blueprints'] !== undefined ? parseInt(Parts.Rankings[i]['reward']['blueprints']) : 0);
						BPRewards[Place] = MainParser.round(BlueprintCount * arcs[Place]);
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
			for (let i = Parts.Maezens.length; i < 5; i++)
			{
				Parts.Maezens[i] = 0;
				FPRewards[i] = 0;
				MedalRewards[i] = 0;
				BPRewards[i] = 0;
			}
		}
		else {
			let P1 = GreatBuildings.Rewards[Era][Parts.Level];

			Parts.Maezens = [0, 0, 0, 0, 0];
			FPRewards = GreatBuildings.GetMaezen(P1, Parts.CurrentBuildingPercents)
			MedalRewards = [0, 0, 0, 0, 0];
			BPRewards = [0, 0, 0, 0, 0];
		}

		for (let i = 0; i < Parts.Exts.length; i++) {
			if (Parts.Exts[i] > 0) {
				Parts.Maezens[Parts.Maezens.length] = Parts.Exts[i];
            }
        }

		Parts.Maezens.sort(function (a, b) { return b - a });

		for (let i = 0; i < Parts.Maezens.length; i++) {
			if(Parts.Maezens[i] === 0) {
				Parts.Maezens.length = Math.max(i, 5);
                break;
            }

			ExtTotal += Parts.Maezens[i];
        }

        Rest -= ExtTotal;

        for (let i = 0; i < 5; i++)
        {
			if (FPRewards[i] <= Parts.Maezens[i] || Rest <= Parts.Maezens[i])
			{
				if (Parts.LockExistingPlaces) { //Bestehende Einzahlung absichern
					let NextMaezen = Parts.Maezens[i + 1] !== undefined ? Parts.Maezens[i + 1] : 0;
					Eigens[i] = Math.ceil(Rest + (Parts.TrustExistingPlaces ? 0 : NextMaezen) - Parts.Maezens[i]);
					Eigens[i] = Math.max(Eigens[i], 0);
					Rest -= Eigens[i];
				}
				else {
					Eigens[i] = 0;
                }
                continue;
            }

			Eigens[i] = Math.ceil(Rest + (Parts.TrustExistingPlaces ? 0 : Parts.Maezens[i]) - 2 * FPRewards[i]);
			if (Eigens[i] < 0) {
				if (Parts.TrustExistingPlaces) Eigens[i] = (Math.min(Eigens[i] + Parts.Maezens[i], 0));
                Dangers[i] = Math.floor(0 - Eigens[i]/2);
                Eigens[i] = 0;
            }

			for (let j = Parts.Maezens.length - 1; j >= i; j--) {
				if (Parts.Maezens[j] > 0) {
					Parts.Maezens[j + 1] = Parts.Maezens[j];
                }
            }
			Parts.Maezens[i] = FPRewards[i];
			if (Parts.Maezens[i] >= Rest) {
                LeveltLG[i] = true;
                if (Dangers[i] > 0)
					Dangers[i] -= Parts.Maezens[i] - Rest;
				Parts.Maezens[i] = Rest;
            }
            NonExts[i] = true;
			MaezenTotal += Parts.Maezens[i];
			Rest -= Eigens[i] + Parts.Maezens[i];
        }

        if(Rest>0) Eigens[5] = Rest;

        EigenTotal = EigenStart;
        for (let i = 0; i < Eigens.length; i++) {
            EigenTotal += Eigens[i];
        }

		for (let i = FPRewards.length; i < Parts.Maezens; i++)
            FPRewards[i] = 0;

		for (let i = MedalRewards.length; i < Parts.Maezens; i++)
            MedalRewards[i] = 0;

		for (let i = BPRewards.length; i < Parts.Maezens; i++)
			BPRewards[i] = 0;

		let PlayerName = undefined,
			PlayerID = Parts.CityMapEntity['player_id'];

		if (PlayerID !== ExtPlayerID) { //LG eines anderen Spielers
			PlayerName = PlayerDict[PlayerID]['PlayerName'];
		}

		for (let i = 0; i < 5; i++) {
			Parts.CurrentMaezens[i] = Parts.Maezens[i] | 0;
		}
		Parts.RemainingOwnPart = EigenTotal - EigenStart;

		Parts.SafePlaces = [];
		for (let i = 0; i < 5; i++) {
			if (Eigens[i] > 0) break;
				
			if (NonExts[i]) {
				Parts.SafePlaces.push(i);
			}
		}
				
        // Info-Block
        h.push('<div class="dark-bg">');
        h.push('<table style="width: 100%"><tr><td style="width: 65%" class="text-center">');
		h.push('<h1 class="lg-info">' + MainParser.CityEntities[cityentity_id]['name'] + '</h1>');

		if (PlayerName) h.push('<strong>' + PlayerName + '</strong> - ');

		if (Parts.IsPreviousLevel) {
			h.push(i18n('Boxes.OwnpartCalculator.OldLevel'));
		}
		else {
			if (Parts.IsNextLevel) {
				h.push('<button class="btn btn-default btn-set-level" data-value="' + (Parts.Level - 1) + '">&lt;</button> ');
			}
			h.push(i18n('Boxes.OwnpartCalculator.Step') + ' ' + Parts.Level + ' &rarr; ' + (parseInt(Parts.Level) + 1));
			if (GreatBuildings.Rewards[Era][Parts.Level + 1]) {
				h.push(' <button class="btn btn-default btn-set-level" data-value="' + (Parts.Level + 1) + '">&gt;</button>');
			}
			h.push('</p>');
		}
		

        h.push('</td>');
        h.push('<td class="text-right">');
        h.push('<span class="btn-group">');

		// different arc bonus-buttons
		let investmentSteps = [80, 85, 90, MainParser.ArkBonus],
			customButtons = localStorage.getItem('CustomPartCalcButtons');

		// custom buttons available
		if(customButtons)
		{
			investmentSteps = [];
			let bonuses = JSON.parse(customButtons);

			bonuses.forEach(bonus => {
				if(bonus === 'ark')
				{
					investmentSteps.push(MainParser.ArkBonus);
				}
				else {
					investmentSteps.push(bonus);
				}
			})
		}

		investmentSteps = investmentSteps.filter((item, index) => investmentSteps.indexOf(item) === index);
		investmentSteps.sort((a, b) => a - b);
		investmentSteps.forEach(bonus => {
			h.push(`<button class="btn btn-default btn-set-arc${( Parts.CurrentBuildingPercents[0] === bonus ? ' btn-default-active' : '')}" data-value="${bonus}">${bonus}%</button>`);
		});

        h.push('</span>');
        h.push('</td>');
        h.push('</tr></table>');

        h.push('<table style="margin-bottom: 3px; width: 100%">');

        h.push('<tr>');
		h.push('<td class="text-center" colspan="2" style="width: 50%">' + i18n('Boxes.OwnpartCalculator.PatronPart') + ': <strong class="' + (PlayerID === ExtPlayerID ? '' : 'success') + '">' + HTML.Format(MaezenTotal + ExtTotal) + '</strong></td>');
		h.push('<td class="text-center" colspan="2">' + i18n('Boxes.OwnpartCalculator.OwnPart') + ': <strong class="' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + HTML.Format(EigenTotal) + '</strong></td>');
        h.push('</tr>');

        h.push('<tr>');
        if (EigenStart > 0) {
            h.push('<td colspan="2" class="text-center" style="width: 50%">' + i18n('Boxes.OwnpartCalculator.LGTotalFP') + ': <strong>' + HTML.Format(Total) + '</strong></td>');
			h.push('<td colspan="2" class="text-center">' + i18n('Boxes.OwnpartCalculator.OwnPartRemaining') + ': <strong class="' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + HTML.Format(EigenTotal - EigenStart) + '</strong></td>');
        }
        else {
            h.push('<td colspan="2" class="text-center">' + i18n('Boxes.OwnpartCalculator.LGTotalFP') + ': <strong>' + HTML.Format(Total) + '</strong></th>');
        }
        h.push('</tr>');

        h.push('</table>');
        h.push('</div>');

        h.push('<table id="OwnPartTable" class="foe-table">');
        h.push('<thead>');

        h.push('<tr>');
        h.push('<th>' + i18n('Boxes.OwnpartCalculator.Order') + '</th>');
        h.push('<th class="text-center"><span class="forgepoints" title="' + i18n('Boxes.OwnpartCalculator.Deposit') + '"></th>');
        h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.Done') + '</th>');
		h.push('<th class="text-center"><span class="blueprint" title="' + i18n('Boxes.OwnpartCalculator.BPs') + '"></span></th>');
		h.push('<th class="text-center"><span class="medal" title="' + i18n('Boxes.OwnpartCalculator.Meds') + '"></span></th>');
		h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.Ext') + '</th>');
		h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.Arc') + '</th>');
        h.push('</tr>');
        h.push('</thead>');
        h.push('<tbody>');

        for (let i = 0; i < 5; i++)
        {
            EigenCounter += Eigens[i];
            if (i === 0 && EigenStart > 0)
            {
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

            if (NonExts[i])
            {
				h.push('<td class="text-center"><strong class="' + (PlayerID === ExtPlayerID ? '' : 'success') + '">' + (Parts.Maezens[i] > 0 ? HTML.Format(Parts.Maezens[i]) : '-') + '</strong >' + '</td>');
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
				let MaezenString = Parts.Maezens[i] > 0 ? HTML.Format(Parts.Maezens[i]) : '-';
				let MaezenDiff = Parts.Maezens[i] - FPRewards[i];
                let MaezenDiffString = '';
				if (Parts.Maezens[i] > 0) {
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
			h.push('<td class="text-center"><input min="0" step="1" type="number" class="ext-part-input" value="' + Parts.Exts[i] + '"></td>');
            h.push('<td class="text-center"><input type="number" class="arc-percent-input" step="0.1" min="12" max="200" value="' + Parts.CurrentBuildingPercents[i] + '"></td>');

            h.push('</tr>');
        }

        let MaezenRest = 0;
		for (let i = 5; i < Parts.Maezens.length; i++)
		{
			MaezenRest += Parts.Maezens[i];
        }

        //Bestehende Einzahlungen, die aus den P5 raus geschoben wurden
        if (MaezenRest > 0)
        {
            h.push('<tr>');
			h.push('<td>' + i18n('Boxes.OwnpartCalculator.Place') + ' 6' + (Parts.Maezens.length > 6 ? ('-' + Parts.Maezens.length) : '') + '</td>');
            h.push('<td class="text-center">-</td>');
			h.push('<td class="text-center"><strong class="info">' + HTML.Format(MaezenRest) + '</strong></td>');
            h.push('<td colspan="4"></td>');
            h.push('</tr>');
        }

        //Restzahlung
        if (Eigens[5] > 0)
        {
            EigenCounter += Eigens[5];

            h.push('<tr>');
            h.push('<td>' + i18n('Boxes.OwnpartCalculator.OwnPart') + '</td>');
			h.push('<td class="text-center"><strong class="' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + Eigens[5] + (EigenCounter > HTML.Format(Eigens[5]) ? ' <small>(=' + HTML.Format(EigenCounter) + ')</small>' : '') + '</strong></td>');
            h.push('<td colspan="5"></td>');
            h.push('</tr>');
        }

        h.push('</tbody>');
        h.push('</table>');

		Parts.BuildBackgroundBody(Parts.Maezens, Eigens, NonExts);

        // Wieviel fehlt noch bis zum leveln?
		if (Parts.IsPreviousLevel === false)
		{
			let rest;
			if (Parts.IsNextLevel) {
				rest = Total;
			}
			else {
				rest = Parts.CityMapEntity['state']['invested_forge_points'] === undefined ? Parts.CityMapEntity['state']['forge_points_for_level_up'] : Parts.CityMapEntity['state']['forge_points_for_level_up'] - Parts.CityMapEntity['state']['invested_forge_points'];
			}

            h.push('<div class="text-center dark-bg d-flex" style="padding:5px 0;">');
            h.push('<em style="width:70%">' + i18n('Boxes.Calculator.Up2LevelUp') + ': <span id="up-to-level-up">' + HTML.Format(rest) + '</span> ' + i18n('Boxes.Calculator.FP') + '</em>');

			h.push('<span class="btn-default button-powerleveling">' + i18n('Boxes.OwnpartCalculator.PowerLeveling') + '</span>');
			h.push('</div>');
        }

		h.push(Calculator.GetRecurringQuestsLine(Parts.PlayInfoSound));

		$('#OwnPartBoxBody').html(h.join(''));

		if ($('#PowerLevelingBox').length > 0 && !Parts.IsPreviousLevel) {
			Parts.CalcBodyPowerLeveling();
		}

		Parts.RefreshCopyString();
	},


	/**
	 * Daten für die Kopierbuttons
	 *
	 */
	BuildBackgroundBody: () => {
		let h = [],
			PlayerName,
			BuildingName = localStorage.getItem("OwnPartBuildingName" + Parts.CityMapEntity['cityentity_id']);

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

		h.push('<p><span class="header"><strong>' + i18n('Boxes.OwnpartCalculator.CopyValues') + '</strong></span></p>');

		h.push('<div><span>' + i18n('Boxes.OwnpartCalculator.PlayerName') + ':</span><input type="text" id="player-name" placeholder="' + i18n('Boxes.OwnpartCalculator.YourName') + '" value="' + PlayerName + '"></div>');
		h.push('<div><span>' + i18n('Boxes.OwnpartCalculator.BuildingName') + ':</span><input type="text" id="build-name" placeholder="' + i18n('Boxes.OwnpartCalculator.IndividualName') + '"  value="' + (BuildingName !== null ? BuildingName : MainParser.CityEntities[Parts.CurrentBuildingID]['name']) + '"></div>');

		h.push('<p><span class="header"><strong>' + i18n('Boxes.OwnpartCalculator.IncludeData') + '</strong></span></p>');

		let KeyPart2;
		if (Parts.CityMapEntity['player_id'] !== ExtPlayerID) {
			KeyPart2 = '';
		}
		else {
			KeyPart2 = Parts.CityMapEntity['cityentity_id'];
		}

		let Options = '<div class="checkboxes">' +
			'<label class="form-check-label game-cursor" for="options-player"><input type="checkbox" class="form-check-input" id="options-player" data-options="player" ' + (localStorage.getItem('OwnPartIncludePlayer' + KeyPart2) !== "false" ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsPlayer') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-gb"><input type="checkbox" class="form-check-input" id="options-gb" data-options="gb" ' + (localStorage.getItem('OwnPartIncludeGB' + KeyPart2) !== "false" ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsGB') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-level"><input type="checkbox" class="form-check-input" id="options-level" data-options="level" ' + (localStorage.getItem('OwnPartIncludeLevel' + KeyPart2) === "true" ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsLevel') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-fp"><input type="checkbox" class="form-check-input" id="options-fp" data-options="fp" ' + (localStorage.getItem('OwnPartIncludeFP' + KeyPart2) !== "false" ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsFP') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-descending"><input type="checkbox" class="form-check-input" id="options-descending" data-options="descending" ' + (localStorage.getItem('OwnPartDescending' + KeyPart2) !== "false" ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsDescending') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-levelup"><input type="checkbox" class="form-check-input" id="options-levelup" data-options="levelup"> <span>' + i18n('Boxes.OwnpartCalculator.OptionsLevelUp') + '</span></label>' +
			'</div>';

		h.push(Options)

		h.push('<p><span class="header"><strong>' + i18n('Boxes.OwnpartCalculator.Places') + '</strong></span></p>');

        let cb = '<div class="checkboxes">' +
			'<label class="form-check-label game-cursor" for="chain-p1"><input type="checkbox" class="form-check-input" id="chain-p1" data-place="1" ' + (Parts.IsNextLevel ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.Place') + ' 1</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-p2"><input type="checkbox" class="form-check-input" id="chain-p2" data-place="2" ' + (Parts.IsNextLevel ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.Place') + ' 2</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-p3"><input type="checkbox" class="form-check-input" id="chain-p3" data-place="3" ' + (Parts.IsNextLevel ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.Place') + ' 3</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-p4"><input type="checkbox" class="form-check-input" id="chain-p4" data-place="4" ' + (Parts.IsNextLevel ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.Place') + ' 4</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-p5"><input type="checkbox" class="form-check-input" id="chain-p5" data-place="5" ' + (Parts.IsNextLevel ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.Place') + ' 5</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-auto"><input type="checkbox" class="form-check-input" id="chain-auto" data-place="auto" ' + (Parts.IsNextLevel ? '' : 'checked') + '> <span>' + i18n('Boxes.OwnpartCalculator.Auto') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-all"><input type="checkbox" class="form-check-input" id="chain-all" data-place="all" ' + (Parts.IsNextLevel ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.All') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-all-withempty"><input type="checkbox" class="form-check-input" id="chain-all-withempty" data-place="all-withempty"> <span>' + i18n('Boxes.OwnpartCalculator.AllWithEmpty') + '</span></label>' +
		'</div>';

		h.push(cb);

		h.push('<p><span class="header"><strong>' + i18n('Boxes.OwnpartCalculator.Preview') + '</strong></span></p>');

		h.push('<input type="text" id="copystring" value="">');
		
		h.push('<div class="btn-outer text-center" style="margin-top: 10px">' +
				'<span class="btn-default button-own">' + i18n('Boxes.OwnpartCalculator.CopyValues') + '</span> ' +
				'<span class="btn-default button-save-own">' + i18n('Boxes.OwnpartCalculator.Note') + '</span>' +
			'</div>');

		// ---------------------------------------------------------------------------------------------
		$('#OwnPartBox').off("click",'.button-own');
		$('#OwnPartBox').on('click', '.button-own', function(){
			let copyParts = Parts.CopyFunction($(this), 'copy');
			helper.str.copyToClipboard(copyParts);
		});
		$('#OwnPartBox').off("click",'.button-save-own');
		$('#OwnPartBox').on('click', '.button-save-own', function(){
			Parts.CopyFunction($(this), 'save');
		});

		// Box wurde schon in den DOM gelegt?
		if( $('.OwnPartBoxBackground').length > 0 ){
			$('.OwnPartBoxBackgroundBody').html( h.join('') );

			// und raus...
			return;
		}

		// Container zusammen setzen
		let div = $('<div />').addClass('OwnPartBoxBackground'),
			a = $('<div />').addClass('outerArrow').append( $('<span />').addClass('arrow game-cursor') ).append( $('<div />').addClass('OwnPartBoxBackgroundBody window-box').append(h.join('')) );

		$('#OwnPartBox').append( div.append(a) );

		$('#OwnPartBox').append($('<div />').addClass('black-bg').hide());

		Parts.RefreshCopyString();

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
			let PlaceName = $(this).data('place');

			if (PlaceName) {
				if (PlaceName === 'auto') { //auto: all und P1-5 deaktivieren, auto aktivieren
					$('#chain-auto').prop('checked', true);
					$('#chain-all').prop('checked', false);
					$('#chain-all-withempty').prop('checked', false);

					for (let i = 0; i < 5; i++) {
						$('#chain-p' + (i + 1)).prop('checked', false);
					}
				}
				else if (PlaceName === 'all') { //all: auto und P1-5 deaktivieren, all aktivieren
					$('#chain-auto').prop('checked', false);
					$('#chain-all').prop('checked', true);
					$('#chain-all-withempty').prop('checked', false);

					for (let i = 0; i < 5; i++) {
						$('#chain-p' + (i + 1)).prop('checked', true);
					}
				}
				else if (PlaceName === 'all-withempty') { //all: auto und P1-5 deaktivieren, all aktivieren
						$('#chain-auto').prop('checked', false);
						$('#chain-all').prop('checked', false);
						$('#chain-all-withempty').prop('checked', true);

						for (let i = 0; i < 5; i++) {
							$('#chain-p' + (i + 1)).prop('checked', true);
						}
					}
				else { //P1-5: auto und all deaktivieren
					$('#chain-auto').prop('checked', false);
					$('#chain-all').prop('checked', false);
					$('#chain-all-withempty').prop('checked', false);
				}
			}

			let OptionsName = $(this).data('options');

			if (OptionsName) {
				let StoragePreamble = Parts.GetStoragePreamble();

				if (OptionsName === 'player') {
					localStorage.setItem('OwnPartIncludePlayer' + StoragePreamble, $('#options-player').prop('checked'));
				}
				else if (OptionsName === 'gb') {
					localStorage.setItem('OwnPartIncludeGB' + StoragePreamble, $('#options-gb').prop('checked'));
                }
				else if (OptionsName === 'level') {
					localStorage.setItem('OwnPartIncludeLevel' + StoragePreamble, $('#options-level').prop('checked'));
				}
				else if (OptionsName === 'fp') {
					localStorage.setItem('OwnPartIncludeFP' + StoragePreamble, $('#options-fp').prop('checked'));
				}
				else if (OptionsName === 'descending') {
					localStorage.setItem('OwnPartDescending' + StoragePreamble, $('#options-descending').prop('checked'));
				}
			}

			Parts.RefreshCopyString();
		});

		$('#OwnPartBox').on('blur', '#player-name', function () {
			let PlayerName = $('#player-name').val();

			localStorage.setItem(ExtPlayerID + '_PlayerCopyName', PlayerName);

			Parts.RefreshCopyString();
		});

		$('#OwnPartBox').on('blur', '#build-name', function () {
			let BuildingName = $('#build-name').val();

			localStorage.setItem("OwnPartBuildingName" + Parts.CityMapEntity['cityentity_id'], BuildingName);

			Parts.RefreshCopyString();
		});
	},


	/**
	 * Lecker Animation für das Anzeigen der Kopieren Buttons
	 *
	 * @param show
	 */
	BackGroundBoxAnimation: (show)=> {
		let $box = $('#OwnPartBox'),
			$boxBg = $('.OwnPartBoxBackgroundBody');

		if(show === true)
		{
			let e = /** @type {HTMLElement} */ (document.getElementsByClassName('OwnPartBoxBackgroundBody')[0]);

			e.style.height = 'auto';
			let h = e.offsetHeight;
			e.style.height = '0px';

			// center overlay to parent box
			let $boxWidth = $('#OwnPartBox').outerWidth() - 10,
				$bgBodyWidth = $boxBg.outerWidth();

			$boxBg.css({
				left: Math.round( ($boxWidth - $bgBodyWidth) / 2 )
			})

			// animation
			$boxBg.animate({height: h, opacity: 1}, 250, function () {
				$box.addClass('show');
				$box.find('.black-bg').show();
			});
		}

		else {
			$('.OwnPartBoxBackgroundBody').animate({height: 0, opacity: 0}, 250, function () {
				$box.removeClass('show');
				$box.find('.black-bg').hide();
			});
		}
	},


	GetStoragePreamble: () => {
		let Ret;
		if (Parts.CityMapEntity['player_id'] !== ExtPlayerID) {
			Ret = '';
		}
		else {
			Ret = Parts.CityMapEntity['cityentity_id'];
		}

		return Ret;
    },


	RefreshCopyString: () => {
		let PlayerName = $('#player-name').val(),
			BuildingName = $('#build-name').val();

		let IncludePlayerName = $('#options-player').prop('checked'),
			IncludeBuildingName = $('#options-gb').prop('checked'),
			IncludeLevel = $('#options-level').prop('checked'),
			IncludeFP = $('#options-fp').prop('checked'),
			Descending = $('#options-descending').prop('checked'),
			LevelUp = $('#options-levelup').prop('checked');

		let PlaceAuto = $('#chain-auto').prop('checked'),
			PlaceAll = $('#chain-all').prop('checked'),
			PlaceAllWithEmpty = $('#chain-all-withempty').prop('checked'),
			Ps = [
				$('#chain-p1').prop('checked'),
				$('#chain-p2').prop('checked'),
				$('#chain-p3').prop('checked'),
				$('#chain-p4').prop('checked'),
				$('#chain-p5').prop('checked')
			],
			Places = [];

		if (PlaceAuto) {
			for (let i = 0; i < Parts.SafePlaces.length; i++) {
				Places.push(Parts.SafePlaces[i]);
			}
		}
		else if (PlaceAll || PlaceAllWithEmpty) {
			for (let i = 0; i < 5; i++) {
				Places.push(i);
			}
		}
		else {
			for (let i = 0; i < 5; i++) {
				if (Ps[i]) Places.push(i);
            }
		}

		if (Descending) Places.reverse();

		let Ret = [];
		if (IncludePlayerName) Ret.push(PlayerName);

		if (IncludeBuildingName) Ret.push(BuildingName);

		if (LevelUp) Ret.push(i18n('Boxes.OwnpartCalculator.OptionsLevelUp'));

		if (IncludeLevel) Ret.push(Parts.Level + '->' + (Parts.Level + 1));

		if (Places.length > 0) {
			for (let i = 0; i < Places.length; i++) {
				let Place = Places[i];

				if(PlaceAll && Parts.Maezens[Place] === 0){
					continue;
				}

				if (IncludeFP) {
					Ret.push('P' + (Place + 1) + '(' + Parts.Maezens[Place] + ')');
				}
				else {
					Ret.push('P' + (Place + 1));
				}
			}
		}
		else if (PlaceAuto) {
			Ret.push(i18n('Boxes.OwnpartCalculator.NoPlaceSafe'));
        }

		let CopyString = Ret.join(' ');
		$('#copystring').val(CopyString);

		return CopyString;
    },


	/**
	 * Ausgeben oder Merken
	 *
	 * @param Event
	 * @param Action
	 * @returns {string}
	 */
	CopyFunction: (Event, Action) => {
		let CopyString = $('#copystring').val();
		
		$(Event).addClass('btn-green');

		// nach 1,75s den grünen Rahmen wieder ausblenden
		setTimeout(function(){
			$(Event).removeClass('btn-green');

			// wieder zuklappen
			Parts.BackGroundBoxAnimation(false);
		}, 1750);

		if(Parts.SaveCopy.length > 0){
			for(let i = 0; i < Parts.SaveCopy.length; i++)
			{
				// prüfen ob dieses LG mit diesem Namen schon enthalten ist, löschen
				if(Parts.SaveCopy[i].indexOf(CopyString) > -1)
				{
					// raus löschen
					Parts.SaveCopy.splice(i, 1);
				}
			}
		}

		// wenn dieser Wert noch nicht im Array liegt...
		if(Parts.SaveCopy.includes(CopyString) === false){
			Parts.SaveCopy.push(CopyString);
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


	ShowPowerLeveling: () => {
		Parts.BuildBoxPowerLeveling();
	},

	
	BuildBoxPowerLeveling: () => {
		// Gibt es schon? Raus...
		if ($('#PowerLevelingBox').length === 0) {
			// Box in den DOM
			HTML.Box({
				'id': 'PowerLevelingBox',
				'title': i18n('Boxes.PowerLeveling.Title'),
				'auto_close': true,
				'dragdrop': true,
				'minimize': true,
			});

			const box = $('#PowerLevelingBox');
			box.on('blur', '#maxlevel', function () {
				Parts.PowerLevelingMaxLevel = parseFloat($('#maxlevel').val());
				Parts.UpdateTableBodyPowerLeveling();
				//Parts.CalcBodyPowerLeveling();
			});
			box.on('keydown', '#maxlevel', function (e) {
				const key = e.key;
				const input = e.target;
				if (key === "ArrowUp") {
					Parts.PowerLevelingMaxLevel = Number.parseInt(input.value) + 1;
					Parts.UpdateTableBodyPowerLeveling();
					e.preventDefault();
				} else if (key === "ArrowDown") {
					Parts.PowerLevelingMaxLevel = Number.parseInt(input.value) - 1;
					Parts.UpdateTableBodyPowerLeveling();
					e.preventDefault();
				} else if (key === "Enter") {
					Parts.PowerLevelingMaxLevel = Number.parseInt(input.value);
					Parts.UpdateTableBodyPowerLeveling();
				}
			});
		}

		// Body zusammen fummeln
		Parts.CalcBodyPowerLeveling();
	},


	CalcBodyPowerLevelingData: () => {
		let EntityID = Parts.CityMapEntity['cityentity_id'],
			CityEntity = MainParser.CityEntities[EntityID],
			EraName = GreatBuildings.GetEraName(EntityID),
			Era = Technologies.Eras[EraName],
			MinLevel = Parts.Level,
			MaxLevel = Math.min(Parts.PowerLevelingMaxLevel, GreatBuildings.Rewards[Era].length);

		let Totals = [],
			Places = [],			
			EigenBruttos = [],
			HasDoubleCollection = false,
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
				Places[i] = GreatBuildings.GetMaezen(GreatBuildings.Rewards[Era][i], Parts.CurrentBuildingPercents)

				EigenBruttos[i] = Totals[i] - Places[i][0] - Places[i][1] - Places[i][2] - Places[i][3] - Places[i][4]
			}
			else {
				Places[i] = Parts.CurrentMaezens;
				
				EigenBruttos[i] = Parts.RemainingOwnPart;
            }
			
			let FPGreatBuilding = GreatBuildings.FPGreatBuildings.find(obj => (obj.ID === EntityID));
			if (FPGreatBuilding && EntityID !== 'X_FutureEra_Landmark1') { //FP produzierende LGs ohne Arche
				HasDoubleCollection = true;
				if (i < FPGreatBuilding.Productions.length) {
					DoubleCollections[i] = FPGreatBuilding.Productions[i];
				}
				else {
					DoubleCollections[i] = MainParser.round(FPGreatBuilding.Productions[9] * (i + 1) / 10);
                }
			}
			else {
				HasDoubleCollection = false;
				DoubleCollections[i] = 0;
			}

			EigenNettos[i] = EigenBruttos[i] - DoubleCollections[i];
			OwnPartSum += EigenNettos[i];
		}

		return {
			HasDoubleCollection,
			Places,
			CityEntity,
			OwnPartSum,
			MinLevel,
			MaxLevel,
			EigenBruttos,
			DoubleCollections,
			EigenNettos
		};
	},


	CalcTableBodyPowerLeveling: (h, data) => {
		const {
			HasDoubleCollection,
			Places,
			MinLevel,
			MaxLevel,
			EigenBruttos,
			DoubleCollections,
			EigenNettos
		} = data;

		for (let i = MinLevel; i < MaxLevel; i++) {
			h.push('<tr>');
			h.push('<td class="bright" style="white-space:nowrap">' + i + ' → ' + (i + 1) + '</td>');
			h.push('<td><span class="hidden-text"> - #1 (</span>' + HTML.Format(Places[i][0]) + '<span class="hidden-text">)</span></td>');
			h.push('<td class="text-light"><span class="hidden-text"> - #2 (</span>' + HTML.Format(Places[i][1]) + '<span class="hidden-text">)</span></td>');
			h.push('<td><span class="hidden-text"> - #3 (</span>' + HTML.Format(Places[i][2]) + '<span class="hidden-text">)</span></td>');
			h.push('<td class="text-light"><span class="hidden-text"> - #4 (</span>' + HTML.Format(Places[i][3]) + '<span class="hidden-text">)</span></td>');
			h.push('<td><span class="hidden-text"> - #5 (</span>' + HTML.Format(Places[i][4]) + '<span class="hidden-text">)</span></td>');
			if (HasDoubleCollection) {
				h.push('<td class="success no-select"><strong>' + HTML.Format(EigenBruttos[i]) + '</strong></td>');
				h.push('<td class="no-select">' + HTML.Format(MainParser.round(DoubleCollections[i])) + '</td>');
			}
			h.push('<td><strong class="info no-select">' + HTML.Format(MainParser.round(EigenNettos[i])) + '</strong></td>');
			h.push('</tr>');
        }
	},


	UpdateTableBodyPowerLeveling: () => {
		const tableBody = document.getElementById('PowerLevelingBoxTableBody');
		if (tableBody) {
			const data = Parts.CalcBodyPowerLevelingData();
			/** @type {string[]} */
			const h = [];
			
			Parts.CalcTableBodyPowerLeveling(h, data);

			tableBody.innerHTML = h.join('');

			const maxlevel = /** @type {HTMLInputElement} */(document.getElementById('maxlevel'));
			if (maxlevel.value != ''+data.MaxLevel) {
				maxlevel.value = ''+data.MaxLevel;
			}
			Parts.PowerLevelingMaxLevel = data.MaxLevel;

			const ownPartSum = /** @type {HTMLElement} */(document.getElementById('PowerLevelingBoxOwnPartSum'));
			ownPartSum.innerText = HTML.Format(MainParser.round(data.OwnPartSum));
		}

	},


	CalcBodyPowerLeveling: () => {
		const data = Parts.CalcBodyPowerLevelingData();

		const {
			HasDoubleCollection,
			CityEntity,
			OwnPartSum,
			MaxLevel,
		} = data;

		let h = [];

		h.push('<div class="dark-bg" style="margin-bottom:3px;padding: 5px;">');
		h.push('<h1 class="text-center">' + CityEntity['name'] + '</h1>')

		h.push('<div class="d-flex justify-content-center">');
		h.push('<div style="margin: 5px 10px 0 0;">' + i18n('Boxes.PowerLeveling.MaxLevel') + ': <input type="number" id="maxlevel" step="1" min=10" max="1000" value="' + MaxLevel + '""></div>');
		h.push('<div>' + i18n('Boxes.PowerLeveling.OwnPartSum') +': <strong class="info" id="PowerLevelingBoxOwnPartSum">'+ HTML.Format(MainParser.round(OwnPartSum)) + '</strong></div>')
		h.push('</div>');
		h.push('</div>');


		h.push('<table class="foe-table">');

		h.push('<thead>');
		h.push('<tr>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.Level') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P1') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P2') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P3') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P4') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P5') + '</th>');
		if (HasDoubleCollection) {
			h.push('<th>' + i18n('Boxes.PowerLeveling.OwnPartBrutto') + '</th>');
			h.push('<th>' + i18n('Boxes.PowerLeveling.DoubleCollection') + '</th>');
		}
		h.push('<th>' + i18n('Boxes.PowerLeveling.OwnPartNetto') + '</th>');
		h.push('</tr>');
		h.push('</thead>');

		h.push('<tbody id="PowerLevelingBoxTableBody">');
		Parts.CalcTableBodyPowerLeveling(h, data);
		h.push('</tbody>');

		h.push('</table>');

		$('#PowerLevelingBoxBody').html(h.join(''));

    },


	ShowCalculatorSettings: ()=> {
		let c = [],
			buttons,
			defaults = Parts.DefaultButtons,
			sB = localStorage.getItem('CustomPartCalcButtons'),
			nV = `<p class="new-row">${i18n('Boxes.Calculator.Settings.newValue')}: <input type="number" class="settings-values" style="width:30px"> <span class="btn btn-default btn-green" onclick="Parts.SettingsInsertNewRow()">+</span></p>`;


		if(sB)
		{
			// buttons = [...new Set([...defaults,...JSON.parse(sB)])];
			buttons = JSON.parse(sB);

			buttons = buttons.filter((item, index) => buttons.indexOf(item) === index); // remove duplicates
			buttons.sort((a, b) => a - b); // order
		}
		else {
			buttons = defaults;
		}


		buttons.forEach(bonus => {
			if(bonus === 'ark')
			{
				c.push(`<p class="text-center"><input type="hidden" class="settings-values" value="ark"> <button class="btn btn-default">${MainParser.ArkBonus}%</button></p>`);
			}
			else {
				c.push(`<p class="btn-group flex"><button class="btn btn-default">${bonus}%</button> <input type="hidden" class="settings-values" value="${bonus}"> <span class="btn btn-default btn-delete" onclick="Parts.SettingsRemoveRow(this)">x</span> </p>`);
			}
		});

		// new own button
		c.push(nV);

		// save button
		c.push(`<hr><p><button id="save-calculator-settings" class="btn btn-default" style="width:100%" onclick="Parts.SettingsSaveValues()">${i18n('Boxes.Calculator.Settings.Save')}</button></p>`);

		// insert into DOM
		$('#OwnPartBoxSettingsBox').html(c.join(''));
	},


	SettingsInsertNewRow: ()=> {
		let nV = `<p class="new-row">${i18n('Boxes.Calculator.Settings.newValue')}: <input type="number" class="settings-values" style="width:30px"> <span class="btn btn-default btn-green" onclick="Parts.SettingsInsertNewRow()">+</span></p>`;

		$(nV).insertAfter( $('.new-row:eq(-1)') );
	},


	SettingsRemoveRow: ($this)=> {
		$($this).closest('p').fadeToggle('fast', function(){
			$(this).remove();
		});
	},


	SettingsSaveValues: ()=> {

		let values = [];

		// get each visible value
		$('.settings-values').each(function(){
			let v = $(this).val().trim();

			if(v){
				if(v !== 'ark'){
					values.push( parseFloat(v) );
				} else {
					values.push(v);
				}
			}
		});

		// save new buttons
		localStorage.setItem('CustomPartCalcButtons', JSON.stringify(values));

		$(`#OwnPartBoxSettingsBox`).fadeToggle('fast', function(){
			$(this).remove();

			// reload box
			Parts.Show();
		});
	}
};


