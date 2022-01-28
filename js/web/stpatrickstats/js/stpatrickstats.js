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

FoEproxy.addHandler('IdleGameService', 'getState', (data, postData) => {

    // Don't create a new box while another one is still open
    if ($('#stPatrickDialog').length === 0) {
		stPatrick.ShowDialog();
	}

    for (let x in data.responseData.characters) {
        let character = data.responseData.characters[x];

		stPatrick.stPat[character.id].level = character.level|0;
		stPatrick.stPat[character.id].manager = character.managerLevel|0;
    }
       
    stPatrick.stPatrickUpdateDialog();
});

FoEproxy.addHandler('IdleGameService', 'performActions', (data, postData) => {
	
    if(postData[0]['requestClass'] !== 'IdleGameService')
    	return;

	let game = postData[0]['requestData'][1];

    for (let x in game)
	{
        let data2 = game[x];
				
		if(!data2['characterId']) {
			continue;
		}

        if (data2.type === 'upgrade_level') {
			stPatrick.stPat[data2['characterId']].level += data2.amount;
		}

        if (data2.type === 'upgrade_manager') {
			stPatrick.stPat[data2['characterId']].manager += data2.amount;
		}
    }

    if ($('#stPatrickDialog').length > 0) {
		stPatrick.stPatrickUpdateDialog();
    }
});

FoEproxy.addMetaHandler('idle_game', (data, postData) => {

    let resp = JSON.parse(data['response']);

    for (let x in resp['configs'][0]['characters'])
	{
		let d = resp['configs'][0]['characters'][x];

		if(!d['id'])
		{
			continue;
		}
		stPatrick.stPat[d['id']]['baseData'] = d;
    }
});


let stPatrick = {

	stPat: {
		workshop_1 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		workshop_2 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		workshop_3 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		workshop_4 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		workshop_5 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		transport_1 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'ship'},
		market_1 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'fest'}
	},

	stPatNums: {
		0 : "",
		1 : "K",
		2 : "M",
		3 : "B",
		4 : "T",
		5 : "Q",
		6 : "QT"
	},
	stPatNumTitles: {
		0 : "",
		1 : i18n('Boxes.stPatrick.K'),
		2 : i18n('Boxes.stPatrick.M'),
		3 : i18n('Boxes.stPatrick.B'),
		4 : i18n('Boxes.stPatrick.T'),
		5 : i18n('Boxes.stPatrick.Q'),
		6 : i18n('Boxes.stPatrick.QT')
	},

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

        let htmltext = `<table><tr><td style="width:50%"><table id="stPatTable"><tr><th colspan="3">`;
        htmltext += `<img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_idle_currency_thumb.png" alt="" >`;
        htmltext += `${i18n('Boxes.stPatrick.Hourly')}<br>(idle)</th></tr><tr>`;
        htmltext += `<td>${stPatrick.stPat.market_1.baseData.name}<br><span id="stPatFest"></span></td>`;
        htmltext += `<td rowspan="2">${i18n('Boxes.stPatrick.Production')}<br><span id="stPatWork"></span></td>`;
        htmltext += `</tr><tr><td>${stPatrick.stPat.transport_1.baseData.name}<br><span id="stPatShip"></span></td>`;
        htmltext += `</tr><tr><td colspan="3" style="color:rgba(0,255,221,0.64);font-size:smaller">${i18n('Boxes.stPatrick.Warning')}</td></tr></table></td><td sytle="width:50%">`
        htmltext += `<table id="stPatNext" class="foe-table"><tr title="${stPatrick.stPat.workshop_1.baseData.name}">`;
        htmltext += `<td class="border-left"><img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_hats_thumb.png" alt="" ></td>`;
        htmltext += `<td id="stPatworkshop_1Level"></td><td id="stPatworkshop_1" class="border-right"></td></tr><tr title="${stPatrick.stPat.workshop_2.baseData.name}">`;
        htmltext += `<td class="border-left"><img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_flowers_thumb.png" alt="" ></td>`;
        htmltext += `<td id="stPatworkshop_2Level"></td><td id="stPatworkshop_2" class="border-right"></td></tr><tr title="${stPatrick.stPat.workshop_3.baseData.name}">`;
        htmltext += `<td class="border-left"><img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_cake_thumb.png" alt="" ></td>`;
        htmltext += `<td id="stPatworkshop_3Level"></td><td id="stPatworkshop_3" class="border-right"></td></tr><tr title="${stPatrick.stPat.workshop_4.baseData.name}">`;
        htmltext += `<td class="border-left"><img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_drinks_thumb.png" alt="" ></td>`;
        htmltext += `<td id="stPatworkshop_4Level"></td><td id="stPatworkshop_4" class="border-right"></td></tr><tr title="${stPatrick.stPat.workshop_5.baseData.name}">`;
        htmltext += `<td class="border-left"><img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_fireworks_thumb.png" alt="" ></td>`;
        htmltext += `<td id="stPatworkshop_5Level"></td><td id="stPatworkshop_5" class="border-right"></td></tr><tr title="${stPatrick.stPat.transport_1.baseData.name}">`;
        htmltext += `<td class="border-left"><img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_shipyard_thumb.png" alt="" ></td>`;
        htmltext += `<td id="stPattransport_1Level"></td><td id="stPattransport_1" class="border-right"></td></tr><tr title="${stPatrick.stPat.market_1.baseData.name}">`;
        htmltext += `<td class="border-left"><img src="https://foezz.innogamescdn.com/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_parade_thumb.png" alt="" ></td>`;
        htmltext += `<td id="stPatmarket_1Level"></td><td id="stPatmarket_1" class="border-right"></td></tr><tr>`;
        htmltext += `</tr></table></td></tr></table>`;
        
        $('#stPatrickDialogBody').html(htmltext); 
    },


	stPatrickUpdateDialog: () => {

		for (let building in stPatrick.stPat) {
			building = stPatrick.stPatProduction(stPatrick.stPat[building])
		}

		let degree = 0;
		let sum = 0;

		for (let b in stPatrick.stPat) {
			if (stPatrick.stPat[b].degree > degree && stPatrick.stPat[b].type === 'work'){
				degree = stPatrick.stPat[b].degree;
			}
		}

		for (let b in stPatrick.stPat) {
			if (stPatrick.stPat[b].type === 'work'){
				sum += Math.pow(1000, stPatrick.stPat[b].degree - degree) * stPatrick.stPat[b].production
			}
		}

		while (sum > 1000 && degree<6) {
			sum /= 1000;
			degree += 1;
		}

		let ident = '#stPatWork';
		let work = sum;
		let workd = degree;
		let ship = stPatrick.stPat['transport_1'].production;
		let shipd = stPatrick.stPat['transport_1'].degree;
		let fest = stPatrick.stPat['market_1'].production;
		let festd = stPatrick.stPat['market_1'].degree;

		if (shipd < degree || (shipd === degree && ship < sum)) {
			degree = shipd;
			sum = ship;
			ident = '#stPatShip'
		}
		if (festd < degree || (festd === degree && fest < sum)) {
			ident = '#stPatFest'
		}

		$('#stPatWork').removeClass("highlight");
		$('#stPatShip').removeClass("highlight");
		$('#stPatFest').removeClass("highlight");
		$(ident)[0].classList.add("highlight");

		for (let x in stPatrick.stPat) {
			$('#stPat'+x+'Level').text(`${stPatrick.stPat[x].level} -> ${stPatrick.stPat[x].next}`);
			$('#stPat'+x).text(`${stPatrick.stPat[x].need.toPrecision(3)} ${stPatrick.stPatNums[stPatrick.stPat[x].ndegree]}`);
			$('#stPat'+x).attr('title', stPatrick.stPatNumTitles[stPatrick.stPat[x].ndegree]);
		
		}

		$('#stPatWork').text(`${work.toPrecision(3)} ${stPatrick.stPatNums[workd]}`);
		$('#stPatWork').attr('title', stPatrick.stPatNumTitles[workd]);
		$('#stPatShip').text(`${ship.toPrecision(3)} ${stPatrick.stPatNums[shipd]}`);
		$('#stPatShip').attr('title', stPatrick.stPatNumTitles[shipd]);
		$('#stPatFest').text(`${fest.toPrecision(3)} ${stPatrick.stPatNums[festd]}`);
		$('#stPatFest').attr('title', stPatrick.stPatNumTitles[festd]);
	},


	stPatProduction: (building) => {

		if (building.level === 0) {
			building.next = 1;
			building.need = building.baseData.buyCostValue;
			building.ndegree = building.baseData.buyCostDegree;
			return building;
		}

		let p = building.baseData.baseProductionValue;
		let d = building.baseData.baseProductionDegree|0;
		let t = building.baseData.productionDuration+building.baseData.rechargeDuration;
		let pbonus = 0;
		let tbonus = 0;

		p *= building.level;

		while (p >= 1000 && d<6) {
			p /= 1000;
			d += 1;
		}

		let x = 0;
		for (let rank in building.baseData.rankProductionLevels) {
			x = building.baseData.rankProductionLevels[rank];
			if (x > building.level) {
				break;
			}
			else {
				p *= building.baseData.rankProductionModifiers[rank] + 1;
			}
			rank += 1;
		}

		while (p >= 1000 && d<6) {
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

		let base = building.baseData.baseUpgradeCostValue;
		let growth = building.baseData.upgradeCostGrowthRate;
		let need = 0;
		let ndegree = building.baseData.baseUpgradeCostDegree|0;

		for (let i = building.level; i<x; i++) {
			need += Math.pow(growth,i-1)*base;
		}

		while (need >= 1000 && ndegree<6) {
			need /= 1000;
			ndegree += 1;
		}

		building.need = need;
		building.ndegree = ndegree;

		while (p >= 1000 && d<6) {
			p /= 1000;
			d += 1;
		}

		for (let i in building.baseData.bonuses) {
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

		while (p >= 1000 && d<6) {
			p /= 1000;
			d += 1;
		}

		if (building.manager > 0) {
			building.production = p;
			building.degree = d;
		}

		return building;
	}
};