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
	 * Builds the settings dialog of the cost calculator: custom percent buttons,
	 * the per-conversation bonus, view/auto-open options and the sound toggle.
	 * Renders into the settings box of the box the calculator currently uses.
	 */
	ShowCalculatorSettings: ()=> {
		let c = [],
			buttons,
			defaults = Calculator.DefaultButtons,
			sB = localStorage.getItem('CustomCalculatorButtons'),
			allGB = JSON.parse(localStorage.getItem('ShowOwnPartOnAllGBs')),
			autoOpen = localStorage.getItem('OwnPartAutoOpen'),
			nV = `<p class="new-row text-center bbd p5 flex gap">
				${i18n('Boxes.Calculator.Settings.newValue')}: <input type="number" class="settings-values" style="width:30px"> 
				<span class="btn btn-green btn-slim" onclick="Calculator.SettingsInsertNewRow()">+</span>
				</p>`;

		if(sB) {
			// buttons = [...new Set([...defaults,...JSON.parse(sB)])];
			buttons = JSON.parse(sB);

			buttons = buttons.filter((item, index) => buttons.indexOf(item) === index); // remove duplicates
			buttons.sort((a, b) => a - b); // order
		}
		else {
			buttons = defaults;
		}

		c.push('<section class="flex gap p2">');
		buttons.forEach(bonus => {
			if(bonus === 'ark') {
				c.push(`<span class="btn-group"><input type="hidden" class="settings-values" value="ark"> <button class="btn btn-slim br">${MainParser.ArkBonus}%</button></span>`);
			}
			else {
				c.push(`<span class="btn-group flex"><button class="btn btn-slim">${bonus}%</button> <input type="hidden" class="settings-values" value="${bonus}"> <span class="btn btn-delete btn-slim" onclick="Calculator.SettingsRemoveRow(this)">x</span> </span>`);
			}
		});
		c.push('</section>');

		c.push(nV);

		// own ids: in split view this dialog can be open next to the own part settings, ids must not collide
		c.push(`<p class="bbd p5">
			<label for="forderbonusperconversation"><input id="forderbonusperconversation" class="forderbonusperconversation game-cursor" ${(Calculator.ForderBonusPerConversation ? 'checked' : '')} type="checkbox">${i18n('Boxes.Calculator.ForderBonusPerConversation')}</label><br/>
			<label for="calc-openonaliengb"><input type="checkbox" id="calc-openonaliengb" class="game-cursor" ${((!allGB) ? 'checked' : '')}> ${i18n('Settings.ShowOwnPartOnAllGBs.Desc')}</label><br>
			<label for="calc-autoOpen"><input type="checkbox" id="calc-autoOpen" class="game-cursor" ${((autoOpen == 'true') ? 'checked' : '')}> ${i18n('Settings.ShowOwnPartAutoOpen.Desc')}</label><br>
			<label for="CalculatorTone"><input id="CalculatorTone" class="CalculatorTone game-cursor" ${(Calculator.PlayInfoSound ? 'checked' : '')} type="checkbox"> ${i18n('Boxes.Calculator.PlayInfoSound')}</label>
		</p>`);

		c.push(`<p class="text-center"><button id="save-calculator-settings" class="btn btn-green" onclick="Calculator.SettingsSaveValues()">${i18n('Boxes.Calculator.Settings.Save')}</button></p>`);

		$('#' + Calculator.BoxId() + 'SettingsBox').html(c.join(''));
	},


	/**
	 * Appends another "new value" input row to this settings dialog.
	 */
	SettingsInsertNewRow: ()=> {
    	let nV = `<p class="new-row">${i18n('Boxes.Calculator.Settings.newValue')}: <input type="number" class="settings-values" style="width:30px"> <span class="btn btn-green" onclick="Calculator.SettingsInsertNewRow()">+</span></p>`;

		// only within the own settings dialog, the own part settings can be open at the same time
		$(nV).insertAfter( $('#' + Calculator.BoxId() + 'SettingsBox .new-row:eq(-1)') );
	},


	/**
	 * Removes a custom percent button from this settings dialog.
	 *
	 * @param {HTMLElement} $this - The clicked delete button
	 */
	SettingsRemoveRow: ($this)=> {
		$($this).closest('.btn-group').fadeToggle('fast', function(){
			$(this).remove();
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

		$settings.find('.settings-values').each(function(){
			let v = $(this).val().trim();

			if(v){
				if(v !== 'ark'){
					values.push( parseFloat(v) );
				} else {
					values.push(v);
				}
			}
		});
		localStorage.setItem('CustomCalculatorButtons', JSON.stringify(values));

		Calculator.ForderBonusPerConversation = $settings.find('.forderbonusperconversation').prop('checked');
		localStorage.setItem('CalculatorForderBonusPerConversation', Calculator.ForderBonusPerConversation);

		Calculator.PlayInfoSound = $settings.find('#CalculatorTone').prop('checked');
		localStorage.setItem('CalculatorTone', Calculator.PlayInfoSound);

		let openforeignGB = false;
		if ($settings.find('#calc-openonaliengb').is(':not(:checked)')) openforeignGB = true;
		localStorage.setItem('ShowOwnPartOnAllGBs',openforeignGB);

		// same key as in the own part calculator: box opens automatically on GreatBuildingsService.getConstruction
		localStorage.setItem('OwnPartAutoOpen', $settings.find('#calc-autoOpen').prop('checked'));


		$settings.fadeToggle('fast', function(){
			$(this).remove();
			Parts.CalcBody();
		});
	},
});
