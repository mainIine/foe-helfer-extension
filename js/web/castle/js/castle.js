/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com//mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

// Get Reward From Item Shop
FoEproxy.addHandler('ItemShopService', 'purchaseItem', (data, postData) => {

    if (!data || !data.responseData) { return; }

    const d = data.responseData;

    if (d.__class__ && d.__class__ === 'ItemShopSlot')
    {
        Castle.curShopItems.purchased.count += 1;
        Castle.curShopItems.available.count -= 1;
        Castle.curShopItems.purchased.reward += Castle.curCastlePointsDiff.diff;
        Castle.curShopItems.available.reward -= Castle.curCastlePointsDiff.diff;
        Castle.curShopItems.date = moment(MainParser.getCurrentDateTime()).startOf('day').unix();

        localStorage.setItem('CastleCurShopItems', JSON.stringify(Castle.curShopItems));

        Castle.UpdateCastlePointsLog(data['requestId'], 'purchaseItem');
        Castle.ShowProgressTable();
    }
});

// Get Auction Reward
FoEproxy.addHandler('ItemAuctionService', 'getAuction', (data, postData) => {

    if (!data || !data.responseData || !data.responseData['state']) { return; }

    if (data.responseData['state'] === 'collectable')
    {
        let d = JSON.parse(localStorage.getItem('CastleCurAuctionWinning'));
        const startOfDay = moment(MainParser.getCurrentDateTime()).startOf('day').unix();

        if (!d || d.date !== startOfDay)
        {
            d = { date: startOfDay, rewards: [] };
        }

        d.rewards.push({ time: moment(MainParser.getCurrentDateTime()).unix(), reward: Castle.AuctionWinningReward });

        localStorage.setItem('CastleCurAuctionWinning', JSON.stringify(d));

        Castle.curAuctionWinning = d;

        Castle.UpdateCastlePointsLog(data['requestId'], 'wonAuction');

        Castle.ShowProgressTable();
    }

});


// Read Shop Items and possible Reward
FoEproxy.addHandler('ItemShopService', 'getShop', (data, postData) => {

    if (!data || !data.responseData) { return; }

    const d = data.responseData;

    if (d['context'] && d['context'] === 'antiques_dealer' && d['slots'])
    {
        Castle.curShopItems = {
            purchased: { count: 0, reward: 0 },
            available: { count: 0, reward: 0 }
        };

        d.slots.forEach(item => {
            if (item['cost'] === undefined || item['cost']['resources'] === undefined) { return; }
            const r = item['cost']['resources'];
            const gem = r['gemstones'] ? r['gemstones'] / Castle.ShopGemstonesDivisor : 0;
            const coins = r['trade_coins'] ? r['trade_coins'] / Castle.ShopTradeCoinsDivisor : 0;
            const castlePointsReward = Math.floor(gem + coins);

            if (item['amountRemaining'])
            {
                Castle.curShopItems.available.count += 1;
                Castle.curShopItems.available.reward += castlePointsReward;
            }
            else
            {
                Castle.curShopItems.purchased.count += 1;
                Castle.curShopItems.purchased.reward += castlePointsReward;
            }
        });

        Castle.curShopItems.date = moment(MainParser.getCurrentDateTime()).startOf('day').unix();
        localStorage.setItem('CastleCurShopItems', JSON.stringify(Castle.curShopItems));

        Castle.ShowProgressTable();
    }
});

// Get Gex Encounters Battle/ First Start
FoEproxy.addHandler('GuildExpeditionService', 'getOverview', (data, postData) => {

    if (!data || !data.responseData) { return; }

    const r = data.responseData;

    if (r['progress'] === undefined) { return; }

    if (r['progress']['currentEntityId'] === undefined)
    {
        // New Start of Guild Expedition
        r.progress.currentEntityId = 0;
    }

    if (r['state'] && r['nextStateTime'])
    {
        let GexEnd = r['state'] === 'inactive' ? r.nextStateTime : r.nextStateTime * 1 + 86400;
        localStorage.setItem('CastleGexEnd', GexEnd);
    }

    if (Castle.curGexLastOfSection === undefined || Castle.curGexLastOfSection !== r.currentEntityId)
    {
        Castle.curGexLastOfSection = r.progress.currentEntityId;
        localStorage.setItem('CastleCurGexLastOfSection', Castle.curGexLastOfSection);

        Castle.ShowProgressTable();
    }

});

// Get Gex Encounters after Battle/Negotiation
FoEproxy.addHandler('GuildExpeditionService', 'getState', (data, postData) => {

    if (!data || !data.responseData || !data.responseData[0]) { return; }

    const rid = data['requestId'];
    const r = data.responseData[0];

    if (r['currentEntityId'] === undefined) { return; }

    if (Castle.curGexLastOfSection === undefined || Castle.curGexLastOfSection < r.currentEntityId)
    {
        Castle.curGexLastOfSection = r.currentEntityId;
        localStorage.setItem('CastleCurGexLastOfSection', Castle.curGexLastOfSection);

        if (Castle.GexLastOfSectionsIds.includes(r.currentEntityId))
        {
            Castle.UpdateCastlePointsLog(rid, 'gex');
            Castle.ShowProgressTable();
        }
    }

});

// Get new daily challenge
FoEproxy.addHandler('ChallengeService', 'getOptions', (data, postData) => {

    if (!data || !data.responseData) { return; }

    const r = data.responseData;

    if (r['options'] === undefined) { return; }

    if (r.options.length === 2)
    {
        Castle.curDailyChallenge = { id: null, state: 'select_challenge' }
        localStorage.setItem('CastleCurDailyChallenge', JSON.stringify(Castle.curDailyChallenge));
    }

    Castle.ShowProgressTable();

});

// Get castle system data
FoEproxy.addHandler('CastleSystemService', 'all', (data, postData) => {

    if (!data || !data.responseData || !data.requestMethod) { return; }

    if (data.requestMethod === 'getCastleSystemPlayer' ||
        data.requestMethod === 'collectDailyPoints' ||
        data.requestMethod === 'getCastleSystemPlayer')
    {

        Castle.UpdateCastleData(data);
    }

    if (data.requestMethod === 'getOverview')
    {
        Castle.dailyPointsCollectionAvailableAt = data.responseData.dailyPointsCollectionAvailableAt;
        localStorage.setItem('CastleDailyPointsCollectionAvailableAt', Castle.dailyPointsCollectionAvailableAt);

        Castle.ShowProgressTable();
    }

});

// Update SevenDayChallenge 
FoEproxy.addHandler('ChallengeService', 'updateTaskProgress', (data, postData) => {

    if (!data || !data.responseData) { return; }

    const d = data.responseData;
    let state = 'in_progress';

    if (!d['flags'] || !d['flags'][0] || d['flags'][0] !== 'static_counter') { return; }

    if (d['currentProgress'] && d['maxProgress'] && d['maxProgress'] === Castle.SevenDayChallenge)
    {
        if (d.currentProgress === d.maxProgress)
        {
            state = 'success';
            Castle.UpdateCastlePointsLog(data['requestId'], 'sevenDayChallenge');
        }

        Castle.curSevenDayChallenge = { id: d.id, state: state, currentProgress: d.currentProgress }
    }

});

// Collect Challenge Reward
FoEproxy.addHandler('ChallengeService', 'collectReward', (data, postData) => {

    if (!data || !data.responseData || !data.responseData.__class__) { return; }

    if (data.responseData.__class__ === 'Success')
    {
        const curDailyChallenge = JSON.parse(localStorage.getItem('CastleCurDailyChallenge'));

        if (curDailyChallenge && curDailyChallenge.id)
        {
            Castle.curDailyChallenge = { id: curDailyChallenge.id, state: 'success' }
        }
        else
        {
            Castle.curDailyChallenge = { id: null, state: 'success' }
        }

        Castle.UpdateCastlePointsLog(data.requestId, 'dailyChallenge');
    }

    Castle.ShowProgressTable();
});

// Get active challenges on startup
FoEproxy.addHandler('ChallengeService', 'getActiveChallenges', (data, postData) => {

    if (!data || !data.responseData) { return; }

    const d = data.responseData;

    Castle.curSevenDayChallenge = undefined;

    for (let c in d)
    {
        if (!d.hasOwnProperty(c) || !d[c].type || !d[c].state) continue;

        if (d[c].type === 'daily_challenge')
        {
            Castle.curDailyChallenge = { id: d[c].id, state: d[c].state };
            localStorage.setItem('CastleCurDailyChallenge', JSON.stringify(Castle.curDailyChallenge));
        }

        if (d[c].type === 'daily_challenge_counter')
        {
            if (d[c].tasks && d[c].tasks[0] && d[c].tasks[0].currentProgress)
            {
                Castle.curSevenDayChallenge = { id: d[c].id, state: d[c].state, currentProgress: d[c].tasks[0].currentProgress }
            }
        }
    }

    if (Castle.curSevenDayChallenge === undefined)
    {
        Castle.curSevenDayChallenge = { state: 'inactive', currentProgress: 0 };
    }

    Castle.ShowProgressTable();

});

/**
 * @type {{curCastlePoints: undefined, AuctionWinningReward: number, curCastlePointsDiff: {}, UpdateCastleData: Castle.UpdateCastleData, DailyWinningBattlesReward: number, RewardGroups: {Shop: number, Daily: number, Gex: number, AntiqueDealer: number, Challenge: number}, curWinningBattles: undefined, BuildBox: Castle.BuildBox, curDailyChallenge: undefined, curLevel: number, SevenDayChallengeReward: number, ShowLog: Castle.ShowLog, NextNegotiationPoints: undefined, SevenDayChallenge: number, Settings: {showSummary: boolean, showGroupNames: boolean, logDays: number}, ShowProgressTable: Castle.ShowProgressTable, DailyWinningBattles: number, ShopGemstonesDivisor: number, DailyChallengeReward: number, CastleSettings: Castle.CastleSettings, MaxDailyNegotiationsReward: number, MaxGexLastOfSections: number, curNegotiations: undefined, DailyCastlePoints: number, Show: Castle.Show, DailyChallenge: number, MaxDailyWinningBattlesReward: number, ShopTradeCoinsDivisor: number, SetCastlePointLog: Castle.SetCastlePointLog, curDailyCastlePoints: undefined, DailyNegotiations: number, curShopItems: undefined, startOfDay: *, DailyNegotiationsReward: number, curGexLastOfSection: undefined, UpdateCastlePointsLog: Castle.UpdateCastlePointsLog, SettingsSaveValues: Castle.SettingsSaveValues, CurrentView: string, UpdateCastlePoints: Castle.UpdateCastlePoints, dailyPointsCollectionAvailableAt: undefined, curSevenDayChallenge: undefined, NextWinningBattlesPoints: undefined, CastlePointLog: undefined, GexLastOfSectionsIds: number[], CreateRewardList: (function(): *[]), ShowCastlePoints: Castle.ShowCastlePoints, WeeklyGexLastOfSection: number, curAuctionWinning: undefined, UnlockedFeatures: undefined}}
 */
let Castle = {

    AuctionWinningReward: 30,
    DailyCastlePoints: 1,
    DailyChallenge: 1,
    DailyChallengeReward: 100,
    DailyNegotiations: 15,
    DailyNegotiationsReward: 30,
    DailyWinningBattles: 15,
    DailyWinningBattlesReward: 30,
    GexLastOfSectionsIds: [
        7, 15, 23, 31,
        39, 47, 55, 63,
        71, 79, 87, 95,
        103, 111, 119, 127,
        135, 143, 151, 159],
    MaxDailyNegotiationsReward: 240,
    MaxDailyWinningBattlesReward: 240,
    MaxGexLastOfSections: 900,
    SevenDayChallenge: 7,
    SevenDayChallengeReward: 700,
    ShopGemstonesDivisor: 2,
    ShopTradeCoinsDivisor: 300,
    WeeklyGexLastOfSection: 16,

    curAuctionWinning: undefined,
    curCastlePoints: undefined,
    curCastlePointsDiff: {},
    curDailyCastlePoints: undefined,
    curDailyChallenge: undefined,
    curGexLastOfSection: undefined,
    curLevel: 0,
    curNegotiations: undefined,
    curSevenDayChallenge: undefined,
    curShopItems: undefined,
    curWinningBattles: undefined,
    dailyPointsCollectionAvailableAt: undefined,
    NextNegotiationPoints: undefined,
    NextWinningBattlesPoints: undefined,
    RewardGroups: { Daily: 0, Challenge: 1, Gex: 2, AntiqueDealer: 3, Shop: 4 },
    startOfDay: moment(MainParser.getCurrentDateTime()).startOf('day').unix(),

    Settings: {
        showGroupNames: true,
        showSummary: true,
        logDays: 7
    },

    CastlePointLog: undefined,
    CurrentView: 'overview',
    UnlockedFeatures: undefined,


    BuildBox: () => {

        if ($('#Castle').length === 0)
        {
            HTML.Box({
                id: 'Castle',
                title: i18n('Boxes.Castle.Title'),
                auto_close: true,
                dragdrop: true,
                resize: false,
                minimize: true,
                settings: 'Castle.CastleSettings()'
            });

            HTML.AddCssFile('castle');
        }
        else
        {
            HTML.CloseOpenBox('Castle');
            return;
        }

        let Settings = JSON.parse(localStorage.getItem('CastleSettings'));

        if (Settings)
        {
            for (const k in Settings)
            {
                if (!Settings.hasOwnProperty(k)) { continue; }
                Castle.Settings[k] = Settings[k];
            }
        }

        if (!Castle.CastlePointLog)
        {
            Castle.CastlePointLog = JSON.parse(localStorage.getItem('CastlePointLog') || '[]');
        }

        Castle.Show();
        Castle.ShowCastlePoints();

        if (Castle.CurrentView === 'log')
        {
            Castle.ShowLog();
        }
        else
        {
            Castle.CurrentView = 'overview';
            Castle.ShowProgressTable();
        }
    },


    UpdateCastlePoints: (rid) => {

        if (Castle.curCastlePoints === undefined)
        {
            Castle.curCastlePoints = localStorage.getItem('CastleCurCastlePoints') || 0;
        }

        if (ResourceStock.castle_points)
        {
            const increased = ResourceStock.castle_points > Castle.curCastlePoints;
            let diff = 0;

            if (Castle.curCastlePoints > 0 && increased)
            {
                Castle.curCastlePointsDiff = { rid: rid, diff: ResourceStock.castle_points - Castle.curCastlePoints };
                diff = Castle.curCastlePointsDiff.diff;
                Castle.SetCastlePointLog(Castle.curCastlePointsDiff);
            }

            Castle.curCastlePoints = ResourceStock.castle_points;

            if (increased)
            {
                localStorage.setItem('CastleCurCastlePoints', Castle.curCastlePoints);
                Castle.ShowCastlePoints(diff);
            }
        }

    },

    /**
     *
     * @param d
     *
     */
    UpdateCastleData: (d) => {

        if (!d || !d.responseData) { return; }

        const rid = d.requestId || null;
        const startOfDay = moment(MainParser.getCurrentDateTime()).startOf('day').unix();
        let rtype;
        let nextlevel = false;

        d = d.responseData;

        // Collect daily Castle points (CastleSystemService "requestMethod": "collectDailyPoints")
        if (d.points && d.nextCollectionPoints)
        {
            Castle.curDailyCastlePoints = {
                points: d.points,
                nextCollectionPoints: d.nextCollectionPoints,
                currentStreak: d.currentStreak,
                maxStreak: d.maxStreak,
                success: true,
                collected: startOfDay
            }

            rtype = 'castlePoints';

            localStorage.setItem('CastleCurDailyCastlePoints', JSON.stringify(Castle.curDailyCastlePoints));
        }

        // CastleSystemService "requestMethod": "getOverview"
        if (d.nextCastlePoints)
        {
            let n = d.nextCastlePoints;
            
            // reset battle/negotiation points if new day started
            if (Castle.startOfDay !== startOfDay)
            {
                Castle.NextWinningBattlesPoints = Castle.DailyWinningBattlesReward;
                Castle.NextNegotiationPoints = Castle.DailyNegotiationsReward;
            }

            if (Castle.NextWinningBattlesPoints &&
                Castle.NextWinningBattlesPoints > n.castlePointsWinBattle)
            {
                rtype = 'battle';
            }

            if (Castle.NextNegotiationPoints &&
                Castle.NextNegotiationPoints > n.castlePointsWinNegotation)
            {
                rtype = 'negotiation';
            }

            nextlevel = Castle.curLevel && Castle.curlLevel < d.level;

            Castle.curLevel = d.level !== undefined ? d.level : Castle.curLevel;
            Castle.NextWinningBattlesPoints = n.castlePointsWinBattle !== undefined ? n.castlePointsWinBattle : Castle.NextWinningBattlesPoints;
            Castle.NextNegotiationPoints = n.castlePointsWinNegotation !== undefined ? n.castlePointsWinNegotation : Castle.NextNegotiationPoints;
            Castle.curWinningBattles = Castle.NextWinningBattlesPoints < Castle.DailyWinningBattlesReward ? (Castle.NextWinningBattlesPoints / 2) : Castle.DailyWinningBattles;
            Castle.curNegotiations = Castle.NextNegotiationPoints < Castle.DailyNegotiationsReward ? (Castle.NextNegotiationPoints / 2) : Castle.DailyNegotiations;
            Castle.ShopGemstonesDivisor = n.castlePointsItemShopGemstonesDivisor ? n.castlePointsItemShopGemstonesDivisor : Castle.ShopGemstonesDivisor;
            Castle.ShopTradeCoinsDivisor = n.castlePointsItemShopTradeCoinsDivisor ? n.castlePointsItemShopTradeCoinsDivisor : Castle.ShopTradeCoinsDivisor;
            Castle.AuctionWinningReward = n.castlePointsItemAuctionWinBidding ? n.castlePointsItemAuctionWinBidding : 30;
            Castle.startOfDay = startOfDay
        }

        if (rid && rtype) { Castle.UpdateCastlePointsLog(rid, rtype); }

        if ($('#Castle').length === 1)
        {
            if (nextlevel)
            {
                Castle.ShowCastlePoints();
            }

            Castle.ShowProgressTable();
        }

    },


    UpdateCastlePointsLog: (rid, rtype) => {

        const idx = Castle.CastlePointLog ? Castle.CastlePointLog.findIndex((obj => obj.rid && obj.rid === rid && obj.date === Castle.startOfDay)) : -1;

        if (idx >= 0)
        {
            Castle.CastlePointLog[idx].name.push(rtype);
            localStorage.setItem('CastlePointLog', JSON.stringify(Castle.CastlePointLog));

            if (Castle.CurrentView === 'log')
            {
                Castle.ShowLog();
            }
        }

    },


    CreateRewardList: () => {
        let d = [];
        let battlePointReward = 0,
            negotiationPointReward = 0,
            dcp = 0, dcr = 0,       //Daily Challenge
            scp = 0, scr = 0,       //Seven Day Challenge
            glsp = 0, glsr = 0,     //Gex Last Sections
            sir = 0, sip = 0, sipsum = 0, sirsum = 0, siwarn = false, //Bought Shop Items
            aup = 0, aur = 0,       //Auction
            cp, cpwarn = false;     //Castle Points
        const startOfDay = moment(MainParser.getCurrentDateTime()).startOf('day').unix();

        //Reset values on new day
        if (Castle.startOfDay !== startOfDay)
        {
            Castle.curWinningBattles = Castle.DailyWinningBattles;
            Castle.curNegotiations = Castle.DailyNegotiations;

            Castle.startOfDay = moment(MainParser.getCurrentDateTime()).startOf('day').unix();
        }

        // Daily winning battle reward
        for (let i = Castle.DailyWinningBattlesReward; i > Castle.NextWinningBattlesPoints; i -= 2)
        {
            battlePointReward += i;
        }

        d.push({
            name: i18n('Boxes.Castle.Battles'),
            group: Castle.RewardGroups.Daily,
            sort: 1,
            progress: Castle.DailyWinningBattles - Castle.curWinningBattles,
            maxprogress: Castle.DailyWinningBattles,
            reward: battlePointReward,
            maxreward: Castle.MaxDailyWinningBattlesReward,
            warning: false,
            success: Castle.DailyWinningBattles - Castle.curWinningBattles === Castle.DailyWinningBattles,
            date: startOfDay
        });

        // Daily negotiation reward   
        for (let i = Castle.DailyNegotiationsReward; i > Castle.NextNegotiationPoints; i -= 2)
        {
            negotiationPointReward += i;
        }

        d.push({
            name: i18n('Boxes.Castle.Negotiations'),
            group: Castle.RewardGroups.Daily,
            sort: 2,
            progress: Castle.DailyNegotiations - Castle.curNegotiations,
            maxprogress: Castle.DailyNegotiations,
            reward: negotiationPointReward,
            maxreward: Castle.MaxDailyNegotiationsReward,
            warning: false,
            success: Castle.DailyNegotiations - Castle.curNegotiations === Castle.DailyNegotiations,
            date: startOfDay
        });

        // Daily Castle points
        cp = {
            points: '?',
            nextCollectionPoints: '?',
            currentStreak: '?',
            maxStreak: '?',
            success: false,
            collected: startOfDay
        };

        if (Castle.curDailyCastlePoints === undefined)
        {
            Castle.curDailyCastlePoints = JSON.parse(localStorage.getItem('CastleCurDailyCastlePoints'));
        }

        const colAvailableAt = localStorage.getItem('CastleDailyPointsCollectionAvailableAt') || 0;

        if (Castle.curDailyCastlePoints)
        {
            cp = Castle.curDailyCastlePoints;

            if (cp.success && startOfDay !== cp.collected)
            {
                cp.success = false;
            }

            if (startOfDay !== cp.collected && startOfDay - cp.collected === 86400)
            {
                cp.points = cp.nextCollectionPoints;
            }

            if(colAvailableAt > startOfDay ){
                cp.success = true;
            }
        }
        else
        {
            if (Castle.dailyPointsCollectionAvailableAt && Castle.dailyPointsCollectionAvailableAt > startOfDay)
            {
                cp.success = true;
            }
            else if (colAvailableAt > startOfDay)
            {
                cp.success = true;
            }
            else
            {
                cpwarn = true;
            }
        }

        d.push({
            name: i18n('Boxes.Castle.DailyCastlePoints'),
            group: Castle.RewardGroups.Daily,
            sort: 3,
            progress: cp.success ? 1 : 0,
            maxprogress: 1,
            reward: cp.success ? cp.points : 0,
            maxreward: cp.points ? cp.points : '?',
            warning: cpwarn,
            warnnotice: HTML.i18nTooltip(i18n('Boxes.Castle.VisitCastleWarning')),
            success: cp.success,
            date: startOfDay
        });

        // Daily Challenge
        if (MainParser.UnlockedFeatures.includes("daily_challenges"))
        {
            if (Castle.curDailyChallenge === undefined || Castle.curDailyChallenge.state === 'success')
            {
                dcp = 1;
                dcr = Castle.DailyChallengeReward;
            }


            d.push({
                name: i18n('Boxes.Castle.DailyChallenge'),
                group: Castle.RewardGroups.Challenge,
                sort: 1,
                progress: dcp,
                maxprogress: Castle.DailyChallenge,
                reward: dcr,
                maxreward: Castle.DailyChallengeReward,
                warning: false,
                success: dcp === Castle.DailyChallenge,
                date: startOfDay
            });
        }

        // Seven Day Challenge
        if (MainParser.UnlockedFeatures.includes("daily_challenges"))
        {
            scp = Castle.curSevenDayChallenge ? Castle.curSevenDayChallenge.currentProgress : 0;

            if (scp === 7)
            {
                scr = Castle.SevenDayChallengeReward;
            }

            d.push({
                name: i18n('Boxes.Castle.SevenDayChallenge'),
                group: Castle.RewardGroups.Challenge,
                sort: 2,
                progress: scp,
                maxprogress: Castle.SevenDayChallenge,
                reward: scr,
                maxreward: Castle.SevenDayChallengeReward,
                warning: false,
                success: scp === Castle.SevenDayChallenge,
                date: startOfDay
            });
        }

        // Gex Last of sections
        if (MainParser.UnlockedFeatures.includes("guild_expedition"))
        {
            const GexEnd = localStorage.getItem('CastleGexEnd');

            if (Castle.curGexLastOfSection === undefined)
            {
                Castle.curGexLastOfSection = localStorage.getItem('CastleCurGexLastOfSection');
            }

            // Reset Gex if a new round started and isn't updatet atm
            if (GexEnd && GexEnd < moment(MainParser.getCurrentDateTime()).unix())
            {
                Castle.curGexLastOfSection = 0;
            }

            if (Castle.curGexLastOfSection !== undefined)
            {
                let i = 0,
                    k = 0;
                let progress = Castle.curGexLastOfSection;

                Castle.GexLastOfSectionsIds.forEach(level => {

                    if (level <= progress)
                    {
                        if (k % 4 === 0)
                        {
                            i += 15;
                        }

                        glsr += i;
                        k++;
                        glsp++;
                    }

                });

            }

            d.push({
                name: i18n('Boxes.Castle.GexLastOfSections'),
                group: Castle.RewardGroups.Gex,
                sort: 1,
                progress: glsp,
                maxprogress: Castle.GexLastOfSectionsIds.length,
                reward: glsr,
                maxreward: Castle.MaxGexLastOfSections,
                warning: Castle.curGexLastOfSection === undefined,
                warnnotice: HTML.i18nTooltip(i18n('Boxes.Castle.VisitGexWarning')),
                success: glsp >= Castle.GexLastOfSectionsIds.length,
                date: startOfDay
            });
        }

        // Item Shop
        if (MainParser.UnlockedFeatures.includes("antiques_dealer"))
        {
            if (Castle.curShopItems === undefined)
            {
                Castle.curShopItems = JSON.parse(localStorage.getItem('CastleCurShopItems'));
            }

            if (Castle.curShopItems && Castle.curShopItems.date === startOfDay)
            {
                sir = Castle.curShopItems.purchased.reward;
                sirsum = Castle.curShopItems.purchased.reward + Castle.curShopItems.available.reward;
                sip = Castle.curShopItems.purchased.count;
                sipsum = Castle.curShopItems.purchased.count + Castle.curShopItems.available.count;
            }
            else
            {
                sipsum = 6;
                siwarn = true;
            }

            d.push({
                name: i18n('Boxes.Castle.ShopAntiqueDealer'),
                group: Castle.RewardGroups.AntiqueDealer,
                sort: 1,
                progress: sip,
                maxprogress: sipsum,
                reward: sir,
                maxreward: sirsum,
                warning: siwarn,
                warnnotice: HTML.i18nTooltip(i18n('Boxes.Castle.VisitAntiqueDealerWarning')),
                success: sip === sipsum,
                date: startOfDay
            });
        }

        // Won auction bidding
        if (MainParser.UnlockedFeatures.includes("antiques_dealer"))
        {
            if (Castle.curAuctionWinning === undefined)
            {
                Castle.curAuctionWinning = JSON.parse(localStorage.getItem('CastleCurAuctionWinning'));
            }

            if (Castle.curAuctionWinning && Castle.curAuctionWinning['date'] && Castle.curAuctionWinning['rewards'] && Castle.curAuctionWinning.date === startOfDay)
            {
                Castle.curAuctionWinning.rewards.forEach(item => {
                    aup++;
                    aur += item.reward;
                });
            }

            d.push({
                name: i18n('Boxes.Castle.AuctionsWon'),
                group: Castle.RewardGroups.AntiqueDealer,
                sort: 2,
                progress: HTML.Format(aup),
                maxprogress: HTML.Format(aup),
                reward: HTML.Format(aur),
                maxreward: HTML.Format(aur),
                warning: false,
                success: aup > 0,
                date: startOfDay
            });
        }

        return d.sort((a, b) => a.group - b.group || a.sort - b.sort);

    },


    Show: () => {

        let h = [];

        h.push(`<div class="castle_wrapper">`);
        h.push(`<div class="overview dark-bg" id="casPointsWrapper"></div>`);
        h.push(`<div id="cas-table-wrapper" class="content"></div>`);
        h.push(`</div>`);

        $('#CastleBody').html(h.join('')).promise().done(function () {

            $('#Castle').on('click', '#casSwitchView', function () {

                Castle.CurrentView = Castle.CurrentView === 'log' ? 'overview' : 'log';

                if (Castle.CurrentView === 'log')
                {
                    $('#casSwitchView').html(i18n('Boxes.Castle.Overview'))
                    Castle.ShowLog();
                }
                else
                {
                    $('#casSwitchView').html(i18n('Boxes.Castle.Log'))
                    Castle.ShowProgressTable();
                }

            });
        });

    },


    ShowCastlePoints: (diff = null) => {

        if ($('#Castle #casPointsWrapper').length === 1)
        {
            let CastleLimit = MainParser.CastleSystemLevels[Castle.curLevel].requiredPoints;

            $('#Castle #casPointsWrapper').html(`
                <div><span>${i18n('Boxes.Castle.CastlePoints')}: ${HTML.Format(Castle.curCastlePoints)} / ${HTML.Format(CastleLimit)}</span>
                <span id="casPointsDiff">${diff ? '+' + diff : ''}</span><br />
                <span>${i18n('Boxes.Castle.Level')}: ${Castle.curLevel}</span></div>
                <div><span id="casLogBtn"><button id="casSwitchView" class="btn"${!Castle.CastlePointLog || Castle.CastlePointLog.length === 0 ? ' disabled' : ''}>${Castle.CurrentView === 'log' ? i18n('Boxes.Castle.Overview') : i18n('Boxes.Castle.Log')}</button></span></div>
            `).promise().done(function () {

                if (diff)
                {
                    $('#casPointsDiff').delay(3500).fadeOut(500, function () {
                        $(this).html('');
                    });

                }
            });
        }

    },


    ShowProgressTable: () => {

        if ($('#Castle').length === 0 || Castle.CurrentView !== 'overview') { return; }

        let h = [],
            firstCaption = true;

        const list = Castle.CreateRewardList();

        h.push(`<table class="foe-table">`);

        if (!Castle.Settings.showGroupNames)
        {
            h.push(`<thead class="sticky"><tr class="caption"><th>${i18n('Boxes.Castle.Type')}</th><th class="text-right"><span>${HTML.i18nTooltip(i18n('Boxes.Castle.Progress'))}</span></th><th class="text-right"><span>${HTML.i18nTooltip(i18n('Boxes.Castle.CastlePoints'))}</span></th></tr></thead>`);
        }

        h.push(`<tbody>`);

        h.push(list.map((i) => {

            let r = '';

            if (Castle.Settings.showGroupNames && i.sort === 1)
            {
                let GroupName = Object.keys(Castle.RewardGroups).find(k => Castle.RewardGroups[k] === i.group);
                r = r + `<tr class="caption"><td>${i18n('Boxes.Castle.' + GroupName)}</td><td class="text-right"><span>${firstCaption ? i18n('Boxes.Castle.Progress') : ''}</span></td><td class="text-right"><span>${firstCaption ? i18n('Boxes.Castle.CastlePoints') : ''}</span></td></tr>`;
                firstCaption = false;
            }

            let progressStr = i.progress === i.maxprogress ? i.maxprogress : i.progress + ' / ' + i.maxprogress;
            let rewardStr = i.reward === i.maxreward ? i.maxreward : i.reward + ' / ' + i.maxreward;

            return r + `<tr ${i.warning && i.warnnotice ? ' title="' + i.warnnotice + '" ' : ''}class="${i.warning ? 'warning ' : ''}${i.success ? 'bg-green' : 'pending'}">
                <td>${i.name}</td>
                <td class="text-right">${progressStr}</td>
                <td class="text-right">${rewardStr}</td>
                </tr>`;

        }).join(''));

        h.push(`</tbody></table>`);

        $('#Castle #cas-table-wrapper').html(h.join('')).promise().done(function () {
            $('#CastleBody tr[title], #CastleBody span[title]').tooltip({
                html: false,
                container: '#CastleBody'
            });
        });

    },


    ShowLog: () => {

        let h = [],
            c = [],
            sumPerDays = {};

        const elwidth = $('#Castle #cas-table-wrapper').width();
        const typeNames = {
            battle: i18n('Boxes.Castle.Battle'),
            negotiation: i18n('Boxes.Castle.Negotiation'),
            gex: i18n('Boxes.Castle.Gex'),
            purchaseItem: i18n('Boxes.Castle.AntiqueDealer'),
            wonAuction: i18n('Boxes.Castle.AuctionsWon'),
            dailyChallenge: i18n('Boxes.Castle.Challenge'),
            sevenDayChallenge: i18n('Boxes.Castle.Challenge'),
            castlePoints: i18n('Boxes.Castle.CastlePoints')
        }

        Castle.CastlePointLog.forEach(entry => {
            if (!sumPerDays[entry.date])
            {
                sumPerDays[entry.date] = 0;
            }
            sumPerDays[entry.date] += entry.value;
        });

        h.push(`<div id="casLogWrapper"><div class="overview">`);
        h.push(`<table class="foe-table" id="casLogTable">
            <thead><tr class="caption open"><th>${i18n('Boxes.Castle.Time')} <span></span></th>
            <th>${i18n('Boxes.Castle.Type')}</th><th class="text-right">${i18n('Boxes.Castle.CastlePoints')}</th>
            </thead><tbody>`);

        h.push(Castle.CastlePointLog.sort((a, b) => b.time - a.time).map((e) => {
            let r = '';
            if (!c.includes(e.date))
            {
                r = r + `<tr class="caption open" data-group="${e.date}"><td>${moment.unix(e.date).format(i18n('Date'))} <span></span></td>
                        <td colspan="2" class="text-right">${sumPerDays[e.date]}</td></tr>`;
                c.push(e.date);
            }

            return r + `<tr data-group="${e.date}"><td>${moment.unix(e.time).format(i18n('DateTime'))}</td>
                <td>${e.name && e.name.length ? e.name.map(n => { return typeNames[n] ? typeNames[n] : '' }).join(' + ') : i18n('Boxes.Castle.Unknown')}</td>
                <td class="text-right">+${e.value}</td></tr>`;
        }).join(''));

        h.push(`</tbody></table></div>`);
        h.push(`<div id="casLogFooter">${i18n('Boxes.Castle.LogDuration') + ': ' + Castle.Settings.logDays + ' ' + i18n('Boxes.Castle.Days')}</div>`)
        h.push(`</div>`);

        $('#Castle #cas-table-wrapper').css({ 'min-width': elwidth }).html(h.join(''));

        $('#casLogTable tbody tr.caption').on('click', function () {
            let group = $(this).attr('data-group');
            $(this).toggleClass("closed open");
            $('#casLogTable tr[data-group="' + group + '"]').not('.caption').toggleClass("hide");
        });

        $('#casLogTable thead tr.caption').on('click', function () {
            let isopen = $(this).hasClass('open');
            let tc = isopen ? 'hide' : 'open';
            $(this).toggleClass("closed open");
            $('#casLogTable tbody tr[data-group].caption').removeClass("closed").removeClass("open").addClass(isopen ? 'closed' : 'open');
            $('#casLogTable tr[data-group]').not('.caption').removeClass("hide").removeClass("show").addClass(tc);
        });

    },


    SetCastlePointLog: (d) => {

        if (!d) { return; }

        const Time = MainParser.getCurrentDateTime();
        const startOfDay = moment(Time).startOf('day').unix();
        const removeLogsDate = startOfDay - Castle.Settings.logDays * 86400;

        let CastlePointLog = Castle.CastlePointLog;

        if (!CastlePointLog)
        {
            CastlePointLog = JSON.parse(localStorage.getItem('CastlePointLog') || '[]');
        }

        // remove requestIds from log 
        CastlePointLog = CastlePointLog.map(e => {
            delete e.rid
            return e
        });

        CastlePointLog.push({ rid: d.rid, date: startOfDay, name: [], time: moment(Time).unix(), value: d.diff });

        // remove old log days
        Castle.CastlePointLog = CastlePointLog.filter(obj => {
            return obj.date >= removeLogsDate;
        });

        localStorage.setItem('CastlePointLog', JSON.stringify(Castle.CastlePointLog));

    },


    CastleSettings: () => {

        let c = [];
        const logdurations = [3, 5, 7, 14];
        const Settings = Castle.Settings;

        c.push(`<p class="text-left"><span class="settingtitle">${i18n('Boxes.Castle.Overview')}</span><input id="casShowGroupNames" name="showgroupnames" value="1" type="checkbox" ${Settings.showGroupNames === true ? ' checked="checked"' : ''} /> <label for="casShowGroupNames">${i18n('Boxes.Castle.ShowGroupNames')}</label></p>`);
        c.push(`<p class="text-left"><span class="settingtitle">${i18n('Boxes.Castle.Log')}</span><label for="casLogDuration">${i18n('Boxes.Castle.LogDuration')}</label> <select id="casLogDuration" name="logduration">`);
        logdurations.forEach(l => {
            c.push(`<option value="${l}"${Castle.Settings.logDays === l ? ' selected="selected"' : ''}>${l + ' ' + i18n('Boxes.Castle.Days')}</option>`);
        });
        c.push(`</select></p>`);

        c.push(`<hr><p><button id="save-Castle-settings" class="btn" style="width:100%" onclick="Castle.SettingsSaveValues()">${i18n('Boxes.General.Save')}</button></p>`);
        $('#CastleSettingsBox').html(c.join(''));

    },


    SettingsSaveValues: () => {

        Castle.Settings.showGroupNames = !!$("#casShowGroupNames").is(':checked');
        Castle.Settings.logDays = parseInt($('#casLogDuration').val()) || Castle.Settings.logDays;

        localStorage.setItem('CastleSettings', JSON.stringify(Castle.Settings));

        $(`#CastleSettingsBox`).fadeToggle('fast', function () {
            $(this).remove();
            Castle.ShowCastlePoints();

            if (Castle.CurrentView === 'log')
            {
                Castle.ShowLog();
            }
            else
            {
                Castle.CurrentView = 'overview';
                Castle.ShowProgressTable();
            }

        });
    }

}