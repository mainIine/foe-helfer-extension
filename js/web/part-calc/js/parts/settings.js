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
	 * Builds the settings dialog of the own part calculator box: custom percent
	 * buttons plus the display options. In the combined view it delegates to the
	 * cost calculator settings while its content is shown.
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
			buttons,
			defaults = Parts.DefaultButtons,
			sB = localStorage.getItem('CustomPartCalcButtons'),
			allGB = localStorage.getItem('ShowOwnPartOnAllGBs') || 'false',
			showMedals = localStorage.getItem('OwnPartShowMedals') || 'true',
			showPrints = localStorage.getItem('OwnPartShowBP') || 'true',
			minView = localStorage.getItem('OwnPartMinView') || 'false',
			autoOpen = localStorage.getItem('OwnPartAutoOpen'),
			includeStart = localStorage.getItem('OwnPartIncludeStart') || 'true',
			nV = `<p class="new-row text-center bbd p5 flex gap"><label>${i18n('Boxes.Calculator.Settings.newValue')}:</label> <input type="number" class="settings-values" style="width:30px"> <span class="btn btn-green btn-slim" onclick="Parts.SettingsInsertNewRow()">+</span></p>`;
		
		if(sB) {
			buttons = JSON.parse(sB);

			buttons = buttons.filter((item, index) => buttons.indexOf(item) === index); // remove duplicates
			buttons.sort((a, b) => a - b); // order
		}
		else {
			buttons = defaults;
		}

		c.push('<section class="flex gap p2">');
		buttons.forEach(bonus => {
			if(bonus === 'ark') 
				c.push(`<span class="btn-group"><input type="hidden" class="settings-values" value="ark"> <button class="btn btn-slim br">${MainParser.ArkBonus}%</button></span>`);
			
			else 
				c.push(`<span class="btn-group"><button class="btn btn-slim">${bonus}%</button> <input type="hidden" class="settings-values" value="${bonus}"> <span class="btn btn-delete btn-slim" onclick="Parts.SettingsRemoveRow(this)">x</span></span>`);
			
		});
		c.push('</section>');

		c.push(nV);

		c.push(`<p class="bbd p5">
				<input type="checkbox" id="autoOpen" class="autoOpen game-cursor" ${((autoOpen == 'true') ? 'checked' : '')}> <label for="autoOpen">${i18n('Settings.ShowOwnPartAutoOpen.Desc')}</label><br>
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
	 * Appends another "new value" input row to this settings dialog.
	 */
	SettingsInsertNewRow: ()=> {
		let nV = `<p class="new-row">${i18n('Boxes.Calculator.Settings.newValue')}: <input type="number" class="settings-values" style="width:30px"> <span class="btn btn-green" onclick="Parts.SettingsInsertNewRow()">+</span></p>`;

		// only within the own settings dialog, the cost calculator settings can be open at the same time
		$(nV).insertAfter( $('#OwnPartBoxSettingsBox .new-row:eq(-1)') );
	},


	/**
	 * Removes a custom percent button from this settings dialog.
	 *
	 * @param {HTMLElement} $this - The clicked delete button
	 */
	SettingsRemoveRow: ($this)=> {
		$($this).closest('.btn-group').fadeToggle('fast', function() {
			$(this).remove();
		});
	},


	/**
	 * Saves all values of the own part settings dialog and re-renders the box.
	 * Reads only from #OwnPartBoxSettingsBox, the cost calculator settings can
	 * be open at the same time in split view.
	 */
	SettingsSaveValues: ()=> {
		// read only from the own settings dialog, the cost calculator settings can be open at the same time
		let $settings = $('#OwnPartBoxSettingsBox'),
			values = [];

		$settings.find('.settings-values').each(function() {
			let v = $(this).val().trim();

			if(v) {
				if(v !== 'ark')
					values.push( parseFloat(v) );
				else
					values.push(v);
			}
		});

		localStorage.setItem('CustomPartCalcButtons', JSON.stringify(values));

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
