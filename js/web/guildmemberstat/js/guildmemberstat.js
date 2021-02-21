FoEproxy.addHandler('ClanService', 'getOwnClanData', (data, postData) => {
    let requestMethod = postData[0]['requestMethod'];
    if (requestMethod === 'getOwnClanData')
    {
        GuildMemberStat.Data = data.responseData;

        if ($('#guildmemberstat-Btn').hasClass('hud-btn-red'))
        {
            $('#guildmemberstat-Btn').removeClass('hud-btn-red');
            $('#guildmemberstat-Btn-closed').remove();
        }

        if (GuildMemberStat.Data !== undefined)
        {
            GuildMemberStat.UpdateData('clandata', null);
        }
    }
});

// Forum Activity 
FoEproxy.addHandler('ConversationService', 'getConversation', (data, postData) => {
    let ConversationData = data.responseData;
    if (ConversationData !== undefined)
    {
        GuildMemberStat.UpdateData('forum', ConversationData);
    }
});

FoEproxy.addHandler('ConversationService', 'getMessages', (data, postData) => {
    let ConversationData = data.responseData;
    if (ConversationData !== undefined)
    {
        GuildMemberStat.UpdateData('forum', {
            messages: ConversationData
        });
    }
});

// GEX member statistic
FoEproxy.addHandler('GuildExpeditionService', 'getContributionList', (data, postData) => {
    GuildMemberStat.GexData = data.responseData;
    if (GuildMemberStat.GexData !== undefined)
    {
        GuildMemberStat.UpdateData('gex', null);
    }

});

FoEproxy.addHandler('GuildExpeditionService', 'getOverview', (data, postData) => {
    let Data = data.responseData;
    if (Data !== undefined)
    {
        if (data.responseData['state'] !== 'inactive')
        {
            GuildMemberStat.GEXId = Data.nextStateTime;
        }
        else
        {
            GuildMemberStat.GEXId = (Data.nextStateTime * 1 - 86400);
        }
    }
});

// Guild Goods Buildings
FoEproxy.addHandler('OtherPlayerService', 'visitPlayer', (data, postData) => {
    let GuildMember = data.responseData.other_player;
    let IsGuildMember = GuildMember.is_guild_member;

    if (IsGuildMember)
    {
        let member = {
            player_id: GuildMember.player_id,
            era: GuildMember.era
        }

        GuildMemberStat.ReadGuildMemberBuildings(data.responseData, member);
    }
});

// GuildBattleGround member statistic
FoEproxy.addHandler('GuildBattlegroundService', 'getPlayerLeaderboard', (data, postData) => {
    GuildMemberStat.GBGData = data.responseData;
    if (GuildMemberStat.GBGData !== undefined)
    {
        GuildMemberStat.UpdateData('gbg', null);
    }
});

FoEproxy.addHandler('GuildBattlegroundService', 'getBattleground', (data, postData) => {
    let Data = data.responseData;
    if (Data !== undefined)
    {
        GuildMemberStat.GBFId = Data.endsAt;
    }
});

FoEproxy.addHandler('GuildBattlegroundStateService', 'getState', (data, postData) => {
    if (data.responseData['stateId'] !== 'participating')
    {
        let Data = data.responseData;
        if (Data !== undefined)
        {
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
    hasGuildMemberRights: false,


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

        if ($('#GuildMemberStat').length === 0)
        {
            HTML.Box({
                id: 'GuildMemberStat',
                title: i18n('Boxes.GuildMemberStat.Title'),
                auto_close: true,
                dragdrop: true,
                resize: true,
                minimize: true,
                settings: 'GuildMemberStat.GuildMemberStatSettings()'
            });

            $('#GuildMemberStat').append('<div id="gms-loading-data"><div class="loadericon"></div></div>');

            HTML.AddCssFile('guildmemberstat');
        }
        else if (!event)
        {
            HTML.CloseOpenBox('GuildMemberStat');
            return;
        }
        
        moment.locale(i18n('Local'));

        GuildMemberStat.Show();
    },


    ReadGuildMemberBuildings: async (Buildings, Member) => {

        let entity = Buildings['city_map']['entities'];
        let GuildGoodsBuildings = [];

        for (let i in entity)
        {
            if (entity.hasOwnProperty(i))
            {
                let EntityID = entity[i]['cityentity_id'];
                let CityEntity = MainParser.CityEntities[EntityID];

                if (CityEntity['abilities'])
                {
                    for (let AbilityIndex in CityEntity['abilities'])
                    {

                        if (!CityEntity['abilities'].hasOwnProperty(AbilityIndex) || CityEntity['abilities'][AbilityIndex]['__class__'] === undefined || CityEntity['abilities'][AbilityIndex]['__class__'] !== 'AddResourcesToGuildTreasuryAbility')
                        {
                            continue;
                        }

                        let Ability = CityEntity['abilities'][AbilityIndex];
                        let Resources = 0;

                        if (Ability['additionalResources'] && Ability['additionalResources']['AllAge'] && Ability['additionalResources']['AllAge']['resources'])
                        {
                            Resources = Ability['additionalResources']['AllAge']['resources'];
                        }

                        GuildGoodsBuildings.push({ entity_id: EntityID, name: CityEntity['name'], resources: { totalgoods: Object.values(Resources)[0], goods: null }, level: null });
                    }
                }

                if (entity[i].state && entity[i]['state']['current_product'])
                {
                    if (entity[i]['state']['current_product']['name'] !== 'clan_goods')
                    {
                        continue;
                    }

                    let totalgoods = entity[i]['state']['current_product']['goods'].map(good => good.value).reduce((sum, good) => good + sum);

                    GuildGoodsBuildings.push({ entity_id: EntityID, name: CityEntity['name'], resources: { totalgoods: totalgoods, goods: entity[i]['state']['current_product']['goods'] }, level: entity[i]['level'] });
                }
            }
        }

        let PlayerGuildBuildings = { player_id: Member.player_id, era: Member.era, guildbuildings: GuildGoodsBuildings };

        GuildMemberStat.UpdateData('guildbuildings', PlayerGuildBuildings);
    },


    UpdateData: async (source, data) => {

        GuildMemberStat.hasGuildMemberRights = ExtGuildPermission >= 126 ? true : false;

        switch (source)
        {
            case 'clandata':

                let memberdata = GuildMemberStat.Data.members;

                if (typeof memberdata == 'undefined')
                {
                    return;
                }

                let ActiveMembers = [];

                for (let i in memberdata)
                {
                    if (memberdata.hasOwnProperty(i))
                    {
                        memberdata[i]['activity'] = GuildMemberStat.hasGuildMemberRights ? memberdata[i]['activity'] : null;

                        ActiveMembers.push(memberdata[i].player_id);

                        GuildMemberStat.RefreshGuildMemberDB(memberdata[i]);

                        // activity is not present when member is offline since 8 days
                        if (memberdata[i].activity === undefined)
                        {
                            memberdata[i].activity = 0;
                        }

                        if (GuildMemberStat.hasGuildMemberRights && memberdata[i].activity < 2)
                        {
                            let Warning = {
                                player_id: memberdata[i].player_id,
                                lastwarn: MainParser.getCurrentDate(),
                                lastactivity: memberdata[i]['activity'],
                                warnings: [{
                                    activity: memberdata[i].activity,
                                    date: MainParser.getCurrentDate()
                                }]
                            }

                            GuildMemberStat.SetActivityWarning(Warning, false);
                        }
                    }
                }

                // Update Own Guild support buildings
                if (MainParser.CityMapData && MainParser.CityMapData.length)
                {
                    let self = {
                        player_id: ExtPlayerID,
                        era: CurrentEraID
                    }
                    GuildMemberStat.ReadGuildMemberBuildings({ city_map: { entities: Object.values(MainParser.CityMapData) } }, self);
                }

                // Insert update time
                let GuildMemberStatSettings = JSON.parse(localStorage.getItem('GuildMemberStatSettings') || '{}');
                GuildMemberStatSettings['lastupdate'] = MainParser.getCurrentDate();
                localStorage.setItem('GuildMemberStatSettings', JSON.stringify(GuildMemberStatSettings));

                // Array with all valid player_id is send to mark all player_id which ar not in this array as deleted
                GuildMemberStat.MarkMemberAsDeleted(ActiveMembers); // @Todo: Remove marked members from DB after certain time or in settings

                break;

            case 'gex':

                let gexid = GuildMemberStat.GEXId;
                let gexdata = GuildMemberStat.GexData;

                if (typeof gexdata == 'undefined')
                {
                    return;
                }

                for (let i in gexdata)
                {
                    if (gexdata.hasOwnProperty(i))
                    {
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

                let gbgid = GuildMemberStat.GBFId;
                let gbgdata = (data !== null) ? data : GuildMemberStat.GBGData;

                if (gbgdata === undefined)
                {
                    return;
                }

                for (let i in gbgdata)
                {
                    if (gbgdata.hasOwnProperty(i))
                    {
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
                let messages = [];

                if (typeof messagedata == 'undefined')
                {
                    return;
                }

                for (let i in messagedata)
                {
                    if (messagedata.hasOwnProperty(i))
                    {
                        if (typeof messagedata[i].sender != 'undefined' && typeof messagedata[i].sender.player_id != 'undefined')
                        {
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

            case 'guildbuildings':

                if (data === undefined || data.length <= 0)
                {
                    return;
                }

                if (data['player_id'] !== undefined && data['guildbuildings'] !== undefined && data['guildbuildings'].length)
                {
                    GuildMemberStat.RefreshPlayerGuildBuildingsDB(data);
                }

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

        if (CurrentMember === undefined)
        {
            await GuildMemberStat.db.activity.put(Warning);
        }
        else
        {
            if (CurrentMember.lastactivity === undefined)
            {
                CurrentMember.lastactivity = 1;
            }

            if ((moment(MainParser.getCurrentDate()).format('DD.MM.YYYY') != moment(CurrentMember.lastwarn).format('DD.MM.YYYY')) || CurrentMember.lastactivity != Warning.lastactivity)
            {

                await GuildMemberStat.db.activity.where('player_id').equals(playerID).modify(x => x.warnings.push(Warning.warnings[0]));

                await GuildMemberStat.db.activity.update(CurrentMember.player_id, {
                    lastwarn: Warning.lastwarn,
                    lastactivity: Warning.lastactivity
                });

            }
        }
    },


    RefreshPlayerGuildBuildingsDB: async (data) => {

        let p_id = data.player_id,
            buildings = data.guildbuildings,
            era = data.era;

        let CurrentMember = await GuildMemberStat.db.player
            .where({
                player_id: p_id
            })
            .first();

        if (CurrentMember !== undefined)
        {
            await GuildMemberStat.db.player.update(CurrentMember.id, {
                guildbuildings: { era: era, date: MainParser.getCurrentDate(), buildings: buildings }
            });

        }
    },


    RefreshForumDB: async (Messages) => {

        for (let i in Messages)
        {
            let player_id = Messages[i].player_id;
            let message_id = Messages[i].message_id;
            let CurrentData = await GuildMemberStat.db.forum
                .where({
                    player_id: player_id
                })
                .first();

            if (CurrentData === undefined)
            {
                let m = [];
                m.push(message_id);
                await GuildMemberStat.db.forum.add({
                    player_id: player_id,
                    message_id: m,
                    lastupdate: MainParser.getCurrentDate()
                });
            }
            else
            {
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

        if (CurrentGBGData === undefined)
        {
            await GuildMemberStat.db.gbg.add({
                player_id: GBGPlayer.player.player_id,
                gbgid: gbgid,
                battlesWon: battlesWon,
                negotiationsWon: negotiationsWon,
                rank: rank
            });
        }
        else
        {
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

        if (CurrentGexData === undefined)
        {
            await GuildMemberStat.db.gex.add({
                player_id: GexPlayer.player.player_id,
                gexweek: gexweek,
                solvedEncounters: solvedEncounters,
                expeditionPoints: expeditionPoints,
                rank: rank
            });
        }
        else
        {
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

        if (CurrentMember === undefined)
        {
            await GuildMemberStat.db.player.add({
                player_id: Member['player_id'],
                name: Member['name'],
                era: Member['era'],
                avatar: Member['avatar'],
                score: Member['score'],
                prev_score: Member['score'],
                is_online: Member['is_online'],
                is_active: Member['is_active'],
                city_name: Member['city_name'],
                activity: Member['activity'],
                date: MainParser.getCurrentDate(),
                deleted: 0,
                updated: MainParser.getCurrentDate()
            });
        }
        else
        {
            await GuildMemberStat.db.player.update(CurrentMember.id, {
                name: Member['name'],
                era: Member['era'],
                avatar: Member['avatar'],
                score: Member['score'],
                prev_score: CurrentMember.score,
                is_online: Member['is_online'],
                is_active: Member['is_active'],
                city_name: Member['city_name'],
                activity: Member['activity'],
                deleted: 0,
                updated: MainParser.getCurrentDate()
            });
        }
    },


    MarkMemberAsDeleted: async (arr) => {

        let unknownMembers = await GuildMemberStat.db.player.where('player_id').noneOf(arr).toArray();
        if (unknownMembers === undefined || unknownMembers.length < 1)
        {
            return;
        }
        for (let i in unknownMembers)
        {
            await GuildMemberStat.db.player.update(unknownMembers[i].id, {
                deleted: MainParser.getCurrentDate()
            });
        }
    },


    Show: async () => {

        let h = [];

        let GuildMemberStatSettings = JSON.parse(localStorage.getItem('GuildMemberStatSettings'));
        let lastupdate = (GuildMemberStatSettings && GuildMemberStatSettings.lastupdate !== undefined) ? GuildMemberStatSettings.lastupdate : 0;


        h.push('<table id="GuildMemberTable" class="foe-table">');
        h.push('<thead>' +
            '<tr class="sorter-header">' +
            `<th class="case-sensitive" data-type="gms-group">${i18n('Boxes.GuildMemberStat.Member')}</th>` +
            `<th class="is-number" data-type="gms-group">${i18n('Boxes.GuildMemberStat.Points')}</th>` +
            `<th class="is-number" data-type="gms-group">${i18n('Boxes.GuildMemberStat.Ages')}</th>`);

        if (GuildMemberStat.hasGuildMemberRights)
            h.push(`<th class="is-number gms-tooltip" data-type="gms-group" title="${i18n('Boxes.GuildMemberStat.MemberActiviy')}"><span class="activity"></span></th>`);

        h.push(`<th class="is-number text-center gms-tooltip" data-type="gms-group"  title="${i18n('Boxes.GuildMemberStat.GuildMessages')}"><span class="messages"></span></th>` +
            `<th class="is-number text-center gms-tooltip" data-type="gms-group" title="${i18n('Boxes.GuildMemberStat.GexParticipation')}"><span class="gex"></span></th>` +
            `<th class="is-number text-center gms-tooltip" data-type="gms-group" title="${i18n('Boxes.GuildMemberStat.GbgParticipation')}"><span class="gbg"></span></th>` +
            '<th></th></tr>' +
            '</thead><tbody class="gms-group">');

        let CurrentMember = await GuildMemberStat.db.player.orderBy('score').reverse().toArray();

        if (CurrentMember === undefined)
        {
            return;
        }

        let CurrentActivityWarnings = await GuildMemberStat.db.activity.toArray();

        let CurrentGexActivity = await GuildMemberStat.db.gex.where('player_id').above(0).and(function (item) {
            return item.solvedEncounters > 0
        }).toArray();

        let CurrentGbgActivity = await GuildMemberStat.db.gbg.where('player_id').above(0).and(function (item) {
            return (item.battlesWon > 0 || item.negotiationsWon > 0) ? true : false
        }).toArray();

        let CurrentForumActivity = await GuildMemberStat.db.forum.toArray();

        let data = CurrentMember;

        for (let x = 0; x < data.length; x++)
        {
            let ActWarnCount = 0;
            let gexActivityCount = 0;
            let gbgActivityCount = 0;
            let forumActivityCount = 0;
            let guildBuildingsCount = 0;
            let hasDetail = false;

            const contribution = data[x];

            // Get available activity warnings
            activityWarnings = CurrentActivityWarnings.filter(function (item) {
                return item.player_id == contribution['player_id'];
            });

            if (activityWarnings.length && activityWarnings[0] !== undefined)
            {
                ActWarnCount = activityWarnings[0].warnings.length;
                hasDetail = (ActWarnCount > 0) ? true : hasDetail;
            }

            // Get GEX activities
            gexActivity = CurrentGexActivity.filter(function (item) {
                return item.player_id == contribution['player_id'];
            });

            if (gexActivity.length)
            {
                gexActivityCount = gexActivity.length;
                hasDetail = (gexActivityCount > 0) ? true : hasDetail;
            }

            // Get GBG activities
            gbgActivity = CurrentGbgActivity.filter(function (item) {
                return item.player_id == contribution['player_id'];
            });

            if (gbgActivity.length)
            {
                gbgActivityCount = gbgActivity.length;
                hasDetail = (gbgActivityCount > 0) ? true : hasDetail;
            }

            // Get Message Center activity
            forumActivity = CurrentForumActivity.filter(function (item) {
                return item.player_id == contribution['player_id'];
            });

            if (forumActivity.length)
            {
                forumActivityCount = forumActivity[0]['message_id'].length
            }

            // Set warning, error Class for non active members
            let stateClass = "normal";

            // @Todo: set more specific criterias for warn and error level
            if (forumActivityCount <= 5 && gbgActivityCount == 0 && gexActivityCount == 0) { stateClass = "warning"; }

            if (stateClass == "warning" && ActWarnCount > 0)
            {
                stateClass = "error";
            }

            // Get Guild supporting Buildings 
            if (contribution['guildbuildings'] !== undefined && contribution['guildbuildings']['buildings'] != undefined)
            {
                guildBuildingsCount = contribution['guildbuildings']['buildings'].length;
                hasDetail = (guildBuildingsCount > 0) ? true : hasDetail;
            }

            let deletedMember = (typeof contribution['deleted'] != 'undefined' && contribution['deleted'] != 0) ? true : false;
            let scoreDiff = contribution['score'] - contribution['prev_score'];
            let scoreDiffClass = scoreDiff >= 0 ? 'green' : 'red';
            scoreDiff = scoreDiff > 0 ? '+' + scoreDiff : scoreDiff;

            h.push(`<tr id="gms${x}" ` +
                `class="${hasDetail ? 'hasdetail ' : ''}${deletedMember ? 'strikeout gms-tooltip ' : ''}${stateClass}" ` +
                `${ActWarnCount > 0 ? " data-warnings='" + JSON.stringify(activityWarnings) + "'}'" : ''}` +
                `${gexActivityCount > 0 ? " data-gex='" + JSON.stringify(gexActivity) + "'}'" : ''}` +
                `${gbgActivityCount > 0 ? " data-gbg='" + JSON.stringify(gbgActivity) + "'}'" : ''}` +
                `${guildBuildingsCount > 0 ? " data-buildings='" + JSON.stringify(contribution['guildbuildings']) + "'}'" : ''}` +
                `${deletedMember ? 'title="' + i18n('Boxes.GuildMemberStat.MemberLeavedGuild') + '"' : ''}>`);

            h.push(`<td class="case-sensitive" data-text="${contribution['name'].toLowerCase().replace(/[\W_ ]+/g, "")}"><img style="max-width: 22px" src="${MainParser.InnoCDN + 'assets/shared/avatars/' + MainParser.PlayerPortraits[contribution['avatar']]}.jpg" alt="${contribution['name']}"> <span style="user-select:text">${contribution['name']}</span></td>`);
            h.push(`<td class="is-number" data-number="${contribution['score']}">${HTML.Format(contribution['score'])}${scoreDiff > 0 || scoreDiff < 0 ? '<span class="prev_score ' + scoreDiffClass + '">' + scoreDiff + '</span>' : ''}</td>`);
            h.push(`<td class="is-number" data-number="${Technologies.Eras[contribution['era']]}">${i18n('Eras.' + Technologies.Eras[contribution['era']])}</td>`);

            if (GuildMemberStat.hasGuildMemberRights)
                h.push(`<td class="is-number" data-number="${contribution['activity']}"><img src="${extUrl}js/web/guildmemberstat/images/act_${contribution['activity']}.png" /> ${ActWarnCount > 0 ? '<span class="warn">(' + ActWarnCount + ')</span>' : ''}</td>`);

            h.push(`<td class="is-number text-center" data-number="${forumActivityCount}">${forumActivityCount}</td>`);
            h.push(`<td class="is-number text-center" data-number="${gexActivityCount}">${gexActivityCount}</td>`);
            h.push(`<td class="is-number text-center" data-number="${gbgActivityCount}">${gbgActivityCount}</td>`);
            h.push(`<td></td></tr>`);

        }

        h.push(`</tbody></table>`);

        if (lastupdate != 0)
        {
            let uptodateClass = 'uptodate';
            let date = moment(lastupdate).unix();
            let actdate = moment(MainParser.getCurrentDate()).unix();

            if (actdate - date >= 10800)
            {
                uptodateClass = 'updaterequired';
            }

            h.push(`<div class="last-update-message"><span class="icon ${uptodateClass}"></span> <span class="${uptodateClass}">${moment(lastupdate).format(i18n('DateTime'))}</span></div>`);
        }

        $('#GuildMemberStatBody').html(h.join('')).promise().done(function () {

            $('#GuildMemberTable').tableSorter();

            $('#GuildMemberTable .gms-tooltip').tooltip({
                html: true,
                container: '#GuildMemberStatBody'
            });

            $('#GuildMemberTable > tbody tr').on('click', function () {

                if ($(this).next("tr.detailview").length)
                {
                    $(this).next("tr.detailview").remove();
                    $(this).removeClass('open');
                }
                else
                {
                    if (!$(this).hasClass("hasdetail"))
                    {
                        return;
                    }

                    let d = [];
                    let isNoMemberClass = $(this).hasClass('strikeout') ? ' inactive' : '';
                    d.push('<tr class="detailview dark-bg' + isNoMemberClass + '"><td colspan="' + $(this).find("td").length + '"><div class="detail-wrapper">');

                    $(this).addClass('open');
                    let id = $(this).attr("id");

                    if (typeof $(this).attr("data-warnings") !== 'undefined' && $(this).attr("data-warnings") !== '{}')
                    {
                        d.push(`<div class="detail-item warnings"><table><thead><tr><th>${i18n('Boxes.GuildMemberStat.Inactivity')}</th><th>${i18n('Boxes.GuildMemberStat.Date')}</th></tr></thead><tbody>`);

                        let warnings = JSON.parse($(this).attr("data-warnings"));

                        for (let i in warnings)
                        {
                            if (warnings.hasOwnProperty(i))
                            {
                                let warnlist = warnings[i].warnings;
                                if (warnlist.length >= 1)
                                {
                                    for (let k in warnlist)
                                    {
                                        d.push(`<tr><td><img class="small" src="${extUrl}js/web/guildmemberstat/images/act_${warnlist[k].activity}.png" /> #${(parseInt(k) + 1)}</td><td>${moment(warnlist[k].date).format(i18n('Date'))}</td></tr>`);
                                    }
                                }
                            }
                        }
                        d.push('</tbody></table></div>');
                    }

                    if (typeof $(this).attr("data-gex") !== 'undefined' && $(this).attr("data-gex") !== '[]')
                    {
                        d.push(`<div class="detail-item gex"><table><thead><tr><th><span class="gex"></span> ${i18n('Boxes.GuildMemberStat.GEXWeek')}</th><th>${i18n('Boxes.GuildMemberStat.Rank')}</th><th>${i18n('Boxes.GuildMemberStat.Points')}</th><th>${i18n('Boxes.GuildMemberStat.Level')}</th></tr></thead><tbody>`);
                        let gex = JSON.parse($(this).attr("data-gex"));
                        for (let i in gex)
                        {
                            if (gex.hasOwnProperty(i))
                            {
                                let week = moment.unix(gex[i].gexweek).week().toString();
                                week = (week.length == 1) ? '0' + week : week;
                                d.push('<tr><td>' + moment.unix(gex[i].gexweek).year() + '-' + week + '</td><td>' + gex[i].rank + '</td><td>' + HTML.Format(gex[i].expeditionPoints) + ' </td><td>' + gex[i].solvedEncounters + '</td></tr>');
                            }
                        }
                        d.push('</tbody></table></div>');
                    }

                    if (typeof $(this).attr("data-gbg") !== 'undefined' && $(this).attr("data-gbg") !== '[]')
                    {
                        d.push(`<div class="detail-item gbg"><table><thead><tr><th><span class="gbg"></span> ${i18n('Boxes.GuildMemberStat.GBFRound')}</th><th>${i18n('Boxes.GuildMemberStat.Rank')}</th><th>${i18n('Boxes.GuildMemberStat.Battles')}</th><th>${i18n('Boxes.GuildMemberStat.Negotiations')}</th></tr></thead><tbody>`);
                        let gbg = JSON.parse($(this).attr("data-gbg"));
                        for (let i in gbg)
                        {
                            if (gbg.hasOwnProperty(i))
                            {
                                let week = moment.unix(gbg[i].gbgid).week();
                                let lastweek = week - 1;
                                week = (week.toString().length == 1) ? '0' + week : week;
                                lastweek = (lastweek.toString().length == 1) ? '0' + lastweek : lastweek;
                                d.push('<tr><td>' + moment.unix(gbg[i].gbgid).year() + '-' + lastweek + '/' + week + '</td><td>' + gbg[i].rank + '</td><td>' + gbg[i].battlesWon + ' </td><td>' + gbg[i].negotiationsWon + '</td></tr>');
                            }
                        }

                        d.push('</tbody></table></div>');
                    }

                    if (typeof $(this).attr("data-buildings") !== 'undefined' && $(this).attr("data-buildings") !== '{}')
                    {
                        let guildbuildings = JSON.parse($(this).attr("data-buildings"));

                        d.push(`<div class="detail-item buidlings"><table><thead class="hasdetail"><tr><th><span class="guildbuild"></span> ${i18n('Boxes.GuildMemberStat.GuildSupportBuildings')} (${i18n('Boxes.GuildMemberStat.LastUpdate') + ' ' + moment(guildbuildings.date).fromNow()})</th><th></th></tr></thead><tbody class="closed">`);
                        let totalGoods = 0;
                        for (let i in guildbuildings['buildings'])
                        {
                            let plbuilding = guildbuildings.buildings[i];
                            let goodCount = (plbuilding.resources && plbuilding.resources.totalgoods) ? plbuilding.resources.totalgoods : 0;
                            totalGoods += goodCount;
                            d.push(`<tr><td>${plbuilding.name} ${plbuilding.level !== null ? '(' + plbuilding.level + ')' : ''}</td><td class="text-right">${HTML.Format(goodCount)}</td></tr>`);
                        }
                        d.push(`<tr><td class="text-bright">${i18n('Boxes.GuildMemberStat.TotalGuildGoods')}</td><td class="text-right text-bright">${HTML.Format(totalGoods)}</td></tr>`);

                        d.push('</tbody></table></div>');
                    }

                    d.push('</div></td></tr>');

                    $(d.join('')).insertAfter($('#' + id)).promise().done(function () {
                        $("#GuildMemberTable thead.hasdetail").off('click').on('click', function () {
                            let thead = $(this);
                            if ($(thead).hasClass('open'))
                            {
                                $(thead).removeClass("open").addClass('closed');
                                $(thead).next().removeClass("open").addClass('closed');
                            }
                            else
                            {
                                $(thead).removeClass("closed").addClass('open');
                                $(thead).next().removeClass("closed").addClass('open');
                            }
                        });
                    });
                }
            });

            // Fade out loading screen
            $("#gms-loading-data").fadeOut(800);
        });
    },


    GuildMemberStatSettings: () => {

        let c = [];
        GuildMemberStatSettings = JSON.parse(localStorage.getItem('GuildMemberStatSettings'));

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
    }
}