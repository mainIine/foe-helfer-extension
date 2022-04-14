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

FoEproxy.addHandler('IdleGameService', 'getState', (data, postData) => {
	//Do not show window if deactivated in settings
	if(!Settings.GetSetting('ShowEventChest')){
		return;
	}
	// Don't create a new box while another one is still open
    if ($('#stPatrickDialog').length === 0) {
		stPatrick.ShowDialog();
	}


	for (x in stPatrick.stPat) {
		stPatrick.stPat[x].level = 0;
		stPatrick.stPat[x].manager = 0;
		stPatrick.stPat[x].production = 0;
		stPatrick.stPat[x].degree = 0;
		stPatrick.stPat[x].next = 0;
		stPatrick.stPat[x].need = 0;
		stPatrick.stPat[x].ndegree = 0;
	}
	
	stPatrick.targets = JSON.parse(localStorage.getItem('stPatrickSettingsTargets') || '{"workshop_1": 0, "workshop_2": 0, "workshop_3": 0, "workshop_4": 0, "workshop_5": 0, "transport_1": 0, "market_1": 0}');

	for (let x in data.responseData.characters) {
		if (!Object.hasOwnProperty.call(data.responseData.characters, x)) continue;
        let character = data.responseData.characters[x];

		stPatrick.stPat[character.id].level = character.level||0;
		stPatrick.stPat[character.id].manager = character.managerLevel||0;
    }

	stPatrick.Tasklist = data.responseData.taskHandler.taskOrder;
	
	for (let t in data.responseData.taskHandler.completedTasks) {
		if (!Object.hasOwnProperty.call(data.responseData.taskHandler.completedTasks, t)) continue;
        td = data.responseData.taskHandler.completedTasks[t];
		let index = stPatrick.Tasklist.indexOf(td);
		if (index > -1) {
			stPatrick.Tasklist.splice(index, 1);
		}
    }
	
	stPatrick.Progress = Number(data.responseData.idleCurrencyAmount.value)||0;
	stPatrick.ProgressDegree = Number(data.responseData.idleCurrencyAmount.degree)||0;

	if (!(!data?.responseData?.taskHandler?.inProgressTasks)) {
		for (let t of data.responseData.taskHandler.inProgressTasks) {
			stPatrick.Taskprogress[t.id] = {value:t.currentProgress.value || 0, degree:t.currentProgress.degree || 0};
		}
	
	}

	if (data.responseData.stage) {
		stPatrick.stPatStage = data.responseData.stage;
	}

	stPatrick.stPatrickUpdateDialog();
});

FoEproxy.addHandler('IdleGameService', 'performActions', (data, postData) => {
	
    if(postData[0]['requestClass'] !== 'IdleGameService')
    	return;

	let game = postData[0]['requestData'][1];

    for (let x in game)
	{
		if (!Object.hasOwnProperty.call(game, x)) continue;
        let data2 = game[x];
				
		if(!data2['characterId'] && !data2['taskId']) {
			continue;
		}

        if (data2.type === 'upgrade_level') {
			stPatrick.stPat[data2['characterId']].level += data2.amount;
		}

        if (data2.type === 'upgrade_manager') {
			stPatrick.stPat[data2['characterId']].manager += data2.amount;
		}

		if (data2.type === 'collect_task') {
			let index = stPatrick.Tasklist.indexOf(data2.taskId);
			stPatrick.Taskprogress[data2.taskId] = {}
			if (index > -1) {
				stPatrick.Tasklist.splice(index, 1);
			}
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
		if (!Object.hasOwnProperty.call(resp['configs'][0]['characters'], x)) continue;
		let d = resp['configs'][0]['characters'][x];

		if(!d['id'])
		{
			continue;
		}
		stPatrick.stPat[d['id']]['baseData'] = d;
    }
	for (let t in resp['configs'][0]['tasks'])
	{
		if (!Object.hasOwnProperty.call(resp['configs'][0]['tasks'], t)) continue;
		let task = resp['configs'][0]['tasks'][t];

		if(!task['id'])
		{
			continue;
		}
		stPatrick.Tasks[task['id']] = task;
    }
	
});


let stPatrick = {

	stPat : {
		workshop_1 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		workshop_2 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		workshop_3 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		workshop_4 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		workshop_5 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		transport_1 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'ship'},
		market_1 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'fest'}
	},

    targets : {},
    
	Tasks : {},

	Tasklist: [],

	Taskprogress:[],

	Progress: 0,
	ProgressDegree: 0,
	stPatStage: 0,

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
            id: 'stPatrickDialog',
            title: i18n('Boxes.stPatrick.Title'),
            auto_close: true,
            dragdrop: true,
            minimize: true,
			resize : true
        });

		[stPatrick.hiddenTables, stPatrick.minimized] = JSON.parse(localStorage.getItem('stPatrickSettings2') || '[[],false]');


		
        let htmltext = `<table id="stPatTable" style="width:100%"><tr><th colspan="2">`;
        htmltext += `<img src="${MainParser.InnoCDN}/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_idle_currency_thumb.png" alt="" >`;
        htmltext += `${i18n('Boxes.stPatrick.Hourly')}</th></tr><tr>`;
        htmltext += `<td>${stPatrick.stPat.market_1.baseData.name}<br><span id="stPatFest"></span></td>`;
        htmltext += `<td rowspan="2">${i18n('Boxes.stPatrick.Production')}<br><span id="stPatWork"></span></td>`;
        htmltext += `</tr><tr><td>${stPatrick.stPat.transport_1.baseData.name}<br><span id="stPatShip"></span></td>`;
        htmltext += `</tr><tr><td colspan="3" style="color: var(--text-bright);font-size:smaller">${i18n('Boxes.stPatrick.Warning')}</td></tr></table>`;
        
		htmltext += `<table id="stPatNext" class="foe-table" style="width:100%"><tr><th colspan="4"  onclick="stPatrick.hide('#stPatNext')">${i18n('Boxes.stPatrick.BuildingUpgrades')}<i></i></tr>`;
		htmltext += `<tr title="${stPatrick.stPat.workshop_1.baseData.name}">`;
        htmltext += `<td><img src="${MainParser.InnoCDN}/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_hats_thumb.png" alt="" ></td>`;
        htmltext += `<td><span id="stPatworkshop_1Level" class="levelSelect" data-station="workshop_1"></span></td>`;
		htmltext += `<td id="stPatworkshop_1" class="align-right"></td>`;
		htmltext += `<td id="stPatworkshop_1Time" class="align-left"></td></tr>`;
		htmltext += `<tr title="${stPatrick.stPat.workshop_2.baseData.name}">`;
        htmltext += `<td><img src="${MainParser.InnoCDN}/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_flowers_thumb.png" alt="" ></td>`;
        htmltext += `<td><span id="stPatworkshop_2Level" class="levelSelect" data-station="workshop_2"></span></td>`;
		htmltext += `<td id="stPatworkshop_2" class="align-right"></td>`;
		htmltext += `<td id="stPatworkshop_2Time" class="align-left"></td></tr>`;
		htmltext += `<tr title="${stPatrick.stPat.workshop_3.baseData.name}">`;
        htmltext += `<td><img src="${MainParser.InnoCDN}/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_cake_thumb.png" alt="" ></td>`;
        htmltext += `<td><span id="stPatworkshop_3Level" class="levelSelect" data-station="workshop_3"></span></td>`;
		htmltext += `<td id="stPatworkshop_3" class="align-right"></td>`;
		htmltext += `<td id="stPatworkshop_3Time" class="align-left"></td></tr>`
		htmltext += `<tr title="${stPatrick.stPat.workshop_4.baseData.name}">`;
        htmltext += `<td><img src="${MainParser.InnoCDN}/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_drinks_thumb.png" alt="" ></td>`;
        htmltext += `<td><span id="stPatworkshop_4Level" class="levelSelect" data-station="workshop_4"></span></td>`;
		htmltext += `<td id="stPatworkshop_4" class="align-right"></td>`;
		htmltext += `<td id="stPatworkshop_4Time" class="align-left"></td></tr>`;
		htmltext += `<tr title="${stPatrick.stPat.workshop_5.baseData.name}">`;
        htmltext += `<td><img src="${MainParser.InnoCDN}/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_fireworks_thumb.png" alt="" ></td>`;
        htmltext += `<td><span id="stPatworkshop_5Level" class="levelSelect" data-station="workshop_5"></span></td>`;
		htmltext += `<td id="stPatworkshop_5" class="align-right"></td>`;
		htmltext += `<td id="stPatworkshop_5Time" class="align-left"></td></tr>`;
		htmltext += `<tr title="${stPatrick.stPat.transport_1.baseData.name}">`;
        htmltext += `<td><img src="${MainParser.InnoCDN}/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_shipyard_thumb.png" alt="" ></td>`;
        htmltext += `<td><span id="stPattransport_1Level" class="levelSelect" data-station="transport_1"></span></td>`;
		htmltext += `<td id="stPattransport_1" class="align-right"></td>`;
		htmltext += `<td id="stPattransport_1Time" class="align-left"></td></tr>`;
		htmltext += `<tr title="${stPatrick.stPat.market_1.baseData.name}">`;
        htmltext += `<td><img src="${MainParser.InnoCDN}/assets/shared/seasonalevents/stpatricks/event/stpatrick_task_parade_thumb.png" alt="" ></td>`;
        htmltext += `<td><span id="stPatmarket_1Level" class="levelSelect" data-station="market_1"></span></td>`;
		htmltext += `<td id="stPatmarket_1" class="align-right"></td>`;
		htmltext += `<td id="stPatmarket_1Time" class="align-left"></td></tr>`;
        htmltext += `</table>`;
        htmltext += `<table id="stPatTasksActive" class="foe-table" style="width:100%"><tr><th colspan="2" onclick="stPatrick.hide('#stPatTasksActive')">${i18n('Boxes.stPatrick.ActiveTasks')}<i></i></th></tr>`;
		htmltext += `<tr><td id="stPatTask0"></td><td id="time0"></td></tr>`;
        htmltext += `<tr><td id="stPatTask1"></td><td id="time1"></td></tr>`;
        htmltext += `<tr><td id="stPatTask2"></td><td id="time2"></td></tr>`;
        htmltext += `</table>`;
		htmltext += `<table id="stPatTasks" class="foe-table" style="width:100%"><tr><th onclick="stPatrick.hide('#stPatTasks')">${i18n('Boxes.stPatrick.UpcomingTasks')}<i></i></th></tr>`;
		htmltext += `<tr><td id="stPatTask3"></td></tr>`;
        htmltext += `<tr><td id="stPatTask4"></td></tr>`;
        htmltext += `<tr><td id="stPatTask5"></td></tr>`;
        htmltext += `<tr><td id="stPatTask6"></td></tr>`;
        htmltext += `<tr><td id="stPatTask7"></td></tr>`;
        htmltext += `<tr><td id="stPatTask8"></td></tr>`;
        htmltext += `</table>`;
		htmltext += `<div id="stPatTown" style="color:var(--text-bright); font-weight:bold"></div>`;
        
        
        $('#stPatrickDialogBody').html(htmltext);

		for (let t in stPatrick.hiddenTables) {
			if (!Object.hasOwnProperty.call(stPatrick.hiddenTables, t)) continue;
			table= stPatrick.hiddenTables[t];
			stPatrick.hide2(table);
		}

		let box = $('#stPatrickDialog'),
			open = box.hasClass('open');

		if (open === true && stPatrick.minimized) {
			box.removeClass('open');
			box.addClass('closed');
			box.find('.window-body').css("visibility", "hidden");
		}
		else {
			box.removeClass('closed');
			box.addClass('open');
			box.find('.window-body').css("visibility", "visible");
		}

		$('#stPatrickDialogHeader > span.window-minimize').on('click', function() {
			stPatrick.minimized = !stPatrick.minimized;
			localStorage.setItem('stPatrickSettings2', JSON.stringify([stPatrick.hiddenTables, stPatrick.minimized]));
		});

		$('.levelSelect').on('click', function() {
			let selectinput = document.createElement("INPUT")
			selectinput.setAttribute("type", "text");
			selectinput.setAttribute("data-station", this.dataset.station);
			selectinput.setAttribute("data-replace", this.id);
			selectinput.setAttribute("style", "width: 80px");
			selectinput.setAttribute("onkeyup", "stPatrick.updateTarget(event)");
			selectinput.setAttribute("onfocusout", "stPatrick.removeInput(event)");
			this.style.display = "none";
			this.parentElement.append(selectinput);
			selectinput.focus();
		});

    },

	updateTarget: (event) => {
		if (event.key === 'Enter') {
			stPatrick.targets[event.srcElement.dataset.station] = Number(event.srcElement.value);
			stPatrick.saveTargets();
		}

		if (event.key != 'Enter' && event.key != 'Escape') return;
		$('#'+event.srcElement.dataset.replace)[0].style.display = "block";
		event.srcElement.setAttribute("onfocusout", "");
		event.srcElement.remove();
		stPatrick.stPatrickUpdateDialog();
			
	},

	removeInput: (event) => {
		
		stPatrick.targets[event.srcElement.dataset.station] = Number(event.srcElement.value);
		stPatrick.saveTargets();
		
		$('#'+event.srcElement.dataset.replace)[0].style.display = "block";
		
		event.srcElement.remove();

		stPatrick.stPatrickUpdateDialog();
	},

	stPatrickUpdateDialog: () => {

		for (let building in stPatrick.stPat) {
			if (!Object.hasOwnProperty.call(stPatrick.stPat, building)) continue;
			stPatrick.stPat[building] = stPatrick.stPatProduction(stPatrick.stPat[building])
		}

		let degree = 0;
		let sum = 0;

		for (let b in stPatrick.stPat) {
			if (!Object.hasOwnProperty.call(stPatrick.stPat, b)) continue;
			if (stPatrick.stPat[b].degree > degree && stPatrick.stPat[b].type === 'work'){
				degree = stPatrick.stPat[b].degree;
			}
		}
		let worktitle = ''
		for (let b in stPatrick.stPat) {
			if (!Object.hasOwnProperty.call(stPatrick.stPat, b)) continue;
			if (stPatrick.stPat[b].type === 'work'){
				sum += Math.pow(1000, stPatrick.stPat[b].degree - degree) * stPatrick.stPat[b].production
				worktitle += `\n${stPatrick.stPat[b].baseData.name}: ${stPatrick.stPat[b].production.toPrecision(3)} ${stPatrick.stPatNums[stPatrick.stPat[b].degree]}`
			}
		}

		while (Number(sum.toPrecision(3)) >= 1000 && degree<6) {
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
			ident = '#stPatFest';
			sum = fest;
			degree = festd
		}

		$('#stPatWork').removeClass("highlight");
		$('#stPatShip').removeClass("highlight");
		$('#stPatFest').removeClass("highlight");
		$(ident).addClass("highlight");

		for (let x in stPatrick.stPat) {
			if (!Object.hasOwnProperty.call(stPatrick.stPat, x)) continue;
			$('#stPat'+x+'Level').text(`${stPatrick.stPat[x].level} → ${stPatrick.stPat[x].next}`);
			$('#stPat'+x).text(`${stPatrick.bigNum(stPatrick.stPat[x].need)} ${stPatrick.stPatNums[stPatrick.stPat[x].ndegree]}`);
			$('#stPat'+x+'Time').text(`(${stPatrick.time(stPatrick.stPat[x].need,stPatrick.stPat[x].ndegree,sum,degree,0,0)})`);
			$('#stPat'+x).attr('title', `${stPatrick.bigNum(stPatrick.stPat[x].need)} ${stPatrick.stPatNumTitles[stPatrick.stPat[x].ndegree]}`);
		
		}

		$('#stPatWork').text(`${stPatrick.bigNum(work)} ${stPatrick.stPatNums[workd]}`);
		$('#stPatWork').attr('title', `${stPatrick.bigNum(work)} ${stPatrick.stPatNumTitles[workd]}\n----------${worktitle}`);
		$('#stPatShip').text(`${stPatrick.bigNum(ship)} ${stPatrick.stPatNums[shipd]}`);
		$('#stPatShip').attr('title', `${stPatrick.bigNum(ship)} ${stPatrick.stPatNumTitles[shipd]}`);
		$('#stPatFest').text(`${stPatrick.bigNum(fest)} ${stPatrick.stPatNums[festd]}`);
		$('#stPatFest').attr('title', `${stPatrick.bigNum(fest)} ${stPatrick.stPatNumTitles[festd]}`);

		let i = Math.min(stPatrick.Tasklist.length, 9);

		for (let t = 0;t<3;t++) {
			$('#stPatTask'+ t).text(``);
			$('#stPatTask'+ t).addClass('hide');
			$('#time'+ t).text(``);
			$('#time'+ t).addClass('hide');
			if (t >= i) continue;

			let Task = stPatrick.Tasks[stPatrick.Tasklist[t]];
			if (Task.type !== "collect_idle_currency") continue;

			$('#stPatTask'+ t).text(`${Task.description}`);
			$('#stPatTask'+ t).removeClass('hide');
			let target=Task.targets[0]
			let targetProduction=stPatrick.stPat[target].production;
			let targetDegree=stPatrick.stPat[target].degree;
			if (target==='market_1') {
				targetProduction = sum;
				targetDegree = degree;
			}
			if (target==='transport_1' && targetProduction * Math.pow(1000,targetDegree-workd) > work) {
				targetProduction = work;
				targetDegree = workd;
			}
			if (Task.targets.length===5) {
				targetProduction = work;
				targetDegree = workd;
			}
			
			$('#time'+ t).text(`${stPatrick.time(Task.requiredProgress.value,
												Task.requiredProgress.degree,
												targetProduction,
												targetDegree,
												stPatrick.Taskprogress[stPatrick.Tasklist[t]]?.value || 0,
												stPatrick.Taskprogress[stPatrick.Tasklist[t]]?.degree || 0)}`);
			$('#time'+ t).removeClass('hide');
			
			
			
		}
		for (let t = 3;t<9;t++) {
			if (t < i) {
				let Task = stPatrick.Tasks[stPatrick.Tasklist[t]];
				$('#stPatTask'+ t).text(`${Task.description}`);
				$('#stPatTask'+ t).removeClass('hide');
				
			} else {
				$('#stPatTask'+ t).text(``);
				$('#stPatTask'+ t).addClass('hide');
			}
		}

		$('#stPatTown').html(`${i18n('Boxes.stPatrick.CurrentRun')}: ${stPatrick.stPatStage} / ${i18n('Boxes.stPatrick.Variant')}: ${(stPatrick.stPatStage-1) % 3 + 1}<br>${i18n('Boxes.stPatrick.NextTown')} 8.4 Q: ${stPatrick.time(8.4,5,sum,degree,stPatrick.Progress,stPatrick.ProgressDegree)}`);

	},

	stPatProduction: (building) => {

		if (building.level === 0) {
			stPatrick.targets[building.baseData.id] = 0;
			stPatrick.saveTargets();
			building.next = 1;
			building.need = building.baseData.buyCostValue;
			building.ndegree = building.baseData.buyCostDegree||0;
			if (building.need >= 1000 && building.ndegree<6) {
				building.need /= 1000;
				building.ndegree += 1;
			}			
			return building;
		}

		let p = building.baseData.baseProductionValue;
		let d = building.baseData.baseProductionDegree||0;
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
			if (!Object.hasOwnProperty.call(building.baseData.rankProductionLevels, rank)) continue;
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

		if (stPatrick.targets[building.baseData.id] > building.level) {
			x = stPatrick.targets[building.baseData.id];
		};
		
		building.next = x;

		let base = building.baseData.baseUpgradeCostValue;
		let growth = building.baseData.upgradeCostGrowthRate;
		let need = 0;
		let ndegree = building.baseData.baseUpgradeCostDegree||0;

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
			if (!Object.hasOwnProperty.call(building.baseData.bonuses, i)) continue;
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
		} else {
			building.production = 0;
			building.degree = 0;
		}

		return building;
	},

	
	time: (amount, da, hourly, dh, stock, ds) => {
		
		stock = stock * Math.pow(1000, ds - da);
		amount = amount - stock;
		if (amount <= 0) return "0h:0m";
		hours = amount / hourly * Math.pow(1000,da-dh);
		minutes = Math.floor((hours - Math.floor(hours))*60);
		hours = Math.floor(hours);
		time = hours >= 1000 ? `>999h` : `${hours}h`
		time += hours < 24 ? `:${minutes}m` : ``
		return time;
	},

	bigNum: (number) => {
		bigNum = Number(number.toPrecision(3)) >= 1000 ? `${Math.floor(number)}` : `${number.toPrecision(3)}`;
		return bigNum;
	},

	hide: (id) => {
		stPatrick.hide2(id);
		let i = stPatrick.hiddenTables.indexOf(id);
		if (i > -1) {
			stPatrick.hiddenTables.splice(i , 1)
		} else {
			stPatrick.hiddenTables.push(id);
		}
		localStorage.setItem('stPatrickSettings2', JSON.stringify([stPatrick.hiddenTables, stPatrick.minimized]));
	},

	hide2: (id) => {
		$(id).toggleClass("hide");
	},

	saveTargets () {
		localStorage.setItem('stPatrickSettingsTargets', JSON.stringify(stPatrick.targets));
	},

	hiddenTables : [],
	minimized: false,
};
