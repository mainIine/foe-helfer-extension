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

// A store has been opened: take over slots, unlock progress and discount state
FoEproxy.addHandler('ItemStoreService', 'getStore', (data, postData) => {
	shopAssist.slots = data.responseData.slots;
	shopAssist.storeId = data.responseData.id;
	shopAssist.unlockProgress = Object.assign({}, ...data.responseData.unlockConditionsProgress.map(x => ({ [`${x.type}#${x.subtype || x.context}`]: x.amount })));

	// reset, check once for the freshly opened store, then reset again so the
	// same alerts may fire again on the next resource update
	shopAssist.alertsTriggered = {};
	shopAssist.checkAlerts();
	shopAssist.alertsTriggered = {};

	// only show discounts if the store refreshes within the next 24h
	shopAssist.showDiscount = data.responseData.refresh?.refreshAt - GameTime.get() < 24 * 3600;

	if ($('#shopAssist-Btn').hasClass('hud-btn-red')) {
		$('#shopAssist-Btn').removeClass('hud-btn-red');
		$('#shopAssist-Btn-closed').remove();
	}

	if ($('#shopAssist').length === 0 && !Settings.GetSetting('ShowShopAssist')) return;
	shopAssist.Show();
});

// A slot has been bought: update it and refresh the box. The new inventory
// stock arrives in the same response batch as InventoryService.updateItem
// and is applied centrally by MainParser.UpdateInventoryItemAmount.
FoEproxy.addHandler('ItemStoreService', 'purchaseSlot', (data, postData) => {
	const i = shopAssist.slots.findIndex(x => x.slotId === data.responseData.slot.slotId);
	if (i === -1) return;
	shopAssist.slots[i] = data.responseData.slot;

	if ($('#shopAssist').length === 0) return;
	shopAssist.Show();
});

// The store has been refreshed: take over the new slots
FoEproxy.addHandler('ItemStoreService', 'refreshStore', (data, postData) => {
	shopAssist.slots = data.responseData.slots;
	shopAssist.storeId = data.responseData.id;
	shopAssist.unlockProgress = Object.assign(shopAssist.unlockProgress, ...data.responseData.unlockConditionsProgress.map(x => ({ [`${x.type}#${x.subtype || x.context}`]: x.amount })));

	if ($('#shopAssist').length === 0) return;
	shopAssist.Show();
});

// Store metadata received: cache it and clean up stale favourites/alerts
FoEproxy.addHandler('ItemStoreService', 'getConfigs', (data, postData) => {
	shopAssist.shopMeta = Object.assign({}, ...data.responseData.map(x => ({ [x.id]: x })));

	// cleanup old shop favourites data
	let cleaned = false;
	for (const shopId of Object.keys(shopAssist.favourites)) {
		if (!shopAssist.shopMeta[shopId]) {
			delete shopAssist.favourites[shopId];
			cleaned = true;
		}
	}
	if (cleaned) localStorage.setItem('shopAssist.favourites', JSON.stringify(shopAssist.favourites));

	// cleanup old shop alerts data
	cleaned = false;
	for (const key of Object.keys(shopAssist.alerts)) {
		const shopId = key.split('#')[0];
		if (!shopAssist.shopMeta[shopId]) {
			delete shopAssist.alerts[key];
			cleaned = true;
		}
	}
	if (cleaned) localStorage.setItem('shopAssist.alerts', JSON.stringify(shopAssist.alerts));

	localStorage.setItem('shopAssist.shopMeta', JSON.stringify(shopAssist.shopMeta));
});

// Unlock progress changed: merge the deltas for the currently open store
FoEproxy.addHandler('ItemStoreService', 'updateUnlockConditions', (data, postData) => {
	for (const shop of data.responseData) {
		if (shop.id !== shopAssist.storeId) continue;
		for (const cond of shop.unlockConditionsProgress) {
			shopAssist.unlockProgress[`${cond.type}#${cond.subtype || cond.context}`] += cond.amount;
		}
	}
	if ($('#shopAssist').length === 0) return;
	shopAssist.timeout = setTimeout(shopAssist.Show, 100);
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

/**
 * Shop assistant: augments ingame item stores (event shops, antique dealer
 * style stores etc.) with stock info, affordability, unlock progress,
 * favourites, purchase alerts and currency filters.
 */
let shopAssist = {

	/** @type {Object[]|null} slots of the currently open store */
	slots: null,

	/** @type {string|null} id of the currently open store */
	storeId: null,

	/** @type {Object<string, boolean>} alert keys that already fired a toast */
	alertsTriggered: {},

	/** @type {Object<string, Object>} store metadata by store id */
	shopMeta: JSON.parse(localStorage.getItem('shopAssist.shopMeta') || '{}'),

	/** @type {Object<string, Object<string, boolean>>} favourite slots by store id */
	favourites: JSON.parse(localStorage.getItem('shopAssist.favourites') || '{}'),

	/** @type {boolean} show favourite slots only */
	favouritesOnly: JSON.parse(localStorage.getItem('shopAssist.favouritesOnly') || 'false'),

	/** @type {boolean} show unlocked slots only */
	unlockedOnly: JSON.parse(localStorage.getItem('shopAssist.unlockedOnly') || 'false'),

	/** @type {Object<string, boolean>} currency visibility filter (currency id => visible) */
	currencyfilter: {},

	/** @type {Object<string, Object>} slot snapshots with active purchase alerts, keyed by "storeId#slotId" */
	alerts: JSON.parse(localStorage.getItem('shopAssist.alerts') || '{}'),

	/** @type {Object<string, number>} unlock progress by "conditionType#context" */
	unlockProgress: {},

	/** @type {Object<string, string>} pre-rendered tooltip HTML by slot id (+ suffix) */
	allTTContent: {},

	/** @type {boolean} whether discounts should be displayed */
	showDiscount: false,

	/** @type {number|null} debounce handle for delayed redraws */
	timeout: null,


	/**
	 * Opens the shop assistant box (creates it if necessary) and renders its content
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
				resize: true,
				popout: 'MainParser.PopOut(\'shopAssist\', 800, 700)',
				settings: 'shopAssist.ShowSettings()',
			});
		}

		shopAssist.updateDialog();
	},


	/**
	 * Renders the shop table into the box body and wires up all event handlers
	 */
	updateDialog: () => {
		shopAssist.allTTContent = {};
		if ($('#shopAssist').length === 0) return;

		const shopData = shopAssist.shopMeta[shopAssist.storeId];
		if (!shopData) return;

		// currency header including the click filter state
		const newFilter = {};
		let resources = '';
		for (const res of shopData.resources) {
			newFilter[res] = shopAssist.currencyfilter[res] ?? true;
			resources += `<span class="shopResource${newFilter[res] ? ' active' : ''} clickable" data-original-title="${i18n('Boxes.ShopAssist.filterCurrency')}" data-currency="${res}">${HTML.Format(ResourceStock[res] || 0)}${srcLinks.icons(res)}</span>`;
		}
		shopAssist.currencyfilter = newFilter;

		let h = `<table class="shopAssistTable foe-table" style="width:100%">
			<thead>
				<tr>
					<th colspan=5>
						<input type="checkbox" id="shopAssistFav" class="clickable"><label for="shopAssistFav" class="clickable">&nbsp;${i18n('Boxes.ShopAssist.onlyFavourites')}</label>
						<input type="checkbox" id="shopAssistUnlock" class="clickable"><label for="shopAssistUnlock" class="clickable">&nbsp;${i18n('Boxes.ShopAssist.onlyUnlocked')}</label>
					</th>
					<th colspan=3>
						${resources}
					</th>
				</tr>
				<tr>
					<th>★</th>
					<th></th>
					<th>${i18n('Boxes.ShopAssist.Item')}</th>
					<th>🔒</th>
					<th>${i18n('Boxes.ShopAssist.Inventory')}</th>
					<th>${i18n('Boxes.ShopAssist.Single')}</th>
					<th>${i18n('Boxes.ShopAssist.Missing')}</th>
					<th>${i18n('Boxes.ShopAssist.Max')}</th>
				</tr>
			</thead>`;

		// render available slots first, sold out ones last
		const soldOutSlots = [];
		for (const slot of shopAssist.slots) {
			const alertKey = `${shopAssist.storeId}#${slot.slotId}`;
			if (shopAssist.alerts[alertKey]) shopAssist.alerts[alertKey] = structuredClone(slot); // update alert data

			if (slot.purchaseLimit?.maxPurchases && !slot.purchaseLimit.remainingPurchases) {
				soldOutSlots.push(slot);
				continue;
			}
			h += shopAssist.renderSlotRow(slot);
		}
		for (const slot of soldOutSlots) {
			h += shopAssist.renderSlotRow(slot);
		}
		h += `</table>`;

		$('#shopAssistBody').html(h);

		const hasFavourites = Object.keys(shopAssist.favourites[shopAssist.storeId] || {}).length > 0;
		shopAssist.setupTableToggle('#shopAssistFav', 'favouritesOnly', shopAssist.favouritesOnly && hasFavourites);
		shopAssist.setupTableToggle('#shopAssistUnlock', 'unlockedOnly', shopAssist.unlockedOnly);

		$('.shopFavourite').on('click', (e) => {
			const id = e.currentTarget.dataset.id;
			if (!shopAssist.favourites[shopAssist.storeId]) shopAssist.favourites[shopAssist.storeId] = {};
			if (shopAssist.favourites[shopAssist.storeId][id]) {
				delete shopAssist.favourites[shopAssist.storeId][id];
			} else {
				shopAssist.favourites[shopAssist.storeId][id] = true;
			}
			localStorage.setItem('shopAssist.favourites', JSON.stringify(shopAssist.favourites));
			e.currentTarget.parentNode.parentNode.classList.toggle('isShopFavourite');
		});

		$('.shopAlert').on('click', (e) => {
			const id = e.currentTarget.dataset.id;
			if (!shopAssist.alerts[id]) {
				const slotId = id.split('#')[1];
				shopAssist.alerts[id] = structuredClone(shopAssist.slots.find(x => x.slotId === slotId));
			} else {
				delete shopAssist.alerts[id];
			}
			localStorage.setItem('shopAssist.alerts', JSON.stringify(shopAssist.alerts));
			e.currentTarget.classList.toggle('alertActive');
		});

		const checkCurrencyFilters = () => {
			for (const res of $('.shopResource')) {
				$(`.currency-${res.dataset.currency}`).addClass('currencyFiltered');
			}
			for (const res of $('.shopResource.active')) {
				$(`.currency-${res.dataset.currency}`).removeClass('currencyFiltered');
			}
		};
		$('.shopResource').on('click', (e) => {
			const res = e.currentTarget.dataset.currency;
			shopAssist.currencyfilter[res] = !shopAssist.currencyfilter[res];
			e.currentTarget.classList.toggle('active');
			checkCurrencyFilters();
		});
		checkCurrencyFilters();

		$('[data-original-title]').tooltip({ container: 'body' });
		localStorage.setItem('shopAssist.alerts', JSON.stringify(shopAssist.alerts));
	},


	/**
	 * Wires up a table filter checkbox that toggles a css class on the table and persists its state
	 *
	 * @param {string} selector jQuery selector of the checkbox
	 * @param {string} key property name on shopAssist, also used as css class and localStorage suffix
	 * @param {boolean} state initial checked state
	 */
	setupTableToggle: (selector, key, state) => {
		$(selector).prop('checked', state);
		$('.shopAssistTable').toggleClass(key, state);
		$(selector).on('change', (e) => {
			shopAssist[key] = e.currentTarget.checked;
			localStorage.setItem(`shopAssist.${key}`, JSON.stringify(shopAssist[key]));
			$('.shopAssistTable').toggleClass(key, shopAssist[key]);
		});
	},


	/**
	 * Collects the unlock requirements of a slot
	 *
	 * @param {Object} slot slot data from the store service
	 * @returns {{progress: number, required: number, icon: function(): string}[]} one entry per requirement; icon is rendered lazily
	 */
	unlockRequirements: (slot) => {
		const requirements = [];
		for (const cond of slot.unlockConditions || []) {
			if (cond.type === 'resource_spend') {
				for (const [res, amount] of Object.entries(cond.resourcesVO?.resources || {})) {
					requirements.push({
						progress: shopAssist.unlockProgress[`${cond.type}#${res}`] || 0,
						required: amount,
						icon: () => srcLinks.icons(res)
					});
				}
			} else if (cond.type === 'grand_prize_progress') {
				requirements.push({
					progress: shopAssist.unlockProgress[`${cond.type}#${cond.context}`] || 0,
					required: cond.amount,
					icon: () => srcLinks.regEx(RegExp(`store.*?${cond.context.replace('_event', '')}.*?grand_prize`))
				});
			} else if (cond.type === 'rarity') {
				const rarity = cond.rarityPurchase.rarity.value;
				requirements.push({
					progress: shopAssist.unlockProgress[`${cond.type}#${rarity}`] || 0,
					required: cond.rarityPurchase.amount,
					icon: () => `<img alt="" src="${srcLinks.get(`/item_store/store_shared/item_store_rarity_icon_${rarity}.png`, true)}">`
				});
			}
		}
		return requirements;
	},


	/**
	 * Renders the cost lines of a slot for a given amount of purchases
	 *
	 * @param {Object} slot slot data from the store service
	 * @param {number} multiplier number of purchases the costs are multiplied with
	 * @param {boolean} [markDiscount] highlight the costs as discounted
	 * @returns {{html: string, canBuy: boolean}} rendered cost lines and whether the player can afford them
	 */
	costRows: (slot, multiplier, markDiscount = false) => {
		let html = '';
		let canBuy = true;
		for (const [res, amount] of Object.entries(slot.baseCost?.resources || {})) {
			const cost = multiplier * Math.ceil(amount * (1 - (slot.discount || 0)));
			if ((ResourceStock[res] || 0) < cost) canBuy = false;
			html += `<div class="text-right${markDiscount ? ' shopDiscount' : ''}">${HTML.Format(cost)}${srcLinks.icons(res)}</div>`;
		}
		return { html, canBuy };
	},


	/**
	 * Renders a tooltip table showing the costs for a given amount of purchases
	 *
	 * @param {string} title tooltip headline
	 * @param {Object} slot slot data from the store service
	 * @param {number} buys number of purchases
	 * @param {boolean} unlocked whether the slot is unlocked
	 * @param {boolean} limitReached whether the purchase limit is exhausted
	 * @returns {string} tooltip HTML
	 */
	ttCostTable: (title, slot, buys, unlocked, limitReached) => {
		const { html, canBuy } = shopAssist.costRows(slot, buys);
		const fragments = slot.reward.subType === 'fragment' && buys > 0 && buys < Infinity
			? `<span>${srcLinks.icons('icon_tooltip_fragment')}${HTML.Format(buys * slot.reward.amount)}</span>`
			: '';
		return `<table class="foe-table shopAssistTable">
				<tr><th>${title}</th></tr>
				<tr><td class="costs ${canBuy && !limitReached && unlocked ? 'canBuy' : 'canNotBuy'}">
					<div>${fragments} <span>(${buys}x)</span></div>
					${html}
				</td></tr>
			</table>`;
	},


	/**
	 * Renders one table row for a store slot and registers its tooltips
	 *
	 * @param {Object} slot slot data from the store service
	 * @returns {string} row HTML
	 */
	renderSlotRow: (slot) => {
		const stock = shopAssist.getStock(slot.reward);
		const isFragment = slot.reward.subType === 'fragment';
		const limitedBuys = slot.purchaseLimit ? slot.purchaseLimit.remainingPurchases || 0 : Infinity;
		const limitReached = !!(slot.purchaseLimit?.maxPurchases && !slot.purchaseLimit.remainingPurchases);
		const isDiscounted = (slot.discount || 0) > 0 && shopAssist.showDiscount;
		const buildingList = shopAssist.getBuildingIds(slot.reward);

		const requirements = shopAssist.unlockRequirements(slot);
		const hasLock = (slot.unlockConditions?.length || 0) > 0;
		const unlocked = requirements.every(r => r.progress >= r.required);

		let neededFragments = null;
		let neededBuys = null;
		if (isFragment) {
			neededFragments = Math.max(slot.reward.requiredAmount - ((stock.fragments || 0) % slot.reward.requiredAmount), 0);
			neededBuys = Math.ceil(neededFragments / slot.reward.amount);
			neededFragments = neededBuys * slot.reward.amount;
		}

		const rowClasses = [
			...Object.keys(slot.baseCost?.resources || {}).map(res => `currency-${res}`),
			shopAssist.favourites[shopAssist.storeId]?.[slot.slotId] ? 'isShopFavourite' : '',
			unlocked ? 'isUnlocked' : '',
			hasLock ? 'hasLock' : '',
			limitReached ? 'soldOut' : ''
		].filter(Boolean).join(' ');

		// favourites + alerts
		let h = `<tr class="${rowClasses}">
			<td>
				<div class="shopFavourite clickable" data-id="${slot.slotId}"></div>
				<div class="shopAlert clickable ${shopAssist.alerts[`${shopAssist.storeId}#${slot.slotId}`] ? 'alertActive' : ''}" data-id="${shopAssist.storeId}#${slot.slotId}"></div>
			</td>`;

		// rarity
		h += `<td>
			<img src="${(slot.rarity?.value || 'none') !== 'none' ? srcLinks.get(`/item_store/store_shared/item_store_rarity_icon_${slot.rarity.value}.png`, true, true) : ''}" alt="">
		</td>`;

		// name (with building or ally tooltip)
		h += `<td data-ids="${buildingList}" class="fh-tooltip" data-callback_tt="${buildingList.length > 0 ? 'shopAssist.TT' : 'shopAssist.allTT'}" data-slotid="${slot.slotId}A">${(slot.reward.target ? srcLinks.icons(`booster_target_${slot.reward.target}`) : '') + slot.reward.name}</td>`;
		if (slot.reward?.assembledReward?.type === 'ally') {
			shopAssist.allTTContent[`${slot.slotId}A`] = `<table class="foe-table shopAssistTable">
					<tr><th><img src=${srcLinks.get(`/historical_allies/portraits/historical_allies_portrait_ally_${slot.reward.assembledReward.iconAssetName}.png`, true)} style="height:unset">
					${Allies.rarityStars(slot.reward.assembledReward.rarity.value)}</th></tr>
					<tr><td> ${Allies.boosts(slot.reward.assembledReward.boosts)}</td></tr>
				</table>`;
		}

		// unlock conditions
		let lockInfo = '';
		if (hasLock && !unlocked) {
			lockInfo = '🔒' + requirements.map(r => `<div class="text-right">${HTML.Format(r.progress)}/${r.required}${r.icon()}</div>`).join('');
		}
		h += `<td class="${unlocked ? '' : 'locked'}">
			${lockInfo}
		</td>`;

		// inventory
		h += `<td>
			<div>${stock.stock ? HTML.Format(stock.stock) : ''}</div>
			<div>${isFragment ? `${srcLinks.icons('icon_tooltip_fragment')}${HTML.Format(stock.fragments || 0)}/${HTML.Format(slot.reward.requiredAmount)}` : ''}</div>
		</td>`;

		// costs: single purchase
		const single = shopAssist.costRows(slot, 1, isDiscounted);
		h += `<td class="costs ${single.canBuy && !limitReached && unlocked ? 'canBuy' : 'canNotBuy'}">
			${single.html}
		</td>`;

		// costs: complete the next assembly (fragments only) + "full" tooltip
		if (isFragment) {
			const complete = shopAssist.costRows(slot, neededBuys);
			h += `<td class="costs ${complete.canBuy && !limitReached && unlocked ? 'canBuy' : 'canNotBuy'} fh-tooltip" data-callback_tt="shopAssist.allTT" data-slotid="${slot.slotId}F">
				<div><span>${srcLinks.icons('icon_tooltip_fragment')}${HTML.Format(neededFragments)}</span> <span>(${neededBuys}x)</span></div>
				${complete.html}
			</td>`;

			if (neededFragments < slot.reward.requiredAmount) {
				const fullBuys = Math.floor(slot.reward.requiredAmount / slot.reward.amount);
				shopAssist.allTTContent[`${slot.slotId}F`] = shopAssist.ttCostTable(i18n('Boxes.ShopAssist.Full'), slot, fullBuys, unlocked, limitReached);
			}
		} else {
			h += `<td></td>`;
		}

		// costs: maximum affordable purchases
		let maxBuys = Math.min(slot.flag?.value === 'increasingCosts' ? 1 : Infinity, limitedBuys);
		if (maxBuys > 0) {
			for (const [res, amount] of Object.entries(slot.baseCost?.resources || {})) {
				maxBuys = Math.min(maxBuys, Math.floor((ResourceStock[res] || 0) / Math.ceil(amount * (1 - (slot.discount || 0)))));
			}
		}
		const maxCosts = maxBuys !== Infinity && maxBuys > 0 ? shopAssist.costRows(slot, maxBuys).html : '';
		const maxHasTT = limitedBuys > 0 && limitedBuys < Infinity;
		const maxFragments = isFragment && maxBuys !== Infinity && maxBuys !== 0
			? `<span>${srcLinks.icons('icon_tooltip_fragment')}${HTML.Format(maxBuys * slot.reward.amount)}</span>`
			: '';
		const maxSuffix = slot.flag?.value !== 'increasingCosts' && maxHasTT
			? `/${limitedBuys}`
			: (slot.flag?.value === 'increasingCosts' && limitedBuys > 0 ? '/?' : 'x');
		h += `<td class="costs ${maxBuys > 0 && (maxBuys === limitedBuys || limitedBuys === Infinity) ? 'canBuy' : ''}${maxHasTT ? ' fh-tooltip' : ''}"${maxHasTT ? ` data-callback_tt="shopAssist.allTT" data-slotid="${slot.slotId}"` : ''}>
				<div>
					${maxFragments}
					<span>(<span class="${maxBuys > 0 ? 'buyable' : ''}">${maxBuys}</span>${maxSuffix})</span>
				</div>
				${maxCosts}
			</td>`;
		h += `</tr>`;

		// "buy all remaining" tooltip
		if (maxHasTT && limitedBuys > maxBuys) {
			shopAssist.allTTContent[slot.slotId] = shopAssist.ttCostTable(i18n('Boxes.ShopAssist.All'), slot, limitedBuys, unlocked, limitReached);
		}

		return h;
	},


	/**
	 * Finds the inventory entry a reward is stored in
	 *
	 * @param {Object} reward reward data of a slot
	 * @returns {Object|null} inventory entry from MainParser.Inventory or null (also for rewards not kept in the inventory)
	 */
	findInventoryEntry: (reward) => {
		if (reward.type === 'unit' || reward.type === 'resource') return null;

		const inventory = Object.values(MainParser.Inventory);
		if (reward.type === 'building') {
			const buildingId = reward.id.replace('building#', '');
			return inventory.find(x => x.item.cityEntityId === buildingId) || null;
		}
		if (reward.subType === 'selection_kit') {
			return inventory.find(x => x.item.selectionKitId === reward.id) || null;
		}
		if (reward.subType === 'upgrade_kit') {
			return inventory.find(x => x.item.upgradeItemId === reward.id) || null;
		}
		return inventory.find(x => x.item.id === reward.id || (x.item.reward?.id && x.item.reward?.id === /(^.*?#(\(.*?\)|[^#])*)/.exec(reward.id)?.[1])) || null;
	},


	/**
	 * Determines the current inventory stock for a reward
	 *
	 * @param {Object} reward reward data of a slot
	 * @returns {{stock: number|string|null, fragments: number|null}} owned amount (of the assembled item for fragments) and owned fragment count
	 */
	getStock: (reward) => {
		let stock = null;
		let assembledStock = null;

		if (reward.subType === 'fragment') {
			assembledStock = shopAssist.getStock(reward.assembledReward).stock;
		}
		if (reward.type === 'unit') {
			stock = Object.values(Unit?.Cache?.counts || {}).find(x => x.unitTypeId === reward.unit.unitTypeId)?.unattached || '???';
		} else if (reward.type === 'resource') {
			const id = /#(.*?)#/.exec(reward.id)?.[1];
			stock = ResourceStock[id] ?? 0;
		} else {
			stock = shopAssist.findInventoryEntry(reward)?.inStock || 0;
		}

		return {
			stock: assembledStock !== null ? assembledStock : stock,
			fragments: assembledStock !== null ? stock : null
		};
	},


	/**
	 * Collects all city entity ids a reward can resolve to (directly, via kits or chests)
	 *
	 * @param {Object} reward reward data of a slot
	 * @returns {string[]} unique list of city entity ids
	 */
	getBuildingIds: (reward) => {
		let ids = [];
		const getFromUpgrade = (id) => {
			const steps = MainParser.BuildingUpgrades[id]?.upgradeSteps || [];
			return steps[steps.length - 1]?.buildingIds || [];
		};

		if (reward.type === 'building') {
			ids.push(reward.subType);
		} else if (reward.subType === 'fragment') {
			ids.push(...shopAssist.getBuildingIds(reward.assembledReward));
		} else if (reward.subType === 'selection_kit') {
			for (const option of MainParser.SelectionKits[reward.id].options) {
				if (option.item.__class__ === 'BuildingItemPayload') ids.push(option.item.cityEntityId);
				if (option.item.__class__ === 'UpgradeKitPayload') ids.push(...getFromUpgrade(option.item.upgradeItemId));
			}
		} else if (reward.subType === 'upgrade_kit') {
			ids.push(...getFromUpgrade(reward.id));
		} else if (reward.type === 'chest') {
			for (const rew of reward.possible_rewards) {
				ids.push(...shopAssist.getBuildingIds(rew.reward));
			}
		}
		return Array.from(new Set(ids));
	},


	/**
	 * Tooltip callback: renders building details for all buildings a slot can resolve to
	 *
	 * @param {Object} e tooltip event whose currentTarget carries the data-ids attribute
	 * @returns {Promise<string|undefined>} tooltip HTML
	 */
	TT: async (e) => {
		const buildingIds = e?.currentTarget?.dataset?.ids?.split(',');
		if (!buildingIds) return;

		const eff = Object.assign({}, ...Productions.rateBuildings(buildingIds, true, CurrentEra)?.map(x => ({ [x.entityId]: Math.round(100 * (x.rating?.totalScore || 0)) })));
		const meta = Object.assign({}, ...buildingIds.map(x => ({ [x]: MainParser.CityEntities[x] })));

		const upgrades = Object.assign({}, ...buildingIds.map(x => {
			const upgradeCount = Kits.allBuildingsUpgradeCounts[x] || {};
			if (Object.keys(upgradeCount).length === 0) return { [x]: '' };

			let u = '<span class="upgrades"><span class="base">1</span>';
			for (const i in upgradeCount) {
				if (!upgradeCount[i]) continue;
				u += `<span class="${i}">${upgradeCount[i]}</span>`;
			}
			u += '</span>';
			return { [x]: u };
		}));

		let h = `<div class="buildingTT">
				<table class="foe-table">`;
		let head = '';
		let images = '';
		let body = '';

		// show full building cards side by side as long as they fit the viewport, otherwise a compact list
		const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
		const limit = Math.floor(vw / 330);

		for (const b of buildingIds) {
			if (buildingIds.length <= limit) {
				head += `<td style="width:100%; vertical-align:top"><h2><span>${meta[b].name}  ${eff[b] ? `(${i18n('Boxes.Kits.Efficiency')}: ${eff[b]})` : ''}</span>${upgrades[b]}</h2></td>`;
				images += `<td class="buildingTTImg">${typeof meta[b].asset_id === 'string' ? `<img alt="${meta[b].name}" src="${srcLinks.get(`/city/buildings/${meta[b].asset_id.replace(/^(\D_)(.*?)/, '$1SS_$2')}.png`, true)}">` : ''}</td>`;
				body += `<td style="width:100%; vertical-align:top">`;
				body += await Tooltips.BuildingData(meta[b], CurrentEra, null, eff);
				body += `</td>`;
			} else {
				head += `<tr style="text-wrap-mode:nowrap"><td><span style="font-weight:600">${meta[b].name}</td><td>  ${eff[b] ? `(${i18n('Boxes.Kits.Efficiency')}: ${eff[b]})` : ''}</td><td>${upgrades[b]}</td></tr>`;
			}
		}
		if (buildingIds.length <= limit) {
			h += `<tr>${head}</tr><tr>${images}</tr><tr>${body}</tr>`;
		} else {
			h += head;
		}
		h += `</table></div>`;

		setTimeout(() => {
			$('.handleOverflow').each((index, el) => {
				const w = (el.scrollWidth - el.parentNode.clientWidth) || 0;
				if (w < 0) {
					el.style['animation-name'] = 'unset';
				} else {
					el.style.width = `${w}px`;
				}
			});
		}, 100);

		return h;
	},


	/**
	 * Tooltip callback: returns pre-rendered tooltip content by slot id
	 *
	 * @param {Object} e tooltip event whose currentTarget carries the data-slotid attribute
	 * @returns {Promise<string|undefined>} tooltip HTML
	 */
	allTT: async (e) => {
		const slotId = e?.currentTarget?.dataset?.slotid;
		if (!slotId) return;
		return shopAssist.allTTContent[slotId];
	},


	/**
	 * Shows a toast for every alerted slot that became affordable
	 */
	checkAlerts: () => {
		for (const [key, slot] of Object.entries(shopAssist.alerts)) {
			if (shopAssist.alertsTriggered[key]) continue;
			if (slot.purchaseLimit?.maxPurchases && !slot.purchaseLimit.remainingPurchases) continue;

			if (!shopAssist.costRows(slot, 1).canBuy) continue;

			shopAssist.alertsTriggered[key] = true;
			const shopId = key.split('#')[0];
			HTML.ShowToastMsg({
				show: 'force',
				head: `${i18n('Boxes.ShopAssist.Shop')} - ${shopAssist.shopMeta[shopId]?.name || ''}`,
				text: `${i18n('Boxes.ShopAssist.canBeBought')}: ${slot.reward.name}`,
				type: 'success',
				hideAfter: 60000
			});
		}
	},


	/**
	 * Renders the settings pane of the box
	 */
	ShowSettings: () => {
		const autoOpen = Settings.GetSetting('ShowShopAssist');

		const h = [];
		h.push(`<p><label><input id="shopAssistAutoOpen" type="checkbox"${autoOpen === true ? ' checked="checked"' : ''} />${i18n('Boxes.Settings.Autostart')}</label></p>`);
		h.push(`<p><button onclick="shopAssist.SaveSettings()" id="save-bghelper-settings" class="btn" style="width:100%">${i18n('Boxes.Settings.Save')}</button></p>`);

		$('#shopAssistSettingsBox').html(h.join(''));
	},


	/**
	 * Persists the settings and closes the settings pane
	 */
	SaveSettings: () => {
		localStorage.setItem('ShowShopAssist', $('#shopAssistAutoOpen').is(':checked'));
		$('#shopAssistSettingsBox').remove();
	},
};
