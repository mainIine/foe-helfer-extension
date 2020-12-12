/*
 * **************************************************************************************
 *
 * Dateiname:                 fp-collector.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              28.11.20, 21:29 Uhr
 * zuletzt bearbeitet:       28.11.20, 21:25 Uhr
 *
 * Copyright © 2020
 *
 * **************************************************************************************
 */

// - GG reward after fight [2,5,10]FP or
// - diplomaticGift or spoilsOfWar
// - hiddenreward from mainmap
FoEproxy.addHandler('RewardService', 'collectReward', (data, postData) => {

	const d = data.responseData[0][0];

	let event = data.responseData[1];

	if(d['subType'] !== 'strategy_points'){
		return;
	}

	// default is hiddenreward
	else if(event === 'default')
	{
		event = 'hiddenReward';
	}

	StrategyPoints.insertIntoDB({
		event: event,
		amount: d['amount'],
		date: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')
	});
});


// GEX FP from chest
FoEproxy.addHandler('GuildExpeditionService', 'openChest', (data, postData) => {
	const d = data['responseData'];

	if(d['subType'] !== 'strategy_points'){
		return;
	}

	StrategyPoints.insertIntoDB({
		event: 'chest',
		amount: d['amount'],
		date: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')
	});
});


// Visit other tavern
FoEproxy.addHandler('FriendsTavernService', 'getOtherTavern', (data, postData) => {
	const d = data['responseData'];

	if(!d['rewardResources'] || !d['rewardResources']['resources'] || !d['rewardResources']['resources']['strategy_points'] || !postData[0] || !postData[0]['requestData'] || !postData[0]['requestData'][0]){
		return;
	}

	const player = PlayerDict[postData[0]['requestData'][0]];
	console.log(player)
	StrategyPoints.insertIntoDB({
		event: 'satDown',
		notes: player ? player.PlayerName : undefined,
		amount: d['rewardResources']['resources']['strategy_points'],
		date: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')
	});
});


// Plunder reward
FoEproxy.addHandler('OtherPlayerService', 'rewardPlunder', (data, postData) => {
	for (let i = 0; i < data.responseData.length; i++) {
		let PlunderReward = data.responseData[i];

		if (PlunderReward['product'] && PlunderReward['product']['resources'] && PlunderReward['product']['resources']['strategy_points']) {
			let PlunderedFP = PlunderReward['product']['resources']['strategy_points'];

			StrategyPoints.insertIntoDB({
				event: 'plunderReward',
				amount: PlunderedFP,
				date: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')
			});
		}
	}
});


// double Collection by Blue Galaxy contains [id, type]
FoEproxy.addHandler('CityMapService', 'showEntityIcons', (data, postData) => {
	for(let i in data['responseData']) {
		if(!data['responseData'].hasOwnProperty(i)) continue;

		if (data['responseData'][i]['type'] !== 'citymap_icon_double_collection') continue;

		let CityMapID = data['responseData'][i]['id'],
			Building = MainParser.CityMapData[CityMapID],
			CityEntity = MainParser.CityEntities[Building['cityentity_id']];

		let Production = Productions.readType(Building);
		if (!Production['products']) continue;

		let FP = Production['products']['strategy_points'];
		if (!FP) continue;

		StrategyPoints.insertIntoDB({
			event: 'double_collection',
			notes: CityEntity['name'],
			amount: FP,
			date: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')
		});
	}
});


/**
 * @type {{maxDateFilter, CityMapDataNew: null, buildBody: (function(): Promise<void>), currentDateFilter, calculateTotalByType: (function(*=): number), ShowFPCollectorBox: (function(): Promise<void>), calculateTotal: (function(): number), TodayEntries: null, lockDates: [], ToggleHeader: FPCollector.ToggleHeader, intiateDatePicker: (function(): Promise<void>), getPossibleEventsByDate: (function(): []), DatePicker: null, HandleAdvanceQuest: FPCollector.HandleAdvanceQuest, minDateFilter: null}}
 */
let FPCollector = {

	minDateFilter: null,
	maxDateFilter: moment(MainParser.getCurrentDate()).toDate(),
	currentDateFilter: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD'),

	CityMapDataNew: null,

	lockDates: [],
	TodayEntries: null,

	DatePicker: null,


	/**
	 * Create the box and wrappers for the content
	 *
	 * @returns {Promise<void>}
	 * @constructor
	 */
	ShowFPCollectorBox: async ()=> {

		if( $('#fp-collector').length < 1 )
		{
			FPCollector.DatePicker = null;

			// CSS into the DOM
			HTML.AddCssFile('fp-collector');

			HTML.Box({
				id: 'fp-collector',
				title: i18n('Menu.fpCollector.Title'),
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize: true
			});

			let startMoment = null,
				endMoment = null;

			// set the first possible date for date picker
			await StrategyPoints.db['ForgePointsStats'].orderBy('id').first().then((resp) => {
				startMoment = moment(resp.date).startOf('day');
				FPCollector.minDateFilter = moment(resp.date).subtract(1, 'minute').toDate();

			}).catch(() => {
				FPCollector.minDateFilter = moment(MainParser.getCurrentDate()).toDate();
			});

			// set the last known date
			await StrategyPoints.db['ForgePointsStats'].orderBy('id').last().then((resp) => {
				endMoment = moment(resp.date).add(1, 'day'); // neccesary to include the current day
				FPCollector.maxDateFilter = moment(resp.date).endOf('day').toDate();

			}).catch(() => {

			});

			// get all days without entries and block them in the Litepicker
			let hidePicker = false;
			if(startMoment && endMoment)
			{
				while (startMoment.isBefore(endMoment, 'day'))
				{
					let checkDate = await StrategyPoints.db['ForgePointsStats'].where('date').equals(moment(startMoment).format('YYYY-MM-DD')).toArray();

					if(checkDate.length === 0){
						FPCollector.lockDates.push(moment(startMoment).format('YYYY-MM-DD'));
					}
					startMoment.add(1, 'days');
				}
			}
			else {
				// is any entry present?
				let checkPresent = await StrategyPoints.db['ForgePointsStats'].toArray();

				// no? hide the datepicker button
				if (checkPresent.length === 0) hidePicker = true;
			}

			$('#fp-collectorBody').append(
				`<div class="dark-bg head">
					<div class="text-warning"><strong>${i18n('Boxes.FPCollector.TotalFP')} <span id="fp-collector-total-fp"></span></strong></div>
					<div class="text-right"><button class="btn btn-default" id="FPCollectorPicker">${moment(FPCollector.currentDateFilter).format(i18n('Date'))}</button></div>
				</div>`,
				`<div id="fp-collectorBodyInner"></div>`
			);

			if (hidePicker) $('#FPCollectorPicker').hide();
		}

		FPCollector.buildBody();
	},


	/**
	 * Create the box content
	 *
	 * @returns {Promise<void>}
	 */
	buildBody: async ()=> {

		let tr = [];
		FPCollector.TodayEntries = await StrategyPoints.db['ForgePointsStats'].where('date').equals(FPCollector.currentDateFilter).toArray();

		$('#fp-collector-total-fp').text(await FPCollector.calculateTotal());

		// ${i18n('Boxes.FPCollector.Who')} ${i18n('Boxes.FPCollector.What')}


		if(FPCollector.TodayEntries.length === 0)
		{
			tr.push(`<div class="text-center" style="padding:15px"><em>${i18n('Boxes.FPCollector.NoEntriesFound')}</em></div>`);
		}
		else {

			const events = FPCollector.getPossibleEventsByDate();

			for (const event of events)
			{
				const sumTotal = await FPCollector.calculateTotalByType(event);
				const entriesEvent = await StrategyPoints.db['ForgePointsStats'].where({date: FPCollector.currentDateFilter, event: event}).toArray();

				tr.push(`<div class="fpcollector-accordion ${event}">`);

				tr.push(	`<div class="fpcollector-head game-cursor dark-bg ${event}-head" onclick="FPCollector.ToggleHeader('${event}')">
								<span class="image"></span>
								<strong class="text-warning">${sumTotal}</strong>
								<span>${i18n('Boxes.FPCollector.' + event)}</span>
							</div>`);

				tr.push(	`<div class="fpcollector-body ${event}-body">`);

				 entriesEvent.forEach(e => {
					 tr.push(`<div>
								<span class="fps">${e.amount}</span>
								<span class="desc">${i18n('Boxes.FPCollector.' + e.event)}</span>
								<span class="building">${e.notes ? e.notes : ''}</span>
						</div>`);
				 });

				tr.push(	`</div>`);
				tr.push(`</div>`);
			}
		}


		$('#fp-collectorBodyInner').html(tr.join('')).promise().done(function(){
			FPCollector.intiateDatePicker();
		});
	},


	/**
 * Handles FP collected from Quests
 * 
 */
	HandleAdvanceQuest: (PostData) => {
		if (PostData['requestData'] && PostData['requestData'][0]) {
			let QuestID = PostData['requestData'][0];

			for (let Quest of MainParser.Quests) {
				if (Quest['id'] !== QuestID || Quest['state'] !== 'collectReward') continue;

				// normale Quest-Belohnung
				if (Quest['genericRewards']) {
					for (let Reward of Quest['genericRewards']) {
						if (Reward['subType'] === 'strategy_points') {
							StrategyPoints.insertIntoDB({
								place: 'Quest',
								event: 'collectReward',
								amount: Reward['amount'],
								date: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')
							});
						}
					}
				}

				// Belohnung einer Schleifenquest
				if (Quest['rewards']) {
					for (let Reward of Quest['rewards']) {
						if (Reward['type'] === 'forgepoint_package') {
							StrategyPoints.insertIntoDB({
								place: 'Quest',
								event: 'collectReward',
								amount: Number(Reward['subType']),
								date: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')
							});
						}
					}
				}
			}
		}
	},


	/**
	 * Get Total fps from one specific day
	 *
	 * @param date
	 * @returns {Promise<number>}
	 */
	calculateTotal: async ()=> {
		let totalFP = 0;

		await StrategyPoints.db['ForgePointsStats']
			.where('date')
			.equals(FPCollector.currentDateFilter)
			.each (entry => totalFP += entry.amount);

		return totalFP;
	},


	calculateTotalByType: async (event)=> {
		let totalFPByType = 0;

		await StrategyPoints.db['ForgePointsStats']
			.where({
				date: FPCollector.currentDateFilter,
				event: event
			})
			.each(entry => totalFPByType += entry.amount)
		;

		return totalFPByType;
	},


	/**
	 * Initatite the Litepicker object
	 *
	 * @returns {Promise<void>}
	 */
	intiateDatePicker: async () => {

		if(FPCollector.DatePicker !== null){
			return ;
		}

		FPCollector.DatePicker = new Litepicker({
			element: document.getElementById('FPCollectorPicker'),
			format: i18n('Date'),
			lang: MainParser.Language,
			singleMode: true,
			splitView: false,
			numberOfMonths: 1,
			numberOfColumns: 1,
			autoRefresh: true,
			lockDays: FPCollector.lockDates,
			minDate: FPCollector.minDateFilter,
			maxDate: FPCollector.maxDateFilter,
			showWeekNumbers: false,
			onSelect: async (date)=> {
				$('#FPCollectorPicker').text(`${moment(date).format(i18n('Date'))}`);

				FPCollector.currentDateFilter = moment(date).format('YYYY-MM-DD');
				await FPCollector.buildBody();
			}
		});
	},


	getPossibleEventsByDate: ()=> {
		let available = [];

		FPCollector.TodayEntries.forEach(e => {
			if(!available.includes(e['event']))
			{
				available.push(e['event'])
			}
		});

		return available;
	},


	ToggleHeader: (event)=> {
		let $this = $(`.${event}`),
			isOpen = $this.hasClass('open');

		$('.fpcollector-accordion').removeClass('open');

		if(!isOpen){
			$this.addClass('open');
		}
	}
};