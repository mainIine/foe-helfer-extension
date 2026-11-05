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

// Settings dialog of the own part calculator box (#OwnPartBoxSettingsBox) —
// split out of part-calc.js. Loaded after part-calc.js via the "parts"
// mechanism in js/internal.json, so it can safely extend the existing Parts object.
Object.assign(Parts, {

	/**
	 * Builds the settings dialog of the own part calculator box: the percent
	 * button editor plus the display options. In the combined view it delegates
	 * to the cost calculator settings while its content is shown.
	 */
	ShowCalculatorSettings: ()=> {
		// combined view: load the other calculators settings if its content is shown
		if (!Calculator.IsSplitView()) {
			let useThisCalculator = JSON.parse(localStorage.getItem('ShowOwnPartOnAllGBs'))
			if (!useThisCalculator && MainParser.CurrentGB.Entity?.player_id !== ExtPlayerID) {
				Calculator.ShowCalculatorSettings();
				return;
			}
		}

		let c = [],
			allGB = localStorage.getItem('ShowOwnPartOnAllGBs') || 'false',
			showMedals = localStorage.getItem('OwnPartShowMedals') || 'true',
			showPrints = localStorage.getItem('OwnPartShowBP') || 'true',
			minView = localStorage.getItem('OwnPartMinView') || 'false',
			autoOpen = localStorage.getItem('OwnPartAutoOpen'),
			// split view: name the box, the cost calculator has its own auto open setting
			autoOpenLabel = i18n('Settings.ShowOwnPartAutoOpen.Desc') + (Calculator.IsSplitView() ? ' (' + i18n('Boxes.OwnpartCalculator.Title') + ')' : ''),
			includeStart = localStorage.getItem('OwnPartIncludeStart') || 'true';

		// percent button editor, shared with the cost calculator
		c.push(Calculator.SettingsChipRows('CustomPartCalcButtons', Parts.DefaultButtons));

		c.push(`<p class="bbd p5">
				<input type="checkbox" id="autoOpen" class="autoOpen game-cursor" ${((autoOpen !== 'false') ? 'checked' : '')}> <label for="autoOpen">${autoOpenLabel}</label><br>
				<input type="checkbox" id="openonaliengb" class="openonaliengb game-cursor" ${((allGB == 'true') ? 'checked' : '')}> <label for="openonaliengb">${i18n('Settings.ShowOwnPartOnAllGBs.Desc')}</label><br>
				<input type="checkbox" id="showmedals" class="showmedals game-cursor" ${((showMedals == 'true') ? 'checked' : '')}> <label for="showmedals">${i18n('Settings.ShowOwnPartMedals.Desc')}</label><br>
				<input type="checkbox" id="showprints" class="showprints game-cursor" ${((showPrints == 'true') ? 'checked' : '')}> <label for="showprints">${i18n('Settings.ShowOwnPartBP.Desc')}</label><br>
				<input type="checkbox" id="minview" class="minview game-cursor" ${((minView == 'true') ? 'checked' : '')}> <label for="minview">${i18n('Settings.ShowOwnPartMinView.Desc')}</label><br>
				<input id="copyformatpergb" class="copyformatpergb game-cursor" ${(Parts.CopyFormatPerGB ? 'checked' : '')} type="checkbox"> <label for="copyformatpergb">${i18n('Boxes.OwnpartCalculator.CopyFormatPerGB')}</label><br>
				<input type="checkbox" id="includeStart" class="includeStart game-cursor" ${((includeStart == 'true') ? 'checked' : '')}> <label for="includeStart">${i18n('Settings.ShowOwnPartIncludeStart.Desc')}</label>
			</p>
			<p class="text-center p2">
				<button id="save-calculator-settings" class="btn btn-green" onclick="Parts.SettingsSaveValues()">${i18n('Boxes.Calculator.Settings.Save')}</button>
			</p>`);

		$('#OwnPartBoxSettingsBox').html(c.join(''));
	},


	/**
	 * Saves all values of the own part settings dialog and re-renders the box.
	 * Reads only from #OwnPartBoxSettingsBox, the cost calculator settings can
	 * be open at the same time in split view.
	 */
	SettingsSaveValues: ()=> {
		// read only from the own settings dialog, the cost calculator settings can be open at the same time
		let $settings = $('#OwnPartBoxSettingsBox');

		Calculator.SettingsSaveButtons($settings, 'CustomPartCalcButtons');

		let OldCopyFormatPerGB = Parts.CopyFormatPerGB;
		Parts.CopyFormatPerGB = $settings.find('.copyformatpergb').prop('checked');
		localStorage.setItem(Parts.GetStorageKey('CopyFormatPerGB', null), Parts.CopyFormatPerGB);

		let openforeignGB = true;
		if ($settings.find('#openonaliengb').is(':not(:checked)'))
			openforeignGB = false;
		localStorage.setItem('ShowOwnPartOnAllGBs',openforeignGB);

		let showMedals = true;
		if ($settings.find('#showmedals').is(':not(:checked)'))
			showMedals = false;
		localStorage.setItem('OwnPartShowMedals',showMedals);

		let showPrints = true;
		if ($settings.find('#showprints').is(':not(:checked)'))
			showPrints = false;
		localStorage.setItem('OwnPartShowBP',showPrints);

		let minView = true;
		if ($settings.find('#minview').is(':not(:checked)'))
			minView = false;
		localStorage.setItem('OwnPartMinView',minView);

		let autoOpen = true;
		if ($settings.find('#autoOpen').is(':not(:checked)'))
			autoOpen = false;
		localStorage.setItem('OwnPartAutoOpen',autoOpen);
		let includeStart = true;
		if ($settings.find('#includeStart').is(':not(:checked)'))
			includeStart = false;
		localStorage.setItem('OwnPartIncludeStart',includeStart);

		$settings.fadeToggle('fast', function(){
			$(this).remove();

			if (Parts.CopyFormatPerGB !== OldCopyFormatPerGB) Parts.FirstCycle = true;
			Parts.CalcBody();
		});
	},
});
