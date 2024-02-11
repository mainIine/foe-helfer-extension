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
	Fragments:{},
	fragmentURL:null,
	specialCases:{
		"selection_kit_watchtower_1_gbg" : "selection_kit_watchtower1_gbg",
		"selection_kit_ind_palace_set" :"selection_kit_indian_palace",
		"selection_kit_ind_fountain_set":"selection_kit_indian_fountain",
		"selection_kit_epic_FELL23":"selection_kit_epic_FELLOW23",
		"selection_kit_FELL23A":"selection_kit_FELLOW23A",
		"selection_kit_governors_villa":"selection_kit_govenors_villa",
		"selection_kit_classic_garden_set":"selection_kit_classical_garden",
		"selection_kit_winter_village_set":"selection_kit_winter_village",
		"selection_kit_royal_garden_set":"selection_kit_royal_garden",
		"selection_kit_gentiana_windmill_farmland":"selection_kit_gentiana_farmland",
		"selection_kit_W_MultiAge_WIN22A":"selection_kit_chocolatery",
		"selection_kit_winter_cars":"selection_kit_winter_train_carriage",
		"golden_upgrade_kit_FELL23A":"golden_upgrade_kit_FELLOW23A"
	},

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
					}).on('change', Kits._filter)
				)
			).append(
				$('<label />').attr({class: 'game-cursor'}).text(i18n('Boxes.Kits.FilterItems') + ':\xA0').append(
					$('<input />').attr({
						class: 'game-cursor',
						type: 'text',
						'data-type': 'filter-items-text',
						placeholder: 'e.g. car||field'
					}).on('change', Kits._filter)
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
		Kits._filterMissing();
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
		let inv = Kits.GetInventoryArray(),
			entities = MainParser.CityEntities,
			kits = Kits.KitsjSON;

		let t = '<table class="foe-table">';
		if (!Kits.fragmentURL) Kits.fragmentURL = srcLinks.get("/shared/icons/icon_tooltip_fragment.png",true)
		selectionKits = {}
		for (let k in MainParser.SelectionKits) {
			if (!MainParser.SelectionKits.hasOwnProperty(k)) continue;
			for (o of MainParser.SelectionKits[k].eraOptions.BronzeAge.options) {
				if (!["BuildingItemPayload","UpgradeKitPayload"].includes(o.item.__class__)) continue;
				if (!selectionKits[o.itemAssetName]) selectionKits[o.itemAssetName] = [];
				selectionKits[o.itemAssetName].push(k);
			}
		}

		for (let k in kits) {
			if (! kits[k].buildings) continue;
			if (kits[k].kit) {
				if (!Array.isArray(kits[k].kit)) kits[k].kit = [kits[k].kit]
				continue;
			}
			let s = [];
			for (let b of kits[k].buildings) {
				for (let i of Object.values(b)) {
					s.push(...(selectionKits[i] || []));
				}
			}
			kits[k].kit = Array.from(new Set(s));
		}
		
		let create = (type,id) => {
			
			let item = {
						type: type,
						item: inv[id] || (type=="first" ? entities[id] : (type=="asset" ? entities[id] : id)),
						fragments: inv["fragment#" + id]?.inStock,
						reqFragments: inv["fragment#" + id]?.required,
						missing: ((inv[id]?.inStock || 0) < 1) && (((inv["fragment#" + id]?.inStock)||0) < 1)
			}				
			return item
		}
		// Sets durchsteppen
		for (let set in kits) {

			if (!kits.hasOwnProperty(set)) {
				break;
			}

			/** @type {SetItem[][]} */
			let buildings = [],
				/** @type {SetItem[][]} */
				assetRow = [],
				/** @type {SetItem[]} */
				kitRow = [],
				show = false,
				showB = false,
				showA = false,
				showK = false;

			// step buildings in a set
			for (let i in kits[set].buildings) {

				if (!kits[set].buildings.hasOwnProperty(i)) {
					break;
				}

				const building = kits[set].buildings[i];

				/** @type {SetItem[]} */
				let itemRow = [];

				// Level 1

				if (building.first) {
					let l = itemRow.push(create('first',building.first));
					if (!itemRow[l-1].missing) showB = true; 
				}

				for (let i in building) {
					if (!building.hasOwnProperty(i)) continue;
					if (i=="first")	continue;
					let l = itemRow.push(create('update',building[i]));
					if (!itemRow[l-1].missing) showB = true; 
				}

				buildings.push(itemRow)
			}
			
			// Building has asset buildings?
			if (kits[set].assets) {
				for (let a of kits[set].assets) {
					let l = assetRow.push(create('asset',a));
					if (!assetRow[l-1].missing) showA = true; 
				}
			}
			
			// selection kit exist?
			if (kits[set].kit) {
				for (let a of kits[set].kit) {
					let l = kitRow.push(create('kit',a));
					if (!kitRow[l-1].missing) showK = true; 
				}
			}
			show = showB || showA || showK;

			const Name = kits[set].name,
				GroupName = kits[set].groupname;
			
			let ChainSetIco = '';

			if (Name) { //Name is set
				let sName = Name.toLowerCase().replace(/_set/g, '');

				if (Name === 'Kits') {
					KitText = i18n('Boxes.Kits.Kits');
				}
				else if (Name === 'Guard_Post') {
					KitText = MainParser.SelectionKits.selection_kit_guard_post.name;
				}
				else if (Name === 'Winterdeco_Set') {
					KitText = MainParser.SelectionKits.selection_kit_winter_deco.name;
				}
				else if (MainParser.BuildingChains[sName]) {
					KitText = MainParser.BuildingChains[sName].name;
					ChainSetIco = '<img src="' + srcLinks.get('/shared/icons/' + sName + '.png', true) + '" class="chain-set-ico">';
				}
				else if (MainParser.BuildingSets[sName]) {
					KitText = MainParser.BuildingSets[sName].name;
					ChainSetIco = '<img src="' + srcLinks.get('/shared/icons/' + sName + '.png', true) + '" class="chain-set-ico">';
				}
				else if (MainParser.CityEntities[kits[set].buildings[0].first]) {
					let itemName = MainParser.CityEntities[kits[set].buildings[0].first].name;
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

				let Link = kits[set].link ? kits[set].link : Name;
				KitText = MainParser.GetBuildingLink(Link, KitText);
			}
			else if (GroupName) { //Group is set
				let i18nKey = 'Boxes.Kits.' + GroupName,
					i18nTranslation = i18n(i18nKey);

				if (i18nKey === i18nTranslation) i18nTranslation = GroupName.replace(/_/g, ' '); //No translation => Fallback to GroupName

				KitText = i18nTranslation;
				show = true;
			}
			else { //No name and group set => Show udate
				KitText = i18n('Boxes.Kits.Udate') + kits[set].udate;
				show = true;
			}

			t += `<tr class="${!show ? "all-missing" : ""}"><th colspan="4" class="head">` + ChainSetIco +' '+ KitText + '</th></tr>';

			if(buildings.length) {
				buildings.forEach((building) => {
					let rowTd = `<td colspan="4"><div class="item-row">`;
					let showR = false
					building.forEach((e)=> {
						rowTd += Kits.ItemDiv(e);
						if (!e.missing) showR = true;
					});

					rowTd += '</div></td>';

					t += `<tr class="${!show ? "all-missing" : (!showR ? "row-missing" : "")}">` + rowTd + '</tr>';
				})
			}

			// Asset listing
			if (assetRow.length) {
				t += `<tr class="${!show ? "all-missing" : (!showA ? "row-missing" : "")}"><td colspan="4" class="assets-header">${i18n('Boxes.Kits.Extensions')}</td></tr>`;
				let rowTd = `<td colspan="4"><div class="item-row">`;
				assetRow.forEach((e)=> {
					rowTd += Kits.ItemDiv(e);

				});

				rowTd += '</div></td>';

				t += `<tr class="${!show ? "all-missing" : (!showA ? "row-missing" : "")}">` + rowTd + '</tr>';
			}

			// Kit listing
			if (kitRow.length) {
				t += `<tr class="${!show ? "all-missing" : (!showK ? "row-missing" : "")}"><td colspan="4" class="assets-header">${i18n('Boxes.Kits.SelectionKit')}</td></tr>`;
				let rowTd = `<td colspan="4"><div class="item-row">`;

				kitRow.forEach((e)=> {
					rowTd += Kits.ItemDiv(e);
				});

				rowTd += '</div></td>';

				t += `<tr class="${!show ? "all-missing" : (!showK ? "row-missing" : "")}">` + rowTd + '</tr>';
			}
		}

		t += '</table>';

		$('#kitsBodyInner').html(t);
	},


	/**
	 * Creates a `div` for any item.
	 * @param {SetItem} el
	 * @returns {string} HTML string of the `div` element.
	 */
	ItemDiv: (el)=> {

		if (!el?.item) return '';
	
		let item = el.item,
			aName = item.itemAssetName || item.asset_id || MainParser.BuildingUpgrades[item]?.upgradeItem?.iconAssetName || Kits.specialCases[item] || item,
			url = '/shared/icons/reward_icons/reward_icon_' + aName + '.png',
			title = '';
			
		if (el.type == "first" || el.type == "asset") url = '/city/buildings/' + [aName.slice(0, 1), '_SS', aName.slice(1)].join('') + '.png';
		url = srcLinks.get(url,true)

		title = item.name;

		if (!title ) {
			if (el.type === 'update') {
				title = MainParser.BuildingUpgrades[item] ? MainParser.BuildingUpgrades[item].upgradeItem.name : i18n('Boxes.Kits.UpgradeKit');
			}
			else if (el.type === 'kit') {
				title = MainParser.SelectionKits[item] ? MainParser.SelectionKits[item].name : i18n('Boxes.Kits.SelectionKit');
			}
		}
		return 	`<div class="item${(el.missing ? ' is-missing' : '')}">
					<img class="kits-image" src="${url}" alt="${item.name}" /><br>
					${title}<br>${i18n('Boxes.Kits.InStock')}: <strong class="text-warning">${(item.inStock ? item.inStock : '-') + 
					(el.fragments ? `<br><img class="ItemFragment" src="${Kits.fragmentURL}">` + el.fragments + '/' + el.reqFragments : '')}</strong>
				</div>`;
	},


	/**
	 * Returns {@link MainParser.Inventory} as array.
	 * @returns {any[]}
	 */
	GetInventoryArray: ()=> {
		let Ret = {}
		for (let i in MainParser.Inventory) {
			if (!MainParser.Inventory.hasOwnProperty(i)) continue;
			let x = MainParser.Inventory[i]
			let amount = x.inStock;
			let required = null;
			let id = x.itemAssetName;
			if (x.item.__class__=="SelectionKitPayload") id = x.item.selectionKitId;
			if (x.item.__class__=="FragmentItemPayload") {
				id =  (x.item.reward.assembledReward.type == "building") ? "fragment#"+x.item.reward.assembledReward.subType : id = "fragment#"+x.item.reward.assembledReward.id ;
				amount = x.inStock*x.item.reward.amount;
				required = x.item.reward.requiredAmount;
			}	
			Ret[id] = {id:id,name:x.name,inStock:amount,required:required,itemAssetName:x.itemAssetName}
		}
		return Ret;
    },


	/**
	 * Toggles displaying of owned, missing and all set items.
	 */
	ToggleView: ()=> {
		Kits.ShowMissing === 0 ? Kits.ShowMissing = 1 : Kits.ShowMissing === 1 ? Kits.ShowMissing = 2 : Kits.ShowMissing = 0;
		
		Kits._filter()
		
		$('#kits-triplestate-button').text(Kits.ShowMissing === 0 ? i18n('Boxes.Kits.TripleStateButton0') : Kits.ShowMissing === 1 ? i18n('Boxes.Kits.TripleStateButton1') : i18n('Boxes.Kits.TripleStateButton2'))
	},

	_filter:()=>{
		$('#kitsBodyInner tr').show()
		$('#kitsBodyInner div.item').show()
		Kits._filterSets();
		Kits._filterItems();
		Kits._filterMissing();
	},

	/**
	 * Filters whole sets by name patterns.
	 */
	_filterMissing:()=>{
		if (Kits.ShowMissing == 0) {
			$('.is-missing').hide();
			$('tr.row-missing').hide();
			$('tr.all-missing').hide();
		}
		if (Kits.ShowMissing == 1) {
			$('tr.all-missing').hide();
		}
	},
	_filterSets: () => {
		const filterRegExps = $('#kitsBodyTopbar input[data-type="filter-sets-text"]').val()
			.split('||').filter(it => it.trim().length > 0).map(it => new RegExp(it, 'i'));
		if (filterRegExps && filterRegExps.length >= 1) {
			const allRows = $('#kitsBodyInner tr:not(.headline)');
			const allRowHeads = allRows.has('th.head');
			allRowHeads.each((i, e) => {
				const trSetHead = $(e);
				if (trSetHead.next().has('th.head').length > 0) {
					// A `head` directly followed by another `head`, that's a groupname heading; ignore those, i.e. never hide.
					return;
				}
				const from = allRows.index(trSetHead);
				const to = (i + 1) < allRowHeads.length ? allRows.index(allRowHeads[i + 1]) : allRows.length;
				if (!filterRegExps.some(it => it.test(trSetHead.text()))) allRows.slice(from, to).hide();
			});
		}
	},


	/**
	 * Filters all items by name patterns.
	 */
	_filterItems: () => {
		const filterRegExps = $('#kitsBodyTopbar input[data-type="filter-items-text"]').val()
			.split('||').filter(it => it.trim().length > 0).map(it => new RegExp(it, 'i'));
		if (filterRegExps && filterRegExps.length >= 1) {
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
					if (lastSetHead) {
						if (visibleSetItemsCount < 1)  lastSetHead.hide();
					}
					lastSetHead = row;
					visibleSetItemsCount = 0;
					if (lastAssetHead) {
						if (visibleAssetItemsCount < 1)  lastAssetHead.hide();
					}
					lastAssetHead = null;
					visibleAssetItemsCount = 0;
				} else if (isAssetHead) {
					if (lastAssetHead) {
						if (visibleAssetItemsCount < 1)  lastAssetHead.hide();
					}
					lastAssetHead = row;
					visibleAssetItemsCount = 0;
				} else {
					let visibleItemsCount = 0;
					const itemDivs = row.find('div.item');
					if (itemDivs.length > 0) {
						itemDivs.each((i, e) => {
							const item = $(e);
							const show = filterRegExps.some(it => it.test(item.text()) || it.test(item.html()));
							if (show) {
								visibleItemsCount++;
							} else {
								item.hide();
							}
						});
					} 
					visibleAssetItemsCount += visibleItemsCount;
					visibleSetItemsCount += visibleItemsCount;
					if (visibleItemsCount < 1) row.hide();
				}
			});
			if (lastSetHead) {
				if (visibleSetItemsCount < 1)  lastSetHead.hide();
			}
			if (lastAssetHead) {
				if (visibleAssetItemsCount < 1)  lastAssetHead.hide();
			}
		}
	}
};

/**
 * @typedef SetItem
 * @property {string} type 'first', 'update', 'kit' or 'asset'
 * @property {string|object} item
 * @property {boolean} missing
 */