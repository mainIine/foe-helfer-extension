/*
 * *************************************************************************************
 *
 * Copyright (C) 2024 FoE-Helper team - All Rights Reserved
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
				}).text(i18n('Boxes.Kits.TripleStateButton'+Kits.ShowMissing))
			);
			$('#kitsBodyBottombar').append(
				$('<span />').attr({
					id: 'kits-showFavourites',
					class: 'btn-default btn-tight',
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
		
		selectionKits = {};
		
		for (let k in MainParser.SelectionKits) {
			if (!MainParser.SelectionKits.hasOwnProperty(k)) continue;
			for (o of MainParser.SelectionKits[k].eraOptions.BronzeAge.options) {
				if (!["BuildingItemPayload","UpgradeKitPayload"].includes(o.item.__class__)) continue;
				let id = o.item.upgradeItemId||o.item.selectionKitId||o.item.cityEntityId;
				if (!selectionKits[id]) selectionKits[id] = [];
				selectionKits[id].push(k);
			}
		}

		let addItems = (set,idx) => {
			for (let r of set) {
				if (r.type=="set") {
					addItems (r.rewards,idx)
				} else if (r.subType == "selection_kit") {
					for (o of MainParser.SelectionKits[r.id].eraOptions.BronzeAge.options) {
						if (!["BuildingItemPayload","UpgradeKitPayload"].includes(o.item.__class__)) continue;
						let id = o.item.upgradeItemId||o.item.selectionKitId||o.item.cityEntityId;
						if (!selectionKits[id]) selectionKits[id] = [];
						selectionKits[id].push(idx);
					}
				} else {
					let reward=r.id;
					if (r.type == "building") {
						reward=r.subType;
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
			let upgradeCount=JSON.parse(`{"${u.upgradeItem.id.includes("ascended")?"ascended" : u.upgradeItem.id.split("_")[0]}":${u.upgradeSteps.length-1}}`)
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

		// check if all upgrade kits' first buildings reference known buildings
		let newCat=true;

		for (let id in Kits.upgradeKits) {
			const upg = Kits.upgradeKits[id];
			const kits_for_upg = kits.filter(o => (o?.buildings instanceof Array) && o.buildings.filter(
				b => Object.entries(b).filter(bu => bu[0] === 'first' && bu[1] === id).length > 0).length > 0
			);
			if (kits_for_upg.length === 0) {
				if (devMode==="true") console.log(`\t\t{\n\t\t\t"name": "${MainParser.CityEntities[id]?.name}",\n\t\t\t"buildings": [\n\t\t\t\t{"first": "${id}"}\n\t\t\t]\n\t\t},\n`) //`First building ${id} (${MainParser.CityEntities[id]?.name}) of upgrade(s) ${upg.upgradeList.join(',')} not found in Kits' json.`, upg);
				if (newCat) {
					newCat = false;
					kits.push({"groupname": "new_not_categorized"})	
				}
				kits.push({"name": MainParser.CityEntities[id]?.name,"buildings": [{"first": id}]})				
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
			s=[]
			if (kits[k].assets) {
				for (let b of kits[k].assets) {
					for (i of selectionKits[b]) {
						s.push(i);
					}
				}
				kits[k].assetKits = Array.from(new Set(s));
			}
		}
		
		let create = (type,id,showMissing=true) => {
			
			let item = {
						type: type,
						item: inv[id] || (type==="first" ? entities[id] : (type==="asset" ? entities[id] : id)),
						fragments: inv["fragment#" + id]?.inStock,
						reqFragments: inv["fragment#" + id]?.required,
						missing: ((inv[id]?.inStock || 0) < 1) && (((inv["fragment#" + id]?.inStock)||0) < 1),
						showMissing:showMissing
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
				t += `<div class="group"><h1 class="grouphead" onclick="Kits.toggleGroup()">` + KitText + '</h1>'
			}
			else { // No name and group set => Show udate
				KitText = i18n('Boxes.Kits.Udate') + kits[set].udate;
				show = true;
			}
			//let upgradeOrder=["upgrade","silver","golden","platinum","ascended"];
			let upgrades = "";
			if (kits[set].buildings?.[0]?.first && MainParser.CityEntities[kits[set].buildings[0].first]) {
				let upgradeCount = Kits.upgradeKits?.[kits[set].buildings[0].first]?.upgradeCount;
				if (upgradeCount) {
					upgrades = '<span class="upgrades" data-original-title="'+i18n('Boxes.Kits.Upgrades')+'" data-toggle="tooltip">'
					let first = true
					//for (let i of upgradeOrder) {
					for (let i in upgradeCount) {
						if (!upgradeCount[i]) continue
						upgrades += (first ? '<span class="base" title="'+i18n('Boxes.Kits.Base')+'">1</span>' : "") + `<span class="${i}">${upgradeCount[i]}</span>`
						first = false;
					}
					upgrades+= '</span>'
				}
			}
			
			if (!GroupName) {
				t += '<div class="item-row'+ (!show ? " all-missing" : "") + favClass + '">'
				t += `<h2 class="head">` + favourite + ChainSetIco +' '+ KitText + upgrades + '</h2>'
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
		$('.upgrades').tooltip({
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
			if (el.type === "first" || el.type === "asset") url = '/city/buildings/' + [aName.slice(0, 1), '_SS', aName.slice(1)].join('') + '.png';
		} 
		catch {
			console.log(el)
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
					<strong class="in-stock" title="${i18n('Boxes.Kits.InStock')}">${(item.inStock ? item.inStock : '-')}</strong>
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
			if (x.item.__class__=="BuildingItemPayload") {
				asset=MainParser.CityEntities[id].asset_id;
			}
			if (x.item.__class__=="FragmentItemPayload") {
				id =  "fragment#"+ ((x.item.reward.assembledReward.type == "building") ? 
										(x.item.reward.assembledReward.subType) : 
										(x.item.reward.assembledReward.id||x.item.reward.assembledReward.iconAssetName));
				amount = x.inStock*x.item.reward.amount;
				required = x.item.reward.requiredAmount;
				asset = x.item.reward.assembledReward.iconAssetName;
				name = x.item.reward.assembledReward.name;
			}
			if (x?.item?.reward?.type == "set") {
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

	toggleGroup: ()=> {
		console.log(this)
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
		if (Kits.ShowMissing == 0) {
			$('.is-missing').hide();
			$('.row-missing').hide();
			$('.all-missing').hide();
		}
		if (Kits.ShowMissing == 1) {
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
			let lastSetHead;
			let visibleSetItemsCount = 0;
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
				visibleSetItemsCount += visibleItemsCount;
				if (visibleItemsCount < 1) {
					row.hide();
				}
			});
			if (lastSetHead) {
				if (visibleSetItemsCount < 1)  lastSetHead.hide();
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