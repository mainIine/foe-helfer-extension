/*
 * **************************************************************************************
 *
 * Dateiname:                 eventquest.js
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

FoEproxy.addHandler('QuestService', 'getUpdates', (data, postData) => {

    // Nur Events und "active" heraus filtern
    EventQuest.Quests = data['responseData'].filter(q => (q['category'] === 'events' && q['state'] === 'accepted'));

    if (EventCountdown === false){
        window.addEventListener('foe-helper#menu_loaded', HideEventQuest, { capture: false, once: false, passive: true });
        try{
            HideEventQuest();
            return;
        }catch(e){}
    }

    _menu.ShowButton("questlist-Btn");

    if ($('#event').length > 0) {
        EventQuest.BuildBox();
    }
});

FoEproxy.addHandler('ChestEventService', 'getOverview', (data, postData) => {
    let Chests = data.responseData['chests'];

    let ChestData = [];
    for (let i in Chests) {
        if (!Chests.hasOwnProperty(i)) continue;

        let CurrentChest = [];
        if (Chests[i]['cost'] !== undefined && Chests[i]['cost']['resources'] !== undefined) {
            for (let ResourceName in Chests[i]['cost']['resources']) {
                if (!Chests[i]['cost']['resources'].hasOwnProperty(ResourceName)) continue;

                CurrentChest['cost'] = Chests[i]['cost']['resources'][ResourceName];
                break;
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

    ChestData.sort(function (a, b) {
        return a['cost'] - b['cost'];
    });

    // Ungültige Daten => Event wird nicht unterstützt => Fenster nicht anzeigen
    if (ChestData.length === 0) {
        return;
    }

    EventQuest.Chests = ChestData;
    EventQuest.ShowChests();
});

const HideEventQuest = () => {
    if (EventQuest.Quests === undefined || EventQuest.Quests.length <= 0) {
        _menu.HideButton("questlist-Btn");
        return;
    }
};

/**
 *
 * @type {{
 * CurrentQuestText: null|string,
 * QuestId: number,
 * Visible: boolean,
 * Quests: null|any,
 * Event: [],
 * Show: ()=>void,
 * AllQuests: null,
 * CurrentQuestID: null|number,
 * BuildBox: ()=>void,
 * CalcBody: ()=>void
 * }}
 */
let EventQuest = {
    Quests: null,
    Event: [],
    AllQuests: null,
    QuestId: 0,
    CurrentQuestID: null,
    CurrentQuestText: null,
    Chests: null,

	/**
	 * Vorbereitung der Daten
	 */
    Show: () => {
        let lng = MainParser.Language;
        let url = 'https://cache.foe-rechner.de/quests/quests.json';

        // es gibt nur 2 Sprachen
        if (lng !== 'de' && lng !== 'en') {
            lng = 'en';
        }

        if (null !== EventQuest.AllQuests) {

            if ($('#event').length === 0) {

                HTML.Box({
                    'id': 'event',
                    'title': i18n('Boxes.EventList.Title') + EventQuest.Event['eventname'],
                    'auto_close': true,
                    'dragdrop': true,
                    'minimize': true
                });

                // CSS in den DOM prügeln
                HTML.AddCssFile('eventquest');
                EventQuest.BuildBox();

            } else {
                HTML.CloseOpenBox('event');
            }

        } else {
            MainParser.loadJSON(url, (data) => {
                EventQuest.Event = JSON.parse(data);
                EventQuest.AllQuests = EventQuest.Event['lang'][lng];

                if ($('#event').length === 0) {

                    HTML.Box({
                        'id': 'event',
                        'title': i18n('Boxes.EventList.Title') + EventQuest.Event['eventname'],
                        'auto_close': true,
                        'dragdrop': true,
                        'minimize': true
                    });

                    // CSS in den DOM prügeln
                    HTML.AddCssFile('eventquest');

                    EventQuest.BuildBox();

                } else {
                    HTML.CloseOpenBox('event');
                }

            });
        }
    },


    /**
	 *
	 */
    BuildBox: () => {
        if (localStorage.getItem('lastActivQuest') !== null)
            localStorage.removeItem('lastActivQuest');
        const Quests = EventQuest.Quests;
        if (Quests) {
            for (let Quest of Quests) {
                const isCounter = Quest.type.indexOf('counter') !== -1;
                const isWaiting = Quest.type.indexOf('waiting') !== -1;

                if (isCounter) {
                    // Sammel die Quest-Nummer aus der "Zähler" Quest
                    const progressCond = Quest.successConditions.find(cond => cond.flags.includes('static_counter'));
                    if (progressCond) {
                        if (progressCond.currentProgress !== undefined) {
                            const id = progressCond.currentProgress + 1;
                            EventQuest.CurrentQuestID = id;
                        } else {
                            EventQuest.CurrentQuestID = 1;
                        }
                    }

                } else if (!isWaiting) {
                    let texts = [],
                        condition = Quest.successConditions,
                        conditiongroup = Quest.successConditionGroups,
                        conditionText = "";

                    for (let group of conditiongroup) {

                        if (group.type === 'or') {
                            conditionText = i18n('Boxes.EventList.Or');
                        } else if (group.type === 'none') {
                            conditionText = i18n('Boxes.EventList.And');
                        } else {
                            conditionText = "";
                        }

                        texts.push(
                            '- ' + group.conditionIds
                                .map(id => condition.find(cond => cond.id === id).description)
                                .join(conditionText)
                        );
                    }

                    EventQuest.CurrentQuestText = texts.join('<br>');
                } else {
                    EventQuest.CurrentQuestText = null;
                }
            }
        }

        EventQuest.CalcBody();
    },


    /**
	 *
	 */
    CalcBody: () => {
        if (EventQuest.AllQuests === null) return;

        const AllQuests = EventQuest.AllQuests;

        let div = $('#questlist'),
            h = [];

        h.push('<table class="foe-table">');
        h.push('<thead>' +
            '<tr>' +
            '<th>' + i18n('Boxes.EventList.Number') + '</th>' +
            '<th>' + i18n('Boxes.EventList.Desc') + '</th>' +
            '<th>' + i18n('Boxes.EventList.Reward') + '</th>' +
            '</tr>' +
            '</thead>');

        if (EventQuest.CurrentQuestID === null) {
            EventQuest.CurrentQuestID = 1;
        }
        const CurrentQuestID = EventQuest.CurrentQuestID;

        for (let i = 0; i < AllQuests.length; i++) {
            let selQuest = AllQuests[i];

            if (selQuest.id !== CurrentQuestID) continue;


            if (EventQuest.CurrentQuestText !== null) {
                h.push('<tr class="active-quest">');
                h.push('<td class="nr">' + selQuest['id'] + '.</td>');
                h.push('<td>' + EventQuest.CurrentQuestText + '</td>');
                h.push('<td class="text-center">' + selQuest['reward'] + '</td>');
                h.push('</tr>');
            } else {
                h.push('<tr class="active-quest">');
                h.push('<td colspan="3" class="upcoming text-center">' + i18n('Boxes.EventList.Waiting') + " (" + EventCountdown + ")" + '</td>');
                h.push('</tr>');
            }
            h.push('<tr>');
            h.push('<td colspan="3" class="upcoming text-center">' + i18n('Boxes.EventList.Upcoming') + '</td>');
            h.push('</tr>');

            for (let add = (EventQuest.CurrentQuestText === null ? 0 : 1); add <= 5; add++) {
                if (i + add >= AllQuests.length) break;

                h.push('<tr>');
                h.push('<td class="nr">' + AllQuests[i + add]['id'] + '.</td>');
                h.push('<td>' + AllQuests[i + add]['quest'] + '</td>');
                h.push('<td class="text-center">' + AllQuests[i + add]['reward'] + '</td>');
                h.push('</tr>');
            }

            break;
        }
        h.push('</table>');

        $('#eventBody').html(h.join(''));
    },


    /**
     *
     */
    ShowChests: () => {
        if ($('#eventchests').length === 0) {
            HTML.Box({
                'id': 'eventchests',
                'title': i18n('Boxes.EventChests.Title'),
                'auto_close': true,
                'dragdrop': true,
                'minimize': true
            });

            // CSS in den DOM prügeln
            HTML.AddCssFile('eventquest');
        }

        EventQuest.BuildChestsBox();
    },

    /**
    *
    */
    BuildChestsBox: () => {
        EventQuest.CalcChestsBody();
    },


    /**
    *
    */
    CalcChestsBody: () => {
        let h = [];

        h.push('<table class="foe-table">');
        h.push('<thead>' +
            '<tr>' +
				'<th></th>' +
				'<th colspan="2" class="text-center">' + i18n('Boxes.EventChests.MainPrize') + '</th>' +
				'<th colspan="2" class="text-center">' + i18n('Boxes.EventChests.MainPrizeTitle') + EventQuest.Chests[0]['dailyprizename'] + '</th>' +
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

        for (let i in EventQuest.Chests) {
            if (!EventQuest.Chests.hasOwnProperty(i)) continue;

            BestMainPrizeCost = Math.min(BestMainPrizeCost, EventQuest.Chests[i]['costpermainprizestep']);
            BestDailyPrizeCost = Math.min(BestDailyPrizeCost, EventQuest.Chests[i]['costperdailyprize']);
        }

        for (let i in EventQuest.Chests) {
            if (!EventQuest.Chests.hasOwnProperty(i)) continue;

            h.push('<tr>');
            h.push('<td class="text-center text-warning text-bold">' + EventQuest.Chests[i]['cost'] + '</td>');

            h.push('<td class="text-center">' + EventQuest.Chests[i]['grandPrizeContribution'] + '</td>');
            h.push('<td class="text-center border-right' + (EventQuest.Chests[i]['costpermainprizestep'] <= BestMainPrizeCost ? ' text-success text-bold' : '') + '">' + Math.round(EventQuest.Chests[i]['costpermainprizestep'] * 10) / 10 + '</td>');

            h.push('<td class="text-center border-left">' + EventQuest.Chests[i]['drop_chance'] + '%</td>');
            h.push('<td class="text-center' + (EventQuest.Chests[i]['costperdailyprize'] <= BestDailyPrizeCost ? ' text-success text-bold' : '') + '">' + Math.round(EventQuest.Chests[i]['costperdailyprize']) + '</td>');

            h.push('</tr>');
        }

        h.push('</table>');

        $('#eventchestsBody').html(h.join(''));
    },
};
