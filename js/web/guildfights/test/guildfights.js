describe(tt.getModuleSuiteName(), function() {
	beforeEach(async function() {
		await GuildFights._reset();
	});

	afterAll(async function() {
		await GuildFights._reset();
		ExtGuildID = 0;
	});

	it('own locked isolated province is shown in NextUp window', function() {
		// reported in https://discord.com/channels/577475401144598539/577482701930627072/1188257574429147216
		localStorage.setItem('LiveFightSettings', '{"showGuildColumn":1,"showAdjacentSectors":1,"showOwnSectors":1}');
		ExtGuildID = 123;
		GuildFights.MapData = {map: {}};
		GuildFights.MapData.map.provinces = [{
			"victoryPoints": 114,
			"victoryPointsBonus": 0,
			"ownerId": 12345,
			"lockedUntil": 1234567890,
			"conquestProgress": [],
			"totalBuildingSlots": 3,
			"usedBuildingSlots": 0,
			"gainAttritionChance": 100,
			"__class__": "GuildBattlegroundProvince",
			"id": 0,
			"title": "A1:M_foo",
			"name": "Mati Tudokk FOO",
			"owner": "ouR cLan",
			"neighbor": []
		}];
		GuildFights.MapData.battlegroundParticipants = [{
			"participantId": 12345,
			"clan": {
				"id": 123,
				"name": "ouR cLan",
				"membersNum": 69,
				"flag": "flag_1",
				"__class__": "BaseClan"
			},
			"colour": "own_guild_colour",
			"victoryPoints": 1,
			"signals": [],
			"__class__": "GuildBattlegroundParticipant"
		}];
		expect(GuildFights.MapData.battlegroundParticipants[0].participantId).toBe(GuildFights.MapData.map.provinces[0].ownerId);
		expect(GuildFights.MapData.battlegroundParticipants[0].clan.id).toBe(ExtGuildID);
		expect(GuildFights.MapData.battlegroundParticipants[0].clan.name).toBe(GuildFights.MapData.map.provinces[0].owner);
		GuildFights.Colors = [{"id":"own_guild_colour","province":"#e7e7e7","shadow":"#4b4a4a","base":"#5d5d5d","mainColour":"#bebdbc","highlight":"#dfdfdf","ownGuildColour":true,"__class__":"GuildBattlegroundColour"}];
		GuildFights.PrepareColors();

		const result = GuildFights.BuildNextUpTab();

		expect(result.length).toBeGreaterThan(7);
		expect(result).toContain('<td class="prov-name" title="Owner: ouR cLan"><span class="province-color" style="background-color:#bebdbc""></span> <b>A1:M_foo</b></td>');
	});
});
