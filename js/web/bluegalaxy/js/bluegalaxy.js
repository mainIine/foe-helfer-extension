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
//const util  = require('util');

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
    OldGoodsValue : 0.1,
    DoubleCollections : 0,
    GalaxyFactor : 0,
    sort: JSON.parse(localStorage.getItem("BlueGalaxySorting")||'{"col":null,"order":null}'),

    /**
     * Zeigt die Box an
     *
     * @param event
     * @param auto_close
     * @constructor
     */
    Show: (event= false, auto_close = false) => {
        //moment.locale(18n('Local'));

        console.log(JSON.stringify(localStorage, null, 4));
        
        if ($('#bluegalaxy').length === 0) {

            let GoodsValue = localStorage.getItem('BlueGalaxyGoodsValue');
            if (GoodsValue != null) {
                BlueGalaxy.GoodsValue = parseFloat(GoodsValue);
            }

            let OldGoodsValue = localStorage.getItem('BlueGalaxyOldGoodsValue');
            if (OldGoodsValue != null) {
                BlueGalaxy.OldGoodsValue = parseFloat(OldGoodsValue);
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
                console.log("Updateing BG GoodsValue");
                BlueGalaxy.GoodsValue = parseFloat($('#goodsValue').val());
                if (isNaN(BlueGalaxy.GoodsValue)) BlueGalaxy.GoodsValue = 0;
                localStorage.setItem('BlueGalaxyGoodsValue', BlueGalaxy.GoodsValue);

                BlueGalaxy.CalcBody();
            });


            $('#bluegalaxy').on('blur', '#OldGoodsValue', function () {
                console.log("Updateing BG OldGoodsValue");
                BlueGalaxy.OldGoodsValue = parseFloat($('#OldGoodsValue').val());
                if (isNaN(BlueGalaxy.OldGoodsValue)) BlueGalaxy.OldGoodsValue = 0;
                localStorage.setItem('BlueGalaxyOldGoodsValue', BlueGalaxy.OldGoodsValue);

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
            },
            showBGFragments = JSON.parse(localStorage.getItem('showBGFragments')||"true");
//        console.log("Buildings:" + Buildings);
//        console.log("CityMap:" + CityMap);
        // console.log(JSON.stringify(GoodsList, null, 4));

        let BGCurrentAge = "unknown";
        for (let i = 0; i < CityMap.length; i++) {
            let CityEntity = CityMap[i];

            if (CityEntity.type === 'main_building') {
                // console.log(JSON.stringify(CityEntity, null, 4));
                BGCurrentAge = CityEntity.eraName;
                console.log("Setting current era name from main building to " + BGCurrentAge);
            }
        }
        
        for (let i = 0; i < CityMap.length; i++) {
            let CityEntity = CityMap[i];

            if (CityEntity.type === 'main_building') {
                continue;
            }

            if (CityEntity.type === 'greatbuilding') continue;

            if (CityEntity.state.production) {
                let FP = 0;
                let GoodsSum = 0;
                let OldGoodsSum = 0;
                let GuildGoodsSum = 0;
                let Fragments = [];
                let FragmentAmount = 0;
                               
                //console.log(util.inspect(CityEntity, false, null, true));
                //console.log(JSON.stringify(CityEntity, null, 4));
                
                // CityEntity.production.forEach(product => {
                //     if (production.resources?.strategy_points)
                //         FP += FPBoost(product.resources.strategy_points)
                //     else if (production.type == "genericReward" && product.resources?.subType == "strategy_points")
                //         FP += FPBoost(product.resources.amount);
                //     else if (production.type == "genericReward" && product.resources?.type == "forgepoint_package")
                //         FP += parseInt(product.resources.subType)

                //     if (production.type == "resources" || production.type == "guildResources")
                //         for (let j = 0; j < GoodsList.length; j++) {
                //             let GoodID = GoodsList[j]['id'];
                //             if (product.resources[GoodID]) {
                //                 if (product.type == "resources")
                //                     GoodsSum += product.resources[GoodID];
                //                 else   
                //                     GuildGoodsSum += product.resources[GoodID];
                //             }
                //         }
                    
                //     if (product.type == "genericReward" && product.resources?.subType == "fragment") {
                //         Fragments.push(product.resources);
                //         FragmentAmount += product.resources.amount;
                //     }
                    
                   
                // });

                CityEntity.state.production.forEach(product => {
                    if (product.resources?.strategy_points)
                        FP += FPBoost(product.resources.strategy_points)
                    else if (product.type == "genericReward" && product.resources?.subType == "strategy_points")
                        FP += FPBoost(product.resources.amount);
                    else if (product.type == "genericReward" && product.resources?.type == "forgepoint_package")
                        FP += parseInt(product.resources.subType)

                    if (product.type == "resources" || product.type == "guildResources")
                        for (let j = 0; j < GoodsList.length; j++) {
                            let GoodID = GoodsList[j]['id'];
                            let GoodEra = GoodsList[j]['era'];
                            if (product.resources[GoodID]) {
                                if (product.type == "resources")
                                    if(GoodEra == BGCurrentAge) {
                                        GoodsSum += product.resources[GoodID];
                                    } else {
                                        OldGoodsSum += product.resources[GoodID];
                                    }
                                else   
                                    GuildGoodsSum += product.resources[GoodID];
                            }
                        }
                    
                    if (product.type == "genericReward" && product.resources?.subType == "fragment") {
                        Fragments.push(product.resources);
                        FragmentAmount += product.resources.amount;
                    }
                    
                   
                });

                if (GoodsSum > 0 || FP > 0 || FragmentAmount > 0 || OldGoodsSum > 0) {  //  || "true"
                    
                    let FragmentText= Fragments.map(fragment=>fragment.amount+ "x " +fragment.name+"<br>").join()
                    Buildings.push({
                        ID: CityEntity.id, 
                        EntityID: CityEntity.entityId,
                        name: MainParser.NewCityMapData[CityEntity.id].name,
                        Fragments: Fragments, 
                        FragmentAmount: FragmentAmount,
                        FragmentText: FragmentText,
                        FP: FP, 
                        Goods: GoodsSum,
                        OldGoods: OldGoodsSum,
                        GuildGoods: GuildGoodsSum, 
                        In: CityEntity.state.times.in, 
                        At: CityEntity.state.times.at,
                        CombinedValue: FP + BlueGalaxy.GoodsValue*GoodsSum + BlueGalaxy.OldGoodsValue*OldGoodsSum,
                    });
                }
            }
        }
        if (BlueGalaxy.DoubleCollections > 0)
            Buildings = Buildings.filter(obj => ((obj['FP'] > 0 || obj['Goods'] > 0 || obj['GuildGoods']>0 || obj['FragmentAmount']>0) && obj['In'] < 23.5 * 3600)); // Hide everything above 23h

        Buildings = Buildings.sort(function (a, b) {
            if (BlueGalaxy.sort.col) {
                return (BlueGalaxy.sort.order=="ascending" ? -1 : 1)*(b[BlueGalaxy.sort.col] - a[BlueGalaxy.sort.col]);
            } else {
                // return (b['FP'] - a['FP']) + BlueGalaxy.GoodsValue * (b['Goods'] - a['Goods'] + (showBGFragments ? (b['FragmentAmount'] - a['FragmentAmount'])*3 : 0));
                //return (b['FP'] - a['FP']) + BlueGalaxy.GoodsValue * (b['Goods'] - a['Goods']) + BlueGalaxy.OldGoodsValue * (b['OldGoods'] - a['OldGoods'])  + (showBGFragments ? (b['FragmentAmount'] - a['FragmentAmount'])*3 : 0);
                return (b['CombinedValue'] - a['CombinedValue']); // + BlueGalaxy.GoodsValue * (b['Goods'] - a['Goods']) + BlueGalaxy.OldGoodsValue * (b['OldGoods'] - a['OldGoods'])  + (showBGFragments ? (b['FragmentAmount'] - a['FragmentAmount'])*3 : 0);
            }
        });

        let h = [];
        h.push('<div class="text-center dark-bg header">');

        let Title = i18n('Boxes.BlueGalaxy.DoneProductionsTitle');

        console.log("BG Goods values: Old:" + BlueGalaxy.OldGoodsValue + " , current goods:" + BlueGalaxy.GoodsValue);
        
        h.push('<strong class="title">' + Title + '</strong><br>');
        if (BlueGalaxy.DoubleCollections > 0)
            h.push(i18n('Boxes.BlueGalaxy.AvailableCollections')+ " " + BlueGalaxy.DoubleCollections+"<br>");

            h.push('<br>');
            h.push(i18n('Boxes.BlueGalaxy.GoodsValue') + ' ');
            h.push('<input type="number" id="goodsValue" step="0.01" min="0" max="1000" value="' + BlueGalaxy.GoodsValue + '" title="' + HTML.i18nTooltip(i18n('Boxes.BlueGalaxy.TTGoodsValue')) + '">');   
            if (BlueGalaxy.GoodsValue > 0) {
                h.push('<small> (' + HTML.i18nReplacer(i18n('Boxes.BlueGalaxy.GoodsPerFP'), {goods: Math.round(1/BlueGalaxy.GoodsValue*100)/100}) + ')</small>')
            }

            h.push('<br>');
            h.push(i18n('Boxes.BlueGalaxy.OlderGoodsValue') + ' ');
            h.push('<input type="number" id="OldGoodsValue" step="0.01" min="0" max="1000" value="' + BlueGalaxy.OldGoodsValue + '" title="' + HTML.i18nTooltip(i18n('Boxes.BlueGalaxy.TTGoodsValue')) + '">');   
            if (BlueGalaxy.OldGoodsValue > 0) {
                h.push('<small> (' + HTML.i18nReplacer(i18n('Boxes.BlueGalaxy.GoodsPerFP'), {goods: Math.round(1/BlueGalaxy.OldGoodsValue*100)/100}) + ')</small>')
            }

        h.push('</div>');       

        let table = [];

        table.push('<table id="BGTable" class="foe-table">');

        table.push('<thead>' +
            '<tr class="sorter-header">' +
            '<th class="no-sort"></th>'+
            '<th class="no-sort" data-type="bg-group">' + i18n('Boxes.BlueGalaxy.Building') + '</th>' +
            (showBGFragments ? '<th class="is-number icon fragments ' + (BlueGalaxy.sort.col=="FragmentAmount" ? BlueGalaxy.sort.order : "") + '" title="' + i18n('Boxes.BlueGalaxy.Fragments') + '" data-type="bg-group" data-colname="FragmentAmount"><span></span></th>' : '') +
            '<th class="is-number icon fp ' + (BlueGalaxy.sort.col=="FP" ? BlueGalaxy.sort.order : "") + '" title="' + i18n('Boxes.BlueGalaxy.FP') + '" data-type="bg-group" data-colname="FP"><span></span></th>' +
            '<th class="is-number icon old_goods ' + (BlueGalaxy.sort.col=="OldGoods" ? BlueGalaxy.sort.order : "") + '" title="' + i18n('Boxes.BlueGalaxy.OlderGoods') + '" data-type="bg-group" data-colname="OldGoods"><span></span></th>' +
            '<th class="is-number icon goods ' + (BlueGalaxy.sort.col=="Goods" ? BlueGalaxy.sort.order : "") + '" title="' + i18n('Boxes.BlueGalaxy.Goods') + '" data-type="bg-group" data-colname="Goods"><span></span></th>' +
            '<th class="is-number icon guildgoods ' + (BlueGalaxy.sort.col=="GuildGoods" ? BlueGalaxy.sort.order : "") + '" title="' + i18n('Boxes.GuildMemberStat.GuildGoods') + '" data-type="bg-group" data-colname="GuildGoods"><span></span></th>' +
            '<th class="is-number icon fp ' + (BlueGalaxy.sort.col=="CombinedValue" ? BlueGalaxy.sort.order : "") + '" title="' + i18n('Boxes.GuildMemberStat.GuildGoods') + '" data-type="bg-group" data-colname="CombinedValue"><span></span></th>' +
            '<th colspan="2" class="case-sensitive no-sort" data-type="bg-group">' + i18n('Boxes.BlueGalaxy.DoneIn') + '</th>' +
            '</tr>' +
            '</thead>');
            table.push('<tbody class="bg-group">');

        //let CollectionsLeft = BlueGalaxy.DoubleCollections;
            // FPBonusSum = 0,
            // FragmentsSum = 0,
            // GoodsBonusSum = 0,
            // GuildGoodsSum = 0;

        for (let i = 0; i < 50 && i < Buildings.length; i++) { // limits the list to max 50 items

            let isPolivated = MainParser.NewCityMapData[Buildings[i]['ID']].state.isPolivated;
            table.push('<tr>');
            table.push('<td>' + (isPolivated != undefined ? (isPolivated ? '<span class="text-bright">★</span>' : '☆') : '') + '</td>');
            table.push('<td data-text="'+Buildings[i]['name'].replace(/[. -]/g,"")+'">' + Buildings[i]['name'] + '</td>');
            if (showBGFragments) {
                table.push('<td data-number="'+Buildings[i].FragmentAmount+'">'+Buildings[i].FragmentText+'</td>');
            }
            table.push('<td class="text-center" data-number="'+Buildings[i].FP+'">' + HTML.Format(Buildings[i]['FP']) + '</td>');
            table.push('<td class="text-center" data-number="'+Buildings[i].OldGoods+'">' + HTML.Format(Buildings[i]['OldGoods']) + '</td>');
            table.push('<td class="text-center" data-number="'+Buildings[i].Goods+'">' + HTML.Format(Buildings[i]['Goods']) + '</td>');
            table.push('<td class="text-center" data-number="'+Buildings[i].GuildGoods+'">' + HTML.Format(Buildings[i]['GuildGoods']) + '</td>');
            table.push('<td class="text-center" data-number="'+Buildings[i].CombinedValue+'">' + HTML.Format(Buildings[i]['CombinedValue']) + '</td>');

            if (Buildings[i]['At'] * 1000 <= MainParser.getCurrentDateTime()) {
                table.push('<td style="white-space:nowrap"><strong class="success">' + i18n('Boxes.BlueGalaxy.Done') + '</strong></td>');
            
                //CollectionsLeft -= 1;
                //FragmentsSum += Buildings[i].FragmentAmount * BlueGalaxy.GalaxyFactor;
                //FPBonusSum += Buildings[i].FP * BlueGalaxy.GalaxyFactor;
                //GoodsBonusSum += Buildings[i].Goods * BlueGalaxy.GalaxyFactor;
                //GuildGoodsSum += Buildings[i].GuildGoods * BlueGalaxy.GalaxyFactor;
                
            }
            else {
                table.push('<td style="white-space:nowrap"><strong class="error">' + moment.unix(Buildings[i]['At']).fromNow() + '</strong></td>');
            }

            table.push('<td class="text-right"><span class="show-entity" data-id="' + Buildings[i]['ID'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/hud/open-eye.png"></span></td>');
            table.push('</tr>');
        }

        table.push('</tbody>');
        table.push('</table>');

           // if (FPBonusSum > 0 || GoodsBonusSum > 0 || FragmentsSum >0 || GuildGoodsSum > 0) {
           //     h.push(HTML.i18nReplacer(i18n('Boxes.BlueGalaxy.EstimatedBonus'), { FP: Math.round(FPBonusSum), Goods: Math.round(GoodsBonusSum)}));
           //     h.push('<br>');
           // }

        h.push(table.join(''));

        BlueGalaxy.SetCounter();

        $('#bluegalaxyBody').html(h.join('')).promise().done(function () {
		    $('#BGTable').tableSorter();
        })
        $('#BGTable th').on("click",(e)=>{
            let el=e.target;
            if (el.nodeName != "TH") el = el.parentElement;
            if(el.classList.contains("no-sort")) return;
            if(el.classList.contains("descending")) {
                BlueGalaxy.sort = {col:null,order:null}
            } else {
                BlueGalaxy.sort = {col:el.dataset.colname,order:"descending"}
            }
            localStorage.setItem("BlueGalaxySorting",JSON.stringify(BlueGalaxy.sort))
            BlueGalaxy.CalcBody();
            
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
        let showBGFragments = JSON.parse(localStorage.getItem('showBGFragments')||"true");

        let h = [];
        h.push(`<p><input id="autoStartBGHelper" name="autoStartBGHelper" value="1" type="checkbox" ${(autoOpen === true) ? ' checked="checked"' : ''} /> <label for="autoStartBGHelper">${i18n('Boxes.Settings.Autostart')}</label></p>`);
        h.push(`<p><input id="showBGFragments" name="showBGFragments" value="1" type="checkbox" ${(showBGFragments === true) ? ' checked="checked"' : ''} /> <label for="showBGFragments">${i18n('Boxes.Settings.showBGFragments')}</label></p>`);
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
        let showBGFragments = false;
		if ($("#showBGFragments").is(':checked'))
            showBGFragments = true;
        if (localStorage.getItem('showBGFragments') != showBGFragments) {
            localStorage.setItem('showBGFragments', showBGFragments);
            BlueGalaxy.CalcBody();
        }
		
		$(`#bluegalaxySettingsBox`).remove();
    },
};
