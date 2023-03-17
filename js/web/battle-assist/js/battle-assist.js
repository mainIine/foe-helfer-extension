/*
 * **************************************************************************************
 * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
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

	HTML.CloseOpenBox('battleAssistNextEraDialog');
    HTML.CloseOpenBox('battleAssistRogueDialog');

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
    if (nextEraUnitDead)
    	return BattleAssist.ShowNextEraDialog(noTournament);

    // There are no other opponents
    if (winnerBit !== 1 || !ranking_data?.nextArmy)
    	return;

    // Only agents are still alive
    if (alive.filter(e => e !== 'rogue').length === 0)
    	return BattleAssist.ShowRogueDialog();
});

FoEproxy.addHandler('BattlefieldService', 'getArmyPreview', (data, postData) => {
    
    if(!Settings.GetSetting('ShowArmyAdvice'))	return;
    
    $('#battleAssistArmyAdvice').remove();
    $('#battleAssistAddAdvice').remove();
    
    let bonus = data.responseData[0].units[0]?.bonuses[0]?.value || 0;
    let wave1 = data.responseData[0].units.map((x) => x.unitTypeId);
    let wave2 = null;
    if (data.responseData[1]) {
        wave2 = data.responseData[1].units.map((x) => x.unitTypeId);
    }
    BattleAssist.processArmies(wave1,wave2,bonus);
});

FoEproxy.addHandler('BattlefieldService', 'startByBattleType', (data, postData) => {
    
    if(!Settings.GetSetting('ShowArmyAdvice'))	return;
    let bt=data.responseData.battleType.type;
    if (bt=="pvp_arena" || bt=="pvp" || bt=="campaign") return;

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
    if (BattleAssist.armyAdvice[BattleAssist.armyRecent[0].id] && BattleAssist.armyAdvice[BattleAssist.armyRecent[0].id].bonus < BattleAssist.armyRecent[0].bonus) return
    BattleAssist.ShowAddAdvice();
    
});

FoEproxy.addHandler('BattlefieldService', 'surrender', (data, postData) => {
    if (!Settings.GetSetting('ShowArmyAdvice'))	return;
    if (!BattleAssist.AASettings.battleSurrendered) return
    if (BattleAssist.armyRecent[0] && BattleAssist.armyAdvice[BattleAssist.armyRecent[0].id] && BattleAssist.armyAdvice[BattleAssist.armyRecent[0].id].bonus < BattleAssist.armyRecent[0].bonus) return
    BattleAssist.ShowAddAdvice();
});
FoEproxy.addHandler('BattlefieldService', 'surrenderWave', (data, postData) => {
    if (!Settings.GetSetting('ShowArmyAdvice'))	return;
    if (!BattleAssist.AASettings.battleSurrendered) return
    if (BattleAssist.armyRecent[0] && BattleAssist.armyAdvice[BattleAssist.armyRecent[0].id] && BattleAssist.armyAdvice[BattleAssist.armyRecent[0].id].bonus < BattleAssist.armyRecent[0].bonus) return
    BattleAssist.ShowAddAdvice();
});
FoEproxy.addHandler('GuildExpeditionService', 'getEncounter', (data, postData) => {
    if(!Settings.GetSetting('ShowArmyAdvice'))	return;
    
    $('#battleAssistArmyAdvice').remove();
    $('#battleAssistAddAdvice').remove();
    
    let bonus = data.responseData.armyWaves[0].units[0]?.bonuses[0]?.value || 0;
    let wave1 = data.responseData.armyWaves[0].units.map((x) => x.unitTypeId);
    let wave2 = null;
    let GE5 = data.responseData.hasOwnProperty("availableBuildings") && data.responseData.availableBuildings.length > 0;
    if (data.responseData.armyWaves[1]) {
        wave2 = data.responseData.armyWaves[1].units.map((x) => x.unitTypeId);
    }
    BattleAssist.processArmies(wave1,wave2,bonus,GE5);
});

/**
 * @type {{ShowRogueDialog: BattleAssist.ShowRogueDialog, ShowNextEraDialog: BattleAssist.ShowNextEraDialog}}
 */
let BattleAssist = {

    armyAdvice: JSON.parse(localStorage.getItem("BattleAssistArmyAdvice") || "{}"),
    armyRecent:[],
    UnitOrder:null,
    AASettings: JSON.parse(localStorage.getItem("BattleAssistAASettings") || '{"lostUnits":2,"lostHP":40,"battleLost":true,"battleSurrendered":true}'),

	/**
	 * Shows a User Box when an army unit of the next age has died
	 *
	 * @constructor
	 */
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
        $('#battleAssistRogueDialogBody').html(`${i18n('Boxes.BattleAssist.Text.Rogue')}`);
    },
    
    /**
	 * Shows a box displaying advice
	 *
	 * @constructor
	 */
    ShowArmyAdvice: (advice) => {
        HTML.Box({
            'id': 'battleAssistArmyAdvice',
            'title': i18n('Boxes.BattleAssistArmyAdvice.Title'),
            'auto_close': true,
            'dragdrop': false,
            'minimize': false,
            'settings': 'BattleAssist.ShowArmyAdviceConfig()',
        });
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
            for (let x of BattleAssist.armyRecent) {
                html += `<tr><td><div class="BattleWave">`
                for (let unit of x.wave1) {
                    html += `<img src="${srcLinks.get('/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_'+unit+'.jpg',true)}">`
                }            
                html += `</div></td><td><div class="BattleWave">`
                if (x.wave2) {
                    for (let unit of x.wave2) {
                        html += `<img src="${srcLinks.get('/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_'+unit+'.jpg',true)}">`
                    }
                }            
                html += `</div></td><td>${x.bonus}%`
                html += `</td><td class="AASetBonus" data-id="${x.id}">${BattleAssist.armyAdvice[x.id]?.bonus ? BattleAssist.armyAdvice[x.id]?.bonus +"%" : ""}`
                html += `</td><td class="AASetAdvice" data-id="${x.id}">${BattleAssist.armyAdvice[x.id]?.advice || ""}`
                html += `</td></tr>`
            }
            html += `</table>`
        }
        html += `<h1>${i18n('Boxes.BattleAssistAAConfig.AllConfigs')}</h1>`;
        
        if (Object.keys(BattleAssist.armyAdvice).length>0) {
            html += `<table class="foe-table"><tr><th>Wave 1</th><th>Wave 2</th><th>Set Threshold</th><th>Advice</th></tr>`;
            for (let id of Object.keys(BattleAssist.armyAdvice)) {
                let x=BattleAssist.armyAdvice[id];
                if (!x) break;
                html += `<tr><td><div class="BattleWave">`
                for (let unit of x.wave1) {
                    html += `<img src="${srcLinks.get('/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_'+unit+'.jpg',true)}">`
                }            
                html += `</div></td><td><div class="BattleWave">`
                if (x.wave2) {
                    for (let unit of x.wave2) {
                        html += `<img src="${srcLinks.get('/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_'+unit+'.jpg',true)}">`
                    }
                }            
                html += `</td><td class="AASetBonus" data-id="${id}">${x.bonus ? x.bonus + "%" : ""}`
                html += `</td><td class="AASetAdvice" data-id="${id}">${x.advice || ""}`
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
            $ (`.AASetBonus[data-id=${id}] input`)[0].select();
        });
        
        $('.AASetAdvice').on("click",(event)=>{
            let elm=event.target;
            let id = elm.dataset.id
            if (!id) return;
            elm.innerHTML = `<textarea maxlength="180" onfocusout="BattleAssist.ShowArmyAdviceConfig()" onkeydown="BattleAssist.SetAdvice(event)">${BattleAssist.armyAdvice[id]?.advice || ""}</textarea>`;
            $ (`.AASetAdvice[data-id=${id}] textarea`)[0].select();
        });
        
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
    processArmies: (wave1, wave2, bonus, GE5=false) => {
        let id= GE5? "GE5":"";
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
        wave1.forEach(x => id+=x);
        if (wave2) {
            wave2.sort((a,b) => BattleAssist.UnitOrder[b] - BattleAssist.UnitOrder[a]);
            wave2.forEach(x => id+=x);
        }
        
        let army= {id:id,wave1:wave1, wave2:wave2, bonus:bonus};
        let i= BattleAssist.armyRecent.findIndex(x => x.id==id);
        if (i>-1) BattleAssist.armyRecent.splice(i,1);
        BattleAssist.armyRecent.unshift(army);
        if (BattleAssist.armyRecent.length>5) BattleAssist.armyRecent.pop;    
        if (BattleAssist.armyAdvice[id] && BattleAssist.armyAdvice[id].bonus <= bonus) {
            BattleAssist.ShowArmyAdvice(BattleAssist.armyAdvice[id].advice);
        }
        if ($('#battleAssistAAConfig').length > 0) BattleAssist.ShowArmyAdviceConfig();
    }
};

