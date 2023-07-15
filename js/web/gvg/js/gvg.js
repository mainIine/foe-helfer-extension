/*
 *
 *  * **************************************************************************************
 *  * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
 *  * You may use, distribute and modify this code under the
 *  * terms of the AGPL license.
 *  *
 *  * See file LICENSE.md or go to
 *  * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 *  * for full license details.
 *  *
 *  * **************************************************************************************
 *
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

FoEproxy.addHandler('ClanBattleService', 'getContinent', (data, postData) => { // map overview
	GvG.initActions();
	GvGMap.OnloadData = null;
	GvGMap.Map = {
		Sectors: [],
		AllProvinces: [],
		Guilds: [],
		Width: 0,
		Height: 0,
		HexWidth: 50,
		HexHeight: 40,
		Era: "",
	};
	GvGMap.Tabs = [];
	GvGMap.TabsContent = [];
	GvG.setRecalc(data.responseData.continent.calculation_time.start_time, true);
	GvGMap.Overview = data['responseData'];
	if ($('#GvGMapWrap').length > 0) {
		GvGMap.showOverview();
	}
});

FoEproxy.addHandler('ClanBattleService', 'getProvinceDetailed', (data, postData) => {	
	GvGMap.initData(data.responseData);
	GvGMap.saveMapData(data.responseData.province_detailed);
	GvGMap.saveGuildData(data.responseData.province_detailed.clans);
	if ($('#GvGMapWrap').length > 0) {
		GvGMap.show();
	}
});

FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
	GvG.HideGvgHud();
});

FoEproxy.addWsHandler('UpdateService', 'finishDailyCalculation', (data, postData) => {	
	if (data['responseData'] === true && GvG.Init === true) {
		GvG.resetData();
	}
});

// add close button to info
// add option to clear entries

FoEproxy.addWsHandler('ClanBattleService', 'changeProvince', (data, postData) => {	
	let entry = GvGLog.addEntry(data.responseData);
	if ($('#gvgmaplog').length > 0 && entry) {
		GvGLog.showEntry(entry);
	}
	if (entry != undefined && GvGMap.Actions.edit === false) {
		MapSector.update(entry.sectorId,entry.sourceClan,entry.type);
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
					.append('<button class="btn-default mapbutton" onclick="GvGMap.show()"></button>') // hier
					.attr('title', i18n('GvG.Independences.Tooltip') + '<br><em>' + i18n('GvG.Independences.Tooltip.Warning') + '</em>')
					.tooltip(
						{
							useFoEHelperSkin: true,
							headLine: i18n('Global.BoxTitle'),
							placement: 'bottom',
							html: true
						}
					);
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

		GvG.Actions.LastAction = time;
		GvG.showGvgHud();
		
		localStorage.setItem('GvGActions', JSON.stringify(GvG.Actions));
	},
 
    /**
	 * Set Recalc time
	 * @param calcTime
	 */
    setRecalc: (calcTime) => {
		GvG.Actions.PrevCalc = (calcTime-86400);

		if (GvG.Actions.NextCalc !== calcTime) 
			GvG.Actions.NextCalc = calcTime;

		if (GvG.Actions.LastAction < GvG.Actions.PrevCalc && GvG.Actions.LastAction !== 0) {
			GvG.resetData(calcTime);
		}

		localStorage.setItem('GvGActions', JSON.stringify(GvG.Actions));
		GvG.showGvgHud();
	},

    /**
	 * Reset all GvG Data in LocalStorage
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
	OnloadDataTime: MainParser.getCurrentDate(),
	Canvas: {},
	CanvasCTX: {},
	GuildData: {},
	ProvinceData: {},
	Overview: {},
	OnloadData: null,
	Map: {
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
        blank: [{r:240,g:240,b:240}],
        b: [
            {r:0,g:185,b:238},
            {r:0,g:159,b:227},
            {r:0,g:72,b:153},
            {r:0,g:85,b:120},
            {r:0,g:55,b:97},
            {r:0,g:10,b:50},
            {r:0,g:105,b:180},
            {r:40,g:85,b:120},
            {r:40,g:55,b:97},
            {r:40,g:15,b:92},
            {r:61,g:61,b:210},
            {r:72,g:140,b:203},
            {r:10,g:45,b:153},
            {r:0,g:30,b:117},
            {r:9,g:33,b:108},
            {r:24,g:5,b:71},
            {r:38,g:8,b:115},
        ],
        r: [
            {r:203,g:78,b:72},
            {r:163,g:77,b:68},
            {r:227,g:80,b:0},
            {r:238,g:0,b:0},
            {r:180,g:0,b:0},
            {r:153,g:0,b:51},
            {r:120,g:20,b:0},
            {r:140,g:40,b:0},
            {r:97,g:0,b:45},
            {r:127,g:0,b:55},
            {r:140,g:17,b:74},
            {r:190,g:17,b:74},
            {r:210,g:61,b:89},
            {r:89,g:0,b:12},
            {r:118,g:0,b:16},
            {r:222,g:49,b:14},
            {r:111,g:22,b:22},
        ],
        g: [
            {r:0,g:180,b:0},
            {r:0,g:100,b:0},
            {r:0,g:60,b:0},
            {r:0,g:40,b:0},
            {r:0,g:140,b:70},
            {r:50,g:120,b:0},
            {r:50,g:80,b:0},
            {r:50,g:180,b:30},
            {r:50,g:160,b:70},
            {r:50,g:200,b:70},
            {r:50,g:200,b:80},
            {r:90,g:160,b:80},
            {r:162,g:185,b:12},
            {r:6,g:76,b:41},
            {r:5,g:91,b:37},
            {r:5,g:29,b:17},
            {r:49,g:68,b:8},
        ],
        premium: [
            [{r:2,g:2,b:2},{r:19,g:0,b:0},{r:65,g:0,b:0},{r:98,g:0,b:25},{r:30,g:30,b:30},{r:100,g:22,b:0}], // skull
            [{r:22,g:62,b:11},{r:17,g:17,b:17},{r:18,g:53,b:40},{r:9,g:55,b:75},{r:74,g:74,b:74},{r:43,g:62,b:49}], // shield colorful green&grey
            [{r:11,g:25,b:62},{r:8,g:7,b:8},{r:17,g:63,b:112},{r:3,g:24,b:92},{r:0,g:30,b:117},{r:24,g:5,b:71}], // shield blue&black
            [{r:9,g:55,b:75},{r:13,g:93,b:57},{r:49,g:25,b:13},{r:11,g:62,b:47}], // lion
            [{r:56,g:11,b:62},{r:88,g:10,b:70},{r:83,g:34,b:133},{r:33,g:2,b:68}], // horses
            [{r:79,g:17,b:0},{r:117,g:44,b:7},{r:47,g:33,b:23},{r:62,g:18,b:11}], // vikings
            [{r:242,g:185,b:0},{r:214,g:150,b:37},{r:187,g:116,b:13},{r:200,g:105,b:11}], // phoenix
            [{r:35,g:60,b:30},{r:36,g:76,b:32},{r:35,g:60,b:30},{r:35,g:60,b:30},{r:5,g:91,b:37},{r:0,g:60,b:0}], // dragon
            [{r:44,g:57,b:64},{r:28,g:35,b:39},{r:30,g:10,b:50},{r:47,g:20,b:41}], // red blue shield
            [{r:50,g:36,b:51},{r:56,g:50,b:63},{r:61,g:25,b:84},{r:80,g:70,b:97}], // green blue shield
            [{r:50,g:19,b:6},{r:95,g:13,b:8},{r:128,g:20,b:13},{r:130,g:38,b:10}], // helmet and swords
            [{r:31,g:62,b:109},{r:0,g:9,b:102},{r:14,g:29,b:67},{r:38,g:34,b:63}], // colorful shied on green
            [{r:37,g:48,b:37},{r:6,g:87,b:0},{r:21,g:58,b:24},{r:30,g:67,b:0}] 
		]
    },
	NoGuild: { id: 0, name: i18n('Boxes.GvGMap.Log.NPC'), color: {r:50,g:50,b:50} },
	CurrentGuild: { id: 0, name: i18n('Boxes.GvGMap.Log.NPC'), color: {r:100,g:100,b:100} },
	ActiveTab: 1,
	ZoomOptions: ['mini','small','big'],
	Marker: false,

	Tabs: [],
	TabsContent: [],

	initData: (response, initial = true) => {
		GvGMap.OnloadData = response;
		GvGMap.OnloadDataTime = MainParser.getCurrentDateTime();
		GvGMap.ProvinceData = GvGMap.OnloadData.province_detailed;
		GvGMap.GuildData = GvGMap.OnloadData.province_detailed.clans;
		GvGMap.PowerValues = GvGMap.OnloadData.province_detailed.power_values;
		GvGMap.Map.Era = GvGMap.OnloadData.province_detailed.era;
		GvGMap.Map.Guilds = [];
		GvGMap.Map.Sectors = [];
		GvGMap.OwnGuild.Id = ExtGuildID;
		GvGMap.OwnGuild.Members = GvGMap.OnloadData.clan_data.clan.members;
	},

	initMap: (size = 'small', initial = true) => {
		let hexWidth = 50;
		let hexHeight = 40;
		if (size === 'mini') {
			hexWidth = 14;
			hexHeight = 12;
		}
		else if (size === 'big') {
			hexWidth = 90;
			hexHeight = 72;
		}

		GvGMap.Canvas = document.getElementById("gvg-map");
		GvGMap.CanvasCTX = GvGMap.Canvas.getContext('2d');
		GvGMap.Map.HexWidth = hexWidth;
		GvGMap.Map.HexHeight = hexHeight;
		GvGMap.Size = size;
		if(size === 'mini') { // overview
			GvGMap.Map.Width = 67*GvGMap.Map.HexWidth+GvGMap.Map.HexWidth/2;
			GvGMap.Map.Height = 85*GvGMap.Map.HexHeight*0.8;
		}
		else {
			GvGMap.Map.Width = (GvGMap.ProvinceData.bounds.x_max - GvGMap.ProvinceData.bounds.x_min)*GvGMap.Map.HexWidth+GvGMap.Map.HexWidth/2;
			GvGMap.Map.Height = (GvGMap.ProvinceData.bounds.y_max - GvGMap.ProvinceData.bounds.y_min)*GvGMap.Map.HexHeight*0.8;
		}
		GvGMap.CurrentGuild = GvGMap.NoGuild;
	},

	saveMapData: (response) => {
		let map = localStorage.getItem('GvGMapEra_'+response.era);
		let mapCount = localStorage.getItem('GvGMapCount');
		if (mapCount === null) mapCount = 0;

		if (map === null) {
			let mapraw = {
				bounds: response.bounds,
				era: response.era,
				power_values: response.power_values,
				sectors: []
			};
			response.sectors.forEach(function (sector) {
				let sectorraw = {
					sector_id: sector.sector_id,
					position: sector.position,
					terrain: sector.terrain,
					power: mapraw.power_values[sector.power] || mapraw.power_values[0],
				};
				mapraw.sectors.push(sectorraw);
			});
			mapCount++;
			localStorage.setItem('GvGMapEra_'+response.era, JSON.stringify(mapraw));
			localStorage.setItem('GvGMapCount', mapCount);
		}
	},

	saveGuildData: (clans) => {		
		let guilds = JSON.parse(localStorage.getItem('GvGMapGuilds'));

		if (guilds === null) guilds = []; 

		clans.forEach(function (clan) {
			let guildfound = guilds.find(x => x.id  === clan.id);
			if (guildfound === undefined) {
				let guild = GvGMap.createGuild(clan);
				guilds.push(guild);
			}
		});
		localStorage.setItem('GvGMapGuilds', JSON.stringify(guilds));
	},

	/**
	 * Show GvG Map
	 */
	show: () => {
		if (GvGMap.OnloadData) {
			GvGMap.showMap();
		}
		else {
			GvGMap.showOverview();
		}
	},

	/**
	 * Show GvG Map
	 */
	showMap: () => {
		if ($('#gvg-map').length === 0) {

			moment.locale(MainParser.Language);

			HTML.Box({
				id: 'GvGMap',
				title: i18n('Boxes.GvGMap.Title'),
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
	 * Show GvG Overview Map
	 */
	showOverview: () => {
		if ($('#gvg-map').length === 0) {
			moment.locale(MainParser.Language);

			HTML.Box({
				id: 'GvGMap',
				title: i18n('Boxes.GvGMap.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true
			});

			GvGMap.buildMapOverview();
		}
		else {
			GvGMap.buildMapOverview();
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
		let editActive = (GvGMap.Actions.edit === true) ? 'btn-active' : '';
		let dragActive = (GvGMap.Actions.drag === true) ? 'btn-active' : '';
		h.push('<div id="toggleOptions" class="'+collapsed+'"></div><div id="GvGMapContent" class="mapFeature">');
		h.push('<div id="GvGMapMeta" class="dark-bg mapFeature">');
		h.push('<div id="GvGMapActions" class="btn-group mapFeature">');
			h.push('<span id="editMap" class="btn-default '+editActive+'">'+i18n('Boxes.GvGMap.Action.Edit')+'</span>');
			h.push('<span id="noGuild" class="btn-default btn-inset editAction"></span>');
			//h.push('<span id="pickGuild" class="btn-default btn-inset editAction"></span>');
			/*h.push('<span id="markerRed" class="btn-default btn-inset editAction"></span>');
			h.push('<span id="markerRedX" class="btn-default btn-inset editAction"></span>');
			h.push('<span id="markerYellow" class="btn-default btn-inset editAction"></span>');
			h.push('<span id="markerYellowX" class="btn-default btn-inset editAction"></span>');
			h.push('<span id="markerBlue" class="btn-default btn-inset editAction"></span>');
			h.push('<span id="markerBlueX" class="btn-default btn-inset editAction"></span>');*/
			h.push('<span id="dragMap" class="btn-default '+dragActive+'">'+i18n('Boxes.GvGMap.Action.Drag')+'</span>');
			h.push('</div>');
			h.push('<div class="btn-group"><span id="zoomMap" class="btn-default">'+i18n('Boxes.GvGMap.Action.Zoom')+'</span></div>');
			h.push('</div>');
		h.push('<div id="GvGMapWrap" class="mapFeature">');
		h.push('<canvas id="gvg-map"></canvas>');
		h.push('</div>');
		h.push('</div>');
		h.push('<div id="GvGMapInfo" class="mapFeature"></div>');
		h.push('<div id="gvgOptions" class="'+collapsed+'"><div id="gvgOptionsContent"></div></div>');

		$('#GvGMapBody').html(h.join(''));
		$('#GvGMapBody').removeClass('GvGMapOverview');
	},

	buildOverviewContent: () => {
		let h = [];
		let collapsed = 'collapsed';
		if (GvGMap.Actions.list) {
			collapsed = '';
		}
		h.push('<div id="toggleOptions" class="'+collapsed+'"></div><div id="GvGMapContent" class="mapFeature">');
		h.push('<div id="GvGMapWrap" class="mapFeature">');
		h.push('<canvas id="gvg-map"></canvas>');
		h.push('</div></div>');
		h.push('<div id="GvGMapInfo" class="mapFeature"></div>');
		h.push('<div id="gvgOptions" class="'+collapsed+'"><div id="gvgOptionsContent"></div></div>');

		$('#GvGMapBody').html(h.join(''));
		$('#GvGMapBody').addClass('GvGMapOverview');
	},

	/**
	 * Build GvG Map
	 */
	buildMap: (mapSize = 'small', initial = true) => {
		let t = [];
		if (GvGMap.OnloadData != null) {
			GvGMap.Tabs = [];
			GvGMap.TabsContent = [];
			GvGMap.SetTabs('gvgmapguilds');
			GvGMap.SetTabs('gvgmaplog');

			GvGMap.buildContent();
			GvGMap.populateCanvas(mapSize, initial);
			GvGMap.drawCanvasInfo();
			GvGMap.showGuilds();
			GvGLog.show();

			GvGMap.events();
			GvGMap.mapDrag();
			
			t.push('<div class="gvg-tabs tabs">');
			t.push( GvGMap.GetTabs() );
			t.push( GvGMap.GetTabContent() );
			t.push('</div>');
			$('#gvgOptionsContent').html(t.join(''));

			$('#GvGMap').find('#gvgmaplog').promise().done(function() {
				$('.gvg-tabs').tabslet({active: GvGMap.ActiveTab });
				$('.gvg-tabs .gvgmapguilds span').text(i18n('Boxes.GvGMap.Guilds'));
				$('.gvg-tabs .gvgmaplog span').text(i18n('Boxes.GvGMap.Log'));

				$('#GvGGuilds tr').click(function (e) {
					let id = $(this).attr('id').replace('id-', '')/1;
					$('#GvGGuilds tr').removeClass('active');
					$(this).addClass('active');
					
					GvGMap.CurrentGuild = GvGMap.Map.Guilds.find(x => x.id  === id);
				});

				$('.gvgmapguilds').click(function() {
					GvGMap.ActiveTab = 1;
				});
				$('.gvgmaplog').click(function() {
					GvGMap.ActiveTab = 2;
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
			setTimeout(function(){ }, 500);
		}
	},

	buildMapOverview: () => {
		let t = [];
		GvGMap.buildOverviewContent();
		GvGMap.populateOverviewCanvas('mini',true);
		GvGMap.drawCanvasInfo();
		GvGMap.showOverviewGuilds();
		GvGMap.mapDrag();
			
		t.push( GvGMap.GetTabContent() );
		$('#gvgOptionsContent').html(t.join(''));

		$('#GvGGuilds .collapsable td').on('click',function(){
			$(this).parent('tr').toggleClass('open');
			$(this).parent('tr').next('tr').toggle();
		});
	},

	events: () => {
		let editBtn = document.getElementById("editMap");
		let pickGuildBtn = document.getElementById("pickGuild");
		/*let markRedBtn = document.getElementById("markerRed");
		let markRedCrossBtn = document.getElementById("markerRedX");
		let markYellowBtn = document.getElementById("markerYellow");
		let markYellowCrossBtn = document.getElementById("markerYellowX");
		let markBlueBtn = document.getElementById("markerBlue");
		let markBlueCrossBtn = document.getElementById("markerBlueX");*/
		let noGuildBtn = document.getElementById("noGuild");
		let dragBtn = document.getElementById("dragMap");
		let zoomBtn = document.getElementById("zoomMap");
		let toggleListBtn = document.getElementById("toggleOptions");

		toggleListBtn.addEventListener('click', function (e) {
			$('#gvgOptions').toggleClass('collapsed');
			$(this).toggleClass('collapsed');
			GvGMap.Actions.list = (GvGMap.Actions.list === true) ? false : true;
		}, false);

		editBtn.addEventListener('click', function (e) {
			GvGMap.Actions.edit = true;
			GvGMap.Actions.drag = false;
			dragBtn.classList.remove('btn-active');
			editBtn.classList.add('btn-active');
			$('.editAction').show();
			$('#sectorInfo').remove();
		}, false);
		dragBtn.addEventListener('click', function (e) {
			GvGMap.Actions.edit = false;
			GvGMap.Actions.drag = true;
			GvGMap.Marker = false;
			editBtn.classList.remove('btn-active');
			dragBtn.classList.add('btn-active');
			$('.editAction').hide();
		}, false);
		zoomBtn.addEventListener('click', function (e) {
			GvGMap.Marker = false;
			if (GvGMap.Size === 'small')
				GvGMap.buildMap('big', false);
			//else if (GvGMap.Size === 'big')
			//	GvGMap.buildMap('mini', false);
			else
				GvGMap.buildMap('small', false);
		}, false);
		/*
		markRedBtn.addEventListener('click', function (e) {
			GvGMap.Marker = 'red';
		}, false);
		markRedCrossBtn.addEventListener('click', function (e) {
			GvGMap.Marker = 'redCross';
		}, false);
		markYellowBtn.addEventListener('click', function (e) {
			GvGMap.Marker = 'yellow';
		}, false);
		markYellowCrossBtn.addEventListener('click', function (e) {
			GvGMap.Marker = 'yellowCross';
		}, false);
		markBlueBtn.addEventListener('click', function (e) {
			GvGMap.Marker = 'blue';
		}, false);
		markBlueCrossBtn.addEventListener('click', function (e) {
			GvGMap.Marker = 'blueCross';
		}, false);
		*/
		noGuildBtn.addEventListener('click', function (e) {
			GvGMap.CurrentGuild = GvGMap.NoGuild;
		}, false);
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
			sectors: 0,
			costs: 0
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

		if(mapSize !== 'mini') { // if not overview
			if (GvGMap.Map.Guilds.length <= 3) { // this is to prevent a bug and a stupid solution
				GvGMap.GuildData.forEach(function (guild) {
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
	
			if (GvGMap.Map.Sectors.length === 0) {
				GvGMap.ProvinceData.sectors.forEach(function (sector) {
					if (sector.hitpoints != undefined) { 
						let newSector = {};
						let realX = (sector.position.x - GvGMap.ProvinceData.bounds.x_min) * GvGMap.Map.HexWidth;
						if (sector.position.y === undefined) sector.position.y = 0;
						let realY = (sector.position.y - GvGMap.ProvinceData.bounds.y_min) * GvGMap.Map.HexHeight;
	
						if (sector.position.y % 2 === 0) 
							newSector = MapSector.create(realX, realY * 0.75, sector);
						else 
							newSector = MapSector.create(realX + (GvGMap.Map.HexWidth * 0.5), realY * 0.75, sector);
						
						GvGMap.Map.Sectors.push(newSector);
						
						let guild = MapSector.getOwnerById(newSector.owner.id);
						if (guild != null) {
							guild.power += newSector.power;
							guild.sectors++;
							guild.costs = GvGMap.calcCosts(guild);
						}
						MapSector.draw(newSector);
					}
				});
			}
			else { // on zoom or clicking when already opened
				GvGMap.Map.Sectors.forEach(function (sector) {
					let realX = (sector.coordinates.x - GvGMap.ProvinceData.bounds.x_min) * GvGMap.Map.HexWidth;
					let realY = (sector.coordinates.y - GvGMap.ProvinceData.bounds.y_min) * GvGMap.Map.HexHeight;
					sector.position.x = realX;
					sector.position.y = realY * 0.75;
	
					if (sector.coordinates.y % 2 === 0) 
						sector.position.y = realY * 0.75;
					else 
						sector.position.x = realX + (GvGMap.Map.HexWidth * 0.5);
					MapSector.draw(sector);
				});
			}
		}
	},

	/**
	 * @param {*} mapSize - string, sizes are small, mini, big
	 */
	populateOverviewCanvas: (mapSize, initial) => {
		GvGMap.initMap(mapSize,initial);

		$(GvGMap.Canvas).attr({
			'id': 'gvg-map',
			'width': GvGMap.Map.Width,
			'height': GvGMap.Map.Height
		});
		
		GvGMap.CanvasCTX.clearRect(0, 0, GvGMap.Map.Width, GvGMap.Map.Height);

		let guilds = JSON.parse(localStorage.getItem('GvGMapGuilds'));

		// gather guilds
		GvGMap.Overview.continent.provinces.forEach(function (province) {
			province.top_clans.forEach(function (guild) {
				if (guilds === null) guilds = [];
				GvGMap.Map.Guilds = guilds;

				let guildfound = GvGMap.Map.Guilds.find(x => x.id  === guild.id);
				if (guildfound === undefined) {
					let newGuild = GvGMap.createGuild(guild);
					GvGMap.Map.Guilds.push(newGuild);
					localStorage.setItem('GvGMapGuilds', JSON.stringify(GvGMap.Map.Guilds));
				}
				else {
					let currentGuild = GvGMap.Map.Guilds.find(x => x.id  === GvGMap.Map.Guilds.id);
					if (currentGuild !== undefined)
						if (currentGuild.id+'' === currentGuild.name) { // name is id, guild is not known
							let updatedGuild = GvGMap.getGuildById(guild.id);
							updatedGuild.name = guild.name;
							updatedGuild.flag = guild.flag;
							updatedGuild.color = GvGMap.getGuildColor(guild);
						}
				}
			});
		});
		// paint sectors
		GvGMap.Map.AllProvinces = [];
		GvGMap.Overview.continent.provinces.forEach(function (province) {
			GvGMap.Map.AllProvinces.push({
				era: province.era,
				guilds: []
			});

			let mapDataFromStorage = JSON.parse(localStorage.getItem('GvGMapEra_'+province.era)); // look if province is stored
			let xCurrentProvince = GvGMap.Map.AllProvinces.find(x => x.era == province.era);

			// general summary list
			province.sectors.forEach(function (sector) {
				let newSector = GvGMap.buildOverviewSector(sector); // has no color yet

				if (sector.owner_id > 0) {
					let guild = {
						id: sector.owner_id,
						name: sector.owner_id+'',
						color: {r:0,g:0,b:0},
					};
					let guildOnMap = GvGMap.createGuild(guild);

					if (GvGMap.getGuildById(sector.owner_id) === undefined)  // if guild is unknown
						GvGMap.Map.Guilds.push(guildOnMap);
					else {
						let guild = GvGMap.getGuildById(sector.owner_id);
						guild.sectors++;
					}

					if (mapDataFromStorage != null) { // if sector power and terrain are known
						let storedSector = mapDataFromStorage.sectors.find(x => x.sector_id = sector.sector_id);
						let guild = GvGMap.getGuildById(sector.owner_id);
						guild.power += storedSector.power; 
					}
				}
				else { // if NPC sector
					if (mapDataFromStorage != null) 
						newSector.color = MapSector.getColorByTerrain(sector);
				}
				MapSector.draw(newSector);
			});

			// guild province summary
			if (mapDataFromStorage != null) {
				province.sectors.forEach(function (sector) {
					if (sector.owner_id > 0) {
						let storedSector = mapDataFromStorage.sectors.find(x => x.sector_id == sector.sector_id);
						if (storedSector != undefined) {
							let guild = GvGMap.getGuildById(sector.owner_id);
							let guildInProvince = xCurrentProvince.guilds.find(x => x.id == guild.id);
							let xProvinceGuild = {};
							if (guildInProvince == undefined) {
								xProvinceGuild = {
									id: guild.id,
									name: guild.name,
									sectors: 1,
									power: storedSector.power,
								};
								xCurrentProvince.guilds.push(xProvinceGuild);
							}
							else {
								xProvinceGuild = guildInProvince;
								xProvinceGuild.sectors++;
								xProvinceGuild.power+= storedSector.power;
							}
						}
					}
				});
				xCurrentProvince.guilds.sort(function(a, b) { // sort guilds by power
					if (a.power > b.power)
						return -1;
					if (a.power < b.power)
						return 1;
					return 0;
				});
			}
		});
	},

	// to do gildennamen aktualisieren

	buildOverviewSector: (sector) => {
		let newSector = {};
		let realX = sector.position.x * GvGMap.Map.HexWidth;
		if (sector.position.y === undefined) sector.position.y = 0;
		let realY = sector.position.y * GvGMap.Map.HexHeight;

		if (sector.position.y % 2 === 0) 
			newSector = MapSector.create(realX, realY * 0.75, sector);
		else 
			newSector = MapSector.create(realX + (GvGMap.Map.HexWidth * 0.5), realY * 0.75, sector);

		return newSector;
	},

	drawCanvasInfo: () => {
		let era = (Technologies.Eras[GvGMap.Map.Era] != 0) ? i18n('Eras.'+Technologies.Eras[GvGMap.Map.Era]) : i18n('Eras.GvGAllAge');
		if (era === "Eras.undefined") era = 'Map Overview';
		GvGMap.CanvasCTX.font = "bold 22px Arial";
		GvGMap.CanvasCTX.textAlign = "left";
		GvGMap.CanvasCTX.fillStyle = '#ffb539';
		GvGMap.CanvasCTX.fillText(era, 10, 25);
		GvGMap.CanvasCTX.font = "12px Arial";
		GvGMap.CanvasCTX.fillStyle = '#ccc';
		GvGMap.CanvasCTX.fillText(moment(GvGMap.OnloadDataTime).format('D.M.YYYY'), 10, 45);
	},

	getGuildById: (id) => {
		return GvGMap.Map.Guilds.find(x => x.id  === id);
	},

	getSectorById: (id) => {
		return GvGMap.Map.Sectors.find(x => x.id  === id);
	},

	mapDrag: () => {
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
							if (GvGMap.Marker != false) {
								MapSector.draw(sector, false);
							}
							else {
								let prevOwner = sector.owner;
								if (sector.owner.id === GvGMap.NoGuild.ID)
									prevOwner = GvGMap.NoGuild;
	
								sector.owner = GvGMap.CurrentGuild;
								if (sector.owner.id <= 0) {
									sector.owner.color = MapSector.getColorByTerrain(sector);
								}
								MapSector.draw(sector, true);
								GvGMap.recalcGuildProvinces(prevOwner, sector.owner, sector);
							}
						}
					}
                    return sector;
                }
            }
        });
		return undefined;
    },

	recalcGuildProvinces: (oldGuild, newGuild, sector) => {
		oldGuild = GvGMap.Map.Guilds.find(x => x.id  === oldGuild.id);
		if (oldGuild !== undefined) {
			oldGuild.sectors--;
			oldGuild.power -= sector.power;
			GvGMap.calcCosts(oldGuild);
			GvGMap.updateGuildData(oldGuild);
		}

		newGuild = GvGMap.Map.Guilds.find(x => x.id  === newGuild.id);
		if (newGuild !== undefined) {
			newGuild.sectors++;
			newGuild.power += sector.power;
			GvGMap.calcCosts(newGuild);
			GvGMap.updateGuildData(newGuild);
		}

	},

	calcCosts: (guild) => {
		guild = GvGMap.Map.Guilds.find(x => x.id  === guild.id);
		if (guild != undefined) {
			guild.costs = Math.round((3 * Math.pow(guild.sectors, 1.5) + 0.045 * Math.pow(guild.sectors, 3.1)) / 5 + 1) * 5;
			if (Technologies.Eras[GvGMap.Map.Era] == 0)
				guild.costs *= 5;
			return guild.costs;
		}
		return 0;
	},

	encodeGuildName: (guildname) => {
		return guildname.replace('<', '&lt;');
	},

	showPowerBonus: (guild) => {
		GvGMap.sortGuilds();
		if (GvGMap.Map.Guilds[0] == guild) 
			return '<b class="rank-first" title="#1">'+Math.round(guild.power*1.15)+'</b>';

		else if (GvGMap.Map.Guilds[1] == guild) 
			return '<b class="rank-second" title="#2">'+Math.round(guild.power*1.1)+'</b>';

		else if (GvGMap.Map.Guilds[2] == guild) 
			return '<b class="rank-third"  title="#3">'+Math.round(guild.power*1.05)+'</b>';

		return guild.power;
	},

	addPowerBonus: () => { // for overview
		GvGMap.Map.AllProvinces.forEach(function (province) {
			if (province.guilds != []) {
				if (province.guilds[0]) 
					province.guilds[0].power = Math.round(province.guilds[0].power*1.15);
				if (province.guilds[1]) 
					province.guilds[1].power = Math.round(province.guilds[1].power*1.1);
				if (province.guilds[2]) 
					province.guilds[2].power = Math.round(province.guilds[2].power*1.05);
			}
		});
	},

	updateGuildData: (guild) => {
		let tableRow = document.getElementById("id-"+guild.id);
		if (tableRow != null) {
			let html = '<td><span class="guildflag '+guild.flag+'" style="background-color: '+GvGMap.colorToString(guild.color)+'"></span>' + GvGMap.encodeGuildName(guild.name) +'</td>';
			html += '<td class="text-center">'+guild.sectors+'</td>';
			html += '<td class="text-center">'+GvGMap.showPowerBonus(guild)+'</td>';
			html += '<td class="text-center">'+guild.costs+'</td>';
			tableRow.innerHTML = html;
		}
	},

	showSector: (sector) => {
		let html = '';
		if (sector.owner.id != 0) {
			let TerrainKey = 'Terrain_' + sector.terrain;

			html += '<div id="sectorInfo">';
			html += '<span class="guildflag ' + sector.owner.flag + '" style="background-color: '+GvGMap.colorToString(sector.owner.color) + ';border-color: '+GvGMap.colorToString(sector.owner.color) + '"></span>';
			html += '<b class="text-bright">' + GvGMap.encodeGuildName(sector.owner.name) + '</b><br>';
			if (MapSector.underSiege(sector))
				html += 'Under Siege by: ' + MapSector.underSiege(sector) + '<br>';
			html += i18n('Boxes.GvGMap.Sector.Hitpoints') + ': ' + sector.hitpoints + '/80<br>';
			html += i18n('Boxes.GvGMap.Sector.Coords') + ': ' + MapSector.coords(sector) + '<br>';
			html += i18n('Boxes.GvGMap.Sector.Power') + ': ' + sector.power + '<br>';
			if (sector.isProtected)
				html += i18n('Boxes.GvGMap.Sector.Protected') + '<br>';
			html += i18n('Boxes.GvGMap.Sector.Terrain')+ ': ' +  i18n('Boxes.GvGMap.Sector.' + TerrainKey) +'<br>';
			html += '</div>';
		}

		document.getElementById("GvGMapInfo").innerHTML = html;
    },

	sortGuilds: () => {
        GvGMap.Map.Guilds.sort(function(a, b) {
            if (a.power > b.power)
                return -1;
            if (a.power < b.power)
                return 1;
            return 0;
        });
	},

	sortGuildsBySectorAmount: () => {
        GvGMap.Map.Guilds.sort(function(a, b) {
            if (a.sectors > b.sectors)
                return -1;
            if (a.sectors < b.sectors)
                return 1;
            return 0;
        });
	},

	showGuilds: () => {
        let t = [];

		GvGMap.sortGuilds();

		t.push('<table id="GvGGuilds" class="foe-table">');
		t.push('<thead><tr>');
		t.push('<th>'+i18n('General.Guild')+'</th>');
		t.push('<th>'+i18n('Boxes.GvGMap.Guild.Sectors')+'</th>');
		t.push('<th>'+i18n('Boxes.GvGMap.Guild.Power')+'</th>');
		t.push('<th>'+i18n('Boxes.GvGMap.Guild.Costs')+'</th>');
		t.push('</tr></thead>');
		GvGMap.Map.Guilds.forEach(function (guild) {
			t.push('<tr id="id-'+guild.id+'">');
			t.push('<td><span class="guildflag '+guild.flag+'" style="background-color: '+GvGMap.colorToString(guild.color)+'"></span>' + GvGMap.encodeGuildName(guild.name) + '</td>');
			t.push('<td class="text-center">'+guild.sectors+'</td>');
			t.push('<td class="text-center">'+GvGMap.showPowerBonus(guild)+'</td>');
			t.push('<td class="text-center">'+guild.costs+'</td>');
			t.push('</tr>');
		});
		t.push('</table>');
		
		GvGMap.SetTabContent('gvgmapguilds', t.join(''));
	},

	showOverviewGuilds: () => {
        let t = [];
		let mapCounter = localStorage.getItem('GvGMapCount') || 0;

		if (mapCounter >= 13) // all map data available
			GvGMap.sortGuilds();
		else
			GvGMap.sortGuildsBySectorAmount();
		
		GvGMap.addPowerBonus(); // add province power bonus

		t.push('<table id="GvGGuilds" class="foe-table">');
		t.push('<thead><tr>');
		t.push('<th>'+i18n('General.Guild')+'</th>');
		t.push('<th>'+i18n('Boxes.GvGMap.Guild.Sectors')+'</th>');
		if (mapCounter == 13) // all map data avalable
			t.push('<th colspan="2">'+i18n('Boxes.GvGMap.Guild.Power')+'</th>');
		t.push('</tr></thead>');
		if (mapCounter < 13) {
			t.push('<tr>');
			t.push('<td colspan="2">'+i18n('Boxes.GvGMap.OverviewExplainer')+'</td>');
			t.push('</tr>');
		}
		GvGMap.Map.Guilds.forEach(function (guild) {
			if (guild.sectors > 0) {
				let guildPower = 0;
				GvGMap.Map.AllProvinces.forEach(function(province) { // calculate true guildpower with bonus
					let guildInProvince = province.guilds.find(x => x.id == guild.id);
					if (guildInProvince) 
						guildPower += guildInProvince.power;
				});

				t.push('<tr id="id-'+guild.id+'" class="collapsable">');
				t.push('<td><span class="guildflag '+guild.flag+'" style="background-color: '+GvGMap.colorToString(guild.color)+'"></span>' + GvGMap.encodeGuildName(guild.name) + '</td>');
				t.push('<td class="text-center">'+guild.sectors+'</td>');

				if (mapCounter == 13) {// all map data avalable
					t.push('<td class="text-center">'+guildPower+'</td><td></td>');
					t.push('<tr style="display:none;" class="no-hover clickToCopy"><td colspan="4" style="padding:0"><table class="foe-table"><tr><th>'+i18n('Boxes.GuildMemberStat.Eras')+'</th><th class="text-center">'+i18n('Boxes.GexStat.Rank')+'</th><th class="text-center">'+i18n('Boxes.GvGMap.Guild.Sectors')+'</th><th class="text-center">'+i18n('Boxes.GvGMap.Guild.Power')+'</th></tr>');

					GvGMap.Map.AllProvinces.forEach(function(province, i){
						let guildInProvince = province.guilds.find(x => x.id == guild.id);
						if (guildInProvince) {
							let era = (i <= 11) ? i18n('Eras.'+((i+3))) : i18n('Eras.GvGAllAge');
							t.push('<tr>');
							t.push('<td>'+era+'</td>')
							t.push('<td class="text-center">'+((province.guilds.indexOf(guildInProvince))+1)+'</td>')
							t.push('<td class="text-center">'+guildInProvince.sectors+'</td>')
							t.push('<td class="text-center">'+guildInProvince.power+'</td>')
							t.push('</tr>');
						}
					});

					t.push('</table></td></tr>');
				}

				t.push('</tr>');
			}
		});
		t.push('</table>');
		
		GvGMap.SetTabContent('gvgmapguilds', t.join(''));
	},

	getGuildColor: (guild) => {
		let color = {r:255,g:255,b:255};
		if (guild.flag) {
			let flag = guild.flag.split("_") || null;

			if (flag != null)  {
				if (flag[0].search("premium") >= 0) {
					let colorAmount = GvGMap.Colors.premium[flag[flag.length-1]-1].length;
					color = GvGMap.Colors.premium[flag[flag.length-1]-1][Math.round(guild.id/colorAmount)%colorAmount];
				}
				else if (flag[flag.length - 1].toLowerCase() === 'r') {
					let colorAmount = GvGMap.Colors.r.length;
					color = GvGMap.Colors.r[Math.round(guild.id/colorAmount)%colorAmount];
				}
				else if (flag[flag.length - 1].toLowerCase() === 'g') {
					let colorAmount = GvGMap.Colors.g.length;
					color = GvGMap.Colors.g[Math.round(guild.id/colorAmount)%colorAmount];
				}
				else
					if (flag.length != 1) {
						let colorAmount = GvGMap.Colors.b.length;
						color = GvGMap.Colors.b[Math.round(guild.id/colorAmount)%colorAmount];
					}

			}
		}
        return color;
    },

	getFlagImageCoordinates: (flag = 'flag_2') => {
		// sizes of each image slice
		let cutoutWidth = (GvGMap.Map.HexWidth >= 90) ? 90 : 50;
		let cutoutHeight = (GvGMap.Map.HexWidth >= 90) ? 72 : 40;

        let id = flag.split("_");

        if (id[id.length - 1].toLowerCase() === 'r' || id[id.length - 1].toLowerCase() === 'g')
            id = parseInt(id[id.length - 2]);
        else
            id = parseInt(id[id.length - 1]);

        if (flag.search("premium") >= 0)
            id += 40;

		let coords = {"x": (id % 10 ) * (cutoutWidth), "y": Math.floor(id / 10) * (cutoutHeight)};
        return coords;
    },

	colorToString: (color) => {
		return "rgb("+color.r+","+color.g+","+color.b+")";
	},

	createColorFromId: (id) => {
		let guild = GvGMap.getGuildById(id);
		let defaultColors = {
			r: 255,
			g: 255,
			b: 255
		};
		let color =  {
			r: id%255,
			g: id%199,
			b: id%149,
		};
		if (guild) {
			if (guild.flag)
				color = guild.color;
		}
		if (id <= 0) {
			color =  {
				r: 50,
				g: 50,
				b: 50,
			}
		}
		return color;
	},

	showGuildFlagAndName: (id) => {
		let guild = GvGMap.getGuildById(id);
		if (id < 0) {
			return i18n('Boxes.GvGMap.Log.NPC');
		}
		else if (guild != undefined) {
			return '<span class="guildflag '+guild.flag+'" style="background-color: '+GvGMap.colorToString(guild.color)+'"></span> '+ GvGMap.encodeGuildName(guild.name);
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
	FilteredSectors: [],
	FilteredActions: [],

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
			if (response.__class__ === "ClanBattleSectorChange") { // sector_independence_granted, sector_conquered
				if (type != 'sector_independence_granted')
					entry.targetClan = response.target_clan_id;
				entry.details = {
					playerId: (response.source_clan_id === GvGMap.OwnGuild.Id) ? response.player_id : 0
				}
				if (entry.type === "sector_slot_unlocked" && entry.sourceClan != GvGMap.OwnGuild.Id) {
					entry.details = {};
				}
			}
			else if (response.__class__ === "ClanBattleBuildingChange") { // headquarter_placed
				entry.targetClan = response.target_clan_id;
				entry.details = {
					nextRelocate: response.building.next_relocate
				}
			}
			else if (response.__class__ === "ClanBattleClanChange" && type === "clan_entered") {
				let guildOnMap = { // add Guild to pool
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
			else if (response.__class__ === "ClanBattleArmyChange") {
				entry.targetClan = response.target_clan_id;
				entry.details = {
					hitpoints: response.hitpoints,
					playerId: (response.source_clan_id === GvGMap.OwnGuild.Id) ? response.player_id : 0,
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
					tr.style.display = 'none';
				}
				$('#GvGlog').prepend(tr);
			}
		});
	},

	buildEntry: (entry) => {
		let t = [];
		let sector = MapSector.getById(entry.sectorId);

		let hostileAction = (entry.targetClan === GvGMap.OwnGuild.Id && (entry.type === 'defender_damaged' || entry.type === 'defender_defeated')) ? 'alert' : 'noAlert';

		let friendlyAction = (entry.targetClan === GvGMap.OwnGuild.Id && (entry.type === 'defender_deployed' || entry.type === 'defender_replaced')) ? 'friendly' : 'actionUnknown';

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

		let maxLength = (GvGLog.Entries.length > 1200) ? 1200 : GvGLog.Entries.length;
		for (let i = 0; i < maxLength; i++)  {
			if (GvGLog.Entries[i] != null) {
				let tr = GvGLog.buildEntry(GvGLog.Entries[i]);
				if (tr != null)
					t.push(tr.outerHTML);
			}
		}
		t.push('<tr><td colspan="2">'+i18n('Boxes.GvGMap.Log.Explanation')+'</td></tr>');
		t.push('</table>');

		GvGMap.SetTabContent('gvgmaplog', t.join(''));
	},
}

let MapSector = {
	create: (x, y, info) => {
		let owner = MapSector.getOwnerById(info.owner_id);
		if (GvGMap.Size !== 'mini') {
			if (owner.id <= 0) {
				owner.color = MapSector.getColorByTerrain(info);
			}
		}
		else {
			if (owner.id > 0) {
				owner = {
					id: info.owner_id,
					color: GvGMap.createColorFromId(info.owner_id),
					name: info.owner_id
				}
			}
			else {
				owner = {
					id: info.owner_id,
					color: {r:50,g:50,b:50},
					name: info.owner_id
				}
			}
		}
		
		return {
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
			}
		}
	},

	getOwnerById: (id) => {
		let guild = GvGMap.Map.Guilds.find(x => x.id  === id);
		return guild ? guild : GvGMap.NoGuild;
	},

	getById: (id) => {
		let sector = GvGMap.Map.Sectors.find(x => x.id  === id);
		return sector ? sector : null;
	},

	underSiege: (sector) => {
		if (sector.siege.clan !== 0)
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
				if (type === "sector_independence_granted")
					sector.owner = GvGMap.NoGuild;
				else 
					sector.owner = guild;
					
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
		if (sector.terrain === "beach") {
			color = {r:233,g:233,b:114-(parseInt(powerMultiplicator)+1)*10};
		}
		else if (sector.terrain === "plain") {
			color = {
				r:126-(parseInt(powerMultiplicator)+1)*10,
				g:222-(parseInt(powerMultiplicator)+1)*10,
				b:110-(parseInt(powerMultiplicator)+1)*10
			};
		}
		else {
			color = {r:50,g:50,b:50};
			if (sector.terrain === "rocks")
				color = {r:50,g:50,b:50};
			if (sector.terrain === "water")
				color = {r:4,g:28,b:45};
		}
		return color;
	},

	/**
	 * Draws a sector on the map + flag and HQ/status if it has an owner
	 * @param sector object with sector information
	 * @param redraw boolean, used for editing the map
	 * @param marker boolean or string, used when editing the map
	 * @param color string with a valid color code (ideally with transparancy), can be used to "mark" a sector
	 */
	draw: (sector, redraw = false, color = false) => {
		MapSector.drawHex(sector);
		if (color) // for selections
			MapSector.drawHex(sector,color);
		if (GvGMap.Marker) {
			MapSector.drawFlagsAndStatus(sector);	
		}
		if (sector.owner.id > 0 && GvGMap.Size != 'mini') 
			MapSector.drawFlagsAndStatus(sector,redraw);			
		MapSector.drawHexText(sector);
	},

	/**
	 * Draws Sector hexagon in its owners color
	 */
	drawHex: (sector, color = false) => {
		if (sector.owner.id <= 0) // NPC
			color = GvGMap.colorToString(MapSector.getColorByTerrain(sector));
		else if (sector.owner.id > 0 && !color) {
			if (sector.owner.color !== undefined) 
				color = GvGMap.colorToString(sector.owner.color);
		}
		if (GvGMap.Size === 'mini') { // map overview
			if (sector.owner.id === ExtGuildID) {
				color = '#fff';
			}
		}

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
		if (GvGMap.Size === 'mini')
			GvGMap.CanvasCTX.strokeStyle = "rgba(200,200,200,0.5)";
		GvGMap.CanvasCTX.stroke();
	},

	/**
	 * Draws Sector images, does not work for mini map
	 */
	drawFlagsAndStatus: (sector, redraw = false, marker = false) => {
		// settings for small image
		let imgSizeFactor = 0.5; 
		let imgFactor = 1.1;
		let imgSizeX = 45;
		let imgSizeY = 36;
		let imgOffsetY = -4;
		let flag = sector.owner.flagCoordinates;
		let img = new Image();
		img.src = "data:image/png;base64,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";

		if (GvGMap.Size === 'big') {
			imgSizeX = 90;
			imgSizeY = 72;
			imgSizeFactor = 0.9;
			imgFactor = 1;
			imgOffsetY = 0;
			img.src = "data:image/png;base64,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RERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERElIm8p7aBahujtpZqy/8Sx8pvPMYY4zHfe+nqsg7285vBfiYiIiIiek7OIwdg+a/f4JC4DLF3PY5WKAcP9f4y6ThWGccS8N+zDgflsX4/ievjhmK+fI9XXHNm5AyXjssRtOIQwrcI+E49ioIl0t3PyFvYHz2nHDQca9Sq62jQhf2cwnkk1M8z1M8z1M8z1M8zXuLzDPXzDPXzrB7rd6ifZ/DzTERERERZh/OUYKxTw9tRtcWqLURtSZcO45wMdnixL9GGMChfK49hPJY85in5HsjeX6Kd4dpjnRrejqotVm0haktCYMI5Q7B7wX42vEa+Vh4j5VjymKcM75HN+3kK1M+zGgLVFqu2ELUlXYL6eUY6Ps/qa+Rr5TGMx5LHPCXfA9m7n4mIiIgoC0gdBqONAS4knaEwrTBoavLYR7NxKEwdBqONAS4knaEwrTBoatGG98i+oTB1GIw2BriQdIbCtMKgqcljH2UoJCIiIqLM7Glh8EVD4dPCYHYPhU8Lgy8aCp8WBrN7KHxaGHzRUPi0MMhQSERERESZXoXQoVggp3I+JQw+byh8njD4SCiU1ysieyzMUQENvBYYpnI+OQw+byh8njD4aCiU1ytmk34Ohfp5hvp5fnIYfN5Q+Dxh8JFQKK9XRPboZyIiIiLKIvyvn8T1VNcMPqs9KRS+SBg0tVi5eA1SVmvM6vwNi738e83gs9qTQuGLhEFTizUsXpNN+vk61M/zv9cMPqs9KRS+SBg0tVi5eA2yRz8TERERURYxRq4A+pwB7kmhMD1h0NQEUpbwz+rGGFYAfb4A96RQmJ4waGrZpp/lCqDPGeCeFArTEwZNLbv0MxERERFlEa32bTBcO/iiQe5hKHyJMJgkt6SQNWjdCW9AK/SaejQdQe7fUJj+MJgE3ynZpp/3pVw7+KJB7mEofIkwmCS3pED26GciIiIiyiLyVygLTzXQnU9vKExvGJTvqYbJQXi5jcIzi/woUMITgUvOpzsUpjcMyvfMWzjb9HMFqJ9nqJ/ndIbC9IZB+Z5qmMwu/UxEREREWYic8jkonaEwPS11GEzPBuGZVRlDMEtfKExPSx0Gs1U/y2CWzlCYnpY6DGanfiYiIiKiLORNhcLsGgZN3lQozK5h0ORNhUKGQSIiIiLKMl53KMzuYdDkdYfC7B4GTV53KGQYJCIiIqIs53WFQobBR72uUMgw+KjXFQoZBomIiIgoy3rVoZBhMG2vOhQyDKbtVYdChkEiIiIiyvJeVShkGHy6VxUKGQaf7lWFQoZBIiIiIso2UofCdAVChsHnkjoUpi8QMgw+j9ShMF2BkGGQiIiIiLKTMqk2nU9vIDRsXg9+gX6aMqk2nU9nIDRuXs9+fpoyqTadT28gNGxeD/YzEREREWVxqcPgy04ZZSh8stRh8CWnjDIUPkXqMPiyU0YZComIiIgoS3tVYZCh8OleVRhkKHy6VxUGGQqJiIiIKMt71WGQoTBtrzoMMhSm7VWHQYZCIiIiIsqyXlcYZCh81OsKgwyFj3pdYZChkIiIiIiynNcdBhkKU7zuMMhQmOJ1h0GGQiIiIiLKMt5UGMzuofBNhcHsHgrfVBhkKCQiIiKiTC9/hbLwTGcYNGw6n87N61OHwvxad8IbkB8FSnimMwymbDqfvs3rU4fCbNHPFaB+ntMXBg2bzqdz8/rUoTA79DMRERERZRGt9m3A0fSGQbnpfKrN61/4GHvW4aCsQetOeANaodfUo+kOg3LT+X83r3/xY/hOyTb9vA/q5zmdYVBuOp9q8/oXPsYeZJvPMxERERFlEWPUYCbSGwaRMkWuzEuEQiFr0LgP3oQxajAT6Q6Dxn5+iVCYbfpZPVGR3jAI0+c5/aEwu/QzEREREWUR/tdP4roazGLTGQZN0hMKY68dxyGkTLPL6vwxatV1NZjFpjMMmqQnFMYiaEW26efrUD/PUD/P6QuDJukJhbHXkG0+z0RERESURVQIHYoFajg7pbbodIZBkxcJhfK9jo4cgOWyhjd8zlqogAZeC9Rwdkpt0ekMgyYvEgrlex2FS8ds08+hUD/PUD/PUD9j6QuDJi8SCuV7HR2JbPN5JiIiIqIsxHlKMNbJgPaUUPisMGjyPKHQEAble8r3fkPnmBE4w7XHOkNAe3IofFYYNHmeUJgSBuV7ZrN+ngL185xyLeGTQuGzwqDJ84RCQxiU74ns1c9ERERElIU8LRQ+bxg0eVoozK5h0ORpofB5w6DJ00Jhdg2DJk8Lhc8bBk2eFgoZBomIiIgoy0gdCmPTGQZN0gqF8pinsnEYNEkdCmPTGQZN0gqFsYapqdk3DJqkDoWx6QyDJmmFQnnMUwyDRERERJSVOMvr+uRiL3IFULklhdynEOnbcNsQCuXWEvJYcvEaeb0i+OVZcjZc1ycXe5ErgMotKeQ+hensZ0MolFtLyGPJxWvk9YrsZ8lZXtcnF3uRK4DKLSnkPoVI7+dZDYVyawl5LLl4jbxeEexnIiIiIspi5KIYcqVEuXy+3FPtZTbazm88xhjjMbngxr/Yz28G+5mIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiLKF/wNzW5WR0CU/4AAAAABJRU5ErkJggg==";
		}
		
		let imgPosX = Math.floor(sector.position.x+(GvGMap.Map.HexWidth/2)-(imgSizeX*imgFactor/2));
		let imgPosY = Math.floor(sector.position.y+(GvGMap.Map.HexHeight/2)-(imgSizeY*imgFactor/2))+imgOffsetY;
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
			yellowX: 400*imgSizeFactor,
			yellowY: 400*imgSizeFactor,
			redCrossX: 600*imgSizeFactor,
			redCrossY: 490*imgSizeFactor,
			blueCrossX: 500*imgSizeFactor,
			blueCrossY: 490*imgSizeFactor,
			yellowCrossX: 400*imgSizeFactor,
			yellowCrossY: 490*imgSizeFactor,
		};

		img.onload = function () {
			if (!redraw && GvGMap.Size !== 'mini') {
				if (sector.headquarter)
					GvGMap.CanvasCTX.drawImage(img, imgPositions.hqX, imgPositions.hqY, imgSizeX, imgSizeY, sector.position.x, sector.position.y, imgSizeX, imgSizeY);
				if (sector.isProtected)
					GvGMap.CanvasCTX.drawImage(img, imgPositions.shieldX, imgPositions.shieldY, imgSizeX, imgSizeY, sector.position.x, sector.position.y, imgSizeX, imgSizeY);
				if (sector.siege.clan != 0)
					GvGMap.CanvasCTX.drawImage(img, imgPositions.swordX, imgPositions.swordY, imgSizeX, imgSizeY, sector.position.x, sector.position.y, imgSizeX, imgSizeY);
			}
			GvGMap.CanvasCTX.drawImage(img, flag.x, flag.y, imgSizeX, imgSizeY, imgPosX, imgPosY, imgSizeX, imgSizeY);
			if (GvGMap.Marker && GvGMap.Size === 'big') {
				if (GvGMap.Marker == 'red')
					GvGMap.CanvasCTX.drawImage(img, imgPositions.redX, imgPositions.redY, imgSizeX, imgSizeY, sector.position.x, sector.position.y, imgSizeX, imgSizeY);
				else if (GvGMap.Marker == 'redCross')
					GvGMap.CanvasCTX.drawImage(img, imgPositions.redCrossX, imgPositions.redCrossY, imgSizeX, imgSizeY, sector.position.x, sector.position.y, imgSizeX, imgSizeY);
				else if (GvGMap.Marker == 'yellow')
					GvGMap.CanvasCTX.drawImage(img, imgPositions.yellowX, imgPositions.yellowY, imgSizeX, imgSizeY, sector.position.x, sector.position.y, imgSizeX, imgSizeY);
				else if (GvGMap.Marker == 'yellowCross')
					GvGMap.CanvasCTX.drawImage(img, imgPositions.yellowCrossX, imgPositions.yellowCrossY, imgSizeX, imgSizeY, sector.position.x, sector.position.y, imgSizeX, imgSizeY);
				else if (GvGMap.Marker == 'blue')
					GvGMap.CanvasCTX.drawImage(img, imgPositions.blueX, imgPositions.blueY, imgSizeX, imgSizeY, sector.position.x, sector.position.y, imgSizeX, imgSizeY);
				else if (GvGMap.Marker == 'blueCross')
					GvGMap.CanvasCTX.drawImage(img, imgPositions.blueCrossX, imgPositions.blueCrossY, imgSizeX, imgSizeY, sector.position.x, sector.position.y, imgSizeX, imgSizeY);
			}
		}
	},

	/**
	 * Draws Sector coordinates (and power)
	 */
	drawHexText: (sector) => {
		if (GvGMap.Size !== 'mini') {
			GvGMap.CanvasCTX.font = "9px Arial";
			if (GvGMap.Size === 'big')
				GvGMap.CanvasCTX.font = "12px Arial";
			GvGMap.CanvasCTX.textAlign = "center";
			GvGMap.CanvasCTX.fillStyle = ((sector.owner.color.r+sector.owner.color.g+sector.owner.color.b) < 350) ? '#ddd' : '#222';
			GvGMap.CanvasCTX.fillText(MapSector.coords(sector, true), sector.position.x + GvGMap.Map.HexWidth / 2, sector.position.y + GvGMap.Map.HexHeight * 0.85);
			if (GvGMap.Size === 'big' && sector.terrain !== "water" && sector.terrain !== "rocks")
				GvGMap.CanvasCTX.fillText(sector.power, sector.position.x + GvGMap.Map.HexWidth / 2, sector.position.y + GvGMap.Map.HexHeight * 0.25);
		}
	},

	/**
	 * Returns Sectors coordinates (with ~ if beach)
	 */
	coords(sector, draw = false) {
		if (sector.terrain === "beach" && draw)
			return "~"+sector.coordinates.x + ", " + sector.coordinates.y+"~";
		else if (sector.terrain === "plain" || sector.terrain === "beach")
			return sector.coordinates.x + ", " + sector.coordinates.y;
		return "";
	},
}
