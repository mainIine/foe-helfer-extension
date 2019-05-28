/*
 * **************************************************************************************
 *
 * Dateiname:                 settings.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       28.05.19 09:22 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

Settings = {

	/**
	 * Einstellungspunkte
	 */
	Preferrences: {
		SendTavernInfo : {
			status: false,
			title : 'Moppel Aktivität',
			desc : 'Sollen beim aufrufen der Events die Moppel-Aktivitäten übertragen werden?'
		},
		SendGildMemberLGInfo : {
			status: false,
			title: 'LG Daten anderer Gildenmitglieder',
			desc: 'Beim besuchen von anderen Gildenmitgliedern werden sämtliche LG Daten an foe-rechner.de geschickt'
		},
		ShowNeighborsGoods : {
			status: true,
			title: 'Nachbarschafts Ernte',
			desc: 'Beim Besuch anzeigen was derzeit produziert wird'
		},
	},


	/**
	 * Box initiieren
	 */
	init: ()=> {

		if( $('#SettingsBox').length < 1 ){
			HTML.Box('SettingsBox', 'Einstellungen');

			$('#SettingsBoxclose').bind('click', function(){
				$('#SettingsBox').remove();
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
				cd.text(d['desc']);
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

		$(el).prev().text( v === true ? 'Aktiv' : 'Inaktiv' );
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
