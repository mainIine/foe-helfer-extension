/*
 * **************************************************************************************
 *
 * Dateiname:                 kits.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              27.03.20, 15:37 Uhr
 * zuletzt bearbeitet:       27.03.20, 15:32 Uhr
 *
 * Copyright © 2020
 *
 * **************************************************************************************
 */

/**
 *
 * @type {{BuildingSelectionKits: null, GetTabContent: (function(): string), ReadSets: Kits.ReadSets, globCnt: number, SetTabs: Kits.SetTabs, GetTabs: (function(): string), isChecked: [], BuildBox: Kits.BuildBox, setBuildings: [], ReadSelectionKits: Kits.ReadSelectionKits, CreateBody: Kits.CreateBody, BuildingSets: null, Tabs: [], ScanInvetory: Kits.ScanInvetory, SetTabContent: Kits.SetTabContent, TabsContent: [], Inventory: null, setSingles: []}}
 */
let Kits = {

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

	BuildBox: ()=> {

		// zurück setzen
		Kits.isChecked = [];
		Kits.setBuildings = [];
		Kits.setSingles = [];
		Kits.globCnt = 0;

		Kits.ReadSets();
		Kits.ReadSelectionKits();
		Kits.ScanInvetory();


		if( $('#kits').length === 0 )
		{
			let args = {
				'id': 'kits',
				'title': i18n('Boxes.Kits.Title'),
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			};

			HTML.Box(args);
			HTML.AddCssFile('kits');

		} else {
			HTML.CloseOpenBox('kits');
		}

		Kits.CreateBody();
	},


	ReadSets: ()=> {
		let inv = Kits.GetInvententoryArray(),
			bs = Kits.BuildingSets,
			bsk = Kits.BuildingSelectionKits;


		// Sets durchsteppen
		for(let b in bs)
		{
			if(!bs.hasOwnProperty(b)){
				break;
			}

			let bCnt = Kits.globCnt;

			Kits.setBuildings[bCnt] = {
				setname:  bs[b]['name'],
				orgSize: bs[b]['cityEntityIds'].length,
				isSize: 0,
				items: []
			};

			// Array mit cityEntityIds
			let cEIds = bs[b]['cityEntityIds'],
				cnt = 0;

			// durch die Gebäude eines Sets springen
			for(let i = 0; i < cEIds.length; i++)
			{
				let eID = cEIds[i];

				// als geprüft "merken"
				Kits.isChecked.push(eID);

				// checken ob es auch im Inventar des Spielers ist
				let item = inv.find(b => b['item']['cityEntityId'] === eID);

				// ... ja, ist enthalten
				if(item !== undefined)
				{
					if(Kits.setBuildings[bCnt]['items'][cnt] === undefined)
					{
						Kits.setBuildings[bCnt]['items'][cnt] = [];
						Kits.setBuildings[bCnt]['items'][cnt]['stage'] = [];
					}

					Kits.setBuildings[bCnt]['items'][cnt]['stage'] = item;

					Kits.setBuildings[bCnt]['isSize']++;
				}

				// prüfen ob es evt. schon ein Kit gibt
				for(let e in bsk)
				{
					if(!bsk.hasOwnProperty(e)){
						break;
					}

					let era = bsk[e]['eraOptions'][CurrentEra]['options'];

					// ist das erste Gebäude das aktuelle Stufe 1?
					if(era[0]['itemAssetName'] === eID && era[1]['itemAssetName'].includes('upgrade_kit') === true){

						let ekID = era[1]['itemAssetName'],
							itemKit = inv.find(b => b['itemAssetName'] === ekID);

						Kits.isChecked.push(ekID);

						if(itemKit !== undefined){
							if(Kits.setBuildings[bCnt]['items'][cnt] === undefined)
							{
								Kits.setBuildings[bCnt]['items'][cnt] = [];
							}

							if(Kits.setBuildings[bCnt]['items'][cnt]['upgrade'] === undefined)
							{
								Kits.setBuildings[bCnt]['items'][cnt]['upgrade'] = null;
							}

							Kits.setBuildings[bCnt]['items'][cnt]['upgrade'] = itemKit;
						}
					}
				}

				if(Kits.setBuildings[bCnt]['items'][cnt] !== undefined)
				{
					cnt++;
				}

				Kits.globCnt++;
			}
		}
	},


	ReadSelectionKits: ()=> {
		let inv = Kits.GetInvententoryArray(),
			bsk = Kits.BuildingSelectionKits;

		// Sets durchsteppen
		for(let b in bsk)
		{
			if(!bsk.hasOwnProperty(b)){
				break;
			}

			let bCnt = Kits.globCnt,
				eraItems = bsk[b]['eraOptions'][CurrentEra]['options'],
				cnt = 0;

			Kits.setBuildings[bCnt] = {
				setname:  bsk[b]['name'],
				orgSize: false,
				isSize: 0,
				items: []
			};

			for(let i = 0; i < eraItems.length; i++)
			{
				let aName = eraItems[i]['itemAssetName'],
					name = eraItems[i]['name'];

				if(aName !== '' && Kits.isChecked.includes(aName) === false){

					// Es ist ein Upgrade Kit, also Stufe 1
					if(aName.includes('upgrade_kit') === false)
					{
						let iItem = inv.find(obj => (obj['item']['cityEntityId'] === aName));

						if(iItem !== undefined){
							if(Kits.setBuildings[bCnt]['items'][cnt] === undefined)
							{
								Kits.setBuildings[bCnt]['items'][cnt] = [];
								Kits.setBuildings[bCnt]['items'][cnt]['stage'] = [];
							}

							Kits.setBuildings[bCnt]['items'][cnt]['stage'] = iItem;

							Kits.isChecked.push(aName);
						}

						// ist das nächste Object ein Upgrade-Kit? Dann gleich mit dazu
						if(eraItems[1]['itemAssetName'].includes('upgrade_kit') === true){
							let aName = eraItems[1]['itemAssetName'],
								name = eraItems[1]['name'],
								ukItem = inv.find(obj => (obj['name'] === name));

							if(ukItem !== undefined){
								if(Kits.setBuildings[bCnt]['items'][cnt] === undefined)
								{
									Kits.setBuildings[bCnt]['items'][cnt] = [];
									Kits.setBuildings[bCnt]['items'][cnt]['upgrade'] = [];
								}

								Kits.setBuildings[bCnt]['items'][cnt]['upgrade'] = ukItem;

								Kits.isChecked.push(aName);
							}
						}
					}

					// es gibt nur ein Kit ohne Stufe 1 oder es ist ein Selection-Kit
					else if(aName.includes('upgrade_kit') === true) {
						let sName = aName.replace('upgrade', 'selection'),
							uName = aName,
							fItem = undefined,
							fName = null,
							itemUk = inv.find(obj => (obj['itemAssetName'] === uName)),
							itemSk = inv.find(obj => (obj['itemAssetName'] === sName));

						if(itemUk !== undefined){
							fItem = itemUk;
							fName = uName;

						} else if(itemSk !== undefined){
							fItem = itemSk;
							fName = sName;
						}

						if(fItem !== undefined){
							if(Kits.setBuildings[bCnt]['items'][cnt] === undefined)
							{
								Kits.setBuildings[bCnt]['items'][cnt] = [];
								Kits.setBuildings[bCnt]['items'][cnt]['upgrade'] = [];
							}

							Kits.setBuildings[bCnt]['items'][cnt]['upgrade'] = fItem;

							Kits.isChecked.push(fName);
						}
					}
				}

				if(Kits.setBuildings[bCnt]['items'][cnt] !== undefined)
				{
					cnt++;
				}
			}

			Kits.globCnt++;
			// console.log('---------------------------------');
		}
	},


	/**
	 * Im Inventar nach einzelenen Selection-Kits suchen
	 *
	 * @constructor
	 */
	ScanInvetory: ()=> {
		let inv = Kits.GetInvententoryArray();

		for(let i in inv)
		{
			if(!inv.hasOwnProperty(i)){
				break;
			}

			let aName = inv[i]['itemAssetName'];

			if(aName.includes('selection_kit') && aName !== '' && Kits.isChecked.includes(aName) === false)
			{
				Kits.setSingles.push(inv[i]);
				Kits.isChecked.push(aName);
			}
		}
	},


	// Box-Content zusammensetzen und einfügen
	CreateBody: ()=> {

		Kits.Tabs = [];
		Kits.TabsContent = [];

		Kits.SetTabs('building-kits', i18n('Boxes.Kits.TabBuildingKits'));


		let t = '<table class="foe-table">';


		t += '<tr>' +
			'<th></th>' +
			'<th>' + i18n('Boxes.Kits.Name') + '</th>' +
			'<th></th>' +
			'<th>' + i18n('Boxes.Kits.KitName') + '</th>' +
			'</tr>';


		for(let i in Kits.setBuildings)
		{
			if(!Kits.setBuildings.hasOwnProperty(i)){
				break;
			}

			// beide leer, überspringen
			if(Kits.setBuildings[i]['items'].length === 0){
				continue;
			}

			t += '<tr><th colspan="4">' + Kits.setBuildings[i]['setname'] + '</th></tr>';

			for(let gb in Kits.setBuildings[i]['items'])
			{
				if(!Kits.setBuildings[i]['items'].hasOwnProperty(gb)){
					break;
				}

				let gbs = Kits.setBuildings[i]['items'][gb],
					rowTd = '';

				// Stufe 1
				if(gbs['stage'] !== undefined){
					let item = gbs['stage'],
						aName = item['itemAssetName'],
						url = MainParser.InnoCDN + 'assets/city/buildings/' + [aName.slice(0, 1), '_SS', aName.slice(1)].join('') + '.png';

					rowTd += '<td class="text-center"><img class="kits-image" src="' + url + '" alt="' + item['name'] + '" /></td>';
					rowTd += '<td>' + item['name'] + '<br>' + i18n('Boxes.Kits.InStock') + ': <strong class="text-warning">' + item['inStock'] + '</strong></td>';

				} else {
					rowTd += '<td colspan="2"></td>';
				}

				// UpgradeKit
				if(gbs['upgrade'] !== undefined){
					let item = gbs['upgrade'],
						aName = item['itemAssetName'],
						url = MainParser.InnoCDN + 'assets/shared/icons/reward_icons/reward_icon_' + aName + '.png';

					rowTd += '<td><img class="kits-image" src="' + url + '" alt="' + item['name'] + '" /></td>';
					rowTd += '<td class="text-center">' + item['name'] + '<br>' + i18n('Boxes.Kits.InStock') + ': <strong class="text-warning">' + item['inStock'] + '</strong></td>';

				} else {
					rowTd += '<td colspan="2"></td>';
				}

				t += '<tr>' + rowTd + '</tr>';
			}
		}

		t += '</table>';

		Kits.SetTabContent('building-kits', t);

		// -------------------------------------------------------------------------------------------------------------
		// -------------------------------------------------------------------------------------------------------------


		Kits.SetTabs('selection-kits', i18n('Boxes.Kits.TabSelectionKits'));

		let ts = '<div class="selection-wrapper">';

		for(let i in Kits.setSingles)
		{
			if(!Kits.setSingles.hasOwnProperty(i)){
				break;
			}

			let item = Kits.setSingles[i],
				aName = item['itemAssetName'],
				url = MainParser.InnoCDN + 'assets/shared/icons/reward_icons/reward_icon_' + aName + '.png';

			ts += '<div class="item-wrap">' +
				'<div class="item">' +
				'<div class="item-image">' +
				'<img src="' + url + '" alt="' + item['name'] + '">' +
				'</div>' +
				'<div class="item-name">' +
				item['name'] + '<br>' +
				i18n('Boxes.Kits.InStock') + ': <strong>' + item['inStock'] + '</strong>' +
				'</div>' +
				'</div>' +
				'</div>';
		}

		ts += '</div>';

		Kits.SetTabContent('selection-kits', ts);

		// -------------------------------------------------------------------------------------------------------------
		// -------------------------------------------------------------------------------------------------------------

		// fertige Tabelle zusammen setzten
		let h = [];

		h.push('<div class="kit-tabs tabs">');
		h.push( Kits.GetTabs() );
		h.push( Kits.GetTabContent() );
		h.push('</div>');


		$('#kitsBody').html( h.join('') ).promise().done(function(){
			$('.kit-tabs').tabslet({active: 1});
		});
	},


	/**
	 * Note a  tab
	 *
	 * @param id
	 * @param label
	 */
	SetTabs: (id, label)=>{
		Kits.Tabs.push(`<li class="${id} long-tab game-cursor"><a href="#${id}" class="game-cursor"><span>${label}</span></a></li>`);
	},


	/**
	 * Gibt alle gemerkten Tabs aus
	 *
	 * @returns {string}
	 */
	GetTabs: ()=> {
		return '<ul class="horizontal">' + Kits.Tabs.join('') + '</ul>';
	},


	/**
	 * Speichert BoxContent zwischen
	 *
	 * @param id
	 * @param content
	 */
	SetTabContent: (id, content)=>{
		Kits.TabsContent.push('<div id="' + id + '">' + content + '</div>');
	},


	/**
	 * Setzt alle gespeicherten Tabs zusammen
	 *
	 * @returns {string}
	 */
	GetTabContent: ()=> {
		return Kits.TabsContent.join('');
	},


	/**
	 * Liefert MainParser.Inventory als Array zurück
	 * 
	 * @returns{[]}
	 * */
	GetInvententoryArray: () => {
		let Ret = [];
		for (let i in MainParser.Inventory) {
			if (!MainParser.Inventory.hasOwnProperty(i)) continue;

			Ret.push(MainParser.Inventory[i]);
		}

		return Ret;
    },
};

// Updatestufen der Eventgebäude
FoEproxy.addMetaHandler('selection_kits', (xhr, postData) => {
	Kits.BuildingSelectionKits = JSON.parse(xhr.responseText);
});

// Building-Sets
FoEproxy.addMetaHandler('building_sets', (xhr, postData) => {
	Kits.BuildingSets = JSON.parse(xhr.responseText);
});