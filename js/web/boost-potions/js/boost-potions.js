/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */


// GEX started
FoEproxy.addFoeHelperHandler('ActiveMapUpdated', () => {
	BoostPotions.Show();
	BoostPotions.updateList();
});

FoEproxy.addFoeHelperHandler('InventoryUpdated', () => {
	BoostPotions.updateList();
});

FoEproxy.addHandler('BoostService', 'addBoost', (data)=> {
	if (data.responseData.origin !== "inventory_item" ) return;
	let b=data.responseData;
	BoostPotions.activate(b.type,{expire:b.expireTime,target:b.targetedFeature||"all",value:b.value});
});

/**
 * 
 */
let BoostPotions = {
	delay:null,
	active:{
		att_boost_attacker: null,
		def_boost_attacker: null,
		att_boost_defender: null,
		def_boost_defender: null,
	},
	activeMapRelevance:{
		all:['main', 'gex', 'gg', 'era_outpost'],
		battleground:['main', 'gg'],
		guild_expedition:['main', 'gex'],
		guild_raids:['main', 'guild_raids']
	},
	list:null,

	activate:(type, boost)=>{
		BoostPotions.active[type]=boost;
		if (!BoostPotions.delay) {
			BoostPotions.Show();
		}
	},

	Show: () => {
		// noch nicht im DOM?

		if(!Settings.GetSetting('ShowPotions')) {
			$('#BoostPotions').remove();
			if (!BoostPotions.delay) return;
			clearInterval(BoostPotions.delay);
			BoostPotions.delay = null;
			return;
		} 
		if( $('#BoostPotions').length < 1 ){
			let div = $('<div />').attr({
				id: 'BoostPotions',
				class: `game-cursor ${ActiveMap}`
			}).append(`<div class="shortest"></div><div class="list"><div class="active"></div><div class="table"></div></div>`);

			$('body').append(div);
		}
		
		let shortest=`<img src="${srcLinks.get("/shared/icons/reward_icons/reward_icon_boost_attack_medium.png",true)}">`;
		$('#BoostPotions .shortest').html(shortest);
		let active=``;
		let d = null;
		let a = false;
		for (let b of Object.keys(BoostPotions.active)) {
			if (!BoostPotions.active[b]) continue;
			let duration = moment.duration(moment.unix(BoostPotions.active[b].expire).diff(moment(new Date())));
			if (duration<0) {
				BoostPotions.active[b]=null;
				continue;
			}
			[h,m,s]=[duration.hours(),duration.minutes(),duration.seconds()];
			let all= BoostPotions.active[b].target == undefined || BoostPotions.active[b].target == "all"; 
			active += `<span>${all ? "":`<img src="${srcLinks.get(`/shared/icons/booster_target_${BoostPotions.active[b].target}.png`,true)}">`}<img src="${srcLinks.get(`/shared/icons/${b}.png`,true)}">${BoostPotions.active[b].value}% - ${h==0 ? "" : h+":"}${m<10 ? "0"+m:m}:${s<10 ? "0"+s:s}</span>`; 
			a=true;
			let e=BoostPotions.active[b].expire;
			if ((d<e && d!=null) || !e) continue;
			if (!BoostPotions.activeMapRelevance[all ? "all" : BoostPotions.active[b].target].includes(ActiveMap)) continue;
			d=e;
			$('#BoostPotions .shortest').html(shortest+`<span><img src="${srcLinks.get(`/shared/icons/${b}.png`,true)}">${h==0 ? "" : h+":"}${m<10 ? "0"+m:m}:${s<10 ? "0"+s:s}</span>`).addClass("boosted");
		}

		$('#BoostPotions .active').html(active);
		
		if (!a) {
			clearInterval(BoostPotions.delay);
			BoostPotions.delay=null;
			return;
		}

		if (!BoostPotions.delay) {
			BoostPotions.delay = setInterval(()=>{
				BoostPotions.Show();
			},1000);
		}
	},

	updateList:()=>	{
		if(!Settings.GetSetting('ShowPotions')) {
			$('#BoostPotions').remove();
			if (!BoostPotions.delay) return;
			clearInterval(BoostPotions.delay);
			BoostPotions.delay = null;
			return;
		} 
		BoostPotions.list = {
			att_boost_attacker: {},
			def_boost_attacker: {},
			att_boost_defender: {},
			def_boost_defender: {},
		}

		for (let i of Object.values(MainParser.Inventory)) {
			let b = i.item.reward || i.item;
			if (!BoostPotions.list[b.boostType]) continue;
			if (!BoostPotions.list[b.boostType][b.target||"all"]) BoostPotions.list[b.boostType][b.target||"all"] = [];
			BoostPotions.list[b.boostType][b.target||"all"].push({duration:b.duration,amount:i.inStock,value:b.value});
		}
		let table = `<table class="foe-table"><tr><th></th>`
		for (let t of Object.keys(BoostPotions.list)) {
			table += `<th colspan=3><img src="${srcLinks.get(`/shared/icons/${t}.png`,true)}"></th>`
		}
		table += `</tr>`
		for (let target of ["all","battleground","guild_expedition","guild_raids"]) {
			if (!BoostPotions.activeMapRelevance[target].includes(ActiveMap)) continue;
			table += `<tr><td><img src="${srcLinks.get(target=="all"?"/shared/icons/quest_icons/icon_quest_battle.png":`/shared/icons/booster_target_${target}.png`,true)}"></td>`;
			for (let t of Object.keys(BoostPotions.list)) {
				table += `<td>`
				sorted = (BoostPotions.list[t][target]||[]).sort((a,b)=> {
					let r = a.value-b.value;
					if (r!=0) return r;
					return a.duration-b.duration;
				});
				table += sorted.map(b=>`${b.amount}x`).join(`\n`);
				table += `</td><td>`
				table += sorted.map(b=>`${b.value}%`).join(`\n`);
				table += `</td><td>`
				table += sorted.map(b=>{
					let duration = moment.duration(b.duration*1000);
					h=duration.hours();
					m=duration.minutes();
					s=duration.seconds();
					return `${h==0 ? "" : h+":"}${m<10 ? "0"+m:m}:${s<10 ? "0"+s:s}`;
				}).join(`\n`);
				table += `</td>`
			}
			table += `</tr>`		
		}
		table += `</table>`
		
		if( $('#BoostPotions').length < 1 ){
			BoostPotions.Show();
		}
		$('#BoostPotions .table').html(table);
	},

};
