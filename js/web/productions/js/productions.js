/*
 * **************************************************************************************
 *
 * Dateiname:                 productions.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 14:31 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let Productions = {

	BuildingsAll: [],
	BuildingsProducts: [],
	BuildingsProductsGroups: [],
	MainBuildingBonusAdded: false,
	ShowDaily: false,

	ActiveTab: 1,

	BuildingTypes: {
		greatbuilding: i18n('Boxes.Productions.Headings.greatbuilding'),
		production: i18n('Boxes.Productions.Headings.production'),
		random_production: i18n('Boxes.Productions.Headings.random_production'),
		residential: i18n('Boxes.Productions.Headings.residential'),
		decoration: i18n('Boxes.Productions.Headings.decoration'),
		street: i18n('Boxes.Productions.Headings.street'),
		goods: i18n('Boxes.Productions.Headings.goods'),
		culture: i18n('Boxes.Productions.Headings.culture'),
		main_building: i18n('Boxes.Productions.Headings.main_building'),
		boost: i18n('Boxes.Productions.Headings.boost'),
	},

	Tabs: [],
	TabsContent: [],

	Types: [
		'strategy_points',	// Forge Punkte
		'money',			// Münzen
		'supplies',			// Werkzeuge
		'medals',			// Medaillien
		'premium',			// Diamanten
		'population',		// Bevölkerung
		'happiness',		// Zufriedenheit
		'packaging',		// Güter Gruppe (5 verschieden z.B.)
	],

	Boosts: [],

	Buildings: [
		'greatbuilding',
		'residential',
		'random_production',
		'production',
		'main_building',
		'street',
		'boost'
	],

	/**
	 *  Start der ganzen Prozedur
	 */
	init: () => {

		moment.locale(i18n('Local'));

		Productions.entities = MainParser.CityMapData;
		if (MainParser.CityMapEraOutpostData) {
			Productions.entities = Productions.entities.concat(MainParser.CityMapEraOutpostData);
		}

		// Münzboost ausrechnen und bereitstellen
        Productions.Boosts['money'] = ((MainParser.AllBoosts['coin_production'] + 100) / 100);
        Productions.Boosts['supplies'] = ((MainParser.AllBoosts['supply_production'] + 100) / 100);

		// leere Arrays erzeugen
		for(let i in Productions.Types)
		{
			if(Productions.Types.hasOwnProperty(i))
			{
				Productions.BuildingsProducts[ Productions.Types[i] ] = [];
				if(Productions.Types[i] === 'packaging')
				{
					continue;
				}
				Productions.BuildingsProductsGroups[ Productions.Types[i] ] = [];
			}
		}

		Productions.ReadData();
	},


	/**
	 * Alle Gebäude durchsteppen
	 *
	 */
	ReadData: ()=> {

		let d = Productions.entities;
		Productions.BuildingsAll = [];

		let PopulationSum = 0,
			HappinessSum = 0;

		for(let i in d)
		{
			if (d.hasOwnProperty(i) && d[i]['id'] < 2000000000)
			{
				// dem Rathaus evt Boosts hinzufügen (tägliche FP, Botschafter Bonus)
				if(d[i]['id'] === 1){
					d[i] = Productions.prepareMainBuilding(d[i]);
				}

				// jede einzelne Produktart holen
				let building = Productions.readType(d[i]);

				// das Gebäude produziert etwas?
				if(building !== false){
					Productions.BuildingsAll.push(building);

					if (building['products']['population'] !== undefined) {
						PopulationSum += building['products']['population'];
					}
					if (building['products']['happiness'] !== undefined) {
						HappinessSum += building['products']['happiness'];
					}

				}
			}
		}

		let HappinessBonus = MainParser.AllBoosts['happiness_amount'];
		if (HappinessBonus !== undefined && HappinessBonus !== 0) {
			let building = {
				name: i18n('Boxes.Productions.AdjacentBuildings'),
				type: 'boost',
				products: [],
				motivatedproducts: [],
				at: (new Date().getTime()) / 1000,
				in: 0
			}
			building.products['happiness'] = HappinessBonus;
			building.motivatedproducts['happiness'] = HappinessBonus;

			HappinessSum += HappinessBonus;

			Productions.BuildingsAll.push(building);
		}

		let ProdBonus = 0;
		if (HappinessSum < PopulationSum) {
			ProdBonus = -0.5;
		}
		else if (HappinessSum < 1.4 * PopulationSum) {
			ProdBonus = 0;
		}
		else {
			ProdBonus = 0.2;
		}

		Productions.Boosts['money'] += ProdBonus;
		Productions.Boosts['supplies'] += ProdBonus;

		for (let i in Productions.BuildingsAll) {
			let building = Productions.BuildingsAll[i];

			if (building['type'] === 'residential' || building['type'] === 'production') {
				if (building['products']['money'] !== undefined) {
					building['products']['money'] = Math.round(building['products']['money'] * Productions.Boosts['money']);
				}
				if (building['motivatedproducts']['money'] !== undefined) {
					building['motivatedproducts']['money'] = Math.round(building['motivatedproducts']['money'] * Productions.Boosts['money']);
				}

				if (building['products']['supplies'] !== undefined) {
				building['products']['supplies'] = Math.round(building['products']['supplies'] * Productions.Boosts['supplies']);
				}
				if (building['motivatedproducts']['supplies'] !== undefined) {
					building['motivatedproducts']['supplies'] = Math.round(building['motivatedproducts']['supplies'] * Productions.Boosts['supplies']);
				}
			}

			// Nach Produkt
			for (let x in building['products']) {
				if (!building['products'].hasOwnProperty(x)) {
					break;
				}

				if (Productions.Types.includes(x) && x !== 'packaging') {
					// Alle Gebäude einzeln auflisten, nach Produkt sortiert
					Productions.BuildingsProducts[x].push(building);

						let index = Productions.BuildingsProductsGroups[x].map((el) => el.eid).indexOf(building['eid']);

						// Alle Gebäude gruppieren und
						if (index === -1) {
							let ni = Productions.BuildingsProductsGroups[x].length + 1;

							Productions.BuildingsProductsGroups[x][ni] = [];
							Productions.BuildingsProductsGroups[x][ni]['name'] = building['name'];
							Productions.BuildingsProductsGroups[x][ni]['eid'] = building['eid'];
							Productions.BuildingsProductsGroups[x][ni]['dailyfactor'] = building['dailyfactor'];
							Productions.BuildingsProductsGroups[x][ni]['products'] = Productions.GetDaily(parseInt(building['products'][x]), building['dailyfactor'], x);
							Productions.BuildingsProductsGroups[x][ni]['motivatedproducts'] = Productions.GetDaily(parseInt(building['motivatedproducts'][x]), building['dailyfactor'], x);
							Productions.BuildingsProductsGroups[x][ni]['count'] = 1;

						} else {
							Productions.BuildingsProductsGroups[x][index]['products'] += parseInt(building['products'][x]);
							Productions.BuildingsProductsGroups[x][index]['motivatedproducts'] += parseInt(building['motivatedproducts'][x]);
							Productions.BuildingsProductsGroups[x][index]['count']++;
						}
				}

				else {
					let mId = d[i]['cityentity_id'] + '_' + d[i]['id'];

					if (Array.isArray(Productions.BuildingsProducts['packaging'][mId]) === false) {
						Productions.BuildingsProducts['packaging'][mId] = [];
						Productions.BuildingsProducts['packaging'][mId]['at'] = building['at'];
						Productions.BuildingsProducts['packaging'][mId]['id'] = building['id'];
						Productions.BuildingsProducts['packaging'][mId]['name'] = building['name'];
						Productions.BuildingsProducts['packaging'][mId]['type'] = building['type'];
						Productions.BuildingsProducts['packaging'][mId]['dailyfactor'] = building['dailyfactor'];
						Productions.BuildingsProducts['packaging'][mId]['products'] = [];
						Productions.BuildingsProducts['packaging'][mId]['motivatedproducts'] = [];
					}

					Productions.BuildingsProducts['packaging'][mId]['products'][x] = building['products'][x];
					Productions.BuildingsProducts['packaging'][mId]['motivatedproducts'][x] = building['motivatedproducts'][x];
				}
			}
		}

		Productions.showBox();
	},


	/**
	 * alle Produkte auslesen
	 *
	 * @param d
	 * @returns {{eid: *, at: *, in: *, name: *, id: *, type: *, products: *}}
	 */
	readType: (d) => {
		let Products = [],
			CurrentResources = undefined,
			EntityID = d['cityentity_id'];

		let BuildingData = BuildingNamesi18n[EntityID];

		let AdditionalResources = BuildingData['additionalResources'];

		let Ret = {
			name: BuildingData['name'],
			id: d['id'],
			eid: d['cityentity_id'],
			type: d['type'],
			at: (new Date().getTime()) / 1000,
			in: 0
		}

		if (d.state !== undefined && d.state.current_product !== undefined && d.state.current_product.product !== undefined) {
			if (d.state.current_product.product.resources !== undefined) {
				CurrentResources = d['state']['current_product']['product']['resources'];
			}
		}

        for (let Resource in CurrentResources) {

            if(!CurrentResources.hasOwnProperty(Resource)) {
            	break;
			}

			if (Resource !== 'credits') { // Marscredits nicht zu den Gütern zählen
				Products[Resource] = CurrentResources[Resource];
			}
		}

		if (d['bonus'] !== undefined) {
			if (d['bonus']['type'] === 'population') {
				Products['population'] = (Products['population'] !== undefined ? Products['population'] : 0) + d['bonus']['value'];
			}
			else if (d['bonus']['type'] === 'happiness') {
				Products['happiness'] = (Products['happiness'] !== undefined ? Products['happiness'] : 0) + d['bonus']['value'];
			}
		}

		if (d['state'] !== undefined && d['state']['__class__'] !== 'ConstructionState' && d['state']['__class__'] !== 'UnconnectedState') {
			if (BuildingData['population'] !== undefined) {
				Products['population'] = (Products['population'] !== undefined ? Products['population'] : 0) + BuildingData['population'];
			}
			if (BuildingData['provided_happiness'] !== undefined) {
				let Faktor = 1;
				if (d['state']['__class__'] === 'PolishedState') {
					Faktor = 2;
				}
				Products['happiness'] = BuildingData['provided_happiness'] * Faktor;
			}
		}

		if (BuildingData['entity_levels'] !== undefined && BuildingData['entity_levels'][d['level']] !== undefined) {
			let EntityLevel = BuildingData['entity_levels'][d['level']];
			if (EntityLevel['provided_population'] !== undefined) {
				Products['population'] = (Products['population'] !== undefined ? Products['population'] : 0) + EntityLevel['provided_population'];
			}
			if (EntityLevel['provided_happiness'] !== undefined) {
				let Faktor = 1;
				if (d['state']['__class__'] === 'PolishedState') {
					Faktor = 2;
				}
				Products['happiness'] = (Products['happiness'] !== undefined ? Products['happiness'] : 0) + EntityLevel['provided_happiness'] * Faktor;
			}
		}

        let AdditionalProduct,
			MotivatedProducts = [];

		for (let ProductName in Products) {
			MotivatedProducts[ProductName] = Products[ProductName];
		}

        for (let Resource in AdditionalResources) {

            if (!AdditionalResources.hasOwnProperty(Resource)) {
            	break;
			}

            if (Resource.startsWith('random_good') || Resource.startsWith('all_goods')) continue;

			AdditionalProduct = AdditionalResources[Resource];

			if (AdditionalProduct > 0) {
				if (Products[Resource] === undefined) {
					Products[Resource] = 0;
					MotivatedProducts[Resource] = AdditionalProduct;
				}
				else if (Products[Resource] < AdditionalProduct) {
					MotivatedProducts[Resource] += AdditionalProduct;
				}
			}
		}

		if (d['state'] !== undefined) {
			let At = d['state']['next_state_transition_at'],
				In = d['state']['next_state_transition_in'];

			if (At !== undefined) Ret.at = At;
			if (In !== undefined) Ret.in = In;
		}

		Ret.products = Products;
		Ret.motivatedproducts = MotivatedProducts;

        if(d['id'] === '1'){
			console.log('Products: ', Products);
		}

		if (d['state'] && d['state']['current_product'] && d['state']['current_product']['production_time']) {
			Ret['dailyfactor'] = 86400 / d['state']['current_product']['production_time'];
		}
		else {
			Ret['dailyfactor'] = 1;
        }

		if (Object.keys(Ret.motivatedproducts).length > 0) {
			return Ret;
		}
		else {
			return false;
		}
	},


	/**
	 * HTML Box erstellen und einblenden
	 */
	showBox: () => {

		String.prototype.cleanup = function () {
			return this.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '');
		};

		if ($('#Productions').length > 0) {
			HTML.CloseOpenBox('Productions');

			return;
		}

		// CSS in den DOM prügeln
		HTML.AddCssFile('productions');

		HTML.Box({
			'id': 'Productions',
			'title': i18n('Boxes.Productions.Title'),
			'auto_close': true,
			'dragdrop': true,
			'minimize': true
		});

		Productions.ActiveTab = 1;
		Productions.CalcBody();

		Productions.SwitchFunction();
	},

	/**
	 * Aktualisiert den Inhalt
	 */
	CalcBody: () => {
		Productions.Tabs = [];
		Productions.TabsContent = [];

		let h = [];

		h.push('<div class="production-tabs tabs">');


		// einzelne Güterarten durchsteppen
		for(let pt in Productions.Types)
		{
			if(!Productions.Types.hasOwnProperty(pt)){
				break;
			}

			let type = Productions.Types[pt];

			if(!Productions.BuildingsProducts.hasOwnProperty(type)){
				break;
			}
			Productions.SetTabs(type);

			Productions.BuildingsProducts[type] = helper.arr.multisort(Productions.BuildingsProducts[type], ['name'], ['ASC']);

			if(type !== 'packaging')
			{
				Productions.BuildingsProductsGroups[type] = helper.arr.multisort(Productions.BuildingsProductsGroups[type], ['name'], ['ASC']);
			}


			let buildings = Productions.BuildingsProducts[type],
				groups = Productions.BuildingsProductsGroups[type],
				table = [],
				rowA = [],
				rowB = [],
				countProducts = [],
				countAll = 0,
				countAllMotivated = 0;


			// einen Typ durchsteppen [money,supplies,strategy_points,...]
			for(let i in buildings)
			{
				if(buildings.hasOwnProperty(i))
				{
					if(type !== 'packaging')
					{
						let ProductCount = Productions.GetDaily(buildings[i]['products'][type], buildings[i]['dailyfactor'], type),
						MotivatedProductCount = Productions.GetDaily(buildings[i]['motivatedproducts'][type], buildings[i]['dailyfactor'], type),
							CssClass = '';

						countAll += ProductCount;
						countAllMotivated += MotivatedProductCount;

						rowA.push('<tr>');
						rowA.push('<td data-text="' + buildings[i]['name'].cleanup() + '">' + buildings[i]['name'] + '</td>');
						rowA.push('<td class="text-right is-number" data-number="' + MotivatedProductCount + '">' + HTML.Format(ProductCount) + (ProductCount !== MotivatedProductCount ? '/' + HTML.Format(MotivatedProductCount) : '') + '</td>');
						if (type !== 'population' && type !== 'happiness') {
							rowA.push('<td class="wsnw is-date" data-date="' + buildings[i]['at'] + '">' + moment.unix(buildings[i]['at']).format(i18n('DateTime')) + '</td>');
							rowA.push('<td>' + moment.unix(buildings[i]['at']).fromNow() + '</td>');
						}
						else {
							rowA.push('<td><td>');
						}
						rowA.push('<td class="text-right"><span class="show-entity" data-id="' + buildings[i]['id'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/open-eye.png"></span></td>');
						rowA.push('</tr>');
					}

					// nur Gebäude mit Gütern
					else {

						let tds = '<tr><td>' + buildings[i]['name'] + '</td>';

						let pA = [];

						for(let p in buildings[i]['products'])
						{
							if(buildings[i]['products'].hasOwnProperty(p) && (Productions.Types.includes(p) === false || p === 'packaging'))
							{
								if(countProducts[p] === undefined)
								{
									countProducts[p] = 0;
								}

								let Amount = Productions.GetDaily(buildings[i]['products'][p], buildings[i]['dailyfactor'], p);
								countProducts[p] += Amount;
								countAll += Amount;

								pA.push(HTML.Format(Amount) + ' ' + Productions.GetGoodName(p));
							}
						}

						tds +='<td>' + pA.join('<br>') + '</td>' +
							'<td>' + moment.unix(buildings[i]['at']).format(i18n('DateTime')) + '</td>' +
							'<td>' + moment.unix(buildings[i]['at']).fromNow() + '</td>' +
							'<td class="text-right"><span class="show-entity" data-id="' + buildings[i]['id'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/open-eye.png"></span></td>' +
							'</tr>';

						rowA.push(tds);

						countProducts.filter(val => val);

					}
				}
			}

			// Gruppierte Ansicht
			if(type !== 'packaging') {

				for (let i in groups) {
					if (groups.hasOwnProperty(i)) {
						let ProductCount = Productions.GetDaily(groups[i]['products'], groups[i]['dailyfactor'], type),
							MotivatedProductCount = Productions.GetDaily(groups[i]['motivatedproducts'], groups[i]['dailyfactor'], type);

						let tds = '<tr>' +
							'<td class="text-right is-number" data-number="' + groups[i]['count'] + '">' + groups[i]['count'] + 'x </td>' +
							'<td colspan="4" data-text="' + groups[i]['name'].cleanup() + '">' + groups[i]['name'] + '</td>' +
							'<td class="is-number" data-number="' + MotivatedProductCount + '">' + HTML.Format(ProductCount) + (ProductCount !== MotivatedProductCount ? '/' + HTML.Format(MotivatedProductCount) : '') + '</td>' +
							'</tr>';

						rowB.push(tds);
					}
				}
			}

			table.push('<table class="foe-table sortable-table">');


			// alle Güter nach Zeitalter
			if(Productions.isEmpty(countProducts) === false)
			{
				let eras = [],
					eraSums = [];

				// nach Zeitalter gruppieren und Array zusammen fumlen
				for(let ca in countProducts)
				{
					if(countProducts.hasOwnProperty(ca))
					{
						let era = Technologies.Eras[GoodsData[ca]['era']];

						if(eras[era] === undefined){
							eras[era] = [];
						}

						eras[era].push('<span>' + Productions.GetGoodName(ca) + ' <strong>' + HTML.Format(countProducts[ca]) + '</strong></span>');

						if (!eraSums[era]) {
							eraSums[era] = 0;
						}
						eraSums[era] += countProducts[ca];
					}
				}


				table.push('<thead>');

				if (Productions.ShowDaily) {
					table.push('<span class="btn-default change-daily game-cursor" data-value="' + (pt - (-1)) + '">' + i18n('Boxes.Productions.ModeDaily') + '</span>');
				}
				else {
					table.push('<span class="btn-default change-daily game-cursor" data-value="' + (pt - (-1)) + '">' + i18n('Boxes.Productions.ModeCurrent') + '</span>');
				}

				if (CurrentEraID === 18 && !MainParser.CityMapEraOutpostData) {
					table.push('<tr><th colspan="5">' + i18n('Boxes.Productions.NoMarsDataWarning') + '</th></tr>');
				}
				if (CurrentEraID === 19 && !MainParser.CityMapEraOutpostData) {
					table.push('<tr><th colspan="5">' + i18n('Boxes.Productions.NoAsteroidDataWarning') + '</th></tr>');
				}

				// Zeitalterweise in die Tabelle legen
				for (let era = eras.length; era >= 0; era--)
				{
					if(!eras.hasOwnProperty(era))
					{
						continue;
					}

					table.push('<tr><th colspan="3"><strong class="text-warning">' + i18n('Eras.' + era) + '</strong></th><th colspan="2" class="text-right text-warning" style="font-weight:normal"><span>' + i18n('Boxes.Productions.GoodEraTotal') + ':</span> <strong>' + HTML.Format(eraSums[era]) + '</strong></th></tr>');

					table.push('<tr><td colspan="5" class="all-products">');

					table.push(eras[era].join(''));

					table.push('</td></tr>');
				}
				table.push('</thead>');

				table.push('<tbody>');

				table.push('<tr><td class="total-products text-right" colspan="5"><strong>' + i18n('Boxes.Productions.Total') + HTML.Format(countAll) + '</strong></td></tr>');
			}

			else {
				table.push('<thead>');

				table.push('<tr class="other-header">');

				table.push('<th colspan="2">');

				if (type !== 'population' && type !== 'happiness') {
					if (Productions.ShowDaily) {
						table.push('<span class="btn-default change-daily game-cursor" data-value="' + (pt - (-1)) + '">' + i18n('Boxes.Productions.ModeDaily') + '</span>');
					}
					else {
						table.push('<span class="btn-default change-daily game-cursor" data-value="' + (pt - (-1)) + '">' + i18n('Boxes.Productions.ModeCurrent') + '</span>');
					}
				}

				table.push('<span class="btn-default change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeSingle') + '</span>');
				table.push('</th>');

				table.push('<th colspan="2"></th>');
				table.push('<th colspan="2" class="text-right"><strong>' + Productions.GetGoodName(type) + ': ' + HTML.Format(countAll) + (countAll !== countAllMotivated ? '/' + HTML.Format(countAllMotivated) : '') + '</strong></th>');
				table.push('</tr>');

				table.push('</thead>');
				table.push('<tbody class="' + type + '-mode ' + type + '-single">');

				// Sortierung - Einzelheader
				table.push('<tr class="sorter-header">');
				table.push('<th class="ascending game-cursor" data-type="' + type + '-single">' + i18n('Boxes.Productions.Headings.name') + '</th>');
				table.push('<th class="is-number game-cursor text-right" data-type="' + type + '-single">' + i18n('Boxes.Productions.Headings.amount') + '</th>');
				if (type !== 'population' && type !== 'happiness') {
					table.push('<th class="is-date game-cursor" data-type="' + type + '-single">' + i18n('Boxes.Productions.Headings.earning') + '</th>');
				}
				else {
					table.push('<th class="no-sort">&nbsp;</th>');
				}
				table.push('<th class="no-sort">&nbsp;</th>');
				table.push('<th class="no-sort">&nbsp;</th>');
				table.push('</tr>');

			}

			table.push( rowA.join('') );
			table.push('</tbody>');

			// Gruppierte Ansicht drunter
			if(Productions.isEmpty(rowB) === false)
			{
				table.push('<tbody class="' + type + '-mode ' + type + '-groups" style="display:none">');

				// Sortierung - Gruppiert-Header
				table.push('<tr class="sorter-header">');
				table.push('<th class="game-cursor text-right is-number" data-type="' + type + '-groups">' + i18n('Boxes.Productions.Headings.number') + '</th>');
				table.push('<th class="ascending game-cursor" colspan="4" data-type="' + type + '-groups">Name</th>');
				table.push('<th class="is-number game-cursor" data-type="' + type + '-groups">' + i18n('Boxes.Productions.Headings.amount') + '</th>');
				table.push('</tr>');

				table.push( rowB.join('') );
				table.push('</tbody>');
			}

			table.push('</table>');

			Productions.SetTabContent(type, table.join(''));
		}


		// alles auf einmal ausgeben
		Productions.BuildingsAll = helper.arr.multisort(Productions.BuildingsAll, ['name'], ['ASC']);
		Productions.SetTabs('all');

		let building = Productions.BuildingsAll,
			TableAll = [],
			rowC = [];

		for(let i in building)
		{
			if(building.hasOwnProperty(i))
			{
				rowC.push('<tr class="' + building[i]['type'] + '">');
				rowC.push('<td>' + building[i]['name'] + '</td>');

				let pA = [],
					prod = building[i]['products'],
					ShowTime = false;

				for(let p in prod)
				{
					if(prod.hasOwnProperty(p))
					{
						pA.push(HTML.Format(Productions.GetDaily(prod[p], building[i]['dailyfactor'], p)) + ' ' + Productions.GetGoodName(p));
						if (p !== 'happiness' && p !== 'population') {
							ShowTime = true;
						}
					}
				}

				rowC.push('<td>' + pA.join('<br>') + '</td>');

				if (ShowTime) {
					rowC.push('<td>' + moment.unix(building[i]['at']).format(i18n('DateTime')) + '</td>');
					rowC.push('<td colspan="2">' + moment.unix(building[i]['at']).fromNow() + '</td>');
				}
				else {
					rowC.push('<td></td><td colspan="2"></td>');
				}
                rowC.push('</tr>');
			}
		}

		TableAll.push('<table class="foe-table">');

		TableAll.push('<thead>');
		TableAll.push('<tr>');
		TableAll.push('<th><input type="text" id="all-search" placeholder="' + i18n('Boxes.Productions.SearchInput') + '" onkeyup="Productions.Filter()">');

		if (Productions.ShowDaily) {
			TableAll.push('<span class="btn-default change-daily game-cursor" data-value="' + (Productions.Types.length - (-1)) + '">' + i18n('Boxes.Productions.ModeDaily') + '</span>');
		}
		else {
			TableAll.push('<span class="btn-default change-daily game-cursor" data-value="' + (Productions.Types.length - (-1)) + '">' + i18n('Boxes.Productions.ModeCurrent') + '</span>');
		}

		TableAll.push('</th>');

		TableAll.push('<th class="text-right" id="all-dropdown-th"></th>');
		TableAll.push('</tr>');
		TableAll.push('</thead>');

		TableAll.push('</table>');

		TableAll.push('<table class="foe-table all-mode">');
		TableAll.push( rowC.join('') );
		TableAll.push('</table>');

		Productions.SetTabContent('all', TableAll.join(''));


		// alles zusammen basteln
		h.push( Productions.GetTabs() );
		h.push( Productions.GetTabContent() );

		h.push('</div>');

		$('#Productions').find('#ProductionsBody').html(h.join('')).promise().done(function () {

			// Zusatzfunktionen für die Tabelle
			$('.production-tabs').tabslet({ active: Productions.ActiveTab });
			$('.sortable-table').tableSorter();
			Productions.SortingAllTab();

			// Ein Gebäude soll auf der Karte dargestellt werden
			$('#Productions').on('click', '.foe-table .show-entity', function () {
				Productions.ShowFunction($(this).data('id'));
			});
		});
	},


	/**
	 * Merkt sich alle Tabs
	 *
	 * @param id
	 */
	SetTabs: (id)=> {
		Productions.Tabs.push('<li class="' + id + ' game-cursor"><a href="#' + id + '" class="game-cursor">&nbsp;</a></li>');
	},


	/**
	 * Gibt alle gemerkten Tabs aus
	 *
	 * @returns {string}
	 */
	GetTabs: ()=> {
		return '<ul class="horizontal">' + Productions.Tabs.join('') + '</ul>';
	},


	/**
	 * Speichert BoxContent zwischen
	 *
	 * @param id
	 * @param content
	 */
	SetTabContent: (id, content)=> {
		// ab dem zweiten Eintrag verstecken
		let style = Productions.TabsContent.length > 0 ? ' style="display:none"' : '';

		Productions.TabsContent.push('<div id="' + id + '"' + style + '>' + content + '</div>');
	},


	/**
	 * Setzt alle gespeicherten Tabellen zusammen
	 *
	 * @returns {string}
	 */
	GetTabContent: ()=> {
		return Productions.TabsContent.join('');
	},


	/**
	 * Schalter für die Tabs [Einzelansicht|Gesamtansicht]
	 *
	 */
	SwitchFunction: ()=>{
		$('#Productions').on('click', '.change-view', function(){
			let btn = $(this),
				t = $(this).data('type'),
				hiddenTb = $('.' + t + '-mode:hidden'),
				vissibleTb = $('.' + t + '-mode:visible');

			vissibleTb.fadeOut(400, function(){
				hiddenTb.fadeIn(400);

				if( $('.' + t + '-single').is(':visible') ){
					btn.text(i18n('Boxes.Productions.ModeSingle'));
				} else {
					btn.text(i18n('Boxes.Productions.ModeGroups'));
				}
			});
		});

		$('#Productions').on('click', '.change-daily', function () {
			let Tab = $(this).data('value');
			Productions.ActiveTab = Tab;
			Productions.ShowDaily = !Productions.ShowDaily;
			if (Productions.ShowDaily) {
				$(this).text(i18n('Boxes.Productions.ModeDaily'));
			}
			else {
				$(this).text(i18n('Boxes.Productions.ModeCurrent'));
			}

			Productions.CalcBody();
		});
	},


	/**
	 * Sortiert alle Gebäude des letzten Tabs
	 *
	 */
	SortingAllTab: ()=>{

		// Gruppiert die Gebäude
		$('#all tr').each(function(){

			let regex = /([a-z_])*/i;
			let matches = regex.exec( $(this).attr('class') );

			if(matches.length && matches[0] !== "undefined")
			{
				if(!$('#parent-' + matches[0]).length)
				{
					$('<tbody id="parent-' + matches[0] + '" class="parent"><tr><th colspan="4">' + Productions.BuildingTypes[matches[0]] + '</th></tr></tbody>').appendTo('.all-mode');
				}

				$(this).appendTo( $('#parent-' + matches[0]) );
			}
		});


		// Dropdown zum Filtern
		let drop = $('<select />').attr('id', 'all-drop').addClass('game-cursor');

		drop.append( $('<option />').attr('data-type', 'all').text( i18n('Boxes.Productions.Headings.all') ) )

		for(let i in Productions.Buildings)
		{
			if(Productions.Buildings.hasOwnProperty(i))
			{
				drop.append( $('<option />').attr('data-type', Productions.Buildings[i]).text( Productions.BuildingTypes[Productions.Buildings[i]] ).addClass('game-cursor') )
			}
		}

		$('#all-dropdown-th').append(drop);

		setTimeout(()=>{
			Productions.Dropdown();
		}, 100)
	},


	/**
	 * Blendet je nach Dropdown die Typen ein
	 */
	Dropdown: ()=>{
		$('#Productions').on('change', '#all-drop', function() {
			let t = $('select#all-drop :selected').data('type');

			if(t === 'all')
			{
				$('.all-mode').find('.parent').show();
			}
			else {
				$('.all-mode').find('.parent').hide();
				$('.all-mode').find('#parent-' + t).show();
			}
		});
	},


	/**
	 * Kleine Suche für die "Gesamt"-Liste
	 *
	 */
	Filter: ()=>{
		let input, filter, tr, td, i, txtValue;

		input = $("#all-search").val();
		filter = input.toUpperCase();
		tr = $('#all').find('tr');

		// durch alle TRs rennen
		for (i = 0; i < tr.length; i++) {
			td = $(tr[i]).find('td')[0];

			if (td) {
				txtValue = $(td).text();

				if (txtValue.toUpperCase().indexOf(filter) > -1) {
					tr[i].style.display = "";
				} else {
					tr[i].style.display = "none";
				}
			}
		}
	},


	/**
	 * Hilfsfunktion zum Prüfen auf "leer"
	 *
	 * @param obj
	 * @returns {boolean}
	 */
	isEmpty: (obj)=> {
		for(let key in obj) {
			if(obj.hasOwnProperty(key))
				return false;
		}
		return true;
	},


	/**
	 * Fügt dem Rathaus vor dem verarbeiten diverse Bonus und Boost zu
	 *
	 * @param d
	 * @returns {*}
	 */
	prepareMainBuilding: (d)=>{

		if(Productions.MainBuildingBonusAdded === true){
			return d;
		}

		// Botschafter durchsteppen
		if(MainParser.EmissaryService !== null)
		{

			for(let i in MainParser.EmissaryService)
			{
				if(!MainParser.EmissaryService.hasOwnProperty(i)){
					break
				}

				let em = MainParser.EmissaryService[i];

				// Armee-Einheiten ausgrenzen
				if(em['bonus']['type'] === 'unit') {
					continue;
				}

				// alle anderen
				else {

					if(d['state']['current_product']['product']['resources'][ em['bonus']['subType'] ] === undefined){
						d['state']['current_product']['product']['resources'][ em['bonus']['subType'] ] = 0;
					}

					d['state']['current_product']['product']['resources'][ em['bonus']['subType'] ] += em['bonus']['amount'];
				}
			}
		}

		// es gibt min 1 täglichen FP
		if(MainParser.BonusService !== null)
		{
			let dailyFP = MainParser.BonusService.find(o => (o['type'] === 'daily_strategypoint'));

			// tägliche FP ans Rathaus übergeben
			if(dailyFP !== undefined && dailyFP['value'] !== undefined)
			{
				if(d['state']['current_product']['product']['resources']['strategy_points'] === undefined){
					d['state']['current_product']['product']['resources']['strategy_points'] = 0;
				}

				d['state']['current_product']['product']['resources']['strategy_points'] += dailyFP['value'];
			}
		}

		Productions.MainBuildingBonusAdded = true;

		return d;
	},


	/**
	 * Zeigt pulsierend ein Gebäude auf der Map
	 *
	 * @param id
	 */
	ShowFunction: (id)=> {

		CityMap.init(MainParser.CityMapData);

		$('[data-entityid]').removeClass('pulsate');

		setTimeout(() => {
			let target = $('[data-entityid="' + id + '"]');

			$('#map-container').scrollTo(target, 800, {offset: {left: -280, top: -280}, easing: 'swing'});

			target.addClass('pulsate');
		}, 500);
	},


	/**
	 * Namen der Güter ermitteln
	 *
	 * @param GoodType
	 * @returns {*|string}
	 */
	GetGoodName: (GoodType)=> {
		if (GoodType === 'happiness') {
			return i18n('Boxes.Productions.Happiness');
		}
		else {
			return GoodsData[GoodType]['name'];
		}
	},


	/**
	 * Ermittelt die täglichen Güter, falls die Option ShowDaily gesetzt ist
	 *
	 * */
	GetDaily: (Amount, dailyfactor, type) => {
		let Factor;
		if (Productions.ShowDaily && type !== 'happiness' && type !== 'population') {
			Factor = dailyfactor;
		}
		else {
			Factor = 1;
		}

		return Amount * Factor;
    },
};
