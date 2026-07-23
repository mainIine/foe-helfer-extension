/*
 * *************************************************************************************
 *
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
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

let ExistenceConfirmed = async (varlist)=>{
	varlist = varlist.split('||')
	return new Promise((resolve, reject) => {
		let timer = () => {
			let doResolve = true;
			for (let x of varlist ) {
				if (x.substr(0,2) == '$(' && eval(x).length === 0) { // jQuery object
					doResolve = false
					//console.log(x+' not yet defined');
					break;
				}
				if (eval('typeof '+x) === 'undefined' || eval(x) === null || eval(x) === undefined) { // normal var
					doResolve = false
					//console.log(x+' not yet defined');
					break;
				}
			}
			if (doResolve) 
				resolve();
			else 
				setTimeout(timer, 100);
		};
		timer();
	});
};

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
	GoodsData = {},
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
	StartUpDone = new Promise(resolve => 
			window.addEventListener('foe-helper#StartUpDone', resolve, {once: true, passive: true})),
	Fights = [],
	OwnUnits = [],
	EnemyUnits = [],
	UnlockedFeatures = [],
	possibleMaps = ['main', 'gex', 'gg', 'era_outpost', 'guild_raids', 'cultural_outpost'],
	PlayerLinkFormat = 'https://foe.scoredb.io/__world__/Player/__playerid__',
	PlayerLinkFormat2 = 'https://foestats.com/__server__/__world__/players/__playerid__',
	GuildLinkFormat = 'https://foe.scoredb.io/__world__/Guild/__guildid__',
	GuildLinkFormat2 = 'https://foestats.com/__server__/__world__/guilds/__guildid__',
	BuildingsLinkFormat = 'https://forgeofempires.fandom.com/wiki/__buildingid__',
	LinkIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="22pt" height="22pt" viewBox="0 0 22 22"><g><path id="foehelper-external-link-icon" d="M 13 0 L 13 2 L 18.5625 2 L 6.28125 14.28125 L 7.722656 15.722656 L 20 3.4375 L 20 9 L 22 9 L 22 0 Z M 0 4 L 0 22 L 18 22 L 18 9 L 16 11 L 16 20 L 2 20 L 2 6 L 11 6 L 13 4 Z M 0 4 "/></g></svg>';

let GameTime = {
	Offset: 0,
	set:(time)=>{
		GameTime.Offset = time-moment().unix();
	},	
	get:()=>{
		return moment().unix()+GameTime.Offset;
	}
}

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
		//console.log("await vendors loaded")
		await vendorsLoadedPromise;
		//console.log("vendors loaded");	
		
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

	// the world select window is opened, get world list update
	FoEproxy.addHandler('WorldService', 'getWorlds', (data, postData) => {
		MainParser.sendExtMessage({
			type: 'send2Api',
			url: `${ApiURL}Worlds/?world=${ExtWorld}`,
			data: JSON.stringify(data['responseData'])
		});
	})

	// globale Handler
	// die Gebäudenamen übernehmen
	FoEproxy.addMetaHandler('building_entity_lookup', (xhr, postData) => {
		let buildingUrlsRaw = JSON.parse(xhr.responseText || "[]");
		let buildingUrls = Object.assign({}, ...buildingUrlsRaw.map((x) => ({ [x.identifier.replace("building_entity_","")]: {url: x.url, hash: x.url.replace(/.*?([^-]+$)/gm,"$1")} })));

		setTimeout(()=>{ MainParser.CityEntityBuilder(buildingUrls) },500);
	});

	// Building-Upgrades
	FoEproxy.addMetaHandler('building_upgrades', (xhr, postData) => {
		let BuildingUpgradesArray = JSON.parse(xhr.responseText);
		MainParser.BuildingUpgrades = Object.assign({}, ...BuildingUpgradesArray.map((x) => ({ [x.upgradeItem.id]: x })));

		if (MainParser.SelectionKits != null) {
			Kits.CreateUpgradeSchemes();
		}
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

		if (MainParser.BuildingUpgrades != null) {
			Kits.CreateUpgradeSchemes();
		}
	});

	FoEproxy.addMetaHandler("building_families", (xhr,postData) => {
		MainParser.BuildingFamilyLimits = JSON.parse(xhr.responseText)?.families;
	})	
	// Castle-System-Levels
	FoEproxy.addMetaHandler('castle_system_levels', (xhr, postData) => {
		MainParser.CastleSystemLevels = JSON.parse(xhr.responseText);
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

	// --------------------------------------------------------------------------------------------------
	// Player- und Gilden-ID setzen
	FoEproxy.addHandler('StartupService', 'getData', (data, postData) => {
        moment.locale(i18n('Local'));
		window.addEventListener("error", function (e) {
			console.error(e.error);
			e.preventDefault();
		});

		// Player-ID, Gilden-ID und Name setzen
		MainParser.StartUp(data.responseData.user_data);

		// check if DB exists
		StrategyPoints.checkForDB(ExtPlayerID);
		EventHandler.checkForDB(ExtPlayerID);
		GuildMemberStat.checkForDB(ExtPlayerID);
		GexStat.checkForDB(ExtPlayerID);
		Guild_fights.checkForDB(ExtPlayerID);
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
		MainParser.SetArkBonus2();
		// Güterliste
		GoodsList = data.responseData.goodsList

		// freigeschaltete Erweiterungen sichern
		CityMap.Main.unlockedAreas = data.responseData.city_map.unlocked_areas;
		CityMap.Main.blockedAreas = data.responseData.city_map.blocked_areas;

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
					let ulf = JSON.parse([...s.innerHTML.matchAll(/(unlockedFeatures:\ )(.*?)(,\n)/gm)][0][2])
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
		FHResourcesList = data.responseData;
	});

	//Metadata file links
	FoEproxy.addHandler('StaticDataService', 'getMetadata', (data, postData) => {
		MainParser.MetaUrls = Object.assign({},...data.responseData.map(x=>( {[x.identifier]: x.url}) ));
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

	// QI map
	FoEproxy.addHandler('GuildRaidsMapService', 'getOverview', (data, postData) => {		
		QiProgress.QiMap = data.responseData;
	})

	// CastleSystem rewards
	FoEproxy.addHandler('CastleSystemService', 'getOverview', (data, postData) => {
		MainParser.CastleSystemChest = data.responseData;
	});

	// --------------------------------------------------------------------------------------------------
	// Karte wird gewechselt zum Außenposten
	FoEproxy.addHandler('CityMapService', 'getCityMap', (data, postData) => {
		MainParser.UpdateActiveMap(data.responseData.gridId);

		if (ActiveMap === 'era_outpost') {
			CityMap.EraOutpost.data = Object.assign({}, ...data.responseData['entities'].map((x) => ({ [x.id]: x })));
			CityMap.EraOutpost.areas = data.responseData['unlocked_areas'];
		}
		else if (ActiveMap === 'guild_raids') {
			CityMap.QI.data = Object.assign({}, ...data.responseData['entities'].map((x) => ({ [x.id]: x })));
			CityMap.QI.areas = data.responseData['unlocked_areas'];
		}
		else if (ActiveMap === 'cultural_outpost') {
			CityMap.CulturalOutpost.data = Object.assign({}, ...data.responseData['entities'].map((x) => ({ [x.id]: x })));
			CityMap.CulturalOutpost.areas = data.responseData['unlocked_areas'];
		}
	});


	// Stadt wird wieder aufgerufen
	FoEproxy.addHandler('CityMapService', 'getEntities', (data, postData) => {
		if (!postData.map(x=>x.requestData?.[0]).includes('main')) { 
			return;
		}

		LastMapPlayerID = ExtPlayerID;

		MainParser.CityMapData = Object.assign({}, ...data.responseData.map((x) => ({ [x.id]: x })));
		FoEproxy.triggerFoeHelperHandler('CityMapUpdated');
		MainParser.SetArkBonus2();

		if (ActiveMap === 'gg') return; // getEntities wurde in den GG ausgelöst => Map nicht ändern
		MainParser.UpdateActiveMap('main');
		CityMap.OtherPlayer = { mapData: {}, unlockedAreas: null, name: '', eraName: null};
	});


	// main is entered
	FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
		MainParser.UpdateActiveMap('main');
		CityMap.OtherPlayer = { mapData: {}, unlockedAreas: null, name: '', eraName: null};
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
		CityMap.QI.level = data.responseData.raidInstance?.difficultyLevel;
	});

	// visiting another player
	FoEproxy.addHandler('OtherPlayerService', 'visitPlayer', (data, postData) => {
		MainParser.UpdateActiveMap('OtherPlayer');
		LastMapPlayerID = data.responseData.other_player.player_id;
		CityMap.OtherPlayer.name = data.responseData.other_player.name;
		CityMap.OtherPlayer.unlockedAreas = data.responseData.city_map.unlocked_areas;
		CityMap.OtherPlayer.mapData = Object.assign({}, ...data.responseData.city_map.entities.map(x => ({ [x.id]: x })));
	});

	// move buildings, use self aid kits
	FoEproxy.addHandler('CityMapService', (data, postData) => {
		if (data.requestMethod === 'moveEntity' || data.requestMethod === 'moveEntities' || data.requestMethod === 'updateEntity') {
			let Buildings = data.responseData;

			if (Buildings[0]?.player_id != ExtPlayerID) return; // opened another players GB
			MainParser.UpdateCityMap(data.responseData);
		}
		else if (data.requestMethod === 'placeBuilding') {
			let building = data.responseData[0];
			if (building && building.id) {
				if (ActiveMap === "cultural_outpost") {
					CityMap.CulturalOutpost.data[building.id] = building
					return
				}
				else if (ActiveMap === "era_outpost") {
					CityMap.EraOutpost.data[building.id] = building
					return
				}
				else if (ActiveMap === "guild_raids") {
					CityMap.QI.data[building.id] = building
					return
				}

				MainParser.CityMapData[building.id] = building;
			}
		}
		else if (data.requestMethod === 'removeBuilding') {
			let ID = postData[0].requestData[0];
			if (ActiveMap === "cultural_outpost") {
				delete CityMap.CulturalOutpost.data[ID];
				return
			}
			else if (ActiveMap === "era_outpost") {
				delete CityMap.EraOutpost.data[ID];
				return
			}
			else if (ActiveMap === "guild_raids") {
				delete CityMap.QI.data[ID];
				return
			}
			if (ID && MainParser.CityMapData[ID]) {
				delete MainParser.CityMapData[ID];
				if (MainParser.CityBuildingsData[ID])
					delete MainParser.CityBuildingsData[ID];
			}
		}
		FoEproxy.triggerFoeHelperHandler('CityMapUpdated');
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

		// Remember the status (level, progress, tier) of each GB, shown in the box when a GB is opened.
		// entity_id is only unique per city, therefore keyed together with the player_id
		if (Array.isArray(data.responseData)) {
			for (let row of data.responseData) {
				if (row['entity_id'] !== undefined && row['player']?.['player_id'] !== undefined) {
					MainParser.GreatBuildingsOverview[row['player']['player_id'] + '_' + row['entity_id']] = row;
				}
			}
		}

		// update investments
		if (Investment) {
			Investment.UpdateData(data.responseData, false);
		}

	});

	// es wird ein LG eines Spielers geöffnet

	// gbUpdateData sammelt die informationen aus mehreren Handlern
	let gbUpdateData = null;
	let gbCityMapEntity = null;

	FoEproxy.addHandler('GreatBuildingsService', 'all', (data, postData) => {
		let getConstruction = data.requestMethod === 'getConstruction' ? data : null;
		let getConstructionRanking = data.requestMethod === 'getConstructionRanking' ? data : null;
		let contributeForgePoints = data.requestMethod === 'contributeForgePoints' ? data : null;
		let Rankings, Bonus = {}, Era;

		if (getConstruction != null) {
			Rankings = getConstruction.responseData.rankings;
			Bonus['passive'] = getConstruction.responseData.next_passive_bonus; // GB update to do
			Bonus['production'] = getConstruction.responseData.next_production_bonus; // GB update to do
			let EraName = getConstruction.responseData.ownerEra;
			if (EraName) Era = Technologies.Eras[EraName];
			IsLevelScroll = false;

			// The game client no longer requests entity data when opening a GB, it uses its local city model instead
			// (GreatBuildingsRetrieveLevelInfoCommand only calls getConstruction(entity.id, entity.player_id)).
			// Determine the matching entity from the request parameters so the rankings are not mixed
			// with a stale entity of a previously opened GB.
			const gbRequestData = postData?.[0]?.requestData,
				requestedEntityId = gbRequestData?.[0],
				requestedPlayerId = gbRequestData?.[1];

			if (requestedEntityId !== undefined) {
				if (requestedPlayerId === ExtPlayerID && MainParser.CityMapData[requestedEntityId]) {
					// Own GB: take the entity from the local city data (like the game client does)
					gbCityMapEntity = { responseData: [{ ...MainParser.CityMapData[requestedEntityId], player_id: ExtPlayerID }] };
				}
				else if (gbCityMapEntity?.responseData?.[0]?.id !== requestedEntityId) {
					// Entity belongs to a different GB → discard and wait for getOtherPlayerCityMapEntity or updateEntity
					gbCityMapEntity = null;
					if (gbUpdateData) gbUpdateData.CityMapEntity = null;
				}
			}
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
			if (!gbUpdateData || !gbUpdateData.CityMapEntity) {
				gbUpdateData = { Rankings: Rankings, CityMapEntity: gbCityMapEntity, Bonus: null };
			}
			else {
				gbUpdateData.Rankings = Rankings;
				gbUpdateData.Bonus = Bonus;
				gbUpdateData.Era = Era;
			}
		}

		if(gbUpdateData?.Rankings && gbUpdateData?.CityMapEntity){
			if(!IsLevelScroll) MainParser.SendLGData(gbUpdateData);
			lgUpdate();
		}

	});

	FoEproxy.addHandler('GreatBuildingsService', 'getContributions', (data, postData) => {
		MainParser.UpdatePlayerDict(data.responseData, 'LGContributions');
	});

	// can be removed after game update 1.332
	FoEproxy.addHandler('CityMapService', 'updateEntity', (data, postData) => {
		if (!gbUpdateData || !gbUpdateData.Rankings) {
			gbUpdateData = { Rankings: null, CityMapEntity: data };
			// reset gbUpdateData sobald wie möglich (nachdem alle einzelnen Handler ausgeführt wurden)
			Promise.resolve().then(() => gbUpdateData = null);
		} else {
			gbUpdateData.CityMapEntity = data;
			lgUpdate();
		}
		
		if (data.responseData[0]?.player_id === ExtPlayerID) {

			if ($('#OwnPartBox').length > 0 || $('#CalculatorBox').length > 0) {
				MainParser.CurrentGB.Entity.max_level = data.responseData[0]?.max_level;
				Parts.CalcBody();
			}
		}
	});

	FoEproxy.addHandler('OtherPlayerService', 'getOtherPlayerCityMapEntity', (data, postData) => {
		let formattedData = { ...data, responseData: [data.responseData] };
		gbCityMapEntity = formattedData;

		if (!gbUpdateData || !gbUpdateData.Rankings) {
			gbUpdateData = { Rankings: null, CityMapEntity: formattedData };
		} else {
			gbUpdateData.CityMapEntity = formattedData;
			lgUpdate();
		}
		
		if (formattedData.responseData[0]?.player_id === ExtPlayerID) {
			if ($('#OwnPartBox').length > 0 || $('#CalculatorBox').length > 0) {
				MainParser.CurrentGB.Entity.max_level = formattedData.responseData[0]?.max_level;
				Parts.CalcBody();
			}
		}
	});

	FoEproxy.addWsHandler('CityMapService', 'updateEntity', data => {
		for (let b of data.responseData) {
			MainParser.CityMapData[b.id]=b;
		}
		FoEproxy.triggerFoeHelperHandler('CityMapUpdated');
	});

	FoEproxy.addWsHandler('CityProductionService', 'pickupProduction', data => {
		for (let b of data.responseData.updatedEntities||[]) {
			MainParser.CityMapData[b.id]=b;
		}
		FoEproxy.triggerFoeHelperHandler('CityMapUpdated');
	});

	FoEproxy.addRequestHandler('InventoryService', 'useItem', (postData) => {
		if (postData?.requestData?.[0]?.__class__=="UseItemOnBuildingPayload") {
			if (MainParser.Inventory[postData?.requestData?.[0]?.itemId].itemAssetName =="store_building") {
				let id= postData?.requestData?.[0]?.mapEntityId
				if (MainParser.CityMapData[id]) delete MainParser.CityMapData[id]
				if (MainParser.CityBuildingsData[id]) delete MainParser.CityBuildingsData[id]
			}
		}
	});

	// Update Funktion, die ausgeführt wird, sobald beide Informationen in gbUpdateData vorhanden sind.
	function lgUpdate() {
		const { CityMapEntity, Rankings, Bonus } = gbUpdateData;
		gbUpdateData = null;
		let IsPreviousLevel = false;

		if (!Rankings) return;

		// LG Scrollaktion: Beim ersten mal Öffnen Medals von P1 notieren. Wenn gescrollt wird und P1 weniger Medals hat, dann vorheriges Level, sonst aktuelles Level
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

		MainParser.CurrentGB.Entity = CityMapEntity.responseData[0];
		MainParser.CurrentGB.Rankings = Rankings;
		MainParser.CurrentGB.OverviewRow = MainParser.GreatBuildingsOverview[MainParser.CurrentGB.Entity['player_id'] + '_' + MainParser.CurrentGB.Entity['id']];

		// Derive the current building tier (copper/silver/gold) from the rewards.
		// While level scrolling the rankings belong to a different level, keep the tier untouched then.
		if (!IsLevelScroll) {
			MainParser.CurrentGB.Tier = MainParser.GetGBTierFromRankings(Rankings);
		}
		Parts.IsPreviousLevel = IsPreviousLevel;

		// GB was loaded
		$('#partCalc-Btn').removeClass('hud-btn-red');
		$('#partCalc-Btn-closed').remove();

		if ($('#OwnPartBox').length > 0 || $('#CalculatorBox').length > 0) {
			Parts.CalcBody();
		}
	}


	// player goods
	FoEproxy.addHandler('ResourceService', 'getPlayerResources', (data, postData) => {
		ResourceStock = data.responseData.resources; // Lagerbestand immer aktualisieren. Betrifft auch andere Module wie Technologies oder Negotiation
		Outposts.CollectResources();
		FoEproxy.triggerFoeHelperHandler('ResourcesUpdated')
		Castle.UpdateCastlePoints(data['requestId']);
	});
	FoEproxy.addHandler('ResourceService', 'getPlayerResourceBag', (data, postData) => {
		if (data.responseData?.type?.value && data.responseData?.type?.value != 'PlayerMain') return; // for now ignore all other source types
		ResourceStock = data.responseData.resources.resources; // Lagerbestand immer aktualisieren. Betrifft auch andere Module wie Technologies oder Negotiation
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
		GameTime.set(data.responseData.time);
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
	active: JSON.parse(localStorage.getItem('HelperBetaActive')) || devMode === 'true' || loadBeta
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
	EmissaryService: null,
	PlayerPortraits: [],
	Conversations: [],
	MetaIds: {},
	MetaUrls: {},
	CityEntities: null,
	CastleSystemLevels: null,
	StartUpType: null,
	OpenConversation: null,
	CastleSystemChest: null,
	CurrentGB: {
		Entity: undefined,
		Rankings: undefined,
		OverviewRow: undefined,
		Tier: undefined
	},

	// GreatBuildingContributionRow from getOtherPlayerOverview, key: "<player_id>_<entity_id>" (contains e.g. currentTier + maxLevel)
	GreatBuildingsOverview: {},

	// all buildings of the player
	CityMapData: {},
	CityBuildingsData: {},

	// Unlocked extensions
	Quests: null,
	ArkBonus: 0,
	Inventory: {},

	// all buildings additional data
	BuildingUpgrades: null,
	BuildingSets: null,
	BuildingChains: null,
	SelectionKits: null,
	
	BuildingFamilyLimits: null,
	
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

			HTML.ShowToastMsg({
				show: true,
				head: i18n('Menu.NewVersion.Title'),
				text: i18n('Menu.NewVersion.Desc') + ' <a href="https://foe-helper.com/extension/update?lang=en" target="_blank">ChangeLog</a>',
				type: 'success',
				allowToastClose: true,
				hideAfter: 30000,
			});
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


	/**
	 * Asynchronously builds city entity metadata by fetching and processing data for each provided building URL.
	 * The function ensures that metadata is fetched and updated only when changes are detected in the hash values
	 * from the input URLs and existing stored metadata.
	 *
	 * @param {Object} buildingUrls - A mapping where keys represent building IDs and values are objects containing
	 *                                metadata with the following properties:
	 *                                - `url` {string}: The URL from which the building metadata can be fetched.
	 *                                - `hash` {string}: A hash representing the state of the metadata for change detection.
	 *
	 * The function performs the following operations:
	 * - Accesses the IndexDB to retrieve and compare existing metadata for buildings.
	 * - Determines which metadata requires updating based on differences in hash values.
	 * - Fetches new metadata concurrently, with a maximum of 10 simultaneous network requests.
	 * - Implements retry logic for failed requests, allowing up to 3 retries per request.
	 * - Updates the IndexDB storage with newly fetched metadata.
	 * - Updates the global `MainParser.CityEntities` object with the latest metadata.
	 * - Invokes necessary parsing and checking functions from `MainParser`:
	 *   - `MainParser.correctBuildingType()`: Corrects building types in the updated metadata.
	 *   - `MainParser.Inactives.check()`: Performs post-processing checks for inactive entities.
	 *
	 * The function ensures robust error handling, timeout management for HTTP requests, and retries
	 * to handle occasional network failures. Metadata updates are written back to IndexDB in bulk.
	 */
	CityEntityBuilder: async (buildingUrls) => {
		let buildingsOld = {};
		let dbAvailable = true;
		try {
			await IndexDB.getDB();
			let stored = await IndexDB.db.buildingMeta.toArray();
			buildingsOld = Object.assign({}, ...stored.map(x => ({ [x.id]: x })));
		} catch (e) {
			// IndexedDB can be blocked or broken (e.g. hardened browsers) — continue
			// without the cache and fetch all metadata fresh instead of dying here
			dbAvailable = false;
			console.warn('buildingMeta cache unavailable, fetching all building metadata fresh', e);
		}
		let Metadata = {};
		let updated = [];
		const ids = Object.keys(buildingUrls);
		const maxConcurrent = 10; // z.B. 10 gleichzeitige Requests
		let active = 0;
		let index = 0;

		// fallback: reuse the last cached version (even with an outdated hash) so a
		// failed download does not leave a hole in MainParser.CityEntities
		function useCachedMeta(id) {
			if (buildingsOld[id]) {
				try {
					Metadata[id] = JSON.parse(buildingsOld[id].json);
					return true;
				} catch (e) { /* corrupt cache entry — nothing to fall back to */ }
			}
			return false;
		}

		function fetchMeta(id, meta, retries = 3) {
			return new Promise(resolve => {
				const xhr = new XMLHttpRequest();
				xhr.open("GET", meta.url, true);

				let timeout = setTimeout(() => {
					xhr.abort();
				}, 10000); // 10 Sekunden Timeout
				xhr.onreadystatechange = function () {
					if (xhr.readyState === XMLHttpRequest.DONE) {
						clearTimeout(timeout);
						if (xhr.status === 200) {
							try {
								Metadata[id] = JSON.parse(xhr.responseText);
								updated.push({ id: id, hash: meta.hash, json: xhr.responseText });
							} catch (e) { useCachedMeta(id); }
							resolve();
						} else if (retries > 0) {
							// Bei Fehler: Retry mit Delay
							setTimeout(() => fetchMeta(id, meta, retries - 1).then(resolve), 1000);
						} else {
							console.warn('Failed to load', meta.url, xhr.status);
							useCachedMeta(id);
							resolve();
						}
					}
				};
				xhr.onerror = () => {
					clearTimeout(timeout);
					if (retries > 0) {
						setTimeout(() => fetchMeta(id, meta, retries - 1).then(resolve), 1000);
					} else {
						useCachedMeta(id);
						resolve();
					}
				};
				xhr.send();
			});
		}

		async function runNext() {
			while (active < maxConcurrent && index < ids.length) {
				const id = ids[index++];
				const meta = buildingUrls[id];
				let cacheHit = false;
				if (buildingsOld[id] && buildingsOld[id].hash === meta.hash) {
					// a corrupt cache entry falls through to a fresh download
					cacheHit = useCachedMeta(id);
				}
				if (!cacheHit) {
					active++;
					fetchMeta(id, meta).then(() => {
						active--;
						runNext();
					});
				}
			}
		}

		await new Promise(resolve => {
			function checkDone() {
				if (index >= ids.length && active === 0) resolve();
				else setTimeout(checkDone, 100);
			}
			runNext();
			checkDone();
		});

		if (dbAvailable && updated.length > 0) {
			try {
				await IndexDB.db.buildingMeta.bulkPut(updated);
			} catch (e) {
				console.warn('Could not persist building metadata cache', e);
			}
		}

		// drop entities that could not be loaded at all — a missing key is handled
		// downstream, a null entry is not
		for (let id in Metadata) {
			if (Metadata[id] == null) delete Metadata[id];
		}

		MainParser.CityEntities = Metadata;
		MainParser.correctBuildingType();
		MainParser.Inactives.check();
	},


	/**
	 * Updates the `type` property of each CityEntity in `MainParser.CityEntities` if it is missing.
	 * The `type` is set based on the `buildingType` attribute found within the
	 * `components.AllAge.tags.tags` structure of the entity.
	 *
	 * Iterates through all entries in the `MainParser.CityEntities` object, ensuring the
	 * existence of the property `buildingType` before attempting to assign it.
	 */
	correctBuildingType: () => {
		for (let i in MainParser.CityEntities) {
			if (!MainParser.CityEntities.hasOwnProperty(i)) continue;

			let CityEntity = MainParser.CityEntities[i];

			if (!CityEntity.type) {
				CityEntity.type = CityEntity?.components?.AllAge?.tags?.tags?.find(value => value.hasOwnProperty('buildingType')).buildingType;
			}
        }
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
			if (response.error.indexOf('"type":"alerts"')=== -1 && response.error.indexOf('"action":"getAll"') === -1)
				console.warn('EXT-API error: ' + response.error);
		}
	},


	/**
	 * Sets the application language by assigning the `GuiLng` value to `MainParser.Language`.
	 * This function facilitates the configuration of the language settings for the application.
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
		return new Date(Date.now() + GameTime.Offset*1000);
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
	 */
	checkNextUpdate: (ep) => {
		let s = localStorage.getItem(ep),
			a = MainParser.getCurrentDateTime();

		return MainParser.compareTime(a, s);
	},


	/**
	 * Generates a player link or returns the player's name based on the application settings.
	 *
	 * @function GetPlayerLink
	 * @param {string} PlayerID - The unique identifier for the player.
	 * @param {string} PlayerName - The display name of the player.
	 * @returns {string} A hyperlink to the player's profile if links are enabled in settings,
	 * or the player's name as plain text otherwise.
	 */
	GetPlayerLink: (PlayerID, PlayerName) => {
		if (Settings.GetSetting('ShowLinks')) {
			let PlayerLink = HTML.i18nReplacer(PlayerLinkFormat, { 'world': ExtWorld.toUpperCase(), 'playerid': PlayerID });
			if (localStorage.getItem('linkSite') === 'siteForgedb')
				PlayerLink = HTML.i18nReplacer(PlayerLinkFormat2, { 'server': ExtWorld.toLowerCase().replace(/[0-9]/g, ''), 'world': ExtWorld.toLowerCase(), 'playerid': PlayerID });

			return `<a class="external-link game-cursor" href="${PlayerLink}" target="_blank">${HTML.escapeHtml(PlayerName)} ${LinkIcon}</a>`;
		}
		else {
			return HTML.escapeHtml(PlayerName);
		}
	},


	/**
	 * Constructs a link or plain text for a guild based on the given parameters and settings.
	 *
	 * @param {string} GuildID - The unique identifier for the guild.
	 * @param {string} GuildName - The name of the guild.
	 * @param {string} [WorldId] - The world identifier. Defaults to `ExtWorld` when not provided.
	 * @returns {string} - A hyperlink to the guild or the plain text of the guild name, depending on the settings.
	 *
	 * - If `Settings.GetSetting('ShowLinks')` is true:
	 *   - Constructs a hyperlink using `GuildLinkFormat`, replacing placeholders for the `world` and `guildid`.
	 *   - If the `localStorage` key `linkSite` equals `siteForgedb`, constructs the hyperlink with `GuildLinkFormat2`.
	 *   - Returns the link as an HTML-safe string with the guild name and an icon.
	 * - If `Settings.GetSetting('ShowLinks')` is false:
	 *   - Returns the guild name as plain HTML-escaped text.
	 */
	GetGuildLink: (GuildID, GuildName, WorldId) => {
		if(!WorldId) WorldId = ExtWorld;

		if (Settings.GetSetting('ShowLinks')) {
			let GuildLink = HTML.i18nReplacer(GuildLinkFormat, { 'world': WorldId.toUpperCase(), 'guildid': GuildID });
			if (localStorage.getItem('linkSite') === 'siteForgedb')
				GuildLink = HTML.i18nReplacer(GuildLinkFormat2, { 'server': ExtWorld.toLowerCase().replace(/[0-9]/g, ''), 'world': ExtWorld.toLowerCase(), 'guildid': GuildID });

			return `<a class="external-link game-cursor" href="${GuildLink}" target="_blank">${HTML.escapeHtml(GuildName)} ${LinkIcon}</a>`;
		}
		else {
			return HTML.escapeHtml(GuildName);
		}
	},


	/**
	 * Generates a link for a building if the 'ShowLinks' setting is enabled.
	 * Otherwise, it returns the building name as plain text.
	 *
	 * @param {string} BuildingID - The unique identifier for the building.
	 * @param {string} BuildingName - The name of the building to be displayed.
	 * @returns {string} A string containing either an HTML link or plain text for the building name.
	 */
	GetBuildingLink: (BuildingID, BuildingName) => {
		if (Settings.GetSetting('ShowLinks')) {
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
	 * @param errorCallback optional - receives a readable message when the request itself fails (network, HTTP != 200, invalid JSON)
	 */
	send2Server: (data, ep, successCallback, errorCallback) => {

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
							.catch(err => {
								if (errorCallback) errorCallback('The server sent an invalid response: ' + err.message);
							});
					}
					else if (errorCallback) {
						errorCallback('The server responded with HTTP ' + response.status + ' (' + response.statusText + ')');
					}
				})
				.catch(err => {
					if (errorCallback) errorCallback('The server could not be reached: ' + err.message);
				});
		}
	},


	/**
	 * Back up player data
	 *
	 * @param d
	 */
	StartUp: async (d) => {
		//console.log("StartUp called");
		Settings.Init(false);

		MainParser.VersionSpecificStartupCode();
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
		await ExistenceConfirmed('MainParser.CityEntities||srcLinks.FileList||Infoboard||EventHandler');
	
		Infoboard.Init();
		EventHandler.Init();
		setTimeout(MainParser.forceLoadCityEntities, 15000);
	
		window.dispatchEvent(new CustomEvent('foe-helper#StartUpDone'))
		
		// remove campagnemap storage - can be removed again at some point
		localStorage.removeItem('AllProvinces');
	},


	forceLoadCityEntities: () => {
		if (MainParser.CityEntities) return;
		//console.log('Forcing load of CityEntities');
		let xhr = new XMLHttpRequest();
        xhr.open("GET", MainParser.MetaUrls['city_entities'], true);
        xhr.send();
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
	 * Collect some stats for the website api
	 *
	 * @param d
	 * @returns {boolean}
	 * @constructor
	 */
	/**
	 * Derives the current building tier (copper/silver/gold) from the blueprint rewards
	 * of the rankings (highest tier found wins). Old servers without blueprintRewards → null.
	 *
	 * @param Rankings GreatBuildingRankingRow[] from getConstruction/contributeForgePoints
	 * @returns {?Object} GreatBuildingTier enum, e.g. {value: 'copper'}, or null
	 */
	GetGBTierFromRankings: (Rankings) => {
		const TierOrder = { copper: 1, silver: 2, gold: 3 };
		let Tier = null;

		for (let row of (Rankings || [])) {
			for (let bp of (row?.reward?.blueprintRewards || [])) {
				if (bp?.tier?.value && (!Tier || (TierOrder[bp.tier.value] || 0) > (TierOrder[Tier.value] || 0))) {
					Tier = bp.tier;
				}
			}
		}

		return Tier;
	},


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

		for (let i of Object.values(MainParser.CityMapData).filter(x => x?.bonus?.type === "contribution_boost")) {
			ArkBonus += i.bonus.value;
		}

		MainParser.updateArkBonus(ArkBonus,"City Map");
	},


	/**
	 * Updates the ArkBonus value if the new value is greater than the current value stored
	 * in MainParser.ArkBonus. If the ArkBonus is updated and the current value was greater than 0,
	 * a developer log is optionally shown as a toast message in developer mode.
	 *
	 * @param {number} ArkBonus - The new ArkBonus value to set.
	 * @param {string} Source - A string representing the source or origin of the update.
	 */
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
			if (Player['won_battles'] !== undefined) PlayerDict[PlayerID]['WonBattles'] = Player['won_battles'];
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
				CityMap.EraOutpost.data[ID] = Buildings[i];
			}
			else if (ActiveMap === "cultural_outpost") {
				CityMap.CulturalOutpost.data[ID] = Buildings[i];
			}
			else if (ActiveMap === "guild_raids") {
				CityMap.QI.data[ID] = Buildings[i];
			}
		}
		MainParser.SetArkBonus2();

		if ($('#bluegalaxy').length > 0) {
			BlueGalaxy.CalcBody(Buildings);
		}

		FPCollector.CityMapDataNew = Buildings;
		FoEproxy.triggerFoeHelperHandler('CityMapUpdated');
	},


	/**
	 * Opens a popup window with the specified configuration.
	 */
	PopOut: (id, width, height) => {
		Popup.PopOut(id, {
			width: width,
			height: height
		});
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
				if (LB[x]<(GameTime-GameTime.Offset)*1000) delete LB[x];
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
						expires: (MainParser.CityEntities[building.cityentity_id]?.components?.AllAge?.limited?.config?.expireTime + building.state.constructionFinishedAt - GameTime.Offset)*1000,
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
						LB[building.id]=(MainParser.CityEntities[building.cityentity_id]?.components?.AllAge?.limited?.config?.expireTime + building.state.constructionFinishedAt - GameTime.Offset)*1000;
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
