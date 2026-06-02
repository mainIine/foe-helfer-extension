/*
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * Licensed under AGPL - see LICENSE.md for details.
 */

FoEproxy.addHandler('WorldChallengeService', 'all', (data, postData) => {
	if (data.requestMethod=='getOverview') {
		worldChallenge.currentPoints = data.responseData?.taskProgressPoints || 0;
	}
	if (data.requestMethod=='getConfig')
		worldChallenge.requiredPoints = data.responseData.requiredPointsPerTask;
	if (data.requestMethod=="collectTaskReward")
		worldChallenge.currentPoints = data.responseData?.taskProgressPoints || 0;
	mergerGame.checkTaskProgress(false);
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
	//count: undefined,
	//leaguepoints:0,
	currentPoints:0,
	requiredPoints:12,	
}