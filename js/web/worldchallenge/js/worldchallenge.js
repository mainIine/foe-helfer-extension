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

FoEproxy.addHandler('WorldChallengeService', 'getOverview', (data, postData) => {
	
	worldChallenge.count = data.responseData?.taskProgressPoints || 0;
	
});

FoEproxy.addHandler('LeagueService', 'getRank', (data, postData) => {
	return;
	//deactivated as an ingame popup was implemented
	if (worldChallenge.leaguepoints == data.responseData.points) return;
	worldChallenge.leaguepoints = data.responseData.points;
	if (["buyChest"].includes(postData[0].requestMethod)) return;
	if (worldChallenge.count === undefined) return;
	worldChallenge.count++;
	if (worldChallenge.count >=20) helper.sounds.play("message");

});


let worldChallenge = {
	count: undefined,
	leaguepoints:0,

}