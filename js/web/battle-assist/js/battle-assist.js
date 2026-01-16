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
HTML.AddCssFile('battle-assist');
FoEproxy.addHandler('BattlefieldService', 'all', (data, postData) => {

	// if setting is true?
	if(!Settings.GetSetting('ShowRougeUnitWarning')){
		return;
	}

	$('#battleAssistNextEraDialog').remove();
    $('#battleAssistRogueDialog').remove();

    const state = data.responseData.__class__ === 'BattleRealm' ? data.responseData.state : data.responseData;

    if (state.__class__ !== 'BattleRealmState')
    	return;

    const { winnerBit, unitsOrder, ranking_data } = state;

    if (!winnerBit)
    	return;

    let alive = [], nextEraUnitDead = false;

    for (const unit of unitsOrder.filter(e => e.teamFlag === 1)) {
        if (unit.currentHitpoints) {
            alive.push(unit.unitTypeId);
        } else {
            const unitEra = Unit.Types.find(e => e.unitTypeId === unit.unitTypeId)?.minEra;
            if (CurrentEraID && Technologies.Eras[unitEra] > CurrentEraID)
            	nextEraUnitDead = true;
        }
    }

    let noTournament=!data?.responseData?.state?.ranking_data?.tournament_running || data?.responseData?.battleType?.type=="guild_expedition";
    // A unit from a future age has died
    //if (nextEraUnitDead)
    //	return BattleAssist.ShowNextEraDialog(noTournament);

    // There are no other opponents
    if (winnerBit !== 1 || !ranking_data?.nextArmy)
    	return;

    // Only rogues are still alive
    if (alive.filter(e => e !== 'rogue').length === 0)
    	return BattleAssist.ShowRogueDialog();
});

FoEproxy.addHandler('BattlefieldService', 'getArmyPreview', (data, postData) => {
    
    if(!Settings.GetSetting('ShowArmyAdvice'))	return;
    if (data.responseData?.__class__=="Error") return;
    
    $('#battleAssistArmyAdvice').remove();
    $('#battleAssistAddAdvice').remove();
    
    let bonus = data.responseData[0].units[0]?.bonuses[0]?.value || 0;
    let wave1 = data.responseData[0].units.map((x) => x.unitTypeId);
    let fightType = data.responseData[0].fightType.value;
    let wave2 = null;
    if (data.responseData[1]) {
        wave2 = data.responseData[1].units.map((x) => x.unitTypeId);
        fightType += data.responseData[1].fightType.value == fightType ? "": data.responseData[1].fightType.value;
    }
    BattleAssist.processArmies(wave1,wave2,bonus,fightType);
});

FoEproxy.addHandler('BattlefieldService', 'startByBattleType', (data, postData) => {
    
    if(!Settings.GetSetting('ShowArmyAdvice'))	return;
    let bt=data.responseData?.battleType?.type;
    if (!bt || bt=="pvp" || bt=="campaign") return;
    let opId = id = BattleAssist.armyRecent[0]?.id
    if (bt=="pvp_arena") {
        opponent = BattleAssist.ArenaOpponents[data.responseData?.battleType?.difficulty]
        if (!opponent) return;
        let wave1 = data.responseData.state.unitsOrder.filter(x=>x.ownerId!=ExtPlayerID).map(x=>x.unitTypeId)
        BattleAssist.processArmies(wave1,null,opponent.bonus,bt);
        opId = "pvp_arena%"+opponent.id;
    }
    

    $('#battleAssistArmyAdvice').remove();
    if (!data.responseData.state.winnerBit) return;
    let HPstart=0;
    let HPcurrent=0;
    let unitsLost=0;
        
    if (data.responseData.state.winnerBit==1) {
        let units = data.responseData.state.unitsOrder;
        units.forEach(x=>{
            if (x.unitId<0) return;
            HPstart += x.startHitpoints;
            if (!x.currentHitpoints) {
                unitsLost+=1;
            } else {
                HPcurrent += x.currentHitpoints;
            }
        })
    }
    if (data.responseData.state.winnerBit!=2 && unitsLost < BattleAssist.AASettings.lostUnits && HPstart - HPcurrent < BattleAssist.AASettings.lostHP) return;
    if (data.responseData.state.winnerBit==2 && !BattleAssist.AASettings.battleLost) return;
    if (bt!="pvp_arena" && BattleAssist.armyAdvice[opId] && BattleAssist.armyAdvice[opId].bonus < BattleAssist.armyRecent[0]?.bonus) return;
    BattleAssist.ShowAddAdvice();
    
});

FoEproxy.addHandler('BattlefieldService', 'surrender', (data, postData) => {
    if (!Settings.GetSetting('ShowArmyAdvice'))	return;
    if (!BattleAssist.AASettings.battleSurrendered) return
    if (BattleAssist.armyRecent[0] && BattleAssist.armyAdvice[BattleAssist.armyRecent[0]?.id] && BattleAssist.armyAdvice[BattleAssist.armyRecent[0]?.id].bonus < BattleAssist.armyRecent[0]?.bonus) return
    BattleAssist.ShowAddAdvice();
});
FoEproxy.addHandler('BattlefieldService', 'surrenderWave', (data, postData) => {
    if (!Settings.GetSetting('ShowArmyAdvice'))	return;
    if (!BattleAssist.AASettings.battleSurrendered) return
    if (BattleAssist.armyRecent[0] && BattleAssist.armyAdvice[BattleAssist.armyRecent[0]?.id] && BattleAssist.armyAdvice[BattleAssist.armyRecent[0]?.id].bonus < BattleAssist.armyRecent[0]?.bonus) return
    BattleAssist.ShowAddAdvice();
});

FoEproxy.addHandler('GuildExpeditionService', 'getOverview', (data, postData) => {
    for (e of data.responseData?.section?.encounters||[]) {
        BattleAssist.GEArmies[e.id||0] = e;
    }
});
FoEproxy.addHandler('GuildExpeditionService', 'getSection', (data, postData) => {
    for (e of data.responseData?.encounters||[]) {
        BattleAssist.GEArmies[e.id||0] = e;
    }
});
FoEproxy.addHandler('GuildExpeditionService', 'selectTrial', (data, postData) => {
    for (e of data.responseData?.section?.encounters||[]) {
        BattleAssist.GEArmies[e.id||0] = e;
    }
});
FoEproxy.addHandler('GuildExpeditionService', 'changeDifficulty', (data, postData) => {
    for (e of data.responseData?.section?.encounters||[]) {
        BattleAssist.GEArmies[e.id||0] = e;
    }
});

FoEproxy.addHandler('PVPArenaService', 'getOverview', (data, postData) => {
   BattleAssist.ArenaOpponents = Object.assign({},...data.responseData?.opponents.map(x=>({[x.difficulty]:{id:x?.opposingPlayer?.player?.name+"#"+x?.opposingPlayer?.player?.player_id,bonus:x.defenseArmyBoosts?.defenseBoost||0}})))
   BattleAssist.SelectedOpponent = null;
});
FoEproxy.addHandler('PVPArenaService', 'updateOpponents', (data, postData) => {
   setTimeout(()=>{
        BattleAssist.ArenaOpponents = Object.assign({},...data.responseData?.map(x=>({[x.difficulty]:{id:x?.opposingPlayer?.player?.name+"#"+x?.opposingPlayer?.player?.player_id,bonus:x.defenseArmyBoosts?.defenseBoost||0}})))
        BattleAssist.SelectedOpponent = null;
    },100);
});

FoEproxy.addRequestHandler('ArmyUnitManagementService', 'getArmyInfo', (postData) => {
    
    if(!Settings.GetSetting('ShowArmyAdvice'))	return;
    
    if (postData.requestData?.[0]?.battleType=="pvp_arena") {
        setTimeout(()=>{
            if (!BattleAssist.SelectedOpponent) return;
            if (!BattleAssist.armyAdvice["pvp_arena%"+BattleAssist.SelectedOpponent?.id]) return;
            BattleAssist.ShowArmyAdvice(BattleAssist.armyAdvice["pvp_arena%"+BattleAssist.SelectedOpponent.id].advice);
        },50);
    }   
    
    if (postData.requestData?.[0]?.battleType!="guild_expedition") return;
    
    $('#battleAssistArmyAdvice').remove();
    $('#battleAssistAddAdvice').remove();
    let encounter = BattleAssist.GEArmies[GExAttempts.state.GEprogress]
    
    let bonus = encounter.armyWaves[0].units[0]?.bonuses[0]?.value || 0;
    let wave1 = encounter.armyWaves[0].units.map((x) => x.unitTypeId);
    let wave2 = null;
    if (encounter.armyWaves[1]) {
        wave2 = encounter.armyWaves[1].units.map((x) => x.unitTypeId);
    }
    BattleAssist.processArmies(wave1,wave2,bonus,encounter.battleType);
});

mouseActions.addAction([[97, 69, 'Center'],[152, 116, 'Center']],()=>{
    BattleAssist.SelectedOpponent = BattleAssist.ArenaOpponents["hard"];
});  
mouseActions.addAction([[97, 144, 'Center'],[152, 191, 'Center']],()=>{
    BattleAssist.SelectedOpponent = BattleAssist.ArenaOpponents["medium"];
});  
mouseActions.addAction([[97, 219, 'Center'],[152, 266, 'Center']],()=>{
    BattleAssist.SelectedOpponent = BattleAssist.ArenaOpponents["easy"];
});  


/**
 * @type {{ShowRogueDialog: BattleAssist.ShowRogueDialog}}
 */
let BattleAssist = {

    armyAdvice: JSON.parse(localStorage.getItem("BattleAssistArmyAdvice") || "{}"),
    armyRecent:[],
    UnitOrder:null,
    AASettings: JSON.parse(localStorage.getItem("BattleAssistAASettings") || '{"lostUnits":2,"lostHP":40,"battleLost":true,"battleSurrendered":true}'),
    GEArmies:{},
    ArenaOpponents:{},
    SelectedOpponent: null,
	/**
	 * Shows a User Box when an army unit of the next age has died
	 *
	 * @constructor
	 *
    ShowNextEraDialog: (nT=false) => {
        
        HTML.Box({
            'id': 'battleAssistNextEraDialog',
            'title': i18n('Boxes.BattleAssist.Title'),
            'auto_close': true,
            'dragdrop': false,
            'minimize': false
        });
        $('#battleAssistNextEraDialogBody').html(`${i18n('Boxes.BattleAssist.Text.NextEra')}`);
        if (nT) $('#battleAssistNextEraDialog').addClass('BattleAssistNoTournamnt');
    },

	/**
	 * Shows a box warning when only agents are left after a fight
	 *
	 * @constructor
	 */
    ShowRogueDialog: () => {
        HTML.Box({
            'id': 'battleAssistRogueDialog',
            'title': i18n('Boxes.BattleAssist.Title'),
            'auto_close': true,
            'dragdrop': false,
            'minimize': false
        });
        //if (MainParser.ABTests["foe_abtest_army_ux"].group != "control_group") $('#battleAssistRogueDialog').addClass("ABnew")
        $('#battleAssistRogueDialogBody').html(`${i18n('Boxes.BattleAssist.Text.Rogue')}`);
    },
    
    /**
	 * Shows a box displaying advice
	 *
	 * @constructor
	 */
    ShowArmyAdvice: (advice) => {
        if ($('#battleAssistArmyAdvice').length == 0) {
            HTML.Box({
                'id': 'battleAssistArmyAdvice',
                'title': i18n('Boxes.BattleAssistArmyAdvice.Title'),
                'auto_close': true,
                'dragdrop': false,
                'minimize': false,
                'settings': 'BattleAssist.ShowArmyAdviceConfig()',
            });
        }
        $('#battleAssistArmyAdviceBody').html(`<span>${advice}</span>`);
    },

    /**
	 * Shows a Button for opening the config
	 *
	 * @constructor
	 */
    ShowAddAdvice: () => {
        if ($('#battleAssistAAConfig').length !== 0) return;
        if ($('#battleAssistAddAdvice').length !== 0) return;
        HTML.Box({
            'id': 'battleAssistAddAdvice',
            'title': i18n('Boxes.BattleAssistAddAdvice.Title'),
            'auto_close': true,
            'dragdrop': false,
            'minimize': false
        });
        $('#battleAssistAddAdviceBody').html(`<div onclick="BattleAssist.ShowArmyAdviceConfig()">${i18n('Boxes.BattleAssistAddAdvice')}</div>`);
    },


    /**
	 * Shows a box to configure the army advice
	 *
	 * @constructor
	 */
    ShowArmyAdviceConfig: () => {
        //clean up old entries - remove at some point
        for ([key, value] of Object.entries(BattleAssist.armyAdvice)) {
            if (/^GE5/.test(key)) {
                BattleAssist.armyAdvice[key.replace(/^GE5/,"defense%")]=structuredClone(value);
                delete BattleAssist.armyAdvice[key];
                localStorage.setItem("BattleAssistArmyAdvice",JSON.stringify(BattleAssist.armyAdvice));
            }
        }

        //remove Settings dialog of Box if opened via there
        $('#battleAssistArmyAdviceSettingsBox').remove();
        
        $('#battleAssistAddAdvice').remove();
        
        // Don't create a new box while another one is still open
        if ($('#battleAssistAAConfig').length === 0) {
            HTML.Box({
                id: 'battleAssistAAConfig',
                title: i18n('Boxes.BattleAssistAAConfig.Title'),
                auto_close: true,
                dragdrop: true,
                minimize: true,
                resize : true,
                settings: 'BattleAssist.ShowAASettingsButton()'
            });
        }
        let html=`<div class="explanation closed" onclick="BattleAssist.AAExp()">${i18n('Boxes.BattleAssistAAConfig.Exp')}</div>`;
        html += `<h1>${i18n('Boxes.BattleAssistAAConfig.RecentOpponents')}</h1>`;
        if (BattleAssist.armyRecent.length>0) {
            html += `<table class="foe-table"><tr><th>${i18n('Boxes.BattleAssistAAConfig.Wave1')}</th><th>${i18n('Boxes.BattleAssistAAConfig.Wave2')}</th><th>${i18n('Boxes.BattleAssistAAConfig.Bonus')}</th><th>${i18n('Boxes.BattleAssistAAConfig.Threshold')}</th><th>${i18n('Boxes.BattleAssistAAConfig.Advice')}</th></tr>`;
            for (let recent of BattleAssist.armyRecent) {
                html += `<tr><td><div class="BattleWave">`
                for (let unit of recent.wave1) {
                    html += `<img src="${srcLinks.get('/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_'+unit.replace("guild_raids_","")+'.jpg',true)}">`
                }            
                html += `</div></td><td><div class="BattleWave">`
                if (recent.wave2) {
                    for (let unit of recent.wave2) {
                        html += `<img src="${srcLinks.get('/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_'+unit.replace("guild_raids_","")+'.jpg',true)}">`
                    }
                }
                
                let PlayerName = (/^pvp_arena%(.*?)#/.exec(recent.id)||[""])[1];
                if (PlayerName) html += `<span>` + srcLinks.icons('feature_pvp_arena') +  `</span>` + PlayerName
            
                html += `</div></td><td>${recent.bonus}%`
                let advice = BattleAssist.armyAdvice[recent.id]?.advice
                let aBonus = BattleAssist.armyAdvice[recent.id]?.bonus;
                let id = recent.id;
                if (!advice) {//process neutral/old advice data
                    let tempId = recent.id.replace(/^(attack|defense)+%/,"");
                    advice = BattleAssist.armyAdvice[tempId]?.advice 
                    aBonus = BattleAssist.armyAdvice[tempId]?.bonus;
                    if (advice) id = tempId;
                }
                html += `</td><td class="AASetBonus" data-id="${id}">${aBonus ? aBonus +"%" : ""}`
                html += `</td><td class="AASetAdvice" data-id="${id}">${advice || ""}`
                html += `</td></tr>`
            }
            html += `</table>`
        }
        html += `<h1>${i18n('Boxes.BattleAssistAAConfig.AllConfigs')}</h1>`;
        
        if (Object.keys(BattleAssist.armyAdvice).length>0) {
            html += `<table class="foe-table"><tr><th>${i18n('Boxes.BattleAssistAAConfig.Wave1')}</th><th>${i18n('Boxes.BattleAssistAAConfig.Wave2')}</th><th>${i18n('Boxes.BattleAssistAAConfig.Threshold')}</th><th>${i18n('Boxes.BattleAssistAAConfig.Advice')}</th></tr>`;
            for (let [id,advice] of Object.entries(BattleAssist.armyAdvice)) {
                if (!advice) break;
                html += `<tr><td><div class="BattleWave">`
                for (let unit of advice.wave1) {
                    html += `<img src="${srcLinks.get('/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_'+unit.replace("guild_raids_","")+'.jpg',true)}">`
                }            
                html += `</div></td><td><div class="BattleWave">`
                if (advice.wave2) {
                    for (let unit of advice.wave2) {
                        html += `<img src="${srcLinks.get('/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_'+unit.replace("guild_raids_","")+'.jpg',true)}">`
                    }
                }

                PlayerName = (/^pvp_arena%(.*?)#/.exec(id)||[""])[1];
                if (PlayerName) html += `<span>` + srcLinks.icons('feature_pvp_arena') +  `</span>` + PlayerName

                html += `</div></td><td class="AASetBonus" data-id="${id}">${advice.bonus ? advice.bonus + "%" : ""}`
                html += `</td><td class="AASetAdvice" data-id="${id}">${advice.advice || ""}`
                html += `<div class="battleAssistOverrideTypeGroup">`
                let type = (/^(attack|defense)+%/.exec(id)||[""])[1];
                html += `<span class="battleAssistOverrideType${type=="attack"?" active":""}" data-type="attack"><img src="${srcLinks.get("/shared/gui/boost/boost_icon_bonus_attacking_all.png",true)}"></span>`
                html += `<span class="battleAssistOverrideType${type!="attack"&&type!="defense"?" active":""}" data-type=""><img src="${srcLinks.get("/shared/gui/boost/boost_icon_bonus_attacking_defending_all.png",true)}"></span>`
                html += `<span class="battleAssistOverrideType${type=="defense"?" active":""}" data-type="defense"><img src="${srcLinks.get("/shared/gui/boost/boost_icon_bonus_defending_all.png",true)}"></span>`
                html += `</div>`
                html += `</td></tr>`
            }
            html += `</table>`
        }

        $('#battleAssistAAConfigBody').html(html);
        $('.AASetBonus').on("click",(event)=>{
            let elm=event.target;
            let id = elm.dataset.id
            if (!id) return;
            elm.innerHTML = `<input type="Number" value="${BattleAssist.armyAdvice[id]?.bonus ? BattleAssist.armyAdvice[id]?.bonus:""}" onkeydown="BattleAssist.SetBonus(event)" onfocusout="BattleAssist.ShowArmyAdviceConfig()">`;
            $ (`.AASetBonus[data-id="${id}"] input`)[0].select();
        });
        
        $('.AASetAdvice').on("click",(event)=>{
            let elm=event.target;
            let id = elm.dataset.id
            if (!id) return;
            BattleAssist.overrideId=null
            
            elm.innerHTML = `
                <textarea maxlength="180" onfocusout="BattleAssist.ShowArmyAdviceConfig()" onkeydown="BattleAssist.SetAdvice(event)">${BattleAssist.armyAdvice[id]?.advice || ""}</textarea>`;
            $ (`.AASetAdvice[data-id="${id}"] textarea`)[0].select();
        });
        $(`.battleAssistOverrideType`).on("click",(event)=>{
            let id = $(event.target).parent().parent().parent().attr("data-id")
            let tr = $(event.target).parent().parent().parent().parent();
            $(`.AASetAdvice[data-id="${id}"] .battleAssistOverrideType`).removeClass("active");
            $(event.target).parent().addClass("active");
            let type = $(event.target).parent().data("type")
            let overrideId = type + (type!=""?"%":"") + id.replace(/^(attack|defense)+%/,"");
            let oldAdvice = structuredClone(BattleAssist.armyAdvice[id])
            delete BattleAssist.armyAdvice[id]; 
            BattleAssist.armyAdvice[overrideId]=oldAdvice;
            tr.find(`.AASetAdvice[data-id="${id}"]`).attr("data-id",overrideId);
            tr.find(`.AASetBonus[data-id="${id}"]`).attr("data-id",overrideId);
            localStorage.setItem("BattleAssistArmyAdvice",JSON.stringify(BattleAssist.armyAdvice));
        })
        
    },
    
    SetBonus: (e) => {
        if (e.key=="Escape") {
            BattleAssist.ShowArmyAdviceConfig();
            return;
        }
        if (e.key != "Enter") return;
        let elm = e.target;
        let td = elm.parentElement;
        let bonus = Number(elm.value);
        test = BattleAssist.armyAdvice[td.dataset.id]
        if (test) {
            test.bonus = bonus;
        } else {
            BattleAssist.AddAdvice(td.dataset.id,bonus,"");
        }
        localStorage.setItem("BattleAssistArmyAdvice",JSON.stringify(BattleAssist.armyAdvice));
        BattleAssist.ShowArmyAdviceConfig();
    },
    SetAdvice: (e) => {
        if (e.key=="Escape") {
            BattleAssist.ShowArmyAdviceConfig();
            return;
        }
        if (e.key != "Enter") return;
        let elm = e.target;
        let td = elm.parentElement;
        let advice = elm.value;
        let test = BattleAssist.armyAdvice[td.dataset.id]
        if (test) {
            test.advice = advice;
            if (advice=="") delete BattleAssist.armyAdvice[td.dataset.id];
        } else {
            BattleAssist.AddAdvice(td.dataset.id,null,advice);
        }
        localStorage.setItem("BattleAssistArmyAdvice",JSON.stringify(BattleAssist.armyAdvice));
        BattleAssist.ShowArmyAdviceConfig();
    },
    AddAdvice: (id, bonus, advice) => {
        let i= BattleAssist.armyRecent.findIndex(x => x.id==id);
        if (!bonus) bonus = BattleAssist.armyRecent[i].bonus;
        BattleAssist.armyAdvice[id] = {bonus:bonus,advice:advice,wave1:BattleAssist.armyRecent[i].wave1,wave2:BattleAssist.armyRecent[i].wave2};
    },
    AAExp: () => {
        let elem = $('#battleAssistAAConfig .explanation')[0];
        elem.classList.toggle("closed");
        if (elem.classList.contains("closed")) {
            elem.innerHTML = i18n('Boxes.BattleAssistAAConfig.Exp');
        } else {
            elem.innerHTML = i18n('Boxes.BattleAssistAAConfig.Explanation');
        }
        
    },
    ShowAASettingsButton: () => {

        let h = [];
		h.push(`<p>${i18n('Boxes.BattleAssistAAConfig.when')}<p>`)
        h.push(`<table class="foe-table"><tr><td>`)
        h.push(`${i18n('Boxes.BattleAssistAAConfig.lostUnits')}</td><td>`);
        h.push(`<input type="Number" id="AAlostUnits" oninput="BattleAssist.SaveAASettings()" value="${BattleAssist.AASettings.lostUnits}"></td></tr><tr><td>`);
        h.push(`${i18n('Boxes.BattleAssistAAConfig.lostHP')}</td><td>`);
        h.push(`<input type="Number" id="AAlostHP" oninput="BattleAssist.SaveAASettings()" value="${BattleAssist.AASettings.lostHP}"></td></tr><tr><td>`);
        h.push(`${i18n('Boxes.BattleAssistAAConfig.battleLost')}</td><td>`);
        h.push(`<input type="checkbox" id="AAbattleLost" oninput="BattleAssist.SaveAASettings()"${BattleAssist.AASettings.battleLost ? ' checked' : ''}></td></tr><tr><td>`);
        h.push(`${i18n('Boxes.BattleAssistAAConfig.battleSurrendered')}</td><td>`);
        h.push(`<input type="checkbox" id="AAbattleSurrendered" oninput="BattleAssist.SaveAASettings()"${BattleAssist.AASettings.battleSurrendered ? ' checked' : ''}></td></tr></table>`);
         
		$('#battleAssistAAConfigSettingsBox').html(h.join(''));
		$("#battleAssistAAConfigSettingsBox input").keyup(function(event) {
			if (event.keyCode === 13) {
				$("#battleAssistAAConfigButtons .window-settings").trigger("click");
			}
		});
    },

    SaveAASettings: () => {
        BattleAssist.AASettings.lostUnits = Number($('#AAlostUnits').val()) || 2;
		BattleAssist.AASettings.lostHP = Number($('#AAlostHP').val()) || 40;
        BattleAssist.AASettings.battleLost = $('#AAbattleLost')[0].checked;
		BattleAssist.AASettings.battleSurrendered = $('#AAbattleSurrendered')[0].checked;
		localStorage.setItem('BattleAssistAASettings', JSON.stringify(BattleAssist.AASettings));
    },
    processArmies: (wave1, wave2, bonus, type) => {
        let id= type+"%";
        if (!BattleAssist.UnitOrder) {
            BattleAssist.UnitOrder={};
            let temp = Unit.Types.map(x=> ({id:x.unitTypeId,era:x.minEra}));
            temp.sort((a,b)=>{
                if (a.id < b.id) {
                  return -1;
                }
                if (a.id > b.id) {
                  return 1;
                }
                return 0;
            });
            temp.sort((a,b)=> Technologies.Eras[a.era]-Technologies.Eras[b.era]);
            temp.forEach((x,i)=> BattleAssist.UnitOrder[x.id] = i);
        }
        
        wave1.sort((a,b) => BattleAssist.UnitOrder[b] - BattleAssist.UnitOrder[a]);
        if (type!="pvp_arena") wave1.forEach(x => id+=x);
        if (wave2) {
            wave2.sort((a,b) => BattleAssist.UnitOrder[b] - BattleAssist.UnitOrder[a]);
            if (type!="pvp_arena") wave2.forEach(x => id+=x);
        }
        if (type=="pvp_arena") {
            if (!BattleAssist.SelectedOpponent?.id) return;
            id += BattleAssist.SelectedOpponent.id;
        }

        let army= {id:id,wave1:wave1, wave2:wave2, bonus:bonus};
        if (type == "pvp_arena" && BattleAssist.armyAdvice[id]) {
            BattleAssist.armyAdvice[id].wave1 = wave1;
        }
        let i= BattleAssist.armyRecent.findIndex(x => x.id==id);
        if (i>-1) BattleAssist.armyRecent.splice(i,1);
        BattleAssist.armyRecent.unshift(army);
        if (BattleAssist.armyRecent.length>5) BattleAssist.armyRecent.pop;
        let advice = BattleAssist.armyAdvice[id]?.advice
        let aBonus = BattleAssist.armyAdvice[id]?.bonus;
        if (!advice) {//process old advice data
            advice = BattleAssist.armyAdvice[id.replace(/^(attack|defense)+%/,"")]?.advice 
            aBonus = BattleAssist.armyAdvice[id.replace(/^(attack|defense)+%/,"")]?.bonus;
        }
        if (advice && aBonus <= bonus && type != "pvp_arena") 
            BattleAssist.ShowArmyAdvice(advice);
        
        if ($('#battleAssistAAConfig').length > 0) BattleAssist.ShowArmyAdviceConfig();
    }
};

