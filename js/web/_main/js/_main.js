/*
 * *************************************************************************************
 *
 * Copyright (C) 2024 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

let ExtbaseData = JSON.parse(localStorage.getItem("HelperBaseData")||"{}");
const extID = ExtbaseData.extID,
	extUrl = ExtbaseData.extUrl,
	GuiLng = ExtbaseData.GuiLng,
	extVersion = ExtbaseData.extVersion,
	isRelease = ExtbaseData.isRelease,
	devMode = ExtbaseData.devMode,
	loadBeta = ExtbaseData.loadBeta;

{
	// jQuery detection
	let intval = -1;
	function checkForJQuery() {
		if (typeof jQuery !== 'undefined') {
			clearInterval(intval);
			window.dispatchEvent(new CustomEvent('foe-helper#jQuery-loaded'));
		}
	}
	intval = setInterval(checkForJQuery, 1);
}

let ApiURL = 'https://api.foe-rechner.de/',
	ActiveMap = 'main',
	LastMapPlayerID = null,
	ExtPlayerID = 0,
	ExtPlayerName = null,
	ExtPlayerAvatar = null,
	ExtGuildID = 0,
	ExtGuildPermission = 0,
	ExtWorld = window.location.hostname.split('.')[0],
	CurrentEra = null,
	CurrentEraID = null,
	GoodsData = [],
	GoodsList = [],
	FHResourcesList = [],
	PlayerDict = {},
	PlayerDictNeighborsUpdated = false,
	PlayerDictGuildUpdated = false,
	PlayerDictFriendsUpdated = false,
	ResourceStock = [],
	MainMenuLoaded = false,
	LGCurrentLevelMedals = undefined,
	IsLevelScroll = false,
	EventCountdown = false,
	GameTimeOffset = 0,
	GameTime = 0,
	StartUpDone = new Promise(resolve => 
			window.addEventListener('foe-helper#StartUpDone', resolve, {once: true, passive: true})),
	Fights = [],
	OwnUnits = [],
	EnemyUnits = [],
	UnlockedFeatures = [],
	possibleMaps = ['main', 'gex', 'gg', 'era_outpost', 'guild_raids', 'cultural_outpost'],
	PlayerLinkFormat = 'https://foe.scoredb.io/__world__/Player/__playerid__',
	GuildLinkFormat = 'https://foe.scoredb.io/__world__/Guild/__guildid__',
	BuildingsLinkFormat = 'https://forgeofempires.fandom.com/wiki/__buildingid__',
	LinkIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="22pt" height="22pt" viewBox="0 0 22 22"><g><path id="foehelper-external-link-icon" d="M 13 0 L 13 2 L 18.5625 2 L 6.28125 14.28125 L 7.722656 15.722656 L 20 3.4375 L 20 9 L 22 9 L 22 0 Z M 0 4 L 0 22 L 18 22 L 18 9 L 16 11 L 16 20 L 2 20 L 2 6 L 11 6 L 13 4 Z M 0 4 "/></g></svg>';

// Übersetzungen laden
let i18n_loaded = false;
const i18n_loadPromise = (async () => {
	const sleep = delay => new Promise(resolve => setTimeout(resolve, delay));
	const vendorsLoadedPromise = new Promise(resolve =>
		window.addEventListener('foe-helper#vendors-loaded', resolve, { passive: true, once: true })
	);

	try {
		let languages = [];

		// Englisches Fallback laden
		if (GuiLng !== 'en') {
			languages.push('en');
		}

		languages.push(GuiLng);

		// parrallel mache:
		const languageDatas = await Promise.all(
			languages
				.map(lang =>
					// frage die Sprachdatei an
					fetch(extUrl + 'js/web/_i18n/' + lang + '.json')
						// lade die antwort als JSON
						.then(response => response.text())
						// im fehlerfall wird ein leeres Objekt zurück gegeben
						.catch(() => ({}))
				)
		);

		// warte dass i18n geladen ist
		await vendorsLoadedPromise;

		for (let languageData of languageDatas) {
			i18n.translator.add({ 'values': JSON.parse(languageData) });
		}

		i18n_loaded = true;

	} catch (err) {
		console.error('i18n translation loading error:', err);
	}
})();


document.addEventListener("DOMContentLoaded", function () {
	// note current world
	//ExtWorld = window.location.hostname.split('.')[0];
	localStorage.setItem('current_world', ExtWorld);

	// register resize functions
	window.addEventListener('resize', () => {
		MainParser.ResizeFunctions();
	});

	// Detect and process fullscreen
	$(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange', function () {
		if (!window.screenTop && !window.screenY) {
			HTML.LeaveFullscreen();
		} else {
			HTML.EnterFullscreen();
		}
	});
});

GetFights = () =>{
	var a = document.createElement("a");
	var file = new Blob([JSON.stringify(Fights)], { type: "application/json" });
	a.href = URL.createObjectURL(file);
	a.download = 'fights.json';
	a.click();
}

(function () {

	// globale Handler
	// die Gebäudenamen übernehmen
	FoEproxy.addMetaHandler('city_entities', (xhr, postData) => {
		let EntityArray = JSON.parse(xhr.responseText);
		MainParser.CityEntities = Object.assign({}, ...EntityArray.map((x) => ({ [x.id]: x })));

		for (let i in MainParser.CityEntities) {
			if (!MainParser.CityEntities.hasOwnProperty(i)) continue;

			let CityEntity = MainParser.CityEntities[i];
			if (!CityEntity.type) CityEntity.type = CityEntity?.components?.AllAge?.tags?.tags?.find(value => value.hasOwnProperty('buildingType')).buildingType;
        }
		MainParser.Inactives.check();
	});

	// Building-Upgrades
	FoEproxy.addMetaHandler('building_upgrades', (xhr, postData) => {
		let BuildingUpgradesArray = JSON.parse(xhr.responseText);
		MainParser.BuildingUpgrades = Object.assign({}, ...BuildingUpgradesArray.map((x) => ({ [x.upgradeItem.id]: x })));
	});

	// Building-Sets
	FoEproxy.addMetaHandler('building_sets', (xhr, postData) => {
		let BuildingSetsArray = JSON.parse(xhr.responseText);
		MainParser.BuildingSets = Object.assign({}, ...BuildingSetsArray.map((x) => ({ [x.id]: x })));
	});

	// Building-Chains
	FoEproxy.addMetaHandler('building_chains', (xhr, postData) => {
		let BuildingChainsArray = JSON.parse(xhr.responseText);
		MainParser.BuildingChains = Object.assign({}, ...BuildingChainsArray.map((x) => ({ [x.id]: x })));
	});

	// Selection-Kits
	FoEproxy.addMetaHandler('selection_kits', (xhr, postData) => {
		let SelectKitsArray = JSON.parse(xhr.responseText);
		MainParser.SelectionKits = Object.assign({}, ...SelectKitsArray.map((x) => ({ [x.selectionKitId]: x })));
	});

	// Castle-System-Levels
	FoEproxy.addMetaHandler('castle_system_levels', (xhr, postData) => {
		MainParser.CastleSystemLevels = JSON.parse(xhr.responseText);
	});

	// Allies
	FoEproxy.addMetaHandler('allies', (xhr, postData) => {
		MainParser.Allies.setStats(JSON.parse(xhr.responseText));
	});

	FoEproxy.addMetaHandler('ally_rarities', (xhr, postData) => {
		MainParser.Allies.setRarities(JSON.parse(xhr.responseText));
	});

	// Portrait-Mapping für Spieler Avatare
	FoEproxy.addRawHandler((xhr, requestData) => {
		const idx = requestData.url.indexOf("/assets/shared/avatars/Portraits");

		if (idx !== -1) {
			MainParser.InnoCDN = requestData.url.substring(0, idx + 1);
			let portraits = {};

			$(xhr.responseText).find('portrait').each(function () {
				portraits[$(this).attr('name')] = $(this).attr('src');
			});

			MainParser.PlayerPortraits = portraits;
		}
	});

	// Track Unit Icon-Images
	FoEproxy.addRawHandler((xhr, requestData) => {
		const idx = requestData.url.indexOf("armyuniticons_");

		if (idx !== -1) {
			Unit.CoordsRaw = JSON.parse(xhr.responseText);
		}
	});

	// --------------------------------------------------------------------------------------------------
	// Player- und Gilden-ID setzen
	FoEproxy.addHandler('StartupService', 'getData', (data, postData) => {
        moment.locale(i18n('Local'));
		window.addEventListener("error", function (e) {
			console.error(e.error);
			e.preventDefault();
		});

		// Player-ID, Gilden-ID und Name setzten
		MainParser.StartUp(data.responseData.user_data);

		// check if DB exists
		StrategyPoints.checkForDB(ExtPlayerID);
		EventHandler.checkForDB(ExtPlayerID);
		//UnitGex.checkForDB(ExtPlayerID);
		GuildMemberStat.checkForDB(ExtPlayerID);
		GexStat.checkForDB(ExtPlayerID);
		GuildFights.checkForDB(ExtPlayerID);
		QiProgress.checkForDB(ExtPlayerID);

		// which tab is active in StartUp Object?
		let vals = {
			getNeighborList: 0,
			getFriendsList: 0,
			getClanMemberList: 0,
		}

		for (let i in data.responseData.socialbar_list) {
			vals.getNeighborList += (data.responseData.socialbar_list[i].is_neighbor ? 1 : 0);
			vals.getFriendsList += (data.responseData.socialbar_list[i].is_friend ? 1 : 0);
			vals.getClanMemberList += (data.responseData.socialbar_list[i].is_guild_member ? 1 : 0);
		}

		MainParser.UpdatePlayerDict(
			data.responseData.socialbar_list,
			'PlayerList',
			Object.keys(vals).reduce((a, b) => vals[a] > vals[b] ? a : b)
		);

		// eigene Daten, Maximal alle 6h updaten
		MainParser.SelfPlayer(data.responseData.user_data);

		// Alle Gebäude sichern
		LastMapPlayerID = ExtPlayerID;
		MainParser.CityMapData = Object.assign({}, ...data.responseData.city_map.entities.map((x) => ({ [x.id]: x })));
		MainParser.SaveBuildings(MainParser.CityMapData);
		MainParser.SetArkBonus2();
		// Güterliste
		GoodsList = data.responseData.goodsList

		// freigeschaltete Erweiterungen sichern
		CityMap.UnlockedAreas = data.responseData.city_map.unlocked_areas;
		CityMap.BlockedAreas = data.responseData.city_map.blocked_areas;

		// EventCountdown
		let eventCountDownFeature = data.responseData.feature_flags?.features.filter((v) => { return (v.feature === "event_start_countdown") });
		EventCountdown = eventCountDownFeature?.length > 0 ? eventCountDownFeature[0]["time_string"] : false;

		// Unlocked features
		if (data.responseData.unlocked_features) {
			MainParser.UnlockedFeatures = data.responseData.unlocked_features?.map(function(obj) { return obj.feature; });
		} else {
			$('script').each((i,s)=>{    
				if (!s?.innerHTML?.includes("unlockedFeatures")) return
				try {
					let ulf = JSON.parse([...s?.innerHTML.matchAll(/(unlockedFeatures:\ ')(.*?)(',\n)/gm)][0][2])
					if (Array.isArray(ulf)) MainParser.UnlockedFeatures = ulf.map(x=>x.feature);
				} catch (e) {

				}
			})
		}

		//A/B Tests
		MainParser.ABTests=Object.assign({}, ...data.responseData.active_ab_tests.map((x) => ({ [x.test_name]: x })));
	
		Stats.Init();
		Alerts.init();

	});

	// ResourcesList
	FoEproxy.addHandler('ResourceService', 'getResourceDefinitions', (data, postData) => {
		FHResourcesList = data.responseData
	});

	// --------------------------------------------------------------------------------------------------
	// Bonus notieren, enthält tägliche Rathaus FP
	FoEproxy.addHandler('BonusService', 'getBonuses', (data, postData) => {
		MainParser.BonusService = data.responseData;
	});

	// Limited Bonus (Archenbonus, Kraken etc.)
	FoEproxy.addHandler('BonusService', 'getLimitedBonuses', (data, postData) => {
		MainParser.SetArkBonus(data.responseData);
	});

	// --------------------------------------------------------------------------------------------------
	// Botschafter notieren, enthält Bonus FPs oder Münzen
	FoEproxy.addHandler('EmissaryService', 'getAssigned', (data, postData) => {
		MainParser.EmissaryService = data.responseData;
	});

	// --------------------------------------------------------------------------------------------------
	// Boosts zusammen tragen
	FoEproxy.addHandler('BoostService', 'getAllBoosts', (data, postData) => {
		MainParser.CollectBoosts(data.responseData);
	});

	FoEproxy.addHandler('AllyService', 'getAllies', (data, postData) => {
		MainParser.Allies.getAllies(data.responseData);
	});
	FoEproxy.addHandler('AllyService', 'updateAlly', (data, postData) => {
		MainParser.Allies.updateAlly(data.responseData);
	});
	FoEproxy.addHandler('AllyService', 'addAlly', (data, postData) => {
		MainParser.Allies.addAlly(data.responseData);
	});

	// QI map
	FoEproxy.addHandler('GuildRaidsMapService', 'getOverview', (data, postData) => {		
		QIMap.init(data.responseData)
	})

	// CastleSystem rewards
	FoEproxy.addHandler('CastleSystemService', 'getOverview', (data, postData) => {
		MainParser.CastleSystemChest = data.responseData;
	});

	// --------------------------------------------------------------------------------------------------
	// Karte wird gewechselt zum Außenposten
	FoEproxy.addHandler('CityMapService', 'getCityMap', (data, postData) => {
		ActiveMap = data.responseData.gridId;
		FoEproxy.triggerFoeHelperHandler("ActiveMapUpdated");

		if (ActiveMap === 'era_outpost') {
			CityMap.EraOutpostData = Object.assign({}, ...data.responseData['entities'].map((x) => ({ [x.id]: x })));
			CityMap.EraOutpostAreas = data.responseData['unlocked_areas'];
		}
		else if (ActiveMap === 'guild_raids') {
			CityMap.QIData = Object.assign({}, ...data.responseData['entities'].map((x) => ({ [x.id]: x })));
			CityMap.QIAreas = data.responseData['unlocked_areas'];
		}
		else if (ActiveMap === 'cultural_outpost') {
			CityMap.CulturalOutpostData = Object.assign({}, ...data.responseData['entities'].map((x) => ({ [x.id]: x })));
			CityMap.CulturalOutpostAreas = data.responseData['unlocked_areas'];
		}
	});


	// Stadt wird wieder aufgerufen
	FoEproxy.addHandler('CityMapService', 'getEntities', (data, postData) => {
		CityMap.IsExtern = false

		if (ActiveMap === 'gg') return; // getEntities wurde in den GG ausgelöst => Map nicht ändern

		let MainGrid = false
		for (let i = 0; i < postData.length; i++) {
			let postDataItem = postData[i];

			if (postDataItem['requestClass'] === 'CityMapService' && postDataItem['requestMethod'] === 'getEntities') {
				if (postDataItem['requestData'][0] === 'main') {
					MainGrid = true;
				}
				break;
			}
		}

		if (!MainGrid) { 
			CityMap.IsExtern = true
			return
		} // getEntities wurde in einer fremden Stadt ausgelöst => ActiveMap nicht ändern

		LastMapPlayerID = ExtPlayerID

		MainParser.CityMapData = Object.assign({}, ...data.responseData.map((x) => ({ [x.id]: x })))
		MainParser.SetArkBonus2()

		MainParser.UpdateActiveMap('main')
	});


	// main is entered
	FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
		MainParser.UpdateActiveMap('main');
	});

	// gex is entered
	FoEproxy.addHandler('GuildExpeditionService', 'getOverview', (data, postData) => {
		MainParser.UpdateActiveMap('gex');
	});

	// GBG is entered
	FoEproxy.addHandler('GuildBattlegroundService', 'getBattleground', (data, postData) => {
		MainParser.UpdateActiveMap('gg');
	});

	// QI is entered
	FoEproxy.addHandler('GuildRaidsService', 'getState', (data, postData) => {
		if (!data.responseData?.guildRaidsType) return;
		if (data.responseData?.__class__ != "GuildRaidsRunningState") return;
		if (!data.responseData?.endsAt) return;

		MainParser.UpdateActiveMap('guild_raids');

	});

	// visiting another player
	FoEproxy.addHandler('OtherPlayerService', 'visitPlayer', (data, postData) => {
		CityMap.IsExtern = true
		LastMapPlayerID = data.responseData['other_player']['player_id']
		MainParser.OtherPlayerCityMapData = Object.assign({}, ...data.responseData['city_map']['entities'].map((x) => ({ [x.id]: x })))
	});

	// move buildings, use self aid kits
	FoEproxy.addHandler('CityMapService', (data, postData) => {
		if (data.requestMethod === 'moveEntity' || data.requestMethod === 'moveEntities' || data.requestMethod === 'updateEntity') {
			let Buildings = data.responseData;
			if (Buildings[0]?.player_id != ExtPlayerID) return // opened another players GB
			MainParser.UpdateCityMap(data.responseData);
		}
		else if (data.requestMethod === 'placeBuilding') {
			let building = data.responseData[0];
			if (building && building.id) {
				if (ActiveMap === "cultural_outpost") {
					CityMap.CulturalOutpostData[building.id] = building
					return
				}
				else if (ActiveMap === "era_outpost") {
					CityMap.EraOutpostData[building.id] = building
					return
				}
				else if (ActiveMap === "guild_raids") {
					CityMap.QIData[building.id] = building
					return
				}

				MainParser.CityMapData[building.id] = building;
			}
		}
		else if (data.requestMethod === 'removeBuilding') {
			let ID = postData[0].requestData[0];
			if (ActiveMap === "cultural_outpost") {
				delete CityMap.CulturalOutpostData[ID];
				return
			}
			else if (ActiveMap === "era_outpost") {
				delete CityMap.EraOutpostData[ID];
				return
			}
			else if (ActiveMap === "guild_raids") {
				delete CityMap.QIData[ID];
				return
			}
			if (ID && MainParser.CityMapData[ID]) {
				delete MainParser.CityMapData[ID];
				if (MainParser.NewCityMapData[ID])
					delete MainParser.NewCityMapData[ID];
			}
		}
	});

	// production is started, collected, aborted
	FoEproxy.addHandler('CityProductionService', (data, postData) => {
		if (data.requestMethod === 'pickupProduction' || data.requestMethod === 'pickupAll' || data.requestMethod === 'startProduction' || data.requestMethod === 'cancelProduction') {
			let Buildings = data.responseData['updatedEntities'];
			if (!Buildings) return
			if (ActiveMap != "main") return // do not add outpost buildings
			MainParser.UpdateCityMap(Buildings)
		}
	});

	// remove a friend
	FoEproxy.addHandler('FriendService', 'deleteFriend', (data, postData) => {
		let FriendID = data.responseData;
		if (PlayerDict[FriendID]) {
			PlayerDict[FriendID]['IsFriend'] = false;
		}

		if ($('#moppelhelper').length === 0) {
			EventHandler.CalcMoppelHelperTable();
		}
	});

	// open a message
	FoEproxy.addHandler('ConversationService', 'getConversation', (data, postData) => {
		MainParser.UpdatePlayerDict(data.responseData, 'Conversation');
	});

	FoEproxy.addHandler('BattlefieldService', 'startByBattleType', (data, postData) => {

		// battle finished
		if ([901,902].includes(data.responseData.error_code)) {
			return;
		}
		if (data.responseData["armyId"] === 1 || data.responseData["state"]["round"] === 1 || data.responseData["battleType"]["totalWaves"] === 1) {
			let units = data.responseData.state.unitsOrder;

			for (let i = 0; i < units.length; i++) {
				const unit = units[i];
				if (unit.teamFlag === 1 && data.responseData["battleType"]["totalWaves"] === 1) {
					OwnUnits.push({ "unitTypeId": unit.unitTypeId, "startHitpoints": unit.startHitpoints, "bonuses": unit.bonuses, "abilities": unit.abilities });
				} else if (unit.teamFlag === 2) {
					EnemyUnits.push({ "unitTypeId": unit.unitTypeId, "startHitpoints": unit.startHitpoints, "bonuses": unit.bonuses, "abilities": unit.abilities });
				}
			}

			Fights.push({enemy:EnemyUnits, own:OwnUnits, won:(data.responseData["state"]["winnerBit"] === 1)});
			EnemyUnits = [];
			OwnUnits = [];
		}
		else if(data.responseData["battleType"]["totalWaves"] === 2 && data.responseData["battleType"]["currentWaveId"] == null){
			let units = data.responseData.state.unitsOrder;
			for (let i = 0; i < units.length; i++) {
				const unit = units[i];
				if (unit.teamFlag === 1) {
					OwnUnits.push({ "unitTypeId": unit.unitTypeId, "startHitpoints": unit.startHitpoints, "bonuses": unit.bonuses, "abilities": unit.abilities });
				} else if (unit.teamFlag === 2) {
					EnemyUnits.push({ "unitTypeId": unit.unitTypeId, "startHitpoints": unit.startHitpoints, "bonuses": unit.bonuses, "abilities": unit.abilities });
				}
			}
		}

		// not autobattling in either round 1 or 2
		if (!data.responseData["isAutoBattle"]) {
			HTML.MinimizeBeforeBattle();
		}

		// round was won with autobattle
		// winnerBit==1 round won, winnerBit==2 round lost
		if (data.responseData['state']['winnerBit'] > 0) {
			HTML.MaximizeAfterBattle();
		}
	});

	FoEproxy.addHandler('BattlefieldService', 'submitMove', (data, postData) => {
		// round was won/lost by auto-complete battle during manual turn
		if (data.responseData['winnerBit'] > 0) {
			HTML.MaximizeAfterBattle();
		}
	});

	// if battle was interrupted by browser refresh/server restart
	FoEproxy.addHandler('BattlefieldService', 'continueBattle', (data, postData) => {
		// round in progress was not auto-battle
		if (!data.responseData["isAutoBattle"]) {
			HTML.MinimizeBeforeBattle();
		}
	});

	// if user surrenders
	FoEproxy.addHandler('BattlefieldService', 'surrender', (data, postData) => {
		if (data.responseData["surrenderBit"] == 1) {
			HTML.MaximizeAfterBattle();
		}
	});

	// Nachbarn/Gildenmitglieder/Freunde Tab geöffnet
	FoEproxy.addHandler('OtherPlayerService', 'all', (data, postData) => {
		if (data.requestMethod === 'getNeighborList' || data.requestMethod === 'getFriendsList' || data.requestMethod === 'getClanMemberList' || data.requestMethod === 'getAwaitingFriendRequestCount') {
			MainParser.UpdatePlayerDict(data.responseData, 'PlayerList', data.requestMethod);
		}
		if (data.requestMethod === 'getSocialList') {
			if (data.responseData.neighbours) 
				MainParser.UpdatePlayerDict(data.responseData.neighbours, 'PlayerList', 'getNeighborList');
			if (data.responseData.guildMembers) 
				MainParser.UpdatePlayerDict(data.responseData.guildMembers, 'PlayerList', 'getClanMemberList');
			if (data.responseData.friends) 
				MainParser.UpdatePlayerDict(data.responseData.friends, 'PlayerList', 'getFriendsList');
		}
	});


	// --------------------------------------------------------------------------------------------------
	// goods translations
	FoEproxy.addHandler('ResourceService', 'getResourceDefinitions', (data, postData) => {
		MainParser.setGoodsData(data.responseData);
	});


	// Required by the kits
	FoEproxy.addHandler('InventoryService', 'getItem', (data, postData) => {
		MainParser.UpdateInventoryItem(data.responseData);
	});


	// Required by the kits
	FoEproxy.addHandler('InventoryService', 'getItems', (data, postData) => {
		MainParser.UpdateInventory(data.responseData);
	});


	// Required by the kits
	FoEproxy.addHandler('InventoryService', 'getItemsByType', (data, postData) => {
		MainParser.UpdateInventory(data.responseData);
	});


	// Required by the kits
	FoEproxy.addHandler('InventoryService', 'getItemAmount', (data, postData) => {
		MainParser.UpdateInventoryAmount(data.responseData);
	});


	// --------------------------------------------------------------------------------------------------
	// --------------------------------------------------------------------------------------------------
	// Es wurde das LG eines Mitspielers angeklickt, bzw davor die Übersicht

	// GB overview of another player
	FoEproxy.addHandler('GreatBuildingsService', 'getOtherPlayerOverview', (data, postData) => {
		MainParser.UpdatePlayerDict(data.responseData, 'LGOverview');

		// update investments
		if (Investment) {
			Investment.UpdateData(data.responseData, false);
		}

	});

	// es wird ein LG eines Spielers geöffnet

	// lgUpdateData sammelt die informationen aus mehreren Handlern
	let lgUpdateData = null;

	FoEproxy.addHandler('GreatBuildingsService', 'all', (data, postData) => {
		let getConstruction = data.requestMethod === 'getConstruction' ? data : null;
		let getConstructionRanking = data.requestMethod === 'getConstructionRanking' ? data : null;
		let contributeForgePoints = data.requestMethod === 'contributeForgePoints' ? data : null;
		let Rankings, Bonus = {}, Era;

		if (getConstruction != null) {
			Rankings = getConstruction.responseData.rankings;
			Bonus['passive'] = getConstruction.responseData.next_passive_bonus;
			Bonus['production'] = getConstruction.responseData.next_production_bonus;
			let EraName = getConstruction.responseData.ownerEra;
			if (EraName) Era = Technologies.Eras[EraName];
			IsLevelScroll = false;
		}
		else if (getConstructionRanking != null) {
			Rankings = getConstructionRanking.responseData;
			IsLevelScroll = true;
		}
		else if (contributeForgePoints != null) {
			Rankings = contributeForgePoints.responseData;
			IsLevelScroll = false;
		}

		if (Rankings) {
			if (!lgUpdateData || !lgUpdateData.CityMapEntity) {
				lgUpdateData = { Rankings: Rankings, CityMapEntity: null, Bonus: null };
				// reset lgUpdateData sobald wie möglich (nachdem alle einzelnen Handler ausgeführt wurden)
				Promise.resolve().then(() => lgUpdateData = null);

			} else {
				lgUpdateData.Rankings = Rankings;
				lgUpdateData.Bonus = Bonus;
				lgUpdateData.Era = Era;

				if(lgUpdateData.Rankings && lgUpdateData.CityMapEntity){
					if(!IsLevelScroll) MainParser.SendLGData(lgUpdateData);
				}

				lgUpdate();
			}
		}
	});

	FoEproxy.addHandler('GreatBuildingsService', 'getContributions', (data, postData) => {
		MainParser.UpdatePlayerDict(data.responseData, 'LGContributions');
	});

	FoEproxy.addHandler('CityMapService', 'updateEntity', (data, postData) => {
		if (!lgUpdateData || !lgUpdateData.Rankings) {
			lgUpdateData = { Rankings: null, CityMapEntity: data };
			// reset lgUpdateData sobald wie möglich (nachdem alle einzelnen Handler ausgeführt wurden)
			Promise.resolve().then(() => lgUpdateData = null);
		} else {
			lgUpdateData.CityMapEntity = data;
			lgUpdate();
		}
	});

	FoEproxy.addWsHandler('CityMapService', 'updateEntity', data => {
		for (let b of data.responseData) {
			MainParser.CityMapData[b.id]=b;
		}
	});

	FoEproxy.addRequestHandler('InventoryService', 'useItem', (postData) => {
		if (postData?.requestData?.[0]?.__class__=="UseItemOnBuildingPayload") {
			if (MainParser.Inventory[postData?.requestData?.[0]?.itemId].itemAssetName =="store_building") {
				let id= postData?.requestData?.[0]?.mapEntityId
				if (MainParser.CityMapData[id]) delete MainParser.CityMapData[id]
				if (MainParser.NewCityMapData[id]) delete MainParser.NewCityMapData[id]
			}
		}
	});

	// Update Funktion, die ausgeführt wird, sobald beide Informationen in lgUpdateData vorhanden sind.
	function lgUpdate() {
		const { CityMapEntity, Rankings, Bonus } = lgUpdateData;
		lgUpdateData = null;
		let IsPreviousLevel = false;

		if (!Rankings) return; //Keine Rankings => Fehlermeldung z.B. "Stufe wurde bereits erhöht" wenn man versucht einzuzahlen obwohl schon gelevelt wurde

		//Eigenes LG
		if (CityMapEntity.responseData[0].player_id === ExtPlayerID || Settings.GetSetting('ShowOwnPartOnAllGBs')) {
			//LG Scrollaktion: Beim ersten mal Öffnen Medals von P1 notieren. Wenn gescrollt wird und P1 weniger Medals hat, dann vorheriges Level, sonst aktuelles Level
			if (IsLevelScroll) {
				let Medals = 0;
				for (let i = 0; i < Rankings.length; i++) {
					if (Rankings[i]['reward'] !== undefined) {
						Medals = Rankings[i]['reward']['resources']['medals'];
						break;
					}
				}

				if (Medals !== LGCurrentLevelMedals) {
					IsPreviousLevel = true;
				}
			}
			else {
				let Medals = 0;
				for (let i = 0; i < Rankings.length; i++) {
					if (Rankings[i]['reward'] !== undefined) {
						Medals = Rankings[i]['reward']['resources']['medals'];
						break;
					}
				}
				LGCurrentLevelMedals = Medals;
			}

			Parts.CityMapEntity = CityMapEntity.responseData[0];
			Parts.Rankings = Rankings;
			Parts.IsPreviousLevel = IsPreviousLevel;

			// das erste LG wurde geladen
			$('#partCalc-Btn').removeClass('hud-btn-red');
			$('#partCalc-Btn-closed').remove();

			if ($('#OwnPartBox').length > 0) {
				Parts.CalcBody();
			}
		}

		// Fremdes LG
		if (CityMapEntity.responseData[0].player_id !== ExtPlayerID && !IsLevelScroll)
		{
			$('#calculator-Btn').removeClass('hud-btn-red');
			$('#calculator-Btn-closed').remove();

			Calculator.Rankings = Rankings;
			Calculator.CityMapEntity = CityMapEntity['responseData'][0];

			// wenn schon offen, den Inhalt updaten
			if ($('#costCalculator').length > 0) {
				Calculator.Show();
			}
		}

	}


	// player goods
	FoEproxy.addHandler('ResourceService', 'getPlayerResources', (data, postData) => {
		ResourceStock = data.responseData.resources; // Lagerbestand immer aktualisieren. Betrifft auch andere Module wie Technologies oder Negotiation
		Outposts.CollectResources();
		FoEproxy.triggerFoeHelperHandler('ResourcesUpdated')
		Castle.UpdateCastlePoints(data['requestId']);
	});


	//--------------------------------------------------------------------------------------------------
	//--------------------------------------------------------------------------------------------------


	// Greatbuildings: LG Belohnungen von Arche in Events zählen
	FoEproxy.addHandler('OtherPlayerService', 'getEventsPaginated', (data, postData) => {
		if (data.responseData['events']) {
			GreatBuildings.HandleEventPage(data.responseData['events']);
		}
	});


	FoEproxy.addHandler('TimeService', 'updateTime', async (data, postData) => {
		GameTimeOffset = data.responseData.time * 1000 - new Date().getTime();
		GameTime = data.responseData.time;
		if (MainMenuLoaded) return;

	
		MainMenuLoaded = true;
		await StartUpDone;	
		let MenuSetting = localStorage.getItem('SelectedMenu');
		MainParser.SelectedMenu = MenuSetting || 'RightBar';
		_menu.CallSelectedMenu(MainParser.SelectedMenu);
		
		MainParser.setLanguage();

		Quests.init();	
	});


	// --------------------------------------------------------------------------------------------------
	FoEproxy.addRawWsHandler((data) => {
		let Msg = data?.[0];
		if (!Msg || !Msg.requestClass || !Msg.responseData) return;

		let requestClass = Msg.requestClass;
		let requestMethod = Msg.requestMethod;
		let responseData = Msg.responseData;

		// Goods Update after accepted Trade
		if (requestMethod === "newEvent" && responseData.type === "trade_accepted") {
			ResourceStock[responseData.need.good_id] += responseData.need.value;
			FoEproxy.triggerFoeHelperHandler("ResourcesUpdated");
		}
		// Inventory Update, e.g. when receiving FP packages from GB leveling	
		if (requestClass === 'InventoryService' && requestMethod === 'getItem') {
			MainParser.UpdateInventoryItem(responseData);
		}

		if (requestClass === 'InventoryService' && requestMethod === 'getItemAmount') {
			MainParser.UpdateInventoryAmount(responseData);

		}
	});

	// --------------------------------------------------------------------------------------------------
	// Quests
	FoEproxy.addHandler('QuestService', 'getUpdates', (data, PostData) => {
		if (PostData[0]?.requestClass === 'QuestService' && PostData[0]?.requestMethod === 'advanceQuest') {
			FPCollector.HandleAdvanceQuest(PostData[0]);
		}

		MainParser.Quests = data.responseData;

		FoEproxy.triggerFoeHelperHandler('QuestsUpdated');
	});

	// Update unlocked features
	FoEproxy.addHandler('UnlockableFeatureService', 'getUnlockedFeatures', (data, postData) => {
		MainParser.UnlockedFeatures = data.responseData.map(function(obj) { return obj.feature; });
	});

	// Alte, nich mehr benötigte localStorage einträge löschen (in 2 min)
	setTimeout(() => {
		const keys = Object.keys(localStorage);
		for (let k of keys) {
			if (/^(OV_)?[0-9]+\/X_[A-Za-z_]+[0-9]*$/.test(k)) {
				localStorage.removeItem(k);
			} else if (/^OtherPlayersMotivation-[0-9]+$/.test(k)) {
				localStorage.removeItem(k);
			}
		}
	}, 1000 * 60 * 2);

	// Messages: Thread opened
	FoEproxy.addHandler('ConversationService', 'getConversation', (data, postData) => {
		MainParser.OpenConversation = data.responseData['id'];
	});

	// Messages: Thread closed
	FoEproxy.addHandler('ConversationService', 'markMessageRead', (data, postData) => {
		MainParser.OpenConversation = null;
	});

})();

let HelperBeta = {
	load: (active) => {
		if (active !== false) active = true;
		localStorage.setItem('HelperBetaActive', active);
		location.reload();
	},
	menu: [
		'unitsGex',
		'marketOffers'
	],
	active: JSON.parse(localStorage.getItem('HelperBetaActive')) || devMode == 'true' || loadBeta
};


let MainParser = {

	foeHelperBgApiHandler: /** @type {null|((request: {type: string}&object) => Promise<{ok:true, data: any}|{ok:false, error:string}>)}*/ (null),

	activateDownload: false,
	savedFight: null,
	DebugMode: false,
	Language: 'en',
	SelectedMenu: 'RightBar',
	i18n: null,
	BonusService: null,
	Boosts: {},
	EmissaryService: null,
	PlayerPortraits: [],
	Conversations: [],
	MetaIds: {},
	CityEntities: null,
	CastleSystemLevels: null,
	StartUpType: null,
	OpenConversation: null,
	CastleSystemChest: null,

	// all buildings of the player
	CityMapData: {},
	NewCityMapData: {},
	OtherPlayerCityMapData: {},

	// Unlocked extensions
	UnlockedAreas: null,
	Quests: null,
	ArkBonus: 0,
	Inventory: {},

	// all buildings additional data
	BuildingUpgrades: null,
	BuildingSets: null,
	BuildingChains: null,
	SelectionKits: null,

	InnoCDN: 'https://foede.innogamescdn.com/',

	/**
	* Version specific StartUp Code
	* Todo: Add code that should be executed only until the next update
	*
	*/
	VersionSpecificStartupCode: () => {
		let LastStartedVersion = localStorage.getItem('LastStartedVersion');
		let LastAgreedVersion = localStorage.getItem('LastAgreedVersion');

		if (!LastStartedVersion) {
			MainParser.StartUpType = 'DeletedSettings';
			/* Fresh install or deleted settings */
			/* Attention: If you do stuff here it might be executed every start when surfing in incognito mode */
		}
		else if (LastStartedVersion !== extVersion) {
			MainParser.StartUpType = 'UpdatedVersion';
			if (!(!isRelease)) {localStorage.removeItem("LoadBeta")}
			/* We have a new version installed and started the first time */
		}
		else if (LastAgreedVersion !== extVersion) {
			MainParser.StartUpType = 'NotAgreed';
			/* This is a second start, but the player has not yet agreed to the new prompt */
		}
		else {
			MainParser.StartUpType = 'RegularStart';
			/* Normal start */
		}

		localStorage.setItem('LastStartedVersion', extVersion);
		localStorage.setItem('LastAgreedVersion', extVersion); //Comment out this line if you have something the player must agree on
	},


	BoostMapper: {
		'supplies_boost': ['supply_production'],
		'happiness': ['happiness_amount'],
		'military_boost': ['att_boost_attacker', 'def_boost_attacker'],
		'att_def_boost_attacker': ['att_boost_attacker', 'def_boost_attacker'],
		'fierce_resistance': ['att_boost_defender', 'def_boost_defender'],
		'att_def_boost_defender': ['att_boost_defender', 'def_boost_defender'],
		'advanced_tactics': ['att_boost_attacker', 'def_boost_attacker', 'att_boost_defender', 'def_boost_defender'],
		'money_boost': ['coin_production'],
	},


	/**
	 * Speichert alle aktiven Boosts
	 */
	BoostSums: {
		'att_boost_attacker': 0,
		'def_boost_attacker': 0,
		'att_boost_defender': 0,
		'def_boost_defender': 0,
		'coin_production': 0,
		'supply_production': 0,
		'forge_points_production':0,
		'guild_raids_action_points_collection': 0,
		'guild_raids_coins_production': 0,
		'guild_raids_coins_start': 0,
		'guild_raids_supplies_production': 0,
		'guild_raids_supplies_start': 0,
		'guild_raids_goods_start': 0,
		'guild_raids_units_start': 0,
	},


	/**
	 * Etwas zur background.js schicken
	 *
	 * @param {any & {type: string}} data
	 */
	sendExtMessage: async (data) => {
		const bgApiHandler = MainParser.foeHelperBgApiHandler;

		/** @type {null|Promise<{ok:true,data:any}|{ok:false,error:string}|unknown>} */
		let _responsePromise = null;

		// @ts-ignore
		if (typeof chrome !== 'undefined') {
			// @ts-ignore
			_responsePromise = new Promise(resolve => chrome.runtime.sendMessage(extID, data, resolve));
		}
		else if (bgApiHandler != null) {
			_responsePromise = bgApiHandler(data);

		}
		else {
			throw new Error('No implementation for Extension communication found');
		}

		const responsePromise = _responsePromise;

		const response = await new Promise((resolve, reject) => {
			responsePromise.then(resolve, reject);
			setTimeout(() => resolve({ ok: false, error: "response timeout for: " + JSON.stringify(data) }), 1000)
		});

		if (typeof response !== 'object' || typeof response.ok !== 'boolean') {
			throw new Error('invalid response from Extension-API call');
		}

		if (response.ok === true) {
			return response.data;
		}
		else {
			if (response.error.indexOf('"type":"alerts"')== -1 && response.error.indexOf('"action":"getAll"') == -1)
				throw new Error('EXT-API error: ' + response.error);
		}
	},


	/**
	 *
	 */
	setLanguage: () => {
		// Translation
		MainParser.Language = GuiLng;
	},


	/**
	 * Add x minutes or x hours to the current time
	 *
	 * @param hrs
	 * @param min
	 * @returns {number}
	 */
	getAddedDateTime: (hrs, min = 0) => {

		let time = MainParser.getCurrentDateTime(),
			h = hrs || 0,
			m = min || 0,

			// Zeit aufschlagen
			newTime = time + (1000 * 60 * m) + (1000 * 60 * 60 * h),

			// daraus neues Datumsobjekt erzeugen
			newDate = new Date(newTime);

		return newDate.getTime();
	},


	/**
	 * Returns the current date time
	 *
	 * @returns {number}
	 */
	getCurrentDateTime: () => {
		return MainParser.getCurrentDate().getTime();
	},


	/**
	 * Returns the current date in playing time
	 *
	 * @returns {Date}
	 */
	getCurrentDate: () => {
		return new Date(Date.now() + GameTimeOffset);
	},


	/**
	 * Performs rounding taking into account floating point inaccuracy
	 *
	 * @param {number} value
	 * @returns {number}
	 */
	round: (value) => {
		let Epsilon = 0.000001;

		if (value >= 0) {
			return Math.round(value + Epsilon);
		}
		else {
			return Math.round(value - Epsilon);
		}
	},


	/**
	 * Storage has always had a time surcharge
	 *
	 * @param {number} actual
	 * @param {number} storage
	 * @returns {string|boolean}
	 */
	compareTime: (actual, storage) => {

		// es gibt noch keinen Eintrag
		if (storage === null) {
			return true;

		} else if (actual > storage) {
			return true;

			// Zeit Differenz berechnen
		} else if (storage > actual) {

			let diff = Math.abs(actual - storage),
				timeDiff = new Date(diff);

			let hh = Math.floor(timeDiff / 1000 / 60 / 60);
			if (hh < 10) {
				hh = '0' + hh;
			}
			timeDiff -= hh * 1000 * 60 * 60;

			let mm = Math.floor(timeDiff / 1000 / 60);
			if (mm < 10) {
				mm = '0' + mm;
			}
			timeDiff -= mm * 1000 * 60;

			let ss = Math.floor(timeDiff / 1000);
			if (ss < 10) {
				ss = '0' + ss;
			}

			return mm + "min und " + ss + 's';
		}
	},


	/**
	 * Check whether an update is necessary
	 *
	 * @param ep
	 * @returns {*}
	 */
	checkNextUpdate: (ep) => {
		let s = localStorage.getItem(ep),
			a = MainParser.getCurrentDateTime();

		return MainParser.compareTime(a, s);
	},


	/**
	 * @param PlayerID
	 * @param PlayerName
	 */
	GetPlayerLink: (PlayerID, PlayerName) => {
		if (Settings.GetSetting('ShowLinks'))
		{
			let PlayerLink = HTML.i18nReplacer(PlayerLinkFormat, { 'world': ExtWorld.toUpperCase(), 'playerid': PlayerID });

			return `<a class="external-link game-cursor" href="${PlayerLink}" target="_blank">${HTML.escapeHtml(PlayerName)} ${LinkIcon}</a>`;
		}
		else {
			return HTML.escapeHtml(PlayerName);
		}
	},
	
	/**
	 * @param GuildID
	 * @param GuildName
	 * @param WorldId
	 */
	GetGuildLink: (GuildID, GuildName, WorldId) => {
		if(!WorldId) WorldId = ExtWorld;

		if (Settings.GetSetting('ShowLinks'))
		{
			let GuildLink = HTML.i18nReplacer(GuildLinkFormat, { 'world': WorldId.toUpperCase(), 'guildid': GuildID });

			return `<a class="external-link game-cursor" href="${GuildLink}" target="_blank">${HTML.escapeHtml(GuildName)} ${LinkIcon}</a>`;
		}
		else {
			return HTML.escapeHtml(GuildName);
		}
	},

	/**
	 * @param BuildingID
	 * @param BuildingName
	 */
	GetBuildingLink: (BuildingID, BuildingName) => {
		if (Settings.GetSetting('ShowLinks'))
		{
			let BuildingLink = HTML.i18nReplacer(BuildingsLinkFormat, {'buildingid': BuildingID });

			return `<a class="external-link game-cursor" href="${BuildingLink}" target="_blank">${BuildingName} ${LinkIcon}</a>`;
		}
		else {
			return BuildingName;
		}
	},


	/**
	 * Adds a value to a FormData object under the specified prefix/key, serialising objects/arrays.
	 *
	 * @param {FormData} formData the formdata to add this data to
	 * @param {string} prefix the prefix/key for the value to store
	 * @param {any} value the value to store
	 */
	obj2FormData: (() => {// closure
		// Funktion wird im scope definiert, damit die rekursion direkt darauf zugreifen kann.
		function obj2FormData(formData, prefix, value) {
			if (typeof value === 'object') {
				for (let k in value) {
					if (!value.hasOwnProperty(k)) continue;
					obj2FormData(formData, `${prefix}[${k}]`, value[k]);
				}
			} else {
				formData.append(prefix, '' + value);
			}
		}
		return obj2FormData;
	})(),


	/**
	 * Sending data "home"
	 *
	 * @param data
	 * @param ep
	 * @param successCallback
	 */
	send2Server: (data, ep, successCallback) => {

		let req = fetch(
			ApiURL + ep + '/?player_id=' + ExtPlayerID + '&guild_id=' + ExtGuildID + '&world=' + ExtWorld,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ data })
			}
		);

		if (successCallback !== undefined) {
			req
				.then(response => {
					if (response.status === 200) {
						response
							.json()
							.then(successCallback)
							;
					}
				});
		}
	},


	/**
	 * Back up player data
	 *
	 * @param d
	 */
	StartUp: (d) => {
		Settings.Init(false);

		MainParser.VersionSpecificStartupCode();
		window.dispatchEvent(new CustomEvent('foe-helper#StartUpDone'))
		ExtGuildID = d['clan_id'];
		ExtGuildPermission = d['clan_permissions'];
		//ExtWorld = window.location.hostname.split('.')[0];
		CurrentEra = d['era'];
		if (CurrentEra['era']) CurrentEra = CurrentEra['era'];
		CurrentEraID = Technologies.Eras[CurrentEra];

		MainParser.sendExtMessage({
			type: 'storeData',
			key: 'current_guild_id',
			data: ExtGuildID
		});
		localStorage.setItem('current_guild_id', ExtGuildID);

		ExtPlayerID = d['player_id'];
		MainParser.sendExtMessage({
			type: 'storeData',
			key: 'current_player_id',
			data: ExtPlayerID
		});
		localStorage.setItem('current_player_id', ExtPlayerID);

		IndexDB.Init(ExtPlayerID);

		MainParser.sendExtMessage({
			type: 'storeData',
			key: 'current_world',
			data: ExtWorld
		});
		localStorage.setItem('current_world', ExtWorld);

		ExtPlayerName = d['user_name'];
		MainParser.sendExtMessage({
			type: 'storeData',
			key: 'current_player_name',
			data: ExtPlayerName
		});

		ExtPlayerAvatar = d.portrait_id;

		Infoboard.Init();
		EventHandler.Init();
	},


	/**
	 * Update own data (guild change etc)
	 *
	 * @param d
	 */
	SelfPlayer: (d) => {

		if (Settings.GetSetting('GlobalSend') === false) {
			return;
		}

		let data = {
			player_id: d['player_id'],
			user_name: d['user_name'],
			portrait_id: d['portrait_id'],
			clan_id: d['clan_id'],
		};

		MainParser.sendExtMessage({
			type: 'send2Api',
			url: `${ApiURL}SelfPlayer/?player_id=${ExtPlayerID}&guild_id=${ExtGuildID}&world=${ExtWorld}&v=${extVersion}`,
			data: JSON.stringify(data)
		});
	},


	/**
	 * Collect some stats
	 *
	 * @param d
	 * @returns {boolean}
	 * @constructor
	 */
	SendLGData: (d)=> {

		const dataEntity = d['CityMapEntity']['responseData'][0],
			realData = {
				image: srcLinks.get(`/city/buildings/${dataEntity['cityentity_id'].replace('X_', 'X_SS_')}.png`, true),
				entity: dataEntity,
				ranking: d['Rankings'],
				bonus: d['Bonus'],
				era: d['Era'],
			}

		MainParser.sendExtMessage({
			type: 'send2Api',
			url: `${ApiURL}OwnLGData/?world=${ExtWorld}${MainParser.DebugMode ? '&debug' : ''}&v=${extVersion}`,
			data: JSON.stringify(realData)
		});
	},


	/**
	 * Alle Gebäude sichern,
	 * Update your own LGs
	 *
	 * @param d
	 */
	SaveBuildings: (d) => {
		let lgs = [];

		for (let i in d) {
			if (!d.hasOwnProperty(i)) continue;

			if (d[i]['type'] === 'greatbuilding') {
				let b = {
					cityentity_id: d[i]['cityentity_id'],
					level: d[i]['level'],
					max_level: d[i]['max_level'],
					invested_forge_points: d[i]['state']['invested_forge_points'] || 0,
					forge_points_for_level_up: d[i]['state']['forge_points_for_level_up']
				};

				lgs.push(b);

				if (d[i]['bonus'] !== undefined && MainParser.BoostMapper[d[i]['bonus']['type']]) {
					if (d[i]['bonus']['type'] !== 'happiness') { //Nicht als Boost zählen => Wird Productions extra geprüft und ausgewiesen
						let Boosts = MainParser.BoostMapper[d[i]['bonus']['type']];
						for (let j = 0; j < Boosts.length;j++) {
							MainParser.BoostSums[Boosts[j]] += d[i]['bonus']['value'];
                        }
					}
				}
			}
		}
	},
	Allies:{
		buildingList:null,
		allyList:null,
		stats:null,
		rarities:null,
		names:null,
		getAllies:(allies)=>{
			MainParser.Allies.allyList = Object.assign({}, ...allies.map(a=>({[a.id]:a})));
			let list = MainParser.Allies.buildingList = {}
			for (let ally of allies) {
				if (!ally.mapEntityId) continue
				if (list[ally.mapEntityId]) 
					list[ally.mapEntityId][ally.id]=ally.id
				else 
				 	list[ally.mapEntityId] = {[ally.id]:ally.id}
			}
		},
		updateAlly:(ally)=>{
			if (ally.mapEntityId) {
				let list = MainParser.Allies.buildingList
				if (list[ally.mapEntityId]) 
					list[ally.mapEntityId][ally.id]=ally.id
				else 
				 	list[ally.mapEntityId] = {[ally.id]:ally.id}
				MainParser.Allies.allyList[ally.id] = ally
			} else {
				mapID=MainParser.Allies.allyList[ally.id].mapEntityId
				delete MainParser.Allies.buildingList[mapID][ally.id]
				if (Object.keys(MainParser.Allies.buildingList[mapID]).length==0) delete MainParser.Allies.buildingList[mapID]
				MainParser.Allies.allyList[ally.id] = ally
			}
		},
		addAlly:(ally)=>{
			MainParser.Allies.allyList[ally.id]=ally
		},
		setStats:(rawStats)=>{
			let stats = MainParser.Allies.stats = {}
			for (ally of rawStats) {
				stats[ally.id]={}
				ally.rarityStats.forEach((r)=>{
					stats[ally.id][r.rarity.value]=Object.assign({}, ...r.levels.map(l=>({[l.level]:l})))
				})
			}
			MainParser.Allies.names = Object.assign({}, ...rawStats.map(a=>({[a.id]:a.name})))
		},
		getProd:(CityMapId) => {
			let M = MainParser.Allies
			if (!M.buildingList?.[CityMapId]) return null
			let prod={}
			Object.values(M.buildingList[CityMapId]).forEach(id=> {
				let a=M.allyList[id]
				let stat=M.stats[a.allyId][a.rarity.value][a.level]
				for (let s of Object.keys(stat)) {
					if (s=="level") continue
					if (prod[s]) 
						prod[s].concat(stat[s])
					else
						prod[s]=stat[s]
				}
			})
			return prod
		},
		tooltip:(id)=>{
			if (!MainParser.Allies.buildingList?.[id]) return ""
			return `data-allies ="${JSON.stringify(Object.values(MainParser.Allies.buildingList[id]))}"`
		},
		setRarities:(raw)=>{
			MainParser.Allies.rarities=Object.assign({}, ...raw.map(r=>({[r.id.value]:r})))
		},
		getAllieData:(id)=>{
			ally={
				id:id,
				allyId:MainParser.Allies.allyList[id].allyId,
				rarity:MainParser.Allies.allyList[id].rarity.value,
				level:MainParser.Allies.allyList[id].level,
				name:MainParser.Allies.names[MainParser.Allies.allyList[id].allyId],
			}
			let prod = {}
			let stat = MainParser.Allies.stats[ally.allyId][ally.rarity][ally.level]
			let type = "military"
			for (let s of Object.keys(stat)) { // ToDo: check stats to change type whenever implemented
				if (s=="level") continue
				if (prod[s]) 
					prod[s].concat(stat[s])
				else
					prod[s]=stat[s]
			}
			ally.prod = prod
			ally.type = type
			return ally
		}
	},



	/**
	 * Collects active boosts from the city
	 *
	 * @param d
	 */
	CollectBoosts: (d) => {
		MainParser.Boosts = {};

		for (let i in d) {
			if (!d.hasOwnProperty(i)) continue;

			let Boost = d[i];

			let EntityID = Boost['entityId']
			if (Boost.origin == "castle_system")
				EntityID = 2000000023 // castle system has entityid 2000000023
			if (!EntityID) EntityID = 0;
			if (!MainParser.Boosts[EntityID]) MainParser.Boosts[EntityID] = []
			MainParser.Boosts[EntityID].push(Boost)
			if (Boost.origin==="inventory_item") {
				BoostPotions.activate(Boost.type,{expire:Boost.expireTime,target:Boost.targetedFeature||"all",value:Boost.value})
			}
			if (MainParser.BoostSums[d[i]['type']] !== undefined && (d[i]['type']!='guild_raids_action_points_collection' || MainParser.CityMapData[d[i].entityId])) {
				MainParser.BoostSums[d[i]['type']] += d[i]['value']
			}
			if (MainParser.BoostMapper[d[i]['type']]) {
				if (d[i]['type'] !== 'happiness') { // => Wird in Productions extra geprüft und ausgewiesen
					let Boosts = MainParser.BoostMapper[d[i]['type']];
					for (let j = 0; j < Boosts.length;j++) {
						MainParser.BoostSums[Boosts[j]] += d[i]['value'];
					}
				}
			}
		}
	},


	/**
	 * Determine ark bonus globally
	 *
	 * @param LimitedBonuses
	 */
	SetArkBonus: (LimitedBonuses) => {
		let ArkBonus = 0;

		for (let i in LimitedBonuses) {

			if (!LimitedBonuses.hasOwnProperty(i)) { break }

			if (LimitedBonuses[i].type === 'contribution_boost') {
				ArkBonus += LimitedBonuses[i].value;
			}
		}

		MainParser.updateArkBonus(ArkBonus,"Limited Bonuses");
	},

	SetArkBonus2: () => {
		let ArkBonus = 0;

		for (let i of Object.values(MainParser.CityMapData).filter(x => x?.bonus?.type=="contribution_boost")) {
			ArkBonus += i.bonus.value;
		}

		MainParser.updateArkBonus(ArkBonus,"City Map");
	},

	updateArkBonus:(ArkBonus, Source)=>{
		if (ArkBonus > MainParser.ArkBonus) {
			if (MainParser.ArkBonus > 0) {
				const s = `SetArkBonus: updated ArkBonus from ${MainParser.ArkBonus} to ${ArkBonus} by ${Source}`;
				if (devMode === 'true') {
					HTML.ShowToastMsg({
						show: true,
						head: 'Developer log',
						text: s,
						type: 'info',
						hideAfter: 20000,
					});
				}
			}
			MainParser.ArkBonus = ArkBonus;
		}
	},

	/**
	 * Player information Updating message list & Website data
	 *
	 * @param d
	 * @param Source
	 * @param ListType
	 * @constructor
	 */
	UpdatePlayerDict: (d, Source, ListType = undefined) => {
		if (Source === 'Conversation') {
			for (let i in d['messages']) {
				if (!d['messages'].hasOwnProperty(i))
					continue;

				let Message = d['messages'][i];

				if (Message.sender !== undefined) {
					MainParser.UpdatePlayerDictCore(Message.sender);
				}
			}
		}

		else if (Source === 'LGOverview' && d[0]) {
			MainParser.UpdatePlayerDictCore(d[0].player);
		}

		else if (Source === 'LGContributions') {
			for (let i in d) {
				if (!d.hasOwnProperty(i))
					continue;

				MainParser.UpdatePlayerDictCore(d[i].player);
			}
		}

		else if (Source === 'PlayerList') {
			for (let i in d) {
				if (!d.hasOwnProperty(i))
					continue;

				MainParser.UpdatePlayerDictCore(d[i]);
			}

			if (ListType === 'getNeighborList') {
				PlayerDictNeighborsUpdated = true;
			}
			else if (ListType === 'getClanMemberList') {
				PlayerDictGuildUpdated = true;
			}
			else if (ListType === 'getFriendsList') {
				PlayerDictFriendsUpdated = true;
			}

			if ($('#moppelhelper').length > 0) {
				EventHandler.CalcMoppelHelperBody();
			}
		}
	},


	/**
	 * Update player information
	 *
	 * @param Player
	 * @constructor
	 */
	UpdatePlayerDictCore: (Player) => {

		let PlayerID = Player['player_id'];
		let HasGuildPermission = ((ExtGuildPermission & GuildMemberStat.GuildPermission_Leader) > 0 || (ExtGuildPermission & GuildMemberStat.GuildPermission_Founder) > 0);

		if (PlayerID !== undefined) {
			if (PlayerDict[PlayerID] === undefined) PlayerDict[PlayerID] = {
										Activity: (Player['is_friend'] || (Player['is_guild_member'] && HasGuildPermission)) ? 0 : undefined
									};

			PlayerDict[PlayerID]['PlayerID'] = PlayerID;
			if (Player['name'] !== undefined) PlayerDict[PlayerID]['PlayerName'] = Player['name'];
			if (Player['clan'] !== undefined) PlayerDict[PlayerID]['ClanName'] = Player['clan']['name'];
			if (Player['clan_id'] !== undefined) PlayerDict[PlayerID]['ClanId'] = Player['clan_id'];
			if (Player['avatar'] !== undefined) PlayerDict[PlayerID]['Avatar'] = Player['avatar'];
			if (Player['is_neighbor'] !== undefined) PlayerDict[PlayerID]['IsNeighbor'] = Player['is_neighbor'];
			if (Player['is_guild_member'] !== undefined) PlayerDict[PlayerID]['IsGuildMember'] = Player['is_guild_member'];
			if (Player['is_friend'] !== undefined) PlayerDict[PlayerID]['IsFriend'] = Player['is_friend'];
			if (Player['is_self'] !== undefined) PlayerDict[PlayerID]['IsSelf'] = Player['is_self'];
			if (Player['score'] !== undefined) PlayerDict[PlayerID]['Score'] = Player['score'];
			if (Player['activity'] !== undefined) PlayerDict[PlayerID]['Activity'] = Player['activity'];
			if (Player['era'] !== undefined) PlayerDict[PlayerID]['Era'] = Player['era'];
		}
	},


	/**
	 * Compose translations for the goods
	 *
	 * @param d
	 */
	setGoodsData: (d) => {
		for (let i in d) {
			if (d.hasOwnProperty(i)) {
				GoodsData[d[i]['id']] = d[i];
			}
		}
	},


	/**
	 * Updates the inventory
	 *
	 * @param Items
	 */
	UpdateInventory: (Items) => {
		//MainParser.Inventory = {};
		for (let i = 0; i < Items.length; i++) {
			let ID = Items[i]['id'];
			MainParser.Inventory[ID] = Items[i];
		}
		FoEproxy.triggerFoeHelperHandler('InventoryUpdated');
	},


	/**
	 * Updates the inventory
	 *
	 * @param Item
	 */
	UpdateInventoryItem: (Item) => {
		let ID = Item['id'];
		MainParser.Inventory[ID] = Item;
		FoEproxy.triggerFoeHelperHandler('InventoryUpdated');
	},


	/**
	 * Updates the inventory
	 *
	 * @param Item
	 */
	UpdateInventoryAmount: (Item) => {
			let ID = Item[0],
			Amount = Item[1];
			try {
				MainParser.Inventory[ID].inStock = Amount;
			} catch (e) {
			}
			FoEproxy.triggerFoeHelperHandler('InventoryUpdated');
	},


	/**
	 * Updates a building from CityMapData or CityMapEraOutpost
	 *
	 * @param Buildings
	 * */
	UpdateCityMap: (Buildings) => {
		for (let i in Buildings) {
			if (!Buildings.hasOwnProperty(i)) continue;

			if (Buildings[i]['player_id'] !== ExtPlayerID) continue; //Fremdes Gebäude (z.B. Nachbarn besuchen und LG öffnen)

			let ID = Buildings[i]['id'];
			if (MainParser.CityMapData[ID]) {
				MainParser.CityMapData[ID] = Buildings[i];
			} 
			if (ActiveMap === "era_outpost") {
				CityMap.EraOutpostData[ID] = Buildings[i];
			}
			else if (ActiveMap === "cultural_outpost") {
				CityMap.CulturalOutpostData[ID] = Buildings[i];
			}
			else if (ActiveMap === "guild_raids") {
				CityMap.QIData[ID] = Buildings[i];
			}
		}
		MainParser.SetArkBonus2();

		if ($('#bluegalaxy').length > 0) {
			BlueGalaxy.CalcBody(Buildings);
		}

		FPCollector.CityMapDataNew = Buildings;
	},


	/**
	 * Collect titles of the chats
	 *
	 * @param d
	 * @param refresh
	 */
	setConversations: (d, refresh = false) => {

		// If the cache is empty, read out the memory.
		if (MainParser.Conversations.length === 0 && refresh)
		{
			let StorageHeader = localStorage.getItem('ConversationsHeaders');
			if (StorageHeader !== null) {
				MainParser.Conversations = JSON.parse(StorageHeader);
			}
		}
		let day = Math.floor(Date.now()/86400000);
		let LCUindex = MainParser.Conversations.findIndex((obj) => (obj.id === "__lastCleanup"));
		let LCU = day;
		if (LCUindex === -1) {
			MainParser.Conversations.forEach( (obj) => obj.lastSeen = day);
			MainParser.Conversations.push({
				id: "__lastCleanup",
				LCU: day,
				lastSeen: day
			})
		} else {
			LCU = MainParser.Conversations[LCUindex]["LCU"];
			MainParser.Conversations[LCUindex]["lastSeen"] = day;
		}

		if (d['teasers'])
		{
			for (let k in d['teasers'])
			{
				if (!d['teasers'].hasOwnProperty(k)) {
					continue;
				}

				let key = MainParser.Conversations.findIndex((obj) => (obj.id === d['teasers'][k]['id']));

				// Is a key already available?
				if (key !== -1) {
					MainParser.Conversations[key]['type'] = d['type'];
					MainParser.Conversations[key]['title'] = d['teasers'][k]['title'];
					MainParser.Conversations[key]['hidden'] = d['teasers'][k]['isHidden'];
					MainParser.Conversations[key]['favorite'] = d['teasers'][k]['isFavorite'];
					MainParser.Conversations[key]['important'] = d['teasers'][k]['isImportant'];
					MainParser.Conversations[key]['lastSeen'] = day;
				}
				// → Create key
				else {
					MainParser.Conversations.push({
						type: d['type'],
						id: d['teasers'][k]['id'],
						title: d['teasers'][k]['title'],
						hidden: d['teasers'][k]['isHidden'],
						favorite: d['teasers'][k]['isFavorite'],
						important: d['teasers'][k]['isImportant'],
						lastSeen: day
					});
				}

			}

		}

		if (MainParser.Conversations.length > 0)
		{
			//cleanup of entries that have not been seen for more than a month - executes once per day
			if (LCU != day) {
				MainParser.Conversations[LCUindex]["LCU"] = day;
				MainParser.Conversations = MainParser.Conversations.filter(obj => obj.lastSeen +30 > day);
			}
			// Dopplungen entfernen und Daten lokal abspeichern
			MainParser.Conversations = [...new Set(MainParser.Conversations.map(s => JSON.stringify(s)))].map(s => JSON.parse(s));
			localStorage.setItem('ConversationsHeaders', JSON.stringify(MainParser.Conversations));
		}
	},


	/**
	 * Get a jSON via Ajax
	 *
	 */
	loadJSON: (url, callback) => {

		let xobj = new XMLHttpRequest();
		xobj.overrideMimeType("application/json");
		xobj.open('GET', url, true);
		xobj.onreadystatechange = function () {
			if (xobj.readyState === 4 && xobj.status === 200) {
				callback(xobj.responseText);
			}
		};
		xobj.send(null);
	},


	/**
	 * Loads a file from a given URL
	 *
	 * @param url
	 * @param callback
	 */
	loadFile: (url, callback) => {

		let xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'blob';
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4 && xhr.status === 200)
			{
				let reader = new FileReader();
				reader.readAsArrayBuffer(xhr.response);
				reader.onload = function (e) {
					callback(e.target.result);
				};
			}
			else {
				callback(false);
			}
		};
		xhr.send();

	},


	ClearText: (text) => {
		let RegEx = new RegExp(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi);

		return text.replace(RegEx, '');
	},


	ResizeFunctions: () => {

		// FP-Bar
		StrategyPoints.HandleWindowResize();
	},


	/**
	 * Create a blob for file download
	 *
	 * @param Blob
	 * @param FileName
	 * @constructor
	 */
	ExportFile: (Blob, FileName) => {
		// Browsercheck
		let isIE = !!document.documentMode;

		if (isIE) {
			window.navigator.msSaveBlob(Blob, FileName);
		}
		else {
			let url = window.URL || window.webkitURL,
				link = url.createObjectURL(Blob),
				a = document.createElement('a');

			a.download = FileName;
			a.href = link;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		}
	},

	Inactives: {
		list:[],
		ignore: JSON.parse(localStorage.getItem("LimitedBuildingsIgnoreList")||'[]'),
		check: () => {
			//get list of buildings for which an alert is already set
			let LB = JSON.parse(localStorage.getItem("LimitedBuildingsAlertSet")||'{}')
			//get list of expired limited buildings in city
			let list = Object.values(MainParser.CityMapData).filter(value => !!value.decayedFromCityEntityId).map(value => value.id);
			//remove buildings that were already tracked and that should have just triggered an alert
			for (let i = list.length-1;i>=0;i--) {
				if (LB[list[i]] || MainParser.Inactives.ignore.includes(MainParser.CityMapData[list[i]].cityentity_id)) {
					list.splice(i,1)
				}
			}
			MainParser.Inactives.list = [...new Set(list.map(x=>MainParser.CityMapData[x].cityentity_id))];
			
			//remove tracked buildings if time ran out
			for (let x in LB) {
				if (!LB[x]) continue;
				if (LB[x]<GameTime*1000-GameTimeOffset) delete LB[x];
				localStorage.setItem("LimitedBuildingsAlertSet",JSON.stringify(LB));
			}
			if(!Settings.GetSetting('ShowBuildingsExpired')){
				return;
			}
			//create instant alert for currently expired buildings		
			if (list.length > 0) {
					const data = {
					title: i18n("InactiveBuildingsAlert.title"),
					body: list.map(x=>MainParser.CityEntities[MainParser.CityMapData[x].cityentity_id].name).join("\n"),
					expires: moment().add(1,"seconds").valueOf(),
					repeat: -1,
					persistent: true,
					tag: '',
					category: 'event',
					vibrate: false,
					actions: [{title:"OK"}]
				};
		
				MainParser.sendExtMessage({
					type: 'alerts',
					playerId: ExtPlayerID,
					action: 'create',
					data: data,
				})
			}
			let buildings = Object.values(MainParser.CityMapData)
			for (let building of buildings) {
				// set alerts for limited buildings that will run out in the future and that have no alert yet
				if (!LB[building.id] && MainParser.CityEntities[building.cityentity_id]?.components?.AllAge?.limited?.config?.expireTime) {
					const data = {
						title: i18n("InactiveBuildingsAlert.title"),
						body: MainParser.CityEntities[MainParser.CityEntities[building.cityentity_id]?.components?.AllAge?.limited?.config?.targetCityEntityId].name,
						expires: (MainParser.CityEntities[building.cityentity_id]?.components?.AllAge?.limited?.config?.expireTime + building.state.constructionFinishedAt)*1000 - GameTimeOffset,
						repeat: -1,
						persistent: true,
						tag: '',
						category: 'event',
						vibrate: false,
						actions: [{title:"OK"}]
					};
			
					MainParser.sendExtMessage({
						type: 'alerts',
						playerId: ExtPlayerID,
						action: 'create',
						data: data,
					}).then((aId) => {
						LB[building.id]=(MainParser.CityEntities[building.cityentity_id]?.components?.AllAge?.limited?.config?.expireTime + building.state.constructionFinishedAt)*1000 - GameTimeOffset;
						localStorage.setItem("LimitedBuildingsAlertSet",JSON.stringify(LB));
					})
				}
			}
		},
		showSettings: ()=> {

			if ($('#inactivesSettingsBox').length === 0) {
				HTML.Box({
					id: 'inactivesSettingsBox',
					title: i18n('Boxes.InactivesSettings.Title'),
					//ask: i18n('Boxes.AuctionSettings.HelpLink'),
					auto_close: true,
					dragdrop: true,
					minimize: true,
					resize: true,
				});
	
				//HTML.AddCssFile('auctions');
			}
			MainParser.Inactives.updateSettings();
		},
		updateSettings:()=>{ 
			let t=[];
			//t.push(`<h2>${i18n('Boxes.InactivesSettings.Ignored')}</h2>`);
			t.push(`<h2>${i18n('Boxes.InactivesSettings.Toggle')}</h2>`);
			for (let id of MainParser.Inactives.ignore) {
				t.push(`<span class="inactivesIgnoreToggle" data-id="${id}" title="${i18n('Boxes.InactivesSettings.NoAlert')}">🤐${MainParser.CityEntities[id].name}</span></br>`);
			}
			//t.push(`<h2>${i18n('Boxes.InactivesSettings.ClickToIgnore')}</h2>`);
			
			for (let id of MainParser.Inactives.list) {
				t.push(`<span class="inactivesIgnoreToggle" data-id="${id}" title="${i18n('Boxes.InactivesSettings.AlertActive')}">⚠️${MainParser.CityEntities[id].name}</span></br>`);
			}
			
			
			$('#inactivesSettingsBoxBody').html(t.join(''));
			
			$('.inactivesIgnoreToggle').on("click", (e) => {
				let id = e.target.dataset.id;
				let i = MainParser.Inactives.ignore.findIndex(x => x==id);
				if (i>=0) {
					MainParser.Inactives.ignore.splice(i,1);
					MainParser.Inactives.list.push(id);

				} else {
					i = MainParser.Inactives.list.findIndex(x => x==id);
					MainParser.Inactives.list.splice(i,1);
					MainParser.Inactives.ignore.push(id);

				};
				localStorage.setItem("LimitedBuildingsIgnoreList",JSON.stringify(MainParser.Inactives.ignore));
				MainParser.Inactives.updateSettings();
			});
		},


	},
	UpdateActiveMap: (map)=>{
		ActiveMap = map
		FoEproxy.triggerFoeHelperHandler("ActiveMapUpdated");
	}

};

if (window.foeHelperBgApiHandler !== undefined && window.foeHelperBgApiHandler instanceof Function) {
	MainParser.foeHelperBgApiHandler = window.foeHelperBgApiHandler;
	delete window.foeHelperBgApiHandler;
}

console.log('FOE Helper version ' + extVersion + ' started' + (extVersion.indexOf("beta") > -1 ? ' in Beta Mode': '') + '. ID: ' + extID);
console.log(navigator.userAgent);
