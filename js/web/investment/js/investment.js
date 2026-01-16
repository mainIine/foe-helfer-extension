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

// LG Investitionen
FoEproxy.addHandler('GreatBuildingsService', (data) => {

	if(typeof data['requestMethod'] === 'undefined') 
	{
		return;
	}

	if (data['requestMethod'] !== 'getContributions')
	{
		Investment.RequestBlockTime = +MainParser.getCurrentDate();
	}

	if (data['requestMethod'] === 'getContributions')
	{
		if(!data['responseData'] ){
			return;
		}

		Investment.Data = data['responseData'];

		Investment.UpdateData(Investment.Data, true).then((e) => {
		if (Settings.GetSetting('ShowInvestments') && (+MainParser.getCurrentDate() - Investment.RequestBlockTime) > 2000)
			{
				Investment.BuildBox(true);
			}
		});
	}
});


let Investment = {
	Data: null,
	Einsatz: 0,
	Ertrag: 0,
	Medals: 0,
	HiddenElements: 0,
	RequestBlockTime: 0,


	BuildBox: (event)=> {
		if ($('#Investment').length === 0) {
			HTML.Box({
				id: 'Investment',
				title: i18n('Boxes.Investment.Title'),
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize: true,
				settings: 'Investment.ShowInvestmentSettings()'
			});

			HTML.AddCssFile('investment');
		}
		else if(!event) {
			HTML.CloseOpenBox('Investment');
			return;
		}

		Investment.Show();
	},


	/**
	 * Calculate investment
	 *
	 * @constructor
	 */
	CalcFPs: async ()=> {

		let sumEinsatz = 0;
		let sumErtrag = 0;
		let	sumMedals = 0;
		let countHiddenElements = 0;

		// save previous values for number animation
		let easy_animate_start_values = {
			investsto: Investment.Einsatz,
			rewardsto: Investment.Ertrag,
			totalsto: (StrategyPoints.AvailableFP + Investment.Ertrag + Investment.Einsatz),
			medalssto: Investment.Medals
		}

		let InvestmentSettings = JSON.parse(localStorage.getItem('InvestmentSettings'));
		let removeUnsafeCalc = (InvestmentSettings && InvestmentSettings.removeUnsafeCalc !== undefined) ? InvestmentSettings.removeUnsafeCalc : 0;

		Investment.Einsatz = 0;
		Investment.Ertrag = 0;
		Investment.HiddenElements = 0;

		let AllInvestments = await IndexDB.db.investhistory.reverse().toArray();

		if (AllInvestments === undefined)
			return;

		for (let i in AllInvestments)
		{
			if(AllInvestments.hasOwnProperty(i))
			{
				let ishidden = (typeof AllInvestments[i].ishidden != 'undefined') ? AllInvestments[i].ishidden : 0,
					isNotSafe = AllInvestments[i].currentFp < AllInvestments[i].max_progress - AllInvestments[i].current_progress,
					removeUnsafe = !!(isNotSafe && removeUnsafeCalc);

				countHiddenElements += ishidden ? 1 : 0;
				sumEinsatz += ishidden ? 0 : AllInvestments[i].currentFp;
				sumErtrag += ishidden || removeUnsafe ? 0 : AllInvestments[i].profit - AllInvestments[i].currentFp;
				sumMedals += ishidden || removeUnsafe ? 0 : (AllInvestments[i].medals ? AllInvestments[i].medals : 0);
			}
		}

		Investment.Ertrag = sumErtrag;
		Investment.Einsatz = sumEinsatz;
		Investment.Medals = sumMedals;
		Investment.HiddenElements = countHiddenElements;

		Investment.showFPOverview(easy_animate_start_values);
	},


	Show: async ()=> {

		let b = [],
			h = [];
		let InvestmentSettings = JSON.parse(localStorage.getItem('InvestmentSettings'));
		let showEntryDate = (InvestmentSettings && InvestmentSettings.showEntryDate !== undefined) ? InvestmentSettings.showEntryDate : 0;
		let showInvestmentIncreaseDate = (InvestmentSettings && InvestmentSettings.showInvestmentIncreaseDate !== undefined) ? InvestmentSettings.showInvestmentIncreaseDate : 0;
		let showRestFp = (InvestmentSettings && InvestmentSettings.showRestFp !== undefined) ? InvestmentSettings.showRestFp : 0;
		let showMedals = (InvestmentSettings && InvestmentSettings.showMedals !== undefined) ? InvestmentSettings.showMedals : 0;
		let showBlueprints = (InvestmentSettings && InvestmentSettings.showBlueprints !== undefined) ? InvestmentSettings.showBlueprints : 0;
		let showHiddenGb = (InvestmentSettings && InvestmentSettings.showHiddenGb !== undefined) ? InvestmentSettings.showHiddenGb : 0;
		let lastupdate = (InvestmentSettings && InvestmentSettings.lastupdate !== undefined) ? InvestmentSettings.lastupdate : 0;
		let removeUnsafeCalc = (InvestmentSettings && InvestmentSettings.removeUnsafeCalc !== undefined) ? InvestmentSettings.removeUnsafeCalc : 0;

		b.push(`<div class="total-wrapper dark-bg">`);

		b.push(`<div id="invest-bar">${i18n('Boxes.Investment.InvestBar')} <strong class="invest-storage">0</strong></div>`);
		b.push(`<div id="reward-bar">${i18n('Boxes.Investment.CurrReward')}<strong class="reward-storage">0</strong>${removeUnsafeCalc ? '<span class="safe">  (' + i18n('Boxes.Investment.Safe') + ')</span>':''}</div>`);
		b.push(`<div id="total-fp" class="text-center">${i18n('Boxes.Investment.TotalFP')}<strong class="total-storage-invest">0</strong></div>`);
		
		if (showMedals === 1) {
			b.push('<div id="total-medals" class="text-center"><span class="invest-tooltip icon medal" title="' + HTML.i18nTooltip(i18n('Boxes.Investment.Overview.MedalsProfit')) + '"></span><strong class="total-medals-reward">0</strong></div>');
		}
		b.push(`<div id="hidden-bar" class="hide text-center"><img class="invest-tooltip" src="${extUrl}js/web/investment/images/unvisible.png" title="${i18n('Boxes.Investment.HiddenGB')}" onclick="Investment.ToggleHidden()" /> <strong class="hidden-elements">0</strong></div>`);

		b.push(`</div>`);

		b.push(`<div id="history-wrapper"></div>`);

		$('#InvestmentBody').html(b.join('')).promise().done(function(){
			Investment.CalcFPs();
		});

		// Table for history

		h.push('<table id="InvestmentTable" class="foe-table">');
		h.push('<thead class="sticky">' +
			'<tr class="sorter-header">' +
			'<th class="case-sensitive" data-type="invest-group">' + i18n('Boxes.Investment.Overview.Player') + '</th>' +
			'<th class="case-sensitive" data-type="invest-group">' + i18n('Boxes.Investment.Overview.Building') + '</th>' +
			'<th class="is-number text-center no-sort" data-type="invest-group"></th>');

		if (showEntryDate)
		{
			h.push('<th class="is-number invest-tooltip" data-type="invest-group" title="' + HTML.i18nTooltip(i18n('Boxes.Investment.Overview.EntryTimeDesc')) + '">' + i18n('Boxes.Investment.Overview.EntryTime') + '</th>');
		}

		if (showInvestmentIncreaseDate)
		{
			h.push('<th class="is-number invest-tooltip" data-type="invest-group" title="' + HTML.i18nTooltip(i18n('Boxes.Investment.Overview.DateOfIncreaseDesc')) + '">' + i18n('Boxes.Investment.Overview.DateOfIncrease') + '</th>');
		}

		h.push('<th class="is-number" data-type="invest-group">' + i18n('Boxes.Investment.Overview.Progress') + '</th>');

		if (showRestFp)
		{
			h.push('<th class="is-number text-center invest-tooltip" data-type="invest-group" title="' + HTML.i18nTooltip(i18n('Boxes.Investment.Overview.RestFPDesc')) + '">' + i18n('Boxes.Investment.Overview.RestFP') + '</th>');
		}

		h.push('<th class="is-number text-center" data-type="invest-group">&nbsp;</th>' +
			'<th class="is-number text-center invest-tooltip" data-type="invest-group" title="' + HTML.i18nTooltip(i18n('Boxes.Investment.Overview.InvestedDesc')) + '">' + i18n('Boxes.Investment.Overview.Invested') + '</th>' +
			'<th class="is-number text-center invest-tooltip" data-type="invest-group" title="' + HTML.i18nTooltip(i18n('Boxes.Investment.Overview.ProfitDesc')) + '" >' + i18n('Boxes.Investment.Overview.Profit') + '</th>');
		
		if(showMedals)
		{
			h.push('<th class="is-number text-center" data-type="invest-group"><span class="medal" title="' + HTML.i18nTooltip(i18n('Boxes.Investment.Overview.Medals')) + '"></span></th>');
		}
		
		if(showBlueprints)
		{
			h.push('<th class="is-number text-center" data-type="invest-group"><span class="blueprints" title="' + HTML.i18nTooltip(i18n('Boxes.Investment.Overview.Blueprints')) + '"></span></th>');
		}
		
		h.push('<th class="no-sort"></th></tr></thead><tbody class="invest-group">');

		let CurrentGB = await IndexDB.db.investhistory.reverse().toArray();

		if (CurrentGB === undefined)
			return;

		let data = CurrentGB;

		for (let x = 0; x < data.length; x++)
		{
			const contribution = data[x];
			let Profit = contribution['profit'];
			let RealProfit = Profit - contribution['currentFp'];
			let RealProfitClass = contribution['currentFp'] >= contribution['max_progress'] - contribution['current_progress'] ? 'success' : 'error';

			if (contribution['currentFp'] < contribution['max_progress'] - contribution['current_progress'])
			{
				RealProfitClass = 'warning';
			}
			else if(RealProfit < 0){
				RealProfitClass = 'error';
			}

			let hasFpHistoryClass = '';
			let newerClass = '';
			let DiffText = '';
			let DiffClass = 'error';
			let progressWidth = contribution['current_progress'] / contribution['max_progress'] * 100;
			let restFp = contribution['max_progress'] - contribution['current_progress'];
			let rankImageValue = contribution['rank'] <= 6 ? contribution['rank'] : 6;
			let isHidden = typeof contribution['ishidden'] !== 'undefined' ? contribution['ishidden'] : 0;
			let Blueprints = typeof contribution['blueprints'] !== 'undefined' ? contribution['blueprints'] : 0;
			let Medals = typeof contribution['medals'] !== 'undefined' ? contribution['medals'] : 0;
			let hiddenClass = '';
			let lastInvestmentIncreaseDate = null;
			let history = {};

			if (contribution['fphistory'] !== '[]')
			{
				hasFpHistoryClass = 'fphistory ';
				history = JSON.parse(contribution['fphistory'] || false);
				for (let i in history) {
					if (history.hasOwnProperty(i)) {
						if ((+MainParser.getCurrentDate() - 300 * 1000) < new Date(history[i].date).getTime())
						{
							newerClass = 'new';
						}

						lastInvestmentIncreaseDate = history[i].date;
					}
				}
			}

			if (contribution['increase'] === 0) {
				DiffText = 0;
			} else {
				DiffText = '+' + contribution['increase'];
				DiffClass = 'success';
			}

			hiddenClass=(showHiddenGb && isHidden) ? ' ishidden' : (isHidden) ? ' ishidden hide' : '';

			h.push(`<tr id="invhist${x}" data-id="${contribution['id']}" data-max-progress="${contribution['max_progress']}" data-detail='${JSON.stringify(history)}' class="${hasFpHistoryClass}${newerClass}${hiddenClass}">` +
				`<td class="case-sensitive" data-text="${helper.str.cleanup(contribution['playerName'])}"><img style="max-width: 22px" src="${srcLinks.GetPortrait(contribution['Avatar'])}" alt="${contribution['playerName']}"> ${MainParser.GetPlayerLink(contribution['playerId'], contribution['playerName'])}</td>`);
			h.push('<td class="case-sensitive" data-text="' + helper.str.cleanup(contribution['gbname']) + '">' + contribution['gbname'] + ' (' + contribution['level'] + ')</td>');
			h.push(`<td class="is-number text-center invest-tooltip" data-number="${isHidden}" title="${i18n('Boxes.Investment.Overview.HideGB')}"><span class="hideicon ishidden-${isHidden?'on':'off'}"></span></td>`);
			
			if (showEntryDate) {
				h.push(`<td class="is-numeric" data-number="${moment(contribution['date']).format('YYMMDDHHmm')}">${moment(contribution['date']).format(i18n('Date'))}</td>`);
			}

			if (showInvestmentIncreaseDate) {
				let increaseSort = lastInvestmentIncreaseDate ? moment(lastInvestmentIncreaseDate).format('YYMMDDHHmm') : 0;
				let increaseDate = lastInvestmentIncreaseDate ? moment(lastInvestmentIncreaseDate).format(i18n('DateTime')) : '-';
				h.push(`<td class="is-numeric invest-tooltip" data-number="${increaseSort}">${increaseDate}</td>`);
			}

			h.push(`<td class="is-number progress" data-number="${progressWidth}"><div class="progbar" style="width: ${progressWidth}%"></div> ${contribution['current_progress']} / ${contribution['max_progress']}`);

			if (DiffText !== 0)
			{
				h.push(`<div class="diff ${DiffClass}">${DiffText}</div></td>`);
			}

			h.push(`</td>`);

			if (showRestFp)
			{
				h.push(`<td class="is-number text-center" data-number="${restFp}">${restFp}</td>`);
			}

			h.push(`<td class="is-number text-center" data-number="${contribution['rank']}"><img class="rank invest-tooltip" src="${extUrl}js/web/x_img/gb_p${rankImageValue}.png" title="${i18n('Boxes.Investment.Rank')} ${contribution['rank']}" /></td>`);
			h.push(`<td class="is-number text-center gbinvestment" data-number="${contribution['currentFp']}">${contribution['currentFp']}</td>`);
			h.push(`<td class="is-number text-center gbprofit" data-number="${RealProfit}"><b class="${RealProfitClass}">${RealProfit}</b></td>`);
			
			if(showMedals)
			{
				h.push(`<td class="is-number text-center gbmedals" data-number="${Medals}"><b class="${RealProfitClass === 'error' ? 'success' : RealProfitClass}">${HTML.Format(Medals)}</b></td>`);
			}
			
			if(showBlueprints)
			{
				h.push(`<td class="is-number text-center gbblueprints" data-number="${Blueprints}"><b class="${RealProfitClass === 'error' ? 'success' : RealProfitClass}">${HTML.Format(Blueprints)}</b></td>`);
			}

			h.push('<td></td></tr>');
		}

		h.push('</tbody></table>');

		if (lastupdate)
		{
			let uptodateClass = 'uptodate';

			let date = moment(lastupdate).unix();
			let actdate = moment(MainParser.getCurrentDate()).unix();
			let datediff = actdate - date;
			let updrequTitle = i18n('Boxes.Investment.UpToDate');

			// set notification class if last update ist older then 30 minutes
			if(datediff >= 1800)
			{
				uptodateClass='updaterequired';
				updrequTitle = i18n('Boxes.Investment.UpdateRequired');
			}

			h.push(`<div class="last-update-message invest-tooltip" title="${updrequTitle}"><span class="icon ${uptodateClass}"></span> <span class="${uptodateClass}">${moment(lastupdate).format(i18n('DateTime'))}</span></div>`);
		}

		$('#history-wrapper').html(h.join('')).promise().done(function(){

			$('#InvestmentTable').tableSorter();

			$('#InvestmentTable tbody tr').on('click', function () {

				if ($(this).next("tr.detailview").length)
				{
					$(this).next("tr.detailview").remove();
					$(this).removeClass('open');
				}
				else {
					if (typeof ($(this).attr("data-detail")) !== 'undefined' && $(this).attr("data-detail") !== '{}')
					{
						$(this).addClass('open');
						let id = $(this).attr("id");
						let detail = JSON.parse($(this).attr("data-detail"));
						let max_progress = $(this).attr("data-max-progress");
						let d = [];
						d.push('<tr class="detailview dark-bg"><td colspan="'+$(this).find("td").length+'"><table>');

						for (let i in detail)
						{
							if (detail.hasOwnProperty(i)) {
								let restFP = (max_progress * 1 - detail[i].current_progress * 1)
								d.push('<tr class="detail"><td>' + moment(detail[i].date).format(i18n('DateTime')) + ' :</td><td> +' + detail[i].increase + ' </td><td>' + i18n('Boxes.Investment.Overview.RemainingFP') + ': ' + restFP + '</td></tr>');
							}
						}

						d.push('</table></td></tr>');
						$(d.join('')).insertAfter($('#' + id));
					}
				}
			});

			$("#history-wrapper .hideicon").on('click',function(e){

				e.stopPropagation();

				let otr = $(this).parents("tr");
				let otd = $(this).parent();
				let id = $(otr).attr('data-id');
				let gbstate = parseInt($(otd).attr('data-number'),10);

				//reverse state
				gbstate = (gbstate) ? 0 : 1;

				$(otr).toggleClass('ishidden');
				$(otd).attr('data-number', gbstate);
				$(this).toggleClass('ishidden-on ishidden-off');

				Investment.SwitchGBVisibility(id, gbstate);

				Investment.CalcFPs();
			});

			$('.invest-tooltip').tooltip({
				html: true,
				container: '#history-wrapper'
			});

		});
	},


	ShowInvestmentSettings: () => {
		let c = [],
			InvestmentSettings = JSON.parse(localStorage.getItem('InvestmentSettings')),
			showEntryDate = (InvestmentSettings && InvestmentSettings.showEntryDate !== undefined) ? InvestmentSettings.showEntryDate : 0,
			showInvestmentIncreaseDate = (InvestmentSettings && InvestmentSettings.showInvestmentIncreaseDate !== undefined) ? InvestmentSettings.showInvestmentIncreaseDate : 0,
			showRestFp = (InvestmentSettings && InvestmentSettings.showRestFp !== undefined) ? InvestmentSettings.showRestFp : 0,
			showBlueprints = (InvestmentSettings && InvestmentSettings.showBlueprints !== undefined) ? InvestmentSettings.showBlueprints : 0,
			showMedals = (InvestmentSettings && InvestmentSettings.showMedals !== undefined) ? InvestmentSettings.showMedals : 0,
			showHiddenGb = (InvestmentSettings && InvestmentSettings.showHiddenGb !== undefined) ? InvestmentSettings.showHiddenGb : 0,
			removeUnsafeCalc = (InvestmentSettings && InvestmentSettings.removeUnsafeCalc !== undefined) ? InvestmentSettings.removeUnsafeCalc : 0,
			showinvestmentsautomatically = Settings.GetSetting('ShowInvestments');

		c.push(`<p>${i18n('Boxes.Investment.Overview.AdditionalColumns')}:</p><input id="showentrydate" name="showentrydate" value="1" type="checkbox" ${(showEntryDate === 1) ? ' checked="checked"':''} /> <label for="showentrydate">${i18n('Boxes.Investment.Overview.SettingsEntryTime')}</label><br>`);
		c.push(`<input id="showinvestmentincreasedate" name="showinvestmentincreasedate" value="1" type="checkbox" ${(showInvestmentIncreaseDate === 1) ? ' checked="checked"':''} /> <label for="showinvestmentincreasedate">${i18n('Boxes.Investment.Overview.DateOfIncrease')}</label><br>`);
		c.push(`<input id="showrestfp" name="showrestfp" value="1" type="checkbox" ${(showRestFp === 1) ? ' checked="checked"':''} /> <label for="showrestfp">${i18n('Boxes.Investment.Overview.SettingsRestFP')}</label><br>`);
		c.push(`<input id="showmedals" name="showmedals" value="1" type="checkbox" ${(showMedals === 1) ? ' checked="checked"':''} /> <label for="showmedals">${i18n('Boxes.Investment.Overview.Medals')}</label><br>`);
		c.push(`<input id="showblueprints" name="showblueprints" value="1" type="checkbox" ${(showBlueprints === 1) ? ' checked="checked"':''} /> <label for="showblueprints">${i18n('Boxes.Investment.Overview.Blueprints')}</label><br>`);
		c.push(`<hr /><input id="showhiddengb" name="showhiddengb" value="1" type="checkbox" ${(showHiddenGb === 1) ? ' checked="checked"':''} /> <label for="showhiddengb">${i18n('Boxes.Investment.Overview.SettingsHiddenGB')}</label><br>`);
		c.push(`<input id="removeunsafecalc" name="removeunsafecalc" value="1" type="checkbox" ${(removeUnsafeCalc === 1) ? ' checked="checked"':''} /> <label for="removeunsafecalc">${i18n('Boxes.Investment.Overview.SettingsUnsafeCalc')}</label>`);
		c.push(`<hr /><input id="showinvestmentsautomatically" name="showinvestmentsautomatically" value="1" type="checkbox" ${(showinvestmentsautomatically === true) ? ' checked="checked"':''} /> <label for="showinvestmentsautomatically">${i18n('Boxes.Settings.Autostart')}</label>`);
		c.push(`<p><button id="save-Investment-settings" class="btn" style="width:100%" onclick="Investment.SettingsSaveValues()">${i18n('Boxes.Investment.Overview.SettingsSave')}</button></p>`);

		$('#InvestmentSettingsBox').html(c.join(''));
	},


	RefreshInvestmentDB: async (Investment) => {
		await IndexDB.addUserFromPlayerDictIfNotExists(Investment['playerId'], true);

		let CurrentInvest = await IndexDB.db.investhistory
			.where({
				playerId: Investment['playerId'],
				entity_id: Investment['entity_id']
			})
			.first();

		if (CurrentInvest === undefined)
		{
			await IndexDB.db.investhistory.add({
				playerId: Investment['playerId'],
				playerName: Investment['playerName'],
				Avatar: Investment['Avatar'],
				entity_id: Investment['entity_id'],
				gbname: Investment['gbname'],
				level: Investment['level'],
				rank: Investment['rank'],
				currentFp: Investment['currentFp'],
				fphistory: Investment['fphistory'],
				current_progress: Investment['current_progress'],
				max_progress: Investment['max_progress'],
				profit: Investment['profit'],
				medals: Investment['medals'],
				blueprints: Investment['blueprints'],
				increase: Investment['increase'],
				ishidden: Investment['ishidden'],
				date: MainParser.getCurrentDate()
			});
		}
		else {
			await IndexDB.db.investhistory.update(CurrentInvest.id, {
				currentFp: Investment['currentFp'],
				gbname: Investment['gbname'],
				current_progress: Investment['current_progress'],
				profit: Investment['profit'],
				medals: Investment['medals'],
				blueprints: Investment['blueprints'],
				rank: Investment['rank'],
				fphistory: Investment['fphistory'],
				increase: Investment['increase'],
				ishidden: Investment['ishidden']
			});
		}
	},


	UpdateData: async (LGData, FullSync) => {

		let arc = 1 + (MainParser.ArkBonus / 100);
		let allGB = await IndexDB.db.investhistory.where('id').above(0).keys();
		let UpdatedList = false;
		let playerSyncGbKeys = null;
		let arcLevelCheck = JSON.parse(localStorage.getItem('InvestmentArcBonus'));
		let forceFullUpdate = !arcLevelCheck || arcLevelCheck != MainParser.ArkBonus ? true : false;

		for (let i in LGData)
		{
			if (LGData.hasOwnProperty(i))
			{
				let PlayerID = LGData[i]['player']['player_id'];
				if (PlayerID === ExtPlayerID) continue;
				// if update started from Player GB Overview
				// get all available investment from Storage to check if already leveled
				if (!FullSync && playerSyncGbKeys === null) {
					playerSyncGbKeys = await IndexDB.db.investhistory
						.filter(function (player) {
							return player.playerId === PlayerID;
						})
						.keys();
				}

				if (LGData[i]['forge_points'] === undefined) {
					continue;
				}

				let PlayerName = LGData[i]['player']['name'],
					Avatar = LGData[i]['player']['avatar'],
					EntityID = LGData[i]['entity_id'],
					GBName = LGData[i]['name'],
					GBLevel = LGData[i]['level'],
					CurrentFP = LGData[i]['forge_points'],
					CurrentProgress = LGData[i]['current_progress'],
					MaxProgress = LGData[i]['max_progress'],
					Rank = LGData[i]['rank'],
					increase = 0;
				let CurrentErtrag = 0.0;
				let Medals = 0;
				let Blueprints = 0;
				let Profit = 0;
				let GbhasUpdate = false;
				let arrfphistory = [];
				let isHidden = 0;

				if (undefined !== LGData[i]['reward']) {
					Medals = MainParser.round(LGData[i]['reward']['resources'] !== undefined && LGData[i]['reward']['resources']['medals'] !== undefined ?  LGData[i]['reward']['resources']['medals'] * arc : 0);
					Blueprints = MainParser.round(LGData[i]['reward']['blueprints'] !== undefined ? LGData[i]['reward']['blueprints'] * arc : 0);
					CurrentErtrag = MainParser.round(LGData[i]['reward']['strategy_point_amount'] !== undefined ? LGData[i]['reward']['strategy_point_amount'] * arc : 0);
					Profit = CurrentErtrag;
				}

				let CurrentGB = await IndexDB.db.investhistory
					.where({
						playerId: PlayerID,
						entity_id: EntityID
					})
					.first();

				// Remove GreatBuilding which has a new reinvestment and wasn't updated before
				if (CurrentGB !== undefined && CurrentGB['level'] !== GBLevel){
					await IndexDB.db.investhistory
						.where({
							playerId: PlayerID,
							entity_id: EntityID
						})
						.delete();
					CurrentGB = undefined;
				}

				// LG gefunden mit investierten FP => Wert bekannt
				if (CurrentGB !== undefined && CurrentGB['current_progress'] < CurrentProgress)
				{
					GbhasUpdate = true;
					increase = CurrentProgress - CurrentGB['current_progress'];

					let data = {
						current_progress: CurrentProgress,
						date: MainParser.getCurrentDate(),
						increase: increase
					}

					let fphistory = JSON.parse(CurrentGB['fphistory']);
					for (let i in fphistory) {
						if (fphistory.hasOwnProperty(i)) {
							arrfphistory.push(fphistory[i]);
						}
					}

					arrfphistory.push(data);
				}

				if (CurrentGB !== undefined && FullSync)
				{
					allGB = Investment.remove_key_from_array(allGB, CurrentGB.id);
				}

				if (CurrentGB !== undefined && !FullSync && playerSyncGbKeys !== null)
				{
					playerSyncGbKeys = Investment.remove_key_from_array(playerSyncGbKeys, CurrentGB.id);
				}

				if(CurrentGB !== undefined && (CurrentGB['ishidden'] === undefined || CurrentGB['medals'] === undefined || forceFullUpdate))
				{
					GbhasUpdate=true;
					
					if(!arrfphistory.length)
					{
						arrfphistory = JSON.parse(CurrentGB['fphistory']);
					}
					
					if(CurrentGB['ishidden'] !== undefined) 
					{
						isHidden = CurrentGB['ishidden'];
					}
				}

				if (CurrentGB === undefined || GbhasUpdate)
				{
					UpdatedList = true;
					await Investment.RefreshInvestmentDB({
						playerId: PlayerID,
						playerName: PlayerName,
						Avatar: Avatar,
						entity_id: EntityID,
						gbname: GBName,
						level: GBLevel,
						rank: Rank,
						currentFp: CurrentFP,
						fphistory: JSON.stringify(arrfphistory),
						current_progress: CurrentProgress,
						max_progress: MaxProgress,
						profit: Profit,
						medals: Medals,
						blueprints: Blueprints,
						ishidden: isHidden,
						increase: increase
					});
				}
			}
		}

		// Delete leveled GBs in FullSync from GB Overview
		if (FullSync && allGB.length >= 1)
		{
			UpdatedList=true;
			await IndexDB.db.investhistory.where('id').anyOf(allGB).delete();
		}

		// Delete leveled GBs from GB Player Overview
		if (!FullSync && playerSyncGbKeys !== null && playerSyncGbKeys.length >= 1) {
			UpdatedList=true;
			await IndexDB.db.investhistory.where('id').anyOf(playerSyncGbKeys).delete();
		}

		if (UpdatedList && $('#Investment').length !== 0) {
			Investment.Show();
		}

		// Set Update Date + ArcBonus in local Storage
		if(FullSync){
			let InvestmentSettings = JSON.parse(localStorage.getItem('InvestmentSettings') || '{}');
			InvestmentSettings['lastupdate'] = MainParser.getCurrentDate();
			localStorage.setItem('InvestmentSettings', JSON.stringify(InvestmentSettings));
			localStorage.setItem('InvestmentArcBonus', MainParser.ArkBonus);
		}
	},


	SwitchGBVisibility: async (id,state) => {

		id = parseInt(id);
		await IndexDB.db.investhistory.update(id, {
			ishidden: parseInt(state)
		});

	},


	ToggleHidden: () => {

		let value = JSON.parse(localStorage.getItem('InvestmentSettings') || '{}');

		value['showHiddenGb'] = 1 - value['showHiddenGb'];

		localStorage.setItem('InvestmentSettings', JSON.stringify(value));

		Investment.Show();
	},


	SettingsSaveValues: () => {

		let value = JSON.parse(localStorage.getItem('InvestmentSettings') || '{}');
		let autoOpen = false;

		value['showEntryDate'] = 0;
		value['showRestFp'] = 0;
		value['showBlueprints'] = 0;
		value['showMedals'] = 0;
		value['showHiddenGb'] = 0;
		value['removeUnsafeCalc'] = 0;
		value['showInvestmentIncreaseDate'] = 0;

		if ($("#showentrydate").is(':checked'))
			value['showEntryDate'] = 1;

		if ($("#showrestfp").is(':checked'))
			value['showRestFp'] = 1;

		if ($("#showmedals").is(':checked'))
			value['showMedals'] = 1;

		if ($("#showblueprints").is(':checked'))
			value['showBlueprints'] = 1;

		if ($("#showhiddengb").is(':checked'))
			value['showHiddenGb'] = 1;

		if ($("#removeunsafecalc").is(':checked'))
			value['removeUnsafeCalc'] = 1;

		if ($("#showinvestmentincreasedate").is(':checked'))
			value['showInvestmentIncreaseDate'] = 1;

		if ($("#showinvestmentsautomatically").is(':checked'))
			autoOpen = true;

		localStorage.setItem('ShowInvestments', autoOpen);

		localStorage.setItem('InvestmentSettings', JSON.stringify(value));

		$(`#InvestmentSettingsBox`).fadeToggle('fast', function () {
			$(this).remove();
			Investment.Show();
		});
	},


	remove_key_from_array: (arr, value) => {
		return arr.filter(function (ele) {
			return ele !== value;
		});
	},


	showFPOverview: (startvalues) => {

		let Ertrag = Investment.Ertrag;
		let Einsatz = Investment.Einsatz;
		let Medals = Investment.Medals;
		let hiddenElements = Investment.HiddenElements;

		if(hiddenElements > 0)
		{
			$('#hidden-bar').removeClass('hide');
			$('#hidden-bar .hidden-elements').html(hiddenElements);
		}
		else {
			$('#hidden-bar').addClass('hide');
		}

		let investstart = (startvalues.investsto !== Einsatz) ? startvalues.investsto : 0;

		$('.invest-storage').easy_number_animate({
			start_value: investstart,
			end_value: Einsatz,
			duration: 750
		});

		let rewardstart = (startvalues.rewardsto !== Ertrag) ? startvalues.rewardsto : 0;

		$('.reward-storage').easy_number_animate({
			start_value: rewardstart,
			end_value: Ertrag,
			duration: 750
		});

		let sumTotal = (StrategyPoints.AvailableFP + Ertrag + Einsatz);
		let totalstart = (startvalues.totalsto !== sumTotal) ? startvalues.totalsto : 0;

		$('.total-storage-invest').easy_number_animate({
			start_value: totalstart,
			end_value: sumTotal,
			duration: 750
		});

		let medalsstart = (startvalues.medalssto !== Medals) ? startvalues.medalssto : 0;

		if($("#total-medals").length !== 0) 
		{
			$('.total-medals-reward').easy_number_animate({
				start_value: medalsstart,
				end_value: Medals,
				duration: 750
			});

		}
	}

};