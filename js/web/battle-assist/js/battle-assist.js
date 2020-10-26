/*
 * **************************************************************************************
 *
 * Dateiname:                 battle-assist.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              15.09.20, 09:21 Uhr
 * zuletzt bearbeitet:        15.09.20, 09:18 Uhr
 *
 * Copyright © 2020
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('BattlefieldService', 'all', (data, postData) => {

	// if setting is true?
	if(!Settings.GetSetting('ShowRougeUnitWarning')){
		return;
	}

	HTML.CloseOpenBox('battleAssistNextEraDialog');
    HTML.CloseOpenBox('battleAssistRogueDialog');

    const state = data.responseData.__class__ === 'BattleRealm' ? data.responseData.state : data.responseData;

    if (state.__class__ !== 'BattleRealmState')
    	return;

    const { winnerBit, unitsOrder, ranking_data } = state;

    if (!winnerBit)
    	return;

    let alive = [], nextEraUnitDead = false;

    for (const unit of unitsOrder.filter(e => e.teamFlag === 1)) {
        if (unit.currentHitpoints) {
            alive.push(unit.unitTypeId);
        } else {
            const unitEra = Unit.Types.find(e => e.unitTypeId === unit.unitTypeId)?.minEra;
            if (Technologies.Eras[unitEra] > CurrentEraID)
            	nextEraUnitDead = true;
        }
    }

    // A unit from a future age has died
    if (nextEraUnitDead)
    	return BattleAssist.ShowNextEraDialog();

    // There are no other opponents
    if (winnerBit !== 1 || !ranking_data?.nextArmy)
    	return;

    // Only agents are still alive
    if (alive.filter(e => e !== 'rogue').length === 0)
    	return BattleAssist.ShowRogueDialog();
});

/**
 * @type {{ShowRogueDialog: BattleAssist.ShowRogueDialog, ShowNextEraDialog: BattleAssist.ShowNextEraDialog}}
 */
let BattleAssist = {

	/**
	 * Shows a User Box when an army unit of the next age has died
	 *
	 * @constructor
	 */
    ShowNextEraDialog: () => {
        HTML.AddCssFile('battle-assist');
        
        HTML.Box({
            'id': 'battleAssistNextEraDialog',
            'title': i18n('Boxes.BattleAssist.Title'),
            'auto_close': true,
            'dragdrop': false,
            'minimize': false
        });
        $('#battleAssistNextEraDialogBody').html(`${i18n('Boxes.BattleAssist.Text.NextEra')}`);
    },

	/**
	 * Shows a box warning when only agents are left after a fight
	 *
	 * @constructor
	 */
    ShowRogueDialog: () => {
        HTML.AddCssFile('battle-assist');

        HTML.Box({
            'id': 'battleAssistRogueDialog',
            'title': i18n('Boxes.BattleAssist.Title'),
            'auto_close': true,
            'dragdrop': false,
            'minimize': false
        });
        $('#battleAssistRogueDialogBody').html(`${i18n('Boxes.BattleAssist.Text.Rogue')}`);
    },
};
