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
    GoodsValue : 0.2,


	/**
	 * Show or hide the box
	 *
	 * @constructor
	 */
    Show: () => {
        moment.locale(i18n('Local'));

        if ($('#bluegalaxy').length === 0) {

            let GoodsValue = localStorage.getItem('BlueGalaxyGoodsValue');
            if (GoodsValue != null) {
                BlueGalaxy.GoodsValue = parseFloat(GoodsValue);
            }

            HTML.Box({
                id: 'bluegalaxy',
                title: i18n('Boxes.BlueGalaxy.Title'),
                auto_close: true,
                dragdrop: true,
                minimize: true
            });

            HTML.AddCssFile('bluegalaxy');

            $('#bluegalaxy').on('blur', '#goodsValue', function () {

                BlueGalaxy.GoodsValue = parseFloat($('#goodsValue').val());

                if (isNaN(BlueGalaxy.GoodsValue)) BlueGalaxy.GoodsValue = 0;

                localStorage.setItem('BlueGalaxyGoodsValue', BlueGalaxy.GoodsValue);
                BlueGalaxy.CalcBody();
            });

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
        let Buildings = [],
            CityMap = Object.values(MainParser.CityMapData);

        for (let i = 0; i < CityMap.length; i++) {
            let ID = CityMap[i]['id'],
                EntityID = CityMap[i]['cityentity_id'],
                CityEntity = MainParser.CityEntities[EntityID];

            if (CityEntity['type'] === 'main_building' || CityEntity['type'] === 'greatbuilding') continue;

            let Production = Productions.readType(CityMap[i]);
            if (Production['products']) {
                let FP = Production['products']['strategy_points'];
                if (!FP) FP = 0;

                let GoodsSum = 0;
                for (j = 0; j < GoodsList.length; j++) {
                    let GoodID = GoodsList[j]['id'];
                    if (Production['products'][GoodID]) {
                        GoodsSum += Production['products'][GoodID];
                    }
                }

                Buildings.push({ ID: ID, EntityID: EntityID, FP: FP, Goods: GoodsSum, In: Production['in'], At: Production['at'] });
            }
        }
                
        Buildings = Buildings.filter(obj => ((obj['FP'] > 0 || obj['Goods'] > 0) && obj['In'] < 23 * 3600)); // Hide everything above 23h

        Buildings = Buildings.sort(function (a, b) {
            return (b['FP'] - a['FP']) + BlueGalaxy.GoodsValue * (b['Goods'] - a['Goods']);
        });

        let DoubleCollections = 0,
            GalaxyFactor = 0;

        for (let i = 0; i < BonusService.Bonuses.length; i++)
        {
            if (BonusService.Bonuses[i]['type'] === 'double_collection') {
                DoubleCollections = BonusService.Bonuses[i]['amount'] | 0;
                GalaxyFactor = BonusService.Bonuses[i]['value'] / 100;
                break;
            }
        }

        let h = [];
        h.push('<div class="text-center dark-bg header">');

        let Title;
        if (DoubleCollections === 0) {
            Title = i18n('Boxes.BlueGalaxy.NoChargesLeft');
        }
        else if (Buildings.length === 0) {
            Title = i18n('Boxes.BlueGalaxy.NoProductionsDone');
        }
        else {
            Title = i18n('Boxes.BlueGalaxy.DoneProductionsTitle');
        }

        h.push('<strong class="title">' + Title + '</strong><br>');

        if (DoubleCollections > 0 && Buildings.length > 0) {
            h.push('<br>');
            h.push(i18n('Boxes.BlueGalaxy.GoodsValue') + ' ');
            h.push('<input type="number" id="goodsValue" step="0.01" min="0" max="1000" value="' + BlueGalaxy.GoodsValue + '" title="' + HTML.i18nTooltip(i18n('Boxes.BlueGalaxy.TTGoodsValue')) + '">');   
            if (BlueGalaxy.GoodsValue > 0) {
                h.push('<small> (' + HTML.i18nReplacer(i18n('Boxes.BlueGalaxy.GoodsPerFP'), {goods: Math.round(1/BlueGalaxy.GoodsValue*100)/100}) + ')</small>')
            }
        }

        h.push('</div>');       

        let table = [];
        if (DoubleCollections > 0 && Buildings.length > 0) { 

            table.push('<table class="foe-table">');

            table.push('<thead>' +
                '<tr>' +
                '<th>' + i18n('Boxes.BlueGalaxy.Building') + '</th>' +
                '<th>' + i18n('Boxes.BlueGalaxy.FP') + '</th>' +
                '<th>' + i18n('Boxes.BlueGalaxy.Goods') + '</th>' +
                '<th>' + i18n('Boxes.BlueGalaxy.DoneIn') + '</th>' +
                '<th></th>' +
                '</tr>' +
                '</thead>');

            let CollectionsLeft = DoubleCollections,
                FPBonusSum = 0,
                GoodsBonusSum = 0;

            for (let i = 0; i < Buildings.length; i++) {
                if (CollectionsLeft <= 0) break;

                let BuildingName = MainParser.CityEntities[Buildings[i]['EntityID']]['name'];

                table.push('<tr>');
                table.push('<td>' + BuildingName + '</td>');
                table.push('<td class="text-center">' + HTML.Format(Buildings[i]['FP']) + '</td>');
                table.push('<td class="text-center">' + HTML.Format(Buildings[i]['Goods']) + '</td>');
                if (Buildings[i]['At'] * 1000 <= MainParser.getCurrentDateTime()) {
                    table.push('<td style="white-space:nowrap"><strong class="success">' + i18n('Boxes.BlueGalaxy.Done') + '</strong></td>');
                    CollectionsLeft -= 1;

                    FPBonusSum += Buildings[i]['FP'] * GalaxyFactor;
                    GoodsBonusSum += Buildings[i]['Goods'] * GalaxyFactor;
                }
                else {
                    table.push('<td style="white-space:nowrap"><strong class="error">' + moment.unix(Buildings[i]['At']).fromNow() + '</strong></td>');
                }
                table.push('<td class="text-right"><span class="show-entity" data-id="' + Buildings[i]['ID'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span></td>');
                table.push('</tr>');
            }

            table.push('</table');

            if (FPBonusSum > 0 || GoodsBonusSum > 0) {
                h.push(HTML.i18nReplacer(i18n('Boxes.BlueGalaxy.EstimatedBonus'), { FP: Math.round(FPBonusSum), Goods: Math.round(GoodsBonusSum)}));
                h.push('<br>');
            }
        }

        h.push(table.join(''));

        $('#bluegalaxyBody').html(h.join(''));
    },
};