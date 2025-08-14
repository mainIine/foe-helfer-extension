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
	/*if(!Settings.GetSetting('ShowShopAssist')) {
		return;
	}*/
	shopAssist.slots = data.responseData.slots;
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
        if ($('#shopAssist').length === 0) {
			HTML.AddCssFile('shopAssist');
        
			HTML.Box({
				id: 'shopAssist',
				title: i18n('Boxes.idleGame.ShopAssist'),
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

		let h = `<table id="shopAssistTable" style="width:100%">`
        
		h += `<tr>
			<th>Name</th>
			<th>Costs</th>
			<th>Available</th>
			<th colspan=2>Inventory amount</th>
			<th>needed</th>
			<th></th>
			</tr>`
		for (slot of shopAssist.slots) {
			stock = shopAssist.getStock(slot.reward);
			h += `<tr>
			<td>${slot.reward.name}</td>
			<td>${Object.entries(slot.baseCost.resources).map(([res, amount])=>(srcLinks.icons(res) + HTML.Format(amount))).join("")}</td>
			<td>x${slot.purchaseLimit.remainingPurchases}</td>
			<td>${stock.stock ? HTML.Format(stock.stock) : ""}</td>
			<td>${stock.fragments ? srcLinks.icons("icon_tooltip_fragment") + HTML.Format(stock.fragments) + "/" + HTML.Format(slot.reward.requiredAmount) : ""}</td>
			<td></td>
			</tr>`
			
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
			stock = Object.values(MainParser.Inventory).find(x=>x.item.id === reward.id || x.item.reward?.id===/(^.+?#[^#]*)/.exec(reward.id)?.[1])?.inStock || 0;
		return {
			stock: AssembledStock !== null ? AssembledStock : stock,
			fragments: AssembledStock !== null ? stock : null
		}
			
	},

	
};
