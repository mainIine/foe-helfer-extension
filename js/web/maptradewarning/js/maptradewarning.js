
/*
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * Licensed under AGPL - see LICENSE.md for details.
 */

FoEproxy.addHandler('ArmyUnitManagementService', 'getArmyInfo', (data, postData) => {
    // Closes the box when the player is about to attack a sector
    HTML.CloseOpenBox('mapTradeWarningDialog');
});

FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
    // Closes the box when the player navigates back to the city
    HTML.CloseOpenBox('mapTradeWarningDialog');
});

FoEproxy.addHandler('CampaignService', 'getProvinceData', (data, postData) => {
    // Is the warning enabled in the settings?
    if (!Settings.GetSetting('ShowMapTradeWarning')) {
        return;
    }

    // Closes the box when the player visits a province that is completely conquered
    if (data.responseData && data.responseData.filter(e => !e.isPlayerOwned).length === 0) {
        HTML.CloseOpenBox('mapTradeWarningDialog');
        return;
    }

    // Don't create a new box while another one is still open
    if ($('#mapTradeWarningDialog').length > 0) {
        return;
    }

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
            'class': 'window-warning',
            'dragdrop': false,
            'minimize': false
        });
        $('#mapTradeWarningDialogBody').html(`${i18n('Boxes.mapTradeWarning.Text')}`);
    },
};
