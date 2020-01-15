FoEproxy.addHandler('HiddenRewardService', 'getOverview', (data, postData) => {
    HiddenRewards.Cache = data.responseData.hiddenRewards;
    HiddenRewards.prepareData();
});

let HiddenRewards = {
    Cache: null,

    init: () => {
        if( $('#HiddenRewardBox').length < 1 ){

            HTML.Box({
                'id': 'HiddenRewardBox',
                'title': i18n.Boxes.HiddenRewards.Title,
                'auto_close': false,
                'dragdrop': true,
                'minimize': true
            });


            moment.locale(i18n['Local']);

            // CSS in den DOM prügeln
            HTML.AddCssFile('hidden-rewards');
        }

        HiddenRewards.BuildBox();
    },

    prepareData: () => {
        var data = [];

        for(let idx in HiddenRewards.Cache) {
            let position = HiddenRewards.Cache[idx].position.context;

            if(i18n['HiddenRewards']['Positions'][HiddenRewards.Cache[idx].position.context]) {
                position = i18n['HiddenRewards']['Positions'][HiddenRewards.Cache[idx].position.context];
            }

            data.push({
                type: HiddenRewards.Cache[idx].type,
                position: position,
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

    BuildBox:()=> {
        var t = [];

        t.push('<table class="foe-table">');

        t.push('<thead>');
            t.push('<tr>');
                t.push('<th>' + i18n.HiddenRewards.Table.type + '</th>');
                t.push('<th>' + i18n.HiddenRewards.Table.position + '</th>');
                t.push('<th>' + i18n.HiddenRewards.Table.expires + '</th>');
            t.push('</tr>');
        t.push('</thead>');

        t.push('<tbody>');
        for(let idx in HiddenRewards.Cache) {
            var hiddenReward = HiddenRewards.Cache[idx];

            t.push('<tr>');
                t.push('<td class="incident ' + hiddenReward.type + '" title="' + hiddenReward.type + '">&nbsp;</td>');
                t.push('<td>' + hiddenReward.position + '</td>');
                t.push('<td>' + moment.unix(hiddenReward.expires).format(i18n['DateTime']) + '</td>');
            t.push('</tr>');
        }
        t.push('</tbody>');

        t.push('</table>');

        jQuery('#HiddenRewardBoxBody').html(t.join(''));
    }
}