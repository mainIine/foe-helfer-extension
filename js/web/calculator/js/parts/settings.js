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

// Settings dialog of the cost calculator (#CalculatorBoxSettingsBox in split
// view, #OwnPartBoxSettingsBox in the combined view) — split out of calculator.js.
// Loaded after calculator.js via the "parts" mechanism in js/internal.json,
// so it can safely extend the existing Calculator object.
Object.assign(Calculator, {
	/**
	 * Builds the settings dialog of the cost calculator: the percent button
	 * editor, the per-conversation bonus, view/auto-open options and the sound
	 * toggle. Renders into the settings box of the box the calculator currently uses.
	 */
	ShowCalculatorSettings: ()=> {
		let c = [],
			sB = localStorage.getItem('CustomCalculatorButtons'),
			allGB = JSON.parse(localStorage.getItem('ShowOwnPartOnAllGBs')),
			autoOpen = localStorage.getItem('OwnPartAutoOpen'),
			buttons = Calculator.SettingsSanitizeButtons(sB ? JSON.parse(sB) : Calculator.DefaultButtons);

		c.push('<div class="percent-chips bbd">');
		buttons.forEach(bonus => c.push(Calculator.SettingsChip(bonus)));

		// ghost chip to bring the arc bonus button back, hidden while it exists
		c.push(`<span class="percent-chip ghost" title="${i18n('Boxes.Calculator.Settings.AddArk')}" onclick="Calculator.SettingsAddArk()"${buttons.includes('ark') ? ' style="display:none"' : ''}>+ ${MainParser.ArkBonus}%</span>`);

		c.push(`<span class="percent-add">
			<input type="number" class="percent-add-input" step="0.1" min="0" max="200" placeholder="%" title="${i18n('Boxes.Calculator.Settings.newValue')}" onkeydown="if(event.key==='Enter'){Calculator.SettingsAddValue();event.preventDefault();}">
			<span class="btn btn-green btn-slim" title="${i18n('Boxes.Calculator.Settings.newValue')}" onclick="Calculator.SettingsAddValue()">+</span>
		</span>`);
		c.push('</div>');

		// own ids: in split view this dialog can be open next to the own part settings, ids must not collide
		c.push(`<p class="bbd p5">
			<label for="forderbonusperconversation"><input id="forderbonusperconversation" class="forderbonusperconversation game-cursor" ${(Calculator.ForderBonusPerConversation ? 'checked' : '')} type="checkbox">${i18n('Boxes.Calculator.ForderBonusPerConversation')}</label><br/>
			<label for="calc-openonaliengb"><input type="checkbox" id="calc-openonaliengb" class="game-cursor" ${((!allGB) ? 'checked' : '')}> ${i18n('Settings.ShowOwnPartOnAllGBs.Desc')}</label><br>
			<label for="calc-autoOpen"><input type="checkbox" id="calc-autoOpen" class="game-cursor" ${((autoOpen == 'true') ? 'checked' : '')}> ${i18n('Settings.ShowOwnPartAutoOpen.Desc')}</label><br>
			<label for="calc-showboost"><input type="checkbox" id="calc-showboost" class="game-cursor" ${(localStorage.getItem('CalculatorShowBoostColumn') !== 'false' ? 'checked' : '')}> ${i18n('Boxes.Calculator.ShowBoostColumn')}</label><br>
			<label for="CalculatorTone"><input id="CalculatorTone" class="CalculatorTone game-cursor" ${(Calculator.PlayInfoSound ? 'checked' : '')} type="checkbox"> ${i18n('Boxes.Calculator.PlayInfoSound')}</label>
		</p>`);

		c.push(`<p class="text-center"><button id="save-calculator-settings" class="btn btn-green" onclick="Calculator.SettingsSaveValues()">${i18n('Boxes.Calculator.Settings.Save')}</button></p>`);

		$('#' + Calculator.BoxId() + 'SettingsBox').html(c.join(''));
	},


	/**
	 * Removes duplicates and invalid entries from a stored button list and sorts
	 * it by percent value ('ark' by the current arc bonus).
	 *
	 * @param {Array} buttons - Raw button list from storage or defaults
	 * @returns {Array} Cleaned and sorted list
	 */
	SettingsSanitizeButtons: (buttons)=> {
		buttons = buttons.filter((item, index) => (item === 'ark' || isFinite(item)) && buttons.indexOf(item) === index);
		return buttons.sort((a, b) => (a === 'ark' ? MainParser.ArkBonus : a) - (b === 'ark' ? MainParser.ArkBonus : b));
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
			<span class="chip-del" onclick="Calculator.SettingsRemoveRow(this)">&times;</span>
		</span>`;
	},


	/**
	 * Inserts a chip into this settings dialog, sorted by its percent value.
	 *
	 * @param {number|string} bonus - Percent value or 'ark'
	 */
	SettingsInsertChip: (bonus)=> {
		let $box = $('#' + Calculator.BoxId() + 'SettingsBox'),
			value = (bonus === 'ark' ? MainParser.ArkBonus : bonus),
			$next = $box.find('.percent-chip').not('.ghost').filter(function(){
				let v = $(this).find('.settings-values').val();
				return ((v === 'ark' ? MainParser.ArkBonus : parseFloat(v)) > value);
			}).first();

		if($next.length){
			$(Calculator.SettingsChip(bonus)).insertBefore($next);
		}
		else {
			$(Calculator.SettingsChip(bonus)).insertBefore($box.find('.percent-chip.ghost'));
		}
	},


	/**
	 * Adds the value of the input field as a new percent chip.
	 */
	SettingsAddValue: ()=> {
		let $box = $('#' + Calculator.BoxId() + 'SettingsBox'),
			$input = $box.find('.percent-add-input'),
			v = parseFloat($input.val());

		if(isFinite(v) && v >= 0 && v <= 200){
			v = Math.round(v * 10) / 10;

			let exists = $box.find('.percent-chip .settings-values').toArray().some(el => parseFloat(el.value) === v);
			if(!exists){
				Calculator.SettingsInsertChip(v);
			}
		}

		$input.val('').trigger('focus');
	},


	/**
	 * Brings the removed arc bonus chip back and hides the ghost chip again.
	 */
	SettingsAddArk: ()=> {
		let $box = $('#' + Calculator.BoxId() + 'SettingsBox');

		$box.find('.percent-chip.ghost').hide();
		Calculator.SettingsInsertChip('ark');
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
			$box = $('#' + Calculator.BoxId() + 'SettingsBox');

		$chip.fadeOut('fast', function(){
			$(this).remove();

			if(isArk){
				$box.find('.percent-chip.ghost').show();
			}
		});
	},


	/**
	 * Saves all values of the cost calculator settings dialog and re-renders the
	 * boxes. Reads only from its own settings container, the own part settings
	 * can be open at the same time in split view.
	 */
	SettingsSaveValues: ()=> {
		// read only from the own settings dialog, the own part settings can be open at the same time
		let $settings = $('#' + Calculator.BoxId() + 'SettingsBox'),
			values = [];

		// adopt a typed but not yet added value
		Calculator.SettingsAddValue();

		$settings.find('.settings-values').each(function(){
			let v = $(this).val().trim();

			if(v === 'ark'){
				values.push(v);
			}
			else if(v !== '' && isFinite(parseFloat(v))){
				values.push( parseFloat(v) );
			}
		});

		if(values.length){
			localStorage.setItem('CustomCalculatorButtons', JSON.stringify(values));
		}
		else {
			// everything removed: back to the default buttons
			localStorage.removeItem('CustomCalculatorButtons');
		}

		Calculator.ForderBonusPerConversation = $settings.find('.forderbonusperconversation').prop('checked');
		localStorage.setItem('CalculatorForderBonusPerConversation', Calculator.ForderBonusPerConversation);

		Calculator.PlayInfoSound = $settings.find('#CalculatorTone').prop('checked');
		localStorage.setItem('CalculatorTone', Calculator.PlayInfoSound);

		let openforeignGB = false;
		if ($settings.find('#calc-openonaliengb').is(':not(:checked)')) openforeignGB = true;
		localStorage.setItem('ShowOwnPartOnAllGBs',openforeignGB);

		localStorage.setItem('CalculatorShowBoostColumn', $settings.find('#calc-showboost').prop('checked'));

		// same key as in the own part calculator: box opens automatically on GreatBuildingsService.getConstruction
		localStorage.setItem('OwnPartAutoOpen', $settings.find('#calc-autoOpen').prop('checked'));


		$settings.fadeToggle('fast', function(){
			$(this).remove();
			Parts.CalcBody();
		});
	},
});
