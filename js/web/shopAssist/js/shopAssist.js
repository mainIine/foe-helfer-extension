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
	shopAssist.Show();
});

FoEproxy.addHandler('ItemStoreService', 'purchaseSlot', (data, postData) => {
	let i = shopAssist.slots.findIndex(x=>x.slotId === data.responseData.slot.slotId);
	shopAssist.slots[i] = data.responseData.slot;
	shopAssist.Show();
});

FoEproxy.addFoeHelperHandler('InventoryUpdated', () => {
	shopAssist.updateDialog();
});

let shopAssist = {
	slots: null,
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
	
	updateDialog: (options) => {
        if ($('#shopAssist').length === 0) return

		let h = `<table id="shopAssistTable" class="foe-table" style="width:100%">`
        
		h += `<tr>
			<th>Name</th>
			<th>Costs</th>
			<th>Inventory</th>
			<th>complete</th>
			<th>buyable</th>
			</tr>`
		for (slot of shopAssist.slots) {
			stock = shopAssist.getStock(slot.reward);
			if (slot.purchaseLimit?.maxPurchases && !slot.purchaseLimit.remainingPurchases) continue;
			let neededFragments = null;
			let neededBuys = null;
			let limitedFragments = null;
			let limitedBuys = null
			if (slot.reward.subType == "fragment") {
				neededFragments = Math.max(slot.reward.requiredAmount-(stock.fragments||0),0);
				neededBuys = Math.ceil(neededFragments/slot.reward.amount);
				neededFragments = neededBuys * slot.reward.amount;
				limitedFragments = (slot.purchaseLimit?.remainingPurchases * slot.reward.amount) || slot.reward.requiredAmount;
				limitedBuys = Math.ceil(limitedFragments/slot.reward.amount);
			}
			h += `<tr>
			<td>${slot.reward.name}</td>`
			let costs = "",
				canBuy = true;
			Object.entries(slot.baseCost?.resources||{}).forEach(([res, amount])=>{
				let cost = Math.round(amount*(1-(slot.discount||0)))
				if (ResourceStock[res]<cost) canBuy = false;
				costs += `<div class="flexbetween ${ResourceStock[res]>=cost?"text-success":"text-danger"}">` + srcLinks.icons(res) + HTML.Format(cost) + "</div>"
			})
			h += `<td class="${canBuy ? "canBuy" : "canNotBuy"}">
				<div">${slot.purchaseLimit?.remainingPurchases||"∞"} x</div>
				${costs}
			</td>`
			h += `<td>
				<div>${stock.stock ? HTML.Format(stock.stock) : ""}</div>
				<div>${slot.reward.subType == "fragment" ? srcLinks.icons("icon_tooltip_fragment") + HTML.Format(stock.fragments||0)+"/"+slot.reward.requiredAmount : ""}</div>
			</td>`
			if (slot.reward.subType == "fragment") {
				costs = "";
				canBuy = true;
				Object.entries(slot.baseCost?.resources||{}).forEach(([res, amount])=>{
					let cost = Math.round(neededBuys * amount*(1-(slot.discount||0)))
					if (ResourceStock[res]<cost) canBuy = false;
					costs += `<div class="flexbetween ${ResourceStock[res]>=cost?"text-success":"text-danger"}">${srcLinks.icons(res) + HTML.Format(cost)}</div>`
				})
				h += `<td class="${canBuy ? "canBuy" : "canNotBuy"}">
					<div class="flexbetween"><span>${srcLinks.icons("icon_tooltip_fragment") + HTML.Format(neededFragments)}</span><span>(${neededBuys}x)</span></div>
					${costs}
				</td>`
				costs = "";
				canBuy = true;
				Object.entries(slot.baseCost?.resources||{}).forEach(([res, amount])=>{
					let cost = Math.round(limitedBuys * amount*(1-(slot.discount||0)))
					if (ResourceStock[res]<cost) canBuy = false;
					costs += `<div class="flexbetween ${ResourceStock[res]>=cost?"text-success":"text-danger"}">` + srcLinks.icons(res) + HTML.Format(cost) + "</div>"
				})
				h += `<td class="${canBuy ? "canBuy" : "canNotBuy"}">
						<div class="flexbetween">${srcLinks.icons("icon_tooltip_fragment") + HTML.Format(limitedFragments)}</div> 
						${costs}
					</td>`
			} else {
				h += `<td></td>`
				h += `<td></td>`
			}
			h+=`</tr>`
			
		}
		
		h += `</table>`
        
        
        $('#shopAssistBody').html(h);

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

	
};
