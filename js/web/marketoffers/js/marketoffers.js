/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

// Market
FoEproxy.addHandler('TradeService', 'getTradeOffers', (data, postData) => {
    let requestMethod = postData[0]['requestMethod'];

    if (requestMethod === 'getTradeOffers' || requestMethod === 'acceptOfferById') {
        Market.Trades = data.responseData;

        if ($('#marketoffers-Btn').hasClass('hud-btn-red')) {
            $('#marketoffers-Btn').removeClass('hud-btn-red');
            $('#marketoffers-Btn-closed').remove();
        }
    }
});


/**
 * Market function
 *
 */
let MarketOffers = {
    OffersSums: [],
    NeedSums: [],

    /**
     * Create a div-box for the DOM + Eventlistener
     */
    Show: (event = true) => {
        if ($('#MarketOffers').length === 0) {
            HTML.Box({
                id: 'MarketOffers',
                title: i18n('Boxes.MarketOffers.Title'),
                auto_close: true,
                dragdrop: true,
                minimize: true,
                resize: true,
                settings: 'MarketOffers.ShowSettingsButton()'
            });

            // add css to DOM
            HTML.AddCssFile('marketoffers');
        }
        else if (!event) {
            HTML.CloseOpenBox('MarketOffers');
            return;
        }

        MarketOffers.CalcBody();
    },


    /**
     * Main function for all the data
     */
    CalcBody: () => {
        MarketOffers.CalcTradeSums();

        let h = [];

        h.push('<table class="foe-table exportable">');
        h.push('<thead>');
        h.push('<tr>');
        h.push('<th columnname="Era">' + i18n('Boxes.MarketOffers.Era') + '</th>')
        h.push('<th columnname="Good" colspan="2">' + i18n('Boxes.MarketOffers.Good') + '</th>');
        h.push('<th columnname="Inventory">' + i18n('Boxes.MarketOffers.Inventory') + '</th>');
        h.push('<th columnname="OfferSum">' + i18n('Boxes.MarketOffers.OfferSum') + '</th>');
        h.push('<th columnname="NeedSum">' + i18n('Boxes.MarketOffers.NeedSum') + '</th>');
        h.push('<th columnname="InventoryOfferSum">' + i18n('Boxes.MarketOffers.InventoryOfferSum') + '</th>');
        h.push('<th columnname="InventoryNeedSum">' + i18n('Boxes.MarketOffers.IventoryNeedSum') + '</th>');
        h.push('</tr>');
        h.push('</thead>');

        for (let i = 0; i < GoodsList.length; i++) {
            let CurrentGood = GoodsList[i],
                Era = Technologies.Eras[CurrentGood['era']],
                GoodID = CurrentGood['id'],
                Inventory = ResourceStock[GoodID],
                OfferSum = OfferSums[GoodID],
                NeedSum = NeedSums[GoodID];

            h.push('<tr>');
            h.push('<td>' + i18n('Eras.' + Era) + '</td>');
            h.push('<td class="goods-image"><span class="goods-sprite-50 sm ' + GoodID + '"></span></td>');
            h.push('<td><strong>' + CurrentGood['name'] + '</strong></td>');
            h.push('<td>' + HTML.Format(Inventory) + '</td>');
            h.push('<td>' + HTML.Format(OfferSum) + '</td>');
            h.push('<td>' + HTML.Format(NeedSum) + '</td>');
            h.push('<td>' + HTML.Format(Inventory + OfferSum) + '</td>');
            h.push('<td>' + HTML.Format(Inventory + NeedSum) + '</td>');
            
            h.push('</tr>');
        }

        /* <td><strong class="td-tooltip" title="">Benzin</strong></td><td><strong class="td-tooltip" title="" data-original-title="Jahrhundertwende<br>Du hast: 16.978">100</strong></td><td class="goods-image"><span class="goods-sprite-50 sm convenience_food"></span></td><td><strong class="td-tooltip" title="" data-original-title="Moderne<br>Du hast: 3.003">Fertiggericht</strong></td><td><strong class="td-tooltip" title="" data-original-title="Moderne<br>Du hast: 3.003">50</strong></td><td class="text-center">2</td><td>Heiko Q. der Fünfte</td><td class="text-center">2-10</td></tr> */
 
        $('#MarketOffersBody').html(h.join(''));

        $('.td-tooltip').tooltip({
            html: true,
            container: '#MarketOffers'
        });

    },


    /**
     * 
     * */
    CalcTradeSums: () => {
        OfferSums = [];
        NeedSums = [];

        for (let i = 0; i < GoodsList.length; i++) {
            let GoodID = GoodsList[i]['id'];

            OfferSums[GoodID] = 0;
            NeedSums[GoodID] = 0;
        }

        for (let i = 0; i < Market.Trades.length; i++) {
            let Trade = Market.Trades[i],
                OfferGood = Trade['offer']['good_id'],
                OfferAmount = Trade['offer']['value'],
                NeedGood = Trade['need']['good_id'],
                NeedAmount = Trade['need']['value'];

            if (!Trade['merchant']['is_self']) continue;

            OfferSums[OfferGood] += OfferAmount;
            NeedSums[NeedGood] += NeedAmount;
        }
    },


    /**
    *
    */
    ShowSettingsButton: () => {
        let h = [];
        h.push(`<p class="text-center"><button class="btn btn-default" onclick="HTML.ExportTable($('#MarketOffersBody').find('.foe-table.exportable'), 'csv', 'MarketOffers')">${i18n('Boxes.General.ExportCSV')}</button></p>`);
        h.push(`<p class="text-center"><button class="btn btn-default" onclick="HTML.ExportTable($('#MarketOffersBody').find('.foe-table.exportable'), 'json', 'MarketOffers')">${i18n('Boxes.General.ExportJSON')}</button></p>`);

        $('#MarketOffersSettingsBox').html(h.join(''));
    },
};
