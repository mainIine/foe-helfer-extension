/*
 * **************************************************************************************
 *
 * Dateiname:                 inject.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              01.02.19 14:20 Uhr
 * zu letzt bearbeitet:       01.02.19 14:20 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

// Werte aus dem Storage holen
chrome.storage.sync.get({
    guild_id: '',
    player_id: '',
    cost_calc: '',
    own_part: '',
	cost_active: ''

}, (items) => {

	let code = 'let cost_calc=' + (items.cost_calc || 0) + ",extID='"+ chrome.runtime.id + "'",
		script = document.createElement('script'),
		manifestData = chrome.runtime.getManifest(),
		v = manifestData.version;

	script.id = 'PlayerNumbers';
	script.innerText = code;
	(document.head || document.documentElement).appendChild(script);

	let s = [
		'menu',
		'ant',
		'helper',
		'calculator',
		'part-calc',
		'read-buildings',
		'strategy-points'
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

	let cp = document.createElement('script');
	cp.src = chrome.extension.getURL('vendor/clipboard/clipboard.min.js');
	cp.id = 'clipboard-script';
	cp.onload = function(){
		this.remove();
	};
	(document.head || document.documentElement).appendChild(cp);

	let momentJS = document.createElement('script');
	momentJS.src = chrome.extension.getURL('vendor/moment/moment-with-locales.min.js');
	momentJS.id = 'moment-script';
	momentJS.onload = function(){
		this.remove();
	};
	(document.head || document.documentElement).appendChild(momentJS);

	// Stylesheet einfügen
	let style = document.createElement('link');
	style.href = chrome.extension.getURL('css/web/style.css?v=' + v);
	style.id = 'ant-style';
	style.rel = 'stylesheet';
	(document.head || document.documentElement).appendChild(style);
});
