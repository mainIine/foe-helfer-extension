/*
 * **************************************************************************************
 *
 * Dateiname:                 bluegalaxy.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              09.11.20, 15:37 Uhr
 * zuletzt bearbeitet:        09.11.20, 15:37 Uhr
 *
 * Copyright 2020
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('CityProductionService', 'pickupProduction', (data, postData) => {
    if (data.responseData['updatedEntities']) {
        let Entities = data.responseData['updatedEntities'];
        for (let i = 0; i < Entities.length; i++) {
            if (Entities[i]['cityentity_id'] === 'X_OceanicFuture_Landmark3') {
                if ($('#bluegalaxy').length === 0) {
                    if (Settings.GetSetting('ShowBlueGalaxyHelper')) {
                        BlueGalaxy.Show();
                    }                    
                }
            }
        }
    }
 });

let BlueGalaxy = {

	/**
	 * Show or hide the box
	 *
	 * @constructor
	 */
    Show: () => {
        moment.locale(i18n('Local'));

        if ($('#bluegalaxy').length === 0) {

            HTML.Box({
                id: 'bluegalaxy',
                title: i18n('Boxes.BlueGalaxy.Title'),
                auto_close: true,
                dragdrop: true,
                minimize: true
            });

            HTML.AddCssFile('bluegalaxy');

            // A building should be shown on the map
            $('#bluegalaxy').on('click', '.foe-table .show-entity', function () {
                Productions.ShowFunction($(this).data('id'));
            });

			BlueGalaxy.CalcBody();

        } else {
            HTML.CloseOpenBox('bluegalaxy');
        }
    },


	/**
	 * Builds the body
	 *
	 * @constructor
	 */
    CalcBody: () => {
        GreatBuildings.RefreshFPBuildings();

        let FPBuildings = GreatBuildings.FPBuildings.filter(obj => (obj['CurrentFP'] > 0));

        FPBuildings = FPBuildings.sort(function (a, b) {
            return b['CurrentFP'] - a['CurrentFP'];
        });

        let DoubleCollections = 0;
        for (let i = 0; i < BonusService.Bonuses.length; i++) {
            if (BonusService.Bonuses[i]['type'] === 'double_collection') {
                DoubleCollections = BonusService.Bonuses[i]['amount'] | 0;
                break;
            }
        }

        let h = [];
        h.push('<div class="text-center dark-bg header">');

        let Title;
        if (DoubleCollections === 0) {
            Title = i18n('Boxes.BlueGalaxy.NoChargesLeft');
        }
        else if (FPBuildings.length === 0) {
            Title = i18n('Boxes.BlueGalaxy.NoProductionsDone');
        }
        else {
            Title = i18n('Boxes.BlueGalaxy.DoneProductionsTitle');
        }
        h.push('<strong class="title">' + Title + '</strong><br>');
        h.push('</div>');       

        if (DoubleCollections > 0 && FPBuildings.length > 0) {
            h.push('<table class="foe-table">');

            h.push('<thead>' +
                '<tr>' +
                '<th>' + i18n('Boxes.BlueGalaxy.Building') + '</th>' +
                '<th>' + i18n('Boxes.BlueGalaxy.FP') + '</th>' +
                '<th>' + i18n('Boxes.BlueGalaxy.DoneIn') + '</th>' +
                '<th></th>' +
                '</tr>' +
                '</thead>');

            let CollectionsLeft = DoubleCollections;
            for (let i = 0; i < FPBuildings.length; i++) {
                if (CollectionsLeft <= 0) break;

                let BuildingName = MainParser.CityEntities[FPBuildings[i]['EntityID']]['name'];

                h.push('<tr>');
                h.push('<td>' + BuildingName + '</td>');
                h.push('<td>' + FPBuildings[i]['CurrentFP'] + '</td>');
                if (FPBuildings[i]['At'] * 1000 <= MainParser.getCurrentDateTime()) {
                    h.push('<td><strong class="success">' + i18n('Boxes.BlueGalaxy.Done') + '</strong></td>');
                    CollectionsLeft -= 1;
                }
                else {
                    h.push('<td><strong class="error">' + moment.unix(FPBuildings[i]['At']).fromNow() + '</strong></td>');
                }
                h.push('<td class="text-right"><span class="show-entity" data-id="' + FPBuildings[i]['ID'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span></td>');
                h.push('</tr>');               
            }

            h.push('</table');
        }

        $('#bluegalaxyBody').html(h.join(''));
    },
};