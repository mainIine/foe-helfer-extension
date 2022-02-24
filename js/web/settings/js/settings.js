/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
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
 * @type {{Help: (function(): string), NotificationView: (function(): string), GetSetting: ((function(*, *=): *)|*), MenuSelected: (function(): string), BoxGroups: string[], BuildBox: Settings.BuildBox, About: (function(): string), StoreSettings: Settings.StoreSettings, InfoboxInputEntryCount: (function(): *|jQuery), VersionInfo: (function(): string), Init: Settings.Init, ExportView: (function(): string), MenuInputLength: (function(): *|jQuery), NotificationStack: (function(): *|jQuery), ImportSettings: Settings.ImportSettings, LoadConfig: Settings.LoadConfig, BuildBody: Settings.BuildBody, ResetBoxCoords: Settings.ResetBoxCoords, DrivePermissions: (function(): string), LanguageDropdown: (function(): string), Preferences: null, MenuContent: (function(): *), ExportSettings: Settings.ExportSettings}}
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
		'Sending',
		'Boxes',
		'Extension'
	],

	/**
	 * load the settings from the json
	 *
	 * @param start
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

			// CSS in den DOM prügeln
			HTML.AddCssFile('settings');

			HTML.Box({
				id: 'SettingsBox',
				title: i18n('Boxes.Settings.Title'),
				auto_close: true
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
					cs = $('<div />').addClass('setting').append(
						$('<span />').addClass('check').append(
							$('<span />').addClass('toogle-word')
						).append(
							$('<input class="setting-check game-cursor" type="checkbox" />')
						)
					);

				if ("SelectedMenu" !== d['name'] && 'NotificationsPosition' !== d['name']) {

					let s = localStorage.getItem(d['name']);

					if (s !== null) {
						status = JSON.parse(s);
					}
				}

				if (d['callback'] !== undefined) {
					cs.html(Settings[d['callback']]());

				}
				else if (status === undefined) {
					let b = $('<span />').addClass('button-wrapper').append(
						$(`<button class="btn-default" id="${button}" onclick="Settings.${button}()">${i18n('Settings.' + d['name'] + '.Button')}</button>`)
					);

					cs.html(b);
				}

				cd.html(i18n(`Settings.${d['name']}.Desc`));
				ct.text(i18n(`Settings.${d['name']}.Title`));
				cs.find('input.setting-check').attr('data-id', d['name']);
				if (status) {
					cs.find('input.setting-check').attr('checked', '');
				}
				cs.find('.check').addClass(status ? '' : 'unchecked');
				cs.find('.toogle-word').text(status ? i18n('Boxes.Settings.Active') : i18n('Boxes.Settings.Inactive'));

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
				return Settings.Preferences.find(itm => itm['name'] === name)['status'];
			}
		}
	},


	/**
	 * Version number and Player Info 
	 *
	 * @returns {string}
	 */
	VersionInfo: () => {

		return `<p>${i18n('Settings.Version.Link').replace('__version__', extVersion)}</p>
				<dl class="info-box">
					<dt>${i18n('Settings.Version.Title')}</dt><dd>${extVersion}</dd>
					<dt>${i18n('Settings.Version.PlayerId')}</dt><dd>${ExtPlayerID}</dd>
					<dt>${i18n('Settings.Version.GuildId')}</dt><dd>${(ExtGuildID ? ExtGuildID : 'N/A')}</dd>
					<dt>${i18n('Settings.Version.World')}</dt><dd>${ExtWorld}</dd>
				</dl>`;
	},


	/**
	 * View for Export-Import
	 *
	 * @returns {string}
	 * @constructor
	 */
	ExportView: () => {
		return `<p><button class="btn-default" onclick="DBExport.BuildBox()">${i18n('Settings.ExportSettings.OpenImportExportTool')}</button></p>`;
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
			'<p>' + i18n('Settings.About.TranslateDesc') + ' <a href="http://i18n.foe-helper.com/" target="_blank">Weblate</a></p>' +
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
			'<li><a href="https://discuss.foe-helper.com/" target="_blank"><span class="forums">&nbsp;</span>' + i18n('Settings.Help.Forums') + '</a></li>' +
			'<li><a href="https://discord.gg/z97KZq4" target="_blank"><span class="discord">&nbsp;</span>' + i18n('Settings.Help.Discord') + '</a></li>' +
			'<li><a href="https://github.com/mainIine/foe-helfer-extension/issues" target="_blank"><span class="github">&nbsp;</span>' + i18n('Settings.Help.Github') + '</a></li>' +
			'</ul>';
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


	DrivePermissions: () => {

		const jsScript = document.createElement('script')
		jsScript.src = 'https://apis.google.com/js/api.js'

		document.body.appendChild(jsScript);

		// Client ID and API key from the Developer Console
		const CLIENT_ID = '704447943704-pnmhlg152l3jvc57f4f2i8fi24ev5aof.apps.googleusercontent.com';
		const API_KEY = 'AIzaSyBD9_OBsIcHWj8swRwXWGVEOrZfLMssr9Q';

		// Array of API discovery doc URLs for APIs used by the quickstart
		const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

		// Authorization scopes required by the API; multiple scopes can be
		// included, separated by spaces.
		const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.write';

		const authorizeButton = document.getElementById('authorize_button');
		const signoutButton = document.getElementById('signout_button');

		/**
		 *  On load, called to load the auth2 library and API client library.
		 */
		function handleClientLoad() {
			gapi.load('client:auth2', initClient);
		}

		/**
		 *  Initializes the API client library and sets up sign-in state
		 *  listeners.
		 */
		function initClient() {
			gapi.client.init({
				apiKey: API_KEY,
				clientId: CLIENT_ID,
				discoveryDocs: DISCOVERY_DOCS,
				scope: SCOPES
			}).then(function () {
				// Listen for sign-in state changes.
				gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

				// Handle the initial sign-in state.
				updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
				authorizeButton.onclick = handleAuthClick;
				signoutButton.onclick = handleSignoutClick;
			}, function(error) {
				appendPre(JSON.stringify(error, null, 2));
			});
		}

		/**
		 *  Called when the signed in status changes, to update the UI
		 *  appropriately. After a sign-in, the API is called.
		 */
		function updateSigninStatus(isSignedIn) {
			if (isSignedIn) {
				authorizeButton.style.display = 'none';
				signoutButton.style.display = 'block';
				listFiles();
			} else {
				authorizeButton.style.display = 'block';
				signoutButton.style.display = 'none';
			}
		}

		/**
		 *  Sign in the user upon button click.
		 */
		function handleAuthClick(event) {
			gapi.auth2.getAuthInstance().signIn();
		}

		/**
		 *  Sign out the user upon button click.
		 */
		function handleSignoutClick(event) {
			gapi.auth2.getAuthInstance().signOut();
		}

		/**
		 * Append a pre element to the body containing the given message
		 * as its text node. Used to display the results of the API call.
		 *
		 * @param {string} message Text to be placed in pre element.
		 */
		function appendPre(message) {
			let pre = document.getElementById('content');
			let textContent = document.createTextNode(message + "\n");
			pre.appendChild(textContent);
		}

		/**
		 * Print files.
		 */
		function listFiles() {
			gapi.client.drive.files.list({
				'pageSize': 10,
				'fields': "nextPageToken, files(id, name)"
			}).then(function(response) {
				appendPre('Files:');
				let files = response.result.files;
				if (files && files.length > 0) {
					for (let i = 0; i < files.length; i++) {
						let file = files[i];
						appendPre(file.name + ' (' + file.id + ')');
					}
				} else {
					appendPre('No files found.');
				}
			});
		}

		jsScript.addEventListener('load', () => {
			handleClientLoad()
		});

		return `<button id="authorize_button" style="display: none;" class="btn-default">Authorize</button>&nbsp;
		<button id="signout_button" style="display: none;" class="btn-default">Sign Out</button>
	
		<pre id="content" style="white-space: pre-wrap;"></pre>`;
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
				extraClass: localStorage.getItem('SelectedMenu') || 'bottombar',
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

		ip[0].defaultValue = ip[0].value = value;

		if (null !== value) {
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
};

Settings.Init(); // Darf hier aufgerufen werden, da keine anderen Module benötigt werden. config.json soll bis zum StartUp geladen sein
