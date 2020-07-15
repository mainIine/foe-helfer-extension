/*
 * **************************************************************************************
 *
 * Dateiname:                 kits.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              27.03.20, 15:37 Uhr
 *
 * Copyright © 2020
 *
 * **************************************************************************************
 */

/**
 *
 * @type {{BuildingSelectionKits: null, init: Kits.init, GetTabContent: (function(): string), ReadSets: Kits.ReadSets, GetInvententoryArray: (function(): []), globCnt: number, SetTabs: Kits.SetTabs, GetTabs: (function(): string), isChecked: [], BuildBox: Kits.BuildBox, setBuildings: [], ReadSelectionKits: Kits.ReadSelectionKits, CreateBody: Kits.CreateBody, BuildingSets: null, Tabs: [], ScanInvetory: Kits.ScanInvetory, SetTabContent: Kits.SetTabContent, KitsjSON: null, TabsContent: [], Inventory: null, setSingles: []}}
 */
let Kits = {

	//
	KitsjSON: null,

	// Lager
	Inventory: null,

	// Updatestufen der Eventgebäude
	BuildingSelectionKits: null,

	// Gebäude Sets
	BuildingSets: null,

	// für die interne Verarbeitung
	setBuildings: [],

	// einzelne Selection-Kits
	setSingles: [],

	// vormerken welches Gebäude schon aufgenommen wurde
	// da es zwei Objecte sind, ist das notwendig
	isChecked: [],

	// gleicher Zähler für alle Funktionen
	globCnt: 0,

	// Tabs
	Tabs: [],
	TabsContent: [],


	/**
	 * Get all sets from the server
	 */
	init: ()=> {

		let data = localStorage.getItem('KnownKitsData');

		if(data === null || MainParser.checkNextUpdate('KnownKitsDate') === true){
			MainParser.loadJSON('https://cache.foe-rechner.de/kits/sets.json', (data)=>{

				localStorage.setItem('KnownKitsData', data);
				localStorage.setItem('KnownKitsDate', MainParser.getAddedDateTime(48));

				Kits.KitsjSON = JSON.parse(data);
				Kits.BuildBox();
			});

		} else {
			Kits.KitsjSON = JSON.parse(data);
			Kits.BuildBox();
			//Kits.ReadSets();
		}
	},


	/**
	 * Create the box
	 *
	 * @constructor
	 */
	BuildBox: ()=> {

		// zurück setzen
		Kits.isChecked = [];
		Kits.setBuildings = [];
		Kits.setSingles = [];
		Kits.globCnt = 0;

		if( $('#kits').length === 0 )
		{
			HTML.AddCssFile('kits');

			HTML.Box({
				'id': 'kits',
				'title': i18n('Boxes.Kits.Title'),
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			});

		} else {
			HTML.CloseOpenBox('kits');
		}

		Kits.ReadSets();

		// Kits.CreateBody();
	},


	ReadSets: ()=> {
		let inv = Kits.GetInvententoryArray(),
			kits = Kits.KitsjSON;

		let t = '<table class="foe-table">';

		t += 	`<tr>
					<th></th>
					<th>${i18n('Boxes.Kits.Name')}</th>
					<th></th>
					<th>${i18n('Boxes.Kits.KitName')}</th>
				</tr>`;

		// Sets durchsteppen
		for(let set in kits)
		{
			if(!kits.hasOwnProperty(set)){
				break;
			}

			let buildings = [],
				assetRow = [],
				show = false;

			for(let i in kits[set]['buildings'])
			{
				if(!kits[set]['buildings'].hasOwnProperty(i)){
					break;
				}

				const building = kits[set]['buildings'][i];
				let itemRow = [];

				// Level 1
				let itemL1 = inv.find(el => el['item']['cityEntityId'] === building['first']);

				if(itemL1)
				{
					itemRow.push({
						type: 'first',
						item: itemL1
					})
				}

				// Upgrade Kit
				if(building['update'])
				{
					let itemUgr = inv.find(el => el['itemAssetName'] === building['update']);

					if(itemUgr)
					{
						itemRow.push({
							type: 'update',
							item: itemUgr
						})
					}
				}

				if(itemRow.length){
					buildings.push(itemRow);
					show = true;
				}
			}


			// Building has asset buildings?
			if(kits[set]['assets'])
			{
				for(let a in kits[set]['assets'])
				{
					if(!kits[set]['assets'].hasOwnProperty(a)){
						break;
					}

					let asset = inv.find(el => el['item']['cityEntityId'] === kits[set]['assets'][a]);

					if(asset) {
						assetRow.push({
							element: 'asset',
							item: asset
						})
					}
				}
			}

			if(assetRow.length){
				show = true;
			}

			let kitRow = [];

			if(kits[set]['kit']){
				let k = inv.find(el => el['itemAssetName'] === kits[set]['kit']);

				if(k){
					kitRow.push({
						type: 'update',
						item: k
					})
				}
			}

			if(kitRow.length){
				show = true;
			}

			if(show)
			{
				t += `<tr><th colspan="4" class="head">${kits[set]['name']}</th></tr>`;

				if(buildings)
				{
					buildings.forEach((e) => {
						let rowTd = '';

						if(e[0]['type'] === 'first'){

							rowTd += Kits.ItemTd(e[0]);

							if(e[1] === undefined){
								rowTd += '<td colspan="2"></td>';

							} else {
								rowTd += Kits.ItemTd(e[1]);
							}

						} else if(e[0]['type'] === 'update') {
							rowTd += '<td colspan="2"></td>';
							rowTd += Kits.ItemTd(e[0]);
						}

						t += '<tr>' + rowTd + '</tr>';
					});
				}

				// Asset listing
				if(assetRow.length)
				{
					t += `<tr><td colspan="4" class="assets-header">${i18n('Boxes.Kits.Extensions')}</td></tr>`;
					let rowTd = '<td colspan="4"><div class="assets-row">';

					assetRow.forEach((e) => {
						rowTd += Kits.ItemDiv(e);
					});

					rowTd += '</div></td>';

					t += '<tr>' + rowTd + '</tr>';
				}

				// Kit listing
				if(kitRow.length)
				{
					t += `<tr><td colspan="4" class="assets-header">${i18n('Boxes.Kits.SelectionKit')}</td></tr>`;

					let rowTd = Kits.ItemTd(kitRow[0]);
					rowTd += '<td colspan="2"></td>';

					t += '<tr>' + rowTd + '</tr>';
				}
			}
		}

		t += '</table>';

		$('#kitsBody').html(t);
	},


	/**
	 * Create two td's for a level1 oder update building
	 *
	 * @param el
	 * @returns {string}
	 * @constructor
	 */
	ItemTd: (el)=> {
		let item = el['item'],
			aName = item['itemAssetName'],
			td = '',
			url;

		if(el['type'] === 'first'){
			url = MainParser.InnoCDN + 'assets/city/buildings/' + [aName.slice(0, 1), '_SS', aName.slice(1)].join('') + '.png';

		} else if (el['type'] === 'update') {
			url = MainParser.InnoCDN + 'assets/shared/icons/reward_icons/reward_icon_' + aName + '.png';
		}

		td += '<td class="text-center"><img class="kits-image" src="' + url + '" alt="' + item['name'] + '" /></td>';
		td += '<td>' + item['name'] + '<br>' + i18n('Boxes.Kits.InStock') + ': <strong class="text-warning">' + item['inStock'] + '</strong></td>';

		return td;
	},


	/**
	 * Create a div-row for assets of a set
	 *
	 * @param el
	 * @returns {string}
	 * @constructor
	 */
	ItemDiv: (el)=> {
		let item = el['item'],
			aName = item['itemAssetName'],
			url = MainParser.InnoCDN + 'assets/city/buildings/' + [aName.slice(0, 1), '_SS', aName.slice(1)].join('') + '.png';

		return 	`<div class="item-asset">
					<img class="asset-image" src="${url}" alt="${item['name']}" /><br>
					${item['name']}<br>${i18n('Boxes.Kits.InStock')}: <strong class="text-warning">${item['inStock']}</strong>
				</div>`;
	},


	/**
	 * Return MainParser.Inventory as array
	 *
	 * @returns {[]}
	 * @constructor
	 */
	GetInvententoryArray: () => {
		let Ret = [];
		for (let i in MainParser.Inventory) {
			if (!MainParser.Inventory.hasOwnProperty(i)) continue;

			Ret.push(MainParser.Inventory[i]);
		}

		return Ret;
    }
};

// Updatestufen der Eventgebäude
FoEproxy.addMetaHandler('selection_kits', (xhr, postData) => {
	Kits.BuildingSelectionKits = JSON.parse(xhr.responseText);
});

// Building-Sets
FoEproxy.addMetaHandler('building_sets', (xhr, postData) => {
	Kits.BuildingSets = JSON.parse(xhr.responseText);
});