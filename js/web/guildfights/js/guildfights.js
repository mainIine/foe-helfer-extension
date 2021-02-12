/*
 * **************************************************************************************
 *
 * Dateiname:                 guildfights.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 14:31 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

// Provinznamen der GG
FoEproxy.addMetaHandler('guild_battleground_maps', (xhr, postData) => {
	GildFights.ProvinceNames = JSON.parse(xhr.responseText);
});

// Provinzfarben der GG
FoEproxy.addMetaHandler('battleground_colour', (xhr, postData) => {
	GildFights.Colors = JSON.parse(xhr.responseText);
	GildFights.PrepareColors();
});

// Gildengefechte
FoEproxy.addHandler('GuildBattlegroundService', 'getPlayerLeaderboard', (data, postData) => {
	GildFights.HandlePlayerLeaderboard(data.responseData);
});

// Gildengefechte
FoEproxy.addHandler('GuildBattlegroundStateService', 'getState', (data, postData) => {
	if (data.responseData['stateId'] !== 'participating') {
		GildFights.HandlePlayerLeaderboard(data.responseData['playerLeaderboardEntries']);
	}
});

// Gildengefechte - Map, Gilden
FoEproxy.addHandler('GuildBattlegroundService', 'getBattleground', (data, postData) => {
	GildFights.init();
	GildFights.MapData = data['responseData'];
	ActiveMap = 'gg';

	$('#gildfight-Btn').removeClass('hud-btn-red');
	$('#selectorCalc-Btn-closed').remove();

	if( $('#ProvinceMap').length > 0 ){
		ProvinceMap.Refresh();
	}

	// update box when open
	if( $('#LiveGildFighting').length > 0 ){
		GildFights.BuildFightContent();
	}
});


/**
 * @type {{ShowExportButton: GildFights.ShowExportButton, GetTabContent: (function(): string), ShowPlayerBox: GildFights.ShowPlayerBox, SettingsExport: GildFights.SettingsExport, PrevActionTimestamp: null, NewActionTimestamp: null, SortedColors: null, ShowGildBox: (function(): undefined), BuildFightContent: GildFights.BuildFightContent, InjectionLoaded: boolean, MapData: null, BuildPlayerContent: GildFights.BuildPlayerContent, SetTabContent: GildFights.SetTabContent, NewAction: null, TabsContent: [], PrevAction: null, UpdateCounter: GildFights.UpdateCounter, init: GildFights.init, PrepareColors: (function(): undefined), ProvinceNames: null, HandlePlayerLeaderboard: GildFights.HandlePlayerLeaderboard, SetTabs: GildFights.SetTabs, GetTabs: (function(): string), PlayerBoxContent: [], Colors: null, RefreshTable: (function(*=): undefined), SetAlert: GildFights.SetAlert, Neighbours: [], Tabs: [], PlayersPortraits: null}}
 */
let GildFights = {

	Alerts: [],

	PrevAction: null,
	PrevActionTimestamp: null,
	NewAction: null,
	NewActionTimestamp: null,
	MapData: null,
	Neighbours: [],
	PlayersPortraits: null,
	Colors : null,
	SortedColors: null,
	ProvinceNames : null,
	InjectionLoaded: false,
	PlayerBoxContent: [],

	Tabs: [],
	TabsContent: [],

	/**
	 * Zündung
	 */
	init: ()=> {
		// moment.js global set
		moment.locale(MainParser.Language);

		GildFights.GetAlerts();

		if(GildFights.InjectionLoaded === false)
		{
			FoEproxy.addWsHandler('GuildBattlegroundService', 'all', data => {
				if ($('#LiveGildFighting').length > 0 && data['responseData'][0])
				{
					GildFights.RefreshTable(data['responseData'][0]);
				}
			});
			GildFights.InjectionLoaded = true;
		}
	},


	HandlePlayerLeaderboard: (d) => {
		// immer zwei vorhalten, für Referenz Daten (LiveUpdate)
		if (localStorage.getItem('GildFights.NewAction') !== null) {
			GildFights.PrevAction = JSON.parse(localStorage.getItem('GildFights.NewAction'));
			GildFights.PrevActionTimestamp = parseInt(localStorage.getItem('GildFights.NewActionTimestamp'));
		}
		else if (GildFights.NewAction !== null) {
			GildFights.PrevAction = GildFights.NewAction;
			GildFights.PrevActionTimestamp = GildFights.NewActionTimestamp;
		}

		let players = [];

		for (let i in d) {
			if (!d.hasOwnProperty(i)) {
				break;
			}

			players.push({
				player_id: d[i]['player']['player_id'],
				name: d[i]['player']['name'],
				avatar: d[i]['player']['avatar'],
				battlesWon: d[i]['battlesWon'] || 0,
				negotiationsWon: d[i]['negotiationsWon'] || 0
			});
		}

		GildFights.NewAction = players;
		localStorage.setItem('GildFights.NewAction', JSON.stringify(GildFights.NewAction));

		GildFights.NewActionTimestamp = moment().unix();
		localStorage.setItem('GildFights.NewActionTimestamp', GildFights.NewActionTimestamp);

		if ($('#GildPlayers').length > 0) {
			GildFights.BuildPlayerContent();
		} else {
			GildFights.ShowPlayerBox();
		}
	},


	/**
	 * Merkt sich alle Tabs
	 *
	 * @param id
	 */
	SetTabs: (id)=> {
		GildFights.Tabs.push('<li class="' + id + ' game-cursor"><a href="#' + id + '" class="game-cursor"><span>&nbsp;</span></a></li>');
	},


	/**
	 * Gibt alle gemerkten Tabs aus
	 *
	 * @returns {string}
	 */
	GetTabs: ()=> {
		return '<ul class="horizontal dark-bg">' + GildFights.Tabs.join('') + '</ul>';
	},


	/**
	 * Speichert BoxContent zwischen
	 *
	 * @param id
	 * @param content
	 */
	SetTabContent: (id, content)=> {
		// ab dem zweiten Eintrag verstecken
		let style = GildFights.TabsContent.length > 0 ? ' style="display:none"' : '';

		GildFights.TabsContent.push('<div id="' + id + '"' + style + '>' + content + '</div>');
	},


	/**
	 * Setzt alle gespeicherten Tabellen zusammen
	 *
	 * @returns {string}
	 */
	GetTabContent: ()=> {
		return GildFights.TabsContent.join('');
	},


	/**
	 * Creates the box with the data
	 */
	ShowGildBox: ()=> {
		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if( $('#LiveGildFighting').length === 0 ){

			HTML.Box({
				id: 'LiveGildFighting',
				title: i18n('Menu.Gildfight.Title'),
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize: true,
				map: 'ProvinceMap.buildMap()'
			});

			// add css to the dom
			HTML.AddCssFile('guildfights');
		}
		else {
			HTML.CloseOpenBox('LiveGildFighting');
			return;
		}

		GildFights.BuildFightContent();
	},


	/**
	 * Shows the player overview
	 */
	ShowPlayerBox: () => {
		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if( $('#GildPlayers').length === 0 ){

			moment.locale(MainParser.Language);

			HTML.Box({
				id: 'GildPlayers',
				title: i18n('Boxes.Gildfights.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
				settings: 'GildFights.ShowExportButton()'
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('guildfights');
		}

		GildFights.BuildPlayerContent();
	},


	/**
	 * Display the contents of the snapshot
	 */
	BuildPlayerContent: ()=> {

		let t = [],
			b = [],
			tN = 0,
			tF = 0;

		GildFights.PlayerBoxContent = [];

		GildFights.PlayerBoxContent.push({
			player: 'player',
			negotiationsWon: 'negotiations',
			battlesWon: 'battles',
			total: 'total'
		})

		for(let i in GildFights.NewAction)
		{
			if(!GildFights.NewAction.hasOwnProperty(i)){
				break;
			}

			let playerNew = GildFights.NewAction[i];

			let fightAddOn = '',
				negotaionAddOn = '',
				change = false;

			// gibt es einen älteren Snapshot?
			if(GildFights.PrevAction !== null){

				let playerOld = GildFights.PrevAction.find(p => (p['player_id'] === playerNew['player_id']));

				// gibt es zu diesem Spieler Daten?
				if(playerOld !== undefined) {

					if (playerOld['negotiationsWon'] < playerNew['negotiationsWon']) {
						negotaionAddOn = ' <small class="text-success">&#8593; ' + (playerNew['negotiationsWon'] - playerOld['negotiationsWon']) + '</small>';
						change = true;
					}

					if (playerOld['battlesWon'] < playerNew['battlesWon']) {
						fightAddOn = ' <small class="text-success">&#8593; ' + (playerNew['battlesWon'] - playerOld['battlesWon']) + '</small>';
						change = true;
					}
				}
			}

			tN += playerNew['negotiationsWon'];
			tF += playerNew['battlesWon'];

			b.push('<tr class="' + (playerNew['player_id'] === ExtPlayerID ? ' mark-player' : '') + (change === true ? ' bg-green' : '') + '">');

			b.push('<td>' + (parseInt(i) +1) + '.</td>');

			b.push('<td><img src="' + MainParser.InnoCDN + 'assets/shared/avatars/' + MainParser.PlayerPortraits[ playerNew['avatar'] ] + '.jpg" alt=""></td>');

			b.push('<td>' + playerNew['name'] + '</td>');

			b.push('<td class="text-center">');
			b.push(playerNew['negotiationsWon']  + negotaionAddOn);
			b.push('</td>');

			b.push('<td class="text-center">');
			b.push(playerNew['battlesWon'] + fightAddOn);
			b.push('</td>');

			b.push('<td class="text-center">');
			let both = playerNew['battlesWon'] + (playerNew['negotiationsWon']*2);
			b.push(both);
			b.push('</td>');

			b.push('</tr>');

			GildFights.PlayerBoxContent.push({
				player: playerNew['name'],
				negotiationsWon: playerNew['negotiationsWon'],
				battlesWon: playerNew['battlesWon'],
				total: both
			})
		}

		let tNF = (tN*2)+tF;

		t.push('<table class="foe-table">');

		t.push('<thead>');
		t.push('<tr>');

		t.push('<th>&nbsp;</th>');
		t.push('<th>&nbsp;</th>');
		t.push('<th>' + i18n('Boxes.Gildfights.Player') + '</th>');
		t.push('<th class="text-center"><span class="negotiation" title="' + i18n('Boxes.Gildfights.Negotiations') + '"></span> <strong class="text-warning">(' + HTML.Format(tN) + ')</strong></th>');
		t.push('<th class="text-center"><span class="fight" title="' + i18n('Boxes.Gildfights.Fights') + '"></span> <strong class="text-warning">(' + HTML.Format(tF) + ')</strong></th>');
		t.push('<th class="text-center">' + i18n('Boxes.Gildfights.Total') + ' <strong class="text-warning">(' + HTML.Format(tNF) + ')</strong></th>');

		t.push('</tr>');
		t.push('</thead>');

		t.push('<tbody>');

		t.push(b.join(''));

		t.push('</tbody>');

		$('#GildPlayersBody').html( t.join('') );

		if( $('#GildPlayersHeader .title').find('.time-diff').length === 0 )
		{
			$('#GildPlayersHeader .title').append( $('<small />').addClass('time-diff') );
		}

		// es gibt schon einen Snapshot vorher
		if (GildFights.PrevActionTimestamp !== null){

			let start = moment.unix(GildFights.PrevActionTimestamp),
				end = moment.unix(GildFights.NewActionTimestamp),
				duration = moment.duration(end.diff(start));

			let time = duration.humanize();

			$('.time-diff').text(
				HTML.i18nReplacer(i18n('Boxes.Gildfights.LastSnapshot'), {time: time})
			);
		}
	},


	/**
	 * Contents of the card box
	 */
	BuildFightContent: () => {

		GildFights.Tabs = [];
		GildFights.TabsContent = [];

		GildFights.SetTabs('gbgprogress');
		GildFights.SetTabs('gbgnextup');

		let progress = [], guilds = [], nextup = [],
			mP = GildFights.MapData['map']['provinces'],
			bP = GildFights.MapData['battlegroundParticipants'],
			own = bP.find(e => e['clan']['id'] === ExtGuildID);

		progress.push('<div id="progress"><table class="foe-table">');
		progress.push('<thead>');
		progress.push('<tr><th class="prov-name" style="user-select:text">' + i18n('Boxes.Gildfights.Province') + '</th><th colspan="2">' + i18n('Boxes.Gildfights.Progress') + '</th></tr>');
		progress.push('</thead><tbody>');

		for(let i in mP)
		{
			if(!mP.hasOwnProperty(i))
			{
				break;
			}

			let id = mP[i]['id'];

			mP[i]['neighbor'] = [];

			let linkIDs = ProvinceMap.ProvinceData().find(e => e['id'] === id)['connections'];

			for(let x in linkIDs)
			{
				if(!linkIDs.hasOwnProperty(x)) {
					continue;
				}

				let neighborID = GildFights.MapData['map']['provinces'].find(e => e['id'] === linkIDs[x]);

				if(neighborID['ownerId']){
					mP[i]['neighbor'].push(neighborID['ownerId']);
				}
			}

			for(let x = 0; x < bP.length; x++)
			{
				if(mP[i]['ownerId'] !== undefined && bP[x]['participantId'] === mP[i]['ownerId'])
				{
					// show current fights
					if(mP[i]['conquestProgress'].length > 0 && (mP[i]['lockedUntil'] === undefined))
					{
						let pColor = GildFights.SortedColors.find(e => e['id'] === mP[i]['ownerId']);

						progress.push(`<tr id="province-${id}" data-id="${id}">`);

						progress.push(`<td><b style="color:${pColor['main']}">${mP[i]['title']}</b></td>`);
						progress.push(`<td data-field="${id}-${mP[i]['ownerId']}" class="bar-holder">`);

						let cP = mP[i]['conquestProgress'];

						for(let y in cP)
						{
							if(!cP.hasOwnProperty(y))
							{
								break;
							}

							let max = cP[y]['maxProgress'],
								progess = cP[y]['progress'],
								width = Math.round((progess * 100) / max),
								p = GildFights.MapData['battlegroundParticipants'].find(o => (o['participantId'] === cP[y]['participantId'])),
								color = GildFights.SortedColors.find(e => e['id'] === p['participantId']);

							progress.push(`<span class="attack-wrapper attack-wrapper-${cP[y]['participantId']}"><span class="attack attacker-${cP[y]['participantId']}" style="background-color:${color['main'] };width:${width}%">${cP[y]['progress']}</span></span>`);
						}

						progress.push(`<td>${bP[x]['clan']['name']}</td>`);
					}
				}
			}

			// If sectors doesnt belong to anyone
			if(mP[i]['ownerId'] === undefined && mP[i]['conquestProgress'].length > 0)
			{
				progress.push(`<tr id="province-${id}" data-id="${id}">`);
				progress.push(`<td>${mP[i]['title']}</td>`);
				progress.push('<td data-field="' + id + '" class="bar-holder">');

				let cP = mP[i]['conquestProgress'];

				for(let y in cP)
				{
					if(!cP.hasOwnProperty(y))
					{
						break;
					}

					let max = cP[y]['maxProgress'],
						progess = cP[y]['progress'],
						width = Math.round((progess * 100) / max);

					progress.push(`<span class="attack-wrapper attack-wrapper-${cP[y]['participantId']}"><span class="attack attacker-${cP[y]['participantId']}" style="width:${width}%">${cP[y]['progress']}</span></span>`);
				}

				progress.push('<td> </td>');
			}
		}

		progress.push('</tbody>');
		progress.push('</table></div>');

		nextup.push('<div id="nextup"><table class="foe-table"');
		nextup.push('<thead><tr><th class="prov-name" style="user-select:text">' + i18n('Boxes.Gildfights.Province') + '</th><th class="time-static" style="user-select:text">' + i18n('Boxes.Gildfights.Time') + '</th><th class="time-dynamic" colspan="2">' + i18n('Boxes.Gildfights.Count') + '</th><th></th></tr></thead>');

		let arrayprov = [];

		// Time until next sectors will be available
		for(let i in mP)
		{
			if(!mP.hasOwnProperty(i)) continue;


			if(mP[i]['lockedUntil'] !== undefined && own['clan']['name'] !== mP[i]['owner']) // dont show own sectors -> maybe a setting box to choose which sectors etc. will be shown?
			{
				arrayprov.push(mP[i]);  // push all datas into array
			}
		}

		let prov = arrayprov.sort((a, b)=> { return a.lockedUntil - b.lockedUntil});

		for(let x in prov)
		{
			if(!prov.hasOwnProperty(x)) continue;

			if(prov[x]['neighbor'].includes(own['participantId'])) // Show only neighbors
			{
				let countDownDate = moment.unix(prov[x]['lockedUntil'] - 2),
					color = GildFights.SortedColors.find(e => e['id'] === prov[x]['ownerId']),
					intervalID = setInterval(()=>{
						GildFights.UpdateCounter(countDownDate, intervalID, prov[x]['id']);
					}, 1000);

				nextup.push(`<tr id="timer-${prov[x]['id']}">`);
				nextup.push(`<td class="prov-name"${color['main'] ? ' style="user-select:text; color:' + color['main'] + '"' : ''}><b>${prov[x]['title']}</b></td>`);

				GildFights.UpdateCounter(countDownDate, intervalID, prov[x]['id']);

				nextup.push(`<td class="time-static" style="user-select:text">${countDownDate.format('HH:mm:ss')}</td>`);
				nextup.push(`<td class="time-dynamic" id="counter-${prov[x]['id']}">${countDownDate.format('HH:mm:ss')}</td>`);
				nextup.push(`<td>${prov[x]['owner']}</td>`);

				let content = `<button class="btn-default" onclick="GildFights.SetAlert(${prov[x]['id']})">${i18n('Boxes.Gildfights.SetAlert')}</button>`;

				if(GildFights.Alerts.includes(prov[x]['id'])){
					content = '&#10004;';
				}

				if(!Alerts){
					content = '';
				}

				nextup.push(`<td class="text-right" id="alert-${prov[x]['id']}">${content}</td>`);
				nextup.push('</tr>');
			}
		}

		nextup.push('</table></div>');

		GildFights.SetTabContent('gbgprogress', progress.join(''));
		GildFights.SetTabContent('gbgnextup', nextup.join(''));

		let h = [];

		h.push('<div class="gbg-tabs tabs">');
		h.push( GildFights.GetTabs() );
		h.push( GildFights.GetTabContent() );
		h.push('</div>');

		$('#LiveGildFighting').find('#LiveGildFightingBody').html( h.join('') ).promise().done(function(){
			$('.gbg-tabs').tabslet({active: 1});

			$('#LiveGildFighting').on('click', 'tr', function(e){

				if($(this).hasClass('highlight-row'))
				{
					$(this).removeClass('highlight-row');
				}
				else {
					$(this).addClass('highlight-row');
				}
			});
		});
	},


	UpdateCounter: (countDownDate, intervalID, id) => {

		let idSpan = $(`#counter-${id}`),
			removeIt = false;

		if(countDownDate.isValid())
		{
			let diff = countDownDate.diff(moment());

			if (diff <= 0)
			{
				removeIt = true;
			}
			else {
				idSpan.text(moment.utc(diff).format('HH:mm:ss'));
			}
		}
		else {
			removeIt = true;
		}

		if(removeIt)
		{
			clearInterval(intervalID);

			idSpan.text('');
			$(`#timer-${id}`).find('.time-static').html(`<strong class="text-success">offen</strong>`); // @ToDo: translate

			// remove timer after 10s
			setTimeout(()=> {
				$(`#timer-${id}`).fadeToggle(function(){
					$(this).remove();
				});
			}, 10000);
		}
	},


	/**
	 * Determine and assign colours of the individual guilds
	 */
	PrepareColors: ()=> {

		// ist schon fertig aufbereitet
		if(GildFights.SortedColors !== null){
			return;
		}

		let colors = [],
			bP = GildFights.MapData['battlegroundParticipants'];

		for(let i in bP)
		{
			if(!bP.hasOwnProperty(i))
			{
				break;
			}

			let c = null;

			// "weiße" Farbe für den eigenen Clan raussuchen
			if(bP[i]['clan']['id'] === ExtGuildID){
				c = GildFights.Colors.find(o => (o['id'] === 'own_guild_colour'));
			} else {
				c = GildFights.Colors.find(o => (o['id'] === bP[i]['colour']));
			}

			colors.push({
				id: bP[i]['participantId'],
				cid: c['id'],
				base: c['base'],
				main: c['mainColour'],
				highlight: c['highlight'],
				shadow: c['shadow']
			});
		}

		GildFights.SortedColors = colors;
	},


	/**
	 * Real time update of the map box
	 *
	 * @param data
	 */
	RefreshTable: (data)=> {

		// console.log('data: ', data);

		// Province was taken over
		if(data['conquestProgress'].length === 0 || data['lockedUntil'])
		{
			// count bars in one province
			let elements = $(`#province-${data['id']}`).find('.attack-wrapper').length;

			// remove the current bar
			$(`.attack-wrapper-${data['id']}`).fadeToggle(function(){
				$(this).remove();
			});

			// only 1 bar was inside, remove the complete row
			if(elements === 1){
				$(`#province-${data['id']}`).fadeToggle(function(){
					$(this).remove();
				});
			}

			// search the province for owner update
			ProvinceMap.MapMerged.forEach((province,index)=>{
				if(province.id === data['id'])
				{
					// change owner & colors for the map update
					let colors = GildFights.SortedColors.find(e => e['id'] === data['ownerId']);

					ProvinceMap.MapMerged[index].ownerId = data['ownerId'];
					ProvinceMap.MapMerged[index].fillStyle = ProvinceMap.hexToRgb(colors['main'], '.3');
					ProvinceMap.MapMerged[index].strokeStyle = ProvinceMap.hexToRgb(colors['main']);
				}
			});

			if( $('#ProvinceMap').length > 0 ){
				ProvinceMap.Refresh();
			}

			return;
		}


		// The fight is on
		for(let i in data['conquestProgress'])
		{
			if(!data['conquestProgress'].hasOwnProperty(i))
			{
				break;
			}

			let d = data['conquestProgress'][i],
				max = d['maxProgress'],
				progess = d['progress'],
				width = Math.round((progess * 100) / max),
				cell = $(`tr#province-${data['id']}`),
				pColor = GildFights.SortedColors.find(e => e['id'] === data['ownerId']),
				p = GildFights.MapData['battlegroundParticipants'].find(o => (o['participantId'] === d['participantId']));

			// <tr> is not present, create it
			if(cell.length === 0)
			{
				let newCell = $('<tr />').attr({
					id: `province-${data['id']}`,
					'data-id': data['id']
				});

				let mD = GildFights.MapData['map']['provinces'].find(d => d.id === data['id']);

				$('#progress').find('table.foe-table').prepend(
					newCell.append(
						$('<td />').text(mD['title']).css({'color':pColor['main']}),
						$('<td />').attr({
							field: `${data['id']}-${data['ownerId']}`,
							class: 'bar-holder'
						}),
						$('<td />').text(p['clan']['name'])
					)
				);

				cell = $(`#province-${data['id']}`);
			}

			// remove active class
			cell.removeClass('red-pulse');

			// Attackers already exist
			if( cell.find('.attacker-' + d['participantId']).length > 0 ){

				// Update the percentages and progress counter
				cell.find('.attacker-' + d['participantId']).css({'width': width + '%'}).text(progess);
			}

			// Insert new "bar
			else {
				let color = GildFights.SortedColors.find(e => e['id'] === p['participantId']);

				cell.find('.bar-holder').append(
					$('<span />').addClass(`attack-wrapper attack-wrapper-${data['id']}`).append(
						$('<span />').attr({
							class: `attack attacker-${d['participantId']}`,
							style: `background-color:${color['main']};width:${width}%`
						})
					)
				);
			}

			cell.addClass('red-pulse');

			// Remove the class again after 1.5s
			setTimeout(() =>  {
				cell.removeClass('red-pulse');
			}, 1200);
		}
	},


	ShowExportButton: () => {
		let c = `<p class="text-center"><button class="btn btn-default" onclick="GildFights.SettingsExport('csv')">${i18n('Boxes.Gildfights.ExportCSV')}</button></p>`;

		c += `<p class="text-center"><button class="btn btn-default" onclick="GildFights.SettingsExport('json')">${i18n('Boxes.Gildfights.ExportJSON')}</button></p>`;

		// insert into DOM
		$('#GildPlayersSettingsBox').html(c);
	},


	SettingsExport: (type)=> {

		let blob, file;

		if(type === 'json')
		{
			let json = JSON.stringify(GildFights.PlayerBoxContent);

			blob = new Blob([json], {type: 'application/json;charset=utf-8'});
			file = `ggfights-${ExtWorld}.json`;
		}

		else if (type === 'csv')
		{
			let csv = [];

			for(let i in GildFights.PlayerBoxContent)
			{
				if(!GildFights.PlayerBoxContent.hasOwnProperty(i))
				{
					break;
				}

				let r = GildFights.PlayerBoxContent[i];
				csv.push(`${r['player']};${r['negotiationsWon']};${r['battlesWon']};${r['total']}`);
			}

			blob = new Blob([csv.join('\r\n')], {type: 'text/csv;charset=utf-8'});
			file = `ggfights-${ExtWorld}.csv`;
		}

		MainParser.ExportFile(blob, file);

		$(`#GildPlayersSettingsBox`).fadeToggle('fast', function(){
			$(this).remove();
		});
	},


	GetAlerts: ()=> {

		// is alert.js included?
		if(!Alerts){
			return ;
		}

		// fetch all alerts and search the id
		Alerts.getAll().then((resp)=> {
			if(resp.length === 0){
				return ;
			}

			resp.forEach((alert) => {
				if(alert['data']['category'] === 'gbg')
				{
					let name = alert['data']['title'],
						prov = GildFights.MapData['map']['provinces'].find(e => e.title === name); // short name of the province must match

					GildFights.Alerts.push(prov['id']);
				}
			})
		});
	},


	SetAlert: (id)=> {
		let prov = GildFights.MapData['map']['provinces'].find(e => e.id === id);

		GildFights.Alerts.push(id);

		const data = {
			title: prov.title,
			body: HTML.i18nReplacer(i18n('Boxes.Gildfights.SaveAlert'), {provinceName: prov.title}),
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
		});

		HTML.ShowToastMsg({
			head: i18n('Boxes.Gildfights.SaveMessage.Title'),
			text: HTML.i18nReplacer(i18n('Boxes.Gildfights.SaveMessage.Desc'), {provinceName: prov.title}),
			type: 'success',
			hideAfter: 5000
		});

		$(`#alert-${id}`).html('&#10004;');
	}
};

/**
 *
 * @type {{ProvinceObject: {}, ToolTipActive: boolean, FrameSize: number, prepare: ProvinceMap.prepare, MapMerged: [], ParseNumber: (function(*=, *): {num: number, index: *}), MapCTX: {}, ParseMove: (function(*=, *=)), ParseCurve: (function(*=, *=)), StrokeColor: string, MapSize: {width: number, height: number}, PrepareProvinces: ProvinceMap.PrepareProvinces, Refresh: ProvinceMap.Refresh, ParsePathToCanvas: (function(*=): Path2D), Mouse: {x: undefined, y: undefined}, StrokeWidth: number, buildMap: ProvinceMap.buildMap, DrawProvinces: ProvinceMap.DrawProvinces, ToolTipId: boolean, ProvinceData: (function(): ({flag: {x: number, y: number}, name: string, short: string, id: number, connections: number[]}|{flag: {x: number, y: number}, name: string, short: string, id: number, connections: number[]}|{flag: {x: number, y: number}, name: string, short: string, id: number, connections: number[]}|{flag: {x: number, y: number}, name: string, short: string, id: number, connections: number[]}|{flag: {x: number, y: number}, name: string, short: string, id: number, connections: number[]})[]), SVGPaths: (function(): ({path: string, id: number}|{path: string, id: number}|{path: string, id: number}|{path: string, id: number}|{path: string, id: number})[]), Map: {}, hexToRgb: (function(*=, *=): string)}}
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

	buildMap: ()=> {

		if( $('#ProvinceMap').length === 0 ){
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


	prepare: ()=> {

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
		function handleMouseDown(e)
		{
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

			ProvinceMap.Refresh();
		}

		// Objects
		function Province(data)
		{
			for(let key in data)
			{
				if(!data.hasOwnProperty(key)) continue;

				if(data[key])
				{
					this[key] = data[key];
				}
			}
		}


		Province.prototype.drawGGMap = function()
		{

			ProvinceMap.MapCTX.lineWidth = ProvinceMap.StrokeWidth;

			/*

				"this" object

				alpha: 0.3
				fillStyle: "rgba(190,189,189,.3)"
				flag: {x: 878, y: 1063}
				id: 9
				links: (5) [2, 8, 10, 22, 23]
				name: "C2: Tayencoria"
				ownerID: 56596
				ownerName: "Vandalen"
				path: "M853.82,1179.501c-1.966-3.399-3.049-5.821-4.618-7.874 c-4...."
				short: "C2T"
				strokeStyle: "rgb(190,189,189)"
			*/

			ProvinceMap.MapCTX.globalAlpha = this.alpha;
			ProvinceMap.MapCTX.strokeStyle = this.strokeStyle;
			ProvinceMap.MapCTX.fillStyle = this.fillStyle;

			const path = ProvinceMap.ParsePathToCanvas(this.path);

			// Province border
			ProvinceMap.MapCTX.globalAlpha = 1;
			ProvinceMap.MapCTX.font = 'bold 45px Arial';
			ProvinceMap.MapCTX.textAlign = "center";
			ProvinceMap.MapCTX.stroke(path);
			ProvinceMap.MapCTX.globalAlpha = 0.5;
			ProvinceMap.MapCTX.fill(path);

			// Title e.g. "B4D"
			ProvinceMap.MapCTX.globalAlpha = 1;
			ProvinceMap.MapCTX.fillStyle = (!this.ownerID ? '#ffffff' : this.strokeStyle);
			ProvinceMap.MapCTX.fillText(this.short, this.flag.x, this.flag.y);

			// Shadow from title
			ProvinceMap.MapCTX.globalAlpha = 0.7;
			ProvinceMap.MapCTX.fillStyle = '#000000';
			ProvinceMap.MapCTX.fillText(this.short, this.flag.x+2, this.flag.y+4);


			// Mouseclick? Tooltip!
			if(ProvinceMap.MapCTX.isPointInPath(path, ProvinceMap.Mouse.x, ProvinceMap.Mouse.y) && this.lockedUntil)
			{
				ProvinceMap.MapCTX.font = '40px Arial';
				ProvinceMap.MapCTX.fillStyle  = '#ffffff';
				ProvinceMap.MapCTX.textAlign = 'left';

				ProvinceMap.MapCTX.fillText(moment.unix(this.lockedUntil).format('HH:mm:ss'), ProvinceMap.Mouse.x, ProvinceMap.Mouse.y);

				ProvinceMap.ToolTipActive = true;
			}
		}

		Province.prototype.updateGGMap = function(){

			this.drawGGMap();

			// hier Farbe ändern
			// this.x += this.velocity.x // Move x coordinate
			// this.y += this.velocity.y // Move y coordinate
		}

		// Implementation
		let provinces = [];

		function init() {
			ProvinceMap.SVGPaths().forEach(function(i){

				const path = i.path.replace(/\s+/g, " ");
				const pD = ProvinceMap.ProvinceData()[i.id];

				let data = {
					id: i.id,
					name: pD.name,
					short: pD.short,
					links: pD.connections,
					flag: pD.flag,
					path: path,
					strokeStyle: '#444',
					fillStyle: null,
					alpha: 1
				};

				const prov = GildFights.MapData['map']['provinces'][i.id];

				if(prov['ownerId']){

					const colors = GildFights.SortedColors.find(c => (c['id'] === prov['ownerId']));

					data['ownerID'] = prov['ownerId'];
					data['ownerName'] = prov['owner'];
					data['fillStyle'] = ProvinceMap.hexToRgb(colors['main'], '.3');
					data['strokeStyle'] = ProvinceMap.hexToRgb(colors['main']);
					data['alpha'] = 0.3;

					if(prov['lockedUntil']){
						data['lockedUntil'] = prov['lockedUntil'];
					}
				}

				provinces.push(new Province(data));
			});

			ProvinceMap.MapMerged = provinces;
		}

		// Animation Loop
		function refresh() {
			// requestAnimationFrame(refresh) // loop
			ProvinceMap.MapCTX.clearRect(0, 0, ProvinceMap.Map.width, ProvinceMap.Map.height)

			// provinces.updateGGMap();

			provinces.forEach(province => {
				province.updateGGMap();
			});
		}

		init();
		// refresh();

		ProvinceMap.Refresh();
	},


	PrepareProvinces: ()=> {

	},


	Refresh: ()=> {
		ProvinceMap.MapCTX.clearRect(0, 0, ProvinceMap.Map.width, ProvinceMap.Map.height)

		const provinces = ProvinceMap.MapMerged;

		ProvinceMap.ToolTipActive = false;
		provinces.forEach(province => {
			province.updateGGMap();
		});

		if(!ProvinceMap.ToolTipActive)
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


	DrawProvinces: ()=> {
		const pD = ProvinceMap.ProvinceData();

		ProvinceMap.MapCTX.clearRect(0, 0, ProvinceMap.MapSize.width, ProvinceMap.MapSize.height);

		ProvinceMap.SVGPaths().forEach(function(i){
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
			ProvinceMap.MapCTX.font = 'bold 62px "Source Sans Pro"';
			ProvinceMap.MapCTX.textAlign = 'center';
			ProvinceMap.MapCTX.shadowColor = '#000000';
			ProvinceMap.MapCTX.shadowBlur = 25;
			ProvinceMap.MapCTX.strokeText(e.short, e.flag.x, e.flag.y);
			ProvinceMap.MapCTX.fillText(e.short, e.flag.x, e.flag.y);

			ProvinceMap.MapCTX.stroke();
		});
	},


	ParsePathToCanvas: (i)=> {
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


	ParseMove: (i, n)=> {
		let e = { x: 0, y: 0, index: i },
			s = ProvinceMap.ParseNumber(i, n);

		return (e.x = s.num), (s = ProvinceMap.ParseNumber(s.index, n)), (e.y = s.num), (e.index = s.index), e;
	},


	ParseNumber: (t, i)=> {

		let n = { num: 0, index: t };

		for (let e = "", s = !1, o = !1, c = t; c < i.length; c++) {
			let r = i.charAt(c);

			if (0 !== e.length || s || "-" !== r)
				if (o || "." !== r) {
					if (!r.match("[0-9]")) {
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


	ParseCurve: (i, n)=> {
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


	hexToRgb: (hex, alpha)=> {
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

		if(alpha) {
			h.push(alpha);
			return 'rgba('+h.join(',')+')';

		} else {
			return 'rgb('+h.join(',')+')';
		}
	},


	ProvinceData: ()=> {
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
			short: 'D4H',
			connections: [27, 28, 58],
			flag: {
				x: 1042,
				y: 302
			}
		}];
	},


	SVGPaths: ()=> {
		return [{
			id: 53,
			path: "M163.872,764.729c-7.181-4.726-14.166-9.785-21.582-14.105\n\t\tc-14.985-8.729-26.67-20.955-36.755-34.68c-3.638-4.951-5.859-11.179-7.738-17.135c-3.2-10.139-5.622-20.525-8.364-30.809\n\t\tc-3.592-13.472,1.39-25.231,13.542-31.959c11.61-6.428,24.1-7.195,36.819-5.157c8.189,1.313,16.171,4.243,24.382,5.028\n\t\tc13.873,1.326,27.872,1.291,41.781,2.329c4.818,0.359,9.971,1.353,14.192,3.552c9.976,5.198,19.516,11.242,29.145,17.087\n\t\tc1.344,0.816,2.375,2.328,3.248,3.708c4.493,7.104,11.175,8.257,18.361,5.946c10.415-3.35,20.743-7.083,30.807-11.361\n\t\tc5.49-2.334,10.351-3.642,16.158-1.141c7.946,3.422,16.251,2.836,24.424,0.501c5.43-1.551,10.735-3.557,16.196-4.974\n\t\tc8.679-2.252,17.421-3.625,26.505-2.242c11.104,1.691,22.289,2.854,35.122,4.455c-3.916,3.401-6.618,5.642-9.203,8.011\n\t\tc-16.728,15.331-16.057,35.257,1.357,49.836c8.202,6.867,18.056,10.196,27.94,12.659c11.863,2.957,18.064,10.353,21.447,21.232\n\t\tc0.789,2.538,1.762,5.029,2.392,7.604c3.285,13.426,9.715,24.545,21.848,32.067c3.693,2.29,6.501,6.008,9.715,9.072\n\t\tc-0.396,0.722-0.792,1.444-1.188,2.167c-3.044-0.628-6.304-0.764-9.092-1.981c-7.306-3.19-14.724-6.327-21.525-10.434\n\t\tc-14.999-9.056-31.102-10.869-48.063-9.048c-3.903,0.419-7.896,0.095-11.844-0.01c-13.565-0.359-27.138-1.196-40.69-0.947\n\t\tc-5.142,0.094-10.475,2.087-15.317,4.16c-37.506,16.051-76.019,17.022-115.388,8.73c-20.272-4.27-40.024-9.852-58.736-18.89\n\t\tc-2.588-1.25-5.629-1.562-8.46-2.309C164.792,765.427,164.313,765.105,163.872,764.729z"
		}, {
			id: 39,
			path: "M2255.567,1329.104c1.423,4.343,2.133,9.104,4.39,12.961\n\t\tc10.918,18.662,14.903,39.733,21.425,59.918c6.435,19.915,10.96,40.507,21.295,59.026c0.895,1.603,0.984,3.653,1.432,5.432\n\t\tc-1.057,0.414-1.761,0.96-2.11,0.787c-30.558-15.083-62.96-25.136-95.428-34.998c-30.982-9.411-60.639-21.756-88.044-39.214\n\t\tc-2.456-1.564-5.413-2.555-8.273-3.229c-5.782-1.364-11.94-1.567-17.44-3.606c-13.896-5.152-26.84,0.246-40.157,2.359\n\t\tc-6.155,0.977-12.674,2.042-18.694,1.048c-15.73-2.6-31.279-6.303-46.893-9.599c-1.243-0.263-2.435-0.771-5.285-1.697\n\t\tc2.953-3.256,4.922-6.178,7.579-8.188c4.443-3.36,5.79-7.518,5.968-12.927c0.412-12.556-2.854-23.83-11.057-33.265\n\t\tc-6.054-6.962-6.21-14.412-3.428-22.359c4.176-11.928,11.087-22.232,21.57-29.271c9.046-6.073,18.585-11.814,28.635-15.921\n\t\tc31.994-13.071,65.57-16.633,99.877-14.508c5.295,0.328,10.595,0.579,15.88,1.009c19.886,1.616,34.081,13.553,48.068,26.163\n\t\tc8.136,7.336,16.723,14.232,25.554,20.72c10.607,7.795,19.398,17.063,26.584,28.066c2.236,3.424,5.68,6.058,8.57,9.052\n\t\tC2255.578,1327.61,2255.572,1328.356,2255.567,1329.104z"
		}, {
			id: 34,
			path: "M2163.882,581.559c19.683,12.721,30.573,30.827,33.771,54.791\n\t\tc-7.975,0-15.752,0.112-23.523-0.042c-4.734-0.093-5.699-3.745-6.443-7.511c-0.852-4.316,2.102-9.372-2.833-12.92\n\t\tc-7.33-5.27-14.595-11.185-24.015-11.223c-11.138-0.045-21.631-2.78-32.369-5.014c-10.358-2.154-20.688-2.284-31.166,2.336\n\t\tc-8.972,3.957-19.135,5.175-28.721,7.785c-5.691,1.549-11.938,2.391-16.809,5.383c-16.127,9.907-33.6,15.966-51.918,19.736\n\t\tc-23.953,4.929-46.652,13.207-68.425,24.21c-2.665,1.348-5.338,2.982-8.196,3.568c-3.045,0.625-6.826,1.231-9.4-0.004\n\t\tc-12.842-6.161-26.642-8.278-40.441-10.279c-26.088-3.784-51.606-9.983-76.273-19.083c-15.998-5.902-30.35-15.153-42.272-27.614\n\t\tc-2.887-3.016-4.983-6.788-7.674-10.535c1.821-1.339,2.733-2.522,3.842-2.751c27.836-5.74,52.79-17.474,75.417-34.723\n\t\tc16.099-12.272,33.717-19.895,54.924-20.776c21.055-0.876,41.937-5.777,62.914-8.774c2.901-0.415,6.133-0.731,8.841,0.105\n\t\tc9.588,2.96,19.005,1.812,28.605,0.239c5.19-0.851,10.733-1.406,15.846-0.521c13.311,2.306,26.678,2.513,39.668-0.296\n\t\tc23.066-4.99,44.085,1.409,65.049,9.414c6.47,2.47,12.725,5.382,19.166,8.369c9.721,5.329,9.818,5.348,10.306,5.68\n\t\tc13.342,7.515,17.885,9.742,19.683,12.721z"
		}, {
			id: 36,
			path: "M2029.644,787.037c10.598,7.283,20.456,13.494,31.308,20.378\n\t\tc6.433,4.081,13.73,6.774,20.32,10.637c7.586,4.448,10.866,11.533,7.629,19.542c-8.777,21.707-19.51,42.446-38.66,57.056\n\t\tc-6.539,4.989-14.245,8.59-21.761,12.087c-3.098,1.441-7.101,1.24-10.693,1.26c-10.322,0.059-20.662-0.563-30.964-0.155\n\t\tc-14.229,0.564-27.471,4.541-39.14,13.144c-11.224,8.275-23.896,14.077-37.736,14.4c-17.248,0.403-34.626-0.895-50.963-7.601\n\t\tc-13.302-5.46-26.975-9.459-41.318-10.794c-4.611-0.429-9.424-0.952-13.904-0.13c-16.233,2.975-30.766-2.31-46.702-8.167\n\t\tc2.181-2.343,3.41-4.126,5.054-5.354c7.74-5.779,15.955-10.462,25.156-13.919c14.342-5.389,27.79-12.631,38.981-23.628\n\t\tc7.065-6.942,10.55-15.166,11.66-24.708c2.275-19.571,3.23-39.087-2.313-58.356c-0.254-0.885,0.091-1.942,0.212-3.727\n\t\tc2.453-0.3,4.938-0.928,7.402-0.853c21.527,0.66,42.233-4.1,63.051-8.754c11.921-2.665,24.193-4.444,36.38-4.989\n\t\tc7.753-0.347,15.778,1.757,23.44,3.708c20.581,5.242,46.874,12.893,60.541,17.568\n\t\tC2026.836,785.754,2028.104,786.214,2029.644,787.037z"
		}, {
			id: 47,
			path: "M574.762,1582.372c-0.517-2.592-0.603-5.367-1.62-7.745\n\t\tc-6.216-14.54-4.388-28.593,2.179-42.418c1.997-4.207,4.313-8.266,6.211-12.514c1.622-3.627,3.952-7.394,4.067-11.156\n\t\tc0.453-14.793,9.392-23.311,21.485-28.518c15.136-6.52,24.429-19.199,35.003-30.555c2.188-2.35,2.907-6.622,3.184-10.097\n\t\tc0.888-11.12,3.74-21.554,8.971-31.409c1.602-3.02,2.942-5.434,6.881-6.328c3.388-0.771,6.504-3.197,9.463-5.284\n\t\tc3.713-2.616,7.05-2.985,10.94-0.267c13.38,9.356,27.525,17.175,42.837,23.154c22.473,8.776,32.613,28.166,39.988,49.455\n\t\tc1.845,5.327,3.064,10.879,5.046,16.149c4.411,11.728,2.134,22.182-5.372,31.815c-3.474,4.459-6.773,9.079-10.525,13.293\n\t\tc-12.369,13.893-17.877,30.46-21.57,48.449c-3.212,15.646-0.169,31.215-2.258,46.664c-1.77,13.085-1.621,26.498-6.04,39.854\n\t\tc-2.288-0.445-4.219-0.575-5.976-1.199c-29.386-10.439-60.471-16.141-88.093-31.532c-1.048-0.584-2.542-0.37-3.829-0.527\n\t\tl0.376,0.271c-0.5-0.764-0.821-1.835-1.527-2.247c-18.476-10.811-33.308-25.407-45.281-43.067c-0.927-1.366-2.994-1.96-4.53-2.913\n\t\tC574.703,1583.009,574.699,1582.565,574.762,1582.372z"
		}, {
			id: 22,
			path: "M680.527,1352.202c-5.905-3.757-11.116-2.628-16.684,0.975\n\t\tc-6.38,4.126-13.123,8.084-20.249,10.557c-6.762,2.347-14.187,3.4-21.384,3.771c-25.729,1.323-48.532-6.293-67.91-23.588\n\t\tc-11.14-9.942-24.041-16.502-38.564-20.043c-17.496-4.266-31.066-14.897-42.943-27.782c-3.038-3.296-4.774-7.93-6.612-12.163\n\t\tc-3.171-7.303-5.895-14.797-8.915-22.167c-3.756-9.164-10.176-15.306-19.9-18.137c-4.422-1.288-8.726-3.343-12.697-5.7\n\t\tc-2.926-1.737-5.224-4.53-9.021-7.949c11.988-4.77,19.06-13.103,26.949-20.481c11.355-10.62,12.311-16.066,4.225-29.906\n\t\tc7.674-4.612,15.687-8.158,24.414-10.49c8.632-2.305,17.022-5.505,25.598-8.043c4.413-1.306,9.021-1.938,13.502-3.031\n\t\tc5.103-1.244,10.726-1.69,15.114-4.228c7.138-4.125,14.024-9.083,19.924-14.814c4.064-3.947,8.382-6.357,13.533-7.737\n\t\tc17.624-4.72,33.436-12.476,46.076-26.093c4.911-5.292,10.523-9.929,15.792-14.891c7.727-7.275,11.637-7.846,21.235-2.733\n\t\tc12.303,6.554,25.896,8.385,39.352,10.25c3.801,0.527,8.69-1.192,11.944-3.491c7.029-4.965,13.752-10.554,19.746-16.718\n\t\tc3.261-3.354,4.772-8.408,7.236-13.001c14.734,1.26,28.813,5.54,40.941,14.895c3.331,2.568,5.905,6.176,8.613,9.48\n\t\tc4.323,5.276,7.368,10.972,16.027,11.676c9.043,0.735,14.308,16.77,9.282,24.786c-5.484,8.748-4.787,14.29,2.645,20.984\n\t\tc0.247,0.223,0.54,0.395,0.786,0.616c10.667,9.591,10.667,9.591,21.243,0.948c21.594,16.79,24.438,20.105,29.163,34.446\n\t\tc-7.21,6.785-14.231,14.364-22.259,20.662c-7.421,5.822-16.891,5.575-25.91,5.202c-14.556-0.602-15.13-0.372-21.048,12.739\n\t\tc-1.64,3.634-3.157,7.367-5.211,10.764c-3.152,5.213-7.043,10.046-13.535,10.936c-9.846,1.35-14.824,8.255-18.939,16.006\n\t\tc-6.391,12.036-11.445,24.905-20.696,35.167c-8.41,9.329-13.55,20.305-18.514,31.636\n\t\tC698.158,1336.273,690.482,1345.011,680.527,1352.202z"
		}, {
			id: 18,
			path: "M1820.976,1489.194c-5.964-8.951-13.228-13.758-22.649-15.017\n\t\tc-1.221-0.163-2.657-0.841-3.446-1.753c-5.186-5.997-10.601-11.851-15.221-18.27c-7.929-11.017-18.403-17.129-31.866-17.707\n\t\tc-4.978-0.214-8.997-1.129-12.063-5.478c-3.164-4.488-8.082-5.561-13.317-5.331c-18.149,0.799-34.692-4.735-50.602-12.793\n\t\tc-0.891-0.45-1.753-1.046-2.7-1.282c-17.703-4.415-32.439-14.877-48.172-23.355c-5.264-2.837-9.357-6.354-11.697-11.707\n\t\tc-3.316-7.59-8.53-13.076-15.62-17.503c-19.435-12.136-38.661-24.618-57.702-37.364c-10.219-6.842-20.174-14.158-29.672-21.963\n\t\tc-4.239-3.483-8.164-8.219-10.312-13.213c-5.901-13.726-11.073-27.789-15.962-41.917c-2.78-8.035-1.748-9.182,6.479-12.338\n\t\tc10.56-4.051,21.272-7.755,31.631-12.27c14.998-6.537,29.129-14.62,41.54-25.493c10.481-9.181,18.843-19.549,21.629-33.709\n\t\tc0.938-4.771,2.908-9.34,4.563-14.489c10.88,2.434,20.372-0.264,30.032-2.952c10.25-2.854,20.313,1.357,30.435,2.573\n\t\tc1.281,0.153,3.092,2.773,3.22,4.367c0.395,4.878,1.337,10.255-0.214,14.631c-2.862,8.075-3.308,16.233-3.667,24.522\n\t\tc-0.475,10.956-0.521,21.942-1.369,32.867c-0.73,9.424,2.339,16.232,11.102,20.187c7.401,3.339,13.609,7.818,18.143,14.969\n\t\tc3.237,5.106,8.459,6.745,14.893,4.32c7.153-2.694,10.5-1.675,14.02,5.017c10.286,19.553,27.767,26.75,48.193,29.167\n\t\tc23.299,2.757,46.618,1.447,69.39-3.313c11.992-2.506,19.914,1.684,27.61,8.959c3.256,3.079,4.871,6.93,2.729,11.731\n\t\tc-1.475,3.305-2.408,6.918-3.118,10.485c-1.753,8.815,2.103,14.7,10.902,15.26c5.514,0.352,11.298-0.559,16.694-1.94\n\t\tc12.237-3.134,24.229-7.233,36.474-10.327c11.489-2.902,22.937-1.629,35.919,1.983c-2.038,3.646-3.248,6.443-5.043,8.796\n\t\tc-1.15,1.51-3.3,2.21-4.762,3.537c-4.622,4.199-5.249,7.207-1.153,11.964c3.861,4.485,8.311,8.707,13.207,11.99\n\t\tc4.692,3.146,6.752,6.747,6.908,12.28c0.318,11.276-2.964,21.697-6.988,31.941c-0.928,2.361-2.743,4.722-4.777,6.246\n\t\tc-12.854,9.627-26.221,18.281-42.604,20.776c-7.055,1.074-13.189,4.095-18.771,8.707c-4.814,3.976-10.507,6.881-15.387,10.788\n\t\tc-3.834,3.069-7.419,6.64-10.405,10.531c-5.143,6.706-11.332,11.323-19.943,11.661\n\t\tC1830.377,1478.246,1826.427,1483.273,1820.976,1489.194z"
		}, {
			id: 23,
			path: "M517.187,940.629c8.627-0.957,15.743-4.485,21.993-10.583\n\t\tc8.177-7.978,19.084-10.009,30.571-12.641c0,4.101-0.118,7.371,0.023,10.63c0.369,8.581,4.12,12.154,12.756,11.166\n\t\tc6.245-0.714,12.429-2.257,18.533-3.842c7.896-2.05,14.938-2.278,20.643,5.089c3.171,4.095,8.266,4.733,12.812,2.954\n\t\tc6.439-2.52,12.625-5.753,18.731-9.033c4.05-2.175,7.684-5.219,12.185-4.743c0.981,0.944,1.831,1.369,1.864,1.85\n\t\tc0.725,10.39,2.997,14.474,16.071,16.62c17.357,2.849,34.764,5.973,52.499,2.377c2.152-0.436,5.893,0.454,6.915,2.021\n\t\tc6.161,9.456,14.47,16.267,24.223,21.569c1.166,0.634,2.319,1.294,3.942,2.201c-4.475,2.188-7.739,3.264-10.318,5.235\n\t\tc-1.592,1.218-3.407,4.321-2.861,5.65c0.829,2.019,3.883,4.818,5.538,4.544c16.145-2.677,21.49,11.275,29.988,19.645\n\t\tc5.387,5.306,3.457,10.089-2.488,14.636c-6.382,4.879-11.985,9.324-21.418,7.382c-5.061-1.042-11.559,2.547-16.792,5.244\n\t\tc-7.538,3.885-6.414,11.684-6.419,18.584c-0.002,2.203,0.989,4.409,1.723,7.423c-11.196,1.777-20.868-3.595-31.719-4.959\n\t\tc-1.686,17.865-17.352,23.531-28.012,33.427c-1.744,1.619-5.745,1.707-8.471,1.216c-13.375-2.409-26.973-4.043-38.917-11.58\n\t\tc-7.33-4.626-14.129-1.884-20.071,3.24c-6.758,5.828-13.972,11.333-19.76,18.038c-10.272,11.9-23.972,17.332-38.009,22.486\n\t\tc-2.801,1.027-5.91,1.385-8.51,2.751c-3.999,2.101-7.773,4.673-11.478,7.278c-12.323,8.667-23.056,20.6-40.192,19.219\n\t\tc-0.974-0.078-2.121-0.067-2.946,0.364c-18.307,9.574-40.072,9.689-57.683,21.43c-6.708,4.472-14.915,2.373-22.419,1.512\n\t\tc-9.539-1.094-18.99-2.945-29.261-4.595c-2.683-5.566-5.175-12.469-9.137-18.387c-3.007-4.492-7.329-8.732-12.032-11.347\n\t\tc-17.318-9.623-26.756-28.308-23.062-47.71c3.21-16.861,12.709-29.797,25.854-40.248c6.767-5.381,13.864-10.347,20.846-15.453\n\t\tc11.075-8.1,17.33-18.927,19.254-32.533c0.785-5.551,2.474-10.998,4.06-16.401c1.105-3.767,3.469-6.136,7.893-6.329\n\t\tc13.266-0.581,25.254-5.16,36.513-12.036c3.95-2.412,8.234-4.286,12.417-6.301c6.411-3.086,12.835-2.916,19.272,0.048\n\t\tc2.106,0.97,4.359,1.617,6.492,2.533c3.841,1.649,6.073,0.316,7.95-3.316c2.87-5.553,6.618-10.67,9.273-16.311\n\t\tC517.272,948.039,516.797,944.631,517.187,940.629z"
		}, {
			id: 40,
			path: "M1879.616,1454.915c8.167-8.863,16.616-14.142,27.865-16.121\n\t\tc15.346-2.701,28.453-10.994,40.343-20.927c7.11-5.938,9.431-14.725,10.667-23.104c1.146-7.776,5.345-10.174,11.743-10.668\n\t\tc6.273-0.484,12.744-1.122,18.879-0.138c12.786,2.053,25.45,4.946,38.083,7.846c9.557,2.193,18.892,3.216,28.51,0.039\n\t\tc5.649-1.867,11.618-2.948,17.528-3.774c3.877-0.542,7.959-0.385,11.855,0.146c7.548,1.028,15.054,2.426,22.527,3.919\n\t\tc2.56,0.512,5.256,1.332,7.405,2.747c28.601,18.836,60.073,31.053,92.534,41.33c24.707,7.822,49.356,16.021,73.444,25.537\n\t\tc13.796,5.45,26.427,13.854,39.568,20.956c6.109,3.302,7.849,8.482,6.722,15.129c-2.35,13.854-6.14,27.227-12.471,39.827\n\t\tc-15.713,31.275-38.625,56.352-66.521,77.085c-21.216,15.769-44.403,28.042-68.566,38.649c-5.623,2.47-10.148,2.394-14.518-1.784\n\t\tc-9.594-9.169-19.354-18.179-28.668-27.625c-18.445-18.705-35.752-38.637-55.174-56.246c-20.178-18.292-41.46-35.897-66.289-47.649\n\t\tc-21.295-10.077-43.418-18.549-65.588-26.598c-23.663-8.592-45.306-20.681-66.089-34.577\n\t\tC1882.089,1458.032,1881.158,1456.57,1879.616,1454.915z"
		}, {
			id: 7,
			path: "M1244.429,1286.4c-11.005-11.067-22.624-22.436-33.811-34.212\n\t\tc-3.076-3.238-5.153-7.557-7.18-11.633c-3.55-7.135-6.531-14.552-10.068-21.693c-5.726-11.563-6.871-22.037,2.141-33.273\n\t\tc4.587-5.72,8.673-12.803,8.739-21.511c0.072-9.696-2.4-17.084-10.184-23.263c-6.705-5.322-12.908-11.469-18.474-17.984\n\t\tc-5.654-6.619-5.346-14.823-2.924-22.779c1.894-6.224,4.29-12.293,6.719-19.157c6.544-4.07,14.159-8.688,21.652-13.498\n\t\tc8.31-5.332,10.745-5.564,17.008,3.713c3.961,5.867,6.104,12.964,9.867,21.289c7.049,2.438,15.647,5.748,24.468,8.286\n\t\tc3.351,0.965,8.18,1.571,10.663-0.117c7.719-5.247,13.279,0.116,19.002,3.001c6.465,3.258,12.061,8.199,18.389,11.783\n\t\tc8.31,4.709,16.846,2.976,24.772-1.17c1.503-0.786,2.57-4.771,1.991-6.737c-1.93-6.55-0.305-12.385,1.686-18.13\n\t\tc8.25-0.68,16.031-1.378,23.821-1.95c10.683-0.785,14.319-5.416,13.191-16.284c-0.504-4.855-0.495-9.796-0.312-14.682\n\t\tc0.156-4.147,2.633-6.676,7.719-7.572c10.583,9.488,25.015,11.51,38.551,15.796c5.891,1.863,11.268-0.028,16.341-2.581\n\t\tc5.982-3.01,10.976-2.854,16.586,1.424c3.815,2.908,8.89,4.44,13.628,5.784c4.502,1.276,7.699,3.368,9.711,7.682\n\t\tc7.983,17.124,21.392,28.278,38.884,34.848c14.266,5.357,28.523,10.737,42.771,16.144c1.187,0.451,2.269,1.173,3.871,2.019\n\t\tc-0.794,2.621-1.512,4.992-2.2,7.263c7.731,8.06,17.915,6.338,27.747,7.441c-0.586,15.305-3.94,28.641-14.987,39.898\n\t\tc-12.601,12.841-27.136,22.589-43.269,29.881c-24.556,11.101-49.529,21.069-76.242,26.19c-9.386,1.8-18.509,5.394-27.467,8.895\n\t\tc-11.885,4.645-22.555,11.37-31.24,20.948c-5.928,6.539-13.172,11.104-21.46,14.127c-6.866,2.505-13.685,5.15-20.47,7.871\n\t\tc-8.706,3.49-17.409,3.65-26.282,0.629c-10.803-3.677-21.688-6.137-33.204-2.946c-2.748,0.762-5.961,0.097-8.928-0.218\n\t\tC1265.221,1288.817,1254.811,1287.582,1244.429,1286.4z"
		}, {
			id: 21,
			path: "M950.748,1449.068c-0.324-0.029-0.748,0.065-0.956-0.104\n\t\tc-8.248-6.747-17.23-5.084-26.402-2.51c-14.13,3.964-26.583,9.886-34.467,23.44c-3.263,5.61-5.226,10.473-2.866,16.713\n\t\tc0.878,2.322,1.02,4.924,1.84,9.172c-4.12-2.063-6.897-3.018-9.172-4.665c-12.141-8.788-25.924-10.884-40.525-11.718\n\t\tc-15.519-0.886-31.04-2.966-46.365-5.643c-14.227-2.482-24.613-10.821-31.114-24.065c-8.801-17.928-23.254-29.681-41.92-36.258\n\t\tc-13.624-4.8-25.231-12.832-37.778-21.779c2.825-2.528,4.91-4.446,7.052-6.3c7.987-6.912,8.45-14.576,1.43-22.395\n\t\tc-2.122-2.365-4.015-4.936-5.979-7.369c4.533-4.962,8.736-8.791,11.992-13.305c5.024-6.964,9.498-14.334,14.022-21.646\n\t\tc4.015-6.49,7.274-13.505,11.761-19.634c9.264-12.652,17.935-25.606,24.493-39.886c3.619-7.879,8.426-14.035,17.831-15.586\n\t\tc9.808-1.616,14.005-9.961,17.561-17.665c8.196-17.76,6.695-17.165,26.676-16.029c10.71,0.609,20.119-3.471,27.733-11.397\n\t\tc4.747-4.942,9.297-10.281,16.736-12.841c1.541,2.448,2.987,4.572,4.252,6.801c1.312,2.313,1.99,5.158,3.743,7.019\n\t\tc7.166,7.603,11.489,16.894,16.745,25.707c3.045,5.105,9.272,8.314,14.07,12.373c3.261,2.761,6.957,5.147,9.7,8.35\n\t\tc6.005,7.009,13.357,11.923,21.666,15.604c3.645,1.615,7.305,3.204,11.005,4.688c8.872,3.559,15.188,9.063,16.877,19.191\n\t\tc1.229,7.364,6.447,11.374,13.721,12.586c8.512,1.417,17.066,2.598,25.555,4.14c5.813,1.056,10.75,3.899,13.337,9.425\n\t\tc1.188,2.535,1.797,5.566,1.809,8.376c0.017,4.3-0.286,8.698-1.23,12.879c-1.144,5.06-2.198,10.51-4.9,14.77\n\t\tc-4.858,7.663-6.35,14.469-2.234,23.273c4.066,8.697,2.458,18.517-1.348,27.063c-3.896,8.747-9.304,16.846-14.361,25.037\n\t\tc-1.715,2.775-4.068,5.374-6.666,7.349C966.441,1438.032,958.542,1443.481,950.748,1449.068z"
		}, {
			id: 48,
			path: "M465.165,1295.239c8.407,7.07,15.262,14.024,23.26,19.224\n\t\tc7.692,4.999,16.246,9.207,24.991,11.937c15.513,4.843,29.224,12.118,41.771,22.543c16.294,13.54,35.268,21.157,56.857,21.081\n\t\tc9.258-0.033,18.516-0.006,27.939-0.006c-0.833,6.964-1.728,13.719-2.429,20.493c-0.983,9.483,0.407,11.085,9.606,11.64\n\t\tc1.296,0.077,2.584,0.278,4.563,0.499c-0.552,2.17-0.64,4.153-1.515,5.688c-4.899,8.6-6.988,18.034-7.58,27.685\n\t\tc-0.391,6.372-3.065,10.867-6.718,15.967c-15.433,21.546-38.753,30.072-62.123,37.492c-43.166,13.706-87.443,23.198-132.25,29.851\n\t\tc-37.884,5.626-74.894,0.378-111.282-10.6c-28.341-8.55-54.587-21.215-77.117-40.626c-7.959-6.857-14.793-15.021-22.091-22.537\n\t\tc1.343-1.854,1.736-3.026,2.492-3.35c25.135-10.742,44.258-29.162,62.523-48.716c11.121-11.904,21.606-24.538,33.701-35.365\n\t\tc17.922-16.043,39.975-25.105,62.827-31.61c24.511-6.977,47.835-16.298,69.292-30.131\n\t\tC462.939,1295.716,464.315,1295.528,465.165,1295.239z"
		}, {
			id: 8,
			path: "M1062.952,1098.188c2.143,3.704,3.226,6.106,4.774,8.154\n\t\tc5.038,6.662,11.069,11.364,20.21,10.189c5.717-0.734,11.804,2.896,18.346-2.045c-1.09-4.99-2.367-10.364-3.396-15.786\n\t\tc-0.42-2.208-1.233-5.067-0.276-6.695c6.646-11.308,11.362-24.038,22.27-32.33c1.506-1.146,4.297-1.249,6.318-0.879\n\t\tc1.823,0.333,4.057,1.581,4.986,3.108c5.274,8.67,15.99,9.003,22.854,15.241c1.809,1.644,4.845,2.109,7.412,2.712\n\t\tc7.883,1.848,10.422,5.722,5.904,12.179c-5.215,7.452-4.07,15.277-3.641,23.066c0.205,3.723,1.975,8.015,4.436,10.822\n\t\tc5.442,6.21,11.386,12.122,17.825,17.284c9.902,7.938,13.071,18.196,7.489,29.529c-2.456,4.987-5.75,9.587-8.894,14.206\n\t\tc-6.522,9.581-5.418,19.503-1.257,29.396c4.362,10.372,8.424,20.983,14.017,30.684c3.703,6.423,9.772,11.516,14.96,17.036\n\t\tc5.894,6.27,12.061,12.281,17.93,18.573c1.251,1.341,1.733,3.397,3.03,6.076c-7.411,2.424-14.163,2.549-20.706-0.1\n\t\tc-7.691-3.113-15.038-7.073-22.719-10.216c-6.402-2.617-13.164-4.353-19.58-6.942c-2.912-1.176-5.618-3.195-7.988-5.313\n\t\tc-6.74-6.02-13.806-11.331-22.874-13.315c-2.035,6.42-3.347,12.864-6.072,18.641c-4.595,9.738-13.604,12.629-23.779,8.813\n\t\tc-4.346-1.63-8.837-2.89-13.305-4.17c-3.94-1.131-7.044,0.495-9.962,3.106c-2.965,2.654-6.432,4.77-9.264,7.543\n\t\tc-2.571,2.519-4.583,5.605-6.783,8.367c-7.317,0.351-13.139-2.658-18.746-6.341c-2.215-1.455-4.337-3.218-6.766-4.147\n\t\tc-4.023-1.542-8.464-3.889-12.344-3.312c-3.139,0.467-5.712,4.736-8.535,7.322c-0.246,0.226-0.434,0.548-0.716,0.693\n\t\tc-9.045,4.641-16.329,11.052-19.995,22.602c-9.556-11.825-21.842-11.812-33.52-13.559c-2.956-0.441-5.94-0.776-8.844-1.448\n\t\tc-6.723-1.555-11.511-5.365-12.614-12.48c-1.499-9.67-7.48-15.191-16.118-18.6c-3.396-1.34-6.711-2.901-10.006-4.482\n\t\tc-3.597-1.725-7.554-3.053-10.61-5.488c-11.884-9.472-23.478-19.308-35.161-29.031c-0.498-0.414-0.864-1.016-1.208-1.581\n\t\tc-8.064-13.215-16.117-26.437-24.29-39.853c4.099-5.664,9.817-8.364,15.392-11.122c5.383-2.665,11.149-4.72,12.894-11.42\n\t\tc9.843-6.057,11.306-16.19,13.397-26.317c1.123-5.437,3.995-10.521,6.16-15.73c2.305-5.542,4.171-6.396,10.007-5.257\n\t\tc4.856,0.949,9.733,1.933,14.648,2.41c7.196,0.699,12.027-2.705,14.821-9.351c1.143-2.717,2.134-6.433,4.318-7.61\n\t\tc8.335-4.493,11.378-12.165,14.473-20.257c1.638-4.283,4.567-8.092,7.063-12.021c1.823-2.87,3.736-5.265,8.063-4.135\n\t\tc1.801,0.47,4.388-0.9,6.248-2.037c5.647-3.452,10.83-7.795,16.753-10.616c3.832-1.824,8.645-1.59,10.995-1.959\n\t\tc5.331,7.415,9.7,13.105,13.603,19.101c1.748,2.685,3.348,5.9,3.654,9.01c1.116,11.341,7.794,19.693,14.57,27.854\n\t\tc4.783,5.761,7.921,5.314,13.026-0.24C1057.809,1103.571,1059.845,1101.472,1062.952,1098.188z"
		}, {
			id: 42,
			path: "M1820.776,1516.792c3.412,22.492,11.34,41.294,21.778,59.323\n\t\tc10.753,18.574,23.683,35.432,38.897,50.307c22.819,22.307,37.934,49.379,51.864,78.996c-3.395,0.785-6.362,1.874-9.39,2.089\n\t\tc-6.964,0.491-13.96,0.53-20.94,0.803c-10.289,0.402-20.581,1.294-30.865,1.202c-64.756-0.577-128.969-5.231-190.33-28.368\n\t\tc-34.333-12.946-67.664-28.104-96.974-50.618c-24.94-19.155-44.33-42.933-57.18-71.879c-3.779-8.516-5.48-17.201-3.458-26.227\n\t\tc1.53-6.832,0.304-13.145-1.545-19.575c-3.261-11.345-1.06-18.045,8.987-24.534c14.922-9.636,31.697-13.365,48.713-9.051\n\t\tc18.611,4.72,36.602,11.909,54.83,18.116c14.46,4.925,28.852,10.053,43.321,14.948c3.13,1.059,6.451,2.051,9.709,2.136\n\t\tc10.152,0.268,18.894,3.405,27.884,8.516c9.048,5.143,19.863,6.489,30.87,5.71c10.875-0.769,21.885,0.236,32.83,0.629\n\t\tc7.855,0.281,14.973-1.721,21.981-5.272C1807.289,1521.239,1813.383,1519.553,1820.776,1516.792z"
		}, {
			id: 10,
			path: "M951.667,760.477c0.488,3.881,0.474,6.236,1.12,8.393\n\t\tc1.38,4.606,0.856,8.283-3.173,11.536c-3.681,2.971-4.851,7.186-2.939,11.707c2.315,5.479-0.474,8.637-4.434,11.817\n\t\tc-5.947,4.775-11.584,9.934-17.38,14.897c-2.859,2.449-3.429,4.989-2.102,8.796c2.925,8.396,5.185,17.026,7.58,25.599\n\t\tc0.315,1.128,0.268,2.804-0.368,3.676c-2.882,3.956-2.101,8.087-1.434,12.451c0.753,4.928-1.151,9.203-5.096,12.239\n\t\tc-4.18,3.216-9.394,5.441-12.703,9.334c-3.321,3.908-4.852,9.338-7.527,14.842c-7.708-3.599-11.449,0.693-13.697,8.449\n\t\tc-5.018-4.153-9.54-7.127-15.708-7.391c-4.842-0.208-7.839,1.077-9.468,5.222c-2.683,6.825-7.771,10.428-14.585,12.327\n\t\tc-3.184,0.887-6.291,2.203-9.259,3.672c-4.816,2.385-9.323,1.946-14.426,0.431c-5.254-1.56-11.247-2.883-16.436-1.863\n\t\tc-7.128,1.399-12.332,0.009-16.991-5.137c-0.63-0.695-1.63-1.056-3.468-2.199c-7.36,3.861-15.108,8.089-23.018,11.987\n\t\tc-2.748,1.354-5.898,1.893-10.626,3.345c4.099-11.236-1.432-16.709-7.67-22.791c-6.11-5.958-10.686-13.515-15.772-20.489\n\t\tc-7.494-10.274-7.433-10.319-18.486-6.506c-6.802-4.359-13.22-8.241-19.351-12.534c-2.009-1.408-3.633-3.693-4.788-5.914\n\t\tc-1.468-2.824-2.279-5.99-3.396-9.07c-8.295,1.742-15.614,3.449-23.005,4.744c-2.782,0.488-5.848,0.528-8.583-0.104\n\t\tc-7.349-1.698-13.314-4.642-14.667-13.615c-0.818-5.426-4.229-10.412-5.981-15.756c-3.718-11.337-0.333-18.682,9.565-24.889\n\t\tc13.704-8.593,26.918-17.961,40.491-26.769c4.11-2.667,8.561-4.961,13.121-6.749c8.596-3.37,17.533-5.951,24.771-11.743\n\t\tc-3.138-9.492-6.761-12.083-14.957-11.716c-5.21,0.233-10.438,0.043-17.037,0.043c-3.022-3.467-9.083-6.333-10.11-13.032\n\t\tc4.557-4.322,8.687-8.58,13.21-12.366c1.862-1.558,4.543-2.854,6.905-2.947c4.507-0.177,7.635-2.168,9.981-5.623\n\t\tc6.497-9.565,13.45-18.885,19.129-28.921c5.598-9.892,12.427-19.709,10.549-32.204c-0.144-0.956,0.17-1.98,0.276-2.973\n\t\tc1.459-13.67,3.054-15.558,16.826-17.081c5.151-0.57,9.798-1.274,13.406-5.41c2.526-2.896,5.513-2.71,9.056-1.364\n\t\tc6.685,2.54,12.97,5.344,16.046,12.393c1.675,3.836,4.961,5.604,8.683,5.747c7.69,0.295,10.643,5.321,11.338,11.596\n\t\tc0.787,7.101,2.523,12.063,10.956,12.333c1.933,0.062,4.395,2.8,5.542,4.894c5.575,10.179,10.791,20.556,16.121,30.869\n\t\tc1.222,2.364,2.86,4.639,3.494,7.16c2.084,8.296,6.678,12.117,15.682,11.909c6.685-0.155,10.006,5.819,12.921,11.095\n\t\tc2.896,5.241,5.304,10.664,10.89,13.915c4.869,2.834,9.249,5.63,15.551,5.006c3.352-0.332,7.296,2.359,10.51,4.411\n\t\tc3.322,2.121,5.985,5.245,9.11,7.71c6.809,5.372,8.609,5.358,15.833,0.281c1.63-1.146,3.164-2.429,4.744-3.646\n\t\tC947.693,763.528,948.958,762.56,951.667,760.477z"
		}, {
			id: 44,
			path: "M1067.564,1502.053c10.847-6.305,20.488-12.131,30.349-17.561\n\t\tc6.653-3.665,11.537-8.739,15.265-15.311c12.986-22.889,31.936-37.905,58.047-43.231c9.921-2.022,18.588-6.248,26.987-12.18\n\t\tc20.031-14.149,41.919-20.292,66.918-14.831c9.872,2.156,19.009,4.794,27.877,9.48c3.233,1.708,7.699,1.654,11.559,1.471\n\t\tc5.09-0.242,8.681,1.479,12.325,5.017c8.025,7.79,12.339,16.582,13.103,28.062c0.582,8.763,4.055,17.357,6.495,25.954\n\t\tc0.517,1.818,1.807,3.754,3.304,4.896c6.373,4.857,10.979,9.906,9.134,19.155c-0.595,2.979,2.604,7.688,5.354,10.198\n\t\tc14.496,13.235,17.827,30.775,19.179,48.892c0.638,8.552-0.038,17.307-1.077,25.853c-1.509,12.407,3.788,21.978,11.271,30.862\n\t\tc7.979,9.474,8.383,27.784-0.027,36.445c-2.521,2.597-6.858,4.303-10.546,4.693c-5.893,0.625-12.001,0.289-17.908-0.482\n\t\tc-25.284-3.299-50.334-1.863-75.541,1.581c-33.943,4.638-65.575-1.908-93.225-23.285c-6.419-4.962-11.856-10.908-13.974-18.974\n\t\tc-2.475-9.424-8.977-14.994-16.683-20.181c-7.942-5.348-15.18-11.752-22.632-17.808c-1.523-1.237-3.245-2.779-3.833-4.531\n\t\tc-3.846-11.46-13.55-16.967-22.922-22.62C1089.637,1533.53,1078.516,1518.441,1067.564,1502.053z"
		}, {
			id: 25,
			path: "M527.73,589.597c-0.883-0.897-1.621-2.05-2.672-2.652\n\t\tc-11.338-6.485-18.236-16.631-23.51-28.163c-2.908-6.358,0.114-16.733,7.284-22.037c7.741-5.725,15.973-10.787,24.009-16.108\n\t\tc3.319-2.198,7.442-3.688,9.888-6.601c6.573-7.828,15.154-12.879,23.497-18.222c4.103-2.628,8.842-5.076,13.561-5.76\n\t\tc9.805-1.42,19.788-1.609,28.277-2.205c9.176,7.734,17.347,14.499,25.355,21.451c2.209,1.918,5.155,4.159,5.638,6.662\n\t\tc1.174,6.091,5.288,9.659,9.003,13.902c3.792,4.332,6.818,6.794,13.495,4.763c6.011-1.828,13.159-1.291,19.502-0.133\n\t\tc3.725,0.679,7.39,4.125,10.14,7.176c4.736,5.254,9.643,9.762,16.215,12.874c4.753,2.25,8.218,2.261,11.497-1.5\n\t\tc3.946-4.524,8.132-5.118,13.167-1.894c1.639,1.05,3.668,1.929,5.571,2.048c6.579,0.413,9.157,4.288,10.156,10.242\n\t\tc0.421,2.512,1.23,5.448,2.914,7.156c3.463,3.516,5.529,7.284,5.85,12.229c0.093,1.437,1.109,3.441,2.293,4.067\n\t\tc3.791,2.004,3.99,5.661,3.379,8.628c-1.988,9.654,2.257,16.731,8.307,23.35c0.648,0.708,1.026,1.664,1.786,2.934\n\t\tc-3.545,6.38-8.442,9.498-16.279,10.652c-14.313,2.108-16.639-1.628-19.068,16.835c-0.216,1.637-1.113,3.238-1.087,4.845\n\t\tc0.292,18.453-9.16,32.547-20.311,45.915c-1.49,1.786-3.252,3.476-4.243,5.521c-3.427,7.072-6.856,13.568-16.391,13.779\n\t\tc-2.356,0.052-4.956,3.154-6.897,5.339c-6.124,6.894-13.29,10.565-22.828,9.865c-6.505-0.477-12.776-0.241-19.415-2.054\n\t\tc-9.091-2.482-18.984-2.202-28.555-2.65c-2.817-0.132-6.031,0.698-8.511,2.08c-17.487,9.743-37.023,12.364-56.131,16.388\n\t\tc-13.161,2.771-26.394,2.295-39.586-0.407c-33.13-6.784-54.664-27.29-67.905-57.454c-1.407-3.204-1.722-7.147-1.596-10.715\n\t\tc0.345-9.788,3.863-18.078,12.509-23.652c4.469-2.881,8.625-6.246,13.077-9.156c11.194-7.317,23.846-9.981,36.918-10.666\n\t\tc7.202-0.377,12.98-3.073,17.188-8.67c4.521-6.014,9.882-10.685,16.904-13.521c5.626-2.273,7.928-7.026,7.87-12.733\n\t\tc-0.063-6.264-4.919-8.11-9.937-9.447c-3.52-0.937-7.072-1.747-10.61-2.614L527.73,589.597z"
		}, {
			id: 19,
			path: "M1790.525,1473.692c-10.096,10.933-20.851,17.882-35.589,15.941\n\t\tc-9.714-1.279-18.245,1.365-26.204,7.151c-6.103,4.437-12.682,8.313-19.377,11.808c-6.964,3.634-14.577,4.895-22.296,2.554\n\t\tc-13.343-4.044-26.723-8.014-39.887-12.592c-18.207-6.33-36.063-13.697-54.378-19.676c-15.814-5.163-32.271-5.479-48.144-0.314\n\t\tc-7.742,2.519-14.678,7.52-21.128,10.944c-3.619-5.433-7.496-10.985-11.082-16.723c-2.811-4.499-5.122-9.309-7.901-13.83\n\t\tc-4.321-7.03-8.382-14.3-13.444-20.769c-3.842-4.91-6.664-9.776-7.115-16.035c-0.803-11.155-4.299-21.842-10.331-30.868\n\t\tc-6.964-10.422-17.831-16.233-30.853-14.425c-8.604,1.195-16.557,0.631-24.258-3.172c-5.82-2.873-11.591-2.698-17.338-0.066\n\t\tc-11.453,5.243-23.519,9.394-32.67,18.72c-5.73,5.84-12.216,6.642-20.104,3.934c-11.918-4.091-24.43-6.415-35.426-13.113\n\t\tc-2.127-1.295-5.146-1.051-7.695-1.739c-5.311-1.433-6.926-4.367-5.271-9.771c1.158-3.788,3.16-7.391,3.841-11.242\n\t\tc2.027-11.475-6.878-27.366-19.884-31.214c-8.771-2.596-16.438-7.089-22.932-13.535c-4.031-4.003-7.93-8.107-7.229-14.925\n\t\tc7.261-0.897,14.355-1.62,21.391-2.712c3.237-0.503,6.633-1.218,9.487-2.726c7.592-4.009,15.225-4.168,23.191-1.608\n\t\tc3.479,1.118,7.01,2.105,10.564,2.948c8.214,1.946,16.379,2.298,24.594-0.373c18.719-6.085,36.708-12.636,51.029-27.718\n\t\tc7.238-7.623,17.862-13.007,27.941-16.738c16.4-6.074,33.611-9.963,50.979-14.916c1.32,3.18,2.245,5.192,3.002,7.267\n\t\tc4.9,13.437,9.64,26.934,14.681,40.317c3.772,10.013,10.804,17.239,19.716,23.133c18.004,11.903,35.657,24.336,53.55,36.411\n\t\tc9.633,6.501,19.412,12.788,29.219,19.026c5.501,3.5,9.771,7.946,12.292,14.009c2.831,6.803,7.893,11.258,14.452,14.487\n\t\tc5.051,2.486,9.757,5.675,14.598,8.585c1.139,0.685,2.104,1.716,3.303,2.23c23.692,10.179,46.535,22.739,72.684,26.071\n\t\tc0.329,0.042,0.668,0.265,0.97,0.214c10.95-1.845,20.027,1.14,27.578,9.59c1.608,1.8,5.492,2.479,8.194,2.231\n\t\tc12.003-1.098,19.999,5.64,27.521,13.368c3.907,4.016,7.573,8.285,11.122,12.623\n\t\tC1787.69,1468.657,1788.994,1471.266,1790.525,1473.692z"
		}, {
			id: 6,
			path: "M1590.359,1066.094c-2.092-0.421-3.436-0.445-5.037,0.254\n\t\tc-6.067,2.652-11.887,5.895-17.711,9.076c-4.354,2.38-8.738,4.769-12.799,7.598c-3.195,2.227-6.418,4.755-8.727,7.825\n\t\tc-3.244,4.315-6.557,6.429-11.824,3.874c-4.245-2.06-7.734-0.261-10.926,2.496c-2.013,1.737-3.926,3.592-5.964,5.298\n\t\tc-8.526,7.138-9.263,7.053-19.122,1.333c-12.369-7.178-22.703-16.136-28.451-29.689c-2.044-4.817-5.779-7.547-11.302-8.688\n\t\tc-4.72-0.975-9.195-3.519-13.539-5.819c-4.175-2.209-8.302-5.277-13.008-2.503c-15.412,9.084-29.467,1.352-43.709-3.284\n\t\tc-3.225-1.05-5.962-3.601-9.604-5.888c6.631-7.016,12.432-13.082,18.136-19.237c1.557-1.679,2.835-3.618,4.219-5.454\n\t\tc3.562-4.729,7.217-9.394,10.622-14.232c1.694-2.406,3.188-5.031,4.296-7.751c1.349-3.314,2.198-6.833,3.606-11.365\n\t\tc14.676,10.774,27.209,7.84,38.502-5.424c-0.587-1.826-1.222-3.625-1.742-5.458c-1.608-5.66-0.957-6.895,4.572-8.88\n\t\tc14.3-5.135,19.135-15.813,13.311-29.621c-0.89-2.109-2.041-4.175-3.417-6c-5.557-7.371-10.827-15.026-17.054-21.793\n\t\tc-3.485-3.789-8.405-6.507-13.1-8.87c-5.781-2.909-6.72-7.406-6.682-13.175c0.042-6.206,4.194-7.648,8.748-9.161\n\t\tc8.768-2.911,16.157-7.92,21.658-15.338c4.136-5.577,9.479-9.183,15.826-11.666c4.024-1.575,7.795-3.912,11.912-5.11\n\t\tc4.312-1.255,8.881-1.734,13.372-2.236c7.211-0.807,14.455-1.317,21.677-2.037c1.627-0.162,3.408-1.328,4.795-0.922\n\t\tc8.477,2.479,16.355-0.798,24.538-1.762c11.915-1.403,22.413-5.864,32.673-11.52c2.805-1.545,5.841-2.672,9.692-4.407\n\t\tc2.266,7.18,4.133,13.423,6.212,19.594c2.579,7.659,2.655,7.633,11.442,6.222c3.839,7.619,10.684,8.951,18.946,7.181\n\t\tc4.195,7.713,9.642,13.522,18.131,16.231c2.317,0.74,3.532,4.577,5.537,6.727c3.786,4.065,7.553,8.2,11.748,11.821\n\t\tc4.715,4.071,9.894,7.606,15.658,11.971c-8.938,6.038-1.609,13.104-2.869,20.236c-1.466,1.005-3.304,2.314-5.19,3.548\n\t\tc-4.86,3.178-8.698,7.008-10.238,12.952c-2.125,8.2-6.599,13.514-15.725,15.731c-11.459,2.785-14.465,10.416-10.146,21.4\n\t\tc0.949,2.415,2.517,4.586,3.955,7.146c-6.626,7.74-15.795,3.656-24.012,5.848c0.262,1.48,0.136,3.216,0.855,4.464\n\t\tc6.468,11.211,13.299,22.217,19.568,33.535c3.181,5.745,7.136,7.896,13.771,7.042c5.496-0.706,11.237-0.172,16.796,0.466\n\t\tc4.962,0.568,7.845,3.688,6.986,9.012c-0.773,4.801-0.095,9.074,2.338,13.404c1.165,2.075,1.646,5.419,0.822,7.572\n\t\tc-3.328,8.709-7.122,17.221-15.102,23.027c-5.856,4.263-11.336,9.04-17.168,13.341c-2.354,1.737-5.193,2.816-8.986,4.813\n\t\tc-4.982-7.275-9.735-14.383-14.673-21.358c-2.484-3.511-5.209-6.867-8.025-10.118c-1.037-1.196-2.984-2.95-3.956-2.648\n\t\tc-8.188,2.546-12.738-3.665-18.504-7.08c-1.628-0.966-2.723-1.629-4.643-2.104L1590.359,1066.094z"
		}, {
			id: 17,
			path: "M1808.359,1149.403c-2.62,3.653-4.68,6.589-6.806,9.476\n\t\tc-4.919,6.678-4.988,14.089,1.223,19.527c6.154,5.388,13.011,10.192,20.187,14.094c3.087,1.679,7.943,1.216,11.672,0.344\n\t\tc6.045-1.414,10.569-0.452,15.393,3.771c4.148,3.631,9.524,6.059,14.672,8.295c5.572,2.42,11.551,3.002,17.503,0.852\n\t\tc0.938-0.339,1.873-0.687,2.827-0.973c16.457-4.939,31.76-4.225,46.043,7.045c13.939,10.999,30.662,15.648,48.059,17.919\n\t\tc9.879,1.29,19.773,2.48,29.667,3.663c8.8,1.052,16.603,4.711,23.97,9.336c1.829,1.148,3.048,3.269,5.563,6.075\n\t\tc-4.309,1.961-7.763,3.497-11.188,5.098c-15.768,7.375-30.496,15.899-41.33,30.309c-6.692,8.897-11.274,17.913-10.293,29.253\n\t\tc0.168,1.946-0.219,3.939-0.394,6.567c-2.219,0.537-4.332,1.313-6.502,1.527c-7.599,0.752-15.206,1.539-22.829,1.855\n\t\tc-4.61,0.189-9.303-0.145-13.874-0.812c-9.722-1.422-19.082-0.907-28.512,2.313c-10.691,3.652-21.675,6.457-32.565,9.51\n\t\tc-2.865,0.804-5.847,1.568-8.794,1.648c-9.276,0.252-12.978-4.934-10.538-14.066c1.019-3.817,2.03-7.711,2.34-11.625\n\t\tc0.446-5.647-2.403-9.587-6.455-13.741c-8.222-8.432-16.912-9.453-27.973-6.834c-21.494,5.091-43.549,5.539-65.479,3.657\n\t\tc-15.436-1.324-30.238-5.365-41.047-17.813c-2.597-2.992-4.851-6.312-7.021-9.638c-5.111-7.84-9.771-10.297-18.388-7.373\n\t\tc-5.609,1.903-9.445,0.331-12.009-3.86c-4.033-6.598-9.654-10.95-16.506-13.875c-9.74-4.155-12.672-11.227-11.583-21.592\n\t\tc1.352-12.861,1.216-25.873,1.935-38.808c0.163-2.93,0.587-6.145,1.947-8.654c5.31-9.78,3.034-19.199-0.578-29.308\n\t\tc-6.095-0.673-12.27-1.357-18.445-2.036c-3.7-0.406-6.058-1.947-6.581-6.094c-0.577-4.57,1.884-6.995,5.426-8.433\n\t\tc3.347-1.358,6.99-1.983,10.975-3.058c0.286-6.982,4.795-10.724,10.354-14.325c7.173-4.647,13.963-10.03,20.284-15.791\n\t\tc3.834-3.494,6.89-8.058,9.535-12.584c2.938-5.03,5.667-9.845,12.059-10.861c0.309-0.049,0.659-0.246,0.863-0.483\n\t\tc7.249-8.421,16.392-6.392,25.6-4.895c6.787,1.104,13.828,0.959,20.462,2.577c4.619,1.127,9.221,3.697,12.975,6.693\n\t\tc6.413,5.115,11.267,12.104,19.748,14.632c4.347,1.294,4.528,5.674,3.939,9.251c-1.132,6.885-2.514,13.867-8.353,18.701\n\t\tc-4.202,3.481-5.466,8.216-5.867,13.308c-0.824,10.465,4.926,15.739,15.621,15.605c8.2-0.104,16.422,0.86,24.615,1.562\n\t\tC1805.025,1146.432,1806.041,1147.757,1808.359,1149.403z"
		}, {
			id: 38,
			path: "M1812.119,1149.665c-2.229-5.544-6.221-6.928-10.73-7.175\n\t\tc-7.22-0.395-14.453-0.533-21.678-0.847c-4.816-0.21-9.829-1.132-11.666-6.032c-1.926-5.132-1.655-11.232,2.479-15.049\n\t\tc8.354-7.707,10.364-17.193,11.004-27.861c0.231-3.863,2.599-8.523,5.504-11.135c11.812-10.616,24.359-20.062,41.972-15.089\n\t\tc1.783,0.504,3.939,0.22,5.805-0.212c6.043-1.398,11.67-0.094,17.637,1.147c9.748,2.029,17.167,5.425,20.91,15.705\n\t\tc1.341,3.683,6.32,6.444,10.175,8.719c7.08,4.181,14.435,7.96,21.924,11.358c3.534,1.604,7.621,2.561,11.501,2.718\n\t\tc8.123,0.329,13.404,3.783,17.454,10.999c13.006,23.173,41.794,34.204,67.061,25.766c17.001-5.68,33.48-13.076,50.692-17.938\n\t\tc20.445-5.773,41.317-10.229,62.213-14.143c13.238-2.479,26.57,0.172,39.357,4.194c18.763,5.901,36.99,12.928,53.041,24.865\n\t\tc6.355,4.728,13.748,8.084,20.746,11.921c6.898,3.784,10.896,9.492,12.311,17.195c0.9,4.904,1.98,9.78,3.151,14.627\n\t\tc1.534,6.35-0.148,11.937-4.106,16.807c-5.862,7.216-12.095,14.131-17.957,21.348c-6.037,7.434-14.014,11.819-22.338,16.223\n\t\tc-14.144,7.48-27.528,9.328-43.604,4.425c-18.373-5.603-38.034-4.343-57.42-3.05c-17.011,1.135-33.745,2.702-50.091,7.782\n\t\tc-2.007,0.624-5.504-0.333-7.015-1.849c-10.531-10.564-23.761-13.881-37.933-15.523c-11.871-1.378-23.72-3.165-35.464-5.385\n\t\tc-11.55-2.182-22.115-7.065-31.855-13.685c-2.745-1.866-5.698-3.45-8.331-5.458c-12.864-9.814-27.322-7.81-40.885-3.657\n\t\tc-13.218,4.048-23.713,0.688-33.19-7.415c-5.712-4.883-11.117-6.508-18.215-4.438c-5.307,1.547-10.155,1.033-14.585-3.518\n\t\tc-3.381-3.473-8.408-5.271-12.25-8.376c-7.292-5.895-7.68-10.163-2.445-17.712\n\t\tC1807.721,1156.422,1810.016,1152.835,1812.119,1149.665z"
		}, {
			id: 11,
			path: "M1104.041,609.319c6.237,5.844,11.546,9.869,15.633,14.891\n\t\tc5.01,6.156,11.183,10.023,18.154,13.443c6.2,3.041,11.812,7.306,17.587,11.173c1.346,0.901,3.037,2.225,3.326,3.613\n\t\tc1.734,8.315,3.778,16.66,4.356,25.087c0.375,5.467-3.345,8.242-8.895,8.783c-2.639,0.258-5.613,0.823-7.937-0.063\n\t\tc-10.192-3.882-20.224-1.389-30.364,0.104c-6.195,8.343-11.475,10.223-21.836,7.726c-11.602-2.796-11.677-2.756-16.961,8.926\n\t\tc-9.106,0.931-9.106,0.931-17.085,8.36c-6.062-3.436-12.591-5.071-17.984,0.83c-7.168-5.485-13.467-10.248-19.704-15.092\n\t\tc-5.69-4.42-10.64-3.519-16.067,0.989c-5.291,4.396-11.471,7.703-17.029,11.801c-2.918,2.152-5.706,4.689-7.922,7.542\n\t\tc-8.756,11.271-16.781,23.148-26.047,33.971c-5.305,6.195-12.33,10.988-18.939,15.934c-1.272,0.952-4.441,0.175-6.322-0.695\n\t\tc-2.353-1.089-4.659-2.783-6.318-4.771c-5.709-6.845-12.609-9.406-21.679-9.969c-7.018-0.436-13.353-5.384-17.117-12.297\n\t\tc-1.893-3.477-3.86-6.984-6.31-10.067c-3.364-4.232-7.316-7.589-13.453-7.277c-4.256,0.217-7.414-1.829-9.466-5.984\n\t\tc-4.701-9.514-9.813-18.824-14.715-28.239c-1.535-2.946-3.548-5.818-4.284-8.971c-1.998-8.557-6.419-13.733-16.54-12.83\n\t\tc-0.775-3.444-1.574-6.58-2.176-9.754c-1.275-6.728-3.789-11.866-11.871-12.447c-2.589-0.186-6.211-2.043-7.295-4.182\n\t\tc-3.597-7.097-9.155-11.156-16.454-13.457c-0.827-0.261-1.414-1.281-2.538-2.355c3.989-6.448,9.912-9.115,17.084-9.956\n\t\tc7.724-0.906,15.511-2.518,19.856-9.689c7.871-12.989,19.833-21.137,32.211-28.97c1.957-1.238,4.254-2.411,5.491-4.228\n\t\tc3.754-5.517,8.56-7.403,15.249-7.399c3.945,0.002,7.942-2.795,11.826-4.533c9.605-4.299,9.144-3.866,16.772,3.155\n\t\tc5.289,4.868,11.809,8.539,18.178,12.013c2.262,1.233,5.743,0.623,8.589,0.256c1.89-0.243,3.9-1.224,5.414-2.431\n\t\tc8.632-6.885,17.724-8.505,28.66-5.546c4.296,1.162,10.017-2.223,14.887-4.068c7.744-2.935,15.221-6.591,23-9.42\n\t\tc6.243-2.27,12.041-1.087,17.979,2.526c7.619,4.636,15.808,8.489,24.092,11.836c8.089,3.269,15.459,7.429,21.653,13.487\n\t\tc4.814,4.709,10.102,5.087,16.522,4.174c8.077-1.149,16.367-0.763,24.558-1.176c1.939-0.098,3.985-0.432,5.75-1.194\n\t\tc5.099-2.201,10.033-4.779,15.117-7.016c6.329-2.784,8.013-5.56,7.143-12.448c-1.426-11.286,0.196-14.714,10.221-19.502\n\t\tc4.034-1.927,8.487-2.974,12.76-4.425c2.369,9.084,4.506,17.058,6.518,25.063c1.521,6.053,0.524,9.645-5.046,12.604\n\t\tc-6.719,3.571-12.585,7.72-18.151,13.088c-5.572,5.374-13.284,8.548-20.119,12.583\n\t\tC1112.632,604.816,1109.125,606.572,1104.041,609.319z"
		}, {
			id: 1,
			path: "M1452.797,983.743c-8.49,9.674-16.626,11.096-26.703,5.635\n\t\tc-2.992-1.622-6.534-2.231-10.538-3.538c-0.903,4.771-1.213,8.403-2.339,11.762c-1.016,3.029-2.6,6.002-4.511,8.567\n\t\tc-3.31,4.445-7.243,8.422-10.601,12.835c-8.187,10.758-14.668,23.127-29.261,27.268c-2.5,0.709-5.277,4.48-5.806,7.244\n\t\tc-1.042,5.444-1.235,11.245-0.625,16.771c1.023,9.242-1.697,13.004-10.561,13.437c-7.426,0.362-14.585,3.396-22.348,1.026\n\t\tc-3.334-1.018-5.18,2.478-5.248,5.808c-0.138,6.613-0.041,13.23-0.041,20.031c-8.787,4.537-16.234,5.485-24.659-0.222\n\t\tc-9.789-6.632-20.5-11.905-29.414-16.974c-5.906,1.947-10.424,5.097-14.105,4.313c-8.32-1.77-16.954-4.334-24.04-8.819\n\t\tc-4.497-2.847-6.491-9.697-9.494-14.82c-0.656-1.117-0.675-2.594-1.251-3.778c-5.435-11.177-10.748-12.704-21.27-6.073\n\t\tc-5.062,3.188-9.871,6.815-15.09,9.709c-6.07,3.365-10.844,0.931-9.761-5.451c1.66-9.783-1.002-20.1,3.801-29.463\n\t\tc0.707-1.378,1.173-3.441,0.672-4.787c-4.11-11.048-5.171-23.215-14.274-32.384c-8.497-8.558-7.815-14.134,0.146-23.376\n\t\tc3.878-4.503,7.361-9.346,11.233-13.853c1.478-1.72,3.333-3.452,5.38-4.284c7.73-3.143,13.173-7.804,12.386-17.19\n\t\tc8.124-3.124,15.464-6.218,24.292-5.235c20.795,2.314,35.755-8.373,47.157-24.185c5.697-7.901,11.297-13.967,21.407-16.186\n\t\tc6.178-1.355,12.369-5.259,17.192-9.55c6.771-6.024,14.367-9.95,22.895-11.361c10.495-1.737,19.284-6.847,28.445-11.515\n\t\tc5.576-2.84,11.4-5.312,17.327-7.314c12.639-4.271,21.668,1.761,29.567,10.906c3.871,4.48,7.614,9.397,12.41,12.651\n\t\tc3.868,2.625,9.229,3.049,14.296,4.56c0.295,1.895,0.815,3.808,0.851,5.73c0.136,7.34,3.093,12.72,10.036,15.758\n\t\tc6.314,2.762,10.423,7.644,14.17,13.458c3.684,5.717,9.27,10.169,13.571,15.537c5.637,7.034,7.059,14.328,1.887,22.82\n\t\tc-2.696,4.428-5.769,6.903-10.447,8.264C1450.895,969.988,1448.684,975.246,1452.797,983.743z"
		}, {
			id: 0,
			path: "M1437.48,836.86c-4.643,13.99-8.362,28.175-9.853,43.96\n\t\tc-5.688,2.906-10.456-1.101-14.859-4.855c-2.983-2.543-5.201-6.01-7.644-9.154c-9.629-12.397-20.264-16.427-35.131-11.539\n\t\tc-8.76,2.881-16.754,8.015-25.324,11.576c-6.686,2.777-13.886,4.313-20.571,7.092c-6.979,2.901-14.195,5.823-20.248,10.201\n\t\tc-7.394,5.348-14.643,10.218-23.794,11.921c-5.445,1.014-9.689,4.144-12.626,9.022c-2.059,3.42-4.073,6.995-6.786,9.86\n\t\tc-2.896,3.061-6.235,6.833-9.997,7.74c-13.36,3.218-26.844,3.576-39.654-2.873c-3.722-1.874-3.61-5.033-3.105-8.563\n\t\tc1.505-10.524,1.497-10.681-8.542-15.191c-3.743-1.682-5.35-4.028-6.276-8.06c-2.729-11.886-6.9-23.327-7.832-35.775\n\t\tc-0.391-5.22-5.064-10.806-9.128-14.898c-5.659-5.698-9.245-11.976-10.899-19.701c-2.205-10.299-8.281-17.95-16.927-23.742\n\t\tc-2.207-1.478-4.129-3.388-6.371-4.801c-11.269-7.104-12.26-18.245-11.512-29.848c0.178-2.756,1.413-6.631,3.451-7.87\n\t\tc8.367-5.089,9.434-12.917,9.576-21.408c0.016-0.972,0.316-1.938,0.609-3.628c7.55-2.424,17.561-2.7,17.893-14.414\n\t\tc6.263-6.776,6.818-14.47,2.145-23.349c11.816-2.234,19.293-9.077,26.87-16.19c7.726-7.254,15.662-6.235,22.547,1.666\n\t\tc1.087,1.248,1.868,2.756,2.878,4.076c9.02,11.784,15.86,13.582,27.446,4.538c10.259-8.008,19.684-10.58,31.119-3.161\n\t\tc4.661,3.023,10.389,4.413,15.017,7.475c2.847,1.885,4.639,5.451,6.715,8.395c3.019,4.28,5.864,8.68,9.302,13.799\n\t\tc2.48-2.775,4.114-4.604,5.17-5.784c5.628,1.802,10.814,3.529,16.041,5.119c7.416,2.257,13.533,10.897,13.147,18.819\n\t\tc-0.273,5.627-0.635,11.25-0.923,16.294c4.834,6.489,10.496,3.765,17.224,2.213c0.633,4.224,1.533,7.899,1.676,11.604\n\t\tc0.484,12.676,4.181,16.34,17.03,16.705c4.303,0.122,8.596,1.01,12.889,0.979c4.192-0.03,8.378-0.788,12.928-1.265\n\t\tc0.686,2.796,1.373,4.651,1.566,6.555c0.78,7.678,4.142,13.799,10.047,18.828c2.462,2.097,4.859,4.907,5.933,7.881\n\t\tC1422.792,818.459,1430.718,827.269,1437.48,836.86z"
		}, {
			id: 41,
			path: "M2167.219,1657.801c-4.531,1.848-7.734,3.312-11.045,4.479\n\t\tc-57.036,20.121-115.632,33.419-175.751,40c-10.565,1.156-21.184,1.929-31.702,3.414c-6.898,0.976-11.413-1.167-14.467-7.432\n\t\tc-2.912-5.976-6.729-11.527-9.451-17.579c-9.996-22.215-25.077-40.641-41.834-57.989c-22.393-23.183-41.194-48.861-52.223-79.512\n\t\tc-2.352-6.536-3.651-13.465-5.235-20.259c-0.95-4.079,0.607-6.97,4.567-8.82c6.599-3.085,13.08-6.428,19.559-9.765\n\t\tc1.695-0.873,3.196-2.121,5.495-3.678c-7.283-7.46-17.418-6.879-25.672-10.996c0.419-5.93,4.668-7.568,8.829-7.912\n\t\tc10.892-0.896,18.608-6.457,24.681-15.022c1.15-1.624,2.379-3.232,3.795-4.621c5.001-4.908,6.65-4.838,12.972-1.125\n\t\tc12.027,7.063,24.281,13.739,36.265,20.874c20.188,12.019,42.875,17.962,64.503,26.37c22.504,8.749,43.875,19.272,63.217,33.56\n\t\tc23.026,17.01,45.131,35.104,64,56.928c12.615,14.59,25.96,28.572,39.434,42.383\n\t\tC2152.838,1646.923,2159.691,1651.605,2167.219,1657.801z"
		}, {
			id: 20,
			path: "M953.955,1451.56c5.936-4.733,11.156-8.646,16.083-12.896\n\t\tc4.977-4.295,10.002-8.623,14.368-13.508c3.289-3.68,5.291-8.479,8.353-12.398c8.646-11.064,9.441-23.818,8.458-37.004\n\t\tc-0.12-1.616-0.429-3.498-1.354-4.727c-5.204-6.917-2.938-13.371,1.607-19.089c4.429-5.57,6.196-11.501,5.929-18.475\n\t\tc-0.44-11.479,5.413-21.108,9.963-31.029c0.996-2.169,3.695-3.625,5.75-5.229c3.376-2.635,7.622-4.544,10.127-7.812\n\t\tc3.384-4.414,7.088-4.535,11.409-2.966c2.768,1.004,5.309,2.652,7.914,4.082c3.784,2.073,7.357,4.678,11.35,6.184\n\t\tc3.65,1.378,7.987,2.742,11.555,1.966c2.896-0.63,5.066-4.479,7.621-6.832c3.913-3.603,7.697-7.387,11.919-10.589\n\t\tc1.596-1.211,4.398-1.715,6.405-1.313c4.196,0.839,8.188,2.639,12.339,3.77c3.688,1.004,8.036,3.2,11.104,2.104\n\t\tc6.068-2.166,13.047-4.171,16.228-10.756c2.528-5.235,4.297-10.837,6.732-17.127c7.414,1.185,14.033,5.771,17.465,13.042\n\t\tc3.342,7.077,7.29,11.606,15.394,11.661c1.208,0.009,2.771,0.267,3.562,1.034c5.869,5.694,12.22,11.058,17.167,17.488\n\t\tc4.803,6.243,10.841,9.64,17.982,11.59c3.12,0.852,5.433-0.219,6.709-3.968c2.531-7.435,2.829-7.428,10.46-6.798\n\t\tc3.95,0.326,7.867,1.042,12.174,1.633c6.555,15.065,18.347,23.979,33.667,28.773c9.881,3.093,14.797,11.196,17.961,20.075\n\t\tc1.14,3.2-0.795,7.548-1.495,11.341c-0.887,4.805-1.824,9.606-2.982,14.35c-0.593,2.427-1.204,5.12-2.68,7.013\n\t\tc-7.453,9.559-17.254,13.211-29.179,10.486c-25.848-5.904-48.709,1.297-69.455,16.398c-8.068,5.873-16.925,9.228-26.382,11.224\n\t\tc-26.808,5.655-45.99,21.079-59.064,44.816c-1.88,3.416-4.38,7.072-7.563,9.081c-10.942,6.903-22.212,13.317-33.616,19.436\n\t\tc-2.175,1.168-6.143,1.193-8.238-0.036c-18.627-10.927-38.673-12.772-59.631-10.751c-7.23,0.697-14.65,0.426-21.895-0.295\n\t\tc-8.004-0.797-9.104-2.764-10.243-10.543c-0.448-3.062-1.97-6.136-3.635-8.813C961.518,1461.682,958.229,1457.522,953.955,1451.56z"
		}, {
			id: 15,
			path: "M1828.16,774.378c-5.636-1.145-9.941-1.474-13.845-2.9\n\t\tc-24.449-8.931-49.916-8.107-75.072-6.508c-11.616,0.739-22.868,6.646-34.371,9.907c-8.602,2.44-17.233,5.41-26.042,6.335\n\t\tc-14.092,1.479-26.169,6.965-37.503,14.904c-9.539,6.681-19.119,13.309-28.804,19.775c-2.652,1.771-5.748,2.878-8.613,4.277\n\t\tc-5.354-7.646-4.063-14.387-1.02-21.492c5.229-12.209,10.434-24.459,14.877-36.966c5.25-14.781-0.791-27.01-9.802-38.533\n\t\tc-2.708-3.462-4.749-7.974-5.505-12.283c-0.736-4.199-1.604-7.594-5.193-10.163c-1.575-1.126-2.654-2.957-3.925-4.496\n\t\tc-6.704-8.128-6.7-8.131-14.576-1.515c-6.504,5.463-12.849,3.609-13.048-4.712c-0.223-9.321-3.785-15.887-12.265-21.163\n\t\tc2.59-1.602,4.28-3.065,6.245-3.796c12.493-4.65,22.467-12.536,31.047-22.652c6.078-7.164,13.564-12.864,22.59-15.969\n\t\tc32.358-11.133,64.214-23.868,98.224-29.682c7.386-1.263,12.414-1.114,16.465,6.344c2.595,4.778,7.164,8.811,11.594,12.206\n\t\tc14.33,10.983,29.909,19.207,47.462,24.65c26.805,8.312,54.182,13.248,81.679,18.039c5.551,0.967,11.161,2.203,16.409,4.197\n\t\tc22.639,8.604,26.607,20.042,21.304,42.319c-2.581,10.841-8.369,20.548-18.541,26.232c-10.12,5.655-20.641,10.607-31.096,15.643\n\t\tc-3.879,1.868-8.016,3.26-12.125,4.586C1834.206,754.35,1827.066,760.301,1828.16,774.378z"
		}, {
			id: 5,
			path: "M1431.901,880.678c0-4.345-0.625-7.643,0.113-10.6\n\t\tc2.55-10.213,5.748-20.266,8.282-30.482c0.557-2.239,0.031-5.261-1.109-7.297c-2.231-3.979-4.801-7.973-8.026-11.153\n\t\tc-9.509-9.375-12.08-23.443-22.456-32.336c-2.272-1.947-2.099-6.809-2.936-10.355c-1.534-6.497-3.881-8.027-10.44-7.889\n\t\tc-8.243,0.173-16.516,0.137-24.741-0.366c-5.487-0.335-8.016-3.532-8.553-9.118c-0.381-3.955-0.283-8.04-1.289-11.831\n\t\tc-1.568-5.906-3.244-6.643-9.324-5.751c-8.866,1.298-8.608,0.418-8.68-8.681c-0.106-13.56,8.995-19.03,18.65-24.237\n\t\tc7.471-4.029,8.249-4.584,7.549-12.942c-0.11-1.313-1.077-3.066-0.537-3.843c7.208-10.374,5.23-24.297,14.746-34.302\n\t\tc6.538-6.874,11.121-15.29,20.721-18.895c7.077-2.658,13.17-8.466,17.24-14.78c0.879-1.363,2.143-2.497,3.317-3.646\n\t\tc4.734-4.631,9.374-9.373,14.313-13.776c2.616-2.333,5.777-4.054,9.541-6.633c2.289,3.533,4.017,6.231,5.777,8.908\n\t\tc2.373,3.605,4.715,7.232,7.19,10.766c0.748,1.068,1.828,2.564,2.87,2.665c9.294,0.893,16.731,6.897,25.411,9.129\n\t\tc10.873,2.795,20.098,7.324,27.505,16.183c4.577,5.474,10.565,9.977,16.53,14.019c5.439,3.687,11.673,6.217,17.604,9.161\n\t\tc7.152,3.55,11.598,8.735,11.232,17.226c-0.083,1.933,0.221,4.06,0.983,5.822c3.129,7.234,10.535,8.865,16.052,3.409\n\t\tc1.813-1.794,2.727-4.496,4.407-7.394c7.809,8.266,14.041,13.573,15.341,23.067c0.606,4.428,4.824,8.367,7.426,12.515\n\t\tc1.758,2.801,3.76,5.471,5.293,8.389c4.768,9.072,4.995,18.121,0.744,27.697c-4.984,11.229-8.928,22.915-13.658,34.263\n\t\tc-2.277,5.463-3.006,10.775-1.393,16.485c1.459,5.161-0.389,8.188-5.24,11.198c-14.738,9.144-30.73,15.044-47.711,16.006\n\t\tc-10.832,0.613-21.603,3.291-32.189,2.712c-12.569-0.688-23.448,1.942-34.428,7.488c-6.692,3.381-12.488,6.9-16.91,13.265\n\t\tC1454.555,874.193,1444.683,878.496,1431.901,880.678z"
		}, {
			id: 26,
			path: "M714.086,552.757c-8.559-3.188-15.653-6.208-20.386-13.456\n\t\tc-4.196-6.427-9.459-10.316-18.425-7.968c-6.147,1.61-13.058,0.309-20.115,0.309c-5.016-5.922-11.927-10.208-14.182-19.327\n\t\tc-1.123-4.538-7.688-7.79-11.915-11.483c-4.6-4.02-10.299-6.96-13.313-13.298c5.528-1.893,10.393-3.789,15.392-5.212\n\t\tc6.043-1.721,10.082-5.159,10.807-11.576c0.787-6.967,0.095-13.422-7.427-16.841c-0.795-0.361-1.318-1.319-1.43-1.437\n\t\tc5.495-10.348,11.672-19.9,15.788-30.27c4.861-12.246,14.102-15.853,25.729-16.77c5.221-0.412,10.425-1.038,15.649-1.38\n\t\tc1.606-0.105,3.428,0.03,4.852,0.696c8.126,3.801,16.175,7.768,24.214,11.753c1.171,0.58,2.299,1.416,3.184,2.375\n\t\tc12.492,13.549,29.508,18.82,46.176,23.887c12.156,3.695,25.235,1.898,37.455-1.158c4.929-1.233,8.942-6.438,13.173-10.068\n\t\tc5.501-4.718,11.444-9.134,16.038-14.646c6.173-7.407,16.063-10.034,21.579-17.993c4.163,2.374,8.085,5.551,12.558,6.895\n\t\tc4.623,1.389,9.782,1.328,14.703,1.295c5.754-0.039,8.864,3.066,11.961,7.422c5.161,7.262,9.563,15.273,17.611,20.125\n\t\tc1.559,0.939,3.635,3.261,3.401,4.576c-1.835,10.301,7.543,17.555,7.076,27.406c-0.214,4.517,0.516,9.115-0.018,13.576\n\t\tc-1.376,11.496-0.423,21.964,10.2,29.174c0.549,0.373,1.253,0.708,1.545,1.245c5.395,9.907,11.764,18.706,21.739,24.869\n\t\tc4.276,2.642,2.505,8.46,2.132,13.101c-0.968,12.039-1.64,12.514-13.502,13.299c-3.764,0.249-7.524,1.874-11.102,3.321\n\t\tc-5.13,2.074-10.752,7.285-14.977,6.261c-7.009-1.7-13.131-7.206-19.486-11.326c-1.296-0.84-1.979-2.637-2.926-4.005\n\t\tc-2.362-3.412-5.243-4.859-9.405-3.042c-3.341,1.458-6.804,2.675-10.29,3.752c-4.35,1.346-8.837,2.261-13.153,3.697\n\t\tc-3.344,1.113-7.251,1.983-9.625,4.284c-6.717,6.512-13.817,12.105-22.19,16.515c-4.748,2.5-9.061,7.013-11.938,11.635\n\t\tc-6.358,10.215-13.832,17.072-26.757,18.083c-6.167,0.482-12.008,5.113-18.488,8.089c-6.343-5.538-12.061-11.26-10.162-21.599\n\t\tc0.9-4.902,0.932-10.871-4.754-14.215c-1.121-9.438-10.892-14.829-11.326-24.79c-0.216-4.968-3.085-8.706-8.97-8.845\n\t\tc-1.921-0.045-4.088-0.396-5.692-1.357C727.023,543.501,719.992,543.852,714.086,552.757z"
		}, {
			id: 3,
			path: "M1084.449,696.039c12.448,1.19,25.717,8.485,33.962-6.985\n\t\tc2.216,0,4.75,0.682,6.653-0.126c6.248-2.651,12.029-1.846,18.247,0.312c3.246,1.125,7.191,0.262,10.821,0.254\n\t\tc6.809-0.014,11.344,6.689,8.659,13.006c-2.057,4.841-3.911,9.855-6.692,14.263c-1.36,2.155-4.45,3.669-7.066,4.499\n\t\tc-8.642,2.743-8.604,2.576-8.885,10.978c-0.208,6.22-3.098,11.147-7.552,15.449c-1.999,1.931-4.418,4.602-4.561,7.059\n\t\tc-0.422,7.271-0.057,14.621,0.5,21.901c0.337,4.415,2.518,8.045,6.364,10.795c4.583,3.277,8.705,7.191,13.167,10.646\n\t\tc6.79,5.256,11.686,11.741,13.766,20.169c2.012,8.149,4.348,16.145,11.604,21.414c8.129,5.903,10.13,14.468,10.147,23.713\n\t\tc0.01,5.778,1.183,10.912,3.67,16.256c2.595,5.576,3.724,11.965,4.631,18.125c0.31,2.102-1.48,5.143-3.228,6.77\n\t\tc-2.617,2.437-6.101,3.917-9.113,5.958c-4.918,3.332-10.256,6.254-14.532,10.287c-13.789,13.001-33.607,13.494-45.75-1.163\n\t\tc-10.51-12.686-24.401-19.244-38.416-25.929c-11.655-5.56-24.098-4.488-36.029-0.731c-3.969,1.25-7.09,5.191-11.966,8.958\n\t\tc-8.47,1.862-17.759-0.295-25.765-7.58c-1.17-1.064-2.977-2.087-4.458-2.043c-9.063,0.265-15.576-5.033-22.399-9.751\n\t\tc-1.089-0.753-2.293-1.357-3.49-1.935c-6.33-3.055-7.329-2.735-11.504,2.896c-3.695,4.982-7.535,9.856-10.725,14.015\n\t\tc-12.183-0.479-15.432-12.119-24.832-14.174c1.399-8.41,2.856-16.128,3.888-23.904c0.381-2.866,0.245-5.996-0.498-8.78\n\t\tc-2.029-7.609-4.873-15.017-6.584-22.685c-0.516-2.313,0.913-5.906,2.678-7.72c4.618-4.747,9.778-9.003,14.977-13.136\n\t\tc5.102-4.057,7.959-8.362,5.953-15.415c-0.734-2.581,1.233-6.052,2.309-8.992c0.977-2.668,3.425-5.143,3.487-7.744\n\t\tc0.384-15.983,5.525-29.744,16.895-41.254c4.171-4.223,7.351-9.417,11.078-14.092c1.444-1.812,2.937-3.707,4.781-5.056\n\t\tc6.929-5.068,14.065-9.852,21.011-14.898c3.066-2.228,5.949-2.787,9.079-0.357c4.952,3.846,10.18,7.39,14.798,11.602\n\t\tc7.609,6.94,8.654,7.217,17.017,0.929c6.36,2.838,13.041,4.964,17.993-2.945c0.296-0.472,1.222-0.936,1.734-0.828\n\t\tC1079.356,709.971,1081.477,703.113,1084.449,696.039z"
		}, {
			id: 45,
			path: "M907.518,1520.873c8.067-3.4,15.657-6.663,23.299-9.799\n\t\tc4.604-1.891,9.482-3.167,12.302-7.951c0.761-1.289,2.438-2.52,3.899-2.837c8.795-1.912,16.076-5.973,20.615-14.267\n\t\tc13.085,3.976,25.856,3.713,38.877,2.223c14.416-1.649,28.544,0.662,42.076,6.153c9.888,4.012,17.8,10.538,23.527,19.412\n\t\tc10.173,15.763,23.806,27.649,39.794,37.134c2.831,1.68,5.562,3.741,7.829,6.113c4.326,4.525,6.38,9.763,4.899,16.35\n\t\tc-4.231,18.812-3.768,37.405,1.016,56.298c3.311,13.077,5.226,26.553,2.845,40.489c-2.667,15.616-10.508,27.015-23.409,35.465\n\t\tc-13.643,8.936-28.912,13.619-44.817,15.902c-10.468,1.503-21.176,2.355-31.728,2.003c-14.025-0.468-26.55-5.932-37.05-15.424\n\t\tc-7.514-6.793-15.773-11.881-25.677-14.704c-22.921-6.534-36.358-22.09-41.901-45.114c-2.901-12.054-4.703-24.145-4.568-36.533\n\t\tc0.25-23.028-2.676-45.79-6.116-68.481c-0.789-5.202-3.021-10.177-4.44-15.298C908.199,1525.876,907.996,1523.636,907.518,1520.873\n\t\tz"
		}, {
			id: 56,
			path: "M403.272,247.721c13.972,0.837,27.608,1.232,41.149,2.581\n\t\tc14.505,1.445,27.355,7.246,39.338,15.746c15.157,10.752,31.008,20.524,46.518,30.784c3.042,2.012,6.283,3.944,8.759,6.551\n\t\tc10.352,10.903,23.418,16.024,37.813,18.571c5.233,0.925,10.502,1.711,15.673,2.914c12.583,2.926,21.826,9.798,24.676,23.008\n\t\tc2.214,10.264,9.163,16.869,16.91,22.646c5.21,3.886,7.891,8.502,9.085,14.73c1.045,5.447,3.41,10.63,4.641,16.054\n\t\tc0.771,3.4,1.678,7.469,0.537,10.486c-5.646,14.928-12.019,29.584-22.502,41.944c-13.94,16.436-32.317,20.031-52.458,17.232\n\t\tc-6.482-0.9-12.893-3.183-19.011-5.643c-10.787-4.336-21.193-9.623-31.992-13.924c-20.923-8.334-39.68-19.97-56.947-34.425\n\t\tc-5.727-4.793-13.024-7.928-19.967-11c-10.933-4.838-22.12-9.123-33.3-13.377c-10.444-3.974-17.388-11.173-19.921-21.949\n\t\tc-2.397-10.198-6.837-18.556-16.258-23.875c-2.865-1.617-5.198-4.146-7.931-6.029c-14.917-10.283-21.31-25.245-22.439-42.562\n\t\tc-0.646-9.922-0.063-19.973,0.638-29.918c0.704-9.998,8.311-16.926,19.535-17.967C378.38,249.135,390.997,248.541,403.272,247.721z"
		}, {
			id: 49,
			path: "M464.345,1289.372c-5.585,3.745-10.626,7.402-15.929,10.632\n\t\tc-18.344,11.171-38.538,17.732-58.983,23.82c-22.771,6.782-44.833,15.719-62.743,31.691c-12.353,11.019-22.96,24.003-34.264,36.187\n\t\tc-13.142,14.163-26.696,27.842-42.834,38.692c-19.357,13.015-21.223,12.695-34.078-6.711\n\t\tc-25.689-38.784-41.478-81.595-51.359-126.778c-1.676-7.663-2.94-15.416-4.559-23.994c17.574-1.094,32.392-6.71,46.289-14.648\n\t\tc9.8-5.599,19.471-11.538,28.631-18.116c14.182-10.184,29.15-18.447,46.087-23.066c20.533-5.599,40.989-11.578,62.516-11.669\n\t\tc3.913-0.017,8.174,0.26,11.677,1.778c8.471,3.674,17.259,4.815,26.277,4.798c6.994-0.014,12.984,1.794,17.976,7.016\n\t\tc2.242,2.346,5.392,3.803,8.022,5.805c2.077,1.582,4.899,2.996,5.813,5.151c3.763,8.878,11.2,13.305,19.561,15.707\n\t\tc11.991,3.443,19.49,10.779,23.59,22.264C458.479,1274.771,461.274,1281.484,464.345,1289.372z"
		}, {
			id: 37,
			path: "M1749.941,911.344c14.464,3.354,27.67,6.455,40.902,9.44\n\t\tc1.914,0.432,4.022,0.709,5.926,0.383c19.743-3.389,38.316,0.971,56.411,8.404c20.217,8.306,41.45,9.449,62.779,8.057\n\t\tc11.416-0.745,21.838-6.094,31.171-12.605c24.609-17.17,51.31-18.138,79.18-11.093c5.793,1.464,11.389,3.708,17.187,5.146\n\t\tc13.085,3.244,21.118,11.686,26.202,23.806c3.443,8.212,5.99,17.031,12.765,23.444c4.101,3.881,8.569,7.394,12.471,11.458\n\t\tc3.419,3.563,6.861,7.337,9.253,11.601c4.328,7.709,1.936,18.013-5.611,24.279c-8.988,7.465-18.841,13.344-30.195,17.045\n\t\tc-25.261,8.234-49.052,5.583-72.221-7.051c-17.591-9.593-36.661-13.801-56.672-13.194c-10.006,0.303-19.788,1.955-28.961,6.487\n\t\tc-9.915,4.898-16.094,12.601-18.756,23.243c-0.726,2.9-1.534,5.788-2.098,8.723c-2.325,12.122-12.959,19.7-28.979,17.081\n\t\tc-3.921-0.641-7.779-1.679-11.649-2.605c-0.961-0.229-1.929-1.186-2.769-1.048c-13.577,2.229-27.453-3.935-41.019,2.065\n\t\tc-9.078,4.015-17.747,0.895-24.178-7.301c-3.056-3.895-5.866-7.98-8.891-11.9c-0.971-1.258-2.375-3.313-3.401-3.211\n\t\tc-6.79,0.678-7.893-4.413-10.043-8.877c-4.031-8.363-8.646-16.447-12.57-24.857c-3.538-7.585-1.672-14.905,2.402-21.823\n\t\tc1.18-2.004,2.68-3.893,3.469-6.04c5.231-14.249,3.831-17.747-4.43-24.94c-3.887-3.385-7.054-6.841-4.353-12.901\n\t\tc1.072-2.406,0.637-6.132-0.421-8.724C1738.749,923.8,1742.324,916.676,1749.941,911.344z"
		}, {
			id: 35,
			path: "M2163.781,619.109c0,3.967-0.333,6.667,0.061,9.256\n\t\tc1.383,9.108,3.668,10.879,13.151,11.044c6.581,0.114,13.159,0.358,20.171,0.556c0.432,3.141,1.355,5.474,0.934,7.531\n\t\tc-2.683,13.145-6.368,25.818-17.283,34.994c-11.711,9.844-23.308,19.826-34.809,29.916c-2.961,2.599-5.771,5.555-7.972,8.807\n\t\tc-12.116,17.918-29.096,29.241-49.495,34.925c-14.996,4.178-30.576,6.215-45.796,9.646c-7.716,1.739-15.454,3.87-22.73,6.905\n\t\tc-5.81,2.425-11.052,3.571-17.269,1.75c-13.063-3.827-26.268-7.181-39.458-10.555c-15.114-3.867-30.448-2.938-45.592-0.719\n\t\tc-10.81,1.584-21.313,5.169-32.091,7.08c-12.737,2.257-25.588,4.03-38.461,5.275c-5.001,0.484-10.196-1.047-15.193-1.648\n\t\tc-1.199-10.218,3.637-15.216,10.898-18.287c6.728-2.846,13.93-4.636,20.491-7.791c9.542-4.587,19.325-9.103,27.88-15.222\n\t\tc16.02-11.457,21.855-28.165,19.688-47.313c-0.675-5.965-4.23-11.604-6.841-18.357c0.635-0.519,1.909-2.021,3.529-2.815\n\t\tc23.997-11.755,48.869-20.874,75.146-26.292c17.301-3.567,33.927-9.216,49.155-18.776c5.431-3.41,12.209-5.05,18.601-6.469\n\t\tc11.329-2.514,22.686-4.228,33.442-9.354c7.905-3.766,16.971-1.894,25.413-0.037c10.361,2.278,20.495,5.446,31.349,5.061\n\t\tC2150.099,607.887,2156.139,615.103,2163.781,619.109z"
		}, {
			id: 27,
			path: "M1126.894,390.243c0.725,6.434,1.199,10.329,1.596,14.232\n\t\tc0.636,6.25,2.804,11.055,8.95,14.325c8.41,4.475,7.958,5.954,0.853,12.597c-6.958,6.505-14.059,13.167-14.757,23.738\n\t\tc-0.104,1.574-0.702,3.435-1.724,4.578c-7.628,8.529-3.096,17.601-1.174,26.428c0.911,4.185,4.578,5.544,8.588,5.117\n\t\tc2.961-0.315,5.968-0.855,8.771-1.825c3.613-1.252,6.524-1.064,8.585,2.461c1.981,3.389,2.633,6.828-0.085,10.183\n\t\tc-1.881,2.323-3.976,4.488-5.704,6.916c-3.11,4.368-2.591,6.964,1.994,9.812c2.533,1.573,5.783,2.259,7.848,4.243\n\t\tc2.181,2.095,4.467,5.225,4.542,7.962c0.049,1.815-3.431,4.283-5.821,5.491c-4.721,2.384-9.99,3.702-14.656,6.171\n\t\tc-8.83,4.674-10.585,8.752-9.041,18.569c1.21,7.694-0.208,9.667-7.745,12.516c-4.258,1.611-8.057,4.65-12.393,5.785\n\t\tc-4.94,1.293-10.238,1.321-15.397,1.639c-4.193,0.258-8.523-0.453-12.59,0.323c-5.613,1.071-11.028,1.094-14.899-3.175\n\t\tc-9.384-10.348-22.73-13.21-34.425-19.185c-2.958-1.512-6.324-2.532-8.807-4.609c-9.877-8.261-20.457-6-30.947-2.232\n\t\tc-6.532,2.347-12.659,5.804-19.038,8.603c-1.938,0.851-4.11,1.17-7.021,1.965c0.606-6.219,1.304-11.387,1.573-16.578\n\t\tc0.428-8.268-2.097-15.151-10.18-18.851c-5.172-2.368-8.018-6.385-10.266-11.554c-1.63-3.75-4.61-7.2-7.719-9.962\n\t\tc-7.29-6.474-11.398-13.918-8.162-23.664c3.542-10.665-1.265-20.043-3.792-29.798c-0.568-2.192-2.505-4.352-2.294-6.367\n\t\tc0.846-8.066-2.838-13.192-9.373-17.151c-2.205-1.336-4.188-3.337-5.715-5.44c-5.999-8.255-11.774-16.673-17.726-25.162\n\t\tc2.326-3.312,5.421-2.037,8.702-1.02c6.339,1.965,12.691,4.014,19.181,5.319c3.802,0.765,8.367,1.334,11.733-0.065\n\t\tc7.76-3.225,15.569-2.922,23.501-2.394c6.768,0.45,12.342-0.238,15.056-8.021c0.948-2.718,4.302-5.483,7.167-6.487\n\t\tc10.081-3.531,12.544-10.922,12.034-20.471c-0.265-4.974,1.473-9.104,6.913-11.829c1.483,1.377,2.897,3.178,4.733,4.264\n\t\tc2.108,1.247,4.712,2.836,6.888,2.564c6.063-0.758,10.94,0.576,15.557,4.707c3.898,3.488,8.22,6.874,14.328,4.447\n\t\tc1.196-0.475,3.203,0.449,4.584,1.194c6.707,3.624,13.326,7.41,19.981,11.13c6.431,3.595,12.912,6.427,20.706,5.978\n\t\tc4.145-0.238,8.429,1.482,12.614,2.469C1103.388,392.713,1114.378,394.777,1126.894,390.243z"
		}, {
			id: 58,
			path: "M931.39,167.331c4.353,3.305,8.737,6.572,13.046,9.933\n\t\tc2.078,1.619,4.653,3.044,5.913,5.195c7.895,13.488,15.202,26.995,15.57,43.498c0.353,15.856,2.32,31.701,4.173,47.481\n\t\tc0.436,3.72,3.009,7.309,5.034,10.698c4.718,7.899,7.334,15.707,5.813,25.477c-1.58,10.151,0.174,20.625,6.172,29.599\n\t\tc3.116,4.662,4.193,8.469-0.193,13.295c-2.142,2.356-2.767,6.527-3.13,9.977c-0.934,8.887-2.257,16.935-12.453,20.496\n\t\tc-3.414,1.193-6.841,4.635-8.529,7.935c-2.387,4.668-5.617,6.466-10.289,5.965c-9.069-0.972-17.777-0.259-26.495,2.817\n\t\tc-3.141,1.108-7.252,0.247-10.728-0.554c-5.159-1.19-10.101-3.29-15.223-4.683c-3.157-0.859-6.841-2.296-9.647-1.42\n\t\tc-6.396,1.996-11.644-0.317-17.329-2.247c-6.602-2.242-11.193-6.227-15.35-11.893c-4.629-6.312-10.645-11.707-16.537-16.963\n\t\tc-4.41-3.935-9.717-6.128-15.743-1.605c-1.842-3.479-3.558-6.222-4.794-9.166c-2.147-5.114-3.973-9.636-11.41-8.273\n\t\tc-1.806,0.331-5.494-4.269-6.74-7.258c-3.313-7.944-5.705-16.268-8.579-24.399c-2.089-5.91-3.942-11.74-9.18-16.203\n\t\tc-2.281-1.944-3.518-6.717-3.117-9.943c2.281-18.353,2.751-36.951,10.621-54.43c6.065-13.471,15.461-23.95,25.816-33.691\n\t\tc8.896-8.369,18.119-16.801,30.854-19.31c0.973-0.192,1.933-0.893,2.855-0.818c10.1,0.822,17.049-5.501,25.089-10.075\n\t\tc13.13-7.468,27.29-10.169,41.993-3.427c4.073,1.868,8.528,2.902,12.796,4.307C931.656,167.633,931.39,167.331,931.39,167.331z"
		}, {
			id: 16,
			path: "M1690.535,1066.829c-4.787-5.776-7.048-11.498-6.702-18.571\n\t\tc0.497-10.185,0.05-10.865-9.7-12.669c-5.467-1.011-11.297-1.304-16.783-0.573c-4.867,0.647-7.544-0.883-9.801-4.72\n\t\tc-6.375-10.844-12.837-21.635-20-33.685c3.708-0.553,6.13-0.807,8.504-1.295c3.229-0.665,6.629-1.05,9.582-2.384\n\t\tc4.898-2.211,5.475-4.925,2.739-9.533c-0.504-0.849-1.363-1.485-1.875-2.331c-4.857-8.016-3.083-16.843,5.679-18.283\n\t\tc12.886-2.117,17.04-10.563,21.344-20.627c1.688-3.946,5.466-7.48,9.129-9.969c3.942-2.678,5.837-5.287,4.068-9.817\n\t\tc-2.181-5.588-1.677-10.402,4.244-13.721c-2.902-7.938-9.971-11.072-15.576-15.249c-5.954-4.437-11.526-8.691-15.05-15.526\n\t\tc-1.353-2.626-4.554-4.779-7.402-6.055c-5.342-2.394-9.943-5.247-12.616-10.693c-1.599-3.258-4.119-5.412-8.026-4.248\n\t\tc-5.024,1.498-8.403-0.728-10.99-4.612c-2.954-4.439-7.007-5.811-12.63-4.233c-2.039-7.75-3.939-14.973-5.614-21.34\n\t\tc18.018-12.032,34.614-23.573,51.702-34.336c8.77-5.523,18.623-8.415,29.359-8.497c5.507-0.042,11.055-2.05,16.474-3.563\n\t\tc4.47-1.248,8.785-3.05,13.153-4.647c31.438-11.488,63.15-10.544,95.045-2.178c3.857,1.012,7.714,2.34,11.645,2.683\n\t\tc7.438,0.648,11.317,4.736,12.895,11.623c5.02,21.914,4.649,43.677-3.2,64.831c-1.866,5.028-5.622,10.281-9.986,13.272\n\t\tc-10.633,7.287-22.036,13.481-33.32,19.772c-6.623,3.692-14.029,6.09-20.339,10.21c-9.144,5.973-17.625,12.963-26.365,19.55\n\t\tc-2.98,2.247-3.528,5-2.791,8.779c1.442,7.392,4.304,14.796,0.845,22.542c-0.581,1.304,0.765,3.738,1.699,5.377\n\t\tc0.97,1.702,2.521,3.071,3.82,4.585c8.315,9.7,8.983,12.473,2.593,23.855c-4.513,8.037-6.31,16.462-3.969,24.948\n\t\tc2.271,8.237,6.437,15.966,9.941,23.841c1.074,2.413,2.841,4.507,4.066,6.863c2.516,4.839,3.049,9.31-1.878,13.351\n\t\tc-2.252,1.848-3.603,4.756-5.574,6.997c-5,5.684-10.896,8.277-18.663,5.929c-5.392-1.629-11.162-2.025-16.529-3.718\n\t\tc-6.828-2.151-12.316-0.832-17.257,4.238C1694.925,1064.542,1692.752,1065.424,1690.535,1066.829z"
		}, {
			id: 2,
			path: "M984.777,1002.971c-2.96,2.394-5.868,5.017-9.047,7.255\n\t\tc-5.319,3.743-7.003,3.22-11.969-1.343c-3.866-3.553-8.141-6.702-12.456-9.714c-9.108-6.356-16.111-14.674-22.34-23.68\n\t\tc-2.311-3.341-0.517-9.874,4.87-13.82c5.923-4.34,8.156-9.968,9.601-16.637c0.937-4.325-0.105-7.682-2.406-11.236\n\t\tc-3.759-5.807-7.095-11.887-10.648-17.828c-0.833-1.392-1.685-2.815-2.767-4.009c-7.992-8.817-7.943-15.245,1.118-25.954\n\t\tc3.285,2.348,6.707,4.716,10.039,7.203c2.354,1.756,4.368,4.085,6.916,5.439c6.963,3.7,9.55,3.141,14.58-2.804\n\t\tc2.571-3.039,4.954-6.265,7.151-9.585c2.316-3.499,5.133-3.994,8.51-1.941c3.128,1.902,6.079,4.094,9.211,5.989\n\t\tc2.54,1.537,5.295,4.107,7.846,3.982c8.062-0.395,13.853,3.993,19.82,8.043c7.629,5.178,15.975,3.341,24.167,3.167\n\t\tc7.66-11.012,24.726-16.144,38.922-10.379c10.425,4.233,20.207,10.104,30.084,15.591c2.183,1.212,3.79,3.722,5.267,5.901\n\t\tc7.907,11.666,18.806,17.726,32.912,17.203c4.669-0.173,7.246,1.667,9.829,5.228c7.881,10.864,17.113,13.351,29.571,8.542\n\t\tc1.734-0.669,3.545-1.141,5.725-1.833c1.536,5.394-1.659,7.614-4.859,8.96c-12.834,5.396-17.705,18.423-26.593,27.562\n\t\tc-4.487,4.614-3.54,13.292,1.888,18.24c9.515,8.673,12.271,20.159,15.558,31.605c0.358,1.245,0.551,2.647,0.38,3.918\n\t\tc-1.763,13.103-3.616,26.191-5.555,40.077c-1.919-0.264-4.885,0.108-6.929-1.092c-7.402-4.344-14.515-9.186-21.692-13.907\n\t\tc-1.933-1.272-3.583-2.997-5.573-4.152c-7.731-4.488-9.577-4.567-15.39,2.237c-5.455,6.385-13.651,10.875-14.871,20.511\n\t\tc-0.212,1.673-2.37,3.079-3.576,4.65c-3.372,4.392-5.366,8.779-2.958,14.663c1.696,4.144,1.896,8.898,2.979,14.492\n\t\tc-7.063,0-13.155,0.881-18.865-0.217c-7.648-1.469-12.461-6.695-14.911-14.479c-2.109-6.703-5.754-7.369-9.472-2.105\n\t\tc-9.987,14.134-10.599,11.517-19.437-1.443c-3.96-5.807-7.112-11.782-7.747-19.16c-0.315-3.657-3.134-7.161-5.08-10.586\n\t\tc-0.795-1.399-2.686-2.208-3.383-3.626c-4.7-9.558-10.933-17.295-20.868-22.223c-3.987-1.979-5.52-7.022-5.381-12.194\n\t\tC997.172,1019.156,992.668,1010.562,984.777,1002.971z"
		}, {
			id: 9,
			path: "M853.82,1179.501c-1.966-3.399-3.049-5.821-4.618-7.874\n\t\tc-4.017-5.256-7.917-10.669-12.492-15.413c-4.528-4.696-9.826-8.65-15.972-13.953c-3.5,2.468-7.667,5.406-12.205,8.606\n\t\tc-1.978-1.771-4.154-3.747-6.361-5.689c-8.246-7.255-8.652-8.801-3.011-18.512c2.604-4.482,5.369-8.816,2.059-13.811\n\t\tc-4.043-6.102-5.688-14.372-15.396-15.467c-3.395-0.383-7.266-3.289-9.473-6.156c-6.093-7.917-12.151-15.632-20.243-21.776\n\t\tc-5.891-4.474-8.356-16.748-5.271-23.058c1.094-2.238,3.319-5.026,5.448-5.448c6.29-1.248,11.776-5.903,19.083-3.646\n\t\tc2.884,0.892,7.15-0.885,10.147-2.578c4.856-2.745,9.186-6.426,14.177-10.026c1.02-7.595-0.926-14.592-7.02-20.303\n\t\tc-2.674-2.504-5.278-5.095-7.776-7.775c-6.054-6.494-12.811-11.266-24.549-8.608c2.914-2.9,3.948-4.771,5.445-5.279\n\t\tc7.452-2.527,14.51-5.964,23.042-4.888c9.713,1.225,19.026-0.977,27.394-6.906c7.283-5.161,16.192-5.617,24.739-6.914\n\t\tc2.215-0.336,4.896-0.615,6.419-1.976c5.655-5.054,11.188-10.304,16.256-15.938c6.583-7.318,5.632-12.27-3.317-20.031\n\t\tc1.842-2.978,3.846-5.949,5.579-9.071c4.526-8.153,9.549-9.069,17.216-3.145c1.975,1.526,4.209,2.716,6.755,4.334\n\t\tc2.612-3.636,4.688-6.525,6.708-9.339c8.577,1.176,8.656,1.134,12.149-6.239c4.801-10.133,4.801-10.133,11.471-13.075\n\t\tc-0.611,3.607-1.91,6.847-1.504,9.856c0.726,5.392,0.436,11.412,6.501,14.83c1.651,0.93,2.202,3.795,3.284,5.757\n\t\tc2.561,4.645,4.697,9.604,7.805,13.849c5.296,7.233,5.274,13.3-0.447,19.904c-3.888,4.487-7.708,9.152-10.692,14.245\n\t\tc-1.265,2.159-1.503,6.477-0.162,8.343c7.15,9.943,14.695,19.632,25.197,26.491c3.573,2.332,7.133,4.886,10.078,7.938\n\t\tc7.18,7.438,10.399,7.959,18.67,1.907c1.861-1.362,3.574-2.924,5.892-4.837c4.479,5.546,9.065,10.674,8.799,18.136\n\t\tc-0.188,5.265,1.11,9.909,4.442,13.922c2.979,3.586,2.501,6.872-1.047,9.413c-5.382,3.854-11.022,7.35-16.578,10.958\n\t\tc-0.537,0.349-1.39,0.773-1.855,0.581c-8.089-3.346-10.764,3.017-13.7,8.003c-3.692,6.269-6.707,12.937-10.02,19.431\n\t\tc-0.744,1.459-1.132,3.578-2.327,4.249c-6.97,3.908-11.251,9.733-14.523,16.939c-2.321,5.11-9.217,6.912-15.658,5.303\n\t\tc-2.902-0.726-5.676-2.003-8.595-2.618c-8.031-1.697-10.998,0.592-14.219,8.373c-3.816,9.219-8.352,18.106-8.162,28.466\n\t\tc0.021,1.146-0.876,2.712-1.837,3.408c-5.177,3.753-8.161,9.658-12.497,13.686C870.761,1171.92,861.933,1175.025,853.82,1179.501z"
		}, {
			id: 24,
			path: "M458.47,729.289c4.481-2.34,7.744-1.536,11.298,1.43\n\t\tc18.411,15.362,40.314,21.418,63.727,22.48c7.223,0.327,14.616-0.802,21.782-2.092c9.803-1.766,19.409-4.621,29.202-6.456\n\t\tc9.915-1.857,18.981-5.473,27.725-10.43c2.536-1.438,6.259-1.391,9.358-1.117c15.112,1.337,29.876,6.13,45.314,4.379\n\t\tc4.317-0.49,7.729,1.522,10.287,4.943c0.992,1.328,1.698,2.884,2.767,4.138c4.184,4.91,8.718,8.861,16.029,7.63\n\t\tc3.9-0.656,7.969-0.369,11.962-0.391c4.755-0.026,4.755,0.029,10.404,6.5c-3.104,1.879-5.806,4.376-8.963,5.279\n\t\tc-16.247,4.647-29.701,14.117-43.223,23.71c-8.336,5.914-17.262,11.017-26.045,16.281c-10.129,6.07-13.582,14.395-10.031,25.866\n\t\tc2.544,8.217,5.409,16.338,8.279,24.45c0.533,1.506,1.498,3.585,2.733,3.999c7.572,2.538,14.013,9.18,23.344,5.611\n\t\tc4.846-1.854,10.333-2.024,15.526-2.983c3.303-0.61,4.553,1.217,5.814,3.978c1.295,2.836,2.984,6.13,5.464,7.662\n\t\tc5.93,3.659,11.97,6.751,16.542,12.457c4.077,5.087,9.121,0.771,14.769-0.879c4.385,5.333,8.957,10.86,13.492,16.417\n\t\tc4.382,5.37,8.455,11.027,13.183,16.071c3.317,3.54,4.474,6.662,2.804,11.499c-3.483,10.091-9.936,16.569-20.561,17.868\n\t\tc-17,2.081-33.856,0.6-50.477-3.453c-5.725-1.396-8.857-4.742-9.784-11.013c-1.168-7.905-4.302-9.237-11.914-5.689\n\t\tc-4.798,2.237-9.125,5.463-13.84,7.903c-3.502,1.812-7.187,3.445-10.975,4.484c-4.732,1.3-9.476,0.882-12.461-3.746\n\t\tc-2.791-4.325-6.977-5.05-11.351-4.588c-6.919,0.73-13.783,1.991-20.661,3.09c-2.292,0.366-4.535,1.106-6.834,1.361\n\t\tc-7.703,0.852-9.389-0.686-9.76-8.499c-0.189-3.968-0.409-7.936-0.728-11.894c-0.043-0.544-0.745-1.035-1.583-2.125\n\t\tc-13.446,4.285-28.123,5.802-38.742,17.537c-4.963,5.485-11.726,7.157-20.291,3.499c1.569-3.794,2.481-7.704,4.598-10.788\n\t\tc5.378-7.838,4.476-15.72,1.036-23.707c-1.569-3.643-3.582-7.147-5.793-10.445c-2.688-4.01-4.804-7.848-3.096-12.979\n\t\tc0.556-1.671,0.006-3.949-0.632-5.738c-2.646-7.42-5.214-14.896-8.417-22.081c-2.236-5.018-1.995-8.79,2.537-12.222\n\t\tc9.797-7.422,10.563-16.626,5.982-27.514c-4.809-11.429-11.921-20.911-22.139-27.618c-9.476-6.22-14.959-14.629-18.129-25.261\n\t\tC465.361,747.258,461.843,738.672,458.47,729.289z"
		}, {
			id: 55,
			path: "M569.454,474.85c-7.942,10.689-15.522,21.465-23.769,31.705\n\t\tc-3.259,4.046-7.777,7.223-12.117,10.223c-7.648,5.285-15.975,9.649-23.288,15.337c-4.546,3.537-8.296,8.453-11.411,13.378\n\t\tc-3.469,5.485-2.394,11.149,1.151,16.809c2.882,4.601,4.531,9.976,5.892,15.854c-10.339-3.11-19.616-7.561-28.749-12.442\n\t\tc-8.789-4.697-17.608-9.408-26.719-13.417c-18.92-8.325-39.144-9.937-59.491-10.554c-23.256-0.706-45.182-7.201-66.495-15.871\n\t\tc-3.715-1.511-7.182-4.969-9.459-8.396c-4.561-6.866-10.569-11.553-17.38-16.019c-9.109-5.974-17.655-12.927-25.863-20.122\n\t\tc-9.596-8.412-14.364-19.736-17.036-32.035c-1.378-6.343-0.02-11.731,4.547-16.486c5.822-6.061,12.033-11.298,20.116-14.312\n\t\tc5.25-1.958,10.09-5.032,15.072-7.686c9.667-5.149,19.184-10.594,28.983-15.473c12.241-6.095,24.77-2.753,37.059,0.025\n\t\tc5.461,1.234,10.682,3.624,15.929,5.698c17.573,6.949,35.585,10.929,54.606,8.461c12.671-1.644,23.936,2.169,33.296,10.3\n\t\tc18.325,15.921,39.043,27.439,61.505,36.311C540.532,461.942,554.905,468.575,569.454,474.85z"
		}, {
			id: 57,
			path: "M838.143,394.925c4.941,1.524,8.354,2.578,12.418,3.833\n\t\tc-0.964,1.621-1.342,3.248-2.242,3.623c-10.589,4.412-17.522,13.517-26.236,20.313c-2.578,2.01-4.815,4.667-6.623,7.413\n\t\tc-4.887,7.42-11.964,10.212-20.409,10.316c-10.5,0.13-21.117,2.546-31.352-2.187c-9.623-4.45-19.428-8.504-29.117-12.813\n\t\tc-1.181-0.525-2.42-1.347-3.161-2.372c-8.784-12.153-23.203-14.871-35.437-21.221c-1.419-0.736-3.366-1.439-4.772-1.06\n\t\tc-11.493,3.101-24.071-0.944-35.055,5.345c-0.235,0.135-0.641-0.028-1.704-0.107c-3.838-6.332-8.437-12.51-8.59-21.079\n\t\tc-0.116-6.484-2.823-12.308-8.696-16.015c-10.061-6.349-15.788-15.451-19.071-26.882c-1.57-5.464-5.995-10.109-9.458-15.657\n\t\tc7.45-7.815,10.241-17.89,12.475-28.476c1.979-9.379,4.975-18.639,8.48-27.576c4.788-12.205,13.071-21.272,25.677-26.368\n\t\tc7.665-3.099,14.937-7.287,22.11-11.458c13.467-7.831,27.943-12.659,43.369-13.648c14.783-0.948,28.172,4.278,39.857,13.078\n\t\tc6.063,4.566,11.379,10.212,16.606,15.772c4.376,4.654,5.091,10.253,3.757,16.708c-1.534,7.42-2.001,15.102-2.38,22.698\n\t\tc-0.141,2.825,0.36,6.623,2.138,8.446c10.57,10.842,12.47,25.432,17.528,38.646c0.593,1.55,0.941,3.193,1.489,4.763\n\t\tc1.544,4.426,4.17,7.854,9.319,7.411c5.126-0.442,7.232,2.49,8.558,6.563c0.915,2.813,1.154,5.903,2.391,8.542\n\t\tc1.93,4.117,3.493,9.562,6.908,11.599C835.508,378.202,840.737,384.233,838.143,394.925z"
		}, {
			id: 4,
			path: "M1228.076,686.058c-3.329-4.238-6.027-7.522-8.563-10.927\n\t\tc-9.769-13.113-22.015-14.245-33.925-3.208c-5.294,4.906-10.235,10.496-18.031,11.413c-1.593-9.83-2.79-19.503-4.897-28.974\n\t\tc-0.734-3.304-3.133-6.825-5.795-8.986c-4.849-3.937-10.064-8.065-15.836-10.091c-13.105-4.597-19.189-16.7-30.946-25.025\n\t\tc4.647-2.526,7.581-4.725,10.881-5.799c9.824-3.199,16.986-9.785,23.791-17.128c1.934-2.087,4.804-3.441,7.443-4.719\n\t\tc10.852-5.256,12.971-9.83,9.684-21.504c-1.259-4.472-2.918-8.883-3.64-13.441c-1.043-6.588,1.167-9.066,7.953-9.716\n\t\tc2.27-0.217,4.809-0.4,6.863,0.368c10.26,3.835,20.848,3.627,31.502,3.174c5.777-0.246,11.159,0.307,15.248,5.405\n\t\tc1.787,2.227,4.662,3.582,7.854,5.929c-2.124,3.693-4.162,7.239-6.745,11.731c4.328,2.428,8.336,5.503,12.866,6.991\n\t\tc4.769,1.566,9.861,1.447,13.024-4.075c1.299-2.269,3.27-4.201,5.132-6.092c7.266-7.381,14.756-13.068,26.316-8.399\n\t\tc5.375,2.17,11.685,2.254,17.614,2.708c2.428,0.186,5.096-0.855,7.44-1.845c10.538-4.449,14.102-3.883,21.735,4.564\n\t\tc6.674,7.386,15.302,11.075,24.693,12.819c4.024,0.747,6.691,1.938,8.503,5.647c2.61,5.344,5.606,10.499,9.052,16.867\n\t\tc4.566-1.798,9.16-3.296,13.473-5.375c6.561-3.162,12.939-6.703,19.372-10.128c3.561-1.896,6.673-1.906,10.012,0.895\n\t\tc2.475,2.076,5.719,3.21,8.493,4.962c1.86,1.175,4.249,2.34,5.107,4.13c3.391,7.072,8.969,10.425,18.739,10.441\n\t\tc-6.652,7.007-11.243,13.65-17.474,17.881c-5.813,3.947-8.008,7.878-10.566,14.363c-0.059,0.148-0.999,1.374-2.454,2.454\n\t\tc-6.756,3.172-13.115,6.641-19.864,9.828c-0.598,0.282-1.343,0.564-1.665,1.071c-6.583,10.34-17.792,17.86-19.047,31.486\n\t\tc-0.239,2.589-0.798,5.609-2.335,7.525c-3.46,4.314-3.782,9.067-3.424,14.098c0.373,5.249-1.296,8.815-6.668,10.776\n\t\tc-3.335,1.217-6.126,3.868-9.26,5.705c-5.789,3.394-7.441,3.281-11.888-1.878c-3.212-3.726-6.647-6.172-11.783-6.505\n\t\tc-2.483-0.161-5.253-1.433-7.216-3.034c-4.32-3.524-8.808-4.214-13.619-2.025c-1.105-0.857-2.317-1.307-2.602-2.092\n\t\tc-4.99-13.77-16.962-18.432-29.292-22.673c-1.251-0.43-2.733-0.774-3.595-1.658c-6.689-6.867-12.713-3.955-19.43,0.375\n\t\tC1243.681,678.636,1236.33,681.785,1228.076,686.058z"
		}, {
			id: 33,
			path: "M1705.98,495.008c10.188-7.748,19.696-14.897,29.111-22.168\n\t\tc5.771-4.458,12.435-6.046,19.489-6.712c7.911-0.748,15.827-1.5,23.704-2.531c2.167-0.284,4.203-1.566,6.393-2.428\n\t\tc-0.736-10.012-7.059-16.672-10.992-22.33c2.211-7.568,3.943-13.746,5.825-19.876c2.06-6.712,7.568-10.225,13.459-12.447\n\t\tc8.69-3.277,17.913-5.137,26.626-8.364c11.469-4.248,23.18-5.067,35.238-4.948c4.445,0.043,9.196-1.634,13.315-3.575\n\t\tc9.913-4.671,19.425-10.189,29.326-14.887c3.753-1.781,8.077-2.706,12.237-3.203c6.574-0.784,13.234-0.817,19.85-1.281\n\t\tc7.426-0.52,17.327,5.094,20.483,11.804c1.836,3.903,3.925,7.735,5.281,11.806c2.587,7.76,4.444,15.771,7.232,23.451\n\t\tc0.86,2.371,3.431,4.646,5.789,5.829c3.812,1.912,8.291,2.479,12.141,4.335c8.396,4.048,9.479,11.131,2.591,17.389\n\t\tc-3.414,3.103-7.53,5.457-11.42,8.01c-6.18,4.055-10.288,9.006-10.101,17.069c0.157,6.733-3.249,11.923-9.014,15.7\n\t\tc-7.806,5.114-15.854,9.347-24.734,12.618c-8.55,3.15-16.244,8.769-24.072,13.69c-9.271,5.829-18.034,12.506-27.517,17.943\n\t\tc-4.446,2.549-10.118,4.434-15.144,4.24c-21.217-0.816-38.552,8.442-55.478,19.471c-11.406,7.433-22.512,15.639-34.737,21.414\n\t\tc-12.513,5.911-26.132,9.593-39.455,13.635c-7.13,2.163-9.009,0.692-12.706-5.931c-6.346-11.369-6.13-22.103,2.576-32.293\n\t\tc3.235-3.787,6.343-7.718,9.147-11.83c9.963-14.606,6.092-27.747-10.063-34.678C1715.254,501.738,1709.479,500.62,1705.98,495.008z"
		}, {
			id: 46,
			path: "M769.657,1467.368c19.156,11.956,40.546,13.933,62.248,14.688\n\t\tc6.628,0.23,13.271,0.711,19.852,1.523c16.373,2.022,28.934,11.057,39.94,22.596c1.498,1.571,1.977,4.124,2.897,6.234\n\t\tc0.924,2.119,1.202,5.146,2.809,6.24c11.394,7.758,11.993,20.233,13.791,31.82c2.237,14.416,2.901,29.067,4.816,43.541\n\t\tc1.876,14.174-2.664,27.058-7.549,39.712c-8,20.724-22.993,35.463-42.197,46.195c-10.083,5.634-20.674,8.903-32.375,8.424\n\t\tc-13.989-0.573-27.729-2.401-41.418-5.519c-12.938-2.946-26.218-4.354-39.241-6.97c-6.785-1.362-13.349-3.837-19.994-5.87\n\t\tc-4.617-1.413-6.072-4.491-5.121-9.211c4.024-19.95,5.104-40.125,5.561-60.46c0.267-11.84,3.045-23.674,5.231-35.409\n\t\tc3.062-16.438,13.94-28.646,24.211-40.72c11.369-13.366,14.018-27.319,7.767-43.45c-1.507-3.886-2.18-8.097-3.236-12.157\n\t\tC768.317,1468.175,768.987,1467.771,769.657,1467.368z"
		}, {
			id: 14,
			path: "M1451.448,599.564c2.583-2.162,4.522-3.899,6.579-5.486\n\t\tc5.215-4.024,8.95-8.889,9.264-15.769c0.28-6.12,3.321-10.324,8.129-14.106c3.172-2.494,5.409-6.453,7.391-10.121\n\t\tc3.46-6.406,6.214-13.19,9.615-19.631c2.688-5.089,6.96-8.503,11.975-11.589c4.339-2.67,7.9-7.013,10.969-11.226\n\t\tc3.258-4.477,6.902-7.884,12.107-9.905c10.771-4.18,19.896-10.031,25.224-21.233c2.916-6.132,8.247-11.114,12.31-16.382\n\t\tc9.766,2.31,13.383,5.653,14.311,14.542c0.6,5.746,0.28,12.189,5.706,15.178c6.57,3.62,13.887,6.229,21.183,8.083\n\t\tc6.27,1.593,12.673-0.377,18.14-3.832c10.483-6.622,20.744-5.424,31.303-0.288c3.853,1.874,8.042,3.138,12.178,4.331\n\t\tc8.314,2.398,16.574,1.914,24.296-2.034c5.255-2.687,9.493-3.33,14.416,1.181c3.026,2.773,7.66,3.822,11.612,5.553\n\t\tc15.008,6.573,17.937,16.721,8.523,30.224c-2.468,3.54-5.265,6.877-8.147,10.095c-8.548,9.541-8.494,20.45-5.126,31.816\n\t\tc1.198,4.047,3.03,7.906,4.956,12.828c-5.283,1.148-9.698,2.292-14.179,3.051c-29.714,5.034-57.413,16.679-85.889,25.814\n\t\tc-13.16,4.222-23.815,11.545-32.864,21.633c-9.068,10.109-19.777,17.812-32.866,21.687c-2.896,0.857-6.571,0.831-9.406-0.164\n\t\tc-9.919-3.478-17.991-9.391-24.333-18.157c-6.471-8.945-16.816-12.481-26.829-16.09c-3.313-1.194-6.613-2.425-9.914-3.651\n\t\tc-3.365-1.25-6.721-3.511-10.087-3.526c-4.35-0.019-7.008-1.848-9.102-4.948C1459.017,611.71,1455.415,605.797,1451.448,599.564z"
		}, {
			id: 50,
			path: "M154.426,1109.753c22.191,1.458,37.487-9.146,52.342-20.606\n\t\tc5.253-4.052,10.062-8.681,15.051-13.073c10.41-9.162,22.799-13.472,36.395-14.462c17.479-1.271,34.35-0.41,49.853,9.942\n\t\tc6.416,4.284,14.738,5.76,22.253,8.339c4.931,1.691,9.97,3.07,14.471,4.441c-0.849,8.412-2.197,15.592-2.172,22.766\n\t\tc0.059,17.002,7.821,30.353,22.456,38.55c10.509,5.886,15.142,15.291,19.704,25.267c1.855,4.057,0.492,6.694-3.003,9.28\n\t\tc-6.134,4.537-11.889,9.587-17.807,14.415c-5.604,4.572-11.983,6.664-19.252,7.119c-36.599,2.288-71.523,10.835-103.831,28.699\n\t\tc-2.302,1.272-4.354,3.025-6.438,4.66c-15.534,12.188-32.108,22.621-50.767,29.336c-5.914,2.129-12.088,3.617-18.238,4.968\n\t\tc-4.302,0.945-6.573-1.007-7.391-5.69c-4.115-23.558-8.855-47.01-12.673-70.612c-1.141-7.054-0.698-14.563,0.21-21.713\n\t\tC148.173,1151.021,151.371,1130.739,154.426,1109.753z"
		}, {
			id: 52,
			path: "M509.573,929.477c-7.913-6.705-14.839-12.574-21.926-18.579\n\t\tc-2.778,2.345-4.435,3.932-6.276,5.263c-5.698,4.119-10.281,9.054-17.953,11.254c-7.014,2.01-12.476,9.479-18.586,14.586\n\t\tc-4.282,3.579-8.505,7.23-12.752,10.851c-2.003,1.708-4.985,3.033-5.842,5.198c-5.22,13.186-18.351,13.707-28.823,17.925\n\t\tc-6.954,2.801-15.009,2.734-22.406,4.608c-7.935,2.009-14.033-1.062-18.406-6.801c-3.798-4.984-8.494-8.146-13.635-11.28\n\t\tc-5.933-3.618-11.385-8.016-17.164-11.897c-3.005-2.019-6.208-3.769-9.426-5.438c-3.793-1.967-7.699-3.715-13.035-6.265\n\t\tc3.219-1.625,5.02-2.68,6.928-3.474c9.651-4.016,18.077-9.583,25.068-17.559c8.721-9.95,10.616-21.153,7.538-33.532\n\t\tc-3.084-12.407-10.236-22.221-19.875-30.415c-5.316-4.52-10.745-8.962-15.635-13.921c-15.436-15.655-6.961-44.233,14.482-50.042\n\t\tc8.303-2.25,16.549-4.966,24.479-8.288c15.293-6.406,31.095-6.16,47.132-5.03c8.931,0.629,17.949,1.331,26.85,0.769\n\t\tc15.083-0.953,29.075,1.59,42.232,9.215c6.604,3.827,13.583,7.036,20.521,10.244c2.663,1.231,5.745,2.523,8.536,2.332\n\t\tc9.301-0.639,11.594,6.14,14.438,12.573c3.091,6.994,3.104,13.587-2.621,19.347c-1.635,1.646-4.006,2.755-5.144,4.649\n\t\tc-1.631,2.715-3.955,6.305-3.315,8.852c1.911,7.607,5.164,14.872,7.799,22.304c1.08,3.045,3.154,6.418,2.606,9.217\n\t\tc-1.085,5.53,0.816,9.671,3.468,14.013c2.247,3.68,4.323,7.485,6.197,11.369c3.392,7.026,4.312,13.924-1.379,20.476\n\t\tC512.198,923.67,511.455,925.953,509.573,929.477z"
		}, {
			id: 43,
			path: "M1316.618,1408.138c9.034-11.027,16.963-13.85,28.658-9.275\n\t\tc10.878,4.255,20.059,2.878,28.24-5.528c8.394-8.623,19.845-11.981,30.405-16.587c3.698-1.613,9.141-0.635,13.344,0.63\n\t\tc7.703,2.317,15.143,4.049,23.359,2.918c14.7-2.023,28.072,5.729,33.358,19.55c2.928,7.652,4.493,15.849,6.387,23.866\n\t\tc1.469,6.221,3.183,12.107,7.896,16.893c6.103,6.196,10.588,13.416,14.022,21.567c2.392,5.677,6.446,10.876,10.614,15.521\n\t\tc4.426,4.928,5.955,10.268,5.095,16.483c-0.978,7.068-0.027,13.742,1.996,20.622c4.254,14.45,0.161,28.392-4.852,41.791\n\t\tc-2.757,7.368-9.098,9.25-16.542,6.707c-1.867-0.639-3.82-1.456-5.31-2.7c-10.264-8.575-14.293-4.601-19.664,4.095\n\t\tc-7.618,12.333-18.694,21.464-29.757,30.574c-10.643,8.766-22.416,6.968-34.17,3.853c-14.381-3.813-34.205-21.655-33.717-43.638\n\t\tc0.476-21.432-4.995-40.732-20.422-56.605c-2.18-2.244-3.312-6.628-3.047-9.868c0.397-4.869-0.985-8.946-4.221-11.665\n\t\tc-12.118-10.184-14.657-24.451-15.901-38.628c-0.878-10.013-4.225-17.857-11.097-24.707\n\t\tC1319.492,1412.209,1318.091,1410.009,1316.618,1408.138z"
		}, {
			id: 28,
			path: "M1241.047,333.842c6.123,3.542,10.935,7.082,16.302,9.235\n\t\tc6.372,2.558,10.064,7.268,13.451,12.703c2.244,3.6,1.438,6.25-1.907,8.444c-2.476,1.624-4.773,3.821-7.494,4.721\n\t\tc-9.908,3.272-12.824,11.581-15.495,20.25c-1.265,4.102-2.265,8.298-6.783,10.493c-6.583,3.199-12.687,3.897-18.168-2.016\n\t\tc-5.8-6.257-12.226-6.888-20.72-5.202c-7.386,1.466-15.717-0.481-23.374-2.118c-7.066-1.51-13.741-4.778-20.698-6.911\n\t\tc-2.059-0.631-4.521-0.265-6.746,0.033c-6.232,0.835-12.436,1.873-18.209,2.763c-5.873-8.81-11.373-16.983-16.766-25.225\n\t\tc-0.896-1.37-1.785-3.014-1.893-4.585c-0.63-9.154-1.531-18.334-1.346-27.485c0.153-7.592,2.617-15.194,2.317-22.723\n\t\tc-0.27-6.763-2.513-13.559-4.644-20.094c-1.415-4.339-4.405-8.138-6.264-12.366c-4.008-9.111-7.926-18.092-14.104-26.192\n\t\tc-5.954-7.807-7.382-16.98-1.864-26.229c3.748-6.281,6.953-12.891,10.801-19.106c4.75-7.672,10.368-9.781,18.617-6.467\n\t\tc5.15,2.069,10.456,4.708,14.463,8.417c4.966,4.596,10.417,6.414,16.398,4.961c10.013-2.432,19.048,0.412,28.32,3.236\n\t\tc4.709,1.435,9.618,2.422,14.509,3.008c6.594,0.791,12.021,2.871,16.001,8.705c1.708,2.504,5.038,3.98,7.783,5.677\n\t\tc2.762,1.708,5.67,3.201,8.597,4.619c2.345,1.136,4.79,2.788,7.232,2.866c6.934,0.221,13.981,0.366,20.81-0.639\n\t\tc5.417-0.796,8.305,1.333,10.362,5.546c1.154,2.367,2.133,4.974,2.462,7.564c1.976,15.561,2.27,31.002-3.622,45.996\n\t\tc-1.059,2.693-1.968,5.908-1.509,8.64c1.065,6.349-1.357,10.773-5.587,15.131C1248.619,323.266,1245.726,327.782,1241.047,333.842z"
		}, {
			id: 32,
			path: "M1567.658,457.846c9.312-8.617,19.962-15.341,24.114-28.446\n\t\tc4.435,0.781,8.939,0.686,12.628,2.374c17.273,7.905,35.26,8.814,53.547,5.839c14.783-2.407,18.508-12.363,9.193-24.207\n\t\tc-3.036-3.861-5.12-7.064-4.272-12.386c0.396-2.482-2.099-5.955-4.161-8.155c-2.181-2.325-5.406-3.669-7.578-6.083\n\t\tc2.822-6.276,7.449-6.983,11.19-8.891c7.011-3.573,7.645-8.216,2.196-14.116c-2.035-2.204-3.707-4.741-6.737-8.676\n\t\tc5.043-0.451,7.894-0.529,10.68-0.993c4.886-0.813,9.847-1.483,14.567-2.905c6.553-1.973,9.204-6.651,9.091-13.672\n\t\tc-0.12-7.462,1.244-8.547,8.138-10.074c9.359-2.072,11.83-6.011,10.358-15.49c-0.596-3.838-1.316-8.16-0.124-11.622\n\t\tc1.061-3.076,4.222-6.379,7.264-7.651c11.02-4.608,20.438-11.933,30.879-17.26c6.566-3.349,15.232-3.11,22.984-3.288\n\t\tc2.361-0.054,6.04,3.421,6.985,6.047c2.513,6.978,7.852,9.28,14.104,11.245c6.313,1.983,12.603,4.223,18.572,7.048\n\t\tc4.781,2.263,9.018,5.615,10.595,12.396c-3.145,2.083-6.177,4.554-9.592,6.265c-9.531,4.775-17.087,11-20.56,21.721\n\t\tc-2.134,6.587-7.758,10.412-13.888,13.59c-13.519,7.01-14.323,20.608-1.237,28.69c8.694,5.369,18.418,9.067,27.643,13.589\n\t\tc1.36,0.667,2.512,1.756,5.018,3.55c-3.82,1.545-6.429,2.563-9.006,3.652c-5.196,2.195-10.676,3.923-15.481,6.78\n\t\tc-5.501,3.271-9.896,7.615-9.392,15.205c0.168,2.539-1.608,5.586-3.289,7.797c-4.693,6.175-5.004,7.849,0.001,13.647\n\t\tc3.942,4.567,7.446,9.202,7.827,16.486c-9.027,1.321-17.809,3.449-26.637,3.665c-9.155,0.223-16.942,2.568-23.803,8.512\n\t\tc-10.585,9.172-22.053,16.851-34.687,23.16c-12.116,6.051-23.481,6.005-35.421,0.593c-3.919-1.776-7.988-3.267-12.083-4.594\n\t\tc-7.296-2.364-14.419-2.149-21.128,2.067c-1.121,0.704-2.462,1.067-3.561,1.798c-11.936,7.948-23.066,3.354-33.494-2.941\n\t\tc-3.219-1.943-5.739-6.618-6.667-10.499C1578.951,467.028,1579.247,466.957,1567.658,457.846z"
		}, {
			id: 51,
			path: "M347.741,1080.691c-15.254-3.155-29.04-6.153-41.745-13.33\n\t\tc-29.12-16.448-66.563-11.797-91.594,10.867c-11.882,10.76-24.251,20.806-39.725,26.097c-5.998,2.049-12.019,3.669-18.204-0.386\n\t\tc4.273-29.393,14.931-55.956,31.037-80.412c5.854-8.889,11.728-17.778,17.966-26.397c11.465-15.841,18.313-33.726,24.78-51.988\n\t\tc4.072-11.498,9.819-22.491,15.688-33.234c4.091-7.489,9.364-8.637,16.755-3.835c6.903,4.486,13.759,9.549,19.227,15.626\n\t\tc9.522,10.586,19.856,19.522,33.42,24.417c3.079,1.111,5.932,2.987,8.695,4.805c7.468,4.91,14.884,9.902,22.203,15.029\n\t\tc2.126,1.489,4.411,3.22,5.672,5.393c4.985,8.587,12.721,12.001,21.905,10.511c13.349-2.166,27.148-3.077,39.255-10.226\n\t\tc1.103-0.651,2.429-0.924,5.2-1.942c-0.395,3.303-0.025,5.965-1.056,7.867c-5.18,9.558-7.023,20.012-8.807,30.5\n\t\tc-2.113,12.428-8.125,22.346-18.567,29.521c-2.192,1.507-4.24,3.226-6.445,4.711\n\t\tC369.244,1053.827,355.791,1064.072,347.741,1080.691z"
		}, {
			id: 13,
			path: "M1284.695,548.622c1.583-2.092,2.967-3.851,4.28-5.662\n\t\tc6.528-9.008,10.227-18.343,4.888-29.502c-1.285-2.69-1.873-6.954-0.626-9.388c4.156-8.112,7.813-17.024,17.56-20.454\n\t\tc4.563-1.605,7.645-3.847,5.799-9.566c-0.48-1.491,0.301-4.033,1.414-5.277c3.525-3.938,7.457-7.517,11.278-11.186\n\t\tc3.295-3.164,7.031-3.952,11.76-3.911c5.456,0.047,11.105-1.501,16.341-3.309c4.908-1.694,9.387-4.631,14.616-7.31\n\t\tc-0.286-2.358-0.624-5.138-0.979-8.059c5.354,1.018,10.195,3.086,14.656,2.456c4.209-0.595,8.018-4.028,11.212-5.779\n\t\tc6.14,7.031,11.343,13.581,17.231,19.442c2.408,2.397,6.182,4.277,9.541,4.681c6.493,0.782,13.134,0.444,19.711,0.396\n\t\tc8.527-0.063,15.677,3.642,21.383,9.271c5.702,5.624,11.735,6.935,19.076,5.136c3.545-0.868,7.25-1.157,10.726-2.224\n\t\tc5.453-1.674,10.619-2.677,16.519-1.275c7.049,1.676,13.689-1.304,20.119-4.278c8.976-4.152,18.236-5.666,27.779-2.308\n\t\tc0.229,0.864,0.74,1.708,0.506,2.076c-9.346,14.634-16.662,31.271-35.505,36.704c-6.635,1.913-9.88,7.499-13.826,12.402\n\t\tc-2.254,2.8-4.408,6.171-7.411,7.791c-10.625,5.727-16.705,14.942-21.042,25.604c-2.992,7.36-5.224,14.96-12.662,19.569\n\t\tc-3.961,2.455-4.403,6.921-4.935,11.415c-1.394,11.795-12.526,20.962-23.229,19.581c-5.46-0.704-10.236-2.577-12.952-7.979\n\t\tc-1.976-3.93-4.376-7.352-9.6-7.613c-1.724-0.086-3.756-1.552-4.971-2.968c-4.943-5.763-10.195-4.868-16.002-1.532\n\t\tc-6.327,3.635-12.875,6.881-19.253,10.432c-6.555,3.648-8.875,3.161-12.958-3.328c-1.232-1.959-2.323-4.053-3.157-6.21\n\t\tc-2.271-5.874-5.853-9.543-12.741-8.813c-1.538,0.163-3.603-0.178-4.708-1.125c-6.671-5.718-16.215-7.341-21.314-15.336\n\t\tc-3.44-5.398-8.288-5.756-13.811-2.996C1301.771,552.008,1293.902,553.316,1284.695,548.622z"
		}, {
			id: 12,
			path: "M1143.777,513.552c1.961-2.899,3.947-5.879,5.98-8.827\n\t\tc3.208-4.649,2.788-9.317,0.338-14.136c-2.263-4.448-5.646-6.34-10.57-5.146c-2.587,0.627-5.122,1.517-7.736,1.972\n\t\tc-5.648,0.982-8.585-0.589-9.509-5.982c-1.066-6.218-4.271-12.924,2.405-18.345c1.152-0.935,1.89-2.908,2.031-4.472\n\t\tc1.011-11.184,7.915-18.496,15.846-25.394c6.044-5.257,6.673-11.745,0.328-14.851c-12.339-6.039-11.311-16.458-11.774-27.265\n\t\tc12.729-5.445,25.152-5,37.541,0.014c8.42,3.408,17.088,5.46,26.187,5.47c2.596,0.003,5.426,0.346,7.746-0.531\n\t\tc6.514-2.463,11.755-0.544,16.168,4.086c4.806,5.044,9.855,7.4,16.942,4.706c1.994-0.757,5.115,0.583,7.412,1.634\n\t\tc12.075,5.521,24.359,8.195,37.493,4.088c2.158-0.675,5.293-1.486,6.78-0.474c6.312,4.296,13.617,1.543,20.223,3.49\n\t\tc2.246,0.662,5.788,0.197,7.52-1.231c8.068-6.652,16.137-1.763,24.176-0.581c1.482,0.218,2.797,1.588,4.247,2.461\n\t\tc0.346,7.528-5.741,11.297-9.089,16.292c-2.742,4.093-4.878,8.085-4.639,12.778c0.305,5.947-1.964,10.248-6.363,13.866\n\t\tc-1.792,1.475-3.212,3.4-4.994,4.89c-5.112,4.275-9.146,8.86-4.412,17.151c-13.3,1.046-17.213,11.508-22.947,19.805\n\t\tc-3.366,4.869-3.698,10.694-0.627,16.118c4.601,8.127,1.039,15.362-2.246,22.628c-0.527,1.167-1.662,2.056-2.499,3.086\n\t\tc-7.867,9.687-7.866,9.688-20.856,4.811c-8.161,7.597-16.831,15.668-26.034,24.235c-3.624-1.725-7.366-3.505-10.917-5.195\n\t\tc0.168-2.027,0.028-3.078,0.362-3.946c3.413-8.866,2.653-8.089-4.365-15.234c-6.677-6.797-13.778-7.585-22.466-7.419\n\t\tc-8.863,0.169-17.766-1.653-26.65-2.625c-4.591-0.502-9.177-1.05-13.786-1.58C1158.153,526.033,1158.153,526.033,1143.777,513.552z"
		}, {
			id: 29,
			path: "M1398.948,325.561c2.313,3.641,3.858,5.468,4.739,7.573\n\t\tc2.496,5.963,1.334,8.078-4.741,10.68c-6.396,2.74-13.103,5.103-18.889,8.845c-8.396,5.432-16.177,11.878-19.278,23.256\n\t\tc2.626,2.752,5.765,6.04,9.225,9.665c-2.621,2.304-5.284,4.645-8.329,7.321c1.92,2.556,3.66,4.869,5.789,7.702\n\t\tc-1.018,2.697-2.156,5.716-3.43,9.092c-8.199,1.041-15.898,1.643-23.688-1.375c-4.589-1.777-9.544-2.845-14.435-3.515\n\t\tc-2.414-0.33-5.551,0.263-7.504,1.647c-8.623,6.109-17.809,3.6-26.529,1.505c-5.19-1.247-9.713-1.054-14.603,0.191\n\t\tc-9.667,2.462-19.033,0.907-28.169-2.583c-1.184-0.452-2.162-1.439-3.708-2.504c2.563-7.886,4.825-15.756,7.78-23.357\n\t\tc0.828-2.132,3.506-3.773,5.663-5.113c4.218-2.622,8.797-4.669,12.982-7.336c4.156-2.648,5.75-7.182,3.392-11.184\n\t\tc-3.663-6.213-7.058-12.744-14.717-15.552c-4.495-1.649-8.511-4.603-13.764-7.542c3.755-4.754,6.458-8.445,9.443-11.889\n\t\tc4.102-4.729,7.182-9.586,4.964-16.271c-0.471-1.423-0.484-3.414,0.154-4.724c5.184-10.651,7.27-21.916,6.742-33.712\n\t\tc5.372-2.491,10.671-4.4,15.334-7.327c2.522-1.584,4.883-4.63,5.72-7.484c3.214-10.973,8.78-18.791,20.842-21.488\n\t\tc6.699-1.498,13.044-4.923,19.278-8.02c3.169-1.574,5.796-4.282,8.575-6.587c6.896-5.721,13.468-12.187,23.737-7.601\n\t\tc1.393,0.622,3.365,0.452,4.934,0.079c4.734-1.126,8.051,1.017,11.813,3.605c8.975,6.176,18.468,11.595,27.615,17.529\n\t\tc2.924,1.896,5.421,4.449,8.021,6.623c-1.768,4.001-3.243,6.944-4.381,10.011c-1.992,5.363-1.398,10.382,2.141,15.09\n\t\tc3.044,4.047,9.236,6.578,7.419,13.134c-1.37,4.939-3.473,9.674-5.582,15.403c2.533,3.066,5.822,7.05,9.395,11.375\n\t\tC1414.682,309.246,1406.967,317.246,1398.948,325.561z"
		}, {
			id: 54,
			path: "M527.447,589.286c3.196,1.946,6.236,4.246,9.631,5.738\n\t\tc3.335,1.464,7.622,1.895,7.771,6.455c0.139,4.238-2.164,7.634-6.153,9.522c-7.321,3.464-13.463,8.089-18.239,14.913\n\t\tc-4.029,5.755-10.499,7.656-17.543,7.864c-15.351,0.452-29.314,4.996-41.41,14.748c-2.064,1.664-4.507,2.857-6.563,4.528\n\t\tc-4.032,3.279-7.686,3.212-12.777,1.401c-7.363-2.619-15.387-3.611-23.216-4.63c-8.872-1.154-18.002-0.756-26.729-2.496\n\t\tc-14.199-2.83-27.741-1.127-41.258,3.131c-4.749,1.496-9.497,3.405-14.377,3.957c-5.115,0.578-10.703,0.778-15.521-0.695\n\t\tc-7.775-2.378-14.506-2.313-22.048,1.315c-8.932,4.296-18.584,7.147-28.034,10.299c-6.55,2.184-12.135,1.153-16.722-4.996\n\t\tc-2.201-2.95-6.089-4.895-9.554-6.602c-11.374-5.605-13.646-11.144-7.668-22.214c6.551-12.132,16.368-21.234,29.601-25.25\n\t\tc11.914-3.615,20.622-10.469,26.632-21.005c3.959-6.939,9.754-11.378,16.737-15.055c13.798-7.266,27.021-15.541,42.117-20.241\n\t\tc16.443-5.12,32.881-6.893,50.112-4.92c16.573,1.897,33.087,3.386,48.385,10.603c8.707,4.108,17.234,8.601,25.791,13.019\n\t\tc12.005,6.2,23.45,13.678,37.492,14.918c2.373,0.209,4.522,2.417,6.878,3.471c2.254,1.009,4.642,1.719,6.959,2.547\n\t\tC527.73,589.597,527.447,589.286,527.447,589.286z"
		}, {
			id: 30,
			path: "M1546.646,326.266c-2.97,3.242-4.965,5.43-6.971,7.607\n\t\tc-7.121,7.729-7.654,17.313-2.473,26.32c3.05,5.3,4.807,11.343,7.666,18.322c-10.547,3.28-19.535,6.631-28.798,8.816\n\t\tc-11.648,2.747-22.082,7.222-30.178,16.306c-0.886,0.993-1.771,2.038-2.837,2.812c-11.602,8.43-18.725,19.93-24.82,32.777\n\t\tc-4.533,9.553-12.351,16.689-24.86,13.553c-1.492-0.375-3.323,0.723-4.884,0.46c-3.229-0.542-7.741-0.492-9.322-2.541\n\t\tc-5.684-7.366-15.391-11.643-17.383-21.726c-0.434-2.184,0.413-4.999,1.556-7.023c1.438-2.549,4.093-4.391,5.673-6.886\n\t\tc2.46-3.886,4.459-8.064,6.682-12.171c-14.888-7.73-30.923-7.397-48.465-8.126c3.655-3.92,6.186-6.633,9.345-10.021\n\t\tc-2.015-1.638-3.539-3.174-5.329-4.279c-5.946-3.672-6.586-5.003-3.048-10.99c5.669-9.592,15.063-14.691,24.659-19.419\n\t\tc0.893-0.44,1.872-0.706,2.761-1.153c4.079-2.051,9.903-3.178,11.704-6.486c1.742-3.203-0.415-8.71-1.299-13.118\n\t\tc-1.273-6.358,3.42-9.725,6.64-13.692c1.835-2.261,4.731-3.634,7.027-5.551c8.088-6.753,8.28-9.682,1.323-18.11\n\t\tc-0.842-1.019-1.721-2.008-2.347-2.738c1.351-5.058,3.412-9.727,3.636-14.481c0.222-4.71-1.412-9.507-2.372-15.081\n\t\tc3.932-4.275,9.874-5.062,15.78-5.41c7.64-0.45,15.311-0.582,22.962-0.476c2.507,0.035,5.573,0.542,7.392,2.038\n\t\tc6.332,5.209,12.045,11.176,18.391,16.367c2.395,1.959,5.84,3.558,8.865,3.665c16.243,0.577,32.576,1.984,47.838-6.269\n\t\tc5.558-3.005,13.134-4.81,17.638,0.562c4.606,5.495-0.434,11.608-3.997,16.093c-4.83,6.079-9.063,12.763-15.868,17.25\n\t\tc-6.883,4.537-6.682,7.083-0.688,13.205C1540.982,319.467,1543.418,322.557,1546.646,326.266z"
		}, {
			id: 59,
			path: "M1124.881,386.18c-11.552,5.554-21.614,2.849-31.716,0.899\n\t\tc-5.513-1.065-11.125-1.62-16.64-2.678c-3.207-0.616-6.582-1.266-9.411-2.78c-9.042-4.837-17.827-10.156-26.809-15.11\n\t\tc-1.625-0.896-4.087-1.832-5.523-1.229c-4.906,2.061-8.459-0.14-11.818-2.975c-4.811-4.059-10.13-6.474-16.472-5.519\n\t\tc-4.066,0.612-6.202-1.424-7.941-4.568c-3.376-6.106-6.665-12.265-10.237-18.255c-4.509-7.561-5.615-15.828-3.832-24.075\n\t\tc1.904-8.814,0.434-16.922-4.337-23.869c-6.356-9.256-8.591-19.207-8.725-30.073c-0.085-6.894-0.609-13.783-0.957-21.092\n\t\tc1.83-0.25,3.432-0.687,5.023-0.652c16.658,0.365,29.747-6.997,39.659-19.643c11.709-14.938,26.72-18.907,44.393-15.162\n\t\tc7.108,1.506,14.237,3.503,20.897,6.349c5.901,2.522,6.909,5.637,3.693,11.177c-7.91,13.63-4.069,25.371,4.283,37.042\n\t\tc3.23,4.514,5.53,9.725,8.001,14.743c2.646,5.37,4.346,11.314,7.605,16.25c6.774,10.258,7.447,21.282,4.843,32.552\n\t\tc-2.072,8.965,0.045,17.765-0.463,26.407c-0.766,12.98,4.104,22.097,12.135,31.045\n\t\tC1122.947,377.658,1123.386,382.122,1124.881,386.18z"
		}, {
			id: 31,
			path: "M1665.755,371.702c-5.518,2.716-10.196,5.021-15.216,7.492\n\t\tc-2.178,6.531-1.292,12.042,5.179,16.156c2.521,1.603,4.542,3.828,3.269,7.522c-1.473,4.277,0.492,7.677,3.314,10.829\n\t\tc1.754,1.958,3.567,4.044,4.637,6.398c3.036,6.683,1.266,10.851-5.864,12.866c-17.866,5.049-35.337,3.569-52.613-3.268\n\t\tc-6.008-2.377-12.623-3.223-19.628-4.93c-3.174,14.997-14.798,21.74-24.376,30.116c-1.639,1.433-5.022,1.585-7.46,1.267\n\t\tc-11.218-1.464-21.609,0.422-31.979,5.096c-4.844,2.183-10.886,1.809-16.408,2.352c-4.188,0.412-8.461,0.111-12.607,0.731\n\t\tc-4.242,0.634-8.359,2.066-12.559,3.037c-6.222,1.438-11.375,0.537-16.199-4.619c-3.682-3.936-9.079-6.266-14.239-9.655\n\t\tc1.959-2.725,3.677-5.078,5.354-7.459c2.293-3.254,5.68-6.233,6.633-9.849c4.253-16.129,18.257-24.034,29.103-34.163\n\t\tc6.165-5.757,15.671-8.208,23.983-11.317c7.723-2.888,15.904-4.521,23.791-7.004c4.441-1.399,6.468-4.579,4.754-9.311\n\t\tc-1.803-4.976-3.201-10.198-5.723-14.792c-4.229-7.704-4.815-14.604,0.417-21.082c8.222-10.181,20.295-14.61,31.817-19.601\n\t\tc1.461-0.632,4.372,0.949,6.085,2.215c10.796,7.983,22.664,10.57,35.672,7.371c2.453-0.604,4.756-2.057,6.956-3.398\n\t\tc3.906-2.38,7.585-5.135,11.526-7.449c10.19-5.985,19.725-3.932,28.84,2.633c5.03,3.624,5.884,6.364,3.041,11.759\n\t\tc-1.072,2.034-2.617,3.848-4.109,5.625c-9.571,11.409-9.202,19.503,1.352,29.804\n\t\tC1663.418,367.972,1664.017,369.201,1665.755,371.702z"
		}]
	},
}
