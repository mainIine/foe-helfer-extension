/**
 * @type {{init: init, debug: (function(): {fp: number, inventory: {}})}}
 */
InventoryTracker = function () {

	// private
	let tmp = {

		debug: false,

		aux: {
			getInventoryFp: () => {
				let total = 0;

				for (let [id, item] of Object.entries(tmp.inventory)) {
					let gain = 0;
					switch (item['itemAssetName']) {
						case 'small_forgepoints' : {
							gain = 2;
							break;
						}
						case 'medium_forgepoints' : {
							gain = 5;
							break;
						}
						case 'large_forgepoints' : {
							gain = 10;
							break;
						}
					}
					let itemNew = item.new | 0;
					total += (item.inStock - itemNew) * gain;
				}
				return total;
			},
			setInventoryAmount: (id, amount) => {

				if (!id) {
					return;
				}

				if (!tmp.inventory[id]) {
					tmp.inventory[id] = {inStock: 0};
				}
				tmp.inventory[id].inStock = amount;
			},
		},

		action: {

			init: () => {
				if (tmp.initialized) {
					return;
				}
				tmp.initialized = true;
			},

			inventory: {
				addItem: (data) => {
					if (!data['id']) {
						return;
					}

					data.inStock = data.inStock | 0;
					data.new = data.new | 0;
					tmp.inventory[data['id']] = data;

					tmp.fp.total = tmp.aux.getInventoryFp();
					tmp.updateFpStockPanel();
				},

				resetNew: () => {
					for (let [id, item] of Object.entries(tmp.inventory)) {
						tmp.inventory[id].new = 0;
					}
				},

				set: (data) => {

					tmp.inventory = {};

					if (!data) {
						return;
					}
					let items = data.filter(item => item.itemAssetName.indexOf('forgepoints') > -1);
					for (let [index, item] of items.entries()) {
						tmp.inventory[item.id] = item;
					}
					tmp.fp.total = tmp.aux.getInventoryFp();
					tmp.updateFpStockPanel();
				},

				update: (data) => {

					if (data && (data.length % 2 === 0)) {
						for (let i = 0; i < data.length; i = i + 2) {
							let id = data[i];
							let value = data[i + 1];
							tmp.aux.setInventoryAmount(id, value);
						}
					}
					tmp.fp.total = tmp.aux.getInventoryFp();
					tmp.updateFpStockPanel();
				},
			},
		},

		fp: {
			total: 0
		},

		handlers: {

			addInventoryHandlers: () => {

				// an item which is not yet in the inventory is received
				FoEproxy.addHandler('InventoryService', 'getItem', (data, postData) => {
					tmp.log('InventoryService.getItem');
					tmp.log(data.responseData);
					if (data.responseData) {
						tmp.action.inventory.addItem(data.responseData);
					}
				});

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

				FoEproxy.addRawWsHandler(data => {
					if (!data || !data[0]) {
						return;
					}
					let requestClass = data[0].requestClass;
					let requestMethod = data[0].requestMethod;

					if (requestClass === 'InventoryService' && requestMethod === 'getItem') {
						tmp.log('WS InventoryService.getItem');
						tmp.log(data[0].responseData);
						if (data[0].responseData) {
							tmp.action.inventory.addItem(data[0].responseData);
						}
					}

					if (requestClass === 'InventoryService' && requestMethod === 'getItemAmount') {
						tmp.log('WS InventoryService.getItemAmount');
						tmp.log(data[0].responseData);
						if (data[0].responseData) {
							tmp.action.inventory.update(data[0].responseData);
						}
					}
				});
			},
		},

		initialized: false,

		// keep a copy of the inventory while this is work-in-progress
		inventory: {},

		updateFpStockPanel: () => {
			StrategyPoints.RefreshBar(tmp.fp.total);
			tmp.log(`Set ForgePointBar: ${tmp.fp.total} `);
		},

		log: (o) => {
			if (tmp.debug) {
				console.log(o);
			}
		}
	};


	// public
	return {
		debug: () => {
			return {
				fp: tmp.fp.total,
				inventory: tmp.inventory,
				// new: tmp.new.data,
			}
		},
		init: () => {
			tmp.handlers.addInventoryHandlers();
			tmp.handlers.addOtherHandlers();
			tmp.handlers.addRawHandlers();
		},
	};
}();

InventoryTracker.init();