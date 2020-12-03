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

	let place = 'Guildfights',
		event = data.responseData[1];

	if(d['subType'] !== 'strategy_points'){
		return;
	}

	if(event === 'guildExpedition')
	{
		place = 'Guildexpedition';
	}

	// default is hiddenreward
	else if(event === 'default')
	{
		place = 'Mainmap';
		event = 'hiddenReward';
	}

	StrategyPoints.insertIntoDB({
		place: place,
		event: event,
		amount: d['amount'],
		date: moment(MainParser.getCurrentDate()).startOf('day').toDate()
	});
});

// GEX FP from chest
FoEproxy.addHandler('GuildExpeditionService', 'openChest', (data, postData) => {
	const d = data['responseData'];

	if(d['subType'] !== 'strategy_points'){
		return;
	}

	StrategyPoints.insertIntoDB({
		place: 'Guildexpedition',
		event: 'chest',
		amount: d['amount'],
		date: moment(MainParser.getCurrentDate()).startOf('day').toDate()
	});
});

// Visit other tavern
FoEproxy.addHandler('FriendsTavernService', 'getOtherTavern', (data, postData) => {
	const d = data['responseData'];

	if(!d['rewardResources'] || !d['rewardResources']['resources'] || !d['rewardResources']['resources']['strategy_points']){
		return;
	}

	StrategyPoints.insertIntoDB({
		place: 'FriendsTavern',
		event: 'satDown',
		amount: d['rewardResources']['resources']['strategy_points'],
		date: moment(MainParser.getCurrentDate()).startOf('day').toDate()
	});
});

// double Collection by Blue Galaxy
FoEproxy.addHandler('CityMapService', 'showEntityIcons', (data, postData) => {

	if(data['responseData'][0]['type'] !== 'citymap_icon_double_collection'){
		return;
	}

	StrategyPoints.pickupProductionId = data['responseData'][0]['id'];
});

// Plunder reward
FoEproxy.addHandler('OtherPlayerService', 'rewardPlunder', (data, postData) => {
	for (let i = 0; i < data.responseData.length; i++) {
		let PlunderReward = data.responseData[i];

		if (PlunderReward['product'] && PlunderReward['product']['resources'] && PlunderReward['product']['resources']['strategy_points']) {
			let PlunderedFP = PlunderReward['product']['resources']['strategy_points'];

			StrategyPoints.insertIntoDB({
				place: 'OtherPlayer',
				event: 'plunderReward',
				amount: PlunderedFP,
				date: moment(MainParser.getCurrentDate()).startOf('day').toDate()
			});
		}
	}
});

// BlueGalaxy event (double PickUp)
FoEproxy.addHandler('CityProductionService', 'pickupProduction', (data, postData) => {

	if(!StrategyPoints.pickupProductionId){
		return;
	}

	const pickUpID = StrategyPoints.pickupProductionId;
	const d = data['responseData']['updatedEntities'];

	for(let i in d)
	{
		if(!d.hasOwnProperty(i)) continue;

		if(pickUpID !== d[i]['id']){
			return ;
		}

		let id = d[i]['cityentity_id'],
			name = MainParser.CityEntities[id]['name'],
			amount;

		// Eventbuildings
		if(d[i]['type'] === 'residential')
		{
			// has this building forge points?
			if(!d[i]['state']['current_product']['product']['resources']['strategy_points']){
				return;
			}

			amount = d[i]['state']['current_product']['product']['resources']['strategy_points'];
		}

		// Production building like Terrace fields
		else {
			let level = d[i]['level'],
				products = MainParser.CityEntities[id]['entity_levels'][level]['production_values'];

			const product = Object.values(products).filter(f => f['type'] === 'strategy_points');

			amount = product[0]['value'];
		}

		StrategyPoints.insertIntoDB({
			place: 'pickupProduction',
			event: 'double_collection',
			notes: name,
			amount: amount,
			date: moment(MainParser.getCurrentDate()).startOf('day').toDate()
		});
	}

	// reset
	StrategyPoints.pickupProductionId = null;
});


/**
 * @type {{maxDateFilter: Date, lockDates: [], buildBody: (function(): Promise<void>), caclculateTotal: (function(*=): Promise<number>), intiateDatePicker: (function(): Promise<void>), currentDateFilter: Date, DatePicker: null, ShowFPCollectorBox: (function(): Promise<void>), minDateFilter: null}}
 */
let FPCollector = {

	minDateFilter: null,
	maxDateFilter: moment(MainParser.getCurrentDate()).toDate(),
	currentDateFilter: moment(MainParser.getCurrentDate()).startOf('day').toDate(),

	lockDates: [],

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
				resize: false,
				minimize: true
			});

			let startMoment = null,
				endMoment = null;

			// set the first possible date for date picker
			await StrategyPoints.db['ForgePointsStats'].orderBy('id').first().then((resp) => {
				startMoment = moment(resp.date).startOf('day');
				FPCollector.minDateFilter = moment(resp.date).subtract(1, 'minute').toDate();
			});

			// set the last known date
			await StrategyPoints.db['ForgePointsStats'].orderBy('id').last().then((resp) => {
				endMoment = moment(resp.date).add(1, 'day'); // neccesary to include the current day
				FPCollector.maxDateFilter = moment(resp.date).endOf('day').toDate();
			});

			// get all days without entries and block them in the Litepicker
			if(startMoment && endMoment)
			{
				while (startMoment.isBefore(endMoment, 'day'))
				{
					let checkDate = await StrategyPoints.db['ForgePointsStats'].where('date').equals(moment(startMoment).toDate()).toArray();

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
				if(checkPresent.length === 0)
				{
					$('#FPCollectorPicker').hide();
				}
			}

			$('#fp-collectorBody').append(
				`<div class="dark-bg head">
					<div class="text-warning"><strong>${i18n('Boxes.FPCollector.TotalFP')} <span id="fp-collector-total-fp"></span></strong></div>
					<div class="text-right"><button class="btn btn-default" id="FPCollectorPicker">${moment(FPCollector.currentDateFilter).format(i18n('Date'))}</button></div>
				</div>`,
				`<div id="fp-collectorBodyInner"></div>`
			);
		}

		FPCollector.buildBody();
	},


	/**
	 * Create the box content
	 *
	 * @returns {Promise<void>}
	 */
	buildBody: async ()=> {

		let tr = [],
			entries = await StrategyPoints.db['ForgePointsStats'].where('date').equals(FPCollector.currentDateFilter).toArray();

		$('#fp-collector-total-fp').text(await FPCollector.caclculateTotal(FPCollector.currentDateFilter));

		tr.push('<table class="foe-table">');

		tr.push(`<thead>
			<tr>
				<th>FPs</th>
				<th></th>
				<th>${i18n('Boxes.FPCollector.Who')}</th>
				<th>${i18n('Boxes.FPCollector.What')}</th>
			</tr>
		</thead>`);

		tr.push(`<tbody>`);

		if(entries.length === 0)
		{
			tr.push(`<tr><td colspan="4" class="text-center" style="padding:15px"><em>${i18n('Boxes.FPCollector.NoEntriesFound')}</em></td></tr>`);
		}
		else {
			entries.forEach(e => {

				tr.push(`<tr class="${e.place} ${e.event}">
					<td>
						<strong class="text-warning">${e.amount}</strong>
					</td>
					<td></td>
					<!-- <td>${i18n('Boxes.FPCollector.' + e.place)}</td> -->
					<td>${i18n('Boxes.FPCollector.' + e.event)}</td>
					<td>${e.notes ? e.notes : ''}</td>
				</tr>`);

			});
		}

		tr.push(`</tbody>`);
		tr.push(`</table>`);

		$('#fp-collectorBodyInner').html(tr.join('')).promise().done(function(){
			FPCollector.intiateDatePicker();
		});
	},


	/**
	 * Get Total fps from one specific day
	 *
	 * @param date
	 * @returns {Promise<number>}
	 */
	caclculateTotal: async (date)=> {
		let totalFP = 0;

		await StrategyPoints.db['ForgePointsStats']
			.where('date')
			.equals(date)
			.each (entry => totalFP += entry.amount);

		return totalFP;
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

				FPCollector.currentDateFilter = moment(date).toDate();
				await FPCollector.buildBody();
			}
		});
	}
};