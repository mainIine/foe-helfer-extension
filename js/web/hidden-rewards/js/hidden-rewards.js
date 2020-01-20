FoEproxy.addHandler('HiddenRewardService', 'getOverview', (data, postData) => {
    HiddenRewards.Cache = data.responseData.hiddenRewards;
    HiddenRewards.prepareData();

    if ($('#HiddenRewardBox').length >= 1) {
        HiddenRewards.BuildBox();
    }
});

/**
 *
 * @type {{init: HiddenRewards.init, prepareData: HiddenRewards.prepareData, BuildBox: HiddenRewards.BuildBox, Cache: null}}
 */
let HiddenRewards = {

    Cache: null,

	/**
	 * Box in den DOM
	 */
    init: () => {
        if( $('#HiddenRewardBox').length < 1 ) {

			HTML.AddCssFile('hidden-rewards');

			HTML.Box({
				'id': 'HiddenRewardBox',
				'title': i18n.Boxes.HiddenRewards.Title,
				'auto_close': false,
				'dragdrop': true,
				'minimize': true
			});

			moment.locale(i18n['Local']);
		}
        HiddenRewards.BuildBox();
    },

	/**
	 * Daten aufbereiten
	 */
    prepareData: () => {
        let data = [];

        for(let idx in HiddenRewards.Cache) {
            let position = HiddenRewards.Cache[idx].position.context;

            if(i18n['HiddenRewards']['Positions'][HiddenRewards.Cache[idx].position.context]) {
                position = i18n['HiddenRewards']['Positions'][HiddenRewards.Cache[idx].position.context];
            }

            data.push({
                type: HiddenRewards.Cache[idx].type,
                position: position,
                starts: HiddenRewards.Cache[idx].startTime,
                expires: HiddenRewards.Cache[idx].expireTime,
            });
        }

        data.sort(function (a, b) {
            if(a.expires < b.expires) return -1;
            if(a.expires > b.expires) return 1;
            return 0;
        });

        HiddenRewards.Cache = data;
    },


	/**
	 * Inhalt der Box in den BoxBody legen
	 */
    BuildBox:()=> {
        let h = [];

        h.push('<table class="foe-table">');

        h.push('<thead>');
            h.push('<tr>');
                h.push('<th>' + i18n.HiddenRewards.Table.type + '</th>');
                h.push('<th>' + i18n.HiddenRewards.Table.position + '</th>');
                h.push('<th>' + i18n.HiddenRewards.Table.expires + '</th>');
            h.push('</tr>');
        h.push('</thead>');

        h.push('<tbody>');

        let cnt = 0;
        for (let idx in HiddenRewards.Cache) {

        	if(!HiddenRewards.Cache.hasOwnProperty(idx)){
        		break;
			}

            let hiddenReward = HiddenRewards.Cache[idx];

            let StartTime = moment.unix(hiddenReward.starts),
                EndTime = moment.unix(hiddenReward.expires);

            if (EndTime > new Date().getTime()) {
                h.push('<tr>');
                h.push('<td class="incident ' + hiddenReward.type + '" title="' + hiddenReward.type + '">&nbsp;</td>');
                h.push('<td>' + hiddenReward.position + '</td>');
                if (StartTime > new Date().getTime()) {
                    h.push('<td class="warning">' + 'Erscheint ' + moment.unix(hiddenReward.starts).fromNow() + '</td>'); //Todo: Translate
                }
                else {
                    h.push('<td class="">' + 'Verschwindet ' + moment.unix(hiddenReward.expires).fromNow() + '</td>'); //Todo: Translate
                }
                h.push('</tr>');
                cnt++;
            }
        }
        if (cnt === 0) {
            h.push('<td colspan="3">' + 'Keine Ereignisse vorhanden' + '</td>'); //Todo: Translate
        }

        h.push('</tbody>');

        h.push('</table>');

        $('#HiddenRewardBoxBody').html(h.join(''));
    }
};
