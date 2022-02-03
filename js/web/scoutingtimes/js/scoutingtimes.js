
/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
    // Closes the box when the player navigates back to the city
    HTML.CloseOpenBox('mapScoutingTimesDialog');
});

FoEproxy.addMetaHandler('castle_system_levels', (data, postData) => {

    let resp = JSON.parse(data['response']);
    let castlebonus = 1;
        
    for (let x in resp)
	{
		let l = resp[x];

		if(!l['level'])
		{
			continue;
		}

        for (let b in l.permanentRewards.BronzeAge) {
            let boost = l.permanentRewards.BronzeAge[b];
            if(boost.subType != 'army_scout_time') continue;
            castlebonus = 1 - boost.amount/100
        }
    
		scoutingTimes.castleBonuses[l['level']] = castlebonus;
    }
});

FoEproxy.addHandler('CampaignService', 'start', (data, postData) => {
       
    // Is the box enabled in the settings?
    if (!Settings.GetSetting('ShowScoutingTimes')) {
        return;
    }
    
    //do not show box, when scout is currently scouting
    //if (!(data.responseData.scout.path[0] == 0)) {
    //    return;
    //}

    // Don't create a new box while another one is still open
    if ($('#mapScoutingTimesDialog').length > 0) {
        return;
    }
    
    return scoutingTimes.ShowDialog(data.responseData);
});

let scoutingTimes = {

    /**
     * Shows a box displaying the base scouting times
     *
     * @constructor
     */
    ShowDialog: (data) => {
        HTML.AddCssFile('scoutingtimes');
        
        HTML.Box({
            'id': 'mapScoutingTimesDialog',
            'title': i18n('Boxes.scoutingTimes.Title'),
            'auto_close': true,
            'dragdrop': true,
            'minimize': false
        });

        let htmltext = `<table class="foe-table"><tr><th>${i18n('Boxes.scoutingTimes.ProvinceName')}</th><th>${i18n('Boxes.scoutingTimes.ScoutingCost')}</th><th>${i18n('Boxes.scoutingTimes.ScoutingTime')}</th></tr>`;
        let i = 0;
        let Provinces = {};
        let toscout = [];
        
        for (let p in data.provinces) {
            let province = data.provinces[p];
            Provinces[province.id] = province;
        }
        
        for (let p in Provinces) {
            let province = Provinces[p];
            if (!(province.isPlayerOwned|false)) continue;
            for (c in province.children) {
                let child = Provinces[province.children[c].targetId];
                if (child.isPlayerOwned|false) continue;
                if (child.isScouted|false) continue;
                if (toscout.indexOf(child.id) > -1) continue;
                Provinces[child.id].travelTime = province.children[c].travelTime;
                if (data.scout.path.indexOf(child.id)>=0) {
                    Provinces[child.id].travelTime = data.scout.time_to_target;
                    scoutingTimes.target = child.id;
                }
                let mayScout = true;
                for (b in child.blockers) {
                    let blockId = child.blockers[b];
                    if (!(Provinces[blockId].isPlayerOwned|false)) mayScout = false;
                }
                if (!mayScout) continue;
                toscout.push(child.id);
            }    
        }
        
        let castlebonus = 1;
        if (Castle.curLevel>0) scoutingTimes.castleBonuses[Castle.curLevel];
        while (toscout.length > 0) {
            i += 1;
            let p = toscout.pop();
            let province = Provinces[p];
            
            if ((province.travelTime|0)>0) {
                htmltext += `<tr><td>${province.name}</td><td>`;
                htmltext += (p === scoutingTimes.target) ? `...<img  src="${MainParser.InnoCDN}/assets/city/gui/citymap_icons/tavern_shop_boost_scout_small_icon.png" alt="">...` : `<img  src="${MainParser.InnoCDN}/assets/shared/icons/money.png" alt=""> ${scoutingTimes.numberWithCommas(province.scoutingCost)}</td>`;
                htmltext += `<td><img  src="${MainParser.InnoCDN}/assets/shared/icons/icon_time.png" alt="">`;
                htmltext += ` ${scoutingTimes.format(province.travelTime*castlebonus)}`;
                htmltext += `</td></tr>`;
            }
        }
       
        htmltext += `</table><div style="color:var(--text-bright); text-align:center;">${i18n('Boxes.scoutingTimes.Warning')}</div>`
        
        if (i > 0) {
            $('#mapScoutingTimesDialogBody').html(htmltext);
        } else {
            HTML.CloseOpenBox('mapScoutingTimesDialog');            
        }
    },

    format: (time) => {

        let min = Math.floor(time/60);
        let hours = Math.floor(min/60);
        let days = Math.floor(hours/24);
        min = min % 60;
        hours = hours % 24;

        timestring = (days>0) ? `${days}d ` : ``;
        timestring += (hours>0) ? `${hours}h ` : ``;
        timestring += (min>0) ? `${min}m ` : ``;

        return timestring
    },

    numberWithCommas: (x) => {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },

    castleBonuses:{},
    target:0,

};
