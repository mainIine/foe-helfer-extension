/*
 * ************************************************************************************
 *
 *  Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 *  You may use, distribute and modify this code under the
 *  terms of the AGPL license.
 *
 *  See file LICENSE.md or go to
 *  https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 *  for full license details.
 *
 *  *************************************************************************************
 *
 */

let ProvinceMap = {
	Map: {},
	MapCTX: {},

	Size: {
		width: 1000,
		height: 1000
	},

	Provinces: [],
	StrokeColor: '#111',
	selectedProvince: null,
	HighlightedSector: null,


	/**
	 * Enables drag functionality for the province map. Allows the user to click and drag to scroll the map.
	 *
	 * Updates the map's scroll position dynamically based on user mouse movement. Also determines
	 * the selected province based on the cursor's position on the map and displays any associated
	 * province details.
	 *
	 * Mouse event handlers are added for `mousedown`, `mousemove`, and `mouseup` events to
	 * implement the drag behavior.
	 */
	mapDrag: () => {
		const wrapper = document.getElementById('province-map-wrap');
		let pos = { top: 0, left: 0, x: 0, y: 0 };

		const mouseDownHandler = function(e) {
			pos = {
				left: wrapper.scrollLeft,
				top: wrapper.scrollTop,
				x: e.clientX,
				y: e.clientY,
			};

			document.addEventListener('mousemove', mouseMoveHandler);
			document.addEventListener('mouseup', mouseUpHandler);
			const canvasPos = ProvinceMap.getCanvasPoint(e);
			ProvinceMap.selectedProvince = ProvinceMap.findProvinceAt(canvasPos.x, canvasPos.y);
			if (ProvinceMap.selectedProvince)
				ProvinceMap.showProvinceDetails();
		};

		const mouseMoveHandler = function(e) {
			const dx = e.clientX - pos.x;
			const dy = e.clientY - pos.y;
			wrapper.scrollTop = pos.top - dy;
			wrapper.scrollLeft = pos.left - dx;
		};

		const mouseUpHandler = function() {
			document.removeEventListener('mousemove', mouseMoveHandler);
			document.removeEventListener('mouseup', mouseUpHandler);
		};

		ProvinceMap.Map.addEventListener('mousedown', function (e) {
			wrapper.addEventListener('mousedown', mouseDownHandler);
		}, false);
	},


	/**
	 * Retrieves the sector color configuration for a given owner ID.
	 *
	 * If an `ownerID` is provided and matches an existing configuration in `GuildFights.SortedColors`,
	 * the corresponding color object is returned. If no `ownerID` is provided, a default color
	 * configuration is returned.
	 *
	 * @param {string|undefined} ownerID - The ID of the owner whose sector colors are to be retrieved.
	 *                                      If undefined, the default color configuration is returned.
	 * @returns {Object} An object representing the sector's color configuration.
	 *                   The object contains properties `main`, `highlight`, `shadow`, `base`, and `id`.
	 */
	getSectorColors: (ownerID) => {
		if (ownerID !== undefined)
			return Guild_fights.SortedColors.find(c => (c.id === ownerID))
		else
			return {
				main: '#444',
				highlight: '#666',
				shadow: '#333',
				base: '#444',
				id: undefined
			}
	},


	/**
	 * Constructs or handles the "ProvinceMap" user interface element.
	 *
	 * This function performs the following:
	 * - Checks if an element with the ID "ProvinceMap" exists in the DOM.
	 *   - If not, creates a new box element using the HTML.Box method with defined properties.
	 *     - Sets the ID, title, and other properties of the box (e.g., auto_close, dragdrop, minimize).
	 *     - Adds additional functionality for popout and active map configuration.
	 *     - Loads a CSS file named "guildfights".
	 * - If the element already exists, it closes the open box using the HTML.CloseOpenBox method.
	 * - Calls the `prepare` method on the `ProvinceMap` object to perform any additional setup.
	 */
	build: () => {
		if ($('#ProvinceMap').length === 0) {
			HTML.Box({
				id: 'ProvinceMap',
				title: 'ProvinceMap',
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
				popout: 'MainParser.PopOut(\'ProvinceMap\', 650, 580)',
				active_maps:"gg"
			});

			// add css to the dom
			HTML.AddCssFile('guildfights');
		}
		else {
			HTML.CloseOpenBox('ProvinceMap')
		}

		ProvinceMap.prepare();
	},


	/**
	 * Sets up the province map with necessary DOM elements, classes, and configurations.
	 * Initializes the canvas, context, and appropriate event handlers for interaction.
	 * Additionally, configures the appearance of the map and draws initial map assets.
	 */
	prepare: () => {
		$('#ProvinceMap').addClass(Guild_fights.MapData.map['id']);

		ProvinceMap.Map = document.createElement("canvas");
		ProvinceMap.MapCTX = ProvinceMap.Map.getContext('2d');
		ProvinceMap.view = "guildType";

		$(ProvinceMap.Map).attr({
			id: 'province-map',
			width: ProvinceMap.Size.width,
			height: ProvinceMap.Size.height,
		});

		let wrapper = document.createElement("div");
		$(wrapper).attr({
			id: 'province-map-wrap',
		});
		$(wrapper).html(ProvinceMap.Map);
		$('#ProvinceMapBody').html(wrapper).append('<span id="zoomGBGMap" class="btn">'+i18n('Boxes.GvGMap.Action.Zoom')+'</span><div id="provDetails"></div>');

		ProvinceMap.mapDrag();

		$('#zoomGBGMap').click(function (e) {
			$('#province-map').toggleClass('zoomed');
		});

		ProvinceMap.MapCTX.strokeStyle = ProvinceMap.StrokeColor;
		ProvinceMap.MapCTX.lineWidth = 2;

		// put 0,0 in the center on volcano map
		if (Guild_fights.MapData.map['id'] === "volcano_archipelago") {
			ProvinceMap.MapCTX.translate(ProvinceMap.Size.width/2, ProvinceMap.Size.height/2);
		}

		// Objects
		/**
		 * Map sector object holding position, ownership and progress data
		 * plus its cached Path2D shape
		 *
		 * @param {Object} data Combined static province data and live map data
		 * @constructor
		 */
		function Province(data) {
			this.id = data.id || 0;
			this.name = data.name;
			this.short = data.short;
			this.links = data.links;
			this.flag = data.flag;
			this.battleType = data.battleType;
			this.isSpawnSpot = data.isSpawnSpot;
			this.owner = {
				id: data.ownerID,
				name: data.ownerName,
				flagImg: data.flagImg,
				colors: ProvinceMap.getSectorColors(data.ownerID),
			};
			this.lockedUntil = data.lockedUntil;
			// Sectors which are open but with no progress are missing the "conquestProgress" key in the response
			this.conquestProgress = data.conquestProgress || [];
			this.circlePosition = data.circlePosition;
			this.totalBuildingSlots = data.totalBuildingSlots;
			this._shapeCache = {};
			return this;
		}

		/**
		 * Redraws this sector using the current map type
		 */
		Province.prototype.updateMapSector = function () {
			this.drawMapSector(Guild_fights.MapData.map['id']);
		}

		/**
		 * Draws the complete sector: shape in the owner's colour, title, slot dots,
		 * unlock time and conquest progress bars; spawn spots get the clan flag
		 *
		 * @param {string} mapType "waterfall_archipelago" or "volcano_archipelago"
		 */
		Province.prototype.drawMapSector = function (mapType = 'waterfall_archipelago') {
			ProvinceMap.MapCTX.font = 'bold 30px Arial';
			ProvinceMap.MapCTX.textAlign = "center";
			ProvinceMap.MapCTX.textBaseline = "top";
			ProvinceMap.MapCTX.fillStyle = this.owner.colors.highlight;

			let sector = this;
			let noRealignSectors = [];

			// waterfall map
			let hexwidthFactor = 7.5;
			let hexheightFactor = 10;
			let mapStuff = {
				hexwidth: ProvinceMap.Size.width / hexwidthFactor,
				hexheight: ProvinceMap.Size.height / hexheightFactor,
				x: sector.flag.x * (ProvinceMap.Size.width / (hexwidthFactor*2 + hexwidthFactor*2/3)) + ProvinceMap.Size.width / (hexwidthFactor*2 + hexwidthFactor*2/3),
				y: sector.flag.y * (ProvinceMap.Size.height / (hexheightFactor*2)) + (ProvinceMap.Size.height / (hexheightFactor*2))
			};

			if (mapType === 'volcano_archipelago') {
				let xy = { x: 1, y: -1};
				mapStuff.x = xy.x*(sector.circlePosition.radius-sector.circlePosition.initRadius/2)*Math.sin(sector.circlePosition.angle+sector.circlePosition.angleFragment/2);
				mapStuff.y = xy.y*(sector.circlePosition.radius-sector.circlePosition.initRadius/2)*Math.cos(sector.circlePosition.angle+sector.circlePosition.angleFragment/2);
				noRealignSectors = [1,2,29,31,30,32,33,34,35,37,38,39,41,42,43,45,46,47,49,50,51,53,54,55,57,58,59];

				// realign some sectors on volcano map to have more space
				if (!noRealignSectors.includes(sector.id) && sector.owner.flagImg == undefined)
					mapStuff.y = mapStuff.y - 10;
			}

			if (sector.owner.flagImg && sector.isSpawnSpot)
				sector.drawStartSector(mapStuff, mapType);

			else {
				ProvinceMap.MapCTX.fillStyle = sector.owner.colors.highlight;

				if (ProvinceMap.view == "battleType" && sector.battleType == "red" && sector.owner.colors.cid !== "own_guild_colour")
					ProvinceMap.MapCTX.fillStyle = "#cf401e";
				else if (ProvinceMap.view == "battleType" && sector.battleType == "blue" && sector.owner.colors.cid !== "own_guild_colour")
					ProvinceMap.MapCTX.fillStyle = "#4a98dd";

				const path = sector.drawSectorShape(mapType);
				ProvinceMap.MapCTX.fill(path);
				ProvinceMap.MapCTX.stroke(path);

				mapStuff.y = mapStuff.y - 20;

				if (sector.lockedUntil === undefined && sector.conquestProgress.length === 0)
					sector.drawTitleAndSlots(mapType, true, mapStuff.x, mapStuff.y);
				else {
					if (mapType === 'waterfall_archipelago')
						mapStuff.y = mapStuff.y - 10;
					sector.drawTitleAndSlots(mapType, false, mapStuff.x, mapStuff.y);
				}

				mapStuff.y = mapStuff.y+23;
				sector.drawUnlockTime(mapStuff);

				mapStuff.y = mapStuff.y+10;
				if (sector.lockedUntil !== undefined)
					mapStuff.y = mapStuff.y+20;

				sector.drawProgress(mapStuff);
			}
		}

		/**
		 * Draws the unlock time (HH:mm) of a locked sector
		 *
		 * @param {Object} mapStuff Precalculated x/y drawing coordinates
		 */
		Province.prototype.drawUnlockTime = function(mapStuff) {
			ProvinceMap.MapCTX.font = 'bold 20px Courier New';
			ProvinceMap.MapCTX.fillStyle = '#000';
			let provinceUnlockTime = (moment.unix(this.lockedUntil).format('HH:mm') != 'Invalid date') ? moment.unix(this.lockedUntil).format('HH:mm') : '';
			ProvinceMap.MapCTX.fillText(provinceUnlockTime,mapStuff.x,mapStuff.y+5);
		}

		/**
		 * Draws the sector title, the battle type dot (attack/defence) and one
		 * dot per building slot
		 *
		 * @param {string} mapType Map id, kept for symmetry with the other draw calls
		 * @param {boolean} drawCentered Center the title when no time/progress is shown
		 * @param x Drawing x coordinate
		 * @param y Drawing y coordinate
		 */
		Province.prototype.drawTitleAndSlots = function(mapType, drawCentered = true, x, y) {
			let titleY = y;
			let slotsY = y - 20;
			if (drawCentered) {
				titleY = y + 10;
				slotsY = y - 10;
			}

			// do not draw dots for own sectors
			if (this.owner.colors.cid != "own_guild_colour") {
				ProvinceMap.MapCTX.strokeStyle = '#000';

				ProvinceMap.MapCTX.beginPath();
				ProvinceMap.MapCTX.arc(x-36, titleY+12, 5, 0, 2*Math.PI);

				ProvinceMap.MapCTX.fillStyle = '#f00';
				if (this.battleType == 'blue')
					ProvinceMap.MapCTX.fillStyle = '#00f';

				if (ProvinceMap.view == "battleType")
					ProvinceMap.MapCTX.fillStyle = this.owner.colors.highlight;
				ProvinceMap.MapCTX.stroke();
				ProvinceMap.MapCTX.fill();
			}

			ProvinceMap.MapCTX.strokeStyle = '#fff5';

			ProvinceMap.MapCTX.font = 'bold 28px Arial';
			ProvinceMap.MapCTX.strokeText(this.short, x, titleY);

			ProvinceMap.MapCTX.fillStyle = '#000';
			ProvinceMap.MapCTX.fillText(this.short, x, titleY);

			if (this.totalBuildingSlots != undefined) {
				let slots = '';
				if (this.totalBuildingSlots == 1)
					slots = '·';
				else if (this.totalBuildingSlots == 2)
					slots = '··';
				else if (this.totalBuildingSlots == 3)
					slots = '···';

				ProvinceMap.MapCTX.strokeText(slots, x, slotsY);
				ProvinceMap.MapCTX.fillText(slots, x, slotsY);
			}
		}

		/**
		 * Draws one progress bar per attacking guild in its guild colour
		 *
		 * @param {Object} mapStuff Precalculated x/y drawing coordinates
		 */
		Province.prototype.drawProgress = function(mapStuff) {
			ProvinceMap.MapCTX.strokeStyle = ProvinceMap.StrokeColor;
			if (this.conquestProgress !== undefined && this.conquestProgress.length > 0)
				this.conquestProgress.forEach(function(prog, index) {
					let progDiff = (prog.progress / prog.maxProgress);
					let color = Guild_fights.SortedColors.find(c => (c.id === prog.participantId));
					let barWidth = 50;
					let x = mapStuff.x-27;

					ProvinceMap.MapCTX.fillStyle = '#111a';
					ProvinceMap.MapCTX.fillRect(x, mapStuff.y + 8*index + 1, 3 + barWidth, 4);
					ProvinceMap.MapCTX.fillStyle = color.highlight;
					ProvinceMap.MapCTX.strokeRect(x, mapStuff.y + 8*index, 3 + barWidth*progDiff, 6);
					ProvinceMap.MapCTX.fillRect(x, mapStuff.y + 8*index, 3 + barWidth*progDiff, 6);
				});
		}

		/**
		 * Draws a spawn spot: sector shape plus the owning clan's flag image
		 *
		 * @param {Object} mapStuff Precalculated x/y drawing coordinates
		 * @param {string} mapType Map id for the shape lookup
		 */
		Province.prototype.drawStartSector = function(mapStuff, mapType) {
			let flag_image = new Image();
			flag_image.src = srcLinks.get(`/shared/clanflags/${this.owner.flagImg}.jpg`, true);
			let sector = this;
			let flagX = mapStuff.x-25;
			let flagY = mapStuff.y-25;
			let flagSize = 50;

			flag_image.onload = function () {
				ProvinceMap.MapCTX.fillStyle = sector.owner.colors.highlight;
				const path = sector.drawSectorShape(mapType);
				ProvinceMap.MapCTX.fill(path);
				ProvinceMap.MapCTX.stroke(path);
				ProvinceMap.MapCTX.drawImage(this, flagX, flagY, flagSize, flagSize);
			}
		}

		/**
		 * Returns the Path2D outline of the sector: a ring segment on the volcano
		 * map, a hexagon on the waterfall map. The path is cached per map type
		 *
		 * @param {string} mapType "waterfall_archipelago" or "volcano_archipelago"
		 * @returns {Path2D}
		 */
		Province.prototype.drawSectorShape = function (mapType = 'waterfall_archipelago') {
			if (this._shapeCache[mapType]) {
				return this._shapeCache[mapType];
			}
			const path = new Path2D();

			if (mapType === 'volcano_archipelago') {
				let xy = { x: 1, y: -1 };
				let r = this.circlePosition.radius;
				let ir = this.circlePosition.initRadius;
				let a = this.circlePosition.angle;
				let af = this.circlePosition.angleFragment;

				path.moveTo(xy.x*(r-ir) * Math.sin(a), xy.y*(r-ir) * Math.cos(a));
				path.lineTo(xy.x*r * Math.sin(a), xy.y*r * Math.cos(a));
				path.lineTo(xy.x*r * Math.sin(a+af/2), xy.y*r * Math.cos(a+af/2));
				path.lineTo(xy.x*r * Math.sin(a+af), xy.y*r * Math.cos(a+af));
				path.lineTo(xy.x*(r-ir) * Math.sin(a+af), xy.y*(r-ir) * Math.cos(a+af));
				path.closePath();
			}
			else {
				// WATERFALL / HEX MAP
				let hexwidthFactor = 7.5;
				let hexheightFactor = 10;

				let w = ProvinceMap.Size.width / hexwidthFactor;
				let h = ProvinceMap.Size.height / hexheightFactor;

				let x =
					this.flag.x * (ProvinceMap.Size.width / (hexwidthFactor*2 + hexwidthFactor*2/3)) +
					ProvinceMap.Size.width / (hexwidthFactor*2 + hexwidthFactor*2/3);

				let y =
					this.flag.y * (ProvinceMap.Size.height / (hexheightFactor*2)) +
					(ProvinceMap.Size.height / (hexheightFactor*2));

				let p = w / 4;
				let tb = w / 2;

				path.moveTo(x - p, y - h/2);
				path.lineTo(x + p, y - h/2);
				path.lineTo(x + tb, y);
				path.lineTo(x + p, y + h/2);
				path.lineTo(x - p, y + h/2);
				path.lineTo(x - tb, y);
				path.closePath();
			}

			this._shapeCache[mapType] = path;
			return path;
		}

		let provinces = [];

		function init() {
			// round map
			let angle = Math.PI/2; // 90°
			let rotator = 0;
			let radius = ProvinceMap.Size.width/8;
			let initRadius = radius;

			ProvinceMap.ProvinceData().forEach(function (i) {
				const pD = ProvinceMap.ProvinceData()[i.id];

				let data = {
					id: i.id,
					name: pD.name,
					short: pD.short,
					links: pD.connections,
					flag: pD.flag
				};

				let prov = Guild_fights.MapData['map']['provinces'][i.id];
				data.battleType = prov.isAttackBattleType ? 'red' : 'blue';

				if (prov['ownerId']) {
					data.ownerID = prov['ownerId'];
					data.ownerName = prov.owner;
					data.isSpawnSpot = false;
					if (prov.isSpawnSpot) {
						let clan = Guild_fights.MapData['battlegroundParticipants'].find(c => c['participantId'] === prov['ownerId']);
						data['flagImg'] = clan['clan']['flag'].toLowerCase();
						data.isSpawnSpot = true;
					}
				}
				else if (prov.owner)
					data.ownerID = prov.owner.id;

				if (prov.lockedUntil)
					data.lockedUntil = prov.lockedUntil;

				if (prov.totalBuildingSlots)
					data.totalBuildingSlots = prov.totalBuildingSlots;

				if (prov.conquestProgress.length > 0)
					data.conquestProgress = prov.conquestProgress;

				// round map
				if (rotator >= Math.PI*2) {
					rotator = 0;
					angle = angle/2;
					radius = initRadius+radius;
				}
				data.circlePosition = {
					radius: radius,
					initRadius: initRadius,
					angle: rotator,
					angleFragment: angle
				};
				rotator += angle;

				provinces.push(new Province(data));
			});

			ProvinceMap.Provinces = provinces;
		}

		init();

		ProvinceMap.BuildMap();
	},


	/**
	 * Calculates the canvas point coordinates from a given event.
	 *
	 * This function determines the relative position on the canvas based on
	 * the event's client coordinates and the canvas's bounding rectangle.
	 * It also adjusts the coordinates if the current map is "volcano_archipelago."
	 *
	 * @param {MouseEvent | TouchEvent} e - The event containing client coordinates.
	 * @returns {Object} An object containing the computed canvas coordinates:
	 *                   - `x` {number}: X-coordinate on the canvas.
	 *                   - `y` {number}: Y-coordinate on the canvas.
	 */
	getCanvasPoint: (e) => {
		const rect = ProvinceMap.Map.getBoundingClientRect();

		const scaleX = ProvinceMap.Map.width / rect.width;
		const scaleY = ProvinceMap.Map.height / rect.height;

		let x = (e.clientX - rect.left) * scaleX;
		let y = (e.clientY - rect.top) * scaleY;

		if (Guild_fights.MapData.map['id'] === "volcano_archipelago") {
			x -= ProvinceMap.Size.width / 2;
			y -= ProvinceMap.Size.height / 2;
		}

		return { x, y };
	},


	/**
	 * Finds the province at a specified x and y coordinate on the map.
	 *
	 * This function iterates through all provinces stored in `ProvinceMap.Provinces`,
	 * checks if the point (x, y) lies within the path of any province,
	 * and returns the corresponding province object if found.
	 * If no province contains the given point, the function returns `null`.
	 *
	 * @param {number} x - The x-coordinate of the point to check.
	 * @param {number} y - The y-coordinate of the point to check.
	 * @returns {Object|null} The province object at the specified coordinates, or `null` if not found.
	 */
	findProvinceAt: (x, y) => {
		const mapType = Guild_fights.MapData.map['id'];

		for (let i = ProvinceMap.Provinces.length - 1; i >= 0; i--) {
			const p = ProvinceMap.Provinces[i];
			const path = p.drawSectorShape(mapType); // cached Path2D
			if (ProvinceMap.MapCTX.isPointInPath(path, x, y)) {
				return p;
			}
		}
		return null;
	},


	/**
	 * Displays detailed information about the selected province.
	 *
	 * This function retrieves additional data for the currently selected province
	 * from the map data, such as its victory points. It then updates the
	 * HTML element with ID `provDetails` to display the province's name,
	 * owner's name, and victory points. The border color of the element is
	 * also updated to match the base color of the province's owner.
	 */
	showProvinceDetails: () => {
		let additionalData = Guild_fights.MapData.map.provinces.find(x => x.id === ProvinceMap.selectedProvince.id);

		let elem = document.querySelector("#provDetails");
		elem.style.borderColor = ProvinceMap.selectedProvince.owner.colors.base;
		elem.innerHTML = `<h2>${ProvinceMap.selectedProvince.short}</h2>`;
		elem.innerHTML += `<p>${ProvinceMap.selectedProvince.owner.name}</p>`;
		elem.innerHTML += `<p>${additionalData.victoryPoints}</p>`;
	},


	/**
	 * Updates the attributes of a province (sector) on the map based on the provided socket data.
	 * This function handles the conquest progress, locking state, and ownership changes for a sector.
	 *
	 * @function
	 * @param {Object} [socketData=[]] - Data received from the socket, containing details about
	 *                                   the sector to be updated.
	 * @param {number} [socketData.id] - The ID of the sector to update. Defaults to the first sector
	 *                                   if not provided.
	 * @param {number} [socketData.conquestProgress] - The current conquest progress of the sector.
	 * @param {Date} [socketData.lockedUntil] - The timestamp until which the sector is locked.
	 * @param {number} [socketData.ownerId] - The ID of the new owner of the sector.
	 */
	RefreshSector: (socketData = []) => {
		let updatedProvince = ProvinceMap.Provinces.find(p => p.id === 0); // first sector does not have an ID, make it the default one

		if (socketData['id'] !== undefined)
			updatedProvince = ProvinceMap.Provinces.find(p => p.id === socketData['id']);

		if (socketData.conquestProgress)
			updatedProvince.conquestProgress = socketData.conquestProgress;

		if (socketData.lockedUntil)
			updatedProvince.lockedUntil = socketData.lockedUntil;

		if (socketData.ownerId !== updatedProvince.owner.id) {
			updatedProvince.owner.id = socketData.ownerId;
			updatedProvince.owner.colors = ProvinceMap.getSectorColors(socketData.ownerId);
		}

		updatedProvince.updateMapSector();

		// keep the hover outline visible when the sector got redrawn underneath it
		if (ProvinceMap.HighlightedSector === updatedProvince.id) {
			ProvinceMap.HighlightedSector = null;
			ProvinceMap.HighlightSector(updatedProvince.id);
		}
	},


	/**
	 * Outlines a sector on the map with a darker shade of its owner's colour,
	 * e.g. while hovering the matching table row
	 *
	 * @param {number} provinceId
	 */
	HighlightSector: (provinceId) => {
		if ($('#ProvinceMap').length === 0 || !(ProvinceMap.Map instanceof HTMLCanvasElement)) return;

		const province = ProvinceMap.Provinces.find(p => p.id === provinceId);
		if (!province) return;

		if (ProvinceMap.HighlightedSector !== null && ProvinceMap.HighlightedSector !== provinceId) {
			ProvinceMap.UnhighlightSector();
		}

		const path = province.drawSectorShape(Guild_fights.MapData.map['id']);

		ProvinceMap.MapCTX.save();
		ProvinceMap.MapCTX.strokeStyle = province.owner.colors?.shadow || '#000';
		ProvinceMap.MapCTX.lineWidth = 8;
		ProvinceMap.MapCTX.stroke(path);
		ProvinceMap.MapCTX.restore();

		ProvinceMap.HighlightedSector = provinceId;
	},


	/**
	 * Removes the hover outline again by redrawing the map
	 */
	UnhighlightSector: () => {
		if (ProvinceMap.HighlightedSector === null) return;

		ProvinceMap.HighlightedSector = null;

		if ($('#ProvinceMap').length === 0 || !(ProvinceMap.Map instanceof HTMLCanvasElement)) return;

		ProvinceMap.BuildMap();
	},


	/**
	 * Rebuilds the map by clearing the existing map context and updating each province's map sector.
	 * - Clears the current map using the provided map context dimensions.
	 * - Iterates through all provinces to update their corresponding map sectors.
	 */
	BuildMap: () => {
		ProvinceMap.MapCTX.clearRect(0, 0, ProvinceMap.Size.width, ProvinceMap.Size.height);
		const provinces = ProvinceMap.Provinces;

		provinces.forEach(province => {
			province.updateMapSector();
		});
	},


	/**
	 * Converts a hexadecimal color code to its RGB or RGBA string representation.
	 *
	 * @param {string} hex - The hexadecimal color code (e.g., "#FFFFFF" or "FFF").
	 *                      This can optionally include a leading '#' character.
	 * @param {number} [alpha] - Optional alpha value for the color, ranging from 0 to 1,
	 *                           resulting in an RGBA string if provided.
	 * @returns {string} A string representing the color in either "rgb(r, g, b)" or
	 *                   "rgba(r, g, b, a)" format depending on whether the alpha value
	 *                   is supplied.
	 */
	hexToRgb: (hex, alpha) => {
		hex = hex.trim();
		hex = hex[0] === '#' ? hex.substr(1) : hex;

		let bigint = parseInt(hex, 16), h = [];

		if (hex.length === 3) {
			h.push((bigint >> 4) & 255);
			h.push((bigint >> 2) & 255);

		} else {
			h.push((bigint >> 16) & 255);
			h.push((bigint >> 8) & 255);
		}

		h.push(bigint & 255);

		if (alpha) {
			h.push(alpha);
			return 'rgba(' + h.join(',') + ')';

		} else {
			return 'rgb(' + h.join(',') + ')';
		}
	},


	/**
	 * Retrieves province data for the "volcano_archipelago"/"waterfall_archipelago" map.
	 *
	 * The function returns an array of province objects, where each object contains the following information:
	 * - `id`: The unique identifier of the province.
	 * - `name`: The full name of the province.
	 * - `connections`: An array of IDs for provinces that are directly connected to this province.
	 * - `short`: A short identifier for the province.
	 * - `flag`: An object containing x and y coordinates representing the province's flag location.
	 *
	 * Note: This function is specific to when `GuildFights.MapData.map.id` is equal to "volcano_archipelago".
	 *
	 * @returns {Object[]} Array of province objects with detailed data about provinces and their connections.
	 */
	ProvinceData: () => {
		if (Guild_fights.MapData.map['id'] === "volcano_archipelago") {
			return [{
				id: 0,
				name: "A1: Mati Tudokk",
				connections: [1, 3, 4, 5],
				short: 'A1M',
				flag: {
					x: 1249,
					y: 816
				}
			}, {
				id: 1,
				name: "B1: Ofrus Remyr",
				connections: [0, 2, 6, 7],
				short: 'B1O',
				flag: {
					x: 1327,
					y: 996
				}
			}, {
				id: 2,
				name: "C1: Niali Diath",
				connections: [1, 3, 8, 9],
				short: 'C1N',
				flag: {
					x: 1064,
					y: 1011
				}
			}, {
				id: 3,
				name: "D1: Brurat Andgiry",
				connections: [0, 2, 10, 11],
				short: 'D1B',
				flag: {
					x: 1064,
					y: 838
				}
			}, {
				id: 4,
				name: "A2: Sladisk Icro",
				connections: [0, 5, 11, 12, 13],
				short: 'A2S',
				flag: {
					x: 1269,
					y: 629
				}
			}, {
				id: 5,
				name: "A2: Tevomospa",
				connections: [0, 4, 6, 14, 15],
				short: 'A2T',
				flag: {
					x: 1482,
					y: 752
				}
			}, {
				id: 6,
				name: "B2: Subeblic",
				connections: [1, 5, 7, 16, 17],
				short: 'B2S',
				flag: {
					x: 1541,
					y: 984
				}
			}, {
				id: 7,
				name: "B2: Taspac",
				connections: [1, 6, 8, 18, 19],
				short: 'B2T',
				flag: {
					x: 1375,
					y: 1197
				}
			}, {
				id: 8,
				name: "C2: Shadsterning",
				connections: [2, 7, 9, 20, 21],
				short: 'C2S',
				flag: {
					x: 1052,
					y: 1217
				}
			}, {
				id: 9,
				name: "C2: Tayencoria",
				connections: [2, 8, 10, 22, 23],
				short: 'C2T',
				flag: {
					x: 878,
					y: 1063
				}
			}, {
				id: 10,
				name: "D2: Slandmonii",
				connections: [3, 9, 11, 24, 25],
				short: 'D2S',
				flag: {
					x: 791,
					y: 794
				}
			}, {
				id: 11,
				name: "D2: Tachmazer",
				connections: [3, 4, 10, 26, 27],
				short: 'D2T',
				flag: {
					x: 974,
					y: 658
				}
			}, {
				id: 12,
				name: "A3: Vobolize",
				connections: [4, 13, 27, 28, 29],
				short: 'A3V',
				flag: {
					x: 1218,
					y: 479
				}
			}, {
				id: 13,
				name: "A3: Xemga",
				connections: [4, 12, 14, 30, 31],
				short: 'A3X',
				flag: {
					x: 1407,
					y: 523
				}
			}, {
				id: 14,
				name: "A3: Yelili",
				connections: [5, 13, 15, 32, 33],
				short: 'A3Y',
				flag: {
					x: 1592,
					y: 574
				}
			}, {
				id: 15,
				name: "A3: Zamva",
				connections: [5, 14, 16, 34, 35],
				short: 'A3Z',
				flag: {
					x: 1693,
					y: 710
				}
			}, {
				id: 16,
				name: "B3: Vishrain",
				connections: [6, 15, 17, 36, 37],
				short: 'B3V',
				flag: {
					x: 1721,
					y: 889
				}
			}, {
				id: 17,
				name: "B3: Xidorpupo",
				connections: [6, 16, 18, 38, 39],
				short: 'B3X',
				flag: {
					x: 1800,
					y: 1241
				}
			}, {
				id: 18,
				name: "B3: Yepadlic",
				connections: [7, 17, 19, 40, 41],
				short: 'B3Y',
				flag: {
					x: 1710,
					y: 1364
				}
			}, {
				id: 19,
				name: "B3: Zilsier",
				connections: [7, 18, 20, 42, 43],
				short: 'B3Z',
				flag: {
					x: 1528,
					y: 1401
				}
			}, {
				id: 20,
				name: "C3: Vilipne",
				connections: [8, 19, 21, 44, 45],
				short: 'C3V',
				flag: {
					x: 1132,
					y: 1382
				}
			}, {
				id: 21,
				name: "C3: Xistan",
				connections: [8, 20, 22, 46, 47],
				short: 'C3X',
				flag: {
					x: 851,
					y: 1343
				}
			}, {
				id: 22,
				name: "C3: Yeraim",
				connections: [9, 21, 23, 48, 49],
				short: 'C3Y',
				flag: {
					x: 656,
					y: 1220
				}
			}, {
				id: 23,
				name: "C3: Zeaslo",
				connections: [9, 22, 24, 50, 51],
				short: 'C3Z',
				flag: {
					x: 569,
					y: 1050
				}
			}, {
				id: 24,
				name: "D3: Verdebu",
				connections: [10, 23, 25, 52, 53],
				short: 'D3V',
				flag: {
					x: 592,
					y: 824
				}
			}, {
				id: 25,
				name: "D3: Xiwait",
				connections: [10, 24, 26, 54, 55],
				short: 'D3X',
				flag: {
					x: 628,
					y: 636
				}
			}, {
				id: 26,
				name: "D3: Yerat",
				connections: [11, 25, 27, 56, 57],
				short: 'D3Y',
				flag: {
					x: 788,
					y: 520
				}
			}, {
				id: 27,
				name: "D3: Zilgypt",
				connections: [11, 12, 26, 58, 59],
				short: 'D3Z',
				flag: {
					x: 1025,
					y: 484
				}
			}, {
				id: 28,
				name: "A4: Aithmirash",
				connections: [12, 29, 59],
				short: 'A4A',
				flag: {
					x: 1176,
					y: 310
				}
			}, {
				id: 29,
				name: "A4: Bangma Mynia",
				connections: [12, 28, 30],
				short: 'A4B',
				flag: {
					x: 1337,
					y: 316
				}
			}, {
				id: 30,
				name: "A4: Cuatishca",
				connections: [13, 29, 31],
				short: 'A4C',
				flag: {
					x: 1473,
					y: 354
				}
			}, {
				id: 31,
				name: "A4: Dilandmoor",
				connections: [13, 30, 32],
				short: 'A4D',
				flag: {
					x: 1591,
					y: 391
				}
			}, {
				id: 32,
				name: "A4: Eda Monwe",
				connections: [14, 31, 33],
				short: 'A4E',
				flag: {
					x: 1723,
					y: 398
				}
			}, {
				id: 33,
				name: "A4: Frimoandbada",
				connections: [14, 32, 34],
				short: 'A4F',
				flag: {
					x: 1839,
					y: 477
				}
			}, {
				id: 34,
				name: "A4: Gosolastan",
				connections: [15, 33, 35],
				short: 'A4G',
				flag: {
					x: 1962,
					y: 590
				}
			}, {
				id: 35,
				name: "A4: Hasaint",
				connections: [15, 34, 36],
				short: 'A4H',
				flag: {
					x: 2047,
					y: 688
				}
			}, {
				id: 36,
				name: "B4: Aguime",
				connections: [16, 35, 37],
				short: 'B4A',
				flag: {
					x: 1970,
					y: 842
				}
			}, {
				id: 37,
				name: "B4: Bliclatan",
				connections: [16, 36, 38],
				short: 'B4B',
				flag: {
					x: 1900,
					y: 1000
				}
			}, {
				id: 38,
				name: "B4: Capepesk",
				connections: [17, 37, 39],
				short: 'B4C',
				flag: {
					x: 2088,
					y: 1176
				}
			}, {
				id: 39,
				name: "B4: Dalomstates",
				connections: [17, 38, 40],
				short: 'B4D',
				flag: {
					x: 2138,
					y: 1361
				}
			}, {
				id: 40,
				name: "B4: Engthio",
				connections: [18, 39, 41],
				short: 'B4E',
				flag: {
					x: 2113,
					y: 1504
				}
			}, {
				id: 41,
				name: "B4: Fradistaro",
				connections: [18, 40, 42],
				short: 'B4F',
				flag: {
					x: 1951,
					y: 1590
				}
			}, {
				id: 42,
				name: "B4: Goima",
				connections: [19, 41, 43],
				short: 'B4G',
				flag: {
					x: 1735,
					y: 1605
				}
			}, {
				id: 43,
				name: "B4: Hranreka",
				connections: [19, 42, 44],
				short: 'B4H',
				flag: {
					x: 1416,
					y: 1454
				}
			}, {
				id: 44,
				name: "C4: Andgalbou",
				connections: [20, 43, 45],
				short: 'C4A',
				flag: {
					x: 1240,
					y: 1521
				}
			}, {
				id: 45,
				name: "C4: Bangne Casau",
				connections: [20, 44, 46],
				short: 'C4B',
				flag: {
					x: 1015,
					y: 1601
				}
			}, {
				id: 46,
				name: "C4: Cagalpo",
				connections: [21, 45, 47],
				short: 'C4C',
				flag: {
					x: 808,
					y: 1586
				}
			}, {
				id: 47,
				name: "C4: Denwana",
				connections: [21, 46, 48],
				short: 'C4D',
				flag: {
					x: 686,
					y: 1532
				}
			}, {
				id: 48,
				name: "C4: Eastkiabumi",
				connections: [22, 47, 49],
				short: 'C4E',
				flag: {
					x: 455,
					y: 1410
				}
			}, {
				id: 49,
				name: "C4: Francedian",
				connections: [22, 48, 50],
				short: 'C4F',
				flag: {
					x: 304,
					y: 1318
				}
			}, {
				id: 50,
				name: "C4: Guayla",
				connections: [23, 49, 51],
				short: 'C4G',
				flag: {
					x: 257,
					y: 1182
				}
			}, {
				id: 51,
				name: "C4: Hoguay",
				connections: [23, 50, 52],
				short: 'C4H',
				flag: {
					x: 267,
					y: 1011
				}
			}, {
				id: 52,
				name: "D4: Arasruhana",
				connections: [24, 51, 53],
				short: 'D4A',
				flag: {
					x: 429,
					y: 851
				}
			}, {
				id: 53,
				name: "D4: Basainti",
				connections: [24, 52, 54],
				short: 'D4B',
				flag: {
					x: 300,
					y: 718
				}
			}, {
				id: 54,
				name: "D4: Camehermenle",
				connections: [25, 53, 55],
				short: 'D4C',
				flag: {
					x: 415,
					y: 600
				}
			}, {
				id: 55,
				name: "D4: Dabiala",
				connections: [25, 54, 56],
				short: 'D4D',
				flag: {
					x: 398,
					y: 465
				}
			}, {
				id: 56,
				name: "D4: Enggreboka",
				connections: [26, 55, 57],
				short: 'D4E',
				flag: {
					x: 507,
					y: 361
				}
			}, {
				id: 57,
				name: "D4: Finnited",
				connections: [26, 56, 58],
				short: 'D4F',
				flag: {
					x: 723,
					y: 311
				}
			}, {
				id: 58,
				name: "D4: Guayre Bhugera",
				connections: [27, 57, 59],
				short: 'D4G',
				flag: {
					x: 878,
					y: 252
				}
			}, {
				id: 59,
				name: "D4: Honbo",
				connections: [27, 28, 58],
				short: 'D4H',
				flag: {
					x: 1042,
					y: 302
				}
			}];
		}
		else if (Guild_fights.MapData.map['id'] === "waterfall_archipelago") {
			return [{
				id : 0,
				name : "X1X: Elleorus",
				connections : [ 1, 2, 3, 4, 5, 6],
				short : "X1X",
				flag : {
					x : 9,
					y : 9
				}
			}, {
				id : 1,
				name : "A2A: Flunnipia",
				connections : [ 0, 2, 6, 7, 8, 18],
				short : "A2A",
				flag : {
					x : 9,
					y : 7
				}
			}, {
				id : 2,
				name : "B2A: Achinata",
				connections : [ 0, 1, 3, 8, 9, 10],
				short : "B2A",
				flag : {
					x : 11,
					y : 8
				}
			}, {
				id : 3,
				name : "C2A: Enudran",
				connections : [ 0, 2, 4, 10, 11, 12],
				short : "C2A",
				flag : {
					x : 11,
					y : 10
				}
			}, {
				id : 4,
				name : "D2A: Zebbeasos",
				connections : [ 0, 3, 5, 12, 13, 14],
				short : "D2A",
				flag : {
					x : 9,
					y : 11
				}
			}, {
				id : 5,
				name : "E2A: Appatinaka",
				connections : [ 0, 4, 6, 14, 15, 16],
				short : "E2A",
				flag : {
					x : 7,
					y : 10
				}
			}, {
				id : 6,
				name : "F2A: Kracciarhia",
				connections : [ 0, 1, 5, 16, 17, 18],
				short : "F2A",
				flag : {
					x : 7,
					y : 8
				}
			}, {
				id : 7,
				name : "A3A: Micianary",
				connections : [ 1, 8, 18, 19, 20, 36],
				short : "A3A",
				flag : {
					x : 9,
					y : 5
				}
			}, {
				id : 8,
				name : "A3B: Sheaggasia",
				connections : [ 1, 2, 7, 9, 20, 21],
				short : "A3B",
				flag : {
					x : 11,
					y : 6
				}
			}, {
				id : 9,
				name : "B3A: Birrathan",
				connections : [ 2, 8, 10, 21, 22, 23],
				short : "B3A",
				flag : {
					x : 13,
					y : 7
				}
			}, {
				id : 10,
				name : "B3B: Phiodeanet",
				connections : [ 2, 3, 9, 11, 23, 24],
				short : "B3B",
				flag : {
					x : 13,
					y : 9
				}
			}, {
				id : 11,
				name : "C3A: Ioppiorion",
				connections : [ 3, 10, 12, 24, 25, 26],
				short : "C3A",
				flag : {
					x : 13,
					y : 11
				}
			}, {
				id : 12,
				name : "C3B: Acyalyn",
				connections : [ 3, 4, 11, 13, 26, 27],
				short : "C3B",
				flag : {
					x : 11,
					y : 12
				}
			}, {
				id : 13,
				name : "D3A: Giobbolas",
				connections : [ 4, 12, 14, 27, 28, 29],
				short : "D3A",
				flag : {
					x : 9,
					y : 13
				}
			}, {
				id : 14,
				name : "D3B: Briocealyn",
				connections : [ 4, 5, 13, 15, 29, 30],
				short : "D3B",
				flag : {
					x : 7,
					y : 12
				}
			}, {
				id : 15,
				name : "E3A: Joviolmond",
				connections : [ 5, 14, 16, 30, 31, 32],
				short : "E3A",
				flag : {
					x : 5,
					y : 11
				}
			}, {
				id : 16,
				name : "E3B: Ciobiathis",
				connections : [ 5, 6, 15, 17, 32, 33],
				short : "E3B",
				flag : {
					x : 5,
					y : 9
				}
			}, {
				id : 17,
				name : "F3A: Preammirune",
				connections : [ 6, 16, 18, 33, 34, 35],
				short : "F3A",
				flag : {
					x : 5,
					y : 7
				}
			}, {
				id : 18,
				name : "F3B: Exoryme",
				connections : [ 1, 6, 7, 17, 35, 36],
				short : "F3B",
				flag : {
					x : 7,
					y : 6
				}
			}, {
				id : 19,
				name : "A4A: Phiossiania",
				connections : [ 7, 20, 36, 37, 38, 60],
				short : "A4A",
				flag : {
					x : 9,
					y : 3
				}
			}, {
				id : 20,
				name : "A4B: Klitimelan",
				connections : [ 7, 8, 19, 21, 38, 39],
				short : "A4B",
				flag : {
					x : 11,
					y : 4
				}
			}, {
				id : 21,
				name : "A4C: Ioclequey",
				connections : [ 8, 9, 20, 22, 39, 40],
				short : "A4C",
				flag : {
					x : 13,
					y : 5
				}
			}, {
				id : 22,
				name : "B4A: Lastaruz",
				connections : [ 9, 21, 23, 40, 41, 42],
				short : "B4A",
				flag : {
					x : 15,
					y : 6
				}
			}, {
				id : 23,
				name : "B4B: Ecceacyre",
				connections : [ 9, 10, 22, 24, 42, 43],
				short : "B4B",
				flag : {
					x : 15,
					y : 8
				}
			}, {
				id : 24,
				name : "B4C: Yastalyn",
				connections : [ 10, 11, 23, 25, 43, 44],
				short : "B4C",
				flag : {
					x : 15,
					y : 10
				}
			}, {
				id : 25,
				name : "C4A: Chobbiabis",
				connections : [ 11, 24, 26, 44, 45, 46],
				short : "C4A",
				flag : {
					x : 15,
					y : 12
				}
			}, {
				id : 26,
				name : "C4B: Mioccijan",
				connections : [ 11, 12, 25, 27, 46, 47],
				short : "C4B",
				flag : {
					x : 13,
					y : 13
				}
			}, {
				id : 27,
				name : "C4C: Cheabenium",
				connections : [ 12, 13, 26, 28, 47, 48],
				short : "C4C",
				flag : {
					x : 11,
					y : 14
				}
			}, {
				id : 28,
				name : "D4A: Diodiriel",
				connections : [ 13, 27, 29, 48, 49, 50],
				short : "D4A",
				flag : {
					x : 9,
					y : 15
				}
			}, {
				id : 29,
				name : "D4B: Driqela",
				connections : [ 13, 14, 28, 30, 50, 51],
				short : "D4B",
				flag : {
					x : 7,
					y : 14
				}
			}, {
				id : 30,
				name : "D4C: Gakiaran",
				connections : [ 14, 15, 29, 31, 51, 52],
				short : "D4C",
				flag : {
					x : 5,
					y : 13
				}
			}, {
				id : 31,
				name : "E4A: Phulotora",
				connections : [ 15, 30, 32, 52, 53, 54],
				short : "E4A",
				flag : {
					x : 3,
					y : 12
				}
			}, {
				id : 32,
				name : "E4B: Iccothaer",
				connections : [ 15, 16, 31, 33, 54, 55],
				short : "E4B",
				flag : {
					x : 3,
					y : 10
				}
			}, {
				id : 33,
				name : "E4C: Ohephere",
				connections : [ 16, 17, 32, 34, 55, 56],
				short : "E4C",
				flag : {
					x : 3,
					y : 8
				}
			}, {
				id : 34,
				name : "F4A: Xioceomos",
				connections : [ 17, 33, 35, 56, 57, 58],
				short : "F4A",
				flag : {
					x : 3,
					y : 6
				}
			}, {
				id : 35,
				name : "F4B: Oglilyn",
				connections : [ 17, 18, 34, 36, 58, 59],
				short : "F4B",
				flag : {
					x : 5,
					y : 5
				}
			}, {
				id : 36,
				name : "F4C: Omialanto",
				connections : [ 7, 18, 19, 35, 59, 60],
				short : "F4C",
				flag : {
					x : 7,
					y : 4
				}
			}, {
				id : 37,
				name : "A5A: Appiatoph",
				connections : [ 19, 38, 60],
				short : "A5A",
				flag : {
					x : 9,
					y : 1
				}
			}, {
				id : 38,
				name : "A5B: Cuchrarahe",
				connections : [ 19, 20, 37, 39],
				short : "A5B",
				flag : {
					x : 11,
					y : 2
				}
			}, {
				id : 39,
				name : "A5C: Eokkirune",
				connections : [ 20, 21, 38, 40],
				short : "A5C",
				flag : {
					x : 13,
					y : 3
				}
			}, {
				id : 40,
				name : "A5D: Iyoriyaz",
				connections : [ 21, 22, 39, 41],
				short : "A5D",
				flag : {
					x : 15,
					y : 4
				}
			}, {
				id : 41,
				name : "B5A: Strennearial",
				connections : [ 22, 40, 42],
				short : "B5A",
				flag : {
					x : 17,
					y : 5
				}
			}, {
				id : 42,
				name : "B5B: Atherathios",
				connections : [ 22, 23, 41, 43],
				short : "B5B",
				flag : {
					x : 17,
					y : 7
				}
			}, {
				id : 43,
				name : "B5C: Xeaxudin",
				connections : [ 23, 24, 42, 44],
				short : "B5C",
				flag : {
					x : 17,
					y : 9
				}
			}, {
				id : 44,
				name : "B5D: Stronolyn",
				connections : [ 24, 25, 43, 45],
				short : "B5D",
				flag : {
					x : 17,
					y : 11
				}
			}, {
				id : 45,
				name : "C5A: Stuckodod",
				connections : [ 25, 44, 46],
				short : "C5A",
				flag : {
					x : 17,
					y : 13
				}
			}, {
				id : 46,
				name : "C5B: Kazazriel",
				connections : [ 25, 26, 45, 47],
				short : "C5B",
				flag : {
					x : 15,
					y : 14
				}
			}, {
				id : 47,
				name : "C5C: Pilitallios",
				connections : [ 26, 27, 46, 48],
				short : "C5C",
				flag : {
					x : 13,
					y : 15
				}
			}, {
				id : 48,
				name : "C5D: Xishotish",
				connections : [ 27, 28, 47, 49],
				short : "C5D",
				flag : {
					x : 11,
					y : 16
				}
			}, {
				id : 49,
				name : "D5A: Gegleadore",
				connections : [ 28, 48, 50],
				short : "D5A",
				flag : {
					x : 9,
					y : 17
				}
			}, {
				id : 50,
				name : "D5B: Wrorrulan",
				connections : [ 28, 29, 49, 51],
				short : "D5B",
				flag : {
					x : 7,
					y : 16
				}
			}, {
				id : 51,
				name : "D5C: Cleoseotophy",
				connections : [ 29, 30, 50, 52],
				short : "D5C",
				flag : {
					x : 5,
					y : 15
				}
			}, {
				id : 52,
				name : "D5D: Equioque",
				connections : [ 30, 31, 51, 53],
				short : "D5D",
				flag : {
					x : 3,
					y : 14
				}
			}, {
				id : 53,
				name : "E5A: Eatutiar",
				connections : [ 31, 52, 54],
				short : "E5A",
				flag : {
					x : 1,
					y : 13
				}
			}, {
				id : 54,
				name : "E5B: Kaweariael",
				connections : [ 31, 32, 53, 55],
				short : "E5B",
				flag : {
					x : 1,
					y : 11
				}
			}, {
				id : 55,
				name : "E5C: Yossiryon",
				connections : [ 32, 33, 54, 56],
				short : "E5C",
				flag : {
					x : 1,
					y : 9
				}
			},
				{
					id : 56,
					name : "E5D: Ecladorth",
					connections : [ 33, 34, 55, 57],
					short : "E5D",
					flag : {
						x : 1,
						y : 7
					}
				}, {
					id : 57,
					name : "F5A: Udriomond",
					connections : [ 34, 56, 58],
					short : "F5A",
					flag : {
						x : 1,
						y : 5
					}
				}, {
					id : 58,
					name : "F5B: Kreamenon",
					connections : [ 34, 35, 57, 59],
					short : "F5B",
					flag : {
						x : 3,
						y : 4
					}
				}, {
					id : 59,
					name : "F5C: Jokuthriaz",
					connections : [ 35, 36, 58, 60],
					short : "F5C",
					flag : {
						x : 5,
						y : 3
					}
				}, {
					id : 60,
					name : "F5D: Gleoleaterra",
					connections : [ 19, 36, 37, 59],
					short : "F5D",
					flag : {
						x : 7,
						y : 2
					}
				}];
		}
	}
}