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
			allGB = JSON.parse(localStorage.getItem('ShowOwnPartOnAllGBs')),
			// split view: own auto open setting for this box, combined view: the shared box setting
			autoOpen = localStorage.getItem(Calculator.AutoOpenKey()),
			autoOpenLabel = i18n('Settings.ShowOwnPartAutoOpen.Desc') + (Calculator.IsSplitView() ? ' (' + i18n('Boxes.Calculator.Title') + ')' : '');

		c.push(Calculator.SettingsChipRows('CustomCalculatorButtons', Calculator.DefaultButtons));

		// own ids: in split view this dialog can be open next to the own part settings, ids must not collide
		c.push(`<p class="bbd p5">
			<label for="forderbonusperconversation"><input id="forderbonusperconversation" class="forderbonusperconversation game-cursor" ${(Calculator.ForderBonusPerConversation ? 'checked' : '')} type="checkbox">${i18n('Boxes.Calculator.ForderBonusPerConversation')}</label><br/>
			<label for="calc-openonaliengb"><input type="checkbox" id="calc-openonaliengb" class="game-cursor" ${((!allGB) ? 'checked' : '')}> ${i18n('Settings.ShowOwnPartOnAllGBs.Desc')}</label><br>
			<label for="calc-autoOpen"><input type="checkbox" id="calc-autoOpen" class="game-cursor" ${((autoOpen !== 'false') ? 'checked' : '')}> ${autoOpenLabel}</label><br>
			<label for="calc-showboost"><input type="checkbox" id="calc-showboost" class="game-cursor" ${(localStorage.getItem('CalculatorShowBoostColumn') !== 'false' ? 'checked' : '')}> ${i18n('Boxes.Calculator.ShowBoostColumn')}</label><br>
			<label for="CalculatorTone"><input id="CalculatorTone" class="CalculatorTone game-cursor" ${(Calculator.PlayInfoSound ? 'checked' : '')} type="checkbox"> ${i18n('Boxes.Calculator.PlayInfoSound')}</label>
		</p>`);

		c.push(`<p class="text-center"><button id="save-calculator-settings" class="btn btn-green" onclick="Calculator.SettingsSaveValues()">${i18n('Boxes.Calculator.Settings.Save')}</button></p>`);

		$('#' + Calculator.BoxId() + 'SettingsBox').html(c.join(''));
	},


	/**
	 * Marker of a prestige tier for the percent buttons and their settings rows.
	 *
	 * @param {boolean} Gold - Gold tier instead of copper
	 * @returns {string} Icon with the tier name as tooltip
	 */
	TierMarker: (Gold)=> `<span class="percent-tier${Gold ? ' gold' : ''}" title="${i18n('Boxes.OwnpartCalculator.Tier')}: ${i18n(Gold ? 'Boxes.OwnpartCalculator.TierGold' : 'Boxes.OwnpartCalculator.TierCopper')}">${Gold ? '🟡' : '🟤'}</span>`,


	/**
	 * Percent buttons of a calculator for a tier. Gold tier level-ups have their
	 * own list, without saved values it only holds the own gold arc bonus.
	 *
	 * @param {string} StorageKey - localStorage key of the copper list, the gold list uses the suffix "Gold"
	 * @param {Array} Defaults - Default button list
	 * @param {boolean} [Gold=false] - List of the gold tier
	 * @returns {Array} Cleaned and sorted list, 'ark' marks the own arc bonus
	 */
	GetButtons: (StorageKey, Defaults, Gold = false)=> {
		const Saved = localStorage.getItem(StorageKey + (Gold ? 'Gold' : ''));

		return Calculator.SettingsSanitizeButtons(Saved ? JSON.parse(Saved) : (Gold ? [] : Defaults), Gold);
	},


	/**
	 * Removes duplicates and invalid entries from a stored button list and sorts
	 * it by percent value. The own arc bonus of the tier is always part of the
	 * list while the player has one ('ark' entry, resolved to the current bonus),
	 * it can neither be removed nor be missing.
	 *
	 * @param {Array} buttons - Raw button list from storage or defaults
	 * @param {boolean} [Gold=false] - List of the gold tier (uses the gold contribution boost)
	 * @returns {Array} Cleaned and sorted list
	 */
	SettingsSanitizeButtons: (buttons, Gold = false)=> {
		const Ark = MainParser.GetArkBonus(Gold ? 'gold' : null);

		buttons = buttons.filter((item, index) => isFinite(item) && buttons.indexOf(item) === index);

		if(Ark > 0){
			buttons.push('ark');
		}

		return buttons.sort((a, b) => (a === 'ark' ? Ark : a) - (b === 'ark' ? Ark : b));
	},


	/**
	 * Percent button editor of a settings dialog, shared by both calculators: one
	 * row of chips with an input for new values, on worlds with the prestige
	 * rework one row per tier (copper and gold).
	 *
	 * @param {string} StorageKey - localStorage key of the copper list
	 * @param {Array} Defaults - Default button list
	 * @returns {string} Editor HTML
	 */
	SettingsChipRows: (StorageKey, Defaults)=> {
		const HasGold = MainParser.HasGoldTier();

		return (HasGold ? [false, true] : [false]).map(Gold => `<div class="percent-chips bbd" data-gold="${Gold}">
			${HasGold ? Calculator.TierMarker(Gold) : ''}
			${Calculator.GetButtons(StorageKey, Defaults, Gold).map(bonus => Calculator.SettingsChip(bonus, Gold)).join('')}
			<span class="percent-add">
				<input type="number" class="percent-add-input" step="0.1" min="-100" max="200" placeholder="%" title="${i18n('Boxes.Calculator.Settings.newValue')}" onkeydown="if(event.key==='Enter'){Calculator.SettingsAddValue(this);event.preventDefault();}">
				<span class="btn btn-green btn-slim" title="${i18n('Boxes.Calculator.Settings.newValue')}" onclick="Calculator.SettingsAddValue(this)">+</span>
			</span>
		</div>`).join('');
	},


	/**
	 * Returns the markup of one percent chip of the editor. The arc bonus chip
	 * is fixed and has no delete button.
	 *
	 * @param {number|string} bonus - Percent value or 'ark' for the arc bonus entry
	 * @param {boolean} [Gold=false] - Chip of the gold tier row
	 * @returns {string} Chip HTML
	 */
	SettingsChip: (bonus, Gold = false)=> {
		if(bonus === 'ark'){
			return `<span class="percent-chip arc${MainParser.HasGoldTier() ? (Gold ? ' gold' : ' copper') : ''}" title="${i18n('Boxes.Calculator.Settings.ArkInfo')}">
				<input type="hidden" class="settings-values" value="ark">
				<span class="chip-value">${i18n('Boxes.OwnpartCalculator.Arc')} ${MainParser.GetArkBonus(Gold ? 'gold' : null)}%</span>
			</span>`;
		}

		return `<span class="percent-chip">
			<input type="hidden" class="settings-values" value="${bonus}">
			<span class="chip-value">${bonus}%</span>
			<span class="chip-del" onclick="Calculator.SettingsRemoveRow(this)">&times;</span>
		</span>`;
	},


	/**
	 * Adds the value of an input field of the editor as a new percent chip to
	 * its row, sorted by the percent value.
	 *
	 * @param {HTMLElement} el - The input field or the add button of the row
	 */
	SettingsAddValue: (el)=> {
		let $row = $(el).closest('.percent-chips'),
			$input = $row.find('.percent-add-input'),
			Gold = ($row.attr('data-gold') === 'true'),
			Ark = MainParser.GetArkBonus(Gold ? 'gold' : null),
			chipValue = (chip) => {
				let v = $(chip).find('.settings-values').val();
				return (v === 'ark' ? Ark : parseFloat(v));
			},
			v = parseFloat($input.val());

		if(isFinite(v) && v >= -100 && v <= 200){
			v = Math.round(v * 10) / 10;

			let $chips = $row.find('.percent-chip'),
				exists = $chips.toArray().some(chip => parseFloat($(chip).find('.settings-values').val()) === v);

			if(!exists){
				let $next = $chips.filter(function(){ return (chipValue(this) > v); }).first();

				$(Calculator.SettingsChip(v, Gold)).insertBefore($next.length ? $next : $row.find('.percent-add'));
			}
		}

		$input.val('').trigger('focus');
	},


	/**
	 * Removes a percent chip from the editor.
	 *
	 * @param {HTMLElement} $this - The clicked delete button
	 */
	SettingsRemoveRow: ($this)=> {
		$($this).closest('.percent-chip').fadeOut('fast', function(){
			$(this).remove();
		});
	},


	/**
	 * Saves the percent buttons of the editor of a settings dialog, one list
	 * per tier. An empty copper row restores the default buttons.
	 *
	 * @param {jQuery} $settings - Container of the settings dialog
	 * @param {string} StorageKey - localStorage key of the copper list
	 */
	SettingsSaveButtons: ($settings, StorageKey)=> {
		// adopt typed but not yet added values
		$settings.find('.percent-add-input').each(function(){
			if(this.value !== '') Calculator.SettingsAddValue(this);
		});

		$settings.find('.percent-chips').each(function(){
			let Gold = ($(this).attr('data-gold') === 'true'),
				// the arc bonus entry is not stored, it is added while the player has one
				values = $(this).find('.settings-values').toArray().map(el => parseFloat(el.value)).filter(isFinite);

			if(values.length){
				localStorage.setItem(StorageKey + (Gold ? 'Gold' : ''), JSON.stringify(values));
			}
			else {
				localStorage.removeItem(StorageKey + (Gold ? 'Gold' : ''));
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
		let $settings = $('#' + Calculator.BoxId() + 'SettingsBox');

		Calculator.SettingsSaveButtons($settings, 'CustomCalculatorButtons');

		Calculator.ForderBonusPerConversation = $settings.find('.forderbonusperconversation').prop('checked');
		localStorage.setItem('CalculatorForderBonusPerConversation', Calculator.ForderBonusPerConversation);

		Calculator.PlayInfoSound = $settings.find('#CalculatorTone').prop('checked');
		localStorage.setItem('CalculatorTone', Calculator.PlayInfoSound);

		let openforeignGB = false;
		if ($settings.find('#calc-openonaliengb').is(':not(:checked)')) openforeignGB = true;
		localStorage.setItem('ShowOwnPartOnAllGBs',openforeignGB);

		localStorage.setItem('CalculatorShowBoostColumn', $settings.find('#calc-showboost').prop('checked'));

		// box opens automatically on GreatBuildingsService.getConstruction
		localStorage.setItem(Calculator.AutoOpenKey(), $settings.find('#calc-autoOpen').prop('checked'));


		$settings.fadeToggle('fast', function(){
			$(this).remove();
			Parts.CalcBody();
		});
	},
});
