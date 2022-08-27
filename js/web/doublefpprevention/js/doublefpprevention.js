
/*
 * **************************************************************************************
 * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('GreatBuildingsService', 'contributeForgePoints', (data, postData) => {
    
    let t = (Settings.GetSetting('doubleFPtimeout') || 0) * 1000;
    
    if (t == 0) return;
    let playerRank = data.responseData.filter(rank => rank.player.player_id == ExtPlayerID)
    if (playerRank[0].rank == undefined) return;
    doubleFPprevention.ShowBox();
    let x = setTimeout(doubleFPprevention.Close, t);
});

/**
 * @type {{ShowMapDialog: doubleFPprevention.ShowBox}}
 */
let doubleFPprevention = {

    /**
     * Shows a User Box covering the 'Negotiate' button in province sector screens
     *
     * @constructor
     */
    ShowBox: () => {
        HTML.AddCssFile('doublefpprevention');
        
        HTML.Box({
            'id': 'doubleFPprevention',
            'title': i18n('Boxes.doubleFPprevention.Title'),
            'auto_close': true,
            'dragdrop': false,
            'minimize': false
        });
        $('#doubleFPpreventionBody').html(`${i18n('Boxes.doubleFPprevention.Text')}`);
    },

    Close:()=>{
        HTML.CloseOpenBox('doubleFPprevention')
    }
};
