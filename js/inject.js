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

const v = chrome.runtime.getManifest().version;

/**
 * 
 * @param {string} src
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
		
		while (!document.head && !document.documentElement) await new Promise((resolve) => requestIdleCallback(resolve));

		(document.head || document.documentElement).appendChild(sc);
	});
}



let antLoadpromise = promisedLoadCode(chrome.extension.getURL('js/web/_main/js/_main.js?v=' + v));

let tid = setInterval(InjectCSS, 0),
	PossibleLangs = ['de','en','fr','es','ru'],
	lng = chrome.i18n.getUILanguage(),
	uLng = localStorage.getItem('user-language');

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

if(uLng !== null){
	lng = uLng;
}

let i18nJSLoadpromise = promisedLoadCode(chrome.extension.getURL('js/web/i18n/' + lng + '.js?v=' + v));


// prüfen ob jQuery im DOM geladen wurde
function checkForjQuery(){
	if (typeof jQuery === undefined){
		requestIdleCallback(checkForjQuery);
	} else {
		antLoadpromise.then(InjectCode);
	}
}
requestIdleCallback(checkForjQuery);


function InjectCSS()
{
	// Dokument geladen
	if(document.head !== null){

		let script = document.createElement('script');

		script.innerText = "let extID='"+ chrome.runtime.id +"',extUrl='"+chrome.extension.getURL('')+"',GuiLng='" + lng + "',extVersion='"+ v +"',devMode=" + !('update_url' in chrome.runtime.getManifest()) + ";";
		document.head.appendChild(script);

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

async function InjectCode()
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
		'Sortable/Sortable.min',
		//'jedParser/jedParser'
	];

	// lade zunächst alle vendor-scripte (unbekannte reihenfolge)
	await Promise.all(vendorScripts.map(vendorScript => promisedLoadCode(extURL + 'vendor/' + vendorScript + '.js?v=' + v)));


	let s = [
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
if (!chrome.app) {
	// höre auf dem window objekt auf spezielle Nachrichten unter '<extID>#message'
	// und leite sie weiter wenn sie von dieser Seite kommen
	window.addEventListener(chrome.runtime.id+'#message', evt => {
		if (evt.srcElement === window) {
			try {
				chrome.runtime.sendMessage(chrome.runtime.id, evt.detail);
			} catch (err) {
				console.error('chrome', err);
			}
		}
	});
}
