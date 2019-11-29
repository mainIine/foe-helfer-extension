/*
 * **************************************************************************************
 *
 * Dateiname:                 strategy-points.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       09.10.19, 22:30 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let StrategyPoints = {
    RefreshDone: false,
	OldStrategyPoints: 0,
	AvailableFP : 0,

	/**
	 * Holt beim Start alle FPs aus dem Lager
	 *
	 * @param d
	 * @constructor
	 */
	GetFromInventory: (d)=> {
		let t = 0;

		for(let i in d)
		{
			if(d.hasOwnProperty(i)){
				if(d[i]['itemAssetName'] === 'large_forgepoints'){
					t += (d[i]['inStock'] * 10);

				} else if(d[i]['itemAssetName'] === 'medium_forgepoints'){
					t += (d[i]['inStock'] * 5);

				} else if(d[i]['itemAssetName'] === 'small_forgepoints'){
					t += (d[i]['inStock'] * 2);
				}
			}
		}

		if(t > 0){
			StrategyPoints.ForgePointBar(t);
			StrategyPoints.AvailableFP = t;
		}
	},


	/**
	 * Kleine FP-Bar im Header
	 *
	 * @param NewFP Die neu zu setzenden FP
	 * @constructor
	 */
    ForgePointBar: (NewFP) => {
        if (NewFP === undefined) NewFP = 0;

		// noch nicht im DOM?
		if( $('#fp-bar').length < 1 ){
			let div = $('<div />').attr('id', 'fp-bar').text(i18n['Boxes']['StrategyPoints']['FPBar']).append( $('<strong>0</strong>').addClass('fp-storage') );

			$('body').append(div);
		}

		// Update mit Animation, wenn es überhaupt notwendig ist
		if(NewFP < StrategyPoints.OldStrategyPoints || NewFP > StrategyPoints.OldStrategyPoints || !StrategyPoints.RefreshDone)
        {
            RefreshDone = true;

			$('.fp-storage').easy_number_animate({
				start_value: StrategyPoints.OldStrategyPoints,
				end_value: NewFP,
				duration: 750
			});

			StrategyPoints.OldStrategyPoints = NewFP;
			StrategyPoints.AvailableFP = NewFP;
		}
	},
};
