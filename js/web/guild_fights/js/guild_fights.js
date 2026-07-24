/*
 *
 *  * **************************************************************************************
 *  * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 *  * You may use, distribute and modify this code under the
 *  * terms of the AGPL license.
 *  *
 *  * See file LICENSE.md or go to
 *  * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 *  * for full license details.
 *  *
 *  * **************************************************************************************
 *
 */

FoEproxy.addMetaHandler('guild_battleground_maps', (xhr, postData) => {
	Guild_fights.ProvinceNames = JSON.parse(xhr.responseText);
});

FoEproxy.addMetaHandler('battleground_colour', (xhr, postData) => {
	Guild_fights.Colors = JSON.parse(xhr.responseText);
	Guild_fights.PrepareColors();
});

FoEproxy.addHandler('GuildBattlegroundService', 'getPlayerLeaderboard', (data, postData) => {
	Guild_fights.HandlePlayerLeaderboard(data.responseData);
});


FoEproxy.addWsHandler('GuildBattlegroundSignalsService', 'updateSignal', data => {
	let d = data.responseData;
	if (!d || !Guild_fights.MapData) return;

	let own = Guild_fights.MapData.battlegroundParticipants.find(p => p.clan.id === ExtGuildID);
	if (!own) return;

	if (d.signal) {
		// a province holds at most one signal (setting "ignore" replaces "focus" without
		// an extra removal frame) and the focus target exists only once guild wide
		own.signals = (own.signals || []).filter(s =>
			(s.provinceId || 0) !== (d.provinceId || 0) &&
			(d.signal !== 'focus' || s.signal !== 'focus')
		);
		own.signals.push({ provinceId: d.provinceId || 0, signal: d.signal });
	}
	else {
		// removal frames carry the province id only (e.g. after the sector got conquered)
		own.signals = (own.signals || []).filter(s => (s.provinceId || 0) !== (d.provinceId || 0));
	}

	if ($('#LiveGildFighting').length > 0) {
		Guild_fights.BuildFightContent();
	}

	// a focus move clears the marker on another sector too, so repaint the whole overlay
	if ($('#ProvinceMap').length > 0 && ProvinceMap.Overlay instanceof HTMLCanvasElement) {
		ProvinceMap.DrawOverlay();
	}
});

// building placements arrive via websocket only, getProvinces does not resend the slot count
FoEproxy.addWsHandler('GuildBattlegroundBuildingService', 'getBuildings', data => {
	Guild_fights.HandleBuildingsUpdate(data.responseData);
});

// the own build menu delivers the same data via ajax
FoEproxy.addHandler('GuildBattlegroundBuildingService', 'getBuildings', (data, postData) => {
	Guild_fights.HandleBuildingsUpdate(data.responseData);
});

// guild victory points tick in periodically via websocket
FoEproxy.addWsHandler('GuildBattlegroundService', 'getParticipantVictoryPoints', data => {
	let vp = data.responseData?.victoryPoints;
	if (!vp || !Guild_fights.MapData) return;

	for (let participant of Guild_fights.MapData.battlegroundParticipants) {
		if (vp[participant.participantId] !== undefined) {
			participant.victoryPoints = vp[participant.participantId];
		}
	}

	// re-render only the ranking tab, selections in the other tabs stay untouched
	if ($('#gbgranking').length > 0) {
		$('#gbgranking').html(GuildRanking.BuildTab().join(''));
	}
});

FoEproxy.addHandler('GuildBattlegroundStateService', 'getState', (data, postData) => {
	Guild_fights.GlobalRankingTimeout = setTimeout(()=>{
		if (data.responseData['stateId'] !== 'participating')	{
			Guild_fights.CurrentGBGRound = parseInt(data.responseData['startsAt']) - 259200;

			if (Guild_fights.curDateFilter === null || Guild_fights.curDateEndFilter === null) {
				Guild_fights.curDateFilter = moment.unix(Guild_fights.CurrentGBGRound).subtract(11, 'd').format('YYYYMMDD');
				Guild_fights.curDateEndFilter = moment.unix(Guild_fights.CurrentGBGRound).format('YYYYMMDD');
			}

			Guild_fights.HandlePlayerLeaderboard(data.responseData['playerLeaderboardEntries']);
		}
	},500)
});

FoEproxy.addHandler('RankingService', 'searchRanking', (data, postData) => {
	clearTimeout(Guild_fights.GlobalRankingTimeout);
});

FoEproxy.addHandler('GuildBattlegroundService', 'getBattleground', (data, postData) => {
	Guild_fights.init();
	Guild_fights.CurrentGBGRound = data.responseData.endsAt;

	if (Guild_fights.curDateFilter === null || Guild_fights.curDateEndFilter === null) {
		Guild_fights.curDateFilter = moment.unix(Guild_fights.CurrentGBGRound).subtract(11, 'd').format('YYYYMMDD');
		Guild_fights.curDateEndFilter = MainParser.getCurrentDateTime();
	}

	Guild_fights.MapData = data.responseData;

	$('#gildFight-Btn').removeClass('hud-btn-red');
	$('#selectorCalc-Btn-closed').remove();

	if ($('#ProvinceMap').length > 0) {
		ProvinceMap.RefreshSector();
	}

	// update box when open
	if ($('#LiveGildFighting').length > 0) {
		Guild_fights.BuildFightContent();
	}
});
FoEproxy.addHandler('TimerService', 'getTimers', (data, postData) => {
	if (Guild_fights.serverOffset !== null) return;
	data.responseData.filter(t=>t.type=="battlegroundsAttrition").forEach(t=>{
		if (!t.time) return;
		serverMidnight = moment.unix(t.time);

		Guild_fights.serverOffset = serverMidnight.format("HH")*60
									+ serverMidnight.format("mm")*1;
	})
});

let Guild_fights = {

	Alerts: [],
	GlobalRankingTimeout:null,
	PrevAction: null,
	PrevActionTimestamp: null,
	NewAction: null,
	NewActionTimestamp: null,
	MapData: null,
	PlayersPortraits: null,
	Colors: null,
	SortedColors: null,
	ProvinceNames: null,
	InjectionLoaded: false,
	PlayerBoxContent: [],
	CurrentGBGRound: null,
	GBGRound: null,
	GBGAllRounds: null,
	GBGHistoryView: false,
	LogDatePicker: null,
	curDateFilter: null,
	curDateEndFilter: null,
	curDetailViewFilter: null,
	PlayerBoxSettings: {
		showRoundSelector: 1,
		showLogButton: 1,
		showProgressFilter: 1,
		showOnlyActivePlayers: 0,
	},
	showGuildColumn: 0,
	showAdjacentSectors: 1,
	showOwnSectors: 0,
	showVPColumn: 0,
	showAttritionColumn: 1,
	showFocusTarget: 1,
	// known placed buildings per own province, collected from getBuildings responses (ajax + websocket)
	ProvinceBuildings: JSON.parse(localStorage.getItem('GuildFights.ProvinceBuildings') || '{}'),
	serverOffset: JSON.parse(localStorage.getItem("GuildFights.serverOffset")||"null"),
	// seconds between the sector alert and the actual unlock (#3511)
	alertLeadTime: JSON.parse(localStorage.getItem("LiveFightSettings"))?.alertLeadTime || 30,
	discordWebhook: {
		url: JSON.parse(localStorage.getItem("LiveFightSettings"))?.discordWebhook || "",
		template: JSON.parse(localStorage.getItem("LiveFightSettings"))?.discordWebhookTemplate || "",
		bulkTemplate: JSON.parse(localStorage.getItem("LiveFightSettings"))?.discordWebhookTemplateBulk || "",
	},
	discordCache: null,

	Tabs: [],
	TabsContent: [],


	/**
	 * Initializes and verifies the existence of a local IndexedDB database specific to the given player ID.
	 *
	 * Creates a new Dexie database instance named with the pattern `FoeHelperDB_GuildFights_<playerID>`.
	 * Defines the database schema with two object stores:
	 * - `snapshots`: Indexed by a composite key of `player_id+gbground+time`,
	 *   and secondary indexes on `gbground+player_id`, `date+player_id`, and `gbground`.
	 * - `history`: Indexed by a unique `gbground` key.
	 *
	 * Opens a connection to the database upon creation.
	 *
	 * @param {string} playerID - The unique identifier of the player for whom the database is being checked or initialized.
	 * @returns {Promise<void>} Resolves when the database has been successfully initialized and opened.
	 */
	checkForDB: async (playerID) => {

		const DBName = `FoeHelperDB_GuildFights_${playerID}`;

		Guild_fights.db = new Dexie(DBName);

		Guild_fights.db.version(1).stores({
			snapshots: '&[player_id+gbground+time],[gbground+player_id], [date+player_id], gbground',
			history: '&gbground'
		});

		Guild_fights.db.open();
	},


	/**
	 * Initializes the `GuildFights` module by invoking the `GetAlerts` method and setting up WebSocket handlers.
	 *
	 * The WebSocket handler listens for messages related to the `GuildBattlegroundService` and processes
	 * incoming data. It updates the `MapData` with province information, refreshes the live fighting table
	 * if it exists in the DOM, and refreshes the province minimap if it is present.
	 *
	 * Behavior:
	 * - Calls `GuildFights.GetAlerts()` to initialize alert data.
	 * - Checks if the WebSocket injection has already been loaded and, if not, sets up a handler for
	 *   the "GuildBattlegroundService" to process received data.
	 * - Updates the `GuildFights.MapData.map.provinces` with the data from the WebSocket response.
	 * - Updates the DOM components:
	 *   - Refreshes the live fighting table if the `#LiveGildFighting` element exists in the DOM.
	 *   - Refreshes the province minimap if the `#ProvinceMap` element exists in the DOM.
	 */
	init: () => {
		Guild_fights.GetAlerts();

		if (Guild_fights.InjectionLoaded === false) {
			FoEproxy.addWsHandler('GuildBattlegroundService', 'all', data => {
				if (!data['responseData']?.[0]) return
				if (!Guild_fights.MapData) return;

				// getProvinces updates arrive as an array of full province snapshots
				for (let provinceData of data.responseData) {
					if (!provinceData || provinceData['__class__'] !== 'GuildBattlegroundProvince') continue;

					let Pid = provinceData.id || 0,
						province = Guild_fights.MapData.map.provinces[Pid],
						ownerChanged = provinceData.ownerId !== undefined && provinceData.ownerId !== province.ownerId;

					for (let x in provinceData) {
						if (!provinceData.hasOwnProperty(x) || x === "id") continue;
						province[x] = provinceData[x];
					}

					// the snapshot omits gainAttritionChance when it no longer applies
					if (provinceData.gainAttritionChance === undefined) {
						delete province.gainAttritionChance;
					}

					// keep the enriched plain text owner name in sync with the ownerId
					let participant = Guild_fights.MapData.battlegroundParticipants.find(p => p.participantId === province.ownerId);
					if (participant) {
						province.owner = participant.clan.name;
					}

					// buildings do not survive an ownership change
					if (ownerChanged) {
						Guild_fights.StoreProvinceBuildings(Pid, null);
					}

					// Update Tables
					if ($('#LiveGildFighting').length > 0) {
						if (ownerChanged) {
							// a conquered sector switches tabs, rebuild the whole box
							Guild_fights.BuildFightContent();
						}
						else {
							Guild_fights.RefreshTable(provinceData);
							Guild_fights.UpdateProvinceCells(Pid);
						}
					}

					// Update Minimap
					if($('#ProvinceMap').length > 0) {
						ProvinceMap.RefreshSector(provinceData);
					}
				}
			});
			Guild_fights.InjectionLoaded = true;
		}
	},


	/**
	 * Handles the player leaderboard for guild fights by collecting player data,
	 * calculating totals, updating the database, and refreshing the user interface.
	 *
	 * This function processes the data of players participating in a guild battle,
	 * computes cumulative statistics (such as negotiations won, battles won, and attrition),
	 * and updates both the local storage and the database with this information. It also
	 * ensures that the user interface reflects the latest participant data.
	 *
	 * @async
	 * @function
	 * @param {Object} d - An object containing player data for the guild battle. Keys are
	 *                     player ranks (zero-based indices), and values are objects that
	 *                     include player details and performance statistics.
	 * @property {Object} d[i].player - Details of the individual player.
	 * @property {number} d[i].player.player_id - Unique identifier of the player.
	 * @property {string} d[i].player.name - Name of the player.
	 * @property {string} d[i].player.avatar - URL or identifier for the player's avatar.
	 * @property {number} [d[i].battlesWon=0] - Number of battles won by the player (defaults to 0 if missing).
	 * @property {number} [d[i].negotiationsWon=0] - Number of negotiations won by the player (defaults to 0 if missing).
	 * @property {number} [d[i].attrition=0] - Attrition value for the player (defaults to 0 if missing).
	 *
	 * @throws {Error} Throws an error if database updating fails or if an unexpected issue occurs during execution.
	 */
	HandlePlayerLeaderboard: async (d) => {
		// immer zwei vorhalten, für Referenz Daten (LiveUpdate)
		if (localStorage.getItem('GuildFights.NewAction') !== null) {
			Guild_fights.PrevAction = JSON.parse(localStorage.getItem('GuildFights.NewAction'));
			Guild_fights.PrevActionTimestamp = parseInt(localStorage.getItem('GuildFights.NewActionTimestamp'));
		}
		else if (Guild_fights.NewAction !== null) {
			Guild_fights.PrevAction = Guild_fights.NewAction;
			Guild_fights.PrevActionTimestamp = Guild_fights.NewActionTimestamp;
		}

		let players = [];
		let sumNegotiations = 0;
		let sumBattles = 0;
		let sumAttrition = 0;

		for (let i in d) {

			if (!d.hasOwnProperty(i)) break;

			sumNegotiations += d[i]['negotiationsWon'] || 0;
			sumBattles += d[i]['battlesWon'] || 0;
			sumAttrition += d[i]['attrition'] || 0;

			players.push({
				gbground: Guild_fights.CurrentGBGRound,
				rank: i * 1 + 1,
				player_id: d[i]['player']['player_id'],
				name: d[i]['player']['name'],
				avatar: d[i]['player']['avatar'],
				battlesWon: d[i]['battlesWon'] || 0,
				negotiationsWon: d[i]['negotiationsWon'] || 0,
				attrition: d[i]['attrition'] || 0
			});
		}

		await Guild_fights.UpdateDB('history', { participation: players, sumNegotiations: sumNegotiations, sumBattles: sumBattles });

		Guild_fights.GBGHistoryView = false;
		Guild_fights.NewAction = players;
		localStorage.setItem('GuildFights.NewAction', JSON.stringify(Guild_fights.NewAction));

		Guild_fights.NewActionTimestamp = moment().unix();
		localStorage.setItem('GuildFights.NewActionTimestamp', Guild_fights.NewActionTimestamp);

		if ($('#GildPlayers').length > 0) {
			Guild_fights.BuildPlayerContent(Guild_fights.CurrentGBGRound);
		}
		else {
			Guild_fights.ShowPlayerBox();
		}
	},


	/**
	 * Updates the database with the specified content type and data.
	 *
	 * The method performs different operations depending on the `content` type:
	 * - If the `content` type is "history", it updates the history data for the current GBG round.
	 * - If the `content` type is "player", it updates or adds player snapshot data for the current GBG round.
	 *
	 * @async
	 * @function UpdateDB
	 * @param {string} content - The type of content to update ("history" or "player").
	 * @param {Object} data - The data to be updated in the database.
	 * @param {number} [data.sumNegotiations] - Total number of negotiations for history content.
	 * @param {number} [data.sumBattles] - Total number of battles for history content.
	 * @param {number} [data.participation] - Participation level for history content.
	 * @param {string} [data.player_id] - The ID of the player for player content.
	 * @param {string} [data.name] - The name of the player for player content.
	 * @param {number} [data.time] - The timestamp of the update for player content.
	 * @param {number} [data.battles] - Total battles conducted by the player, used if no snapshot exists.
	 * @param {number} [data.negotiations] - Total negotiations conducted by the player, used if no snapshot exists.
	 * @param {number} [data.attrition] - Total attrition level of the player, used if no snapshot exists.
	 * @param {number} [data.diffbat] - Difference in battles since the last snapshot, used if a snapshot exists.
	 * @param {number} [data.diffneg] - Difference in negotiations since the last snapshot, used if a snapshot exists.
	 * @param {number} [data.diffattr] - Difference in attrition level since the last snapshot, used if a snapshot exists.
	 */
	UpdateDB: async (content, data) => {

		if (content === 'history') {
			await Guild_fights.db.history.put({
					gbground: Guild_fights.CurrentGBGRound,
					sumNegotiations: data.sumNegotiations, 
					sumBattles: data.sumBattles, 
					participation: data.participation 
				});
		}

		if (content === 'player') {
			let battles = 0,
				negotiations = 0,
				attrition = 0;

			let CurrentSnapshot = await Guild_fights.db.snapshots
				.where({
					gbground: Guild_fights.CurrentGBGRound,
					player_id: data.player_id
				})
				.first();

			if (CurrentSnapshot === undefined) {
				battles = data.battles;
				negotiations = data.negotiations;
				attrition = data.attrition;
			}
			else {
				battles = data.diffbat;
				negotiations = data.diffneg;
				attrition = data.diffattr;
			}

			await Guild_fights.db.snapshots.add({
				gbground: Guild_fights.CurrentGBGRound,
				player_id: data.player_id,
				name: data.name,
				date: parseInt(moment.unix(data.time).format("YYYYMMDD")),
				time: data.time,
				battles: battles,
				negotiations: negotiations,
				attrition: attrition
			});
		}

	},


	/**
	 * Asynchronously sets up the navigation controls and content for Guild Battles Ground (GBG) rounds in a player's box.
	 * This function retrieves GBG round data, updates player preferences, and builds relevant UI components.
	 *
	 * @async
	 * @function
	 * @param {number} gbground - The specific GBG round to display. If not provided, the latest available round is used.
	 *
	 * @description
	 * - Fetches and sets player preferences for showing the round selector, log button, and progress filter.
	 * - Retrieves all available GBG rounds from the database if not already available.
	 * - Determines the navigation and content display based on the selected or latest GBG round.
	 * - Creates UI components including round switching buttons, a dropdown selector for rounds, and additional buttons for filtering logs and progress.
	 *
	 * @remarks
	 * - If no `gbground` is provided, the most recent round is selected by default.
	 * - Includes event listeners for interactive UI components such as buttons and the round selector dropdown.
	 * - Depends on global variables like `GuildFights`, assumes this object is pre-defined and initialized.
	 *
	 * @throws {Error} Throws if unexpected data issues occur or required global dependencies are unavailable.
	 */
	SetBoxNavigation: async (gbground) => {
		let h = [];
		let i = 0;
		let PlayerBoxSettings = JSON.parse(localStorage.getItem('GuildFightsPlayerBoxSettings')) || '{}';

		Guild_fights.PlayerBoxSettings.showRoundSelector = (PlayerBoxSettings.showRoundSelector !== undefined) ? PlayerBoxSettings.showRoundSelector : Guild_fights.PlayerBoxSettings.showRoundSelector;
		Guild_fights.PlayerBoxSettings.showLogButton = (PlayerBoxSettings.showLogButton !== undefined) ? PlayerBoxSettings.showLogButton : Guild_fights.PlayerBoxSettings.showLogButton;
		Guild_fights.PlayerBoxSettings.showProgressFilter = (PlayerBoxSettings.showProgressFilter !== undefined) ? PlayerBoxSettings.showProgressFilter : Guild_fights.PlayerBoxSettings.showProgressFilter;

		if (Guild_fights.GBGAllRounds === undefined || Guild_fights.GBGAllRounds === null) {
			// get all available GBG entires
			const gbgRounds = await Guild_fights.db.history.where('gbground').above(0).keys();
			gbgRounds.sort(function (a, b) { return b - a });
			Guild_fights.GBGAllRounds = gbgRounds;

		}

		//set latest GBG round to show if available and no specific GBG round is set
		if (!gbground && Guild_fights.GBGAllRounds && Guild_fights.GBGAllRounds.length) {
			gbground = Guild_fights.GBGAllRounds[i];
		}

		if (gbground && Guild_fights.GBGAllRounds && Guild_fights.GBGAllRounds.length) {
			let index = Guild_fights.GBGAllRounds.indexOf(gbground);
			let previousweek = Guild_fights.GBGAllRounds[index + 1] || null;
			let nextweek = Guild_fights.GBGAllRounds[index - 1] || null;

			h.push(`<div id="gbg_roundswitch" class="roundswitch dark-bg">`);

			if (Guild_fights.PlayerBoxSettings.showRoundSelector) {
				h.push(`${i18n('Boxes.GuildMemberStat.GBFRound')} <button class="btn btn-set-week" data-week="${previousweek}"${previousweek === null ? ' disabled' : ''}>&lt;</button> `);
				h.push(`<select id="gbg-select-gbground">`);

				Guild_fights.GBGAllRounds.forEach(week => {
					h.push(`<option value="${week}"${gbground === week ? ' selected="selected"' : ''}>` + moment.unix(week).subtract(11, 'd').format(i18n('Date')) + ` - ` + moment.unix(week).format(i18n('Date')) + `</option>`);
				});

				h.push(`</select>`);
				h.push(`<button class="btn btn-set-week last" data-week="${nextweek}"${nextweek === null ? ' disabled' : ''}>&gt;</button>`);
			}

			if (gbground === Guild_fights.CurrentGBGRound) {
				h.push(`<div id="gbgLogFilter">`);
				if (Guild_fights.PlayerBoxSettings.showProgressFilter === 1) {
					h.push(`<button id="gbg_filterProgressList" title="${HTML.i18nTooltip(i18n('Boxes.GuildFights.ProgressFilterDesc'))}" class="btn" disabled>&#8593;</button>`);
				}

				if (Guild_fights.PlayerBoxSettings.showLogButton === 1)
				{
					h.push(`<button id="gbg_showLog" class="btn">${i18n('Boxes.GuildFights.SnapshotLog')}</button>`);
				}
				h.push(`</div>`);
			}
			h.push(`</div>`);
		}

		h.push(`<div id="gbgContentWrapper"></div>`);

		$('#GildPlayersBody').html(h.join('')).promise().done(function () {

			$('.btn-set-week').off().on('click', function () {

				Guild_fights.GBGHistoryView = true;
				let week = $(this).data('week');

				if (!Guild_fights.GBGAllRounds.includes(week))
				{
					return;
				};

				Guild_fights.BuildPlayerContent(week);
			});

			$('#gbg-select-gbground').off().on('change', function () {

				Guild_fights.GBGHistoryView = true;
				let week = parseInt($(this).val());

				if (!Guild_fights.GBGAllRounds.includes(week) || week === Guild_fights.CurrentGBGRound)
				{
					return;
				};

				Guild_fights.BuildPlayerContent(week);
			});

			$('button#gbg_showLog').off('click').on('click', function () {
				Guild_fights.curDetailViewFilter = { content: 'filter', gbground: Guild_fights.CurrentGBGRound };
				Guild_fights.ShowDetailViewBox(Guild_fights.curDetailViewFilter)
			});

			$('button#gbg_filterProgressList').on('click', function () {
				Guild_fights.ToggleProgressList('gbg_filterProgressList');
			});
		});

	},


	/**
	 * Toggles the visibility of a list of players in a table based on a button's current state.
	 * When toggling to "hide", only players marked as "new" are displayed, while others are hidden.
	 * When toggling to "show", all players are displayed.
	 *
	 * The method also updates the `Guild_fights.PlayerBoxSettings.showOnlyActivePlayers` to store
	 * the visibility state and saves the updated settings in localStorage.
	 *
	 * Updates the styles and classes of the table and the button accordingly.
	 *
	 * @param {string} id - The ID of the button that triggers this functionality.
	 */
	ToggleProgressList: (id) => {

		let elem = $('#GildPlayersTable > tbody');
		let nelem = elem.find('tr.new');
		let act = $('#' + id).hasClass('filtered') ? 'show' : 'hide';

		if (act === 'hide') {
			if (nelem.length !== 0) {
				let oelem = elem.find('tr:not(.new)');
				Guild_fights.PlayerBoxSettings.showOnlyActivePlayers = 1;
				localStorage.setItem('GuildFightsPlayerBoxSettings', JSON.stringify(Guild_fights.PlayerBoxSettings));
				$('#GildPlayersTable > thead .text-warning').hide();
				oelem.hide();
				$('#' + id).addClass('filtered btn-green');
			}
		}

		else if (act === 'show') {
			elem.find('tr').show();
			Guild_fights.PlayerBoxSettings.showOnlyActivePlayers = 0;
			localStorage.setItem('GuildFightsPlayerBoxSettings', JSON.stringify(Guild_fights.PlayerBoxSettings));
			$('#GildPlayersTable > thead .text-warning').show();
			$('#' + id).removeClass('filtered btn-green');
		}
	},


	/**
	 * Registers a tab handle for the box navigation
	 *
	 * @param {string} id Tab id, also used as the anchor target
	 */
	SetTabs: (id) => {
		Guild_fights.Tabs.push('<li class="' + id + ' game-cursor"><a href="#' + id + '" class="game-cursor"><span>&nbsp;</span></a></li>');
	},


	/**
	 * Returns the assembled tab navigation markup
	 *
	 * @returns {string}
	 */
	GetTabs: () => {
		return '<ul class="horizontal dark-bg">' + Guild_fights.Tabs.join('') + '</ul>';
	},


	/**
	 * Registers the content pane of a tab; every pane except the first starts hidden
	 *
	 * @param {string} id Tab id the pane belongs to
	 * @param {string} content HTML content of the pane
	 */
	SetTabContent: (id, content) => {    
		let cls = Guild_fights.TabsContent.length > 0 ? ' class="hidden-tab"' : '';
    	Guild_fights.TabsContent.push('<div id="' + id + '"' + cls + '>' + content + '</div>');
	},


	/**
	 * Returns the assembled markup of all tab content panes
	 *
	 * @returns {string}
	 */
	GetTabContent: () => {
		return Guild_fights.TabsContent.join('');
	},


	/**
	 * Returns the alert button for a province: a delete button when an alert
	 * already exists, a create button otherwise
	 *
	 * @param provId
	 * @returns {string}
	 */
	GetAlertButton: (provId) => {
		let btn;
		if (Guild_fights.Alerts.find((a) => a.provId == provId) !== undefined) {
			btn = `<button class="btn btn-slim btn-delete deletealertbutton" data-id="${provId}" data-original-title="${i18n('Boxes.GuildFights.DeleteAlert')}"></button>`;
		}
		else {
			btn = `<button class="btn btn-slim setalertbutton" data-id="${provId}" data-original-title="${i18n('Boxes.GuildFights.SetAlert')}"></button>`;
		}
		return btn;
	},


	/**
	 * Returns the own guild's signal on the given province
	 *
	 * @param provinceId
	 * @returns {?Object} {provinceId, signal} or undefined
	 */
	GetProvinceSignal: (provinceId) => {
		let own = Guild_fights.MapData?.battlegroundParticipants?.find(p => p.clan.id === ExtGuildID);

		return own?.signals?.find(s => (s.provinceId || 0) === (provinceId || 0));
	},


	/**
	 * Returns the signal icon when the province carries a marker of the own guild:
	 * "focus" (crosshair) or "ignore" (blocking hand)
	 *
	 * @param provinceId
	 * @returns {string}
	 */
	GetFocusIcon: (provinceId) => {
		if (!Guild_fights.showFocusTarget) {
			return '';
		}

		let signal = Guild_fights.GetProvinceSignal(provinceId);
		if (signal === undefined) {
			return '';
		}

		// the game assets are named like the signal, only "focus" maps to "target"
		let asset = signal.signal === 'focus' ? 'target' : signal.signal,
			title = signal.signal === 'focus' ? i18n('Boxes.GuildFights.FocusTarget') : i18n('Boxes.GuildFights.IgnoreTarget');

		return `<img class="focus-target" src="${srcLinks.get('/guild_battlegrounds/map/shared/guild_battlegrounds_' + asset + '.png', true)}" alt="" data-original-title="${title}">`;
	},


	/**
	 * Returns the victory points cell including the boosted value when a VP boost is active
	 *
	 * @param province
	 * @returns {string}
	 */
	GetVPCell: (province) => {
		let vp = province.victoryPoints || 0,
			boost = (province.victoryPointsBonus || 0) - vp;

		if (boost <= 0) {
			return `<td class="text-center vp-cell">${HTML.Format(vp)}</td>`;
		}

		return `<td class="text-center vp-cell" data-original-title="${HTML.i18nTooltip(HTML.i18nReplacer(i18n('Boxes.GuildFights.BoostedVP'), { vp: HTML.Format(vp + boost) }))}">${HTML.Format(vp)} <small class="text-success">+${HTML.Format(boost)}</small></td>`;
	},


	/**
	 * Merges a getBuildings response (ajax or websocket) into the map data:
	 * slot count and the building list used to derive the attrition chance
	 *
	 * @param d getBuildings responseData
	 */
	HandleBuildingsUpdate: (d) => {
		if (!Guild_fights.MapData || !d || !Array.isArray(d.placedBuildings)) return;

		let Pid = d.provinceId || 0,
			province = Guild_fights.MapData.map.provinces[Pid];
		if (!province) return;

		province.usedBuildingSlots = d.placedBuildings.length;
		Guild_fights.StoreProvinceBuildings(Pid, d.placedBuildings.map(b => ({ id: b.id, readyAt: b.readyAt || 0 })));

		if ($('#LiveGildFighting').length > 0) {
			Guild_fights.UpdateProvinceCells(Pid);

			// the buildings also change the attrition chance of all adjacent sectors
			let connections = ProvinceMap.ProvinceData()?.find(e => e.id === Pid)?.connections || [];
			connections.forEach(link => Guild_fights.UpdateProvinceCells(link));
		}
	},


	/**
	 * Persists the placed buildings of a province for the current GBG round
	 *
	 * @param provinceId
	 * @param {?Object[]} buildingIds [{id, readyAt}], or null to forget the province (e.g. sector lost)
	 */
	StoreProvinceBuildings: (provinceId, buildingIds) => {
		let store = Guild_fights.ProvinceBuildings;

		if (store.gbground !== Guild_fights.CurrentGBGRound) {
			store = { gbground: Guild_fights.CurrentGBGRound, provinces: {} };
		}

		if (buildingIds === null) {
			delete store.provinces[provinceId];
		}
		else {
			store.provinces[provinceId] = buildingIds;
		}

		Guild_fights.ProvinceBuildings = store;
		localStorage.setItem('GuildFights.ProvinceBuildings', JSON.stringify(store));
	},


	/**
	 * Summed block value of the finished buildings on a province
	 *
	 * @param province
	 * @returns {?number} undefined when the buildings of the province are not known yet
	 */
	GetProvinceBlock: (province) => {
		let store = Guild_fights.ProvinceBuildings;
		if (store.gbground !== Guild_fights.CurrentGBGRound) return undefined;

		let buildings = store.provinces[province.id || 0];
		if (buildings === undefined) return undefined;

		// stale list, e.g. a build happened while the map was not open
		if ((province.usedBuildingSlots || 0) !== buildings.length) return undefined;

		let now = moment().unix();

		return buildings.reduce((sum, b) => {
			// buildings under construction do not block yet
			if ((b.readyAt || 0) > now) return sum;

			return sum + ((typeof GBGBuildings !== 'undefined' && GBGBuildings.block[b.id]) || 0);
		}, 0);
	},


	/**
	 * Attrition chance a province grants for attacks on its adjacent sectors,
	 * derived from its placed buildings. 20% is the lowest possible value
	 *
	 * @param province
	 * @returns {?number} undefined when the buildings of the province are not known yet
	 */
	GetOwnAttritionChance: (province) => {
		let blocked = Guild_fights.GetProvinceBlock(province);
		if (blocked === undefined) return undefined;

		return Math.max(20, 100 - blocked);
	},


	/**
	 * Attrition chance an attack on the given province would have, derived from the
	 * adjacent own sectors: the block values of ALL their buildings add up
	 *
	 * @param province
	 * @returns {?number} undefined when no adjacent own sector with known buildings exists
	 */
	GetNeighborDerivedAttrition: (province) => {
		let own = Guild_fights.MapData?.currentParticipantId,
			id = province.id || 0,
			connections = ProvinceMap.ProvinceData()?.find(e => e.id === id)?.connections || [],
			totalBlock;

		for (let link of connections) {
			let neighbor = Guild_fights.MapData.map.provinces[link];
			if (!neighbor || neighbor.ownerId !== own) continue;

			let block = Guild_fights.GetProvinceBlock(neighbor);
			if (block === undefined) continue;

			totalBlock = (totalBlock || 0) + block;
		}

		if (totalBlock === undefined) return undefined;

		return Math.max(20, 100 - totalBlock);
	},


	/**
	 * Attrition chance of a province. Attackable sectors: the server value from
	 * getBattleground/getProvinces, improved by the live building knowledge of the
	 * adjacent own sectors (the server value lags behind fresh builds).
	 * Own sectors: derived from the placed buildings only
	 *
	 * @param province
	 * @returns {?number}
	 */
	GetEffectiveAttrition: (province) => {
		if (province.ownerId === Guild_fights.MapData?.currentParticipantId) {
			return Guild_fights.GetOwnAttritionChance(province);
		}

		let server = province.gainAttritionChance,
			derived = Guild_fights.GetNeighborDerivedAttrition(province);

		if (server === undefined) return derived;
		if (derived === undefined) return server;

		// both values can only be outdated upwards
		return Math.min(server, derived);
	},


	/**
	 * Returns the attrition chance cell for a province, "-" when the value is not known
	 *
	 * @param province
	 * @returns {string}
	 */
	GetAttritionCell: (province) => {
		let attrition = Guild_fights.GetEffectiveAttrition(province);

		if (attrition === undefined) {
			return '<td class="text-center attrition-cell">-</td>';
		}

		let cls = attrition <= 20 ? 'attrition-low' : (attrition < 80 ? 'attrition-mid' : 'attrition-high');

		return `<td class="text-center attrition-cell ${cls}">${attrition}%</td>`;
	},


	/**
	 * Returns the row class for own sectors with empty building slots.
	 * No warning when the attrition chance already reached the 20% minimum
	 *
	 * @param province
	 * @returns {string}
	 */
	GetSlotWarningClass: (province) => {
		let used = province.usedBuildingSlots || 0,
			total = province.totalBuildingSlots || 0;

		return (used < total && Guild_fights.GetEffectiveAttrition(province) !== 20) ? 'slot-warning' : '';
	},


	/**
	 * Updates VP, attrition chance and building slots of a single province row
	 * in the open box after a websocket update
	 *
	 * @param id province id
	 */
	UpdateProvinceCells: (id) => {
		let province = Guild_fights.MapData.map.provinces.find(p => (p.id || 0) === id);
		if (!province) return;

		let $nextupRow = $(`#timer-${id}`);
		if ($nextupRow.length > 0) {
			$nextupRow.find('.vp-cell').replaceWith(Guild_fights.GetVPCell(province));
			$nextupRow.find('.attrition-cell').replaceWith(Guild_fights.GetAttritionCell(province));
			$nextupRow.find('[data-original-title]').tooltip({container: 'body'});
		}

		let $ownedRow = $(`#time-${id}`);
		if ($ownedRow.length > 0) {
			$ownedRow.find('.vp-cell').replaceWith(Guild_fights.GetVPCell(province));
			$ownedRow.find('.slots-cell').text(`${province.usedBuildingSlots || 0}/${province.totalBuildingSlots}`);
			$ownedRow.removeClass('slot-warning').addClass(Guild_fights.GetSlotWarningClass(province));
			$ownedRow.find('[data-original-title]').tooltip({container: 'body'});
		}
	},


	/**
	 * Creates the box with the data
	 */
	ShowGuildBox: (reload) => {
		if ($('#LiveGildFighting').length === 0) {
			HTML.Box({
				id: 'LiveGildFighting',
				title: i18n('Menu.Gildfight.Title'),
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize: true,
				settings: 'Guild_fights.ShowLiveFightSettings()',
			    //active_maps:"gg"
			});

			// add css to the dom
			HTML.AddCssFile('guild_fights');
		}
		else if (!reload) {
			HTML.CloseOpenBox('LiveGildFighting');
			return;
		}

		Guild_fights.BuildFightContent();
	},


	/**
	 * Shows the player overview
	 */
	ShowPlayerBox: () => {
		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if ($('#GildPlayers').length === 0) {
			HTML.Box({
				id: 'GildPlayers',
				title: i18n('Boxes.GuildFights.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
				settings: 'Guild_fights.ShowPlayerBoxSettings()',
			    active_maps:"gg"
			});
			HTML.AddCssFile('guild_fights');
		}
			
		if (Settings.GetSetting('ShowGBGPlayerInfo') == false) {
			$('#GildPlayers').css({'display': 'none'})
		}

		Guild_fights.BuildPlayerContent(Guild_fights.CurrentGBGRound);
	},


	/**
	 * Generates the snapshot detail box
	 */
	ShowDetailViewBox: (d) => {
		if ($('#GildPlayersDetailView').length === 0) {
			let ptop = null,
				pright = null;

			HTML.Box({
				id: 'GildPlayersDetailView',
				title: i18n('Boxes.GuildFights.SnapshotLog'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
			    active_maps:"gg"
			});

			if (localStorage.getItem('GildPlayersDetailViewCords') === null) {
				ptop = $('#GildPlayers').length !== 0 ? $('#GildPlayers').position().top : 0;
				pright = $('#GildPlayers').length !== 0 ? ($('#GildPlayers').position().left + $('#GildPlayers').width() + 10) : 0;
				$('#GildPlayersDetailView').css('top', ptop + 'px').css('left', (pright * 1) + 'px');
			}
		}

		Guild_fights.BuildDetailViewContent(d);
	},


	/**
	 * Build the player content
	 * @returns {Promise<void>}
	 */
	BuildPlayerContent: async (gbground) => {

		let newRound = false;
		let updateDetailView = false;

		await Guild_fights.SetBoxNavigation(gbground);

		let CurrentSnapshot = await Guild_fights.db.snapshots
			.where({
				gbground: Guild_fights.CurrentGBGRound
			})
			.first();

		if (CurrentSnapshot === undefined) {
			newRound = true;
			// if there is a new GBG round delete previous snapshots
			Guild_fights.DeleteOldSnapshots(Guild_fights.CurrentGBGRound);
		}

		let t = [],
			b = [],
			tN = 0,
			tF = 0,
			tA = 0,
			histView = false;

		Guild_fights.PlayerBoxContent = [];

		Guild_fights.PlayerBoxContent.push({
			player_id: 'player_id',
			player: 'player',
			negotiationsWon: 'negotiations',
			battlesWon: 'battles',
			attrition: 'attrition',
			total: 'total'
		});

		if (gbground && gbground !== null && gbground !== Guild_fights.CurrentGBGRound) {

			let d = await Guild_fights.db.history.where({ gbground: gbground }).toArray();
			Guild_fights.GBGRound = d[0].participation.sort(function (a, b) {
				return a.rank - b.rank;
			});
			histView = true;

		}
		else {
			Guild_fights.GBGRound = Guild_fights.NewAction;
		}

		for (let i in Guild_fights.GBGRound) {
			if (!Guild_fights.GBGRound.hasOwnProperty(i)) break;

			let playerNew = Guild_fights.GBGRound[i];

			let fightAddOn = '',
				negotaionAddOn = '',
				attritionAddOn = '',
				diffNegotiations = 0,
				diffBattles = 0,
				diffAttr = 0,
				newProgressClass = '',
				change = false;

			// is there an older snapshot available?
			if (Guild_fights.PrevAction !== null && histView === false) {

				let playerOld = Guild_fights.PrevAction.find(p => (p['player_id'] === playerNew['player_id']));

				// Is there any data on this player?
				if (playerOld !== undefined) {

					if (playerOld['negotiationsWon'] < playerNew['negotiationsWon'])
					{
						diffNegotiations = playerNew['negotiationsWon'] - playerOld['negotiationsWon'];
						negotaionAddOn = ' <small class="text-success">&#8593; ' + diffNegotiations + '</small>';
						change = true;
					}

					if (playerOld['battlesWon'] < playerNew['battlesWon'])
					{
						diffBattles = playerNew['battlesWon'] - playerOld['battlesWon'];
						fightAddOn = ' <small class="text-success">&#8593; ' + diffBattles + '</small>';
						change = true;
					}

					if (playerOld['attrition'] < playerNew['attrition'])
					{
						diffAttr = playerNew['attrition'] - playerOld['attrition'];
						attritionAddOn = ' <small class="text-success">&#8593; ' + diffAttr + '</small>';
						change = true;
					}
				}
			}

			if ((change === true || newRound === true) && Guild_fights.GBGHistoryView === false)
			{
				await Guild_fights.UpdateDB('player', {
						gbground: Guild_fights.CurrentGBGRound,
						player_id: playerNew['player_id'], 
						name: playerNew['name'], 
						battles: playerNew['battlesWon'], 
						negotiations: playerNew['negotiationsWon'], 
						attrition: playerNew['attrition'], 
						diffbat: diffBattles, 
						diffneg: diffNegotiations, 
						diffattr: diffAttr,
						time: moment().unix() 
					});
				updateDetailView = true;
			}

			newProgressClass = change && !newRound ? 'new ' : '';

			tN += playerNew['negotiationsWon'];
			tF += playerNew['battlesWon'];
			tA += playerNew['attrition']

			b.push('<tr data-player="' + playerNew['player_id'] + '" data-gbground="' + gbground + '" class="' + newProgressClass + (!histView ? 'showdetailview ' : '') + (playerNew['player_id'] === ExtPlayerID ? 'mark-player ' : '') + (change === true ? 'bg-green' : '') + '">');
			b.push('<td style="display:none;">' + playerNew.player_id + '.</td>');

			b.push('<td class="tdmin">' + (parseInt(i) + 1) + '.</td>');
			b.push('<td class="tdmin"><img src="' + srcLinks.GetPortrait(playerNew['avatar']) + '" alt=""></td>');
			b.push('<td>' + playerNew['name'] + '</td>');
			b.push('<td class="text-center">');
			b.push(playerNew['negotiationsWon'] + negotaionAddOn);
			b.push('</td>');

			b.push('<td class="text-center">');
			b.push(playerNew['battlesWon'] + fightAddOn);
			b.push('</td>');

			b.push('<td class="text-center">');
			let both = playerNew['battlesWon'] + (playerNew['negotiationsWon'] * 2);
			b.push(both);
			b.push('</td>');

			b.push('<td class="text-center">');
			b.push(playerNew['attrition'] + attritionAddOn);
			b.push('</td>');

			b.push('<td></td>');
			b.push('</tr>');

			Guild_fights.PlayerBoxContent.push({
				player_id: playerNew['player_id'],
				player: playerNew['name'],
				negotiationsWon: playerNew['negotiationsWon'],
				battlesWon: playerNew['battlesWon'],
				attrition: playerNew['attrition'],
				total: both
			})
		}

		// Update DetailView if there are changes and DetailView is open
		if ($('#GildPlayersDetailView').length !== 0 && updateDetailView === true) {
			Guild_fights.BuildDetailViewContent(Guild_fights.curDetailViewFilter);
		}

		let tNF = (tN * 2) + tF;

		t.push('<table id="GildPlayersTable" class="exportable foe-table' + (histView === false ? ' chevron-right' : '') + '">');

		t.push('<thead class="sticky">');
		t.push('<tr>');

		t.push('<th style="display:none;" data-export="Player_ID"></th>');
		t.push('<th colspan="3" data-export3="Player">' + i18n('Boxes.GuildFights.Player') + '</th>');
		t.push('<th class="text-center" data-export="Negotiations"><span class="negotiation" title="' + HTML.i18nTooltip(i18n('Boxes.GuildFights.Negotiations')) + '"></span> <strong class="text-warning">(' + HTML.Format(tN) + ')</strong></th>');
		t.push('<th class="text-center" data-export="Fights"><span class="fight" title="' + HTML.i18nTooltip(i18n('Boxes.GuildFights.Fights')) + '"></span> <strong class="text-warning">(' + HTML.Format(tF) + ')</strong></th>');
		t.push('<th class="text-center" data-export="Total">' + i18n('Boxes.GuildFights.Total') + ' <strong class="text-warning">(' + HTML.Format(tNF) + ')</strong></th>');
		t.push('<th class="text-center" data-export="Attrition">' + i18n('Boxes.GuildFights.Attrition') + ' <strong class="text-warning">(' + HTML.Format(tA) + ')</strong></th>');

		t.push('<th></th>');
		t.push('</tr>');
		t.push('</thead>');

		t.push('<tbody>');
		t.push(b.join(''));
		t.push('</tbody>');

		$('#gbgContentWrapper').html(t.join('')).promise().done(function () {

			$('#GildPlayersBody tr.showdetailview').off('click').on('click', function () {
				let player_id = $(this).data('player');
				let gbground = $(this).data('gbground');

				Guild_fights.curDetailViewFilter = { content: 'player', player_id: player_id, gbground: gbground };

				if ($('#GildPlayersDetailView').length === 0) {
					Guild_fights.ShowDetailViewBox(Guild_fights.curDetailViewFilter);
				}
				else {
					Guild_fights.BuildDetailViewContent(Guild_fights.curDetailViewFilter);
				}
			});

			$("#GildPlayers").on("remove", function () {
				if ($('#GildPlayersDetailView').length !== 0)
				{
					$('#GildPlayersDetailView').fadeOut(50, function () {
						$(this).remove();
					});
				}
			});

			// check if member has a new progress
			let newPlayer = $('#GildPlayersTable tbody').find('tr.new').length;
			if (newPlayer > 0)
			{
				$('button#gbg_filterProgressList').html('&#8593; ' + newPlayer);
				$('button#gbg_filterProgressList').attr("disabled", false);

				if (Guild_fights.PlayerBoxSettings.showOnlyActivePlayers === 1)
				{
					Guild_fights.ToggleProgressList('gbg_filterProgressList');
				}
			}
		});

		if ($('#GildPlayersHeader .title').find('.time-diff').length === 0)
		{
			$('#GildPlayersHeader .title').append($('<small />').addClass('time-diff'));
		}

		// es gibt schon einen Snapshot vorher
		if (Guild_fights.PrevActionTimestamp !== null)
		{

			let start = moment.unix(Guild_fights.PrevActionTimestamp),
				end = moment.unix(Guild_fights.NewActionTimestamp),
				duration = moment.duration(end.diff(start));

			let time = duration.humanize();

			$('.time-diff').text(
				HTML.i18nReplacer(i18n('Boxes.GuildFights.LastSnapshot'), { time: time })
			);
		}
	},


	/**
	 * Builds the snapshot detail box: either the daily log of a single player
	 * or the date filtered log of all guild members
	 *
	 * @param {Object} d Filter with content type ("player"/"filter"), player_id and gbground
	 * @returns {Promise<void>}
	 */
	BuildDetailViewContent: async (d) => {

		let player_id = d.player_id ? d.player_id : null,
			content = d.content ? d.content : 'player',
			gbground = d.gbground ? d.gbground : Guild_fights.CurrentGBGRound,
			playerName = null,
			dailyFights = [],
			detaildata = [],
			sumN = 0,
			sumF = 0,
			h = [];

		if (player_id === null && content === "player") return;

		if (content === "player")
		{
			detaildata = await Guild_fights.db.snapshots.where({ gbground: gbground, player_id: player_id }).toArray();

			playerName = detaildata[0].name;
			dailyFights = detaildata.reduce(function (res, obj) {
				let date = moment.unix(obj.time).format('YYYYMMDD');

				if (!(date in res))
				{
					res.__array.push(res[date] = { date: date, time: obj.time, battles: obj.battles, negotiations: obj.negotiations });
				}
				else
				{
					res[date].battles += +obj.battles;
					res[date].negotiations += +obj.negotiations;
				}
				return res;
			}, { __array: [] }).__array.sort(function (a, b) { return b.date - a.date });


			h.push('<div class="pname dark-bg text-center">' + playerName + ': ' + moment.unix(gbground).subtract(11, 'd').format(i18n('DateShort')) + ` - ` + moment.unix(gbground).format(i18n('Date')) + '</div>');
			h.push('<p class="dark-bg" style="padding:5px;margin:0;">' + i18n('Boxes.GuildFights.SnapShotLogDisclaimer') + '</p>')
			h.push('<table id="gbgPlayerLogTable" class="foe-table gbglog"><thead class="sticky">');
			h.push('<tr class="sorter-header">');
			h.push('<th class="is-number" data-type="gbg-playerlog-group">' + i18n('Boxes.GuildFights.Date') + '</th>');
			h.push('<th class="is-number text-center" data-type="gbg-playerlog-group"><span class="negotiation" title="' + HTML.i18nTooltip(i18n('Boxes.GuildFights.Negotiations')) + '"></span></th>');
			h.push('<th class="is-number text-center" data-type="gbg-playerlog-group"><span class="fight" title="' + HTML.i18nTooltip(i18n('Boxes.GuildFights.Fights')) + '"></span></th>');
			h.push(`<th class="is-number text-center" data-type="gbg-playerlog-group">${i18n('Boxes.GuildFights.Total')}</th>`);
			h.push('</tr>');
			h.push('</thead><tbody class="gbg-playerlog-group">');

			dailyFights.forEach(day => {
				let id = moment.unix(day.time).format(i18n('DateTime'));
				let sum = (day.battles + day.negotiations * 2);
				h.push('<tr id="gbgdetail_' + id + '" data-gbground="' + gbground + '" data-player="' + player_id + '" data-id="' + id + '">');
				h.push(`<td class="is-number" data-number="${day.time}">${moment.unix(day.time).format(i18n('Date'))}</td>`);
				h.push(`<td class="is-number text-center" data-number="${day.negotiations}">${HTML.Format(day.negotiations)}</td>`);
				h.push(`<td class="is-number text-center" data-number="${day.battles}">${HTML.Format(day.battles)}</td>`);
				h.push(`<td class="is-number text-center" data-number="${sum}">${HTML.Format(sum)}</td>`);
				h.push('</tr>');

			});

			h.push('</tbody></table>');
		}
		else if (content === "filter")
		{
			detaildata = await Guild_fights.db.snapshots.where({ gbground: gbground }).and(function (item) {
				return (item.date >= Guild_fights.curDateFilter && item.date <= Guild_fights.curDateEndFilter)
			}).toArray();

			detaildata.sort(function (a, b) { return b.time - a.time });

			h.push('<div class="datetimepicker sticky"><button id="gbgLogDatepicker" class="btn">' + Guild_fights.formatRange() + '</button></div>');
			h.push('<table id="GuildFightsLogTable" class="foe-table gbglog"><thead>');
			h.push('<tr class="sorter-header">');
			h.push('<th class="is-number" data-type="gbg-log-group">' + i18n('Boxes.GuildFights.Date') + '</th>');
			h.push('<th class="case-sensitive" data-type="gbg-log-group">' + i18n('Boxes.GuildFights.Player') + '</th>');
			h.push('<th class="is-number text-center" data-type="gbg-log-group"><span class="negotiation" title="' + HTML.i18nTooltip(i18n('Boxes.GuildFights.Negotiations')) + '"></span></th>');
			h.push('<th class="is-number text-center" data-type="gbg-log-group"><span class="fight" title="' + HTML.i18nTooltip(i18n('Boxes.GuildFights.Fights')) + '"></span></th>');
			h.push(`<th class="is-number text-center" data-type="gbg-log-group">${i18n('Boxes.GuildFights.Total')}</th>`);
			h.push('</tr>');
			h.push('</thead><tbody class="gbg-log-group">');

			detaildata.forEach(e => {
				sumN += e.negotiations;
				sumF += e.battles;
				let sum = (e.battles + e.negotiations * 2);
				h.push('<tr data-id="' + e.time + '" id="gbgtime_' + e.time + '">');
				h.push(`<td class="is-number" data-number="${e.time}">${moment.unix(e.time).format(i18n('DateTime'))}</td>`);
				h.push(`<td class="case-sensitive" data-text="${helper.str.cleanup(e.name)}">${e.name}</td>`);
				h.push(`<td class="is-number text-center" data-number="${e.negotiations}">${HTML.Format(e.negotiations)}</td>`);
				h.push(`<td class="is-number text-center" data-number="${e.battles}">${HTML.Format(e.battles)}</td>`);
				h.push(`<td class="is-number text-center" data-number="${sum}">${HTML.Format(sum)}</td>`);
				h.push('</tr>');
			});

			h.push('</tbody></table>');
		}

		$('#GildPlayersDetailViewBody').html(h.join('')).promise().done(function () {

			$('#GildPlayersDetailViewBody .gbglog').tableSorter();

			if ($('#gbgLogDatepicker').length !== 0)
			{
				Guild_fights.intiateDatePicker();
			}
			$('#GildPlayersDetailViewBody tr.sorter-header').on('click', function () {
				$(this).parents('.foe-table').find('tr.open').removeClass("open");

			});

			$('#GildPlayersDetailViewBody > .foe-table tr').on('click', function () {

				if ($(this).next("tr.detailview").length)
				{
					$(this).next("tr.detailview").remove();
					$(this).removeClass('open');
				}
				else
				{
					if (!$(this).hasClass("hasdetail"))
					{
						return;
					}

					let date = $(this).data("id");
					let player = $(this).data("player");
					let awidth = $(this).find('td:first-child').width();
					let bwidth = $(this).find('td:nth-child(2)').width();
					let cwidth = $(this).find('td:nth-child(3)').width();
					let dwidth = $(this).find('td:nth-child(4)').width();
					let ewidth = $(this).find('td:last-child').width();

					$(this).addClass('open');

					Guild_fights.BuildDetailViewLog({ date: date, player: player, width: { a: awidth, b: bwidth, c: cwidth, d: dwidth, e: ewidth } });
				}
			});

		});
	},


	/**
	 * Deletes all snapshots that do not belong to the given GBG round
	 *
	 * @param gbground Round to keep
	 * @returns {Promise<void>}
	 */
	DeleteOldSnapshots: async (gbground) => {
		let deleteCount = await Guild_fights.db.snapshots.where("gbground").notEqual(gbground).delete();
	},


	/**
	 * Expands a day row of the player detail view with every single snapshot
	 * taken on that day
	 *
	 * @param {Object} data Player id, date and the column widths of the parent row
	 * @returns {Promise<void>}
	 */
	BuildDetailViewLog: async (data) => {
		let h = [];
		let d = await Guild_fights.db.snapshots.where({ player_id: data.player, date: data.date }).reverse().sortBy('date');

		if (!d) return;

		if (!data.width) {
			data.width = { a: 50, b: 20, c: 20, d: 20 }
		}

		h.push(`<tr class="detailview dark-bg"><td class="nopadding" colspan="${$('#GildPlayersDetailViewBody > .foe-table thead tr').find("th").length}"><table class="foe-table log"><body>`);

		d.forEach(e => {
			h.push(`<tr>`);
			h.push(`<td style="width: ${data.width.a}px">${moment.unix(e.time).format(i18n('DateTime'))}</td>`);
			h.push(`<td style="width: ${data.width.b}px" class="text-center">${e.negotiations}</td>`);
			h.push(`<td style="width: ${data.width.c}px" class="text-center">${e.battles}</td>`);
			h.push(`<td style="width: ${data.width.d}px" class="text-center">${(e.battles + e.negotiations * 2)}</td>`);
			h.push(`<td style="width: ${data.width.e}px"></td>`);
			h.push(`</tr>`);
		});

		h.push(`</tbody></table></td></tr>`);

		$(h.join('')).insertAfter($('#gbgdetail_' + data.date));
	},


	/**
	 * Contents of the card box
	 */
	BuildFightContent: () => {
		Guild_fights.Tabs = [];
		Guild_fights.TabsContent = [];

		Guild_fights.SetTabs('gbgnextup');
		Guild_fights.SetTabs('gbgprogress');
		Guild_fights.SetTabs('gbgowned');
		Guild_fights.SetTabs('gbgranking');

		let progress = [], nextup = [],
			LiveFightSettings = JSON.parse(localStorage.getItem('LiveFightSettings'));

		Guild_fights.showGuildColumn = (LiveFightSettings && LiveFightSettings.showGuildColumn !== undefined) ? LiveFightSettings.showGuildColumn : 0;
		Guild_fights.showVPColumn = LiveFightSettings?.showVPColumn ?? 0;
		Guild_fights.showAttritionColumn = LiveFightSettings?.showAttritionColumn ?? 1;
		Guild_fights.showFocusTarget = LiveFightSettings?.showFocusTarget ?? 1;

		let mapdata = Guild_fights.MapData['map']['provinces'];
		for (let i in mapdata) {
			if (!mapdata.hasOwnProperty(i)) break;

			let id = mapdata[i]['id'];
			mapdata[i].neighbor = [];
			let linkIDs = ProvinceMap.ProvinceData().find(e => e['id'] === id)['connections'];

			for (let x in linkIDs) {
				if (!linkIDs.hasOwnProperty(x)) {
					continue;
				}

				let neighborID = Guild_fights.MapData['map']['provinces'].find(e => e['id'] === linkIDs[x]);

				if (neighborID['ownerId']) {
					mapdata[i]['neighbor'].push(neighborID['ownerId']);
				}
			}
		}

		nextup = Guild_fights.BuildNextUpTab();
		progress = Guild_fights.BuildProgressTab();
		owned = Guild_fights.BuildOwnedTab();
		ranking = GuildRanking.BuildTab();

		Guild_fights.SetTabContent('gbgnextup', nextup.join(''));
		Guild_fights.SetTabContent('gbgprogress', progress.join(''));
		Guild_fights.SetTabContent('gbgowned', owned.join(''));
		Guild_fights.SetTabContent('gbgranking', ranking.join(''));

		let h = [];

		h.push(`<div class="btn-group">
			<button class="btn btn-slim copybutton all" onclick="Guild_fights.CopyToClipBoard(event)">${i18n('Boxes.GuildFights.SelectAll')}</button>
			<button class="btn btn-slim dcbutton discord custom" onclick="Guild_fights.PrepareForDiscord(event)" data-original-title="${i18n('Boxes.GuildFights.DiscordSendSelectionCustom')}" style="display:none;"></button>
			<button class="btn btn-slim dcbutton discord" onclick="Guild_fights.PrepareForDiscord(event)" data-original-title="${i18n('Boxes.GuildFights.DiscordSendSelection')}" style="display:none;"></button>
			<button class="btn btn-slim mapbutton" onclick="ProvinceMap.build()">${i18n('Boxes.GuildFights.OpenMap')}</button>
			</div>
		</div>`);
		h.push('<div class="gbg-tabs tabs">');
		h.push(Guild_fights.GetTabs());
		h.push(Guild_fights.GetTabContent());

		let activeTab = 1;
		if ($('.gbgprogress.active').length > 0) activeTab = 2;
		else if ($('.gbgowned.active').length > 0) activeTab = 3;
		else if ($('.gbgranking.active').length > 0) activeTab = 4;

		$('#LiveGildFighting').find('#LiveGildFightingBody').html(h.join('')).promise().done(function () {
			$('.gbg-tabs').tabslet({ active: activeTab });

			$('.gbg-tabs').on('_after', (e) => {
				Guild_fights.ToggleCopyButton();
			});
			$('#nextup').on('click', '.deletealertbutton', function (e) {
				Guild_fights.DeleteAlert($(this).data('id'));
				e.stopPropagation();
			});
			$('#nextup').on('click', '.setalertbutton', function (e) {
				Guild_fights.SetAlert($(this).data('id'));
				e.stopPropagation();
			});
			$('#nextup').on('click', 'tr', function () {
				$(this).toggleClass('highlight-row');
				Guild_fights.ToggleCopyButton();
			});
			// outline the hovered sector on the province map
			$('#nextup, #gbgowned').on('mouseenter', 'tr[data-id]', function () {
				ProvinceMap.HighlightSector($(this).data('id'));
			}).on('mouseleave', 'tr[data-id]', function () {
				ProvinceMap.UnhighlightSector();
			});
			$('[data-original-title]').tooltip({container: 'body'});
		});
	},


	/**
	 * Builds the conquest progress tab: every province with a running attack,
	 * showing the attackers' progress and the required maximum
	 *
	 * @returns {string[]} HTML fragments of the tab content
	 */
	BuildProgressTab: function() {
		let progress = [],
			mapdata = Guild_fights.MapData['map']['provinces'],
			gbgGuilds = Guild_fights.MapData['battlegroundParticipants'];

		progress.push('<div id="progress"><table class="foe-table">');
		progress.push('<thead><tr>');
		progress.push('<th class="prov-name" style="user-select:text">' + i18n('Boxes.GuildFights.Province') + '</th>');

		if (Guild_fights.showGuildColumn) {
			progress.push('<th>' + i18n('Boxes.GuildFights.Owner') + '</th>');
		}

		progress.push('<th>' + i18n('Boxes.GuildFights.Progress') + '</th>');
		progress.push('<th>' + i18n('Boxes.GuildFights.RequiredProgress') + '</th>');
		progress.push('</tr></thead><tbody>');

		for (let i in mapdata) {
			if (!mapdata.hasOwnProperty(i)) break;
			let id = mapdata[i].id || 0;

			for (let x in gbgGuilds) {
				if (!gbgGuilds.hasOwnProperty(x)) break;

				if (mapdata[i].ownerId !== undefined && gbgGuilds[x].participantId === mapdata[i].ownerId) {
					if (mapdata[i]['conquestProgress'].length > 0 && (mapdata[i]['lockedUntil'] === undefined)) {
						let pColor = ProvinceMap.getSectorColors(mapdata[i]['ownerId']);
						let provinceProgress = mapdata[i]['conquestProgress'];

						progress.push(`<tr id="province-${id}" data-id="${id}" data-tab="progress">`);
						progress.push(`<td title="${i18n('Boxes.GuildFights.Owner')}: ${gbgGuilds[x]['clan']['name']}"><b><span class="province-color" style="background-color:${pColor['main']}"></span> ${Guild_fights.GetFocusIcon(id)}${mapdata[i]['title']}</b></td>`);

						if (Guild_fights.showGuildColumn)
							progress.push(`<td>${gbgGuilds[x]['clan']['name']}</td>`);
						
						progress.push(`<td data-field="${id}-${mapdata[i]['ownerId']}" class="guild-progress">`);

						for (let y in provinceProgress) {
							if (!provinceProgress.hasOwnProperty(y)) break;

							let color = ProvinceMap.getSectorColors(provinceProgress[y]['participantId']);
							progress.push(`<span class="attack attacker-${provinceProgress[y]['participantId']} gbg-${color['cid']}">${provinceProgress[y]['progress']}</span>`);
						}

						progress.push('</td><td data-field="' + id + '" class="required-progress">' + mapdata[i]['conquestProgress'][0].maxProgress + '</td>');
					}
				}
			}

			// If sectors doesnt belong to anyone
			if (mapdata[i]['ownerId'] === undefined && mapdata[i]['conquestProgress'].length > 0) {
				progress.push(`<tr id="province-${id}" data-id="${id}" data-tab="progress">`);
				progress.push(`<td><b><span class="province-color" style="background-color:#555"></span> ${Guild_fights.GetFocusIcon(id)}${mapdata[i]['title']}</b></td>`);

				if (Guild_fights.showGuildColumn)
					progress.push(`<td><em>${i18n('Boxes.GuildFights.NoOwner')}</em></td>`);

				progress.push('<td data-field="' + id + '" class="guild-progress">');

				let provinceProgress = mapdata[i]['conquestProgress'];

				for (let y in provinceProgress) {
					if (!provinceProgress.hasOwnProperty(y)) break;

					let color = Guild_fights.SortedColors.find(e => e['id'] === provinceProgress[y]['participantId']);
					progress.push(`<span class="attack attacker-${provinceProgress[y]['participantId']} gbg-${color['cid']}">${provinceProgress[y]['progress']}</span>`);
				}

				progress.push('</td><td data-field="' + id + '" class="required-progress">' + mapdata[i]['conquestProgress'][0].maxProgress + '</td>');
			}
		}

		progress.push('</tbody>');
		progress.push('</table></div>');

		return progress;
	},


	/**
	 * Builds the "next up" tab: locked sectors sorted by their unlock time with
	 * countdown, victory points, attrition chance and the discord/alert buttons.
	 * Respects the adjacent/own sector filters from the box settings
	 *
	 * @returns {string[]} HTML fragments of the tab content
	 */
	BuildNextUpTab: function() {
		let nextup = [],
			mapdata = Guild_fights.MapData.map.provinces,
			gbgGuilds = Guild_fights.MapData['battlegroundParticipants'],
			own = gbgGuilds.find(e => e.clan.id === ExtGuildID),
			LiveFightSettings = JSON.parse(localStorage.getItem('LiveFightSettings'));

		Guild_fights.showAdjacentSectors = (LiveFightSettings && LiveFightSettings.showAdjacentSectors !== undefined) ? LiveFightSettings.showAdjacentSectors : 1;
		Guild_fights.showOwnSectors = (LiveFightSettings && LiveFightSettings.showOwnSectors !== undefined) ? LiveFightSettings.showOwnSectors : 0;

		nextup.push(`<div id="nextup"><table class="foe-table">
			<thead><tr>
			<th class="prov-name">${i18n('Boxes.GuildFights.Province')}</th>`);

		if (Guild_fights.showAttritionColumn)
			nextup.push(`<th class="text-center w-small" data-original-title="${HTML.i18nTooltip(i18n('Boxes.GuildFights.Attrition'))}">%</th>`);

		if (Guild_fights.showGuildColumn)
			nextup.push('<th>' + i18n('Boxes.GuildFights.Owner') + '</th>');
		
		nextup.push(`<th class="time-static w-small">${i18n('Boxes.GuildFights.Time')}</th>
				<th class="time-dynamic w-small">${i18n('Boxes.GuildFights.Count')}</th>`);

		if (Guild_fights.showVPColumn)
			nextup.push('<th class="text-center w-small">VP</th>');

		nextup.push(`<th></th>
				<th></th>
			</tr></thead>`);

		let arrayprov = [];

		// Time until next sectors will be available
		for (let i in mapdata) {
			if (!mapdata.hasOwnProperty(i)) continue;

			let ownsectors = true;
			if (!Guild_fights.showOwnSectors)
				ownsectors = (own.clan.name !== mapdata[i].owner);

			if (mapdata[i].lockedUntil !== undefined && ownsectors)
				arrayprov.push(mapdata[i]);  // push all data into array
		}

		let prov = arrayprov.sort((a, b) => { return a.lockedUntil - b.lockedUntil });

		for (let x in prov) {
			if (!prov.hasOwnProperty(x)) continue;

			let showCountdowns = true;
			if (Guild_fights.showAdjacentSectors) {
				if (!prov[x].hasOwnProperty('neighbor')) 
					showCountdowns = false;
				else
					showCountdowns = (prov[x].neighbor.includes(own.participantId) || (prov[x].owner == own.clan.name && Guild_fights.showOwnSectors));
			}

			if (showCountdowns) {
				let countDownDate = moment.unix(prov[x].lockedUntil - 2),
					color = Guild_fights.SortedColors.find(e => e.id === prov[x].ownerId),
					battleType = prov[x].isAttackBattleType ? 'BTattack' : 'BTdefence',
					intervalID = setInterval(() => {
						Guild_fights.UpdateCounter(countDownDate, intervalID, prov[x].id);
					}, 1000);

				
				// look for connecting province timers
				let connectionSecured = false;
				for (const link of ProvinceMap.ProvinceData()[prov[x].id].connections) {
					if (prov[x].owner == own.clan.name) continue;
					
					let ownNeighboringProvinces = mapdata.filter(x => x.id === link && x.ownerId === own.participantId);
					for (const nProv of ownNeighboringProvinces) {
						if (nProv.isSpawnSpot) {
							connectionSecured = true;
							break;
						}

						if ((nProv.lockedUntil||0) < prov[x].lockedUntil) continue;

						connectionSecured = true;
						break;
					}
				}
				
				nextup.push(`<tr id="timer-${prov[x].id}" class="timer ${connectionSecured ? 'secure' : ''}" data-tab="nextup" data-id=${prov[x].id}>
					<td class="prov-name" data-original-title="${i18n('Boxes.GuildFights.Owner')}: ${prov[x].owner}">
					<span class="province-color" ${color['main'] ? 'style="background-color:' + color['main'] + '"' : ''}"></span>
					<span class="battletype ${battleType}"></span>
					${Guild_fights.GetFocusIcon(prov[x].id)}
					<b>${prov[x].title}</b>
					</td>`);

				Guild_fights.UpdateCounter(countDownDate, intervalID, prov[x].id);

				if (Guild_fights.showAttritionColumn)
					nextup.push(Guild_fights.GetAttritionCell(prov[x]));

				if (Guild_fights.showGuildColumn)
					nextup.push(`<td>${prov[x].owner}</td>`);

				let timeAt = moment(countDownDate).add(LiveFightSettings?.showServerTime ? - 60 * (Guild_fights.serverOffset ?? 0) : 0 , "seconds");
				nextup.push(`<td class="time-static" style="user-select:text">${timeAt.format('HH:mm:ss')}</td>
							<td class="time-dynamic" id="counter-${prov[x].id}">${countDownDate.format('HH:mm:ss')}</td>`);
				if (Guild_fights.showVPColumn)
					nextup.push(Guild_fights.GetVPCell(prov[x]));

				let discordButtons = '';
				if (prov[x].owner !== own.clan.name && Guild_fights.discordWebhook.url != '') {
					if (Guild_fights.discordWebhook.template != '') {
						let tpl = Discord.WebHooks.find(x => x.name == Guild_fights.discordWebhook.template);
						if (tpl)
							discordButtons += `<button class="btn btn-slim discord custom" data-original-title="${i18n('Boxes.GuildFights.DiscordSendCustom')}" onclick="Discord.sendGBGSectorCustom(${prov[x]['id']});"></button>`;
					}
					discordButtons += `<button class="btn btn-slim discord" data-original-title="${i18n('Boxes.GuildFights.DiscordSend')}" onclick="Discord.sendGBGSector(${prov[x]['id']});"></button>`;
				}

				nextup.push(`<td class="text-right">`);
				if (discordButtons != '')
					nextup.push(`<div class="btn-group">${discordButtons}</div>`);
				nextup.push(`</td>`);

				nextup.push(`<td class="text-right" id="alert-${prov[x]['id']}">
					${Guild_fights.GetAlertButton(prov[x].id)}
					</div></td>`);
				nextup.push('</tr>');
			}
		}

		nextup.push('</table></div>');

		return nextup;
	},

	
	/**
	 * Builds the building slots tab: all own locked sectors with countdown,
	 * slot usage and victory points. Sectors with empty slots that have not
	 * reached the 20% attrition minimum yet get a warning background
	 *
	 * @returns {string[]} HTML fragments of the tab content
	 */
	BuildOwnedTab: function() {
		let content = [],
			provinces = Guild_fights.MapData.map.provinces,
			guilds = Guild_fights.MapData.battlegroundParticipants,
			own = guilds.find(x => x.clan.id === ExtGuildID),
			LiveFightSettings = JSON.parse(localStorage.getItem('LiveFightSettings'));

		content.push('<div id="gbgowned"><table class="foe-table">');
		content.push('<thead><tr>');
		content.push('<th class="prov-name" style="user-select:text">' + i18n('Boxes.GuildFights.Province') + '</th>');

		if (Guild_fights.showGuildColumn) {
			content.push('<th>' + i18n('Boxes.GuildFights.Owner') + '</th>');
		}

		content.push('<th class="time-dynamic">' + i18n('Boxes.GuildFights.Count') + '</th>');
		content.push('<th>Slots</th>');

		if (Guild_fights.showVPColumn) {
			content.push('<th class="text-center">VP</th>');
		}

		content.push('</tr></thead><tbody>');

		for (let province of provinces) {
			if (province.ownerId !== Guild_fights.MapData.currentParticipantId) continue;
			if (province.lockedUntil === undefined) continue;

			let countDownDate = moment.unix(province.lockedUntil - 2),
				color = Guild_fights.SortedColors.find(x => x.id === province.ownerId),
				intervalID = setInterval(() => {
					Guild_fights.UpdateCounter(countDownDate, intervalID, province.id);
				}, 1000);

			let slotWarning = Guild_fights.GetSlotWarningClass(province);

			content.push(`<tr id="time-${province.id}" class="time ${slotWarning}" data-tab="gbgowned" data-id=${province.id}>
				<td class="prov-name" title="${i18n('Boxes.GuildFights.Owner')}: ${province.owner}">
					<span class="province-color" ${color['main'] ? 'style="background-color:' + color['main'] + '"' : ''}"></span> 
					<b>${province.title}</b> 
				</td>`);

			Guild_fights.UpdateCounter(countDownDate, intervalID, province.id);

			if (Guild_fights.showGuildColumn) {
				content.push(`<td>${province.owner}</td>`);
			}

			let timeAt = moment(countDownDate).add(LiveFightSettings?.showServerTime ? - 60 * (Guild_fights.serverOffset ?? 0) : 0 , "seconds");
			content.push(`<td class="time-dynamic"><span data-original-title="${timeAt.format('HH:mm:ss')}"><span id="counter-${province.id}">${countDownDate.format('HH:mm:ss')}</span></span></td>`);
			content.push(`<td class="slots-cell">${province.usedBuildingSlots||0}/${province.totalBuildingSlots}</td>`);

			if (Guild_fights.showVPColumn) {
				content.push(Guild_fights.GetVPCell(province));
			}

			content.push('</tr>');
		}
		
		content.push('</tbody>');
		content.push('</table></div>');

		return content;
	},


	/**
	 * Initatite the Litepicker object
	 */
	intiateDatePicker: async () => {

		Guild_fights.LogDatePicker = new Litepicker({
			element: document.getElementById('gbgLogDatepicker'),
			format: 'YYYYMMDD',
			lang: MainParser.Language,
			singleMode: false,
			splitView: false,
			numberOfMonths: 1,
			numberOfColumns: 1,
			autoRefresh: true,
			minDate: moment.unix(Guild_fights.CurrentGBGRound).subtract(12, "d").toDate(),
			maxDate: moment.unix(Guild_fights.CurrentGBGRound).toDate(),
			startDate: moment.unix(Guild_fights.CurrentGBGRound).subtract(11, "d").toDate(),
			endDate: MainParser.getCurrentDateTime(),
			showWeekNumbers: false,
			onSelect: async (dateStart, dateEnd) => {
				Guild_fights.curDateFilter = moment(dateStart).format('YYYYMMDD');
				Guild_fights.curDateEndFilter = moment(dateEnd).format('YYYYMMDD');

				$('#gbgLogDatepicker').text(Guild_fights.formatRange());
				Guild_fights.curDetailViewFilter = { content: 'filter', gbground: Guild_fights.CurrentGBGRound };
				Guild_fights.BuildDetailViewContent(Guild_fights.curDetailViewFilter);

			}
		});
	},


	/**
	 * Formats the currently selected log date filter as a human readable range
	 *
	 * @returns {string}
	 */
	formatRange: () => {
		let text = undefined;
		let dateStart = moment(Guild_fights.curDateFilter);
		let dateEnd = moment(Guild_fights.curDateEndFilter);

		if (dateStart.isSame(dateEnd)) {
			text = `${dateStart.format(i18n('Date'))}`;
		}
		else if (dateStart.year() !== (dateEnd.year())) {
			text = `${dateStart.format(i18n('Date'))}` + ' - ' + `${dateEnd.format(i18n('Date'))}`;
		}
		else {
			text = `${dateStart.format(i18n('DateShort'))}` + ' - ' + `${dateEnd.format(i18n('Date'))}`;
		}

		return text;
	},


	/**
	 * Toggles the copy and discord buttons depending on the visible tab
	 * and the current row selection
	 */
	ToggleCopyButton: () => {
		$('.dcbutton').hide();
		$('.copybutton').show();

		if (!$('#nextup').is(':visible')) {
			$('.copybutton').hide();
			return;
		}

		if ($('.timer.highlight-row').length > 0) {
			$('.copybutton').html(i18n('Boxes.GuildFights.Copy'));
			$('.copybutton').removeClass('all');
			$('.dcbutton').show();
			if (Guild_fights.discordWebhook.bulkTemplate == "")
				$('.dcbutton.custom').hide();
		} else {
			$('.copybutton').html(i18n('Boxes.GuildFights.SelectAll'));
			$('.copybutton').addClass('all');
		}
	},


	/**
	 * Copies the selected sector timers to the clipboard, or selects all rows
	 * when the button is in "select all" mode. Attack color, focus target,
	 * attrition and victory points are appended according to the copy settings
	 *
	 * @param {Event} e Click event of the copy button
	 */
	CopyToClipBoard: (e) => {
		if (e.target.classList.contains('all')) {
			$('.timer').addClass('highlight-row');
			Guild_fights.ToggleCopyButton();
			return;
		}
		let copycache = [];
		$('.timer.highlight-row').each(function () {
			copycache.push(Guild_fights.MapData['map']['provinces'].find((mapItem) => mapItem.id == $(this).data('id')));
		});

		copycache.sort(function (a, b) { return a.lockedUntil - b.lockedUntil });

		let LiveFightSettings = JSON.parse(localStorage.getItem('LiveFightSettings'));
		// copyTileColors falls back to the former showTileColors switch it replaced
		let copyTileColors = LiveFightSettings?.copyTileColors ?? LiveFightSettings?.showTileColors ?? 1,
			copyAttrition = LiveFightSettings?.copyAttrition ?? 0,
			copyFocusTarget = LiveFightSettings?.copyFocusTarget ?? 0,
			copyVP = LiveFightSettings?.copyVP ?? 0;

		let copy = '';
		copycache.forEach((mapElem) => {
			let parts = [moment.unix(mapElem.lockedUntil - 2 - 60 * (Guild_fights.serverOffset || 0)).format('HH:mm')];

			if (copyTileColors === 1) {
				parts.push(mapElem.isAttackBattleType ? '🔴' : '🔵');
			}
			if (copyFocusTarget === 1 && Guild_fights.GetProvinceSignal(mapElem.id)?.signal === 'focus') {
				parts.push('🎯');
			}
			parts.push(mapElem.title);
			if (copyAttrition === 1) {
				let attrition = Guild_fights.GetEffectiveAttrition(mapElem);
				parts.push(attrition !== undefined ? `[${attrition}%]` : '[-]');
			}
			if (copyVP === 1) {
				parts.push(`${mapElem.victoryPoints || 0} VP`);
			}

			copy += parts.join(' ') + '\n';
		});

		if (copy !== '') {
			if (Guild_fights.serverOffset && localStorage.getItem('Guildfights.TimeZoneWarningShown') === null) { // show warning only once
				HTML.ShowToastMsg({
					head: i18n('Boxes.GuildFights.TimeZoneWarning.Title'),
					text: i18n('Boxes.GuildFights.TimeZoneWarning.Desc'),		
					type: 'error',
					hideAfter: 60000
				});
				localStorage.setItem('Guildfights.TimeZoneWarningShown', 'true');
			}
			helper.str.copyToClipboard(copy).then(() => {
				HTML.ShowToastMsg({
					head: i18n('Boxes.GuildFights.CopyToClipBoard.Title'),
					text: i18n('Boxes.GuildFights.CopyToClipBoard.Desc'),
					type: 'success',
					hideAfter: 5000
				});
			});
		}
	},


	/**
	 * Collects the selected sector rows sorted by unlock time and hands them
	 * over to the discord webhook integration
	 *
	 * @param {Event} e Click event of the discord button
	 */
	PrepareForDiscord: (e) => {
		Guild_fights.discordCache = [];
		$('.timer.highlight-row').each(function () {
			Guild_fights.discordCache.push(Guild_fights.MapData.map.provinces.find((mapItem) => mapItem.id == $(this).data('id')));
		});

		Guild_fights.discordCache.sort(function (a, b) { return a.lockedUntil - b.lockedUntil });

		if (Guild_fights.discordCache.length > 0) {
			if (e.target.classList.contains('custom')) {
				Discord.sendGBGSectorsCustom();
				return;
			}
			Discord.sendGBGSectors();
		}
	},


	/**
	 * Updates the countdown cell of a sector every second; when it reaches zero
	 * the interval is cleared and the row fades out after a short delay
	 *
	 * @param countDownDate moment object of the unlock time
	 * @param intervalID Interval handle to clear once the countdown finished
	 * @param id Province id the counter belongs to
	 */
	UpdateCounter: (countDownDate, intervalID, id) => {
		let idSpan = $(`#counter-${id}`),
			removeIt = false;

		if (countDownDate.isValid()) {
			let diff = countDownDate.diff(moment());

			if (diff <= 0) {
				removeIt = true;
			}
			else {
				idSpan.text(moment.utc(diff).format('HH:mm:ss'));
			}
		}
		else {
			removeIt = true;
		}

		if (removeIt) {
			clearInterval(intervalID);

			idSpan.text('');
			$(`#timer-${id}`).find('.time-static').html(`<strong class="text-success">!!</strong>`); // @ToDo: translate

			// remove timer after 5s
			setTimeout(() => {
				$(`#timer-${id}`).fadeToggle(function () {
					$(this).remove();
					Guild_fights.ToggleCopyButton();
				});
			}, 5000);
		}
	},


	/**
	 * Determine and assign colours of the individual guilds
	 */
	PrepareColors: () => {
		// ist schon fertig aufbereitet
		if (Guild_fights.SortedColors !== null) {
			return;
		}

		let colors = [],
			gbgGuilds = Guild_fights.MapData['battlegroundParticipants'];

		for (let i in gbgGuilds) {
			if (!gbgGuilds.hasOwnProperty(i)) {
				break;
			}

			let c = null;

			if (gbgGuilds[i]['clan']['id'] === ExtGuildID) {
				c = Guild_fights.Colors.find(o => (o['id'] === 'own_guild_colour'));
			} else {
				c = Guild_fights.Colors.find(o => (o['id'] === gbgGuilds[i]['colour']));
			}

			colors.push({
				id: gbgGuilds[i]['participantId'],
				cid: c['id'],
				base: c['base'],
				main: c['mainColour'],
				highlight: c['highlight'],
				shadow: c['shadow']
			});
		}

		Guild_fights.SortedColors = colors;
	},


	/**
	 * Real time update of the map box
	 */
	RefreshTable: (data) => {
		if (data.lockedUntil) {
			let $province = $(`#province-${data['id']}`),
				elements = $province.find('.attack').length;

			$(`.attack-${data['id']}`).fadeToggle(function () {
				$(this).remove();
			});

			if (elements === 1) {
				$province.fadeToggle(function () {
					$(this).remove();
				});
			}

			// search the province for owner update
			ProvinceMap.Provinces.forEach((province, index) => {
				if (province.id === data['id']) {
					let colors = ProvinceMap.getSectorColors(data['ownerId']);

					if(colors) {
						province.owner.id = data['ownerId'];
						province.owner.colors = colors;
					}
				}
			});

			return;
		}

		for (let i in data['conquestProgress']) {
			if (!data['conquestProgress'].hasOwnProperty(i)) {
				break;
			}

			if (!data['id']) {
				data['id'] = 0; // A1 delivers no ID, set to 0
			}

			let d = data['conquestProgress'][i],
				max = d['maxProgress'],
				progess = d['progress'],
				cell = $(`tr#province-${data['id']}`),
				pColor = ProvinceMap.getSectorColors(Guild_fights.MapData.map?.provinces[data.id]?.ownerId),
				p = Guild_fights.MapData['battlegroundParticipants'].find(o => (o['participantId'] === d['participantId']));

			// <tr> is not present, create it
			if (cell.length === 0) {
				let newCell = $('<tr />').attr({
					id: `province-${data['id']}`,
					'data-id': data['id']
				});

				let mD = Guild_fights.MapData['map']['provinces'].find(d => d.id === data['id']);
				let provinceColor = pColor['main'] || 'rgba(0,0,0,0)';

				$('#progress').find('table.foe-table').prepend(
					newCell.append(
						$('<td />').append(
							$('<span />').css({ 'background-color': ((!provinceColor) ? '#555':provinceColor['main'])}).attr({ class: 'province-color' }),
							$('<b />').text(mD['title']),
						),
						(Guild_fights.showGuildColumn ? $('<td />').text(p['clan']['name']) : ''),
						$('<td />').attr({
							field: `${data['id']}-${data['ownerId']}`,
							class: 'guild-progress'
						}),
						$('<td />').attr({
							field: `${data['id']}-${data['ownerId']}`,
							class: 'required-progress'
						}).text(data['conquestProgress'][0].maxProgress))
					);

				cell = $(`#province-${data['id']}`);
			}

			cell.removeClass('pulse');

			if (cell.find('.attacker-' + d['participantId']).length > 0) {
				cell.find('.attacker-' + d['participantId']).text(progess);
			}
			else {
				let color = Guild_fights.SortedColors.find(e => e['id'] === p['participantId']);

				cell.find('.guild-progress').append(
					$('<span />').attr({
						class: `attack attacker-${d['participantId']} gbg-${color['cid']}`
					})
				);
			}

			cell.addClass('pulse');

			setTimeout(() => {
				cell.removeClass('pulse');
			}, 1200);
		}
	},


	/**
	 * Renders the settings pane of the player box (round selector, filters, export)
	 */
	ShowPlayerBoxSettings: () => {
		let c = [];
		let Settings = Guild_fights.PlayerBoxSettings;
		c.push(`<p class="text-left"><span class="settingtitle">${i18n('Boxes.GuildFights.Title')}</span>` +
			`<input id="gf_showRoundSelector" name="showroundswitcher" value="1" type="checkbox" ${(Settings.showRoundSelector === 1) ? ' checked="checked"' : ''} /> <label for="gf_showRoundSelector">${i18n('Boxes.GuildFights.ShowRoundSelector')}</label></p>`);
		c.push(`<p class="text-left"><input id="gf_showProgressFilter" name="showprogressfilter" value="1" type="checkbox" ${(Settings.showProgressFilter === 1) ? ' checked="checked"' : ''} /> <label for="gf_showProgressFilter">${i18n('Boxes.GuildFights.ShowProgressFilter')}</label></p>`);
		c.push(`<p class="text-left"><input id="gf_showLogButton" name="showlogbutton" value="1" type="checkbox" ${(Settings.showLogButton === 1) ? ' checked="checked"' : ''} /> <label for="gf_showLogButton">${i18n('Boxes.GuildFights.ShowLogButton')}</label></p>`);
		c.push(`<p><button id="save-GuildFightsPlayerBox-settings" class="btn" style="width:100%" onclick="Guild_fights.PlayerBoxSettingsSaveValues()">${i18n('Boxes.General.Save')}</button></p>`);
		c.push(`<hr><p>${i18n('Boxes.General.Export')}: <span class="btn-group"><button class="btn" onclick="HTML.ExportTable($('#GildPlayersTable'),'csv','GBG-PlayerList')" title="${HTML.i18nTooltip(i18n('Boxes.General.ExportCSV'))}">CSV</button>`);
		c.push(`<button class="btn" onclick="HTML.ExportTable($('#GildPlayersTable'),'json','GBG-PlayerList')" title="${HTML.i18nTooltip(i18n('Boxes.General.ExportJSON'))}">JSON</button></span></p>`);

		$('#GildPlayersSettingsBox').html(c.join(''));
	},


	/**
	 * Persists the player box settings to localStorage and re-renders the box
	 */
	PlayerBoxSettingsSaveValues: () => {
		Guild_fights.PlayerBoxSettings.showRoundSelector = $("#gf_showRoundSelector").is(':checked') ? 1 : 0;
		Guild_fights.PlayerBoxSettings.showProgressFilter = $("#gf_showProgressFilter").is(':checked') ? 1 : 0;
		Guild_fights.PlayerBoxSettings.showLogButton = $("#gf_showLogButton").is(':checked') ? 1 : 0;

		localStorage.setItem('GuildFightsPlayerBoxSettings', JSON.stringify(Guild_fights.PlayerBoxSettings));

		$(`#GildPlayersSettingsBox`).fadeToggle('fast', function () {
			$(this).remove();
			Guild_fights.BuildPlayerContent(Guild_fights.CurrentGBGRound);
		});
	},


	/**
	 * Fetches all alerts of the gbg category and maps them onto the current
	 * provinces into Guild_fights.Alerts
	 *
	 * @returns {Promise<void>}
	 */
	GetAlerts: async () => {
		return new Promise(async (resolve, reject) => {
			// is alert.js included?
			if (!Alerts) {
				resolve();
			}

			// fetch all alerts and search the id
			return Alerts.getAll().then((resp) => {
				if (resp.length === 0) {
					resolve();
				}

				let currentTime = MainParser.getCurrentDateTime();

				Guild_fights.Alerts = [];

				resp.forEach((alert) => {
					if (alert['data']['category'] === 'gbg')
					{
						let alertTime = alert['data']['expires'],
							name = alert['data']['title'],
							prov = Guild_fights.MapData['map']['provinces'].find(
								e => e.title === name && alertTime > currentTime
							);

						if (prov !== undefined)
						{
							Guild_fights.Alerts.push({ provId: prov['id'], alertId: alert.id });
						}
					}
				});
				resolve();
			});
		});
	},


	/**
	 * Creates a browser alert that fires the configured lead time before the
	 * given sector unlocks
	 *
	 * @param id Province id
	 */
	SetAlert: (id) => {
		let prov = Guild_fights.MapData['map']['provinces'].find(e => e.id === id);

		const data = {
			title: prov.title,
			body: HTML.i18nReplacer(i18n('Boxes.GuildFights.SaveAlert'), { provinceName: prov.title }),
			expires: (prov.lockedUntil - Guild_fights.alertLeadTime) * 1000, // configurable lead time in seconds * milliseconds
			repeat: -1,
			persistent: true,
			tag: '',
			category: 'gbg',
			vibrate: false,
			actions: null
		};

		MainParser.sendExtMessage({
			type: 'alerts',
			playerId: ExtPlayerID,
			action: 'create',
			data: data,
		}).then((aId) => {
			Guild_fights.Alerts.push({ provId: id, alertId: aId });
			$(`#alert-${id}`).html(Guild_fights.GetAlertButton(id));
			$('.tooltip').remove();
			HTML.ShowToastMsg({
				head: i18n('Boxes.GuildFights.SaveMessage.Title'),
				text: HTML.i18nReplacer(i18n('Boxes.GuildFights.SaveMessage.Desc'), { provinceName: prov.title }),
				type: 'success',
				hideAfter: 5000
			});
		});
	},


	/**
	 * Deletes the alert of the given province and refreshes its alert button
	 *
	 * @param provId
	 */
	DeleteAlert: (provId) => {
		let prov = Guild_fights.MapData['map']['provinces'].find(e => e.id === provId);
		let alert = Guild_fights.Alerts.find((a) => a.provId == provId);
		MainParser.sendExtMessage({
			type: 'alerts',
			playerId: ExtPlayerID,
			action: 'delete',
			id: alert.alertId,
		}).then(() => {
			Guild_fights.Alerts = Guild_fights.Alerts.filter((a) => a.provId != provId);
			$('.tooltip').remove();
			HTML.ShowToastMsg({
				head: i18n('Boxes.GuildFights.DeleteMessage.Title'),
				text: HTML.i18nReplacer(i18n('Boxes.GuildFights.DeleteMessage.Desc'), { provinceName: prov.title }),
				type: 'success',
				hideAfter: 5000
			});
			$(`#alert-${provId}`).html(Guild_fights.GetAlertButton(provId));
		});
	},


	/**
	 * Renders the settings pane of the live fight box (columns, filters,
	 * server time, alert lead time and discord webhooks)
	 */
	ShowLiveFightSettings: () => {
		let c = [];
		let LiveFightSettings = JSON.parse(localStorage.getItem('LiveFightSettings'));
		let showGuildColumn = (LiveFightSettings && LiveFightSettings.showGuildColumn !== undefined) ? LiveFightSettings.showGuildColumn : 0;
		let showAdjacentSectors = (LiveFightSettings && LiveFightSettings.showAdjacentSectors !== undefined) ? LiveFightSettings.showAdjacentSectors : 1;
		let showOwnSectors = (LiveFightSettings && LiveFightSettings.showOwnSectors !== undefined) ? LiveFightSettings.showOwnSectors : 0;
		let showVPColumn = LiveFightSettings?.showVPColumn ?? 0;
		let showAttritionColumn = LiveFightSettings?.showAttritionColumn ?? 1;
		let showFocusTarget = LiveFightSettings?.showFocusTarget ?? 1;
		// copyTileColors falls back to the former showTileColors switch it replaced
		let copyTileColors = LiveFightSettings?.copyTileColors ?? LiveFightSettings?.showTileColors ?? 1;
		let copyAttrition = LiveFightSettings?.copyAttrition ?? 0;
		let copyFocusTarget = LiveFightSettings?.copyFocusTarget ?? 0;
		let copyVP = LiveFightSettings?.copyVP ?? 0;
		let showServerTime = LiveFightSettings?.showServerTime ?? 0;
		let alertLeadTime = LiveFightSettings?.alertLeadTime ?? 30;
		let discordWebhook = LiveFightSettings?.discordWebhook ?? '';
		let discordWebhookTemplate = LiveFightSettings?.discordWebhookTemplate ?? '';
		let discordWebhookTemplateBulk = LiveFightSettings?.discordWebhookTemplateBulk ?? '';

		c.push(`<p><input id="showguildcolumn" name="showguildcolumn" value="1" type="checkbox" ${(showGuildColumn === 1) ? ' checked="checked"' : ''} /> <label for="showguildcolumn">${i18n('Boxes.GuildFights.ShowOwner')}</label></p>`);
		c.push(`<p><label for="showAdjacentSectors"><input id="showAdjacentSectors" name="showAdjacentSectors" value="0" type="checkbox" ${(showAdjacentSectors === 1) ? ' checked="checked"' : ''} /> ${i18n('Boxes.GuildFights.ShowAdjacentSectors')}</label></p>`);
		c.push(`<p><label for="showownsectors"><input id="showownsectors" name="showownsectors" value="0" type="checkbox" ${(showOwnSectors === 1) ? ' checked="checked"' : ''} /> ${i18n('Boxes.GuildFights.ShowOwnSectors')}</label></p>`);
		c.push(`<p><label for="showvpcolumn"><input id="showvpcolumn" name="showvpcolumn" value="0" type="checkbox" ${(showVPColumn === 1) ? ' checked="checked"' : ''} /> ${i18n('Boxes.GuildFights.ShowVPColumn')}</label></p>`);
		c.push(`<p><label for="showattritioncolumn"><input id="showattritioncolumn" name="showattritioncolumn" value="0" type="checkbox" ${(showAttritionColumn === 1) ? ' checked="checked"' : ''} /> ${i18n('Boxes.GuildFights.ShowAttritionColumn')}</label></p>`);
		c.push(`<p><label for="showfocustarget"><input id="showfocustarget" name="showfocustarget" value="0" type="checkbox" ${(showFocusTarget === 1) ? ' checked="checked"' : ''} /> ${i18n('Boxes.GuildFights.ShowFocusTarget')}</label></p>`);

		c.push(`<hr><p class="settingtitle">${i18n('Boxes.GuildFights.CopyElements')}</p>`);
		c.push(`<p class="copy-setting"><label for="copytilecolors"><input id="copytilecolors" name="copytilecolors" value="0" type="checkbox" ${(copyTileColors === 1) ? ' checked="checked"' : ''} /> ${i18n('Boxes.GuildFights.CopyTileColors')}</label></p>`);
		c.push(`<p class="copy-setting"><label for="copyattrition"><input id="copyattrition" name="copyattrition" value="0" type="checkbox" ${(copyAttrition === 1) ? ' checked="checked"' : ''} /> ${i18n('Boxes.GuildFights.Attrition')}</label></p>`);
		c.push(`<p class="copy-setting"><label for="copyfocustarget"><input id="copyfocustarget" name="copyfocustarget" value="0" type="checkbox" ${(copyFocusTarget === 1) ? ' checked="checked"' : ''} /> ${i18n('Boxes.GuildFights.FocusTarget')} (🎯)</label></p>`);
		c.push(`<p class="copy-setting"><label for="copyvp"><input id="copyvp" name="copyvp" value="0" type="checkbox" ${(copyVP === 1) ? ' checked="checked"' : ''} /> ${i18n('Boxes.GuildFights.CopyVP')}</label></p>`);
		c.push(`<hr><p><label for="showservertime"><input id="showservertime" name="showservertime" value="0" type="checkbox" ${(showServerTime === 1) ? ' checked="checked"' : ''} /> ${i18n('Boxes.GuildFights.ShowServerTime')}</label></p>`);
		c.push(`<p><label for="serverOffset">${i18n('Boxes.GuildFights.serverOffset')}<input id="serverOffset" name="serverOffset" value="${Guild_fights.serverOffset??""}" type="text" maxlength="5" size = "5"/></label></p>`);
		c.push(`<hr><p><label for="alertLeadTime">${i18n('Boxes.GuildFights.AlertLeadTime')} <input id="alertLeadTime" name="alertLeadTime" value="${alertLeadTime}" type="number" min="5" max="3600" step="5" size="6"/></label></p>`);

		c.push(`<hr><p>`);
			c.push(`<label for="gbgWebhook"><b>${i18n('Menu.Discord.Title')}</b></label><br />`);
			if (Discord.WebHooksUrls.length === 0)
				c.push(`${i18n('Boxes.GuildFights.DiscordSetup')}: <span class="btn btn-slim" onclick="Discord.BuildBox()">${i18n('General.Open')}</span>`);
			else {
				c.push(`<select id="gbgWebhook" name="gbgWebhook">`);
				c.push(`<option value="">${i18n('General.Choose')}</option>`);
				for(let url of Discord.WebHooksUrls) {
					c.push(`<option value="${url.url}" ${discordWebhook === url.url ? ' selected="selected"' : ''}>${url.name}</option>`);
				}
			c.push(`</select>`);
			}
			let templates = Discord.WebHooks.filter(x => x.type == "template");
			if (Discord.WebHooksUrls.length !== 0 && templates.length != 0) {
				c.push(`<select id="gbgWebhookTemplate" name="gbgWebhookTemplate">`);
				c.push(`<option value="">${i18n('Boxes.Discord.TitleNewTemplate')}</option>`);
				for(let tpl of templates) {
					c.push(`<option value="${tpl.name}" ${discordWebhookTemplate === tpl.name ? ' selected="selected"' : ''}>${tpl.name}</option>`);
				}
			c.push(`</select>`);}
			if (Discord.WebHooksUrls.length !== 0 && templates.length != 0) {
				c.push(`<select id="gbgWebhookTemplateBulk" name="gbgWebhookTemplateBulk">`);
				c.push(`<option value="">${i18n('Boxes.GuildFights.DiscordTemplateBulk')}</option>`);
				for(let tpl of templates) {
					c.push(`<option value="${tpl.name}" ${discordWebhookTemplateBulk === tpl.name ? ' selected="selected"' : ''}>${tpl.name}</option>`);
				}
			c.push(`</select>`);}
			c.push(`</p>`);
		c.push(`<p><button onclick="Guild_fights.SaveLiveFightSettings()" id="save-livefight-settings" class="btn btn-green">${i18n('Boxes.GuildFights.SaveSettings')}</button></p>`);

		
		$('#LiveGildFightingSettingsBox').html(c.join(''));
	},


	/**
	 * Persists the live fight settings to localStorage and rebuilds the box
	 */
	SaveLiveFightSettings: () => {
		let value = {};

		value.showGuildColumn = 0;
		value.showAdjacentSectors = 0;
		value.showOwnSectors = 0;
		value.copyTileColors = 0;
		value.copyAttrition = 0;
		value.copyFocusTarget = 0;
		value.copyVP = 0;
		value.showVPColumn = 0;
		value.showAttritionColumn = 0;
		value.showFocusTarget = 0;
		value.showServerTime = 0;
		value.discordWebhook = '';
		value.discordWebhookTemplate = '';
		value.discordWebhookTemplateBulk = '';

		if ($("#showguildcolumn").is(':checked')) {
			value.showGuildColumn = 1;
		}

		if ($("#showAdjacentSectors").is(':checked')) {
			value.showAdjacentSectors = 1;
		}

		if ($("#showownsectors").is(':checked')) {
			value.showOwnSectors = 1;
		}

		if ($("#copytilecolors").is(':checked')) {
			value.copyTileColors = 1;
		}

		if ($("#copyattrition").is(':checked')) {
			value.copyAttrition = 1;
		}

		if ($("#copyfocustarget").is(':checked')) {
			value.copyFocusTarget = 1;
		}

		if ($("#copyvp").is(':checked')) {
			value.copyVP = 1;
		}

		if ($("#showvpcolumn").is(':checked')) {
			value.showVPColumn = 1;
		}

		if ($("#showattritioncolumn").is(':checked')) {
			value.showAttritionColumn = 1;
		}

		if ($("#showfocustarget").is(':checked')) {
			value.showFocusTarget = 1;
		}

		if ($("#showservertime").is(':checked')) {
			value.showServerTime = 1;
		}

		value.discordWebhook = $("#gbgWebhook").val();
		value.discordWebhookTemplate = $("#gbgWebhookTemplate").val();
		value.discordWebhookTemplateBulk = $("#gbgWebhookTemplateBulk").val();

		// lead time for sector alerts in seconds, clamped to the input range (#3511)
		let alertLeadTime = parseInt($("#alertLeadTime").val());
		if (isNaN(alertLeadTime)) alertLeadTime = 30;
		value.alertLeadTime = Math.min(Math.max(alertLeadTime, 5), 3600);

		Guild_fights.showGuildColumn = value.showGuildColumn;
		Guild_fights.showAdjacentSectors = value.showAdjacentSectors;
		Guild_fights.showOwnSectors = value.showOwnSectors;
		Guild_fights.showVPColumn = value.showVPColumn;
		Guild_fights.showAttritionColumn = value.showAttritionColumn;
		Guild_fights.showFocusTarget = value.showFocusTarget;
		Guild_fights.showServerTime = value.showServerTime;
		Guild_fights.discordWebhook.url = value.discordWebhook;
		Guild_fights.discordWebhook.template = value.discordWebhookTemplate;
		Guild_fights.discordWebhook.bulkTemplate = value.discordWebhookTemplateBulk;
		Guild_fights.alertLeadTime = value.alertLeadTime;
		Guild_fights.serverOffset = parseInt($("#serverOffset").val()) ?? null;

		if (Guild_fights.serverOffset != null) {
			localStorage.setItem('GuildFights.serverOffset', JSON.stringify(Guild_fights.serverOffset))
		}
		else {
			localStorage.removeItem('GuildFights.serverOffset');
		}

		localStorage.setItem('LiveFightSettings', JSON.stringify(value));

		$(`#LiveGildFightingSettingsBox`).fadeToggle('fast', function () {
			$.when($(`#LiveGildFightingSettingsBox`).remove()).then(
				Guild_fights.ShowGuildBox(true)
			);
		});
	},	
};
