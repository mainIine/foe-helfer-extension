/*
 * **************************************************************************************
 *
 * Dateiname:                 settings.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       18.09.19, 15:28 Uhr
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
	},


	/**
	 * Box initiieren
	 */
	init: ()=> {

		if( $('#SettingsBox').length < 1 ){
			HTML.Box('SettingsBox', 'Einstellungen');
		}

		Settings.BuildBody();
	},


	/**
	 * Box zusammen setzen
	 *
	 * @constructor
	 */
	BuildBody: ()=> {

		for(let key in Settings.Preferrences)
		{
			if(Settings.Preferrences.hasOwnProperty(key))
			{
				let d = Settings.Preferrences[key],
					status = d['status'],
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

				let s = localStorage.getItem(key);

				if(s !== null){
					status = JSON.parse(s);
				}

				ct.text(d['title']);
				cd.html(d['desc']);
				cs.find('input.setting-check').attr('data-id', key).prop('checked', status);
				cs.find('.toogle-word').text( status === true ? 'Aktiv' : 'Inaktiv' );

				$('#SettingsBoxBody').append(
					c.append(ct).append( cr.append(cd).append(cs) )
				)
			}
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

		$(el).prev().text( v === true ? i18n['Settings']['active'] : i18n['Settings']['inactive'] );
	},


	GetSetting: (name)=> {
		let s = localStorage.getItem(name);

		if(s !== null){
			return JSON.parse(s);
		} else {
			return Settings.Preferrences[name]['status'];
		}
	}
};
