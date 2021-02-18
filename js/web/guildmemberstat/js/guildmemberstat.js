FoEproxy.addHandler('ClanService', 'getOwnClanData', (data, postData) => {
    let requestMethod = postData[0]['requestMethod'];
    if (requestMethod === 'getOwnClanData') {
        GuildMemberStat.Data = data.responseData;

        if ($('#guildmemberstat-Btn').hasClass('hud-btn-red')) {
            $('#guildmemberstat-Btn').removeClass('hud-btn-red');
            $('#guildmemberstat-Btn-closed').remove();
        }
        if (GuildMemberStat.Data !== undefined) {
            GuildMemberStat.UpdateData('clandata', null);
        }
        //GuildMemberStat.BuildBox(false);
    }
});

// Forum Activity 
FoEproxy.addHandler('ConversationService', 'getConversation', (data, postData) => {
    let ConversationData = data.responseData;
    if (ConversationData !== undefined) {
        GuildMemberStat.UpdateData('forum', ConversationData);
    }
});

FoEproxy.addHandler('ConversationService', 'getMessages', (data, postData) => {
    let ConversationData = data.responseData;
    if (ConversationData !== undefined) {
        GuildMemberStat.UpdateData('forum', {
            messages: ConversationData
        });
    }
});

// GEX member statistic
FoEproxy.addHandler('GuildExpeditionService', 'getContributionList', (data, postData) => {
    GuildMemberStat.GexData = data.responseData;
    if (GuildMemberStat.GexData !== undefined) {
        GuildMemberStat.UpdateData('gex', null);
    }

});

FoEproxy.addHandler('GuildExpeditionService', 'getOverview', (data, postData) => {
    let Data = data.responseData;
    if (Data !== undefined) {
        if (data.responseData['state'] !== 'inactive') {
            GuildMemberStat.GEXId = Data.nextStateTime;
        } else {
            GuildMemberStat.GEXId = (Data.nextStateTime * 1 - 86400);
        }
    }
});



// GuildBattleGround member statistic
FoEproxy.addHandler('GuildBattlegroundService', 'getPlayerLeaderboard', (data, postData) => {
    GuildMemberStat.GBGData = data.responseData;
    if (GuildMemberStat.GBGData !== undefined) {
        GuildMemberStat.UpdateData('gbg', null);
    }
});

FoEproxy.addHandler('GuildBattlegroundService', 'getBattleground', (data, postData) => {
    let Data = data.responseData;
    if (Data !== undefined) {
        GuildMemberStat.GBFId = Data.endsAt;
    }
});

FoEproxy.addHandler('GuildBattlegroundStateService', 'getState', (data, postData) => {
    if (data.responseData['stateId'] !== 'participating') {
        let Data = data.responseData;
        if (Data !== undefined) {
            GuildMemberStat.GBFId = parseInt(Data.startsAt) - 259200;
            GuildMemberStat.UpdateData('gbg', data.responseData['playerLeaderboardEntries']);
        }
    }
});


let GuildMemberStat = {
    Data: undefined,
    GexData: undefined,
    GBGData: undefined,
    GBFId: undefined,
    GEXId: undefined,
    AllMemberKeys: [],


    /**
     *
     * @returns {Promise<void>}
     */
    checkForDB: async (playerID) => {
        const DBName = `FoeHelperDB_GuildMemberStat_${playerID}`;

        GuildMemberStat.db = new Dexie(DBName);

        GuildMemberStat.db.version(1).stores({
            player: '++id, player_id, score, deleted',
            gex: '++id, player_id, gexweek, &[player_id+gexweek], solvedEncounters',
            gbg: '++id, player_id, gbgid, &[player_id+gbgid], battlesWon, negotiationsWon, rank',
            activity: 'player_id',
            warning: 'player_id',
            forum: 'player_id'
        });

        GuildMemberStat.db.open();
    },



    BuildBox: (event) => {
        if ($('#GuildMemberStat').length === 0) {
            HTML.Box({
                id: 'GuildMemberStat',
                title: i18n('Boxes.GuildMemberStat.Title'),
                auto_close: true,
                dragdrop: true,
                resize: true,
                minimize: true,
                settings: 'GuildMemberStat.GuildMemberStatSettings()'
            });

            HTML.AddCssFile('guildmemberstat');
        } else if (!event) {
            HTML.CloseOpenBox('GuildMemberStat');
            return;
        }

        GuildMemberStat.Show();
    },


    UpdateData: async (source, data) => {
        switch (source) {
            case 'clandata':
                let memberdata = GuildMemberStat.Data.members;

                if (typeof memberdata == 'undefined') {
                    return;
                }

                // Recognize member which are gone
                GuildMemberStat.AllMemberKeys = await GuildMemberStat.db.player.where('id').equals(0).keys();

                for (let i in memberdata) {
                    if (memberdata.hasOwnProperty(i)) {

                        GuildMemberStat.RefreshGuildMemberDB(memberdata[i]);

                        if (memberdata[i].activity < 2) {
                            let Warning = {
                                player_id: memberdata[i].player_id,
                                lastwarn: moment(MainParser.getCurrentDate()).format('DD.MM.YYYY'),
                                warnings: [{
                                    activity: 1,
                                    date: moment(MainParser.getCurrentDate()).format('DD.MM.YYYY')
                                }]
                            }
                            GuildMemberStat.SetActivityWarning(Warning, false);
                        }
                    }
                }

                // Insert update time
                let GuildMemberStatSettings = JSON.parse(localStorage.getItem('GuildMemberStatSettings') || '{}');
                GuildMemberStatSettings['lastupdate'] = MainParser.getCurrentDate();
                localStorage.setItem('GuildMemberStatSettings', JSON.stringify(GuildMemberStatSettings));

                // Wait a little before delete gone members
                setTimeout(() => {
                    if (GuildMemberStat.AllMemberKeys.length >= 1) {
                        GuildMemberStat.DeleteGuildMemberDB(GuildMemberStat.AllMemberKeys);
                        GuildMemberStat.AllMemberKeys = [];
                    }
                }, 1000);

                break;

            case 'gex':
                let gexdata = GuildMemberStat.GexData;

                if (typeof gexdata == 'undefined') {
                    return;
                }
                let gexid = GuildMemberStat.GEXId;
                for (let i in gexdata) {
                    if (gexdata.hasOwnProperty(i)) {
                        let rank = (i * 1 + 1);
                        let gexDB = {
                            gexweek: gexid,
                            rank: rank,
                            data: gexdata[i]
                        }
                        GuildMemberStat.RefreshPlayerGexDB(gexDB);
                    }
                }
                break;

            case 'gbg':
                let gbgdata = [];

                if (data !== null) {
                    gbgdata = data;
                } else {
                    gbgdata = GuildMemberStat.GBGData;
                }

                if (typeof gbgdata == 'undefined') {
                    return;
                }
                let gbgid = GuildMemberStat.GBFId;

                for (let i in gbgdata) {
                    if (gbgdata.hasOwnProperty(i)) {
                        let gbgDB = {
                            gbgid: gbgid,
                            data: gbgdata[i]
                        }
                        GuildMemberStat.RefreshPlayerGBGDB(gbgDB);
                    }
                }
                break;

            case 'forum':
                let messagedata = data.messages;
                if (typeof messagedata == 'undefined') {
                    return;
                }
                let messages = [];
                for (let i in messagedata) {
                    if (messagedata.hasOwnProperty(i)) {
                        if (typeof messagedata[i].sender != 'undefined' && typeof messagedata[i].sender.player_id != 'undefined') {
                            let m = {
                                player_id: messagedata[i].sender.player_id,
                                message_id: messagedata[i].id
                            }
                            messages.push(m);
                        }
                    }
                }
                GuildMemberStat.RefreshForumDB(messages);
                break;

        }
    },

    SetActivityWarning: async (Warning, force) => {

        let playerID = Warning.player_id;

        let CurrentMember = await GuildMemberStat.db.activity
            .where({
                player_id: playerID
            })
            .first();

        if (CurrentMember === undefined) {
            await GuildMemberStat.db.activity.put(Warning);
        } else {

            if ((moment(MainParser.getCurrentDate()).format('DD.MM.YYYY') != CurrentMember.lastwarn) || force) {
                await GuildMemberStat.db.activity.where('player_id').equals(playerID).modify(x => x.warnings.push(Warning.warnings[0]));
                await GuildMemberStat.db.activity.update(CurrentMember.player_id, {
                    lastwarn: Warning.lastwarn
                });

            }
        }
    },


    RefreshForumDB: async (Messages) => {
        for (let i in Messages) {
            let player_id = Messages[i].player_id;
            let message_id = Messages[i].message_id;
            let CurrentData = await GuildMemberStat.db.forum
                .where({
                    player_id: player_id
                })
                .first();

            if (CurrentData === undefined) {
                let m = [];
                m.push(message_id);
                await GuildMemberStat.db.forum.add({
                    player_id: player_id,
                    message_id: m,
                    lastupdate: MainParser.getCurrentDate()
                });
            } else {
                let message_ids = CurrentData.message_id;
                message_ids.push(message_id);

                await GuildMemberStat.db.forum.put({
                    player_id: player_id,
                    message_id: GuildMemberStat.uniq_array(message_ids),
                    lastupdate: MainParser.getCurrentDate()
                });
            }
        }
    },

    RefreshPlayerGBGDB: async (Member) => {
        let GBGPlayer = Member.data;
        let gbgid = Member.gbgid;
        let rank = (typeof GBGPlayer.rank != 'undefined' ? GBGPlayer.rank : 0);
        let battlesWon = (typeof GBGPlayer['battlesWon'] != 'undefined' ? GBGPlayer['battlesWon'] : 0);
        let negotiationsWon = (typeof GBGPlayer['negotiationsWon'] != 'undefined' ? GBGPlayer['negotiationsWon'] : 0);

        let CurrentGBGData = await GuildMemberStat.db.gbg
            .where({
                player_id: GBGPlayer.player.player_id,
                gbgid: gbgid
            })
            .first();

        if (CurrentGBGData === undefined) {
            await GuildMemberStat.db.gbg.add({
                player_id: GBGPlayer.player.player_id,
                gbgid: gbgid,
                battlesWon: battlesWon,
                negotiationsWon: negotiationsWon,
                rank: rank
            });
        } else {
            await GuildMemberStat.db.gbg.update(CurrentGBGData.id, {
                battlesWon: battlesWon,
                negotiationsWon: negotiationsWon,
                rank: rank
            });
        }
    },


    RefreshPlayerGexDB: async (Member) => {

        let GexPlayer = Member.data;
        let gexweek = Member.gexweek;
        let rank = Member.rank;

        let solvedEncounters = (typeof GexPlayer['solvedEncounters'] != 'undefined' ? GexPlayer['solvedEncounters'] : 0);
        let expeditionPoints = (typeof GexPlayer['expeditionPoints'] != 'undefined' ? GexPlayer['expeditionPoints'] : 0);

        let CurrentGexData = await GuildMemberStat.db.gex
            .where({
                player_id: GexPlayer.player.player_id,
                gexweek: gexweek
            })
            .first();

        if (CurrentGexData === undefined) {
            await GuildMemberStat.db.gex.add({
                player_id: GexPlayer.player.player_id,
                gexweek: gexweek,
                solvedEncounters: solvedEncounters,
                expeditionPoints: expeditionPoints,
                rank: rank
            });
        } else {
            await GuildMemberStat.db.gex.update(CurrentGexData.id, {
                solvedEncounters: solvedEncounters,
                expeditionPoints: expeditionPoints,
                rank: rank
            });
        }
    },


    RefreshGuildMemberDB: async (Member) => {

        let CurrentMember = await GuildMemberStat.db.player
            .where({
                player_id: Member['player_id']
            })
            .first();

        if (CurrentMember === undefined) {
            await GuildMemberStat.db.player.add({
                player_id: Member['player_id'],
                name: Member['name'],
                era: Member['era'],
                avatar: Member['avatar'],
                score: Member['score'],
                is_online: Member['is_online'],
                is_active: Member['is_active'],
                city_name: Member['city_name'],
                activity: Member['activity'],
                date: MainParser.getCurrentDate(),
                deleted: 0,
                updated: MainParser.getCurrentDate()
            });
        } else {

            GuildMemberStat.AllMemberKeys = GuildMemberStat.remove_key_from_array(GuildMemberStat.AllMemberKeys, parseInt(CurrentMember.id));

            await GuildMemberStat.db.player.update(CurrentMember.id, {
                name: Member['name'],
                era: Member['era'],
                avatar: Member['avatar'],
                score: Member['score'],
                is_online: Member['is_online'],
                is_active: Member['is_active'],
                city_name: Member['city_name'],
                activity: Member['activity'],
                deleted: 0,
                updated: MainParser.getCurrentDate()
            });
        }
    },


    DeleteGuildMemberDB: async (arr) => {

        for (let id in arr) {
            await GuildMemberStat.db.player.update(arr[id], {
                deleted: MainParser.getCurrentDate()
            });
        }
    },


    Show: async () => {

        let h = [];

        let GuildMemberStatSettings = JSON.parse(localStorage.getItem('GuildMemberStatSettings'));
        let lastupdate = (GuildMemberStatSettings && GuildMemberStatSettings.lastupdate !== undefined) ? GuildMemberStatSettings.lastupdate : 0;


        h.push('<table id="GuildMemberTable" class="foe-table sortable-table">');
        h.push('<thead>' +
            '<tr class="sorter-header">' +
            '<th class="case-sensitive" data-type="overview-group">Spieler</th>' +
            '<th class="is-number" data-type="overview-group">Punkte</th>' +
            '<th class="case-sensitive" data-type="overview-group">Zeitalter</th>' +
            '<th class="is-number" data-type="overview-group">Aktivität</th>' +
            '<th class="is-number" data-type="overview-group">Posts</th>' +
            '<th class="is-number" data-type="overview-group">GEX</th>' +
            '<th class="is-number" data-type="overview-group">GG</th>' +
            '</tr>' +
            '</thead><tbody class="overview-group">');

        let CurrentMember = await GuildMemberStat.db.player.orderBy('score').reverse().toArray();

        if (CurrentMember === undefined)
            return;

        let data = CurrentMember;

        for (let x = 0; x < data.length; x++) {

            let ActWarnCount = 0;
            let gexActivityCount = 0;
            let gbgActivityCount = 0;
            let forumActivityCount = 0;
            let hasDetail = false;

            const contribution = data[x];

            // Get inactivity warnings
            let activityWarnings = await GuildMemberStat.db.activity.where('player_id').equals(contribution['player_id']).toArray();

            if (activityWarnings !== undefined && typeof activityWarnings[0] != 'undefined') {
                ActWarnCount = activityWarnings[0].warnings.length;
                if (ActWarnCount > 0)
                    hasDetail = true;
            } else activityWarnings = {};

            // Get gex activity

            let gexActivity = await GuildMemberStat.db.gex.where('player_id').equals(contribution['player_id']).and(function (item) {
                return item.solvedEncounters > 0
            }).toArray();
            if (gexActivity !== undefined) {
                gexActivityCount = gexActivity.length;
                if (gexActivityCount > 0)
                    hasDetail = true;

            } else gexActivity = {};

            // Get GBG activity

            let gbgActivity = await GuildMemberStat.db.gbg.where('player_id').equals(contribution['player_id']).and(function (item) {
                return (item.battlesWon > 0 || item.negotiationsWon > 0) ? true : false
            }).toArray();
            if (gbgActivity !== undefined) {
                gbgActivityCount = gbgActivity.length;
                if (gbgActivityCount > 0)
                    hasDetail = true;
            } else gbgActivity = {};

            // Get forum posts

            let forumActivity = await GuildMemberStat.db.forum.where({
                player_id: contribution['player_id']
            }).first();
            if (forumActivity !== undefined) {
                forumActivityCount = forumActivity.message_id.length;

            } else forumActivity = {};
            let stateClass = "normal";
            if (forumActivityCount <= 5 && gbgActivityCount == 0 && gexActivityCount == 0) {
                stateClass = "warning";
            }
            if (stateClass == "warning" && ActWarnCount > 0) {
                stateClass = "error";
            }

            deletedMember = (typeof contribution['deleted'] != 'undefined' && contribution['deleted'] != 0) ? true : false;

            h.push(`<tr id="invhist${x}" class="${hasDetail?'hasdetail ':''}${deletedMember?'strikeout ':''}${stateClass}"  data-warnings='${JSON.stringify(activityWarnings)}' data-gex='${JSON.stringify(gexActivity)}' data-gbg='${JSON.stringify(gbgActivity)}'>`);
            h.push(`<td class="case-sensitive gms-tooltip" data-text="${contribution['name'].toLowerCase().replace(/[\W_ ]+/g, "")}" title="ID: ${contribution['player_id']}"><img style="max-width: 22px" src="${MainParser.InnoCDN + 'assets/shared/avatars/' + MainParser.PlayerPortraits[contribution['avatar']]}.jpg" alt="${contribution['name']}"> ${contribution['name']}</td>`);
            h.push(`<td class="is-number" data-number="${contribution['score']}">${HTML.Format(contribution['score'])}</td>`);
            h.push(`<td class="case-sensitive" data-text="${i18n('Eras.'+Technologies.Eras[contribution['era']]).toLowerCase().replace(/[\W_ ]+/g, "")}">${i18n('Eras.'+Technologies.Eras[contribution['era']])}</td>`);
            h.push(`<td class="is-number" data-number="${contribution['activity']}"><img src="${extUrl}js/web/guildmemberstat/images/act_${contribution['activity']}.png" /> ${ActWarnCount > 0 ? '<span class="warn">(' + ActWarnCount + ')</span>' : ''}</td>`);
            h.push(`<td class="is-number" data-number="${forumActivityCount}">${forumActivityCount}</td>`);
            h.push(`<td class="is-number" data-number="${gexActivityCount}">${gexActivityCount}</td>`);
            h.push(`<td class="is-number" data-number="${gbgActivityCount}">${gbgActivityCount}</td>`);
            h.push(`</tr>`);

        }
        h.push(`</tbody></table>`);

        if (lastupdate != 0) {
            let uptodateClass = 'uptodate';
            let date = moment(lastupdate).unix();
            let actdate = moment(MainParser.getCurrentDate()).unix();
            if (actdate - date >= 20) {
                uptodateClass = 'updaterequired';
            }
            h.push(`<div class="last-update-message"><span class="icon ${uptodateClass}"></span> <span class="${uptodateClass}">${moment(lastupdate).format('DD.MM.YY-HH:mm')}</span></div>`);
        }

        $('#GuildMemberStatBody').html(h.join('')).promise().done(function () {
            $('.sortable-table').tableSorter();

            $('.gms-tooltip').tooltip({
                html: true,
                container: '#GuildMemberStatBody'
            });

            $('.sortable-table tbody tr').on('click', function () {
                if ($(this).next("tr.detailview").length) {
                    $(this).next("tr.detailview").remove();
                    $(this).removeClass('open');
                } else {

                    if ($(this).hasClass("hasdetail")) {

                        let d = [];
                        d.push('<tr class="detailview dark-bg"><td colspan="' + $(this).find("td").length + '"><div class="detail-wrapper">');

                        $(this).addClass('open');
                        let id = $(this).attr("id");

                        if (typeof $(this).attr("data-warnings") !== 'undefined' && $(this).attr("data-warnings") !== '{}') {
                            d.push('<div class="detail-item warnings"><table><thead><tr><th>Inaktivität</th><th>Datum</th></tr></thead><tbody>');
                            let warnings = JSON.parse($(this).attr("data-warnings"));
                            for (let i in warnings) {
                                if (warnings.hasOwnProperty(i)) {
                                    let warnlist = warnings[i].warnings;
                                    if (warnlist.length >= 1) {
                                        for (let k in warnlist) {
                                            d.push(`<tr><td><img class="small" src="${extUrl}js/web/guildmemberstat/images/act_${warnlist[k].activity}.png" /> #${(parseInt(k)+1)}</td><td>${warnlist[k].date}</td></tr>`);
                                        }
                                    }
                                }
                            }
                            d.push('</tbody></table></div>');
                        }

                        if (typeof $(this).attr("data-gex") !== 'undefined' && $(this).attr("data-gex") !== '[]') {
                            d.push('<div class="detail-item gex"><table><thead><tr><th>GEX Woche</th><th>Platz</th><th>Punkte</th><th>Stufen</th></tr></thead><tbody>');
                            let gex = JSON.parse($(this).attr("data-gex"));
                            for (let i in gex) {
                                if (gex.hasOwnProperty(i)) {
                                    let week = moment.unix(gex[i].gexweek).week().toString();
                                    week = (week.length == 1) ? '0' + week : week;
                                    d.push('<tr><td>' + moment.unix(gex[i].gexweek).year() + '-' + week + '</td><td>' + gex[i].rank + '</td><td>' + HTML.Format(gex[i].expeditionPoints) + ' </td><td>' + gex[i].solvedEncounters + '</td></tr>');
                                }
                            }
                            d.push('</tbody></table></div>');
                        }
                        if (typeof $(this).attr("data-gbg") !== 'undefined' && $(this).attr("data-gbg") !== '[]') {
                            d.push('<div class="detail-item gbg"><table><thead><tr><th>GG Zyklus</th><th>Platz</th><th>Kämpfe</th><th>Verhandlungen</th></tr></thead><tbody>');
                            let gbg = JSON.parse($(this).attr("data-gbg"));
                            for (let i in gbg) {
                                if (gbg.hasOwnProperty(i)) {
                                    let week = moment.unix(gbg[i].gbgid).week();
                                    let lastweek = week - 1;
                                    week = (week.toString().length == 1) ? '0' + week : week;
                                    lastweek = (lastweek.toString().length == 1) ? '0' + lastweek : lastweek;
                                    d.push('<tr><td>' + moment.unix(gbg[i].gbgid).year() + '-' + lastweek + '/' + week + '</td><td>' + gbg[i].rank + '</td><td>' + gbg[i].battlesWon + ' </td><td>' + gbg[i].negotiationsWon + '</td></tr>');
                                }
                            }
                            d.push('</tbody></table></div>');
                        }
                        d.push('</div></td></tr>');
                        $(d.join('')).insertAfter($('#' + id));
                    }
                }
            });
        });
    },


    GuildMemberStatSettings: () => {
        let c = [];
        GuildMemberStatSettings = JSON.parse(localStorage.getItem('GuildMemberStatSettings'));

        // c.push(`<p class="text-center"><input id="showentrydate" name="showentrydate" value="1" type="checkbox" ${(showEntryDate === 1) ? ' checked="checked"':''} /> <label for="showentrydate">${i18n('Boxes.Investment.Overview.SettingsEntryTime')}</label></p>`);
        // c.push(`<p class="text-center"><input id="showrestfp" name="showrestfp" value="1" type="checkbox" ${(showRestFp === 1) ? ' checked="checked"':''} /> <label for="showrestfp">${i18n('Boxes.Investment.Overview.SettingsRestFP')}</label></p>`);
        // c.push(`<p class="text-center"><input id="showhiddengb" name="showhiddengb" value="1" type="checkbox" ${(showHiddenGb === 1) ? ' checked="checked"':''} /> <label for="showhiddengb">${i18n('Boxes.Investment.Overview.SettingsHiddenGB')}</label></p>`);
        c.push(`<hr><p><button id="save-GuildMemberStat-settings" class="btn btn-default" style="width:100%" onclick="GuildMemberStat.SettingsSaveValues()">${i18n('Boxes.Investment.Overview.SettingsSave')}</button></p>`);

        $('#GuildMemberStatSettingsBox').html(c.join(''));
    },


    SettingsSaveValues: () => {

        let value = JSON.parse(localStorage.getItem('GuildMemberStatSettings') || '{}');

        localStorage.setItem('InvestmentSettings', JSON.stringify(value));

        $(`#GuildMemberStatSettingsBox`).fadeToggle('fast', function () {
            $(this).remove();
            GuildMemberStat.Show();
        });
    },

    // helper functions

    uniq_array: (a) => {
        var seen = {};
        return a.filter(function (item) {
            return seen.hasOwnProperty(item) ? false : (seen[item] = true);
        });
    },


    remove_key_from_array: (arr, value) => {
        return arr.filter(function (ele) {
            return ele !== value;
        });
    },
}