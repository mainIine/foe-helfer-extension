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
		GvG.InitActions();
	}
	GvG.SetRecalc(data.responseData.continent.calculation_time.start_time, true);
});

FoEproxy.addHandler('ClanBattleService', 'getProvinceDetailed', (data, postData) => {
	console.log("Entered Province", data.responseData.province_detailed.era);
	
	GvGProvince.MapData = data['responseData'];
	GvGProvince.MapDataTime = MainParser.getCurrentDateTime();
});

FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
	GvG.HideGvgHud();
});

let GvG = {
	Actions: undefined,
	Init: false,

	InitActions: () => {
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
	ShowGvgHud: () => {
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
					.append('<button class="btn-default mapbutton" onclick="GvGProvince.ShowGvgMap()">MAP</button>');
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
			GvG.ResetData();
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
		GvG.ShowGvgHud();
		
		localStorage.setItem('GvGActions', JSON.stringify(GvG.Actions));
	},
 
    /**
	 * Set Recalc time
	 * @param calcTime
	 */
	 SetRecalc: (calcTime) => {
		let time = Math.ceil(MainParser.getCurrentDateTime()/1000); 

		if (GvG.Actions.NextCalc != calcTime) {
			GvG.Actions.NextCalc = calcTime;
			/*if ((time-20) < calcTime) { // when switching maps via overview during recalc
				console.log('Reset during Recalc');
				GvG.ResetData(calcTime);
			}*/
		}

		if (GvG.Actions.PrevCalc == 0) {
			GvG.Actions.PrevCalc = (calcTime-86400);
		}

		if (GvG.Actions.LastAction < GvG.Actions.PrevCalc && GvG.Actions.LastAction != 0) {
			console.log('GvG.Actions.LastAction < GvG.Actions.PrevCalc');
			GvG.ResetData(calcTime);
		}

		localStorage.setItem('GvGActions', JSON.stringify(GvG.Actions));
		console.log("SetRecalc", GvG.Actions);
		GvG.ShowGvgHud();
	},

    /**
	 * Reset all Data
	 */
	ResetData: (calcTime = 0) => {
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

let GvGProvince = {
	
	Map: {},
	MapData: {},
	MapDataTime: 0,
	MapCTX: {},

	Mouse: {
		x: undefined,
		y: undefined
	},

	HexWidth: 50,
	HexHeight: 40,

	Sectors: [],
	Guilds: [],
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

	Era: "",
	CurrentGuild: {"color": {"r":240,"g":240,"b":240}},
    NoGuild: {"color": {"r":240,"g":240,"b":240}},

	/**
	 * Build GvG Map
	 */
	ShowGvgMap: () => {
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

			GvGProvince.BuildMap();
		}
	},

    /**
	 * Hide HUD
	 */
	HideGvgMap: () => {
		if ($('#GvGMap').length > 0) {
			$('#GvGMap').remove();
			$('#gvg-map').remove();
		}
	},

	BuildMap: () => {

		GvGProvince.PowerValues = GvGProvince.MapData.province_detailed.power_values;
		let h = [];
        h.push('<div id="GvGMapInfo"></div><div id="GvGMapWrap"><canvas id="gvg-map"></canvas></div><div id="GvGMapGuilds"></div>');
		$('#GvGMapBody').html(h.join(''));

		GvGProvince.Map = document.getElementById("gvg-map");
		GvGProvince.MapCTX = GvGProvince.Map.getContext('2d');
		GvGProvince.Guilds = [];
		GvGProvince.Sectors = [];
		let provinceData = GvGProvince.MapData.province_detailed;
		let guildData = GvGProvince.MapData.province_detailed.clans;
		let bounds = GvGProvince.MapData.province_detailed.bounds;
		let width = (provinceData.bounds.x_max - provinceData.bounds.x_min)*GvGProvince.HexWidth+GvGProvince.HexWidth/2;
		let height = (provinceData.bounds.y_max - provinceData.bounds.y_min)*GvGProvince.HexHeight*0.8;

		$(GvGProvince.Map).attr({
			'id': 'gvg-map',
            'width': width,
            'height': height
        });
		
		GvGProvince.MapCTX.clearRect(0, 0, width, height);

        guildData.forEach(function (guild) {
			let guildOnMap = {
				id: guild.id,
				name: guild.name,
				flag: guild.flag,
				color: GvGProvince.GetColor(guild),
				flagCoordinates: GvGProvince.FlagImageCoordinates(guild.flag),
				power: 0,
				sectors: 0,
			};
			GvGProvince.Guilds.push(guildOnMap);
        });

        provinceData.sectors.forEach(function (sector) {
            if ((sector.terrain == 'plain' || sector.terrain == 'beach') && sector.hitpoints != undefined) {
                let realX = (sector.position.x - bounds.x_min) * GvGProvince.HexWidth;
                let realY = (sector.position.y - bounds.y_min) * GvGProvince.HexHeight;
				let newSector = {};

				if (sector.position.y % 2 == 0) {
					newSector = new Sector(realX, realY * 0.75, sector);
				}
				else {
					newSector = new Sector(realX + (GvGProvince.HexWidth * 0.5), realY * 0.75, sector);
				}
				GvGProvince.Sectors.push(newSector);
				
				let guild = newSector.findOwnerById(newSector.owner.id);
				if (guild != undefined) {
					guild.power += newSector.power;
					guild.sectors++;
				}
				newSector.draw();
			}
        });

		GvGProvince.MapCTX.font = "bold 22px Arial";
		GvGProvince.MapCTX.textAlign = "left";
		GvGProvince.MapCTX.fillStyle = '#ddd';
		GvGProvince.MapCTX.fillText(provinceData.era, 10, 25);
		GvGProvince.MapCTX.font = "12px Arial";
		GvGProvince.MapCTX.fillText(moment(GvGProvince.MapDataTime).format('D.M.YY - HH:mm:ss'), 10, 45);

		GvGProvince.BuildGuilds();

        GvGProvince.Map.addEventListener("mousedown", function (e) {
			let currentSector = GvGProvince.setSector(e);
        }, false);
	},

	setSector: (e) => {
        GvGProvince.Sectors.forEach(function (sector) {
            if (e.offsetX >= (sector.position.x + 5) && e.offsetX <= (sector.position.x + GvGProvince.HexWidth - 5)) {
                if (e.offsetY >= (sector.position.y + 5) && e.offsetY <= (sector.position.y + GvGProvince.HexHeight - 5)) {
					GvGProvince.ShowSector(sector);
                    return sector;
                }
            }
        });
		return undefined;
    },

	ShowSector: (sector) => {
		let html = '<div class="sectorInfo">';
		html += '<span class="guildflag '+sector.owner.flag+'" style="background-color: '+GvGProvince.ColorStringify(sector.owner.color)+';border-color: '+GvGProvince.ColorStringify(sector.owner.color)+'"></span>';
		html += '<b class="text-bright">'+ sector.owner.name +'</b><br>';
		html += 'Coords: '+ sector.coords() +'<br>';
		html += 'Power: '+ sector.power +'<br>';
		html += 'Protected: '+ sector.isProtected +'<br>';
		html += 'Beach: '+ sector.beach +'<br>';
		html += '</div>';
		document.getElementById("GvGMapInfo").innerHTML = html;
    },

	BuildGuilds: () => {
        let t = [];

        GvGProvince.Guilds.sort(function(a, b) {
            if (a.power > b.power)
                return -1;
            if (a.power < b.power)
                return 1;
            return 0;
        });

		t.push('<table class="foe-table">');
		t.push('<thead><tr>');
		t.push('<th>Name</th>');
		t.push('<th>Sectors</th>');
		t.push('<th>Power</th>');
		t.push('</tr></thead>');
		GvGProvince.Guilds.forEach(function (guild) {
			t.push('<tr>');
			t.push('<td><span class="guildflag '+guild.flag+'" style="background-color: '+GvGProvince.ColorStringify(guild.color)+'"></span>'+guild.name+'</td>');
			t.push('<td class="text-center">'+guild.sectors+'</td>');
			t.push('<td class="text-center">'+guild.power+'</td>');
			t.push('</tr>');
		});
		t.push('</table>');

		$('#GvGMapGuilds').html(t.join(''));
	},

	GetColor: (guild) => {
        flag = guild.flag.split("_") || null;
        let color = {"r":255,"g":255,"b":255};

        if (flag != null)  {
            if (flag[0].search("premium") >= 0) {
                color = GvGProvince.Colors.premium[flag[flag.length-1]-1];
			}
            else if (flag[flag.length - 1].toLowerCase() == "r") {
                color = GvGProvince.Colors.r[Math.round(guild.id/13)%13];
			}
            else if (flag[flag.length - 1].toLowerCase() == "g")
                color = GvGProvince.Colors.g[Math.round(guild.id/13)%13];
            else
				if (flag.length != 1)
					color = GvGProvince.Colors.b[Math.round(guild.id/13)%13];

        }

        return color;
    },

	FlagImageCoordinates: (flag) => {
        let id = flag.split("_");

        if (id[id.length - 1].toLowerCase() == "r" || id[id.length - 1].toLowerCase() == "g")
            id = parseInt(id[id.length - 2]);
        else
            id = parseInt(id[id.length - 1]);

        if (flag.search("premium") >= 0)
            id += 40;

        return {"x": (id % 10 ) * (GvGProvince.HexWidth), "y": Math.floor(id / 10) * (GvGProvince.HexHeight)};
    },

	ColorStringify: (color) => {
		return "rgb("+color.r+","+color.g+","+color.b+")";
	},
}

class Sector {

	constructor(x, y, info) {
		this.position = {
			"x": x,
			"y": y
		};
		this.coordinates = {
			"x": info.position.x,
			"y": info.position.y
		};
		this.power = parseInt(GvGProvince.PowerValues[info.power]) || GvGProvince.PowerValues[0];
		this.powerMultiplicator = parseInt(info.power)+1 || 1;
		this.isProtected = info.is_protected;
		this.owner = this.findOwnerById(info.owner_id) || { id: 0 };
		this.headquarter = (info.building != null);
		this.beach = (info.terrain == "beach");
	}

	findOwnerById(id) {
		let guild = GvGProvince.Guilds.find(x => x.id  === id);
		return guild;
	}

	might() {
		return this.power;
	}

	draw() {
		this.drawHex();
		this.drawHexText();
		if (this.owner.id > 0) {
			let flag = this.owner.flagCoordinates;

			let img = new Image();
			img.src = 'https://tools.kingshood.de/gvg/img/flags_small.png';

			let sector = this;
			img.onload = function () {

				if (sector.headquarter)
					GvGProvince.MapCTX.drawImage(img, 450, 200, GvGProvince.HexWidth, GvGProvince.HexHeight, sector.position.x, sector.position.y, GvGProvince.HexWidth, GvGProvince.HexHeight);
				if (sector.isProtected)
					GvGProvince.MapCTX.drawImage(img, 400, 200, GvGProvince.HexWidth, GvGProvince.HexHeight, sector.position.x, sector.position.y, GvGProvince.HexWidth, GvGProvince.HexHeight);

				GvGProvince.MapCTX.drawImage(img, flag.x, flag.y, GvGProvince.HexWidth, GvGProvince.HexHeight, sector.position.x, sector.position.y-5, GvGProvince.HexWidth, GvGProvince.HexHeight);

			}
		}
	}

	redraw() {
		this.drawHex();
		this.drawHexText();
	}

	drawHex() {
		if (this.beach && this.owner.id < 0) {
			this.owner.color = {"r":233,"g":233,"b":114-this.powerMultiplicator*10};
		}
		else if (this.owner.id < 0) {
			this.owner.color = {"r":126-this.powerMultiplicator*10,"g":222-this.powerMultiplicator*10,"b":110-this.powerMultiplicator*10};
		}
		else if (this.owner.id == 0) {
			this.owner.color = {"r":this.owner.id%255,"g":(this.owner.id+100)%255,"b":this.owner.id%120+100};
		}

		GvGProvince.MapCTX.fillStyle = GvGProvince.ColorStringify(this.owner.color);
		GvGProvince.MapCTX.beginPath();
		GvGProvince.MapCTX.moveTo(this.position.x + GvGProvince.HexWidth / 2, this.position.y);
		GvGProvince.MapCTX.lineTo(this.position.x + GvGProvince.HexWidth, this.position.y + GvGProvince.HexHeight * 0.25);
		GvGProvince.MapCTX.lineTo(this.position.x + GvGProvince.HexWidth, this.position.y + GvGProvince.HexHeight * 0.75);
		GvGProvince.MapCTX.lineTo(this.position.x + GvGProvince.HexWidth / 2, this.position.y + GvGProvince.HexHeight);
		GvGProvince.MapCTX.lineTo(this.position.x, this.position.y + GvGProvince.HexHeight * 0.75);
		GvGProvince.MapCTX.lineTo(this.position.x, this.position.y + GvGProvince.HexHeight * 0.25);
		GvGProvince.MapCTX.closePath();
		GvGProvince.MapCTX.fill();
		GvGProvince.MapCTX.strokeStyle = "rgba(0,0,0,0.2)";
		GvGProvince.MapCTX.stroke();
	}

	drawHexText() {
		GvGProvince.MapCTX.font = "9px Arial";
		GvGProvince.MapCTX.textAlign = "center";
		GvGProvince.MapCTX.fillStyle = ((this.owner.color.r+this.owner.color.g+this.owner.color.b) < 400) ? '#ddd':'#222';
		//GvGProvince.MapCTX.fillText(this.might(), this.position.x + GvGProvince.HexWidth / 2, this.position.y + GvGProvince.HexHeight * 0.3);
		GvGProvince.MapCTX.fillText(this.coords(), this.position.x + GvGProvince.HexWidth / 2, this.position.y + GvGProvince.HexHeight * 0.8);
	}

	coords() {
		if (this.beach)
			return "~"+this.coordinates.x + ", " + this.coordinates.y+"~";
		GvGProvince.MapCTX.font = "bold 10px Arial";
		return this.coordinates.x + ", " + this.coordinates.y;
	}
}