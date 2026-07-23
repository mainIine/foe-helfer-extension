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

// Copy dialog of the own part calculator box (OwnPartBoxBackgroundBody) —
// split out of part-calc.js. Loaded after part-calc.js via the "parts"
// mechanism in js/internal.json, so it can safely extend the existing Parts object.
Object.assign(Parts, {

	/**
	 * Builds the copy dialog (OwnPartBoxBackgroundBody) of the own part calculator:
	 * preview of the copy string, player/building name inputs, the include options
	 * and the place selection checkboxes. Restores per-GB settings when enabled.
	 */
	CalcBackgroundBody: () => {
		let h = [],
			$OwnPartBox = $('#OwnPartBox'),
			EntityID = Parts.CurrentGB.Entity['cityentity_id'];
		let SavedBuildingName = localStorage.getItem(Parts.GetStorageKey('CopyGBName', Parts.CurrentGB.Entity['cityentity_id']));
		$OwnPartBox.find('.OwnPartBoxBackgroundBody').remove();

		let isOpen = false;
		if($('#OwnPartBox').hasClass('gbSettingsOpen')) 
			isOpen = true;

		if (SavedBuildingName !== null) {
			Parts.CopyBuildingName = SavedBuildingName;
		}
		else {
			Parts.CopyBuildingName = MainParser.CityEntities[EntityID]['name'];
		}

		if (localStorage.getItem(Parts.GetStorageKey('CopyFormatPerGB', null)) === 'true') {
			let SavedCopyIncludeDanger = localStorage.getItem(Parts.GetStorageKey('CopyIncludeDanger', Parts.CurrentGB.Entity['cityentity_id']));
			if (SavedCopyIncludeDanger !== null) {
				Parts.CopyIncludeDanger = (SavedCopyIncludeDanger === 'true');
			}
			else {
				Parts.CopyIncludeDanger = false;
			}

			let SavedCopyDangerPrefix = localStorage.getItem(Parts.GetStorageKey('CopyDangerPrefix', Parts.CurrentGB.Entity['cityentity_id']));
			if (SavedCopyDangerPrefix !== null) {
				Parts.CopyDangerPrefix = SavedCopyDangerPrefix;
			}
			else {
				Parts.CopyDangerPrefix = '!!!';
			}

			let SavedCopyDangerSuffix = localStorage.getItem(Parts.GetStorageKey('CopyDangerSuffix', Parts.CurrentGB.Entity['cityentity_id']));
			if (SavedCopyDangerSuffix !== null) {
				Parts.CopyDangerSuffix = SavedCopyDangerSuffix;
			}
			else {
				Parts.CopyDangerSuffix = '';
			}

			let SavedCopyIncludePlayer = localStorage.getItem(Parts.GetStorageKey('CopyIncludePlayer', Parts.CurrentGB.Entity['cityentity_id']));
			if (SavedCopyIncludePlayer !== null) {
				Parts.CopyIncludePlayer = (SavedCopyIncludePlayer === 'true');
			}
			else {
				Parts.CopyIncludePlayer = true;
			}

			let SavedCopyIncludeGB = localStorage.getItem(Parts.GetStorageKey('CopyIncludeGB', Parts.CurrentGB.Entity['cityentity_id']));
			if (SavedCopyIncludeGB !== null) {
				Parts.CopyIncludeGB = (SavedCopyIncludeGB === 'true');
			}
			else {
				Parts.CopyIncludeGB = true;
			}

			let SavedCopyIncludeLevel = localStorage.getItem(Parts.GetStorageKey('CopyIncludeLevel', Parts.CurrentGB.Entity['cityentity_id']));
			if (SavedCopyIncludeLevel !== null) {
				Parts.CopyIncludeLevel = (SavedCopyIncludeLevel === 'true');
			}
			else {
				Parts.CopyIncludeLevel = true;
			}

			let SavedCopyIncludeFP = localStorage.getItem(Parts.GetStorageKey('CopyIncludeFP', Parts.CurrentGB.Entity['cityentity_id']));
			if (SavedCopyIncludeFP !== null) {
				Parts.CopyIncludeFP = (SavedCopyIncludeFP === 'true');
			}
			else {
				Parts.CopyIncludeFP = true;
			}

			let SavedCopyIncludeOwnPart = localStorage.getItem(Parts.GetStorageKey('CopyIncludeOwnPart', Parts.CurrentGB.Entity['cityentity_id']));
			if (SavedCopyIncludeOwnPart !== null) {
				Parts.CopyIncludeOwnPart = (SavedCopyIncludeOwnPart === 'true');
			}
			else {
				Parts.CopyIncludeOwnPart = false;
			}

			let SavedCopyPreP = localStorage.getItem(Parts.GetStorageKey('CopyPreP', Parts.CurrentGB.Entity['cityentity_id']));
			if (SavedCopyPreP !== null) {
				Parts.CopyPreP = (SavedCopyPreP === 'true');
			}
			else {
				Parts.CopyPreP = true;
			}

			let SavedCopyDescending = localStorage.getItem(Parts.GetStorageKey('CopyDescending', Parts.CurrentGB.Entity['cityentity_id']));
			if (SavedCopyDescending !== null) {
				Parts.CopyDescending = (SavedCopyDescending === 'true');
			}
			else {
				Parts.CopyDescending = true;
			}
		}

		if (Parts.CopyModeAll) {
			for (let i = 0; i < 5; i++) {
				Parts.CopyPlaces[i] = true;
			}
		}
		else if (Parts.CopyModeAuto) {
			for (let i = 0; i < 5; i++) {
				Parts.CopyPlaces[i] = (Parts.SafePlaces.includes(i));
			}
		}
		else if (Parts.CopyModeAutoUnsafe) {
			for (let i = 0; i < 5; i++) {
				Parts.CopyPlaces[i] = (Parts.PlaceAvailables[i]);
			}
		}

		let PlayerID = Parts.CurrentGB.Entity['player_id'];

		Parts.CopyPlayerName = (PlayerID === ExtPlayerID ? Parts.CopyOwnPlayerName : PlayerDict[PlayerID]['PlayerName']);

		h.push('<span class="icon-close"></span>');
		h.push('<section class="p5">');
		h.push('<strong>' + i18n('Boxes.OwnpartCalculator.Preview') + '</strong><br>');
		Parts.CopyString = Parts.GetCopyString();
		h.push('<input type="text" id="copystring" value="' + Parts.CopyString + '">');
		
		h.push('</section>');

		h.push('<section class="p2">');
		if (PlayerID === ExtPlayerID) {
			h.push('<div class="flex between"><span>' + i18n('Boxes.OwnpartCalculator.PlayerName') + ':</span><input type="text" id="player-name" value="' + Parts.CopyPlayerName + '"></div>');
		}
		else {
			h.push('<div><span>' + i18n('Boxes.OwnpartCalculator.PlayerName') + ':</span>' + Parts.CopyPlayerName + '</div>');
		}
		h.push('<div class="flex between"><span>' + i18n('Boxes.OwnpartCalculator.BuildingName') + ':</span><input type="text" id="build-name" value="' + (Parts.CopyBuildingName) + '"></div>');
		h.push('</section>');

		h.push('<section class="p2">');
		h.push('<strong>' + i18n('Boxes.OwnpartCalculator.IncludeData') + '</strong>');
		let Options = '<div class="checkboxes">' +
			'<label class="form-check-label game-cursor" for="options-player"><input type="checkbox" class="form-check-input" id="options-player" data-options="player" ' + (Parts.CopyIncludePlayer ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsPlayer') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-gb"><input type="checkbox" class="form-check-input" id="options-gb" data-options="gb" ' + (Parts.CopyIncludeGB ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsGB') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-level"><input type="checkbox" class="form-check-input" id="options-level" data-options="level" ' + (Parts.CopyIncludeLevel ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsLevel') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-fp"><input type="checkbox" class="form-check-input" id="options-fp" data-options="fp" ' + (Parts.CopyIncludeFP ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsFP') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-descending"><input type="checkbox" class="form-check-input" id="options-descending" data-options="descending" ' + (Parts.CopyDescending ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsDescending') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-levelup"><input type="checkbox" class="form-check-input" id="options-levelup" data-options="levelup" ' + (Parts.CopyIncludeLevelString ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsLevelUp') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-ownpart"><input type="checkbox" class="form-check-input" id="options-ownpart" data-options="ownpart" ' + (Parts.CopyIncludeOwnPart ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsOwnPart') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-prep"><input type="checkbox" class="form-check-input" id="options-prep" data-options="prep" ' + (Parts.CopyPreP ? 'checked' : '') + '> <span>P(xx)</span></label>' +
			'<label class="form-check-label game-cursor" for="options-danger"><input type="checkbox" class="form-check-input" id="options-danger" data-options="danger" ' + (Parts.CopyIncludeDanger ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsDanger') + '</span></label>' +
			'</div>';

		h.push(Options)

		if (Parts.CopyIncludeDanger) {
			let DangerOptions = '<strong>' + i18n('Boxes.OwnpartCalculator.OptionsDanger') + '</strong>' +
			'<div><span>' + i18n('Boxes.OwnpartCalculator.OptionsDangerPrefix') + ':</span><input type="text" class="form-text-input" id="options-danger-prefix" data-options="danger-prefix" value="' + Parts.CopyDangerPrefix + '"></div>' +
			'<div><span>' + i18n('Boxes.OwnpartCalculator.OptionsDangerSuffix') + ':</span><input type="text" class="form-text-input" id="options-danger-suffix" data-options="danger-suffix" value="' + Parts.CopyDangerSuffix + '"></div>';

			h.push(DangerOptions);
		}
		h.push('</section><section class="p2">');
		h.push('<strong>' + i18n('Boxes.OwnpartCalculator.Places') + '</strong>');

		let cb = '<div class="checkboxes">' +
			'<label class="form-check-label game-cursor" for="chain-p1"><input type="checkbox" class="form-check-input" id="chain-p1" data-place="1" ' + (Parts.CopyPlaces[0] ? 'checked' : '') + '> <span>1</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-p2"><input type="checkbox" class="form-check-input" id="chain-p2" data-place="2" ' + (Parts.CopyPlaces[1] ? 'checked' : '') + '> <span>2</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-p3"><input type="checkbox" class="form-check-input" id="chain-p3" data-place="3" ' + (Parts.CopyPlaces[2] ? 'checked' : '') + '> <span>3</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-p4"><input type="checkbox" class="form-check-input" id="chain-p4" data-place="4" ' + (Parts.CopyPlaces[3] ? 'checked' : '') + '> <span>4</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-p5"><input type="checkbox" class="form-check-input" id="chain-p5" data-place="5" ' + (Parts.CopyPlaces[4] ? 'checked' : '') + '> <span>5</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-all"><input type="checkbox" class="form-check-input" id="chain-all" data-place="all" ' + (Parts.CopyModeAll ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.All') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-auto"><input type="checkbox" class="form-check-input" id="chain-auto" data-place="auto" ' + (Parts.CopyModeAuto ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.Auto') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-auto-unsafe"><input type="checkbox" class="form-check-input" id="chain-auto-unsafe" data-place="auto-unsafe" ' + (Parts.CopyModeAutoUnsafe ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.AutoWithUnsafe') + '</span></label>' +
		'</div>';

		h.push(cb);
		h.push('</section>')
		h.push('<div class="btn-outer text-center" style="margin-top: 10px">');
		h.push('<span class="btn button-own">' + i18n('Boxes.OwnpartCalculator.CopyValues') + '</span> ');
		if (Parts.CurrentGB.Entity['player_id'] === ExtPlayerID) 
			h.push('<span class="btn button-save-own">' + i18n('Boxes.OwnpartCalculator.Note') + '</span>'); 
		h.push('</div>');

		$OwnPartBox.append( $('<div class="OwnPartBoxBackgroundBody settingsbox-wrapper" />').append(h.join('')) );
		if (isOpen)
			$('.OwnPartBoxBackgroundBody').show();

		$('.OwnPartBoxBackgroundBody .icon-close').bind('click', function() {
			$('.OwnPartBoxBackgroundBody').fadeToggle();
			$('#OwnPartBox').toggleClass('gbSettingsOpen');
		});
	},


	/**
	 * Builds the copy string for the currently shown GB from the current copy settings.
	 *
	 * @returns {string} The formatted copy string
	 */
	GetCopyString: () => {
		return Parts.GetCopyStringEx(Places=Parts.CopyPlaces, Maezens=Parts.Maezens, Level=Parts.Level, OwnPart=Parts.RemainingOwnPart, PlaceAll=Parts.CopyModeAll, PlaceAuto=Parts.CopyModeAuto, PlaceAutoUnsafe=Parts.CopyModeAutoUnsafe, DangerPlaces=Parts.DangerPlaces, LeveltLG=Parts.LeveltLG)
	},


	/**
	 * Builds a copy string from explicit data (also used by the power leveling box).
	 * Which pieces are included is controlled by the Parts.CopyInclude* settings.
	 *
	 * @param {boolean[]} Places - The places (P1-P5) to include
	 * @param {number[]} Maezens - FP values of the places
	 * @param {number} Level - Current level of the GB
	 * @param {number} OwnPart - Remaining own part of the owner
	 * @param {boolean} PlaceAll - "all" place mode is active
	 * @param {boolean} PlaceAuto - "auto" place mode is active (safe places only)
	 * @param {boolean} PlaceAutoUnsafe - "auto with unsafe" place mode is active
	 * @param {number[]} DangerPlaces - Endangered FP per place (> 0 = place in danger)
	 * @param {boolean[]} LeveltLG - true per place if paying it would level the GB
	 * @returns {string} The formatted copy string
	 */
	GetCopyStringEx: (Places, Maezens, Level, OwnPart, PlaceAll, PlaceAuto, PlaceAutoUnsafe, DangerPlaces, LeveltLG) => {
		let Ret = [];

		if (Parts.CopyIncludeDanger && Parts.CopyDangerPrefix !== '' && (DangerPlaces.find(e => e > 5) || LeveltLG.find(e => e))) Ret.push(Parts.CopyDangerPrefix);

		if (Parts.CopyIncludePlayer) Ret.push(Parts.CopyPlayerName);

		if (Parts.CopyIncludeGB) Ret.push(Parts.CopyBuildingName);

		if (Parts.CopyIncludeLevelString) Ret.push(i18n('Boxes.OwnpartCalculator.OptionsLevelUp'));

		if (Parts.CopyIncludeLevel) Ret.push(Level + '→' + (Level + 1));

		let NoPlacesSelected = true;
		for (let i = 0; i < 5; i++) {
			if (Places[i]) NoPlacesSelected = false;
		}

		if (!NoPlacesSelected) {
			for (let i = 0; i < 5; i++) {
				let Place = (Parts.CopyDescending ? 5 - i - 1 : i);

				if (!Places[Place]) continue;
				if (PlaceAll && Maezens[Place] === 0) continue;
				
				if (Parts.CopyIncludeFP) {
					Ret.push((Parts.CopyPreP ? 'P' : '') + (Place + 1) + '(' + Maezens[Place] + ')');
				}
				else {
					Ret.push((Parts.CopyPreP ? 'P' : '') + (Place + 1));
				}

				if (Parts.CopyIncludeDanger && Parts.CopyDangerSuffix !== '' && (DangerPlaces[Place] > 5 || LeveltLG[Place])) Ret.push(Parts.CopyDangerSuffix);
			}
		}
		else if (PlaceAuto) {
			Ret.push(i18n('Boxes.OwnpartCalculator.NoPlaceSafe'));
		}
		else if (PlaceAutoUnsafe) {
			Ret.push(i18n('Boxes.OwnpartCalculator.NoPlaceAvailable'));
		}
		
		if (Parts.CopyIncludeOwnPart) Ret.push(i18n('Boxes.OwnpartCalculator.OwnPartShort') + '(' + OwnPart + ')');

		return Ret.join(' ');
	},


	/**
	 * Handles the "copy values" and "note" buttons: stores the current copy string
	 * per GB and returns all noted strings; a plain copy clears the note list.
	 *
	 * @param {jQuery} Event - The clicked button
	 * @param {string} Action - 'copy' returns and clears the list, 'save' only notes the GB
	 * @returns {string} All noted copy strings joined by newlines
	 */
	CopyFunction: (Event, Action) => {
		let CopyString = $('#copystring').val();
	
		$(Event).removeClass('btn-green');

		$('.OwnPartBoxBackgroundBody').fadeToggle();
		$('#OwnPartBox').toggleClass('gbSettingsOpen');

		Parts.CopyStrings[Parts.CurrentGB.Entity['cityentity_id']] = CopyString;

		let Copy = "";
		let Keys = Object.keys(Parts.CopyStrings);
		for (let i = 0; i < Keys.length; i++) {
			let Key = Keys[i];
			Copy += Parts.CopyStrings[Key];
			if (i < Keys.length) Copy += '\n';
		}

		if (Action === 'copy') {
			Parts.CopyStrings = {}; // delete list
		}

		return Copy;
	},
});
