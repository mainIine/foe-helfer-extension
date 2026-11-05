/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

/**
 * Regression test of the great building level costs and patron rewards after
 * the prestige rework (GreatBuildings.GetReworkCosts / GetReworkRewards).
 *
 * Checks the cost curve against the totals InnoGames announced for level 200
 * (copper only buildings, rounded to 1,000) and level 500 (gold buildings,
 * exact), against level costs measured in the game, the reward formula
 * against measured patron rewards and the bonus curve between the metadata
 * breakpoints against measured bonus values (beta, 2026-11-05), and the linear
 * curve of the Shattered Horizon Siphon against costs and rewards measured on
 * live (2026-11-05).
 *
 * Usage: node tools/gbcosts/validate.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// first level costs of every great building (the metadata holds level n = n times this value)
const FIRST_LEVEL = {
	X_AllAge_EasterBonus4: 56, X_AllAge_Expedition: 56, X_AllAge_Oracle: 47,
	X_BronzeAge_Landmark1: 44, X_BronzeAge_Landmark2: 44, X_IronAge_Landmark1: 48, X_IronAge_Landmark2: 48,
	X_EarlyMiddleAge_Landmark1: 52, X_EarlyMiddleAge_Landmark2: 52, X_EarlyMiddleAge_Landmark3: 47,
	X_HighMiddleAge_Landmark1: 56, X_HighMiddleAge_Landmark3: 56, X_LateMiddleAge_Landmark1: 60, X_LateMiddleAge_Landmark3: 60,
	X_ColonialAge_Landmark1: 64, X_ColonialAge_Landmark2: 64, X_IndustrialAge_Landmark1: 68, X_IndustrialAge_Landmark2: 68,
	X_ProgressiveEra_Landmark1: 72, X_ProgressiveEra_Landmark2: 72, X_ModernEra_Landmark1: 76, X_ModernEra_Landmark2: 76,
	X_PostModernEra_Landmark1: 76, X_PostModernEra_Landmark2: 76, X_ContemporaryEra_Landmark1: 76, X_ContemporaryEra_Landmark2: 76,
	X_TomorrowEra_Landmark1: 80, X_TomorrowEra_Landmark2: 80, X_FutureEra_Landmark1: 84, X_FutureEra_Landmark2: 84,
	X_ArcticFuture_Landmark1: 96, X_ArcticFuture_Landmark2: 96, X_ArcticFuture_Landmark3: 96,
	X_OceanicFuture_Landmark1: 100, X_OceanicFuture_Landmark2: 100, X_OceanicFuture_Landmark3: 100,
	X_VirtualFuture_Landmark1: 104, X_VirtualFuture_Landmark2: 104, X_SpaceAgeMars_Landmark1: 108, X_SpaceAgeMars_Landmark2: 108,
	X_SpaceAgeAsteroidBelt_Landmark1: 112, X_SpaceAgeVenus_Landmark1: 116, X_SpaceAgeJupiterMoon_Landmark1: 120,
	X_SpaceAgeTitan_Landmark1: 282, X_SpaceAgeTitan_Landmark2: 218, X_SpaceAgeTitan_Landmark3: 345,
	X_SpaceAgeSpaceHub_Landmark1: 1241, X_SpaceAgeSpaceHub_Landmark2: 1000,
};

// total FP up to the maximum level as announced by InnoGames (2026-11-05):
// gold buildings up to level 500 (exact), copper only buildings up to level 200 (rounded to 1,000)
const ANNOUNCED = {
	X_BronzeAge_Landmark2: 755725990, X_IronAge_Landmark1: 755740095, X_EarlyMiddleAge_Landmark2: 755756655,
	X_HighMiddleAge_Landmark1: 755774620, X_LateMiddleAge_Landmark3: 755787935, X_ColonialAge_Landmark2: 755802020,
	X_IndustrialAge_Landmark1: 755823150, X_ProgressiveEra_Landmark1: 755832405, X_ProgressiveEra_Landmark2: 755832405,
	X_ContemporaryEra_Landmark1: 755852635, X_FutureEra_Landmark1: 755880935, X_ArcticFuture_Landmark2: 755929465,
	X_ArcticFuture_Landmark3: 755929465, X_OceanicFuture_Landmark2: 755944845, X_OceanicFuture_Landmark3: 755944845,
	X_VirtualFuture_Landmark1: 755962810, X_VirtualFuture_Landmark2: 755962810, X_SpaceAgeMars_Landmark2: 755978095,
	X_SpaceAgeAsteroidBelt_Landmark1: 755993475, X_AllAge_EasterBonus4: 755774620,
	X_BronzeAge_Landmark1: 5358000, X_IronAge_Landmark2: 5508000, X_EarlyMiddleAge_Landmark1: 5674000,
	X_EarlyMiddleAge_Landmark3: 5716000, X_HighMiddleAge_Landmark3: 5835000, X_LateMiddleAge_Landmark1: 5997000,
	X_ColonialAge_Landmark1: 6148000, X_IndustrialAge_Landmark2: 6313000, X_ModernEra_Landmark1: 6622000,
	X_ModernEra_Landmark2: 6622000, X_PostModernEra_Landmark1: 6740000, X_PostModernEra_Landmark2: 6740000,
	X_ContemporaryEra_Landmark2: 6864000, X_TomorrowEra_Landmark1: 7024000, X_TomorrowEra_Landmark2: 7024000,
	X_FutureEra_Landmark2: 7178000, X_ArcticFuture_Landmark1: 7412000, X_OceanicFuture_Landmark1: 7576000,
	X_SpaceAgeMars_Landmark1: 7890000, X_SpaceAgeVenus_Landmark1: 8210000, X_SpaceAgeJupiterMoon_Landmark1: 8367000,
	X_SpaceAgeTitan_Landmark1: 10003000, X_SpaceAgeTitan_Landmark2: 9406000, X_SpaceAgeTitan_Landmark3: 10594000,
	X_SpaceAgeSpaceHub_Landmark1: 19148000, X_SpaceAgeSpaceHub_Landmark2: 16876000,
	X_AllAge_Expedition: 5350000, X_AllAge_Oracle: 5354000,
};

// level costs measured in the game: [building, level the level-up starts from, total FP]
const MEASURED_COSTS = [
	['X_BronzeAge_Landmark2', 1, 88], ['X_BronzeAge_Landmark2', 10, 461], ['X_BronzeAge_Landmark2', 20, 671],
	['X_BronzeAge_Landmark2', 38, 1049], ['X_BronzeAge_Landmark2', 45, 1274], ['X_BronzeAge_Landmark2', 63, 1886],
	['X_BronzeAge_Landmark2', 88, 3667], ['X_BronzeAge_Landmark2', 101, 6295], ['X_BronzeAge_Landmark2', 104, 10753],
	['X_BronzeAge_Landmark2', 250, 227709], ['X_BronzeAge_Landmark1', 102, 6709],
	['X_ProgressiveEra_Landmark2', 141, 67477], ['X_ProgressiveEra_Landmark2', 200, 153381],
	['X_ProgressiveEra_Landmark2', 201, 154837], ['X_ProgressiveEra_Landmark2', 250, 226181],
	['X_ProgressiveEra_Landmark1', 24, 1230], ['X_FutureEra_Landmark1', 185, 131759], ['X_FutureEra_Landmark1', 256, 234212],
	['X_AllAge_Oracle', 12, 569], ['X_AllAge_Expedition', 12, 641], ['X_AllAge_Expedition', 194, 91860],
	['X_AllAge_EasterBonus4', 126, 44404], ['X_AllAge_EasterBonus4', 250, 226932],
	['X_LateMiddleAge_Landmark3', 117, 31540], ['X_LateMiddleAge_Landmark3', 250, 226784],
	['X_ArcticFuture_Landmark2', 140, 67587], ['X_ArcticFuture_Landmark2', 250, 224777],
	['X_EarlyMiddleAge_Landmark2', 104, 11589], ['X_EarlyMiddleAge_Landmark2', 250, 227231],
	['X_EarlyMiddleAge_Landmark3', 100, 6227], ['X_IronAge_Landmark2', 100, 5135], ['X_PostModernEra_Landmark1', 100, 8264],
	['X_ContemporaryEra_Landmark1', 104, 14068], ['X_VirtualFuture_Landmark1', 100, 11361],
];

// patron base rewards measured in the game: [building, level the level-up starts from, rewards by place]
// (levels of the past only list the places that had a patron; null = no value measured)
const MEASURED_REWARDS = [
	['X_FutureEra_Landmark1', 0, [12, 6]],
	['X_FutureEra_Landmark1', 1, [24, 12, 4, 2]],
	['X_FutureEra_Landmark1', 2, [37, 18, 6, 2]],
	['X_FutureEra_Landmark1', 3, [49, 24, 8, 2, 0]],
	['X_FutureEra_Landmark1', 4, [61, 31, 10, 4, 2]],
	['X_FutureEra_Landmark1', 8, [110, 55, 18, 5, 2]],
	['X_FutureEra_Landmark1', 9, [147, 73, 24, 6, 2]],
	['X_FutureEra_Landmark1', 39, [475, 238, 79, 20, 4]],
	['X_FutureEra_Landmark1', 70, [604, 302, 101, 25, 5]],
	['X_FutureEra_Landmark1', 99, [1263, 631, 210, 53, 11]],
	['X_FutureEra_Landmark1', 100, [795, 397, 132, 33, 7]],
	['X_FutureEra_Landmark1', 101, [921, 460, 153, 38, 8]],
	['X_FutureEra_Landmark1', 149, [6967, 3484, 1161, 290, 58]],
	['X_FutureEra_Landmark1', 183, [11250, 5625, 1875, 469, 94, 16, 2]],
	['X_FutureEra_Landmark1', 184, [11376, 5688, 1896, 474, 95, 16, 2]],
	['X_FutureEra_Landmark1', 185, [11502, 5751, 1917, 479, 96, 16, 2]],
	['X_FutureEra_Landmark1', 200, [8928, 4464, 1488, 372, 74, 12, 2]],
	['X_FutureEra_Landmark1', 299, [17242, 8621, 2874, 718, 144, 24, 4]],
	['X_FutureEra_Landmark1', 300, [12128, 6064, 2021, 505, 101, 17, 2]],
	['X_FutureEra_Landmark1', 400, [58458, 29229, 9743, 2436, 487, 81, 12]],
	['X_FutureEra_Landmark1', 500, [299275, 149637, 49879, 12470, 2494, 416, 59]],
	// first gold tier level-up: seven places although the building itself is still copper
	['X_VirtualFuture_Landmark1', 100, [992, 496, 165, 41, 8, 2, 0]],
	// copper only building beyond level 100: five places
	['X_AllAge_Expedition', 194, [8027, 4013, 1338, 334, 67]],
	// exact halves: place 4 = 287.5 is rounded up, place 5 = 57.5 down (floating point order of the game)
	['X_SpaceAgeSpaceHub_Landmark2', 69, [null, null, null, 288, 57]],
];


const noop = () => {};
const sandbox = {
	console,
	FoEproxy: { addFoeHelperHandler: noop, addHandler: noop, triggerFoeHelperHandler: noop },
	MainParser: {
		CityEntities: {},
		round: (value) => Math.round(value + (value >= 0 ? 0.000001 : -0.000001)),
		GetGBTierRanges: () => ({ starts: { copper: 1, gold: 101 }, ends: { copper: 200, gold: 2147483647 } }),
	},
	Technologies: { Eras: { BronzeAge: 2 } },
};

const source = fs.readFileSync(path.join(__dirname, '../../js/web/greatbuildings/js/greatbuildings.js'), 'utf8');
const GreatBuildings = vm.runInNewContext(source + '\nGreatBuildings;', sandbox);

for (const [id, first] of Object.entries(FIRST_LEVEL)) {
	sandbox.MainParser.CityEntities[id] = {
		id: id,
		strategy_points_for_upgrade: Array.from({ length: 10 }, (_, i) => first * (i + 1)),
		bonuses: [{}],
		maxTier: { value: (GreatBuildings.ReworkSteps[id].length === 6 ? 'gold' : 'copper') },
	};
}
// Shattered Horizon Siphon: linear costs instead of steps (GreatBuildings.ReworkLinear)
sandbox.MainParser.CityEntities['X_StellarAgeDiscovery_Landmark1'] = {
	id: 'X_StellarAgeDiscovery_Landmark1',
	strategy_points_for_upgrade: Array.from({ length: 10 }, (_, i) => 4150 * (i + 1)),
	bonuses: [{}],
	maxTier: { value: 'gold' },
};
// classic world building: no tier bonuses in the metadata
sandbox.MainParser.CityEntities['X_Classic'] = { id: 'X_Classic', strategy_points_for_upgrade: [40, 60, 90, 130, 180, 240, 310, 390, 480, 510] };

let failures = 0;
const check = (ok, message) => {
	if (ok) return;
	failures++;
	console.log('FAIL ' + message);
};

// 1. totals against the announcement
for (const [id, announced] of Object.entries(ANNOUNCED)) {
	const gold = (sandbox.MainParser.CityEntities[id].maxTier.value === 'gold'),
		maxLevel = (gold ? 500 : 200);
	let total = 0;

	for (let level = 0; level < maxLevel; level++) total += GreatBuildings.GetReworkCosts(id, level);

	check(gold ? total === announced : Math.round(total / 1000) * 1000 === announced, `total ${id}: ${total} instead of ${announced}`);
}
check(Object.keys(ANNOUNCED).length === Object.keys(GreatBuildings.ReworkSteps).length, 'every building with steps needs an announced total');

// 2. measured level costs and the inverse lookup
for (const [id, level, costs] of MEASURED_COSTS) {
	check(GreatBuildings.GetBruttoCosts(id, level) === costs, `costs ${id} level ${level}: ${GreatBuildings.GetBruttoCosts(id, level)} instead of ${costs}`);
	check(GreatBuildings.GetLevel(id, costs) === level + 1, `level of ${id} for ${costs} FP: ${GreatBuildings.GetLevel(id, costs)} instead of ${level + 1}`);
}
check(GreatBuildings.GetLevel('X_FutureEra_Landmark1', 131760) === undefined, 'costs off the curve must not resolve to a level');

// 3. measured patron rewards
for (const [id, level, rewards] of MEASURED_REWARDS) {
	const calculated = GreatBuildings.GetReworkRewards(id, level);

	rewards.forEach((reward, place) => {
		if (reward !== null) check(calculated[place] === reward, `reward ${id} level ${level} place ${place + 1}: ${calculated[place]} instead of ${reward}`);
	});
}

// 4. reward places, maximum level and the contribution boost
check(GreatBuildings.GetPlaceCount('X_FutureEra_Landmark1', 99) === 5, 'gold building up to level 100: five places');
check(GreatBuildings.GetPlaceCount('X_FutureEra_Landmark1', 100) === 7, 'gold building from level-up 100 → 101 on: seven places');
check(GreatBuildings.GetPlaceCount('X_BronzeAge_Landmark1', 150) === 5, 'copper only building: five places');
check(GreatBuildings.GetReworkCosts('X_BronzeAge_Landmark1', 199) === 4809 + 950 * 99, 'copper only building: last level-up 199 → 200');
check(GreatBuildings.GetReworkCosts('X_BronzeAge_Landmark1', 200) === undefined, 'copper only building: no level beyond 200');
check(GreatBuildings.GetPatronRewards('X_FutureEra_Landmark1', 185, 100).join() === '23004,11502,3834,958,192,32,4', 'contribution boost of 100% doubles the rewards');
check(GreatBuildings.GetPatronRewards('X_FutureEra_Landmark1', 185, [90, 0]).join() === '21854,5751,1917,479,96,16,2', 'boost per place, the last value covers the remaining places');
check(GreatBuildings.GetPatronRewards('X_FutureEra_Landmark1', 185, 0, 1000).join() === '87,44,15,4,2,0,0', 'rewards from given level costs');

// 5. a building whose real costs contradict the curve gets no calculated values any more
GreatBuildings.VerifyReworkCosts('X_IronAge_Landmark1', 104, 11063); // matches
check(GreatBuildings.GetReworkCosts('X_IronAge_Landmark1', 104) === 11063, 'matching costs keep the curve');
GreatBuildings.VerifyReworkCosts('X_IronAge_Landmark1', 104, 12000);
check(GreatBuildings.GetReworkCosts('X_IronAge_Landmark1', 104) === undefined, 'contradicting costs disable the curve');
check(GreatBuildings.GetReworkCosts('X_IronAge_Landmark1', 5) === 288, 'the metadata levels stay available');
check(GreatBuildings.GetPatronRewards('X_IronAge_Landmark1', 104) === undefined, 'no rewards without costs');

// 6. classic worlds are untouched
check(GreatBuildings.GetBruttoCosts('X_Classic', 3) === 130, 'classic costs from the metadata');
check(GreatBuildings.GetBruttoCosts('X_Classic', 20) === Math.ceil(510 * Math.pow(1.025, 11)), 'classic costs: +2.5% per level');
check(GreatBuildings.GetPlaceCount('X_Classic', 150) === 5, 'classic worlds: five places');
check(GreatBuildings.GetMaezen(1000, 90).join() === '1900,950,314,76,19', 'classic rewards: chain rounded to multiples of 5');

// 7. bonus curve between the metadata breakpoints: [breakpoints, measured values by level], at most 1 off
const MEASURED_BONUSES = [
	// Oracle of Delphi, supplies (copper only building)
	[{ 1: 6052, 101: 241222, 200: 295716 }, { 2: 8415, 5: 16646, 10: 32005, 22: 70666, 29: 92560, 50: 150819, 120: 260250, 200: 295716 }],
	// Observatory, fierce resistance (copper bonus of a gold building: maximum from level 200 on)
	[{ 1: 22, 101: 207, 201: 250, 301: 250, 401: 250, 500: 250 }, { 2: 24, 5: 31, 10: 43, 22: 73, 29: 90, 50: 136, 72: 173, 102: 208, 123: 224, 150: 238, 171: 244, 200: 250, 250: 250 }],
	// Observatory, guild goods of the adjacent eras (gold bonus)
	[{ 1: 0, 101: 203, 201: 687, 301: 979, 401: 1109, 500: 1160 }, { 50: 0, 100: 0, 102: 206, 123: 307, 150: 450, 171: 555, 200: 683, 202: 691, 250: 856, 600: 1160 }],
	// The Arc, contribution boost
	[{ 1: 19, 101: 85, 201: 100, 301: 100, 401: 100, 500: 100 }, { 5: 22, 10: 26, 20: 35, 31: 45, 77: 75, 98: 84, 103: 85, 125: 91, 150: 95, 175: 98, 199: 100 }],
];
for (const [breakpoints, measured] of MEASURED_BONUSES) {
	const bonus = { valuesMap: Object.fromEntries(Object.entries(breakpoints).map(([level, value]) => [level, { value: value }])) };

	for (const [level, value] of Object.entries(breakpoints)) {
		check(GreatBuildings.MetaBonusValue(bonus, Number(level)) === value, `bonus breakpoint level ${level}: ${GreatBuildings.MetaBonusValue(bonus, Number(level))} instead of ${value}`);
	}
	for (const [level, value] of Object.entries(measured)) {
		const calculated = GreatBuildings.MetaBonusValue(bonus, Number(level));
		check(Math.abs(calculated - value) <= 1, `bonus level ${level}: ${calculated} instead of ${value}`);
	}
}
check(GreatBuildings.MetaBonusValue({ valuesMap: { 1: { value: 5 } } }, 50) === 5, 'a single breakpoint stays a constant');

// 8. Shattered Horizon Siphon (live): level costs of other players and patron rewards by level
const SIPHON = 'X_StellarAgeDiscovery_Landmark1';
const SIPHON_COSTS = [
	[11, 49800], [15, 66400], [25, 107900], [26, 112050], [27, 116200], [28, 120350], [32, 136950], [34, 145250], [40, 170150], [41, 174300],
	[42, 178450], [57, 240700], [62, 261450], [66, 278050], [70, 294650], [81, 340300], [97, 406700], [108, 448200], [117, 485550], [146, 605900],
];
const SIPHON_REWARDS = [
	[10, [7978, 3989, 1330, 332, 66]], [38, [28284, 14142, 4714, 1179, 236]], [39, [38680, 19340, 6447, 1612, 322]],
	[69, [42306, 21153, 7051, 1763, 353]], [99, [60437, 30218, 10073, 2518, 504]],
	[100, [36772, 18386, 6129, 1532, 306]], [101, [36591, 18295, 6098, 1525, 305]],
	[146, [52894, 26447, 8816, 2204, 441, 73, 10]], [147, [53256, 26628, 8876, 2219, 444, 74, 11]],
	[199, [72095, 36047, 12016, 3004, 601, 100, 14]], [200, [48426, 24213, 8071, 2018, 404, 67, 10]], [201, [48305, 24152, 8051, 2013, 403, 67, 10]],
	[299, [71974, 35987, 11996, 2999, 600, 100, 14]], [300, [50551, 25276, 8425, 2106, 421, 70, 10]], [301, [50720, 25360, 8453, 2113, 423, 70, 10]],
	[399, [67289, 33644, 11215, 2804, 561, 93, 13]], [400, [48184, 24092, 8031, 2008, 402, 67, 10]], [401, [48305, 24152, 8051, 2013, 403, 67, 10]],
	[499, [60140, 30070, 10023, 2506, 501, 84, 12]], [500, [60260, 30130, 10043, 2511, 502, 84, 12]],
];
for (const [level, costs] of SIPHON_COSTS) {
	check(GreatBuildings.GetBruttoCosts(SIPHON, level) === costs, `siphon costs level ${level}: ${GreatBuildings.GetBruttoCosts(SIPHON, level)} instead of ${costs}`);
}
for (const [level, rewards] of SIPHON_REWARDS) {
	const calculated = GreatBuildings.GetReworkRewards(SIPHON, level);

	rewards.forEach((reward, place) => check(calculated[place] === reward, `siphon reward level ${level} place ${place + 1}: ${calculated[place]} instead of ${reward}`));
}
// the curve drops behind levels 100 and 200, the inverse lookup has to pass that
[99, 100, 101, 199, 200, 201, 350].forEach(level => {
	const costs = GreatBuildings.GetReworkCosts(SIPHON, level);
	check(GreatBuildings.GetLevel(SIPHON, costs) === level + 1, `siphon level for ${costs} FP: ${GreatBuildings.GetLevel(SIPHON, costs)} instead of ${level + 1}`);
});
check(GreatBuildings.GetReworkCosts(SIPHON, 100) === 421225 && GreatBuildings.GetReworkCosts(SIPHON, 200) === 832075, 'siphon: levels 100 and 200 cost one and a half steps extra');

console.log(failures === 0 ? 'all consistent' : failures + ' failure(s)');
process.exit(failures === 0 ? 0 : 1);
