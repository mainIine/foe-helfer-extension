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
	 */
	ToggleItemVisibility: (name) => {
		if(_menu.HiddenItems.includes(name)) {
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
	 */
	equalTo: (storedItems) => {
		for (let i = 0; i < storedItems.length; i++) {
			// Es hat sich etwas an der Sortierung verändert
			if (storedItems[i] !== _menu.Items[i]) return false;
		}

		return true;
	},


	MakeButton: (slug, red = false)=> {
		let btnData = _menu.ItemsData.find(x => x.id === slug);
		let btn = _menu.toolTipp(
			$('<div />').attr({
				id: `${slug}-Btn`,
				'data-slug': slug
			}).addClass('hud-btn'),
			btnData?.title,
			(btnData?.warning||"") + btnData?.description,
			`${slug}-btn`
		);

		if (red) 
			btn.addClass('hud-btn-red');

		return btn;
	},

	/*----------------------------------------------------------------------------------------------------------------*/
	
	ItemsData: [
		{ id: 'calculator', title: i18n('Menu.Calculator.Title'), description: i18n('Menu.Calculator.Desc'), warning: '<em id="calculator-Btn-closed" class="tooltip-error">' + i18n('Menu.Calculator.Warning') + '<br></em>'},
		{ id: 'partCalc', title: i18n('Menu.OwnpartCalculator.Title'), description: i18n('Menu.OwnpartCalculator.Desc'), warning: '<em id="partCalc-Btn-closed" class="tooltip-error">' + i18n('Menu.OwnpartCalculator.Warning') + '<br></em>'},
		{ id: 'unit', title: i18n('Menu.Unit.Title'), description: i18n('Menu.Unit.Desc'), warning: '<em id="unit-Btn-closed" class="tooltip-error">' + i18n('Menu.Unit.Warning') + '<br></em>'},
		{ id: 'outpost', title: i18n('Menu.OutP.Title'), description: i18n('Menu.OutP.Desc'), warning: i18n('Menu.OutP.DescWarningOutpostData') },
		{ id: 'shopAssist', title: i18n('Menu.ShopAssist.Title'), description: i18n('Menu.ShopAssist.Desc'), warning: '<i id="shopAssist-Btn-closed" class="tooltip-error">' + i18n('Menu.ShopAssist.DescWarning') + '</i>' },
		{ id: 'productionsRating', title: i18n('Menu.ProductionsRating.Title'), description: i18n('Menu.ProductionsRating.Desc') },
		{ id: 'negotiation', title: i18n('Menu.Negotiation.Title'), description: i18n('Menu.Negotiation.Desc'), warning: '<em id="negotiation-Btn-closed" class="tooltip-error">' + i18n('Menu.Negotiation.Warning') + '<br></em>' },
		{ id: 'playerProfile', title: i18n('Menu.PlayerProfile.Title'), description: i18n('Menu.PlayerProfile.Desc'), warning: '<em id="PlayerProfile-Btn-closed" class="tooltip-error">' + i18n('Menu.PlayerProfile.Warning') + '<br></em>' },
		{ id: 'campagneMap', title: i18n('Menu.Campagne.Title'), description: i18n('Menu.Campagne.Desc'), warning: '<em id="campagneMap-Btn-closed" class="tooltip-error">' + i18n('Menu.Campagne.Warning') + '<br></em>' },
		{ id: 'guildMemberstat', title: i18n('Menu.GuildMemberStat.Title'), description: i18n('Menu.GuildMemberStat.Desc'), warning: '<em id="guildmemberstat-Btn-closed" class="tooltip-error">' + i18n('Menu.GuildMemberStat.Warning') + '<br></em>' },
		{ id: 'gildFight', title: i18n('Menu.Gildfight.Title'), description: i18n('Menu.Gildfight.Desc'), warning: i18n('Menu.Gildfight.Warning') },
		{ id: 'market', title: i18n('Menu.Market.Title'), description: i18n('Menu.Market.Desc'), warning: '<em id="market-Btn-closed" class="tooltip-error">' + i18n('Menu.Market.Warning') + '<br></em>' },
		{ id: 'allies', title: i18n('Menu.Allies.Title'), description: i18n('Menu.Allies.Desc') },
		{ id: 'productions', title: i18n('Menu.Productions.Title'), description: i18n('Menu.Productions.Desc') },
		{ id: 'minigame_aztecs', title: i18n('Menu.AztecMiniGame.Title'), description: i18n('Menu.AztecMiniGame.Desc') },
		{ id: 'infobox', title: i18n('Menu.Info.Title'), description: i18n('Menu.Info.Desc') },
		{ id: 'findGB', title: i18n('Boxes.findGB.Title'), description: i18n('Menu.findGB.Desc') },
		{ id: 'technologies', title: i18n('Menu.Technologies.Title'), description: i18n('Menu.Technologies.Desc') },
		{ id: 'musicControl', title: i18n('Menu.MusicControl.Title'), description: i18n('Menu.MusicControl.Desc') },
		{ id: 'music', title: i18n('Menu.Music.Title'), description: i18n('Menu.Music.Desc') },
		{ id: 'discord', title: i18n('Menu.Discord.Title'), description: i18n('Menu.Discord.Desc') },
		{ id: 'compare_friends_threads', title: i18n('Menu.CompareFriendsThreads.Title'), description: i18n('Menu.CompareFriendsThreads.Desc') },
		{ id: 'castle', title: i18n('Menu.Castle.Title'), description: i18n('Menu.Castle.Desc') },
		{ id: 'gexStat', title: i18n('Menu.GexStat.Title'), description: i18n('Menu.GexStat.Desc') },
		{ id: 'investment', title: i18n('Menu.Investment.Title'), description: i18n('Menu.Investment.Desc') },
		{ id: 'alerts', title: i18n('Menu.Alerts.Title'), description: i18n('Menu.Alerts.Desc') },
		{ id: 'fpCollector', title: i18n('Menu.fpCollector.Title'), description: i18n('Menu.fpCollector.Desc') },
		{ id: 'moppelHelper', title: i18n('Menu.Moppelhelper.Title'), description: i18n('Menu.Moppelhelper.Desc') },
		{ id: 'blueGalaxy', title: i18n('Menu.Bluegalaxy.Title'), description: i18n('Menu.Bluegalaxy.Desc') },
		{ id: 'greatBuildings', title: i18n('Menu.greatbuildings.Title'), description: i18n('Menu.greatbuildings.Desc') },
		{ id: 'kits', title: i18n('Menu.Kits.Title'), description: i18n('Menu.Kits.Desc') },
		{ id: 'stats', title: i18n('Menu.Stats.Title'), description: i18n('Menu.Stats.Desc') },
		{ id: 'settings', title: i18n('Menu.Settings.Title'), description: i18n('Menu.Settings.Desc') },
		{ id: 'notice', title: i18n('Menu.Notice.Title'), description: i18n('Menu.Notice.Desc') },
		{ id: 'recurringQuests', title: i18n('Menu.recurringQuests.Title'), description: i18n('Menu.recurringQuests.Desc') },
		{ id: 'hiddenRewards', title: i18n('Menu.HiddenRewards.Title'), description: i18n('Menu.HiddenRewards.Desc') },
		{ id: 'cityMap', title: i18n('Menu.Citymap.Title'), description: i18n('Menu.Citymap.Desc') },
	],

	/**
	 * Armies
	 */
	unit_Btn: () => {
		let btn = _menu.MakeButton('unit',true);
		let btnEl = $('<span />');

		btnEl.on('click', function () {
			if (Unit.Cache !== null) {
				Unit.Show();
			}
		});

		return btn.append(btnEl);
	},

	/**
	 * Cost calculator button
	 */
	calculator_Btn: () => {
		let btn = _menu.MakeButton('calculator',true);

		let btnEl = $('<span />').bind('click', function () {
			if (Calculator.CityMapEntity) {
				Calculator.Show('menu');
			}
		});

		btn.append(btnEl);

		return btn;
	},

	/**
	 * Own contribution calculator button
	 */
	partCalc_Btn: () => {
		let btn = _menu.MakeButton('partCalc',true);

		let btn_Own = $('<span />').on('click', function () {
			Parts.Show();
		});

		btn.append(btn_Own);

		return btn;
	},

	/**
	 * Outpost Button
	 */
	outpost_Btn: () => {
		let red = false;
		if (Outposts.OutpostData === null || localStorage.getItem('OutpostBuildings') === null) 
			red = true;

		let btn = _menu.MakeButton('outpost', red);

		let btnEl = $('<span />').bind('click', function () {
			let OutpostBuildings = localStorage.getItem('OutpostBuildings');

			if (OutpostBuildings !== null) {
				Outposts.BuildInfoBox();
			}
		});

		return btn.append(btnEl);
	},

	/**
	 * Shop Assistant Button
	 */
	shopAssist_Btn: () => {
		let red = true;
		if (shopAssist.storeId !== null) 
			red = false;

		let btn = _menu.MakeButton('shopAssist', red);

		let btnEl = $('<span />').bind('click', function () {
			if (shopAssist.storeId !== null) {
				shopAssist.Show();
			}
		});

		return btn.append(btnEl);
	},

	/**
	 * Ally PopUp Button
	 */
	allies_Btn: () => {
		let btn = _menu.MakeButton('allies');

		let btnEl = $('<span />').bind('click', function () {
			MainParser.Allies.showAllyList(true);
		});

		return btn.append(btnEl);
	},

	/**
	 * Product overview button
	 */
	productions_Btn: () => {
		let pB = _menu.MakeButton('productions');

		let btnSpan = $('<span />').on('click', function() {
			Productions.init();
		});

		return pB.append(btnSpan);
	},

	/**
	 * Aztec Minigame
	 */
	minigame_aztecs_Btn: () => {
		let btn = _menu.MakeButton('minigame_aztecs');

		let btnEl = $('<span />').on('click', function () {
			if ($('#minigame_aztecs-Btn').hasClass('hud-btn-red') === false) {
				AztecsHelper.Show();
			}
		});

		return btn.append(btnEl);
	},

	/**
	 * Efficiency Button
	 */
	productionsRating_Btn: () => {
		let btn_prodratBG = _menu.MakeButton('productionsRating');

		let btn_prodrat = $('<span />').bind('click', function () {
			Productions.ShowRating();
		});

		return btn_prodratBG.append(btn_prodrat);
	},

	/**
	 * Negotiation
	 */
	negotiation_Btn: () => {
		let btn = _menu.MakeButton('negotiation',true);

		let btn_Negotiation = $('<span />').bind('click', function () {
			if ($('#negotiation-Btn').hasClass('hud-btn-red') === false) {
				Negotiation.Show();
			}
		});

		return btn.append(btn_Negotiation);
	},

	/**
	 * Profile
	 */
	playerProfile_Btn: () => {
		let btn_playerProfileBG = _menu.MakeButton('playerProfile',true);

		let btn_playerProfile = $('<span />').bind('click', function () {
			if ($('#playerProfile-Btn').hasClass('hud-btn-red') === false) {
				Profile.show();
			}
		});

		btn_playerProfile.append('<img src="'+srcLinks.GetPortrait(ExtPlayerAvatar)+'" />');

		return btn_playerProfileBG.append(btn_playerProfile);
	},

	/**
	 * InfoBox 
	 */
	infobox_Btn: () => {
		let btn = _menu.MakeButton('infobox');

		let btn_Inf = $('<span />').on('click', function () {
			Infoboard.Show();
		});

		return btn.append(btn_Inf);
	},

	/**
	 * tracked GB nach Filterbedingung
	 */
	findGB_Btn: () => {
		let btn_ = _menu.MakeButton('findGB');

		let btn = $('<span />').on('click', function () {
			findGB.ShowDialog();
		});

		return btn_.append(btn);
	},

	/**
	 * Technologien
	 */
	technologies_Btn: () => {
		let btn_TechBG = _menu.MakeButton('technologies');

		let btn_Tech = $('<span />').on('click', function () {
			if (Technologies.AllTechnologies !== null) {
				Technologies.Show();
			}
		});

		return btn_TechBG.append(btn_Tech);
	},

	/**
	 * KampanienMap
	 */
	campagneMap_Btn: () => {
		let btn_MapBG = _menu.MakeButton('campagneMap',true);

		let btn_Map = $('<span />').on('click', function () {
			if (KampagneMap.Provinces !== null) {
				KampagneMap.Show();
			}
		});

		return btn_MapBG.append(btn_Map);
	},

	/**
	 * citymap
	 */
	cityMap_Btn: () => {
		let btn_CityBG = _menu.MakeButton('cityMap');

		let btn_City = $('<span />').on('click', function () {
			CityMap.init(false);
		});

		return btn_CityBG.append(btn_City);
	},

	/**
	 * Events in the city and the surrounding area
	 */
	hiddenRewards_Btn: () => {
		let btn_RewardsBG = _menu.MakeButton('hiddenRewards');

		let btn_Rewards = $('<span />').on('click', function () {
			HiddenRewards.init();
		})

		return btn_RewardsBG.append(btn_Rewards, $('<span id="hidden-reward-count" class="hud-counter">0</span>'));
	},

	recurringQuests_Btn: () => {
		let btn = _menu.MakeButton('recurringQuests');

		let btn_Rewards = $('<span />').on('click', function () {
			Recurring.init();
		})

		return btn.append(btn_Rewards, $(`<span id="recurring-count" class="hud-counter" style="${!Recurring.data.count || !Recurring.data.showCounter?"display:none;":""}">${Recurring.data.count || 0}</span>`));
	},

	/**
	 * Note function
	 */
	notice_Btn: () => {
		let btn = _menu.MakeButton('notice');

		let btn_Notice = $('<span />').on('click', function () {
			Notice.init();
		});

		return btn.append(btn_Notice);
	},

	/**
	 * Settings
	 *
	 */
	settings_Btn: () => {
		let btn = _menu.MakeButton('settings');

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
		let btn = _menu.MakeButton('stats');

		let btn_Stats = $('<span />').on('click', function() {
			Stats.page = 1;
			Stats.filterByPlayerId = null;
			Stats.Show(false);
		});

		return btn.append(btn_Stats);
	},

	/**
	 * Set Übersicht
	 */
	kits_Btn: ()=> {
		let btn = _menu.MakeButton('kits');

		let btn_sp = $('<span />').on('click', function(){
			Kits.init();
		});

		return btn.append(btn_sp);
	},

	/**
	 * FP Produzierende LGs
	 */
	greatBuildings_Btn: () => {
		let btn = _menu.MakeButton('greatBuildings');

		let btn_sp = $('<span />').on('click', function () {
			GreatBuildings.Show();
		});

		return btn.append(btn_sp);
	},

	/**
	 * Marktplatz Filter
	 */
	market_Btn: () => {
		let btn = _menu.MakeButton('market',true);

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

		let btn = _menu.MakeButton('blueGalaxy');

		let btn_sp = $('<span />').on('click', function () {
			BlueGalaxy.Show();
		});

		return btn.append(btn_sp, $('<span id="hidden-blue-galaxy-count" class="hud-counter">0</span>'));
	},
	
	/**
	 * Moppelassistent
	 * */
	moppelHelper_Btn: () => {
		if(!Settings.GetSetting('ShowPlayersMotivation'))
			return;

		let btn = _menu.MakeButton('moppelHelper');

		let btn_sp = $('<span />').on('click', function () {
			EventHandler.ShowMoppelHelper();
		});

		return btn.append(btn_sp);
    },

	/**
	 * FP Collector box
	 */
	fpCollector_Btn: () => {
		let btn = _menu.MakeButton('fpCollector');

		let btn_sp = $('<span />').on('click', function () {
			FPCollector.ShowFPCollectorBox();
		});

		return btn.append(btn_sp);
	},

	/**
	 * Shows the box for managing all alerts
	 */
	alerts_Btn: () => {
		let btn = _menu.MakeButton('alerts');

		let btn_sp = $('<span />').on('click', function () {
			Alerts.show();
		});

		return btn.append(btn_sp);
	},

	gildFight_Btn: () => {
		let btn = _menu.MakeButton('gildFight',true);

		let btn_sp = $('<span />').on('click', function (){
			if(GuildFights.MapData) {
				GuildFights.ShowGuildBox();
			}
		});

		return btn.append(btn_sp);
	},

	investment_Btn: () => {
		let btn = _menu.MakeButton('investment');

		let btn_sp = $('<span />').on('click', function () {
			Investment.BuildBox(false);
		});

		return btn.append(btn_sp);
	},

	guildMemberstat_Btn: () => {
		let btn = _menu.MakeButton('guildMemberstat',true);

		let btn_sp = $('<span />').bind('click', function () {
			if ($('#guildmemberstat-Btn').hasClass('hud-btn-red') === false) {
				GuildMemberStat.BuildBox(false);
			}
		});

		return btn.append(btn_sp);
	},

	gexStat_Btn: () => {
		let btn = _menu.MakeButton('gexStat');

		let btn_sp = $('<span />').bind('click', function () {
			if ($('#gexstat-Btn').hasClass('hud-btn-red') === false) {
				GexStat.BuildBox(false);
			}
		});
		return btn.append(btn_sp, $(`<span id="gex-attempt-count" class="hud-counter">${GExAttempts.count||0}</span>`)).ready(GExAttempts.refreshGUI);
	},

	castle_Btn: () => {
		let btn = _menu.MakeButton('castle');

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
		let btn = _menu.MakeButton('compare_friends_threads');

		let btn_sp = $('<span />').bind('click', function () {
			CompareFriendsThreads.BuildBody();
		});

		return btn.append(btn_sp);
	},

	discord_Btn: () => {
		let btn = _menu.MakeButton('discord');

		let btn_sp = $('<span />').bind('click', function () {
			Discord.BuildBox();
		});

		return btn.append(btn_sp);
	},

	music_Btn: () => {
		let btn = _menu.MakeButton('music');

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
		let btn = _menu.MakeButton('musicControl');

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
