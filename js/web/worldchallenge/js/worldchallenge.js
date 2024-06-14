/*
 * **************************************************************************************
 * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('WorldChallengeService', 'getOverview', (data, postData) => {
	
	worldChallenge.count = data.responseData?.taskProgressPoints;
	
});


FoEproxy.addHandler('LeagueService', 'getRank', (data, postData) => {
	if (worldChallenge.Leaguepoints == data.responseData.points) return;
	worldChallenge.Leaguepoints = data.responseData.points;
	if (["buyChest"].includes(postData[0].requestMethod)) return;
	if (!worldChallenge.count) return;
	worldChallenge.count++;
	if (worldChallenge.count >=20 && Settings.GetSetting('EnableSound')) helper.sounds.message.play();

});



let worldChallenge = {
	count: undefined,
	Leaguepoints:0,

}