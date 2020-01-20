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

	if(EventQuest.Quests === undefined){
		// @ToDo: Menüpunkt entsorgen

		return;
	}

	if($('#event').length === 0){
		EventQuest.Show();

	} else if($('#event').length > 0) {
		EventQuest.BuildBox();
	}
});

/**
 *
 * @type {{CurrentQuestText: null, QuestId: number, Visible: boolean, Quests: null, Event: [], Show: EventQuest.Show, AllQuests: null, CurrentQuestID: number, BuildBox: EventQuest.BuildBox, CalcBody: EventQuest.CalcBody}}
 */
let EventQuest = {
	Quests: null,
    Event: [],
    AllQuests: null,
	QuestId: 0,
    CurrentQuestID: 1,
    CurrentQuestText: null,
    Visible: false,


	/**
	 * Vorbereitung der DAten
	 */
    Show: () => {
        if(EventQuest.Visible === false) return;
        let lng = MainParser.Language;
        let url = 'https://cache.foe-rechner.de/quests/quests.json';

        // es gibt nur 2 Sprachen
        if(lng !== 'de' && lng !== 'en'){
        	lng = 'en';
		}

        if(null !== EventQuest.AllQuests) {

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
	 * @constructor
	 */
    BuildBox: () => {
        for (let i in EventQuest.Quests) {

            let Quest = EventQuest.Quests[i];

            if (Quest.type.indexOf('counter') == -1) {
                let id = Quest.id.toString();

                id = id[id.length - 2] + id[id.length - 1];
                EventQuest.CurrentQuestID = (parseInt(id)) + 1;

                let text = "",
					condition = Quest.successConditions,
					conditiongroup = Quest.successConditionGroups,
					conditionText = "";

                for (let g = 0; g < conditiongroup.length; g++) {
                    for (let gi = 0; gi < conditiongroup[g].conditionIds.length; gi++) {
                        if (conditiongroup[g].type === 'or')
                        	conditionText = i18n['Boxes']['EventList']['Or'];

                        else if
							(conditiongroup[g].type === 'none') conditionText = i18n['Boxes']['EventList']['And'];

                        else
                        	conditionText = "";

                        for (let ci = 0; ci < condition.length; ci++) {
                            if (condition[ci].id === conditiongroup[g].conditionIds[gi]) {
                                text +=  conditionText + condition[ci].description;
                                break;
                            }
                        }
                    }
                }
                
                let re = RegExp("("+i18n['Boxes']['EventList']['And']+"|"+i18n['Boxes']['EventList']['Or']+")(.+)", 'g');
                EventQuest.CurrentQuestText = text.replace(re, '$2');
                break;
            }
        }

        EventQuest.CalcBody();
    },


    /**
	 *
	 * @constructor
	 */
    CalcBody: () => {
        if (EventQuest.AllQuests === null)
            return;
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

        for (let i = 0; i < EventQuest.AllQuests.length; i++) {

            let selQuest = EventQuest.AllQuests[i];

            if (selQuest['id'] === EventQuest.CurrentQuestID) {

                h.push('<tr class="active-quest">');
                h.push('<td class="nr">' + selQuest['id'] + '.</td>');
                h.push('<td>' + EventQuest.CurrentQuestText + '</td>');
                h.push('<td class="text-center">' + selQuest['reward'] + '</td>');
                h.push('</tr>');

                h.push('<tr>');
                h.push('<td colspan="3" class="upcoming text-center">'+i18n['Boxes']['EventList']['Upcoming']+'</td>');
                h.push('</tr>');

                for (let add = 1; add <= 5; add++) {
                    h.push('<tr>');
                    h.push('<td class="nr">' + EventQuest.AllQuests[i + add]['id'] + '.</td>');
                    h.push('<td>' + EventQuest.AllQuests[i + add]['quest'] + '</td>');
                    h.push('<td class="text-center">' + EventQuest.AllQuests[i + add]['reward'] + '</td>');
                    h.push('</tr>');
                }
            }
        }
        h.push('</table');

        $('#eventBody').html(h.join(''));
    },
};
