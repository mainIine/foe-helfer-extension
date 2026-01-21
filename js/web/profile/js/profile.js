FoEproxy.addHandler('AchievementsService','getOverview', (data, postData) => {
    Profile.init(data.responseData);
    
    if ($('#playerProfile-Btn').hasClass('hud-btn-red')) {
        $('#playerProfile-Btn').removeClass('hud-btn-red');
        $('#playerProfile-Btn-closed').remove();
    }
});
FoEproxy.addHandler('OtherPlayerService','visitPlayer', (data, postData) => {
    Profile.otherPlayer = data.responseData;
    Profile.showButton();
});

FoEproxy.addFoeHelperHandler('ActiveMapUpdated', () => {
	if ($('#PlayerProfileButton').length !== 0) {
        $('#PlayerProfileButton span').attr('class',ActiveMap);

        if (ActiveMap === "OtherPlayer")
            $('#PlayerProfileButton').attr('onclick','Profile.showOtherPlayer()');
        else
            $('#PlayerProfileButton').attr('onclick','Profile.show()');
    }
});
FoEproxy.addFoeHelperHandler('BoostsUpdated', () => {
    Profile.update()
});

const Profile = {
    daysPlayed: 0,
    fpProduction: 0,
    goods: {},
    guildGoods: 0,
    units: 0,
    settlements: [],
    achievements: null,
    achievementList: ['battle#great_commander','battle#billy_the_kid','battle#great_wall_of_china','guild_expedition#impressive_defender','resource#hey_big_spender','social#a_little_help_for_your_friends','friends_tavern#one_of_many_faces'],
    favAchievements: [],
    gbList: ['X_FutureEra_Landmark1','X_OceanicFuture_Landmark3','X_ProgressiveEra_Landmark2'],
    inventoryList: ['rush_single_event_building_instant','motivate_one','motivate_all','rush_mass_supply_large','rush_single_goods_instant','one_up_kit','renovation_kit','store_building'],
    themes: ['default','green','red','black','sunset','sunrise','sunrise-light','light','teal','foe','sepia'],
    currentThemeNr: 0,

    init: (responseData) => {
        Profile.daysPlayed = responseData.achievementGroups.find(x => x.id == "special").achievements.find(x => x.id == 'foe_fanclub').currentLevel.progress || null
        Profile.showButton();
        Profile.settlements = responseData.achievementGroups?.find(x => x.id == "cultural_settlements")?.achievements || [];
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
                let showProfile = ActiveMap === 'OtherPlayer' ? 'Profile.showOtherPlayer()' : 'Profile.show()';
				div.append('<span class="'+ActiveMap+'" data-original-title="'+i18n('Boxes.PlayerProfile.Tooltip')+'"><img class="clickable" src="'+srcLinks.GetPortrait(ExtPlayerAvatar)+'" /></span>')
					.attr('onclick', showProfile);
                $('#PlayerProfileButton [data-original-title]').tooltip({
                        useFoEHelperSkin: true,
                        headLine: i18n('Global.BoxTitle'),
                        placement: 'bottom',
                        html: true
                });
			});
		}
	},

	show: () => {
		if ($('#PlayerProfile').length > 0) {
			HTML.CloseOpenBox('PlayerProfile');
			return;
		}

		HTML.Box({
			id: 'PlayerProfile',
			title: ExtPlayerName,
			auto_close: true,
			dragdrop: true,
            class: 'playerprofile'
		});

		Profile.buildBody();
	},
    update: () => {
        if ($('#PlayerProfile').length > 0) Profile.buildBody(true);
    },
    buildBody: (isRebuilt=false) => {
        let content = [];

        if (Profile.achievements === null)
            content.push('<div style="display:inline-flex;width:100%;height:200px;align-items:center;justify-content:center;font-size:120%;text-align:center;">'+i18n('Menu.PlayerProfile.Warning')+'</div>');

        // left content, city
        if (Profile.achievements !== null) content.push(Profile.buildCityContent(isRebuilt));

        // center content
        if (Profile.achievements !== null) content.push(Profile.buildMainContent(isRebuilt));

        // right content, stock
        if (Profile.achievements !== null) content.push(Profile.buildStockContent(isRebuilt));

        let moreActive = $('#PlayerProfileBody .toggleMore.active').length > 0;
        if (Profile.achievements !== null) content.push(`<span class="toggleMore${moreActive?" active":""}">&nbsp;</span>`);

        // actions
        $('#PlayerProfileBody').html(content.join('')).promise().done(function() {
            let theme = localStorage.getItem("PlayerProfileTheme") || "default";
            $('#PlayerProfile').addClass(theme);
            $('#PlayerProfileBody [data-original-title]').tooltip();
            if (isRebuilt) {
                if (moreActive) { 
                    $('#PlayerProfileBody .showMore').show();
                    $('#PlayerProfileBody .hideOnMore').hide();
                }
                return;
            }
            $('#PlayerProfileBody .daysPlayed').on('click', function () {
                let title = $(this).attr('data-original-title');
                let text = $('span',this).text();

                $('span',this).text(title);
                $(this).attr('data-original-title', text);
            });
            $('#PlayerProfileBody').on('click', '.colorToggle',function () {
                Profile.currentThemeNr = Profile.themes.indexOf(localStorage.getItem("PlayerProfileTheme")) || 0;
                $('#PlayerProfile').removeClass(Profile.themes[Profile.currentThemeNr]);
                if (Profile.themes[Profile.currentThemeNr+1] !== undefined)
                    Profile.currentThemeNr++;
                else
                    Profile.currentThemeNr = 0;

                $('#PlayerProfile').addClass(Profile.themes[Profile.currentThemeNr]);
				localStorage.setItem("PlayerProfileTheme", Profile.themes[Profile.currentThemeNr]);
            });
            $('#PlayerProfile').on('click', '.toggleMore', function () {
                $(this).toggleClass('active');
                $('#PlayerProfile').toggleClass('expanded');
                $('#PlayerProfile .centerInfo .showMore, #PlayerProfile .centerInfo .hideOnMore').slideToggle();
                $('#PlayerProfile .leftInfo.showMore, #PlayerProfile .rightInfo.showMore').toggle();
                $('#PlayerProfile .leftInfo.hideOnMore, #PlayerProfile .rightInfo.hideOnMore').toggle();
            });

            $('#PlayerProfile').on('click', '.removable', function () {
                $(this).remove();
                $('.tooltip').remove();
            });

            /*
            $('#PlayerProfile').on('click', '.copyContent', function () {
                let copyText = 
                    $('.dailyProd h2',this).text()+'\n'+
                    $('.dailyProd span',this).text()+'\n'+
                    $('.battleBoosts h2',this).text()+'\n'+
                    $('.battleBoosts tr',this).text()+'\n';

                    helper.str.copyToClipboardLegacy(copyText);
            });*/
        });
    },


    buildCityContent(isRebuilt) {
        let cl = [];
        cl.push('<div class="leftInfo showMore">');
        cl.push('<img class="decoration" src="'+srcLinks.get(`/shared/gui/window/window_decoration_side.png`,true)+'" />');
        cl.push('<div class="header flex">');
        cl.push('<img src="'+srcLinks.get(`/city/buildings/H_SS_${CurrentEra}_Townhall.png`,true)+'" />');
        cl.push('</div>');
        
        cl.push('<div class="expansions secondary">');
        cl.push('<span><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_street.png`,true)+'" />');
        let roadAmount = 0;
        for (let building of Object.values(MainParser.CityMapData)) { 
            if (building.type !== "street") continue; 
            roadAmount++;
        }
        cl.push(HTML.Format(roadAmount)+'</span>');

        cl.push('<span><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_expansion.png`,true)+'" />');
        cl.push(HTML.Format(CityMap.Main.unlockedAreas.length*16+256-16)+'</span>'); // unlocked areas + start area (- 16 somehow?)
        cl.push('</div>');

        cl.push('<div class="greatbuildings pad text-center">')
        // selected GBs
        for (let gb of Profile.gbList) {
            let gbLevel = Object.values(MainParser.CityMapData).find(x => x.cityentity_id == gb)?.level;
            if (gbLevel)
                cl.push('<span class="removable"><img src="'+srcLinks.get(`/city/buildings/${gb.replace('X_','X_SS_')}.png`,true)+'" />' + gbLevel +'</span>');
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
                cl.push('<span class="removable"><img src="'+srcLinks.get(`/city/buildings/${gb.cityentity_id.replace('X_','X_SS_')}.png`,true)+'" />' + gb.level +'</span>');
        }
        if (allGBs.length > 6)
            cl.push('<span class="total" data-original-title="'+i18n('Boxes.GuildFights.Total')+': '+allGBs.length+'"><img src="'+srcLinks.get(`/shared/gui/constructionmenu/icon_greatbuilding.png`,true)+'" />' + allGBs.length +'</span>');

        cl.push('</div>');

        // daily production
        cl.push('<div class="dailyProd pad">');
        cl.push('<h2 class="border"><span>'+i18n('Boxes.PlayerProfile.DailyProduction')+'</span></h2>');
        // no data
        if (Profile.fpProduction === 0 || Profile.guildGoods === 0) {
            cl.push('<p class="important" onclick="Productions.init();">'+i18n('Boxes.PlayerProfile.OpenProduction')+'</p>');
        }

        if (Profile.fpProduction > 0) {
            cl.push('<span class="removable">' +
                '<img src="' + srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_forgepoints.png`,true)+'" />' + 
                HTML.Format(parseInt(Profile.fpProduction)));
                if (Boosts.Sums.forge_points_production > 0)
                    cl.push('<span class="boost"> '+Boosts.Sums.forge_points_production + '% </span>');
            cl.push('</span>');
        }
        if (Profile.guildGoods) {
            cl.push('<span class="removable">'+
                '<img src="' + srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_guild_goods.png`,true)+'" />' + 
                HTML.Format(parseInt(parseInt(Profile.guildGoods)) || 0));
                if (Boosts.Sums.guild_goods_production > 0)
                    cl.push('<span class="boost"> '+ Boosts.Sums.guild_goods_production + '% </span>');
            cl.push('</span>');
        }
        // goods
        if (Profile.goods[CurrentEraID-2] || Profile.goods[CurrentEraID-1] || Profile.goods[CurrentEraID]) {
            cl.push('<span class="removable">');
                if (Profile.goods[CurrentEraID-2]) {
                    cl.push(' <img src="' + srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_previous_era_good_production.png`,true)+'" />' + 
                    HTML.Format(parseInt(parseInt(Profile.goods[CurrentEraID-2])) || 0));
                }
                if (Profile.goods[CurrentEraID-1]) {
                    cl.push('<img src="' + srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_goods.png`,true)+'" />');
                    cl.push(HTML.Format(parseInt(parseInt(Profile.goods[CurrentEraID-1])) || 0));
                }
                if (Profile.goods[CurrentEraID]) {
                    cl.push(' <img src="' + srcLinks.get(`/shared/icons/next_age_goods.png`,true)+'" />' + 
                    HTML.Format(parseInt(parseInt(Profile.goods[CurrentEraID])) || 0));
                }
                if (Boosts.Sums.goods_production > 0)
                    cl.push('<span class="boost"> '+Boosts.Sums.goods_production + '% </span>');
            cl.push('</span>');
        }

        if (Profile.units > 0) {
			cl.push('<span class="removable"><img src="' + srcLinks.get(`/shared/gui/pvp_arena/hud/pvp_arena_icon_army.png`,true)+'" />'+HTML.Format(parseInt(Profile.units))+'</span>');
        }
        cl.push('</div>');
        
        // qi extra production
        let hasQIBoosts = (Boosts.noSettlement.guild_raids_action_points_collection+Boosts.Sums.guild_raids_coins_production+Boosts.Sums.guild_raids_coins_start+Boosts.Sums.guild_raids_supplies_production+Boosts.Sums.guild_raids_supplies_start+Boosts.Sums.guild_raids_goods_start+Boosts.Sums.guild_raids_units_start !== 0)
        if (hasQIBoosts) {
            cl.push('<div class="qiBoosts pad text-center">');
            cl.push('<h2>'+i18n('Boxes.PlayerProfile.QIBoosts')+'</h2>');
            if (Boosts.noSettlement.guild_raids_coins_production + Boosts.Sums.guild_raids_coins_start !== 0) {
                cl.push('<span><img src="' + srcLinks.get(`/shared/icons/icon_townhall_guild_raids_coins_start.png`,true) + '" />');
                if (Boosts.noSettlement.guild_raids_coins_production !== 0)
                    cl.push(HTML.Format(parseInt(Boosts.noSettlement.guild_raids_coins_production)) + '% ');
                if (Boosts.Sums.guild_raids_coins_start !== 0)
                    cl.push('+' + HTML.FormatNumberShort(parseInt(Boosts.Sums.guild_raids_coins_start),true,'en-EN'));
                cl.push('</span> ');
            }
            if (Boosts.noSettlement.guild_raids_supplies_production + Boosts.Sums.guild_raids_supplies_start !== 0) {
                cl.push('<span><img src="' + srcLinks.get(`/shared/icons/icon_townhall_guild_raids_supplies_start.png`,true) + '" />');
                if (Boosts.noSettlement.guild_raids_supplies_production !== 0)
                    cl.push(HTML.Format(parseInt(Boosts.noSettlement.guild_raids_supplies_production)) + '% ');
                if (Boosts.Sums.guild_raids_supplies_start !== 0)
                    cl.push('+' + HTML.FormatNumberShort(parseInt(Boosts.Sums.guild_raids_supplies_start),true,'en-EN'));
                cl.push('</span> ');
            }
            if (Boosts.noSettlement.guild_raids_action_points_collection !== 0)
                cl.push('<span><img src="' + srcLinks.get(`/shared/icons/icon_townhall_guild_raids_action_points_collection.png`,true) + '" />' + HTML.Format(parseInt(Boosts.noSettlement.guild_raids_action_points_collection)) + '</span> ');
            if (Boosts.Sums.guild_raids_goods_start !== 0)
                cl.push('<span><img src="' + srcLinks.get(`/shared/icons/icon_townhall_guild_raids_goods_start.png`,true) + '" />' + HTML.Format(parseInt(Boosts.Sums.guild_raids_goods_start)) + '</span> ');
            if (Boosts.Sums.guild_raids_units_start !== 0)
                cl.push('<span><img src="' + srcLinks.get(`/shared/icons/icon_townhall_guild_raids_units_start.png`,true) + '" />' + HTML.Format(parseInt(Boosts.Sums.guild_raids_units_start)) + '</span> ');
            if (Boosts.noSettlement.guild_raids_action_points_capacity !== 0)
                cl.push('<span><img src="' + srcLinks.get(`/shared/icons/icon_townhall_guild_raids_action_points_capacity.png`,true)+'" />' + HTML.Format(parseInt(Boosts.noSettlement.guild_raids_action_points_capacity)) + '</span> ');
            cl.push('</div>');
        }
        cl.push('</div>');

        return cl.join('');
    },


    buildMainContent(isRebuilt) {
        let player = PlayerDict[ExtPlayerID];
        let cc = [];
            cc.push('<div class="centerInfo">');
            cc.push('<img class="decoration" src="'+srcLinks.get(`/shared/gui/teaser/ui/teaser_decoration_bottom.png`,true)+'" />');
            cc.push('<div class="basicInfo pad">');
            cc.push('<div class="imgContainer">');
            cc.push('<img class="decoration" src="'+srcLinks.get(`/shared/gui/castle_system/castle_system_icon_new.png`,true)+'" />');
            cc.push('<img class="decoration" src="'+srcLinks.get(`/shared/gui/castle_system/castle_system_icon_new.png`,true)+'" />');
            cc.push('<img class="colorToggle clickable" src="'+srcLinks.GetPortrait(player.Avatar)+'" />');
            cc.push('</div>');
                cc.push('<div>');
                cc.push('<h1>'+player.PlayerName+'</h1>');
                cc.push('<span>'+i18n('Eras.'+CurrentEraID)+'</span><br>');
                cc.push('<span class="ranking">'+HTML.Format(parseInt(player.Score))+'</span><span class="hidden-text">&numsp;</span>');
                cc.push('<span>⚔'+HTML.Format(parseInt(player.WonBattles || 0))+'</span>');
                cc.push('</div>');
            cc.push('</div>');

			const daysFromToday = n => {
			    let d = new Date();
			    d.setDate(d.getDate() - Math.abs(n));

			    return moment(d).format(i18n('Date'));
			};

            let daysPlayed = HTML.i18nReplacer(i18n('Boxes.PlayerProfile.DaysPlayed'), {number: HTML.Format(parseInt(Profile.daysPlayed || 0))});

	        cc.push('<div class="daysPlayed clickable" data-original-title="'+daysPlayed+'">');
	            cc.push('<span>' + HTML.i18nReplacer(i18n('Boxes.PlayerProfile.DateStarted'), { date: daysFromToday(Profile.daysPlayed) }) + '</span>');
            cc.push('</div>');
            cc.push('<img class="decorationBanner" src="'+srcLinks.get(`/shared/gui/reward_notification/reward_notification_banner.png`,true)+'" />');

            cc.push('<div class="copyContent">');
            cc.push('<div class="dailyProd hideOnMore pad">');
            cc.push('<h2 class="text-center">'+i18n('Boxes.PlayerProfile.DailyProduction')+'</h2> ');
            if (Profile.fpProduction === 0 || Profile.guildGoods === 0)
                cc.push('<span class="important clickable" onclick="Productions.init();">'+i18n('Boxes.PlayerProfile.OpenProduction')+'</span><br>');

            if (Profile.fpProduction > 0) {
                cc.push('<span class="removable">' +
                    '<span class="hidden-text">&numsp;&middot;&nbsp;'+i18n('Boxes.BlueGalaxy.FP')+':&nbsp;</span>'+
                    '<img src="' + srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_forgepoints.png`,true)+'" />' +  HTML.Format(parseInt(Profile.fpProduction)));
                    if (Boosts.Sums.forge_points_production > 0)
                        cc.push(' <span class="boost"><span class="hidden-text">&nbsp;</span>'+Boosts.Sums.forge_points_production + '% </span>');
                cc.push('</span><span class="hidden-text">&numsp;</span>');
            }
            if (Profile.units > 0) {
                cc.push('<span class="removable">'+
                    '<span class="hidden-text"><br>&numsp;&middot;&nbsp;'+i18n('Boxes.Productions.Units')+':&nbsp;</span>'+
                    '<img src="' + srcLinks.get(`/shared/gui/pvp_arena/hud/pvp_arena_icon_army.png`,true)+'" />'+HTML.Format(parseInt(Profile.units))+'</span>');
                cc.push('<br>');
            }
            if (Profile.guildGoods) {
                cc.push('<span class="removable">'+
                    '<span class="hidden-text">&numsp;&middot;&nbsp;'+i18n('Boxes.GuildMemberStat.GuildGoods')+':&nbsp;</span>'+
                    '<img src="' + srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_guild_goods.png`,true)+'" />' + 
                    HTML.Format(parseInt(parseInt(Profile.guildGoods)) || 0));
                    if (Boosts.Sums.guild_goods_production > 0)
                        cc.push('<span class="hidden-text">&nbsp;</span><span class="boost"> '+ Boosts.Sums.guild_goods_production + '% </span>');
                cc.push('</span><span class="hidden-text">&numsp;</span>');
            }
            // goods
            if (Profile.goods[CurrentEraID-2] || Profile.goods[CurrentEraID-1] || Profile.goods[CurrentEraID]) {
                cc.push('<span class="removable">');
                    cc.push('<span class="hidden-text"><br>&numsp;&middot;&nbsp;'+i18n('Boxes.BlueGalaxy.Goods')+':</span>');
                    if (Profile.goods[CurrentEraID-2]) {
                        cc.push('<span class="hidden-text">⬅️</span> <img src="' + srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_previous_era_good_production.png`,true)+'" />' + 
                        HTML.Format(parseInt(parseInt(Profile.goods[CurrentEraID-2])) || 0));
                    }
                    if (Profile.goods[CurrentEraID-1]) {
                        cc.push('<span class="hidden-text">⬇️</span><img src="' + srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_goods.png`,true)+'" />');
                        cc.push(HTML.Format(parseInt(parseInt(Profile.goods[CurrentEraID-1])) || 0));
                    }
                    if (Profile.goods[CurrentEraID]) {
                        cc.push('<span class="hidden-text">➡️</span> <img src="' + srcLinks.get(`/shared/icons/next_age_goods.png`,true)+'" />' + 
                        HTML.Format(parseInt(parseInt(Profile.goods[CurrentEraID])) || 0));
                    }
                    if (Boosts.Sums.goods_production > 0)
                        cc.push('<span class="hidden-text">&nbsp;</span><span class="boost"> '+Boosts.Sums.goods_production + '% </span>');
                cc.push('</span>');
            }
			cc.push('</div>');

            cc.push('<div class="battleBoosts pad text-center">');
            cc.push('<h2>'+i18n('Boxes.PlayerProfile.BattleBoosts')+'</h2>');
            cc.push('<table><tr class="general">'
                +'<td>'+
                    '<span class="hidden-text">&numsp;&middot;&nbsp;</span><span class="aAtt">'+HTML.Format(parseInt(Boosts.Sums["att_boost_attacker"]))+'</span><span class="hidden-text">/</span>'
                    +'<span class="aDef">'+HTML.Format(parseInt(Boosts.Sums.def_boost_attacker))+'</span><span class="hidden-text">🔴</span>'
                +'</td><td></td><td>'+
                    '<span class="dAtt"><span class="hidden-text">🔵</span>'+HTML.Format(parseInt(Boosts.Sums.att_boost_defender))+'</span><span class="hidden-text">/</span>'
                    +'<span class="dDef">'+HTML.Format(parseInt(Boosts.Sums.def_boost_defender))+'</span>'+
                '</td></tr>');
            cc.push('<tr>'
                +'<td>'+
                    '<span class="hidden-text">&numsp;&middot;&nbsp;'+i18n('Boxes.General.Guild_Battlegrounds.short')+':&nbsp;</span>'+
                    '<span class="aAtt">'+HTML.Format(parseInt(Boosts.Sums['battleground-att_boost_attacker']+Boosts.Sums.att_boost_attacker))+'</span><span class="hidden-text">/</span>'
                    +'<span class="aDef">'+HTML.Format(parseInt(Boosts.Sums['battleground-def_boost_attacker']+Boosts.Sums.def_boost_attacker))+'</span><span class="hidden-text">🔴</span>'+
                '</td><td class="gbg"></td><td>'
                    +'<span class="dAtt"><span class="hidden-text">🔵</span>'+HTML.Format(parseInt(Boosts.Sums['battleground-att_boost_defender']+Boosts.Sums.att_boost_defender))+'</span><span class="hidden-text">/</span>'
                    +'<span class="dDef">'+HTML.Format(parseInt(Boosts.Sums['battleground-def_boost_defender']+Boosts.Sums.def_boost_defender))+'</span>'+
                '</td></tr>');
            cc.push('<tr>'
                +'<td>'
                    +'<span class="hidden-text">&numsp;&middot;&nbsp;'+i18n('Boxes.General.Guild_Expedition.short')+':&nbsp;</span>'
                    +'<span class="aAtt">'+HTML.Format(parseInt(Boosts.Sums['guild_expedition-att_boost_attacker']+Boosts.Sums.att_boost_attacker))+'</span><span class="hidden-text">/</span>'
                    +'<span class="aDef">'+HTML.Format(parseInt(Boosts.Sums['guild_expedition-def_boost_attacker']+Boosts.Sums.def_boost_attacker))+'</span><span class="hidden-text">🔴</span>'
                +'</td><td class="ge"></td><td>'
                    +'<span class="dAtt"><span class="hidden-text">🔵</span>'+HTML.Format(parseInt(Boosts.Sums['guild_expedition-att_boost_defender']+Boosts.Sums.att_boost_defender))+'</span><span class="hidden-text">/</span>'
                    +'<span class="dDef">'+HTML.Format(parseInt(Boosts.Sums['guild_expedition-def_boost_defender']+Boosts.Sums.def_boost_defender))+'</span> </td></tr>');

            if (Boosts.noSettlement['guild_raids-att_boost_attacker'] > 0 || Boosts.noSettlement['guild_raids-def_boost_attacker'] > 0 || Boosts.noSettlement['guild_raids-att_boost_defender'] > 0 || Boosts.noSettlement['guild_raids-def_boost_defender'] > 0)
                cc.push('<tr><td>'
                    +'<span class="hidden-text">&numsp;&middot;&nbsp;'+i18n('Boxes.General.Quantum_Incursion.short')+':&nbsp;</span>'
                    +'<span class="aAtt">'+HTML.Format(parseInt(Boosts.noSettlement['guild_raids-att_boost_attacker']))+'</span><span class="hidden-text">/</span><span class="aDef">'+HTML.Format(parseInt(Boosts.noSettlement['guild_raids-def_boost_attacker']))+'</span><span class="hidden-text">🔴</span>'
                +'</td><td class="qi"></td><td>'
                    +'<span class="dAtt"><span class="hidden-text">🔵</span>'+HTML.Format(parseInt(Boosts.noSettlement['guild_raids-att_boost_defender']))+'</span><span class="hidden-text">/</span><span class="dDef">'+HTML.Format(parseInt(Boosts.noSettlement['guild_raids-def_boost_defender']))+'</span> </td></tr>');
            cc.push('</tr></table>');
            
            if (Boosts.Sums.critical_hit_chance > 0)
                cc.push('<span class="hidden-text">&numsp;&middot;&nbsp;💥</span><span class="crit"><img src="'+srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_critical_hit_chance.png`,true)+'" /> '+Math.round(Boosts.Sums.critical_hit_chance*100)/100+'%</span>');
            cc.push('</div>');
            cc.push('</div>');

            // settlements
            cc.push('<div class="settlements pad showMore text-center">');
            cc.push('<h2>'+i18n('Boxes.PlayerProfile.Settlements')+'</h2>');
            if (Profile.settlements.length > 0) {
                for (let settlement of Profile.settlements) {
                    cc.push('<span class="'+settlement.id+' removable" data-original-title="'+settlement.descriptionCityTooltip.replace('%s',HTML.Format(parseInt(settlement.currentLevel.progress)))+'">');
                    cc.push('<img src="'+srcLinks.get(`/shared/icons/achievements/achievement_icons_${settlement.id}.png`,true)+'" />');
                    cc.push(HTML.Format(parseInt(settlement.currentLevel.progress)) + '</span>');
                }
            }
            else {
                cc.push(i18n('Boxes.PlayerProfile.NoSettlementsFinished'));
            }
            cc.push('</div>');

            // achievements
            cc.push('<div class="achievements pad showMore text-center">');
            cc.push('<h2>'+i18n('Boxes.PlayerProfile.GamePlay')+'</h2>');
            for (let achievement of Profile.achievementList) {
                let ach = achievement.split('#')
                let achFromList = Profile.achievements.find(x => x.id === ach[0]).achievements.find(x => x.id === ach[1]);
                if (isNaN(parseInt(achFromList?.currentLevel?.progress))) continue; 

                cc.push('<span class="removable" data-original-title="'+achFromList.descriptionTemplate.replace('%s/%s',HTML.Format(parseInt(achFromList.currentLevel.progress))).replace('%s-/%s-',HTML.Format(parseInt(achFromList.currentLevel.progress)))+'"><img src="'+srcLinks.get(`/shared/icons/achievements/achievement_icons_${ach[1]}.png`,true)+'" />'+
                HTML.FormatNumberShort(parseInt(achFromList.currentLevel.progress),true,'en-EN') + '</span>');
            }
            cc.push('</div>');
        cc.push('<img class="decoration" src="'+srcLinks.get(`/shared/gui/teaser/ui/teaser_decoration_bottom.png`,true)+'" />');
        cc.push('</div>');

        return cc.join('');
    },


    buildStockContent(isRebuilt) {
        let cr = [];
        cr.push('<div class="rightInfo showMore">');
        cr.push('<img class="decoration" src="'+srcLinks.get(`/shared/gui/window/window_decoration_side.png`,true)+'" />');
        cr.push('<div class="header">');
        cr.push('<img class="fp" src="'+srcLinks.get(`/shared/icons/quest_reward/icon_forgepoints.png`,true)+'" />');
        cr.push('<img class="alabaster" src="'+srcLinks.get(`/shared/icons/goods_large/icon_fine_marble.png`,true)+'" />');
        cr.push('<img src="'+srcLinks.get(`/shared/icons/reward_icons/reward_icon_boost_crate.png`,true)+'" />');
        cr.push('<img class="goods" src="'+srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_goods.png`,true)+'" />');
        cr.push('</div>');
		cr.push('<div class="stock pad text-center">');
		cr.push('<span class="removable"><img src="'+srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_forgepoints.png`,true)+'" />'+HTML.Format(StrategyPoints.InventoryFP || 0)+'</span>');
		cr.push('<span class="removable" data-original-title="'+HTML.Format(ResourceStock.medals)+'"><img src="'+srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_medals.png`,true)+'" />'+HTML.FormatNumberShort(ResourceStock.medals || 0,true,'en-EN')+'</span>');
		
		
		let currentGoods = 0, previousGoods = 0, nextGoods = 0;
		for (let good of Object.values(GoodsData)) {
			if (good.era === CurrentEra)
				currentGoods += (ResourceStock[good.id] || 0);
			if (good.era === Technologies.EraNames[CurrentEraID-1])
				previousGoods += (ResourceStock[good.id] || 0);
			if (good.era === Technologies.EraNames[CurrentEraID+1])
				nextGoods += (ResourceStock[good.id] || 0);
		}
		cr.push('<div class="goods">');
		if (previousGoods > 0)
			cr.push('<span class="removable" data-original-title="'+HTML.Format(previousGoods)+'"><img src="' + srcLinks.get(`/shared/icons/all_goods_of_previous_age.png`,true)+'" />' + HTML.FormatNumberShort(previousGoods,true,'en-EN') + '</span> ');
		if (currentGoods > 0)
			cr.push('<span class="removable" data-original-title="'+HTML.Format(currentGoods)+'"><img src="' + srcLinks.get(`/shared/icons/all_goods_of_age.png`,true)+'" />' + HTML.FormatNumberShort(currentGoods,true,'en-EN') + '</span> ');
		if (nextGoods > 0)
			cr.push('<span class="removable" data-original-title="'+HTML.Format(nextGoods)+'"><img src="' + srcLinks.get(`/shared/icons/next_age_goods.png`,true)+'" />' + HTML.FormatNumberShort(nextGoods,true,'en-EN') + '</span> ');
		cr.push('</div>');

		cr.push('<span class="secondary removable" data-original-title="'+HTML.Format(ResourceStock.tavern_silver)+'"><img src="'+srcLinks.get(`/shared/icons/eventwindow_tavern.png`,true)+'" />'+HTML.FormatNumberShort(ResourceStock.tavern_silver || 0,true,'en-EN')+'</span>');
		cr.push('<span class="secondary removable" data-original-title="'+HTML.Format(ResourceStock.gemstones)+'"><img src="'+srcLinks.get(`/shared/icons/gemstones.png`,true)+'" />'+HTML.Format(ResourceStock.gemstones || 0)+'</span>');
		cr.push('<span class="secondary removable" data-original-title="'+HTML.Format(ResourceStock.trade_coins)+'"><img src="'+srcLinks.get(`/shared/gui/antiquedealer/antiquedealer_currency_trade_coins.png`,true)+'" />'+HTML.FormatNumberShort(ResourceStock.trade_coins || 0,true,'en-EN')+'</span>');
		
		cr.push('</div>');

		cr.push('<div class="inventory pad text-center">');
		cr.push('<h2 class="border"><span>'+i18n('Boxes.MarketOffers.Inventory')+'</span></h2>');
		for (let item of Profile.inventoryList) {
			let itemInStock = Object.values(MainParser.Inventory).find(x => x.itemAssetName === item);
			if (item === 'rush_mass_supply_large') { // same asset as 6h rush, filter by speedup
				itemInStock = Object.values(MainParser.Inventory).filter(x => x.itemAssetName === item).find(x => x.item.duration === 86400);
			}
			if (itemInStock)
				cr.push('<span class="removable" data-original-title="'+itemInStock.name+'"><img src="'+srcLinks.get(`/shared/icons/reward_icons/reward_icon_${item}.png`,true)+'" />'+HTML.Format(itemInStock.inStock)+'</span>');
		}

		// get additional favorites
		cr.push('<div class="favorites">');
		let favCounter = 0;
		for(let item of Object.values(MainParser.Inventory)) {
			if (!item.favorite || Profile.inventoryList.find(x => x === item.itemAssetName)) continue;
			if (favCounter > 6) continue;
			if (item.itemAssetName !== "icon_fragment") { // do not include fragments
				cr.push('<span class="removable" data-original-title="'+item.name+'">');
				cr.push(srcLinks.icons(item.itemAssetName,true));
				cr.push(HTML.Format(item.inStock)+'</span>');
				favCounter++;
			}
		}
		cr.push('</div>');
		cr.push('</div>');
        cr.push('</div>');

        return cr.join('');
    },


    showOtherPlayer: () => {
		if ($('#OtherPlayerProfile').length > 0) {
			HTML.CloseOpenBox('OtherPlayerProfile');
			return;
		}

		HTML.Box({
			id: 'OtherPlayerProfile',
			title: ExtPlayerName,
			auto_close: true,
			dragdrop: true,
            class: 'playerprofile other'
		})
        HTML.AddCssFile('profile');

        let content = [];
        let n = (Profile.otherPlayer.other_player.is_guild_member === undefined && Profile.otherPlayer.other_player.is_friend === undefined);
        CityMap.OtherPlayer.eraName = Profile.otherPlayer.other_player.era;
        let buildings = Object.values(CityBuildings.createBuildings(Object.values(CityMap.OtherPlayer.mapData)));
        let boosts = {
            "critical_hit_chance": 0,
            "forge_points_production": 0,
            "goods_production": 0,
            "guild_goods_production": 0,
        };

        content.push('<div class="centerInfo otherPlayer">');
        content.push('<div class="basicInfo pad">');
        content.push('<img src="'+srcLinks.GetPortrait(Profile.otherPlayer.other_player.avatar)+'" />');
        content.push('<div>');
        content.push('<b>'+Profile.otherPlayer.other_player.name+'</b><br>');
        content.push('<span>'+i18n('Eras.'+Technologies.Eras[CityMap.OtherPlayer.eraName])+'</span><br>');
        content.push('<span class="ranking">'+HTML.Format(parseInt(Profile.otherPlayer.other_player.score))+'</span>');
        content.push('</div>');
        content.push('</div>');

        for (let building of buildings) {
            if (building.type === "street") continue;
            // gather boosts from efficiency ratings
            for (let [boost, value] of Object.entries(building.rating)) {
                if (boost.includes('-tile')) continue;
                if (boosts[boost] === undefined)
                    boosts[boost] = value;
                else
                    boosts[boost] += value;
            }
            if (building.boosts === undefined) continue;
            // gather other boosts
            for (let boost of building.boosts) {
                if (boost.type[0] === "critical_hit_chance")
                    boosts.critical_hit_chance += boost.value;
                if (boost.type[0] === "forge_points_production")
                    boosts.forge_points_production += boost.value;
                if (boost.type[0] === "goods_production")
                    boosts.goods_production += boost.value;
                if (boost.type[0] === "guild_goods_production")
                    boosts.guild_goods_production += boost.value;
            }
        }
        if (n) {
            boosts['att_boost_defender-all'] = Math.random() * 30000 + 300;
            boosts['def_boost_defender-all'] = Math.random() * 32000 + 300;
        }

        content.push('<div class="dailyProd pad text-center">');
        let fpSum = boosts.strategy_points;
        let fpBoost = '';
        if (boosts.forge_points_production > 0) {
            fpBoost = '<span class="boost"> '+boosts.forge_points_production + '% </span>';
            fpSum += (boosts.forge_points_production*boosts.strategy_points/100);
        }
        content.push('<span><img src="' + srcLinks.get(`/shared/icons/strategy_points.png`,true)+'" />' + HTML.Format(parseInt(fpSum)) + '</span> '+fpBoost);
        
        if (boosts.units > 0) {
			content.push('<span><img src="' + srcLinks.get(`/shared/gui/pvp_arena/hud/pvp_arena_icon_army.png`,true)+'" />'+HTML.Format(parseInt(boosts.units))+'</span><br>');
        }

        content.push('<div class="goods">');
        let currentGoodsSum = boosts['goods-current'];
        let prevGoodsSum = boosts['goods-previous'];
        let nextGoodsSum = boosts['goods-next'];
        let goodsBoost = '';
        if (boosts.goods_production > 0) {
            goodsBoost = '<span class="boost"> '+boosts.goods_production + '% </span>';
            currentGoodsSum += (boosts.goods_production*currentGoodsSum/100);
            prevGoodsSum += (boosts.goods_production*prevGoodsSum/100);
            nextGoodsSum += (boosts.goods_production*nextGoodsSum/100);
        }
        if (boosts['goods-previous'])
            content.push('<span><img src="' + srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_previous_era_good_production.png`,true)+'" />' + HTML.Format(parseInt(parseInt(prevGoodsSum)) || 0) + '</span> ');
        if (boosts['goods-current'])
            content.push('<span><img src="' + srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_goods.png`,true)+'" />' + HTML.Format(parseInt(parseInt(currentGoodsSum)) || 0) + '</span> ');
        if (boosts['goods-next'] !== 0)
            content.push('<span><img src="' + srcLinks.get(`/shared/icons/next_age_goods.png`,true)+'" />' + HTML.Format(parseInt(parseInt(nextGoodsSum)) || 0) + '</span> ');
        content.push(goodsBoost);

        let guildGoodsSum = boosts.clan_goods;
        let guildGoodsBoost = '';
        if (boosts.guild_goods_production > 0) {
            guildGoodsBoost = '<span class="boost"> '+boosts.guild_goods_production + '% </span>';
            guildGoodsSum += (guildGoodsSum*boosts.guild_goods_production/100);
        }
        if (guildGoodsSum)
            content.push('<span><img src="' + srcLinks.get(`/shared/icons/icon_great_building_bonus_guild_goods.png`,true)+'" />' + HTML.Format(parseInt(parseInt(guildGoodsSum)) || 0) + '</span> '+guildGoodsBoost);
        content.push('</div>');
        content.push('</div>');


        content.push('<div class="battleBoosts pad text-center">');
        content.push('<table><tr class="general">'
            +'<td><span class="aAtt">'+HTML.Format(parseInt(boosts['att_boost_attacker-all']))+'</span>'
            +'<span class="aDef">'+HTML.Format(parseInt(boosts['def_boost_attacker-all']))+'</span> </td>'
            +`<td></td><td><span class="dAtt ${n?'blur" data-original-title="'+i18n('Boxes.PlayerProfile.OtherPlayerNotAvailable')+'"':'"'}">`+HTML.Format(parseInt(boosts['att_boost_defender-all']))+'</span>'
            +`<span class="dDef ${n?'blur" data-original-title="'+i18n('Boxes.PlayerProfile.OtherPlayerNotAvailable')+'"':'"'}>`+HTML.Format(parseInt(boosts['def_boost_defender-all']))+'</span> </td></tr>');
        content.push('<tr>'
            +'<td><span class="aAtt">'+HTML.Format(parseInt(boosts['att_boost_attacker-battleground']+boosts['att_boost_attacker-all']))+'</span>'
            +'<span class="aDef">'+HTML.Format(parseInt(boosts['def_boost_attacker-battleground']+boosts['def_boost_attacker-all']))+'</span> </td>'
            +'<td><span class="gbg"></span></td><td><span class="dAtt">'+HTML.Format(parseInt(boosts['att_boost_defender-battleground']+boosts['att_boost_defender-all']))+'</span>'
            +'<span class="dDef">'+HTML.Format(parseInt(boosts['def_boost_defender-battleground']+boosts['def_boost_defender-all']))+'</span> </td></tr>');
        content.push('<tr>'
            +'<td><span class="aAtt">'+HTML.Format(parseInt(boosts['att_boost_attacker-guild_expedition']+boosts['att_boost_attacker-all']))+'</span>'
            +'<span class="aDef">'+HTML.Format(parseInt(boosts['def_boost_attacker-guild_expedition']+boosts['def_boost_attacker-all']))+'</span> </td>'
            +'<td><span class="ge"></span> </td><td><span class="dAtt">'+HTML.Format(parseInt(boosts['att_boost_defender-guild_expedition']+boosts['att_boost_defender-all']))+'</span>'
            +'<span class="dDef">'+HTML.Format(parseInt(boosts['def_boost_defender-guild_expedition']+boosts['def_boost_defender-all']))+'</span> </td></tr>');
        if (boosts['att_boost_attacker-guild_raids'] > 0 || boosts['def_boost_attacker-guild_raids'] > 0 || boosts['att_boost_defender-guild_raids'] > 0 || boosts['def_boost_defender-guild_raids'] > 0)
            content.push('<tr><td><span class="aAtt">'+HTML.Format(parseInt(boosts['att_boost_attacker-guild_raids']))+'</span><span class="aDef">'+HTML.Format(parseInt(boosts['def_boost_attacker-guild_raids']))+'</span> </td><td><span class="qi"></span></td><td><span class="dAtt">'+HTML.Format(parseInt(boosts['att_boost_defender-guild_raids']))+'</span><span class="dDef">'+HTML.Format(parseInt(boosts['def_boost_defender-guild_raids']))+'</span> </td></tr>');
        content.push('</tr></table>');
        
        if (boosts.critical_hit_chance > 0)
            content.push('<span class="crit"><img src="'+srcLinks.get(`/city/gui/great_building_bonus_icons/great_building_bonus_critical_hit_chance.png`,true)+'" /> '+Math.round(boosts.critical_hit_chance*100)/100+'%</span>');
        content.push('</div>');

        content.push('<div class="disclaimer clickable removable pad text-center">'+i18n('Boxes.PlayerProfile.OtherPlayerDisclaimer')+'<br><b>'+i18n('Boxes.PlayerProfile.OtherPlayerTroubleshooting')+'</b></div>');

        content.push('<div class="qiBoosts pad text-center">');
            if (boosts.guild_raids_coins_production + boosts.guild_raids_coins_start !== 0) {
                content.push('<span class="qicoins">');
                if (boosts.guild_raids_coins_production !== 0)
                    content.push(HTML.Format(parseInt(boosts.guild_raids_coins_production)) + '% ');
                if (boosts.guild_raids_coins_start !== 0)
                    content.push('+' + HTML.FormatNumberShort(parseInt(boosts.guild_raids_coins_start),true,'en-EN'));
                content.push('</span> ');
            }
            if (boosts.guild_raids_supplies_production + boosts.guild_raids_supplies_start !== 0) {
                content.push('<span class="qisupplies">');
                if (boosts.guild_raids_supplies_production !== 0)
                    content.push(HTML.Format(parseInt(boosts.guild_raids_supplies_production)) + '% ');
                if (boosts.guild_raids_supplies_start !== 0)
                    content.push('+' + HTML.FormatNumberShort(parseInt(boosts.guild_raids_supplies_start),true,'en-EN'));
                content.push('</span> ');
            }
            if (boosts.guild_raids_action_points_collection !== 0)
                content.push('<span class="qiactions">' + HTML.Format(parseInt(boosts.guild_raids_action_points_collection)) + '</span> ');
            if (boosts.guild_raids_goods_start)
                content.push('<span class="qigoods_start">+' + HTML.Format(parseInt(boosts.guild_raids_goods_start)) + '</span> ');
            if (boosts.guild_raids_units_start)
                content.push('<span class="qiunits_start">+' + HTML.Format(parseInt(boosts.guild_raids_units_start || 0)) + '</span> ');
            content.push('</div>');
        content.push('</div>');

        $('#OtherPlayerProfileBody').html(content.join('')).promise().done(function() {
            $('#OtherPlayerProfile').on('click', '.removable', function () {
                $(this).remove();
                $('.tooltip').remove();
            });
            $('#OtherPlayerProfile [data-original-title]').tooltip();
        });
	},


	formatDurationDays(days, locale="en-US", unitDisplay='long', style='long', type='conjunction') {
		let divMod = (v,days)=>[Math.floor(v/days),v%days],v;
		return new Intl.ListFormat(locale,{style:style, type:type}).format(
			["year","month","day"].map((unit,i)=>{
				[v,days] = i<2 ? divMod(days,[365.2425,30.436875][i]) : [Math.ceil(days)];
				return v?Intl.NumberFormat(locale,{style:'unit', unit, unitDisplay }).format(v):0;
			}).filter(v=>v));
	}
}