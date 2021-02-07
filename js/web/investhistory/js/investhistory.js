/*
 * **************************************************************************************
 *
 * Dateiname:                 InvestHistory.js
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
    InvestHistory.Data = data.responseData;
    //console.log(data.responseData);
    InvestHistory.UpdateData(InvestHistory.Data, true);
    // wait 2s
    setTimeout(() => {
        InvestHistory.Box();
    }, 2000);

});

let InvestHistory = {
    Data: null,
    Einsatz: 0,
    Ertrag: 0,

    Box: () => {
        if ($('#InvestHistory').length === 0) {
            HTML.Box({
                id: 'InvestHistory',
                title: i18n('Boxes.InvestHistory.Title'),
                auto_close: true,
                resize: true,
                minimize: true,
                dragdrop: true,
                settings: 'InvestHistory.ShowInvestHistorySettings()'
            });
            // CSS in den DOM prügeln
            HTML.AddCssFile('investhistory');
        }
        InvestHistory.Show();
    },

    UpdateData: async (LGData, FullSync) => {

        if (LGData !== null && LGData.length <= 0) {
            return;
        }
        let arc = 1 + (MainParser.ArkBonus / 100);
        let allGB = await IndexDB.db.investhistory.where('id').above(0).keys();
        let UpdatedList = false;

        for (let i in LGData)
        {
            if (LGData.hasOwnProperty(i))
            {
                let PlayerID = LGData[i]['player']['player_id'],
                    PlayerName = LGData[i]['player']['name'],
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

                //console.log(contribution['reward']['strategy_point_amount']);
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

                // LG gefunden mit investierten FP => Wert bekannt
                if (CurrentGB !== undefined && CurrentGB['current_progress'] < CurrentProgress) {
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

                if (CurrentGB !== undefined && FullSync) {
                    allGB = InvestHistory.remove_key_from_array(allGB, CurrentGB.id);
                }

                //console.log("Update");
                if (CurrentGB === undefined || GbhasUpdate) {
                    UpdatedList = true;
                    InvestHistory.RefreshInvestHistoryDB({
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
        // gelevelte LGs löschen
        if (FullSync && allGB.length >= 1) {
            await IndexDB.db.investhistory.where('id').anyOf(allGB).delete();
        }
        if ($("#InvestHistory").length && UpdatedList) {
            // Wait a little for Updating Store
            setTimeout(() => {
                InvestHistory.Show();
            }, 1000);

        }
    },
    remove_key_from_array: (arr, value) => {
        return arr.filter(function (ele) {
            return ele != value;
        });
    },

    RefreshInvestHistoryDB: async (Investment) => {
        await IndexDB.addUserFromPlayerDictIfNotExists(Investment['playerId'], true);
        let CurrentInvest = await IndexDB.db.investhistory
            .where({
                playerId: Investment['playerId'],
                entity_id: Investment['entity_id']
            })
            .first();

        if (CurrentInvest === undefined) {
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
        } else {
            await IndexDB.db.investhistory.update(CurrentInvest.id, {
                currentFp: Investment['currentFp'],
                gbname: Investment['gbname'],
                current_progress: Investment['current_progress'],
                profit: Investment['profit'],
                fphistory: Investment['fphistory'],
                increase: Investment['increase']
            });
        }
    },

    Show: async () => {
        let h = [];
        let InvestHistorySettings = JSON.parse(localStorage.getItem('InvestHistorySettings'));
        let showEntryDate = (InvestHistorySettings && InvestHistorySettings.showEntryDate !== undefined) ? InvestHistorySettings.showEntryDate : 0;
        let showRestFp = (InvestHistorySettings && InvestHistorySettings.showRestFp !== undefined) ? InvestHistorySettings.showRestFp : 0;
        let div = $('#InvestHistoryBody');
        let arc = 1 + (MainParser.ArkBonus / 100);

        h.push('<table id="InvestHistoryTable" class="foe-table sortable-table">');
        h.push('<thead>' +
            '<tr class="sorter-header">' +
            '<th class="case-sensitive" data-type="overview-group">Spieler</th>' +
            '<th class="case-sensitive" data-type="overview-group">Gebäude</th>');
        if (showEntryDate)
            h.push('<th class="is-number" data-type="overview-group" title="Wann wurde der erste Betrag eingezahlt">Eintragszeit</th>');
        h.push('<th class="is-number" data-type="overview-group">Fortschritt</th>');
        if (showRestFp) {
            h.push('<th class="is-number center" data-type="overview-group" title="Wieviele FP noch bis zum leveln">Rest FP</th>');
        }
        h.push('<th class="is-number center" data-type="overview-group">R</th>' +
            '<th class="is-number center" data-type="overview-group" title="Wieviel habe ich eingezahlt">Invest</th>' +
            '<th class="is-number center" data-type="overview-group" title="erzielter Gewinn, gelb -> Platz ist noch nicht sicher, rot/grün -> Verlust/Gewinn sicher" >Gewinn</th>' +
            '</tr>' +
            '</thead><tbody class="overview-group">');

        let CurrentGB = await IndexDB.db.investhistory
            .where('id').above(0)
            .toArray();

        if (CurrentGB === undefined)
            return;

        let data = CurrentGB;

        for (let x = 0; x < data.length; x++) {
            const contribution = data[x];
            let Profit = contribution['profit'];
            let RealProfit = Profit - contribution['currentFp'];
            let RealProfitClass = RealProfit > 0 && contribution['currentFp'] >= contribution['max_progress'] - contribution['current_progress'] ? 'success' : 'error';
            if (contribution['currentFp'] < contribution['max_progress'] - contribution['current_progress']) {
                RealProfitClass = 'warning';
            }
            let hasFpHistory = false;
            let hasFpHistoryClass = '';
            let newerClass = '';
            let detail = [];
            let DiffText = '';
            let DiffClass = 'error';
            let progressWidth = contribution['current_progress'] / contribution['max_progress'] * 100;
            let restFp = contribution['max_progress'] - contribution['current_progress'];
            let rankImageValue = contribution['rank'] <= 6 ? contribution['rank'] : 6;
            let history = {};

            if (contribution['fphistory'] !== '[]') {
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
            h.push(`</td>`);
            if (showRestFp) {
                h.push(`<td class="is-number center" data-number="${restFp}">${restFp}</td>`);
            }
            h.push(`<td class="is-number center" data-number="${contribution['rank']}"><img class="rank" src="${extUrl}js/web/x_img/gb_p${rankImageValue}.png" title="Rang ${contribution['rank']}" /></td>`);
            h.push(`<td class="is-number center" data-number="${contribution['currentFp']}">${contribution['currentFp']}</td>`);
            h.push(`<td class="is-number center" data-number="${RealProfit}"><b class="${RealProfitClass}">${RealProfit}</b></td></tr>`);
        }
        h.push('</tbody></table>');
        $('#InvestHistory').find('#InvestHistoryBody').html(h.join('')).promise().done(function () {
            $('.sortable-table').tableSorter();
            $('.sortable-table tbody tr').on('click', function () {
                if ($(this).next("tr.detailview").length) {
                    $(this).next("tr.detailview").remove();
                } else {
                    if (typeof ($(this).attr("data-detail")) !== 'undefined' && $(this).attr("data-detail") !== '{}') {
                        let id = $(this).attr("id");
                        let detail = JSON.parse($(this).attr("data-detail"));
                        let max_progress = $(this).attr("data-max-progress");
                        let d = [];
                        d.push('<tr class="detailview"><td colspan="6"><table>');

                        for (let i in detail) {
                            if (detail.hasOwnProperty(i)) {
                                let restFP = (max_progress * 1 - detail[i].current_progress * 1)
                                d.push('<tr class="detail"><td>' + moment(detail[i].date).format('DD.MM.YY - H:mm') + ' :</td><td> +' + detail[i].increase + ' </td><td>verbleibende FP: ' + restFP + '</td></tr>');
                            }
                        }

                        d.push('</td></tr>');
                        $(d.join('')).insertAfter($('#' + id));
                    }
                }
            });
        });
    },

    ShowInvestHistorySettings: () => {
        let c = [],
            InvestHistorySettings = JSON.parse(localStorage.getItem('InvestHistorySettings')),
            showEntryDate = (InvestHistorySettings && InvestHistorySettings.showEntryDate !== undefined) ? InvestHistorySettings.showEntryDate : 0,
            showRestFp = (InvestHistorySettings && InvestHistorySettings.showRestFp !== undefined) ? InvestHistorySettings.showRestFp : 0;
        c.push(`<p class="text-center"><input id="showentrydate" name="showentrydate" value="1" type="checkbox" ${(showEntryDate === 1) ? ' checked="checked"':''} /> <label for="showentrydate">Zeige Eintragsdatum</label></p>`);
        c.push(`<p class="text-center"><input id="showrestfp" name="showrestfp" value="1" type="checkbox" ${(showRestFp === 1) ? ' checked="checked"':''} /> <label for="showrestfp">Zeige restliche FP</label></p>`);
        c.push(`<hr><p><button id="save-InvestHistory-settings" class="btn btn-default" style="width:100%" onclick="InvestHistory.SettingsSaveValues()">${i18n('Boxes.Calculator.Settings.Save')}</button></p>`);
        $('#InvestHistorySettingsBox').html(c.join(''));

    },

    SettingsSaveValues: () => {
        let value = {};
        value.showEntryDate = 0;
        value.showRestFp = 0;

        if ($("#showentrydate").is(':checked')) {
            value.showEntryDate = 1;
        }

        if ($("#showrestfp").is(':checked')) {
            value.showRestFp = 1;
        }

        localStorage.setItem('InvestHistorySettings', JSON.stringify(value));

        $(`#InvestHistorySettingsBox`).fadeToggle('fast', function () {
            $(this).remove();
            InvestHistory.Show();
        });
    }
};