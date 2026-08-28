
/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', () => {
	// Closes the box when the player navigates back to the city
	HTML.CloseOpenBox('mapScoutingTimesDialog');
});

FoEproxy.addMetaHandler('castle_system_levels', (data) => {
	const resp = JSON.parse(data['response']);
	let castlebonus = 1;

	for (const level of resp) {
		if (!level['level']) continue;

		for (const boost of level.permanentRewards.BronzeAge) {
			if (boost.subType !== 'army_scout_time') continue;

			castlebonus = 1 - boost.amount / 100;
		}

		scoutingTimes.castleBonuses[level['level']] = castlebonus;
	}
});

FoEproxy.addHandler('CampaignService', 'start', (data) => {
	// Is the box enabled in the settings?
	if (!Settings.GetSetting('ShowScoutingTimes')) {
		return;
	}

	const provinces = data.responseData.provinces;
	const maxShip = Math.floor(Object.values(provinces).map(x => x.id || 0).pop() / 100);

	for (const province of provinces) {
		// Ship provinces connect to every later ship column on the map
		if (province.provinceType === 'ship') {
			province.parentIds = province.parentIds.concat(
				[...Array(maxShip - province.id / 100).keys()].map(x => (x + province.id / 100 + 1) * 100)
			);
		}
		scoutingTimes.Provinces[province.id || 0] = province;
	}

	scoutingTimes.scoutPosition = data.responseData.scout?.current_province | 0;
	scoutingTimes.scoutTarget = data.responseData.scout?.path[data.responseData.scout?.path?.length - 1] | 0;
	scoutingTimes.scoutTraveltime = data.responseData.scout.time_to_target;

	return scoutingTimes.ShowDialog();
});

FoEproxy.addHandler('CampaignService', 'getProvinceData', (data) => scoutingTimes.CheckSectors(data));

FoEproxy.addHandler('CampaignService', 'buySector', (data) => scoutingTimes.CheckSectors(data));

FoEproxy.addHandler('CampaignService', 'buyInstantScout', (data) => {
	// Is the box enabled in the settings?
	if (!Settings.GetSetting('ShowScoutingTimes')) {
		return;
	}

	scoutingTimes.Provinces[data.responseData.province.id].isScouted = true;

	return scoutingTimes.ShowDialog();
});

FoEproxy.addHandler('CampaignService', 'moveScoutToProvince', (data, postData) => {
	// Is the box enabled in the settings?
	if (!Settings.GetSetting('ShowScoutingTimes')) {
		return;
	}

	for (const resp of postData) {
		if (resp.requestMethod === 'moveScoutToProvince') {
			scoutingTimes.scoutTarget = resp.requestData[0][resp.requestData[0].length - 1];
			scoutingTimes.scoutTraveltime = data.responseData;
		}
	}

	return scoutingTimes.ShowDialog();
});

/**
 * Continent map scouting helper
 */
const scoutingTimes = {

	Provinces: {},
	castleBonuses: {},
	target: 0,
	scoutPosition: 0,
	scoutTarget: 0,
	scoutTraveltime: 0,


	/**
	 * Shows a box listing all currently scoutable provinces with cost and travel time
	 */
	ShowDialog: () => {
		const toscout = [];
		const castlebonus = ((Castle.curLevel | 0) > 0) ? scoutingTimes.castleBonuses[Castle.curLevel] : 1;

		for (const p in scoutingTimes.Provinces) {
			if (!Object.hasOwnProperty.call(scoutingTimes.Provinces, p)) continue;

			const province = scoutingTimes.Provinces[p];
			if (!province.isPlayerOwned) continue;

			for (const element of province.children) {
				const child = scoutingTimes.Provinces[element.targetId];
				if (!child || child.isPlayerOwned || toscout.includes(child.id)) continue;

				if (child.isScouted) {
					child.travelTime = 0;
				} else {
					if (!child.fromCurrent) {
						if (province.id === scoutingTimes.scoutPosition) {
							child.fromCurrent = true;
						}
						// Each intermediate province adds a fixed 10 minutes of travel
						child.travelTime = (element.travelTime + Math.max(scoutingTimes.distance(scoutingTimes.scoutPosition, child.id) - 1, 0) * 600) * castlebonus;
					}

					if (scoutingTimes.scoutTarget === child.id) {
						child.travelTime = scoutingTimes.scoutTraveltime;
						scoutingTimes.target = child.id;
					}
				}

				// A province only becomes scoutable once all of its blockers are owned
				const mayScout = child.blockers.every(blockId => scoutingTimes.Provinces[blockId]?.isPlayerOwned);
				if (mayScout) toscout.push(child.id);
			}
		}

		let i = 0;
		let htmltext = `<table class="foe-table"><tr><th>${i18n('Boxes.scoutingTimes.ProvinceName')}</th><th>${i18n('Boxes.scoutingTimes.ScoutingCost')}</th><th>${i18n('Boxes.scoutingTimes.ScoutingTime')}</th></tr>`;

		while (toscout.length > 0) {
			const p = toscout.pop();
			const province = scoutingTimes.Provinces[p];

			if (province.isScouted) {
				htmltext += `<tr class="scouted" title="${i18n('Eras.' + Technologies.Eras[province.era])}"><td>${province.name}</td><td></td><td></td></tr>`;
				i += 1;
			}
			if ((province.travelTime | 0) > 0) {
				i += 1;
				htmltext += `<tr title="${i18n('Eras.' + Technologies.Eras[province.era])}"><td>${province.name}</td>`;
				htmltext += (p === scoutingTimes.target)
					? `<td class="scouting">...<img src="${srcLinks.get("/city/gui/citymap_icons/tavern_shop_boost_scout_small_icon.png", true)}" alt="">...`
					: `<td><img src="${srcLinks.get("/shared/icons/money.png", true)}" alt=""> ${province.travelTime > 1 ? scoutingTimes.numberWithCommas(province.scoutingCost) : 0}</td>`;
				htmltext += `<td><img src="${srcLinks.get("/shared/icons/icon_time.png", true)}" alt=""> ${scoutingTimes.format(province.travelTime)}</td></tr>`;
			}
		}

		htmltext += `</table>`;

		if (i === 0) return;

		if ($('#mapScoutingTimesDialog').length === 0) {
			HTML.AddCssFile('scoutingtimes');

			HTML.Box({
				id: 'mapScoutingTimesDialog',
				title: i18n('Boxes.scoutingTimes.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				ask: i18n('Boxes.scoutingTimes.HelpLink'),
				resize: true,
				settings: () => scoutingTimes.ShowSettings(),
			});
		}

		$('#mapScoutingTimesDialogBody').html(htmltext);
	},


	/**
	 * Formats a duration in seconds as "Xd Xh Xm"
	 *
	 * @param {number} time Duration in seconds
	 * @returns {string} Formatted duration
	 */
	format: (time) => {
		let min = Math.floor(time / 60);
		let hours = Math.floor(min / 60);
		const days = Math.floor(hours / 24);
		min %= 60;
		hours %= 24;

		let timestring = (days > 0) ? `${days}d ` : ``;
		timestring += (hours > 0) ? `${hours}h ` : ``;
		timestring += (min > 0 || min + hours + days === 0) ? `${min}m ` : ``;

		return timestring;
	},


	/**
	 * Formats a number with a thousand separator
	 *
	 * @param {number} x Number to format
	 * @returns {string} Formatted number
	 */
	numberWithCommas: (x) => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","),


	/**
	 * Calculates the number of hops between two provinces on the map
	 *
	 * @param {number} StartId Province id the scout currently sits on
	 * @param {number} GoalId Province id of the scouting target
	 * @returns {number} Number of provinces between start and goal
	 */
	distance: (StartId, GoalId) => {
		const limit = Math.floor(Math.min(StartId / 100, GoalId / 100)) * 100;
		const StartDist = scoutingTimes.GetDistances(StartId, limit);
		const GoalDist = scoutingTimes.GetDistances(GoalId, limit);

		let Distance = 1000;
		for (const index in GoalDist) {
			if (StartDist[index]) {
				const DistanceNew = GoalDist[index].dist + StartDist[index].dist;
				if (DistanceNew < Distance) Distance = DistanceNew;
			}
			if (Distance === 1) break;
		}

		return Distance;
	},


	/**
	 * Walks the parent chain of a province and collects the shortest distance to each ancestor
	 *
	 * @param {number} StartId Province id to start from
	 * @param {number} limit Lowest province id (map column) still to be visited
	 * @returns {object} Map of province id => {id, dist}
	 */
	GetDistances: (StartId, limit) => {
		const temp = [[StartId, 0]];
		const distx = {};

		for (const [id, dist] of temp) {
			if (id < limit) break;

			let isShorter = false;
			if (!distx[id] || distx[id].dist > dist) {
				distx[id] = { 'id': id, 'dist': dist };
				isShorter = true;
			}

			if (!scoutingTimes.Provinces[id]?.parentIds || !isShorter) continue;

			for (const parent of scoutingTimes.Provinces[id].parentIds) {
				temp.push([parent, dist + 1]);
			}
		}

		return distx;
	},


	/**
	 * Marks a province as owned once all of its sectors are taken and refreshes the box
	 *
	 * @param {object} data Response of getProvinceData/buySector
	 */
	CheckSectors: (data) => {
		// Is the box enabled in the settings?
		if (!Settings.GetSetting('ShowScoutingTimes')) {
			return;
		}

		const Id = data.responseData[0].provinceId;
		if (!data.responseData.every(sector => sector.isPlayerOwned)) return;

		scoutingTimes.Provinces[Id].isPlayerOwned = true;

		return scoutingTimes.ShowDialog();
	},


	/**
	 * Renders the settings pane of the box
	 */
	ShowSettings: () => {
		const autoOpen = Settings.GetSetting('ShowScoutingTimes');

		const h = [];
		h.push(`<p><label><input id="autoStartScout" type="checkbox"${(autoOpen === true) ? ' checked="checked"' : ''} />${i18n('Boxes.Settings.Autostart')}</label></p>`);
		h.push(`<p><button onclick="scoutingTimes.SaveSettings()" id="save-bghelper-settings" class="btn" style="width:100%">${i18n('Boxes.Settings.Save')}</button></p>`);

		$('#mapScoutingTimesDialogSettingsBox').html(h.join(''));
	},


	/**
	 * Persists the settings and closes the settings pane
	 */
	SaveSettings: () => {
		localStorage.setItem('ShowScoutingTimes', $("#autoStartScout").is(':checked'));
		$(`#mapScoutingTimesDialogSettingsBox`).remove();
	},

};
