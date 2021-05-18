/*
 * **************************************************************************************
 * Copyright (C) 2021  FoE-Helper team - All Rights Reserved
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
	if (GvG.Actions == undefined) {
		GvG.initActions();
	}
	GvG.setRecalc(data.responseData.continent.calculation_time.start_time, true);
});

FoEproxy.addHandler('ClanBattleService', 'getProvinceDetailed', (data, postData) => {	
	GvGMap.Map.OnloadData = data['responseData'];
	GvGMap.Map.OnloadDataTime = MainParser.getCurrentDateTime();
});

FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
	GvG.HideGvgHud();
});

FoEproxy.addWsHandler('ClanBattleService', 'changeProvince', (data, postData) => {	
	let entry = GvGLog.addEntry(data.responseData);
	if (entry != undefined) {
		MapSector.updateSector(entry.sectorId,entry.sourceClan,entry.type);
	}
	if ($('#gvgmaplog').length > 0 && entry != undefined)	{
		GvGLog.showEntry(entry);
	}
});

let GvG = {
	Actions: undefined,
	Init: false,

	initActions: () => {
		let Actions = JSON.parse(localStorage.getItem('GvGActions'));

		if (Actions == null) {			
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
		if ($('#gvg-hud').length == 0) {
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
					.append('<button class="btn-default mapbutton" onclick="GvGMap.showMap()">MAP</button>');
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

		if (time > GvG.Actions.NextCalc) { // when on a map during recalc
			console.log('time > GvG.Actions.NextCalc');
			GvG.resetData();
		}

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

		if (GvG.Actions.NextCalc != calcTime) {
			GvG.Actions.NextCalc = calcTime;
			/*if ((time-20) < calcTime) { // when switching maps via overview during recalc
				console.log('Reset during Recalc');
				GvG.resetData(calcTime);
			}*/
		}

		if (GvG.Actions.PrevCalc == 0) {
			GvG.Actions.PrevCalc = (calcTime-86400);
		}

		if (GvG.Actions.LastAction < GvG.Actions.PrevCalc && GvG.Actions.LastAction != 0) {
			console.log('GvG.Actions.LastAction < GvG.Actions.PrevCalc');
			GvG.resetData(calcTime);
		}

		localStorage.setItem('GvGActions', JSON.stringify(GvG.Actions));
		GvG.showGvgHud();
	},

    /**
	 * Reset all Data
	 */
	resetData: (calcTime = 0) => {
		let time = Math.ceil(MainParser.getCurrentDateTime()/1000); 
		console.log('GvG Data Reset');

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
		OnloadData: {},
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
		drag: true
	},
	CurrentGuild: {
		id: 0
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
            [{"r":2,"g":2,"b":2},{"r":30,"g":30,"b":30},{"r":60,"g":10,"b":10},{"r":100,"g":20,"b":50}],
            [{"r":36,"g":76,"b":32},{"r":36,"g":106,"b":32},{"r":10,"g":76,"b":10},{"r":0,"g":27,"b":82}],
            [{"r":13,"g":43,"b":70},{"r":10,"g":10,"b":10},{"r":0,"g":0,"b":50},{"r":10,"g":10,"b":30}],
            [{"r":14,"g":77,"b":86},{"r":14,"g":77,"b":86},{"r":14,"g":77,"b":86},{"r":14,"g":77,"b":86}],
            [{"r":79,"g":26,"b":126},{"r":40,"g":10,"b":50},{"r":43,"g":14,"b":78},{"r":60,"g":16,"b":110}],
            [{"r":100,"g":63,"b":33},{"r":80,"g":43,"b":13},{"r":120,"g":83,"b":53},{"r":50,"g":10,"b":0}],
            [{"r":232,"g":189,"b":64},{"r":210,"g":150,"b":21},{"r":232,"g":189,"b":64},{"r":232,"g":189,"b":64}],
            [{"r":35,"g":60,"b":30},{"r":36,"g":76,"b":32},{"r":35,"g":60,"b":30},{"r":35,"g":60,"b":30}],
            [{"r":44,"g":57,"b":64},{"r":28,"g":35,"b":39},{"r":30,"g":10,"b":50},{"r":47,"g":20,"b":41}],
            [{"r":80,"g":70,"b":97},{"r":80,"g":70,"b":97},{"r":80,"g":70,"b":97},{"r":80,"g":70,"b":97}],
            [{"r":61,"g":13,"b":13},{"r":120,"g":40,"b":0},{"r":50,"g":10,"b":1},{"r":61,"g":13,"b":13}],
            [{"r":56,"g":81,"b":16},{"r":56,"g":81,"b":16},{"r":56,"g":81,"b":16},{"r":56,"g":81,"b":16}],
            [{"r":210,"g":150,"b":21},{"r":210,"g":150,"b":21},{"r":210,"g":150,"b":21},{"r":210,"g":150,"b":21}]
		]
    },

	Tabs: [],
	TabsContent: [],

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

	initMap: (hexWidth, hexHeight, initial = true) => {
		GvGMap.Canvas = document.getElementById("gvg-map");
		GvGMap.CanvasCTX = GvGMap.Canvas.getContext('2d');
		GvGMap.Map.Guilds = [];
		GvGMap.Map.Sectors = [];
		GvGMap.Map.ProvinceData = GvGMap.Map.OnloadData.province_detailed;
		GvGMap.Map.GuildData = GvGMap.Map.OnloadData.province_detailed.clans;
		GvGMap.PowerValues = GvGMap.Map.OnloadData.province_detailed.power_values;
		GvGMap.Map.Era = GvGMap.Map.OnloadData.province_detailed.era;
		GvGMap.Map.HexWidth = hexWidth;
		GvGMap.Map.HexHeight = hexHeight;
		GvGMap.Size = 'small';
		if (hexWidth > 50) {
			GvGMap.Size = 'big';
		}
		GvGMap.Map.Width = (GvGMap.Map.ProvinceData.bounds.x_max - GvGMap.Map.ProvinceData.bounds.x_min)*GvGMap.Map.HexWidth+GvGMap.Map.HexWidth/2;
		GvGMap.Map.Height = (GvGMap.Map.ProvinceData.bounds.y_max - GvGMap.Map.ProvinceData.bounds.y_min)*GvGMap.Map.HexHeight*0.8;
		GvGMap.CurrentGuild = {};
		GvGMap.OwnGuild.Id = GvGMap.Map.OnloadData.clan_data.clan.id;
		GvGMap.OwnGuild.Members = GvGMap.Map.OnloadData.clan_data.clan.members;
	},

	/**
	 * Show GvG Map
	 */
	showMap: () => {
		if ($('#gvg-map').length == 0) {

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
	},

	/**
	 * Build GvG Map
	 */
	buildMap: (mapSize = 'small', initial = true) => {
		GvGMap.Tabs = [];
		GvGMap.TabsContent = [];

		GvGMap.SetTabs('gvgmapguilds');
		GvGMap.SetTabs('gvgmaplog');

		let h = [], t = [];
		h.push('<div id="GvGMapContent" class="mapFeature">');
			h.push('<div id="GvGMapMeta" class="dark-bg mapFeature">');
			h.push('<div id="GvGMapActions" class="btn-group mapFeature">');
				h.push('<span id="editMap" class="btn-default">'+i18n('Boxes.GvGMap.Action.Edit')+'</span>');
				h.push('<span id="noGuild" class="btn-default btn-inset" style="display: none;"></span>');
				h.push('<span id="zoomMap" class="btn-default">'+i18n('Boxes.GvGMap.Action.Zoom')+'</span>');
				h.push('<span id="dragMap" class="btn-default active">'+i18n('Boxes.GvGMap.Action.Drag')+'</span>');
				h.push('</div>');
				h.push('</div>');
			h.push('<div id="GvGMapWrap" class="mapFeature">');
			h.push('<canvas id="gvg-map"></canvas>');
			h.push('</div>');
		h.push('</div>');
        h.push('<div id="GvGMapInfo" class="mapFeature"></div>');
		//h.push('<span id="gvgOptionsToggleView" class="btn-default">Toggle</span>');
		h.push('<div id="gvgOptions"></div>');

		$('#GvGMapBody').html(h.join(''));

		GvGMap.populateCanvas(mapSize, initial);
		GvGMap.drawInfo();
		GvGMap.showGuilds();

		GvGLog.show();

		let editBtn = document.getElementById("editMap");
		let dragBtn = document.getElementById("dragMap");
		let zoomBtn = document.getElementById("zoomMap");
		let noGuildBtn = document.getElementById("noGuild");

        editBtn.addEventListener('click', function (e) {
            GvGMap.Actions.edit = true;
			GvGMap.Actions.drag = false;
			dragBtn.classList.remove('btn-default-active');
			editBtn.classList.add('btn-default-active');
			noGuildBtn.style.display = 'block';
        }, false);
        dragBtn.addEventListener('click', function (e) {
            GvGMap.Actions.edit = false;
			GvGMap.Actions.drag = true;
			editBtn.classList.remove('btn-default-active');
			dragBtn.classList.add('btn-default-active');
			noGuildBtn.style.display = 'none';
        }, false);
		zoomBtn.addEventListener('click', function (e) {
			if (GvGMap.Size == 'small')
            	GvGMap.buildMap('big', false);
			else
				GvGMap.buildMap('small', false);
        }, false);
		noGuildBtn.addEventListener('click', function (e) {
			GvGMap.CurrentGuild = { id: 0 };
        }, false);
		GvGMap.mapDragOrEdit();
		
		t.push('<div class="gvg-tabs tabs">');
		t.push( GvGMap.GetTabs() );
		t.push( GvGMap.GetTabContent() );
		t.push('</div>');
		$('#gvgOptions').html(t.join(''));


        $('#GvGGuilds tr').click(function (e) {
			let id = $(this).attr('id').replace('id-', '')/1;
			$('#GvGGuilds tr').removeClass('active');
			$(this).addClass('active');
			
			GvGMap.CurrentGuild = GvGMap.Map.Guilds.find(x => x.id  === id);
			console.log(GvGMap.CurrentGuild);
        });

		$('#GvGMap').find('#gvgmaplog').promise().done(function() {
			$('.gvg-tabs').tabslet({active: 1});
			$('.gvg-tabs .gvgmapguilds span').text(i18n('Boxes.GvGMap.Guild.Name'));
			$('.gvg-tabs .gvgmaplog span').text(i18n('Boxes.GvGMap.Log'));

			let textFilter = document.getElementById("logFilter");
			textFilter.addEventListener('keyup', function (e) {
				let search = textFilter.value.toLowerCase();
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
	},

	populateCanvas: (mapSize, initial) => {
		if (mapSize != 'small') 
			GvGMap.initMap(90,72,initial);
		else 
			GvGMap.initMap(50,40,initial);

		$(GvGMap.Canvas).attr({
			'id': 'gvg-map',
            'width': GvGMap.Map.Width,
            'height': GvGMap.Map.Height
        });
		
		GvGMap.CanvasCTX.clearRect(0, 0, GvGMap.Map.Width, GvGMap.Map.Height);

        GvGMap.Map.GuildData.forEach(function (guild) {
			let guildOnMap = {
				id: guild.id,
				name: guild.name,
				flag: guild.flag,
				color: GvGMap.getColor(guild),
				flagCoordinates: GvGMap.getFlagImageCoordinates(guild.flag),
				power: 0,
				sectors: 0,
			};
			GvGMap.Map.Guilds.push(guildOnMap);
			if ((guild.id) == GvGMap.OwnGuild.Id) {
				GvGMap.CurrentGuild = guildOnMap;
			}
        });

        GvGMap.Map.ProvinceData.sectors.forEach(function (sector) {
            if (sector.hitpoints != undefined) {
                let realX = (sector.position.x - GvGMap.Map.ProvinceData.bounds.x_min) * GvGMap.Map.HexWidth;
                let realY = (sector.position.y - GvGMap.Map.ProvinceData.bounds.y_min) * GvGMap.Map.HexHeight;
				let newSector = {};

				if (sector.position.y % 2 == 0) {
					newSector = MapSector.create(realX, realY * 0.75, sector);
				}
				else {
					newSector = MapSector.create(realX + (GvGMap.Map.HexWidth * 0.5), realY * 0.75, sector);
				}
				GvGMap.Map.Sectors.push(newSector);
				
				let guild = MapSector.findOwnerById(newSector.owner.id);
				if (guild != undefined) {
					guild.power += newSector.power;
					guild.sectors++;
				}
				MapSector.draw(newSector);
			}
        });
	},

	drawInfo: () => {
		GvGMap.CanvasCTX.font = "bold 22px Arial";
		GvGMap.CanvasCTX.textAlign = "left";
		GvGMap.CanvasCTX.fillStyle = '#ffb539';
		GvGMap.CanvasCTX.fillText(GvGMap.Map.Era, 10, 25);
		GvGMap.CanvasCTX.font = "12px Arial";
		GvGMap.CanvasCTX.fillStyle = '#ccc';
		GvGMap.CanvasCTX.fillText('Data fetched: '+ moment(GvGMap.Map.OnloadDataTime).format('D.M.YY - HH:mm:ss'), 10, 45);
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
						let prevOwner = sector.owner;
						sector.owner = GvGMap.CurrentGuild;
						if (sector.owner.id <= 0) {
							sector.owner.color = MapSector.setColorByTerrain(sector);
						}
						if (sector.terrain == "plain" || sector.terrain == "beach") {
							MapSector.draw(sector, true);
						}
						GvGMap.recalcGuildProvinces(prevOwner, sector.owner, sector);
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
		if (sector.owner.name != undefined) {
			html = '<div class="sectorInfo">'
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

	getColor: (guild) => {
        flag = guild.flag.split("_") || null;
        let color = {"r":255,"g":255,"b":255};

        if (flag != null)  {
            if (flag[0].search("premium") >= 0) {
                //color = GvGMap.Colors.premium[flag[flag.length-1]-1];
				color = GvGMap.Colors.premium[flag[flag.length-1]-1][Math.round(guild.id/4)%4];
			}
            else if (flag[flag.length - 1].toLowerCase() == "r") {
                color = GvGMap.Colors.r[Math.round(guild.id/13)%13];
			}
            else if (flag[flag.length - 1].toLowerCase() == "g")
                color = GvGMap.Colors.g[Math.round(guild.id/13)%13];
            else
				if (flag.length != 1)
					color = GvGMap.Colors.b[Math.round(guild.id/13)%13];

        }
        return color;
    },

	getFlagImageCoordinates: (flag) => {
        let id = flag.split("_");

        if (id[id.length - 1].toLowerCase() == "r" || id[id.length - 1].toLowerCase() == "g")
            id = parseInt(id[id.length - 2]);
        else
            id = parseInt(id[id.length - 1]);

        if (flag.search("premium") >= 0)
            id += 40;

        return {"x": (id % 10 ) * (GvGMap.Map.HexWidth), "y": Math.floor(id / 10) * (GvGMap.Map.HexHeight)};
    },

	colorToString: (color) => {
		return "rgb("+color.r+","+color.g+","+color.b+")";
	},

	showGuildFlagAndName: (id) => {
		let guild = GvGMap.findGuildById(id);
		if (id < 0) {
			return i18n('Boxes.GvGMap.Log.NPC');
		}
		else if (guild == GvGMap.OwnGuild) {
			return '<span class="guildflag '+guild.flag+'" style="background-color: '+GvGMap.colorToString(guild.color)+'"></span> '+ guild.name;
		}
		else if (guild != undefined) {
			return '<span class="guildflag '+guild.flag+'" style="background-color: '+GvGMap.colorToString(guild.color)+'"></span> '+ guild.name;
		}
		return i18n('Boxes.GvGMap.Log.UnknownGuild');
	}
}

let GvGLog = {
	Entries: [],

	DummyData: [],

	testData: () => {
		GvGLog.DummyData.forEach(function (data) {
			GvGLog.addEntry(data);
		});
	},

	addEntry: (response) => {
		if (response != undefined && response.type != undefined) {
			let type = response.type.replace('ClanBattle/','');
			let entry = {
				class: response.__class__,
				sectorId: response.sector_id,
				timestamp: response.timestamp,
				type: type,
				sourceClan: response.source_clan_id,
				targetClan: response.target_clan_id,
				details: {},
			};
			if (response.__class__ == "ClanBattleArmyChange") {
				entry.details = {
					hitpoints: response.hitpoints,
					playerId: (response.source_clan_id == GvGMap.OwnGuild.Id) ? response.player_id : 0
				}
			}
			else if (response.__class__ == "ClanBattleSectorChange") { // sector_independence_granted, sector_conquered, sector_slot_unlocked
				entry.details = {
					playerId: (response.source_clan_id == GvGMap.OwnGuild.Id) ? response.player_id : 0
				}
				if (entry.type == "sector_slot_unlocked" && entry.sourceClan != GvGMap.OwnGuild.Id) {
					entry.details = {};
				}
			}
			else if (response.__class__ == "ClanBattleBuildingChange") { // headquarter_placed
				entry.details = {
					nextRelocate: response.building.next_relocate
				}
			}
			if (entry.details != {} && type != "defender_low_hp" && type != "siege_low_hp" && type != "sector_fog_changed") {
				GvGLog.Entries.unshift(entry);
				return entry;
			}
		}
		return undefined;
	},

	showEntry: (entry) => {
		let tr = GvGLog.buildEntry(entry);
		$('#GvGMap').find('#gvgmaplog').promise().done(function() {
			$('#GvGlog').prepend(tr);
		});
	},

	buildEntry: (entry) => {
		let t = [];
		let sector = MapSector.findById(entry.sectorId);
		if (sector != undefined) { // if sector is on map
			let sectorCoords = MapSector.coords(sector);
			t.push('<tr class="'+entry.type+' logEntry">');
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
			t.push('</tr>');
		}
		return t.join('');
	},

	show: () => {
        let t = [];
		t.push('<div class="dark-bg text-center"><input type="text" data-type="text" id="logFilter" placeholder="'+i18n('Boxes.Infobox.Filter')+'" class="gvglogfilter filter-msg game-cursor" value=""></input></div>');
		t.push('<table id="GvGlog" class="foe-table">');
		t.push('<thead><tr>');
		t.push('<th>Sector</th>');
		t.push('<th>Info</th>');
		t.push('</tr></thead>');

		GvGLog.Entries.forEach(function(entry) {
			let tr = GvGLog.buildEntry(entry);
			t.push(tr);
		});
		t.push('</table>');

		GvGMap.SetTabContent('gvgmaplog', t.join(''));
	},
}

let MapSector = {
	create: (x, y, info) => {
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
			owner: MapSector.findOwnerById(info.owner_id) || { id: 0, color: MapSector.setColorByTerrain(info) },
			siege: {
				clan: info.siege_clan_id || 0,
			},
		}
		return sector;
	},

	findOwnerById: (id) => {
		let guild = GvGMap.Map.Guilds.find(x => x.id  === id);
		return guild;
	},

	findById: (id) => {
		return GvGMap.Map.Sectors.find(x => x.id  === id);
	},

	underSiege: (sector) => {
		if (sector.siege.clan != 0)
			return GvGMap.Map.Guilds.find(x => x.id  === sector.siege.clan).name;
		return false;
	},

	updateSector: (sectorId, ownerId, type) => {
		let guild = MapSector.findOwnerById(ownerId) || { id: 0 };
		let sector = MapSector.findById(sectorId);

		if (type == "sector_conquered") {
			sector.owner = guild;
			sector.isProtected = true;
			sector.headquarter = false;
			sector.siege.clan = 0;
			MapSector.draw(sector);
		}
		else if (type == "sector_independence_granted" || type == "sector_conquered") {
			sector.owner.id = 0;
			sector.owner.color = MapSector.setColorByTerrain(sector);
			sector.siege.clan = 0;
			MapSector.draw(sector);
		}
		else if (type == "headquarter_placed") {
			sector.headquarter = true;
			// todo: run through all sectors with guildid, remove old HQ
			MapSector.draw(sector);
		}
		else if (type == "siege_deployed") {
			sector.siege.clan = ownerId;
			MapSector.draw(sector);
		}
	},

	setColorByTerrain: (sector) => {
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
	draw: (sector, redraw = false) => {
		MapSector.drawHex(sector);
		MapSector.drawHexText(sector);
		if (sector.owner.id > 0) {
			let flag = sector.owner.flagCoordinates;
			let imgPositions = {
				hqX: 450,
				hqY: 200,
				shieldX: 400,
				shieldY: 200,
				swordX: 350,
				swordY: 200
			}

			let img = new Image();
			img.src = "data:image/png;base64,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";

			if (GvGMap.Size != 'small') {
				img.src = "data:image/png;base64,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ETS8tmDGs4jqy/B4wX8xDBrz8+NtodBg1DDjyGHGUsOiztQpk3pbANSHwExGBI29P4iI6BPxhw9AnUEw1GUIh4alD4qGpQZG9dYovSAi+nhI+lCoBqyMwVANZm8Lh2qo0wdEw5D4tgCYWQg0vMi8+j5vmx76zuMF//4xg1klEOplEgzfVoZB8fdyeksZjv5lrD+/LxER0fv3pw9mXYaAmLH0gdGwjNN0IqKPzluDoRrM9MFQDW6G4VA/1dMwJBqGP8MAmPGsoZmdMMbwchJvC4J/us7gfx8Gs2IQekd7/xwU/2bg+xD6TkREn7h/8gHODzQion/Xm/+npodCw2mkhsFQP2qolj4c6gOiYUg0vNWvyxgCMztGMONxgpmFwb+cJvrhB8KM/tvPxg+5z0REREREZAS/h0KDYJhxxFAfDg0Doj7g6c8MmrH+KgC+a2popkHw3wmDDEdEREREREQGfg9LbwmGGUcOMwZEfRmGP8OTw/xVAPxHU0P/tyDIMEhERERERJQJyeA202Cor4wB0TAkvq3+ajpopiOB/95oIMMgERERERHRP/DnEUODcJgxIBqGxIyVcSTwnaOAbztZDMMgERERERHRe/PnUKUPZW8JifqgmFlgfI+jgAyARERERERE/4K3B663HdeXMSy+axvD1+JZNYmIiIiIiLKcfzOo/dsFg1siIiIiIiL6f/S+wx4RERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERERHRp0D6AIoy4dEflgH+2NTHF58buy1ERERERPRhUgOXyb9Z9i2yd0gIkw5PGSUd6ttB2/p/fD0Gwrf40g4F3HpJ39g6opax20JERERERB8u2QrIbgnk+KuqXhJ5y1sg97u2C+ilmZMSC5E0ASJmOKLetb1VHphXLZOrYMblSru0xt4xWVV8PExad4NtDw/pikN3DIiKQm5jt4mIiIiIiD5csgWQOy+QN7NqWA3lnB2049rUNanztm3UKpob+XW+8sJN8yDWzcKrOdHQ/dX2atUpl6NN11YmCdWsUFS/rCSQzdg7JKtp1gH5Bw1C6dho1JkUhfiwEKzr6yt9HRSEw0um4UjKFPglzkDJ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SA7Q2BUrnP8LG0seV5WBbAFY5gVK/lU52aL1zmRc2ThP+sW2ssb+XdtnLPU9lPf6uKcw2n1ZAPYuHdCqeyc4uHaHY9eOqFfvt5HooCBUSYjF+Hmx0tHdyRAXN0BcV2rTPJxNjIZDZi/5eW+Yj9XJ00+nSuLHrRDfrofYOl96MidWWhUxCi4N26afwMfLywT27rZo084Z9k4d0KZzO9SoUeA99ZyIiIiIsgChzpFMv9WX4fIPms4JpsWtzSs1tC0UfniB/LJP78/E4hgzMWZQ7nsVqpW8VKme1YFSVQvvOrtYEvuWm4iqjYs/QrFKM2yq5WuI9IumW1vzOnkZSHkAcyU1FH5Xtaqrbb4+EdeWTtXcq1wie/2/85yMVQgoqLynibE7bQz1WsE8ZIg8f+Ms6cYv2yCurJfEpgRpx+nVuP/0AMT2RfjVzRujVk77fSTRR4fWkaHY/cseiIfqNSCTpNP7FuGw+vioEihnjcfBjq7wNGa/iIiIiIjeuw1j0WmUh+n6Zs3Mv54/JvuDiFHmwj+woOjjmufq0O5ywoZx2GHfKn8PFLYuYJHDooi5uXUeY7c5K7IEcuQF8v6dqlTWpPq8SfLZ+dHyN2XMsxf7u8/LWOqJa/AJhsLqtshr3xXVdMMxZcpYnPPzQetxQfis1wA0Tpgo3TyzHGLXQiUYJuHo3oVI2bEUqamz8ORHJTxe3wIxoC8W9ndDqcTxKBwYKEdM0EnXdUNg7+uLz/GpHKNJRERERKRao4OlawsTz4LlC4ZMDs5xYH+K6d0DK7L9EBNgusbJ1sQ91gMBtnXMrVC8eL4iFhY2RYsWzf/uV/3kmKiB8O9WISBnVJB2U9xoHLS1gcU/eW5mhY99+mgmKlWCqbsHwhrao5rh8mZd0H51PO5fWwfxzRqlVkNcSoPYlywJ9ZjZmFFYV7XqH68p2LkHfOxd0OH99oCIiIiIiD4G6vGZJv+0QgdKmwb20q5p+Sac/OPnZ1K/X4LhE2DjgBxeXq9HSP/Eoz9qDfZDxNgQrJmow/HYMKQNC5Sn9+sDNxcXZDrCbecEHiNIRERERETvh08vk8k9nEwGGrsdHyobG5g4OcE0s3VuXije2wt9Rw/D9LAgrIsMRry/P4a7usNWCZGZTrFVXotnzCUiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIqKPxv8B6I0WavfZZhkAAAAASUVORK5CYII=";
				imgPositions = {
					hqX: 900*0.9,
					hqY: 400*0.9,
					shieldX: 800*0.9,
					shieldY: 400*0.9,
					swordX: 700*0.9,
					swordY: 400*0.9
				}
			}

			img.onload = function () {
				if (!redraw) {
					if (sector.headquarter)
						GvGMap.CanvasCTX.drawImage(img, imgPositions.hqX, imgPositions.hqY, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);
					if (sector.isProtected)
						GvGMap.CanvasCTX.drawImage(img, imgPositions.shieldX, imgPositions.shieldY, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);
					if (sector.siege.clan != 0)
						GvGMap.CanvasCTX.drawImage(img, imgPositions.swordX, imgPositions.swordY, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);
				}
				if (GvGMap.Size != 'small') {
					GvGMap.CanvasCTX.drawImage(img, flag.x, flag.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);
				}
				else {
					GvGMap.CanvasCTX.drawImage(img, flag.x, flag.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y-5, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);
				}
			}
		}
	},

	/**
	 * Draws Sector hexagon in its owners color
	 */
	drawHex: (sector) => {
		GvGMap.CanvasCTX.fillStyle = GvGMap.colorToString(sector.owner.color);
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
		GvGMap.CanvasCTX.font = "9px Arial";
		if (GvGMap.Size == 'big')
			GvGMap.CanvasCTX.font = "12px Arial";
		GvGMap.CanvasCTX.textAlign = "center";
		GvGMap.CanvasCTX.fillStyle = ((sector.owner.color.r+sector.owner.color.g+sector.owner.color.b) < 350) ? '#ddd' : '#222';
		GvGMap.CanvasCTX.fillText(MapSector.coords(sector), sector.position.x + GvGMap.Map.HexWidth / 2, sector.position.y + GvGMap.Map.HexHeight * 0.85);
		if (GvGMap.Size == 'big' && sector.terrain != "water" && sector.terrain != "rocks")
			GvGMap.CanvasCTX.fillText(sector.power, sector.position.x + GvGMap.Map.HexWidth / 2, sector.position.y + GvGMap.Map.HexHeight * 0.25);
	},

	/**
	 * Returns Sectors coordinates (with ~ if beach)
	 */
	coords(sector) {
		if (sector.terrain == "beach")
			return sector.coordinates.x + ", " + sector.coordinates.y;
		if (sector.terrain == "plain")
			return sector.coordinates.x + ", " + sector.coordinates.y;
		return "";
	},
}