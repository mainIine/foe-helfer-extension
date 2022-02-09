
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
        
    for (let l of resp)
	{
        if(!l['level'])
		{
			continue;
		}

        for (let boost of l.permanentRewards.BronzeAge) {
            if(boost.subType !== 'army_scout_time')
                continue;

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

    Provinces: {},

    /**
     * Shows a box displaying the base scouting times
     *
     * @constructor
     */
    ShowDialog: (data) => {

        //let Provinces = {};
        let toscout = [];
        
        for (let province of data.provinces) {
            scoutingTimes.Provinces[province.id] = province;
        }
        
        let castlebonus = 1;
        if ((Castle.curLevel|0)>0) castlebonus = scoutingTimes.castleBonuses[Castle.curLevel];

        for (const p in scoutingTimes.Provinces) {
            if (Object.hasOwnProperty.call(scoutingTimes.Provinces, p)) {
                const province = scoutingTimes.Provinces[p];
                
                if (!(province.isPlayerOwned|false)) {
                    continue;
                }

                for (let element of province.children)
                {
                    let child = scoutingTimes.Provinces[element.targetId];
                    if (child.isPlayerOwned|false) {
                        continue;
                    };
                    if (toscout.indexOf(child.id) > -1) {
                        continue;
                    };

                    scoutingTimes.Provinces[child.id].travelTime = (element.travelTime + (scoutingTimes.distance(data.scout.current_province,child.id) -1 ) * 600) * castlebonus;

                    if (data.scout.path[data.scout.path.length-1] === child.id) {
                        scoutingTimes.Provinces[child.id].travelTime = data.scout.time_to_target;
                        scoutingTimes.target = child.id;
                    }
                    
                    if (child.isScouted|false) Provinces[child.id].travelTime = 0;
                    let mayScout = true;

                    for (let blockId of child.blockers) {
                        if (!(scoutingTimes.Provinces[blockId]?.isPlayerOwned|false)) {
                            mayScout = false;
                        }
                    }

                    if (!mayScout) continue;
                    toscout.push(child.id);
                }  
            }  
        }

        let i = 0;
        let htmltext = `<table class="foe-table"><tr><th>${i18n('Boxes.scoutingTimes.ProvinceName')}</th><th>${i18n('Boxes.scoutingTimes.ScoutingCost')}</th><th>${i18n('Boxes.scoutingTimes.ScoutingTime')}</th></tr>`;
        
        while (toscout.length > 0) {
            let p = toscout.pop();
            let province = scoutingTimes.Provinces[p];
            if (province.isScouted|false) {
                htmltext += `<tr class="scouted"><td>${province.name}</td><td></td><td></td></tr>`;
                i += 1;
            }
            if ((province.travelTime|0)>0) {
                i += 1;
                htmltext += `<tr><td>${province.name}</td><td>`;
                htmltext += (p === scoutingTimes.target) ? `...<img  src="${MainParser.InnoCDN}/assets/city/gui/citymap_icons/tavern_shop_boost_scout_small_icon.png" alt="">...` : `<img  src="${MainParser.InnoCDN}/assets/shared/icons/money.png" alt=""> ${province.travelTime > 1 ? scoutingTimes.numberWithCommas(province.scoutingCost) : 0}</td>`;
                htmltext += `<td><img  src="${MainParser.InnoCDN}/assets/shared/icons/icon_time.png" alt="">`;
                htmltext += ` ${scoutingTimes.format(province.travelTime)}`;
                htmltext += `</td></tr>`;
            }
        }
       
        htmltext += `</table><div style="color:var(--text-bright); text-align:center;">${i18n('Boxes.scoutingTimes.Warning')}</div>`
        
        if (i > 0) {
            HTML.AddCssFile('scoutingtimes');
        
            HTML.Box({
                id: 'mapScoutingTimesDialog',
                title: i18n('Boxes.scoutingTimes.Title'),
                auto_close: true,
                dragdrop: true,
                minimize: false,
                ask: i18n('Boxes.scoutingTimes.HelpLink'),
            });
    
            $('#mapScoutingTimesDialogBody').html(htmltext);
        }
    },

    format: (time) => {

        let min = Math.floor(time/60);
        let hours = Math.floor(min/60);
        let days = Math.floor(hours/24);
        min = min % 60;
        hours = hours % 24;

        let timestring = (days>0) ? `${days}d ` : ``;
        timestring += (hours>0) ? `${hours}h ` : ``;
        timestring += ((min>0) || (min+hours+days === 0))  ? `${min}m ` : ``;

        return timestring
    },

    numberWithCommas: (x) => {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },

    castleBonuses:{},
    target:0,
    
    distance: (StartId, GoalId) => {
        limit = Math.floor(Math.min(StartId/100,GoalId/100))*100
        StartDist = scoutingTimes.GetDistances(StartId,limit);
        GoalDist = scoutingTimes.GetDistances(GoalId,limit);

        Distance = 1000;
        for (let index in GoalDist) {
            
            if (StartDist[index]) {
                DistanceNew = GoalDist[index].dist+StartDist[index].dist;
                if (DistanceNew<Distance) Distance = DistanceNew;
            }
            if (Distance === 1) break;
        }
        console.log(scoutingTimes.Provinces[StartId].name + "to" + scoutingTimes.Provinces[GoalId].name + ": " + Distance);
        return Distance;
    },

    GetDistances:(StartId,limit) => {
        let temp = [[StartId,0]];
        for (let Province of temp) {
            if (Province[0]<limit) break;
            if (!scoutingTimes.Provinces[Province[0]]?.parentIds) continue;
            for (let parent of scoutingTimes.Provinces[Province[0]].parentIds) {
                temp.push([parent,Province[1]+1]);
            }
        }
        let distx = {};
        for (let p of temp) {
            if (!distx[p[0]]) {
                distx[p[0]] = {'id':p[0], 'dist': p[1]};
            } else {
                if (distx[p[0]]?.dist > p[1]) distx[p[0]] = {'id':p[0], 'dist': p[1]};
            }
        }
        return distx;
    },

};
