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
    if (data.responseData['events'] && Settings.GetSetting('ShowPlayersMotivation')) {
        EventHandler.HandleEvents(data.responseData['events']);
    }
});

let EventHandler = {
	EventIDs: {},

	db: null,

	CurrentPlayerGroup: null,

	FilterMoppelEvents: true,
	FilterTavernVisits: false,
	FilterAttacks: false,
	FilterPlunders: false,
	FilterTrades: false,
	FilterGBs: false,
	FilterOthers: false,

	AllInvalidDates: [],

	MaxVisitCount : 7,

	/**
	*
	* @returns {Promise<void>}
	*/
	checkForDB: async (playerID) => {
		const DBName = `FoeHelperDB_Events_${playerID}`;

		EventHandler.db = new Dexie(DBName);

		EventHandler.db.version(2).stores({
			Events: 'eventid,date,eventtype,interactiontype,playerid,entityid,isneighbor,isguildmember,isfriend'
		});
		EventHandler.db.version(1).stores({
			Events: 'eventid,date,eventtype,playerid,entityid,isneighbor,isguildmember,isfriend'
		});

		EventHandler.db.open();
	},


	/**
	 * @param data the data to add to the events database
	 * @returns {boolean} true if the data is new in the database
	 */
	insertIntoDB: async (data) => {
		const db = EventHandler.db;
		const eventsDB = db.Events;
		const id = data.eventid;
		return db.transaction('rw', eventsDB, async () => {
			let isNew = undefined === await eventsDB.get(id);
			await db.Events.put(data);
			return isNew;
		});
	},


	HandleEvents: (Events) => {
		const inserts = [];
		let InvalidDates = [];
		for (let i = 0; i < Events.length; i++) {
			let Event = Events[i];

			let ID = Event['id'];

			if (EventHandler.EventIDs[ID]) continue; // Event schon behandelt
			EventHandler.EventIDs[ID] = ID;

			let Date = EventHandler.ParseDate(Event['date']),
				EventType = Event['type'],
				InteractionType = Event['interaction_type'],
				EntityID = Event['entity_id'];

			if (!Date) { //Datum nicht parsebar => überspringen
				InvalidDates.push(Event['date']);
				EventHandler.AllInvalidDates.push(Event['date']);
				continue;
			}

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

			inserts.push(EventHandler.insertIntoDB({
				eventid: ID,
				date: Date,
				eventtype: EventType,
				interactiontype: InteractionType,
				playerid: PlayerID,
				entityid: EntityID,
				isneighbor: IsNeighbor,
				isguildmember: IsGuildMember,
				isfriend: IsFriend
			}));
		}

		Promise.all(inserts).then(insertIsNewArr => {
			let count = 0;
			for (let isNew of insertIsNewArr) {
				if (isNew) count++;
			}

			if (InvalidDates.length > 0)
			{

				HTML.ShowToastMsg({
					show: 'force',
					head: i18n('Boxes.Investment.DateParseError'),
					text: HTML.i18nReplacer(i18n('Boxes.Investment.DateParseErrorDesc'), { InvalidDate: InvalidDates[0]}),
					type: 'error',
					hideAfter: 6000,
				});
            }
			else if (count === 0) {

				HTML.ShowToastMsg({
					head: i18n('Boxes.Investment.AllUpToDate'),
					text: i18n('Boxes.Investment.AllUpToDateDesc'),
					type: 'info',
					hideAfter: 6000,
				});
			}
			else {
				HTML.ShowToastMsg({
					head: i18n('Boxes.Investment.PlayerFound'),
					text: HTML.i18nReplacer(
						count === 1 ? i18n('Boxes.Investment.PlayerFoundCount') : i18n('Boxes.Investment.PlayerFoundCounter'),
						{count: count}
					),
					type: 'success',
					hideAfter: 2600,
				});
			}
		});

		if ($('#moppelhelper').length > 0) {
			EventHandler.CalcMoppelHelperBody();
		}
	},


	ParseDate: (DateString) => {
		// Czech today contains &nbsp (0x00A0) => replace with blank
		let NBSPRegex = new RegExp(String.fromCharCode(160), "g");
		DateString = DateString.replace(NBSPRegex, " ");

		let OldLocale = moment.locale();
		moment.locale('en-US');

		const lang = ExtWorld.substr(0, 2);
		const matcher = EventHandler.DateShapes(lang);

		const capitalize = (s) => {
			if (typeof s !== 'string') return ''
			return s.charAt(0).toUpperCase() + s.slice(1)
		}

		// Fallback @Todo: Was könnte dann passieren?
		if(!matcher){
			return undefined;
		}

		for(let day in matcher)
		{
			if(!matcher.hasOwnProperty(day)) continue;

			let match = null;

			while ((match = matcher[day].exec(DateString)) !== null)
			{
				// this is necessary to avoid infinite loops with zero-width matches
				if (match.index === matcher[day].lastIndex)
				{
					matcher[day].lastIndex++;
				}

				let h = parseInt(match['groups']['h']);
				let m = parseInt(match['groups']['m']);

				// get the correct 24h time
				if(match['groups']['half'])
				{
					if(match['groups']['half'] === 'am' && h === 12)
					{
						h = 12;
					}
					else if(match['groups']['half'] === 'am' && h !== 12)
					{
						h += 12;
					}
				}

				// get reference day
				let refDate = null;

				switch(day){
					case 'today':
						refDate = moment();
						break;

					case 'yesterday':
						refDate = moment().subtract(1, 'day');
						break;

					default:
						refDate = moment().day(capitalize(day));
						if (refDate.isAfter(MainParser.getCurrentDate())) refDate = refDate.subtract(7 * 86400000); //Date is in the future => subtract 1 week
				}

				refDate.set({
					hour:   h,
					minute: m,
					second: 0
				})

				moment.locale(OldLocale);

				return moment( refDate, moment.defaultFormat).toDate();
			}
		}

		return undefined;
	},


	ShowMoppelHelper: () => {
		moment.locale(i18n('Local'));

		if ($('#moppelhelper').length === 0) {
			HTML.Box({
				id: 'moppelhelper',
				title: i18n('Boxes.MoppelHelper.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true
			});

			HTML.AddCssFile('eventhandler');

			$('#moppelhelper').on('click', '.filtermoppelevents', function () {
				EventHandler.FilterMoppelEvents = !EventHandler.FilterMoppelEvents;
				EventHandler.CalcMoppelHelperTable();
			});

			$('#moppelhelper').on('click', '.filtertavernvisits', function () {
				EventHandler.FilterTavernVisits = !EventHandler.FilterTavernVisits;
				EventHandler.CalcMoppelHelperTable();
			});

			$('#moppelhelper').on('click', '.filterattacks', function () {
				EventHandler.FilterAttacks = !EventHandler.FilterAttacks;
				EventHandler.CalcMoppelHelperTable();
			});

			$('#moppelhelper').on('click', '.filterplunders', function () {
				EventHandler.FilterPlunders = !EventHandler.FilterPlunders;
				EventHandler.CalcMoppelHelperTable();
			});

			$('#moppelhelper').on('click', '.filtertrades', function () {
				EventHandler.FilterTrades = !EventHandler.FilterTrades;
				EventHandler.CalcMoppelHelperTable();
			});

			$('#moppelhelper').on('click', '.filtergbs', function () {
				EventHandler.FilterGBs = !EventHandler.FilterGBs;
				EventHandler.CalcMoppelHelperTable();
			});

			$('#moppelhelper').on('click', '.filterothers', function () {
				EventHandler.FilterOthers = !EventHandler.FilterOthers;
				EventHandler.CalcMoppelHelperTable();
			});

			// Choose Neighbors/Guildmembers/Friends
			$('#moppelhelper').on('click', '.toggle-players', function () {
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
		let h = [];

		/* Calculation */
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

		/* Filters */
		h.push('<div class="text-center dark-bg header"><strong class="title">' + i18n('Boxes.MoppelHelper.HeaderWarning') + '</strong><br></div>');
		h.push('<div class="dark-bg"><div class="dropdown" style="float:right">');
        h.push('<input type="checkbox" class="dropdown-checkbox" id="event-checkbox-toggle"><label class="dropdown-label game-cursor" for="event-checkbox-toggle">' + i18n('Boxes.Infobox.Filter') + '</label><span class="arrow"></span>');
        h.push('<ul>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="auction" class="filtermoppelevents game-cursor" ' + (EventHandler.FilterMoppelEvents ? 'checked' : '') + '> ' + i18n('Boxes.MoppelHelper.MoppelEvents') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="gex" class="filtertavernvisits game-cursor" ' + (EventHandler.FilterTavernVisits ? 'checked' : '') + '> ' + i18n('Boxes.MoppelHelper.TavernVisits') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="gbg" class="filterattacks game-cursor" ' + (EventHandler.FilterAttacks ? 'checked' : '') + '> ' + i18n('Boxes.MoppelHelper.Attacks') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="trade" class="filterplunders game-cursor" ' + (EventHandler.FilterPlunders ? 'checked' : '') + '> ' + i18n('Boxes.MoppelHelper.Plunders') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="level" class="filtertrades game-cursor" ' + (EventHandler.FilterTrades ? 'checked' : '') + '> ' + i18n('Boxes.MoppelHelper.Trades') + '</label></li>');
        h.push('<li><label class="game-cursor"><input type="checkbox" data-type="msg" class="filtergbs game-cursor" ' + (EventHandler.FilterGBs ? 'checked' : '') + '> ' + i18n('Boxes.MoppelHelper.GBs') + '</label></li>');
        //h.push('<li><label class="game-cursor"><input type="checkbox" data-type="msg" class="filterothers game-cursor" ' + (EventHandler.FilterOthers ? 'checked' : '') + '> ' + i18n('Boxes.MoppelHelper.Others') + '</label></li>');
        h.push('</ul>');
		h.push('</div>');
		
		h.push('<div class="tabs"><ul class="horizontal">');

		if (PlayerDictNeighborsUpdated) {
			h.push('<li class="' + (EventHandler.CurrentPlayerGroup === 'Neighbors' ? 'active' : '') + '"><a class="toggle-players" data-value="Neighbors"><span>' + i18n('Boxes.MoppelHelper.Neighbors') + '</span></a></li>');
		}
		else {
			h.push('<li class="disabled" title="' + HTML.i18nTooltip(i18n('Boxes.MoppelHelper.NeighborsSocialTabTT')) + '"><a><span>' + i18n('Boxes.MoppelHelper.Neighbors') + '</span></a></li>');
		}

		if (PlayerDictGuildUpdated) {
			h.push('<li class="' + (EventHandler.CurrentPlayerGroup === 'Guild' ? 'active' : '') + '"><a class="toggle-players" data-value="Guild"><span>' + i18n('Boxes.MoppelHelper.GuildMembers') + '</span></a></li>');
		}
		else {
			h.push('<li class="disabled" title="' + HTML.i18nTooltip(i18n('Boxes.MoppelHelper.GuildSocialTabTT')) + '"><a><span>' + i18n('Boxes.MoppelHelper.GuildMembers') + '</span></a></li>');
		}

		if (PlayerDictFriendsUpdated) {
			h.push('<li class="' + (EventHandler.CurrentPlayerGroup === 'Friends' ? 'active' : '') + '"><a class="toggle-players" data-value="Friends"><span>' + i18n('Boxes.MoppelHelper.Friends') + '</span></a></li>');
		}
		else {
			h.push('<li class="disabled" title="' + HTML.i18nTooltip(i18n('Boxes.MoppelHelper.FriendsSocialTabTT')) + '"><a><span>' + i18n('Boxes.MoppelHelper.Friends') + '</span></a></li>');
		}

		h.push('</ul></div></div>');

		h.push('<table id="moppelhelperTable" class="foe-table sortable-table">');		
		h.push('</table>');	

		await $('#moppelhelperBody').html(h.join(''))
		EventHandler.CalcMoppelHelperTable();
		$('.sortable-table').tableSorter();
	},


	/**
	 * Updates the Motivation Helper table
	 *
	 * @returns {Promise<void>}
	 * @constructor
	 */
	CalcMoppelHelperTable: async () => {
		let h = [];

		let PlayerList = [];
		if (EventHandler.CurrentPlayerGroup === 'Friends') {
			PlayerList = Object.values(PlayerDict).filter(obj => (obj['IsFriend'] === true));
		}
		else if (EventHandler.CurrentPlayerGroup === 'Guild') {
			PlayerList = Object.values(PlayerDict).filter(obj => (obj['IsGuildMember'] === true));
		}
		else if (EventHandler.CurrentPlayerGroup === 'Neighbors') {
			PlayerList = Object.values(PlayerDict).filter(obj => (obj['IsNeighbor'] === true));
		}

		PlayerList = PlayerList.sort(function (a, b) {
			return b['Score'] - a['Score'];
		});

		h.push('<tbody class="moppelhelper">');
		h.push('<tr class="sorter-header">');
		h.push('<th class="is-number ascending" data-type="moppelhelper">' + i18n('Boxes.MoppelHelper.Rank') + '</th>');
		h.push('<th></th>');
		h.push('<th data-type="moppelhelper">' + i18n('Boxes.MoppelHelper.Name') + '</th>');
		h.push('<th class="is-number" data-type="moppelhelper">' + i18n('Boxes.MoppelHelper.Points') + '</th>');

		for (let i = 0; i < EventHandler.MaxVisitCount; i++)
		{
			h.push('<th class="is-number" data-type="moppelhelper">' + i18n('Boxes.MoppelHelper.Event') + (i + 1) + '</th>');
		}

		h.push('</tr>');

		for (let i = 0; i < PlayerList.length; i++)
		{
			let Player = PlayerList[i];

			if (Player['IsSelf']) continue;

			let Visits = await EventHandler.db['Events'].where('playerid').equals(Player['PlayerID']).toArray();
			Visits = Visits.filter(function (obj) {
				if (!obj['date']) return false; //Corrupt values in DB => skip

				let EventType = EventHandler.GetEventType(obj);
				if (EventType === 'MoppelEvent') {
					return EventHandler.FilterMoppelEvents;
				}
				else if (EventType === 'TavernVisit') {
					return EventHandler.FilterTavernVisits;
				}
				else if (EventType === 'Attack') {
					return EventHandler.FilterAttacks;
				}
				else if (EventType === 'Plunder') {
					return EventHandler.FilterPlunders;
				}
				else if (EventType === 'Trade') {
					return EventHandler.FilterTrades;
				}
				else if (EventType === 'GB') {
					return EventHandler.FilterGBs;
				}
				else {
					return EventHandler.FilterOthers;
				}
			});

			Visits = Visits.sort(function (a, b) {
				return b['date'] - a['date'];
			});

			h.push('<tr>');
			h.push('<td class="is-number" data-number="' + (i + 1) + '">#' + (i + 1) + '</td>');

			h.push(`<td><img style="max-width: 22px" src="${MainParser.InnoCDN + 'assets/shared/avatars/' + MainParser.PlayerPortraits[Player['Avatar']]}.jpg" alt="${Player['PlayerName']}"></td>`);

			h.push('<td style="white-space:nowrap" data-text="' + Player['PlayerName'].toLowerCase().replace(/[\W_ ]+/g, "") + '">' + Player['PlayerName'] + '</td>');

			h.push('<td class="is-number" data-number="' + Player['Score'] + '">' + HTML.Format(Player['Score']) + '</td>');

			for (let j = 0; j < EventHandler.MaxVisitCount; j++)
			{
				if (j < Visits.length)
				{
					let Seconds = (MainParser.getCurrentDateTime() - Visits[j]['date'].getTime()) / 1000;
					let Days = Seconds / 86400; //24*3600
					let StrongColor = (Days < 3 * (j + 1) ? HTML.GetColorGradient(Days, 0, 3 * (j + 1), '00ff00', 'ffff00') : HTML.GetColorGradient(Days, 3 * (j + 1), 7 * (j + 1), 'ffff00', 'ff0000'));
					let FormatedDays = HTML.i18nReplacer(i18n('Boxes.MoppelHelper.Days'), { 'days': Math.round(Days) });
					let EventType = EventHandler.GetEventType(Visits[j]);

					h.push('<td style="white-space:nowrap" class="events-image" data-number="' + Seconds + '"><span class="events-sprite-50 sm ' + EventType + '"></span><strong style="color:#' + StrongColor + '">' + FormatedDays + '</strong></td>');
				}
				else {
					h.push('<td class="is-date" data-number="999999999"><strong style="color:#ff0000">' + i18n('Boxes.MoppelHelper.Never') + '</strong></td>');
				}
			}
			h.push('</tr>');
		}

		h.push('</tbody>');

		await $('#moppelhelperTable').html(h.join(''))
    },


	/**
	 * Return the type of the event
	 *
	 * @param Event
	 * @returns {string}
	 * @constructor
	 */
	GetEventType: (Event) => {
		if (Event['eventtype'] === 'social_interaction' && (Event['interactiontype'] === 'motivate' || Event['interactiontype'] === 'polish' || Event['interactiontype'] === 'polivate_failed')) return 'MoppelEvent';
		if (Event['eventtype'] === 'friend_tavern_sat_down') return 'TavernVisit';
		if (Event['eventtype'] === 'battle') return 'Attack';
		if (Event['eventtype'] === 'social_interaction' && Event['interactiontype'] === 'plunder') return 'Plunder';
		if (Event['eventtype'] === 'trade_accepted') return 'Trade';
		if (Event['eventtype'] === 'great_building_built' || Event['eventtype'] === 'great_building_contribution') return 'GB';
		return 'Other';
    },


	/**
	 * Returns the shapes for regex function
	 *
	 * @param lng
	 * @returns {{yesterday: RegExp, sunday: RegExp, saturday: RegExp, tuesday: RegExp, today: RegExp, wednesday: RegExp, thursday: RegExp, friday: RegExp, monday: RegExp}|*}
	 * @constructor
	 */
	DateShapes: (lng)=> {
		const LngRegEx = {
			de: {
				today	    : /heute um (?<h>[012]?\d):(?<m>[0-5]?\d) Uhr/g,
				yesterday	: /gestern um (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday 	  	: /Montag um (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday  	: /Dienstag um (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday 	: /Mittwoch um (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday  	: /Donnerstag um (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday    	: /Freitag um (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday  	: /Samstag um (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday   	: /Sonntag um (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			en: {
				today     : /today at (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				yesterday : /yesterday at (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				monday    : /Monday at (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				tuesday   : /Tuesday at (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				wednesday : /Wednesday at (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				thursday  : /Thursday at (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				friday    : /Friday at (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				saturday  : /Saturday at (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				sunday    : /Sunday at (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
			},
			pt: {
				today     : /hoje às (?<h>[012]?\d):(?<m>[0-5]?\d)( horas)?/g,
				yesterday : /ontem pelas (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday    : /Segunda-feira pelas (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday   : /Terça-feira pelas (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday : /Quarta-feira pelas (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday  : /Quinta-feira pelas (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday    : /Sexta-feira pelas (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday  : /Sábado pelas (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday    : /Domingo pelas (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			br : {
				today     : /hoje às (?<h>[012]?\d):(?<m>[0-5]?\d)( horas)?/g,
				yesterday : /ontem às (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday    : /Segunda-feira às (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday   : /Terça-feira às (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday : /Quarta-feira às (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday  : /Quinta-feira às (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday    : /Sexta-feira às (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday  : /Sábado às (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday    : /Domingo às (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			fr: {
				today     : /aujourd\'hui à (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				yesterday : /hier à (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday    : /Lundi à (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday   : /Mardi à (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday : /Mercredi à (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday  : /Jeudi à (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday    : /Vendredi à (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday  : /Samedi à (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday    : /Dimanche à (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			it: {
				today     : /oggi alle (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				yesterday : /ieri alle (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday    : /Lunedì alle (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday   : /Martedì alle (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday : /Mercoledì alle (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday  : /Giovedì alle (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday    : /Venerdì alle (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday  : /Sabato alle (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday    : /Domenica alle (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			pl: {
				today     : /dzisiaj o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				yesterday : /wczoraj o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday    : /Poniedziałek o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday   : /Wtorek o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday : /Środa o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday  : /Czwartek o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday    : /Piątek o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday  : /Sobota o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday    : /Niedziela o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			ro: {
				today     : /astăzi la ora (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				yesterday : /ieri la (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday    : /Luni la (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday   : /Marți la (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday : /Miercuri la (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday  : /Joi la (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday    : /Vineri la (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday  : /Sâmbătă la (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday    : /Duminică la (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			nl: {
				today     : /vandaag om (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				yesterday : /gisteren om (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday    : /Maandag om (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday   : /Dinsdag om (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday : /Woensdag om (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday  : /Donderdag om (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday    : /Vrijdag om (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday  : /Zaterdag om (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday    : /Zondag om (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			gr: {
				today     : /σήμερα στις (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				yesterday : /χτες στις (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				monday    : /Δευτέρα στις (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				tuesday   : /Τρίτη στις (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				wednesday : /Τετάρτη στις (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				thursday  : /Πέμπτη στις (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				friday    : /Παρασκευή στις (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				saturday  : /Σάββατο στις (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
				sunday    : /Κυριακή στις (?<h>[012]?\d):(?<m>[0-5]?\d) (?<half>(a|p)m)/g,
			},
			hu: {
				today     : /ma (?<h>[012]?\d):(?<m>[0-5]?\d) órakor/g,
				yesterday : /tegnap, ekkor: (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday    : /Hétfő, ekkor: (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday   : /Kedd, ekkor: (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday : /Szerda, ekkor: (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday  : /Csütörtök, ekkor: (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday    : /Péntek, ekkor: (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday  : /Szombat, ekkor: (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday    : /Vasárnap, ekkor: (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			ru: {
				today     : /сегодня, в (?<h>[012]?\d):(?<m>[0-5]?\d) /g,
				yesterday : /вчера в (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday    : /Понедельник в (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday   : /Вторник в (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday : /Среда в (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday  : /Четверг в (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday    : /Пятница в (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday  : /Суббота в (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday    : /Воскресенье в (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			tr: {
				today: /bugün (?<h>[012]?\d):(?<m>[0-5]?\d) itibariyle/g,
				yesterday: /dün (?<h>[012]?\d):(?<m>[0-5]?\d) saatinde/g,
				monday: /Pazartesi, (?<h>[012]?\d):(?<m>[0-5]?\d) saatinde/g,
				tuesday: /Salı, (?<h>[012]?\d):(?<m>[0-5]?\d) saatinde/g,
				wednesday: /Çarşamba, (?<h>[012]?\d):(?<m>[0-5]?\d) saatinde/g,
				thursday: /Perşembe, (?<h>[012]?\d):(?<m>[0-5]?\d) saatinde/g,
				friday: /Cuma, (?<h>[012]?\d):(?<m>[0-5]?\d) saatinde/g,
				saturday: /Cumartesi, (?<h>[012]?\d):(?<m>[0-5]?\d) saatinde/g,
				sunday: /Pazar, (?<h>[012]?\d):(?<m>[0-5]?\d) saatinde/g,
			},
			es: {
				today: /hoy a la\/s (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				yesterday: /ayer a las (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday: /Lunes a las (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday: /Martes a las (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday: /Miércoles a las (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday: /Jueves a las (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday: /Viernes a las (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday: /Sábado a las (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday: /Domingo a las (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			cz: {
				today: /dnes v (?<h>[012]?\d):(?<m>[0-5]?\d) hod/g, //Old Format: /dnes v\xC2\xA0(?<h>[012]?\d):(?<m>[0-5]?\d)\xC2\xA0hod/g
				yesterday: /včera v (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday: /Pondělí v (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday: /Úterý v (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday: /Středa v (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday: /Čtvrtek v (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday: /Pátek v (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday: /Sobota v (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday: /Neděle v (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			sk: {
				today: /dnes o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				yesterday: /včera o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday: /Pondelok o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday: /Utorok o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday: /Streda o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday: /Štvrtok o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday: /Piatok o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday: /Sobota o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday: /Nedeľa o (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			se: {
				today: /idag kl (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				yesterday: /i går kl (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday: /Måndag kl (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday: /Tisdag kl (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday: /Onsdag kl (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday: /Torsdag kl (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday: /Fredag kl (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday: /Lördag kl (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday: /Söndag kl (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			th: {
				today: /วันนี้ เวลา (?<h>[012]?\d):(?<m>[0-5]?\d) น./g,
				yesterday: /เมื่อวาน ตอน (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				monday: /จันทร์ ตอน (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				tuesday: /อังคาร ตอน (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				wednesday: /พุธ ตอน (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				thursday: /พฤหัสบดี ตอน (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				friday: /ศุกร์ ตอน (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				saturday: /เสาร์ ตอน (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
				sunday: /อาทิตย์ ตอน (?<h>[012]?\d):(?<m>[0-5]?\d)/g,
			},
			dk: {
				today: /i dag kl\. (?<h>[012]?\d)\.(?<m>[0-5]?\d)/g,
				yesterday: /i går klokken (?<h>[012]?\d)\.(?<m>[0-5]?\d)/g,
				monday: /Mandag klokken (?<h>[012]?\d)\.(?<m>[0-5]?\d)/g,
				tuesday: /Tirsdag klokken (?<h>[012]?\d)\.(?<m>[0-5]?\d)/g,
				wednesday: /Onsdag klokken (?<h>[012]?\d)\.(?<m>[0-5]?\d)/g,
				thursday: /Torsdag klokken (?<h>[012]?\d)\.(?<m>[0-5]?\d)/g,
				friday: /Fredag klokken (?<h>[012]?\d)\.(?<m>[0-5]?\d)/g,
				saturday: /Lørdag klokken (?<h>[012]?\d)\.(?<m>[0-5]?\d)/g,
				sunday: /Søndag klokken (?<h>[012]?\d)\.(?<m>[0-5]?\d)/g,
			},
			fi: {
				today: /tänään klo (?<h>[012]?\d).(?<m>[0-5]?\d)/g,
				yesterday: /eilen kello (?<h>[012]?\d).(?<m>[0-5]?\d)/g,
				monday: /Maanantai kello (?<h>[012]?\d).(?<m>[0-5]?\d)/g,
				tuesday: /Tiistai kello (?<h>[012]?\d).(?<m>[0-5]?\d)/g,
				wednesday: /Keskiviikko kello (?<h>[012]?\d).(?<m>[0-5]?\d)/g,
				thursday: /Torstai kello (?<h>[012]?\d).(?<m>[0-5]?\d)/g,
				friday: /Perjantai kello (?<h>[012]?\d).(?<m>[0-5]?\d)/g,
				saturday: /Lauantai kello (?<h>[012]?\d).(?<m>[0-5]?\d)/g,
				sunday: /Sunnuntai kello (?<h>[012]?\d).(?<m>[0-5]?\d)/g,
			},
		};

		if(LngRegEx[lng]){
			return LngRegEx[lng];
		}

		// mapper
		switch(lng){
			case 'us' : return LngRegEx['en'];
			case 'xs' : return LngRegEx['en'];
			case 'zz' : return LngRegEx['en'];
			case 'ar' : return LngRegEx['es'];
			case 'mx' : return LngRegEx['es'];
			case 'no' : return LngRegEx['dk'];
		}
	}
};