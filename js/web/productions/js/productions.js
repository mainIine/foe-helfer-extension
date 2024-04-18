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

let Productions = {

	CombinedCityMapData: {},
	BuildingsAll: [],
	BuildingsProducts: [],
	BuildingsProductsGroups: [],
	ShowDaily: false,

	ActiveTab: 1,

	Tabs: [],
	TabsContent: [],

	Types: [
		'strategy_points',	// Forge Punkte
		'money',			// Münzen
		'supplies',			// Werkzeuge
		'medals',			// Medaillien
		'units',			// Einheiten
		'premium',			// Diamanten
		'clan_power',		// Macht der Gilde
		'clan_goods',		// Gildengüter (Arche, Ehrenstatue etc.)
		'population',		// Bevölkerung
		'happiness',		// Zufriedenheit
		'att_boost_attacker', //Angriffsbonus angreifende Armee
		'def_boost_attacker', //Verteidigungsbonus angreifende Armee
		'att_boost_defender', //Angriffsbonus verteidigenden Armee
		'def_boost_defender', //Verteidigungsbonus verteidigenden Armee
		'goods',			// Güter Gruppe (5 verschieden z.B.)
		'fragments',			
	],

	HappinessBoost: 0,
	Boosts: [],

	Buildings: [
		'greatbuilding',
		'production',
		'random_production',
		'residential',
		'decoration',
		'street',
		'goods',
		'culture',
		'main_building',
		'clan_power_production',
		'off_grid',
		'generic_building'
	],

	RatingCurrentTab: 'Settings',
	RatingEnableds: {},
	RatingProdPerTiles: {},

	RatingTypes: [
		'strategy_points',	// Forge Punkte
		'money',			// Münzen
		'supplies',			// Werkzeuge
		'medals',			// Medaillien
		'units',			// Einheiten
		'clan_power',		// Macht der Gilde
		'clan_goods',		// Gildengüter (Arche, Ehrenstatue etc.)
		'population',		// Bevölkerung
		'happiness',		// Zufriedenheit
		'att_boost_attacker', //Angriffsbonus angreifende Armee
		'def_boost_attacker', //Verteidigungsbonus angreifende Armee
		'att_boost_defender', //Angriffsbonus verteidigenden Armee
		'def_boost_defender', //Verteidigungsbonus verteidigenden Armee
		'goods',				// Güter Gruppe (5 verschieden z.B.)
	],
	fragmentsSet: new Set(),


	/**
	 *  Start der ganzen Prozedur
	 */
	init: () => {
		//moment.locale(18n('Local'));

		Productions.CombinedCityMapData = MainParser.NewCityMapData;
		if (CityMap.EraOutpostData) {
			Productions.CombinedCityMapData = Object.assign({}, Productions.CombinedCityMapData, CityMap.EraOutpostData);
		}

		// leere Arrays erzeugen
		for(let i in Productions.Types) {
			if (!Productions.Types.hasOwnProperty(i)) continue;

			Productions.BuildingsProducts[Productions.Types[i]] = [];
			if (Productions.Types[i] === 'goods') continue;
			Productions.BuildingsProductsGroups[ Productions.Types[i] ] = [];
		}

		Productions.ReadData();
	},


	/**
	 * Alle Gebäude durchsteppen
	 */
	ReadData: ()=> {
		Productions.BuildingsAll = Object.values(Productions.CombinedCityMapData);

		let PopulationSum = 0,
			HappinessSum = 0;

		Productions.BuildingsAll.forEach(building => {
			if (building.happiness)
				HappinessSum += building.happiness
			if (building.population && building.population > 0)
				PopulationSum += building.population
		})

		let ProdBonus = 0;
		if (HappinessSum < PopulationSum) 
			ProdBonus = -0.5
		else if (HappinessSum < 1.4 * PopulationSum) 
			ProdBonus = 0
		else 
			ProdBonus = 0.2

		Productions.HappinessBoost = ProdBonus
		Productions.Boosts['money'] += ProdBonus
		Productions.Boosts['supplies'] += ProdBonus

		Productions.BuildingsAll.forEach(building => {

			// Nach Produkt
			if (building.state.production)
				building.state.production.forEach(production => {
					if (Productions.Types.includes(production.resources)) {
						// Alle Gebäude einzeln auflisten, nach Produkt sortiert
						Productions.BuildingsProducts[x].push(building);

						let index = Productions.BuildingsProductsGroups[x].map((el) => el.eid).indexOf(building['eid']);

						// Alle Gebäude gruppieren und
						if (index === -1) {
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

						}
						else {
							Productions.BuildingsProductsGroups[x][index]['products'] += parseInt(building['products'][x]);
							Productions.BuildingsProductsGroups[x][index]['motivatedproducts'] += parseInt(building['motivatedproducts'][x]);
							Productions.BuildingsProductsGroups[x][index]['count']++;
						}
					}
/*
				else {
					let mId = Productions.BuildingsAll[i]['eid'] + '_' + Productions.BuildingsAll[i]['id'];

					if (Array.isArray(Productions.BuildingsProducts['goods'][mId]) === false) {
						Productions.BuildingsProducts['goods'][mId] = [];
						Productions.BuildingsProducts['goods'][mId]['at'] = building['at'];
						Productions.BuildingsProducts['goods'][mId]['id'] = building['id'];
						Productions.BuildingsProducts['goods'][mId]['era'] = building['era'];
						Productions.BuildingsProducts['goods'][mId]['name'] = building['name'];
						Productions.BuildingsProducts['goods'][mId]['type'] = building['type'];
						Productions.BuildingsProducts['goods'][mId]['dailyfactor'] = building['dailyfactor'];
						Productions.BuildingsProducts['goods'][mId]['products'] = [];
						Productions.BuildingsProducts['goods'][mId]['motivatedproducts'] = [];
					}

					Productions.BuildingsProducts['goods'][mId]['products'][x] = building['products'][x];
					Productions.BuildingsProducts['goods'][mId]['motivatedproducts'][x] = building['motivatedproducts'][x];
				}*/
			}) 
			// wenn boosts citymap.getboosts oder so
		})

		Productions.showBox();
	},


	/**
	 * Calculates average reward of a GenericReward
	 * */
	CalcAverageRewards: (GenericReward, DropChance=100) => {
		let Ret = {};

		if (GenericReward['type'] === 'resource' || GenericReward['type'] === 'good') {
			Ret[GenericReward['subType']] = GenericReward['amount'] * DropChance/100.0;
		}
		else if(GenericReward['type'] === 'chest') {
			for (let i = 0; i < GenericReward['possible_rewards'].length; i++) {
				let CurrentReward = GenericReward['possible_rewards'][i];

				let Rewards = Productions.CalcAverageRewards(CurrentReward['reward'], CurrentReward['drop_chance']);
				for (let ResName in Rewards) {
					if (!Ret[ResName]) Ret[ResName] = 0;
					Ret[ResName] += Rewards[ResName];
                }
            }
		}

		return Ret;
    },

	/**
	 * HTML Box erstellen und einblenden
	 */
	showBox: () => {

		if ($('#Productions').length > 0){
			HTML.CloseOpenBox('Productions');

			return;
		}

		HTML.AddCssFile('productions');

		HTML.Box({
			id: 'Productions',
			title: i18n('Boxes.Productions.Title'),
			auto_close: true,
			dragdrop: true,
			minimize: true,
			resize: true
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

		Productions.BuildingsAll.forEach(building => {
			let boosts = Object.keys(MainParser.BoostSums)
			let saveBuilding = {id: building.id, entityId: building.entityId}

			boosts.forEach(boost => {
				let buildingBoost = {}
				Productions.getBoost(building, boost, function(result) { buildingBoost = result })
				if (buildingBoost != {}) {
					if (buildingBoost.feature === "all")
						if (Productions.BuildingsProducts[boost])
							Productions.BuildingsProducts[boost].push(saveBuilding)
				}
			})
			
			if (building.production) {
				building.production.forEach(production => {
					if (production.type == "guildResources") { // todo
						Productions.BuildingsProducts["clan_goods"].push(saveBuilding)
						if (production.resources.clan_power > 0)
							Productions.BuildingsProducts["clan_power"].push(saveBuilding)
					}
					if (production.type == "unit") { 
						Productions.BuildingsProducts["units"].push(saveBuilding)
					}
					if (production.resources.money) { 
						Productions.BuildingsProducts["money"].push(saveBuilding)
					}
					if (production.resources.medals) { 
						Productions.BuildingsProducts["medals"].push(saveBuilding)
					}
					if (production.resources.premium) { 
						Productions.BuildingsProducts["premium"].push(saveBuilding)
					}
					if (production.resources.strategy_points) { 
						Productions.BuildingsProducts["strategy_points"].push(saveBuilding)
					}
					if (production.resources.supplies) { 
						Productions.BuildingsProducts["supplies"].push(saveBuilding)
					}
					if (production.resources.subType == "fragment") { 
						Productions.BuildingsProducts["fragments"].push(saveBuilding)
					}
					// todo: random production?!
					// todo: goods
				})
			}
			
			if (building.state.production) {
				building.state.production.forEach(production => {
					/*if (production.type == "guildResources") { // todo
						Productions.BuildingsProducts["clan_goods"].push(saveBuilding)
						if (production.resources.clan_power > 0)
							Productions.BuildingsProducts["clan_power"].push(saveBuilding)
					}
					if (production.type == "unit") { 
						Productions.BuildingsProducts["units"].push(saveBuilding)
					}
					if (production.resources.money) { 
						Productions.BuildingsProducts["money"].push(saveBuilding)
					}
					if (production.resources.medals) { 
						Productions.BuildingsProducts["medals"].push(saveBuilding)
					}
					if (production.resources.premium) { 
						Productions.BuildingsProducts["premium"].push(saveBuilding)
					}
					if (production.resources.strategy_points) { 
						Productions.BuildingsProducts["strategy_points"].push(saveBuilding)
					}
					if (production.resources.supplies) { 
						Productions.BuildingsProducts["supplies"].push(saveBuilding)
					}
					if (production.resources.subType == "fragment") { 
						Productions.BuildingsProducts["fragments"].push(saveBuilding)
					}*/
					// todo: random production?!
					// todo: goods
				})
			}

			if (building.happiness !== 0) {
				Productions.BuildingsProducts["happiness"].push(saveBuilding)
			}
			if (building.population !== 0) {
				Productions.BuildingsProducts["population"].push(saveBuilding)
			}
		})

		console.log(Productions.BuildingsProducts, Productions.Types)

		Productions.Types.forEach(type => {
			let buildingIds = Productions.BuildingsProducts[type]

			Productions.SetTabs(type)

			let groups = Productions.BuildingsProductsGroups[type],
			table = [],
			rowA = [],
			rowB = [],
			countProducts = [],
			countProductsMotivated = [],
			countProductsDone = [],
			countAll = 0,
			countAllMotivated = 0,
			typeSum = 0,
			sizes = [],
			sizetooltips = [];

			buildingIds.forEach(b => {
				let building = CityMap.getBuildingById(b.id)
				//let shortSide = parseFloat(Math.min(building.size.width, building.size.length))
				//let size = building.size.width*building.size.length
				//let sizeWithStreets = size + (building.state.connected == true ? (building.needsStreet > 0 ? shortSide * building.needsStreet / 2 : 0) : 0)

				rowA.push('<tr>')
				rowA.push('<td>')
				rowA.push((building.state.isPolivated !== undefined ? (building.state.isPolivated ? '<span class="text-bright">★</span>' : '☆') : ''))
				rowA.push('</td>')
				rowA.push('<td>' + building.name + '</td>')
				// todo: warum haben hüpfkürbisse ne produktion obwohl sie nicht laufen
				// todo: yeah.. something
				if (type != 'fragments') {
					let amount = parseFloat(CityMap.getBuildingCurrentProductionByCategory(building, type))
					if (building.state.isPolivated == false) {
						amount = parseFloat(CityMap.getBuildingProductionByCategory(building, type))
					}

					if (type == 'money' && building.type != "greatbuilding") {
						amount = Math.round(amount + (amount * ((MainParser.BoostSums.coin_production + (Productions.HappinessBoost * 100)) / 100)))
					}
					else if (type == 'supplies' && building.type != "greatbuilding") {
						amount = Math.round(amount + (amount *((MainParser.BoostSums.supply_production + (Productions.HappinessBoost * 100)) / 100)))
					}
					rowA.push('<td data-number="'+amount+'">')
					rowA.push(HTML.Format(amount))
					rowA.push('</td>')

					typeSum += amount
				}
				else {
					rowA.push('<td>' + CityMap.getBuildingFragments(building) + '</td>')
				}
				rowA.push('<td>' + i18n("Eras."+Technologies.Eras[building.eraName]) + '</td>')
				rowA.push('<td style="white-space:nowrap">' + moment.unix(building.state.times?.at).fromNow() + '</td>')
				// todo: invalid date
				rowA.push('<td style="white-space:nowrap">' + (building.state.times?.at * 1000 <= MainParser.getCurrentDateTime() ? '<strong class="success">' + i18n('Boxes.Productions.Done') : '') + '</strong></td>')
				rowA.push('<td class="text-right">')
				rowA.push('<span class="show-entity" data-id="' + building.id + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span>')
				rowA.push('</td>')
				rowA.push('</tr>')
			})

			table.push('<table class="foe-table sortable-table">')
			table.push('<thead>')
			table.push('<tr>')
			table.push('<th colspan="7" class="textright">'+HTML.Format(parseFloat(typeSum))+'</th>')
			table.push('</tr>')
			table.push('<tr>')
			table.push('<th> </th>')
			table.push('<th>' + i18n('Boxes.BlueGalaxy.Building') + '</th>')
			table.push('<th>' + i18n('Boxes.Productions.Headings.number') + '</th>')
			table.push('<th>' + i18n('Boxes.Productions.Headings.era') + '</th>')
			table.push('<th>' + i18n('Boxes.Productions.Headings.earning') + '</th>')
			table.push('<th>' + i18n('Boxes.Productions.Headings.Done') + '</th>')
			table.push('<th> </th>')
			table.push('</tr>')
			table.push('</thead>')
			table.push('<tbody>')
			table.push( rowA.join('') )
			table.push('</tbody>')
			table.push('</table>')

			Productions.SetTabContent(type, table.join(''));
		})

		// einzelne Güterarten durchsteppen
		/*for(let pt in Productions.Types) {
			if (!Productions.Types.hasOwnProperty(pt)) break;
			
			let type = Productions.Types[pt];

			if (!Productions.BuildingsProducts.hasOwnProperty(type)) break;
			
			Productions.SetTabs(type);

			Productions.BuildingsProducts[type] = helper.arr.multisort(Productions.BuildingsProducts[type], ['name'], ['ASC']);

			if(type !== 'goods') Productions.BuildingsProductsGroups[type] = helper.arr.multisort(Productions.BuildingsProductsGroups[type], ['name'], ['ASC']);

			let buildings = Productions.BuildingsProducts[type],
				groups = Productions.BuildingsProductsGroups[type],
				table = [],
				rowA = [],
				rowB = [],
				countProducts = [],
				countProductsMotivated = [],
				countProductsDone = [],
				countAll = 0,
				countAllMotivated = 0,
				countAllDone = 0,
				sizes = [],
				sizetooltips = [];
      
				// Gebäudegrößen für Effizienzberechnung laden
				for (const [key, building] of Object.entries(Productions.CombinedCityMapData)) {
					sizes[building] = building.size.width * building.size.length;
					sizetooltips[building] = (building.needsStreet > 0 ? HTML.i18nReplacer(i18n('Boxes.Productions.SizeTT'), { 'streetnettosize': building.needsStreet }) : '');
	            }

			// einen Typ durchsteppen [money,supplies,strategy_points,...]
			for(let i in buildings) {
				if(buildings.hasOwnProperty(i)) {
					if(type !== 'goods') {
						let ProductCount = Productions.GetDaily(buildings[i]['products'][type], buildings[i]['dailyfactor'], type),
							MotivatedProductCount = Productions.GetDaily(buildings[i]['motivatedproducts'][type], buildings[i]['dailyfactor'], type);

						countAll += ProductCount;
						countAllMotivated += MotivatedProductCount;
						countAllDone += (buildings[i]['at'] * 1000 < MainParser.getCurrentDateTime() ? ProductCount : 0);

						rowA.push('<tr>');
						rowA.push('<td data-text="' + helper.str.cleanup(buildings[i]['name']) + '">' + buildings[i]['name'] + '</td>');
						
						if (type === 'fragments')
							rowA.push('<td data-text="' + helper.str.cleanup(buildings[i]['products']['fragments']) + '">' + buildings[i]['products']['fragments'] + '</td>');
						else
							rowA.push('<td class="text-right is-number" data-number="' + MotivatedProductCount + '">' + HTML.Format(ProductCount) + (ProductCount !== MotivatedProductCount ? '/' + HTML.Format(MotivatedProductCount) : '') + '</td>');
						
						let size = sizes[buildings[i]['eid']];
					
						rowA.push('<td class="addon-info is-number" data-number="' + buildings[i]['era'] + '">' + i18n('Eras.' + buildings[i]['era']) + '</td>');
						
						if (Productions.TypeHasProduction(type)) {
							rowA.push('<td class="wsnw is-date" data-date="' + buildings[i]['at'] + '">' + (buildings[i]['at'] ? moment.unix(buildings[i]['at']).format(i18n('DateTime')) : i18n('Boxes.Productions.DateNA')) + '</td>');
							if (!buildings[i]['at']) { //No date available
								rowA.push('<td>');
                            }						
							else if (buildings[i]['at'] * 1000 <= MainParser.getCurrentDateTime()) {
								rowA.push('<td style="white-space:nowrap"><strong class="success">' + i18n('Boxes.Productions.Done') + '</strong></td>');
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

						let tds = '<td data-text="' + helper.str.cleanup(buildings[i]['name']) + '">' + buildings[i]['name'] + '</td>';

						let pA = [],
							CurrentBuildingCount = 0,
							CurrentBuildingMotivatedCount = 0;

						for(let p in buildings[i]['motivatedproducts'])
						{
							if (!buildings[i]['motivatedproducts'].hasOwnProperty(p)) continue;

							if (Productions.Types.includes(p) === false && !Productions.fragmentsSet.has(p)) {
								if (countProducts[p] === undefined) {
									countProducts[p] = 0;
									countProductsMotivated[p] = 0;
									countProductsDone[p] = 0;
								}

								let Amount = Productions.GetDaily(buildings[i]['products'][p], buildings[i]['dailyfactor'], p),
									MotivatedAmount = Productions.GetDaily(buildings[i]['motivatedproducts'][p], buildings[i]['dailyfactor'], p);

								countProducts[p] += Amount;
								countProductsMotivated[p] += MotivatedAmount;

								CurrentBuildingCount += Amount;
								CurrentBuildingMotivatedCount += MotivatedAmount;

								countAll += Amount;
								countAllMotivated += MotivatedAmount;

								if (buildings[i]['at'] * 1000 < MainParser.getCurrentDateTime()) {
									countProductsDone[p] += Amount;
									countAllDone += Amount;
								}

								pA.push(HTML.Format(Amount) + (Amount !== MotivatedAmount ? '/' + HTML.Format(MotivatedAmount) : '') + ' ' + Productions.GetGoodName(p));
							}
						}

						tds += '<td class="is-number" data-number="' + CurrentBuildingCount + '">' + pA.join('<br>') + '</td>' +
							'<td class="addon-info is-number" data-number="' + buildings[i]['era'] + '" title="' + HTML.i18nTooltip(i18n('Boxes.Productions.TTGoodsEra')) + '">' + i18n('Eras.' + buildings[i]['era']) + '</td>' +
							'<td class="wsnw is-date" data-date="' + buildings[i]['at'] + '">' + (buildings[i]['at'] ? moment.unix(buildings[i]['at']).format(i18n('DateTime')) : i18n('Boxes.Productions.DateNA')) + '</td>';

						if (!buildings[i]['at']) {
							tds += '<td></td>';
                        }
						else if (buildings[i]['at'] * 1000 <= MainParser.getCurrentDateTime()) {
							tds += '<td style="white-space:nowrap"><strong class="success">' + i18n('Boxes.Productions.Done') + '</strong></td>';
						}
						else {
							tds += '<td style="white-space:nowrap">' + moment.unix(buildings[i]['at']).fromNow() + '</td>';
						}

						tds += '<td class="text-right"><span class="show-entity" data-id="' + buildings[i]['id'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span></td>' +
							'</tr>';

						rowA.push(tds);
					}
				}
			}

			// Gruppierte Ansicht
			if(type !== 'goods') {

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
							'<td colspan="3" data-text="' + helper.str.cleanup(groups[i]['name']) + '">' + groups[i]['name'] + '</td>' +
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
			if(Productions.isEmpty(countProducts) === false) {
				let eras = [],
					eraSums = [],
					eraSumsMotivated = [],
					eraSumsDone = [];

				// nach Zeitalter gruppieren und Array zusammen fummlen
				for(let ca in countProducts)
				{
					if (!countProducts.hasOwnProperty(ca)) continue;

					let era = Technologies.Eras[GoodsData[ca]['era']];

					if (eras[era] === undefined) eras[era] = [];

					eras[era].push('<span>' + Productions.GetGoodName(ca) + ' <strong>' + HTML.Format(countProducts[ca]) + (countProducts[ca] !== countProductsMotivated[ca] ? '/' + HTML.Format(countProductsMotivated[ca]) : '') + '</strong></span>');

					if (eraSums[era] === undefined) {
						eraSums[era] = 0;
						eraSumsMotivated[era] = 0;
						eraSumsDone[era] = 0;
					}
					eraSums[era] += countProducts[ca];
					eraSumsMotivated[era] += countProductsMotivated[ca];
					eraSumsDone[era] += countProductsDone[ca];
				}


				table.push('<thead>');

				if (Productions.ShowDaily)
				{
					table.push('<span class="btn-default change-daily game-cursor" data-value="' + (pt - (-1)) + '">' + i18n('Boxes.Productions.ModeDaily') + '</span>');
				}
				else {
					table.push('<span class="btn-default change-daily game-cursor" data-value="' + (pt - (-1)) + '">' + i18n('Boxes.Productions.ModeCurrent') + '</span>');
				}

				if (CurrentEraID === 18 && !CityMap.EraOutpostData) {
					table.push('<tr><th colspan="6">' + i18n('Boxes.Productions.NoMarsDataWarning') + '</th></tr>');
				}
				if (CurrentEraID === 19 && !CityMap.EraOutpostData) {
					table.push('<tr><th colspan="6">' + i18n('Boxes.Productions.NoAsteroidDataWarning') + '</th></tr>');
				}
				if (CurrentEraID === 20 && !CityMap.EraOutpostData) {
					table.push('<tr><th colspan="6">' + i18n('Boxes.Productions.NoVenusDataWarning') + '</th></tr>');
				}

				// Zeitalterweise in die Tabelle legen
				for (let era = eras.length; era >= 0; era--)
				{
					if (!eras.hasOwnProperty(era)) continue;
					
					table.push('<tr><th colspan="3"><strong class="text-warning">' + i18n('Eras.' + era) + '</strong></th>');
					table.push('<th colspan="3" class="text-right text-warning" style="font-weight:normal"><span>' + i18n('Boxes.Productions.GoodEraTotal') + ':</span> <strong>' + HTML.Format(eraSums[era]) + (eraSums[era] !== eraSumsMotivated[era] ? '/' + HTML.Format(eraSumsMotivated[era]) : '') + '</strong>');
					table.push(' <span class="success">' + i18n('Boxes.Productions.Done') + ':</span> <strong class="success">' + HTML.Format(eraSumsDone[era]) + '</strong></th ></tr > ');

					table.push('<tr><td colspan="6" class="all-products">');

					table.push(eras[era].join(''));

					table.push('</td></tr>');
				}
				table.push('</thead>');

				table.push('<tbody class="goods-mode goods-single">');

				table.push('<tr class="other-header"><td class="total-products text-right" colspan="6"><strong>' + i18n('Boxes.Productions.Total') + HTML.Format(countAll) + '</strong>');
				table.push(' <strong class="success">' + i18n('Boxes.Productions.Done') + ': ' + HTML.Format(countAllDone) + '</strong></td ></tr > ');

				table.push('<tr class="sorter-header">');
				table.push('<th class="ascending game-cursor" data-type="goods-single">' + i18n('Boxes.Productions.Headings.name') + '</th>');
				table.push('<th class="is-number game-cursor" data-type="goods-single">' + i18n('Boxes.Productions.Headings.amount') + '</th>');
				table.push('<th class="is-number game-cursor" data-type="goods-single">' + i18n('Boxes.Productions.Headings.era') + '</th>');
				table.push('<th class="is-date game-cursor" data-type="goods-single">' + i18n('Boxes.Productions.Headings.earning') + '</th>');
				table.push('<th class="no-sort">&nbsp;</th>');
				table.push('<th class="no-sort">&nbsp;</th>');
				table.push('</tr>');
			}
			else {
				if(type !== 'fragments'){
					table.push('<thead>');

					table.push('<tr class="other-header">');

					table.push('<th colspan="3">');

					if (Productions.TypeHasProduction(type)) {
						if (Productions.ShowDaily) {
							table.push('<span class="btn-default change-daily game-cursor" data-value="' + (pt - (-1)) + '">' + i18n('Boxes.Productions.ModeDaily') + '</span>');
						}
						else {
							table.push('<span class="btn-default change-daily game-cursor" data-value="' + (pt - (-1)) + '">' + i18n('Boxes.Productions.ModeCurrent') + '</span>');
						}
					}

					table.push('<span class="btn-default change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeSingle') + '</span>');
					table.push('</th>');

					table.push('<th colspan="6" class="text-right"><strong>' + Productions.GetGoodName(type) + ': ' + HTML.Format(countAll) + (countAll !== countAllMotivated ? '/' + HTML.Format(countAllMotivated) : '') + '</strong>');
					if (Productions.TypeHasProduction(type)) {
						table.push(' <strong class="success">' + i18n('Boxes.Productions.Done') + ': ' + HTML.Format(countAllDone) + '</strong>');
					}
					table.push('</th>');
					table.push('</tr>');

					table.push('</thead>');
				}
				table.push('<tbody class="' + type + '-mode ' + type + '-single">');

				// Sortierung - Einzelheader
				table.push('<tr class="sorter-header">');
				table.push('<th class="ascending game-cursor" data-type="' + type + '-single">' + i18n('Boxes.Productions.Headings.name') + '</th>');
				table.push('<th class="is-number game-cursor text-right" data-type="' + type + '-single">' + i18n('Boxes.Productions.Headings.amount') + '</th>');
				table.push('<th class="is-number game-cursor text-right" data-type="' + type + '-single">' + i18n('Boxes.Productions.Headings.size') + '</th>');
				table.push('<th class="is-number game-cursor text-right" data-type="' + type + '-single">' + i18n('Boxes.Productions.Headings.efficiency') + '</th>');
				table.push('<th class="is-number game-cursor" data-type="' + type + '-single">' + i18n('Boxes.Productions.Headings.era') + '</th>');
				if (Productions.TypeHasProduction(type)) {
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
			if(Productions.isEmpty(rowB) === false) {
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
		}*/

		// alles auf einmal ausgeben
		console.log(Productions.BuildingsAll)
		Productions.BuildingsAll = helper.arr.multisort(Productions.BuildingsAll, ['name'], ['ASC']);
		Productions.SetTabs('all');

		let building = Productions.BuildingsAll,
			TableAll = [],
			rowC = [];

		for(let i in building) {
			if(building.hasOwnProperty(i)) {
				let pA = [],
					prod = building[i]['products'],
					ShowTime = false;

				for(let p in prod) {
					if(prod.hasOwnProperty(p)) {
						if (p==='fragments') continue;
						pA.push(HTML.Format(Productions.GetDaily(prod[p], building[i]['dailyfactor'], p)) + ' ' + Productions.GetGoodName(p));
						if (Productions.TypeHasProduction(p)) {
							ShowTime = true;
						}
					}
				}

				rowC.push('<tr class="' + building[i]['type'] + ' ' + (!ShowTime || building[i]['at'] * 1000 >= MainParser.getCurrentDateTime() ? 'notdone' : '') + '">');
				rowC.push('<td>' + building[i]['name'] + '</td>');

				rowC.push('<td>' + pA.join('<br>') + '</td>');

				rowC.push('<td>' + i18n('Eras.' + building[i]['era']) + '</td>');

				if (ShowTime) {
					rowC.push('<td>' + (building[i]['at'] ? moment.unix(building[i]['at']).format(i18n('DateTime')) : i18n('Boxes.Productions.DateNA')) + '</td>');

					if (!building[i]['at']) {
						rowC.push('<td></td>');
                    }
					else if (building[i]['at'] * 1000 <= MainParser.getCurrentDateTime()) {
						rowC.push('<td style="white-space:nowrap"><strong class="success">' + i18n('Boxes.Productions.Done') + '</strong></td>');
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
	* alle Produkte auslesen
	*
	* @param d
	* @returns {{eid: *, at: *, in: *, name: *, id: *, type: *, products: *, motivatedproducts: *}}
	*/
   readType: (d) => {			
	   // Boost ausrechnen und bereitstellen falls noch nicht initialisiert
	   if (Productions.Boosts['money'] === undefined) Productions.Boosts['money'] = ((MainParser.BoostSums['coin_production'] + 100) / 100);
	   if (Productions.Boosts['supplies'] === undefined) Productions.Boosts['supplies'] = ((MainParser.BoostSums['supply_production'] + 100) / 100);
	   if (Productions.Boosts['fp'] === undefined) Productions.Boosts['fp'] = ((MainParser.BoostSums['forge_points_production'] + 100) / 100);
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
		return '<ul class="horizontal dark-bg">' + Productions.Tabs.join('') + '</ul>';
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
	 * Gibt an, ob der jeweilige Ressourcentyp produziert wird oder nicht (z.B. Bevölkerung, Zufriedenheits, Kampfboosts)
	*
    * @param Type
    */
	TypeHasProduction: (Type) => {
		if (Type === 'population' || Type === 'happiness' || Type === 'att_boost_attacker' || Type === 'att_boost_defender' || Type === 'def_boost_attacker' || Type === 'def_boost_defender') {
			return false;
		}
		else {
			return true;
        }
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
					$('<tbody id="parent-' + matches[0] + '" class="parent"><tr><th colspan="5">' + i18n('Boxes.Productions.Headings.' + matches[0]) + '</th></tr></tbody>').appendTo('.all-mode');
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
				drop.append($('<option />').attr('data-type', Productions.Buildings[i]).text(i18n('Boxes.Productions.Headings.' + Productions.Buildings[i])).addClass('game-cursor') )
			}
		}

		drop.append($('<option />').attr('data-type', 'done').text(i18n('Boxes.Productions.Headings.Done')))

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

			if (t === 'all') {
				$('.all-mode').find('.parent').show();
				$('.all-mode').find('.notdone').show();
			}
			else if (t === 'done') {
				$('.all-mode').find('.parent').show();
				$('.all-mode').find('.notdone').hide();
            }
			else {
				$('.all-mode').find('.parent').hide();
				$('.all-mode').find('#parent-' + t).show();
				$('.all-mode').find('.notdone').show();
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
	 * Zeigt pulsierend ein Gebäude auf der Map
	 *
	 * @param ids
	 */
	ShowFunction: (ids) => {
		let IDArray = (ids.length !== undefined ? ids : [ids]);

		CityMap.init(MainParser.CityMapData);

		$('#grid-outer').removeClass('desaturate');
		$('[data-entityid]').removeClass('highlighted');

		setTimeout(() => {
			$('#grid-outer').addClass('desaturate');
			for (let i = 0; i < IDArray.length; i++) {
				let target = $('[data-entityid="' + IDArray[i] + '"]');

				if(i === 0) $('#map-container').scrollTo(target, 800, { offset: { left: -280, top: -280 }, easing: 'swing' });
				target.addClass('highlighted');
            }		
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

		}
		else if (GoodType === 'att_boost_attacker') {
			return i18n('Boxes.Productions.att_boost_attacker');

		}
		else if (GoodType === 'att_boost_defender') {
			return i18n('Boxes.Productions.att_boost_defender');

		}
		else if (GoodType === 'def_boost_attacker') {
			return i18n('Boxes.Productions.def_boost_attacker');

		}
		else if (GoodType === 'def_boost_defender') {
			return i18n('Boxes.Productions.def_boost_defender');

		}
		else if (GoodType === 'goods') {
			return i18n('Boxes.Productions.goods');
        }
		else if (GoodType === 'fragments') {
			return i18n('Boxes.Productions.fragments');
        }		
		else {
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
	GetDaily: (Amount, daily_factor, type) => {
		let Factor;
		if (Productions.ShowDaily && Productions.TypeHasProduction(type)) {
			Factor = daily_factor;
		}
		else {
			Factor = 1;
		}

		return Amount * Factor;
	},


	ShowRating: () => {
		if ($('#ProductionsRating').length === 0) {

			let RatingEnableds = localStorage.getItem('ProductionRatingEnableds');
			if (RatingEnableds !== null) {
				Productions.RatingEnableds = JSON.parse(RatingEnableds);
			}

			let RatingProdPerTiles = localStorage.getItem('ProductionRatingProdPerTiles');
			if (RatingProdPerTiles !== null) {
				Productions.RatingProdPerTiles = JSON.parse(RatingProdPerTiles);
			}

			for (let i = 0; i < Productions.RatingTypes.length; i++) {
				let Type = Productions.RatingTypes[i];

				if (Productions.RatingEnableds[Type] === undefined) Productions.RatingEnableds[Type] = true;
				if (Productions.RatingProdPerTiles[Type] === undefined) Productions.RatingProdPerTiles[Type] = Productions.GetDefaultProdPerTile(Type);
            }

			HTML.Box({
				id: 'ProductionsRating',
				title: i18n('Boxes.ProductionsRating.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true
			});
			HTML.AddCssFile('productions');

			// Ein Gebäude soll auf der Karte dargestellt werden
			$('#ProductionsRating').on('click', '.foe-table .show-entity', function () {
				let ID = $(this).data('id');

				let Parts = ID.split('='),
					GroupType = (Parts.length >= 1 ? Parts[0] : ''),
					GroupID = (Parts.length >= 2 ? Parts[1] : '');
									
				let IDs = [];
				for (let i in MainParser.CityMapData) {
					if (!MainParser.CityMapData.hasOwnProperty(i)) continue;

					let CurrentBuilding = MainParser.CityMapData[i];

					if (GroupType === 'cityentity_id') {
						if (CurrentBuilding['cityentity_id'] === GroupID) IDs.push(i);
					}
					else if (GroupType === 'setId' || GroupType === 'chainId') {
						let Entity = MainParser.CityEntities[CurrentBuilding['cityentity_id']];

						if (!Entity['abilities']) continue;
						for (let j = 0; j < Entity['abilities'].length; j++) {
							let Ability = Entity['abilities'][j];

							if (Ability[GroupType] === GroupID) IDs.push(i);
						}
					}
                }

				Productions.ShowFunction(IDs);
			});

			$('#ProductionsRating').on('click', '.toggle-tab', function () {
				Productions.RatingCurrentTab = $(this).data('value');

				Productions.CalcRatingBody();
			});

			for (let i = 0; i < Productions.RatingTypes.length; i++) {
				let Type = Productions.RatingTypes[i];

				$('#ProductionsRating').on('click', '#Enabled-' + Type, function () {
					let $this = $(this),
						v = $this.prop('checked');

					if (v) {
						Productions.RatingEnableds[Type] = true;
					}
					else {
						Productions.RatingEnableds[Type] = false;
                    }

					localStorage.setItem('ProductionRatingEnableds', JSON.stringify(Productions.RatingEnableds));
					Productions.CalcRatingBody();
				});

				$('#ProductionsRating').on('blur', '#ProdPerTile-' + Type, function () {
					Productions.RatingProdPerTiles[Type] = parseFloat($('#ProdPerTile-' + Type).val());
					if (isNaN(Productions.RatingProdPerTiles[Type])) Productions.RatingProdPerTiles[Type] = 0;
					localStorage.setItem('ProductionRatingProdPerTiles', JSON.stringify(Productions.RatingProdPerTiles));
					Productions.CalcRatingBody();
				});
			}
		} else {
			HTML.CloseOpenBox('ProductionsRating');
		}

		Productions.CalcRatingBody();
	},


	CalcRatingBody: () => {
		let h = [];

		h.push('<div class="tabs">');
		h.push('<ul class="horizontal dark-bg">');
		h.push('<li class="' + (Productions.RatingCurrentTab === 'Settings' ? 'active' : '')  + '"><a class="toggle-tab" data-value="Settings"><span>' + i18n('Boxes.ProductionsRating.Settings') + '</span></a></li>');
		h.push('<li class="' + (Productions.RatingCurrentTab === 'Results' ? 'active' : '') + '"><a class="toggle-tab" data-value="Results"><span>' + i18n('Boxes.ProductionsRating.Results') + '</span></a></li>');
		h.push('</ul>');
		h.push('</div>');

		//Einstellungen
		if (Productions.RatingCurrentTab === 'Settings') {
			h.push('<table class="foe-table">');

			h.push('<thead>')
			h.push('<tr>');
			h.push('<th></th>'); //Symbol
			h.push('<th></th>'); //ResourceName
			h.push('<th class="text-center">' + i18n('Boxes.ProductionsRating.Enabled') + '</th>');
			h.push('<th class="text-center">' + i18n('Boxes.ProductionsRating.ProdPerTile') + '</th>');
			h.push('</tr>');
			h.push('</thead>')

			h.push('<tbody>');
			for (let i = 0; i < Productions.RatingTypes.length; i++) {
				let Type = Productions.RatingTypes[i];

				h.push('<tr>');
				h.push('<td style="width:1%" class="text-center"><span class="resicon ' + Type + '"></span></td>');
				h.push('<td>' + Productions.GetGoodName(Type) + '</td>');
				h.push('<td class="text-center"><input id="Enabled-' + Type + '" class="enabled game-cursor" ' + (Productions.RatingEnableds[Type] ? 'checked' : '') + ' type="checkbox"></td>');
				if (Productions.RatingEnableds[Type]) {
					h.push('<td class="text-center"><input type="number" id="ProdPerTile-' + Type + '" step="0.01" min="0" max="1000000" value="' + Productions.RatingProdPerTiles[Type] + '"></td>');
				}
				else {
					h.push('<td></td>');
                }
				h.push('</tr>');
			}
			h.push('</tbody>');

			h.push('</table>');
		}
		//Ergebnisse
		else if (Productions.RatingCurrentTab === 'Results') {
			//Schritt1: Berechnung
			let BuildingGroups = {};
			for (let i in MainParser.CityMapData) {
				if (!MainParser.CityMapData.hasOwnProperty(i)) continue;

				let Building = MainParser.CityMapData[i],
					Entity = MainParser.CityEntities[Building['cityentity_id']],
					GroupID = Building['cityentity_id'],
					GroupName = Entity['name'],
					GroupType = 'cityentity_id';

				if (Entity['abilities']) {
					let SkipBuilding = false;
					for (let j = 0; j < Entity['abilities'].length; j++) {
						let Ability = Entity['abilities'][j],
							Class = Ability['__class__'];

						if (Class === 'NotsellableAbility') { //Keine Gebäude, die man nicht abreißen kann
							SkipBuilding = true;
							break;
						}
						else if (Ability['chainId']) {
							GroupID = Ability['chainId'];
							GroupName = (MainParser.BuildingChains[Ability['chainId']] ? MainParser.BuildingChains[Ability['chainId']]['name'] : Ability['chainId']);
							GroupType = 'chainId';
						}
						else if (Ability['setId']) {
							GroupID = Ability['setId'];
							GroupName = (MainParser.BuildingSets[Ability['setId']] ? MainParser.BuildingSets[Ability['setId']]['name'] : Ability['setId']);
							GroupType = 'setId';

                        }
					}
					if (SkipBuilding) continue;
				}

				//keine Straßen, keine Millitärgebäude
				if (Entity['type'] === 'street' || Entity['type'] === 'military') continue;

				//let Score = 0;

				Production['motivatedproducts']['goods'] = 0;
				for (let Type in Production['motivatedproducts']) {
					if (!Production['motivatedproducts'].hasOwnProperty(Type)) continue;

					if (Productions.TypeHasProduction(Type)) Production.motivatedproducts[Type] *= Production['dailyfactor'];
					if (['residential','production','generic_building'].includes(Building['type'])) {
						if (Type === 'money') Production.motivatedproducts[Type] *= (Productions.Boosts['money']);
						if (Type === 'supplies') Production.motivatedproducts[Type] *= (Productions.Boosts['supplies']);
					}
				}

				for (let Type in Production['motivatedproducts']) {
					//Güter zusammenfassen
					if (!Productions.Types.includes(Type)) {
						Production.motivatedproducts['goods'] += Production.motivatedproducts[Type];
						delete Production.motivatedproducts[Type];
					}
				}

				for (let Type in Production['motivatedproducts']) {
					if (!Production['motivatedproducts'].hasOwnProperty(Type)) continue;

					if (!Productions.RatingEnableds[Type]) {
						delete Production.motivatedproducts[Type];						
					}
				}
				if (!BuildingGroups[GroupID]) BuildingGroups[GroupID] = [];

				Production.GroupName = GroupName;
				Production.GroupType = GroupType;
				BuildingGroups[GroupID].push(Production);
			}

			let GroupStats = [];
			for (let GroupID in BuildingGroups) {
				if (!BuildingGroups.hasOwnProperty(GroupID)) continue;

				let CurrentGroup = BuildingGroups[GroupID],
					TotalProducts = {},
					TotalTiles = 0;

				for (let i = 0; i < CurrentGroup.length; i++) {
					let CurrentBuilding = CurrentGroup[i],
						Entity = MainParser.CityEntities[CurrentBuilding['eid']];

					for (let ResName in CurrentBuilding['motivatedproducts']) {
						if (!CurrentBuilding['motivatedproducts'].hasOwnProperty(ResName)) continue;

						if (!TotalProducts[ResName]) TotalProducts[ResName] = 0;
						TotalProducts[ResName] += CurrentBuilding['motivatedproducts'][ResName];
					}

					let BuildingSize = CityMap.GetBuildingSize(MainParser.CityMapData[CurrentBuilding['id']]);

					TotalTiles += BuildingSize['total_area'];
				}

				let TotalPoints = 0;
				for (let ResName in TotalProducts) {
					if (!TotalProducts.hasOwnProperty(ResName)) continue;

					if (!Productions.RatingEnableds[ResName] || Productions.RatingProdPerTiles[ResName] <= 0) continue;

					TotalPoints += TotalProducts[ResName] / Productions.RatingProdPerTiles[ResName];
				}

				let GroupStat = {};
				GroupStat['ID'] = GroupID;
				GroupStat['GroupName'] = CurrentGroup[0]['GroupName'];
				GroupStat['GroupType'] = CurrentGroup[0]['GroupType'];
				GroupStat['Count'] = CurrentGroup.length;
				GroupStat['TotalProducts'] = TotalProducts;
				GroupStat['Score'] = TotalPoints / TotalTiles;

				GroupStats.push(GroupStat);
            }

			GroupStats = GroupStats.sort(function (a, b) {
				return a['Score'] - b['Score'];
			});

			//Schritt2: Header
			h.push('<table class="foe-table sortable-table">');

			h.push('<thead>');
			h.push('<tr>');
			h.push('<th>' + i18n('Boxes.ProductionsRating.BuildingName') + '</th>');
			for (let i = 0; i < Productions.RatingTypes.length; i++) {
				let Type = Productions.RatingTypes[i];

				if (!Productions.RatingEnableds[Type]) continue;

				h.push('<th style="width:1%" class="text-center"><span class="resicon ' + Type + '"></span></th>');
			}
			h.push('<th>' + i18n('Boxes.ProductionsRating.Score') + '</th>');
			h.push('<th></th>');
			h.push('</tr>');
			h.push('<thead>');

			//Schritt3: Body
			h.push('<tbody>');
			
			for (let i = 0; i < GroupStats.length; i++) {
				let GroupStat = GroupStats[i];

				h.push('<tr>');
				h.push('<td>' + GroupStat['Count'] + 'x ' + GroupStat['GroupName'] + '</td>');
				for (let j = 0; j < Productions.RatingTypes.length; j++) {
					let Type = Productions.RatingTypes[j];

					if (!Productions.RatingEnableds[Type]) continue;

					let Amount = (GroupStat['TotalProducts'][Type] ? GroupStat['TotalProducts'][Type] : 0);
					h.push('<td class="text-center">' + HTML.Format(Math.round(Amount)) + '</td>');
				}

				let ScorePercent = Math.round(GroupStat['Score'] * 100);

				h.push('<td><strong class="' + (ScorePercent >= 100 ? 'success' : 'error') + '">' + ScorePercent + '%</strong></td>');//(ScorePercent > 0 ? ScorePercent + '%' : 'N/A') + '</strong></td>');
				h.push('<td class="text-right"><span class="show-entity" data-id="' + GroupStat['GroupType'] + '=' + GroupStat['ID'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span></td>');
				h.push('</tr>');
            }

			h.push('</tbody>');

			h.push('</table>');
		}
		else {
			h.push('Tab error...');
        }

		$('#ProductionsRatingBody').html(h.join(''));
    },

	getBoost: (building, boostName, callback) => {
		if (building.boosts)
			building.boosts.forEach(boost => {
				let type = boost.type.find(x => x == boostName)
				if (type !== undefined) {
					const value = { feature: boost.feature, value: boost.value }
					callback(value)
				}
			})
	},


	GetDefaultProdPerTile: (Type) => {
		if (Type === 'strategy_points') return 0.2;
		if (Type === 'money') return 0;
		if (Type === 'supplies') return 0;
		if (Type === 'medals') return 0;
		if (Type === 'units') return 0.2;
		if (Type === 'clan_power') {
			let Entity = MainParser.CityEntities['Z_MultiAge_CupBonus1b'], //Hall of fame lvl2
				Level = CurrentEraID - 1;

			if (!Entity || !Entity['entity_levels'] || !Entity['entity_levels'][Level] || !Entity['entity_levels'][Level]['clan_power']) return 0;

			return 2 * Entity['entity_levels'][Level]['clan_power'] / 10.5; //Motivated hall of fame lvl2
		}
		if (Type === 'clan_goods') return 0;
		if (Type === 'population') return 0;
		if (Type === 'happiness') return 0;
		if (Type === 'att_boost_attacker') return 1;
		if (Type === 'def_boost_attacker') return 1;
		if (Type === 'att_boost_defender') return 4;
		if (Type === 'def_boost_defender') return 6;
		if (Type === 'goods') return 1;
		else return 0;
	},
};
