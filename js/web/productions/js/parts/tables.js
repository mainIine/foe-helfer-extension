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

// HTML table builders of the production overview — split out of productions.js.
// Loaded after productions.js via the "parts" mechanism in js/internal.json,
// so it can safely extend the existing Productions object.
Object.assign(Productions, {
	/**
	 * Builds and returns an HTML table displaying Quantum Invasion (QI) related production data.
	 *
	 * @param {string} type - The QI production type.
	 * @returns {string} HTML string representing the QI production table.
	 */
	buildQITable(type) {
		let table = [],
		tableGr = [],
		rowA = [],
		boostCounter = {},
		boosts = {},
		buildingIds = Productions.BuildingsProducts[type]

		buildingIds.forEach(b => {
			let building = CityBuildings.getBuildingById(b.id)
			if (building.player_id === ExtPlayerID) {
			rowA.push('<tr>')
			rowA.push('<td>')
				rowA.push((building.state.isPolivated !== undefined ? (building.state.isPolivated ? '<span class="text-bright">★</span>' : '☆') : ''))
				if (building.setBuilding !== undefined)
					rowA.push('<img src="' + srcLinks.get('/shared/icons/' + building.setBuilding.name + '.png', true) + '" class="chain-set-ico">')
				if (building.chainBuilding !== undefined)
					rowA.push('<img src="' + srcLinks.get('/shared/icons/' + building.chainBuilding.name + '.png', true) + '" class="chain-set-ico">')
			rowA.push('</td>')
			rowA.push('<td data-text="'+helper.str.cleanup(building.name)+'" class="' + (Allies.buildingList?.[building.id]?"ally" : "") +'">' + building.name + '</td>')

			if (building.boosts !== undefined) {
				boosts = {}
				building.boosts.forEach(boost => {
					if (boost.type.find(x => x.includes('guild_raids_'))) {
						if (boosts[boost.type[0]] === undefined) 
							boosts[boost.type[0]] = parseInt(boost.value)
						else
							boosts[boost.type[0]] += parseInt(boost.value)

						if (boostCounter[boost.type[0]] === undefined) 
							boostCounter[boost.type[0]] = parseInt(boost.value)
						else
						boostCounter[boost.type[0]] += parseInt(boost.value)
					}
				})
				for (let type of Object.keys(Boosts.Sums)) {
					if (type.includes('guild_raids_')) {
						if (boosts[type] !== undefined)
							rowA.push('<td data-number="'+boosts[type]+'" class="text-center">'+ HTML.Format(boosts[type]) +'</td>')
						else
							rowA.push('<td data-number="'+0+'" class="text-center">-</td>')
					}
				}
			}

			rowA.push('<td data-number="'+Technologies.Eras[building.eraName]+'">' + i18n("Eras."+Technologies.Eras[building.eraName]+".short") + '</td>')
			rowA.push('<td class="text-right">')
			rowA.push('<span class="show-entity" data-id="' + building.id + '"><img class="game-cursor" alt="" src="' + extUrl + 'css/images/hud/open-eye.png"></span>')
			rowA.push('</td>')
			rowA.push('</tr>')
			}
		})

		if (rowA.length > 0) {
			table.push('<table id="'+type+'-list" class="foe-table sortable-table TSinactive '+type+'-list active exportable">')
			table.push('<thead class="sticky">')
			table.push('<tr>')
			table.push('<th colspan="12"><input type="text" placeholder="' + i18n('Boxes.Productions.FilterTable') + '" class="filterCurrentList">' +
				'<span class="btn" onclick="Productions.createBuildingBoostList([\'guild_raids_action_points_collection\',\'guild_raids_coins_production\',\'guild_raids_coins_start\',\'guild_raids_supplies_production\',\'guild_raids_supplies_start\',\'guild_raids_goods_start\',\'guild_raids_units_start\'])">'+i18n("Boxes.BoostList.open")+'</span></th>')
			table.push('</tr>')

			table.push('<tr class="sorter-header exportheader">')
			table.push('<th class="no-sort" data-type="prodlist'+type+'"> </th>')
			table.push('<th class="ascending" data-type="prodlist'+type+'" data-export="' + i18n('Boxes.BlueGalaxy.Building') + '">' + i18n('Boxes.BlueGalaxy.Building') + '</th>')
			table.push('<th class="boost qiactions is-number text-center" data-type="prodlist'+type+'"><span></span>'+(boostCounter.guild_raids_action_points_collection || 0)+'</th>')
			table.push('<th class="boost qicapacity is-number text-center" data-type="prodlist'+type+'"><span></span>'+(boostCounter.guild_raids_action_points_capacity || 0)+'</th>')
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
		
		return table.join('') + tableGr.join('')
	},


	/**
	 * Builds a table based on the specified type by aggregating relevant data and formatting it into rows.
	 *
	 * @param {string} type - The type of data used to construct the table. Valid values can include types like 'money', 'supplies', 'strategy_points', etc.
	 * @return {Array} The constructed table data, formatted as an array of rows containing detailed information
	 *                 derived from city buildings and associated productions, boosts, or other attributes.
	 */
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

			if (type !== 'goods' && type !== 'clan_goods' && type !== 'guild_raids') {
				for (const b of buildingIds) {
					let building = CityBuildings.getBuildingById(b.id)
					if (building?.player_id !== ExtPlayerID) continue;
					// makes random productions with resources and others disappear from the item list
					if (type === 'items' && Productions.showBuildingItems(true, building)[0] === "" || building.chainBuilding?.type === "linked") continue;

					rowA.push('<tr>')
					rowA.push('<td>')
						rowA.push((building.state.isPolivated !== undefined ? (building.state.isPolivated ? '<span class="text-bright">★</span>' : '☆') : ''))
						if (building.setBuilding !== undefined)
						rowA.push('<img src="' + srcLinks.get('/shared/icons/' + building.setBuilding.name + '.png', true) + '" class="chain-set-ico">')
						if (building.chainBuilding !== undefined)
						rowA.push('<img src="' + srcLinks.get('/shared/icons/' + building.chainBuilding.name + '.png', true) + '" class="chain-set-ico">')
					rowA.push('</td>')
					rowA.push('<td data-text="'+helper.str.cleanup(building.name)+'" exportvalue="'+building.name+'" class="' + (Allies.buildingList?.[building.id]?"ally" : "") +'">' + building.name + '</td>')

					if (!type.includes('att') && !type.includes('def')) {
						if (type !== 'items') {
							let currentProductionByCategory = Productions.getBuildingProductionByCategory(true, building, type)
							let generalProductionByCategory = Productions.getBuildingProductionByCategory(false, building, type)
							currentAmount = parseFloat(currentProductionByCategory.amount)
							amount = parseFloat(generalProductionByCategory.amount)
							hasRandomProductions = generalProductionByCategory.hasRandomProductions
							let doubled = generalProductionByCategory.doubleWhenMotivated

							if (type === 'money' && building.isBoostable) {
								amount = Math.round(amount + (amount * ((Boosts.Sums.coin_production + (Productions.HappinessBoost * 100)) / 100))) * (doubled ? 2 : 1)
								currentAmount = Math.round(currentAmount + (currentAmount * ((Boosts.Sums.coin_production + (Productions.HappinessBoost * 100)) / 100)))
							}
							else if (type === 'supplies' && building.isBoostable) {
								amount = Math.round(amount + (amount * ((Boosts.Sums.supply_production + (Productions.HappinessBoost * 100)) / 100))) * (doubled ? 2 : 1)
								currentAmount = Math.round(currentAmount + (currentAmount *((Boosts.Sums.supply_production + (Productions.HappinessBoost * 100)) / 100)))
							}
							else if (type === 'strategy_points' && building.isBoostable) {
								amount = Math.round(amount + (amount *((Boosts.Sums.forge_points_production) / 100)))
								currentAmount = Math.round(currentAmount + (currentAmount *((Boosts.Sums.forge_points_production) / 100)))
							}

							rowA.push('<td data-number="'+amount+'" exportvalue="'+amount+'" class="textright">')
							let parsedCurrentAmount = (currentAmount >= 10000 ? HTML.FormatNumberShort(currentAmount) : HTML.Format(currentAmount)) 
							let parsedAmount = (currentAmount >= 10000 ? HTML.FormatNumberShort(amount) : HTML.Format(amount)) 

							if (generalProductionByCategory.units.length>0 || currentProductionByCategory.units.length>0) {
								if (currentProductionByCategory.units.length > 0) 
									rowA.push(currentProductionByCategory.units.map(x=>`${x.amount}<span class="unit_skill ${x.type} ${x.era>CurrentEraID?"next_era":""}" title="${i18n("Boxes.Units." + x.type)}"></span> `).join(" "))
								else 
									rowA.push(" - ")
									rowA.push(" / ")

								if (generalProductionByCategory.units.length > 0) 
									rowA.push(generalProductionByCategory.units.map(x=>`${x.amount?x.amount:""}${x.amount && x. random ? "+":""}${x.random ? "Ø"+x.random:""}<span class="unit_skill ${x.type} ${x.era>CurrentEraID?"next_era":""}" title="${i18n("Boxes.Units." + x.type)}"></span> `).join(" "))
								else 
									rowA.push(" - ")
							} else {

								if (currentAmount < amount && building.type !== 'production')
									rowA.push(parsedCurrentAmount + ' / ' + (hasRandomProductions ? 'Ø' : '') + parsedAmount)
								else {
									unitType = currentProductionByCategory.type
									if (unitType !== null){
										rowA.push('<span class="unit_skill ' + unitType.replace(/next./,"") + '" title="'+ i18n("Boxes.Units." + unitType.replace(/next./,"") ) + '"></span> ')
									}
									rowA.push(parsedCurrentAmount)
								}
							}
							rowA.push('</td>')

							typeSum += amount
							typeCurrentSum += currentAmount

							for (let u of generalProductionByCategory.units) {
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
							for (let u of currentProductionByCategory.units) {
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
							let items=Productions.showBuildingItems(true, building);
							for (let i of items[2]) {
								let n = (i.fragment ? "Fragment" : "") + i.name.replace(/\s/g,"")
								if (Sum[n]) {
									Sum[n].amount += i.amount || 0
									Sum[n].random += i.random || 0
								} else {
									Sum[n] = i
								}
							}
							let itemsText = items[0];

							rowA.push('<td data-number="1" exportvalue="'+jQuery(itemsText).text()+'"><span>' + itemsText + '</span></td>')
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
								if (boost.type.find(x => x === type) === type) {
									if (boost.feature === "all") {
										boosts.all += boost.value
										boostCounter[type][boost.feature] += boost.value
									}
									if (boost.feature === "battleground") {
										boosts.battleground += boost.value
										boostCounter[type][boost.feature] += boost.value
									}
									if (boost.feature === "guild_expedition") {
										boosts.guild_expedition += boost.value
										boostCounter[type][boost.feature] += boost.value
									}
									if (boost.feature === "guild_raids") {
										boosts.guild_raids += boost.value
										boostCounter[type][boost.feature] += boost.value
									}
								}
							})

							rowA.push('<td data-number="'+boosts.all+'" exportvalue="'+boosts.all+'" class="text-center">'+ (boosts.all !== 0 ? HTML.Format(boosts.all) : '-') +'</td>')
							rowA.push('<td data-number="'+boosts.battleground+'" exportvalue="'+boosts.battleground+'" class="text-center">'+ (boosts.battleground !== 0 ? HTML.Format(boosts.battleground) : '-') +'</td>')
							rowA.push('<td data-number="'+boosts.guild_expedition+'" exportvalue="'+boosts.guild_expedition+'" class="text-center">'+ (boosts.guild_expedition !== 0 ? HTML.Format(boosts.guild_expedition) : '-') +'</td>')
							rowA.push('<td data-number="'+boosts.guild_raids+'" exportvalue="'+boosts.guild_raids+'" class="text-center">'+ (boosts.guild_raids !== 0 ? HTML.Format(boosts.guild_raids) : '-') +'</td>')
						}
					}

					let updateGroup = groupedBuildings.find(x => x.building.name === building.name)
					if (updateGroup === undefined) {
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

					rowA.push('<td '+((type.includes('att') || type.includes('def')) ? 'colspan="3"' : '')+' data-number="'+Technologies.Eras[building.eraName]+'" exportvalue="'+i18n("Eras."+Technologies.Eras[building.eraName]+".short")+'">' + i18n("Eras."+Technologies.Eras[building.eraName]+".short") + '</td>')
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
						let done = (building.state.name === 'collectable' ? i18n('Boxes.Productions.Done') : '')
						rowA.push('<td style="white-space:nowrap" data-date="' + (building.state.times?.at||9999999999) + '">' + (done === "" ? time : '<b class="text-success">'+done+'</b>') + '</td>')
					}
					rowA.push('<td class="text-right">')
					rowA.push('<span class="show-entity" data-id="' + building.id + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span>')
					rowA.push('</td>')
					rowA.push('</tr>')
				}
			}

			if (rowA.length > 0) {
				table.push('<table id="'+type+'-list" class="foe-table sortable-table TSinactive '+type+'-list active exportable">')
				table.push('<thead class="sticky">')
				table.push('<tr>')
				table.push('<th colspan="3"><span class="btn change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeGroups') + '</span> <input type="text" placeholder="' + i18n('Boxes.Productions.FilterTable') + '" class="filterCurrentList"></th>')
				if (!type.includes('att') && !type.includes('def') && type !== 'items') {
					table.push('<th colspan="3" class="textright">')
					table.push((typeCurrentSum >= 10000 ? HTML.FormatNumberShort(typeCurrentSum) : HTML.Format(typeCurrentSum))+ "/" + (typeSum >= 10000 ? HTML.FormatNumberShort(typeSum) : HTML.Format(typeSum)))
					if (type === 'strategy_points') {
						table.push(' <button class="typeBoost btn btn-slim"><a href="#forge_points_production" class="game-cursor">'+i18n('General.Boost')+': '+Boosts.Sums.forge_points_production+'%</a></button>')
						Profile.fpProduction = typeSum;
						Profile.update();
					}
					else if (type === 'money') {
						table.push(' <button class="typeBoost btn btn-slim"><a href="#coin_production" class="game-cursor">'+i18n('General.Boost')+': '+Boosts.Sums.coin_production+'%</a></button>')
					}
					else if (type === 'supplies') {
						table.push(' <button class="typeBoost btn btn-slim"><a href="#supply_production" class="game-cursor">'+i18n('General.Boost')+': '+Boosts.Sums.supply_production+'%</a></button>')
					}
					if (type === 'units') {
						Profile.units = typeSum;
						Profile.update();
					}
					table.push('</th>')
				}
				else {
					table.push('<th colspan="8" class="textright">'+(type === "items" ? '<span class="btn" onclick="Productions.showItemSources(event)" style="float:right;">'+i18n('Boxes.ItemSources.Title')+'</span>' : '')+'</th>')
				}
				table.push('</tr>')

				table.push('<tr class="sorter-header exportheader">')

				table.push('<th class="no-sort" data-type="prodlist'+type+'"> </th>')
				table.push('<th class="ascending" data-type="prodlist'+type+'" data-export="' + i18n('Boxes.BlueGalaxy.Building') + '">' + i18n('Boxes.BlueGalaxy.Building') + '</th>')

				if (!type.includes('att') && !type.includes('def')) 
					table.push('<th data-type="prodlist'+type+'" class="is-number" data-export="' + i18n('Boxes.Productions.Headings.number') + '">' + i18n('Boxes.Productions.Headings.number') + '</th>')
				else {
					table.push('<th class="boost '+type+' is-number text-center" data-type="prodlist'+type+'" data-export="'+boostCounter[type].all+'"><span></span>'+boostCounter[type].all+'</th>')
					table.push('<th class="boost battleground is-number text-center" data-type="prodlist'+type+'" data-export="'+boostCounter[type].battleground+'"><span></span>'+(boostCounter[type].battleground)+'</th>')
					table.push('<th class="boost guild_expedition is-number text-center" data-type="prodlist'+type+'" data-export="'+boostCounter[type].guild_expedition+'"><span></span>'+(boostCounter[type].guild_expedition)+'</th>')
					table.push('<th class="boost guild_raids is-number text-center" data-type="prodlist'+type+'" data-export="'+boostCounter[type].guild_raids+'"><span></span>'+boostCounter[type].guild_raids+'</th>')
				}

				table.push('<th data-type="prodlist'+type+'" class="is-number" data-export="' + i18n('Boxes.Productions.Headings.era') + '">' + i18n('Boxes.Productions.Headings.era') + '</th>')

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
			if (type === 'goods')
				content = Productions.buildGoodsTable(buildingIds, type) // goods have their own table
			if (type === 'clan_goods')
				content = Productions.buildGuildGoodsTable(buildingIds, type)
			if (type === 'guild_raids')
				content = Productions.buildQITable(type) 

			return content
	},


	/**
	 * Identifies and returns a sorted list of eras for which goods are produced by the given buildings.
	 *
	 * @param {Array<{ id: string }>} buildingIds - Array of building IDs to analyze.
	 * @param {boolean} [guildGoods=false] - Whether to look for guild goods or regular goods.
	 * @returns {Array<number>} Sorted array of era indices.
	 */
	getRelevantGoodsByEra: (buildingIds, guildGoods = false) => {
		let eras = [];
		for (const b of buildingIds) {
			let building = CityBuildings.getBuildingById(b.id);
			if (building.player_id !== ExtPlayerID) continue;
			
			let allGoods = {};
			if (guildGoods)
				allGoods = CityBuildings.getBuildingGuildGoodsByEra(false, building, true);
			else
				allGoods = CityBuildings.getBuildingGoodsByEra(false, building, true);

			if (allGoods === undefined) continue;

			for (const era of Object.keys(allGoods.eras)) {
				// object keys are strings, the eras list holds numbers
				if (!eras.includes(parseInt(era)))
					eras.push(parseInt(era));
			}
		}
		
		// sort by the most advanced era first
		eras.sort((a, b) => {
			if (a < b) return 1;
			if (a > b) return -1;
			return 0;
		});

		return eras;
	},


	/**
	 * Builds and returns an HTML table displaying the production of regular or special goods.
	 *
	 * @param {Array<{ id: string }>} buildingIds - Array of building objects to process.
	 * @param {string} [type="goods"] - The type of goods to display ("goods" or "special_goods").
	 * @returns {string} HTML string representing the goods production tables (single and grouped view).
	 */
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
		eras = Productions.getRelevantGoodsByEra(buildingIds);

		// prepare array with total number of goods for each era
		for (const era of eras) {
			erasCurrent[era] = 0
			erasTotal[era] = 0
		}

		// single view table content
		for (const b of buildingIds) {
			let building = CityBuildings.getBuildingById(b.id);
			if (building.player_id !== ExtPlayerID) continue;

			rowA.push('<tr>')
			rowA.push('<td>')
			rowA.push((building.state.isPolivated !== undefined ? (building.state.isPolivated ? '<span class="text-bright">★</span>' : '☆') : ''))
			rowA.push('</td>')
			rowA.push('<td data-text="'+helper.str.cleanup(building.name)+'"  class="' + (Allies.buildingList?.[building.id]?"ally" : "") +'">' + building.name + '</td>')

			// prepare grouped buildings
			let updateGroup = groupedBuildings.find(x => x.building.name === building.name)
			if (updateGroup === undefined) {
				let gBuilding = {
					building: building,
					amount: 1,
				}
				for (let era of eras) {
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

			for (const era of eras) {
				let currentGoodAmount = 0
				let goodAmount = 0
				if (allGoods !== undefined) {
					erasCurrent[era] += currentGoodAmount = currentGoods?.eras?.[era] || 0
					erasTotal[era] += goodAmount = allGoods?.eras?.[era] || 0
					updateGroup[era] += goodAmount
				}
				if (building.isBoostable) {
					goodAmount = Math.round(goodAmount)
					currentGoodAmount = Math.round(currentGoodAmount)
				}
				rowA.push('<td data-number="'+goodAmount+'" class="text-center">')
					if (currentGoodAmount !== goodAmount) {
						let isAverage = (allGoods.hasRandomProduction ? "Ø" : "")
						rowA.push(HTML.Format(currentGoodAmount)+'/'+isAverage+HTML.Format(goodAmount))
					}
					else
						rowA.push(HTML.Format(goodAmount))
				rowA.push('</td>')
			}

			Profile.goods = erasTotal;
			Profile.update();

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
			let done = (building.state.name === 'collectable' ? i18n('Boxes.Productions.Done') : '')
			rowA.push('<td style="white-space:nowrap" data-date="' + (building.state.times?.at||9999999999) + '">' + (done === "" ? time : '<b class="text-success">'+done+'</b>') + '</td>')
			rowA.push('<td class="text-right">')
			rowA.push('<span class="show-entity" data-id="' + building.id + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span>')
			rowA.push('</td>')
			rowA.push('</tr>')
		}

		// single view table
		table.push('<table id="'+type+'-list" class="foe-table sortable-table exportable TSinactive '+type+'-list active">')
		table.push('<thead class="sticky">')
		table.push('<tr>')
		table.push('<th colspan="5"><span class="btn change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeGroups') + '</span> <input type="text" placeholder="' + i18n('Boxes.Productions.FilterTable') + '" class="filterCurrentList"></th>')
		table.push(`<th colspan=${eras.length+1} class="textright">${HTML.Format(Object.values(erasCurrent).reduce((a,b)=>a+b))}/${HTML.Format(Object.values(erasTotal).reduce((a,b)=>a+b))} 	<button class="typeBoost btn btn-slim"><a href="#special_goods" class="game-cursor">★</a></button> </th>`)
		table.push('</tr>')

		table.push('<tr class="sorter-header exportheader">')
		table.push('<th class="no-sort" data-type="prodlist'+type+'"> </th>')
		table.push('<th class="ascending" data-type="prodlist'+type+'">' + i18n('Boxes.BlueGalaxy.Building') + '</th>')
		for (const era of eras) {
			table.push('<th data-type="prodlist'+type+'" class="is-number text-center"><span data-original-title="'+i18n('Eras.'+(parseInt(era)+1))+'">' + i18n('Eras.'+(parseInt(era)+1)+'.short') + '<br><small>'+HTML.Format(erasCurrent[era])+'/'+HTML.Format(erasTotal[era])+'</small></span></th>')
		}
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
		table.push('<thead class="sticky">')
		table.push('<tr>')
		table.push('<th><span class="btn change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeSingle') + '</span></th>')
		table.push(`<th colspan=${2+eras.length} class="textright">${HTML.Format(Object.values(erasCurrent).reduce((a,b)=>a+b))}/${HTML.Format(Object.values(erasTotal).reduce((a,b)=>a+b))}</th>`)
		table.push('</tr>')
		table.push('<tr class="sorter-header">')
		table.push('<th data-type="prodgroup'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.number') + '</th>')
		table.push('<th data-type="prodgroup'+type+'">' + i18n('Boxes.BlueGalaxy.Building') + '</th>')
		for (const era of eras) {
			table.push('<th data-type="prodgroup'+type+'" class="is-number text-center">' + i18n('Eras.'+(parseInt(era)+1)+'.short') + '</span><br><small>'+HTML.Format(erasTotal[era])+'</small></th>')
		}
		table.push('<th data-type="prodgroup'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.size') + '</th>')
		table.push('</tr>')
		table.push('</thead>')
		table.push('<tbody class="prodgroup'+type+'">')

		for (const building of groupedBuildings) {
			rowB.push('<tr>')
			rowB.push('<td data-number="'+building.amount+'">'+building.amount+'x </td>')
			rowB.push('<td data-text="'+building.building.name.replace(/[. -]/g,"")+'"  class="' + (Allies.buildingList?.[building.building.id]?"ally" : "") +'">'+ building.building.name +'</td>')
			for (const era of eras) {
				rowB.push('<td data-number="'+building[era]+'" class="text-center">')
				rowB.push(HTML.Format(building[era]))
				rowB.push('</td>')
			}
			rowB.push('<td data-number="'+(building.building.size.length*building.building.size.width)+'">'+building.building.size.length+'x'+building.building.size.width+'</td>')
			rowB.push('</tr>')
		}

		table.push(rowB.join(''))

		table.push('</tbody>')
		table.push('</table>')

		return table.join('')
	},


	/**
	 * Builds and returns an HTML table displaying the production of guild goods from a list of buildings.
	 *
	 * The table includes data about individual buildings, grouped buildings, and their production statistics by era.
	 * It also provides both single-view (per building) and grouped-view (summarized by building type) representations.
	 *
	 * @param {Array} buildingIds - Array of building IDs to process and display in the table.
	 * @param {string} [type="clan_goods"] - The type of goods table to generate. Default is "clan_goods".
	 * @returns {string} An HTML string representing the table of guild goods production.
	 */
	buildGuildGoodsTable: (buildingIds, type = "clan_goods") => {
		let table = [],
			rowB = [],
			rowA = [],
			groupedBuildings = [],
			eras = [],
			erasCurrent = {},
			erasTotal = {},
			inADay = Math.floor(Date.now() / 1000) + 86400

		// gather all different eras
		eras = Productions.getRelevantGoodsByEra(buildingIds, guildGoods = true);

		// prepare array with total number of goods for each era
		for (const era of eras) {
			erasCurrent[era] = 0
			erasTotal[era] = 0
		}

		// single view table content
		for (const b of buildingIds) {
			let building = CityBuildings.getBuildingById(b.id)
			if (building.player_id !== ExtPlayerID) continue; 

			rowA.push('<tr>')
			rowA.push('<td>')
			rowA.push((building.state.isPolivated !== undefined ? (building.state.isPolivated ? '<span class="text-bright">★</span>' : '☆') : ''))
			rowA.push('</td>')
			rowA.push('<td data-text="'+helper.str.cleanup(building.name)+'"  class="' + (Allies.buildingList?.[building.id]?"ally" : "") +'">' + building.name + '</td>')

			// prepare grouped buildings
			let updateGroup = groupedBuildings.find(x => x.building.name === building.name)
			if (updateGroup === undefined) {
				let gBuilding = {
					building: building,
					amount: 1,
				}
				for (let era of eras) {
					gBuilding[era] = 0
				}
				updateGroup = gBuilding
				groupedBuildings.push(gBuilding)
			}
			else {
				updateGroup.amount++
			}

			let currentGoods = CityBuildings.getBuildingGuildGoodsByEra(true, building, true)
			let allGoods = CityBuildings.getBuildingGuildGoodsByEra(false, building, true)

			for (const era of eras) {
				let currentGoodAmount = 0
				let goodAmount = 0
				if (allGoods !== undefined) {
					erasCurrent[era] += currentGoodAmount = currentGoods?.eras?.[era] || 0
					erasTotal[era] += goodAmount = allGoods?.eras?.[era] || 0
					updateGroup[era] += goodAmount
				}
				if (building.isBoostable) {
					goodAmount = Math.round(goodAmount)
					currentGoodAmount = Math.round(currentGoodAmount)
				}
				rowA.push('<td data-number="'+goodAmount+'" class="text-center">')
					if (currentGoodAmount !== goodAmount) {
						let isAverage = (allGoods.hasRandomProduction ? "Ø" : "")
						rowA.push(HTML.Format(currentGoodAmount)+'/'+isAverage+HTML.Format(goodAmount))
					}
					else
						rowA.push(HTML.Format(goodAmount))
				rowA.push('</td>')
			}

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
			let done = (building.state.name === 'collectable' ? i18n('Boxes.Productions.Done') : '')
			rowA.push('<td style="white-space:nowrap" data-date="' + (building.state.times?.at||9999999999) + '">' + (done === "" ? time : '<b class="text-success">'+done+'</b>') + '</td>')
			rowA.push('<td class="text-right">')
			rowA.push('<span class="show-entity" data-id="' + building.id + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span>')
			rowA.push('</td>')
			rowA.push('</tr>')
		}

		Profile.guildGoods = Object.values(erasTotal).reduce((a,b)=>a+b);
		Profile.update();

		// single view table
		table.push('<table id="'+type+'-list" class="foe-table sortable-table exportable TSinactive '+type+'-list active">')
		table.push('<thead class="sticky">')
		table.push('<tr>')
		table.push('<th colspan="'+(6+eras.length)+'"><span class="btn change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeGroups') + '</span> <input type="text" placeholder="' + i18n('Boxes.Productions.FilterTable') + '" class="filterCurrentList">')
		table.push(`<span style="float:right;">${HTML.Format(Object.values(erasCurrent).reduce((a,b)=>a+b))}/${HTML.Format(Object.values(erasTotal).reduce((a,b)=>a+b))}</span></th>`)
		table.push('</tr>')
		table.push('<tr class="sorter-header exportheader">')
		table.push('<th class="no-sort" data-type="prodlist'+type+'"> </th>')
		table.push('<th class="ascending" data-type="prodlist'+type+'">' + i18n('Boxes.BlueGalaxy.Building') + '</th>')
		for (const era of eras) {
			table.push('<th data-type="prodlist'+type+'" class="is-number text-center"><span data-original-title="'+i18n('Eras.'+(parseInt(era)+1))+'">' + i18n('Eras.'+(parseInt(era)+1)+'.short') + '<br><small>'+HTML.Format(erasCurrent[era])+'/'+HTML.Format(erasTotal[era])+'</small></span></th>')
		}
		table.push('<th data-type="prodlist'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.era') + '</th>')
		table.push('<th data-type="prodlist'+type+'" class="is-date">'+i18n('Boxes.Productions.Headings.earning')+'</th>')
		table.push('<th data-type="prodlist'+type+'" class="no-sort"> </th>')
		table.push('</tr>')
		table.push('</thead>')
		table.push('<tbody class="prodlist'+type+'">')
		table.push( rowA.join('') )
		table.push('</tbody>');
		table.push('</table>');

		// grouped view
		table.push('<table class="foe-table sortable-table TSinactive '+type+'-group">')
		table.push('<thead class="sticky">')
		table.push('<tr>')
		table.push('<th><span class="btn change-view game-cursor" data-type="' + type + '">' + i18n('Boxes.Productions.ModeSingle') + '</span></th>')
		table.push(`<th colspan=${2+eras.length} class="textright">${HTML.Format(Object.values(erasCurrent).reduce((a,b)=>a+b))}/${HTML.Format(Object.values(erasTotal).reduce((a,b)=>a+b))}</th>`)
		table.push('</tr>')
		table.push('<tr class="sorter-header">')
		table.push('<th data-type="prodgroup'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.number') + '</th>')
		table.push('<th data-type="prodgroup'+type+'">' + i18n('Boxes.BlueGalaxy.Building') + '</th>')
		for (const era of eras) {
			table.push('<th data-type="prodgroup'+type+'" class="is-number text-center">' + i18n('Eras.'+(parseInt(era)+1)+'.short') + '</span><br><small>'+HTML.Format(erasTotal[era])+'</small></th>')
		}
		table.push('<th data-type="prodgroup'+type+'" class="is-number">' + i18n('Boxes.Productions.Headings.size') + '</th>')
		table.push('</tr>')
		table.push('</thead>')
		table.push('<tbody class="prodgroup'+type+'">')
			groupedBuildings.forEach(building => {
				rowB.push('<tr>')
				rowB.push('<td data-number="'+building.amount+'">'+building.amount+'x </td>')
				rowB.push('<td data-text="'+building.building.name.replace(/[. -]/g,"")+'"  class="' + (Allies.buildingList?.[building.building.id]?"ally" : "") +'">'+ building.building.name +'</td>')
				for (const era of eras) {
					rowB.push('<td data-number="'+building[era]+'" class="text-center">')
					rowB.push(HTML.Format(building[era]))
					rowB.push('</td>')
				}
				rowB.push('<td data-number="'+(building.building.size.length*building.building.size.width)+'">'+building.building.size.length+'x'+building.building.size.width+'</td>')
				rowB.push('</tr>')
			})
		table.push( rowB.join('') )
		table.push('</tbody>')
		table.push('</table>')

		return table.join('')
	},

	
	/**
	 * Builds and returns an HTML table displaying grouped production data.
	 *
	 * @param {string} type - The type of production.
	 * @param {Array} groupedBuildings - Array of grouped building objects.
	 * @param {number} boostCounter - Total boost value applied.
	 * @returns {string} HTML string representing the grouped production table.
	 */
	buildGroupedTable: (type, groupedBuildings, boostCounter) => {
		let tableGr = [], rowB = []
		tableGr.push('<table class="foe-table sortable-table TSinactive '+type+'-group">')
		tableGr.push('<thead class="sticky">')
		tableGr.push('<tr>')
		tableGr.push('<th colspan="7"><span class="btn change-view game-cursor" data-type="' + type + '">' + (type === "items" || type === "units" ?i18n('Boxes.Productions.ModeSum') : i18n('Boxes.Productions.ModeSingle')) + '</span></th>')
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
				rowB.push('<td data-text="'+building.building.name.replace(/[. -]/g,"")+'" class="' + (Allies.buildingList?.[building.building.id]?"ally" : "") +'">'+ building.building.name +'</td>')
				if (type.includes('att') || type.includes('def')) {
					rowB.push('<td data-number="'+building.boosts.all*building.amount+'" class="text-center">'+ (building.boosts.all !== 0 ? HTML.Format(building.boosts.all*building.amount) : '') +'</td>')
					rowB.push('<td data-number="'+building.boosts.battleground*building.amount+'" class="text-center">'+ (building.boosts.battleground !== 0 ? HTML.Format(building.boosts.battleground*building.amount) : '') +'</td>')
					rowB.push('<td data-number="'+building.boosts.guild_expedition*building.amount+'" class="text-center">'+ (building.boosts.guild_expedition !== 0 ? HTML.Format(building.boosts.guild_expedition*building.amount) : '') +'</td>')
					rowB.push('<td data-number="'+building.boosts.guild_raids*building.amount+'" class="text-center">'+ (building.boosts.guild_raids !== 0 ? HTML.Format(building.boosts.guild_raids*building.amount) : '') +'</td>')
				}
				else if (type === "items") {
					rowB.push('<td colspan="4">'+Productions.showBuildingItems(false, building.building)[0]+'</td>')
				}
				else {
					if (building.currentValues === building.values) 
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


	/**
	 * Builds and returns an HTML table displaying summarized production data for a specific type.
	 *
	 * @param {string} type - The production type.
	 * @param {number} Sum - The total production amount.
	 * @returns {string} HTML string representing the summary table.
	 */
	buildSumTable: (type,Sum) => {
		if (Object.values(Sum).length === 0) return []

		let table = []
		let elements = []
		if (type === "items") {
			elements = Object.values(Sum).sort((a,b) => a.name>b.name?1:-1)
		} else { //units
			elements = Object.values(Sum).sort((b,a) => ((a.theory?.type === "rogue"?100:0)+(a.theory?.era||0))-((b.theory?.type === "rogue"?100:0)+(b.theory?.era||0)))
		}

		table.push('<table class="foe-table '+type+'-sum">')
		table.push('<thead class="sticky">')
		table.push('<tr>')
		table.push('<th colspan="8"><span class="btn change-view game-cursor">' + i18n('Boxes.Productions.ModeSingle') + '</span></th>')
		table.push('</tr>')
		table.push('<tr >')
		table.push('<th colspan="'+(type === "items"?1:2) +'">' + i18n('Boxes.Productions.Headings.number') + '</th>')
		table.push('<th colspan="'+(type === "items"?7:6) +'" >' + (type === "items" ? i18n('Boxes.Productions.Headings.item'):i18n('Boxes.Units.Unit')) + '</th>')
		table.push('</tr>')
		table.push('</thead>')
		table.push('<tbody>')
		for (e of elements) {
			if (type === "items") {
				let amount = (e.amount ? parseFloat(Math.round(e.amount*100)/100) : "") 
							+ (e.random && e.amount ? " + " : "") 
							+ (e.random ? "Ø " + parseFloat(Math.round(e.random*100)/100) : "")
				table.push (`<tr><td class="text-right">${amount}</td><td>${(e.fragment ? "🧩 " : "" )}</td><td colspan="5">${e.name}</td></tr>`)
			} else {//units
				let currentamount = (e.current?.amount ? parseFloat(Math.round(e.current.amount*100)/100) : (e.theory?.type !== "random" ? "0" :""))

				let theoryamount =  (e.theory?.amount ? parseFloat(Math.round(e.theory.amount*100)/100) : "") 
							+ (e.theory?.random && e.theory?.amount ? " + " : "") 
							+ (e.theory?.random ? "Ø " + parseFloat(Math.round(e.theory.random*100)/100) : "")
				theoryamount = (currentamount !== "" && currentamount !== 0 && theoryamount !== "" ? "/ ":"") + theoryamount
				table.push (`<tr><td colspan="2">${currentamount} ${theoryamount}</td><td colspan="6"><span class="unit_skill ${(e.theory?.type||e.current.type).replace(/next./,"")}" title="${i18n("Boxes.Units." + (e.theory?.type||e.current.type).replace(/next./,"") )}"></span> <span>${(e.theory?.era===0 ||e.current?.era===0)? "" : i18n('Eras.'+(e.theory?.era||e.current?.era))}</span></td></tr>`)
			}
		}
		table.push('</tbody>')
		table.push('</table>')

		return table
	},
});
