
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

FoEproxy.addMetaHandler('city_entities', (data, postData) => {

    let resp = JSON.parse(data['response']);
        
    for (let building of resp)
	{
        if(!building['type'] || building.type != "greatbuilding") continue;
        findGB.list.push(building.name);
    }
    findGB.list.sort()
});

FoEproxy.addHandler('RankingService', 'getRanking', (data, postData) => {
    if (data.responseData.category.value != "great_building" || $('#findGBDialog').length === 0) return;
    findGB.check(data.responseData.rankings);
});
FoEproxy.addHandler('GreatBuildingsService', 'getOtherPlayerOverview', (data, postData) => {
    if ($('#findGBDialog').length === 0) return;
    findGB.check(data.responseData);
});

let findGB = {
    list:[],
    found:[],
    ShowDialog: () => {
        
		if ($('#findGBDialog').length > 0){
			HTML.CloseOpenBox('findGBDialog');

			return;
		}

        if ($('#findGBDialog').length === 0) {
            HTML.AddCssFile('findGB');

            HTML.Box({
                id: 'findGBDialog',
                title: i18n('Boxes.findGB.Title'),
                auto_close: true,
                dragdrop: true,
                minimize: true,
                resize: true,
                //ask: i18n('Boxes.findGB.HelpLink'),
            });
        }
        
        html = ``;
        html += `<table class="dark-bg w-full"><tr>`;
        html += `<td><select id="GBselect">`;
        html += `<option value="" disabled selected>${i18n("Boxes.findGB.selectGB")}</option>`
        for (i of findGB.list) {
            html += `<option value="${i}">${i}</option>`
        }
        html += `</select></td>`;
        html += `<td><input type="number" id="GBminLevel" min="0" max ="998" placeholder="${i18n("Boxes.findGB.minLvl")}"></td>`;
        html += `<td><input type="number" id="GBmaxLevel" min="1" max ="999" placeholder="${i18n("Boxes.findGB.maxLvl")}"></td></tr><tr>`;
        html += `<td><input type="checkbox" id="GBhasProgress"><label for="GBhasProress">${i18n("Boxes.findGB.hasProgress")}</label></td>`;
        html += `<td colspan="2"><input type="button" id="findGBreset" class="btn" value="${i18n("General.Reset")}"></input></td>`;
        html += `</tr></table>`;
        html += `<table id="foundGB" class="foe-table"><thead class="sticky"><tr><th>${i18n("General.Player")}</th><th>${i18n("General.GB")}</th><th>${i18n("General.Level")}</th></tr></thead>`
        
        for (i of findGB.found) {
            html += findGB.row(i)
        }
        html += `</table>`
        
        $('#findGBDialogBody').html(html);
        $('#findGBreset').click(() => {
            findGB.found=[];
            findGB.ShowDialog();
        });
    },

    check: (data) => {
        let name = $('#GBselect option:selected')[0].value;
        if (name == "") return;
        let min = $('#GBminLevel')[0].value;
        let max = $('#GBmaxLevel')[0].value;
        let p = $('#GBhasProgress')[0].checked;
        if (min =='') min=0;
        if (max =='') max=1000;
        if (min > max) [min,max]=[max, min];
        for (let GB of data) {
            let progress = Math.round((((GB.points || 0) + (GB.current_progress || 0))/((GB.requiredPoints || 0) + (GB.max_progress || 0)) || 0)*100);
            if (GB.name == name && GB.level>=min && GB.level<=max && ((p && progress > 0) || !p)) {
                let testGB = {player: GB.player.name, GB: GB.name, level: GB.level, playerID:GB.player.player_id, progress:progress}
                if (!findGB.found.find(obj => obj.player==testGB.player && obj.GB==testGB.GB && obj.level==testGB.level)) {
                    findGB.found.push(testGB);
                    $('#foundGB').append(findGB.row(testGB));
                }
            }   
        }
    },

    row: (i) => {
        return `<tr><td>${MainParser.GetPlayerLink(i.playerID,i.player)}</td><td>${i.GB}</td><td class="progress" style="--p:${i.progress}%">${i.level}</td></tr>`
    }



};
