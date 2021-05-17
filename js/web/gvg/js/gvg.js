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
            {"r":0,"g":220,"b":0},
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
            {"r":2,"g":2,"b":2},
            {"r":36,"g":76,"b":32},
            {"r":13,"g":43,"b":70},
            {"r":14,"g":77,"b":86},
            {"r":79,"g":26,"b":126},
            {"r":100,"g":63,"b":33},
            {"r":232,"g":189,"b":64},
            {"r":35,"g":60,"b":30},
            {"r":93,"g":100,"b":104},
            {"r":80,"g":70,"b":97},
            {"r":61,"g":13,"b":13},
            {"r":56,"g":81,"b":16},
            {"r":210,"g":150,"b":21}]
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
				title: i18n('Boxes.GvGMap.Title')+ ' BETA!',
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
        h.push('<div id="GvGMapInfo"></div>');
		h.push('<div id="GvGMapActions" class="btn-group">');
			h.push('<span id="editMap" class="btn-default">'+i18n('Boxes.GvGMap.Action.Edit')+'</span>');
			h.push('<span id="noGuild" class="btn-default btn-inset" style="display: none;"></span>');
			h.push('<span id="zoomMap" class="btn-default">'+i18n('Boxes.GvGMap.Action.Zoom')+'</span>');
			h.push('<span id="dragMap" class="btn-default active">'+i18n('Boxes.GvGMap.Action.Drag')+'</span>');
		h.push('</div>');
		h.push('<div id="GvGMapWrap">');
		h.push('<canvas id="gvg-map"></canvas></div><div id="gvgOptions">');
		h.push('</div>');

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
                color = GvGMap.Colors.premium[flag[flag.length-1]-1];
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
		guild = GvGMap.findGuildById(id);
		if (id < 0) {
			return i18n('Boxes.GvGMap.Log.NPC');
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
			t.push('<tr id="log-id-'+entry.sourceClan+'" class="'+entry.type+' logEntry">');
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
		t.push('<input type="text" data-type="text" id="logFilter" placeholder="Name, Sector.." class="gvglogfilter filter-msg game-cursor" value=""></input>');
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
				shieldY: 200
			}

			let img = new Image();
			img.src = 'https://tools.kingshood.de/gvg/img/flags_small.png';
			if (GvGMap.Size != 'small') {
				img.src = 'https://tools.kingshood.de/gvg/img/flags_medium.png';
				imgPositions = {
					hqX: 900*0.9,
					hqY: 400*0.9,
					shieldX: 800*0.9,
					shieldY: 400*0.9
				}
			}

			img.onload = function () {
				if (!redraw) {
					if (sector.headquarter)
						GvGMap.CanvasCTX.drawImage(img, imgPositions.hqX, imgPositions.hqY, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);
					if (sector.isProtected)
						GvGMap.CanvasCTX.drawImage(img, imgPositions.shieldX, imgPositions.shieldY, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);
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
		if (sector.owner.id <= 0)
			console.log(sector.owner, sector.terrain);
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
		GvGMap.CanvasCTX.fillStyle = ((sector.owner.color.r+sector.owner.color.g+sector.owner.color.b) < 300) ? '#ddd' : '#222';
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