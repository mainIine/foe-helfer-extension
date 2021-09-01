/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

// separate code from global scope
{

	/**
	 * Loads a JavaScript in the website. The returned promise will be resolved once the code has been loaded.
	 * @param {string} src the URL to load
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


	// check whether jQuery has been loaded in the DOM
	// => Catch jQuery Loaded event
	const jQueryLoading = new Promise(resolve => {
		window.addEventListener('foe-helper#jQuery-loaded', evt => {
			resolve();
		}, {capture: false, once: true, passive: true});
	});


	const v = chrome.runtime.getManifest().version;

	let   lng = chrome.i18n.getUILanguage();
	const uLng = localStorage.getItem('user-language');

	// we only need the first part
	if (lng.indexOf('-') > 0) {
		lng = lng.split('-')[0];
	}

	// is there a translation?
	if (Languages.PossibleLanguages[lng] === undefined) {
		lng = 'en';
	}

	if (uLng !== null){
		lng = uLng;
	} else {
		// so that the language can be read out without having to change it once via the settings
		localStorage.setItem('user-language', lng);
	}

	InjectCode();


	let tid = setInterval(InjectCSS, 0);
	function InjectCSS() {
		// Document loaded
		if(document.head !== null){
			let MenuSetting = localStorage.getItem('SelectedMenu');
			MenuSetting = MenuSetting ? MenuSetting : 'BottomBar';
			let cssname = "_menu_" + MenuSetting.toLowerCase().replace("bar","");

			let cssFiles = [
				'variables',
				'goods',
				cssname,
				'boxes'
			];

			// insert stylesheet
			for(let i in cssFiles)
			{
				if(!cssFiles.hasOwnProperty(i)) {
					break;
				}

				let css = document.createElement('link');
				css.href = chrome.extension.getURL(`css/web/${cssFiles[i]}.css?v=${v}`);
				css.rel = 'stylesheet';
				document.head.appendChild(css);
			}

			clearInterval(tid);
		}
	}

	async function InjectCode() {
		try {
			// set some global variables
			let script = document.createElement('script');
			script.innerText = `
				const extID='${chrome.runtime.id}',
					extUrl='${chrome.extension.getURL('')}',
					GuiLng='${lng}',
					extVersion='${v}',
					devMode=${!('update_url' in chrome.runtime.getManifest())};
			`;
			(document.head || document.documentElement).appendChild(script);
			// The script was (supposedly) executed directly and can be removed again.
			script.remove();
			// Firefox does not support direct communication with background.js but API injections
			// So the the messages have to be forwarded and this exports an API-Function to do so
			if (!chrome.app && exportFunction && window.wrappedJSObject) {
				function callBgApi(data) {
					return new window.Promise(
						exportFunction(
							function (resolve, reject) {
								if (typeof data !== 'object' || typeof data.type !== 'string') {
									reject('invalid request, data has to be of sceme: {type: string, ...}');
									return;
								}
								// Note: the message is packed, so background.js knows it is an external message, even though it is sent by inject.js
								browser.runtime.sendMessage(chrome.runtime.id, {type: 'packed', data: data})
									.then(
										data => {
											resolve(cloneInto(data, window));
										},
										error => {
											console.error('FoeHelper BgAPI error', error);
											reject("An error occurred while sending the message to the extension");
										}
									);
							}
							, window
						)
					);
				}
				exportFunction(callBgApi, window, {defineAs: 'foeHelperBgApiHandler'});
			}
			
			// load the main
			await promisedLoadCode(chrome.extension.getURL(`js/web/_main/js/_main.js?v=${v}`));

			// first wait for ant and i18n to be loaded
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
					'dexie/dexie.min',
					'dexie/dexie-export-import',
					'downloadjs/downloadjs.min'
				];

			// load all vendor scripts first (unknown order)
			await Promise.all(vendorScripts.map(vendorScript => promisedLoadCode(`${extURL}vendor/${vendorScript}.js?v=${v}`)));

			window.dispatchEvent(new CustomEvent('foe-helper#vendors-loaded'));

			const s = [
				'_languages',
				'_helper',
				'_menu',
				'_menu_bottom',
				'_menu_right',
				'_menu_box',
				'indexdb',
				'kits',
				'outposts',
				'calculator',
				'infoboard',
				'productions',
				'part-calc',
				'unit',
				'alerts',
				'guildfights',
				'gvg',
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
				'notice',
				'inventory-tracker',
				'treasury',
				'market',
				'bluegalaxy',
				'eventhandler',
				'fp-collector',
				'unit-gex',
				'maptradewarning',
				'guildmemberstat',
				'quests',
				'gexstat',
				'dbexport'
			];

			// load scripts (one after the other)
			for (let i = 0; i < s.length; i++)
			{
				await promisedLoadCode(`${extURL}js/web/${s[i]}/js/${s[i]}.js?v=${v}`);
			}

			window.dispatchEvent(new CustomEvent('foe-helper#loaded'));

		} catch (err) {
			// make sure that the packet buffer in the FoEproxy does not fill up in the event of an incomplete loading.
			window.dispatchEvent(new CustomEvent('foe-helper#error-loading'));
		}
	}

	// End of the separation from the global scope
}
