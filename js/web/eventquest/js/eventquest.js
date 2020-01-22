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

    if (EventQuest.Quests === undefined) {
        // @ToDo: Menüpunkt entsorgen

        return;
    }

    if ($('#event').length === 0) {
        EventQuest.Show();

    } else if ($('#event').length > 0) {
        EventQuest.BuildBox();
    }
});

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
    Visible: false,


	/**
	 * Vorbereitung der DAten
	 */
    Show: () => {
        if (EventQuest.Visible === false) return;
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
                    'title': i18n['Boxes']['EventList']['Title'] + EventQuest.Event['eventname'],
                    'auto_close': false,
                    'dragdrop': true,
                    'minimize': true
                });

                // CSS in den DOM prügeln
                HTML.AddCssFile('eventquest');
            }

            EventQuest.BuildBox();

        } else {
            MainParser.loadJSON(url, (data) => {
                EventQuest.Event = JSON.parse(data);
                EventQuest.AllQuests = EventQuest.Event['lang'][lng];

                if ($('#event').length === 0) {

                    HTML.Box({
                        'id': 'event',
                        'title': i18n['Boxes']['EventList']['Title'] + EventQuest.Event['eventname'],
                        'auto_close': false,
                        'dragdrop': true,
                        'minimize': true
                    });

                    // CSS in den DOM prügeln
                    HTML.AddCssFile('eventquest');
                }
                EventQuest.BuildBox();
            });
        }
    },


    /**
	 *
	 */
    BuildBox: () => {
        const Quests = EventQuest.Quests;
        if (Quests) {
            for (let Quest of Quests) {
                const isCounter = Quest.type.indexOf('counter') !== -1;
                const isWaiting = Quest.type.indexOf('waiting') !== -1;
                
                if (isCounter) {
                    // Sammel die Quest-Nummer aus der "Zähler" Quest
                    const progressCond = Quest.successConditions.find(cond => cond.flags.includes('static_counter'));
                    if (progressCond) {
                        const id = progressCond.currentProgress + 1; 
                        EventQuest.CurrentQuestID = id;
                        localStorage.setItem("lastActivQuest", ''+id);
                    }

                } else if (!isWaiting) {
                    let texts = [],
                        condition = Quest.successConditions,
                        conditiongroup = Quest.successConditionGroups,
                        conditionText = "";

                    for (let group of conditiongroup) {
                        
                        if (group.type === 'or') {
                            conditionText = i18n['Boxes']['EventList']['Or'];
                        } else if (group.type === 'none') {
                            conditionText = i18n['Boxes']['EventList']['And'];
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
            '<th>' + i18n['Boxes']['EventList']['Number'] + '</th>' +
            '<th>' + i18n['Boxes']['EventList']['Desc'] + '</th>' +
            '<th>' + i18n['Boxes']['EventList']['Reward'] + '</th>' +
            '</tr>' +
            '</thead>');

        if (EventQuest.CurrentQuestID === null) {
            EventQuest.CurrentQuestID = parseInt(localStorage.getItem("lastActivQuest"));
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
                h.push('<td colspan="3" class="upcoming text-center">' + i18n['Boxes']['EventList']['Waiting'] + '</td>');
                h.push('</tr>');
            }
            h.push('<tr>');
            h.push('<td colspan="3" class="upcoming text-center">' + i18n['Boxes']['EventList']['Upcoming'] + '</td>');
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
};
