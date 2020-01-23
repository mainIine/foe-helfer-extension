/*
 * **************************************************************************************
 *
 * Dateiname:                 investment.js
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

FoEproxy.addHandler('GreatBuildingsService', 'getContributions', (data) => {
    Investment.Box();
	Investment.CalcBar(data.responseData);
});


let Investment = {
    RefreshDone: false,
    OldInvestmentPoints: 0,
    OldRewardPoints: 0,
    InvestedFP : 0,
    RewardFP : 0,
    BonusFP : 0,
    ArcBonus: 0,

    Box: () => {
        if ($('#Investment').length === 0) {
            HTML.Box({
                'id': 'Investment',
                'title': i18n['Boxes']['Investment']['Title'],
                'auto_close': false,
                'dragdrop': true,
                'resize': false,
                'minimize': false
            });

            // CSS in den DOM prügeln
            HTML.AddCssFile('investment');
        }
    },

    CalcBar: (data) =>{
        if(!data) return;
        if(data.length <= 0) return;

        Investment.ArcBonus = localStorage.getItem('ArcBonus');
        Investment.ArcBonus = ((parseFloat(Investment.ArcBonus) + 100) / 100)

        Investment.InvestedFP = 0;
        Investment.BonusFP = 0;

        for (let x = 0; x < data.length; x++) {
            const contribution = data[x];
            Investment.InvestedFP += contribution['forge_points'];
            if(undefined !== contribution['reward'])
                Investment.RewardFP += (contribution['reward']['strategy_point_amount'] !== undefined ? contribution['reward']['strategy_point_amount'] : 0);
        }
        Investment.InvestmentBar(Investment.InvestedFP)
    },

    /**
	 * Kleine FP-Bar im Header
	 *
	 * @param NewFP Die neu zu setzenden FP
	 */
    InvestmentBar: (_InvestedFP) => {
        if (_InvestedFP === undefined) _InvestedFP = 0;

        Investment.BonusFP = Math.round(_InvestedFP * Investment.ArcBonus) - _InvestedFP;

        let div = $('#InvestmentBody');

		// noch nicht im DOM?
		if( $('#invest-bar').length < 1 && $('#reward-bar').length < 1){
			let Invest = $('<div />').attr('id', 'invest-bar').text(i18n['Boxes']['Investment']['InvestBar']).append( $('<strong>0</strong>').addClass('invest-storage') );
			let Reward = $('<div />').attr('id', 'reward-bar').text(i18n['Boxes']['Investment']['CurrReward']).append( $('<strong>0</strong>').addClass('reward-storage') );

			$(div).append(Invest);
			$(div).append(Reward);
		}

		// Update mit Animation, wenn es überhaupt notwendig ist
        if(Investment.BonusFP < Investment.OldRewardPoints || 
            Investment.BonusFP > Investment.OldRewardPoints ||
            _InvestedFP < Investment.OldInvestmentPoints || 
            _InvestedFP > Investment.OldInvestmentPoints || 
            !Investment.RefreshDone)
        {
			Investment.RefreshDone = true;

			$('.invest-storage').easy_number_animate({
				start_value: Investment.OldInvestmentPoints,
				end_value: _InvestedFP,
				duration: 750
            });
            
            $('.reward-storage').easy_number_animate({
				start_value: Investment.OldRewardPoints,
				end_value: Investment.BonusFP,
				duration: 750
			});

			Investment.OldInvestmentPoints = _InvestedFP;
			Investment.OldRewardPoints = Investment.BonusFP;
			Investment.InvestedFP = _InvestedFP;
		}
	},
}