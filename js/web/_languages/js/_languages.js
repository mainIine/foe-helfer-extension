/*
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * Licensed under AGPL - see LICENSE.md for details.
 */

let Languages = {
	PossibleLanguages: {
		'bs': 'Bosanski',
		'ca': 'Català',
		'cs': 'Český',
		'de': 'Deutsch',
		'dk': 'Dansk',
		'el': 'Ελληνικά',
		'en': 'English',
		'es': 'Español',
		'fi': 'Suomi',
		'fr': 'Français',
		'hu': 'Magyar',
		'it': 'Italiano',
		'ja': '日本語',
		'nb_NO': 'Norsk bokmål',
		'nl': 'Nederlands',
		'nn': 'Nynorsk',
		'pl': 'Polski',
		'pt': 'Português',
		'pt-br': 'Português do Brasil',
		'ro': 'Română',
		'ru': 'Русский',
		'sk': 'Slovenčina',
		'sr_Latn': 'Srpski (latinica)',
		'sv': 'Svenska',
		'tr': 'Türkçe',
		'uk': 'Українська',
	},
};

let Translation = {
	Show: ()=> {
		if ( $('#Translation').length === 0 ) {

			HTML.AddCssFile('_languages');

			HTML.Box({
				id: 'Translation',
				title: i18n('Boxes.Translation.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true
			});		
			let html = `
				<div id="TranslationHeader" class="p5">
					<label for="ReferenceLanguage">${i18n('Boxes.Translation.ReferenceLanguage')}</label>
					<select id="ReferenceLanguage" selected="en">
						${["en","de"].map((code)=>`<option value="${code}">${Languages.PossibleLanguages[code]}</option>`).join('')}
					</select>
					<label for="TargetLanguage">${i18n('Boxes.Translation.TargetLanguage')}</label>
					<select id="TargetLanguage">
						<option value="" disabled selected>${i18n('Boxes.Translation.SelectLanguage')}...</option>
						${Object.entries(Languages.PossibleLanguages).map(([code, name])=>`<option value="${code}">${name}</option>`).join('')}
					</select>
					<input type="checkbox" id="ShowOnlyMissing" />
					<label for="ShowOnlyMissing">${i18n('Boxes.Translation.ShowOnlyMissing')}</label>
					<input type="text" id="TranslationSearch" placeholder="${i18n('Boxes.Translation.SearchPlaceholder')}" length="50"/>
				</div>
				<table id="TranslationTable" class="foe-table">
					<thead>
						<tr>
							<th>${i18n('Boxes.Translation.Key')}</th>
							<th>${i18n('Boxes.Translation.Reference')}</th>
							<th>${i18n('Boxes.Translation.Target')}</th>
						</tr>
					</thead>
					<tbody>
					</tbody>
				</table>
				<div id="TranslationFooter" class="p5">
					<span class="btn btn-default" id="CopyJSON">${i18n('Boxes.Translation.CopyJSON')}</span>
					<div id="CopyJSONInfo"><h2>Explanation</h2> <ul><li>Create a GitHub Account</li><li>Fork the Forge Hammer repository including all branches</li><li>Use the Copy button on the left to copy the translation data</li><li>Overwrite the content of the respective language file in your forks development branch.</li><li>Create a pull request from there into the Forge Hammer 'development' branch to get the translation into the next release.</li></ul></div>
				</div>
			`

			$('#TranslationBody').html(html)
		}
		$('#TargetLanguage').on('change', Translation.UpdateTable);
		$('#ReferenceLanguage').on('change', Translation.UpdateTable);
		$('#ShowOnlyMissing').on('change', ()=>{
			$('#TranslationTable')[0].classList.toggle('show-only-missing', $('#ShowOnlyMissing')[0].checked);
		});
		$('#TranslationSearch').on('input', Translation.FilterTable);
		$('#CopyJSON').on('click', ()=>{
			let target = {};
			$('#TranslationTable tbody tr').each((i, row)=>{
				let key = $(row).find('td:nth-child(1)').html();
				let value = $(row).find('td:nth-child(3) span').html();
				if (value.trim() !== '') target[key] = value;
			});
			navigator.clipboard.writeText(JSON.stringify(target, null, 2));
		});
		$('#TranslationTable').on('click', 'td:nth-child(3)', function() {
			let td = $(this);
			let currentValue = $(this).find('span').html();
			if (undefined === currentValue) return;
			td.html(`<textarea></textarea><span class="hidden">${currentValue}</span>`);
			td.find('textarea').val(currentValue);
			let input = td.find('textarea');
			input.focus();
		});
		$('#TranslationTable').on('blur', 'td:nth-child(3) textarea', function() {
			let textarea = $(this);
			let originalValue = textarea.next().html();
			let newValue = textarea.val();
			if (newValue.trim() === '') newValue = '';
			if (newValue.length < originalValue.length) {
				if (!confirm(i18n('Boxes.Translation.EditValuePrompt'))) {
					newValue = originalValue;
				}
			}
			textarea.parent().html(`<span>${newValue}</span>`);
		})


	},

	UpdateTable: async ()=> {
		let target = $('#TargetLanguage')[0].value;
		let reference = $('#ReferenceLanguage')[0].value;
		let showOnlyMissing = $('#ShowOnlyMissing')[0].checked;

		let targetData = await fetch(extUrl + 'js/web/_i18n/'+target+'.json').then(res=>res.json());
		let referenceData = await fetch(extUrl + 'js/web/_i18n/'+reference+'.json').then(res=>res.json());
		
		referenceData = Object.entries(referenceData).sort((a, b) => a[0].localeCompare(b[0])).map(([key, value])=>({key, value}));
		let rowsHtml = referenceData.map(({key, value})=>{
			let targetValue = targetData[key] || '';
			let missing = targetValue.trim() === '';
			return `<tr class="${missing ? 'missing' : ''}">
				<td>${key}</td>
				<td>${value}</td>
				<td><span>${targetValue}</span></td>
			</tr>`;
		}).join('');
		$('#TranslationTable tbody').html(rowsHtml);
		Translation.FilterTable();
	},

	FilterTable: ()=> {
		let search = $('#TranslationSearch')[0].value.trim();
		$('#TranslationTable')[0].classList.toggle('search-active', search !== '');
		if (search === '') {
			$('#TranslationTable .found').removeClass('found');
			return;
		}
		let searchRE = new RegExp(search, 'i');
		$('#TranslationTable tbody tr').each((i, row)=>{
			let key = $(row).find('td:nth-child(1)').html();
			let reference = $(row).find('td:nth-child(2)').html();
			let target = $(row).find('td:nth-child(3)').html();
			if (!searchRE.test(key) && !searchRE.test(reference) && !searchRE.test(target)) {
				$(row)[0].classList.remove('found');
			} else {
				$(row)[0].classList.add('found');
			}
		});
	}



};