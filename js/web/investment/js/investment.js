/*
 * **************************************************************************************
 *
 * Dateiname:                 investment.js
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

// LG Investitionen
FoEproxy.addHandler('GreatBuildingsService', 'getContributions', (data) => {
	Investment.Data = data['responseData'];

    Investment.UpdateData(Investment.Data, true).then((e) => {
        if (Settings.GetSetting('ShowInvestments')){
            Investment.BuildBox(true);
        }
    });

    Investment.SendToServer();
});


let Investment = {
	Data: null,
    Einsatz: 0,
    Ertrag: 0,


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
    CalcFPs: ()=> {

		if (Investment.Data === null || (Investment.Data !== null && Investment.Data.length <= 0)){
			return;
		}

		let data = Investment.Data;

        Investment.Einsatz = 0;
        Investment.Ertrag = 0;

        let arc = 1 + (MainParser.ArkBonus / 100);

        for (let x = 0; x < data.length; x++) {
            const contribution = data[x];

            Investment.Einsatz += contribution['forge_points'];

            if (undefined !== contribution['reward']) {
                let CurrentErtrag = MainParser.round(contribution['reward']['strategy_point_amount'] !== undefined ? contribution['reward']['strategy_point_amount'] * arc : 0);
                
                if (contribution['forge_points'] >= contribution['max_progress'] - contribution['current_progress']) {
                    Investment.Ertrag += CurrentErtrag;
                }

                // Platz kann nicht sicher sein => Nur maximal Einzahlung ansetzen
                else {
                    Investment.Ertrag += Math.min(contribution['forge_points'], CurrentErtrag);
                }
            }
        }
    },


    Show: async ()=> {

        Investment.CalcFPs();

        let Gewinn = Investment.Ertrag - Investment.Einsatz;

        let b = [],
            h = [];

        b.push(`<div class="total-wrapper dark-bg">`);

        if (Investment.Data !== null && Investment.Data.length > 0){
            b.push(`<div id="invest-bar">${i18n('Boxes.Investment.InvestBar')} <strong class="invest-storage">0</strong></div>`);
            b.push(`<div id="reward-bar">${i18n('Boxes.Investment.CurrReward')}<strong class="reward-storage">0</strong></div>`);
        }
        
        b.push(`<div id="total-fp" class="text-center">${i18n('Boxes.Investment.TotalFP')}<strong class="total-storage-invest">0</strong></div>`);

        b.push(`</div>`);

        b.push(`<div id="history-wrapper"></div>`);

        $('#InvestmentBody').html(b.join(''));


        // Table for history

        let InvestmentSettings = JSON.parse(localStorage.getItem('InvestmentSettings'));
        let showEntryDate = (InvestmentSettings && InvestmentSettings.showEntryDate !== undefined) ? InvestmentSettings.showEntryDate : 0;
        let showRestFp = (InvestmentSettings && InvestmentSettings.showRestFp !== undefined) ? InvestmentSettings.showRestFp : 0;

        h.push('<table id="InvestmentTable" class="foe-table sortable-table">');
        h.push('<thead>' +
            '<tr class="sorter-header">' +
            '<th class="case-sensitive" data-type="overview-group">Spieler</th>' +
            '<th class="case-sensitive" data-type="overview-group">Gebäude</th>');

        if (showEntryDate)
            h.push('<th class="is-number" data-type="overview-group" title="Wann wurde der erste Betrag eingezahlt">Eintragszeit</th>');

        h.push('<th class="is-number" data-type="overview-group">Fortschritt</th>');

        if (showRestFp) {
            h.push('<th class="is-number text-center" data-type="overview-group" title="Wieviele FP noch bis zum leveln">Rest FP</th>');
        }

        h.push('<th class="is-number text-center" data-type="overview-group">&nbsp;</th>' +
            '<th class="is-number text-center" data-type="overview-group" title="Wieviel habe ich eingezahlt">Invest</th>' +
            '<th class="is-number text-center" data-type="overview-group" title="erzielter Gewinn, gelb -> Platz ist noch nicht sicher, rot/grün -> Verlust/Gewinn sicher" >Gewinn</th>' +
            '</tr>' +
            '</thead><tbody class="overview-group">');

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

            if (contribution['currentFp'] < contribution['max_progress'] - contribution['current_progress']) {
                RealProfitClass = 'warning';
            }
            else if(RealProfit < 0){
                RealProfitClass = 'error';
            }

            let hasFpHistory = false;
            let hasFpHistoryClass = '';
            let newerClass = '';
            let DiffText = '';
            let DiffClass = 'error';
            let progressWidth = contribution['current_progress'] / contribution['max_progress'] * 100;
            let restFp = contribution['max_progress'] - contribution['current_progress'];
            let rankImageValue = contribution['rank'] <= 6 ? contribution['rank'] : 6;
            let history = {};

            if (contribution['fphistory'] !== '[]')
            {
                hasFpHistory = true;
                hasFpHistoryClass = 'fphistory ';
                history = JSON.parse(contribution['fphistory'] || false);
                for (let i in history) {
                    if (history.hasOwnProperty(i)) {
                        if ((+MainParser.getCurrentDate() - 300 * 1000) < new Date(history[i].date).getTime())
                            newerClass = 'new';
                    }
                }
            }

            if (contribution['increase'] === 0) {
                DiffText = 0;
            } else {
                DiffText = '+' + contribution['increase'];
                DiffClass = 'success';
            }

            h.push(`<tr id="invhist${x}" data-max-progress="${contribution['max_progress']}" data-detail='${JSON.stringify(history)}' class="${hasFpHistoryClass}${newerClass}"><td class="case-sensitive" data-text="${contribution['playerName'].toLowerCase().replace(/[\W_ ]+/g, "")}"><img style="max-width: 22px" src="${MainParser.InnoCDN + 'assets/shared/avatars/' + MainParser.PlayerPortraits[contribution['Avatar']]}.jpg" alt="${contribution['playerName']}"> ${contribution['playerName']}</td>`);
            h.push('<td class="case-sensitive" data-text="' + contribution['gbname'].toLowerCase().replace(/[\W_ ]+/g, "") + '">' + contribution['gbname'] + ' (' + contribution['level'] + ')</td>');
            if (showEntryDate) {
                h.push(`<td class="is-numeric" data-number="${moment(contribution['date']).format('YYMMDDHmm')}">${moment(contribution['date']).format('DD.MM.-H:mm')}</td>`);
            }
            h.push(`<td class="is-number progress" data-number="${progressWidth}"><div class="progbar" style="width: ${progressWidth}%"></div> ${contribution['current_progress']} / ${contribution['max_progress']}`);
            if (DiffText !== 0)
                h.push(`<div class="diff ${DiffClass}">${DiffText}</div></td>`);
            h.push(`</td>`);            if (showRestFp) {
                h.push(`<td class="is-number text-center" data-number="${restFp}">${restFp}</td>`);
            }
            h.push(`<td class="is-number text-center" data-number="${contribution['rank']}"><img class="rank" src="${extUrl}js/web/x_img/gb_p${rankImageValue}.png" title="Rang ${contribution['rank']}" /></td>`);
            h.push(`<td class="is-number text-center" data-number="${contribution['currentFp']}">${contribution['currentFp']}</td>`);
            h.push(`<td class="is-number text-center" data-number="${RealProfit}"><b class="${RealProfitClass}">${RealProfit}</b></td></tr>`);
        }

        h.push('</tbody></table>');

        $('#history-wrapper').html(h.join('')).promise().done(function(){

            $('.invest-storage').easy_number_animate({
                start_value: 0,
                end_value: Investment.Einsatz,
                duration: 750
            });

            $('.reward-storage').easy_number_animate({
                start_value: 0,
                end_value: Gewinn,
                duration: 750
            });

            $('.total-storage-invest').easy_number_animate({
                start_value: 0,
                end_value: (StrategyPoints.AvailableFP + Investment.Ertrag),
                duration: 750
            });

            $('.sortable-table').tableSorter();

            $('.sortable-table tbody tr').on('click', function () {
                if ($(this).next("tr.detailview").length) {
                    $(this).next("tr.detailview").remove();
                    $(this).removeClass('open');
                } else {
                    if (typeof ($(this).attr("data-detail")) !== 'undefined' && $(this).attr("data-detail") !== '{}') {
                        $(this).addClass('open');
                        let id = $(this).attr("id");
                        let detail = JSON.parse($(this).attr("data-detail"));
                        let max_progress = $(this).attr("data-max-progress");
                        let d = [];
                        d.push('<tr class="detailview dark-bg"><td colspan="'+$(this).find("td").length+'"><table>');

                        for (let i in detail) {
                            if (detail.hasOwnProperty(i)) {
                                let restFP = (max_progress * 1 - detail[i].current_progress * 1)
                                d.push('<tr class="detail"><td>' + moment(detail[i].date).format('DD.MM.YY - H:mm') + ' :</td><td> +' + detail[i].increase + ' </td><td>verbleibende FP: ' + restFP + '</td></tr>');
                            }
                        }

                        d.push('</table></td></tr>');
                        $(d.join('')).insertAfter($('#' + id));
                    }
                }
            });
        });
    },


    ShowInvestmentSettings: () => {
        let c = [],
            InvestmentSettings = JSON.parse(localStorage.getItem('InvestmentSettings')),
            showEntryDate = (InvestmentSettings && InvestmentSettings.showEntryDate !== undefined) ? InvestmentSettings.showEntryDate : 0,
            showRestFp = (InvestmentSettings && InvestmentSettings.showRestFp !== undefined) ? InvestmentSettings.showRestFp : 0;

        c.push(`<p class="text-center"><input id="showentrydate" name="showentrydate" value="1" type="checkbox" ${(showEntryDate === 1) ? ' checked="checked"':''} /> <label for="showentrydate">Zeige Eintragsdatum</label></p>`);
        c.push(`<p class="text-center"><input id="showrestfp" name="showrestfp" value="1" type="checkbox" ${(showRestFp === 1) ? ' checked="checked"':''} /> <label for="showrestfp">Zeige restliche FP</label></p>`);
        c.push(`<hr><p><button id="save-Investment-settings" class="btn btn-default" style="width:100%" onclick="Investment.SettingsSaveValues()">${i18n('Boxes.Calculator.Settings.Save')}</button></p>`);

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
                increase: Investment['increase'],
                date: MainParser.getCurrentDate()
            });
        }
        else {
            await IndexDB.db.investhistory.update(CurrentInvest.id, {
                currentFp: Investment['currentFp'],
                gbname: Investment['gbname'],
                current_progress: Investment['current_progress'],
                profit: Investment['profit'],
                rank: Investment['rank'],
                fphistory: Investment['fphistory'],
                increase: Investment['increase']
            });
        }
    },


    UpdateData: async (LGData, FullSync) => {

        if (LGData !== null && LGData.length <= 0) {
            return;
        }

        let arc = 1 + (MainParser.ArkBonus / 100);
        let allGB = await IndexDB.db.investhistory.where('id').above(0).keys();
        let UpdatedList = false;
        let playerSyncGbKeys = null;

        for (let i in LGData)
        {
            if (LGData.hasOwnProperty(i))
            {
                let PlayerID = LGData[i]['player']['player_id'];

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
                let Profit = 0;
                let GbhasUpdate = false;
                let arrfphistory = [];

                if (undefined !== LGData[i]['reward']) {
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
                if (CurrentGB !== undefined && CurrentGB['level'] != GBLevel){
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

                if (CurrentGB !== undefined && !FullSync) {
                    playerSyncGbKeys = Investment.remove_key_from_array(playerSyncGbKeys, CurrentGB.id);
                }

                if (CurrentGB === undefined || GbhasUpdate)
                {
                    UpdatedList = true;
                    Investment.RefreshInvestmentDB({
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
        if (!FullSync && playerSyncGbKeys.length >= 1) {
            UpdatedList=true;
            await IndexDB.db.investhistory.where('id').anyOf(playerSyncGbKeys).delete();
        }
        
        if (UpdatedList && $('#Investment').length !== 0) {
            Investment.Show();
        }
    },
    

    SettingsSaveValues: () => {
        let value = {};

        value.showEntryDate = 0;
        value.showRestFp = 0;

        if ($("#showentrydate").is(':checked'))
        {
            value.showEntryDate = 1;
        }

        if ($("#showrestfp").is(':checked'))
        {
            value.showRestFp = 1;
        }

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
    
    
	/**
	 * If wanted, send to server
	 */
	SendToServer: ()=> {

		if (!Settings.GetSetting('GlobalSend') || !Settings.GetSetting('SendInvestigations')){
			return;
		}

		if (MainParser.checkNextUpdate('LGInvestments') !== true){
			return;
		}

		if (Investment.Data === null || Investment.Data.length <= 0){
			return;
		}

		MainParser.send2Server(Investment.Data, 'LGInvestments', function(r){
			HTML.ShowToastMsg({
				head: i18n('API.UpdateSuccess'),
				text: i18n('API.LGInvest'),
				type: 'success'
			});
		});
	}
};
