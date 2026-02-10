/*
 * *************************************************************************************
 *
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

/**
 * A {@link HTML.Box box} for listing owned (in inventory) and missing buildings, and according kits and assets.
 * @namespace
 */

FoEproxy.addFoeHelperHandler('InventoryUpdated', () => {
	Kits.UpdateBoxIfVisible();
});

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
	favourites:JSON.parse(localStorage.getItem("Kits.favourites")||"[]"),
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
		"selection_kit_hippodrome_tracks": "selection_kit_hippodrome_track"
	},
	upgradeKits:null,

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
				$('<label />').attr({class: 'game-cursor'}).text(i18n('Boxes.General.FilterItems') + ':\xA0').append(
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
					class: 'btn btn-slim',
					onclick: 'Kits.ToggleView()'
				}).text(i18n('Boxes.Kits.TripleStateButton'+Kits.ShowMissing))
			);
			$('#kitsBodyBottombar').append(
				$('<span />').attr({
					id: 'kits-showFavourites',
					class: 'btn btn-slim',
					onclick: 'Kits.ToggleFavouritesBtn()'
				}).text(i18n('Boxes.Kits.ShowFavourites'))
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
			Kits._filter();
		}
	},


	/**
	 * Creates all displayed set elements.
	 */
	ReadSets: ()=> {
		let inv = Kits.GetInventoryArray(),
			entities = MainParser.CityEntities,
			kits = Kits.KitsjSON;

		let t = '<div class="foe-table">';
		if (!Kits.fragmentURL) Kits.fragmentURL = srcLinks.get("/shared/icons/icon_tooltip_fragment.png",true)

		let selectionKits = {};

		for (let k in MainParser.SelectionKits) {
			if (!MainParser.SelectionKits.hasOwnProperty(k)) continue;
			const options = MainParser.SelectionKits[k].options || MainParser.SelectionKits[k].eraOptions.BronzeAge.options;
			for (let o of options) {
				if (!["BuildingItemPayload", "UpgradeKitPayload"].includes(o.item.__class__)) continue;
				let id = o.item.upgradeItemId || o.item.selectionKitId || o.item.cityEntityId;
				if (!selectionKits[id]) selectionKits[id] = [];
				selectionKits[id].push(k);
			}
		}

		let addItems = (set, idx) => {
			for (let r of set) {
				if (r.type === "set") {
					addItems(r.rewards, idx);
				} else if (r.subType === "selection_kit") {
					const options = MainParser.SelectionKits[r.id].options || MainParser.SelectionKits[r.id].eraOptions.BronzeAge.options;
					for (let o of options) {
						if (!["BuildingItemPayload", "UpgradeKitPayload"].includes(o.item.__class__)) continue;
						let id = o.item.upgradeItemId || o.item.selectionKitId || o.item.cityEntityId;
						if (!selectionKits[id]) selectionKits[id] = [];
						selectionKits[id].push(idx);
					}
				} else {
					let reward = r.id;
					if (r.type === "building") {
						reward = r.subType;
					}
					if (!selectionKits[reward]) selectionKits[reward] = [];
					selectionKits[reward].push(idx);
				}
			}
		}
		for (let k in MainParser.Inventory) {
			if (! MainParser.Inventory.hasOwnProperty(k)) continue
			if (MainParser.Inventory[k]?.item?.reward?.type==="set") {
				addItems(MainParser.Inventory[k].item.reward.rewards,MainParser.Inventory[k].item.reward.id)
			}

		}

		Kits.upgradeKits = {}

		for (let u of Object.values(MainParser.BuildingUpgrades)) {
			let upgradeList = [u.upgradeItem.id];
			let buildingList=[];
			let sK=[]
			let us = u.upgradeItem.id.split("_")
			let upgradeType = us.includes("gold") ? "golden" : us.includes("silver") ? "silver" : us.includes("ascended") ? "ascended" : us[0];	
			let upgradeCount=JSON.parse(`{"${upgradeType}":${u.upgradeSteps.length-1}}`)
			for (let i = 1;i<u.upgradeSteps.length;i++) {
				for (b of u.upgradeSteps[i].buildingIds) {
					buildingList.push(b)
					if (Kits.upgradeKits[b]) {
						buildingList = [...buildingList,...Kits.upgradeKits[b].buildingList];
						upgradeList = [...upgradeList,...Kits.upgradeKits[b].upgradeList];
						upgradeCount = {...upgradeCount,...Kits.upgradeKits[b].upgradeCount};
						delete Kits.upgradeKits[b]						
					}
					if (selectionKits[b]) sK.push(...selectionKits[b])
				}
			}
			for (let b of u.upgradeSteps[0].buildingIds) {
				if (sK.length>0) selectionKits[b] = Array.from(new Set([...sK,...(selectionKits[b]||[])]))
				let i = Object.keys(Kits.upgradeKits)[Object.values(Kits.upgradeKits).findIndex(x=>x.buildingList.includes(b))]
				if (i) {
					Kits.upgradeKits[i].buildingList = [...Kits.upgradeKits[i].buildingList,...buildingList];
					Kits.upgradeKits[i].upgradeList = [...Kits.upgradeKits[i].upgradeList,...upgradeList];
					Kits.upgradeKits[i].upgradeCount = {...Kits.upgradeKits[i].upgradeCount,...upgradeCount};
				} else {				
					Kits.upgradeKits[b] = {upgradeList:upgradeList,buildingList:buildingList,upgradeCount:upgradeCount};
				}
			}
		}

		for (let k in kits) {
			if (kits[k].kit) {
				if (!Array.isArray(kits[k].kit)) kits[k].kit = [kits[k].kit]
				continue;
			}
			let s = [];
			if (kits[k].buildings) {
				for (let b in kits[k].buildings) {
					if (!kits[k].buildings.hasOwnProperty(b)) continue;
					if (kits[k].buildings[b].first && Kits.upgradeKits?.[kits[k].buildings[b].first]?.upgradeList) {
						Kits.upgradeKits[kits[k].buildings[b].first]?.upgradeList.forEach(x => kits[k].buildings[b][x]=x);
					}
					for (let i of Object.values(kits[k].buildings[b])) {
						s.push(...(selectionKits[i] || []));
					}
				}
			}
			kits[k].kit = Array.from(new Set(s));
			s = [];
			if (kits[k].assets) {
				for (let b of kits[k].assets) {
					for (let i of selectionKits[b] || []) {	
						s.push(i);
					}
				}
				kits[k].assetKits = Array.from(new Set(s));
			}
		}

		let create = (type, id, showMissing = true) => {
			return {
				type: type,
				item: inv[id] || (type === "first" ? entities[id] : (type === "asset" ? entities[id] : id)),
				fragments: inv["fragment#" + id]?.inStock,
				reqFragments: inv["fragment#" + id]?.required,
				missing: ((inv[id]?.inStock || 0) < 1) && (((inv["fragment#" + id]?.inStock) || 0) < 1),
				showMissing: showMissing
			};
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
					if (Kits.upgradeKits[building.first]) {
						for (let b of Kits.upgradeKits[building.first].buildingList) {
							let l = itemRow.push(create('first',b,false));
							if (!itemRow[l-1].missing) showB = true; 				
						}
					}
				}

				for (let i in building) {
					if (!building.hasOwnProperty(i)) continue;
					if (i==="first")	continue;
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
					if (Kits.upgradeKits[a]) {
						for (let b of Kits.upgradeKits[a].buildingList) {
							let l = assetRow.push(create('update',b,false));
							if (!assetRow[l-1].missing) showA = true; 				
						}
					} 
				}
			}
			if (kits[set].assetKits) {
				for (let a of kits[set].assetKits) {
					let l = assetRow.push(create('kit',a));
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
			let favourite = "";
			let favClass = "";
			let KitText = '';
			
			if (Name) { // Name is set
				favourite = `<span class="FavStar" data-name="${Name}" onclick="Kits.toggleFavourite(event)" style="background-image:url('${Kits.favourites.includes(Name)? srcLinks.get("/shared/gui/guild_meta_layer/guild_meta_layer_recommend_star_fill.png",true) : srcLinks.get("/shared/gui/guild_meta_layer/guild_meta_layer_recommend_star_empty.png",true)}')"></span>`
				favClass = Kits.favourites.includes(Name) ? "":" notFavourite";
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
			else if (GroupName) { // Group is set
				let i18nKey = 'Boxes.Kits.' + GroupName,
					i18nTranslation = i18n(i18nKey);

				if (i18nKey === i18nTranslation) i18nTranslation = GroupName.replace(/_/g, ' '); //No translation => Fallback to GroupName

				KitText = i18nTranslation;
				show = true;
				if (GroupName !== 'Events')
					t += '</div>'
				t += `<div class="group"><h1 class="grouphead" onclick="Kits.toggleGroup(event)">` + KitText + '</h1>'
			}
			else { // No name and group set => Show udate
				KitText = i18n('Boxes.Kits.Udate') + kits[set].udate;
				show = true;
			}
			//let upgradeOrder=["upgrade","silver","golden","platinum","ascended"];
			let upgrades = "";
			let eff=""
			if (kits[set].buildings?.[0]?.first && MainParser.CityEntities[kits[set].buildings[0].first]) {
				let f=Kits.upgradeKits?.[kits[set].buildings[0].first]
				let upgradeCount = f?.upgradeCount;
				if (upgradeCount) {
					upgrades = '<span class="upgrades" data-original-title="'+i18n('Boxes.Kits.Upgrades')+'" data-toggle="tooltip">'
					let first = true
					//for (let i of upgradeOrder) {
					for (let i in upgradeCount) {
						if (!upgradeCount[i]) continue
						upgrades += (first ? '<span class="base">1</span>' : "") + `<span class="${i}">${upgradeCount[i]}</span>` //title="'+i18n('Boxes.Kits.Base')+'"
						first = false;
					}
					upgrades+= '</span>'
				}
				if (f?.buildingList) {
					let rating=Productions.rateBuildings([kits[set].buildings[0].first,...f?.buildingList]?.slice(-3),true)
					let title=""
					if (!rating) break
					for (r of rating) {
						if (title === "") {
							title = `${r.building?.name||r.name}: ${Math.round(100 * r.rating.totalScore)}`
						}else {
							title =`${r.building?.name||r.name}: ${Math.round(100 * r.rating.totalScore)}<br>`+title
						}
					}
					let top=rating.pop()
					eff = `<span class="kitsEff" data-original-title="${title}">${i18n('Boxes.Kits.Efficiency')}: `
					eff += Math.round(100 * top?.rating.totalScore||0);
					eff+= '</span>'
				}
			}

			if (!GroupName) {
				t += '<div class="item-row'+ (!show ? " all-missing" : "") + favClass + '">'
				t += `<h2 class="head sticky">` + favourite + ChainSetIco +' '+ KitText + (ChainSetIco !== "" ? "": eff) + upgrades + '</h2>'
			}
			if(buildings.length) {
				buildings.forEach((building) => {
					let rowTd = ''
					building.forEach((e)=> {
						rowTd += Kits.ItemDiv(e);
					});
					t += rowTd
				})
			}

			// Kit listing
			if (kitRow.length) {
				let rowTd = ''

				kitRow.forEach((e)=> {
					rowTd += Kits.ItemDiv(e);
				});

				t += rowTd
			}

			// Asset listing
			if (assetRow.length) {
				t += `<h3 class="assets-header ${!show ? "all-missing" : (!showA ? "row-missing" : "")}">${i18n('Boxes.Kits.Extensions')}</h3>`;
				let rowTd = ''
				assetRow.forEach((e)=> {
					rowTd += Kits.ItemDiv(e);

				});

				t += `<div class="item-row  ${!show ? "all-missing" : (!showA ? "row-missing" : "")}">` + rowTd + '</div>';
			}
			if (!GroupName)
				t += '</div>';
		}

		t += '</div>';

		$('#kitsBodyInner').html(t);
		$('#kitsBodyInner [data-original-title]').tooltip({
			html: true,
			container: '#kits'
		});
	},


	/**
	 * Creates a `div` for any item.
	 * @param {SetItem} el
	 * @returns {string} HTML string of the `div` element.
	 */
	ItemDiv: (el)=> {

		if (!el?.item) return '';
		if (el.missing && !el.showMissing) return '';
		let item = el.item,
			aName = item.itemAssetName || item.asset_id || MainParser.BuildingUpgrades[item]?.upgradeItem?.iconAssetName || Kits.specialCases[item] || item,
			url = '/shared/icons/reward_icons/reward_icon_' + aName + '.png',
			title = '';

		try {
			if (el.type === "first" || el.type === "asset") {
				url = '/city/buildings/' + [aName.slice(0, 1), '_SS', aName.slice(1)].join('') + '.png';
			}
		} 
		catch (error) {
			console.error('Error processing element in ItemDiv:', error.message, { element: el, assetName: aName });
		}

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

		return 	`<div class="item${((el.missing) ? ' is-missing' : '')}">
					<div class="image"><img loading="lazy" src="${url}" alt="${title}" /></div>
					<strong class="in-stock" data-original-title="${i18n('Boxes.Kits.InStock')}">${(item.inStock ? item.inStock : '-')}</strong>
					<span>${title}</span>
					<span class="fragments">${(el.fragments ? `<img class="ItemFragment" src="${Kits.fragmentURL}"> ` + el.fragments + '/' + el.reqFragments : '')}</span>
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
			let id = x.item.upgradeItemId||x.item.selectionKitId||x.item.cityEntityId||x.itemAssetName;
			let asset= x.itemAssetName;
			let name = x.name;
			if (x.item.__class__ === "BuildingItemPayload") {
				asset=MainParser.CityEntities[id].asset_id;
			}
			if (x.item.__class__ === "FragmentItemPayload") {
				id =  "fragment#"+ ((x.item.reward.assembledReward.type === "building") ? 
										(x.item.reward.assembledReward.subType) : 
										(x.item.reward.assembledReward.id||x.item.reward.assembledReward.iconAssetName));
				amount = x.inStock*x.item.reward.amount;
				required = x.item.reward.requiredAmount;
				asset = x.item.reward.assembledReward.iconAssetName;
				name = x.item.reward.assembledReward.name;
			}
			if (x?.item?.reward?.type === "set") {
				id = x.item.reward.id;
				asset = x.item.reward.iconAssetName;
			}
			if (!Ret[id]) {
				Ret[id] = {id:id,name:name,inStock:amount,required:required,itemAssetName:asset}
			} else {
				Ret[id].inStock += amount
			}
		}
		return Ret;
    },


	toggleFavourite:(e) => {
		let name = e.target.dataset.name
		let index = Kits.favourites.indexOf(name);

		if (index === -1) {
			Kits.favourites.push(name);
		} else {
			Kits.favourites.splice(index, 1);
		}
		e.target.style = `background-image:url('${Kits.favourites.includes(name)? srcLinks.get("/shared/gui/guild_meta_layer/guild_meta_layer_recommend_star_fill.png",true) : srcLinks.get("/shared/gui/guild_meta_layer/guild_meta_layer_recommend_star_empty.png",true)}')`
		localStorage.setItem("Kits.favourites",JSON.stringify(Kits.favourites));
		e.target.parentElement.parentElement.classList.toggle("notFavourite");
	},

	/**
	 * Toggles displaying of owned, missing and all set items.
	 */
	ToggleView: ()=> {
		Kits.ShowMissing = (Kits.ShowMissing + 1) % 3;

		Kits._filter()

		$('#kits-triplestate-button').text(i18n('Boxes.Kits.TripleStateButton'+Kits.ShowMissing))
	},

	ToggleFavouritesBtn:() => {
		$('#kits-showFavourites')[0].classList.toggle("btn-active");
		Kits._filter()
	},

	toggleGroup: (event)=> {
		// Toggle visibility of items under this group
		const groupElement = event.currentTarget.parentElement;
		const itemRows = groupElement.querySelectorAll('.item-row');

		for (let row of itemRows) {
			row.style.display = row.style.display === 'none' ? '' : 'none';
		}
	},

	_filter:()=>{
		$('#kitsBodyInner .item-row').show()
		$('#kitsBodyInner .item').show()
		Kits._filterSets();
		Kits._filterItems();
		Kits._filterMissing();
		if ($('#kits-showFavourites')[0].classList.contains("btn-active")) $('.notFavourite').hide(); 
	},

	/**
	 * Filters whole sets by name patterns.
	 */

	_filterMissing:()=>{
		if (Kits.ShowMissing === 0) {
			$('.is-missing').hide();
			$('.row-missing').hide();
			$('.all-missing').hide();
		}
		if (Kits.ShowMissing === 1) {
			$('.all-missing').hide();
		}
	},

	_filterSets: () => {
		const filterRegExps = $('#kitsBodyTopbar input[data-type="filter-sets-text"]').val()
			.split('||').filter(it => it.trim().length > 0).map(it => new RegExp(it, 'i'));
		if (filterRegExps && filterRegExps.length >= 1) {
			const allRowHeads = $('#kitsBodyInner .head');
			allRowHeads.each((i, e) => {
				const setHead = $(e);
				if (!filterRegExps.some(it => it.test(setHead.text()))) {
					setHead.parent('.item-row').hide();
				}
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
			const allRows = $('#kitsBodyInner .item-row');
			allRows.each((i, e) => {
				const row = $(e);
				let visibleItemsCount = 0;
				const itemDivs = row.find('.item');
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
				if (visibleItemsCount < 1) {
					row.hide();
				}
			});
		}
	},

	UpgradeSchemes:null,
	selectionOptions:null,
	Names:{},
	Assets:{},

	CreateUpgradeSchemes: ()=> {
		let sO = {}
		for (let s of Object.values(MainParser.SelectionKits)) {
			Kits.Names[s.selectionKitId] = s.name
			for (let c of s.options || s.eraOptions[CurrentEra].options) {
				id = (c.item.cityEntityId||c.item.upgradeItemId)
				if (!id)
					continue
				if (!sO[id]) {
					sO[id] = [s.selectionKitId]
				} else {
					sO[id].push(s.selectionKitId)
				}
			}			
		}

		let endBuildings = {}
		let startBuildings = {}

		for (let upgrade of Object.values(MainParser.BuildingUpgrades)) {
			if (["silver_upgrade_kit_BOWL22A"].includes(upgrade.upgradeItem.id)) continue; // faulty game data
			Kits.Names[upgrade.upgradeItem.id] = upgrade.upgradeItem.name;
			let upgradeId= upgrade.upgradeItem.id;
			let buildingList = upgrade.upgradeSteps.map(x => x.buildingIds)
			let finalBuildings = buildingList.pop()
			buildingList = buildingList.flat().map(x => ({buildingId: x, upgradeId: upgradeId}));

			if (endBuildings[buildingList[0].buildingId]) {
				let buffer=buildingList[0].buildingId
				buildingList.unshift(...endBuildings[buffer]);
				delete endBuildings[buffer];
				delete startBuildings[buildingList[0].buildingId];
			}
			for (let endBuilding of finalBuildings) {
				if (startBuildings[endBuilding]) {
					endBuildings[startBuildings[endBuilding]].unshift(...buildingList)
					startBuildings[buildingList[0].buildingId] = startBuildings[endBuilding];
					delete startBuildings[endBuilding];
				}
				else {
					startBuildings[buildingList[0].buildingId] = endBuilding;
					endBuildings[endBuilding] = buildingList;
				} 
			}
		}
		let schemes={}
		let allBuildingsUpgradeCounts = {}

		for (let [endBuilding,buildingList] of Object.entries(endBuildings)) {
			let upgrades={}
			let upgradeCount = {}

			for (b of buildingList) {

				if (!upgrades[b.upgradeId]) {
					upgrades[b.upgradeId] = 1
				} else {
					upgrades[b.upgradeId]++
				}

				allBuildingsUpgradeCounts[b.buildingId] = structuredClone(upgradeCount)

				let us=b.upgradeId.split("_")
				let upgradeType = us.includes("gold") ? "golden" : us.includes("silver") ? "silver" : us.includes("ascended") ? "ascended" : us[0];	

				if (!upgradeCount[upgradeType])
					upgradeCount[upgradeType] = 0
				upgradeCount[upgradeType] ++
			}
			allBuildingsUpgradeCounts[endBuilding] = structuredClone(upgradeCount)
			schemes[endBuilding] = {
				upgrades: upgrades,
				upgradeSteps: buildingList
			}	
		}
		Kits.allBuildingsUpgradeCounts = allBuildingsUpgradeCounts
		Kits.UpgradeSchemes = schemes
		Kits.selectionOptions = sO
	},


	BuildingsFromInventory: () =>{
		let output = {}
		let upgradeBuildings = Object.keys(Kits.UpgradeSchemes);
		upgradeBuildings.push(...(Object.values(Kits.UpgradeSchemes)).map(x => x.upgradeSteps.map(y => y.buildingId)).flat());
		//Flatten Inventory
		let Inventory = {}
		let InventoryAdd = (id,amount) => {
			if (amount === 0) return
			Inventory[id] = (Inventory[id] || 0) + amount;
			if (id.substring(1,2)=="_" && !upgradeBuildings.includes(id)) {
				if (output[id]) {
					output[id].chains[0].count += amount
					output[id].amount += amount
				} else
					output[id] = {building:"inInventory", amount:amount, chains:[{chain:[{type:"building",id:id,from:"inventory",count:1}],count:amount}]};
			}
		}
		let InventoryAddSet = (rewards, amount) => {
			for (let r of rewards) {
				if (r.type === "building") {
					InventoryAdd(r.subType, amount * r.amount)
				} else if (r.subType === "upgrade_kit") {
					InventoryAdd(r.id, amount * r.amount)
				} else if (r.subType === "selection_kit") {
					InventoryAdd(r.id, amount * r.amount)
				} else if (r.type === "set") {
					InventoryAddSet(r.rewards, amount * r.amount)
				}
			}
		}
		for (let i of Object.values(MainParser.Inventory)) {
			if (i.itemAssetName === "icon_fragment") {
				if (i.item.reward.assembledReward.subType==="selection_kit") {
					InventoryAdd(i.item.reward.assembledReward.id, Math.floor(i.inStock/i.item.reward.requiredAmount))
					if (i.item.reward.assembledReward.iconAssetName != i.item.reward.assembledReward.id)
						 Kits.specialCases[i.item.reward.assembledReward.id]=i.item.reward.assembledReward.iconAssetName
				}
				if (i.item.reward.assembledReward.subType=="upgrade_kit") {
					InventoryAdd(i.item.reward.assembledReward.id, Math.floor(i.inStock/i.item.reward.requiredAmount))
					if (i.item.reward.assembledReward.iconAssetName != i.item.reward.assembledReward.id) 
						 Kits.specialCases[i.item.reward.assembledReward.id]=i.item.reward.assembledReward.iconAssetName
				}
				if (i.item.reward.assembledReward.type=="building") {
					InventoryAdd(i.item.reward.assembledReward.subType, Math.floor(i.inStock/i.item.reward.requiredAmount))
				}
			} else if (i.item.selectionKitId) {
				InventoryAdd(i.item.selectionKitId, i.inStock)
				if (i.itemAssetName != i.item.selectionKitId)
					Kits.specialCases[i.item.selectionKitId]=i.itemAssetName
			} else if (i.item.cityEntityId) {
				InventoryAdd(i.item.cityEntityId, i.inStock)
			} else if (i.item.upgradeItemId) {
				InventoryAdd(i.item.upgradeItemId, i.inStock)
				if (i.itemAssetName != i.item.upgradeItemId)
					Kits.specialCases[i.item.upgradeItemId]=i.itemAssetName
			} else if (i.item?.reward?.type === "set") { //check if this works when there is a league reward with nested sets
				InventoryAddSet(i.item.reward.rewards,i.inStock)
			}
		}
		//flatten CityBuildings
		cityBuildings = {}
		Object.values(MainParser.CityMapData).forEach(x=>cityBuildings[x.cityentity_id]=(cityBuildings[x.cityentity_id] || 0)+1);
		//check non-upgrade scheme selection kit items
		for (let [id,kits] of Object.entries(Kits.selectionOptions)) {
			if (id.substring(1,2)=="_" && !upgradeBuildings.includes(id)) {
				for (let kit of kits) {
					if (!Inventory[kit]) continue
					if (output[id]) {
						output[id].kitsUsed = (output[id].kitsUsed||0) + Inventory[kit];
						output[id].amount = (output[id].amount||0) + Inventory[kit];
						output[id].chains.push({chain:[{type:"selectionKit",id:kit,from:"inventory",count:1}],count:Inventory[kit]});
					} else 
						output[id] = {kitsUsed:Inventory[kit],amount:Inventory[kit],chains:[{chain:[{type:"selectionKit",id:kit,from:"inventory",count:1}],count:Inventory[kit]}]};
				}
			}
		}
		//check each scheme
		for (let [buildingId, scheme] of Object.entries(Kits.UpgradeSchemes)) {
			let ignoreAscended = false
			do { //repeat for non-ascended version if ascended version is found
				let upgradeSteps = scheme.upgradeSteps;
				let upgrades = scheme.upgrades;
				let maxLevel = 0;
				let amount = 0
				let buildingsFromCity = 0;
				let buildingsFromInventory = 0;
				let kitCount = 0;
				let ascended = false;
				let chains = []
				let level
				let maxBuilding = buildingId
				if (ignoreAscended) buildingId = upgradeSteps[upgradeSteps.length-1].buildingId

				// determine selectionKit values
				let items = Object.keys(upgrades)
				items.push(...upgradeSteps.map(x => x.buildingId),buildingId)

				let SKs = Array.from(new Set(items.map(x => Kits.selectionOptions[x] || []).flat()))
				let sKvalues = Object.assign({},...SKs.map(x=>({[x]:0})));
				let upgradesIndexed = Object.keys(upgrades)
				for (let sk of SKs) {
					for (let o of MainParser.SelectionKits[sk].options) {
						let i = upgradesIndexed.indexOf(o.item.cityEntityId||o.item.upgradeItemId||"test")
						if (i > -1)
							sKvalues[sk] += Math.pow(2,i)
						else	
							sKvalues[sk] += 0.01
					}
				}
				//duplicate and sort selectionOptions & duplicate cityBuildings
				let SO = {}
				let city = {}
				for (let i of items) {
					if  (Kits.selectionOptions[i])
						SO[i] = Kits.selectionOptions[i].sort((a,b) => sKvalues[a] - sKvalues[b]) 	
					if (cityBuildings[i]) {
						city[i] = cityBuildings[i]
					}
				}
				//duplicate Inventory 
				let Inv = {}
				items.push(...SKs)
				for (let item of items) {
					if (Inventory[item]) {
						Inv[item] = Inventory[item]
					}
				}		

				//max Building already in Inventory (directly or via selection kit)
				if (Inv[buildingId]) {
					amount += Inv[buildingId];
					buildingsFromInventory += Inv[buildingId];
					for (let i = 0; i < Inv[buildingId]; i++) {
						chains.push([{type:"building", from:"inventory", id:buildingId}]);
					}
					maxLevel = upgradeSteps.length - (ignoreAscended ? 1 : 0);
					if (Object.keys(upgrades).join("").includes("ascended") && !ignoreAscended)
						ascended = true
				}
				if (Kits.selectionOptions[buildingId]) {
					for (let k of Kits.selectionOptions[buildingId] || []) {
						if (Inv[k]) {
							amount += Inv[k];
							kitCount += Inv[k];
							for (let i = 0; i < Inv[k]; i++) {
								chains.push([{type:"building", from:"selectionKit", id:k}]);
							}
							maxLevel = upgradeSteps.length - (ignoreAscended ? 1 : 0);
							if (Object.keys(upgrades).join("").includes("ascended") && !ignoreAscended)
								ascended = true
						}
					}
				}
				//assemble buildings from kits
				while (true) {
					let chain=[]
					level = upgradeSteps.length - (ignoreAscended ? 2 : 1)
					for (level; level>=0; level--) {
						let b = upgradeSteps[level].buildingId;
						if (city[b]) {
							buildingsFromCity++
							city[b]--
							chain.push({type:"building",from:"city",id:b})
							break
						}
						if (Inv[b]) {
							buildingsFromInventory++
							Inv[b]--
							chain.push({type:"building",from:"inventory",id:b})
							break
						}
						if (SO[b]) {
							let check = false
							for (let k of SO[b]) {
								if (Inv[k]) {
									Inv[k]--
									kitCount++;
									check = true
									chain.push({type:"building",from:"selectionKit",id:k})
									break
								}
							}
							if (check) break
						}
					}
					if (level>=0) {
						for (level;level<upgradeSteps.length; level++) {
							let upgrade = upgradeSteps[level].upgradeId;
							if (Inv[upgrade]) {
								if (upgrade.includes("ascended")) {
									if (ignoreAscended)	break
									ascended = true
								}
								Inv[upgrade]--;
								kitCount++;
								chain.push({type:"upgrade",from:"inventory",id:upgrade})
								continue
							}
							let check = false
							for (let k of SO[upgrade]||[]) {
								if (Inv[k]) {
									if (upgrade.includes("ascended")){
										if (ignoreAscended)	break
										ascended = true
									}
									Inv[k]--
									kitCount++
									chain.push({type:"upgrade",from:"selectionKit",id:k})
									check = true
									break
								}
							}
							if (check) continue
							break
						}
						if (level<=upgradeSteps.length && maxLevel === 0 && kitCount+buildingsFromInventory>0) {
							if (level<upgradeSteps.length) buildingId = upgradeSteps[level].buildingId
							maxLevel = level;
						}
					}
					if (level < maxLevel)
						break
					if (level === maxLevel) {
						amount++
						chains.push(chain)
					}				
				} 
				if (amount > 0 && (buildingsFromInventory > 0 || kitCount > 0)) {
					//flatten chains
					let flatChains = {}
					for (let chain of chains) {
						let compressed=[]
						for (let element of chain) {
							if (element.id === compressed[compressed.length-1]?.id||"") {
								compressed[compressed.length-1].count++;
							} else {
								compressed.push({id:element.id,type:element.type,from:element.from,count:1})
							}
						}
						let chainId = JSON.stringify(compressed)
						if (!flatChains[chainId]) {
							flatChains[chainId] = {chain:compressed,count:1};
						} else {
							flatChains[chainId].count++;
						}
					}
					let upgradeCount={}
					for (let [u,a] of Object.entries(upgrades)) {
						let us=u.split("_")
						upgradeType = us.includes("gold") ? "golden" : us.includes("silver") ? "silver" : us.includes("ascended") ? "ascended" : us[0];	
						if (!upgradeCount[upgradeType])
							upgradeCount[upgradeType] = {}
						upgradeCount[upgradeType].is = (upgradeCount[upgradeType].is||0) + Math.min(a, maxLevel)
						upgradeCount[upgradeType].max = (upgradeCount[upgradeType].max||0) + a

						maxLevel -= Math.min(a, maxLevel)
					}
					output[buildingId] = {
						kitsUsed:kitCount,
						includesAscended: ascended,
						buildingsFromCity: buildingsFromCity,
						buildingsFromInventory:buildingsFromInventory,
						amount: amount,
						chains: Object.values(flatChains),
						upgradeCount: upgradeCount,
						maxBuilding: maxBuilding
					}
					if (ascended) {
						let ascendedKit = Object.keys(upgrades).find(x => x.includes("ascended"));
						let ascendedStock = 0
						if (Inventory[ascendedKit]) 
							ascendedStock += Inventory[ascendedKit];
						for (let k of SO[ascendedKit]||[]) 
							if (Inventory[k]) 
								ascendedStock += Inventory[k]
						output[buildingId].ascendedStock = ascendedStock;
						ignoreAscended = true;
					} else {
						ignoreAscended = false
					}
				} else {
					ignoreAscended = false
				}
			} while (ignoreAscended)
		}
		return output;
	},

	InventoryTooltip: (e) => {
        const id = e?.currentTarget?.dataset?.id || e?.currentTarget?.parentElement?.dataset?.id;
		let lng = ExtWorld.substring(0, 2);
		const mapper = {
			'us': 'en',
			'xs': 'en',
			'zz': 'en',
			'ar': 'es',
			'mx': 'es',
			'no': 'en'
		};
		lng = mapper[lng] || lng;

		const inventoryBuilding = Productions.InventoryBuildings[id];
		if (!inventoryBuilding) return '';

		const upgradeCount = inventoryBuilding.upgradeCount;
		let upgrades = "";
		let upgradesMax = '<span class="upgrades">';

		if (upgradeCount) {
			upgrades = '<span class="upgrades"><span class="base">1</span>';
			for (let i in upgradeCount) {
				if (!upgradeCount[i]) continue;
				if (upgradeCount[i].is) {
					upgrades += `<span class="${i}">${upgradeCount[i].is}</span>`;
				}
				if (upgradeCount[i].max - upgradeCount[i].is) {
					upgradesMax += `<span class="${i}">+${upgradeCount[i].max - upgradeCount[i].is}</span>`;
				}
			}
			upgrades += '</span>';
		}
		upgradesMax += '</span>';

		let tooltip = `<div class="inventoryTooltip" lang="${lng}">`;
        tooltip += `<h2>${inventoryBuilding.amount}x ${MainParser.CityEntities[id]?.name}${upgrades}</h2>`;
		tooltip += `<span style="padding:3px 8px;">${i18n("Boxes.Tooltip.Efficiency.description")}:</span>`;

		if (inventoryBuilding.includesAscended) {
			tooltip += `<span class="inventoryChainAscendedStock">${inventoryBuilding.ascendedStock}x</span>`;
		}

		tooltip += `<div class="inventoryChains">`;
		for (let chain of inventoryBuilding.chains || []) {
			tooltip += `<div class="inventoryChain">`;
			tooltip += `<span class="inventoryChainCount">${chain.count}x</span>`;

			for (let c of chain.chain) {
				tooltip += `<div class="inventoryChainItem ${c.type} ${c.from}">`;
				tooltip += `<div class="inventoryChainItemImg"><img src="${srcLinks.getReward(Kits.specialCases[c.id] || c.id)}" alt=""></div>`;
				tooltip += `<div class="inventoryChainItemDesc">`;

				if (c.count > 1) {
					tooltip += `<span class="inventoryChainItemCount">${c.count}x</span>`;
				}

				tooltip += `<span>${Kits.Names[c.id] || MainParser.CityEntities[c.id]?.name}</span>`;
				tooltip += `</div></div>`;
			}
			tooltip += `</div>`;
		}
		tooltip += `</div>`;

		if (upgradesMax !== '<span class="upgrades"></span>') {
			tooltip += `<div class="maxBuilding">`;
			tooltip += `<h2>${i18n("Boxes.Kits.maxBuilding")}:</h2>`;
			tooltip += `<span class="maxBuildingDetails">${MainParser.CityEntities[inventoryBuilding.maxBuilding]?.name}${upgradesMax}</span>`;
			tooltip += `</div>`;
		}

		tooltip += `</div>`;
		return tooltip;
	}
};

/**
 * @typedef SetItem
 * @property {string} type 'first', 'update', 'kit' or 'asset'
 * @property {string|object} item
 * @property {boolean} missing
 */
