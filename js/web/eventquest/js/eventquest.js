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
    PreviousQuestID: null,
    NextQuestID: 2,

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

        $('body').on('click', '.btn-switchage', function () {

            $('.btn-switchage').removeClass('btn-default-active');

            EventQuest.CurrentQuestID = $(this).data('value');
            if(EventQuest.CurrentQuestID === 1){
                EventQuest.PreviousQuestID = null;
            }
            if(EventQuest.CurrentQuestID === EventQuest.AllQuests.length){
                EventQuest.NextQuestID = null;
            }
            EventQuest.CalcBody();

            $(this).addClass('btn-default-active');
        });
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
        if (EventQuest.CurrentQuestID > 1)
            h.push('<button class="btn btn-default btn-switchage" data-value="' + EventQuest.PreviousQuestID + '">' + i18n['Boxes']['EventList']['Previous'] + '</button>');
        h.push('<div class="text-center"><strong>' + i18n['Boxes']['EventList']['DescCurrent'] + '</strong></div>');
        if (EventQuest.CurrentQuestID < EventQuest.AllQuests.length)
            h.push('<button class="btn btn-default btn-switchage" data-value="' + EventQuest.NextQuestID + '">' + i18n['Boxes']['EventList']['Next'] + '</button>');
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
