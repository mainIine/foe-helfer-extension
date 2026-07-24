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

// This module is for the player's GBs ("GB Calculator").
// The copy dialog, the power leveling box and the settings dialog are split
// into js/parts/ (see js/internal.json), they extend the Parts object below.

// leveled alien GB
FoEproxy.addWsHandler('OtherPlayerService', 'newEvent', data => {
	if (!MainParser.CurrentGB.Entity || !MainParser.CurrentGB.Rankings) return; // Noch kein LG offen
	if (data.responseData['type'] !== 'great_building_contribution') return; // Nur LG Events
	if (!data.responseData['other_player']) return; // Nur fremde LGs
	if (data.responseData['other_player']['player_id'] !== MainParser.CurrentGB.Entity['player_id']) return; // Selber Spieler

	let Entity = Object.values(MainParser.CityEntities).find(obj => (obj['name'] === data.responseData['great_building_name']));
	if (!Entity) return; // GB not found

	if (Entity['id'] !== MainParser.CurrentGB.Entity['cityentity_id']) return; // Selbes LG

	if (Calculator.IsSplitView() && !JSON.parse(localStorage.getItem('ShowOwnPartOnAllGBs'))) {
		// split view: the event concerns a foreign GB, only the cost calculator box shows it
		if ($('#CalculatorBox').length > 0) {
			Calculator.Show();
			if (Parts.PlayInfoSound) {
				helper.sounds.play("message");
			}
		}
	}
	else if ($('#OwnPartBox').length > 0 || $('#CalculatorBox').length > 0) {
		let NewLevel = data.responseData['level'];
		Parts.CalcBody(NewLevel);
		if (Parts.PlayInfoSound) {
			helper.sounds.play("message");
		}
	}
});

FoEproxy.addHandler("GreatBuildingsService","getConstruction", (data,postData) => {
	if (localStorage.getItem('OwnPartAutoOpen') != 'true') return;

	if (Calculator.IsSplitView()) {
		// the own part box only opens for own GBs (or all GBs if the setting is enabled)
		let openOwnPart = postData[0]?.requestData?.[1] == ExtPlayerID || localStorage.getItem('ShowOwnPartOnAllGBs') == 'true';

		if (openOwnPart && $('#OwnPartBox').length === 0)
			Parts.Show(); // also opens the calculator box
		else if ($('#CalculatorBox').length === 0)
			Calculator.Show();
	}
	else if ($('#OwnPartBox').length === 0)
		Parts.Show();
});

FoEproxy.addHandler("all","all", (data,postData) => {
	if (!Parts.allowCopyPlaceSetting) return;
	if (["GreatBuildingsService.unlockLevel","GreatBuildingsService.getConstruction"].includes(data.requestClass + "." + data.requestMethod)) {
		Parts.allowCopyPlace = true;
		Parts.allowCopyPlaceSetting = false;
		setTimeout(()=>{Parts.allowCopyPlaceSetting = true}, 2000)
	} else if (	![
		"BlueprintService.getGreatBuildingInventoryForGreatBuilding",
		"BlueprintService.unlockLevel",
		"CityMapService.reset",
		"CityMapService.updateEntity",
		"GreatBuildingsService.contributeForgePoints",
		"GreatBuildingsService.getAvailablePackageForgePoints",
		"GreatBuildingsService.getConstructionRanking",
		"GreatBuildingsService.getUnlockCosts",
		"GreatBuildingsService.getOtherPlayerOverview",
		"InventoryService.getItemAmount",
		"InventoryService.updateItem",
		"MessageService.newMessage",
		"QuestService.getQuestCategoryTimes",
		"QuestService.getUpdates",
		"ResourceService.getPlayerAutoRefills",
		"ResourceService.getPlayerResourceBag",
		"TimeService.updateTime"
		].includes(data.requestClass + "." + data.requestMethod)) {
		Parts.allowCopyPlace = false;
	}
});

FoEproxy.addFoeHelperHandler('QuestsUpdated', data => {
	if ($('#OwnPartBox').length > 0 || $('#CalculatorBox').length > 0) {
		Parts.CalcBody();
	}
});


let Parts = {
	// the GB shown in this box; in split view it deliberately keeps the last own GB (see SnapshotCurrentGB)
	CurrentGB: {},
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
		80, 90, 100, 'ark'
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
	 * Toggles the own part calculator box: creates it in the DOM including all
	 * delegated events (a second call closes it again). In split view the cost
	 * calculator box is opened/closed along with it.
	 */
	Show: () => {
		if ($('#OwnPartBox').length === 0) {
			/*let spk = localStorage.getItem('PartsTone');

			if (spk === null) {
				localStorage.setItem('PartsTone', 'deactivated');
				Parts.PlayInfoSound = false;
			}
			else {
				Parts.PlayInfoSound = (spk !== 'deactivated');
			}*/

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

			// split view toggle in the title bar
			Calculator.AddSplitViewButton('OwnPartBox');

			// events for the cost calculator content shown in this box in combined view
			Calculator.RegisterBoxEvents('OwnPartBox');

			if (MainParser.CurrentGB.Entity !== undefined && MainParser.CurrentGB.Rankings !== undefined) Parts.CalcBody();
			else $('#OwnPartBox').find('#OwnPartBoxBody').html(`<div class="text-center dark-bg p5">${i18n('Menu.OwnpartCalculator.Warning')}</div>`);

			/*$('#OwnPartBox').on('click', '#PartsTone', function () {
				let disabled = $(this).hasClass('deactivated');

				localStorage.setItem('PartsTone', (disabled ? '' : 'deactivated'));
				Parts.PlayInfoSound = !!disabled;

				if (disabled === true) {
					$('#PartsTone').removeClass('deactivated');
				} else {
					$('#PartsTone').addClass('deactivated');
				}
			});*/

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
				if ($('#OwnPartBox').hasClass('gbSettingsOpen')) {
					$('.OwnPartBoxBackgroundBody').fadeToggle();
					$('#OwnPartBox').toggleClass('gbSettingsOpen');
				}
			});

			$('#OwnPartBox').on('click', '.button-save-own', function () {
				let copyParts = Parts.CopyFunction($(this), 'save');
				helper.str.copyToClipboardLegacy(copyParts);
				Parts.CalcBody(Parts.Level);
				if ($('#OwnPartBox').hasClass('gbSettingsOpen')) {
					$('.OwnPartBoxBackgroundBody').fadeToggle();
					$('#OwnPartBox').toggleClass('gbSettingsOpen');
				}
			});

			// Quick copy for FP values (places + remaining to level)
			$('#OwnPartBox').on('click', '.copy-fp', function (e) {
				e.preventDefault();
				e.stopPropagation();
				let $this = $(this),
					value = $this.data('copy');

				if (value === undefined || value === '' || value === '-') return;

				Parts.setDonation(value);

				//prevent double action
				$this.addClass('copied');
				setTimeout(() => $this.removeClass('copied'), 800);
			});

			// temporary: CalculatorHintRead
			$('#OwnPartBox').on('click', '#calcInfo .icon-close', function (e) {
				localStorage.setItem('CalculatorHintRead',true);
				$('#calcInfo').remove();
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
				localStorage.setItem(Parts.GetStorageKey('CopyGBName', Parts.CurrentGB.Entity['cityentity_id']), BuildingName);

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
						StorageKey = Parts.GetStorageKey('CopyIncludeDanger', (Parts.CopyFormatPerGB ? Parts.CurrentGB.Entity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyIncludeDanger);
					}
					else if (OptionsName === 'player') {
						Parts.CopyIncludePlayer = !Parts.CopyIncludePlayer;
						StorageKey = Parts.GetStorageKey('CopyIncludePlayer', (Parts.CopyFormatPerGB ? Parts.CurrentGB.Entity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyIncludePlayer);
					}
					else if (OptionsName === 'gb') {
						Parts.CopyIncludeGB = !Parts.CopyIncludeGB;
						StorageKey = Parts.GetStorageKey('CopyIncludeGB', (Parts.CopyFormatPerGB ? Parts.CurrentGB.Entity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyIncludeGB);
					}
					else if (OptionsName === 'level') {
						Parts.CopyIncludeLevel = !Parts.CopyIncludeLevel;
						StorageKey = Parts.GetStorageKey('CopyIncludeLevel', (Parts.CopyFormatPerGB ? Parts.CurrentGB.Entity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyIncludeLevel);
					}
					else if (OptionsName === 'fp') {
						Parts.CopyIncludeFP = !Parts.CopyIncludeFP;
						StorageKey = Parts.GetStorageKey('CopyIncludeFP', (Parts.CopyFormatPerGB ? Parts.CurrentGB.Entity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyIncludeFP);
					}
					else if (OptionsName === 'descending') {
						Parts.CopyDescending = !Parts.CopyDescending;
						StorageKey = Parts.GetStorageKey('CopyDescending', (Parts.CopyFormatPerGB ? Parts.CurrentGB.Entity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyDescending);
					}
					else if (OptionsName === 'levelup') {
						Parts.CopyIncludeLevelString = !Parts.CopyIncludeLevelString;
						StorageKey = Parts.GetStorageKey('CopyIncludeLevelString', (Parts.CopyFormatPerGB ? Parts.CurrentGB.Entity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyIncludeLevelString);
					}
					else if (OptionsName === 'ownpart') {
						Parts.CopyIncludeOwnPart = !Parts.CopyIncludeOwnPart;
						StorageKey = Parts.GetStorageKey('CopyIncludeOwnPart', (Parts.CopyFormatPerGB ? Parts.CurrentGB.Entity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyIncludeOwnPart);
					}
					else if (OptionsName === 'prep') {
						Parts.CopyPreP = !Parts.CopyPreP;
						StorageKey = Parts.GetStorageKey('CopyPreP', (Parts.CopyFormatPerGB ? Parts.CurrentGB.Entity['cityentity_id'] : null));
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
						StorageKey = Parts.GetStorageKey('CopyDangerPrefix', (Parts.CopyFormatPerGB ? Parts.CurrentGB.Entity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyDangerPrefix);
					}
					else if (OptionsName === 'danger-suffix') {
						Parts.CopyDangerSuffix = $(this).val();
						StorageKey = Parts.GetStorageKey('CopyDangerSuffix', (Parts.CopyFormatPerGB ? Parts.CurrentGB.Entity['cityentity_id'] : null));
						localStorage.setItem(StorageKey, Parts.CopyDangerSuffix);
					}
				}

				Parts.CalcBackgroundBody();
			});

			if (MainParser.CurrentGB.Entity !== undefined && MainParser.CurrentGB.Rankings !== undefined) Parts.CalcBody();

			// split view: also open the cost calculator box
			if (Calculator.IsSplitView()) Calculator.Show();
		}
		else {
			HTML.CloseOpenBox('OwnPartBox');
			HTML.CloseOpenBox('PowerLevelingBox');
			HTML.CloseOpenBox('CalculatorBox');
		}
	},


	/**
	 * Takes over the currently opened GB as the data shown in this box.
	 * In split view CalcBody skips this for foreign GBs, so the box keeps its last own GB.
	 */
	SnapshotCurrentGB: () => {
		Parts.CurrentGB = {
			Entity: MainParser.CurrentGB.Entity,
			Rankings: MainParser.CurrentGB.Rankings,
			OverviewRow: MainParser.CurrentGB.OverviewRow,
			Tier: MainParser.CurrentGB.Tier,
			IsPreviousLevel: Parts.IsPreviousLevel // set by lgUpdate right before CalcBody is called
		};
	},


	/**
	 * Calculates and renders the own part view for the GB in Parts.CurrentGB:
	 * per place the FP a patron has to pay, the own part in between, danger and
	 * level warnings, external payments and the totals. In split view it keeps
	 * the cost calculator box in sync and refuses to follow foreign GBs
	 * (see SnapshotCurrentGB), in the combined view it hands foreign GBs over
	 * to the cost calculator.
	 *
	 * @param {number} [NextLevel] - Render this (future) level instead of the current one
	 */
	CalcBody: async (NextLevel) => {
		await StartUpDone;
		if (!MainParser.CurrentGB.Entity || !MainParser.CurrentGB.Rankings) return; // No GB loaded yet

		if (Calculator.IsSplitView()) {
			// split view: keep the cost calculator box in sync
			if ($('#CalculatorBox').length > 0) Calculator.Show();

			// this box only follows own GBs (or all GBs if the setting is enabled)
			let useOnAllGBs = JSON.parse(localStorage.getItem('ShowOwnPartOnAllGBs'));
			if (useOnAllGBs || MainParser.CurrentGB.Entity.player_id === ExtPlayerID) {
				Parts.SnapshotCurrentGB();
			}
			else if (!Parts.CurrentGB.Entity) {
				// nothing of the player shown yet: show a hint instead of the foreign GB
				$('#OwnPartBoxBody').html(`<div class="text-center dark-bg p5">${i18n('Menu.OwnpartCalculator.Warning')}</div>`);
				return;
			}
			// else: keep rendering the last own GB from Parts.CurrentGB
		}
		else {
			// combined view: load the other calculator if selected
			let useThisCalculator = JSON.parse(localStorage.getItem('ShowOwnPartOnAllGBs'))
			if (!useThisCalculator && MainParser.CurrentGB.Entity.player_id !== ExtPlayerID) {
				Calculator.Show();
				return;
			}

			Parts.SnapshotCurrentGB();
		}

		if (Parts.CurrentGB.Entity['level'] === NextLevel) NextLevel = 0;

		let PlayerID = Parts.CurrentGB.Entity['player_id'],
			EntityID = Parts.CurrentGB.Entity['cityentity_id'],
			CityEntity = MainParser.CityEntities[EntityID],
			EraName = GreatBuildings.GetEraName(CityEntity['asset_id']),
			Era = Technologies.Eras[EraName];

		let Total; // Total FP of the current level

		if (NextLevel) {		
			Parts.CurrentGB.IsPreviousLevel = false;
			Parts.IsNextLevel = true;
			Parts.Level = NextLevel;
			Total = GreatBuildings.GetBruttoCosts(EntityID, NextLevel);
		}
		else {
			Parts.IsNextLevel = false;
			Parts.Level = Parts.CurrentGB.Entity['level'];
			Total = parseInt(Parts.CurrentGB.Entity['state']['forge_points_for_level_up']);
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
			BPTierRewards = [], // blueprint rewards per place split by tier: {tier, amount}[] (amount already boosted)
			h = [],
			EigenStart = 0, // Bereits eingezahlter Eigenanteil (wird ausgelesen)
			Eigens = [], // Feld aller Eigeneinzahlungen pro Platz (0 basiertes Array)
			MaezenTotal = 0, // Summe aller Fremdeinzahlungen
			EigenTotal, // Summe aller Eigenanteile
			ExtTotal = 0, // Summe aller Externen Einzahlungen
			EigenCounter = 0, // Eigenanteile Counter während Tabellenerstellung
			Rest = Total, // Verbleibende FP: Counter während Berechnung
			AlreadyPaid = 0; // Bereits gezahlter Anteil für aktuellen Platz (Fremde LG)

		Parts.PlaceAvailables = [false, false, false, false, false]; // Wird auf true gesetz, wenn auf einem Platz noch eine (nicht externe) Zahlung einzuzahlen ist (wird in Spalte Einzahlen angezeigt)
		Parts.DangerPlaces = [0, 0, 0, 0, 0]; // Feld mit Dangerinformationen. Wenn > 0, dann die gefährdeten FP
		Parts.LeveltLG = [false, false, false, false, false];
		Parts.Maezens = [];

		if (Parts.CurrentGB.IsPreviousLevel) {
			Total = 0;
			for (let i = 0; i < Parts.CurrentGB.Rankings.length; i++) {
				let ToAdd = Parts.CurrentGB.Rankings[i]['forge_points'];
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
			for (let i = 0; i < Parts.CurrentGB.Rankings.length; i++) {
				// Owner
				let CurrentMaezen = Parts.CurrentGB.Rankings[i]['forge_points'];
				if (Parts.CurrentGB.Rankings[i]?.player?.is_self) {
					AlreadyPaid = CurrentMaezen;
				}
				if (Parts.CurrentGB.Rankings[i]['player'] && Parts.CurrentGB.Rankings[i]['player']['player_id'] === Parts.CurrentGB.Entity['player_id']) {
					EigenStart = CurrentMaezen;
					Rest -= EigenStart;
					continue;
				}
				// Deleted player
				else if (Parts.CurrentGB.Rankings[i]['rank'] === undefined || Parts.CurrentGB.Rankings[i]['rank'] < 0) { //undefined => Eigentümer oder gelöscher Spieler P1-5, -1 => gelöschter Spieler ab P6 abwärts
					Rest -= CurrentMaezen;
					MaezenTotal += CurrentMaezen;
					continue;
				}

				let Place = Parts.CurrentGB.Rankings[i]['rank'] - 1,
					MedalCount = 0;

				Parts.Maezens[Place] = CurrentMaezen;
				if (Parts.Maezens[Place] === undefined) Parts.Maezens[Place] = 0;

				if (Place < 5) {
					if (Parts.CurrentGB.Rankings[i]['reward'] !== undefined) {
						let FPCount = (Parts.CurrentGB.Rankings[i]['reward']['strategy_point_amount'] !== undefined ? parseInt(Parts.CurrentGB.Rankings[i]['reward']['strategy_point_amount']) : 0);
						if (FPCount > 0) {
							FPRewards[Place] = MainParser.round(FPCount * arcs[Place]);
						}
						else {
							FPRewards[Place] = 1;
						}
						if (FPRewards[Place] === undefined) FPRewards[Place] = 0;

						// Medals
						MedalCount = (Parts.CurrentGB.Rankings[i]['reward']['resources'] !== undefined ? parseInt(Parts.CurrentGB.Rankings[i]['reward']['resources']['medals']) : 0);
						MedalRewards[Place] = MainParser.round(MedalCount * arcs[Place]);
						if (MedalRewards[Place] === undefined) MedalRewards[Place] = 0;

						// Blueprints
						let BlueprintCount = (Parts.CurrentGB.Rankings[i]['reward']['blueprints'] !== undefined ? parseInt(Parts.CurrentGB.Rankings[i]['reward']['blueprints']) : 0);
						BPRewards[Place] = MainParser.round(BlueprintCount * arcs[Place]);
						if (BPRewards[Place] === undefined) BPRewards[Place] = 0;

						// Blueprints split by tier (multi-tier great buildings)
						BPTierRewards[Place] = (Parts.CurrentGB.Rankings[i]['reward']['blueprintRewards'] || []).map(bp => ({
							tier: bp['tier'],
							amount: MainParser.round((bp['amount'] || 0) * arcs[Place])
						}));
					}
					else {
						FPRewards[Place] = 0;
						MedalRewards[Place] = 0;
						BPRewards[Place] = 0;
						BPTierRewards[Place] = null;
					}
				}
			}

			// Previous level and spot not taken? => Fill with zero
			for (let i = Parts.Maezens.length; i < 5; i++) {
				Parts.Maezens[i] = 0;
				FPRewards[i] = 0;
				MedalRewards[i] = 0;
				BPRewards[i] = 0;
				BPTierRewards[i] = null;
			}
		}
		else {
			let P1 = GreatBuildings.Rewards[Era][Parts.Level];

			Parts.Maezens = [0, 0, 0, 0, 0];
			FPRewards = GreatBuildings.GetMaezen(P1, Parts.ArcPercents)
			MedalRewards = [0, 0, 0, 0, 0];
			BPRewards = [0, 0, 0, 0, 0];
			BPTierRewards = [];
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

		for (let i = 0; i < 5; i++) {
			if (FPRewards[i] <= Parts.Maezens[i] || Rest <= Parts.Maezens[i]) {
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
				
			if (Parts.PlaceAvailables[i]) 
				Parts.SafePlaces.push(i);
		}
		
        // Level is locked
		if (PlayerID === ExtPlayerID && MainParser.CityMapData[Parts.CurrentGB.Entity.id]?.level === MainParser.CityMapData[Parts.CurrentGB.Entity.id]?.max_level) {
			h.push('<div class="lg-not-possible" data-text="'+i18n('Boxes.Calculator.LGNotOpen')+'"></div>');
		}
		h.push(`<div id="gbCosts">`);
		
		// temporary calculator merge hint
		let hintRead = JSON.parse(localStorage.getItem('CalculatorHintRead'));
		if (!hintRead)
			h.push(`<div id="calcInfo" class="p5">
				<div class="text-center"><img src="${extUrl}css/images/menu/calculator.png" /> <img src="${extUrl}css/images/menu/part-calc.png" /> <b>?!</b></div> <span class="icon-close clickable"></span> 
				<div class="calcInfo">${i18n('Boxes.Calculator.InfoUpdate')}</div>
			</div>`)

		h.push(`<div class="dark-bg text-center p5">
			<div class="flex gap" style="justify-content:space-between;align-items:end;margin-bottom:5px;">
			<div class="lb-info">
			<h1>${CityEntity['name']}</h1>`);
		if (PlayerName) h.push(`<span class="activity activity_${PlayerDict[PlayerID]['Activity']}"></span> ${MainParser.GetPlayerLink(PlayerID, PlayerName)}`);

		// Current status of the GB: level / max level, progress and tier
		let StatusEntity = Parts.CurrentGB.Entity,
			OverviewRow = Parts.CurrentGB.OverviewRow,
			Status = [];

		Status.push(`${i18n('Boxes.OwnpartCalculator.Step')} ${StatusEntity['level']}${StatusEntity['max_level'] ? '&#8201;/&#8201;' + HTML.Format(StatusEntity['max_level']) : ''}`);

		if (StatusEntity['state'] && StatusEntity['state']['forge_points_for_level_up'] !== undefined) {
			Status.push(`${HTML.Format(StatusEntity['state']['invested_forge_points'] || 0)}&#8201;/&#8201;${HTML.Format(StatusEntity['state']['forge_points_for_level_up'])} ${i18n('Boxes.Calculator.FP')}`);
		}

		// Tier preferably from the current rankings (also works for own GBs),
		// otherwise from the overview, as long as its data still matches the current level
		let Tier = Parts.CurrentGB.Tier
			|| ((OverviewRow && OverviewRow['level'] === StatusEntity['level']) ? OverviewRow['currentTier'] : null);
		if (Tier) {
			let TierBadge = GreatBuildings.TierBadge(Tier);
			if (TierBadge) Status.push(TierBadge);
		}

		h.push(`<div class="lb-status">${Status.join(' &middot; ')}</div>`);
		h.push('</div>');

		h.push('<div class="level-switch">');
		if (Parts.CurrentGB.IsPreviousLevel) {
			let Level = GreatBuildings.GetLevel(EntityID, Total);
			if (Level) 
				h.push((Level-1) + ' &rarr; ' + (Level));
			else // Level unknown
				h.push(i18n('Boxes.OwnpartCalculator.OldLevel'));
		}
		else {
			if (Parts.IsNextLevel) 
				h.push('<button class="btn btn-slim btn-set-level" data-value="' + (Parts.Level - 1) + '">&lt;</button> ');

			h.push(Parts.Level + ' &rarr; ' + (parseInt(Parts.Level) + 1));

			if (GreatBuildings.Rewards[Era] && GreatBuildings.Rewards[Era][Parts.Level + 1]) 
				h.push(' <button class="btn btn-slim btn-set-level" data-value="' + (Parts.Level + 1) + '">&gt;</button>');
		}
		h.push('</div>');
		h.push('</div>');

		h.push('<span class="btn-group">');
		// different arc bonus-buttons
		let investmentSteps = [80, 90, 100, MainParser.ArkBonus],
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

		h.push('<table id="OwnPartTable" class="foe-table" style="margin-top:2px">');
		h.push('<thead>');

		h.push('<tr>');
		h.push('<th>' + i18n('Boxes.OwnpartCalculator.Order') + '</th>');
		h.push('<th class="text-center"><span class="forgepoints" title="' + HTML.i18nTooltip(i18n('Boxes.OwnpartCalculator.Deposit')) + '"></th>');
		h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.Done') + '</th>');
		if (printsEnabled) h.push('<th class="text-center"><span class="blueprint"' + GreatBuildings.BlueprintIconStyle(Parts.CurrentGB.Tier) + ' title="' + HTML.i18nTooltip(i18n('Boxes.OwnpartCalculator.BPs')) + '"></span></th>');
		if (medalsEnabled) h.push('<th class="text-center"><span class="medal" title="' + HTML.i18nTooltip(i18n('Boxes.OwnpartCalculator.Meds')) + '"></span></th>');
		if (!minView) h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.Ext') + '</th>');
		if (!minView) h.push('<th class="text-center">' + i18n('Boxes.OwnpartCalculator.Arc') + '</th>');
		h.push('</tr>');
		h.push('</thead>');
		h.push('<tbody>');
		let IncludeStart = localStorage.getItem('OwnPartIncludeStart') != 'false';
		let opt = (platz, gesamt)=>{
			let ret = `<strong class="${PlayerID==ExtPlayerID ? "copy-fp clickable":""}" data-copy="${platz}">${HTML.Format(platz)}</strong>`;
			if (gesamt > platz) {
				ret += ` <small class="${IncludeStart || PlayerID!=ExtPlayerID ? "":"copy-fp clickable"}" data-copy="${gesamt}">(=${HTML.Format(gesamt)})</small>`;
			}
			return ret;
		}

		for (let i = 0; i < 5; i++) {
			EigenCounter += Eigens[i];

			// owner contributions
			if (i === 0 && EigenStart > 0) {
				if (IncludeStart) EigenCounter += EigenStart;
				h.push('<tr>');
				let OwnPartStartText = (Eigens[i] > 0 ? opt(Eigens[i], EigenCounter): '-');
				h.push('<td>' + i18n('Boxes.OwnpartCalculator.OwnPart') + '</td>');
				h.push('<td class="text-center"><span class="' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + OwnPartStartText + '</span></td>');
				h.push('<td class="text-center paidFP"><b>' + HTML.Format(EigenStart) + '</b></td>');
				if (printsEnabled && medalsEnabled) h.push('<td colspan="4"></td>');
				else if (printsEnabled || medalsEnabled) h.push('<td colspan="3"></td>');
				else if (!minView) h.push('<td colspan="2"></td>');
				h.push('</tr>');
			}
			else {
				if (Eigens[i] > 0) {
					h.push('<tr>');
					let OwnPartText = opt(Eigens[i], EigenCounter);
					h.push('<td>' + i18n('Boxes.OwnpartCalculator.OwnPart') + '</td>');
					h.push('<td class="text-center ' + (PlayerID === ExtPlayerID ? 'success' : 'yellow-text') + '">' + OwnPartText + '</td>');
					if (printsEnabled && medalsEnabled) h.push('<td colspan="5"></td>');
					else if (printsEnabled || medalsEnabled) h.push('<td colspan="4"></td>');
					else if (!minView) h.push('<td colspan="3"></td>');
					if (minView) h.push('<td></td>');
					h.push('</tr>');
				}
			}

			// other players contributions

			h.push('<tr>');
			h.push('<td><b>' + (i+1) + '</b></td>');

			if (Parts.PlaceAvailables[i]) {
				let copyvalue = Parts.Maezens[i];
				if (AlreadyPaid && PlayerID !== ExtPlayerID)
					copyvalue = Math.max(Parts.Maezens[i]-AlreadyPaid, 0);

				h.push('<td class="text-center">' + 
					'<strong class="' + (PlayerID === ExtPlayerID ? '' : 'success' + (Parts.Maezens[i] > 0 ? ' copy-fp clickable' : '')) + '" ' + 
						'data-copy="' + (copyvalue > 0 ? copyvalue : '') + '">' + 
							(Parts.Maezens[i] > 0 ? HTML.Format(Parts.Maezens[i]) : '-') + 
						'</strong >' + 
					'</td>');
				
				if (Parts.LeveltLG[i]) {
					h.push(`<td class="text-center"><strong class="error">${i18n("Boxes.OwnpartCalculator.levelt")}</strong></td>`);
				}
				else if (Parts.DangerPlaces[i] > 5) {
					h.push(`<td class="text-center"><strong class="error">${i18n("Boxes.OwnpartCalculator.danger")} (${HTML.Format(Parts.DangerPlaces[i])}FP)</strong></td>`);
				}
				else {
					h.push('<td class="text-center">-</td>');
				}
			}
			else {
				h.push('<td class="text-center">-</td>');
				let MaezenString = Parts.Maezens[i] > 0 ? HTML.Format(Parts.Maezens[i]) : '-';
				let MaezenDiff = Parts.Maezens[i] - FPRewards[i];
				let MaezenDiffString = '';
				if (Parts.Maezens[i] > 0) {
					if (MaezenDiff > 0) {
						MaezenDiffString = ' <small class="success">(+' + HTML.Format(MaezenDiff) + ')</small>';
					}
					else if (MaezenDiff < 0) {
						MaezenDiffString = ' <small class="error">(' + HTML.Format(MaezenDiff) + ')</small>';
					}
				}

				h.push('<td class="text-center paidFP"><b>' + MaezenString + MaezenDiffString + '</b></td>');
			}

			if (printsEnabled) h.push('<td class="text-center">' + GreatBuildings.FormatBlueprintRewards(BPTierRewards[i], BPRewards[i]) + '</td>');
			if (medalsEnabled) h.push('<td class="text-center">' + HTML.Format(MedalRewards[i]) + '</td>');
			if (!minView) h.push('<td class="text-center"><input min="0" step="1" type="number" class="ext-part-input' + i + '" value="' + Parts.Exts[i] + '"></td>');
			if (!minView) h.push('<td class="text-center"><input type="number" class="arc-percent-input" step="0.1" min="12" max="200" value="' + Parts.ArcPercents[i] + '"></td>');

			h.push('</tr>');
		}

		let MaezenRest = 0;
		for (let i = 5; i < Parts.Maezens.length; i++) {
			MaezenRest += Parts.Maezens[i];
		}

		// any contribution over 5th place
		if (MaezenRest > 0) {
			h.push('<tr>');
			h.push('<td>#6' + (Parts.Maezens.length > 6 ? ('-' + Parts.Maezens.length) : '') + '</td>');
			h.push('<td class="text-center">-</td>');
			h.push('<td class="text-center"><strong class="info">' + HTML.Format(MaezenRest) + '</strong></td>');
			if (!minView) h.push('<td colspan="4"></td>');
			h.push('</tr>');
		}

		// rest to pay for the owner
		if (Eigens[5] > 0) {
			EigenCounter += Eigens[5];
			h.push('<tr>');
			let OwnPartRestText = opt(Eigens[5], EigenCounter);
			h.push('<td>' + i18n('Boxes.OwnpartCalculator.OwnPart') + '</td>');
			h.push('<td class="text-center ' + (PlayerID === ExtPlayerID ? 'success' : 'yellow-text') + '">' + OwnPartRestText + '</td>');
			h.push('<td colspan="5"></td>');
			h.push('</tr>');
		}

		h.push('</tbody>');
		h.push('</table>');

		
		h.push('<div class="dark-bg" style="padding:5px">');

		h.push(`<div class="text-center">
			${i18n('Boxes.OwnpartCalculator.ExistingPayments')}: 
			<input id="lockexistingpayments" class="lockexistingpayments game-cursor" ${(Parts.LockExistingPlaces ? 'checked' : '')} type="checkbox">${i18n('Boxes.OwnpartCalculator.Lock')}
			<input id="trustexistingpayments" class="trustexistingpayments game-cursor" ${(Parts.TrustExistingPlaces ? 'checked' : '')} type="checkbox"> ${i18n('Boxes.OwnpartCalculator.Trust')}
			</div>`);

		if (!minView) {
			h.push('<table style="width: 100%"><tr>');
			h.push('<td>' + i18n('Boxes.OwnpartCalculator.PatronPart') + ': <strong class="' + (PlayerID === ExtPlayerID ? '' : 'success') + '">' + HTML.Format(MaezenTotal + ExtTotal) + '</strong></td>');
			h.push('<td class="text-right">' + i18n('Boxes.OwnpartCalculator.OwnPart') + ': <strong data-copy="'+(EigenTotal)+'" class="clickable copy-fp ' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + HTML.Format(EigenTotal) + '</strong></td>');
			h.push('</tr><tr>');
			h.push('<td>' + i18n('Boxes.OwnpartCalculator.LGTotalFP') + ': <strong>' + HTML.Format(Total) + '</strong></td>');
			if (EigenStart > 0) {
				h.push('<td class="text-right">' + i18n('Boxes.OwnpartCalculator.OwnPartRemaining') + ': <strong data-copy="'+(EigenTotal - EigenStart)+'" class="clickable copy-fp ' + (PlayerID === ExtPlayerID ? 'success' : '') + '">' + HTML.Format(EigenTotal - EigenStart) + '</strong></td>');
			}
			else {
				h.push('<td></td>');
			}
			h.push('</tr></table>');
		}

		Parts.CalcBackgroundBody();

		h.push(`<div class="text-center">${Calculator.GetRecurringQuestsLine(Parts.PlayInfoSound)}</div>`);

		// How much is still needed to level up?
		if (Parts.CurrentGB.IsPreviousLevel === false) {
			let rest;
			if (Parts.IsNextLevel) 
				rest = Total;
			else 
				rest = Parts.CurrentGB.Entity['state']['forge_points_for_level_up'] - Parts.CurrentGB.Rankings.reduce((acc,entry)=>acc+(entry?.forge_points|0),0);
			
			if (!minView) {
				h.push('<div class="text-center d-flex" style="padding:3px 0;">');
				h.push('<em>' + i18n('Boxes.Calculator.Up2LevelUp') + ': <span id="up-to-level-up" class="copy-fp clickable" data-copy="' + rest + '">' + HTML.Format(rest) + '</span> ' + i18n('Boxes.Calculator.FP') + '</em>');
				h.push('</div>');
			}
			
			h.push('<div class="bottom-buttons text-center">');
			h.push('<div class="flex">');
			h.push('<span id="OwnPartCalcGBSettings" class="fh-icon-settings"></span>'); 
			h.push('<div class="btn-group">');
			if (Parts.SafePlaces.length > 0 || Parts.CopyModeAll) { //Copy bzw. Note Button nur einblenden wenn zumindest ein Platz safe ist
				h.push('<span class="btn btn-slim button-own">' + i18n('Boxes.OwnpartCalculator.CopyValues') + '</span>');
				if (Parts.CurrentGB.Entity['player_id'] === ExtPlayerID) h.push('<span class="btn btn-slim button-save-own">' + i18n('Boxes.OwnpartCalculator.Note') + '</span>');
			}
			else {
				h.push(i18n('Boxes.OwnpartCalculator.NoPlaceSafe'));
			}
			h.push('</div></div>');

			h.push(`<div class="btn-group">
				<span class="btn btn-slim button-powerleveling">${i18n('Boxes.OwnpartCalculator.PowerLeveling')}</span>
				</div>`);
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

		if ($('#PowerLevelingBox').length > 0 && !Parts.CurrentGB.IsPreviousLevel) {
			Parts.CalcBodyPowerLeveling();
		}

		$('#OwnPartCalcGBSettings').bind('click', function() {
			$('.OwnPartBoxBackgroundBody').fadeToggle();
			$('#OwnPartBox').toggleClass('gbSettingsOpen');
		});
	},


	/**
	 * Builds the localStorage key for a per-player (and optionally per-GB) setting.
	 *
	 * @param {string} SettingName - Name of the setting
	 * @param {?string} EntityID - City entity id of the GB, null for player-wide settings
	 * @returns {string} The localStorage key
	 */
	GetStorageKey: (SettingName, EntityID) => {
		if (EntityID) {
			return 'OwnPart_' + SettingName + '_' + EntityID + '_' + ExtPlayerID;
		}
		else {
			return 'OwnPart_' + SettingName + '_' + ExtPlayerID;
		}
	},


	/**
	 * Quick-copy helper for FP values: pastes the value directly into the game's
	 * contribution input while a GB screen is open, otherwise copies it to the
	 * clipboard. Also used by the cost calculator.
	 *
	 * @param {number|string} value - The FP value to paste or copy
	 */
	setDonation: (value) => {
		if (!Parts.allowCopyPlace) {
			helper.str.copyToClipboardLegacy(String(value));
		}
		//Set Cursor to input field
		else {
			mouseActions.randomClick([189, -62, 'Center']);
			KeyboardEvents.paste(String(value));
		}
	}
};



