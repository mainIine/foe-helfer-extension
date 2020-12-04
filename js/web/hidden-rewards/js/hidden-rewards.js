FoEproxy.addHandler('HiddenRewardService', 'getOverview', (data, postData) => {
    HiddenRewards.Cache = HiddenRewards.prepareData(data.responseData.hiddenRewards);
    
    HiddenRewards.RefreshGui();
    if (HiddenRewards.FirstCycle) { //Alle 60 Sekunden aktualisieren (Startbeginn des Ereignisses könnte erreicht worden sein)
        HiddenRewards.FirstCycle = false;

        setInterval(HiddenRewards.RefreshGui, 60000);
    }
});

/**
 *
 * @type {{init: HiddenRewards.init, prepareData: HiddenRewards.prepareData, BuildBox: HiddenRewards.BuildBox, RefreshGui: HiddenRewards.RefreshGui, Cache: null, FilteredCache : null, FirstCycle : true}}
 */
let HiddenRewards = {

    Cache: null,
    FilteredCache : null,
    FirstCycle: true,
    
	/**
	 * Box in den DOM
	 */
    init: () => {
        if ($('#HiddenRewardBox').length < 1) {

            HTML.AddCssFile('hidden-rewards');

            HTML.Box({
                'id': 'HiddenRewardBox',
                'title': i18n('Boxes.HiddenRewards.Title'),
                'ask': i18n('Boxes.HiddenRewards.HelpLink'),
                'auto_close': true,
                'dragdrop': true,
                'minimize': true
            });

            moment.locale(i18n('Local'));

            HiddenRewards.RefreshGui();

        } else {
            HTML.CloseOpenBox('HiddenRewardBox');
        }
    },


	/**
	 * Daten aufbereiten
	 */
    prepareData: (Rewards) => {
        let data = [];

        for (let idx in Rewards) {
            if (!Rewards.hasOwnProperty(idx)) continue;

            let position = Rewards[idx].position.context;

            let SkipEvent = true;

            // prüfen ob der Spieler in seiner Stadt eine zweispurige Straße hat
            if (position === 'cityRoadBig') {
                if (CurrentEraID >= Technologies.Eras.ProgressiveEra)
                    SkipEvent = false;
            }
            else {
                SkipEvent = false;
            }

            if (SkipEvent) {
                continue;
            }

            const positionI18nLookupKey = 'HiddenRewards.Positions.' + position;
            const positionI18nLookup = i18n('HiddenRewards.Positions.' + position);

            if (positionI18nLookupKey !== positionI18nLookup) {
                position = positionI18nLookup;
            }

            data.push({
                type: Rewards[idx].type,
                position: position,
                starts: Rewards[idx].startTime,
                expires: Rewards[idx].expireTime,
            });
        }

        data.sort(function (a, b) {
            if (a.expires < b.expires) return -1;
            if (a.expires > b.expires) return 1;
            return 0;
        });

        return data;        
    },

    /**
     * Filtert den Cache erneut basierend auf aktueller Zeit + aktualisiert Counter/Liste falls nötig
     * 
     */
    RefreshGui: () => {       
        HiddenRewards.FilteredCache = [];
        for (let i = 0; i < HiddenRewards.Cache.length; i++) {
            let StartTime = moment.unix(HiddenRewards.Cache[i].starts),
                EndTime = moment.unix(HiddenRewards.Cache[i].expires);

            if (StartTime < MainParser.getCurrentDateTime() && EndTime > MainParser.getCurrentDateTime()) {
                HiddenRewards.FilteredCache.push(HiddenRewards.Cache[i]);
            }
        }

        HiddenRewards.SetCounter();

        if ($('#HiddenRewardBox').length >= 1) {
            HiddenRewards.BuildBox();
        }  
    },


	/**
	 * Inhalt der Box in den BoxBody legen
	 */
    BuildBox: () => {
        let h = [];

        h.push('<table class="foe-table">');

        h.push('<thead>');
        h.push('<tr>');
        h.push('<th>' + i18n('HiddenRewards.Table.type') + '</th>');
        h.push('<th>' + i18n('HiddenRewards.Table.position') + '</th>');
        h.push('<th>' + i18n('HiddenRewards.Table.expires') + '</th>');
        h.push('</tr>');
        h.push('</thead>');

        h.push('<tbody>');

        if (HiddenRewards.FilteredCache.length > 0) {
            for (let idx in HiddenRewards.FilteredCache) {

                if (!HiddenRewards.FilteredCache.hasOwnProperty(idx)) {
                    break;
                }

                let hiddenReward = HiddenRewards.FilteredCache[idx];

                h.push('<tr>');
                h.push('<td class="incident" title="' + hiddenReward.type + '"><img src="' + extUrl + 'js/web/hidden-rewards/images/' + hiddenReward.type + '.png" alt=""></td>');
                h.push('<td>' + hiddenReward.position + '</td>');
                h.push('<td class="">' + i18n('Boxes.HiddenRewards.Disappears') + ' ' + moment.unix(hiddenReward.expires).fromNow() + '</td>');
                h.push('</tr>');
            }
        }
        else {
            h.push('<td colspan="3">' + i18n('Boxes.HiddenRewards.NoEvents') + '</td>');
        }

        h.push('</tbody>');

        h.push('</table>');

        $('#HiddenRewardBoxBody').html(h.join(''));
    },


	SetCounter: ()=> {
        if (HiddenRewards.FilteredCache && HiddenRewards.FilteredCache.length > 0){
			$('#hidden-reward-count').text(HiddenRewards.FilteredCache.length).show();
		} else {
			$('#hidden-reward-count').hide();
		}
	}
};
