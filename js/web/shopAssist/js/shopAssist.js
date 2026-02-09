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

FoEproxy.addHandler('ItemStoreService', 'getStore', (data, postData) => {
	shopAssist.slots = data.responseData.slots;
	shopAssist.storeId = data.responseData.id;
	shopAssist.unlockProgress = Object.assign({},...data.responseData.unlockConditionsProgress.map(x=>({[x.type+"#"+(x.subtype||x.context)]:x.amount})));
	shopAssist.alertsTriggered = {};
	shopAssist.checkAlerts();
	shopAssist.alertsTriggered = {};
	shopAssist.showDiscount = data.responseData.refresh?.refreshAt - GameTime.get() < 24*3600; //only show discount if less than 24h to next refresh
	
    if ($('#shopAssist-Btn').hasClass('hud-btn-red')) {
        $('#shopAssist-Btn').removeClass('hud-btn-red');
        $('#shopAssist-Btn-closed').remove();
    }

	if (($('#shopAssist').length === 0) && !Settings.GetSetting('ShowShopAssist')) return;
	shopAssist.Show();
});

FoEproxy.addHandler('ItemStoreService', 'purchaseSlot', (data, postData) => {
	let i = shopAssist.slots.findIndex(x=>x.slotId === data.responseData.slot.slotId);
	shopAssist.slots[i] = data.responseData.slot;

	if ($('#shopAssist').length === 0) return;
	shopAssist.Show();
});

FoEproxy.addHandler('ItemStoreService', 'refreshStore', (data, postData) => {
	shopAssist.slots = data.responseData.slots;
	shopAssist.storeId = data.responseData.id;
	shopAssist.unlockProgress = Object.assign(shopAssist.unlockProgress,...data.responseData.unlockConditionsProgress.map(x=>({[x.type+"#"+(x.subtype||x.context)]:x.amount})));
	
    if ($('#shopAssist').length === 0) return;
	shopAssist.Show();
});

FoEproxy.addHandler('ItemStoreService', 'getConfigs', (data, postData) => {
	shopAssist.shopMeta = Object.assign({},...data.responseData.map(x=>({[x.id]:x})));
	// cleanup old shop favourites data
	let cleaned = false
	for (let x of Object.keys(shopAssist.favourites)) {
		if (!shopAssist.shopMeta?.[x]) {
			delete shopAssist.favourites[x];
			cleaned = true;
		}
	}
	if (cleaned) localStorage.setItem("shopAssist.favourites",JSON.stringify(shopAssist.favourites));
	// cleanup old shop alerts data
	cleaned = false;
	for (let key of Object.keys(shopAssist.alerts)) {
		let shopId = key.split("#")[0];
		if (!shopAssist.shopMeta?.[shopId]) {
			delete shopAssist.alerts[key];
			cleaned = true;
		}
	}
	if (cleaned) localStorage.setItem("shopAssist.alerts",JSON.stringify(shopAssist.alerts));
	localStorage.setItem("shopAssist.shopMeta",JSON.stringify(shopAssist.shopMeta));
});

FoEproxy.addHandler("ItemStoreService","updateUnlockConditions", (data, postData) => {
	for (let shop of data.responseData) {
		if (shop.id != shopAssist.storeId) continue;
		for (let cond of shop.unlockConditionsProgress) {
			shopAssist.unlockProgress[cond.type + "#" + (cond.subtype||cond.context)] += cond.amount;
		}
	}
	if ($('#shopAssist').length === 0) return;
	shopAssist.timeout = setTimeout(shopAssist.Show,100);
});

FoEproxy.addFoeHelperHandler('InventoryUpdated', () => {
	shopAssist.updateDialog();
});

FoEproxy.addFoeHelperHandler('ActiveMapUpdated', () => {
	$('#shopAssist').remove();
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
	currencyfilter:{},
	alerts: JSON.parse(localStorage.getItem("shopAssist.alerts")||"{}"),
	timeout: null,
    /**
     * Shows a User Box with the current production stats
     *
     * @constructor
     */
    Show: () => {
		clearTimeout(shopAssist.timeout);
		shopAssist.timeout = null;

        if ($('#shopAssist').length === 0) {
			HTML.AddCssFile('shopAssist');
        
			HTML.Box({
				id: 'shopAssist',
				title: i18n('Boxes.ShopAssist.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize : true,
				settings: 'shopAssist.ShowSettings()',
			});
		}
		
		shopAssist.updateDialog();
    },
	
	updateDialog: () => {
		shopAssist.allTTContent = {};
        if ($('#shopAssist').length === 0) return

		let h = `<table class="shopAssistTable foe-table" style="width:100%">`
		let resources = "";
		let newFilter = {};
		for (let res of shopAssist.shopMeta[shopAssist.storeId].resources) {
			newFilter[res] = shopAssist.currencyfilter[res] ?? true;
			resources += `<span class="shopResource ${newFilter[res]?"active":""} clickable" data-original-title="${i18n('Boxes.ShopAssist.filterCurrency')}" data-currency="${res}">${HTML.Format(ResourceStock[res]||0)}${srcLinks.icons(res)}</span>`
		}
		shopAssist.currencyfilter = newFilter;
		h += `<thead>
				<tr>
					<th colspan=5>
						<input type="checkbox" id="shopAssistFav" class = "clickable"><label for="shopAssistFav" class = "clickable">&nbsp;${i18n("Boxes.ShopAssist.onlyFavourites")}</label>
						<input type="checkbox" id="shopAssistUnlock" class = "clickable"><label for="shopAssistUnlock" class = "clickable">&nbsp;${i18n("Boxes.ShopAssist.onlyUnlocked")}</label>
					</th>
					<th colspan=3>
						${resources}
					</th>
				</tr>
				<tr>
					<th>★</th>
					<th></th>
					<th>${i18n("Boxes.ShopAssist.Item")}</th>
					<th>🔒</th>
					<th>${i18n("Boxes.ShopAssist.Inventory")}</th>
					<th>${i18n("Boxes.ShopAssist.Single")}</th>
					<th>${i18n("Boxes.ShopAssist.Missing")}</th>
					<th>${i18n("Boxes.ShopAssist.Max")}</th>
				</tr>
			</thead>`
		let hasFavourites =  Object.keys(shopAssist.favourites?.[shopAssist.storeId]||{}).length>0;
		let addRow = (slot) =>{
			let h = ``;
			let stock = shopAssist.getStock(slot.reward);
			let neededFragments = null;
			let neededBuys = null;
			
			let limitedBuys = slot.purchaseLimit ? slot.purchaseLimit.remainingPurchases || 0 : Infinity;
			if (slot.reward.subType == "fragment") {
				neededFragments = Math.max(slot.reward.requiredAmount-((stock.fragments||0)%slot.reward.requiredAmount),0);
				neededBuys = Math.ceil(neededFragments/slot.reward.amount);
				neededFragments = neededBuys * slot.reward.amount;
			}
			let buildingList = shopAssist.getBuildingIds(slot.reward)
			let limitReached = slot.purchaseLimit?.maxPurchases && !slot.purchaseLimit.remainingPurchases;
			let hasLock = ('unlockConditions' in slot) && (slot.unlockConditions.length > 0);
			let unlocked = true;
			for (let u of slot.unlockConditions||[]) {
				if (u.type == "resource_spend") 
					for (let [r,amount] of Object.entries(u?.resourcesVO?.resources||{})) {
						if ((shopAssist.unlockProgress?.[u.type+"#"+r]||0) < amount) {
							unlocked = false;
							break;
						}
					}
				else if (u.type == "grand_prize_progress") {
					if ((shopAssist.unlockProgress?.[u.type+"#"+u.context]||0) < u.amount) {
							unlocked = false;
							break;
						}
				}
				else if (u.type == "rarity") {
					if ((shopAssist.unlockProgress?.[u.type+"#"+u.rarityPurchase.rarity.value]||0) < u.rarityPurchase.amount) {
							unlocked = false;
							break;
						}
				}
			}
			let isdiscounted = slot.discount && slot.discount>0 && shopAssist.showDiscount;
			currencyClasses = " ";
			Object.entries(slot.baseCost?.resources||{}).forEach(([res, amount])=>{
				currencyClasses += "currency-" + res + " ";
			})

			//Favourites + Alerts
			h += `<tr class="${currencyClasses + (shopAssist.favourites?.[shopAssist.storeId]?.[slot.slotId] ? "isShopFavourite " : "") + (unlocked ? "isUnlocked " : "") + (hasLock ? "hasLock " : "") +((slot.purchaseLimit?.maxPurchases && !slot.purchaseLimit.remainingPurchases) ? "soldOut" : "")}">
			<td>
				<div class="shopFavourite clickable" data-id="${slot.slotId}"></div>
				<div class="shopAlert clickable ${(shopAssist.alerts[shopAssist.storeId + "#" + slot.slotId]) ? "alertActive" : ""}" data-id="${shopAssist.storeId + "#" + slot.slotId}"></div>
			</td>`
			//Rarity
			h += `<td>
				<img src="${(slot.rarity?.value || "none") != "none" ? srcLinks.get("/item_store/store_shared/item_store_rarity_icon_"+slot.rarity.value+".png",true,true):""}" alt="">
			</td>`
			//name
			h+=`<td data-ids="${buildingList}" class="helperTT" data-callback_tt="${buildingList.length>0?'shopAssist.TT':'shopAssist.allTT'}" data-slotid="${slot.slotId}A">${(slot.reward.target?srcLinks.icons("booster_target_"+slot.reward.target):"")+slot.reward.name}</td>`			
			if (slot.reward?.assembledReward?.type == "ally") {
				let allTT = `<table class="foe-table shopAssistTable">
							<tr><th><img src=${srcLinks.get("/historical_allies/portraits/historical_allies_portrait_ally_"+slot.reward.assembledReward.iconAssetName+".png",true)} style="height:unset">
							${MainParser.Allies.rarityStars(slot.reward.assembledReward.rarity.value)}</th></tr>
							<tr><td> ${MainParser.Allies.boosts(slot.reward.assembledReward.boosts)}</td></tr>
							</table>`
				shopAssist.allTTContent[slot.slotId+"A"] = allTT;
			}

			
			// Lock conditions
			let costs = "";
			if (hasLock && !unlocked) {
				costs += "🔒";
				for (let u of slot.unlockConditions||[]) {
					if (u.type == "resource_spend") 
						for (let [r,amount] of Object.entries(u?.resourcesVO?.resources||{})) {
							costs += `<div class="text-right">` + HTML.Format((shopAssist.unlockProgress?.[u.type + "#"+r])||0) + "/" + amount + srcLinks.icons(r) + "</div>"
						}
					else if (u.type == "grand_prize_progress") {
							costs += `<div class="text-right">` + HTML.Format((shopAssist.unlockProgress?.[u.type + "#" + u.context])||0) + "/" + u.amount + srcLinks.regEx(RegExp(`store.*?${u.context.replace("_event","")}.*?grand_prize`)) + "</div>"
					}
					else if (u.type == "rarity") {
							costs += `<div class="text-right">` + HTML.Format((shopAssist.unlockProgress?.[u.type + "#" + u.rarityPurchase.rarity.value])||0) + "/" + u.rarityPurchase.amount + '<img src="' + srcLinks.get("/item_store/store_shared/item_store_rarity_icon_common.png",true) + '"></div>'
					}
				}
			}
			h += `<td class="${unlocked ? "" : "locked"}"}">
				${costs}
			</td>`
			//Inventory
			h += `<td>
				<div>${stock.stock ? HTML.Format(stock.stock) : ""}</div>
				<div>${slot.reward.subType == "fragment" ? srcLinks.icons("icon_tooltip_fragment") + HTML.Format(stock.fragments||0)+"/"+HTML.Format(slot.reward.requiredAmount) : ""}</div>
			</td>`
			//Costs single
			costs = "";
			let canBuy = true;
			Object.entries(slot.baseCost?.resources||{}).forEach(([res, amount])=>{
				let cost = Math.ceil(amount*(1-(slot.discount||0)));
				if (ResourceStock[res] == undefined || ResourceStock[res]<cost) 
					canBuy = false;
				costs += `<div class="text-right${isdiscounted ? " shopDiscount":""}">` + HTML.Format(cost) + srcLinks.icons(res) + "</div>"
			})
			h += `<td class="costs ${(canBuy && !limitReached && unlocked) ? "canBuy" : "canNotBuy"}">
				${costs}
			</td>`
			if (slot.reward.subType == "fragment") {
				//costs complete
				costs = "";
				canBuy = true;
				Object.entries(slot.baseCost?.resources||{}).forEach(([res, amount])=>{
					let cost = neededBuys * Math.ceil(amount*(1-(slot.discount||0)));
					if ((ResourceStock[res] || 0) < cost) 
						canBuy = false;
					costs += `<div class="text-right">${HTML.Format(cost) + srcLinks.icons(res)}</div>`
				})
				h += `<td class="costs ${(canBuy && !limitReached && unlocked) ? "canBuy" : "canNotBuy"} helperTT" data-callback_tt="shopAssist.allTT" data-slotid="${slot.slotId}F">
					<div><span>${srcLinks.icons("icon_tooltip_fragment") + HTML.Format(neededFragments)}</span> <span>(${neededBuys}x)</span></div>
					${costs}
				</td>`
				//costs full
				if (neededFragments < slot.reward.requiredAmount) { 
					let allTT = '<table class="foe-table shopAssistTable"><tr><th>' + i18n("Boxes.ShopAssist.Full") + `</th></tr><tr>`;
					costs = "";
					canBuy = true;
					fullBuys = Math.floor(slot.reward.requiredAmount / slot.reward.amount);
					Object.entries(slot.baseCost?.resources||{}).forEach(([res, amount])=>{
						let cost = fullBuys * Math.ceil(amount*(1-(slot.discount||0)));
						if ((ResourceStock[res] || 0) < cost) canBuy = false;
						costs += `<div class="text-right">` + HTML.Format(cost) + srcLinks.icons(res)+ "</div>"
					})
					allTT += `<td class="costs ${(canBuy && !limitReached && unlocked) ? "canBuy" : "canNotBuy"}">
							<div>${slot.reward.subType == "fragment" && fullBuys < Infinity && fullBuys > 0 ? `<span>${srcLinks.icons("icon_tooltip_fragment") + HTML.Format(fullBuys * slot.reward.amount)}</span>`:``} <span>(${fullBuys}x)</span></div> 
							${costs}
							</td></tr></table>`
					shopAssist.allTTContent[slot.slotId+"F"] = allTT;
				}
			} else {
				h += `<td></td>`
			}
			//costs max
			costs = "";
			canBuy = false;
			let maxBuys = Math.min(slot.flag?.value=="increasingCosts" ? 1 : Infinity,limitedBuys);
			if (maxBuys > 0) {
				Object.entries(slot.baseCost?.resources||{}).forEach(([res, amount])=>{
					maxBuys = Math.min(maxBuys,Math.floor((ResourceStock[res] || 0) / Math.ceil(amount*(1-(slot.discount||0)))));
				})
			}
			if (maxBuys != Infinity && maxBuys > 0) {
				canBuy = true;
				Object.entries(slot.baseCost?.resources||{}).forEach(([res, amount])=>{
					let cost = maxBuys * Math.ceil(amount*(1-(slot.discount||0)));
					costs += `<div class="text-right">` + HTML.Format(cost) + srcLinks.icons(res)+ "</div>"
				})
			}
			h += `<td class="costs ${(maxBuys>0 && maxBuys==limitedBuys) || (maxBuys>0 && limitedBuys == Infinity)?"canBuy":""} ${limitedBuys > 0 && limitedBuys < Infinity ? 'helperTT" data-callback_tt="shopAssist.allTT" data-slotid="' + slot.slotId + '"':'"'}>
					<div>
						${slot.reward.subType == "fragment" && maxBuys != Infinity && maxBuys != 0 ? 
							`<span>${srcLinks.icons("icon_tooltip_fragment") + HTML.Format(maxBuys*slot.reward.amount)}</span>`:``} 
						<span>(<span class="${maxBuys>0 ? "buyable":""}">${maxBuys}</span>${slot.flag?.value!="increasingCosts" && limitedBuys > 0 && limitedBuys < Infinity ? "/" + limitedBuys : (slot.flag?.value=="increasingCosts" && limitedBuys > 0 ? "/?" :"x")})
						</span>
					</div> 
					${costs}
				</td>`
			h += `</tr>`
			//costs all
			if (limitedBuys > 0 && limitedBuys < Infinity && limitedBuys > maxBuys) {
				let allTT = '<table class="foe-table shopAssistTable"><tr><th>' + i18n("Boxes.ShopAssist.All") + `</th></tr><tr>`;
				costs = "";
				canBuy = true;
				Object.entries(slot.baseCost?.resources||{}).forEach(([res, amount])=>{
					let cost = limitedBuys * Math.ceil(amount*(1-(slot.discount||0)));
					if ((ResourceStock[res] || 0) < cost) canBuy = false;
					costs += `<div class="text-right">` + HTML.Format(cost) + srcLinks.icons(res)+ "</div>"
				})
				allTT += `<td class="costs ${(canBuy && !limitReached && unlocked) ? "canBuy" : "canNotBuy"}">
						<div>${slot.reward.subType == "fragment" && limitedBuys < Infinity && limitedBuys > 0 ? `<span>${srcLinks.icons("icon_tooltip_fragment") + HTML.Format(limitedBuys * slot.reward.amount)}</span>`:``} <span>(${limitedBuys}x)</span></div> 
						${costs}
						</td></tr></table>`
				shopAssist.allTTContent[slot.slotId] = allTT;
			}
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
		$('#shopAssistFav').prop("checked",shopAssist.favouritesOnly && hasFavourites);
		if (shopAssist.favouritesOnly && hasFavourites) {
			$(".shopAssistTable").addClass("favouritesOnly");
		};
		$("#shopAssistFav").on("change",function(e){
			shopAssist.favouritesOnly = e.currentTarget.checked;
			localStorage.setItem("shopAssist.favouritesOnly",JSON.stringify(shopAssist.favouritesOnly));
			if (shopAssist.favouritesOnly) {
				$(".shopAssistTable").addClass("favouritesOnly");
			} else {
				$(".shopAssistTable").removeClass("favouritesOnly");
			}
		});
		$('#shopAssistUnlock').prop("checked",shopAssist.unlockedOnly);
		if (shopAssist.unlockedOnly) {
			$(".shopAssistTable").addClass("unlockedOnly");
		};
		$("#shopAssistUnlock").on("change",function(e){
			shopAssist.unlockedOnly = e.currentTarget.checked;
			localStorage.setItem("shopAssist.unlockedOnly",JSON.stringify(shopAssist.unlockedOnly));
			if (shopAssist.unlockedOnly) {
				$(".shopAssistTable").addClass("unlockedOnly");
			} else {
				$(".shopAssistTable").removeClass("unlockedOnly");
			}
		});
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
		checkCurrencyFilters = () => {
			for (let res of $(".shopResource")) {
				$(".currency-" + res.dataset.currency).addClass("currencyFiltered");
			}
			for (let res of $(".shopResource.active")) {
				$(".currency-" + res.dataset.currency).removeClass("currencyFiltered");
			}
		}
		$(".shopResource").on("click",function(e){
			let res = e.currentTarget.dataset.currency;
			shopAssist.currencyfilter[res] = !shopAssist.currencyfilter[res];
			e.currentTarget.classList.toggle("active");
			checkCurrencyFilters();
		});
		checkCurrencyFilters();
		$('[data-original-title]').tooltip();
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
	
	allTT: async (e) => {
		let slotId=e?.currentTarget?.dataset?.slotid
		if (!slotId) return
		return shopAssist.allTTContent[slotId]		
	},

	checkAlerts: () => {
		for (let [key,slot] of Object.entries(shopAssist.alerts)) {
			if (shopAssist.alertsTriggered[key]) continue;
			if (slot.purchaseLimit?.maxPurchases && !slot.purchaseLimit.remainingPurchases) continue;
			let canBuy = true;
			for (let [res, amount] of Object.entries(slot.baseCost?.resources||{})) {
				let cost = Math.ceil(amount*(1-(slot.discount||0)))
				if (ResourceStock[res] > cost) continue
				canBuy = false;
				break;
			}
			if (canBuy) {
				shopAssist.alertsTriggered[key] = true;
				let shopId = key.split("#")[0];
				HTML.ShowToastMsg({
					show: 'force',
					head: i18n('Boxes.ShopAssist.Shop') + ' - ' + (shopAssist.shopMeta?.[shopId]?.name||""),
					text: i18n('Boxes.ShopAssist.canBeBought')+": " + slot.reward.name,
					type: 'success',
					hideAfter: 60000
				});
			}
		}
	},

	// todo
    ShowSettings: () => {
		let autoOpen = Settings.GetSetting('ShowShopAssist');

        let h = [];
        h.push(`<p><label><input id="shopAssistAutoOpen" type="checkbox" ${(autoOpen === true) ? ' checked="checked"' : ''} />${i18n('Boxes.Settings.Autostart')}</label></p>`);
        h.push(`<p><button onclick="shopAssist.SaveSettings()" id="save-bghelper-settings" class="btn" style="width:100%">${i18n('Boxes.Settings.Save')}</button></p>`);

        $('#shopAssistSettingsBox').html(h.join(''));
    },

    SaveSettings: () => {
        let value = false;
		if ($("#shopAssistAutoOpen").is(':checked'))
			value = true;
		localStorage.setItem('ShowShopAssist', value);
		
		$(`#shopAssistSettingsBox`).remove();
    },
};
