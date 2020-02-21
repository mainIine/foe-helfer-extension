/*
 * **************************************************************************************
 *
 * Dateiname:                 popup.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       20.09.19, 11:02 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let lng = window.navigator.language.split('-')[0];

let i18n = {
	'de' : {
		'title' : 'FoE Helfer',
		'desc' : "Dir gefällt diese kleine kostenlose Extension und du möchtest sie supporten damit das weiterhin so bleibt?<br> Dann ist jede kleine Spende für Support immer gern gesehen.",
		'thanks' : 'Vielen Dank!'
	},
	'en' : {
		'title' : 'FoE Helper',
		'desc' : "You like this little free extension and you want to support it so that it stays that way? <br> Then every little donation for support is always welcome.",
		'thanks' : 'Thank you so much!'
	},
	'fr' : {
		'title' : 'FoE Assistant',
		'desc' : "Vous aimez cette petite extension gratuite et vous voulez la soutenir pour continuer ainsi ? <br> Chaque petite donation pour le support est toujours la bienvenue.",
		'thanks' : 'Merci beaucoup !'
	},
	'ru' : {
		'title' : 'FoE Помощник',
		'desc' : "Вам нравится это маленькое бесплатное расширение и вы хотите поддержать его, чтобы оно оставалось таким же? <br> Тогда каждое маленькое пожертвование в поддержку проекта всегда приветствуется.",
		'thanks' : 'Большое спасибо!'
	},
	'sv' : {
		'title' : 'FoE Assistant',
		'desc' : "Du kommer tycka om detta lilla gratis tillägg och stöd det så det kan fortsätta så? <br> Varje liten donation för support är välkommet.",
		'thanks' : 'Tack så mucket!'
	},
};

$(function(){
	$('body').on('click', '.foe-link', ()=> {
		chrome.tabs.create({url: "https://foe-rechner.de/"});
	});

	$('body').on('click', '.paypal-link', ()=> {
		chrome.tabs.create({url: "https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=CNZWYJWRFY3T2&source=url"});
	});

	if(lng !== 'de'){
		$('[data-translate]').each(function(){
			let txt = $(this).data('translate');

			if( i18n[lng][txt] !== undefined ){
				$(this).html( i18n[lng][txt]);
			} else {
				$(this).html( i18n['en'][txt]);
			}
		});
	}
});
