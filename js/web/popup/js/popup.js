/*
 * *************************************************************************************
 *
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

/**
 * Popup
 *
 * Displays existing HTML.Box modules in a separate browser pop-up window
 * (without a URL bar).
 *
 * Use in a module:
 *   HTML.Box({ id: 'bluegalaxy', ..., MainParser.PopOut('bluegalaxy', 1100, 580 });
 */

let Popup = {

	/**
	 * Open pop-ups: id -> { win, options, restoreCss, observer, watchdog, lastSize }
	 */
	windows: {},


	/**
	 * Is there already a pop-up open for this box?
	 *
	 * @param id CSS ID of the box
	 * @returns {boolean}
	 */
	IsOpen: (id) => {
		const entry = Popup.windows[id];
		return !!(entry && entry.win && !entry.win.closed);
	},


	/**
	 * Moves an existing box (HTML.Box) into its own browser window.
	 * If the window is closed, the box returns to the main page.
	 *
	 * @param id       CSS ID of the box (z.B. 'bluegalaxy')
	 * @param options  {width, height, title, onClose}
	 * @returns {boolean} true if the pop-up has been opened or is already open
	 */
	PopOut: (id, options = {}) => {

		if (Popup.IsOpen(id)) {
			Popup.windows[id].win.focus();
			return true;
		}

		const box = document.getElementById(id);
		if (!box) {
			return false;
		}

		// Size: last saved > Options > current box size
		let size = null;
		try {
			size = JSON.parse(localStorage.getItem('PopupSize_' + id));
		} catch (e) { /* No entry/invalid entry */ }

		const width  = (size && size.w) || options.width  || Math.max(box.offsetWidth, 320),
			height = (size && size.h) || options.height || Math.max(box.offsetHeight, 220),
			left = window.screenX + Math.max(0, Math.round((window.outerWidth - width) / 2)),
			top  = window.screenY + Math.max(0, Math.round((window.outerHeight - height) / 2));

		const boxTitle = box.querySelector('.window-head .title');
		let title = options.title || (boxTitle ? boxTitle.textContent.trim() : 'FoE Helper');
		if (title.indexOf('FoE Helper') === -1) {
			title += ' - FoE Helper';
		}

		// Apply all extension style sheets from the main page + pop-up CSS
		let cssLinks = [];
		document.head.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
			if (link.href.indexOf(extUrl) === 0) {
				cssLinks.push(`<link rel="stylesheet" href="${link.href}">`);
			}
		});
		cssLinks.push(`<link rel="stylesheet" href="${extUrl}js/web/popup/css/popup.css?v=${extVersion}">`);

		const winHtml = `<!DOCTYPE html>
			<html>
				<head>
					<meta charset="utf-8">
					<title>${title}</title>
					${cssLinks.join('\n\t\t\t\t\t')}
				</head>
				<body class="foe-helper-popup"></body>
			</html>`;

		const winUrl = URL.createObjectURL(new Blob([winHtml], {type: 'text/html;charset=utf-8'}));

		const win = window.open(
			winUrl,
			'foe-helper-popup-' + id,
			`popup=yes,width=${width},height=${height},left=${left},top=${top}`
		);

		if (!win) {
			URL.revokeObjectURL(winUrl);
			HTML.ShowToastMsg({
				head: 'FoE Helper',
				text: i18n('PopUp.Blocked'),
				type: 'error',
				hideAfter: 6000
			});
			return false;
		}

		const entry = Popup.windows[id] = {
			win: win,
			options: options,
			restoreCss: box.style.cssText,
			observer: null,
			watchdog: null,
			lastSize: {w: width, h: height}
		};

		// wait until the Blob document is ready (not the initial about:blank)
		const initTimer = setInterval(() => {
			if (win.closed) {
				clearInterval(initTimer);
				Popup._cleanup(id);
				return;
			}

			let ready = false;
			try {
				ready = win.document.readyState === 'complete'
					&& win.document.body
					&& win.document.body.classList.contains('foe-helper-popup');
			} catch (e) { /* not yet available */ }

			if (!ready) return;

			clearInterval(initTimer);
			URL.revokeObjectURL(winUrl);

			// Disable in-page drag-and-drop; it will be re-enabled when you return
			const header = document.getElementById(id + 'Header');
			if (header) {
				header.onpointerdown = null;
			}

			// Move the box, along with all its event bindings, to the pop-up
			box.classList.add('popup-mode');
			win.document.body.appendChild(win.document.adoptNode(box));

			// make the tooltip system (customTooltip) available in the pop-up as well
			if (typeof Tooltips !== 'undefined' && Tooltips.attach) {
				Tooltips.attach(win);
			}

			// jQuery UI widgets cache their document; rebuild them for the new one
			Popup._rebindUiWidgets(box);

			// the module removes its own box (e.g. HTML.CloseOpenBox), close windows
			entry.observer = new MutationObserver(() => {
				if (!win.document.getElementById(id)) {
					win.close();
				}
			});
			entry.observer.observe(win.document.body, {childList: true, subtree: true});

			win.addEventListener('pagehide', () => Popup._cleanup(id), {once: true});
		}, 20);

		// Fallback in case `pagehide` never fires; also remembers the window size
		entry.watchdog = setInterval(() => {
			if (win.closed) {
				Popup._cleanup(id);
				return;
			}
			try {
				entry.lastSize = {w: win.innerWidth, h: win.innerHeight};
			} catch (e) { /* Window currently unavailable */ }
		}, 1000);

		return true;
	},


	/**
	 * When a box’s pop-up closes, the box returns to the main page
	 *
	 * @param id CSS-ID der Box
	 */
	Close: (id) => {
		if (Popup.IsOpen(id)) {
			Popup.windows[id].win.close();
		}
	},


	/**
	 * Closes all open pop-ups
	 */
	CloseAll: () => {
		for (const id of Object.keys(Popup.windows)) {
			Popup.Close(id);
		}
	},


	/**
	 * jQuery UI widgets (draggable/resizable) cache document/window at
	 * initialization time; after a document switch they listen on the wrong
	 * document and must be rebuilt with their current options.
	 *
	 * @param box the box element
	 */
	_rebindUiWidgets: (box) => {
		for (const name of ['draggable', 'resizable']) {
			$(box).find('.ui-' + name).addBack('.ui-' + name).each(function () {
				try {
					const options = $(this)[name]('option');
					$(this)[name]('destroy');
					$(this)[name](options);
				} catch (e) { /* widget not (or no longer) initialized */ }
			});
		}
	},


	/**
	 * Cleaning up when closing the pop-up: return the box to the main page,
	 * save the window size, execute callbacks
	 *
	 * @param id CSS-ID der Box
	 */
	_cleanup: (id) => {
		const entry = Popup.windows[id];
		if (!entry) return;

		delete Popup.windows[id];
		clearInterval(entry.watchdog);
		if (entry.observer) {
			entry.observer.disconnect();
		}

		if (typeof Tooltips !== 'undefined' && Tooltips.detach) {
			Tooltips.detach(entry.win);
		}

		if (entry.lastSize && entry.lastSize.w > 0 && entry.lastSize.h > 0) {
			localStorage.setItem('PopupSize_' + id, JSON.stringify(entry.lastSize));
		}

		// if the box still exists in the pop-up (window closed by clicking the X),
		// return to the main page
		try {
			const box = entry.win.document.getElementById(id);
			if (box) {
				box.classList.remove('popup-mode');
				document.body.appendChild(document.adoptNode(box));
				box.style.cssText = entry.restoreCss;
				HTML.DragBox(box);
				Popup._rebindUiWidgets(box);
			}
		} catch (e) { /* Document has already been destroyed; the box must be reopened */ }

		try {
			if (!entry.win.closed) {
				entry.win.close();
			}
		} catch (e) { /* already closed */ }

		if (typeof entry.options.onClose === 'function') {
			entry.options.onClose();
		}
	}
};


(() => {
	const origInit = jQuery.fn.init;

	function PopupAwareInit(selector, context, root) {
		const result = new origInit(selector, context, root);

		if (result.length === 0 && typeof selector === 'string' && context == null && selector.charAt(0) !== '<') {
			for (const id in Popup.windows) {
				const win = Popup.windows[id].win;
				if (win && !win.closed) {
					try {
						const alt = new origInit(selector, win.document, root);
						if (alt.length > 0) {
							return alt;
						}
					} catch (e) { /* The pop-up is currently closing */ }
				}
			}
		}

		return result;
	}

	PopupAwareInit.prototype = jQuery.fn;
	jQuery.fn.init = PopupAwareInit;
})();


// Close all pop-ups when exiting or reloading the game
window.addEventListener('beforeunload', () => {
	Popup.CloseAll();
});
