InventoryTracker = function(){

    // Known issues:
    //  - when there are no 5-fp packs in the inventory and the player receives a new 5-fp pack
    //  from a (recurring) quest, the new pack will not be counted. It is added to the inventory
    //  and it will be correctly counted when the inventory updates.
    //  Unfortunately, the InventoryService.getItem is not triggered for the reward collection, so there
    //  is no way to correctly initialize the inventory (we don't know that we've received a 5-fp pack
    //  because there is no matching item id in the inventory)
    //  Maybe we could guess, i.e. if the 10-fp and 2-fp packs are in the inventory and we add an unlabeled
    //  fp pack with an id different than the other two (10-fp and 2-fp packs) we could guess that a 5-fp
    //  pack has been added
    //  - the above (guessing game) works only if the fp pack ids don't change, but I've seen them change
    //  occasionally

    // private
    let tmp = {
        aux: {
            addInventoryAmount: (id, amount) => {

                if ( !tmp.inventory[id] ){
                    tmp.aux.setInventoryAmount(id, amount);
                }
                let asset = tmp.inventory[id]['itemAssetName'];

                let old = tmp.new.get(asset);
                let newAmount = tmp.inventory[id].inStock + amount - old;
                tmp.new.set(asset, amount);
                tmp.aux.setInventoryAmount(id, newAmount);
            },
            getInventoryFp: () => {
                let total = 0;

                for ( let [id, item] of Object.entries( tmp.inventory ) ){
                    let gain = 0;
                    switch( item['itemAssetName'] ){
                        case 'small_forgepoints' : { gain = 2; break; }
                        case 'medium_forgepoints' : { gain = 5; break; }
                        case 'large_forgepoints' : { gain = 10; break; }
                    }
                    let itemNew = item.new | 0;
                    total += ( item.inStock - itemNew ) * gain;
                }
                return total;
            },
            setInventoryAmount: (id, amount) => {

                if ( !id ){ return; }

                if ( !tmp.inventory[id] ){
                    tmp.inventory[id] = { inStock: 0 };
                }
                tmp.inventory[id].inStock = amount;
            },
        },
        action: {
            init: () => {
                if ( tmp.initialized ){ return; }
                tmp.initialized = true;

                // load new values
                tmp.new.init();
            },
            inventory: {
                addItem: (data) => {
                    if( !data['id'] ){ return; }

                    data.inStock = 0;
                    data.new = 0;
                    tmp.inventory[data['id']] = data;
                },
                resetNew: () => {
                    tmp.new.reset();
                    for ( let [id, item] of Object.entries( tmp.inventory ) ){
                        tmp.inventory[id].new = 0;
                    }
                },
                set: (data) => {

                    tmp.inventory = {};

                    if ( !data ){ return; }
                    let items = data.filter( item => item.itemAssetName.indexOf( 'forgepoints' ) > -1 );
                    for ( let [index, item] of items.entries() ) {
                        tmp.inventory[ item.id ] = item;
                    }
                    tmp.fp.total = tmp.aux.getInventoryFp();
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
                        if ( id && value ) {
                            tmp.aux.addInventoryAmount( id, value );
                        }
                    }
                    tmp.fp.total = tmp.aux.getInventoryFp();
                    tmp.updateFpStockPanel();
                },
            },
        },
        debug: false,
        fp: {
            total: 0
        },
        handlers: {
            addInventoryHandlers: () => {

                FoEproxy.addHandler('InventoryService', 'getItems', (data, postData) => {
                    tmp.action.init();
                    tmp.log('InventoryService.getItems');
                    tmp.log(data.responseData);
                    tmp.action.inventory.set(data.responseData);
                });

                FoEproxy.addHandler('InventoryService', 'getItemsByType', (data, postData) => {
                    tmp.log('InventoryService.getItemsByType');
                    tmp.log(data.responseData);
                    tmp.action.inventory.set(data.responseData);
                });

                FoEproxy.addHandler('InventoryService', 'getItemsByType', (data, postData) => {
                    tmp.log('InventoryService.getItemsByType');
                    tmp.log(data.responseData);
                    tmp.action.inventory.set(data.responseData);
                });

                FoEproxy.addHandler('InventoryService', 'getItemAmount', (data, postData) => {
                    tmp.log('InventoryService.getItemAmount');
                    tmp.log(data.responseData);
                    tmp.action.inventory.update(data.responseData);
                });
            },
            addOtherHandlers: () => {

                FoEproxy.addHandler('NoticeIndicatorService', 'removePlayerItemNoticeIndicators', (data, postData) => {
                    tmp.log('NoticeIndicatorService.removePlayerItemNoticeIndicators');
                    tmp.log(data.responseData);
                    tmp.action.inventory.resetNew();
                });
            },
            addRawHandlers: () => {

                FoEproxy.addRawWsHandler( data => {
                    if ( !data || !data[0] ){ return; }
                    let requestClass = data[0].requestClass;
                    let requestMethod = data[0].requestMethod;
                    if ( requestClass == 'NoticeIndicatorService' && requestMethod == 'getPlayerNoticeIndicators' ){
                        tmp.log( 'NoticeIndicatorService.getPlayerNoticeIndicators' );
                        tmp.log( data[0].responseData );
                        if ( data[0].responseData ) {
                            tmp.action.inventory.updateRewards( data[0].responseData );
                        }
                    }
                    if ( requestClass == 'InventoryService' && requestMethod == 'getItem' ){
                        tmp.log('InventoryService.getItem');
                        tmp.log( data[0].responseData );
                        if( data[0].responseData ){
                            tmp.action.inventory.addItem( data[0].responseData );
                        }
                    }
                });
            },
        },
        initialized: false,
        // keep a copy of the inventory while this is work-in-progress
        inventory: {},
        new: {
            data: {
                'small_forgepoints': 0,
                'medium_forgepoints': 0,
                'large_forgepoints': 0,
            },
            get: (id) => {
                return tmp.new.data[id] | 0;
            },
            init: () => {
                tmp.new.data['small_forgepoints'] = localStorage.getItem('small_forgepoints') | 0;
                tmp.new.data['medium_forgepoints'] = localStorage.getItem('medium_forgepoints') | 0;
                tmp.new.data['large_forgepoints'] = localStorage.getItem('large_forgepoints') | 0;
            },
            reset: () => {
                tmp.new.set('small_forgepoints', 0);
                tmp.new.set('medium_forgepoints', 0);
                tmp.new.set('large_forgepoints', 0);
            },
            set: (id, value) => {
                if( tmp.new.data[id] !== undefined ){
                    tmp.new.data[id] = value;
                    localStorage.setItem(id, value);
                }
            },
        },
        updateFpStockPanel: () => {
            StrategyPoints.RefreshBar( tmp.fp.total );
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
                new: tmp.new.data,
            }
        },
        init: () => {
            tmp.handlers.addInventoryHandlers();
            tmp.handlers.addOtherHandlers();
            tmp.handlers.addRawHandlers();
        },
    };

    return pub;
}();

InventoryTracker.init();