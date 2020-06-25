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
});

// Gildengefechte - Snapshot
FoEproxy.addHandler('GuildBattlegroundService', 'getPlayerLeaderboard', (data, postData) => {
	// immer zwei vorhalten, für Referenz Daten (LiveUpdate)
	if(localStorage.getItem('GildFights.NewAction') !== null){
		GildFights.PrevAction = JSON.parse(localStorage.getItem('GildFights.NewAction'));
		GildFights.PrevActionTimestamp = parseInt(localStorage.getItem('GildFights.NewActionTimestamp'));
	}
	else if(GildFights.NewAction !== null){
		GildFights.PrevAction = GildFights.NewAction;
		GildFights.PrevActionTimestamp = GildFights.NewActionTimestamp;
	}

	let d = data['responseData'],
		players = [];

	for(let i in d){
		if(!d.hasOwnProperty(i)){
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

	if( $('#GildPlayers').length > 0 ){
		GildFights.BuildPlayerContent();
	} else {
		GildFights.ShowPlayerBox();
	}
});


// Gildengefechte - Map, Gilden
FoEproxy.addHandler('GuildBattlegroundService', 'getBattleground', (data, postData) => {
	GildFights.init();
	GildFights.MapData = data['responseData'];
});

// GEX started
FoEproxy.addHandler('GuildExpeditionService', 'getOverview', (data, postData) => {
	GildFights.InitBonus(true);
});

// World map
FoEproxy.addHandler('CampaignService', 'start', (data, postData) => {
	GildFights.InitBonus();
});

// GvG Map is opend
FoEproxy.addHandler('ClanBattleService', 'getContinent', (data, postData) => {
	GildFights.InitBonus();
});

// neihbor is visit
FoEproxy.addHandler('OtherPlayerService', 'visitPlayer', (data, postData) => {
	let OtherPlayer = data.responseData.other_player;
	let IsPlunderable = (OtherPlayer.is_neighbor && !OtherPlayer.is_friend && !OtherPlayer.is_guild_member);

	if (IsPlunderable) {
		GildFights.InitBonus();
	}
});

// Bonus get updated
FoEproxy.addHandler('BonusService', 'getLimitedBonuses', (data, postData) => {
	GildFights.Bonuses = data['responseData'];

	if($('#bonus-hud').length > 0){
		GildFights.CalcBonusData();
	}
});

// Guildfights would leave
FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
	GildFights.HideBonusSidebar();
});


/**
 * GuildFights Class
 *
 * @type {{init: GildFights.init, SetBonusTypes: GildFights.SetBonusTypes, PrepareColors: GildFights.PrepareColors, ShowPlayerBox: GildFights.ShowPlayerBox, ProvinceNames: null, Bonuses: [], PrevActionTimestamp: null, NewActionTimestamp: null, SortedColors: null, ShowBonusSidebar: GildFights.ShowBonusSidebar, ShowGildBox: GildFights.ShowGildBox, BonusTypes: [string, string, string, string], HideBonusSidebar: GildFights.HideBonusSidebar, BuildFightContent: GildFights.BuildFightContent, Colors: null, InjectionLoaded: boolean, RefreshTable: GildFights.RefreshTable, MapData: null, BuildPlayerContent: GildFights.BuildPlayerContent, CalcBonusData: GildFights.CalcBonusData, NewAction: null, PlayersPortraits: null, PrevAction: null}}
 */
let GildFights = {

	PrevAction: null,
	PrevActionTimestamp: null,
	NewAction: null,
	NewActionTimestamp: null,
	MapData: null,
	PlayersPortraits: null,
	Colors : null,
	SortedColors: null,
	ProvinceNames : null,
	InjectionLoaded: false,

	Bonuses: [],
	BonusTypes: [
		'first_strike',
		'spoils_of_war',
		'diplomatic_gifts',
		'missile_launch'
	],

	/**
	 * Zündung
	 */
	init: ()=> {

		if(GildFights.InjectionLoaded === false){
			FoEproxy.addWsHandler('GuildBattlegroundService', 'all', data => {
				if ($('#LiveGildFighting').length > 0) {

					if(data.responseData[0] !== undefined){
						// console.log('msg', data.responseData[0]);
						GildFights.RefreshTable(data.responseData[0]);
					}
				}
			});

			GildFights.InjectionLoaded = true;
		}

		GildFights.InitBonus();
	},


	/**
	 * InitBonus with offset for GEX
	 *
	 * @param isGex
	 * @constructor
	 */
	InitBonus: (isGex = false)=> {
		let bt = GildFights.BonusTypes,
			exist = false;

		// check if player has some of these 4 bonuses
		for(let i in bt)
		{
			if(!bt.hasOwnProperty(i)) break;

			GildFights.Bonuses.forEach((arr)=>{
				if(arr['type'].includes(bt[i])){
					exist = true;
					return false;
				}
			});

			if(exist === true) break;
		}

		// no? exit...
		if(exist === false){
			return;
		}

		if($('#bonus-hud').length === 0){
			HTML.AddCssFile('guildfights');

			// wait 2s
			setTimeout(()=>{
				GildFights.ShowBonusSidebar(isGex);
			},2000);
		}
	},


	/**
	 * Create a wrapper "hud" for the icons
	 *
	 * @param offset
	 * @constructor
	 */
	ShowBonusSidebar: (isGex)=> {

		let div = $('<div />');

		div.attr({
			id: 'bonus-hud',
			class: 'game-cursor'
		});

		if(isGex){
			div.css({
				top: 382,
				right: 62
			});
		}

		$('body').append(div).promise().done(function(){
			GildFights.SetBonusTypes();
		});
	},


	/**
	 * Removes the bonus-Hud
	 */
	HideBonusSidebar: ()=> {
		if($('#bonus-hud').length > 0){
			$('#bonus-hud').fadeToggle(function(){
				$(this).remove();
			});
		}
	},


	/**
	 * Box content
	 */
	SetBonusTypes: ()=> {
		const bt = GildFights.BonusTypes,
			d = GildFights.Bonuses,
			hud = $('#bonus-hud');

		for(let i in bt)
		{
			if(!bt.hasOwnProperty(i)){
				break;
			}

			let b = d.find(e => (e['type'] === bt[i]));

			if(b !== undefined){
				let sp = $('<div />'),
					sb = $('<span />'),
					si = $('<span />');

				sp.attr({
					class: `hud-btn`
				});

				sb.attr({
					class: `${bt[i]}-icon icon`
				});

				si.attr({
					id: `${bt[i]}-bonus`,
					class: 'bonus'
				});

				if(b['amount'] === undefined || b['amount'] === -1){
					sp.addClass('hud-btn-red');
					si.css({
						display: 'none'
					});

				} else {
					si.text(b['amount']);
				}

				hud.append( sp.append(sb).append(si) );
			}
		}
	},


	/**
	 * Show the bonus amount
	 */
	CalcBonusData: ()=> {
		const bt = GildFights.BonusTypes,
			d = GildFights.Bonuses,
			hud = $('#bonus-hud');

		for(let i in bt)
		{
			if(!bt.hasOwnProperty(i)){
				break;
			}

			let b = d.find(e => (e['type'] === bt[i]));

			if(b !== undefined){

				let si = hud.find(`#${b['type']}-bonus`),
					a = parseInt(si.text());

				// Bonus is empty
				if(b['amount'] === undefined || b['amount'] === -1){
					si.closest('.hud-btn').addClass('hud-btn-red');
					si.hide();
				}

				// Bonus ticker down, when changed
				else if(a !== b['amount']) {
					si.text(b['amount']);

					si.addClass('bonus-blink');

					setTimeout(()=>{
						si.removeClass('bonus-blink');
					}, 3500);
				}
			}
		}
	},


	/**
	 * Zeigt die große Map mit Gefechten
	 */
	ShowGildBox: ()=> {
		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if( $('#LiveGildFighting').length === 0 ){

			HTML.Box({
				id: 'LiveGildFighting',
				title: 'Live Gefechte',
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize: true
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('guildfights');
		}

		GildFights.BuildFightContent();
	},


	/**
	 * Zeigt die Spielerübersicht
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
				minimize: true
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('guildfights');
		}

		GildFights.BuildPlayerContent();
	},


	/**
	 * Inhalt des Snapshots darstellen
	 */
	BuildPlayerContent: ()=> {
		let t = [],
			b = [],
			tN = 0,
			tF = 0;

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
			b.push(playerNew['negotiationsWon'] + negotaionAddOn);
			b.push('</td>');

			b.push('<td class="text-center">');
			b.push(playerNew['battlesWon'] + fightAddOn);
			b.push('</td>');
			
			b.push('<td class="text-center">');
			let both = playerNew['battlesWon'] + (playerNew['negotiationsWon']*2);
			b.push(both);
			b.push('</td>');

			b.push('</tr>');
		}

        let tNF = (tN*2)+tF;

        t.push('<table class="foe-table">');

		t.push('<thead>');
		t.push('<tr>');

		t.push('<th>&nbsp;</th>');
		t.push('<th>&nbsp;</th>');
		t.push('<th>' + i18n('Boxes.Gildfights.Player') + '</th>');
		t.push('<th class="text-center">' + i18n('Boxes.Gildfights.Negotiations') + ' <strong class="text-warning"><small>(' + HTML.Format(tN) + ')</small></strong></th>');
		t.push('<th class="text-center">' + i18n('Boxes.Gildfights.Fights') + ' <strong class="text-warning"><small>(' + HTML.Format(tF) + ')</small></strong></th>');
		t.push('<th class="text-center">' + i18n('Boxes.Gildfights.Total') + ' <strong class="text-warning"><small>(' + HTML.Format(tNF) + ')</small></strong></th>');

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
	 * Farben der einzelenen Gilden ermitteln und zuordnen
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
				base: c['base'],
				main: c['mainColour'],
				highlight: c['highlight'],
				shadow: c['shadow']
			});
		}

		GildFights.SortedColors = colors;
	},


	/**
	 * Inhalt der Kartenbox
	 */
	BuildFightContent: () => {

		GildFights.PrepareColors();

		let t = [],
			mP = GildFights.MapData['map']['provinces'],
			bP = GildFights.MapData['battlegroundParticipants'],
			cnt = 0;

		t.push('<table class="foe-table">');

		t.push('<thead>');

		t.push('<th>&nbsp;</th>');

		for(let x in bP)
		{
			if(!bP.hasOwnProperty(x)){
				break;
			}

			t.push('<th>' + bP[x]['clan']['name'] + '<span class="head-color" style="background-color:' + GildFights.SortedColors[bP[x]['participantId']]['main'] + '"></span></th>');
		}



		t.push('</thead>');

		t.push('<tbody>');

		for(let i in mP)
		{
			if(!mP.hasOwnProperty(i)){
				break;
			}

			let prov;

			if(cnt === 0){
				prov = GildFights.ProvinceNames[0]['provinces'][0];
			} else {
				prov = GildFights.ProvinceNames[0]['provinces'].find(o => (o['id'] === cnt));
			}

			t.push('<tr data-id="' + cnt + '">');

			t.push('<td>');
			t.push(prov['name']);
			t.push('</td>');

			for(let x = 0; x < bP.length; x++)
			{
				if(mP[i]['ownerId'] !== undefined && bP[x]['participantId'] === mP[i]['ownerId']){

					let bonus = mP[i]['victoryPointsBonus'] !== undefined ? ' <small class="text-success">+' + mP[i]['victoryPointsBonus'] + '</small>' : '';

					t.push('<td data-field="' + cnt + '-' + mP[i]['ownerId'] + '" class="text-center">');
					t.push('Sp: ' + mP[i]['victoryPoints'] + bonus);

					if(mP[i]['conquestProgress'].length > 0){
						let cP = mP[i]['conquestProgress'];

						for(let y in cP)
						{
							if(!cP.hasOwnProperty(y)){
								break;
							}

							let p = GildFights.MapData['battlegroundParticipants'].find(o => (o['participantId'] === cP[y]['participantId']));
							t.push('<span class="attack attacker-' + cP[y]['participantId'] + '"><span style="background-color:'+ GildFights.SortedColors[p['participantId']]['main'] +';width:' + cP[y]['progress'] + '%"></span></span>');
						}
					}

					t.push('</td>');

				} else {
					t.push('<td class="">');
					t.push('&nbsp;');
					t.push('</td>');
				}
			}

			t.push('</tr>');

			cnt++;
		}

		t.push('</tbody>');

		t.push('<table>');

		$('#LiveGildFightingBody').html( t.join('') );
	},


	/**
	 * Echtzeit aktualisierung der Kartenbox
	 *
	 * @param data
	 */
	RefreshTable: (data)=> {

		// Provinz wurde übernommen
		if(data['lockedUntil'] !== undefined)
		{
			$('[data-id="' + data['id'] + '"]').find('td').each(function(){
				$(this).html('');
			});

			$('[data-field="' + data['id'] + '-' + data['ownerId'] + '"]').text('Sp: ' + data['victoryPoints']);

			return;
		}

		// Es wird gerade gekämpft
		for(let i in data['conquestProgress'])
		{
			if(!data['conquestProgress'].hasOwnProperty(i)){
				break;
			}

			let d = data['conquestProgress'][i],
				cell = $('[data-field="' + data['id'] + '-' + data['ownerId'] + '"]'),
				p = GildFights.MapData['battlegroundParticipants'].find(o => (o['participantId'] === d['participantId']));

			// Angreifer gibt es schon
			if( cell.find('.attacker-' + d['participantId']).length > 0 ){
				// nur die Prozente updaten
				cell.find('.attacker-' + d['participantId']).children().css({'width': d['progress'] + '%'});
			}
			// neuen "Balken" einfügen
			else {
				cell.append($('<span class="attack attacker-' + d['participantId'] + '"><span style="background-color:'+ GildFights.SortedColors[p['participantId']]['main'] +';width:' + d['progress'] + '%"></span></span>'));
			}

			cell.addClass('red-pulse');

			// nach 1s die Klasse wieder entfernen
			setTimeout(() =>  {
				cell.removeClass('red-pulse');
			}, 1000);
		}
	}
};
