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

	CombinedCityMapData: {},
	BuildingsAll: [],
	BuildingsProducts: [],
	BuildingsProductsGroups: [],
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
		'clan_power',		// Macht der Gilde
		'clan_goods',		// Gildengüter (Arche, Ehrenstatue etc.)
		'units',			// Einheiten
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

		Productions.CombinedCityMapData = MainParser.CityMapData;
		if (MainParser.CityMapEraOutpostData) {
			Productions.CombinedCityMapData = Object.assign({}, Productions.CombinedCityMapData, MainParser.CityMapEraOutpostData);
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

		let d = Productions.CombinedCityMapData;
		Productions.BuildingsAll = [];

		let PopulationSum = 0,
			HappinessSum = 0;

		for(let i in d)
		{
			if (!d.hasOwnProperty(i)) continue;

			if (d[i]['id'] >= 2000000000) continue;

			// dem Rathaus evt Boosts hinzufügen (tägliche FP, Botschafter Bonus)
			if(d[i]['id'] === 1 && !d[i]['mainBuildingPrepared']){
				d[i] = Productions.prepareMainBuilding(d[i]);
			}

			// jede einzelne Produktart holen
			let building = Productions.readType(d[i]);

			// das Gebäude produziert etwas?
			if(building !== false){
				Productions.BuildingsAll.push(building);

				if (building['products']['population']) {
					PopulationSum += building['products']['population'];
				}
				if (building['products']['happiness']) {
					HappinessSum += building['products']['happiness'];
				}
			}
		}

		let HappinessBonus = MainParser.AllBoosts['happiness_amount'];
		if (HappinessBonus && HappinessBonus !== 0) {
			let building = {
				name: i18n('Boxes.Productions.AdjacentBuildings'),
				type: 'boost',
				products: [],
				motivatedproducts: [],
				at: (MainParser.getCurrentDate().getTime()) / 1000,
				era: 0,
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

		for(let i in Productions.BuildingsAll)
		{
			if(!Productions.BuildingsAll.hasOwnProperty(i))
			{
				break;
			}

			let building = Productions.BuildingsAll[i];

			if (building['type'] === 'residential' || building['type'] === 'production')
			{
				if (building['products']['money']) {
					building['products']['money'] = MainParser.round(building['products']['money'] * Productions.Boosts['money']);
				}

				if (building['motivatedproducts']['money']) {
					building['motivatedproducts']['money'] = MainParser.round(building['motivatedproducts']['money'] * Productions.Boosts['money']);
				}

				if (building['products']['supplies']) {
					building['products']['supplies'] = MainParser.round(building['products']['supplies'] * Productions.Boosts['supplies']);
				}

				if (building['motivatedproducts']['supplies']) {
					building['motivatedproducts']['supplies'] = MainParser.round(building['motivatedproducts']['supplies'] * Productions.Boosts['supplies']);
				}
			}

			// Nach Produkt
			for (let x in building['products'])
			{
				if (!building['products'].hasOwnProperty(x))
				{
					break;
				}

				if (Productions.Types.includes(x) && x !== 'packaging')
				{
					// Alle Gebäude einzeln auflisten, nach Produkt sortiert
					Productions.BuildingsProducts[x].push(building);

					let index = Productions.BuildingsProductsGroups[x].map((el) => el.eid).indexOf(building['eid']);

					// Alle Gebäude gruppieren und
					if (index === -1)
					{
						let ni = Productions.BuildingsProductsGroups[x].length + 1;

						Productions.BuildingsProductsGroups[x][ni] = [];
						Productions.BuildingsProductsGroups[x][ni]['name'] = building['name'];
						Productions.BuildingsProductsGroups[x][ni]['eid'] = building['eid'];
						Productions.BuildingsProductsGroups[x][ni]['era'] = building['era'];
						Productions.BuildingsProductsGroups[x][ni]['dailyfactor'] = building['dailyfactor'];
						Productions.BuildingsProductsGroups[x][ni]['units'] = building['units'];
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
					let mId = Productions.BuildingsAll[i]['eid'] + '_' + Productions.BuildingsAll[i]['id'];

					if (Array.isArray(Productions.BuildingsProducts['packaging'][mId]) === false) {
						Productions.BuildingsProducts['packaging'][mId] = [];
						Productions.BuildingsProducts['packaging'][mId]['at'] = building['at'];
						Productions.BuildingsProducts['packaging'][mId]['id'] = building['id'];
						Productions.BuildingsProducts['packaging'][mId]['era'] = building['era'];
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
			CurrentResources = [],
			EntityID = d['cityentity_id'],
			CityEntity = MainParser.CityEntities[EntityID],
			AdditionalResources = [],
			Units,
			era;

		if (CityEntity['abilities'])
		{
			for (let AbilityIndex in CityEntity['abilities'])
			{
				if (!CityEntity['abilities'].hasOwnProperty(AbilityIndex)) continue

				let Ability = CityEntity['abilities'][AbilityIndex];

				if (Ability['additionalResources'] && Ability['additionalResources']['AllAge'] && Ability['additionalResources']['AllAge']['resources']) {
					AdditionalResources = Ability['additionalResources']['AllAge']['resources'];
				}

				// this buildung produces random units
				else if(Ability['__class__'] === 'RandomUnitOfAgeWhenMotivatedAbility') {
					Units = Ability['amount'];
				}
            }
        }

		// Zeitalter suchen
		if (CityEntity['is_multi_age'] && d['level']) {
			era = d['level'] + 1;

		}
		// Great building
		else if (CityEntity['strategy_points_for_upgrade']) {
			era = CurrentEraID;
		}
		else {
			let regExString = new RegExp("(?:_)((.[\\s\\S]*))(?:_)", "ig"),
				testEra = regExString.exec(d['cityentity_id']);

			if (testEra && testEra.length > 1) {
				era = Technologies.Eras[testEra[1]];
				if (era === 0) era = CurrentEraID; //AllAge => Current era
			}
		}

		let Ret = {
			name: CityEntity['name'],
			id: d['id'],
			eid: d['cityentity_id'],
			type: d['type'],
			era: era,
			at: (MainParser.getCurrentDate().getTime()) / 1000,
			in: 0
		};

		if (d.state && d['state']['current_product'])
		{
			if (d['state']['current_product']['product'] && d['state']['current_product']['product']['resources']) {
				CurrentResources = Object.assign({}, d['state']['current_product']['product']['resources']);
			}

			if (d['state']['current_product']['clan_power']) {
				CurrentResources['clan_power'] = d['state']['current_product']['clan_power']; // z.B. Ruhmeshalle
			}
			
			if (d['state']['current_product']['units']) {
				CurrentResources['units'] = d['state']['current_product']['units'];
			}

			if (d['state']['current_product']['name'] === 'clan_goods' && d['state']['current_product']['goods']) {
				let GoodSum = 0;

				for (let i = 0; i < d['state']['current_product']['goods'].length; i++) {
					GoodSum += d['state']['current_product']['goods'][i]['value'];
				}

				if (GoodSum > 0) {
					CurrentResources['clan_goods'] = GoodSum;
                }
            }

			if (d['state']['current_product']['guildProduct'] && d['state']['current_product']['guildProduct']['resources']) {
				let GoodSum = 0;

				for (let ResourceName in d['state']['current_product']['guildProduct']['resources']) {
					if(!d['state']['current_product']['guildProduct']['resources'].hasOwnProperty(ResourceName)) continue;

					if (ResourceName === 'clan_power') {
						for (let ResourceName in d['state']['current_product']['guildProduct']['resources']) {
							if (!d['state']['current_product']['guildProduct']['resources'].hasOwnProperty(ResourceName)) continue;

							CurrentResources[ResourceName] = d['state']['current_product']['guildProduct']['resources'][ResourceName];
                        }
											
					} else {
						GoodSum += d['state']['current_product']['guildProduct']['resources'][ResourceName];
                    }
				}

				if (GoodSum > 0) {
					CurrentResources['clan_goods'] = GoodSum;
				}
			}
		}

		// Units filled?
		if(Units)
		{
			CurrentResources['units'] = Units;
		}

        for (let Resource in CurrentResources)
        {
            if(!CurrentResources.hasOwnProperty(Resource))
            {
            	break;
			}

			if (Resource !== 'credits') { // Marscredits nicht zu den Gütern zählen
				Products[Resource] = CurrentResources[Resource];
			}
		}

		if (d['bonus']) {
			if (d['bonus']['type'] === 'population') {
				Products['population'] = (Products['population'] ? Products['population'] : 0) + d['bonus']['value'];
			}
			else if (d['bonus']['type'] === 'happiness') {
				Products['happiness'] = (Products['happiness'] ? Products['happiness'] : 0) + d['bonus']['value'];
			}
		}

		if (CityEntity['staticResources'] && CityEntity['staticResources']['resources']) {
			CityEntity['staticResources']['resources']['population'];
		}

		if (d['state'] && d['state']['__class__'] !== 'ConstructionState' && d['state']['__class__'] !== 'UnconnectedState') {

			if (CityEntity['staticResources'] && CityEntity['staticResources']['resources'] && CityEntity['staticResources']['resources']['population']) {
				Products['population'] = (Products['population'] ? Products['population'] : 0) + CityEntity['staticResources']['resources']['population'];
			}

			if (CityEntity['provided_happiness']) {
				let Faktor = 1;

				if (d['state']['__class__'] === 'PolishedState') {
					Faktor = 2;
				}

				Products['happiness'] = CityEntity['provided_happiness'] * Faktor;
			}
		}

		if (CityEntity['entity_levels'] && CityEntity['entity_levels'][d['level']]) {
			let EntityLevel = CityEntity['entity_levels'][d['level']];

			if (EntityLevel['provided_population']) {
				Products['population'] = (Products['population'] ? Products['population'] : 0) + EntityLevel['provided_population'];
			}

			if (EntityLevel['provided_happiness']) {
				let Faktor = 1;

				if (d['state']['__class__'] === 'PolishedState') {
					Faktor = 2;
				}

				Products['happiness'] = (Products['happiness'] ? Products['happiness'] : 0) + EntityLevel['provided_happiness'] * Faktor;
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

		if (d['state'] ) {
			let At = d['state']['next_state_transition_at'],
				In = d['state']['next_state_transition_in'];

			if (At) Ret.at = At;
			if (In) Ret.in = In;
		}

		Ret.products = Products;
		Ret.motivatedproducts = MotivatedProducts;

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

		if ($('#Productions').length > 0){
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
			if(!Productions.Types.hasOwnProperty(pt))
			{
				break;
			}

			let type = Productions.Types[pt];

			if(!Productions.BuildingsProducts.hasOwnProperty(type))
			{
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
				countAllMotivated = 0,
				sizes = [],
				sizetooltips = [];
      
				// Gebäudegrößen für Effizienzberechnung laden
				for (let i in MainParser.CityMapData) {
					if (!MainParser.CityMapData.hasOwnProperty(i)) continue;

					let Entity = MainParser.CityEntities[MainParser.CityMapData[i]['cityentity_id']],
						width = parseInt(Entity['width']),
						length = parseInt(Entity['length']),
						RequiredStreet = (Entity['type'] === 'street' ? 0 : Entity['requirements']['street_connection_level'] | 0);

					sizes[MainParser.CityMapData[i]['cityentity_id']] = (width * length) + (Math.min(width, length) * RequiredStreet / 2);
					sizetooltips[MainParser.CityMapData[i]['cityentity_id']] = (RequiredStreet > 0 ? HTML.i18nReplacer(i18n('Boxes.Production.SizeTT'), { 'streetnettosize': (Math.min(width, length) * RequiredStreet / 2) }) : '');
	            }

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
						
						let size = sizes[buildings[i]['eid']] | 0,
							SizeToolTip = sizetooltips[buildings[i]['eid']],
							efficiency = (MotivatedProductCount / size);

						let EfficiencyString;

						if (size !== 0) {
							if (type === 'strategy_points') {
								EfficiencyString = HTML.Format(MainParser.round(efficiency * 100) / 100);
							}
							else {
								EfficiencyString = HTML.Format(MainParser.round(efficiency));
							}
						}
						else {
							EfficiencyString = 'N/A';
						}
					
						rowA.push('<td class="text-right is-number addon-info" data-number="' + size + '" title="' + SizeToolTip + '">' + size + '</td>');
						rowA.push('<td class="text-right is-number addon-info" data-number="' + efficiency + '">' + EfficiencyString + '</td>');
						rowA.push('<td class="addon-info is-number" data-number="' + buildings[i]['era'] + '">' + i18n('Eras.' + buildings[i]['era']) + '</td>');
						rowA.push('<td class="wsnw is-date" data-date="' + buildings[i]['at'] + '">' + moment.unix(buildings[i]['at']).format(i18n('DateTime')) + '</td>');

						if (type !== 'population' && type !== 'happiness') {
							if (buildings[i]['at'] * 1000 <= MainParser.getCurrentDateTime()) {
								rowA.push('<td style="white-space:nowrap"><strong class="success">' + i18n('Boxes.Production.Done') + '</strong></td>');
							}
							else {
								rowA.push('<td style="white-space:nowrap">' + moment.unix(buildings[i]['at']).fromNow() + '</td>');
							}
						}
						else {
							rowA.push('<td><td>');
						}

						rowA.push('<td class="text-right"><span class="show-entity" data-id="' + buildings[i]['id'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span></td>');
						rowA.push('</tr>');
					}

					// nur Gebäude mit Gütern
					else {

						let tds = '<td data-text="' + buildings[i]['name'].cleanup() + '">' + buildings[i]['name'] + '</td>';

						let pA = [],
							CurrentBuildingCount = 0;

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
								CurrentBuildingCount += Amount;
								countAll += Amount;

								pA.push(HTML.Format(Amount) + ' ' + Productions.GetGoodName(p));
							}
						}

						tds += '<td class="is-number" data-number="' + CurrentBuildingCount + '">' + pA.join('<br>') + '</td>' +
							'<td class="addon-info is-number" data-number="' + buildings[i]['era'] + '" title="' + i18n('Boxes.Productions.TTGoodsEra') + '">' + i18n('Eras.' + buildings[i]['era']) + '</td>' +
							'<td class="wsnw is-date" data-date="' + buildings[i]['at'] + '">' + moment.unix(buildings[i]['at']).format(i18n('DateTime')) + '</td>';

						if (buildings[i]['at'] * 1000 <= MainParser.getCurrentDateTime()) {
							tds += '<td style="white-space:nowrap"><strong class="success">' + i18n('Boxes.Production.Done') + '</strong></td>';
						}
						else {
							tds += '<td style="white-space:nowrap">' + moment.unix(buildings[i]['at']).fromNow() + '</td>';
						}

						tds += '<td class="text-right"><span class="show-entity" data-id="' + buildings[i]['id'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span></td>' +
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
							MotivatedProductCount = Productions.GetDaily(groups[i]['motivatedproducts'], groups[i]['dailyfactor'], type),
							size = sizes[groups[i]['eid']],
							efficiency = (MotivatedProductCount / (size * groups[i]['count']));

						let EfficiencyString;
						if (type === 'strategy_points') {
							EfficiencyString = HTML.Format(MainParser.round(efficiency * 100) / 100);
						}
						else {
							EfficiencyString = HTML.Format(MainParser.round(efficiency));
						}
									
						let tds = '<tr>' +
							'<td class="text-right is-number" data-number="' + groups[i]['count'] + '">' + groups[i]['count'] + 'x </td>' +
							'<td colspan="3" data-text="' + groups[i]['name'].cleanup() + '">' + groups[i]['name'] + '</td>' +
							'<td class="is-number" data-number="' + MotivatedProductCount + '">' + HTML.Format(ProductCount) + (ProductCount !== MotivatedProductCount ? '/' + HTML.Format(MotivatedProductCount) : '') + '</td>' +
							'<td class="text-right is-number addon-info" data-number="' + (size*groups[i]['count']) + '">' + (size*groups[i]['count']) + '</td>'+
							'<td class="text-right is-number addon-info" data-number="' + efficiency + '">' + EfficiencyString + '</td>'+
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

				// nach Zeitalter gruppieren und Array zusammen fummlen
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
					table.push('<tr><th colspan="6">' + i18n('Boxes.Productions.NoMarsDataWarning') + '</th></tr>');
				}
				if (CurrentEraID === 19 && !MainParser.CityMapEraOutpostData) {
					table.push('<tr><th colspan="6">' + i18n('Boxes.Productions.NoAsteroidDataWarning') + '</th></tr>');
				}

				// Zeitalterweise in die Tabelle legen
				for (let era = eras.length; era >= 0; era--)
				{
					if(!eras.hasOwnProperty(era))
					{
						continue;
					}

					table.push('<tr><th colspan="4"><strong class="text-warning">' + i18n('Eras.' + era) + '</strong></th><th colspan="2" class="text-right text-warning" style="font-weight:normal"><span>' + i18n('Boxes.Productions.GoodEraTotal') + ':</span> <strong>' + HTML.Format(eraSums[era]) + '</strong></th></tr>');

					table.push('<tr><td colspan="6" class="all-products">');

					table.push(eras[era].join(''));

					table.push('</td></tr>');
				}
				table.push('</thead>');

				table.push('<tbody class="packaging-mode packaging-single">');

				table.push('<tr class="other-header"><td class="total-products text-right" colspan="6"><strong>' + i18n('Boxes.Productions.Total') + HTML.Format(countAll) + '</strong></td></tr>');

				table.push('<tr class="sorter-header">');
				table.push('<th class="ascending game-cursor" data-type="packaging-single">' + i18n('Boxes.Productions.Headings.name') + '</th>');
				table.push('<th class="is-number game-cursor" data-type="packaging-single">' + i18n('Boxes.Productions.Headings.amount') + '</th>');
				table.push('<th class="is-number game-cursor" data-type="packaging-single">' + i18n('Boxes.Productions.Headings.era') + '</th>');
				table.push('<th class="is-date game-cursor" data-type="packaging-single">' + i18n('Boxes.Productions.Headings.earning') + '</th>');
				table.push('<th class="no-sort">&nbsp;</th>');
				table.push('<th class="no-sort">&nbsp;</th>');
				table.push('</tr>');
			}

			else {
				table.push('<thead>');

				table.push('<tr class="other-header">');

				table.push('<th colspan="3">');

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
				table.push('<th colspan="4" class="text-right"><strong>' + Productions.GetGoodName(type) + ': ' + HTML.Format(countAll) + (countAll !== countAllMotivated ? '/' + HTML.Format(countAllMotivated) : '') + '</strong></th>');
				table.push('</tr>');

				table.push('</thead>');
				table.push('<tbody class="' + type + '-mode ' + type + '-single">');

				// Sortierung - Einzelheader
				table.push('<tr class="sorter-header">');
				table.push('<th class="ascending game-cursor" data-type="' + type + '-single">' + i18n('Boxes.Productions.Headings.name') + '</th>');
				table.push('<th class="is-number game-cursor text-right" data-type="' + type + '-single">' + i18n('Boxes.Productions.Headings.amount') + '</th>');
				table.push('<th class="is-number game-cursor text-right" data-type="' + type + '-single">' + i18n('Boxes.Productions.Headings.size') + '</th>');
				table.push('<th class="is-number game-cursor text-right" data-type="' + type + '-single">' + i18n('Boxes.Productions.Headings.efficiency') + '</th>');
				table.push('<th class="is-number game-cursor" data-type="' + type + '-single">' + i18n('Boxes.Productions.Headings.era') + '</th>');
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
				table.push('<th colspan="1" class="game-cursor text-right is-number" data-type="' + type + '-groups">' + i18n('Boxes.Productions.Headings.number') + '</th>');
				table.push('<th colspan="3" class="ascending game-cursor" data-type="' + type + '-groups">Name</th>');
				table.push('<th colspan="1" class="is-number game-cursor" data-type="' + type + '-groups">' + i18n('Boxes.Productions.Headings.amount') + '</th>');
				table.push('<th colspan="1" class="is-number game-cursor text-right" data-type="' + type + '-groups">' + i18n('Boxes.Productions.Headings.area') + '</th>');
				table.push('<th colspan="1" class="is-number game-cursor text-right" data-type="' + type + '-groups">' + i18n('Boxes.Productions.Headings.efficiency') + '</th>');
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

				rowC.push('<td>' + i18n('Eras.' + building[i]['era']) + '</td>');

				if (ShowTime) {
					rowC.push('<td>' + moment.unix(building[i]['at']).format(i18n('DateTime')) + '</td>');

					if (building[i]['at'] * 1000 <= MainParser.getCurrentDateTime()) {
						rowC.push('<td style="white-space:nowrap"><strong class="success">' + i18n('Boxes.Production.Done') + '</strong></td>');
					}
					else {
						rowC.push('<td style="white-space:nowrap" colspan="2">' + moment.unix(building[i]['at']).fromNow() + '</td>');
					}
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
		Productions.Tabs.push('<li class="' + id + ' game-cursor"><a href="#' + id + '" class="game-cursor"><span>&nbsp;</span></a></li>');
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
					$('<tbody id="parent-' + matches[0] + '" class="parent"><tr><th colspan="5">' + Productions.BuildingTypes[matches[0]] + '</th></tr></tbody>').appendTo('.all-mode');
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

		// Botschafter durchsteppen
		if(MainParser.EmissaryService !== null)
		{

			for(let i in MainParser.EmissaryService)
			{
				if(!MainParser.EmissaryService.hasOwnProperty(i)){
					break
				}

				let em = MainParser.EmissaryService[i];

				if(em['bonus']['type'] === 'unit'){
					if(d['state']['current_product']['product']['resources']['units'] === undefined){
						d['state']['current_product']['product']['resources']['units'] = 0;
					}

					d['state']['current_product']['product']['resources']['units'] += em['bonus']['amount'];

				} else {
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
			if(dailyFP && dailyFP['value'] )
			{
				if(d['state']['current_product']['product']['resources']['strategy_points'] === undefined){
					d['state']['current_product']['product']['resources']['strategy_points'] = 0;
				}

				d['state']['current_product']['product']['resources']['strategy_points'] += dailyFP['value'];
			}
		}

		d['mainBuildingPrepared'] = true;

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
		else if (GoodType === 'clan_power') {
			return i18n('Boxes.Productions.GuildPower');

		}
		else if (GoodType === 'clan_goods') {
			return i18n('Boxes.Productions.GuildGoods');

        }
		else if (GoodType === 'units'){
			return i18n('Boxes.Productions.Units');

		} else {
			if(GoodType && GoodsData[GoodType]){
				return GoodsData[GoodType]['name'];

			} else {
				return GoodType;
			}
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
