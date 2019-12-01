/*
 * **************************************************************************************
 *
 * Dateiname:                 settings.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       18.10.19, 11:14 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let Settings = {

	/**
	 * Einstellungspunkte
	 */
	Preferrences: {
		GlobalSend : {
			status: true,
			title : i18n['Settings']['GlobalSend']['Title'],
			desc : i18n['Settings']['GlobalSend']['Desc']
		},
		SendTavernInfo : {
			status: false,
			title : i18n['Settings']['SendTavernInfo']['Title'],
			desc : i18n['Settings']['SendTavernInfo']['Desc']
		},
		SendGildMemberLGInfo : {
			status: false,
			title : i18n['Settings']['SendGildMemberLGInfo']['Title'],
			desc : i18n['Settings']['SendGildMemberLGInfo']['Desc']
		},
		SendGEXInfo : {
			status: true,
			title : i18n['Settings']['SendGEXInfo']['Title'],
			desc : i18n['Settings']['SendGEXInfo']['Desc']
		},
		ShowNeighborsGoods : {
			status: true,
			title : i18n['Settings']['ShowNeighborsGoods']['Title'],
			desc : i18n['Settings']['ShowNeighborsGoods']['Desc']
		},
		SendInvestigations : {
			status: false,
			title : i18n['Settings']['SendInvestigations']['Title'],
			desc : i18n['Settings']['SendInvestigations']['Desc']
		},
		ShowTavernBadge : {
			status: true,
			title : i18n['Settings']['ShowTavernBadge']['Title'],
			desc : i18n['Settings']['ShowTavernBadge']['Desc']
		},
		ShowOutpost : {
			status: true,
			title : i18n['Settings']['ShowOutpost']['Title'],
			desc : i18n['Settings']['ShowOutpost']['Desc']
		},
		PreScanLGList : {
			status: false,
			title : i18n['Settings']['PreScanLGList']['Title'],
			desc : i18n['Settings']['PreScanLGList']['Desc']
		},
		CalculatorShowNegativ : {
			status: false,
			title : i18n['Settings']['CalculatorShowNegativ']['Title'],
			desc : i18n['Settings']['CalculatorShowNegativ']['Desc']
		},
		ResetBoxPositions : {
			button: 'ResetBoxCoords',
			buttonText: i18n['Settings']['ResetBoxPositions']['Button'],
			title : i18n['Settings']['ResetBoxPositions']['Title'],
			desc : i18n['Settings']['ResetBoxPositions']['Desc']
		},
		ChangeLanguage : {
			callback: 'LanguageDropdown',
			title : i18n['Settings']['ChangeLanguage']['Title'],
			desc : i18n['Settings']['ChangeLanguage']['Desc']
		}
	},


	/**
	 * Box initiieren
	 */
	init: ()=> {

		if( $('#SettingsBox').length < 1 ){

			HTML.Box({
				'id': 'SettingsBox',
				'title': i18n['Boxes']['Settings']['Title'],
				'auto_close': true
			});
		}

		Settings.BuildBody();
	},


	/**
	 * Box zusammen setzen
	 *
	 * @constructor
	 */
	BuildBody: ()=> {

		$('#SettingsBoxBody').append(
			$('<div />').addClass('SettingsBoxBodyInner')
		);

		for(let key in Settings.Preferrences)
		{
			if(!Settings.Preferrences.hasOwnProperty(key)) {
				break;
			}

			let d = Settings.Preferrences[key],
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
						$('<input class="setting-check" type="checkbox" />')
					)
				);


			if(d['callback'] !== undefined) {
				cs.html( Settings[d['callback']]() );

			} else {
				let s = localStorage.getItem(key);

				if(s !== null){
					status = JSON.parse(s);
				}

				if(status === undefined){
					let b = $('<span />').addClass('button-wrapper').append(
						$('<button class="btn-default" id="' + button + '" onclick="Settings.' + button + '()">' + d['buttonText'] + '</button>')
					);

					cs.html(b);
				}
			}


			ct.text(d['title']);
			cd.html(d['desc']);
			cs.find('input.setting-check').attr('data-id', key).prop('checked', status);
			cs.find('.check').addClass(status === true ? '' : 'unchecked');
			cs.find('.toogle-word').text( status === true ? i18n['Boxes']['Settings']['Active'] : i18n['Boxes']['Settings']['Inactive'] );

			$('.SettingsBoxBodyInner').append(
				c.append(ct).append( cr.append(cd).append(cs) )
			);
		}

		$('body').on('click', 'input.setting-check', function(){
			Settings.StoreSettings($(this));
		});
	},


	/**
	 * Beim Klick speichern
	 *
	 * @param el
	 * @constructor
	 */
	StoreSettings: (el)=> {
		let id = $(el).data('id'),
			v = $(el).prop('checked');

		localStorage.setItem(id, v);

		$(el).prev().text( v === true ? i18n['Boxes']['Settings']['Active'] : i18n['Boxes']['Settings']['Inactive'] );

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
	 * @constructor
	 */
	GetSetting: (name)=> {
		let s = localStorage.getItem(name);

		if(s !== null){
			return JSON.parse(s);
		} else {
			return Settings.Preferrences[name]['status'];
		}
	},


	/**
	 * Funktion zum zurücksetzten aller Box-Koordiniaten
	 *
	 * @constructor
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
	 * @constructor
	 */
	LanguageDropdown: ()=>{
		let dp = [];

		dp.push('<select class="setting-dropdown" id="change-lang">');

		for(let i in MainParser.PossibleLanguages)
		{
			if(!MainParser.PossibleLanguages.hasOwnProperty(i)){
				break;
			}

			let iso = MainParser.PossibleLanguages[i];

			dp.push('<option value="' + iso + '"' + (MainParser.Language === iso ? ' selected': '') + '>' + i18n['Settings']['ChangeLanguage']['Dropdown'][iso] + '</option>');
		}

		dp.push('</select>');

		$('body').on('change', '#change-lang', function(){
			let uLng = $(this).val();

			localStorage.setItem('user-language', uLng);

			location.reload();
		});

		return dp.join('');
	}
};
