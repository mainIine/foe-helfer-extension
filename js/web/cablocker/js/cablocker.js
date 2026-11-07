FoEproxy.addFoeHelperHandler('ResourcesUpdated', () => {
    CABlocker.checkBuildings();
});
FoEproxy.addFoeHelperHandler('CityMapUpdated', () => {
    CABlocker.checkBuildings();
});

HTML.AddCssFile('cablocker')

CABlocker = {
    timer: null,
    checkBlock: false,


    /**
     * Places the overlay over the collect-all button.
     *
     * @param {string} type 'FP' (FP bar full) or 'Motivate' (unmotivated finished buildings)
     */
    addBlocker: (type = 'FP') => {
        $('body').append(`
            <div id="CollectAllOverlay" class="MapActivityHide ActiveOnmain clickable">
                ${[...new Set(MainParser.Quests.map(x => x.category))].filter(x => !['story', 'outpost', 'allies'].includes(x)).map(() => `<div class="QuestDummy"></div>`).join('')}
                <div class="imgContainer">
                    <img src="${srcLinks.get('/shared/icons/' + (type === 'FP' ? 'icon_strategy_points' : 'quest_reward/icon_quest_motivate_all') + '.png', true)}">
                    <img src="${srcLinks.get('/shared/gui/buffbar/buffbar_slot_overlay_exclamation.png', true)}">
                </div>
            </div>`);
        $('#CollectAllOverlay .imgContainer').on('click', () => {
            $('#CollectAllOverlay').remove();
            CABlocker.setTimer();
        });
        if (ActiveMap !== 'main') $('#CollectAllOverlay').hide();
    },


    /**
     * Whether a production of the building is ready for pickup. Idle buildings (e.g. right
     * after a manual pickup) may still carry a productionOption, so they never count. A
     * producing state is not pushed again when it runs out, its transition time decides.
     *
     * @param {Object} building Placed city map entity
     * @param {number} now Game time in seconds
     * @returns {boolean}
     */
    isFinished: (building, now) => {
        const state = building.state;
        if (!state?.productionOption || state.pausedAt) return false;
        if (state.__class__ === 'ProductionFinishedState') return true;
        if (state.__class__ === 'IdleState') return false;
        return !state.next_state_transition_at || state.next_state_transition_at < now;
    },


    /**
     * Whether the building is motivated: generic buildings use socialInteractionId,
     * classic ones is_motivated / boosted.
     *
     * @param {Object} building Placed city map entity
     * @returns {boolean}
     */
    isMotivated: (building) => {
        const state = building.state || {};
        return state.socialInteractionId === 'motivate' || !!state.is_motivated || !!state.boosted;
    },


    /**
     * Whether the building can be motivated at all.
     *
     * @param {Object} meta City entity meta data
     * @returns {boolean}
     */
    isMotivatable: (meta) => (
        meta?.components?.AllAge?.socialInteraction?.interactionType === 'motivate' ||
        (meta?.abilities || []).some(a => a.__class__ === 'MotivatableAbility')
    ),


    /**
     * Debounced check: blocks collect-all when the FP bar is full or a finished
     * production of a motivatable building is not motivated.
     */
    checkBuildings: () => {
        if (!Settings.GetSetting('BlockCollectAll')) return;
        if (CABlocker.checkBlock) return;
        CABlocker.checkBlock = true;

        setTimeout(async () => {
            CABlocker.checkBlock = false;
            await ExistenceConfirmed(() => MainParser.CityMapData != null && MainParser.CityEntities != null);
            CABlocker.setTimer();
            const now = GameTime.get();
            const finishedProductions = Object.values(MainParser.CityMapData).filter(x => CABlocker.isFinished(x, now));
            $('#CollectAllOverlay').remove();
            if (finishedProductions.length === 0) return;
            if (await CABlocker.checkFP()) return;

            const unmotivated = finishedProductions.some(x => !CABlocker.isMotivated(x) && CABlocker.isMotivatable(MainParser.CityEntities[x.cityentity_id]));
            if (unmotivated) CABlocker.addBlocker('Motivate');
        }, 1000);
    },


    /**
     * Schedules the next check for the moment the next running production finishes.
     */
    setTimer: () => {
        clearTimeout(CABlocker.timer);
        const now = GameTime.get();
        const nextFinish = Math.min(...Object.values(MainParser.CityMapData)
            .filter(x => x.state?.productionOption && x.state.next_state_transition_at > now && !x.state.pausedAt)
            .map(x => x.state.next_state_transition_at));

        if (!Number.isFinite(nextFinish)) return;

        CABlocker.timer = setTimeout(CABlocker.checkBuildings, (nextFinish - now + 1) * 1000);
    },


    /**
     * Places the FP blocker when the FP bar is full.
     *
     * @returns {Promise<boolean>} True if the blocker was placed
     */
    checkFP: async () => {
        await ExistenceConfirmed(() => MainParser.Quests != null);
        if ((ResourceStock.strategy_points || 0) <= (GoodsData?.strategy_points?.abilities?.collectingRestricted?.maxAmount || 99)) return false;
        CABlocker.addBlocker();
        return true;
    }
};
