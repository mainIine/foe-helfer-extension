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

				let CopyParts = Parts.GetCopyStringEx(Places=[true, true, true, true, true], Maezens=Parts.PowerLevelingData.Places[gb_level], Level=gb_level, OwnPart=Parts.PowerLevelingData.EigenNettos[gb_level], PlaceAll=true, PlaceAuto=false, PlaceAutoUnsafe=false, DangerPlaces=[0, 0, 0, 0, 0], LeveltLG=[false, false, false, false, false]);
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
	 * the total FP per level, the FP of the five patron spots, the own part
	 * (gross and net) and the double collection of FP producing GBs.
	 *
	 * @returns {{HasDoubleCollection: boolean, Places: number[][], CityEntity: object, OwnPartSum: number, StartLevel: number, EndLevel: number, EigenBruttos: number[], DoubleCollections: number[], EigenNettos: number[]}}
	 */
	CalcBodyPowerLevelingData: () => {
		let EntityID = Parts.CurrentGB.Entity['cityentity_id'],
			CityEntity = MainParser.CityEntities[EntityID],
			EraName = GreatBuildings.GetEraName(EntityID),
			Era = Technologies.Eras[EraName],
			StartLevel = Parts.PowerLevelingStartLevel,
			EndLevel = (GreatBuildings.Rewards[Era] ? Math.min(Parts.PowerLevelingEndLevel, GreatBuildings.Rewards[Era].length) : 0);

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

		let OwnPartSum = 0;

		for (let i = StartLevel; i < EndLevel; i++) {
			// How many FPs are needed in total to level the GB
			if (i < 10) {
				Totals[i] = CityEntity['strategy_points_for_upgrade'][i];
			}
			else {
				Totals[i] = Math.ceil(CityEntity['strategy_points_for_upgrade'][9] * Math.pow(1.025, i - 9));
			}

			// How many FPs are needed for each spot.
			// For non-current levels, calculate the FPs for each spot...
			if (i != Parts.Level) {
				Places[i] = GreatBuildings.GetMaezen(GreatBuildings.Rewards[Era][i], Parts.ArcPercents)

				EigenBruttos[i] = Totals[i] - Places[i][0] - Places[i][1] - Places[i][2] - Places[i][3] - Places[i][4]
			}
			// ...and for the current, it's already calculated
			else {
				Places[i] = Parts.CurrentMaezens;
				
				EigenBruttos[i] = Parts.RemainingOwnPart;
			}
			
			let FPGreatBuilding = GreatBuildings.GreatBuildingsData.find(obj => (obj.ID === EntityID && obj.FPProductions));
			if (FPGreatBuilding && !['X_FutureEra_Landmark1','X_AllAge_Expedition'].includes(EntityID)) { //FP produzierende LGs ohne Arche
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
			CityEntity,
			OwnPartSum,
			StartLevel,
			EndLevel,
			EigenBruttos,
			DoubleCollections,
			EigenNettos
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
			StartLevel,
			EndLevel,
			EigenBruttos,
			DoubleCollections,
			EigenNettos
		} = Parts.PowerLevelingData;



		for (let i = StartLevel; i < EndLevel; i++) {
			h.push('<tr>');
			h.push('<td class="bright" style="white-space:nowrap">' + i + ' → ' + (i + 1) + '</td>');
			h.push('<td><span class="hidden-text"> - #1 (</span>' + HTML.Format(Places[i][0]) + '<span class="hidden-text">)</span></td>');
			h.push('<td class="text-light"><span class="hidden-text"> - #2 (</span>' + HTML.Format(Places[i][1]) + '<span class="hidden-text">)</span></td>');
			h.push('<td><span class="hidden-text"> - #3 (</span>' + HTML.Format(Places[i][2]) + '<span class="hidden-text">)</span></td>');
			h.push('<td class="text-light"><span class="hidden-text"> - #4 (</span>' + HTML.Format(Places[i][3]) + '<span class="hidden-text">)</span></td>');
			h.push('<td><span class="hidden-text"> - #5 (</span>' + HTML.Format(Places[i][4]) + '<span class="hidden-text">)</span></td>');
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

			tableBody.innerHTML = h.join('');

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
			CityEntity,
			OwnPartSum,
			StartLevel,
			EndLevel,
		} = Parts.PowerLevelingData;

		let h = [];
		h.push('<div class="dark-bg" style="margin-bottom:3px;padding: 5px;">');
		h.push('<h1 class="text-center">' + CityEntity['name'] + '</h1>')

		h.push('<div class="d-flex justify-content-center">');
		h.push('<div style="margin: 5px 10px 0 0;">' + i18n('Boxes.PowerLeveling.StartLevel') + ': <input type="number" id="startLevel" step="1" min=0" max="1000" value="' + StartLevel + '"></div>');
		h.push('<div style="margin: 5px 10px 0 0;">' + i18n('Boxes.PowerLeveling.EndLevel') + ': <input type="number" id="endLevel" step="1" min=10" max="1000" value="' + EndLevel + '"></div>');
		h.push('<div>' + i18n('Boxes.PowerLeveling.OwnPartSum') +': <strong class="info" id="PowerLevelingBoxOwnPartSum">'+ HTML.Format(MainParser.round(OwnPartSum)) + '</strong></div>')
		h.push('</div>');
		h.push('</div>');

		h.push('<table class="foe-table">');

		h.push('<thead class="sticky">');
		h.push('<tr>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.Level') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P1') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P2') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P3') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P4') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P5') + '</th>');
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
