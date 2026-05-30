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
	ratedBuildings:null,
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

	RatingCurrentTab: 'Results',
	RatingFilteredSizes: [],
	RatingSearchTerm: '',

	fragmentsSet: new Set(),
	efficiencySettings: Object.assign(
		JSON.parse(localStorage.getItem("Productions.efficiencySettings") || 
			`{
			"tilevalues":false,
			"showitems":true,
			"showhighlighted":false,
			"inventorybuildings":false,
			"inventorybuildingscore":0,
			"gBs":true,
			"showLimited":true,
			"showallies":true
			}`
		),
		{showhighlighted: false}
	),

	
	
	Rating: {
		Data:null,
		Types:null,
		Presets: null,
		PresetStorageKey: 'Productions.Rating.Presets',
		LegacyStorageKey: 'Productions.Rating.Data',


		/**
		 * Returns the default rating data configuration.
		 *
		 * @returns {Object} Default data object with scores per tile and active status for each production type.
		 */
		getDefaultData: () => ({
			'strategy_points': {order:1,perTile:8,active:true,group:1},
			'forge_points_production': {order:2,perTile:0.25,active:true,group:1},
			'fsp': {order:3,perTile:0.8,active:true,group:1},
			'goods-previous': {order:5,perTile:7,active:true,group:1},
			'goods-current': {order:7,perTile:6,active:true,group:1},
			'goods-next': {order:9,perTile:5,active:true,group:1},
			'goods_production': {order:11,perTile:0.25,active:true,group:1},
			'money': {order:13,perTile:null,active:false,group:1},
			'supplies': {order:15,perTile:null,active:false,group:1},
			'medals': {order:16,perTile:null,active:false,group:1},
			'population': {order:17,perTile:null,active:false,group:1},
			'happiness': {order:19,perTile:null,active:false,group:1},
			'clan_goods': {order:21,perTile:10,active:true,group:1},
			'units': {order:22,perTile:4,active:true,group:2},
			'att_boost_attacker-all': {order:23,perTile:8,active:true,group:2} ,
			'att_boost_attacker-guild_expedition': {order:24,perTile:11,active:true,group:2},
			'att_boost_attacker-battleground': {order:25,perTile:10,active:true,group:2} ,
			'def_boost_attacker-all': {order:26,perTile:8,active:true,group:2},
			'def_boost_attacker-guild_expedition': {order:27,perTile:11,active:true,group:2},
			'def_boost_attacker-battleground': {order:28,perTile:10,active:true,group:2} ,
			'att_boost_defender-all': {order:29,perTile:8,active:true,group:2},
			'att_boost_defender-guild_expedition': {order:30,perTile:11,active:true,group:2},
			'att_boost_defender-battleground': {order:31,perTile:10,active:true,group:2},
			'def_boost_defender-all': {order:32,perTile:8,active:true,group:2},
			'def_boost_defender-guild_expedition': {order:33,perTile:11,active:true,group:2},
			'def_boost_defender-battleground': {order:34,perTile:10,active:true,group:2},
			'guild_raids_action_points_collection': {order:60,perTile:8,active:true,group:3},
			'guild_raids_goods_start': {order:62,perTile:1,active:false,group:3},
			'guild_raids_units_start': {order:64,perTile:1,active:false,group:3},
			'guild_raids_coins_start': {order:66,perTile:5000,active:true,group:3},
			'guild_raids_coins_production': {order:68,perTile:1,active:false,group:3},
			'guild_raids_supplies_start': {order:70,perTile:5000,active:true,group:3},
			'guild_raids_supplies_production': {order:72,perTile:1,active:false,group:3},
			'att_boost_attacker-guild_raids': {order:74,perTile:null,active:false,group:3},
			'def_boost_attacker-guild_raids': {order:76,perTile:null,active:false,group:3},
			'att_boost_defender-guild_raids': {order:78,perTile:null,active:false,group:3},
			'def_boost_defender-guild_raids': {order:80,perTile:null,active:false,group:3},
		}),


		/**
		 * Creates a deep copy of the provided data object.
		 *
		 * @param {Object} data - The object to clone.
		 * @returns {Object} A deep copy of the data.
		 */
		cloneData: (data) => JSON.parse(JSON.stringify(data || {})),


		/**
		 * Merges provided data with default rating values to ensure all fields are present.
		 *
		 * @param {Object} data - The custom data to normalize.
		 * @returns {Object} Normalized data object.
		 */
		normalizeData: (data) => Object.assign(Productions.Rating.getDefaultData(), Productions.Rating.cloneData(data || {})),


		/**
		 * Retrieves the currently active preset.
		 *
		 * @returns {Object|null} The active preset object or null if none is active.
		 */
		getActivePreset: () => {
			const presets = Productions.Rating.Presets;
			if (!presets?.presets) return null;
			return presets.presets[presets.activePresetId] || null;
		},


		/**
		 * Updates the list of production types and sorts them based on their defined order.
		 */
		updateTypes: () => {
			Productions.Rating.Types = Object.keys(Productions.Rating.Data)
				.sort((a,b) => {
					Productions.Rating.Data[a].order - Productions.Rating.Data[b].order
				});
		},


		/**
		 * Saves all presets to the local storage.
		 */
		savePresets: () => {
			if (!Productions.Rating.Presets) return;
			localStorage.setItem(Productions.Rating.PresetStorageKey, JSON.stringify(Productions.Rating.Presets));
		},


		/**
		 * Creates a new preset with unique ID and normalizes its data.
		 *
		 * @param {Object} data - The data for the new preset.
		 * @returns {string} The ID of the created preset.
		 */
		createPreset: (data) => {
			const presetId = `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
			Productions.Rating.Presets.presets[presetId] = {
				data: Productions.Rating.normalizeData(data)
			};
			return presetId;
		},


		/**
		 * Deletes a preset by its ID and resets the active preset if necessary.
		 *
		 * @param {string} presetId - The ID of the preset to delete.
		 * @returns {boolean} True if deletion was successful, false otherwise.
		 */
		deletePreset: (presetId) => {
			if (!Productions.Rating.Presets?.presets[presetId]) return false;
			delete Productions.Rating.Presets.presets[presetId];
			if (Productions.Rating.Presets.activePresetId === presetId) {
				Productions.Rating.Presets.activePresetId = Object.keys(Productions.Rating.Presets.presets)[0] || null;
			}
			return true;
		},


		/**
		 * Ensures that the presets structure exists, loading from storage or migrating legacy data if needed.
		 */
		ensurePresets: () => {
			if (Productions.Rating.Presets) return;
			let stored = localStorage.getItem(Productions.Rating.PresetStorageKey);
			if (stored) {
				try {
					Productions.Rating.Presets = JSON.parse(stored);
				} catch (e) {
					Productions.Rating.Presets = null;
				}
			}
			if (!Productions.Rating.Presets) {
				const legacyData = JSON.parse(localStorage.getItem(Productions.Rating.LegacyStorageKey)||"{}");
				const presetId = 'default';
				Productions.Rating.Presets = {
					activePresetId: presetId,
					presets: {
						[presetId]: {
							data: Productions.Rating.normalizeData(legacyData)
						}
					}
				};
				localStorage.removeItem(Productions.Rating.LegacyStorageKey);
				Productions.Rating.savePresets();
			}
			if (!Productions.Rating.Presets.presets || Object.keys(Productions.Rating.Presets.presets).length === 0) {
				const presetId = 'default';
				Productions.Rating.Presets = {
					activePresetId: presetId,
					presets: {
						[presetId]: {
							data: Productions.Rating.normalizeData({})
						}
					}
				};
				Productions.Rating.savePresets();
			}
			if (!Productions.Rating.Presets.presets[Productions.Rating.Presets.activePresetId]) {
				Productions.Rating.Presets.activePresetId = Object.keys(Productions.Rating.Presets.presets)[0];
				Productions.Rating.savePresets();
			}
		},


		/**
		 * Sets the specified preset as active and loads its data.
		 *
		 * @param {string} presetId - The ID of the preset to activate.
		 */
		setActivePreset: (presetId) => {
			Productions.Rating.ensurePresets();
			if (!Productions.Rating.Presets.presets[presetId]) return;
			Productions.Rating.Presets.activePresetId = presetId;
			Productions.Rating.savePresets();
			Productions.Rating.load();
		},


		/**
		 * Resets the currently active preset to default values.
		 */
		resetActivePreset: () => {
			const preset = Productions.Rating.getActivePreset();
			if (!preset) return;
			preset.data = Productions.Rating.normalizeData({});
			Productions.Rating.Data = preset.data;
			Productions.Rating.updateTypes();
			Productions.Rating.savePresets();
			Productions.CalcRatingBody();
		},


		/**
		 * Generates HTML list items for the preset selection menu.
		 *
		 * @returns {string} HTML string of list items representing available presets.
		 */
		getPresetOptions: () => {
			const presets = Productions.Rating.Presets?.presets || {};
			const activeId = Productions.Rating.Presets?.activePresetId;
			let listItems = '';
			let i = 1;
			for (let [id, preset] of Object.entries(presets)) {
				listItems += `<li data-id="${id}" ${id === activeId ? 'class="active"' : ''}>${i}</li>`;
				i++;
			}
			return listItems;
		},


		/**
		 * Exports all presets to a JSON file.
		 */
		exportPresets: () => {
			Productions.Rating.ensurePresets();
			const payload = {
				version: 1,
				activePresetId: Productions.Rating.Presets.activePresetId,
				presets: Productions.Rating.Presets.presets
			};
			const fileName = `EfficiencyRatingPresets_${moment().format('YYMMDD-HHmm')}.json`;
			MainParser.ExportFile(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), fileName);
		},


		/**
		 * Imports presets from a JSON file.
		 *
		 * @param {File} file - The JSON file containing preset data.
		 */
		importPresets: (file) => {
			if (!file) return;
			const reader = new FileReader();
			reader.onload = (evt) => {
				try {
					const data = JSON.parse(evt.target.result);
					const presets = data?.presets;
					if (!presets || typeof presets !== 'object') throw new Error('invalid');
					const importedPresets = {};
					for (const [id, preset] of Object.entries(presets)) {
						if (!preset?.data) continue;
						importedPresets[id] = { data: Productions.Rating.normalizeData(preset.data) };
					}
					if (Object.keys(importedPresets).length === 0) throw new Error('empty');
					Productions.Rating.Presets = {
						activePresetId: data.activePresetId && importedPresets[data.activePresetId] ? data.activePresetId : Object.keys(importedPresets)[0],
						presets: importedPresets
					};
					Productions.Rating.savePresets();
					Productions.Rating.load();
				} catch (e) {
					alert(i18n('Boxes.ProductionsRating.PresetImportError'));
				}
			};
			reader.onerror = () => alert(i18n('Boxes.ProductionsRating.PresetImportError'));
			reader.readAsText(file);
		},


		/**
		 * Loads rating data, either from an active preset or an overwrite object.
		 *
		 * @param {Object|null} [overwrite=null] - Optional data to overwrite current rating.
		 */
		load: (overwrite = null) => {
			Productions.Rating.ensurePresets();
			const activePreset = Productions.Rating.getActivePreset();
			let data = overwrite || activePreset?.data || {};
			Productions.Rating.Data = Productions.Rating.normalizeData(data);
			if (activePreset) {
				activePreset.data = Productions.Rating.Data;
			}
			Productions.Rating.updateTypes();

			if (localStorage.getItem('ProductionRatingProdPerTiles')) {
				let RatingProdPerTiles = Object.assign({},JSON.parse(localStorage.getItem('ProductionRatingProdPerTiles')||"{}"))
				for (let [type,perTile] of Object.entries(RatingProdPerTiles)) {
					if (Productions.Rating.Data[type]) Productions.Rating.Data[type].perTile = perTile
				}
				localStorage.removeItem('ProductionRatingProdPerTiles')
				Productions.Rating.save()
			}

			if (Productions.Rating.Data.clan_power) {
				delete Productions.Rating.Data.clan_power;
			}
		},


		/**
		 * Saves the current rating data back to the active preset and persists to storage.
		 */
		save:() => {
			Productions.Rating.ensurePresets();
			const preset = Productions.Rating.getActivePreset();
			if (preset) {
				preset.data = Productions.Rating.Data;
			}
			Productions.Rating.savePresets();
		}
	},


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
			rowA.push('<td data-text="'+helper.str.cleanup(building.name)+'" class="' + (MainParser.Allies.buildingList?.[building.id]?"ally" : "") +'">' + building.name + '</td>')

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
					rowA.push('<td data-text="'+helper.str.cleanup(building.name)+'" exportvalue="'+building.name+'" class="' + (MainParser.Allies.buildingList?.[building.id]?"ally" : "") +'">' + building.name + '</td>')

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
						rowA.push('<td style="white-space:nowrap" data-date="' + (building.state.times?.at||9999999999) + '">' + (done==""? time : '<b class="text-success">'+done+'</b>') + '</td>')
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
				if (!type.includes('att') && !type.includes('def') && type!='items') {
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
					table.push('<th colspan="8" class="textright">'+(type=="items" ? '<span class="btn" onclick="Productions.showItemSources(event)" style="float:right;">'+i18n('Boxes.ItemSources.Title')+'</span>' : '')+'</th>')
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

			for (const [era, value] of Object.entries(allGoods.eras)) {
				if (eras.find(x => x == era) == undefined)
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
			rowA.push('<td data-text="'+helper.str.cleanup(building.name)+'"  class="' + (MainParser.Allies.buildingList?.[building.id]?"ally" : "") +'">' + building.name + '</td>')

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
			rowA.push('<td style="white-space:nowrap" data-date="' + (building.state.times?.at||9999999999) + '">' + (done==""? time : '<b class="text-success">'+done+'</b>') + '</td>')
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
			rowB.push('<td data-text="'+building.building.name.replace(/[. -]/g,"")+'"  class="' + (MainParser.Allies.buildingList?.[building.building.id]?"ally" : "") +'">'+ building.building.name +'</td>')
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
			rowA.push('<td data-text="'+helper.str.cleanup(building.name)+'"  class="' + (MainParser.Allies.buildingList?.[building.id]?"ally" : "") +'">' + building.name + '</td>')

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
			rowA.push('<td style="white-space:nowrap" data-date="' + (building.state.times?.at||9999999999) + '">' + (done==""? time : '<b class="text-success">'+done+'</b>') + '</td>')
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
				rowB.push('<td data-text="'+building.building.name.replace(/[. -]/g,"")+'"  class="' + (MainParser.Allies.buildingList?.[building.building.id]?"ally" : "") +'">'+ building.building.name +'</td>')
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
		tableGr.push('<th colspan="7"><span class="btn change-view game-cursor" data-type="' + type + '">' + (type=="items" || type=="units" ?i18n('Boxes.Productions.ModeSum') : i18n('Boxes.Productions.ModeSingle')) + '</span></th>')
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
		if (Object.values(Sum).length==0) return []

		let table = []
		let elements = []
		if (type=="items") {
			elements = Object.values(Sum).sort((a,b) => a.name>b.name?1:-1)
		} else { //units
			elements = Object.values(Sum).sort((b,a) => ((a.theory?.type=="rogue"?100:0)+(a.theory?.era||0))-((b.theory?.type=="rogue"?100:0)+(b.theory?.era||0)))
		}

		table.push('<table class="foe-table '+type+'-sum">')
		table.push('<thead class="sticky">')
		table.push('<tr>')
		table.push('<th colspan="8"><span class="btn change-view game-cursor">' + i18n('Boxes.Productions.ModeSingle') + '</span></th>')
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
				let currentamount = (e.current?.amount ? parseFloat(Math.round(e.current.amount*100)/100) : (e.theory?.type !== "random" ? "0" :""))

				let theoryamount =  (e.theory?.amount ? parseFloat(Math.round(e.theory.amount*100)/100) : "") 
							+ (e.theory?.random && e.theory?.amount ? " + " : "") 
							+ (e.theory?.random ? "Ø " + parseFloat(Math.round(e.theory.random*100)/100) : "")
				theoryamount = (currentamount !="" && theoryamount !== "" ? "/ ":"") + theoryamount
				table.push (`<tr><td colspan="2">${currentamount} ${theoryamount}</td><td colspan="6"><span class="unit_skill ${(e.theory?.type||e.current.type).replace(/next./,"")}" title="${i18n("Boxes.Units." + (e.theory?.type||e.current.type).replace(/next./,"") )}"></span> <span>${(e.theory?.era===0 ||e.current?.era===0)? "" : i18n('Eras.'+(e.theory?.era||e.current?.era))}</span></td></tr>`)
			}
		}
		table.push('</tbody>')
		table.push('</table>')

		return table
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
							prod.units.push({type:Utype.replace(/next./,""),amount:0,random:resource.amount * resource.dropChance,era:Utype=="rogue"?0:Uera})
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
						let m = Object.values(MainParser.CityMapData).filter(x=>x.type=="military")
						let RAmount = UAmount/m.length
						m.forEach (x => {
							let Rtype = MainParser.CityEntities[x.cityentity_id].available_products[0].unit_class
							if (MainParser.CityEntities[x.cityentity_id].available_products[0].unit_type_id=="rogue") Rtype="rogue"   //Banners + Drummers???
							let Rera = Technologies.Eras[MainParser.CityEntities[x.cityentity_id].requirements.min_era]
							prod.units.push({type:Rtype.replace(/next./,""),amount:0,random:RAmount,era:Rtype=="rogue"?0:Rera})
						})
					} else {
						prod.units.push({type:Utype.replace(/next./,""),amount:UAmount,random:0,era:building.type === "greatbuilding" || Utype=="rogue" ?0:Uera})
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

			if (hiddenTable.length==0) hiddenTable = activeTable.siblings('table').first();

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
		/*else if (GoodType.includes('guild_raids')) {
			return i18n('Boxes.General.Quantum_Incursion');
		}*/
		else if (GoodType.includes('att_boost_attacker') || GoodType.includes('att_boost_attacker-all')) {
			return i18n('Boxes.Productions.att_boost_attacker');
		}
		else if (GoodType.includes('att_boost_defender') || GoodType.includes('att_boost_defender-all')) {
			return i18n('Boxes.Productions.att_boost_defender');
		}
		else if (GoodType.includes('def_boost_attacker') || GoodType.includes('def_boost_attacker-all')) {
			return i18n('Boxes.Productions.def_boost_attacker');
		}
		else if (GoodType.includes('def_boost_defender') || GoodType.includes('def_boost_defender-all')) {
			return i18n('Boxes.Productions.def_boost_defender');
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
	 * Displays the building efficiency rating box.
	 *
	 * @param {boolean} [external=false] - Whether the box is opened from an external trigger.
	 * @param {string} [eraName=null] - The era to use for calculations.
	 */
	ShowRating: (external = false, eraName = null) => {
		if (!Productions.Rating.Data) 
			Productions.Rating.load();

		if (ActiveMap === 'OtherPlayer' && !external) 
			return;

		let era = (eraName === null) ? CurrentEra : eraName;
		let $ProductionsRating = $('#ProductionsRating');

		if ($ProductionsRating.length === 0) {
			HTML.Box({
				id: 'ProductionsRating',
				title: i18n('Boxes.ProductionsRating.Title'),
				ask: i18n('Boxes.ProductionsRating.HelpLink'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
				settings: 'Productions.RSettings()'
			});
			
			helper.preloader.show('#ProductionsRating');
			
			HTML.AddCssFile('productions');

			$('body').on('click', '.toggle-tab', async function () {
				helper.preloader.show('#ProductionsRating');
				Productions.RatingCurrentTab = $(this).data('value');

				Productions.CalcRatingBody(era);
			});
			Productions.CalcRatingBody(era);

		} else {
			HTML.CloseOpenBox('ProductionsRating');
		}

	},

	AdditionalSpecialBuildings:null,

	
	/**
	 * Generates a tooltip HTML string showing best and top efficiency values for a production type.
	 *
	 * @param {Event} e - The mouse event triggering the tooltip.
	 * @returns {string} HTML string for the tooltip.
	 */
	efficiencyTT: (e) => {
		let type=e?.currentTarget?.dataset?.type
		let y = Productions.ratedBuildings.filter(x=>(!x.isInInventory && x?.rating?.[type]>0)).map(x=>(x.rating[type])).sort((a,b) => a - b);
		if (!y || y.length == 0) return
		let tooltip = `<h2>${i18n("Boxes.ProductionsRating.TooltipTitle")}</h2>`
		tooltip +=`<table class="foe-table"><tr><td>${i18n("Boxes.ProductionsRating.Best")}:</td><td>${y[y.length-1].toFixed(2)}</td></tr>`
		tooltip += `<tr><td>${i18n("Boxes.ProductionsRating.Fifth")}:</td><td>${y[Math.max(y.length-5,0)].toFixed(2)}</td></tr>`
		tooltip += `<tr><td>${i18n("Boxes.ProductionsRating.top10percent")}:</td><td>${y[Math.round((y.length-1)*0.9)].toFixed(2)}</td></tr></table>`
		return tooltip
	},


	/**
	 * Calculates the Finish Special Production (FSP) efficiency and updates the rating data.
	 *
	 * @param {string} type - The type of production being calculated.
	 * @param {number} value - The efficiency value to check or update.
	 */
	calculateFSP: (type,value) =>{
		let sum = 0
		for (let x of Productions.FSPqualifiedResources) {
			if (Productions.Rating.Data.fsp[x] && Productions.Rating.Data[x].active && Productions.Rating.Data[x].perTile > 0) {
				sum += (Productions.Rating.Data.fsp[x] / Productions.Rating.Data[x].perTile)
			}
		}
		if (type=="fsp") {
			if (Math.round(30 / sum*100)/100 == value) return
			$("#FSPCalculator").remove()
			for (let x of Productions.FSPqualifiedResources) {
				delete Productions.Rating.Data.fsp[x]
			}
		} else if (sum > 0) {
			let FSPeff = Math.round(30 / sum*100)/100
			$("#ProdPerTile-fsp").val(FSPeff)
			$("#ProdPerTile-fsp").trigger("blur")
		}
	},


	/**
	 * Calculates and generates the body content for the building efficiency rating box.
	 *
	 * @param {string} [era=''] - The era to use for calculations, defaults to current era if empty.
	 */
	CalcRatingBody: (era = '') => {
		let buildingCount = {};
		let uniqueBuildings = [];
		let buildingSizes = [];
		let ratedBuildings = [];
		let h = [];
		let withAllies = Productions.efficiencySettings.showallies;
		Productions.BuildingsAll = Object.values(CityBuildings.createBuildings(Object.values(MainParser.CityMapData),withAllies));
		Productions.setChainsAndSets(Productions.BuildingsAll);

		// grab special buildings
		if (!Productions.AdditionalSpecialBuildings) {
			let spB = Object.values(MainParser.CityEntities).filter(x=> (x.is_special && !["O_","U_","V_","H_","Y_"].includes(x.id.substring(0,2))) || x.id.substring(0,11) === "W_MultiAge_")
			Productions.AdditionalSpecialBuildings = {}
			for (x of spB) {
				Productions.AdditionalSpecialBuildings[x.id] = {id:x.id,name:x.name,selected:false,filter:x.id+";"+x.name}
			}
		}
		let InventoryBuildings = Productions.InventoryBuildings = Kits.BuildingsFromInventory();
		if (ActiveMap === 'OtherPlayer')
			InventoryBuildings = [];

		for (let [id,data] of Object.entries(InventoryBuildings)){
			//if(!id || id.slice(0, 2) !== 'W_') continue; // if starts not with "W_", continue
			let metaData = MainParser.CityEntities[id];
			let building = CityBuildings.createBuilding(metaData, CurrentEra);
			building.isInInventory = true;
			Productions.BuildingsAll.push(building);
			buildingCount[id+"I"] = data.amount||1;
		}

		// get one of each building, only highest available era
		for (const building of Productions.BuildingsAll) {
			if (building === undefined || building.type === 'street' || building.type === 'military' || building.id >= 2000000000 || building.type.includes('hub')) continue

			let compare = building.name;
			if (MainParser.Allies.buildingList?.[building.id] && withAllies) 
				compare += "+" + Object.keys(MainParser.Allies.buildingList?.[building.id]).join("+");
			
			let foundBuildingIndex = uniqueBuildings.findIndex(x => x.name === compare && x.isInInventory === building.isInInventory && !MainParser.Allies.buildingList?.[x.id])
			if (!withAllies) 
				foundBuildingIndex = uniqueBuildings.findIndex(x => x.name === compare && x.isInInventory === building.isInInventory)
			
			let inventoryIdentifier = (building.isInInventory ? "I" : "C");
			if (foundBuildingIndex === -1) {
				uniqueBuildings.push(building)
				if (buildingCount[building.entityId+inventoryIdentifier] === undefined)
					buildingCount[building.entityId+inventoryIdentifier] = 1;
				delete Productions.AdditionalSpecialBuildings[building.entityId];
			} else {
				let foundBuilding = uniqueBuildings[foundBuildingIndex]
				buildingCount[building.entityId+inventoryIdentifier] += 1

				if (Technologies.InnoEras[foundBuilding.eraName] < Technologies.InnoEras[building.eraName])
					uniqueBuildings[foundBuildingIndex] = building;
			}

			// gather building sizes
			let buildingSize = building.size.length * building.size.width;
			if (buildingSizes.find(x => x === buildingSize) === undefined)
				buildingSizes.push(buildingSize);
		}

		buildingSizes.sort((a,b)=>{
			if (a < b) return -1
			if (a > b) return 1
			return 0
		});

		let selectedAdditionals = Object.values(Productions.AdditionalSpecialBuildings).filter(x=>x.selected).map(x=>x.id);

		Productions.ratedBuildings = ratedBuildings = Productions.rateBuildings(uniqueBuildings,false,era).concat(Productions.rateBuildings(selectedAdditionals,true,era));

		if (Productions.RatingCurrentTab === 'Settings') {
			h.push(Productions.CalcRatingSettings());
		}

		else if (Productions.RatingCurrentTab === 'Results') {
			helper.preloader.show('#ProductionsRating');

			ratedBuildings.sort((a,b) => {
				if (a.rating.totalScore < b.rating.totalScore) return 1
				if (a.rating.totalScore > b.rating.totalScore) return -1
				return 0
			});

			// combine attack and defend boosts if both are active
			let combinedRatingTypes = [];
			for (const type of Productions.Rating.Types) {
				// skip inactive ones
				if (!Productions.Rating.Data[type]?.active || Productions.Rating.Data[type]?.perTile === null) continue;

				if (!type.includes('att_') && !type.includes('def_')) {
					combinedRatingTypes.push(type);
					continue;
				}
				// combine att & def into one - list always starts with att_
				if (type.includes('att_') || type.includes('def_')) {
					let coreType = type.replace('att_','').replace('def_','');
					let combinedType = 'att_def_'+coreType;
					let twinType = type.includes('att_') ? 'def_'+coreType : 'att_'+coreType;

					if (combinedRatingTypes.find(x => x.includes(combinedType))) continue;

					if (Productions.Rating.Data[twinType]?.active) 
						combinedRatingTypes.push(combinedType);
					else 
						combinedRatingTypes.push(type);
				}
			}

			let colNumber = Object.values(Productions.Rating.Data).filter(x=>x.active && x.perTile!=null).length;

			h.push('<div class="ratingtable">');
			h.push('<a id="RatingsResults" class="toggle-tab btn btn-slim" data-value="Settings">' + i18n('Boxes.ProductionsRating.Settings') + '</a>')
			h.push('<table class="foe-table sortable-table TSinactive exportable">');
			h.push('<thead class="sticky">');

			h.push('<tr class="settings">');
				h.push('<th colspan="'+(colNumber+5)+'"><div class="options">');
				h.push('<a class="btn" id="addMetaBuilding">' + i18n('Boxes.ProductionsRating.AddBuilding') + '</a>');
				h.push('<label for="tilevalues"><input type="checkbox" id="tilevalues" />' + i18n('Boxes.ProductionsRating.ShowValuesPerTile') + '</label>');
				h.push('<input type="text" id="efficiencyBuildingFilter" size=20 value="' + Productions.RatingSearchTerm + '" placeholder="' + i18n('Boxes.ProductionsRating.Filter') + ': neo|eden" />');
				h.push('<label for="showhighlighted" data-original-title="'+i18n('Boxes.ProductionsRating.ShowHighlightedExplanation')+'"><input type="checkbox" id="showhighlighted" />' + i18n('Boxes.ProductionsRating.ShowHighlighted') + '</label>')
				h.push('<div>');
				h.push('<label for="gBs" data-original-title="'+i18n('Boxes.ProductionsRating.NoGBsExplanation')+'"><input type="checkbox" id="gBs" /><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_greatbuilding.png`,true)+'" /></label>');
				if (ActiveMap !== 'OtherPlayer') {
					h.push('<div class="inventory">'+
						'<label for="inventorybuildings" data-original-title="'+i18n('Boxes.ProductionsRating.ShowInventoryBuildingsExplanation')+'"><input type="checkbox" id="inventorybuildings" /><img class="game-cursor" src="' + extUrl + 'js/web/x_img/inventory.png"></label>'+
						'<label for="inventorybuildingscore" data-original-title="'+i18n('Boxes.ProductionsRating.InventoryBuildingScoreExplanation')+'">' + i18n('Boxes.ProductionsRating.InventoryBuildingScore') + ': <input type="number" size="6" value="'+(Productions.efficiencySettings.inventorybuildingscore*100)+'" id="inventorybuildingscore" /></label>'+
						'<label for="showLimited" data-original-title="'+i18n('Boxes.ProductionsRating.NoLimitedExplanation')+'"><input type="checkbox" id="showLimited" /><img src="'+srcLinks.get(`/shared/gui/upgrade/upgrade_icon_limited_building.png`,true)+'" /></label>'+
						'</div>');
						h.push('<label for="showallies" data-original-title="'+i18n('Boxes.ProductionsRating.ShowAllies')+'"><input type="checkbox" id="showallies" '+(Productions.efficiencySettings.showallies? 'checked' : '')+' /><span class="filter showallies"></span></label>');

				}
				h.push('<label for="showitems" data-original-title="'+i18n('Boxes.ProductionsRating.ShowItems')+'"><input type="checkbox" id="showitems" /><span class="filter showitems"></span></label>');
				h.push('</div></div></th>');
			h.push('</tr>');

			h.push('<tr class="sorter-header exportheader sort2">');
			h.push('<th data-type="ratinglist" class="is-number descending" data-export="' + i18n('Boxes.ProductionsRating.Score') + '">' + i18n('Boxes.ProductionsRating.Score') + '</th>');
			h.push('<th data-type="ratinglist" data-export="'+ i18n('Boxes.ProductionsRating.BuildingName') +'"><div class="flex-between"><span>'+ i18n('Boxes.ProductionsRating.BuildingName') +'</span>' +
			' <div id="buildingsize"><span>'+i18n('Boxes.Productions.Headings.size')+'</span><ul>');
				for (let size of buildingSizes) {
					h.push('<li data-value="'+size+'" class="' + (Productions.RatingFilteredSizes.includes(size) ? 'selected' : '') + '">'+size+'</li>')
				}
			h.push('</ul></div></div></th><th data-type="ratinglist" class="is-number" data-export="#"></th><th class="no-sort inventory-buildings text-center"><img alt="" data-original-title="'+i18n('Boxes.ProductionsRating.InventoryTooltip')+'" class="game-cursor" src="' + extUrl + 'js/web/x_img/inventory.png" /></th>');

			for (const type of combinedRatingTypes) {
				let firstType = type;
				let secondType = null;
				let divider = 1;
				if (type.includes('att_def_')) {
					firstType = type.replace('def_','');
					secondType = type.replace('att_','');
					divider = 2;
				}
				h.push('<th data-type="ratinglist" style="width:1%" data-export="'+ Productions.GetTypeName(firstType) +'" class="is-number text-center buildingvalue"'+
					(secondType !== null ? ` data-original-title="${Productions.Rating.Data[firstType].perTile} + ${Productions.Rating.Data[secondType]?.perTile} / 2"` : '')+
					'><span class="resicon ' + firstType + '"' + (secondType === null ? ' style="margin-bottom:0"' : '') + '></span>'+ (secondType === null ? '<br>' : '') +
					(secondType !== null ? '<span class="resicon ' + secondType + '"></span><i>': '')+
					((Productions.Rating.Data[firstType].perTile + (Productions.Rating.Data[secondType]?.perTile || 0) || 0) /divider)+
					'</i></th>');

				h.push('<th data-type="ratinglist" style="width:1%" data-export="' + Productions.GetTypeName(firstType) + '" class="is-number text-center tilevalue"'+
					(secondType !== null ? ` data-original-title="${Productions.Rating.Data[firstType].perTile} + ${Productions.Rating.Data[secondType]?.perTile} / 2"` : '')+
					'><span class="resicon ' + firstType + '"></span>'+
					(secondType !== null ? '<span class="resicon ' + secondType + '"></span><i>': '')+
					((Productions.Rating.Data[firstType].perTile + (Productions.Rating.Data[secondType]?.perTile || 0) || 0) /divider)+
					'</i></th>');
			}

			h.push('<th data-type="ratinglist" data-export="Items" class="no-sort items">Items</th>');
			h.push('</tr>');

			h.push('</thead>');
			h.push('<tbody class="ratinglist">');

			for (const building of ratedBuildings) {
				// skip inventory buildings with a score lower than the threshold
				if (building.isInInventory && building.rating.totalScore < Productions.efficiencySettings.inventorybuildingscore) continue;

				// skip inventory buildings that are already in the city
				if (building.isInInventory && (buildingCount[building.entityId+"C"] !== undefined || buildingCount[building.entityId+"C"] >= 1)) continue;

				let buildingSize = building.size.length * building.size.width;

				[randomItems,randomUnits] = Productions.showBuildingItems(false, building)
				h.push(`<tr class="${building.type==='greatbuilding'?'gb ':''}${building.isLimited?'limited ':''}${building.highlight?'additional bg-blue ':''}${building.isInInventory?'inventory-building ':''}size${buildingSize}">`)
				h.push('<td data-number="'+ (building.rating.totalScore * 100) +'" class="text-right">'+Math.round(building.rating.totalScore * 100)+'</td>')

				h.push('<td exportvalue="'+building.name+'" data-text="'+helper.str.cleanup(building.name)+'" class="'+(MainParser.Allies.buildingList?.[building.id]?"ally" : "") +'"><div class="flex-between"><div>');
				if (!building.highlight && !building.isInInventory)
					h.push('<span class="show-all" data-original-title="'+i18n('Boxes.General.ShowOnMap')+'" data-name="'+building.name+'"><img class="game-cursor" alt="" src="' + extUrl + 'css/images/hud/open-eye.png"></span>');

				h.push('<span data-meta_id="'+building.entityId+'" data-eff="'+building.rating.totalScore * 100+'" data-era="'+(building.eraName==="AllAge"?"":building.eraName)+'" data-callback_tt="Tooltips.buildingTT" class="helperTT" '+ MainParser.Allies.tooltip(building.id) + '>'+building.name+'</span>')

				let eraShortName = i18n("Eras."+Technologies.Eras[building.eraName]+".short")
				if (eraShortName !== "-")
					h.push(" ("+i18n("Eras."+Technologies.Eras[building.eraName]+".short") +')')
				h.push("</div></td>");
				
				// show amount in city if > 1
				let buildingAmount = (MainParser.Allies.buildingList?.[building.id] && withAllies ? 1 : (buildingCount[building.entityId+"C"] || 1));
				h.push('<td exportvalue="'+buildingAmount+'" data-number="'+buildingAmount+'"><div class="text-right">')
				if (buildingAmount > 1) 
					h.push('<span data-original-title="'+i18n('Boxes.ProductionsRating.CountTooltip')+'">' + buildingCount[building.entityId+"C"]+'x</span>')
				h.push("</div></td>");

				h.push('<td class="text-center">')
				// show additional buildings from inventory
				if ((buildingCount[building.entityId+"I"] !== undefined && !building.isInInventory) || building.isInInventory)
					h.push('<span data-callback_tt="Kits.InventoryTooltip" data-id="'+building.entityId+'" class="helperTT"><img alt="" class="game-cursor" src="' + srcLinks.get(`/shared/gui/event_hub/event_meta_icon_checkmark.png`,true) + '" /></span> ')
				h.push('</td>')

				for (const type of combinedRatingTypes) {
					let firstType = type;
					let secondType = null;
					if (type.includes('att_def_')) {
						firstType = type.replace('def_','');
						secondType = type.replace('att_','');
					}

					// normal boosts
					if (secondType === null) {
						h.push(`<td class="text-right${firstType==="units" ? " units":""} buildingvalue" data-number="${Math.round(parseFloat(building.rating[firstType]))}" ${firstType==="units" ? `data-original-title="${randomUnits}"`:""}>`)
						h.push(HTML.Format(building.rating[firstType]))
						h.push('</td>')

						let roundingFactor = building.rating[firstType+'-tile'] > 100 || building.rating[firstType+'-tile'] < -100 ? 1 : 100
						let tileValue = Math.round(building.rating[firstType+'-tile'] * roundingFactor) / roundingFactor
						h.push(`<td class="text-right${firstType==="units" ? " units":""} tilevalue" data-number="${tileValue}" ${firstType==="units" ? `data-original-title="${randomUnits}"`:""}>`)
						h.push(HTML.Format(tileValue))
						h.push('</td>')
					}
					// combined attack boosts
					else {
						// Calculate combined value for building value
						let firstValue = Math.round(building.rating[firstType]);
						let secondValue = Math.round(building.rating[secondType]);
						let combinedValue = (firstValue + secondValue);

						h.push(`<td class="text-right buildingvalue" data-number="${combinedValue}">`)
						h.push(HTML.Format(building.rating[firstType]+building.rating[secondType]))
						h.push('</td>')

						// Calculate combined value for tile value - simplified to avoid precision errors
						let firstTileValue = building.rating[firstType+'-tile'];
						let secondTileValue = building.rating[secondType+'-tile'];

						// Apply appropriate rounding based on value size
						let roundFirstTile = firstTileValue > 100 || firstTileValue < -100 ?
							Math.round(firstTileValue) : Math.round(firstTileValue * 100) / 100;

						let roundSecondTile = secondTileValue > 100 || secondTileValue < -100 ?
							Math.round(secondTileValue) : Math.round(secondTileValue * 100) / 100;

						let tileValue = Math.round((roundFirstTile + roundSecondTile) * 10) / 10;

						h.push(`<td class="text-right tilevalue" data-number="${tileValue}">`)
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
						h.push('<div class="btns">')
						h.push('<a class="btn selectMetaBuildings">'+i18n('Boxes.ProductionsRating.ToggleBuildingSelection')+'</a>')
						h.push('<a class="btn closeMetaBuilding btn-green">'+i18n('Boxes.ProductionsRating.AddBuildings')+'</a>')
						h.push('</div>')
					h.push('</div>')
				h.push('</div>')
			h.push('</div>');
		}
		else {
			h.push('Something went wrong');
		}

		SaveSettings=(x)=>{
			Productions.efficiencySettings[x] = $('#'+x).is(':checked')
			if (x === "inventorybuildingscore")
				Productions.efficiencySettings[x] = parseFloat($('#'+x).val())/100
			localStorage.setItem("Productions.efficiencySettings",JSON.stringify(Productions.efficiencySettings))
			if (x === "inventorybuildingscore") return;

			if ($('#'+x).is(':checked')) {
				$("#ProductionsRatingBody").addClass(x);
			} else {
				$("#ProductionsRatingBody").removeClass(x);
			}
		}

		$('#ProductionsRatingBody').html(h.join('')).promise().done(function () {
			$('.TSinactive').removeClass('TSinactive');
			const refreshPresetSelect = () => {
				Productions.Rating.ensurePresets();
				$('#ratingPresetSelect').html(Productions.Rating.getPresetOptions());
			};
			$('#ratingPresetSelect li:not(.duplicate)').on('click', function () {
				const presetId = $(this).data('id');
				if (!presetId) return;
				Productions.Rating.setActivePreset(presetId);
				Productions.CalcRatingBody();
			});
			$('#ratingPresetDuplicate').on('click', () => {
				const preset = Productions.Rating.getActivePreset();
				if (!preset) return;
				const newId = Productions.Rating.createPreset(preset.data);
				Productions.Rating.setActivePreset(newId);
				Productions.Rating.savePresets();
				Productions.CalcRatingBody();
			});
			$('.ratingPresetDelete').on('click', () => {
				const preset = Productions.Rating.getActivePreset();
				if (!preset) return;
				if (!window.confirm(i18n('Boxes.ProductionsRating.PresetConfirmDelete'))) return;
				const activeId = Productions.Rating.Presets?.activePresetId;
				Productions.Rating.deletePreset(activeId);
				Productions.Rating.savePresets();
				Productions.Rating.load();
				Productions.CalcRatingBody();
			});
			$('#ratingPresetReset').on('click', () => {
				if (!window.confirm(i18n('Boxes.ProductionsRating.PresetConfirmReset'))) return;
				Productions.Rating.resetActivePreset();
				Productions.Rating.save();
				Productions.CalcRatingBody();
			});
			$('#ratingPresetExport').on('click', () => {
				Productions.Rating.exportPresets();
			});
			$('#ratingPresetImport').on('click', () => {
				$('#ratingPresetImportFile').trigger('click');
			});
			$('#ratingPresetImportFile').on('change', function () {
				const file = this.files?.[0];
				this.value = '';
				Productions.Rating.importPresets(file);
			});

			$('#tilevalues, label[tilevalues]').on('click', function () {
				SaveSettings("tilevalues")
			});

			$('#showitems, label[showitems]').on('click', function () {
				SaveSettings("showitems")
			});

			$('#showhighlighted, label[showhighlighted]').on('click', function () {
				SaveSettings("showhighlighted")
			});

			$('#gBs, label[gBs]').on('click', function () {
				SaveSettings("gBs")
			});

			$('#showLimited, label[limited]').on('click', function () {
				SaveSettings("showLimited")
			});

			$('#inventorybuildings, label[inventorybuildings]').on('click', function () {
				SaveSettings("inventorybuildings")
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

			// closing "add building" screen
			$('.closeMetaBuilding').on('click',function () {
				$(this).parent('.overlay').hide()

				marked=[]
				$(".ratingtable .highlighted td:nth-child(2)").each((x,el)=>{
					marked.push(el.dataset.text)
				})
				search=new RegExp($('#efficiencyBuildingFilter').val(),"i")
				Productions.CalcRatingBody();
				setTimeout(()=>{
					$(".ratingtable td:nth-child(2)").each((x,el)=>{
						if (marked.includes(el.dataset.text)) {
							el.parentElement.classList.add("highlighted")
						}
					})
					$('#efficiencyBuildingFilter').val(search.source==="(?:)"?"":search.source)
					$('#efficiencyBuildingFilter').trigger("input")
				},500)
			})

			if (Productions.efficiencySettings.tilevalues !== $('#tilevalues').is(':checked')) $('#tilevalues').trigger("click")
			if (Productions.efficiencySettings.showitems !== $('#showitems').is(':checked')) $('#showitems').trigger("click")
			if (Productions.efficiencySettings.showhighlighted !== $('#showhighlighted').is(':checked')) $('#showhighlighted').trigger("click")
			if (Productions.efficiencySettings.inventorybuildings !== $('#inventorybuildings').is(':checked')) $('#inventorybuildings').trigger("click")
			if (Productions.efficiencySettings.gBs !== $('#gBs').is(':checked')) $('#gBs').trigger("click")
			if (Productions.efficiencySettings.showLimited !== $('#showLimited').is(':checked')) $('#showLimited').trigger("click")

			$('#findMetaBuilding').on('input', function () {
				let regEx=new RegExp($(this).val(),"i");
				filterMeta(regEx)
			});
			let filterMeta = (regEx) => {
				$('#ProductionsRatingBody .overlay .results').html("");

				let foundBuildings = Object.values(Productions.AdditionalSpecialBuildings).filter(x => regEx.test(x.filter)).sort((a,b)=>(((a.selected !== b.selected) ? (a.selected ? -2 : 2) : 0)+(a.name>b.name?1:-1)))

				for (building of foundBuildings) {
					$('#ProductionsRatingBody .overlay .results').append(`<li data-meta_id="${building.id}" data-era="${(era==="AllAge"?"":era)}" data-callback_tt="Tooltips.buildingTT" class="helperTT${building.selected ? " selected":""}">${building.name}</li>`)
				}
			}
			filterMeta(/./)
			$('#ProductionsRatingBody .overlay .results').on("click","li",(e)=>{
				let id = e.target.dataset.meta_id
				Productions.AdditionalSpecialBuildings[id].selected =!Productions.AdditionalSpecialBuildings[id].selected
				e.target.classList.toggle("selected")
			})
			$('#ProductionsRatingBody .overlay .selectMetaBuildings').on("click",(e)=>{
				let li = $('#ProductionsRatingBody .overlay .results li');
				for (let item of li) {
					item.classList.toggle("selected");
					let id = item.dataset.meta_id;
					Productions.AdditionalSpecialBuildings[id].selected =!Productions.AdditionalSpecialBuildings[id].selected
				}
			})

			$('#ProductionsRatingSettings input[type=checkbox]').on('click', function () {
				let elem = $(this)
				let isChecked = elem.prop('checked')
				let type = elem.attr('id').replace('Enabled-','')

				elem.parent().children('input[type=number]').toggleClass('hidden')

				Productions.Rating.Data[type].active = isChecked
				Productions.calculateFSP(type,0)

				if (isChecked) {
					Productions.CalcRatingBody();
				}
				Productions.Rating.save()
			});

			$('#showallies, label[allies]').on('click', function () {
				SaveSettings("showallies");
				Productions.CalcRatingBody();
			});

			// settings: change any number
			$('#ProductionsRatingSettings input[type=number]').on('blur', function () {
				let elem = $(this);
				let type = elem.attr('id').replace('ProdPerTile-','');
				Productions.Rating.Data[type].perTile = parseFloat(elem.val()) || 0;
				Productions.calculateFSP(type,Productions.Rating.Data[type].perTile)
				Productions.Rating.save();
			});

			// result: search function
			$('#efficiencyBuildingFilter').on('input', e => {
				let filter = $('#efficiencyBuildingFilter').val();
				Productions.RatingSearchTerm = filter;
				let regEx = new RegExp(filter,"i");

				$('.ratinglist tr td:nth-child(2)').each((x,y) => {
					if (filter !== "" && regEx.test($(y).text())) {
						y.parentElement.classList.add('highlighted2')
					} else {
						y.parentElement.classList.remove('highlighted2')
					}
				});
			});
			// settings: show FSP calculator
			$("#ShowFSPCalculator").on('click', e => {
				if ($("#FSPCalculator").length === 1) {
					$("#FSPCalculator").remove()
					return
				}
				h=`<div id="FSPCalculator" class="dark-bg p5"><h2>${i18n("Boxes.ProductionsRating.TitleFSPCalculator")}</h2><div class="cats flex-between my-5 p5">`
				for (let x of Productions.FSPqualifiedResources) {
					h+=`<div><span class="resicon ${x}"></span> <input type="number" step="1" min="0" max="1000000" class="${x} no-grow" value="${Productions.Rating.Data.fsp[x]||""}"></div>`				
				}
				h+="</div>"
				$(h).insertAfter($("li.fsp")).promise().done(()=>{
					$("#FSPCalculator input").on('input', e => {
						type=e.target.classList[0]
						Productions.Rating.Data.fsp[type] = Number(e.target.value||0)||0
						Productions.calculateFSP()
					})
				})
			})

			$('#buildingsize').on('click', e => {
				e.stopPropagation();
				$('#buildingsize').toggleClass('active');
			});

			// result: building size filter
			$('#buildingsize li').on('click', e => {
				e.stopPropagation();
				let filter = parseInt(e.target.getAttribute('data-value'));
				e.target.classList.toggle('selected');

				if (Productions.RatingFilteredSizes.includes(filter)) {
					let index = Productions.RatingFilteredSizes.indexOf(filter);
					Productions.RatingFilteredSizes.splice(index, 1);
				}
				else {
					Productions.RatingFilteredSizes.push(filter);
				}

				$('.ratinglist tr').addClass('hidden');
				if (isNaN(parseInt(filter)) || Productions.RatingFilteredSizes.length === 0) {
					$('.ratinglist tr').removeClass('hidden');
					return;
				}
				$('.ratinglist tr').each((i,elem) => {
					let size = Array.from(elem.classList).find(x => x.includes('size'));
					if (size) {
						for (let filteredSize of Productions.RatingFilteredSizes) {
							if ("size"+filteredSize === size) {
								elem.classList.remove('hidden');
								return;
							}
						}
					}
				});
			});

			// change minimum score for inventory buildings
			$('#inventorybuildingscore').on('blur', e => {
				SaveSettings("inventorybuildingscore");
				Productions.CalcRatingBody();
			});

			$('#ProductionsRatingBody [data-original-title]').tooltip({container: "#game_body", html:true});

			$('.sortable-table').tableSorter();

			$('.reset-button').on('click', function () {
				if (window.confirm(i18n('Boxes.ProductionsRating.ConfirmReset'))) {
					Productions.Rating.resetActivePreset();
					Productions.Rating.save();
				}
			});

			helper.preloader.hide('#ProductionsRating');
			//$('#ProductionsRatingBody').fadeIn(501);

			if (Productions.RatingSearchTerm !== "") {
				$('#efficiencyBuildingFilter').trigger('input');
			}

			if (Productions.RatingFilteredSizes.length > 0) {
				$('.ratinglist tr').addClass('hidden');
				$('.ratinglist tr').each((i,elem) => {
					let size = Array.from(elem.classList).find(x => x.includes('size'));
					if (size) {
						for (let filteredSize of Productions.RatingFilteredSizes) {
							if ("size"+filteredSize === size) {
								elem.classList.remove('hidden');
								return;
							}
						}
					}
				});
			}
		});
    },


	/**
	 * Calculates and generates the HTML content for the efficiency rating settings tab.
	 *
	 * @returns {string} HTML string representing the rating settings.
	 */
	CalcRatingSettings: () => {
		let h = [];
		h.push('<div id="ProductionsRatingSettings">');
			h.push('<a id="RatingsResults" class="toggle-tab btn btn-slim" data-value="Results"><span>' + i18n('Boxes.ProductionsRating.Results') + '</span></a>')
			Productions.Rating.ensurePresets();
			h.push('<div class="tabs rating-presets dark-bg">')
			h.push(`<ul id="ratingPresetSelect" class="no-grow horizontal dark-bg clickable">
				${Productions.Rating.getPresetOptions()}
				</ul>`)
			h.push('</div>')
			h.push('<input type="file" id="ratingPresetImportFile" accept="application/json" style="display:none" />')
			h.push('<ul class="foe-table">')

			h.push('<li class="dark-bg">')
			h.push('<span>' + i18n('Boxes.ProductionsRating.Enabled') + '</span>')
			h.push('<span></span><span></span>')
			h.push('<span class="text-right">' + i18n('Boxes.ProductionsRating.ProdPerTile') + '</span>')
			h.push('</li>')

			for (let type of Productions.Rating.Types) {
				if (type === "guild_raids_action_points_collection")
					h.push(`<li class="heading">${i18n('Boxes.General.Quantum_Incursion')}</li>`)
				else if (type === "units")
					h.push(`<li class="heading">${i18n('General.Battle')}</li>`)
				h.push('<li class="'+type+'">')
				let activeSetting = (Productions.Rating.Data[type]?.perTile !== null && Productions.Rating.Data[type]?.active !== false)
				h.push('<input id="Enabled-' + type + '" class="no-grow enabled game-cursor" ' + (activeSetting ? 'checked' : '') + ' type="checkbox">')
				h.push('<span class="no-grow resicon ' + type + '"></span>')
				h.push('<label for="Enabled-'+type+'">' + Productions.GetTypeName(type) + '</label>')
				if (type=="fsp") h.push(`<span id="ShowFSPCalculator" class="clickable" data-original-title="${i18n("Boxes.ProductionsRating.ShowFSPCalculator")}">🧮</span>`)
				h.push('<input type="number" id="ProdPerTile-' + type + '" step="0.01" min="0" max="1000000" class="no-grow helperTT '+(Productions.Rating.Data[type]?.active ? '': 'hidden')+'" value="' + (Productions.Rating.Data[type]?.perTile||0) + '", data-callback_tt="Productions.efficiencyTT", data-type="'+type+'-tile">')
				h.push('</li>');
			}

			h.push(`<li class="text-right">
				<div class="btn-group" style="justify-content:end;">
				<button class="reset-button btn" data-value="Results">${i18n('Boxes.ProductionsRating.Reset')}</button>
				<button id="ratingPresetDuplicate" class="btn duplicate clickable">${i18n('Boxes.ProductionsRating.PresetDuplicate')}</button>
				<button class="btn btn-delete icon ratingPresetDelete"></button>
				</li>`);
			h.push('</ul>');
			h.push('<div class="content">');
				h.push('<a class="toggle-tab btn btn-green" data-value="Results">' + i18n('Boxes.ProductionsRating.Results') + '</a>');
				h.push('<p>'+i18n('Boxes.ProductionsRating.Explainer')+'</p>')
				h.push('<p>'+i18n('Boxes.ProductionsRating.Disclaimer')+'</p>')
				h.push('<div class="btn-group">')
				h.push(`<button class="btn" id="ratingPresetExport">${i18n('Boxes.ProductionsRating.PresetExport')}</button>`)
				h.push(`<button class="btn" id="ratingPresetImport">${i18n('Boxes.ProductionsRating.PresetImport')}</button>`)
				h.push('</div>')
			h.push('</div>')
		h.push('</div>')

		return h.join('');
	},


	/**
	 * Filters and prepares buildings for rating, excluding certain types like wishing wells.
	 *
	 * @param {Array} uniqueBuildings - List of unique buildings to rate.
	 * @param {boolean} [additional=false] - If true, treats buildings as additional/manually added.
	 * @param {string} [era=null] - The era to use for additional buildings.
	 * @returns {Array} Array of buildings prepared for rating.
	 */
	rateBuildings: (uniqueBuildings,additional=false,era=null) => {
		let ratedBuildings = [];
		if (additional) {
			uniqueBuildings = uniqueBuildings.map(x=>CityBuildings.createBuilding(x,era||CurrentEra));
		}
		for (const building of uniqueBuildings) {
			// do not include wishingwell type buildings
			if (building.entityId.includes("L_AllAge_EasterBonus1") || building.entityId.includes("L_AllAge_Expedition16") || building.entityId.includes("L_AllAge_ShahBonus17") || (building.isSpecial === undefined && building.type !== "greatbuilding")) 
				continue;
			let ratedBuilding = building;
			if (additional) ratedBuilding.highlight = true;
			ratedBuildings.push(ratedBuilding);
		}
		return ratedBuildings;
	},


	/**
	 * Calculates the efficiency score for a single building based on the current rating configuration.
	 *
	 * @param {Object} building - The building object to rate.
	 * @returns {Object} Score object containing total score and individual scores per production type.
	 */
	rateBuilding: (building) => {
		if (!Productions.Rating.Data) Productions.Rating.load();
		let size = building.size.width * building.size.length;
		size += ((building.size.width === 1 || building.size.length === 1) ? building.needsStreet * 0.5 : building.needsStreet);

		let score = {totalScore:0};

		for (const type of Object.keys(Productions.Rating.Data)) {
			if (Productions.Rating.Data[type].active) {
				let desiredValuePerTile = parseFloat(Productions.Rating.Data[type].perTile) || 0;
				if (desiredValuePerTile !== null && !isNaN(desiredValuePerTile)) {
					let typeValue = Productions.getRatingValueForType(building, type) || 0; // production amount
					let valuePerTile = typeValue / size;

					if (valuePerTile !== 0 && desiredValuePerTile !== 0) 
						score.totalScore += (valuePerTile / desiredValuePerTile);

					score[type] = ( Math.round( typeValue * 100 ) / 100 ) || 0;
					score[type+'-tile'] = valuePerTile || 0;
				}
			}
		}
		return score;
	},


	/**
	 * Retrieves the production value for a specific type from a building, considering boosts and set/chain bonuses.
	 *
	 * @param {Object} building - The building object.
	 * @param {string} type - The production type to retrieve the value for.
	 * @returns {number} The production value.
	 */
	getRatingValueForType: (building, type) => {
		if (type === "happiness")
			return building.happiness;
		else if (type === "population")
			return building.population;
		else if (type.includes('att') || type.includes('def')) {
			if (building.boosts === undefined) return 0;

			let bsum = 0;
			for (const boost of building.boosts) {

				let feature = type.split('-')[1];
				if (feature !== boost.feature) continue;

				let bType = boost.type.find(x => x === type.split('-')[0]);
				if (bType === undefined) continue;

				if (boost.needsLink && building.setBuilding !== undefined) {
					if (boost.requiredLinks > (building.setBuilding.uniqueAdjacentCount || 0)) continue;
				}

				bsum += boost.value;
			}
			return bsum;
		}
		else if (type === "forge_points_production" || type === "goods_production") {
			if (building.boosts === undefined) return 0;
			for (const boost of building.boosts) {
				if (boost.needsLink && building.setBuilding !== undefined) {
					if (boost.requiredLinks > (building.setBuilding.uniqueAdjacentCount || 0)) continue;
				}
				if (boost.type[0] === 'forge_points_production' && type === 'forge_points_production')  {
					return boost.value;
				}
				if (boost.type[0] === 'goods_production' && type === 'goods_production')  {
					return boost.value;
				}
			}
		}
		else if (type === "strategy_points" || type === "medals" || type === "premium" || type === "money" || type === "supplies" || type === "units" || type === "clan_goods")
			return Productions.getBuildingProductionByCategory(false, building, type).amount

		else if (type.includes("goods") && !type.includes("guild_raids_")) {
			let allGoods = CityBuildings.getBuildingGoodsByEra(false, building);
			let era = (ActiveMap === "OtherPlayer" ? CityMap.OtherPlayer.eraName : CurrentEra)

			if (allGoods !== undefined) {
				let prevEra = Technologies.InnoEras[era]-1;
				let currEra = Technologies.InnoEras[era];
				let nextEra = Technologies.InnoEras[era]+1;

				if (type === "goods-previous") {
					if (allGoods.eras[prevEra])
						return allGoods.eras[prevEra];
				}
				if (type === "goods-current") {
					if (allGoods.eras[currEra])
						return allGoods.eras[currEra];
				}
				if (type === "goods-next") {
					if (allGoods.eras[nextEra])
						return allGoods.eras[nextEra];
				}
			}
		}
		else if (type === "fsp") {
			let fsp = 0
			if (building.production) {
				let possibleProductions = building.production.filter(x => x.type === "genericReward").concat(building.production.filter(x => x.type === "random"))
				let multiplier = 1
				for (let production of possibleProductions) {
					if (production.type === "genericReward") {
						if (!production.resources.id.includes('rush_event_buildings_instant')) continue

						if (production.resources.subType === 'rush_event_buildings_instant')
							multiplier = 30 // 30, because 30 fragments are needed for one item
						fsp = production.resources.amount * multiplier
					}
					else if (production.type === "random") {
						let hasFsp = production.resources.filter(x => x.id?.includes('rush_event_buildings_instant'))
						if (hasFsp.length === 0) continue

						if (hasFsp[0].subType === "instant_finish_building")
							multiplier = 30 // 30, because 30 fragments are needed for one item
						fsp = hasFsp[0].amount * hasFsp[0].dropChance * multiplier
					}
				}
			}
			return fsp
		}
		else if (type.includes("guild_raids_") && !type.includes("att") && !type.includes("def")) {
			if (building.boosts !== undefined) {
				let qi_resources = 0;
				for (const boost of building.boosts) {
					let bType = boost.type.find(x => x === type);
					if (bType !== undefined) {
						qi_resources += boost.value;
					}
				}
				return qi_resources;
			}
		}
		else
			return 0
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
	 * Displays the settings for the efficiency rating box.
	 */
	RSettings: () => {
		let c = [];
		c.push(`<p class="text-left">${i18n('Boxes.General.Export')}: <span class="btn-group"><button class="btn" onclick="HTML.ExportTable($('.ratingtable table'),'csv','EfficiencyRating')">CSV</button>`);
		c.push(`<button class="btn" onclick="HTML.ExportTable($('.ratingtable table'),'json','EfficiencyRating')">JSON</button></span></p>`);

		$('#ProductionsRatingSettingsBox').html(c.join(''));
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
									h += '<li class="helperTT" data-era="'+CurrentEra+'" data-callback_tt="Tooltips.buildingTT" data-meta_id="'+building.entityId+'">'+building.name+'</li>'
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
			h+=`<li class="helperTT" data-era=${CurrentEra} data-callback_tt="Tooltips.buildingTT" data-meta_id="${b}">${MainParser.CityEntities[b].name}</li>`
		}
		h+=`</ul>`
		$(itemId).html(h)
	},
};

FoEproxy.addHandler('CityMapService', 'placeBuilding', (data, postData) => {
	if ($('#ProductionsRating').length > 0) {
		setTimeout(() => {
				Productions.CalcRatingBody();
		}, 250);
	}
});

FoEproxy.addHandler('CityMapService', 'removeBuilding', (data, postData) => {
	if ($('#ProductionsRating').length > 0) {
		setTimeout(() => {
			Productions.CalcRatingBody();
		}, 250);
	}
});

FoEproxy.addHandler('InventoryService', 'updateItem', (data, postData) => {
	if ($('#ProductionsRating').length > 0) {
		setTimeout(() => {
			Productions.CalcRatingBody();
		}, 250);
	}
});

FoEproxy.addHandler('InventoryService', 'useItem', (data, postData) => {
	if ($('#ProductionsRating').length > 0) {
		setTimeout(() => {
			Productions.CalcRatingBody();
		}, 250);
	}
});