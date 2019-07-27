/*
 * **************************************************************************************
 *
 * Dateiname:                 inject.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       25.07.19 10:59 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */


let code = "let extID='"+ chrome.runtime.id + "';",
	script = document.createElement('script'),
	manifestData = chrome.runtime.getManifest(),
	v = manifestData.version,
	PossibleLangs = ['de','en'];

script.innerText = code;
(document.head || document.documentElement).appendChild(script);

// Translation
let lang = window.navigator.language.split('-')[0];

// gibt es eine Übersetzung?
if(PossibleLangs.includes(lang) === false)
{
	lang = 'de';
}

let i18nJS = document.createElement('script');
i18nJS.src = chrome.extension.getURL('js/web/i18n/' + lang + '.js');
i18nJS.id = 'i18n-script';
i18nJS.onload = function(){
	this.remove();
};
(document.head || document.documentElement).appendChild(i18nJS);

let momentJS = document.createElement('script');
momentJS.src = chrome.extension.getURL('vendor/moment/moment-with-locales.min.js');
momentJS.id = 'moment-script';
momentJS.onload = function(){
	this.remove();
};
(document.head || document.documentElement).appendChild(momentJS);

let cp = document.createElement('script');
cp.src = chrome.extension.getURL('vendor/clipboard/clipboard.min.js');
cp.id = 'clipboard-script';
cp.onload = function(){
	this.remove();
};
(document.head || document.documentElement).appendChild(cp);


// Stylesheet einfügen
let style = document.createElement('link');
style.href = chrome.extension.getURL('css/web/style-menu.css?v=' + v);
style.rel = 'stylesheet';
(document.head || document.documentElement).appendChild(style);

// Stylesheet einfügen
let boxes = document.createElement('link');
boxes.href = chrome.extension.getURL('css/web/boxes.css?v=' + v);
boxes.rel = 'stylesheet';
(document.head || document.documentElement).appendChild(boxes);

setTimeout(()=>{
	let s = [
		'ant',
		'menu',
		'helper',
		'outpost',
		'tavern',
		'calculator',
		'part-calc',
		'read-buildings',
		'settings',
		'strategy-points',
	];

	// Scripte laden
	for(let i in s){
		if(s.hasOwnProperty(i)){
			let sc = document.createElement('script');
			sc.src = chrome.extension.getURL('js/web/' + s[i] + '.js?v=' + v);
			sc.id = s[i] + '-script';
			sc.onload = function(){
				this.remove();
			};
			(document.head || document.documentElement).appendChild(sc);
		}
	}
}, 800);
