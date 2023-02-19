/*
 * **************************************************************************************
 * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

/**
 * A {@link HTML.Box box} for listing owned (in inventory) and missing buildings, and according kits and assets.
 * @namespace
 */
let Kits = {

	/**
	 * The parsed JSON of all known sets.
	 * @type {object[]}
	 */
	KitsjSON: null,
	/**
	 * Determines which sets and assets to create. Valid values:
	 * - `0`: Shows owned sets and assets only
	 * - `1`: Shows owned sets and according assets (owned and missing)
	 * - `2`: Shows all known sets and assets
	 * @type {number}
	 */
	ShowMissing: 0,


	/**
	 * Loads all known sets {@link Kits.KitsjSON JSON} and creates the {@link HTML.Box DOM box}.
	 */
	init: ()=> {
		MainParser.loadJSON(extUrl + 'js/web/kits/data/sets.json', (data)=> {
			Kits.KitsjSON = JSON.parse(data);
			Kits.BuildBox();
		});
	},


	/**
	 * Creates the {@link HTML.Box box} with displayed sets.
	 */
	BuildBox: ()=> {
		if ( $('#kits').length === 0 ) {

			HTML.AddCssFile('kits');

			HTML.Box({
				id: 'kits',
				title: i18n('Menu.Kits.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true
			});

			$('#kitsBody').append(
				$('<div />').attr('id', 'kitsBodyTopbar'),
				$('<div />').attr('id', 'kitsBodyInner'),
				$('<div />').attr('id', 'kitsBodyBottombar')
			);

			$('#kitsBodyTopbar').append(
				$('<label />').attr({
					class: 'game-cursor'
				}).text(i18n('Boxes.Kits.FilterSets') + ':\xA0').append(
					$('<input />').attr({
						class: 'game-cursor',
						type: 'text',
						'data-type': 'filter-sets-text',
						placeholder: 'e.g. sent||cherry||winter'
					}).on('change', Kits._filterSets)
				)
			).append(
				$('<label />').attr({class: 'game-cursor'}).text(i18n('Boxes.Kits.FilterItems') + ':\xA0').append(
					$('<input />').attr({
						class: 'game-cursor',
						type: 'text',
						'data-type': 'filter-items-text',
						placeholder: 'e.g. car||field'
					}).on('change', Kits._filterItems)
				)
			);

			$('#kitsBodyBottombar').append(
				$('<span />').attr({
					id: 'kits-triplestate-button',
					class: 'btn-default btn-tight',
					onclick: 'Kits.ToggleView()'
				}).text(Kits.ShowMissing === 0 ? i18n('Boxes.Kits.TripleStateButton0') : Kits.ShowMissing === 1 ? i18n('Boxes.Kits.TripleStateButton1') : i18n('Boxes.Kits.TripleStateButton2'))
			);
		}
		else {
			HTML.CloseOpenBox('kits');
		}

		Kits.ReadSets();
	},
	
	/**
	 * Refresh the Box
	 */
	UpdateBoxIfVisible: ()=> {
		if ($('#kits').length !== 0) {
			Kits.ReadSets();
		}
	},


	/**
	 * Creates all displayed set elements.
	 */
	ReadSets: ()=> {
		let inv = Kits.GetInvententoryArray(),
			entities = MainParser.CityEntities,
			kits = Kits.KitsjSON;

		let t = '<table class="foe-table">';

		// Sets durchsteppen
		for (let set in kits) {

			if (!kits.hasOwnProperty(set)) {
				break;
			}

			/** @type {SetItem[][]} */
			let buildings = [],
				/** @type {SetItem[][]} */
				missings = [],
				/** @type {SetItem[]} */
				assetRow = [],
				/** @type {SetItem[]} */
				kitRow = [],
				show = false;

			// step buildings in a set
			for (let i in kits[set]['buildings']) {

				if (!kits[set]['buildings'].hasOwnProperty(i)) {
					break;
				}

				const building = kits[set]['buildings'][i];
				/** @type {SetItem[]} */
				let itemRow = [];

				// Level 1
				let itemL1 = inv.find(el => el['item']['cityEntityId'] === building['first']),
					itemUgr = false;

				if (itemL1 && itemL1['inStock'] < 1) {
					itemL1 = '';
				}

				// Upgrade Kit
				if (building['update']) {
					itemUgr = inv.find(el => el['itemAssetName'] === building['update']);
				}
				
				if (itemUgr && itemUgr['inStock'] < 1) {
					itemUgr = '';
				}

				if (itemL1) {
					itemRow.push({
						type: 'first',
						item: itemL1,
						missing: false
					});

					show = true;

					if (!itemUgr && Kits.ShowMissing > 0) {
						itemRow.push({
							type: 'update',
							item: building['update'],
							missing: true
						});
					}
				}

				if (itemUgr) {
					if (!itemL1 && Kits.ShowMissing > 0) {
						itemRow.push({
							type: 'first',
							item: entities[building['first']],
							missing: true
						});
					}

					show = true;

					itemRow.push({
						type: 'update',
						item: itemUgr,
						missing: false
					});
				}

				// both not in invetory, holdback
				if (!itemL1 && !itemUgr && Kits.ShowMissing > 0) {
					itemRow.push({
						type: 'first',
						item: entities[building['first']],
						missing: true
					});

					missings.push(itemRow);

					if (building['update']) {
						itemRow.push({
							type: 'update',
							item: building['update'],
							missing: true
						});

						missings.push(itemRow);
					}
				}

				if (itemRow.length) {
					buildings.push(itemRow);
				}
			}
			// [Building has asset buildings or kits on ShowMissing(1)] or [ShowMissing(2)] ? show !
			if (kits[set]['kit'] && Array.isArray(kits[set]['kit'])) {
				for (let a in kits[set]['kit']) {
					let k = inv.find(el => el['itemAssetName'] === kits[set]['kit'][a]);
					if (k && k['inStock'] > 0) {
						show = true;
					}
				}
			}
			else if (kits[set]['kit']) {
				let k = inv.find(el => el['itemAssetName'] === kits[set]['kit']);
				if (k && k['inStock'] > 0) {
					show = true;
				}
			}
			if (kits[set]['assets']) {
				for (let a in kits[set]['assets']) {
					let asset = inv.find(el => el['item']['cityEntityId'] === kits[set]['assets'][a]);
					if (asset && asset['inStock'] > 0) {
						show = true;
					}
				}
			}
			if (Kits.ShowMissing === 2) {
				show = true;
			}

			// Building has asset buildings?
			if (kits[set]['assets']) {
				for (let a in kits[set]['assets']) {
					if(!kits[set]['assets'].hasOwnProperty(a)) {
						break;
					}

					let asset = inv.find(el => el['item']['cityEntityId'] === kits[set]['assets'][a]);

					if (asset && asset['inStock'] > 0) {
						assetRow.push({
							type: 'asset',
							item: asset,
							missing: false
						});
					} 
					else if (show && Kits.ShowMissing > 0) {
						assetRow.push({
							type: 'asset',
							item: entities[kits[set]['assets'][a]],
							missing: true
						});
					}
				}
			}

			if (assetRow.length) {
				show = true;
			}
			
			// selection kit exist?
			if (kits[set]['kit'] && Array.isArray(kits[set]['kit']) ) {
				for (let a in kits[set]['kit']) {
					if(!kits[set]['kit'].hasOwnProperty(a)) {
						break;
					}

					let k = inv.find(el => el['itemAssetName'] === kits[set]['kit'][a]);

					if (k && k['inStock'] > 0) {
						kitRow.push({
							type: 'kit',
							item: k,
							missing: false
						});
					}
					else if (show && Kits.ShowMissing > 0) {
						kitRow.push({
							type: 'kit',
							item: kits[set]['kit'][a],
							missing: true
						});
					}
				}
			}
			else if (kits[set]['kit']) {
				let k = inv.find(el => el['itemAssetName'] === kits[set]['kit']);

				if (k && k['inStock'] > 0) {
					kitRow.push({
						type: 'kit',
						item: k,
						missing: false
					});
				}
				else if (show && Kits.ShowMissing > 0) {
					kitRow.push({
						type: 'kit',
						item: kits[set]['kit'],
						missing: true
					});
				}
			}

			if (kitRow.length) {
				show = true;
			}

			const Name = kits[set]['name'],
				GroupName = kits[set]['groupname'];
			if (show || GroupName || !Name && !GroupName) {
				let ChainSetIco = '';

				if (Name) { //Name is set
					let sName = Name.toLowerCase().replace(/_set/g, '');

					if (Name === 'Kits') {
						KitText = i18n('Boxes.Kits.Kits');
					}
					else if (Name === 'Guard_Post') {
						KitText = MainParser.SelectionKits['selection_kit_guard_post'].name;
					}
					else if (Name === 'Winterdeco_Set') {
						KitText = MainParser.SelectionKits['selection_kit_winter_deco'].name;
					}
					else if (MainParser.BuildingChains[sName]) {
						KitText = MainParser.BuildingChains[sName].name;
						ChainSetIco = '<img src="' + srcLinks.get('/shared/icons/' + sName + '.png', true) + '" class="chain-set-ico">';
					}
					else if (MainParser.BuildingSets[sName]) {
						KitText = MainParser.BuildingSets[sName].name;
						ChainSetIco = '<img src="' + srcLinks.get('/shared/icons/' + sName + '.png', true) + '" class="chain-set-ico">';
					}
					else if (MainParser.CityEntities[kits[set].buildings[0]['first']]) {
						let itemName = MainParser.CityEntities[kits[set].buildings[0]['first']].name;
						let idx = itemName.indexOf(' - ', 0);
						
						if (idx === -1) {
							idx = itemName.indexOf(' – ', 0); // looks the same but it isn't ¯\_(ツ)_/¯
						}

						if (idx === -1) {
							KitText = itemName;
						}
						else {
							KitText = itemName.substring(0, idx);
						}
					}
					else {
						KitText = Name.replace(/_/g, ' '); //Upcoming => Fallback to Name
					}

					let Link = kits[set]['link'] ? kits[set]['link'] : Name;
					KitText = MainParser.GetBuildingLink(Link, KitText);
				}
				else if (GroupName) { //Group is set
					let i18nKey = 'Boxes.Kits.' + GroupName,
						i18nTranslation = i18n(i18nKey);

					if (i18nKey === i18nTranslation) i18nTranslation = GroupName.replace(/_/g, ' '); //No translation => Fallback to GroupName

					KitText = i18nTranslation;
				}
				else { //No name and group set => Show udate
					KitText = i18n('Boxes.Kits.Udate') + kits[set]['udate'];
				}

				t += '<tr><th colspan="4" class="head">' + ChainSetIco +' '+ KitText + '</th></tr>';

				if(buildings) {
					buildings.forEach((e)=> {
						let rowTd = '';

						if (e[0]['type'] === 'first') {
							rowTd += Kits.ItemTd(e[0]);

							if (e[1] === undefined) {
								if (Kits.ShowMissing > 0 && e[1]) {
									rowTd += Kits.ItemTd(e[1]);
								}
								else {
									rowTd += '<td colspan="2"></td>';
								}
							}
							else {
								rowTd += Kits.ItemTd(e[1]);
							}
						} 
						else if (e[0]['type'] === 'update') {
							if (Kits.ShowMissing > 0) {
								rowTd += Kits.ItemTd(e[0]);
								rowTd += Kits.ItemTd(e[1]);
							} 
							else {
								rowTd += '<td colspan="2"></td>';
								rowTd += Kits.ItemTd(e[0]);
							}
						}

						t += '<tr>' + rowTd + '</tr>';
					});
				}

				// Asset listing
				if (assetRow.length) {
					t += `<tr><td colspan="4" class="assets-header">${i18n('Boxes.Kits.Extensions')}</td></tr>`;
					let rowTd = '<td colspan="4"><div class="assets-row">';

					assetRow.forEach((e)=> {
						rowTd += Kits.ItemAssetDiv(e);
					});

					rowTd += '</div></td>';

					t += '<tr>' + rowTd + '</tr>';
				}

				// Kit listing
				if (kitRow.length) {
					t += `<tr><td colspan="4" class="assets-header">${i18n('Boxes.Kits.SelectionKit')}</td></tr>`;
					let rowTd = '<td colspan="4"><div class="kits-row">';

					kitRow.forEach((e)=> {
						rowTd += Kits.ItemKitDiv(e);
					});

					rowTd += '</div></td>';

					t += '<tr>' + rowTd + '</tr>';
				}
			}
		}

		t += '</table>';

		$('#kitsBodyInner').html(t);
	},


	/**
	 * Creates two `td`'s for a level1 or update building.
	 * @param {SetItem} el
	 * @returns {string} HTML string of the two `td` elements.
	 */
	ItemTd: (el)=> {
		if (!el || el['item'] == undefined) {
			return '';
		}

		let item = el['item'],
			aName,
			td = '',
			url,
			url_fragment = '';

		if (el['type'] === 'first') {

			aName = el['missing'] ? item['asset_id'] : item['itemAssetName'];

			url = srcLinks.get('/city/buildings/' + [aName.slice(0, 1), '_SS', aName.slice(1)].join('') + '.png', true) ;
		}
		else if (el['type'] === 'update' || el['type'] === 'kit') {
			aName = el['missing'] ? item : item['itemAssetName'];

			if (aName.includes('fragment')) {
				aName = aName.replace('fragment#', '');
				url = srcLinks.get('/shared/icons/icon_fragment.png', true);
				url_fragment = `<img class="kits-fragment-image" src="${url}" alt="${item['name']}"/>`;
			}

			url = srcLinks.get('/shared/icons/reward_icons/reward_icon_' + aName + '.png', true);

			if (aName.includes('building_')) {
				if (!item['item']) {
					if (aName == "building_road_to_victory") {
						aName = "D_MultiAge_Battlegrounds2";
					}
					else if (aName == "building_iridescent_garden") {
						aName = "D_MultiAge_Battlegrounds4";
					}
					else if (aName == "building_shrine_of_inspiration") {
						aName = "R_MultiAge_EasterBonus16";
					}
					else if (aName == "building_shrine_of_knowledge") {
						aName = "R_MultiAge_EasterBonus5";
					}
					else if (aName == "building_wishing_well") {
						aName = "L_AllAge_EasterBonus1";
					}
					else {
						return '';
					}
				}
				else {
					aName = item['item']['reward']['assembledReward']['subType'];
				}
				url = srcLinks.get('/city/buildings/' + [aName.slice(0, 1), '_SS', aName.slice(1)].join('') + '.png', true);
			}
		}

		if (el['missing']) {
			let title = '';
			if (el['type'] === 'first') {
				title = item['name'];
			}
			else if (el['type'] === 'update') {
				title = MainParser.BuildingUpgrades[item] ? MainParser.BuildingUpgrades[item].upgradeItem['name'] : i18n('Boxes.Kits.UpgradeKit');
			}
			else if (el['type'] === 'kit') {
				title = MainParser.SelectionKits[item] ? MainParser.SelectionKits[item]['name'] : i18n('Boxes.Kits.SelectionKit');
			}
			else {
				title = i18n('Boxes.Kits.Fragment');
			}
			
			td += `<td class="text-center is-missing"><div class="kits-image-container"><img class="kits-image" src="${url}" alt="${item['name']}"/>${url_fragment}</div></td>`;
			td += `<td class="is-missing">${title}<br>${i18n('Boxes.Kits.InStock')}: <strong class="text-warning">-</strong></td>`;
		} 
		else {
			td += `<td class="text-center"><div class="kits-image-container"><img class="kits-image" src="${url}" alt="${item['name']}"/>${url_fragment}</div></td>`;
			td += `<td>${item['name']}<br>${i18n('Boxes.Kits.InStock')}: <strong class="text-warning">${item['inStock'] + (url_fragment ? '/' + item['item']['reward']['requiredAmount'] : '')}</strong></td>`;
		}

		return td;
	},


	/**
	 * Creates a `div` for any asset of a set.
	 * @param {SetItem} el
	 * @returns {string} HTML string of the `div` element.
	 */
	ItemAssetDiv: (el)=> {
		if (!el || el['item'] == undefined) {
			return '';
		}

		let item = el['item'],
			aName = el['missing'] ? item['asset_id'] : item['itemAssetName'],
			url = srcLinks.get('/city/buildings/' + [aName.slice(0, 1), '_SS', aName.slice(1)].join('') + '.png', true);

		return 	`<div class="item-asset${(el['missing'] ? ' is-missing' : '')}">
					<img class="asset-image" src="${url}" alt="${item['name']}" /><br>
					${item['name']}<br>${i18n('Boxes.Kits.InStock')}: <strong class="text-warning">${ (item['inStock'] ? item['inStock'] : '-' ) }</strong>
				</div>`;
	},
	
	/**
	 * Creates a `div` for any kit of a set.
	 * @param {SetItem} el
	 * @returns {string} HTML string of the `div` element.
	 */
	ItemKitDiv: (el)=> {
		if (!el || el['item'] == undefined) {
			return '';
		}

		let item = el['item'],
			aName = el['missing'] ? item : item['itemAssetName'],
			url,
			url_fragment = '';

		if (aName.includes('fragment')) {
			aName = aName.replace('fragment#', '');
			url = srcLinks.get('/shared/icons/icon_fragment.png', true);
			url_fragment = `<img class="kits-fragment-image" src="${url}" alt="${item['name']}" />`;
		}

		url = srcLinks.get('/shared/icons/reward_icons/reward_icon_' + aName + '.png', true);

		if (aName.includes('building_')) {
			if (!item['item']) {
				if (aName == "building_road_to_victory") {
					aName = "D_MultiAge_Battlegrounds2";
				}
				else if (aName == "building_iridescent_garden") {
					aName = "D_MultiAge_Battlegrounds4";
				}
				else if (aName == "building_shrine_of_inspiration") {
					aName = "R_MultiAge_EasterBonus16";
				}
				else if (aName == "building_shrine_of_knowledge") {
					aName = "R_MultiAge_EasterBonus5";
				}
				else if (aName == "building_wishing_well") {
					aName = "L_AllAge_EasterBonus1";
				}
				else {
					return '';
				}
			}
			else {
				aName = item['item']['reward']['assembledReward']['subType'];
			}
			url = srcLinks.get('/city/buildings/' + [aName.slice(0, 1), '_SS', aName.slice(1)].join('') + '.png', true);
		}
		
		let title = '';
		if (!el['missing']) {
			title = item['name'];
		}
		else if (url_fragment) {
			title = i18n('Boxes.Kits.Fragment');
		}
		else {
			title = MainParser.SelectionKits[item] ? MainParser.SelectionKits[item]['name'] : i18n('Boxes.Kits.SelectionKit');
		}

		return 	`<div class="item-kits${(el['missing'] ? ' is-missing' : '')}">
					<div class="kits-image-container">
						<img class="kits-image" src="${url}" alt="${item['name']}" />
						${url_fragment}
					</div><br>
					${title}<br>${i18n('Boxes.Kits.InStock')}: <strong class="text-warning">${(item['inStock'] ? item['inStock'] : '-') + (url_fragment && item['item'] ? '/' + item['item']['reward']['requiredAmount'] : '')}</strong>
				</div>`;
	},


	/**
	 * Returns {@link MainParser.Inventory} as array.
	 * @returns {any[]}
	 */
	GetInvententoryArray: ()=> {
		let Ret = [];
		for (let i in MainParser.Inventory) {
			if (!MainParser.Inventory.hasOwnProperty(i)) continue;
			
			let itemIdx = Ret.findIndex(e => e['itemAssetName'] == MainParser.Inventory[i]['itemAssetName']);

			if (MainParser.Inventory[i]['itemAssetName'] == 'icon_fragment') {
				itemIdx = Ret.findIndex(e => e['itemAssetName'] == MainParser.Inventory[i]['item']['reward']['id']);
			}

			if (itemIdx > -1) {
				Ret[itemIdx]['inStock'] += MainParser.Inventory[i]['inStock'];
			} 
			else {
				Ret.push(Object.assign({}, MainParser.Inventory[i]));
			}
		}
		for (let i in Ret) {
			if (Ret[i]['itemAssetName'] == "icon_fragment") {
				Ret[i]['itemAssetName'] = Ret[i]['item']['reward']['id'];
			}
		}
		return Ret;
    },


	/**
	 * Toggles displaying of owned, missing and all set items.
	 */
	ToggleView: ()=> {
		Kits.ShowMissing === 0 ? Kits.ShowMissing = 1 : Kits.ShowMissing === 1 ? Kits.ShowMissing = 2 : Kits.ShowMissing = 0;

		$('#kitsBodyInner').html('');
		Kits.ReadSets();
		Kits._filterSets();
		Kits._filterItems();

		$('#kits-triplestate-button').text(Kits.ShowMissing === 0 ? i18n('Boxes.Kits.TripleStateButton0') : Kits.ShowMissing === 1 ? i18n('Boxes.Kits.TripleStateButton1') : i18n('Boxes.Kits.TripleStateButton2'))
	},


	/**
	 * Filters whole sets by name patterns.
	 */
	_filterSets: () => {
		const filterRegExps = $('#kitsBodyTopbar input[data-type="filter-sets-text"]').val()
			.split('||').filter(it => it.trim().length > 0).map(it => new RegExp(it, 'i'));
		const allRows = $('#kitsBodyInner tr:not(.headline)');
		if (!filterRegExps || filterRegExps.length < 1) {
			allRows.removeClass('filter-set-hide');
		} else {
			const allRowHeads = allRows.has('th.head');
			allRowHeads.each((i, e) => {
				const trSetHead = $(e);
				if (trSetHead.next().has('th.head').length > 0) {
					// A `head` directly followed by another `head`, that's a groupname heading; ignore those, i.e. never hide.
					return;
				}
				const from = allRows.index(trSetHead);
				const to = (i + 1) < allRowHeads.length ? allRows.index(allRowHeads[i + 1]) : allRows.length;
				allRows.slice(from, to).toggleClass('filter-set-hide', !filterRegExps.some(it => it.test(trSetHead.text())));
			});
		}
	},


	/**
	 * Filters all items by name patterns.
	 */
	_filterItems: () => {
		const filterRegExps = $('#kitsBodyTopbar input[data-type="filter-items-text"]').val()
			.split('||').filter(it => it.trim().length > 0).map(it => new RegExp(it, 'i'));
		const allRows = $('#kitsBodyInner tr:not(.headline)');
		let lastSetHead, lastAssetHead;
		let visibleSetItemsCount = 0, visibleAssetItemsCount = 0;
		allRows.each((i, e) => {
			// Check each row and hide those being filtered out.
			// Also hide empty `head`-rows of assets/kits and set accordingly.
			const row = $(e);
			const isSetHead = row.has('th.head').length > 0;
			if (isSetHead && row.next().has('th.head').length > 0) {
				// A `head` directly followed by another `head`, that's a groupname heading; ignore those, i.e. never hide.
				return;
			}
			const isAssetHead = row.has('td.assets-header').length > 0;
			if (isSetHead) {
				if (lastSetHead) lastSetHead.toggleClass('filter-item-empty', visibleSetItemsCount < 1);
				lastSetHead = row;
				visibleSetItemsCount = 0;
				if (lastAssetHead) lastAssetHead.toggleClass('filter-item-empty', visibleAssetItemsCount < 1);
				lastAssetHead = null;
				visibleAssetItemsCount = 0;
			} else if (isAssetHead) {
				if (lastAssetHead) lastAssetHead.toggleClass('filter-item-empty', visibleAssetItemsCount < 1);
				lastAssetHead = row;
				visibleAssetItemsCount = 0;
			} else {
				let visibleItemsCount = 0;
				const assetOrKitDivs = row.find('div.item-asset, div.item-kits');
				if (assetOrKitDivs.length > 0) {
					assetOrKitDivs.each((i, e) => {
						const item = $(e);
						const show = !filterRegExps || filterRegExps.length < 1 || filterRegExps.some(it => it.test(item.text()) || it.test(item.html()));
						item.toggleClass('filter-item-hide', !show);
						if (show) visibleItemsCount++;
					});
				} else {
					const buildingTds = row.find('td:not(:has(> div.kits-row, > div.assets-row))');
					for (let i = 0; i < buildingTds.length; i++) {
						if (buildingTds.eq(i).attr('colspan') === '2') continue;
						const itemImg = buildingTds.eq(i);
						const itemText = buildingTds.eq(i + 1);
						const show = !filterRegExps || filterRegExps.length < 1 || filterRegExps.some(it => it.test(itemText.text()) || it.test(itemImg.html()));
						buildingTds.slice(i, i + 2).toggleClass('filter-item-hide', !show);
						if (show) visibleItemsCount++;
						i++; //for 2 `td`s were processed
					}
				}
				visibleAssetItemsCount += visibleItemsCount;
				visibleSetItemsCount += visibleItemsCount;
				row.toggleClass('filter-item-empty', visibleItemsCount < 1);
			}
		});
		if (lastSetHead) lastSetHead.toggleClass('filter-item-empty', visibleSetItemsCount < 1);
		if (lastAssetHead) lastAssetHead.toggleClass('filter-item-empty', visibleAssetItemsCount < 1);
	}
};

/**
 * @typedef SetItem
 * @property {string} type 'first', 'update', 'kit' or 'asset'
 * @property {string|object} item
 * @property {boolean} missing
 */