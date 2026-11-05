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

// Power leveling box (#PowerLevelingBox) — split out of part-calc.js.
// Loaded after part-calc.js via the "parts" mechanism in js/internal.json,
// so it can safely extend the existing Parts object.
Object.assign(Parts, {

	/**
	 * Opens (or updates) the power leveling box for the GB shown in the own part calculator.
	 *
	 * @param {boolean} event - true keeps an already open box and only refreshes its content
	 */
	ShowPowerLeveling: (event) => {
		Parts.BuildBoxPowerLeveling(event);
	},


	/**
	 * Creates the power leveling box in the DOM (including all input events) or
	 * closes it again when it is already open and no refresh was requested.
	 *
	 * @param {boolean} event - true keeps an already open box and only refreshes its content
	 */
	BuildBoxPowerLeveling: (event) => {
		if ($('#PowerLevelingBox').length === 0) {
			HTML.Box({
				'id': 'PowerLevelingBox',
				'title': i18n('Boxes.PowerLeveling.Title'),
				'auto_close': true,
				'dragdrop': true,
				'minimize': true,
			    active_maps:"main",
			});

			const box = $('#PowerLevelingBox');

			// Events on the `startLevel` input field
			box.on('blur', '#startLevel', function () {
				Parts.PowerLevelingStartLevel = parseFloat($('#startLevel').val());
				Parts.UpdateTableBodyPowerLeveling();
			});
			box.on('keydown', '#startLevel', function (e) {
				const key = e.key;
				const input = e.target;
				if (key === "ArrowUp") {
					Parts.PowerLevelingStartLevel = Number.parseInt(input.value) + 1;
					Parts.UpdateTableBodyPowerLeveling();
					e.preventDefault();
				} else if (key === "ArrowDown") {
					Parts.PowerLevelingStartLevel = Number.parseInt(input.value) - 1;
					Parts.UpdateTableBodyPowerLeveling();
					e.preventDefault();
				} else if (key === "Enter") {
					Parts.PowerLevelingStartLevel = Number.parseInt(input.value);
					Parts.UpdateTableBodyPowerLeveling();
				}
			});

			// Events on the `endLevel` input field
			box.on('blur', '#endLevel', function () {
				Parts.PowerLevelingEndLevel = parseFloat($('#endLevel').val());
				Parts.UpdateTableBodyPowerLeveling();
				//Parts.CalcBodyPowerLeveling();
			});
			box.on('keydown', '#endLevel', function (e) {
				const key = e.key;
				const input = e.target;
				if (key === "ArrowUp") {
					Parts.PowerLevelingEndLevel = Number.parseInt(input.value) + 1;
					Parts.UpdateTableBodyPowerLeveling();
					e.preventDefault();
				} else if (key === "ArrowDown") {
					Parts.PowerLevelingEndLevel = Number.parseInt(input.value) - 1;
					Parts.UpdateTableBodyPowerLeveling();
					e.preventDefault();
				} else if (key === "Enter") {
					Parts.PowerLevelingEndLevel = Number.parseInt(input.value);
					Parts.UpdateTableBodyPowerLeveling();
				}
			});

			// Event on the "Copy values" button in each row
			box.on('click', '.button-powerlevel-copy', function () {
				let gb_level = parseInt($(this).parent().find(".hidden-text").html());

				let PlaceCount = Parts.PowerLevelingData.Places[gb_level].length;
				let CopyParts = Parts.GetCopyStringEx(Places=Array(PlaceCount).fill(true), Maezens=Parts.PowerLevelingData.Places[gb_level], Level=gb_level, OwnPart=Parts.PowerLevelingData.EigenNettos[gb_level], PlaceAll=true, PlaceAuto=false, PlaceAutoUnsafe=false, DangerPlaces=Array(PlaceCount).fill(0), LeveltLG=Array(PlaceCount).fill(false));
				helper.str.copyToClipboardLegacy(CopyParts);
			});
		}
		else if (!event) {
			HTML.CloseOpenBox('PowerLevelingBox');
			return;
		}

		Parts.CalcBodyPowerLeveling();
	},


	/**
	 * Calculates the power leveling table data for the configured level range:
	 * the total FP per level, the FP of the patron spots (five, seven on gold
	 * tier levels), the own part (gross and net) and the double collection of
	 * FP producing GBs.
	 *
	 * @returns {{HasDoubleCollection: boolean, Places: number[][], PlaceCount: number, CityEntity: object, OwnPartSum: number, StartLevel: number, EndLevel: number, EigenBruttos: number[], DoubleCollections: number[], EigenNettos: number[], IsEstimated: boolean}}
	 */
	CalcBodyPowerLevelingData: () => {
		let EntityID = Parts.CurrentGB.Entity['cityentity_id'],
			CityEntity = MainParser.CityEntities[EntityID],
			EraName = GreatBuildings.GetEraName(EntityID),
			Era = Technologies.Eras[EraName],
			IsRework = GreatBuildings.IsRework(EntityID),
			// classic worlds end with the reward table, the prestige rework with the maximum level (capped to keep the table usable)
			MaxLevel = (IsRework ? Math.min(GreatBuildings.GetReworkMaxLevel(EntityID), 1000) : GreatBuildings.GetP1MaxLevel(Era)),
			StartLevel = Parts.PowerLevelingStartLevel,
			EndLevel = Math.min(Parts.PowerLevelingEndLevel, MaxLevel);

		// without a chosen end level the table of an uncapped gold building ends with the last bonus breakpoint
		if (IsRework && Parts.PowerLevelingEndLevel === 999999 && StartLevel < 500) EndLevel = Math.min(EndLevel, 500);

		// Limit minimum value for the power leveling range
		StartLevel = StartLevel < 0 ? 0 : StartLevel;
		EndLevel = EndLevel <= 0 ? 1 : EndLevel;

		// StartLevel must be a smaller number than EndLevel
		StartLevel = StartLevel >= EndLevel ? EndLevel - 1 : StartLevel;

		let Totals = [],
			Places = [],
			EigenBruttos = [],
			HasDoubleCollection = false,
			DoubleCollections = [],
			EigenNettos = [];

		let OwnPartSum = 0,
			PlaceCount = 5;

		// prestige rework: the FP production is a tier bonus of the metadata
		const ReworkFPBonus = (IsRework ? (CityEntity['bonuses'] || []).flatMap(Tier => Tier['bonuses'] || [])
			.find(Bonus => Bonus['type'] === 'strategy_points' && Bonus['bonusCategory']?.['value'] === 'productionBonus') : undefined);

		// arc percents per tier, gold tier level-ups have their own
		const ArcPercents = { false: Parts.GetArcPercents(false), true: Parts.GetArcPercents(true) };

		for (let i = StartLevel; i < EndLevel; i++) {
			// How many FPs are needed in total to level the GB
			Totals[i] = GreatBuildings.GetBruttoCosts(EntityID, i);

			// How many FPs are needed for each spot.
			// For non-current levels, calculate the FPs for each spot...
			// (the live values are also unusable when no level is open, e.g. a locked rework level)
			if (i != Parts.Level || !Number.isFinite(Parts.RemainingOwnPart)) {
				Places[i] = (Totals[i] !== undefined ? GreatBuildings.GetPatronRewards(EntityID, i, ArcPercents[Parts.IsGoldLevel(i)], Totals[i]) : undefined);

				// no cost or reward data from this level on: the table ends here
				if (!Places[i]) {
					delete Totals[i];
					delete Places[i];
					EndLevel = i;
					break;
				}

				EigenBruttos[i] = Totals[i] - Places[i].reduce((sum, fp) => sum + fp, 0)
			}
			// ...and for the current, it's already calculated
			else {
				Places[i] = Parts.CurrentMaezens;

				EigenBruttos[i] = Parts.RemainingOwnPart;
			}

			PlaceCount = Math.max(PlaceCount, Places[i].length);

			let FPGreatBuilding = (IsRework ? undefined : GreatBuildings.GreatBuildingsData.find(obj => (obj.ID === EntityID && obj.FPProductions)));
			if (ReworkFPBonus) {
				// prestige rework: FP production of the reached level from the bonus curve of the metadata
				HasDoubleCollection = true;
				DoubleCollections[i] = GreatBuildings.MetaBonusValue(ReworkFPBonus, i + 1);
			}
			else if (FPGreatBuilding && !['X_FutureEra_Landmark1','X_AllAge_Expedition'].includes(EntityID)) { //FP produzierende LGs ohne Arche
				HasDoubleCollection = true;
				if (i < FPGreatBuilding.FPProductions.length) {
					DoubleCollections[i] = FPGreatBuilding.FPProductions[i];
				}
				else {
					DoubleCollections[i] = MainParser.round(FPGreatBuilding.FPProductions[9] * (i + 1) / 10);
				}
			}
			else {
				HasDoubleCollection = false;
				DoubleCollections[i] = 0;
			}

			EigenNettos[i] = EigenBruttos[i] - DoubleCollections[i];
			OwnPartSum += EigenNettos[i];
		}

		return {
			HasDoubleCollection,
			Places,
			PlaceCount,
			CityEntity,
			OwnPartSum,
			StartLevel,
			EndLevel,
			EigenBruttos,
			DoubleCollections,
			EigenNettos,
			IsEstimated: (!IsRework && !GreatBuildings.Rewards[Era])
		};
	},


	/**
	 * Renders the table rows (one per level) from the precalculated Parts.PowerLevelingData.
	 *
	 * @param {string[]} h - Array the HTML strings are pushed into
	 */
	CalcTableBodyPowerLeveling: (h) => {
		const {
			HasDoubleCollection,
			Places,
			PlaceCount,
			StartLevel,
			EndLevel,
			EigenBruttos,
			DoubleCollections,
			EigenNettos
		} = Parts.PowerLevelingData;



		for (let i = StartLevel; i < EndLevel; i++) {
			h.push('<tr>');
			h.push('<td class="bright" style="white-space:nowrap">' + i + ' → ' + (i + 1) + '</td>');
			for (let Place = 0; Place < PlaceCount; Place++) {
				// copper tier levels have fewer reward places than the gold tier ones
				if (Places[i][Place] === undefined) {
					h.push('<td' + (Place % 2 ? ' class="text-light"' : '') + '></td>');
					continue;
				}
				h.push('<td' + (Place % 2 ? ' class="text-light"' : '') + '><span class="hidden-text"> - #' + (Place + 1) + ' (</span>' + HTML.Format(Places[i][Place]) + '<span class="hidden-text">)</span></td>');
			}
			if (HasDoubleCollection) {
				h.push('<td class="success no-select"><strong>' + HTML.Format(EigenBruttos[i]) + '</strong></td>');
				h.push('<td class="no-select">' + HTML.Format(MainParser.round(DoubleCollections[i])) + '</td>');
			}
			h.push('<td><strong class="info no-select">' + HTML.Format(MainParser.round(EigenNettos[i])) + '</strong></td>');
			h.push('<td><span class="hidden-text">' + i + '</span><span class="btn btn-slim button-powerlevel-copy">' + i18n('Boxes.PowerLeveling.CopyValues') + '</span></td>');
			h.push('</tr>');
		}
	},


	/**
	 * Recalculates the data and refreshes only the table body and the summary
	 * fields of an already open power leveling box (used by the level inputs).
	 */
	UpdateTableBodyPowerLeveling: () => {
		const tableBody = document.getElementById('PowerLevelingBoxTableBody');
		if (tableBody) {
			Parts.PowerLevelingData = Parts.CalcBodyPowerLevelingData();
			/** @type {string[]} */
			const h = [];

			Parts.CalcTableBodyPowerLeveling(h);

			$(tableBody).html(h.join(''));

			// Startlevel
			const startLevel = /** @type {HTMLInputElement} */(document.getElementById('startLevel'));
			if (startLevel.value != '' + Parts.PowerLevelingData.StartLevel) {
				startLevel.value = '' + Parts.PowerLevelingData.StartLevel;
			}
			Parts.PowerLevelingStartLevel = Parts.PowerLevelingData.StartLevel;

			// EndLevel
			const endLevel = /** @type {HTMLInputElement} */(document.getElementById('endLevel'));
			if (endLevel.value != '' + Parts.PowerLevelingData.EndLevel) {
				endLevel.value = '' + Parts.PowerLevelingData.EndLevel;
			}
			Parts.PowerLevelingEndLevel = Parts.PowerLevelingData.EndLevel;

			const ownPartSum = /** @type {HTMLElement} */(document.getElementById('PowerLevelingBoxOwnPartSum'));
			ownPartSum.innerText = HTML.Format(MainParser.round(Parts.PowerLevelingData.OwnPartSum));
		}
	},


	/**
	 * Builds the complete content of the power leveling box: header with the
	 * level range inputs, own part sum and the table for the configured range.
	 */
	CalcBodyPowerLeveling: () => {
		Parts.PowerLevelingData = Parts.CalcBodyPowerLevelingData();

		const {
			HasDoubleCollection,
			PlaceCount,
			CityEntity,
			OwnPartSum,
			StartLevel,
			EndLevel,
			IsEstimated,
		} = Parts.PowerLevelingData;

		let h = [];
		h.push('<div class="dark-bg" style="margin-bottom:3px;padding: 5px;">');
		h.push('<h1 class="text-center">' + CityEntity['name'] + '</h1>')

		h.push('<div class="d-flex justify-content-center">');
		h.push('<div style="margin: 5px 10px 0 0;">' + i18n('Boxes.PowerLeveling.StartLevel') + ': <input type="number" id="startLevel" step="1" min=0" max="1000" value="' + StartLevel + '"></div>');
		h.push('<div style="margin: 5px 10px 0 0;">' + i18n('Boxes.PowerLeveling.EndLevel') + ': <input type="number" id="endLevel" step="1" min=10" max="1000" value="' + EndLevel + '"></div>');
		h.push('<div>' + i18n('Boxes.PowerLeveling.OwnPartSum') +': <strong class="info" id="PowerLevelingBoxOwnPartSum">'+ HTML.Format(MainParser.round(OwnPartSum)) + '</strong></div>')
		h.push('</div>');
		if (IsEstimated) {
			h.push('<div class="text-center" style="margin-top:5px;"><em>' + i18n('Boxes.PowerLeveling.Estimated') + '</em></div>');
		}
		h.push('</div>');

		h.push('<table class="foe-table">');

		h.push('<thead class="sticky">');
		h.push('<tr>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.Level') + '</th>');
		for (let Place = 1; Place <= PlaceCount; Place++) {
			h.push('<th>' + i18n('Boxes.PowerLeveling.P' + Place) + '</th>');
		}
		if (HasDoubleCollection) {
			h.push('<th class="no-select">' + i18n('Boxes.PowerLeveling.OwnPartBrutto') + '</th>');
			h.push('<th class="no-select">' + i18n('Boxes.PowerLeveling.DoubleCollection') + '</th>');
		}
		h.push('<th class="no-select">' + i18n('Boxes.PowerLeveling.OwnPartNetto') + '</th>');
		h.push('<th></th>');
		h.push('</tr>');
		h.push('</thead>');

		h.push('<tbody id="PowerLevelingBoxTableBody">');
		Parts.CalcTableBodyPowerLeveling(h);
		h.push('</tbody>');

		h.push('</table>');

		$('#PowerLevelingBoxBody').html(h.join(''));
	},
});
