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

	db : null,

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
    }
};