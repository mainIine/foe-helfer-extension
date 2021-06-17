/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com//mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

// Guild rank in GEX
FoEproxy.addHandler('ChampionshipService', 'getOverview', (data, postData) => {
	if (data && data.responseData)
	{
		GexStat.UpdateData('championship', data.responseData);
	}
});

// GEX member statistic
FoEproxy.addHandler('GuildExpeditionService', 'getContributionList', (data, postData) => {
	// Inno sends response data two times... so prevent double processing with ResponseBlockTime
	if (data && data.responseData && (+MainParser.getCurrentDate() - GexStat.ResponseBlockTime) > 2000)
	{
		GexStat.ResponseBlockTime = +MainParser.getCurrentDate();
		GexStat.UpdateData('participation', data.responseData);
	}
});

FoEproxy.addHandler('GuildExpeditionService', 'getOverview', (data, postData) => {
	let Data = data.responseData;
	if (Data !== undefined)
	{
		if (data.responseData['state'] !== 'inactive')
		{
			GexStat.GEXId = Data.nextStateTime;
		}
		else
		{
			GexStat.GEXId = (Data.nextStateTime * 1 - 86400);
		}
	}
});

let GexStat = {
	db: null,
	GEXId: undefined,
	GexWeeks: undefined,
	CurrentGexWeek: undefined,
	CurrentStatGroup: 'Ranking',
	ResponseBlockTime: 0,
	Settings: {
		deleteOlderThan: 20,
	},

	/**
	 *
	 * @returns {Promise<void>}
	 */
	checkForDB: async (playerID) => {

		const DBName = `FoeHelperDB_GexStat_${playerID}`;

		GexStat.db = new Dexie(DBName);

		GexStat.db.version(1).stores({
			ranking: '&gexweek'
		});

		GexStat.db.version(2).stores({
			participation: '&gexweek'
		});

		GexStat.db.open();
	},


	BuildBox: (event) => {

		if ($('#GexStat').length === 0)
		{
			HTML.Box({
				id: 'GexStat',
				title: i18n('Boxes.GexStat.Title'),
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize: true,
				settings: 'GexStat.GexStatSettings()'
			});

			GexStat.showPreloader('#GexStat');

			HTML.AddCssFile('gexstat');
		}
		else if (!event)
		{
			HTML.CloseOpenBox('GexStat');
			return;
		}

		$('#GexStat').on('click', '.toggle-statistic', function () {

			GexStat.CurrentStatGroup = $(this).data('value');

			$("#gexsTabs").find("li").removeClass("active");
			$(this).parent().addClass("active");
			$("#gexs_weekswitch").attr("data-group", GexStat.CurrentStatGroup);

			GexStat.ShowTabContent(GexStat.CurrentStatGroup, GexStat.CurrentGexWeek);
		});

		// moment.locale(i18n('Local'));
		// GexStat.InitSettings();

		GexStat.Show();
	},


	UpdateData: async (source, data) => {

		// Todo: Autodelete old data

		let gexid = GexStat.GEXId;

		if (!gexid || !data || !source)
		{
			return;
		}

		switch (source)
		{
			case 'championship':

				let ranking = data.ranking;
				let participants = data.participants;
				let rankingdata = {};

				participants.forEach(guild => {

					if (rankingdata[guild.id] === undefined)
					{
						rankingdata[guild.id] = {};
					}

					let rankdata = ranking.filter(function (rank) {
						return rank.participantId === guild.id;
					});

					rankingdata[guild.id].guildId = guild.id;
					rankingdata[guild.id].worldId = guild.worldId;
					rankingdata[guild.id].name = guild.name;
					rankingdata[guild.id].level = guild.level;
					rankingdata[guild.id].worldrank = guild.rank;
					rankingdata[guild.id].flag = guild.flag.toLowerCase();
					rankingdata[guild.id].memberCount = guild.memberCount;
					rankingdata[guild.id].trophies = guild.trophies;
					rankingdata[guild.id].worldName = guild.worldName
					rankingdata[guild.id].rank = rankdata[0].rank;
					rankingdata[guild.id].points = rankdata[0].points;

				});

				await GexStat.db.ranking.put({
					gexweek: gexid,
					participants: Object.values(rankingdata),
					currentGuildID: ExtGuildID,
					lastupdate: MainParser.getCurrentDate()
				});

				if ($('#GexStatBody').length)
				{
					GexStat.ShowTabContent(GexStat.CurrentStatGroup, GexStat.CurrentGexWeek);
				}
				break;

			case 'participation':

				if (!data) { return; }

				let partdata = {};
				let sumExpeditionPoints = 0;
				let sumEncounters = 0;
				let countMember = data.length;

				for (let k in data)
				{
					if (data.hasOwnProperty(k))
					{
						const player = data[k].player ? data[k].player : undefined;
						if (!player) { return; };

						if (partdata[k] === undefined)
						{
							partdata[k] = {};
						}

						partdata[k].rank = k * 1 + 1;
						partdata[k].player_id = player.player_id;
						partdata[k].name = player.name;
						partdata[k].avatar = player.avatar;
						partdata[k].expeditionPoints = data[k].expeditionPoints ? data[k].expeditionPoints : 0;
						partdata[k].solvedEncounters = data[k].solvedEncounters;

						sumExpeditionPoints += data[k].expeditionPoints ? data[k].expeditionPoints : 0;
						sumEncounters += data[k].solvedEncounters;
					}
				}

				await GexStat.db.participation.put({
					gexweek: gexid,
					participation: Object.values(partdata),
					expeditionPoints: sumExpeditionPoints,
					solvedEncounters: sumEncounters,
					countMember: countMember,
					currentGuildID: ExtGuildID,
					lastupdate: MainParser.getCurrentDate()
				});

				// Reset available GexWeeks
				GexStat.GexWeeks = undefined;

				if ($('#GexStatBody').length)
				{
					GexStat.ShowTabContent(GexStat.CurrentStatGroup, GexStat.CurrentGexWeek);
				}

				GexStat.RequestRunning = false;
				break;
		}

	},


	Show: async (gexweek) => {

		GexStat.showPreloader("#GexStat");
		GexStat.InitSettings();
		GexStat.CurrentStatGroup = 'Ranking';

		let GexRanking = undefined;

		let h = [];

		if (gexweek === undefined || gexweek === null)
		{
			GexRanking = await GexStat.db.ranking.reverse().first();
			gexweek = GexRanking && GexRanking.gexweek ? GexRanking.gexweek : undefined;
		}
		else
		{
			GexRanking = await GexStat.db.ranking.where('gexweek').equals(gexweek).first();
		}

		await GexStat.SetBoxNavigation(gexweek);

		// No GEX data available
		if (gexweek === undefined || !GexRanking || !GexRanking.participants)
		{
			GexStat.hidePreloader("#GexStat");
			h.push(`<div class="no-data"><p>${i18n('Boxes.GexStat.ResultsNoData')}</p></div>`);
			$('#gexsContentWrapper').html(h.join(''))
			return;
		}

		let GexPaticipants = GexRanking.participants.sort(function (a, b) {
			return a.rank - b.rank;
		});

		h.push(`<table id="gexsRankingTable" class="foe-table">` +
			`<tbody><tr>`);
		//const map = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;

		for (let x = 0; x < GexPaticipants.length; x++)
		{
			const participant = GexPaticipants[x];
			let points = parseInt(participant.points);
			//let progressWidth = map(points, 0, 133, 0, 100);
			let progressWidth = points >= 100 ? 100 : points;
			let rankClass = participant.rank <= 3 ? participant.rank : 0;
			let stripedClass = points > 100 ? ' glow' : '';

			h.push(`<tr>`);
			h.push(`<td class="td-rank"><span class="winner-rank rank-${rankClass}"><span>${participant.rank}</span></span></td>`);
			h.push(`<td>` +
				`<div class="clanflag"><img src="${MainParser.InnoCDN + 'assets/shared/clanflags/' + participant.flag + '.jpg'}" /></div>` +
				`<div class="claninfo"><span class="clanname">${participant.name}</span><br /> ` +
				`<span class="clanworld">${participant.worldName}</span></div></td>`);
			h.push(`<td class="progress"><div class="progbar rank-${rankClass}${stripedClass}" style="width: ${progressWidth}%"></div> ${participant.points}%</td>`);
			h.push(`<td><div class="flex justify-content-between mbottom2"><div>${i18n('Boxes.GexStat.Rank')}: ${participant.worldrank} </div><div>${i18n('Boxes.GexStat.Member')}: ${participant.memberCount}</div></div>` +
				`<div class="flex justify-content-between"><div>${i18n('Boxes.GexStat.Level')}: ${participant.level}</div>` +
				`<div><span class="trophie"></span> <strong>${participant.trophies.guild_championship_trophy_gold}</strong>` +
				`<span class="trophie silver"></span> <strong>${participant.trophies.guild_championship_trophy_silver}</strong>` +
				`<span class="trophie bronze"></span> <strong>${participant.trophies.guild_championship_trophy_bronze}</strong></div></div></td>`);

			h.push(`</tr>`);
		}

		h.push('</tbody></table>');

		$('#gexsContentWrapper').html(h.join('')).promise().done(function () {
			// Fade out loading screen
			GexStat.hidePreloader('#GexStat');
		});
	},


	ShowParticipation: async (gexweek) => {

		GexStat.showPreloader("#GexStat");
		GexStat.InitSettings();
		GexStat.CurrentStatGroup = 'Participation';

		let GexParticipation = undefined;
		let h = [];

		if (gexweek === undefined || gexweek === null)
		{
			GexParticipation = await GexStat.db.participation.reverse().first();
			gexweek = GexParticipation && GexParticipation.gexweek ? GexParticipation.gexweek : undefined;
		}
		else
		{
			GexParticipation = await GexStat.db.participation.where('gexweek').equals(gexweek).first();
		}

		await GexStat.SetBoxNavigation(gexweek);

		if (!GexParticipation || !GexParticipation.participation)
		{
			GexStat.hidePreloader("#GexStat");
			h.push(`<div class="no-data"><p>${i18n('Boxes.GexStat.ParticipationNoData')}</p></div>`);
			$('#gexsContentWrapper').html(h.join(''))
			return;
		}

		const participation = GexParticipation.participation.sort(function (a, b) {
			return a.rank - b.rank;
		});
		let sEncounters = GexParticipation.solvedEncounters;
		let aEncounters = GexParticipation.countMember * 48;
		let processing = Number((sEncounters / aEncounters) * 100).toFixed(2);

		h.push(`<div class="participation_overview justify-content-between"><div>${i18n('Boxes.GexStat.Points')}<br />${HTML.Format(GexParticipation.expeditionPoints)}</div>` +
			`<div class="text-center">${i18n('Boxes.GexStat.Member')}<br />${GexParticipation.countMember}</div>` +
			`<div class="text-right">${i18n('Boxes.GexStat.Encounters')}<br />${sEncounters}/${aEncounters} ( ${processing}% )</div>` +
			`</div>`);

		h.push(`<table id="gexsParticipationTable" class="foe-table">` +
			`<thead><tr class="sorter-header">` +
			`<th class="text-center is-number" data-type="gexs-group">#</th>` +
			`<th class="text-center is-number" data-type="gexs-group"><span class="level"></span></th>` +
			`<th class="case-sensitive" data-type="gexs-group">${i18n('Boxes.GexStat.Player')}</th>` +
			`<th class="is-number" data-type="gexs-group">${i18n('Boxes.GexStat.Points')}</th>` +
			`<th class="is-number" data-type="gexs-group">${i18n('Boxes.GexStat.Level')}</th>` +
			`<th class="is-number" data-type="gexs-group">${i18n('Boxes.GexStat.Encounters')}</th>` +
			`</tr></thead>` +
			`<tbody class="gexs-group">`);

		for (let x = 0; x < participation.length; x++)
		{
			const member = participation[x];
			let level = Math.ceil(member.solvedEncounters / 16);
			let encounterClass = ' level' + level;
			h.push(`<tr>`);
			h.push(`<td class="text-center is-number" data-number="${member.rank}">${member.rank}</td>`);
			h.push(`<td class="text-center is-number" data-number="${level}"><span class="level${encounterClass}" title="${HTML.i18nTooltip(i18n('Boxes.GexStat.Level') + ' ' + level)}"></span></td>`);
			h.push(`<td class="case-sensitive" data-text="${member.name.toLowerCase().replace(/[\W_ ]+/g, "")}">` +
				`<div class="avatar"><img src="${MainParser.InnoCDN + 'assets/shared/avatars/' + MainParser.PlayerPortraits[member.avatar] + '.jpg'}" /></div>` +
				`<div class="membername">${member.name}</div></td>`);
			h.push(`<td class="is-number" data-number="${member.expeditionPoints}">${HTML.Format(member.expeditionPoints)}</td>`);
			h.push(`<td class="is-number" data-number="${level}">${level}</td>`);
			h.push(`<td class="is-number" data-number="${member.solvedEncounters}">${member.solvedEncounters}/48</td>`);

			h.push(`</tr>`);

		}

		h.push('</tbody></table>');

		$('#gexsContentWrapper').html(h.join('')).promise().done(function () {
			GexStat.hidePreloader('#GexStat');
			$('#gexsParticipationTable').tableSorter();
		});

	},


	ShowTabContent: (StatGroup, week) => {

		switch (StatGroup)
		{
			case 'Ranking':
				GexStat.Show(week);
				break;
			case 'Participation':
				GexStat.ShowParticipation(week);
				break;
		}

	},


	SetBoxNavigation: async (gexweek) => {
		let h = [];

		if (GexStat.GexWeeks === undefined || GexStat.GexWeeks === null)
		{
			// get all available Gex week keys
			let gexWeeksRanking = await GexStat.db.ranking.where('gexweek').above(0).keys();
			let gexWeeksParticipation = await GexStat.db.participation.where('gexweek').above(0).keys();

			if ((gexWeeksRanking && gexWeeksRanking.length) || (gexWeeksParticipation && gexWeeksParticipation.length))
			{
				//make unique Set of Gex weeks
				GexStat.GexWeeks = [...new Set([...gexWeeksRanking, ...gexWeeksParticipation])];
			}
		}

		// set latest gexweek to show if available and no specific gexweek is set
		if (!gexweek && GexStat.GexWeeks && GexStat.GexWeeks.length)
		{
			gexweek = GexStat.GexWeeks[0];
		}


		h.push('<div class="tabs dark-bg"><ul id="gexsTabs" class="horizontal">');
		h.push(`<li${GexStat.CurrentStatGroup === 'Ranking' ? ' class="active"' : ''}><a class="toggle-statistic" data-value="Ranking"><span>${i18n('Boxes.GexStat.Ranking')}</span></a></li>`);
		h.push(`<li${GexStat.CurrentStatGroup === 'Participation' ? ' class="active"' : ''}><a class="toggle-statistic" data-value="Participation"><span>${i18n('Boxes.GexStat.MemberParticipation')}</span></a></li>`);
		h.push(`</ul></div>`);

		if (gexweek && GexStat.GexWeeks && GexStat.GexWeeks.length)
		{
			GexStat.CurrentGexWeek = gexweek;
			let previousweek = gexweek - 604800;
			let nextweek = gexweek + 604800;

			h.push(`<div id="gexs_weekswitch" class="weekswitch dark-bg" data-group="${GexStat.CurrentStatGroup}">${i18n('Boxes.GexStat.Gex')} ${i18n('Boxes.GexStat.Week')} <button class="btn btn-default btn-set-week" data-week="${previousweek}"${!GexStat.GexWeeks.includes(previousweek) ? ' disabled' : ''}>&lt;</button> `);
			h.push(`<select id="gexs-select-gexweek">`);

			GexStat.GexWeeks.forEach(week => {
				h.push(`<option value="${week}"${gexweek === week ? ' selected="selected"' : ''}>` + moment.unix(week - 518400).format(i18n('Date')) + ` - ` + moment.unix(week).format(i18n('Date')) + `</option>`);
			});

			h.push(`</select>`);
			h.push(`<button class="btn btn-default btn-set-week" data-week="${nextweek}"${!GexStat.GexWeeks.includes(nextweek) ? ' disabled' : ''}>&gt;</button>`);
			h.push(`</div>`);
		}


		h.push(`<div id="gexsContentWrapper"></div>`);

		$('#GexStatBody').html(h.join('')).promise().done(function () {

			$(".btn-set-week").off().on('click', function () {

				let week = $(this).data('week');

				if (!GexStat.GexWeeks.includes(week))
				{
					return;
				};

				GexStat.ShowTabContent(GexStat.CurrentStatGroup, week);
			});

			$("#gexs-select-gexweek").off().on('change', function () {

				let week = parseInt($(this).val());

				if (!GexStat.GexWeeks.includes(week) || week === GexStat.CurrentGexWeek)
				{
					return;
				};

				GexStat.ShowTabContent(GexStat.CurrentStatGroup, week);
			});
		});

	},


	DeleteOldData: async (deleteOlderThan) => {

		let oldWeekTime = Math.floor(+MainParser.getCurrentDate() / 1000) - deleteOlderThan * 604800;
		let db = GexStat.db;

		db.transaction("rw", db.ranking, db.participation, async () => {

			await GexStat.db.ranking.where('gexweek').below(oldWeekTime).delete();
			await GexStat.db.participation.where('gexweek').below(oldWeekTime).delete();

		});

	},


	GexStatSettings: () => {

		let c = [];
		let deleteAfterWeeks = [5, 10, 20, 30, 52, 0];
		let Settings = GexStat.Settings;

		c.push(`<p class="text-left">${i18n('Boxes.GexStat.DeleteDataOlderThan')} <select id="gexsDeleteOlderThan" name="deleteolderthan">`);
		deleteAfterWeeks.forEach(weeks => {
			let option = '';
			if (weeks === 0) { option = i18n('Boxes.GexStat.Never'); }
			else { option = weeks + ' ' + i18n('Boxes.GexStat.Weeks'); }

			c.push(`<option value="${weeks}" ${Settings.deleteOlderThan === weeks ? ' selected="selected"' : ''}>${option}</option>`);
		});

		c.push(`</select>`);
		c.push(`<hr><p><button id="save-GexStat-settings" class="btn btn-default" style="width:100%" onclick="GexStat.SettingsSaveValues()">${i18n('Boxes.GexStat.Save')}</button></p>`);
		$('#GexStatSettingsBox').html(c.join(''));

	},


	SettingsSaveValues: async () => {

		let tmpDeleteOlder = parseInt($('#gexsDeleteOlderThan').val());

		if (GexStat.Settings.deleteOlderThan !== tmpDeleteOlder && tmpDeleteOlder > 0)
		{
			GexStat.showPreloader('#GexStat');

			await GexStat.DeleteOldData(tmpDeleteOlder);
		}

		GexStat.Settings.deleteOlderThan = tmpDeleteOlder;

		localStorage.setItem('GexStatSettings', JSON.stringify(GexStat.Settings));

		$(`#GexStatSettingsBox`).fadeToggle('fast', function () {
			$(this).remove();
			GexStat.ShowTabContent(GexStat.CurrentStatGroup, GexStat.CurrentGexWeek);
		});
	},


	InitSettings: () => {

		let Settings = JSON.parse(localStorage.getItem('GexStatStatSettings'));

		if (!Settings)
		{
			return;
		}

		GexStatStat.Settings.deleteOlderThan = (Settings.deleteOlderThan !== undefined) ? Settings.deleteOlderThan : GexStatStat.Settings.deleteOlderThan;

	},


	showPreloader: (id) => {

		if (!$('#gexs-loading-data').length)
		{
			$(id).append('<div id="gexs-loading-data"><div class="loadericon"></div></div>');
		}

	},


	hidePreloader: () => {

		$('#gexs-loading-data').fadeOut(600, function () {
			$(this).remove();
		});

	},

}