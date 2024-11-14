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
		'strategy_points',	// Forge Points
		'goods',			// Goods and special goods
		'items',			// Fragments, blueprints, boosts etc
		'money',			// Coins
		'supplies',
		'medals',
		'premium',			// Diamonds
		'population',
		'happiness',
		'units',
		'att_boost_attacker',
		'def_boost_attacker',
		'att_boost_defender',
		'def_boost_defender',
		'clan_power',
		'clan_goods',
		'guild_raids'
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
	Rating: JSON.parse(localStorage.getItem('ProductionRatingEnableds2')||"{}"),
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
		if (CityMap.IsExtern) return

		MainParser.NewCityMapData = CityMap.createNewCityMapEntities()
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

		Productions.ReadData()
	},


	/**
	 * Calculate Boosts
	 */
	ReadData: ()=> {
		Productions.BuildingsAll = Object.values(Productions.CombinedCityMapData)
		Productions.setChainsAndSets(Productions.BuildingsAll)

		Productions.PopulationSum = 0,
		Productions.HappinessSum = 0

		Productions.BuildingsAll.forEach(building => {
			if (building.happiness)
				Productions.HappinessSum += building.happiness
			if (building.population && building.population > 0)
				Productions.PopulationSum += building.population
		})

		let ProdBonus = 0
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
			resize: true,
        	settings: 'Productions.ShowSettings()'
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
						if (boost.includes('guild_raids')) {
							if (Productions.BuildingsProducts.guild_raids.find(x => x.id == building.id) == undefined)
								Productions.BuildingsProducts.guild_raids.push(saveBuilding)
						}
					}
				})
			})
			
			if (building.production) {
				building.production.forEach(production => {
					if (production.type == "guildResources") {
						if (Productions.BuildingsProducts.clan_goods.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts["clan_goods"].push(saveBuilding)
						if (production.resources?.clan_power > 0)
							if (Productions.BuildingsProducts.clan_power.find(x => x.id == building.id) == undefined)
								Productions.BuildingsProducts["clan_power"].push(saveBuilding)
					}
					if (production.type == "unit") { 
						if (Productions.BuildingsProducts.units.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts["units"].push(saveBuilding)
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
							if (resource.type == "consumable" || resource.type.includes("chest")) {
								if (Productions.BuildingsProducts.items.find(x => x.id == building.id) == undefined)
									Productions.BuildingsProducts["items"].push(saveBuilding)
							}
							if (resource.type == "resources" && resource.subType == "strategy_points") {
								if (Productions.BuildingsProducts.strategy_points.find(x => x.id == building.id) == undefined)
									Productions.BuildingsProducts["strategy_points"].push(saveBuilding)
							}
							if (resource.type.includes("good") && !resource.type.includes("guild")) {
								if (Productions.BuildingsProducts.goods.find(x => x.id == building.id) == undefined)
									Productions.BuildingsProducts["goods"].push(saveBuilding)
							}
							if (resource.type.includes("good") && resource.type.includes("guild")) {
								if (Productions.BuildingsProducts.clan_goods.find(x => x.id == building.id) == undefined)
									Productions.BuildingsProducts.clan_goods.push(saveBuilding)
							}
						})
					}
					if (production.type == 'special_goods') { // space carrier
						if (Productions.BuildingsProducts.goods.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts["goods"].push(saveBuilding)
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
					if (production.resources?.type == "consumable") {
						if (Productions.BuildingsProducts.items.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts["items"].push(saveBuilding)
					}
					if (production.resources?.icon == "next_age_goods") {
						if (Productions.BuildingsProducts.goods.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts["goods"].push(saveBuilding)
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
						if (Productions.BuildingsProducts.items.find(x => x.id == building.id) == undefined) {
							Productions.BuildingsProducts.items.push(saveBuilding)
						}
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
					if (production.resources?.icon == "next_age_goods") {
						if (Productions.BuildingsProducts.goods.find(x => x.id == building.id) == undefined)
							Productions.BuildingsProducts["goods"].push(saveBuilding)
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
					$('.TSinactive').tableSorter()					
					$('.TSinactive').removeClass('TSinactive')					
					Productions.filterTable('#Productions .filterCurrentList')
				}
			});

			// extra functionality
			$('.production-tabs').tabslet({ active: Productions.ActiveTab })
			$('.TSinactive').tableSorter()					
			$('.TSinactive').removeClass('TSinactive')					
			Productions.filterTable('#Productions .filterCurrentList')

			// show a building on the map
			$('#Productions').on('click', '.foe-table .show-entity', function () {
				Productions.ShowOnMap($(this).data('id'));
			});
		});			
	},

	setChainsAndSets(buildings) {
		if (buildings === undefined) buildings = Object.values(MainParser.NewCityMapData)
		
		for (const building of buildings) {
			if (building?.setBuilding !== undefined) {
				// todo
				// CityMap.findAdjacentSetBuildingByCoords(building.coords.x, building.coords.y, building.setBuilding.name)
			} 
			else if (building?.chainBuilding !== undefined && building?.chainBuilding?.type == "start") {
				
				let linkedBuildings = CityMap.hasLinks(building)
				if (linkedBuildings.length > 1) {
					CityMap.createChainedBuilding(linkedBuildings)
					
					for (const link of linkedBuildings) {
						if (link.chainBuilding.type == 'linked') {
							// todo: kann irgendwie kaputt gehen
							// let index = Productions.BuildingsAll.findIndex(x => x.id == link.id)
							// delete Productions.BuildingsAll[index]
						}
					}
				}
			}
		}
	},

	filterTable: (selector) => {
		$(selector).on('keyup', function (e) {
			let filter = $(this).val().toLowerCase()
			let table = $(this).parents("table")
			if (filter.length >= 2) {
				$("tbody tr", table).hide()
				$("tbody tr", table).filter(function() {
					let foundText = ($(this).text().toLowerCase().indexOf(filter) > -1)
					if (foundText)
						$(this).show()
				});
			}
			else {
				$("tbody tr", table).show()
			}
		});
	},

	buildQITable(type) {
		let table = [],
		tableGr = [],
		rowA = [],
		groupedBuildings = [],
		boostCounter = {},
		typeSum = 0,
		amount = 0,
		boosts = {},
		buildingIds = Productions.BuildingsProducts[type],
		Sum = {}

		buildingIds.forEach(b => {
			let building = CityMap.getBuildingById(b.id)
			if (building.player_id == ExtPlayerID) {
			rowA.push('<tr>')
			rowA.push('<td>')
				rowA.push((building.state.isPolivated !== undefined ? (building.state.isPolivated ? '<span class="text-bright">★</span>' : '☆') : ''))
				if (building.setBuilding !== undefined)
				rowA.push('<img src="' + srcLinks.get('/shared/icons/' + building.setBuilding.name + '.png', true) + '" class="chain-set-ico">')
				if (building.chainBuilding !== undefined)
				rowA.push('<img src="' + srcLinks.get('/shared/icons/' + building.chainBuilding.name + '.png', true) + '" class="chain-set-ico">')
			rowA.push('</td>')
			rowA.push('<td data-text="'+helper.str.cleanup(building.name)+'"  class="' + (MainParser.Allies.buildingList?.[building.id]?"ally" : "") +'">' + building.name + '</td>')
			
			if (building.boosts !== undefined) {
				boosts = {}
				building.boosts.forEach(boost => {
					if (boost.type.find(x => x.includes('guild_raids_'))) {
						if (boosts[boost.type[0]] == undefined) 
							boosts[boost.type[0]] = parseInt(boost.value)
						else
							boosts[boost.type[0]] += parseInt(boost.value)

						if (boostCounter[boost.type[0]] == undefined) 
							boostCounter[boost.type[0]] = parseInt(boost.value)
						else
						boostCounter[boost.type[0]] += parseInt(boost.value)
					}
				})
				for (let type of Object.keys(MainParser.BoostSums)) {
					if (type.includes('guild_raids')) {
						if (boosts[type] != undefined)
							rowA.push('<td data-number="'+type+'" class="text-center">'+ HTML.Format(boosts[type]) +'</td>')
						else
							rowA.push('<td data-number="'+type+'" class="text-center">-</td>')
					}
				}
			}
			/*
			let updateGroup = groupedBuildings.find(x => x.building.name == building.name)
			if (updateGroup == undefined) {
				groupedBuildings.push({
					building: building,
					amount: 1,
					values: amount,
					boosts: boosts,
				})
			}
			else {
				updateGroup.amount++
				updateGroup.values += amount
			}*/

			rowA.push('<td data-number="'+Technologies.Eras[building.eraName]+'">' + i18n("Eras."+Technologies.Eras[building.eraName]+".short") + '</td>')
			rowA.push('<td class="text-right">')
			rowA.push('<span class="show-entity" data-id="' + building.id + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span>')
			rowA.push('</td>')
			rowA.push('</tr>')
			}
		})

		if (rowA.length > 0) {
			table.push('<table class="foe-table sortable-table TSinactive '+type+'-list active">')
			table.push('<thead style="z-index:100">')
			table.push('<tr>')
			table.push('<th colspan="12"><!--<span class="btn-default change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeGroups') + '</span>--> <input type="text" placeholder="' + i18n('Boxes.Productions.FilterTable') + '" class="filterCurrentList"></th>')
			table.push('</tr>')
			table.push('<tr class="sorter-header">')
			table.push('<th class="no-sort" data-type="prodlist'+type+'"> </th>')
			table.push('<th class="ascending" data-type="prodlist'+type+'">' + i18n('Boxes.BlueGalaxy.Building') + '</th>')
			table.push('<th class="boost qiactions is-number text-center" data-type="prodlist'+type+'"><span></span>'+(boostCounter.guild_raids_action_points_collection || 0)+'</th>')
			table.push('<th class="boost qicoins is-number text-center" data-type="prodlist'+type+'"><span></span>'+(boostCounter.guild_raids_coins_production || 0)+'%</th>')
			table.push('<th class="boost qicoins_start is-number text-center" data-type="prodlist'+type+'"><span></span>'+(boostCounter.guild_raids_coins_start || 0)+'</th>')
			table.push('<th class="boost qisupplies is-number text-center" data-type="prodlist'+type+'"><span></span>'+(boostCounter.guild_raids_supplies_production || 0)+'%</th>')
			table.push('<th class="boost qisupplies_start is-number text-center" data-type="prodlist'+type+'"><span></span>'+(boostCounter.guild_raids_supplies_start || 0)+'</th>')
			table.push('<th class="boost qigoods_start is-number text-center" data-type="prodlist'+type+'"><span></span>'+(boostCounter.guild_raids_goods_start || 0)+'</th>')
			table.push('<th class="boost qiunits_start is-number text-center" data-type="prodlist'+type+'"><span></span>'+(boostCounter.guild_raids_units_start || 0)+'</th>')
			table.push('<th data-type="prodlist'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.era') + '</th>')
			table.push('<th data-type="prodlist'+type+'" class="no-sort"> </th>')
			table.push('</tr>')
			table.push('</thead>')
			table.push('<tbody class="prodlist'+type+'">')
			table.push( rowA.join('') )
			table.push('</tbody>')
			table.push('</table>')

			//tableGr = Productions.buildGroupedTable(type, groupedBuildings, boostCounter)
		}
		else {
			table.push('<div class="empty-list">'+i18n('Boxes.Productions.EmptyList')+'</div>')
		}
		let content = table.join('') + tableGr.join('')

		return content
	},


	buildTableByType(type) {
		let table = [],
			tableGr = [],
			tableSum=[],
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
			inADay = Math.floor(Date.now() / 1000) + 86400,
			Sum = {},
			content = ''

			if (type != 'goods' && type != 'guild_raids') {
				buildingIds.forEach(b => {
					let building = CityMap.getBuildingById(b.id)
					if (building.player_id == ExtPlayerID) {
					if (type == 'items' && Productions.showBuildingItems(true, building)[0] == "" || building.chainBuilding?.type == "linked") return // makes random productions with resources and others disappear from the item list

					rowA.push('<tr>')
					rowA.push('<td>')
						rowA.push((building.state.isPolivated !== undefined ? (building.state.isPolivated ? '<span class="text-bright">★</span>' : '☆') : ''))
						if (building.setBuilding !== undefined)
						rowA.push('<img src="' + srcLinks.get('/shared/icons/' + building.setBuilding.name + '.png', true) + '" class="chain-set-ico">')
						if (building.chainBuilding !== undefined)
						rowA.push('<img src="' + srcLinks.get('/shared/icons/' + building.chainBuilding.name + '.png', true) + '" class="chain-set-ico">')
					rowA.push('</td>')
					rowA.push('<td data-text="'+helper.str.cleanup(building.name)+'"  class="' + (MainParser.Allies.buildingList?.[building.id]?"ally" : "") +'">' + building.name + '</td>')
					
					if (!type.includes('att') && !type.includes('def')) {
						if (type != 'items') {
							let productionByCategoryTrue=Productions.getBuildingProductionByCategory(true, building, type)
							let productionByCategoryFalse=Productions.getBuildingProductionByCategory(false, building, type)
							currentAmount = parseFloat(productionByCategoryTrue.amount)
							amount = parseFloat(productionByCategoryFalse.amount)
							hasRandomProductions = productionByCategoryFalse.hasRandomProductions
							let doubled = productionByCategoryFalse.doubleWhenMotivated

							if (type == 'money' && building.type != "greatbuilding" && building.type != "main_building") {
								amount = Math.round(amount + (amount * ((MainParser.BoostSums.coin_production + (Productions.HappinessBoost * 100)) / 100))) * (doubled ? 2 : 1)
								currentAmount = Math.round(currentAmount + (currentAmount * ((MainParser.BoostSums.coin_production + (Productions.HappinessBoost * 100)) / 100)))
							}
							else if (type == 'supplies' && building.type != "greatbuilding") {
								amount = Math.round(amount + (amount * ((MainParser.BoostSums.supply_production + (Productions.HappinessBoost * 100)) / 100))) * (doubled ? 2 : 1)
								currentAmount = Math.round(currentAmount + (currentAmount *((MainParser.BoostSums.supply_production + (Productions.HappinessBoost * 100)) / 100)))
							}
							else if (type == 'strategy_points' && building.type != "greatbuilding" && building.type != "main_building" && !building.entityId.includes("CastleSystem")) {
								amount = Math.round(amount + (amount *((MainParser.BoostSums.forge_points_production) / 100)))
								currentAmount = Math.round(currentAmount + (currentAmount *((MainParser.BoostSums.forge_points_production) / 100)))
							}

							rowA.push('<td data-number="'+amount+'" class="textright" colspan="4">')
							let parsedCurrentAmount = (currentAmount >= 10000 ? HTML.FormatNumberShort(currentAmount) : HTML.Format(currentAmount)) 
							let parsedAmount = (currentAmount >= 10000 ? HTML.FormatNumberShort(amount) : HTML.Format(amount)) 

							if (productionByCategoryFalse.units.length>0 || productionByCategoryTrue.units.length>0) {
								if (productionByCategoryTrue.units.length > 0) 
									rowA.push(productionByCategoryTrue.units.map(x=>`${x.amount}<span class="unit_skill ${x.type} ${x.era>CurrentEraID?"next_era":""}" title="${i18n("Boxes.Units." + x.type)}"></span> `).join(" "))
								else 
									rowA.push(" - ")
									rowA.push(" / ")

								if (productionByCategoryFalse.units.length > 0) 
									rowA.push(productionByCategoryFalse.units.map(x=>`${x.amount?x.amount:""}${x.amount && x. random ? "+":""}${x.random ? "Ø"+x.random:""}<span class="unit_skill ${x.type} ${x.era>CurrentEraID?"next_era":""}" title="${i18n("Boxes.Units." + x.type)}"></span> `).join(" "))
								else 
									rowA.push(" - ")
							} else {

								if (currentAmount < amount && building.type != 'production')
									rowA.push(parsedCurrentAmount + ' / ' + (hasRandomProductions ? 'Ø' : '') + parsedAmount)
								else {
									unitType = productionByCategoryTrue.type
									if (unitType != null){
										rowA.push('<span class="unit_skill ' + unitType.replace(/next./,"") + '" title="'+ i18n("Boxes.Units." + unitType.replace(/next./,"") ) + '"></span> ')
									}
									rowA.push(parsedCurrentAmount)
								}
							}
							rowA.push('</td>')
							
							typeSum += amount
							typeCurrentSum += currentAmount

							for (let u of productionByCategoryFalse.units) {
								if (u.type.includes("next")) {
									a=a+1
								}
								let n = (u.type !== "rogue" ? u.era : "") + u.type;
								if (Sum[n]) {
									if(!Sum[n].theory) {
										Sum[n].theory=u
									} else {
									Sum[n].theory.amount += u.amount || 0
									Sum[n].theory.random += u.random || 0	
									}
								} else {
									Sum[n] = {current:null,theory:u}
								}
							}
							for (let u of productionByCategoryTrue.units) {
								if (u.type.includes("next")) {
									a=a+1
								}
								let n = (u.type !== "rogue" ? u.era : "") + u.type;
								if (Sum[n]?.current) {
									Sum[n].current.amount += u.amount || 0
									Sum[n].current.random += u.random || 0
								} else {
									if (!Sum[n]) Sum[n] = {current:null,theory:null}
									Sum[n].current = u
								}
							}

						}
						else {
							let items=Productions.showBuildingItems(true, building)
							for (let i of items[2]) {
								let n = (i.fragment ? "Fragment" : "") + i.name.replace(/\s/g,"")
								if (Sum[n]) {
									Sum[n].amount += i.amount || 0
									Sum[n].random += i.random || 0
								} else {
									Sum[n] = i
								}
							}
								
							rowA.push('<td colspan="4" data-number="1">' + items[0] + '</td>')
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
							rowA.push('<td data-number="'+boosts.all+'" class="text-center">'+ (boosts.all != 0 ? HTML.Format(boosts.all) : '-') +'</td>')
							rowA.push('<td data-number="'+boosts.battleground+'" class="text-center">'+ (boosts.battleground != 0 ? HTML.Format(boosts.battleground) : '-') +'</td>')
							rowA.push('<td data-number="'+boosts.guild_expedition+'" class="text-center">'+ (boosts.guild_expedition != 0 ? HTML.Format(boosts.guild_expedition) : '-') +'</td>')
							rowA.push('<td data-number="'+boosts.guild_raids+'" class="text-center">'+ (boosts.guild_raids != 0 ? HTML.Format(boosts.guild_raids) : '-') +'</td>')
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

					rowA.push('<td '+((type.includes('att') || type.includes('def')) ? 'colspan="3"' : '')+' data-number="'+Technologies.Eras[building.eraName]+'">' + i18n("Eras."+Technologies.Eras[building.eraName]+".short") + '</td>')
					if (!type.includes('att') && !type.includes('def')) {
						let time = "-"
						let showRelativeProductionTime = JSON.parse(localStorage.getItem('productionsShowRelativeTime')||"false")
						let showAMPMTime = JSON.parse(localStorage.getItem('productionsShowAMPMTime')||"false")
						if (building.state.times?.at) {
							if (showRelativeProductionTime)
								time = moment.unix(building.state.times?.at).fromNow()
							else if (showAMPMTime)
								time = moment.unix(building.state.times?.at).format('LTS')
							else {
								if (building.state.times?.at <= inADay)
									time = moment.unix(building.state.times?.at).format('HH:mm:ss') 
								else
									time = moment.unix(building.state.times?.at).format('dddd, HH:mm')
							}
						}
						let done = (building.state.name == 'collectable' ? i18n('Boxes.Productions.Done') : '')
						rowA.push('<td style="white-space:nowrap" data-date="' + (building.state.times?.at||9999999999) + '">' + (done==""? time : '<b class="text-success">'+done+'</b>') + '</td>')
					}
					rowA.push('<td class="text-right">')
					rowA.push('<span class="show-entity" data-id="' + building.id + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span>')
					rowA.push('</td>')
					rowA.push('</tr>')
					}
				})
			}

			if (rowA.length > 0) {
				table.push('<table class="foe-table sortable-table TSinactive '+type+'-list active">')
				table.push('<thead style="z-index:100">')
				table.push('<tr>')
				table.push('<th colspan="3"><span class="btn-default change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeGroups') + '</span> <input type="text" placeholder="' + i18n('Boxes.Productions.FilterTable') + '" class="filterCurrentList"></th>')
				if (!type.includes('att') && !type.includes('def') && type!='items') {
					table.push('<th colspan="7" class="textright">')
					table.push((typeCurrentSum >= 10000 ? HTML.FormatNumberShort(typeCurrentSum) : HTML.Format(typeCurrentSum))+ "/" + (typeSum >= 10000 ? HTML.FormatNumberShort(typeSum) : HTML.Format(typeSum)))
					if (type == 'strategy_points')
						table.push(' · '+i18n('General.Boost')+': '+MainParser.BoostSums.forge_points_production+'%')
					table.push('</th>')
				}
				else {
					table.push('<th colspan="8" class="textright"></th>')
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
				table.push('<th data-type="prodlist'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.era') + '</th>')
				if (!type.includes('att') && !type.includes('def')) {
					table.push('<th class="is-date" data-type="prodlist'+type+'">' + i18n('Boxes.Productions.Headings.earning') + '</th>')
				}
				table.push('<th data-type="prodlist'+type+'" class="no-sort" '+((type.includes('att') || type.includes('def')) ? 'colspan="3"' : '')+'> </th>')
				table.push('</tr>')
				table.push('</thead>')
				table.push('<tbody class="prodlist'+type+'">')
				table.push( rowA.join('') )
				table.push('</tbody>')
				table.push('</table>')

				tableGr = Productions.buildGroupedTable(type, groupedBuildings, boostCounter)
				tableSum = Productions.buildSumTable(type,Sum)
			}
			else {
				table.push('<div class="empty-list">'+i18n('Boxes.Productions.EmptyList')+'</div>')
			}
			content = table.join('') + tableGr.join('') + tableSum.join('')
			if (type == 'goods')
				content = Productions.buildGoodsTable(buildingIds, type) // goods have their own table
			if (type == 'guild_raids')
				content = Productions.buildQITable(type) 

			return content
	},


	buildGoodsTable: (buildingIds, type = "goods") => {
		let table = [],
			rowB = [],
			rowA = [],
			groupedBuildings = [],
			eras = [],
			erasCurrent = {},
			erasTotal = {},
			inADay = Math.floor(Date.now() / 1000) + 86400

		// gather all different eras
		buildingIds.forEach(b => {
			let building = CityMap.getBuildingById(b.id)
			if (building.player_id == ExtPlayerID) {
				let allGoods = CityMap.getBuildingGoodsByEra(false, building)
				if (allGoods != undefined) {
					for (const [era, value] of Object.entries(allGoods.eras)) {
						if (eras.find(x => x == era) == undefined) 
							eras.push(parseInt(era))
					}
				}
			}
		})

		// sort by most advanced era first
		eras.sort((a, b) => {
			if (a < b) return -1
			if (a > b) return 1
			return 0
		}).reverse()
		
		// prepare array with total number of goods for each era
		for (const era of eras) {
			erasCurrent[era] = 0
			erasTotal[era] = 0
		}

		// single view table content
		buildingIds.forEach(b => {
			let building = CityMap.getBuildingById(b.id)
			if (building.player_id == ExtPlayerID) {

			rowA.push('<tr>')
			rowA.push('<td>')
			rowA.push((building.state.isPolivated !== undefined ? (building.state.isPolivated ? '<span class="text-bright">★</span>' : '☆') : ''))
			rowA.push('</td>')
			rowA.push('<td data-text="'+helper.str.cleanup(building.name)+'"  class="' + (MainParser.Allies.buildingList?.[building.id]?"ally" : "") +'">' + building.name + '</td>')
			
			// prepare grouped buildings
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
			
			let currentGoods = Productions.getBuildingProductionByCategory(true, building, type)
			let allGoods = Productions.getBuildingProductionByCategory(false, building, type)

			eras.forEach(era => {
				let currentGoodAmount = 0
				let goodAmount = 0
				if (allGoods != undefined) {
					erasCurrent[era] += currentGoodAmount = currentGoods?.eras?.[era] || 0
					erasTotal[era] += goodAmount = allGoods?.eras?.[era] || 0
					updateGroup[era] += goodAmount = allGoods?.eras?.[era] || 0
				}
				rowA.push('<td data-number="'+goodAmount+'" class="text-center">')
					if (currentGoodAmount != goodAmount) {
						let isAverage = (allGoods.hasRandomProduction ? "Ø" : "")
						rowA.push(HTML.Format(currentGoodAmount)+'/'+isAverage+HTML.Format(goodAmount))
					}
					else
						rowA.push(HTML.Format(goodAmount))
				rowA.push('</td>')
			})
			
			rowA.push('<td data-number="'+Technologies.Eras[building.eraName]+'">' + i18n("Eras."+Technologies.Eras[building.eraName]+".short") + '</td>')
			let time = "-"
			let showRelativeProductionTime = JSON.parse(localStorage.getItem('productionsShowRelativeTime')||"false")
			let showAMPMTime = JSON.parse(localStorage.getItem('productionsShowAMPMTime')||"false")
			if (building.state.times?.at) {
				if (showRelativeProductionTime)
					time = moment.unix(building.state.times?.at).fromNow()
				else if (showAMPMTime)
					time = moment.unix(building.state.times?.at).format('LTS')
				else {
					if (building.state.times?.at <= inADay)
						time = moment.unix(building.state.times?.at).format('HH:mm:ss') 
					else
						time = moment.unix(building.state.times?.at).format('dddd, HH:mm')
				}
			}
			let done = (building.state.name == 'collectable' ? i18n('Boxes.Productions.Done') : '')
			rowA.push('<td style="white-space:nowrap" data-date="' + (building.state.times?.at||9999999999) + '">' + (done==""? time : '<b class="text-success">'+done+'</b>') + '</td>')
			rowA.push('<td class="text-right">')
			rowA.push('<span class="show-entity" data-id="' + building.id + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span>')
			rowA.push('</td>')
			rowA.push('</tr>')
			}
		})

		// single view table
		table.push('<table class="foe-table sortable-table TSinactive '+type+'-list active">')
		table.push('<thead>')
		table.push('<tr>')
		table.push('<th colspan="6"><span class="btn-default change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeGroups') + '</span> <input type="text" placeholder="' + i18n('Boxes.Productions.FilterTable') + '" class="filterCurrentList"></th>')
		table.push('<th colspan="'+(eras.length)+'" class="textright"></th>')
		table.push('</tr>')
		table.push('<tr class="sorter-header">')
		table.push('<th class="no-sort" data-type="prodlist'+type+'"> </th>')
		table.push('<th class="ascending" data-type="prodlist'+type+'">' + i18n('Boxes.BlueGalaxy.Building') + '</th>')
		eras.forEach(era => {
			table.push('<th data-type="prodlist'+type+'" class="is-number text-center"><span data-original-title="'+i18n('Eras.'+(parseInt(era)+1))+'">' + i18n('Eras.'+(parseInt(era)+1)+'.short') + '<br><small>'+HTML.Format(erasCurrent[era])+'/'+HTML.Format(erasTotal[era])+'</small></span></th>')
		})
		table.push('<th data-type="prodlist'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.era') + '</th>')
		table.push('<th data-type="prodlist'+type+'" class="is-date">'+i18n('Boxes.Productions.Headings.earning')+'</th>')
		table.push('<th data-type="prodlist'+type+'" class="no-sort"> </th>')
		table.push('</tr>')
		table.push('</thead>')
		table.push('<tbody class="prodlist'+type+'">')
		table.push( rowA.join('') )
		table.push('</tbody>')
		table.push('</table>')


		// grouped view
		table.push('<table class="foe-table sortable-table TSinactive '+type+'-group">')
		table.push('<thead>')
		table.push('<tr>')
		table.push('<th colspan="'+(3+eras.length)+'"><span class="btn-default change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeSingle') + '</span></th>')
		table.push('</tr>')
		table.push('<tr class="sorter-header">')
		table.push('<th data-type="prodgroup'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.number') + '</th>')
		table.push('<th data-type="prodgroup'+type+'">' + i18n('Boxes.BlueGalaxy.Building') + '</th>')
		eras.forEach(era => {
			table.push('<th data-type="prodgroup'+type+'" class="is-number text-center">' + i18n('Eras.'+(parseInt(era)+1)+'.short') + '</span><br><small>'+HTML.Format(erasTotal[era])+'</small></th>')
		})
		table.push('<th data-type="prodgroup'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.size') + '</th>')
		table.push('</tr>')
		table.push('</thead>')
		table.push('<tbody class="prodgroup'+type+'">')
			groupedBuildings.forEach(building => {
				rowB.push('<tr>')
				rowB.push('<td data-number="'+building.amount+'">'+building.amount+'x </td>')
				rowB.push('<td data-text="'+building.building.name.replace(/[. -]/g,"")+'"  class="' + (MainParser.Allies.buildingList?.[building.building.id]?"ally" : "") +'">'+ building.building.name +'</td>')
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
		tableGr.push('<table class="foe-table sortable-table TSinactive '+type+'-group">')
		tableGr.push('<thead>')
		tableGr.push('<tr>')
		tableGr.push('<th colspan="7"><span class="btn-default change-view game-cursor" data-type="' + type + '">' + (type=="items" || type=="units" ?i18n('Boxes.Productions.ModeSum') : i18n('Boxes.Productions.ModeSingle')) + '</span></th>')
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
				rowB.push('<td data-text="'+building.building.name.replace(/[. -]/g,"")+'" class="' + (MainParser.Allies.buildingList?.[building.building.id]?"ally" : "") +'">'+ building.building.name +'</td>')
				if (type.includes('att') || type.includes('def')) {
					rowB.push('<td data-number="'+building.boosts.all*building.amount+'" class="text-center">'+ (building.boosts.all != 0 ? HTML.Format(building.boosts.all*building.amount) : '') +'</td>')
					rowB.push('<td data-number="'+building.boosts.battleground*building.amount+'" class="text-center">'+ (building.boosts.battleground != 0 ? HTML.Format(building.boosts.battleground*building.amount) : '') +'</td>')
					rowB.push('<td data-number="'+building.boosts.guild_expedition*building.amount+'" class="text-center">'+ (building.boosts.guild_expedition != 0 ? HTML.Format(building.boosts.guild_expedition*building.amount) : '') +'</td>')
					rowB.push('<td data-number="'+building.boosts.guild_raids*building.amount+'" class="text-center">'+ (building.boosts.guild_raids != 0 ? HTML.Format(building.boosts.guild_raids*building.amount) : '') +'</td>')
				}
				else if (type == "items") {
					rowB.push('<td colspan="4">'+Productions.showBuildingItems(false, building.building)[0]+'</td>')
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

	buildSumTable: (type,Sum) => {
		if (Object.values(Sum).length==0) return []

		let table = []
		let elements = []
		if (type=="items") {
			elements = Object.values(Sum).sort((a,b) => a.name>b.name?1:-1)
		} else { //units
			elements = Object.values(Sum).sort((b,a) => ((a.theory?.type=="rogue"?100:0)+(a.theory?.era||0))-((b.theory?.type=="rogue"?100:0)+(b.theory?.era||0)))
		}

		table.push('<table class="foe-table '+type+'-sum">')
		table.push('<thead>')
		table.push('<tr>')
		table.push('<th colspan="8"><span class="btn-default change-view game-cursor">' + i18n('Boxes.Productions.ModeSingle') + '</span></th>')
		table.push('</tr>')
		table.push('<tr >')
		table.push('<th colspan="'+(type=="items"?1:2) +'">' + i18n('Boxes.Productions.Headings.number') + '</th>')
		table.push('<th colspan="'+(type=="items"?7:6) +'" >' + (type=="items" ? i18n('Boxes.Productions.Headings.item'):i18n('Boxes.Units.Unit')) + '</th>')
		table.push('</tr>')
		table.push('</thead>')
		table.push('<tbody>')
		for (e of elements) {
			if (type=="items") {
				let amount = (e.amount ? parseFloat(Math.round(e.amount*100)/100) : "") 
							+ (e.random && e.amount ? " + " : "") 
							+ (e.random ? "Ø " + parseFloat(Math.round(e.random*100)/100) : "")
				table.push (`<tr><td class="text-right">${amount}</td><td>${(e.fragment ? "🧩 " : "" )}</td><td colspan="5">${e.name}</td></tr>`)
			} else {//units
				let currentamount = (e.current?.amount ? parseFloat(Math.round(e.current.amount*100)/100) : (e.theory?.type != "random" ? "0" :""))
							 
				let theoryamount =  (e.theory?.amount ? parseFloat(Math.round(e.theory.amount*100)/100) : "") 
							+ (e.theory?.random && e.theory?.amount ? " + " : "") 
							+ (e.theory?.random ? "Ø " + parseFloat(Math.round(e.theory.random*100)/100) : "")
				theoryamount = (currentamount !="" && theoryamount != "" ? "/ ":"") + theoryamount
				table.push (`<tr><td colspan="2">${currentamount} ${theoryamount}</td><td colspan="6"><span class="unit_skill ${(e.theory?.type||e.current.type).replace(/next./,"")}" title="${i18n("Boxes.Units." + (e.theory?.type||e.current.type).replace(/next./,"") )}"></span> <span>${(e.theory?.era===0 ||e.current?.era===0)? "" : i18n('Eras.'+(e.theory?.era||e.current?.era))}</span></td></tr>`)
			}
		}
		table.push('</tbody>')
		table.push('</table>')

		return table
	},


	getBuildingProductionByCategory(current = false, building, category) {
		let prod = {
			amount: 0,
			type: null, // units
			units:[],
			hasRandomProductions: false,
			doubleWhenMotivated: false
		}
		let productions = (current ? building.state.production : building.production)

		if (productions) {
			productions.forEach(production => {
				if (production.type == 'random') {
					production.resources.forEach(resource => {
						if (resource.type+"s" == category) { // units 
							prod.amount += resource.amount * resource.dropChance
							prod.hasRandomProductions = true
							let Uera = Technologies.Eras[building.eraName]
							Uera = Uera + (resource.name.includes("next") && Uera<Technologies.getMaxEra() ? 1 : 0)
							let Utype=resource.name
							prod.units.push({type:Utype.replace(/next./,""),amount:0,random:resource.amount * resource.dropChance,era:Utype=="rogue"?0:Uera})
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
						prod.amount += production.resources[category] //* doubleMoney
					}
				}
				if (production.type+"s" == category) { // units
					let Utype = Object.keys(production.resources)[0]
					let UAmount = production.resources[Utype]
					let Uera = Technologies.Eras[building.eraName]
					if (!current && building.type == "main_building") Utype = "random" //does not work... why???
					Uera = Uera + (Utype.includes("next") && Uera<Technologies.getMaxEra() ? 1 : 0)
					prod.amount += UAmount
					if (!current && building.type == "greatbuilding") {
						let m = Object.values(MainParser.CityMapData).filter(x=>x.type=="military")
						let RAmount = UAmount/m.length
						m.forEach (x => {
							let Rtype = MainParser.CityEntities[x.cityentity_id].available_products[0].unit_class
							if (MainParser.CityEntities[x.cityentity_id].available_products[0].unit_type_id=="rogue") Rtype="rogue"   //Banners + Drummers???
							let Rera = Technologies.Eras[MainParser.CityEntities[x.cityentity_id].requirements.min_era]
							prod.units.push({type:Rtype.replace(/next./,""),amount:0,random:RAmount,era:Rtype=="rogue"?0:Rera})
						})
					} else {
						prod.units.push({type:Utype.replace(/next./,""),amount:UAmount,random:0,era:building.type == "greatbuilding" || Utype=="rogue" ?0:Uera})
					}
					if (current == true && building.type != "main_building" && building.type != "greatbuilding")
						prod.type = Utype
					else
						prod.type = null
				}
				if (category == "clan_goods" && production.type == "guildResources") {
					if (production.resources?.all_goods_of_age)
						prod.amount = production.resources?.all_goods_of_age
					else {
						if (production.resources != undefined) {
							let good = GoodsList.find(x => x.id == Object.keys(production.resources)[0])
							if (good != undefined)
								prod.amount = production.resources[good.id]*5 // multiply found good by 5
						}
					}
				}
				if (category == "clan_power" && production.type == "guildResources") {
					if (production.resources?.clan_power)
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
		let allItems = '',
			allUnits = '',
			itemArray = []
		if ((building.state?.isPolivated == true || building.state?.isPolivated == undefined) && current === true) {
			building.state.production?.forEach(production => {
				if (production.type == "genericReward") {
					if (production.resources?.icon.includes("good")) return false
					let frag = production.resources.subType == "fragment"
					allItems += production.resources.amount + "x " + (frag ? "🧩 " : "" ) + production.resources.name + "<br>"
					itemArray.push({fragment:frag,name:production.resources.name,amount:production.resources.amount,random:0})
				}
			})
		}
		else {
			if (building.production) {
				building.production.forEach(production => {
					if (production.type == "random") {
						production.resources?.forEach(resource => {
							if (!resource.type.includes("good") && resource.type !== "resources") {
								let frag = resource.subType == "fragment"
								let amount = parseFloat(Math.round(resource.amount*resource.dropChance * 100) / 100)
								if (resource.type == "unit") {
									allUnits += "Ø " + amount + "x " + (frag ? "🧩 " : "" ) + `<img src='${srcLinks.get("/shared/icons/"+resource.name.replace(/next./,"").replace("random","random_production")+".png",true)}'>` + "<br>"
								} else {
									allItems += "Ø " + amount + "x " + (frag ? "🧩 " : "" ) + resource.name + "<br>"
									itemArray.push({fragment:frag,name:resource.name,amount:0,random:amount})
								}
							}
						})
					}
					if (production.type == "unit") {
						for (let u of Object.keys(production.resources)) {
							allUnits += production.resources[u] + "x " + `<img src='${srcLinks.get("/shared/icons/"+u.replace(/next./,"").replace("random","random_production")+".png",true)}'>` + "<br>"
						}
					} 
					if (production.resources?.type == "consumable") {
						let frag = production.resources.subType == "fragment"
						allItems += production.resources.amount + "x " + (frag ? "🧩 " : "" ) + production.resources.name + "<br>"
						itemArray.push({fragment:frag,name:production.resources.name,amount:production.resources.amount,random:0})
					}
				})
			}
		}
		return [allItems,allUnits,itemArray]
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
				hiddenTable = activeTable.next('table') 
				
			if (hiddenTable.length==0) hiddenTable = activeTable.siblings('table').first();
			
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
	ShowOnMap: (ids) => {
		let IDArray = (ids.length !== undefined ? ids : [ids]);

		if( $('#city-map-overlay').length < 1 )
			CityMap.init(null, MainParser.CityMapData);

		$('#grid-outer').removeClass('desaturate');
		$('[data-id]').removeClass('highlighted');

		setTimeout(() => {
			$('#grid-outer').addClass('desaturate');
			for (let i = 0; i < IDArray.length; i++) {
				let target = document.querySelector('.entity[data-id="' + IDArray[i] + '"]')
				if (target) {
					let targetStyle = window.getComputedStyle(document.querySelector('.entity[data-id="' + IDArray[i] + '"]'))
					let tLeft = (parseInt(targetStyle.getPropertyValue("left").replace("px","")) - 100)
					let tTop = (parseInt(targetStyle.getPropertyValue("top").replace("px","")) - 100)
					// todo: andere perspektive beachten, andere werte benutzen?

					if (i === 0) $('#map-container').scrollTo({left: tLeft, top: tTop}, 800, { easing: 'swing' });
					target.classList.add('highlighted');
				}
            }
		}, 500);
	},


	ShowSearchOnMap: (name) => {
		if( $('#city-map-overlay').length < 1 )
			CityMap.init(null, MainParser.CityMapData);

		$('#grid-outer').removeClass('desaturate');

		setTimeout(() => {
			CityMap.filterBuildings(name)
			$('#BuildingsFilter').attr('value',name)
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


	ShowRating: (external = false) => {
		if (CityMap.IsExtern && !external) return
		
		if ($('#ProductionsRating').length === 0) {
			
			Productions.BuildingsAll = Object.values(CityMap.createNewCityMapEntities())
			Productions.setChainsAndSets(Productions.BuildingsAll)

			let Rating = localStorage.getItem('ProductionRatingEnableds2');
			if (Rating !== null) Productions.Rating = JSON.parse(Rating)

			let RatingProdPerTiles = localStorage.getItem('ProductionRatingProdPerTiles');
			if (RatingProdPerTiles !== null) Productions.RatingProdPerTiles = JSON.parse(RatingProdPerTiles);

			for (let type of Productions.RatingTypes) {
				if (Productions.Rating[type] === undefined) Productions.Rating[type] = true
				if (Productions.RatingProdPerTiles[type] === undefined) Productions.RatingProdPerTiles[type] = Productions.GetDefaultProdPerTile(type)
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

		} else {
			HTML.CloseOpenBox('ProductionsRating');
		}

		Productions.CalcRatingBody();
	},

	//AdditionalBuildings:[],
	AdditionalSpecialBuildings:null,

	CalcRatingBody: () => {
		if (!Productions.AdditionalSpecialBuildings) {
			let spB = Object.values(MainParser.CityEntities).filter(x=> (x.is_special && !["O_","U_","V_","H_","Y_"].includes(x.id.substring(0,2))) || x.id.substring(0,11)=="W_MultiAge_")
			Productions.AdditionalSpecialBuildings = {}
			for (x of spB) {
				Productions.AdditionalSpecialBuildings[x.id] = {id:x.id,name:x.name,selected:false}
			}
		}
		let h = [];

		if (Productions.RatingCurrentTab === 'Settings') {
			h.push('<div id="ProductionsRatingSettings">')
			h.push('<a id="RatingsResults" class="toggle-tab btn-default btn-tight" data-value="Results"><span>' + i18n('Boxes.ProductionsRating.Results') + '</span></a>')
			h.push('<ul class="foe-table">')

			h.push('<li class="dark-bg">')
			h.push('<span>' + i18n('Boxes.ProductionsRating.Enabled') + '</span>')
			h.push('<span></span><span></span>')
			h.push('<span class="text-right">' + i18n('Boxes.ProductionsRating.ProdPerTile') + '</span>')
			h.push('</li>')

			for (let type of Productions.RatingTypes) {
				h.push('<li class="'+type+'">')
				let activeSetting = (Productions.RatingProdPerTiles[type] != null && Productions.Rating[type] != false)
				h.push('<input id="Enabled-' + type + '" class="no-grow enabled game-cursor" ' + (activeSetting ? 'checked' : '') + ' type="checkbox">')
				h.push('<span class="no-grow resicon ' + type + '"></span>')
				h.push('<label for="Enabled-'+type+'">' + Productions.GetTypeName(type) + '</label>')
				if (Productions.RatingProdPerTiles[type] != null) {
					h.push('<input type="number" id="ProdPerTile-' + type + '" step="0.01" min="0" max="1000000" class="no-grow '+(Productions.Rating[type] ? '': 'hidden')+'" value="' + Productions.RatingProdPerTiles[type] + '">')
				}
				else {
					h.push('<input type="number" class="hidden no-grow" id="ProdPerTile-' + type + '" step="0.01" min="0" max="1000000" value="0">')
				}
				h.push('</li>')
			}
			h.push('<li><a class="toggle-tab btn-default" data-value="Results"><span>' + i18n('Boxes.ProductionsRating.Results') + '</span></a></li>')
			h.push('</ul>')
			h.push('<p>'+i18n('Boxes.ProductionsRating.Explainer')+'</p>')
			h.push('<p>'+i18n('Boxes.ProductionsRating.Disclaimer')+'</p>')
			h.push('</div>')
		}

		else if (Productions.RatingCurrentTab === 'Results') {
			let buildingCount={}
			let uniqueBuildings = []
			// todo: shrine of inspiration etc
			// get one of each building, only highest available era
			for (const building of Productions.BuildingsAll) {
				if (building == undefined || building.type == 'street' || building.type == 'military' || building.id >= 2000000000 || building.type.includes('hub')) continue

				let compare = building.name
				if (MainParser.Allies.buildingList?.[building.id]) {
					compare += "+" + Object.keys(MainParser.Allies.buildingList?.[building.id]).join("+")
				}
				let foundBuildingIndex = uniqueBuildings.findIndex(x => x.name == compare && !MainParser.Allies.buildingList?.[x.id])
				if (foundBuildingIndex == -1) {
					uniqueBuildings.push(building)
					delete Productions.AdditionalSpecialBuildings[building.entityId]
				} else {
					let foundBuilding = uniqueBuildings.find(x => x.name == building.name)
					if (buildingCount[building.entityId]) 
						buildingCount[building.entityId] += 1
					else
						buildingCount[building.entityId] = 2
					if (Technologies.InnoEras[foundBuilding.eraName] < Technologies.InnoEras[building.eraName]) 
						uniqueBuildings[foundBuildingIndex] = building
				}
			}

			let selectedAdditionals = Object.values(Productions.AdditionalSpecialBuildings).filter(x=>x.selected).map(x=>x.id);
			
			ratedBuildings = Productions.rateBuildings(uniqueBuildings).concat(Productions.rateBuildings(selectedAdditionals,true)) 
			
			ratedBuildings.sort((a, b) => {
				if (a.score < b.score) return -1
				if (a.score > b.score) return 1
				return 0
			})

			let colNumber = 0
			for (let i = 0; i < Productions.RatingTypes.length; i++) {
				let type = Productions.RatingTypes[i];
				if (!Productions.Rating[type]) continue;
				colNumber++
			}
			
			h.push('<div class="ratingtable">');
			h.push('<a id="RatingSettings" class="toggle-tab btn-default btn-tight" data-value="Settings">' + i18n('Boxes.ProductionsRating.Settings') + '</a>')
			h.push('<table class="foe-table sortable-table TSinactive">');
			h.push('<thead>');
			
			h.push('<tr class="settings">')
				h.push('<th colspan="'+(colNumber+4)+'">')
				h.push('<input type="checkbox" id="tilevalues"><label for="tilevalues">' + i18n('Boxes.ProductionsRating.ShowValuesPerTile') + '</label>')
				h.push('<input type="checkbox" id="showitems"><label for="showitems">' + i18n('Boxes.ProductionsRating.ShowItems') + '</label>')
				h.push('<input type="checkbox" id="showhighlighted"><label for="showhighlighted">' + i18n('Boxes.ProductionsRating.ShowHighlighted') + '</label>')
				h.push('<label for="efficiencyBuildingFilter">' + i18n('Boxes.ProductionsRating.Filter') + ": " + '<input type="text" id="efficiencyBuildingFilter" size=20 placeholder="neo|eden"></label>')
				h.push('<a class="btn-default" id="addMetaBuilding">' + i18n('Boxes.ProductionsRating.AddBuilding') + '</a>')
				h.push('</th>');
			h.push('</tr>');
			h.push('<tr class="sorter-header">');
			h.push('<th data-type="ratinglist" class="is-number ascending">' + i18n('Boxes.ProductionsRating.Score') + '</th>');
			h.push('<th data-type="ratinglist">' + i18n('Boxes.ProductionsRating.BuildingName') + '</th><th class="no-sort"></th>');
			let tileRatings = JSON.parse(localStorage.getItem('ProductionRatingProdPerTiles'))
			for (const type of Productions.RatingTypes) {
				if (!Productions.Rating[type] || Productions.RatingProdPerTiles[type] == null) continue
				h.push('<th data-type="ratinglist" style="width:1%" class="is-number text-center buildingvalue"><span class="resicon ' + type + '"></span><i>'+(tileRatings?.[type] !== undefined ? parseFloat(tileRatings[type]) : Productions.GetDefaultProdPerTile(type))+'</i></th>');
				h.push('<th data-type="ratinglist" style="width:1%" class="is-number text-center tilevalue"><span class="resicon ' + type + '"></span><i>'+(tileRatings?.[type] !== undefined ? parseFloat(tileRatings[type]) : Productions.GetDefaultProdPerTile(type))+'</i></th>');
			}
			h.push('<th data-type="ratinglist" class="no-sort items">Items</th>');
			h.push('</tr>');
			h.push('<thead>');

			h.push('<tbody class="ratinglist">');
			for (const building of ratedBuildings) {
				[randomItems,randomUnits]=Productions.showBuildingItems(false, building.building)
				h.push(`<tr ${building.highlight?'class="additional"':""}>`)
				h.push('<td class="text-right" data-number="'+building.score * 100 +'">'+Math.round(building.score * 100)+'</td>')
				h.push('<td data-text="'+helper.str.cleanup(building.building.name)+'" '+ MainParser.Allies.tooltip(building.building.id) + ' class="' + (MainParser.Allies.buildingList?.[building.building.id]?"ally" : "") +'">'+building.building.name)
				let eraShortName = i18n("Eras."+Technologies.Eras[building.building.eraName]+".short")
				if (eraShortName != "-")
					h.push(" ("+i18n("Eras."+Technologies.Eras[building.building.eraName]+".short") +')')
				h.push('</td><td class="text-right">')
				if (buildingCount[building.building.entityId]) h.push('<span data-original-title="'+i18n('Boxes.ProductionsRating.CountTooltip')+'">' + buildingCount[building.building.entityId]+'x</span>')
					if (!building.highlight) h.push(' <span class="show-all" data-name="'+building.building.name+'"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span>')
				h.push('</td>')
				for (const type of Productions.RatingTypes) {
					if (building[type] != undefined) {
						h.push(`<td class="text-right${type=="units" ? " units":""} buildingvalue" data-number="${Math.round(building[type])}" ${type=="units" ? `data-original-title="${randomUnits}"`:""}>`)
						h.push(HTML.Format(building[type]))
						h.push('</td>')

						let roundingFactor = building[type+'-tile'] > 100 || building[type+'-tile'] < -100 ? 1 : 100
						let tileValue = Math.round(building[type+'-tile'] * roundingFactor) / roundingFactor
						h.push(`<td class="text-right${type=="units" ? " units":""} tilevalue" data-number="${tileValue}" ${type=="units" ? `data-original-title="${randomUnits}"`:""}>`)
						h.push(HTML.Format(tileValue))
						h.push('</td>')
					}
				}
				h.push('<td class="no-sort items">'+randomItems+'</td>')
				h.push('</tr>')
			}
			h.push('</tbody>');
			h.push('<tfoot><tr class="highlighted-explained"><td colspan="'+(colNumber+3)+'">'+i18n('Boxes.ProductionsRating.HighlightsExplained')+'</td></tr></tfoot>');
			h.push('</table>');
				h.push('<div class="overlay"><a class="window-close closeMetaBuilding"></a>')
					h.push('<div class="content">')
						h.push('<input id="findMetaBuilding" placeholder="'+i18n('Boxes.ProductionsRating.FindSpecialBuilding')+'" value="">')
						h.push('<ul class="results"></ul>')
						h.push('<a class="btn-default closeMetaBuilding btn-green">'+i18n('Boxes.ProductionsRating.AddBuildings')+'</a>')
					h.push('</div>')
				h.push('</div>')
			h.push('</div>')
		}
		else {
			h.push('Something went wrong');
        }
		
		$('#ProductionsRatingBody').html(h.join('')).promise().done(function () {
			$('.TSinactive').tableSorter()					
			$('.TSinactive').removeClass('TSinactive')					
					
			$('#tilevalues, label[tilevalues]').on('click', function () {
				$("#ProductionsRatingBody .buildingvalue").toggle();
				$("#ProductionsRatingBody .tilevalue").toggle();
			});

			$('#showitems, label[showitems]').on('click', function () {
				$("#ProductionsRatingBody table .items").toggle();
			});

			$('#showhighlighted, label[showhighlighted]').on('click', function () {
				$("#ProductionsRatingBody tbody").toggleClass('only-highlighted');
			});

			$('.show-all').on('click', function () {
				Productions.ShowSearchOnMap($(this).attr('data-name'))
			});

			$('.ratinglist tr').on('click', function () {
				$(this).toggleClass('highlighted')
			});

			$('#addMetaBuilding').on('click',function (){
				$('#ProductionsRatingBody .overlay').show()
			})

			$('.closeMetaBuilding').on('click',function () {
				$(this).parent('.overlay').hide()
				
				marked=[]
				$(".ratingtable .highlighted td:nth-child(2)").each((x,el)=>{
					marked.push(el.dataset.text)
				})
				tilevalues=$('#tilevalues').is(':checked')
				showitems=$('#showitems').is(':checked')
				showhighlighted=$('#showhighlighted').is(':checked')
				search=new RegExp($('#efficiencyBuildingFilter').val(),"i")
				Productions.CalcRatingBody()
				setTimeout(()=>{
					$(".ratingtable td:nth-child(2)").each((x,el)=>{
						if (marked.includes(el.dataset.text)) {
							el.parentElement.classList.add("highlighted")
						}
					})
					$('#efficiencyBuildingFilter').val(search.source=="(?:)"?"":search.source)
					$('#efficiencyBuildingFilter').trigger("input")
					if (tilevalues) $('#tilevalues').trigger("click")					
					if (showitems) $('#showitems').trigger("click")					
					if (showhighlighted) $('#showhighlighted').trigger("click")										
				},500)
			})

			$('#findMetaBuilding').on('input', function () {
				let regEx=new RegExp($(this).val(),"i");
				filterMeta(regEx)
			});
			let filterMeta = (regEx) => {
				$('#ProductionsRatingBody .overlay .results').html("")
				let foundBuildings = Object.values(Productions.AdditionalSpecialBuildings).filter(x => regEx.test(x.name) && x.selected).sort((a,b)=>(a.name>b.name?1:-1))
				for (building of foundBuildings) {
					$('#ProductionsRatingBody .overlay .results').append(`<li data-meta_id="${building.id}" class="selected helperTT" data-callback_tt="Tooltips.buildingTT">${building.name}</li>`)
				}
				foundBuildings = Object.values(Productions.AdditionalSpecialBuildings).filter(x => regEx.test(x.name) && !x.selected).sort((a,b)=>(a.name>b.name?1:-1))
				for (building of foundBuildings) {
					$('#ProductionsRatingBody .overlay .results').append(`<li data-meta_id="${building.id}" class="helperTT" data-callback_tt="Tooltips.buildingTT">${building.name}</li>`)
				}
			}
			filterMeta(/./)
			$('#ProductionsRatingBody .overlay .results').on("click","li",(e)=>{
				let id = e.target.dataset.meta_id
				Productions.AdditionalSpecialBuildings[id].selected =!Productions.AdditionalSpecialBuildings[id].selected
				e.target.classList.toggle("selected")
			})
			$('#ProductionsRatingSettings input[type=checkbox]').on('click', function () {
				let elem = $(this)
				let isChecked = elem.prop('checked')
				let type = elem.attr('id').replace('Enabled-','')

				elem.parent().children('input[type=number]').toggleClass('hidden')

				Productions.Rating[type] = isChecked
				localStorage.setItem('ProductionRatingEnableds2', JSON.stringify(Productions.Rating))
				if (isChecked) {
					Productions.RatingProdPerTiles[type] = parseFloat(elem.parent().children('input[type=number]').val())
					if (isNaN(Productions.RatingProdPerTiles[type])) Productions.RatingProdPerTiles[type] = 0
	
					localStorage.setItem('ProductionRatingProdPerTiles', JSON.stringify(Productions.RatingProdPerTiles))
				}
			})

			$('#ProductionsRating input[type=number]').on('blur', function () {
				let elem = $(this)
				let type = elem.attr('id').replace('ProdPerTile-','')

				Productions.RatingProdPerTiles[type] = parseFloat(elem.val())
				if (isNaN(Productions.RatingProdPerTiles[type])) Productions.RatingProdPerTiles[type] = 0

				localStorage.setItem('ProductionRatingProdPerTiles', JSON.stringify(Productions.RatingProdPerTiles))

				Productions.CalcRatingBody()
			});
			
			$('#efficiencyBuildingFilter').on('input', e => {
				let filter=$('#efficiencyBuildingFilter').val();
				let regEx=new RegExp(filter,"i");
				$('.ratinglist tr td:nth-child(2)').each((x,y) => {
					if (filter!="" && regEx.test($(y).text())) {
						y.parentElement.classList.add('highlighted2')
					} else {
						y.parentElement.classList.remove('highlighted2')
					}
				});
			});
			$('#ProductionsRatingBody [data-original-title]').tooltip({container: "#game_body", html:true});
		});	
		
    },


	rateBuildings: (buildingType,additional=false) => {
		let ratedBuildings = []
		let tileRatings = JSON.parse(localStorage.getItem('ProductionRatingProdPerTiles'))
		if (additional) {
			buildingType = buildingType.map(x=>CityMap.createNewCityMapEntity(x))
		}
		for (const building of buildingType) {
			if (building.entityId.includes("L_AllAge_EasterBonus1") || building.entityId.includes("L_AllAge_Expedition16") || building.entityId.includes("L_AllAge_ShahBonus17") || (building.isSpecial == undefined && building.type != "greatbuilding")) continue // do not include wishingwell type buildings
			let size = building.size.width * building.size.length
			size += ((building.size.width == 1 || building.size.length == 1) ? building.needsStreet * 0.5 : building.needsStreet)
			let score = 0
			let ratedBuilding = {
				building: building
			}
			for (const type of Object.keys(Productions.Rating)) {
				if (Productions.Rating[type] != false) {
					let desiredValuePerTile = ((tileRatings != null && tileRatings != undefined) ? parseFloat(tileRatings[type]) : Productions.GetDefaultProdPerTile(type))
					if (desiredValuePerTile !== null && !isNaN(desiredValuePerTile)) {
						let typeValue = Productions.getRatingValueForType(building, type) || 0 // production amount
						let valuePerTile = typeValue / size

						if (valuePerTile != 0 && desiredValuePerTile != 0) 
							score += (valuePerTile / desiredValuePerTile)

						ratedBuilding[type] = ( Math.round( typeValue * 100 ) / 100 ) || 0
						ratedBuilding[type+'-tile'] = valuePerTile || 0
					}
				}
			}
			ratedBuilding.score = score
			if (additional) ratedBuilding.highlight = true
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
			if (building.boosts != undefined) {
				let bsum=0
				for (const boost of building.boosts) {
					let feature = type.split('-')[1]
					let bType = boost.type.find(x => x == type.split('-')[0])
					if (bType !== undefined && feature == boost.feature) {
						bsum+=boost.value		
					}
				}
				return bsum
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
					// todo: bronzezeit checken
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
		if (Type === 'strategy_points') return 5
		if (Type === 'money') return null
		if (Type === 'supplies') return null
		if (Type === 'medals') return null
		if (Type === 'clan_power') return null
		if (Type === 'clan_goods') return 10
		if (Type === 'population') return null
		if (Type === 'happiness') return null
		if (Type === 'units') return 1
		if (Type === 'att_boost_attacker-all') return 3 
		if (Type === 'att_boost_attacker-guild_expedition') return null
		if (Type === 'att_boost_attacker-battleground') return 3 
		if (Type === 'att_boost_attacker-guild_raids') return null
		if (Type === 'def_boost_attacker-all') return 3
		if (Type === 'def_boost_attacker-guild_expedition') return null
		if (Type === 'def_boost_attacker-battleground') return 3 
		if (Type === 'def_boost_attacker-guild_raids') return null
		if (Type === 'att_boost_defender-all') return 2
		if (Type === 'att_boost_defender-guild_expedition') return null
		if (Type === 'att_boost_defender-battleground') return null
		if (Type === 'att_boost_defender-guild_raids') return null
		if (Type === 'def_boost_defender-all') return 2
		if (Type === 'def_boost_defender-guild_expedition') return null
		if (Type === 'def_boost_defender-battleground') return null
		if (Type === 'def_boost_defender-guild_raids') return null
		if (Type === 'goods-previous') return 4
		if (Type === 'goods-current') return 5
		if (Type === 'goods-next') return null
		else return 0
	},

	

    /**
    *
    */
	ShowSettings: () => {
        let showRelativeProductionTime = JSON.parse(localStorage.getItem('productionsShowRelativeTime')||"false")
        let showAMPMTime = JSON.parse(localStorage.getItem('productionsShowAMPMTime')||"false")
        let show24Time = (showAMPMTime == false && showRelativeProductionTime == false) ? true : false

        let h = []
        h.push(`<p><input id="productionsShowRelativeTime" name="productionTime" value="1" type="radio" ${(showRelativeProductionTime === true) ? ' checked="checked"' : ''} /> <label for="productionsShowRelativeTime">${i18n('Boxes.Productions.RelativeTime')}</label><br>`)
        h.push(`<input id="productionsShowAMPMTime" name="productionTime" value="1" type="radio" ${(showAMPMTime === true) ? ' checked="checked"' : ''} /> <label for="productionsShowAMPMTime">${i18n('Boxes.Productions.AMPMTime')}</label><br>`)
        h.push(`<input id="productionsShow24Time" name="productionTime" value="1" type="radio" ${(show24Time === true) ? ' checked="checked"' : ''} /> <label for="productionsShow24Time">${i18n('Boxes.Productions.Time24')}</label></p>`)
		h.push(`<p><button onclick="Productions.SaveSettings()" id="save-productions-settings" class="btn btn-default" style="width:100%">${i18n('Boxes.Settings.Save')}</button></p>`)

        $('#ProductionsSettingsBox').html(h.join(''))
    },


    /**
    *
    */
    SaveSettings: () => {
        let showRelativeProductionTime = false
		if ($("#productionsShowRelativeTime").is(':checked')) showRelativeProductionTime = true
		localStorage.setItem('productionsShowRelativeTime', showRelativeProductionTime)

        let showAMPMTime = false
		if ($("#productionsShowAMPMTime").is(':checked')) showAMPMTime = true
		localStorage.setItem('productionsShowAMPMTime', showAMPMTime)

		if ($("#productionsShow24Time").is(':checked')) {
			localStorage.setItem('productionsShowAMPMTime', false)
			localStorage.setItem('productionsShowRelativeTime', false)
		}

		Productions.CalcBody()
		
		$(`#ProductionsSettingsBox`).remove()
    },
};
