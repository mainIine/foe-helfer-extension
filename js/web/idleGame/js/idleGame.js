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

FoEproxy.addHandler('IdleGameService', 'getState', (data, postData) => {
	//Do not show window if deactivated in settings
	if(!Settings.GetSetting('ShowEventChest') || !(Settings.GetSetting('EventHelperIdle') === undefined ? true : Settings.GetSetting('EventHelperIdle'))) {
		return;
	}
	idleGame.event = data.responseData.context;
	idleGame.selectEventData();
	if (!idleGame.settings['Strategy']) idleGame.settings['Strategy']={};
	if (!idleGame.settings.Strategy[idleGame.event]) {
		idleGame.settings.Strategy[idleGame.event]={}
	}
	if (!idleGame.settings.currentEvent || idleGame.settings.currentEvent != idleGame.event) {
		idleGame.settings.Strategy['CurrentVariant'] = 0;
		idleGame.settings.currentEvent = idleGame.event;
	}
	// Don't create a new box while another one is still open
    if ($('#idleGameDialog').length === 0) {
		idleGame.ShowDialog();
	}


	for (x in idleGame.data) {
		idleGame.data[x].level = 0;
		idleGame.data[x].manager = 0;
		idleGame.data[x].production = 0;
		idleGame.data[x].degree = 0;
		idleGame.data[x].next = 0;
		idleGame.data[x].need = 0;
		idleGame.data[x].ndegree = 0;
	}
	
	for (let x in data.responseData.characters) {
		if (!Object.hasOwnProperty.call(data.responseData.characters, x)) continue;
        let character = data.responseData.characters[x];

		idleGame.data[character.id].level = character.level||0;
		idleGame.data[character.id].manager = character.managerLevel||0;
    }

	idleGame.Tasklist = data.responseData.taskHandler.taskOrder;
	
	for (let t in data.responseData.taskHandler.completedTasks) {
		if (!Object.hasOwnProperty.call(data.responseData.taskHandler.completedTasks, t)) continue;
        td = data.responseData.taskHandler.completedTasks[t];
		let index = idleGame.Tasklist.indexOf(td);
		if (index > -1) {
			idleGame.Tasklist.splice(index, 1);
		}
    }
	
	idleGame.Progress = Number(data.responseData.idleCurrencyAmount.value)||0;
	idleGame.ProgressDegree = Number(data.responseData.idleCurrencyAmount.degree)||0;

	if (!(!data?.responseData?.taskHandler?.inProgressTasks)) {
		for (let t of data.responseData.taskHandler.inProgressTasks) {
			idleGame.Taskprogress[t.id] = {value:t.currentProgress.value || 0, degree:t.currentProgress.degree || 0};
		}
	
	}

	if (data.responseData.stage) {
		idleGame.Stage = data.responseData.stage;
		idleGame.Variant = (idleGame.Stage-1) % 3 + 1;
		if (!idleGame.settings.Strategy['CurrentVariant']) idleGame.settings.Strategy['CurrentVariant'] = 0;
		if (idleGame.Variant != idleGame.settings.Strategy.CurrentVariant) {
			idleGame.settings.Strategy.CurrentVariant = idleGame.Variant;
			if (!idleGame.settings.Strategy[idleGame.event][idleGame.Variant]) idleGame.settings.Strategy[idleGame.event][idleGame.Variant]=[];
			for (let x in idleGame.settings.Strategy[idleGame.event][idleGame.Variant]) {
				idleGame.settings.Strategy[idleGame.event][idleGame.Variant][x].check = false;
			}
			idleGame.settings.targets = {"workshop_1": 0, "workshop_2": 0, "workshop_3": 0, "workshop_4": 0, "workshop_5": 0, "transport_1": 0, "market_1": 0};
			idleGame.saveSettings();
		}
		if (!idleGame.settings.Strategy[idleGame.event][idleGame.Variant]) idleGame.settings.Strategy[idleGame.event][idleGame.Variant]=[];
	}

	idleGame.idleGameUpdateDialog();
});

FoEproxy.addRequestHandler('IdleGameService', 'performActions', (postData) => {
	
    if(postData['requestClass'] !== 'IdleGameService')
    	return;

	let game = postData['requestData'][1];

    for (let x in game)
	{
		if (!Object.hasOwnProperty.call(game, x)) continue;
        let data2 = game[x];
				
		if(!data2['characterId'] && !data2['taskId']) {
			continue;
		}

        if (data2.type === 'upgrade_level') {
			idleGame.data[data2['characterId']].level += data2.amount || 1;
		}

        if (data2.type === 'upgrade_manager') {
			idleGame.data[data2['characterId']].manager += data2.amount || 1;
		}

		if (data2.type === 'collect_task') {
			let index = idleGame.Tasklist.indexOf(data2.taskId);
			idleGame.Taskprogress[data2.taskId] = {}
			if (index > -1) {
				idleGame.Tasklist.splice(index, 1);
			}
		}
    }

    if ($('#idleGameDialog').length > 0) {
		idleGame.idleGameUpdateDialog();
    }
});

FoEproxy.addMetaHandler('idle_game', (data, postData) => {
    idleGame.meta= JSON.parse(data['response']);
});


let idleGame = {

	finishTown: 8.4,
	finishTownDegree: 5,
	finishTownDiscount: 0,

	data : {
		workshop_1 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		workshop_2 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		workshop_3 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		workshop_4 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		workshop_5 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'work'},
		transport_1 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'ship'},
		market_1 : {level:0, manager:0, baseData: null, production:0, degree:0, next:0, need:0, ndegree:0, type: 'fest'}
	},
	images:{
		st_patricks_event: {
			idleCurrency:"/shared/seasonalevents/stpatricks/event/stpatrick_task_idle_currency_thumb.png",
			workshop_1:"/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_hats_thumb.png",
			workshop_2:"/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_flowers_thumb.png",
			workshop_3:"/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_cake_thumb.png",
			workshop_4:"/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_drinks_thumb.png",
			workshop_5:"/shared/seasonalevents/stpatricks/event/stpatrick_task_goods_fireworks_thumb.png",
			transport_1:"/shared/seasonalevents/stpatricks/event/stpatrick_task_shipyard_thumb.png",
			market_1:"/shared/seasonalevents/stpatricks/event/stpatrick_task_parade_thumb.png"
		},
		fellowship_event: {
			idleCurrency:"/shared/seasonalevents/fellowship/event/fellowship_task_idle_currency_thumb.png",
			workshop_1:"/shared/seasonalevents/fellowship/event/fellowship_task_goods_spices_thumb.png",
			workshop_2:"/shared/seasonalevents/fellowship/event/fellowship_task_goods_drinks_thumb.png",
			workshop_3:"/shared/seasonalevents/fellowship/event/fellowship_task_goods_farm_thumb.png",
			workshop_4:"/shared/seasonalevents/fellowship/event/fellowship_task_goods_bakery_thumb.png",
			workshop_5:"/shared/seasonalevents/fellowship/event/fellowship_task_goods_butchery_thumb.png",
			transport_1:"/shared/seasonalevents/fellowship/event/fellowship_task_carriage_thumb.png",
			market_1:"/shared/seasonalevents/fellowship/event/fellowship_task_banquette_thumb.png"
		}
	},
	texts:{
		st_patricks_event: {
			Production: i18n('Boxes.idleGame.Production.StPat')
		},
		fellowship_event: {
			Production: i18n('Boxes.idleGame.Production.StPat')
		}
	},
	
	event: "fellowship_event",

    Tasks : {},
	Tasklist: [],
	Taskprogress:[],

	settings: JSON.parse(localStorage.getItem('idleGameSettings') || '{"hiddenTables":[],"minimized":false,"Strategy":{},"targets":{"workshop_1": 0, "workshop_2": 0, "workshop_3": 0, "workshop_4": 0, "workshop_5": 0, "transport_1": 0, "market_1": 0}}'),

	Progress: 0,
	ProgressDegree: 0,
	Stage: 0,

	iGNums: {
		0 : "",
		1 : "K",
		2 : "M",
		3 : "B",
		4 : "T",
		5 : "Q",
		6 : "QT"
	},
	iGNumTitles: {
		0 : "",
		1 : i18n('Boxes.idleGame.K'),
		2 : i18n('Boxes.idleGame.M'),
		3 : i18n('Boxes.idleGame.B'),
		4 : i18n('Boxes.idleGame.T'),
		5 : i18n('Boxes.idleGame.Q'),
		6 : i18n('Boxes.idleGame.QT')
	},

	selectEventData: ()=>{
		let i=0;
		for (i in idleGame.meta.configs) {
			if (idleGame.meta.configs[i].context==idleGame.event) break;
		}
		let data = idleGame.meta.configs[i];
		for (let x in data.characters)	{
			if (!Object.hasOwnProperty.call(data.characters, x)) continue;
			let d = data.characters[x];

			if(!d['id'])
			{
				continue;
			}
			idleGame.data[d['id']]['baseData'] = d;
		}
		for (let t in data.tasks) {
			if (!Object.hasOwnProperty.call(data.tasks, t)) continue;
			let task = data.tasks[t];

			if(!task['id'])
			{
				continue;
			}
			idleGame.Tasks[task['id']] = task;
		}
		
		idleGame.finishTown = data.stageCostValue
		idleGame.finishTownDegree = data.stageCostDegree
		idleGame.finishTownDiscount = 1 - data.nextStageCostReductionPercentage/100

	},

    /**
     * Shows a User Box with the current production stats
     *
     * @constructor
     */
    ShowDialog: () => {
        HTML.AddCssFile('idleGame');
        
        HTML.Box({
            id: 'idleGameDialog',
            title: i18n('Boxes.idleGame.Title'),
            auto_close: true,
            dragdrop: true,
            minimize: true,
			resize : true,
			active_maps:"main",
        });

        let htmltext = `<table id="idleGame_Table" style="width:100%"><thead><tr><th colspan="2">`;
        htmltext += `<img src="${srcLinks.get(idleGame.images[idleGame.event].idleCurrency, true)}" alt="" > `;
        htmltext += `${i18n('Boxes.idleGame.Hourly')}</th></tr></thead><tr>`;
        htmltext += `<td colspan="2"><div class="flex"><div><p>${idleGame.data.market_1.baseData.name}<br><span id="idleGame_Fest"></span></p>`;
        htmltext += `${idleGame.data.transport_1.baseData.name}<br><span id="idleGame_Ship"></span></div>`;
        htmltext += `<div>${idleGame.texts[idleGame.event].Production}<br><span id="idleGame_Work"></span></div></div></td>`;
        htmltext += `</tr><tr class="town_info"><td><div class="idleGame_Town"></div></td>`
		htmltext += `<td data-original-title="${i18n('Boxes.idleGame.Warning')}">${i18n('General.Disclaimer')}</td></tr></table>`;
        
		htmltext += `<table id="idleGame_Next" class="foe-table" style="width:100%"><tr><th colspan="4" onclick="idleGame.hide('#idleGame_Next')">${i18n('Boxes.idleGame.BuildingUpgrades')}<i></i></tr>`;
		htmltext += `<tr>`;
        htmltext += `<td><img data-original-title="${idleGame.data.workshop_1.baseData.name}" src="${srcLinks.get(idleGame.images[idleGame.event].workshop_1, true)}" alt="" ></td>`;
        htmltext += `<td><span id="idleGame_workshop_1Level" class="levelSelect" data-station="workshop_1"></span></td>`;
		htmltext += `<td><span id="idleGame_workshop_1"></span></td>`;
		htmltext += `<td class="align-right"><span id="idleGame_workshop_1Time"></span></td></tr>`;
		htmltext += `<tr>`;
        htmltext += `<td><img data-original-title="${idleGame.data.workshop_2.baseData.name}" src="${srcLinks.get(idleGame.images[idleGame.event].workshop_2, true)}" alt="" ></td>`;
        htmltext += `<td><span id="idleGame_workshop_2Level" class="levelSelect" data-station="workshop_2"></span></td>`;
		htmltext += `<td><span id="idleGame_workshop_2"></span></td>`;
		htmltext += `<td class="align-right"><span><span id="idleGame_workshop_2Time"></span></td></tr>`;
		htmltext += `<tr>`;
        htmltext += `<td><img data-original-title="${idleGame.data.workshop_3.baseData.name}" src="${srcLinks.get(idleGame.images[idleGame.event].workshop_3, true)}" alt="" ></td>`;
        htmltext += `<td><span id="idleGame_workshop_3Level" class="levelSelect" data-station="workshop_3"></span></td>`;
		htmltext += `<td><span id="idleGame_workshop_3"></span></td>`;
		htmltext += `<td class="align-right"><span id="idleGame_workshop_3Time"></span></td></tr>`
		htmltext += `<tr>`;
        htmltext += `<td><img data-original-title="${idleGame.data.workshop_4.baseData.name}" src="${srcLinks.get(idleGame.images[idleGame.event].workshop_4, true)}" alt="" ></td>`;
        htmltext += `<td><span id="idleGame_workshop_4Level" class="levelSelect" data-station="workshop_4"></span></td>`;
		htmltext += `<td><span id="idleGame_workshop_4"></span></td>`;
		htmltext += `<td class="align-right"><span id="idleGame_workshop_4Time"></span></td></tr>`;
		htmltext += `<tr>`;
        htmltext += `<td><img data-original-title="${idleGame.data.workshop_5.baseData.name}" src="${srcLinks.get(idleGame.images[idleGame.event].workshop_5, true)}" alt="" ></td>`;
        htmltext += `<td><span id="idleGame_workshop_5Level" class="levelSelect" data-station="workshop_5"></span></td>`;
		htmltext += `<td><span id="idleGame_workshop_5"></span></td>`;
		htmltext += `<td class="align-right"><span id="idleGame_workshop_5Time"></span></td></tr>`;
		htmltext += `<tr>`;
        htmltext += `<td><img data-original-title="${idleGame.data.transport_1.baseData.name}" src="${srcLinks.get(idleGame.images[idleGame.event].transport_1, true)}" alt="" ></td>`;
        htmltext += `<td><span id="idleGame_transport_1Level" class="levelSelect" data-station="transport_1"></span></td>`;
		htmltext += `<td><span id="idleGame_transport_1"></span></td>`;
		htmltext += `<td class="align-right"><span id="idleGame_transport_1Time"></span></td></tr>`;
		htmltext += `<tr>`;
        htmltext += `<td><img data-original-title="${idleGame.data.market_1.baseData.name}" src="${srcLinks.get(idleGame.images[idleGame.event].market_1, true)}" alt="" ></td>`;
        htmltext += `<td><span id="idleGame_market_1Level" class="levelSelect" data-station="market_1"></span></td>`;
		htmltext += `<td><span id="idleGame_market_1"></span></td>`;
		htmltext += `<td class="align-right"><span id="idleGame_market_1Time"></span></td></tr>`;
        htmltext += `</table>`;
        htmltext += `<table id="idleGame_TasksActive" class="foe-table" style="width:100%"><tr><th colspan="2" onclick="idleGame.hide('#idleGame_TasksActive')">${i18n('Boxes.idleGame.ActiveTasks')}<i></i></th></tr>`;
		htmltext += `<tr><td class="align-left" id="idleGame_Task0"></td><td id="time0"></td></tr>`;
        htmltext += `<tr><td class="align-left" id="idleGame_Task1"></td><td id="time1"></td></tr>`;
        htmltext += `<tr><td class="align-left" id="idleGame_Task2"></td><td id="time2"></td></tr>`;
        htmltext += `</table>`;
		htmltext += `<table id="idleGame_Tasks" class="foe-table" style="width:100%"><tr><th onclick="idleGame.hide('#idleGame_Tasks')">${i18n('Boxes.idleGame.UpcomingTasks')}<i></i></th></tr>`;
		htmltext += `<tr><td id="idleGame_Task3"></td></tr>`;
        htmltext += `<tr><td id="idleGame_Task4"></td></tr>`;
        htmltext += `<tr><td id="idleGame_Task5"></td></tr>`;
        htmltext += `<tr><td id="idleGame_Task6"></td></tr>`;
        htmltext += `<tr><td id="idleGame_Task7"></td></tr>`;
        htmltext += `<tr><td id="idleGame_Task8"></td></tr>`;
        htmltext += `</table>`;
		htmltext += `<table id="idleGame_Strategy" class="foe-table" style="width:100%"><tr>`;
		htmltext += `<th class="clickable" style="width:25px" onclick="idleGame.modifyStrategy()">✏️</th>`;
		htmltext += `<th colspan="2" onclick="idleGame.hide('#idleGame_Strategy')"><span style="margin-right:25px">${i18n('Boxes.idleGame.Strategy')}</span><i></i></th></tr>`;
		htmltext += `<tr><td colspan="2" id="idleGame_StratPrev"></td><td style="width:25px" id="idleGame_StratUndo" onclick="idleGame.StratUndo()"></td></tr>`;
        htmltext += `<tr><td colspan="2" id="idleGame_Strat"></td><td id="idleGame_StratCheck" onclick="idleGame.StratCheck()"></td></tr>`;
        htmltext += `<tr><td colspan="2" id="idleGame_StratNext"></td><td></td></tr>`;
        htmltext += `</table>`;
		htmltext += `<div id="idleGame_Town" style="color:var(--text-bright); font-weight:bold"></div>`;
        
        
        $('#idleGameDialogBody').html(htmltext);

		for (let t of idleGame.settings.hiddenTables) {
			$(t).toggleClass("hide");
		}

		let box = $('#idleGameDialog'),
			open = box.hasClass('open');

		if (open === true && idleGame.minimized) {
			box.removeClass('open');
			box.addClass('closed');
			box.find('.window-body').css("visibility", "hidden");
		}
		else {
			box.removeClass('closed');
			box.addClass('open');
			box.find('.window-body').css("visibility", "visible");
		}

		$('#idleGameDialogHeader > span.window-minimize').on('click', function() {
			idleGame.settings.minimized = !idleGame.settings.minimized;
			idleGame.saveSettings();
		});

		$('.levelSelect').on('click', function() {
			let selectinput = document.createElement("INPUT")
			selectinput.setAttribute("type", "text");
			selectinput.setAttribute("data-station", this.dataset.station);
			selectinput.setAttribute("data-replace", this.id);
			selectinput.setAttribute("style", "width: 80px");
			selectinput.setAttribute("onkeyup", "idleGame.updateTarget(event)");
			selectinput.setAttribute("onfocusout", "idleGame.removeInput(event)");
			this.style.display = "none";
			this.parentElement.append(selectinput);
			selectinput.focus();
		});

    },

	updateTarget: (event) => {
		if (event.key != 'Enter' && event.key != 'Escape') return;

		
		if (event.key === 'Enter') {
			idleGame.settings.targets[event.srcElement.dataset.station] = Math.max(Math.floor(Math.min(Number(event.srcElement.value),999)||0,0));
			idleGame.saveSettings();
		}

		$('#'+event.srcElement.dataset.replace)[0].style.display = "block";
		event.srcElement.setAttribute("onfocusout", "");
		event.srcElement.remove();
		idleGame.idleGameUpdateDialog();
			
	},

	removeInput: (event) => {
		
		idleGame.settings.targets[event.srcElement.dataset.station] = Math.max(Math.floor(Math.min(Number(event.srcElement.value),999)||0,0));
		idleGame.saveSettings();
		
		$('#'+event.srcElement.dataset.replace)[0].style.display = "block";
		
		event.srcElement.remove();

		idleGame.idleGameUpdateDialog();
	},

	idleGameUpdateDialog: () => {

		for (let building in idleGame.data) {
			if (!Object.hasOwnProperty.call(idleGame.data, building)) continue;
			idleGame.data[building] = idleGame.Production(idleGame.data[building])
		}

		let degree = 0;
		let sum = 0;

		for (let b in idleGame.data) {
			if (!Object.hasOwnProperty.call(idleGame.data, b)) continue;
			if (idleGame.data[b].degree > degree && idleGame.data[b].type === 'work'){
				degree = idleGame.data[b].degree;
			}
		}
		let worktitle = ''
		for (let b in idleGame.data) {
			if (!Object.hasOwnProperty.call(idleGame.data, b)) continue;
			if (idleGame.data[b].type === 'work'){
				sum += Math.pow(1000, idleGame.data[b].degree - degree) * idleGame.data[b].production
				worktitle += `<br/>${idleGame.data[b].baseData.name}: ${idleGame.data[b].production.toPrecision(3)} ${idleGame.iGNums[idleGame.data[b].degree]}`
			}
		}

		while (Number(sum.toPrecision(3)) >= 1000 && degree<6) {
			sum /= 1000;
			degree += 1;
		}

		let ident = '#idleGame_Work';
		let work = sum;
		let workd = degree;
		let ship = idleGame.data['transport_1'].production;
		let shipd = idleGame.data['transport_1'].degree;
		let fest = idleGame.data['market_1'].production;
		let festd = idleGame.data['market_1'].degree;

		if (shipd < degree || (shipd === degree && ship < sum)) {
			degree = shipd;
			sum = ship;
			ident = '#idleGame_Ship'
		}
		if (festd < degree || (festd === degree && fest < sum)) {
			ident = '#idleGame_Fest';
			sum = fest;
			degree = festd
		}

		$('#idleGame_Work').removeClass("highlight");
		$('#idleGame_Ship').removeClass("highlight");
		$('#idleGame_Fest').removeClass("highlight");
		$(ident).addClass("highlight");

		for (let x in idleGame.data) {
			if (!Object.hasOwnProperty.call(idleGame.data, x)) continue;
			$('#idleGame_'+x+'Level').text(`${idleGame.data[x].level} → ${idleGame.data[x].next}`);
			$('#idleGame_'+x).text(`${idleGame.bigNum(idleGame.data[x].need)}${idleGame.iGNums[idleGame.data[x].ndegree]}`);
			$('#idleGame_'+x+'Time').html(`${idleGame.time(idleGame.data[x].need,idleGame.data[x].ndegree,sum,degree,0,0,fest,festd)}`);
			$('#idleGame_'+x).attr('data-original-title', `${idleGame.bigNum(idleGame.data[x].need)} ${idleGame.iGNumTitles[idleGame.data[x].ndegree]}`);
		
		}

		$('#idleGame_Work').text(`${idleGame.bigNum(work)} ${idleGame.iGNums[workd]}`);
		$('#idleGame_Work').attr('data-original-title', `${idleGame.bigNum(work)} ${idleGame.iGNumTitles[workd]}<br>${worktitle}`);
		$('#idleGame_Ship').text(`${idleGame.bigNum(ship)} ${idleGame.iGNums[shipd]}`);
		$('#idleGame_Ship').attr('data-original-title', `${idleGame.bigNum(ship)} ${idleGame.iGNumTitles[shipd]}`);
		$('#idleGame_Fest').text(`${idleGame.bigNum(fest)} ${idleGame.iGNums[festd]}`);
		$('#idleGame_Fest').attr('data-original-title', `${idleGame.bigNum(fest)} ${idleGame.iGNumTitles[festd]}`);

		let i = Math.min(idleGame.Tasklist.length, 9);

		for (let t = 0;t<3;t++) {
			$('#idleGame_Task'+ t).text(``);
			$('#idleGame_Task'+ t).addClass('hide');
			$('#time'+ t).text(``);
			$('#time'+ t).addClass('hide');
			if (t >= i) continue;

			let Task = idleGame.Tasks[idleGame.Tasklist[t]];
			if (Task.type !== "collect_idle_currency") continue;

			$('#idleGame_Task'+ t).text(`${Task.description}`);
			$('#idleGame_Task'+ t).removeClass('hide');
			let target=Task.targets[0]
			let targetProduction=idleGame.data[target].production;
			let targetDegree=idleGame.data[target].degree;
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
			
			$('#time'+ t).html(`${idleGame.time(Task.requiredProgress.value,
												Task.requiredProgress.degree,
												targetProduction,
												targetDegree,
												idleGame.Taskprogress[idleGame.Tasklist[t]]?.value || 0,
												idleGame.Taskprogress[idleGame.Tasklist[t]]?.degree || 0,
												0,0)}`);
			$('#time'+ t).removeClass('hide');
			
			
			
		}
		for (let t = 3;t<9;t++) {
			if (t < i) {
				let Task = idleGame.Tasks[idleGame.Tasklist[t]];
				$('#idleGame_Task'+ t).text(`${Task.description}`);
				$('#idleGame_Task'+ t).removeClass('hide');
				
			} else {
				$('#idleGame_Task'+ t).text(``);
				$('#idleGame_Task'+ t).addClass('hide');
			}
		}
		
		idleGame.checkStrat();
		
		idleGame.DisplayStrat(idleGame.checkStrat());
		
		const text_currentrun = `${i18n('Boxes.idleGame.CurrentRun')}: ${idleGame.Stage} / ${i18n('Boxes.idleGame.Variant')}: ${idleGame.Variant}`;
		let text_currentrun_short = `${idleGame.Stage}/${idleGame.Variant}`;
		let Tt = idleGame.finishTown
		let Td = idleGame.finishTownDegree
		
		if (idleGame.Stage === 1) {
			Tt = 1
			Td = 2
		}

		let text_nexttown = `${i18n('Boxes.idleGame.NextTown')} ${Tt} ${idleGame.iGNums[Td]}: `
		text_nexttown += `${idleGame.time(Tt,Td,sum,degree,idleGame.Progress,idleGame.ProgressDegree,fest,festd)}<br/>`
		let discounted = Math.round(idleGame.finishTownDiscount * Tt * 100) / 100
		text_nexttown += `${discounted} ${idleGame.iGNums[Td]}: `
		text_nexttown += `${idleGame.time(discounted,Td,sum,degree,idleGame.Progress,idleGame.ProgressDegree,fest,festd)}`;
		
		
		$('#idleGame_Town').html(`${text_currentrun}<br/>${text_nexttown}`);

		text_nexttown = `${Tt}${idleGame.iGNums[Td]}: `
		text_nexttown += `${idleGame.time(Tt,Td,sum,degree,idleGame.Progress,idleGame.ProgressDegree,fest,festd)}`
		discounted = Math.round(idleGame.finishTownDiscount * Tt * 100) / 100;
		let discounted_time = idleGame.time(discounted,Td,sum,degree,idleGame.Progress,idleGame.ProgressDegree,fest,festd);
		if (!discounted_time.includes("999")) {
			text_nexttown += `, ${discounted}${idleGame.iGNums[Td]}: `
			text_nexttown += `${discounted_time}`;
		}
		
		$('.idleGame_Town').html(`<span data-original-title="${text_currentrun}">${text_currentrun_short}</span> &middot; ${text_nexttown}`);

		$('#idleGameDialogBody [data-original-title]').tooltip();

	},

	Production: (building) => {

		if (building.level === 0) {
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

		if (idleGame.settings.targets[building.baseData.id] > building.level) {
			x = idleGame.settings.targets[building.baseData.id];
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

	
	time: (amount, da, hourly, dh, stock, ds, fest, df) => {
		
		let t = (amount, da, hourly, dh, stock, ds) => {
			stock = stock * Math.pow(1000, ds - da);
			let diff = amount - stock;
			if (diff <= 0) return {h:0,m:0};
			let total = Math.ceil(diff / hourly * Math.pow(1000,da-dh) * 60)
			let hours = Math.floor(total / 60)
			let minutes = total-hours*60;
			return {h:hours,m:minutes,t:total}
		}
		let tf = (time)=> {
			return time.h >= 1000 ? `>999h` : `${time.h}h` + (time.h < 24 ? `:${time.m}m` : ``)
		}
		
		let t0 = t(amount, da, hourly, dh, stock, ds)
		let tNB = t(amount, da, fest, df, stock, ds)
		
		let time = `<span ${(t0.t > tNB.t) ? 'data-original-title="' + tf(tNB)+'<br>' + i18n("Boxes.idleGame.noBottleneck")+'"':''}>${tf(t0)}</span>`		
		time += (t0.h < 24) ? ` <img class="clickable" data-original-title="${i18n("Boxes.idleGame.SetTimer")}" src="${srcLinks.get("/shared/gui/plus_offer/plus_offer_time.png", true)}" alt="" onclick="idleGame.addAlert(${t0.h},${t0.m})">` : ``
		return time;
	},

	bigNum: (number) => {
		bigNum = Number(number.toPrecision(3)) >= 1000 ? `${Math.floor(number)}` : `${number.toPrecision(3)}`;
		return bigNum;
	},

	hide: (id) => {
		$(id).toggleClass("hide");
		let i = idleGame.settings.hiddenTables.indexOf(id);
		if (i > -1) {
			idleGame.settings.hiddenTables.splice(i , 1)
		} else {
			idleGame.settings.hiddenTables.push(id);
		}
		idleGame.saveSettings();
	},

	saveSettings:() => {
		localStorage.setItem('idleGameSettings', JSON.stringify(idleGame.settings));
	},

	StratUndo:() =>{
		let strat = 0;
		for (strat = 0; strat < idleGame.settings.Strategy[idleGame.event][idleGame.Variant].length;strat++) {
			if (idleGame.settings.Strategy[idleGame.event][idleGame.Variant][strat].check == false) break;
		}
		if (strat==0) return;
		if (strat==idleGame.settings.Strategy[idleGame.event][idleGame.Variant].length) $('#idleGame_StratCheck').html("check");
		strat--;
		idleGame.settings.Strategy[idleGame.event][idleGame.Variant][strat].check = false;

		idleGame.DisplayStrat(strat);
		idleGame.saveSettings();
	},
	
	StratCheck:() =>{
		let strat = 0;
		for (strat = 0; strat < idleGame.settings.Strategy[idleGame.event][idleGame.Variant].length;strat++) {
			if (idleGame.settings.Strategy[idleGame.event][idleGame.Variant][strat].check == false) break;
		}
		if (strat==idleGame.settings.Strategy[idleGame.event][idleGame.Variant].length) return;
		idleGame.settings.Strategy[idleGame.event][idleGame.Variant][strat].check = true;
		strat++;
		idleGame.DisplayStrat(strat);
		idleGame.saveSettings();		
	},

	checkStrat:()=>{
		let strat = 0;
		for (strat = 0; strat < idleGame.settings.Strategy[idleGame.event][idleGame.Variant].length;strat++) {
			if (idleGame.settings.Strategy[idleGame.event][idleGame.Variant][strat].check == false) {
				let conditions = idleGame.settings.Strategy[idleGame.event][idleGame.Variant][strat].conditions || []
				if (conditions.length ==0) break;
				let clear = true
				for (let condition of conditions) {
					let type=condition[0];
					let building = "";
					let value = 0;
					if (type == "M" || type == "L") {
						building=condition[1];
						switch (building) {
							case "F": building="market_1"; break;
							case "T": building="transport_1"; break;
							default: building="workshop_"+building;
						}
						value = Number(condition.slice(3));
					} else {
						value = Number(condition.slice(2));
					}

					switch (type) {
						case "T": //Task complete?
							if (idleGame.Tasklist.indexOf(value)>=0) clear = false;
							break;
						case "W": //Task active or complete?
							if (idleGame.Tasklist.indexOf(value)>=3) clear = false;
							break;
						case "M": //Manager Level
							if (idleGame.data[building].manager < value) clear = false;
							break;
						case "L": //Building Level
							if (idleGame.data[building].level < value) clear = false;
							break;
					}

				}
				if (clear) {
					idleGame.settings.Strategy[idleGame.event][idleGame.Variant][strat].check = true
				} else {
					break;
				}
			}
		}
		return strat
	},

	DisplayStrat:(strat) => {
		if (strat-1>=0) {
			$('#idleGame_StratPrev').html(idleGame.settings.Strategy[idleGame.event][idleGame.Variant][strat-1].text);
			$('#idleGame_StratUndo').html('☑');
		} else {
			$('#idleGame_StratPrev').html('');
			$('#idleGame_StratUndo').html('');
		}

		if (strat<idleGame.settings.Strategy[idleGame.event][idleGame.Variant].length) {
			$('#idleGame_StratCheck').html('☐');
			$('#idleGame_Strat').html(idleGame.settings.Strategy[idleGame.event][idleGame.Variant][strat].text);
		
		} else {
			$('#idleGame_StratCheck').html('');
			$('#idleGame_Strat').html('');
		}
		
		if (strat+1<idleGame.settings.Strategy[idleGame.event][idleGame.Variant].length) {
			$('#idleGame_StratNext').html(idleGame.settings.Strategy[idleGame.event][idleGame.Variant][strat+1].text);
		} else {
			$('#idleGame_StratNext').html('');
		}
	},

	modifyStrategy:()=>{
		let list = idleGame.settings.Strategy[idleGame.event][idleGame.Variant].map(x => x.text + (x.conditions.length > 0 ? "#":"") + x.conditions.join('#')).join('\n');
		if ($('#idleGameStrategyDialog').length == 0) {
			HTML.Box({
				id: 'idleGameStrategyDialog',
				title: i18n('Boxes.idleGame.Strategy.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: false,
				resize : true
			});
		}
		let h = `<textarea id="idleGameStratText">${list}</textarea><button id="idleGameStratSave" class="btn" onclick="idleGame.saveStrategy()">${i18n('General.Save')}</button>`;
		$('#idleGameStrategyDialogBody').html(h)
	},

	saveStrategy:()=>{
		let lines = $('#idleGameStratText').val().split('\n');
		
		idleGame.settings.Strategy[idleGame.event][idleGame.Variant] = lines.map(x=>{
			let conditions= x.split('#'); 
			return {"text": conditions[0],"check": false,"conditions":conditions.slice(1)}});
		idleGame.saveSettings();
		idleGame.DisplayStrat(0);
		HTML.CloseOpenBox('idleGameStrategyDialog')
	},

	test:()=>{
		idleGame.Variant=1
		idleGame.selectEventData()
		idleGame.ShowDialog()
		idleGame.idleGameUpdateDialog()
	},

	addAlert:(hours,minutes)=>{
					
			const data = {
				title: "Idle Game",
				body: i18n("Boxes.idleGame.AlertText"),
				expires: moment().add(hours,"hours").add(minutes,"minutes").valueOf(),
				repeat: -1,
				persistent: true,
				tag: '',
				category: 'event',
				vibrate: false,
				actions: [{title:"OK"}]
			};
	
			MainParser.sendExtMessage({
				type: 'alerts',
				playerId: ExtPlayerID,
				action: 'create',
				data: data,
			}).then((aId) => {
				HTML.ShowToastMsg({
					head: "Idle Game",
					text: HTML.i18nReplacer(i18n('Boxes.idleGame.AlertSetText'), { minutes: minutes,hours: hours }),
					type: 'success',
					hideAfter: 5000
				});
			});
	}
};
