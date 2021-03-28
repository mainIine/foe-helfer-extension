/*
 * **************************************************************************************
 *
 * Dateiname:                 guildmemberstat.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              24.02.21, 09:49 Uhr
 * zuletzt bearbeitet:       26.03.21, 23:58 Uhr
 *
 * Copyright © 2021
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('ClanService', 'getOwnClanData', (data, postData) => {
    let requestMethod = postData[0]['requestMethod'];
    if (requestMethod === 'getOwnClanData')
    {
        GuildMemberStat.Data = data.responseData;

        if (GuildMemberStat.Data !== undefined && !GuildMemberStat.hasUpdateProgress)
        {
            GuildMemberStat.UpdateData('clandata', null).then((e) => {

                if ($('#guildmemberstat-Btn').hasClass('hud-btn-red'))
                {
                    $('#guildmemberstat-Btn').removeClass('hud-btn-red');
                    $('#guildmemberstat-Btn-closed').remove();
                }

            });
        }
    }
});

// Treasury Goods 
FoEproxy.addHandler('ClanService', 'getTreasury', (data, postData) => {
    let requestMethod = postData[0]['requestMethod'];
    if (requestMethod === 'getTreasury')
    {
        let Goods = data.responseData.resources;

        if (Goods !== undefined)
        {
            GuildMemberStat.setEraGoods(Goods);
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
        GuildMemberStat.GBGId = Data.endsAt;
    }
});

FoEproxy.addHandler('GuildBattlegroundStateService', 'getState', (data, postData) => {
    if (data.responseData['stateId'] !== 'participating')
    {
        let Data = data.responseData;
        if (Data !== undefined)
        {
            GuildMemberStat.GBGId = parseInt(Data.startsAt) - 259200;
            GuildMemberStat.UpdateData('gbg', data.responseData['playerLeaderboardEntries']);
        }
    }
});


let GuildMemberStat = {
    Data: undefined,
    GexData: undefined,
    GBGData: undefined,
    GBGId: undefined,
    GEXId: undefined,
    TreasuryGoodsData: {},
    CurrentStatGroup: 'Member',
    hasGuildMemberRights: false,
    acceptedDeleteWarning: false,
    hasUpdateProgress: false,
    Settings: {
        autoStartOnUpdate: 1,
        showDeletedMembers: 1,
        showSearchbar: 1,
        deleteOlderThan: 14,
        lastupdate: 0
    },
    MemberDict: {},


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

            GuildMemberStat.showPreloader('#GuildMemberStat');

            HTML.AddCssFile('guildmemberstat');
        }
        else if (!event)
        {
            HTML.CloseOpenBox('GuildMemberStat');
            return;
        }

        moment.locale(i18n('Local'));

        GuildMemberStat.InitSettings();

        $('#GuildMemberStat').on('click', '.toggle-statistic', function () {

            GuildMemberStat.CurrentStatGroup = $(this).data('value');

            $("#gmsTabs").find("li").removeClass("active");
            $(this).parent().addClass("active");

            switch (GuildMemberStat.CurrentStatGroup)
            {
                case 'Member':
                    GuildMemberStat.Show();
                    break;
                case 'GuildBuildings':
                    GuildMemberStat.ShowGuildBuildings();
                    break;
                case 'Eras':
                    GuildMemberStat.ShowGuildEras();
                    break;
                case 'GuildGoods':
                    GuildMemberStat.ShowGuildGoods();
                    break;
            }

        });

        GuildMemberStat.CurrentStatGroup = 'Member';
        GuildMemberStat.Show();
    },


    ReadGuildMemberBuildings: async (Buildings, Member) => {

        let entity = Buildings['city_map']['entities'];
        let GuildGoodsBuildings = [];
        let GuildPowerBuildings = [];

        for (let i in entity)
        {
            if (entity.hasOwnProperty(i))
            {
                let EntityID = entity[i]['cityentity_id'];
                let CityEntity = MainParser.CityEntities[EntityID];

                // Check for clan power building (Ruhmeshalle etc.)
                if (CityEntity['type'] && CityEntity['type'] === 'clan_power_production')
                {

                    let value = CityEntity['entity_levels'].find(data => data.era === Member.era);
                    let clan_power = typeof value.clan_power !== 'undefined' ? value.clan_power : 0;

                    GuildPowerBuildings.push({ entity_id: EntityID, name: CityEntity['name'], power: { value: clan_power, motivateable: null }, level: null });
                }

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
                        let eraId = entity[i].level !== undefined ? (entity[i].level + 1) : null;
                        let era = eraId !== null ? Technologies.EraNames[eraId] : null;
                        let goods = null;

                        if (Ability['additionalResources'] && Ability['additionalResources']['AllAge'] && Ability['additionalResources']['AllAge']['resources'])
                        {
                            Resources = Object.values(Ability['additionalResources']['AllAge']['resources'])[0];
                        }

                        // Check for clan power building (Ehrenstatue etc.)
                        if (Ability['additionalResources'][Member.era] !== undefined && Ability['additionalResources'][Member.era]['resources'] !== undefined && Ability['additionalResources'][Member.era]['resources']['clan_power'] !== undefined)
                        {
                            let clan_power = Ability['additionalResources'][Member.era]['resources']['clan_power'];
                            GuildPowerBuildings.push({ entity_id: EntityID, name: CityEntity['name'], power: { value: clan_power, motivateable: null }, level: eraId, era: era });
                        }

                        let goodSum = Resources;

                        if (era !== null)
                        {
                            goods = Object.values(GoodsData).filter(function (Good) {
                                return Good.era == era && Good.abilities.goodsProduceable !== undefined;
                            }).map(function (row) {
                                return { good_id: row.id, value: goodSum / 5 };
                            }).sort(function (a, b) { return a.good_id.localeCompare(b.good_id) });
                        }

                        GuildGoodsBuildings.push({ entity_id: EntityID, name: CityEntity['name'], resources: { totalgoods: goodSum, goods: goods }, level: eraId, era: era });
                    }
                }

                if (entity[i].state && entity[i]['state']['current_product'])
                {
                    if (entity[i]['state']['current_product']['name'] !== 'clan_goods')
                    {
                        continue;
                    }

                    let totalgoods = entity[i]['state']['current_product']['goods'].map(good => good.value).reduce((sum, good) => good + sum);

                    GuildGoodsBuildings.push({ entity_id: EntityID, name: CityEntity['name'], resources: { totalgoods: totalgoods, goods: entity[i]['state']['current_product']['goods'].sort(function (a, b) { return a.good_id.localeCompare(b.good_id) }) }, level: entity[i]['level'], era: Member.era });
                }
            }
        }

        let PlayerGuildBuildings = { player_id: Member.player_id, era: Member.era, guildbuildings: GuildPowerBuildings.concat(GuildGoodsBuildings) };

        GuildMemberStat.UpdateData('guildbuildings', PlayerGuildBuildings);
    },


    UpdateData: async (source, data) => {

        GuildMemberStat.InitSettings();
        GuildMemberStat.MemberDict = {};

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

                GuildMemberStat.hasUpdateProgress = true;

                for (let i in memberdata)
                {
                    if (memberdata.hasOwnProperty(i))
                    {
                        memberdata[i]['activity'] = GuildMemberStat.hasGuildMemberRights ? memberdata[i]['activity'] : null;
                        memberdata[i]['rank'] = (i * 1 + 1);

                        ActiveMembers.push(memberdata[i].player_id);

                        // activity is not present when member is offline since 8 days
                        if (typeof memberdata[i].activity === 'undefined')
                        {
                            memberdata[i].activity = 0;
                        }

                        await GuildMemberStat.RefreshGuildMemberDB(memberdata[i]);

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

                            await GuildMemberStat.SetActivityWarning(Warning, false);
                        }
                    }
                }

                // Update Own Guild support buildings
                if (MainParser.CityMapData && Object.keys(MainParser.CityMapData).length > 0)
                {
                    let self = {
                        player_id: ExtPlayerID,
                        era: CurrentEra
                    }
                    GuildMemberStat.ReadGuildMemberBuildings({ city_map: { entities: Object.values(MainParser.CityMapData) } }, self);
                }

                // Insert update time
                GuildMemberStat.Settings.lastupdate = MainParser.getCurrentDate();
                localStorage.setItem('GuildMemberStatSettings', JSON.stringify(GuildMemberStat.Settings));

                // Array with all valid player_id is send to mark all player_id which ar not in this array as deleted
                await GuildMemberStat.MarkMemberAsDeleted(ActiveMembers);

                //Delete ex members which delete data is older than the given days [ 0 = no deletion ]
                if (GuildMemberStat.Settings.deleteOlderThan > 0)
                {
                    await GuildMemberStat.DeleteExMembersOlderThan(GuildMemberStat.Settings.deleteOlderThan);
                }

                if (GuildMemberStat.hasGuildMemberRights && GuildMemberStat.Settings.autoStartOnUpdate)
                {
                    GuildMemberStat.CurrentStatGroup = 'Member';
                    GuildMemberStat.BuildBox(true);
                }
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

                if ($('#GuildMemberStatBody').length)
                {
                    GuildMemberStat.Show();
                }
                break;

            case 'gbg':

                let gbgid = GuildMemberStat.GBGId;
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

                if ($('#GuildMemberStatBody').length)
                {
                    GuildMemberStat.CurrentStatGroup = 'Member';
                    GuildMemberStat.Show();
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

            if ($("#GuildMemberStat").length)
            {
                GuildMemberStat.CurrentStatGroup = 'Member';
                GuildMemberStat.Show();
            }
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
                rank: [Member['rank'], Member['rank']],
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
            let prevRank = typeof CurrentMember.rank !== 'undefined' ? CurrentMember.rank[1] : Member['rank'];

            await GuildMemberStat.db.player.update(CurrentMember.id, {
                name: Member['name'],
                era: Member['era'],
                avatar: Member['avatar'],
                score: Member['score'],
                prev_score: CurrentMember.score,
                rank: [prevRank, Member['rank']],
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

        let newDeleted = unknownMembers.filter(function (member) {
            return member.deleted == 0;
        });

        if (newDeleted.length > 0)
        {
            for (let i in newDeleted)
            {
                await GuildMemberStat.db.player.update(newDeleted[i].id, {
                    deleted: MainParser.getCurrentDate()
                });
            }
        }
    },


    DeleteExMembersOlderThan: async (days) => {

        let currentExMembers = await GuildMemberStat.db.player.where('deleted').notEqual(0).toArray();

        if (currentExMembers === undefined || currentExMembers.length <= 0)
        {
            return;
        }

        currentExMembers.forEach(member => {

            var time = +moment(member.deleted);

            if (Math.floor((+MainParser.getCurrentDate() - time) / 86400000) > days)
            {
                let db = GuildMemberStat.db;

                db.transaction("rw", db.player, db.gex, db.gbg, db.activity, db.warning, db.forum, async () => {

                    await GuildMemberStat.db.player.where('id').equals(member.id).delete();
                    await GuildMemberStat.db.gex.where('player_id').equals(member.player_id).delete();
                    await GuildMemberStat.db.gbg.where('player_id').equals(member.player_id).delete();
                    await GuildMemberStat.db.activity.where('player_id').equals(member.player_id).delete();
                    await GuildMemberStat.db.warning.where('player_id').equals(member.player_id).delete();
                    await GuildMemberStat.db.forum.where('player_id').equals(member.player_id).delete();

                });

            }

        });
    },


    Show: async () => {

        let h = [];

        GuildMemberStat.showPreloader("#GuildMemberStat");

        GuildMemberStat.InitSettings();
        GuildMemberStat.hasUpdateProgress = false;

        h.push('<div class="tabs"><ul id="gmsTabs" class="horizontal">');
        h.push(`<li${GuildMemberStat.CurrentStatGroup === 'Member' ? ' class="active"' : ''}><a class="toggle-statistic" data-value="Member"><span>${i18n('Boxes.GuildMemberStat.GuildMembers')}</span></a></li>`);
        h.push(`<li${GuildMemberStat.CurrentStatGroup === 'Eras' ? ' class="active"' : ''}><a class="toggle-statistic" data-value="Eras"><span>${i18n('Boxes.GuildMemberStat.Eras')}</span></a></li>`);
        h.push(`<li${GuildMemberStat.CurrentStatGroup === 'GuildBuildings' ? ' class="active"' : ''}><a class="toggle-statistic" data-value="GuildBuildings"><span>${i18n('Boxes.GuildMemberStat.GuildBuildings')}</span></a></li>`);
        h.push(`<li${GuildMemberStat.CurrentStatGroup === 'GuildGoods' ? ' class="active"' : ''}><a class="toggle-statistic" data-value="GuildGoods"><span>${i18n('Boxes.GuildMemberStat.GuildGoods')}</span></a></li>`);

        if (GuildMemberStat.Settings.showSearchbar)
        {
            h.push(`<input type="text" name="filter" id="gms-filter-input" placeholder="${i18n('Boxes.GuildMemberStat.Search')}" onkeyup="GuildMemberStat.filterTable('gms-filter-input','GuildMemberTable')" />`);
        }

        h.push(`</ul></div>`);
        h.push(`<div id="gmsContentWrapper">`);
        h.push('<table id="GuildMemberTable" class="foe-table">');
        h.push('<thead>' +
            '<tr class="sorter-header">' +
            `<th class="is-number" data-type="gms-group"></th>` +
            `<th class="case-sensitive" data-type="gms-group">${i18n('Boxes.GuildMemberStat.Member')}</th>` +
            `<th class="is-number" data-type="gms-group">${i18n('Boxes.GuildMemberStat.Points')}</th>` +
            `<th class="is-number" data-type="gms-group">${i18n('Boxes.GuildMemberStat.Eras')}</th>`);

        if (GuildMemberStat.hasGuildMemberRights)
            h.push(`<th class="is-number gms-tooltip" data-type="gms-group" title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.MemberActiviy'))}"><span class="activity"></span></th>`);

        h.push(`<th class="is-number text-center gms-tooltip" data-type="gms-group"  title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.GuildMessages'))}"><span class="messages"></span></th>` +
            `<th class="is-number text-center gms-tooltip" data-type="gms-group" title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.GexParticipation'))}"><span class="gex"></span></th>` +
            `<th class="is-number text-center gms-tooltip" data-type="gms-group" title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.GbgParticipation'))}"><span class="gbg"></span></th>` +
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
        }).reverse().sortBy('gexweek');

        let CurrentGbgActivity = await GuildMemberStat.db.gbg.where('player_id').above(0).and(function (item) {
            return (item.battlesWon > 0 || item.negotiationsWon > 0) ? true : false
        }).reverse().sortBy('gbgid');

        let CurrentForumActivity = await GuildMemberStat.db.forum.toArray();

        let data = CurrentMember;
        let deletedCount = 0;

        for (let x = 0; x < data.length; x++)
        {
            let ActWarnCount = 0;
            let gexActivityCount = 0;
            let gbgActivityCount = 0;
            let forumActivityCount = 0;
            let guildBuildingsCount = 0;
            let hasDetail = false;

            const member = data[x];
            let MemberID = member['player_id'];

            // Get available activity warnings
            activityWarnings = CurrentActivityWarnings.filter(function (item) {
                return item.player_id == MemberID;
            });

            if (activityWarnings.length && activityWarnings[0] !== undefined)
            {
                ActWarnCount = activityWarnings[0].warnings.length;
                hasDetail = (ActWarnCount > 0) ? true : hasDetail;
            }

            // Get GEX activities
            gexActivity = CurrentGexActivity.filter(function (item) {
                return item.player_id == MemberID;
            });

            if (gexActivity.length)
            {
                gexActivityCount = gexActivity.length;
                hasDetail = (gexActivityCount > 0) ? true : hasDetail;
            }

            // Get GBG activities
            gbgActivity = CurrentGbgActivity.filter(function (item) {
                return item.player_id == MemberID;
            });

            if (gbgActivity.length)
            {
                gbgActivityCount = gbgActivity.length;
                hasDetail = (gbgActivityCount > 0) ? true : hasDetail;
            }

            // Get Message Center activity
            forumActivity = CurrentForumActivity.filter(function (item) {
                return item.player_id == MemberID;
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
            if (member['guildbuildings'] !== undefined && member['guildbuildings']['buildings'] != undefined)
            {
                guildBuildingsCount = member['guildbuildings']['buildings'].length;
                hasDetail = (guildBuildingsCount > 0) ? true : hasDetail;
            }

            let deletedMember = (typeof member['deleted'] !== 'undefined' && member['deleted'] != 0) ? true : false;
            deletedCount += deletedMember ? 1 : 0;

            if (deletedMember && !GuildMemberStat.Settings.showDeletedMembers)
            {
                continue;
            }

            let scoreDiff = member['score'] - member['prev_score'];
            let scoreDiffClass = scoreDiff >= 0 ? 'green' : 'red';
            let rank = (x * 1 + 1);

            member['rank'] = typeof member['rank'] !== 'undefined' ? member['rank'] : [rank, rank]
            let rankDiffClass = (member['rank'] && member['rank'][1] > member['rank'][0]) ? ' decreased' : member['rank'][0] > member['rank'][1] ? ' increased' : '';

            scoreDiff = scoreDiff > 0 ? '+' + scoreDiff : scoreDiff;

            // build an dictionary for detail views
            if (GuildMemberStat.MemberDict[MemberID] === undefined) GuildMemberStat.MemberDict[MemberID] = {};
            if (ActWarnCount > 0) GuildMemberStat.MemberDict[MemberID]['activity'] = activityWarnings;
            if (gexActivityCount > 0) GuildMemberStat.MemberDict[MemberID]['gex'] = gexActivity;
            if (gbgActivityCount > 0) GuildMemberStat.MemberDict[MemberID]['gbg'] = gbgActivity;
            if (guildBuildingsCount > 0) GuildMemberStat.MemberDict[MemberID]['guildbuildings'] = member['guildbuildings'];

            h.push(`<tr id="gms${x}" ` +
                `class="${hasDetail ? 'hasdetail ' : ''}${deletedMember ? 'strikeout gms-tooltip ' : ''}${stateClass}" ` +
                `" data-id="${MemberID}"` +
                `${deletedMember ? 'title="' + HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.MemberLeavedGuild')) + '"' : ''}>`);

            h.push(`<td class="is-number text-center${rankDiffClass}" data-number="${!deletedMember ? rank : member['score']}">${!deletedMember ? '#' + (rank - deletedCount) : ''}</td>`);
            h.push(`<td class="case-sensitive copyable" data-text="${member['name'].toLowerCase().replace(/[\W_ ]+/g, "")}"><img style="max-width: 22px" src="${MainParser.InnoCDN + 'assets/shared/avatars/' + MainParser.PlayerPortraits[member['avatar']]}.jpg" alt="${member['name']}"> <span>${member['name']}</span></td>`);
            h.push(`<td class="is-number" data-number="${member['score']}">${HTML.Format(member['score'])}${scoreDiff > 0 || scoreDiff < 0 ? '<span class="prev_score ' + scoreDiffClass + '">' + (scoreDiff > 0 ? '+' : '') + HTML.Format(scoreDiff) + '</span>' : ''}</td>`);
            h.push(`<td class="is-number" data-number="${Technologies.Eras[member['era']]}">${i18n('Eras.' + Technologies.Eras[member['era']])}</td>`);

            if (GuildMemberStat.hasGuildMemberRights)
                h.push(`<td class="is-number" data-number="${member['activity']}"><img src="${extUrl}js/web/guildmemberstat/images/act_${member['activity']}.png" /> ${ActWarnCount > 0 ? '<span class="warn">(' + ActWarnCount + ')</span>' : ''}</td>`);

            h.push(`<td class="is-number text-center" data-number="${forumActivityCount}">${forumActivityCount}</td>`);
            h.push(`<td class="is-number text-center" data-number="${gexActivityCount}">${gexActivityCount}</td>`);
            h.push(`<td class="is-number text-center" data-number="${gbgActivityCount}">${gbgActivityCount}</td>`);
            h.push(`<td></td></tr>`);

        }

        h.push(`</tbody></table>`);
        h.push(`</div>`); // gmsContentWrapper

        if (GuildMemberStat.Settings.lastupdate != 0)
        {
            let uptodateClass = 'uptodate';
            let date = moment(GuildMemberStat.Settings.lastupdate).unix();
            let actdate = moment(MainParser.getCurrentDate()).unix();

            if (actdate - date >= 10800)
            {
                uptodateClass = 'updaterequired';
            }

            h.push(`<div class="last-update-message"><span class="icon ${uptodateClass}"></span> <span class="${uptodateClass}">${moment(GuildMemberStat.Settings.lastupdate).format(i18n('DateTime'))}</span></div>`);
        }

        $('#GuildMemberStatBody').html(h.join('')).promise().done(function () {

            let currentTime = MainParser.round(+MainParser.getCurrentDate() / 1000, 0);

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
                    let MemberID = parseInt($(this).attr("data-id"));
                    let isNoMemberClass = $(this).hasClass('strikeout') ? ' inactive' : '';
                    let activityWarnState = ['Red', 'Yellow'];

                    d.push('<tr class="detailview dark-bg' + isNoMemberClass + '"><td colspan="' + $(this).find("td").length + '"><div class="detail-wrapper">');

                    $(this).addClass('open');

                    let id = $(this).attr("id");
                    let Member = GuildMemberStat.MemberDict[MemberID];

                    // Create Inactivity Overview
                    if (Member['activity'] !== undefined)
                    {
                        d.push(`<div class="detail-item warnings"><div class="scrollable"><table><thead><tr><th>${i18n('Boxes.GuildMemberStat.Inactivity')}</th><th>${i18n('Boxes.GuildMemberStat.Date')}</th><th class="text-right"><span class="edit"></span></th></tr></thead><tbody class="copyable">`);

                        let warnings = Member['activity'];

                        for (let i in warnings)
                        {
                            if (warnings.hasOwnProperty(i))
                            {
                                let warnlist = warnings[i].warnings.sort((a, b) => b.date - a.date);

                                if (warnlist.length >= 1)
                                {
                                    for (let k in warnlist)
                                    {
                                        d.push(`<tr><td><img class="small" src="${extUrl}js/web/guildmemberstat/images/act_${warnlist[k].activity}.png" /> #${(warnlist.length - parseInt(k))}<span class="hidden-text">&nbsp;-&nbsp;${activityWarnState[warnlist[k].activity]}</span></td>` +
                                            `<td>${moment(warnlist[k].date).format(i18n('Date'))}</td>` +
                                            `<td><button data-id="${MemberID}" data-warn="${k}" class="deleteInactivity deleteButton gms-tooltip" title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.DeleteInactivityWarning'))}">x</button></td></tr>`);
                                    }
                                }
                            }
                        }
                        d.push('</tbody></table></div></div>');
                    }

                    // Create GEX Overview
                    if (Member['gex'] !== undefined)
                    {
                        d.push(`<div class="detail-item gex"><div class="scrollable"><table><thead><tr><th><span class="gex"></span> ${i18n('Boxes.GuildMemberStat.GEXWeek')}</th><th>${i18n('Boxes.GuildMemberStat.Rank')}</th><th>${i18n('Boxes.GuildMemberStat.Points')}</th><th>${i18n('Boxes.GuildMemberStat.Level')}</th><th class="text-right"><span class="edit"></span></th></tr></thead><tbody>`);
                        let gex = Member['gex'];
                        for (let i in gex)
                        {
                            if (gex.hasOwnProperty(i))
                            {
                                let gexweek = moment.unix(gex[i].gexweek).format('YYYY-ww');
                                let activeGexClass = gex[i].gexweek >= currentTime ? ' activeCircle' : '';

                                d.push(`<tr><td>${gexweek}<span class="${activeGexClass}"></span></td>` +
                                    `<td>${gex[i].rank}</td><td>${HTML.Format(gex[i].expeditionPoints)}</td>` +
                                    `<td>${gex[i].solvedEncounters}</td>` +
                                    `<td><button data-id="${gex[i].player_id}" data-gexweek="${gex[i].gexweek}" class="deleteGexWeek deleteButton">x</button></td>` +
                                    `</tr>`);
                            }
                        }
                        d.push('</tbody></table></div></div>');
                    }

                    // Create GBG Overview
                    if (Member['gbg'] !== undefined)
                    {
                        d.push(`<div class="detail-item gbg"><div class="scrollable"><table><thead><tr><th><span class="gbg"></span> ${i18n('Boxes.GuildMemberStat.GBFRound')}</th><th>${i18n('Boxes.GuildMemberStat.Rank')}</th><th>${i18n('Boxes.GuildMemberStat.Battles')}</th><th>${i18n('Boxes.GuildMemberStat.Negotiations')}</th><th class="text-right"><span class="edit"></span></th></tr></thead><tbody>`);

                        let gbg = Member['gbg'];

                        for (let i in gbg)
                        {
                            if (gbg.hasOwnProperty(i))
                            {
                                let activeGbgClass = gbg[i].gbgid >= currentTime ? ' activeCircle' : '';
                                let week = moment.unix(gbg[i].gbgid).week();
                                let lastweek = week - 1;
                                week = (week.toString().length == 1) ? '0' + week : week;
                                lastweek = (lastweek.toString().length == 1) ? '0' + lastweek : lastweek;

                                d.push(`<tr><td>${moment.unix(gbg[i].gbgid).year()} - ${lastweek}/${week}<span class="${activeGbgClass}"></span></td>` +
                                    `<td>${gbg[i].rank}</td>` +
                                    `<td>${gbg[i].battlesWon}</td>` +
                                    `<td>${gbg[i].negotiationsWon}</td>` +
                                    `<td><button data-gbgid="${gbg[i].gbgid}" data-id="${gbg[i].player_id}" class="deleteGBG deleteButton" title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.DeleteGBGRound'))}">x</button></td>` +
                                    `</tr>`);
                            }
                        }

                        d.push('</tbody></table></div></div>');
                    }

                    // Create Guild supporting buildings Overview
                    if (Member['guildbuildings'] !== undefined)
                    {
                        let guildbuildings = Member['guildbuildings'];
                        let totalGoods = 0;
                        let totalPower = 0;

                        d.push(`<div class="detail-item buildings"><table><thead class="hasdetail"><tr><th><span class="guildbuild"></span> ${i18n('Boxes.GuildMemberStat.GuildSupportBuildings')} (${i18n('Boxes.GuildMemberStat.LastUpdate') + ' ' + moment(guildbuildings.date).fromNow()})</th><th></th></tr></thead><tbody class="closed copyable">`);

                        // Group GuildGoods buildings by name and their era
                        let guildGoodsBuildings = guildbuildings['buildings'].filter(function (data) { return data.resources !== undefined }).reduce(function (res, obj) {
                            let objname = obj.name + '#' + obj.level + '#';
                            if (!(objname in res))
                            {
                                res.__array.push(res[objname] = obj);
                                res[objname].count = 1;
                            }
                            else
                            {
                                res[objname].resources.totalgoods += +obj.resources.totalgoods;
                                res[objname].count += 1;
                            }
                            return res;
                        }, { __array: [] }).__array.sort(function (a, b) { return a.name.localeCompare(b.name) });

                        // Group guildpower buildings only by name. Era isn't relevant here
                        let guildPowerBuildings = guildbuildings['buildings'].filter(function (data) { return data.power !== undefined }).reduce(function (res, obj) {
                            if (!(obj.name in res))
                            {
                                res.__array.push(res[obj.name] = obj);
                                res[obj.name].count = 1;
                            }
                            else
                            {
                                res[obj.name].power.value += +obj.power.value;
                                res[obj.name].count += 1;
                            }
                            return res;
                        }, { __array: [] }).__array.sort(function (a, b) { return a.name.localeCompare(b.name) });

                        d.push(`<tr class="nohover"><td colspan="2"><div class="detail-wrapper">`);

                        if (guildGoodsBuildings.length)
                        {
                            d.push(`<div class="detail-item guildgoods"><table class="copyable"><thead><tr><th colspan="3"><i>${i18n('Boxes.GuildMemberStat.GuildGoods')}</i></th></tr></thead><tbody>`);

                            guildGoodsBuildings.forEach(plbuilding => {
                                let goodslist = '';
                                let countBuilding = typeof plbuilding.count != 'undefined' ? plbuilding.count : 1;
                                let goodCount = (plbuilding.resources && plbuilding.resources.totalgoods) ? plbuilding.resources.totalgoods : 0;
                                totalGoods += goodCount;
                                if (plbuilding.resources.goods !== undefined && plbuilding.resources.goods !== null)
                                {
                                    goodslist = plbuilding.resources.goods.map(good => {
                                        return `<span title="${good.value} x ${GoodsData[good.good_id]['name']}" class="goods-sprite-50 sm ${good.good_id}"></span> `;
                                    }).join('');

                                }

                                d.push(`<tr><td>${countBuilding} x ${plbuilding.name.replace(/\#[0-9]+\#/, '')} ${plbuilding.level !== null ? '(' + plbuilding.level + ')' : ''}</td><td class="text-right">${goodslist !== '' ? `<span class="goods-count">${goodCount / 5}x</span>${goodslist}` : ''}</td><td class="text-right">${HTML.Format(goodCount)}</td></tr>`);
                            });

                            d.push(`<tr><td class="text-bright">${i18n('Boxes.GuildMemberStat.TotalGuildGoods')}</td><td></td><td class="text-right text-bright">${HTML.Format(totalGoods)}</td></tr>`);
                            d.push(`</tbody></table></div>`);
                        }

                        if (guildPowerBuildings.length)
                        {
                            d.push(`<div class="detail-item guildgoods"><table class="copyable"><thead><tr><th colspan="2"><i>${i18n('Boxes.GuildMemberStat.GuildPower')}</i></th></tr></thead><tbody>`);

                            guildPowerBuildings.forEach(plbuilding => {
                                let countBuilding = typeof plbuilding.count != 'undefined' ? plbuilding.count : 1;
                                let powerCount = (plbuilding.power && plbuilding.power.value) ? plbuilding.power.value : 0;
                                totalPower += powerCount;
                                d.push(`<tr><td>${countBuilding} x  ${plbuilding.name} ${plbuilding.level !== null ? '(' + plbuilding.level + ')' : ''}</td><td class="text-right">${HTML.Format(powerCount)}</td></tr>`);
                            });

                            d.push(`<tr><td class="text-bright">${i18n('Boxes.GuildMemberStat.TotalGuildPower')}</td><td class="text-right text-bright">${HTML.Format(totalPower)}</td></tr>`);
                            d.push(`</tbody></table></div>`);
                        }

                        d.push('</div></td></tr></tbody></table></div>');
                    }

                    d.push('</div></td></tr>');

                    $(d.join('')).insertAfter($('#' + id)).promise().done(function () {

                        // Show Delete Buttons 
                        $('#GuildMemberTable th span.edit').off('click').on('click', function (e) {

                            //Show modal Warning before delete
                            if (!GuildMemberStat.acceptedDeleteWarning)
                            {
                                $('<div/>', {
                                    id: 'gms-modal-warning',
                                    class: 'warningoverlay',
                                    html: '<div class="warningoverlay-content">' + i18n('Boxes.GuildMemberStat.DeleteDataWarning') + '<br /><br /><button id="gms-accept-modal" class="btn btn-default">' + i18n('Boxes.GuildMemberStat.GotIt') + '</button><div>'
                                }).appendTo('#GuildMemberStatBody');

                                $('#GuildMemberStatBody').on('click', '#gms-accept-modal', function () {
                                    $("#gms-modal-warning").fadeOut(400, function () { $("#gms-modal-warning").remove(); GuildMemberStat.acceptedDeleteWarning = true; });
                                });
                            }
                            e.stopPropagation();
                            $(this).closest('table').find('.deleteButton').fadeToggle(50);
                        });

                        // Delete an inactivity entry
                        $('#GuildMemberTable .deleteInactivity').off('click').on('click', function () {

                            let button = $(this);
                            let index = parseInt($(button).attr('data-warn'));
                            let player_id = parseInt($(button).attr('data-id'));

                            let delObj = {
                                player_id: player_id,
                                data: GuildMemberStat.MemberDict[player_id]['activity'][0]['warnings'][index],
                                content: 'activity'
                            }

                            GuildMemberStat.DeletePlayerDetail(delObj);

                            $(button).closest("tr").remove();

                        });

                        // Delete an gex entry
                        $('#GuildMemberTable .deleteGexWeek').off('click').on('click', function () {

                            let button = $(this);
                            let delObj = {
                                player_id: parseInt($(button).attr('data-id')),
                                data: { gexweek: parseInt($(button).attr('data-gexweek')) },
                                content: 'gex'
                            }

                            GuildMemberStat.DeletePlayerDetail(delObj);

                            $(button).closest("tr").remove();

                        });

                        // Delete an gbg entry
                        $('#GuildMemberTable .deleteGBG').off('click').on('click', function () {

                            let button = $(this);
                            let delObj = {
                                player_id: parseInt($(button).attr('data-id')),
                                data: { gbgid: parseInt($(button).attr('data-gbgid')) },
                                content: 'gbg'
                            }

                            GuildMemberStat.DeletePlayerDetail(delObj);

                            $(button).closest("tr").remove();

                        });

                        $('#GuildMemberTable thead.hasdetail').off('click').on('click', function () {

                            let thead = $(this);

                            if ($(thead).hasClass('open'))
                            {
                                $(thead).removeClass('open').addClass('closed');
                                $(thead).next().removeClass('open').addClass('closed');
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
            GuildMemberStat.hidePreloader('#GuildMemberStat');
        });
    },


    ShowGuildEras: async () => {

        GuildMemberStat.CurrentStatGroup = 'Eras';
        GuildMemberStat.showPreloader("#GuildMemberStat");
        GuildMemberStat.InitSettings();

        let GuildMembers = await GuildMemberStat.db.player.where({ deleted: 0 }).reverse().sortBy('score');
        let d = [];
        let rank = 1;
        let TreasuryGoodsData = GuildMemberStat.TreasuryGoodsData;
        let hasTreasuryTotals = (TreasuryGoodsData !== undefined && TreasuryGoodsData !== null && TreasuryGoodsData.hasOwnProperty('totals')) ? true : false;

        // group members to era
        const EraGroup = GuildMembers.reduce((res, obj) => {
            eraId = Technologies.Eras[obj['era']];
            if (!(eraId in res))
            {
                res[eraId] = { eraId: eraId, era: obj['era'], score: 0 };
                res[eraId]['members'] = [];
            }
            res[eraId]['members'].push(
                obj
            );
            res[eraId].score += obj.score;

            return res;
        }, []);

        d.push(`<div class="detail-wrapper">`);

        if (EraGroup)
        {
            d.push(`<div class="detail-item guildgoods">` +
                `<table id="GuildErasTable" class="foe-table copyable">` +
                `<thead><tr class="sorter-header">` +
                `<th class="is-number" data-type="gms-era">#</th>` +
                `<th class="case-sensitive" data-type="gms-era">${i18n('Boxes.GuildMemberStat.Eras')}</th>` +
                `<th class="is-number text-center" data-type="gms-era">${i18n('Boxes.GuildMemberStat.GuildMembers')}</th>`);
            d.push(`<th class="is-number ${hasTreasuryTotals ? 'text-right' : 'text-center'}" data-type="gms-era">${i18n('Boxes.GuildMemberStat.TreasuryGoods')}</th>`);
            d.push(`<th class="is-number text-right" data-type="gms-era">${i18n('Boxes.GuildMemberStat.Points')}</th><th></th></tr>` +
                `</thead><tbody class="gms-era">`);

            for (let era in EraGroup)
            {

                let countEra = typeof EraGroup[era].members.length != 'undefined' ? EraGroup[era].members.length : 1;

                d.push(`<tr id="era${EraGroup[era].eraId}" data-id="${EraGroup[era].eraId}" class="hasdetail">` +
                    `<td class="is-number" data-number="${EraGroup[era].eraId}">${EraGroup[era].eraId}</td>` +
                    `<td class="case-sensitive" data-text="${i18n('Eras.' + EraGroup[era].eraId)}">${i18n('Eras.' + EraGroup[era].eraId)}</td>` +
                    `<td class="is-number text-center" data-number="${countEra}">${countEra}</td>`);

                if (hasTreasuryTotals)
                {
                    eraTotals = TreasuryGoodsData['totals'].hasOwnProperty([EraGroup[era].era]) ? TreasuryGoodsData.totals[EraGroup[era].era] : 0;
                    d.push(`<td title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.LastUpdate')) + ' ' + moment(TreasuryGoodsData.updated).fromNow()}" class="is-number text-right gms-tooltip" data-number="${eraTotals}">${HTML.Format(eraTotals)}</td>`);
                }
                else
                {
                    d.push(`<td title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.GuildTreasuryNotification'))}" class="gms-tooltip is-number text-center" data-number="${EraGroup[era].eraId}">-</td>`);
                }

                d.push(`<td class="is-number text-right" data-number="${EraGroup[era].score}">${HTML.Format(EraGroup[era].score)}</td><td></td>` +
                    `</tr>`);
            };
            d.push(`</tbody></table></div>`);
        }

        d.push(`</div>`);

        $('#gmsContentWrapper').html(d.join('')).promise().done(function () {

            $("#GuildErasTable").tableSorter();

            $('#GuildErasTable .gms-tooltip').tooltip({
                html: true,
                container: '#GuildMemberStatBody'
            });

            $('#GuildErasTable > tbody tr').on('click', function () {

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

                    $(this).addClass('open');

                    let eraId = $(this).attr('data-id');
                    let h = [];

                    h.push(`<tr class="detailview dark-bg"><td colspan="${$(this).find("td").length}"><div class="detail-wrapper"><div class="detail-item">` +
                        `<table><thead><tr><th>${i18n('Boxes.GuildMemberStat.Rank')}</th><th>${i18n('Boxes.GuildMemberStat.Member')}</th><th>${i18n('Boxes.GuildMemberStat.Eras')}</th><th class="text-right">${i18n('Boxes.GuildMemberStat.Points')}</th></tr></thead><tbody>`);
                    if (EraGroup[eraId].members !== undefined)
                    {

                        let EraMembers = EraGroup[eraId].members.sort(function (a, b) { return a.score > b.score });

                        EraMembers.forEach(member => {
                            h.push(`<tr><td>${member.rank[1]}</td><td>${member.name}</td><td>${i18n('Eras.' + eraId)}</td><td class="text-right">${HTML.Format(member.score)}</td></tr>`);
                        });

                    }
                    h.push('</tbody></table></div>');

                    // Show in stock Treasury Goods for Era 
                    if (TreasuryGoodsData !== null && typeof TreasuryGoodsData[EraGroup[eraId].era] !== 'undefined')
                    {
                        let EraTreasuryGoods = TreasuryGoodsData[EraGroup[eraId].era];

                        h.push(`<div class="detail-item"><table><thead><tr><th colspan="3">${i18n('Boxes.GuildMemberStat.EraTreasuryGoods')}</th></tr></thead><tbody>`);
                        EraTreasuryGoods.forEach(good => {
                            h.push(`<tr><td class="goods-image"><span class="goods-sprite-50 sm ${good.good}"></span></td><td>${good.name}</td><td class="text-right">${HTML.Format(good.value)}</td></tr>`);
                        });

                        h.push(`<tr><td colspan="3" class="text-right"><i>${i18n('Boxes.GuildMemberStat.LastUpdate') + ' ' + moment(TreasuryGoodsData.updated).fromNow()}</i></td></tr>`);
                        h.push(`</tbody></table></div>`);

                    }
                    h.push('</div></td></tr>');

                    $(h.join('')).insertAfter($('#era' + eraId));
                }
            });

            GuildMemberStat.hidePreloader('#GuildMemberStat');
        });

    },


    ShowGuildBuildings: async () => {

        GuildMemberStat.showPreloader("#GuildMemberStat");
        GuildMemberStat.InitSettings();
        GuildMemberStat.CurrentStatGroup = 'GuildBuildings';

        let d = [];
        let totalGoods = 0;
        let totalPower = 0;

        let gmsBuildingDict = await GuildMemberStat.GetGuildMemberBuildings();

        // add notification for how to update guild building statisitc
        d.push(`<div style="padding: 10px;">${i18n('Boxes.GuildMemberStat.GuildBuildingNotification')}</div>`);

        if (gmsBuildingDict === undefined || gmsBuildingDict.length <= 0)
        {
            $("#gmsContentWrapper").html(d.join(''));
            GuildMemberStat.hidePreloader('#GuildMemberStat');
            return;
        }

        let guildGoodsBuildings = gmsBuildingDict.reduce(function (res, obj) {

            if (obj.resources !== undefined)
            {
                let count = typeof obj.count === 'undefined' ? 1 : obj.count;

                if (!(obj.name in res))
                {
                    res.__array.push(res[obj.name] = obj);
                    res[obj.name].count = count;
                }
                else
                {
                    res[obj.name].resources.totalgoods += obj.resources.totalgoods;
                    res[obj.name].count += count;
                }

            }
            return res;
        }, { __array: [] }).__array.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });

        let guildPowerBuildings = gmsBuildingDict.reduce(function (res, obj) {

            if (obj.power !== undefined)
            {
                let count = typeof obj.count === 'undefined' ? 1 : obj.count;

                if (!(obj.name in res))
                {
                    res.__array.push(res[obj.name] = obj);
                    res[obj.name].count = count;
                }
                else
                {
                    res[obj.name].power.value += obj.power.value;
                    res[obj.name].count += count;
                }
            }
            return res;
        }, { __array: [] }).__array.sort(function (a, b) {
            return a.name.localeCompare(b.name);
        });

        d.push(`<div class="detail-wrapper">`);

        if (guildGoodsBuildings.length)
        {
            d.push(`<div class="detail-item guildgoods"><table class="foe-table copyable"><thead><tr><th colspan="3"><i>${i18n('Boxes.GuildMemberStat.GuildGoods')}</i></th></tr></thead><tbody>`);

            guildGoodsBuildings.forEach(plbuilding => {
                let countBuilding = typeof plbuilding.count != 'undefined' ? plbuilding.count : 1;
                let goodCount = (plbuilding.resources && plbuilding.resources.totalgoods) ? plbuilding.resources.totalgoods : 0;
                totalGoods += goodCount;
                d.push(`<tr><td class="text-right">${countBuilding} x</td><td>${plbuilding.name}</td><td class="text-right">${HTML.Format(goodCount)}</td></tr>`);
            });

            d.push(`<tr><td></td><td class="text-bright">${i18n('Boxes.GuildMemberStat.TotalGuildGoods')}</td><td class="text-right text-bright">${HTML.Format(totalGoods)}</td></tr>`);
            d.push(`</tbody></table></div>`);
        }

        if (guildPowerBuildings.length)
        {
            d.push(`<div class="detail-item guildgoods"><table class="foe-table copyable"><thead><tr><th colspan="3"><i>${i18n('Boxes.GuildMemberStat.GuildPower')}</i></th></tr></thead><tbody>`);

            guildPowerBuildings.forEach(plbuilding => {
                let countBuilding = typeof plbuilding.count != 'undefined' ? plbuilding.count : 1;
                let powerCount = (plbuilding.power && plbuilding.power.value) ? plbuilding.power.value : 0;
                totalPower += powerCount;
                d.push(`<tr><td class="text-right">${countBuilding} x</td><td>${plbuilding.name}</td><td class="text-right">${HTML.Format(powerCount)}</td></tr>`);
            });

            d.push(`<tr><td></td><td class="text-bright">${i18n('Boxes.GuildMemberStat.TotalGuildPower')}</td><td class="text-right text-bright">${HTML.Format(totalPower)}</td></tr>`);
            d.push(`</tbody></table></div>`);
        }

        d.push(`</div>`);

        $('#gmsContentWrapper').html(d.join('')).promise().done(function () {
            GuildMemberStat.hidePreloader('#GuildMemberStat');
        });
    },


    ShowGuildGoods: async () => {

        GuildMemberStat.showPreloader("#GuildMemberStat");
        GuildMemberStat.InitSettings();
        GuildMemberStat.CurrentStatGroup = 'GuildGoods';

        let d = [];
        let ErasGuildGoods = await GuildMemberStat.GetGuildMemberBuildings();
        let TreasuryGoodsData = GuildMemberStat.TreasuryGoodsData;

        ErasGuildGoods = ErasGuildGoods.reduce(function (res, obj) {

            if (obj.era !== undefined && obj.resources !== undefined && obj.resources.goods !== undefined && obj.resources.goods !== null)
            {

                eraId = Technologies.Eras[obj['era']];

                if (!(eraId in res))
                {
                    res[eraId] = {};
                    obj.resources.goods.forEach(good => {
                        res[eraId][good.good_id] = { name: GoodsData[good.good_id].name, value: good.value };
                    });
                }
                else
                {
                    obj.resources.goods.forEach(good => {
                        res[eraId][good.good_id].value += good.value;
                    });
                }
            }
            return res;

        }, {});

        // add notification for how to update guild building statisitc and Treasury Goods List
        d.push(`<div style="padding: 10px;">1. ${i18n('Boxes.GuildMemberStat.GuildBuildingNotification')}<br />2. ${i18n('Boxes.GuildMemberStat.GuildTreasuryNotification')}</div>`);

        if (ErasGuildGoods === null)
        {
            GuildMemberStat.hidePreloader('#GuildMemberStat');
            return;
        }
        d.push(`<table id="TreasuryGoodsTable" class="foe-table"><thead><tr><th>${i18n('Boxes.GuildMemberStat.Eras')}</th><th> ${i18n('Boxes.GuildMemberStat.ProducedTreasuryGoods')}</th><th> ${i18n('Boxes.GuildMemberStat.TreasuryGoods')}</th></thead><tbody>`);

        for (let eraId in Object.keys(Technologies.Eras))
        {
            if (eraId < 3 || Technologies.EraNames[eraId] === undefined) { continue; }

            d.push(`<tr><td>${i18n('Eras.' + eraId)}</td>`);

            // Goods from Guild Building productions
            if (ErasGuildGoods[eraId] !== undefined)
            {
                let DailyGuildGoods = ErasGuildGoods[eraId];

                d.push(`<td class="detail dark">`);
                d.push(`<div class="detail-item"><table class="foe-table copyable">`);
                d.push(`<tbody>`);

                for (let i in DailyGuildGoods)
                {
                    if (DailyGuildGoods.hasOwnProperty(i))
                    {
                        d.push(`<tr><td class="goods-image"><span class="goods-sprite-50 sm ${i}"></span></td><td>${DailyGuildGoods[i].name}</td><td class="text-right">${HTML.Format(DailyGuildGoods[i].value)}</td></tr>`);
                    }
                };
                d.push(`</tbody></table></div>`);
                d.push(`</td>`);
            }
            else
            {
                d.push(`<td class="detail text-center dark gms-tooltip" title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.GuildBuildingNotification'))}">-</td>`);
            }

            // In stock guild good for the era
            if (TreasuryGoodsData !== undefined && TreasuryGoodsData !== null && typeof TreasuryGoodsData[Technologies.EraNames[eraId]] !== 'undefined')
            {
                let EraTreasuryGoods = TreasuryGoodsData[Technologies.EraNames[eraId]].sort(function (a, b) { return a.good.localeCompare(b.good) });
                d.push(`<td class="detail">`);

                d.push(`<div class="detail-item"><table class="foe-table copyable">`);
                d.push(`<tbody>`);

                EraTreasuryGoods.forEach(good => {
                    d.push(`<tr><td class="goods-image"><span class="goods-sprite-50 sm ${good.good}"></span></td><td>${good.name}</td><td class="text-right">${HTML.Format(good.value)}</td></tr>`);
                });

                d.push(`</tbody></table></div>`);
                d.push(`</td>`);

            }
            else
            {
                d.push(`<td class="detail text-center gms-tooltip" ${TreasuryGoodsData === null ? `title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.GuildTreasuryNotification'))}"` : ''}>-</td>`);
            }

            d.push(`</td></tr>`);
        };

        d.push(`</tbody></table>`);

        $('#gmsContentWrapper').html(d.join('')).promise().done(function () {

            $('#TreasuryGoodsTable .gms-tooltip').tooltip({
                html: true,
                container: '#GuildMemberStatBody'
            });

            GuildMemberStat.hidePreloader('#GuildMemberStat');
        });
    },


    GetGuildMemberBuildings: async () => {

        let GuildMembers = await GuildMemberStat.db.player.where({ deleted: 0 }).toArray();
        let gmsBuildingDict = [];

        for (let x = 0; x < GuildMembers.length; x++)
        {
            const member = GuildMembers[x];

            if (typeof member['guildbuildings'] !== 'undefined')
            {
                gmsBuildingDict.push(...member['guildbuildings']['buildings']);
            }
        }

        return gmsBuildingDict;

    },


    DeletePlayerDetail: async (delObj) => {

        if (delObj === undefined || delObj === null)
        {
            return;
        }
        let player_id = delObj.player_id,
            content = delObj.content,
            data = delObj.data;

        switch (content)
        {
            case 'activity':
                await GuildMemberStat.db.activity.where('player_id').equals(player_id).modify(x => {
                    x.warnings = x.warnings.filter(el => {
                        return !(el.activity == data.activity && +moment(el.date) == +moment(data.date))
                    });
                });

                break;
            case 'gex':
                await GuildMemberStat.db.gex.where({ player_id: player_id, gexweek: data.gexweek }).delete();
                break;
            case 'gbg':
                await GuildMemberStat.db.gbg.where({ player_id: player_id, gbgid: data.gbgid }).delete();
                break;

        }
    },


    InitSettings: () => {

        let Settings = JSON.parse(localStorage.getItem('GuildMemberStatSettings'));
        let TreasuryGoods = JSON.parse(localStorage.getItem('GuildMemberStatTreasuryGoods'));

        if (!Settings)
        {
            return;
        }

        GuildMemberStat.Settings.lastupdate = (Settings.lastupdate !== undefined) ? Settings.lastupdate : 0;
        GuildMemberStat.Settings.showDeletedMembers = (Settings.showDeletedMembers !== undefined) ? Settings.showDeletedMembers : GuildMemberStat.Settings.showDeletedMembers;
        GuildMemberStat.Settings.deleteOlderThan = (Settings.deleteOlderThan !== undefined) ? Settings.deleteOlderThan : GuildMemberStat.Settings.deleteOlderThan;
        GuildMemberStat.Settings.autoStartOnUpdate = (Settings.autoStartOnUpdate !== undefined) ? Settings.autoStartOnUpdate : GuildMemberStat.Settings.autoStartOnUpdate;
        GuildMemberStat.Settings.showSearchbar = (Settings.showSearchbar !== undefined) ? Settings.showSearchbar : GuildMemberStat.Settings.showSearchbar;
        GuildMemberStat.TreasuryGoodsData = (TreasuryGoods !== undefined) ? TreasuryGoods : {};

    },


    GuildMemberStatSettings: () => {

        let c = [];
        let deleteAfterDays = [0, 3, 7, 14, 31]
        let Settings = GuildMemberStat.Settings;

        c.push(`<p class="text-left"><input id="gmsAutoStartOnUpdate" name="autostartonupdate" value="1" type="checkbox" ${(Settings.autoStartOnUpdate === 1) ? ' checked="checked"' : ''} /> <label for="gmsAutoStartOnUpdate">${i18n('Boxes.GuildMemberStat.AutoStartOnUpdate')}</label></p>`);
        c.push(`<p class="text-left"><input id="gmsShowSearchbar" name="showsearchbar" value="1" type="checkbox" ${(Settings.showSearchbar === 1) ? ' checked="checked"' : ''} /> <label for="gmsShowSearchbar">${i18n('Boxes.GuildMemberStat.ShowSearchbar')}</label></p>`);
        c.push(`<p class="text-left"><input id="gmsShowDeletedMembers" name="showdeletedmembers" value="1" type="checkbox" ${(Settings.showDeletedMembers === 1) ? ' checked="checked"' : ''} /> <label for="gmsShowDeletedMembers">${i18n('Boxes.GuildMemberStat.ShowDeletedMembers')}</label></p>`);
        c.push(`<p class="text-left">${i18n('Boxes.GuildMemberStat.DeleteExMembersAfter')} <select id="gmsDeleteOlderThan" name="deleteolderthan">`);

        deleteAfterDays.forEach(days => {
            let option = days + ' ' + i18n('Boxes.GuildMemberStat.Days');
            if (days === 0)
                option = i18n('Boxes.GuildMemberStat.Never');
            c.push(`<option value="${days}" ${Settings.deleteOlderThan == days ? ' selected="selected"' : ''}>${option}</option>`);
        });

        c.push(`</select>`);
        c.push(`<hr><p><button id="save-GuildMemberStat-settings" class="btn btn-default" style="width:100%" onclick="GuildMemberStat.SettingsSaveValues()">${i18n('Boxes.Investment.Overview.SettingsSave')}</button></p>`);

        $('#GuildMemberStatSettingsBox').html(c.join(''));
    },


    SettingsSaveValues: async () => {

        let tmpDeleteOlder = parseInt($('#gmsDeleteOlderThan').val());

        GuildMemberStat.Settings.showDeletedMembers = $("#gmsShowDeletedMembers").is(':checked') ? 1 : 0;
        GuildMemberStat.Settings.autoStartOnUpdate = $("#gmsAutoStartOnUpdate").is(':checked') ? 1 : 0;
        GuildMemberStat.Settings.showSearchbar = $("#gmsShowSearchbar").is(':checked') ? 1 : 0;

        if (GuildMemberStat.Settings.deleteOlderThan != tmpDeleteOlder && tmpDeleteOlder > 0)
        {
            GuildMemberStat.showPreloader('#GuildMemberStat');

            await GuildMemberStat.DeleteExMembersOlderThan(tmpDeleteOlder);
        }

        GuildMemberStat.Settings.deleteOlderThan = tmpDeleteOlder;

        localStorage.setItem('GuildMemberStatSettings', JSON.stringify(GuildMemberStat.Settings));

        $(`#GuildMemberStatSettingsBox`).fadeToggle('fast', function () {
            $(this).remove();

            if (GuildMemberStat.CurrentStatGroup === 'Member')
            {
                GuildMemberStat.Show();
            }
        });
    },


    setEraGoods: (d) => {

        GuildMemberStat.TreasuryGoodsData = {};
        let eraGoodsTotals = {};

        for (let i in d)
        {
            if (d.hasOwnProperty(i))
            {
                let era = GoodsData[i]['era'];
                let name = GoodsData[i]['name'];

                if (!(era in GuildMemberStat.TreasuryGoodsData))
                {
                    GuildMemberStat.TreasuryGoodsData[era] = [];
                    eraGoodsTotals[era] = 0;

                }

                GuildMemberStat.TreasuryGoodsData[era].push({ good: i, name: name, value: d[i] });
                eraGoodsTotals[era] += d[i];
            }
        }

        GuildMemberStat.TreasuryGoodsData.updated = +MainParser.getCurrentDate();
        GuildMemberStat.TreasuryGoodsData.totals = eraGoodsTotals;

        localStorage.setItem('GuildMemberStatTreasuryGoods', JSON.stringify(GuildMemberStat.TreasuryGoodsData));

        if ($('#GuildMemberStatBody').length)
        {
            switch (GuildMemberStat.CurrentStatGroup)
            {
                case 'GuildGoods':
                    GuildMemberStat.ShowGuildGoods();
                    break;
                case 'Eras':
                    GuildMemberStat.ShowGuildEras();
                    break;
            }
        }

    },


    // helper functions
    uniq_array: (a) => {

        let seen = {};
        return a.filter(function (item) {
            return seen.hasOwnProperty(item) ? false : (seen[item] = true);
        });
    },


    showPreloader: (id) => {

        if (!$('#gms-loading-data').length)
        {
            $(id).append('<div id="gms-loading-data"><div class="loadericon"></div></div>');
        }

    },


    hidePreloader: () => {

        $('#gms-loading-data').fadeOut(600, function () {
            $(this).remove();
        });

    },


    remove_key_from_array: (arr, value) => {

        return arr.filter(function (ele) {
            return ele !== value;
        });
    },


    filterTable: (input, table) => {
        var input, filter, table, tr, td, cell, i, j;
        input = document.getElementById(input);
        filter = input.value.toUpperCase();
        table = document.getElementById(table);
        tr = table.getElementsByTagName("tr");
        for (i = 1; i < tr.length; i++)
        {
            tr[i].style.display = "none";

            td = tr[i].getElementsByTagName("td");
            for (var j = 0; j < td.length; j++)
            {
                cell = tr[i].getElementsByTagName("td")[j];
                if (cell)
                {
                    if (cell.innerHTML.toUpperCase().indexOf(filter) > -1)
                    {
                        tr[i].style.display = "";
                        break;
                    }
                }
            }
        }
    }
}