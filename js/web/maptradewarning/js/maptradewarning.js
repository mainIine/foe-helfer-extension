
/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/dsiekiera/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('ArmyUnitManagementService', 'getArmyInfo', (data, postData) => {
	//closes box when opening army screen
	HTML.CloseOpenBox('mapTradeWarningDialog');
});
FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
	//closes box when going back to city
	HTML.CloseOpenBox('mapTradeWarningDialog');
});
FoEproxy.addHandler('CampaignService', 'getProvinceData', (data, postData) => {

	// if setting is true?
	if(!Settings.GetSetting('ShowMapTradeWarning')){
		return;
    }
    //closes box if still open for some reason
    HTML.CloseOpenBox('mapTradeWarningDialog');

    return mapTradeWarning.ShowMapDialog();
});

/**
 * @type {{ShowMapDialog: mapTradeWarning.ShowMapDialog}}
 */
let mapTradeWarning = {

	/**
	 * Shows a User Box covering the 'Negotiate' button in province sector screens
	 *
	 * @constructor
	 */
    ShowMapDialog: () => {
        HTML.AddCssFile('maptradewarning');
        
        HTML.Box({
            'id': 'mapTradeWarningDialog',
            'title': i18n('Boxes.mapTradeWarning.Title'),
            'auto_close': true,
            'dragdrop': false,
            'minimize': false
        });
        $('#mapTradeWarningDialogBody').html(`${i18n('Boxes.mapTradeWarning.Text')}`);
    },
};
