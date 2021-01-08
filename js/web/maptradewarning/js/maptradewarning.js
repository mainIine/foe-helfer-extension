
FoEproxy.addHandler('ArmyUnitManagementService', 'getArmyInfo', (data, postData) => {

	HTML.CloseOpenBox('mapTradeWarningDialog');
});
FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {

	HTML.CloseOpenBox('mapTradeWarningDialog');
});
FoEproxy.addHandler('CampaignService', 'getProvinceData', (data, postData) => {

	// if setting is true?
	if(!Settings.GetSetting('ShowMapTradeWarning')){
		return;
    }
    
    HTML.CloseOpenBox('mapTradeWarningDialog');

    return mapTradeWarning.ShowMapDialog();
});

/**
 * @type {{ShowRogueDialog: BattleAssist.ShowMapDialog}}
 */
let mapTradeWarning = {

	/**
	 * Shows a User Box when a province is opened
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
