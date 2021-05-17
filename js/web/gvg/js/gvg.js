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

/*FoEproxy.addWsHandler('ClanBattleService', 'changeProvince', (data, postData) => {	
	GvGLog.addEntry(data.responseData);
});*/

FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
	GvG.HideGvgHud();
});

let GvG = {
	Actions: undefined,
	Init: false,

	initActions: () => {
		console.log("GvG Init");
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
				div.append('<div class="independences">'+GvG.Actions.Independences+'/4</div><div class="sieges">'+GvG.Actions.Sieges+'</div><div class="defenders">'+GvG.Actions.Defenders+'</div>')
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
			$('#gvg-hud .sieges').text(GvG.Actions.Sieges);
			$('#gvg-hud .defenders').text(GvG.Actions.Defenders);
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
	OwnGuildId: 0,

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
	 *
	 * @param id
	 */
	SetTabs: (id)=> {
		GvGMap.Tabs.push('<li class="' + id + ' game-cursor"><a href="#' + id + '" class="game-cursor"><span>&nbsp;</span></a></li>');
	},

	/**
	 * Gibt alle gemerkten Tabs aus
	 *
	 * @returns {string}
	 */
	GetTabs: ()=> {
		return '<ul class="horizontal dark-bg">' + GvGMap.Tabs.join('') + '</ul>';
	},

	/**
	 * Speichert BoxContent zwischen
	 *
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
	 *
	 * @returns {string}
	 */
	GetTabContent: ()=> {
		return GvGMap.TabsContent.join('');
	},

	initMap: (hexWidth, hexHeight) => {
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
		console.log(GvGMap.Map.OnloadData);
		GvGMap.CurrentGuild = {};
		GvGMap.OwnGuildId = GvGMap.Map.OnloadData.clan_data.clan.id;
	},

	/**
	 * Build GvG Map
	 */
	showMap: () => {
		if ($('#gvg-map').length == 0) {

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
	},

	buildMap: (mapSize = 'small') => {
		GvGMap.Tabs = [];
		GvGMap.TabsContent = [];

		GvGMap.SetTabs('gvgmapguilds');
		GvGMap.SetTabs('gvgmaplog');

		let h = [], t = [];
        h.push('<div id="GvGMapInfo"></div><div id="GvGMapActions" class="btn-group"><span id="editMap" class="btn-default">'+i18n('Boxes.GvGMap.Action.Edit')+'</span><span id="zoomMap" class="btn-default">'+i18n('Boxes.GvGMap.Action.Zoom')+'</span><span id="dragMap" class="btn-default active">'+i18n('Boxes.GvGMap.Action.Drag')+'</span></div>');
		h.push('<div id="GvGMapWrap"><canvas id="gvg-map"></canvas></div><div id="gvgOptions"></div>');
		//h.push('<div class="gvgOptions"><div id="gvgmapguilds"></div><div id="gvgmaplog"></div></div>');

		$('#GvGMapBody').html(h.join(''));

		GvGMap.populateCanvas(mapSize);
		GvGMap.drawInfo();
		GvGMap.showGuilds();

		//GvGLog.testData();
		//GvGLog.show();

		let editBtn = document.getElementById("editMap");
		let dragBtn = document.getElementById("dragMap");
		let zoomBtn = document.getElementById("zoomMap");

        editBtn.addEventListener('click', function (e) {
            GvGMap.Actions.edit = true;
			GvGMap.Actions.drag = false;
			dragBtn.classList.remove('btn-default-active');
			editBtn.classList.add('btn-default-active');
        }, false);
        dragBtn.addEventListener('click', function (e) {
            GvGMap.Actions.edit = false;
			GvGMap.Actions.drag = true;
			editBtn.classList.remove('btn-default-active');
			dragBtn.classList.add('btn-default-active');
        }, false);
		zoomBtn.addEventListener('click', function (e) {
			if (GvGMap.Size == 'small')
            	GvGMap.buildMap('big');
			else
				GvGMap.buildMap();
        }, false);

		GvGMap.mapDragOrEdit();
		GvGMap.setCurrentGuild();
		
		t.push('<div class="gvg-tabs tabs">');
		t.push( GvGMap.GetTabs() );
		t.push( GvGMap.GetTabContent() );
		t.push('</div>');
		$('#gvgOptions').html(t.join(''));

		$('#GvGMap').find('#gvgmaplog').promise().done(function() {
			$('.gvg-tabs').tabslet({active: 1});
			$('.gvg-tabs .gvgmapguilds span').text(i18n('Boxes.GvGMap.Guild.Name'));
			$('.gvg-tabs .gvgmaplog span').text('Log (soonish)');
		});
	},

	populateCanvas: (mapSize) => {
		if (mapSize != 'small') 
			GvGMap.initMap(90,72);
		else 
			GvGMap.initMap(50,40);

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
			if ((guild.id) == GvGMap.OwnGuildId) {
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

	setCurrentGuild: () => {
        $('#GvGGuilds tr').click(function (e) {
			let id = $(this).attr('id').replace('id-', '')/1;
			$('#GvGGuilds tr').removeClass('active');
			$(this).addClass('active');
			
			GvGMap.CurrentGuild = GvGMap.Map.Guilds.find(x => x.id  === id);
        });
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
					else {
						let prevOwner = sector.owner;
						sector.owner = GvGMap.CurrentGuild;
						console.log(sector.owner);
						if (sector.owner.id <= 0)
							sector.owner.color = MapSector.setColorByTerrain(sector);
						if (sector.terrain == "plain" || sector.terrain == "beach") {
							MapSector.draw(sector);
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
}

let GvGLog = {
	Entries: [],

	DummyData: [
		{
			"army_id": 2078642,
			"hitpoints": 30,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187759,
			"player_id": 585359,
			"sector_id": 4060,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078646,
			"hitpoints": 40,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187764,
			"player_id": 585359,
			"sector_id": 4060,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078649,
			"hitpoints": 50,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187768,
			"player_id": 585359,
			"sector_id": 4060,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078651,
			"hitpoints": 60,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187771,
			"player_id": 585359,
			"sector_id": 4060,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077944,
			"hitpoints": 1,
			"hitpoint_change": -10,
			"type": "ClanBattle/siege_deleted",
			"timestamp": 1621187772,
			"player_id": 7458293,
			"sector_id": 4121,
			"source_clan_id": 30785,
			"target_clan_id": 11484,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078653,
			"hitpoints": 70,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187779,
			"player_id": 585359,
			"sector_id": 4060,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078657,
			"hitpoints": 80,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187783,
			"player_id": 585359,
			"sector_id": 4060,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078662,
			"hitpoints": 20,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187792,
			"player_id": 7458293,
			"sector_id": 4142,
			"source_clan_id": 30785,
			"target_clan_id": 30785,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078665,
			"hitpoints": 30,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187797,
			"player_id": 7458293,
			"sector_id": 4142,
			"source_clan_id": 30785,
			"target_clan_id": 30785,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187800,
			"player_id": 585359,
			"sector_id": 4072,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187801,
			"player_id": 585359,
			"sector_id": 4072,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187802,
			"player_id": 585359,
			"sector_id": 4072,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187804,
			"player_id": 585359,
			"sector_id": 4072,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187805,
			"player_id": 585359,
			"sector_id": 4072,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187807,
			"player_id": 585359,
			"sector_id": 4072,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078669,
			"hitpoints": 30,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187808,
			"player_id": 585359,
			"sector_id": 4072,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187811,
			"player_id": 587212,
			"sector_id": 3991,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078673,
			"hitpoints": 40,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187812,
			"player_id": 587212,
			"sector_id": 3991,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078678,
			"hitpoints": 40,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187820,
			"player_id": 585359,
			"sector_id": 4072,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078680,
			"hitpoints": 20,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187821,
			"player_id": 587212,
			"sector_id": 4011,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078682,
			"hitpoints": 50,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187824,
			"player_id": 585359,
			"sector_id": 4072,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078684,
			"hitpoints": 60,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187828,
			"player_id": 585359,
			"sector_id": 4072,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187829,
			"player_id": 587212,
			"sector_id": 4011,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078685,
			"hitpoints": 30,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187830,
			"player_id": 587212,
			"sector_id": 4011,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078686,
			"hitpoints": 70,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187832,
			"player_id": 585359,
			"sector_id": 4072,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187835,
			"player_id": 717487,
			"sector_id": 4090,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078688,
			"hitpoints": 80,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187836,
			"player_id": 585359,
			"sector_id": 4072,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078689,
			"hitpoints": 30,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187836,
			"player_id": 717487,
			"sector_id": 4090,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187842,
			"player_id": 717487,
			"sector_id": 4090,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078691,
			"hitpoints": 40,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187844,
			"player_id": 717487,
			"sector_id": 4090,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187846,
			"player_id": 587212,
			"sector_id": 3994,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078693,
			"hitpoints": 50,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187847,
			"player_id": 587212,
			"sector_id": 3994,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078694,
			"hitpoints": 20,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187848,
			"player_id": 8770396,
			"sector_id": 3961,
			"source_clan_id": 20227,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187852,
			"player_id": 587212,
			"sector_id": 3994,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187853,
			"player_id": 10071404,
			"sector_id": 3961,
			"source_clan_id": 20227,
			"target_clan_id": 20227,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078698,
			"hitpoints": 60,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187853,
			"player_id": 587212,
			"sector_id": 3994,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078699,
			"hitpoints": 30,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187855,
			"player_id": 10071404,
			"sector_id": 3961,
			"source_clan_id": 20227,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187855,
			"player_id": 717487,
			"sector_id": 4090,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078700,
			"hitpoints": 50,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187856,
			"player_id": 717487,
			"sector_id": 4090,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078703,
			"hitpoints": 20,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187865,
			"player_id": 10083035,
			"sector_id": 3958,
			"source_clan_id": 20227,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187865,
			"player_id": 717487,
			"sector_id": 4090,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078704,
			"hitpoints": 20,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187865,
			"player_id": 587212,
			"sector_id": 3952,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078705,
			"hitpoints": 60,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187865,
			"player_id": 717487,
			"sector_id": 4090,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078706,
			"hitpoints": 20,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187866,
			"player_id": 8770396,
			"sector_id": 3960,
			"source_clan_id": 20227,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187871,
			"player_id": 717487,
			"sector_id": 4090,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187872,
			"player_id": 717487,
			"sector_id": 4090,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187872,
			"player_id": 587212,
			"sector_id": 3952,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078707,
			"hitpoints": 30,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187873,
			"player_id": 587212,
			"sector_id": 3952,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078709,
			"hitpoints": 70,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187877,
			"player_id": 717487,
			"sector_id": 4090,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_independence_granted",
			"timestamp": 1621187884,
			"player_id": 587212,
			"sector_id": 3938,
			"source_clan_id": 1654,
			"target_clan_id": -27,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078712,
			"hitpoints": 80,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187887,
			"player_id": 717487,
			"sector_id": 4090,
			"source_clan_id": 467,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078714,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621187889,
			"player_id": 4529031,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078714,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187891,
			"player_id": 807568,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078714,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187892,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078714,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187892,
			"player_id": 800794,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077929,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621187893,
			"player_id": 4529031,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078714,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187893,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078714,
			"type": "ClanBattle/siege_low_hp",
			"timestamp": 1621187893,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078714,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187893,
			"player_id": 807568,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078714,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187894,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078714,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187894,
			"player_id": 800794,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078714,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187895,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078714,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187895,
			"player_id": 807568,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077929,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621187895,
			"player_id": 4529031,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078714,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_defeated",
			"timestamp": 1621187896,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_independence_granted",
			"timestamp": 1621187904,
			"player_id": 6807803,
			"sector_id": 4149,
			"source_clan_id": 11484,
			"target_clan_id": -27,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078720,
			"hitpoints": 8,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621187907,
			"player_id": 4529031,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078720,
			"hitpoints": 7,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187908,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078720,
			"hitpoints": 7,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187909,
			"player_id": 807568,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077929,
			"hitpoints": 7,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621187909,
			"player_id": 7317165,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078720,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187909,
			"player_id": 800794,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187909,
			"player_id": 587212,
			"sector_id": 3968,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078720,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187909,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078720,
			"type": "ClanBattle/siege_low_hp",
			"timestamp": 1621187909,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078721,
			"hitpoints": 30,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187910,
			"player_id": 587212,
			"sector_id": 3968,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078720,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187910,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078720,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187910,
			"player_id": 807568,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078720,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187911,
			"player_id": 513225,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077929,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621187911,
			"player_id": 4529031,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077929,
			"type": "ClanBattle/defender_low_hp",
			"timestamp": 1621187911,
			"player_id": 4529031,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078720,
			"hitpoints": 5,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187911,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077929,
			"hitpoints": 5,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621187911,
			"player_id": 6183084,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078720,
			"hitpoints": 4,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187911,
			"player_id": 800794,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078720,
			"hitpoints": 5,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_defeated",
			"timestamp": 1621187912,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078726,
			"hitpoints": 5,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621187922,
			"player_id": 4529031,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187923,
			"player_id": 587212,
			"sector_id": 3994,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078726,
			"hitpoints": 4,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187923,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077929,
			"hitpoints": 4,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621187924,
			"player_id": 7317165,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078727,
			"hitpoints": 70,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187924,
			"player_id": 587212,
			"sector_id": 3994,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078726,
			"hitpoints": 3,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187924,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078726,
			"hitpoints": 3,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187924,
			"player_id": 807568,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078726,
			"type": "ClanBattle/siege_low_hp",
			"timestamp": 1621187925,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078726,
			"hitpoints": 3,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187925,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077929,
			"hitpoints": 3,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621187925,
			"player_id": 6183084,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078726,
			"hitpoints": 2,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187926,
			"player_id": 807568,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077929,
			"hitpoints": 2,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621187926,
			"player_id": 4529031,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078726,
			"hitpoints": 1,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187926,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078726,
			"hitpoints": 1,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187927,
			"player_id": 800794,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078726,
			"hitpoints": 1,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187928,
			"player_id": 807568,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078726,
			"hitpoints": 1,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621187928,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078726,
			"hitpoints": 2,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_defeated",
			"timestamp": 1621187929,
			"player_id": 511977,
			"sector_id": 3938,
			"source_clan_id": 9323,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187933,
			"player_id": 587212,
			"sector_id": 3994,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078733,
			"hitpoints": 80,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187934,
			"player_id": 587212,
			"sector_id": 3994,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078738,
			"hitpoints": 20,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187949,
			"player_id": 587212,
			"sector_id": 4009,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_slot_unlocked",
			"timestamp": 1621187955,
			"player_id": 587212,
			"sector_id": 4009,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078743,
			"hitpoints": 30,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187955,
			"player_id": 587212,
			"sector_id": 4009,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078749,
			"hitpoints": 10,
			"type": "ClanBattle/defender_replaced",
			"timestamp": 1621187968,
			"player_id": 8770396,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": 20227,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078751,
			"hitpoints": 20,
			"hitpoint_change": 10,
			"type": "ClanBattle/defender_deployed",
			"timestamp": 1621187969,
			"player_id": 587212,
			"sector_id": 3951,
			"source_clan_id": 1654,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_independence_granted",
			"timestamp": 1621187981,
			"player_id": 8432453,
			"sector_id": 4138,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"building": {
				"next_relocate": 1621188000,
				"__class__": "ClanBattleHeadquarter"
			},
			"type": "ClanBattle/headquarter_placed",
			"timestamp": 1621187981,
			"player_id": 6807803,
			"sector_id": 4109,
			"source_clan_id": 11484,
			"target_clan_id": 11484,
			"__class__": "ClanBattleBuildingChange"
		},
		{
			"type": "ClanBattle/sector_independence_granted",
			"timestamp": 1621187983,
			"player_id": 2024164,
			"sector_id": 4135,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"type": "ClanBattle/sector_independence_granted",
			"timestamp": 1621187984,
			"player_id": 8432453,
			"sector_id": 4126,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"type": "ClanBattle/sector_independence_granted",
			"timestamp": 1621187986,
			"player_id": 2024164,
			"sector_id": 4124,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"type": "ClanBattle/sector_independence_granted",
			"timestamp": 1621187987,
			"player_id": 8432453,
			"sector_id": 4125,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"type": "ClanBattle/sector_independence_granted",
			"timestamp": 1621187995,
			"player_id": 10071404,
			"sector_id": 3927,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078768,
			"hitpoints": 2,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621187996,
			"player_id": 4529031,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_independence_granted",
			"timestamp": 1621187997,
			"player_id": 7317165,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"type": "ClanBattle/sector_independence_granted",
			"timestamp": 1621187998,
			"player_id": 8770396,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078770,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621187999,
			"player_id": 807568,
			"sector_id": 3927,
			"source_clan_id": 9323,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077929,
			"hitpoints": 1,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188012,
			"player_id": 4529031,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078773,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188013,
			"player_id": 807568,
			"sector_id": 3956,
			"source_clan_id": 9323,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078775,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188013,
			"player_id": 511977,
			"sector_id": 4065,
			"source_clan_id": 9323,
			"target_clan_id": 6998,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078777,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188013,
			"player_id": 800794,
			"sector_id": 4066,
			"source_clan_id": 9323,
			"target_clan_id": 27272,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078779,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188013,
			"player_id": 8770396,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078780,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188013,
			"player_id": 2024164,
			"sector_id": 4135,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077929,
			"hitpoints": 2,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_defeated",
			"timestamp": 1621188014,
			"player_id": 4529031,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_conquered",
			"timestamp": 1621188014,
			"player_id": 4529031,
			"sector_id": 3938,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078773,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188015,
			"player_id": 7317165,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078770,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188015,
			"player_id": 10083035,
			"sector_id": 3927,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078800,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188015,
			"player_id": 8432453,
			"sector_id": 4126,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078181,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188015,
			"player_id": 807568,
			"sector_id": 3956,
			"source_clan_id": 9323,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077586,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188016,
			"player_id": 511977,
			"sector_id": 4065,
			"source_clan_id": 9323,
			"target_clan_id": 6998,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078004,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188016,
			"player_id": 800794,
			"sector_id": 4066,
			"source_clan_id": 9323,
			"target_clan_id": 27272,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078773,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188016,
			"player_id": 6183084,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078808,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188016,
			"player_id": 423722,
			"sector_id": 4019,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078181,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188016,
			"player_id": 513225,
			"sector_id": 3956,
			"source_clan_id": 9323,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078810,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188017,
			"player_id": 5687524,
			"sector_id": 4098,
			"source_clan_id": 11484,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078773,
			"hitpoints": 7,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188017,
			"player_id": 7317165,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078749,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188017,
			"player_id": 4529031,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078811,
			"hitpoints": 20,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188017,
			"player_id": 512828,
			"sector_id": 4018,
			"source_clan_id": 9133,
			"target_clan_id": 30549,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078813,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188017,
			"player_id": 803214,
			"sector_id": 4122,
			"source_clan_id": 11484,
			"target_clan_id": 30785,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078181,
			"hitpoints": 7,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188017,
			"player_id": 807568,
			"sector_id": 3956,
			"source_clan_id": 9323,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078749,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188017,
			"player_id": 8770396,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078815,
			"hitpoints": 30,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188018,
			"player_id": 427548,
			"sector_id": 4009,
			"source_clan_id": 10136,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076963,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188018,
			"player_id": 2024164,
			"sector_id": 4135,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078816,
			"hitpoints": 80,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188018,
			"player_id": 423416,
			"sector_id": 4089,
			"source_clan_id": 467,
			"target_clan_id": 6704,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078817,
			"hitpoints": 80,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188018,
			"player_id": 1613507,
			"sector_id": 4060,
			"source_clan_id": 29669,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078004,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188018,
			"player_id": 800794,
			"sector_id": 4066,
			"source_clan_id": 9323,
			"target_clan_id": 27272,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078004,
			"hitpoints": 7,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188018,
			"player_id": 511977,
			"sector_id": 4066,
			"source_clan_id": 9323,
			"target_clan_id": 27272,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078770,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188018,
			"player_id": 5269109,
			"sector_id": 3927,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078773,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188018,
			"player_id": 7317165,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078773,
			"type": "ClanBattle/siege_low_hp",
			"timestamp": 1621188018,
			"player_id": 7317165,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078819,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188018,
			"player_id": 2960343,
			"sector_id": 4037,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078773,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188019,
			"player_id": 6183084,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078822,
			"hitpoints": 20,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188019,
			"player_id": 585359,
			"sector_id": 4111,
			"source_clan_id": 467,
			"target_clan_id": 6704,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078749,
			"hitpoints": 7,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188019,
			"player_id": 4529031,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077847,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188019,
			"player_id": 1473126,
			"sector_id": 4019,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077847,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188020,
			"player_id": 423722,
			"sector_id": 4019,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078004,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188020,
			"player_id": 800794,
			"sector_id": 4066,
			"source_clan_id": 9323,
			"target_clan_id": 27272,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078004,
			"type": "ClanBattle/defender_low_hp",
			"timestamp": 1621188020,
			"player_id": 800794,
			"sector_id": 4066,
			"source_clan_id": 9323,
			"target_clan_id": 27272,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078181,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188020,
			"player_id": 807568,
			"sector_id": 3956,
			"source_clan_id": 9323,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078181,
			"type": "ClanBattle/defender_low_hp",
			"timestamp": 1621188020,
			"player_id": 807568,
			"sector_id": 3956,
			"source_clan_id": 9323,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078181,
			"hitpoints": 5,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188020,
			"player_id": 513225,
			"sector_id": 3956,
			"source_clan_id": 9323,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078749,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188020,
			"player_id": 8770396,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078749,
			"type": "ClanBattle/defender_low_hp",
			"timestamp": 1621188020,
			"player_id": 8770396,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078824,
			"hitpoints": 20,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188020,
			"player_id": 115968,
			"sector_id": 4001,
			"source_clan_id": 9133,
			"target_clan_id": 30549,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077553,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188020,
			"player_id": 803214,
			"sector_id": 4122,
			"source_clan_id": 11484,
			"target_clan_id": 30785,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078825,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188021,
			"player_id": 511977,
			"sector_id": 4079,
			"source_clan_id": 9323,
			"target_clan_id": 6998,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077553,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188021,
			"player_id": 7732998,
			"sector_id": 4122,
			"source_clan_id": 11484,
			"target_clan_id": 30785,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078770,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188021,
			"player_id": 10083035,
			"sector_id": 3927,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078773,
			"hitpoints": 4,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188021,
			"player_id": 7317165,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078274,
			"hitpoints": 19,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188021,
			"player_id": 585359,
			"sector_id": 4111,
			"source_clan_id": 467,
			"target_clan_id": 6704,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078773,
			"hitpoints": 4,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188021,
			"player_id": 6183084,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078827,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188021,
			"player_id": 8404356,
			"sector_id": 4021,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077553,
			"hitpoints": 7,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188021,
			"player_id": 5933688,
			"sector_id": 4122,
			"source_clan_id": 11484,
			"target_clan_id": 30785,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078749,
			"hitpoints": 5,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188022,
			"player_id": 4529031,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078770,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188022,
			"player_id": 5269109,
			"sector_id": 3927,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078770,
			"type": "ClanBattle/siege_low_hp",
			"timestamp": 1621188022,
			"player_id": 5269109,
			"sector_id": 3927,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077729,
			"hitpoints": 19,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188022,
			"player_id": 512828,
			"sector_id": 4018,
			"source_clan_id": 9133,
			"target_clan_id": 30549,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076963,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188022,
			"player_id": 2024164,
			"sector_id": 4135,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078770,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188022,
			"player_id": 10071404,
			"sector_id": 3927,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078828,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188022,
			"player_id": 6807803,
			"sector_id": 4110,
			"source_clan_id": 11484,
			"target_clan_id": 25179,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078004,
			"hitpoints": 5,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188022,
			"player_id": 800794,
			"sector_id": 4066,
			"source_clan_id": 9323,
			"target_clan_id": 27272,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078749,
			"hitpoints": 4,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188022,
			"player_id": 8770396,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077553,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188022,
			"player_id": 5933688,
			"sector_id": 4122,
			"source_clan_id": 11484,
			"target_clan_id": 30785,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077553,
			"type": "ClanBattle/defender_low_hp",
			"timestamp": 1621188022,
			"player_id": 5933688,
			"sector_id": 4122,
			"source_clan_id": 11484,
			"target_clan_id": 30785,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077266,
			"hitpoints": 29,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188023,
			"player_id": 1244937,
			"sector_id": 4009,
			"source_clan_id": 10136,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077847,
			"hitpoints": 7,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188023,
			"player_id": 423722,
			"sector_id": 4019,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077553,
			"hitpoints": 5,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188023,
			"player_id": 7457766,
			"sector_id": 4122,
			"source_clan_id": 11484,
			"target_clan_id": 30785,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078773,
			"hitpoints": 4,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188023,
			"player_id": 7317165,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077553,
			"hitpoints": 4,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188023,
			"player_id": 5933688,
			"sector_id": 4122,
			"source_clan_id": 11484,
			"target_clan_id": 30785,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078832,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188023,
			"player_id": 587212,
			"sector_id": 3993,
			"source_clan_id": 1654,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077847,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188024,
			"player_id": 1473126,
			"sector_id": 4019,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077847,
			"type": "ClanBattle/defender_low_hp",
			"timestamp": 1621188024,
			"player_id": 1473126,
			"sector_id": 4019,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076945,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188024,
			"player_id": 5687524,
			"sector_id": 4098,
			"source_clan_id": 11484,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078833,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188024,
			"player_id": 587053,
			"sector_id": 4031,
			"source_clan_id": 1654,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078181,
			"hitpoints": 4,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188024,
			"player_id": 513225,
			"sector_id": 3956,
			"source_clan_id": 9323,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077553,
			"hitpoints": 3,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188024,
			"player_id": 803214,
			"sector_id": 4122,
			"source_clan_id": 11484,
			"target_clan_id": 30785,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078004,
			"hitpoints": 4,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188024,
			"player_id": 800794,
			"sector_id": 4066,
			"source_clan_id": 9323,
			"target_clan_id": 27272,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076963,
			"hitpoints": 7,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188024,
			"player_id": 2024164,
			"sector_id": 4135,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077553,
			"hitpoints": 2,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188024,
			"player_id": 5933688,
			"sector_id": 4122,
			"source_clan_id": 11484,
			"target_clan_id": 30785,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077553,
			"hitpoints": 1,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188024,
			"player_id": 7732998,
			"sector_id": 4122,
			"source_clan_id": 11484,
			"target_clan_id": 30785,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078770,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188024,
			"player_id": 10083035,
			"sector_id": 3927,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078749,
			"hitpoints": 3,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188024,
			"player_id": 4529031,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078770,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188025,
			"player_id": 10071404,
			"sector_id": 3927,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078743,
			"hitpoints": 28,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188024,
			"player_id": 427548,
			"sector_id": 4009,
			"source_clan_id": 10136,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077847,
			"hitpoints": 5,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188025,
			"player_id": 423722,
			"sector_id": 4019,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078836,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188025,
			"player_id": 8472982,
			"sector_id": 4020,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078135,
			"hitpoints": 18,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188025,
			"player_id": 512828,
			"sector_id": 4018,
			"source_clan_id": 9133,
			"target_clan_id": 30549,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077553,
			"hitpoints": 2,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_defeated",
			"timestamp": 1621188025,
			"player_id": 5933688,
			"sector_id": 4122,
			"source_clan_id": 11484,
			"target_clan_id": 30785,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_conquered",
			"timestamp": 1621188025,
			"player_id": 5933688,
			"sector_id": 4122,
			"source_clan_id": 11484,
			"target_clan_id": 30785,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2078770,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188025,
			"player_id": 5269109,
			"sector_id": 3927,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078837,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188025,
			"player_id": 511977,
			"sector_id": 4052,
			"source_clan_id": 9323,
			"target_clan_id": 27272,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078433,
			"hitpoints": 79,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188025,
			"player_id": 423416,
			"sector_id": 4089,
			"source_clan_id": 467,
			"target_clan_id": 6704,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078274,
			"hitpoints": 18,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188026,
			"player_id": 820806,
			"sector_id": 4111,
			"source_clan_id": 467,
			"target_clan_id": 6704,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078773,
			"hitpoints": 3,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188026,
			"player_id": 1371928,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078773,
			"hitpoints": 4,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_defeated",
			"timestamp": 1621188026,
			"player_id": 6183084,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078004,
			"hitpoints": 3,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188026,
			"player_id": 800794,
			"sector_id": 4066,
			"source_clan_id": 9323,
			"target_clan_id": 27272,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076963,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188026,
			"player_id": 2024164,
			"sector_id": 4135,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076963,
			"type": "ClanBattle/defender_low_hp",
			"timestamp": 1621188026,
			"player_id": 2024164,
			"sector_id": 4135,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078770,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188027,
			"player_id": 10071404,
			"sector_id": 3927,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078749,
			"hitpoints": 2,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188027,
			"player_id": 4529031,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077847,
			"hitpoints": 4,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188027,
			"player_id": 423722,
			"sector_id": 4019,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077847,
			"hitpoints": 3,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188027,
			"player_id": 1473126,
			"sector_id": 4019,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078839,
			"hitpoints": 4,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188027,
			"player_id": 807568,
			"sector_id": 3956,
			"source_clan_id": 9323,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078749,
			"hitpoints": 1,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188027,
			"player_id": 8770396,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078840,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188028,
			"player_id": 8432453,
			"sector_id": 4138,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077729,
			"hitpoints": 17,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188028,
			"player_id": 512828,
			"sector_id": 4018,
			"source_clan_id": 9133,
			"target_clan_id": 30549,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076944,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188028,
			"player_id": 587053,
			"sector_id": 4031,
			"source_clan_id": 1654,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076945,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188028,
			"player_id": 5687524,
			"sector_id": 4098,
			"source_clan_id": 11484,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078743,
			"hitpoints": 27,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188028,
			"player_id": 1244937,
			"sector_id": 4009,
			"source_clan_id": 10136,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077832,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188028,
			"player_id": 8404356,
			"sector_id": 4020,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078657,
			"hitpoints": 79,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188028,
			"player_id": 1613507,
			"sector_id": 4060,
			"source_clan_id": 29669,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078770,
			"hitpoints": 10,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_defeated",
			"timestamp": 1621188028,
			"player_id": 5269109,
			"sector_id": 3927,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076963,
			"hitpoints": 5,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188028,
			"player_id": 2024164,
			"sector_id": 4135,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078136,
			"hitpoints": 19,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188028,
			"player_id": 115968,
			"sector_id": 4001,
			"source_clan_id": 9133,
			"target_clan_id": 30549,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078438,
			"hitpoints": 78,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188029,
			"player_id": 423416,
			"sector_id": 4089,
			"source_clan_id": 467,
			"target_clan_id": 6704,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078004,
			"hitpoints": 2,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188029,
			"player_id": 800794,
			"sector_id": 4066,
			"source_clan_id": 9323,
			"target_clan_id": 27272,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078274,
			"hitpoints": 17,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188029,
			"player_id": 820806,
			"sector_id": 4111,
			"source_clan_id": 467,
			"target_clan_id": 6704,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078839,
			"hitpoints": 3,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188029,
			"player_id": 6183084,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077266,
			"hitpoints": 26,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188029,
			"player_id": 427548,
			"sector_id": 4009,
			"source_clan_id": 10136,
			"target_clan_id": 1654,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076874,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188029,
			"player_id": 7732998,
			"sector_id": 4110,
			"source_clan_id": 11484,
			"target_clan_id": 25179,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076874,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188029,
			"player_id": 803214,
			"sector_id": 4110,
			"source_clan_id": 11484,
			"target_clan_id": 25179,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078842,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188030,
			"player_id": 7458293,
			"sector_id": 4149,
			"source_clan_id": 30785,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078749,
			"hitpoints": 2,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_defeated",
			"timestamp": 1621188030,
			"player_id": 8770396,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"type": "ClanBattle/sector_conquered",
			"timestamp": 1621188030,
			"player_id": 8770396,
			"sector_id": 3974,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleSectorChange"
		},
		{
			"army_id": 2076945,
			"hitpoints": 7,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188030,
			"player_id": 7457766,
			"sector_id": 4098,
			"source_clan_id": 11484,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077831,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188030,
			"player_id": 2960343,
			"sector_id": 4037,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077847,
			"hitpoints": 2,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188030,
			"player_id": 423722,
			"sector_id": 4019,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077729,
			"hitpoints": 16,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188030,
			"player_id": 512828,
			"sector_id": 4018,
			"source_clan_id": 9133,
			"target_clan_id": 30549,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078181,
			"hitpoints": 3,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188030,
			"player_id": 807568,
			"sector_id": 3956,
			"source_clan_id": 9323,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078846,
			"hitpoints": 10,
			"hitpoint_change": 10,
			"type": "ClanBattle/siege_deployed",
			"timestamp": 1621188031,
			"player_id": 10083035,
			"sector_id": 3927,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078839,
			"hitpoints": 2,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188031,
			"player_id": 1371928,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076944,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188031,
			"player_id": 587053,
			"sector_id": 4031,
			"source_clan_id": 1654,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076963,
			"hitpoints": 4,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188031,
			"player_id": 2024164,
			"sector_id": 4135,
			"source_clan_id": 28563,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077832,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188031,
			"player_id": 8472982,
			"sector_id": 4020,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076945,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188031,
			"player_id": 5687524,
			"sector_id": 4098,
			"source_clan_id": 11484,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076945,
			"type": "ClanBattle/defender_low_hp",
			"timestamp": 1621188031,
			"player_id": 5687524,
			"sector_id": 4098,
			"source_clan_id": 11484,
			"target_clan_id": 467,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077847,
			"hitpoints": 1,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188031,
			"player_id": 1473126,
			"sector_id": 4019,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078839,
			"hitpoints": 2,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188032,
			"player_id": 6183084,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077201,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188032,
			"player_id": 587212,
			"sector_id": 3993,
			"source_clan_id": 1654,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078274,
			"hitpoints": 16,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188032,
			"player_id": 585359,
			"sector_id": 4111,
			"source_clan_id": 467,
			"target_clan_id": 6704,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078274,
			"type": "ClanBattle/defender_low_hp",
			"timestamp": 1621188032,
			"player_id": 585359,
			"sector_id": 4111,
			"source_clan_id": 467,
			"target_clan_id": 6704,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078611,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188032,
			"player_id": 10071404,
			"sector_id": 3927,
			"source_clan_id": 20227,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076874,
			"hitpoints": 7,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188032,
			"player_id": 5933688,
			"sector_id": 4110,
			"source_clan_id": 11484,
			"target_clan_id": 25179,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076929,
			"hitpoints": 9,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188032,
			"player_id": 7458293,
			"sector_id": 4149,
			"source_clan_id": 30785,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078181,
			"hitpoints": 2,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188032,
			"player_id": 807568,
			"sector_id": 3956,
			"source_clan_id": 9323,
			"target_clan_id": -27,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078004,
			"hitpoints": 1,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188032,
			"player_id": 800794,
			"sector_id": 4066,
			"source_clan_id": 9323,
			"target_clan_id": 27272,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076874,
			"hitpoints": 6,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188032,
			"player_id": 803214,
			"sector_id": 4110,
			"source_clan_id": 11484,
			"target_clan_id": 25179,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2076874,
			"type": "ClanBattle/defender_low_hp",
			"timestamp": 1621188032,
			"player_id": 803214,
			"sector_id": 4110,
			"source_clan_id": 11484,
			"target_clan_id": 25179,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2077831,
			"hitpoints": 8,
			"hitpoint_change": -1,
			"type": "ClanBattle/defender_damaged",
			"timestamp": 1621188032,
			"player_id": 8404356,
			"sector_id": 4037,
			"source_clan_id": 9133,
			"target_clan_id": 29538,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078839,
			"hitpoints": 1,
			"hitpoint_change": -1,
			"type": "ClanBattle/siege_damaged",
			"timestamp": 1621188032,
			"player_id": 8770396,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
		{
			"army_id": 2078839,
			"type": "ClanBattle/siege_low_hp",
			"timestamp": 1621188032,
			"player_id": 8770396,
			"sector_id": 3956,
			"source_clan_id": 20227,
			"target_clan_id": 9323,
			"__class__": "ClanBattleArmyChange"
		},
	],

	addEntry: (response) => {
		if (response != undefined) {
			let type = response.type.replace('ClanBattle/','');
			if (response.__class__ == "ClanBattleArmyChange" && type != "defender_low_hp" && type != "siege_low_hp") {
				entry = {
					type: type,
					timestamp: response.timestamp,
					sectorId: response.sector_id,
					sourceClan: response.source_clan_id,
					targetClan: response.target_clan_id,
					hitpoints: response.hitpoints
				}
			}
			if (entry != null)
				GvGLog.Entries.push(entry);
			//GvGLog.Entries.push(response);
		}
	},

	testData: () => {
		let entry = null;
		GvGLog.DummyData.forEach(function (data) {
			let type = data.type.replace('ClanBattle/','');
			if (data.__class__ == "ClanBattleArmyChange" && type != "defender_low_hp" && type != "siege_low_hp") {
				entry = {
					type: type,
					timestamp: data.timestamp,
					sectorId: data.sector_id,
					sourceClan: data.source_clan_id,
					targetClan: data.target_clan_id,
					hitpoints: data.hitpoints
				}
			}
			if (entry != null)
				GvGLog.Entries.push(entry);
		});
	},

	show: () => {
        let t = [];

		t.push('<table id="GvGlog" class="foe-table">');
		t.push('<thead><tr>');
		t.push('<th>Sector</th>');
		t.push('<th>Info</th>');
		t.push('</tr></thead>');

		GvGLog.Entries.forEach(function(entry) {
			let sector = MapSector.findById(entry.sectorId);
			if (sector != undefined) { // if sector is on map
				let sectorCoords = MapSector.coords(sector);
				let targetClan = (GvGMap.findGuildById(entry.targetClan) != undefined) ? GvGMap.findGuildById(entry.targetClan).name : "NPC";
				let sourceClan = (GvGMap.findGuildById(entry.sourceClan) != undefined) ? GvGMap.findGuildById(entry.sourceClan).name : "Unbekannte Gilde";
				t.push('<tr id="log-id-'+entry.sourceClan+'">');
				t.push('<td><b class="text-bright">'+sectorCoords+'</b><br>'+moment.unix(entry.timestamp).format('HH:mm:ss')+'</td>');
				t.push('<td>');
					if (entry.sourceClan != entry.targetClan && entry.targetClan != undefined && entry.sourceClan != undefined)
						t.push(sourceClan +' → '+ targetClan);
					else if (sourceClan != undefined)
						t.push(sourceClan);
					t.push('<br>'+entry.type);
					//t.push(', HP: '+entry.hitpoints);
				t.push('</td>');
				t.push('</tr>');
			}
		});
		t.push('</table>');

		GvGMap.SetTabContent('gvgmaplog', t.join(''));
	}
}

let MapSector = {
	create: (x, y, info) => {
		//console.log(info.sector_id, info.terrain);
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
		let color = {};
		if (sector.terrain == "beach") {
			color = {"r":233,"g":233,"b":114-(parseInt(sector.power)+1)*10};
			console.log('beach', color);
		}
		else if (sector.terrain == "plain") {
			color = {"r":126-(parseInt(sector.power)+1)*10,"g":222-(parseInt(sector.power)+1)*10,"b":110-(parseInt(sector.power)+1)*10};
			console.log('plain', color);
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
	draw: (sector) => {
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
				if (sector.headquarter)
					GvGMap.CanvasCTX.drawImage(img, imgPositions.hqX, imgPositions.hqY, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);
				if (sector.isProtected)
					GvGMap.CanvasCTX.drawImage(img, imgPositions.shieldX, imgPositions.shieldY, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight, sector.position.x, sector.position.y, GvGMap.Map.HexWidth, GvGMap.Map.HexHeight);

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
	 * Redraw
	 */
	redraw: (sector) => {
		MapSector.drawHex(sector);
		MapSector.drawHexText(sector);
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