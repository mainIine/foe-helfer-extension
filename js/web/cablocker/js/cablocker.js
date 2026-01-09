FoEproxy.addFoeHelperHandler('ResourcesUpdated', () => {
    CABlocker.checkBuildings();
});
FoEproxy.addFoeHelperHandler('CityMapUpdated', () => {
    CABlocker.checkBuildings();
});

HTML.AddCssFile('cablocker')

CABlocker = {
    timer: null,
    checkBlock:false,
    addBlocker: (type = "FP") => {
        $('body').append(`
            <div id="CollectAllOverlay" class="MapActivityHide ActiveOnmain clickable">
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
    checkBuildings: () => {
        if (!Settings.GetSetting('BlockCollectAll')) return;
        if (CABlocker.checkBlock) return;
        CABlocker.checkBlock = true;
        
        setTimeout(async () => {
            CABlocker.checkBlock = false;
            await ExistenceConfirmed('MainParser.CityMapData||MainParser.CityEntities');
            CABlocker.setTimer();
            let now = GameTime.get();
            let finishedProductions = Object.values(MainParser.CityMapData).filter(x => x.state && x.state.productionOption && (!x.state.next_state_transition_at || x.state.next_state_transition_at < now) && !x.state.pausedAt)
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
        }, 1000);    
    },
    setTimer: () =>{
        clearTimeout(CABlocker.timer);
        let now = GameTime.get();
        let ongoingProductions = Object.values(MainParser.CityMapData).filter(x => x.state && x.state.productionOption && x.state.next_state_transition_at > now && !x.state.pausedAt)
        let nextFinish = Math.min(...ongoingProductions.map(x => new Date(x.state.next_state_transition_at)));
        
        setTimeout(() => {
            CABlocker.checkBuildings();            
        }, (nextFinish - now + 1)*1000);
    },
    checkFP: async () => {
        await ExistenceConfirmed('MainParser.Quests');
        if ((ResourceStock.strategy_points||0) <= (GoodsData?.strategy_points?.abilities?.collectingRestricted?.maxAmount||99)) return false;
        CABlocker.addBlocker();
        return true;
    }
};