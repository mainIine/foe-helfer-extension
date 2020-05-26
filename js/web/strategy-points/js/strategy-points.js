/*
 * **************************************************************************************
 *
 * Dateiname:                 strategy-points.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 14:31 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('ResourceShopService', 'getContexts', (data) => {
	if (data['responseData']['0']['context'] !== 'forgePoints') {
		return;
	}

	let offer = data.responseData[0].offers[0];
	StrategyPoints.RefreshBuyableForgePoints(offer.formula);
});

FoEproxy.addHandler('ResourceShopService', 'buyOffer', (data) => {
	if (data['responseData']['gains'] === undefined || data['responseData']['gains']['resources'] === undefined || data['responseData']['gains']['resources']['strategy_points'] === undefined) {
		return;
	}
	StrategyPoints.RefreshBuyableForgePoints(data.responseData.formula);
});

let StrategyPoints = {
	OldStrategyPoints: 0,
	InventoryFP: 0,


	/**
	 * Kaufbare FP + Formel ermitteln
	 *
	 * @param formula
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

		if($('.buyable-fp').length == 0) {
			$('#fp-bar').append(' ' + i18n('Boxes.StrategyPoints.BuyableFP') + ' <strong class="buyable-fp">' + HTML.Format(amount) + '</strong>');

		} else {
			$('.buyable-fp').text(HTML.Format(amount));
		}
	},

	/**
	 * Kleine FP-Bar im Header
	 *
	 */
    RefreshBar: ( value ) => {
        // noch nicht im DOM?
		if( $('#fp-bar').length < 1 ){
			let div = $('<div />').attr('id', 'fp-bar').text(i18n('Boxes.StrategyPoints.FPBar')).append( $('<strong>0</strong>').addClass('fp-storage') );

			$('body').append(div);
		}

		if ( isNaN( value ) ){ return; }
		StrategyPoints.InventoryFP = value;

		// the animation function checks if start_value != end_value
		$('.fp-storage').easy_number_animate({
			start_value: StrategyPoints.OldStrategyPoints,
			end_value: StrategyPoints.InventoryFP,
			duration: 750,
			after: (el, val) => {
				// this seems to be necessary due to a bug with the easy_number_animate
				// jQuery plugin = if many animations run in a quick succession the order
				// in which they finish is not guaranteed!
				el.text(StrategyPoints.InventoryFP);
			}
		});

		StrategyPoints.OldStrategyPoints = StrategyPoints.InventoryFP;
	},


	/**
	 * Liefert die gesamt verfügbaren FP
	 *
	 */
	get AvailableFP() {
		let Ret = (ResourceStock['strategy_points'] !== undefined ? ResourceStock['strategy_points'] : 0);
		Ret += StrategyPoints.InventoryFP;
		return Ret;
	},
};
