/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
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
		GexStat.GexData = data.responseData; // Store GEX data for cost calculations
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
	Chart: undefined,
	TrailCosts: null,
	GexData: null,
	Settings: {
		deleteOlderThan: 20,
		showAxisLabel: true,
		chartSeries: ['points', 'encounters', 'member', 'participants', 'rank'],
		showRoundLimit: 10,
		exportLimit: 10
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

			$('#gexsContentWrapper').attr('class', 'default');
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

				let rankdata = ranking.reduce(function (res, obj) {
					res[obj.participantId] = {};
					res[obj.participantId].rank = obj.rank;
					res[obj.participantId].points = obj.points;
					return res;
				}, {});

				let currentGuildRank = rankdata[ExtGuildID] && rankdata[ExtGuildID].rank ? rankdata[ExtGuildID].rank : 0;

				participants.forEach(guild => {

					if (rankingdata[guild.id] === undefined)
					{
						rankingdata[guild.id] = {};
					}

					rankingdata[guild.id].guildId = guild.id;
					rankingdata[guild.id].worldId = guild.worldId;
					rankingdata[guild.id].name = guild.name;
					rankingdata[guild.id].level = guild.level;
					rankingdata[guild.id].worldrank = guild.rank;
					rankingdata[guild.id].flag = guild.flag.toLowerCase();
					rankingdata[guild.id].memberCount = guild.memberCount;
					rankingdata[guild.id].trophies = guild.trophies;
					rankingdata[guild.id].worldName = guild.worldName
					rankingdata[guild.id].rank = rankdata[guild.id].rank;
					rankingdata[guild.id].points = rankdata[guild.id].points;

				});

				await GexStat.db.ranking.put({
					gexweek: gexid,
					participants: Object.values(rankingdata),
					currentGuildID: ExtGuildID,
					currentGuildRank: currentGuildRank,
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
				let activeMembers = 0;

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
						partdata[k].solvedEncounters = data[k].solvedEncounters || 0;
						partdata[k].trial = data[k].currentTrial || 0;

						sumExpeditionPoints += data[k].expeditionPoints ? data[k].expeditionPoints : 0;
						sumEncounters += data[k].solvedEncounters || 0;
						activeMembers = partdata[k].expeditionPoints !== 0 ? activeMembers + 1 : activeMembers;
					}
				}

				await GexStat.db.participation.put({
					gexweek: gexid,
					participation: Object.values(partdata),
					expeditionPoints: sumExpeditionPoints,
					solvedEncounters: sumEncounters,
					countMember: countMember,
					activeMembers: activeMembers,
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

		for (let x = 0; x < GexPaticipants.length; x++)
		{
			const participant = GexPaticipants[x];
			let points = parseInt(participant.points);
			let progressWidth = points >= 100 ? 100 : points;
			let rankClass = participant.rank <= 3 ? participant.rank : 0;
			let stripedClass = points > 100 ? ' glow' : '';

			h.push(`<tr>`);
			h.push(`<td class="td-rank"><span class="winner-rank rank-${rankClass}"><span>${participant.rank}</span></span></td>`);
			h.push(`<td>` +
				`<div class="clanflag"><img alt="" src="${srcLinks.get('/shared/clanflags/' + participant.flag + '.jpg', true)}" /></div>` +
				`<div class="claninfo"><span class="clanname">${MainParser.GetGuildLink(participant['guildId'], participant['name'], participant['worldId'])}</span><br /> ` +
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
			$('#gexsContentWrapper').html(h.join(''));
			return;
		}

		const participation = GexParticipation.participation.sort(function (a, b) {
			return a.rank - b.rank;
		});
		let sEncounters = GexParticipation.solvedEncounters;
		if (isNaN(sEncounters)) {
			sEncounters = 0
			for (let x = 0; x < participation.length; x++)	{
				sEncounters += participation[x].solvedEncounters || 0;
			}
		}
		let base = gexweek > 1680501600 ? 64 : 48;
		let aEncounters = GexParticipation.countMember * base;
		let processing = Number((sEncounters / aEncounters) * 100).toFixed(2);

		h.push(`<div class="participation_overview justify-content-between"><div>${i18n('Boxes.GexStat.Points')}<br />${HTML.Format(GexParticipation.expeditionPoints)}</div>` +
			`<div class="text-center">${i18n('Boxes.GexStat.Member')}<br />${GexParticipation.countMember}</div>` +
			`<div class="text-right">${i18n('Boxes.GexStat.Encounters')}<br />${sEncounters}/${aEncounters} ( ${processing}% )</div>` +
			`</div>`);

		h.push(`<table id="gexsParticipationTable" class="foe-table">` +
			`<thead class="sticky"><tr class="sorter-header">` +
			`<th class="text-center is-number" data-type="gexs-group">#</th>` +
			`<th class="text-center is-number" data-type="gexs-group"><span class="level"></span></th>` +
			`<th class="case-sensitive" data-type="gexs-group">${i18n('Boxes.GexStat.Player')}</th>` +
			`<th class="is-number" data-type="gexs-group">${i18n('Boxes.GexStat.Points')}</th>` +
			`<th class="is-number" data-type="gexs-group">${i18n('Boxes.GexStat.Level')}</th>` +
			`<th class="is-number" data-type="gexs-group">${i18n('Boxes.GexStat.Encounters')}</th>` +
			`<th class="is-number" data-type="gexs-group">${i18n('Boxes.GexStat.GexTrial')}</th>` +
			`</tr></thead>` +
			`<tbody class="gexs-group">`);

		for (let x = 0; x < participation.length; x++)
		{
			const member = participation[x];
			let level = Math.ceil((member.solvedEncounters || 0) / 16);
			let encounterClass = ' level' + level;
			h.push(`<tr>`);
			h.push(`<td class="text-center is-number" data-number="${member.rank}">${member.rank}</td>`);
			h.push(`<td class="text-center is-number" data-number="${level}"><span class="level${encounterClass}" title="${HTML.i18nTooltip(i18n('Boxes.GexStat.Level') + ' ' + level)}"></span></td>`);
			h.push(`<td class="case-sensitive" data-text="${helper.str.cleanup(member.name)}">` +
				`<div class="avatar"><img src="${srcLinks.GetPortrait(member.avatar)}" /></div>` +
				`<div class="membername">${MainParser.GetPlayerLink(member.player_id, member.name)}</div></td>`);
			h.push(`<td class="is-number" data-number="${member.expeditionPoints}">${HTML.Format(member.expeditionPoints)}</td>`);
			h.push(`<td class="is-number" data-number="${level}">${level}</td>`);
			h.push(`<td class="is-number" data-number="${member.solvedEncounters||0}">${member.solvedEncounters||0}/${base}</td>`);
			h.push(`<td class="is-number" data-number="${member.trial||0}">${member.trial||0}</td>`);

			h.push(`</tr>`);

		}

		h.push('</tbody></table>');

		$('#gexsContentWrapper').html(h.join('')).promise().done(function () {
			GexStat.hidePreloader('#GexStat');
			$('#gexsParticipationTable').tableSorter();
		});

	},


	ShowCourse: async () => {

		GexStat.showPreloader("#GexStat");
		GexStat.InitSettings();
		GexStat.CurrentStatGroup = 'Course';
		$('#gexs_weekswitch').slideUp();
		$('#gexsContentWrapper').addClass('chart');

		let CourseData = {
			allMemberData: [],
			pointsData: [],
			rankData: [],
			encounterData: [],
			weeks: [],
			activeMemberData: [],
			pointSum: 0
		};

		let GexParticipation = await GexStat.db.participation.reverse().limit(GexStat.Settings.showRoundLimit).toArray();
		let GexRanking = await GexStat.db.ranking.reverse().limit(GexStat.Settings.showRoundLimit).toArray();

		if ((!GexParticipation || !GexParticipation.length) && (!GexRanking || !GexRanking.length))
		{
			GexStat.hidePreloader("#GexStat");
			$('#gexsContentWrapper').html(`<div class="no-data"><p>${i18n('Boxes.GexStat.ParticipationNoData')}</p></div>`);
			return;
		}

		let data = [...[GexRanking, GexParticipation].reduce((m, a) => (a.forEach(o => m.has(o.gexweek) && Object.assign(m.get(o.gexweek), o) || m.set(o.gexweek, o)), m), new Map).values()];
		data.sort(function (a, b) { return a.gexweek - b.gexweek });

		for (let x = 0; x < data.length; x++)
		{
			const gexweek = data[x];
			let hasParticipation = true;
			let hasParticipants = true;

			CourseData.weeks.push(moment(gexweek.gexweek * 1000).format(i18n('Date')));
			CourseData.pointSum += gexweek.expeditionPoints !== undefined ? gexweek.expeditionPoints : 0;
			CourseData.pointsData.push(gexweek.expeditionPoints !== undefined ? gexweek.expeditionPoints : null);
			CourseData.encounterData.push(gexweek.solvedEncounters !== undefined ? gexweek.solvedEncounters : null);
			CourseData.allMemberData.push(gexweek.countMember !== undefined ? gexweek.countMember : null);

			if (!gexweek.participation && !gexweek.activeMembers) { CourseData.activeMemberData.push(null); hasParticipation = false; }
			if (!gexweek.participants && !gexweek.currentGuildRank) { CourseData.rankData.push(null); hasParticipants = false; }

			if (!gexweek.activeMembers && hasParticipation)
			{
				let count = gexweek.participation.filter(function (solved) {
					return solved.solvedEncounters > 0;
				}).length;

				CourseData.activeMemberData.push(count);
				// Update DB
				await GexStat.db.participation.update(gexweek.gexweek, { activeMembers: count });
			}
			else if (hasParticipation)
			{
				CourseData.activeMemberData.push(gexweek.activeMembers);
			}

			if (!gexweek.currentGuildRank && hasParticipants)
			{
				let rankdata = gexweek.participants.filter(function (d) {
					return d.guildId === ExtGuildID;
				});

				CourseData.rankData.push(rankdata[0].rank);
				//Update DB
				await GexStat.db.ranking.update(gexweek.gexweek, { currentGuildRank: rankdata[0].rank });
			}
			else if (hasParticipants)
			{
				CourseData.rankData.push(gexweek.currentGuildRank);
			}

		}
		//console.log(CourseData);

		// to prevent double include of Highcharts get it from Stats module
		await Stats.loadHighcharts();

		const series = await GexStat.GetChartSeries(CourseData);

		GexStat.Chart = new Highcharts.chart('gexsContentWrapper', {

				title: {
					text: i18n('Boxes.GexStat.Gex') + ' ' + i18n('Boxes.GexStat.Rounds')
				},
				subtitle: {
					text: CourseData.weeks[0] + ' - ' + CourseData.weeks[CourseData.weeks.length - 1] +
						' (' + CourseData.weeks.length + ' ' + i18n('Boxes.GexStat.Rounds') + ')'
				},
				yAxis: [{
					allowDecimals: false,
					labels: {
						enabled: (GexStat.Settings.showAxisLabel && series.yaxis.includes(0)),
					},
					title: {
						enabled: (GexStat.Settings.showAxisLabel && series.yaxis.includes(0)),
						text: i18n('Boxes.GexStat.Points'),
					}
				}, {
					allowDecimals: false,
					title: {
						enabled: (GexStat.Settings.showAxisLabel && series.yaxis.includes(1)),
						text: i18n('Boxes.GexStat.Member') + ' / ' + i18n('Boxes.GexStat.Participant'),
					},
					labels: {
						enabled: (GexStat.Settings.showAxisLabel && series.yaxis.includes(1)),
					},
					opposite: true
				},
					{
						allowDecimals: false,
						labels: {
							enabled: (GexStat.Settings.showAxisLabel && series.yaxis.includes(2)),
						},
						title: {
							enabled: (GexStat.Settings.showAxisLabel && series.yaxis.includes(2)),
							text: i18n('Boxes.GexStat.Encounters'),
						},
					},
					{
						allowDecimals: false,
						labels: {
							enabled: false,
						},
						title: {
							enabled: false
						},
						reversed: true
					}],
				xAxis: {
					categories: CourseData.weeks,
					crosshair: true,
				},
				legend: {
					layout: 'vertical',
					align: 'right',
					verticalAlign: 'middle'
				},
				plotOptions: {
					column: {
						grouping: false,
						shadow: false,
						borderWidth: 0
					},
					series: {
						label: {
							connectorAllowed: false
						}
					}
				},
				series: series.data,
				tooltip: {
					shared: true
				},
				exporting: {
					enabled: false
				},
				responsive: {
					rules: [{
						condition: {
							maxWidth: 800
						},
						chartOptions: {
							legend: {
								align: 'center',
								verticalAlign: 'bottom',
								layout: 'horizontal'
							},
						}
					}]
				}
			},
			function (chart) {

				GexStat.hidePreloader();

				$('#GexStat').on('resize', function () {
					GexStat.showPreloader('#GexStat');
					chart.setSize($(this).find('#gexsContentWrapper').width(), $(this).find('#gexsContentWrapper').height(),
						GexStat.hidePreloader())
				});
			}
		);
	},


	ShowTabContent: (StatGroup, week) => {

		if ($('#GexStatSettingsBox').length) { $('#GexStatSettingsBox').remove(); }

		switch (StatGroup)
		{
			case 'Ranking':
				GexStat.Show(week);
				break;
			case 'Participation':
				GexStat.ShowParticipation(week);
				break;
			case 'Course':
				GexStat.ShowCourse();
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
				GexStat.GexWeeks.sort(function (a, b) { return b - a });
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
		h.push(`<li${GexStat.CurrentStatGroup === 'Course' ? ' class="active"' : ''}><a class="toggle-statistic" data-value="Course"><span>${i18n('Boxes.GexStat.Course')}</span></a></li>`);
		h.push(`</ul>`);
		h.push(`</div>`);

		if (gexweek && GexStat.GexWeeks && GexStat.GexWeeks.length)
		{

			let index = GexStat.GexWeeks.indexOf(gexweek);
			let previousweek = GexStat.GexWeeks[index + 1] || null;
			let nextweek = GexStat.GexWeeks[index - 1] || null;

			GexStat.CurrentGexWeek = gexweek;

			h.push(`<div id="gexs_weekswitch" class="weekswitch dark-bg" data-group="${GexStat.CurrentStatGroup}">${i18n('Boxes.GexStat.Gex')} ${i18n('Boxes.GexStat.Week')} <button class="btn btn-set-week" data-week="${previousweek}"${previousweek === null ? ' disabled' : ''}>&lt;</button> `);
			h.push(`<select id="gexs-select-gexweek">`);

			GexStat.GexWeeks.forEach(week => {
				h.push(`<option value="${week}"${gexweek === week ? ' selected="selected"' : ''}>` + moment.unix(week - 518400).format(i18n('Date')) + ` - ` + moment.unix(week).format(i18n('Date')) + `</option>`);
			});

			h.push(`</select>`);
			h.push(`<button class="btn btn-set-week" data-week="${nextweek}"${nextweek === null ? ' disabled' : ''}>&gt;</button>`);
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
		let showRounds = [3, 5, 10, 15, 20, 25, 30];
		let exportLimits = [1, 2, 3, 5, 10, 15, 20, 25, 30];
		let Settings = GexStat.Settings;

		c.push(`<p class="text-left"><span class="settingtitle">${i18n('Boxes.GexStat.General')}</span>${i18n('Boxes.GexStat.DeleteDataOlderThan')} <select id="gexsDeleteOlderThan" name="deleteolderthan">`);
		deleteAfterWeeks.forEach(weeks => {
			let option = '';
			if (weeks === 0) { option = i18n('Boxes.GexStat.Never'); }
			else { option = weeks + ' ' + i18n('Boxes.GexStat.Weeks'); }

			c.push(`<option value="${weeks}" ${Settings.deleteOlderThan === weeks ? ' selected="selected"' : ''}>${option}</option>`);
		});

		c.push(`</select>`);
		c.push(`<hr><p class="text-left"><span class="settingtitle">${i18n('Boxes.GexStat.Course')}</span>` +
			`<input id="gmsShowAxisLabel" name="showaxislabel" value="1" type="checkbox" ${(Settings.showAxisLabel) ? ' checked="checked"' : ''} /> <label for="gmsShowAxisLabel">${i18n('Boxes.GexStat.ShowAxisLabel')}</label>` +
			`</p>` +
			`<p class="text-left"><input id="gmsShowChartPoints" name="showchartenpoints" value="1" type="checkbox" ${(Settings.chartSeries.includes('points')) ? ' checked="checked"' : ''} /> <label for="gmsShowChartPoints"><i>${i18n('Boxes.GexStat.Points')}</i></label><br />` +
			`<input id="gmsShowChartEncounters" name="showchartencounters" value="1" type="checkbox" ${(Settings.chartSeries.includes('encounters')) ? ' checked="checked"' : ''} /> <label for="gmsShowChartEncounters"><i>${i18n('Boxes.GexStat.Encounters')}</i></label><br />` +
			`<input id="gmsShowChartMember" name="showchartmember" value="1" type="checkbox" ${(Settings.chartSeries.includes('member')) ? ' checked="checked"' : ''} /> <label for="gmsShowChartMember"><i>${i18n('Boxes.GexStat.Member')}</i></label><br />` +
			`<input id="gmsShowChartParticipants" name="showchartparticipants" value="1" type="checkbox" ${(Settings.chartSeries.includes('participants')) ? ' checked="checked"' : ''} /> <label for="gmsShowChartParticipants"><i>${i18n('Boxes.GexStat.Participant')}</i><br /></label>` +
			`<input id="gmsShowChartRank" name="showchartrank" value="1" type="checkbox" ${(Settings.chartSeries.includes('rank')) ? ' checked="checked"' : ''} /> <label for="gmsShowChartRank"><i>${i18n('Boxes.GexStat.Rank')}</i></label>` +
			`</p>`);
		c.push(`<p class="text-left">${i18n('Boxes.GexStat.CompareLast')} <select id="gexsShowRoundLimit" name="showroundlimit">`);
		showRounds.forEach(round => {
			let option = round + ' ' + i18n('Boxes.GexStat.Rounds');
			c.push(`<option value="${round}" ${Settings.showRoundLimit === round ? ' selected="selected"' : ''}>${option}</option>`);
		});

		c.push(`</select></p>`);
		c.push(`<hr><p class="text-left"><span class="settingtitle">${i18n('Boxes.General.Export')}</span>` +
			`${i18n('Boxes.GexStat.ExportLast')} <select id="gexsExportLimit" name="exportlimit">`);
		exportLimits.forEach(round => {
			let option = round + ' ' + i18n('Boxes.GexStat.Rounds');
			c.push(`<option value="${round}" ${Settings.exportLimit === round ? ' selected="selected"' : ''}>${option}</option>`);
		});
		c.push(`</select></p>`);

		let disabledExport = '';
		if (GexStat.CurrentStatGroup === 'Course') { disabledExport = ' disabled'; }

		c.push(`<p class="text-left"><button class="btn" onclick="GexStat.ExportContent('${GexStat.CurrentStatGroup}','csv')" title="${HTML.i18nTooltip(i18n('Boxes.General.ExportCSV'))}"${disabledExport}>CSV</button>` +
			`<button class="btn" onclick="GexStat.ExportContent('${GexStat.CurrentStatGroup}','json')" title="${HTML.i18nTooltip(i18n('Boxes.General.ExportJSON'))}"${disabledExport}>JSON</button></p>`);
		c.push(`<hr><p><button id="save-GexStat-settings" class="btn" style="width:100%" onclick="GexStat.SettingsSaveValues()">${i18n('Boxes.GexStat.Save')}</button></p>`);
		$('#GexStatSettingsBox').html(c.join(''));

	},


	SettingsSaveValues: async () => {

		let tmpDeleteOlder = parseInt($('#gexsDeleteOlderThan').val());
		let showRoundLimit = parseInt($('#gexsShowRoundLimit').val());
		let exportLimit = parseInt($('#gexsExportLimit').val());

		if (GexStat.Settings.deleteOlderThan !== tmpDeleteOlder && tmpDeleteOlder > 0)
		{
			GexStat.showPreloader('#GexStat');

			await GexStat.DeleteOldData(tmpDeleteOlder);
		}

		GexStat.Settings.deleteOlderThan = tmpDeleteOlder;
		GexStat.Settings.showRoundLimit = showRoundLimit;
		GexStat.Settings.exportLimit = exportLimit;
		GexStat.Settings.showAxisLabel = $("#gmsShowAxisLabel").is(':checked') ? true : false;

		let chartSeries = GexStat.Settings.chartSeries = [];

		if ($("#gmsShowChartPoints").is(':checked')) { chartSeries.push('points'); }
		if ($("#gmsShowChartEncounters").is(':checked')) { chartSeries.push('encounters'); }
		if ($("#gmsShowChartMember").is(':checked')) { chartSeries.push('member'); }
		if ($("#gmsShowChartParticipants").is(':checked')) { chartSeries.push('participants'); }
		if ($("#gmsShowChartRank").is(':checked')) { chartSeries.push('rank'); }

		// if nothing is selected, set series to default
		if (!chartSeries.length) { chartSeries.push('points', 'encounters', 'member', 'participants', 'rank') }

		localStorage.setItem('GexStatSettings', JSON.stringify(GexStat.Settings));

		$(`#GexStatSettingsBox`).fadeToggle('fast', function () {
			$(this).remove();
			if (GexStat.Chart !== undefined)
			{
				GexStat.Chart.destroy();
			}
			GexStat.ShowTabContent(GexStat.CurrentStatGroup, GexStat.CurrentGexWeek);
		});
	},


	InitSettings: () => {

		let Settings = JSON.parse(localStorage.getItem('GexStatSettings'));

		if (!Settings)
		{
			return;
		}

		for (const k in Settings)
		{
			if (!Settings.hasOwnProperty(k) ||
				!GexStat.Settings.hasOwnProperty(k)) { continue; }

			GexStat.Settings[k] = Settings[k];
		}
	},


	GetChartSeries: async (data) => {

		const buildZones = function (data) {

			let zones = [],
				i = -1, len = data.length, current, previous, dashStyle, value;

			while (data[++i] === null);
			zones.push({
				value: i
			});

			while (++i < len)
			{
				previous = data[i - 1];
				current = data[i];
				dashStyle = '';

				if (previous !== null && current === null)
				{
					dashStyle = 'solid';
					value = i - 1;
				} else if (previous === null && current !== null)
				{
					dashStyle = 'dot';
					value = i;
				}

				if (dashStyle)
				{
					zones.push({
						dashStyle: dashStyle,
						value: value
					});
				}
			}

			return zones;
		}

		const chartSeries = {
			points: { name: i18n('Boxes.GexStat.Points'), zones: buildZones(data.pointsData), zoneAxis: 'x', connectNulls: true, data: data.pointsData, color: '#DDDF0D', yAxis: 0, zIndex: 3 },
			encounters: { gridLineWidth: 0, zones: buildZones(data.encounterData), zoneAxis: 'x', connectNulls: true, name: i18n('Boxes.GexStat.Encounters'), data: data.encounterData, color: '#7798BF', zIndex: 3, yAxis: 2 },
			member: { type: 'column', name: i18n('Boxes.GexStat.Member'), data: data.allMemberData, color: '#55bf3b', pointPadding: 0.3, pointPlacement: -0.2, yAxis: 1, zIndex: 1 },
			participants: { type: 'column', name: i18n('Boxes.GexStat.Participant'), data: data.activeMemberData, color: '#DF5353', pointPadding: 0.4, pointPlacement: -0.2, yAxis: 1, zIndex: 2 },
			rank: { name: i18n('Boxes.GexStat.Rank'), zones: buildZones(data.rankData), zoneAxis: 'x', connectNulls: true, data: data.rankData, color: '#d6dae0', yAxis: 3, marker: { symbol: 'square' }, dataLabels: { enabled: true }, zIndex: 2 }
		}

		let series = { data: [], yaxis: [] };

		GexStat.Settings.chartSeries.forEach(v => {
			series.data.push(chartSeries[v]);
			if (!series.yaxis.includes(chartSeries[v].yAxis))
			{
				series.yaxis.push(chartSeries[v].yAxis);
			}
		});

		return series;
	},


	// yvi
	ExportContent: async (content, type) => {

		let exportLimit = $('#gexsExportLimit').length ? parseInt($('#gexsExportLimit').val()) : GexStat.Settings.exportLimit;
		let exportData = [];
		let FileContent = '';

		if (!content || !type || isNaN(exportLimit))
		{
			return;
		}

		switch (content)
		{
			case 'Ranking':
				let Ranking = await GexStat.db.ranking.reverse().limit(exportLimit).toArray();
				if (!Ranking) { return; }
				exportData.push(['gexWeek', 'guildID', 'guildName', 'guildWorld', 'guildLevel', 'guildMember', 'result', 'rank']);

				Ranking.sort((a, b) => a.gexweek - b.gexweek).forEach(gexweek => {
					if (!gexweek.gexweek || !gexweek.participants) { return; }
					let participants = gexweek.participants;
					let weekdate = moment(gexweek.gexweek * 1000).format(i18n('Date'));

					participants.sort((a, b) => a.rank - b.rank).forEach(participant => {
						exportData.push([weekdate, participant.guildId, participant.name, participant.worldName, participant.level, participant.memberCount, participant.points + '%', participant.rank]);
					});
				});
				break;

			case 'Participation':
				let Participation = await GexStat.db.participation.reverse().limit(exportLimit).toArray();
				if (!Participation) { return; }
				exportData.push(['gexWeek', 'player ID', 'player', 'expeditionPoints', 'solvedEncounters', 'rank', 'trial']);
				Participation.sort((a, b) => a.gexweek - b.gexweek).forEach(gexweek => {
					let participation = gexweek.participation;
					let weekdate = moment(gexweek.gexweek * 1000).format(i18n('Date'));
					participation.sort((a, b) => a.rank - b.rank).forEach(participant => {
						exportData.push([weekdate, participant.player_id, participant.name, participant.expeditionPoints, participant.solvedEncounters, participant.rank, participant.trial||0]);
					});
				});
				break;

			case 'Course':
				return;
		}

		if (!exportData.length) { return; }

		let filetype = "text/csv;charset=utf-8";

		for (let i = 0; i < exportData.length; i++)
		{
			let value = exportData[i];

			for (let j = 0; j < value.length; j++)
			{
				let innerValue = value[j] === null || value[j] === undefined ? '' : value[j].toString();
				let result = innerValue.replace(/"/g, '""');
				if (result.search(/("|,|\n)/g) >= 0)
					result = '"' + result + '"';
				if (j > 0)
					FileContent += ';';
				FileContent += result;
			}

			FileContent += '\r\n';
		}
		let BOM = "\uFEFF";

		if (type === 'json')
		{
			FileContent = GexStat.CsvToJson(FileContent);
			filetype = "text/json;charset=utf-8";
		}

		let Blob1 = new Blob([BOM + FileContent], { type: filetype });
		MainParser.ExportFile(Blob1, content + '.' + type);

		$('#GexStatSettingsBox').fadeToggle('fast', function () {
			$(this).remove();
		});

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


	CsvToJson: (csv) => {

		let lines = csv.split("\r\n");
		let result = [];
		let headers = lines[0].split(";");

		for (let i = 1; i < lines.length - 1; i++)
		{
			let obj = {};
			let currentline = lines[i].split(";");

			for (let j = 0; j < headers.length; j++)
			{
				obj[headers[j]] = currentline[j];
			}

			result.push(obj);
		}

		return JSON.stringify(result);
	},
}

FoEproxy.addFoeHelperHandler('ResourcesUpdated', () => {
	GExAttempts.setCount(ResourceStock.guild_expedition_attempt || 0)
});

FoEproxy.addHandler('ResourceService', 'getPlayerAutoRefills', (data, postData) => {
	GExAttempts.setNext(data.responseData.resources.guild_expedition_attempt)
});

FoEproxy.addHandler('GuildExpeditionService', 'getOverview', (data, postData) => {
	if (data.responseData) GExAttempts.updateState(data.responseData)
});

FoEproxy.addHandler('GuildExpeditionNotificationService', 'GuildExpeditionStateNotification', (data, postData) => {
	if (data.responseData) GExAttempts.updateState(data.responseData)
});

FoEproxy.addHandler('GuildExpeditionService', 'getState', (data, postData) => {
	for (let x of data.responseData) {
		if (!x.currentEntityId) continue;
		GExAttempts.state.GEprogress = x.currentEntityId;
		localStorage.setItem('GEx.state',JSON.stringify(GExAttempts.state))
		GExAttempts.refreshGUI()
	}
});

FoEproxy.addHandler('GuildExpeditionService', 'changeDifficulty', (data, postData) => {
	if (data.responseData) GExAttempts.updateState(data.responseData)
});

let GExAttempts = {
	count:0,
	next:null,
	state: JSON.parse(localStorage.getItem('GEx.state'))||{
		GEprogress:0,
		active:true,
		deactivationTime:null,
		activationTime:null
	},
	deactivationTimer:null,
	activationTimer:null,
	last:null,

	refreshGUI:()=>{
		//hidenumber when GE completed, not running or out of attempts
		if (GExAttempts.state.GEprogress === 159 || GExAttempts.count === 0 || !GExAttempts.state.active) {
			$('#gex-attempt-count').hide();
		}
		//setnumber when GE running
		else {
			$('#gex-attempt-count').text(GExAttempts.count).show();
		}

		//set timer for GE deactivation if deactivation time known
		if (!GExAttempts.deactivationTimer && GExAttempts.state.deactivationTime && GExAttempts.state.active) {
			GExAttempts.deactivationTimer = setTimeout(() => {
				GExAttempts.state.active = false
				GExAttempts.state.activationTime = GExAttempts.state.deactivationTime + 86400
				GExAttempts.state.deactivationTime = null
				GExAttempts.deactivationTimer = null
				GExAttempts.state.GEprogress = 0
				localStorage.setItem('GEx.state',JSON.stringify(GExAttempts.state))
				GExAttempts.refreshGUI()
			}, (GExAttempts.state.deactivationTime-GameTime.get()) * 1000);
		}

		//set timer for GE activation if activation time known
		if (!GExAttempts.activationTimer && GExAttempts.state.activationTime && !GExAttempts.state.active) {
			GExAttempts.activationTimer = setTimeout(() => {
				GExAttempts.state.active = true
				GExAttempts.state.deactivationTime = GExAttempts.state.activationTime + 604800
				GExAttempts.state.activationTime = null
				GExAttempts.activationTimer = null
				localStorage.setItem('GEx.state',JSON.stringify(GExAttempts.state))
				GExAttempts.refreshGUI()
			}, (GExAttempts.state.activationTime-GameTime.get()) * 1000);
		}

	},

	setCount:(n)=>{
		GExAttempts.count = n
		GExAttempts.refreshGUI()
	},

	setNext:(time)=>{
		let timer=3600000

		if (time) {
			timer = (time-GameTime.get()+3600)*1000
			GExAttempts.last = time
		} else {
			let amount = Math.floor((moment().unix() - GExAttempts.last + 100)/3600)
			GExAttempts.setCount(Math.min(GExAttempts.count + amount,8))
			GExAttempts.last += 3600*amount
			timer = (GExAttempts.last - moment().unix() + 3600)*1000
		}

		if (GExAttempts.next) clearTimeout(GExAttempts.next)

		GExAttempts.next = setTimeout(GExAttempts.setNext,timer)

	},

	checkNext:()=>{
		if (moment()<GExAttempts.next) return
		GExAttempts.setNext()
		GExAttempts.setCount(Math.min(GExAttempts.count+1,8))
	},

	updateState:(data) =>{
		GExAttempts.state.active = data.state === "active"

		if (GExAttempts.state.active) {
			GExAttempts.state.deactivationTime = data.nextStateTime || null
			GExAttempts.state.activationTime = null
			GExAttempts.state.GEprogress = data.progress?.currentEntityId || 0
		} else {
			GExAttempts.state.activationTime = data.nextStateTime || null
			GExAttempts.state.deactivationTime = null
			GExAttempts.state.GEprogress = 0
		}

		localStorage.setItem('GEx.state', JSON.stringify(GExAttempts.state))
		GExAttempts.refreshGUI()

	}
}

let GexStockWarning = {
	check: (stock,costs) => {
		let min = JSON.parse(localStorage.getItem('GexStockWarningMin')||"100");
		if (min == 100) return
		let parts = []
		for (let [res,amount] of Object.entries(costs)) {
			parts.push({
				resource:res, 
				part: Math.round(amount/(stock[res]||0.1)*10000)/100
			})
		}
		parts = parts.sort((a,b)=>
			b.part-a.part
		)
		parts = parts.slice(0,10)
		
		if (parts[0].part <= min) return
		
		if ($('#GexStockWarning').length === 0)	{
			HTML.Box({
				id: 'GexStockWarning',
				title: i18n('Settings.GexStockWarning.Title'),
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize: true,
			});
			HTML.AddCssFile('gexstat');
		}
		let h = `<table class="foe-table">`
		for (let part of parts) {
			h+=`<tr>
			<td>${srcLinks.icons(part.resource)}</td>
			<td>${GoodsData[part.resource].name} (${i18n("Eras."+Technologies.Eras[GoodsData[part.resource].era]+".short")})</td>
			<td>${part.part}%</td>
			</tr>`
		}
		h+=`</table>`
		
		$('#GexStockWarningBody').html(h);

	}
}
FoEproxy.addHandler("GuildExpeditionService","getUnlockCosts",(data,postData)=>{
	GexStockWarning.check (data.responseData.treasuryResources.resources,data.responseData.unlockCosts.resources)
})
