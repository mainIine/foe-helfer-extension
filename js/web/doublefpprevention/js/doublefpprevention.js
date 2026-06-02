
/*
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * Licensed under AGPL - see LICENSE.md for details.
 */

FoEproxy.addRequestHandler('GreatBuildingsService', 'contributeForgePoints', (postData) => {
    
    let t = (Settings.GetSetting('doubleFPtimeout') || 0) * 1000;
    
    if (t == 0) return;
    if (postData.requestData[1]==ExtPlayerID) return; //only show box in other player GB 
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
