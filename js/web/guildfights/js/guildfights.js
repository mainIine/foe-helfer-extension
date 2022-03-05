/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

// Provinznamen der GG
FoEproxy.addMetaHandler('guild_battleground_maps', (xhr, postData) => {
	GuildFights.ProvinceNames = JSON.parse(xhr.responseText);
});

// Provinzfarben der GG
FoEproxy.addMetaHandler('battleground_colour', (xhr, postData) => {
	GuildFights.Colors = JSON.parse(xhr.responseText);
	GuildFights.PrepareColors();
});

// Gildengefechte
FoEproxy.addHandler('GuildBattlegroundService', 'getPlayerLeaderboard', (data, postData) => {
	GuildFights.HandlePlayerLeaderboard(data.responseData);
});

// Gildengefechte
FoEproxy.addHandler('GuildBattlegroundStateService', 'getState', (data, postData) => {
	if (data.responseData['stateId'] !== 'participating')
	{
		GuildFights.CurrentGBGRound = parseInt(data.responseData['startsAt']) - 259200;

		if (GuildFights.curDateFilter === null || GuildFights.curDateEndFilter === null)
		{
			GuildFights.curDateFilter = moment.unix(GuildFights.CurrentGBGRound).subtract(11, 'd').format('YYYYMMDD');
			GuildFights.curDateEndFilter = moment.unix(GuildFights.CurrentGBGRound).format('YYYYMMDD');
		}

		GuildFights.HandlePlayerLeaderboard(data.responseData['playerLeaderboardEntries']);
	}
});

// Gildengefechte - Map, Gilden
FoEproxy.addHandler('GuildBattlegroundService', 'getBattleground', (data, postData) => {
	GuildFights.init();
	GuildFights.CurrentGBGRound = data['responseData']['endsAt'];

	if (GuildFights.curDateFilter === null || GuildFights.curDateEndFilter === null)
	{
		GuildFights.curDateFilter = moment.unix(GuildFights.CurrentGBGRound).subtract(11, 'd').format('YYYYMMDD');
		GuildFights.curDateEndFilter = MainParser.getCurrentDateTime();
	}

	GuildFights.MapData = data['responseData'];
	ActiveMap = 'gg';

	$('#gildFight-Btn').removeClass('hud-btn-red');
	$('#selectorCalc-Btn-closed').remove();

	if ($('#ProvinceMap').length > 0)
	{
		ProvinceMap.Refresh();
	}

	// update box when open
	if ($('#LiveGildFighting').length > 0)
	{
		GuildFights.BuildFightContent();
	}
});


/**
 * @type {{SettingsExport: GuildFights.SettingsExport, curDetailViewFilter: null, UpdateDB: ((function(*, *): Promise<void>)|*), GBGRound: null, PrevActionTimestamp: null, NewActionTimestamp: null, InjectionLoaded: boolean, MapData: null, BuildPlayerContent: ((function(*=): Promise<void>)|*), intiateDatePicker: ((function(): Promise<void>)|*), GBGHistoryView: boolean, LogDatePicker: null, NewAction: null, PrevAction: null, init: GuildFights.init, PrepareColors: GuildFights.PrepareColors, SetBoxNavigation: ((function(*=): Promise<void>)|*), PlayerBoxContent: *[], DeleteAlert: GuildFights.DeleteAlert, PlayerBoxSettingsSaveValues: GuildFights.PlayerBoxSettingsSaveValues, ToggleProgressList: GuildFights.ToggleProgressList, Colors: null, RefreshTable: GuildFights.RefreshTable, SetAlert: GuildFights.SetAlert, formatRange: (function(): string), GetAlertButton: (function(integer): string), Tabs: *[], ToggleCopyButton: GuildFights.ToggleCopyButton, Alerts: *[], PlayersPortraits: null, GetTabContent: (function(): string), ShowPlayerBox: GuildFights.ShowPlayerBox, CurrentGBGRound: null, showGuildColumn: number, curDateFilter: null, SortedColors: null, ShowGildBox: GuildFights.ShowGildBox, BuildFightContent: GuildFights.BuildFightContent, BuildDetailViewContent: ((function(*): Promise<void>)|*), SetTabContent: GuildFights.SetTabContent, BuildDetailViewLog: ((function(*): Promise<void>)|*), TabsContent: *[], GetAlerts: (function(): Promise<unknown>), UpdateCounter: GuildFights.UpdateCounter, GBGAllRounds: null, ProvinceNames: null, checkForDB: ((function(*): Promise<void>)|*), HandlePlayerLeaderboard: ((function(*): Promise<void>)|*), SetTabs: GuildFights.SetTabs, CopyToClipBoard: GuildFights.CopyToClipBoard, GetTabs: (function(): string), DeleteOldSnapshots: ((function(*=): Promise<void>)|*), PlayerBoxSettings: {showProgressFilter: number, showOnlyActivePlayers: number, showLogButton: number, showRoundSelector: number}, Neighbours: *[], curDateEndFilter: null, ShowPlayerBoxSettings: GuildFights.ShowPlayerBoxSettings, SaveLiveFightSettings: GuildFights.SaveLiveFightSettings, ShowLiveFightSettings: GuildFights.ShowLiveFightSettings, ShowDetailViewBox: GuildFights.ShowDetailViewBox}}
 */
let GuildFights = {

	Alerts: [],

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

	/**
	 * Zündung
	 */
	init: () => {
		// moment.js global set
		moment.locale(MainParser.Language);

		GuildFights.GetAlerts();

		if (GuildFights.InjectionLoaded === false)
		{
			FoEproxy.addWsHandler('GuildBattlegroundService', 'all', data => {

				// Update Tables
				if ($('#LiveGildFighting').length > 0 && data['responseData'][0])
				{
					GuildFights.RefreshTable(data['responseData'][0]);
				}

				// Update Minimap
				if($('#ProvinceMap').length > 0 && data['responseData'][0])
				{
					ProvinceMap.Refresh(data['responseData'][0]);
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

		for (let i in d)
		{

			if (!d.hasOwnProperty(i))
			{
				break;
			}
			sumNegotiations += d[i]['negotiationsWon'] || 0;
			sumBattles += d[i]['battlesWon'] || 0;

			players.push({
				gbground: GuildFights.CurrentGBGRound,
				rank: i * 1 + 1,
				player_id: d[i]['player']['player_id'],
				name: d[i]['player']['name'],
				avatar: d[i]['player']['avatar'],
				battlesWon: d[i]['battlesWon'] || 0,
				negotiationsWon: d[i]['negotiationsWon'] || 0
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
			await GuildFights.db.history.put({ gbground: GuildFights.CurrentGBGRound, sumNegotiations: data.sumNegotiations, sumBattles: data.sumBattles, participation: data.participation });
		}

		if (content === 'player')
		{

			let battles = 0,
				negotiations = 0;

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
			}
			else
			{
				battles = data.diffbat;
				negotiations = data.diffneg;
			}

			await GuildFights.db.snapshots.add({
				gbground: GuildFights.CurrentGBGRound,
				player_id: data.player_id,
				name: data.name,
				date: parseInt(moment.unix(data.time).format("YYYYMMDD")),
				time: data.time,
				battles: battles,
				negotiations: negotiations
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
				h.push(`${i18n('Boxes.GuildMemberStat.GBFRound')} <button class="btn btn-default btn-set-week" data-week="${previousweek}"${previousweek === null ? ' disabled' : ''}>&lt;</button> `);
				h.push(`<select id="gbg-select-gbground">`);

				GuildFights.GBGAllRounds.forEach(week => {
					h.push(`<option value="${week}"${gbground === week ? ' selected="selected"' : ''}>` + moment.unix(week).subtract(11, 'd').format(i18n('Date')) + ` - ` + moment.unix(week).format(i18n('Date')) + `</option>`);
				});

				h.push(`</select>`);
				h.push(`<button class="btn btn-default btn-set-week last" data-week="${nextweek}"${nextweek === null ? ' disabled' : ''}>&gt;</button>`);
			}

			if (gbground === GuildFights.CurrentGBGRound)
			{
				h.push(`<div id="gbgLogFilter">`);
				if (GuildFights.PlayerBoxSettings.showProgressFilter === 1)
				{
					h.push(`<button id="gbg_filterProgressList" title="${HTML.i18nTooltip(i18n('Boxes.GuildFights.ProgressFilterDesc'))}" class="btn btn-default" disabled>&#8593;</button>`);
				}

				if (GuildFights.PlayerBoxSettings.showLogButton === 1)
				{
					h.push(`<button id="gbg_showLog" class="btn btn-default">${i18n('Boxes.GuildFights.SnapshotLog')}</button>`);
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
		if (GuildFights.Alerts.find((a) => a.provId == provId) !== undefined)
		{
			btn = `<button class="btn-default btn-tight deletealertbutton" data-id="${provId}">${i18n('Boxes.GuildFights.DeleteAlert')}</button>`;
		}
		else
		{
			btn = `<button class="btn-default btn-tight setalertbutton" data-id="${provId}">${i18n('Boxes.GuildFights.SetAlert')}</button>`;
		}
		return btn;
	},

	/**
	 * Creates the box with the data
	 *
	 * @param reload
	 * @constructor
	 */
	ShowGildBox: (reload) => {

		if ($('#LiveGildFighting').length === 0)
		{
			HTML.Box({
				id: 'LiveGildFighting',
				title: i18n('Menu.Gildfight.Title'),
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize: true,
				settings: 'GuildFights.ShowLiveFightSettings()'
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

			moment.locale(MainParser.Language);

			HTML.Box({
				id: 'GildPlayers',
				title: i18n('Boxes.GuildFights.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
				settings: 'GuildFights.ShowPlayerBoxSettings()'
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('guildfights');
		}

		GuildFights.BuildPlayerContent(GuildFights.CurrentGBGRound);
	},

	/**
	 * Generates the snapshot detail box
	 * @param d
	 */
	ShowDetailViewBox: (d) => {
		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if ($('#GildPlayersDetailView').length === 0)
		{
			let ptop = null,
				pright = null;

			HTML.Box({
				id: 'GildPlayersDetailView',
				title: i18n('Boxes.GuildFights.SnapshotLog'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true
			});

			if (localStorage.getItem('GildPlayersDetailViewCords') === null)
			{
				ptop = $('#GildPlayers').length !== 0 ? $('#GildPlayers').position().top : 0;
				pright = $('#GildPlayers').length !== 0 ? ($('#GildPlayers').position().left + $('#GildPlayers').width() + 10) : 0;
				$('#GildPlayersDetailView').css('top', ptop + 'px').css('left', (pright * 1) + 'px');
			}

		}

		GuildFights.BuildDetailViewContent(d);
	},


	/**
	 * Built the player content content
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

		if (CurrentSnapshot === undefined)
		{
			newRound = true;
			// if there is a new GBG round delete previous snapshots
			GuildFights.DeleteOldSnapshots(GuildFights.CurrentGBGRound);
		}

		let t = [],
			b = [],
			tN = 0,
			tF = 0,
			histView = false;

		GuildFights.PlayerBoxContent = [];

		GuildFights.PlayerBoxContent.push({
			player: 'player',
			negotiationsWon: 'negotiations',
			battlesWon: 'battles',
			total: 'total'
		});

		if (gbground && gbground !== null && gbground !== GuildFights.CurrentGBGRound)
		{

			let d = await GuildFights.db.history.where({ gbground: gbground }).toArray();
			GuildFights.GBGRound = d[0].participation.sort(function (a, b) {
				return a.rank - b.rank;
			});
			histView = true;

		}
		else
		{
			GuildFights.GBGRound = GuildFights.NewAction;
		}

		for (let i in GuildFights.GBGRound)
		{
			if (!GuildFights.GBGRound.hasOwnProperty(i))
			{
				break;
			}

			let playerNew = GuildFights.GBGRound[i];

			let fightAddOn = '',
				negotaionAddOn = '',
				diffNegotiations = 0,
				diffBattles = 0,
				newProgressClass = '',
				change = false;

			// gibt es einen älteren Snapshot?
			if (GuildFights.PrevAction !== null && histView === false)
			{

				let playerOld = GuildFights.PrevAction.find(p => (p['player_id'] === playerNew['player_id']));

				// gibt es zu diesem Spieler Daten?
				if (playerOld !== undefined)
				{

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
				}
			}

			if ((change === true || newRound === true) && GuildFights.GBGHistoryView === false)
			{
				await GuildFights.UpdateDB('player', { gbground: GuildFights.CurrentGBGRound, player_id: playerNew['player_id'], name: playerNew['name'], battles: playerNew['battlesWon'], negotiations: playerNew['negotiationsWon'], diffbat: diffBattles, diffneg: diffNegotiations, time: moment().unix() });
				updateDetailView = true;
			}

			newProgressClass = change && !newRound ? 'new ' : '';

			tN += playerNew['negotiationsWon'];
			tF += playerNew['battlesWon'];

			b.push('<tr data-player="' + playerNew['player_id'] + '" data-gbground="' + gbground + '" class="' + newProgressClass + (!histView ? 'showdetailview ' : '') + (playerNew['player_id'] === ExtPlayerID ? 'mark-player ' : '') + (change === true ? 'bg-green' : '') + '">');

			b.push('<td class="tdmin">' + (parseInt(i) + 1) + '.</td>');

			b.push('<td class="tdmin"><img src="' + MainParser.InnoCDN + 'assets/shared/avatars/' + MainParser.PlayerPortraits[playerNew['avatar']] + '.jpg" alt=""></td>');

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
			b.push('<td></td>');
			b.push('</tr>');

			GuildFights.PlayerBoxContent.push({
				player: playerNew['name'],
				negotiationsWon: playerNew['negotiationsWon'],
				battlesWon: playerNew['battlesWon'],
				total: both
			})
		}

		// Update DetailView if there are changes and DetailView is open
		if ($('#GildPlayersDetailView').length !== 0 && updateDetailView === true)
		{
			GuildFights.BuildDetailViewContent(GuildFights.curDetailViewFilter);
		}

		let tNF = (tN * 2) + tF;

		t.push('<table id="GildPlayersTable" class="foe-table' + (histView === false ? ' chevron-right' : '') + '">');

		t.push('<thead>');
		t.push('<tr>');

		t.push('<th class="tdmin">&nbsp;</th>');
		t.push('<th class="tdmin">&nbsp;</th>');
		t.push('<th>' + i18n('Boxes.GuildFights.Player') + '</th>');
		t.push('<th class="text-center"><span class="negotiation" title="' + HTML.i18nTooltip(i18n('Boxes.GuildFights.Negotiations')) + '"></span> <strong class="text-warning">(' + HTML.Format(tN) + ')</strong></th>');
		t.push('<th class="text-center"><span class="fight" title="' + HTML.i18nTooltip(i18n('Boxes.GuildFights.Fights')) + '"></span> <strong class="text-warning">(' + HTML.Format(tF) + ')</strong></th>');
		t.push('<th class="text-center">' + i18n('Boxes.GuildFights.Total') + ' <strong class="text-warning">(' + HTML.Format(tNF) + ')</strong></th>');
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

				if ($('#GildPlayersDetailView').length === 0)
				{
					GuildFights.ShowDetailViewBox(GuildFights.curDetailViewFilter);
				}
				else
				{

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

			h.push('<table id="gbgPlayerLogTable" class="foe-table gbglog"><thead>');
			h.push('<tr class="sorter-header">');
			h.push('<th class="is-number" data-type="gbg-playerlog-group">' + i18n('Boxes.GuildFights.Date') + '</th>');
			h.push('<th class="is-number text-center" data-type="gbg-playerlog-group"><span class="negotiation" title="' + HTML.i18nTooltip(i18n('Boxes.GuildFights.Negotiations')) + '"></span></th>');
			h.push('<th class="is-number text-center" data-type="gbg-playerlog-group"><span class="fight" title="' + HTML.i18nTooltip(i18n('Boxes.GuildFights.Fights')) + '"></span></th>');
			h.push(`<th class="is-number text-center" data-type="gbg-playerlog-group">${i18n('Boxes.GuildFights.Total')}</th>`);
			h.push(`<th></th>`);
			h.push('</tr>');
			h.push('</thead><tbody class="gbg-playerlog-group">');

			dailyFights.forEach(day => {
				let id = moment.unix(day.time).format(i18n('DateTime'));
				let sum = (day.battles + day.negotiations * 2);
				h.push('<tr id="gbgdetail_' + id + '" data-gbground="' + gbground + '" data-player="' + player_id + '" data-id="' + id + '" class="hasdetail">');
				h.push(`<td class="is-number" data-number="${day.time}">${moment.unix(day.time).format(i18n('Date'))}</td>`);
				h.push(`<td class="is-number text-center" data-number="${day.negotiations}">${HTML.Format(day.negotiations)}</td>`);
				h.push(`<td class="is-number text-center" data-number="${day.battles}">${HTML.Format(day.battles)}</td>`);
				h.push(`<td class="is-number text-center" data-number="${sum}">${HTML.Format(sum)}</td>`);
				h.push(`<td></td>`);
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

			h.push('<div class="datetimepicker"><button id="gbgLogDatepicker" class="btn btn-default">' + GuildFights.formatRange() + '</button></div>');
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
				h.push(`<td class="case-sensitive" data-text="${e.name.toLowerCase().replace(/[\W_ ]+/g, "")}">${e.name}</td>`);
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

		if (!data.width)
		{
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

		GuildFights.SetTabs('gbgprogress');
		GuildFights.SetTabs('gbgnextup');

		let progress = [], guilds = [], nextup = [],
			mapdata = GuildFights.MapData['map']['provinces'],
			gbgGuilds = GuildFights.MapData['battlegroundParticipants'],
			own = gbgGuilds.find(e => e['clan']['id'] === ExtGuildID),
			LiveFightSettings = JSON.parse(localStorage.getItem('LiveFightSettings'));

		GuildFights.showGuildColumn = (LiveFightSettings && LiveFightSettings.showGuildColumn !== undefined) ? LiveFightSettings.showGuildColumn : 0;

		progress.push('<div id="progress"><table class="foe-table">');
		progress.push('<thead><tr>');
		progress.push('<th class="prov-name" style="user-select:text">' + i18n('Boxes.GuildFights.Province') + '</th>');

		if (GuildFights.showGuildColumn)
		{
			progress.push('<th>' + i18n('Boxes.GuildFights.Owner') + '</th>');
		}

		progress.push('<th>' + i18n('Boxes.GuildFights.Progress') + '</th>');

		progress.push('</tr></thead><tbody>');

		for (let i in mapdata)
		{
			if (!mapdata.hasOwnProperty(i))
			{
				break;
			}

			let id = mapdata[i]['id'];

			mapdata[i]['neighbor'] = [];

			let linkIDs = ProvinceMap.ProvinceData().find(e => e['id'] === id)['connections'];

			for (let x in linkIDs)
			{
				if (!linkIDs.hasOwnProperty(x))
				{
					continue;
				}

				let neighborID = GuildFights.MapData['map']['provinces'].find(e => e['id'] === linkIDs[x]);

				if (neighborID['ownerId'])
				{
					mapdata[i]['neighbor'].push(neighborID['ownerId']);
				}
			}

			for (let x in gbgGuilds)
			{
				if (!gbgGuilds.hasOwnProperty(x))
				{
					break;
				}

				if (mapdata[i]['ownerId'] !== undefined && gbgGuilds[x]['participantId'] === mapdata[i]['ownerId'])
				{
					// show current fights
					if (mapdata[i]['conquestProgress'].length > 0 && (mapdata[i]['lockedUntil'] === undefined))
					{
						let pColor = GuildFights.SortedColors.find(e => e['id'] === mapdata[i]['ownerId']);

						progress.push(`<tr id="province-${id}" data-id="${id}" data-tab="progress">`);

						//console.log('gbgGuilds[x]: ', gbgGuilds[x]);

						progress.push(`<td title="${i18n('Boxes.GuildFights.Owner')}: ${gbgGuilds[x]['clan']['name']}"><b><span class="province-color" style="background-color:${pColor['main']}"></span> ${mapdata[i]['title']}</b></td>`);

						if (GuildFights.showGuildColumn)
						{
							progress.push(`<td>${gbgGuilds[x]['clan']['name']}</td>`);
						}
						progress.push(`<td data-field="${id}-${mapdata[i]['ownerId']}" class="guild-progress">`);

						let provinceProgress = mapdata[i]['conquestProgress'];

						for (let y in provinceProgress)
						{
							if (!provinceProgress.hasOwnProperty(y))
							{
								break;
							}

							let color = GuildFights.SortedColors.find(e => e['id'] === provinceProgress[y]['participantId']);

							progress.push(`<span class="attack attacker-${provinceProgress[y]['participantId']} gbg-${color['cid']}">${provinceProgress[y]['progress']}</span>`);
						}
					}
				}
			}

			// If sectors doesnt belong to anyone
			if (mapdata[i]['ownerId'] === undefined && mapdata[i]['conquestProgress'].length > 0)
			{
				progress.push(`<tr id="province-${id}" data-id="${id}" data-tab="progress">`);
				progress.push(`<td><b><span class="province-color" style="background-color:#555"></span> ${mapdata[i]['title']}</b></td>`);

				if (GuildFights.showGuildColumn)
				{
					progress.push(`<td><em>${i18n('Boxes.GuildFights.NoOwner')}</em></td>`);
				}
				progress.push('<td data-field="' + id + '" class="guild-progress">');

				let provinceProgress = mapdata[i]['conquestProgress'];

				for (let y in provinceProgress)
				{
					if (!provinceProgress.hasOwnProperty(y))
					{
						break;
					}

					let color = GuildFights.SortedColors.find(e => e['id'] === provinceProgress[y]['participantId']);

					progress.push(`<span class="attack attacker-${provinceProgress[y]['participantId']} gbg-${color['cid']}">${provinceProgress[y]['progress']}</span>`);
				}
			}
		}

		progress.push('</tbody>');
		progress.push('</table></div>');

		nextup.push('<div id="nextup"><table class="foe-table">');
		nextup.push('<thead><tr>');
		nextup.push('<th class="prov-name">' + i18n('Boxes.GuildFights.Province') + '</th>');

		if (GuildFights.showGuildColumn)
		{
			nextup.push('<th>' + i18n('Boxes.GuildFights.Owner') + '</th>');
		}
		nextup.push('<th class="time-static">' + i18n('Boxes.GuildFights.Time') + '</th>');
		nextup.push('<th class="time-dynamic">' + i18n('Boxes.GuildFights.Count') + '</th>');

		nextup.push('<th></th></tr></thead>');

		let arrayprov = [];

		// Time until next sectors will be available
		for (let i in mapdata)
		{
			if (!mapdata.hasOwnProperty(i)) continue;


			if (mapdata[i]['lockedUntil'] !== undefined && own['clan']['name'] !== mapdata[i]['owner']) // dont show own sectors -> maybe a setting box to choose which sectors etc. will be shown?
			{
				arrayprov.push(mapdata[i]);  // push all datas into array
			}
		}

		let prov = arrayprov.sort((a, b) => { return a.lockedUntil - b.lockedUntil });

		for (let x in prov)
		{
			if (!prov.hasOwnProperty(x)) continue;

			if (prov[x]['neighbor'].includes(own['participantId']))
			{
				let countDownDate = moment.unix(prov[x]['lockedUntil'] - 2),
					color = GuildFights.SortedColors.find(e => e['id'] === prov[x]['ownerId']),
					intervalID = setInterval(() => {
						GuildFights.UpdateCounter(countDownDate, intervalID, prov[x]['id']);
					}, 1000);

				nextup.push(`<tr id="timer-${prov[x]['id']}" class="timer" data-tab="nextup" data-id=${prov[x]['id']}>`);
				nextup.push(`<td class="prov-name" title="${i18n('Boxes.GuildFights.Owner')}: ${prov[x]['owner']}"><span class="province-color" ${color['main'] ? 'style="background-color:' + color['main'] + '"' : ''}"></span> <b>${prov[x]['title']}</b></td>`);

				GuildFights.UpdateCounter(countDownDate, intervalID, prov[x]['id']);

				if (GuildFights.showGuildColumn)
				{
					nextup.push(`<td>${prov[x]['owner']}</td>`);
				}

				nextup.push(`<td class="time-static" style="user-select:text">${countDownDate.format('HH:mm')}</td>`);
				nextup.push(`<td class="time-dynamic" id="counter-${prov[x]['id']}">${countDownDate.format('HH:mm:ss')}</td>`);
				nextup.push(`<td class="text-right" id="alert-${prov[x]['id']}">${GuildFights.GetAlertButton(prov[x]['id'])}</td>`);
				nextup.push('</tr>');
			}
		}

		nextup.push('</table></div>');

		GuildFights.SetTabContent('gbgprogress', progress.join(''));
		GuildFights.SetTabContent('gbgnextup', nextup.join(''));

		let h = [];

		h.push('<div class="gbg-tabs tabs">');
		h.push(GuildFights.GetTabs());
		h.push(GuildFights.GetTabContent());
		h.push('<button class="btn-default copybutton" onclick="GuildFights.CopyToClipBoard()">COPY</button>');
		h.push('<button class="btn-default mapbutton" onclick="ProvinceMap.buildMap()">MAP</button>');
		h.push('</div>');

		$('#LiveGildFighting').find('#LiveGildFightingBody').html(h.join('')).promise().done(function () {
			$('.gbg-tabs').tabslet({ active: 1 });
			$('.gbg-tabs').on('_after', (e) => {
				GuildFights.ToggleCopyButton();
			});
			$('#LiveGildFighting').on('click', '.deletealertbutton', function (e) {
				GuildFights.DeleteAlert($(this).data('id'));
				e.stopPropagation();
			});
			$('#LiveGildFighting').on('click', '.setalertbutton', function (e) {
				GuildFights.SetAlert($(this).data('id'));
				e.stopPropagation();
			});
			$('#LiveGildFighting').on('click', 'tr', function () {
				if ($(this).hasClass('highlight-row'))
				{
					$(this).removeClass('highlight-row');
					GuildFights.ToggleCopyButton();
				} else
				{
					$(this).addClass('highlight-row');
					GuildFights.ToggleCopyButton();
				}
			});
		});
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

		if (dateStart.isSame(dateEnd))
		{
			text = `${dateStart.format(i18n('Date'))}`;
		}
		else if (dateStart.year() !== (dateEnd.year()))
		{
			text = `${dateStart.format(i18n('Date'))}` + ' - ' + `${dateEnd.format(i18n('Date'))}`;
		}
		else
		{
			text = `${dateStart.format(i18n('DateShort'))}` + ' - ' + `${dateEnd.format(i18n('Date'))}`;
		}

		return text;
	},


	ToggleCopyButton: () => {
		if ($('#nextup').is(':visible') && $('.timer.highlight-row').length > 0)
		{
			$('.copybutton').show();
		} else
		{
			$('.copybutton').hide();
		}
	},


	CopyToClipBoard: () => {
		let copy = '';
		let copycache = [];
		$('.timer.highlight-row').each(function () {
			copycache.push(GuildFights.MapData['map']['provinces'].find((mapItem) => mapItem.id == $(this).data('id')));
		});

		copycache.sort(function (a, b) { return a.lockedUntil - b.lockedUntil });
		copycache.forEach((mapElem) => {
			copy += `${moment.unix(mapElem.lockedUntil - 2).format('HH:mm')} ${mapElem.title}\n`;
		});

		if (copy !== '')
		{
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

		if (countDownDate.isValid())
		{
			let diff = countDownDate.diff(moment());

			if (diff <= 0)
			{
				removeIt = true;
			}
			else
			{
				idSpan.text(moment.utc(diff).format('HH:mm:ss'));
			}
		}
		else
		{
			removeIt = true;
		}

		if (removeIt)
		{
			clearInterval(intervalID);

			idSpan.text('');
			$(`#timer-${id}`).find('.time-static').html(`<strong class="text-success">offen</strong>`); // @ToDo: translate

			// remove timer after 10s
			setTimeout(() => {
				$(`#timer-${id}`).fadeToggle(function () {
					$(this).remove();
					GuildFights.ToggleCopyButton();
				});
			}, 10000);
		}
	},


	/**
	 * Determine and assign colours of the individual guilds
	 */
	PrepareColors: () => {

		// ist schon fertig aufbereitet
		if (GuildFights.SortedColors !== null)
		{
			return;
		}

		let colors = [],
			gbgGuilds = GuildFights.MapData['battlegroundParticipants'];

		for (let i in gbgGuilds)
		{
			if (!gbgGuilds.hasOwnProperty(i))
			{
				break;
			}

			let c = null;

			if (gbgGuilds[i]['clan']['id'] === ExtGuildID)
			{
				c = GuildFights.Colors.find(o => (o['id'] === 'own_guild_colour'));
			} else
			{
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
		if (data['conquestProgress'].length === 0 || data['lockedUntil'])
		{
			let $province = $(`#province-${data['id']}`),
				elements = $province.find('.attack').length;

			$(`.attack-${data['id']}`).fadeToggle(function () {
				$(this).remove();
			});

			if (elements === 1)
			{
				$province.fadeToggle(function () {
					$(this).remove();
				});
			}

			// search the province for owner update
			ProvinceMap.MapMerged.forEach((province, index) => {
				if (province.id === data['id'])
				{
					let colors = GuildFights.SortedColors.find(e => e['id'] === data['ownerId']);

					ProvinceMap.MapMerged[index].ownerId = data['ownerId'];
					ProvinceMap.MapMerged[index].fillStyle = ProvinceMap.hexToRgb(colors['main'], '.3');
					ProvinceMap.MapMerged[index].strokeStyle = ProvinceMap.hexToRgb(colors['main']);
				}
			});

			if ($('#ProvinceMap').length > 0)
			{
				ProvinceMap.Refresh();
			}

			return;
		}


		for (let i in data['conquestProgress'])
		{
			if (!data['conquestProgress'].hasOwnProperty(i))
			{
				break;
			}

			let d = data['conquestProgress'][i],
				max = d['maxProgress'],
				progess = d['progress'],
				cell = $(`tr#province-${data['id']}`),
				pColor = GuildFights.SortedColors.find(e => e['id'] === data['participantId']),
				p = GuildFights.MapData['battlegroundParticipants'].find(o => (o['participantId'] === d['participantId']));

			if (!data['id'])
			{
				continue;
			}

			// <tr> is not present, create it
			if (cell.length === 0)
			{
				let newCell = $('<tr />').attr({
					id: `province-${data['id']}`,
					'data-id': data['id']
				});

				let mD = GuildFights.MapData['map']['provinces'].find(d => d.id === data['id']);

				$('#progress').find('table.foe-table').prepend(
					newCell.append(
						$('<td />').append(
							$('<span />').css({ 'background-color': pColor['main'] }).attr({ class: 'province-color' }),
							$('<b />').text(mD['title']),
						),
						(GuildFights.showGuildColumn ? $('<td />').text(p['clan']['name']) : ''),
						$('<td />').attr({
							field: `${data['id']}-${data['ownerId']}`,
							class: 'guild-progress'
						})
					)
				);

				cell = $(`#province-${data['id']}`);
			}

			cell.removeClass('pulse');

			if (cell.find('.attacker-' + d['participantId']).length > 0)
			{
				cell.find('.attacker-' + d['participantId']).text(progess);
			}

			else
			{
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
		c.push(`<p><button id="save-GuildFightsPlayerBox-settings" class="btn btn-default" style="width:100%" onclick="GuildFights.PlayerBoxSettingsSaveValues()">${i18n('Boxes.General.Save')}</button></p>`);
		c.push(`<hr><p>${i18n('Boxes.General.Export')}: <button class="btn btn-default" onclick="GuildFights.SettingsExport('csv')" title="${HTML.i18nTooltip(i18n('Boxes.General.ExportCSV'))}">CSV</button>`);
		c.push(`<button class="btn btn-default" onclick="GuildFights.SettingsExport('json')" title="${HTML.i18nTooltip(i18n('Boxes.General.ExportJSON'))}">JSON</button></p>`);

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


	SettingsExport: (type) => {

		let blob, file;
		let BOM = "\uFEFF";

		if (type === 'json')
		{
			let json = JSON.stringify(GuildFights.PlayerBoxContent);

			blob = new Blob([BOM + json], {
				type: 'application/json;charset=utf-8'
			});
			file = `ggfights-${ExtWorld}.json`;
		}

		else if (type === 'csv')
		{
			let csv = [];

			for (let i in GuildFights.PlayerBoxContent)
			{
				if (!GuildFights.PlayerBoxContent.hasOwnProperty(i))
				{
					break;
				}

				let r = GuildFights.PlayerBoxContent[i];
				csv.push(`${r['player']};${r['negotiationsWon']};${r['battlesWon']};${r['total']}`);
			}

			blob = new Blob([BOM + csv.join('\r\n')], {
				type: 'text/csv;charset=utf-8'
			});
			file = `ggfights-${ExtWorld}.csv`;
		}

		MainParser.ExportFile(blob, file);

		$(`#GildPlayersSettingsBox`).fadeToggle('fast', function () {
			$(this).remove();
		});
	},


	GetAlerts: async () => {
		return new Promise(async (resolve, reject) => {
			// is alert.js included?
			if (!Alerts)
			{
				resolve();
			}

			// fetch all alerts and search the id
			return Alerts.getAll().then((resp) => {
				if (resp.length === 0)
				{
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

		c.push(`<p><input id="showguildcolumn" name="showguildcolumn" value="1" type="checkbox" ${(showGuildColumn === 1) ? ' checked="checked"' : ''} /> <label for="showguildcolumn">${i18n('Boxes.GuildFights.ShowOwner')}</label></p>`);
		c.push(`<p><button onclick="GuildFights.SaveLiveFightSettings()" id="save-livefight-settings" class="btn btn-default" style="width:100%">${i18n('Boxes.GuildFights.SaveSettings')}</button></p>`);

		// insert into DOM
		$('#LiveGildFightingSettingsBox').html(c.join(''));
	},


	SaveLiveFightSettings: () => {
		let value = {};

		value.showGuildColumn = 0;

		if ($("#showguildcolumn").is(':checked'))
		{
			value.showGuildColumn = 1;
		}

		GuildFights.showGuildColumn = value.showGuildColumn;

		localStorage.setItem('LiveFightSettings', JSON.stringify(value));

		$(`#LiveGildFightingSettingsBox`).fadeToggle('fast', function () {
			$.when($(`#LiveGildFightingSettingsBox`).remove()).then(
				GuildFights.ShowGildBox(true)
			);
		});
	},
};

/**
 *
 * @type {{ProvinceObject: {}, ToolTipActive: boolean, FrameSize: number, prepare: ProvinceMap.prepare, MapMerged: *[], ParseNumber: (function(*, *): {num: number, index}), MapCTX: {}, ParseMove: (function(*, *)), ParseCurve: (function(*, *)), StrokeColor: string, MapSize: {width: number, height: number}, PrepareProvinces: ProvinceMap.PrepareProvinces, Refresh: ProvinceMap.Refresh, ParsePathToCanvas: (function(*): Path2D), Mouse: {x: undefined, y: undefined}, StrokeWidth: number, buildMap: ProvinceMap.buildMap, ToolTipId: boolean, ProvinceData: ((function(): (*|undefined))|*), Map: {}, hexToRgb: ((function(*, *): string)|*)}}
 */
let ProvinceMap = {

	Map: {},
	MapCTX: {},

	MapMerged: [],
	ProvinceObject: {},

	ToolTipActive: false,
	ToolTipId: false,

	Mouse: {
		x: undefined,
		y: undefined
	},

	StrokeWidth: 4,
	StrokeColor: '#fff',
	FrameSize: 1,

	MapSize: {
		width: 2500,
		height: 1960
	},

	buildMap: () => {

		if ($('#ProvinceMap').length === 0)
		{
			HTML.Box({
				id: 'ProvinceMap',
				title: 'ProvinceMap',
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
				keepRatio: true
			});

			// add css to the dom
			HTML.AddCssFile('guildfights');
		}

		ProvinceMap.prepare();
	},


	prepare: () => {

		$('#ProvinceMap').addClass(GuildFights.MapData.map['id']);

		ProvinceMap.Map = document.createElement("canvas");

		ProvinceMap.Map.width = ProvinceMap.MapSize.width;
		ProvinceMap.Map.height = ProvinceMap.MapSize.height;

		ProvinceMap.MapCTX = ProvinceMap.Map.getContext('2d');

		$(ProvinceMap.Map).attr({
			id: 'province-map'
		});

		ProvinceMap.Map.width = ProvinceMap.MapSize.width;
		ProvinceMap.Map.height = ProvinceMap.MapSize.height;

		$('#ProvinceMapBody').html(ProvinceMap.Map);

		ProvinceMap.MapCTX.translate(-3, -3);
		ProvinceMap.MapCTX.globalCompositeOperation = 'destination-over';

		ProvinceMap.Map.addEventListener('mousedown', e => {
			handleMouseDown(e);
		});

		// get the mouse-cords relativ the the minified canvas
		function handleMouseDown(e) {
			e.preventDefault();
			e.stopPropagation();

			const $canvas = $(ProvinceMap.Map),
				canvasOffset = $canvas.offset(),
				canvasWidth = $canvas.width(),
				offsetX = e.pageX - canvasOffset.left,
				offsetY = e.pageY - canvasOffset.top,
				factor = ((canvasWidth / 2500) * 100);

			ProvinceMap.Mouse.x = ((offsetX * 100) / factor);
			ProvinceMap.Mouse.y = ((offsetY * 100) / factor);

			// ProvinceMap.Refresh();
		}

		// Objects
		function Province(data) {
			for (let key in data)
			{
				if (!data.hasOwnProperty(key)) continue;

				if (data[key])
				{
					this[key] = data[key];
				}
			}
		}


		Province.prototype.drawGGMap = function () {

			ProvinceMap.MapCTX.lineWidth = ProvinceMap.StrokeWidth;


			ProvinceMap.MapCTX.globalAlpha = this.alpha;
			ProvinceMap.MapCTX.strokeStyle = this.strokeStyle;
			ProvinceMap.MapCTX.fillStyle = this.fillStyle;

			let id = this['id'] || 0;

			// check if someone fighting on this sector
			let parties = GuildFights.MapData['map']['provinces'][id];

			if(parties['conquestProgress'] && parties['conquestProgress'].length > 0)
			{
				let mostParticipantId = parties['conquestProgress'].sort((a, b)=> b.progress - a.progress)[0]['participantId'];

				ProvinceMap.MapCTX.setLineDash([8, 10]);
				ProvinceMap.MapCTX.strokeStyle = GuildFights.SortedColors.find(o => o['id'] === mostParticipantId)['main'];
			}
			else {
				ProvinceMap.MapCTX.setLineDash([]);
			}

			/*
				"this" object

				alpha: 0.3
				fillStyle: "rgba(190,189,189,.3)"
				flag: {x: 878, y: 1063}
				flagImg: 'flag_15',
				flagPos: {x: 828, y: 1063}
				id: 9
				links: [2, 8, 10, 22, 23]
				name: "C2: Tayencoria"
				ownerID: 56596
				ownerName: "Brennholz-Verleih"
				path: "M853.82,1179.501c-1.966-3.399-3.049-5.821-4.618-7.874 c-4...."
				short: "C2T"
				strokeStyle: "rgb(190,189,189)"
			*/

			// console.log('this: ', this);

			const path = ProvinceMap.ParsePathToCanvas(this.path);

			// Province border
			ProvinceMap.MapCTX.globalAlpha = 1;
			ProvinceMap.MapCTX.font = 'bold 45px Arial';
			ProvinceMap.MapCTX.textAlign = "center";
			ProvinceMap.MapCTX.stroke(path);

			// if is spawn, no text => image + background color
			if (this.flagImg && this.flagPos)
			{
				ProvinceMap.MapCTX.globalAlpha = 0.2;
				ProvinceMap.MapCTX.fill(path);

				let flag_image = new Image(),
					flag_x = this.flagPos.x,
					flag_y = this.flagPos.y;

				flag_image.src = `${MainParser.InnoCDN}assets/shared/clanflags/${this.flagImg}.jpg`;

				flag_image.onload = function () {
					ProvinceMap.MapCTX.globalAlpha = 1;
					ProvinceMap.MapCTX.drawImage(this, flag_x, flag_y);
				}
			}
			else
			{
				ProvinceMap.MapCTX.globalAlpha = 0.5;
				ProvinceMap.MapCTX.fill(path);
				ProvinceMap.MapCTX.strokeStyle = '#00000088';
				ProvinceMap.MapCTX.lineWidth = 5;

				// Title e.g. "B4D"
				ProvinceMap.MapCTX.globalAlpha = 1;
				ProvinceMap.MapCTX.fillStyle = (!this.ownerID ? '#ffffff' : this.strokeStyle);
				ProvinceMap.MapCTX.fillText(this.short, this.flag.x, this.flag.y - 20);
				ProvinceMap.MapCTX.strokeText(this.short, this.flag.x, this.flag.y - 20);

				// time 
				ProvinceMap.MapCTX.globalAlpha = 1;
				ProvinceMap.MapCTX.font = 'bold 30px Arial';
				ProvinceMap.MapCTX.fillStyle = (!this.ownerID ? '#ffffff' : this.strokeStyle);

				let provinceUnlockTime = (moment.unix(this.lockedUntil).format('HH:mm') != 'Invalid date') ? moment.unix(this.lockedUntil).format('HH:mm') : '';
				ProvinceMap.MapCTX.fillText(provinceUnlockTime, this.flag.x, this.flag.y+20);
				ProvinceMap.MapCTX.strokeText(provinceUnlockTime, this.flag.x, this.flag.y+20);
			}

			/*
			// Mouseclick? Tooltip!
			if(ProvinceMap.MapCTX.isPointInPath(path, ProvinceMap.Mouse.x, ProvinceMap.Mouse.y) && this.lockedUntil)
			{
				ProvinceMap.MapCTX.font = '40px Arial';
				ProvinceMap.MapCTX.fillStyle  = '#ffffff';
				ProvinceMap.MapCTX.textAlign = 'left';

				ProvinceMap.MapCTX.fillText(moment.unix(this.lockedUntil).format('HH:mm:ss'), ProvinceMap.Mouse.x, ProvinceMap.Mouse.y);

				ProvinceMap.ToolTipActive = true;
			}
			*/
		}

		Province.prototype.updateGGMap = function () {

			this.drawGGMap();

			// hier Farbe ändern
			// this.x += this.velocity.x // Move x coordinate
			// this.y += this.velocity.y // Move y coordinate
		}

		// Implementation
		let provinces = [];

		function init() {
			ProvinceMap.ProvinceData().forEach(function (i) {

				const path = i.path.replace(/\s+/g, " ");
				const pD = ProvinceMap.ProvinceData()[i.id];

				let data = {
					id: i.id,
					name: pD.name,
					short: pD.short,
					links: pD.connections,
					flag: pD.flag,
					flagPos: pD.flagPos,
					path: path,
					strokeStyle: '#444',
					fillStyle: '#444',
					alpha: 1
				};

				const prov = GuildFights.MapData['map']['provinces'][i.id];

				if (prov['ownerId'] || pD.flagPos)
				{
					const colors = GuildFights.SortedColors.find(c => (c['id'] === prov['ownerId']));

					data['ownerID'] = prov['ownerId'];
					data['ownerName'] = prov['owner'];
					data['fillStyle'] = ProvinceMap.hexToRgb(colors['main'], '.3');
					data['strokeStyle'] = ProvinceMap.hexToRgb(colors['main']);
					data['alpha'] = 0.3;

					if (prov['isSpawnSpot'])
					{
						let clan = GuildFights.MapData['battlegroundParticipants'].find(c => c['participantId'] === prov['ownerId']);

						data['flagImg'] = clan['clan']['flag'].toLowerCase();
					}

					if (prov['lockedUntil'])
					{
						data['lockedUntil'] = prov['lockedUntil'];
					}
				}

				provinces.push(new Province(data));
			});

			ProvinceMap.MapMerged = provinces;
		}

		init();
		// refresh();

		ProvinceMap.Refresh();
	},


	PrepareProvinces: () => {

	},


	/**
	 * Rebuild the Canvas
	 *
	 * @param socketData
	 * @constructor
	 */
	Refresh: (socketData = []) => {
		ProvinceMap.MapCTX.clearRect(0, 0, ProvinceMap.Map.width, ProvinceMap.Map.height)

		if(socketData.length)
		{
			let idx = ProvinceMap.MapMerged.findIndex(p => p.id === socketData['id']);

			ProvinceMap.MapMerged[idx]['conquestProgress'] = socketData['conquestProgress'];
		}

		const provinces = ProvinceMap.MapMerged;

		ProvinceMap.ToolTipActive = false;

		provinces.forEach(province => {
			province.updateGGMap();
		});

		if (!ProvinceMap.ToolTipActive)
		{
			clearInterval(ProvinceMap.ToolTipId);
			ProvinceMap.ToolTipId = false;
		}
		/*
		else {
			ProvinceMap.ToolTipId = setInterval(()=>{
				ProvinceMap.Refresh();
			}, 1000);
		}
		*/
	},

	/*
	DrawProvinces: () => {
		const pD = ProvinceMap.ProvinceData();

		ProvinceMap.MapCTX.clearRect(0, 0, ProvinceMap.MapSize.width, ProvinceMap.MapSize.height);

		ProvinceMap.ProvinceData().forEach(function (i) {
			let path = i.path.replace(/\s+/g, " ");

			ProvinceMap.MapCTX.lineWidth = ProvinceMap.StrokeWidth;
			ProvinceMap.MapCTX.strokeStyle = ProvinceMap.StrokeColor;

			ProvinceMap.ParsePathToCanvas(path);

			const e = pD[i.id];

			ProvinceMap.MapMerged[e.id] = {
				id: e.id,
				name: e.name,
				links: e.connections,
				flag: e.flag,
				p: path
			};

			if (e.short)
			{

				switch (e.short.substring(1, 2))
				{
					case '4':
						ProvinceMap.MapCTX.fillStyle = "rgba(234,255,0,.9)";
						break;

					case '3':
						ProvinceMap.MapCTX.fillStyle = "rgba(135,0,230,.8)";
						break;

					case '2':
						ProvinceMap.MapCTX.fillStyle = "rgba(255,0,90,.8)";
						break;

					case '1':
						ProvinceMap.MapCTX.fillStyle = "rgba(0,132,254,.8)";
						break;
				}
			}

			ProvinceMap.MapCTX.lineWidth = 2;
			ProvinceMap.MapCTX.strokeStyle = '#ffffff';
			ProvinceMap.MapCTX.font = 'bold 62px Verdana';
			ProvinceMap.MapCTX.textAlign = 'center';
			ProvinceMap.MapCTX.shadowColor = '#000000';
			ProvinceMap.MapCTX.shadowBlur = 25;
			ProvinceMap.MapCTX.strokeText(e.short, e.flag.x, e.flag.y);
			ProvinceMap.MapCTX.fillText(e.short, e.flag.x, e.flag.y);

			ProvinceMap.MapCTX.stroke();
		});
	},
	*/


	ParsePathToCanvas: (i) => {
		let e, s;
		let path = new Path2D();

		for (let o = 0; o < i.length; o++)
		{
			switch (i.charAt(o))
			{

				case "M":
					(e = ProvinceMap.ParseMove(++o, i)), path.moveTo(e.x, e.y), (o = e.index - 1);
					break;

				case "c":
					(s = ProvinceMap.ParseCurve(++o, i)), path.bezierCurveTo(e.x + s.cp1x, e.y + s.cp1y, e.x + s.cp2x, e.y + s.cp2y, e.x + s.x, e.y + s.y), (o = s.index - 1), (e.x += s.x), (e.y += s.y);
					break;

				case "m":
					let c = ProvinceMap.ParseMove(++o, i);
					path.moveTo((e.x = e.x + c.x), (e.y = e.y + c.y)), (o = c.index - 1);
					break;

				case "C":
					(s = ProvinceMap.ParseCurve(++o, i)), path.bezierCurveTo(s.cp1x, s.cp1y, s.cp2x, s.cp2y, s.x, s.y), (e.x += s.x), (e.y += s.y), (o = s.index - 1);
					break;

				case "z":
				// ProvinceMap.MapCTX.closePath();
			}
		}

		return path;
	},


	ParseMove: (i, n) => {
		let e = { x: 0, y: 0, index: i },
			s = ProvinceMap.ParseNumber(i, n);

		return (e.x = s.num), (s = ProvinceMap.ParseNumber(s.index, n)), (e.y = s.num), (e.index = s.index), e;
	},


	ParseNumber: (t, i) => {

		let n = { num: 0, index: t };

		for (let e = "", s = !1, o = !1, c = t; c < i.length; c++)
		{
			let r = i.charAt(c);

			if (0 !== e.length || s || "-" !== r)
				if (o || "." !== r)
				{
					if (!r.match("[0-9]"))
					{
						if (0 === e.length && " " === r) continue;
						"," === r && c++, (n.num = parseFloat(e)), (n.index = c);
						break;
					}
					e += r;
				} else (o = !0), (e += ".");

			else (s = !0), (e += "-");
		}
		return n;
	},


	ParseCurve: (i, n) => {
		let e = { cp1x: 0, cp1y: 0, cp2x: 0, cp2y: 0, x: 0, y: 0, index: i },
			s = ProvinceMap.ParseNumber(i, n);

		return (
			(e.cp1x = s.num),
				(s = ProvinceMap.ParseNumber(s.index, n)),
				(e.cp1y = s.num),
				(s = ProvinceMap.ParseNumber(s.index, n)),
				(e.cp2x = s.num),
				(s = ProvinceMap.ParseNumber(s.index, n)),
				(e.cp2y = s.num),
				(s = ProvinceMap.ParseNumber(s.index, n)),
				(e.x = s.num),
				(s = ProvinceMap.ParseNumber(s.index, n)),
				(e.y = s.num),
				(e.index = s.index),
				e
		);
	},


	hexToRgb: (hex, alpha) => {
		hex = hex.trim();
		hex = hex[0] === '#' ? hex.substr(1) : hex;

		let bigint = parseInt(hex, 16), h = [];

		if (hex.length === 3)
		{
			h.push((bigint >> 4) & 255);
			h.push((bigint >> 2) & 255);

		} else
		{
			h.push((bigint >> 16) & 255);
			h.push((bigint >> 8) & 255);
		}

		h.push(bigint & 255);

		if (alpha)
		{
			h.push(alpha);
			return 'rgba(' + h.join(',') + ')';

		} else
		{
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
				},
				path: "M1437.48,836.86c-4.643,13.99-8.362,28.175-9.853,43.96 c-5.688,2.906-10.456-1.101-14.859-4.855c-2.983-2.543-5.201-6.01-7.644-9.154c-9.629-12.397-20.264-16.427-35.131-11.539 c-8.76,2.881-16.754,8.015-25.324,11.576c-6.686,2.777-13.886,4.313-20.571,7.092c-6.979,2.901-14.195,5.823-20.248,10.201 c-7.394,5.348-14.643,10.218-23.794,11.921c-5.445,1.014-9.689,4.144-12.626,9.022c-2.059,3.42-4.073,6.995-6.786,9.86 c-2.896,3.061-6.235,6.833-9.997,7.74c-13.36,3.218-26.844,3.576-39.654-2.873c-3.722-1.874-3.61-5.033-3.105-8.563 c1.505-10.524,1.497-10.681-8.542-15.191c-3.743-1.682-5.35-4.028-6.276-8.06c-2.729-11.886-6.9-23.327-7.832-35.775 c-0.391-5.22-5.064-10.806-9.128-14.898c-5.659-5.698-9.245-11.976-10.899-19.701c-2.205-10.299-8.281-17.95-16.927-23.742 c-2.207-1.478-4.129-3.388-6.371-4.801c-11.269-7.104-12.26-18.245-11.512-29.848c0.178-2.756,1.413-6.631,3.451-7.87 c8.367-5.089,9.434-12.917,9.576-21.408c0.016-0.972,0.316-1.938,0.609-3.628c7.55-2.424,17.561-2.7,17.893-14.414 c6.263-6.776,6.818-14.47,2.145-23.349c11.816-2.234,19.293-9.077,26.87-16.19c7.726-7.254,15.662-6.235,22.547,1.666 c1.087,1.248,1.868,2.756,2.878,4.076c9.02,11.784,15.86,13.582,27.446,4.538c10.259-8.008,19.684-10.58,31.119-3.161 c4.661,3.023,10.389,4.413,15.017,7.475c2.847,1.885,4.639,5.451,6.715,8.395c3.019,4.28,5.864,8.68,9.302,13.799 c2.48-2.775,4.114-4.604,5.17-5.784c5.628,1.802,10.814,3.529,16.041,5.119c7.416,2.257,13.533,10.897,13.147,18.819 c-0.273,5.627-0.635,11.25-0.923,16.294c4.834,6.489,10.496,3.765,17.224,2.213c0.633,4.224,1.533,7.899,1.676,11.604 c0.484,12.676,4.181,16.34,17.03,16.705c4.303,0.122,8.596,1.01,12.889,0.979c4.192-0.03,8.378-0.788,12.928-1.265 c0.686,2.796,1.373,4.651,1.566,6.555c0.78,7.678,4.142,13.799,10.047,18.828c2.462,2.097,4.859,4.907,5.933,7.881 C1422.792,818.459,1430.718,827.269,1437.48,836.86z"
			}, {
				id: 1,
				name: "B1: Ofrus Remyr",
				connections: [0, 2, 6, 7],
				short: 'B1O',
				flag: {
					x: 1327,
					y: 996
				},
				path: "M1452.797,983.743c-8.49,9.674-16.626,11.096-26.703,5.635 c-2.992-1.622-6.534-2.231-10.538-3.538c-0.903,4.771-1.213,8.403-2.339,11.762c-1.016,3.029-2.6,6.002-4.511,8.567 c-3.31,4.445-7.243,8.422-10.601,12.835c-8.187,10.758-14.668,23.127-29.261,27.268c-2.5,0.709-5.277,4.48-5.806,7.244 c-1.042,5.444-1.235,11.245-0.625,16.771c1.023,9.242-1.697,13.004-10.561,13.437c-7.426,0.362-14.585,3.396-22.348,1.026 c-3.334-1.018-5.18,2.478-5.248,5.808c-0.138,6.613-0.041,13.23-0.041,20.031c-8.787,4.537-16.234,5.485-24.659-0.222 c-9.789-6.632-20.5-11.905-29.414-16.974c-5.906,1.947-10.424,5.097-14.105,4.313c-8.32-1.77-16.954-4.334-24.04-8.819 c-4.497-2.847-6.491-9.697-9.494-14.82c-0.656-1.117-0.675-2.594-1.251-3.778c-5.435-11.177-10.748-12.704-21.27-6.073 c-5.062,3.188-9.871,6.815-15.09,9.709c-6.07,3.365-10.844,0.931-9.761-5.451c1.66-9.783-1.002-20.1,3.801-29.463 c0.707-1.378,1.173-3.441,0.672-4.787c-4.11-11.048-5.171-23.215-14.274-32.384c-8.497-8.558-7.815-14.134,0.146-23.376 c3.878-4.503,7.361-9.346,11.233-13.853c1.478-1.72,3.333-3.452,5.38-4.284c7.73-3.143,13.173-7.804,12.386-17.19 c8.124-3.124,15.464-6.218,24.292-5.235c20.795,2.314,35.755-8.373,47.157-24.185c5.697-7.901,11.297-13.967,21.407-16.186 c6.178-1.355,12.369-5.259,17.192-9.55c6.771-6.024,14.367-9.95,22.895-11.361c10.495-1.737,19.284-6.847,28.445-11.515 c5.576-2.84,11.4-5.312,17.327-7.314c12.639-4.271,21.668,1.761,29.567,10.906c3.871,4.48,7.614,9.397,12.41,12.651 c3.868,2.625,9.229,3.049,14.296,4.56c0.295,1.895,0.815,3.808,0.851,5.73c0.136,7.34,3.093,12.72,10.036,15.758 c6.314,2.762,10.423,7.644,14.17,13.458c3.684,5.717,9.27,10.169,13.571,15.537c5.637,7.034,7.059,14.328,1.887,22.82 c-2.696,4.428-5.769,6.903-10.447,8.264C1450.895,969.988,1448.684,975.246,1452.797,983.743z"
			}, {
				id: 2,
				name: "C1: Niali Diath",
				connections: [1, 3, 8, 9],
				short: 'C1N',
				flag: {
					x: 1064,
					y: 1011
				},
				path: "M984.777,1002.971c-2.96,2.394-5.868,5.017-9.047,7.255 c-5.319,3.743-7.003,3.22-11.969-1.343c-3.866-3.553-8.141-6.702-12.456-9.714c-9.108-6.356-16.111-14.674-22.34-23.68 c-2.311-3.341-0.517-9.874,4.87-13.82c5.923-4.34,8.156-9.968,9.601-16.637c0.937-4.325-0.105-7.682-2.406-11.236 c-3.759-5.807-7.095-11.887-10.648-17.828c-0.833-1.392-1.685-2.815-2.767-4.009c-7.992-8.817-7.943-15.245,1.118-25.954 c3.285,2.348,6.707,4.716,10.039,7.203c2.354,1.756,4.368,4.085,6.916,5.439c6.963,3.7,9.55,3.141,14.58-2.804 c2.571-3.039,4.954-6.265,7.151-9.585c2.316-3.499,5.133-3.994,8.51-1.941c3.128,1.902,6.079,4.094,9.211,5.989 c2.54,1.537,5.295,4.107,7.846,3.982c8.062-0.395,13.853,3.993,19.82,8.043c7.629,5.178,15.975,3.341,24.167,3.167 c7.66-11.012,24.726-16.144,38.922-10.379c10.425,4.233,20.207,10.104,30.084,15.591c2.183,1.212,3.79,3.722,5.267,5.901 c7.907,11.666,18.806,17.726,32.912,17.203c4.669-0.173,7.246,1.667,9.829,5.228c7.881,10.864,17.113,13.351,29.571,8.542 c1.734-0.669,3.545-1.141,5.725-1.833c1.536,5.394-1.659,7.614-4.859,8.96c-12.834,5.396-17.705,18.423-26.593,27.562 c-4.487,4.614-3.54,13.292,1.888,18.24c9.515,8.673,12.271,20.159,15.558,31.605c0.358,1.245,0.551,2.647,0.38,3.918 c-1.763,13.103-3.616,26.191-5.555,40.077c-1.919-0.264-4.885,0.108-6.929-1.092c-7.402-4.344-14.515-9.186-21.692-13.907 c-1.933-1.272-3.583-2.997-5.573-4.152c-7.731-4.488-9.577-4.567-15.39,2.237c-5.455,6.385-13.651,10.875-14.871,20.511 c-0.212,1.673-2.37,3.079-3.576,4.65c-3.372,4.392-5.366,8.779-2.958,14.663c1.696,4.144,1.896,8.898,2.979,14.492 c-7.063,0-13.155,0.881-18.865-0.217c-7.648-1.469-12.461-6.695-14.911-14.479c-2.109-6.703-5.754-7.369-9.472-2.105 c-9.987,14.134-10.599,11.517-19.437-1.443c-3.96-5.807-7.112-11.782-7.747-19.16c-0.315-3.657-3.134-7.161-5.08-10.586 c-0.795-1.399-2.686-2.208-3.383-3.626c-4.7-9.558-10.933-17.295-20.868-22.223c-3.987-1.979-5.52-7.022-5.381-12.194 C997.172,1019.156,992.668,1010.562,984.777,1002.971z"
			}, {
				id: 3,
				name: "D1: Brurat Andgiry",
				connections: [0, 2, 10, 11],
				short: 'D1B',
				flag: {
					x: 1064,
					y: 838
				},
				path: "M1084.449,696.039c12.448,1.19,25.717,8.485,33.962-6.985 c2.216,0,4.75,0.682,6.653-0.126c6.248-2.651,12.029-1.846,18.247,0.312c3.246,1.125,7.191,0.262,10.821,0.254 c6.809-0.014,11.344,6.689,8.659,13.006c-2.057,4.841-3.911,9.855-6.692,14.263c-1.36,2.155-4.45,3.669-7.066,4.499 c-8.642,2.743-8.604,2.576-8.885,10.978c-0.208,6.22-3.098,11.147-7.552,15.449c-1.999,1.931-4.418,4.602-4.561,7.059 c-0.422,7.271-0.057,14.621,0.5,21.901c0.337,4.415,2.518,8.045,6.364,10.795c4.583,3.277,8.705,7.191,13.167,10.646 c6.79,5.256,11.686,11.741,13.766,20.169c2.012,8.149,4.348,16.145,11.604,21.414c8.129,5.903,10.13,14.468,10.147,23.713 c0.01,5.778,1.183,10.912,3.67,16.256c2.595,5.576,3.724,11.965,4.631,18.125c0.31,2.102-1.48,5.143-3.228,6.77 c-2.617,2.437-6.101,3.917-9.113,5.958c-4.918,3.332-10.256,6.254-14.532,10.287c-13.789,13.001-33.607,13.494-45.75-1.163 c-10.51-12.686-24.401-19.244-38.416-25.929c-11.655-5.56-24.098-4.488-36.029-0.731c-3.969,1.25-7.09,5.191-11.966,8.958 c-8.47,1.862-17.759-0.295-25.765-7.58c-1.17-1.064-2.977-2.087-4.458-2.043c-9.063,0.265-15.576-5.033-22.399-9.751 c-1.089-0.753-2.293-1.357-3.49-1.935c-6.33-3.055-7.329-2.735-11.504,2.896c-3.695,4.982-7.535,9.856-10.725,14.015 c-12.183-0.479-15.432-12.119-24.832-14.174c1.399-8.41,2.856-16.128,3.888-23.904c0.381-2.866,0.245-5.996-0.498-8.78 c-2.029-7.609-4.873-15.017-6.584-22.685c-0.516-2.313,0.913-5.906,2.678-7.72c4.618-4.747,9.778-9.003,14.977-13.136 c5.102-4.057,7.959-8.362,5.953-15.415c-0.734-2.581,1.233-6.052,2.309-8.992c0.977-2.668,3.425-5.143,3.487-7.744 c0.384-15.983,5.525-29.744,16.895-41.254c4.171-4.223,7.351-9.417,11.078-14.092c1.444-1.812,2.937-3.707,4.781-5.056 c6.929-5.068,14.065-9.852,21.011-14.898c3.066-2.228,5.949-2.787,9.079-0.357c4.952,3.846,10.18,7.39,14.798,11.602 c7.609,6.94,8.654,7.217,17.017,0.929c6.36,2.838,13.041,4.964,17.993-2.945c0.296-0.472,1.222-0.936,1.734-0.828 C1079.356,709.971,1081.477,703.113,1084.449,696.039z"
			}, {
				id: 4,
				name: "A2: Sladisk Icro",
				connections: [0, 5, 11, 12, 13],
				short: 'A2S',
				flag: {
					x: 1269,
					y: 629
				},
				path: "M1228.076,686.058c-3.329-4.238-6.027-7.522-8.563-10.927 c-9.769-13.113-22.015-14.245-33.925-3.208c-5.294,4.906-10.235,10.496-18.031,11.413c-1.593-9.83-2.79-19.503-4.897-28.974 c-0.734-3.304-3.133-6.825-5.795-8.986c-4.849-3.937-10.064-8.065-15.836-10.091c-13.105-4.597-19.189-16.7-30.946-25.025 c4.647-2.526,7.581-4.725,10.881-5.799c9.824-3.199,16.986-9.785,23.791-17.128c1.934-2.087,4.804-3.441,7.443-4.719 c10.852-5.256,12.971-9.83,9.684-21.504c-1.259-4.472-2.918-8.883-3.64-13.441c-1.043-6.588,1.167-9.066,7.953-9.716 c2.27-0.217,4.809-0.4,6.863,0.368c10.26,3.835,20.848,3.627,31.502,3.174c5.777-0.246,11.159,0.307,15.248,5.405 c1.787,2.227,4.662,3.582,7.854,5.929c-2.124,3.693-4.162,7.239-6.745,11.731c4.328,2.428,8.336,5.503,12.866,6.991 c4.769,1.566,9.861,1.447,13.024-4.075c1.299-2.269,3.27-4.201,5.132-6.092c7.266-7.381,14.756-13.068,26.316-8.399 c5.375,2.17,11.685,2.254,17.614,2.708c2.428,0.186,5.096-0.855,7.44-1.845c10.538-4.449,14.102-3.883,21.735,4.564 c6.674,7.386,15.302,11.075,24.693,12.819c4.024,0.747,6.691,1.938,8.503,5.647c2.61,5.344,5.606,10.499,9.052,16.867 c4.566-1.798,9.16-3.296,13.473-5.375c6.561-3.162,12.939-6.703,19.372-10.128c3.561-1.896,6.673-1.906,10.012,0.895 c2.475,2.076,5.719,3.21,8.493,4.962c1.86,1.175,4.249,2.34,5.107,4.13c3.391,7.072,8.969,10.425,18.739,10.441 c-6.652,7.007-11.243,13.65-17.474,17.881c-5.813,3.947-8.008,7.878-10.566,14.363c-0.059,0.148-0.999,1.374-2.454,2.454 c-6.756,3.172-13.115,6.641-19.864,9.828c-0.598,0.282-1.343,0.564-1.665,1.071c-6.583,10.34-17.792,17.86-19.047,31.486 c-0.239,2.589-0.798,5.609-2.335,7.525c-3.46,4.314-3.782,9.067-3.424,14.098c0.373,5.249-1.296,8.815-6.668,10.776 c-3.335,1.217-6.126,3.868-9.26,5.705c-5.789,3.394-7.441,3.281-11.888-1.878c-3.212-3.726-6.647-6.172-11.783-6.505 c-2.483-0.161-5.253-1.433-7.216-3.034c-4.32-3.524-8.808-4.214-13.619-2.025c-1.105-0.857-2.317-1.307-2.602-2.092 c-4.99-13.77-16.962-18.432-29.292-22.673c-1.251-0.43-2.733-0.774-3.595-1.658c-6.689-6.867-12.713-3.955-19.43,0.375 C1243.681,678.636,1236.33,681.785,1228.076,686.058z"
			}, {
				id: 5,
				name: "A2: Tevomospa",
				connections: [0, 4, 6, 14, 15],
				short: 'A2T',
				flag: {
					x: 1482,
					y: 752
				},
				path: "M1431.901,880.678c0-4.345-0.625-7.643,0.113-10.6 c2.55-10.213,5.748-20.266,8.282-30.482c0.557-2.239,0.031-5.261-1.109-7.297c-2.231-3.979-4.801-7.973-8.026-11.153 c-9.509-9.375-12.08-23.443-22.456-32.336c-2.272-1.947-2.099-6.809-2.936-10.355c-1.534-6.497-3.881-8.027-10.44-7.889 c-8.243,0.173-16.516,0.137-24.741-0.366c-5.487-0.335-8.016-3.532-8.553-9.118c-0.381-3.955-0.283-8.04-1.289-11.831 c-1.568-5.906-3.244-6.643-9.324-5.751c-8.866,1.298-8.608,0.418-8.68-8.681c-0.106-13.56,8.995-19.03,18.65-24.237 c7.471-4.029,8.249-4.584,7.549-12.942c-0.11-1.313-1.077-3.066-0.537-3.843c7.208-10.374,5.23-24.297,14.746-34.302 c6.538-6.874,11.121-15.29,20.721-18.895c7.077-2.658,13.17-8.466,17.24-14.78c0.879-1.363,2.143-2.497,3.317-3.646 c4.734-4.631,9.374-9.373,14.313-13.776c2.616-2.333,5.777-4.054,9.541-6.633c2.289,3.533,4.017,6.231,5.777,8.908 c2.373,3.605,4.715,7.232,7.19,10.766c0.748,1.068,1.828,2.564,2.87,2.665c9.294,0.893,16.731,6.897,25.411,9.129 c10.873,2.795,20.098,7.324,27.505,16.183c4.577,5.474,10.565,9.977,16.53,14.019c5.439,3.687,11.673,6.217,17.604,9.161 c7.152,3.55,11.598,8.735,11.232,17.226c-0.083,1.933,0.221,4.06,0.983,5.822c3.129,7.234,10.535,8.865,16.052,3.409 c1.813-1.794,2.727-4.496,4.407-7.394c7.809,8.266,14.041,13.573,15.341,23.067c0.606,4.428,4.824,8.367,7.426,12.515 c1.758,2.801,3.76,5.471,5.293,8.389c4.768,9.072,4.995,18.121,0.744,27.697c-4.984,11.229-8.928,22.915-13.658,34.263 c-2.277,5.463-3.006,10.775-1.393,16.485c1.459,5.161-0.389,8.188-5.24,11.198c-14.738,9.144-30.73,15.044-47.711,16.006 c-10.832,0.613-21.603,3.291-32.189,2.712c-12.569-0.688-23.448,1.942-34.428,7.488c-6.692,3.381-12.488,6.9-16.91,13.265 C1454.555,874.193,1444.683,878.496,1431.901,880.678z"
			}, {
				id: 6,
				name: "B2: Subeblic",
				connections: [1, 5, 7, 16, 17],
				short: 'B2S',
				flag: {
					x: 1541,
					y: 984
				},
				path: "M1590.359,1066.094c-2.092-0.421-3.436-0.445-5.037,0.254 c-6.067,2.652-11.887,5.895-17.711,9.076c-4.354,2.38-8.738,4.769-12.799,7.598c-3.195,2.227-6.418,4.755-8.727,7.825 c-3.244,4.315-6.557,6.429-11.824,3.874c-4.245-2.06-7.734-0.261-10.926,2.496c-2.013,1.737-3.926,3.592-5.964,5.298 c-8.526,7.138-9.263,7.053-19.122,1.333c-12.369-7.178-22.703-16.136-28.451-29.689c-2.044-4.817-5.779-7.547-11.302-8.688 c-4.72-0.975-9.195-3.519-13.539-5.819c-4.175-2.209-8.302-5.277-13.008-2.503c-15.412,9.084-29.467,1.352-43.709-3.284 c-3.225-1.05-5.962-3.601-9.604-5.888c6.631-7.016,12.432-13.082,18.136-19.237c1.557-1.679,2.835-3.618,4.219-5.454 c3.562-4.729,7.217-9.394,10.622-14.232c1.694-2.406,3.188-5.031,4.296-7.751c1.349-3.314,2.198-6.833,3.606-11.365 c14.676,10.774,27.209,7.84,38.502-5.424c-0.587-1.826-1.222-3.625-1.742-5.458c-1.608-5.66-0.957-6.895,4.572-8.88 c14.3-5.135,19.135-15.813,13.311-29.621c-0.89-2.109-2.041-4.175-3.417-6c-5.557-7.371-10.827-15.026-17.054-21.793 c-3.485-3.789-8.405-6.507-13.1-8.87c-5.781-2.909-6.72-7.406-6.682-13.175c0.042-6.206,4.194-7.648,8.748-9.161 c8.768-2.911,16.157-7.92,21.658-15.338c4.136-5.577,9.479-9.183,15.826-11.666c4.024-1.575,7.795-3.912,11.912-5.11 c4.312-1.255,8.881-1.734,13.372-2.236c7.211-0.807,14.455-1.317,21.677-2.037c1.627-0.162,3.408-1.328,4.795-0.922 c8.477,2.479,16.355-0.798,24.538-1.762c11.915-1.403,22.413-5.864,32.673-11.52c2.805-1.545,5.841-2.672,9.692-4.407 c2.266,7.18,4.133,13.423,6.212,19.594c2.579,7.659,2.655,7.633,11.442,6.222c3.839,7.619,10.684,8.951,18.946,7.181 c4.195,7.713,9.642,13.522,18.131,16.231c2.317,0.74,3.532,4.577,5.537,6.727c3.786,4.065,7.553,8.2,11.748,11.821 c4.715,4.071,9.894,7.606,15.658,11.971c-8.938,6.038-1.609,13.104-2.869,20.236c-1.466,1.005-3.304,2.314-5.19,3.548 c-4.86,3.178-8.698,7.008-10.238,12.952c-2.125,8.2-6.599,13.514-15.725,15.731c-11.459,2.785-14.465,10.416-10.146,21.4 c0.949,2.415,2.517,4.586,3.955,7.146c-6.626,7.74-15.795,3.656-24.012,5.848c0.262,1.48,0.136,3.216,0.855,4.464 c6.468,11.211,13.299,22.217,19.568,33.535c3.181,5.745,7.136,7.896,13.771,7.042c5.496-0.706,11.237-0.172,16.796,0.466 c4.962,0.568,7.845,3.688,6.986,9.012c-0.773,4.801-0.095,9.074,2.338,13.404c1.165,2.075,1.646,5.419,0.822,7.572 c-3.328,8.709-7.122,17.221-15.102,23.027c-5.856,4.263-11.336,9.04-17.168,13.341c-2.354,1.737-5.193,2.816-8.986,4.813 c-4.982-7.275-9.735-14.383-14.673-21.358c-2.484-3.511-5.209-6.867-8.025-10.118c-1.037-1.196-2.984-2.95-3.956-2.648 c-8.188,2.546-12.738-3.665-18.504-7.08c-1.628-0.966-2.723-1.629-4.643-2.104L1590.359,1066.094z"
			}, {
				id: 7,
				name: "B2: Taspac",
				connections: [1, 6, 8, 18, 19],
				short: 'B2T',
				flag: {
					x: 1375,
					y: 1197
				},
				path: "M1244.429,1286.4c-11.005-11.067-22.624-22.436-33.811-34.212 c-3.076-3.238-5.153-7.557-7.18-11.633c-3.55-7.135-6.531-14.552-10.068-21.693c-5.726-11.563-6.871-22.037,2.141-33.273 c4.587-5.72,8.673-12.803,8.739-21.511c0.072-9.696-2.4-17.084-10.184-23.263c-6.705-5.322-12.908-11.469-18.474-17.984 c-5.654-6.619-5.346-14.823-2.924-22.779c1.894-6.224,4.29-12.293,6.719-19.157c6.544-4.07,14.159-8.688,21.652-13.498 c8.31-5.332,10.745-5.564,17.008,3.713c3.961,5.867,6.104,12.964,9.867,21.289c7.049,2.438,15.647,5.748,24.468,8.286 c3.351,0.965,8.18,1.571,10.663-0.117c7.719-5.247,13.279,0.116,19.002,3.001c6.465,3.258,12.061,8.199,18.389,11.783 c8.31,4.709,16.846,2.976,24.772-1.17c1.503-0.786,2.57-4.771,1.991-6.737c-1.93-6.55-0.305-12.385,1.686-18.13 c8.25-0.68,16.031-1.378,23.821-1.95c10.683-0.785,14.319-5.416,13.191-16.284c-0.504-4.855-0.495-9.796-0.312-14.682 c0.156-4.147,2.633-6.676,7.719-7.572c10.583,9.488,25.015,11.51,38.551,15.796c5.891,1.863,11.268-0.028,16.341-2.581 c5.982-3.01,10.976-2.854,16.586,1.424c3.815,2.908,8.89,4.44,13.628,5.784c4.502,1.276,7.699,3.368,9.711,7.682 c7.983,17.124,21.392,28.278,38.884,34.848c14.266,5.357,28.523,10.737,42.771,16.144c1.187,0.451,2.269,1.173,3.871,2.019 c-0.794,2.621-1.512,4.992-2.2,7.263c7.731,8.06,17.915,6.338,27.747,7.441c-0.586,15.305-3.94,28.641-14.987,39.898 c-12.601,12.841-27.136,22.589-43.269,29.881c-24.556,11.101-49.529,21.069-76.242,26.19c-9.386,1.8-18.509,5.394-27.467,8.895 c-11.885,4.645-22.555,11.37-31.24,20.948c-5.928,6.539-13.172,11.104-21.46,14.127c-6.866,2.505-13.685,5.15-20.47,7.871 c-8.706,3.49-17.409,3.65-26.282,0.629c-10.803-3.677-21.688-6.137-33.204-2.946c-2.748,0.762-5.961,0.097-8.928-0.218 C1265.221,1288.817,1254.811,1287.582,1244.429,1286.4z"
			}, {
				id: 8,
				name: "C2: Shadsterning",
				connections: [2, 7, 9, 20, 21],
				short: 'C2S',
				flag: {
					x: 1052,
					y: 1217
				},
				path: "M1062.952,1098.188c2.143,3.704,3.226,6.106,4.774,8.154 c5.038,6.662,11.069,11.364,20.21,10.189c5.717-0.734,11.804,2.896,18.346-2.045c-1.09-4.99-2.367-10.364-3.396-15.786 c-0.42-2.208-1.233-5.067-0.276-6.695c6.646-11.308,11.362-24.038,22.27-32.33c1.506-1.146,4.297-1.249,6.318-0.879 c1.823,0.333,4.057,1.581,4.986,3.108c5.274,8.67,15.99,9.003,22.854,15.241c1.809,1.644,4.845,2.109,7.412,2.712 c7.883,1.848,10.422,5.722,5.904,12.179c-5.215,7.452-4.07,15.277-3.641,23.066c0.205,3.723,1.975,8.015,4.436,10.822 c5.442,6.21,11.386,12.122,17.825,17.284c9.902,7.938,13.071,18.196,7.489,29.529c-2.456,4.987-5.75,9.587-8.894,14.206 c-6.522,9.581-5.418,19.503-1.257,29.396c4.362,10.372,8.424,20.983,14.017,30.684c3.703,6.423,9.772,11.516,14.96,17.036 c5.894,6.27,12.061,12.281,17.93,18.573c1.251,1.341,1.733,3.397,3.03,6.076c-7.411,2.424-14.163,2.549-20.706-0.1 c-7.691-3.113-15.038-7.073-22.719-10.216c-6.402-2.617-13.164-4.353-19.58-6.942c-2.912-1.176-5.618-3.195-7.988-5.313 c-6.74-6.02-13.806-11.331-22.874-13.315c-2.035,6.42-3.347,12.864-6.072,18.641c-4.595,9.738-13.604,12.629-23.779,8.813 c-4.346-1.63-8.837-2.89-13.305-4.17c-3.94-1.131-7.044,0.495-9.962,3.106c-2.965,2.654-6.432,4.77-9.264,7.543 c-2.571,2.519-4.583,5.605-6.783,8.367c-7.317,0.351-13.139-2.658-18.746-6.341c-2.215-1.455-4.337-3.218-6.766-4.147 c-4.023-1.542-8.464-3.889-12.344-3.312c-3.139,0.467-5.712,4.736-8.535,7.322c-0.246,0.226-0.434,0.548-0.716,0.693 c-9.045,4.641-16.329,11.052-19.995,22.602c-9.556-11.825-21.842-11.812-33.52-13.559c-2.956-0.441-5.94-0.776-8.844-1.448 c-6.723-1.555-11.511-5.365-12.614-12.48c-1.499-9.67-7.48-15.191-16.118-18.6c-3.396-1.34-6.711-2.901-10.006-4.482 c-3.597-1.725-7.554-3.053-10.61-5.488c-11.884-9.472-23.478-19.308-35.161-29.031c-0.498-0.414-0.864-1.016-1.208-1.581 c-8.064-13.215-16.117-26.437-24.29-39.853c4.099-5.664,9.817-8.364,15.392-11.122c5.383-2.665,11.149-4.72,12.894-11.42 c9.843-6.057,11.306-16.19,13.397-26.317c1.123-5.437,3.995-10.521,6.16-15.73c2.305-5.542,4.171-6.396,10.007-5.257 c4.856,0.949,9.733,1.933,14.648,2.41c7.196,0.699,12.027-2.705,14.821-9.351c1.143-2.717,2.134-6.433,4.318-7.61 c8.335-4.493,11.378-12.165,14.473-20.257c1.638-4.283,4.567-8.092,7.063-12.021c1.823-2.87,3.736-5.265,8.063-4.135 c1.801,0.47,4.388-0.9,6.248-2.037c5.647-3.452,10.83-7.795,16.753-10.616c3.832-1.824,8.645-1.59,10.995-1.959 c5.331,7.415,9.7,13.105,13.603,19.101c1.748,2.685,3.348,5.9,3.654,9.01c1.116,11.341,7.794,19.693,14.57,27.854 c4.783,5.761,7.921,5.314,13.026-0.24C1057.809,1103.571,1059.845,1101.472,1062.952,1098.188z"
			}, {
				id: 9,
				name: "C2: Tayencoria",
				connections: [2, 8, 10, 22, 23],
				short: 'C2T',
				flag: {
					x: 878,
					y: 1063
				},
				path: "M853.82,1179.501c-1.966-3.399-3.049-5.821-4.618-7.874 c-4.017-5.256-7.917-10.669-12.492-15.413c-4.528-4.696-9.826-8.65-15.972-13.953c-3.5,2.468-7.667,5.406-12.205,8.606 c-1.978-1.771-4.154-3.747-6.361-5.689c-8.246-7.255-8.652-8.801-3.011-18.512c2.604-4.482,5.369-8.816,2.059-13.811 c-4.043-6.102-5.688-14.372-15.396-15.467c-3.395-0.383-7.266-3.289-9.473-6.156c-6.093-7.917-12.151-15.632-20.243-21.776 c-5.891-4.474-8.356-16.748-5.271-23.058c1.094-2.238,3.319-5.026,5.448-5.448c6.29-1.248,11.776-5.903,19.083-3.646 c2.884,0.892,7.15-0.885,10.147-2.578c4.856-2.745,9.186-6.426,14.177-10.026c1.02-7.595-0.926-14.592-7.02-20.303 c-2.674-2.504-5.278-5.095-7.776-7.775c-6.054-6.494-12.811-11.266-24.549-8.608c2.914-2.9,3.948-4.771,5.445-5.279 c7.452-2.527,14.51-5.964,23.042-4.888c9.713,1.225,19.026-0.977,27.394-6.906c7.283-5.161,16.192-5.617,24.739-6.914 c2.215-0.336,4.896-0.615,6.419-1.976c5.655-5.054,11.188-10.304,16.256-15.938c6.583-7.318,5.632-12.27-3.317-20.031 c1.842-2.978,3.846-5.949,5.579-9.071c4.526-8.153,9.549-9.069,17.216-3.145c1.975,1.526,4.209,2.716,6.755,4.334 c2.612-3.636,4.688-6.525,6.708-9.339c8.577,1.176,8.656,1.134,12.149-6.239c4.801-10.133,4.801-10.133,11.471-13.075 c-0.611,3.607-1.91,6.847-1.504,9.856c0.726,5.392,0.436,11.412,6.501,14.83c1.651,0.93,2.202,3.795,3.284,5.757 c2.561,4.645,4.697,9.604,7.805,13.849c5.296,7.233,5.274,13.3-0.447,19.904c-3.888,4.487-7.708,9.152-10.692,14.245 c-1.265,2.159-1.503,6.477-0.162,8.343c7.15,9.943,14.695,19.632,25.197,26.491c3.573,2.332,7.133,4.886,10.078,7.938 c7.18,7.438,10.399,7.959,18.67,1.907c1.861-1.362,3.574-2.924,5.892-4.837c4.479,5.546,9.065,10.674,8.799,18.136 c-0.188,5.265,1.11,9.909,4.442,13.922c2.979,3.586,2.501,6.872-1.047,9.413c-5.382,3.854-11.022,7.35-16.578,10.958 c-0.537,0.349-1.39,0.773-1.855,0.581c-8.089-3.346-10.764,3.017-13.7,8.003c-3.692,6.269-6.707,12.937-10.02,19.431 c-0.744,1.459-1.132,3.578-2.327,4.249c-6.97,3.908-11.251,9.733-14.523,16.939c-2.321,5.11-9.217,6.912-15.658,5.303 c-2.902-0.726-5.676-2.003-8.595-2.618c-8.031-1.697-10.998,0.592-14.219,8.373c-3.816,9.219-8.352,18.106-8.162,28.466 c0.021,1.146-0.876,2.712-1.837,3.408c-5.177,3.753-8.161,9.658-12.497,13.686C870.761,1171.92,861.933,1175.025,853.82,1179.501z"
			}, {
				id: 10,
				name: "D2: Slandmonii",
				connections: [3, 9, 11, 24, 25],
				short: 'D2S',
				flag: {
					x: 791,
					y: 794
				},
				path: "M951.667,760.477c0.488,3.881,0.474,6.236,1.12,8.393 c1.38,4.606,0.856,8.283-3.173,11.536c-3.681,2.971-4.851,7.186-2.939,11.707c2.315,5.479-0.474,8.637-4.434,11.817 c-5.947,4.775-11.584,9.934-17.38,14.897c-2.859,2.449-3.429,4.989-2.102,8.796c2.925,8.396,5.185,17.026,7.58,25.599 c0.315,1.128,0.268,2.804-0.368,3.676c-2.882,3.956-2.101,8.087-1.434,12.451c0.753,4.928-1.151,9.203-5.096,12.239 c-4.18,3.216-9.394,5.441-12.703,9.334c-3.321,3.908-4.852,9.338-7.527,14.842c-7.708-3.599-11.449,0.693-13.697,8.449 c-5.018-4.153-9.54-7.127-15.708-7.391c-4.842-0.208-7.839,1.077-9.468,5.222c-2.683,6.825-7.771,10.428-14.585,12.327 c-3.184,0.887-6.291,2.203-9.259,3.672c-4.816,2.385-9.323,1.946-14.426,0.431c-5.254-1.56-11.247-2.883-16.436-1.863 c-7.128,1.399-12.332,0.009-16.991-5.137c-0.63-0.695-1.63-1.056-3.468-2.199c-7.36,3.861-15.108,8.089-23.018,11.987 c-2.748,1.354-5.898,1.893-10.626,3.345c4.099-11.236-1.432-16.709-7.67-22.791c-6.11-5.958-10.686-13.515-15.772-20.489 c-7.494-10.274-7.433-10.319-18.486-6.506c-6.802-4.359-13.22-8.241-19.351-12.534c-2.009-1.408-3.633-3.693-4.788-5.914 c-1.468-2.824-2.279-5.99-3.396-9.07c-8.295,1.742-15.614,3.449-23.005,4.744c-2.782,0.488-5.848,0.528-8.583-0.104 c-7.349-1.698-13.314-4.642-14.667-13.615c-0.818-5.426-4.229-10.412-5.981-15.756c-3.718-11.337-0.333-18.682,9.565-24.889 c13.704-8.593,26.918-17.961,40.491-26.769c4.11-2.667,8.561-4.961,13.121-6.749c8.596-3.37,17.533-5.951,24.771-11.743 c-3.138-9.492-6.761-12.083-14.957-11.716c-5.21,0.233-10.438,0.043-17.037,0.043c-3.022-3.467-9.083-6.333-10.11-13.032 c4.557-4.322,8.687-8.58,13.21-12.366c1.862-1.558,4.543-2.854,6.905-2.947c4.507-0.177,7.635-2.168,9.981-5.623 c6.497-9.565,13.45-18.885,19.129-28.921c5.598-9.892,12.427-19.709,10.549-32.204c-0.144-0.956,0.17-1.98,0.276-2.973 c1.459-13.67,3.054-15.558,16.826-17.081c5.151-0.57,9.798-1.274,13.406-5.41c2.526-2.896,5.513-2.71,9.056-1.364 c6.685,2.54,12.97,5.344,16.046,12.393c1.675,3.836,4.961,5.604,8.683,5.747c7.69,0.295,10.643,5.321,11.338,11.596 c0.787,7.101,2.523,12.063,10.956,12.333c1.933,0.062,4.395,2.8,5.542,4.894c5.575,10.179,10.791,20.556,16.121,30.869 c1.222,2.364,2.86,4.639,3.494,7.16c2.084,8.296,6.678,12.117,15.682,11.909c6.685-0.155,10.006,5.819,12.921,11.095 c2.896,5.241,5.304,10.664,10.89,13.915c4.869,2.834,9.249,5.63,15.551,5.006c3.352-0.332,7.296,2.359,10.51,4.411 c3.322,2.121,5.985,5.245,9.11,7.71c6.809,5.372,8.609,5.358,15.833,0.281c1.63-1.146,3.164-2.429,4.744-3.646 C947.693,763.528,948.958,762.56,951.667,760.477z"
			}, {
				id: 11,
				name: "D2: Tachmazer",
				connections: [3, 4, 10, 26, 27],
				short: 'D2T',
				flag: {
					x: 974,
					y: 658
				},
				path: "M1104.041,609.319c6.237,5.844,11.546,9.869,15.633,14.891 c5.01,6.156,11.183,10.023,18.154,13.443c6.2,3.041,11.812,7.306,17.587,11.173c1.346,0.901,3.037,2.225,3.326,3.613 c1.734,8.315,3.778,16.66,4.356,25.087c0.375,5.467-3.345,8.242-8.895,8.783c-2.639,0.258-5.613,0.823-7.937-0.063 c-10.192-3.882-20.224-1.389-30.364,0.104c-6.195,8.343-11.475,10.223-21.836,7.726c-11.602-2.796-11.677-2.756-16.961,8.926 c-9.106,0.931-9.106,0.931-17.085,8.36c-6.062-3.436-12.591-5.071-17.984,0.83c-7.168-5.485-13.467-10.248-19.704-15.092 c-5.69-4.42-10.64-3.519-16.067,0.989c-5.291,4.396-11.471,7.703-17.029,11.801c-2.918,2.152-5.706,4.689-7.922,7.542 c-8.756,11.271-16.781,23.148-26.047,33.971c-5.305,6.195-12.33,10.988-18.939,15.934c-1.272,0.952-4.441,0.175-6.322-0.695 c-2.353-1.089-4.659-2.783-6.318-4.771c-5.709-6.845-12.609-9.406-21.679-9.969c-7.018-0.436-13.353-5.384-17.117-12.297 c-1.893-3.477-3.86-6.984-6.31-10.067c-3.364-4.232-7.316-7.589-13.453-7.277c-4.256,0.217-7.414-1.829-9.466-5.984 c-4.701-9.514-9.813-18.824-14.715-28.239c-1.535-2.946-3.548-5.818-4.284-8.971c-1.998-8.557-6.419-13.733-16.54-12.83 c-0.775-3.444-1.574-6.58-2.176-9.754c-1.275-6.728-3.789-11.866-11.871-12.447c-2.589-0.186-6.211-2.043-7.295-4.182 c-3.597-7.097-9.155-11.156-16.454-13.457c-0.827-0.261-1.414-1.281-2.538-2.355c3.989-6.448,9.912-9.115,17.084-9.956 c7.724-0.906,15.511-2.518,19.856-9.689c7.871-12.989,19.833-21.137,32.211-28.97c1.957-1.238,4.254-2.411,5.491-4.228 c3.754-5.517,8.56-7.403,15.249-7.399c3.945,0.002,7.942-2.795,11.826-4.533c9.605-4.299,9.144-3.866,16.772,3.155 c5.289,4.868,11.809,8.539,18.178,12.013c2.262,1.233,5.743,0.623,8.589,0.256c1.89-0.243,3.9-1.224,5.414-2.431 c8.632-6.885,17.724-8.505,28.66-5.546c4.296,1.162,10.017-2.223,14.887-4.068c7.744-2.935,15.221-6.591,23-9.42 c6.243-2.27,12.041-1.087,17.979,2.526c7.619,4.636,15.808,8.489,24.092,11.836c8.089,3.269,15.459,7.429,21.653,13.487 c4.814,4.709,10.102,5.087,16.522,4.174c8.077-1.149,16.367-0.763,24.558-1.176c1.939-0.098,3.985-0.432,5.75-1.194 c5.099-2.201,10.033-4.779,15.117-7.016c6.329-2.784,8.013-5.56,7.143-12.448c-1.426-11.286,0.196-14.714,10.221-19.502 c4.034-1.927,8.487-2.974,12.76-4.425c2.369,9.084,4.506,17.058,6.518,25.063c1.521,6.053,0.524,9.645-5.046,12.604 c-6.719,3.571-12.585,7.72-18.151,13.088c-5.572,5.374-13.284,8.548-20.119,12.583 C1112.632,604.816,1109.125,606.572,1104.041,609.319z"
			}, {
				id: 12,
				name: "A3: Vobolize",
				connections: [4, 13, 27, 28, 29],
				short: 'A3V',
				flag: {
					x: 1218,
					y: 479
				},
				path: "M1143.777,513.552c1.961-2.899,3.947-5.879,5.98-8.827 c3.208-4.649,2.788-9.317,0.338-14.136c-2.263-4.448-5.646-6.34-10.57-5.146c-2.587,0.627-5.122,1.517-7.736,1.972 c-5.648,0.982-8.585-0.589-9.509-5.982c-1.066-6.218-4.271-12.924,2.405-18.345c1.152-0.935,1.89-2.908,2.031-4.472 c1.011-11.184,7.915-18.496,15.846-25.394c6.044-5.257,6.673-11.745,0.328-14.851c-12.339-6.039-11.311-16.458-11.774-27.265 c12.729-5.445,25.152-5,37.541,0.014c8.42,3.408,17.088,5.46,26.187,5.47c2.596,0.003,5.426,0.346,7.746-0.531 c6.514-2.463,11.755-0.544,16.168,4.086c4.806,5.044,9.855,7.4,16.942,4.706c1.994-0.757,5.115,0.583,7.412,1.634 c12.075,5.521,24.359,8.195,37.493,4.088c2.158-0.675,5.293-1.486,6.78-0.474c6.312,4.296,13.617,1.543,20.223,3.49 c2.246,0.662,5.788,0.197,7.52-1.231c8.068-6.652,16.137-1.763,24.176-0.581c1.482,0.218,2.797,1.588,4.247,2.461 c0.346,7.528-5.741,11.297-9.089,16.292c-2.742,4.093-4.878,8.085-4.639,12.778c0.305,5.947-1.964,10.248-6.363,13.866 c-1.792,1.475-3.212,3.4-4.994,4.89c-5.112,4.275-9.146,8.86-4.412,17.151c-13.3,1.046-17.213,11.508-22.947,19.805 c-3.366,4.869-3.698,10.694-0.627,16.118c4.601,8.127,1.039,15.362-2.246,22.628c-0.527,1.167-1.662,2.056-2.499,3.086 c-7.867,9.687-7.866,9.688-20.856,4.811c-8.161,7.597-16.831,15.668-26.034,24.235c-3.624-1.725-7.366-3.505-10.917-5.195 c0.168-2.027,0.028-3.078,0.362-3.946c3.413-8.866,2.653-8.089-4.365-15.234c-6.677-6.797-13.778-7.585-22.466-7.419 c-8.863,0.169-17.766-1.653-26.65-2.625c-4.591-0.502-9.177-1.05-13.786-1.58C1158.153,526.033,1158.153,526.033,1143.777,513.552z"
			}, {
				id: 13,
				name: "A3: Xemga",
				connections: [4, 12, 14, 30, 31],
				short: 'A3X',
				flag: {
					x: 1407,
					y: 523
				},
				path: "M1284.695,548.622c1.583-2.092,2.967-3.851,4.28-5.662 c6.528-9.008,10.227-18.343,4.888-29.502c-1.285-2.69-1.873-6.954-0.626-9.388c4.156-8.112,7.813-17.024,17.56-20.454 c4.563-1.605,7.645-3.847,5.799-9.566c-0.48-1.491,0.301-4.033,1.414-5.277c3.525-3.938,7.457-7.517,11.278-11.186 c3.295-3.164,7.031-3.952,11.76-3.911c5.456,0.047,11.105-1.501,16.341-3.309c4.908-1.694,9.387-4.631,14.616-7.31 c-0.286-2.358-0.624-5.138-0.979-8.059c5.354,1.018,10.195,3.086,14.656,2.456c4.209-0.595,8.018-4.028,11.212-5.779 c6.14,7.031,11.343,13.581,17.231,19.442c2.408,2.397,6.182,4.277,9.541,4.681c6.493,0.782,13.134,0.444,19.711,0.396 c8.527-0.063,15.677,3.642,21.383,9.271c5.702,5.624,11.735,6.935,19.076,5.136c3.545-0.868,7.25-1.157,10.726-2.224 c5.453-1.674,10.619-2.677,16.519-1.275c7.049,1.676,13.689-1.304,20.119-4.278c8.976-4.152,18.236-5.666,27.779-2.308 c0.229,0.864,0.74,1.708,0.506,2.076c-9.346,14.634-16.662,31.271-35.505,36.704c-6.635,1.913-9.88,7.499-13.826,12.402 c-2.254,2.8-4.408,6.171-7.411,7.791c-10.625,5.727-16.705,14.942-21.042,25.604c-2.992,7.36-5.224,14.96-12.662,19.569 c-3.961,2.455-4.403,6.921-4.935,11.415c-1.394,11.795-12.526,20.962-23.229,19.581c-5.46-0.704-10.236-2.577-12.952-7.979 c-1.976-3.93-4.376-7.352-9.6-7.613c-1.724-0.086-3.756-1.552-4.971-2.968c-4.943-5.763-10.195-4.868-16.002-1.532 c-6.327,3.635-12.875,6.881-19.253,10.432c-6.555,3.648-8.875,3.161-12.958-3.328c-1.232-1.959-2.323-4.053-3.157-6.21 c-2.271-5.874-5.853-9.543-12.741-8.813c-1.538,0.163-3.603-0.178-4.708-1.125c-6.671-5.718-16.215-7.341-21.314-15.336 c-3.44-5.398-8.288-5.756-13.811-2.996C1301.771,552.008,1293.902,553.316,1284.695,548.622z"
			}, {
				id: 14,
				name: "A3: Yelili",
				connections: [5, 13, 15, 32, 33],
				short: 'A3Y',
				flag: {
					x: 1592,
					y: 574
				},
				path: "M1451.448,599.564c2.583-2.162,4.522-3.899,6.579-5.486 c5.215-4.024,8.95-8.889,9.264-15.769c0.28-6.12,3.321-10.324,8.129-14.106c3.172-2.494,5.409-6.453,7.391-10.121 c3.46-6.406,6.214-13.19,9.615-19.631c2.688-5.089,6.96-8.503,11.975-11.589c4.339-2.67,7.9-7.013,10.969-11.226 c3.258-4.477,6.902-7.884,12.107-9.905c10.771-4.18,19.896-10.031,25.224-21.233c2.916-6.132,8.247-11.114,12.31-16.382 c9.766,2.31,13.383,5.653,14.311,14.542c0.6,5.746,0.28,12.189,5.706,15.178c6.57,3.62,13.887,6.229,21.183,8.083 c6.27,1.593,12.673-0.377,18.14-3.832c10.483-6.622,20.744-5.424,31.303-0.288c3.853,1.874,8.042,3.138,12.178,4.331 c8.314,2.398,16.574,1.914,24.296-2.034c5.255-2.687,9.493-3.33,14.416,1.181c3.026,2.773,7.66,3.822,11.612,5.553 c15.008,6.573,17.937,16.721,8.523,30.224c-2.468,3.54-5.265,6.877-8.147,10.095c-8.548,9.541-8.494,20.45-5.126,31.816 c1.198,4.047,3.03,7.906,4.956,12.828c-5.283,1.148-9.698,2.292-14.179,3.051c-29.714,5.034-57.413,16.679-85.889,25.814 c-13.16,4.222-23.815,11.545-32.864,21.633c-9.068,10.109-19.777,17.812-32.866,21.687c-2.896,0.857-6.571,0.831-9.406-0.164 c-9.919-3.478-17.991-9.391-24.333-18.157c-6.471-8.945-16.816-12.481-26.829-16.09c-3.313-1.194-6.613-2.425-9.914-3.651 c-3.365-1.25-6.721-3.511-10.087-3.526c-4.35-0.019-7.008-1.848-9.102-4.948C1459.017,611.71,1455.415,605.797,1451.448,599.564z"
			}, {
				id: 15,
				name: "A3: Zamva",
				connections: [5, 14, 16, 34, 35],
				short: 'A3Z',
				flag: {
					x: 1693,
					y: 710
				},
				path: "M1828.16,774.378c-5.636-1.145-9.941-1.474-13.845-2.9 c-24.449-8.931-49.916-8.107-75.072-6.508c-11.616,0.739-22.868,6.646-34.371,9.907c-8.602,2.44-17.233,5.41-26.042,6.335 c-14.092,1.479-26.169,6.965-37.503,14.904c-9.539,6.681-19.119,13.309-28.804,19.775c-2.652,1.771-5.748,2.878-8.613,4.277 c-5.354-7.646-4.063-14.387-1.02-21.492c5.229-12.209,10.434-24.459,14.877-36.966c5.25-14.781-0.791-27.01-9.802-38.533 c-2.708-3.462-4.749-7.974-5.505-12.283c-0.736-4.199-1.604-7.594-5.193-10.163c-1.575-1.126-2.654-2.957-3.925-4.496 c-6.704-8.128-6.7-8.131-14.576-1.515c-6.504,5.463-12.849,3.609-13.048-4.712c-0.223-9.321-3.785-15.887-12.265-21.163 c2.59-1.602,4.28-3.065,6.245-3.796c12.493-4.65,22.467-12.536,31.047-22.652c6.078-7.164,13.564-12.864,22.59-15.969 c32.358-11.133,64.214-23.868,98.224-29.682c7.386-1.263,12.414-1.114,16.465,6.344c2.595,4.778,7.164,8.811,11.594,12.206 c14.33,10.983,29.909,19.207,47.462,24.65c26.805,8.312,54.182,13.248,81.679,18.039c5.551,0.967,11.161,2.203,16.409,4.197 c22.639,8.604,26.607,20.042,21.304,42.319c-2.581,10.841-8.369,20.548-18.541,26.232c-10.12,5.655-20.641,10.607-31.096,15.643 c-3.879,1.868-8.016,3.26-12.125,4.586C1834.206,754.35,1827.066,760.301,1828.16,774.378z"
			}, {
				id: 16,
				name: "B3: Vishrain",
				connections: [6, 15, 17, 36, 37],
				short: 'B3V',
				flag: {
					x: 1721,
					y: 889
				},
				path: "M1690.535,1066.829c-4.787-5.776-7.048-11.498-6.702-18.571 c0.497-10.185,0.05-10.865-9.7-12.669c-5.467-1.011-11.297-1.304-16.783-0.573c-4.867,0.647-7.544-0.883-9.801-4.72 c-6.375-10.844-12.837-21.635-20-33.685c3.708-0.553,6.13-0.807,8.504-1.295c3.229-0.665,6.629-1.05,9.582-2.384 c4.898-2.211,5.475-4.925,2.739-9.533c-0.504-0.849-1.363-1.485-1.875-2.331c-4.857-8.016-3.083-16.843,5.679-18.283 c12.886-2.117,17.04-10.563,21.344-20.627c1.688-3.946,5.466-7.48,9.129-9.969c3.942-2.678,5.837-5.287,4.068-9.817 c-2.181-5.588-1.677-10.402,4.244-13.721c-2.902-7.938-9.971-11.072-15.576-15.249c-5.954-4.437-11.526-8.691-15.05-15.526 c-1.353-2.626-4.554-4.779-7.402-6.055c-5.342-2.394-9.943-5.247-12.616-10.693c-1.599-3.258-4.119-5.412-8.026-4.248 c-5.024,1.498-8.403-0.728-10.99-4.612c-2.954-4.439-7.007-5.811-12.63-4.233c-2.039-7.75-3.939-14.973-5.614-21.34 c18.018-12.032,34.614-23.573,51.702-34.336c8.77-5.523,18.623-8.415,29.359-8.497c5.507-0.042,11.055-2.05,16.474-3.563 c4.47-1.248,8.785-3.05,13.153-4.647c31.438-11.488,63.15-10.544,95.045-2.178c3.857,1.012,7.714,2.34,11.645,2.683 c7.438,0.648,11.317,4.736,12.895,11.623c5.02,21.914,4.649,43.677-3.2,64.831c-1.866,5.028-5.622,10.281-9.986,13.272 c-10.633,7.287-22.036,13.481-33.32,19.772c-6.623,3.692-14.029,6.09-20.339,10.21c-9.144,5.973-17.625,12.963-26.365,19.55 c-2.98,2.247-3.528,5-2.791,8.779c1.442,7.392,4.304,14.796,0.845,22.542c-0.581,1.304,0.765,3.738,1.699,5.377 c0.97,1.702,2.521,3.071,3.82,4.585c8.315,9.7,8.983,12.473,2.593,23.855c-4.513,8.037-6.31,16.462-3.969,24.948 c2.271,8.237,6.437,15.966,9.941,23.841c1.074,2.413,2.841,4.507,4.066,6.863c2.516,4.839,3.049,9.31-1.878,13.351 c-2.252,1.848-3.603,4.756-5.574,6.997c-5,5.684-10.896,8.277-18.663,5.929c-5.392-1.629-11.162-2.025-16.529-3.718 c-6.828-2.151-12.316-0.832-17.257,4.238C1694.925,1064.542,1692.752,1065.424,1690.535,1066.829z"
			}, {
				id: 17,
				name: "B3: Xidorpupo",
				connections: [6, 16, 18, 38, 39],
				short: 'B3X',
				flag: {
					x: 1800,
					y: 1241
				},
				path: "M1808.359,1149.403c-2.62,3.653-4.68,6.589-6.806,9.476 c-4.919,6.678-4.988,14.089,1.223,19.527c6.154,5.388,13.011,10.192,20.187,14.094c3.087,1.679,7.943,1.216,11.672,0.344 c6.045-1.414,10.569-0.452,15.393,3.771c4.148,3.631,9.524,6.059,14.672,8.295c5.572,2.42,11.551,3.002,17.503,0.852 c0.938-0.339,1.873-0.687,2.827-0.973c16.457-4.939,31.76-4.225,46.043,7.045c13.939,10.999,30.662,15.648,48.059,17.919 c9.879,1.29,19.773,2.48,29.667,3.663c8.8,1.052,16.603,4.711,23.97,9.336c1.829,1.148,3.048,3.269,5.563,6.075 c-4.309,1.961-7.763,3.497-11.188,5.098c-15.768,7.375-30.496,15.899-41.33,30.309c-6.692,8.897-11.274,17.913-10.293,29.253 c0.168,1.946-0.219,3.939-0.394,6.567c-2.219,0.537-4.332,1.313-6.502,1.527c-7.599,0.752-15.206,1.539-22.829,1.855 c-4.61,0.189-9.303-0.145-13.874-0.812c-9.722-1.422-19.082-0.907-28.512,2.313c-10.691,3.652-21.675,6.457-32.565,9.51 c-2.865,0.804-5.847,1.568-8.794,1.648c-9.276,0.252-12.978-4.934-10.538-14.066c1.019-3.817,2.03-7.711,2.34-11.625 c0.446-5.647-2.403-9.587-6.455-13.741c-8.222-8.432-16.912-9.453-27.973-6.834c-21.494,5.091-43.549,5.539-65.479,3.657 c-15.436-1.324-30.238-5.365-41.047-17.813c-2.597-2.992-4.851-6.312-7.021-9.638c-5.111-7.84-9.771-10.297-18.388-7.373 c-5.609,1.903-9.445,0.331-12.009-3.86c-4.033-6.598-9.654-10.95-16.506-13.875c-9.74-4.155-12.672-11.227-11.583-21.592 c1.352-12.861,1.216-25.873,1.935-38.808c0.163-2.93,0.587-6.145,1.947-8.654c5.31-9.78,3.034-19.199-0.578-29.308 c-6.095-0.673-12.27-1.357-18.445-2.036c-3.7-0.406-6.058-1.947-6.581-6.094c-0.577-4.57,1.884-6.995,5.426-8.433 c3.347-1.358,6.99-1.983,10.975-3.058c0.286-6.982,4.795-10.724,10.354-14.325c7.173-4.647,13.963-10.03,20.284-15.791 c3.834-3.494,6.89-8.058,9.535-12.584c2.938-5.03,5.667-9.845,12.059-10.861c0.309-0.049,0.659-0.246,0.863-0.483 c7.249-8.421,16.392-6.392,25.6-4.895c6.787,1.104,13.828,0.959,20.462,2.577c4.619,1.127,9.221,3.697,12.975,6.693 c6.413,5.115,11.267,12.104,19.748,14.632c4.347,1.294,4.528,5.674,3.939,9.251c-1.132,6.885-2.514,13.867-8.353,18.701 c-4.202,3.481-5.466,8.216-5.867,13.308c-0.824,10.465,4.926,15.739,15.621,15.605c8.2-0.104,16.422,0.86,24.615,1.562 C1805.025,1146.432,1806.041,1147.757,1808.359,1149.403z"
			}, {
				id: 18,
				name: "B3: Yepadlic",
				connections: [7, 17, 19, 40, 41],
				short: 'B3Y',
				flag: {
					x: 1710,
					y: 1364
				},
				path: "M1820.976,1489.194c-5.964-8.951-13.228-13.758-22.649-15.017 c-1.221-0.163-2.657-0.841-3.446-1.753c-5.186-5.997-10.601-11.851-15.221-18.27c-7.929-11.017-18.403-17.129-31.866-17.707 c-4.978-0.214-8.997-1.129-12.063-5.478c-3.164-4.488-8.082-5.561-13.317-5.331c-18.149,0.799-34.692-4.735-50.602-12.793 c-0.891-0.45-1.753-1.046-2.7-1.282c-17.703-4.415-32.439-14.877-48.172-23.355c-5.264-2.837-9.357-6.354-11.697-11.707 c-3.316-7.59-8.53-13.076-15.62-17.503c-19.435-12.136-38.661-24.618-57.702-37.364c-10.219-6.842-20.174-14.158-29.672-21.963 c-4.239-3.483-8.164-8.219-10.312-13.213c-5.901-13.726-11.073-27.789-15.962-41.917c-2.78-8.035-1.748-9.182,6.479-12.338 c10.56-4.051,21.272-7.755,31.631-12.27c14.998-6.537,29.129-14.62,41.54-25.493c10.481-9.181,18.843-19.549,21.629-33.709 c0.938-4.771,2.908-9.34,4.563-14.489c10.88,2.434,20.372-0.264,30.032-2.952c10.25-2.854,20.313,1.357,30.435,2.573 c1.281,0.153,3.092,2.773,3.22,4.367c0.395,4.878,1.337,10.255-0.214,14.631c-2.862,8.075-3.308,16.233-3.667,24.522 c-0.475,10.956-0.521,21.942-1.369,32.867c-0.73,9.424,2.339,16.232,11.102,20.187c7.401,3.339,13.609,7.818,18.143,14.969 c3.237,5.106,8.459,6.745,14.893,4.32c7.153-2.694,10.5-1.675,14.02,5.017c10.286,19.553,27.767,26.75,48.193,29.167 c23.299,2.757,46.618,1.447,69.39-3.313c11.992-2.506,19.914,1.684,27.61,8.959c3.256,3.079,4.871,6.93,2.729,11.731 c-1.475,3.305-2.408,6.918-3.118,10.485c-1.753,8.815,2.103,14.7,10.902,15.26c5.514,0.352,11.298-0.559,16.694-1.94 c12.237-3.134,24.229-7.233,36.474-10.327c11.489-2.902,22.937-1.629,35.919,1.983c-2.038,3.646-3.248,6.443-5.043,8.796 c-1.15,1.51-3.3,2.21-4.762,3.537c-4.622,4.199-5.249,7.207-1.153,11.964c3.861,4.485,8.311,8.707,13.207,11.99 c4.692,3.146,6.752,6.747,6.908,12.28c0.318,11.276-2.964,21.697-6.988,31.941c-0.928,2.361-2.743,4.722-4.777,6.246 c-12.854,9.627-26.221,18.281-42.604,20.776c-7.055,1.074-13.189,4.095-18.771,8.707c-4.814,3.976-10.507,6.881-15.387,10.788 c-3.834,3.069-7.419,6.64-10.405,10.531c-5.143,6.706-11.332,11.323-19.943,11.661 C1830.377,1478.246,1826.427,1483.273,1820.976,1489.194z"
			}, {
				id: 19,
				name: "B3: Zilsier",
				connections: [7, 18, 20, 42, 43],
				short: 'B3Z',
				flag: {
					x: 1528,
					y: 1401
				},
				path: "M1790.525,1473.692c-10.096,10.933-20.851,17.882-35.589,15.941 c-9.714-1.279-18.245,1.365-26.204,7.151c-6.103,4.437-12.682,8.313-19.377,11.808c-6.964,3.634-14.577,4.895-22.296,2.554 c-13.343-4.044-26.723-8.014-39.887-12.592c-18.207-6.33-36.063-13.697-54.378-19.676c-15.814-5.163-32.271-5.479-48.144-0.314 c-7.742,2.519-14.678,7.52-21.128,10.944c-3.619-5.433-7.496-10.985-11.082-16.723c-2.811-4.499-5.122-9.309-7.901-13.83 c-4.321-7.03-8.382-14.3-13.444-20.769c-3.842-4.91-6.664-9.776-7.115-16.035c-0.803-11.155-4.299-21.842-10.331-30.868 c-6.964-10.422-17.831-16.233-30.853-14.425c-8.604,1.195-16.557,0.631-24.258-3.172c-5.82-2.873-11.591-2.698-17.338-0.066 c-11.453,5.243-23.519,9.394-32.67,18.72c-5.73,5.84-12.216,6.642-20.104,3.934c-11.918-4.091-24.43-6.415-35.426-13.113 c-2.127-1.295-5.146-1.051-7.695-1.739c-5.311-1.433-6.926-4.367-5.271-9.771c1.158-3.788,3.16-7.391,3.841-11.242 c2.027-11.475-6.878-27.366-19.884-31.214c-8.771-2.596-16.438-7.089-22.932-13.535c-4.031-4.003-7.93-8.107-7.229-14.925 c7.261-0.897,14.355-1.62,21.391-2.712c3.237-0.503,6.633-1.218,9.487-2.726c7.592-4.009,15.225-4.168,23.191-1.608 c3.479,1.118,7.01,2.105,10.564,2.948c8.214,1.946,16.379,2.298,24.594-0.373c18.719-6.085,36.708-12.636,51.029-27.718 c7.238-7.623,17.862-13.007,27.941-16.738c16.4-6.074,33.611-9.963,50.979-14.916c1.32,3.18,2.245,5.192,3.002,7.267 c4.9,13.437,9.64,26.934,14.681,40.317c3.772,10.013,10.804,17.239,19.716,23.133c18.004,11.903,35.657,24.336,53.55,36.411 c9.633,6.501,19.412,12.788,29.219,19.026c5.501,3.5,9.771,7.946,12.292,14.009c2.831,6.803,7.893,11.258,14.452,14.487 c5.051,2.486,9.757,5.675,14.598,8.585c1.139,0.685,2.104,1.716,3.303,2.23c23.692,10.179,46.535,22.739,72.684,26.071 c0.329,0.042,0.668,0.265,0.97,0.214c10.95-1.845,20.027,1.14,27.578,9.59c1.608,1.8,5.492,2.479,8.194,2.231 c12.003-1.098,19.999,5.64,27.521,13.368c3.907,4.016,7.573,8.285,11.122,12.623 C1787.69,1468.657,1788.994,1471.266,1790.525,1473.692z"
			}, {
				id: 20,
				name: "C3: Vilipne",
				connections: [8, 19, 21, 44, 45],
				short: 'C3V',
				flag: {
					x: 1132,
					y: 1382
				},
				path: "M953.955,1451.56c5.936-4.733,11.156-8.646,16.083-12.896 c4.977-4.295,10.002-8.623,14.368-13.508c3.289-3.68,5.291-8.479,8.353-12.398c8.646-11.064,9.441-23.818,8.458-37.004 c-0.12-1.616-0.429-3.498-1.354-4.727c-5.204-6.917-2.938-13.371,1.607-19.089c4.429-5.57,6.196-11.501,5.929-18.475 c-0.44-11.479,5.413-21.108,9.963-31.029c0.996-2.169,3.695-3.625,5.75-5.229c3.376-2.635,7.622-4.544,10.127-7.812 c3.384-4.414,7.088-4.535,11.409-2.966c2.768,1.004,5.309,2.652,7.914,4.082c3.784,2.073,7.357,4.678,11.35,6.184 c3.65,1.378,7.987,2.742,11.555,1.966c2.896-0.63,5.066-4.479,7.621-6.832c3.913-3.603,7.697-7.387,11.919-10.589 c1.596-1.211,4.398-1.715,6.405-1.313c4.196,0.839,8.188,2.639,12.339,3.77c3.688,1.004,8.036,3.2,11.104,2.104 c6.068-2.166,13.047-4.171,16.228-10.756c2.528-5.235,4.297-10.837,6.732-17.127c7.414,1.185,14.033,5.771,17.465,13.042 c3.342,7.077,7.29,11.606,15.394,11.661c1.208,0.009,2.771,0.267,3.562,1.034c5.869,5.694,12.22,11.058,17.167,17.488 c4.803,6.243,10.841,9.64,17.982,11.59c3.12,0.852,5.433-0.219,6.709-3.968c2.531-7.435,2.829-7.428,10.46-6.798 c3.95,0.326,7.867,1.042,12.174,1.633c6.555,15.065,18.347,23.979,33.667,28.773c9.881,3.093,14.797,11.196,17.961,20.075 c1.14,3.2-0.795,7.548-1.495,11.341c-0.887,4.805-1.824,9.606-2.982,14.35c-0.593,2.427-1.204,5.12-2.68,7.013 c-7.453,9.559-17.254,13.211-29.179,10.486c-25.848-5.904-48.709,1.297-69.455,16.398c-8.068,5.873-16.925,9.228-26.382,11.224 c-26.808,5.655-45.99,21.079-59.064,44.816c-1.88,3.416-4.38,7.072-7.563,9.081c-10.942,6.903-22.212,13.317-33.616,19.436 c-2.175,1.168-6.143,1.193-8.238-0.036c-18.627-10.927-38.673-12.772-59.631-10.751c-7.23,0.697-14.65,0.426-21.895-0.295 c-8.004-0.797-9.104-2.764-10.243-10.543c-0.448-3.062-1.97-6.136-3.635-8.813C961.518,1461.682,958.229,1457.522,953.955,1451.56z"
			}, {
				id: 21,
				name: "C3: Xistan",
				connections: [8, 20, 22, 46, 47],
				short: 'C3X',
				flag: {
					x: 851,
					y: 1343
				},
				path: "M950.748,1449.068c-0.324-0.029-0.748,0.065-0.956-0.104 c-8.248-6.747-17.23-5.084-26.402-2.51c-14.13,3.964-26.583,9.886-34.467,23.44c-3.263,5.61-5.226,10.473-2.866,16.713 c0.878,2.322,1.02,4.924,1.84,9.172c-4.12-2.063-6.897-3.018-9.172-4.665c-12.141-8.788-25.924-10.884-40.525-11.718 c-15.519-0.886-31.04-2.966-46.365-5.643c-14.227-2.482-24.613-10.821-31.114-24.065c-8.801-17.928-23.254-29.681-41.92-36.258 c-13.624-4.8-25.231-12.832-37.778-21.779c2.825-2.528,4.91-4.446,7.052-6.3c7.987-6.912,8.45-14.576,1.43-22.395 c-2.122-2.365-4.015-4.936-5.979-7.369c4.533-4.962,8.736-8.791,11.992-13.305c5.024-6.964,9.498-14.334,14.022-21.646 c4.015-6.49,7.274-13.505,11.761-19.634c9.264-12.652,17.935-25.606,24.493-39.886c3.619-7.879,8.426-14.035,17.831-15.586 c9.808-1.616,14.005-9.961,17.561-17.665c8.196-17.76,6.695-17.165,26.676-16.029c10.71,0.609,20.119-3.471,27.733-11.397 c4.747-4.942,9.297-10.281,16.736-12.841c1.541,2.448,2.987,4.572,4.252,6.801c1.312,2.313,1.99,5.158,3.743,7.019 c7.166,7.603,11.489,16.894,16.745,25.707c3.045,5.105,9.272,8.314,14.07,12.373c3.261,2.761,6.957,5.147,9.7,8.35 c6.005,7.009,13.357,11.923,21.666,15.604c3.645,1.615,7.305,3.204,11.005,4.688c8.872,3.559,15.188,9.063,16.877,19.191 c1.229,7.364,6.447,11.374,13.721,12.586c8.512,1.417,17.066,2.598,25.555,4.14c5.813,1.056,10.75,3.899,13.337,9.425 c1.188,2.535,1.797,5.566,1.809,8.376c0.017,4.3-0.286,8.698-1.23,12.879c-1.144,5.06-2.198,10.51-4.9,14.77 c-4.858,7.663-6.35,14.469-2.234,23.273c4.066,8.697,2.458,18.517-1.348,27.063c-3.896,8.747-9.304,16.846-14.361,25.037 c-1.715,2.775-4.068,5.374-6.666,7.349C966.441,1438.032,958.542,1443.481,950.748,1449.068z"
			}, {
				id: 22,
				name: "C3: Yeraim",
				connections: [9, 21, 23, 48, 49],
				short: 'C3Y',
				flag: {
					x: 656,
					y: 1220
				},
				path: "M680.527,1352.202c-5.905-3.757-11.116-2.628-16.684,0.975 c-6.38,4.126-13.123,8.084-20.249,10.557c-6.762,2.347-14.187,3.4-21.384,3.771c-25.729,1.323-48.532-6.293-67.91-23.588 c-11.14-9.942-24.041-16.502-38.564-20.043c-17.496-4.266-31.066-14.897-42.943-27.782c-3.038-3.296-4.774-7.93-6.612-12.163 c-3.171-7.303-5.895-14.797-8.915-22.167c-3.756-9.164-10.176-15.306-19.9-18.137c-4.422-1.288-8.726-3.343-12.697-5.7 c-2.926-1.737-5.224-4.53-9.021-7.949c11.988-4.77,19.06-13.103,26.949-20.481c11.355-10.62,12.311-16.066,4.225-29.906 c7.674-4.612,15.687-8.158,24.414-10.49c8.632-2.305,17.022-5.505,25.598-8.043c4.413-1.306,9.021-1.938,13.502-3.031 c5.103-1.244,10.726-1.69,15.114-4.228c7.138-4.125,14.024-9.083,19.924-14.814c4.064-3.947,8.382-6.357,13.533-7.737 c17.624-4.72,33.436-12.476,46.076-26.093c4.911-5.292,10.523-9.929,15.792-14.891c7.727-7.275,11.637-7.846,21.235-2.733 c12.303,6.554,25.896,8.385,39.352,10.25c3.801,0.527,8.69-1.192,11.944-3.491c7.029-4.965,13.752-10.554,19.746-16.718 c3.261-3.354,4.772-8.408,7.236-13.001c14.734,1.26,28.813,5.54,40.941,14.895c3.331,2.568,5.905,6.176,8.613,9.48 c4.323,5.276,7.368,10.972,16.027,11.676c9.043,0.735,14.308,16.77,9.282,24.786c-5.484,8.748-4.787,14.29,2.645,20.984 c0.247,0.223,0.54,0.395,0.786,0.616c10.667,9.591,10.667,9.591,21.243,0.948c21.594,16.79,24.438,20.105,29.163,34.446 c-7.21,6.785-14.231,14.364-22.259,20.662c-7.421,5.822-16.891,5.575-25.91,5.202c-14.556-0.602-15.13-0.372-21.048,12.739 c-1.64,3.634-3.157,7.367-5.211,10.764c-3.152,5.213-7.043,10.046-13.535,10.936c-9.846,1.35-14.824,8.255-18.939,16.006 c-6.391,12.036-11.445,24.905-20.696,35.167c-8.41,9.329-13.55,20.305-18.514,31.636 C698.158,1336.273,690.482,1345.011,680.527,1352.202z"
			}, {
				id: 23,
				name: "C3: Zeaslo",
				connections: [9, 22, 24, 50, 51],
				short: 'C3Z',
				flag: {
					x: 569,
					y: 1050
				},
				path: "M517.187,940.629c8.627-0.957,15.743-4.485,21.993-10.583 c8.177-7.978,19.084-10.009,30.571-12.641c0,4.101-0.118,7.371,0.023,10.63c0.369,8.581,4.12,12.154,12.756,11.166 c6.245-0.714,12.429-2.257,18.533-3.842c7.896-2.05,14.938-2.278,20.643,5.089c3.171,4.095,8.266,4.733,12.812,2.954 c6.439-2.52,12.625-5.753,18.731-9.033c4.05-2.175,7.684-5.219,12.185-4.743c0.981,0.944,1.831,1.369,1.864,1.85 c0.725,10.39,2.997,14.474,16.071,16.62c17.357,2.849,34.764,5.973,52.499,2.377c2.152-0.436,5.893,0.454,6.915,2.021 c6.161,9.456,14.47,16.267,24.223,21.569c1.166,0.634,2.319,1.294,3.942,2.201c-4.475,2.188-7.739,3.264-10.318,5.235 c-1.592,1.218-3.407,4.321-2.861,5.65c0.829,2.019,3.883,4.818,5.538,4.544c16.145-2.677,21.49,11.275,29.988,19.645 c5.387,5.306,3.457,10.089-2.488,14.636c-6.382,4.879-11.985,9.324-21.418,7.382c-5.061-1.042-11.559,2.547-16.792,5.244 c-7.538,3.885-6.414,11.684-6.419,18.584c-0.002,2.203,0.989,4.409,1.723,7.423c-11.196,1.777-20.868-3.595-31.719-4.959 c-1.686,17.865-17.352,23.531-28.012,33.427c-1.744,1.619-5.745,1.707-8.471,1.216c-13.375-2.409-26.973-4.043-38.917-11.58 c-7.33-4.626-14.129-1.884-20.071,3.24c-6.758,5.828-13.972,11.333-19.76,18.038c-10.272,11.9-23.972,17.332-38.009,22.486 c-2.801,1.027-5.91,1.385-8.51,2.751c-3.999,2.101-7.773,4.673-11.478,7.278c-12.323,8.667-23.056,20.6-40.192,19.219 c-0.974-0.078-2.121-0.067-2.946,0.364c-18.307,9.574-40.072,9.689-57.683,21.43c-6.708,4.472-14.915,2.373-22.419,1.512 c-9.539-1.094-18.99-2.945-29.261-4.595c-2.683-5.566-5.175-12.469-9.137-18.387c-3.007-4.492-7.329-8.732-12.032-11.347 c-17.318-9.623-26.756-28.308-23.062-47.71c3.21-16.861,12.709-29.797,25.854-40.248c6.767-5.381,13.864-10.347,20.846-15.453 c11.075-8.1,17.33-18.927,19.254-32.533c0.785-5.551,2.474-10.998,4.06-16.401c1.105-3.767,3.469-6.136,7.893-6.329 c13.266-0.581,25.254-5.16,36.513-12.036c3.95-2.412,8.234-4.286,12.417-6.301c6.411-3.086,12.835-2.916,19.272,0.048 c2.106,0.97,4.359,1.617,6.492,2.533c3.841,1.649,6.073,0.316,7.95-3.316c2.87-5.553,6.618-10.67,9.273-16.311 C517.272,948.039,516.797,944.631,517.187,940.629z"
			}, {
				id: 24,
				name: "D3: Verdebu",
				connections: [10, 23, 25, 52, 53],
				short: 'D3V',
				flag: {
					x: 592,
					y: 824
				},
				path: "M458.47,729.289c4.481-2.34,7.744-1.536,11.298,1.43 c18.411,15.362,40.314,21.418,63.727,22.48c7.223,0.327,14.616-0.802,21.782-2.092c9.803-1.766,19.409-4.621,29.202-6.456 c9.915-1.857,18.981-5.473,27.725-10.43c2.536-1.438,6.259-1.391,9.358-1.117c15.112,1.337,29.876,6.13,45.314,4.379 c4.317-0.49,7.729,1.522,10.287,4.943c0.992,1.328,1.698,2.884,2.767,4.138c4.184,4.91,8.718,8.861,16.029,7.63 c3.9-0.656,7.969-0.369,11.962-0.391c4.755-0.026,4.755,0.029,10.404,6.5c-3.104,1.879-5.806,4.376-8.963,5.279 c-16.247,4.647-29.701,14.117-43.223,23.71c-8.336,5.914-17.262,11.017-26.045,16.281c-10.129,6.07-13.582,14.395-10.031,25.866 c2.544,8.217,5.409,16.338,8.279,24.45c0.533,1.506,1.498,3.585,2.733,3.999c7.572,2.538,14.013,9.18,23.344,5.611 c4.846-1.854,10.333-2.024,15.526-2.983c3.303-0.61,4.553,1.217,5.814,3.978c1.295,2.836,2.984,6.13,5.464,7.662 c5.93,3.659,11.97,6.751,16.542,12.457c4.077,5.087,9.121,0.771,14.769-0.879c4.385,5.333,8.957,10.86,13.492,16.417 c4.382,5.37,8.455,11.027,13.183,16.071c3.317,3.54,4.474,6.662,2.804,11.499c-3.483,10.091-9.936,16.569-20.561,17.868 c-17,2.081-33.856,0.6-50.477-3.453c-5.725-1.396-8.857-4.742-9.784-11.013c-1.168-7.905-4.302-9.237-11.914-5.689 c-4.798,2.237-9.125,5.463-13.84,7.903c-3.502,1.812-7.187,3.445-10.975,4.484c-4.732,1.3-9.476,0.882-12.461-3.746 c-2.791-4.325-6.977-5.05-11.351-4.588c-6.919,0.73-13.783,1.991-20.661,3.09c-2.292,0.366-4.535,1.106-6.834,1.361 c-7.703,0.852-9.389-0.686-9.76-8.499c-0.189-3.968-0.409-7.936-0.728-11.894c-0.043-0.544-0.745-1.035-1.583-2.125 c-13.446,4.285-28.123,5.802-38.742,17.537c-4.963,5.485-11.726,7.157-20.291,3.499c1.569-3.794,2.481-7.704,4.598-10.788 c5.378-7.838,4.476-15.72,1.036-23.707c-1.569-3.643-3.582-7.147-5.793-10.445c-2.688-4.01-4.804-7.848-3.096-12.979 c0.556-1.671,0.006-3.949-0.632-5.738c-2.646-7.42-5.214-14.896-8.417-22.081c-2.236-5.018-1.995-8.79,2.537-12.222 c9.797-7.422,10.563-16.626,5.982-27.514c-4.809-11.429-11.921-20.911-22.139-27.618c-9.476-6.22-14.959-14.629-18.129-25.261 C465.361,747.258,461.843,738.672,458.47,729.289z"
			}, {
				id: 25,
				name: "D3: Xiwait",
				connections: [10, 24, 26, 54, 55],
				short: 'D3X',
				flag: {
					x: 628,
					y: 636
				},
				path: "M527.73,589.597c-0.883-0.897-1.621-2.05-2.672-2.652 c-11.338-6.485-18.236-16.631-23.51-28.163c-2.908-6.358,0.114-16.733,7.284-22.037c7.741-5.725,15.973-10.787,24.009-16.108 c3.319-2.198,7.442-3.688,9.888-6.601c6.573-7.828,15.154-12.879,23.497-18.222c4.103-2.628,8.842-5.076,13.561-5.76 c9.805-1.42,19.788-1.609,28.277-2.205c9.176,7.734,17.347,14.499,25.355,21.451c2.209,1.918,5.155,4.159,5.638,6.662 c1.174,6.091,5.288,9.659,9.003,13.902c3.792,4.332,6.818,6.794,13.495,4.763c6.011-1.828,13.159-1.291,19.502-0.133 c3.725,0.679,7.39,4.125,10.14,7.176c4.736,5.254,9.643,9.762,16.215,12.874c4.753,2.25,8.218,2.261,11.497-1.5 c3.946-4.524,8.132-5.118,13.167-1.894c1.639,1.05,3.668,1.929,5.571,2.048c6.579,0.413,9.157,4.288,10.156,10.242 c0.421,2.512,1.23,5.448,2.914,7.156c3.463,3.516,5.529,7.284,5.85,12.229c0.093,1.437,1.109,3.441,2.293,4.067 c3.791,2.004,3.99,5.661,3.379,8.628c-1.988,9.654,2.257,16.731,8.307,23.35c0.648,0.708,1.026,1.664,1.786,2.934 c-3.545,6.38-8.442,9.498-16.279,10.652c-14.313,2.108-16.639-1.628-19.068,16.835c-0.216,1.637-1.113,3.238-1.087,4.845 c0.292,18.453-9.16,32.547-20.311,45.915c-1.49,1.786-3.252,3.476-4.243,5.521c-3.427,7.072-6.856,13.568-16.391,13.779 c-2.356,0.052-4.956,3.154-6.897,5.339c-6.124,6.894-13.29,10.565-22.828,9.865c-6.505-0.477-12.776-0.241-19.415-2.054 c-9.091-2.482-18.984-2.202-28.555-2.65c-2.817-0.132-6.031,0.698-8.511,2.08c-17.487,9.743-37.023,12.364-56.131,16.388 c-13.161,2.771-26.394,2.295-39.586-0.407c-33.13-6.784-54.664-27.29-67.905-57.454c-1.407-3.204-1.722-7.147-1.596-10.715 c0.345-9.788,3.863-18.078,12.509-23.652c4.469-2.881,8.625-6.246,13.077-9.156c11.194-7.317,23.846-9.981,36.918-10.666 c7.202-0.377,12.98-3.073,17.188-8.67c4.521-6.014,9.882-10.685,16.904-13.521c5.626-2.273,7.928-7.026,7.87-12.733 c-0.063-6.264-4.919-8.11-9.937-9.447c-3.52-0.937-7.072-1.747-10.61-2.614L527.73,589.597z"
			}, {
				id: 26,
				name: "D3: Yerat",
				connections: [11, 25, 27, 56, 57],
				short: 'D3Y',
				flag: {
					x: 788,
					y: 520
				},
				path: "M714.086,552.757c-8.559-3.188-15.653-6.208-20.386-13.456 c-4.196-6.427-9.459-10.316-18.425-7.968c-6.147,1.61-13.058,0.309-20.115,0.309c-5.016-5.922-11.927-10.208-14.182-19.327 c-1.123-4.538-7.688-7.79-11.915-11.483c-4.6-4.02-10.299-6.96-13.313-13.298c5.528-1.893,10.393-3.789,15.392-5.212 c6.043-1.721,10.082-5.159,10.807-11.576c0.787-6.967,0.095-13.422-7.427-16.841c-0.795-0.361-1.318-1.319-1.43-1.437 c5.495-10.348,11.672-19.9,15.788-30.27c4.861-12.246,14.102-15.853,25.729-16.77c5.221-0.412,10.425-1.038,15.649-1.38 c1.606-0.105,3.428,0.03,4.852,0.696c8.126,3.801,16.175,7.768,24.214,11.753c1.171,0.58,2.299,1.416,3.184,2.375 c12.492,13.549,29.508,18.82,46.176,23.887c12.156,3.695,25.235,1.898,37.455-1.158c4.929-1.233,8.942-6.438,13.173-10.068 c5.501-4.718,11.444-9.134,16.038-14.646c6.173-7.407,16.063-10.034,21.579-17.993c4.163,2.374,8.085,5.551,12.558,6.895 c4.623,1.389,9.782,1.328,14.703,1.295c5.754-0.039,8.864,3.066,11.961,7.422c5.161,7.262,9.563,15.273,17.611,20.125 c1.559,0.939,3.635,3.261,3.401,4.576c-1.835,10.301,7.543,17.555,7.076,27.406c-0.214,4.517,0.516,9.115-0.018,13.576 c-1.376,11.496-0.423,21.964,10.2,29.174c0.549,0.373,1.253,0.708,1.545,1.245c5.395,9.907,11.764,18.706,21.739,24.869 c4.276,2.642,2.505,8.46,2.132,13.101c-0.968,12.039-1.64,12.514-13.502,13.299c-3.764,0.249-7.524,1.874-11.102,3.321 c-5.13,2.074-10.752,7.285-14.977,6.261c-7.009-1.7-13.131-7.206-19.486-11.326c-1.296-0.84-1.979-2.637-2.926-4.005 c-2.362-3.412-5.243-4.859-9.405-3.042c-3.341,1.458-6.804,2.675-10.29,3.752c-4.35,1.346-8.837,2.261-13.153,3.697 c-3.344,1.113-7.251,1.983-9.625,4.284c-6.717,6.512-13.817,12.105-22.19,16.515c-4.748,2.5-9.061,7.013-11.938,11.635 c-6.358,10.215-13.832,17.072-26.757,18.083c-6.167,0.482-12.008,5.113-18.488,8.089c-6.343-5.538-12.061-11.26-10.162-21.599 c0.9-4.902,0.932-10.871-4.754-14.215c-1.121-9.438-10.892-14.829-11.326-24.79c-0.216-4.968-3.085-8.706-8.97-8.845 c-1.921-0.045-4.088-0.396-5.692-1.357C727.023,543.501,719.992,543.852,714.086,552.757z"
			}, {
				id: 27,
				name: "D3: Zilgypt",
				connections: [11, 12, 26, 58, 59],
				short: 'D3Z',
				flag: {
					x: 1025,
					y: 484
				},
				path: "M1126.894,390.243c0.725,6.434,1.199,10.329,1.596,14.232 c0.636,6.25,2.804,11.055,8.95,14.325c8.41,4.475,7.958,5.954,0.853,12.597c-6.958,6.505-14.059,13.167-14.757,23.738 c-0.104,1.574-0.702,3.435-1.724,4.578c-7.628,8.529-3.096,17.601-1.174,26.428c0.911,4.185,4.578,5.544,8.588,5.117 c2.961-0.315,5.968-0.855,8.771-1.825c3.613-1.252,6.524-1.064,8.585,2.461c1.981,3.389,2.633,6.828-0.085,10.183 c-1.881,2.323-3.976,4.488-5.704,6.916c-3.11,4.368-2.591,6.964,1.994,9.812c2.533,1.573,5.783,2.259,7.848,4.243 c2.181,2.095,4.467,5.225,4.542,7.962c0.049,1.815-3.431,4.283-5.821,5.491c-4.721,2.384-9.99,3.702-14.656,6.171 c-8.83,4.674-10.585,8.752-9.041,18.569c1.21,7.694-0.208,9.667-7.745,12.516c-4.258,1.611-8.057,4.65-12.393,5.785 c-4.94,1.293-10.238,1.321-15.397,1.639c-4.193,0.258-8.523-0.453-12.59,0.323c-5.613,1.071-11.028,1.094-14.899-3.175 c-9.384-10.348-22.73-13.21-34.425-19.185c-2.958-1.512-6.324-2.532-8.807-4.609c-9.877-8.261-20.457-6-30.947-2.232 c-6.532,2.347-12.659,5.804-19.038,8.603c-1.938,0.851-4.11,1.17-7.021,1.965c0.606-6.219,1.304-11.387,1.573-16.578 c0.428-8.268-2.097-15.151-10.18-18.851c-5.172-2.368-8.018-6.385-10.266-11.554c-1.63-3.75-4.61-7.2-7.719-9.962 c-7.29-6.474-11.398-13.918-8.162-23.664c3.542-10.665-1.265-20.043-3.792-29.798c-0.568-2.192-2.505-4.352-2.294-6.367 c0.846-8.066-2.838-13.192-9.373-17.151c-2.205-1.336-4.188-3.337-5.715-5.44c-5.999-8.255-11.774-16.673-17.726-25.162 c2.326-3.312,5.421-2.037,8.702-1.02c6.339,1.965,12.691,4.014,19.181,5.319c3.802,0.765,8.367,1.334,11.733-0.065 c7.76-3.225,15.569-2.922,23.501-2.394c6.768,0.45,12.342-0.238,15.056-8.021c0.948-2.718,4.302-5.483,7.167-6.487 c10.081-3.531,12.544-10.922,12.034-20.471c-0.265-4.974,1.473-9.104,6.913-11.829c1.483,1.377,2.897,3.178,4.733,4.264 c2.108,1.247,4.712,2.836,6.888,2.564c6.063-0.758,10.94,0.576,15.557,4.707c3.898,3.488,8.22,6.874,14.328,4.447 c1.196-0.475,3.203,0.449,4.584,1.194c6.707,3.624,13.326,7.41,19.981,11.13c6.431,3.595,12.912,6.427,20.706,5.978 c4.145-0.238,8.429,1.482,12.614,2.469C1103.388,392.713,1114.378,394.777,1126.894,390.243z"
			}, {
				id: 28,
				name: "A4: Aithmirash",
				connections: [12, 29, 59],
				short: 'A4A',
				flag: {
					x: 1176,
					y: 310
				},
				flagPos: {
					x: 1131,
					y: 265
				},
				path: "M1241.047,333.842c6.123,3.542,10.935,7.082,16.302,9.235 c6.372,2.558,10.064,7.268,13.451,12.703c2.244,3.6,1.438,6.25-1.907,8.444c-2.476,1.624-4.773,3.821-7.494,4.721 c-9.908,3.272-12.824,11.581-15.495,20.25c-1.265,4.102-2.265,8.298-6.783,10.493c-6.583,3.199-12.687,3.897-18.168-2.016 c-5.8-6.257-12.226-6.888-20.72-5.202c-7.386,1.466-15.717-0.481-23.374-2.118c-7.066-1.51-13.741-4.778-20.698-6.911 c-2.059-0.631-4.521-0.265-6.746,0.033c-6.232,0.835-12.436,1.873-18.209,2.763c-5.873-8.81-11.373-16.983-16.766-25.225 c-0.896-1.37-1.785-3.014-1.893-4.585c-0.63-9.154-1.531-18.334-1.346-27.485c0.153-7.592,2.617-15.194,2.317-22.723 c-0.27-6.763-2.513-13.559-4.644-20.094c-1.415-4.339-4.405-8.138-6.264-12.366c-4.008-9.111-7.926-18.092-14.104-26.192 c-5.954-7.807-7.382-16.98-1.864-26.229c3.748-6.281,6.953-12.891,10.801-19.106c4.75-7.672,10.368-9.781,18.617-6.467 c5.15,2.069,10.456,4.708,14.463,8.417c4.966,4.596,10.417,6.414,16.398,4.961c10.013-2.432,19.048,0.412,28.32,3.236 c4.709,1.435,9.618,2.422,14.509,3.008c6.594,0.791,12.021,2.871,16.001,8.705c1.708,2.504,5.038,3.98,7.783,5.677 c2.762,1.708,5.67,3.201,8.597,4.619c2.345,1.136,4.79,2.788,7.232,2.866c6.934,0.221,13.981,0.366,20.81-0.639 c5.417-0.796,8.305,1.333,10.362,5.546c1.154,2.367,2.133,4.974,2.462,7.564c1.976,15.561,2.27,31.002-3.622,45.996 c-1.059,2.693-1.968,5.908-1.509,8.64c1.065,6.349-1.357,10.773-5.587,15.131C1248.619,323.266,1245.726,327.782,1241.047,333.842z"
			}, {
				id: 29,
				name: "A4: Bangma Mynia",
				connections: [12, 28, 30],
				short: 'A4B',
				flag: {
					x: 1337,
					y: 316
				},
				path: "M1398.948,325.561c2.313,3.641,3.858,5.468,4.739,7.573 c2.496,5.963,1.334,8.078-4.741,10.68c-6.396,2.74-13.103,5.103-18.889,8.845c-8.396,5.432-16.177,11.878-19.278,23.256 c2.626,2.752,5.765,6.04,9.225,9.665c-2.621,2.304-5.284,4.645-8.329,7.321c1.92,2.556,3.66,4.869,5.789,7.702 c-1.018,2.697-2.156,5.716-3.43,9.092c-8.199,1.041-15.898,1.643-23.688-1.375c-4.589-1.777-9.544-2.845-14.435-3.515 c-2.414-0.33-5.551,0.263-7.504,1.647c-8.623,6.109-17.809,3.6-26.529,1.505c-5.19-1.247-9.713-1.054-14.603,0.191 c-9.667,2.462-19.033,0.907-28.169-2.583c-1.184-0.452-2.162-1.439-3.708-2.504c2.563-7.886,4.825-15.756,7.78-23.357 c0.828-2.132,3.506-3.773,5.663-5.113c4.218-2.622,8.797-4.669,12.982-7.336c4.156-2.648,5.75-7.182,3.392-11.184 c-3.663-6.213-7.058-12.744-14.717-15.552c-4.495-1.649-8.511-4.603-13.764-7.542c3.755-4.754,6.458-8.445,9.443-11.889 c4.102-4.729,7.182-9.586,4.964-16.271c-0.471-1.423-0.484-3.414,0.154-4.724c5.184-10.651,7.27-21.916,6.742-33.712 c5.372-2.491,10.671-4.4,15.334-7.327c2.522-1.584,4.883-4.63,5.72-7.484c3.214-10.973,8.78-18.791,20.842-21.488 c6.699-1.498,13.044-4.923,19.278-8.02c3.169-1.574,5.796-4.282,8.575-6.587c6.896-5.721,13.468-12.187,23.737-7.601 c1.393,0.622,3.365,0.452,4.934,0.079c4.734-1.126,8.051,1.017,11.813,3.605c8.975,6.176,18.468,11.595,27.615,17.529 c2.924,1.896,5.421,4.449,8.021,6.623c-1.768,4.001-3.243,6.944-4.381,10.011c-1.992,5.363-1.398,10.382,2.141,15.09 c3.044,4.047,9.236,6.578,7.419,13.134c-1.37,4.939-3.473,9.674-5.582,15.403c2.533,3.066,5.822,7.05,9.395,11.375 C1414.682,309.246,1406.967,317.246,1398.948,325.561z"
			}, {
				id: 30,
				name: "A4: Cuatishca",
				connections: [13, 29, 31],
				short: 'A4C',
				flag: {
					x: 1473,
					y: 354
				},
				path: "M1546.646,326.266c-2.97,3.242-4.965,5.43-6.971,7.607 c-7.121,7.729-7.654,17.313-2.473,26.32c3.05,5.3,4.807,11.343,7.666,18.322c-10.547,3.28-19.535,6.631-28.798,8.816 c-11.648,2.747-22.082,7.222-30.178,16.306c-0.886,0.993-1.771,2.038-2.837,2.812c-11.602,8.43-18.725,19.93-24.82,32.777 c-4.533,9.553-12.351,16.689-24.86,13.553c-1.492-0.375-3.323,0.723-4.884,0.46c-3.229-0.542-7.741-0.492-9.322-2.541 c-5.684-7.366-15.391-11.643-17.383-21.726c-0.434-2.184,0.413-4.999,1.556-7.023c1.438-2.549,4.093-4.391,5.673-6.886 c2.46-3.886,4.459-8.064,6.682-12.171c-14.888-7.73-30.923-7.397-48.465-8.126c3.655-3.92,6.186-6.633,9.345-10.021 c-2.015-1.638-3.539-3.174-5.329-4.279c-5.946-3.672-6.586-5.003-3.048-10.99c5.669-9.592,15.063-14.691,24.659-19.419 c0.893-0.44,1.872-0.706,2.761-1.153c4.079-2.051,9.903-3.178,11.704-6.486c1.742-3.203-0.415-8.71-1.299-13.118 c-1.273-6.358,3.42-9.725,6.64-13.692c1.835-2.261,4.731-3.634,7.027-5.551c8.088-6.753,8.28-9.682,1.323-18.11 c-0.842-1.019-1.721-2.008-2.347-2.738c1.351-5.058,3.412-9.727,3.636-14.481c0.222-4.71-1.412-9.507-2.372-15.081 c3.932-4.275,9.874-5.062,15.78-5.41c7.64-0.45,15.311-0.582,22.962-0.476c2.507,0.035,5.573,0.542,7.392,2.038 c6.332,5.209,12.045,11.176,18.391,16.367c2.395,1.959,5.84,3.558,8.865,3.665c16.243,0.577,32.576,1.984,47.838-6.269 c5.558-3.005,13.134-4.81,17.638,0.562c4.606,5.495-0.434,11.608-3.997,16.093c-4.83,6.079-9.063,12.763-15.868,17.25 c-6.883,4.537-6.682,7.083-0.688,13.205C1540.982,319.467,1543.418,322.557,1546.646,326.266z"
			}, {
				id: 31,
				name: "A4: Dilandmoor",
				connections: [13, 30, 32],
				short: 'A4D',
				flag: {
					x: 1591,
					y: 391
				},
				path: "M1665.755,371.702c-5.518,2.716-10.196,5.021-15.216,7.492 c-2.178,6.531-1.292,12.042,5.179,16.156c2.521,1.603,4.542,3.828,3.269,7.522c-1.473,4.277,0.492,7.677,3.314,10.829 c1.754,1.958,3.567,4.044,4.637,6.398c3.036,6.683,1.266,10.851-5.864,12.866c-17.866,5.049-35.337,3.569-52.613-3.268 c-6.008-2.377-12.623-3.223-19.628-4.93c-3.174,14.997-14.798,21.74-24.376,30.116c-1.639,1.433-5.022,1.585-7.46,1.267 c-11.218-1.464-21.609,0.422-31.979,5.096c-4.844,2.183-10.886,1.809-16.408,2.352c-4.188,0.412-8.461,0.111-12.607,0.731 c-4.242,0.634-8.359,2.066-12.559,3.037c-6.222,1.438-11.375,0.537-16.199-4.619c-3.682-3.936-9.079-6.266-14.239-9.655 c1.959-2.725,3.677-5.078,5.354-7.459c2.293-3.254,5.68-6.233,6.633-9.849c4.253-16.129,18.257-24.034,29.103-34.163 c6.165-5.757,15.671-8.208,23.983-11.317c7.723-2.888,15.904-4.521,23.791-7.004c4.441-1.399,6.468-4.579,4.754-9.311 c-1.803-4.976-3.201-10.198-5.723-14.792c-4.229-7.704-4.815-14.604,0.417-21.082c8.222-10.181,20.295-14.61,31.817-19.601 c1.461-0.632,4.372,0.949,6.085,2.215c10.796,7.983,22.664,10.57,35.672,7.371c2.453-0.604,4.756-2.057,6.956-3.398 c3.906-2.38,7.585-5.135,11.526-7.449c10.19-5.985,19.725-3.932,28.84,2.633c5.03,3.624,5.884,6.364,3.041,11.759 c-1.072,2.034-2.617,3.848-4.109,5.625c-9.571,11.409-9.202,19.503,1.352,29.804 C1663.418,367.972,1664.017,369.201,1665.755,371.702z"
			}, {
				id: 32,
				name: "A4: Eda Monwe",
				connections: [14, 31, 33],
				short: 'A4E',
				flag: {
					x: 1723,
					y: 398
				},
				flagPos: {
					x: 1678,
					y: 353
				},
				path: "M1567.658,457.846c9.312-8.617,19.962-15.341,24.114-28.446 c4.435,0.781,8.939,0.686,12.628,2.374c17.273,7.905,35.26,8.814,53.547,5.839c14.783-2.407,18.508-12.363,9.193-24.207 c-3.036-3.861-5.12-7.064-4.272-12.386c0.396-2.482-2.099-5.955-4.161-8.155c-2.181-2.325-5.406-3.669-7.578-6.083 c2.822-6.276,7.449-6.983,11.19-8.891c7.011-3.573,7.645-8.216,2.196-14.116c-2.035-2.204-3.707-4.741-6.737-8.676 c5.043-0.451,7.894-0.529,10.68-0.993c4.886-0.813,9.847-1.483,14.567-2.905c6.553-1.973,9.204-6.651,9.091-13.672 c-0.12-7.462,1.244-8.547,8.138-10.074c9.359-2.072,11.83-6.011,10.358-15.49c-0.596-3.838-1.316-8.16-0.124-11.622 c1.061-3.076,4.222-6.379,7.264-7.651c11.02-4.608,20.438-11.933,30.879-17.26c6.566-3.349,15.232-3.11,22.984-3.288 c2.361-0.054,6.04,3.421,6.985,6.047c2.513,6.978,7.852,9.28,14.104,11.245c6.313,1.983,12.603,4.223,18.572,7.048 c4.781,2.263,9.018,5.615,10.595,12.396c-3.145,2.083-6.177,4.554-9.592,6.265c-9.531,4.775-17.087,11-20.56,21.721 c-2.134,6.587-7.758,10.412-13.888,13.59c-13.519,7.01-14.323,20.608-1.237,28.69c8.694,5.369,18.418,9.067,27.643,13.589 c1.36,0.667,2.512,1.756,5.018,3.55c-3.82,1.545-6.429,2.563-9.006,3.652c-5.196,2.195-10.676,3.923-15.481,6.78 c-5.501,3.271-9.896,7.615-9.392,15.205c0.168,2.539-1.608,5.586-3.289,7.797c-4.693,6.175-5.004,7.849,0.001,13.647 c3.942,4.567,7.446,9.202,7.827,16.486c-9.027,1.321-17.809,3.449-26.637,3.665c-9.155,0.223-16.942,2.568-23.803,8.512 c-10.585,9.172-22.053,16.851-34.687,23.16c-12.116,6.051-23.481,6.005-35.421,0.593c-3.919-1.776-7.988-3.267-12.083-4.594 c-7.296-2.364-14.419-2.149-21.128,2.067c-1.121,0.704-2.462,1.067-3.561,1.798c-11.936,7.948-23.066,3.354-33.494-2.941 c-3.219-1.943-5.739-6.618-6.667-10.499C1578.951,467.028,1579.247,466.957,1567.658,457.846z"
			}, {
				id: 33,
				name: "A4: Frimoandbada",
				connections: [14, 32, 34],
				short: 'A4F',
				flag: {
					x: 1839,
					y: 477
				},
				path: "M1705.98,495.008c10.188-7.748,19.696-14.897,29.111-22.168 c5.771-4.458,12.435-6.046,19.489-6.712c7.911-0.748,15.827-1.5,23.704-2.531c2.167-0.284,4.203-1.566,6.393-2.428 c-0.736-10.012-7.059-16.672-10.992-22.33c2.211-7.568,3.943-13.746,5.825-19.876c2.06-6.712,7.568-10.225,13.459-12.447 c8.69-3.277,17.913-5.137,26.626-8.364c11.469-4.248,23.18-5.067,35.238-4.948c4.445,0.043,9.196-1.634,13.315-3.575 c9.913-4.671,19.425-10.189,29.326-14.887c3.753-1.781,8.077-2.706,12.237-3.203c6.574-0.784,13.234-0.817,19.85-1.281 c7.426-0.52,17.327,5.094,20.483,11.804c1.836,3.903,3.925,7.735,5.281,11.806c2.587,7.76,4.444,15.771,7.232,23.451 c0.86,2.371,3.431,4.646,5.789,5.829c3.812,1.912,8.291,2.479,12.141,4.335c8.396,4.048,9.479,11.131,2.591,17.389 c-3.414,3.103-7.53,5.457-11.42,8.01c-6.18,4.055-10.288,9.006-10.101,17.069c0.157,6.733-3.249,11.923-9.014,15.7 c-7.806,5.114-15.854,9.347-24.734,12.618c-8.55,3.15-16.244,8.769-24.072,13.69c-9.271,5.829-18.034,12.506-27.517,17.943 c-4.446,2.549-10.118,4.434-15.144,4.24c-21.217-0.816-38.552,8.442-55.478,19.471c-11.406,7.433-22.512,15.639-34.737,21.414 c-12.513,5.911-26.132,9.593-39.455,13.635c-7.13,2.163-9.009,0.692-12.706-5.931c-6.346-11.369-6.13-22.103,2.576-32.293 c3.235-3.787,6.343-7.718,9.147-11.83c9.963-14.606,6.092-27.747-10.063-34.678C1715.254,501.738,1709.479,500.62,1705.98,495.008z"
			}, {
				id: 34,
				name: "A4: Gosolastan",
				connections: [15, 33, 35],
				short: 'A4G',
				flag: {
					x: 1962,
					y: 590
				},
				path: "M2163.882,581.559c19.683,12.721,30.573,30.827,33.771,54.791 c-7.975,0-15.752,0.112-23.523-0.042c-4.734-0.093-5.699-3.745-6.443-7.511c-0.852-4.316,2.102-9.372-2.833-12.92 c-7.33-5.27-14.595-11.185-24.015-11.223c-11.138-0.045-21.631-2.78-32.369-5.014c-10.358-2.154-20.688-2.284-31.166,2.336 c-8.972,3.957-19.135,5.175-28.721,7.785c-5.691,1.549-11.938,2.391-16.809,5.383c-16.127,9.907-33.6,15.966-51.918,19.736 c-23.953,4.929-46.652,13.207-68.425,24.21c-2.665,1.348-5.338,2.982-8.196,3.568c-3.045,0.625-6.826,1.231-9.4-0.004 c-12.842-6.161-26.642-8.278-40.441-10.279c-26.088-3.784-51.606-9.983-76.273-19.083c-15.998-5.902-30.35-15.153-42.272-27.614 c-2.887-3.016-4.983-6.788-7.674-10.535c1.821-1.339,2.733-2.522,3.842-2.751c27.836-5.74,52.79-17.474,75.417-34.723 c16.099-12.272,33.717-19.895,54.924-20.776c21.055-0.876,41.937-5.777,62.914-8.774c2.901-0.415,6.133-0.731,8.841,0.105 c9.588,2.96,19.005,1.812,28.605,0.239c5.19-0.851,10.733-1.406,15.846-0.521c13.311,2.306,26.678,2.513,39.668-0.296 c23.066-4.99,44.085,1.409,65.049,9.414c6.47,2.47,12.725,5.382,19.166,8.369c9.721,5.329,9.818,5.348,10.306,5.68 c13.342,7.515,17.885,9.742,19.683,12.721z"
			}, {
				id: 35,
				name: "A4: Hasaint",
				connections: [15, 34, 36],
				short: 'A4H',
				flag: {
					x: 2047,
					y: 688
				},
				path: "M2163.781,619.109c0,3.967-0.333,6.667,0.061,9.256 c1.383,9.108,3.668,10.879,13.151,11.044c6.581,0.114,13.159,0.358,20.171,0.556c0.432,3.141,1.355,5.474,0.934,7.531 c-2.683,13.145-6.368,25.818-17.283,34.994c-11.711,9.844-23.308,19.826-34.809,29.916c-2.961,2.599-5.771,5.555-7.972,8.807 c-12.116,17.918-29.096,29.241-49.495,34.925c-14.996,4.178-30.576,6.215-45.796,9.646c-7.716,1.739-15.454,3.87-22.73,6.905 c-5.81,2.425-11.052,3.571-17.269,1.75c-13.063-3.827-26.268-7.181-39.458-10.555c-15.114-3.867-30.448-2.938-45.592-0.719 c-10.81,1.584-21.313,5.169-32.091,7.08c-12.737,2.257-25.588,4.03-38.461,5.275c-5.001,0.484-10.196-1.047-15.193-1.648 c-1.199-10.218,3.637-15.216,10.898-18.287c6.728-2.846,13.93-4.636,20.491-7.791c9.542-4.587,19.325-9.103,27.88-15.222 c16.02-11.457,21.855-28.165,19.688-47.313c-0.675-5.965-4.23-11.604-6.841-18.357c0.635-0.519,1.909-2.021,3.529-2.815 c23.997-11.755,48.869-20.874,75.146-26.292c17.301-3.567,33.927-9.216,49.155-18.776c5.431-3.41,12.209-5.05,18.601-6.469 c11.329-2.514,22.686-4.228,33.442-9.354c7.905-3.766,16.971-1.894,25.413-0.037c10.361,2.278,20.495,5.446,31.349,5.061 C2150.099,607.887,2156.139,615.103,2163.781,619.109z"
			}, {
				id: 36,
				name: "B4: Aguime",
				connections: [16, 35, 37],
				short: 'B4A',
				flag: {
					x: 1970,
					y: 842
				},
				flagPos: {
					x: 1925,
					y: 797
				},
				path: "M2029.644,787.037c10.598,7.283,20.456,13.494,31.308,20.378 c6.433,4.081,13.73,6.774,20.32,10.637c7.586,4.448,10.866,11.533,7.629,19.542c-8.777,21.707-19.51,42.446-38.66,57.056 c-6.539,4.989-14.245,8.59-21.761,12.087c-3.098,1.441-7.101,1.24-10.693,1.26c-10.322,0.059-20.662-0.563-30.964-0.155 c-14.229,0.564-27.471,4.541-39.14,13.144c-11.224,8.275-23.896,14.077-37.736,14.4c-17.248,0.403-34.626-0.895-50.963-7.601 c-13.302-5.46-26.975-9.459-41.318-10.794c-4.611-0.429-9.424-0.952-13.904-0.13c-16.233,2.975-30.766-2.31-46.702-8.167 c2.181-2.343,3.41-4.126,5.054-5.354c7.74-5.779,15.955-10.462,25.156-13.919c14.342-5.389,27.79-12.631,38.981-23.628 c7.065-6.942,10.55-15.166,11.66-24.708c2.275-19.571,3.23-39.087-2.313-58.356c-0.254-0.885,0.091-1.942,0.212-3.727 c2.453-0.3,4.938-0.928,7.402-0.853c21.527,0.66,42.233-4.1,63.051-8.754c11.921-2.665,24.193-4.444,36.38-4.989 c7.753-0.347,15.778,1.757,23.44,3.708c20.581,5.242,46.874,12.893,60.541,17.568 C2026.836,785.754,2028.104,786.214,2029.644,787.037z"
			}, {
				id: 37,
				name: "B4: Bliclatan",
				connections: [16, 36, 38],
				short: 'B4B',
				flag: {
					x: 1900,
					y: 1000
				},
				flagPos: {
					x: 1790,
					y: 945
				},
				path: "M1749.941,911.344c14.464,3.354,27.67,6.455,40.902,9.44 c1.914,0.432,4.022,0.709,5.926,0.383c19.743-3.389,38.316,0.971,56.411,8.404c20.217,8.306,41.45,9.449,62.779,8.057 c11.416-0.745,21.838-6.094,31.171-12.605c24.609-17.17,51.31-18.138,79.18-11.093c5.793,1.464,11.389,3.708,17.187,5.146 c13.085,3.244,21.118,11.686,26.202,23.806c3.443,8.212,5.99,17.031,12.765,23.444c4.101,3.881,8.569,7.394,12.471,11.458 c3.419,3.563,6.861,7.337,9.253,11.601c4.328,7.709,1.936,18.013-5.611,24.279c-8.988,7.465-18.841,13.344-30.195,17.045 c-25.261,8.234-49.052,5.583-72.221-7.051c-17.591-9.593-36.661-13.801-56.672-13.194c-10.006,0.303-19.788,1.955-28.961,6.487 c-9.915,4.898-16.094,12.601-18.756,23.243c-0.726,2.9-1.534,5.788-2.098,8.723c-2.325,12.122-12.959,19.7-28.979,17.081 c-3.921-0.641-7.779-1.679-11.649-2.605c-0.961-0.229-1.929-1.186-2.769-1.048c-13.577,2.229-27.453-3.935-41.019,2.065 c-9.078,4.015-17.747,0.895-24.178-7.301c-3.056-3.895-5.866-7.98-8.891-11.9c-0.971-1.258-2.375-3.313-3.401-3.211 c-6.79,0.678-7.893-4.413-10.043-8.877c-4.031-8.363-8.646-16.447-12.57-24.857c-3.538-7.585-1.672-14.905,2.402-21.823 c1.18-2.004,2.68-3.893,3.469-6.04c5.231-14.249,3.831-17.747-4.43-24.94c-3.887-3.385-7.054-6.841-4.353-12.901 c1.072-2.406,0.637-6.132-0.421-8.724C1738.749,923.8,1742.324,916.676,1749.941,911.344z"
			}, {
				id: 38,
				name: "B4: Capepesk",
				connections: [17, 37, 39],
				short: 'B4C',
				flag: {
					x: 2088,
					y: 1176
				},
				path: "M1812.119,1149.665c-2.229-5.544-6.221-6.928-10.73-7.175 c-7.22-0.395-14.453-0.533-21.678-0.847c-4.816-0.21-9.829-1.132-11.666-6.032c-1.926-5.132-1.655-11.232,2.479-15.049 c8.354-7.707,10.364-17.193,11.004-27.861c0.231-3.863,2.599-8.523,5.504-11.135c11.812-10.616,24.359-20.062,41.972-15.089 c1.783,0.504,3.939,0.22,5.805-0.212c6.043-1.398,11.67-0.094,17.637,1.147c9.748,2.029,17.167,5.425,20.91,15.705 c1.341,3.683,6.32,6.444,10.175,8.719c7.08,4.181,14.435,7.96,21.924,11.358c3.534,1.604,7.621,2.561,11.501,2.718 c8.123,0.329,13.404,3.783,17.454,10.999c13.006,23.173,41.794,34.204,67.061,25.766c17.001-5.68,33.48-13.076,50.692-17.938 c20.445-5.773,41.317-10.229,62.213-14.143c13.238-2.479,26.57,0.172,39.357,4.194c18.763,5.901,36.99,12.928,53.041,24.865 c6.355,4.728,13.748,8.084,20.746,11.921c6.898,3.784,10.896,9.492,12.311,17.195c0.9,4.904,1.98,9.78,3.151,14.627 c1.534,6.35-0.148,11.937-4.106,16.807c-5.862,7.216-12.095,14.131-17.957,21.348c-6.037,7.434-14.014,11.819-22.338,16.223 c-14.144,7.48-27.528,9.328-43.604,4.425c-18.373-5.603-38.034-4.343-57.42-3.05c-17.011,1.135-33.745,2.702-50.091,7.782 c-2.007,0.624-5.504-0.333-7.015-1.849c-10.531-10.564-23.761-13.881-37.933-15.523c-11.871-1.378-23.72-3.165-35.464-5.385 c-11.55-2.182-22.115-7.065-31.855-13.685c-2.745-1.866-5.698-3.45-8.331-5.458c-12.864-9.814-27.322-7.81-40.885-3.657 c-13.218,4.048-23.713,0.688-33.19-7.415c-5.712-4.883-11.117-6.508-18.215-4.438c-5.307,1.547-10.155,1.033-14.585-3.518 c-3.381-3.473-8.408-5.271-12.25-8.376c-7.292-5.895-7.68-10.163-2.445-17.712 C1807.721,1156.422,1810.016,1152.835,1812.119,1149.665z"
			}, {
				id: 39,
				name: "B4: Dalomstates",
				connections: [17, 38, 40],
				short: 'B4D',
				flag: {
					x: 2138,
					y: 1361
				},
				path: "M2255.567,1329.104c1.423,4.343,2.133,9.104,4.39,12.961 c10.918,18.662,14.903,39.733,21.425,59.918c6.435,19.915,10.96,40.507,21.295,59.026c0.895,1.603,0.984,3.653,1.432,5.432 c-1.057,0.414-1.761,0.96-2.11,0.787c-30.558-15.083-62.96-25.136-95.428-34.998c-30.982-9.411-60.639-21.756-88.044-39.214 c-2.456-1.564-5.413-2.555-8.273-3.229c-5.782-1.364-11.94-1.567-17.44-3.606c-13.896-5.152-26.84,0.246-40.157,2.359 c-6.155,0.977-12.674,2.042-18.694,1.048c-15.73-2.6-31.279-6.303-46.893-9.599c-1.243-0.263-2.435-0.771-5.285-1.697 c2.953-3.256,4.922-6.178,7.579-8.188c4.443-3.36,5.79-7.518,5.968-12.927c0.412-12.556-2.854-23.83-11.057-33.265 c-6.054-6.962-6.21-14.412-3.428-22.359c4.176-11.928,11.087-22.232,21.57-29.271c9.046-6.073,18.585-11.814,28.635-15.921 c31.994-13.071,65.57-16.633,99.877-14.508c5.295,0.328,10.595,0.579,15.88,1.009c19.886,1.616,34.081,13.553,48.068,26.163 c8.136,7.336,16.723,14.232,25.554,20.72c10.607,7.795,19.398,17.063,26.584,28.066c2.236,3.424,5.68,6.058,8.57,9.052 C2255.578,1327.61,2255.572,1328.356,2255.567,1329.104z"
			}, {
				id: 40,
				name: "B4: Engthio",
				connections: [18, 39, 41],
				short: 'B4E',
				flag: {
					x: 2113,
					y: 1504
				},
				flagPos: {
					x: 2068,
					y: 1469
				},
				path: "M1879.616,1454.915c8.167-8.863,16.616-14.142,27.865-16.121 c15.346-2.701,28.453-10.994,40.343-20.927c7.11-5.938,9.431-14.725,10.667-23.104c1.146-7.776,5.345-10.174,11.743-10.668 c6.273-0.484,12.744-1.122,18.879-0.138c12.786,2.053,25.45,4.946,38.083,7.846c9.557,2.193,18.892,3.216,28.51,0.039 c5.649-1.867,11.618-2.948,17.528-3.774c3.877-0.542,7.959-0.385,11.855,0.146c7.548,1.028,15.054,2.426,22.527,3.919 c2.56,0.512,5.256,1.332,7.405,2.747c28.601,18.836,60.073,31.053,92.534,41.33c24.707,7.822,49.356,16.021,73.444,25.537 c13.796,5.45,26.427,13.854,39.568,20.956c6.109,3.302,7.849,8.482,6.722,15.129c-2.35,13.854-6.14,27.227-12.471,39.827 c-15.713,31.275-38.625,56.352-66.521,77.085c-21.216,15.769-44.403,28.042-68.566,38.649c-5.623,2.47-10.148,2.394-14.518-1.784 c-9.594-9.169-19.354-18.179-28.668-27.625c-18.445-18.705-35.752-38.637-55.174-56.246c-20.178-18.292-41.46-35.897-66.289-47.649 c-21.295-10.077-43.418-18.549-65.588-26.598c-23.663-8.592-45.306-20.681-66.089-34.577 C1882.089,1458.032,1881.158,1456.57,1879.616,1454.915z"
			}, {
				id: 41,
				name: "B4: Fradistaro",
				connections: [18, 40, 42],
				short: 'B4F',
				flag: {
					x: 1951,
					y: 1590
				},
				flagPos: {
					x: 1921,
					y: 1540
				},
				path: "M2167.219,1657.801c-4.531,1.848-7.734,3.312-11.045,4.479 c-57.036,20.121-115.632,33.419-175.751,40c-10.565,1.156-21.184,1.929-31.702,3.414c-6.898,0.976-11.413-1.167-14.467-7.432 c-2.912-5.976-6.729-11.527-9.451-17.579c-9.996-22.215-25.077-40.641-41.834-57.989c-22.393-23.183-41.194-48.861-52.223-79.512 c-2.352-6.536-3.651-13.465-5.235-20.259c-0.95-4.079,0.607-6.97,4.567-8.82c6.599-3.085,13.08-6.428,19.559-9.765 c1.695-0.873,3.196-2.121,5.495-3.678c-7.283-7.46-17.418-6.879-25.672-10.996c0.419-5.93,4.668-7.568,8.829-7.912 c10.892-0.896,18.608-6.457,24.681-15.022c1.15-1.624,2.379-3.232,3.795-4.621c5.001-4.908,6.65-4.838,12.972-1.125 c12.027,7.063,24.281,13.739,36.265,20.874c20.188,12.019,42.875,17.962,64.503,26.37c22.504,8.749,43.875,19.272,63.217,33.56 c23.026,17.01,45.131,35.104,64,56.928c12.615,14.59,25.96,28.572,39.434,42.383 C2152.838,1646.923,2159.691,1651.605,2167.219,1657.801z"
			}, {
				id: 42,
				name: "B4: Goima",
				connections: [19, 41, 43],
				short: 'B4G',
				flag: {
					x: 1735,
					y: 1605
				},
				path: "M1820.776,1516.792c3.412,22.492,11.34,41.294,21.778,59.323 c10.753,18.574,23.683,35.432,38.897,50.307c22.819,22.307,37.934,49.379,51.864,78.996c-3.395,0.785-6.362,1.874-9.39,2.089 c-6.964,0.491-13.96,0.53-20.94,0.803c-10.289,0.402-20.581,1.294-30.865,1.202c-64.756-0.577-128.969-5.231-190.33-28.368 c-34.333-12.946-67.664-28.104-96.974-50.618c-24.94-19.155-44.33-42.933-57.18-71.879c-3.779-8.516-5.48-17.201-3.458-26.227 c1.53-6.832,0.304-13.145-1.545-19.575c-3.261-11.345-1.06-18.045,8.987-24.534c14.922-9.636,31.697-13.365,48.713-9.051 c18.611,4.72,36.602,11.909,54.83,18.116c14.46,4.925,28.852,10.053,43.321,14.948c3.13,1.059,6.451,2.051,9.709,2.136 c10.152,0.268,18.894,3.405,27.884,8.516c9.048,5.143,19.863,6.489,30.87,5.71c10.875-0.769,21.885,0.236,32.83,0.629 c7.855,0.281,14.973-1.721,21.981-5.272C1807.289,1521.239,1813.383,1519.553,1820.776,1516.792z"
			}, {
				id: 43,
				name: "B4: Hranreka",
				connections: [19, 42, 44],
				short: 'B4H',
				flag: {
					x: 1416,
					y: 1454
				},
				path: "M1316.618,1408.138c9.034-11.027,16.963-13.85,28.658-9.275 c10.878,4.255,20.059,2.878,28.24-5.528c8.394-8.623,19.845-11.981,30.405-16.587c3.698-1.613,9.141-0.635,13.344,0.63 c7.703,2.317,15.143,4.049,23.359,2.918c14.7-2.023,28.072,5.729,33.358,19.55c2.928,7.652,4.493,15.849,6.387,23.866 c1.469,6.221,3.183,12.107,7.896,16.893c6.103,6.196,10.588,13.416,14.022,21.567c2.392,5.677,6.446,10.876,10.614,15.521 c4.426,4.928,5.955,10.268,5.095,16.483c-0.978,7.068-0.027,13.742,1.996,20.622c4.254,14.45,0.161,28.392-4.852,41.791 c-2.757,7.368-9.098,9.25-16.542,6.707c-1.867-0.639-3.82-1.456-5.31-2.7c-10.264-8.575-14.293-4.601-19.664,4.095 c-7.618,12.333-18.694,21.464-29.757,30.574c-10.643,8.766-22.416,6.968-34.17,3.853c-14.381-3.813-34.205-21.655-33.717-43.638 c0.476-21.432-4.995-40.732-20.422-56.605c-2.18-2.244-3.312-6.628-3.047-9.868c0.397-4.869-0.985-8.946-4.221-11.665 c-12.118-10.184-14.657-24.451-15.901-38.628c-0.878-10.013-4.225-17.857-11.097-24.707 C1319.492,1412.209,1318.091,1410.009,1316.618,1408.138z"
			}, {
				id: 44,
				name: "C4: Andgalbou",
				connections: [20, 43, 45],
				short: 'C4A',
				flag: {
					x: 1240,
					y: 1521
				},
				flagPos: {
					x: 1195,
					y: 1476
				},
				path: "M1067.564,1502.053c10.847-6.305,20.488-12.131,30.349-17.561 c6.653-3.665,11.537-8.739,15.265-15.311c12.986-22.889,31.936-37.905,58.047-43.231c9.921-2.022,18.588-6.248,26.987-12.18 c20.031-14.149,41.919-20.292,66.918-14.831c9.872,2.156,19.009,4.794,27.877,9.48c3.233,1.708,7.699,1.654,11.559,1.471 c5.09-0.242,8.681,1.479,12.325,5.017c8.025,7.79,12.339,16.582,13.103,28.062c0.582,8.763,4.055,17.357,6.495,25.954 c0.517,1.818,1.807,3.754,3.304,4.896c6.373,4.857,10.979,9.906,9.134,19.155c-0.595,2.979,2.604,7.688,5.354,10.198 c14.496,13.235,17.827,30.775,19.179,48.892c0.638,8.552-0.038,17.307-1.077,25.853c-1.509,12.407,3.788,21.978,11.271,30.862 c7.979,9.474,8.383,27.784-0.027,36.445c-2.521,2.597-6.858,4.303-10.546,4.693c-5.893,0.625-12.001,0.289-17.908-0.482 c-25.284-3.299-50.334-1.863-75.541,1.581c-33.943,4.638-65.575-1.908-93.225-23.285c-6.419-4.962-11.856-10.908-13.974-18.974 c-2.475-9.424-8.977-14.994-16.683-20.181c-7.942-5.348-15.18-11.752-22.632-17.808c-1.523-1.237-3.245-2.779-3.833-4.531 c-3.846-11.46-13.55-16.967-22.922-22.62C1089.637,1533.53,1078.516,1518.441,1067.564,1502.053z"
			}, {
				id: 45,
				name: "C4: Bangne Casau",
				connections: [20, 44, 46],
				short: 'C4B',
				flag: {
					x: 1015,
					y: 1601
				},
				path: "M907.518,1520.873c8.067-3.4,15.657-6.663,23.299-9.799 c4.604-1.891,9.482-3.167,12.302-7.951c0.761-1.289,2.438-2.52,3.899-2.837c8.795-1.912,16.076-5.973,20.615-14.267 c13.085,3.976,25.856,3.713,38.877,2.223c14.416-1.649,28.544,0.662,42.076,6.153c9.888,4.012,17.8,10.538,23.527,19.412 c10.173,15.763,23.806,27.649,39.794,37.134c2.831,1.68,5.562,3.741,7.829,6.113c4.326,4.525,6.38,9.763,4.899,16.35 c-4.231,18.812-3.768,37.405,1.016,56.298c3.311,13.077,5.226,26.553,2.845,40.489c-2.667,15.616-10.508,27.015-23.409,35.465 c-13.643,8.936-28.912,13.619-44.817,15.902c-10.468,1.503-21.176,2.355-31.728,2.003c-14.025-0.468-26.55-5.932-37.05-15.424 c-7.514-6.793-15.773-11.881-25.677-14.704c-22.921-6.534-36.358-22.09-41.901-45.114c-2.901-12.054-4.703-24.145-4.568-36.533 c0.25-23.028-2.676-45.79-6.116-68.481c-0.789-5.202-3.021-10.177-4.44-15.298C908.199,1525.876,907.996,1523.636,907.518,1520.873 z"
			}, {
				id: 46,
				name: "C4: Cagalpo",
				connections: [21, 45, 47],
				short: 'C4C',
				flag: {
					x: 808,
					y: 1586
				},
				flagPos: {
					x: 778,
					y: 1536
				},
				path: "M769.657,1467.368c19.156,11.956,40.546,13.933,62.248,14.688 c6.628,0.23,13.271,0.711,19.852,1.523c16.373,2.022,28.934,11.057,39.94,22.596c1.498,1.571,1.977,4.124,2.897,6.234 c0.924,2.119,1.202,5.146,2.809,6.24c11.394,7.758,11.993,20.233,13.791,31.82c2.237,14.416,2.901,29.067,4.816,43.541 c1.876,14.174-2.664,27.058-7.549,39.712c-8,20.724-22.993,35.463-42.197,46.195c-10.083,5.634-20.674,8.903-32.375,8.424 c-13.989-0.573-27.729-2.401-41.418-5.519c-12.938-2.946-26.218-4.354-39.241-6.97c-6.785-1.362-13.349-3.837-19.994-5.87 c-4.617-1.413-6.072-4.491-5.121-9.211c4.024-19.95,5.104-40.125,5.561-60.46c0.267-11.84,3.045-23.674,5.231-35.409 c3.062-16.438,13.94-28.646,24.211-40.72c11.369-13.366,14.018-27.319,7.767-43.45c-1.507-3.886-2.18-8.097-3.236-12.157 C768.317,1468.175,768.987,1467.771,769.657,1467.368z"
			}, {
				id: 47,
				name: "C4: Denwana",
				connections: [21, 46, 48],
				short: 'C4D',
				flag: {
					x: 686,
					y: 1532
				},
				path: "M574.762,1582.372c-0.517-2.592-0.603-5.367-1.62-7.745 c-6.216-14.54-4.388-28.593,2.179-42.418c1.997-4.207,4.313-8.266,6.211-12.514c1.622-3.627,3.952-7.394,4.067-11.156 c0.453-14.793,9.392-23.311,21.485-28.518c15.136-6.52,24.429-19.199,35.003-30.555c2.188-2.35,2.907-6.622,3.184-10.097 c0.888-11.12,3.74-21.554,8.971-31.409c1.602-3.02,2.942-5.434,6.881-6.328c3.388-0.771,6.504-3.197,9.463-5.284 c3.713-2.616,7.05-2.985,10.94-0.267c13.38,9.356,27.525,17.175,42.837,23.154c22.473,8.776,32.613,28.166,39.988,49.455 c1.845,5.327,3.064,10.879,5.046,16.149c4.411,11.728,2.134,22.182-5.372,31.815c-3.474,4.459-6.773,9.079-10.525,13.293 c-12.369,13.893-17.877,30.46-21.57,48.449c-3.212,15.646-0.169,31.215-2.258,46.664c-1.77,13.085-1.621,26.498-6.04,39.854 c-2.288-0.445-4.219-0.575-5.976-1.199c-29.386-10.439-60.471-16.141-88.093-31.532c-1.048-0.584-2.542-0.37-3.829-0.527 l0.376,0.271c-0.5-0.764-0.821-1.835-1.527-2.247c-18.476-10.811-33.308-25.407-45.281-43.067c-0.927-1.366-2.994-1.96-4.53-2.913 C574.703,1583.009,574.699,1582.565,574.762,1582.372z"
			}, {
				id: 48,
				name: "C4: Eastkiabumi",
				connections: [22, 47, 49],
				short: 'C4E',
				flag: {
					x: 455,
					y: 1410
				},
				flagPos: {
					x: 410,
					y: 1365
				},
				path: "M465.165,1295.239c8.407,7.07,15.262,14.024,23.26,19.224 c7.692,4.999,16.246,9.207,24.991,11.937c15.513,4.843,29.224,12.118,41.771,22.543c16.294,13.54,35.268,21.157,56.857,21.081 c9.258-0.033,18.516-0.006,27.939-0.006c-0.833,6.964-1.728,13.719-2.429,20.493c-0.983,9.483,0.407,11.085,9.606,11.64 c1.296,0.077,2.584,0.278,4.563,0.499c-0.552,2.17-0.64,4.153-1.515,5.688c-4.899,8.6-6.988,18.034-7.58,27.685 c-0.391,6.372-3.065,10.867-6.718,15.967c-15.433,21.546-38.753,30.072-62.123,37.492c-43.166,13.706-87.443,23.198-132.25,29.851 c-37.884,5.626-74.894,0.378-111.282-10.6c-28.341-8.55-54.587-21.215-77.117-40.626c-7.959-6.857-14.793-15.021-22.091-22.537 c1.343-1.854,1.736-3.026,2.492-3.35c25.135-10.742,44.258-29.162,62.523-48.716c11.121-11.904,21.606-24.538,33.701-35.365 c17.922-16.043,39.975-25.105,62.827-31.61c24.511-6.977,47.835-16.298,69.292-30.131 C462.939,1295.716,464.315,1295.528,465.165,1295.239z"
			}, {
				id: 49,
				name: "C4: Francedian",
				connections: [22, 48, 50],
				short: 'C4F',
				flag: {
					x: 304,
					y: 1318
				},
				path: "M464.345,1289.372c-5.585,3.745-10.626,7.402-15.929,10.632 c-18.344,11.171-38.538,17.732-58.983,23.82c-22.771,6.782-44.833,15.719-62.743,31.691c-12.353,11.019-22.96,24.003-34.264,36.187 c-13.142,14.163-26.696,27.842-42.834,38.692c-19.357,13.015-21.223,12.695-34.078-6.711 c-25.689-38.784-41.478-81.595-51.359-126.778c-1.676-7.663-2.94-15.416-4.559-23.994c17.574-1.094,32.392-6.71,46.289-14.648 c9.8-5.599,19.471-11.538,28.631-18.116c14.182-10.184,29.15-18.447,46.087-23.066c20.533-5.599,40.989-11.578,62.516-11.669 c3.913-0.017,8.174,0.26,11.677,1.778c8.471,3.674,17.259,4.815,26.277,4.798c6.994-0.014,12.984,1.794,17.976,7.016 c2.242,2.346,5.392,3.803,8.022,5.805c2.077,1.582,4.899,2.996,5.813,5.151c3.763,8.878,11.2,13.305,19.561,15.707 c11.991,3.443,19.49,10.779,23.59,22.264C458.479,1274.771,461.274,1281.484,464.345,1289.372z"
			}, {
				id: 50,
				name: "C4: Guayla",
				connections: [23, 49, 51],
				short: 'C4G',
				flag: {
					x: 257,
					y: 1182
				},
				flagPos: {
					x: 217,
					y: 1099
				},
				path: "M154.426,1109.753c22.191,1.458,37.487-9.146,52.342-20.606 c5.253-4.052,10.062-8.681,15.051-13.073c10.41-9.162,22.799-13.472,36.395-14.462c17.479-1.271,34.35-0.41,49.853,9.942 c6.416,4.284,14.738,5.76,22.253,8.339c4.931,1.691,9.97,3.07,14.471,4.441c-0.849,8.412-2.197,15.592-2.172,22.766 c0.059,17.002,7.821,30.353,22.456,38.55c10.509,5.886,15.142,15.291,19.704,25.267c1.855,4.057,0.492,6.694-3.003,9.28 c-6.134,4.537-11.889,9.587-17.807,14.415c-5.604,4.572-11.983,6.664-19.252,7.119c-36.599,2.288-71.523,10.835-103.831,28.699 c-2.302,1.272-4.354,3.025-6.438,4.66c-15.534,12.188-32.108,22.621-50.767,29.336c-5.914,2.129-12.088,3.617-18.238,4.968 c-4.302,0.945-6.573-1.007-7.391-5.69c-4.115-23.558-8.855-47.01-12.673-70.612c-1.141-7.054-0.698-14.563,0.21-21.713 C148.173,1151.021,151.371,1130.739,154.426,1109.753z"
			}, {
				id: 51,
				name: "C4: Hoguay",
				connections: [23, 50, 52],
				short: 'C4H',
				flag: {
					x: 267,
					y: 1011
				},
				path: "M347.741,1080.691c-15.254-3.155-29.04-6.153-41.745-13.33 c-29.12-16.448-66.563-11.797-91.594,10.867c-11.882,10.76-24.251,20.806-39.725,26.097c-5.998,2.049-12.019,3.669-18.204-0.386 c4.273-29.393,14.931-55.956,31.037-80.412c5.854-8.889,11.728-17.778,17.966-26.397c11.465-15.841,18.313-33.726,24.78-51.988 c4.072-11.498,9.819-22.491,15.688-33.234c4.091-7.489,9.364-8.637,16.755-3.835c6.903,4.486,13.759,9.549,19.227,15.626 c9.522,10.586,19.856,19.522,33.42,24.417c3.079,1.111,5.932,2.987,8.695,4.805c7.468,4.91,14.884,9.902,22.203,15.029 c2.126,1.489,4.411,3.22,5.672,5.393c4.985,8.587,12.721,12.001,21.905,10.511c13.349-2.166,27.148-3.077,39.255-10.226 c1.103-0.651,2.429-0.924,5.2-1.942c-0.395,3.303-0.025,5.965-1.056,7.867c-5.18,9.558-7.023,20.012-8.807,30.5 c-2.113,12.428-8.125,22.346-18.567,29.521c-2.192,1.507-4.24,3.226-6.445,4.711 C369.244,1053.827,355.791,1064.072,347.741,1080.691z"
			}, {
				id: 52,
				name: "D4: Arasruhana",
				connections: [24, 51, 53],
				short: 'D4A',
				flag: {
					x: 429,
					y: 851
				},
				flagPos: {
					x: 384,
					y: 806
				},
				path: "M509.573,929.477c-7.913-6.705-14.839-12.574-21.926-18.579 c-2.778,2.345-4.435,3.932-6.276,5.263c-5.698,4.119-10.281,9.054-17.953,11.254c-7.014,2.01-12.476,9.479-18.586,14.586 c-4.282,3.579-8.505,7.23-12.752,10.851c-2.003,1.708-4.985,3.033-5.842,5.198c-5.22,13.186-18.351,13.707-28.823,17.925 c-6.954,2.801-15.009,2.734-22.406,4.608c-7.935,2.009-14.033-1.062-18.406-6.801c-3.798-4.984-8.494-8.146-13.635-11.28 c-5.933-3.618-11.385-8.016-17.164-11.897c-3.005-2.019-6.208-3.769-9.426-5.438c-3.793-1.967-7.699-3.715-13.035-6.265 c3.219-1.625,5.02-2.68,6.928-3.474c9.651-4.016,18.077-9.583,25.068-17.559c8.721-9.95,10.616-21.153,7.538-33.532 c-3.084-12.407-10.236-22.221-19.875-30.415c-5.316-4.52-10.745-8.962-15.635-13.921c-15.436-15.655-6.961-44.233,14.482-50.042 c8.303-2.25,16.549-4.966,24.479-8.288c15.293-6.406,31.095-6.16,47.132-5.03c8.931,0.629,17.949,1.331,26.85,0.769 c15.083-0.953,29.075,1.59,42.232,9.215c6.604,3.827,13.583,7.036,20.521,10.244c2.663,1.231,5.745,2.523,8.536,2.332 c9.301-0.639,11.594,6.14,14.438,12.573c3.091,6.994,3.104,13.587-2.621,19.347c-1.635,1.646-4.006,2.755-5.144,4.649 c-1.631,2.715-3.955,6.305-3.315,8.852c1.911,7.607,5.164,14.872,7.799,22.304c1.08,3.045,3.154,6.418,2.606,9.217 c-1.085,5.53,0.816,9.671,3.468,14.013c2.247,3.68,4.323,7.485,6.197,11.369c3.392,7.026,4.312,13.924-1.379,20.476 C512.198,923.67,511.455,925.953,509.573,929.477z"
			}, {
				id: 53,
				name: "D4: Basainti",
				connections: [24, 52, 54],
				short: 'D4B',
				flag: {
					x: 300,
					y: 718
				},
				path: "M163.872,764.729c-7.181-4.726-14.166-9.785-21.582-14.105 c-14.985-8.729-26.67-20.955-36.755-34.68c-3.638-4.951-5.859-11.179-7.738-17.135c-3.2-10.139-5.622-20.525-8.364-30.809 c-3.592-13.472,1.39-25.231,13.542-31.959c11.61-6.428,24.1-7.195,36.819-5.157c8.189,1.313,16.171,4.243,24.382,5.028 c13.873,1.326,27.872,1.291,41.781,2.329c4.818,0.359,9.971,1.353,14.192,3.552c9.976,5.198,19.516,11.242,29.145,17.087 c1.344,0.816,2.375,2.328,3.248,3.708c4.493,7.104,11.175,8.257,18.361,5.946c10.415-3.35,20.743-7.083,30.807-11.361 c5.49-2.334,10.351-3.642,16.158-1.141c7.946,3.422,16.251,2.836,24.424,0.501c5.43-1.551,10.735-3.557,16.196-4.974 c8.679-2.252,17.421-3.625,26.505-2.242c11.104,1.691,22.289,2.854,35.122,4.455c-3.916,3.401-6.618,5.642-9.203,8.011 c-16.728,15.331-16.057,35.257,1.357,49.836c8.202,6.867,18.056,10.196,27.94,12.659c11.863,2.957,18.064,10.353,21.447,21.232 c0.789,2.538,1.762,5.029,2.392,7.604c3.285,13.426,9.715,24.545,21.848,32.067c3.693,2.29,6.501,6.008,9.715,9.072 c-0.396,0.722-0.792,1.444-1.188,2.167c-3.044-0.628-6.304-0.764-9.092-1.981c-7.306-3.19-14.724-6.327-21.525-10.434 c-14.999-9.056-31.102-10.869-48.063-9.048c-3.903,0.419-7.896,0.095-11.844-0.01c-13.565-0.359-27.138-1.196-40.69-0.947 c-5.142,0.094-10.475,2.087-15.317,4.16c-37.506,16.051-76.019,17.022-115.388,8.73c-20.272-4.27-40.024-9.852-58.736-18.89 c-2.588-1.25-5.629-1.562-8.46-2.309C164.792,765.427,164.313,765.105,163.872,764.729z"
			}, {
				id: 54,
				name: "D4: Camehermenle",
				connections: [25, 53, 55],
				short: 'D4C',
				flag: {
					x: 415,
					y: 600
				},
				path: "M527.447,589.286c3.196,1.946,6.236,4.246,9.631,5.738 c3.335,1.464,7.622,1.895,7.771,6.455c0.139,4.238-2.164,7.634-6.153,9.522c-7.321,3.464-13.463,8.089-18.239,14.913 c-4.029,5.755-10.499,7.656-17.543,7.864c-15.351,0.452-29.314,4.996-41.41,14.748c-2.064,1.664-4.507,2.857-6.563,4.528 c-4.032,3.279-7.686,3.212-12.777,1.401c-7.363-2.619-15.387-3.611-23.216-4.63c-8.872-1.154-18.002-0.756-26.729-2.496 c-14.199-2.83-27.741-1.127-41.258,3.131c-4.749,1.496-9.497,3.405-14.377,3.957c-5.115,0.578-10.703,0.778-15.521-0.695 c-7.775-2.378-14.506-2.313-22.048,1.315c-8.932,4.296-18.584,7.147-28.034,10.299c-6.55,2.184-12.135,1.153-16.722-4.996 c-2.201-2.95-6.089-4.895-9.554-6.602c-11.374-5.605-13.646-11.144-7.668-22.214c6.551-12.132,16.368-21.234,29.601-25.25 c11.914-3.615,20.622-10.469,26.632-21.005c3.959-6.939,9.754-11.378,16.737-15.055c13.798-7.266,27.021-15.541,42.117-20.241 c16.443-5.12,32.881-6.893,50.112-4.92c16.573,1.897,33.087,3.386,48.385,10.603c8.707,4.108,17.234,8.601,25.791,13.019 c12.005,6.2,23.45,13.678,37.492,14.918c2.373,0.209,4.522,2.417,6.878,3.471c2.254,1.009,4.642,1.719,6.959,2.547 C527.73,589.597,527.447,589.286,527.447,589.286z"
			}, {
				id: 55,
				name: "D4: Dabiala",
				connections: [25, 54, 56],
				short: 'D4D',
				flag: {
					x: 398,
					y: 465
				},
				flagPos: {
					x: 370,
					y: 442
				},
				path: "M569.454,474.85c-7.942,10.689-15.522,21.465-23.769,31.705 c-3.259,4.046-7.777,7.223-12.117,10.223c-7.648,5.285-15.975,9.649-23.288,15.337c-4.546,3.537-8.296,8.453-11.411,13.378 c-3.469,5.485-2.394,11.149,1.151,16.809c2.882,4.601,4.531,9.976,5.892,15.854c-10.339-3.11-19.616-7.561-28.749-12.442 c-8.789-4.697-17.608-9.408-26.719-13.417c-18.92-8.325-39.144-9.937-59.491-10.554c-23.256-0.706-45.182-7.201-66.495-15.871 c-3.715-1.511-7.182-4.969-9.459-8.396c-4.561-6.866-10.569-11.553-17.38-16.019c-9.109-5.974-17.655-12.927-25.863-20.122 c-9.596-8.412-14.364-19.736-17.036-32.035c-1.378-6.343-0.02-11.731,4.547-16.486c5.822-6.061,12.033-11.298,20.116-14.312 c5.25-1.958,10.09-5.032,15.072-7.686c9.667-5.149,19.184-10.594,28.983-15.473c12.241-6.095,24.77-2.753,37.059,0.025 c5.461,1.234,10.682,3.624,15.929,5.698c17.573,6.949,35.585,10.929,54.606,8.461c12.671-1.644,23.936,2.169,33.296,10.3 c18.325,15.921,39.043,27.439,61.505,36.311C540.532,461.942,554.905,468.575,569.454,474.85z"
			}, {
				id: 56,
				name: "D4: Enggreboka",
				connections: [26, 55, 57],
				short: 'D4E',
				flag: {
					x: 507,
					y: 361
				},
				flagPos: {
					x: 462,
					y: 316
				},
				path: "M403.272,247.721c13.972,0.837,27.608,1.232,41.149,2.581 c14.505,1.445,27.355,7.246,39.338,15.746c15.157,10.752,31.008,20.524,46.518,30.784c3.042,2.012,6.283,3.944,8.759,6.551 c10.352,10.903,23.418,16.024,37.813,18.571c5.233,0.925,10.502,1.711,15.673,2.914c12.583,2.926,21.826,9.798,24.676,23.008 c2.214,10.264,9.163,16.869,16.91,22.646c5.21,3.886,7.891,8.502,9.085,14.73c1.045,5.447,3.41,10.63,4.641,16.054 c0.771,3.4,1.678,7.469,0.537,10.486c-5.646,14.928-12.019,29.584-22.502,41.944c-13.94,16.436-32.317,20.031-52.458,17.232 c-6.482-0.9-12.893-3.183-19.011-5.643c-10.787-4.336-21.193-9.623-31.992-13.924c-20.923-8.334-39.68-19.97-56.947-34.425 c-5.727-4.793-13.024-7.928-19.967-11c-10.933-4.838-22.12-9.123-33.3-13.377c-10.444-3.974-17.388-11.173-19.921-21.949 c-2.397-10.198-6.837-18.556-16.258-23.875c-2.865-1.617-5.198-4.146-7.931-6.029c-14.917-10.283-21.31-25.245-22.439-42.562 c-0.646-9.922-0.063-19.973,0.638-29.918c0.704-9.998,8.311-16.926,19.535-17.967C378.38,249.135,390.997,248.541,403.272,247.721z"
			}, {
				id: 57,
				name: "D4: Finnited",
				connections: [26, 56, 58],
				short: 'D4F',
				flag: {
					x: 723,
					y: 311
				},
				path: "M838.143,394.925c4.941,1.524,8.354,2.578,12.418,3.833 c-0.964,1.621-1.342,3.248-2.242,3.623c-10.589,4.412-17.522,13.517-26.236,20.313c-2.578,2.01-4.815,4.667-6.623,7.413 c-4.887,7.42-11.964,10.212-20.409,10.316c-10.5,0.13-21.117,2.546-31.352-2.187c-9.623-4.45-19.428-8.504-29.117-12.813 c-1.181-0.525-2.42-1.347-3.161-2.372c-8.784-12.153-23.203-14.871-35.437-21.221c-1.419-0.736-3.366-1.439-4.772-1.06 c-11.493,3.101-24.071-0.944-35.055,5.345c-0.235,0.135-0.641-0.028-1.704-0.107c-3.838-6.332-8.437-12.51-8.59-21.079 c-0.116-6.484-2.823-12.308-8.696-16.015c-10.061-6.349-15.788-15.451-19.071-26.882c-1.57-5.464-5.995-10.109-9.458-15.657 c7.45-7.815,10.241-17.89,12.475-28.476c1.979-9.379,4.975-18.639,8.48-27.576c4.788-12.205,13.071-21.272,25.677-26.368 c7.665-3.099,14.937-7.287,22.11-11.458c13.467-7.831,27.943-12.659,43.369-13.648c14.783-0.948,28.172,4.278,39.857,13.078 c6.063,4.566,11.379,10.212,16.606,15.772c4.376,4.654,5.091,10.253,3.757,16.708c-1.534,7.42-2.001,15.102-2.38,22.698 c-0.141,2.825,0.36,6.623,2.138,8.446c10.57,10.842,12.47,25.432,17.528,38.646c0.593,1.55,0.941,3.193,1.489,4.763 c1.544,4.426,4.17,7.854,9.319,7.411c5.126-0.442,7.232,2.49,8.558,6.563c0.915,2.813,1.154,5.903,2.391,8.542 c1.93,4.117,3.493,9.562,6.908,11.599C835.508,378.202,840.737,384.233,838.143,394.925z"
			}, {
				id: 58,
				name: "D4: Guayre Bhugera",
				connections: [27, 57, 59],
				short: 'D4G',
				flag: {
					x: 878,
					y: 252
				},
				path: "M931.39,167.331c4.353,3.305,8.737,6.572,13.046,9.933 c2.078,1.619,4.653,3.044,5.913,5.195c7.895,13.488,15.202,26.995,15.57,43.498c0.353,15.856,2.32,31.701,4.173,47.481 c0.436,3.72,3.009,7.309,5.034,10.698c4.718,7.899,7.334,15.707,5.813,25.477c-1.58,10.151,0.174,20.625,6.172,29.599 c3.116,4.662,4.193,8.469-0.193,13.295c-2.142,2.356-2.767,6.527-3.13,9.977c-0.934,8.887-2.257,16.935-12.453,20.496 c-3.414,1.193-6.841,4.635-8.529,7.935c-2.387,4.668-5.617,6.466-10.289,5.965c-9.069-0.972-17.777-0.259-26.495,2.817 c-3.141,1.108-7.252,0.247-10.728-0.554c-5.159-1.19-10.101-3.29-15.223-4.683c-3.157-0.859-6.841-2.296-9.647-1.42 c-6.396,1.996-11.644-0.317-17.329-2.247c-6.602-2.242-11.193-6.227-15.35-11.893c-4.629-6.312-10.645-11.707-16.537-16.963 c-4.41-3.935-9.717-6.128-15.743-1.605c-1.842-3.479-3.558-6.222-4.794-9.166c-2.147-5.114-3.973-9.636-11.41-8.273 c-1.806,0.331-5.494-4.269-6.74-7.258c-3.313-7.944-5.705-16.268-8.579-24.399c-2.089-5.91-3.942-11.74-9.18-16.203 c-2.281-1.944-3.518-6.717-3.117-9.943c2.281-18.353,2.751-36.951,10.621-54.43c6.065-13.471,15.461-23.95,25.816-33.691 c8.896-8.369,18.119-16.801,30.854-19.31c0.973-0.192,1.933-0.893,2.855-0.818c10.1,0.822,17.049-5.501,25.089-10.075 c13.13-7.468,27.29-10.169,41.993-3.427c4.073,1.868,8.528,2.902,12.796,4.307C931.656,167.633,931.39,167.331,931.39,167.331z"
			}, {
				id: 59,
				name: "D4: Honbo",
				connections: [27, 28, 58],
				short: 'D4H',
				flag: {
					x: 1042,
					y: 302
				},
				path: "M1124.881,386.18c-11.552,5.554-21.614,2.849-31.716,0.899 c-5.513-1.065-11.125-1.62-16.64-2.678c-3.207-0.616-6.582-1.266-9.411-2.78c-9.042-4.837-17.827-10.156-26.809-15.11 c-1.625-0.896-4.087-1.832-5.523-1.229c-4.906,2.061-8.459-0.14-11.818-2.975c-4.811-4.059-10.13-6.474-16.472-5.519 c-4.066,0.612-6.202-1.424-7.941-4.568c-3.376-6.106-6.665-12.265-10.237-18.255c-4.509-7.561-5.615-15.828-3.832-24.075 c1.904-8.814,0.434-16.922-4.337-23.869c-6.356-9.256-8.591-19.207-8.725-30.073c-0.085-6.894-0.609-13.783-0.957-21.092 c1.83-0.25,3.432-0.687,5.023-0.652c16.658,0.365,29.747-6.997,39.659-19.643c11.709-14.938,26.72-18.907,44.393-15.162 c7.108,1.506,14.237,3.503,20.897,6.349c5.901,2.522,6.909,5.637,3.693,11.177c-7.91,13.63-4.069,25.371,4.283,37.042 c3.23,4.514,5.53,9.725,8.001,14.743c2.646,5.37,4.346,11.314,7.605,16.25c6.774,10.258,7.447,21.282,4.843,32.552 c-2.072,8.965,0.045,17.765-0.463,26.407c-0.766,12.98,4.104,22.097,12.135,31.045 C1122.947,377.658,1123.386,382.122,1124.881,386.18z"
			}];
		}
		else if (GuildFights.MapData.map['id'] === "waterfall_archipelago") {
			return [{
				id: 0,
				name: "X1X: Elleorus",
				connections: [ 1, 2, 3, 4, 5, 6],
				short: 'X1X',
				flag: {
					x: 1211,
					y: 941
				},
				path: "M1034.411,859.964c3.438,0.292,6.413,0.669,9.398,0.778c23.511,0.857,42.231-9.776,57.046-26.548c6.246-7.072,12.521-13.281,20.379-18.238c2.294-1.446,3.75-4.165,5.941-5.842c4.175-3.198,8.492-6.244,12.965-9.003c2.649-1.633,5.644-2.804,8.614-3.785c1.878-0.62,3.993-0.582,6.011-0.691c0.968-0.052,2.042,0.559,2.921,0.323c10.577-2.837,18.418,3.144,26.739,7.929c2.265,1.302,5.198,2.01,7.824,2.008c7.621-0.005,15.244-0.454,22.86-0.847c2.451-0.126,5.533,0.215,7.214-1.09c8.045-6.241,16.106-2.858,24.035-0.467c6.962,2.1,13.619,5.195,20.543,7.44c3.094,1.004,6.505,1.088,9.788,1.442c14.447,1.56,28.753,2.829,42.129-5.311c4.891-2.976,8.772-1.452,12.678,2.961c5.926,6.698,11.194,14.204,18.021,19.806c5.39,4.422,12.418,7.713,19.234,9.328c10.393,2.461,18.416,10.334,18.891,21.119c0.44,9.994,4.391,18.458,8.907,27.101c3.477,6.651,5.384,14.153,7.611,21.393c0.313,1.018-1.245,3.018-2.408,4.017c-6.147,5.28-13.213,9.714-18.478,15.737c-5.349,6.119-8.977,13.743-13.347,20.714c-0.518,0.826-0.802,1.864-1.472,2.519c-4.652,4.539-5.706,10.21-5.679,16.404c0.009,2.176-0.342,4.782-1.549,6.455c-3.467,4.807-7.705,9.057-11.174,13.862c-4.073,5.644-7.624,11.662-11.472,17.472c-0.998,1.507-2.043,3.111-3.432,4.21c-9.232,7.312-18.562,14.5-27.864,21.722c-0.524,0.407-1.228,0.653-1.617,1.153c-7.91,10.141-19.751,13.194-31.054,17.121c-7.595,2.64-15.311,4.939-23.014,7.253c-1.17,0.351-2.572-0.162-3.855-0.085c-5.024,0.3-10.195,0.028-15.032,1.159c-9.905,2.314-19.755,4.225-29.921,2.447c-8.691-1.521-17.382-3.098-25.978-5.068c-1.75-0.4-3.034-2.713-4.598-4.067c-1.964-1.702-3.994-3.331-6.006-4.979c-0.112-0.091-0.366-0.012-0.479-0.103c-8.272-6.735-18.522-5.199-28.034-6.941c-6.635-1.215-13.023-3.763-19.541-5.652c-8.518-2.471-17.079-4.798-25.553-7.408c-1.207-0.372-2.299-1.838-2.986-3.056c-3.163-5.601-6.928-10.535-12.992-13.293c-0.885-0.402-1.831-1.02-2.361-1.8c-5.049-7.427-13.348-9.277-20.876-12.616c-4.449-1.974-8.339-5.172-12.626-7.557c-4.171-2.321-8.384-4.694-12.837-6.348c-6.252-2.322-10.629-6.354-12.209-12.682c-1.922-7.698-2.722-15.683-4.768-23.34c-1.471-5.503-4.014-10.752-6.394-15.971c-2.67-5.858-5.9-11.469-8.376-17.401c-0.45-1.079,1.262-3.449,2.473-4.766c5.484-5.964,11.299-11.63,16.697-17.668c4.104-4.59,5.742-9.542,2.922-15.967c-3.668-8.356,0.08-13.7,9.135-14.554C1029.889,860.459,1032.364,860.178,1034.411,859.964z"
			}, {
				id: 1,
				name: "A2A: Flunnipia",
				connections: [ 0, 2, 6, 7, 8, 18],
				short: 'A2A',
				flag: {
					x: 1203,
					y: 705
				},
				path: "M1095.383,836.639c-5.839-6.917-11.237-12.933-16.154-19.319c-1.959-2.545-2.896-5.892-4.225-8.906c-5.192-11.779-12.873-21.895-22.834-29.746c-8.357-6.586-13.198-15.706-19.826-23.499c-8.914-10.481-17.385-21.353-25.717-32.308c-2.982-3.92-5.443-8.385-7.354-12.933c-2.424-5.768,1.342-15.438,6.836-19.55c3.562-2.666,7.067-5.411,10.542-8.19c5.422-4.335,11.696-7.996,15.984-13.265c6.821-8.382,16.233-13.347,23.985-20.436c7.446-6.808,16.106-11.589,26.964-10.621c7.745,0.69,15.236-0.157,21.675-5.417c1.402-1.146,3.729-1.151,5.621-1.71c4.517-1.334,9.02-2.719,13.546-4.02c2.971-0.853,6.003-1.498,8.955-2.407c9.656-2.971,19.37-5.785,28.907-9.103c10.76-3.744,21.218-5.724,32.996-3.859c7.507,1.188,15.816-2.42,23.717-4.105c4.035-0.861,7.905-2.536,11.952-3.298c8.416-1.584,15.104-5.985,21.758-11.177c11.43-8.918,24.737-7.835,36.931,0.175c11.492,7.549,19.291,18.509,28.691,27.977c2.246,2.263,3.004,5.931,4.979,8.551c3.354,4.449,7.015,8.685,10.758,12.818c5.92,6.535,12.346,12.452,20.567,16.128c1.216,0.543,2.164,2.087,2.839,3.375c5.225,9.966,9.954,20.218,15.681,29.882c2.711,4.576,7.096,8.239,11.027,11.998c10.088,9.645,20.378,19.078,30.521,28.666c4.033,3.812,4.596,8.879,1.381,13.311c-2.481,3.419-4.814,6.385-2.851,11.221c1.029,2.535-0.433,5.338-4.103,6.037c-7.461,1.419-14.896,3.008-22.284,4.771c-11.231,2.682-20.488,9.016-29.402,16.058c-4.652,3.676-9.657,6.924-14.631,10.17c-3.331,2.173-6.77,4.255-10.373,5.914c-3.649,1.681-7.558,2.804-11.362,4.143c-1.401,0.494-3.023,0.617-4.216,1.406c-11.456,7.585-24.126,5.495-36.74,5.216c-11.515-0.254-21.332-5.664-31.903-8.783c-4.755-1.403-9.479-3.24-14.343-3.821c-2.828-0.338-6.246,0.852-8.797,2.366c-4.801,2.85-9.59,2.543-14.84,2.187c-5.552-0.377-11.2,0.928-16.81,0.972c-2.77,0.021-5.753-0.698-8.284-1.858c-6.417-2.942-12.594-6.409-18.975-9.436c-0.979-0.464-2.534,0.426-3.828,0.455c-2.835,0.062-5.675-0.048-8.513-0.045c-0.963,0-2.077-0.165-2.865,0.243c-7.766,4.009-16.71,6.805-22.869,12.565c-6.643,6.213-13.831,11.19-21.214,16.188c-1.676,1.134-2.733,3.21-4.007,4.902C1100.431,829.771,1098.034,833.054,1095.383,836.639z"
			}, {
				id: 2,
				name: "B2A: Achinata",
				connections: [ 0, 1, 3, 8, 9, 10],
				short: 'B2A',
				flag: {
					x: 1540,
					y: 856
				},
				path: "M1330.812,805.167c16.127-10.548,31.598-21.66,48.075-30.993c7.327-4.15,16.623-4.993,25.132-6.846c13.02-2.835,26.167-4.013,39.56-2.848c3.324,0.289,6.951-1.788,10.3-3.128c9.787-3.918,19.44-8.173,29.259-12.004c19.451-7.589,39.258-14.339,58.371-22.687c12.235-5.344,25.187-6.581,37.83-9.445c6.262-1.418,13.188-0.879,19.676-0.091c8.925,1.084,17.346,0.654,25.835-2.642c3.248-1.261,7.317-0.415,11.013-0.505c0.319-0.008,0.671,0.297,0.959,0.234c10.761-2.327,17.615,5.996,25.958,9.898c9.559,4.471,18.592,10.15,27.549,15.787c5.588,3.517,11.416,7.234,15.652,12.143c3.703,4.292,5.351,10.366,7.866,15.672c0.423,0.892,0.486,1.97,0.976,2.812c6.446,11.108,0.696,19.665-6.107,27.7c-4.926,5.818-6.914,12.743-9.075,19.719c-0.465,1.5-1.385,2.871-2.179,4.254c-1.883,3.282-3.778,6.559-5.739,9.793c-1.465,2.416-3.117,4.72-4.536,7.161c-0.636,1.093-1.317,2.416-1.268,3.604c0.198,4.751-2.425,6.11-6.564,6.021c-8.818-0.188-17.583-0.029-26.028,3.096c-5.416,2.004-10.658,3.61-14.097,9.229c-2.063,3.373-6.728,5.04-9.655,8.029c-2.886,2.945-6.234,6.262-7.277,10.002c-1.812,6.495-6.29,9.213-11.795,10.713c-3.633,0.99-6.479,2.272-8.129,5.751c-0.493,1.039-1.281,1.94-1.948,2.893c-5.01,7.155-10.271,11.75-20.657,10.745c-10.688-1.033-21.747,1.75-32.643,2.886c-5.443,0.568-10.891,1.759-16.321,1.674c-14.074-0.22-28.146-0.843-42.204-1.597c-8.794-0.471-17.553-1.557-26.339-2.209c-11.418-0.849-22.839-1.841-34.276-2.162c-4.959-0.139-9.964,1.223-14.943,1.942c-3.141,0.454-5.566,0.69-6.468-3.714c-1.732-8.461-4.665-16.555-9.671-23.791c-5.327-7.699-5.125-16.967-6.968-25.667c-2.011-9.501-7.939-16.039-17.18-18.488c-10.959-2.904-20.777-6.701-27.411-16.815c-3.216-4.901-8.148-8.669-12.25-13.001C1332.214,807.367,1331.569,806.22,1330.812,805.167z"
			}, {
				id: 3,
				name: "C2A: Enudran",
				connections: [ 0, 2, 4, 10, 11, 12],
				short: 'C2A',
				flag: {
					x: 1517,
					y: 1040
				},
				path: "M1310.597,1034.572c2.686-1.991,4.185-3.248,5.82-4.291c13.06-8.335,23.695-18.907,31.842-32.234c4.456-7.29,10.448-13.627,15.446-20.609c1.32-1.845,2.167-4.501,2.12-6.761c-0.134-6.392,1.414-11.73,5.537-16.952c3.828-4.848,5.702-11.187,9.158-16.39c6.646-10.005,15.688-17.9,26.37-22.963c5.885-2.79,13.307-3.44,19.98-3.237c14.908,0.453,29.789,1.943,44.664,3.208c11.094,0.943,22.148,2.938,33.246,3.149c21.057,0.401,42.033-1.293,62.805-5.04c12.293-2.216,22.838-0.144,32.081,9.614c13.741,14.505,24.187,31.195,35.064,47.708c3.77,5.723,9.433,10.171,13.499,15.736c3.935,5.382,6.994,11.415,10.241,17.271c0.387,0.698-0.218,2.243-0.787,3.121c-2.259,3.481-5.063,6.657-6.97,10.308c-3.888,7.44-7.588,15.008-10.755,22.772c-0.757,1.855,0.609,4.805,1.526,7.033c0.594,1.445,2.276,2.404,3.24,3.747c2.997,4.177,6.271,8.284,1.956,13.661c-1.198,1.493-1.721,3.589-2.329,5.48c-2.047,6.371-5.661,8.485-12.227,7.875c-3.173-0.295-6.64-0.051-9.643,0.945c-8.455,2.802-9.635,7.473-4.449,14.205c-1.745,3.007-3.908,5.675-4.919,8.726c-1.565,4.721-4.771,5.129-8.865,4.837c-4.622-0.329-9.31-0.756-13.883-0.297c-2.399,0.242-5.001,1.881-6.837,3.604c-3.926,3.682-7.413,7.83-11.44,12.177c-1.037-0.833-2.225-1.923-3.542-2.822c-4.353-2.971-8.898-5.115-14.448-3.798c-5.655,1.343-10.996,0.666-16.508-1.653c-10.437-4.392-21.142-5.538-32.608-3.099c-8.557,1.819-17.768,3.494-26.328-1.295c-0.809-0.452-1.977-0.596-2.906-0.442c-7.905,1.304-13.679-3.326-20.143-6.585c-5.219-2.631-11.135-4.286-16.67-5.907c-5.414-1.586-10.371,3.334-13.573,8.255c-2.85,4.377-4.559,4.686-7.591,0.441c-4.32-6.044-8.315-12.321-12.657-18.349c-1.431-1.986-3.224-4.064-5.339-5.145c-9.12-4.656-18.166-9.646-27.729-13.195c-9.607-3.565-19.438-5.959-27.985-12.339c-5.675-4.235-13.118-6.015-19.329-9.648C1319.891,1042.563,1315.727,1038.567,1310.597,1034.572z"
			}, {
				id: 4,
				name: "D2A: Zebbeasos",
				connections: [ 0, 3, 5, 12, 13, 14],
				short: 'D2A',
				flag: {
					x: 1218,
					y: 1175
				},
				path: "M999.682,1117.723c4.254-3.066,9.238-6.323,13.8-10.092c2.205-1.821,4.225-4.363,5.268-6.999c2.9-7.325,6.427-13.898,12.159-19.675c4.439-4.474,7.858-10.445,10.223-16.354c2.264-5.657,5.571-9.412,10.667-12.394c11.629-6.804,21.947-15.289,30.838-25.459c0.759-0.868,1.59-1.675,2.901-3.047c3.133,10.32,13.245,7.861,20.093,11.028c9.927,4.59,21.146,6.412,31.85,9.276c2.214,0.593,4.646,1.029,6.885,0.764c8.662-1.028,15.531,3.927,23.1,6.53c0.3,0.104,0.682,0.318,0.791,0.578c4.837,11.621,15.589,9.491,24.907,10.818c6.17,0.878,12.308,2.941,18.443,2.875c7.175-0.077,14.316-2.01,21.501-2.912c4.512-0.567,9.124-0.418,13.605-1.13c7.433-1.182,15.048-2.049,22.129-4.417c9.055-3.028,17.559-7.67,26.498-11.099c4.005-1.536,7.634-3.005,9.795-6.942c0.713-1.299,1.735-2.428,2.366-3.291c5.115,4.255,9.143,8.587,14.026,11.464c9.915,5.841,20.166,11.159,30.532,16.169c5.616,2.714,11.641,4.782,17.682,6.376c10.439,2.754,19.762,7.661,28.673,13.512c1.504,0.986,2.915,2.313,3.949,3.779c4.28,6.066,8.24,12.364,12.647,18.334c2.248,3.046,1.912,4.8-1.258,6.703c-3.808,2.285-7.424,4.896-11.063,7.45c-0.935,0.656-2.113,1.498-2.386,2.476c-1.757,6.313-5.911,12.156-2.886,19.388c1.653,3.951-0.409,7.411-3.837,9.882c-6.329,4.563-12.868,8.864-18.932,13.756c-7.295,5.886-14.815,11.474-17.418,21.595c-1.218,4.735-5.181,8.744-7.789,13.15c-1.938,3.273-4.012,6.523-5.462,10.019c-2.317,5.585-4.993,6.899-9.979,3.198c-8.155-6.055-16.656-4.979-25.591-2.692c-3.274,0.837-6.848,0.991-10.239,0.765c-3.981-0.268-6.554-0.141-9.43,3.944c-2.681,3.806-8.121,6.078-12.772,7.995c-8.499,3.502-17.431,5.946-25.956,9.393c-6.769,2.735-13.475,3.121-20.465,1.701c-0.809-0.164-1.665-0.29-2.479-0.212c-12.894,1.236-24.415-3.101-35.807-8.404c-2.526-1.177-6.172-1.908-8.603-0.99c-11.223,4.237-21.911,1.377-32.703-1.385c-7.853-2.009-15.619-4.548-23.586-5.876c-11.143-1.858-20.874-6.152-29.263-13.67c-1.207-1.081-2.695-2.057-4.224-2.535c-9.045-2.83-14.588-9.163-18.659-17.41c-1.3-2.633-3.737-4.989-6.188-6.712c-5.885-4.137-11.941-8.082-18.202-11.621c-7.167-4.052-14.635-7.571-21.959-11.349c-1.151-0.593-2.583-1.063-3.293-2.025C1016.226,1140.602,1007.982,1129.17,999.682,1117.723z"
			}, {
				id: 5,
				name: "E2A: Appatinaka",
				connections: [ 0, 4, 6, 14, 15, 16],
				short: 'E2A',
				flag: {
					x: 901,
					y: 1048
				},
				path: "M992.578,914.644c0.488,0.843,1.507,2.464,2.392,4.156c2.53,4.839,4.566,10.004,7.601,14.498c5.285,7.826,5.476,16.874,7.43,25.563c1.463,6.508,3.095,13.331,6.449,18.939c2.276,3.805,7.591,5.863,11.684,8.489c3.988,2.559,8.043,5.054,12.26,7.205c6.913,3.525,14.031,6.648,20.958,10.149c2.744,1.387,5.288,3.217,7.777,5.044c3.329,2.442,6.555,5.029,9.748,7.647c1.619,1.327,3.069,2.861,5.419,5.078c-5.626,5.158-10.691,10.063-16.038,14.64c-6.912,5.917-13.816,11.762-21.94,16.218c-3.333,1.828-5.125,6.579-7.446,10.114c-3.986,6.07-7.767,12.275-11.77,18.335c-2.81,4.256-7.24,7.981-8.502,12.61c-3.03,11.109-11.888,15.957-20.403,21.113c-4.542,2.75-10.142,3.695-15.106,5.822c-3.312,1.418-6.857,2.947-9.402,5.368c-5.385,5.123-11.737,7.571-18.722,9.574c-9.473,2.717-18.797,6.099-27.914,9.854c-5.715,2.354-10.685,6.628-16.476,8.637c-2.799,0.972-6.853-0.941-10.096-2.181c-3.635-1.39-6.849-3.933-10.518-5.168c-3.873-1.304-7.067-2.706-9.584-6.34c-2.273-3.283-6.897-4.836-7.177-9.785c-0.024-0.432-1.865-0.933-2.91-1.103c-4.12-0.674-8.26-1.224-12.391-1.833c-0.646-0.096-1.277-0.354-1.924-0.39c-6.382-0.355-12.773-0.574-19.146-1.043c-6.39-0.471-11.618-2.166-14.364-9.265c-1.22-3.154-5.438-5.534-8.791-7.354c-2.658-1.443-6.059-2.004-9.149-2.07c-7.504-0.162-12.387-4.416-17.44-9.255c-3.448-3.302-8.189-5.214-12.168-8.009c-4.438-3.117-8.813-6.356-12.95-9.857c-5.556-4.704-10.548-10.117-16.335-14.495c-10.352-7.831-21.258-14.927-31.625-22.739c-3.323-2.504-5.672-6.3-9.045-10.168c7.149-6.232,13.89-11.899,20.375-17.847c3.505-3.215,6.222-7.347,9.914-10.288c6.718-5.354,13.971-10.03,20.856-15.182c4.114-3.078,8.125-6.34,11.873-9.85c4.004-3.75,1.366-8.027,0.188-12.028c-0.397-1.349-1.476-2.498-2.243-3.738c0.516-0.006,1.031-0.013,1.546-0.02c0.479-2.628,0.748-5.32,1.515-7.862c0.477-1.578,1.537-3.079,2.644-4.345c1.828-2.09,3.838-4.037,5.892-5.913c6.143-5.608,12.3-11.203,18.573-16.663c0.862-0.75,2.426-1.029,3.642-0.978c4.607,0.19,9.292,1.333,13.792,0.799c13.142-1.562,26.214-3.717,39.296-5.757c1.93-0.302,3.916-0.973,5.612-1.938c7.51-4.273,15.782-4.645,24.084-5.197c4.082-0.271,8.123-1.145,12.186-1.721c1.314-0.186,2.829-0.788,3.93-0.364c11.145,4.286,22.73,1.37,34.077,2.131c13.25,0.888,26.569,1.072,39.854,0.994C978.96,916.837,985.343,915.495,992.578,914.644z"
			}, {
				id: 6,
				name: "F2A: Kracciarhia",
				connections: [ 0, 1, 5, 16, 17, 18],
				short: 'F2A',
				flag: {
					x: 904,
					y: 856
				},
				path: "M711.248,830.283c1.656-1.958,3.007-2.841,3.269-3.977c2.411-10.453,11.114-14.593,18.967-19.918c5.257-3.565,9.91-8.185,14.285-12.847c5.589-5.955,9.967-13.192,16.083-18.467c6.268-5.408,11.332-12.502,19.584-15.584c2.213-0.827,4.45-2.57,5.811-4.501c2.993-4.249,7.051-5.491,11.883-6.081c12.803-1.562,25.605-3.217,38.327-5.321c4.657-0.77,9.562-2.205,10.626-8.271c0.181-1.033,1.613-1.903,2.57-2.731c2.301-1.993,4.923-3.684,6.931-5.929c2.356-2.633,9.029-2.606,13.015,0.803c2.769,2.368,5.284,5.069,7.695,7.813c5.861,6.667,10.633,7.839,18.411,3.59c4.62-2.523,8.969-1.633,13.456-0.209c5.812,1.844,16.052-1.654,20.132-6.109c5.031-5.494,10.365-10.801,16.149-15.468c2.154-1.738,5.925-1.617,9.002-2.023c2.628-0.347,5.369-0.615,7.97-0.259c10.491,1.434,19.579-4.108,29.435-5.109c11.717,19.104,27.111,36.004,40.399,54.434c7.137,9.898,16.832,16.938,24.315,26.128c5.592,6.868,9.477,15.125,14.129,22.76c1.785,2.929,3.376,6.006,5.429,8.735c4.238,5.632,8.727,11.077,13.084,16.563c-10.602,11.062-23.874,15.512-37.221,19.306c-4.518,1.284-9.846-0.485-14.805-0.498c-5.137-0.013-10.328,0.029-15.401,0.73c-8.407,1.164-13.538,8.911-10.017,16.565c3.409,7.413,0.583,12.157-3.75,17.433c-5.921,7.208-11.721,14.592-20.354,18.625c-3.81,1.779-8.229,2.879-12.428,3.07c-9.63,0.437-19.295,0.226-28.944,0.091c-11.935-0.166-23.871-0.396-35.796-0.861c-3.921-0.153-7.813-1.1-11.713-1.725c-1.455-0.233-3.18-1.253-4.29-0.774c-9.197,3.967-19.104,1.763-28.523,3.549c-0.976,0.185-2.054,0.191-2.9,0.633c-10.379,5.416-21.544,7.262-33.099,8.071c-8.886,0.622-17.698,2.272-26.555,3.367c-3.394,0.419-5.501-0.688-7.257-4.23c-6.087-12.28-15.287-21.42-28.392-26.472c-5.375-2.072-10.334-5.221-14.771-7.512c0.374-2.763,0.729-5.352,1.073-7.942c0.107-0.813-0.123-1.904,0.322-2.4c4.542-5.067,0.853-10.412,0.547-15.606c-0.054-0.919-1.059-2.128-1.945-2.599c-9.371-4.977-19.122-9.321-28.115-14.895C721.811,840.471,716.794,835.026,711.248,830.283z"
			}, {
				id: 7,
				name: "A3A: Micianary",
				connections: [ 1, 8, 18, 19, 20, 36],
				short: 'A3A',
				flag: {
					x: 1175,
					y: 549
				},
				path: "M1375.19,513.114c-2.108,2.497-3.799,4.934-5.909,6.924c-9.642,9.094-19.575,17.885-29.052,27.144c-5.653,5.522-10.084,12.4-16.118,17.396c-5.634,4.662-12.497,7.97-19.12,11.268c-6.354,3.163-13.054,5.657-19.696,8.197c-1.716,0.656-3.907,0.876-5.676,0.452c-13.43-3.226-24.671,0.261-34.286,10.133c-1.955,2.008-5.015,3.295-7.8,4.078c-12.11,3.406-24.273,6.64-36.499,9.601c-2.583,0.625-5.622,0.29-8.253-0.379c-10.218-2.599-19.616,0.475-29.163,3.431c-11.851,3.669-23.832,6.913-35.729,10.436c-1.875,0.555-3.539,1.809-5.407,2.403c-3.544,1.127-7.171,1.994-10.755,3c-2.684,0.754-5.893,0.87-7.926,2.468c-5.638,4.431-11.944,5.282-18.737,5.316c-4.602,0.022-9.338,0.13-13.758,1.229c-3.447,0.857-4.928-0.648-5.556-3.045c-0.546-2.082-0.736-5.192,0.427-6.606c3.133-3.81,6.952-7.096,10.718-10.336c5.947-5.118,8.694-14.061,6.492-21.293c-0.509-1.673-0.438-3.593-0.31-5.376c0.422-5.898-2.144-9.17-7.49-11.281c-4.882-1.927-9.295-5.01-14.075-7.243c-2.912-1.361-6.119-2.098-9.207-3.073c-0.625-0.197-1.428-0.007-1.949-0.325c-10.321-6.318-22.685-3.555-33.543-7.591c-6.266-2.33-12.139-5.82-19.253-5.941c-1.599-0.027-3.945-3.494-4.525-5.744c-1.042-4.043-3.25-6.229-6.995-7.579c-6.384-2.302-12.663-4.896-19.021-7.27c-4.329-1.616-4.584-2.863-2.349-6.81c4.622-8.157,13.024-11.548,20.065-16.696c2.877-2.104,5.242-4.895,7.927-7.274c2.588-2.293,5.046-4.878,7.993-6.593c6.517-3.792,12.578-7.889,16.776-14.409c2.155-3.347,2.037-6.021-1.455-7.7c-6.42-3.087-12.867-6.145-19.439-8.886c-6.721-2.804-7.396-6.406-1.837-11.249c3.258-2.838,6.465-5.739,9.605-8.707c3.468-3.279,5.163-7.222,3.596-13.115c8.433,3.779,16.141,7.249,23.864,10.686c3.918,1.744,7.784,3.65,11.813,5.091c7.624,2.726,15.304,5.318,23.052,7.669c4.227,1.283,8.601,2.202,12.973,2.854c9.806,1.465,19.629,3.396,29.489,3.706c6.439,0.202,12.946-2.173,19.443-3.27c5.202-0.878,10.458-1.45,15.651-2.372c12.094-2.145,24.138-4.925,36.542-3.466c4.245,0.5,8.384,1.907,12.63,2.394c2.374,0.272,5.27,0.214,7.24-0.907c11.269-6.415,20.862-14.452,26.02-26.996c1.63-3.964,4.83-7.364,7.666-10.725c2.13-2.523,4.899-4.497,7.251-6.848c2.889-2.886,5.095-4.569,10.018-2.355c6.369,2.863,13.686,3.88,20.707,4.972c10.709,1.665,16.021,8.586,19.59,17.94c2.4,6.292,5.758,11.826,10.57,17.013c6.326,6.817,12.755,7.608,20.934,5.649c2.357-0.565,5.222,0.883,7.829,1.512c1.414,0.34,2.9,1.508,4.138,1.252c5.612-1.162,8.31,3.117,10.872,6.349c1.355,1.708,1.02,5.693,0.06,8.096c-1.689,4.227-1.549,6.495,2.48,8.448c1.924,0.932,4.257,1.079,6.087,2.132c2.896,1.668,5.735,3.567,8.208,5.8c2.321,2.097,1.953,4.413-0.164,6.952c-5.15,6.174-4.263,8.58,2.888,12.219C1369.064,507.546,1371.766,510.425,1375.19,513.114z"
			}, {
				id: 8,
				name: "A3B: Sheaggasia",
				connections: [ 1, 2, 7, 9, 20, 21],
				short: 'A3B',
				flag: {
					x: 1490,
					y: 653
				},
				path: "M1416.494,761.122c-0.189-2.105-0.688-4.524-0.533-6.901c0.12-1.854,0.902-3.721,1.662-5.465c0.912-2.092,2.465-3.953,3.118-6.103c1.606-5.285-0.163-9.32-4.352-13.124c-12.788-11.609-25.228-23.601-37.779-35.469c-0.957-0.905-1.949-1.894-2.548-3.041c-5.199-9.975-10.211-20.05-15.505-29.974c-1.918-3.595-4.108-6.724-8.713-8.191c-3.716-1.184-6.887-4.42-10-7.095c-9.655-8.298-15.691-19.538-23.601-29.228c-7.984-9.782-16.004-19.983-27.456-26.359c-1.294-0.721-2.521-1.562-3.78-2.347c0.229-0.546,0.459-1.093,0.688-1.639c5.582-2.291,11.093-4.779,16.761-6.833c11.98-4.342,21.93-10.909,29.555-21.609c5.128-7.194,12.146-13.115,18.691-19.206c8.208-7.637,16.796-14.864,25.188-22.242c5.245,2.438,10.846,5.258,16.64,7.603c1.737,0.704,4.146,0.534,6.018-0.015c7.131-2.086,14.082-4.829,21.272-6.644c3.954-0.998,8.346-1.26,12.356-0.647c2.373,0.363,4.865,2.706,6.483,4.794c6.701,8.653,10.331,9.396,17.92,7.858c11.213-2.272,22.635-3.661,34.027-4.84c8.333-0.862,15.181-4.098,21.347-9.631c7.142-6.407,14.646-12.41,22.056-18.644c8.688,1.982,14.792,8.054,21.387,13.165c5.626,4.36,10.736,9.379,16.218,13.937c1.12,0.932,2.83,1.364,4.334,1.583c4.227,0.614,8.491,0.953,12.731,1.482c3.942,0.493,6.057,3.016,8.398,6.166c2.643,3.554,6.53,6.523,10.45,8.72c9.917,5.558,20.177,10.5,30.252,15.775c3.37,1.764,6.66,3.697,9.88,5.722c6.813,4.287,7.676,8.448,2.549,16.515c-2.676,4.208-3.578,8.385-3.354,13.197c0.111,2.375,0.129,5.593-1.26,7.062c-7.787,8.233-10.588,19.084-15.719,28.682c-4.29,8.028-8.285,16.239-11.904,24.588c-1.681,3.875-1.364,8.704-3.343,12.345c-4.739,8.723-10.042,17.174-15.613,25.4c-4.734,6.99-10.146,13.524-15.301,20.226c-0.653,0.85-1.47,1.975-2.378,2.163c-7.281,1.509-14.626,2.716-21.905,4.238c-4.366,0.913-8.788,1.86-12.948,3.421c-16.927,6.349-33.736,13.005-50.638,19.423c-11.6,4.405-23.334,8.462-34.892,12.973c-3.816,1.49-7.211,4.029-10.91,5.863c-2.061,1.021-4.337,2.184-6.542,2.238C1435.728,761.259,1425.943,761.122,1416.494,761.122z"
			}, {
				id: 9,
				name: "B3A: Birrathan",
				connections: [ 2, 8, 10, 21, 22, 23],
				short: 'B3A',
				flag: {
					x: 1758,
					y: 742
				},
				path: "M1706.681,807.188c0.285-0.711,0.559-1.841,1.149-2.768c0.891-1.395,1.901-2.746,3.041-3.945c9.902-10.427,11.054-21.29,5.953-35.208c-6.457-17.624-20.521-25.413-34.974-33.678c-10.08-5.765-20.476-11.028-30.214-17.317c-4.82-3.112-9.589-2.893-14.681-3.765c-5.674-0.972-10.236-0.249-15.155,1.848c-1.946,0.829-4.155,1.41-6.257,1.448c-8.726,0.159-17.457,0.066-26.188,0.066c-0.229-0.555-0.46-1.109-0.689-1.665c1.138-1.437,2.366-2.811,3.4-4.318c9.747-14.185,22.353-26.864,27.945-43.284c3.97-11.66,9.356-22.538,14.043-33.786c2.921-7.012,6.58-13.716,9.971-20.688c5.957,2.765,11.242,6.123,17.013,7.673c7.775,2.088,16.08,4.399,23.869,3.642c8.471-0.824,16.446,1.624,24.489,1.146c8.248-0.49,16.577-2.841,24.441-5.601c6.948-2.438,13.505-3.672,20.86-2.416c6.59,1.125,13.469,0.514,20.083,1.543c5.903,0.919,11.681,2.849,17.409,4.66c12.274,3.882,18.162,14.192,24.584,24.215c3.813,5.955,9.286,10.823,13.417,16.606c5.487,7.685,10.362,15.807,15.573,23.692c1.084,1.64,2.181,3.689,3.795,4.489c7.006,3.472,10.694,9.131,13.354,16.328c2.095,5.669,6.228,10.554,8.833,16.08c1.32,2.799,1.492,6.227,1.756,9.405c0.175,2.104-0.896,4.35-0.567,6.397c1.283,8.002-1.907,14.522-6.482,20.537c-6,7.89-12.243,15.594-18.364,23.394c-0.799,1.021-1.996,2.068-2.14,3.212c-1.355,10.815-9.101,15.147-17.963,19.129c-7.767,3.489-14.953,8.27-22.402,12.469c-0.849,0.479-1.736,1.264-2.608,1.267c-10.917,0.036-21.885,0.575-32.74-0.273c-11.031-0.862-21.979-2.979-32.916-4.814C1727.271,811.225,1717.28,809.183,1706.681,807.188z"
			}, {
				id: 10,
				name: "B3B: Phiodeanet",
				connections: [ 2, 3, 9, 11, 23, 24],
				short: 'B3B',
				flag: {
					x: 1752,
					y: 934
				},
				path: "M1661.492,1001.191c-4.299-11.374-12.216-19.391-20.281-27.553c-4.908-4.968-7.842-11.832-12.034-17.574c-8.692-11.907-17.563-23.687-26.515-35.402c-2.598-3.398-5.713-6.4-8.544-9.532c4.01-5.252,8.04-10.665,12.259-15.925c0.714-0.89,2.253-1.101,3.386-1.673c3.668-1.852,7.627-3.321,10.874-5.742c1.987-1.483,3.189-4.313,4.19-6.764c1.695-4.154,3.178-7.875,7.928-10.026c3.579-1.62,7.082-4.763,9.106-8.136c2.819-4.697,7.005-6.822,11.586-7.68c8.598-1.608,17.354-2.518,26.084-3.232c6.094-0.499,8.328-1.988,9.442-7.887c0.172-0.913,0.607-1.807,1.068-2.626c1.502-2.665,3.11-5.268,4.603-7.938c1.601-2.864,3.155-5.754,4.654-8.671c1.221-2.378,2.858-4.708,3.363-7.247c0.735-3.696,2.453-6.08,6.188-5.679c8.202,0.881,16.366,2.142,24.528,3.368c7.521,1.13,15.015,2.451,22.532,3.619c2.613,0.406,5.395,0.183,7.867,0.973c10.621,3.393,21.411,1.183,32.114,1.184c3.967,0,6.973,0.771,9.518,4.075c2.208,2.866,5.236,5.083,7.712,7.763c6.981,7.557,13.548,15.528,20.877,22.724c7.295,7.162,15.214,13.707,23.066,20.273c3.997,3.342,8.469,6.113,12.68,9.207c0.771,0.566,1.367,1.402,1.959,2.178c2.768,3.623,5.178,7.589,8.338,10.823c3.773,3.86,4.296,7.605,0.035,10.936c-2.966,2.318-6.319,4.795-9.86,5.591c-8.372,1.881-14.327,5.98-16.292,14.537c-1.291,5.624-5.432,8.501-9.736,11.241c-7.22,4.597-7.801,12.998-2.78,19.978c6.931,9.636,12.972,19.95,18.865,30.274c2.512,4.4,0.424,7.402-4.651,8.481c-4.693,0.998-9.552,1.534-14.026,3.14c-3.213,1.153-6.362,3.303-8.735,5.78c-3.408,3.558-8.523,5.311-13.081,3.385c-10.343-4.371-21.1-6.465-32.348-5.908c-19.852,0.983-39.546-0.382-59.21-3.303c-11.303-1.678-22.775-2.186-34.156-3.372c-4.943-0.515-9.887-1.208-14.76-2.179C1669.396,994.694,1669.416,994.594,1661.492,1001.191z"
			}, {
				id: 11,
				name: "C3A: Ioppiorion",
				connections: [ 3, 10, 12, 24, 25, 26],
				short: 'C3A',
				flag: {
					x: 1732,
					y: 1143
				},
				path: "M1632.135,1079.119c8.908,1.178,12.771-1.531,15.508-9.937c0.563-1.728,1.238-3.439,2.063-5.056c3.384-6.626,2.822-10.606-2.418-16.22c-5.842-6.259-5.311-6.358-2.344-14.282c4.646-12.408,12.195-22.677,21.129-32.149c2.739-2.904,5.727-3.688,9.787-2.532c5.063,1.442,10.354,2.245,15.604,2.852c15.826,1.829,31.648,3.836,47.528,5.004c15.75,1.159,31.566,1.408,47.355,1.998c3.66,0.137,7.346-0.169,10.991,0.097c5.462,0.398,9.929,2.186,13.354,7.229c5.949,8.756,13.704,16.391,18.918,25.515c6.11,10.69,10.774,22.292,15.211,33.827c4.032,10.483,7.535,21.083,17.643,27.454c3.802,2.396,4.106,5.574,2.663,9.019c-2.55,6.091-5.505,12.014-8.338,17.984c-2.684,5.653-4.828,11.684-8.303,16.808c-4.039,5.957-9.06,11.308-14.058,16.536c-3.007,3.146-5.521,5.284-3.255,10.549c3.23,7.505,0.253,14.31-5.949,19.682c-4.113,3.56-7.512,7.94-11.276,11.909c-1.576,1.661-3.646,2.975-4.827,4.861c-1.653,2.638-3.36,5.558-3.836,8.549c-0.835,5.245-0.507,10.666-1.184,15.947c-0.24,1.88-1.687,3.864-3.102,5.283c-3.149,3.156-6.522,6.119-10.024,8.882c-1.328,1.046-3.221,1.667-4.931,1.88c-4.274,0.532-7.691,2.207-9.485,6.263c-2.118,4.781-6.146,6.429-10.848,7.774c-4.669,1.336-9.01,3.783-13.589,5.491c-2.127,0.793-4.752,1.888-6.679,1.298c-8.024-2.456-15.97-5.263-23.704-8.51c-1.787-0.751-3.443-3.636-3.757-5.745c-1.07-7.208-4.518-10.87-11.651-11.705c-5.164-0.604-8.766-2.637-11.357-8.047c-1.539-3.214-6.942-5.874-10.906-6.362c-8.323-1.025-16.875-0.94-25.271-0.383c-6.873,0.456-6.784,1.038-8.727-5.608c-2.907-9.947-7.231-19.714-8.437-29.856c-1.048-8.817-3.724-16.249-8.834-23.057c-1.42-1.893-3.521-3.66-5.692-4.531c-6.687-2.685-11.491-6.21-12.994-14.16c-1.526-8.07-5.119-15.293-14.407-18.02c-4.667-1.371-8.812-4.479-13.26-6.664c-2.439-1.197-5.413-1.621-7.445-3.262c-3.442-2.779-2.997-5.806,0.448-8.793c1.857-1.611,3.641-3.328,5.307-5.137c5.25-5.701,12.018-4.096,18.235-3.307c6.821,0.865,10.635-0.95,13.302-7.441c0.949-2.313,2.793-4.475,4.731-6.109c2.516-2.121,2.557-3.275-0.167-5.252c-3.935-2.854-3.632-6.543,0.787-8.294C1624.925,1080.091,1628.623,1079.838,1632.135,1079.119z"
			}, {
				id: 12,
				name: "C3B: Acyalyn",
				connections: [ 3, 4, 11, 13, 26, 27],
				short: 'C3B',
				flag: {
					x: 1498,
					y: 1250
				},
				path: "M1438.281,1097.553c1.126,0.586,2.561,0.844,3.015,1.652c2.203,3.924,5.538,4.092,9.429,3.618c1.25-0.152,2.706,0.834,3.977,1.481c6.652,3.391,12.602,8.954,21.071,6.639c0.581-0.159,1.375,0.005,1.936,0.286c10.211,5.124,20.474,2.905,30.983,0.885c9.264-1.78,18.721-0.698,27.342,3.243c6.216,2.841,12.2,3.508,18.841,2.479c3.03-0.471,6.741-0.004,9.408,1.419c4.46,2.378,8.169,6.126,12.497,8.807c3.987,2.471,8.363,4.313,12.586,6.398c2.225,1.1,4.394,2.706,6.748,3.078c6.819,1.076,10.023,6.19,13.389,11.169c0.784,1.161,1.218,2.716,1.354,4.135c0.842,8.741,5.493,14.441,13.733,17.1c2.984,0.963,4.849,2.488,6.542,5.257c3.742,6.122,6.205,12.159,7.119,19.606c1.188,9.672,4.804,19.122,8.027,28.442c2.294,6.631,2.382,8.267-2.748,13.474c-4.781,4.854-9.678,9.614-14.134,14.754c-2.104,2.427-3.975,5.467-4.778,8.535c-2.787,10.651-7.404,20.108-15.608,27.653c-1.071,0.985-1.77,2.394-2.573,3.649c-3.92,6.115-7.92,11.954-13.605,16.868c-7.354,6.355-13.557,14.035-20.381,21.021c-0.852,0.871-2.479,1.407-3.737,1.393c-9.939-0.118-19.877-0.418-29.816-0.636c-2.45-0.054-4.928,0.213-7.352-0.047c-12.292-1.318-24.144,0.793-36.159,3.278c-7.34,1.519-15.234,0.433-22.878,0.378c-6.729-0.048-12.501-2.429-17.328-7.248c-0.925-0.923-2.701-1.161-4.136-1.376c-6.183-0.928-12.369-1.883-18.588-2.494c-2.219-0.218-4.531,0.514-6.801,0.803c-11.006,1.397-20.169-2.038-27.347-10.534c-0.713-0.844-1.155-1.954-1.578-2.998c-2.164-5.344-3.546-11.075-8.806-14.663c-1.385-0.945-2.254-2.891-2.962-4.548c-3.505-8.192-9.769-14.036-16.228-19.806c-1.348-1.204-2.053-3.289-2.694-5.095c-2.602-7.322-4.563-14.922-7.756-21.967c-2.054-4.532-5.521-8.575-8.939-12.3c-4.282-4.665-5.254-16.186-1.016-23.752c2.903-5.185,6.378-10.046,9.414-15.159c1.427-2.402,2.839-4.951,3.535-7.622c2.074-7.95,8.824-11.849,14.338-16.629c5.616-4.869,12.022-8.825,18.066-13.203c7.254-5.254,8.198-7.815,6.131-16.438c-1.295-5.399,3.098-14.818,7.938-17.907c6.113-3.9,12.19-7.901,17.946-12.3c3.046-2.328,5.272-5.704,8.086-8.377C1434.926,1098.871,1436.647,1098.396,1438.281,1097.553z"
			}, {
				id: 13,
				name: "D3A: Giobbolas",
				connections: [ 4, 12, 14, 27, 28, 29],
				short: 'D3A',
				flag: {
					x: 1235,
					y: 1357
				},
				path: "M1396.221,1315.934c-5.582,6.112-11.249,12.111-16.679,18.316c-6.633,7.58-13.489,15.021-19.458,23.107c-5.307,7.19-13.054,10.301-20.282,14.434c-0.713,0.408-1.539,0.918-2.298,0.895c-4.809-0.143-8.035,0.633-10.723,6.008c-2.484,4.972-8.229,8.352-12.644,12.314c-6.866,6.163-13.691,12.387-20.828,18.225c-1.918,1.569-4.878,1.913-7.407,2.661c-0.922,0.273-2.298-0.315-2.925,0.178c-4.513,3.557-8.159,0.002-11.102-2.063c-4.109-2.883-7.587-2.176-11.002,0.04c-2.31,1.498-3.979,1.755-6.223,0.258c-5.192-3.464-10.414-3.637-16.523-1.631c-4.621,1.518-9.994,0.79-15.037,0.962c-4.311,0.146-7.088,2.577-9.153,6.008c-2.776,4.612-7.494,6.976-12.896,5.978c-12.319-2.279-23.732,0.815-34.647,6.057c-7.616,3.656-9.527,3.491-13.354-3.932c-3.085-5.983-7.413-10.359-13.404-13.508c-2.481-1.304-4.668-3.857-6.06-6.359c-1.584-2.85-3.305-4.515-6.571-3.956c-11.759,2.01-20.732-4.328-29.953-9.923c-4.53-2.748-8.976-5.638-13.551-8.306c-8.581-5.006-17.262-9.835-25.833-14.856c-4.516-2.646-8.884-5.545-13.867-8.672c0.855-1.434,2.278-3.237,3.072-5.285c1.328-3.425,2.169-7.035,3.371-10.514c1.386-4.013,2.417-8.274,4.537-11.88c3.843-6.536,8.427-12.633,12.598-18.981c1.535-2.337,2.652-4.944,4.167-7.295c9.329-14.488,18.805-28.882,28.052-43.421c5.402-8.494,10.424-17.228,15.708-25.798c2.696-4.373,5.528-8.668,8.457-12.888c0.519-0.747,1.875-1.435,2.743-1.328c4.439,0.547,8.918,1.071,13.246,2.154c6.563,1.644,13.008,3.753,19.511,5.641c7.058,2.05,14.105,1.904,21.1-0.286c4.382-1.371,8.122-0.152,12.393,1.424c10.267,3.789,20.237,9.437,31.972,7.44c2.354-0.4,4.919,0.496,7.394,0.728c12.023,1.125,22.737-2.811,33.01-8.517c1.28-0.711,2.739-1.449,4.149-1.523c7.314-0.386,13.068-4.461,19.153-7.777c0.437-0.238,1.123-0.382,1.265-0.739c2.629-6.618,8.091-4.385,13.086-4.658c5.364-0.294,10.624-2.186,15.995-2.736c4.98-0.512,9.991-0.077,13.845,4.002c0.629,0.666,1.793,1.19,2.697,1.173c6.385-0.123,6.93,4.774,8.563,9.179c1.135,3.061,3.371,5.723,5.176,8.523c1.962,3.047,4.491,5.837,5.89,9.114c2.783,6.522,5.891,13.135,7.148,20.023c1.463,8.013,8.182,11.288,12.313,16.84c2.046,2.749,4.101,5.492,6.142,8.245c2.54,3.425,5.107,6.831,7.587,10.298c1.046,1.462,2.06,2.986,2.812,4.609C1392.873,1308.088,1394.643,1312.313,1396.221,1315.934z"
			}, {
				id: 14,
				name: "D3B: Briocealyn",
				connections: [ 4, 5, 13, 15, 29, 30],
				short: 'D3B',
				flag: {
					x: 945,
					y: 1284
				},
				path: "M870.111,1135.343c2.339,1.902,4.152,3.274,5.84,4.786c1.075,0.963,1.956,2.143,2.939,3.21c0.873,0.948,1.595,2.239,2.68,2.753c7.996,3.786,15.969,7.658,24.182,10.92c2.029,0.806,5.024-0.185,7.381-0.95c11.05-3.591,19.598-12.378,31.743-14.241c7.843-1.203,15.258-5.212,22.849-8.005c1.082-0.397,2.461-0.757,3.053-1.595c5.413-7.652,14.379-8.255,22.125-11.194c1.289-0.489,3.748-0.155,4.577,0.771c5.405,6.045,10.685,12.221,15.648,18.632c3.281,4.237,5.84,9.028,8.992,13.377c0.994,1.372,2.731,2.443,4.353,3.082c9.571,3.766,18.372,8.731,26.305,15.35c2.737,2.283,6.005,4.328,9.375,5.372c6.806,2.108,10.018,7.421,12.721,13.1c2.535,5.325,6.895,8.299,11.676,11.089c4.837,2.822,9.511,5.927,14.353,8.741c3.708,2.153,7.517,4.153,11.376,6.025c2.787,1.353,5.729,2.384,9.024,3.73c-5.47,8.111-10.64,15.79-15.829,23.456c-0.93,1.373-2.042,2.63-2.896,4.046c-7.265,12.041-14.455,24.129-21.738,36.16c-4.97,8.21-9.958,16.412-15.113,24.507c-3.9,6.123-8.652,11.773-11.964,18.184c-3.023,5.852-4.236,12.615-6.974,18.647c-2.14,4.717-4.805,9.465-8.267,13.259c-8.589,9.413-19.934,14.69-31.616,19.245c-1.537,0.6-3.202,1.149-4.449,2.163c-10.016,8.146-21.503,6.697-32.72,4.441c-5.579-1.123-10.616-4.732-16.109-6.594c-2.428-0.823-5.386-0.184-8.093-0.027c-0.945,0.054-1.918,1.062-2.777,0.937c-6.982-1.02-12.384,2.891-18.275,5.441c-1.496,0.647-3.847,0.468-5.354-0.264c-5.611-2.722-10.139-6.867-14.923-10.903c-8.483-7.155-17.749-13.854-29.663-15.028c-5.387-0.531-10.663-2.185-15.988-3.335c-0.159-0.034-0.306-0.188-0.458-0.188c-13.665,0.047-21.443-10.502-31.406-17.225c-6.025-4.064-12.589-7.368-19.088-10.662c-1.291-0.654-3.65-0.195-5.07,0.575c-5.468,2.965-14.487-0.442-16.646-6.23c-1.56-4.183-3.354-8.376-5.754-12.106c-1.2-1.866-3.888-2.925-6.083-3.971c-5.667-2.703-11.58-4.924-17.125-7.848c-5.856-3.089-8.008-11.541-6.477-19.091c1.187-5.851,1.105-11.96,1.592-17.954c0.052-0.645-0.098-1.458,0.235-1.9c3.075-4.101,5.603-8.932,9.499-12.03c9.462-7.523,19.689-14.074,29.393-21.307c14.845-11.063,27.241-24.19,34.096-41.843c0.746-1.92,2.191-3.771,3.764-5.133c10.653-9.222,21.653-18.058,32.036-27.569c3.382-3.099,5.295-7.819,7.795-11.851C869.505,1137.258,869.832,1136.019,870.111,1135.343z"
			}, {
				id: 15,
				name: "E3A: Joviolmond",
				connections: [ 5, 14, 16, 30, 31, 32],
				short: 'E3A',
				flag: {
					x: 678,
					y: 1182
				},
				path: "M702.41,1036.351c2.018,2.261,3.405,4.436,5.339,5.873c8.641,6.419,17.64,12.368,26.127,18.979c10.771,8.39,21.074,17.378,31.793,25.838c3.416,2.695,7.687,4.282,11.254,6.816c3.996,2.839,8.071,5.787,11.317,9.401c3.612,4.023,7.952,5.773,12.949,6.676c3.595,0.648,7.236,1.119,10.768,2.021c4.003,1.021,6.955,3.106,8.48,7.483c2.314,6.639,8.222,8.8,14.597,9.398c6.676,0.627,13.444,0.405,20.083,1.254c3.97,0.508,7.769,2.357,11.837,3.665c-1.843,6.899-5.652,12.448-12.076,17.298c-10.694,8.072-20.402,17.491-30.162,26.729c-2.089,1.979-2.403,5.721-3.913,8.441c-8.678,15.643-20.106,28.659-35.267,38.536c-9.704,6.322-18.66,13.792-27.932,20.773c-0.655,0.493-1.346,1.107-1.685,1.824c-4.864,10.261-13.08,14.24-24.262,14.996c-9.068,0.612-17.103-0.134-23.477-6.944c-2.065-2.207-3.131-2.087-5.218-0.365c-5.056,4.169-10.695,4.174-17.168,3.653c-5.913-0.476-9.427-6.808-15.642-4.969c-2.175,0.643-4.798,0.68-6.466,1.967c-6.899,5.316-13.993,4.358-21.166,1.173c-5.9-2.62-6.147-2.25-8.768,3.372c-1.316,2.825-4.379,6.082-7.196,6.712c-6.667,1.489-13.813,2.729-20.484,1.876c-10.986-1.404-17.999-8.594-14.463-20.853c1.352-4.688-0.41-10.502-1.57-15.618c-1.199-5.292-3.562-10.307-5.101-15.535c-1.678-5.7-5.716-8.689-10.928-10.704c-5.684-2.196-11.351-4.447-16.936-6.879c-4.554-1.982-8.869-4.543-13.484-6.352c-7.183-2.815-11.119-8.516-14.039-15.083c-0.714-1.607-0.782-4.217,0.06-5.663c2.252-3.871,1.245-7.182-1.106-10.16c-2.313-2.929-1.872-5.512-0.003-8.17c6.333-9.008,7.717-19.488,9.313-29.976c0.356-2.339,1.722-4.81,3.304-6.626c5.879-6.747,12.042-13.248,18.1-19.839c1.239-1.348,2.334-2.884,3.76-3.993c11.234-8.749,17.907-20.574,23.109-33.498c1.515-3.764,4.805-5.566,8.872-4.557c5.791,1.438,11.367,2.177,16.688-1.478c0.91-0.625,2.17-0.81,3.302-1.027c9.078-1.747,18.143-3.566,27.251-5.138c8.116-1.399,16.322-2.305,24.407-3.854c3.15-0.604,5.991-2.711,9.132-3.498c2.474-0.621,5.999-1.352,7.64-0.13c4.014,2.988,7.369,3.094,11.357,0.476C697.345,1038.961,700.18,1037.593,702.41,1036.351z"
			}, {
				id: 16,
				name: "E3B: Ciobiathis",
				connections: [ 5, 6, 15, 17, 32, 33],
				short: 'E3B',
				flag: {
					x: 653,
					y: 969
				},
				path: "M754.796,863.239c3.277,7.308-0.277,14.779-2.664,22.391c-1.084,3.457,1.311,4.591,3.891,5.83c7.299,3.504,14.585,7.051,21.729,10.856c7.391,3.936,12.608,10.045,16.761,17.278c2.057,3.582,1.295,5.547-1.94,7.723c-2.653,1.784-4.835,4.287-7.156,6.543c-4.948,4.812-9.692,9.847-14.831,14.443c-2.924,2.616-6.18,4.688-4.651,9.359c0.05,0.153,0.102,0.425,0.028,0.483c-6.633,5.208,0.215,9.998,0.406,14.99c0.057,1.487,0.063,3.693-0.828,4.385c-7.186,5.576-14.745,10.675-21.877,16.316c-5.169,4.089-9.886,8.753-14.746,13.226c-1.084,0.997-1.691,2.696-2.905,3.338c-10.209,5.401-16.298,15.349-25.001,22.365c-3.057,2.465-6.589,4.454-10.165,6.097c-1.214,0.557-3.552-0.171-4.812-1.087c-3.885-2.827-7.531-2.499-11.592-0.427c-9.417,4.809-19.553,6.39-30.054,6.767c-4.369,0.157-8.671,1.851-13.027,2.728c-3.869,0.779-7.773,1.377-11.655,2.092c-2.92,0.538-5.957,0.78-8.722,1.768c-12.408,4.432-21.678,1.913-29.883-8.393c-8.996-11.299-18.284-22.381-26.86-33.989c-3.794-5.134-6.231-11.289-9.143-17.052c-4.458-8.824-8.772-17.721-13.216-26.553c-0.509-1.012-1.37-1.897-2.216-2.681c-6.153-5.691-7.563-13.713-4.469-21.507c5.435-13.69,10.468-27.541,15.729-41.3c0.706-1.844,1.595-3.664,2.682-5.308c3.04-4.601,2.869-8.833-0.504-13.291c-3.428-4.532-2.538-8.644,2.366-11.747c10.058-6.365,20.752-11.864,30.189-19.031c12.656-9.609,26.921-10.236,41.69-10.631c7.075-0.189,14.086-2.192,21.175-2.706c5.754-0.417,11.583,0.335,17.373,0.251c6.305-0.092,12.617-0.409,18.897-0.955c1.478-0.128,2.985-1.393,4.237-2.427c8.396-6.944,20.709-7.904,29.656-1.821c2.685,1.825,4.782,4.568,6.99,7.032c6.94,7.744,16.04,12.044,25.283,16.182c2.536,1.135,4.908,2.656,7.291,4.107C750.272,860.113,752.199,861.5,754.796,863.239z"
			}, {
				id: 17,
				name: "F3A: Preammirune",
				connections: [ 6, 16, 18, 33, 34, 35],
				short: 'F3A',
				flag: {
					x: 649,
					y: 759
				},
				path: "M575.534,844.857c-0.404-4.771-0.545-8.328-1.034-11.836c-1.141-8.188-2.852-16.157,1.661-24.226c1.717-3.071,0.924-7.652,0.911-11.544c-0.008-2.29-1.268-4.631-1.044-6.857c1.419-14.159-4.569-25.803-12.048-37.02c-0.908-1.362-1.631-2.892-2.19-4.435c-4.265-11.775-5.333-12.013-17.811-13.309c-6.899-0.717-13.533-3.742-20.375-5.356c-3.287-0.776-6.774-0.742-10.177-0.977c-1.734-0.119-3.482-0.021-6.878-0.021c2.409-6.282,4.464-11.678,6.554-17.06c0.419-1.08,1.21-2.062,1.426-3.167c3.607-18.498,14.3-33.153,25.291-47.79c8.069-10.745,15.532-21.963,22.852-33.24c2.37-3.65,3.428-8.152,4.883-11.762c8.203,0.483,16.85,0.265,25.22,1.681c9.052,1.532,17.986,4.17,26.718,7.084c11.705,3.907,23.392,7.016,35.91,6.545c4.41-0.165,8.876,1.149,13.315,1.8c8.053,1.181,15.832,0.226,23.533-2.438c2.331-0.806,5.211-0.948,7.627-0.422c10.5,2.287,21,4.655,31.345,7.545c7.225,2.018,15.473,2.611,19.09,11.212c1.408,3.347,1.4,5.133-2.652,5.929c-9.703,1.907-16.956,8.018-24.017,14.423c-2.003,1.817-1.944,3.135-0.358,5.451c2.873,4.195,5.838,8.597,7.392,13.36c2.244,6.876,5.586,12.312,12.301,15.368c1.354,0.616,3.046,1.124,3.844,2.219c5.239,7.196,13.343,9.612,20.757,13.43c3.878,1.998,6.645,6.295,9.674,9.763c3.701,4.234,6.87,8.963,10.797,12.958c3.053,3.106,3.978,5.852,0.57,8.815c-2.787,2.424-5.995,4.372-9.062,6.463c-0.949,0.646-2.239,0.869-3.049,1.63c-7.719,7.259-16.163,13.957-22.723,22.157c-3.599,4.498-7.015,9.252-11.175,13.195c-4.866,4.611-10.143,8.94-15.784,12.543c-6.504,4.155-12.039,8.735-14.509,16.348c-1.026,3.161-3.09,4.078-6.594,3.064c-10.339-2.994-19.634-2-29.157,4.555c-4.792,3.298-12.819,3.29-19.161,2.631c-11.248-1.168-22.17-0.787-33.091,1.856c-0.962,0.233-1.955,0.576-2.919,0.532C605.936,835.26,590.947,837.208,575.534,844.857z"
			}, {
				id: 18,
				name: "F3B: Exoryme",
				connections: [ 1, 6, 7, 17, 35, 36],
				short: 'F3B',
				flag: {
					x: 887,
					y: 640
				},
				path: "M794.267,746.693c-0.231-0.879-0.21-1.662-0.588-2.106c-7.692-9.062-14.13-19.93-23.549-26.562c-8.339-5.871-17.146-11.562-25.961-16.975c-4.99-3.065-8.152-6.816-10.135-12.268c-2.072-5.691-5.044-11.054-7.821-16.985c5.762-6.181,13.124-11.44,22.526-13.705c6.221-1.499,6.714-3.751,4.533-9.688c-3.68-10.009-12.818-11.153-21.068-13.342c-10.356-2.748-20.94-4.643-32.646-7.169c3.923-7.305,7.223-13.484,10.559-19.644c0.998-1.842,2.898-3.583,3.012-5.453c0.585-9.648,6.457-16.836,10.835-24.738c1.038-1.872,2.796-3.984,2.581-5.79c-0.66-5.553,3.064-6.935,6.722-9.373c5.497-3.665,10.415-8.234,15.401-12.62c4.624-4.067,9.126-7.891,15.383-9.688c3.784-1.087,7.242-4.073,10.275-6.834c4.776-4.347,9.04-9.253,13.584-13.86c1.739-1.763,3.662-3.346,5.489-5.023c3.954-3.63,7.62-4.38,13.302-2.298c6.834,2.504,14.617,2.54,22.021,3.349c14.498,1.583,29.003,3.122,43.532,4.377c12.72,1.1,25.465,2.195,38.218,2.515c8.767,0.22,17.571-0.841,26.352-1.438c2.639-0.179,5.383-0.334,7.854-1.168c6.73-2.272,12.75-1.74,17.873,3.609c-4.532,7.831-3.44,10.228,5.434,13.252c6.268,2.135,12.424,4.657,18.446,7.41c1.479,0.676,2.645,2.784,3.254,4.485c2.412,6.734,4.508,7.916,11.337,9.214c5.86,1.114,11.436,3.695,17.167,5.533c2.21,0.708,4.555,1.782,6.754,1.611c10.39-0.805,19.524,4.28,29.366,6.006c3.415,0.599,6.48,3.182,9.713,4.843c3.527,1.813,6.898,4.178,10.639,5.264c4.592,1.334,5.479,4.136,5.212,8.206c-0.125,1.918-0.242,3.975,0.295,5.773c1.898,6.361-0.225,13.996-5.189,18.383c-3.968,3.506-7.941,7.041-11.573,10.883c-2.743,2.901-3.464,6.377-0.671,9.908c0.812,1.027,1.437,2.203,2.376,3.668c-7.31,5.564-14.556,10.949-21.639,16.54c-2.761,2.18-5.142,4.839-7.719,7.256c-2.176,2.041-4.283,4.174-6.599,6.047c-8.469,6.848-17.34,13.245-25.376,20.562c-3.495,3.182-5.764,7.986-7.795,12.418c-1.9,4.148-3.937,7.021-8.996,7.064c-2.565,0.022-5.099,1.295-7.686,1.802c-3.539,0.694-7.097,1.415-10.682,1.733c-6.25,0.555-12.543,0.654-18.783,1.298c-1.641,0.169-3.413,1.359-4.67,2.557c-5.397,5.147-10.092,11.224-16.09,15.487c-4.556,3.238-9.673,7.612-16.63,4.464c-5.198-2.353-10.507-2.125-15.732,0.959c-5.138,3.033-8.759,2.225-12.952-2.01c-2.574-2.6-5.237-5.128-7.626-7.892c-3.35-3.874-7.854-4.722-12.528-5.217c-0.952-0.101-2.244-0.078-2.884,0.469c-4.609,3.935-10.225,7.326-13.249,12.278c-2.339,3.832-4.74,5.733-8.552,6.311c-13.094,1.982-26.219,3.751-39.333,5.598C797.954,746.213,796.317,746.42,794.267,746.693z"
			}, {
				id: 19,
				name: "A4A: Phiossiania",
				connections: [ 7, 20, 36, 37, 38, 60],
				short: 'A4A',
				flag: {
					x: 1136,
					y: 392
				},
				path: "M996.262,423.278c6.518-7.017,11.933-13.183,17.723-18.973c4.481-4.482,3.842-9.872-2.287-11.96c-3.292-1.122-4.926-2.955-5.806-6.021c-4.063-14.172-14.403-21.119-28.03-24.227c-7.714-1.759-15.681-2.792-23.069-5.447c-4.202-1.51-7.278-5.916-11.208-8.485c-3.39-2.217-7.271-3.683-10.628-5.33c1.227-5.527,1.463-11.959,4.156-17.105c2.39-4.568,7.215-8.086,11.489-11.39c6.419-4.96,13.259-9.383,20.001-13.915c2.046-1.375,4.237-2.778,6.569-3.445c11.916-3.41,23.759-7.351,35.908-9.568c8.062-1.471,16.595-0.432,24.916-0.375c7.624,0.052,14.852-0.951,21.173-5.799c1.484-1.138,3.643-1.672,5.564-1.918c13.972-1.789,27.955-3.489,41.953-5.057c1.92-0.215,4.12,0.04,5.884,0.795c11.498,4.925,23.844,3.587,35.777,5.26c8.259,1.158,16.699,2.813,24.378,5.925c13.166,5.337,26.475,7.019,40.46,5.681c6.733-0.644,13.547-0.392,20.311-0.769c11.079-0.62,22.141-1.593,33.225-2.063c4.449-0.189,8.937,0.795,13.409,0.806c3.951,0.009,7.898-0.787,11.855-0.88c6.199-0.146,12.406-0.039,18.606,0.08c0.679,0.013,1.624,0.649,1.972,1.264c5.306,9.378,16.146,11.857,23.385,18.836c5.126,4.942,11.203,9.042,15.667,14.491c5.055,6.171,3.723,13.698,1.514,20.947c-2.566,8.424-9.187,12.735-16.334,16.478c-10.721,5.614-22.418,8.624-34.255,9.634c-16.986,1.45-30.677,9.152-43.025,19.851c-9.499,8.23-18.542,17.003-27.519,25.809c-2.534,2.485-4.76,5.687-6.034,8.983c-4.493,11.626-12.823,19.695-23.395,25.429c-2.882,1.563-7.392,1.81-10.583,0.82c-11.872-3.68-23.54-2.549-35.392-0.323c-6.672,1.252-13.521,1.559-20.202,2.773c-4.836,0.879-9.49,2.714-14.293,3.833c-9.767,2.275-19.396,0.993-29.056-1.139c-4.831-1.066-9.997-0.693-14.77-1.913c-6.685-1.708-13.127-4.352-19.709-6.487c-3.928-1.273-7.989-2.154-11.869-3.547c-3.867-1.387-7.604-3.146-11.358-4.828c-4.347-1.947-8.636-4.022-12.98-5.978C1012.596,430.534,1004.814,427.09,996.262,423.278z"
			}, {
				id: 20,
				name: "A4B: Klitimelan",
				connections: [ 7, 8, 19, 21, 38, 39],
				short: 'A4B',
				flag: {
					x: 1435,
					y: 460
				},
				path: "M1424.022,311.024c5.461,10.64,14.967,18.128,25.221,25.045c6.777,4.573,12.063,11.273,20.498,13.502c2.731,0.721,3.552,2.997,1.828,5.931c-2.04,3.474-0.469,5.507,3.24,6.485c15.036,3.96,30.806,4.292,45.632,9.607c3.352,1.202,8.277-0.195,11.865-1.782c9.824-4.346,12.676-4.242,20.701,3.004c1.978,1.785,3.865,3.671,5.78,5.526c3.008,2.917,4.185,5.368,0.158,8.94c-4.699,4.168-3.266,12.479,2.5,18.724c1.354,1.466,2.743,2.965,4.357,4.11c6.047,4.289,4.847,15.136,0.323,19.132c-5.884,5.198-11.105,10.426-19.639,12.585c-8.607,2.177-17.723,5.997-22.986,14.603c-0.514,0.839-1.666,1.803-1.505,2.459c1.423,5.773-3.053,8.228-6.156,11.497c-3.673,3.869-2.823,6.441,1.553,9.425c5.139,3.505,9.803,7.748,14.394,11.972c0.677,0.623,0.418,3.602-0.416,4.32c-8.168,7.033-15.979,14.746-25.077,20.335c-5.73,3.521-13.415,4.107-20.338,5.381c-9.794,1.802-19.71,2.916-29.54,4.535c-5.165,0.851-9.789-1.029-12.521-5.639c-4.309-7.272-6.647-7.965-14.943-6.158c-4.697,1.023-9.67,0.713-14.45,1.448c-3.403,0.524-7.18,1.053-9.939,2.871c-6.61,4.355-12.337,1.787-17.774-1.591c-5.476-3.402-10.417-7.657-15.636-11.479c-1.723-1.262-3.439-2.773-5.405-3.408c-3.801-1.225-3.156-3.413-1.531-5.674c2.025-2.817,4.925-5.193,2.982-9.265c-2.257-4.729-5.645-8.099-10.807-9.578c-2.813-0.805-5.554-1.855-7.675-2.574c0.72-4.363,2.192-8.062,1.702-11.479c-0.838-5.85-8.394-10.996-14.492-11.021c-0.929-0.004-2.12-0.196-2.738-0.779c-4.192-3.944-8.654-2.569-13.519-1.512c-4.339,0.943-8.115,0.309-12.605-2.99c-8.7-6.392-10.998-16.05-15.162-24.499c-4.302-8.726-11.299-11.547-19.347-13.782c-5.425-1.506-10.972-2.574-16.434-3.954c-1.712-0.433-3.329-1.244-5.341-2.018c10.129-12.721,21.635-22.787,37.049-26.91c10.553-2.822,21.5-4.13,32.204-6.428c10.751-2.308,20.464-7.056,28.4-14.687c4.935-4.745,7.059-11.139,7.413-18.003c0.109-2.117,0.017-4.243,0.017-6.317c3.746-0.248,7.016-0.438,10.28-0.687c5.904-0.45,10.189-3.704,13.771-8.1c4.644-5.698,9.379-11.264,16.985-13.114c5.524-1.344,10.839-2.062,16.41,0.667C1416.067,311.052,1419.724,310.567,1424.022,311.024z"
			}, {
				id: 21,
				name: "A4C: Ioclequey",
				connections: [ 8, 9, 20, 22, 39, 40],
				short: 'A4C',
				flag: {
					x: 1709,
					y: 555
				},
				path: "M1644.604,607.265c6.812-5.375,8.368-11.225,7.419-18.206c-0.28-2.064,1.068-4.404,1.858-6.549c1.535-4.171,3.908-8.191,4.529-12.477c0.331-2.28-1.63-5.985-3.68-7.313c-6.055-3.922-12.693-6.935-19.056-10.39c-5.514-2.994-11.04-5.98-16.42-9.203c-5.057-3.029-9.943-6.346-14.877-9.579c-0.935-0.612-2.116-1.248-2.547-2.171c-4.418-9.449-13.321-9.055-21.631-10.16c-2.246-0.298-4.9-0.746-6.505-2.127c-11.302-9.728-22.071-20.104-36.033-26.225c-1.977-0.867-3.241-3.258-4.997-4.754c-4.387-3.738-8.661-7.664-13.388-10.923c-2.693-1.858-3.121-3.02-0.823-5.263c3.539-3.453,8.845-6.014,6.643-12.526c4.258-3.544,8.134-7.77,12.881-10.444c4.941-2.784,10.839-3.813,16.1-6.109c3.266-1.425,6.124-3.778,9.624-6.007c0.652,0.549,1.786,1.423,2.829,2.395c8.951,8.34,19.526,12.676,31.729,13.657c3.113,0.25,6.33,1.901,9.041,3.626c2.425,1.543,3.867,1.412,6.118-0.251c5.588-4.128,11.209-8.336,17.308-11.593c2.704-1.444,6.592-0.807,9.945-0.837c1.44-0.013,2.942,1.144,4.322,0.979c7.527-0.897,12.521,3.204,17.25,8.148c0.961,1.004,2.448,1.613,3.799,2.119c7.225,2.708,14.511,5.255,21.724,7.995c8.735,3.317,17.424,6.757,26.121,10.171c4.447,1.746,8.846,3.624,13.313,5.314c8.882,3.361,17.972,3.788,27.313,2.177c8.776-1.514,17.612-2.713,26.453-3.805c16.278-2.01,32.565-3.976,48.883-5.625c3.115-0.315,7.063-0.063,9.471,1.601c11.312,7.813,22.292,16.116,33.219,24.47c2.459,1.88,4.385,4.545,6.277,7.058c2.596,3.447,2.01,7.274,0.165,10.746c-1.856,3.495-3.772,7.168-6.491,9.957c-8.32,8.534-17.156,16.563-25.554,25.024c-4.785,4.821-9.451,9.839-13.554,15.237c-7.121,9.367-13.79,19.079-20.579,28.694c-1.138,1.612-2.378,3.365-2.804,5.229c-1.717,7.526-7.187,12.554-11.813,18.104c-0.686,0.823-3.2,1.093-4.224,0.502c-6.597-3.802-13.41-5.547-21.172-5.198c-6.461,0.291-13.062-0.695-19.482-1.798c-9.074-1.559-16.886,1.9-24.994,4.911c-9.728,3.612-19.717,5.155-30.025,2.055c-2.313-0.696-5.107-1.177-7.331-0.54c-7.621,2.183-15.28,1.277-22.479-0.578C1660.653,614.769,1653.32,610.839,1644.604,607.265z"
			}, {
				id: 22,
				name: "B4A: Lastaruz",
				connections: [ 9, 21, 23, 40, 41, 42],
				short: 'B4A',
				flag: {
					x: 1943,
					y: 666
				},
				path: "M1883.719,512.613c11.711,3.898,23.212,7.643,34.654,11.562c10.085,3.455,20.097,7.125,30.163,10.638c1.058,0.37,2.275,0.503,3.398,0.433c6.771-0.425,13.532-1.067,20.307-1.364c2.604-0.115,5.255,0.387,7.859,0.779c3.388,0.511,6.274,0.439,9.206-2.184c1.815-1.625,5.057-1.656,7.27-2.291c4.635,6.668,9.683,11.968,16.563,15.312c1.185,0.575,2.728,1.001,3.384,1.979c4.378,6.526,10.354,11.755,12.784,19.899c2.479,8.301,6.803,16.129,10.921,23.844c7.567,14.176,15.659,28.073,23.273,42.226c0.763,1.416,0.492,4.507-0.563,5.606c-8.599,8.956-9.878,20.923-12.948,31.931c-4.105,14.716-8.904,29.335-18.818,40.732c-7.064,8.121-16.218,16.202-29.235,13.289c-1.554-0.347-3.029-1.07-4.52-1.67c-5.352-2.156-10.654-4.437-16.052-6.47c-4.047-1.525-7.809-0.606-11.3,1.892c-8.244,5.895-17.432,9.245-27.435,11.01c-6.308,1.113-12.322,3.805-18.579,5.334c-2.148,0.525-4.629-0.395-6.963-0.535c-2.78-0.167-5.716-0.814-8.32-0.178c-5.88,1.438-11.713,3.242-17.346,5.454c-5.142,2.019-9.997,4.771-15.4,7.405c0-3.762-0.856-8.055,0.18-11.828c2.124-7.742-0.704-13.814-4.425-20.134c-3.343-5.68-5.62-11.999-9.081-17.595c-1.999-3.232-5.433-5.569-8.181-8.347c-2.521-2.547-5.456-4.837-7.396-7.776c-7.767-11.765-14.39-24.347-25.068-33.959c-0.368-0.332-0.701-0.718-0.99-1.123c-6.406-8.98-12.804-17.966-20.061-26.369c0.033-0.318-0.059-0.77,0.117-0.934c9.244-8.628,11.505-21.561,18.995-31.137c10.898-13.932,20.445-28.915,34.579-40.332c8.943-7.225,16.187-16.62,23.813-25.372C1880.914,519.573,1882.093,515.735,1883.719,512.613z"
			}, {
				id: 23,
				name: "B4B: Ecceacyre",
				connections: [ 9, 10, 22, 24, 42, 43],
				short: 'B4B',
				flag: {
					x: 1974,
					y: 859
				},
				path: "M1875.383,916.35c2.391-1.751,4.929-3.336,7.143-5.288c5.184-4.572,4.998-9.68,0.294-14.661c-3.106-3.291-5.539-7.214-8.324-10.815c-0.807-1.043-1.66-2.132-2.716-2.888c-4.77-3.417-10.049-6.249-14.353-10.163c-9.518-8.657-18.622-17.774-27.772-26.828c-5.908-5.847-11.556-11.958-17.415-17.855c-2.105-2.118-4.49-3.958-7.831-6.869c4.822-3.283,8.474-6.276,12.566-8.426c4.817-2.53,10.172-4.027,15.017-6.512c8.104-4.157,15.175-9.178,17.042-19.29c0.597-3.232,3.753-6.069,5.968-8.907c4.155-5.324,9.021-10.174,12.601-15.846c4.999-7.919,12.398-12.797,19.813-17.809c1.052-0.712,2.489-0.862,3.756-1.251c6.256-1.924,12.477-3.986,18.798-5.669c1.818-0.484,3.944,0.026,5.905,0.273c2.563,0.323,5.321,1.708,7.61,1.124c11.681-2.984,23.273-6.34,34.815-9.839c2.786-0.845,5.625-2.305,7.813-4.203c8.521-7.392,17.542-5.547,25.854-0.702c6.401,3.733,12.621,4.4,19.739,4.79c4.203,0.23,8.229,5.265,12.171,8.35c8.046,6.298,11.676,15.68,17.057,23.921c6.015,9.21,14.41,16.844,21.531,25.363c2.947,3.525,5.295,7.553,7.883,11.375c8.172,12.069,16.526,24.02,24.414,36.272c4.615,7.171,8.463,14.838,12.686,22.265c1.464,2.575,0.476,4.509-1.184,6.615c-3.802,4.822-7.982,9.483-10.938,14.804c-6.628,11.928-16.905,20.286-26.4,29.598c-6.368,6.245-10.88,14.382-16.208,21.684c-0.678,0.927-1.16,2.014-1.914,2.864c-3.187,3.584-5.955,7.836-9.825,10.422c-3.106,2.076-7.7,3.209-11.421,2.803c-6.504-0.711-12.812-3.076-19.26-4.474c-9.799-2.123-18.502-6.489-26.95-11.779c-6.993-4.378-14.373-8.203-23.153-7.661c-11.396,0.703-22.798,1.38-34.208,1.685c-2.514,0.067-5.194-1.208-7.581-2.326c-5.843-2.733-11.209-5.44-18.389-3.938c-7.932,1.659-16.294,1.256-24.47,1.752C1875.49,917.656,1875.437,917.002,1875.383,916.35z"
			}, {
				id: 24,
				name: "B4C: Yastalyn",
				connections: [ 10, 11, 23, 25, 43, 44],
				short: 'B4C',
				flag: {
					x: 1955,
					y: 1056
				},
				path: "M2039.352,949.05c3.16,5.372,7.343,10.94,9.868,17.18c2.929,7.239,8.021,13.627,8.02,22.204c-0.001,4.934,2.235,9.896,3.639,14.796c2.048,7.148,4.271,14.246,6.358,21.382c0.215,0.727,0.34,1.808-0.039,2.332c-6.214,8.615-6.566,19.51-11.288,28.736c-3.155,6.165-5.165,12.909-8.241,19.12c-2.443,4.933-5.918,9.136-11.914,10.364c-1.322,0.271-2.747,1.44-3.559,2.595c-4.946,7.034-9.73,14.185-14.283,20.878c-5.031-0.846-10.362-2.337-15.717-2.434c-3.624-0.064-7.223,2.24-10.937,2.778c-10.728,1.557-21.129,4.877-32.363,3.833c-5.226-0.485-10.729,3.05-16.228,4.168c-6.446,1.312-13.023,2.745-19.544,2.748c-10.779,0.005-21.563-1.018-32.332-1.799c-1.865-0.135-3.669-1.191-5.487-1.862c-2.927-1.081-5.822-2.248-8.765-3.282c-3.786-1.329-8.181-1.711-8.026-7.551c0.036-1.365-1.829-3.247-3.283-4.111c-9.271-5.507-13.45-14.533-16.377-24.131c-5.077-16.64-11.997-32.298-22.604-46.172c-4.703-6.153-9.641-12.128-13.885-19.045c1.637,0.616,3.456,0.956,4.877,1.896c5.47,3.62,11.46,2.921,15.036-1.391c6.209-7.487,14.764-7.573,22.771-9.487c9.261-2.213,11.771-7.151,7.082-15.538c-4.371-7.815-8.829-15.582-13.358-23.306c-0.989-1.687-2.2-3.423-3.731-4.578c-4.272-3.223-3.289-8.068-4.038-12.327c-0.131-0.746,1.475-1.977,2.479-2.706c2.146-1.556,4.374-3.02,6.659-4.362c5.563-3.266,6.377-9.358,8.762-14.508c2.119-4.576,8.318-7.773,13.135-6.241c9.643,3.065,19.411,2.965,28.957,0.454c6.124-1.611,11.163,0.419,15.328,3.604c4.01,3.065,7.81,3.681,12.048,2.464c12.854-3.69,25.854-1.596,38.673-0.601c5.336,0.415,10.382,4.6,15.543,7.103c0.429,0.208,0.678,0.798,1.108,0.988c9.298,4.105,17.879,9.959,28.499,10.792c4.052,0.318,7.967,2.106,12.012,2.852C2029.236,947.81,2034.339,948.351,2039.352,949.05z"
			}, {
				id: 25,
				name: "C4A: Chobbiabis",
				connections: [ 11, 24, 26, 44, 45, 46],
				short: 'C4A',
				flag: {
					x: 1964,
					y: 1251
				},
				path: "M1921.635,1328.741c-0.787-2.979-1.192-6.914-2.836-10.237c-3.49-7.057-6.266-14.465-14.128-18.777c-3.814-2.093-5.831-7.386-8.798-11.122c-5.053-6.369-10.262-12.612-15.307-18.986c-2.846-3.597-6.241-7.017-8.062-11.108c-3.191-7.174-9.586-10.172-15.54-13.922c-1.66-1.046-3.613-1.729-5.055-3.003c-5.668-5.02-12.271-5.578-19.061-3.709c-11.587,3.189-13.418,3.336-26.052-0.86c0.955-4.054,1.925-8.169,2.892-12.283c0.037-0.162,0.117-0.356,0.064-0.49c-4.634-11.785,6.606-15.272,11.653-21.871c2.771-3.624,7.1-6.081,9.751-9.766c2.084-2.898,3.427-6.81,3.722-10.385c0.313-3.796-1.538-7.749-1.376-11.588c0.083-1.971,2.126-4.352,3.926-5.669c7.649-5.594,12.564-13.283,16.699-21.465c4.607-9.121,8.64-18.532,12.961-27.8c0.405-0.871,1.084-1.613,1.913-2.818c5.948,2.61,11.73,5.331,17.667,7.659c2.267,0.889,4.876,1.093,7.351,1.233c8.132,0.46,16.287,0.562,24.409,1.147c10.458,0.753,20.592-0.29,30.257-4.524c7.271-3.185,15.002-1.885,22.524-2.679c8.48-0.895,17.13-2.019,25.175-4.659c6.771-2.223,12.797-2.025,18.764,0.896c11.405,5.582,21.776,12.334,29.156,23.338c4.193,6.253,10.525,11.03,15.427,16.865c3.271,3.894,6.119,8.273,8.457,12.796c5.68,10.989,13.748,19.933,23.057,27.81c3.197,2.705,3.116,5.195,1.019,8.157c-3.313,4.678-5.5,9.475-5.749,15.543c-0.229,5.583-3.035,10.327-7.826,14.34c-3.324,2.785-6.168,7.911-6.473,12.188c-0.77,10.793-4.715,20.104-11.395,27.989c-5.121,6.045-6.853,13.386-10.4,19.979c-7.305,13.576-18.066,23.062-33.766,25.868c-0.972,0.174-2.063,0.3-2.984,0.041c-10.94-3.082-19.935,2.875-29.517,6.192c-2.616,0.907-5.409,1.308-8.122,1.938c-12.158,2.824-25.054,1.761-36.75,7.447c-2.513,1.221-6.442-0.077-9.612-0.732C1927.045,1331.17,1924.577,1329.863,1921.635,1328.741z"
			}, {
				id: 26,
				name: "C4B: Mioccijan",
				connections: [ 11, 12, 25, 27, 46, 47],
				short: 'C4B',
				flag: {
					x: 1758,
					y: 1391
				},
				path: "M1572.226,1334.664c8.186-11.551,17.249-19.941,26.917-27.861c3.334-2.731,5.247-7.158,7.974-10.684c3.135-4.053,7.077-7.613,9.545-12.019c3.999-7.138,7.112-14.775,10.527-22.235c0.756-1.651,0.742-3.881,1.881-5.093c6.812-7.245,13.369-14.878,21.062-21.076c3.117-2.512,8.928-2.56,13.426-2.288c8.493,0.513,16.939,1.96,25.359,3.304c1.276,0.204,2.729,1.725,3.379,3.003c2.906,5.719,7.486,8.663,13.799,9.112c5.267,0.375,7.939,3.607,8.894,8.819c0.509,2.78,2.165,6.275,4.402,7.623c4.727,2.849,10.146,4.578,15.341,6.607c2.452,0.958,5.028,2.094,7.58,2.177c3.833,0.126,7.834-0.087,11.505-1.098c4.524-1.246,8.661-3.9,13.188-5.136c5.281-1.44,9.111-4.048,12.141-8.701c1.509-2.315,4.714-3.601,7.282-5.133c2.593-1.547,5.551-2.541,7.98-4.287c3.22-2.314,5.884-5.43,9.187-7.588c1.524-0.995,4.143-1.115,6.013-0.641c8.014,2.031,15.648,2.923,23.834-0.336c5.731-2.282,11.893-1.186,17.166,3.281c3.474,2.942,7.997,4.631,11.549,7.501c2.96,2.392,5.289,5.606,7.723,8.599c4.99,6.138,9.965,12.296,14.758,18.589c4.616,6.06,8.945,12.338,13.508,18.439c1.362,1.823,2.788,3.923,4.693,4.958c8.188,4.447,11.412,12.274,14.13,20.328c1.685,4.994,2.355,10.321,3.771,15.418c1.358,4.892,2.942,9.733,4.7,14.495c1.659,4.499,1.382,7.701-2.798,11.241c-6.886,5.832-13.214,12.432-19.076,19.307c-1.965,2.302-2.33,6.404-2.485,9.727c-0.348,7.439-4.13,13.256-8.229,18.885c-2.715,3.727-6.107,6.959-9.199,10.41c-0.333,0.372-0.863,0.677-0.992,1.105c-3.057,10.211-12.858,15.615-17.522,24.65c-1.192,2.309-2.588,2.626-5.153,2.436c-11-0.818-21.526,0.365-31.777,5.53c-4.839,2.438-11.293,2.653-16.931,2.338c-15.533-0.867-30.762-0.928-45.477,5.372c-5.422,2.322-11.46,3.169-17.134,4.955c-3.564,1.121-7.208,2.339-10.405,4.214c-7.83,4.593-15.57,6.879-24.512,2.841c-2.605-1.177-6.151-0.206-9.26-0.354c-2.564-0.121-5.219-0.082-7.647-0.771c-2.441-0.692-2.721-2.356-2.554-5.297c0.227-3.995-1.759-8.155-2.989-12.184c-1.05-3.434-2.744-6.701-3.498-10.185c-1.347-6.215-4.467-10.889-9.959-14.139c-13.313-7.876-26.254-16.014-34.242-30.188c-2.673-4.743-7.723-8.105-11.457-12.304c-3.964-4.456-7.492-9.305-11.52-13.699c-3.228-3.52-6.848-6.695-10.423-9.879c-3.685-3.281-7.535-6.377-11.294-9.577c-1.013-0.862-1.915-1.854-2.936-2.707C1588.169,1347.946,1580.354,1341.441,1572.226,1334.664z"
			}, {
				id: 27,
				name: "C4C: Cheabenium",
				connections: [ 12, 13, 26, 28, 47, 48],
				short: 'C4C',
				flag: {
					x: 1497,
					y: 1462
				},
				path: "M1616.063,1539.176c-14.934-1.823-29.669-0.656-43.978-5.642c-8.571-2.986-17.903-4.21-26.684-7.384c-4.664-1.686-10.163-1.361-15.29-1.403c-10.513-0.089-20.704,1.696-30.89,4.605c-5.386,1.538-11.663,0.981-17.354,0.133c-5.658-0.844-11.032-3.43-16.623-4.898c-5.588-1.468-11.307-2.426-16.938-3.733c-9.796-2.273-19.573-4.631-29.351-6.979c-3.445-0.827-7.227-1.055-9.309-4.598c-0.709-1.207-1.724-2.546-1.705-3.812c0.064-4.453-2.583-6.869-5.802-9.228c-2.771-2.029-5.262-4.449-7.806-6.772c-2.626-2.398-3.726-6.429-8.79-6.097c-1.84,0.121-3.815-3.369-5.899-4.992c-2.021-1.574-4.084-3.435-6.441-4.178c-7.382-2.329-13.765-8.041-22.352-6.631c-0.882,0.145-3.011-2.146-3.139-3.447c-0.647-6.59-5.328-10.893-8.65-15.904c-1.057-1.594-3.763-3.476-5.265-3.15c-6.059,1.311-7.389-3.564-10.091-6.742c-2.199-2.583-4.419-5.149-6.783-7.902c-1.587,1.347-2.685,2.278-3.264,2.771c-2.84-0.507-5.292-0.71-7.593-1.411c-3.439-1.048-7.091-1.961-10.018-3.893c-1.563-1.032-1.956-4.033-2.583-6.229c-0.563-1.973-0.724-4.06-1.252-7.24c13.151-11.95,27.061-24.59,40.512-36.815c5.328-2.319,10.72-4.185,15.64-6.903c14.592-8.066,23.833-21.472,33.545-34.389c3.552-4.724,7.354-9.263,11.116-13.826c2.268-2.75,7.237-3.255,10.283-1.23c7.539,5.012,15.732,5.242,24.637,5.293c9.36,0.053,19.851-1.186,28.071,4.669c5.3,3.776,10.136,6.363,16.723,5.739c4.623-0.438,9.342,0.199,13.981-0.144c4.729-0.35,9.413-1.298,14.112-2.015c0.649-0.099,1.278-0.547,1.909-0.532c9.854,0.23,19.458-2.772,29.565-1.046c7.501,1.282,15.506,0.647,23.157-0.24c8.781-1.018,15.289,1.182,20.791,8.418c3.62,4.76,8.839,8.306,13.357,12.377c0.362,0.326,0.922,0.439,1.264,0.779c11.354,11.239,25.962,18.983,34.667,33.162c2.689,4.38,7.747,7.232,11.158,11.261c5.136,6.068,9.607,12.695,14.681,18.821c4.119,4.976,9.348,8.262,15.176,11.486c8.161,4.518,18.408,8.782,18.467,21.254c0.012,2.416,1.653,5.041,3.105,7.188c3.271,4.838,4.299,10.162,2.306,15.368c-0.894,2.335-4.065,4.489-6.658,5.35c-7.419,2.46-12.487,6.916-18.021,12.678c-8.22,8.557-16.026,18.675-29.725,21.102c-7.163,1.27-13.784,5.225-21.702,4.983c-2.751-0.084-7.779,3.676-7.953,5.97c-0.287,3.754,2.196,7.943,4.211,11.56C1611.652,1536.642,1614.191,1537.724,1616.063,1539.176z"
			}, {
				id: 28,
				name: "D4A: Diodiriel",
				connections: [ 13, 27, 29, 48, 49, 50],
				short: 'D4A',
				flag: {
					x: 1235,
					y: 1550
				},
				path: "M1319.487,1586.807c-4.329-2.656-8.099-5.306-12.165-7.37c-3.691-1.872-7.233-2.094-11.027,1.045c-2.43,2.01-6.703,1.67-9.413,3.484c-6.874,4.604-14.263,8.292-21.252,12.41c-6.117,3.605-10.268,4.546-16.208,2.124c-1.25-0.51-2.952,0.115-4.446,0.169c-11.085,0.402-22.176,1.189-33.253,1.028c-6.026-0.087-12.24-3.249-17.995-2.421c-8.667,1.247-17.242,4.202-25.396,7.551c-4.756,1.954-8.141,4.185-12.777-0.396c-2.656-2.624-6.869-3.946-10.608-5.153c-15.04-4.853-26.396-14.191-36.624-26.184c-8.634-10.122-19.64-18.201-29.407-27.384c-4.542-4.271-8.717-8.945-12.899-13.582c-2.213-2.452-4.084-5.214-6.454-8.282c-0.239,0.392-0.08-0.234,0.225-0.316c12.046-3.224,19.273-12.502,26.836-21.341c5.394-6.303,10.885-12.534,16.025-19.04c5.579-7.063,10.732-14.459,16.224-21.594c1.601-2.079,3.403-4.451,5.665-5.502c10.906-5.069,19.565-12.934,27.957-21.249c1.051-1.042,2.876-2.049,4.223-1.91c4.944,0.512,8.829-1.846,13.175-3.519c9.576-3.69,19.373-6.535,30.052-4.826c7,1.12,13.361-0.326,17.1-7.853c2.977-5.989,9.275-3.55,14.269-4.189c2.576-0.33,5.455,0.271,7.73-0.673c5.116-2.122,9.75-1.694,14.212,1.226c3.153,2.062,5.86,2.358,9.025-0.208c2.504-2.031,5.245-1.602,8.231,0.178c3.884,2.313,7.703,5.636,13.061,2.278c2.757-1.728,6.333,1.566,6.524,5.339c0.414,8.224,5.719,13.418,14.032,14.28c2.633,0.273,5.129,1.699,7.745,2.376c1.241,0.32,2.617,0.096,3.931,0.16c1.292,0.063,3.108-0.326,3.771,0.367c1.892,1.977,3.428,4.332,4.892,6.671c1.891,3.02,3.719,5.56,7.962,3.558c0.802-0.379,2.912,0.46,3.448,1.334c2.963,4.823,8.151,8.432,8.229,14.874c0.053,4.331,2.815,6.714,6.689,6.491c9.219-0.53,16.142,5.805,24.542,7.621c1.346,0.291,2.228,2.364,3.509,3.381c7.513,5.959,15.762,11.186,22.377,18.006c4.075,4.201,7.558,10.718,7.792,16.341c0.177,4.254-4.999,8.9-8.204,13.055c-1.682,2.179-4.185,3.76-6.435,5.455c-2.801,2.109-6.446,3.732-2.753,8.172c0.242,0.292-1.78,3.398-3.251,4.032c-8.479,3.661-17.236,6.696-25.602,10.584c-2.216,1.03-4.419,4.176-4.759,6.61c-0.4,2.872-1.178,4.56-3.661,5.749c-10.252,4.911-20.486,9.858-30.715,14.819C1322.014,1585.369,1320.452,1586.287,1319.487,1586.807z"
			}, {
				id: 29,
				name: "D4B: Driqela",
				connections: [ 13, 14, 28, 30, 50, 51],
				short: 'D4B',
				flag: {
					x: 956,
					y: 1482
				},
				path: "M1152.663,1430.154c-8.856,9-17.831,17.074-28.9,22.98c-5.288,2.819-9.313,8.393-13.277,13.236c-11.502,14.053-22.767,28.304-33.957,42.607c-5.111,6.533-12.075,9.604-19.686,11.865c-4.267,1.268-8.357,3.17-12.66,4.268c-9.434,2.407-18.987,4.351-28.421,6.759c-3.651,0.932-7.066,2.76-10.679,3.891c-1.908,0.598-4.721,1.543-5.905,0.672c-6.746-4.96-11.788-2.307-16.465,3.254c-3.88-3.566-6.285-1.458-7.772,1.979c-1.792,4.143-3.575,5.152-7.849,2.449c-3.512-2.221-7.894-3.668-12.039-4.134c-5.248-0.589-9.141-2.774-12.108-6.787c-3.456-4.67-8.415-4.046-12.736-3.035c-4.196,0.981-6.094,5.146-6.166,9.358c-0.064,3.713-1.708,4.783-4.925,4.22c-4.026-0.705-7.991-1.993-12.036-2.282c-3.321-0.237-6.764,0.396-10.07,1.059c-2.554,0.511-5.004,1.598-7.454,2.548c-3.106,1.205-4.6-0.485-6.625-2.637c-4.993-5.305-10.721-9.701-18.076-11.548c-2.618-0.657-5.076-2.008-7.555-3.154c-3.148-1.455-6.167-3.217-9.378-4.504c-6.418-2.572-10.68-6.872-14.13-13.043c-2.331-4.167-3.799-9.9-9.828-11.549c-1.367-0.374-2.3-2.868-3.137-4.535c-1.478-2.941-2.424-6.186-4.141-8.964c-3.018-4.883-9.885-1.022-13.272-5.44c-5.769,4.457-8.675,0.326-12.217-3.576c-1.868-2.059-4.996-3.156-7.741-4.2c-6.413-2.44-7.266-5.013-3.131-10.612c5.007-6.783,11.085-13.032,14.776-20.468c5.014-10.097,8.006-21.178,12.276-31.671c1.687-4.146,4.419-7.88,6.793-11.728c0.861-1.396,2.4-2.428,3.058-3.884c3.656-8.095,7.287-16.209,10.591-24.451c1.055-2.631,1.894-4.86,5.054-5.31c0.747-0.105,1.722-0.604,2.071-1.217c5.769-10.14,14.872-5.271,22.702-4.718c5.699,0.402,11.241,3.242,16.93,3.544c10.766,0.57,19.118,6.655,26.344,12.861c5.496,4.719,10.867,9.34,17.205,12.682c1.946,1.025,5.524,1.372,7.106,0.257c7.121-5.021,15.589-5.44,23.519-6.933c4.192-0.789,10.019,0.96,13.468,3.657c7.046,5.512,14.912,4.479,22.688,5.301c10.934,1.156,18.348-6.826,27.356-10.526c7.862-3.229,15.221-7.963,22.27-12.809c6.041-4.153,9.86-4.575,16.292-0.545c12.617,7.904,25.406,15.535,38.136,23.259c5.382,3.265,10.926,6.284,16.161,9.77c5.814,3.872,12.077,5.317,18.912,4.64c3.444-0.341,5.673,0.772,7.83,3.801c2.104,2.956,5.367,5.288,8.524,7.241C1144.592,1416.653,1147.466,1419.877,1152.663,1430.154z"
			}, {
				id: 30,
				name: "D4C: Gakiaran",
				connections: [ 14, 15, 29, 31, 51, 52],
				short: 'D4C',
				flag: {
					x: 685,
					y: 1397
				},
				path: "M841.23,1352.002c-3.075,2.905-5.308,6.513-8.45,7.686c-7.47,2.791-7.686,9.441-9.99,15.246c-2.176,5.481-5.091,10.67-7.681,15.988c-0.218,0.447-0.321,1.056-0.678,1.317c-10.106,7.414-9.682,19.755-14.171,29.812c-5.699,12.767-10.169,26.303-21.073,36.225c-2.381,2.168-2.397,6.763-4.517,9.438c-2.506,3.162-5.781,6.099-9.341,7.93c-3.132,1.611-6.714,2.328-10.893,1.287c-4.083-1.016-8.826,1.041-13.223,0.788c-11.229-0.647-22.422-1.918-33.642-2.764c-6.137-0.463-12.57-1.34-16.153,6.057c-7.294-5.492-13.184-1.698-19.336,2.182c-3.562,2.246-7.501,3.907-11.908,0.888c-1.957-1.341-4.709-1.52-7.782-2.427c-2.424-5.828-3.438-6.389-9.638-4.322c0.87-5.869-2.177-9.622-6.904-12.061c-1.082-0.558-2.995,0.497-5.119,0.932c-0.072-0.076-0.98-1.822-1.836-1.797c-5.151,0.152-5.795-4.335-8.252-7.145c-4.028-4.606-8.751-8.601-13.032-12.996c-1.444-1.483-2.496-3.367-3.623-5.134c-2.1-3.295-4.123-6.639-6.178-9.962c-0.448,0.249-0.896,0.497-1.344,0.747c0.129-1.807,0.676-3.712,0.28-5.396c-0.464-1.966-1.498-5.135-2.727-5.359c-6.304-1.149-7.747-6.505-10.527-10.778c-0.524-0.805-1.345-1.912-2.109-1.98c-3.853-0.346-7.196-1.266-10.122-4.206c-0.803-0.808-3.79,0.558-6.519,1.064c-1.126-1.679-3.424-3.801-4.077-6.344c-1.385-5.396-4.987-8.387-9.427-10.924c-3.997-2.284-4.924-6.169-6.136-10.329c-0.775-2.661-4.023-4.643-6.277-6.811c-0.664-0.639-1.719-0.872-2.266-1.135c3.481-4.471,7.493-8.508,10.147-13.297c3.876-6.994,6.67-14.58,10.137-21.812c1.727-3.603,3.762-7.084,5.94-10.437c5.401-8.314,10.905-16.564,16.479-24.764c5.719-8.412,7.434-19.451,16.634-25.532c1.212-0.803,3.257-1.36,4.512-0.908c5.67,2.044,11.297,2.54,17.094,0.801c0.952-0.285,1.94-0.723,2.895-0.684c8.938,0.357,14.813-3.706,17.578-12.364c3.502,1.17,6.716,2.391,10.014,3.313c5.78,1.616,11.094,0.658,16.061-2.899c5.395-3.862,9.16-3.267,13.48,1.592c0.513,0.577,1.349,1.284,2.004,1.254c6.875-0.315,13.759-0.618,20.604-1.294c1.633-0.162,3.13-1.697,5.025-2.795c0.896,0.479,2.277,0.862,3.157,1.744c9.116,9.142,20.287,6.584,30.807,4.72c13.768-2.442,11.832-1.466,8.9,10.329c-1.714,6.898-0.983,13.265,0.927,19.536c0.71,2.331,4.023,4.273,6.57,5.561c5.892,2.978,12.144,5.243,18.024,8.239c1.858,0.947,3.144,3.194,4.433,5.027c1.075,1.528,1.708,3.36,2.663,4.982c0.494,0.838,1.693,1.437,1.843,2.273c1.649,9.255,9.928,9.515,16.41,12.15c0.786,0.319,2.399,0.192,2.782-0.339c3.335-4.628,6.453-2.076,9.688,0.045c9.671,6.34,19.371,12.639,29.041,18.979C840.928,1351.48,841.287,1352.064,841.23,1352.002z"
			}, {
				id: 31,
				name: "E4A: Phulotora",
				connections: [ 15, 30, 32, 52, 53, 54],
				short: 'E4A',
				flag: {
					x: 477,
					y: 1304
				},
				path: "M412.196,1144.405c18.775,3.086,42.925-0.096,54.961-7.206c5.63,4.871,11.956,2.518,17.417,0.482c6.408-2.387,12.503-4.75,19.511-4.906c4.115-0.094,8.351-1.532,12.246-3.084c5.942-2.368,11.635-5.357,17.434-8.083c0.552,0.275,1.103,0.551,1.654,0.826c-1.277,5.952-2.206,12.009-3.95,17.821c-1.258,4.191-3.412,8.162-5.517,12.04c-2.15,3.96-2.873,7.405,0.092,11.504c1.222,1.689,0.712,4.739,0.716,7.172c0.004,2.416-1.283,5.301-0.36,7.168c3.565,7.215,7.421,14.211,15.882,17.327c6.012,2.216,11.588,5.607,17.38,8.431c2.821,1.375,5.58,3.374,8.561,3.835c8.36,1.293,13.391,5.648,15.361,13.885c1.644,6.873,3.93,13.606,5.308,20.525c0.546,2.739-0.616,5.811-0.958,8.735c-0.817,6.987,0.423,13.178,7.807,17.166c-11.966,8.914-14.874,22.735-22.177,33.785c-4.523,6.845-9.938,13.094-14.743,19.762c-1.907,2.647-3.447,5.614-4.795,8.597c-1.94,4.295-3.327,8.845-5.367,13.086c-2.231,4.638-4.647,9.241-7.507,13.51c-3.806,5.679-7.813,11.292-12.366,16.368c-1.774,1.978-5.175,3.028-7.991,3.447c-12.331,1.835-23.866,5.86-35.124,11.114c-3.213,1.5-7.316,1.953-10.89,1.612c-5.062-0.481-9.597-0.264-14.51,1.601c-7.525,2.856-15.478,4.608-23.297,6.644c-1.333,0.347-3.445,0.328-4.276-0.475c-4.22-4.073-9.354-7.862-11.828-12.901c-2.613-5.321-1.058-11.474,2.793-16.805c1.562-2.16,2.198-5.656,1.858-8.369c-0.507-4.041-1.689-8.246-3.684-11.757c-1.173-2.064-4.539-4.21-6.806-4.095c-9.77,0.496-18.701-4.197-22.753-13.013c-1.24-2.696-2.441-5.435-3.366-8.251c-4.068-12.389-12.241-21.487-23.123-28.124c-5.664-3.455-11.903-5.965-18.01-8.965c1.162-4.271,3.629-8.37-3.094-9.594c-0.979-0.178-1.845-5.42-1.396-8.089c0.974-5.791,3.228-11.368,4.192-17.16c0.652-3.917,2.583-6.761,4.432-10.07c4.695-8.404,13.336-12.816,18.794-20.264c1.45-1.979,3.371-4.426,3.283-6.585c-0.475-11.659,5.692-20.796,10.978-30.224c0.779-1.389,3.801-2.383,5.598-2.146c3.155,0.417,5.165-0.286,6.487-3.101c2.942-6.264,5.93-12.507,8.811-18.798C408.053,1154.011,410.103,1149.174,412.196,1144.405z"
			}, {
				id: 32,
				name: "E4B: Iccothaer",
				connections: [ 15, 16, 31, 33, 54, 55],
				short: 'E4B',
				flag: {
					x: 464,
					y: 1075
				},
				path: "M520.195,946.289c0.254,2.943,0.083,5.507,0.776,7.811c0.837,2.782,1.761,6.065,3.776,7.874c8.334,7.477,12.963,17.053,16.425,27.305c3.783,11.2,10.267,20.735,17.505,29.851c6.917,8.711,13.834,17.425,20.971,25.955c2.316,2.767,5.326,4.953,7.845,7.248c-4.639,8.265-9.085,16.674-14.03,24.779c-2.292,3.758-5.396,7.069-8.408,10.329c-6.854,7.42-13.566,15.02-20.947,21.89c-4.826,4.493-10.631,7.974-16.181,11.631c-2.465,1.624-5.548,2.296-8.06,3.867c-6.722,4.207-13.846,5.936-21.811,5.333c-2.759-0.209-5.659,1.524-8.504,2.335c-4.849,1.379-9.692,2.782-14.569,4.053c-1.064,0.277-2.815,0.525-3.312-0.039c-3.702-4.205-6.447-0.994-9.955,0.5c-4.772,2.032-9.993,3.323-15.146,4.076c-7.023,1.026-14.156,1.499-21.257,1.711c-4.033,0.12-8.096-0.753-12.56-1.222c0.457-1.908,0.624-3.016,0.987-4.054c2.254-6.433-0.894-11.454-7.806-11.404c-5.481,0.039-9.986-0.566-13.243-5.793c-1.082-1.735-4.192-2.566-6.536-3.092c-11.097-2.49-16.502-11.133-13.793-22.348c0.543-2.251,0.753-4.581,1.257-6.844c0.915-4.103,2.289-8.14,2.797-12.286c0.39-3.186,0.302-6.652-0.554-9.72c-1.79-6.411-2.292-13.521-8.077-18.184c-2.16-1.74-4.194-3.762-6.613-5.031c-6.53-3.427-11.736-7.904-14.792-14.848c-1.636-3.714-4.09-7.068-5.757-9.882c9.314-11.114,17.893-21.903,27.092-32.134c6.191-6.886,13.502-12.754,19.845-19.515c3.94-4.2,7.006-9.219,9.685-12.821c11.808-1.351,22.896-2.605,33.98-3.901c1.645-0.192,3.265-0.823,4.899-0.834c13.414-0.091,26.829-0.104,40.243-0.077c1.307,0.002,2.652,0.298,3.912,0.678c8.911,2.69,17.701,1.742,26.528-0.541C511.106,947.835,515.526,947.2,520.195,946.289z"
			}, {
				id: 33,
				name: "E4C: Ohephere",
				connections: [ 16, 17, 32, 34, 55, 56],
				short: 'E4C',
				flag: {
					x: 465,
					y: 876
				},
				path: "M571.87,783.24c0.569,3.934,0.792,7.958,1.787,11.782c1.548,5.953,0.833,11.385-1.831,16.88c-1.177,2.427-1.986,5.418-1.776,8.059c0.652,8.213,2.032,16.368,2.721,24.58c0.121,1.439-1.378,3.566-2.732,4.488c-8.649,5.882-17.474,11.508-26.229,17.235c-6.372,4.168-7.595,9.91-3.253,16.105c1.953,2.786,2.774,5.36,1.263,8.735c-4.058,9.057-7.891,18.215-11.72,27.374c-3.062,7.323-5.838,14.77-9.092,22.004c-0.669,1.488-2.737,2.862-4.418,3.296c-13.14,3.405-26.341,3.84-39.899,2.033c-7.916-1.055-16.169,0.44-24.272,0.744c-1.644,0.062-3.296-0.051-4.941-0.126c-4.148-0.189-8.346-0.909-12.433-0.504c-9.344,0.925-18.648,2.296-27.94,3.681c-5.625,0.838-7.612-0.167-9.492-5.244c-0.44-1.189-1.439-2.173-2.191-3.245c-2.075-2.959-5.282-5.662-6.013-8.922c-1.854-8.257-5.798-15.296-11.279-21.305c-4.288-4.702-4.935-10.231-6.239-15.842c-0.569-2.448-1.522-5.438-3.337-6.85c-5.653-4.398-8.03-10.828-11.668-16.515c-4.084-6.384-8.84-12.334-13.102-18.61c-2.601-3.831-5.253-7.738-7.03-11.969c-0.889-2.118-0.384-5.205,0.381-7.564c2.937-9.055,9.851-15.02,16.679-21.174c6.362-5.736,12.043-12.223,18.104-18.299c4.316-4.327,8.827-8.462,13.117-12.814c1.218-1.235,2.551-2.83,2.827-4.433c0.95-5.511,1.647-11.084,2.055-16.661c0.229-3.141,1.318-4.315,4.535-4.362c5.476-0.079,11.044-0.125,16.385-1.155c4.607-0.889,8.844-3.587,13.437-4.679c9.492-2.258,19.164-3.759,28.666-5.983c9.967-2.333,19.78-5.317,29.738-7.695c7.185-1.716,14.615-4.453,21.717-3.903c7.38,0.571,14.956-1.955,22.63,2.785c5.575,3.443,13.672,3.232,20.71,3.741c5.587,0.404,8.231,3.229,10.221,7.892c2,4.686,4.316,9.256,6.787,13.715C568.678,767.62,573.185,774.484,571.87,783.24z"
			}, {
				id: 34,
				name: "F4A: Xioceomos",
				connections: [ 17, 33, 35, 56, 57, 58],
				short: 'F4A',
				flag: {
					x: 444,
					y: 652
				},
				path: "M396.598,753.151c-5.079,1.236-7.291-1.64-9.598-5.6c-11.593-19.902-26.404-37.414-41.638-54.541c-5.124-5.761-10.941-10.955-16.802-15.988c-3.259-2.8-1.947-5.821-1.326-8.678c2.025-9.314,4.733-18.489,6.52-27.843c1.018-5.33,0.474-10.94,1.178-16.354c0.366-2.812,1.305-5.965,3.041-8.11c6.524-8.062,9.93-17.207,12.512-27.206c5.165-19.999,10.508-40.007,24.687-56.32c3.831-4.407,5.591-10.63,10.888-14.154c7.607-5.062,16.151-6.47,25.034-6.874c11.078-0.503,22.15-1.146,33.222-1.776c0.803-0.046,1.731-0.287,2.352-0.762c6.527-5,14.544-4.938,22.05-6.642c3.53-0.802,6.465-0.637,8.642,2.813c2.561,4.059,6.034,7.664,7.95,11.98c4.781,10.767,13.531,17.755,22.348,24.656c3.81,2.981,8.443,4.894,12.609,7.444c1.385,0.848,2.598,2.063,3.689,3.291c7.474,8.404,14.934,16.82,22.315,25.305c4.255,4.891,8.472,9.823,12.493,14.906c4.49,5.677,4.149,12.662,4.86,19.371c1.092,10.309-5.49,17.446-10.539,25c-7.1,10.622-15.515,20.383-22.363,31.151c-6.552,10.3-12.383,21.159-17.463,32.261c-3.684,8.052-5.227,17.064-8.592,25.293c-0.97,2.373-4.744,4.423-7.583,5.063c-11.614,2.617-23.421,4.373-35.046,6.948c-9.992,2.213-19.848,5.057-29.737,7.721c-6.497,1.75-12.879,3.981-19.437,5.429C407.538,752.113,402.026,752.445,396.598,753.151z"
			}, {
				id: 35,
				name: "F4B: Oglilyn",
				connections: [ 17, 18, 34, 36, 58, 59],
				short: 'F4B',
				flag: {
					x: 640,
					y: 553
				},
				path: "M478.789,501.632c11.678,2.075,20.894-3.147,30.638-6.061c0.943-0.282,1.908-0.569,2.881-0.663c8.787-0.85,13.209-6.263,16.108-14.521c3.831-10.912,3.659-22.004,4.494-33.126c0.135-1.797,0.542-3.601,1.04-5.34c2.123-7.425,4.327-14.828,6.916-23.656c7.888,2.539,16.567,5.465,25.333,8.099c4.356,1.309,8.856,2.165,13.324,3.066c2.592,0.523,5.242,0.805,7.878,1.057c2.302,0.221,5.032,1.093,6.861,0.208c6.025-2.918,12.195-2.121,18.459-2.118c2.603,0.001,5.644-1.107,7.735-2.697c10.812-8.221,21.603-16.501,31.913-25.33c3.621-3.101,5.851-7.821,8.72-11.799c0.667-0.925,1.353-1.837,2.134-2.896c5.213,5.354,9.373,10.619,12.256,17.799c3.141,7.822,10.097,14.127,15.458,21.041c13.375,17.251,32.559,25.674,51.675,34.405c10.209,4.662,19.403,10.726,26.515,20.159c5.27,6.991,10.751,14.229,18.844,18.917c3.573,2.069,5.822,6.424,6.338,8.689c-6.875,7.836-13.351,16.082-20.79,23.34c-3.872,3.778-9.512,5.703-14.224,8.669c-3.906,2.459-7.811,4.987-11.382,7.896c-7.051,5.742-12.88,13.049-21.744,16.448c-1.001,0.384-2.246,1.96-2.21,2.94c0.339,9.3-6.395,15.411-10.052,22.891c-0.647,1.322-1.98,2.603-1.98,3.902c0.007,10.847-8.676,17.867-11.809,27.311c-2.547,7.681-9.771,8.588-16.012,9.33c-6.956,0.826-14.157,0.004-21.215-0.554c-9.69-0.767-19.42-1.517-28.989-3.129c-6.137-1.035-12-3.656-18.011-5.484c-6.791-2.064-13.504-4.624-20.449-5.867c-5.777-1.036-11.84-0.461-17.775-0.641c-1.325-0.041-2.642-0.296-3.966-0.386c-4.581-0.311-7.438-2.246-7.323-7.319c0.288-12.8-9.447-20.061-16.364-28.697c-7.542-9.417-15.839-18.232-23.898-27.228c-1.418-1.583-3.112-3.592-4.977-3.983c-6.854-1.437-10.57-7.221-15.944-10.589c-10.713-6.713-15.364-17.837-21.742-27.759C482.289,506.149,480.904,504.486,478.789,501.632z"
			}, {
				id: 36,
				name: "F4C: Omialanto",
				connections: [ 7, 18, 19, 35, 59, 60],
				short: 'F4C',
				flag: {
					x: 856,
					y: 457
				},
				path: "M1016.003,477.798c-3.969,7.424-10.066,11.479-16.487,15.486c-4.08,2.546-7.221,6.588-10.822,9.917c-1.326,1.226-2.681,2.454-4.167,3.469c-5.622,3.84-11.407,7.451-16.917,11.443c-2.497,1.808-4.214,1.772-7.123,0.5c-3.761-1.644-8.19-2.495-12.308-2.42c-6.917,0.125-13.815,1.261-20.723,1.954c-6.101,0.611-12.221,1.823-18.301,1.654c-9.94-0.276-19.86-1.396-29.778-2.275c-12.894-1.144-25.78-2.371-38.664-3.619c-10.049-0.974-20.221-1.365-30.086-3.302c-6.118-1.2-13.205-2.665-15.533-10.417c-0.302-1.005-1.305-2.02-2.251-2.577c-10.399-6.121-16.973-15.897-24.807-24.631c-5.92-6.601-14.187-11.401-22.046-15.884c-10.202-5.819-21.382-9.938-31.511-15.866c-12.292-7.194-21.219-17.782-29.229-29.754c-3.877-5.795-6.835-12.073-10.833-17.717c-1.895-2.674-4.541-4.83-6.328-7.56c-0.631-0.964-0.284-3.492,0.574-4.366c9.473-9.651,19.916-17.738,32.426-23.546c9.184-4.264,17.225-10.991,25.763-16.638c0.407-0.269,0.942-0.656,1.02-1.064c1.593-8.386,9.36-10.32,15.233-13.739c2.821-1.642,7.33-0.911,10.983-0.482c6.901,0.811,13.758,2.064,20.594,3.345c11.083,2.077,21.791,2.424,31.339-5.094c1.177-0.927,3.292-1.67,4.592-1.269c9.326,2.877,18.437-0.348,27.633-0.631c1.661-0.052,3.346-0.117,4.97-0.432c9.493-1.843,17.063,1.247,23.903,7.969c2.296,2.255,6.458,3.023,9.912,3.616c11.888,2.039,23.913,3.333,35.736,5.667c5.592,1.104,10.696,4.746,16.289,5.771c8.458,1.548,13.652,7.474,20.099,11.998c4.507,3.163,10.688,4.067,16.226,5.603c6.836,1.896,14.084,2.646,20.602,5.265c8.167,3.282,14.31,9.225,16.656,18.288c1.124,4.343,3.114,7.739,8.187,8.966c3.741,0.905,3.701,3.836,0.89,6.744c-5.609,5.802-11.025,11.792-16.448,17.771c-1.944,2.143-1.622,4.117,0.759,5.902c2.374,1.781,4.784,3.588,6.826,5.722c3.211,3.354,3.288,7.189,0.062,10.617c-3.067,3.258-6.421,6.289-9.9,9.109c-8.578,6.95-5.386,14.595,3.073,17.052c4.415,1.282,8.538,3.607,12.734,5.585C1011.192,475.042,1013.446,476.407,1016.003,477.798z"
			}, {
				id: 37,
				name: "A5A: Appiatoph",
				connections: [ 19, 38, 60],
				short: 'A5A',
				flag: {
					x: 1206,
					y: 244
				},
				flagPos: {
					x: 1156,
					y: 180
				},
				path: "M1105.456,270.907c-4.224,0.44-7.914,0.535-11.47,1.278c-3.351,0.702-5.072-0.497-6.847-3.229c-2.326-3.578-5.343-6.702-8.001-10.071c-0.896-1.135-1.87-2.321-2.352-3.65c-4.05-11.17-12.05-19.195-20.892-26.58c-1.257-1.05-2.781-1.995-3.578-3.345c-4.635-7.855-11.787-11.181-20.507-12.177c-5.654-0.646-7.601-4.034-4.64-8.949c3.643-6.046,8.095-11.604,12.207-17.367c2.211-3.099,4.58-6.096,6.631-9.297c2.667-4.16,5.773-7.17,11.244-6.63c1.738,0.171,3.979,0.082,5.255-0.872c3.123-2.337,5.739-2.666,8.841-0.066c0.626,0.524,2.367-0.141,3.546-0.445c3.307-0.855,6.639-2.726,9.869-2.548c9.003,0.496,17.955,2.473,26.937,2.538c4.151,0.03,8.896-2.267,12.358-4.861c5.553-4.161,10.855-7.667,18.196-7.721c5.383-0.04,10.741-1.488,16.14-2.001c2.262-0.216,4.865-0.229,6.862,0.668c15.091,6.787,30.742,5.793,46.521,3.873c1.394-0.169,2.889,0.237,4.304,0.536c4.517,0.955,9.165,1.568,13.483,3.099c4.64,1.645,9.375,3.606,13.338,6.449c7.171,5.144,14.781,8.617,23.542,9.799c2.382,0.322,4.702,2.524,6.92,2.335c4.409-0.377,9.608-0.631,12.891-3.073c6.027-4.481,10.863-1.961,16.182,0.334c3.789,1.635,7.438,3.842,11.389,4.816c15.578,3.841,27.61,14.31,41.339,21.585c7.032,3.727,13.97,7.632,20.956,11.446c4.318,2.358,4.7,6.47,0.878,9.614c-0.129,0.106-0.248,0.235-0.394,0.306c-12.463,6.018-20.096,17.972-31.336,25.488c-1.649,1.103-3.412,2.036-5.065,3.132c-1.794,1.188-4.272,2.091-5.145,3.79c-3.375,6.576-9.551,9.805-15.029,14.011c-3.066,2.354-5.264,5.84-7.863,8.806c-3.097,3.533-6.634,4.861-11.533,3.766c-3.429-0.766-7.202,0.004-10.821,0.104c-5.941,0.165-11.881,0.362-17.823,0.511c-10.114,0.254-20.231,0.412-30.341,0.757c-3.808,0.13-7.594,0.848-11.402,0.988c-11.451,0.422-22.953,1.449-34.345,0.758c-7.77-0.471-15.776-2.5-22.979-5.505c-9.063-3.782-18.154-5.727-27.877-6.416c-11.517-0.815-23.303-0.364-34.293-5.12C1108.994,271.014,1106.863,271.119,1105.456,270.907z"
			}, {
				id: 38,
				name: "A5B: Cuchrarahe",
				connections: [ 19, 20, 37, 39],
				short: 'A5B',
				flag: {
					x: 1497,
					y: 286
				},
				path: "M1310.622,286.228c6.911-5.742,13.074-10.863,19.24-15.98c0.512-0.424,1.201-0.716,1.55-1.24c7.921-11.923,21.549-17.313,31.13-27.229c5-5.174,10.114-9.799,16.477-13.153c1.467-0.773,3.262-2.703,3.282-4.124c0.077-5.325,3.614-5.084,7.334-5.92c10.493-2.357,20.834-5.384,31.288-7.927c3.649-0.887,7.467-1.062,11.187-1.685c3.878-0.65,8.009-0.802,11.541-2.313c8.691-3.717,17.819-4.673,27.025-5.634c7.063-0.737,14.103-1.698,21.146-2.606c3.283-0.423,6.537-1.152,9.831-1.404c10.125-0.776,19.06,0.819,27.992,7.241c9.964,7.162,21.821,11.759,33.063,17.029c3.129,1.467,7.084,1.061,10.488,2.086c2.538,0.765,5.361,1.941,7.074,3.827c4.209,4.635,8.354,9.479,11.599,14.802c4.359,7.149,11.081,10.621,18.448,12.597c4.687,1.258,8.343,3.314,12.097,6.193c6.908,5.297,13.163,10.857,17.686,18.555c2.431,4.136,2.736,7.683,0.14,10.895c-4.446,5.499-9.262,10.804-14.531,15.507c-6.654,5.939-14.17,10.915-20.815,16.864c-3.219,2.881-5.59,6.863-7.816,10.656c-2.571,4.378-5.291,7.572-11.008,7.906c-16.047,0.939-29.385,7.678-40.81,19.091c-3.266,3.263-8.925,4.004-13.178,6.441c-4.925,2.825-9.663,2.963-14.745,0.785c-1.661-0.712-3.488-1.101-5.275-1.443c-8.93-1.708-17.881-3.308-26.806-5.041c-3.718-0.722-7.39-1.679-11.081-2.529c2.438-8.743,1.23-9.604-6.813-13.74c-7.057-3.628-12.839-9.656-19.714-13.731c-9.264-5.49-15.914-13.159-21.407-22.129c-0.419-0.685-1.163-1.692-1.74-1.682c-12.026,0.207-24.58-6.673-35.942,2.17c-3.894,3.03-7.595,6.546-10.575,10.457c-5.668,7.436-13.195,8.188-21.464,7.166c-0.694-0.085-1.557-0.63-1.933-1.222c-8.647-13.617-21.939-21.746-35.063-30.185C1316.444,293.6,1314.3,290.172,1310.622,286.228z"
			}, {
				id: 39,
				name: "A5C: Eokkirune",
				connections: [ 20, 21, 38, 40],
				short: 'A5C',
				flag: {
					x: 1729,
					y: 380
				},
				path: "M1565.534,433.636c6.729-4.007,7.82-10.67,7.916-17.035c0.042-2.823-3.323-5.74-5.252-8.539c-2.483-3.604-4.994-7.197-7.648-10.677c-2.811-3.687-0.804-6.456,1.593-9.069c3.793-4.136,4.134-6.522,0.13-10.573c-4.766-4.823-9.985-9.198-15.684-14.383c2.436-2.251,4.919-5.107,7.924-7.223c9.766-6.877,20.405-11.636,32.602-11.96c6.851-0.183,9.976-4.807,13.012-10.058c2.105-3.641,4.647-7.298,7.801-10.013c8.78-7.558,18.281-14.292,26.903-22.016c5.134-4.599,9.573-10.156,10.807-17.493c0.186-1.112,1.402-2.653,2.428-2.926c7.163-1.908,14.474-3.291,21.584-5.364c3.04-0.886,5.861-2.812,8.529-4.633c8.569-5.849,17.604-11.202,25.374-17.988c10.182-8.892,21.96-6.291,33.43-6.585c1.202-0.031,2.458,1.59,3.669,2.471c2.582,1.878,4.978,4.098,7.765,5.587c4.475,2.388,9.067,4.71,13.864,6.288c4.371,1.438,9.18,1.502,13.619,2.784c9.573,2.764,17.307,12.206,17.914,22.167c0.57,9.33,5.459,16.58,10.658,23.614c5.52,7.468,11.515,14.599,17.546,21.668c2.993,3.508,1.19,6.883,0.472,10.299c-1.32,6.276-2.453,12.639-4.434,18.715c-1.597,4.903-3.614,9.984-6.707,14.021c-5.922,7.731-3.967,14.584,4.316,19.539c5.877,3.516,10.175,9.703,15.051,14.818c0.532,0.558,0.662,2.208,0.233,2.863c-4.701,7.176-4.548,17.341-14.095,21.623c-5.277,2.367-5.009,4.27-1.031,8.62c2.434,2.662,4.337,5.817,6.405,8.802c2.61,3.768,5.204,7.55,7.685,11.403c0.926,1.438,1.512,3.096,2.729,5.655c-13.079,1.662-25.191,3.445-37.361,4.672c-10.572,1.066-21.213,1.452-31.814,2.261c-1.952,0.149-3.882,0.811-5.786,1.361c-11.248,3.251-22.15,3-32.771-2.555c-3.187-1.667-6.842-2.434-10.26-3.67c-7.561-2.737-15.31-5.067-22.61-8.385c-8.41-3.823-16.241-8.688-25.741-10.081c-3.082-0.451-5.472-4.584-8.554-6.393c-2.733-1.603-5.951-2.442-9.029-3.37c-1.555-0.469-3.461,0.023-4.886-0.625c-6.921-3.147-12.854-1.055-18.634,2.911c-4.907,3.367-9.939,6.553-13.71,9.027c-6.685-1.451-12.618-3.112-18.666-3.962C1584.356,448.039,1573.136,442.056,1565.534,433.636z"
			}, {
				id: 40,
				name: "A5D: Iyoriyaz",
				connections: [ 21, 22, 39, 41],
				short: 'A5D',
				flag: {
					x: 1952,
					y: 447
				},
				flagPos: {
					x: 1902,
					y: 383
				},
				path: "M1816.773,437.807c2.872-2.391,6.4-4.208,8.242-7.099c3.581-5.62,6.533-11.713,9.044-17.896c0.729-1.792-0.178-5.309-1.62-6.735c-5.7-5.632-9.75-12.982-17.867-16.217c-4.35-1.733-5.393-8.038-1.875-11.547c7.287-7.27,8.563-16.365,10.094-25.842c1.883-11.652,3.73-17.348,16.26-18.773c6.532-0.744,13.021-2.049,19.568-2.454c8.35-0.517,15.675-2.924,22.668-7.748c8.911-6.147,18.13-12.48,29.994-10.528c5.369,0.883,9.88,2.989,13.124,7.93c2.116,3.224,5.131,6.647,8.542,8.073c7.535,3.148,8.984,9.942,11.875,16.135c1.169,2.501,2.927,5.289,5.195,6.621c12.407,7.288,26.284,9.917,40.364,11.106c13.964,1.179,27.026,4.728,40.203,9.68c8.404,3.158,12.978,8.698,18.219,14.631c1.948,2.208,4.439,4.046,6.953,5.623c6.556,4.111,10.034,9.767,10.05,17.611c0.004,1.902,1.01,3.782,1.359,5.708c0.346,1.896,1.281,4.326,0.496,5.667c-2.579,4.405-0.926,8.325,0.41,12.398c0.514,1.572,1.564,3.135,1.538,4.688c-0.167,9.753-0.491,19.507-0.989,29.248c-0.064,1.276-1.15,2.834-2.225,3.669c-7.604,5.914-15.434,11.541-22.975,17.531c-4.531,3.6-8.734,7.624-12.978,11.574c-7.134,6.642-13.717,13.989-21.438,19.847c-4.669,3.542-11.028,4.872-16.664,7.107c-1.183,0.469-3.13,0.104-3.687,0.875c-2.987,4.13-6.712,2.539-10.696,2.374c-7.833-0.323-15.716,0.709-23.562,0.511c-3.767-0.095-7.561-1.506-11.226-2.684c-13.174-4.236-26.315-8.577-39.435-12.983c-5.551-1.864-11.092-3.81-16.475-6.101c-1.652-0.703-2.781-2.66-4.12-4.071c-5.555-5.853-10.648-12.246-16.763-17.437c-7.313-6.208-15.443-11.464-23.323-16.985c-3.703-2.594-7.368-4.245-9.776-9.171C1829.081,453.556,1822.569,446.1,1816.773,437.807z"
			}, {
				id: 41,
				name: "B5A: Strennearial",
				connections: [ 22, 40, 42],
				short: 'B5A',
				flag: {
					x: 2127,
					y: 588
				},
				path: "M2056.812,654.266c3.335-5.12,5.873-9.447,8.853-13.446c2.287-3.069,2.49-5.668,0.648-9.105c-3.67-6.845-6.857-13.949-10.254-20.941c-0.361-0.745-0.628-1.634-1.208-2.158c-8.517-7.684-11.231-18.904-17.142-28.175c-2.016-3.16-3.812-6.82-4.392-10.461c-1.505-9.451-7.54-16.192-13.286-22.902c-3.305-3.857-8.322-6.246-12.565-9.302c-0.54-0.389-1.073-0.792-1.578-1.226c-6.799-5.833-6.621-6.014,0.963-10.189c3.118-1.716,5.571-4.676,8.248-7.157c9.204-8.533,18.077-17.454,27.646-25.556c8.352-7.072,17.16-13.723,26.368-19.621c5.487-3.514,8.927-8.251,12.321-13.347c0.639-0.961,0.998-2.185,1.809-2.945c4.037-3.791,8.1-7.562,12.307-11.161c5.164-4.42,14.52-4.942,20.578-1.903c8.948,4.488,18.262,8.27,27.07,13.001c4.922,2.643,9.012,6.788,13.705,9.914c6.74,4.491,13.65,8.733,20.57,12.946c2.111,1.285,4.527,2.059,6.746,3.177c10.977,5.532,12.405,10.19,6.638,21.159c-1.152,2.192-2.322,4.423-3.082,6.767c-3.61,11.15-2.907,13.459,6.257,20.846c8.531,6.877,12.205,16.566,15.461,26.494c0.285,0.867,0.254,2.093-0.151,2.886c-1.655,3.235,0.425,4.377,2.841,4.945c6.222,1.463,9.762,5.254,12.072,11.215c2.016,5.2,5.103,10.055,8.2,14.741c2.082,3.147,2.142,5.391-0.291,8.369c-3.338,4.089-5.839,8.872-9.243,12.897c-4.241,5.016-9.205,9.31-14.219,13.634c-6.41,5.529-10.44,13.854-15.355,21.071c-7.548,11.082-14.521,16.164-27.692,12.431c-5.095-1.444-10.184-2.98-15.371-3.977c-2.081-0.4-4.595,0.118-6.598,0.964c-2.884,1.218-5.466,3.142-8.203,4.718c-4.307,2.481-8.759,2.979-13.843,2.664c-19.109-1.184-37.208-7.653-56.05-10.076C2063.3,655.162,2061.016,654.837,2056.812,654.266z"
			}, {
				id: 42,
				name: "B5B: Atherathios",
				connections: [ 22, 23, 41, 43],
				short: 'B5B',
				flag: {
					x: 2159,
					y: 786
				},
				path: "M2112.646,856.184c-10.545-15.866-20.469-30.676-30.256-45.576c-4.26-6.487-7.873-13.427-12.444-19.675c-5.371-7.342-10.962-14.663-17.397-21.044c-5.411-5.366-10.156-10.81-12.996-17.926c-3.822-9.58-12.035-15.49-19.15-22.296c-0.829-0.792-1.72-1.52-3.183-2.806c2.938-2.256,5.426-4.707,8.37-6.33c9.198-5.071,14.026-13.701,17.709-22.71c4.868-11.906,8.582-24.29,12.642-36.518c0.866-2.609,2.026-3.955,4.929-3.362c10.535,2.151,21.033,4.543,31.64,6.263c11.723,1.901,23.527,4.015,35.339,4.301c5.027,0.122,10.313-3.887,15.19-6.55c2.989-1.632,5.389-2.119,8.804-1.052c6.62,2.066,13.433,3.891,20.296,4.686c6.046,0.699,11.915-1.22,16.032-6.242c2.524-3.078,4.91-3.831,8.374-1.359c4.306,3.071,8.949,5.665,13.312,8.661c1.304,0.896,2.661,2.285,3.134,3.73c3.083,9.427,9.542,15.014,18.757,18.316c5.976,2.142,11.43,5.704,17.335,8.092c3.748,1.515,7.854,2.284,11.873,2.948c3.973,0.657,7.303,4.465,7.141,8.452c-0.114,2.799-0.397,5.845,0.511,8.383c2.244,6.274,1.893,12.427-0.965,18.055c-1.944,3.831-5.156,7.2-8.36,10.171c-6.523,6.049-7.435,9.441-2.367,16.606c9.277,13.116,8.805,26.93,2.409,40.573c-4.818,10.276-3.85,19.115,2.805,27.838c1.587,2.079,2.967,4.315,5.196,7.586c-3.139,0.559-5.247,1.085-7.386,1.289c-10.21,0.972-20.412,2.128-30.646,2.672c-6.432,0.342-12.945-0.773-19.368-0.368c-13.204,0.833-26.427,1.297-39.31,5.352c-7.008,2.206-14.647,2.368-21.977,3.601C2136.301,852.018,2123.984,854.211,2112.646,856.184z"
			}, {
				id: 43,
				name: "B5C: Xeaxudin",
				connections: [ 23, 24, 42, 44],
				short: 'B5C',
				flag: {
					x: 2199,
					y: 962
				},
				flagPos: {
					x: 2149,
					y: 902
				},
				path: "M2071.78,1026.597c-3.024-8.861-6.461-18.164-9.321-27.641c-1.419-4.699-1.678-9.737-2.631-14.589c-1.672-8.509-4.969-16.29-10.865-22.79c-6.74-7.428-6.244-17.14,0.562-24.165c3.358-3.466,5.9-7.833,8.328-12.069c6.774-11.828,17.708-19.644,27.145-28.927c3.521-3.463,6.399-7.622,9.318-11.645c5.752-7.925,11.187-16.086,17.1-23.886c1.194-1.577,3.845-2.477,5.972-2.852c12.83-2.264,25.667-4.526,38.566-6.329c17.328-2.421,34.26-7.195,51.996-7.342c18.152-0.149,36.291-1.683,54.441-2.451c2.767-0.117,5.956-3.462,8.387,0.77c1.47,2.56,2.94,5.127,4.585,7.574c2.015,3,4.219,5.872,6.33,8.807c1.843,2.56,3.37,5.44,5.595,7.603c1.881,1.829,4.421,3.27,6.928,4.086c2.954,0.961,6.173,1.226,9.301,1.51c13.162,1.194,21.119,10.17,25.735,20.664c4.335,9.854,5.423,21.29,1.401,32.147c-1.457,3.934-1.668,7.159,1.535,10.446c3.016,3.095,1.992,8.735-0.865,12.134c-2.794,3.324-5.59,6.988-7.09,10.988c-3.593,9.587-6.271,19.515-9.704,29.168c-0.62,1.746-2.847,3.401-4.712,4.141c-8.865,3.514-17.654,7.573-26.869,9.75c-9.032,2.133-17.247,6.308-27.787,4.843c-14.638-2.034-29.867,0.089-44.838,0.603c-11.125,0.382-22.253,0.873-33.357,1.624c-7.59,0.513-15.129,1.75-22.717,2.272c-3.283,0.226-6.823,0.026-9.908-0.999c-3.578-1.189-6.467-1.364-9.877,0.591c-12.461,7.146-25.415,12.459-40.272,12.578C2086.623,1023.271,2079.073,1025.43,2071.78,1026.597z"
			}, {
				id: 44,
				name: "B5D: Stronolyn",
				connections: [ 24, 25, 43, 45],
				short: 'B5D',
				flag: {
					x: 2178,
					y: 1135
				},
				path: "M2066.971,1032.259c4.834-1.665,8.578-3.472,12.52-4.194c6.019-1.103,12.193-2.152,18.268-1.988c14.185,0.384,25.856-6.328,37.736-12.443c3.049-1.569,5.206-1.532,8.291-0.344c3.111,1.198,7.023,2.159,10.08,1.341c13.912-3.72,28.104-2.325,42.165-3.185c7.947-0.486,15.875-1.355,23.827-1.683c11.145-0.46,22.304-0.728,33.458-0.763c4.372-0.014,9.038,2.011,13.06,1.024c7.925-1.946,15.456-5.451,23.221-8.104c3.711-1.266,7.582-2.056,10.861-2.924c0.701,3.5,1.488,7.005,2.051,10.547c0.133,0.835-0.23,2.024-0.801,2.653c-5.448,5.998-9.936,12.306-13.304,19.984c-2.437,5.558-9.219,9.183-13.968,13.768c-1.689,1.631-3.418,3.369-4.568,5.378c-2.272,3.962-3.906,8.295-6.253,12.206c-3.978,6.632-4.96,10.349,2.842,13.231c1.016,0.376,2.133,1.191,2.643,2.113c4.448,8.057,8.927,16.105,13.025,24.342c1.108,2.229,1.116,5.072,1.342,7.659c0.758,8.678,1.225,17.385,2.188,26.038c0.217,1.94,1.993,3.709,3.059,5.553c1.6,2.768,3.42,5.441,4.658,8.361c0.318,0.752-0.899,2.688-1.898,3.385c-11.23,7.835-22.333,15.891-33.959,23.103c-5.106,3.168-11.197,5.019-17.07,6.627c-10.451,2.86-21.017,5.388-31.65,7.469c-8.271,1.619-16.697,2.533-25.09,3.423c-8.908,0.943-17.888,1.248-26.782,2.288c-7.17,0.839-14.224,2.731-21.399,3.454c-5.523,0.556-11.162,0.124-16.743-0.058c-5.409-0.176-10.822-0.459-16.206-0.982c-1.707-0.166-4.598-1.017-4.773-1.959c-1.003-5.383-5.346-8-8.85-10.994c-8.923-7.623-14.689-17.413-20.566-27.273c-2.494-4.183-5.968-7.804-9.148-11.551c-5.05-5.951-10.63-11.497-15.242-17.762c-5.065-6.876-11.252-12.168-18.728-15.98c-4.015-2.047-4.444-4.394-1.981-7.904c2.957-4.214,5.458-8.778,8.704-12.742c1.948-2.378,5.064-3.759,7.438-5.837c3.716-3.253,8.723-6.057,10.585-10.214c6.012-13.423,10.86-27.367,16.089-41.137C2066.676,1034.671,2066.814,1032.992,2066.971,1032.259z"
			}, {
				id: 45,
				name: "C5A: Stuckodod",
				connections: [ 25, 44, 46],
				short: 'C5A',
				flag: {
					x: 2179,
					y: 1329
				},
				path: "M2109.274,1425.556c1.396-7.176,2.993-12.913,3.452-18.741c0.242-3.089-0.796-6.766-2.451-9.436c-7.067-11.407-14.505-22.59-22.027-33.705c-0.95-1.403-3.229-1.883-4.848-2.863c-3.052-1.848-7.225-3.038-8.9-5.756c-6.227-10.098-16.063-16.682-23.465-25.545c-4.708-5.637-8.897-11.706-13.498-17.818c2.008-2.123,3.763-4.078,5.623-5.926c6.707-6.662,11.869-14.161,13.796-23.661c0.365-1.801,1.858-3.466,3.091-4.982c7.719-9.499,14.27-19.396,14.883-32.291c0.252-5.297,2.187-10.019,7.332-13.378c5.619-3.668,6.823-10.161,8.004-16.486c0.846-4.536,2.575-8.909,3.545-12.137c7.879,0,14.224-0.855,20.234,0.197c9.305,1.631,18.129,2.492,27.372-0.877c4.81-1.754,10.481-1.127,15.763-1.607c14.39-1.312,28.816-2.331,43.15-4.097c6.684-0.823,13.164-3.22,19.785-4.679c4.01-0.884,8.26-2.254,12.123-1.644c2.36,0.373,4.438,3.908,6.215,6.336c4.774,6.526,8.891,13.579,14.05,19.771c8.933,10.719,18.577,20.843,27.691,31.417c6.733,7.813,9.897,17.449,13.091,27.071c3.226,9.716,4.783,19.592,4.483,29.816c-0.611,20.849-7.114,39.242-21.692,54.611c-2.882,3.038-4.557,7.261-6.615,11.03c-5.964,10.93-15.371,16.106-27.489,17.895c-5.586,0.824-10.931,3.499-16.288,5.588c-4.731,1.845-9.191,5.33-14.01,5.842c-15.585,1.655-29.494,7.21-42.539,15.522c-4.476,2.853-8.854,3.28-13.108-0.824c-0.875-0.844-2.978-0.917-4.372-0.638c-6.385,1.278-12.465,4.09-19.306,0.677c-1.819-0.906-5.53,1.394-8.11,2.729C2119.559,1419.391,2115.074,1422.195,2109.274,1425.556z"
			}, {
				id: 46,
				name: "C5B: Kazazriel",
				connections: [ 25, 26, 45, 47],
				short: 'C5B',
				flag: {
					x: 2003,
					y: 1459
				},
				flagPos: {
					x: 1953,
					y: 1395
				},
				path: "M1965.225,1554.373c-1.807-2.871-3-5.122-4.521-7.123c-6.169-8.121-12.209-16.355-18.734-24.184c-6.963-8.353-14.503-16.223-21.628-24.445c-4.304-4.968-8.247-10.245-12.453-15.301c-1.681-2.02-3.323-4.339-5.509-5.627c-11.807-6.952-20.774-18.271-34.43-22.378c-0.841-0.253-1.453-1.266-3.095-2.771c5.152-5.899,10.202-11.692,15.269-17.47c0.546-0.622,1.572-1.069,1.73-1.749c2.388-10.245,12.325-15.375,16.447-24.317c2.662-5.774,5.318-11.883,6.136-18.085c0.823-6.25,4.43-10.201,8.195-14.074c4.838-4.974,11.096-8.671,15.42-13.99c1.852-2.277,1.124-7.451,0.24-10.975c-1.548-6.164-4.122-12.07-6.796-19.571c2.985,0.874,4.436,1.19,5.804,1.719c5.11,1.972,10.107,4.114,15.438,0.334c1.704-1.208,3.899-1.984,5.979-2.355c6.817-1.217,13.677-2.959,20.533-3.016c10.359-0.084,19.151-4.839,28.61-7.658c3.814-1.136,8.031-1.698,11.987-1.415c7.786,0.557,14.821-1.303,21.484-5c2.698-1.497,3.755-1.048,5.776,1.683c5.598,7.551,12.011,14.5,18.161,21.635c5.5,6.378,10.85,12.911,16.725,18.928c2.676,2.741,6.434,4.442,9.746,6.544c1.479,0.938,3.573,1.327,4.521,2.608c3.547,4.79,6.803,9.804,10.043,14.815c3.324,5.143,6.393,10.452,9.781,15.552c2.878,4.331,4.525,8.4,2.354,13.87c-1.601,4.032-0.563,9.176-2.362,13.052c-3.58,7.708-2.72,15.262-1.392,23.05c0.534,3.138,0.308,5.417-3.575,6.891c-4.543,1.724-6.557,5.838-7.499,10.864c-1.418,7.554-3.79,14.949-8.593,21.21c-2.898,3.778-5.212,7.146-3.102,12.623c0.998,2.586-0.594,6.94-2.32,9.664c-5.199,8.206-10.806,16.187-16.732,23.885c-2.838,3.686-6.484,6.93-10.305,9.602c-1.932,1.352-5.325,1.883-7.606,1.223c-6.41-1.855-10.738,1.61-15.52,4.611c-2.102,1.318-4.695,1.86-7.078,2.723c-3.209,1.162-6.92,1.626-9.554,3.562c-8.123,5.967-17.22,6.136-26.418,5.015C1979.03,1557.632,1971.802,1555.702,1965.225,1554.373z"
			}, {
				id: 47,
				name: "C5C: Pilitallios",
				connections: [ 26, 27, 46, 48],
				short: 'C5C',
				flag: {
					x: 1802,
					y: 1573
				},
				path: "M1608.901,1523.58c4.063-4.074,8.591-4.118,13.37-3.562c1.883,0.221,3.993,0.194,5.742-0.437c4.903-1.771,9.711-3.828,14.48-5.941c2.877-1.275,6.1-2.341,8.322-4.408c7.17-6.666,15.507-12.146,20.973-20.618c1.239-1.921,3.677-3.182,5.759-4.411c1.692-0.997,4.061-1.055,5.476-2.282c8.072-7.002,17.894-1.546,26.59-3.927c1.108-0.303,2.647,0.346,3.798,0.927c7.358,3.716,15.128,3.1,21.477-0.921c7.681-4.863,16.115-6.649,24.441-9.121c10.107-3.001,19.887-7.431,30.721-7.484c5.307-0.025,10.628-0.357,15.915-0.066c9.3,0.51,17.897,0.26,27.061-3.843c8.018-3.589,18.052-2.68,27.2-3.714c0.627-0.071,1.426,0.041,1.927,0.386c10.158,6.995,19.9,14.704,30.549,20.843c7.448,4.293,12.891,10.214,18.303,16.382c7.164,8.165,13.996,16.622,20.979,24.945c6.02,7.177,12.114,14.291,18.054,21.533c3.456,4.216,6.86,8.509,9.829,13.064c0.562,0.861-0.555,3.743-1.712,4.645c-6.626,5.154-11.477,11.626-15.439,18.929c-1.891,3.484-3.888,7.003-6.395,10.047c-5.126,6.224-10.465,12.293-16.022,18.136c-6.251,6.571-12.978,12.691-19.229,19.262c-4.023,4.227-7.704,8.808-11.232,13.462c-0.951,1.254-0.787,3.354-1.2,5.389c-7.921-1.106-15.688,0.829-23.143,4.509c-5.662,2.794-11.293,1.004-17.011-0.16c-14.919-3.038-29.811-3.514-44.822,0.079c-5.795,1.388-11.946,1.774-17.902-0.661c-2.709-1.108-5.747-1.71-8.68-1.918c-10.919-0.776-21.852-1.488-32.791-1.79c-3.348-0.092-6.837,0.896-10.075,1.958c-3.643,1.196-6.51,1.132-9.575-1.647c-2.385-2.161-5.488-4.515-8.467-4.808c-4.271-0.42-5.699-3.442-8.02-5.803c-4.119-4.192-7.98-8.673-12.377-12.548c-3.905-3.44-8.798-5.803-12.519-9.4c-4.762-4.604-9.266-9.225-12.01-15.911c-3.054-7.445-8.073-14.47-13.584-20.43c-7.502-8.112-16.252-15.077-24.54-22.451c-1.442-1.284-3.367-2.018-4.854-3.259c-3.093-2.582-6.077-5.298-9.033-8.035c-1.324-1.227-2.237-3.091-3.748-3.886C1610.953,1532.246,1609.755,1528.137,1608.901,1523.58z"
			}, {
				id: 48,
				name: "C5D: Xishotish",
				connections: [ 27, 28, 47, 49],
				short: 'C5D',
				flag: {
					x: 1522,
					y: 1650
				},
				path: "M1320.127,1590.316c6.601-3.299,12.916-6.442,19.222-9.607c5.618-2.818,11.299-5.525,16.808-8.546c2.979-1.632,6.251-3.318,4.844-8.001c-0.247-0.823,1.389-2.846,2.571-3.363c8.628-3.773,17.352-7.329,26.068-10.898c5.012-2.053,7.068-6.949,4.051-10.826c7.778-5.94,15.103-12.346,19.24-21.615c0.341-0.765,3.242-0.924,4.743-0.541c6.572,1.677,13.02,3.846,19.604,5.467c5.119,1.26,10.426,1.748,15.553,2.981c8.98,2.161,17.776,5.345,26.859,6.738c7.068,1.085,14.659,1.163,21.656-0.187c13.501-2.603,26.848-5.402,40.674-3.313c1.308,0.197,2.606,0.493,3.884,0.841c13.074,3.561,26.081,7.397,39.243,10.59c5.266,1.278,10.867,1.495,16.326,1.594c13.828,0.251,25.101,5.369,34.512,15.657c5.904,6.457,13.013,11.801,19.447,17.788c6.094,5.67,10.364,12.416,13.693,20.208c2.442,5.714,6.868,10.994,11.522,15.25c6.28,5.742,13.894,10.002,20.408,15.52c3.17,2.686,6.234,6.489,7.259,10.343c0.635,2.385-1.957,6.631-4.305,8.622c-7.719,6.546-16.006,12.418-24.039,18.597c-9.752,7.501-19.7,14.773-29.099,22.696c-4.521,3.811-8.089,8.792-11.883,13.412c-5.944,7.239-13.103,12.671-22.11,15.436c-4.365,1.341-7.955,0.89-12.471-1.668c-4.219-2.39-10.585-1.885-15.865-1.326c-14.945,1.584-29.779,4.284-44.74,5.604c-5.14,0.453-10.948-0.95-15.707-3.13c-9.5-4.349-19.385-5.015-29.501-5.975c-9.104-0.865-18.354-2.578-26.979-5.544c-10.917-3.755-21.409-1.941-31.789,0.499c-6.225,1.464-11.496,0.59-16.712-2.054c-6.94-3.52-13.821-7.229-20.354-11.438c-1.902-1.225-3.914-4.765-3.455-6.657c0.98-4.047-0.508-6.551-3.131-8.728c-4.715-3.914-9.84-7.347-14.446-11.377c-4.85-4.246-9.329-8.918-13.897-13.479c-3.266-3.258-6.536-6.528-9.583-9.987c-9.554-10.847-16.378-23.852-27.815-33.336C1325.894,1602.798,1323.717,1596.185,1320.127,1590.316z"
			}, {
				id: 49,
				name: "D5A: Gegleadore",
				connections: [ 28, 48, 50],
				short: 'D5A',
				flag: {
					x: 1264,
					y: 1711
				},
				flagPos: {
					x: 1214,
					y: 1651
				},
				path: "M1246.459,1764.649c-6.883-1.665-13.663-2.935-20.158-5.071c-2.379-0.783-4.377-3.395-6.039-5.563c-4.516-5.893-7.445-6.544-13.875-2.763c-3.323,1.954-6.521,4.91-10.757,1.37c-0.664-0.555-2.679,0.44-4.045,0.809c-3.104,0.837-6.143,2.111-9.297,2.521c-7.229,0.94-14.502,1.797-21.778,2.008c-3.022,0.086-6.226-1.26-9.105-2.511c-2.393-1.039-4.897-2.5-6.541-4.457c-5.433-6.471-12.609-7.779-20.457-8.287c-10.652-0.69-20.458-4.034-27.389-12.614c-1.313-1.626-1.029-5.768,0.106-7.903c2.937-5.523,4.255-12.215,10.592-15.685c1.116-0.61,1.185-3.918,1.019-5.92c-0.354-4.244,0.824-7.455,4.577-9.707c6.484-3.891,11.018-8.28,11.221-17.208c0.095-4.188,5.682-9.201,9.952-12.137c7.199-4.948,11.647-11.633,15.659-18.952c1.516-2.765,2.786-5.873,4.958-8.027c5.105-5.062,5.14-12.02,7.48-18.087c0.57-1.479-0.179-3.467-0.372-5.837c6.833-2.773,13.639-6.468,20.912-8.215c6.606-1.586,13.727-1.441,20.609-1.338c5.888,0.09,11.753,1.675,17.64,1.751c7.718,0.1,15.445-0.84,23.172-0.909c3.356-0.029,6.948,0.437,10.026,1.683c4.093,1.657,6.941,1.203,9.39-2.485c0.68-1.026,1.794-2.241,2.883-2.445c8.563-1.606,14.761-7.299,21.514-12.062c1.877-1.322,3.615-3.614,6.409-1.208c0.346,0.299,2.047-1.204,3.214-1.586c2.29-0.751,5.247-2.503,6.858-1.698c4.132,2.064,8.972,4.515,11.22,8.214c7.257,11.947,15.904,22.603,25.689,32.489c2.349,2.372,3.67,5.727,5.736,8.421c3.813,4.973,7.656,9.942,11.81,14.628c3.721,4.199,7.699,8.212,11.882,11.951c5.9,5.279,11.793,10.656,18.245,15.203c6.567,4.629,7.857,6.423,5.563,14.28c-1.927,6.603-0.754,12.617,1.934,18.807c1.671,3.847,2.365,8.22,2.84,12.432c0.185,1.628-1.101,3.775-2.329,5.132c-1.993,2.202-4.522,3.91-6.771,5.89c-4.361,3.842-6.775,8.372-5.939,14.498c0.81,5.938-0.887,10.871-7.119,13.221c-0.747,0.281-1.658,0.793-1.976,1.447c-3.153,6.5-8.001,5.109-13.426,3.466c-7.316-2.216-14.123-0.795-21.614,1.699c-9.96,3.317-20.028,8.503-31.591,5.237c-4.295-1.213-9.488,0.164-14.148,1.023c-4.022,0.742-7.598,1.839-9.2-3.472c-0.218-0.724-1.443-1.638-2.193-1.63c-7.416,0.082-11.342-4.761-14.581-10.354c-1.752-3.025-3.46-3.521-6.358-1.519c-2.831,1.956-6.087,3.301-8.89,5.288C1250.973,1760.346,1248.67,1762.712,1246.459,1764.649z"
			}, {
				id: 50,
				name: "D5B: Wrorrulan",
				connections: [ 28, 29, 49, 51],
				short: 'D5B',
				flag: {
					x: 1000,
					y: 1669
				},
				path: "M978.837,1540.726c2.868,3.909,5.007,2.163,7.114-0.112c3.285-3.546,6.625-5.021,11.229-1.654c2.876,2.104,5.962,1.429,9.631-0.195c6.406-2.839,13.528-4.064,20.354-5.951c6.508-1.799,13.23-3.048,19.475-5.513c6.627-2.614,11.697-2.36,15.138,3.669c5.088,8.917,12.653,15.07,20.306,21.497c9.121,7.661,18.746,15.264,25.875,24.627c10.602,13.923,24.712,21.005,40.321,26.845c4.01,1.501,7.093,5.596,10.433,8.682c0.696,0.644,1.167,2.296,0.846,3.147c-2.074,5.513-4.006,11.137-6.732,16.334c-3.464,6.604-7.13,13.228-11.674,19.096c-3.271,4.226-8.061,7.3-12.278,10.76c-4.954,4.064-8.721,8.603-8.053,15.601c0.517,5.421-4.104,7.352-7.525,9.566c-5.721,3.702-9.14,8.018-7.504,15.229c0.223,0.98-0.603,2.861-1.475,3.323c-7.281,3.863-7.687,12.036-11.413,18.081c-1.532,2.486-3.561,4.439-5.06,6.555c-3.946,5.571-9.007,6.363-14.825,6.478c-0.312,0.006-0.703,0.127-0.919,0.337c-6.163,5.988-13.36,3.619-20.574,3.046c-3.661-0.291-8.101,0.673-11.124,2.675c-6.21,4.116-11.872,4.807-18.619,1.479c-3.863-1.906-8.512-2.143-12.633-3.617c-6.04-2.162-12.044-4.508-17.828-7.268c-3.404-1.625-6.192-1.267-9.398,0.225c-2.961,1.377-6.436,1.759-9.225,3.374c-4.638,2.686-9.306,5.583-13.174,9.227c-2.144,2.019-3.767,2.895-6.396,2.169c-6.602-1.821-12.902-3.769-18.739-8.027c-5.396-3.938-12.256-6.047-18.704-8.29c-2.915-1.015-3.708-2.478-2.458-4.579c2.962-4.982,0.181-8.359-2.98-11.329c-2.581-2.425-4.998-4.338-3.132-8.371c0.31-0.67-0.68-2.463-1.54-3.07c-7.587-5.358-15.083-10.897-23.054-15.63c-2.611-1.549-6.531-0.99-9.865-1.2c-3.031-0.19-6.255,0.512-9.084-0.284c-7.31-2.056-13.561-1.154-19.439,3.985c-4,3.497-8.615,6.322-13.114,9.198c-1.069,0.684-2.846,0.707-4.178,0.441c-3.205-0.639-6.31-1.773-9.51-2.441c-4.253-0.888-6.053-6.299-3.81-11.457c1.704-3.918,3.274-7.898,4.745-11.911c0.375-1.022,0.462-2.369,0.136-3.394c-1.823-5.724,1.961-8.758,5.325-12.277c3.76-3.934,6.925-8.434,10.614-12.442c4.007-4.355,8.304-8.446,12.507-12.62c1.164-1.156,3.048-1.967,3.566-3.329c2.337-6.14,4.297-12.425,6.403-18.652c0.786-2.324,1.348-4.766,2.45-6.932c3.233-6.354,7.296-12.358,9.866-18.954c2.175-5.585,2.421-11.893,4.117-17.706c0.826-2.833,2.925-5.329,4.624-7.857c0.721-1.073,2.275-1.661,2.802-2.775c3.767-7.964,10.87-11.325,18.666-13.631c2.117-0.626,4.524-0.788,6.721-0.524c5.019,0.602,9.968,1.787,14.987,2.371c3.563,0.416,5.175-1.606,5.998-5.158c0.697-3.008,1.925-7.09,4.182-8.261c3.442-1.786,7.765-0.958,10.447,3.029c4.786,7.114,13.394,6.16,20.05,9.337c1.467,0.699,3.295,0.688,4.692,1.475c5.253,2.961,8.227,2.147,10.899-3.25C977.681,1543.183,978.022,1542.439,978.837,1540.726z"
			}, {
				id: 51,
				name: "D5C: Cleoseotophy",
				connections: [ 29, 30, 50, 52],
				short: 'D5C',
				flag: {
					x: 734,
					y: 1582
				},
				path: "M543.316,1591.069c6.065-7.622,11.341-15.824,18.161-22.435c9.008-8.733,19.031-16.475,29.006-24.136c5.02-3.855,9.087-7.83,11.363-13.977c1.232-3.326,4.607-5.841,6.935-8.783c1.808-2.286,3.45-4.703,5.245-7c1.607-2.058,3.134-4.233,5.029-6.001c4.129-3.849,8.754-7.202,12.618-11.286c2.3-2.431,4.298-5.679,5.084-8.889c1.26-5.144,4.681-7.315,9.091-8.603c0.787-0.23,2.749,0.844,2.888,1.563c0.825,4.268,3.013,5.596,7.11,4.187c0.632-0.218,1.697,0.187,2.307,0.645c6.04,4.537,11.378,2.093,16.825-1.353c4.271-2.701,8.584-5.522,13.983-1.83c1.034,0.706,4.31,0.002,5.072-1.088c3.394-4.851,8.259-4.878,12.926-4.011c14.072,2.616,28.141,3.485,42.385,1.849c2.38-0.273,4.972,1.009,7.297,0.603c4.253-0.742,8.962-1.31,12.436-3.563c6.718-4.357,15.858-3.777,21.27,2.53c5.125,5.975,6.904,6.468,13.363,4.917c2.798,0.526,5.619,0.961,8.383,1.631c0.982,0.238,2.252,0.835,2.653,1.637c1.178,2.354,1.864,4.947,2.974,7.34c0.88,1.897,1.663,4.404,3.248,5.309c5.625,3.208,7.808,8.737,11.205,13.684c3.302,4.808,8.873,8.187,13.793,11.709c3.308,2.368,7.212,3.905,10.862,5.791c1.611,0.832,3.2,2.152,4.89,2.316c10.177,0.986,16.42,7.522,22.739,15.323c-3.258,3.627-5.923,7.559-9.489,10.334c-5.279,4.108-6.301,10.466-6.551,15.576c-0.523,10.704-6.244,18.675-10.624,27.521c-2.073,4.187-3.135,8.866-4.735,13.294c-1.735,4.8-3.097,9.831-5.59,14.211c-0.954,1.679-4.523,2.196-7.007,2.612c-6.345,1.061-12.906,1.189-19.071,2.844c-3.41,0.915-6.155,4.213-9.284,6.311c-1.693,1.136-3.481,2.627-5.367,2.873c-4.14,0.539-6.822,1.423-3.198,6.909c-5.796,0-10.751,0.056-15.702-0.034c-1.467-0.026-2.96-0.8-4.385-0.661c-10.667,1.044-19.325-3.41-27.542-9.502c-1.263-0.937-3.965-1.435-5.161-0.724c-11.998,7.143-15.884,1.323-25.113-6.631c-3.975-3.426-6.42-3.956-10.706-1.631c-3.07,1.668-6.716,2.266-10.087,3.396c-1.399,0.469-2.865,0.892-4.106,1.653c-11.25,6.899-23.705,8.659-36.555,8.469c-5.837-0.087-10.255-3.15-13.987-7.546c-1.269-1.493-3.302-2.432-5.127-3.341c-4.501-2.242-9.098-4.291-13.625-6.481c-1.917-0.928-3.766-1.999-5.63-3.032c-1.727-0.955-3.557-1.783-5.126-2.956c-4.321-3.233-8.338-6.906-12.828-9.873c-6.567-4.341-13.599-7.988-20.094-12.426c-2.147-1.467-3.043-4.648-4.888-6.708c-1.662-1.855-3.71-4.393-5.816-4.634c-6.604-0.754-13.473-1.637-18.417,4.96c-2.898,3.868-8.201,3.746-11.699,0.361C545.88,1593.26,544.726,1592.315,543.316,1591.069z"
			}, {
				id: 52,
				name: "D5D: Equioque",
				connections: [ 30, 31, 51, 53],
				short: 'D5D',
				flag: {
					x: 486,
					y: 1516
				},
				flagPos: {
					x: 436,
					y: 1456
				},
				path: "M534.378,1370.716c3.999,1.428,6.75,2.377,7.581,7.68c0.619,3.95,5.11,7.694,8.609,10.669c2.822,2.396,5.667,4.181,6.731,8.141c0.655,2.44,2.724,4.498,4.14,6.74c2.33,3.689,4.96,4.913,7.41,1.8c3.636,1.2,6.821,1.955,9.714,3.325c1.628,0.771,3.07,2.37,4.077,3.93c2.4,3.716,3.792,8.269,9.281,8.898c0.611,0.07,1.439,2.362,1.361,3.571c-0.257,3.962-1.645,8.176,4.57,8.926c0.939,0.113,2.3,1.893,2.396,2.993c0.621,7.118,7.002,9.658,10.811,14.246c3.762,4.531,6.906,9.578,10.67,14.107c1.124,1.353,3.422,1.729,5.559,1.488c0.914,2.202,1.826,4.405,3.167,7.641c2.059-2.521,3.437-4.209,4.813-5.895c4.73,2.978,4.968,5.114,3.012,10.116c-4.61,11.783-11.721,21.333-22.378,28.347c-2.168,1.427-3.188,4.508-4.965,6.638c-3.046,3.651-6.365,7.079-9.38,10.756c-1.325,1.616-2.059,3.704-3.282,5.421c-2.529,3.551-4.771,7.468-7.921,10.38c-5.199,4.812-10.912,9.095-16.608,13.334c-10.603,7.892-18.581,18.323-27.445,27.899c-1.112,1.202-1.845,2.756-2.964,3.949c-1.459,1.557-3.1,4.121-4.712,4.159c-8.453,0.203-14.474,6.284-22.038,8.452c-4.926,1.412-9.803,3.146-14.828,3.989c-2.796,0.47-6.048-0.058-8.75-1.062c-8.809-3.278-17.401-7.137-26.198-10.451c-3.655-1.378-7.592-2.057-11.441-2.864c-7.98-1.675-16.18-1.956-22.218-9.285c-2.813-3.415-8.249-4.632-12.425-6.97c-7.173-4.016-14.309-8.1-21.413-12.236c-0.949-0.553-1.96-1.439-2.367-2.413c-4.581-10.956-13.813-18.101-21.486-26.53c-1.978-2.174-4.079-4.535-5.125-7.201c-3.373-8.596-8.773-15.813-14.209-23.115c-2.099-2.819-3.418-6.447-4.282-9.908c-1.258-5.045,0.221-9.195,4.862-12.444c4.648-3.253,9.669-6.151,11.88-12.274c0.895-2.478,4.528-4.19,7.207-5.75c4.51-2.628,7.591-6.071,9.33-11.117c0.917-2.659,3.253-4.832,4.968-7.212c6.171-8.564,13.433-15.774,22.865-20.96c3.173-1.744,5.07-5.91,7.37-9.099c1.049-1.455,1.439-3.391,2.511-4.821c3.126-4.174,5.969-6.713,12.66-6.569c8.582,0.185,17.212-4.162,25.909-6.177c4.217-0.977,8.637-1.062,12.96-1.596c4.001-0.495,8.392-0.162,11.918-1.742c11.239-5.035,22.573-9.45,34.882-11.023C526.909,1378.862,531.444,1376.01,534.378,1370.716z"
			}, {
				id: 53,
				name: "E5A: Eatutiar",
				connections: [ 31, 52, 54],
				short: 'E5A',
				flag: {
					x: 303,
					y: 1374
				},
				path: "M345.832,1247.88c-1.842,6.06-3.478,12.192-5.59,18.157c-1.804,5.097,0.73,11.6,5.864,13.582c-0.668,3.205-4.076,6.04,2.381,8.697c8.813,3.624,16.859,9.407,24.709,15.003c8.635,6.154,11.662,16.183,15.507,25.482c5.405,13.071,12.4,17.554,26.736,17.216c1.23-0.028,3.433,1.023,3.588,1.866c1.231,6.697,7.246,12.865,0.668,20.419c-4.976,5.713-3.334,15.748,1.635,21.478c1.948,2.245,3.545,4.795,4.94,6.71c-3.401,5.531-6.368,10.841-9.837,15.799c-1.836,2.623-4.208,5.209-6.928,6.813c-8.295,4.894-15.264,11.082-20.598,19.072c-2.702,4.048-4.984,8.39-7.867,12.296c-1.807,2.447-4.098,4.786-6.668,6.365c-4.474,2.748-7.732,6.093-10.618,10.656c-2.786,4.405-7.87,7.357-11.715,10.746c-4.953-6.767-9.402-13.489-14.557-19.62c-2.668-3.175-6.66-5.21-9.915-7.927c-2.635-2.199-5.446-4.355-7.497-7.05c-4.025-5.291-8.823-8.21-15.683-7.821c-4.973,0.281-10.021,0.222-14.965-0.326c-3.213-0.355-6.56-1.386-9.395-2.938c-10.897-5.968-21.736-12.065-32.312-18.577c-2.849-1.754-5.129-4.876-6.913-7.826c-4.131-6.833-9.316-12.411-16.333-16.294c-1.815-1.005-3.942-2.069-5.008-3.704c-5.601-8.598-10.935-17.37-16.307-26.115c-4.152-6.76-8.478-13.433-12.215-20.418c-1.654-3.092-2.157-6.833-2.978-10.327c-1.051-4.479-1.549-9.118-2.919-13.488c-1.616-5.157-0.39-10.003,3.656-13.849c1.643-1.563,2.437-4.037,3.545-6.133c1.726-3.262,2.865-6.996,5.18-9.749c6.507-7.737,13.71-14.893,20.149-22.682c1.963-2.375,2.295-6.079,3.456-9.144c0.663-1.75,1.048-3.938,2.322-5.064c5.06-4.48,10.318-8.755,15.704-12.84c3.53-2.677,8.727-0.932,9.856,3.445c2.709,10.508,5.35,9.778,15.113,10.937c7.185,0.853,14.555,0.134,21.843,0.128c6.583-0.005,13.165,0.05,19.747-0.004c4.082-0.033,7.953-0.07,11.735-2.723c1.954-1.37,5.742-0.961,8.429-0.281c6.33,1.603,12.499,3.957,18.583-0.978C344.851,1247.207,345.341,1247.543,345.832,1247.88z"
			}, {
				id: 54,
				name: "E5B: Kaweariael",
				connections: [ 31, 32, 53, 55],
				short: 'E5B',
				flag: {
					x: 274,
					y: 1144
				},
				path: "M159.593,1098.154c0.625-2.405,1.359-6.282,2.663-9.959c1.443-4.072,0.786-7.24-1.285-11.186c-4.491-8.56-8.176-18.031-2.792-27.371c4.188-7.264,9.879-13.673,15.036-20.358c1.72-2.229,4.274-3.882,5.723-6.243c4.931-8.035,12.34-8.206,20.166-6.556c5.5,1.159,11.018,2.612,16.232,4.679c12.054,4.776,24.848,4.888,37.319,5.137c7.987,0.159,16.025-3.717,24.09-5.568c10.654-2.446,21.333-4.19,32.42-3.041c4.817,0.5,9.981-0.162,14.701-1.395c7.905-2.064,11.502-0.705,15.556,6.23c5.668,9.697,11.074,19.458,22.438,24.427c3.664,1.602,5.97,6.968,8.192,11c1.726,3.132,2.564,6.819,3.395,10.354c0.477,2.028,0.928,4.652,0.058,6.307c-4.652,8.847-3.262,18.763-5.289,28.06c-1.207,5.539,8.77,16.28,14.939,17.252c4.051,0.638,7.093,2.126,10.105,5.354c2.325,2.492,6.945,3.627,10.646,3.881c7.024,0.48,8.688,2.15,6.208,8.728c-4.364,11.579-8.786,23.141-13.438,34.606c-1.205,2.968-2.243,6.544-7.485,4.716c-1.67-0.582-5.573,2.216-6.954,4.411c-3.693,5.873-6.784,12.161-9.661,18.489c-0.972,2.138-0.967,4.928-0.746,7.359c0.739,8.1-4.867,12.414-9.737,17.278c-3.696,3.691-7.238,7.541-10.803,11.361c-1.916,2.054-3.552,4.404-5.635,6.26c-5.723,5.102-12.261,5.359-18.926,2.246c-4.794-2.238-8.861-1.223-12.901,1.631c-0.874,0.617-2.062,1.094-3.113,1.108c-15.584,0.222-31.175,0.639-46.752,0.358c-5.555-0.1-10.97-1.416-12.318-8.962c-0.466-2.608-4.292-5.267-7.182-6.67c-9.326-4.529-19.229-7.928-28.348-12.81c-10.256-5.491-17.745-14.055-23.29-24.419c-5.455-10.196-11.494-20.078-17.208-30.136c-4.027-7.087-6.658-14.613-7.864-22.755c-0.667-4.508-2.575-8.834-3.939-13.237c-0.242-0.78-0.724-1.517-0.822-2.308C161.893,1117.53,160.845,1108.639,159.593,1098.154z"
			}, {
				id: 55,
				name: "E5C: Yossiryon",
				connections: [ 32, 33, 54, 56],
				short: 'E5C',
				flag: {
					x: 261,
					y: 957
				},
				flagPos: {
					x: 211,
					y: 897
				},
				path: "M121.324,862.671c19.251-2.186,37.754-8.047,57.297-7.066c7.028,0.353,14.257-2.614,21.344-4.282c12.723-2.994,25.403-6.17,38.115-9.213c1.277-0.305,2.648-0.297,3.976-0.302c18.659-0.068,36.868-2.782,54.755-8.267c6.51-1.997,13.18-3.398,20.462-1.834c10.8,2.32,16.363,9.332,21.009,18.421c2.44,4.772,6.765,8.543,9.749,13.088c3.533,5.383,6.384,11.21,9.832,16.655c1.92,3.033,4.176,5.974,6.784,8.418c2.847,2.667,4.896,5.341,4.386,9.444c-0.571,4.596,1.149,8.307,4.127,11.804c5.824,6.841,11.091,13.947,13.105,23.143c0.771,3.521,3.209,7.134,5.869,9.678c4.034,3.858,3.834,7.876,1.146,11.551c-7.149,9.775-14.491,19.307-24.113,27.101c-6.477,5.247-11.247,12.572-16.954,18.81c-4.128,4.512-8.459,8.851-12.9,13.053c-0.786,0.744-2.563,0.571-3.885,0.593c-4.154,0.07-8.313-0.073-12.464,0.062c-4.928,0.161-9.849,0.553-14.775,0.792c-6.61,0.32-13.333-0.062-19.808,1.035c-9.266,1.568-18.297,4.472-27.525,6.315c-14.115,2.819-28.027,0.782-41.79-2.675c-8.662-2.175-17.303-4.435-25.954-6.656c-0.322-0.083-0.706-0.325-0.957-0.227c-7.295,2.864-8.933-3.156-11.866-7.376c-1.884-2.711-4.526-4.922-6.249-7.714c-3.442-5.58-6.01-11.743-9.789-17.062c-9.101-12.811-18.25-25.642-28.283-37.714c-4.597-5.53-1.952-9.969-0.422-14.653c3.072-9.411,3.722-18.725,1.313-28.345c-0.577-2.308,0.501-5.161-0.402-7.229c-2.134-4.884-4.018-10.594-7.817-13.855C123.619,873.85,122.933,868.477,121.324,862.671z"
			},
				{
				id: 56,
				name: "E5D: Ecladorth",
				connections: [ 33, 34, 55, 57],
				short: 'E5D',
				flag: {
					x: 258,
					y: 777
				},
				path: "M120,837.915c1.021-3.73,2.471-7.401,2.988-11.2c1.858-13.643,2.406-27.55,5.389-40.924c2.229-10,7.001-19.543,11.436-28.915c6.357-13.436,13.454-26.523,20.205-39.774c3.577-7.021,6.73-14.29,10.783-21.02c2.063-3.428,6.476-5.466,8.451-8.92c4.316-7.548,10.441-9.047,18.183-7.331c0.641,0.142,1.328,0.111,1.992,0.107c6.439-0.04,12.56,1.083,18.906,2.625c8.146,1.98,16.993,0.963,25.513,1.576c4.152,0.299,8.224,1.618,12.376,2.028c5.533,0.547,11.106,0.772,16.668,0.917c3.258,0.084,6.543-0.102,9.787-0.44c6.72-0.702,13.539-1.065,20.098-2.542c6.412-1.444,12.525-4.185,18.835-6.146c1.126-0.35,2.961-0.123,3.806,0.605c5.35,4.612,10.962,9.039,15.644,14.282c9.84,11.019,19.489,22.245,28.572,33.889c5.905,7.57,11.48,15.641,15.608,24.251c2.061,4.298,0.6,10.31,0.601,15.546c0,1.107-1.02,2.306-0.814,3.308c1.605,7.848-4.136,11.567-8.731,15.949c-6.914,6.595-13.874,13.143-20.728,19.801c-3.193,3.102-5.902,6.754-9.324,9.556c-5.874,4.81-9.41,11.061-12.416,17.78c-0.327,0.731-0.901,1.353-1.54,2.286c-12.781-9.109-26.211-8.267-40.353-3.75c-8.286,2.646-17.037,4.145-25.694,5.259c-17.829,2.294-35.609,3.8-53.238,8.44c-17.585,4.628-35.473,9.455-54.331,8.146c-7.851-0.545-15.935,2.605-23.945,3.875c-4.878,0.773-9.816,1.167-14.728,1.731C120,851.913,120,844.914,120,837.915z"
			}, {
				id: 57,
				name: "F5A: Udriomond",
				connections: [ 34, 56, 58],
				short: 'F5A',
				flag: {
					x: 264,
					y: 588
				},
				path: "M184.197,677.333c-0.61-1.525-1.487-3.602-2.267-5.715c-0.343-0.93-0.387-1.972-0.743-2.896c-4.116-10.702-8.265-21.392-12.416-32.08c-0.177-0.457-0.717-0.907-0.663-1.3c1.19-8.525-5.696-11.819-11.002-15.035c-5.298-3.212-5.601-7.51-5.482-12.234c0.172-6.875,0.795-13.754,1.606-20.586c0.203-1.707,1.786-3.29,2.859-4.845c3.607-5.229,7.973-10.076,10.738-15.711c3.616-7.367,6.36-15.23,8.8-23.091c3.768-12.137,13.244-20.539,19.558-30.997c2.954-4.894,7.918-8.578,10.847-13.483c3.604-6.037,6.039-12.773,8.97-19.211c0.74-1.625,1.103-3.572,2.23-4.85c6.563-7.436,12.997-15.033,20.1-21.931c4.21-4.089,9.67-6.864,14.396-10.456c9.486-7.208,20.654-10.499,31.697-14.218c3.359-1.131,6.316-3.457,9.707-5.377c2.587,3.992,4.663,8.696,8.056,12.078c5.007,4.99,11.031,8.945,16.479,13.511c8.018,6.72,15.907,13.593,23.861,20.389c1.264,1.08,2.435,2.404,3.896,3.097c11.587,5.493,18.686,15.874,26.937,24.913c3.042,3.332,5.443,7.632,6.912,11.911c1.567,4.567,1.271,8.784-2.282,13.667c-7.125,9.792-13.231,20.517-18.36,31.509c-4.584,9.826-7.352,20.507-10.799,30.851c-2.185,6.558-3.902,13.281-6.321,19.746c-1.069,2.856-3.624,5.12-5.034,7.891c-1.909,3.754-4.097,7.604-4.847,11.656c-1.139,6.159-0.606,12.627-1.757,18.782c-1.813,9.699-4.377,19.262-6.794,28.839c-0.265,1.048-1.484,2.209-2.54,2.65c-12.569,5.251-25.366,9.475-39.321,8.287c-2.283-0.194-4.681-0.057-6.92,0.422c-6.786,1.452-13.109,0.988-19.729-1.696c-3.7-1.5-8.478-0.8-12.712-0.431c-9.347,0.814-18.445,0.267-27.268-3.184c-1.657-0.648-3.439-1.168-5.2-1.318c-4.949-0.421-9.917-0.838-14.875-0.827C191.293,676.065,188.073,676.825,184.197,677.333z"
			}, {
				id: 58,
				name: "F5B: Kreamenon",
				connections: [ 34, 35, 57, 59],
				short: 'F5B',
				flag: {
					x: 420,
					y: 444
				},
				flagPos: {
					x: 370,
					y: 360
				},
				path: "M446.05,302.768c5.944,6.345,11.67,12.467,17.408,18.579c2.95,3.143,5.927,6.261,8.876,9.405c0.796,0.849,1.367,2.068,2.328,2.579c9.767,5.194,13.005,15.535,18.862,23.791c6.294,8.872,12.51,17.803,18.58,26.829c2.752,4.092,5.687,8.237,7.439,12.782c2.61,6.774,6.825,12.174,12.234,16.619c4.972,4.086,4.951,9.033,3.539,14.371c-1.818,6.872-3.945,13.662-5.853,20.511c-0.351,1.26-0.581,2.681-0.378,3.948c1.683,10.549-1.855,20.437-4.553,30.222c-0.988,3.583-5.416,7.152-9.131,8.825c-5.478,2.468-12.041,2.503-17.56,4.909c-6.753,2.944-13.54,2.559-20.495,2.819c-10.003,0.374-19.776,1.164-29.29,5.695c-9.643,4.592-20.635,5.449-31.24,4.111c-11.778-1.486-22.28,1.39-32.671,6.684c-1.925-13.324-10.246-22.54-19.731-31.021c-0.727-0.649-1.107-1.689-1.841-2.326c-3.574-3.099-7.157-6.193-10.847-9.151c-3.493-2.8-7.248-5.282-10.667-8.165c-8.632-7.279-16.735-15.263-25.847-21.865c-5.664-4.104-10.2-8.56-13.175-14.758c-0.284-0.592-0.697-1.146-1.144-1.632c-5.995-6.519-5.581-8.879-2.717-17.365c3.623-10.735,6.961-21.589,7.042-33.332c0.058-8.232,3.576-16.062,8.487-22.929c1.441-2.016,3.482-3.658,4.657-5.796c3.116-5.671,8.942-6.902,14.164-9.063c11.679-4.833,23.307-9.836,35.193-14.109c9.939-3.573,20.142-6.488,30.361-9.19C414.192,310.485,430.416,306.648,446.05,302.768z"
			}, {
				id: 59,
				name: "F5C: Jokuthriaz",
				connections: [ 35, 36, 58, 60],
				short: 'F5C',
				flag: {
					x: 595,
					y: 346
				},
				path: "M606.681,424.646c-2.639,0.561-6.955,1.459-11.259,2.409c-0.8,0.176-1.601,0.898-2.321,0.797c-8.136-1.145-16.554-1.452-24.307-3.872c-9.288-2.899-18.085-7.331-28.021-8.032c-1.236-0.087-2.733-0.497-3.583-1.308c-3.604-3.438-7.601-6.684-10.344-10.749c-3.947-5.848-6.803-12.42-10.373-18.538c-2.073-3.554-4.697-6.783-6.963-10.23c-7.799-11.866-15.449-23.832-23.399-35.595c-1.701-2.517-4.458-4.311-6.665-6.5c-2.202-2.183-4.299-4.469-6.486-6.667c-6.433-6.467-12.885-12.915-19.335-19.365c-4.233-4.233-3.302-5.725,1.7-8.887c6.805-4.302,12.897-9.766,19.132-14.928c10.988-9.097,21.843-18.354,32.785-27.508c1.139-0.954,2.389-2.133,3.75-2.409c9.524-1.936,18.924-4.9,28.871-3.681c7.217,0.885,14.528,1.193,21.663,2.493c5.313,0.967,10.66,2.575,15.552,4.845c8.881,4.122,17.493,3.836,26.527,0.729c15.413-5.301,31.118-9.073,47.099-2.571c12.084,4.916,24.688,6.375,37.472,8.004c10.048,1.279,18.134,7.306,24.035,15.924c7.365,10.756,13.366,22.477,22.928,31.704c2.672,2.578,4.761,6.057,6.164,9.509c0.545,1.341-1.03,4.7-2.523,5.51c-5.763,3.126-11.684,5.794-13.354,13.041c-0.095,0.411-0.626,0.791-1.039,1.049c-9.38,5.86-18.843,11.59-28.138,17.581c-7.636,4.921-15.204,9.97-22.548,15.312c-4.149,3.018-8.104,6.45-11.556,10.234c-3.051,3.345-4.743,8.012-7.996,11.075c-6.11,5.753-12.93,10.749-19.422,16.099c-4.101,3.379-8.361,6.606-12.153,10.308C618.553,424.357,614.079,426.096,606.681,424.646z"
			}, {
				id: 60,
				name: "F5D: Gleoleaterra",
				connections: [ 19, 36, 37, 59],
				short: 'F5D',
				flag: {
					x: 875,
					y: 274
				},
				path: "M1085.613,272.972c-7.581,1.038-14.968,1.943-22.313,3.112c-2.573,0.409-5.503,0.859-7.473,2.347c-6.104,4.613-13,5.599-20.25,5.533c-13.118-0.118-26.39-0.962-38.99,3.445c-12.185,4.261-25.558,5.319-35.752,15.12c-7.11,6.836-16.032,11.751-23.692,18.073c-2.201,1.817-3.123,5.443-4.104,8.413c-1.369,4.143-2.243,8.449-3.305,12.594c-10.083-2.838-19.012-5.772-28.145-7.786c-7.071-1.559-14.375-2.216-21.614-2.799c-5.098-0.41-9.551-1.139-13.379-5.244c-8.023-8.606-18.501-7.372-28.915-6.428c-8.51,0.772-16.948,3.268-25.674,0.954c-2.109-0.559-5.332,0.006-6.996,1.351c-8.963,7.244-19.001,6.624-29.41,5.083c-8.973-1.328-18.015-2.182-27.008-3.384c-1.259-0.168-2.918-0.81-3.524-1.776c-2.419-3.861-4.129-8.2-6.766-11.886c-8.65-12.094-17.071-24.414-26.594-35.8c-6.975-8.34-15.512-15.381-23.412-22.94c-4.597-4.398-8.13-9.15-6.31-16.029c0.202-0.763,0.427-1.689,0.97-2.167c8.127-7.152,16.63-14.16,27.831-14.978c5.323-0.388,11.489,0.788,16.119,3.344c6.326,3.493,10.489,1.413,15.31-2.122c3.55-2.603,7.558-4.572,11.281-6.949c7.814-4.991,16.228-9.315,23.156-15.338c5.729-4.981,11.223-7.524,18.723-6.868c8.073,0.706,16.287,0.107,24.299,1.148c16.264,2.115,32.395,5.254,48.658,7.381c10.468,1.37,20.69,3.835,31.617-0.903c8.893-3.856,19.15-5.186,29.066-0.718c5.047,2.274,10.472,3.831,15.854,5.21c6.39,1.638,12.874,3.539,19.396,3.902c13.764,0.766,27.551,0.539,40.643,6.006c2.969,1.24,6.477,1.302,9.763,1.651c9.848,1.047,19.683,2.088,28.712,6.646c0.591,0.299,1.262,0.555,1.706,1.014c5.594,5.794,11.193,11.583,16.701,17.458c2.555,2.725,5.731,5.265,7.202,8.53c3.979,8.828,10.438,15.865,15.774,23.705C1085.124,271.403,1085.26,272.076,1085.613,272.972z"
			}];
		}
	}
}