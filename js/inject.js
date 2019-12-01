/*
 * **************************************************************************************
 *
 * Dateiname:                 inject.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       20.11.19, 17:07 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let ant = document.createElement('script'),
	manifestData = chrome.runtime.getManifest(),
	v = manifestData.version;

ant.src = chrome.extension.getURL('js/web/ant.js?v=' + v);
ant.id = 'ant-script';

ant.onload = function(){
	this.remove();
};


function checkForDOM() {
	if (document.body && document.head) {
		document.head.prepend(ant);
	} else {
		requestIdleCallback(checkForDOM);
	}
}
requestIdleCallback(checkForDOM);



let tid = setInterval(InjectCSS, 0),
	PossibleLangs = ['de','en','fr'],
	lng = chrome.i18n.getUILanguage();


// wir brauchen nur den ersten Teil
if(lng.indexOf('-') > 0)
{
	lng = lng.split('-')[0];
}

// gibt es eine Übersetzung?
if(PossibleLangs.includes(lng) === false)
{
	lng = 'en';
}


let i18nJS = document.createElement('script');
i18nJS.src = chrome.extension.getURL('js/web/i18n/' + lng + '.js?v=' + v);
i18nJS.id = 'i18n-script';
i18nJS.onload = function(){
	this.remove();
};
(document.head || document.documentElement).appendChild(i18nJS);

// prüfen ob jQuery im DOM geladen wurde
function checkForjQuery(){
	if (typeof jQuery === undefined){
		requestIdleCallback(checkForjQuery);
	} else {
		InjectCode();
	}
}
requestIdleCallback(checkForjQuery);

function InjectCSS()
{
	// Dokument geladen
	if(document.head !== null){

		let script = document.createElement('script');

		script.innerText = "let extID='"+ chrome.runtime.id + "',GuiLng='" + lng + "',devMode=" + !('update_url' in chrome.runtime.getManifest()) + ";";
		document.head.appendChild(script);

		// Stylesheet einfügen
		let style = document.createElement('link');
		style.href = chrome.extension.getURL('css/web/style-menu.css?v=' + v);
		style.rel = 'stylesheet';
		document.head.appendChild(style);


		// Stylesheet einfügen
		let boxes = document.createElement('link');
		boxes.href = chrome.extension.getURL('css/web/boxes.css?v=' + v);
		boxes.rel = 'stylesheet';
		document.head.appendChild(boxes);

		clearInterval(tid);
	}
}

function InjectCode()
{
	let extURL = chrome.extension.getURL(''),
		vendorScripts = [
		'moment/moment-with-locales.min',
		'CountUp/jquery.easy_number_animate.min',
		'clipboard/clipboard.min',
		'Tabslet/jquery.tabslet.min',
		'ScrollTo/jquery.scrollTo.min',
		'jQuery/jquery-resizable.min',
		'tooltip/tooltip',
		'tableSorter/table-sorter',
		'jedParser/jedParser'
	];

	for (let vs in vendorScripts) {
		if (vendorScripts.hasOwnProperty(vs)) {
			let sc = document.createElement('script');
			sc.src = extURL + 'vendor/' + vendorScripts[vs] + '.js?v=' + v;
			sc.onload = function () {
				this.remove();
			};
			(document.head || document.documentElement).appendChild(sc);
		}
	}


	let s = [
		'helper',
		'menu',
		'tavern',
		'outposts',
		'calculator',
		'infoboard',
		'productions',
        'part-calc',
        'unit',
        'technologies',
        'negotiation',
		'read-buildings',
		'settings',
		'strategy-points',
		'citymap'
	];

	// Scripte laden
	for (let i in s) {
		if (s.hasOwnProperty(i)) {
			let sc = document.createElement('script');
			sc.src = extURL + 'js/web/' + s[i] + '.js?v=' + v;
			sc.onload = function () {
				this.remove();
			};
			(document.head || document.documentElement).appendChild(sc);
		}
	}
}

