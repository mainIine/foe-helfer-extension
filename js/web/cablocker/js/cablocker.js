FoEproxy.addFoeHelperHandler('ResourcesUpdated', () => {
    CABlocker.checkBuildings();
});
FoEproxy.addFoeHelperHandler('CityMapUpdated', () => {
    CABlocker.checkBuildings();
});

HTML.AddCssFile('cablocker')

CABlocker = {
    timer: null,
    lastCheck:0,
    addBlocker: (type = "FP") => {
        $('body').append(`
            <div id="CollectAllOverlay" class="MapActivityHide ActiveOnmain">
                ${[...new Set(MainParser.Quests.map(x=>x.category))].filter(x=>!['story','outpost','allies'].includes(x)).map(x=>`<div class="QuestDummy"></div>`).join('')}
                <div class="imgContainer">
                    <img src="${srcLinks.get('/shared/icons/' + (type=="FP" ? 'icon_strategy_points' : 'quest_reward/icon_quest_motivate_all')+'.png',true)}">
                    <img src="${srcLinks.get("/shared/gui/buffbar/buffbar_slot_overlay_exclamation.png",true)}">
                </div>
            </div>`);
        $('#CollectAllOverlay .imgContainer').on('click', (e) => {
            $('#CollectAllOverlay').remove();
            CABlocker.setTimer();
        });
        if (ActiveMap != 'main') $('#CollectAllOverlay').hide();
    },
    checkBuildings: async () => {
        let now = GameTime.get();
        if (now - CABlocker.lastCheck < 2) return;
        await ExistenceConfirmed('MainParser.CityMapData||MainParser.CityEntities');
        CABlocker.lastCheck = now;
        if (!Settings.GetSetting('BlockCollectAll')) return;
        let finishedProductions = Object.values(MainParser.CityMapData).filter(x => x.state && x.state.productionOption && (!x.state.next_state_transition_at || x.state.next_state_transition_at < now) && !x.state.paused_at)
        CABlocker.setTimer();
        $('#CollectAllOverlay').remove();
        if (finishedProductions.length == 0) return;
        let FPcheck = await CABlocker.checkFP();
        if (!FPcheck) {
            let notMotivated = finishedProductions.filter(x => x?.state?.socialInteractionId != 'motivate');
            for (let building of notMotivated) {
                let meta = MainParser.CityEntities[building.cityentity_id];
                let motivateable = (meta?.components?.AllAge?.socialInteraction?.interactionType == "motivate") || JSON.stringify(meta.abilities).includes("MotivatableAbility");
                if (motivateable) {
                    CABlocker.addBlocker("Motivate");
                    break;
                }
            }
        }
    },
    setTimer: () =>{
        clearTimeout(CABlocker.timer);
        let now = GameTime.get();
        let ongoingProductions = Object.values(MainParser.CityMapData).filter(x => x.state && x.state.productionOption && x.state.next_state_transition_at > now && !x.state.paused_at)
        let nextFinish = Math.min(...ongoingProductions.map(x => new Date(x.state.next_state_transition_at)));
        
        setTimeout(() => {
            CABlocker.checkBuildings();            
        }, (nextFinish - now + 3)*1000);
        console.log('CABlocker: Next check at', moment.unix(nextFinish));
    },
    checkFP: async () => {
        await ExistenceConfirmed('MainParser.Quests');
        if ((ResourceStock.strategy_points||0) <= (GoodsData?.strategy_points?.abilities?.collectingRestricted?.maxAmount||99)) return false;
        CABlocker.addBlocker();
        return true;
    }
};
CABlocker.checkBuildings();