/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/dsiekiera/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

// This module is for the player's GBs ("GB Calculator")

// Fremdes LG gelevelt
FoEproxy.addWsHandler('OtherPlayerService', 'newEvent', data => {
	if (!Parts.CityMapEntity || !Parts.Rankings) return; // Noch kein LG offen
	if (data.responseData['type'] !== 'great_building_contribution') return; // Nur LG Events
	if (!data.responseData['other_player']) return; // Nur fremde LGs
	if (data.responseData['other_player']['player_id'] !== Parts.CityMapEntity['player_id']) return; // Selber Spieler

	let Entity = Object.values(MainParser.CityEntities).find(obj => (obj['name'] === data.responseData['great_building_name']));
	if (!Entity) return; // LG nicht gefunden

	if (Entity['id'] !== Parts.CityMapEntity['cityentity_id']) return; // Selbes LG

	if ($('#OwnPartBox').length > 0) {
		let NewLevel = data.responseData['level'];
		Parts.CalcBody(NewLevel);
		if (Parts.PlayInfoSound) {
			helper.sounds.play("message");
		}
	}
});

FoEproxy.addHandler("GreatBuildingsService","getConstruction", (data,postData) => {
	let open = postData[0].requestData[1] == ExtPlayerID || localStorage.getItem('ShowOwnPartOnAllGBs') == 'true';
	if ($('#OwnPartBox').length === 0 && localStorage.getItem('OwnPartAutoOpen') == 'true' && open) Parts.Show();
});

FoEproxy.addHandler("all","all", (data,postData) => {
	if (!Parts.allowCopyPlaceSetting) return;
	if (["GreatBuildingsService.getConstruction"].includes(data.requestClass + "." + data.requestMethod)) {
		Parts.allowCopyPlace = true;
		Parts.allowCopyPlaceSetting = false;
		setTimeout(()=>{Parts.allowCopyPlaceSetting = true}, 2000)
	} else if (	["TimeService.updateTime",
				"QuestService.getQuestCategoryTimes",
				"QuestService.getUpdates",
				"MessageService.newMessage",
				"CityMapService.reset",
				"GreatBuildingsService.getAvailablePackageForgePoints",
				"TimeService.updateTime",
				"ResourceService.getPlayerResourceBag",
				"CityMapService.updateEntity",
				"GreatBuildingsService.contributeForgePoints",
				"ResourceService.getPlayerAutoRefills"
				].includes(data.requestClass + "." + data.requestMethod)) {
	} else {
		Parts.allowCopyPlace = false;
	}
});

FoEproxy.addFoeHelperHandler('QuestsUpdated', data => {
	if ($('#OwnPartBox').length > 0) {
		Parts.CalcBody();
	}
});


let Parts = {
	CityMapEntity: undefined,
	Rankings: undefined,
	IsPreviousLevel: false,
	IsNextLevel: false,

	Level: undefined,
	SafePlaces: undefined,
	DangerPlaces: undefined,
	LeveltLG: undefined,
	Maezens: [],

	CurrentMaezens: [],
	RemainingOwnPart: null,

	PowerLevelingStartLevel: null,
	PowerLevelingEndLevel: 999999,
	PowerLevelingData: null,

	PlaceAvailables: [],
	CopyString: null,
	CopyStrings: {},

	DefaultButtons: [
		80, 85, 90, 'ark'
	],

	// Settings
	CopyFormatPerGB: false,

	FirstCycle: true,
	LastPlayerID: null,
	LastEntityID: null,
	LastLevel: null,

	PlayInfoSound: null,

	LockExistingPlaces: true,
	TrustExistingPlaces: false,

	ArcPercents: [90, 90, 90, 90, 90],
	Exts: [0, 0, 0, 0, 0],

	//Settings Copybox
	CopyOwnPlayerName: null,
	CopyPlayerName: null,
	CopyBuildingName: null,

	CopyDangerPrefix: '!!!',
	CopyDangerSuffix: '',
	CopyIncludeDanger: false,
	CopyIncludePlayer: true,
	CopyIncludeGB: true,
	CopyIncludeLevel: false,
	CopyIncludeFP: true,
	CopyIncludeOwnPart: false,
	CopyPreP: true,
	CopyDescending: true,
	CopyIncludeLevelString: false,

	CopyModeAll: false,
	CopyModeAuto: true,
	CopyModeAutoUnsafe: false,
	CopyPlaces: [false, false, false, false, false],
	allowCopyPlace: false,
	allowCopyPlaceSetting: true,

	/**
	 * HTML Box in den DOM drücken und ggf. Funktionen binden
	 */
	Show: () => {
		if ($('#OwnPartBox').length === 0) {
			let spk = localStorage.getItem('PartsTone');

			if (spk === null) {
				localStorage.setItem('PartsTone', 'deactivated');
				Parts.PlayInfoSound = false;
			}
			else {
				Parts.PlayInfoSound = (spk !== 'deactivated');
			}

			// Box in den DOM
			HTML.Box({
				id: 'OwnPartBox',
				title: i18n('Boxes.OwnpartCalculator.Title'),
				ask: i18n('Boxes.OwnpartCalculator.HelpLink'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				//speaker: 'PartsTone',
				settings: 'Parts.ShowCalculatorSettings()',
			    active_maps:"main"
			});

			HTML.AddCssFile('part-calc');
			Parts.CalcBody();

			$('#OwnPartBox').on('click', '#PartsTone', function () {
				let disabled = $(this).hasClass('deactivated');

				localStorage.setItem('PartsTone', (disabled ? '' : 'deactivated'));
				Parts.PlayInfoSound = !!disabled;

				if (disabled === true) {
					$('#PartsTone').removeClass('deactivated');
				} else {
					$('#PartsTone').addClass('deactivated');
				}
			});

			// LockExistingPayments
			$('#OwnPartBox').on('click', '.lockexistingpayments', function () {
				let $this = $(this),
					v = $this.prop('checked');

				Parts.LockExistingPlaces = v;

				Parts.CalcBody();
			});

			// TrustExistingPayments
			$('#OwnPartBox').on('click', '.trustexistingpayments', function () {
				let $this = $(this),
					v = $this.prop('checked');

				Parts.TrustExistingPlaces = v;

				Parts.CalcBody();
			});


			// ArcPercents
			$('#OwnPartBox').on('blur', '.arc-percent-input', function () {
				let ArcPercents = [];

				$('.arc-percent-input').each(function () {
					let ArkBonus = parseFloat($(this).val());
					if(isNaN(ArkBonus)) ArkBonus = 0;
					ArcPercents.push(ArkBonus);
				});

				Parts.ArcPercents = ArcPercents;
				localStorage.setItem(Parts.GetStorageKey('ArcPercents', null), JSON.stringify(ArcPercents));

				Parts.CalcBody(Parts.Level);
			});

			// Exts
			for (let i = 0; i < GreatBuildings.GreatBuildingsData.length; i++) {
				$('#OwnPartBox').on('blur', '.ext-part-input' + i, function () {
					Parts.Exts[i] = parseFloat($('.ext-part-input' + i).val());
					if (isNaN(Parts.Exts[i])) Parts.Exts[i] = 0;
					Parts.CalcBody(Parts.Level);
				});
			}

			// eine neuer globaler Arche-Satz wird gewählt
			$('#OwnPartBox').on('click', '.btn-set-arc', function () {
				let ArkBonus = parseFloat($(this).data('value'));
				if (ArkBonus !== ArkBonus) ArkBonus = 0; //NaN => 0

				for (let i = 0; i < 5; i++) {
					Parts.ArcPercents[i] = ArkBonus;
					$('.arc-percent-input').eq(i).val(ArkBonus);
				}

				localStorage.setItem(Parts.GetStorageKey('ArcPercents', null), JSON.stringify(Parts.ArcPercents));

				Parts.CalcBody(Parts.Level);
			});

			// Next/Previous level
			$('#OwnPartBox').on('click', '.btn-set-level', function () {
				let Level = parseFloat($(this).data('value'));
				if (isNaN(Level)) Level = 0;
				Parts.CalcBody(Level);
			});

			$('#OwnPartBox').on('click', '.button-powerleveling', function () {
				// Reset power leveling range
				Parts.PowerLevelingStartLevel = Parts.Level;
				Parts.PowerLevelingEndLevel = 999999;
				Parts.ShowPowerLeveling(false);
			});

			$('#OwnPartBox').on('click', '.button-own', function () {
				let copyParts = Parts.CopyFunction($(this), 'copy');
				helper.str.copyToClipboardLegacy(copyParts);
				Parts.CalcBody(Parts.Level);
			});

			$('#OwnPartBox').on('click', '.button-save-own', function () {
				let copyParts = Parts.CopyFunction($(this), 'save');
				helper.str.copyToClipboardLegacy(copyParts);
				Parts.CalcBody(Parts.Level);
			});

			// Quick copy for FP values (places + remaining to level)
			$('#OwnPartBox').on('click', '.copy-fp', function (e) {
				e.preventDefault();
				e.stopPropagation();
				let $this = $(this),
					value = $this.data('copy');

				if (value === undefined || value === '' || value === '-') return;

				if (!Parts.allowCopyPlace)
					helper.str.copyToClipboardLegacy(String(value));
				else {//Set Cursor to input field
					mouseActions.randomClick([244,-89, "Center"])
					KeyboardEvents.paste(String(value));
				}
				//prevent double action
				$this.addClass('copied');
				setTimeout(() => $this.removeClass('copied'), 800);
			});

			// CopyBox
			$('#OwnPartBox').on('blur', '#player-name', function () {
				let PlayerName = $('#player-name').val();

				Parts.CopyOwnPlayerName = PlayerName;
				localStorage.setItem(Parts.GetStorageKey('CopyOwnPlayerName', null), PlayerName);

				Parts.CalcBackgroundBody();
			});

			$('#OwnPartBox').on('blur', '#build-name', function () {
				let BuildingName = $('#build-name').val();

				Parts.CopyBuildingName = BuildingName;
				localStorage.setItem(Parts.GetStorageKey('CopyGBName', Parts.CityMapEntity['cityentity_id']), BuildingName);

				Parts.CalcBackgroundBody();
			});

			$('#OwnPartBox').on('blur', '#copystring', function () {
				let CopyString = $('#copystring').val();

				Parts.CopyString = CopyString;
			});

			$('#OwnPartBox').on('click', '.form-check-input', function () {
				let PlaceName = $(this).data('place');
				if (PlaceName) {
					if (PlaceName === 'all') { //all: auto deaktivieren, P1-5 aktivieren
						Parts.CopyModeAll = true;
						Parts.CopyModeAuto = false;
						Parts.CopyModeAutoUnsafe = false;
					}
					else if (PlaceName === 'auto') { //auto: all/auto-unsafe deaktivieren, P1-P5 ermitteln
						Parts.CopyModeAll = false;
						Parts.CopyModeAuto = true;
						Parts.CopyModeAutoUnsafe = false;

					}
					else if (PlaceName === 'auto-unsafe') { //auto-unsafe: all/auto deaktivieren, P1-5 ermitteln
						Parts.CopyModeAll = false;
						Parts.CopyModeAuto = false;
						Parts.CopyModeAutoUnsafe = true;

					}
					else { //P1-5: auto und all deaktivieren
						Parts.CopyModeAll = false;
						Parts.CopyModeAuto = false;
						Parts.CopyModeAutoUnsafe = false;

						Parts.CopyPlaces[PlaceName-1] = !Parts.CopyPlaces[PlaceName-1];
					}
				}

				let OptionsName = $(this).data('options');
				if (OptionsName) {
					let StorageKey;

					if (OptionsName === 'danger') {
						Parts.CopyIncludeDanger = !Parts.CopyIncludeDanger;
						StorageKey = Parts.GetStorageKey('CopyIncludeDanger', (Parts.CopyFormatPerGB ? Parts.CityMapEntity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyIncludeDanger);
					}
					else if (OptionsName === 'player') {
						Parts.CopyIncludePlayer = !Parts.CopyIncludePlayer;
						StorageKey = Parts.GetStorageKey('CopyIncludePlayer', (Parts.CopyFormatPerGB ? Parts.CityMapEntity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyIncludePlayer);
					}
					else if (OptionsName === 'gb') {
						Parts.CopyIncludeGB = !Parts.CopyIncludeGB;
						StorageKey = Parts.GetStorageKey('CopyIncludeGB', (Parts.CopyFormatPerGB ? Parts.CityMapEntity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyIncludeGB);
					}
					else if (OptionsName === 'level') {
						Parts.CopyIncludeLevel = !Parts.CopyIncludeLevel;
						StorageKey = Parts.GetStorageKey('CopyIncludeLevel', (Parts.CopyFormatPerGB ? Parts.CityMapEntity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyIncludeLevel);
					}
					else if (OptionsName === 'fp') {
						Parts.CopyIncludeFP = !Parts.CopyIncludeFP;
						StorageKey = Parts.GetStorageKey('CopyIncludeFP', (Parts.CopyFormatPerGB ? Parts.CityMapEntity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyIncludeFP);
					}
					else if (OptionsName === 'descending') {
						Parts.CopyDescending = !Parts.CopyDescending;
						StorageKey = Parts.GetStorageKey('CopyDescending', (Parts.CopyFormatPerGB ? Parts.CityMapEntity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyDescending);
					}
					else if (OptionsName === 'levelup') {
						Parts.CopyIncludeLevelString = !Parts.CopyIncludeLevelString;
						StorageKey = Parts.GetStorageKey('CopyIncludeLevelString', (Parts.CopyFormatPerGB ? Parts.CityMapEntity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyIncludeLevelString);
					}
					else if (OptionsName === 'ownpart') {
						Parts.CopyIncludeOwnPart = !Parts.CopyIncludeOwnPart;
						StorageKey = Parts.GetStorageKey('CopyIncludeOwnPart', (Parts.CopyFormatPerGB ? Parts.CityMapEntity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyIncludeOwnPart);
					}
					else if (OptionsName === 'prep') {
						Parts.CopyPreP = !Parts.CopyPreP;
						StorageKey = Parts.GetStorageKey('CopyPreP', (Parts.CopyFormatPerGB ? Parts.CityMapEntity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyPreP);
					}
				}

				Parts.CalcBackgroundBody();
			});

			$('#OwnPartBox').on('blur', '.form-text-input', function () {
				let OptionsName = $(this).data('options');
				if (OptionsName) {
					let StorageKey;

					if (OptionsName === 'danger-prefix') {
						Parts.CopyDangerPrefix = $(this).val();
						StorageKey = Parts.GetStorageKey('CopyDangerPrefix', (Parts.CopyFormatPerGB ? Parts.CityMapEntity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyDangerPrefix);
					}
					else if (OptionsName === 'danger-suffix') {
						Parts.CopyDangerSuffix = $(this).val();
						StorageKey = Parts.GetStorageKey('CopyDangerSuffix', (Parts.CopyFormatPerGB ? Parts.CityMapEntity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyDangerSuffix);
					}
				}

				Parts.CalcBackgroundBody();
			});

			Parts.CalcBody();
		}
		else {
			HTML.CloseOpenBox('OwnPartBox');
			HTML.CloseOpenBox('PowerLevelingBox');
		}
	},


	/**
	 * Visible part
	 *
	 */
	CalcBody: async (NextLevel) => {
		await StartUpDone;
		if (Parts.CityMapEntity['level'] === NextLevel) NextLevel = 0;

		let PlayerID = Parts.CityMapEntity['player_id'],
			EntityID = Parts.CityMapEntity['cityentity_id'],
			CityEntity = MainParser.CityEntities[EntityID],
			EraName = GreatBuildings.GetEraName(CityEntity['asset_id']),
			Era = Technologies.Eras[EraName];

		let Total; // Total FP of the current level

		if (NextLevel) {		
			Parts.IsPreviousLevel = false;
			Parts.IsNextLevel = true;
			Parts.Level = NextLevel;
			Total = GreatBuildings.GetBruttoCosts(EntityID, NextLevel);
		}
		else {
			Parts.IsNextLevel = false;
			Parts.Level = Parts.CityMapEntity['level'];
			Total = parseInt(Parts.CityMapEntity['state']['forge_points_for_level_up']);
		}

		// Restore Default settings
		if (Parts.FirstCycle) {
			let SavedArcPercents = localStorage.getItem(Parts.GetStorageKey('ArcPercents', null));
			if (SavedArcPercents !== null) Parts.ArcPercents = JSON.parse(SavedArcPercents);

			let SavedCopyOwnPlayerName = localStorage.getItem(Parts.GetStorageKey('CopyOwnPlayerName', null));
			if (SavedCopyOwnPlayerName !== null) {
				Parts.CopyOwnPlayerName = SavedCopyOwnPlayerName
			}
			else {
				Parts.CopyOwnPlayerName = ExtPlayerName;
			}

			Parts.CopyFormatPerGB = (localStorage.getItem(Parts.GetStorageKey('CopyFormatPerGB', null)) === 'true');
			if (!Parts.CopyFormatPerGB) {
				let SavedCopyIncludeDanger = localStorage.getItem(Parts.GetStorageKey('CopyIncludeDanger', null));
				if (SavedCopyIncludeDanger !== null) Parts.CopyIncludeDanger = (SavedCopyIncludeDanger === 'true');

				let SavedCopyDangerPrefix = localStorage.getItem(Parts.GetStorageKey('CopyDangerPrefix', null));
				if (SavedCopyDangerPrefix !== null) Parts.CopyDangerPrefix = SavedCopyDangerPrefix;

				let SavedCopyDangerSuffix = localStorage.getItem(Parts.GetStorageKey('CopyDangerSuffix', null));
				if (SavedCopyDangerSuffix !== null) Parts.CopyDangerSuffix = SavedCopyDangerSuffix;

				let SavedCopyIncludePlayer = localStorage.getItem(Parts.GetStorageKey('CopyIncludePlayer', null));
				if (SavedCopyIncludePlayer !== null) Parts.CopyIncludePlayer = (SavedCopyIncludePlayer === 'true');

				let SavedCopyIncludeGB = localStorage.getItem(Parts.GetStorageKey('CopyIncludeGB', null));
				if (SavedCopyIncludeGB !== null) Parts.CopyIncludeGB = (SavedCopyIncludeGB === 'true');

				let SavedCopyIncludeLevel = localStorage.getItem(Parts.GetStorageKey('CopyIncludeLevel', null));
				if (SavedCopyIncludeLevel !== null) Parts.CopyIncludeLevel = (SavedCopyIncludeLevel === 'true');

				let SavedCopyIncludeFP = localStorage.getItem(Parts.GetStorageKey('CopyIncludeFP', null));
				if (SavedCopyIncludeFP !== null) Parts.CopyIncludeFP = (SavedCopyIncludeFP === 'true');

				let SavedCopyIncludeOwnPart = localStorage.getItem(Parts.GetStorageKey('CopyIncludeOwnPart', null));
				if (SavedCopyIncludeOwnPart !== null) Parts.CopyIncludeOwnPart = (SavedCopyIncludeOwnPart === 'true');

				let SavedCopyPreP = localStorage.getItem(Parts.GetStorageKey('CopyPreP', null));
				if (SavedCopyPreP !== null) Parts.CopyPreP = (SavedCopyPreP === 'true');

				let SavedCopyDescending = localStorage.getItem(Parts.GetStorageKey('CopyDescending', null));
				if (SavedCopyDescending !== null) Parts.CopyDescending = (SavedCopyDescending === 'true');
			}
		}

		if (PlayerID !== Parts.LastPlayerID || EntityID !== Parts.LastEntityID) { 
			Parts.CopyModeAuto = true;
			Parts.CopyModeAll = false;
			Parts.CopyModeAutoUnsafe = false;
		}

		if (PlayerID !== Parts.LastPlayerID || EntityID !== Parts.LastEntityID || Parts.Level !== Parts.LastLevel) {
			Parts.LockExistingPlaces = true;
			Parts.TrustExistingPlaces = false;
			for (let i = 0; i < 5; i++) Parts.Exts[i] = 0;
			Parts.CopyIncludeLevelString = false;
		}

		Parts.FirstCycle = false;
		Parts.LastPlayerID = PlayerID;
		Parts.LastEntityID = EntityID;
		Parts.LastLevel = Parts.Level;

		//Calculation Start
		let arcs = [],
			FPRewards = [], // FP Maezenboni pro Platz (0 basiertes Array)
			MedalRewards = [], // Medaillen Maezenboni pro Platz (0 basiertes Array)
			BPRewards = [], // Blaupause Maezenboni pro Platz (0 basiertes Array)
			h = [],
			EigenStart = 0, // Bereits eingezahlter Eigenanteil (wird ausgelesen)
			Eigens = [], // Feld aller Eigeneinzahlungen pro Platz (0 basiertes Array)
			MaezenTotal = 0, // Summe aller Fremdeinzahlungen
			EigenTotal, // Summe aller Eigenanteile
			ExtTotal = 0, // Summe aller Externen Einzahlungen
			EigenCounter = 0, // Eigenanteile Counter während Tabellenerstellung
			Rest = Total; // Verbleibende FP: Counter während Berechnung

		Parts.PlaceAvailables = [false, false, false, false, false]; // Wird auf true gesetz, wenn auf einem Platz noch eine (nicht externe) Zahlung einzuzahlen ist (wird in Spalte Einzahlen angezeigt)
		Parts.DangerPlaces = [0, 0, 0, 0, 0]; // Feld mit Dangerinformationen. Wenn > 0, dann die gefährdeten FP
		Parts.LeveltLG = [false, false, false, false, false];
		Parts.Maezens = [];

		if (Parts.IsPreviousLevel)
		{
			Total = 0;
			for (let i = 0; i < Parts.Rankings.length; i++)
			{
				let ToAdd = Parts.Rankings[i]['forge_points'];
				if (ToAdd !== undefined) Total += ToAdd;
			}
			Rest = Total;
		}

		if (Parts.Level === undefined) {
			Parts.Level = 0;
		}

		for (let i = 0; i < 5; i++) {
			arcs[i] = ((parseFloat(Parts.ArcPercents[i]) + 100) / 100);
		}

		// Wenn in Rankings nichts mehr steht, dann abbrechen
		if (! Parts.IsNextLevel) {
			for (let i = 0; i < Parts.Rankings.length; i++) {
				// Owner
				let CurrentMaezen = Parts.Rankings[i]['forge_points'];
				if (Parts.Rankings[i]['player'] && Parts.Rankings[i]['player']['player_id'] === Parts.CityMapEntity['player_id']) {
					EigenStart = CurrentMaezen;
					Rest -= EigenStart;
					continue;
				}
				// Deleted player
				else if (Parts.Rankings[i]['rank'] === undefined || Parts.Rankings[i]['rank'] < 0) { //undefined => Eigentümer oder gelöscher Spieler P1-5, -1 => gelöschter Spieler ab P6 abwärts
					Rest -= CurrentMaezen;
					MaezenTotal += CurrentMaezen;
					continue;
				}

				let Place = Parts.Rankings[i]['rank'] - 1,
					MedalCount = 0;

				Parts.Maezens[Place] = CurrentMaezen;
				if (Parts.Maezens[Place] === undefined) Parts.Maezens[Place] = 0;

				if (Place < 5) {
					if (Parts.Rankings[i]['reward'] !== undefined) {
						let FPCount = (Parts.Rankings[i]['reward']['strategy_point_amount'] !== undefined ? parseInt(Parts.Rankings[i]['reward']['strategy_point_amount']) : 0);
						if (FPCount > 0) {
							FPRewards[Place] = MainParser.round(FPCount * arcs[Place]);
						}
						else {
							FPRewards[Place] = 1;
						}
						if (FPRewards[Place] === undefined) FPRewards[Place] = 0;

						// Medals
						MedalCount = (Parts.Rankings[i]['reward']['resources'] !== undefined ? parseInt(Parts.Rankings[i]['reward']['resources']['medals']) : 0);
						MedalRewards[Place] = MainParser.round(MedalCount * arcs[Place]);
						if (MedalRewards[Place] === undefined) MedalRewards[Place] = 0;

						// Blueprints
						let BlueprintCount = (Parts.Rankings[i]['reward']['blueprints'] !== undefined ? parseInt(Parts.Rankings[i]['reward']['blueprints']) : 0);
						BPRewards[Place] = MainParser.round(BlueprintCount * arcs[Place]);
						if (BPRewards[Place] === undefined) BPRewards[Place] = 0;
					}
					else {
						FPRewards[Place] = 0;
						MedalRewards[Place] = 0;
						BPRewards[Place] = 0;
					}
				}
			}

			// Previous level and spot not taken? => Fill with zero
			for (let i = Parts.Maezens.length; i < 5; i++) {
				Parts.Maezens[i] = 0;
				FPRewards[i] = 0;
				MedalRewards[i] = 0;
				BPRewards[i] = 0;
			}
		}
		else {
			let P1 = GreatBuildings.Rewards[Era][Parts.Level];

			Parts.Maezens = [0, 0, 0, 0, 0];
			FPRewards = GreatBuildings.GetMaezen(P1, Parts.ArcPercents)
			MedalRewards = [0, 0, 0, 0, 0];
			BPRewards = [0, 0, 0, 0, 0];
		}

		for (let i = 0; i < Parts.Exts.length; i++) {
			if (Parts.Exts[i] > 0) {
				Parts.Maezens[Parts.Maezens.length] = Parts.Exts[i];
			}
		}

		Parts.Maezens.sort(function (a, b) { return b - a });

		for (let i = 0; i < Parts.Maezens.length; i++) {
			if(Parts.Maezens[i] === 0) {
				Parts.Maezens.length = Math.max(i, 5);
				break;
			}

			ExtTotal += Parts.Maezens[i];
		}

		Rest -= ExtTotal;

		for (let i = 0; i < 5; i++)
		{
			if (FPRewards[i] <= Parts.Maezens[i] || Rest <= Parts.Maezens[i])
			{
				if (Parts.LockExistingPlaces) { //Bestehende Einzahlung absichern
					let NextMaezen = Parts.Maezens[i + 1] !== undefined ? Parts.Maezens[i + 1] : 0;
					Eigens[i] = Math.ceil(Rest + (Parts.TrustExistingPlaces ? 0 : NextMaezen) - Parts.Maezens[i]);
					Eigens[i] = Math.max(Eigens[i], 0);
					Rest -= Eigens[i];
				}
				else {
					Eigens[i] = 0;
				}
				continue;
			}

			Eigens[i] = Math.ceil(Rest + (Parts.TrustExistingPlaces ? 0 : Parts.Maezens[i]) - 2 * FPRewards[i]);
			if (Eigens[i] < 0) {
				if (Parts.TrustExistingPlaces) Eigens[i] = (Math.min(Eigens[i] + Parts.Maezens[i], 0));
				Parts.DangerPlaces[i] = Math.floor(0 - Eigens[i]/2);
				Eigens[i] = 0;
			}

			for (let j = Parts.Maezens.length - 1; j >= i; j--) {
				if (Parts.Maezens[j] > 0) {
					Parts.Maezens[j + 1] = Parts.Maezens[j];
				}
			}
			Parts.Maezens[i] = FPRewards[i];
			if (Parts.Maezens[i] >= Rest) {
				Parts.LeveltLG[i] = true;
				if (Parts.DangerPlaces[i] > 0)
					Parts.DangerPlaces[i] -= Parts.Maezens[i] - Rest;
				Parts.Maezens[i] = Rest;
			}
			Parts.PlaceAvailables[i] = true;
			MaezenTotal += Parts.Maezens[i];
			Rest -= Eigens[i] + Parts.Maezens[i];
		}

		if(Rest>0) Eigens[5] = Rest;

		EigenTotal = EigenStart;
		for (let i = 0; i < Eigens.length; i++) {
			EigenTotal += Eigens[i];
		}

		for (let i = FPRewards.length; i < Parts.Maezens; i++)
			FPRewards[i] = 0;

		for (let i = MedalRewards.length; i < Parts.Maezens; i++)
			MedalRewards[i] = 0;

		for (let i = BPRewards.length; i < Parts.Maezens; i++)
			BPRewards[i] = 0;

		let PlayerName = undefined;
		if (PlayerID === ExtPlayerID) {
			PlayerName = ExtPlayerName
		}
		else { //LG eines anderen Spielers
			PlayerName = PlayerDict[PlayerID]['PlayerName'];
		}
		
		for (let i = 0; i < 5; i++) {
			Parts.CurrentMaezens[i] = Parts.Maezens[i] | 0;
		}
		Parts.RemainingOwnPart = EigenTotal - EigenStart;

		Parts.SafePlaces = [];
		for (let i = 0; i < 5; i++) {
			if (Eigens[i] > 0) break;
				
			if (Parts.PlaceAvailables[i]) {
				Parts.SafePlaces.push(i);
			}
		}
		
        // Level is locked
		if (PlayerID === ExtPlayerID && MainParser.CityMapData[Parts.CityMapEntity.id]?.level === MainParser.CityMapData[Parts.CityMapEntity.id]?.max_level) {
			h.push('<div class="lg-not-possible" data-text="'+i18n('Boxes.Calculator.LGNotOpen')+'"></div>');
		}
		// Info-Block
		h.push('<div class="dark-bg text-center" style="padding:5px">');
		
		h.push('<div class="flex" style="justify-content: space-between;align-items:center;margin-bottom:8px;">');
		h.push('<div class="lb-info">');
		h.push('<h1>' + CityEntity['name'] + '</h1>');
		if (PlayerName) h.push(`<span class="activity activity_${PlayerDict[PlayerID]['Activity']}"></span> <strong>${MainParser.GetPlayerLink(PlayerID, PlayerName)}</strong>`);
		h.push('</div>');

		h.push('<div class="level-switch">');
		if (Parts.IsPreviousLevel) {
			let Level = GreatBuildings.GetLevel(EntityID, Total);
			if (Level) 
				h.push(i18n('Boxes.OwnpartCalculator.Step') + ' ' + (Level-1) + ' &rarr; ' + (Level));
			else // Level unknown
				h.push(i18n('Boxes.OwnpartCalculator.OldLevel'));
		}
		else {
			if (Parts.IsNextLevel) 
				h.push('<button class="btn btn-slim btn-set-level" data-value="' + (Parts.Level - 1) + '">&lt;</button> ');

			h.push(i18n('Boxes.OwnpartCalculator.Step') + ' ' + Parts.Level + ' &rarr; ' + (parseInt(Parts.Level) + 1));

			if (GreatBuildings.Rewards[Era] && GreatBuildings.Rewards[Era][Parts.Level + 1]) 
				h.push(' <button class="btn btn-slim btn-set-level" data-value="' + (Parts.Level + 1) + '">&gt;</button>');
		}
		h.push('</div>');
		h.push('</div>');

		h.push('<span class="btn-group">');
		// different arc bonus-buttons
		let investmentSteps = [80, 85, 90, MainParser.ArkBonus],
			customButtons = localStorage.getItem('CustomPartCalcButtons');

		// custom buttons available
		if(customButtons) {
			investmentSteps = [];
			let bonuses = JSON.parse(customButtons);

			bonuses.forEach(bonus => {
				if(bonus === 'ark') 
					investmentSteps.push(MainParser.ArkBonus);
				else 
					investmentSteps.push(bonus);
			});
		}

		investmentSteps = investmentSteps.filter((item, index) => investmentSteps.indexOf(item) === index);
		investmentSteps.sort((a, b) => a - b);
		investmentSteps.forEach(bonus => {
			h.push(`<button class="btn btn-mid btn-set-arc${(Parts.ArcPercents[0] === bonus ? ' btn-active' : '')}" data-value="${bonus}">${bonus}%</button>`);
		});

		h.push('</span>');		
		h.push('</div>');
		
		let medalsEnabled = (localStorage.getItem('OwnPartShowMedals') == "true")
		if (localStorage.getItem('OwnPartShowMedals') == null) medalsEnabled = true
		let printsEnabled = (localStorage.getItem('OwnPartShowBP') == "true")
		if (localStorage.getItem('OwnPartShowBP') == null) printsEnabled = true
		let minView = (localStorage.getItem('OwnPartMinView') == "true")
		if (localStorage.getItem('OwnPartMinView') == null) minView = false

		h.push('<table id="OwnPartTable" class="foe-table" style="margin-top:3px">');
		h.push('<thead>');

		h.push('<tr>');
		h.push('<th>' + i18n('Boxes.OwnpartCalculator.Order') + '</th>');
		h.push('<th class="text-center"><span class="forgepoints" title="' + HTML.i18nTooltip(i18n('Boxes.OwnpartCalculator.Deposit')) + '"></th>');
		h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.Done') + '</th>');
		if (printsEnabled) h.push('<th class="text-center"><span class="blueprint" title="' + HTML.i18nTooltip(i18n('Boxes.OwnpartCalculator.BPs')) + '"></span></th>');
		if (medalsEnabled) h.push('<th class="text-center"><span class="medal" title="' + HTML.i18nTooltip(i18n('Boxes.OwnpartCalculator.Meds')) + '"></span></th>');
		if (!minView) h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.Ext') + '</th>');
		if (!minView) h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.Arc') + '</th>');
		h.push('</tr>');
		h.push('</thead>');
		h.push('<tbody>');

		for (let i = 0; i < 5; i++) {
			EigenCounter += Eigens[i];
			if (i === 0 && EigenStart > 0) {
				EigenCounter += EigenStart;

				h.push('<tr>');
				let OwnPartStartText = (Eigens[i] > 0
					? '<span class="copy-fp clickable" data-copy="' + Eigens[i] + '">' + HTML.Format(Eigens[i]) + '</span>'
						+ ' <small class="copy-fp clickable" data-copy="' + (Eigens[i] + EigenStart) + '">(=' + HTML.Format(Eigens[i] + EigenStart) + ')</small>'
					: '-');
				h.push('<td>' + i18n('Boxes.OwnpartCalculator.OwnPart') + '</td>');
				h.push('<td class="text-center"><strong class="' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + OwnPartStartText + '</strong></td>');
				h.push('<td class="text-center"><strong class="info">' + HTML.Format(EigenStart) + '</strong></td>');
				if (printsEnabled && medalsEnabled) h.push('<td colspan="4"></td>');
				else if (printsEnabled || medalsEnabled) h.push('<td colspan="3"></td>');
				else if (!minView) h.push('<td colspan="2"></td>');
				h.push('</tr>');
			}
			else {
				if (Eigens[i] > 0) {
					h.push('<tr>');
					let OwnPartText = '<span class="copy-fp clickable" data-copy="' + Eigens[i] + '">' + HTML.Format(Eigens[i]) + '</span>';
					if (EigenCounter > Eigens[i]) {
						OwnPartText += ' <small class="copy-fp clickable" data-copy="' + EigenCounter + '">(=' + HTML.Format(EigenCounter) + ')</small>';
					}
					h.push('<td>' + i18n('Boxes.OwnpartCalculator.OwnPart') + '</td>');
					h.push('<td class="text-center"><strong class="' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + OwnPartText + '</strong></td>');
					if (printsEnabled && medalsEnabled) h.push('<td colspan="5"></td>');
					else if (printsEnabled || medalsEnabled) h.push('<td colspan="4"></td>');
					else if (!minView) h.push('<td colspan="3"></td>');
					if (minView) h.push('<td></td>');
					h.push('</tr>');
				}
			}

			h.push('<tr>');
			h.push('<td>' + i18n('Boxes.OwnpartCalculator.Place') + ' ' + (i+1) + '</td>');

			if (Parts.PlaceAvailables[i]) {
				h.push('<td class="text-center"><strong class="' + (PlayerID === ExtPlayerID ? '' : 'success') + (Parts.Maezens[i] > 0 ? ' copy-fp clickable' : '') + '" data-copy="' + (Parts.Maezens[i] > 0 ? Parts.Maezens[i] : '') + '">' + (Parts.Maezens[i] > 0 ? HTML.Format(Parts.Maezens[i]) : '-') + '</strong >' + '</td>');
				if (Parts.LeveltLG[i]) {
					h.push(`<td class="text-center"><strong class="error">${i18n("Boxes.OwnpartCalculator.levelt")}</strong></td>`);
				}
				else if (Parts.DangerPlaces[i] > 5) {
					h.push(`<td class="text-center"><strong class="error">${i18n("Boxes.OwnpartCalculator.danger")} (${HTML.Format(Parts.DangerPlaces[i])}FP)</strong></td>`);
				}
				else {
					h.push('<td class="text-center"><strong class="info">-</strong></td>');
				}
			}
			else {
				h.push('<td class="text-center"><strong>-</strong></td>');
				let MaezenString = Parts.Maezens[i] > 0 ? HTML.Format(Parts.Maezens[i]) : '-';
				let MaezenCopyClass = Parts.Maezens[i] > 0 ? ' copy-fp' : '';
				let MaezenCopyValue = Parts.Maezens[i] > 0 ? Parts.Maezens[i] : '';
				let MaezenDiff = Parts.Maezens[i] - FPRewards[i];
				let MaezenDiffString = '';
				if (Parts.Maezens[i] > 0) {
					if (MaezenDiff > 0) {
						MaezenDiffString = ' <strong class="success"><small>(+' + HTML.Format(MaezenDiff) + ')</small></strong>';
					}
					else if (MaezenDiff < 0) {
						MaezenDiffString = ' <strong class="error"><small>(' + HTML.Format(MaezenDiff) + ')</small></strong>';
					}
				}

				h.push('<td class="text-center"><strong class="info' + MaezenCopyClass + '" data-copy="' + MaezenCopyValue + '">' + MaezenString + '</strong>' + MaezenDiffString + '</td>');
			}

			if (printsEnabled) h.push('<td class="text-center">' + HTML.Format(BPRewards[i]) + '</td>');
			if (medalsEnabled) h.push('<td class="text-center">' + HTML.Format(MedalRewards[i]) + '</td>');
			if (!minView) h.push('<td class="text-center"><input min="0" step="1" type="number" class="ext-part-input' + i + '" value="' + Parts.Exts[i] + '"></td>');
			if (!minView) h.push('<td class="text-center"><input type="number" class="arc-percent-input" step="0.1" min="12" max="200" value="' + Parts.ArcPercents[i] + '"></td>');

			h.push('</tr>');
		}

		let MaezenRest = 0;
		for (let i = 5; i < Parts.Maezens.length; i++)
		{
			MaezenRest += Parts.Maezens[i];
		}

		// Bestehende Einzahlungen, die aus den P5 raus geschoben wurden
		if (MaezenRest > 0) {
			h.push('<tr>');
			h.push('<td>' + i18n('Boxes.OwnpartCalculator.Place') + ' 6' + (Parts.Maezens.length > 6 ? ('-' + Parts.Maezens.length) : '') + '</td>');
			h.push('<td class="text-center">-</td>');
			h.push('<td class="text-center"><strong class="info">' + HTML.Format(MaezenRest) + '</strong></td>');
			if (!minView) h.push('<td colspan="4"></td>');
			h.push('</tr>');
		}

		// Restzahlung
		if (Eigens[5] > 0) {
			EigenCounter += Eigens[5];

			h.push('<tr>');
			let OwnPartRestText = '<span class="copy-fp clickable" data-copy="' + Eigens[5] + '">' + HTML.Format(Eigens[5]) + '</span>';
			if (EigenCounter > Eigens[5]) {
				OwnPartRestText += ' <small class="copy-fp clickable" data-copy="' + (EigenCounter - EigenStart) + '">(=' + HTML.Format(EigenCounter - EigenStart) + ')</small>';
			}
			h.push('<td>' + i18n('Boxes.OwnpartCalculator.OwnPart') + '</td>');
			h.push('<td class="text-center"><strong class="' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + OwnPartRestText + '</strong></td>');
			h.push('<td colspan="5"></td>');
			h.push('</tr>');
		}

		h.push('</tbody>');
		h.push('</table>');

		
		h.push('<div class="dark-bg" style="padding:5px">');

		h.push('<div class="text-center">' + i18n('Boxes.OwnpartCalculator.ExistingPayments'));
		h.push(': <input id="lockexistingpayments" class="lockexistingpayments game-cursor" ' + (Parts.LockExistingPlaces ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.OwnpartCalculator.Lock'));
		h.push('<input id="trustexistingpayments" class="trustexistingpayments game-cursor" ' + (Parts.TrustExistingPlaces ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.OwnpartCalculator.Trust') + '</div>');
		if (!minView) {
			h.push('<table style="width: 100%">');
			h.push('<tr>');
			h.push('<td>' + i18n('Boxes.OwnpartCalculator.PatronPart') + ': <strong class="' + (PlayerID === ExtPlayerID ? '' : 'success') + '">' + HTML.Format(MaezenTotal + ExtTotal) + '</strong></td>');
			h.push('<td class="text-right">' + i18n('Boxes.OwnpartCalculator.OwnPart') + ': <strong class="' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + HTML.Format(EigenTotal) + '</strong></td>');
			h.push('</tr>');
			h.push('<tr>');
			h.push('<td>' + i18n('Boxes.OwnpartCalculator.LGTotalFP') + ': <strong>' + HTML.Format(Total) + '</strong></td>');
			if (EigenStart > 0) {
				h.push('<td class="text-right">' + i18n('Boxes.OwnpartCalculator.OwnPartRemaining') + ': <strong class="' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + HTML.Format(EigenTotal - EigenStart) + '</strong></td>');
			}
			else {
				h.push('<td></td>');
			}
			h.push('</tr>');
			h.push('</table>');
		}

		Parts.CalcBackgroundBody();

		h.push(Calculator.GetRecurringQuestsLine(Parts.PlayInfoSound));

		// Wieviel fehlt noch bis zum leveln?
		if (Parts.IsPreviousLevel === false) {
			let rest;
			if (Parts.IsNextLevel) {
				rest = Total;
			}
			else {
				rest = Parts.CityMapEntity['state']['invested_forge_points'] === undefined ? Parts.CityMapEntity['state']['forge_points_for_level_up'] : Parts.CityMapEntity['state']['forge_points_for_level_up'] - Parts.CityMapEntity['state']['invested_forge_points'];
			}
			if (!minView) {
				h.push('<div class="text-center d-flex" style="padding:3px 0;">');
				h.push('<em>' + i18n('Boxes.Calculator.Up2LevelUp') + ': <span id="up-to-level-up" class="copy-fp clickable" data-copy="' + rest + '">' + HTML.Format(rest) + '</span> ' + i18n('Boxes.Calculator.FP') + '</em>');
				h.push('</div>');
			}
			h.push('<div class="bottom-buttons text-center">');
			h.push('<div class="btn-group">');
			if (Parts.SafePlaces.length > 0 || Parts.CopyModeAll) { //Copy bzw. Note Button nur einblenden wenn zumindest ein Platz safe ist
				h.push('<span class="btn button-own">' + i18n('Boxes.OwnpartCalculator.CopyValues') + '</span>');
				if (Parts.CityMapEntity['player_id'] === ExtPlayerID) h.push('<span class="btn button-save-own">' + i18n('Boxes.OwnpartCalculator.Note') + '</span>');
			}
			else {
				h.push(i18n('Boxes.OwnpartCalculator.NoPlaceSafe'));
			}
			h.push('</div>');

			h.push('<div class="btn-group">');
			h.push('<span class="btn button-powerleveling">' + i18n('Boxes.OwnpartCalculator.PowerLeveling') + '</span>');
			h.push('</div>');
			h.push('</div>');
			h.push('</div>');

			let SaveCopyLength = Object.keys(Parts.CopyStrings).length;
			if (SaveCopyLength > 0) {
				let GBList = "",
					Keys = Object.keys(Parts.CopyStrings);

				for (let i = 0; i < Keys.length; i++) {
					GBList += MainParser.CityEntities[Keys[i]]['name'];
					if (i < Keys.length - 1) GBList += ', ';
				}
				
				h.push('<div class="text-center dark-bg d-flex" style="padding:5px 0;"><em style="max-width:350px"><strong>' + HTML.i18nReplacer(i18n('Boxes.OwnpartCalculator.GBsNoted'), { 'GBCount': SaveCopyLength }) + ':</strong> ' + GBList + '</em></div>');
			}
		}

		$('#OwnPartBoxBody').html(h.join(''));

		if ($('#PowerLevelingBox').length > 0 && !Parts.IsPreviousLevel) {
			Parts.CalcBodyPowerLeveling();
		}
	},


	/**
	 * Daten für die Kopierbuttons
	 *
	 */
	CalcBackgroundBody: () => {
		let h = [],
			$OwnPartBox = $('#OwnPartBox'),
			EntityID = Parts.CityMapEntity['cityentity_id'];

		let SavedBuildingName = localStorage.getItem(Parts.GetStorageKey('CopyGBName', Parts.CityMapEntity['cityentity_id']));
		if (SavedBuildingName !== null) {
			Parts.CopyBuildingName = SavedBuildingName;
		}
		else {
			Parts.CopyBuildingName = MainParser.CityEntities[EntityID]['name'];
		}

		if (localStorage.getItem(Parts.GetStorageKey('CopyFormatPerGB', null)) === 'true') {
			let SavedCopyIncludeDanger = localStorage.getItem(Parts.GetStorageKey('CopyIncludeDanger', Parts.CityMapEntity['cityentity_id']));
			if (SavedCopyIncludeDanger !== null) {
				Parts.CopyIncludeDanger = (SavedCopyIncludeDanger === 'true');
			}
			else {
				Parts.CopyIncludeDanger = false;
			}

			let SavedCopyDangerPrefix = localStorage.getItem(Parts.GetStorageKey('CopyDangerPrefix', Parts.CityMapEntity['cityentity_id']));
			if (SavedCopyDangerPrefix !== null) {
				Parts.CopyDangerPrefix = SavedCopyDangerPrefix;
			}
			else {
				Parts.CopyDangerPrefix = '!!!';
			}

			let SavedCopyDangerSuffix = localStorage.getItem(Parts.GetStorageKey('CopyDangerSuffix', Parts.CityMapEntity['cityentity_id']));
			if (SavedCopyDangerSuffix !== null) {
				Parts.CopyDangerSuffix = SavedCopyDangerSuffix;
			}
			else {
				Parts.CopyDangerSuffix = '';
			}

			let SavedCopyIncludePlayer = localStorage.getItem(Parts.GetStorageKey('CopyIncludePlayer', Parts.CityMapEntity['cityentity_id']));
			if (SavedCopyIncludePlayer !== null) {
				Parts.CopyIncludePlayer = (SavedCopyIncludePlayer === 'true');
			}
			else {
				Parts.CopyIncludePlayer = true;
			}

			let SavedCopyIncludeGB = localStorage.getItem(Parts.GetStorageKey('CopyIncludeGB', Parts.CityMapEntity['cityentity_id']));
			if (SavedCopyIncludeGB !== null) {
				Parts.CopyIncludeGB = (SavedCopyIncludeGB === 'true');
			}
			else {
				Parts.CopyIncludeGB = true;
			}

			let SavedCopyIncludeLevel = localStorage.getItem(Parts.GetStorageKey('CopyIncludeLevel', Parts.CityMapEntity['cityentity_id']));
			if (SavedCopyIncludeLevel !== null) {
				Parts.CopyIncludeLevel = (SavedCopyIncludeLevel === 'true');
			}
			else {
				Parts.CopyIncludeLevel = true;
			}

			let SavedCopyIncludeFP = localStorage.getItem(Parts.GetStorageKey('CopyIncludeFP', Parts.CityMapEntity['cityentity_id']));
			if (SavedCopyIncludeFP !== null) {
				Parts.CopyIncludeFP = (SavedCopyIncludeFP === 'true');
			}
			else {
				Parts.CopyIncludeFP = true;
			}

			let SavedCopyIncludeOwnPart = localStorage.getItem(Parts.GetStorageKey('CopyIncludeOwnPart', Parts.CityMapEntity['cityentity_id']));
			if (SavedCopyIncludeOwnPart !== null) {
				Parts.CopyIncludeOwnPart = (SavedCopyIncludeOwnPart === 'true');
			}
			else {
				Parts.CopyIncludeOwnPart = false;
			}

			let SavedCopyPreP = localStorage.getItem(Parts.GetStorageKey('CopyPreP', Parts.CityMapEntity['cityentity_id']));
			if (SavedCopyPreP !== null) {
				Parts.CopyPreP = (SavedCopyPreP === 'true');
			}
			else {
				Parts.CopyPreP = true;
			}

			let SavedCopyDescending = localStorage.getItem(Parts.GetStorageKey('CopyDescending', Parts.CityMapEntity['cityentity_id']));
			if (SavedCopyDescending !== null) {
				Parts.CopyDescending = (SavedCopyDescending === 'true');
			}
			else {
				Parts.CopyDescending = true;
			}
		}

		if (Parts.CopyModeAll) {
			for (let i = 0; i < 5; i++) {
				Parts.CopyPlaces[i] = true;
			}
		}
		else if (Parts.CopyModeAuto) {
			for (let i = 0; i < 5; i++) {
				Parts.CopyPlaces[i] = (Parts.SafePlaces.includes(i));
			}
		}
		else if (Parts.CopyModeAutoUnsafe) {
			for (let i = 0; i < 5; i++) {
				Parts.CopyPlaces[i] = (Parts.PlaceAvailables[i]);
			}
		}

		let PlayerID = Parts.CityMapEntity['player_id'];

		Parts.CopyPlayerName = (PlayerID === ExtPlayerID ? Parts.CopyOwnPlayerName : PlayerDict[PlayerID]['PlayerName']);

		h.push('<section class="p2 bbd">');
		h.push('<strong>' + i18n('Boxes.OwnpartCalculator.CopyValues') + '</strong>');
		if (PlayerID === ExtPlayerID) {
			h.push('<div class="flex between"><span>' + i18n('Boxes.OwnpartCalculator.PlayerName') + ':</span><input type="text" id="player-name" value="' + Parts.CopyPlayerName + '"></div>');
		}
		else {
			h.push('<div><span>' + i18n('Boxes.OwnpartCalculator.PlayerName') + ':</span>' + Parts.CopyPlayerName + '</div>');
		}
		h.push('<div class="flex between"><span>' + i18n('Boxes.OwnpartCalculator.BuildingName') + ':</span><input type="text" id="build-name" value="' + (Parts.CopyBuildingName) + '"></div>');
		h.push('</section><section class="p2 bbd">');
		h.push('<strong>' + i18n('Boxes.OwnpartCalculator.IncludeData') + '</strong>');
		let Options = '<div class="checkboxes">' +
			'<label class="form-check-label game-cursor" for="options-player"><input type="checkbox" class="form-check-input" id="options-player" data-options="player" ' + (Parts.CopyIncludePlayer ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsPlayer') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-gb"><input type="checkbox" class="form-check-input" id="options-gb" data-options="gb" ' + (Parts.CopyIncludeGB ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsGB') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-level"><input type="checkbox" class="form-check-input" id="options-level" data-options="level" ' + (Parts.CopyIncludeLevel ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsLevel') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-fp"><input type="checkbox" class="form-check-input" id="options-fp" data-options="fp" ' + (Parts.CopyIncludeFP ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsFP') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-descending"><input type="checkbox" class="form-check-input" id="options-descending" data-options="descending" ' + (Parts.CopyDescending ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsDescending') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-levelup"><input type="checkbox" class="form-check-input" id="options-levelup" data-options="levelup" ' + (Parts.CopyIncludeLevelString ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsLevelUp') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-ownpart"><input type="checkbox" class="form-check-input" id="options-ownpart" data-options="ownpart" ' + (Parts.CopyIncludeOwnPart ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsOwnPart') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="options-prep"><input type="checkbox" class="form-check-input" id="options-prep" data-options="prep" ' + (Parts.CopyPreP ? 'checked' : '') + '> <span>P(xx)</span></label>' +
			'<label class="form-check-label game-cursor" for="options-danger"><input type="checkbox" class="form-check-input" id="options-danger" data-options="danger" ' + (Parts.CopyIncludeDanger ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.OptionsDanger') + '</span></label>' +
			'</div>';

		h.push(Options)

		if (Parts.CopyIncludeDanger) {
			let DangerOptions = '<strong>' + i18n('Boxes.OwnpartCalculator.OptionsDanger') + '</strong>' +
			'<div><span>' + i18n('Boxes.OwnpartCalculator.OptionsDangerPrefix') + ':</span><input type="text" class="form-text-input" id="options-danger-prefix" data-options="danger-prefix" value="' + Parts.CopyDangerPrefix + '"></div>' +
			'<div><span>' + i18n('Boxes.OwnpartCalculator.OptionsDangerSuffix') + ':</span><input type="text" class="form-text-input" id="options-danger-suffix" data-options="danger-suffix" value="' + Parts.CopyDangerSuffix + '"></div>';

			h.push(DangerOptions);
		}
		h.push('</section><section class="p2 bbd">');
		h.push('<strong>' + i18n('Boxes.OwnpartCalculator.Places') + '</strong>');

		let cb = '<div class="checkboxes">' +
			'<label class="form-check-label game-cursor" for="chain-p1"><input type="checkbox" class="form-check-input" id="chain-p1" data-place="1" ' + (Parts.CopyPlaces[0] ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.Place') + ' 1</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-p2"><input type="checkbox" class="form-check-input" id="chain-p2" data-place="2" ' + (Parts.CopyPlaces[1] ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.Place') + ' 2</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-p3"><input type="checkbox" class="form-check-input" id="chain-p3" data-place="3" ' + (Parts.CopyPlaces[2] ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.Place') + ' 3</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-p4"><input type="checkbox" class="form-check-input" id="chain-p4" data-place="4" ' + (Parts.CopyPlaces[3] ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.Place') + ' 4</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-p5"><input type="checkbox" class="form-check-input" id="chain-p5" data-place="5" ' + (Parts.CopyPlaces[4] ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.Place') + ' 5</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-all"><input type="checkbox" class="form-check-input" id="chain-all" data-place="all" ' + (Parts.CopyModeAll ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.All') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-auto"><input type="checkbox" class="form-check-input" id="chain-auto" data-place="auto" ' + (Parts.CopyModeAuto ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.Auto') + '</span></label>' +
			'<label class="form-check-label game-cursor" for="chain-auto-unsafe"><input type="checkbox" class="form-check-input" id="chain-auto-unsafe" data-place="auto-unsafe" ' + (Parts.CopyModeAutoUnsafe ? 'checked' : '') + '> <span>' + i18n('Boxes.OwnpartCalculator.AutoWithUnsafe') + '</span></label>' +
		'</div>';

		h.push(cb);

		h.push('</section><section class="p2 bbd">');
		h.push('<strong>' + i18n('Boxes.OwnpartCalculator.Preview') + '</strong><br>');
		Parts.CopyString = Parts.GetCopyString();
		h.push('<input type="text" id="copystring" value="' + Parts.CopyString + '">');
		
		h.push('</section>');
		h.push('<div class="btn-outer text-center" style="margin-top: 10px">');
		h.push('<span class="btn button-own">' + i18n('Boxes.OwnpartCalculator.CopyValues') + '</span> ');
		if (Parts.CityMapEntity['player_id'] === ExtPlayerID) h.push('<span class="btn button-save-own">' + i18n('Boxes.OwnpartCalculator.Note') + '</span>'); //Kein Merken für fremde LGs
		h.push('</div>');

		// ---------------------------------------------------------------------------------------------

		// Box wurde schon in den DOM gelegt?
		if( $('.OwnPartBoxBackground').length > 0 ){
			$('.OwnPartBoxBackgroundBody').html( h.join('') );
			return;
		}

		// Container zusammen setzen
		let div = $('<div />').addClass('OwnPartBoxBackground'),
			a = $('<div />').addClass('outerArrow').append( $('<span />').addClass('arrow game-cursor').attr('id', 'OwnPartBoxArrow') ).append( $('<div />').addClass('OwnPartBoxBackgroundBody window-box').append(h.join('')) );

		$OwnPartBox
			.append( div.append(a) )
			.append($('<div />')
				.addClass('black-bg').hide());

		// der "Toogle"-Pfeil wurde geklickt,
		// lasst die Spiele beginnen
		$('#OwnPartBoxArrow').bind('click', function(){
			if( $OwnPartBox.hasClass('show') ){
				Parts.BackGroundBoxAnimation(false);
			} else {
				Parts.BackGroundBoxAnimation(true);
			}
		});
	},


	/**
	 * Lecker Animation für das Anzeigen der Kopieren Buttons
	 *
	 * @param show
	 */
	BackGroundBoxAnimation: (show)=> {
		let $box = $('#OwnPartBox'),
			$boxBg = $('.OwnPartBoxBackgroundBody');

		if(show === true)
		{
			let e = /** @type {HTMLElement} */ (document.getElementsByClassName('OwnPartBoxBackgroundBody')[0]);

			e.style.height = 'auto';
			let h = e.offsetHeight;
			e.style.height = '0px';

			// center overlay to parent box
			let $boxWidth = $('#OwnPartBox').outerWidth() - 10,
				$bgBodyWidth = $boxBg.outerWidth();

			// animation
			$boxBg.animate({height: h, opacity: 1}, 250, function () {
				$box.addClass('show');
				$box.find('.black-bg').show();
				e.style.height = 'auto';
			});
		}

		else {
			$('.OwnPartBoxBackgroundBody').animate({height: 0, opacity: 0}, 250, function () {
				$box.removeClass('show');
				$box.find('.black-bg').hide();
			});
		}
	},


	GetStorageKey: (SettingName, EntityID) => {
		if (EntityID) {
			return 'OwnPart_' + SettingName + '_' + EntityID + '_' + ExtPlayerID;
		}
		else {
			return 'OwnPart_' + SettingName + '_' + ExtPlayerID;
		}
	},


	GetCopyString: () => {
		return Parts.GetCopyStringEx(Places=Parts.CopyPlaces, Maezens=Parts.Maezens, Level=Parts.Level, OwnPart=Parts.RemainingOwnPart, PlaceAll=Parts.CopyModeAll, PlaceAuto=Parts.CopyModeAuto, PlaceAutoUnsafe=Parts.CopyModeAutoUnsafe, DangerPlaces=Parts.DangerPlaces, LeveltLG=Parts.LeveltLG)
	},


	GetCopyStringEx: (Places, Maezens, Level, OwnPart, PlaceAll, PlaceAuto, PlaceAutoUnsafe, DangerPlaces, LeveltLG) => {	
		let Ret = [];

		if (Parts.CopyIncludeDanger && Parts.CopyDangerPrefix !== '' && (DangerPlaces.find(e => e > 5) || LeveltLG.find(e => e))) Ret.push(Parts.CopyDangerPrefix);

		if (Parts.CopyIncludePlayer) Ret.push(Parts.CopyPlayerName);

		if (Parts.CopyIncludeGB) Ret.push(Parts.CopyBuildingName);

		if (Parts.CopyIncludeLevelString) Ret.push(i18n('Boxes.OwnpartCalculator.OptionsLevelUp'));

		if (Parts.CopyIncludeLevel) Ret.push(Level + '→' + (Level + 1));

		let NoPlacesSelected = true;
		for (let i = 0; i < 5; i++) {
			if (Places[i]) NoPlacesSelected = false;
		}

		if (!NoPlacesSelected) {
			for (let i = 0; i < 5; i++) {
				let Place = (Parts.CopyDescending ? 5 - i - 1 : i);

				if (!Places[Place]) continue;
				if (PlaceAll && Maezens[Place] === 0) continue;
				
				if (Parts.CopyIncludeFP) {
					Ret.push((Parts.CopyPreP ? 'P' : '') + (Place + 1) + '(' + Maezens[Place] + ')');
				}
				else {
					Ret.push((Parts.CopyPreP ? 'P' : '') + (Place + 1));
				}

				if (Parts.CopyIncludeDanger && Parts.CopyDangerSuffix !== '' && (DangerPlaces[Place] > 5 || LeveltLG[Place])) Ret.push(Parts.CopyDangerSuffix);
			}
		}
		else if (PlaceAuto) {
			Ret.push(i18n('Boxes.OwnpartCalculator.NoPlaceSafe'));
		}
		else if (PlaceAutoUnsafe) {
			Ret.push(i18n('Boxes.OwnpartCalculator.NoPlaceAvailable'));
		}
		
		if (Parts.CopyIncludeOwnPart) Ret.push(i18n('Boxes.OwnpartCalculator.OwnPartShort') + '(' + OwnPart + ')');

		return Ret.join(' ');
	},


	/**
	 * Ausgeben oder Merken
	 *
	 * @param Event
	 * @param Action
	 * @returns {string}
	 */
	CopyFunction: (Event, Action) => {
		let CopyString = $('#copystring').val();
	
		$(Event).removeClass('btn-green');

		// wieder zuklappen
		Parts.BackGroundBoxAnimation(false);

		Parts.CopyStrings[Parts.CityMapEntity['cityentity_id']] = CopyString;

		let Copy = "";
		let Keys = Object.keys(Parts.CopyStrings);
		for (let i = 0; i < Keys.length; i++) {
			let Key = Keys[i];
			Copy += Parts.CopyStrings[Key];
			if (i < Keys.length) Copy += '\n';
		}

		if (Action === 'copy') {
			Parts.CopyStrings = {}; // Kopieren löscht die Liste
		}

		return Copy;
	},


	ShowPowerLeveling: (event) => {
		Parts.BuildBoxPowerLeveling(event);
	},


	BuildBoxPowerLeveling: (event) => {
		// Create the window if it does not exist yet...
		if ($('#PowerLevelingBox').length === 0) {
			// Box in den DOM
			HTML.Box({
				'id': 'PowerLevelingBox',
				'title': i18n('Boxes.PowerLeveling.Title'),
				'auto_close': true,
				'dragdrop': true,
				'minimize': true,
			    active_maps:"main",
			});

			const box = $('#PowerLevelingBox');

			// Events on the `startLevel` input field
			box.on('blur', '#startLevel', function () {
				Parts.PowerLevelingStartLevel = parseFloat($('#startLevel').val());
				Parts.UpdateTableBodyPowerLeveling();
			});
			box.on('keydown', '#startLevel', function (e) {
				const key = e.key;
				const input = e.target;
				if (key === "ArrowUp") {
					Parts.PowerLevelingStartLevel = Number.parseInt(input.value) + 1;
					Parts.UpdateTableBodyPowerLeveling();
					e.preventDefault();
				} else if (key === "ArrowDown") {
					Parts.PowerLevelingStartLevel = Number.parseInt(input.value) - 1;
					Parts.UpdateTableBodyPowerLeveling();
					e.preventDefault();
				} else if (key === "Enter") {
					Parts.PowerLevelingStartLevel = Number.parseInt(input.value);
					Parts.UpdateTableBodyPowerLeveling();
				}
			});

			// Events on the `endLevel` input field
			box.on('blur', '#endLevel', function () {
				Parts.PowerLevelingEndLevel = parseFloat($('#endLevel').val());
				Parts.UpdateTableBodyPowerLeveling();
				//Parts.CalcBodyPowerLeveling();
			});
			box.on('keydown', '#endLevel', function (e) {
				const key = e.key;
				const input = e.target;
				if (key === "ArrowUp") {
					Parts.PowerLevelingEndLevel = Number.parseInt(input.value) + 1;
					Parts.UpdateTableBodyPowerLeveling();
					e.preventDefault();
				} else if (key === "ArrowDown") {
					Parts.PowerLevelingEndLevel = Number.parseInt(input.value) - 1;
					Parts.UpdateTableBodyPowerLeveling();
					e.preventDefault();
				} else if (key === "Enter") {
					Parts.PowerLevelingEndLevel = Number.parseInt(input.value);
					Parts.UpdateTableBodyPowerLeveling();
				}
			});

			// Event on the "Copy values" button in each row
			box.on('click', '.button-powerlevel-copy', function () {
				let gb_level = parseInt($(this).parent().find(".hidden-text").html());

				let CopyParts = Parts.GetCopyStringEx(Places=[true, true, true, true, true], Maezens=Parts.PowerLevelingData.Places[gb_level], Level=gb_level, OwnPart=Parts.PowerLevelingData.EigenNettos[gb_level], PlaceAll=true, PlaceAuto=false, PlaceAutoUnsafe=false, DangerPlaces=[0, 0, 0, 0, 0], LeveltLG=[false, false, false, false, false]);
				helper.str.copyToClipboardLegacy(CopyParts);
			});
		}
		else if (!event)
		{
			HTML.CloseOpenBox('PowerLevelingBox');
			return;
		}

		// Body zusammen fummeln
		Parts.CalcBodyPowerLeveling();
	},


	CalcBodyPowerLevelingData: () => {
		let EntityID = Parts.CityMapEntity['cityentity_id'],
			CityEntity = MainParser.CityEntities[EntityID],
			EraName = GreatBuildings.GetEraName(EntityID),
			Era = Technologies.Eras[EraName],
			StartLevel = Parts.PowerLevelingStartLevel,
			EndLevel = (GreatBuildings.Rewards[Era] ? Math.min(Parts.PowerLevelingEndLevel, GreatBuildings.Rewards[Era].length) : 0);

		// Limit minimum value for the power leveling range
		StartLevel = StartLevel < 0 ? 0 : StartLevel;
		EndLevel = EndLevel <= 0 ? 1 : EndLevel;

		// StartLevel must be a smaller number than EndLevel
		StartLevel = StartLevel >= EndLevel ? EndLevel - 1 : StartLevel;

		let Totals = [],
			Places = [],			
			EigenBruttos = [],
			HasDoubleCollection = false,
			DoubleCollections = [],
			EigenNettos = [];

		let OwnPartSum = 0;

		for (let i = StartLevel; i < EndLevel; i++) {
			// How many FPs are needed in total to level the GB
			if (i < 10) {
				Totals[i] = CityEntity['strategy_points_for_upgrade'][i];
			}
			else {
				Totals[i] = Math.ceil(CityEntity['strategy_points_for_upgrade'][9] * Math.pow(1.025, i - 9));
			}

			// How many FPs are needed for each spot.
			// For non-current levels, calculate the FPs for each spot...
			if (i != Parts.Level) {
				Places[i] = GreatBuildings.GetMaezen(GreatBuildings.Rewards[Era][i], Parts.ArcPercents)

				EigenBruttos[i] = Totals[i] - Places[i][0] - Places[i][1] - Places[i][2] - Places[i][3] - Places[i][4]
			}
			// ...and for the current, it's already calculated
			else {
				Places[i] = Parts.CurrentMaezens;
				
				EigenBruttos[i] = Parts.RemainingOwnPart;
			}
			
			let FPGreatBuilding = GreatBuildings.GreatBuildingsData.find(obj => (obj.ID === EntityID && obj.FPProductions));
			if (FPGreatBuilding && EntityID !== 'X_FutureEra_Landmark1') { //FP produzierende LGs ohne Arche
				HasDoubleCollection = true;
				if (i < FPGreatBuilding.FPProductions.length) {
					DoubleCollections[i] = FPGreatBuilding.FPProductions[i];
				}
				else {
					DoubleCollections[i] = MainParser.round(FPGreatBuilding.FPProductions[9] * (i + 1) / 10);
				}
			}
			else {
				HasDoubleCollection = false;
				DoubleCollections[i] = 0;
			}

			EigenNettos[i] = EigenBruttos[i] - DoubleCollections[i];
			OwnPartSum += EigenNettos[i];
		}

		return {
			HasDoubleCollection,
			Places,
			CityEntity,
			OwnPartSum,
			StartLevel,
			EndLevel,
			EigenBruttos,
			DoubleCollections,
			EigenNettos
		};
	},


	/**
	 * Puts together the HTML code of the table for power leveling
	 * @param {Array.<Stringy>} h 
	 */
	CalcTableBodyPowerLeveling: (h) => {
		const {
			HasDoubleCollection,
			Places,
			StartLevel,
			EndLevel,
			EigenBruttos,
			DoubleCollections,
			EigenNettos
		} = Parts.PowerLevelingData;



		for (let i = StartLevel; i < EndLevel; i++) {
			h.push('<tr>');
			h.push('<td class="bright" style="white-space:nowrap">' + i + ' → ' + (i + 1) + '</td>');
			h.push('<td><span class="hidden-text"> - #1 (</span>' + HTML.Format(Places[i][0]) + '<span class="hidden-text">)</span></td>');
			h.push('<td class="text-light"><span class="hidden-text"> - #2 (</span>' + HTML.Format(Places[i][1]) + '<span class="hidden-text">)</span></td>');
			h.push('<td><span class="hidden-text"> - #3 (</span>' + HTML.Format(Places[i][2]) + '<span class="hidden-text">)</span></td>');
			h.push('<td class="text-light"><span class="hidden-text"> - #4 (</span>' + HTML.Format(Places[i][3]) + '<span class="hidden-text">)</span></td>');
			h.push('<td><span class="hidden-text"> - #5 (</span>' + HTML.Format(Places[i][4]) + '<span class="hidden-text">)</span></td>');
			if (HasDoubleCollection) {
				h.push('<td class="success no-select"><strong>' + HTML.Format(EigenBruttos[i]) + '</strong></td>');
				h.push('<td class="no-select">' + HTML.Format(MainParser.round(DoubleCollections[i])) + '</td>');
			}
			h.push('<td><strong class="info no-select">' + HTML.Format(MainParser.round(EigenNettos[i])) + '</strong></td>');
			h.push('<td><span class="hidden-text">' + i + '</span><span class="btn button-powerlevel-copy">' + i18n('Boxes.PowerLeveling.CopyValues') + '</span></td>');
			h.push('</tr>');
		}
	},


	UpdateTableBodyPowerLeveling: () => {
		const tableBody = document.getElementById('PowerLevelingBoxTableBody');
		if (tableBody) {
			Parts.PowerLevelingData = Parts.CalcBodyPowerLevelingData();
			/** @type {string[]} */
			const h = [];
			
			Parts.CalcTableBodyPowerLeveling(h);

			tableBody.innerHTML = h.join('');

			// Startlevel
			const startLevel = /** @type {HTMLInputElement} */(document.getElementById('startLevel'));
			if (startLevel.value != '' + Parts.PowerLevelingData.StartLevel) {
				startLevel.value = '' + Parts.PowerLevelingData.StartLevel;
			}
			Parts.PowerLevelingStartLevel = Parts.PowerLevelingData.StartLevel;

			// EndLevel
			const endLevel = /** @type {HTMLInputElement} */(document.getElementById('endLevel'));
			if (endLevel.value != '' + Parts.PowerLevelingData.EndLevel) {
				endLevel.value = '' + Parts.PowerLevelingData.EndLevel;
			}
			Parts.PowerLevelingEndLevel = Parts.PowerLevelingData.EndLevel;

			const ownPartSum = /** @type {HTMLElement} */(document.getElementById('PowerLevelingBoxOwnPartSum'));
			ownPartSum.innerText = HTML.Format(MainParser.round(Parts.PowerLevelingData.OwnPartSum));
		}

	},


	CalcBodyPowerLeveling: () => {
		Parts.PowerLevelingData = Parts.CalcBodyPowerLevelingData();

		const {
			HasDoubleCollection,
			CityEntity,
			OwnPartSum,
			StartLevel,
			EndLevel,
		} = Parts.PowerLevelingData;

		let h = [];
		h.push('<div class="dark-bg" style="margin-bottom:3px;padding: 5px;">');
		h.push('<h1 class="text-center">' + CityEntity['name'] + '</h1>')

		h.push('<div class="d-flex justify-content-center">');
		h.push('<div style="margin: 5px 10px 0 0;">' + i18n('Boxes.PowerLeveling.StartLevel') + ': <input type="number" id="startLevel" step="1" min=0" max="1000" value="' + StartLevel + '"></div>');
		h.push('<div style="margin: 5px 10px 0 0;">' + i18n('Boxes.PowerLeveling.EndLevel') + ': <input type="number" id="endLevel" step="1" min=10" max="1000" value="' + EndLevel + '"></div>');
		h.push('<div>' + i18n('Boxes.PowerLeveling.OwnPartSum') +': <strong class="info" id="PowerLevelingBoxOwnPartSum">'+ HTML.Format(MainParser.round(OwnPartSum)) + '</strong></div>')
		h.push('</div>');
		h.push('</div>');


		h.push('<table class="foe-table">');

		h.push('<thead class="sticky">');
		h.push('<tr>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.Level') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P1') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P2') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P3') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P4') + '</th>');
		h.push('<th>' + i18n('Boxes.PowerLeveling.P5') + '</th>');
		if (HasDoubleCollection) {
			h.push('<th>' + i18n('Boxes.PowerLeveling.OwnPartBrutto') + '</th>');
			h.push('<th>' + i18n('Boxes.PowerLeveling.DoubleCollection') + '</th>');
		}
		h.push('<th>' + i18n('Boxes.PowerLeveling.OwnPartNetto') + '</th>');
		h.push('<th></th>');
		h.push('</tr>');
		h.push('</thead>');

		h.push('<tbody id="PowerLevelingBoxTableBody">');
		Parts.CalcTableBodyPowerLeveling(h);
		h.push('</tbody>');

		h.push('</table>');

		$('#PowerLevelingBoxBody').html(h.join(''));

	},


	ShowCalculatorSettings: ()=> {
		let c = [],
			buttons,
			defaults = Parts.DefaultButtons,
			sB = localStorage.getItem('CustomPartCalcButtons'),
			allGB = localStorage.getItem('ShowOwnPartOnAllGBs') || 'true',
			showMedals = localStorage.getItem('OwnPartShowMedals') || 'true',
			showPrints = localStorage.getItem('OwnPartShowBP') || 'true',
			minView = localStorage.getItem('OwnPartMinView') || 'false',
			autoOpen = localStorage.getItem('OwnPartAutoOpen') || 'false',
			nV = `<p class="new-row text-center bbd p5 flex gap"><label>${i18n('Boxes.Calculator.Settings.newValue')}:</label> <input type="number" class="settings-values" style="width:30px"> <span class="btn btn-green btn-slim" onclick="Parts.SettingsInsertNewRow()">+</span></p>`;
		
			if(sB) {
			// buttons = [...new Set([...defaults,...JSON.parse(sB)])];
			buttons = JSON.parse(sB);

			buttons = buttons.filter((item, index) => buttons.indexOf(item) === index); // remove duplicates
			buttons.sort((a, b) => a - b); // order
		}
		else {
			buttons = defaults;
		}

		c.push('<section class="flex gap p2">');
		buttons.forEach(bonus => {
			if(bonus === 'ark') {
				c.push(`<span class="btn-group"><input type="hidden" class="settings-values" value="ark"> <button class="btn btn-slim br">${MainParser.ArkBonus}%</button></span>`);
			}
			else {
				c.push(`<span class="btn-group"><button class="btn btn-slim">${bonus}%</button> <input type="hidden" class="settings-values" value="${bonus}"> <span class="btn btn-delete btn-slim" onclick="Parts.SettingsRemoveRow(this)">x</span></span>`);
			}
		});
		c.push('</section>');

		// new own button
		c.push(nV);

		c.push('<p class="bbd p5"><input id="copyformatpergb" class="copyformatpergb game-cursor" ' + (Parts.CopyFormatPerGB ? 'checked' : '') + ' type="checkbox"> <label for="copyformatpergb">' + i18n('Boxes.OwnpartCalculator.CopyFormatPerGB') +'</label>');
		c.push('<br><input type="checkbox" id="showmedals" class="showmedals game-cursor" ' + ((showMedals == 'true') ? 'checked' : '') + '> <label for="showmedals">' + i18n('Settings.ShowOwnPartMedals.Desc') + '</label>');
		c.push('<br><input type="checkbox" id="showprints" class="showprints game-cursor" ' + ((showPrints == 'true') ? 'checked' : '') + '> <label for="showprints">' + i18n('Settings.ShowOwnPartBP.Desc') + '</label>');
		c.push('<br><input type="checkbox" id="minview" class="minview game-cursor" ' + ((minView == 'true') ? 'checked' : '') + '> <label for="minview">' + i18n('Settings.ShowOwnPartMinView.Desc') + '</label>');
		c.push('<br><input type="checkbox" id="openonaliengb" class="openonaliengb game-cursor" ' + ((allGB == 'true') ? 'checked' : '') + '> <label for="openonaliengb">' + i18n('Settings.ShowOwnPartOnAllGBs.Desc') + '</label>');
		c.push('<br><input type="checkbox" id="autoOpen" class="autoOpen game-cursor" ' + ((autoOpen == 'true') ? 'checked' : '') + '> <label for="autoOpen">' + i18n('Settings.ShowOwnPartAutoOpen.Desc') + '</label></p>');

		// save button
		c.push(`<p class="text-center p2"><button id="save-calculator-settings" class="btn btn-green" onclick="Parts.SettingsSaveValues()">${i18n('Boxes.Calculator.Settings.Save')}</button></p>`);

		// insert into DOM
		$('#OwnPartBoxSettingsBox').html(c.join(''));
	},


	SettingsInsertNewRow: ()=> {
		let nV = `<p class="new-row">${i18n('Boxes.Calculator.Settings.newValue')}: <input type="number" class="settings-values" style="width:30px"> <span class="btn btn-green" onclick="Parts.SettingsInsertNewRow()">+</span></p>`;

		$(nV).insertAfter( $('.new-row:eq(-1)') );
	},


	SettingsRemoveRow: ($this)=> {
		$($this).closest('.btn-group').fadeToggle('fast', function(){
			$(this).remove();
		});
	},


	SettingsSaveValues: ()=> {

		let values = [];

		// get each visible value
		$('.settings-values').each(function(){
			let v = $(this).val().trim();

			if(v){
				if(v !== 'ark'){
					values.push( parseFloat(v) );
				} else {
					values.push(v);
				}
			}
		});

		// save new buttons
		localStorage.setItem('CustomPartCalcButtons', JSON.stringify(values));

		let OldCopyFormatPerGB = Parts.CopyFormatPerGB;
		Parts.CopyFormatPerGB = $('.copyformatpergb').prop('checked');
		localStorage.setItem(Parts.GetStorageKey('CopyFormatPerGB', null), Parts.CopyFormatPerGB);

		let openforeignGB = true;
		if ($("#openonaliengb").is(':not(:checked)'))
			openforeignGB = false;
		localStorage.setItem('ShowOwnPartOnAllGBs',openforeignGB);

		let showMedals = true;
		if ($("#showmedals").is(':not(:checked)'))
			showMedals = false;
		localStorage.setItem('OwnPartShowMedals',showMedals);

		let showPrints = true;
		if ($("#showprints").is(':not(:checked)'))
			showPrints = false;
		localStorage.setItem('OwnPartShowBP',showPrints);

		let minView = true;
		if ($("#minview").is(':not(:checked)'))
			minView = false;
		localStorage.setItem('OwnPartMinView',minView);
		
		let autoOpen = true;
		if ($("#autoOpen").is(':not(:checked)'))
			autoOpen = false;
		localStorage.setItem('OwnPartAutoOpen',autoOpen);

		$(`#OwnPartBoxSettingsBox`).fadeToggle('fast', function(){
			$(this).remove();

			// reload box
			if (Parts.CopyFormatPerGB !== OldCopyFormatPerGB) Parts.FirstCycle = true;
			Parts.CalcBody();
		});
	}
};



