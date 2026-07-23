/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

// Cost calculator ("GB Cost Calc") for contributing to great buildings.
// It renders into its own box (#CalculatorBox) in split view or into the
// own part calculator box (#OwnPartBox) in the combined view.
// The settings dialog is split into js/parts/ (see js/internal.json).

let Calculator = {
	ForderBonus: 90,
    PlayerName: undefined,
    LastPlayerID: 0,
    PlayInfoSound: false,
	LastRecurringQuests: undefined,
	ForderBonusPerConversation: true,
	AutoOpen: false,
	OwnPartClose: false,
	DefaultButtons: [
		80, 90, 100, 'ark'
	],
	ClanId: null,
	ClanName: null,

	/**
	 * Split view: the cost calculator gets its own box instead of sharing one with the own part calculator.
	 *
	 * @returns {boolean} true if the split view is enabled
	 */
	IsSplitView: () => (localStorage.getItem('CalculatorSplitView') === 'true'),


	/**
	 * The box the calculator currently renders into.
	 *
	 * @returns {string} 'CalculatorBox' in split view, 'OwnPartBox' in the combined view
	 */
	BoxId: () => (Calculator.IsSplitView() ? 'CalculatorBox' : 'OwnPartBox'),


	/**
	 * Shows the cost calculator for the currently opened GB: loads the settings,
	 * creates the own box in split view when missing and renders the content
	 * (or a hint while no GB has been opened yet).
	 */
	Show: () => {
		$('.tooltip').remove();
		Calculator.ForderBonusPerConversation = (localStorage.getItem('CalculatorForderBonusPerConversation') !== 'false');

        let spk = localStorage.getItem('CalculatorTone');

		if (spk === null) {
			localStorage.setItem('CalculatorTone', 'false');
			Calculator.PlayInfoSound = false;

		} else {
			Calculator.PlayInfoSound = (spk !== 'false');
		}

		HTML.AddCssFile('calculator');

		Calculator.CurrentPlayer = parseInt(localStorage.getItem('current_player_id'));

		// in split view the calculator has its own box, create it when missing
		if (Calculator.IsSplitView() && $('#CalculatorBox').length === 0) {
			HTML.Box({
				id: 'CalculatorBox',
				title: i18n('Boxes.Calculator.Title'),
				ask: i18n('Boxes.Calculator.HelpLink'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				settings: 'Calculator.ShowCalculatorSettings()',
				active_maps: "main"
			});

			Calculator.RegisterBoxEvents('CalculatorBox', true);
			Calculator.AddSplitViewButton('CalculatorBox');

			// no saved position yet: offset the new box so it does not fully cover the own part box
			if (!localStorage.getItem('CalculatorBoxCords')) {
				let box = document.getElementById('CalculatorBox');
				box.style.setProperty('--x', '200px');
				box.style.setProperty('--y', '-40px');
			}
		}

		// no GB has been opened yet
		if (!MainParser.CurrentGB.Entity || !MainParser.CurrentGB.Rankings) {
			$('#' + Calculator.BoxId() + 'Body').html(`<div class="text-center dark-bg p5">${i18n('Menu.Calculator.Warning')}</div>`);
			return;
		}

        Calculator.ShowBody();
	},


	/**
	 * Delegated events for the calculator content, bound once per box.
	 * The copy handler is only needed for the standalone box, the shared box already binds its own.
	 *
	 * @param {string} BoxId - Id of the box the events are bound to
	 * @param {boolean} [WithCopyHandler=false] - Also bind the quick-copy handler for FP values
	 */
	RegisterBoxEvents: (BoxId, WithCopyHandler = false) => {
		let $box = $('#' + BoxId);

		// toggle percentages
		$box.on('click', '.btn-toggle-arc', function () {
			Calculator.ForderBonus = parseFloat($(this).data('value'));
			$('#costFactor').val(Calculator.ForderBonus);
			let StorageKey = (Calculator.ForderBonusPerConversation && MainParser.OpenConversation ? 'CalculatorForderBonus_' + MainParser.OpenConversation : 'CalculatorForderBonus');
			localStorage.setItem(StorageKey, Calculator.ForderBonus);
			Calculator.Show();
		});

		// the arc bonus value has been changed
		$box.on('blur', '#costFactor', function () {
			Calculator.ForderBonus = parseFloat($('#costFactor').val());
			let StorageKey = (Calculator.ForderBonusPerConversation && MainParser.OpenConversation ? 'CalculatorForderBonus_' + MainParser.OpenConversation : 'CalculatorForderBonus');
			localStorage.setItem(StorageKey, Calculator.ForderBonus);
			Calculator.Show();
		});

		if (WithCopyHandler) {
			// quick copy for FP values
			$box.on('click', '.copy-fp', function (e) {
				e.preventDefault();
				e.stopPropagation();
				let $this = $(this),
					value = $this.data('copy');

				if (value === undefined || value === '' || value === '-') return;

				Parts.setDonation(value);

				// prevent double action
				$this.addClass('copied');
				setTimeout(() => $this.removeClass('copied'), 800);
			});
		}
	},


	/**
	 * Adds the split view toggle button to a box title bar.
	 *
	 * @param {string} BoxId - Id of the box whose title bar receives the button
	 */
	AddSplitViewButton: (BoxId) => {
		let btn = $('<span />')
			.addClass('window-split')
			.toggleClass('active', Calculator.IsSplitView())
			.attr('title', i18n('Boxes.Calculator.SplitView'));

		// the generic pointerdown handler from HTML.Box was bound before this button existed, prevent dragging on it
		btn.on('pointerdown', (e) => e.stopPropagation());
		btn.on('click', () => Calculator.ToggleSplitView());

		$('#' + BoxId + 'Buttons').prepend(btn);
	},


	/**
	 * Toggles between the combined box (auto switching content) and two separate
	 * boxes; the choice is persisted in localStorage ('CalculatorSplitView').
	 */
	ToggleSplitView: () => {
		let split = !Calculator.IsSplitView();

		localStorage.setItem('CalculatorSplitView', split);
		$('.window-split').toggleClass('active', split);

		if (split) {
			// open the calculator in its own box
			Calculator.Show();
		}
		else {
			HTML.CloseOpenBox('CalculatorBox');
		}

		// re-render or reopen the shared box, its content switching depends on the split view
		if ($('#OwnPartBox').length > 0) {
			Parts.CalcBody();
		}
		else if (!split) {
			Parts.Show();
		}
	},

	/**
	 * Renders the calculator content into the current box: header with building,
	 * level and owner, the arc bonus buttons and the contribution table.
	 * Overlays a hint when the next level is locked or no street is connected.
	 */
	ShowBody: () => {
		let ForderBonusLoaded = false;

		if(Calculator.ForderBonusPerConversation && MainParser.OpenConversation){
			let StorageKey = 'CalculatorForderBonus_' + MainParser.OpenConversation,
				StorageValue = localStorage.getItem(StorageKey);
			
			if(StorageValue !== null){
				Calculator.ForderBonus = parseFloat(StorageValue);
				ForderBonusLoaded = true;
			}
		}

		if(!ForderBonusLoaded){
			let ab = localStorage.getItem('CalculatorForderBonus');
			if (ab !== null) 
				Calculator.ForderBonus = parseFloat(ab);
		}

		let PlayerID = MainParser.CurrentGB.Entity.player_id,
            h = [];

        // If the player has changed, then reset BuildingName/PlayerName
		if (PlayerID !== Calculator.LastPlayerID) {
			Calculator.PlayerName = undefined;
			Calculator.ClanId = undefined;
			Calculator.ClanName = undefined;
		}

		if (Calculator.PlayerName === undefined && PlayerDict[PlayerID] !== undefined) {
			Calculator.PlayerName = PlayerDict[PlayerID]['PlayerName'];
		}
		if (PlayerDict[PlayerID] !== undefined && PlayerDict[PlayerID]['ClanName'] !== undefined) {
			Calculator.ClanId = PlayerDict[PlayerID]['ClanId'];
			Calculator.ClanName = PlayerDict[PlayerID]['ClanName'];
		}

        // BuildingName could not be loaded from the BuildingInfo
		let BuildingName = MainParser.CityEntities[MainParser.CurrentGB.Entity['cityentity_id']]['name'];
		let Level = (MainParser.CurrentGB.Entity.level !== undefined ? MainParser.CurrentGB.Entity.level : 0);
		let MaxLevel = (MainParser.CurrentGB.Entity.max_level !== undefined ? MainParser.CurrentGB.Entity.max_level : 0);

		// Tier (copper/silver/gold) preferably from the current rankings,
		// otherwise from getOtherPlayerOverview, as long as its data still matches the current level
		let Tier = MainParser.CurrentGB.Tier
			|| ((MainParser.CurrentGB.OverviewRow && MainParser.CurrentGB.OverviewRow['level'] === MainParser.CurrentGB.Entity['level']) ? MainParser.CurrentGB.OverviewRow['currentTier'] : null);
		let TierBadge = GreatBuildings.TierBadge(Tier);

		h.push('<div id="gbCalc"><div class="header text-center dark-bg p5">');
		h.push('<strong><span class="building-name">' + BuildingName + '</span></strong>');
        h.push('<p style="margin: 0 0 5px">'+ Level + ' &rarr; ' + (Level + 1) + ' &middot; ' + i18n('Boxes.Calculator.MaxLevel') + ': ' + MaxLevel + (TierBadge ? ' &middot; ' + TierBadge : '') + '</p>');
 
		if (Calculator.PlayerName) {
			h.push('<span class="player-name">' 
				+ `<span class="activity activity_${PlayerDict[PlayerID]['Activity']}"></span> `
				+ MainParser.GetPlayerLink(PlayerID, Calculator.PlayerName));

			if (Calculator.ClanName) {
				h.push(`<br>${MainParser.GetGuildLink(Calculator.ClanId, Calculator.ClanName)}`);
			}

			h.push('</span></strong>');
		}

		// different arc bonus-buttons
		let investmentSteps = [80, 90, 100, MainParser.ArkBonus],
			customButtons = localStorage.getItem('CustomCalculatorButtons');

		if(customButtons) {
			investmentSteps = [];
			let bonuses = JSON.parse(customButtons);

			bonuses.forEach(bonus => {
				if (bonus === 'ark') {
					investmentSteps.push(MainParser.ArkBonus);
				}
				else {
					investmentSteps.push(bonus);
				}
			})
		}

		h.push('<div class="costFactorWrapper">');
		h.push('<div class="btn-group">');
		investmentSteps = investmentSteps.filter((item, index) => investmentSteps.indexOf(item) === index); //Remove duplicates
		investmentSteps.sort((a, b) => a - b);
		investmentSteps.forEach(bonus => {
			h.push(`<button class="btn btn-mid btn-toggle-arc ${(bonus === Calculator.ForderBonus ? 'btn-active' : '')}${(bonus === MainParser.ArkBonus ? ' arkBonus' : '')}" data-value="${bonus}">${bonus}%</button>`);
		});
		
		h.push(`<span data-original-title="${i18n('Boxes.Calculator.FriendlyInvestment')} x%">  <input type="number" id="costFactor" step="0.1" min="12" max="200" value="${Calculator.ForderBonus}"></span>`);

        h.push('</div>');
        h.push('</div>');
		h.push('</div>');

		h.push('<table id="costTableFordern" style="width:100%" class="foe-table"></table>');

        // how much is missing to level up?
		let rest = MainParser.CurrentGB.Entity['state']['forge_points_for_level_up'] - MainParser.CurrentGB.Rankings.reduce((acc,entry)=>acc+(entry?.forge_points|0),0);

		h.push('<div class="text-center dark-bg p5"><em>' + i18n('Boxes.Calculator.Up2LevelUp') + ': <span id="up-to-level-up">' + HTML.Format(rest) + '</span> ' + i18n('Boxes.Calculator.FP') + '</em>');

		h.push(Calculator.GetRecurringQuestsLine(Calculator.PlayInfoSound));

		h.push('</div>');
		h.push('</div>');

		let $box = $('#' + Calculator.BoxId()),
			$body = $box.find('#' + Calculator.BoxId() + 'Body');

		$body.html(h.join(''));
		$box.find('.tooltip').remove();

        // level is not unlocked yet
		if (MainParser.CurrentGB.Entity['level'] === MainParser.CurrentGB.Entity['max_level']) {
            $body.append($('<div />').addClass('lg-not-possible').attr('data-text', i18n('Boxes.Calculator.LGNotOpen')));
		}

		// no street connection
		else if (MainParser.CurrentGB.Entity['connected'] === undefined) {
            $body.append($('<div />').addClass('lg-not-possible').attr('data-text', i18n('Boxes.Calculator.LGNotConnected')));
        }

		Calculator.BuildTable();
	},


	/**
	 * Calculates and renders the contribution table: for every reward rank the
	 * costs to demand ("fordern") and to safely take the spot, the resulting
	 * profit and the blueprint/medal rewards, colour coded by state
	 * (profit, negative profit, level warning, taken, own contribution).
	 */
	BuildTable: ()=> {
		let h = [];

		let BestKurs = 999999,
			arc = 1 + (MainParser.ArkBonus / 100),
			ForderArc = 1 + (Calculator.ForderBonus / 100);

        let EigenPos,
            EigenBetrag = 0;

        // Ränge durchsteppen, Suche nach Eigeneinzahlung
		for (let i = 0; i < MainParser.CurrentGB.Rankings.length;i++) {
			if (MainParser.CurrentGB.Rankings[i]['player']['player_id'] !== undefined && MainParser.CurrentGB.Rankings[i]['player']['player_id'] === ExtPlayerID) {
                EigenPos = i;
				EigenBetrag = (isNaN(parseInt(MainParser.CurrentGB.Rankings[i]['forge_points']))) ? 0 : parseInt(MainParser.CurrentGB.Rankings[i]['forge_points']);
                break;
            }
		}

		let ForderStates = [],
			SaveStates = [],
			FPNettoRewards = [],
			FPRewards = [],
			BPRewards = [],
			BPTierRewards = [], // blueprint rewards per rank split by tier: {tier, amount}[] (amount already boosted)
			MedalRewards = [],
			ForderFPRewards = [],
			ForderRankCosts = [],
			SaveRankCosts = [],
			Einzahlungen = [],
			BestGewinn = -999999,
			SaveLastRankCost = undefined;

		for (let i = 0; i < MainParser.CurrentGB.Rankings.length; i++) {
			let Rank,
				CurrentFP,
				TotalFP,
				RestFP,
				IsSelf = false;

			if (MainParser.CurrentGB.Rankings[i]['rank'] === undefined || MainParser.CurrentGB.Rankings[i]['rank'] === -1) {
				continue;
			}
			else {
				Rank = MainParser.CurrentGB.Rankings[i]['rank'] - 1;
			}

			if (MainParser.CurrentGB.Rankings[i]['reward'] === undefined) break; // Ende der Belohnungsränge => raus

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

			if (MainParser.CurrentGB.Rankings[i]['reward']['strategy_point_amount'] !== undefined)
				FPNettoRewards[Rank] = MainParser.round(MainParser.CurrentGB.Rankings[i]['reward']['strategy_point_amount']);

			if (MainParser.CurrentGB.Rankings[i]['reward']['blueprints'] !== undefined)
				BPRewards[Rank] = MainParser.round(MainParser.CurrentGB.Rankings[i]['reward']['blueprints']);

			if (MainParser.CurrentGB.Rankings[i]['reward']['resources']['medals'] !== undefined)
				MedalRewards[Rank] = MainParser.round(MainParser.CurrentGB.Rankings[i]['reward']['resources']['medals']);

			FPRewards[Rank] = MainParser.round(FPNettoRewards[Rank] * arc);
			BPRewards[Rank] = MainParser.round(BPRewards[Rank] * arc);
			MedalRewards[Rank] = MainParser.round(MedalRewards[Rank] * arc);

			// Blueprints split by tier (multi-tier great buildings)
			BPTierRewards[Rank] = (MainParser.CurrentGB.Rankings[i]['reward']['blueprintRewards'] || []).map(bp => ({
				tier: bp['tier'],
				amount: MainParser.round((bp['amount'] || 0) * arc)
			}));
			ForderFPRewards[Rank] = MainParser.round(FPNettoRewards[Rank] * ForderArc);

			if (EigenPos !== undefined && i > EigenPos) {
				ForderStates[Rank] = 'NotPossible';
				SaveStates[Rank] = 'NotPossible';
				continue;
			}

			if (MainParser.CurrentGB.Rankings[i]['player']['player_id'] !== undefined && MainParser.CurrentGB.Rankings[i]['player']['player_id'] === ExtPlayerID)
				IsSelf = true;

			if (MainParser.CurrentGB.Rankings[i]['forge_points'] !== undefined)
				Einzahlungen[Rank] = MainParser.CurrentGB.Rankings[i]['forge_points'];

			CurrentFP = MainParser.CurrentGB.Rankings.reduce((acc,entry)=>acc+(entry?.forge_points|0),0) - EigenBetrag;
			TotalFP = MainParser.CurrentGB.Entity['state']['forge_points_for_level_up'];
			RestFP = TotalFP - CurrentFP;

			if (IsSelf) {
				ForderStates[Rank] = 'Self';
				SaveStates[Rank] = 'Self';

				for (let j = i + 1; j < MainParser.CurrentGB.Rankings.length; j++) {
					// Spieler selbst oder Spieler gelöscht => nächsten Rang überprüfen
					if (MainParser.CurrentGB.Rankings[j]['rank'] !== undefined && MainParser.CurrentGB.Rankings[j]['rank'] !== -1 && MainParser.CurrentGB.Rankings[j]['forge_points'] !== undefined) {
						SaveRankCosts[Rank] = MainParser.round((MainParser.CurrentGB.Rankings[j]['forge_points'] + RestFP) / 2);
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
					if (ForderRankCosts[Rank] === RestFP) 
						ForderStates[Rank] = 'LevelWarning';
					else if (ForderRankCosts[Rank] <= ForderFPRewards[Rank]) 
						ForderStates[Rank] = 'Profit';
					else 
						ForderStates[Rank] = 'NegativeProfit';
				}

				// Platz schon vergeben
				if (SaveRankCosts[Rank] <= Einzahlungen[Rank]) {
					SaveRankCosts[Rank] = 0;
					SaveStates[Rank] = 'NotPossible';
					ExitLoop = true;
				}
				else {
					if (SaveRankCosts[Rank] === RestFP) 
						SaveStates[Rank] = 'LevelWarning';
					else if (FPRewards[Rank] < SaveRankCosts[Rank]) 
						SaveStates[Rank] = 'NegativeProfit';
					else 
						SaveStates[Rank] = 'Profit';
				}

				if (ExitLoop) {
					continue;
				}

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

				if (ExitLoop) {
					continue;
				}

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

		h.push('<thead>' +
			'<th>#</th>' +
			'<th><span class="forgepoints" title="' + HTML.i18nTooltip(i18n('Boxes.Calculator.Commitment')) + '"></span></th>' +
			'<th>' + i18n('Boxes.Calculator.Profit') + '</th>');
			h.push('<th><span class="blueprint"' + GreatBuildings.BlueprintIconStyle(MainParser.CurrentGB.Tier) + ' title="' + HTML.i18nTooltip(i18n('Boxes.Calculator.BPs')) + '"></span></th>');
			h.push('<th><span class="medal" title="' + HTML.i18nTooltip(i18n('Boxes.Calculator.Meds')) + '"></span></th>');
		h.push('</thead>');

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
					let BestKursNettoFP = FPNettoRewards[Rank],
						BestKursEinsatz = SaveRankCosts[Rank];
				}
			}


			let RowClass,
				RankClass,
				RankText = Rank + 1,
				RankTooltip = [],

				EinsatzClass = (ForderFPRewards[Rank] - EigenBetrag > StrategyPoints.AvailableFP ? 'error' : ''), 
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
				RowClass = 'bg-blue';
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
				if (Einzahlungen[Rank] !== ForderFPRewards[Rank]) 
					EinsatzText += ' <small>(=' + HTML.Format(ForderFPRewards[Rank]) + ')</small>';
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

				EinsatzTooltip.push(i18n('Boxes.Calculator.LevelWarning'));

				if (ForderRankDiff < 0) {
					Calculator.PlaySound();
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

			// no clue why this is already set above and then cleared again?!
			// RowClass = '';

			if (ForderStates[Rank] === 'NotPossible' && SaveStates[Rank] === 'NotPossible') 
				RowClass = 'text-grey';
			else if (ForderStates[Rank] === 'Profit' && SaveStates[Rank] === 'Profit') 
				RowClass = 'bg-green';
			else if (ForderStates[Rank] === 'WorseProfit' && SaveStates[Rank] === 'WorseProfit') 
				RowClass = 'text-grey';
			else if (ForderStates[Rank] === 'Self' && SaveStates[Rank] === 'Self') 
				RowClass = 'bg-blue';
			else if (ForderStates[Rank] === 'NegativeProfit' && SaveStates[Rank] === 'NegativeProfit') 
				RowClass = 'bg-red';
			else if (ForderStates[Rank] === 'LevelWarning' && SaveStates[Rank] === 'LevelWarning') 
				RowClass = 'bg-yellow';

			h.push(`<tr class="text-center ${RowClass}">
				<td>
					<strong class="${RankClass} td-tooltip" data-original-title="${HTML.i18nTooltip(RankTooltip.join('<br>'))}">${RankText}</strong>
				</td>
				<td>
					<strong class="${EinsatzClass} td-tooltip copy-fp clickable" data-copy="${ForderFPRewards[Rank]}" data-original-title="${HTML.i18nTooltip(EinsatzTooltip.join('<br>'))}">${EinsatzText}</strong>
				</td>
				<td>
					<strong class="${GewinnClass} td-tooltip copy-fp" data-copy="${ForderGewinn}" data-original-title="${HTML.i18nTooltip(GewinnTooltip.join('<br>'))}">${GewinnText}</strong>
				</td>
				<td> ${GreatBuildings.FormatBlueprintRewards(BPTierRewards[Rank], BPRewards[Rank])} </td>
				<td> <small> ${HTML.Format(MedalRewards[Rank])} </small> </td>
			</tr>`);
		}

		$('#' + Calculator.BoxId()).find('#costTableFordern').html(h.join(''));

		$('[data-original-title]').tooltip({
			html: true,
			container: 'body'
		});
	},


	/**
	 * Builds the "active recurring quest" line showing the FP still needed for
	 * open FP spend/buy quests. Also used by the own part calculator, plays a
	 * sound when the quest count changes.
	 *
	 * @param {boolean} PlaySound - Play a notification sound on quest changes
	 * @returns {string} HTML string with one line per active recurring quest
	 */
	GetRecurringQuestsLine: (PlaySound) => {
		let h = [],
			RecurringQuests = 0;

		for (let Quest of MainParser.Quests) {
			if (Quest.id >= 900000 && Quest.id < 1000000) {
				for (let cond of Quest.successConditions) {
					let CurrentProgress = cond.currentProgress || 0;
					let MaxProgress = cond.maxProgress;
					if (cond.iconType=="icon_quest_alchemie" && ((CurrentEraID <= 3 && MaxProgress >= 3) || (MaxProgress > 15 && CurrentEraID <=15) || MaxProgress>=100)) { // Unterscheidung Buyquests von UseQuests: Bronze/Eiszeit haben nur UseQuests, Rest hat Anzahl immer >15, Buyquests immer <=15
						let RecurringQuestString;
						if (MaxProgress - CurrentProgress !== 0) {
							RecurringQuestString = HTML.Format(MaxProgress - CurrentProgress) + i18n('Boxes.Calculator.FP');
							RecurringQuests += 1;
						}
						else {
							RecurringQuestString = i18n('Boxes.Calculator.Done');
						}

						h.push('<div class="rq"><em>' + i18n('Boxes.Calculator.ActiveRecurringQuest') + ' <span class="recurringquests copy-fp clickable" data-copy="'+ (MaxProgress - CurrentProgress) +'">' + RecurringQuestString + '</span></em></div>');
					}
				}
			}
		}

		if (Calculator.LastRecurringQuests !== undefined && RecurringQuests !== Calculator.LastRecurringQuests) { 
			if (PlaySound) { //Nicht durch Funktion PlaySound ersetzen!!! GetRecurringQuestLine wird auch vom EARechner aufgerufen.
				helper.sounds.play("message");
			}
        }

		Calculator.LastRecurringQuests = RecurringQuests;

		return h.join('');
	},


	/**
	 * Formats the +/- display next to the demand costs (if present).
	 *
	 * @param {number} ForderRankDiff - Difference between securing the rank and the demand costs
	 * @returns {string} HTML string with the coloured difference, empty for 0
	 */
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
	 * Plays the notification sound if it is enabled in the settings.
	 */
    PlaySound: () => {
        if (Calculator.PlayInfoSound) {
			helper.sounds.play("message");
        }
    },
};
