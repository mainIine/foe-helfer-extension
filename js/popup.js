/*
 * *************************************************************************************
 *
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

let lng = window.navigator.language.split('-')[0];

let i18n = {
	'de' : {
		'title' : 'FoE Helfer',
		'intro' : "Eine inoffizielle Browser-Erweiterung für Forge of Empires.",
		'donate' : 'Spenden',
		'desc' : "Dir gefällt diese kostenlose Extension?<br> Jede kleine Spende ist immer gern gesehen.",
		'thanks' : 'Vielen Dank!'
	},
	'en' : {
		'title' : 'FoE Helper',
		'intro' : "A thirdparty browser extension for Forge of Empires.",
		'donate' : 'Donate',
		'desc' : "Like this free extension? Every little donation is always welcome.",
		'thanks' : 'Thank you so much!'
	},
	'fr' : {
		'title' : 'FoE Helper',
		'intro' : "Une extension de navigateur tierce pour Forge of Empires.",
		'donate' : 'Donate',
		'desc' : "Vous aimez cette petite extension? Chaque petite donation est toujours la bienvenue.",
		'thanks' : 'Merci beaucoup!'
	},
	'ru' : {
		'title' : 'FoE Helper',
		'intro' : "A thirdparty browser extension for Forge of Empires.",
		'donate' : 'Donate',
		'desc' : "Вам нравится это маленькое бесплатное расширение и вы хотите поддержать его, чтобы оно оставалось таким же? <br> Тогда каждое маленькое пожертвование в поддержку проекта всегда приветствуется.",
		'thanks' : 'Большое спасибо!'
	},
	'sv' : {
		'title' : 'FoE Helper',
		'intro' : "Ett webbläsartillägg från tredje part för Forge of Empires.",
		'donate' : 'Donate',
		'desc' : "Du kommer tycka om detta lilla gratis tillägg och stöd det så det kan fortsätta så? <br> Varje liten donation för support är välkommet.",
		'thanks' : 'Tack så mucket!'
	},
};

$(function(){
	// Open external links in new tab
	$('body').on('click', '.foe-link', ()=> {
		chrome.tabs.create({url: "https://foe-helper.com/"});
	});

	$('body').on('click', '.paypal-link', ()=> {
		chrome.tabs.create({url: "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=CNZWYJWRFY3T2&source=url"});
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
