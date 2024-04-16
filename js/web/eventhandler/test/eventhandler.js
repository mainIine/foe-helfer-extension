describe(tt.getModuleSuiteName(), function() {
	beforeEach(function() {
		// todo: the spec below touches main's players dictionary, reset eventhandler and main modules
	});

	it('friend with no guild is listed without error', async function() {
		// reported in https://discord.com/channels/577475401144598539/950390739437760523/1189018590351982692
		EventHandler.CurrentPlayerGroup = 'Friends';
		EventHandler.ShowHideColumns = { "GuildName": true, "Era": false, "Points": false };
		EventHandler.MaxVisitCount = 7;
		const player = {
			'player_id': 1234567890,
			'name': 'Friend with no guild',
			'is_friend': true,
			'avatar': 'portrait_id_1',
		};
		MainParser.UpdatePlayerDictCore(player);
		PlayerDictFriendsUpdated = true;
		const olddb = EventHandler.db; // just to be sure, should be null without initialization via startup response / after reset
		EventHandler.db = {
			'Events': {
				where: (s) => ({
					equals: (pid) => ({
						toArray: () => []
					})
				})
			}
		};
		const div = $('<div><table id="moppelhelperTable"></table></div>');
		await $('body').append(div).promise();

		await EventHandler.CalcMoppelHelperTable();

		const trs = $('#moppelhelperTable tr');
		expect(trs.length).toBe(2);
		const tr1 = trs[1]; // first non-header row
		expect($(':nth-child(3) a', tr1)[0].text).toBe(player.name + ' ');
		expect($(':nth-child(4)', tr1)[0].innerText).toBe(''); // empty guild name (displayed)
		expect($(':nth-child(4)', tr1)[0].getAttribute('data-text')).toBe(''); // empty guild name (data for sorter / exporter)
		
		await div.remove().promise();
		EventHandler.db = olddb;
	});
});
