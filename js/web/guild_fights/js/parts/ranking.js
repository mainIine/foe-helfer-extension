/*
 * ************************************************************************************
 *
 *  Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 *  You may use, distribute and modify this code under the
 *  terms of the AGPL license.
 *
 *  See file LICENSE.md or go to
 *  https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 *  for full license details.
 *
 *  *************************************************************************************
 *
 */

let GuildRanking = {

	/**
	 * Builds the content of the guild ranking tab.
	 *
	 * Lists all battleground participants sorted by their current victory points,
	 * including guild colour, name, member count and the number of provinces
	 * they currently hold. The own guild is highlighted.
	 *
	 * @returns {string[]} Array of HTML strings for the tab content
	 */
	BuildTab: () => {
		let content = [],
			participants = [...Guild_fights.MapData.battlegroundParticipants]
				.sort((a, b) => (b.victoryPoints || 0) - (a.victoryPoints || 0)),
			provinceCounts = {};

		Guild_fights.MapData.map.provinces.forEach(province => {
			if (province.ownerId === undefined) return;
			provinceCounts[province.ownerId] = (provinceCounts[province.ownerId] || 0) + 1;
		});

		content.push('<div id="ranking"><table class="foe-table">');
		content.push('<thead><tr>');
		content.push('<th class="tdmin">#</th>');
		content.push('<th>' + i18n('Boxes.GuildFights.Guild') + '</th>');
		content.push('<th class="text-center">' + i18n('Boxes.GuildFights.Members') + '</th>');
		content.push('<th class="text-center">' + i18n('Boxes.GuildFights.Provinces') + '</th>');
		content.push('<th class="text-center">VP</th>');
		content.push('</tr></thead><tbody>');

		participants.forEach((participant, index) => {
			let color = Guild_fights.SortedColors ? Guild_fights.SortedColors.find(c => c.id === participant.participantId) : null;

			content.push(`<tr${participant.clan.id === ExtGuildID ? ' class="mark-guild"' : ''}>`);
			content.push(`<td class="tdmin">${index + 1}.</td>`);
			content.push(`<td><span class="province-color" style="background-color:${color?.main || '#555'}"></span> <b>${participant.clan.name}</b></td>`);
			content.push(`<td class="text-center">${participant.clan.membersNum || 0}</td>`);
			content.push(`<td class="text-center">${provinceCounts[participant.participantId] || 0}</td>`);
			content.push(`<td class="text-center">${HTML.Format(participant.victoryPoints || 0)}</td>`);
			content.push('</tr>');
		});

		content.push('</tbody></table></div>');

		return content;
	},
};
