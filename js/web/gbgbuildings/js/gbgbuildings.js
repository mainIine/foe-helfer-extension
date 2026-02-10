/*
 *
 *  * **************************************************************************************
 *  * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
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


FoEproxy.addHandler('GuildBattlegroundBuildingService', 'getBuildings', (data, postData) => {
	if (!Settings.GetSetting('ShowGBGBuildings')) return;

	GBGBuildings.costs={};
	data.responseData.availableBuildings.forEach(x => GBGBuildings.costs[x.buildingId] = x.costs.resources);
	GBGBuildings.buildings = data.responseData.placedBuildings.map(x=>x.id).sort((a,b)=> (GBGBuildings.block[b]||0) - (GBGBuildings.block[a]||0));
	let free=data.responseData.freeSlots||0;
	
	for (let i=0;i<free;i++) {
		GBGBuildings.buildings.push("free")
	}

	if (GBGBuildings.Timeout.T) {
		GBGBuildings.calc()
		return
	}
	
	GBGBuildings.Timeout.B = setTimeout(() => {
		GBGBuildings.clearTO("B")
	}, 500);
});

FoEproxy.addMetaHandler('battleground_buildings',(data,postData) => {
	GBGBuildings.BuildingData = Object.assign({}, ...JSON.parse(data.responseText).map((x) => ({ [x.id]: x })));
});

FoEproxy.addHandler('ClanService', 'getTreasury', (data, postData) => {
	if (data.responseData.resources) GBGBuildings.treasury = data.responseData.resources
	if (GBGBuildings.Timeout.B) {
		GBGBuildings.calc()
		return
	}
	
	GBGBuildings.Timeout.T = setTimeout(() => {
		GBGBuildings.clearTO("T")
	}, 350);
});
FoEproxy.addHandler('ClanService', 'getTreasuryBag', (data, postData) => {
	if (data.responseData?.type?.value && data.responseData?.type?.value != 'ClanMain') return; // for now ignore all other source types
	if (data.responseData.resources) GBGBuildings.treasury = data.responseData.resources.resources
	if (GBGBuildings.Timeout.B) {
		GBGBuildings.calc()
		return
	}
	
	GBGBuildings.Timeout.T = setTimeout(() => {
		GBGBuildings.clearTO("T")
	}, 350);
});

FoEproxy.addHandler("BattlefieldService","getArmyPreview",(data)=>{
	$('#GBGBuildings').remove();
})
FoEproxy.addHandler("GuildBattlegroundService","startNegotiation",(data)=>{
	$('#GBGBuildings').remove();
})

let GBGBuildings = {
	treasury:{},
	block:{ // get from GBG building meta-data: Object.assign({"free":0},...x.map(b=>({id:b.id,value:Number(b.description.replace(/.*? (\d+)% chance to not increase.*/gm,"$1"))})).filter(b=>b.value).sort((a,b)=>a.value-b.value).map(b=>({[b.id]:b.value})))
		"free":0,
		"watchtower": 8,
		"guild_command_post_improvised": 20,
		"barracks_improvised": 20,
		"basic_field_outpost_diamond": 20,
		"basic_field_outpost_platinum": 20,
		"basic_field_outpost_gold": 20,
		"basic_field_outpost_silver": 20,
		"basic_field_outpost_copper": 20,
		"guild_fieldcamp_small": 26,
		"basic_guild_fortress_diamond": 26,
		"basic_guild_fortress_platinum": 26,
		"basic_guild_fortress_gold": 26,
		"basic_guild_fortress_silver": 26,
		"basic_guild_fortress_copper": 26,
		"guild_command_post_forward": 40,
		"barracks": 40,
		"regular_field_outpost_diamond": 40,
		"regular_field_outpost_platinum": 40,
		"regular_field_outpost_gold": 40,
		"regular_field_outpost_silver": 40,
		"regular_field_outpost_copper": 40,
		"guild_fieldcamp": 52,
		"regular_guild_fortress_diamond": 52,
		"regular_guild_fortress_platinum": 52,
		"regular_guild_fortress_gold": 52,
		"regular_guild_fortress_silver": 52,
		"regular_guild_fortress_copper": 52,
		"guild_command_post_fortified": 60,
		"barracks_reinforced": 60,
		"advanced_field_outpost_diamond": 60,
		"advanced_field_outpost_platinum": 60,
		"advanced_field_outpost_gold": 60,
		"advanced_field_outpost_silver": 60,
		"advanced_field_outpost_copper": 60,
		"guild_fieldcamp_fortified": 80,
		"advanced_guild_fortress_diamond": 80,
		"advanced_guild_fortress_platinum": 80,
		"advanced_guild_fortress_gold": 80,
		"advanced_guild_fortress_silver": 80,
		"advanced_guild_fortress_copper": 80
	},
	Timeout:{"B":null,"T":null},
	free:0,
	costs:{},
	buildings:[],
	settings: {
		target:80,
		max:80
	},
	BuildingData:{},

	clearTO:(X)=>{
		if (!GBGBuildings.Timeout[X]) return;
		clearTimeout(GBGBuildings.Timeout[X]);
		GBGBuildings.Timeout[X] = null;
	},

	calc:()=>{
		$('#GBGBuildings').remove();
		GBGBuildings.clearTO("T");
		GBGBuildings.clearTO("B");
		let sets = GBGBuildings.createSets();
		if (sets.length==0) return;
		
		for (s of sets) {
			let needed = [...s.all];
			let costs = {};
			let leftStanding=[];
			let keep=[];
			for (b of GBGBuildings.buildings) {
				let i = needed.findIndex(x => x==b);
				if (i>=0) {
					needed.splice(i,1);
					keep.push(b)
				} else 
				if (b!="free") leftStanding.push(b);
			}
			if (leftStanding.length > 0) {
				for (b of needed) {
					let i = leftStanding.findIndex(x => GBGBuildings.block[x]>=GBGBuildings.block[b] && b != "free");
					if (i>=0) s["ignore"] = true;
				}
				if (leftStanding.length <= keep.filter(x => x=="free").length) s["ignore"] = true;
			}
			if (!s.ignore) {
				for (let n of needed) {
					for (c in GBGBuildings.costs[n]) {
						if (!GBGBuildings.costs[n][c]) continue;
						costs[c] = GBGBuildings.costs[n][c] + (costs[c] || 0);
					}
				}
			}
			let rel=0,
				abs=0,
				avg=0,
				num=Object.keys(costs).length,
			 	max=0;
				title=[];
			for (c in costs) {
				let r=costs[c]/GBGBuildings.treasury[c];
				avg += r/num;
				rel += r;
				abs += costs[c];
				max = r>max ? r : max;
				title.push({good:c,rel:r})
			}

			s["needed"]=needed;
			s["keep"]=keep;
			s["relCosts"]=rel;
			s["maxCosts"]=max;
			s["avgCosts"]=avg;
			s["absCosts"]=abs;
			s["title"] = title.sort((a,b)=>b.rel-a.rel).map(x=>HTML.i18nReplacer(i18n('Boxes.GBGBuildings.relativeCosts'),{good:GoodsData[x.good].name,amount:(x.rel*100).toPrecision(2),era:i18n("Eras."+Technologies.Eras[GoodsData[x.good].era])})).join("\n");
		}
		let sortby = "maxCosts"
		sets.sort((a,b)=> a.absCosts - b.absCosts);
		sets.sort((a,b)=> a[sortby]-b[sortby])
		//testing special sorting
		sets.sort((a,b)=> {
			let r = a.maxCosts/b.maxCosts * a.absCosts/b.absCosts;
			if (r>1) return 1;
			if (r<1) return -1;
			return 0; 
		})
		sets.sort((a,b)=> b.block-a.block)

		for (let i = 0; i<sets.length; i++) {
			if (sets[i].maxCosts>1) sets[i]["ignore"]=true;
			if (sets[i].ignore) continue;
			for (let j = i+1; j<sets.length; j++) {
				if (sets[j].ignore) continue;
				if (sets[j][sortby]>=sets[i][sortby] && sets[j].absCosts>=sets[i].absCosts) {
					sets[j].ignore = true;
					continue;
				}
				let iAll=[...sets[i].all];
				let jAll=[...sets[j].all];
				for (b of jAll) {
					let idx = iAll.findIndex(x => x==b);
					if (idx >= 0) 
						iAll.splice(idx,1);
				}
				if (iAll.length==0) sets[j].ignore = true;
			}	
		}
		
		//console.log(sets)

		// Don't create a new box while another one is still open
		if ($('#GBGBuildings').length === 0) {
			HTML.Box({
				id: 'GBGBuildings',
				title: i18n('Boxes.GBGBuildings.title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize : true,
			    active_maps:"gg",
			});
			HTML.AddCssFile('gbgbuildings');
		}

		let h='<table class="foe-table">';
		h += `<tr><th>${i18n('Boxes.GBGBuildings.toBuild')}</th><th>${i18n('Boxes.GBGBuildings.totalChance')}</th><th colspan="2">${i18n('Boxes.GBGBuildings.Costs')}</th></tr>`
		let lastBlock = Infinity;
		let lastCost = Infinity;
		let lastMax = Infinity;
		let src = (b) => {
			let link=""
			link = srcLinks.get("/guild_battlegrounds/hud/guild_battlegrounds_sector_buildings_"+b+"_gbg2024.png",true,true)
			if (link.includes("antiquedealer_flag")) link = srcLinks.get("/guild_battlegrounds/hud/guild_battlegrounds_sector_buildings_"+b+".png",true)
			return link
		}
		for (let s of sets) {
			if (s.ignore) continue;
			let highlight=null;
			if (s.block < lastBlock) {
				lastCost = s.absCosts;
				lastMax = s.maxCosts;
				lastBlock = s.block;
				highlight = "chance"
			} else if (s.maxCosts < lastMax) {
				lastCost = s.absCosts;
				lastMax = s.maxCosts;
				lastBlock = s.block;
				highlight = "max";
			} else if (s.absCosts < lastCost) {
				lastCost = s.absCosts;
				lastMax = s.maxCosts;
				lastBlock = s.block;
				highlight = "cost";
			}
			
			h+=`<tr ${highlight=="chance"?'class="breakline"':''}><td >`
			for (let b of s.needed) {
				if (b=="free") continue;
				h+=`<img class="building" src="${src(b)}" title="${GBGBuildings.BuildingData[b].name}">`
			}
			for (let b of s.keep) {
				if (b=="free") continue;
				h+=`<img class="building keep" src="${src(b)}" title="${GBGBuildings.BuildingData[b].name}">`
			}
			h+=`</td><td ${highlight == "chance"? 'class="highlight"':''}>${s.block}%</td>
				<td title="${s.title}" ${highlight == "max"? 'class="highlight"':''}>${(s[sortby]*100).toPrecision(2)}%</td>
				<td title="${i18n('Boxes.GBGBuildings.absoluteCosts')}" ${highlight == "cost"? 'class="highlight"':''}>${s.absCosts}</td>
				</tr>`;
		}
		h+='</table>';
		$('#GBGBuildingsBody').html(h);
	},

	createSets:()=>{
		let sets={};
		let current = GBGBuildings.buildings.map(x=> GBGBuildings.block[x]||0).reduce((a,b)=>a+b,0);
		if (current>GBGBuildings.settings.max) current= GBGBuildings.settings.max;
		let num = GBGBuildings.buildings.length;
		if (current >= GBGBuildings.settings.target) return []
		let b = [...Object.keys(GBGBuildings.costs).filter(value => Object.keys(GBGBuildings.block).includes(value)),"free"]
		let one = b.map(x=>[x]);
		let two=[];
		if (num >= 2) {
			one.forEach(x => {b.forEach(y => {two.push([x,y].flat())})})
		}
		let three=[];
		if (num >=3) {
			two.forEach(x => {b.forEach(y => {three.push([x,y].flat())})})
		}
		
		let all = num==1 ? one : num==2 ? two : three;
		let sortOrder = Object.keys(GBGBuildings.block)
		all.forEach( x => {
			let t = 0;
			let ignore = false;
			x.sort((a,b)=> (sortOrder.indexOf(b) - sortOrder.indexOf(a)))
			for (i of x) {
				if (t>=GBGBuildings.settings.max && i!="free") {
					ignore = true;
					break;
				}
				t += GBGBuildings.block[i];
			}
			if (t>=GBGBuildings.settings.max) t=GBGBuildings.settings.max;
			if (t > current && ignore == false) sets[JSON.stringify(x)] = {all: x,block:t}
		})
		
		return Object.values(sets);
	},
}