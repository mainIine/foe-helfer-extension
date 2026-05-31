/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
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
let scripts = {
	main: ["once", "primed"],
	vendor: ["once", "primed"],
	internal: ["once", "primed"]
};
	
function scriptLoaded (src, base) {
	scripts[base].splice(scripts[base].indexOf(src),1);
	if (scripts.internal.length == 1) {
		scripts.internal.splice(scripts.internal.indexOf("once"),1);
		window.dispatchEvent(new CustomEvent('foe-helper#loaded'));
	}
	if (scripts.main.length == 1) {
		scripts.main.splice(scripts.main.indexOf("once"),1);
		window.dispatchEvent(new CustomEvent('foe-helper#mainloaded'));
	}
	if (scripts.vendor.length == 1) {
		scripts.vendor.splice(scripts.vendor.indexOf("once"),1);
		window.dispatchEvent(new CustomEvent('foe-helper#vendors-loaded'));
	}
};

inject();

function inject (loadBeta = false, extUrl = chrome.runtime.getURL(''), betaDate='') {
	/**
	 * Loads a JavaScript in the website. The returned promise will be resolved once the code has been loaded.
	 * @param {string} src the URL to load
	 * @param base
	 * @returns {Promise<void>}
	 */
	 function promisedLoadCode(src, base="base") {
		return new Promise(async (resolve, reject) => {
			let sc = document.createElement('script');
			sc.src = src;
			if (scripts[base]) {
				scripts[base].push(src);
			}
			sc.addEventListener('load', function() {
				if (scripts[base]) scriptLoaded(src, base);
				this.remove();
				resolve();
			});
			sc.addEventListener('error', function() {
				console.error('error loading script '+src);
				this.remove();
				reject();
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
	const mainLoaded = new Promise(resolve => {
		window.addEventListener('foe-helper#mainloaded', evt => {
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
			MenuSetting = MenuSetting ? MenuSetting : 'RightBar';
			let cssname = "_menu_" + MenuSetting.toLowerCase().replace("bar","");

			let cssFiles = [
				'variables',
				'goods',
				cssname,
				'boxes'
			];

			// insert stylesheet
			for(let i in cssFiles) {
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
			localStorage.setItem("HelperBaseData", JSON.stringify({
				extID: chrome.runtime.id,
				extUrl: extUrl,
				GuiLng: lng,
				extVersion: v,
				isRelease: true,
				devMode: `${!('update_url' in chrome.runtime.getManifest())}`,
				loadBeta: loadBeta
			}));
			
			// Firefox does not support direct communication with background.js but API injections
			// So the the messages have to be forwarded and this exports an API-Function to do so
			if (window.navigator.userAgent.indexOf("Firefox") > -1 && exportFunction && window.wrappedJSObject) {
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
			// load main
			await promisedLoadCode(`${extUrl}js/web/_main/js/_main.js`,"main");
			scriptLoaded("primed", "main");
			await mainLoaded;
			
			// wait for ant and i18n to be loaded
			await jQueryLoading;

			// load all vendor scripts first (unknown order)
			const vendorScriptsToLoad = await vendorListPromise;
			for (let i = 0; i < vendorScriptsToLoad.length; i++){
				await promisedLoadCode(`${extUrl}vendor/${vendorScriptsToLoad[i]}.js?v=${v}`,"vendor");
			}
			//await Promise.all(vendorScriptsToLoad.map(vendorScript => promisedLoadCode(`${extUrl}vendor/${vendorScript}.js?v=${v}`,"vendor")));
			
			scriptLoaded("primed", "vendor");
			
			// load scripts (one after the other)
			const internalScriptsToLoad = await scriptListPromise;

			for (let i = 0; i < internalScriptsToLoad.length; i++){
				await promisedLoadCode(`${extUrl}js/web/${internalScriptsToLoad[i]}/js/${internalScriptsToLoad[i]}.js?v=${v}`, "internal");
			}
					
			scriptLoaded("primed", "internal");

		} catch (err) {
			// make sure that the packet buffer in the FoEproxy does not fill up in the event of an incomplete loading.
			window.dispatchEvent(new CustomEvent('foe-helper#error-loading'));
		}
	}

}
	// End of the separation from the global scope
}
