/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
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
 * @type {{ItemTd: ((function(*=): string)|*), init: Kits.init, ShowMissing: number, ReadSets: Kits.ReadSets, ItemDiv: (function(*): string), GetInvententoryArray: (function(): *[]), ToggleView: Kits.ToggleView, KitsjSON: null, Inventory: null, BuildBox: Kits.BuildBox}}
 */
let Kits = {

	KitsjSON: null,
	ShowMissing: 0,
	Inventory: null,

	/**
	 * Get all sets from the server
	 */
	init: ()=> {

		let data = localStorage.getItem('KnownKitsData');

		MainParser.loadJSON(extUrl + 'js/web/kits/data/sets.json', (data)=>{

			localStorage.setItem('KnownKitsData', data);
			localStorage.setItem('KnownKitsDate', MainParser.getAddedDateTime(48));

			Kits.KitsjSON = JSON.parse(data);
			Kits.BuildBox();
		});
	},


	/**
	 * Create the box
	 *
	 * @constructor
	 */
	BuildBox: ()=> {


		if ( $('#kits').length === 0 ) {

			HTML.AddCssFile('kits');

			HTML.Box({
				'id': 'kits',
				'title': i18n('Boxes.Kits.Title'),
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			});

			$('#kitsBody').append( $('<div />').attr('id', 'kitsBodyTopbar'), $('<div />').attr('id', 'kitsBodyInner') );

			$('#kitsBodyTopbar').append(
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
	 * Compare
	 *
	 * @constructor
	 */
	ReadSets: ()=> {
		let inv = Kits.GetInvententoryArray(),
			entities = MainParser.CityEntities,
			kits = Kits.KitsjSON;

		let t = '<table class="foe-table">';

		t += 	`<tr class="headline">
					<th></th>
					<th>${i18n('Boxes.Kits.Name')}</th>
					<th></th>
					<th>${i18n('Boxes.Kits.KitName')}</th>
				</tr>`;

		// Sets durchsteppen
		for (let set in kits) {

			if (!kits.hasOwnProperty(set)) {
				break;
			}

			let buildings = [],
				missings = [],
				assetRow = [],
				kitRow = [],
				show = false;

			// step buildings in a set
			for (let i in kits[set]['buildings']) {

				if (!kits[set]['buildings'].hasOwnProperty(i)) {
					break;
				}

				const building = kits[set]['buildings'][i];
				let itemRow = [];

				// Level 1
				let itemL1 = inv.find(el => el['item']['cityEntityId'] === building['first']),
					itemUgr = false;

				// Upgrade Kit
				if (building['update']) {
					itemUgr = inv.find(el => el['itemAssetName'] === building['update']);
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
				for (let a in kits[set]['assets']) {
					if (inv.find(el => el['itemAssetName'] === kits[set]['kit'][a])) {
						show = true;
					}
				}
			}
			else if (kits[set]['kit']) {
				if (inv.find(el => el['itemAssetName'] === kits[set]['kit'])) {
					show = true;
				}
			}
			if (kits[set]['assets']) {
				for (let a in kits[set]['assets']) {
					if (inv.find(el => el['item']['cityEntityId'] === kits[set]['assets'][a])) {
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

					if (asset) {

						if (!buildings && Kits.ShowMissing > 0) {
							buildings = missings;
						}

						assetRow.push({
							element: 'asset',
							item: asset,
							missing: false
						});
					} 
					else if (show && Kits.ShowMissing > 0) {

						assetRow.push({
							element: 'asset',
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

					
					if (k) {

						if (!buildings && Kits.ShowMissing > 0) {
							buildings = missings;
						}

						kitRow.push({
							type: 'kit',
							item: k,
							show: true
						});
					}
					else if (show && Kits.ShowMissing > 0) {

						kitRow.push({
							type: 'kit',
							item: kits[set]['kit'][a],
							show: true,
							missing: true
						});
					}
				}
			}
			else if (kits[set]['kit']) {

				let k = inv.find(el => el['itemAssetName'] === kits[set]['kit']);

				if (k) {
		  

					if (!buildings && Kits.ShowMissing > 0) {
						buildings = missings;
					}

					kitRow.push({
						type: 'kit',
						item: k,
						show: true
					});
				}
				else if (show && Kits.ShowMissing > 0) {

					kitRow.push({
						type: 'kit',
						item: kits[set]['kit'],
						show: true,
						missing: true
					});
				}
			}

			if (kitRow.length) {
				show = true;
			}

			if (show) {
	
																								

				t += `<tr><th colspan="4" class="head">${kits[set]['name'] ? MainParser.GetBuildingLink(kits[set]['link'] ? kits[set]['link'] : kits[set]['name'], i18n('Kits.Sets.' + kits[set]['name'])) : kits[set]['groupname'] ? i18n('Kits.Sets.' + kits[set]['groupname']) : i18n('Boxes.Kits.Udate') + kits[set]['udate']}</th></tr>`;

				if(buildings) {

					buildings.forEach((e) => {
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

					assetRow.forEach((e) => {
						rowTd += Kits.ItemAssetDiv(e);
					});

					rowTd += '</div></td>';

					t += '<tr>' + rowTd + '</tr>';
				}

				// Kit listing
				if (kitRow.length > 1) {

					t += `<tr><td colspan="4" class="assets-header">${i18n('Boxes.Kits.SelectionKit')}</td></tr>`;
					let rowTd = '<td colspan="4"><div class="kit-row">';

					kitRow.forEach((e) => {
						rowTd += Kits.ItemKitDiv(e);
					});

					rowTd += '</div></td>';

					t += '<tr>' + rowTd + '</tr>';
				}
				else if (kitRow.length) {

					t += `<tr><td colspan="4" class="assets-header">${i18n('Boxes.Kits.SelectionKit')}</td></tr>`;

					let rowTd = Kits.ItemTd(kitRow[0]);
					rowTd += '<td colspan="2"></td>';

					t += '<tr>' + rowTd + '</tr>';
				}
			}
		}

		t += '</table>';

		$('#kitsBodyInner').html(t);
	},


	/**
	 * Create two td's for a level1 oder update building
	 *
	 * @param el
	 * @returns {string}
	 * @constructor
	 */
	ItemTd: (el)=> {

		if (!el || el['item'] == undefined) {
			return '';
		}

		let item = el['item'],
			aName,
			td = '',
			url;

		if (el['type'] === 'first') {

			aName = el['missing'] ? item['asset_id'] : item['itemAssetName'];

			url = MainParser.InnoCDN + 'assets/city/buildings/' + [aName.slice(0, 1), '_SS', aName.slice(1)].join('') + '.png';
		}
		else if (el['type'] === 'update' || el['type'] === 'kit') {
			aName = el['missing'] ? item : item['itemAssetName'];

			url = MainParser.InnoCDN + 'assets/shared/icons/reward_icons/reward_icon_' + aName + '.png';
		}

		if (el['missing']) {

			td += `<td class="text-center is-missing"><img class="kits-image" src="${url}" alt="${item['name']}" /></td>`;
			td += `<td class="is-missing">${el['type'] === 'first' ? item['name'] : el['type'] === 'kit' ? i18n('Boxes.Kits.SelectionKit') : i18n('Boxes.Kits.UpgradeKit')}<br>${i18n('Boxes.Kits.InStock')}: <strong class="text-warning">-</strong></td>`;
		} 
		else {
			td += `<td class="text-center"><img class="kits-image" src="${url}" alt="${item['name']}" /></td>`;
			td += `<td>${item['name']}<br>${i18n('Boxes.Kits.InStock')}: <strong class="text-warning">${item['inStock']}</strong></td>`;
		}

		return td;
	},


	/**
	 * Create a div-row for assets of a set
	 *
	 * @param el
	 * @param mark
	 * @returns {string}
	 * @constructor
	 */
	ItemAssetDiv: (el)=> {
		
		if (!el || el['item'] == undefined) {
			return;
		}
		let item = el['item'],
			aName = el['missing'] ? item['asset_id'] : item['itemAssetName'],
			url = MainParser.InnoCDN + 'assets/city/buildings/' + [aName.slice(0, 1), '_SS', aName.slice(1)].join('') + '.png';

		return 	`<div class="item-asset${(el['missing'] ? ' is-missing' : '')}">
					<img class="asset-image" src="${url}" alt="${item['name']}" /><br>
					${item['name']}<br>${i18n('Boxes.Kits.InStock')}: <strong class="text-warning">${ (item['inStock'] ? item['inStock'] : '-' ) }</strong>
				</div>`;
	},
	
	/**
	 * Create a div-row for assets of a set
	 *
	 * @param el
	 * @param mark
	 * @returns {string}
	 * @constructor
	 */
	ItemKitDiv: (el)=> {
		
		if (!el || el['item'] == undefined) {
			return;
		}
		let item = el['item'],
			aName = el['missing'] ? item : item['itemAssetName'];
			url = MainParser.InnoCDN + 'assets/shared/icons/reward_icons/reward_icon_' + aName + '.png';

		return 	`<div class="item-asset${(el['missing'] ? ' is-missing' : '')}">
					<img class="asset-image" src="${url}" alt="${(el['missing'] ? i18n('Boxes.Kits.SelectionKit') : item['name'])}" /><br>
					${(el['missing'] ? i18n('Boxes.Kits.SelectionKit') : item['name'])}<br>${i18n('Boxes.Kits.InStock')}: <strong class="text-warning">${ (item['inStock'] ? item['inStock'] : '-' ) }</strong>
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

			let itemIdx = Ret.findIndex(e => e["itemAssetName"] == MainParser.Inventory[i]["itemAssetName"]);
			
			if (itemIdx > -1) {
				Ret[itemIdx]["inStock"] += MainParser.Inventory[i]["inStock"];
			} 
			else {
				Ret.push(Object.assign({}, MainParser.Inventory[i]));
			}
		}

		return Ret;
    },


	/**
	 * Toggle view
	 *
	 * @constructor
	 */
	ToggleView: ()=> {
		Kits.ShowMissing === 0 ? Kits.ShowMissing = 1 : Kits.ShowMissing === 1 ? Kits.ShowMissing = 2 : Kits.ShowMissing = 0;

		$('#kitsBodyInner').html('');
		Kits.ReadSets();

		$('#kits-triplestate-button').text(Kits.ShowMissing === 0 ? i18n('Boxes.Kits.TripleStateButton0') : Kits.ShowMissing === 1 ? i18n('Boxes.Kits.TripleStateButton1') : i18n('Boxes.Kits.TripleStateButton2'))
	}
};
