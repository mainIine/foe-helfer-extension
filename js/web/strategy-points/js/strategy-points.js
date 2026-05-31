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


FoEproxy.addHandler('ResourceShopService', 'getContexts', (data)=> {
	if (data['responseData']['0']['context'] !== 'forgePoints') {
		return;
	}

	let offer = data.responseData[0].offers[0];
	StrategyPoints.RefreshBuyableForgePoints(offer.formula);
});

FoEproxy.addHandler('ResourceShopService', 'buyOffer', (data)=> {
	if (data['responseData']['gains'] === undefined || data['responseData']['gains']['resources'] === undefined || data['responseData']['gains']['resources']['strategy_points'] === undefined) {
		return;
	}
	StrategyPoints.RefreshBuyableForgePoints(data.responseData.formula);
});


// GEX started
FoEproxy.addFoeHelperHandler('ActiveMapUpdated', () => {
	StrategyPoints.ShowFPBar();
});

FoEproxy.addFoeHelperHandler('ResourcesUpdated', () => {
	StrategyPoints.ShowFPBar();
});

FoEproxy.addFoeHelperHandler('InventoryUpdated', () => {
	//Fp packages often trigger more than one Inventory Update - only update the bar once
	if (StrategyPoints.delay) clearTimeout(StrategyPoints.delay);
	StrategyPoints.delay = setTimeout(()=>{
		StrategyPoints.RefreshBar();
		StrategyPoints.delay = null;
	},100);
});

/**
 * @type {{readonly AvailableFP: (*|number), ShowFPBar: (function(): (undefined)), OldStrategyPoints: number, checkForDB: (function(*): Promise<void>), pickupProductionId: null, pickupProductionBuilding: null, HandleWindowResize: StrategyPoints.HandleWindowResize, insertIntoDB: (function(*=): Promise<void>), RefreshBuyableForgePoints: StrategyPoints.RefreshBuyableForgePoints, RefreshBar: (function(*=): (undefined)), InventoryFP: number, db: null}}
 */
let StrategyPoints = {
	InventoryFP: 0,
	delay: null,
	pickupProductionId: null,
	pickupProductionBuilding: null,

	db: null,

	/**
	 *
	 * @returns {Promise<void>}
	 */
	checkForDB: async (playerID)=> {
		const FP_DBName = `FoeHelperDB_FPCollector_${playerID}`;

		StrategyPoints.db = new Dexie(FP_DBName);

		StrategyPoints.db.version(1).stores({
			ForgePointsStats: '++id,place,event,notes,amount,date'
		});
		StrategyPoints.db.version(2).stores({
			ForgePointsStats: '++id,counter,event,notes,amount,date'
		});

		StrategyPoints.db.open();
	},


	insertIntoDB: async (data)=> {

		await StrategyPoints.db.ForgePointsStats.put(data);

		// if fp-collector box is open, update
		if( $('#fp-collectorBodyInner').length > 0 )
		{
			await FPCollector.buildBody();
		}
	},


	/**
	 * Screen-size hax
	 *
	 * @constructor
	 */
	HandleWindowResize: () => {

		let width = window.innerWidth,
			elem = $('#fp-bar').children().length;

		switch (ActiveMap){
			case 'gex':
				if((elem === 3 && width <= 1313) || (elem === 2 && width <= 1170) || elem === 1 && width < 970)
				{
					$('#fp-bar').addClass('small-screen')
				}
				else {
					$('#fp-bar').removeClass('small-screen')
				}
				break;

			case 'gg':

				break;

			default: // main or unknown
				if(elem === 1 && width < 1235)
				{
					$('#fp-bar').addClass('small-screen')
				}
				else {
					$('#fp-bar').removeClass('small-screen')
				}
		}
	},


	ShowFPBar: ()=>{

		$('#fp-bar').removeClass(possibleMaps).addClass(ActiveMap);
		if( $('.fp-bar-main').length === 0){
			$('#fp-bar').addClass(`game-cursor`).append(`<div class="fp-bar-main"><div class="number"></div><div class="bars"></div></div>`);
		}
		// necessary to wait for gift in gg + diplomatic gift
		setTimeout(()=>{
			const availableFPs = (ResourceStock['strategy_points'] !== undefined ? ResourceStock['strategy_points'] : 0);
			const $main = $('.fp-bar-main')
			$main.find('.number').text(availableFPs);
			$main.removeClass('full');
			$main.attr('title',HTML.i18nTooltip(i18n('StrategyPoints.FPInBar')));

			const $bar = $main.find('.bars');

			// make empty
			$bar.find('span').remove();
			for (let i = 0; i < availableFPs; i++) {
				$bar.append(`<span />`);
				if (i === 9) { $('.fp-bar-main').addClass('full'); break; }
			}
			
		}, 800);

	},



	/**
	 * Buyable FPs + formula
	 *
	 * @param formula
	 * @constructor
	 */
	RefreshBuyableForgePoints: (formula) => {

		let amount = 0;
		let currentlyCosts = formula.baseValue;
		let boughtCount = formula.boughtCount;
		let factor = formula.factor;

		for(let counter = 1; counter <= boughtCount; counter++) {
			currentlyCosts += factor;
		}

		for(let money = ResourceStock.money; money >= currentlyCosts; money--) {
			currentlyCosts += factor;
			money -= currentlyCosts;
			amount++;
		}

		if($('div.buyable-fp').length === 0) {
			$('#fp-bar').append(`<div class="buyable-fp" title="${HTML.i18nTooltip(i18n('StrategyPoints.BuyableFP'))}">${ HTML.Format(amount)}</div>`);

		} else {
			$('div.buyable-fp').text(HTML.Format(amount));
		}
	},


	/**
	 * Tiny FP bar on top of the screen
	 *
	 * @param value
	 * @constructor
	 */
	RefreshBar: () => {
		// noch nicht im DOM?
		if( $('#fp-bar').length < 1 ){
			let div = $('<div />').attr({
				id: 'fp-bar',
				class: `game-cursor ${ActiveMap}`
			}).append( `<div class="fp-storage">0</div>` );

			$('body').append(div);
			StrategyPoints.HandleWindowResize();
		}
		let old = StrategyPoints.InventoryFP;
		StrategyPoints.InventoryFP = Object.values(MainParser.Inventory).filter(x=>x.item.__class__ == "ForgePointPackagePayload").reduce((total,x) => total + (x.inStock || 0) * (x.item?.resource_package?.gain || 0),0)

		let delimiter = Number(1000).toLocaleString().substring(1,2);

		// the animation function checks if start_value != end_value
		$('#fp-bar div.fp-storage').easy_number_animate({
			start_value: old,
			end_value: StrategyPoints.InventoryFP,
			delimiter: delimiter,
			duration: 750,
			after: (el, val) => {
				// this seems to be necessary due to a bug with the easy_number_animate
				// jQuery plugin = if many animations run in a quick succession the order
				// in which they finish is not guaranteed!
				el.text( HTML.Format( StrategyPoints.InventoryFP ) );
			}
		});

		StrategyPoints.ShowFPBar();
	},


	/**
	 * Returns the stock and the bar FPs
	 *
	 * @returns {*|number}
	 * @constructor
	 */
	get AvailableFP() {
		let Ret = (ResourceStock['strategy_points'] !== undefined ? ResourceStock['strategy_points'] : 0);
		Ret += StrategyPoints.InventoryFP;
		return Ret;
	},
};
