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

let CityBuildings = {

	setPopulation: (metaData, data, era) => {
		let population = 0
		let eraId = Technologies.InnoEras[era]

		if (metaData.__class__ !== "GenericCityEntity") { // not a generic building
			if (metaData.entity_levels.length > 0) {  // special building
				if (metaData.entity_levels[eraId].required_population)
					return metaData.entity_levels[eraId].required_population * -1		// needs population, e.g. military
				else if (metaData.entity_levels[eraId].provided_population)
					return metaData.entity_levels[eraId].provided_population			// provides population, e.g. residential
			}
			else if (metaData.requirements) {
				if (metaData.requirements.cost) {
					if (metaData.type === "decoration")
						return 0
					else if (metaData.type === "greatbuilding")
						if (data.bonus)
							if (data.bonus.type === "population")
								return data.bonus.value

					return metaData.requirements.cost.resources.population * -1
				}
			}
		}
		else { // generic building
			if (metaData.components[era]) { // (time) limited buildings lose their era data after expiring
				let staticResources = metaData.components[era].staticResources;
				if (staticResources) {
					population = staticResources.resources.resources.population;
					return population;
				}
			}
		}
		return population
	},


	setHappiness(metaData, data, era) {
		let happiness = 0
		let eraId = Technologies.InnoEras[era]
		let isPolivated = CityBuildings.setPolivation(data, metaData)

		let bgHappiness = data.bonus
		if (metaData.__class__ !== "GenericCityEntity") {
			if (metaData.entity_levels.length > 0) { // special building
				if (metaData.entity_levels[eraId].provided_happiness)
					return (data?.state?.__class__ === "PolishedState" ? metaData.entity_levels[eraId].provided_happiness*2 : metaData.entity_levels[eraId].provided_happiness)
				return happiness
			}
			else if (bgHappiness) { // great building, e.g. Alcatraz
				if (bgHappiness.type === "happiness")
					return bgHappiness.value
				return 0
			}
			else if (metaData.provided_happiness) { // decorations etc.
				return (isPolivated ? metaData.provided_happiness*2 : metaData.provided_happiness)
			}
			else
				return happiness
		}
		else { // generic building
			if (metaData.components[era]) {
				let bHappiness = metaData.components[era].happiness
				if (bHappiness) {
					return (bHappiness.provided ? bHappiness.provided : happiness)
				}
				return happiness
			}
			else if (metaData.components.AllAge) {
				let bHappiness = metaData.components.AllAge.happiness
				if (bHappiness) {
					if (isPolivated)
						return (bHappiness.provided ? bHappiness.provided*2 : happiness)
					else
						return (bHappiness.provided ? bHappiness.provided : happiness)
				}
				return happiness
			}
		}
	},


	setPolivation(data, metaData) {
		let isPolivationable = false;
		let isPolishable = false;
		metaData.abilities.forEach(ability => {
			if (ability.__class__ === "MotivatableAbility")
				isPolivationable = true
			else if (ability.__class__ === "PolishableAbility") {
				isPolivationable = true
				isPolishable = true
			}
		})
		if (metaData.__class__ === "GenericCityEntity")
			isPolivationable = (metaData.components.AllAge.socialInteraction !== undefined)

		if (isPolivationable) {
			if (metaData.__class__ !== "GenericCityEntity") {
				if (data?.state?.boosted)
					return data?.state?.boosted;
				else if (data?.state?.is_motivated)
					return true;
				else if (isPolishable) { // decorations etc.
					if (data?.state?.next_state_transition_in)
						return true
				}
				return false
			}
			else { // generic buildings
				if (data?.state?.socialInteractionStartedAt > 0 && data?.state?.socialInteractionId === "polish") {
					if (data?.state?.socialInteractionStartedAt + 43200 - parseInt(Date.now()/1000) < 0)
						return false
					return true
				}
				else if (data?.state?.socialInteractionStartedAt > 0 && data?.state?.socialInteractionId === "motivate")
					return true
				else
					return false
			}
		}
		return undefined
	},


	setPolivationable(metaData) {
		let isPolivationable = false
		metaData.abilities.forEach(ability => {
			if (ability.__class__ === "MotivatableAbility")
				isPolivationable = true
			else if (ability.__class__ === "PolishableAbility") {
				isPolivationable = true
			}
		})
		if (metaData.__class__ === "GenericCityEntity")
			isPolivationable = (metaData.components.AllAge.socialInteraction !== undefined)
		return isPolivationable
	},


	setChainBuilding(metaData) {
		let chainId = undefined;
		let type = null, x = 0, y = 0;
		if (metaData.__class__ === "GenericCityEntity") {
			chainId = metaData.components?.AllAge?.chain?.chainId;
			type = (metaData.components?.AllAge?.chain?.config?.__class__ === "ChainStartConfig" ? "start" : "link");
			// currently all chains only have ONE side where you can attach builidings (except mughals main building and hippodrome tracks)
			x = metaData.components?.AllAge?.chain?.linkPositions[0].topLeftPoint.x || 0;
			y = metaData.components?.AllAge?.chain?.linkPositions[0].topLeftPoint.y || 0;
		}
		else {
			metaData.abilities.forEach(ability => {
				if (ability.chainId) {
					chainId = ability.chainId
					type = (ability.__class__ === "ChainStartAbility" ? "start" : "link");
					// currently all chains only have ONE side where you can attach builidings (except mughals main building and hippodrome tracks)
					x = ability.linkPositions[0].topLeftPoint.x || 0;
					y = ability.linkPositions[0].topLeftPoint.y || 0;
				}
			});
		}
		if (chainId !== undefined)
			return { name: chainId, type: type, chainPosX: x, chainPosY: y }
	},


	createChainedBuilding(allLinkedBuildings = []) {
		let chainedBuilding = allLinkedBuildings[0]; // first building is the start building

		for (let link of allLinkedBuildings) {
			if (link.chainBuilding.type === "start") continue;
			chainedBuilding.size.width = chainedBuilding.size.width + (link.coords.x !== chainedBuilding.coords.x ? link.size.width : 0);
			chainedBuilding.size.length = chainedBuilding.size.length + (link.coords.y !== chainedBuilding.coords.y ? link.size.length : 0);
			chainedBuilding.happiness += link.happiness;

			if (link.boosts !== undefined)
				chainedBuilding.boosts = [...chainedBuilding.boosts || [], ...link.boosts];
			if (link.production !== undefined && link.production !== false) {
				chainedBuilding.production = [...chainedBuilding.production, ...link.production];
			}
			link.chainBuilding.type = "linked";
		}
		if (allLinkedBuildings.length > 1) {
			chainedBuilding.name = chainedBuilding.name + " +" + (allLinkedBuildings.length-1);
		}
		chainedBuilding.rating = Productions.rateBuilding(chainedBuilding);
		return chainedBuilding;
	},


	setSetBuilding(metaData) {
		let setId = undefined
		metaData.abilities.forEach(ability => {
			if (ability.setId)
				setId = ability.setId
		});
		if (setId !== undefined)
			return { name: setId }
	},


	setSize(metaData) {
		let size = { width: 0, length: 0 }
		if (metaData.length)
			size = { width: metaData.width, length: metaData.length }
		else {
			size.width = metaData.components.AllAge.placement.size.x
			size.length = metaData.components.AllAge.placement.size.y
		}
		return size
	},


	setBuildingBoosts(metaData, data, era, withAlly=true) {
		let eraName = (era === 'AllAge' ? 'BronzeAge' : era) // for some reason Watchtower Level 2 (example) has an era list even though the boost is the same everywhere. thx inno
		let boosts = []
		let isSet = this.setSetBuilding(metaData)
		let isChain = this.setChainBuilding(metaData)
		if (metaData.__class__ !== "GenericCityEntity") {
			metaData.abilities.forEach(ability => {
				if (ability.boostHints) {
					ability.boostHints.forEach(abilityBoost => {
						if (abilityBoost.boostHintEraMap[eraName] !== undefined) { // has different boosts for different eras
							// example data: targetedFeature: "all", type: [], value: 11
							let boost = {
								feature: abilityBoost.boostHintEraMap[eraName].targetedFeature,
								type: Boosts.Mapper[abilityBoost.boostHintEraMap[eraName].type] || [abilityBoost.boostHintEraMap[eraName].type],
								value: abilityBoost.boostHintEraMap[eraName].value
							}
							boosts.push(boost)
						}
						else { // if only AllAge boost
							let boost = {
								feature: abilityBoost.boostHintEraMap.AllAge.targetedFeature,
								type: Boosts.Mapper[abilityBoost.boostHintEraMap.AllAge.type] || [abilityBoost.boostHintEraMap.AllAge.type],
								value: abilityBoost.boostHintEraMap.AllAge.value
							}
							boosts.push(boost)
						}
					})
				}
				if ((isSet !== undefined && ability.__class__ === "BonusOnSetAdjacencyAbility") || (isChain !== undefined && ability.__class__ === "ChainLinkAbility")) {
					for (let i = 0; i < ability.bonuses.length; i++) {
						const bonus = ability.bonuses[i];
						if (bonus.boost.length === 0) continue;

						if (bonus.boost[eraName]) {
							let boost = {
								feature: bonus.boost[eraName].targetedFeature,
								type: Boosts.Mapper[bonus.boost[eraName].type] || [bonus.boost[eraName].type],
								value: bonus.boost[eraName].value,
								needsLink: true,
								requiredLinks: i + 1
							}
							boosts.push(boost)
						}
						else if (bonus.boost.AllAge) {
							let boost = {
								feature: bonus.boost.AllAge.targetedFeature,
								type: Boosts.Mapper[bonus.boost.AllAge.type] || [bonus.boost.AllAge.type],
								value: bonus.boost.AllAge.value,
								needsLink: true,
								requiredLinks: i + 1
							}
							boosts.push(boost)
						}
					}
				}
			})
			if (metaData.type === "greatbuilding") {
				if (data.bonus?.type) {
					let boost = {
						feature: "all",
						type: Boosts.Mapper[data.bonus.type] || [data.bonus.type],
						value: data.bonus.value
					}
					if (data.bonus.type !== "happiness_amount" && data.bonus.type !== "population")
						boosts.push(boost)
				}
			}
			else if (metaData.id.includes("CastleSystem")) {
				for (let castleBoost of (Boosts?.CastleSystem || [])) {
					let boost = {
						feature: "all",
						type: Boosts.Mapper[castleBoost.type] || [castleBoost.type],
						value: castleBoost.value
					}
					boosts.push(boost)
				}
			}
		}
		else {
			if (metaData.components[era]?.boosts) {
				metaData.components[era].boosts.boosts.forEach(abilityBoost => {
					let boost = {
						feature: abilityBoost.targetedFeature,
						type: Boosts.Mapper[abilityBoost.type] || [abilityBoost.type],
						value: abilityBoost.value,
					};
					boosts.push(boost);
				})
			}
			let allAgeBoosts = metaData.components.AllAge?.boosts;
			if (metaData.components.AllAge?.chain?.config?.__class__ !== "ChainStartConfig" && isChain)
				allAgeBoosts = metaData.components.AllAge.chain?.config?.bonuses[0];
			if (allAgeBoosts) {
				allAgeBoosts.boosts.forEach(abilityBoost => {
					let boost = {
						feature: abilityBoost.targetedFeature,
						type: Boosts.Mapper[abilityBoost.type] || [abilityBoost.type],
						value: abilityBoost.value,
					};
					boosts.push(boost);
				})
			}
		}
		if (withAlly) {
			let allyStats = MainParser.Allies.getProd(data.id||0)
			if (allyStats?.currentLevel?.boosts||allyStats?.boosts) {
				(allyStats?.currentLevel?.boosts||allyStats?.boosts||[]).forEach(abilityBoost => {
					let boost = {
						feature: abilityBoost.targetedFeature,
						type: Boosts.Mapper[abilityBoost.type] || [abilityBoost.type],
						value: abilityBoost.value,
					};
					boosts.push(boost)
				})
			}
		}

		if (boosts.length > 0)
			return boosts
		return undefined
	},


	setState(data) {
		if ((data?.state?.__class__ === "IdleState" && !data?.cityentity_id?.includes("CastleSystem")) || data?.state?.__class__ === undefined)
			return "idle"
		else if (data.state.__class__ === "ProductionFinishedState")
			return "collectable"
		else if (data.state.__class__ === "PlunderedState" )
			return "plundered"
		else if (data.cityentity_id.includes("CastleSystem"))
			return "producing"
		return "producing"
	},


	isSpecialBuilding(metaData) {
		if (metaData.__class__ === "GenericCityEntity")
			return true // generic buildings are always special
		return metaData.is_special
	},


	needsStreet(metaData) {
		let needsStreet = metaData.requirements?.street_connection_level
		if (needsStreet === undefined) {
			metaData.abilities.forEach(ability => {
				if (ability.__class__ === "StreetConnectionRequirementComponent")
					needsStreet = 1
			});
			if (metaData.components?.AllAge?.streetConnectionRequirement !== undefined)
				needsStreet = metaData.components.AllAge.streetConnectionRequirement.requiredLevel
		}
		return (needsStreet === undefined ? 0 : needsStreet)
	},


	setStateTimes(data) {
		let state = this.setState(data)

		if (state === "producing") {
			if (data.cityentity_id.includes("CastleSystem")) {
				return { at: MainParser.CastleSystemChest.dailyRewardCollectionAvailableAt, in: MainParser.CastleSystemChest.dailyRewardCollectionAvailableAt - parseInt(Date.now()/1000) }
			}
			return { at: data?.state?.next_state_transition_at, in: data?.state?.next_state_transition_in }
		}
		else if (state === "collectable")
			return { at: moment().unix(), in: 0 }
		return { at: undefined, in: undefined };
	},


	isExpiredBuilding(data) {
		if (data.type === "generic_building")
			if (data.decayedFromCityEntityId !== undefined)
				return true;
		return false;
	},


	isLimitedBuilding(metaData) {
		if (metaData.components?.AllAge?.limited !== undefined) {
			if (metaData.components?.AllAge?.limited.config.expireTime !== undefined)
				return metaData.components.AllAge.limited.config.expireTime
			if (metaData.components?.AllAge?.limited.config.collectionAmount !== undefined)
				return metaData.components.AllAge.limited.config.collectionAmount
		}
		return false
	},


	isBoostableBuilding(metaData) {
		if (metaData.type === 'greatbuilding' || metaData.type === 'main_building') {
			return false
		}
		else if (metaData.id.includes('CastleSystem')) {
			return false
		}
		// wishingwell types
		else if (metaData.id.includes("L_AllAge_EasterBonus1") || metaData.id.includes("L_AllAge_Expedition16") || metaData.id.includes("L_AllAge_ShahBonus17")) {
			return false
		}
		return true
	},


	setBuildTime(data) {
		if (data.type === "generic_building")
			if (data?.state?.constructionFinishedAt !== undefined)
				return data?.state?.constructionFinishedAt;
		return undefined;
	},


	setConnection(metaData, data) {
		let connected = (this.needsStreet(metaData, data) === 0)
		if (!connected)
			connected = (data?.connected === 1)
		return connected
	},


	hasLinks(building, connectedBuildings = [], dirX = 0, dirY = 0) {
		connectedBuildings.push(building);

		if (building.chainBuilding?.type === "start") {
			dirX = building?.chainBuilding?.chainPosX !== 0 ? parseInt(building?.chainBuilding?.chainPosX / Math.abs(building?.chainBuilding?.chainPosX)) : 0 // e.g. (-3/3) || 0
			dirY = building?.chainBuilding?.chainPosY !== 0 ? parseInt(building?.chainBuilding?.chainPosY / Math.abs(building?.chainBuilding?.chainPosY)) : 0
		}
		let x = building.coords.x + dirX;
		let y = building.coords.y + dirY;

		let nextBuilding = CityBuildings.getBuildingByCoords(x, y);
		let x1 = x + dirX;
		let y1 = y + dirY;
		while (nextBuilding === undefined) {
			nextBuilding = CityBuildings.getBuildingByCoords(x1, y1);
			x1 += dirX;
			y1 += dirY;
			if (x1 < 0 || y1 < 0 || x1 > 72 || y1 > 72) break; // min and max of current map
		}

		if (x < 0 || x < 0 || y > 72 || y > 72) return connectedBuildings; // min and max of current map
		else {
			if (nextBuilding === undefined || nextBuilding.chainBuilding === undefined || nextBuilding.chainBuilding?.name !== building.chainBuilding.name || nextBuilding.chainBuilding?.type === "start")
				return connectedBuildings;

			return this.hasLinks(nextBuilding, connectedBuildings, dirX, dirY);
		}
	},


	isLinked(building, x = 0, y = 0) {
		if (typeof building?.chainBuilding?.chainPosX === 'number') {
			let posX = building?.chainBuilding?.chainPosX
			let posY = building?.chainBuilding?.chainPosY
			let xNeg = posX > 0 ? -1 : 1
			let yNeg = posY > 0 ? -1 : 1
			let x1 = (posX !== 0 ? posX / Math.abs(posX) : 0) - x*xNeg
			let y1 = (posY !== 0 ? posY / Math.abs(posY) : 0) - y*yNeg

			let prevBuilding = CityBuildings.getBuildingByCoords(building?.coords?.x - x1, building?.coords?.y - y1)

			if (y1 < 0 || x1 < 0 || x1 > 72 || y1 > 72) return false // min and max of current map
			else {
				if (prevBuilding !== undefined) {
					if (prevBuilding.chainBuilding === undefined || prevBuilding.chainBuilding?.name !== building.chainBuilding.name) return false
					if (prevBuilding.chainBuilding?.name === building.chainBuilding.name && prevBuilding.chainBuilding?.type === ("linked" || "start")) {
						return true
					}
				}
				return this.isLinked(building, x1, y1)
			}
		}
	},


	findAdjacentSetBuildingByCoords(building) {
		let x = building.coords.x,
			y = building.coords.y,
			w = building.size.width,
			h = building.size.length,
			setName = building.setBuilding.name,
			adjacents = new Set(),
			allBuildings = Object.values(MainParser.CityBuildingsData);

		const getB = (tx, ty) => {
			return allBuildings.find(b =>
				tx >= b.coords.x && tx < b.coords.x + b.size.width &&
				ty >= b.coords.y && ty < b.coords.y + b.size.length
			);
		};

		for (let i = 0; i < h; i++) {
			let bL = getB(x - 1, y + i);
			if (bL && bL.setBuilding?.name === setName && bL.id !== building.id) adjacents.add(bL.id);
			let bR = getB(x + w, y + i);
			if (bR && bR.setBuilding?.name === setName && bR.id !== building.id) adjacents.add(bR.id);
		}
		for (let i = 0; i < w; i++) {
			let bT = getB(x + i, y - 1);
			if (bT && bT.setBuilding?.name === setName && bT.id !== building.id) adjacents.add(bT.id);
			let bB = getB(x + i, y + h);
			if (bB && bB.setBuilding?.name === setName && bB.id !== building.id) adjacents.add(bB.id);
		}
		return Array.from(adjacents);
	},


	setAllProductions(metaData, data, era) {
		let productions = []
		if (metaData.__class__ !== "GenericCityEntity" && metaData.type !== "greatbuilding") {
			if (metaData.is_special) { // special building
				if (metaData.available_products !== undefined) {
					// to do: to think about: should all goods production options be gathered here?
					if (Array.isArray(metaData.available_products))
						metaData.available_products.forEach(product => {
							if (product.name !== "Daily Bonus") return
							resource = {
								type: "resources",
								needsMotivation: false,
								resources: product.product.resources
							}
							productions.push(resource)
						});
				}
				if (metaData.entity_levels[Technologies.InnoEras[era]] !== undefined) { // base money is here
					let money = metaData.entity_levels[Technologies.InnoEras[era]].produced_money
					if (money)
						productions.push({ type: 'resources', needsMotivation: false, resources: { money: money }, doubleWhenMotivated: this.setPolivationable(metaData)})
					let power = metaData.entity_levels[Technologies.InnoEras[era]].clan_power // hall of fame lvl 1
					if (power)
						productions.push({ type: 'guildResources', needsMotivation: false, resources: { clan_power: power }, doubleWhenMotivated: true})
				}
				metaData.abilities.forEach(ability => {
					let resource = this.setOldProductionResourceFromAbility(ability, era)

					if (Object.keys(resource.resources).length > 0)
						productions.push(resource)
				})
				if (metaData.__class__ === "CityEntityRandomProductProductionBuilding") { // if weird old building, use current production
					productions = this.setCurrentProductions(data, metaData, era)
				}
			}
			if (metaData.type === "main_building") { // add emissary production to town hall
				MainParser.EmissaryService?.forEach(emissary => {
					let resource = {
						type: (emissary.bonus.type !== "unit" ? "resources" : emissary.bonus.type),
						needsMotivation: false,
						resources: (emissary.bonus.type === "unit" ? this.setUnitReward(emissary.bonus, true) : {[emissary.bonus.subType]: emissary.bonus.amount} )
					}
					productions.push(resource)
				})
				MainParser.BonusService?.forEach(bonus => { // guild FP
					if (bonus.type === "daily_strategypoint") {
						let resource = {
							type: "resources",
							needsMotivation: false,
							resources: { strategy_points: bonus.value}
						}
						productions.push(resource)
					}
				})
			}
			if (metaData.id.includes("CastleSystem")) { // add castle system stuff
				let currentLevel = Castle.curLevel
				era = CurrentEra
				if (MainParser.CastleSystemLevels[(currentLevel-1)] !== undefined)
					MainParser.CastleSystemLevels[(currentLevel-1)].dailyReward[era].rewards.forEach(reward => {
						let resources = {[reward.subType]: reward.amount}
						if (reward.id.search("#") !== -1) { // "goods#random#CurrentEra#30" "goods#random#PreviousEra#15"
							let amount = reward.id.match(/\d+$/)[0]
							if (reward.id.search("goods") !== -1 && reward.id.search("CurrentEra") !== -1)
								resources = { 'random_good_of_age': amount }
							else if (reward.id.search("goods") !== -1 && reward.id.search("PreviousEra") !== -1)
								resources = { 'random_good_of_previous_age': amount }
						}
						let resource = {
							type: "resources",
							needsMotivation: false,
							resources: resources
						}
						productions.push(resource)
					})
			}

			let isChain = this.setChainBuilding(metaData)

			if (isChain !== undefined) {
				for (const ability of metaData.abilities) {
					if (ability.__class__ === "ChainLinkAbility")
						for (const bonus of ability.bonuses) {
							if (bonus.revenue.length === 0) return
							else {
								if (bonus.revenue[Technologies.InnoEras[era]]) {
									let resource = {
										type: "resources", // currently there are no chains that give anything else
										needsMotivation: false,
										resources: bonus.revenue[Technologies.InnoEras[era]].resources
									}
									productions.push(resource)
								}
								else if (bonus.revenue.AllAge) {
									let resource = {
										type: "resources", // currently there are no chains that give anything else
										needsMotivation: false,
										resources: bonus.revenue.AllAge.resources
									}
									productions.push(resource)
								}
							}
						}
				}
			}

			if (productions?.length > 0)
				return productions

			return false
		}
		else if (metaData.__class__ === "GenericCityEntity") {
			// fyi: generic_building supplies and coins are doubled when motivated if they do not need motivation
			let production = metaData.components[era]?.production || metaData.components.AllAge.production; // currently it is either allage or era, never both

			// attached chain buildings
			if (metaData.components.AllAge?.chain !== undefined && metaData.components.AllAge?.chain?.config?.__class__ !== "ChainStartConfig") {
				// resources are located here
				let chainProductions = metaData.components.AllAge?.chain?.config?.bonuses[0]?.productions;
				if (chainProductions !== undefined)
					for (const prod of chainProductions) {
						let resource = {
							type: "resources",
							needsMotivation: false,
							doubleWhenMotivated: false,
							resources: undefined,
						};
						// regular resources
						if (prod.playerResources?.resources !== undefined) {
							resource.resources = prod.playerResources?.resources;
						}
						// generic reward
						else if (prod.reward !== undefined) {
							let lookUp = metaData.components.AllAge?.lookup?.rewards[prod.reward.id];
							resource.resources = {
								id: prod.reward.id,
								name: lookUp?.name,
								amount: lookUp?.amount,
								type: lookUp?.type,
								subType: lookUp?.subType
							};
							resource.type = "genericReward";
						}
						productions.push(resource);
					}
				return productions || false;
			}

			if (production) {
				if (metaData.type === "production") { // production buildings do not have a default production
					for (let product of production.options) {
						let resource = {
							type: product.products[0].type,
							needsMotivation: false,
							doubleWhenMotivated: true,
							resources: product.products[0].playerResources?.resources, // breaks if buildings with guild resources or multiple productions are added
							time: product.time
						}
						productions.push(resource)
					}
					return productions
				}
				production.options[0].products.forEach(product => {
					let resource = {
						type: product.type,
						needsMotivation: (product.onlyWhenMotivated === true),
						doubleWhenMotivated: false,
						resources: {}
					}
					if (product.type === "resources") {
						resource.resources = product.playerResources.resources;
						if (product.onlyWhenMotivated !== true)
							resource.doubleWhenMotivated = true;
						// make special goods their own type
						let specialGood = Object.keys(resource.resources).find(x => x.includes("special_good"));
						let resourceAmount = Object.keys(resource.resources).length;
						if (specialGood && resourceAmount === 1)
							resource.type = "special_goods";
						else if (specialGood && resourceAmount > 1) {
							let special_good = {
								type: "special_goods",
								needsMotivation: resource.needsMotivation,
								doubleWhenMotivated: resource.doubleWhenMotivated,
								resources: {[specialGood]:resource.resources[specialGood]}
							}
							productions.push(special_good);
							delete resource.resources[specialGood];
						}
					}
					else if (product.type === "guildResources") {
						resource.resources = product.guildResources.resources
					}
					else if (product.type === "genericReward" || product.type === "blueprint") {
						resource.resources = this.setGenericReward(product, metaData, era);

						// genericReward can also return unit rewards or goods, change type
						let objectKey = (Object.keys(resource.resources).length === 1 ? Object.keys(resource.resources)[0] : null)
						if (objectKey?.includes('good')) {
							resource.type = "resources"
						}
						else if (objectKey !== null) {
							resource.type = "unit"
						}
					}
					else if (product.type === "unit") {
						resource.resources = this.setUnitReward(product)
					}
					else if (product.type === "random") {
						let rewards = [];
						if (product.products.length > 1) {
							product.products.forEach(reward => {
								if (reward.product.type === "genericReward") { // currently: everything but forge points
									let lookupData = metaData.components[era]?.lookup.rewards[reward.product.reward.id] || metaData.components.AllAge.lookup.rewards[reward.product.reward.id]
									let subType = lookupData.subType
									let amount = (lookupData.totalAmount || lookupData.amount)
									let type = (lookupData.type === "set" ? "consumable" : lookupData.type)

									if (reward.product.reward.id.search('good') !== -1 && reward.product.reward.id.search('fragment') === -1) {
										subType = Object.keys(this.setGoodsRewardFromGeneric(lookupData))[0];
										amount = Object.values(this.setGoodsRewardFromGeneric(lookupData))[0];
										type = "goods";
									}

									let name = this.setRewardNameFromLookupData(lookupData, metaData)
									let newReward = {
										id: reward.product.reward.id,
										name: name,
										type: type,
										subType: subType,
										amount: amount,
										dropChance: reward.dropChance,
									}
									rewards.push(newReward)
								}
								else if (reward.product.type === "resources") {
									if (reward.product.playerResources.resources.strategy_points !== undefined) { // FP
										let newReward = {
											id: null,
											type: "resources",
											name: i18n('Boxes.OwnpartCalculator.OptionsFP'), // ugly
											subType: Object.keys(reward.product.playerResources.resources)[0],
											amount: reward.product.playerResources.resources.strategy_points,
											dropChance: reward.dropChance,
										}
										rewards.push(newReward)
									}
									else { // some goods, nextage are genericReward
										let type = Object.keys(reward.product.playerResources.resources)[0];
										type = type.includes("good") ? "goods" : "resources";
										let newReward = {
											id: Object.keys(reward.product.playerResources.resources)[0],
											type: type,
											name: i18n('Boxes.BlueGalaxy.Goods'),
											subType: Object.keys(reward.product.playerResources.resources)[0],
											amount: Object.values(reward.product.playerResources.resources)[0],
											dropChance: reward.dropChance,
										}
										//console.log(metaData.name, reward.product, newReward)
										rewards.push(newReward)
									}
								}
							});
							resource.resources = rewards;
							resource.type = "random"
						}
					}
					else {
						console.log("setAllProductions() is missing an option for ",metaData.name)
					}
					productions.push(resource);
				});
			}
			if (productions.length > 0)
				return productions
			return false
		}
		else if (metaData.type === 'greatbuilding') {
			productions = this.setCurrentProductions(data, metaData, era)

			if (productions?.length > 0)
				return productions
			return false
		}
	},


	setCurrentProductions(data, metaData, era) {
		let productions = [];
		let state = CityBuildings.setState(data);
		if (state !== "idle") {
			if (metaData.__class__ !== "GenericCityEntity") {
				if (data.state.current_product) {
					if (data.state.current_product.guildProduct) {
						let production = {
							resources: data.state.current_product.guildProduct.resources,
							type: "guildResources",
						}
						productions.push(production)
					}
					if (data.state.current_product.clan_power) { // HoF
						let production = {
							resources: { clan_power: data.state.current_product.clan_power },
							type: "guildResources",
						}
						productions.push(production)
					}
					if (data.state.current_product.product) {
						if (data.state.current_product.product.resources) {
							let production = {
								resources: data.state.current_product.product.resources,
								type: "resources",
							}
							if (data.state.current_product.name === 'special_goods') { // space carrier
								production.type = "special_goods"
							}
							productions.push(production)
						}
					}
					if (data.state.current_product.goods) { // great buildings
						if (data.type === "greatbuilding") {
							if (data.state.current_product.name === "clan_goods") {
								let resources = {}
								data.state.current_product.goods.forEach(good => {
									resources[good.good_id] = good.value
								})
								let production = {
									resources: resources,
									type: "guildResources",
								}
								productions.push(production)
							}
						}
					}
					if (data.state.current_product.name === 'penal_unit') { // alcatraz
						let production = {
							resources: {'random': parseFloat(data.state.current_product.amount)},
							type: "unit",
						}
						productions.push(production)
					}
					if (data.state.is_motivated) {
						metaData.abilities.forEach(ability => { // random units are not in the data, they are in the metaData for some reason
							if (ability.__class__ === "RandomUnitOfAgeWhenMotivatedAbility") {
								let production = {
									resources: { "random": ability.amount },
									type: "unit",
								}
								productions.push(production)
							}
						})
					}
				}
				if (data.type === "main_building") {
					let prod = CityBuildings.setAllProductions(metaData, data, era)
					return prod
				}
			}
			else { // generic building
				if (data.state.productionOption) {
					data.state.productionOption.products.forEach(production => {
						let resource = {
							type: production.type,
							resources: {}
						}
						if (production.type === "resources") {
							resource.resources = production.playerResources.resources;

							// check if first resource is a special good and change the type accordingly
							let specialGood = FHResourcesList.find(x => x.id === Object.keys(production.playerResources?.resources)[0] && x.abilities.specialResource?.type === "specialResource")
							if (specialGood)
								resource.type = "special_goods";
						}
						else if (production.type === "guildResources")
							resource.resources = production.guildResources.resources
						else if (production.type === "unit")
							resource.resources = this.setUnitReward(production)
						else if (production.type === "genericReward") {
							let reward = this.setGenericReward(production, metaData, era);
							resource.resources = reward;
							let objectKey = (Object.keys(resource.resources).length === 1 ? Object.keys(resource.resources)[0] : null)
							if (objectKey?.includes('good')) {
								resource.type = "resources"
							}
							else if (objectKey !== null) {
								resource.type = "unit"
							}
						}
						else
							console.log(metaData.name, "setCurrentProductions() production is missing")

						productions.push(resource)
					});
				}
			}
			if (productions.length > 0) {
				return productions
			}
		}
		if (data?.cityentity_id?.includes("CastleSystem")) {
			return this.setAllProductions(metaData, data, era)
		}
		return undefined
	},


	setGenericReward(product, metaData, era) {
		let amount = 0;
		let lookupData = false;

		let reward = {
			id: product.reward.id,
			name: '',
			type: '',
			subType: '',
			amount: amount, // amount can be undefined for blueprints or units if building is not motivated
			icon: ''
		}

		if (product.reward.amount)
			amount = product.reward.amount;
		if (product.reward.totalAmount)
			amount = product.reward.totalAmount;

		if (metaData.components[era]) {
			let lookupRewards = structuredClone(metaData.components[era].lookup?.rewards||{})
			if (metaData.components?.AllAge?.chain) {
				MainParser.BuildingChains[metaData.components.AllAge.chain.chainId]?.cityEntityIds.forEach(chainBuilding => {
					Object.assign(lookupRewards, MainParser.CityEntities[chainBuilding]?.components?.[era]?.lookup?.rewards||{})
				})
			}
			let setId = this.setSetBuilding(metaData)?.name;
			if (setId && MainParser.BuildingSets[setId]) {
				MainParser.BuildingSets[setId].buildings.forEach(setBuilding => {
					Object.assign(lookupRewards, MainParser.CityEntities[setBuilding.cityEntityId]?.components?.[era]?.lookup?.rewards || MainParser.CityEntities[setBuilding.cityEntityId]?.components?.AllAge?.lookup?.rewards || {})
				})
			}

			// 1. Try to find the reward in lookupRewards (either direct match or in a chest)
			lookupData = lookupRewards[product.reward.id];

			if (lookupData === undefined) {
				for (const key in lookupRewards) {
					if (lookupRewards[key].possible_rewards) {
						const found = lookupRewards[key].possible_rewards.find(p => p.reward.id === product.reward.id);
						if (found) {
							lookupData = found.reward;
							break;
						}
					}
				}
			}

			// 2. Type-specific handling and fallbacks
			if (product.reward.id.includes("blueprint")) {
				if (lookupData === undefined) {
					lookupData = Object.values(lookupRewards).find(r => r.id?.includes("blueprint"));
				}
			}
			else if (product.reward.type === "good") {
				if (lookupData === undefined) {
					lookupData = Object.values(lookupRewards).find(r => r.id?.includes("good"));
				}
			}
			else if (product.reward.id.includes('goods') && !/(fragment|rush)/.test(product.reward.id)) {
				// Handle generic goods (e.g. "current_era_goods") which might be hidden in a chest or need fallback icons
				if (lookupData === undefined) {
					lookupData = Object.values(lookupRewards).find(r => r.id?.includes('good') || r.iconAssetName?.includes('good'));
				}

				reward = {
					id: product.reward.id,
					name: lookupData?.name ? lookupData.name.replace(/^\d+\s*/, "") : product.reward.id,
					type: "resources",
					subType: "good",
					amount: lookupData?.totalAmount || lookupData?.amount || (product.reward.id.match(/\d+$/) ? parseInt(product.reward.id.match(/\d+$/)[0]) : 0),
					icon: lookupData?.iconAssetName
				};
				return this.setGoodsRewardFromGeneric(reward);
			}

			// For all other cases, if we found lookupData, ensure amount is set
			if (lookupData) {
				amount = amount || lookupData.totalAmount || lookupData.amount;
			}
		}
		if (amount === 0 && lookupData) {
			amount = Number(lookupData.name?.replace(/^([+-]*[0-9]+?) .*/,"$1"));
			if (isNaN(amount)) amount = lookupData.amount;
		}

		let name = ""
		if (lookupData)
			name = this.setRewardNameFromLookupData(lookupData, metaData)
		else {
			console.log("setGenericReward() data missing for", metaData.name, metaData, product);
			name = "DEFINE NAME";
		}

		// units
		if (lookupData?.type === "chest" && lookupData.id.search("genb_random_") !== -1 && lookupData.id.search("fragment") === -1 || lookupData?.type === "unit"|| lookupData?.icon === "military") {
			let units = this.setUnitReward(product)
			return units
		}
		// wish fountain (AllProductions)
		else if (lookupData?.type === "chest" && lookupData.id.search("fragment") !== -1) {
			lookupData.type = "consumable"
		}
		// self aid kits have type set
		if (lookupData?.type === "set") {
			lookupData.type = "consumable"
			lookupData.subType = lookupData.rewards[0].subType
		}

		if (metaData.components?.AllAge?.chain === undefined || (metaData.components?.AllAge?.chain !== undefined && product.reward.subType !== "fragment"))
			reward = {
				id: product.reward.id,
				name: name,
				type: lookupData?.type || "consumable",
				subType: lookupData?.subType,
				amount: amount, // amount can be undefined for blueprints or units if building is not motivated
				icon: lookupData?.iconAssetName
			}
		// chain attachments with generic production need extra handling
		else {
			reward = {
				id: product.reward.id,
				name: product.reward.name,
				type: product.reward.type,
				subType: product.reward.subType,
				amount: product.reward.amount,
				icon: product.reward.iconAssetName
			}
		}

		if (reward.type === "good")
			return this.setGoodsRewardFromGeneric(reward)

		return reward
	},


	setGoodsRewardFromGeneric(reward) {
		let amount = reward.amount


		if (reward.possible_rewards !== undefined) // random productions
			amount = parseInt(reward.id.split('#').reverse()[0]) // grab the amount from the id "goods#random#NextEra#508"

		let eraString = '' // current era needs nothing
		let typeString = 'random_good_' // random = one random good of the era

		if (reward.id.includes("NextEra") && !reward.id.includes("special_goods")) {
			eraString = 'next_'
		}
		else if (reward.id.includes("PreviousEra")) { // currently unused
			eraString = 'previous_'
		}
		else if (reward.id.includes("special_goods")) {
			eraString = 'any_'
			typeString = 'special_goods_'
		}

		if (reward.id.includes("each")) {
			typeString = 'all_goods_'
		}
		return {[typeString + 'of_' + eraString + 'age']: amount}
	},


	setUnitReward(product, isEmissary = false) {
		let amount, type
		if (isEmissary) {
			amount = product.amount
			if (product.id.search("#") !== -1) { // era_unit#light_melee#NextEra#1
				let prefix = ""
				if (product.id.search("NextEra") !== -1)
					prefix = "next#"

				type = prefix + product.id.split("#")[1]
			}
			else
				type = "random"
		}
		else if (product.type === 'genericReward') {
			let amountFromString = product.reward.id.match(/\d+$/)
			amount = parseInt(amountFromString ? amountFromString[0] : 1) 	// if its only one unit, there is no number in the string
			type = product.reward.id.replace("unit_","").replace(/\d+/,"") 	// grabs e.g. "heavy_melee" from unit_heavy_melee3 or rogue from unit_rogue3
			if (type.search("random") !== -1) type = "random"
			if (product.reward.id.search("#") !== -1) { // era_unit#light_melee#NextEra#1
				let prefix = ""
				if (product.reward.id.search("NextEra") !== -1)
					prefix = "next#"

				type = prefix + product.reward.id.split("#")[1]
			}
		}
		else if (product.type === 'unit') {
			amount = product.amount
			type = product.unitTypeId
		}
		return { [type]: amount }
	},


	setRewardNameFromLookupData(lookupData, metaData) {
		let name = ""
		if (lookupData.subType === "fragment")
			name = lookupData.assembledReward.name
		else if (lookupData.__class__ === "GenericRewardSet") // this is a dirty workaround for trees of patience, because i lack patience
			name = lookupData.rewards[0]?.name
		else if (lookupData.subType === "speedup_item" || lookupData.subType === "reward_item" || lookupData.subType === "boost_item" || lookupData.type === "forgepoint_package" || lookupData.type === "resource")
			name = lookupData.name
		else if (lookupData.type === "unit") { // -> (next_)light_melee
			if (lookupData.id.search("#") !== -1) { // era_unit#light_melee#NextEra#1
				let prefix = ""
				if (lookupData.id.search("NextEra") !== -1)
					prefix = "next_"

				name = prefix + lookupData.id.split("#")[1]
			}
			else
				name = lookupData.id.replace("unit_","").replace(/\d+/,"")
		}
		else if (lookupData.type === "blueprint")  // id: "blueprint#random#3"
			name = lookupData.name.replace(/^\+?\d+\s*/,"")
		else if (lookupData.type === "chest" && lookupData.id.includes("blueprint")) { // remove +20 from the name becuase the amount is in the amount
			name = lookupData.name.replace(/^\+?\d+\s*/,"")
		}
		else if (lookupData.type === "chest") { // chest can be: BP - see above, units, goods (next age)
			name = lookupData.name
		}
		else if (lookupData.type === "consumable")
			name = lookupData.name
		else if (lookupData.type === "good"){
			name = lookupData.name.replace(/^\+?\d+\s]*/,"")
		} else {
			console.log("setRewardNameFromLookupData(): undefined name from type", metaData.name, lookupData, lookupData.type, lookupData.subType)
		}
		return name
	},


	setOldProductionResourceFromAbility(ability, era) {
		let resource = {
			type: 'resources',
			needsMotivation: (ability.__class__ === "AddResourcesAbility" || ability.__class__ === "AddResourcesWhenMotivatedAbility"),
			resources: {}
		}
		if (ability.__class__ === "AddResourcesToGuildTreasuryAbility")
			resource.type = 'guildResources'

		else if (ability.__class__ === "RandomUnitOfAgeWhenMotivatedAbility") {
			resource.resources = { random: ability.amount }
			resource.type = 'unit'
		}
		else if (ability.__class__ === "RandomChestRewardAbility") {
			resource.type = 'random'
			let rewards = []
			ability.rewards[era].possible_rewards.forEach(reward => {
				let amount = reward.reward.amount
				let type = reward.reward.subType
				if (reward.reward.type === "chest") {
					if (reward.reward.possible_rewards[0].reward.amount)
						amount = reward.reward.possible_rewards[0].reward.amount
					type = "random_good_of_age" // duplicates, e.g. sunflower oil press
				}
				else if (reward.reward.type === "good") {
					amount = reward.reward.totalAmount
					type = "all_goods_of_age"
				}
				else if (reward.reward.type === "guild_goods") {
					amount = reward.reward.totalAmount
					type = "guild_goods"
				}

				let newReward = {
					id: reward.reward.id,
					name: (type.includes("good") ? reward.reward.name.replace(/^\d+\s*/,"") : reward.reward.name),
					type: type,
					amount: amount,
					dropChance: reward.drop_chance / 100, // the generic buildings data is 0.05 while this is 5
				}
				rewards.push(newReward)
			})
			resource.resources = rewards
		}

		let multiAgeProduct = {}
		let allAgeProduct = {}
		if (ability.additionalResources) {
			if (ability.additionalResources[era]) // MultiAge
				multiAgeProduct = ability.additionalResources[era]
			if (ability.additionalResources.AllAge)  // some buildings have only AllAge productions, some have additional AllAge productions
				allAgeProduct = ability.additionalResources.AllAge
		}

		// mash all resources into one thing
		if (Object.keys(multiAgeProduct).length > 0)
			for (const [key, value] of Object.entries(multiAgeProduct.resources))
				resource.resources[key] = value
		if (Object.keys(allAgeProduct).length > 0)
			for (const [key, value] of Object.entries(allAgeProduct.resources))
				resource.resources[key] = value

		return resource
	},


	getBuildingById(id) {
		return Object.values(MainParser.CityBuildingsData).find(x => x.id === id)
	},


	getBuildingByCoords(x,y) {
		return Object.values(MainParser.CityBuildingsData).find(b => b.coords.x === x && b.coords.y === y)
	},


	getBuildingGoodsByEra(current, building, boosted = false) {
		let productions = (current ? building.state.production : building.production)
		let goods = {
			hasRandomProduction: false,
			eras: {}
		}


		if (productions) {
			let goodsBoost = 0;
			if (boosted)
				goodsBoost = Boosts.Sums.goods_production || 1;

			// only evaluate 1 day production for production buildings
			if (building.type === "production") {
				productions = [productions[productions.length-1]];
			}

			for (let production of productions) {
				if (production === undefined) continue;

				if (production.type === 'resources' || production.type === 'special_goods') {
					Object.keys(production.resources).forEach(resourceName => {
						let good = GoodsList.find(x => x.id === resourceName)
						let specialGood = FHResourcesList.find(x => x.id === resourceName && x.abilities.specialResource?.type === "specialResource")
						let goodEra = Technologies.InnoEras[building.eraName]
						let isGood = false

						if (good !== undefined) {
							goodEra = Technologies.InnoEras[good.era]
							resourceName = good.id
							isGood = true
						}
						else if (specialGood !== undefined) {
							isGood = false
						}
						else if (resourceName.includes('previous_age')) {
							goodEra = Technologies.getPreviousEraIdByCurrentEraName(building.eraName)
							isGood = true
						}
						else if (resourceName.includes('next_age')) {
							goodEra = Technologies.getNextEraIdByCurrentEraName(building.eraName)
							isGood = true
						}
						else if (resourceName.includes('random_good_of_') || resourceName.includes('all_goods_of_')) {
							isGood = true
						}

						if (isGood) {
							let boostedExtra = Math.round(production.resources[resourceName]*goodsBoost/100)
							if (resourceName.includes('all_goods_of_'))
								boostedExtra = Math.round(production.resources[resourceName]/5*goodsBoost/100)*5;

							if (goods.eras[goodEra] === undefined)
								goods.eras[goodEra] = parseInt(production.resources[resourceName])+boostedExtra;
							else
								goods.eras[goodEra] += parseInt(production.resources[resourceName])+boostedExtra;
						}
					})
				}
				if (production.type === 'random') { // e.g. gentania windmill, eerie terror coaster
					let goodEra = Technologies.InnoEras[building.eraName]
					for (const resource of production.resources) {
						if (resource.type?.includes("good") && !resource.type?.includes("guild")) {
							goods.hasRandomProduction = true // this is not a perfect solution, because it is general & not per good

							if (resource.type.includes('previous') || resource.subType?.toLowerCase().includes('previous') || resource.id?.toLowerCase().includes('previous'))
								goodEra = Technologies.getPreviousEraIdByCurrentEraName(building.eraName);
							else if (resource.type.includes('next') || resource.subType?.toLowerCase().includes('next') || resource.id?.toLowerCase().includes('next'))
								goodEra = Technologies.getNextEraIdByCurrentEraName(building.eraName);
							else
								goodEra = Technologies.getEraIdByCurrentEraName(building.eraName);

							let boostedExtra = Math.round(resource.amount*goodsBoost/100)

							if (goods.eras[goodEra] === undefined)
								goods.eras[goodEra] = parseFloat((resource.amount + boostedExtra) * resource.dropChance);
							else
								goods.eras[goodEra] += parseFloat((resource.amount + boostedExtra) * resource.dropChance);
						}
					}
				}
				if (production.type === 'genericReward' && /good/.test(production.resources?.icon)) { // e.g. eco hub
					let goodEra = Technologies.InnoEras[building.eraName];
					if (production.resources.id.includes('previous'))
						goodEra = Technologies.getPreviousEraIdByCurrentEraName(building.eraName);
					else if (production.resources.icon === "next_age_goods" || production.resources.id.includes('next'))
						goodEra = Technologies.getNextEraIdByCurrentEraName(building.eraName);
					if (goods.eras[goodEra] === undefined)
						goods.eras[goodEra] = parseInt(production.resources.amount);
					else
						goods.eras[goodEra] += parseInt(production.resources.amount);
				}
			}
		}
		if (Object.keys(goods).length > 0) {
			return goods;
		}
	},


	getBuildingGuildGoodsByEra(current, building, boosted = false) {
		let productions = (current ? building.state.production : building.production)
		let goods = {
			eras: {}
		}
		if (productions) {
			let goodsBoost = 0;
			if (boosted)
				goodsBoost = Boosts.Sums.guild_goods_production || 1;
			for (let production of productions) {
				if (production.type !== 'guildResources' || production.resources === undefined) continue;

				for (let resourceName of Object.keys(production?.resources)) {
					let good = GoodsList.find(x => x.id === resourceName);
					let goodEra = Technologies.InnoEras[building.eraName];
					let isGood = false;

					if (good !== undefined) {
						goodEra = Technologies.InnoEras[good.era]
						resourceName = good.id
						isGood = true
					}
					else if (resourceName.includes('random_good_of_') || resourceName.includes('all_goods_of_')) {
						isGood = true
					}

					if (isGood) {
						let boostedExtra = Math.round(production.resources[resourceName]*goodsBoost/100)
						if (resourceName.includes('all_goods_of_'))
							boostedExtra = Math.round(production.resources[resourceName]/5*goodsBoost/100)*5;
						// dont apply boost to GBs
						if (building.type == "greatbuilding")
							boostedExtra = 0;

						if (goods.eras[goodEra] === undefined)
							goods.eras[goodEra] = parseInt(production.resources[resourceName])+boostedExtra;
						else
							goods.eras[goodEra] += parseInt(production.resources[resourceName])+boostedExtra;
					}
				}
			}
		}
		if (Object.keys(goods.eras).length > 0) {
			return goods;
		}
	},


	setType(metaData) {
		return metaData.type
	},


	setDecayed(data) {
		return (data.decayedFromCityEntityId !== undefined)
	},


	async canAscend(buildingEntityId) {
		return (await CityMap.AscendingBuildings).hasOwnProperty(buildingEntityId);
	},


	createBuildings(data=Object.values(MainParser.CityMapData),withAllies=true) {
		if (ActiveMap === 'OtherPlayer') {
			data = Object.values(CityMap.OtherPlayer.mapData);
		}

		for (let building of data) {
			if (ActiveMap === 'OtherPlayer' && building.eraName !== undefined) continue
			let metaData = Object.values(MainParser.CityEntities).find(x => x.id === building.cityentity_id)
			let era = Technologies.getEraName(building.cityentity_id, building.level);
			let newCityEntity = CityBuildings.createBuilding(metaData, era, building,withAllies);

			if (ActiveMap === 'OtherPlayer')
				CityMap.OtherPlayer.mapData[building.id] = newCityEntity
			else
				MainParser.CityBuildingsData[building.id] = newCityEntity
		}

		return (ActiveMap === 'OtherPlayer' ? CityMap.OtherPlayer.mapData : MainParser.CityBuildingsData)
	},


	createBuilding(metaData, era=CurrentEra, data={}, withAlly=true) {
		if (typeof(metaData)=="string") {
			metaData=MainParser.CityEntities[metaData];
		}
		let entity = {
			player_id: data.player_id||0,
			id: data.id||0,

			entityId: data.cityentity_id||metaData.id,
			allyRoom: metaData.components?.AllAge?.ally?.rooms[0]?.allyType || null,
			name: metaData.name,
			type: this.setType(metaData),
			eraName: ((data.cityentity_id||metaData.id).includes("CastleSystem") ? CurrentEra : era),
			isSpecial: this.isSpecialBuilding(metaData),
			isLimited: this.isLimitedBuilding(metaData),
			isInInventory: false,
			isBoostable: this.isBoostableBuilding(metaData),
			chainBuilding: this.setChainBuilding(metaData),
			setBuilding: this.setSetBuilding(metaData),
			size: this.setSize(metaData),

			population: this.setPopulation(metaData, data, era),
			happiness: this.setHappiness(metaData, data, era),
			needsStreet: this.needsStreet(metaData),

			boosts: this.setBuildingBoosts(metaData, data, era, withAlly),
			production: this.setAllProductions(metaData, data, era),
			rating: null,

			coords: { x: data.x || 0, y: data.y || 0 },

			state: {
				name: this.setState(data),
				times: this.setStateTimes(data),
				isPolivated: this.setPolivation(data, metaData),
				connected: this.setConnection(metaData, data), // fyi: decorations are always connected
				production: this.setCurrentProductions(data, metaData, era),
				isExpired: this.isExpiredBuilding(data),
				buildTime: this.setBuildTime(data),
				level: (data.type === "greatbuilding" ? data.level : null), // level also includes eraId in raw data, we do not like that
				max_level: (data.type === "greatbuilding" ? data.max_level : null),
				isDecayed: this.setDecayed(data)
			}
		}

		entity.rating = Productions.rateBuilding(entity);

		//if (entity.type !== "street")
		//	console.log('entity ', entity.name, entity, entity.allyRoom, data);
		return entity;
	},
};
