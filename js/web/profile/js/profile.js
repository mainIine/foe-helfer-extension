
FoEproxy.addHandler('AchievementsService','getOverview', (data, postData) => {
    Profile.init(data.responseData)
});

const Profile = {
    daysPlayed: 0,
    fpProduction: 0,
    fpBoost: 0,
    goods: {},
    guildGoods: 0,
    battleBoosts: {},

    init: (responseData) => {
        Profile.daysPlayed = responseData.achievementGroups.find(x => x.id == "special").achievements.find(x => x.id == 'foe_fanclub').currentLevel.progress || null
        Profile.showButton()
    },

	showButton: () => {
		if ($('#PlayerProfileButton').length === 0) {
			HTML.AddCssFile('profile');
			let div = $('<div />');

			div.attr({
				id: 'PlayerProfileButton',
				class: 'game-cursor'
			});

			$('body').append(div).promise().done(function() {
				div.append('<span onclick="Profile.show()"><img src="'+srcLinks.GetPortrait(ExtPlayerAvatar)+'" /></span>')
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

    buildBody: () => {
        let content = []
        let player = PlayerDict[ExtPlayerID];
        content.push('<div class="basicInfo pad">');
        content.push('<img src="'+srcLinks.GetPortrait(player.Avatar)+'" />');
        content.push('<div>');
        content.push('<h1>'+player.PlayerName+'</h1>');
        content.push('<span>'+i18n('Eras.'+CurrentEraID)+'</span><br>');
        content.push('<span class="ranking">'+HTML.Format(player.Score)+'</span>');
        content.push('<span>⚔'+HTML.Format(player.WonBattles)+'</span>');
        content.push('</div>');
        content.push('</div>');
        content.push('<div class="daysPlayed">');
        content.push(
            HTML.i18nReplacer(i18n('Boxes.PlayerProfile.DaysPlayed'), {
                number: HTML.Format(Profile.daysPlayed),
            }));
        content.push('</div>');
        content.push('</div>');

        content.push('<div class="dailyProd pad">');
        content.push('<h2>'+i18n('Boxes.PlayerProfile.DailyProduction')+'</h2>');
        if (Profile.fpProduction == 0 || Profile.guildGoods == 0)
            content.push('<span class="important">'+i18n('Boxes.PlayerProfile.OpenProduction')+'</span><br>');
        content.push('<span class="fp">' + HTML.Format(Profile.fpProduction) + ", " + i18n('General.Boost')+ ' ' +Boosts.Sums.forge_points_production + '%</span><br>');
        content.push('<div class="goods">')
        if (Profile.goods[CurrentEraID-2])
            content.push('<span class="prev">' + HTML.Format(parseInt(Profile.goods[CurrentEraID-2]) || 0) + '</span>');
        if (Profile.goods[CurrentEraID-1])
            content.push('<span class="current">' + HTML.Format(parseInt(Profile.goods[CurrentEraID-1]) || 0) + '</span>');
        if (Profile.goods[CurrentEraID])
            content.push('<span class="next">' + HTML.Format(parseInt(Profile.goods[CurrentEraID]) || 0) + '</span>');
        if (Profile.guildGoods)
            content.push('<span class="guild">' + HTML.Format(parseInt(Profile.guildGoods) || 0) + '</span>')
        content.push('</div>');
        content.push('<span class="qiactions">' + HTML.Format(Boosts.Sums.guild_raids_action_points_collection_no_settlement) + '</span><br>');
        content.push('</div>');

        content.push('<div class="battleBoosts pad">');
        content.push('<h2>'+i18n('Boxes.PlayerProfile.BattleBoosts')+'</h2>');
        content.push('<table><tr class="general">'
            +'<td><span class="aAtt">'+HTML.Format(Boosts.Sums.att_boost_attacker)+'</span>'
            +'<span class="aDef">'+HTML.Format(Boosts.Sums.def_boost_attacker)+'</span></td>'
            +'<td></td><td><span class="dAtt">'+HTML.Format(Boosts.Sums.att_boost_defender)+'</span>'
            +'<span class="dDef">'+HTML.Format(Boosts.Sums.def_boost_defender)+'</span></td></tr>');
        content.push('<tr>'
            +'<td><span class="aAtt">'+HTML.Format(Boosts.Sums['battleground-att_boost_attacker']+Boosts.Sums.att_boost_attacker)+'</span>'
            +'<span class="aDef">'+HTML.Format(Boosts.Sums['battleground-def_boost_attacker']+Boosts.Sums.def_boost_attacker)+'</span></td>'
            +'<td><span class="gbg"></span></td><td><span class="dAtt">'+HTML.Format(Boosts.Sums['battleground-att_boost_defender']+Boosts.Sums.att_boost_defender)+'</span>'
            +'<span class="dDef">'+HTML.Format(Boosts.Sums['battleground-def_boost_defender']+Boosts.Sums.def_boost_defender)+'</span></td></tr>');
        content.push('<tr>'
            +'<td><span class="aAtt">'+HTML.Format(Boosts.Sums['guild_expedition-att_boost_attacker']+Boosts.Sums.att_boost_attacker)+'</span>'
            +'<span class="aDef">'+HTML.Format(Boosts.Sums['guild_expedition-def_boost_attacker']+Boosts.Sums.def_boost_attacker)+'</span></td>'
            +'<td><span class="ge"></span></td><td><span class="dAtt">'+HTML.Format(Boosts.Sums['guild_expedition-att_boost_defender']+Boosts.Sums.att_boost_defender)+'</span>'
            +'<span class="dDef">'+HTML.Format(Boosts.Sums['guild_expedition-def_boost_defender']+Boosts.Sums.def_boost_defender)+'</span></td></tr>');
        content.push('<tr><td><span class="aAtt">'+HTML.Format(Boosts.Sums['guild_raids-att_boost_attacker_no_settlement'])+'</span><span class="aDef">'+HTML.Format(Boosts.Sums['guild_raids-def_boost_attacker_no_settlement'])+'</span></td><td><span class="qi"></span></td><td><span class="dAtt">'+HTML.Format(Boosts.Sums['guild_raids-att_boost_defender_no_settlement'])+'</span><span class="dDef">'+HTML.Format(Boosts.Sums['guild_raids-def_boost_defender_no_settlement'])+'</span></td></tr>');
        content.push('</tr></table></div>');

        $('#PlayerProfileBody').html(content.join(''));
    }
}