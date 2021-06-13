/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/dsiekiera/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

// Guild rank in GEX
FoEproxy.addHandler('ChampionshipService', 'getOverview', (data, postData) => {
    if (data)
    {
        GexStat.UpdateData('championship', data.responseData);
    }
});

FoEproxy.addHandler('GuildExpeditionService', 'getOverview', (data, postData) => {
    let Data = data.responseData;
    if (Data !== undefined)
    {
        if (data.responseData['state'] !== 'inactive')
        {
            GexStat.GEXId = Data.nextStateTime;
        }
        else
        {
            GexStat.GEXId = (Data.nextStateTime * 1 - 86400);
        }
    }
});

let GexStat = {
    db: null,
    GEXId: undefined,
    GexWeeks: undefined,
    CurrentGexWeek: undefined,

    /**
     *
     * @returns {Promise<void>}
     */
    checkForDB: async (playerID) => {

        const DBName = `FoeHelperDB_GexStat_${playerID}`;

        GexStat.db = new Dexie(DBName);

        GexStat.db.version(1).stores({
            ranking: '&gexweek'
        });

        GexStat.db.open();
    },


    BuildBox: (event) => {

        if ($('#GexStat').length === 0)
        {
            HTML.Box({
                id: 'GexStat',
                title: i18n('Boxes.GexStat.Title'),
                auto_close: true,
                dragdrop: true,
                resize: true,
                minimize: true,
                //settings: 'GuildMemberStat.GexStatSettings()'
            });

            GexStat.showPreloader('#GexStat');

            HTML.AddCssFile('gexstat');
        }
        else if (!event)
        {
            HTML.CloseOpenBox('GexStat');
            return;
        }

        // moment.locale(i18n('Local'));
        // GexStat.InitSettings();

        GexStat.Show();
    },


    UpdateData: async (source, data) => {

        let gexid = GexStat.GEXId;

        if (!gexid || !data.ranking || !data.participants)
        {
            return;
        }

        let ranking = data.ranking;
        let participants = data.participants;
        let gexdata = {};

        participants.forEach(guild => {

            if (gexdata[guild.id] === undefined)
            {
                gexdata[guild.id] = {};
            }

            let rankdata = ranking.filter(function (rank) {
                return rank.participantId === guild.id;
            });

            gexdata[guild.id].guildId = guild.id;
            gexdata[guild.id].worldId = guild.worldId;
            gexdata[guild.id].name = guild.name;
            gexdata[guild.id].level = guild.level;
            gexdata[guild.id].worldrank = guild.rank;
            gexdata[guild.id].flag = guild.flag.toLowerCase();
            gexdata[guild.id].memberCount = guild.memberCount;
            gexdata[guild.id].trophies = guild.trophies;
            gexdata[guild.id].worldName = guild.worldName
            gexdata[guild.id].rank = rankdata[0].rank;
            gexdata[guild.id].points = rankdata[0].points;

        });

        await GexStat.db.ranking.put({
            gexweek: gexid,
            participants: Object.values(gexdata),
            lastupdate: MainParser.getCurrentDate()
        });

        if ($('#GexStatBody').length)
        {
            GexStat.Show();
        }

    },


    Show: async (gexweek) => {

        GexStat.showPreloader("#GexStat");
        let GexRanking = undefined;

        let h = [];

        if (gexweek === undefined || gexweek === null)
        {
            GexRanking = await GexStat.db.ranking.reverse().first();
            gexweek = GexRanking && GexRanking.gexweek ? GexRanking.gexweek : undefined;
        }
        else
        {
            GexRanking = await GexStat.db.ranking.where('gexweek').equals(gexweek).first();
        }

        GexStat.CurrentGexWeek = gexweek;

        let previousweek = gexweek - 604800;
        let nextweek = gexweek + 604800;

        // No GEX data available 
        if (gexweek === undefined || !GexRanking.participants)
        {
            GexStat.hidePreloader("#GexStat");
            h.push(`<div class="overlay"><div class="no-data"><p>${i18n('Boxes.GexStat.ResultsNoData')}</p></div></div>`);
            $('#GexStatBody').html(h.join(''))
            return;
        }


        // get all available Gex week keys 
        GexStat.GexWeeks = await GexStat.db.ranking.where('gexweek').above(0).keys();

        GexStat.GexWeeks = GexStat.GexWeeks.sort(function (a, b) {
            return b - a;
        });

        let GexPaticipants = GexRanking.participants.sort(function (a, b) {
            return a.rank - b.rank;
        });

        h.push(`<div id="gexsContentWrapper">` +
            `<div class="weekswitch dark-bg">${i18n('Boxes.GexStat.Gex')} ${i18n('Boxes.GexStat.Week')} <button class="btn btn-default btn-set-week" data-week="${previousweek}"${!GexStat.GexWeeks.includes(previousweek) ? ' disabled' : ''}>&lt;</button> ` +
            `<select id="gexs-select-gexweek">`);

        GexStat.GexWeeks.forEach(week => {
            h.push(`<option value="${week}"${gexweek === week ? ' selected="selected"' : ''}>` + moment.unix(week - 518400).format(i18n('Date')) + ` - ` + moment.unix(week).format(i18n('Date')) + `</option>`);
        });

        h.push(`</select> <button class="btn btn-default btn-set-week" data-week="${nextweek}"${!GexStat.GexWeeks.includes(nextweek) ? ' disabled' : ''}>&gt;</button></div>`);
        h.push(`<table id="GexStatTable" class="foe-table">` +
            // `<thead><tr>` +
            // `<th>Rank</th>` +
            // `<th>Guild</th>` +
            // `<th>Process</th>` +
            // `<th>Detail</th>` +
            // `</tr></thead>` +
            `<tbody><tr>`);

        //const map = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;

        for (let x = 0; x < GexPaticipants.length; x++)
        {
            const participant = GexPaticipants[x];
            let points = parseInt(participant.points);
            //let progressWidth = map(points, 0, 133, 0, 100);
            let progressWidth = points >= 100 ? 100 : points;
            let rankClass = participant.rank <= 3 ? participant.rank : 0;
            let stripedClass = points > 100 ? ' glow' : '';

            h.push(`<tr>`);
            h.push(`<td class="td-rank"><span class="winner-rank rank-${rankClass}"><span>${participant.rank}</span></span></td>`);
            h.push(`<td>` +
                `<div class="clanflag"><img src="${MainParser.InnoCDN + 'assets/shared/clanflags/' + participant.flag + '.jpg'}" /></div>` +
                `<div class="claninfo"><span class="clanname">${participant.name}</span><br /> ` +
                `<span class="clanworld">${participant.worldName}</span></div></td>`);
            h.push(`<td class="progress"><div class="progbar rank-${rankClass}${stripedClass}" style="width: ${progressWidth}%"></div> ${participant.points}%</td>`);
            h.push(`<td><div class="flex justify-content-between mbottom2"><div>${i18n('Boxes.GexStat.Rank')}: ${participant.worldrank} </div><div>${i18n('Boxes.GexStat.Member')}: ${participant.memberCount}</div></div>` +
                `<div class="flex justify-content-between"><div>${i18n('Boxes.GexStat.Level')}: ${participant.level}</div>` +
                `<div><span class="trophie"></span> <strong>${participant.trophies.guild_championship_trophy_gold}</strong>` +
                `<span class="trophie silver"></span> <strong>${participant.trophies.guild_championship_trophy_silver}</strong>` +
                `<span class="trophie bronze"></span> <strong>${participant.trophies.guild_championship_trophy_bronze}</strong></div></div></td>`);

            h.push(`</tr>`);

        }

        h.push('</tbody></table>');

        h.push('</div>');

        $('#GexStatBody').html(h.join('')).promise().done(function () {

            // Fade out loading screen
            GexStat.hidePreloader('#GexStat');

            $(".btn-set-week").off().on('click', function () {

                let week = $(this).data('week');

                if (!GexStat.GexWeeks.includes(week))
                {
                    return;
                };

                GexStat.Show(week);
            });

            $("#gexs-select-gexweek").off().on('change', function () {


                let week = parseInt($(this).val());

                if (!GexStat.GexWeeks.includes(week) || week === GexStat.CurrentGexWeek)
                {
                    return;
                };

                GexStat.Show(week);
            });

        });

    },


    showPreloader: (id) => {

        if (!$('#gexs-loading-data').length)
        {
            $(id).append('<div id="gexs-loading-data"><div class="loadericon"></div></div>');
        }

    },


    hidePreloader: () => {

        $('#gexs-loading-data').fadeOut(600, function () {
            $(this).remove();
        });

    },

}