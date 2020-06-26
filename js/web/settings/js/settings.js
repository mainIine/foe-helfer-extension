/*
 * **************************************************************************************
 *
 * Dateiname:                 settings.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 14:31 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let Settings = {

	/**
	 * Einstellungspunkte
	 */
	Preferences: undefined,


	/**
 * Initialisiert das Preferences Dict
 * 
 * */
	InitPreferences: () => {
		Settings.Preferences = {
			Version: {
				callback: 'VersionInfo',
				title: i18n('Settings.Version.Title'),
				desc: HTML.i18nReplacer(i18n('Settings.Version.Desc'), {
					version: extVersion,
					language: (GuiLng === 'de' ? 'de' : 'en')
				})
			},
			GlobalSend: {
				status: true,
				title: i18n('Settings.GlobalSend.Title'),
				desc: i18n('Settings.GlobalSend.Desc')
			},
			SendTavernInfo: {
				status: false,
				title: i18n('Settings.SendTavernInfo.Title'),
				desc: i18n('Settings.SendTavernInfo.Desc')
			},
			SendGildMemberLGInfo: {
				status: false,
				title: i18n('Settings.SendGildMemberLGInfo.Title'),
				desc: i18n('Settings.SendGildMemberLGInfo.Desc')
			},
			SendGEXInfo: {
				status: true,
				title: i18n('Settings.SendGEXInfo.Title'),
				desc: i18n('Settings.SendGEXInfo.Desc')
			},
			ShowOwnPartOnAllGBs: {
				status: false,
				title: i18n('Settings.ShowOwnPartOnAllGBs.Title'),
				desc: i18n('Settings.ShowOwnPartOnAllGBs.Desc')
			},
			SendInvestigations: {
				status: false,
				title: i18n('Settings.SendInvestigations.Title'),
				desc: i18n('Settings.SendInvestigations.Desc')
			},
			ShowInvestments: {
				status: true,
				title: i18n('Settings.ShowInvestments.Title'),
				desc: i18n('Settings.ShowInvestments.Desc')
			},
			ShowTavernBadge: {
				status: true,
				title: i18n('Settings.ShowTavernBadge.Title'),
				desc: i18n('Settings.ShowTavernBadge.Desc')
			},
			AutomaticNegotiation: {
				status: true,
				title: i18n('Settings.AutomaticNegotiation.Title'),
				desc: i18n('Settings.AutomaticNegotiation.Desc')
			},
			ResetBoxPositions: {
				button: 'ResetBoxCoords',
				buttonText: i18n('Settings.ResetBoxPositions.Button'),
				title: i18n('Settings.ResetBoxPositions.Title'),
				desc: i18n('Settings.ResetBoxPositions.Desc')
			},
			MenuLength: {
				callback: 'MenuInputLength',
				title: i18n('Settings.MenuLength.Title'),
				desc: i18n('Settings.MenuLength.Desc')
			},
			ChangeLanguage: {
				callback: 'LanguageDropdown',
				title: i18n('Settings.ChangeLanguage.Title'),
				desc: i18n('Settings.ChangeLanguage.Desc')
			},
			/*
			CustomerApi : {
				status: false,
				callback: 'CustomerApiCheck',
				title : i18n('Settings.CustomerApi.Title'),
				desc : i18n('Settings.CustomerApi.Desc')
			}
			*/
		};
	},


	/**
	 * Box initiieren
	 */
	init: ()=> {
		if( $('#SettingsBox').length < 1 ){

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
	BuildBody: ()=> {

		$('#SettingsBoxBody').append(
			$('<div />').addClass('SettingsBoxBodyInner')
		);

		for(let key in Settings.Preferences)
		{
			if(!Settings.Preferences.hasOwnProperty(key)) {
				break;
			}

			let d = Settings.Preferences[key],
				status = d['status'],
				button = d['button'],
				c = $('<div />').addClass('item'),
				cr = $('<div />').addClass('item-row'),
				ct = $('<div />').addClass('title'),
				cd = $('<div />').addClass('desc'),
				cs = $('<div />').addClass('setting').append(
					$('<span />').addClass('check').append(
						$('<span />').addClass('toogle-word')
					).append(
						$('<input class="setting-check game-cursor" type="checkbox" />')
					)
				);

			let s = localStorage.getItem(key);

			if(s !== null){
				status = JSON.parse(s);
			}

			if(d['callback'] !== undefined) {
				cs.html( Settings[d['callback']]() );

			} else if(status === undefined){
				let b = $('<span />').addClass('button-wrapper').append(
					$('<button class="btn-default" id="' + button + '" onclick="Settings.' + button + '()">' + d['buttonText'] + '</button>')
				);

				cs.html(b);
			}

			ct.text(d['title']);
			cd.html(d['desc']);
			cs.find('input.setting-check').attr('data-id', key).prop('checked', status);
			cs.find('.check').addClass(status === true ? '' : 'unchecked');
			cs.find('.toogle-word').text( status === true ? i18n('Boxes.Settings.Active') : i18n('Boxes.Settings.Inactive') );

			$('.SettingsBoxBodyInner').append(
				c.append(ct).append( cr.append(cd).append(cs) )
			);
		}

		$('#SettingsBoxBody').on('click', 'input.setting-check', function(){
			Settings.StoreSettings($(this));
		});
	},


	/**
	 * Beim Klick speichern
	 *
	 * @param el
	 * @param changeText
	 */
	StoreSettings: (el, changeText = true)=> {
		let id = $(el).data('id'),
			v = $(el).prop('checked');

		localStorage.setItem(id, v);

		if(changeText === false){
			return;
		}

		$(el).prev().text( v === true ? i18n('Boxes.Settings.Active') : i18n('Boxes.Settings.Inactive') );

		if(v === true){
			$(el).closest('span.check').removeClass('unchecked');
		} else {
			$(el).closest('span.check').addClass('unchecked');
		}
	},


	/**
	 * Gibt den Status aus dem localStorage oder den Settings zurück
	 *
	 * @param name
	 * @returns {any}
	 */
	GetSetting: (name)=> {
		let s = localStorage.getItem(name);

		if(s !== null){
			return JSON.parse(s);
		} else {
			return Settings.Preferences[name]['status'];
		}
	},


	/**
	 * Versionsnummer ausgeben
	 *
	 * @returns {string}
	 */
	VersionInfo: ()=> {
		return '<dl>' +
					'<dt>' + i18n('Settings.Version.Title') + '</dt><dd>' + extVersion + '</dd>' +
					'<dt>' + i18n('Settings.Version.PlayerId') + '</dt><dd>' + ExtPlayerID + '</dd>' +
					'<dt>' + i18n('Settings.Version.GuildId') + '</dt><dd>' + ExtGuildID + '</dd>' +
					'<dt>' + i18n('Settings.Version.World') + '</dt><dd>' + ExtWorld + '</dd>' +
				'</dl>';
	},


	/**
	 * Funktion zum zurücksetzten aller Box-Koordiniaten
	 *
	 */
	ResetBoxCoords: ()=>{
		$.each(localStorage, function(key, value){
			if(key.toLowerCase().indexOf('cords') > -1){
				localStorage.removeItem(key);
			}
		});

		$('#ResetBoxCoords').addClass('btn-green');

		setTimeout(()=>{
			$('#ResetBoxCoords').removeClass('btn-green');
		}, 2000)
	},


	/**
	 * Sprachwechsler
	 *
	 * @returns {string}
	 */
	LanguageDropdown: ()=>{
		let dp = [];

		dp.push('<select class="setting-dropdown" id="change-lang">');

		for(let iso in Languages.PossibleLanguages)
		{
			if (!Languages.PossibleLanguages.hasOwnProperty(iso)){
				break;
			}

			dp.push('<option value="' + iso + '"' + (MainParser.Language === iso ? ' selected': '') + '>' + Languages.PossibleLanguages[iso] + '</option>');
		}

		dp.push('</select>');

		$('#SettingsBoxBody').on('change', '#change-lang', function(){
			let uLng = $(this).val();

			localStorage.setItem('user-language', uLng);

			location.reload();
		});

		return dp.join('');
	},


	CustomerApiCheck: ()=> {
		$('#SettingsBoxBody').on('change', '[data-id="CustomerApi"]', function(){
			location.reload();
		});
	},


	/**
	 *	Erzeugt in Input Feld
	 *
	 * @returns {null|undefined|jQuery}
	 */
	MenuInputLength: ()=> {
		let ip = $('<input />').addClass('setting-input').attr({
					type: 'number',
					id: 'menu-input-length',
					step: 1,
					min: 2
				}),
			value = localStorage.getItem('MenuLength');

		if(null !== value){
			ip.val(value);
		}

		$('#SettingsBox').on('keyup', '#menu-input-length', function(){
			let value = $(this).val();

			if(value > 0){
				localStorage.setItem('MenuLength', value);
			} else {
				localStorage.removeItem('MenuLength');
			}

			_menu.SetMenuHeight(true);
		});

		return ip;
	}
};
