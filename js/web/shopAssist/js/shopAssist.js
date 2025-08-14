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
	if(!Settings.GetSetting('ShowShopAssist')) {
		return;
	}
	shopAssist.Show();
});

FoEproxy.addFoeHelperHandler('InventoryUpdated', () => {
	shopAssist.updateDialog();
});

let shopAssist = {

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
				title: i18n('Boxes.idleGame.Title'),
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

		let htmltext = `<table id="shopAssistTable" style="width:100%">`
        htmltext += `</table>;`
        
        
        $('#shopAssistBody').html(htmltext);

    },

	getStock: (reward) => {
		let stock = null,
			AssembledStock = null;
		if (reward.type == "building") {
			buildingId = reward.id.replace("building#","")
			stock = Object.values(MainParser.Inventory).find(x=>x.item.cityEntityId === buildingId)?.inStock || 0;
		}
		if (reward.type == "fragment") 
			AssembledStock = getStock(reward.assembledReward).stock;
		
		if (reward.subType == "selection_kit")
			stock = Object.values(MainParser.Inventory).find(x=>x.item.selectionKitId === reward.id)?.inStock || 0;
		if (reward.subType == "upgrade_kit")
			stock = Object.values(MainParser.Inventory).find(x=>x.item.upgradeItemId === reward.id)?.inStock || 0;
		if (reward.type == "unit") 
			stock = Object.values(Unit.Cache.counts).find(x=>x.unitTypeId === reward.unit.unitTypeId)?.unattached || "???";
		if (reward.type == "resource") 	{
			let id = /#(.*?)#/.exec(reward.id)?.[1];
			stock = ResourceStock[id]
		}
		if (!stock)
			stock = Object.values(MainParser.Inventory).find(x=>x.item.id === reward.id)?.inStock || 0;
		return {
			stock: stock,
			AssembledStock: AssembledStock
		}
			
	},

	
};
