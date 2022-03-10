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
let ScArray=[];
const loadBeta = JSON.parse(localStorage.getItem('LoadBeta')) || false;
localStorage.setItem('LoadBeta', 'false');
if (loadBeta) {
	let now = new Date();
	fetch("https://api.github.com/repos/mainIine/foe-helfer-extension/branches/beta?" + now)
		.then(response => {if (response.status === 200) {response.json()
		.then((data) => {inject(true,
								'https://cdn.jsdelivr.net/gh/mainIine/foe-helfer-extension@' + (data?.commit?.sha || 'beta') + '/', 
								(data?.commit?.commit?.committer?.date || ""
						))})}});
} else {
	inject();
}

function inject (loadBeta = false, extUrl = chrome.extension.getURL(''), betaDate='') {
	/**
	 * Loads a JavaScript in the website. The returned promise will be resolved once the code has been loaded.
	 * @param {string} src the URL to load
	 * @returns {Promise<void>}
	 */
	function promisedLoadCode(src, append=true) {
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

			if (append) {
				while (!document.head && !document.documentElement) await new Promise((resolve) => {
					// @ts-ignore
					requestIdleCallback(resolve);
				});
				(document.head || document.documentElement).appendChild(sc);
			} else {
				ScArray.push(sc);
				resolve();
			}
		});
	}
	
	async function append(sc) {
		return await new Promise(async () => {
			while (!document.head && !document.documentElement) await new Promise((resolve) => {
				// @ts-ignore
				requestIdleCallback(resolve);
			});
			(document.head || document.documentElement).appendChild(sc);
		});
	}

	async function loadJsonResource(file) {
		const response = await fetch(file);
		if (response.status !== 200) {
			throw "Error loading json file "+file;
		}
		return response.json();
	}

	// check whether jQuery has been loaded in the DOM
	// => Catch jQuery Loaded event
	const jQueryLoading = new Promise(resolve => {
		window.addEventListener('foe-helper#jQuery-loaded', evt => {
			resolve();
		}, {capture: false, once: true, passive: true});
	});

	
	const v = chrome.runtime.getManifest().version + (loadBeta ? '-beta-'+ betaDate:'');

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

	InjectCode(loadBeta, extUrl);


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
				css.href = extUrl + `css/web/${cssFiles[i]}.css?v=${v}`;
				css.rel = 'stylesheet';
				document.head.appendChild(css);
			}

			clearInterval(tid);
		}
	}

	async function InjectCode(loadBeta, extUrl) {
	 	try {
			// set some global variables
			let script = document.createElement('script');
			script.innerText = `
				const extID='${chrome.runtime.id}',
					extUrl='${extUrl}',
					GuiLng='${lng}',
					extVersion='${v}',
					devMode=${!('update_url' in chrome.runtime.getManifest())},
					loadBeta=${loadBeta};
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
			// start loading both script-lists
			const vendorListPromise = loadJsonResource(`${extUrl}js/vendor.json`);
			const scriptListPromise = loadJsonResource(`${extUrl}js/internal.json`);

			// load the main
			await promisedLoadCode(`${extUrl}js/web/_main/js/_main.js`);

			// wait for ant and i18n to be loaded
			await jQueryLoading;

			// load all vendor scripts first (unknown order)
			const vendorScriptsToLoad = await vendorListPromise;
			await Promise.all(vendorScriptsToLoad.map(vendorScript => promisedLoadCode(`${extUrl}vendor/${vendorScript}.js?v=${v}`)));
			window.dispatchEvent(new CustomEvent('foe-helper#vendors-loaded'));

			// load scripts (one after the other)
			const internalScriptsToLoad = await scriptListPromise;

			for (let i = 0; i < internalScriptsToLoad.length; i++){
				await promisedLoadCode(`${extUrl}js/web/${internalScriptsToLoad[i]}/js/${internalScriptsToLoad[i]}.js?v=${v}`, false);
			}
			for (let sc of ScArray) {
				append(sc);
			}
					
			window.dispatchEvent(new CustomEvent('foe-helper#loaded'));

			localStorage.setItem('LoadBeta', JSON.stringify(loadBeta));
		} catch (err) {
			// make sure that the packet buffer in the FoEproxy does not fill up in the event of an incomplete loading.
			window.dispatchEvent(new CustomEvent('foe-helper#error-loading'));
		}
	}

}
	// End of the separation from the global scope
}
