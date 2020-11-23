/*
 * **************************************************************************************
 *
 * Dateiname:                 eventhandler.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              20.11.20, 14:31 Uhr
 * zuletzt bearbeitet:       20.11.20, 14:31 Uhr
 *
 * Copyright © 2020
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('OtherPlayerService', 'getEventsPaginated', (data, postData) => {
    if (data.responseData['events']) {
        EventHandler.HandleEvents(data.responseData['events']);
    }
});

let EventHandler = {
	EventIDs: {},

	db: null,

	CurrentPlayerGroup: null,

	/**
	*
	* @returns {Promise<void>}
	*/
	checkForDB: async (playerID) => {
		const DBName = `FoeHelperDB_Events_${playerID}`;

		EventHandler.db = new Dexie(DBName);

		EventHandler.db.version(1).stores({
			Events: 'eventid,date,eventtype,playerid,entityid,isneighbor,isguildmember,isfriend'
		});

		EventHandler.db.open();
	},

	insertIntoDB: async (data) => {
		await EventHandler.db.Events.put(data);
	},

	HandleEvents: (Events) => {
		for (let i = 0; i < Events.length; i++) {
			let Event = Events[i];

			let ID = Event['id'];

			if (EventHandler.EventIDs[ID]) continue; // Event schon behandelt
			EventHandler.EventIDs[ID] = ID;

			let Date = EventHandler.ParseDate(Event['date']),
				EventType = Event['type'],
				EntityID = Event['entity_id'];

			let PlayerID = null,
				IsNeighbor = 0,
				IsGuildMember = 0,
				IsFriend = 0;

			if (Event['other_player']) {
				if (Event['other_player']['player_id']) PlayerID = Event['other_player']['player_id'];
				if (Event['other_player']['is_neighbor']) IsNeighbor = 1;
				if (Event['other_player']['is_guild_member']) IsGuildMember = 1;
				if (Event['other_player']['is_friend']) IsFriend = 1;
			}

			EventHandler.insertIntoDB({
				eventid: ID,
				date: Date,
				eventtype: EventType,
				playerid: PlayerID,
				entityid: EntityID,
				isneighbor: IsNeighbor,
				isguildmember: IsGuildMember,
				isfriend: IsFriend
			});
		}
	},


	ParseDate: (DateString) => {
		// Todo: Datums Parsefunktion einfügen
		return MainParser.getCurrentDate();
	},


	ShowMoppelHelper: () => {
		moment.locale(i18n('Local'));

		if ($('#moppelhelper').length === 0) {
			HTML.Box({
				id: 'moppelhelper',
				title: i18n('Boxes.MoppelHelper.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true
			});

			HTML.AddCssFile('eventhandler');

			// Choose Neighbors/Guildmembers/Friends
			$('#moppelhelper').on('click', '.btn-toggle-players', function () {
				EventHandler.CurrentPlayerGroup = $(this).data('value');
				
				EventHandler.CalcMoppelHelperBody();
			});
						
			EventHandler.CalcMoppelHelperBody();

		} else {
			HTML.CloseOpenBox('moppelhelper');
			EventHandler.CurrentPlayerGroup = null;
		}
	},


	CalcMoppelHelperBody: async () => {
		let MaxVisitCount = 7;

		let h = [];

		if (!EventHandler.CurrentPlayerGroup) {
			if (PlayerDictFriendsUpdated) {
				EventHandler.CurrentPlayerGroup = 'Friends';
			}
			else if (PlayerDictGuildUpdated) {
				EventHandler.CurrentPlayerGroup = 'Guild';
			}
			else if (PlayerDictNeighborsUpdated) {
				EventHandler.CurrentPlayerGroup = 'Neighbors';
			}
			else {
				EventHandler.CurrentPlayerGroup = null;
			}
		}

		let PlayerList = [];
		if(EventHandler.CurrentPlayerGroup === 'Friends') {
			PlayerList = Object.values(PlayerDict).filter(obj => (obj['IsFriend'] === true));
		}
		else if(EventHandler.CurrentPlayerGroup === 'Guild') {
			PlayerList = Object.values(PlayerDict).filter(obj => (obj['IsGuildMember'] === true));
		}
		else if(EventHandler.CurrentPlayerGroup === 'Neighbors') {
			PlayerList = Object.values(PlayerDict).filter(obj => (obj['IsNeighbor'] === true));
		}

		PlayerList = PlayerList.sort(function (a, b) {
			return b['Score'] - a['Score'];
		});

		h.push('<div class="dark-bg">');
		if(PlayerDictNeighborsUpdated) h.push('<button class="btn btn-default btn-toggle-players ' + (EventHandler.CurrentPlayerGroup === 'Neighbors' ? 'btn-default-active' : '') + '" data-value="Neighbors">' + i18n('Boxes.MoppelHelper.Neighbors') + '</button>');
		if(PlayerDictGuildUpdated) h.push('<button class="btn btn-default btn-toggle-players ' + (EventHandler.CurrentPlayerGroup === 'Guild' ? 'btn-default-active' : '') + '" data-value="Guild">' + i18n('Boxes.MoppelHelper.GuildMembers') + '</button>');
		if(PlayerDictFriendsUpdated) h.push('<button class="btn btn-default btn-toggle-players ' + (EventHandler.CurrentPlayerGroup === 'Friends' ? 'btn-default-active' : '') + '" data-value="Friends">' + i18n('Boxes.MoppelHelper.Friends') + '</button>');
		h.push('</div>');

		h.push('<table class="foe-table"');

		h.push('<thead>');
		h.push('<th>' + i18n('Boxes.MoppelHelper.Rank') + '</th>');
		h.push('<th>' + i18n('Boxes.MoppelHelper.Name') + '</th>');
		h.push('<th>' + i18n('Boxes.MoppelHelper.Points') + '</th>');
		for (let i = 0; i < MaxVisitCount; i++) {
			h.push('<th>' + i18n('Boxes.MoppelHelper.Visit') + (i+1) + '</th>');
		}
		h.push('</thead>');

		for (let i = 0; i < PlayerList.length; i++) {
			let Player = PlayerList[i];

			if (Player['IsSelf']) continue;

			let Visits = await EventHandler.db['Events'].where('playerid').equals(Player['PlayerID']).toArray();
			Visits = Visits.sort(function (a, b) {
				return b['date'] - a['date'];
			});

			h.push('<tr>');
			h.push('<td>#' + (i + 1) + '</td>');
			h.push('<td>' + Player['PlayerName'] + '</td>');
			h.push('<td>' + HTML.Format(Player['Score']) + '</td>');
			for (let j = 0; j < MaxVisitCount; j++) {
				if (j < Visits.length) {
					h.push('<td>' + moment(Visits[j]['date']).fromNow() + '</td>');
				}
				else {
					h.push('<td></td>');
                }
            }
			h.push('</tr>');
        }

		h.push('</table>');	

		$('#moppelhelperBody').html(h.join(''));
	},
};