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

	/**
	 * Returns the bonuses of a placed great building. Supports both the classic
	 * single `bonus` field and the `bonuses` array of the multi-tier rework —
	 * worlds without the rework already carry `bonuses` as an EMPTY array next
	 * to the filled classic field, so only a non-empty array counts.
	 *
	 * @param {Object} data - The placed building entity.
	 * @returns {Object[]} The bonus list, empty for buildings without bonuses.
	 */
	getGBBonuses(data) {
		return (data.bonuses?.length ? data.bonuses : (data.bonus ? [data.bonus] : []));
	},


	/**
	 * Determines the population value of a building: positive for provided
	 * population (e.g. residential), negative for required population (e.g. military).
	 *
	 * @param {Object} metaData - The city entity meta data.
	 * @param {Object} data - The placed building entity.
	 * @param {string} era - The era name of the building.
	 * @returns {number} The population value.
	 */
	setPopulation(metaData, data, era) {
		const eraId = Technologies.InnoEras[era];

		if (metaData.__class__ !== 'GenericCityEntity') { // not a generic building
			if (metaData.entity_levels.length > 0) { // special building
				const level = metaData.entity_levels[eraId];
				if (level.required_population) return level.required_population * -1; // needs population, e.g. military
				if (level.provided_population) return level.provided_population; // provides population, e.g. residential
			}
			else if (metaData.requirements?.cost) {
				if (metaData.type === 'decoration') return 0;
				if (metaData.type === 'greatbuilding') {
					const populationBonus = this.getGBBonuses(data).find(bonus => bonus.type === 'population');
					if (populationBonus) return populationBonus.value;
				}

				return metaData.requirements.cost.resources.population * -1;
			}
		}
		else if (metaData.components[era]) { // (time) limited buildings lose their era data after expiring
			const staticResources = metaData.components[era].staticResources;
			if (staticResources) return staticResources.resources.resources.population;
		}

		return 0;
	},


	/**
	 * Determines the happiness value of a building, doubled while polished.
	 *
	 * @param {Object} metaData - The city entity meta data.
	 * @param {Object} data - The placed building entity.
	 * @param {string} era - The era name of the building.
	 * @returns {number|undefined} The happiness value; undefined for generic buildings without era data.
	 */
	setHappiness(metaData, data, era) {
		const eraId = Technologies.InnoEras[era];
		const isPolivated = CityBuildings.setPolivation(data, metaData);

		if (metaData.__class__ !== 'GenericCityEntity') {
			if (metaData.entity_levels.length > 0) { // special building
				const provided = metaData.entity_levels[eraId].provided_happiness;
				if (provided) return (data?.state?.__class__ === 'PolishedState' ? provided * 2 : provided);
				return 0;
			}
			const gbBonuses = CityBuildings.getGBBonuses(data);
			if (gbBonuses.length > 0) { // great building, e.g. Alcatraz
				return (gbBonuses.find(bonus => bonus.type === 'happiness')?.value || 0);
			}
			if (metaData.provided_happiness) { // decorations etc.
				return (isPolivated ? metaData.provided_happiness * 2 : metaData.provided_happiness);
			}
			return 0;
		}

		// generic building
		if (metaData.components[era]) {
			return metaData.components[era].happiness?.provided || 0;
		}
		if (metaData.components.AllAge) {
			const provided = metaData.components.AllAge.happiness?.provided || 0;
			return (isPolivated ? provided * 2 : provided);
		}
	},


	/**
	 * Determines the current motivation/polish state of a building.
	 *
	 * @param {Object} data - The placed building entity.
	 * @param {Object} metaData - The city entity meta data.
	 * @returns {boolean|undefined} True if motivated/polished, false if not, undefined if the building cannot be motivated or polished.
	 */
	setPolivation(data, metaData) {
		let isPolivationable = false;
		let isPolishable = false;

		metaData.abilities.forEach(ability => {
			if (ability.__class__ === 'MotivatableAbility') {
				isPolivationable = true;
			}
			else if (ability.__class__ === 'PolishableAbility') {
				isPolivationable = true;
				isPolishable = true;
			}
		});
		if (metaData.__class__ === 'GenericCityEntity') {
			isPolivationable = (metaData.components.AllAge.socialInteraction !== undefined);
		}

		if (!isPolivationable) return undefined;

		if (metaData.__class__ !== 'GenericCityEntity') {
			if (data?.state?.boosted) return data.state.boosted;
			if (data?.state?.is_motivated) return true;
			if (isPolishable && data?.state?.next_state_transition_in) return true; // decorations etc.
			return false;
		}

		// generic buildings
		const state = data?.state;
		if (state?.socialInteractionStartedAt > 0) {
			if (state.socialInteractionId === 'polish') {
				return (state.socialInteractionStartedAt + 43200 - parseInt(Date.now() / 1000) >= 0);
			}
			if (state.socialInteractionId === 'motivate') return true;
		}
		return false;
	},


	/**
	 * Checks whether a building can be motivated or polished at all.
	 *
	 * @param {Object} metaData - The city entity meta data.
	 * @returns {boolean}
	 */
	setPolivationable(metaData) {
		if (metaData.__class__ === 'GenericCityEntity') {
			return (metaData.components.AllAge.socialInteraction !== undefined);
		}
		return metaData.abilities.some(ability => ability.__class__ === 'MotivatableAbility' || ability.__class__ === 'PolishableAbility');
	},


	/**
	 * Extracts the chain info of a building.
	 *
	 * @param {Object} metaData - The city entity meta data.
	 * @returns {Object|undefined} Chain info { name, type, chainPosX, chainPosY }, or undefined if the building is not part of a chain.
	 */
	setChainBuilding(metaData) {
		let chainId = undefined;
		let type = null,
			x = 0,
			y = 0;

		if (metaData.__class__ === 'GenericCityEntity') {
			chainId = metaData.components?.AllAge?.chain?.chainId;
			type = (metaData.components?.AllAge?.chain?.config?.__class__ === 'ChainStartConfig' ? 'start' : 'link');
			// currently all chains only have ONE side where you can attach buildings (except mughals main building and hippodrome tracks)
			x = metaData.components?.AllAge?.chain?.linkPositions[0].topLeftPoint.x || 0;
			y = metaData.components?.AllAge?.chain?.linkPositions[0].topLeftPoint.y || 0;
		}
		else {
			metaData.abilities.forEach(ability => {
				if (ability.chainId) {
					chainId = ability.chainId;
					type = (ability.__class__ === 'ChainStartAbility' ? 'start' : 'link');
					// currently all chains only have ONE side where you can attach buildings (except mughals main building and hippodrome tracks)
					x = ability.linkPositions[0].topLeftPoint.x || 0;
					y = ability.linkPositions[0].topLeftPoint.y || 0;
				}
			});
		}

		if (chainId !== undefined) {
			return { name: chainId, type: type, chainPosX: x, chainPosY: y };
		}
	},


	/**
	 * Merges a chain of linked buildings into one virtual building: sums up
	 * size, happiness, boosts and productions and re-rates the result.
	 *
	 * @param {Object[]} [allLinkedBuildings=[]] - The chain buildings, the start building first.
	 * @returns {Object} The merged chain building.
	 */
	createChainedBuilding(allLinkedBuildings = []) {
		const chainedBuilding = allLinkedBuildings[0]; // first building is the start building

		for (const link of allLinkedBuildings) {
			if (link.chainBuilding.type === 'start') continue;

			chainedBuilding.size.width += (link.coords.x !== chainedBuilding.coords.x ? link.size.width : 0);
			chainedBuilding.size.length += (link.coords.y !== chainedBuilding.coords.y ? link.size.length : 0);
			chainedBuilding.happiness += link.happiness;

			if (link.boosts !== undefined) {
				chainedBuilding.boosts = [...chainedBuilding.boosts || [], ...link.boosts];
			}
			if (link.production !== undefined && link.production !== false) {
				chainedBuilding.production = [...chainedBuilding.production, ...link.production];
			}
			link.chainBuilding.type = 'linked';
		}

		if (allLinkedBuildings.length > 1) {
			chainedBuilding.name += ' +' + (allLinkedBuildings.length - 1);
		}
		chainedBuilding.rating = Productions.rateBuilding(chainedBuilding);

		return chainedBuilding;
	},


	/**
	 * Extracts the set info of a building.
	 *
	 * @param {Object} metaData - The city entity meta data.
	 * @returns {Object|undefined} Set info { name }, or undefined if the building is not part of a set.
	 */
	setSetBuilding(metaData) {
		let setId = undefined;
		metaData.abilities.forEach(ability => {
			if (ability.setId) setId = ability.setId;
		});

		if (setId !== undefined) {
			return { name: setId };
		}
	},


	/**
	 * Determines the size of a building from either the legacy or the generic
	 * entity format.
	 *
	 * @param {Object} metaData - The city entity meta data.
	 * @returns {{width: number, length: number}}
	 */
	setSize(metaData) {
		if (metaData.length) {
			return { width: metaData.width, length: metaData.length };
		}
		return {
			width: metaData.components.AllAge.placement.size.x,
			length: metaData.components.AllAge.placement.size.y
		};
	},


	/**
	 * Collects all boosts of a building: ability boosts, set/chain adjacency
	 * bonuses, great building bonuses, castle system boosts, generic entity
	 * boosts and (optionally) ally boosts.
	 *
	 * @param {Object} metaData - The city entity meta data.
	 * @param {Object} data - The placed building entity.
	 * @param {string} era - The era name of the building.
	 * @param {boolean} [withAlly=true] - Include boosts of an attached ally.
	 * @returns {Object[]|undefined} The boost list, or undefined if there are no boosts.
	 */
	setBuildingBoosts(metaData, data, era, withAlly = true) {
		const eraName = (era === 'AllAge' ? 'BronzeAge' : era); // for some reason Watchtower Level 2 (example) has an era list even though the boost is the same everywhere. thx inno
		const boosts = [];
		const isSet = this.setSetBuilding(metaData);
		const isChain = this.setChainBuilding(metaData);

		/**
		 * Maps a raw boost entry into the internal boost format.
		 *
		 * @param {Object} rawBoost - Raw boost with targetedFeature, type and value.
		 * @param {Object} [extra={}] - Additional properties to merge into the boost.
		 * @returns {Object}
		 */
		const mapBoost = (rawBoost, extra = {}) => ({
			feature: rawBoost.targetedFeature,
			type: Boosts.Mapper[rawBoost.type] || [rawBoost.type],
			value: rawBoost.value,
			...extra
		});

		if (metaData.__class__ !== 'GenericCityEntity') {
			metaData.abilities.forEach(ability => {
				if (ability.boostHints) {
					ability.boostHints.forEach(abilityBoost => {
						// use the era specific boost if available, the AllAge boost otherwise
						const rawBoost = abilityBoost.boostHintEraMap[eraName] ?? abilityBoost.boostHintEraMap.AllAge;
						boosts.push(mapBoost(rawBoost));
					});
				}
				if ((isSet !== undefined && ability.__class__ === 'BonusOnSetAdjacencyAbility') || (isChain !== undefined && ability.__class__ === 'ChainLinkAbility')) {
					for (let i = 0; i < ability.bonuses.length; i++) {
						const bonus = ability.bonuses[i];
						if (bonus.boost.length === 0) continue;

						const rawBoost = bonus.boost[eraName] ?? bonus.boost.AllAge;
						if (rawBoost) {
							boosts.push(mapBoost(rawBoost, { needsLink: true, requiredLinks: i + 1 }));
						}
					}
				}
			});

			if (metaData.type === 'greatbuilding') {
				// production bonuses (rework `bonuses` array) are covered by the
				// production state and must not be counted as boosts
				for (const gbBonus of this.getGBBonuses(data)) {
					if (!gbBonus.type || gbBonus.type === 'happiness_amount' || gbBonus.type === 'population') continue;
					if (gbBonus.bonusCategory?.value === 'productionBonus') continue;

					boosts.push(mapBoost({ targetedFeature: 'all', type: gbBonus.type, value: gbBonus.value }));
				}
			}
			else if (metaData.id.includes('CastleSystem')) {
				for (const castleBoost of (Boosts?.CastleSystem || [])) {
					boosts.push(mapBoost({ targetedFeature: 'all', type: castleBoost.type, value: castleBoost.value }));
				}
			}
		}
		else {
			if (metaData.components[era]?.boosts) {
				metaData.components[era].boosts.boosts.forEach(abilityBoost => boosts.push(mapBoost(abilityBoost)));
			}

			let allAgeBoosts = metaData.components.AllAge?.boosts;
			if (metaData.components.AllAge?.chain?.config?.__class__ !== 'ChainStartConfig' && isChain) {
				allAgeBoosts = metaData.components.AllAge.chain?.config?.bonuses[0];
			}
			if (allAgeBoosts) {
				allAgeBoosts.boosts.forEach(abilityBoost => boosts.push(mapBoost(abilityBoost)));
			}
		}

		if (withAlly) {
			const allyStats = Allies.getProd(data.id || 0);
			(allyStats?.currentLevel?.boosts || allyStats?.boosts || []).forEach(abilityBoost => boosts.push(mapBoost(abilityBoost)));
		}

		return (boosts.length > 0 ? boosts : undefined);
	},


	/**
	 * Determines the production state of a building.
	 *
	 * @param {Object} data - The placed building entity.
	 * @returns {string} One of 'idle', 'collectable', 'plundered' or 'producing'.
	 */
	setState(data) {
		const stateClass = data?.state?.__class__;

		if ((stateClass === 'IdleState' && !data?.cityentity_id?.includes('CastleSystem')) || stateClass === undefined) return 'idle';
		if (stateClass === 'ProductionFinishedState') return 'collectable';
		if (stateClass === 'PlunderedState') return 'plundered';
		return 'producing';
	},


	/**
	 * Checks whether a building counts as special building.
	 *
	 * @param {Object} metaData - The city entity meta data.
	 * @returns {boolean}
	 */
	isSpecialBuilding(metaData) {
		if (metaData.__class__ === 'GenericCityEntity') {
			return true; // generic buildings are always special
		}
		return metaData.is_special;
	},


	/**
	 * Determines the required street connection level of a building.
	 *
	 * @param {Object} metaData - The city entity meta data.
	 * @returns {number} 0 if no street is needed, 1 for street, 2 for two lane street.
	 */
	needsStreet(metaData) {
		let needsStreet = metaData.requirements?.street_connection_level;

		if (needsStreet === undefined) {
			if (metaData.abilities.some(ability => ability.__class__ === 'StreetConnectionRequirementComponent')) {
				needsStreet = 1;
			}
			if (metaData.components?.AllAge?.streetConnectionRequirement !== undefined) {
				needsStreet = metaData.components.AllAge.streetConnectionRequirement.requiredLevel;
			}
		}

		return (needsStreet === undefined ? 0 : needsStreet);
	},


	/**
	 * Determines when the current production of a building finishes.
	 *
	 * @param {Object} data - The placed building entity.
	 * @returns {{at: number|undefined, in: number|undefined}} Finish timestamp and remaining seconds.
	 */
	setStateTimes(data) {
		const state = this.setState(data);

		if (state === 'producing') {
			if (data.cityentity_id.includes('CastleSystem')) {
				return {
					at: MainParser.CastleSystemChest.dailyRewardCollectionAvailableAt,
					in: MainParser.CastleSystemChest.dailyRewardCollectionAvailableAt - parseInt(Date.now() / 1000)
				};
			}
			return { at: data?.state?.next_state_transition_at, in: data?.state?.next_state_transition_in };
		}
		if (state === 'collectable') {
			return { at: moment().unix(), in: 0 };
		}
		return { at: undefined, in: undefined };
	},


	/**
	 * Checks whether a (time) limited building has expired. A re-ascended
	 * building keeps a stale decayedFromCityEntityId until the next full
	 * reload, so it only counts as expired while its current version is not
	 * itself time limited.
	 *
	 * @param {Object} data - The placed building entity.
	 * @returns {boolean}
	 */
	isExpiredBuilding(data) {
		return (data.type === 'generic_building' && data.decayedFromCityEntityId !== undefined
			&& !MainParser.CityEntities?.[data.cityentity_id]?.components?.AllAge?.limited?.config?.expireTime);
	},


	/**
	 * Determines the limit of a limited building.
	 *
	 * @param {Object} metaData - The city entity meta data.
	 * @returns {number|boolean} The expire time or collection amount, or false if the building is not limited.
	 */
	isLimitedBuilding(metaData) {
		const limitedConfig = metaData.components?.AllAge?.limited?.config;
		if (limitedConfig !== undefined) {
			if (limitedConfig.expireTime !== undefined) return limitedConfig.expireTime;
			if (limitedConfig.collectionAmount !== undefined) return limitedConfig.collectionAmount;
		}
		return false;
	},


	/**
	 * Checks whether the production of a building can be boosted.
	 * Great buildings, the main building, the castle system and wishing well
	 * type buildings are not boostable.
	 *
	 * @param {Object} metaData - The city entity meta data.
	 * @returns {boolean}
	 */
	isBoostableBuilding(metaData) {
		if (metaData.type === 'greatbuilding' || metaData.type === 'main_building') {
			return false;
		}
		// castle system and wishingwell types
		const excludedIds = ['CastleSystem', 'L_AllAge_EasterBonus1', 'L_AllAge_Expedition16', 'L_AllAge_ShahBonus17'];
		return !excludedIds.some(id => metaData.id.includes(id));
	},


	/**
	 * Determines when the construction of a building finishes.
	 *
	 * @param {Object} data - The placed building entity.
	 * @returns {number|undefined} The finish timestamp, or undefined if not under construction.
	 */
	setBuildTime(data) {
		if (data.type === 'generic_building') {
			return data?.state?.constructionFinishedAt;
		}
		return undefined;
	},


	/**
	 * Checks whether a building is connected to a street (buildings without
	 * street requirement always count as connected).
	 *
	 * @param {Object} metaData - The city entity meta data.
	 * @param {Object} data - The placed building entity.
	 * @returns {boolean}
	 */
	setConnection(metaData, data) {
		return (this.needsStreet(metaData) === 0 || data?.connected === 1);
	},


	/**
	 * Recursively collects all buildings that are linked to the given chain
	 * building, following the chain direction on the map.
	 *
	 * @param {Object} building - The chain building to start from.
	 * @param {Object[]} [connectedBuildings=[]] - Accumulator for the linked buildings.
	 * @param {number} [dirX=0] - The x direction of the chain.
	 * @param {number} [dirY=0] - The y direction of the chain.
	 * @returns {Object[]} All linked buildings including the start building.
	 */
	hasLinks(building, connectedBuildings = [], dirX = 0, dirY = 0) {
		connectedBuildings.push(building);

		if (building.chainBuilding?.type === 'start') {
			dirX = (building.chainBuilding.chainPosX !== 0 ? parseInt(building.chainBuilding.chainPosX / Math.abs(building.chainBuilding.chainPosX)) : 0); // e.g. (-3/3) || 0
			dirY = (building.chainBuilding.chainPosY !== 0 ? parseInt(building.chainBuilding.chainPosY / Math.abs(building.chainBuilding.chainPosY)) : 0);
		}
		const x = building.coords.x + dirX;
		const y = building.coords.y + dirY;

		let nextBuilding = CityBuildings.getBuildingByCoords(x, y);
		let x1 = x + dirX;
		let y1 = y + dirY;
		while (nextBuilding === undefined) {
			nextBuilding = CityBuildings.getBuildingByCoords(x1, y1);
			x1 += dirX;
			y1 += dirY;
			if (x1 < 0 || y1 < 0 || x1 > 72 || y1 > 72) break; // min and max of current map
		}

		if (x < 0 || y > 72) return connectedBuildings; // min and max of current map

		if (nextBuilding === undefined || nextBuilding.chainBuilding === undefined || nextBuilding.chainBuilding?.name !== building.chainBuilding.name || nextBuilding.chainBuilding?.type === 'start') {
			return connectedBuildings;
		}

		return this.hasLinks(nextBuilding, connectedBuildings, dirX, dirY);
	},


	/**
	 * Recursively checks whether a chain building is attached to a preceding
	 * building of the same chain.
	 *
	 * @param {Object} building - The chain building to check.
	 * @param {number} [x=0] - The x offset walked so far.
	 * @param {number} [y=0] - The y offset walked so far.
	 * @returns {boolean|undefined} True if linked, false if not, undefined for buildings without chain position.
	 */
	isLinked(building, x = 0, y = 0) {
		if (typeof building?.chainBuilding?.chainPosX !== 'number') return undefined;

		const posX = building.chainBuilding.chainPosX;
		const posY = building.chainBuilding.chainPosY;
		const xNeg = (posX > 0 ? -1 : 1);
		const yNeg = (posY > 0 ? -1 : 1);
		const x1 = (posX !== 0 ? posX / Math.abs(posX) : 0) - x * xNeg;
		const y1 = (posY !== 0 ? posY / Math.abs(posY) : 0) - y * yNeg;

		if (y1 < 0 || x1 < 0 || x1 > 72 || y1 > 72) return false; // min and max of current map

		const prevBuilding = CityBuildings.getBuildingByCoords(building?.coords?.x - x1, building?.coords?.y - y1);
		if (prevBuilding !== undefined) {
			if (prevBuilding.chainBuilding === undefined || prevBuilding.chainBuilding?.name !== building.chainBuilding.name) return false;
			if (prevBuilding.chainBuilding?.type === 'linked') return true;
		}

		return this.isLinked(building, x1, y1);
	},


	/**
	 * Finds all directly adjacent buildings of the same set.
	 *
	 * @param {Object} building - The set building to check.
	 * @returns {Array} The ids of all adjacent buildings of the same set.
	 */
	findAdjacentSetBuildingByCoords(building) {
		const x = building.coords.x,
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

		const addIfSameSet = (candidate) => {
			if (candidate && candidate.setBuilding?.name === setName && candidate.id !== building.id) {
				adjacents.add(candidate.id);
			}
		};

		for (let i = 0; i < h; i++) {
			addIfSameSet(getB(x - 1, y + i)); // left
			addIfSameSet(getB(x + w, y + i)); // right
		}
		for (let i = 0; i < w; i++) {
			addIfSameSet(getB(x + i, y - 1)); // top
			addIfSameSet(getB(x + i, y + h)); // bottom
		}

		return Array.from(adjacents);
	},


	/**
	 * Collects all possible productions of a building, depending on the entity
	 * format: legacy special buildings, town hall (emissaries, guild FP),
	 * castle system, chains, generic entities and great buildings.
	 *
	 * @param {Object} metaData - The city entity meta data.
	 * @param {Object} data - The placed building entity.
	 * @param {string} era - The era name of the building.
	 * @returns {Object[]|boolean|undefined} The production list, or false/undefined if there is none.
	 */
	setAllProductions(metaData, data, era) {
		let productions = [];

		if (metaData.__class__ !== 'GenericCityEntity' && metaData.type !== 'greatbuilding') {
			if (metaData.is_special) { // special building
				if (Array.isArray(metaData.available_products)) {
					// to do: to think about: should all goods production options be gathered here?
					metaData.available_products.forEach(product => {
						if (product.name !== 'Daily Bonus') return;
						productions.push({
							type: 'resources',
							needsMotivation: false,
							resources: product.product.resources
						});
					});
				}
				if (metaData.entity_levels[Technologies.InnoEras[era]] !== undefined) { // base money is here
					const money = metaData.entity_levels[Technologies.InnoEras[era]].produced_money;
					if (money) {
						productions.push({ type: 'resources', needsMotivation: false, resources: { money: money }, doubleWhenMotivated: this.setPolivationable(metaData) });
					}
					const power = metaData.entity_levels[Technologies.InnoEras[era]].clan_power; // hall of fame lvl 1
					if (power) {
						productions.push({ type: 'guildResources', needsMotivation: false, resources: { clan_power: power }, doubleWhenMotivated: true });
					}
				}
				metaData.abilities.forEach(ability => {
					const resource = this.setOldProductionResourceFromAbility(ability, era);

					if (Object.keys(resource.resources).length > 0) {
						productions.push(resource);
					}
				});
				if (metaData.__class__ === 'CityEntityRandomProductProductionBuilding') { // if weird old building, use current production
					productions = this.setCurrentProductions(data, metaData, era);
				}
			}
			if (metaData.type === 'main_building') { // add emissary production to town hall
				MainParser.EmissaryService?.forEach(emissary => {
					productions.push({
						type: (emissary.bonus.type !== 'unit' ? 'resources' : emissary.bonus.type),
						needsMotivation: false,
						resources: (emissary.bonus.type === 'unit' ? this.setUnitReward(emissary.bonus, true) : { [emissary.bonus.subType]: emissary.bonus.amount })
					});
				});
				MainParser.BonusService?.forEach(bonus => { // guild FP
					if (bonus.type === 'daily_strategypoint') {
						productions.push({
							type: 'resources',
							needsMotivation: false,
							resources: { strategy_points: bonus.value }
						});
					}
				});
			}
			if (metaData.id.includes('CastleSystem')) { // add castle system stuff
				const currentLevel = Castle.curLevel;
				era = CurrentEra;
				if (MainParser.CastleSystemLevels[(currentLevel - 1)] !== undefined) {
					MainParser.CastleSystemLevels[(currentLevel - 1)].dailyReward[era].rewards.forEach(reward => {
						let resources = { [reward.subType]: reward.amount };
						if (reward.id.search('#') !== -1) { // "goods#random#CurrentEra#30" "goods#random#PreviousEra#15"
							const amount = reward.id.match(/\d+$/)[0];
							if (reward.id.search('goods') !== -1 && reward.id.search('CurrentEra') !== -1) {
								resources = { 'random_good_of_age': amount };
							}
							else if (reward.id.search('goods') !== -1 && reward.id.search('PreviousEra') !== -1) {
								resources = { 'random_good_of_previous_age': amount };
							}
						}
						productions.push({
							type: 'resources',
							needsMotivation: false,
							resources: resources
						});
					});
				}
			}

			const isChain = this.setChainBuilding(metaData);

			if (isChain !== undefined) {
				for (const ability of metaData.abilities) {
					if (ability.__class__ !== 'ChainLinkAbility') continue;

					for (const bonus of ability.bonuses) {
						if (bonus.revenue.length === 0) return; // note: aborts the whole collection

						const revenue = bonus.revenue[Technologies.InnoEras[era]] ?? bonus.revenue.AllAge;
						if (revenue) {
							productions.push({
								type: 'resources', // currently there are no chains that give anything else
								needsMotivation: false,
								resources: revenue.resources
							});
						}
					}
				}
			}

			return (productions?.length > 0 ? productions : false);
		}
		else if (metaData.__class__ === 'GenericCityEntity') {
			// fyi: generic_building supplies and coins are doubled when motivated if they do not need motivation
			const production = metaData.components[era]?.production || metaData.components.AllAge.production; // currently it is either allage or era, never both

			// attached chain buildings
			if (metaData.components.AllAge?.chain !== undefined && metaData.components.AllAge?.chain?.config?.__class__ !== 'ChainStartConfig') {
				// resources are located here
				const chainProductions = metaData.components.AllAge?.chain?.config?.bonuses[0]?.productions;
				if (chainProductions !== undefined) {
					for (const prod of chainProductions) {
						const resource = {
							type: 'resources',
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
							const lookUp = metaData.components.AllAge?.lookup?.rewards[prod.reward.id];
							resource.resources = {
								id: prod.reward.id,
								name: lookUp?.name,
								amount: lookUp?.amount,
								type: lookUp?.type,
								subType: lookUp?.subType
							};
							resource.type = 'genericReward';
						}
						productions.push(resource);
					}
				}
				return productions || false;
			}

			if (production) {
				if (metaData.type === 'production') { // production buildings do not have a default production
					for (const product of production.options) {
						productions.push({
							type: product.products[0].type,
							needsMotivation: false,
							doubleWhenMotivated: true,
							resources: product.products[0].playerResources?.resources, // breaks if buildings with guild resources or multiple productions are added
							time: product.time
						});
					}
					return productions;
				}
				production.options[0].products.forEach(product => {
					const resource = {
						type: product.type,
						needsMotivation: (product.onlyWhenMotivated === true),
						doubleWhenMotivated: false,
						resources: {}
					};
					if (product.type === 'resources') {
						resource.resources = product.playerResources.resources;
						if (product.onlyWhenMotivated !== true) {
							resource.doubleWhenMotivated = true;
						}
						// make special goods their own type
						const specialGood = Object.keys(resource.resources).find(x => x.includes('special_good'));
						const resourceAmount = Object.keys(resource.resources).length;
						if (specialGood && resourceAmount === 1) {
							resource.type = 'special_goods';
						}
						else if (specialGood && resourceAmount > 1) {
							productions.push({
								type: 'special_goods',
								needsMotivation: resource.needsMotivation,
								doubleWhenMotivated: resource.doubleWhenMotivated,
								resources: { [specialGood]: resource.resources[specialGood] }
							});
							delete resource.resources[specialGood];
						}
					}
					else if (product.type === 'guildResources') {
						resource.resources = product.guildResources.resources;
					}
					else if (product.type === 'genericReward' || product.type === 'blueprint') {
						resource.resources = this.setGenericReward(product, metaData, era);

						// genericReward can also return unit rewards or goods, change type
						const objectKey = (Object.keys(resource.resources).length === 1 ? Object.keys(resource.resources)[0] : null);
						if (objectKey?.includes('good')) {
							resource.type = 'resources';
						}
						else if (objectKey !== null) {
							resource.type = 'unit';
						}
					}
					else if (product.type === 'unit') {
						resource.resources = this.setUnitReward(product);
					}
					else if (product.type === 'random') {
						if (product.products.length > 1) {
							const rewards = [];
							product.products.forEach(reward => {
								if (reward.product.type === 'genericReward') { // currently: everything but forge points
									const lookupData = metaData.components[era]?.lookup.rewards[reward.product.reward.id] || metaData.components.AllAge.lookup.rewards[reward.product.reward.id];
									let subType = lookupData.subType;
									let amount = (lookupData.totalAmount || lookupData.amount);
									let type = (lookupData.type === 'set' ? 'consumable' : lookupData.type);

									if (reward.product.reward.id.search('good') !== -1 && reward.product.reward.id.search('fragment') === -1) {
										const goodsReward = this.setGoodsRewardFromGeneric(lookupData);
										subType = Object.keys(goodsReward)[0];
										amount = Object.values(goodsReward)[0];
										type = 'goods';
									}

									rewards.push({
										id: reward.product.reward.id,
										name: this.setRewardNameFromLookupData(lookupData, metaData),
										type: type,
										subType: subType,
										amount: amount,
										dropChance: reward.dropChance,
									});
								}
								else if (reward.product.type === 'resources') {
									const rewardResources = reward.product.playerResources.resources;
									if (rewardResources.strategy_points !== undefined) { // FP
										rewards.push({
											id: null,
											type: 'resources',
											name: i18n('Boxes.OwnpartCalculator.OptionsFP'), // ugly
											subType: Object.keys(rewardResources)[0],
											amount: rewardResources.strategy_points,
											dropChance: reward.dropChance,
										});
									}
									else { // some goods, nextage are genericReward
										const resourceKey = Object.keys(rewardResources)[0];
										rewards.push({
											id: resourceKey,
											type: (resourceKey.includes('good') ? 'goods' : 'resources'),
											name: i18n('Boxes.BlueGalaxy.Goods'),
											subType: resourceKey,
											amount: Object.values(rewardResources)[0],
											dropChance: reward.dropChance,
										});
									}
								}
							});
							resource.resources = rewards;
							resource.type = 'random';
						}
					}
					else {
						console.log('setAllProductions() is missing an option for ', metaData.name);
					}
					productions.push(resource);
				});
			}

			return (productions.length > 0 ? productions : false);
		}
		else if (metaData.type === 'greatbuilding') {
			productions = this.setCurrentProductions(data, metaData, era);

			return (productions?.length > 0 ? productions : false);
		}
	},


	/**
	 * Collects the currently running productions of a building based on its
	 * production state (great buildings, castle system, generic entities etc.).
	 *
	 * @param {Object} data - The placed building entity.
	 * @param {Object} metaData - The city entity meta data.
	 * @param {string} era - The era name of the building.
	 * @returns {Object[]|undefined} The current production list, or undefined if the building is idle.
	 */
	setCurrentProductions(data, metaData, era) {
		const productions = [];
		const state = CityBuildings.setState(data);

		if (state !== 'idle') {
			if (metaData.__class__ !== 'GenericCityEntity') {
				const currentProduct = data.state.current_product;
				if (currentProduct) {
					// great buildings of the multi-tier rework carry a list of
					// products, the classic format is a single product
					for (const product of (currentProduct.products || [currentProduct])) {
						if (product.guildProduct) {
							productions.push({
								resources: product.guildProduct.resources,
								type: 'guildResources',
							});
						}
						if (product.clan_power) { // HoF
							productions.push({
								resources: { clan_power: product.clan_power },
								type: 'guildResources',
							});
						}
						if (product.product?.resources) {
							productions.push({
								resources: product.product.resources,
								type: (product.name === 'special_goods' ? 'special_goods' : 'resources'), // space carrier produces special goods
							});
						}
						if (product.goods && data.type === 'greatbuilding' && product.name === 'clan_goods') {
							const resources = {};
							product.goods.forEach(good => {
								resources[good.good_id] = good.value;
							});
							productions.push({
								resources: resources,
								type: 'guildResources',
							});
						}
						if (product.name === 'penal_unit') { // alcatraz
							productions.push({
								resources: { 'random': parseFloat(product.amount) },
								type: 'unit',
							});
						}
					}
					if (data.state.is_motivated) {
						metaData.abilities.forEach(ability => { // random units are not in the data, they are in the metaData for some reason
							if (ability.__class__ === 'RandomUnitOfAgeWhenMotivatedAbility') {
								productions.push({
									resources: { 'random': ability.amount },
									type: 'unit',
								});
							}
						});
					}
				}
				if (data.type === 'main_building') {
					return CityBuildings.setAllProductions(metaData, data, era);
				}
			}
			else if (data.state.productionOption) { // generic building
				data.state.productionOption.products.forEach(production => {
					const resource = {
						type: production.type,
						resources: {}
					};
					if (production.type === 'resources') {
						resource.resources = production.playerResources.resources;

						// check if first resource is a special good and change the type accordingly
						const specialGood = FHResourcesList.find(x => x.id === Object.keys(production.playerResources?.resources)[0] && x.abilities.specialResource?.type === 'specialResource');
						if (specialGood) {
							resource.type = 'special_goods';
						}
					}
					else if (production.type === 'guildResources') {
						resource.resources = production.guildResources.resources;
					}
					else if (production.type === 'unit') {
						resource.resources = this.setUnitReward(production);
					}
					else if (production.type === 'genericReward') {
						resource.resources = this.setGenericReward(production, metaData, era);

						const objectKey = (Object.keys(resource.resources).length === 1 ? Object.keys(resource.resources)[0] : null);
						if (objectKey?.includes('good')) {
							resource.type = 'resources';
						}
						else if (objectKey !== null) {
							resource.type = 'unit';
						}
					}
					else {
						console.log(metaData.name, 'setCurrentProductions() production is missing');
					}

					productions.push(resource);
				});
			}

			if (productions.length > 0) {
				return productions;
			}
		}

		if (data?.cityentity_id?.includes('CastleSystem')) {
			return this.setAllProductions(metaData, data, era);
		}
		return undefined;
	},


	/**
	 * Resolves a generic reward production (consumables, blueprints, goods,
	 * units, fragments etc.) into the internal reward format using the lookup
	 * rewards of the building, its chain and its set.
	 *
	 * @param {Object} product - The production entry with the reward reference.
	 * @param {Object} metaData - The city entity meta data.
	 * @param {string} era - The era name of the building.
	 * @returns {Object} The resolved reward.
	 */
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
		};

		if (product.reward.amount) amount = product.reward.amount;
		if (product.reward.totalAmount) amount = product.reward.totalAmount;

		if (metaData.components[era]) {
			const lookupRewards = structuredClone(metaData.components[era].lookup?.rewards || {});
			if (metaData.components?.AllAge?.chain) {
				MainParser.BuildingChains[metaData.components.AllAge.chain.chainId]?.cityEntityIds.forEach(chainBuilding => {
					Object.assign(lookupRewards, MainParser.CityEntities[chainBuilding]?.components?.[era]?.lookup?.rewards || {});
				});
			}
			const setId = this.setSetBuilding(metaData)?.name;
			if (setId && MainParser.BuildingSets[setId]) {
				MainParser.BuildingSets[setId].buildings.forEach(setBuilding => {
					Object.assign(lookupRewards, MainParser.CityEntities[setBuilding.cityEntityId]?.components?.[era]?.lookup?.rewards || MainParser.CityEntities[setBuilding.cityEntityId]?.components?.AllAge?.lookup?.rewards || {});
				});
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
			if (product.reward.id.includes('blueprint')) {
				if (lookupData === undefined) {
					lookupData = Object.values(lookupRewards).find(r => r.id?.includes('blueprint'));
				}
			}
			else if (product.reward.type === 'good') {
				if (lookupData === undefined) {
					lookupData = Object.values(lookupRewards).find(r => r.id?.includes('good'));
				}
			}
			else if (product.reward.id.includes('goods') && !/(fragment|rush)/.test(product.reward.id)) {
				// Handle generic goods (e.g. "current_era_goods") which might be hidden in a chest or need fallback icons
				if (lookupData === undefined) {
					lookupData = Object.values(lookupRewards).find(r => r.id?.includes('good') || r.iconAssetName?.includes('good'));
				}

				reward = {
					id: product.reward.id,
					name: (lookupData?.name ? lookupData.name.replace(/^\d+\s*/, '') : product.reward.id),
					type: 'resources',
					subType: 'good',
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
			amount = Number(lookupData.name?.replace(/^([+-]*[0-9]+?) .*/, '$1'));
			if (isNaN(amount)) amount = lookupData.amount;
		}

		let name = '';
		if (lookupData) {
			name = this.setRewardNameFromLookupData(lookupData, metaData);
		}
		else {
			console.log('setGenericReward() data missing for', metaData.name, metaData, product);
			name = 'DEFINE NAME';
		}

		// units
		if ((lookupData?.type === 'chest' && lookupData.id.search('genb_random_') !== -1 && lookupData.id.search('fragment') === -1) || lookupData?.type === 'unit' || lookupData?.icon === 'military') {
			return this.setUnitReward(product);
		}
		// wish fountain (AllProductions)
		else if (lookupData?.type === 'chest' && lookupData.id.search('fragment') !== -1) {
			lookupData.type = 'consumable';
		}
		// self aid kits have type set
		if (lookupData?.type === 'set') {
			lookupData.type = 'consumable';
			lookupData.subType = lookupData.rewards[0].subType;
		}

		if (metaData.components?.AllAge?.chain === undefined || product.reward.subType !== 'fragment') {
			reward = {
				id: product.reward.id,
				name: name,
				type: lookupData?.type || 'consumable',
				subType: lookupData?.subType,
				amount: amount, // amount can be undefined for blueprints or units if building is not motivated
				icon: lookupData?.iconAssetName
			};
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
			};
		}

		if (reward.type === 'good') {
			return this.setGoodsRewardFromGeneric(reward);
		}

		return reward;
	},


	/**
	 * Converts a generic goods reward into the internal goods resource format
	 * (e.g. `random_good_of_next_age`).
	 *
	 * @param {Object} reward - The generic goods reward.
	 * @returns {Object} Map with a single goods resource key and its amount.
	 */
	setGoodsRewardFromGeneric(reward) {
		let amount = reward.amount;

		if (reward.possible_rewards !== undefined) { // random productions
			amount = parseInt(reward.id.split('#').reverse()[0]); // grab the amount from the id "goods#random#NextEra#508"
		}

		let eraString = ''; // current era needs nothing
		let typeString = 'random_good_'; // random = one random good of the era

		if (reward.id.includes('NextEra') && !reward.id.includes('special_goods')) {
			eraString = 'next_';
		}
		else if (reward.id.includes('PreviousEra')) { // currently unused
			eraString = 'previous_';
		}
		else if (reward.id.includes('special_goods')) {
			eraString = 'any_';
			typeString = 'special_goods_';
		}

		if (reward.id.includes('each')) {
			typeString = 'all_goods_';
		}

		return { [typeString + 'of_' + eraString + 'age']: amount };
	},


	/**
	 * Converts a unit production or emissary bonus into the internal unit
	 * resource format (e.g. `{ heavy_melee: 2 }` or `{ 'next#light_melee': 1 }`).
	 *
	 * @param {Object} product - The production entry or emissary bonus.
	 * @param {boolean} [isEmissary=false] - Whether the product is an emissary bonus.
	 * @returns {Object} Map with a single unit type key and its amount.
	 */
	setUnitReward(product, isEmissary = false) {
		let amount, type;

		if (isEmissary) {
			amount = product.amount;
			if (product.id.search('#') !== -1) { // era_unit#light_melee#NextEra#1
				const prefix = (product.id.search('NextEra') !== -1 ? 'next#' : '');
				type = prefix + product.id.split('#')[1];
			}
			else {
				type = 'random';
			}
		}
		else if (product.type === 'genericReward') {
			const amountFromString = product.reward.id.match(/\d+$/);
			amount = parseInt(amountFromString ? amountFromString[0] : 1); // if its only one unit, there is no number in the string
			type = product.reward.id.replace('unit_', '').replace(/\d+/, ''); // grabs e.g. "heavy_melee" from unit_heavy_melee3 or rogue from unit_rogue3
			if (type.search('random') !== -1) type = 'random';
			if (product.reward.id.search('#') !== -1) { // era_unit#light_melee#NextEra#1
				const prefix = (product.reward.id.search('NextEra') !== -1 ? 'next#' : '');
				type = prefix + product.reward.id.split('#')[1];
			}
		}
		else if (product.type === 'unit') {
			amount = product.amount;
			type = product.unitTypeId;
		}

		return { [type]: amount };
	},


	/**
	 * Determines the display name of a reward from its lookup data,
	 * depending on the reward type (fragment, unit, blueprint, chest, ...).
	 *
	 * @param {Object} lookupData - The lookup data of the reward.
	 * @param {Object} metaData - The city entity meta data (for logging only).
	 * @returns {string} The reward name.
	 */
	setRewardNameFromLookupData(lookupData, metaData) {
		if (lookupData.subType === 'fragment') {
			return lookupData.assembledReward.name;
		}
		if (lookupData.__class__ === 'GenericRewardSet') { // this is a dirty workaround for trees of patience, because i lack patience
			return lookupData.rewards[0]?.name;
		}
		if (lookupData.subType === 'speedup_item' || lookupData.subType === 'reward_item' || lookupData.subType === 'boost_item' || lookupData.type === 'forgepoint_package' || lookupData.type === 'resource') {
			return lookupData.name;
		}
		if (lookupData.type === 'unit') { // -> (next_)light_melee
			if (lookupData.id.search('#') !== -1) { // era_unit#light_melee#NextEra#1
				const prefix = (lookupData.id.search('NextEra') !== -1 ? 'next_' : '');
				return prefix + lookupData.id.split('#')[1];
			}
			return lookupData.id.replace('unit_', '').replace(/\d+/, '');
		}
		if (lookupData.type === 'blueprint') { // id: "blueprint#random#3"
			return lookupData.name.replace(/^\+?\d+\s*/, '');
		}
		if (lookupData.type === 'chest' && lookupData.id.includes('blueprint')) { // remove +20 from the name because the amount is in the amount
			return lookupData.name.replace(/^\+?\d+\s*/, '');
		}
		if (lookupData.type === 'chest') { // chest can be: BP - see above, units, goods (next age)
			return lookupData.name;
		}
		if (lookupData.type === 'consumable') {
			return lookupData.name;
		}
		if (lookupData.type === 'good') {
			return lookupData.name.replace(/^\+?\d+\s*/, '');
		}

		console.log('setRewardNameFromLookupData(): undefined name from type', metaData.name, lookupData, lookupData.type, lookupData.subType);
		return '';
	},


	/**
	 * Converts a legacy building ability into the internal production resource
	 * format, merging era specific and AllAge resources.
	 *
	 * @param {Object} ability - The building ability.
	 * @param {string} era - The era name of the building.
	 * @returns {Object} The production resource.
	 */
	setOldProductionResourceFromAbility(ability, era) {
		const resource = {
			type: 'resources',
			needsMotivation: (ability.__class__ === 'AddResourcesAbility' || ability.__class__ === 'AddResourcesWhenMotivatedAbility'),
			resources: {}
		};

		if (ability.__class__ === 'AddResourcesToGuildTreasuryAbility') {
			resource.type = 'guildResources';
		}
		else if (ability.__class__ === 'RandomUnitOfAgeWhenMotivatedAbility') {
			resource.resources = { random: ability.amount };
			resource.type = 'unit';
		}
		else if (ability.__class__ === 'RandomChestRewardAbility') {
			resource.type = 'random';
			const rewards = [];
			ability.rewards[era].possible_rewards.forEach(reward => {
				let amount = reward.reward.amount;
				let type = reward.reward.subType;
				if (reward.reward.type === 'chest') {
					if (reward.reward.possible_rewards[0].reward.amount) {
						amount = reward.reward.possible_rewards[0].reward.amount;
					}
					type = 'random_good_of_age'; // duplicates, e.g. sunflower oil press
				}
				else if (reward.reward.type === 'good') {
					amount = reward.reward.totalAmount;
					type = 'all_goods_of_age';
				}
				else if (reward.reward.type === 'guild_goods') {
					amount = reward.reward.totalAmount;
					type = 'guild_goods';
				}

				rewards.push({
					id: reward.reward.id,
					name: (type.includes('good') ? reward.reward.name.replace(/^\d+\s*/, '') : reward.reward.name),
					type: type,
					amount: amount,
					dropChance: reward.drop_chance / 100, // the generic buildings data is 0.05 while this is 5
				});
			});
			resource.resources = rewards;
		}

		// mash all era specific and AllAge resources into one thing
		// some buildings have only AllAge productions, some have additional AllAge productions
		const additionalResources = [ability.additionalResources?.[era], ability.additionalResources?.AllAge];
		for (const product of additionalResources) {
			if (!product) continue;
			for (const [key, value] of Object.entries(product.resources)) {
				resource.resources[key] = value;
			}
		}

		return resource;
	},


	/**
	 * Finds a processed building by its id.
	 *
	 * @param {number|string} id - The building id.
	 * @returns {Object|undefined}
	 */
	getBuildingById(id) {
		return Object.values(MainParser.CityBuildingsData).find(x => x.id === id);
	},


	/**
	 * Finds a processed building by its top left coordinates.
	 *
	 * @param {number} x
	 * @param {number} y
	 * @returns {Object|undefined}
	 */
	getBuildingByCoords(x, y) {
		return Object.values(MainParser.CityBuildingsData).find(b => b.coords.x === x && b.coords.y === y);
	},


	/**
	 * Sums up the goods production of a building per era, optionally with the
	 * goods production boost applied.
	 *
	 * @param {boolean} current - Use the current production instead of all possible productions.
	 * @param {Object} building - The processed building.
	 * @param {boolean} [boosted=false] - Apply the goods production boost.
	 * @returns {Object} Goods info: { hasRandomProduction, eras: { eraId: amount } }.
	 */
	getBuildingGoodsByEra(current, building, boosted = false) {
		let productions = (current ? building.state.production : building.production);
		const goods = {
			hasRandomProduction: false,
			eras: {}
		};

		if (productions) {
			let goodsBoost = 0;
			if (boosted) {
				goodsBoost = Boosts.Sums.goods_production || 1;
			}

			// only evaluate 1 day production for production buildings
			if (building.type === 'production') {
				productions = [productions[productions.length - 1]];
			}

			for (const production of productions) {
				if (production === undefined) continue;

				if (production.type === 'resources' || production.type === 'special_goods') {
					Object.keys(production.resources).forEach(resourceName => {
						const good = GoodsList.find(x => x.id === resourceName);
						const specialGood = FHResourcesList.find(x => x.id === resourceName && x.abilities.specialResource?.type === 'specialResource');
						let goodEra = Technologies.InnoEras[building.eraName];
						let isGood = false;

						if (good !== undefined) {
							goodEra = Technologies.InnoEras[good.era];
							resourceName = good.id;
							isGood = true;
						}
						else if (specialGood !== undefined) {
							isGood = false;
						}
						else if (resourceName.includes('previous_age')) {
							goodEra = Technologies.getPreviousEraIdByCurrentEraName(building.eraName);
							isGood = true;
						}
						else if (resourceName.includes('next_age')) {
							goodEra = Technologies.getNextEraIdByCurrentEraName(building.eraName);
							isGood = true;
						}
						else if (resourceName.includes('random_good_of_') || resourceName.includes('all_goods_of_')) {
							isGood = true;
						}

						if (isGood) {
							let boostedExtra = Math.round(production.resources[resourceName] * goodsBoost / 100);
							if (resourceName.includes('all_goods_of_')) {
								boostedExtra = Math.round(production.resources[resourceName] / 5 * goodsBoost / 100) * 5;
							}

							goods.eras[goodEra] = (goods.eras[goodEra] || 0) + parseInt(production.resources[resourceName]) + boostedExtra;
						}
					});
				}
				if (production.type === 'random') { // e.g. gentania windmill, eerie terror coaster
					for (const resource of production.resources) {
						if (resource.type?.includes('good') && !resource.type?.includes('guild')) {
							goods.hasRandomProduction = true; // this is not a perfect solution, because it is general & not per good

							let goodEra;
							if (resource.type.includes('previous') || resource.subType?.toLowerCase().includes('previous') || resource.id?.toLowerCase().includes('previous')) {
								goodEra = Technologies.getPreviousEraIdByCurrentEraName(building.eraName);
							}
							else if (resource.type.includes('next') || resource.subType?.toLowerCase().includes('next') || resource.id?.toLowerCase().includes('next')) {
								goodEra = Technologies.getNextEraIdByCurrentEraName(building.eraName);
							}
							else {
								goodEra = Technologies.getEraIdByCurrentEraName(building.eraName);
							}

							const boostedExtra = Math.round(resource.amount * goodsBoost / 100);
							goods.eras[goodEra] = (goods.eras[goodEra] || 0) + parseFloat((resource.amount + boostedExtra) * resource.dropChance);
						}
					}
				}
				if (production.type === 'genericReward' && /good/.test(production.resources?.icon)) { // e.g. eco hub
					let goodEra = Technologies.InnoEras[building.eraName];
					if (production.resources.id.includes('previous')) {
						goodEra = Technologies.getPreviousEraIdByCurrentEraName(building.eraName);
					}
					else if (production.resources.icon === 'next_age_goods' || production.resources.id.includes('next')) {
						goodEra = Technologies.getNextEraIdByCurrentEraName(building.eraName);
					}

					goods.eras[goodEra] = (goods.eras[goodEra] || 0) + parseInt(production.resources.amount);
				}
			}
		}

		return goods;
	},


	/**
	 * Sums up the guild goods production of a building per era, optionally with
	 * the guild goods production boost applied (great buildings excluded).
	 *
	 * @param {boolean} current - Use the current production instead of all possible productions.
	 * @param {Object} building - The processed building.
	 * @param {boolean} [boosted=false] - Apply the guild goods production boost.
	 * @returns {Object|undefined} Guild goods info: { eras: { eraId: amount } }, or undefined if there are none.
	 */
	getBuildingGuildGoodsByEra(current, building, boosted = false) {
		const productions = (current ? building.state.production : building.production);
		const goods = {
			eras: {}
		};

		if (productions) {
			let goodsBoost = 0;
			if (boosted) {
				goodsBoost = Boosts.Sums.guild_goods_production || 1;
			}

			for (const production of productions) {
				if (production.type !== 'guildResources' || production.resources === undefined) continue;

				for (let resourceName of Object.keys(production.resources)) {
					const good = GoodsList.find(x => x.id === resourceName);
					let goodEra = Technologies.InnoEras[building.eraName];
					let isGood = false;

					if (good !== undefined) {
						goodEra = Technologies.InnoEras[good.era];
						resourceName = good.id;
						isGood = true;
					}
					else if (resourceName.includes('random_good_of_') || resourceName.includes('all_goods_of_')) {
						isGood = true;
					}

					if (isGood) {
						let boostedExtra = Math.round(production.resources[resourceName] * goodsBoost / 100);
						if (resourceName.includes('all_goods_of_')) {
							boostedExtra = Math.round(production.resources[resourceName] / 5 * goodsBoost / 100) * 5;
						}
						// dont apply boost to GBs
						if (building.type === 'greatbuilding') {
							boostedExtra = 0;
						}

						goods.eras[goodEra] = (goods.eras[goodEra] || 0) + parseInt(production.resources[resourceName]) + boostedExtra;
					}
				}
			}
		}

		if (Object.keys(goods.eras).length > 0) {
			return goods;
		}
	},


	/**
	 * Determines the type of a building.
	 *
	 * @param {Object} metaData - The city entity meta data.
	 * @returns {string}
	 */
	setType(metaData) {
		return metaData.type;
	},


	/**
	 * Checks whether a building is decayed.
	 *
	 * @param {Object} data - The placed building entity.
	 * @returns {boolean}
	 */
	setDecayed(data) {
		return (data.decayedFromCityEntityId !== undefined);
	},


	/**
	 * Checks whether a building has a pending ascended upgrade.
	 *
	 * @param {string} buildingEntityId - The entity id of the building.
	 * @returns {Promise<boolean>}
	 */
	async canAscend(buildingEntityId) {
		return (await CityMap.AscendingBuildings).hasOwnProperty(buildingEntityId);
	},


	/**
	 * Processes all placed buildings of the active map into the internal
	 * building format and stores them in `MainParser.CityBuildingsData` (or
	 * `CityMap.OtherPlayer.mapData` while visiting another player).
	 *
	 * @param {Object[]} [data] - The placed building entities; defaults to the own city map data.
	 * @param {boolean} [withAllies=true] - Include boosts of attached allies.
	 * @returns {Object} The processed buildings keyed by building id.
	 */
	createBuildings(data = Object.values(MainParser.CityMapData), withAllies = true) {
		if (ActiveMap === 'OtherPlayer') {
			data = Object.values(CityMap.OtherPlayer.mapData);
		}

		for (const building of data) {
			if (ActiveMap === 'OtherPlayer' && building.eraName !== undefined) continue;

			const metaData = Object.values(MainParser.CityEntities).find(x => x.id === building.cityentity_id);
			const era = Technologies.getEraName(building.cityentity_id, building.level);
			const newCityEntity = CityBuildings.createBuilding(metaData, era, building, withAllies);

			if (ActiveMap === 'OtherPlayer') {
				CityMap.OtherPlayer.mapData[building.id] = newCityEntity;
			}
			else {
				MainParser.CityBuildingsData[building.id] = newCityEntity;
			}
		}

		return (ActiveMap === 'OtherPlayer' ? CityMap.OtherPlayer.mapData : MainParser.CityBuildingsData);
	},


	/**
	 * Processes a single placed building into the internal building format
	 * with population, happiness, boosts, productions, state and rating.
	 *
	 * @param {Object|string} metaData - The city entity meta data or its entity id.
	 * @param {string} [era=CurrentEra] - The era name of the building.
	 * @param {Object} [data={}] - The placed building entity.
	 * @param {boolean} [withAlly=true] - Include boosts of an attached ally.
	 * @returns {Object} The processed building.
	 */
	createBuilding(metaData, era = CurrentEra, data = {}, withAlly = true) {
		if (typeof metaData === 'string') {
			metaData = MainParser.CityEntities[metaData];
		}

		const entity = {
			player_id: data.player_id || 0,
			id: data.id || 0,

			entityId: data.cityentity_id || metaData.id,
			allyRoom: metaData.components?.AllAge?.ally?.rooms[0]?.allyType || null,
			name: metaData.name,
			type: this.setType(metaData),
			eraName: ((data.cityentity_id || metaData.id).includes('CastleSystem') ? CurrentEra : era),
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
				level: (data.type === 'greatbuilding' ? data.level : null), // level also includes eraId in raw data, we do not like that
				max_level: (data.type === 'greatbuilding' ? data.max_level : null),
				isDecayed: this.setDecayed(data)
			}
		};

		entity.rating = Productions.rateBuilding(entity);

		return entity;
	},
};
