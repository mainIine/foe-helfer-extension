FoEproxy.addHandler('BattlefieldService', 'all', (data, postData) => {
    HTML.CloseOpenBox('battleAssistStopDialog');

    const state = data.responseData.__class__ === 'BattleRealm' ? data.responseData.state : data.responseData;
    if (state.__class__ !== 'BattleRealmState') {
        return;
    }

    const { winnerBit, unitsOrder, ranking_data } = state;
    if (winnerBit !== 1) { return; } // 1 - win

    if (!ranking_data.nextArmy) { return }

    const atLeastOneNotRogue = unitsOrder.filter(it => it.teamFlag === 1 && it.currentHitpoints).some(it => it.unitTypeId != 'rogue');
    const haveAliveUnits = unitsOrder.filter(it => it.teamFlag === 1 && it.currentHitpoints).length;
    if (haveAliveUnits && !atLeastOneNotRogue) {
        BattleAssist.ShowStopNextAttackDialog();
    }
});

let BattleAssist = {
    ShowStopNextAttackDialog: () => {
        HTML.AddCssFile('battle-assist');

        HTML.Box({
			'id': 'battleAssistStopDialog',
			'title': i18n('Boxes.BattleAssist.Title'),
			'auto_close': true,
			'dragdrop': false,
			'minimize': false
		});
        $('#battleAssistStopDialogBody').html(`<div class="blink">${i18n('Boxes.BattleAssist.Text')}</div>`);
    },
};
