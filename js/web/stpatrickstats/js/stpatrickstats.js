
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
var stPat = {
    
    workshop_1 : {level:0, manager:0, baseData: {}, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
    workshop_2 : {level:0, manager:0, baseData: {}, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
    workshop_3 : {level:0, manager:0, baseData: {}, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
    workshop_4 : {level:0, manager:0, baseData: {}, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
    workshop_5 : {level:0, manager:0, baseData: {}, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
    transport_1 : {level:0, manager:0, baseData: {}, production:0, degree:0, next:0, need:0, ndegree:0, type: 'ship'},
    market_1 : {level:0, manager:0, baseData: {}, production:0, degree:0, next:0, need:0, ndegree:0, type: 'fest'},

};

var stPatNums = {
    0 : "",
    1 : "K",
    2 : "M",
    3 : "B",
    4 : "T",
    5 : "Q",
}

FoEproxy.addHandler('IdleGameService', 'getState', (data, postData) => {

    // Don't create a new box while another one is still open
    if ($('#stPatrickDialog').length == 0) stPatrick.ShowDialog();
    
    //let data2 = JSON.parse(data['responseData']);
    for (let x in data.responseData.characters) {
        let character = data.responseData.characters[x];
        stPat[character.id].level = character.level|0;
        stPat[character.id].manager = character.managerLevel|0;
    }
       
    stPatrickUpdateDialog();
}
)
FoEproxy.addHandler('IdleGameService', 'performActions', (data, postData) => {
    if(postData[0]['requestClass'] !== 'IdleGameService')
    return;
    for (var x in postData[0]['requestData'][1]) {
        let data2 = postData[0]['requestData'][1][x]; 
        if (data2.type=="upgrade_level") stPat[data2.characterId].level += data2.amount;
        if (data2.type=="upgrade_manager") stPat[data2.characterId].manager += data2.amount;  
    } 
    if ($('#stPatrickDialog').length > 0) {
        stPatrickUpdateDialog();
    }

})

FoEproxy.addMetaHandler('idle_game', (data, postData) => {
    
    let data2 = JSON.parse(data['response']);
    for (let x in data2.configs[0].characters) {
        let character = data2.configs[0].characters[x];
        stPat[character.id].baseData = character;   
    }
}
)

function stPatrickUpdateDialog() {
for (let building in stPat) {
    building = stPatProduction(stPat[building])
}
var degree = 0;
var sum = 0;

for (let b in stPat) {
    if (stPat[b].degree > degree && stPat[b].type=='work'){
        degree = stPat[b].degree;
    }
}

for (let b in stPat) {
    if (stPat[b].type == 'work'){
        sum += Math.pow(1000, stPat[b].degree - degree) * stPat[b].production
    }
}

while (sum > 1000 && degree<5) {
    sum /= 1000;
    degree += 1;
}


var ident = '#stPatWork';
var work = sum;
var workd = degree;
var ship = stPat['transport_1'].production;
var shipd = stPat['transport_1'].degree;
var fest = stPat['market_1'].production;
var festd = stPat['market_1'].degree;

if (shipd < degree || (shipd == degree && ship < sum)) {
    degree = shipd;
    sum = ship;
    ident = '#stPatShip'
}
if (festd < degree || (festd == degree && fest < sum)) {
    ident = '#stPatFest'
}

$('#stPatWork')[0].classList.remove("highlight");
$('#stPatShip')[0].classList.remove("highlight");
$('#stPatFest')[0].classList.remove("highlight");
$(ident)[0].classList.add("highlight");

for (let x in stPat) {
    $('#stPat'+x+'Level')[0].innerHTML = `${stPat[x].level} -> ${stPat[x].next}`
    $('#stPat'+x)[0].innerHTML = `${stPat[x].need.toPrecision(3)} ${stPatNums[stPat[x].ndegree]}`
}

$('#stPatWork')[0].innerHTML=`${work.toPrecision(3)} ${stPatNums[workd]}`;
$('#stPatShip')[0].innerHTML=`${ship.toPrecision(3)} ${stPatNums[shipd]}`;
$('#stPatFest')[0].innerHTML=`${fest.toPrecision(3)} ${stPatNums[festd]}`;
}

function stPatProduction (building) {
    if (building.level == 0) {
        building.next = 1;
        building.need = building.baseData.buyCostValue;
        building.ndegree = building.baseData.buyCostDegree;
        return building;
    }
 
    var p = building.baseData.baseProductionValue;
    var d = building.baseData.baseProductionDegree|0;
    var t = building.baseData.productionDuration+building.baseData.rechargeDuration;
    var pbonus = 0;
    var tbonus = 0;
    p *= building.level;
    while (p >= 1000 && d<5) {
        p /= 1000;
        d += 1;
    }

    var x = 0;
    for (var rank in building.baseData.rankProductionLevels) {
        x = building.baseData.rankProductionLevels[rank];
        if (x > building.level) {
            break;
        }
        else {
            p *= building.baseData.rankProductionModifiers[rank] + 1;
        }
        rank += 1;
    }
    
    while (p >= 1000 && d<5) {
        p /= 1000;
        d += 1;
    }
    
    while (building.level >= x) {
        x += building.baseData.rankProductionEndlessLevel;
        if (building.level >= x) {
            p *= building.baseData.rankProductionEndlessModifier + 1;
        }
    }

    building.next = x;
   
    var base = building.baseData.baseUpgradeCostValue;
    var growth = building.baseData.upgradeCostGrowthRate;
    var need = 0;
    var ndegree = building.baseData.baseUpgradeCostDegree|0;
    
    for (i=building.level;i<x;i++) {
        need += Math.pow(growth,i-1)*base;
    }
    console.log(need);
    console.log(ndegree);

    while (need >= 1000 && ndegree<5) {
        need /= 1000;
        ndegree += 1;
    }
    
    building.need = need;
    building.ndegree = ndegree; 

    while (p >= 1000 && d<5) {
        p /= 1000;
        d += 1;
    }
    
    for (i in building.baseData.bonuses) {
        let bonus = building.baseData.bonuses[i];
        if (building.manager < bonus.level) {
            break;
        }
        switch (bonus.type) {
            case 'production':
                pbonus += bonus.amount;
                break;
            case 'speed':
                tbonus += bonus.amount;
        }
    }
    p *= 1 + pbonus;
    t /= 1 + tbonus;
    p *= 3600/t;
    while (p >= 1000 && d<5) {
        p /= 1000;
        d += 1;
    }
    
    if (building.manager > 0) {
        building.production = p;
        building.degree = d;
    }
    
    return building;
}


let stPatrick = {

    /**
     * Shows a User Box with the current production stats
     *
     * @constructor
     */
    ShowDialog: () => {
        HTML.AddCssFile('stpatrickstats');
        
        HTML.Box({
            'id': 'stPatrickDialog',
            'title': i18n('Boxes.stPatrick.Title'),
            'auto_close': true,
            'dragdrop': true,
            'minimize': false
        });
        var htmltext = `<div style="width:50%; float:left"><table id="stPatTable"><tr><th colspan="3">`;
        htmltext += `<img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_idle_currency_thumb.png" alt="" width="30" height="30">`;
        htmltext += `${i18n('Boxes.stPatrick.Hourly')}<br>(idle)</th></tr><tr>`;
        htmltext += `<td>${i18n('Boxes.stPatrick.Production')}</td>`;
        htmltext += `<td>${stPat.transport_1.baseData.name}</td>`;
        htmltext += `<td>${stPat.market_1.baseData.name}</td>`;
        htmltext += `</tr><tr>`;
        htmltext += `<td id="stPatWork"></td>`;
        htmltext += `<td id="stPatShip"></td>`;
        htmltext += `<td id="stPatFest"></td>`;
        htmltext += `</tr><tr><td colspan="3" style="color:rgba(0,255,221,0.64);font-size:smaller">${i18n('Boxes.stPatrick.Warning')}</td></tr></table></div><div sytle="width:50%"; float:right">`
        htmltext += `<table id="stPatNext" class="foe-table"><tr title=${stPat.workshop_1.baseData.name}>`;
        htmltext += `<td class="border-left"><img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_hats_thumb.png" alt="" width="30" height="30"></td>`;
        htmltext += `<td id="stPatworkshop_1Level"></td><td id="stPatworkshop_1" class="border-right"></td></tr><tr title=${stPat.workshop_2.baseData.name}>`;
        htmltext += `<td class="border-left"><img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_flowers_thumb.png" alt="" width="30" height="30"></td>`;
        htmltext += `<td id="stPatworkshop_2Level"></td><td id="stPatworkshop_2" class="border-right"></td></tr><tr title=${stPat.workshop_3.baseData.name}>`;
        htmltext += `<td class="border-left"><img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_cake_thumb.png" alt="" width="30" height="30"></td>`;
        htmltext += `<td id="stPatworkshop_3Level"></td><td id="stPatworkshop_3" class="border-right"></td></tr><tr title=${stPat.workshop_4.baseData.name}>`;
        htmltext += `<td class="border-left"><img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_drinks_thumb.png" alt="" width="30" height="30"></td>`;
        htmltext += `<td id="stPatworkshop_4Level"></td><td id="stPatworkshop_4" class="border-right"></td></tr><tr title=${stPat.workshop_5.baseData.name}>`;
        htmltext += `<td class="border-left"><img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_fireworks_thumb.png" alt="" width="30" height="30"></td>`;
        htmltext += `<td id="stPatworkshop_5Level"></td><td id="stPatworkshop_5" class="border-right"></td></tr><tr title=${stPat.transport_1.baseData.name}>`;
        htmltext += `<td class="border-left"><img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_shipyard_thumb.png" alt="" width="30" height="30"></td>`;
        htmltext += `<td id="stPattransport_1Level"></td><td id="stPattransport_1" class="border-right"></td></tr><tr title=${stPat.market_1.baseData.name}>`;
        htmltext += `<td class="border-left"><img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_parade_thumb.png" alt="" width="30" height="30"></td>`;
        htmltext += `<td id="stPatmarket_1Level"></td><td id="stPatmarket_1" class="border-right"></td></tr><tr>`;
        htmltext += `</tr></table></div>`;
        
        $('#stPatrickDialogBody').html(htmltext); 
    },
};