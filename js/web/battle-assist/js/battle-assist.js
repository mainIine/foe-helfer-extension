FoEproxy.addHandler('BattlefieldService', 'all', (data, postData) => {
    HTML.CloseOpenBox('battleAssistNextEraDialog'); HTML.CloseOpenBox('battleAssistRogueDialog');
    const state = data.responseData.__class__ === 'BattleRealm' ? data.responseData.state : data.responseData;
    if (state.__class__ !== 'BattleRealmState') return;
    const { winnerBit, unitsOrder, ranking_data } = state;
    let alive = [], nextEraUnitDead = false;
    for (const unit of unitsOrder.filter(e => e.teamFlag === 1)) {
        if (unit.currentHitpoints) {
            alive.push(unit.unitTypeId);
        } else {
            const unitEra = Unit.Types.find(e => e.unitTypeId === unit.unitTypeId)?.minEra;
            if (Technologies.Eras[unitEra] > CurrentEraID) nextEraUnitDead = true;
        }
    }
    if (nextEraUnitDead) return BattleAssist.ShowNextEraDialog();
    if (winnerBit !== 1 || !ranking_data.nextArmy) return;
    if (alive.filter(e => e !== 'rogue')) return BattleAssist.ShowRogueDialog();
});

let BattleAssist = {
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

    ShowRogueDialog: () => {
        HTML.AddCssFile('battle-assist');

        HTML.Box({
            'id': 'battleAssistRogueDialog',
            'title': i18n('Boxes.BattleAssist.Title'),
            'auto_close': true,
            'dragdrop': false,
            'minimize': false
        });
        $('#battleAssistRogueDialogBody').html(`<div class="blink">${i18n('Boxes.BattleAssist.Text.Rogue')}</div>`);
    },
};
