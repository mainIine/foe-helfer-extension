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
 * BuildingMarker renders floating arrows above buildings in the city view.
 * The arrows follow the game camera, so they stay on their buildings while
 * the map is panned or zoomed.
 *
 * The module reads the game engine strictly read-only: a one-shot
 * requestAnimationFrame trap captures the Lime application instance via
 * V8 call sites (Error.prepareStackTrace), from which the active iso scene
 * and its isoToScreen() projection are resolved each frame.
 *
 * Markers are dismissed by the player either by clicking a marked building's
 * footprint on the map (removes that marker) or via the close button that is
 * shown below the diamonds in the top right corner (removes all markers).
 *
 * Besides the city, the module supports the Guild Battlegrounds map: province
 * markers point at a sector's flag and are toggled per province. City markers
 * render only in the own city, province markers only on the battlegrounds map.
 * Whenever the marker set changes, a 'foe-helper#building-marker-changed'
 * event is dispatched on window so callers can update their UI state.
 *
 * Public API (also usable from the browser console):
 *   BuildingMarker.show(entityId)          -> Promise<boolean>  mark building(s) from MainParser.CityMapData,
 *                                                               accepts a single id or an array of ids
 *   BuildingMarker.showByName(name)        -> Promise<boolean>  mark all buildings whose name contains `name`
 *   BuildingMarker.showAt(x, y)            -> Promise<boolean>  mark a grid position
 *   BuildingMarker.toggleProvince(provId)  -> Promise<boolean>  add/remove a marker on a battlegrounds sector
 *   BuildingMarker.isProvinceMarked(provId)-> boolean           whether a sector is currently marked
 *   BuildingMarker.hide()                  ->                   remove all markers
 *   BuildingMarker.demo()                  -> Promise<boolean>  mark the town hall
 *   BuildingMarker.getCameraInfo()         -> object|null       current zoom/scene state for debugging
 */
let BuildingMarker = {

	/** @type {object|null} Captured Lime application instance */
	_app: null,

	/** @type {Promise<boolean>|null} Pending engine capture */
	_capturePromise: null,

	/** @type {boolean} True once the capture failed permanently (e.g. no V8) */
	_unsupported: false,

	/** @type {object[]} Active markers ({entityId}|{x, y}, each with its arrow element) */
	_markers: [],

	/** @type {HTMLElement|null} Overlay container element */
	_overlay: null,

	/** @type {HTMLElement|null} Close button element inside the overlay */
	_closeButton: null,

	/** @type {{x: number, y: number}|null} Position of the last pointerdown */
	_pointerStart: null,

	/** @type {boolean} True while the positioning loop is running */
	_loopActive: false,


	/**
	 * Show arrows above one or more buildings of the own city.
	 * Replaces all currently active markers.
	 *
	 * @param {number|string|Array} entityIds One internal entity id or an array of ids (keys of MainParser.CityMapData)
	 * @returns {Promise<boolean>} True if at least one marker could be activated
	 */
	show: (entityIds) => {
		const idList = (Array.isArray(entityIds) ? entityIds : [entityIds]).filter(id => id !== undefined && id !== null);
		const known = idList.filter(id => MainParser.CityMapData && MainParser.CityMapData[id]);

		if (known.length === 0) {
			console.warn('[BuildingMarker] No given entity id found in MainParser.CityMapData');
			return Promise.resolve(false);
		}

		return BuildingMarker._setMarkers(known.map(id => ({ entityId: id })));
	},


	/**
	 * Show arrows above all buildings whose name contains the given string.
	 *
	 * @param {string} name Building name (or part of it), case insensitive
	 * @returns {Promise<boolean>} True if at least one marker could be activated
	 */
	showByName: (name) => {
		if (typeof name !== 'string' || name.trim() === '') {
			console.warn('[BuildingMarker] showByName() requires a building name');
			return Promise.resolve(false);
		}

		const search = name.toLowerCase();
		const ids = Object.values(MainParser.CityMapData || {})
			.filter(entity => {
				const meta = MainParser.CityEntities ? MainParser.CityEntities[entity.cityentity_id] : null;
				return meta && meta.name && meta.name.toLowerCase().includes(search);
			})
			.map(entity => entity.id);

		if (ids.length === 0) {
			console.warn(`[BuildingMarker] No building matching "${name}" found in the city`);
			return Promise.resolve(false);
		}

		return BuildingMarker.show(ids);
	},


	/**
	 * Show a single arrow above an arbitrary grid position of the own city.
	 * Replaces all currently active markers.
	 *
	 * @param {number} gridX Grid x coordinate (fractions allowed)
	 * @param {number} gridY Grid y coordinate (fractions allowed)
	 * @returns {Promise<boolean>} True if the marker could be activated
	 */
	showAt: (gridX, gridY) => {
		if (typeof gridX !== 'number' || typeof gridY !== 'number') {
			console.warn('[BuildingMarker] showAt() requires numeric grid coordinates');
			return Promise.resolve(false);
		}

		return BuildingMarker._setMarkers([{ x: gridX, y: gridY }]);
	},


	/**
	 * Add or remove a marker on a Guild Battlegrounds sector. Existing markers
	 * of other sectors are kept, so multiple sectors can be marked at once.
	 *
	 * @param {number|string} provinceId Province id from the battlegrounds map data
	 * @returns {Promise<boolean>} True if the marker is now active, false if removed or unavailable
	 */
	toggleProvince: async (provinceId) => {
		if (provinceId === undefined || provinceId === null) {
			console.warn('[BuildingMarker] toggleProvince() requires a province id');
			return false;
		}

		const existing = BuildingMarker._markers.findIndex(m => String(m.provinceId) === String(provinceId));

		if (existing >= 0) {
			BuildingMarker._markers[existing].element.remove();
			BuildingMarker._markers.splice(existing, 1);

			if (BuildingMarker._markers.length === 0) {
				BuildingMarker.hide();
			}
			else {
				BuildingMarker._notifyChange();
			}

			return false;
		}

		const captured = await BuildingMarker._ensureEngine();

		if (!captured) {
			console.warn('[BuildingMarker] Game engine could not be captured (browser not supported)');
			return false;
		}

		BuildingMarker._buildOverlay();

		const marker = { provinceId: provinceId, element: BuildingMarker._createArrow() };
		BuildingMarker._markers.push(marker);

		BuildingMarker._closeButton.classList.remove('building-marker-hidden');
		BuildingMarker._startLoop();
		BuildingMarker._notifyChange();

		return true;
	},


	/**
	 * Check whether a Guild Battlegrounds sector is currently marked.
	 *
	 * @param {number|string} provinceId Province id from the battlegrounds map data
	 * @returns {boolean} True if a marker for the sector is active
	 */
	isProvinceMarked: (provinceId) => {
		return BuildingMarker._markers.some(m => String(m.provinceId) === String(provinceId));
	},


	/**
	 * Remove all markers and the close button and stop the positioning loop.
	 */
	hide: () => {
		BuildingMarker._clearMarkers();

		if (BuildingMarker._closeButton) {
			BuildingMarker._closeButton.classList.add('building-marker-hidden');
		}

		BuildingMarker._notifyChange();
	},


	/**
	 * Convenience test entry: marks the town hall.
	 *
	 * @returns {Promise<boolean>} True if the marker could be activated
	 */
	demo: () => {
		const townHall = Object.values(MainParser.CityMapData || {}).find(entity => entity.type === 'main_building');

		if (!townHall) {
			console.warn('[BuildingMarker] No town hall found in city data');
			return Promise.resolve(false);
		}

		return BuildingMarker.show(townHall.id);
	},


	/**
	 * Expose the current camera state for debugging via console.
	 *
	 * @returns {object|null} Zoom factor and scene availability, null before capture
	 */
	getCameraInfo: () => {
		const scene = BuildingMarker._resolveScene();

		if (!scene) {
			return null;
		}

		return {
			zoomFactor: scene._zoomFactor,
			cellSize: scene._cellSize,
			activeMap: (typeof ActiveMap !== 'undefined' ? ActiveMap : null)
		};
	},


	/**
	 * Store the markers, make sure engine and overlay are ready and start the loop.
	 *
	 * @param {object[]} markers Marker definitions ({entityId} or {x, y})
	 * @returns {Promise<boolean>} True if the engine is available
	 */
	_setMarkers: async (markers) => {
		const captured = await BuildingMarker._ensureEngine();

		if (!captured) {
			console.warn('[BuildingMarker] Game engine could not be captured (browser not supported)');
			return false;
		}

		BuildingMarker._buildOverlay();
		BuildingMarker._clearMarkers();

		for (const marker of markers) {
			marker.element = BuildingMarker._createArrow();
			BuildingMarker._markers.push(marker);
		}

		BuildingMarker._closeButton.classList.remove('building-marker-hidden');
		BuildingMarker._startLoop();
		BuildingMarker._notifyChange();

		return true;
	},


	/**
	 * Remove all marker arrow elements and empty the marker list.
	 */
	_clearMarkers: () => {
		for (const marker of BuildingMarker._markers) {
			if (marker.element) {
				marker.element.remove();
			}
		}

		BuildingMarker._markers = [];
	},


	/**
	 * Tell listeners (e.g. the Guild Battlegrounds box) that the marker set changed.
	 */
	_notifyChange: () => {
		window.dispatchEvent(new CustomEvent('foe-helper#building-marker-changed'));
	},


	/**
	 * Capture the Lime application instance of the running game.
	 *
	 * Wraps window.requestAnimationFrame once and inspects the callers of the
	 * next frame requests via V8 call sites. The game's render loop re-registers
	 * itself every frame with the application instance as `this`, which is
	 * detected by its stage/renderer/window fields. The wrapper restores the
	 * original function immediately after a successful capture.
	 *
	 * @returns {Promise<boolean>} True once the application has been captured
	 */
	_ensureEngine: () => {
		if (BuildingMarker._app) {
			return Promise.resolve(true);
		}

		if (BuildingMarker._unsupported) {
			return Promise.resolve(false);
		}

		if (BuildingMarker._capturePromise) {
			return BuildingMarker._capturePromise;
		}

		BuildingMarker._capturePromise = new Promise((resolve) => {
			const originalRAF = window.requestAnimationFrame;
			let attempts = 0;

			const finish = (success) => {
				window.requestAnimationFrame = originalRAF;
				BuildingMarker._capturePromise = null;
				BuildingMarker._unsupported = !success;
				resolve(success);
			};

			window.requestAnimationFrame = function (callback) {
				if (!BuildingMarker._app) {
					const previousPrepare = Error.prepareStackTrace;
					let callSites = null;

					try {
						Error.prepareStackTrace = (error, sites) => sites;
						callSites = new Error().stack;
					} finally {
						Error.prepareStackTrace = previousPrepare;
					}

					if (!Array.isArray(callSites)) {
						// prepareStackTrace is V8 only (Chrome/Edge/Opera), Firefox ends up here
						finish(false);
					}
					else {
						for (const site of callSites) {
							let caller = null;

							try {
								caller = site.getThis();
							} catch (e) { /* strict mode frames refuse access */ }

							if (caller && caller.stage && caller.renderer && caller.window) {
								BuildingMarker._app = caller;
								break;
							}
						}

						if (BuildingMarker._app || ++attempts >= 600) {
							finish(!!BuildingMarker._app);
						}
					}
				}

				return originalRAF.call(window, callback);
			};
		});

		return BuildingMarker._capturePromise;
	},


	/**
	 * Resolve the active iso scene from the captured application.
	 *
	 * Resolved fresh on every frame because the game recreates the scene on
	 * view changes. Haxe field names survive minification, so this path is
	 * stable across game versions.
	 *
	 * @returns {object|null} The iso scene or null outside the city view
	 */
	_resolveScene: () => {
		const stage = BuildingMarker._app ? BuildingMarker._app.stage : null;

		if (!stage || !stage.__children) {
			return null;
		}

		for (const child of stage.__children) {
			const container = child ? child.gameContainer : null;

			if (!container || !container.__children) {
				continue;
			}

			for (const view of container.__children) {
				const scene = view ? view._isoScene : null;

				if (scene && typeof scene.isoToScreen === 'function' && scene._camera) {
					return scene;
				}
			}
		}

		return null;
	},


	/**
	 * Resolve the Guild Battlegrounds map view from the captured application.
	 * The view is a Starling sprite below the Starling root that carries one
	 * view controller per province.
	 *
	 * @returns {object|null} The map view or null outside the battlegrounds
	 */
	_resolveGbgMapView: () => {
		const stage = BuildingMarker._app ? BuildingMarker._app.stage : null;

		if (!stage || !stage.__children) {
			return null;
		}

		for (const child of stage.__children) {
			const root = child && child._starling && child._starling.mRoot;
			const views = root && root.mChildren ? root.mChildren.__array : null;

			if (!views) {
				continue;
			}

			for (const view of views) {
				if (view && view._provinceViewControllers && view._provinceContainer) {
					return view;
				}
			}
		}

		return null;
	},


	/**
	 * Project a province's flag position onto the screen by walking the
	 * Starling parent chain (position and scale per level carry the map's
	 * current pan and zoom).
	 *
	 * @param {object} mapView The battlegrounds map view
	 * @param {number|string} provinceId Province id
	 * @returns {{x: number, y: number, scale: number}|null} Stage position and accumulated scale
	 */
	_projectProvince: (mapView, provinceId) => {
		const controllers = mapView._provinceViewControllers;
		const controller = controllers && controllers.h ? controllers.h[provinceId] : null;
		const data = controller ? controller._provinceViewData : null;

		if (!data || data.flagX === undefined) {
			return null;
		}

		let x = data.flagX,
			y = data.flagY,
			scale = 1,
			node = mapView._provinceContainer;

		while (node) {
			x = x * node.mScaleX + node.mX;
			y = y * node.mScaleY + node.mY;
			scale *= node.mScaleX;
			node = node.mParent;
		}

		return { x: x, y: y, scale: scale };
	},


	/**
	 * Determine the grid footprint of a marker target.
	 *
	 * Entity markers are re-read every frame, so the arrow follows a building
	 * that gets moved and disappears when it is sold. Plain grid markers get
	 * a one tile footprint centered on their position.
	 *
	 * @param {object} marker Marker definition ({entityId} or {x, y})
	 * @returns {{x: number, y: number, width: number, length: number}|null} Grid footprint
	 */
	_resolveFootprint: (marker) => {
		if (!marker) {
			return null;
		}

		if (marker.entityId === undefined) {
			return { x: marker.x - 0.5, y: marker.y - 0.5, width: 1, length: 1 };
		}

		const entity = MainParser.CityMapData ? MainParser.CityMapData[marker.entityId] : null;

		if (!entity || entity.x === undefined) {
			return null;
		}

		let width = 1,
			length = 1;

		if (typeof CityMap !== 'undefined' && CityMap.GetBuildingSize) {
			const size = CityMap.GetBuildingSize(entity);
			width = size.xsize || 1;
			length = size.ysize || 1;
		}

		return { x: entity.x, y: entity.y, width: width, length: length };
	},


	/**
	 * Create the overlay with the close button once and attach the
	 * dismiss listeners.
	 */
	_buildOverlay: () => {
		if (BuildingMarker._overlay) {
			return;
		}

		HTML.AddCssFile('building-marker');

		const overlay = document.createElement('div');
		overlay.id = 'BuildingMarkerOverlay';

		const closeButton = document.createElement('div');
		closeButton.className = 'building-marker-close building-marker-hidden';
		closeButton.title = i18n('Boxes.BuildingMarker.Dismiss');
		closeButton.textContent = '✕';
		closeButton.addEventListener('click', (event) => {
			event.stopPropagation();
			BuildingMarker.hide();
		});

		overlay.appendChild(closeButton);
		document.body.appendChild(overlay);

		BuildingMarker._overlay = overlay;
		BuildingMarker._closeButton = closeButton;

		// dismiss a marker when the player clicks its building's footprint
		window.addEventListener('pointerdown', BuildingMarker._onPointerDown, true);
		window.addEventListener('pointerup', BuildingMarker._onPointerUp, true);
	},


	/**
	 * Create one arrow element inside the overlay.
	 *
	 * @returns {HTMLElement} The arrow wrapper element
	 */
	_createArrow: () => {
		const arrow = document.createElement('div');
		arrow.className = 'building-marker-arrow building-marker-hidden';
		arrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="92" height="108" viewBox="0 0 46 54">
			<defs>
				<linearGradient id="building-marker-gold" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#ffe28a"/>
					<stop offset="0.55" stop-color="#f5b62d"/>
					<stop offset="1" stop-color="#d78f0f"/>
				</linearGradient>
			</defs>
			<polygon points="23,52 3,26 14,26 14,2 32,2 32,26 43,26"
				fill="url(#building-marker-gold)" stroke="#6d4400" stroke-width="2.5" stroke-linejoin="round"/>
		</svg>`;

		BuildingMarker._overlay.appendChild(arrow);

		return arrow;
	},


	/**
	 * Remember where a pointer interaction started to tell clicks from map drags.
	 *
	 * @param {PointerEvent} event The captured pointerdown event
	 */
	_onPointerDown: (event) => {
		BuildingMarker._pointerStart = { x: event.clientX, y: event.clientY };
	},


	/**
	 * Remove a marker when the player clicked its target: in the city the
	 * marked building's footprint, on the battlegrounds map the marked sector.
	 * Map drags (pointer moved more than a few pixels) and clicks on DOM
	 * elements above the canvas are ignored.
	 *
	 * @param {PointerEvent} event The captured pointerup event
	 */
	_onPointerUp: (event) => {
		const start = BuildingMarker._pointerStart;
		BuildingMarker._pointerStart = null;

		if (!start || BuildingMarker._markers.length === 0) {
			return;
		}

		if (Math.abs(event.clientX - start.x) > 6 || Math.abs(event.clientY - start.y) > 6) {
			return;
		}

		const canvas = document.querySelector('#openfl-content canvas');

		if (!canvas || event.target !== canvas) {
			return;
		}

		const map = (typeof ActiveMap !== 'undefined' ? ActiveMap : 'main');

		if (map === 'gg') {
			// the game already hit-tests the sector under the cursor for us
			const mapView = BuildingMarker._resolveGbgMapView();
			const hovered = mapView ? mapView._hoveredProvinceId : null;

			if (hovered === null || hovered === undefined || hovered < 0) {
				return;
			}

			const index = BuildingMarker._markers.findIndex(m => String(m.provinceId) === String(hovered));

			if (index >= 0) {
				BuildingMarker._removeMarkerAt(index);
			}

			return;
		}

		if (map !== 'main') {
			return;
		}

		const scene = BuildingMarker._resolveScene();

		if (!scene) {
			return;
		}

		const rect = canvas.getBoundingClientRect();
		const clickX = event.clientX - rect.left;
		const clickY = event.clientY - rect.top;

		for (let i = 0; i < BuildingMarker._markers.length; i++) {
			const marker = BuildingMarker._markers[i];
			const footprint = BuildingMarker._resolveFootprint(marker);

			if (!footprint) {
				continue;
			}

			const corners = [
				scene.isoToScreen(footprint.x, footprint.y),
				scene.isoToScreen(footprint.x + footprint.width, footprint.y),
				scene.isoToScreen(footprint.x + footprint.width, footprint.y + footprint.length),
				scene.isoToScreen(footprint.x, footprint.y + footprint.length)
			];

			if (BuildingMarker._pointInQuad(clickX, clickY, corners)) {
				BuildingMarker._removeMarkerAt(i);
				return;
			}
		}
	},


	/**
	 * Remove one marker by list index, hiding everything when it was the last.
	 *
	 * @param {number} index Index in the marker list
	 */
	_removeMarkerAt: (index) => {
		BuildingMarker._markers[index].element.remove();
		BuildingMarker._markers.splice(index, 1);

		if (BuildingMarker._markers.length === 0) {
			BuildingMarker.hide();
		}
		else {
			BuildingMarker._notifyChange();
		}
	},


	/**
	 * Test whether a point lies inside a convex quad via edge cross products.
	 *
	 * @param {number} px Point x
	 * @param {number} py Point y
	 * @param {{x: number, y: number}[]} corners The four corners in winding order
	 * @returns {boolean} True if the point is inside
	 */
	_pointInQuad: (px, py, corners) => {
		let sign = 0;

		for (let i = 0; i < 4; i++) {
			const a = corners[i];
			const b = corners[(i + 1) % 4];
			const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);

			if (cross !== 0) {
				if (sign === 0) {
					sign = Math.sign(cross);
				}
				else if (Math.sign(cross) !== sign) {
					return false;
				}
			}
		}

		return true;
	},


	/**
	 * Start the per-frame positioning loop if it is not already running.
	 */
	_startLoop: () => {
		if (BuildingMarker._loopActive) {
			return;
		}

		BuildingMarker._loopActive = true;
		requestAnimationFrame(BuildingMarker._tick);
	},


	/**
	 * Per-frame update: project every marker's position onto the screen and
	 * place its arrow. City markers render in the own city, province markers
	 * on the battlegrounds map; everything is hidden in other views.
	 */
	_tick: () => {
		if (BuildingMarker._markers.length === 0) {
			BuildingMarker._loopActive = false;
			return;
		}

		const map = (typeof ActiveMap !== 'undefined' ? ActiveMap : 'main');
		const scene = (map === 'main') ? BuildingMarker._resolveScene() : null;
		const mapView = (map === 'gg') ? BuildingMarker._resolveGbgMapView() : null;
		const canvas = document.querySelector('#openfl-content canvas');
		const rect = ((scene || mapView) && canvas) ? canvas.getBoundingClientRect() : null;

		for (const marker of BuildingMarker._markers) {
			let position = null;

			// a broken projection of one marker must not kill the loop for the others
			try {
				if (rect && marker.provinceId !== undefined) {
					if (mapView) {
						const projected = BuildingMarker._projectProvince(mapView, marker.provinceId);

						if (projected) {
							position = { x: projected.x, y: projected.y, scale: Math.min(1.2, Math.max(0.5, projected.scale)) };
						}
					}
				}
				else if (rect && scene) {
					const footprint = BuildingMarker._resolveFootprint(marker);

					if (footprint) {
						const point = scene.isoToScreen(footprint.x + footprint.width / 2, footprint.y + footprint.length / 2);
						position = { x: point.x, y: point.y, scale: Math.max(0.5, scene._zoomFactor || 1) };
					}
					else if (!marker.projectionWarned) {
						marker.projectionWarned = true;
						console.warn('[BuildingMarker] No grid position for marker (entity without x/y?)', marker, MainParser.CityMapData[marker.entityId]);
					}
				}
			} catch (e) {
				if (!marker.projectionWarned) {
					marker.projectionWarned = true;
					console.warn('[BuildingMarker] Marker projection failed', marker, e);
				}
			}

			let visible = false;

			if (position) {
				const x = rect.left + position.x;
				const y = rect.top + position.y;

				// keep the arrow while the target is near the visible map area
				if (x > rect.left - 60 && x < rect.right + 60 && y > rect.top - 60 && y < rect.bottom + 60) {
					marker.element.style.transform = `translate(${x}px, ${y}px) scale(${position.scale})`;
					visible = true;
				}
			}

			marker.element.classList.toggle('building-marker-hidden', !visible);
		}

		BuildingMarker._closeButton.classList.toggle('building-marker-hidden', !(scene || mapView));
		requestAnimationFrame(BuildingMarker._tick);
	}
};
