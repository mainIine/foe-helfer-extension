/*
 * **************************************************************************************
 *
 * Dateiname:                 popup.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       08.07.19 13:12 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

$(function(){
	$('body').on('click', '.foe-link', ()=> {
		chrome.tabs.create({url: "https://foe-rechner.de/"});
	});

	$('body').on('click', '.paypal-link', ()=> {
		chrome.tabs.create({url: "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=CNZWYJWRFY3T2&source=url"});
	});
});

