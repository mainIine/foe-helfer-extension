/*
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * Licensed under AGPL - see LICENSE.md for details.
 */

let lng = window.navigator.language.split('-')[0];

let i18n = {
	'de' : {
		'title' : 'Forge Hammer',
		'intro' : "Eine inoffizielle Browser-Erweiterung für Forge of Empires.",
		'donate' : 'Spenden',
		'desc' : "Dir gefällt diese kostenlose Extension?<br> Jede kleine Spende ist immer gern gesehen.",
		'thanks' : 'Vielen Dank!'
	},
	'en' : {
		'title' : 'Forge Hammer',
		'intro' : "A thirdparty browser extension for Forge of Empires.",
		'donate' : 'Donate',
		'desc' : "Like this free extension? Every little donation is always welcome.",
		'thanks' : 'Thank you so much!'
	},
	'fr' : {
		'title' : 'Forge Hammer',
		'intro' : "Une extension de navigateur tierce pour Forge of Empires.",
		'donate' : 'Donate',
		'desc' : "Vous aimez cette petite extension? Chaque petite donation est toujours la bienvenue.",
		'thanks' : 'Merci beaucoup!'
	},
};

$(function(){

	$('body').on('click', '.paypal-link', ()=> {
		chrome.tabs.create({url: "#"});
	});

	// Set current year in footer
	const yearEl = document.getElementById('year');
	if (yearEl) {
		yearEl.textContent = String(new Date().getFullYear());
	}

	// Handle translations
	if(lng !== 'de'){
		$('[data-translate]').each(function(){
			let txt = $(this).data('translate');

			if( i18n[lng] && i18n[lng][txt] !== undefined ){
				$(this).html( i18n[lng][txt]);
			} else {
				$(this).html( i18n['en'][txt]);
			}
		});
	}
});
