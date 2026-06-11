/*
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * Copyright (C) 2026 Forge Hammer - All Rights Reserved
 * Licensed under AGPL - see LICENSE.md for details.
 */

let Calculator = {
	ForderBonus: 90,
    PlayerName: undefined,
    LastPlayerID: 0,
    PlayInfoSound: false,
	LastRecurringQuests: undefined,
	ForderBonusPerConversation: true,
	AutoOpen: localStorage.getItem('CalcAutoOpen') || false,
	OwnPartClose: false,
	DefaultButtons: [
		80, 90, 100, 'ark'
	],
	ClanId: null,
	ClanName: null,
	RankState: {
		NOT_POSSIBLE:    'NotPossible',
		ALREADY_CONTRIBUTED:    'AlreadyContributed',
		PROFIT:          'Profit',
		WORSE_PROFIT:    'WorseProfit',
		NEGATIVE_PROFIT: 'NegativeProfit',
		LEVEL_WARNING:   'LevelWarning',
		SELF:            'Self',
	},
	ConversationContent: null,
	ConversationContentNew: null,

	Show: (action = "") => {
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

        Calculator.ShowBody();
	},

	ShowBody: () => {
		let ForderBonusLoaded = false;

		if(Calculator.ForderBonusPerConversation && MainParser.OpenConversation){
			let StorageKey = 'CalculatorForderBonus_' + MainParser.OpenConversation.id,
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
			Calculator.PlayerName = PlayerDict[PlayerID].PlayerName;
		}
		if (PlayerDict[PlayerID] !== undefined && PlayerDict[PlayerID].ClanName !== undefined) {
			Calculator.ClanId = PlayerDict[PlayerID].ClanId;
			Calculator.ClanName = PlayerDict[PlayerID].ClanName;
		}

        // BuildingName could not be loaded from the BuildingInfo
		let BuildingName = MainParser.CityEntities[MainParser.CurrentGB.Entity['cityentity_id']]['name'];
		let Level = (MainParser.CurrentGB.Entity.level !== undefined ? MainParser.CurrentGB.Entity.level : 0);
		let MaxLevel = (MainParser.CurrentGB.Entity.max_level !== undefined ? MainParser.CurrentGB.Entity.max_level : 0);

		h.push(`<div id="gbCalc">
				<div class="header text-center dark-bg p5">
					<strong><span class="building-name">${BuildingName}</span></strong>
					<p style="margin: 0 0 5px">${Level} &rarr; ${(Level + 1)} &middot; ${i18n('Boxes.Calculator.MaxLevel')}: ${MaxLevel}</p>`);
 
			if (Calculator.PlayerName) {
				h.push(`<span class="player-name">
					<span class="activity activity_${PlayerDict[PlayerID]['Activity']}"></span>
					${MainParser.GetPlayerLink(PlayerID, Calculator.PlayerName)}`);

				if (Calculator.ClanName) {
					h.push(`<br> ${MainParser.GetGuildLink(Calculator.ClanId, Calculator.ClanName)}`);
				}

				h.push(`</span></strong>`);
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

		h.push(`<div class="costFactorWrapper">
				<div class="btn-group">`);
			investmentSteps = investmentSteps.filter((item, index) => investmentSteps.indexOf(item) === index); //Remove duplicates
			investmentSteps.sort((a, b) => a - b);
			investmentSteps.forEach(bonus => {
				h.push(`<button class="btn btn-mid btn-toggle-arc ${(bonus === Calculator.ForderBonus ? 'btn-active' : '')}${(bonus === MainParser.ArkBonus ? ' arkBonus' : '')}" data-value="${bonus}">${bonus}%</button>`);
			});
		
		h.push(`<span data-original-title="${i18n('Boxes.Calculator.FriendlyInvestment')} x%">  <input type="number" id="costFactor" step="0.1" min="12" max="200" value="${Calculator.ForderBonus}"></span>`);

        h.push(`</div>
				</div>
			</div>
				
		<table id="costTableFordern" style="width:100%" class="foe-table"> </table>`);

        // how much is missing to level up?
		let rest = MainParser.CurrentGB.Entity['state']['forge_points_for_level_up'] - MainParser.CurrentGB.Rankings.reduce((acc,entry)=>acc+(entry?.forge_points|0),0);

		if (!MainParser.CurrentGB.isPreviousLevel)
			h.push('<div class="text-center dark-bg p5"><em>' + i18n('Boxes.Calculator.Up2LevelUp') + ': <span id="up-to-level-up">' + HTML.Format(rest) + '</span> ' + i18n('Boxes.Calculator.FP') + '</em>');

		h.push(Calculator.GetRecurringQuestsLine(Calculator.PlayInfoSound));

		h.push('</div>');

        $('#OwnPartBox').find('.tooltip').remove();

        // level is not unlocked yet
		if (MainParser.CurrentGB.Entity['level'] === MainParser.CurrentGB.Entity['max_level']) {
            $('#OwnPartBox').find('#OwnPartBoxBody').append($('<div />').addClass('lg-not-possible').attr('data-text', i18n('Boxes.Calculator.LGNotOpen')));
		}

		// no street connection
		else if (MainParser.CurrentGB.Entity['connected'] === undefined) {
            $('#OwnPartBox').find('#OwnPartBoxBody').append($('<div />').addClass('lg-not-possible').attr('data-text', i18n('Boxes.Calculator.LGNotConnected')));
        }
		h.push('</div>');

		$('#OwnPartBoxBody').html(h.join(''));

		Calculator.BuildTable();
	},


	/**
	 * The table body with all functions
	 */
	BuildTable: ()=> {
		let h = [];

		// load different table for previous levels
		if (MainParser.CurrentGB.isPreviousLevel) {
			h.push(Calculator.BuildTableForPrevLevel());
			
			$('#costTableFordern').html(h.join(''));

			$('[data-original-title]').tooltip({
				html: true,
				container: 'body'
			});
			return;
		}

		let bestRate = 999999,
			arcMultiplier = 1 + (MainParser.ArkBonus / 100),
			donorArcMultiplier = 1 + (Calculator.ForderBonus / 100);

		let selfRankIndex,
			selfContribution = 0;

		// Step through ranks, search for own contribution
		for (let i = 0; i < MainParser.CurrentGB.Rankings.length; i++) {
			const entry = MainParser.CurrentGB.Rankings[i];
			if (entry.player.player_id !== undefined && entry.player.player_id === ExtPlayerID) {
				selfRankIndex = i;
				selfContribution = (isNaN(parseInt(entry.forge_points))) ? 0 : parseInt(entry.forge_points);
				break;
			}
		}

		// Pre-calculate values that don't change per iteration
		const currentFP = MainParser.CurrentGB.Rankings.reduce((acc, entry) => acc + (entry?.forge_points | 0), 0) - selfContribution;
		const totalFP = MainParser.CurrentGB.Entity.state.forge_points_for_level_up;
		const remainingFP = totalFP - currentFP;

		const ranks = []; // Each entry: { donorState, safeState, fpNetReward, fpGrossReward, bpReward, medalReward, donorFpReward, donorRankCost, safeRankCost, contribution }

		let bestProfit = -999999,
			lastSafeRankCost = undefined;

		for (let i = 0; i < MainParser.CurrentGB.Rankings.length; i++) {
			const entry = MainParser.CurrentGB.Rankings[i];
			if (entry.rank === undefined || entry.rank === -1) continue;
			if (entry.reward === undefined) break;

			let rankIndex = entry.rank - 1,
				isSelf = false;

			ranks[rankIndex] = {
				donorState:    undefined, // NotPossible / WorseProfit / Self / NegativeProfit / LevelWarning / Profit
				safeState:     undefined, // NotPossible / WorseProfit / Self / NegativeProfit / LevelWarning / Profit
				fpNetReward:   0,
				fpGrossReward: 0,
				bpReward:      0,
				medalReward:   0,
				donorFpReward: 0,
				donorRankCost: undefined,
				safeRankCost:  undefined,
				contribution:  0,
			};

			const rank = ranks[rankIndex];

			if (entry.reward.strategy_point_amount !== undefined)
				rank.fpNetReward = MainParser.round(entry.reward.strategy_point_amount);

			if (entry.reward.blueprints !== undefined)
				rank.bpReward = MainParser.round(entry.reward.blueprints);

			if (entry.reward.resources?.medals !== undefined)
				rank.medalReward = MainParser.round(entry.reward.resources.medals);

			rank.fpGrossReward  = MainParser.round(rank.fpNetReward * arcMultiplier);
			rank.bpReward       = MainParser.round(rank.bpReward * arcMultiplier);
			rank.medalReward    = MainParser.round(rank.medalReward * arcMultiplier);
			rank.donorFpReward  = MainParser.round(rank.fpNetReward * donorArcMultiplier);

			if (selfRankIndex !== undefined && i > selfRankIndex) {
				rank.donorState = Calculator.RankState.NOT_POSSIBLE;
				rank.safeState  = Calculator.RankState.NOT_POSSIBLE;
				continue;
			}

			if (entry.player.player_id !== undefined && entry.player.player_id === ExtPlayerID)
				isSelf = true;

			if (entry.forge_points !== undefined)
				rank.contribution = entry.forge_points;

			if (isSelf) {
				rank.donorState = Calculator.RankState.SELF;
				rank.safeState  = Calculator.RankState.SELF;

				for (let j = i + 1; j < MainParser.CurrentGB.Rankings.length; j++) {
					// Self or deleted player? 
					const nextEntry = MainParser.CurrentGB.Rankings[j];
					if (nextEntry.rank !== undefined && nextEntry.rank !== -1 && nextEntry.forge_points !== undefined) {
						rank.safeRankCost = MainParser.round((nextEntry.forge_points + remainingFP) / 2);
						break;
					}
				}

				if (rank.safeRankCost === undefined)
					rank.safeRankCost = MainParser.round(remainingFP / 2); // No contribution found => remaining / 2

				rank.donorRankCost = Math.max(rank.donorFpReward, rank.safeRankCost);
			}
			else {
				rank.safeRankCost  = MainParser.round((rank.contribution + remainingFP) / 2);
				rank.donorRankCost = Math.max(rank.donorFpReward, rank.safeRankCost);
				rank.donorRankCost = Math.min(rank.donorRankCost, remainingFP); // Cap at remainingFP to avoid levelling the building

				// Rank already taken
				if (rank.safeRankCost <= rank.contribution) {
					rank.donorState    = Calculator.RankState.NOT_POSSIBLE;
					rank.safeState     = Calculator.RankState.NOT_POSSIBLE;
					rank.donorRankCost = 0;
					rank.safeRankCost  = 0;
					continue;
				}

				if (rank.donorRankCost === remainingFP)
					rank.donorState = Calculator.RankState.LEVEL_WARNING;
				else if (rank.donorRankCost <= rank.donorFpReward)
					rank.donorState = Calculator.RankState.PROFIT;
				else
					rank.donorState = Calculator.RankState.NEGATIVE_PROFIT;

				if (rank.safeRankCost === remainingFP)
					rank.safeState = Calculator.RankState.LEVEL_WARNING;
				else if (rank.fpGrossReward < rank.safeRankCost)
					rank.safeState = Calculator.RankState.NEGATIVE_PROFIT;
				else
					rank.safeState = Calculator.RankState.PROFIT;

				// Same cost as previous rank => not claimable
				if (lastSafeRankCost !== undefined && rank.safeRankCost === lastSafeRankCost) {
					rank.donorState    = Calculator.RankState.NOT_POSSIBLE;
					rank.donorRankCost = undefined;
					rank.safeState     = Calculator.RankState.NOT_POSSIBLE;
					rank.safeRankCost  = undefined;
					continue;
				}
				else {
					lastSafeRankCost = rank.safeRankCost;
				}

				const currentProfit = rank.fpGrossReward - rank.safeRankCost;
				if (currentProfit > bestProfit) {
					if (rank.safeState !== Calculator.RankState.LEVEL_WARNING)
						bestProfit = currentProfit;
				}
				else {
					rank.safeState  = Calculator.RankState.WORSE_PROFIT;
					rank.donorState = Calculator.RankState.WORSE_PROFIT;
				}
			}
		}

		h.push('<thead><tr>' +
			'<th>#</th>' +
			'<th><span class="forgepoints" title="' + HTML.i18nTooltip(i18n('Boxes.Calculator.Commitment')) + '"></span></th>' +
			'<th>' + i18n('Boxes.Calculator.Profit') + '</th>');
			h.push('<th><span class="blueprint" title="' + HTML.i18nTooltip(i18n('Boxes.Calculator.BPs')) + '"></span></th>');
			h.push('<th><span class="medal" title="' + HTML.i18nTooltip(i18n('Boxes.Calculator.Meds')) + '"></span></th>');
		h.push('</tr></thead>');

		for (let rankIndex = 0; rankIndex < ranks.length; rankIndex++) {
			const rank = ranks[rankIndex];

			let donorCosts = (rank.donorState === Calculator.RankState.SELF ? rank.contribution : rank.donorFpReward),
				safeCosts  = (rank.safeState  === Calculator.RankState.SELF ? rank.contribution : rank.safeRankCost);

			let donorProfit   = rank.fpGrossReward - donorCosts,
				donorRankDiff = (rank.donorRankCost !== undefined ? rank.donorRankCost - rank.donorFpReward : 0),
				rate          = (rank.fpNetReward > 0 ? MainParser.round(safeCosts / rank.fpNetReward * 1000) / 10 : 0);

			if (rank.safeState !== Calculator.RankState.SELF && rate > 0) {
				if (rate < bestRate) {
					bestRate = rate;
					let bestRateNetFP  = rank.fpNetReward,
						bestRateInvest = rank.safeRankCost;
				}
			}

			let rowClass,
				rankClass,
				rankText    = rankIndex + 1,
				rankTooltip = [],

				contributionClass   = (rank.donorFpReward - selfContribution > StrategyPoints.AvailableFP ? 'error' : ''),
				contributionText    = HTML.Format(rank.donorFpReward) + Calculator.FormatForderRankDiff(donorRankDiff),
				contributionTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderCosts'), { 'nettoreward': rank.fpNetReward, 'forderfactor': (100 + Calculator.ForderBonus), 'costs': rank.donorFpReward })],

				profitClass   = (donorProfit >= 0 ? 'success' : 'error'),
				profitText    = HTML.Format(donorProfit),
				profitTooltip;

			if (rank.donorFpReward - selfContribution > StrategyPoints.AvailableFP) {
				contributionTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderFPStockLow'), { 'fpstock': StrategyPoints.AvailableFP, 'costs': rank.donorFpReward - selfContribution, 'tooless': (rank.donorFpReward - selfContribution - StrategyPoints.AvailableFP) }));
			}

			if (donorProfit >= 0) {
				profitTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTProfit'), { 'nettoreward': rank.fpNetReward, 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': rank.fpGrossReward, 'safe': rank.safeRankCost, 'costs': rank.donorFpReward, 'profit': donorProfit })]
			}
			else {
				profitTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTLoss'), { 'nettoreward': rank.fpNetReward, 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': rank.fpGrossReward, 'safe': rank.safeRankCost, 'costs': rank.donorFpReward, 'loss': 0 - donorProfit })]
			}

			if (rank.donorState === Calculator.RankState.SELF) {
				rankClass = 'info';

				if (rank.contribution < rank.donorFpReward) {
					contributionClass = 'error';
					contributionTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTPaidTooLess'), { 'paid': rank.contribution, 'topay': rank.donorFpReward, 'tooless': rank.donorFpReward - rank.contribution }));
				}
				else if (rank.contribution > rank.donorFpReward) {
					contributionClass = 'warning';
					contributionTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTPaidTooMuch'), { 'paid': rank.contribution, 'topay': rank.donorFpReward, 'toomuch': rank.contribution - rank.donorFpReward }));
				}
				else {
					contributionClass = 'info';
				}

				contributionText = HTML.Format(rank.contribution);
				if (rank.contribution !== rank.donorFpReward)
					contributionText += ' <small>(=' + HTML.Format(rank.donorFpReward) + ')</small>';
				contributionText += Calculator.FormatForderRankDiff(donorRankDiff);

				if (donorRankDiff > 0 && rank.contribution < rank.donorRankCost) {
					contributionTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderNegativeProfit'), { 'fpcount': donorRankDiff, 'totalfp': rank.donorRankCost }));
				}
				else if (donorRankDiff < 0) {
					contributionTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTLevelWarning'), { 'fpcount': (0 - donorRankDiff), 'totalfp': rank.donorRankCost }));
				}

				if (donorProfit > 0) {
					profitTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTProfitSelf'), { 'nettoreward': rank.fpNetReward, 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': rank.fpGrossReward, 'paid': rank.contribution, 'profit': donorProfit })]
				}
				else {
					profitTooltip = [HTML.i18nReplacer(i18n('Boxes.Calculator.TTLossSelf'), { 'nettoreward': rank.fpNetReward, 'arcfactor': (100 + MainParser.ArkBonus), 'bruttoreward': rank.fpGrossReward, 'paid': rank.contribution, 'loss': 0 - donorProfit })]
				}

				profitClass = 'info';
			}
			else if (rank.donorState === Calculator.RankState.NEGATIVE_PROFIT) {
				rankClass = 'error';

				contributionTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTForderNegativeProfit'), { 'fpcount': donorRankDiff, 'totalfp': rank.donorRankCost }));

				profitClass = 'error';
			}
			else if (rank.donorState === Calculator.RankState.LEVEL_WARNING) {
				rankClass = '';

				contributionTooltip.push(i18n('Boxes.Calculator.LevelWarning'));

				if (donorRankDiff < 0) {
					Calculator.PlaySound();
					contributionTooltip.push(HTML.i18nReplacer(i18n('Boxes.Calculator.TTLevelWarning'), { 'fpcount': (0 - donorRankDiff), 'totalfp': rank.donorRankCost }));
				}

				profitClass = '';
			}
			else if (rank.donorState === Calculator.RankState.PROFIT) {
				rankClass = 'success';

				Calculator.PlaySound();
			}
			else {
				rankClass = '';

				contributionText = HTML.Format(rank.donorFpReward);

				profitText    = '-';
				profitTooltip = [];
			}

			if (rank.donorState === Calculator.RankState.NOT_POSSIBLE && rank.safeState === Calculator.RankState.NOT_POSSIBLE)
				rowClass = 'text-grey';
			else if (rank.donorState === Calculator.RankState.PROFIT && rank.safeState === Calculator.RankState.PROFIT)
				rowClass = 'bg-green';
			else if (rank.donorState === Calculator.RankState.WORSE_PROFIT && rank.safeState === Calculator.RankState.WORSE_PROFIT)
				rowClass = 'text-grey';
			else if (rank.donorState === Calculator.RankState.SELF && rank.safeState === Calculator.RankState.SELF)
				rowClass = 'bg-blue';
			else if (rank.donorState === Calculator.RankState.NEGATIVE_PROFIT && rank.safeState === Calculator.RankState.NEGATIVE_PROFIT)
				rowClass = 'bg-red';
			else if (rank.donorState === Calculator.RankState.LEVEL_WARNING && rank.safeState === Calculator.RankState.LEVEL_WARNING)
				rowClass = 'bg-yellow';

			if (rank.contribution > 0 && rank.donorState !== Calculator.RankState.PROFIT && rank.donorState !== Calculator.RankState.LEVEL_WARNING)
				contributionClass = 'info';
			if (rank.contribution === 0)
				rankClass = 'info';

			h.push(`<tr class="text-center ${rowClass}">
				<td> <strong class="${rankClass}">${rankText}</strong> </td>
				<td>
					<strong class="${contributionClass} td-tooltip copy-fp clickable" data-copy="${rank.donorFpReward}" data-original-title="${HTML.i18nTooltip(contributionTooltip.join('<br>'))}">${contributionText}</strong>
				</td>
				<td>
					<strong class="${profitClass} td-tooltip copy-fp" data-copy="${donorProfit}" data-original-title="${HTML.i18nTooltip(profitTooltip.join('<br>'))}">${profitText}</strong>
				</td>
				<td> ${HTML.Format(rank.bpReward)} </td>
				<td> <small> ${HTML.Format(rank.medalReward)} </small> </td>
			</tr>`);
		}

		$('#costTableFordern').html(h.join(''));

		$('[data-original-title]').tooltip({
			html: true,
			container: 'body'
		});
	},


	BuildTableForPrevLevel: () => {
		let output = `<thead>
				<tr>
				<th>#</th>
				<th><span class="forgepoints" title="${HTML.i18nTooltip(i18n('Boxes.Calculator.Commitment'))}"></span></th>
				<th>${i18n('Boxes.Calculator.Profit')}</th>
				<th><span class="blueprint" title="${HTML.i18nTooltip(i18n('Boxes.Calculator.BPs'))}"></span></th>
				<th><span class="medal" title="${HTML.i18nTooltip(i18n('Boxes.Calculator.Meds'))}"></span></th>
				</tr>
				</thead>
			<tbody>`;

			for (let entry of MainParser.CurrentGB.Rankings) {
				if (entry.player.player_id == MainParser.CurrentGB.Entity.player_id) continue;

				let fpToPayWithSelectedBonus = (MainParser.round((100+Calculator.ForderBonus) * (entry.reward?.strategy_point_amount||0) / 100));
				let paidFairly = (entry.forge_points - fpToPayWithSelectedBonus >= 0)
				
				output += `<tr class="text-center text-grey ${paidFairly ? '' : 'bg-red'}">
					<td><b>${entry.rank}</b></td>
					<td><b>${HTML.Format(entry.forge_points)}</b></td>
					<td><b class=" ${paidFairly ? '' : 'error'}">${entry.forge_points - fpToPayWithSelectedBonus}</b></td>
					<td>${HTML.Format(MainParser.round(entry.reward?.blueprints ? MainParser.round(entry.reward?.blueprints * (MainParser.ArkBonus + 100)) / 100 : 0))}</td>
					<td><small>${HTML.Format(MainParser.round(entry.reward?.resources?.medals ? MainParser.round(entry.reward.resources.medals * (MainParser.ArkBonus + 100)) / 100 : 0))}</small></td>
				</tr>`;
			}
			output += `</tbody>`;
		return output;
	},


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
	 * Formats the +/- display next to the yield (if present)
	 *
	 * @param ForderRankDiff
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

		
    PlaySound: () => {
        if (Calculator.PlayInfoSound) {
			helper.sounds.play("message");
        }
    },


	ShowCalculatorSettings: ()=> {
		let c = [],
			buttons,
			defaults = Calculator.DefaultButtons,
			sB = localStorage.getItem('CustomCalculatorButtons'),
			allGB = JSON.parse(localStorage.getItem('ShowOwnPartOnAllGBs')),
			nV = `<p class="new-row text-center bbd p5 flex gap">
				${i18n('Boxes.Calculator.Settings.newValue')}: <input type="number" class="settings-values" style="width:30px"> 
				<span class="btn btn-green btn-slim" onclick="Calculator.SettingsInsertNewRow()">+</span>
				</p>`;

		if(sB) {
			// buttons = [...new Set([...defaults,...JSON.parse(sB)])];
			buttons = JSON.parse(sB);

			buttons = buttons.filter((item, index) => buttons.indexOf(item) === index); // remove duplicates
			buttons.sort((a, b) => a - b); // order
		}
		else {
			buttons = defaults;
		}

		c.push('<section class="flex gap p2">');
		buttons.forEach(bonus => {
			if(bonus === 'ark') {
				c.push(`<span class="btn-group"><input type="hidden" class="settings-values" value="ark"> <button class="btn btn-slim br">${MainParser.ArkBonus}%</button></span>`);
			}
			else {
				c.push(`<span class="btn-group flex"><button class="btn btn-slim">${bonus}%</button> <input type="hidden" class="settings-values" value="${bonus}"> <span class="btn btn-delete btn-slim" onclick="Calculator.SettingsRemoveRow(this)">x</span> </span>`);
			}
		});
		c.push('</section>');

		c.push(nV);

		c.push(`<p class="bbd p5">
			<label for="CalcAutoOpen"><input id="CalcAutoOpen" class="CalcAutoOpen game-cursor" ${(Calculator.AutoOpen ? 'checked' : '')} type="checkbox"> ${i18n('Settings.ShowOwnPartAutoOpen.Desc')}</label><br/>
			<label for="openonaliengb"><input type="checkbox" id="openonaliengb" class="openonaliengb game-cursor" ${((!allGB) ? 'checked' : '')}> ${i18n('Settings.ShowOwnPartOnAllGBs.Desc')}</label><br>
			<label for="forderbonusperconversation"><input id="forderbonusperconversation" class="forderbonusperconversation game-cursor" ${(Calculator.ForderBonusPerConversation ? 'checked' : '')} type="checkbox">${i18n('Boxes.Calculator.ForderBonusPerConversation')}</label><br/>
			<label for="CalculatorTone"><input id="CalculatorTone" class="CalculatorTone game-cursor" ${(Calculator.PlayInfoSound ? 'checked' : '')} type="checkbox"> ${i18n('Boxes.Calculator.PlayInfoSound')}</label>
		</p>`);

		c.push(`<p class="text-center"><button id="save-calculator-settings" class="btn btn-green" onclick="Calculator.SettingsSaveValues()">${i18n('Boxes.Calculator.Settings.Save')}</button></p>`);

		$('#OwnPartBoxSettingsBox').html(c.join(''));
	},


	SettingsInsertNewRow: ()=> {
    	let nV = `<p class="new-row">${i18n('Boxes.Calculator.Settings.newValue')}: <input type="number" class="settings-values" style="width:30px"> <span class="btn btn-green" onclick="Calculator.SettingsInsertNewRow()">+</span></p>`;

		$(nV).insertAfter( $('.new-row:eq(-1)') );
	},


	SettingsRemoveRow: ($this)=> {
		$($this).closest('.btn-group').fadeToggle('fast', function(){
			$(this).remove();
		});
	},


	SettingsSaveValues: ()=> {
    	let values = [];
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
		localStorage.setItem('CustomCalculatorButtons', JSON.stringify(values));

		Calculator.AutoOpen = $('.CalcAutoOpen').prop('checked');
		localStorage.setItem('CalcAutoOpen', Calculator.AutoOpen);
		
		Calculator.ForderBonusPerConversation = $('.forderbonusperconversation').prop('checked');
		localStorage.setItem('CalculatorForderBonusPerConversation', Calculator.ForderBonusPerConversation);

		Calculator.PlayInfoSound = $('#CalculatorTone').prop('checked');
		localStorage.setItem('CalculatorTone', Calculator.PlayInfoSound);

		let openforeignGB = false;
		if ($("#openonaliengb").is(':not(:checked)')) openforeignGB = true;
		localStorage.setItem('ShowOwnPartOnAllGBs',openforeignGB);


		$(`#OwnPartBoxSettingsBox`).fadeToggle('fast', function(){
			$(this).remove();
			Parts.CalcBody();
		});
	},

	showToPay: (previousmessage, sentmessage) => {
		let entriesAfter = sentmessage.split(/\r\n|\r|\n/).map(l => l.trim());
		let entriesBefore = previousmessage.split(/\r\n|\r|\n/).map(l => l.trim());

		let consideredOutput = [];
		for (const entry of entriesBefore) {
			let matched = false;
			for (const afterEntry of entriesAfter) {
				if (entry.includes(afterEntry) && entry !== afterEntry) {
					consideredOutput.push({ before: entry, after: afterEntry });
					matched = true;
					break;
				}
			}
			if (!matched) {
				consideredOutput.push({ before: true, after: entry });
			}
		}

		let output = [];
		for (let { before, after } of consideredOutput) {
			if (before === true) {
				output.push(after);
			} else {
				const afterTokens = new Set(after.split(/\s+/));
				const beforeTokens = before.split(/\s+/);
				const diffTokens = beforeTokens.filter(token => !afterTokens.has(token));

				const prefix = before.split(/\s+/).slice(0, 2).join(' ');
				output.push(prefix ? `${prefix} ${diffTokens.join(' ')}` : diffTokens.join(' '));
			}
		}
		// to do: better matching

		console.log(output);
	}
};
