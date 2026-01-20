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

let _menu = {

	isBottom: false,
	selectedMenu: 'RightBar',
	MenuScrollTop: 0,
	MenuScrollLeft: 0,
	SlideParts: 0,
	ActiveSlide: 1,
	HudCount: 0,
	HudLength: 0,
	HudHeight: 0,
	HudWidth: 0,
	TopOffset: 0,

	MenuOptions: ['BottomBar', 'RightBar', 'Box'],
	
	Items: [
		'calculator',
		'partCalc',
		'outpost',
		'productions',
		'productionsRating',
		'hiddenRewards',
		'negotiation',
		'infobox',
		'notice',
		'technologies',
		'campagneMap',
		'cityMap',
		'settings',
		'stats',
		'kits',
		'greatBuildings',
		'market',
		'blueGalaxy',
		'moppelHelper',
		'fpCollector',
		'gildFight',
		'investment',
		'alerts',
		'guildMemberstat',
		'gexStat',
		'castle',
		'music',
		'musicControl',
		'minigame_aztecs',
		'recurringQuests',
		'compare_friends_threads',
		'discord',
		'findGB',
		'playerProfile',
		'unit',
		'shopAssist',
		'allies',
	],

	HiddenItems: [],


	/**
	 * Create the div holders and put them to the DOM
	 *
	 * @param selMenu
	 * @constructor
	 */
	CallSelectedMenu: (selMenu = 'RightBar') => {
	
		window.onresize = (function(event){
			if (event.target == window) _menu.OverflowCheck()
		})

		if (selMenu === 'RightBar') {
			_menu.selectedMenu = 'RightBar';
			_menu_right.BuildOverlayMenu();
		}
		else if (selMenu === 'BottomBar') {
			_menu.selectedMenu = 'BottomBar';
			_menu_bottom.BuildOverlayMenu();
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
		
		_menu.OverflowCheck(_menu.selectedMenu, true);
	},

	OverflowCheck: (selMenu='Box', flag) => {
		if (window.innerHeight >= 600 && window.innerWidth >= 950 && (!flag && selMenu != MainParser.SelectedMenu)) {			
			$('#menu_box').remove();
			$('.tooltip').remove();
			_menu.CallSelectedMenu(MainParser.SelectedMenu);
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
	 */
	toolTipp: (btn, title, desc) => {

		$(btn).attr('title', desc);

		let pos = (_menu.selectedMenu === 'RightBar' ? 'left' : 'top');

		// fix the tooltip position when menu is box and at the top border
		if(_menu.selectedMenu === 'Box' && _menu.TopOffset < 120){
			pos = 'bottom';
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
			if (_menu.Items.indexOf(name) == -1) _menu.Items.push(name);
		}
		else {
			$('#' + name + '-Btn').addClass('btn-hidden');
			$('#setting-' + name + '-Btn').addClass('hud-btn-red');

			_menu.HiddenItems.push(name);
		}
		
		localStorage.setItem('MenuHiddenItems', JSON.stringify(_menu.HiddenItems));

		// refresh the Menü after setting-toggle
		setTimeout(()=> {
			$('#foe-helper-hud, #menu_box').remove();
			_menu.CallSelectedMenu(MainParser.SelectedMenu);
		}, 100);

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


	MakeButton: (slug, titel, desc, red = false)=> {

		let btn = _menu.toolTipp(
			$('<div />').attr({
				id: `${slug}-Btn`,
				'data-slug': slug
			}).addClass('hud-btn'),
			titel,
			desc,
			`${slug}-btn`
		);

		if(red) {
			btn.addClass('hud-btn-red');
		}

		return btn;
	},

	/*----------------------------------------------------------------------------------------------------------------*/
	/*----------------------------------------------------------------------------------------------------------------*/

	/**
	 * Armies
	 * @returns {*|jQuery}
	 */
	unit_Btn: () => {
		let btn_UnitBG = _menu.MakeButton(
			'unit',
			i18n('Menu.Unit.Title'),
			'<em id="unit-Btn-closed" class="tooltip-error">' + i18n('Menu.Unit.Warning') + '<br></em>' + i18n('Menu.Unit.Desc'),
			true
		);

		let btn_Unit = $('<span />');

		btn_Unit.on('click', function () {
			if (Unit.Cache !== null) {
				Unit.Show();
			}
		});

		return btn_UnitBG.append(btn_Unit);
	},

	/**
	 * Cost calculator button
	 *
	 * @returns {*|jQuery}
	 */
	calculator_Btn: () => {
		let btn_CalcBG = _menu.MakeButton(
			'calculator',
			i18n('Menu.Calculator.Title'),
			'<em id="calculator-Btn-closed" class="tooltip-error">' + i18n('Menu.Calculator.Warning') + '<br></em>' + i18n('Menu.Calculator.Desc'),
			true
		);

		let btn_Calc = $('<span />').bind('click', function () {
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
		let btn_OwnBG = _menu.MakeButton(
			'partCalc',
			i18n('Menu.OwnpartCalculator.Title'),
			'<em id="partCalc-Btn-closed" class="tooltip-error">' + i18n('Menu.OwnpartCalculator.Warning') + '<br></em>' + i18n('Menu.OwnpartCalculator.Desc'),
			true
		);

		let btn_Own = $('<span />').on('click', function () {
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
		let desc = i18n('Menu.OutP.Desc'),
			red = false;

		if (Outposts.OutpostData === null) {
			red = true;
			desc = i18n('Menu.OutP.DescWarningOutpostData');
		}

		if (localStorage.getItem('OutpostBuildings') === null) {
			red = true;
			desc = i18n('Menu.OutP.DescWarningBuildings');
		}

		let btn = _menu.MakeButton('outpost', i18n('Menu.OutP.Title'), desc, red);

		let btn_outpost = $('<span />').bind('click', function () {
			let OutpostBuildings = localStorage.getItem('OutpostBuildings');

			if (OutpostBuildings !== null) {
				Outposts.BuildInfoBox();
			}
		});

		return btn.append(btn_outpost);
	},

	/**
	 * Shop Assistant Button
	 *
	 * @returns {*|jQuery}
	 */
	shopAssist_Btn: () => {
		let desc = '<i id="shopAssist-Btn-closed" class="tooltip-error">' + i18n('Menu.ShopAssist.DescWarning') + '</i> ' + i18n('Menu.ShopAssist.Desc'),
			red = true;

		if (shopAssist.storeId !== null) {
			red = false;
		}

		let btn = _menu.MakeButton('shopAssist', i18n('Menu.ShopAssist.Title'), desc, red);

		let btn_outpost = $('<span />').bind('click', function () {
			if (shopAssist.storeId !== null) {
				shopAssist.Show();
			}
		});

		return btn.append(btn_outpost);
	},

	/**
	 * Ally PopUp Button
	 *
	 * @returns {*|jQuery}
	 */
	allies_Btn: () => {

		let desc = i18n('Menu.Allies.Desc'), red = false;

		let btn = _menu.MakeButton('allies', i18n('Menu.Allies.Title'), desc, red);

		let btn_outpost = $('<span />').bind('click', function () {
			MainParser.Allies.showAllyList();
		});

		return btn.append(btn_outpost);
	},

	/**
	 * Product overview button
	 *
	 * @returns {*|jQuery}
	 */
	productions_Btn: () => {
		let pB = _menu.MakeButton('productions', i18n('Menu.Productions.Title'), i18n('Menu.Productions.Desc'));

		let btnSpan = $('<span />').on('click', function() {
			Productions.init();
		});

		return pB.append(btnSpan);
	},

	/**
	 * Azteken Minigame
	 *
	 * @returns {*|jQuery}
	 */
	minigame_aztecs_Btn: () => {
		let btn_Aztek = _menu.MakeButton('minigame_aztecs', i18n('Menu.AztecMiniGame.Title'), i18n('Menu.AztecMiniGame.Desc'), true);

		let btn_Azte = $('<span />').on('click', function () {
			if ($('#minigame_aztecs-Btn').hasClass('hud-btn-red') === false) {
				AztecsHelper.Show();
			}
		});

		return btn_Aztek.append(btn_Azte);
	},

	/**
	 * Outpost Button
	 *
	 * @returns {*|jQuery}
	 */
	productionsRating_Btn: () => {
		let btn_prodratBG = _menu.MakeButton('productionsRating', i18n('Menu.ProductionsRating.Title'), i18n('Menu.ProductionsRating.Desc'));

		let btn_prodrat = $('<span />').bind('click', function () {
			Productions.ShowRating();
		});

		return btn_prodratBG.append(btn_prodrat);
	},

	/**
	 * Negotiation
	 *
	 * @returns {*|jQuery}
	 */
	negotiation_Btn: () => {
		let btn_NegotiationBG = _menu.MakeButton(
			'negotiation',
			i18n('Menu.Negotiation.Title'),
			'<em id="negotiation-Btn-closed" class="tooltip-error">' + i18n('Menu.Negotiation.Warning') + '<br></em>' + i18n('Menu.Negotiation.Desc'),
			true
		);

		let btn_Negotiation = $('<span />').bind('click', function () {
			if ($('#negotiation-Btn').hasClass('hud-btn-red') === false) {
				Negotiation.Show();
			}
		});

		return btn_NegotiationBG.append(btn_Negotiation);
	},

	/**
	 * Profile
	 *
	 * @returns {*|jQuery}
	 */
	playerProfile_Btn: () => {
		let btn_playerProfileBG = _menu.MakeButton(
			'playerProfile',
			i18n('Menu.PlayerProfile.Title'),
			'<em id="PlayerProfile-Btn-closed" class="tooltip-error">' + i18n('Menu.PlayerProfile.Warning') + '<br></em>' + i18n('Menu.PlayerProfile.Desc'),
			true
		);

		let btn_playerProfile = $('<span />').bind('click', function () {
			if ($('#playerProfile-Btn').hasClass('hud-btn-red') === false) {
				Profile.show();
			}
		});

		btn_playerProfile.append('<img src="'+srcLinks.GetPortrait(ExtPlayerAvatar)+'" />');

		return btn_playerProfileBG.append(btn_playerProfile);
	},

	/**
	 * InfoBox für den Hintergrund "Verkehr"
	 *
	 * @returns {*|jQuery}
	 */
	infobox_Btn: () => {

		let btn_Info = _menu.MakeButton('infobox', i18n('Menu.Info.Title'), i18n('Menu.Info.Desc'));

		let btn_Inf = $('<span />').on('click', function () {
			Infoboard.Show();
		});

		return btn_Info.append(btn_Inf);
	},
	/**
	 * tracked GB nach Filterbedingung
	 *
	 * @returns {*|jQuery}
	 */
	
	findGB_Btn: () => {

		let btn_ = _menu.MakeButton('findGB', i18n('Boxes.findGB.Title'), i18n('Menu.findGB.Desc'));

		let btn = $('<span />').on('click', function () {
			findGB.ShowDialog();
		});

		return btn_.append(btn);
	},

	/**
	 * Technologien
	 *
	 * @returns {*|jQuery}
	 */
	technologies_Btn: () => {
		let btn_TechBG = _menu.MakeButton(
			'technologies',
			i18n('Menu.Technologies.Title'),
			//'<em id="technologies-Btn-closed" class="tooltip-error">' + i18n('Menu.Technologies.Warning') + '<br></em>' + 
			i18n('Menu.Technologies.Desc'),
			//true
		);

		let btn_Tech = $('<span />').on('click', function () {
			if (Technologies.AllTechnologies !== null) {
				Technologies.Show();
			}
		});

		return btn_TechBG.append(btn_Tech);
	},

	/**
	 * KampanienMap
	 *
	 * @returns {*|jQuery}
	 */
	campagneMap_Btn: () => {
		let btn_MapBG = _menu.MakeButton(
			'campagneMap',
			i18n('Menu.Campagne.Title'),
			'<em id="campagneMap-Btn-closed" class="tooltip-error">' + i18n('Menu.Campagne.Warning') + '<br></em>' + i18n('Menu.Campagne.Desc'),
			true
		);

		let btn_Map = $('<span />').on('click', function () {
			if (KampagneMap.Provinces !== null) {
				KampagneMap.Show();
			}
		});

		return btn_MapBG.append(btn_Map);
	},

	/**
	 * citymap
	 *
	 * @returns {*|jQuery}
	 */
	cityMap_Btn: () => {
		let btn_CityBG = _menu.MakeButton('cityMap', i18n('Menu.Citymap.Title'), i18n('Menu.Citymap.Desc'));

		let btn_City = $('<span />').on('click', function () {
			CityMap.init(false);
		});

		return btn_CityBG.append(btn_City);
	},

	/**
	 * citymap
	 *
	 * @returns {*|jQuery}
	 */
	qiMap_Btn: () => {
		let btn_QIMapBG = _menu.MakeButton('qiMap', i18n('Menu.QIMap.Title'), i18n('Menu.QIMap.Desc'), true);

		let btn_QIMap = $('<span />').on('click', function () {
			if (Object.keys(QIMap.CurrentMapData).length > 0) 
				QIMap.showBox()
			
		});

		return btn_QIMapBG.append(btn_QIMap);
	},

	/**
	 * Events in the city and the surrounding area
	 *
	 * @returns {null|undefined|jQuery}
	 */
	hiddenRewards_Btn: () => {
		let btn_RewardsBG = _menu.MakeButton('hiddenRewards', i18n('Menu.HiddenRewards.Title'), i18n('Menu.HiddenRewards.Desc'));

		let btn_Rewards = $('<span />').on('click', function () {
			HiddenRewards.init();
		})

		return btn_RewardsBG.append(btn_Rewards, $('<span id="hidden-reward-count" class="hud-counter">0</span>'));
	},

	recurringQuests_Btn: () => {
		let btn_RewardsBG = _menu.MakeButton('recurringQuests', i18n('Menu.recurringQuests.Title'), i18n('Menu.recurringQuests.Desc'));

		let btn_Rewards = $('<span />').on('click', function () {
			Recurring.init();
		})

		return btn_RewardsBG.append(btn_Rewards, $(`<span id="recurring-count" class="hud-counter" style="${!Recurring.data.count || !Recurring.data.showCounter?"display:none;":""}">${Recurring.data.count || 0}</span>`));
	},

	/**
	 * Notice function
	 *
	 * @returns {null|undefined|jQuery|HTMLElement|void}
	 */
	notice_Btn: () => {
		let btn_NoticeBG = _menu.MakeButton('notice', i18n('Menu.Notice.Title'), i18n('Menu.Notice.Desc'));

		let btn_Notice = $('<span />').on('click', function () {
			Notice.init();
		});

		return btn_NoticeBG.append(btn_Notice);
	},

	/**
	 * Settings
	 *
	 */
	settings_Btn: () => {

		let btn = _menu.MakeButton('settings', i18n('Menu.Settings.Title'), i18n('Menu.Settings.Desc'));

		let btn_Set = $('<span />').on('click', function () {
			Settings.BuildBox();
		});

		return btn.append(btn_Set);
	},

	/**
	 * Statistic
	 * @returns {*|jQuery}
	 */
	stats_Btn: () => {
		let btn_StatsBG = _menu.MakeButton('stats', i18n('Menu.Stats.Title'), i18n('Menu.Stats.Desc'));

		let btn_Stats = $('<span />').on('click', function() {
			Stats.page = 1;
			Stats.filterByPlayerId = null;
			Stats.Show(false);
		});

		return btn_StatsBG.append(btn_Stats);
	},

	/**
	 * Set Übersicht
	 */
	kits_Btn: ()=> {

		let btn = _menu.MakeButton('kits', i18n('Menu.Kits.Title'), i18n('Menu.Kits.Desc'));

		let btn_sp = $('<span />').on('click', function(){
			Kits.init();
		});

		return btn.append(btn_sp);
	},

	/**
	 * FP Produzierende LGs
	 */
	greatBuildings_Btn: () => {

		let btn = _menu.MakeButton('greatBuildings', i18n('Menu.greatbuildings.Title'), i18n('Menu.greatbuildings.Desc'));

		let btn_sp = $('<span />').on('click', function () {
			GreatBuildings.Show();
		});

		return btn.append(btn_sp);
	},

	/**
	 * Marktplatz Filter
	 */
	market_Btn: () => {
		let btn = _menu.MakeButton(
			'market',
			i18n('Menu.Market.Title'),
			'<em id="market-Btn-closed" class="tooltip-error">' + i18n('Menu.Market.Warning') + '<br></em>' + i18n('Menu.Market.Desc'),
			true
		);

		let btn_Market = $('<span />').bind('click', function () {
			if ($('#market-Btn').hasClass('hud-btn-red') === false) {
				Market.Show(false);
			}
		});

		return btn.append(btn_Market);
	},

	/**
	 * Helper Blue Galaxy
	 */
	blueGalaxy_Btn: () => {
		let OwnGalaxy = Object.values(MainParser.CityMapData).find(obj => (obj['cityentity_id'] === 'X_OceanicFuture_Landmark3'));;

		// no BG => display none
		if (!OwnGalaxy) {
			let index = _menu.Items.indexOf('bluegalaxy');
			delete _menu.Items[index];
			return;
		}

		let btn = _menu.MakeButton('blueGalaxy', i18n('Menu.Bluegalaxy.Title'), i18n('Menu.Bluegalaxy.Desc'));

		let btn_sp = $('<span />').on('click', function () {
			BlueGalaxy.Show();
		});

		return btn.append(btn_sp, $('<span id="hidden-blue-galaxy-count" class="hud-counter">0</span>'));
	},
	
	/**
	 * Moppelassistent
	 * */
	moppelHelper_Btn: () => {
		// active?
		if(!Settings.GetSetting('ShowPlayersMotivation')){
			return;
		}

		let btn = _menu.MakeButton('moppelHelper', i18n('Menu.Moppelhelper.Title'), i18n('Menu.Moppelhelper.Desc'));

		let btn_sp = $('<span />').on('click', function () {
			EventHandler.ShowMoppelHelper();
		});

		return btn.append(btn_sp);
    },

	/**
	 * FP Collector box
	 */
	fpCollector_Btn: () => {
		let btn = _menu.MakeButton('fpCollector', i18n('Menu.fpCollector.Title'), i18n('Menu.fpCollector.Desc'));

		let btn_sp = $('<span />').on('click', function () {
			FPCollector.ShowFPCollectorBox();
		});

		return btn.append(btn_sp);
	},

	/**
	 * Shows the box for managing all alerts
	 *
	 * @returns {*|jQuery}
	 */
	alerts_Btn: () => {
		let btn = _menu.MakeButton('alerts', i18n('Menu.Alerts.Title'), i18n('Menu.Alerts.Desc'));

		let btn_sp = $('<span />').on('click', function () {
			Alerts.show();
		});

		return btn.append(btn_sp);
	},

	/**
	 * Guildfight Overview
	 * 	
	 * @returns {*|jQuery}
	 * */
	gildFight_Btn: () => {
		let btn = _menu.MakeButton(
			'gildFight',
				i18n('Menu.Gildfight.Title'),
				i18n('Menu.Gildfight.Warning') + i18n('Menu.Gildfight.Desc'),
			 	true
			);

		let btn_sp = $('<span />').on('click', function (){
			if(GuildFights.MapData) {
				GuildFights.ShowGuildBox();
			}
		});

		return btn.append(btn_sp);
	},

	/**
	 * InfoBox für Investitions Historie
	 *
	 * @returns {*|jQuery}
	 */
	investment_Btn: () => {

		let btn = _menu.MakeButton('investment', i18n('Menu.Investment.Title'), i18n('Menu.Investment.Desc'));

		let btn_sp = $('<span />').on('click', function () {
			Investment.BuildBox(false);
		});

		return btn.append(btn_sp);
	},

	/**
	 * Guild member statistic
	 */
	guildMemberstat_Btn: () => {
		let btn = _menu.MakeButton(
			'guildMemberstat',
			i18n('Menu.GuildMemberStat.Title'),
			'<em id="guildmemberstat-Btn-closed" class="tooltip-error">' + i18n('Menu.GuildMemberStat.Warning') + '<br></em>' + i18n('Menu.GuildMemberStat.Desc'),
			true
		);

		let btn_sp = $('<span />').bind('click', function () {
			if ($('#guildmemberstat-Btn').hasClass('hud-btn-red') === false) {
				GuildMemberStat.BuildBox(false);
			}
		});

		return btn.append(btn_sp);
	},

	/**
	 * GEX statistic
	 */
	gexStat_Btn: () => {
		let btn = _menu.MakeButton('gexStat', i18n('Menu.GexStat.Title'), i18n('Menu.GexStat.Desc'));

		let btn_sp = $('<span />').bind('click', function () {
			if ($('#gexstat-Btn').hasClass('hud-btn-red') === false) {
				GexStat.BuildBox(false);
			}
		});
		return btn.append(btn_sp, $(`<span id="gex-attempt-count" class="hud-counter">${GExAttempts.count||0}</span>`)).ready(GExAttempts.refreshGUI);
	},

	/**
	 * Castle System
	 */
	castle_Btn: () => {
		let btn = _menu.MakeButton('castle', i18n('Menu.Castle.Title'), i18n('Menu.Castle.Desc'));

		let btn_sp = $('<span />').bind('click', function () {
			if ($('#castle-Btn').hasClass('hud-btn-red') === false) {
				Castle.BuildBox();
			}
		});

		return btn.append(btn_sp);
	},

	/**
	 * Compare friends and threads
	 */
	compare_friends_threads_Btn: () => {
		let btn = _menu.MakeButton('compare_friends_threads', i18n('Menu.CompareFriendsThreads.Title'), i18n('Menu.CompareFriendsThreads.Desc'));

		let btn_sp = $('<span />').bind('click', function () {
			CompareFriendsThreads.BuildBody();
		});

		return btn.append(btn_sp);
	},

	/**
	 * Discord Webhooks
	 */
	discord_Btn: () => {
		let btn = _menu.MakeButton('discord', i18n('Menu.Discord.Title'), i18n('Menu.Discord.Desc'));

		let btn_sp = $('<span />').bind('click', function () {
			Discord.BuildBox();
		});

		return btn.append(btn_sp);
	},

	music_Btn: () => {
		let btn = _menu.MakeButton('music', i18n('Menu.Music.Title'), i18n('Menu.Music.Desc'));

		let btn_sp = $('<span />').bind('click', function () {
			if ($('#betterMusicDialog').length > 0) {
				betterMusic.CloseBox();
			} else {
				betterMusic.ShowDialog();
			}		

		});

		return btn.append(btn_sp);
	},

	musicControl_Btn: () => {
		let btn = _menu.MakeButton('musicControl', i18n('Menu.MusicControl.Title'), i18n('Menu.MusicControl.Desc'));

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

		return btn.append(btn_sp);
	},
};
