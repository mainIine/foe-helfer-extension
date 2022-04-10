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

FoEproxy.addHandler('GrandPrizeService', 'getGrandPrizes', (data, postData) => {
	FPCollector.curentEvent = data.responseData[0].context;
});

FoEproxy.addHandler('TimedSpecialRewardService', 'getTimedSpecial', (data, postData) => {
	FPCollector.curentEvent = data.responseData['context'];
});

// - GG reward after fight [2,5,10]FP or PvP reward
// - diplomaticGift or spoilsOfWar or shards
// - hiddenreward from mainmap
// - Event reward or Event leagueReward
// - Daily reward box castle system
// - personal rank gain chest Truhe PvP-Arena
FoEproxy.addHandler('RewardService', 'collectReward', (data, postData) => {

	const d = data.responseData[0][0];
	let eventCheck = data.responseData[1],
		event = data.responseData[1],
		notes = null,
		amount = d['amount'];


	if (FPCollector.curentEvent !== null ) {
		if (eventCheck.toLowerCase().includes("event")) {
			event = FPCollector.curentEvent;
		}
		if (eventCheck.includes("AutoCollect")) {
			event = FPCollector.curentEvent;
			notes = i18n('Boxes.FPCollector.auto_collect');
		}
		if (eventCheck.includes("task_reward")) {
			event = FPCollector.curentEvent;
			notes = i18n('Boxes.FPCollector.task_reward');
		}
		if (eventCheck.includes("card_duel")) {
			event = FPCollector.curentEvent;
			notes = i18n('Boxes.FPCollector.card_duel');
		}
		if (eventCheck.includes("reward_calendar")) {
			event = FPCollector.curentEvent;
			notes = i18n('Boxes.FPCollector.reward_calendar');
		}
		if (eventCheck.toLowerCase().includes("grandprize") || eventCheck.includes("grand_prize") || eventCheck.includes("event_pass") ) {
			event = FPCollector.curentEvent;
			notes = i18n('Boxes.FPCollector.grand_prize');
		}
	}

	if (d['subType'] !== 'strategy_points') {

		if (data.responseData[1] === 'castle_system') { // Tägliche Belohnungskiste
			event = 'castle_system_daily_reward_chest';
			notes = d['name'];
			amount = d.rewards[0]['amount'];
		}
		else if (data.responseData[1] === 'pvp_arena') { // persönlicher Rang gewinn Truhe
			event = 'pvp_arena';
			notes = d['name'];
			amount = 0;
			rewards = d['rewards'];
			if (!Array.isArray(rewards)) { 
				return; 
			}
			for (let reward of rewards) {
				if (reward['subType'] === 'strategy_points') {
					amount = reward['amount'];
				}
			}
			if (amount === 0) {
				return;
			}
		}
		else {
			return;
		}
	}

	else if (event === 'default') {	// default is hiddenreward or leaguereward or flying island incidents
		event = 'hiddenReward';
		if (isCurrentlyInOutpost === 1) {
			event = 'shards';
		}
		if (postData[0].requestMethod === 'useItem') {
			event = !FPCollector.curentEvent ? i18n('Boxes.FPCollector.league_reward') : FPCollector.curentEvent;
			notes = !FPCollector.curentEvent ? moment(MainParser.getCurrentDate()).format('YYYY-MM-DD') : i18n('Boxes.FPCollector.league_reward');
		}
		if (postData[0].requestMethod === 'advanceQuest') {
			return;
		}
	}

	StrategyPoints.insertIntoDB({
		event: event,
		notes: notes ? notes : '',
		amount: amount,
		date: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')
	});
});

// - reward calendar completion
FoEproxy.addHandler('InventoryService', 'getItem', (data, postData) => {

	let eventCheck = data.responseData.itemAssetName;
	
	if (eventCheck.includes("calendar_completion")) {
		
		let event = !FPCollector.curentEvent ? i18n('Boxes.FPCollector.event') : FPCollector.curentEvent,
			notes = i18n('Boxes.FPCollector.reward_calendar_completion'),
			amount = 0,
			rewards = data.responseData.item.reward['rewards'];
			
		if (!Array.isArray(rewards)) {
			return;
		}
		
		for (let reward of rewards) {
			if (reward['subType'] === 'strategy_points') {
				amount += reward['amount'];
			}
		}
		
		if (amount === 0) {
			return;
		}
		
	}
	else {
		return;
	}
	
	StrategyPoints.insertIntoDB({
		event: event,
		notes: notes,
		amount: amount,
		date: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')
	});
});

// GEX FP from chest
FoEproxy.addHandler('GuildExpeditionService', 'openChest', (data, postData) => {

	const d = data['responseData'];

	if (d['subType'] !== 'strategy_points'){
		return;
	}

	StrategyPoints.insertIntoDB({
		event: 'chest',
		amount: d['amount'],
		date: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')
	});
});


// Visit other players (satDown)
FoEproxy.addHandler('FriendsTavernService', 'getOtherTavern', (data, postData) => {

	const d = data['responseData'];

	if (!d['rewardResources'] || !d['rewardResources']['resources'] || !d['rewardResources']['resources']['strategy_points'] || !postData[0] || !postData[0]['requestData'] || !postData[0]['requestData'][0]){
		return;
	}

	const player = PlayerDict[postData[0]['requestData'][0]];

	StrategyPoints.insertIntoDB({
		event: 'satDown',
		notes: player ? `<img src="${MainParser.InnoCDN + 'assets/shared/avatars/' + (MainParser.PlayerPortraits[player['Avatar']] || 'portrait_433')}.jpg"><span>${MainParser.GetPlayerLink(player['PlayerID'], player['PlayerName'])}</span>` : '',
		amount: d['rewardResources']['resources']['strategy_points'],
		date: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')
	});
});


// Plunder reward
FoEproxy.addHandler('OtherPlayerService', 'visitPlayer', (data, postData) => {
	const playerId = data.responseData.other_player.player_id;
	FPCollector.lastVisitedPlayer = playerId;
});

FoEproxy.addHandler('CityMapService', 'reset', (data, postData) => {
	for (let i = 0; i < data.responseData.length; i++) {
		const entityId = data.responseData[i].cityentity_id;
		FPCollector.lastPlunderedEntity = entityId;	
	}
});

FoEproxy.addHandler('OtherPlayerService', 'rewardPlunder', (data, postData) => {

	setTimeout(function() {
		
		for (let i = 0; i < data.responseData.length; i++) {

			let PlunderReward = data.responseData[i];

			if (PlunderReward['product'] && PlunderReward['product']['resources'] && PlunderReward['product']['resources']['strategy_points']) {

				let PlunderedFP = PlunderReward['product']['resources']['strategy_points'];

				const player = PlayerDict[FPCollector.lastVisitedPlayer];
				
				const entity = MainParser.CityEntities[FPCollector.lastPlunderedEntity];

				StrategyPoints.insertIntoDB({
					event: 'plunderReward',
					notes: player ? `<img src="${MainParser.InnoCDN + 'assets/shared/avatars/' + MainParser.PlayerPortraits[player['Avatar']]}.jpg"><span>${MainParser.GetPlayerLink(player['PlayerID'], player['PlayerName'])}${entity ? ' - ' + entity['name'] : ''}</span>` : '',
					amount: PlunderedFP,
					date: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')
				});
			}
		}
	}, 1000);
});


// double Collection by Blue Galaxy contains [id, type]
FoEproxy.addHandler('CityMapService', 'showEntityIcons', (data, postData) => {

	for (let i in data['responseData']) {

		if (!data['responseData'].hasOwnProperty(i)) continue;

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
 * @type {{maxDateFilter, CityMapDataNew: null, buildBody: (function(): Promise<void>), currentDateFilter, calculateTotalByType: (function(*=): number), ShowFPCollectorBox: (function(): Promise<void>), calculateTotal: (function(): number), TodayEntries: null, lockDates: [], ToggleHeader: FPCollector.ToggleHeader, initiateDatePicker: (function(): Promise<void>), getPossibleEventsByDate: (function(): []), DatePicker: null, HandleAdvanceQuest: FPCollector.HandleAdvanceQuest, minDateFilter: null}}
 */
let FPCollector = {

	curentEvent: null,
	lastVisitedPlayer: null,
	lastPlunderedEntity: null,

	minDateFilter: null,
	maxDateFilter: moment(MainParser.getCurrentDate()).toDate(),
	currentDateFilter: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD'),
	currentDateEndFilter: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD'),

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
		moment.locale(i18n('Local'));

		if ( $('#fp-collector').length < 1 )
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
			if (startMoment && endMoment)
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
					<div class="text-warning"><strong>${i18n('Boxes.FPCollector.Total')} <span id="fp-collector-total-fp"></span>${i18n('Boxes.FPCollector.FP')}</strong></div>
					<div class="text-right"><button class="btn btn-default btn-tight" id="FPCollectorPicker">${FPCollector.formatRange()}</button></div>
				</div>`,
				`<div id="fp-collectorBodyInner"></div>`
			);

			if (hidePicker) $('#FPCollectorPicker').hide();
		}
		else {
			HTML.CloseOpenBox('fp-collector');
			return;
		}

		await FPCollector.buildBody();
	},


	/**
	 * Create the box content
	 *
	 * @returns {Promise<void>}
	 */
	buildBody: async ()=> {

		let tr = [];
		FPCollector.TodayEntries = await StrategyPoints.db['ForgePointsStats'].where('date').between(FPCollector.currentDateFilter, FPCollector.currentDateEndFilter, true, true).toArray();

		$('#fp-collector-total-fp').text(await FPCollector.calculateTotal());

		if (FPCollector.TodayEntries.length === 0)
		{
			tr.push(`<div class="text-center" style="padding:15px"><em>${i18n('Boxes.FPCollector.NoEntriesFound')}</em></div>`);
		}
		else {

			const events = FPCollector.getPossibleEventsByDate();

			for (const event of events)
			{
				const sumTotal = await FPCollector.calculateTotalByType(event);
				const entriesEvent = FPCollector.getEntriesByEvent(event);

				tr.push(`<div class="foehelper-accordion ${event}">`);

				tr.push(	`<div class="foehelper-accordion-head game-cursor ${event}-head" onclick="FPCollector.ToggleHeader('${event}')">
								<span class="image"></span>
								<strong class="text-warning">${sumTotal}${i18n('Boxes.FPCollector.FP')}</strong>
								<span>${i18n('Boxes.FPCollector.' + event)}</span>
							</div>`);

				tr.push(	`<div class="foehelper-accordion-body ${event}-body">`);

				 entriesEvent.forEach(e => {
					 tr.push(`<div>
								<span class="fps">${e.amount.toLocaleString(i18n('Local'))}${i18n('Boxes.FPCollector.FP')}</span>
								<span class="desc">${i18n('Boxes.FPCollector.' + e.event)}</span>
								<span class="building">${e.notes ? e.notes : ''}</span>
						</div>`);
				 });

				tr.push(	`</div>`);
				tr.push(`</div>`);
			}
		}


		$('#fp-collectorBodyInner').html(tr.join('')).promise().done(function(){
			FPCollector.initiateDatePicker();
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
								event: 'collectReward',
								notes: Quest['windowTitle'] ? Quest['windowTitle'] : '',
								amount: Reward['amount'],
								date: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')
							});
						}
					}
				}

				// Kulturelle Siedlung Abschlussbelohnung
				if (Quest['genericRewards']) {
					for (let Reward of Quest['genericRewards']) {
						if (Reward['type'] === 'outpost_complete_item') {
							let CastleSystemLevel,
								CastleSystemBonus,
								CastlePoints = ResourceStock['castle_points'] | 0;
							for (let i=0; i < MainParser.CastleSystemLevels.length; i++) {
								let NextLevel = MainParser.CastleSystemLevels[i];
								if (CastlePoints < NextLevel['requiredPoints']) break;
								CastleSystemLevel = NextLevel['level'];
								let NextLevelPermanentRewards = NextLevel['permanentRewards'][CurrentEra];
								for (let j in NextLevelPermanentRewards) {
									if (NextLevelPermanentRewards[j]['subType'] === "cop_playthrough_reward") {
										CastleSystemBonus = NextLevelPermanentRewards[j]['id'].replace(/[^0-9]/g, '');
									}
								}
							}
							if (Reward['subType'] === 'vikings') {
								amount = Quest['maxSeasonProgress'] >= 16 ? 50 : 0;
							}
							if (Reward['subType'] === 'japanese') {
								amount = Quest['maxSeasonProgress'] >= 14 ? 50 : 0;
							}
							if (Reward['subType'] === 'egyptians') {
								amount = Quest['maxSeasonProgress'] >= 11 ? 60 : 0;
							}
							if (Reward['subType'] === 'aztecs') {
								amount = Quest['maxSeasonProgress'] >= 14 ? 55 : 0;
							}
							if (Reward['subType'] === 'mughals') {
								amount = Quest['maxSeasonProgress'] >= 11 ? 60 : 0;
							}
							if (amount === 0 && CastleSystemLevel <= 3) {
								return;
							}
							StrategyPoints.insertIntoDB({
								event: 'collectReward',
								notes: Quest['windowTitle'] ? Quest['windowTitle'] : '',
								amount: parseInt(amount) + parseInt(CastleSystemBonus),
								date: moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')
							});
						}
					}
				}

				// Belohnung einer Schleifenquest
				if (Quest['genericRewards']) {
					for (let Reward of Quest['genericRewards']) {
						if (Reward['type'] === 'forgepoint_package') {
							StrategyPoints.insertIntoDB({
								event: 'collectReward',
								notes: Quest['windowTitle'] ? Quest['windowTitle'] : '',
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

		FPCollector.TodayEntries.forEach(e => {
			totalFP += e.amount
		});

		return totalFP.toLocaleString(i18n('Local'));
	},


	calculateTotalByType: async (event)=> {
		let totalFPByType = 0;

		FPCollector.TodayEntries.forEach(e => {
			if(e['event'] === event)
			{
				totalFPByType += e.amount
			}
		});

		return totalFPByType.toLocaleString(i18n('Local'));
	},


	/**
	 * Initatite the Litepicker object
	 *
	 * @returns {Promise<void>}
	 */
	initiateDatePicker: async () => {

		if(FPCollector.DatePicker !== null){
			return ;
		}

		FPCollector.DatePicker = new Litepicker({
			element: document.getElementById('FPCollectorPicker'),
			format: i18n('Date'),
			lang: MainParser.Language,
			singleMode: false,
			splitView: false,
			numberOfMonths: 1,
			numberOfColumns: 1,
			autoRefresh: true,
			lockDays: FPCollector.lockDates,
			minDate: FPCollector.minDateFilter,
			maxDate: FPCollector.maxDateFilter,
			startDate: FPCollector.currentDateFilter,
			endDate: FPCollector.currentDateEndFilter,
			showWeekNumbers: false,
			onSelect: async (dateStart, dateEnd)=> {
				FPCollector.currentDateFilter = moment(dateStart).format('YYYY-MM-DD');
				FPCollector.currentDateEndFilter = moment(dateEnd).format('YYYY-MM-DD');

				$('#FPCollectorPicker').text(FPCollector.formatRange());
				await FPCollector.buildBody();
			}
		});
	},


	formatRange: ()=> {
		let text = undefined;
		let dateStart = moment(FPCollector.currentDateFilter);
		let dateEnd = moment(FPCollector.currentDateEndFilter);

		if (dateStart.isSame(dateEnd)){
			text = `${dateStart.format(i18n('Date'))}`;
		}
		else if (dateStart.year() !== (dateEnd.year())){
			text = `${dateStart.format(i18n('Date'))}` + ' - ' + `${dateEnd.format(i18n('Date'))}`;
		}
		else {
			text = `${dateStart.format(i18n('DateShort'))}` + ' - ' + `${dateEnd.format(i18n('Date'))}`;
		}

		return text;
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


	getEntriesByEvent: (event)=> {
		let entries = [];

		FPCollector.TodayEntries.forEach(e => {
			if(e['event'] === event)
			{
				entries.push(e)
			}
		});

		return entries;
	},


	ToggleHeader: (event)=> {
		let $this = $(`.${event}`),
			isOpen = $this.hasClass('open');

		$('#fp-collectorBodyInner .foehelper-accordion').removeClass('open');

		if(!isOpen){
			$this.addClass('open');
		}
	}
};
