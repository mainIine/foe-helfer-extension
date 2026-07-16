/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
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
		'strategy_points',			// Forge Points
		'forge_points_production', 	// FP Boost
		'goods',					// Regular goods
		'special_goods', 			// *special* goods
		'items',					// Fragments, blueprints, boosts etc
		'money',					// Coins
		'coin_production', 			// Coin Boost
		'supplies',
		'supply_production', 		// Supply Boost
		'medals',
		'premium',					// Diamonds
		'population',
		'happiness',
		'units',
		'att_boost_attacker',
		'def_boost_attacker',
		'att_boost_defender',
		'def_boost_defender',
		'clan_goods',
		'guild_raids'
	],
	FSPqualifiedResources: ["strategy_points","clan_goods","goods-previous","goods-current","goods-next"],

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
		'off_grid',
		'generic_building'
	],


	fragmentsSet: new Set(),


	/**
	 * Initializes the Productions module, sets up building data, and reads productions.
	 */
	init: () => {
		if (ActiveMap === 'OtherPlayer') return

		MainParser.CityBuildingsData = CityBuildings.createBuildings(Object.values(MainParser.CityMapData))
		Productions.CombinedCityMapData = MainParser.CityBuildingsData

		if (CityMap.EraOutpost.data) {
			Productions.CombinedCityMapData = Object.assign({}, Productions.CombinedCityMapData, CityMap.EraOutpost.data)
		}

		// Create empty arrays
		for(let i in Productions.Types) {
			if (!Productions.Types.hasOwnProperty(i)) {
				continue
			}

			Productions.BuildingsProducts[Productions.Types[i]] = []
			if (Productions.Types[i] === 'goods') {
				continue
			}
			Productions.BuildingsProductsGroups[ Productions.Types[i] ] = []
		}

		Productions.ReadData()
	},

	
	/**
	 * Processes city building data, calculates population and happiness sums, and shows the production box.
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
	 * Displays the main production overview box.
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
			popout: 'MainParser.PopOut(\'Productions\', 1100, 580)',
        	settings: 'Productions.ShowSettings()'
		});

		Productions.ActiveTab = 1;
		Productions.CalcBody();

		Productions.SwitchFunction()
	},

	
	/**
	 * Calculates and generates the content for the production overview box, including tabs and tables.
	 */
	CalcBody: () => {
		Productions.Tabs = [];
		Productions.TabsContent = [];

		let h = [];

		h.push('<div class="production-tabs tabs">');

		Productions.BuildingsAll.forEach(building => {
			let boosts = Object.keys(Boosts.Sums)
			let saveBuilding = {id: building.id, entityId: building.entityId}

			boosts.forEach(boost => {
				Productions.getBoost(building, boost, function(result) { 
					if (result !== undefined) {
						if (Productions.BuildingsProducts[boost]) {
							if (Productions.BuildingsProducts[boost].find(x => x.id === building.id) === undefined)
								Productions.BuildingsProducts[boost].push(saveBuilding)
						}
						if (boost.includes('guild_raids')) {
							if (Productions.BuildingsProducts.guild_raids.find(x => x.id === building.id) === undefined)
								Productions.BuildingsProducts.guild_raids.push(saveBuilding)
						}
					}
				})
			})

			if (building.production) {
				building.production.forEach(production => {
					if (production.type === "guildResources") {
						if (Productions.BuildingsProducts.clan_goods.find(x => x.id === building.id) === undefined)
							Productions.BuildingsProducts["clan_goods"].push(saveBuilding)
					}
					if (production.type === "unit") { 
						if (Productions.BuildingsProducts.units.find(x => x.id === building.id) === undefined)
							Productions.BuildingsProducts["units"].push(saveBuilding)
					}
					if (production.type === "random") {
						production.resources.forEach(resource => {
							if (resource.type === "unit") {
								if (Productions.BuildingsProducts.units.find(x => x.id === building.id) === undefined)
									Productions.BuildingsProducts["units"].push(saveBuilding)
							}
							if (resource.type === "forgepoint_package" || resource.subType === "forgepoint_package") { // e.g. grilling grove
								if (Productions.BuildingsProducts.strategy_points.find(x => x.id === building.id) === undefined)
									Productions.BuildingsProducts["strategy_points"].push(saveBuilding)
							}
							if (resource.type === "consumable" || resource.type.includes("chest")) {
								if (Productions.BuildingsProducts.items.find(x => x.id === building.id) === undefined)
									Productions.BuildingsProducts["items"].push(saveBuilding)
							}
							if (resource.type === "resources" && resource.subType === "strategy_points") {
								if (Productions.BuildingsProducts.strategy_points.find(x => x.id === building.id) === undefined)
									Productions.BuildingsProducts["strategy_points"].push(saveBuilding)
							}
							if (resource.type === "resources" && resource.subType === "money") {
								if (Productions.BuildingsProducts.money.find(x => x.id === building.id) === undefined)
									Productions.BuildingsProducts["money"].push(saveBuilding)
							}
							if (resource.type === "resources" && resource.subType === "supplies") {
								if (Productions.BuildingsProducts.supplies.find(x => x.id === building.id) === undefined)
									Productions.BuildingsProducts["supplies"].push(saveBuilding)
							}
							if (resource.type === "resources" && resource.subType === "medals") { 
								if (Productions.BuildingsProducts.medals.find(x => x.id === building.id) === undefined)
									Productions.BuildingsProducts["medals"].push(saveBuilding)
							}
							if (resource.type.includes("good") && !resource.type.includes("guild")) {
								if (Productions.BuildingsProducts.goods.find(x => x.id === building.id) === undefined)
									Productions.BuildingsProducts["goods"].push(saveBuilding)
							}
							if (resource.type.includes("good") && resource.type.includes("guild")) {
								if (Productions.BuildingsProducts.clan_goods.find(x => x.id === building.id) === undefined)
									Productions.BuildingsProducts.clan_goods.push(saveBuilding)
							}
						})
					}
					if (production.type === 'special_goods') {
						if (Productions.BuildingsProducts.special_goods.find(x => x.id === building.id) === undefined) {
							Productions.BuildingsProducts["special_goods"].push(saveBuilding)}
					}
					if (production.type === "resources") {
						let types = Object.keys(production.resources)
						if (production.resources.money) { 
							if (Productions.BuildingsProducts.money.find(x => x.id === building.id) === undefined)
								Productions.BuildingsProducts["money"].push(saveBuilding)
						}
						if (production.resources.supplies) { 
							if (Productions.BuildingsProducts.supplies.find(x => x.id === building.id) === undefined)
								Productions.BuildingsProducts["supplies"].push(saveBuilding)
						}
						if (production.resources.medals) { 
							if (Productions.BuildingsProducts.medals.find(x => x.id === building.id) === undefined)
								Productions.BuildingsProducts["medals"].push(saveBuilding)
						}
						if (production.resources.premium) { 
							Productions.BuildingsProducts["premium"].push(saveBuilding)
						}
						if (production.resources.strategy_points) { 
							if (Productions.BuildingsProducts.strategy_points.find(x => x.id === building.id) === undefined)
								Productions.BuildingsProducts["strategy_points"].push(saveBuilding)
						}
						if (types.find(x => x.includes('random_good_of_') || x.includes('all_goods_of_'))) {
							if (Productions.BuildingsProducts.goods.find(x => x.id === building.id) === undefined)
								Productions.BuildingsProducts["goods"].push(saveBuilding)
						}
					}
					if (production.resources?.type === "consumable") {
						if (Productions.BuildingsProducts.items.find(x => x.id === building.id) === undefined)
							Productions.BuildingsProducts["items"].push(saveBuilding)
					}
				})
			}
			if (building.state.production) {
				building.state.production.forEach(production => {
					if (production.type === "guildResources") {
						if (Productions.BuildingsProducts.clan_goods.find(x => x.id === building.id) === undefined)
							Productions.BuildingsProducts.clan_goods.push(saveBuilding)
					}
					if (production.type === "unit") { 
						if (Productions.BuildingsProducts.units.find(x => x.id === building.id) === undefined)
							Productions.BuildingsProducts.units.push(saveBuilding)
					}
					if (production.type === "genericReward") {
						if (Productions.BuildingsProducts.items.find(x => x.id === building.id) === undefined) {
							Productions.BuildingsProducts.items.push(saveBuilding)
						}
					}
					if (production.type === "resources") {
						if (production.resources.money) { 
							if (Productions.BuildingsProducts.money.find(x => x.id === building.id) === undefined)
							Productions.BuildingsProducts.money.push(saveBuilding)
						}
						if (production.resources.supplies) { 
							if (Productions.BuildingsProducts.supplies.find(x => x.id === building.id) === undefined)
							Productions.BuildingsProducts.supplies.push(saveBuilding)
						}
						if (production.resources.medals) { 
							if (Productions.BuildingsProducts.medals.find(x => x.id === building.id) === undefined)
							Productions.BuildingsProducts.medals.push(saveBuilding)
						}
						if (production.resources.premium) { 
							if (Productions.BuildingsProducts.premium.find(x => x.id === building.id) === undefined)
							Productions.BuildingsProducts.premium.push(saveBuilding)
						}
						if (production.resources.strategy_points) { 
							if (Productions.BuildingsProducts.strategy_points.find(x => x.id === building.id) === undefined)
							Productions.BuildingsProducts.strategy_points.push(saveBuilding)
						}
						Object.keys(production.resources).forEach(name => {
							let good = GoodsList.find(x => x.id === name)
							if (good !== undefined) {
								if (Productions.BuildingsProducts.goods.find(x => x.id === building.id) === undefined)
									Productions.BuildingsProducts["goods"].push(saveBuilding)
							}
						})
					}
					if (production.resources?.icon === "next_age_goods") {
						if (Productions.BuildingsProducts.goods.find(x => x.id === building.id) === undefined)
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
			$('.production-tabs li, #Productions .typeBoost').click(function() {
				let type = $("a", this).attr("href").replace("#","")

				if ($("#Productions #"+type).html().length === 0) {
					let content = Productions.buildTableByType(type)
					$("#Productions #"+type).html(content).promise().done(() => {

						$('#Productions .typeBoost').click(function(e) {
							e.preventDefault()
							let type = $("a", this).attr("href").replace("#","")

							if ($("#Productions #"+type).html().length === 0) {
								let content = Productions.buildTableByType(type)
								$("#Productions #"+type).html(content)
								$('.TSinactive').tableSorter()
								$('.TSinactive').removeClass('TSinactive')
								HTML.FilterTable('#Productions .filterCurrentList')
							}
							$("#Productions .content").css('display','none')
							$("#Productions #"+type).css('display','block')
						});

					})
					$('.TSinactive').tableSorter()
					$('.TSinactive').removeClass('TSinactive')
					HTML.FilterTable('#Productions .filterCurrentList')

					//$('#Productions [data-original-title]').tooltip({container: "#Productions", html:true});
				}
				$("#Productions .content").css('display','none')
				$("#Productions #"+type).css('display','block')
			});

			// extra functionality
			$('.production-tabs').tabslet({ active: Productions.ActiveTab })
			$('.TSinactive').tableSorter()					
			$('.TSinactive').removeClass('TSinactive')					
			HTML.FilterTable('#Productions .filterCurrentList')

			// show a building on the map
			$('#Productions').on('click', '.foe-table .show-entity', function () {
				Productions.ShowOnMap($(this).data('id'));
			});
		});
	},


	/**
	 * Calculates and updates set and chain bonuses for buildings.
	 * Identifies adjacent set buildings and processes chained building links.
	 *
	 * @param {Array} [buildings] - Optional array of buildings to process. Defaults to all city buildings.
	 */
	setChainsAndSets(buildings) {
		if (buildings === undefined) buildings = Object.values(MainParser.CityBuildingsData)
		let idsToRemove = [];

		for (const building of buildings) {
			if (building?.setBuilding !== undefined) {
				let adjacentIds = CityBuildings.findAdjacentSetBuildingByCoords(building);
				let uniqueAdjacentEntities = new Set();
				for (let id of adjacentIds) {
					let adjB = CityBuildings.getBuildingById(id);
					if (adjB) uniqueAdjacentEntities.add(adjB.entityId);
				}
				building.setBuilding.uniqueAdjacentCount = uniqueAdjacentEntities.size;
			} 
			else if (building?.chainBuilding !== undefined && building?.chainBuilding?.type === "start") {

				let linkedBuildings = CityBuildings.hasLinks(building);
				if (linkedBuildings.length > 1) {
					CityBuildings.createChainedBuilding(linkedBuildings);

					for (const link of linkedBuildings) {
						if (link.chainBuilding.type === 'linked') {
							idsToRemove.push(link.id);
						}
					}
				}
			}
		}

		if (idsToRemove.length > 0) {
			Productions.BuildingsAll = Productions.BuildingsAll.filter(b => !idsToRemove.includes(b.id));
		}
	},

	


	/**
	 * Calculates production values for a building based on the specified category.
	 *
	 * @param {boolean} [current=false] - If true, calculates based on current production state; otherwise, base production.
	 * @param {Object} building - The building object to analyze.
	 * @param {string} category - The production category (e.g., "strategy_points", "clan_goods", "units").
	 * @returns {Object} An object containing production amount, type, and unit details.
	 */
	getBuildingProductionByCategory(current = false, building, category) {
		let prod = {
			amount: 0,
			type: null, // units
			units: [],
			hasRandomProductions: false,
			doubleWhenMotivated: false
		}
		let productions = (current ? building.state.production : building.production);

		if (building.type === "production" && !current) {
			productions = [productions[productions?.length-1]];
		}

		if (productions) {
			for (let production of productions) {
				if (production === undefined) continue;

				if (production.type === 'random') {
					production.resources.forEach(resource => {
						if (resource.type+"s" === category) { // units 
							prod.amount += resource.amount * resource.dropChance
							prod.hasRandomProductions = true
							let Uera = Technologies.Eras[building.eraName]
							Uera = Uera + (resource.name.includes("next") && Uera<Technologies.getMaxEra() ? 1 : 0)
							let Utype=resource.name
							prod.units.push({type:Utype.replace(/next./,""),amount:0,random:resource.amount * resource.dropChance,era:Utype==="rogue"?0:Uera})
						}
						if (resource.type === "guild_goods" && category === "clan_goods" 
							|| resource.subType === "strategy_points" && category === "strategy_points"
							|| resource.subType === "money" && category === "money" 
							|| resource.subType === "supplies" && category === "supplies"
							|| resource.subType === "medals" && category === "medals") {
							prod.amount += resource.amount * resource.dropChance;
							prod.hasRandomProductions = true;
						}
					})
				}

				if (production.type === "resources" && category !== "goods") {
					if (production.resources[category]) {
						prod.doubleWhenMotivated = production.doubleWhenMotivated
						prod.amount += production.resources[category] //* doubleMoney
					}
				}

				if (production.type === "special_goods" && category === "special_goods") {
					let combinedValues = Object.entries(production.resources).length === 1 ? Math.round(prod.amount * Boosts.Sums.special_goods_production/100) : 0;
					for (let [type,value] of Object.entries(production.resources)) {
						let boostedValue = Math.round(value * Boosts.Sums.special_goods_production/100);
						combinedValues += value+boostedValue;
					}
					prod.amount = combinedValues;
				}

				if (production.type+"s" === category) { // units
					let Utype = Object.keys(production.resources)[0]
					let UAmount = production.resources[Utype]
					let Uera = Technologies.Eras[building.eraName]
					if (!current && building.type === "main_building") Utype = "random" //does not work... why???
					Uera = Uera + (Utype.includes("next") && Uera<Technologies.getMaxEra() ? 1 : 0)
					prod.amount += UAmount

					if (!current && building.type === "greatbuilding") {
						let m = Object.values(MainParser.CityMapData).filter(x => x.type === "military")
						let RAmount = UAmount/m.length
						m.forEach (x => {
							let Rtype = MainParser.CityEntities[x.cityentity_id].available_products[0].unit_class
							if (MainParser.CityEntities[x.cityentity_id].available_products[0].unit_type_id === "rogue") Rtype="rogue"   //Banners + Drummers???
							let Rera = Technologies.Eras[MainParser.CityEntities[x.cityentity_id].requirements.min_era]
							prod.units.push({type:Rtype.replace(/next./,""),amount:0,random:RAmount,era:Rtype === "rogue"?0:Rera})
						})
					}
					else {
						prod.units.push({type:Utype.replace(/next./,""),amount:UAmount,random:0,era:building.type === "greatbuilding" || Utype === "rogue" ?0:Uera})
					}

					if (current === true && building.type !== "main_building" && building.type !== "greatbuilding")
						prod.type = Utype
					else
						prod.type = null
				}
				if (category === "clan_goods" && production.type === "guildResources") {
					if (production.resources?.all_goods_of_age)
						prod.amount = production.resources?.all_goods_of_age
					else {
						if (production.resources !== undefined) {
							let good = GoodsList.find(x => x.id === Object.keys(production.resources)[0])
							if (good !== undefined)
								prod.amount = production.resources[good.id]*5 // multiply found good by 5
						}
					}
				}
			}
		}

		if (building.population && category === "population") {
			prod.amount += building.population
		}
		if (building.happiness && category === "happiness") {
			prod.amount += building.happiness
		}

		if (category === "goods") {
			return CityBuildings.getBuildingGoodsByEra(current, building, true);
		}
		if (category === "forge_points_production" || category === "coin_production" || category === "supply_production") {
			prod.amount = building.boosts.filter(x => x.type[0] === category)[0].value // not really rock solid like this
		}
		return prod
	},


	/**
	 * Gathers and returns HTML representations of items and units produced by a building.
	 *
	 * @param {boolean} [current=false] - Whether to use current state or base production.
	 * @param {Object} building - The building object.
	 * @returns {Array} Array containing HTML strings for items, units, and raw item data.
	 */
	showBuildingItems(current = false, building) {
		let allItems = '',
			allUnits = '',
			itemArray = [];

		// current item production
		if (current && (building.state?.isPolivated === true || building.state?.isPolivated === undefined) && Array.isArray(building.state?.production)) {
			for (const production of building.state?.production) {
				if (production.type !== "genericReward") continue;
				if (production.resources?.icon?.includes("good")) return false;

				let frag = production.resources.subType === "fragment";
				allItems += '<span>'+production.resources.amount + "x " + (frag ? "🧩 " : "" ) + production.resources.name + "</span><br>";
				itemArray.push({fragment:frag,name:production.resources.name,amount:production.resources.amount,random:0});
			}
		}
		// general item production
		else {
			if (building.production) {
				for (const production of building.production) {
					if (production.type === "random") {
						for (const resource of production.resources) {
							if (resource.type.includes("good") || resource.type === "resources") continue;

							let frag = resource.subType === "fragment"
							let amount = parseFloat(Math.round(resource.amount*resource.dropChance * 100) / 100)
							if (resource.type === "unit") {
								allUnits += "Ø " + amount + "x " + (frag ? "🧩 " : "" ) + `<img src='${srcLinks.get("/shared/icons/"+resource.name.replace(/next./,"").replace("random","random_production")+".png",true)}'>` + "<br>"
							} else {
								allItems += "<span>Ø " + amount + "x " + (frag ? "🧩 " : "" ) + resource.name + "</span><br>"
								itemArray.push({fragment:frag,name:resource.name,amount:0,random:amount})
							}
						}
					}
					if (production.type === "unit") {
						for (let u of Object.keys(production.resources)) {
							allUnits += production.resources[u] + "x " + `<img src='${srcLinks.get("/shared/icons/"+u.replace(/next./,"").replace("random","random_production")+".png",true)}'>` + "<br>"
						}
					} 
					if (production.resources?.type === "consumable") {
						let itemId = production.resources.id.split('#')[1]
						itemId = (itemId === undefined) ? '' : itemId
						let frag = production.resources.subType === "fragment"
						allItems += `<span class="'${itemId}'">`+production.resources.amount + "x " + (frag ? "🧩 " : "" ) + production.resources.name.replace(/^\d+/, "") + "</span><br>"
						itemArray.push({fragment:frag,name:production.resources.name,amount:production.resources.amount,random:0})
					}
				}
			}
		}
		return [allItems,allUnits,itemArray];
	},


	/**
	 * Determines the specific sub-type of production data.
	 *
	 * @param {Object} d - The data object to analyze.
	 * @returns {string} The identified production sub-type.
	 */
    readType: (d) => {
	   // Boost ausrechnen und bereitstellen falls noch nicht initialisiert
	   if (Productions.Boosts['money'] === undefined) Productions.Boosts['money'] = ((Boosts.Sums['coin_production'] + 100) / 100);
	   if (Productions.Boosts['supplies'] === undefined) Productions.Boosts['supplies'] = ((Boosts.Sums['supply_production'] + 100) / 100);
	   if (Productions.Boosts['fp'] === undefined) Productions.Boosts['fp'] = ((Boosts.Sums['forge_points_production'] + 100) / 100);
   },


	/**
	 * Sets the active tab ID.
	 *
	 * @param {number|string} id - The ID of the tab to set as active.
	 */
	SetTabs: (id)=> {
		Productions.Tabs.push('<li class="' + id + '" id="prod-' + id + '"><a href="#' + id + '"><span>&nbsp;</span></a></li>');
	},


	/**
	 * Retrieves the current active tab ID.
	 *
	 * @returns {number|string} The active tab ID.
	 */
	GetTabs: ()=> {
		return '<ul class="horizontal dark-bg clickable">' + Productions.Tabs.join('') + '</ul>';
	},


	/**
	 * Adds content to a specific tab.
	 *
	 * @param {number|string} id - The ID of the tab.
	 * @param {string} content - The HTML content for the tab.
	 */
	SetTabContent: (id, content)=> {
		// ab dem zweiten Eintrag verstecken
		let style = Productions.TabsContent.length > 0 ? ' style="display:none"' : '';

		Productions.TabsContent.push('<div class="content" id="' + id + '"' + style + '>' + content + '</div>');
	},


	/**
	 * Retrieves all tab content.
	 *
	 * @returns {Array} Array of tab content strings.
	 */
	GetTabContent: ()=> {
		return Productions.TabsContent.join('');
	},


	/**
	 * Initializes or refreshes the tab switching functionality and event handlers.
	 */
	SwitchFunction: ()=>{
		$('#Productions').on('click', '.change-view', function() {
			let activeTable = $(this).parents('table'),
				hiddenTable = activeTable.next('table') 

			if (hiddenTable.length === 0) hiddenTable = activeTable.siblings('table').first();

			activeTable.fadeOut(400, function(){
				hiddenTable.fadeIn(400)
				activeTable.removeClass('active')
				hiddenTable.addClass('active')
			});
		});
	},


	/**
	 * Checks if a specific production type has any production from buildings.
	 *
	 * @param {string} Type - The production type to check.
	 * @returns {boolean} True if there is production for the type, false otherwise.
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
	 * Highlights buildings on the city map based on their IDs.
	 *
	 * @param {Array} ids - Array of building IDs to highlight.
	 */
	ShowOnMap: (ids) => {
		let IDArray = (ids.length !== undefined ? ids : [ids]);

		if( $('#citymap-main').length < 1 )
			CityMap.init(null);

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


	/**
	 * Highlights buildings on the city map based on their name.
	 *
	 * @param {string} name - The name (or partial name) of buildings to highlight.
	 */
	ShowSearchOnMap: (name) => {
		if( $('#citymap-main').length < 1 )
			CityMap.init(null);

		$('#grid-outer').removeClass('desaturate');

		setTimeout(() => {
			CityMap.filterBuildings(name)
			$('#BuildingsFilter').attr('value',name)
		}, 500);
	},


	/**
	 * Returns a translated name for a given good type or era-specific good.
	 *
	 * @param {string} GoodType - The good type identifier.
	 * @returns {string} The localized name of the good type.
	 */
	GetTypeName: (GoodType) => {
		// army boost columns exist in several contexts (base, GE, GBG, QI); include the
		// context in the name so every column gets a unique label — otherwise the
		// export overwrites one column with the other (#3503)
		let BoostContext = '';
		if (GoodType.includes('-guild_expedition')) {
			BoostContext = ' (' + i18n('Boxes.General.Guild_Expedition') + ')';
		}
		else if (GoodType.includes('-battleground')) {
			BoostContext = ' (' + i18n('Boxes.General.Guild_Battlegrounds') + ')';
		}
		else if (GoodType.includes('-guild_raids')) {
			BoostContext = ' (' + i18n('Boxes.General.Quantum_Incursion') + ')';
		}

		if (GoodType.includes('att_boost_attacker')) {
			return i18n('Boxes.Productions.att_boost_attacker') + BoostContext;
		}
		else if (GoodType.includes('att_boost_defender')) {
			return i18n('Boxes.Productions.att_boost_defender') + BoostContext;
		}
		else if (GoodType.includes('def_boost_attacker')) {
			return i18n('Boxes.Productions.def_boost_attacker') + BoostContext;
		}
		else if (GoodType.includes('def_boost_defender')) {
			return i18n('Boxes.Productions.def_boost_defender') + BoostContext;
		}

		if (GoodType.includes('happiness')) {
			return i18n('Boxes.Productions.Happiness');
		}
		else if (GoodType === 'guild_raids_action_points_collection') {
			return i18n('Boxes.BoostList.guild_raids_action_points_collection');
        }
		else if (GoodType === 'guild_raids_units_start') {
			return i18n('Boxes.BoostList.guild_raids_units_start');
        }
		else if (GoodType === 'guild_raids_goods_start') {
			return i18n('Boxes.BoostList.guild_raids_goods_start');
        }
		else if (GoodType === 'guild_raids_coins_start') {
			return i18n('Boxes.BoostList.guild_raids_coins_start');
        }
		else if (GoodType === 'guild_raids_coins_production') {
			return i18n('Boxes.BoostList.guild_raids_coins_production');
        }
		else if (GoodType === 'guild_raids_supplies_start') {
			return i18n('Boxes.BoostList.guild_raids_supplies_start');
        }
		else if (GoodType === 'guild_raids_supplies_production') {
			return i18n('Boxes.BoostList.guild_raids_supplies_production');
        }
		else if (GoodType === 'clan_power') {
			return i18n('Boxes.Productions.GuildPower');
		}
		else if (GoodType === 'clan_goods') {
			return i18n('Boxes.Productions.GuildGoods');
        }
		else if (GoodType.includes('units')) {
			return i18n('Boxes.Productions.Units');
		}
		else if (GoodType.includes('battleground')) {
			return i18n('Boxes.General.Guild_Battlegrounds');
		}
		else if (GoodType.includes('guild_expedition')) {
			return i18n('Boxes.General.Guild_Expedition');
		}
		else if (GoodType.includes('goods-next')) {
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
		else if (GoodType === 'fsp') {
			return i18n('Boxes.Productions.FSP');
        }
		else if (GoodType === 'forge_points_production') {
			return i18n('Boxes.Productions.fp_boost');
        }
		else if (GoodType === 'goods_production') {
			return i18n('Boxes.Productions.goods_boost');
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
	 * Retrieves a boost value for a building and executes a callback with the result.
	 *
	 * @param {Object} building - The building object.
	 * @param {string} boostName - The name of the boost to retrieve.
	 * @param {Function} callback - Callback function receiving the boost value object or undefined.
	 */
	getBoost: (building, boostName, callback) => {
		building.boosts?.forEach(boost => {
			let type = boost.type.find(x => x === boostName)
			if (!boostName.includes('-')) {
				if (type !== undefined) {
					const value = { feature: boost.feature, value: boost.value }
					callback(value)
				}
			}
			callback(undefined)
		})
	},


	/**
	 * Displays the settings for the production overview box.
	 */
	ShowSettings: () => {
        let showRelativeProductionTime = JSON.parse(localStorage.getItem('productionsShowRelativeTime')||"false")
        let showAMPMTime = JSON.parse(localStorage.getItem('productionsShowAMPMTime')||"false")
        let show24Time = (showAMPMTime === false && showRelativeProductionTime === false)

        let h = []
        h.push(`<p><input id="productionsShowRelativeTime" name="productionTime" value="1" type="radio" ${(showRelativeProductionTime === true) ? ' checked="checked"' : ''} /> <label for="productionsShowRelativeTime">${i18n('Boxes.Productions.RelativeTime')}</label><br>`)
        h.push(`<input id="productionsShowAMPMTime" name="productionTime" value="1" type="radio" ${(showAMPMTime === true) ? ' checked="checked"' : ''} /> <label for="productionsShowAMPMTime">${i18n('Boxes.Productions.AMPMTime')}</label><br>`)
        h.push(`<input id="productionsShow24Time" name="productionTime" value="1" type="radio" ${(show24Time === true) ? ' checked="checked"' : ''} /> <label for="productionsShow24Time">${i18n('Boxes.Productions.Time24')}</label></p>`)
		h.push(`<p><button onclick="Productions.SaveSettings()" id="save-productions-settings" class="btn" style="width:100%">${i18n('Boxes.Settings.Save')}</button></p>`)
		
		let activeTable = $('#ProductionsBody .horizontal li.active').attr('id').replace('prod-','');

		/* needs more thought put into it: only relevant on an unmotivated city, having to download so many tables is weird, without id you cannot create a large table from it etc
		h.push(`<hr><p>${i18n('Boxes.General.Export')}: <span class="btn-group"><button class="btn" onclick="HTML.ExportTable($('#ProductionsBody #${activeTable}-list'),'csv','City-${activeTable}')" title="${HTML.i18nTooltip(i18n('Boxes.General.ExportCSV'))}">CSV</button>`);
		h.push(`<button class="btn" onclick="HTML.ExportTable($('#ProductionsBody #${activeTable}-list'),'json','City-${activeTable}')" title="${HTML.i18nTooltip(i18n('Boxes.General.ExportJSON'))}">JSON</button></span></p>`);
		*/

        $('#ProductionsSettingsBox').html(h.join(''))
    },




	/**
	 * Saves the settings for the production overview box.
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


	/**
	 * Displays a modal box containing a list of item sources.
	 *
	 * If the modal box with the ID "ItemSources" does not already exist, it creates
	 * one with customizable attributes such as auto_close, dragdrop, minimize, and resize.
	 *
	 * The item sources list is retrieved from the `Productions.buildingItemList` method and
	 * rendered in a sortable and filterable table format. Each item can be clicked to update
	 * item sources through the `Productions.updateItemSources` method.
	 *
	 * Functionality includes:
	 * - Dynamically rendering a table of item sources with item icons and names.
	 * - A filter input to narrow down visible items in the list.
	 * - Making table rows sortable using the `tableSorter` function.
	 * - Adding an interactive sub-table for each item toggled by a click event.
	 */
	showItemSources:()=>{
		if ( $('#ItemSources').length === 0 ) {
			HTML.Box({
				id: 'ItemSources',
				title: i18n('Boxes.ItemSources.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true
			});
		}

		let items = Productions.buildingItemList()

        let h = `<div>
					<table class="foe-table sortable-table">
						<thead class="sticky">
							<tr class="sorter-header"><th data-type="itemSourcesList"><input type="text" class="filterTable" placeholder="${i18n('Boxes.General.FilterItems')}" /> Items</th></tr>
						</thead>
						<tbody class="itemSourcesList">`
							for (let item of Object.values(items)) {
								h += `<tr><td onclick="Productions.updateItemSources(${JSON.stringify(item).replaceAll('"',"'")})" data-text="${helper.str.cleanup(item.name)}">${srcLinks.icons(item.icon)} ${item.name}<div class="innerTable" id="item-${helper.str.cleanup(item.name)}"></div></td></tr>`
							}
        			h +=`</tbody>
					</table>
				</div>`
        $('#ItemSourcesBody').html(h)
        $('#ItemSourcesBody .sortable-table').tableSorter()
		HTML.FilterTable('#ItemSourcesBody .filterTable')
	},


	/**
	 * Generates a list of building items by parsing city entities data and filtering specific attributes.
	 *
	 * The function processes city entities to extract details about items associated with buildings.
	 * It generates an object containing item information such as `id`, `name`, `icon`, and
	 * the buildings where they are utilized. It filters out irrelevant items such as fragments, icons,
	 * or those matching the goods list.
	 *
	 * Steps performed by this function:
	 * 1. Parses `MainParser.CityEntities` to retrieve relevant building entities that have IDs starting with "W".
	 * 2. Extracts item data (id, name, icon) from JSON formatted data using regex patterns.
	 * 3. Cleans the extracted data, normalizing IDs and names by removing fragments or numeric sequences.
	 * 4. Filters out items based on their inclusion in `GoodsList` or matching specific conditions.
	 * 5. Consolidates item information into an object where each item is mapped by its `id`,
	 *    including relevant details and the buildings it is associated with.
	 *
	 * @returns {Object} An object where each key is an item `id` and the value is an object containing:
	 *                   - `name` (String): The name of the item.
	 *                   - `buildings` (Array): A list of building IDs where the item is utilized.
	 *                   - `id` (String): The unique identifier of the item.
	 *                   - `icon` (String): The icon asset name associated with the item.
	 */
	buildingItemList: () => {
		let temp = Object.assign({},...Object.values(MainParser.CityEntities).filter(b=>b.id[0]==="W").map(x=>({[x.id]:[...JSON.stringify(x).matchAll(/"id":"([^"]*?)"[^()[\]{}]*?"name":"([^"]*?)"[^()[\]{}]*?"iconAssetName":"([^"]*?)"[^{}]*?"__class__":"(GenericReward|TimedReward)"/gm)].map(a=>({id:a[1],name:a[2],icon:a[3]}))})))

		let gl = Object.values(GoodsList).map(g=>g.id)
		let items = {}

		for (let [building,list] of Object.entries(temp)) {
			for (let item of list) {
				if (gl.includes(item.icon))
					continue

				if (["","icon_fragment"].includes(item.icon))
					continue

				if (/#\d+/.test(item.id)) {
					item.id=item.id.replaceAll(/#\d+/g,'')
					item.name=item.name.replaceAll(/\s?\d+\s?/g,'')
				}
				if (items[item.id]) {
					if (!items[item.id].buildings.includes(building)) items[item.id].buildings.push(building)
				} else {
					items[item.id] = {name:item.name,buildings:[building],id:item.id,icon:item.icon}
				}
			}
		}
		return items
	},


	/**
	 * Retrieves a list of city buildings categorized by specific boost types.
	 *
	 * This method filters city entities based on their id, specifically those that start with "W",
	 * and then evaluates their boost components to determine if they provide any of the specified boosts.
	 *
	 * Buildings that match the specified boosts are grouped and returned in a categorized object,
	 * where each key is a boost type and the value is an array of buildings providing that boost.
	 *
	 * Special cases:
	 * - Buildings tied to guild raid activities (identified by ids containing 'GuildRaids') are excluded
	 *   for boosts that include 'guild_raids'.
	 *
	 * @param {string[]} [boostArray=[]] - An array of boost types to search for.
	 * @returns {Object} An object where each key is a boost type from the input array, and the value is
	 *                   an array of objects containing the name and entityId of the matching buildings.
	 *                   Example structure:
	 *                   {
	 *                      "boost1": [{ name: "Building1", entityId: "W123" }],
	 *                      "boost2": [{ name: "Building2", entityId: "W456" }]
	 *                   }
	 */
	getBuildingsByBoosts: (boostArray = []) => {
		let buildings = Object.values(MainParser.CityEntities).filter(b=>b.id[0]==="W")
		let boostList = {};
		boostArray.forEach(boost => boostList[boost] = [])
		for (let building of buildings) {
			let buildingAABoost = building.components?.AllAge?.boosts?.boosts;
			let buildingCABoost = building.components?.[CurrentEra]?.boosts?.boosts;
			if (buildingAABoost === undefined && buildingCABoost === undefined) continue;

			for (let boost of boostArray) {
				let foundAllABoost = buildingAABoost?.find(x => x.type === boost);
				let foundCurrentABoost = buildingCABoost?.find(x => x.type === boost);

				if (foundAllABoost === undefined && foundCurrentABoost === undefined) continue;

				if (boost.includes('guild_raids') && building.id.includes('GuildRaids')) continue;

				boostList[boost].push({
					name: building.name,
					entityId: building.id
				});
			}
		}
		return boostList;
	},


	/**
	 * Creates a list of buildings providing the specified boosts and displays it.
	 *
	 * @param {Array} [boostArray=[]] - Array of boost types to filter buildings by.
	 */
	createBuildingBoostList: (boostArray = []) => {
		if ( $('#BoostList').length === 0 ) {
			HTML.Box({
				id: 'BoostList',
				title: i18n('Boxes.BoostList.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true
			});
		}

		let groupedBuildings = Productions.getBuildingsByBoosts(boostArray);

        let h = `<div>
					<table class="foe-table sortable-table">
						<thead class="sticky">
							<tr class="sorter-header"><th data-type="boostList"><input type="text" class="filterTable" placeholder="${i18n('Boxes.General.FilterItems')}" /> Boosts</th></tr>
						</thead>
						<tbody>`
							for (let [group, buildings] of Object.entries(groupedBuildings)) {
								h += '<tr><td><h2><span class="boost '+group+'"></span> '+i18n('Boxes.BoostList.'+group)+'</h2><ul>'
								for (let building of buildings) {
									h += '<li class="fh-tooltip" data-era="'+CurrentEra+'" data-callback_tt="Tooltips.buildingTT" data-meta_id="'+building.entityId+'">'+building.name+'</li>'
								}
								h += '</ul></td></tr>';
							}
        			h +=`</tbody>
					</table>
				</div>`
        $('#BoostListBody').html(h)
        $('#BoostListBody .sortable-table').tableSorter()
		HTML.FilterTable('#BoostListBody .filterTable')
	},


	/**
	 * Updates the sources of a given item and toggles its display state in the UI.
	 *
	 * This function adjusts the content and visibility of a specific HTML element corresponding
	 * to the provided item. It either clears the element's content or populates it with a list
	 * of buildings associated with the item. Additionally, it toggles a CSS class to change
	 * the appearance of the parent element.
	 *
	 * @param {Object} item - The item object containing information to render the sources.
	 * @param {string} item.name - The name of the item used to identify the target element.
	 * @param {Array<string>} item.buildings - An array of building IDs associated with the item,
	 * which are used to generate a list of building information.
	 */
	updateItemSources:(item)=>{
		let itemId = '#item-'+helper.str.cleanup(item.name)
		$(itemId).parent('td').toggleClass('open')
		if ($(itemId).html() !== '') {
			$(itemId).html('')
			return
		}
		h=`<ul class="foe-table">`
		for (b of item.buildings) {
			h+=`<li class="fh-tooltip" data-era=${CurrentEra} data-callback_tt="Tooltips.buildingTT" data-meta_id="${b}">${MainParser.CityEntities[b].name}</li>`
		}
		h+=`</ul>`
		$(itemId).html(h)
	},
};

