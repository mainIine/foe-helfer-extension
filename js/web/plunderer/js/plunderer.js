/*
 * **************************************************************************************
 *
 * Dateiname:                 plunderer.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              07.04.20, 21:58 Uhr
 * zuletzt bearbeitet:        07.04.20, 15:46 Uhr
 *
 * Copyright © 2020
 *
 * **************************************************************************************
 */

let Plunderer = {
	/**
	 * Create html for DOM and inject
	 */
	Show: () => {

		if ($('#plunderer').length === 0) {
			let args = {
				'id': 'plunderer',
				'title': i18n('Boxes.Plunderer.Title'),
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			};

			HTML.Box(args);
			moment.locale(i18n('Local'));
		}

		$('#plundererBody').html(`Dieses Feature wurde deaktiviert`);
	},
};
