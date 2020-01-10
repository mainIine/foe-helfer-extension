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
    AllQuests: null,
    CurrentQuestID: null,

    Show: () => {
        if ($('#questlist').length === 0) {

            HTML.Box({
                'id': 'eventquest',
                'title': i18n['Boxes']['EventList']['Title'],
                'auto_close': true,
                'dragdrop': true,
                'minimize': false
            });

            // CSS in den DOM prügeln
            HTML.AddCssFile('eventquest');
        }

        EventQuest.BuildBox();
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

        // Filter
        h.push('<div class="event-head">');
        h.push('<button class="btn btn-default btn-switchage" data-value="' + PreviousQuestID + '">' + i18n['Boxes']['EventList']['Previous'] + '</button>');
        h.push('<div class="text-center"><strong>' + i18n['Boxes']['EventList']['Title'] + '</strong></div>');
        h.push('<button class="btn btn-default btn-switchage" data-value="' + NextQuestID + '">' + i18n['Boxes']['EventList']['Next'] + '</button>');
        h.push('</div>');

        h.push('<table class="foe-table">');

        h.push('<thead>' +
            '<tr>' +
            '<th>' + i18n['Boxes']['Technologies']['Resource'] + '</th>' +
            '<th>' + i18n['Boxes']['Technologies']['DescRequired'] + '</th>' +
            '<th>' + i18n['Boxes']['Technologies']['DescInStock'] + '</th>' +
            '<th class="text-right">' + i18n['Boxes']['Technologies']['DescStillMissing'] + '</th>' +
            '</tr>' +
            '</thead>');

        for (let i = 0; i < OutputList.length; i++) {
            let ResourceName = OutputList[i];
            if (RequiredResources[ResourceName] !== undefined) {
                let Required = RequiredResources[ResourceName];
                let Stock = (ResourceName === 'strategy_points' ? StrategyPoints.AvailableFP : ResourceStock[ResourceName]);
                if (Stock === undefined) Stock = 0;
                let Diff = Stock - Required;

                h.push('<tr>');
                h.push('<td>' + GoodsData[ResourceName]['name'] + '</td>');
                h.push('<td>' + HTML.Format(Required) + '</td>');
                h.push('<td>' + HTML.Format(Stock) + '</td>');
                h.push('<td class="text-right text-' + (Diff < 0 ? 'danger' : 'success') + '">' + HTML.Format(Diff) + '</td>');
                h.push('</tr>');
            }
        }
        h.push('</table');

        $('#eventquestBody').html(h.join(''));
    },
};
