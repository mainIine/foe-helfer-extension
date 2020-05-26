InventoryTracker = function(){

    // private
    let tmp = {
        aux: {
            addInventoryAmount: (id, amount) => {
                if ( !id ){ return; }

                if ( !tmp.inventory[id] ){
                    tmp.aux.setInventoryAmount(id, amount);
                }

                let old = tmp.inventory[id].new;
                let newAmount = amount - old;
                tmp.inventory[id].new = amount;
                tmp.aux.setInventoryAmount(id, newAmount);
            },
            getInventoryFp: () => {
                let total = 0;

                for ( let [id, item] of Object.entries( tmp.inventory ) ){
                    let gain = item.gain;
                    if ( gain == 0 ){
                        switch( item.assetName ){
                            case 'small_forgepoints' : { gain = 2; break; }
                            case 'medium_forgepoints' : { gain = 5; break; }
                            case 'large_forgepoints' : { gain = 10; break; }
                        }
                        tmp.inventory[id].gain = gain;
                    }
                    total += item.inStock * gain;
                }
                return total;
            },
            setInventoryAmount: (id, amount) => {

                if ( !id ){ return; }

                if ( !tmp.inventory[id] ){
                    tmp.inventory[id] = { inStock: 0, gain: 0, name: '', new: 0, assetName: '' };
                }
                tmp.inventory[id].inStock = amount;
            },
        },
        debug: true,
        fp: {
            total: 0
        },
        initialized: false,
        // keep a copy of the inventory while this is work-in-progress
        inventory: {},
        updateFpStockPanel: () => {
            // StrategyPoints.ForgePointBar( tmp.fp.total );
            tmp.log(`Set ForgePointBar: ${tmp.fp.total} `);
        },
        log: (o) => {
            if ( tmp.debug ){ console.log(o); }
        }
    };


    // public
    let pub = {
        debug: () => {
            return {
                fp: tmp.fp.total,
                inventory: tmp.inventory,
            }
        },
        // fp: {
        //     addAfterLeveling: (data) => {
        //         tmp.log('pub.fp.addAfterLeveling: ');
        //         tmp.log(data);
        //
        //         if ( data && data['responseData'] && data['responseData']['strategy_point_amount'] ) {
        //             // tmp.fp.total = tmp.aux.getInventoryFp() + data.responseData.strategy_point_amount;
        //             tmp.fp.total = tmp.aux.getInventoryFp();
        //             tmp.updateFpStockPanel();
        //         }
        //         else {
        //             tmp.log('Invalid data: data.responseData.strategy_point_amount');
        //         }
        //     },
        // },
        init: () => {
            if ( tmp.initialized ){ return; }
            tmp.initialized = true;
            // tmp.log('Inventory Tracker');
        },
        inventory: {
            set: (data) => {

                if ( !data ){ return; }
                let total = 0;
                let items = data.filter( item => item.itemAssetName.indexOf( 'forgepoints' ) > -1 );
                for ( let [index, item] of items.entries() ) {
                    let o = {
                        inStock: item.inStock,
                        gain: item.item.resource_package.gain,
                        name: item.name,
                        new: item.new | 0,
                        asset: item.itemAssetName,
                    };
                    tmp.inventory[ item.id ] = o;
                    total += o.inStock * o.gain;
                }
                tmp.fp.total = total;
                tmp.updateFpStockPanel();
            },
            update: (data) => {
                if (data && ( data.length % 2 == 0 )){
                    for( var i = 0; i < data.length; i = i+2 ){
                        let id = data[i];
                        let value = data[i+1];
                        tmp.aux.setInventoryAmount(id, value);
                    }
                }
                tmp.fp.total = tmp.aux.getInventoryFp();
                tmp.updateFpStockPanel();
            },
            updateRewards: (data) => {
                if ( !data ){ return };
                for ( var i = 0; i < data.length; i++ ){
                    let item = data[i];
                    let id = item['itemId'];
                    let value = item['amount'];
                    tmp.aux.addInventoryAmount(id, value);
                }
                tmp.fp.total = tmp.aux.getInventoryFp();
                tmp.updateFpStockPanel();
            },
        },
    };

    return pub;
}();

// inventory update
FoEproxy.addHandler('InventoryService', 'getItems', (data, postData) => {
    InventoryTracker.init();
    console.log('InventoryService.getItems');
    InventoryTracker.inventory.set( data.responseData );
});

// inventory update
FoEproxy.addHandler('InventoryService', 'getInventory', (data, postData) => {
    console.log('InventoryService.getInventory');
    InventoryTracker.inventory.set(data.responseData.inventoryItems);
});

// inventory update
FoEproxy.addHandler('InventoryService', 'getItemsByType', (data, postData) => {
    console.log('InventoryService.getItemsByType');
    InventoryTracker.inventory.set(data.responseData);
});

// rewards from quests, FPs are added to a GB, FPs used for research
FoEproxy.addHandler('InventoryService', 'getItemAmount', (data, postData) => {
    console.log('InventoryService.getItemAmount');
    console.log(data.responseData);
    InventoryTracker.inventory.update(data.responseData);
});

// when a great building where the player hag invested has been levelled
FoEproxy.addHandler('BlueprintService','newReward', (data, postData) => {
    // console.log('BlueprintService.newReward');
    // InventoryTracker.fp.addAfterLeveling( data );
});

// debug
FoEproxy.addRawWsHandler( data => {
    if ( !data || !data[0] ){ return; }
    let requestClass = data[0].requestClass;
    let requestMethod = data[0].requestMethod;
    let responseData = data[0].responseData;
    if ( requestClass == 'NoticeIndicatorService' && requestMethod == 'getPlayerNoticeIndicators' ){
        console.log( `NoticeIndicatorService.getPlayerNoticeIndicators` );
        console.log( responseData );
        if ( responseData ) {
            InventoryTracker.inventory.updateRewards(responseData);
        }
    }
});