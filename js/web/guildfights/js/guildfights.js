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

// GBG province names
FoEproxy.addMetaHandler('guild_battleground_maps', (xhr, postData) => {
	GuildFights.ProvinceNames = JSON.parse(xhr.responseText);
});

// GBG province colors
FoEproxy.addMetaHandler('battleground_colour', (xhr, postData) => {
	GuildFights.Colors = JSON.parse(xhr.responseText);
	GuildFights.PrepareColors();
});

// GBG leaderboards
FoEproxy.addHandler('GuildBattlegroundService', 'getPlayerLeaderboard', (data, postData) => {
	GuildFights.HandlePlayerLeaderboard(data.responseData);
});

// GBG Commands (stops and targets)
FoEproxy.addWsHandler('GuildBattlegroundSignalsService', 'updateSignal', data => {
	return;
	if ($('#GBGTargets').length === 0) {
		$('body').append('<div id="GBGTargets"></div>');
	}
	if (data.responseData.signal === "focus") {
		let provinceId = data.responseData.provinceId||0;
		let provinceName = GuildFights.MapData.map.provinces.find(x => x.id === provinceId);
		$(`<div><small>Next Target</small><span><img src="${srcLinks.get(`/guild_battlegrounds/map/shared/guild_battlegrounds_target.png`,true)}"/> <b>${provinceName?.title}</b></span></div>`)
			.appendTo("#GBGTargets").fadeOut(12000, function(){ $(this).remove();})
	}
});

// Gildengefechte
FoEproxy.addHandler('GuildBattlegroundStateService', 'getState', (data, postData) => {
	GuildFights.GlobalRankingTimeout = setTimeout(()=>{
		if (data.responseData['stateId'] !== 'participating')	{
			GuildFights.CurrentGBGRound = parseInt(data.responseData['startsAt']) - 259200;

			if (GuildFights.curDateFilter === null || GuildFights.curDateEndFilter === null) {
				GuildFights.curDateFilter = moment.unix(GuildFights.CurrentGBGRound).subtract(11, 'd').format('YYYYMMDD');
				GuildFights.curDateEndFilter = moment.unix(GuildFights.CurrentGBGRound).format('YYYYMMDD');
			}

			GuildFights.HandlePlayerLeaderboard(data.responseData['playerLeaderboardEntries']);
		}
	},500)
});

FoEproxy.addHandler('RankingService', 'searchRanking', (data, postData) => {
	clearTimeout(GuildFights.GlobalRankingTimeout);
});

// Gildengefechte - Map, Gilden
FoEproxy.addHandler('GuildBattlegroundService', 'getBattleground', (data, postData) => {
	GuildFights.init();
	GuildFights.CurrentGBGRound = data['responseData']['endsAt'];

	if (GuildFights.curDateFilter === null || GuildFights.curDateEndFilter === null) {
		GuildFights.curDateFilter = moment.unix(GuildFights.CurrentGBGRound).subtract(11, 'd').format('YYYYMMDD');
		GuildFights.curDateEndFilter = MainParser.getCurrentDateTime();
	}

	GuildFights.MapData = data['responseData'];

	$('#gildFight-Btn').removeClass('hud-btn-red');
	$('#selectorCalc-Btn-closed').remove();

	if ($('#ProvinceMap').length > 0) {
		ProvinceMap.RefreshSector();
	}

	// update box when open
	if ($('#LiveGildFighting').length > 0) {
		GuildFights.BuildFightContent();
	}
});
FoEproxy.addHandler('TimerService', 'getTimers', (data, postData) => {
	if (GuildFights.serverOffset !== null) return;
	data.responseData.filter(t=>t.type=="battlegroundsAttrition").forEach(t=>{
		if (!t.time) return;
		serverMidnight = moment.unix(t.time);

		GuildFights.serverOffset = serverMidnight.format("HH")*60
									+ serverMidnight.format("mm")*1;
		//console.log("GuildFights.serverOffset", GuildFights.serverOffset);
	})
});

/**
 * @type {{Alerts: *[], GlobalRankingTimeout: null, PrevAction: null, PrevActionTimestamp: null, NewAction: null, NewActionTimestamp: null, MapData: null, Neighbours: *[], PlayersPortraits: null, Colors: null, SortedColors: null, ProvinceNames: null, InjectionLoaded: boolean, PlayerBoxContent: *[], CurrentGBGRound: null, GBGRound: null, GBGAllRounds: null, GBGHistoryView: boolean, LogDatePicker: null, curDateFilter: null, curDateEndFilter: null, curDetailViewFilter: null, PlayerBoxSettings: {showRoundSelector: number, showLogButton: number, showProgressFilter: number, showOnlyActivePlayers: number}, showGuildColumn: number, showAdjacentSectors: number, showOwnSectors: number, Tabs: *[], TabsContent: *[], checkForDB: ((function(*): Promise<void>)|*), init: GuildFights.init, HandlePlayerLeaderboard: ((function(*): Promise<void>)|*), UpdateDB: ((function(*, *): Promise<void>)|*), SetBoxNavigation: ((function(*): Promise<void>)|*), ToggleProgressList: GuildFights.ToggleProgressList, SetTabs: GuildFights.SetTabs, GetTabs: (function(): string), SetTabContent: GuildFights.SetTabContent, GetTabContent: (function(): string), GetAlertButton: (function(Intl.NumberFormatPartTypeRegistry.integer): string), ShowGuildBox: GuildFights.ShowGuildBox, ShowPlayerBox: GuildFights.ShowPlayerBox, ShowDetailViewBox: GuildFights.ShowDetailViewBox, BuildPlayerContent: ((function(*): Promise<void>)|*), BuildDetailViewContent: ((function(*): Promise<void>)|*), DeleteOldSnapshots: ((function(*): Promise<void>)|*), BuildDetailViewLog: ((function(*): Promise<void>)|*), BuildFightContent: GuildFights.BuildFightContent, BuildProgressTab: (function(): *[]), BuildNextUpTab: (function(): *[]), intiateDatePicker: ((function(): Promise<void>)|*), formatRange: (function(): string), ToggleCopyButton: GuildFights.ToggleCopyButton, CopyToClipBoard: GuildFights.CopyToClipBoard, UpdateCounter: GuildFights.UpdateCounter, PrepareColors: GuildFights.PrepareColors, RefreshTable: GuildFights.RefreshTable, ShowPlayerBoxSettings: GuildFights.ShowPlayerBoxSettings, PlayerBoxSettingsSaveValues: GuildFights.PlayerBoxSettingsSaveValues, GetAlerts: (function(): Promise<unknown>), SetAlert: GuildFights.SetAlert, DeleteAlert: GuildFights.DeleteAlert, ShowLiveFightSettings: GuildFights.ShowLiveFightSettings, SaveLiveFightSettings: GuildFights.SaveLiveFightSettings}}
 */
let GuildFights = {

	Alerts: [],
	GlobalRankingTimeout:null,
	PrevAction: null,
	PrevActionTimestamp: null,
	NewAction: null,
	NewActionTimestamp: null,
	MapData: null,
	Neighbours: [],
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
	showAdjacentSectors: 0,
	showOwnSectors: 0,
	serverOffset: JSON.parse(localStorage.getItem("GuildFights.serverOffset")||"null"),

	Tabs: [],
	TabsContent: [],

	/**
	 *
	 * @returns {Promise<void>}
	 */
	checkForDB: async (playerID) => {

		const DBName = `FoeHelperDB_GuildFights_${playerID}`;

		GuildFights.db = new Dexie(DBName);

		GuildFights.db.version(1).stores({
			snapshots: '&[player_id+gbground+time],[gbground+player_id], [date+player_id], gbground',
			history: '&gbground'
		});

		GuildFights.db.open();
	},

	init: () => {
		// moment.js global set
		//moment.locale(MainParser.Language);

		GuildFights.GetAlerts();

		if (GuildFights.InjectionLoaded === false) {
			FoEproxy.addWsHandler('GuildBattlegroundService', 'all', data => {
				if (!data['responseData']?.[0]) return
				let Pid = data.responseData[0].id || 0;
				for (let x in data.responseData[0]) {
					if (!data.responseData[0].hasOwnProperty(x) || x === "id") continue;
					GuildFights.MapData.map.provinces[Pid][x] = data.responseData[0][x];
				}

				// Update Tables
				if ($('#LiveGildFighting').length > 0) {
					GuildFights.RefreshTable(data['responseData'][0]);
				}

				// Update Minimap
				if($('#ProvinceMap').length > 0) {
					ProvinceMap.RefreshSector(data['responseData'][0]);
				}
			});
			GuildFights.InjectionLoaded = true;
		}
	},


	/**
	 * @param d
	 * @returns {Promise<void>}
	 */
	HandlePlayerLeaderboard: async (d) => {
		// immer zwei vorhalten, für Referenz Daten (LiveUpdate)
		if (localStorage.getItem('GuildFights.NewAction') !== null)
		{
			GuildFights.PrevAction = JSON.parse(localStorage.getItem('GuildFights.NewAction'));
			GuildFights.PrevActionTimestamp = parseInt(localStorage.getItem('GuildFights.NewActionTimestamp'));
		}
		else if (GuildFights.NewAction !== null)
		{
			GuildFights.PrevAction = GuildFights.NewAction;
			GuildFights.PrevActionTimestamp = GuildFights.NewActionTimestamp;
		}

		let players = [];
		let sumNegotiations = 0;
		let sumBattles = 0;
		let sumAttrition = 0;

		for (let i in d)
		{

			if (!d.hasOwnProperty(i))
			{
				break;
			}
			sumNegotiations += d[i]['negotiationsWon'] || 0;
			sumBattles += d[i]['battlesWon'] || 0;
			sumAttrition += d[i]['attrition'] || 0;

			players.push({
				gbground: GuildFights.CurrentGBGRound,
				rank: i * 1 + 1,
				player_id: d[i]['player']['player_id'],
				name: d[i]['player']['name'],
				avatar: d[i]['player']['avatar'],
				battlesWon: d[i]['battlesWon'] || 0,
				negotiationsWon: d[i]['negotiationsWon'] || 0,
				attrition: d[i]['attrition'] || 0
			});
		}

		await GuildFights.UpdateDB('history', { participation: players, sumNegotiations: sumNegotiations, sumBattles: sumBattles });

		GuildFights.GBGHistoryView = false;
		GuildFights.NewAction = players;
		localStorage.setItem('GuildFights.NewAction', JSON.stringify(GuildFights.NewAction));

		GuildFights.NewActionTimestamp = moment().unix();
		localStorage.setItem('GuildFights.NewActionTimestamp', GuildFights.NewActionTimestamp);

		if ($('#GildPlayers').length > 0)
		{
			GuildFights.BuildPlayerContent(GuildFights.CurrentGBGRound);
		}
		else
		{
			GuildFights.ShowPlayerBox();
		}
	},


	/**
	 * @param content
	 * @param data
	 * @returns {Promise<void>}
	 */
	UpdateDB: async (content, data) => {

		if (content === 'history')
		{
			await GuildFights.db.history.put({ 
					gbground: GuildFights.CurrentGBGRound, 
					sumNegotiations: data.sumNegotiations, 
					sumBattles: data.sumBattles, 
					participation: data.participation 
				});
		}

		if (content === 'player')
		{

			let battles = 0,
				negotiations = 0,
				attrition = 0;

			let CurrentSnapshot = await GuildFights.db.snapshots
				.where({
					gbground: GuildFights.CurrentGBGRound,
					player_id: data.player_id
				})
				.first();

			if (CurrentSnapshot === undefined)
			{
				battles = data.battles;
				negotiations = data.negotiations;
				attrition = data.attrition;
			}
			else
			{
				battles = data.diffbat;
				negotiations = data.diffneg;
				attrition = data.diffattr;
			}

			await GuildFights.db.snapshots.add({
				gbground: GuildFights.CurrentGBGRound,
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
	 * @param gbground
	 * @returns {Promise<void>}
	 */
	SetBoxNavigation: async (gbground) => {
		let h = [];
		let i = 0;
		let PlayerBoxSettings = JSON.parse(localStorage.getItem('GuildFightsPlayerBoxSettings')) || '{}';

		GuildFights.PlayerBoxSettings.showRoundSelector = (PlayerBoxSettings.showRoundSelector !== undefined) ? PlayerBoxSettings.showRoundSelector : GuildFights.PlayerBoxSettings.showRoundSelector;
		GuildFights.PlayerBoxSettings.showLogButton = (PlayerBoxSettings.showLogButton !== undefined) ? PlayerBoxSettings.showLogButton : GuildFights.PlayerBoxSettings.showLogButton;
		GuildFights.PlayerBoxSettings.showProgressFilter = (PlayerBoxSettings.showProgressFilter !== undefined) ? PlayerBoxSettings.showProgressFilter : GuildFights.PlayerBoxSettings.showProgressFilter;

		if (GuildFights.GBGAllRounds === undefined || GuildFights.GBGAllRounds === null)
		{
			// get all available GBG entires
			const gbgRounds = await GuildFights.db.history.where('gbground').above(0).keys();
			gbgRounds.sort(function (a, b) { return b - a });
			GuildFights.GBGAllRounds = gbgRounds;

		}

		//set latest GBG round to show if available and no specific GBG round is set
		if (!gbground && GuildFights.GBGAllRounds && GuildFights.GBGAllRounds.length)
		{
			gbground = GuildFights.GBGAllRounds[i];
		}

		if (gbground && GuildFights.GBGAllRounds && GuildFights.GBGAllRounds.length)
		{
			let index = GuildFights.GBGAllRounds.indexOf(gbground);
			let previousweek = GuildFights.GBGAllRounds[index + 1] || null;
			let nextweek = GuildFights.GBGAllRounds[index - 1] || null;

			h.push(`<div id="gbg_roundswitch" class="roundswitch dark-bg">`);

			if (GuildFights.PlayerBoxSettings.showRoundSelector)
			{
				h.push(`${i18n('Boxes.GuildMemberStat.GBFRound')} <button class="btn btn-set-week" data-week="${previousweek}"${previousweek === null ? ' disabled' : ''}>&lt;</button> `);
				h.push(`<select id="gbg-select-gbground">`);

				GuildFights.GBGAllRounds.forEach(week => {
					h.push(`<option value="${week}"${gbground === week ? ' selected="selected"' : ''}>` + moment.unix(week).subtract(11, 'd').format(i18n('Date')) + ` - ` + moment.unix(week).format(i18n('Date')) + `</option>`);
				});

				h.push(`</select>`);
				h.push(`<button class="btn btn-set-week last" data-week="${nextweek}"${nextweek === null ? ' disabled' : ''}>&gt;</button>`);
			}

			if (gbground === GuildFights.CurrentGBGRound)
			{
				h.push(`<div id="gbgLogFilter">`);
				if (GuildFights.PlayerBoxSettings.showProgressFilter === 1)
				{
					h.push(`<button id="gbg_filterProgressList" title="${HTML.i18nTooltip(i18n('Boxes.GuildFights.ProgressFilterDesc'))}" class="btn" disabled>&#8593;</button>`);
				}

				if (GuildFights.PlayerBoxSettings.showLogButton === 1)
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

				GuildFights.GBGHistoryView = true;
				let week = $(this).data('week');

				if (!GuildFights.GBGAllRounds.includes(week))
				{
					return;
				};

				GuildFights.BuildPlayerContent(week);
			});

			$('#gbg-select-gbground').off().on('change', function () {

				GuildFights.GBGHistoryView = true;
				let week = parseInt($(this).val());

				if (!GuildFights.GBGAllRounds.includes(week) || week === GuildFights.CurrentGBGRound)
				{
					return;
				};

				GuildFights.BuildPlayerContent(week);
			});

			$('button#gbg_showLog').off('click').on('click', function () {
				GuildFights.curDetailViewFilter = { content: 'filter', gbground: GuildFights.CurrentGBGRound };
				GuildFights.ShowDetailViewBox(GuildFights.curDetailViewFilter)
			});

			$('button#gbg_filterProgressList').on('click', function () {
				GuildFights.ToggleProgressList('gbg_filterProgressList');
			});
		});

	},


	/**
	 * Filters the list for players with new progress
	 * @param id
	 */
	ToggleProgressList: (id) => {

		let elem = $('#GildPlayersTable > tbody');
		let nelem = elem.find('tr.new');
		let act = $('#' + id).hasClass('filtered') ? 'show' : 'hide';

		if (act === 'hide')
		{
			if (nelem.length !== 0)
			{
				let oelem = elem.find('tr:not(.new)');
				GuildFights.PlayerBoxSettings.showOnlyActivePlayers = 1;
				localStorage.setItem('GuildFightsPlayerBoxSettings', JSON.stringify(GuildFights.PlayerBoxSettings));
				$('#GildPlayersTable > thead .text-warning').hide();
				oelem.hide();
				$('#' + id).addClass('filtered btn-green');
			}
		}

		else if (act === 'show')
		{
			elem.find('tr').show();
			GuildFights.PlayerBoxSettings.showOnlyActivePlayers = 0;
			localStorage.setItem('GuildFightsPlayerBoxSettings', JSON.stringify(GuildFights.PlayerBoxSettings));
			$('#GildPlayersTable > thead .text-warning').show();
			$('#' + id).removeClass('filtered btn-green');
		}
	},


	/**
	 * Merkt sich alle Tabs
	 *
	 * @param id
	 */
	SetTabs: (id) => {
		GuildFights.Tabs.push('<li class="' + id + ' game-cursor"><a href="#' + id + '" class="game-cursor"><span>&nbsp;</span></a></li>');
	},


	/**
	 * Gibt alle gemerkten Tabs aus
	 *
	 * @returns {string}
	 */
	GetTabs: () => {
		return '<ul class="horizontal dark-bg">' + GuildFights.Tabs.join('') + '</ul>';
	},


	/**
	 * Speichert BoxContent zwischen
	 *
	 * @param id
	 * @param content
	 */
	SetTabContent: (id, content) => {
		// ab dem zweiten Eintrag verstecken
		let style = GuildFights.TabsContent.length > 0 ? ' style="display:none"' : '';

		GuildFights.TabsContent.push('<div id="' + id + '"' + style + '>' + content + '</div>');
	},


	/**
	 * Setzt alle gespeicherten Tabellen zusammen
	 *
	 * @returns {string}
	 */
	GetTabContent: () => {
		return GuildFights.TabsContent.join('');
	},


	/**
	 *
	 * @param {boolean} alertActive
	 * @param {integer} provId
	 * @param {integer} alertId
	 */
	GetAlertButton: (provId) => {
		let btn;
		if (GuildFights.Alerts.find((a) => a.provId == provId) !== undefined) {
			btn = `<button class="btn btn-slim btn-delete deletealertbutton" data-id="${provId}">${i18n('Boxes.GuildFights.DeleteAlert')}</button>`;
		}
		else {
			btn = `<button class="btn btn-slim setalertbutton" data-id="${provId}">${i18n('Boxes.GuildFights.SetAlert')}</button>`;
		}
		return btn;
	},


	/**
	 * Creates the box with the data
	 *
	 * @param reload
	 * @constructor
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
				settings: 'GuildFights.ShowLiveFightSettings()',
			    //active_maps:"gg"
			});

			// add css to the dom
			HTML.AddCssFile('guildfights');
		}
		else if (!reload)
		{
			HTML.CloseOpenBox('LiveGildFighting');
			return;
		}

		GuildFights.BuildFightContent();
	},


	/**
	 * Shows the player overview
	 */
	ShowPlayerBox: () => {
		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if ($('#GildPlayers').length === 0)
		{

			//moment.locale(MainParser.Language);

			HTML.Box({
				id: 'GildPlayers',
				title: i18n('Boxes.GuildFights.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
				settings: 'GuildFights.ShowPlayerBoxSettings()',
			    active_maps:"gg"
			});
			HTML.AddCssFile('guildfights');
		}
			
		if (Settings.GetSetting('ShowGBGPlayerInfo') == false) {
			$('#GildPlayers').css({'display': 'none'})
		}

		GuildFights.BuildPlayerContent(GuildFights.CurrentGBGRound);
	},


	/**
	 * Generates the snapshot detail box
	 * @param d
	 */
	ShowDetailViewBox: (d) => {
		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
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

		GuildFights.BuildDetailViewContent(d);
	},


	/**
	 * Build the player content content
	 * @param gbground
	 * @returns {Promise<void>}
	 */
	BuildPlayerContent: async (gbground) => {

		let newRound = false;
		let updateDetailView = false;

		await GuildFights.SetBoxNavigation(gbground);

		let CurrentSnapshot = await GuildFights.db.snapshots
			.where({
				gbground: GuildFights.CurrentGBGRound
			})
			.first();

		if (CurrentSnapshot === undefined) {
			newRound = true;
			// if there is a new GBG round delete previous snapshots
			GuildFights.DeleteOldSnapshots(GuildFights.CurrentGBGRound);
		}

		let t = [],
			b = [],
			tN = 0,
			tF = 0,
			tA = 0,
			histView = false;

		GuildFights.PlayerBoxContent = [];

		GuildFights.PlayerBoxContent.push({
			player_id: 'player_id',
			player: 'player',
			negotiationsWon: 'negotiations',
			battlesWon: 'battles',
			attrition: 'attrition',
			total: 'total'
		});

		if (gbground && gbground !== null && gbground !== GuildFights.CurrentGBGRound) {

			let d = await GuildFights.db.history.where({ gbground: gbground }).toArray();
			GuildFights.GBGRound = d[0].participation.sort(function (a, b) {
				return a.rank - b.rank;
			});
			histView = true;

		}
		else {
			GuildFights.GBGRound = GuildFights.NewAction;
		}

		for (let i in GuildFights.GBGRound) {
			if (!GuildFights.GBGRound.hasOwnProperty(i)) break;

			let playerNew = GuildFights.GBGRound[i];

			let fightAddOn = '',
				negotaionAddOn = '',
				attritionAddOn = '',
				diffNegotiations = 0,
				diffBattles = 0,
				diffAttr = 0,
				newProgressClass = '',
				change = false;

			// is there an older snapshot available?
			if (GuildFights.PrevAction !== null && histView === false) {

				let playerOld = GuildFights.PrevAction.find(p => (p['player_id'] === playerNew['player_id']));

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

			if ((change === true || newRound === true) && GuildFights.GBGHistoryView === false)
			{
				await GuildFights.UpdateDB('player', { 
						gbground: GuildFights.CurrentGBGRound, 
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

			GuildFights.PlayerBoxContent.push({
				player_id: playerNew['player_id'],
				player: playerNew['name'],
				negotiationsWon: playerNew['negotiationsWon'],
				battlesWon: playerNew['battlesWon'],
				attrition: playerNew['attrition'],
				total: both
			})
		}

		// Update DetailView if there are changes and DetailView is open
		if ($('#GildPlayersDetailView').length !== 0 && updateDetailView === true)
		{
			GuildFights.BuildDetailViewContent(GuildFights.curDetailViewFilter);
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

				GuildFights.curDetailViewFilter = { content: 'player', player_id: player_id, gbground: gbground };

				if ($('#GildPlayersDetailView').length === 0) {
					GuildFights.ShowDetailViewBox(GuildFights.curDetailViewFilter);
				}
				else {
					GuildFights.BuildDetailViewContent(GuildFights.curDetailViewFilter);
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

				if (GuildFights.PlayerBoxSettings.showOnlyActivePlayers === 1)
				{
					GuildFights.ToggleProgressList('gbg_filterProgressList');
				}
			}
		});

		if ($('#GildPlayersHeader .title').find('.time-diff').length === 0)
		{
			$('#GildPlayersHeader .title').append($('<small />').addClass('time-diff'));
		}

		// es gibt schon einen Snapshot vorher
		if (GuildFights.PrevActionTimestamp !== null)
		{

			let start = moment.unix(GuildFights.PrevActionTimestamp),
				end = moment.unix(GuildFights.NewActionTimestamp),
				duration = moment.duration(end.diff(start));

			let time = duration.humanize();

			$('.time-diff').text(
				HTML.i18nReplacer(i18n('Boxes.GuildFights.LastSnapshot'), { time: time })
			);
		}
	},


	/**
	 *
	 * @param d
	 * @returns {Promise<void>}
	 */
	BuildDetailViewContent: async (d) => {

		let player_id = d.player_id ? d.player_id : null,
			content = d.content ? d.content : 'player',
			gbground = d.gbground ? d.gbground : GuildFights.CurrentGBGRound,
			playerName = null,
			dailyFights = [],
			detaildata = [],
			sumN = 0,
			sumF = 0,
			h = [];

		if (player_id === null && content === "player") return;

		if (content === "player")
		{
			detaildata = await GuildFights.db.snapshots.where({ gbground: gbground, player_id: player_id }).toArray();

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
			detaildata = await GuildFights.db.snapshots.where({ gbground: gbground }).and(function (item) {
				return (item.date >= GuildFights.curDateFilter && item.date <= GuildFights.curDateEndFilter)
			}).toArray();

			detaildata.sort(function (a, b) { return b.time - a.time });

			h.push('<div class="datetimepicker sticky"><button id="gbgLogDatepicker" class="btn">' + GuildFights.formatRange() + '</button></div>');
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
				GuildFights.intiateDatePicker();
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

					GuildFights.BuildDetailViewLog({ date: date, player: player, width: { a: awidth, b: bwidth, c: cwidth, d: dwidth, e: ewidth } });
				}
			});

		});
	},


	/**
	 * @param gbground
	 * @returns {Promise<void>}
	 */
	DeleteOldSnapshots: async (gbground) => {
		let deleteCount = await GuildFights.db.snapshots.where("gbground").notEqual(gbground).delete();
	},


	/**
	 * @param data
	 * @returns {Promise<void>}
	 */
	BuildDetailViewLog: async (data) => {
		let h = [];
		let d = await GuildFights.db.snapshots.where({ player_id: data.player, date: data.date }).reverse().sortBy('date');

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

		GuildFights.CopyCache = [];
		GuildFights.Tabs = [];
		GuildFights.TabsContent = [];

		GuildFights.SetTabs('gbgnextup');
		GuildFights.SetTabs('gbgprogress');

		let progress = [], nextup = [],
			LiveFightSettings = JSON.parse(localStorage.getItem('LiveFightSettings'));

		GuildFights.showGuildColumn = (LiveFightSettings && LiveFightSettings.showGuildColumn !== undefined) ? LiveFightSettings.showGuildColumn : 0;

		let mapdata = GuildFights.MapData['map']['provinces'];
		for (let i in mapdata) {
			if (!mapdata.hasOwnProperty(i)) 
				break;

			let id = mapdata[i]['id'];
			mapdata[i]['neighbor'] = [];
			let linkIDs = ProvinceMap.ProvinceData().find(e => e['id'] === id)['connections'];

			for (let x in linkIDs) {
				if (!linkIDs.hasOwnProperty(x)) {
					continue;
				}

				let neighborID = GuildFights.MapData['map']['provinces'].find(e => e['id'] === linkIDs[x]);

				if (neighborID['ownerId']) {
					mapdata[i]['neighbor'].push(neighborID['ownerId']);
				}
			}
		}

		nextup = GuildFights.BuildNextUpTab();
		progress = GuildFights.BuildProgressTab();

		GuildFights.SetTabContent('gbgnextup', nextup.join(''));
		GuildFights.SetTabContent('gbgprogress', progress.join(''));

		let h = [];

		h.push('<div class="gbg-tabs tabs">');
		h.push(GuildFights.GetTabs());
		h.push(GuildFights.GetTabContent());
		h.push('<button class="btn copybutton all" onclick="GuildFights.CopyToClipBoard(event)">'+ i18n('Boxes.GuildFights.SelectAll') +'</button>');
		h.push('<button class="btn mapbutton" onclick="ProvinceMap.build()">'+ i18n('Boxes.GuildFights.OpenMap') +'</button>');
		h.push('</div>');

		let activeTab = 1;
		if ($('.gbgprogress.active').length > 0) activeTab = 2;

		$('#LiveGildFighting').find('#LiveGildFightingBody').html(h.join('')).promise().done(function () {
			$('.gbg-tabs').tabslet({ active: activeTab });
			$('.gbg-tabs').on('_after', (e) => {
				GuildFights.ToggleCopyButton();
			});
			$('#nextup').on('click', '.deletealertbutton', function (e) {
				GuildFights.DeleteAlert($(this).data('id'));
				e.stopPropagation();
			});
			$('#nextup').on('click', '.setalertbutton', function (e) {
				GuildFights.SetAlert($(this).data('id'));
				e.stopPropagation();
			});
			$('#nextup').on('click', 'tr', function () {
				if ($(this).hasClass('highlight-row'))
				{
					$(this).removeClass('highlight-row');
				}
				else {
					$(this).addClass('highlight-row');
				}
				GuildFights.ToggleCopyButton();
			});
		});
	},


	BuildProgressTab: function() {
		let progress = [],
			mapdata = GuildFights.MapData['map']['provinces'],
			gbgGuilds = GuildFights.MapData['battlegroundParticipants'];

		progress.push('<div id="progress"><table class="foe-table">');
		progress.push('<thead><tr>');
		progress.push('<th class="prov-name" style="user-select:text">' + i18n('Boxes.GuildFights.Province') + '</th>');

		if (GuildFights.showGuildColumn) {
			progress.push('<th>' + i18n('Boxes.GuildFights.Owner') + '</th>');
		}

		progress.push('<th>' + i18n('Boxes.GuildFights.Progress') + '</th>');
		progress.push('<th>' + i18n('Boxes.GuildFights.RequiredProgress') + '</th>');
		progress.push('</tr></thead><tbody>');

		for (let i in mapdata) {
			if (!mapdata.hasOwnProperty(i)) 
				break;

			let id = mapdata[i]['id'] || 0;

			for (let x in gbgGuilds) {
				if (!gbgGuilds.hasOwnProperty(x)) {
					break;
				}

				if (mapdata[i]['ownerId'] !== undefined && gbgGuilds[x]['participantId'] === mapdata[i]['ownerId']) {
					// show current fights
					if (mapdata[i]['conquestProgress'].length > 0 && (mapdata[i]['lockedUntil'] === undefined)) {
						let pColor = ProvinceMap.getSectorColors(mapdata[i]['ownerId']);
						let provinceProgress = mapdata[i]['conquestProgress'];

						progress.push(`<tr id="province-${id}" data-id="${id}" data-tab="progress">`);
						progress.push(`<td title="${i18n('Boxes.GuildFights.Owner')}: ${gbgGuilds[x]['clan']['name']}"><b><span class="province-color" style="background-color:${pColor['main']}"></span> ${mapdata[i]['title']}</b></td>`);

						if (GuildFights.showGuildColumn) 
							progress.push(`<td>${gbgGuilds[x]['clan']['name']}</td>`);
						
						progress.push(`<td data-field="${id}-${mapdata[i]['ownerId']}" class="guild-progress">`);

						for (let y in provinceProgress) {
							if (!provinceProgress.hasOwnProperty(y)) {
								break;
							}

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
				progress.push(`<td><b><span class="province-color" style="background-color:#555"></span> ${mapdata[i]['title']}</b></td>`);

				if (GuildFights.showGuildColumn)
					progress.push(`<td><em>${i18n('Boxes.GuildFights.NoOwner')}</em></td>`);

				progress.push('<td data-field="' + id + '" class="guild-progress">');

				let provinceProgress = mapdata[i]['conquestProgress'];

				for (let y in provinceProgress) {
					if (!provinceProgress.hasOwnProperty(y)) {
						break;
					}

					let color = GuildFights.SortedColors.find(e => e['id'] === provinceProgress[y]['participantId']);

					progress.push(`<span class="attack attacker-${provinceProgress[y]['participantId']} gbg-${color['cid']}">${provinceProgress[y]['progress']}</span>`);
				}

				progress.push('</td><td data-field="' + id + '" class="required-progress">' + mapdata[i]['conquestProgress'][0].maxProgress + '</td>');
			}
		}

		progress.push('</tbody>');
		progress.push('</table></div>');

		return progress;
	},


	BuildNextUpTab: function() {
		let nextup = [],
			mapdata = GuildFights.MapData['map']['provinces'],
			gbgGuilds = GuildFights.MapData['battlegroundParticipants'],
			own = gbgGuilds.find(e => e['clan']['id'] === ExtGuildID),
			LiveFightSettings = JSON.parse(localStorage.getItem('LiveFightSettings'));

		GuildFights.showAdjacentSectors = (LiveFightSettings && LiveFightSettings.showAdjacentSectors !== undefined) ? LiveFightSettings.showAdjacentSectors : 1;
		GuildFights.showOwnSectors = (LiveFightSettings && LiveFightSettings.showOwnSectors !== undefined) ? LiveFightSettings.showOwnSectors : 0;

		nextup.push('<div id="nextup"><table class="foe-table">');
		nextup.push('<thead><tr>');
		nextup.push('<th class="prov-name">' + i18n('Boxes.GuildFights.Province') + '</th>');

		if (GuildFights.showGuildColumn) 
			nextup.push('<th>' + i18n('Boxes.GuildFights.Owner') + '</th>');
		
		nextup.push('<th class="time-static">' + i18n('Boxes.GuildFights.Time') + '</th>');
		nextup.push('<th class="time-dynamic">' + i18n('Boxes.GuildFights.Count') + '</th>');

		nextup.push('<th></th></tr></thead>');

		let arrayprov = [];

		// Time until next sectors will be available
		for (let i in mapdata) {
			if (!mapdata.hasOwnProperty(i)) continue;

			let ownsectors = true;
			if (!GuildFights.showOwnSectors)
				ownsectors = (own['clan']['name'] !== mapdata[i]['owner']);

			if (mapdata[i]['lockedUntil'] !== undefined && ownsectors)
				arrayprov.push(mapdata[i]);  // push all datas into array
		}

		let prov = arrayprov.sort((a, b) => { return a.lockedUntil - b.lockedUntil });

		for (let x in prov) {
			if (!prov.hasOwnProperty(x)) continue;

			let showCountdowns = true;
			if (GuildFights.showAdjacentSectors)
				if (!prov[x].hasOwnProperty('neighbor')) {
					showCountdowns = false;
				} else
					showCountdowns = (prov[x]['neighbor'].includes(own['participantId']) || (prov[x]['owner'] == own['clan']['name'] && GuildFights.showOwnSectors));

			if (showCountdowns) {
				let countDownDate = moment.unix(prov[x]['lockedUntil'] - 2),
					color = GuildFights.SortedColors.find(e => e['id'] === prov[x]['ownerId']),
					battleType = prov[x].isAttackBattleType ? 'BTattack' : 'BTdefence',
					intervalID = setInterval(() => {
						GuildFights.UpdateCounter(countDownDate, intervalID, prov[x]['id']);
					}, 1000);

				nextup.push(`<tr id="timer-${prov[x]['id']}" class="timer" data-tab="nextup" data-id=${prov[x]['id']}>`);
				nextup.push(`<td class="prov-name" title="${i18n('Boxes.GuildFights.Owner')}: ${prov[x]['owner']}">`)
				nextup.push(`<span class="province-color" ${color['main'] ? 'style="background-color:' + color['main'] + '"' : ''}"></span> `)
				nextup.push(`<span class="battletype ${battleType}"></span>`)
				nextup.push(` <b>${prov[x]['title']}</b> `)
				nextup.push(`</td>`);

				GuildFights.UpdateCounter(countDownDate, intervalID, prov[x]['id']);

				if (GuildFights.showGuildColumn) {
					nextup.push(`<td>${prov[x]['owner']}</td>`);
				}

				nextup.push(`<td class="time-static" style="user-select:text">${moment(countDownDate).add(LiveFightSettings?.showServerTime ? - 60 * (GuildFights.serverOffset ?? 0) : 0 , "seconds").format('HH:mm:ss')}</td>`);
				nextup.push(`<td class="time-dynamic" id="counter-${prov[x]['id']}">${countDownDate.format('HH:mm:ss')}</td>`);
				nextup.push(`<td class="text-right" id="alert-${prov[x]['id']}">${GuildFights.GetAlertButton(prov[x]['id'])}</td>`);
				nextup.push('</tr>');
			}
		}

		nextup.push('</table></div>');

		return nextup;
	},


	/**
	 * Initatite the Litepicker object
	 *
	 * @returns {Promise<void>}
	 */
	intiateDatePicker: async () => {

		GuildFights.LogDatePicker = new Litepicker({
			element: document.getElementById('gbgLogDatepicker'),
			format: 'YYYYMMDD',
			lang: MainParser.Language,
			singleMode: false,
			splitView: false,
			numberOfMonths: 1,
			numberOfColumns: 1,
			autoRefresh: true,
			minDate: moment.unix(GuildFights.CurrentGBGRound).subtract(12, "d").toDate(),
			maxDate: moment.unix(GuildFights.CurrentGBGRound).toDate(),
			startDate: moment.unix(GuildFights.CurrentGBGRound).subtract(11, "d").toDate(),
			endDate: MainParser.getCurrentDateTime(),
			showWeekNumbers: false,
			onSelect: async (dateStart, dateEnd) => {
				GuildFights.curDateFilter = moment(dateStart).format('YYYYMMDD');
				GuildFights.curDateEndFilter = moment(dateEnd).format('YYYYMMDD');

				$('#gbgLogDatepicker').text(GuildFights.formatRange());
				GuildFights.curDetailViewFilter = { content: 'filter', gbground: GuildFights.CurrentGBGRound };
				GuildFights.BuildDetailViewContent(GuildFights.curDetailViewFilter);

			}
		});
	},


	formatRange: () => {
		let text = undefined;
		let dateStart = moment(GuildFights.curDateFilter);
		let dateEnd = moment(GuildFights.curDateEndFilter);

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


	ToggleCopyButton: () => {
		if ($('#nextup').is(':visible')) {
			$('.copybutton').show();
		} else {
			$('.copybutton').hide();
			return;
		}
		if ($('.timer.highlight-row').length > 0) {
			$('.copybutton').html(i18n('Boxes.GuildFights.Copy'));
			$('.copybutton').removeClass('all');
		} else {
			$('.copybutton').html(i18n('Boxes.GuildFights.SelectAll'));
			$('.copybutton').addClass('all');
		}
	},


	CopyToClipBoard: (e) => {
		if (e.target.classList.contains('all')) {
			$('.timer').addClass('highlight-row');
			GuildFights.ToggleCopyButton();
			return;
		}
		let copy = '';
		let copycache = [];
		$('.timer.highlight-row').each(function () {
			copycache.push(GuildFights.MapData['map']['provinces'].find((mapItem) => mapItem.id == $(this).data('id')));
		});

		copycache.sort(function (a, b) { return a.lockedUntil - b.lockedUntil });
		copycache.forEach((mapElem) => {
			let battleType = mapElem.isAttackBattleType ? '🔴' : '🔵';
			let LiveFightSettings = JSON.parse(localStorage.getItem('LiveFightSettings'));
			let showTileColors = (LiveFightSettings && LiveFightSettings.showTileColors !== undefined) ? LiveFightSettings.showTileColors : 1;
			copy += `${moment.unix(mapElem.lockedUntil - 2 - 60 * (GuildFights.serverOffset || 0)).format('HH:mm')} ${showTileColors === 1 ? battleType : ''} ${mapElem.title} \n`;
		});

		if (copy !== '') {
			if (GuildFights.serverOffset && localStorage.getItem('Guildfights.TimeZoneWarningShown') === null) { // show warning only once
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
			$(`#timer-${id}`).find('.time-static').html(`<strong class="text-success">offen</strong>`); // @ToDo: translate

			// remove timer after 5s
			setTimeout(() => {
				$(`#timer-${id}`).fadeToggle(function () {
					$(this).remove();
					GuildFights.ToggleCopyButton();
				});
			}, 5000);
		}
	},


	/**
	 * Determine and assign colours of the individual guilds
	 */
	PrepareColors: () => {
		// ist schon fertig aufbereitet
		if (GuildFights.SortedColors !== null) {
			return;
		}

		let colors = [],
			gbgGuilds = GuildFights.MapData['battlegroundParticipants'];

		for (let i in gbgGuilds) {
			if (!gbgGuilds.hasOwnProperty(i)) {
				break;
			}

			let c = null;

			if (gbgGuilds[i]['clan']['id'] === ExtGuildID) {
				c = GuildFights.Colors.find(o => (o['id'] === 'own_guild_colour'));
			} else {
				c = GuildFights.Colors.find(o => (o['id'] === gbgGuilds[i]['colour']));
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

		GuildFights.SortedColors = colors;
	},


	/**
	 * Real time update of the map box
	 *
	 * @param data
	 */
	RefreshTable: (data) => {

		// Province is locked
		if (data['lockedUntil']) {
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
				pColor = ProvinceMap.getSectorColors(GuildFights.MapData.map?.provinces[data.id]?.ownerId),
				p = GuildFights.MapData['battlegroundParticipants'].find(o => (o['participantId'] === d['participantId']));

			// <tr> is not present, create it
			if (cell.length === 0) {
				let newCell = $('<tr />').attr({
					id: `province-${data['id']}`,
					'data-id': data['id']
				});

				let mD = GuildFights.MapData['map']['provinces'].find(d => d.id === data['id']);
				let provinceColor = pColor['main'] || 'rgba(0,0,0,0)';

				$('#progress').find('table.foe-table').prepend(
					newCell.append(
						$('<td />').append(
							$('<span />').css({ 'background-color': ((!provinceColor) ? '#555':provinceColor['main'])}).attr({ class: 'province-color' }),
							$('<b />').text(mD['title']),
						),
						(GuildFights.showGuildColumn ? $('<td />').text(p['clan']['name']) : ''),
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
				let color = GuildFights.SortedColors.find(e => e['id'] === p['participantId']);

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


	ShowPlayerBoxSettings: () => {
		let c = [];
		let Settings = GuildFights.PlayerBoxSettings;
		c.push(`<p class="text-left"><span class="settingtitle">${i18n('Boxes.GuildFights.Title')}</span>` +
			`<input id="gf_showRoundSelector" name="showroundswitcher" value="1" type="checkbox" ${(Settings.showRoundSelector === 1) ? ' checked="checked"' : ''} /> <label for="gf_showRoundSelector">${i18n('Boxes.GuildFights.ShowRoundSelector')}</label></p>`);
		c.push(`<p class="text-left"><input id="gf_showProgressFilter" name="showprogressfilter" value="1" type="checkbox" ${(Settings.showProgressFilter === 1) ? ' checked="checked"' : ''} /> <label for="gf_showProgressFilter">${i18n('Boxes.GuildFights.ShowProgressFilter')}</label></p>`);
		c.push(`<p class="text-left"><input id="gf_showLogButton" name="showlogbutton" value="1" type="checkbox" ${(Settings.showLogButton === 1) ? ' checked="checked"' : ''} /> <label for="gf_showLogButton">${i18n('Boxes.GuildFights.ShowLogButton')}</label></p>`);
		c.push(`<p><button id="save-GuildFightsPlayerBox-settings" class="btn" style="width:100%" onclick="GuildFights.PlayerBoxSettingsSaveValues()">${i18n('Boxes.General.Save')}</button></p>`);
		c.push(`<hr><p>${i18n('Boxes.General.Export')}: <span class="btn-group"><button class="btn" onclick="HTML.ExportTable($('#GildPlayersTable'),'csv','GBG-PlayerList')" title="${HTML.i18nTooltip(i18n('Boxes.General.ExportCSV'))}">CSV</button>`);
		c.push(`<button class="btn" onclick="HTML.ExportTable($('#GildPlayersTable'),'json','GBG-PlayerList')" title="${HTML.i18nTooltip(i18n('Boxes.General.ExportJSON'))}">JSON</button></span></p>`);

		$('#GildPlayersSettingsBox').html(c.join(''));
	},


	PlayerBoxSettingsSaveValues: () => {
		GuildFights.PlayerBoxSettings.showRoundSelector = $("#gf_showRoundSelector").is(':checked') ? 1 : 0;
		GuildFights.PlayerBoxSettings.showProgressFilter = $("#gf_showProgressFilter").is(':checked') ? 1 : 0;
		GuildFights.PlayerBoxSettings.showLogButton = $("#gf_showLogButton").is(':checked') ? 1 : 0;

		localStorage.setItem('GuildFightsPlayerBoxSettings', JSON.stringify(GuildFights.PlayerBoxSettings));

		$(`#GildPlayersSettingsBox`).fadeToggle('fast', function () {
			$(this).remove();
			GuildFights.BuildPlayerContent(GuildFights.CurrentGBGRound);
		});
	},


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

				GuildFights.Alerts = [];

				resp.forEach((alert) => {
					if (alert['data']['category'] === 'gbg')
					{
						let alertTime = alert['data']['expires'],
							name = alert['data']['title'],
							prov = GuildFights.MapData['map']['provinces'].find(
								e => e.title === name && alertTime > currentTime
							);

						if (prov !== undefined)
						{
							GuildFights.Alerts.push({ provId: prov['id'], alertId: alert.id });
						}
					}
				});
				resolve();
			});
		});
	},


	SetAlert: (id) => {
		let prov = GuildFights.MapData['map']['provinces'].find(e => e.id === id);

		const data = {
			title: prov.title,
			body: HTML.i18nReplacer(i18n('Boxes.GuildFights.SaveAlert'), { provinceName: prov.title }),
			expires: (prov.lockedUntil - 30) * 1000, // -30s * Microtime
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
			GuildFights.Alerts.push({ provId: id, alertId: aId });
			$(`#alert-${id}`).html(GuildFights.GetAlertButton(id));
			HTML.ShowToastMsg({
				head: i18n('Boxes.GuildFights.SaveMessage.Title'),
				text: HTML.i18nReplacer(i18n('Boxes.GuildFights.SaveMessage.Desc'), { provinceName: prov.title }),
				type: 'success',
				hideAfter: 5000
			});
		});

	},


	DeleteAlert: (provId) => {
		let prov = GuildFights.MapData['map']['provinces'].find(e => e.id === provId);
		let alert = GuildFights.Alerts.find((a) => a.provId == provId);
		MainParser.sendExtMessage({
			type: 'alerts',
			playerId: ExtPlayerID,
			action: 'delete',
			id: alert.alertId,
		}).then(() => {
			GuildFights.Alerts = GuildFights.Alerts.filter((a) => a.provId != provId);
			HTML.ShowToastMsg({
				head: i18n('Boxes.GuildFights.DeleteMessage.Title'),
				text: HTML.i18nReplacer(i18n('Boxes.GuildFights.DeleteMessage.Desc'), { provinceName: prov.title }),
				type: 'success',
				hideAfter: 5000
			});
			$(`#alert-${provId}`).html(GuildFights.GetAlertButton(provId));
		});
	},


	ShowLiveFightSettings: () => {
		let c = [];
		let LiveFightSettings = JSON.parse(localStorage.getItem('LiveFightSettings'));
		let showGuildColumn = (LiveFightSettings && LiveFightSettings.showGuildColumn !== undefined) ? LiveFightSettings.showGuildColumn : 0;
		let showAdjacentSectors = (LiveFightSettings && LiveFightSettings.showAdjacentSectors !== undefined) ? LiveFightSettings.showAdjacentSectors : 1;
		let showOwnSectors = (LiveFightSettings && LiveFightSettings.showOwnSectors !== undefined) ? LiveFightSettings.showOwnSectors : 0;
		let showTileColors = (LiveFightSettings && LiveFightSettings.showTileColors !== undefined) ? LiveFightSettings.showTileColors : 1;
		let showServerTime = LiveFightSettings?.showServerTime ?? 0;

		c.push(`<p><input id="showguildcolumn" name="showguildcolumn" value="1" type="checkbox" ${(showGuildColumn === 1) ? ' checked="checked"' : ''} /> <label for="showguildcolumn">${i18n('Boxes.GuildFights.ShowOwner')}</label></p>`);
		c.push(`<p><label for="showAdjacentSectors"><input id="showAdjacentSectors" name="showAdjacentSectors" value="0" type="checkbox" ${(showAdjacentSectors === 1) ? ' checked="checked"' : ''} /> ${i18n('Boxes.GuildFights.ShowAdjacentSectors')}</label></p>`);
		c.push(`<p><label for="showownsectors"><input id="showownsectors" name="showownsectors" value="0" type="checkbox" ${(showOwnSectors === 1) ? ' checked="checked"' : ''} /> ${i18n('Boxes.GuildFights.ShowOwnSectors')}</label></p>`);
		c.push(`<p><label for="showtilecolors"><input id="showtilecolors" name="showtilecolors" value="0" type="checkbox" ${(showTileColors === 1) ? ' checked="checked"' : ''} /> ${i18n('Boxes.GuildFights.ShowTileColors')}</label></p>`);
		c.push(`<p><label for="showservertime"><input id="showservertime" name="showservertime" value="0" type="checkbox" ${(showServerTime === 1) ? ' checked="checked"' : ''} /> ${i18n('Boxes.GuildFights.ShowServerTime')}</label></p>`);
		c.push(`<p><label for="serverOffset">${i18n('Boxes.GuildFights.serverOffset')}<input id="serverOffset" name="serverOffset" value="${GuildFights.serverOffset??""}" type="text" maxlength="5" size = "5"/></label></p>`);
		c.push(`<p><button onclick="GuildFights.SaveLiveFightSettings()" id="save-livefight-settings" class="btn" style="width:100%">${i18n('Boxes.GuildFights.SaveSettings')}</button></p>`);

		// insert into DOM
		$('#LiveGildFightingSettingsBox').html(c.join(''));
	},


	SaveLiveFightSettings: () => {
		let value = {};

		value.showGuildColumn = 0;
		value.showAdjacentSectors = 0;
		value.showOwnSectors = 0;
		value.showTileColors = 0;
		value.showServerTime = 0;

		if ($("#showguildcolumn").is(':checked')) 
			value.showGuildColumn = 1;

		if ($("#showAdjacentSectors").is(':checked')) 
			value.showAdjacentSectors = 1;

		if ($("#showownsectors").is(':checked')) 
			value.showOwnSectors = 1;

		if ($("#showtilecolors").is(':checked')) 
			value.showTileColors = 1;

		if ($("#showservertime").is(':checked')) 
			value.showServerTime = 1;
				
		GuildFights.showGuildColumn = value.showGuildColumn;
		GuildFights.showAdjacentSectors = value.showAdjacentSectors;
		GuildFights.showOwnSectors = value.showOwnSectors;
		GuildFights.showTileColors = value.showTileColors;
		GuildFights.showServerTime = value.showServerTime;
		GuildFights.serverOffset = parseInt($("#serverOffset").val()) ?? null;
		if (GuildFights.serverOffset != null)
			localStorage.setItem('GuildFights.serverOffset', JSON.stringify(GuildFights.serverOffset)) 
		else
			localStorage.removeItem('GuildFights.serverOffset');
		localStorage.setItem('LiveFightSettings', JSON.stringify(value));

		$(`#LiveGildFightingSettingsBox`).fadeToggle('fast', function () {
			$.when($(`#LiveGildFightingSettingsBox`).remove()).then(
				GuildFights.ShowGuildBox(true)
			);
		});
	},	
};

/**
 *
 * @type {{ToolTipActive: boolean, prepare: ProvinceMap.prepare, Provinces: *[], MapCTX: {}, StrokeColor: string, Map: {width: number, height: number}, Refresh: ProvinceMap.Refresh, Mouse: {x: undefined, y: undefined}, StrokeWidth: number, build: ProvinceMap.build, ToolTipId: boolean, ProvinceData: ((function(): (*|undefined))|*), Map: {}, hexToRgb: ((function(*, *): string)|*)}}
 */
let ProvinceMap = {

	Map: {},
	MapCTX: {},

	Size: {
		width: 1000,
		height: 1000
	},

	Provinces: [],

	StrokeColor: '#111',

	mapDrag: () => {
		const wrapper = document.getElementById('province-map-wrap');	
		let pos = { top: 0, left: 0, x: 0, y: 0 };
		
		const mouseDownHandler = function(e) {	
			pos = {
				left: wrapper.scrollLeft,
				top: wrapper.scrollTop,
				x: e.clientX,
				y: e.clientY,
			};
	
			document.addEventListener('mousemove', mouseMoveHandler);
			document.addEventListener('mouseup', mouseUpHandler);
		};
	
		const mouseMoveHandler = function(e) {
			const dx = e.clientX - pos.x;
			const dy = e.clientY - pos.y;
			wrapper.scrollTop = pos.top - dy;
			wrapper.scrollLeft = pos.left - dx;
		};
	
		const mouseUpHandler = function() {	
			document.removeEventListener('mousemove', mouseMoveHandler);
			document.removeEventListener('mouseup', mouseUpHandler);
		};

        ProvinceMap.Map.addEventListener('mousedown', function (e) {
			wrapper.addEventListener('mousedown', mouseDownHandler);
        }, false);
	},

	getSectorColors: (ownerID) => {
		if (ownerID !== undefined)
			return GuildFights.SortedColors.find(c => (c.id === ownerID))
		else
			return {
				main: '#444',
				highlight: '#666',
				shadow: '#333',
				base: '#444',
				id: undefined
			}
	},

	build: () => {
		if ($('#ProvinceMap').length === 0) {
			HTML.Box({
				id: 'ProvinceMap',
				title: 'ProvinceMap',
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
			    active_maps:"gg"
			});

			// add css to the dom
			HTML.AddCssFile('guildfights');
		} else {
			HTML.CloseOpenBox('ProvinceMap')
		}

		ProvinceMap.prepare();
	},


	prepare: () => {
		$('#ProvinceMap').addClass(GuildFights.MapData.map['id']);

		ProvinceMap.Map = document.createElement("canvas");
		ProvinceMap.MapCTX = ProvinceMap.Map.getContext('2d');
		ProvinceMap.view = "guildType";

		$(ProvinceMap.Map).attr({
			id: 'province-map',
			width: ProvinceMap.Size.width,
			height: ProvinceMap.Size.height,
		});

		let wrapper = document.createElement("div");
		$(wrapper).attr({
			id: 'province-map-wrap',
		});
		$(wrapper).html(ProvinceMap.Map);
		$('#ProvinceMapBody').html(wrapper).append('<span id="zoomGBGMap" class="btn">'+i18n('Boxes.GvGMap.Action.Zoom')+'</span><span id="switchGBGMap" class="btn">'+i18n('Boxes.GuildFights.Switch')+'</span>');
		
		ProvinceMap.mapDrag();

		$('#zoomGBGMap').click(function (e) {
			$('#province-map').toggleClass('zoomed');
		});
		$('#switchGBGMap').click(function (e) {
			ProvinceMap.view = ProvinceMap.view == "battleType" ? "guildType" : "battleType";
			ProvinceMap.BuildMap();
		});

		ProvinceMap.MapCTX.strokeStyle = ProvinceMap.StrokeColor;
		ProvinceMap.MapCTX.lineWidth = 2;

		// put 0,0 in the center on volcano map
		if (GuildFights.MapData.map['id'] === "volcano_archipelago") {
			ProvinceMap.MapCTX.translate(ProvinceMap.Size.width/2, ProvinceMap.Size.height/2);
		}

		// Objects
		function Province(data) {
			this.id = data.id || 0;
			this.name = data.name;
			this.short = data.short;
			this.links = data.links;
			this.flag = data.flag;
			this.battleType = data.battleType;
			this.isSpawnSpot = data.isSpawnSpot;
			this.owner = {
				id: data.ownerID,
				name: data.ownerName,
				flagImg: data.flagImg,
				colors: ProvinceMap.getSectorColors(data.ownerID),
			};
			this.lockedUntil = data.lockedUntil;
			// Sectors which are open but with no progress are missing the "conquestProgress" key in the response
			this.conquestProgress = data.conquestProgress || [];
			this.circlePosition = data.circlePosition;
			this.totalBuildingSlots = data.totalBuildingSlots;

			return this;
		}

		Province.prototype.updateMapSector = function () {
			this.drawMapSector(GuildFights.MapData.map['id']); 
		}

		Province.prototype.drawMapSector = function (mapType = 'waterfall_archipelago') {
			ProvinceMap.MapCTX.font = 'bold 30px Arial';
			ProvinceMap.MapCTX.textAlign = "center";
			ProvinceMap.MapCTX.textBaseline = "top";
			ProvinceMap.MapCTX.fillStyle = this.owner.colors.highlight;
			
			let sector = this;
			let noRealignSectors = [];

			// waterfall map
			let hexwidthFactor = 7.5;
			let hexheightFactor = 10;
			let mapStuff = {
				hexwidth: ProvinceMap.Size.width / hexwidthFactor,
				hexheight: ProvinceMap.Size.height / hexheightFactor,
				x: sector.flag.x * (ProvinceMap.Size.width / (hexwidthFactor*2 + hexwidthFactor*2/3)) + ProvinceMap.Size.width / (hexwidthFactor*2 + hexwidthFactor*2/3),
				y: sector.flag.y * (ProvinceMap.Size.height / (hexheightFactor*2)) + (ProvinceMap.Size.height / (hexheightFactor*2))
			};

			if (mapType === 'volcano_archipelago') {
				let xy = { x: 1, y: -1};
				mapStuff.x = xy.x*(sector.circlePosition.radius-sector.circlePosition.initRadius/2)*Math.sin(sector.circlePosition.angle+sector.circlePosition.angleFragment/2);
				mapStuff.y = xy.y*(sector.circlePosition.radius-sector.circlePosition.initRadius/2)*Math.cos(sector.circlePosition.angle+sector.circlePosition.angleFragment/2);
				noRealignSectors = [1,2,29,31,30,32,33,34,35,37,38,39,41,42,43,45,46,47,49,50,51,53,54,55,57,58,59];

				// realign some sectors on volcano map to have more space
				if (!noRealignSectors.includes(sector.id) && sector.owner.flagImg == undefined) 
					mapStuff.y = mapStuff.y - 10;
			}

			if (sector.owner.flagImg && sector.isSpawnSpot) 
				sector.drawStartSector(mapStuff, mapType);
			
			else {
				ProvinceMap.MapCTX.fillStyle = sector.owner.colors.highlight;

				if (ProvinceMap.view == "battleType" && sector.battleType == "red" && sector.owner.colors.cid !== "own_guild_colour")
					ProvinceMap.MapCTX.fillStyle = "#cf401e";
				else if (ProvinceMap.view == "battleType" && sector.battleType == "blue" && sector.owner.colors.cid !== "own_guild_colour")
					ProvinceMap.MapCTX.fillStyle = "#4a98dd";

				if (mapType === 'volcano_archipelago') 
					sector.drawSectorShape();
				else
					drawHex(mapStuff.x, mapStuff.y, mapStuff.hexwidth, mapStuff.hexheight);

				mapStuff.y = mapStuff.y - 20;
				
				if (sector.lockedUntil === undefined && sector.conquestProgress.length === 0) 
					sector.drawTitleAndSlots(mapType, true, mapStuff.x, mapStuff.y);
				else {
					if (mapType === 'waterfall_archipelago') 
						mapStuff.y = mapStuff.y - 10;
					sector.drawTitleAndSlots(mapType, false, mapStuff.x, mapStuff.y);
				}

				mapStuff.y = mapStuff.y+23;

				sector.drawUnlockTime(mapStuff);

				mapStuff.y = mapStuff.y+10;

				if (sector.lockedUntil !== undefined) 
					mapStuff.y = mapStuff.y+20;

				sector.drawProgress(mapStuff);
			}
		}

		Province.prototype.drawUnlockTime = function(mapStuff) {
			ProvinceMap.MapCTX.font = 'bold 20px Courier New';
			ProvinceMap.MapCTX.fillStyle = '#000';
			let provinceUnlockTime = (moment.unix(this.lockedUntil).format('HH:mm') != 'Invalid date') ? moment.unix(this.lockedUntil).format('HH:mm') : '';
			ProvinceMap.MapCTX.fillText(provinceUnlockTime,mapStuff.x,mapStuff.y+5);
		}

		Province.prototype.drawTitleAndSlots = function(mapType, drawCentered = true, x, y) {
			let titleY = y;
			let slotsY = y - 20;
			if (drawCentered) {
				titleY = y + 10;
				slotsY = y - 10;
			}

			// do not draw dots for own sectors
			if (this.owner.colors.cid != "own_guild_colour") {
				ProvinceMap.MapCTX.strokeStyle = '#000';

				ProvinceMap.MapCTX.beginPath();
				ProvinceMap.MapCTX.arc(x-36, titleY+12, 5, 0, 2*Math.PI);

				ProvinceMap.MapCTX.fillStyle = '#f00';
				if (this.battleType == 'blue')
					ProvinceMap.MapCTX.fillStyle = '#00f';
	
				if (ProvinceMap.view == "battleType")
					ProvinceMap.MapCTX.fillStyle = this.owner.colors.highlight;
				ProvinceMap.MapCTX.stroke();
				ProvinceMap.MapCTX.fill();
			}

			ProvinceMap.MapCTX.strokeStyle = '#fff5';

			ProvinceMap.MapCTX.font = 'bold 28px Arial';
			ProvinceMap.MapCTX.strokeText(this.short, x, titleY);

			ProvinceMap.MapCTX.fillStyle = '#000';
			ProvinceMap.MapCTX.fillText(this.short, x, titleY);
			
			if (this.totalBuildingSlots != undefined) {
				let slots = '';
				if (this.totalBuildingSlots == 1)
					slots = '·';
				else if (this.totalBuildingSlots == 2)
					slots = '··';
				else if (this.totalBuildingSlots == 3)
					slots = '···';
	
				ProvinceMap.MapCTX.strokeText(slots, x, slotsY);
				ProvinceMap.MapCTX.fillText(slots, x, slotsY);
			}
		}

		Province.prototype.drawProgress = function(mapStuff) {
			ProvinceMap.MapCTX.strokeStyle = ProvinceMap.StrokeColor;
			if (this.conquestProgress !== undefined && this.conquestProgress.length > 0)
				this.conquestProgress.forEach(function(prog, index) {
					let progDiff = (prog.progress / prog.maxProgress);
					let color = GuildFights.SortedColors.find(c => (c.id === prog.participantId));
					let barWidth = 50;
					let x = mapStuff.x-27;

					ProvinceMap.MapCTX.fillStyle = '#111a';
					ProvinceMap.MapCTX.fillRect(x, mapStuff.y + 8*index + 1, 3 + barWidth, 4);
					ProvinceMap.MapCTX.fillStyle = color.highlight;
					ProvinceMap.MapCTX.strokeRect(x, mapStuff.y + 8*index, 3 + barWidth*progDiff, 6);
					ProvinceMap.MapCTX.fillRect(x, mapStuff.y + 8*index, 3 + barWidth*progDiff, 6);
				});
		}

		Province.prototype.drawStartSector = function(mapStuff, mapType) {
			let flag_image = new Image();
			flag_image.src = srcLinks.get(`/shared/clanflags/${this.owner.flagImg}.jpg`, true);
			let sector = this;
			let flagX = mapStuff.x-25;
			let flagY = mapStuff.y-25;
			let flagSize = 50;

			flag_image.onload = function () {
				ProvinceMap.MapCTX.fillStyle = sector.owner.colors.highlight;
				if (mapType !== 'waterfall_archipelago') 
					sector.drawSectorShape();
				else
					drawHex(mapStuff.x, mapStuff.y, mapStuff.hexwidth, mapStuff.hexheight);

				ProvinceMap.MapCTX.drawImage(this, flagX, flagY, flagSize, flagSize);
			}
		}

        Province.prototype.drawSectorShape = function() {    
            let xy = { x: 1, y: -1 }; // change first quadrant
			let radius = this.circlePosition.radius;
			let initRadius = this.circlePosition.initRadius;
			let angle = this.circlePosition.angle;
			let angleFragment = this.circlePosition.angleFragment;

			ProvinceMap.MapCTX.beginPath();
            ProvinceMap.MapCTX.moveTo(xy.x*(radius-initRadius) * Math.sin(angle), xy.y*(radius-initRadius) * Math.cos(angle));
            ProvinceMap.MapCTX.lineTo(xy.x*radius * Math.sin(angle), xy.y*radius * Math.cos(angle));
            ProvinceMap.MapCTX.lineTo(xy.x*radius * Math.sin(angle+angleFragment/2), xy.y*radius * Math.cos(angle+angleFragment/2));
            ProvinceMap.MapCTX.lineTo(xy.x*radius * Math.sin(angle+angleFragment), xy.y*radius * Math.cos(angle+angleFragment));
            ProvinceMap.MapCTX.lineTo(xy.x*(radius-initRadius) * Math.sin(angle+angleFragment), xy.y*(radius-initRadius) * Math.cos(angle+angleFragment));
            ProvinceMap.MapCTX.lineTo(xy.x*(radius-initRadius) * Math.sin(angle), xy.y*(radius-initRadius) * Math.cos(angle));
            ProvinceMap.MapCTX.closePath();
            ProvinceMap.MapCTX.fill();
            ProvinceMap.MapCTX.strokeStyle = ProvinceMap.StrokeColor;
            ProvinceMap.MapCTX.stroke();   
        }

		let drawHex = function (x, y, width, height) {
			let pointers = width / 4;
			let topBottomWidth = width / 2;
			ProvinceMap.MapCTX.beginPath();
			ProvinceMap.MapCTX.moveTo(x - pointers, y - (height / 2));
			ProvinceMap.MapCTX.lineTo(x + pointers, y - (height / 2));
			ProvinceMap.MapCTX.lineTo(x + topBottomWidth, y);
			ProvinceMap.MapCTX.lineTo(x + pointers, y + (height / 2));
			ProvinceMap.MapCTX.lineTo(x - pointers, y + (height / 2));
			ProvinceMap.MapCTX.lineTo(x - topBottomWidth, y);
			ProvinceMap.MapCTX.lineTo(x - pointers, y - (height / 2));
			ProvinceMap.MapCTX.closePath();
			ProvinceMap.MapCTX.fill();
			ProvinceMap.MapCTX.stroke();
		}

		// Implementation
		let provinces = [];

		function init() {
			// round map
			let angle = Math.PI/2; // 90°
			let rotator = 0;
			let radius = ProvinceMap.Size.width/8;
			let initRadius = radius;

			ProvinceMap.ProvinceData().forEach(function (i) {
				const pD = ProvinceMap.ProvinceData()[i.id];

				let data = {
					id: i.id,
					name: pD.name,
					short: pD.short,
					links: pD.connections,
					flag: pD.flag
				};

				let prov = GuildFights.MapData['map']['provinces'][i.id];
				data.battleType = prov.isAttackBattleType ? 'red' : 'blue';

				if (prov['ownerId']) {
					data.ownerID = prov['ownerId'];
					data.ownerName = prov.owner;
					data.isSpawnSpot = false;
					if (prov.isSpawnSpot) {
						let clan = GuildFights.MapData['battlegroundParticipants'].find(c => c['participantId'] === prov['ownerId']);
						data['flagImg'] = clan['clan']['flag'].toLowerCase();
						data.isSpawnSpot = true;
					}
				}
				else if (prov.owner) 
					data.ownerID = prov.owner.id;

				if (prov.lockedUntil) 
					data.lockedUntil = prov.lockedUntil;

				if (prov.totalBuildingSlots) 
					data.totalBuildingSlots = prov.totalBuildingSlots;

				if (prov.conquestProgress.length > 0) 
					data.conquestProgress = prov.conquestProgress;

				// round map
				if (rotator >= Math.PI*2) {
					rotator = 0;
					angle = angle/2;
					radius = initRadius+radius;
				}
				data.circlePosition = {
					radius: radius,
					initRadius: initRadius,
					angle: rotator,
					angleFragment: angle
				};
				rotator += angle;

				provinces.push(new Province(data));
			});

			ProvinceMap.Provinces = provinces;
		}

		init();

		ProvinceMap.BuildMap();
	},


	/**
	 * Rebuild a Sector
	 *
	 * @param socketData
	 * @constructor
	 */
	RefreshSector: (socketData = []) => {
		let updatedProvince = ProvinceMap.Provinces.find(p => p.id === 0); // first sector does not have an ID, make it the default one

		if (socketData['id'] !== undefined) 
			 updatedProvince = ProvinceMap.Provinces.find(p => p.id === socketData['id']);
		
		if (socketData.conquestProgress)
			updatedProvince.conquestProgress = socketData.conquestProgress;

		if (socketData.lockedUntil)
			updatedProvince.lockedUntil = socketData.lockedUntil;

		if (socketData.ownerId !== updatedProvince.owner.id) {
			updatedProvince.owner.id = socketData.ownerId;
			updatedProvince.owner.colors = ProvinceMap.getSectorColors(socketData.ownerId);
		}

		updatedProvince.updateMapSector();
	},


	/**
	 * Build the Canvas
	 *
	 * @param socketData
	 * @constructor
	 */
	BuildMap: () => {
		ProvinceMap.MapCTX.clearRect(0, 0, ProvinceMap.Size.width, ProvinceMap.Size.height);
		const provinces = ProvinceMap.Provinces;

		provinces.forEach(province => {
			province.updateMapSector();
		});
	},


	hexToRgb: (hex, alpha) => {
		hex = hex.trim();
		hex = hex[0] === '#' ? hex.substr(1) : hex;

		let bigint = parseInt(hex, 16), h = [];

		if (hex.length === 3) {
			h.push((bigint >> 4) & 255);
			h.push((bigint >> 2) & 255);

		} else {
			h.push((bigint >> 16) & 255);
			h.push((bigint >> 8) & 255);
		}

		h.push(bigint & 255);

		if (alpha) {
			h.push(alpha);
			return 'rgba(' + h.join(',') + ')';

		} else {
			return 'rgb(' + h.join(',') + ')';
		}
	},


	ProvinceData: () => {
		if (GuildFights.MapData.map['id'] === "volcano_archipelago") {
			return [{
				id: 0,
				name: "A1: Mati Tudokk",
				connections: [1, 3, 4, 5],
				short: 'A1M',
				flag: {
					x: 1249,
					y: 816
				}
			}, {
				id: 1,
				name: "B1: Ofrus Remyr",
				connections: [0, 2, 6, 7],
				short: 'B1O',
				flag: {
					x: 1327,
					y: 996
				}
			}, {
				id: 2,
				name: "C1: Niali Diath",
				connections: [1, 3, 8, 9],
				short: 'C1N',
				flag: {
					x: 1064,
					y: 1011
				}
			}, {
				id: 3,
				name: "D1: Brurat Andgiry",
				connections: [0, 2, 10, 11],
				short: 'D1B',
				flag: {
					x: 1064,
					y: 838
				}
			}, {
				id: 4,
				name: "A2: Sladisk Icro",
				connections: [0, 5, 11, 12, 13],
				short: 'A2S',
				flag: {
					x: 1269,
					y: 629
				}
			}, {
				id: 5,
				name: "A2: Tevomospa",
				connections: [0, 4, 6, 14, 15],
				short: 'A2T',
				flag: {
					x: 1482,
					y: 752
				}
			}, {
				id: 6,
				name: "B2: Subeblic",
				connections: [1, 5, 7, 16, 17],
				short: 'B2S',
				flag: {
					x: 1541,
					y: 984
				}
			}, {
				id: 7,
				name: "B2: Taspac",
				connections: [1, 6, 8, 18, 19],
				short: 'B2T',
				flag: {
					x: 1375,
					y: 1197
				}
			}, {
				id: 8,
				name: "C2: Shadsterning",
				connections: [2, 7, 9, 20, 21],
				short: 'C2S',
				flag: {
					x: 1052,
					y: 1217
				}
			}, {
				id: 9,
				name: "C2: Tayencoria",
				connections: [2, 8, 10, 22, 23],
				short: 'C2T',
				flag: {
					x: 878,
					y: 1063
				}
			}, {
				id: 10,
				name: "D2: Slandmonii",
				connections: [3, 9, 11, 24, 25],
				short: 'D2S',
				flag: {
					x: 791,
					y: 794
				}
			}, {
				id: 11,
				name: "D2: Tachmazer",
				connections: [3, 4, 10, 26, 27],
				short: 'D2T',
				flag: {
					x: 974,
					y: 658
				}
			}, {
				id: 12,
				name: "A3: Vobolize",
				connections: [4, 13, 27, 28, 29],
				short: 'A3V',
				flag: {
					x: 1218,
					y: 479
				}
			}, {
				id: 13,
				name: "A3: Xemga",
				connections: [4, 12, 14, 30, 31],
				short: 'A3X',
				flag: {
					x: 1407,
					y: 523
				}
			}, {
				id: 14,
				name: "A3: Yelili",
				connections: [5, 13, 15, 32, 33],
				short: 'A3Y',
				flag: {
					x: 1592,
					y: 574
				}
			}, {
				id: 15,
				name: "A3: Zamva",
				connections: [5, 14, 16, 34, 35],
				short: 'A3Z',
				flag: {
					x: 1693,
					y: 710
				}
			}, {
				id: 16,
				name: "B3: Vishrain",
				connections: [6, 15, 17, 36, 37],
				short: 'B3V',
				flag: {
					x: 1721,
					y: 889
				}
			}, {
				id: 17,
				name: "B3: Xidorpupo",
				connections: [6, 16, 18, 38, 39],
				short: 'B3X',
				flag: {
					x: 1800,
					y: 1241
				}
			}, {
				id: 18,
				name: "B3: Yepadlic",
				connections: [7, 17, 19, 40, 41],
				short: 'B3Y',
				flag: {
					x: 1710,
					y: 1364
				}
			}, {
				id: 19,
				name: "B3: Zilsier",
				connections: [7, 18, 20, 42, 43],
				short: 'B3Z',
				flag: {
					x: 1528,
					y: 1401
				}
			}, {
				id: 20,
				name: "C3: Vilipne",
				connections: [8, 19, 21, 44, 45],
				short: 'C3V',
				flag: {
					x: 1132,
					y: 1382
				}
			}, {
				id: 21,
				name: "C3: Xistan",
				connections: [8, 20, 22, 46, 47],
				short: 'C3X',
				flag: {
					x: 851,
					y: 1343
				}
			}, {
				id: 22,
				name: "C3: Yeraim",
				connections: [9, 21, 23, 48, 49],
				short: 'C3Y',
				flag: {
					x: 656,
					y: 1220
				}
			}, {
				id: 23,
				name: "C3: Zeaslo",
				connections: [9, 22, 24, 50, 51],
				short: 'C3Z',
				flag: {
					x: 569,
					y: 1050
				}
			}, {
				id: 24,
				name: "D3: Verdebu",
				connections: [10, 23, 25, 52, 53],
				short: 'D3V',
				flag: {
					x: 592,
					y: 824
				}
			}, {
				id: 25,
				name: "D3: Xiwait",
				connections: [10, 24, 26, 54, 55],
				short: 'D3X',
				flag: {
					x: 628,
					y: 636
				}
			}, {
				id: 26,
				name: "D3: Yerat",
				connections: [11, 25, 27, 56, 57],
				short: 'D3Y',
				flag: {
					x: 788,
					y: 520
				}
			}, {
				id: 27,
				name: "D3: Zilgypt",
				connections: [11, 12, 26, 58, 59],
				short: 'D3Z',
				flag: {
					x: 1025,
					y: 484
				}
			}, {
				id: 28,
				name: "A4: Aithmirash",
				connections: [12, 29, 59],
				short: 'A4A',
				flag: {
					x: 1176,
					y: 310
				}
			}, {
				id: 29,
				name: "A4: Bangma Mynia",
				connections: [12, 28, 30],
				short: 'A4B',
				flag: {
					x: 1337,
					y: 316
				}
			}, {
				id: 30,
				name: "A4: Cuatishca",
				connections: [13, 29, 31],
				short: 'A4C',
				flag: {
					x: 1473,
					y: 354
				}
			}, {
				id: 31,
				name: "A4: Dilandmoor",
				connections: [13, 30, 32],
				short: 'A4D',
				flag: {
					x: 1591,
					y: 391
				}
			}, {
				id: 32,
				name: "A4: Eda Monwe",
				connections: [14, 31, 33],
				short: 'A4E',
				flag: {
					x: 1723,
					y: 398
				}
			}, {
				id: 33,
				name: "A4: Frimoandbada",
				connections: [14, 32, 34],
				short: 'A4F',
				flag: {
					x: 1839,
					y: 477
				}
			}, {
				id: 34,
				name: "A4: Gosolastan",
				connections: [15, 33, 35],
				short: 'A4G',
				flag: {
					x: 1962,
					y: 590
				}
			}, {
				id: 35,
				name: "A4: Hasaint",
				connections: [15, 34, 36],
				short: 'A4H',
				flag: {
					x: 2047,
					y: 688
				}
			}, {
				id: 36,
				name: "B4: Aguime",
				connections: [16, 35, 37],
				short: 'B4A',
				flag: {
					x: 1970,
					y: 842
				}
			}, {
				id: 37,
				name: "B4: Bliclatan",
				connections: [16, 36, 38],
				short: 'B4B',
				flag: {
					x: 1900,
					y: 1000
				}
			}, {
				id: 38,
				name: "B4: Capepesk",
				connections: [17, 37, 39],
				short: 'B4C',
				flag: {
					x: 2088,
					y: 1176
				}
			}, {
				id: 39,
				name: "B4: Dalomstates",
				connections: [17, 38, 40],
				short: 'B4D',
				flag: {
					x: 2138,
					y: 1361
				}
			}, {
				id: 40,
				name: "B4: Engthio",
				connections: [18, 39, 41],
				short: 'B4E',
				flag: {
					x: 2113,
					y: 1504
				}
			}, {
				id: 41,
				name: "B4: Fradistaro",
				connections: [18, 40, 42],
				short: 'B4F',
				flag: {
					x: 1951,
					y: 1590
				}
			}, {
				id: 42,
				name: "B4: Goima",
				connections: [19, 41, 43],
				short: 'B4G',
				flag: {
					x: 1735,
					y: 1605
				}
			}, {
				id: 43,
				name: "B4: Hranreka",
				connections: [19, 42, 44],
				short: 'B4H',
				flag: {
					x: 1416,
					y: 1454
				}
			}, {
				id: 44,
				name: "C4: Andgalbou",
				connections: [20, 43, 45],
				short: 'C4A',
				flag: {
					x: 1240,
					y: 1521
				}
			}, {
				id: 45,
				name: "C4: Bangne Casau",
				connections: [20, 44, 46],
				short: 'C4B',
				flag: {
					x: 1015,
					y: 1601
				}
			}, {
				id: 46,
				name: "C4: Cagalpo",
				connections: [21, 45, 47],
				short: 'C4C',
				flag: {
					x: 808,
					y: 1586
				}
			}, {
				id: 47,
				name: "C4: Denwana",
				connections: [21, 46, 48],
				short: 'C4D',
				flag: {
					x: 686,
					y: 1532
				}
			}, {
				id: 48,
				name: "C4: Eastkiabumi",
				connections: [22, 47, 49],
				short: 'C4E',
				flag: {
					x: 455,
					y: 1410
				}
			}, {
				id: 49,
				name: "C4: Francedian",
				connections: [22, 48, 50],
				short: 'C4F',
				flag: {
					x: 304,
					y: 1318
				}
			}, {
				id: 50,
				name: "C4: Guayla",
				connections: [23, 49, 51],
				short: 'C4G',
				flag: {
					x: 257,
					y: 1182
				}
			}, {
				id: 51,
				name: "C4: Hoguay",
				connections: [23, 50, 52],
				short: 'C4H',
				flag: {
					x: 267,
					y: 1011
				}
			}, {
				id: 52,
				name: "D4: Arasruhana",
				connections: [24, 51, 53],
				short: 'D4A',
				flag: {
					x: 429,
					y: 851
				}
			}, {
				id: 53,
				name: "D4: Basainti",
				connections: [24, 52, 54],
				short: 'D4B',
				flag: {
					x: 300,
					y: 718
				}
			}, {
				id: 54,
				name: "D4: Camehermenle",
				connections: [25, 53, 55],
				short: 'D4C',
				flag: {
					x: 415,
					y: 600
				}
			}, {
				id: 55,
				name: "D4: Dabiala",
				connections: [25, 54, 56],
				short: 'D4D',
				flag: {
					x: 398,
					y: 465
				}
			}, {
				id: 56,
				name: "D4: Enggreboka",
				connections: [26, 55, 57],
				short: 'D4E',
				flag: {
					x: 507,
					y: 361
				}
			}, {
				id: 57,
				name: "D4: Finnited",
				connections: [26, 56, 58],
				short: 'D4F',
				flag: {
					x: 723,
					y: 311
				}
			}, {
				id: 58,
				name: "D4: Guayre Bhugera",
				connections: [27, 57, 59],
				short: 'D4G',
				flag: {
					x: 878,
					y: 252
				}
			}, {
				id: 59,
				name: "D4: Honbo",
				connections: [27, 28, 58],
				short: 'D4H',
				flag: {
					x: 1042,
					y: 302
				}
			}];
		}
		else if (GuildFights.MapData.map['id'] === "waterfall_archipelago") {
			return [{
				id : 0,
				name : "X1X: Elleorus",
				connections : [ 1, 2, 3, 4, 5, 6],
				short : "X1X",
				flag : {
					x : 9,
					y : 9
				}
			}, {
				id : 1,
				name : "A2A: Flunnipia",
				connections : [ 0, 2, 6, 7, 8, 18],
				short : "A2A",
				flag : {
					x : 9,
					y : 7
				}
			}, {
				id : 2,
				name : "B2A: Achinata",
				connections : [ 0, 1, 3, 8, 9, 10],
				short : "B2A",
				flag : {
					x : 11,
					y : 8
				}
			}, {
				id : 3,
				name : "C2A: Enudran",
				connections : [ 0, 2, 4, 10, 11, 12],
				short : "C2A",
				flag : {
					x : 11,
					y : 10
				}
			}, {
				id : 4,
				name : "D2A: Zebbeasos",
				connections : [ 0, 3, 5, 12, 13, 14],
				short : "D2A",
				flag : {
					x : 9,
					y : 11
				}
			}, {
				id : 5,
				name : "E2A: Appatinaka",
				connections : [ 0, 4, 6, 14, 15, 16],
				short : "E2A",
				flag : {
					x : 7,
					y : 10
				}
			}, {
				id : 6,
				name : "F2A: Kracciarhia",
				connections : [ 0, 1, 5, 16, 17, 18],
				short : "F2A",
				flag : {
					x : 7,
					y : 8
				}
			}, {
				id : 7,
				name : "A3A: Micianary",
				connections : [ 1, 8, 18, 19, 20, 36],
				short : "A3A",
				flag : {
					x : 9,
					y : 5
				}
			}, {
				id : 8,
				name : "A3B: Sheaggasia",
				connections : [ 1, 2, 7, 9, 20, 21],
				short : "A3B",
				flag : {
					x : 11,
					y : 6
				}
			}, {
				id : 9,
				name : "B3A: Birrathan",
				connections : [ 2, 8, 10, 21, 22, 23],
				short : "B3A",
				flag : {
					x : 13,
					y : 7
				}
			}, {
				id : 10,
				name : "B3B: Phiodeanet",
				connections : [ 2, 3, 9, 11, 23, 24],
				short : "B3B",
				flag : {
					x : 13,
					y : 9
				}
			}, {
				id : 11,
				name : "C3A: Ioppiorion",
				connections : [ 3, 10, 12, 24, 25, 26],
				short : "C3A",
				flag : {
					x : 13,
					y : 11
				}
			}, {
				id : 12,
				name : "C3B: Acyalyn",
				connections : [ 3, 4, 11, 13, 26, 27],
				short : "C3B",
				flag : {
					x : 11,
					y : 12
				}
			}, {
				id : 13,
				name : "D3A: Giobbolas",
				connections : [ 4, 12, 14, 27, 28, 29],
				short : "D3A",
				flag : {
					x : 9,
					y : 13
				}
			}, {
				id : 14,
				name : "D3B: Briocealyn",
				connections : [ 4, 5, 13, 15, 29, 30],
				short : "D3B",
				flag : {
					x : 7,
					y : 12
				}
			}, {
				id : 15,
				name : "E3A: Joviolmond",
				connections : [ 5, 14, 16, 30, 31, 32],
				short : "E3A",
				flag : {
					x : 5,
					y : 11
				}
			}, {
				id : 16,
				name : "E3B: Ciobiathis",
				connections : [ 5, 6, 15, 17, 32, 33],
				short : "E3B",
				flag : {
					x : 5,
					y : 9
				}
			}, {
				id : 17,
				name : "F3A: Preammirune",
				connections : [ 6, 16, 18, 33, 34, 35],
				short : "F3A",
				flag : {
					x : 5,
					y : 7
				}
			}, {
				id : 18,
				name : "F3B: Exoryme",
				connections : [ 1, 6, 7, 17, 35, 36],
				short : "F3B",
				flag : {
					x : 7,
					y : 6
				}
			}, {
				id : 19,
				name : "A4A: Phiossiania",
				connections : [ 7, 20, 36, 37, 38, 60],
				short : "A4A",
				flag : {
					x : 9,
					y : 3
				}
			}, {
				id : 20,
				name : "A4B: Klitimelan",
				connections : [ 7, 8, 19, 21, 38, 39],
				short : "A4B",
				flag : {
					x : 11,
					y : 4
				}
			}, {
				id : 21,
				name : "A4C: Ioclequey",
				connections : [ 8, 9, 20, 22, 39, 40],
				short : "A4C",
				flag : {
					x : 13,
					y : 5
				}
			}, {
				id : 22,
				name : "B4A: Lastaruz",
				connections : [ 9, 21, 23, 40, 41, 42],
				short : "B4A",
				flag : {
					x : 15,
					y : 6
				}
			}, {
				id : 23,
				name : "B4B: Ecceacyre",
				connections : [ 9, 10, 22, 24, 42, 43],
				short : "B4B",
				flag : {
					x : 15,
					y : 8
				}
			}, {
				id : 24,
				name : "B4C: Yastalyn",
				connections : [ 10, 11, 23, 25, 43, 44],
				short : "B4C",
				flag : {
					x : 15,
					y : 10
				}
			}, {
				id : 25,
				name : "C4A: Chobbiabis",
				connections : [ 11, 24, 26, 44, 45, 46],
				short : "C4A",
				flag : {
					x : 15,
					y : 12
				}
			}, {
				id : 26,
				name : "C4B: Mioccijan",
				connections : [ 11, 12, 25, 27, 46, 47],
				short : "C4B",
				flag : {
					x : 13,
					y : 13
				}
			}, {
				id : 27,
				name : "C4C: Cheabenium",
				connections : [ 12, 13, 26, 28, 47, 48],
				short : "C4C",
				flag : {
					x : 11,
					y : 14
				}
			}, {
				id : 28,
				name : "D4A: Diodiriel",
				connections : [ 13, 27, 29, 48, 49, 50],
				short : "D4A",
				flag : {
					x : 9,
					y : 15
				}
			}, {
				id : 29,
				name : "D4B: Driqela",
				connections : [ 13, 14, 28, 30, 50, 51],
				short : "D4B",
				flag : {
					x : 7,
					y : 14
				}
			}, {
				id : 30,
				name : "D4C: Gakiaran",
				connections : [ 14, 15, 29, 31, 51, 52],
				short : "D4C",
				flag : {
					x : 5,
					y : 13
				}
			}, {
				id : 31,
				name : "E4A: Phulotora",
				connections : [ 15, 30, 32, 52, 53, 54],
				short : "E4A",
				flag : {
					x : 3,
					y : 12
				}
			}, {
				id : 32,
				name : "E4B: Iccothaer",
				connections : [ 15, 16, 31, 33, 54, 55],
				short : "E4B",
				flag : {
					x : 3,
					y : 10
				}
			}, {
				id : 33,
				name : "E4C: Ohephere",
				connections : [ 16, 17, 32, 34, 55, 56],
				short : "E4C",
				flag : {
					x : 3,
					y : 8
				}
			}, {
				id : 34,
				name : "F4A: Xioceomos",
				connections : [ 17, 33, 35, 56, 57, 58],
				short : "F4A",
				flag : {
					x : 3,
					y : 6
				}
			}, {
				id : 35,
				name : "F4B: Oglilyn",
				connections : [ 17, 18, 34, 36, 58, 59],
				short : "F4B",
				flag : {
					x : 5,
					y : 5
				}
			}, {
				id : 36,
				name : "F4C: Omialanto",
				connections : [ 7, 18, 19, 35, 59, 60],
				short : "F4C",
				flag : {
					x : 7,
					y : 4
				}
			}, {
				id : 37,
				name : "A5A: Appiatoph",
				connections : [ 19, 38, 60],
				short : "A5A",
				flag : {
					x : 9,
					y : 1
				}
			}, {
				id : 38,
				name : "A5B: Cuchrarahe",
				connections : [ 19, 20, 37, 39],
				short : "A5B",
				flag : {
					x : 11,
					y : 2
				}
			}, {
				id : 39,
				name : "A5C: Eokkirune",
				connections : [ 20, 21, 38, 40],
				short : "A5C",
				flag : {
					x : 13,
					y : 3
				}
			}, {
				id : 40,
				name : "A5D: Iyoriyaz",
				connections : [ 21, 22, 39, 41],
				short : "A5D",
				flag : {
					x : 15,
					y : 4
				}
			}, {
				id : 41,
				name : "B5A: Strennearial",
				connections : [ 22, 40, 42],
				short : "B5A",
				flag : {
					x : 17,
					y : 5
				}
			}, {
				id : 42,
				name : "B5B: Atherathios",
				connections : [ 22, 23, 41, 43],
				short : "B5B",
				flag : {
					x : 17,
					y : 7
				}
			}, {
				id : 43,
				name : "B5C: Xeaxudin",
				connections : [ 23, 24, 42, 44],
				short : "B5C",
				flag : {
					x : 17,
					y : 9
				}
			}, {
				id : 44,
				name : "B5D: Stronolyn",
				connections : [ 24, 25, 43, 45],
				short : "B5D",
				flag : {
					x : 17,
					y : 11
				}
			}, {
				id : 45,
				name : "C5A: Stuckodod",
				connections : [ 25, 44, 46],
				short : "C5A",
				flag : {
					x : 17,
					y : 13
				}
			}, {
				id : 46,
				name : "C5B: Kazazriel",
				connections : [ 25, 26, 45, 47],
				short : "C5B",
				flag : {
					x : 15,
					y : 14
				}
			}, {
				id : 47,
				name : "C5C: Pilitallios",
				connections : [ 26, 27, 46, 48],
				short : "C5C",
				flag : {
					x : 13,
					y : 15
				}
			}, {
				id : 48,
				name : "C5D: Xishotish",
				connections : [ 27, 28, 47, 49],
				short : "C5D",
				flag : {
					x : 11,
					y : 16
				}
			}, {
				id : 49,
				name : "D5A: Gegleadore",
				connections : [ 28, 48, 50],
				short : "D5A",
				flag : {
					x : 9,
					y : 17
				}
			}, {
				id : 50,
				name : "D5B: Wrorrulan",
				connections : [ 28, 29, 49, 51],
				short : "D5B",
				flag : {
					x : 7,
					y : 16
				}
			}, {
				id : 51,
				name : "D5C: Cleoseotophy",
				connections : [ 29, 30, 50, 52],
				short : "D5C",
				flag : {
					x : 5,
					y : 15
				}
			}, {
				id : 52,
				name : "D5D: Equioque",
				connections : [ 30, 31, 51, 53],
				short : "D5D",
				flag : {
					x : 3,
					y : 14
				}
			}, {
				id : 53,
				name : "E5A: Eatutiar",
				connections : [ 31, 52, 54],
				short : "E5A",
				flag : {
					x : 1,
					y : 13
				}
			}, {
				id : 54,
				name : "E5B: Kaweariael",
				connections : [ 31, 32, 53, 55],
				short : "E5B",
				flag : {
					x : 1,
					y : 11
				}
			}, {
				id : 55,
				name : "E5C: Yossiryon",
				connections : [ 32, 33, 54, 56],
				short : "E5C",
				flag : {
					x : 1,
					y : 9
				}
			},
				{
				id : 56,
				name : "E5D: Ecladorth",
				connections : [ 33, 34, 55, 57],
				short : "E5D",
				flag : {
					x : 1,
					y : 7
				}
			}, {
				id : 57,
				name : "F5A: Udriomond",
				connections : [ 34, 56, 58],
				short : "F5A",
				flag : {
					x : 1,
					y : 5
				}
			}, {
				id : 58,
				name : "F5B: Kreamenon",
				connections : [ 34, 35, 57, 59],
				short : "F5B",
				flag : {
					x : 3,
					y : 4
				}
			}, {
				id : 59,
				name : "F5C: Jokuthriaz",
				connections : [ 35, 36, 58, 60],
				short : "F5C",
				flag : {
					x : 5,
					y : 3
				}
			}, {
				id : 60,
				name : "F5D: Gleoleaterra",
				connections : [ 19, 36, 37, 59],
				short : "F5D",
				flag : {
					x : 7,
					y : 2
				}
			}];
		}
	}
}