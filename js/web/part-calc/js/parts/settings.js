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
			sB = localStorage.getItem('CustomPartCalcButtons'),
			allGB = localStorage.getItem('ShowOwnPartOnAllGBs') || 'false',
			showMedals = localStorage.getItem('OwnPartShowMedals') || 'true',
			showPrints = localStorage.getItem('OwnPartShowBP') || 'true',
			minView = localStorage.getItem('OwnPartMinView') || 'false',
			autoOpen = localStorage.getItem('OwnPartAutoOpen'),
			includeStart = localStorage.getItem('OwnPartIncludeStart') || 'true',
			buttons = Calculator.SettingsSanitizeButtons(sB ? JSON.parse(sB) : Parts.DefaultButtons);

		c.push('<div class="percent-chips bbd">');
		buttons.forEach(bonus => c.push(Parts.SettingsChip(bonus)));

		// ghost chip to bring the arc bonus button back, hidden while it exists
		c.push(`<span class="percent-chip ghost" title="${i18n('Boxes.Calculator.Settings.AddArk')}" onclick="Parts.SettingsAddArk()"${buttons.includes('ark') ? ' style="display:none"' : ''}>+ ${MainParser.ArkBonus}%</span>`);

		c.push(`<span class="percent-add">
			<input type="number" class="percent-add-input" step="0.1" min="-100" max="200" placeholder="%" title="${i18n('Boxes.Calculator.Settings.newValue')}" onkeydown="if(event.key==='Enter'){Parts.SettingsAddValue();event.preventDefault();}">
			<span class="btn btn-green btn-slim" title="${i18n('Boxes.Calculator.Settings.newValue')}" onclick="Parts.SettingsAddValue()">+</span>
		</span>`);
		c.push('</div>');

		c.push(`<p class="bbd p5">
				<input type="checkbox" id="autoOpen" class="autoOpen game-cursor" ${((autoOpen !== 'false') ? 'checked' : '')}> <label for="autoOpen">${i18n('Settings.ShowOwnPartAutoOpen.Desc')}</label><br>
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
	 * Returns the markup of one percent chip in this settings dialog.
	 *
	 * @param {number|string} bonus - Percent value or 'ark' for the arc bonus entry
	 * @returns {string} Chip HTML
	 */
	SettingsChip: (bonus)=> {
		let isArk = (bonus === 'ark');

		return `<span class="percent-chip${isArk ? ' arc' : ''}"${isArk ? ` title="${i18n('Boxes.Calculator.Settings.ArkInfo')}"` : ''}>
			<input type="hidden" class="settings-values" value="${bonus}">
			<span class="chip-value">${isArk ? MainParser.ArkBonus : bonus}%</span>
			<span class="chip-del" onclick="Parts.SettingsRemoveRow(this)">&times;</span>
		</span>`;
	},


	/**
	 * Inserts a chip into this settings dialog, sorted by its percent value.
	 *
	 * @param {number|string} bonus - Percent value or 'ark'
	 */
	SettingsInsertChip: (bonus)=> {
		let $box = $('#OwnPartBoxSettingsBox'),
			value = (bonus === 'ark' ? MainParser.ArkBonus : bonus),
			$next = $box.find('.percent-chip').not('.ghost').filter(function(){
				let v = $(this).find('.settings-values').val();
				return ((v === 'ark' ? MainParser.ArkBonus : parseFloat(v)) > value);
			}).first();

		if($next.length){
			$(Parts.SettingsChip(bonus)).insertBefore($next);
		}
		else {
			$(Parts.SettingsChip(bonus)).insertBefore($box.find('.percent-chip.ghost'));
		}
	},


	/**
	 * Adds the value of the input field as a new percent chip.
	 */
	SettingsAddValue: ()=> {
		let $box = $('#OwnPartBoxSettingsBox'),
			$input = $box.find('.percent-add-input'),
			v = parseFloat($input.val());

		if(isFinite(v) && v >= -100 && v <= 200){
			v = Math.round(v * 10) / 10;

			let exists = $box.find('.percent-chip .settings-values').toArray().some(el => parseFloat(el.value) === v);
			if(!exists){
				Parts.SettingsInsertChip(v);
			}
		}

		$input.val('').trigger('focus');
	},


	/**
	 * Brings the removed arc bonus chip back and hides the ghost chip again.
	 */
	SettingsAddArk: ()=> {
		let $box = $('#OwnPartBoxSettingsBox');

		$box.find('.percent-chip.ghost').hide();
		Parts.SettingsInsertChip('ark');
	},


	/**
	 * Removes a percent chip from this settings dialog. Removing the arc bonus
	 * chip reveals the ghost chip to bring it back.
	 *
	 * @param {HTMLElement} $this - The clicked delete button
	 */
	SettingsRemoveRow: ($this)=> {
		let $chip = $($this).closest('.percent-chip'),
			isArk = ($chip.find('.settings-values').val() === 'ark'),
			$box = $('#OwnPartBoxSettingsBox');

		$chip.fadeOut('fast', function(){
			$(this).remove();

			if(isArk){
				$box.find('.percent-chip.ghost').show();
			}
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

		// adopt a typed but not yet added value
		Parts.SettingsAddValue();

		$settings.find('.settings-values').each(function() {
			let v = $(this).val().trim();

			if(v === 'ark'){
				values.push(v);
			}
			else if(v !== '' && isFinite(parseFloat(v))){
				values.push( parseFloat(v) );
			}
		});

		if(values.length){
			localStorage.setItem('CustomPartCalcButtons', JSON.stringify(values));
		}
		else {
			// everything removed: back to the default buttons
			localStorage.removeItem('CustomPartCalcButtons');
		}

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
