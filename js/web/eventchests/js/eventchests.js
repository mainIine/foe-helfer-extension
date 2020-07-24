/*
 * **************************************************************************************
 *
 * Dateiname:                 eventchests.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              07.01.2020, 13:06 Uhr
 * zuletzt bearbeitet:       07.01.2020, 13:06 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('ChestEventService', 'getOverview', (data, postData) => {
    let Chests = data.responseData['chests'];

    let ChestData = [];
    for (let i in Chests) {
        if (!Chests.hasOwnProperty(i)) continue;

        let CurrentChest = [];
        if (Chests[i]['cost'] !== undefined && Chests[i]['cost']['resources'] !== undefined) {
            CurrentChest['cost'] = 0;
            for (let ResourceName in Chests[i]['cost']['resources']) {
                if (!Chests[i]['cost']['resources'].hasOwnProperty(ResourceName)) continue;

                CurrentChest['cost'] += Chests[i]['cost']['resources'][ResourceName];
            }
        }
        else {
            continue;
        }

        if (Chests[i]['grandPrizeContribution'] !== undefined) {
            CurrentChest['grandPrizeContribution'] = Chests[i]['grandPrizeContribution'];
        }
        else {
            continue;
        }

        if (Chests[i]['chest'] !== undefined && Chests[i]['chest']['possible_rewards'] !== undefined && Chests[i]['chest']['possible_rewards'][0] !== undefined && Chests[i]['chest']['possible_rewards'][0]['drop_chance'] !== undefined) {
            CurrentChest['drop_chance'] = Chests[i]['chest']['possible_rewards'][0]['drop_chance']
        }
        else {
            continue;
        }

        if (Chests[i]['chest'] !== undefined && Chests[i]['chest']['possible_rewards'] !== undefined && Chests[i]['chest']['possible_rewards'][0] !== undefined && Chests[i]['chest']['possible_rewards'][0]['reward'] !== undefined && Chests[i]['chest']['possible_rewards'][0]['reward']['name'] !== undefined) {
            CurrentChest['dailyprizename'] = Chests[i]['chest']['possible_rewards'][0]['reward']['name'];
        }
        else {
            continue;
        }

        CurrentChest['costpermainprizestep'] = CurrentChest['cost'] / CurrentChest['grandPrizeContribution'];
        CurrentChest['costperdailyprize'] = CurrentChest['cost'] * 100 / CurrentChest['drop_chance'];

        ChestData[ChestData.length] = CurrentChest;
    }

    /*
    ChestData.sort(function (a, b) {
        return a['cost'] - b['cost'];
    });
    */

    // Ungültige Daten => Event wird nicht unterstützt => Fenster nicht anzeigen
    if (ChestData.length === 0) {
        return;
    }

    EventChests.Chests = ChestData;
    EventChests.Show();
});

/**
 *
 * @type {{
 * Show: ()=>void,
 * BuildBox: ()=>void,
 * CalcBody: ()=>void,
 * }}
 */
let EventChests = {
    Chests: null,

    /**
     *
     */
    Show: () => {
        if ($('#eventchests').length === 0) {
            HTML.Box({
                'id': 'eventchests',
                'title': i18n('Boxes.EventChests.Title'),
                'auto_close': true,
                'dragdrop': true,
                'minimize': true
            });

            // CSS in den DOM prügeln
            HTML.AddCssFile('eventchests');
        }

        EventChests.BuildBox();
    },

    /**
    *
    */
    BuildBox: () => {
        EventChests.CalcBody();
    },


    /**
    *
    */
    CalcBody: () => {
        let h = [];

        h.push('<table class="foe-table">');
        h.push('<thead>' +
            '<tr>' +
            '<th></th>' +
            '<th colspan="2" class="text-center">' + i18n('Boxes.EventChests.MainPrize') + '</th>' +
            '<th colspan="2" class="text-center">' + i18n('Boxes.EventChests.MainPrizeTitle') + EventChests.Chests[0]['dailyprizename'] + '</th>' +
            '</tr>' +

            '<tr>' +
            '<th class="text-center">' + i18n('Boxes.EventChests.Cost') + '</th>' +
            '<th class="text-center">' + i18n('Boxes.EventChests.Steps') + '</th>' +
            '<th class="text-center">' + i18n('Boxes.EventChests.CostPerStep') + '</th>' +
            '<th class="text-center">' + i18n('Boxes.EventChests.Chance') + '</th>' +
            '<th class="text-center">' + i18n('Boxes.EventChests.CostPerPrize') + '</th>' +
            '</tr>' +

            '</thead>');

        let BestMainPrizeCost = 999999,
            BestDailyPrizeCost = 999999;

        for (let i in EventChests.Chests) {
            if (!EventChests.Chests.hasOwnProperty(i)) continue;

            BestMainPrizeCost = Math.min(BestMainPrizeCost, EventChests.Chests[i]['costpermainprizestep']);
            BestDailyPrizeCost = Math.min(BestDailyPrizeCost, EventChests.Chests[i]['costperdailyprize']);
        }

        for (let i in EventChests.Chests) {
            if (!EventChests.Chests.hasOwnProperty(i)) continue;

            h.push('<tr>');
            h.push('<td class="text-center text-warning text-bold">' + EventChests.Chests[i]['cost'] + '</td>');

            h.push('<td class="text-center">' + EventChests.Chests[i]['grandPrizeContribution'] + '</td>');
            h.push('<td class="text-center border-right' + (EventChests.Chests[i]['costpermainprizestep'] <= BestMainPrizeCost ? ' text-success text-bold' : '') + '">' + Math.round(EventChests.Chests[i]['costpermainprizestep'] * 10) / 10 + '</td>');

            h.push('<td class="text-center border-left">' + EventChests.Chests[i]['drop_chance'] + '%</td>');
            h.push('<td class="text-center' + (EventChests.Chests[i]['costperdailyprize'] <= BestDailyPrizeCost ? ' text-success text-bold' : '') + '">' + Math.round(EventChests.Chests[i]['costperdailyprize']) + '</td>');

            h.push('</tr>');
        }

        h.push('</table>');

        $('#eventchestsBody').html(h.join(''));
    },
};