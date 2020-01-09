/*
 * **************************************************************************************
 *
 * Dateiname:                 inject.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 13:50 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

// trenne Code vom Globalen Scope
{

/**
 * Lädt ein JavaScript in der Webseite. Der zurückgegebene Promise wird aufgelöst, sobald der code geladen wurde.
 * @param {string} src die zu ladende URL
 * @returns {Promise<void>} 
 */
function promisedLoadCode(src) {
	return new Promise(async (resolve, reject) => {
		let sc = document.createElement('script');
		sc.src = src;
		
		sc.addEventListener('load', function() {
			this.remove();
			resolve();
		});
		sc.addEventListener('error', function() {
			console.error('error loading script '+src);
			this.remove();
			reject();
		});
		
		while (!document.head && !document.documentElement) await new Promise((resolve) => {
			// @ts-ignore
			requestIdleCallback(resolve);
		});

		(document.head || document.documentElement).appendChild(sc);
	});
}




const v = chrome.runtime.getManifest().version;
let antLoadpromise = promisedLoadCode(chrome.extension.getURL('js/web/_main/js/_main.js?v=' + v));

const PossibleLangs = ['de','en','fr','es','ru'];
let   lng = chrome.i18n.getUILanguage();
const uLng = localStorage.getItem('user-language');

// wir brauchen nur den ersten Teil
if (lng.indexOf('-') > 0)
{
	lng = lng.split('-')[0];
}

// gibt es eine Übersetzung?
if (PossibleLangs.includes(lng) === false)
{
	lng = 'en';
}

if(uLng !== null){
	lng = uLng;
}

let i18nJSLoadpromise = promisedLoadCode(chrome.extension.getURL('js/web/i18n/' + lng + '.js?v=' + v));


// prüfen ob jQuery im DOM geladen wurde
function checkForjQuery(){
	if (typeof jQuery === undefined){
		// @ts-ignore
		requestIdleCallback(checkForjQuery);
	} else {
		InjectCode();
	}
}
checkForjQuery();


let tid = setInterval(InjectCSS, 0);
function InjectCSS() {
	// Dokument geladen
	if(document.head !== null){

		let script = document.createElement('script');

		script.innerText = `
			let extID='${chrome.runtime.id}',
				extUrl='${chrome.extension.getURL('')}',
				GuiLng='${lng}',
				extVersion='${v}',
				devMode=${!('update_url' in chrome.runtime.getManifest())};
		`;
		document.head.appendChild(script);
		// Das script wurde direkt ausgeführt und kann wieder entfernt werden.
		script.remove();

		let cssFiles = [
			'goods',
			'style-menu',
			'boxes'
		];

		// Stylesheet einfügen
		for(let i in cssFiles)
		{
			if(!cssFiles.hasOwnProperty(i)) {
				break;
			}

			let css = document.createElement('link');
			css.href = chrome.extension.getURL('css/web/' + cssFiles[i] + '.css?v=' + v);
			css.rel = 'stylesheet';
			document.head.appendChild(css);
		}

		clearInterval(tid);
	}
}

async function InjectCode() {

	// warte zunächst, dass ant und i18n geladen sind
	await Promise.all([antLoadpromise, i18nJSLoadpromise]);

	const extURL = chrome.extension.getURL('');
	const vendorScripts = [
		'moment/moment-with-locales.min',
		'CountUp/jquery.easy_number_animate.min',
		'clipboard/clipboard.min',
		'Tabslet/jquery.tabslet.min',
		'ScrollTo/jquery.scrollTo.min',
		'jQuery/jquery-resizable.min',
		'tooltip/tooltip',
		'tableSorter/table-sorter',
		'Sortable/Sortable.min',
		'jsZip/jszip.min',
		//'jedParser/jedParser'
	];

	// lade zunächst alle vendor-scripte (unbekannte reihenfolge)
	await Promise.all(vendorScripts.map(vendorScript => promisedLoadCode(extURL + 'vendor/' + vendorScript + '.js?v=' + v)));


	const s = [
		'helper',
		'_menu',
		'tavern',
		'outposts',
		'calculator',
		'infoboard',
		'productions',
        'part-calc',
        'unit',
		'guildfights',
		'notes',
		'campagnemap',
        'technologies',
        'negotiation',
		'read-buildings',
		'settings',
		'strategy-points',
		'citymap'
	];

	// Scripte laden (nacheinander)
	for (let i = 0; i < s.length; i++) {
		await promisedLoadCode(extURL + 'js/web/' + s[i] + '/js/' + s[i] + '.js?v=' + v);
	}

	window.dispatchEvent(new CustomEvent('foe-helper#loaded'));
}

// Firefox unterstützt keine direkte kommunikation mit background.js
// also müssen die Nachrichten weitergeleitet werden.
// @ts-ignore
if (!chrome.app) {
	// höre auf dem window objekt auf spezielle Nachrichten unter '<extID>#message'
	// und leite sie weiter wenn sie von dieser Seite kommen
	window.addEventListener(chrome.runtime.id+'#message', (/** @type {CustomEvent} */ evt) => {
		if (evt.srcElement === window) {
			try {
				chrome.runtime.sendMessage(chrome.runtime.id, evt.detail);
			} catch (err) {
				console.error('chrome', err);
			}
		}
	});
}

// ende der Trennung vom Globalen Scope
}
