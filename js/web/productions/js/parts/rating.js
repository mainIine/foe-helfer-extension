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

// Building efficiency rating ("Optimierungsmodul") — split out of productions.js.
// Loaded after productions.js via the "parts" mechanism in js/internal.json,
// so it can safely extend the existing Productions object.
Object.assign(Productions, {
	ratedBuildings:null,


	RatingCurrentTab: 'Results',
	RatingFilteredSizes: [],
	RatingSearchTerm: '',


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
			"showallies":true,
			"chainmax":false
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
					if (Productions.Rating.Data[type]) {
						Productions.Rating.Data[type].perTile = perTile
					}
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
				popout: 'MainParser.PopOut(\'ProductionsRating\', 1100, 580)',
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
		if (!y || y.length === 0) return
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
		if (type === "fsp") {
			if (Math.round(30 / sum*100)/100 === value) return
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
			if (Allies.buildingList?.[building.id] && withAllies) 
				compare += "+" + Object.keys(Allies.buildingList?.[building.id]).join("+");
			
			let foundBuildingIndex = uniqueBuildings.findIndex(x => x.name === compare && x.isInInventory === building.isInInventory && !Allies.buildingList?.[x.id])
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

			let colNumber = Object.values(Productions.Rating.Data).filter(x=>x.active && x.perTile !== null && x.perTile !== undefined).length;

			// render the saved checkbox states inline - the previous trigger("click") sync
			// re-entered CalcRatingBody endlessly when combined with the chainmax recalc
			const checked = (key) => Productions.efficiencySettings[key] ? ' checked' : '';

			h.push('<div class="ratingtable">');
			h.push('<a id="RatingsResults" class="toggle-tab btn btn-slim" data-value="Settings">' + i18n('Boxes.ProductionsRating.Settings') + '</a>')
			h.push('<table class="foe-table sortable-table TSinactive exportable">');
			h.push('<thead class="sticky">');

			h.push('<tr class="settings">');
				h.push('<th colspan="'+(colNumber+5)+'"><div class="options">');
				h.push('<a class="btn" id="addMetaBuilding">' + i18n('Boxes.ProductionsRating.AddBuilding') + '</a>');
				h.push('<label for="tilevalues"><input type="checkbox" id="tilevalues"'+checked('tilevalues')+' />' + i18n('Boxes.ProductionsRating.ShowValuesPerTile') + '</label>');
				h.push('<input type="text" id="efficiencyBuildingFilter" size=20 value="' + Productions.RatingSearchTerm + '" placeholder="' + i18n('Boxes.ProductionsRating.Filter') + ': neo|eden" />');
				h.push('<label for="showhighlighted" data-original-title="'+i18n('Boxes.ProductionsRating.ShowHighlightedExplanation')+'"><input type="checkbox" id="showhighlighted"'+checked('showhighlighted')+' />' + i18n('Boxes.ProductionsRating.ShowHighlighted') + '</label>')
				h.push('<div>');
				h.push('<label for="gBs" data-original-title="'+i18n('Boxes.ProductionsRating.NoGBsExplanation')+'"><input type="checkbox" id="gBs"'+checked('gBs')+' /><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_greatbuilding.png`,true)+'" /></label>');
				if (ActiveMap !== 'OtherPlayer') {
					h.push('<div class="inventory">'+
						'<label for="inventorybuildings" data-original-title="'+i18n('Boxes.ProductionsRating.ShowInventoryBuildingsExplanation')+'"><input type="checkbox" id="inventorybuildings"'+checked('inventorybuildings')+' /><img class="game-cursor" src="' + extUrl + 'js/web/x_img/inventory.png"></label>'+
						'<label for="inventorybuildingscore" data-original-title="'+i18n('Boxes.ProductionsRating.InventoryBuildingScoreExplanation')+'">' + i18n('Boxes.ProductionsRating.InventoryBuildingScore') + ': <input type="number" size="6" value="'+(Productions.efficiencySettings.inventorybuildingscore*100)+'" id="inventorybuildingscore" /></label>'+
						'<label for="showLimited" data-original-title="'+i18n('Boxes.ProductionsRating.NoLimitedExplanation')+'"><input type="checkbox" id="showLimited"'+checked('showLimited')+' /><img src="'+srcLinks.get(`/shared/gui/upgrade/upgrade_icon_limited_building.png`,true)+'" /></label>'+
						'</div>');
						h.push('<label for="chainmax" data-original-title="'+i18n('Boxes.ProductionsRating.OnlyMaxStageExplanation')+'"><input type="checkbox" id="chainmax"'+checked('chainmax')+' /><img src="'+srcLinks.get(`/shared/icons/limited_building_upgrade.png`,true)+'" /></label>');
						h.push('<label for="showallies" data-original-title="'+i18n('Boxes.ProductionsRating.ShowAllies')+'"><input type="checkbox" id="showallies"'+checked('showallies')+' /><span class="filter showallies"></span></label>');

				}
				h.push('<label for="showitems" data-original-title="'+i18n('Boxes.ProductionsRating.ShowItems')+'"><input type="checkbox" id="showitems"'+checked('showitems')+' /><span class="filter showitems"></span></label>');
				h.push('</div></div></th>');
			h.push('</tr>');

			h.push('<tr class="sorter-header exportheader sort2">');
			h.push('<th data-type="ratinglist" class="is-number descending" data-export="' + i18n('Boxes.ProductionsRating.Score') + '">' + i18n('Boxes.ProductionsRating.Score') + '</th>');
			h.push('<th data-type="ratinglist" data-export="'+ i18n('Boxes.ProductionsRating.BuildingName') +'"><div class="flex-between"><span>'+ i18n('Boxes.ProductionsRating.BuildingName') +'</span>' +
			' <div id="buildingsize"><span>'+i18n('Boxes.Productions.Headings.size')+'</span><ul>');
				for (let size of buildingSizes) {
					h.push('<li data-value="'+size+'" class="' + (Productions.RatingFilteredSizes.includes(size) ? 'selected' : '') + '">'+size+'</li>')
				}
			h.push('</ul></div></div></th><th data-type="ratinglist" class="is-number" data-export="#"></th><th class="no-sort inventory-buildings text-center" data-export="' + i18n('Boxes.ProductionsRating.ExportBuilt') + '"><img alt="" data-original-title="'+i18n('Boxes.ProductionsRating.InventoryTooltip')+'" class="game-cursor" src="' + extUrl + 'js/web/x_img/inventory.png" /></th>');

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

				h.push('<th data-type="ratinglist" style="width:1%" data-export="' + Productions.GetTypeName(firstType) + ' (' + i18n('Boxes.ProductionsRating.PerTile') + ')" class="is-number text-center tilevalue"'+
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

			// "highest chain stage only": map every chain member to its scheme and find
			// the highest stage that is visible under the current filter settings
			let chainStage = {};
			for (let [endBuilding, scheme] of Object.entries(Kits.UpgradeSchemes || {})) {
				scheme.upgradeSteps.forEach((step, index) => {
					chainStage[step.buildingId] = {family: endBuilding, stage: index};
				});
				chainStage[endBuilding] = {family: endBuilding, stage: scheme.upgradeSteps.length};
			}
			let chainMaxStage = {};
			for (const building of ratedBuildings) {
				if (building.highlight) continue;
				if (building.isInInventory) {
					if (!Productions.efficiencySettings.inventorybuildings) continue;
					if (building.isLimited && !Productions.efficiencySettings.showLimited) continue;
					if (building.rating.totalScore < Productions.efficiencySettings.inventorybuildingscore) continue;
					if (buildingCount[building.entityId+"C"] !== undefined) continue;
				}
				let stageInfo = chainStage[building.entityId];
				if (stageInfo && (chainMaxStage[stageInfo.family] ?? -1) < stageInfo.stage)
					chainMaxStage[stageInfo.family] = stageInfo.stage;
			}

			for (const building of ratedBuildings) {
				// skip inventory buildings with a score lower than the threshold
				if (building.isInInventory && building.rating.totalScore < Productions.efficiencySettings.inventorybuildingscore) continue;

				// skip inventory buildings that are already in the city
				if (building.isInInventory && (buildingCount[building.entityId+"C"] !== undefined || buildingCount[building.entityId+"C"] >= 1)) continue;

				let buildingSize = building.size.length * building.size.width;

				// tag rows below the highest visible stage of their upgrade chain
				let stageInfo = chainStage[building.entityId];
				let isLowerStage = !building.highlight && stageInfo !== undefined && stageInfo.stage < (chainMaxStage[stageInfo.family] ?? -1);

				[randomItems,randomUnits] = Productions.showBuildingItems(false, building)
				h.push(`<tr class="${building.type==='greatbuilding'?'gb ':''}${building.isLimited?'limited ':''}${building.highlight?'additional bg-blue ':''}${building.isInInventory?'inventory-building ':''}${isLowerStage?'chain-lower ':''}size${buildingSize}">`)
				h.push('<td data-number="'+ (building.rating.totalScore * 100) +'" class="text-right">'+Math.round(building.rating.totalScore * 100)+'</td>')

				h.push('<td exportvalue="'+building.name+'" data-text="'+helper.str.cleanup(building.name)+'" class="'+(Allies.buildingList?.[building.id]?"ally" : "") +'"><div class="flex-between"><div>');
				if (!building.highlight && !building.isInInventory)
					h.push('<span class="show-all" data-original-title="'+i18n('Boxes.General.ShowOnMap')+'" data-name="'+building.name+'"><img class="game-cursor" alt="" src="' + extUrl + 'css/images/hud/open-eye.png"></span>');

				// icon in front of the name so great buildings are recognizable at a glance
				if (building.type === 'greatbuilding')
					h.push('<img class="gb-icon" alt="" src="' + srcLinks.get('/shared/gui/constructionmenu/icon_greatbuilding.png', true) + '" /> ');

				h.push('<span data-meta_id="'+building.entityId+'" data-eff="'+building.rating.totalScore * 100+'" data-era="'+(building.eraName==="AllAge"?"":building.eraName)+'" data-callback_tt="Tooltips.buildingTT" class="fh-tooltip" '+ Allies.tooltip(building.id) + '>'+building.name+'</span>')

				let eraShortName = i18n("Eras."+Technologies.Eras[building.eraName]+".short")
				if (eraShortName !== "-")
					h.push(" ("+i18n("Eras."+Technologies.Eras[building.eraName]+".short") +')')
				h.push("</div></td>");
				
				// show amount in city if > 1
				let buildingAmount = (Allies.buildingList?.[building.id] && withAllies ? 1 : (buildingCount[building.entityId+"C"] || 1));
				h.push('<td exportvalue="'+buildingAmount+'" data-number="'+buildingAmount+'"><div class="text-right">')
				if (buildingAmount > 1) 
					h.push('<span data-original-title="'+i18n('Boxes.ProductionsRating.CountTooltip')+'">' + buildingCount[building.entityId+"C"]+'x</span>')
				h.push("</div></td>");

				// export whether the row is a built city building (1) or an inventory item (0) (#3529)
				h.push('<td class="text-center" exportvalue="' + (building.isInInventory ? 0 : 1) + '">')

				// show additional buildings from inventory
				if ((buildingCount[building.entityId+"I"] !== undefined && !building.isInInventory) || building.isInInventory)
					h.push('<span data-callback_tt="Kits.InventoryTooltip" data-id="'+building.entityId+'" class="fh-tooltip"><img alt="" class="game-cursor" src="' + srcLinks.get(`/shared/gui/event_hub/event_meta_icon_checkmark.png`,true) + '" /></span> ')
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

		// remove open tooltips before the body is replaced, otherwise they stay behind orphaned
		$('.tooltip').remove();

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
				// visibility of limited rows changes which chain stage is the highest visible one
				if (Productions.efficiencySettings.chainmax) Productions.CalcRatingBody();
			});

			$('#inventorybuildings, label[inventorybuildings]').on('click', function () {
				SaveSettings("inventorybuildings")
				if (Productions.efficiencySettings.chainmax) Productions.CalcRatingBody();
			});

			$('#chainmax').on('click', function () {
				SaveSettings("chainmax");
				Productions.CalcRatingBody();
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

			// checkbox states are rendered inline, only sync the body classes with the settings.
			// no trigger("click") here: the synthetic clicks re-entered CalcRatingBody endlessly
			// via the chainmax recalc in the showLimited/inventorybuildings handlers
			for (const key of ['tilevalues', 'showitems', 'showhighlighted', 'inventorybuildings', 'gBs', 'showLimited', 'chainmax', 'showallies']) {
				$('#ProductionsRatingBody').toggleClass(key, !!Productions.efficiencySettings[key]);
			}

			$('#findMetaBuilding').on('input', function () {
				let regEx=new RegExp($(this).val(),"i");
				filterMeta(regEx)
			});
			let filterMeta = (regEx) => {
				$('#ProductionsRatingBody .overlay .results').html("");

				let foundBuildings = Object.values(Productions.AdditionalSpecialBuildings).filter(x => regEx.test(x.filter)).sort((a,b)=>(((a.selected !== b.selected) ? (a.selected ? -2 : 2) : 0)+(a.name>b.name?1:-1)))

				for (building of foundBuildings) {
					$('#ProductionsRatingBody .overlay .results').append(`<li data-meta_id="${building.id}" data-era="${(era==="AllAge"?"":era)}" data-callback_tt="Tooltips.buildingTT" class="fh-tooltip${building.selected ? " selected":""}">${building.name}</li>`)
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
				let regEx;
				try {
					regEx = new RegExp(filter,"i");
				} catch (err) {
					// incomplete regex while typing (e.g. "(") — treat it as literal text
					regEx = new RegExp(filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),"i");
				}

				$('.ratinglist tr td:nth-child(2)').each((x,y) => {
					let match = regEx.test($(y).text());
					if (filter !== "" && match) {
						y.parentElement.classList.add('highlighted2')
					} else {
						y.parentElement.classList.remove('highlighted2')
					}
					// hide rows that do not match the search term
					y.parentElement.classList.toggle('filtered-out', filter !== "" && !match);
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
				if (type === "fsp") h.push(`<span id="ShowFSPCalculator" class="clickable" data-original-title="${i18n("Boxes.ProductionsRating.ShowFSPCalculator")}">🧮</span>`)
				h.push('<input type="number" id="ProdPerTile-' + type + '" step="0.01" min="0" max="1000000" class="no-grow fh-tooltip '+(Productions.Rating.Data[type]?.active ? '': 'hidden')+'" value="' + (Productions.Rating.Data[type]?.perTile||0) + '", data-callback_tt="Productions.efficiencyTT", data-type="'+type+'-tile">')
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
	 * Displays the settings for the efficiency rating box.
	 */
	RSettings: () => {
		let c = [];
		c.push(`<p class="text-left">${i18n('Boxes.General.Export')}: <span class="btn-group"><button class="btn" onclick="HTML.ExportTable($('.ratingtable table'),'csv','EfficiencyRating')">CSV</button>`);
		c.push(`<button class="btn" onclick="HTML.ExportTable($('.ratingtable table'),'json','EfficiencyRating')">JSON</button></span></p>`);

		$('#ProductionsRatingSettingsBox').html(c.join(''));
	},
});

// Rebuild the rating when the city or the inventory changes. A shared debounce
// collapses event bursts (e.g. placing several buildings in a row) into a
// single full recalculation instead of one per event.
{
	let ratingRefreshTimer = null;
	const queueRatingRefresh = () => {
		if ($('#ProductionsRating').length === 0) return;
		clearTimeout(ratingRefreshTimer);
		ratingRefreshTimer = setTimeout(() => Productions.CalcRatingBody(), 250);
	};

	FoEproxy.addHandler('CityMapService', 'placeBuilding', queueRatingRefresh);
	FoEproxy.addHandler('CityMapService', 'removeBuilding', queueRatingRefresh);
	FoEproxy.addHandler('InventoryService', 'updateItem', queueRatingRefresh);
	FoEproxy.addHandler('InventoryService', 'useItem', queueRatingRefresh);
}
