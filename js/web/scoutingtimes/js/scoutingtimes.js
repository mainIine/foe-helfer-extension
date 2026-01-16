
/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
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

            castlebonus = 1 - boost.amount/100;
        }
    
		scoutingTimes.castleBonuses[l['level']] = castlebonus;
    }
});

FoEproxy.addHandler('CampaignService', 'start', (data, postData) => {
       
    // Is the box enabled in the settings?
    if (!Settings.GetSetting('ShowScoutingTimes')) {
        return;
    }
    maxShip = Math.floor(Object.values(data.responseData.provinces).map(x=>x.id||0).pop()/100)
    for (let province of data.responseData.provinces) {
        if (province.provinceType=="ship") province.parentIds=province.parentIds.concat([...Array(maxShip - province.id/100).keys()].map(x=>(x+province.id/100+1)*100))
        scoutingTimes.Provinces[province.id||0] = province;
    }
    
    scoutingTimes.scoutPosition = data.responseData.scout?.current_province|0;
    scoutingTimes.scoutTarget = data.responseData.scout?.path[data.responseData.scout?.path?.length-1]|0;
    scoutingTimes.scoutTraveltime = data.responseData.scout.time_to_target;

    return scoutingTimes.ShowDialog();
});

FoEproxy.addHandler('CampaignService', 'getProvinceData', (data, postData) => {
       
    return scoutingTimes.CheckSectors(data);
});
FoEproxy.addHandler('CampaignService', 'buySector', (data, postData) => {
       
    return scoutingTimes.CheckSectors(data);
});

FoEproxy.addHandler('CampaignService', 'buyInstantScout', (data, postData) => {
       
    // Is the box enabled in the settings?
    if (!Settings.GetSetting('ShowScoutingTimes')) {
        return;
    }
    
    scoutingTimes.Provinces[data.responseData.province.id].isScouted = true;

    return scoutingTimes.ShowDialog();
});

FoEproxy.addHandler('CampaignService', 'moveScoutToProvince', (data, postData) => {
       
    // Is the box enabled in the settings?
    if (!Settings.GetSetting('ShowScoutingTimes')) {
        return;
    }
    
    for (resp of postData) {
        if (resp.requestMethod === 'moveScoutToProvince') {
            scoutingTimes.scoutTarget = resp.requestData[0][resp.requestData[0].length - 1];
            scoutingTimes.scoutTraveltime = data.responseData;
        }
    }

    return scoutingTimes.ShowDialog();
});

let scoutingTimes = {

    Provinces: {},
    castleBonuses:{},
    target:0,
    scoutPosition:0,
    scoutTarget:[],
    scoutTraveltime:0,

    /**
     * Shows a box displaying the base scouting times
     *
     * @constructor
     */
    ShowDialog: () => {

        //let Provinces = {};
        let toscout = [];
        
        let castlebonus = 1;
        if ((Castle.curLevel|0)>0) castlebonus = scoutingTimes.castleBonuses[Castle.curLevel];

        for (const p in scoutingTimes.Provinces) {
            if (Object.hasOwnProperty.call(scoutingTimes.Provinces, p)) {
                const province = scoutingTimes.Provinces[p];
                
                if (!(province.isPlayerOwned)) {
                    continue;
                }

                for (let element of province.children)
                {
                    let child = scoutingTimes.Provinces[element.targetId];
                    if (!child) continue;
                    if (child?.isPlayerOwned) {
                        continue;
                    };
                    if (toscout.indexOf(child.id) > -1) {
                        continue;
                    };

                    if (child.isScouted) {
                        scoutingTimes.Provinces[child.id].travelTime = 0;
                    } else {
                        if (!(scoutingTimes.Provinces[child.id].fromCurrent)) {
                            if (province.id === scoutingTimes.scoutPosition){
                                scoutingTimes.Provinces[child.id].fromCurrent = true;
                            }
                            scoutingTimes.Provinces[child.id].travelTime = (element.travelTime + (Math.max(scoutingTimes.distance(scoutingTimes.scoutPosition,child.id) - 1, 0)) * 600) * castlebonus;
                        } 

                        if (scoutingTimes.scoutTarget === child.id) {
                            scoutingTimes.Provinces[child.id].travelTime = scoutingTimes.scoutTraveltime;
                            scoutingTimes.target = child.id;
                        }
                    }
                    if (child.isScouted) scoutingTimes.Provinces[child.id].travelTime = 0;
                    let mayScout = true;

                    for (let blockId of child.blockers) {
                        if (!(scoutingTimes.Provinces[blockId]?.isPlayerOwned)) {
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
            if (province.isScouted) {
                htmltext += `<tr class="scouted" title="${i18n('Eras.'+Technologies.Eras[province.era])}"><td>${province.name}</td><td></td><td></td></tr>`;
                i += 1;
            }
            if ((province.travelTime|0)>0) {
                i += 1;
                htmltext += `<tr title="${i18n('Eras.'+Technologies.Eras[province.era])}"><td>${province.name}</td>`;
                htmltext += (p === scoutingTimes.target) ? `<td class="scouting">...<img  src="${srcLinks.get("/city/gui/citymap_icons/tavern_shop_boost_scout_small_icon.png", true)}" alt="">...` : `<td><img  src="${srcLinks.get("/shared/icons/money.png", true)}" alt=""> ${province.travelTime > 1 ? scoutingTimes.numberWithCommas(province.scoutingCost) : 0}</td>`;
                htmltext += `<td><img  src="${srcLinks.get("/shared/icons/icon_time.png", true)}" alt="">`;
                htmltext += ` ${scoutingTimes.format(province.travelTime)}`;
                htmltext += `</td></tr>`;
            }
        }
       
        htmltext += `</table>`;
        //htmltext += `<div style="color:var(--text-bright); text-align:center;">${i18n('Boxes.scoutingTimes.Warning')}</div>`
        
        if (i > 0) {
            if ($('#mapScoutingTimesDialog').length === 0) {
                HTML.AddCssFile('scoutingtimes');
        
                HTML.Box({
                    id: 'mapScoutingTimesDialog',
                    title: i18n('Boxes.scoutingTimes.Title'),
                    auto_close: true,
                    dragdrop: true,
                    minimize: true,
                    ask: i18n('Boxes.scoutingTimes.HelpLink'),
                    settings: 'scoutingTimes.ShowSettings()',
                });
            }
        
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
    
    distance: (StartId, GoalId) => {
        let limit = Math.floor(Math.min(StartId/100,GoalId/100)) * 100;
        let StartDist = scoutingTimes.GetDistances(StartId,limit);
        let GoalDist = scoutingTimes.GetDistances(GoalId,limit);

        let Distance = 1000;
        for (let index in GoalDist) {
            
            if (StartDist[index]) {
                let DistanceNew = GoalDist[index].dist+StartDist[index].dist;
                if (DistanceNew<Distance) Distance = DistanceNew;
            }
            if (Distance === 1) break;
        }
        return Distance;
    },

    GetDistances:(StartId,limit) => {

        let temp = [[StartId,0]];
        let distx = {};
        for (let Province of temp) {
            if (Province[0]<limit) break;

            let isShorter = false;

            if (!distx[Province[0]]) {
                distx[Province[0]] = {'id':Province[0], 'dist': Province[1]};
                isShorter = true;
            } else {
                if (distx[Province[0]]?.dist > Province[1]) {
                    distx[Province[0]] = {'id':Province[0], 'dist': Province[1]};
                    isShorter = true;
                }
            }

            if (!scoutingTimes.Provinces[Province[0]]?.parentIds || !isShorter) continue;
            for (let parent of scoutingTimes.Provinces[Province[0]].parentIds) {
                temp.push([parent,Province[1]+1]);
            }
            
        }
        return distx;
    },

    CheckSectors: (data) => {
            // Is the box enabled in the settings?
        if (!Settings.GetSetting('ShowScoutingTimes')) {
            return;
        }
        let Id = data.responseData[0].provinceId;
        let istaken = true;
        for (let sector of data.responseData) {
            if (!(sector.isPlayerOwned)) {
                istaken = false;
                break;
            }
        }

        if (!istaken) return;
                    
        scoutingTimes.Provinces[Id].isPlayerOwned = true;

        return scoutingTimes.ShowDialog();

    },
    
    /**
    *
    */
     ShowSettings: () => {
		let autoOpen = Settings.GetSetting('ShowScoutingTimes');

        let h = [];
        h.push(`<p><label><input id="autoStartScout" type="checkbox" ${(autoOpen === true) ? ' checked="checked"' : ''} />${i18n('Boxes.Settings.Autostart')}</label></p>`);
        h.push(`<p><button onclick="scoutingTimes.SaveSettings()" id="save-bghelper-settings" class="btn" style="width:100%">${i18n('Boxes.Settings.Save')}</button></p>`);

        $('#mapScoutingTimesDialogSettingsBox').html(h.join(''));
    },

    /**
    *
    */
    SaveSettings: () => {
        let value = false;
		if ($("#autoStartScout").is(':checked'))
			value = true;
		localStorage.setItem('ShowScoutingTimes', value);
		$(`#mapScoutingTimesDialogSettingsBox`).remove();
    },

};
