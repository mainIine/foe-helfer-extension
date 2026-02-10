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

/**
 *
 * @type {{Help: (function(): string), NotificationView: (function(): string), GetSetting: ((function(*, *=): *)|*), MenuSelected: (function(): string), BoxGroups: string[], BuildBox: Settings.BuildBox, About: (function(): string), StoreSettings: Settings.StoreSettings, InfoboxInputEntryCount: (function(): *|jQuery), VersionInfo: (function(): string), Init: Settings.Init, ExportView: (function(): string), MenuInputLength: (function(): *|jQuery), NotificationStack: (function(): *|jQuery), ImportSettings: Settings.ImportSettings, LoadConfig: Settings.LoadConfig, BuildBody: Settings.BuildBody, ResetBoxCoords: Settings.ResetBoxCoords, LanguageDropdown: (function(): string), Preferences: null, MenuContent: (function(): *), ExportSettings: Settings.ExportSettings}}
 */
let Settings = {

	/**
	 * Settings
	 */
	Preferences: null,

	/**
	 * Tab groups
	 */
	BoxGroups: [
		'About',
		'Extension',
		'Auto',
		'Boxes'
	],

	/**
	 * load the settings from the json
	 *
	 * @constructor
	 */
	Init: () => {
		Settings.LoadConfig((response) => {
			Settings.Preferences = response;
		});
	},


	/**
	 * Load config from config file
	 *
	 * @param callback
	 * @constructor
	 */
	LoadConfig: (callback) => {
		fetch(
			`${extUrl}js/web/settings/config/config.json`
		).then(response => {
			if (response.status === 200) {
				response.json().then(callback);
			}
		});
	},


	/**
	 * Box initiieren
	 */
	BuildBox: () => {
		if ($('#SettingsBox').length < 1) {

			HTML.AddCssFile('settings');

			HTML.Box({
				id: 'SettingsBox',
				title: i18n('Boxes.Settings.Title'),
				auto_close: true,
				dragdrop: true
			});

		} else {
			HTML.CloseOpenBox('SettingsBox');
		}

		Settings.BuildBody();
	},


	/**
	 * Box zusammen setzen
	 *
	 */
	BuildBody: () => {

		let parentLis = [],
			div = [],
			content;

		for (let i = 0; i < Settings.BoxGroups.length; i++) {
			let g = Settings.BoxGroups[i],
				grps = Settings.Preferences.filter((x) => x['group'] === g),
				subcontent,
				cnt = 1,
				childLis = [],
				childDivs = [];

			parentLis.push(`<li><a href="#tab-${i}"><span>${i18n('Settings.Tab.' + g)}</span></a></li>`);

			for (let x in grps) {
				if (!grps.hasOwnProperty(x)) {
					break;
				}

				let d = grps[x],
					status = d['status'],
					button = d['button'],
					c = $('<div />').addClass('item'),
					cr = $('<div />').addClass('item-row'),
					ct = $('<h2 />'),
					cd = $('<div />').addClass('desc'),
					cs = $('<div />').addClass('setting');

				if ("SelectedMenu" !== d['name'] && 'NotificationsPosition' !== d['name'] && 'ApiToken' !== d['name']) {

					let s = localStorage.getItem(d['name']);

					if (s !== null) {
						status = JSON.parse(s);
					}
				}

				// no value && no callback function, make it empty
				if(d['callback'] === undefined && status === undefined && d['button'] === undefined) {
					cs.html('');
				}
				else if (d['callback'] !== undefined) {
					cs.html(Settings[d['callback']]());
				}
				if (button) {
					let b = $('<div />').addClass('button-wrapper').append(
						$(`<button class="btn" id="${x}Button" onclick="${button}">${i18n('Settings.' + d['name'] + '.Button')}</button>`)
					);

					cs.append(b);
				} 
				if (status !== undefined) {
					cs.append(
						$('<span />').addClass('check '+(status ? '' : 'unchecked')).append(
							$('<span />').addClass('toogle-word').text(status ? i18n('Boxes.Settings.Active') : i18n('Boxes.Settings.Inactive'))
						).append(
							$('<input class="setting-check game-cursor" type="checkbox" data-id="'+d['name']+'" '+(status ? 'checked' : '')+'/>')
						)
					)
				}

				cd.html(i18n(`Settings.${d['name']}.Desc`));
				ct.text(i18n(`Settings.${d['name']}.Title`));

				childLis.push(`<li><a href="#subtab-${cnt}" title="${i18n('Settings.Entry.' + d['name'])}">${i18n('Settings.Entry.' + d['name'])}</a></li>`);

				let h = c.append(cr.append(ct, cd, cs));
				childDivs.push('<div id="subtab-' + cnt + '" class="sub-tab">' + h.html() + '</div>');

				cnt++;
			}

			subcontent = `<div class='tabs-sub settings-sub'>`;
			subcontent += `<ul class='vertical'>${childLis.join('')}</ul>`;
			subcontent += childDivs.join('');
			subcontent += `</div>`;

			div.push(`<div id='tab-${i}' class="settings-wrapper">${subcontent}</div>`);
		}

		content = `<div class='tabs settings'>`;
		content += `<ul class='horizontal dark-bg'>${parentLis.join('')}</ul>`;
		content += div.join('');
		content += `</div>`;

		// wait for html in the DOM
		$('#SettingsBoxBody').html(content).promise().done(function () {
			// init Tabslet
			$('.settings').tabslet();
			$('.settings-sub').tabslet();
		});


		$('#SettingsBoxBody').on('click', 'input.setting-check', function () {
			Settings.StoreSettings($(this));
		});
	},


	/**
	 * Save on click
	 *
	 * @param el
	 * @param changeText
	 */
	StoreSettings: (el, changeText = true) => {
		let id = $(el).data('id'),
			v = $(el).prop('checked');

		localStorage.setItem(id, v);

		if (changeText === false) {
			return;
		}

		$(el).prev().text(v === true ? i18n('Boxes.Settings.Active') : i18n('Boxes.Settings.Inactive'));

		if (v === true) {
			$(el).closest('span.check').removeClass('unchecked');
		} else {
			$(el).closest('span.check').addClass('unchecked');
		}
	},


	/**
	 * Returns the status from the localStorage or the Settings
	 *
	 * @param name
	 * @param is_string
	 * @returns {any}
	 */
	GetSetting: (name, is_string = false) => {
		let s = localStorage.getItem(name);

		if (s !== null) {
			return is_string ? s : JSON.parse(s);

		} else {

			if (Settings.Preferences === null) {
				console.error('Error getting default value of setting "' + name + '". config.json not loaded');
				return null;

			} else {
				return Settings.Preferences.find(itm => itm['name'] === name)?.status;
			}
		}
	},


	/**
	 * Version number and Player Info 
	 *
	 * @returns {string}
	 */
	VersionInfo: () => {
		let v = extVersion.includes('beta') ? `` : `<p>${i18n('Settings.Version.Link').replace('__version__', '')}</p>`;
		v +=	`<dl class="info-box">
					<dt>${i18n('Settings.Version.Title')}</dt><dd>${extVersion}</dd>
					<dt>${i18n('Settings.Version.PlayerId')}</dt><dd>${ExtPlayerID}</dd>
					<dt>${i18n('Settings.Version.GuildId')}</dt><dd>${(ExtGuildID ? ExtGuildID : 'N/A')}</dd>
					<dt>${i18n('Settings.Version.World')}</dt><dd>${ExtWorld}</dd>
				</dl>`;
		return v;
		
	},


	/**
	 * View for Export-Import
	 *
	 * @returns {string}
	 * @constructor
	 */
	ExportView: () => {
		return `<p><button class="btn" onclick="DBExport.BuildBox()">${i18n('Settings.ExportSettings.OpenImportExportTool')}</button></p>`;
	},


	/**
	 * Export extension settigns
	 *
	 * @constructor
	 */
	ExportSettings: () => {
		let settings = {};

		Object.keys(localStorage).forEach((key) => {

			if (
				key.indexOf('Cords') > -1 ||
				key.indexOf('Size') > -1 ||
				key.indexOf('CopyName') > -1 ||
				key.indexOf('MenuSort') > -1 ||
				key.indexOf('Tone') > -1 ||
				key.indexOf('ForderBonus') > -1
			) {
				settings[key] = localStorage.getItem(key);
			}
		});

		let json = JSON.stringify(settings),
			blob1 = new Blob([json], { type: "application/json;charset=utf-8" }),
			file = `${ExtWorld}-${ExtPlayerID}.json`;

		MainParser.ExportFile(blob1, file);
	},


	/**
	 * Relocation for Menu
	 * 
	 * @returns {string}
	 */
	MenuSelected: () => {
		let dp = [];

		dp.push('<select class="setting-dropdown" id="change-menu">');

		for (let index = 0; index < _menu.MenuOptions.length; index++) {
			const element = _menu.MenuOptions[index];
			if (element[Object.keys(element)[0]]) {
				dp.push('<option value="' + element + '"' + (MainParser.SelectedMenu === element ? ' selected' : '') + '>' + i18n('Menu.' + element) + '</option>');
			}
		}

		dp.push('</select>');

		$('#SettingsBoxBody').on('change', '#change-menu', function () {
			let selMenu = $(this).val();

			localStorage.setItem('SelectedMenu', selMenu);

			location.reload();
		});

		return dp.join('');

	},


	/**
	 * Import saved settigns
	 *
	 * @constructor
	 */
	ImportSettings: () => {
		let file = document.getElementById("import-settings").files[0];

		if (file) {
			let reader = new FileReader();
			reader.readAsText(file, "UTF-8");

			reader.onload = function (evt) {

				const parts = JSON.parse(evt.target.result);

				Object.keys(parts).forEach((key) => {
					localStorage.setItem(key, parts[key]);
				});

				alert(i18n('Settings.ExportImport.Reload'));
				location.reload();
			}

			reader.onerror = function (evt) {
				alert(i18n('Settings.ExportImport.Error'));
			}
		}
	},


	/**
	 * General Information	 
	 *
	 * @returns {string}
	 */
	About: () => {
		return '<hr>' +
			'<h2>' + i18n('Settings.About.TranslateTitle') + '</h2>' +
			'<p>' + i18n('Settings.About.TranslateDesc') + ' <a href="http://i18n.foe-helper.com/projects/foe-helper/extension/" target="_blank">Weblate</a></p>' +
			'<hr>' +
			'<h2>' + i18n('Settings.About.RatingTitle') + '</h2>' +
			'<p>' + i18n('Settings.About.RatingDesc') + '</p>';
	},


	/**
	 * Help list
	 *
	 * @returns {string}
	 */
	Help: () => {
		return '<ul class="helplist">' +
			'<li><a href="https://foe-helper.com" target="_blank"><span class="website">&nbsp;</span>' + i18n('Settings.Help.Website') + '</a></li>' +
			'<li><a href="https://docs.foe-helper.com" target="_blank"><span class="website">&nbsp;</span>' + i18n('Settings.Help.Documentation') + '</a></li>' +
			'<li><a href="https://discord.gg/uQY7rqDJ7z" target="_blank"><span class="discord">&nbsp;</span>' + i18n('Settings.Help.Discord') + '</a></li>' +
			'<li><a href="https://github.com/mainIine/foe-helfer-extension/issues" target="_blank"><span class="github">&nbsp;</span>' + i18n('Settings.Help.Github') + '</a></li>' +
			'</ul>';
	},


	ShowEventHelpers: () => {
		let eventHelperSettings = {'EventHelperMerge': true, 'EventHelperPresent': true, 'EventHelperIdle': true, 'EventHelperPop': true};
		let dp = [];
		
		dp.push('<div class="p5">');
		dp.push('<b>'+i18n('Settings.EventHelper.Advanced')+'</b>')
		for (let [setting, value] of Object.entries(eventHelperSettings)) {
			let savedSetting = localStorage.getItem(setting);
			if (savedSetting !== null) {
				value = JSON.parse(savedSetting);
			}
			dp.push('<div>');
			dp.push( '<span class="check ' + (value ? '' : 'unchecked') + '">' +
				'<span class="toogle-word">' + (value ? i18n('Boxes.Settings.Active') : i18n('Boxes.Settings.Inactive')) + '</span>' +
				'<input name="'+setting+'" data-id="'+setting+'" class="setting-check game-cursor" type="checkbox" ' + (value ? 'checked' : '') + ' />' +
			'</span>');
			dp.push(i18n('Settings.'+setting)+'</div>');
		}
		dp.push('</div>');
		dp.push('<br/><b>'+i18n('Settings.EventHelper.All')+'</b><br/>');
		return dp.join('');
	},


	/**
	 * Resets all Box Coordinated to the default values
	 *
	 */
	ResetBoxCoords: () => {
		$.each(localStorage, function (key, value) {
			if (key.toLowerCase().indexOf('cords') > -1) {
				localStorage.removeItem(key);
			}
		});

		HTML.ShowToastMsg({
			head: i18n('Boxes.Settings.DeletedBoxCoordsHead'),
			text: i18n('Boxes.Settings.DeletedBoxCoordsBody'),
			type: 'success',
			hideAfter: 4000
		});
	},


	SelectWebsite: () => {
		let dp = [];
		let currentSite = localStorage.getItem('linkSite') || "siteScoredb";
		dp.push('<p>Choose your preferred website:<br />');
		dp.push('<label for="scoredb"><input type="radio" value="siteScoredb" id="scoredb" name="website" '+(currentSite === "siteScoredb" ? 'checked' : "")+' /> foe.scoredb.io</label><br />');
		dp.push('<label for="forgedb"><input type="radio" value="siteForgedb" id="forgedb" name="website" '+(currentSite === "siteForgedb" ? 'checked' : "")+' /> foestats.com</label></p>');

		$('#SettingsBoxBody').on('change', 'input[name="website"]', function () {
			let site = $(this).val();
			localStorage.setItem('linkSite', site);
		});
		return dp.join('');
	},


	/**
	 * Language switcher
	 *
	 * @returns {string}
	 */
	LanguageDropdown: () => {
		let dp = [];

		dp.push('<select class="setting-dropdown" id="change-lang">');

		for (let iso in Languages.PossibleLanguages) {
			if (!Languages.PossibleLanguages.hasOwnProperty(iso)) {
				break;
			}

			dp.push('<option value="' + iso + '"' + (MainParser.Language === iso ? ' selected' : '') + '>' + Languages.PossibleLanguages[iso] + '</option>');
		}

		dp.push('</select>');

		$('#SettingsBoxBody').on('change', '#change-lang', function () {
			let uLng = $(this).val();

			localStorage.setItem('user-language', uLng);

			location.reload();
		});

		return dp.join('');
	},


	/**
	 *	Erzeugt in Input Feld
	 *
	 * @returns {null|undefined|jQuery}
	 */
	 MenuInputLength: () => {
		let ip = $('<input />').addClass('setting-input').attr({
			type: 'number',
			id: 'menu-input-length',
			step: 1,
			min: 2
		}),
		value = localStorage.getItem('MenuLength');
		
		ip[0].defaultValue = ip[0].value = value;

		if (null !== value) {
			ip.val(value);
		}

		$('#SettingsBox').on('keyup', '#menu-input-length', function () {
			let value = $(this).val();

			if (value > 0) {
				localStorage.setItem('MenuLength', value);
			} else {
				localStorage.removeItem('MenuLength');
			}

			_menu.SetMenuHeight(true);
		});

		return ip;
	},


	GexStockWarning: () => {
		let ip = $('<input />').addClass('setting-input').attr({
			type: 'number',
			id: 'GexStockWarningInput',
			step: 1,
			min: 0,
			max: 100
		}),
		value = JSON.parse(localStorage.getItem('GexStockWarningMin')||"100");
		
		ip[0].defaultValue = ip[0].value = value;
		ip.val(value);
	
		$('#SettingsBox').on('keyup', '#GexStockWarningInput', function () {
			let value = $(this).val();

			if (value >= 0 && value <= 100) {
				localStorage.setItem('GexStockWarningMin', value);
			} else {
				localStorage.setItem('GexStockWarningMin', 100);
				$(this).val(100)
			}
		});

		return ip;
	},
	
	/**
	 *	Erzeugt in Input Feld
	 *
	 * @returns {null|undefined|jQuery}
	 */
	doubleFPtimeout: () => {
		let ip = $('<input />').addClass('setting-input').attr({
			type: 'number',
			id: 'doubleFPtimeoutinput',
			step: 1,
			min: 0
		}),
		value = localStorage.getItem('doubleFPtimeout');
		ip[0].defaultValue = ip[0].value = value;

		if (null !== value) {
			ip.val(value);
		}

		$('#SettingsBox').on('keyup', '#doubleFPtimeoutinput', function () {
			let value = Number($(this).val());
			if (value > 0) {
				localStorage.setItem('doubleFPtimeout', value);
			} else {
				localStorage.removeItem('doubleFPtimeout');
			}

		});

		return ip;
	},


	/**
	 * Add all the buttons you need
	 */
	MenuContent: () => {
		let bl = $('<div />'),
			menuItems = Array.from(_menu.Items),
			HiddenItems = localStorage.getItem('MenuHiddenItems'),
			hiddenArray = [];

		// Reattach already hidden icons
		if (HiddenItems !== null) {
			hiddenArray = JSON.parse(HiddenItems);
			menuItems.push(...hiddenArray);
		}

		for (let i in menuItems)
		{
			if (!menuItems.hasOwnProperty(i)) {
				break;
			}

			const name = menuItems[i];

			// exclude settings
			if(name === 'settings'){
				continue;
			}

			// is there a function?
			if (_menu[name + '_Btn'])
			{
				let btnBG = $('<div />')
					.attr({ id: `setting-${name}-Btn` })
					.addClass('hud-btn')
					.addClass(hiddenArray.includes(name) ? 'hud-btn-red' : '');

				let btn = $(`<span onclick="_menu.ToggleItemVisibility('${name}')"></span>`);
		
				btnBG.append(btn);
				bl.append(btnBG);
			}
		}

		return bl.html();
	},


	/**
	 *	Erzeugt ein Input Feld
	 *
	 * @returns {null|undefined|jQuery}
	 */
	InfoboxInputEntryCount: () => {
		let ip = $('<input />').addClass('setting-input').attr({
			type: 'number',
			id: 'infobox-entry-length',
			step: 1,
			min: 1
		}),
		value = localStorage.getItem('EntryCount') || 0;
		ip[0].defaultValue = ip[0].value = value;

		localStorage.setItem('EntryCount', value);

		$('#SettingsBox').on('keyup', '#infobox-entry-length', function () {
			let value = $(this).val();

			if (value > 0) {
				localStorage.setItem('EntryCount', value);
			} else {
				localStorage.setItem('EntryCount', 0);
			}

			Infoboard.MaxEntries = value;
		});

		return ip;
	},


	NotificationView: () => {
		let elements = [],
			settingPos = localStorage.getItem('NotificationsPosition'),
			positions = [
				'bottom-left',
				'bottom-right',
				'top-right',
				'top-left',
				'bottom-center',
				'top-center',
				'mid-center'
			];

		if (!settingPos) {
			settingPos = 'bottom-right';
		}

		elements.push('<select class="setting-dropdown" id="notification-position">');

		for (let pos in positions) {
			if (!positions.hasOwnProperty(pos)) { break; }

			elements.push(`<option value="${positions[pos]}"${(settingPos === positions[pos] ? ' selected' : '')}>${i18n('Menu.Notification.Position.' + positions[pos])}</option>`);
		}

		elements.push('</select>');

		$('#SettingsBoxBody').on('change', '#notification-position', function () {
			$('.jq-toast-wrap').remove();

			let pos = $(this).val();

			localStorage.setItem('NotificationsPosition', pos);

			$.toast({
				heading: i18n('Settings.NotificationPosition.ToastTestHeader'),
				text: i18n('Settings.NotificationPosition.ToastTestBody'),
				icon: 'success',
				hideAfter: 6000,
				position: pos,
				extraClass: localStorage.getItem('SelectedMenu') || 'RightBar',
				afterHidden: function () {
					$('.jq-toast-wrap').remove();
				}
			});
		});

		return elements.join('');
	},


	NotificationStack: ()=> {
		let ip = $('<input />').addClass('setting-input').attr({
				type: 'number',
				id: 'toast-amount',
				step: 1,
				min: 1
			}),
			value = localStorage.getItem('NotificationStack');

		if (null !== value) {
			ip[0].defaultValue = ip[0].value = value;
			ip.val(value);
		}

		$('#SettingsBox').on('keyup', '#toast-amount', function () {
			let value = $(this).val();

			if (value > 0) {
				localStorage.setItem('NotificationStack', value);

			} else {
				localStorage.removeItem('NotificationStack');
			}
		});

		return ip;
	},


	ApiTokenInput: ()=> {
		let ip = $('<input />').addClass('setting-input').attr({
				type: 'text',
				id: 'api-token',
				style: 'width:20em',
				spellcheck: 'false',
			}),
			token = localStorage.getItem('ApiToken');

		if (token !== null) {
			ip[0].defaultValue = ip[0].value = token;
			ip.val(token);
		}

		$('#SettingsBox').on('keyup blur', '#api-token', function () {
			let value = $(this).val();

			if (value !== '') {
				if(value.length !== 36) {
					HTML.ShowToastMsg({
						head: i18n('Boxes.Settings.ApiTokenLengthWrongHeader'),
						text: [
							i18n('Boxes.Settings.ApiTokenLengthWrongBody')
						],
						type: 'error',
						hideAfter: 10000,
					});
				}
				else {
					localStorage.setItem('ApiToken', value);
				}

			} else {
				localStorage.removeItem('ApiToken');
			}
		});

		return ip;
	},
};

Settings.Init(); // May be called here, as no other modules are required. config.json should be loaded by StartUp
