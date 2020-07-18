/*
 * **************************************************************************************
 *
 * Dateiname:                 market.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              17.07.20, 23:50 Uhr
 * zuletzt bearbeitet:       17.07.20, 23:50 Uhr
 *
 * Copyright © 2020
 *
 * **************************************************************************************
 */

// Markt
FoEproxy.addHandler('TradeService', 'getTradeOffers', (data) => {
    Market.Trades = data.responseData;
    Market.Show();
});

let Market = {
    Trades: [],
    Offer: 0,
    Need: 0,
    MinQuantity: 1,

    TradePartnerNeighbour : true,
    TradePartnerGuild : true,
    TradePartnerFriend: true,

    TradeForHigher: true,
    TradeForEqual: true,
    TradeForLower: true,

    TradeAdvantage: true,
    TradeFair: true,
    TradeDisadvantage: true,

    Show: () => {
        if ($('#Market').length === 0) {
            HTML.Box({
                'id': 'Market',
                'title': i18n('Boxes.Market.Title'),
                'auto_close': true,
                'dragdrop': true,
            });

            // CSS in den DOM prügeln
            HTML.AddCssFile('market');

            $('#Market').on('change', '#change-offer', function () {
                let OfferString = $(this).val();
                Market.Offer = parseInt(OfferString);
                Market.CalcBody();
            });

            $('#Market').on('change', '#change-need', function () {
                let NeedString = $(this).val();
                Market.Need = parseInt(NeedString);
                Market.CalcBody();
            });

            $('#Market').on('blur', '#minquantity', function () {
                Market.MinQuantity = parseFloat($('#minquantity').val());              
                GreatBuildings.CalcBody();
            });

            $('#Market').on('click', '.tradepartnerneighbour', function () {
                Market.TradePartnerNeighbour = !Market.TradePartnerNeighbour;
                Market.CalcBody();
            });

            $('#Market').on('click', '.tradepartnerguild', function () {
                Market.TradePartnerGuild = !Market.TradePartnerGuild;
                Market.CalcBody();
            });

            $('#Market').on('click', '.tradepartnerfriend', function () {
                Market.TradePartnerFriend = !Market.TradePartnerFriend;
                Market.CalcBody();
            });

            $('#Market').on('click', '.tradeforhigher', function () {
                Market.TradeForHigher = !Market.TradeForHigher;
                Market.CalcBody();
            });

            $('#Market').on('click', '.tradeforequal', function () {
                Market.TradeForEqual = !Market.TradeForEqual;
                Market.CalcBody();
            });

            $('#Market').on('click', '.tradeforlower', function () {
                Market.TradeForLower = !Market.TradeForLower;
                Market.CalcBody();
            });

            $('#Market').on('click', '.tradeadvantage', function () {
                Market.TradeAdvantage = !Market.TradeAdvantage;
                Market.CalcBody();
            });

            $('#Market').on('click', '.tradefair', function () {
                Market.TradeFair = !Market.TradeFair;
                Market.CalcBody();
            });

            $('#Market').on('click', '.tradedisadvantage', function () {
                Market.TradeDisadvantage = !Market.TradeDisadvantage;
                Market.CalcBody();
            });
        }

        Market.CalcBody();
    },

    CalcBody: () => {
        let h = [];

        //Filters
        h.push('<table class="foe-table">');
        h.push('<tr>');
        h.push('<td></td>');
        h.push('<td></td>');
        h.push('<td>' + i18n('Boxes.Market.TradePartner') + '</td>');
        h.push('<td>' + i18n('Boxes.Market.TradeForGoods') + '</td>');
        h.push('<td>' + i18n('Boxes.Market.Rating') + '</td>');
        h.push('</tr>');

        h.push('<tr>');
        h.push('<td>' + i18n('Boxes.Market.Offer') + '</td>');

        h.push('<td><select class="setting-dropdown" id="change-offer">');
        let ID = 0;
        h.push('<option value="' + ID + '" ' + (Market.Offer === ID ? 'selected' : '') + '>' + i18n('Boxes.Market.AllGoods') + '</option>');
        for (let era = 0; era <= Technologies.Eras.SpaceAgeAsteroidBelt - Technologies.Eras.BronzeAge; era++) {
            ID += 1;
            h.push('<option value="' + ID + '" ' + (Market.Offer === ID ? 'selected' : '') + '>' + i18n('Eras.' + (era + Technologies.Eras.BronzeAge)) + '</option>');
            for (let i = 0; i < 5; i++) {
                ID += 1;
                h.push('<option value="' + ID + '" ' + (Market.Offer === ID ? 'selected' : '') + '>' + GoodsList[5*era + i]['name'] + '</option>');
            }
        }
        h.push('</select></td>');

        h.push('<td><input class="tradepartnerneighbour game-cursor" ' + (Market.TradePartnerNeighbour ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Market.TradePartnerNeighbour') + '</td>');
        h.push('<td><input class="tradeforhigher game-cursor" ' + (Market.TradeForHigher ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Market.TradeForHigher') + '</td>');
        h.push('<td><input class="tradeadvantage game-cursor" ' + (Market.TradeAdvantage ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Market.TradeAdvantage') + '</td>');
        h.push('</tr>');

        h.push('<tr>');
        h.push('<td>' + i18n('Boxes.Market.Need') + '</td>');

        h.push('<td><select class="setting-dropdown" id="change-need">');
        ID = 0;
        h.push('´<option value="' + ID + '" ' + (Market.Need === ID ? 'selected' : '') + '>' + i18n('Boxes.Market.AllGoods') + '</option>');
        for (let era = 0; era <= Technologies.Eras.SpaceAgeAsteroidBelt - Technologies.Eras.BronzeAge; era++) {
            ID += 1;
            h.push('<option value="' + ID + '">' + i18n('Eras.' + (era + Technologies.Eras.BronzeAge)) + '</option>');
            for (let i = 0; i < 5; i++) {
                ID += 1;
                h.push('<option value="' + ID + '">' + GoodsList[5 * era + i]['name'] + '</option>');
            }
        }
        h.push('</select></td>');

        h.push('<td><input class="tradepartnerguild game-cursor" ' + (Market.TradePartnerGuild ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Market.TradePartnerGuild') + '</td>');
        h.push('<td><input class="tradeforequal game-cursor" ' + (Market.TradeForEqual ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Market.TradeForEqual') + '</td>');
        h.push('<td><input class="tradefair game-cursor" ' + (Market.TradeFair ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Market.TradeFair') + '</td>');
        h.push('</tr>');

        h.push('<tr>');
        h.push('<td>' + i18n('Boxes.Market.MinQuantity') + '</td>');
        h.push('<td><input type="number" id="MinQuantity" step="1" min="0" max="1000000" value="' + Market.MinQuantity + '"></td>');
        h.push('<td><input class="tradepartnerfriend game-cursor" ' + (Market.TradePartnerFriend ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Market.TradePartnerFriend') + '</td>');
        h.push('<td><input class="tradeforlower game-cursor" ' + (Market.TradeForLower ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Market.TradeForLower') + '</td>');
        h.push('<td><input class="tradedisadvantage game-cursor" ' + (Market.TradeDisadvantage ? 'checked' : '') + ' type="checkbox">' + i18n('Boxes.Market.TradeDisadvantage') + '</td>');
        h.push('</tr>');
        h.push('</table>');

        // Table
        h.push('<table class="foe-table">');

        h.push('<thead>');
        h.push('<tr>');
        h.push('<th colspan="2">' + i18n('Boxes.Market.OfferColumn') + '</th>');
        h.push('<th colspan="2">' + i18n('Boxes.Market.NeedColumn') + '</th>');
        h.push('<th>' + i18n('Boxes.Market.RateColumn') + '</th>');
        h.push('<th>' + i18n('Boxes.Market.PlayerColumn') + '</th>');
        h.push('<th>' + i18n('Boxes.Market.PageColumn') + '</th>');
        h.push('</tr>');
        h.push('</thead>');

        for (let i = 0; i < Market.Trades.length; i++) {
            let Trade = Market.Trades[i];
            if (Market.ApplyFilter(Trade)) {
                h.push('<tr>');
                h.push('<td>' + Trade['offer']['good_id'] + '</td>');
                h.push('<td>' + Trade['offer']['value'] + '</td>');
                h.push('<td>' + Trade['need']['good_id'] + '</td>');
                h.push('<td>' + Trade['need']['value'] + '</td>');
                h.push('<td>' + HTML.Format(Math.round(Trade['need']['value'] / Trade['offer']['value'] * 100) / 100) + '</td>');
                h.push('<td>' + Trade['merchant']['name'] + '</td>');
                h.push('<td>' + HTML.Format(Math.floor(i / 10 + 1)) + HTML.Format(i % 10 + 1) + '</td>');
                h.push('</tr>');
            }
        }

        h.push('</table>');

        $('#MarketBody').html(h.join(''));
    },


    ApplyFilter: (Trade) => {
        return true;
    }
};