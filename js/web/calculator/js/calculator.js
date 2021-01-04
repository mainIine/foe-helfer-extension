/*
 *
 * **************************************************************************************
 *
 * Dateiname:                 calculator.js
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

let Calculator = {

	ForderBonus: 90,
    SoundFile: new Audio(extUrl + 'vendor/sounds/message.mp3'),
    PlayerName: undefined,
    LastPlayerID: 0,
    PlayInfoSound: null,
	Rankings : undefined,
	CityMapEntity : undefined,
	LastRecurringQuests: undefined,


	/**
	 * Show calculator
	 *
	 * @param action
	 * @constructor
	 */
	Show: (action = '') => {
        // moment.js global setzen
        moment.locale(MainParser.Language);

        // close at the second click
		if ($('#costCalculator').length > 0 && action === 'menu') {
			HTML.CloseOpenBox('costCalculator');

			return;
		}

        // Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
        if ($('#costCalculator').length === 0) {
            let spk = localStorage.getItem('CalculatorTone');

            if (spk === null) {
                localStorage.setItem('CalculatorTone', 'deactivated');
                Calculator.PlayInfoSound = false;

            } else {
                Calculator.PlayInfoSound = (spk !== 'deactivated');
            }

            let ab = localStorage.getItem('CalculatorForderBonus');

            // alten Wert übernehmen, wenn vorhanden
            if (ab !== null) {
				Calculator.ForderBonus = parseFloat(ab);
			}

            HTML.Box({
				'id': 'costCalculator',
				'title': i18n('Boxes.Calculator.Title'),
				'ask': i18n('Boxes.Calculator.HelpLink'),
				'auto_close': true,
				'dragdrop': true,
				'minimize': true,
				'speaker': 'CalculatorTone'
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('calculator');

			Calculator.CurrentPlayer = parseInt(localStorage.getItem('current_player_id'));

			// schnell zwischen den Prozenten wechseln
			$('#costCalculator').on('click', '.btn-toggle-arc', function () {
				Calculator.ForderBonus = parseFloat($(this).data('value'));
				$('#costFactor').val(Calculator.ForderBonus);
				localStorage.setItem('CalculatorForderBonus', Calculator.ForderBonus);
				Calculator.Show();
			});

			// wenn der Wert des Archebonus verändert wird, Event feuern
			$('#costCalculator').on('blur', '#costFactor', function () {
				Calculator.ForderBonus = parseFloat($('#costFactor').val());
				localStorage.setItem('CalculatorForderBonus', Calculator.ForderBonus);
				Calculator.Show();
			});

			$('#costCalculator').on('click', '#CalculatorTone', function () {

				let disabled = $(this).hasClass('deactivated');

				localStorage.setItem('CalculatorTone', (disabled ? '' : 'deactivated'));
				Calculator.PlayInfoSound = !!disabled;

				if (disabled === true) {
					$('#CalculatorTone').removeClass('deactivated');
				} else {
					$('#CalculatorTone').addClass('deactivated');
				}
			});

        }

		let PlayerID = Calculator.CityMapEntity['player_id'],
            h = [];

        // Wenn sich Spieler geändert hat, dann BuildingName/PlayerName zurücksetzen
		if (Calculator.CityMapEntity['player_id'] !== Calculator.LastPlayerID) {
			Calculator.PlayerName = undefined;
			Calculator.ClanName = undefined;
		}

		if (Calculator.PlayerName === undefined && PlayerDict[Calculator.CityMapEntity['player_id']] !== undefined) {
			Calculator.PlayerName = PlayerDict[PlayerID]['PlayerName'];
		}
		if (PlayerDict[PlayerID] !== undefined && PlayerDict[PlayerID]['ClanName'] !== undefined) {
			Calculator.ClanName = PlayerDict[PlayerID]['ClanName'];
		}

        // BuildingName konnte nicht aus der BuildingInfo geladen werden
		let BuildingName = MainParser.CityEntities[Calculator.CityMapEntity['cityentity_id']]['name'];
		let Level = (Calculator.CityMapEntity['level'] !== undefined ? Calculator.CityMapEntity['level'] : 0);
		let MaxLevel = (Calculator.CityMapEntity['max_level'] !== undefined ? Calculator.CityMapEntity['max_level'] : 0);

        h.push('<div class="text-center dark-bg" style="padding:5px 0 3px;">');

        // LG - Daten + Spielername
		h.push('<p class="header"><strong><span class="building-name">' + BuildingName + '</span>');

		if (Calculator.PlayerName) {
			h.push('<span class="player-name">' + Calculator.PlayerName);

			if (Calculator.ClanName) {
				h.push(` [${Calculator.ClanName}]`);
			}

			h.push('</span>');
		}

        h.push('</strong><br>' + i18n('Boxes.Calculator.Step') + '' + Level + ' &rarr; ' + (Level + 1) + ' | ' + i18n('Boxes.Calculator.MaxLevel') + ': ' + MaxLevel + '</p>');

        // FP im Lager
        h.push('<p>' + i18n('Boxes.Calculator.AvailableFP') + ': <strong class="fp-storage">' + HTML.Format(StrategyPoints.AvailableFP) + '</strong></p>');

		h.push('</div>');

		h.push('<div class="dark-bg costFactorWrapper">');

		h.push(i18n('Boxes.Calculator.ArkBonus') + ': ' + MainParser.ArkBonus + '%<br>');

		h.push('<div class="btn-group">');
		// different arc bonus-buttons
		let investmentSteps = [80, 85, 90, MainParser.ArkBonus];
		investmentSteps = investmentSteps.filter((item, index) => investmentSteps.indexOf(item) === index); //Remove duplicates
		investmentSteps.sort((a, b) => a - b);
		investmentSteps.forEach(bonus => {
			h.push(`<button class="btn btn-default btn-toggle-arc ${(bonus === Calculator.ForderBonus ? 'btn-default-active' : '')}" data-value="${bonus}">${bonus}%</button>`);
		});
        h.push('</div><br>');
		
		h.push('<span><strong>' + i18n('Boxes.Calculator.FriendlyInvestment') + '</strong> ' + '<input type="number" id="costFactor" step="0.1" min="12" max="200" value="' + Calculator.ForderBonus + '">%</span>');

        h.push('</div>');

        // Tabelle zusammen fummeln
		h.push('<table style="width:100%"><tbody><tr>');
		h.push('<td><table id="costTableFordern" class="foe-table"></table></td>');
		h.push('<td><table id="costTableBPMeds" class="foe-table"></table></td>');
		h.push('</tr></tbody></table>');

        // Wieviel fehlt noch bis zum leveln?
		let rest = (Calculator.CityMapEntity['state']['invested_forge_points'] === undefined ? Calculator.CityMapEntity['state']['forge_points_for_level_up'] : Calculator.CityMapEntity['state']['forge_points_for_level_up'] - Calculator.CityMapEntity['state']['invested_forge_points']);

		h.push('<div class="text-center" style="margin-top:5px;margin-bottom:5px;"><em>' + i18n('Boxes.Calculator.Up2LevelUp') + ': <span id="up-to-level-up" style="color:#FFB539">' + HTML.Format(rest) + '</span> ' + i18n('Boxes.Calculator.FP') + '</em></div>');

		h.push(Calculator.GetRecurringQuestsLine(Calculator.PlayInfoSound));

        // in die bereits vorhandene Box drücken
        $('#costCalculator').find('#costCalculatorBody').html(h.join(''));
        $('#costCalculator').find('.tooltip').remove();

        // Stufe ist noch nicht freigeschaltet
		if (Calculator.CityMapEntity['level'] === Calculator.CityMapEntity['max_level']) {
            $('#costCalculator').find('#costCalculatorBody').append($('<div />').addClass('lg-not-possible').attr('data-text', i18n('Boxes.Calculator.LGNotOpen')));

		}

		// es fehlt eine Straßenanbindung
		else if (Calculator.CityMapEntity['connected'] === undefined) {
            $('#costCalculator').find('#costCalculatorBody').append($('<div />').addClass('lg-not-possible').attr('data-text', i18n('Boxes.Calculator.LGNotConnected')));
        }

        Calculator.CalcBody();
	},


	/**
	 * Zeile für Schleifenquests generieren
	 * *
	 * */
	GetRecurringQuestsLine: (PlaySound) => {
		let h = [],
			RecurringQuests = 0;

		// Schleifenquest für "Benutze FP" suchen
		for (let Quest of MainParser.Quests) {
			if (Quest.questGiver.id === 'scientist' && Quest.type === 'generic' && Quest.abortable === true) {
				for (let cond of Quest.successConditions) {
					let CurrentProgress = cond.currentProgress !== undefined ? cond.currentProgress : 0;
					let MaxProgress = cond.maxProgress;
					if ((CurrentEraID <= 3 && MaxProgress >= 3) || MaxProgress > 20) { // Unterscheidung Buyquests von UseQuests: Bronze/Eiszeit haben nur UseQuests, Rest hat Anzahl immer >15, Buyquests immer <=15
						let RecurringQuestString;
						if (MaxProgress - CurrentProgress !== 0) {
							RecurringQuestString = HTML.Format(MaxProgress - CurrentProgress) + i18n('Boxes.Calculator.FP');
							RecurringQuests += 1;
						}
						else {
							RecurringQuestString = i18n('Boxes.Calculator.Done');
						}

						h.push('<div class="text-center" style="margin-top:5px;margin-bottom:5px;"><em>' + i18n('Boxes.Calculator.ActiveRecurringQuest') + ' <span id="recurringquests" style="color:#FFB539">' + RecurringQuestString + '</span></em></div>');
					}
				}
			}
		}

		if (Calculator.LastRecurringQuests !== undefined && RecurringQuests !== Calculator.LastRecurringQuests) { //Schleifenquest gestartet oder abgeschlossen
			if (PlaySound) { //Nicht durch Funktion PlaySound ersetzen!!! GetRecurringQuestLine wird auch vom EARechner aufgerufen.
				Calculator.SoundFile.play();
			}
        }

		Calculator.LastRecurringQuests = RecurringQuests;

		return h.join('');
	},


	/**
	 * Der Tabellen-Körper mit allen Funktionen
	 *
	 */
	CalcBody: ()=> {
		let hFordern = [],
			hBPMeds = [],
			BestKurs = 999999,
			arc = 1 + (MainParser.ArkBonus / 100),
			ForderArc = 1 + (Calculator.ForderBonus / 100);

        let EigenPos,
            EigenBetrag = 0;

        // Ränge durchsteppen, Suche nach Eigeneinzahlung
		for (let i = 0; i < Calculator.Rankings.length;i++) {
			if (Calculator.Rankings[i]['player']['player_id'] !== undefined && Calculator.Rankings[i]['player']['player_id'] === ExtPlayerID) {
                EigenPos = i;
				EigenBetrag = (isNaN(parseInt(Calculator.Rankings[i]['forge_points']))) ? 0 : parseInt(Calculator.Rankings[i]['forge_points']);
                break;
            }
		}

		let ForderStates = [],
			SaveStates = [],
			FPNettoRewards = [],
			FPRewards = [],
			BPRewards = [],
			MedalRewards = [],
			ForderFPRewards = [],
			ForderRankCosts = [],
			SaveRankCosts = [],
			Einzahlungen = [],
			BestGewinn = -999999,
			SaveLastRankCost = undefined;

		for (let i = 0; i < Calculator.Rankings.length; i++) {
			let Rank,
				CurrentFP,
				TotalFP,
				RestFP,
				IsSelf = false;

			if (Calculator.Rankings[i]['rank'] === undefined || Calculator.Rankings[i]['rank'] === -1) {
				continue;
			}
			else {
				Rank = Calculator.Rankings[i]['rank'] - 1;
			}

			if (Calculator.Rankings[i]['reward'] === undefined) break; // Ende der Belohnungsränge => raus

			ForderStates[Rank] = undefined; // NotPossible / WorseProfit / Self / NegativeProfit / LevelWarning / Profit
			SaveStates[Rank] = undefined; // NotPossible / WorseProfit / Self / NegativeProfit / LevelWarning / Profit
			FPNettoRewards[Rank] = 0;
			FPRewards[Rank] = 0;
			BPRewards[Rank] = 0;
			MedalRewards[Rank] = 0;
			ForderFPRewards[Rank] = 0;
			ForderRankCosts[Rank] = undefined;
			SaveRankCosts[Rank] = undefined;
			Einzahlungen[Rank] = 0;

			if (Calculator.Rankings[i]['reward']['strategy_point_amount'] !== undefined)
				FPNettoRewards[Rank] = MainParser.round(Calculator.Rankings[i]['reward']['strategy_point_amount']);

			if (Calculator.Rankings[i]['reward']['blueprints'] !== undefined)
				BPRewards[Rank] = MainParser.round(Calculator.Rankings[i]['reward']['blueprints']);

			if (Calculator.Rankings[i]['reward']['resources']['medals'] !== undefined)
				MedalRewards[Rank] = MainParser.round(Calculator.Rankings[i]['reward']['resources']['medals']);

			FPRewards[Rank] = MainParser.round(FPNettoRewards[Rank] * arc);
			BPRewards[Rank] = MainParser.round(BPRewards[Rank] * arc);
			MedalRewards[Rank] = MainParser.round(MedalRewards[Rank] * arc);
			ForderFPRewards[Rank] = MainParser.round(FPNettoRewards[Rank] * ForderArc);

			if (EigenPos !== undefined && i > EigenPos) {
				ForderStates[Rank] = 'NotPossible';
				SaveStates[Rank] = 'NotPossible';
				continue;
			}

			if (Calculator.Rankings[i]['player']['player_id'] !== undefined && Calculator.Rankings[i]['player']['player_id'] === ExtPlayerID)
				IsSelf = true;

			if (Calculator.Rankings[i]['forge_points'] !== undefined)
				Einzahlungen[Rank] = Calculator.Rankings[i]['forge_points'];

			CurrentFP = (Calculator.CityMapEntity['state']['invested_forge_points'] !== undefined ? Calculator.CityMapEntity['state']['invested_forge_points'] : 0) - EigenBetrag;
			TotalFP = Calculator.CityMapEntity['state']['forge_points_for_level_up'];
			RestFP = TotalFP - CurrentFP;

			if (IsSelf) {
				ForderStates[Rank] = 'Self';
				SaveStates[Rank] = 'Self';

				for (let j = i + 1; j < Calculator.Rankings.length; j++) {
					//Spieler selbst oder Spieler gelöscht => nächsten Rang überprüfen
					if (Calculator.Rankings[j]['rank'] !== undefined && Calculator.Rankings[j]['rank'] !== -1 && Calculator.Rankings[j]['forge_points'] !== undefined) {
						SaveRankCosts[Rank] = MainParser.round((Calculator.Rankings[j]['forge_points'] + RestFP) / 2);
						break;
					}
				}

				if (SaveRankCosts[Rank] === undefined)
					SaveRankCosts[Rank] = MainParser.round(RestFP / 2); // Keine Einzahlung gefunden => Rest / 2

				ForderRankCosts[Rank] = Math.max(ForderFPRewards[Rank], SaveRankCosts[Rank]);
			}
			else {
				SaveRankCosts[Rank] = MainParser.round((Einzahlungen[Rank] + RestFP) / 2);
				ForderRankCosts[Rank] = Math.max(ForderFPRewards[Rank], SaveRankCosts[Rank]);
				ForderRankCosts[Rank] = Math.min(ForderRankCosts[Rank], RestFP);

				let ExitLoop = false;

				// Platz schon vergeben
				if (SaveRankCosts[Rank] <= Einzahlungen[Rank]) {
					ForderRankCosts[Rank] = 0;
					ForderStates[Rank] = 'NotPossible';
					ExitLoop = true;
				}
				else {
					if (ForderRankCosts[Rank] === RestFP) {
						ForderStates[Rank] = 'LevelWarning';
					}
					else if (ForderRankCosts[Rank] <= ForderFPRewards[Rank]) {
						ForderStates[Rank] = 'Profit';
					}
					else {
						ForderStates[Rank] = 'NegativeProfit';
					}
				}

				// Platz schon vergeben
				if (SaveRankCosts[Rank] <= Einzahlungen[Rank]) {
					SaveRankCosts[Rank] = 0;
					SaveStates[Rank] = 'NotPossible';
					ExitLoop = true;
				}
				else {
					if (SaveRankCosts[Rank] === RestFP) {
						SaveStates[Rank] = 'LevelWarning';
					}
					else if (FPRewards[Rank] < SaveRankCosts[Rank]) {
						SaveStates[Rank] = 'NegativeProfit';
					}
					else {
						SaveStates[Rank] = 'Profit';
					}
				}

				if (ExitLoop)
					continue;

				// Selbe Kosten wie vorheriger Rang => nicht belegbar
				if (SaveLastRankCost !== undefined && SaveRankCosts[Rank] === SaveLastRankCost) {
					ForderStates[Rank] = 'NotPossible';
					ForderRankCosts[Rank] = undefined;
					SaveStates[Rank] = 'NotPossible';
					SaveRankCosts[Rank] = undefined;
					ExitLoop = true;
				}
				else {
					SaveLastRankCost = SaveRankCosts[Rank];
				}

				if (ExitLoop)
					continue;

				let CurrentGewinn = FPRewards[Rank] - SaveRankCosts[Rank];
				if (CurrentGewinn > BestGewinn) {
					if (SaveStates[Rank] !== 'LevelWarning')
						BestGewinn = CurrentGewinn;
				}
				else {
					SaveStates[Rank] = 'WorseProfit';
					ForderStates[Rank] = 'WorseProfit';
				}
			}
		}

		// Tabellen ausgeben
		hFordern.push('<thead>' +
			'<th>#</th>' +
			'<th>' + i18n('Boxes.Calculator.Commitment') + '</th>' +
			'<th>' + i18n('Boxes.Calculator.Profit') + '</th>' +
			'</thead>');

		hBPMeds.push('<thead>' +
			'<th>' + i18n('Boxes.Calculator.BPs') + '</th>' +
			'<th>' + i18n('Boxes.Calculator.Meds') + '</th>' +
			'</thead>');

		for (let Rank = 0; Rank < ForderRankCosts.length; Rank++) {
			let ForderCosts = (ForderStates[Rank] === 'Self' ? Einzahlungen[Rank] : ForderFPRewards[Rank]),
				SaveCosts = (SaveStates[Rank] === 'Self' ? Einzahlungen[Rank] : SaveRankCosts[Rank]);

			let ForderGewinn = FPRewards[Rank] - ForderCosts,
				ForderRankDiff = (ForderRankCosts[Rank] !== undefined ? ForderRankCosts[Rank] - ForderFPRewards[Rank] : 0),
				SaveGewinn = FPRewards[Rank] - SaveCosts,
				Kurs = (FPNettoRewards[Rank] > 0 ? MainParser.round(SaveCosts / FPNettoRewards[Rank] * 1000)/10 : 0);

			if (SaveStates[Rank] !== 'Self' && Kurs > 0) {
				if (Kurs < BestKurs) {
					BestKurs = Kurs;
					BestKursNettoFP = FPNettoRewards[Rank];
					BestKursEinsatz = SaveRankCosts[Rank];
				}
			}


			// Fördern

			let RowClass,
				RankClass,
				RankText = Rank + 1, //Default: Rangnummer
				RankTooltip = [],

				EinsatzClass = (ForderFPRewards[Rank] - EigenBetrag > StrategyPoints.AvailableFP ? 'error' : ''), //Default: rot wenn Vorrat nicht ausreichend, sonst gelb
				EinsatzText = HTML.Format(ForderFPRewards[Rank]) + Calculator.FormatForderRankDiff(ForderRankDiff), //Default: Einsatz + ForderRankDiff
				EinsatzTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderCosts'), { 'nettoreward': FPNettoRewards[Rank], 'forderfactor': (100 + Calculator.ForderBonus), 'costs': ForderFPRewards[Rank] })],

				GewinnClass = (ForderGewinn >= 0 ? 'success' : 'error'), //Default: Grün wenn >= 0 sonst rot
				GewinnText = HTML.Format(ForderGewinn), //Default: Gewinn
				GewinnTooltip;

			if (ForderFPRewards[Rank] - EigenBetrag > StrategyPoints.AvailableFP) {
				EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderFPStockLow'), { 'fpstock': StrategyPoints.AvailableFP, 'costs': ForderFPRewards[Rank] - EigenBetrag, 'tooless': (ForderFPRewards[Rank] - EigenBetrag - StrategyPoints.AvailableFP) }));
			}

			if (ForderGewinn >= 0) {
				GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTProfit'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'safe': SaveRankCosts[Rank], 'costs': ForderFPRewards[Rank], 'profit': ForderGewinn })]
			}
			else {
				GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTLoss'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'safe': SaveRankCosts[Rank], 'costs': ForderFPRewards[Rank], 'loss': 0-ForderGewinn })]
			}

			if (ForderStates[Rank] === 'Self') {
				RowClass = 'info-row';

				RankClass = 'info';

				if (Einzahlungen[Rank] < ForderFPRewards[Rank]) {
					EinsatzClass = 'error';
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTPaidTooLess'), { 'paid': Einzahlungen[Rank], 'topay': ForderFPRewards[Rank], 'tooless': ForderFPRewards[Rank] - Einzahlungen[Rank] }));
				}
				else if (Einzahlungen[Rank] > ForderFPRewards[Rank]) {
					EinsatzClass = 'warning';
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTPaidTooMuch'), { 'paid': Einzahlungen[Rank], 'topay': ForderFPRewards[Rank], 'toomuch': Einzahlungen[Rank] - ForderFPRewards[Rank]}));
				}
				else {
					EinsatzClass = 'info';
				}

				EinsatzText = HTML.Format(Einzahlungen[Rank]);
				if (Einzahlungen[Rank] !== ForderFPRewards[Rank]) {
					EinsatzText += '/' + HTML.Format(ForderFPRewards[Rank]);
				}
				EinsatzText += Calculator.FormatForderRankDiff(ForderRankDiff);


				if (ForderRankDiff > 0 && Einzahlungen[Rank] < ForderRankCosts[Rank]) {
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderNegativeProfit'), { 'fpcount': ForderRankDiff, 'totalfp': ForderRankCosts[Rank] }));
				}
				else if (ForderRankDiff < 0) {
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTLevelWarning'), { 'fpcount': (0 - ForderRankDiff), 'totalfp': ForderRankCosts[Rank] }));
				}

				if (ForderGewinn > 0) {
					GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTProfitSelf'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'paid': Einzahlungen[Rank], 'profit': ForderGewinn })]
				}
				else {
					GewinnTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTLossSelf'), { 'nettoreward': FPNettoRewards[Rank], 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': FPRewards[Rank], 'paid': Einzahlungen[Rank], 'loss': 0 - ForderGewinn })]
				}

				GewinnClass = 'info';
			}
			else if (ForderStates[Rank] === 'NegativeProfit') {
				RowClass = 'bg-red';

				RankClass = 'error';

				EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderNegativeProfit'), { 'fpcount': ForderRankDiff, 'totalfp': ForderRankCosts[Rank] }));

				GewinnClass = 'error';
			}
			else if (ForderStates[Rank] === 'LevelWarning') {
				RowClass = 'bg-yellow';

				RankClass = '';

				if (ForderRankDiff < 0) {
					Calculator.PlaySound();
				}

				EinsatzTooltip.push(i18n('Boxes.Calculator.LevelWarning'));
				if (ForderRankDiff < 0) {
					EinsatzTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTLevelWarning'), { 'fpcount': (0 - ForderRankDiff), 'totalfp': ForderRankCosts[Rank] }));
				}

				GewinnClass = '';
			}
			else if (ForderStates[Rank] === 'Profit') {
				RowClass = 'bg-green';

				RankClass = 'success';

				Calculator.PlaySound();
			}
			else {
				RowClass = 'text-grey';

				RankClass = '';

				EinsatzText = HTML.Format(ForderFPRewards[Rank]);

				GewinnText = '-';
				GewinnTooltip = [];
			}

			hFordern.push('<tr class="' + RowClass + '">');
			hFordern.push('<td class="text-center"><strong class="' + RankClass + ' td-tooltip" title="' + RankTooltip.join('<br>') + '">' + RankText + '</strong></td>');
			hFordern.push('<td class="text-center"><strong class="' + EinsatzClass + ' td-tooltip" title="' + EinsatzTooltip.join('<br>') + '">' + EinsatzText + '</strong></td>');
			hFordern.push('<td class="text-center"><strong class="' + GewinnClass + ' td-tooltip" title="' + GewinnTooltip.join('<br>') + '">' + GewinnText + '</strong></td>');
			hFordern.push('</tr>');


			//else if (ForderStates[Rank] === 'LevelWarning') {
			//	let ToolTip = ;
			//}



			// BP+Meds

			RowClass = '';

			if (ForderStates[Rank] === 'NotPossible' && SaveStates[Rank] === 'NotPossible') {
				RowClass = 'text-grey';
			}
			else if (ForderStates[Rank] === 'WorseProfit' && SaveStates[Rank] === 'WorseProfit') {
				RowClass = 'text-grey';
			}
			else if (ForderStates[Rank] === 'Self' && SaveStates[Rank] === 'Self') {
				RowClass = 'info-row';
			}
			else if (ForderStates[Rank] === 'NegativeProfit' && SaveStates[Rank] === 'NegativeProfit') {
				RowClass = 'bg-red';
			}
			else if (ForderStates[Rank] === 'LevelWarning' && SaveStates[Rank] === 'LevelWarning') {
				RowClass = 'bg-yellow';
			}
			else if (ForderStates[Rank] === 'Profit' && SaveStates[Rank] === 'Profit') {
				RowClass = 'bg-green';
			}

			hBPMeds.push('<tr class="' + RowClass + '">');
			hBPMeds.push('<td class="text-center">' + HTML.Format(BPRewards[Rank]) + '</td>');
			hBPMeds.push('<td class="text-center">' + HTML.Format(MedalRewards[Rank]) + '</td>');
			hBPMeds.push('</tr>');
		}

		$('#costTableFordern').html(hFordern.join(''));
		$('#costTableBPMeds').html(hBPMeds.join(''));

		$('.td-tooltip').tooltip({
			html: true,
			container: '#costCalculator'
		});
	},
		

	/**
	 * Formatiert den Kurs
	 * *
	 * * @param Kurs
	 * */
	FormatKurs: (Kurs) => {
		if (Kurs === 0) {
			return '-';
		}
		else {
			return HTML.Format(Kurs) + '%';
		}
	},


	/**
	 * Formatiert die +/- Anzeige neben dem Ertrag (falls vorhanden)
	 * *
	 * *@param ForderRankDiff
	 * */
	FormatForderRankDiff: (ForderRankDiff) => {
		if (ForderRankDiff < 0) {
			return ' <small class="text-success">' + HTML.Format(ForderRankDiff) + '</small>';
		}
		else if (ForderRankDiff === 0) {
			return '';
		}
		else { // > 0
			return ' <small class="error">+' + HTML.Format(ForderRankDiff) + '</small>';
		}
	},

		
	/**
	 * Spielt einen Sound im Calculator ab
	 *
	 * @returns {string}
	 */
    PlaySound: () => {
        if (Calculator.PlayInfoSound) {
            Calculator.SoundFile.play();
        }
    },
};
