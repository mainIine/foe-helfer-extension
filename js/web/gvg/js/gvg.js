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
	GvGMap.MapData = data['responseData'];
	GvGMap.MapDataTime = MainParser.getCurrentDateTime();
});

FoEproxy.addWsHandler('ClanBattleService', 'changeProvince', (data, postData) => {	
	console.log(data['responseData']);
});

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
		console.log("setRecalc", GvG.Actions);
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
	
	MapData: {},
	MapDataTime: 0,
	Map: {},
	MapCTX: {},

	Actions: {
		edit: false,
		drag: true
	},

	Width: 0,
	Height: 0,
	HexWidth: 50,
	HexHeight: 40,
	CurrentGuild: {
		id: 0
	},

	Sectors: [],
	Guilds: [],
	PowerValues: [],
	ProvinceData: {},
	GuildData: {},

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

	Era: "",
	CurrentGuild: {"color": {"r":240,"g":240,"b":240}},
    NoGuild: {"color": {"r":240,"g":240,"b":240}},

	initMap: (hexWidth, hexHeight) => {
		GvGMap.Map = document.getElementById("gvg-map");
		GvGMap.MapCTX = GvGMap.Map.getContext('2d');
		GvGMap.Guilds = [];
		GvGMap.Sectors = [];
		GvGMap.ProvinceData = GvGMap.MapData.province_detailed;
		GvGMap.GuildData = GvGMap.MapData.province_detailed.clans;
		GvGMap.PowerValues = GvGMap.MapData.province_detailed.power_values;
		GvGMap.Size = 'small';
		GvGMap.HexWidth = hexWidth;
		GvGMap.HexHeight = hexHeight;
		GvGMap.Width = (GvGMap.ProvinceData.bounds.x_max - GvGMap.ProvinceData.bounds.x_min)*GvGMap.HexWidth+GvGMap.HexWidth/2;
		GvGMap.Height = (GvGMap.ProvinceData.bounds.y_max - GvGMap.ProvinceData.bounds.y_min)*GvGMap.HexHeight*0.8;
		GvGMap.CurrentGuild = { id: 0 };
	},

	/**
	 * Build GvG Map
	 */
	showMap: () => {
		if ($('#gvg-map').length == 0) {

			moment.locale(MainParser.Language);

			HTML.Box({
				id: 'GvGMap',
				title: 'GvG (BETA!)',
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true
			});

			GvGMap.buildMap();
		}
	},

    /**
	 * Hide HUD
	 */
	hideMap: () => {
		if ($('#GvGMap').length > 0) {
			$('#GvGMap').remove();
			$('#gvg-map').remove();
		}
	},

	buildMap: (mapSize = 'small') => {
		let h = [];
        h.push('<div id="GvGMapInfo"></div><div id="GvGMapActions" class="btn-group"><span id="editMap" class="btn-default">Edit</span><span id="zoomMap" class="btn-default">Zoom</span><span id="dragMap" class="btn-default active">Drag</span></div><div id="GvGMapWrap"><canvas id="gvg-map"></canvas></div><div id="GvGMapGuilds"></div>');
		$('#GvGMapBody').html(h.join(''));

		// reset all data to default;
		if (mapSize != 'small') {
			GvGMap.initMap(90,72);
			GvGMap.Size = 'big';
		}
		else {
			GvGMap.initMap(50,40);
		}

		$(GvGMap.Map).attr({
			'id': 'gvg-map',
            'width': GvGMap.Width,
            'height': GvGMap.Height
        });
		
		GvGMap.MapCTX.clearRect(0, 0, GvGMap.Width, GvGMap.Height);

        GvGMap.GuildData.forEach(function (guild) {
			let guildOnMap = {
				id: guild.id,
				name: guild.name,
				flag: guild.flag,
				color: GvGMap.getColor(guild),
				flagCoordinates: GvGMap.getFlagImageCoordinates(guild.flag),
				power: 0,
				sectors: 0,
			};
			GvGMap.Guilds.push(guildOnMap);
        });

        GvGMap.ProvinceData.sectors.forEach(function (sector) {
            if (sector.hitpoints != undefined) {
                let realX = (sector.position.x - GvGMap.ProvinceData.bounds.x_min) * GvGMap.HexWidth;
                let realY = (sector.position.y - GvGMap.ProvinceData.bounds.y_min) * GvGMap.HexHeight;
				let newSector = {};

				if (sector.position.y % 2 == 0) {
					newSector = new Sector(realX, realY * 0.75, sector);
				}
				else {
					newSector = new Sector(realX + (GvGMap.HexWidth * 0.5), realY * 0.75, sector);
				}
				GvGMap.Sectors.push(newSector);
				
				let guild = newSector.findOwnerById(newSector.owner.id);
				if (guild != undefined) {
					guild.power += newSector.power;
					guild.sectors++;
				}
				newSector.draw();
			}
        });

		GvGMap.drawInfo();
		GvGMap.buildGuilds();

		let editBtn = document.getElementById("editMap");
		let dragBtn = document.getElementById("dragMap");
		let zoomBtn = document.getElementById("zoomMap");

        editBtn.addEventListener('click', function (e) {
            GvGMap.Actions.edit = true;
			GvGMap.Actions.drag = false;
			dragBtn.classList.remove('btn-default-active');
			editBtn.classList.add('btn-default-active');
            GvGMap.buildMap('big');
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
	},

	drawInfo: () => {
		GvGMap.MapCTX.font = "bold 22px Arial";
		GvGMap.MapCTX.textAlign = "left";
		GvGMap.MapCTX.fillStyle = '#ffb539';
		GvGMap.MapCTX.fillText(GvGMap.ProvinceData.era, 10, 25);
		GvGMap.MapCTX.font = "12px Arial";
		GvGMap.MapCTX.fillStyle = '#ccc';
		GvGMap.MapCTX.fillText('Data fetched: '+ moment(GvGMap.MapDataTime).format('D.M.YY - HH:mm:ss'), 10, 45);
	},

	setCurrentGuild: () => {
        $('#GvGGuilds tr').click(function (e) {
			let id = $(this).attr('id').replace('id-', '')/1;
			$('#GvGGuilds tr').removeClass('active');
			$(this).addClass('active');
			
			GvGMap.CurrentGuild = GvGMap.Guilds.find(x => x.id  === id);
        });
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

        GvGMap.Map.addEventListener('mousedown', function (e) {
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
        GvGMap.Sectors.forEach(function (sector) {
            if (e.offsetX >= (sector.position.x + 5) && e.offsetX <= (sector.position.x + GvGMap.HexWidth - 5)) {
                if (e.offsetY >= (sector.position.y + 5) && e.offsetY <= (sector.position.y + GvGMap.HexHeight - 5)) {
					if (GvGMap.Actions.drag) {
						GvGMap.showSector(sector);
					}
					else {
						let prevOwner = sector.owner;
						sector.owner = GvGMap.CurrentGuild;
						if (sector.owner.id == 0)
							sector.owner.color = sector.setColorByTerrain();
						if (sector.terrain == "plain" || sector.terrain == "beach") {
							sector.draw();
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
			if (sector.underSiege())
				html += 'Under Siege by: '+ sector.underSiege() +'<br>';
			html += 'Hitpoints: '+ sector.hitpoints +'/80<br>';
			html += 'Coords: '+ sector.coords() +'<br>';
			html += 'Power: '+ sector.power +'<br>';
			if (sector.isProtected)
				html += 'Sector is protected<br>';
			html += 'Terrain: '+ sector.terrain +'<br>';
			html += '</div>';
		}
		document.getElementById("GvGMapInfo").innerHTML = html;
    },

	buildGuilds: () => {
        let t = [];

        GvGMap.Guilds.sort(function(a, b) {
            if (a.power > b.power)
                return -1;
            if (a.power < b.power)
                return 1;
            return 0;
        });

		t.push('<table id="GvGGuilds" class="foe-table">');
		t.push('<thead><tr>');
		t.push('<th>Name</th>');
		t.push('<th>Sectors</th>');
		t.push('<th>Power</th>');
		t.push('</tr></thead>');
		GvGMap.Guilds.forEach(function (guild) {
			t.push('<tr id="id-'+guild.id+'">');
			t.push('<td><span class="guildflag '+guild.flag+'" style="background-color: '+GvGMap.colorToString(guild.color)+'"></span>'+guild.name+'</td>');
			t.push('<td class="text-center">'+guild.sectors+'</td>');
			t.push('<td class="text-center">'+guild.power+'</td>');
			t.push('</tr>');
		});
		t.push('</table>');

		$('#GvGMapGuilds').html(t.join(''));
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

        return {"x": (id % 10 ) * (GvGMap.HexWidth), "y": Math.floor(id / 10) * (GvGMap.HexHeight)};
    },

	colorToString: (color) => {
		return "rgb("+color.r+","+color.g+","+color.b+")";
	},
}

class Sector {
	constructor(x, y, info) {
		this.id = info.sector_id;
		this.position = {
			"x": x,
			"y": y
		};
		this.coordinates = {
			"x": info.position.x,
			"y": info.position.y
		};
		this.power = parseInt(GvGMap.PowerValues[info.power]) || GvGMap.PowerValues[0];
		this.powerMultiplicator = parseInt(info.power)+1 || 1;
		this.isProtected = info.is_protected;
		this.terrain = info.terrain;
		this.headquarter = (info.building != null);
		this.hitpoints = info.hitpoints;
		this.owner = this.findOwnerById(info.owner_id) || { id: 0, color: this.setColorByTerrain() };
		this.siege = {
			"clan": info.siege_clan_id || 0,
		};
	}

	findOwnerById(id) {
		let guild = GvGMap.Guilds.find(x => x.id  === id);
		return guild;
	}

	underSiege() {
		if (this.siege.clan != 0)
			return GvGMap.Guilds.find(x => x.id  === this.siege.clan).name;
		return false;
	}

	setColorByTerrain() {
		let color = {};
		if (this.terrain == "beach") {
			color = {"r":233,"g":233,"b":114-this.powerMultiplicator*10};
		}
		else if (this.terrain == "plain") {
			color = {"r":126-this.powerMultiplicator*10,"g":222-this.powerMultiplicator*10,"b":110-this.powerMultiplicator*10};
		}
		else {
			if (this.terrain == "rocks")
				color = {"r":50,"g":50,"b":50};
			if (this.terrain == "water")
				color = {"r":4,"g":28,"b":45};
		}
		return color;
	}

	/**
	 * Draws a sector on the map + flag and HQ/status if it has an owner
	 */
	draw() {
		this.drawHex();
		this.drawHexText();
		if (this.owner.id > 0) {
			let flag = this.owner.flagCoordinates;
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

			let sector = this;
			img.onload = function () {
				if (sector.headquarter)
					GvGMap.MapCTX.drawImage(img, imgPositions.hqX, imgPositions.hqY, GvGMap.HexWidth, GvGMap.HexHeight, sector.position.x, sector.position.y, GvGMap.HexWidth, GvGMap.HexHeight);
				if (sector.isProtected)
					GvGMap.MapCTX.drawImage(img, imgPositions.shieldX, imgPositions.shieldY, GvGMap.HexWidth, GvGMap.HexHeight, sector.position.x, sector.position.y, GvGMap.HexWidth, GvGMap.HexHeight);

				if (GvGMap.Size != 'small') {
					GvGMap.MapCTX.drawImage(img, flag.x, flag.y, GvGMap.HexWidth, GvGMap.HexHeight, sector.position.x, sector.position.y, GvGMap.HexWidth, GvGMap.HexHeight);
				}
				else {
					GvGMap.MapCTX.drawImage(img, flag.x, flag.y, GvGMap.HexWidth, GvGMap.HexHeight, sector.position.x, sector.position.y-5, GvGMap.HexWidth, GvGMap.HexHeight);
				}
			}
		}
	}

	/**
	 * Redraw
	 */
	redraw() {
		this.drawHex();
		this.drawHexText();
	}

	/**
	 * Draws Sector hexagon in its color
	 */
	drawHex() {
		GvGMap.MapCTX.fillStyle = GvGMap.colorToString(this.owner.color);
		GvGMap.MapCTX.beginPath();
		GvGMap.MapCTX.moveTo(this.position.x + GvGMap.HexWidth / 2, this.position.y);
		GvGMap.MapCTX.lineTo(this.position.x + GvGMap.HexWidth, this.position.y + GvGMap.HexHeight * 0.25);
		GvGMap.MapCTX.lineTo(this.position.x + GvGMap.HexWidth, this.position.y + GvGMap.HexHeight * 0.75);
		GvGMap.MapCTX.lineTo(this.position.x + GvGMap.HexWidth / 2, this.position.y + GvGMap.HexHeight);
		GvGMap.MapCTX.lineTo(this.position.x, this.position.y + GvGMap.HexHeight * 0.75);
		GvGMap.MapCTX.lineTo(this.position.x, this.position.y + GvGMap.HexHeight * 0.25);
		GvGMap.MapCTX.closePath();
		GvGMap.MapCTX.fill();
		GvGMap.MapCTX.strokeStyle = "rgba(0,0,0,0.2)";
		GvGMap.MapCTX.stroke();
	}

	/**
	 * Draws Sector coordinates (and power)
	 */
	drawHexText() {
		GvGMap.MapCTX.font = "9px Arial";
		if (GvGMap.Size == 'big')
			GvGMap.MapCTX.font = "12px Arial";
		GvGMap.MapCTX.textAlign = "center";
		GvGMap.MapCTX.fillStyle = ((this.owner.color.r+this.owner.color.g+this.owner.color.b) < 300) ? '#ddd' : '#222';
		GvGMap.MapCTX.fillText(this.coords(), this.position.x + GvGMap.HexWidth / 2, this.position.y + GvGMap.HexHeight * 0.85);
		if (GvGMap.Size == 'big' && this.terrain != "water" && this.terrain != "rocks")
			GvGMap.MapCTX.fillText(this.power, this.position.x + GvGMap.HexWidth / 2, this.position.y + GvGMap.HexHeight * 0.25);
	}

	/**
	 * Returns Sectors coordinates (with ~ if beach)
	 */
	coords() {
		if (this.terrain == "beach")
			return "~"+this.coordinates.x + ", " + this.coordinates.y+"~";
		if (this.terrain == "plain")
			return this.coordinates.x + ", " + this.coordinates.y;
		return "";
	}
}