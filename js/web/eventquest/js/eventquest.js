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

let EventQuest = {
    Event: [],
    AllQuests: null,
    CurrentQuestID: 1,

    Show: () => {
        let lng = localStorage.getItem('user-language');
        let url = extUrl + 'js/web/eventquest/questlist/questlist.json';

        MainParser.loadJSON(url, (data) => {
            EventQuest.Event = JSON.parse(data);
            EventQuest.AllQuests = EventQuest.Event['lang'][lng];
            if ($('#questlist').length === 0) {

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
    },


    /**
	 *
	 * @constructor
	 */
    BuildBox: () => {
        EventQuest.CalcBody();

        
            for (let i in MainParser.Quests) {
			let Quest = MainParser.Quests[i];
			 if(Quest.category === 'event' && !Quest.type.contains('counter')){
			 let id = Quest.id.toString();
			 id = id[id.length-2]+id[id.length-1];
			 EventQuest.CurrentQuestID = int(id);
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

        h.push('<div class="event-head">');
        h.push('<div class="text-center"><strong>' + i18n['Boxes']['EventList']['DescCurrent'] + '</strong></div>');
        h.push('</div>');

        h.push('<table class="foe-table">');
        h.push('<thead>' +
            '<tr>' +
            '<th></th>' +
            '<th>' + i18n['Boxes']['EventList']['Desc'] + '</th>' +
            '<th>' + i18n['Boxes']['EventList']['Reward'] + '</th>' +
            '</tr>' +
            '</thead>');

        for (let i = 0; i < EventQuest.AllQuests.length; i++) {
            let selQuest = EventQuest.AllQuests[i];
            if (selQuest['id'] === EventQuest.CurrentQuestID) {
                h.push('<tr>');
                h.push('<td>' + selQuest['id'] + '</td>');
                h.push('<td>' + selQuest['quest'] + '</td>');
                h.push('<td>' + selQuest['reward'] + '</td>');
                h.push('</tr>');
            }
        }
        h.push('</table');

        $('#eventBody').html(h.join(''));
    },
};
