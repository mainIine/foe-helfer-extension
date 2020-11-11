/*
 * **************************************************************************************
 *
 * Dateiname:                 bluegalaxy.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              09.11.20, 15:37 Uhr
 * zuletzt bearbeitet:       09.11.20, 15:32 Uhr
 *
 * Copyright 2020
 *
 * **************************************************************************************
 */

let BlueGalaxy =
{
    /**
	 * Zeigt die Box an oder schließt sie
	 */
    Show: () => {
        if ($('#bluegalaxy').length === 0) {

            HTML.Box({
                id: 'bluegalaxy',
                title: i18n('Boxes.BlueGalaxy.Title'),
                ask: i18n('Boxes.BlueGalaxy.HelpLink'),
                auto_close: true,
                dragdrop: true,
                minimize: true
            });

            // CSS in den DOM prügeln
            HTML.AddCssFile('bluegalaxy');

        } else {
            HTML.CloseOpenBox('greatbuildings');
        }

        BlueGalaxy.CalcBody();
    },


    CalcBody: () => {
        GreatBuildings.RefreshFPBuildings();

        let FPBuildings = GreatBuildings.FPBuildings.filter(obj => (obj['CurrentFP'] > 0 && obj['Done'])); 

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
            i18n('Boxes.BlueGalaxy.NoChargesLeft')
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
                '<th></th>' +
                '</tr>' +
                '</thead>');

            for (let i = 0; i < Math.min(FPBuildings.length, DoubleCollections); i++) {
                let BuildingName = MainParser.CityEntities[FPBuildings[i]['EntityID']]['name'];

                h.push('<tr>');
                h.push('<td>' + BuildingName + '</td>');
                h.push('<td>' + FPBuildings[i]['CurrentFP'] + '</td>');
                h.push('<td class="text-right"><span class="show-entity" data-id="' + FPBuildings[i]['ID'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span></td>');
                h.push('</tr>');

                
            }

            h.push('</table');
        }

        $('#bluegalaxyBody').html(h.join(''));
    },
};