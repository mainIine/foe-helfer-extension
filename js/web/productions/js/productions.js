/*
 * **************************************************************************************
 * Copyright (C) 2024 FoE-Helper team - All Rights Reserved
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
		'goods',			// Güter Gruppe (5 verschieden z.B.)
		'items',			// fragments, blueprints, boosts etc
		'money',			// Münzen
		'supplies',			// Werkzeuge
		'medals',			// Medaillien
		'premium',			// Diamanten
		'population',		// Bevölkerung
		'happiness',		// Zufriedenheit
		'units',			// Einheiten
		'att_boost_attacker', //Angriffsbonus angreifende Armee
		'def_boost_attacker', //Verteidigungsbonus angreifende Armee
		'att_boost_defender', //Angriffsbonus verteidigenden Armee
		'def_boost_defender', //Verteidigungsbonus verteidigenden Armee
		'clan_power',		// Macht der Gilde
		'clan_goods',		// Gildengüter (Arche, Ehrenstatue etc.)
	],

	HappinessBoost: 0,
	PopulationSum: 0,
	HappinessSum: 0,
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
	Rating: {},
	RatingProdPerTiles: {},

	RatingTypes: [
		'strategy_points',	// Forge Punkte
		'money',			// Münzen
		'supplies',			// Werkzeuge
		'medals',			// Medaillien
		'clan_power',		// Macht der Gilde
		'clan_goods',		// Gildengüter (Arche, Ehrenstatue etc.)
		'population',		// Bevölkerung
		'happiness',		// Zufriedenheit
		'units',			// Einheiten
		'att_boost_attacker-all', //Angriffsbonus angreifende Armee
		'att_boost_attacker-guild_expedition',
		'att_boost_attacker-battleground',
		'att_boost_attacker-guild_raids',
		'def_boost_attacker-all', //Verteidigungsbonus angreifende Armee
		'def_boost_attacker-guild_expedition',
		'def_boost_attacker-battleground',
		'def_boost_attacker-guild_raids',
		'att_boost_defender-all', //Angriffsbonus verteidigenden Armee
		'att_boost_defender-guild_expedition',
		'att_boost_defender-battleground',
		'att_boost_defender-guild_raids',
		'def_boost_defender-all', //Verteidigungsbonus verteidigenden Armee
		'def_boost_defender-guild_expedition',
		'def_boost_defender-battleground',
		'def_boost_defender-guild_raids',
		'goods-previous',
		'goods-current',
		'goods-next',
	],
	fragmentsSet: new Set(),


	init: () => {
		CityMap.createNewCityMapEntities()
		Productions.CombinedCityMapData = MainParser.NewCityMapData

		if (CityMap.EraOutpostData) {
			Productions.CombinedCityMapData = Object.assign({}, Productions.CombinedCityMapData, CityMap.EraOutpostData)
		}

		// leere Arrays erzeugen
		for(let i in Productions.Types) {
			if (!Productions.Types.hasOwnProperty(i)) continue

			Productions.BuildingsProducts[Productions.Types[i]] = []
			if (Productions.Types[i] === 'goods') continue
			Productions.BuildingsProductsGroups[ Productions.Types[i] ] = []
		}

		Productions.ReadData();
	},


	/**
	 * Calculate Boosts
	 */
	ReadData: ()=> {
		Productions.BuildingsAll = Object.values(Productions.CombinedCityMapData);
		Productions.setChainsAndSets(Productions.BuildingsAll)

		Productions.PopulationSum = 0,
		Productions.HappinessSum = 0;

		Productions.BuildingsAll.forEach(building => {
			if (building.happiness)
				Productions.HappinessSum += building.happiness
			if (building.population && building.population > 0)
				Productions.PopulationSum += building.population
		})

		let ProdBonus = 0;
		if (Productions.HappinessSum < Productions.PopulationSum) 
			ProdBonus = -0.5
		else if (Productions.HappinessSum < 1.4 * Productions.PopulationSum) 
			ProdBonus = 0
		else 
			ProdBonus = 0.2

		Productions.HappinessBoost = ProdBonus
		Productions.Boosts['money'] += ProdBonus
		Productions.Boosts['supplies'] += ProdBonus

		Productions.showBox();
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

		Productions.SwitchFunction()
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
				Productions.getBoost(building, boost, function(result) { 
					if (result != undefined) {
						if (Productions.BuildingsProducts[boost]) {
							if (Productions.BuildingsProducts[boost].find(x => x.id == building.id) == undefined)
								Productions.BuildingsProducts[boost].push(saveBuilding)
						}
					}
				})
			})
			
			if (building.production) {
				building.production.forEach(production => {
					if (production.type == "guildResources") {
						if (Productions.BuildingsProducts.clan_goods.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts["clan_goods"].push(saveBuilding)
						if (production.resources.clan_power > 0)
							if (Productions.BuildingsProducts.clan_power.find(x => x.id == building.id) == undefined)
								Productions.BuildingsProducts["clan_power"].push(saveBuilding)
					}
					if (production.type == "unit") { 
						if (Productions.BuildingsProducts.units.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts["units"].push(saveBuilding)
					}
					if (production.type == "genericReward") { 
						if (Productions.BuildingsProducts.items.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts["items"].push(saveBuilding)
					}
					if (production.type == "random") {
						production.resources.forEach(resource => {
							if (resource.type == "unit") {
								if (Productions.BuildingsProducts.units.find(x => x.id == building.id) == undefined)
									Productions.BuildingsProducts["units"].push(saveBuilding)
							}
							if (resource.type == "forgepoint_package" || resource.subType == "forgepoint_package") { // e.g. grilling grove
								if (Productions.BuildingsProducts.strategy_points.find(x => x.id == building.id) == undefined)
									Productions.BuildingsProducts["strategy_points"].push(saveBuilding)
							}
							if (resource.type == "consumable" || resource.type.includes("chest") || resource.type.includes("genericReward")) { // todo: where wish fountain
								if (Productions.BuildingsProducts.items.find(x => x.id == building.id) == undefined)
									Productions.BuildingsProducts["items"].push(saveBuilding)
							}
							if (resource.type == "resources" && resource.subType == "strategy_points") {
								if (Productions.BuildingsProducts.strategy_points.find(x => x.id == building.id) == undefined)
									Productions.BuildingsProducts["strategy_points"].push(saveBuilding)
							}
							if (resource.type.includes("goods") && !resource.type.includes("guild")) {
								if (Productions.BuildingsProducts.goods.find(x => x.id == building.id) == undefined)
									Productions.BuildingsProducts["goods"].push(saveBuilding)
							}
							if (resource.type.includes("goods") && resource.type.includes("guild")) {
								if (Productions.BuildingsProducts.clan_goods.find(x => x.id == building.id) == undefined)
									Productions.BuildingsProducts.clan_goods.push(saveBuilding)
							}
						})
					}
					if (production.type == "resources") {
						if (production.resources.money) { 
							if (Productions.BuildingsProducts.money.find(x => x.id == building.id) == undefined)
								Productions.BuildingsProducts["money"].push(saveBuilding)
						}
						if (production.resources.supplies) { 
							if (Productions.BuildingsProducts.supplies.find(x => x.id == building.id) == undefined)
								Productions.BuildingsProducts["supplies"].push(saveBuilding)
						}
						if (production.resources.medals) { 
							if (Productions.BuildingsProducts.medals.find(x => x.id == building.id) == undefined)
								Productions.BuildingsProducts["medals"].push(saveBuilding)
						}
						if (production.resources.premium) { 
							Productions.BuildingsProducts["premium"].push(saveBuilding)
						}
						if (production.resources.strategy_points) { 
							if (Productions.BuildingsProducts.strategy_points.find(x => x.id == building.id) == undefined)
								Productions.BuildingsProducts["strategy_points"].push(saveBuilding)
						}
						if (production.resources.all_goods_of_age || production.resources.random_goods_of_age || production.resources.random_good_of_age || production.resources.all_goods_of_previous_age) {
							if (Productions.BuildingsProducts.goods.find(x => x.id == building.id) == undefined)
								Productions.BuildingsProducts["goods"].push(saveBuilding)

						}
					}
				})
			}
			if (building.state.production) {
				building.state.production.forEach(production => {
					if (production.type == "guildResources") {
						if (Productions.BuildingsProducts.clan_goods.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts.clan_goods.push(saveBuilding)
						if (production.resources.clan_power > 0)
							if (Productions.BuildingsProducts.clan_power.find(x => x.id == building.id) == undefined)
								Productions.BuildingsProducts.clan_power.push(saveBuilding)
					}
					if (production.type == "unit") { 
						if (Productions.BuildingsProducts.units.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts.units.push(saveBuilding)
					}
					if (production.type == "genericReward") { 
						if (Productions.BuildingsProducts.items.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts.items.push(saveBuilding)
					}
					if (production.type == "resources") {
						if (production.resources.money) { 
							if (Productions.BuildingsProducts.money.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts.money.push(saveBuilding)
						}
						if (production.resources.supplies) { 
							if (Productions.BuildingsProducts.supplies.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts.supplies.push(saveBuilding)
						}
						if (production.resources.medals) { 
							if (Productions.BuildingsProducts.medals.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts.medals.push(saveBuilding)
						}
						if (production.resources.premium) { 
							if (Productions.BuildingsProducts.premium.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts.premium.push(saveBuilding)
						}
						if (production.resources.strategy_points) { 
							if (Productions.BuildingsProducts.strategy_points.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts.strategy_points.push(saveBuilding)
						}
						Object.keys(production.resources).forEach(name => {
							let good = GoodsList.find(x => x.id == name)
							if (good != undefined) {
								if (Productions.BuildingsProducts.goods.find(x => x.id == building.id) == undefined)
									Productions.BuildingsProducts["goods"].push(saveBuilding)
							}
						})
					}
				})
			}

			if (building.happiness !== 0) {
				Productions.BuildingsProducts["happiness"].push(saveBuilding)
			}
			if (building.population !== 0) {
				Productions.BuildingsProducts["population"].push(saveBuilding)
			}
		})

		Productions.Types.forEach(type => {
			Productions.SetTabs(type)
			Productions.SetTabContent(type, "") // empty content, fill later
		})

		h.push( Productions.GetTabs() );
		h.push( Productions.GetTabContent() );
	
		h.push('</div>');

		$('#Productions').find('#ProductionsBody').html(h.join('')).promise().done(function () {
			// fill first table
			let type = Productions.Types[0]
			let firstTabContent = Productions.buildTableByType(type)
			$("#Productions #"+type).html(firstTabContent)

			// fill other tables on demand
			$('.production-tabs li').click(function() {
				let type = $("a", this).attr("href").replace("#","")

				if ($("#Productions #"+type).html().length === 0) {
					let content = Productions.buildTableByType(type)
					$("#Productions #"+type).html(content)
					$('.sortable-table').tableSorter();
				}
			});

			// extra functionality
			$('.production-tabs').tabslet({ active: Productions.ActiveTab });
			$('.sortable-table').tableSorter();

			// show a building on the map
			$('#Productions').on('click', '.foe-table .show-entity', function () {
				Productions.ShowFunction($(this).data('id'));
			});
		});			
	},


	buildTableByType(type) {
		let table = [],
			tableGr = [],
			rowA = [],
			groupedBuildings = [],
			boostCounter = {'att_boost_attacker': {all: 0, battleground: 0, guild_expedition: 0, guild_raids: 0},
			'def_boost_attacker': {all: 0, battleground: 0, guild_expedition: 0, guild_raids: 0},
			'att_boost_defender': {all: 0, battleground: 0, guild_expedition: 0, guild_raids: 0},
			'def_boost_defender': {all: 0, battleground: 0, guild_expedition: 0, guild_raids: 0}},
			typeCurrentSum = 0,
			typeSum = 0,
			currentAmount = 0,
			amount = 0,
			hasRandomProductions = false,
			boosts = {},
			buildingIds = Productions.BuildingsProducts[type],
			inADay = Math.floor(Date.now() / 1000) + 86400

			if (type != 'goods') {
				buildingIds.forEach(b => {
					let building = CityMap.getBuildingById(b.id)
					if (building.player_id == ExtPlayerID) { // todo: breaks with population etc for chainedBuildings.. does it still break?
					if (type == 'items' && Productions.showBuildingItems(true, building) == false || building.chainBuilding?.type == "linked") return // make random productions with resources and others disappear from the item list

					rowA.push('<tr>')
					rowA.push('<td>')
						rowA.push((building.state.isPolivated !== undefined ? (building.state.isPolivated ? '<span class="text-bright">★</span>' : '☆') : ''))
						if (building.setBuilding !== undefined)
						rowA.push('<img src="' + srcLinks.get('/shared/icons/' + building.setBuilding.name + '.png', true) + '" class="chain-set-ico">')
						if (building.chainBuilding !== undefined)
						rowA.push('<img src="' + srcLinks.get('/shared/icons/' + building.chainBuilding.name + '.png', true) + '" class="chain-set-ico">')
					rowA.push('</td>')
					rowA.push('<td data-text="'+building.name.replace(/[. -]/g,"")+'">' + building.name + '</td>')
					
					if (!type.includes('att') && !type.includes('def')) {
						if (type != 'items') {
							let production = Productions.getBuildingProductionByCategory(true, building, type)
							currentAmount = parseFloat(production.amount)
							amount = parseFloat(production.amount)
							hasRandomProductions = production.hasRandomProductions

							let doubled = production.doubleWhenMotivated 
							if (building.state.isPolivated == undefined) doubled = false

							if (type == 'money' && building.type != "greatbuilding" && building.type != "main_building") {
								amount = Math.round((amount + (amount * ((MainParser.BoostSums.coin_production + (Productions.HappinessBoost * 100)) / 100))) * (doubled ? 2 : 1))
								currentAmount = Math.round(currentAmount + (currentAmount * ((MainParser.BoostSums.coin_production + (Productions.HappinessBoost * 100)) / 100)))
							}
							else if (type == 'supplies' && building.type != "greatbuilding") {
								// gen b: if supplies are always produced, they are doubled, otherwise not - i think?!
								doubled = false
								if (production.needsMotivation == false) doubled = true
								amount = Math.round((amount + (amount * ((MainParser.BoostSums.supply_production + (Productions.HappinessBoost * 100)) / 100)))) * (doubled ? 2 : 1)
								currentAmount = Math.round(currentAmount + (currentAmount *((MainParser.BoostSums.supply_production + (Productions.HappinessBoost * 100)) / 100)))
							}
							else if (type == 'strategy_points' && building.type != "greatbuilding" && building.type != "main_building" && !building.entityId.includes("CastleSystem")) {
								amount = Math.round(amount + (amount *((MainParser.BoostSums.forge_points_production) / 100)))
								currentAmount = Math.round(currentAmount + (currentAmount *((MainParser.BoostSums.forge_points_production) / 100)))
							}

							rowA.push('<td data-number="'+amount+'" class="textright" colspan="4">')
							if (currentAmount != amount && building.type != 'production')
								rowA.push(HTML.Format(currentAmount) + '/' + (hasRandomProductions ? 'Ø' : '') + HTML.Format(amount))
							else {
								unitType = Productions.getBuildingProductionByCategory(true, building, type).type
								if (unitType != null) rowA.push('<span class="unit_skill ' + unitType + '" title="'+ i18n("Boxes.Units." + unitType ) + '"></span> ')
								rowA.push(HTML.Format(currentAmount))
							}
							rowA.push('</td>')
							
							typeSum += amount
							typeCurrentSum += currentAmount
						}
						else {
							rowA.push('<td colspan="4" data-number="1">' + Productions.showBuildingItems(true, building) + '</td>')
						}
					}
					else {
						if (building.boosts !== undefined) {
							boosts = {
								all: 0,
								battleground: 0,
								guild_expedition: 0,
								guild_raids: 0
							}
							building.boosts.forEach(boost => {
								if (boost.type.find(x => x == type) == type) {
									if (boost.feature == "all") {
										boosts.all += boost.value
										boostCounter[type][boost.feature] += boost.value
									}
									if (boost.feature == "battleground") {
										boosts.battleground += boost.value
										boostCounter[type][boost.feature] += boost.value
									}
									if (boost.feature == "guild_expedition") {
										boosts.guild_expedition += boost.value
										boostCounter[type][boost.feature] += boost.value
									}
									if (boost.feature == "guild_raids") {
										boosts.guild_raids += boost.value
										boostCounter[type][boost.feature] += boost.value
									}
								}
							})
							rowA.push('<td data-number="'+boosts.all+'" class="text-center">'+ (boosts.all != 0 ? HTML.Format(boosts.all) : '') +'</td>')
							rowA.push('<td data-number="'+boosts.battleground+'" class="text-center">'+ (boosts.battleground != 0 ? HTML.Format(boosts.battleground) : '') +'</td>')
							rowA.push('<td data-number="'+boosts.guild_expedition+'" class="text-center">'+ (boosts.guild_expedition != 0 ? HTML.Format(boosts.guild_expedition) : '') +'</td>')
							rowA.push('<td data-number="'+boosts.guild_raids+'" class="text-center">'+ (boosts.guild_raids != 0 ? HTML.Format(boosts.guild_raids) : '') +'</td>')
						}
					}

					let updateGroup = groupedBuildings.find(x => x.building.name == building.name)
					if (updateGroup == undefined) {
						groupedBuildings.push({
							building: building,
							amount: 1,
							currentValues: currentAmount,
							values: amount,
							boosts: boosts,
							hasRandomProductions: hasRandomProductions,
						})
					}
					else {
						updateGroup.amount++
						updateGroup.currentValues += currentAmount
						updateGroup.values += amount
					}

					rowA.push('<td '+((type.includes('att') || type.includes('def')) ? 'colspan="3"' : '')+' data-text="'+i18n("Eras."+Technologies.Eras[building.eraName]+".short").replace(/[. -]/g,"")+'">' + i18n("Eras."+Technologies.Eras[building.eraName]+".short") + '</td>')
					if (!type.includes('att') && !type.includes('def')) {
						let time = (building.state.times?.at <= inADay) ? moment.unix(building.state.times?.at).format('HH:mm') : moment.unix(building.state.times?.at).format('dddd, HH:mm')
						rowA.push('<td style="white-space:nowrap">' + time + '</td>')
						rowA.push('<td style="white-space:nowrap">' + (building.state.times?.at * 1000 <= MainParser.getCurrentDateTime() ? '<strong class="success">' + i18n('Boxes.Productions.Done') : '') + '</strong></td>')
					}
					rowA.push('<td class="text-right">')
					rowA.push('<span class="show-entity" data-id="' + building.id + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span>')
					rowA.push('</td>')
					rowA.push('</tr>')
					}
				})
			}

			if (rowA.length > 0) {
				table.push('<table class="foe-table sortable-table '+type+'-list active">')
				table.push('<thead style="z-index:100">')
				table.push('<tr>')
				table.push('<th colspan="3"><span class="btn-default change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeGroups') + '</span></th>')
				if (!type.includes('att') && !type.includes('def'))
					table.push('<th colspan="9" class="textright">'+HTML.Format(parseFloat(typeCurrentSum))+ "/" +HTML.Format(parseFloat(typeSum))+'</th>')
				else {
					table.push('<th colspan="9" class="textright"></th>')
				}
				table.push('</tr>')
				table.push('<tr class="sorter-header">')
				table.push('<th class="no-sort" data-type="prodlist'+type+'"> </th>')
				table.push('<th class="ascending" data-type="prodlist'+type+'">' + i18n('Boxes.BlueGalaxy.Building') + '</th>')
				if (!type.includes('att') && !type.includes('def')) 
					table.push('<th colspan="4" data-type="prodlist'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.number') + '</th>')
				else {
					table.push('<th class="boost '+type+' is-number text-center" data-type="prodlist'+type+'"><span></span>'+boostCounter[type].all+'</th>')
					table.push('<th class="boost battleground is-number text-center" data-type="prodlist'+type+'"><span></span>'+(boostCounter[type].battleground)+'</th>')
					table.push('<th class="boost guild_expedition is-number text-center" data-type="prodlist'+type+'"><span></span>'+(boostCounter[type].guild_expedition)+'</th>')
					table.push('<th class="boost guild_raids is-number text-center" data-type="prodlist'+type+'"><span></span>'+boostCounter[type].guild_raids+'</th>')
				}
				table.push('<th data-type="prodlist'+type+'">' + i18n('Boxes.Productions.Headings.era') + '</th>')
				if (!type.includes('att') && !type.includes('def')) {
					table.push('<th data-type="prodlist'+type+'" class="no-sort">' + i18n('Boxes.Productions.Headings.earning') + '</th>')
					table.push('<th data-type="prodlist'+type+'" class="no-sort">' + i18n('Boxes.Productions.Headings.Done') + '</th>')
				}
				table.push('<th data-type="prodlist'+type+'" class="no-sort" '+((type.includes('att') || type.includes('def')) ? 'colspan="3"' : '')+'> </th>')
				table.push('</tr>')
				table.push('</thead>')
				table.push('<tbody class="prodlist'+type+'">')
				table.push( rowA.join('') )
				table.push('</tbody>')
				table.push('</table>')

				tableGr = Productions.buildGroupedTable(type, groupedBuildings, boostCounter)
			}
			else {
				table.push('<div class="empty-list">'+i18n('Boxes.Productions.EmptyList')+'</div>')
			}
			let content = table.join('') + tableGr.join('')
			if (type == 'goods')
				content = Productions.buildGoodsTable(buildingIds, type) // goods have their own table

			return content
	},


	setChainsAndSets(buildings) {
		if (buildings === undefined) buildings = Object.values(MainParser.NewCityMapData)
		for (const building of buildings) {
			if (building.setBuilding !== undefined) {
				// todo
				CityMap.findAdjacentSetBuildingByCoords(building.coords.x, building.coords.y, building.setBuilding.name)
			} 
			else if (building.chainBuilding !== undefined && building.chainBuilding?.type == "start") {
				
				let linkedBuildings = CityMap.hasLinks(building)
				if (linkedBuildings.length > 1) {
					let fullBuilding = CityMap.createChainedBuilding(linkedBuildings)
					// todo: remove "duplicate" linked building from list - Productions.BuildingsAll
					// console.log(Productions.BuildingsAll)
				}
			}
		}
	},


	buildGoodsTable: (buildingIds, type = "goods") => {
		let table = [],
			rowB = [],
			rowA = [],
			groupedBuildings = [],
			typeCurrentSum = 0,
			typeSum = 0,
			eras = []

		buildingIds.forEach(b => {
			let building = CityMap.getBuildingById(b.id)
			if (building.player_id == ExtPlayerID) {
				let allGoods = Productions.getBuildingProductionByCategory(false, building, type)
				if (allGoods != undefined) {
					for (const [era, value] of Object.entries(allGoods.eras)) {
						if (eras.find(x => x == era) == undefined) 
							eras.push(era)
					}
				}
			}
		})

		eras.sort().reverse()
		let erasTotal = {};
		for (const era of eras) {
			erasTotal[era] = 0;
	   }

		buildingIds.forEach(b => {
			let building = CityMap.getBuildingById(b.id)
			if (building.player_id == ExtPlayerID) {

			rowA.push('<tr>')
			rowA.push('<td>')
			rowA.push((building.state.isPolivated !== undefined ? (building.state.isPolivated ? '<span class="text-bright">★</span>' : '☆') : ''))
			rowA.push('</td>')
			rowA.push('<td data-text="'+building.name.replace(/[. -]/g,"")+'">' + building.name + '</td>')
			
			currentAmount = parseFloat(Productions.getBuildingProductionByCategory(true, building, type))
			amount = parseFloat(Productions.getBuildingProductionByCategory(false, building, type))

			let updateGroup = groupedBuildings.find(x => x.building.name == building.name)
			if (updateGroup == undefined) {
				let gBuilding = {
					building: building,
					amount: 1,
				}
				for (era of eras) {
					gBuilding[era] = 0
				}
				updateGroup = gBuilding
				groupedBuildings.push(gBuilding)
			}
			else {
				updateGroup.amount++
			}
			
			eras.forEach(era => {
				let currentGoods = Productions.getBuildingProductionByCategory(true, building, type)
				let allGoods = Productions.getBuildingProductionByCategory(false, building, type)

				let currentGoodAmount = 0
				let goodAmount = 0
				if (allGoods != undefined) {
					if (currentGoods != undefined) {
						for (const [key, value] of Object.entries(currentGoods.eras)) {
							if (key == era) {
								currentGoodAmount = value
								erasTotal[era] += currentGoodAmount
							}
						}
					}
					for (const [key, value] of Object.entries(allGoods.eras)) {
						if (key == era) {
							goodAmount = value
							updateGroup[era] += goodAmount
						}
					}
				}
				rowA.push('<td data-number="'+currentGoodAmount+'" class="text-center">')
					if (currentGoodAmount != goodAmount) {
						let isAverage = (allGoods.hasRandomProduction ? "Ø" : "")
						rowA.push(HTML.Format(currentGoodAmount)+'/'+isAverage+HTML.Format(goodAmount))
					}
					else
						rowA.push(HTML.Format(goodAmount))
				rowA.push('</td>')
			})
			
			typeSum += amount
			typeCurrentSum += currentAmount

			rowA.push('<td data-text="'+i18n("Eras."+Technologies.Eras[building.eraName]+".short").replace(/[. -]/g,"")+'">' + i18n("Eras."+Technologies.Eras[building.eraName]+".short") + '</td>')
			rowA.push('<td style="white-space:nowrap">' + moment.unix(building.state.times?.at).format('HH:mm') + '</td>')
			rowA.push('<td style="white-space:nowrap">' + (building.state.times?.at * 1000 <= MainParser.getCurrentDateTime() ? '<strong class="success">' + i18n('Boxes.Productions.Done') : '') + '</strong></td>')
			rowA.push('<td class="text-right">')
			rowA.push('<span class="show-entity" data-id="' + building.id + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span>')
			rowA.push('</td>')
			rowA.push('</tr>')
			}
		})

		table.push('<table class="foe-table sortable-table '+type+'-list active">')
		table.push('<thead>')
		table.push('<tr>')
		table.push('<th colspan="2"><span class="btn-default change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeGroups') + '</span></th>')
		table.push('<th colspan="'+(4+eras.length)+'" class="textright"></th>')
		table.push('</tr>')
		table.push('<tr class="sorter-header">')
		table.push('<th class="no-sort" data-type="prodlist'+type+'"> </th>')
		table.push('<th class="ascending" data-type="prodlist'+type+'">' + i18n('Boxes.BlueGalaxy.Building') + '</th>')
		eras.forEach(era => {
			table.push('<th data-type="prodlist'+type+'" class="is-number text-center">' + i18n('Eras.'+(parseInt(era)+1)+'.short') + '</span><br>'+HTML.Format(erasTotal[era])+'</th>')
		})
		table.push('<th data-type="prodlist'+type+'">' + i18n('Boxes.Productions.Headings.era') + '</th>')
		table.push('<th data-type="prodlist'+type+'" class="no-sort"> </th>')
		table.push('<th data-type="prodlist'+type+'" class="no-sort"> </th>')
		table.push('<th data-type="prodlist'+type+'" class="no-sort"> </th>')
		table.push('</tr>')
		table.push('</thead>')
		table.push('<tbody class="prodlist'+type+'">')
		table.push( rowA.join('') )
		table.push('</tbody>')
		table.push('</table>')

		// grouped
		table.push('<table class="foe-table sortable-table '+type+'-group">')
		table.push('<thead>')
		table.push('<tr>')
		table.push('<th colspan="7"><span class="btn-default change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeSingle') + '</span></th>')
		table.push('</tr>')
		table.push('<tr class="sorter-header">')
		table.push('<th data-type="prodgroup'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.number') + '</th>')
		table.push('<th data-type="prodgroup'+type+'">' + i18n('Boxes.BlueGalaxy.Building') + '</th>')
		eras.forEach(era => {
			table.push('<th data-type="prodgroup'+type+'" class="is-number text-center">' + i18n('Eras.'+(parseInt(era)+1)+'.short') + '</span><br>'+HTML.Format(erasTotal[era])+'</th>')
		})
		table.push('<th data-type="prodgroup'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.size') + '</th>')
		table.push('</tr>')
		table.push('</thead>')
		table.push('<tbody class="prodgroup'+type+'">')
			groupedBuildings.forEach(building => {
				rowB.push('<tr>')
				rowB.push('<td data-number="'+building.amount+'">'+building.amount+'x </td>')
				rowB.push('<td data-text="'+building.building.name.replace(/[. -]/g,"")+'">'+ building.building.name +'</td>')
				eras.forEach(era => {
					rowB.push('<td data-number="'+building[era]+'" class="text-center">')
					rowB.push(HTML.Format(building[era]))
					rowB.push('</td>')
				})
				rowB.push('<td data-number="'+(building.building.size.length*building.building.size.width)+'">'+building.building.size.length+'x'+building.building.size.width+'</td>')
				rowB.push('</tr>')
			})
		table.push( rowB.join('') )
		table.push('</tbody>')
		table.push('</table>')

		return table.join('')
	},


	buildGroupedTable: (type, groupedBuildings, boostCounter) => {
		let tableGr = [], rowB = []
		tableGr.push('<table class="foe-table sortable-table '+type+'-group">')
		tableGr.push('<thead>')
		tableGr.push('<tr>')
		tableGr.push('<th colspan="7"><span class="btn-default change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeSingle') + '</span></th>')
		tableGr.push('</tr>')
		tableGr.push('<tr class="sorter-header">')
		tableGr.push('<th data-type="prodgroup'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.number') + '</th>')
		tableGr.push('<th data-type="prodgroup'+type+'">' + i18n('Boxes.BlueGalaxy.Building') + '</th>')
		if (type.includes('att') || type.includes('def')) {
			tableGr.push('<th class="boost '+type+' is-number text-center" data-type="prodgroup'+type+'"><span></span>'+boostCounter[type].all+'</th>')
			tableGr.push('<th class="boost battleground is-number text-center" data-type="prodgroup'+type+'"><span></span>'+boostCounter[type].battleground+'</th>')
			tableGr.push('<th class="boost guild_expedition is-number text-center" data-type="prodgroup'+type+'"><span></span>'+boostCounter[type].guild_expedition+'</th>')
			tableGr.push('<th class="boost guild_raids is-number text-center" data-type="prodgroup'+type+'"><span></span>'+boostCounter[type].guild_raids+'</th>')
		}
		else
			tableGr.push('<th colspan="4" data-type="prodgroup'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.number') + '</th>')
		tableGr.push('<th data-type="prodgroup'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.size') + '</th>')
		tableGr.push('</tr>')
		tableGr.push('</thead>')
		tableGr.push('<tbody class="prodgroup'+type+'">')
			groupedBuildings.forEach(building => {
				rowB.push('<tr>')
				rowB.push('<td data-number="'+building.amount+'">'+building.amount+'x </td>')
				rowB.push('<td data-text="'+building.building.name.replace(/[. -]/g,"")+'">'+ building.building.name +'</td>')
				if (type.includes('att') || type.includes('def')) {
					rowB.push('<td data-number="'+building.boosts.all*building.amount+'" class="text-center">'+ (building.boosts.all != 0 ? HTML.Format(building.boosts.all*building.amount) : '') +'</td>')
					rowB.push('<td data-number="'+building.boosts.battleground*building.amount+'" class="text-center">'+ (building.boosts.battleground != 0 ? HTML.Format(building.boosts.battleground*building.amount) : '') +'</td>')
					rowB.push('<td data-number="'+building.boosts.guild_expedition*building.amount+'" class="text-center">'+ (building.boosts.guild_expedition != 0 ? HTML.Format(building.boosts.guild_expedition*building.amount) : '') +'</td>')
					rowB.push('<td data-number="'+building.boosts.guild_raids*building.amount+'" class="text-center">'+ (building.boosts.guild_raids != 0 ? HTML.Format(building.boosts.guild_raids*building.amount) : '') +'</td>')
				}
				else {
					if (building.currentValues == building.values) 
						rowB.push('<td colspan="4" data-number="'+building.currentValues+'">'+HTML.Format(building.currentValues)+'</td>')
					else {
						rowB.push('<td colspan="4" data-number="'+building.currentValues+'">'+HTML.Format(building.currentValues)+'/'+(groupedBuildings.hasRandomProductions ? 'Ø' : '')+HTML.Format(building.values)+'</td>')
					}
				}
				rowB.push('<td data-number="'+(building.building.size.length*building.building.size.width)+'">'+building.building.size.length+'x'+building.building.size.width+'</td>')
				rowB.push('</tr>')
			})
		tableGr.push( rowB.join('') )
		tableGr.push('</tbody>')
		tableGr.push('</table>')

		return tableGr
	},


	getBuildingProductionByCategory(current = false, building, category) {
		let prod = {
			amount: 0,
			type: null, // units
			hasRandomProductions: false,
			doubleWhenMotivated: false,
			needsMotivation: false
		}
		let productions = (current ? building.state.production : building.production)

		if (productions) {
			productions.forEach(production => {
				if (production.type == 'random') {
					production.resources.forEach(resource => {
						if (resource.type+"s" == category) { // units 
							prod.amount += resource.amount * resource.dropChance
							prod.hasRandomProductions = true
						}
						if (resource.type == "guild_goods" && category == "clan_goods") {
							prod.amount += resource.amount * resource.dropChance
							prod.hasRandomProductions = true
						}
						if (resource.subType == "strategy_points" && category == "strategy_points") {
							prod.amount += resource.amount * resource.dropChance
							prod.hasRandomProductions = true
						}
					})
				}
				if (production.type == "resources" && category != "goods") {
					if (production.resources[category]) {
						prod.doubleWhenMotivated = production.doubleWhenMotivated
						prod.needsMotivation = production.needsMotivation
						prod.amount += production.resources[category] //* doubleMoney
					}
				}
				if (production.type+"s" == category) { // units
					prod.amount += Object.values(production.resources)[0]
					if (current == true && building.type != "main_building" && building.type != "greatbuilding")
						prod.type = Object.keys(production.resources)[0]
					else
						prod.type = null
				}
				if (category == "clan_goods" && production.type == "guildResources") {
					if (production.resources.all_goods_of_age)
						prod.amount = production.resources.all_goods_of_age
					else {
						let good = GoodsList.find(x => x.era == CurrentEra)
						if (good != undefined)
							prod.amount = production.resources[good.id]*5
					}
				}
				if (category == "clan_power" && production.type == "guildResources") {
					if (production.resources.clan_power)
						prod.amount = production.resources.clan_power
				}
			})
		}

		if (building.population && category == "population") {
			prod.amount += building.population
		}
		if (building.happiness && category == "happiness") {
			prod.amount += building.happiness
		}
		
		if (category == "goods") {
			return CityMap.getBuildingGoodsByEra(current, building)
		}
		return prod
	},


	showBuildingItems(current = false, building) {
		let allItems = ''
		if (building.state.isPolivated == true && current === true) {
			building.state.production?.forEach(production => {
				if (production.type == "genericReward") {
					let frag = (production.resources.subType == "fragment" ? "🧩 " : "")
					allItems += production.resources.amount + "x " + frag + production.resources.name + "<br>"
				}
			})
			if (allItems == '')
				return false // to prevent rows without items in the item table
		}
		else {
			if (building.production) {
				building.production.forEach(production => {
					if (production.type == "random") {
						production.resources.forEach(resource => {
							if (!resource.type.includes("good") && resource.type !== "resources") {
								let frag = (resource.subType == "fragment" ? "🧩 " : "")
								allItems += "Ø " + parseFloat(Math.round(resource.amount*resource.dropChance * 100) / 100) + "x " + frag + resource.name + "<br>"
							}
						})
					}
					if (production.resources.type == "consumable") {
						let frag = (production.resources.subType == "fragment" ? "🧩 " : "")
						allItems += production.resources.amount + "x " + frag + production.resources.name + "<br>"
					}
				})
			}
		}
		return allItems
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
	 * Schalter für die Tabs [List|Group]
	 */
	SwitchFunction: ()=>{
		$('#Productions').on('click', '.change-view', function() {
			let activeTable = $(this).parents('table'),
				hiddenTable = $(this).parents('#'+$(this).data('type')).children('table:not(.active)')

			activeTable.fadeOut(400, function(){
				hiddenTable.fadeIn(400)
				activeTable.removeClass('active')
				hiddenTable.addClass('active')
			});
		});
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
		$('[data-id]').removeClass('highlighted');

		setTimeout(() => {
			$('#grid-outer').addClass('desaturate');
			for (let i = 0; i < IDArray.length; i++) {
				let target = $('[data-id="' + IDArray[i] + '"]');

				if(i === 0) $('#map-container').scrollTo(target, 800, { offset: { left: -280, top: -280 }, easing: 'swing' });
				target.addClass('highlighted');
            }		
		}, 500);
	},


	GetTypeName: (GoodType)=> {
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
		else if (GoodType === 'att_boost_attacker' || GoodType === 'att_boost_attacker-all') {
			return i18n('Boxes.Productions.att_boost_attacker');
		}
		else if (GoodType === 'att_boost_defender' || GoodType === 'att_boost_defender-all') {
			return i18n('Boxes.Productions.att_boost_defender');
		}
		else if (GoodType === 'def_boost_attacker' || GoodType === 'def_boost_attacker-all') {
			return i18n('Boxes.Productions.def_boost_attacker');
		}
		else if (GoodType === 'def_boost_defender' || GoodType === 'def_boost_defender-all') {
			return i18n('Boxes.Productions.def_boost_defender');
		}
		else if (GoodType.includes('battleground')) {
			return i18n('Boxes.Kits.Guild_Battlegrounds');
		}
		else if (GoodType.includes('guild_expedition')) {
			return i18n('Gilden-Expeditionen');
		}
		else if (GoodType.includes('guild_raids')) {
			return i18n('Boxes.Kits.Quantum_Incursion');
		}
		else if (GoodType === 'goods-next') {
			return i18n('Boxes.Productions.goods_next');
        }
		else if (GoodType === 'goods-current') {
			return i18n('Boxes.Productions.goods_current');
        }
		else if (GoodType === 'goods-previous') {
			return i18n('Boxes.Productions.goods_previous');
        }
		else if (GoodType === 'items') {
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


	ShowRating: () => {
		if ($('#ProductionsRating').length === 0) {
			
			CityMap.createNewCityMapEntities()
			Productions.setChainsAndSets()

			let Rating = localStorage.getItem('ProductionRatingEnableds2');
			if (Rating !== null) Productions.Rating = JSON.parse(Rating)

			let RatingProdPerTiles = localStorage.getItem('ProductionRatingProdPerTiles');
			if (RatingProdPerTiles !== null) Productions.RatingProdPerTiles = JSON.parse(RatingProdPerTiles);

			for (let i = 0; i < Productions.RatingTypes.length; i++) {
				let Type = Productions.RatingTypes[i];

				if (Productions.Rating[Type] === undefined) Productions.Rating[Type] = true;
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

			$('#ProductionsRating').on('click', '.toggle-tab', async function () {
				Productions.RatingCurrentTab = $(this).data('value');

				Productions.CalcRatingBody();
			});

			for (let i = 0; i < Productions.RatingTypes.length; i++) {
				let Type = Productions.RatingTypes[i];

				$('#ProductionsRating').on('click', '#Enabled-' + Type, function () {
					let $this = $(this),
						v = $this.prop('checked');

					if (v) {
						Productions.Rating[Type] = true;
					}
					else {
						Productions.Rating[Type] = false;
                    }

					localStorage.setItem('ProductionRatingEnableds2', JSON.stringify(Productions.Rating));
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

		if (Productions.RatingCurrentTab === 'Settings') {
			h.push('<div>');
			h.push('<ul class="foe-table">');

			h.push('<li class="dark-bg">')
			h.push('<span>' + i18n('Boxes.ProductionsRating.Enabled') + '</span>');
			h.push('<span></span><span></span>');
			h.push('<span class="text-right">' + i18n('Boxes.ProductionsRating.ProdPerTile') + '</span>');
			h.push('</li>')

			for (let i = 0; i < Productions.RatingTypes.length; i++) {
				let Type = Productions.RatingTypes[i];

				h.push('<li class="'+Type+'">');
				h.push('<input id="Enabled-' + Type + '" class="no-grow enabled game-cursor" ' + (Productions.Rating[Type] ? 'checked' : '') + ' type="checkbox">');
				h.push('<span class="no-grow resicon ' + Type + '"></span>');
				h.push('<label for="Enabled-'+Type+'">' + Productions.GetTypeName(Type) + '</label>');
				if (Productions.Rating[Type]) {
					h.push('<input type="number" id="ProdPerTile-' + Type + '" step="0.01" min="0" max="1000000" class="no-grow" value="' + Productions.RatingProdPerTiles[Type] + '">');
				}
				else {
					h.push('<span></span>');
				}
				h.push('</li>');
			}
			h.push('</ul>')
			h.push('<p>'+i18n('Boxes.ProductionsRating.Explainer')+'</p>')
			h.push('<p>'+i18n('Boxes.ProductionsRating.Disclaimer')+'</p>')
			h.push('</div>')
		}

		else if (Productions.RatingCurrentTab === 'Results') {
			let buildingType = [];
			// todo: shrine of inspiration etc
			// todo: negative values ??? 1000 is better than 100 ??
			Object.values(MainParser.NewCityMapData).forEach(building => {
				if (building.type == 'street' || building.type == 'military' || building.id >= 2000000000 || building.type.includes('hub')) return

				let foundBuildingIndex = buildingType.findIndex(x => x.name == building.name)
				if (foundBuildingIndex == -1)
					buildingType.push(building)
				else {
					let foundBuilding = buildingType.find(x => x.name == building.name)
					if (Technologies.InnoEras[foundBuilding.eraName] < Technologies.InnoEras[building.eraName]) 
						buildingType[foundBuildingIndex] = building
				}
			})
			
			ratedBuildings = Productions.rateBuildings(buildingType)

			ratedBuildings.sort((a, b) => {
				if (a.score < b.score) return -1
				if (a.score > b.score) return 1
				return 0
			})

			h.push('<div class="ratingtable">');
			h.push('<span class="scrollup" onclick="topFunction()"></span>')
			h.push('<div class="settings dark-bg">')
				h.push('<div>')
				h.push('<input type="checkbox" id="tilevalues"><label for="tilevalues">' + i18n('Boxes.ProductionsRating.ShowValuesPerTile') + '</label><br>')
				h.push('</div><div>');
				h.push('<input type="checkbox" id="showitems"><label for="showitems">' + i18n('Boxes.ProductionsRating.ShowItems') + '</label>')
				h.push('</div>');
			h.push('</div>');
			h.push('<table class="foe-table sortable-table">');
			h.push('<thead>');
			h.push('<tr class="sorter-header">');
			h.push('<th data-type="ratinglist" class="is-number ascending">' + i18n('Boxes.ProductionsRating.Score') + '</th>');
			h.push('<th data-type="ratinglist">' + i18n('Boxes.ProductionsRating.BuildingName') + '</th>');
			let tileRatings = JSON.parse(localStorage.getItem('ProductionRatingProdPerTiles'))
			for (let i = 0; i < Productions.RatingTypes.length; i++) {
				let type = Productions.RatingTypes[i];
				if (!Productions.Rating[type]) continue;
				h.push('<th data-type="ratinglist" style="width:1%" class="is-number text-center"><span class="resicon ' + type + '"></span>'+(tileRatings?.[type] !== undefined ? parseFloat(tileRatings[type]) : Productions.GetDefaultProdPerTile(type))+'</th>');
			}
			h.push('<th data-type="ratinglist" class="no-sort items">Items</th>');
			h.push('</tr>');
			h.push('<thead>');

			h.push('<tbody class="ratinglist">');
			for (const building of ratedBuildings) {
				h.push('<tr>')
				h.push('<td class="text-right" data-number="'+building.score * 100 +'">'+Math.round(building.score * 100)+'</td>')
				h.push('<td data-text="'+helper.str.cleanup(building.building.name)+'">'+building.building.name)
				let eraShortName = i18n("Eras."+Technologies.Eras[building.building.eraName]+".short")
				if (eraShortName != "-")
					h.push(" ("+i18n("Eras."+Technologies.Eras[building.building.eraName]+".short") +')')
				h.push('</td>')
				for (const type of Productions.RatingTypes) {
					if (building[type] != undefined) {
						h.push('<td class="text-right" data-number="'+Math.round(building[type])+'">')
						h.push('<span class="buildingvalue">'+HTML.Format(building[type])+'</span>')
						let roundingFactor = building[type+'-tile'] > 100 || building[type+'-tile'] < -100 ? 1 : 100
						h.push('<span class="tilevalue">'+HTML.Format(Math.round(building[type+'-tile'] * roundingFactor) / roundingFactor)+'</span>')
						h.push('</td>')
					}
				}
				h.push('<td class="no-sort items">'+(Productions.showBuildingItems(false, building.building) != false ? Productions.showBuildingItems(false, building.building) : '')+'</td>')
				h.push('</tr>')
			}
			h.push('</tbody>');
			h.push('</table>');
			h.push('</div>');
		}
		else {
			h.push('Tab error...');
        }

		$('#ProductionsRatingBody').html(h.join('')).promise().done(function () {
			$('.sortable-table').tableSorter();

			$('#tilevalues, label[tilevalues]').on('click', function () {
				$("#ProductionsRatingBody .buildingvalue").toggle();
				$("#ProductionsRatingBody .tilevalue").toggle();
			});

			$('#showitems, label[showitems]').on('click', function () {
				$("#ProductionsRatingBody table .items").toggle();
			});
		});	
		// todo: make scroll button work
		window.onscroll = function() {scrollFunction()};

		function scrollFunction() {
			if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
				$('scrollup').toggle()
			} else {
				$('scrollup').toggle()
			}
		}

		// When the user clicks on the button, scroll to the top of the document
		function topFunction() {
			console.log(this)
			document.body.scrollTop = 0;
			document.documentElement.scrollTop = 0;
		}
    },


	rateBuildings: (buildingType) => {
		let ratedBuildings = []
		let tileRatings = JSON.parse(localStorage.getItem('ProductionRatingProdPerTiles'))
		for (const building of buildingType) {
			if (building.entityId.includes("AllAge_EasterBonus1") || building.entityId.includes("L_AllAge_Expedition16") || building.entityId.includes("L_AllAge_ShahBonus17")) continue // do not include wishingwell type buildings
			let size = building.size.width * building.size.length + building.needsStreet
			let score = 0
			let ratedBuilding = {
				building: building
			}
			let ratingsCounter= 0
			for (const type of Object.keys(Productions.Rating)) {
				if (Productions.Rating[type] != false) {
					let desiredValuePerTile = tileRatings != undefined ? parseFloat(tileRatings[type]) : Productions.GetDefaultProdPerTile(type)
					let typeValue = Productions.getRatingValueForType(building, type) || 0 // production amount
					let valuePerTile = typeValue / size

					if (valuePerTile != 0 && desiredValuePerTile != 0) {
						score += (valuePerTile / desiredValuePerTile) // todo? when using / negative values behave weirdly
					}

					ratedBuilding[type] = ( Math.round( typeValue * 100 ) / 100 ) || 0
					ratedBuilding[type+'-tile'] = valuePerTile || 0

					ratingsCounter++
				}
			}
			ratedBuilding.score = score // / (ratingsCounter > 0 ? ratingsCounter : 1)
			ratedBuildings.push(ratedBuilding)
		}
		return ratedBuildings
	},


	getRatingValueForType: (building, type) => {
		if (type == "happiness")
			return building.happiness
		else if (type == "population")
			return building.population
		else if (type.includes('att') || type.includes('def')) {
			if (building.boosts != undefined)
				for (const boost of building.boosts) {
					let feature = type.split('-')[1]
					let bType = boost.type.find(x => x == type.split('-')[0])
					if (bType !== undefined && feature == boost.feature) {
						return boost.value
					}
				}
		}
		else if (type == "strategy_points" || type == "medals" || type == "premium" || type == "money" || type == "supplies" || type == "units" || type == "clan_goods" || type == "clan_power")
			return Productions.getBuildingProductionByCategory(false, building, type).amount
		
		else if (type.includes("goods")) {
			let allGoods = CityMap.getBuildingGoodsByEra(false, building)
			let eraId = Technologies.InnoEras[building.eraName]
			if (building.type == "greatbuilding")
				eraId = Technologies.InnoEras[CurrentEra]
			if (allGoods != undefined) {
				if (type == "goods-current") {
					if (allGoods.eras[eraId] != undefined)
						return allGoods.eras[eraId]
				}
				if (type == "goods-next") {
					if (allGoods.eras[eraId+1] != undefined)
						return allGoods.eras[eraId+1]
				}
				if (type == "goods-previous") {
					if (allGoods.eras[eraId-1] != undefined)
						return allGoods.eras[eraId-1]
				}
			}
		}
		else
			return 0
	},


	getBoost: (building, boostName, callback) => {
		building.boosts?.forEach(boost => {
			let type = boost.type.find(x => x == boostName)
			if (!boostName.includes('-')) {
				if (type !== undefined) {
					const value = { feature: boost.feature, value: boost.value }
					callback(value)
				}
			}
			callback(undefined)
		})
	},


	GetDefaultProdPerTile: (Type) => {
		if (Type === 'strategy_points') return 0.2;
		if (Type === 'units') return 0.2;
		if (Type === 'clan_power') {
			let Entity = MainParser.CityEntities['Z_MultiAge_CupBonus1b'], //Hall of fame lvl2
				Level = CurrentEraID - 1;

			if (!Entity || !Entity['entity_levels'] || !Entity['entity_levels'][Level] || !Entity['entity_levels'][Level]['clan_power']) return 0;

			return 2 * Entity['entity_levels'][Level]['clan_power'] / 10.5; //Motivated hall of fame lvl2
		}
		if (Type === 'att_boost_attacker') return 3;
		if (Type === 'def_boost_attacker') return 3;
		if (Type === 'att_boost_defender') return 4;
		if (Type === 'def_boost_defender') return 4;
		if (Type === 'goods') return 1;
		else return 0;
	},
};
