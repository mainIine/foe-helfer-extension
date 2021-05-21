/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/dsiekiera/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('ClanBattleService', 'grantIndependence', (data, postData) => {
	GvG.AddCount(data.responseData.__class__, postData[0]['requestMethod']);
});

FoEproxy.addHandler('ClanBattleService', 'deploySiegeArmy', (data, postData) => {
	GvG.AddCount(data.responseData.__class__, postData[0]['requestMethod']);
});

FoEproxy.addHandler('ClanBattleService', 'deployDefendingArmy', (data, postData) => {
	GvG.AddCount(data.responseData.__class__, postData[0]['requestMethod']);
});

FoEproxy.addHandler('ClanBattleService', 'getContinent', (data, postData) => {
	if (GvG.Actions === undefined) {
		GvG.initActions();
	}
	GvG.setRecalc(data.responseData.continent.calculation_time.start_time, true);
});

FoEproxy.addHandler('ClanBattleService', 'getProvinceDetailed', (data, postData) => {	
	GvGMap.initData(data['responseData']);
	if ($('#GvGMapWrap').length > 0) {
		GvGMap.show();
	}
});

FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
	GvG.HideGvgHud();
});

FoEproxy.addWsHandler('UpdateService', 'finishDailyCalculation', (data, postData) => {	
	if (data['responseData'] == true) {
		GvG.resetData();
	}
});

// add close button to info
// add option to clear entries

FoEproxy.addWsHandler('ClanBattleService', 'changeProvince', (data, postData) => {	
	let entry = GvGLog.addEntry(data.responseData);
	if (entry != undefined && GvGMap.Actions.edit === false) {
		MapSector.update(entry.sectorId,entry.sourceClan,entry.type);
	}
	if ($('#gvgmaplog').length > 0 && entry) {
		GvGLog.showEntry(entry);
	}
});

let GvG = {
	Actions: undefined,
	Init: false,

	initActions: () => {
		let Actions = JSON.parse(localStorage.getItem('GvGActions'));

		if (Actions === null) {			
			Actions = {
				Independences: 0,
				Sieges: 0,
				Defenders: 0,
				NextCalc: 0,
				PrevCalc: 0,
				LastAction: 0
			};
			localStorage.setItem('GvGActions', JSON.stringify(Actions));
		}
		GvG.Actions = Actions;
		GvG.Init = true;
	},

    /**
	 * Build HUD
	 */
	showGvgHud: () => {
		if ($('#gvg-hud').length === 0) {
			HTML.AddCssFile('gvg');
			let div = $('<div />');

			div.attr({
				id: 'gvg-hud',
				class: 'game-cursor'
			});

			$('body').append(div).promise().done(function() {
				div.append('<div class="independences">'+GvG.Actions.Independences+'/4</div>')
					.attr('title', i18n('GvG.Independences.Tooltip') + '<br><em>' + i18n('GvG.Independences.Tooltip.Warning') + '</em>')
					.tooltip(
						{
							useFoEHelperSkin: true,
							headLine: i18n('Global.BoxTitle'),
							placement: 'bottom',
							html: true
						}
					)
					.append('<button class="btn-default mapbutton" onclick="GvGMap.show()">MAP</button>');
			});
		}
		else {
			$('#gvg-hud .independences').text(GvG.Actions.Independences+'/4');
		}
	},

    /**
	 * Hide HUD
	 */
	HideGvgHud: () => {
		if ($('#gvg-hud').length > 0) {
			$('#gvg-hud').fadeToggle(function() {
				$(this).remove();
			});
		}
	},

	/**
	 * 
	 * @param {*} response  
	 * @param {*} requestMethod 
	 */
	AddCount: (response, requestMethod) => {
		let time = Math.ceil(MainParser.getCurrentDateTime()/1000); 

		if (requestMethod === "deployDefendingArmy" && response === "Success") {
			GvG.Actions.Defenders++;
		}
		else if (requestMethod === "deploySiegeArmy" && response === "Success") {
			GvG.Actions.Sieges++;
		}
		else if (requestMethod === "grantIndependence" && response === "Success") {
			GvG.Actions.Independences++;
		}

		GvG.LastAction = time;
		GvG.showGvgHud();
		
		localStorage.setItem('GvGActions', JSON.stringify(GvG.Actions));
	},
 
    /**
	 * Set Recalc time
	 * @param calcTime
	 */
    setRecalc: (calcTime) => {
		let time = Math.ceil(MainParser.getCurrentDateTime()/1000); 

		if (GvG.Actions.NextCalc !== calcTime) {
			GvG.Actions.NextCalc = calcTime;
		}

		if (GvG.Actions.PrevCalc === 0) {
			GvG.Actions.PrevCalc = (calcTime-86400);
		}

		if (GvG.Actions.LastAction < GvG.Actions.PrevCalc && GvG.Actions.LastAction !== 0) {
			console.log('GvG.Actions.LastAction < GvG.Actions.PrevCalc');
			//GvG.resetData(calcTime);
		}

		localStorage.setItem('GvGActions', JSON.stringify(GvG.Actions));
		GvG.showGvgHud();
	},

    /**
	 * Reset all Data
	 */
	resetData: (calcTime = 0) => {
		let time = Math.ceil(MainParser.getCurrentDateTime()/1000); 

		GvG.Actions.Independences = 0;
		GvG.Actions.Sieges = 0;
		GvG.Actions.Defenders = 0;
		GvG.Actions.PrevCalc = GvG.Actions.NextCalc;
		GvG.Actions.NextCalc = time+40000;
		GvG.Actions.LastAction = time;
		if (calcTime > 0) {
			GvG.Actions.NextCalc = calcTime;
		}
		
		localStorage.setItem('GvGActions', JSON.stringify(GvG.Actions));
	}
}

let GvGMap = {
	OnloadDataTime: 0,
	Canvas: {},
	CanvasCTX: {},
	Map: {
		OnloadData: null,
		ProvinceData: {},
		GuildData: {},
		Sectors: [],
		Guilds: [],
		Width: 0,
		Height: 0,
		HexWidth: 50,
		HexHeight: 40,
		Era: "",
	},
	OwnGuild: {
		Id: 0,
		Members: [],
	},
	Actions: {
		edit: false,
		drag: true,
		list: true,
	},
	PowerValues: [],
	Colors: {
        "blank": [{"r":240,"g":240,"b":240}],
        "b": [
            {"r":0,"g":185,"b":238},
            {"r":0,"g":159,"b":227},
            {"r":72,"g":140,"b":203},
            {"r":0,"g":105,"b":180},
            {"r":61,"g":61,"b":210},
            {"r":86,"g":68,"b":163},
            {"r":0,"g":72,"b":153},
            {"r":0,"g":85,"b":120},
            {"r":0,"g":55,"b":97},
            {"r":40,"g":85,"b":120},
            {"r":40,"g":55,"b":97},
            {"r":40,"g":10,"b":50},
            {"r":0,"g":10,"b":50}
        ],
        "r": [
            {"r":203,"g":78,"b":72},
            {"r":163,"g":77,"b":68},
            {"r":227,"g":80,"b":0},
            {"r":238,"g":0,"b":0},
            {"r":180,"g":0,"b":0},
            {"r":153,"g":0,"b":51},
            {"r":120,"g":20,"b":0},
            {"r":140,"g":40,"b":0},
            {"r":97,"g":0,"b":45},
            {"r":127,"g":0,"b":55},
            {"r":140,"g":17,"b":74},
            {"r":190,"g":17,"b":74},
            {"r":210,"g":61,"b":89}
        ],
        "g": [
            {"r":162,"g":185,"b":12},
            {"r":50,"g":200,"b":70},
            {"r":0,"g":180,"b":0},
            {"r":50,"g":160,"b":70},
            {"r":0,"g":140,"b":70},
            {"r":50,"g":120,"b":0},
            {"r":0,"g":100,"b":0},
            {"r":50,"g":80,"b":0},
            {"r":0,"g":60,"b":0},
            {"r":0,"g":40,"b":0},
            {"r":90,"g":160,"b":80},
            {"r":50,"g":180,"b":30},
            {"r":50,"g":200,"b":80}
        ],
        "premium": [
            [{"r":2,"g":2,"b":2},{"r":19,"g":0,"b":0},{"r":65,"g":0,"b":0},{"r":98,"g":0,"b":25}],
            [{"r":22,"g":62,"b":11},{"r":17,"g":17,"b":17},{"r":18,"g":53,"b":40},{"r":9,"g":55,"b":75}],
            [{"r":11,"g":25,"b":62},{"r":8,"g":7,"b":8},{"r":17,"g":63,"b":112},{"r":3,"g":24,"b":92}],
            [{"r":9,"g":55,"b":75},{"r":13,"g":93,"b":57},{"r":49,"g":25,"b":13},{"r":11,"g":62,"b":47}],
            [{"r":56,"g":11,"b":62},{"r":88,"g":10,"b":70},{"r":83,"g":34,"b":133},{"r":33,"g":2,"b":68}],
            [{"r":79,"g":17,"b":0},{"r":117,"g":44,"b":7},{"r":47,"g":33,"b":23},{"r":62,"g":18,"b":11}],
            [{"r":242,"g":185,"b":0},{"r":214,"g":150,"b":37},{"r":187,"g":116,"b":13},{"r":200,"g":105,"b":11}],
            [{"r":35,"g":60,"b":30},{"r":36,"g":76,"b":32},{"r":35,"g":60,"b":30},{"r":35,"g":60,"b":30}],
            [{"r":44,"g":57,"b":64},{"r":28,"g":35,"b":39},{"r":30,"g":10,"b":50},{"r":47,"g":20,"b":41}],
            [{"r":50,"g":36,"b":51},{"r":56,"g":50,"b":63},{"r":61,"g":25,"b":84},{"r":80,"g":70,"b":97}],
            [{"r":50,"g":19,"b":6},{"r":95,"g":13,"b":8},{"r":128,"g":20,"b":13},{"r":130,"g":38,"b":10}],
            [{"r":31,"g":62,"b":109},{"r":0,"g":9,"b":102},{"r":14,"g":29,"b":67},{"r":38,"g":34,"b":63}],
            [{"r":37,"g":48,"b":37},{"r":6,"g":87,"b":0},{"r":21,"g":58,"b":24},{"r":30,"g":67,"b":0}]
		]
    },
	NoGuild: { id: 0, name: i18n('Boxes.GvGMap.Log.NPC'), color: {r:100,g:100,b:100} },
	CurrentGuild: { id: 0, name: i18n('Boxes.GvGMap.Log.NPC'), color: {r:100,g:100,b:100} },

	Tabs: [],
	TabsContent: [],

	initData: (response, initial = true) => {
		GvGMap.Map.OnloadData = response;
		GvGMap.Map.OnloadDataTime = MainParser.getCurrentDateTime();
		GvGMap.Map.Guilds = [];
		GvGMap.Map.Sectors = [];
		GvGMap.Map.ProvinceData = GvGMap.Map.OnloadData.province_detailed;
		GvGMap.Map.GuildData = GvGMap.Map.OnloadData.province_detailed.clans;
		GvGMap.PowerValues = GvGMap.Map.OnloadData.province_detailed.power_values;
		GvGMap.Map.Era = GvGMap.Map.OnloadData.province_detailed.era;
		GvGMap.OwnGuild.Id = GvGMap.Map.OnloadData.clan_data.clan.id;
		GvGMap.OwnGuild.Members = GvGMap.Map.OnloadData.clan_data.clan.members;
	},

	initMap: (size = 'small', initial = true) => {
		let hexWidth = 50;
		let hexHeight = 40;
		if (size == 'mini') {
			hexWidth = 22;
			hexHeight = 22;
		}
		else if (size == 'big') {
			hexWidth = 90;
			hexHeight = 72;
		}

		GvGMap.Canvas = document.getElementById("gvg-map");
		GvGMap.CanvasCTX = GvGMap.Canvas.getContext('2d');
		GvGMap.Map.HexWidth = hexWidth;
		GvGMap.Map.HexHeight = hexHeight;
		GvGMap.Size = size;
		GvGMap.Map.Width = (GvGMap.Map.ProvinceData.bounds.x_max - GvGMap.Map.ProvinceData.bounds.x_min)*GvGMap.Map.HexWidth+GvGMap.Map.HexWidth/2;
		GvGMap.Map.Height = (GvGMap.Map.ProvinceData.bounds.y_max - GvGMap.Map.ProvinceData.bounds.y_min)*GvGMap.Map.HexHeight*0.8;
		GvGMap.CurrentGuild = GvGMap.NoGuild;
	},

	/**
	 * Show GvG Map
	 */
	show: () => {
		if ($('#gvg-map').length === 0) {

			moment.locale(MainParser.Language);

			HTML.Box({
				id: 'GvGMap',
				title: i18n('Boxes.GvGMap.Title')+ ' - BETA!',
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true
			});

			GvGMap.buildMap();
		}
		else {
			GvGMap.buildMap();
		}
	},

    /**
	 * Hide GvG Map
	 */
	hide: () => {
		if ($('#GvGMap').length > 0) {
			$('#GvGMap').remove();
		}
	},

	buildContent: () => {
		let h = [];
		let collapsed = 'collapsed';
		if (GvGMap.Actions.list) {
			collapsed = '';
		}
		h.push('<div id="toggleOptions" class="'+collapsed+'"></div><div id="GvGMapContent" class="mapFeature">');
		h.push('<div id="GvGMapMeta" class="dark-bg mapFeature">');
		h.push('<div id="GvGMapActions" class="btn-group mapFeature">');
			h.push('<span id="editMap" class="btn-default">'+i18n('Boxes.GvGMap.Action.Edit')+'</span>');
			h.push('<span id="noGuild" class="btn-default btn-inset editAction"></span>');
			//h.push('<span id="pickGuild" class="btn-default btn-inset editAction"></span>');
			//h.push('<span id="markerRed" class="btn-default btn-inset editAction"></span>');
			h.push('<span id="zoomMap" class="btn-default">'+i18n('Boxes.GvGMap.Action.Zoom')+'</span>');
			h.push('<span id="dragMap" class="btn-default active">'+i18n('Boxes.GvGMap.Action.Drag')+'</span>');
			h.push('</div>');
			h.push('</div>');
		h.push('<div id="GvGMapWrap" class="mapFeature">');
		h.push('<canvas id="gvg-map"></canvas>');
		h.push('</div>');
		h.push('</div>');
		h.push('<div id="GvGMapInfo" class="mapFeature"></div>');
		h.push('<div id="gvgOptions" class="'+collapsed+'"><div id="gvgOptionsContent"></div></div>');

		$('#GvGMapBody').html(h.join(''));
	},

	/**
	 * Build GvG Map
	 */
	buildMap: (mapSize = 'small', initial = true) => {
		let t = [];
		if (GvGMap.Map.OnloadData != null) {
			GvGMap.Tabs = [];
			GvGMap.TabsContent = [];

			GvGMap.SetTabs('gvgmapguilds');
			GvGMap.SetTabs('gvgmaplog');

			GvGMap.buildContent();
			GvGMap.populateCanvas(mapSize, initial);
			GvGMap.drawInfo();
			GvGMap.showGuilds();
			GvGLog.show();

			let editBtn = document.getElementById("editMap");
			let pickGuildBtn = document.getElementById("pickGuild");
			let markRedBtn = document.getElementById("markerRed");
			let noGuildBtn = document.getElementById("noGuild");
			let dragBtn = document.getElementById("dragMap");
			let zoomBtn = document.getElementById("zoomMap");
			let toggleListBtn = document.getElementById("toggleOptions");

			toggleListBtn.addEventListener('click', function (e) {
				$('#gvgOptions').toggleClass('collapsed');
				$(this).toggleClass('collapsed');
				GvGMap.Actions.list = (GvGMap.Actions.list == true) ? false : true;
			}, false);

			editBtn.addEventListener('click', function (e) {
				GvGMap.Actions.edit = true;
				GvGMap.Actions.drag = false;
				dragBtn.classList.remove('btn-default-active');
				editBtn.classList.add('btn-default-active');
				$('.editAction').show();
			}, false);
			dragBtn.addEventListener('click', function (e) {
				GvGMap.Actions.edit = false;
				GvGMap.Actions.drag = true;
				editBtn.classList.remove('btn-default-active');
				dragBtn.classList.add('btn-default-active');
				$('.editAction').hide();
			}, false);
			zoomBtn.addEventListener('click', function (e) {
				if (GvGMap.Size === 'small')
					GvGMap.buildMap('big', false);
				else
					GvGMap.buildMap('small', false);
			}, false);
			noGuildBtn.addEventListener('click', function (e) {
				GvGMap.CurrentGuild = GvGMap.NoGuild;
			}, false);

			GvGMap.mapDragOrEdit();
			
			t.push('<div class="gvg-tabs tabs">');
			t.push( GvGMap.GetTabs() );
			t.push( GvGMap.GetTabContent() );
			t.push('</div>');
			$('#gvgOptionsContent').html(t.join(''));

			$('#GvGMap').find('#gvgmaplog').promise().done(function() {
				$('.gvg-tabs').tabslet({active: 2});
				$('.gvg-tabs .gvgmapguilds span').text(i18n('Boxes.GvGMap.Guilds'));
				$('.gvg-tabs .gvgmaplog span').text(i18n('Boxes.GvGMap.Log'));

				$('#GvGGuilds tr').click(function (e) {
					let id = $(this).attr('id').replace('id-', '')/1;
					$('#GvGGuilds tr').removeClass('active');
					$(this).addClass('active');
					
					GvGMap.CurrentGuild = GvGMap.Map.Guilds.find(x => x.id  === id);
				});

				let textFilter = document.getElementById("logFilter");
				textFilter.addEventListener('keyup', function (e) {
					let search = textFilter.value.toLowerCase();
					GvGLog.FilterValue = search;
					let logEntries = document.getElementsByClassName("logEntry");
					for (i = 0; i < logEntries.length; i++) {
						let text = logEntries[i].textContent.toLowerCase();
						if (!text.includes(search)) {
							logEntries[i].style.display = "none";
						}
						else {
							logEntries[i].style.display = "table-row";
						}
					}
				}, false);
			});
		}
		else {
			h.push('<div class="dark-bg text-center" style="width: 100%;"><h2>Please open a map!</h2></div>');

			$('#GvGMapBody').html(h.join(''));
			GvGMap.hide();
		}
	},

	/**
	 * Creates a guild object from the response data
	 * @param {*} data - responseData for a clan
	 * @returns Object - guild
	 */
	createGuild: (data) => {
		let guild = {
			id: data.id,
			name: data.name,
			flag: data.flag,
			color: GvGMap.getGuildColor(data),
			flagCoordinates: GvGMap.getFlagImageCoordinates(data.flag),
			power: 0,
			sectors: 0
		};
		return guild;
	},

	/**
	 * @param {*} mapSize - string, sizes are small, mini, big
	 */
	populateCanvas: (mapSize, initial) => {
		GvGMap.initMap(mapSize,initial);

		$(GvGMap.Canvas).attr({
			'id': 'gvg-map',
            'width': GvGMap.Map.Width,
            'height': GvGMap.Map.Height
        });
		
		GvGMap.CanvasCTX.clearRect(0, 0, GvGMap.Map.Width, GvGMap.Map.Height);

		if (GvGMap.Map.Guilds.length == 0) {
			GvGMap.Map.GuildData.forEach(function (guild) {
				let guildOnMap = GvGMap.createGuild(guild);
				GvGMap.Map.Guilds.push(guildOnMap);
				if ((guild.id) === GvGMap.OwnGuild.Id) {
					GvGMap.CurrentGuild = guildOnMap;
				}
			});
		}
		else { // on zoom or clicking when already opened
			GvGMap.Map.Guilds.forEach(function (guild) {
				guild.flagCoordinates = GvGMap.getFlagImageCoordinates(guild.flag);
			});
		}

		if (GvGMap.Map.Sectors.length == 0) {
			GvGMap.Map.ProvinceData.sectors.forEach(function (sector) {
				if (sector.hitpoints != undefined) {
					let realX = (sector.position.x - GvGMap.Map.ProvinceData.bounds.x_min) * GvGMap.Map.HexWidth;
					let realY = (sector.position.y - GvGMap.Map.ProvinceData.bounds.y_min) * GvGMap.Map.HexHeight;
					let newSector = {};

					if (sector.position.y % 2 === 0) 
						newSector = MapSector.create(realX, realY * 0.75, sector);
					else 
						newSector = MapSector.create(realX + (GvGMap.Map.HexWidth * 0.5), realY * 0.75, sector);
					
					GvGMap.Map.Sectors.push(newSector);
					
					let guild = MapSector.getOwnerById(newSector.owner.id);
					if (guild != null) {
						guild.power += newSector.power;
						guild.sectors++;
					}
					MapSector.draw(newSector);
				}
			});
		}
		else { // on zoom or clicking when already opened
			GvGMap.Map.Sectors.forEach(function (sector) {
				let realX = (sector.coordinates.x - GvGMap.Map.ProvinceData.bounds.x_min) * GvGMap.Map.HexWidth;
				let realY = (sector.coordinates.y - GvGMap.Map.ProvinceData.bounds.y_min) * GvGMap.Map.HexHeight;
				sector.position.x = realX;
				sector.position.y = realY * 0.75;

				if (sector.coordinates.y % 2 === 0) 
					sector.position.y = realY * 0.75;
				else 
					sector.position.x = realX + (GvGMap.Map.HexWidth * 0.5);

				MapSector.draw(sector,true);
			});
		}
	},

	drawInfo: () => {
		let era = (Technologies.Eras[GvGMap.Map.Era] != 0) ? i18n('Eras.'+Technologies.Eras[GvGMap.Map.Era]) : i18n('Eras.GvGAllAge');
		GvGMap.CanvasCTX.font = "bold 22px Arial";
		GvGMap.CanvasCTX.textAlign = "left";
		GvGMap.CanvasCTX.fillStyle = '#ffb539';
		GvGMap.CanvasCTX.fillText(era, 10, 25);
		GvGMap.CanvasCTX.font = "12px Arial";
		GvGMap.CanvasCTX.fillStyle = '#ccc';
		GvGMap.CanvasCTX.fillText(moment(GvGMap.Map.OnloadDataTime).format('D.M.YY'), 10, 45);
	},

	findGuildById: (id) => {
		return GvGMap.Map.Guilds.find(x => x.id  === id);
	},

	findSectorById: (id) => {
		return GvGMap.Map.Sectors.find(x => x.id  === id);
	},

	mapDragOrEdit: () => {
		const wrapper = document.getElementById('GvGMapWrap');	
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

        GvGMap.Canvas.addEventListener('mousedown', function (e) {
			if (GvGMap.Actions.drag) {
				wrapper.addEventListener('mousedown', mouseDownHandler);
			}
			if (GvGMap.Actions.edit) {
				wrapper.removeEventListener('mousedown', mouseDownHandler);
			}
			GvGMap.setSector(e);
        }, false);
	},

	setSector: (e) => {
        GvGMap.Map.Sectors.forEach(function (sector) {
            if (e.offsetX >= (sector.position.x + 5) && e.offsetX <= (sector.position.x + GvGMap.Map.HexWidth - 5)) {
                if (e.offsetY >= (sector.position.y + 5) && e.offsetY <= (sector.position.y + GvGMap.Map.HexHeight - 5)) {
					if (GvGMap.Actions.drag) {
						GvGMap.showSector(sector);
					}
					else { // edit
						if (sector.terrain === "plain" || sector.terrain === "beach") {
							let prevOwner = sector.owner;
							if (sector.owner.id == GvGMap.NoGuild.ID)
								prevOwner = GvGMap.NoGuild;

							sector.owner = GvGMap.CurrentGuild;
							if (sector.owner.id <= 0) {
								sector.owner.color = MapSector.getColorByTerrain(sector);
							}
							MapSector.draw(sector, true);
							GvGMap.recalcGuildProvinces(prevOwner, sector.owner, sector);
						}
					}
                    return sector;
                }
            }
        });
		return undefined;
    },

	recalcGuildProvinces: (oldGuild, newGuild, sector) => {
		if (oldGuild.id > 0) {
			oldGuild.sectors--;
			oldGuild.power -= sector.power;
		}

		if (newGuild.id > 0) {
			newGuild.sectors++;
			newGuild.power += sector.power;
		}

		GvGMap.updateGuildData(oldGuild);
		GvGMap.updateGuildData(newGuild);
	},

	updateGuildData: (guild) => {
		let tableRow = document.getElementById("id-"+guild.id);
		if (tableRow != null) {
			let html = '<td><span class="guildflag '+guild.flag+'" style="background-color: '+GvGMap.colorToString(guild.color)+'"></span>'+guild.name+'</td>';
			html += '<td class="text-center">'+guild.sectors+'</td>';
			html += '<td class="text-center">'+guild.power+'</td>';
			tableRow.innerHTML = html;
		}
	},

	showSector: (sector) => {
		let html = '';
		if (sector.owner.id != 0) {
			html += '<div id="sectorInfo">';
			html += '<span class="guildflag '+sector.owner.flag+'" style="background-color: '+GvGMap.colorToString(sector.owner.color)+';border-color: '+GvGMap.colorToString(sector.owner.color)+'"></span>';
			html += '<b class="text-bright">'+ sector.owner.name +'</b><br>';
			if (MapSector.underSiege(sector))
				html += 'Under Siege by: '+ MapSector.underSiege(sector) +'<br>';
			html += i18n('Boxes.GvGMap.Sector.Hitpoints') + ': ' + sector.hitpoints +'/80<br>';
			html += i18n('Boxes.GvGMap.Sector.Coords') + ': ' + MapSector.coords(sector) +'<br>';
			html += i18n('Boxes.GvGMap.Sector.Power') + ': ' + sector.power +'<br>';
			if (sector.isProtected)
				html += i18n('Boxes.GvGMap.Sector.Protected')+'<br>';
			html += 'Terrain: '+ sector.terrain +'<br>';
			html += '</div>';
		}

		document.getElementById("GvGMapInfo").innerHTML = html;
    },

	showGuilds: () => {
        let t = [];

        GvGMap.Map.Guilds.sort(function(a, b) {
            if (a.power > b.power)
                return -1;
            if (a.power < b.power)
                return 1;
            return 0;
        });

		t.push('<table id="GvGGuilds" class="foe-table">');
		t.push('<thead><tr>');
		t.push('<th>'+i18n('Boxes.GvGMap.Guild.Name')+'</th>');
		t.push('<th>'+i18n('Boxes.GvGMap.Guild.Sectors')+'</th>');
		t.push('<th>'+i18n('Boxes.GvGMap.Guild.Power')+'</th>');
		t.push('</tr></thead>');
		GvGMap.Map.Guilds.forEach(function (guild) {
			t.push('<tr id="id-'+guild.id+'">');
			t.push('<td><span class="guildflag '+guild.flag+'" style="background-color: '+GvGMap.colorToString(guild.color)+'"></span>'+guild.name+'</td>');
			t.push('<td class="text-center">'+guild.sectors+'</td>');
			t.push('<td class="text-center">'+guild.power+'</td>');
			t.push('</tr>');
		});
		t.push('</table>');
		
		GvGMap.SetTabContent('gvgmapguilds', t.join(''));
	},

	getGuildColor: (guild) => {
        flag = guild.flag.split("_") || null;
        let color = {"r":255,"g":255,"b":255};

        if (flag != null)  {
            if (flag[0].search("premium") >= 0) 
				color = GvGMap.Colors.premium[flag[flag.length-1]-1][Math.round(guild.id/4)%4];
            else if (flag[flag.length - 1].toLowerCase() === "r") 
                color = GvGMap.Colors.r[Math.round(guild.id/13)%13];
            else if (flag[flag.length - 1].toLowerCase() === "g")
                color = GvGMap.Colors.g[Math.round(guild.id/13)%13];
            else
				if (flag.length != 1)
					color = GvGMap.Colors.b[Math.round(guild.id/13)%13];

        }
        return color;
    },

	getFlagImageCoordinates: (flag) => {
        let id = flag.split("_");

        if (id[id.length - 1].toLowerCase() === "r" || id[id.length - 1].toLowerCase() === "g")
            id = parseInt(id[id.length - 2]);
        else
            id = parseInt(id[id.length - 1]);

        if (flag.search("premium") >= 0)
            id += 40;

		let coords = {"x": (id % 10 ) * (GvGMap.Map.HexWidth), "y": Math.floor(id / 10) * (GvGMap.Map.HexHeight)};
        return coords;
    },

	colorToString: (color) => {
		return "rgb("+color.r+","+color.g+","+color.b+")";
	},

	showGuildFlagAndName: (id) => {
		let guild = GvGMap.findGuildById(id);
		if (id < 0) {
			return i18n('Boxes.GvGMap.Log.NPC');
		}
		else if (guild === GvGMap.OwnGuild) {
			return '<span class="guildflag '+guild.flag+'" style="background-color: '+GvGMap.colorToString(guild.color)+'"></span> '+ guild.name;
		}
		else if (guild != null) {
			return '<span class="guildflag '+guild.flag+'" style="background-color: '+GvGMap.colorToString(guild.color)+'"></span> '+ guild.name;
		}
		return i18n('Boxes.GvGMap.Log.UnknownGuild');
	},

	/**
	 * Merkt sich alle Tabs
	 * @param id
	 */
	 SetTabs: (id)=> {
		GvGMap.Tabs.push('<li class="' + id + ' game-cursor"><a href="#' + id + '" class="game-cursor"><span>&nbsp;</span></a></li>');
	},

	/**
	 * Gibt alle gemerkten Tabs aus
	 * @returns {string}
	 */
	GetTabs: ()=> {
		return '<ul class="horizontal dark-bg">' + GvGMap.Tabs.join('') + '</ul>';
	},

	/**
	 * Speichert BoxContent zwischen
	 * @param id
	 * @param content
	 */
	SetTabContent: (id, content)=> {
		// ab dem zweiten Eintrag verstecken
		let style = GvGMap.TabsContent.length > 0 ? ' style="display:none"' : '';

		GvGMap.TabsContent.push('<div id="' + id + '"' + style + '>' + content + '</div>');
	},

	/**
	 * Setzt alle gespeicherten Tabellen zusammen
	 * @returns {string}
	 */
	GetTabContent: ()=> {
		return GvGMap.TabsContent.join('');
	},
}

let GvGLog = {
	Entries: [],
	FilterValue: '',

	addEntry: (response) => {
		if (response != undefined && response.type != undefined) {
			let type = response.type.replace('ClanBattle/','');
			let entry = {
				class: response.__class__,
				sectorId: response.sector_id,
				timestamp: response.timestamp,
				type: type,
				sourceClan: response.source_clan_id,
				details: {},
			};
			if (response.__class__ === "ClanBattleSectorChange") { // sector_independence_granted, sector_conquered, sector_slot_unlocked
				entry.targetClan = response.target_clan_id;
				entry.details = {
					playerId: (response.source_clan_id === GvGMap.OwnGuild.Id) ? response.player_id : 0
				}
				if (entry.type == "sector_slot_unlocked" && entry.sourceClan != GvGMap.OwnGuild.Id) {
					entry.details = {};
				}
			}
			else if (response.__class__ === "ClanBattleBuildingChange") { // headquarter_placed
				entry.targetClan = response.target_clan_id;
				entry.details = {
					nextRelocate: response.building.next_relocate
				}
			}
			else if (response.__class__ === "ClanBattleClanChange" && type == "clan_entered") {
				// add Guild to pool
				let guildOnMap = {
					id: response.source_clan_id,
					name: response.clan.name,
					flag: response.clan.flag,
					color: GvGMap.getGuildColor(response.clan),
					flagCoordinates: GvGMap.getFlagImageCoordinates(response.clan.flag),
					power: 0,
					sectors: 0,
				};
				GvGMap.Map.Guilds.push(guildOnMap);
			}
			else if (response.__class__ == "ClanBattleArmyChange") {
				entry.targetClan = response.target_clan_id;
				entry.details = {
					hitpoints: response.hitpoints,
					playerId: (response.source_clan_id == GvGMap.OwnGuild.Id) ? response.player_id : 0,
				}
			}

			if (entry.details != {} && type != "defender_low_hp" && type != "siege_low_hp" && type != "sector_fog_changed" && type != "clan_defeated" && type != "sector_slot_unlocked") {
				GvGLog.Entries.unshift(entry);
				return entry;
			}
		}
		return null;
	},

	showEntry: (entry) => {
		let tr = GvGLog.buildEntry(entry);
		$('#GvGMap').find('#gvgmaplog').promise().done(function() {
			if (tr != null) {
				let text = tr.textContent.toLowerCase();
				if (!text.includes(GvGLog.FilterValue)) {
					console.log('hey');
					tr.style.display = 'none';
				}
				$('#GvGlog').prepend(tr);
				console.log(tr);
			}
		});
	},

	buildEntry: (entry) => {
		let t = [];
		let sector = MapSector.getById(entry.sectorId);
		let hostileAction = (entry.targetClan == GvGMap.OwnGuild.Id && (entry.type == 'defender_damaged' || entry.type == 'defender_defeated')) ? 'alert' : 'noAlert';
		let friendlyAction = (entry.targetClan == GvGMap.OwnGuild.Id && (entry.type == 'defender_deployed' || entry.type == 'defender_replaced')) ? 'friendly' : 'actionUnknown';
		let tr = document.createElement('tr');
		if (sector != null) { // if sector is on map
			let sectorCoords = MapSector.coords(sector);
			t.push('<td><b class="text-bright">'+sectorCoords+'</b><br>'+moment.unix(entry.timestamp).format('HH:mm:ss')+'</td>');
			t.push('<td>');
				if (entry.sourceClan != entry.targetClan && entry.targetClan != undefined && entry.sourceClan != undefined)
					t.push(GvGMap.showGuildFlagAndName(entry.sourceClan) +' → '+ GvGMap.showGuildFlagAndName(entry.targetClan));
				else if (entry.sourceClan != undefined)
					t.push(GvGMap.showGuildFlagAndName(entry.sourceClan));
				t.push('<br>'+i18n('Boxes.GvGMap.Log.'+entry.type));
				if (entry.details.playerId != undefined) {
					if (entry.details.playerId > 0) {
						let memberName = GvGMap.OwnGuild.Members.find(x => x.player_id  === entry.details.playerId).name;
						t.push(', '+memberName);
					}
				}
				//t.push(', HP: '+entry.hitpoints);
			t.push('</td>');
			let html = t.join('');
			tr.classList.add(entry.type,hostileAction,friendlyAction,'logEntry');
			tr.innerHTML = html;
			return tr;
		}
		return null;
	},

	show: () => {
        let t = [];
		t.push('<div id="logFilterWrap" class="dark-bg"><input type="text" data-type="text" id="logFilter" placeholder="'+i18n('Boxes.Infobox.Filter')+'" class="gvglogfilter filter-msg game-cursor" value=""></input></div>');
		t.push('<table id="GvGlog" class="foe-table">');
		t.push('<thead><tr>');
		t.push('<th>'+i18n('Boxes.GvGMap.Log.Sector')+'</th>');
		t.push('<th>'+i18n('Boxes.GvGMap.Log.Info')+'</th>');
		t.push('</tr></thead>');

		GvGLog.Entries.forEach(function(entry) {
			if (entry != null) {
				let tr = GvGLog.buildEntry(entry);
				if (tr != null)
					t.push(tr.outerHTML);
			}
		});
		t.push('</table>');

		GvGMap.SetTabContent('gvgmaplog', t.join(''));
	},
}

let MapSector = {
	create: (x, y, info) => {
		let owner = MapSector.getOwnerById(info.owner_id);
		if (owner.id == GvGMap.NoGuild.id) {
			owner.color = MapSector.getColorByTerrain(info);
		}
		let sector = {
			id: info.sector_id,
			position: {
				"x": x,
				"y": y
			},
			coordinates: {
				"x": info.position.x,
				"y": info.position.y
			},
			power: parseInt(GvGMap.PowerValues[info.power]) || GvGMap.PowerValues[0],
			powerMultiplicator: parseInt(info.power)+1 || 1,
			isProtected: info.is_protected,
			terrain: info.terrain,
			headquarter: (info.building != null),
			hitpoints: info.hitpoints,
			owner: owner,
			siege: {
				clan: info.siege_clan_id || 0,
			},
		}
		return sector;
	},

	getOwnerById: (id) => {
		let guild = GvGMap.Map.Guilds.find(x => x.id  === id);
		return (guild != undefined) ? guild : GvGMap.NoGuild;
	},

	getById: (id) => {
		let sector = GvGMap.Map.Sectors.find(x => x.id  === id);
		return (sector != undefined) ? sector : null;
	},

	underSiege: (sector) => {
		if (sector.siege.clan != 0)
			return GvGMap.Map.Guilds.find(x => x.id  === sector.siege.clan).name;
		return false;
	},

	update: (sectorId, ownerId, type) => {
		let guild = MapSector.getOwnerById(ownerId) || { id: 0 };
		let sector = MapSector.getById(sectorId);

		if (sector != null) {
			if (type === "sector_conquered") {
				sector.owner = guild;
				sector.isProtected = true;
				sector.headquarter = false;
				sector.siege.clan = 0;
				MapSector.draw(sector);
			}
			else if (type === "sector_independence_granted" || type === "sector_conquered") {
				sector.owner.id = 0;
				sector.owner.color = MapSector.getColorByTerrain(sector);
				sector.siege.clan = 0;
				MapSector.draw(sector);
			}
			else if (type === "headquarter_placed") {
				sector.headquarter = true;
				// todo: run through all sectors with guildid, remove old HQ
				MapSector.draw(sector);
			}
			else if (type === "siege_deployed") {
				sector.siege.clan = ownerId;
				MapSector.draw(sector);
			}
		}
	},

	getColorByTerrain: (sector) => {
		let powerMultiplicator = sector.powerMultiplicator || 1;
		let color = {};
		if (sector.terrain == "beach") {
			color = {"r":233,"g":233,"b":114-(parseInt(powerMultiplicator)+1)*10};
		}
		else if (sector.terrain == "plain") {
			color = {"r":126-(parseInt(powerMultiplicator)+1)*10,"g":222-(parseInt(powerMultiplicator)+1)*10,"b":110-(parseInt(powerMultiplicator)+1)*10};
		}
		else {
			if (sector.terrain == "rocks")
				color = {"r":50,"g":50,"b":50};
			if (sector.terrain == "water")
				color = {"r":4,"g":28,"b":45};
		}
		return color;
	},

	/**
	 * Draws a sector on the map + flag and HQ/status if it has an owner
	 */
	draw: (sector, redraw = false, marker = false) => {
		MapSector.drawHex(sector);
		MapSector.drawHexText(sector);
		let imgSizeFactor = 0.5;

		if (sector.owner.id > 0) {
			let flag = sector.owner.flagCoordinates;
		
			let img = new Image();
			img.src = "data:image/png;base64,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";

			if (GvGMap.Size == 'big') {
				imgSizeFactor = 0.9;
				img.src = "data:image/png;base64,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";
			}
			let imgPositions = {
				hqX: 900*imgSizeFactor,
				hqY: 400*imgSizeFactor,
				shieldX: 800*imgSizeFactor,
				shieldY: 400*imgSizeFactor,
				swordX: 700*imgSizeFactor,
				swordY: 400*imgSizeFactor,
				redX: 600*imgSizeFactor,
				redY: 400*imgSizeFactor,
				blueX: 500*imgSizeFactor,
				blueY: 400*imgSizeFactor,
				yellowX: 500*imgSizeFactor,
				yellowY: 400*imgSizeFactor,
			}

			if (GvGMap.Size != 'mini') {
				img.onload = function () {
					if (!redraw) {
						if (sector.headquarter)
							GvGMap.CanvasCTX.drawImage(img, imgPositions.hqX, imgPositions.hqY, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);
						if (sector.isProtected)
							GvGMap.CanvasCTX.drawImage(img, imgPositions.shieldX, imgPositions.shieldY, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);
						if (sector.siege.clan != 0)
							GvGMap.CanvasCTX.drawImage(img, imgPositions.swordX, imgPositions.swordY, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);
						if (marker) {
							GvGMap.CanvasCTX.drawImage(img, imgPositions.redX, imgPositions.redY, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);
						}
					}
					if (GvGMap.Size == 'big') {
						GvGMap.CanvasCTX.drawImage(img, flag.x, flag.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);
					}
					else {
						GvGMap.CanvasCTX.drawImage(img, flag.x, flag.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y-5, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);
					}
				}
			}
		}
	},

	/**
	 * Draws Sector hexagon in its owners color
	 */
	drawHex: (sector) => {
		let color = GvGMap.colorToString(MapSector.getColorByTerrain(sector));
		if (sector.owner.id != 0)
			color = GvGMap.colorToString(sector.owner.color);
		if (GvGMap.Size == 'mini' && sector.owner.id == GvGMap.OwnGuild.Id) 
			color = '#fff';

		GvGMap.CanvasCTX.fillStyle = color;
		GvGMap.CanvasCTX.beginPath();
		GvGMap.CanvasCTX.moveTo(sector.position.x + GvGMap.Map.HexWidth / 2, sector.position.y);
		GvGMap.CanvasCTX.lineTo(sector.position.x + GvGMap.Map.HexWidth, sector.position.y + GvGMap.Map.HexHeight * 0.25);
		GvGMap.CanvasCTX.lineTo(sector.position.x + GvGMap.Map.HexWidth, sector.position.y + GvGMap.Map.HexHeight * 0.75);
		GvGMap.CanvasCTX.lineTo(sector.position.x + GvGMap.Map.HexWidth / 2, sector.position.y + GvGMap.Map.HexHeight);
		GvGMap.CanvasCTX.lineTo(sector.position.x, sector.position.y + GvGMap.Map.HexHeight * 0.75);
		GvGMap.CanvasCTX.lineTo(sector.position.x, sector.position.y + GvGMap.Map.HexHeight * 0.25);
		GvGMap.CanvasCTX.closePath();
		GvGMap.CanvasCTX.fill();
		GvGMap.CanvasCTX.strokeStyle = "rgba(0,0,0,0.2)";
		GvGMap.CanvasCTX.stroke();
	},

	/**
	 * Draws Sector coordinates (and power)
	 */
	drawHexText: (sector) => {
		if (GvGMap.Size != 'mini') {
			GvGMap.CanvasCTX.font = "9px Arial";
			if (GvGMap.Size === 'big')
				GvGMap.CanvasCTX.font = "12px Arial";
			GvGMap.CanvasCTX.textAlign = "center";
			GvGMap.CanvasCTX.fillStyle = ((sector.owner.color.r+sector.owner.color.g+sector.owner.color.b) < 350) ? '#ddd' : '#222';
			GvGMap.CanvasCTX.fillText(MapSector.coords(sector), sector.position.x + GvGMap.Map.HexWidth / 2, sector.position.y + GvGMap.Map.HexHeight * 0.85);
			if (GvGMap.Size === 'big' && sector.terrain !== "water" && sector.terrain !== "rocks")
				GvGMap.CanvasCTX.fillText(sector.power, sector.position.x + GvGMap.Map.HexWidth / 2, sector.position.y + GvGMap.Map.HexHeight * 0.25);
		}
	},

	/**
	 * Returns Sectors coordinates (with ~ if beach)
	 */
	coords(sector) {
		if (sector.terrain === "beach")
			return sector.coordinates.x + ", " + sector.coordinates.y;
		if (sector.terrain === "plain")
			return sector.coordinates.x + ", " + sector.coordinates.y;
		return "";
	},
}