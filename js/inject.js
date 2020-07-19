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


	// prüfen ob jQuery im DOM geladen wurde
	// => jQuery Loaded event abfangen
	const jQueryLoading = new Promise(resolve => {
		window.addEventListener('foe-helper#jQuery-loaded', evt => {
			resolve();
		}, {capture: false, once: true, passive: true});
	});


	const v = chrome.runtime.getManifest().version;

	let   lng = chrome.i18n.getUILanguage();
	const uLng = localStorage.getItem('user-language');

	// wir brauchen nur den ersten Teil
	if (lng.indexOf('-') > 0) {
		lng = lng.split('-')[0];
	}

	// gibt es eine Übersetzung?
	if (Languages.PossibleLanguages[lng] === undefined) {
		lng = 'en';
	}

	if (uLng !== null){
		lng = uLng;
	} else {
		// damit man die sprache auslesen kann ohne diese über die einstellungen einmal ändern zu müssen
		localStorage.setItem('user-language', lng);
	}

	InjectCode();


	let tid = setInterval(InjectCSS, 0);
	function InjectCSS() {
		// Dokument geladen
		if(document.head !== null){

			let cssFiles = [
				'colors',
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
		try {
			// setze einige globale Variablen
			let script = document.createElement('script');
			script.innerText = `
				const extID='${chrome.runtime.id}',
					extUrl='${chrome.extension.getURL('')}',
					GuiLng='${lng}',
					extVersion='${v}',
					devMode=${!('update_url' in chrome.runtime.getManifest())};
			`;
			(document.head || document.documentElement).appendChild(script);
			// Das script wurde (angeblich) direkt ausgeführt und kann wieder entfernt werden.
			script.remove();

			// lade die main
			await promisedLoadCode(chrome.extension.getURL('js/web/_main/js/_main.js?v=' + v));

			// warte zunächst, dass ant und i18n geladen sind
			await jQueryLoading;


			const extURL = chrome.extension.getURL(''),
				vendorScripts = [
					'i18njs/i18njs.min',
					'moment/moment-with-locales.min',
					'CountUp/jquery.easy_number_animate.min',
					'Tabslet/jquery.tabslet.min',
					'ScrollTo/jquery.scrollTo.min',
					'jQuery/jquery-resizable.min',
					'jQuery/jquery-ui.min',
					'jQuery/jquery.toast',
					'tooltip/tooltip',
					'tableSorter/table-sorter',
					'Sortable/Sortable.min',
					'jsZip/jszip.min',
					'date-range/lightpick',
					'lit-html/lit-html.bundle.min',
					'SimpleMarkdown/simple-markdown.min',
					'dexie/dexie.min', // indexDB helper lib
				];

			// lade zunächst alle vendor-scripte (unbekannte reihenfolge)
			await Promise.all(vendorScripts.map(vendorScript => promisedLoadCode(extURL + 'vendor/' + vendorScript + '.js?v=' + v)));

			window.dispatchEvent(new CustomEvent('foe-helper#vendors-loaded'));

			const s = [
				'_languages',
				'_helper',
				'_api',
				'_menu',
				'indexdb',
				'kits',
				'tavern',
				'outposts',
				'calculator',
				'infoboard',
				'productions',
				'part-calc',
				'unit',
				'guildfights',
				'stats',
				'campagnemap',
				'bonus-service',
				'technologies',
				'negotiation',
				'eventchests',
				'settings',
				'investment',
				'strategy-points',
				'battle-assist',
				'citymap',
				'hidden-rewards',
				'greatbuildings',
				'alerts',
				'notice',
				'inventory-tracker',
				'ws-chat',
				'treasury',
				'market',
			];

			// Scripte laden (nacheinander)
			for (let i = 0; i < s.length; i++) {
				await promisedLoadCode(extURL + 'js/web/' + s[i] + '/js/' + s[i] + '.js?v=' + v);
			}

			window.dispatchEvent(new CustomEvent('foe-helper#loaded'));

			// Wenn #content Verfügbar ist, wurde ein Flash-Inhalt geladen...
			let IsForum = false;
			if (window !== undefined && window.location !== undefined && window.location.pathname !== undefined && window.location.pathname.includes('forum')) {
				IsForum = true;
            }

			if (document.getElementById('content') && !IsForum ){
				alert('You installed the FoE Helper but didn\'t switch the game to HTML5. Check that in your game settings!.');
			}

		} catch (err) {
			// stelle sicher, dass bei einem unvollständiges Laden nicht der paket-buffer im FoEproxy voll läuft.
			window.dispatchEvent(new CustomEvent('foe-helper#error-loading'));
		}
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

	// Ende der Trennung vom Globalen Scope
}
