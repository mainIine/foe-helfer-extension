/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

// GEX started
FoEproxy.addHandler('GuildExpeditionService', 'getOverview', (data, postData) => {
	BonusService.InitBonus(true);
});

// World map
FoEproxy.addHandler('CampaignService', 'start', (data, postData) => {
	BonusService.InitBonus();
});

// neihbor is visit
FoEproxy.addHandler('OtherPlayerService', 'visitPlayer', (data, postData) => {
	let OtherPlayer = data.responseData.other_player;
	let IsPlunderable = (OtherPlayer.is_neighbor && !OtherPlayer.is_friend && !OtherPlayer.is_guild_member);

	if (IsPlunderable) {
		BonusService.InitBonus();
	}
});

// Bonus get updated
FoEproxy.addHandler('BonusService', 'getLimitedBonuses', (data, postData) => {
	BonusService.Bonuses = data['responseData'];

	FoEproxy.triggerFoeHelperHandler('BonusUpdated');

	if ($('#bonus-hud').length > 0) {
		BonusService.CalcBonusData();
	}
});

FoEproxy.addFoeHelperHandler('QuestsUpdated', data => {
	if ($('#bonus-hud').length == 0) return;
		BonusService.CalcBonusData();
});

// Guildfights enter
FoEproxy.addHandler('GuildBattlegroundService', 'getBattleground', (data, postData) => {
	BonusService.InitBonus();
});

// main is entered
FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
	BonusService.HideBonusSidebar();
});


/**
 *
 * @type {{BonusTypes: [string, string, string, string, string], HideBonusSidebar: BonusService.HideBonusSidebar, SetBonusTypes: BonusService.SetBonusTypes, InitBonus: BonusService.InitBonus, Bonuses: [], CalcBonusData: BonusService.CalcBonusData, ShowBonusSidebar: BonusService.ShowBonusSidebar}}
 */
let BonusService = {
	
	timeout:null,
	Bonuses: [],
	BonusTypes: [
		'first_strike',
		'spoils_of_war',
		'diplomatic_gifts',
		'missile_launch',
		'aid_goods',
		'donequests'
	],

	/**
	 * InitBonus with offset for GEX
	 *
	 * @param isGex
	 * @constructor
	 */
	InitBonus: (isGex = false)=> {
		if($('#bonus-hud').length === 0){
			HTML.AddCssFile('bonus-service');

			// wait 2s
			BonusService.timeout = setTimeout(()=>{
				BonusService.ShowBonusSidebar(isGex);
				BonusService.timeout = null;
			},2000);
		}
	},


	/**
	 * Create a wrapper "hud" for the icons
	 *
	 * @param isGex
	 * @constructor
	 */
	ShowBonusSidebar: (isGex)=> {

		let div = $('<div />');

		div.attr({
			id: 'bonus-hud',
			class: 'game-cursor'
		});

		if(isGex){
			div.css({
				top: 182,
				right: 0
			});
		}

		$('body').append(div).promise().done(function(){
			BonusService.SetBonusTypes(isGex);
		});
	},


	/**
	 * Removes the bonus-Hud
	 */
	HideBonusSidebar: ()=> {
		if (BonusService.timeout !== null) {
			clearTimeout(BonusService.timeout);
			BonusService.timeout = null;
		}
		if($('#bonus-hud').length > 0){
			$('#bonus-hud').fadeToggle(function(){
				$(this).remove();
			});
		}
	},


	/**
	 * Box content
	 *
	 * @param isGex
	 * @constructor
	 */
	SetBonusTypes: (isGex)=> {
		const bt = BonusService.BonusTypes,
			d = BonusService.Bonuses,
			hud = $('#bonus-hud');

		for(let i in bt)
		{
			if(!bt.hasOwnProperty(i)){
				break;
			}

			// skip aid goods in gex
			if(isGex && bt[i] === 'aid_goods'){
				continue;
			}

			let b;
			if (bt[i] === 'donequests') {
				b = {
					type: "donequests",
					amount: BonusService.GetDoneQuestsCount()
				};
			}
			else {
				b = d.find(e => (e['type'] === bt[i]));
			}

			if(b !== undefined){
				let sp = $('<div />'),
					sb = $('<span />'),
					si = $('<span />');

				sp.attr({
					class: `hud-btn`,
					title: 'FoE Helper: '+i18n('Boxes.BonusService.'+bt[i]),
				}).tooltip({
					placement: 'left'
				});

				sb.attr({
					class: `${bt[i]}-icon icon`
				});

				si.attr({
					id: `${bt[i]}-bonus`,
					class: 'bonus'
				});

				if(b['amount'] === undefined || b['amount'] <= 0){
					sp.addClass('hud-btn-red');
					si.css({
						display: 'none'
					});

				} else {
					si.text(b['amount']);
				}

				hud.append( sp.append(sb).append(si) );
			}
		}
	},


	/**
	 * Show the bonus amount
	 */
	CalcBonusData: ()=> {
		const bt = BonusService.BonusTypes,
			d = BonusService.Bonuses,
			hud = $('#bonus-hud');

		for(let i in bt)
		{
			if(!bt.hasOwnProperty(i)){
				break;
			}

			let b;
			if (bt[i] === 'donequests') {
				b = {
					type: "donequests",
					amount: BonusService.GetDoneQuestsCount()
				};
			}
			else {
				b = d.find(e => (e['type'] === bt[i]));
			}

			if(b !== undefined){

				let si = hud.find(`#${b['type']}-bonus`),
					a = parseInt(si.text());

				// Bonus is empty
				if (b['amount'] === undefined || b['amount'] <= 0) {
					si.closest('.hud-btn').addClass('hud-btn-red');
					si.hide();
				}

				// Bonus ticker down, when changed
				else if (a !== b['amount']) {
					si.closest('.hud-btn').removeClass('hud-btn-red');
					si.show();

					si.text(b['amount']);

					si.addClass('bonus-blink');

					if (bt[i] === 'donequests') {
						helper.sounds.play("message");
					}

					setTimeout(()=>{
						si.removeClass('bonus-blink');
					}, 3500);
				}
			}
		}
	},

	/**
	 * Überprüft, ob ein Quest erledigt ist
	 */
	GetDoneQuestsCount: () => {
		if (!MainParser.Quests) return 0;

		let Ret = 0;
		for (let i = 0; i < MainParser.Quests.length; i++) {
			let Quest = MainParser.Quests[i];
			if (Quest['category'] === 'outpost') continue;
			if (Quest['type'] === 'ReplayableSeason_Allies_Milestone') continue;
			if (Quest['state'] === 'collectReward') Ret += 1;
		}
		return Ret;
    }
}
