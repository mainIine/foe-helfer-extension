/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to 
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md 
 * for full license details.
 *
 * **************************************************************************************
 */

let _menu = {

	isBottom: false,
	selectedMenu: 'BottomBar',
	MenuScrollTop: 0,
	MenuScrollLeft: 0,
	SlideParts: 0,
	ActiveSlide: 1,
	HudCount: 0,
	HudLength: 0,
	HudHeight: 0,
	HudWidth: 0,

	MenuOptions: ['BottomBar', 'RightBar', 'Box'],
	
	Items: [
		'calculator',
		'partCalc',
		'outpost',
		'productions',	
		'hiddenRewards',
		'negotiation',
		'infobox',
		'notice',
		'technologies',
		'campagneMap',
		'citymap',
		'unit',
		'settings',
		'stats',
		'kits',
		'greatbuildings',
		'market',
		// 'marketoffers',
		'bluegalaxy',
		'moppelhelper',
		'fpCollector',
		'gildfight',
		'investment',
		'alerts',
		'guildmemberstat',
		'gexstat',
		'productionsrating',
		'castle',
		//'discord',
		'music',
		'musicControl',
		// 'unitsGex',
	],

	HiddenItems: [],


	/**
	 * Create the div holders and put them to the DOM
	 *
	 * @param selMenu
	 * @constructor
	 */
	CallSelectedMenu: (selMenu = 'BottomBar') => {

		if (selMenu === 'BottomBar') {
			_menu.selectedMenu = 'BottomBar';
			_menu_bottom.BuildOverlayMenu();
		}
		else if (selMenu === 'RightBar') {
			_menu.selectedMenu = 'RightBar';
			_menu_right.BuildOverlayMenu();
		}
		else if (selMenu === 'Box') {
			_menu.selectedMenu = 'Box';
			_menu_box.BuildBoxMenu();
        }

		if(Settings.GetSetting('AutoOpenInfoBox')){
			Infoboard.Show();
		}

		if (Settings.GetSetting('AutoOpenCloseBox')) {
			CloseBox.BuildBox();
		}
	},


	/**
	 * Hides a button. The HUD slider must already be filled for this.
	 *
	 * @param buttonId
	 * @constructor
	 */
	HideButton: (buttonId) => {
		if ($('#foe-helper-hud-slider').has(`div#${buttonId}`).length > 0)
		{
			$($('#foe-helper-hud-slider').children(`div#${buttonId}`)[0]).hide();
		}
	},


	/**
	 * Shows a hidden button again
	 */
	ShowButton: (buttonId) => {
		if ($('#foe-helper-hud-slider').has(`div#${buttonId}`))
		{
			$($('#foe-helper-hud-slider').children(`div#${buttonId}`)[0]).show();
		}
	},

	
	/**
	 * Tooltip Box
	 *
	 * @param {object} btn
	 * @param {string} title
	 * @param {string} desc
	 * @param {string} id
	 */
	toolTipp: (btn, title, desc, id = '') => {

		$(btn).attr('title', desc);

		let pos = (_menu.selectedMenu === 'RightBar' ? 'left' : 'top');

		// fix the tooltip position when menu is box and at the top border
		if(_menu.selectedMenu === 'Box'){
			let top = $('#menu_box').offset().top;

			if(top < 120){
				pos = 'bottom';
			}
		}

		return $(btn).tooltip({
			useFoEHelperSkin: true,
			headLine: title,
			content: desc,
			container: 'body',
			placement: pos
		});
	},


	/**
	* Integrates all required buttons
	*/
	ListLinks: (InsertMenuFunction) => {
		let StorgedItems = localStorage.getItem('MenuSort');
		let HiddenItems = localStorage.getItem('MenuHiddenItems');

		// Beta-Funktionen
		if (HelperBeta.active) {
			_menu.Items.unshift(...HelperBeta.menu);
		}

		if (StorgedItems !== null) {
			let storedItems = JSON.parse(StorgedItems);

			let missingMenu = storedItems.filter(function (sI) {
				return !_menu.Items.some(function (mI) {
					return sI === mI;
				});
			});

			let missingStored = _menu.Items.filter(function (mI) {
				return !storedItems.some(function (sI) {
					return sI === mI;
				});
			});

			_menu.Items = JSON.parse(StorgedItems);

			let items = missingMenu.concat(missingStored);

			// there is indeed something new...
			if (items.length > 0) {
				for (let i in items) {
					if (!items.hasOwnProperty(i)) {
						break;
					}

					// ... new comes in front ;-)
					_menu.Items.unshift(items[i]);
				}
			}
		}

		// Filter out beta functions
		_menu.Items = _menu.Items.filter(e => {
			if (HelperBeta.active) return true;
			return !HelperBeta.menu.includes(e);
		});

		// Filter out duplicates
		function unique(arr) {
			return arr.filter(function (value, index, self) {
				return self.indexOf(value) === index;
			});
		}

		_menu.Items = unique(_menu.Items);

		// remove all hidden items
		if(HiddenItems !== null)
		{
			let hiddenItems = JSON.parse(HiddenItems);
			_menu.HiddenItems = hiddenItems;
			_menu.Items = _menu.Items.filter(val => !hiddenItems.includes(val));
		}

		// Menüpunkte einbinden
		for (let i in _menu.Items)
		{
			if (!_menu.Items.hasOwnProperty(i)) {
				break;
			}

			const name = _menu.Items[i] + '_Btn';

			// gibt es eine Funktion?
			if (_menu[name] !== undefined) {
				InsertMenuFunction(_menu[name]());
			}
		}

		_menu.Items = _menu.Items.filter(e => e);
	},


	/**
	 * Toggle a menu buttons' visibility, update HiddenItems and corresponding settings button
	 * 
	 * @param name 
	 */
	ToggleItemVisibility: (name) => {

		if(_menu.HiddenItems.includes(name))
		{
			$('#' + name + '-Btn').removeClass('btn-hidden');
			$('#setting-' + name + '-Btn').removeClass('hud-btn-red');

			_menu.HiddenItems = _menu.HiddenItems.filter(e => {
				return e !== name;
			});
		}
		else {
			$('#' + name + '-Btn').addClass('btn-hidden');
			$('#setting-' + name + '-Btn').addClass('hud-btn-red');

			_menu.HiddenItems.push(name);
		}
		
		localStorage.setItem('MenuHiddenItems', JSON.stringify(_menu.HiddenItems));
	},


	/**
	 * Checks whether anything has changed in the sorting of the items.
	 *
	 * @param storedItems
	 * @returns {boolean}
	 */
	equalTo: (storedItems) => {
		for (let i = 0; i < storedItems.length; i++) {
			// Es hat sich etwas an der Sortierung verändert
			if (storedItems[i] !== _menu.Items[i]) return false;
		}

		return true;
	},


	/*----------------------------------------------------------------------------------------------------------------*/
	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Cost calculator button
	 *
	 * @returns {*|jQuery}
	 */
	calculator_Btn: () => {
		let btn_CalcBG = $('<div />').attr({ 'id': 'calculator-Btn', 'data-slug': 'calculator' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		btn_CalcBG = _menu.toolTipp(btn_CalcBG, i18n('Menu.Calculator.Title'), '<em id="calculator-Btn-closed" class="tooltip-error">' + i18n('Menu.Calculator.Warning') + '<br></em>' + i18n('Menu.Calculator.Desc'), 'calculator-Btn');

		let btn_Calc = $('<span />');

		btn_Calc.bind('click', function () {
			if (Calculator.CityMapEntity) {
				Calculator.Show('menu');
			}
		});

		btn_CalcBG.append(btn_Calc);

		return btn_CalcBG;
	},

	/**
	 * Own contribution calculator button
	 *
	 * @returns {*|jQuery}
	 */
	partCalc_Btn: () => {
		let btn_OwnBG = $('<div />').attr({ 'id': 'partCalc-Btn', 'data-slug': 'partCalc' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		btn_OwnBG = _menu.toolTipp(btn_OwnBG, i18n('Menu.OwnpartCalculator.Title'), '<em id="partCalc-Btn-closed" class="tooltip-error">' + i18n('Menu.OwnpartCalculator.Warning') + '<br></em>' + i18n('Menu.OwnpartCalculator.Desc'));

		let btn_Own = $('<span />');

		btn_Own.on('click', function () {
			// nur wenn es für diese Session ein LG gibt zünden
			if (Parts.CityMapEntity !== undefined && Parts.Rankings !== undefined) {
				Parts.Show();
			}
		});

		btn_OwnBG.append(btn_Own);

		return btn_OwnBG;
	},

	/**
	 * Outpost Button
	 *
	 * @returns {*|jQuery}
	 */
	outpost_Btn: () => {

		let btn_outPBG = $('<div />').attr({ 'id': 'outpost-Btn', 'data-slug': 'outpost' }).addClass('hud-btn'),
			desc = i18n('Menu.OutP.Desc');

		if (Outposts.OutpostData === null) {
			btn_outPBG.addClass('hud-btn-red');
			desc = i18n('Menu.OutP.DescWarningOutpostData');
		}
		if (localStorage.getItem('OutpostBuildings') === null) {
			btn_outPBG.addClass('hud-btn-red');
			desc = i18n('Menu.OutP.DescWarningBuildings');
		}

		// Tooltip einbinden
		btn_outPBG = _menu.toolTipp(btn_outPBG, i18n('Menu.OutP.Title'), desc);

		let btn_outpost = $('<span />');

		btn_outpost.bind('click', function () {
			let OutpostBuildings = localStorage.getItem('OutpostBuildings');

			if (OutpostBuildings !== null) {
				Outposts.BuildInfoBox();
			}
		});

		btn_outPBG.append(btn_outpost);

		return btn_outPBG;
	},

	/**
	 * Product overview button
	 *
	 * @returns {*|jQuery}
	 */
	productions_Btn: () => {
		let btn_FPsBG = $('<div />').attr({ 'id': 'productions-Btn', 'data-slug': 'productions' }).addClass('hud-btn');

		// Tooltip einbinden
		btn_FPsBG = _menu.toolTipp(btn_FPsBG, i18n('Menu.Productions.Title'), i18n('Menu.Productions.Desc'));

		let btn_FPs = $('<span />');

		btn_FPs.bind('click', function () {
			Productions.init();
		});

		btn_FPsBG.append(btn_FPs);

		return btn_FPsBG;
	},

	/**
	 * Outpost Button
	 *
	 * @returns {*|jQuery}
	 */
	productionsrating_Btn: () => {
		let btn_prodratBG = $('<div />').attr({ 'id': 'productionsrating-Btn', 'data-slug': 'productionsrating' }).addClass('hud-btn');

		// Tooltip einbinden
		btn_prodratBG = _menu.toolTipp(btn_prodratBG, i18n('Menu.ProductionsRating.Title'), i18n('Menu.ProductionsRating.Desc'));

		let btn_prodrat = $('<span />');

		btn_prodrat.bind('click', function () {
			Productions.ShowRating();
		});

		btn_prodratBG.append(btn_prodrat);

		return btn_prodratBG;
	},

	/**
	 * Negotiation
	 *
	 * @returns {*|jQuery}
	 */
	negotiation_Btn: () => {
		let btn_NegotiationBG = $('<div />').attr({ 'id': 'negotiation-Btn', 'data-slug': 'negotiation' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		btn_NegotiationBG = _menu.toolTipp(btn_NegotiationBG, i18n('Menu.Negotiation.Title'), '<em id="negotiation-Btn-closed" class="tooltip-error">' + i18n('Menu.Negotiation.Warning') + '<br></em>' + i18n('Menu.Negotiation.Desc'));

		let btn_Negotiation = $('<span />');

		btn_Negotiation.bind('click', function () {
			if ($('#negotiation-Btn').hasClass('hud-btn-red') === false) {
				Negotiation.Show();
			}
		});

		btn_NegotiationBG.append(btn_Negotiation);

		return btn_NegotiationBG;
	},

	/**
	 * InfoBox für den Hintergrund "Verkehr"
	 *
	 * @returns {*|jQuery}
	 */
	infobox_Btn: () => {

		let btn_Info = $('<div />').attr({ 'id': 'infobox-Btn', 'data-slug': 'infobox' }).addClass('hud-btn');

		// Tooltip einbinden
		btn_Info = _menu.toolTipp(btn_Info, i18n('Menu.Info.Title'), i18n('Menu.Info.Desc'));

		let btn_Inf = $('<span />');

		btn_Inf.on('click', function () {
			Infoboard.Show();
		});

		btn_Info.append(btn_Inf);


		return btn_Info;
	},

	/**
	 * Technologien
	 *
	 * @returns {*|jQuery}
	 */
	technologies_Btn: () => {
		let btn_TechBG = $('<div />').attr({ 'id': 'technologies-Btn', 'data-slug': 'technologies' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden

		btn_TechBG = _menu.toolTipp(btn_TechBG, i18n('Menu.Technologies.Title'), '<em id="technologies-Btn-closed" class="tooltip-error">' + i18n('Menu.Technologies.Warning') + '<br></em>' + i18n('Menu.Technologies.Desc'));

		let btn_Tech = $('<span />');

		btn_Tech.on('click', function () {
			if (Technologies.AllTechnologies !== null) {
				Technologies.Show();
			}
		});

		btn_TechBG.append(btn_Tech);

		return btn_TechBG;
	},

	/**
	 * KampanienMap
	 *
	 * @returns {*|jQuery}
	 */
	campagneMap_Btn: () => {
		let btn_MapBG = $('<div />').attr({ 'id': 'campagneMap-Btn', 'data-slug': 'campagneMap' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		btn_MapBG = _menu.toolTipp(btn_MapBG, i18n('Menu.Campagne.Title'), '<em id="campagneMap-Btn-closed" class="tooltip-error">' + i18n('Menu.Campagne.Warning') + '<br></em>' + i18n('Menu.Campagne.Desc'));

		let btn_Map = $('<span />');

		btn_Map.on('click', function () {
			if (KampagneMap.Provinces !== null) {
				KampagneMap.Show();
			}
		});

		btn_MapBG.append(btn_Map);

		return btn_MapBG;
	},

	/**
	 * citymap
	 *
	 * @returns {*|jQuery}
	 */
	citymap_Btn: () => {
		let btn_CityBG = $('<div />').attr({ 'id': 'citymap-Btn', 'data-slug': 'citymap' }).addClass('hud-btn');

		// Tooltip einbinden
		btn_CityBG = _menu.toolTipp(btn_CityBG, i18n('Menu.Citymap.Title'), i18n('Menu.Citymap.Desc'));

		let btn_City = $('<span />');

		btn_City.on('click', function () {
			if (LastMapPlayerID === ExtPlayerID) {
				CityMap.init(false);
			}
			else {
				let Player = PlayerDict[LastMapPlayerID];
				let PlayerName = (Player ? Player['PlayerName'] : '???');
				CityMap.init(false, MainParser.OtherPlayerCityMapData, PlayerName);
            }
		});

		btn_CityBG.append(btn_City);

		return btn_CityBG;
	},

	/**
	 * Events in the city and the surrounding area
	 *
	 * @returns {null|undefined|jQuery}
	 */
	hiddenRewards_Btn: () => {
		let btn_RewardsBG = $('<div />').attr({ 'id': 'hiddenRewards-Btn', 'data-slug': 'hiddenRewards' }).addClass('hud-btn');

		// Tooltip einbinden
		btn_RewardsBG = _menu.toolTipp(btn_RewardsBG, i18n('Menu.HiddenRewards.Title'), i18n('Menu.HiddenRewards.Desc'));

		let btn_Rewards = $('<span />');

		btn_Rewards.on('click', function () {
			HiddenRewards.init();
		})

		btn_RewardsBG.append(btn_Rewards, $('<span id="hidden-reward-count" class="hud-counter">0</span>'));

		return btn_RewardsBG;
	},

	/**
	 * Armies
	 * @returns {*|jQuery}
	 */
	unit_Btn: () => {
		let btn_UnitBG = $('<div />').attr({ 'id': 'unit-Btn', 'data-slug': 'unit' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		btn_UnitBG = _menu.toolTipp(btn_UnitBG, i18n('Menu.Unit.Title'), '<em id="unit-Btn-closed" class="tooltip-error">' + i18n('Menu.Unit.Warning') + '<br></em>' + i18n('Menu.Unit.Desc'), 'unit-Btn');

		let btn_Unit = $('<span />');

		btn_Unit.on('click', function () {
			if (Unit.Cache !== null) {
				Unit.Show();
			}
		});

		btn_UnitBG.append(btn_Unit);

		return btn_UnitBG;
	},

	/**
	 * Notice function
	 *
	 * @returns {null|undefined|jQuery|HTMLElement|void}
	 */
	notice_Btn: () => {
		let btn_NoticeBG = $('<div />').attr({ 'id': 'notice-Btn', 'data-slug': 'notice' }).addClass('hud-btn');

		btn_NoticeBG = _menu.toolTipp(btn_NoticeBG, i18n('Menu.Notice.Title'), i18n('Menu.Notice.Desc'), 'notice-Btn');

		let btn_Notice = $('<span />');

		btn_Notice.on('click', function () {
			Notice.init();
		});

		btn_NoticeBG.append(btn_Notice);

		return btn_NoticeBG;
	},

	/**
	 * Settings
	 *
	 */
	settings_Btn: () => {

		let btn = $('<div />').attr({ 'id': 'settings-Btn', 'data-slug': 'settings' }).addClass('hud-btn');

		btn = _menu.toolTipp(btn, i18n('Menu.Settings.Title'), i18n('Menu.Settings.Desc'));

		let btn_Set = $('<span />');

		btn_Set.on('click', function () {
			Settings.BuildBox();
		});

		btn.append(btn_Set);

		return btn;
	},


	/**
	 * Statistic
	 * @returns {*|jQuery}
	 */
	stats_Btn: () => {
		let btn_StatsBG = $('<div />').attr({ 'id': 'stats-Btn', 'data-slug': 'stats' }).addClass('hud-btn');

		btn_StatsBG = _menu.toolTipp(btn_StatsBG, i18n('Menu.Stats.Title'), i18n('Menu.Stats.Desc'), 'stats-Btn');

		let btn_Stats = $('<span />');

		btn_Stats.on('click', function () {
			Stats.page = 1;
			Stats.filterByPlayerId = null;
			Stats.Show(false);
		});

		btn_StatsBG.append(btn_Stats);

		return btn_StatsBG;
	},


	/**
	 * Set Übersicht
	 */
	kits_Btn: ()=> {

		let btn = $('<div />').attr({ 'id': 'kits-Btn', 'data-slug': 'kits' }).addClass('hud-btn');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.Kits.Title'), i18n('Menu.Kits.Desc'));

		let btn_sp = $('<span />');

		btn_sp.on('click', function(){
			Kits.init();
		});

		btn.append(btn_sp);

		return btn;
	},

	/**
	 * FP Produzierende LGs
	 */
	greatbuildings_Btn: () => {

		let btn = $('<div />').attr({ 'id': 'greatbuildings-Btn', 'data-slug': 'greatbuildings' }).addClass('hud-btn');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.greatbuildings.Title'), i18n('Menu.greatbuildings.Desc'));

		let btn_sp = $('<span />');

		btn_sp.on('click', function () {
			GreatBuildings.Show();
		});

		btn.append(btn_sp);

		return btn;
	},

	/**
	 * Marktplatz Filter
	 */
	market_Btn: () => {
		let btn = $('<div />').attr({ 'id': 'market-Btn', 'data-slug': 'market' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.Market.Title'), '<em id="market-Btn-closed" class="tooltip-error">' + i18n('Menu.Market.Warning') + '<br></em>' + i18n('Menu.Market.Desc'));

		let btn_Market = $('<span />');

		btn_Market.bind('click', function () {
			if ($('#market-Btn').hasClass('hud-btn-red') === false) {
				Market.Show(false);
			}
		});

		btn.append(btn_Market);

		return btn;
	},

	/**
	* Marktangebote
	*/
	marketoffers_Btn: () => {
		let btn = $('<div />').attr({ 'id': 'marketoffers-Btn', 'data-slug': 'marketoffers' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.MarketOffers.Title'), '<em id="marketoffers-Btn-closed" class="tooltip-error">' + i18n('Menu.MarketOffers.Warning') + '<br></em>' + i18n('Menu.MarketOffers.Desc'));

		let btn_MarketOffers = $('<span />');

		btn_MarketOffers.bind('click', function () {
			if ($('#marketoffers-Btn').hasClass('hud-btn-red') === false) {
				MarketOffers.Show(false);
			}
		});

		btn.append(btn_MarketOffers);

		return btn;
	},

	/**
	 * Helper Blue Galaxy
	 */
	bluegalaxy_Btn: () => {
		let OwnGalaxy = Object.values(MainParser.CityMapData).find(obj => (obj['cityentity_id'] === 'X_OceanicFuture_Landmark3'));;

		// no BG => display none
		if (!OwnGalaxy) {
			let index = _menu.Items.indexOf('bluegalaxy');
			delete _menu.Items[index];
			return;
		}

		let btn = $('<div />').attr({ 'id': 'bluegalaxy-Btn', 'data-slug': 'bluegalaxy' }).addClass('hud-btn');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.Bluegalaxy.Title'), i18n('Menu.Bluegalaxy.Desc'));

		let btn_sp = $('<span />');

		btn_sp.on('click', function () {
			BlueGalaxy.Show();
		});

		btn.append(btn_sp, $('<span id="hidden-blue-galaxy-count" class="hud-counter">0</span>'));

		return btn;
	},

	
	/**
	 * Moppelassistent
	 * */
	moppelhelper_Btn: () => {
		// active?
		if(!Settings.GetSetting('ShowPlayersMotivation')){
			return;
		}

		let btn = $('<div />').attr({ 'id': 'moppelhelper-Btn', 'data-slug': 'moppelhelper' }).addClass('hud-btn');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.Moppelhelper.Title'), i18n('Menu.Moppelhelper.Desc'));

		let btn_sp = $('<span />');

		btn_sp.on('click', function () {
			EventHandler.ShowMoppelHelper();
		});

		btn.append(btn_sp);

		return btn;
    },


	/**
	 * FP Collector box
	 */
	fpCollector_Btn: () => {
		let btn = $('<div />').attr({ 'id': 'fpCollector-Btn', 'data-slug': 'fpCollector' }).addClass('hud-btn');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.fpCollector.Title'), i18n('Menu.fpCollector.Desc'));

		let btn_sp = $('<span />');

		btn_sp.on('click', function () {
			FPCollector.ShowFPCollectorBox();
		});

		btn.append(btn_sp);

		return btn;
	},


	/**
	 * Shows the box for managing all alerts
	 *
	 * @returns {*|jQuery}
	 */
	alerts_Btn: () => {
		let btn = $('<div />').attr({ 'id': 'alerts-Btn', 'data-slug': 'alerts' }).addClass('hud-btn');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.Alerts.Title'), i18n('Menu.Alerts.Desc'));

		let btn_sp = $('<span />');

		btn_sp.on('click', function () {
			Alerts.show();
		});

		btn.append(btn_sp);

		return btn;
	},


	/**
	 * Shows the box for gex units stats
	 *
	 * @returns {*|jQuery}
	 */
	unitsGex_Btn: () => {
		let btn = $('<div />').attr({ 'id': 'unitsGex-Btn', 'data-slug': 'unitsGex' }).addClass('hud-btn');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.unitsGex.Title'), i18n('Menu.unitsGex.Desc'));

		let btn_sp = $('<span />');

		btn_sp.on('click', function () {
			UnitGex.showBox();
		});

		btn.append(btn_sp);

		return btn;
	},


	/**
	 * Guildfight Overview
	 * 	
	 * @returns {*|jQuery}
	 * */
	gildfight_Btn: () => {

		let btn = $('<div />').attr({ 'id': 'gildfight-Btn', 'data-slug': 'gildfight' }).addClass('hud-btn hud-btn-red'),
			desc = i18n('Menu.Gildfight.Warning') + i18n('Menu.Gildfight.Desc');

		btn = _menu.toolTipp(btn, i18n('Menu.Gildfight.Title'), desc);

		let btn_sp = $('<span />');

		btn_sp.on('click', function (){
			if(GildFights.MapData) {
				GildFights.ShowGildBox();
			}
		});

		btn.append(btn_sp);

		return btn;
	},


	/**
	 * InfoBox für Investitions Historie
	 *
	 * @returns {*|jQuery}
	 */
	investment_Btn: () => {

		let btn = $('<div />').attr({
			'id': 'investment-Btn',
			'data-slug': 'investment'
		}).addClass('hud-btn');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.Investment.Title'), i18n('Menu.Investment.Desc'));

		let btn_sp = $('<span />').on('click', function () {
			Investment.BuildBox(false);
		});

		btn.append(btn_sp);

		return btn;
	},


	/**
	 * Guild member statistic
	 */
	guildmemberstat_Btn: () => {
		let btn = $('<div />').attr({
			'id': 'guildmemberstat-Btn',
			'data-slug': 'guildmemberstat'
		}).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.GuildMemberStat.Title'), '<em id="guildmemberstat-Btn-closed" class="tooltip-error">' + i18n('Menu.GuildMemberStat.Warning') + '<br></em>' + i18n('Menu.GuildMemberStat.Desc'));

		let btn_sp = $('<span />').bind('click', function () {
			if ($('#guildmemberstat-Btn').hasClass('hud-btn-red') === false) {
				GuildMemberStat.BuildBox(false);
			}
		});

		btn.append(btn_sp);

		return btn;
	},


	/**
	 * GEX statistic
	 */
	gexstat_Btn: () => {
		let btn = $('<div />').attr({
			'id': 'gexstat-Btn',
			'data-slug': 'gexstat'
		}).addClass('hud-btn');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.GexStat.Title'), i18n('Menu.GexStat.Desc'));

		let btn_sp = $('<span />').bind('click', function () {
			if ($('#gexstat-Btn').hasClass('hud-btn-red') === false) {
				GexStat.BuildBox(false);
			}
		});

		btn.append(btn_sp);

		return btn;
	},


	/**
	 * Castle System
	 */
	castle_Btn: () => {
		let btn = $('<div />').attr({
			'id': 'castle-Btn',
			'data-slug': 'castle'
		}).addClass('hud-btn');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.Castle.Title'), i18n('Menu.Castle.Desc'));

		let btn_sp = $('<span />').bind('click', function () {
			if ($('#castle-Btn').hasClass('hud-btn-red') === false) {
				Castle.BuildBox();
			}
		});

		btn.append(btn_sp);

		return btn;
	},

	music_Btn: () => {
		let btn = $('<div />').attr({
			'id': 'music-Btn',
			'data-slug': 'music'
		}).addClass('hud-btn');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.Music.Title'), i18n('Menu.Music.Desc'));

		let btn_sp = $('<span />').bind('click', function () {
			if ($('#betterMusicDialog').length > 0) {
				betterMusic.CloseBox();
			} else {
				betterMusic.ShowDialog();
			}		

		});

		btn.append(btn_sp);

		return btn;
	},

	musicControl_Btn: () => {
		let btn = $('<div />').attr({
			'id': 'musicControl-Btn',
			'data-slug': 'musicControl'
		}).addClass('hud-btn');

		// Tooltip einbinden
		btn = _menu.toolTipp(btn, i18n('Menu.MusicControl.Title'), i18n('Menu.MusicControl.Desc'));

		let btn_sp = $('<span />').bind('click', function () {
			if ($('#musicControl-Btn').hasClass('hud-btn-red') === false) {
				$('#musicControl-Btn').toggleClass('musicmuted');
				if ($('#musicControl-Btn').hasClass('musicmuted')) {
					betterMusic.pause();
				} else {
					betterMusic.playStatus = true;
					betterMusic.TrackSelector();
				}
			}
		});

		btn.append(btn_sp);

		return btn;
	},
	
};
