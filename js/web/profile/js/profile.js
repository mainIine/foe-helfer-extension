FoEproxy.addHandler('AchievementsService','getOverview', (data, postData) => {
    Profile.init(data.responseData)
});

FoEproxy.addFoeHelperHandler('ActiveMapUpdated', () => {
	if ($('#PlayerProfileButton').length !== 0) {
        $('#PlayerProfileButton span').attr('class',ActiveMap);
    }
});
FoEproxy.addFoeHelperHandler('BoostsUpdated', () => {
    Profile.update()
});

const Profile = {
    daysPlayed: 0,
    fpProduction: 0,
    fpBoost: 0,
    goods: {},
    guildGoods: 0,
    units: 0,
    battleBoosts: {},
    settlements: [],
    achievements: null,
    achievementList: ['battle#great_commander','battle#billy_the_kid','battle#great_wall_of_china','guild_expedition#impressive_defender','resource#hey_big_spender','social#a_little_help_for_your_friends','friends_tavern#one_of_many_faces'],
    favAchievements: [],
    gbList: ['X_FutureEra_Landmark1','X_OceanicFuture_Landmark3','X_ProgressiveEra_Landmark2'],
    inventoryList: ['rush_single_event_building_instant','motivate_one','motivate_all','rush_mass_supply_large','rush_single_goods_instant','one_up_kit','renovation_kit','store_building'],

    init: (responseData) => {
        Profile.daysPlayed = responseData.achievementGroups.find(x => x.id == "special").achievements.find(x => x.id == 'foe_fanclub').currentLevel.progress || null
        Profile.showButton();
        Profile.settlements = responseData.achievementGroups?.find(x => x.id == "cultural_settlements").achievements || [];
        Profile.achievements = responseData.achievementGroups;
        Profile.favAchievements = responseData.topAchievements;
    },

	showButton: () => {
		if ($('#PlayerProfileButton').length === 0) {
			HTML.AddCssFile('profile');
			let div = $('<div />');

			div.attr({
				id: 'PlayerProfileButton',
				class: 'game-cursor helper-blocker'
			});

			$('body').append(div).promise().done(function() {
				div.append('<span onclick="Profile.show()" class="'+ActiveMap+'"><img src="'+srcLinks.GetPortrait(ExtPlayerAvatar)+'" /></span>')
					.attr('title', i18n('Boxes.PlayerProfile.Tooltip'))
					.tooltip(
						{
							useFoEHelperSkin: true,
							headLine: i18n('Global.BoxTitle'),
							placement: 'bottom',
							html: true
						}
					);
			});
		}
	},

	show: () => {
		if ($('#PlayerProfile').length > 0) {
			HTML.CloseOpenBox('PlayerProfile')
			return
		}

		HTML.Box({
			id: 'PlayerProfile',
			title: ExtPlayerName,
			auto_close: true,
			dragdrop: true,
		})

		Profile.buildBody()
	},
    update: () => {
        if ($('#PlayerProfile').length > 0) Profile.buildBody(true);
    },
    buildBody: (isRebuild=false) => {
        let content = []
        let player = PlayerDict[ExtPlayerID];

        // left content, city
        content.push('<div class="leftInfo showMore">');
        content.push('<div class="header flex">');
        content.push('<img src="'+srcLinks.get(`/city/buildings/H_SS_${CurrentEra}_Townhall.png`,true)+'" />')
        content.push('</div>');
        
        content.push('<div class="expansions secondary">');
        content.push('<span><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_street.png`,true)+'" />')
        let roadAmount = 0;
        for (let building of Object.values(MainParser.CityMapData)) { 
            if (building.type !== "street") continue; 
            roadAmount++;
        }
        content.push(HTML.Format(roadAmount)+'</span>');

        content.push('<span><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)+'" />')
        content.push(HTML.Format(CityMap.UnlockedAreas.length*16+256-16)+'</span>'); // unlocked areas + start area (- 16 somehow?)
        content.push('</div>');

        content.push('<div class="greatbuildings pad text-center">')
        // selected GBs
        for (let gb of Profile.gbList) {
            let gbLevel = Object.values(MainParser.CityMapData).find(x => x.cityentity_id == gb)?.level;
            if (gbLevel)
                content.push('<span><img src="'+srcLinks.get(`/city/buildings/${gb.replace('X_','X_SS_')}.png`,true)+'" />' + gbLevel +'</span>')
        }

        let allGBs = [];
        for (let building of Object.values(MainParser.CityMapData)) { // get all GBs
            if (building.type !== "greatbuilding") continue; 
            allGBs.push(building);
        }
        allGBs.sort((a,b) => { // sort GBs by level
            if (a.level > b.level) return -1;
            if (a.level < b.level) return 1;
            return 0;
        });
        for (let i = 0; i < 7; i++) { // only show highest 6 GBs
            let gb = allGBs[i];
            if (gb == undefined) continue;
            if (!Profile.gbList.find(x => x == gb.cityentity_id)) // if the GB is not already part of the default list
                content.push('<span><img src="'+srcLinks.get(`/city/buildings/${gb.cityentity_id.replace('X_','X_SS_')}.png`,true)+'" />' + gb.level +'</span>');
        }
        if (allGBs.length > 6)
            content.push('<span class="total" data-original-title="'+i18n('Boxes.GuildFights.Total')+': '+allGBs.length+'"><img src="'+srcLinks.get(`/shared/celebrate/rules_great_building_contribution.png`,true)+'" />' + allGBs.length +'</span>');

        content.push('</div>');

        content.push('<div class="dailyProd pad">');
        content.push('<h2>'+i18n('Boxes.PlayerProfile.DailyProduction')+'</h2>');
        if (Profile.fpProduction == 0 || Profile.guildGoods == 0)
            content.push('<p class="important" onclick="Productions.init();">'+i18n('Boxes.PlayerProfile.OpenProduction')+'</p>');
        content.push('<span><img src="' + srcLinks.get(`/shared/icons/strategy_points.png`,true)+'" />' + HTML.Format(parseInt(Profile.fpProduction)) + '</span><span><img src="' + srcLinks.get(`/shared/gui/boost/boost_icon_fp.png`,true)+'" />' +Boosts.Sums.forge_points_production + '%</span>');
        if (Profile.guildGoods)
            content.push('<span><img src="' + srcLinks.get(`/shared/icons/icon_great_building_bonus_guild_goods.png`,true)+'" />'  + HTML.Format(parseInt(parseInt(Profile.guildGoods)) || 0) + '</span>')
            if (Profile.goods[CurrentEraID-2])
                content.push('<span><img src="' + srcLinks.get(`/shared/icons/all_goods_of_previous_age.png`,true)+'" />' + HTML.Format(parseInt(parseInt(Profile.goods[CurrentEraID-2])) || 0) + '</span> ');
            if (Profile.goods[CurrentEraID-1])
                content.push('<span><img src="' + srcLinks.get(`/shared/icons/all_goods_of_age.png`,true)+'" />'  + HTML.Format(parseInt(parseInt(Profile.goods[CurrentEraID-1])) || 0) + '</span> ');
            if (Profile.goods[CurrentEraID])
                content.push('<span><img src="' + srcLinks.get(`/shared/icons/next_age_goods.png`,true)+'" />' + HTML.Format(parseInt(parseInt(Profile.goods[CurrentEraID])) || 0) + '</span> ');
            if (Profile.units > 0)
                content.push('<span class="units">'+HTML.Format(parseInt(Profile.units))+'</span>');
        content.push('</div>');
        
        let hasQIBoosts = (Boosts.noSettlement.guild_raids_action_points_collection+Boosts.Sums.guild_raids_coins_production+Boosts.Sums.guild_raids_coins_start+Boosts.Sums.guild_raids_supplies_production+Boosts.Sums.guild_raids_supplies_start+Boosts.Sums.guild_raids_goods_start+Boosts.Sums.guild_raids_units_start !== 0)
        if (hasQIBoosts) {
            content.push('<div class="qiBoosts pad text-center">');
            content.push('<h2>'+i18n('Boxes.PlayerProfile.QIBoosts')+'</h2>');
            if (Boosts.Sums.guild_raids_coins_production + Boosts.Sums.guild_raids_coins_start !== 0) {
                content.push('<span class="qicoins">')
                if (Boosts.Sums.guild_raids_coins_production !== 0)
                    content.push(HTML.Format(parseInt(Boosts.Sums.guild_raids_coins_production)) + '% ');
                if (Boosts.Sums.guild_raids_coins_start !== 0)
                    content.push('+' + HTML.FormatNumberShort(parseInt(Boosts.Sums.guild_raids_coins_start),true,'en-EN'))
                content.push('</span> ');
            }
            if (Boosts.Sums.guild_raids_supplies_production + Boosts.Sums.guild_raids_supplies_start !== 0) {
                content.push('<span class="qisupplies">');
                if (Boosts.Sums.guild_raids_supplies_production !== 0)
                    content.push(HTML.Format(parseInt(Boosts.Sums.guild_raids_supplies_production)) + '% ');
                if (Boosts.Sums.guild_raids_supplies_start !== 0)
                    content.push('+' + HTML.FormatNumberShort(parseInt(Boosts.Sums.guild_raids_supplies_start),true,'en-EN'));
                content.push('</span> ');
            }
            if (Boosts.noSettlement.guild_raids_action_points_collection !== 0)
                content.push('<span class="qiactions">' + HTML.Format(parseInt(Boosts.noSettlement.guild_raids_action_points_collection)) + '</span> ');
            if (Boosts.Sums.guild_raids_goods_start !== 0)
                content.push('<span class="qigoods_start">+' + HTML.Format(parseInt(Boosts.Sums.guild_raids_goods_start)) + '</span> ');
            if (Boosts.Sums.guild_raids_units_start !== 0)
                content.push('<span class="qiunits_start">+' + HTML.Format(parseInt(Boosts.Sums.guild_raids_units_start)) + '</span> ');
            content.push('</div>');
        }
        content.push('</div>');

        // right content, stock
        content.push('<div class="rightInfo showMore">');
        content.push('<div class="header">');
        content.push('<img class="fp" src="'+srcLinks.get(`/shared/icons/quest_reward/icon_forgepoints.png`,true)+'" />')
        content.push('<img class="alabaster" src="'+srcLinks.get(`/shared/icons/goods_large/icon_fine_marble.png`,true)+'" />')
        content.push('<img src="'+srcLinks.get(`/shared/icons/reward_icons/reward_icon_boost_crate.png`,true)+'" />')
        content.push('<img class="goods" src="'+srcLinks.get(`/shared/icons/reward_icons/reward_icon_random_goods.png`,true)+'" />')
        content.push('</div>');
            content.push('<div class="stock pad text-center">');
            content.push('<span><img src="'+srcLinks.get(`/shared/icons/quest_reward/icon_forgepoints.png`,true)+'" /> '+HTML.Format(StrategyPoints.InventoryFP || 0)+'</span>');
            content.push('<span><img src="'+srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_medals.png`,true)+'" /> '+HTML.FormatNumberShort(ResourceStock.medals || 0,true,'en-EN')+'</span>');
            
            
            let currentGoods = 0, previousGoods = 0, nextGoods = 0;
            for (let good of Object.values(GoodsData)) {
                if (good.era == CurrentEra)
                    currentGoods += (ResourceStock[good.id] || 0);
                if (good.era == Technologies.EraNames[CurrentEraID-1])
                    previousGoods += (ResourceStock[good.id] || 0);
                if (good.era == Technologies.EraNames[CurrentEraID+1])
                    nextGoods += (ResourceStock[good.id] || 0);
            }
            content.push('<div class="goods">');
            if (previousGoods > 0)
                content.push('<span><img src="' + srcLinks.get(`/shared/icons/all_goods_of_previous_age.png`,true)+'" />' + HTML.FormatNumberShort(previousGoods,true,'en-EN') + '</span> ');
            if (currentGoods > 0)
                content.push('<span><img src="' + srcLinks.get(`/shared/icons/all_goods_of_age.png`,true)+'" />' + HTML.FormatNumberShort(currentGoods,true,'en-EN') + '</span> ');
            if (nextGoods > 0)
                content.push('<span><img src="' + srcLinks.get(`/shared/icons/next_age_goods.png`,true)+'" />' + HTML.FormatNumberShort(nextGoods,true,'en-EN') + '</span> ');
            content.push('</div>');

            content.push('<span class="secondary"><img src="'+srcLinks.get(`/shared/icons/eventwindow_tavern.png`,true)+'" /> '+HTML.FormatNumberShort(ResourceStock.tavern_silver || 0,true,'en-EN')+'</span>');
            content.push('<span class="secondary"><img src="'+srcLinks.get(`/shared/icons/gemstones.png`,true)+'" /> '+HTML.Format(ResourceStock.gemstones || 0)+'</span>');
            content.push('<span class="secondary"><img src="'+srcLinks.get(`/shared/gui/antiquedealer/antiquedealer_currency_trade_coins.png`,true)+'" /> '+HTML.FormatNumberShort(ResourceStock.trade_coins || 0,true,'en-EN')+'</span>');
            
            content.push('</div>');

            content.push('<div class="inventory pad text-center">');
            content.push('<h2>'+i18n('Boxes.MarketOffers.Inventory')+'</h2>');
            for (let item of Profile.inventoryList) {
                let itemInStock = Object.values(MainParser.Inventory).find(x => x.itemAssetName == item);
                if (item == 'rush_mass_supply_large') { // same asset as 6h rush, filter by speedup
                    itemInStock = Object.values(MainParser.Inventory).filter(x => x.itemAssetName == item).find(x => x.item.duration == 86400);
                }
                if (itemInStock)
                    content.push('<span data-original-title="'+itemInStock.name+'"><img src="'+srcLinks.get(`/shared/icons/reward_icons/reward_icon_${item}.png`,true)+'" /> '+HTML.Format(itemInStock.inStock)+'</span>');
            }

            // get additional favorites
            content.push('<div class="favorites">');
            let favCounter = 0;
            for(let item of Object.values(MainParser.Inventory)) {
                if (!item.favorite || Profile.inventoryList.find(x => x == item.itemAssetName)) continue;
                if (favCounter > 6) continue;
                if (item.itemAssetName !== "icon_fragment") { // do not include fragments
                    content.push('<span data-original-title="'+item.name+'">');
                    content.push(srcLinks.icons(item.itemAssetName,true));
                    content.push(HTML.Format(item.inStock)+'</span>');
                    favCounter++;
                }
            }
            content.push('</div>');
            content.push('</div>');
        content.push('</div>');


        // center content
        content.push('<div class="centerInfo">');
            content.push('<div class="basicInfo pad">');
            content.push('<img src="'+srcLinks.GetPortrait(player.Avatar)+'" />');
                content.push('<div>');
                content.push('<h1>'+player.PlayerName+'</h1>');
                content.push('<span>'+i18n('Eras.'+CurrentEraID)+'</span><br>');
                content.push('<span class="ranking">'+HTML.Format(parseInt(player.Score))+'</span>');
                content.push('<span>⚔'+HTML.Format(parseInt(player.WonBattles))+'</span>');
                content.push('</div>');
            content.push('</div>');
            content.push('<div class="daysPlayed">');
            content.push(
                HTML.i18nReplacer(i18n('Boxes.PlayerProfile.DaysPlayed'), {
                    number: HTML.Format(parseInt(Profile.daysPlayed)),
                }));
            content.push('</div>');

            content.push('<div class="dailyProd hideOnMore pad">');
            content.push('<h2 class="text-center">'+i18n('Boxes.PlayerProfile.DailyProduction')+'</h2>');
            if (Profile.fpProduction == 0 || Profile.guildGoods == 0)
                content.push('<span class="important">'+i18n('Boxes.PlayerProfile.OpenProduction')+'</span><br>');
            content.push('<span><img src="' + srcLinks.get(`/shared/icons/strategy_points.png`,true)+'" />' + HTML.Format(parseInt(Profile.fpProduction)) + '</span><span><img src="' + srcLinks.get(`/shared/gui/boost/boost_icon_fp.png`,true)+'" />' +Boosts.Sums.forge_points_production + '%</span><br>');
                content.push('<div class="goods">')
                if (Profile.goods[CurrentEraID-2])
                    content.push('<span><img src="' + srcLinks.get(`/shared/icons/all_goods_of_previous_age.png`,true)+'" />' + HTML.Format(parseInt(parseInt(Profile.goods[CurrentEraID-2])) || 0) + '</span> ');
                if (Profile.goods[CurrentEraID-1])
                    content.push('<span><img src="' + srcLinks.get(`/shared/icons/all_goods_of_age.png`,true)+'" />' + HTML.Format(parseInt(parseInt(Profile.goods[CurrentEraID-1])) || 0) + '</span> ');
                if (Profile.goods[CurrentEraID])
                    content.push('<span><img src="' + srcLinks.get(`/shared/icons/next_age_goods.png`,true)+'" />' + HTML.Format(parseInt(parseInt(Profile.goods[CurrentEraID])) || 0) + '</span> ');
                if (Profile.guildGoods)
                    content.push('<span><img src="' + srcLinks.get(`/shared/icons/icon_great_building_bonus_guild_goods.png`,true)+'" />' + HTML.Format(parseInt(parseInt(Profile.guildGoods)) || 0) + '</span>')
                content.push('</div>');
            content.push('</div>');

            content.push('<div class="battleBoosts pad text-center">');
            content.push('<h2>'+i18n('Boxes.PlayerProfile.BattleBoosts')+'</h2>');
            content.push('<table><tr class="general">'
                +'<td><span class="aAtt">'+HTML.Format(parseInt(Boosts.Sums["att_boost_attacker"]))+'</span>'
                +'<span class="aDef">'+HTML.Format(parseInt(Boosts.Sums.def_boost_attacker))+'</span></td>'
                +'<td></td><td><span class="dAtt">'+HTML.Format(parseInt(Boosts.Sums.att_boost_defender))+'</span>'
                +'<span class="dDef">'+HTML.Format(parseInt(Boosts.Sums.def_boost_defender))+'</span></td></tr>');
            content.push('<tr>'
                +'<td><span class="aAtt">'+HTML.Format(parseInt(Boosts.Sums['battleground-att_boost_attacker']+Boosts.Sums.att_boost_attacker))+'</span>'
                +'<span class="aDef">'+HTML.Format(parseInt(Boosts.Sums['battleground-def_boost_attacker']+Boosts.Sums.def_boost_attacker))+'</span></td>'
                +'<td><span class="gbg"></span></td><td><span class="dAtt">'+HTML.Format(parseInt(Boosts.Sums['battleground-att_boost_defender']+Boosts.Sums.att_boost_defender))+'</span>'
                +'<span class="dDef">'+HTML.Format(parseInt(Boosts.Sums['battleground-def_boost_defender']+Boosts.Sums.def_boost_defender))+'</span></td></tr>');
            content.push('<tr>'
                +'<td><span class="aAtt">'+HTML.Format(parseInt(Boosts.Sums['guild_expedition-att_boost_attacker']+Boosts.Sums.att_boost_attacker))+'</span>'
                +'<span class="aDef">'+HTML.Format(parseInt(Boosts.Sums['guild_expedition-def_boost_attacker']+Boosts.Sums.def_boost_attacker))+'</span></td>'
                +'<td><span class="ge"></span></td><td><span class="dAtt">'+HTML.Format(parseInt(Boosts.Sums['guild_expedition-att_boost_defender']+Boosts.Sums.att_boost_defender))+'</span>'
                +'<span class="dDef">'+HTML.Format(parseInt(Boosts.Sums['guild_expedition-def_boost_defender']+Boosts.Sums.def_boost_defender))+'</span></td></tr>');
            if (Boosts.noSettlement['guild_raids-att_boost_attacker'] > 0 || Boosts.noSettlement['guild_raids-def_boost_attacker'] > 0 || Boosts.noSettlement['guild_raids-att_boost_defender'] > 0 || Boosts.noSettlement['guild_raids-def_boost_defender'] > 0)
                content.push('<tr><td><span class="aAtt">'+HTML.Format(parseInt(Boosts.noSettlement['guild_raids-att_boost_attacker']))+'</span><span class="aDef">'+HTML.Format(parseInt(Boosts.noSettlement['guild_raids-def_boost_attacker']))+'</span></td><td><span class="qi"></span></td><td><span class="dAtt">'+HTML.Format(parseInt(Boosts.noSettlement['guild_raids-att_boost_defender']))+'</span><span class="dDef">'+HTML.Format(parseInt(Boosts.noSettlement['guild_raids-def_boost_defender']))+'</span></td></tr>');
            content.push('</tr></table>');
            
            if (Boosts.Sums.critical_hit_chance > 0)
                content.push('<span class="crit showMore"><img src="'+srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_critical_hit_chance.png`,true)+'" /> '+Math.round(Boosts.Sums.critical_hit_chance*100)/100+'%</span>')
            content.push('</div>');

            // settlements
            content.push('<div class="settlements pad showMore text-center">');
            content.push('<h2>'+i18n('Boxes.PlayerProfile.Settlements')+'</h2>');
            if (Profile.settlements.length > 0) {
                for (let settlement of Profile.settlements) {
                    content.push('<span class="'+settlement.id+'" data-original-title="'+settlement.name+'">');
                    content.push('<img src="'+srcLinks.get(`/shared/icons/achievements/achievement_icons_${settlement.id}.png`,true)+'" />')
                    content.push(HTML.Format(parseInt(settlement.currentLevel.progress)) + '</span>');
                }
            }
            else {
                content.push(i18n('Boxes.PlayerProfile.NoSettlementsFinished'));
            }
            content.push('</div>');

            // achievements
            content.push('<div class="achievements pad showMore text-center">');
            content.push('<h2>'+i18n('Boxes.PlayerProfile.GamePlay')+'</h2>');
            for (let achievement of Profile.achievementList) {
                let ach = achievement.split('#')
                let achFromList = Profile.achievements.find(x => x.id == ach[0]).achievements.find(x => x.id == ach[1]);
                if (isNaN(parseInt(achFromList?.currentLevel?.progress))) continue; 

                content.push('<span data-original-title="'+achFromList.descriptionTemplate.replace('%s/%s',HTML.Format(parseInt(achFromList.currentLevel.progress))).replace('%s-/%s-',HTML.Format(parseInt(achFromList.currentLevel.progress)))+'"><img src="'+srcLinks.get(`/shared/icons/achievements/achievement_icons_${ach[1]}.png`,true)+'" />'+
                HTML.FormatNumberShort(parseInt(achFromList.currentLevel.progress),true,'en-EN') + '</span>');
            }
            content.push('</div>');
        content.push('</div>');

        let moreActive = $('#PlayerProfileBody .toggleMore.active').length > 0;
        content.push(`<span class="toggleMore${moreActive?" active":""}">&nbsp;</span>`);


        // actions
        $('#PlayerProfileBody').html(content.join('')).promise().done(function(){
            $('#PlayerProfileBody [data-original-title]').tooltip();
            if (isRebuild) {
                if (moreActive) { 
                    $('#PlayerProfileBody .showMore').show();
                    $('#PlayerProfileBody .hideOnMore').hide();
                }
                return
            }
            $('#PlayerProfileBody').on('click', '.toggleMore', function () {
                $(this).toggleClass('active');
                $('#PlayerProfileBody .centerInfo .showMore, #PlayerProfileBody .centerInfo .hideOnMore').slideToggle();
                $('#PlayerProfileBody .leftInfo.showMore, #PlayerProfileBody .rightInfo.showMore').fadeToggle();
                $('#PlayerProfileBody .leftInfo.hideOnMore, #PlayerProfileBody .rightInfo.hideOnMore').fadeToggle();
            });
        });
    }
}