/*
 * *************************************************************************************
 *
 * Copyright (C) 2024 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
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

FoEproxy.addFoeHelperHandler('BonusUpdated', data => {
    for (let i = 0; i < BonusService.Bonuses.length; i++) {
        if (BonusService.Bonuses[i]['type'] === 'double_collection') {
            BlueGalaxy.DoubleCollections = BonusService.Bonuses[i]['amount'] | 0;
            BlueGalaxy.GalaxyFactor = BonusService.Bonuses[i]['value'] / 100;
            break;
        }
    }

    BlueGalaxy.SetCounter();

    if ($('#bluegalaxy').length > 0) {
        BlueGalaxy.Show(true, true);
    }
});

let BlueGalaxy = {

    GoodsValue : 0.2,
    DoubleCollections : 0,
    GalaxyFactor : 0,


    /**
     * Zeigt die Box an
     *
     * @param event
     * @param auto_close
     * @constructor
     */
    Show: (event= false, auto_close = false) => {
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
                minimize: true,
                resize: true,
                settings: 'BlueGalaxy.ShowSettings()'
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

        } else if (event) {
            BlueGalaxy.CalcBody();
        }
        else {
            HTML.CloseOpenBox('bluegalaxy');
        }

        if (auto_close && BlueGalaxy.DoubleCollections === 0) {
            HTML.CloseOpenBox('bluegalaxy');
        }
    },


	/**
	 * Content zusammen setzen
	 *
	 * @constructor
	 */
    CalcBody: () => {
        let Buildings = [],
            CityMap = Object.values(MainParser.NewCityMapData),
            FPB = Productions.Boosts['fp'] === undefined ? (MainParser.BoostSums['forge_points_production'] + 100) / 100 : Productions.Boosts['fp']
            FPBoost = (FP) => {
                return Math.round(FP * FPB)
            }; 

        for (let i = 0; i < CityMap.length; i++) {
            let CityEntity = CityMap[i];

            if (CityEntity.type === 'main_building' || CityEntity.type === 'greatbuilding') continue;

            if (CityEntity.state.production) {
                let FP = 0;
                let GoodsSum = 0;
                let GuildGoodsSum = 0;
                let Fragments = [];
                let FragmentAmount = 0;
                               

                CityEntity.state.production.resources.forEach(product => {
                    if (product.resources.strategy_points)
                        FP += FPBoost(product.resources.strategy_points)
                    else if (product.type == "genericReward" && product.resources.subType == "strategy_points")
                        FP += FPBoost(product.resources.amount);
                    else if (product.type == "genericReward" && product.resources.type == "forgepoint_package")
                        FP += parseInt(product.resources.subType)

                    if (product.type == "resources" || product.type == "guildResources")
                        for (let j = 0; j < GoodsList.length; j++) {
                            let GoodID = GoodsList[j]['id'];
                            if (product.resources[GoodID]) {
                                if (product.type == "resources")
                                    GoodsSum += product.resources[GoodID];
                                else   
                                    GuildGoodsSum += product.resources[GoodID];
                            }
                        }
                    
                    if (product.type == "genericReward" && product.resources.subType == "fragment") {
                        Fragments.push(product.resources);
                        FragmentAmount += product.resources.amount;
                    }
                    
                   
                });

                if (GoodsSum > 0 || FP > 0 || FragmentAmount > 0) {
                    Buildings.push({
                        ID: CityEntity.id, 
                        EntityID: CityEntity.entityId,
                        Fragments: Fragments, 
                        FragmentAmount: FragmentAmount,
                        FP: FP, 
                        Goods: GoodsSum, 
                        GuildGoods: GuildGoodsSum, 
                        In: CityEntity.times.in, 
                        At: CityEntity.times.at
                    });
                }
            }
        }
                
        //Buildings = Buildings.filter(obj => ((obj['FP'] > 0 || obj['Goods'] > 0) && obj['In'] < 23 * 3600)); // Hide everything above 23h

        Buildings = Buildings.sort(function (a, b) {
            return (b['FP'] - a['FP']) + BlueGalaxy.GoodsValue * (b['Goods'] - a['Goods'] + (b['FragmentAmount'] - a['FragmentAmount'])*2);
        });

        let h = [];
        h.push('<div class="text-center dark-bg header">');

        let Title = i18n('Boxes.BlueGalaxy.DoneProductionsTitle');


        h.push('<strong class="title">' + Title + '</strong><br>');
        if (BlueGalaxy.DoubleCollections > 0)
            h.push(i18n('Boxes.BlueGalaxy.AvailableCollections')+ " " + BlueGalaxy.DoubleCollections+"<br>");

            h.push('<br>');
            h.push(i18n('Boxes.BlueGalaxy.GoodsValue') + ' ');
            h.push('<input type="number" id="goodsValue" step="0.01" min="0" max="1000" value="' + BlueGalaxy.GoodsValue + '" title="' + HTML.i18nTooltip(i18n('Boxes.BlueGalaxy.TTGoodsValue')) + '">');   
            if (BlueGalaxy.GoodsValue > 0) {
                h.push('<small> (' + HTML.i18nReplacer(i18n('Boxes.BlueGalaxy.GoodsPerFP'), {goods: Math.round(1/BlueGalaxy.GoodsValue*100)/100}) + ')</small>')
            }

        h.push('</div>');       

        let table = [];

        table.push('<table id="BGTable" class="foe-table">');

        table.push('<thead>' +
            '<tr class="sorter-header">' +
            '<th></th><th data-type="bg-group">' + i18n('Boxes.BlueGalaxy.Building') + '</th>' +
            '<th class="is-number icon fragments" title="' + i18n('Boxes.BlueGalaxy.Fragments') + '" data-type="bg-group"></th>' +
            '<th class="is-number icon fp" title="' + i18n('Boxes.BlueGalaxy.FP') + '" data-type="bg-group"></th>' +
            '<th class="is-number icon goods" title="' + i18n('Boxes.BlueGalaxy.Goods') + '" data-type="bg-group"></th>' +
            '<th class="is-number icon guildgoods" title="' + i18n('Boxes.GuildMemberStat.GuildGoods') + '" data-type="bg-group"></th>' +
            '<th colspan="2" class="case-sensitive" data-type="bg-group">' + i18n('Boxes.BlueGalaxy.DoneIn') + '</th>' +
            '</tr>' +
            '</thead>');
            table.push('<tbody class="bg-group">');

        let CollectionsLeft = BlueGalaxy.DoubleCollections,
            FPBonusSum = 0,
            FragmentsSum = '',
            GoodsBonusSum = 0;

        for (let i = 0; i < 50 && i < Buildings.length; i++) { // limits the list to max 50 items

            let BuildingName = MainParser.NewCityMapData[Buildings[i]['ID']].name;
            let isPolivated = MainParser.NewCityMapData[Buildings[i]['ID']].state.isPolivated;
            let FragmentAmount = 0;
            table.push('<tr>');
            table.push('<td>' + (isPolivated != undefined ? (isPolivated ? '<span class="text-bright">★</span>' : '☆') : '') + '</td>');
            table.push('<td data-text="'+BuildingName.replace(/[. -]/g,"")+'">' + BuildingName + '</td>');
            let frags=""
            if (Buildings[i].Fragments.length > 0) {
                Buildings[i].Fragments.forEach(fragment => {
                    frags+=(fragment.amount+ "x " +fragment.name+"<br>")
                    FragmentAmount += fragment.amount;
                })
            }
            table.push('<td data-number="'+FragmentAmount+'">'+frags+'</td>');
            table.push('<td class="text-center" data-number="'+Buildings[i]['FP']+'">' + HTML.Format(Buildings[i]['FP']) + '</td>');
            table.push('<td class="text-center" data-number="'+Buildings[i]['Goods']+'">' + HTML.Format(Buildings[i]['Goods']) + '</td>');
            table.push('<td class="text-center" data-number="'+Buildings[i]['GuildGoods']+'">' + HTML.Format(Buildings[i]['GuildGoods']) + '</td>');

            if (Buildings[i]['At'] * 1000 <= MainParser.getCurrentDateTime()) {
                table.push('<td style="white-space:nowrap"><strong class="success">' + i18n('Boxes.BlueGalaxy.Done') + '</strong></td>');
                CollectionsLeft -= 1;

                FragmentsSum += FragmentAmount * BlueGalaxy.GalaxyFactor;
                FPBonusSum += Buildings[i]['FP'] * BlueGalaxy.GalaxyFactor;
                GoodsBonusSum += Buildings[i]['Goods'] * BlueGalaxy.GalaxyFactor;
            }
            else {
                table.push('<td style="white-space:nowrap"><strong class="error">' + moment.unix(Buildings[i]['At']).fromNow() + '</strong></td>');
            }

            table.push('<td class="text-right"><span class="show-entity" data-id="' + Buildings[i]['ID'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span></td>');
            table.push('</tr>');
        }

        table.push('</tbody>');
        table.push('</table>');

            //if (FPBonusSum > 0 || GoodsBonusSum > 0) {
            //    h.push(HTML.i18nReplacer(i18n('Boxes.BlueGalaxy.EstimatedBonus'), { FP: Math.round(FPBonusSum), Goods: Math.round(GoodsBonusSum)}));
            //    h.push('<br>');
            //}

        h.push(table.join(''));

        BlueGalaxy.SetCounter();

        $('#bluegalaxyBody').html(h.join('')).promise().done(function () {
		    $('#BGTable').tableSorter();
        })
    },


    /**
     * Counter anzeigen
     *
     * @constructor
     */
    SetCounter: ()=> {
        if (BlueGalaxy.DoubleCollections > 0){
            $('#hidden-blue-galaxy-count').text(BlueGalaxy.DoubleCollections).show();
        } else {
            $('#hidden-blue-galaxy-count').hide();
        }
    },


    /**
    *
    */
	ShowSettings: () => {
		let autoOpen = Settings.GetSetting('ShowBlueGalaxyHelper');

        let h = [];
        h.push(`<p><input id="autoStartBGHelper" name="autoStartBGHelper" value="1" type="checkbox" ${(autoOpen === true) ? ' checked="checked"' : ''} /> <label for="autoStartBGHelper">${i18n('Boxes.Settings.Autostart')}</label></p>`);
        h.push(`<p><button onclick="BlueGalaxy.SaveSettings()" id="save-bghelper-settings" class="btn btn-default" style="width:100%">${i18n('Boxes.Settings.Save')}</button></p>`);

        $('#bluegalaxySettingsBox').html(h.join(''));
    },


    /**
    *
    */
    SaveSettings: () => {
        let value = false;
		if ($("#autoStartBGHelper").is(':checked'))
			value = true;
		localStorage.setItem('ShowBlueGalaxyHelper', value);
		$(`#bluegalaxySettingsBox`).remove();
    },
};
