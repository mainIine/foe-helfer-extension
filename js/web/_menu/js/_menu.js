/*
 * **************************************************************************************
 *
 * Dateiname:                 _menu.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 13:49 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let _menu = {

	isBottom: false,
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
		'chat',
		'kits',
		'greatbuildings',
		'market',
		'bluegalaxy',
		'moppelhelper',
		'fpCollector',
		'gildfight',
		'investment',
		'alerts'
		// 'unitsGex',
		// 'guildmemberstats'
	],


	/**
	 * Create the div holders and put them to the DOM
	 *
	 * @param selMenu
	 * @constructor
	 */
	CallSelectedMenu: (selMenu = 'BottomBar') => {
		if (selMenu === 'BottomBar') {
			_menu_bottom.BuildOverlayMenu();
		}
		else if (selMenu === 'RightBar') {
			_menu_right.BuildOverlayMenu();
		}
		else if (selMenu === 'Box') {
			_menu_box.BuildBoxMenu();
        }

		if(Settings.GetSetting('AutoOpenInfoBox')){
			Infoboard.Show();
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
	 * @param {string} title
	 * @param {string} desc
	 * @param {string} id
	 */
	toolTippBox: (title, desc, id) => {

		let ToolTipp = $('<div />').addClass('toolTipWrapper').html(desc).attr('data-btn', id);

		ToolTipp.prepend($('<div />').addClass('toolTipHeader').text(title));

		$('body').append(ToolTipp);
	},


	/**
	* Integrates all required buttons
	*/
	ListLinks: (InsertMenuFunction) => {
		let StorgedItems = localStorage.getItem('MenuSort');

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

			// es gibt tatsächlich was neues...
			if (items.length > 0) {
				for (let i in items) {
					if (!items.hasOwnProperty(i)) {
						break;
					}

					// ... neues kommt vorne dran ;-)
					_menu.Items.unshift(items[i]);
				}
			}
		}

		// Beta-Funktionen rausfiltern
		_menu.Items = _menu.Items.filter(e => {
			if (HelperBeta.active) return true;
			if (HelperBeta.menu.includes(e)) return false;
			return true;
		});

		// Dubletten rausfiltern
		function unique(arr) {
			return arr.filter(function (value, index, self) {
				return self.indexOf(value) === index;
			});
		}

		_menu.Items = unique(_menu.Items);

		// Menüpunkte einbinden
		for (let i in _menu.Items) {
			if (!_menu.Items.hasOwnProperty(i)) {
				break;
			}

			const name = _menu.Items[i] + '_Btn';

			// gibt es eine Funktion?
			if (_menu[name] !== undefined) {
				let MenuItem = _menu[name]();
				InsertMenuFunction(MenuItem);
			}
		}

		_menu.Items = _menu.Items.filter(e => e);
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

	/**
	 * Kostenrechner Button
	 *
	 * @returns {*|jQuery}
	 */
	calculator_Btn: () => {
		let btn_CalcBG = $('<div />').attr({ 'id': 'calculator-Btn', 'data-slug': 'calculator' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Calculator.Title'), '<em id="calculator-Btn-closed" class="tooltip-error">' + i18n('Menu.Calculator.Warning') + '<br></em>' + i18n('Menu.Calculator.Desc'), 'calculator-Btn');

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
	 * Eigenanteilsrechner Button
	 *
	 * @returns {*|jQuery}
	 */
	partCalc_Btn: () => {
		let btn_OwnBG = $('<div />').attr({ 'id': 'partCalc-Btn', 'data-slug': 'partCalc' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.OwnpartCalculator.Title'), '<em id="partCalc-Btn-closed" class="tooltip-error">' + i18n('Menu.OwnpartCalculator.Warning') + '<br></em>' + i18n('Menu.OwnpartCalculator.Desc'), 'partCalc-Btn');

		let btn_Own = $('<span />');

		btn_Own.on('click', function () {
			// nur wenn es für diese Session ein LG gibt zünden
			if (Parts.CityMapEntity !== undefined && Parts.Rankings !== undefined) {
				Parts.buildBox();
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
		_menu.toolTippBox(i18n('Menu.OutP.Title'), desc, 'outpost-Btn');

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
	 * FP Gesamtanzahl Button
	 *
	 * @returns {*|jQuery}
	 */
	productions_Btn: () => {
		let btn_FPsBG = $('<div />').attr({ 'id': 'productions-Btn', 'data-slug': 'productions' }).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Productions.Title'), i18n('Menu.Productions.Desc'), 'productions-Btn');


		let btn_FPs = $('<span />');

		btn_FPs.bind('click', function () {
			Productions.init();
		});

		btn_FPsBG.append(btn_FPs);

		return btn_FPsBG;
	},

	/**
	 * Negotiation
	 *
	 * @returns {*|jQuery}
	 */
	negotiation_Btn: () => {
		let btn_NegotiationBG = $('<div />').attr({ 'id': 'negotiation-Btn', 'data-slug': 'negotiation' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Negotiation.Title'), '<em id="negotiation-Btn-closed" class="tooltip-error">' + i18n('Menu.Negotiation.Warning') + '<br></em>' + i18n('Menu.Negotiation.Desc'), 'negotiation-Btn');

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
		_menu.toolTippBox(i18n('Menu.Info.Title'), i18n('Menu.Info.Desc'), 'infobox-Btn');

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

		_menu.toolTippBox(i18n('Menu.Technologies.Title'), '<em id="technologies-Btn-closed" class="tooltip-error">' + i18n('Menu.Technologies.Warning') + '<br></em>' + i18n('Menu.Technologies.Desc'), 'technologies-Btn');

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
		_menu.toolTippBox(i18n('Menu.Campagne.Title'), '<em id="campagneMap-Btn-closed" class="tooltip-error">' + i18n('Menu.Campagne.Warning') + '<br></em>' + i18n('Menu.Campagne.Desc'), 'campagneMap-Btn');

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
		_menu.toolTippBox(i18n('Menu.Citymap.Title'), i18n('Menu.Citymap.Desc'), 'citymap-Btn');

		let btn_City = $('<span />');

		btn_City.on('click', function () {
			if (LastMapPlayerID === ExtPlayerID) {
				CityMap.init();
			}
			else {
				let Player = PlayerDict[LastMapPlayerID];
				let PlayerName = (Player ? Player['PlayerName'] : '???');
				CityMap.init(MainParser.OtherPlayerCityMapData, PlayerName);
            }
		});

		btn_CityBG.append(btn_City);

		return btn_CityBG;
	},

	/**
	 * Evente in der Stadt und der Umgebung
	 *
	 * @returns {null|undefined|jQuery}
	 */
	hiddenRewards_Btn: () => {
		let btn_RewardsBG = $('<div />').attr({ 'id': 'hiddenRewards-Btn', 'data-slug': 'hiddenRewards' }).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.HiddenRewards.Title'), i18n('Menu.HiddenRewards.Desc'), 'hiddenRewards-Btn');

		let btn_Rewards = $('<span />');

		btn_Rewards.on('click', function () {
			HiddenRewards.init();
		})

		btn_RewardsBG.append(btn_Rewards, $('<span id="hidden-reward-count" class="hud-counter">0</span>'));

		return btn_RewardsBG;
	},

	/**
	 * Armeen
	 * @returns {*|jQuery}
	 */
	unit_Btn: () => {
		let btn_UnitBG = $('<div />').attr({ 'id': 'unit-Btn', 'data-slug': 'unit' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Unit.Title'), '<em id="unit-Btn-closed" class="tooltip-error">' + i18n('Menu.Unit.Warning') + '<br></em>' + i18n('Menu.Unit.Desc'), 'unit-Btn');

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

		_menu.toolTippBox(i18n('Menu.Notice.Title'), i18n('Menu.Notice.Desc'), 'notice-Btn');

		let btn_Notice = $('<span />');

		btn_Notice.on('click', function () {
			Notice.init();
		});

		btn_NoticeBG.append(btn_Notice);

		return btn_NoticeBG;
	},

	/**
	 * Einstellungen
	 *
	 */
	settings_Btn: () => {

		let btn = $('<div />').attr({ 'id': 'settings-Btn', 'data-slug': 'settings' }).addClass('hud-btn');

		_menu.toolTippBox(i18n('Menu.Settings.Title'), i18n('Menu.Settings.Desc'), 'settings-Btn');

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

		_menu.toolTippBox(i18n('Menu.Stats.Title'), i18n('Menu.Stats.Desc'), 'stats-Btn');

		let btn_Stats = $('<span />');

		btn_Stats.on('click', function () {
			Stats.page = 1;
			Stats.filterByPlayerId = null;
			Stats.Show();
		});

		btn_StatsBG.append(btn_Stats);

		return btn_StatsBG;
	},

	/**
	 * Chat Button
	 *
	 * @returns {*|jQuery}
	 */
	chat_Btn: () => {

		let btn = $('<div />').attr({ 'id': 'chat-Btn', 'data-slug': 'chat' }).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Chat.Title'), i18n('Menu.Chat.Desc'), 'chat-Btn');

		let btn_sp = $('<span />');

		btn_sp.on('click', function () {
			MainParser.sendExtMessage({
				type: 'chat',
				player: ExtPlayerID,
				name: ExtPlayerName,
				guild: ExtGuildID,
				world: ExtWorld,
				lang: MainParser.Language
			});
		});

		btn.append(btn_sp);

		return btn;
	},

	/**
	 * Set Übersicht
	 */
	kits_Btn: ()=> {

		let btn = $('<div />').attr({ 'id': 'kits-Btn', 'data-slug': 'kits' }).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Kits.Title'), i18n('Menu.Kits.Desc'), 'kits-Btn');

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
		_menu.toolTippBox(i18n('Menu.greatbuildings.Title'), i18n('Menu.greatbuildings.Desc'), 'greatbuildings-Btn');

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
		let btn_MarketBG = $('<div />').attr({ 'id': 'market-Btn', 'data-slug': 'market' }).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Market.Title'), '<em id="market-Btn-closed" class="tooltip-error">' + i18n('Menu.Market.Warning') + '<br></em>' + i18n('Menu.Market.Desc'), 'market-Btn');

		let btn_Market = $('<span />');

		btn_Market.bind('click', function () {
			if ($('#market-Btn').hasClass('hud-btn-red') === false) {
				Market.Show();
			}
		});

		btn_MarketBG.append(btn_Market);

		return btn_MarketBG;
	},

	/**
	 * Helfer Blaue Galaxie
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
		_menu.toolTippBox(i18n('Menu.Bluegalaxy.Title'), i18n('Menu.Bluegalaxy.Desc'), 'bluegalaxy-Btn');

		let btn_sp = $('<span />');

		btn_sp.on('click', function () {
			BlueGalaxy.Show();
		});

		btn.append(btn_sp);

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
		_menu.toolTippBox(i18n('Menu.Moppelhelper.Title'), i18n('Menu.Moppelhelper.Desc'), 'moppelhelper-Btn');

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
		_menu.toolTippBox(i18n('Menu.fpCollector.Title'), i18n('Menu.fpCollector.Desc'), 'fpCollector-Btn');

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
		_menu.toolTippBox(i18n('Menu.Alerts.Title'), i18n('Menu.Alerts.Desc'), 'Alerts-Btn');

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
		_menu.toolTippBox(i18n('Menu.unitsGex.Title'), i18n('Menu.unitsGex.Desc'), 'unitsGex-Btn');

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

		let btn_BG = $('<div />').attr({ 'id': 'gildfight-Btn', 'data-slug': 'gildfight' }).addClass('hud-btn hud-btn-red'),
			desc = i18n('Menu.Gildfight.Warning') + i18n('Menu.Gildfight.Desc');

		_menu.toolTippBox(i18n('Menu.Gildfight.Title'), desc , 'gildfight-Btn');

		let btn = $('<span />');

		btn.on('click', function (){
			if(GildFights.MapData) {
				GildFights.ShowGildBox();
			}
		});

		btn_BG.append(btn);

		return btn_BG;
	},


	/**
	 * InfoBox für Investitions Historie
	 *
	 * @returns {*|jQuery}
	 */
	investment_Btn: () => {

		let btn_InvestH = $('<div />').attr({
			'id': 'investment-Btn',
			'data-slug': 'investment'
		}).addClass('hud-btn');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.Investment.Title'), i18n('Menu.Investment.Desc'), 'investment-Btn');

		let btn_Investment = $('<span />');

		btn_Investment.on('click', function () {
			Investment.BuildBox(false);
		});

		btn_InvestH.append(btn_Investment);

		return btn_InvestH;
	},


	/**
	 * Guild member statistic
	 */
	guildmemberstat_Btn: () => {
		let btn_GuildMemberBG = $('<div />').attr({
			'id': 'guildmemberstat-Btn',
			'data-slug': 'guildmemberstat'
		}).addClass('hud-btn hud-btn-red');

		// Tooltip einbinden
		_menu.toolTippBox(i18n('Menu.GuildMemberStat.Title'), '<em id="guildmemberstat-Btn-closed" class="tooltip-error">' + i18n('Menu.GuildMemberStat.Warning') + '<br></em>' + i18n('Menu.GuildMemberStat.Desc'), 'guildmemberstat-Btn');

		let btn_GuildMember = $('<span />');

		btn_GuildMember.bind('click', function () {
			if ($('#guildmemberstat-Btn').hasClass('hud-btn-red') === false) {
				GuildMemberStat.BuildBox(false);
			}
		});

		btn_GuildMemberBG.append(btn_GuildMember);

		return btn_GuildMemberBG;
	}
};
