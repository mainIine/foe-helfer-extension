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

// LG Investitionen
FoEproxy.addHandler('GreatBuildingsService', 'getContributions', (data) => {
	Investment.Data = data.responseData;
    Investment.CalcBar();
    if (Settings.GetSetting('ShowInvestments')) {
        Investment.Box();
    }
    Investment.SendToServer();
});


let Investment = {
	Data: null,
    Einsatz: 0,
    Ertrag: 0,

    Box: ()=> {
        if ($('#Investment').length === 0) {
            HTML.Box({
                'id': 'Investment',
                'title': i18n('Boxes.Investment.Title'),
                'auto_close': true,
                'dragdrop': true,
            });

            // CSS in den DOM prügeln
            HTML.AddCssFile('investment');
        }

        Investment.InvestmentBar();
    },


	/**
	 * Investition errechnen
	 *
	 * @param data
	 */
    CalcBar: ()=> {

		if (Investment.Data !== null && Investment.Data.length <= 0){
			return;
		}

		let data = Investment.Data;

        Investment.Einsatz = 0;
        Investment.Ertrag = 0;

        let arc = 1 + (MainParser.ArkBonus / 100);

        for (let x = 0; x < data.length; x++) {
            const contribution = data[x];

            Investment.Einsatz += contribution['forge_points'];

            if (undefined !== contribution['reward']) {
                let CurrentErtrag = MainParser.round(contribution['reward']['strategy_point_amount'] !== undefined ? contribution['reward']['strategy_point_amount'] * arc : 0);
                
                if (contribution['forge_points'] >= contribution['max_progress'] - contribution['current_progress']) {
                    Investment.Ertrag += CurrentErtrag;
                }

                //Platz kann nicht sicher sein => Nur maximal Einzahlung ansetzen
                else {
                    Investment.Ertrag += Math.min(contribution['forge_points'], CurrentErtrag);
                }
            }
        }
    },


    /**
	 * Kleine FP-Bar im Header
	 *
	 * @param _InvestedFP Die neu zu setzenden FP
	 */
    InvestmentBar: ()=> {
        let Gewinn = Investment.Ertrag - Investment.Einsatz;

        let div = $('#InvestmentBody');

        // noch nicht im DOM?
        if ($('#invest-bar').length < 1 && $('#reward-bar').length < 1) {
            let Invest = $('<div />').attr('id', 'invest-bar').text(i18n('Boxes.Investment.InvestBar')).append($('<strong>0</strong>').addClass('invest-storage'));
            let Reward = $('<div />').attr('id', 'reward-bar').text(i18n('Boxes.Investment.CurrReward')).append($('<strong>0</strong>').addClass('reward-storage'));

            $(div).append(Invest);
            $(div).append(Reward);
        }
        $('.invest-storage').easy_number_animate({
            start_value: 0,
            end_value: Investment.Einsatz,
            duration: 750
        });

        $('.reward-storage').easy_number_animate({
            start_value: 0,
            end_value: Gewinn,
            duration: 750
        });

		if ($('#total-fp').length < 1) {
			let totalAll = $('<div />').attr('id', 'total-fp').addClass('text-center').text(i18n('Boxes.Investment.TotalFP')).append($('<strong>0</strong>').addClass('total-storage-invest'));

			$(div).append(totalAll);
		}

		$('.total-storage-invest').easy_number_animate({
			start_value: 0,
			end_value: (StrategyPoints.AvailableFP + Investment.Ertrag),
			duration: 750
		});
    },


	/**
	 * Wenn gewollt, zum Server schicken
	 */
	SendToServer: ()=> {

		if (!Settings.GetSetting('GlobalSend') || !Settings.GetSetting('SendInvestigations')){
			return;
		}

		if (MainParser.checkNextUpdate('LGInvestments') !== true){
			return;
		}

		if (Investment.Data === null || Investment.Data.length <= 0){
			return;
		}

		MainParser.send2Server(Investment.Data, 'LGInvestments', function(r){


			if (r['status'] === 'OK'){
				// localStorage.setItem('LGInvestments', MainParser.getAddedDateTime(0, 5));
			}

			$.toast({
				heading: i18n('API.UpdateSuccess'),
				text: i18n('API.LGInvest'),
				icon: 'success'
			});
		});
	}
};
