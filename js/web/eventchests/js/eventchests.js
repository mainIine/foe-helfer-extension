/*
 * **************************************************************************************
 * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('ChestEventService', 'getOverview', (data, postData) => {

	// is activated?
	if(!Settings.GetSetting('ShowEventChest')){
		return;
	}

    let Chests = data.responseData['chests'];

    let ChestData = [];
    for (let i in Chests) {
        if (!Chests.hasOwnProperty(i)) continue;

        let CurrentChest = [];
        if (!Chests[i]['cost'] || !Chests[i]['cost']['resources']) continue;
        CurrentChest['cost'] = 0;

        for (let ResourceName in Chests[i]['cost']['resources']) {
            if (!Chests[i]['cost']['resources'].hasOwnProperty(ResourceName)) continue;
            CurrentChest['cost'] += Chests[i]['cost']['resources'][ResourceName];
        }

        if (!Chests[i]['grandPrizeContribution']) continue;
        CurrentChest['grandPrizeContribution'] = Chests[i]['grandPrizeContribution'];

        if (!Chests[i]['chest'] || !Chests[i]['chest']['possible_rewards']) continue;
        let PossibleRewards = Chests[i]['chest']['possible_rewards'];

        for (let j = 0; j < PossibleRewards.length; j++) {
            if (!PossibleRewards[j]['reward'] || !PossibleRewards[j]['reward']['flags']) continue;
            if (PossibleRewards[j]['reward']['flags'].includes('timedSpecial')) {
                CurrentChest['dailyprizename'] = PossibleRewards[j]['reward']['name'];
                if (!CurrentChest['drop_chance']) CurrentChest['drop_chance'] = 0;
                CurrentChest['drop_chance'] += PossibleRewards[j]['drop_chance'];
            }
        }

        CurrentChest['costpermainprizestep'] = CurrentChest['cost'] / CurrentChest['grandPrizeContribution'];
        CurrentChest['costperdailyprize'] = CurrentChest['cost'] * 100 / CurrentChest['drop_chance'];

        ChestData[ChestData.length] = CurrentChest;
    }

    // Ungültige Daten => Event wird nicht unterstützt => Fenster nicht anzeigen
    if (ChestData.length === 0) return;

    EventChests.Chests = ChestData;
    EventChests.Show();
});

/**
 *
 * @type {{Show: EventChests.Show, BuildBox: EventChests.BuildBox, CalcBody: EventChests.CalcBody, Chests: null}}
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

            // add CSS tot the DOM
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
            '<th colspan="3" class="text-center">' + i18n('Boxes.EventChests.MainPrize') + '</th>' +
            '<th colspan="3" class="text-center">' + i18n('Boxes.EventChests.MainPrizeTitle') + EventChests.Chests[0]['dailyprizename'] + '</th>' +
            '</tr>' +

            '<tr>' +
            '<th class="text-center">' + i18n('Boxes.EventChests.Cost') + '</th>' +
            '<th class="text-center">' + i18n('Boxes.EventChests.Steps') + '</th>' +
            '<th class="text-center">' + i18n('Boxes.EventChests.CostPerStep') + '</th>' +
            '<th class="text-center">' + i18n('Boxes.EventChests.Chance') + '</th>' +
            '<th class="text-center">' + i18n('Boxes.EventChests.CostPerPrize') + '</th>' +
            '<th class="text-center">' + i18n('Boxes.EventChests.Cost') + '</th>' +
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
            let isBestDaily = EventChests.Chests[i]['costperdailyprize'] <= BestDailyPrizeCost;
            let isBestMain = EventChests.Chests[i]['costpermainprizestep'] <= BestMainPrizeCost;
            h.push('<tr>');
            h.push('<td class="text-center text-bold ' + ( isBestMain ? ' text-success' : 'text-warning') + '">' + EventChests.Chests[i]['cost'] + '</td>');

            h.push('<td class="text-center">' + EventChests.Chests[i]['grandPrizeContribution'] + '</td>');
            h.push('<td class="text-center border-right' + (isBestMain ? ' text-success text-bold' : '') + '">' + MainParser.round(EventChests.Chests[i]['costpermainprizestep'] * 10) / 10 + '</td>');

            h.push('<td class="text-center border-left">' + EventChests.Chests[i]['drop_chance'] + '%</td>');
            h.push('<td class="text-center' + ( isBestDaily? ' text-success text-bold' : '') + '">' + MainParser.round(EventChests.Chests[i]['costperdailyprize']) + '</td>');
            h.push('<td class="text-center text-bold ' + (isBestDaily ? ' text-success' : 'text-warning') + '">' + EventChests.Chests[i]['cost'] + '</td>');
            h.push('</tr>');
        }

        h.push('</table>');

        $('#eventchestsBody').html(h.join(''));
    },
};