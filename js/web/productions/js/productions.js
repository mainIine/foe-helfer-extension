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
	],

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

	/**
	 *  Start der ganzen Prozedur
	 */
	init: () => {

		moment.locale(i18n('Local'));

		Productions.CombinedCityMapData = MainParser.CityMapData;
		if (MainParser.CityMapEraOutpostData) {
			Productions.CombinedCityMapData = Object.assign({}, Productions.CombinedCityMapData, MainParser.CityMapEraOutpostData);
		}

		// leere Arrays erzeugen
		for(let i in Productions.Types)
		{
			if (!Productions.Types.hasOwnProperty(i)) continue;

			Productions.BuildingsProducts[Productions.Types[i]] = [];
			if (Productions.Types[i] === 'goods') continue;
			Productions.BuildingsProductsGroups[ Productions.Types[i] ] = [];
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

		Productions.Boosts = [];

		for(let i in d)
		{
			if (!d.hasOwnProperty(i)) continue;

			if (d[i]['id'] >= 2000000000 && !d[i]['cityentity_id'].startsWith('V_AllAge_CastleSystem')) continue; //Exclude all off grid buildings except Castle

			// jede einzelne Produktart holen
			let building = Productions.readType(d[i]);

			// das Gebäude produziert etwas?
			if (Object.keys(building.motivatedproducts).length > 0){
				Productions.BuildingsAll.push(building);

				if (building['products']['population']) {
					PopulationSum += building['products']['population'];
				}
				if (building['products']['happiness']) {
					HappinessSum += building['products']['happiness'];
				}
			}
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
			if (!Productions.BuildingsAll.hasOwnProperty(i)) continue;

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

				if (building['products']['strategy_points']) {
					building['products']['strategy_points'] = MainParser.round(building['products']['strategy_points'] * Productions.Boosts['fp']);
				}

				if (building['motivatedproducts']['strategy_points']) {
					building['motivatedproducts']['strategy_points'] = MainParser.round(building['motivatedproducts']['strategy_points'] * Productions.Boosts['fp']);
				}
			}

			// Nach Produkt
			for (let x in building['products'])
			{
				if (!building['products'].hasOwnProperty(x))
				{
					break;
				}

				if (Productions.Types.includes(x))
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

					}
					else
					{
						Productions.BuildingsProductsGroups[x][index]['products'] += parseInt(building['products'][x]);
						Productions.BuildingsProductsGroups[x][index]['motivatedproducts'] += parseInt(building['motivatedproducts'][x]);
						Productions.BuildingsProductsGroups[x][index]['count']++;
					}
				}

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
				}
			}
		}

		Productions.showBox();
	},


	/**
	 * alle Produkte auslesen
	 *
	 * @param d
	 * @returns {{eid: *, at: *, in: *, name: *, id: *, type: *, products: *, motivatedproducts: *}}
	 */
	readType: (d) => {
		let Products = [],
			EntityID = d['cityentity_id'],
			CityEntity = MainParser.CityEntities[EntityID],
			BuildingSize = CityMap.GetBuildingSize(d);

		// Münzboost ausrechnen und bereitstellen falls noch nicht initialisiert
		if (Productions.Boosts['money'] === undefined) Productions.Boosts['money'] = ((MainParser.BoostSums['coin_production'] + 100) / 100);
		if (Productions.Boosts['supplies'] === undefined) Productions.Boosts['supplies'] = ((MainParser.BoostSums['supply_production'] + 100) / 100);
		if (Productions.Boosts['fp'] === undefined) Productions.Boosts['fp'] = ((MainParser.BoostSums['forge_points_production'] + 100) / 100);

		let era = CityMap.GetBuildingEra(d);

		let Ret = {
			name: CityEntity['name'],
			id: d['id'],
			eid: d['cityentity_id'],
			type: d['type'],
			era: era,
			at: (MainParser.getCurrentDate().getTime()) / 1000,
			in: 0
		};

		if (!BuildingSize['is_connected']) {
			Ret.at = undefined;
			Ret.in = undefined;
		}
		else if (d['state']) {
			let At = d['state']['next_state_transition_at'],
				In = d['state']['next_state_transition_in'];

			if (At) Ret.at = At;
			if (In) Ret.in = In;
		}

		let DoubleProductionWhenMotivated = false,
			DoubleHappinessWhenMotivated = false,
			IsPolivated = (d['state']['socialInteractionId'] === 'motivate' || d['state']['socialInteractionId'] === 'polish');;

		//GenericCityEntity
		if (CityEntity['components']) {
			let Products = {},
				MotivatedProducts = {};

			if(CityEntity['components']['AllAge'] && CityEntity['components']['AllAge']['tags'] && CityEntity['components']['AllAge']['tags']['tags']){
				let Tags = CityEntity['components']['AllAge']['tags']['tags'];
				for(let i = 0; i < Tags.length;i++)
				{
					let Tag = Tags[i];
					if(Tag['buildingType']){
						Ret['type'] = Tag['buildingType'];
					}
				}
			}

			if (d.state && d['state']['productionOption'] && d['state']['productionOption']['products']) {
				let CurrentProducts = d['state']['productionOption']['products'],
					ProductionName = d['state']['productionOption']['name'];

				for (let i = 0; i < CurrentProducts.length; i++) {
					let CurrentProduct = CurrentProducts[i];

					if (CurrentProduct['playerResources'] && CurrentProduct['playerResources']['resources']) {
						let Resources = CurrentProduct['playerResources']['resources'];
						for (let ResName in Resources) {
							if (!Products[ResName]) Products[ResName] = 0;
							if (!MotivatedProducts[ResName]) MotivatedProducts[ResName] = 0;

							if (!CurrentProduct['onlyWhenMotivated'] || IsPolivated) {
								Products[ResName] += Resources[ResName];
								MotivatedProducts[ResName] += Resources[ResName];
							}
						}
					}

					if (CurrentProduct['guildResources'] && CurrentProduct['guildResources']['resources']) {
						let Resources = CurrentProduct['guildResources']['resources'];

						for (let GoodID in Resources) {
							if (!Resources.hasOwnProperty(GoodID)) continue;

							let Amount = Resources[GoodID];

							if (!CurrentProduct['onlyWhenMotivated'] || IsPolivated) {
								if (!Products['clan_goods']) Products['clan_goods'] = 0;
								Products['clan_goods'] += Amount;
							}

							if (!MotivatedProducts['clan_goods']) MotivatedProducts['clan_goods'] = 0;
							MotivatedProducts['clan_goods'] += Amount;
                        }
					}
				}

				if (!IsPolivated && ProductionName) {
					if (CityEntity['components']['AllAge'] && CityEntity['components']['AllAge'] && CityEntity['components']['AllAge']['socialInteraction'] && CityEntity['components']['AllAge']['socialInteraction']['interactionType'] === 'motivate') {
						DoubleProductionWhenMotivated = true;
					}

					let LoopEras = [CurrentEra, 'AllAge'];

					for (let i = 0; i < LoopEras.length; i++) {
						let LoopEra = LoopEras[i],
							EraData = CityEntity['components'][LoopEra];

						if (EraData && EraData['production'] && EraData['production']['options']) {
							let Options = EraData['production']['options'];
							for (let j = 0; j < Options.length; j++) {
								let CurrentOption = Options[j];

								if (CurrentOption['name'] !== ProductionName) continue;

								for (let k = 0; k < CurrentOption['products'].length; k++) {
									let CurrentProduct = CurrentOption['products'][k];

									if (!CurrentProduct['onlyWhenMotivated']) continue;

									if (CurrentProduct['playerResources']) {
										let Resources = CurrentProduct['playerResources']['resources'];
										for (let ResName in Resources) {
											if (ResName.startsWith('random_good') || ResName.startsWith('all_goods')) {
												let Amount = Resources[ResName] / 5;

												let StartIndex = (era - 2) * 5;
												if(ResName.endsWith('previous_age')) StartIndex -= 5;

												if (StartIndex >= 0 && StartIndex + 5 <= GoodsList.length) {
													for (let i = 0; i < 5; i++) {
														let Resource2 = GoodsList[StartIndex + i]['id'];
														if (!Products[Resource2]) Products[Resource2] = 0;
														if (!MotivatedProducts[Resource2]) MotivatedProducts[Resource2] = 0;

														MotivatedProducts[Resource2] += Amount;
													}
												}
											}
											else {
												if (!Products[ResName]) Products[ResName] = 0;
												if (!MotivatedProducts[ResName]) MotivatedProducts[ResName] = 0;

												MotivatedProducts[ResName] += Resources[ResName];
											}

										}
									}

									if (CurrentProduct['guildResources']) {
										let Resources = CurrentProduct['guildResources']['resources'];
										if (Resources['all_goods_of_age']) {
											if (CurrentProduct['onlyWhenMotivated']) {
												if (!Products['clan_goods']) Products['clan_goods'] = 0;
												if (!MotivatedProducts['clan_goods']) MotivatedProducts['clan_goods'] = 0;

												MotivatedProducts['clan_goods'] += Resources['all_goods_of_age'];
											}										
										}
                                    }
                                }
							}
						}
					}
                }				
			}

			if (d['state'] && d['state']['__class__'] !== 'ConstructionState') {
				let EraName = Technologies.EraNames[era],
					EraComponents = CityEntity['components'][EraName];

				if (EraComponents) {
					if (EraComponents['staticResources'] && EraComponents['staticResources']['resources'] && EraComponents['staticResources']['resources']['resources']) {
						let Population = EraComponents['staticResources']['resources']['resources']['population'];
						if (Population) {
							if (!Products['population']) Products['population'] = 0;
							Products['population'] += Population;

							if (!MotivatedProducts['population']) MotivatedProducts['population'] = 0;
							MotivatedProducts['population'] += Population;
                        }
					}

					if (BuildingSize['is_connected']) {
						if (EraComponents['happiness']) {
							let Happiness = EraComponents['happiness']['provided'];

							if (Happiness) {
								if (d['state']['__class__'] === 'PolishedState') Happiness *= 2;

								if (!Products['happiness']) Products['happiness'] = 0;
								Products['happiness'] += Happiness;

								if (!MotivatedProducts['happiness']) MotivatedProducts['happiness'] = 0;
								MotivatedProducts['happiness'] += Happiness;
							}
						}

						if (EraComponents['boosts'] && EraComponents['boosts']['boosts']) {
							for (let i = 0; i < EraComponents['boosts']['boosts'].length; i++) {
								let Boost = EraComponents['boosts']['boosts'][i],
									BoostType = Boost['type'];

								if (Boost['type'] === 'att_boost_attacker' || Boost['type'] === 'att_boost_defender' || Boost['type'] === 'def_boost_attacker' || Boost['type'] === 'def_boost_defender') {

									if (!Products[BoostType]) Products[BoostType] = 0;
									Products[BoostType] += Boost['value'];

									if (!MotivatedProducts[BoostType]) MotivatedProducts[BoostType] = 0;
									MotivatedProducts[BoostType] += Boost['value'];
								}
                            }
                        }
                    }
				}
			}

			Ret.products = Products;
			Ret.motivatedproducts = MotivatedProducts;

			if (d['state'] && d['state']['productionOption'] && d['state']['productionOption']['time']) {
				Ret['dailyfactor'] = 86400 / d['state']['productionOption']['time'];
			}
			else {
				Ret['dailyfactor'] = 1;
			}
		}

		// Legacy Building
		else {
			let CurrentResources = [],
				AdditionalResources = [],
				Units;

			if (CityEntity['abilities']) {
				for (let AbilityIndex in CityEntity['abilities']) {
					if (!CityEntity['abilities'].hasOwnProperty(AbilityIndex)) continue

					let Ability = CityEntity['abilities'][AbilityIndex];

					if (Ability['__class__'] === 'DoubleProductionWhenMotivatedAbility') DoubleProductionWhenMotivated = true;
					if (Ability['__class__'] === 'PolishableAbility') DoubleHappinessWhenMotivated = true;

					if (!IsPolivated && Ability['additionalResources'] && Ability['__class__'] === 'AddResourcesWhenMotivatedAbility') {
						if (Ability['additionalResources']['AllAge'] && Ability['additionalResources']['AllAge']['resources']) {
							let NewResources = Ability['additionalResources']['AllAge']['resources'];
							for (let Resource in NewResources) {
								if (!NewResources.hasOwnProperty(Resource)) continue;

								if (Resource.startsWith('random_good') || Resource.startsWith('all_goods')) {
									let Amount = NewResources[Resource] / 5;

									let StartIndex = (era - 2) * 5;
									if (StartIndex >= 0 && StartIndex + 5 <= GoodsList.length) {
										for (let i = 0; i < 5; i++) {
											let Resource2 = GoodsList[StartIndex + i]['id'];
											if (!AdditionalResources[Resource2]) AdditionalResources[Resource2] = 0;
											AdditionalResources[Resource2] += Amount;
										}
									}
								}
								else {
									if (!AdditionalResources[Resource]) AdditionalResources[Resource] = 0;
									AdditionalResources[Resource] += NewResources[Resource];
								}
							}
						}

						let EraName = Technologies.EraNames[era];
						if (EraName && Ability['additionalResources'][EraName] && Ability['additionalResources'][EraName]['resources']) {
							let NewResources = Ability['additionalResources'][EraName]['resources'];
							for (let Resource in NewResources) {
								if (!NewResources.hasOwnProperty(Resource)) continue;
								if (!AdditionalResources[Resource]) AdditionalResources[Resource] = 0;
								AdditionalResources[Resource] += NewResources[Resource];
							}
						}
					}

					// this buildung produces random units
					else if (Ability['__class__'] === 'RandomUnitOfAgeWhenMotivatedAbility') {
						Units = Ability['amount'];
					}
				}
			}

			if (d.state && d['state']['current_product']) {
				if (d['state']['current_product']['product'] && d['state']['current_product']['product']['resources']) {
					CurrentResources = Object.assign({}, d['state']['current_product']['product']['resources']);
				}

				if (d['state']['current_product']['clan_power']) {
					CurrentResources['clan_power'] = d['state']['current_product']['clan_power']; // z.B. Ruhmeshalle
				}

				if (d['state']['current_product']['name'] === 'penal_unit') {
					CurrentResources['units'] = d['state']['current_product']['amount'];
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
						if (!d['state']['current_product']['guildProduct']['resources'].hasOwnProperty(ResourceName)) continue;

						if (ResourceName === 'clan_power') {
							CurrentResources[ResourceName] = d['state']['current_product']['guildProduct']['resources'][ResourceName];
						}
						else {
							GoodSum += d['state']['current_product']['guildProduct']['resources'][ResourceName];
						}
					}

					if (GoodSum > 0) {
						CurrentResources['clan_goods'] = GoodSum;
					}
				}
			}

			// Units filled?
			if (Units) CurrentResources['units'] = Units;

			for (let Resource in CurrentResources) {
				if (!CurrentResources.hasOwnProperty(Resource)) continue;

				if (Resource !== 'credits') { // Marscredits nicht zu den Gütern zählen
					Products[Resource] = CurrentResources[Resource];
				}
			}

			if (MainParser.Boosts[d['id']]) {
				let Boosts = MainParser.Boosts[d['id']];
				for (let i = 0; i < Boosts.length; i++) {
					let Boost = Boosts[i];

					if (Boost['type'] === 'happiness_amount') {
						Products['happiness'] = (Products['happiness'] ? Products['happiness'] : 0) + Boost['value'];
					}

					if (Boost['type'] === 'att_boost_attacker' || Boost['type'] === 'att_boost_defender' || Boost['type'] === 'def_boost_attacker' || Boost['type'] === 'def_boost_defender') {
						Products[Boost['type']] = (Products[Boost['type']] ? Products[Boost['type']] : 0) + Boost['value'];
					}
				}
			}

			if (d['bonus']) {
				let BonusType = d['bonus']['type'];
				if (BonusType === 'population' || BonusType === 'happiness') {
					Products[BonusType] = (Products[BonusType] ? Products[BonusType] : 0) + d['bonus']['value'];
				}
				else if (BonusType === 'military_boost') {
					Products['att_boost_attacker'] = (Products['att_boost_attacker'] ? Products['att_boost_attacker'] : 0) + d['bonus']['value'];
					Products['def_boost_attacker'] = (Products['def_boost_attacker'] ? Products['def_boost_attacker'] : 0) + d['bonus']['value'];
				}
				else if (BonusType === 'fierce_resistance') {
					Products['att_boost_defender'] = (Products['att_boost_defender'] ? Products['att_boost_defender'] : 0) + d['bonus']['value'];
					Products['def_boost_defender'] = (Products['def_boost_defender'] ? Products['def_boost_defender'] : 0) + d['bonus']['value'];
				}
				else if (BonusType === 'advanced_tactics') {
					Products['att_boost_attacker'] = (Products['att_boost_attacker'] ? Products['att_boost_attacker'] : 0) + d['bonus']['value'];
					Products['att_boost_defender'] = (Products['att_boost_defender'] ? Products['att_boost_defender'] : 0) + d['bonus']['value'];
					Products['def_boost_attacker'] = (Products['def_boost_attacker'] ? Products['def_boost_attacker'] : 0) + d['bonus']['value'];
					Products['def_boost_defender'] = (Products['def_boost_defender'] ? Products['def_boost_defender'] : 0) + d['bonus']['value'];
				}
			}

			if (d['state'] && d['state']['__class__'] !== 'ConstructionState') {

				if (CityEntity['staticResources'] && CityEntity['staticResources']['resources'] && CityEntity['staticResources']['resources']['population']) {
					Products['population'] = (Products['population'] ? Products['population'] : 0) + CityEntity['staticResources']['resources']['population'];
				}

				if (CityEntity['provided_happiness'] && BuildingSize['is_connected']) {
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

			if (d['cityentity_id'].startsWith('V_AllAge_CastleSystem')) {
				Ret.at = undefined;
				Ret.in = undefined;

				//Boosts
				for (let i in MainParser.Boosts) {
					if (!MainParser.Boosts.hasOwnProperty(i)) continue;

					let BoostList = MainParser.Boosts[i],
						NewBoostList = [];

					for (let j = 0; j < BoostList.length; j++) {
						let Boost = BoostList[j];

						if (Boost['origin'] !== 'castle_system') continue;

						if (MainParser.BoostMapper[Boost['type']]) {
							let MappedBoosts = MainParser.BoostMapper[Boost['type']];
							for (let k = 0; k < MappedBoosts.length; k++) {
								let NewBoost = Object.assign({}, Boost);
								NewBoost['type'] = MappedBoosts[k];
								NewBoostList.push(NewBoost);
							}
						}
						else {
							NewBoostList.push(Boost);
						}
					}

					for (let j = 0; j < NewBoostList.length; j++) {
						let Boost = NewBoostList[j];

						let ResName = Boost['type'],
							Value = Boost['value'];

						if (!Productions.Types.includes(ResName)) continue;

						if (!Products[ResName]) Products[ResName] = 0;
						Products[ResName] += Value;
					}
				}

				//Daily Chest
				let CastleLevel,
					CastlePoints = ResourceStock['castle_points'] | 0;

				for (let i=0; i < MainParser.CastleSystemLevels.length; i++) {
					let NextLevel = MainParser.CastleSystemLevels[i];
					if (CastlePoints < NextLevel['requiredPoints']) break;
					CastleLevel = NextLevel;
				}			

				if (CastleLevel) {
					let DailyReward = CastleLevel['dailyReward'][CurrentEra];

					for (let i = 0; i < DailyReward['rewards'].length; i++) {
						let Reward = DailyReward['rewards'][i];
						let Resources = Productions.CalcAverageRewards(Reward);

						for (let ResName in Resources) {
							if (!Resources.hasOwnProperty(ResName)) continue;

							if (!Products[ResName]) Products[ResName] = 0;
							Products[ResName] += Resources[ResName];
                        }
                    }
                }
				
			}
			else if(d['id'] === 1) {
				// Botschafter durchsteppen
				if (MainParser.EmissaryService !== null) {

					for (let i in MainParser.EmissaryService) {
						if (!MainParser.EmissaryService.hasOwnProperty(i)) continue;

						let Emissary = MainParser.EmissaryService[i],
							ResName = (Emissary['bonus']['type'] === 'unit' ? 'units' : Emissary['bonus']['subType']);

						if (!Products[ResName]) Products[ResName] = 0;
						Products[ResName] += Emissary['bonus']['amount'];
					}
				}

				// es gibt min 1 täglichen FP
				if (MainParser.BonusService !== null) {
					let FPBonus = MainParser.BonusService.find(o => (o['type'] === 'daily_strategypoint'));

					if (FPBonus && FPBonus['value']) {
						if (!Products['strategy_points']) Products['strategy_points'] = 0;
						Products['strategy_points'] += FPBonus['value'];
					}
				}
            }

			let AdditionalProduct,
				MotivatedProducts = [];

			for (let ProductName in Products) {
				let MotivationFactor;
				if ((ProductName === 'money' || ProductName === 'supplies' || ProductName === 'clan_power') && DoubleProductionWhenMotivated && !IsPolivated) {
					MotivationFactor = 2;
				}
				else if (ProductName === 'happiness' && DoubleHappinessWhenMotivated && IsPolivated){
					MotivationFactor = 2;
                }
				else { //Keine Doppelproduktion durch Motivierung oder schon motiviert
					MotivationFactor = 1;
				}

				MotivatedProducts[ProductName] = Products[ProductName] * MotivationFactor;
			}

			for (let Resource in AdditionalResources) {
				if (!AdditionalResources.hasOwnProperty(Resource)) continue;

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

			Ret.products = Products;
			Ret.motivatedproducts = MotivatedProducts;

			if (d['state'] && d['state']['current_product'] && d['state']['current_product']['production_time']) {
				Ret['dailyfactor'] = 86400 / d['state']['current_product']['production_time'];
			}
			else {
				Ret['dailyfactor'] = 1;
			}
		}

		return Ret;
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

		// einzelne Güterarten durchsteppen
		for(let pt in Productions.Types)
		{
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
				for (let i in Productions.CombinedCityMapData) {
					if (!Productions.CombinedCityMapData.hasOwnProperty(i)) continue;

					let BuildingSize = CityMap.GetBuildingSize(Productions.CombinedCityMapData[i]);

					sizes[Productions.CombinedCityMapData[i]['cityentity_id']] = BuildingSize['total_area'];
					sizetooltips[Productions.CombinedCityMapData[i]['cityentity_id']] = (BuildingSize['street_area'] > 0 ? HTML.i18nReplacer(i18n('Boxes.Productions.SizeTT'), { 'streetnettosize': BuildingSize['street_area'] }) : '');
	            }

			// einen Typ durchsteppen [money,supplies,strategy_points,...]
			for(let i in buildings)
			{
				if(buildings.hasOwnProperty(i))
				{
					if(type !== 'goods')
					{
						let ProductCount = Productions.GetDaily(buildings[i]['products'][type], buildings[i]['dailyfactor'], type),
							MotivatedProductCount = Productions.GetDaily(buildings[i]['motivatedproducts'][type], buildings[i]['dailyfactor'], type);

						countAll += ProductCount;
						countAllMotivated += MotivatedProductCount;
						countAllDone += (buildings[i]['at'] * 1000 < MainParser.getCurrentDateTime() ? ProductCount : 0);

						rowA.push('<tr>');
						rowA.push('<td data-text="' + buildings[i]['name'].cleanup() + '">' + buildings[i]['name'] + '</td>');
						rowA.push('<td class="text-right is-number" data-number="' + MotivatedProductCount + '">' + HTML.Format(ProductCount) + (ProductCount !== MotivatedProductCount ? '/' + HTML.Format(MotivatedProductCount) : '') + '</td>');
						
						let size = sizes[buildings[i]['eid']];

						if (!size) size = 0;

						let SizeToolTip = sizetooltips[buildings[i]['eid']],
							efficiency = (MotivatedProductCount / size);

						let EfficiencyString;

						if (size !== 0) {
							if (type === 'strategy_points') {
								EfficiencyString = HTML.Format(MainParser.round(efficiency * 100) / 100);
							}
							else if (type === 'premium') {
								EfficiencyString = HTML.Format(MainParser.round(efficiency * 1000) / 1000);
							}
							else if (type === 'units') {
								EfficiencyString = HTML.Format(MainParser.round(efficiency * 100) / 100);
							}
							else if (type === 'att_boost_attacker' || type === 'att_boost_defender' || type === 'def_boost_attacker' || type === 'def_boost_defender') {
								EfficiencyString = HTML.Format(MainParser.round(efficiency * 100) / 100);
							}
							else {
								EfficiencyString = HTML.Format(MainParser.round(efficiency));
							}
						}
						else {
							EfficiencyString = 'N/A';
						}
					
						rowA.push('<td class="text-right is-number addon-info" data-number="' + size + '" title="' + HTML.i18nTooltip(SizeToolTip) + '">' + HTML.Format(size) + '</td>');
						rowA.push('<td class="text-right is-number addon-info" data-number="' + efficiency + '">' + EfficiencyString + '</td>');
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

						let tds = '<td data-text="' + buildings[i]['name'].cleanup() + '">' + buildings[i]['name'] + '</td>';

						let pA = [],
							CurrentBuildingCount = 0,
							CurrentBuildingMotivatedCount = 0;

						for(let p in buildings[i]['motivatedproducts'])
						{
							if (!buildings[i]['motivatedproducts'].hasOwnProperty(p)) continue;

							if (Productions.Types.includes(p) === false) {
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

				if (CurrentEraID === 18 && !MainParser.CityMapEraOutpostData) {
					table.push('<tr><th colspan="6">' + i18n('Boxes.Productions.NoMarsDataWarning') + '</th></tr>');
				}
				if (CurrentEraID === 19 && !MainParser.CityMapEraOutpostData) {
					table.push('<tr><th colspan="6">' + i18n('Boxes.Productions.NoAsteroidDataWarning') + '</th></tr>');
				}
				if (CurrentEraID === 20 && !MainParser.CityMapEraOutpostData) {
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
				let pA = [],
					prod = building[i]['products'],
					ShowTime = false;

				for(let p in prod)
				{
					if(prod.hasOwnProperty(p))
					{
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

		$('[data-entityid]').removeClass('pulsate');

		setTimeout(() => {
			for (let i = 0; i < IDArray.length; i++) {
				let target = $('[data-entityid="' + IDArray[i] + '"]');

				if(i === 0) $('#map-container').scrollTo(target, 800, { offset: { left: -280, top: -280 }, easing: 'swing' });

				target.addClass('pulsate');
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
	GetDaily: (Amount, dailyfactor, type) => {
		let Factor;
		if (Productions.ShowDaily && Productions.TypeHasProduction(type)) {
			Factor = dailyfactor;
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

			// CSS in den DOM prügeln
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

		if (!Productions.RatingCurrentTab) CurrentTab = 'Settings';

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

				//Keine LGs, keine Straßen, keine Millitärgebäude
				if (Entity['type'] === 'greatbuilding' || Entity['type'] === 'street' || Entity['type'] === 'military') continue;

				let Production = Productions.readType(Building);
				//let Score = 0;

				Production['motivatedproducts']['goods'] = 0;
				for (let Type in Production['motivatedproducts']) {
					if (!Production['motivatedproducts'].hasOwnProperty(Type)) continue;

					if (Productions.TypeHasProduction(Type)) Production.motivatedproducts[Type] *= Production['dailyfactor'];
					if (Building['type'] === 'residential' || Building['type'] === 'production' || Building['type'] === 'generic_building') {
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

				h.push('<td><strong class="' + (ScorePercent >= 100 ? 'success' : 'error') + '">' + (ScorePercent > 0 ? ScorePercent + '%' : 'N/A') + '</strong></td>');
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

	GetDefaultProdPerTile: (Type) => {
		if (Type === 'strategy_points') {
			return 0.2;
		}
		if (Type === 'money') {
			return 0;
		}
		if (Type === 'supplies') {
			return 0;
		}
		if (Type === 'medals') {
			return 0;
		}
		if (Type === 'units') {
			return 0.2;
		}
		if (Type === 'clan_power') {
			let Entity = MainParser.CityEntities['Z_MultiAge_CupBonus1b'] //Hall of fame lvl2
				Level = CurrentEraID - 1;

			if (!Entity || !Entity['entity_levels'] || !Entity['entity_levels'][Level] || !Entity['entity_levels'][Level]['clan_power']) return 0;

			return 2 * Entity['entity_levels'][Level]['clan_power'] / 10.5; //Motivated hall of fame lvl2
		}
		if (Type === 'clan_goods') {
			return 0;
		}
		if (Type === 'population') {
			return 0;
		}
		if (Type === 'happiness') {
			return 0;
		}
		if (Type === 'att_boost_attacker') {
			return 1;
		}
		if (Type === 'def_boost_attacker') {
			return 1;
		}
		if (Type === 'att_boost_defender') {
			return 4;
		}
		if (Type === 'def_boost_defender') {
			return 6;
		}
		if (Type === 'goods') {
			return 1;
		}
		else {
			return 0;
        }
	},
};
