/*
 * **************************************************************************************
 *
 * Dateiname:                 campagnemap.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Th3OnlyC0D3R
 * zu letzt bearbeitet:       17.12.19, 10:54 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let KampagneMap = {
    Provinces: null,

    /**
     * Zeigt
     * @constructor
     */
    Show: () => {
        if ($('#campagne').length === 0) {
            let args = {
                'id': 'campagne',
                'title': i18n['Boxes']['Campagne']['Title'],
                'auto_close': true,
                'dragdrop': true,
                'minimize': true
            };
            HTML.Box(args);
        }

        KampagneMap.BuildBox();
    },

    /**
	 *
	 * @constructor
	 */
    BuildBox: () => {
        KampagneMap.CalcBody();

        // Zeitalter vor und zurück schalten
        $('body').on('click', '.btn-switchage', function () {
            $('.btn-switchage').removeClass('btn-default-active');

            KampagneMap.CalcBody();

            $(this).addClass('btn-default-active');
        });
    },

    /**
	 *
	 * @constructor
	 */
    CalcBody: () => {
        let provdata = localStorage.getItem('CampaignService'),
            h = [],
            ProvDict = null;

        if (provdata === null)
            return;

        ProvDict = JSON.parse(provdata);
        console.log(ProvDict);
    },
};