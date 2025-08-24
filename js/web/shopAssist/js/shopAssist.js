/*
 * **************************************************************************************
 * Copyright (C) 2024 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('ItemStoreService', 'getStore', (data, postData) => {
	shopAssist.slots = data.responseData.slots;
	shopAssist.storeId = data.responseData.id;
	shopAssist.alertsTriggered = {};
	shopAssist.Show();
});

FoEproxy.addHandler('ItemStoreService', 'purchaseSlot', (data, postData) => {
	let i = shopAssist.slots.findIndex(x=>x.slotId === data.responseData.slot.slotId);
	shopAssist.slots[i] = data.responseData.slot;
	shopAssist.Show();
});
FoEproxy.addHandler('ItemStoreService', 'getConfigs', (data, postData) => {
	shopAssist.shopMeta = Object.assign({},...data.responseData.map(x=>({[x.id]:x})));
	localStorage.setItem("shopAssist.shopMeta",JSON.stringify(shopAssist.shopMeta));
});

FoEproxy.addFoeHelperHandler('InventoryUpdated', () => {
	shopAssist.updateDialog();
});

FoEproxy.addFoeHelperHandler('ResourcesUpdated', () => {
	shopAssist.checkAlerts();
});

let shopAssist = {
	slots: null,
	storeId:null,
	alertsTriggered: {},
	shopMeta:JSON.parse(localStorage.getItem("shopAssist.shopMeta")||"{}"),
	favourites: JSON.parse(localStorage.getItem("shopAssist.favourites")||"{}"),
	favouritesOnly: JSON.parse(localStorage.getItem("shopAssist.favouritesOnly")||"false"),
	alerts: JSON.parse(localStorage.getItem("shopAssist.alerts")||"{}"),
    /**
     * Shows a User Box with the current production stats
     *
     * @constructor
     */
    Show: () => {
		if (!Settings.GetSetting('ShowShopAssist')) return;

        if ($('#shopAssist').length === 0) {
			HTML.AddCssFile('shopAssist');
        
			HTML.Box({
				id: 'shopAssist',
				title: i18n('Boxes.ShopAssist.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize : true,
				//active_maps:"main",
			});
		}
		
		shopAssist.updateDialog();
    },
	
	updateDialog: () => {
        if ($('#shopAssist').length === 0) return

		let h = `<table id="shopAssistTable" class="foe-table" style="width:100%">`
        
		h += `<thead>
				<tr>
					<th colspan=3><input type="checkbox" id="shopAssistFav"><label for="shopAssistFav">&nbsp;${i18n("Boxes.ShopAssist.onlyFavourites")}</label></th>
					<th colspan=3>${i18n("Boxes.ShopAssist.Costs")}</th>
				</tr>
				<tr>
					<th>★</th>
					<th>${i18n("Boxes.ShopAssist.Item")}</th>
					<th>${i18n("Boxes.ShopAssist.Inventory")}</th>
					<th>${i18n("Boxes.ShopAssist.Single")}</th>
					<th>${i18n("Boxes.ShopAssist.Missing")}</th>
					<th>${i18n("Boxes.ShopAssist.All")}</th>
				</tr>
			</thead>`
		
		let addRow = (slot) =>{
			let h = ``;
			let stock = shopAssist.getStock(slot.reward);
			let neededFragments = null;
			let neededBuys = null;
			let limitedFragments = null;
			let limitedBuys = slot.purchaseLimit?.remainingPurchases || 0
			if (slot.reward.subType == "fragment") {
				neededFragments = Math.max(slot.reward.requiredAmount-(stock.fragments||0),0);
				neededBuys = Math.ceil(neededFragments/slot.reward.amount);
				neededFragments = neededBuys * slot.reward.amount;
				limitedFragments = (slot.purchaseLimit?.remainingPurchases * slot.reward.amount) || slot.reward.requiredAmount;
				limitedBuys = Math.ceil(limitedFragments/slot.reward.amount);
			}
			let buildingList = shopAssist.getBuildingIds(slot.reward)
			let limitReached = slot.purchaseLimit?.maxPurchases && !slot.purchaseLimit.remainingPurchases;
			//Favourites + Alerts
			h += `<tr class="${(shopAssist.favourites?.[shopAssist.storeId]?.[slot.slotId] ? "isShopFavourite " : "")+((slot.purchaseLimit?.maxPurchases && !slot.purchaseLimit.remainingPurchases) ? "soldOut" : "")}">
			<td>
				<div class="shopFavourite clickable" data-id="${slot.slotId}"></div>
				<div class="shopAlert clickable ${(shopAssist.alerts[shopAssist.storeId + "#" + slot.slotId]) ? "alertActive" : ""}" data-id="${shopAssist.storeId + "#" + slot.slotId}"></div>
			</td>`
			//name
			h+=`<td data-ids="${buildingList}" class="${buildingList.length>0?"helperTT":""}" data-callback_tt="shopAssist.TT">${(slot.reward.target?srcLinks.icons("booster_target_"+slot.reward.target):"")+slot.reward.name}</td>`
			//Inventory
			h += `<td>
				<div>${stock.stock ? HTML.Format(stock.stock) : ""}</div>
				<div>${slot.reward.subType == "fragment" ? srcLinks.icons("icon_tooltip_fragment") + HTML.Format(stock.fragments||0)+"/"+slot.reward.requiredAmount : ""}</div>
			</td>`
			//Costs single
			let costs = "",
				canBuy = true;
			Object.entries(slot.baseCost?.resources||{}).forEach(([res, amount])=>{
				let cost = Math.round(amount*(1-(slot.discount||0)))
				if (ResourceStock[res]<cost) canBuy = false;
				costs += `<div class="text-right">` + HTML.Format(cost) + srcLinks.icons(res) + "</div>"
			})
			h += `<td class="costs ${(canBuy && !limitReached) ? "canBuy" : "canNotBuy"}">
				${costs}
			</td>`
			if (slot.reward.subType == "fragment") {
				//costs complete
				costs = "";
				canBuy = true;
				Object.entries(slot.baseCost?.resources||{}).forEach(([res, amount])=>{
					let cost = Math.round(neededBuys * amount*(1-(slot.discount||0)))
					if (ResourceStock[res]<cost) canBuy = false;
					costs += `<div class="text-right">${HTML.Format(cost) + srcLinks.icons(res)}</div>`
				})
				h += `<td class="costs ${(canBuy && !limitReached) ? "canBuy" : "canNotBuy"}">
					<div><span>${srcLinks.icons("icon_tooltip_fragment") + HTML.Format(neededFragments)}</span> <span>(${neededBuys}x)</span></div>
					${costs}
				</td>`
			}
			if (slot.reward.subType == "fragment") {
				//costs all
				costs = "";
				canBuy = true;
				Object.entries(slot.baseCost?.resources||{}).forEach(([res, amount])=>{
					let cost = Math.round(limitedBuys * amount*(1-(slot.discount||0)))
					if (ResourceStock[res]<cost) canBuy = false;
					costs += `<div class="text-right">` + HTML.Format(cost) + srcLinks.icons(res)+ "</div>"
				})
				h += `<td class="costs ${(canBuy && !limitReached) ? "canBuy" : "canNotBuy"}">
						<div><span>${srcLinks.icons("icon_tooltip_fragment") + HTML.Format(limitedFragments)}</span> <span>(${limitedBuys}x)</span></div> 
						${costs}
					</td>`
			} else {
				h += `<td></td>`
				//costs all
				costs = "";
				canBuy = true;
				Object.entries(slot.baseCost?.resources||{}).forEach(([res, amount])=>{
					let cost = Math.round(limitedBuys * amount*(1-(slot.discount||0)))
					if (ResourceStock[res]<cost) canBuy = false;
					if (cost>0 && slot.flag?.value!="increasingCosts") costs += limitedBuys ? `<div class="text-right"> ${HTML.Format(cost) + srcLinks.icons(res)}</div>` : `<div>&nbsp;</div>`
				})
				h += `<td class="costs ${limitReached ? "canNotBuy" : (limitedBuys && costs != "" ? (canBuy ? "canBuy" : "canNotBuy"):"")}">
					<div">(${limitReached ? 0 : slot.purchaseLimit?.remainingPurchases||"∞"}x)</div>
					${costs}
					</td>`
				}
			h+=`</tr>`
			return h;
		}

		let later = []
		
		for (let slot of shopAssist.slots) {
			if (shopAssist.alerts[shopAssist.storeId + "#" + slot.slotId]) shopAssist.alerts[shopAssist.storeId + "#" + slot.slotId] = structuredClone(slot); //update alert data
			if (slot.purchaseLimit?.maxPurchases && !slot.purchaseLimit.remainingPurchases) {
				later.push(slot);
				continue;
			}
			h += addRow(slot);			
		}
		for (let slot of later)
			h += addRow(slot);

		
		h += `</table>`
        
        
        $('#shopAssistBody').html(h);
		$('#shopAssistFav').prop("checked",shopAssist.favouritesOnly);
		if (shopAssist.favouritesOnly) {
			$("#shopAssistTable").addClass("favouritesOnly");
		};
		$(".shopFavourite").on("click",function(e){
			let id = e.currentTarget.dataset.id;
			if (!shopAssist.favourites?.[shopAssist.storeId]) shopAssist.favourites[shopAssist.storeId] = {}
			shopAssist.favourites[shopAssist.storeId][id] = !shopAssist.favourites[shopAssist.storeId][id];
			if (!shopAssist.favourites[shopAssist.storeId][id]) delete shopAssist.favourites[shopAssist.storeId][id];
			localStorage.setItem("shopAssist.favourites",JSON.stringify(shopAssist.favourites));
			e.currentTarget.parentNode.parentNode.classList.toggle("isShopFavourite");
		});
		$(".shopAlert").on("click",function(e){
			let id = e.currentTarget.dataset.id;
			if (!shopAssist.alerts?.[id]) {
				slotId = id.split("#")[1];
				shopAssist.alerts[id] = structuredClone(shopAssist.slots.find(x=>x.slotId === slotId));
			} else {
				delete shopAssist.alerts[id];
			}
			localStorage.setItem("shopAssist.alerts",JSON.stringify(shopAssist.alerts));
			e.currentTarget.classList.toggle("alertActive");
		});
		$("#shopAssistFav").on("change",function(e){
			shopAssist.favouritesOnly = e.currentTarget.checked;
			localStorage.setItem("shopAssist.favouritesOnly",JSON.stringify(shopAssist.favouritesOnly));
			if (shopAssist.favouritesOnly) {
				$("#shopAssistTable").addClass("favouritesOnly");
			} else {
				$("#shopAssistTable").removeClass("favouritesOnly");
			}
		});
		localStorage.setItem("shopAssist.alerts",JSON.stringify(shopAssist.alerts));
    },

	getStock: (reward) => {
		let stock = null,
			AssembledStock = null;
		if (reward.type == "building") {
			buildingId = reward.id.replace("building#","")
			stock = Object.values(MainParser.Inventory).find(x=>x.item.cityEntityId === buildingId)?.inStock || 0;
		}
		if (reward.subType == "fragment") 
			AssembledStock = shopAssist.getStock(reward.assembledReward).stock;
		
		if (reward.subType == "selection_kit")
			stock = Object.values(MainParser.Inventory).find(x=>x.item.selectionKitId === reward.id)?.inStock || 0;
		if (reward.subType == "upgrade_kit")
			stock = Object.values(MainParser.Inventory).find(x=>x.item.upgradeItemId === reward.id)?.inStock || 0;
		if (reward.type == "unit") 
			stock = Object.values(Unit?.Cache?.counts||{}).find(x=>x.unitTypeId === reward.unit.unitTypeId)?.unattached || "???";
		if (reward.type == "resource") 	{
			let id = /#(.*?)#/.exec(reward.id)?.[1];
			stock = ResourceStock[id]
		}
		if (stock === null)
			stock = Object.values(MainParser.Inventory).find(x=>x.item.id === reward.id || x.item.reward?.id && x.item.reward?.id===/(^.*?#(\(.*?\)|[^#])*)/.exec(reward.id)?.[1])?.inStock || 0;
		return {
			stock: AssembledStock !== null ? AssembledStock : stock,
			fragments: AssembledStock !== null ? stock : null
		}
			
	},

	getBuildingIds: (reward) => {
		let Ids = [];
		getFromUpgrade = (id)=>{
			let steps = MainParser.BuildingUpgrades[id].upgradeSteps
			return steps[steps.length-1].buildingIds
		}
		if (reward.type == "building") {
			Ids.push(reward.subType);
		} else if (reward.subType == "fragment") {
			Ids = Array(...Ids,...shopAssist.getBuildingIds(reward.assembledReward));
		} else if (reward.subType == "selection_kit") {
			for (let option of MainParser.SelectionKits[reward.id].options) {
				if (option.item.__class__ == "BuildingItemPayload") Ids.push(option.item.cityEntityId)
				if (option.item.__class__ == "UpgradeKitPayload") Ids.push(getFromUpgrade(option.item.upgradeItemId))
			}
		} else if (reward.subType == "upgrade_kit") {
			Ids = Array(...Ids,...getFromUpgrade(reward.id));
		} else if (reward.type == "chest") {
			for (let rew of reward.possible_rewards) {
				Ids = Array(...Ids,...shopAssist.getBuildingIds(rew.reward));
			}
		}
		Ids = Array.from(new Set(Ids));
		return Ids
	},

	TT: async (e) => {
		let buildingIds=e?.currentTarget?.dataset?.ids.split(",")
        if (!buildingIds) return

        let eff = Object.assign({},...Productions.rateBuildings(buildingIds,true,CurrentEra)?.map(x=>({[x.entityId]:Math.round(100 * x.rating?.totalScore||0)})))
		let meta = Object.assign({},...buildingIds.map(x=>({[x]:MainParser.CityEntities[x]})))

		let upgrades = Object.assign({},...buildingIds.map(x=>{
			let u = ""
			let upgradeCount = Kits.allBuildingsUpgradeCounts[x]||{}
			if (Object.keys(upgradeCount).length>0) {
				u = '<span class="upgrades"><span class="base">1</span>';
				for (let i in upgradeCount) {
					if (!upgradeCount[i]) continue;
					if (upgradeCount[i]) {
						u += `<span class="${i}">${upgradeCount[i]}</span>`;
					}
				}
				u += '</span>';
			}
			return{[x]:u}
		}))
        
        let h = `<div class="buildingTT">
				<table class="foe-table">`
		let head = ``
		let body = ``
		
		let vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
		let limit = Math.floor(vw/330)

		for (let b of buildingIds) {		
			if (buildingIds.length<=limit) {
				head +=`<td style="width:100%; vertical-align:top"><h2><span>${meta[b].name}  ${eff[b] ? `(${i18n("Boxes.Kits.Efficiency")}: ${eff[b]})`:''}</span>${upgrades[b]}</h2></td>`
				body += `<td style="width:100%; vertical-align:top">`;
				body += await Tooltips.BuildingData(meta[b],CurrentEra,null, eff);
				body += `</td>`
			} else {
				head +=`<tr style="text-wrap-mode:nowrap"><td><span style="font-weight:600">${meta[b].name}</td><td>  ${eff[b] ? `(${i18n("Boxes.Kits.Efficiency")}: ${eff[b]})`:''}</td><td>${upgrades[b]}</td></tr>`
			}
		}
		if (buildingIds.length<=limit) {
			h+=`<tr>`+head+`</tr>`
			h+=`<tr>`+body+`</tr>`
		} else {
			h+=head
		}
		h+=`</table></div>`

        setTimeout(()=>{
            $(".handleOverflow").each((index,e)=>{
                let w= ((e.scrollWidth - e.parentNode.clientWidth) || 0)
                if (w<0)
                    e.style["animation-name"]="unset"
                else 
                    e.style.width = w + "px";
            })
        },100)
        return h
	},
	checkAlerts: () => {
		for (let [key,slot] of Object.entries(shopAssist.alerts)) {
			if (shopAssist.alertsTriggered[key]) continue;
			if (slot.purchaseLimit?.maxPurchases && !slot.purchaseLimit.remainingPurchases) continue;
			let canBuy = true;
			for (let [res, amount] of Object.entries(slot.baseCost?.resources||{})) {
				let cost = Math.round(amount*(1-(slot.discount||0)))
				if (ResourceStock[res] > cost) continue
				canBuy = false;
				break;
			}
			if (canBuy) {
				shopAssist.alertsTriggered[key] = true;
				[shopId,slotId] = key.split("#");
				HTML.ShowToastMsg({
					show: 'force',
					head: i18n('Boxes.ShopAssist.Shop') + ' - ' + (shopAssist.shopMeta?.[shopId]?.name||""),
					text: i18n('Boxes.ShopAssist.canBeBought')+": " + slot.reward.name,
					type: 'success',
					hideAfter: 60000
				});
			}
		}
	}

	
};
