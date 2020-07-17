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
    Market.Trades = data;
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
        }

        Market.CalcBody();
    },

    CalcBody: () => {
        let h = [];

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

        h.push('<td><select class="market-dropdown" id="change-offer">');
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

        h.push('<td>' + i18n('Boxes.Market.TradePartnerNeighbour') + '<input id="tradepartnerneighbour" class="game-cursor" ' + (Market.TradePartnerNeighbour ? 'checked' : '') + ' type="checkbox"></td>');
        h.push('<td>' + i18n('Boxes.Market.TradeForHigher') + '<input id="tradeforhigher" class="game-cursor" ' + (Market.TradeForHigher ? 'checked' : '') + ' type="checkbox"></td>');
        h.push('<td>' + i18n('Boxes.Market.TradeAdvantage') + '<input id="tradeadvantage" class="game-cursor" ' + (Market.TradeAdvantage ? 'checked' : '') + ' type="checkbox"></td>');
        h.push('</tr>');

        h.push('<tr>');
        h.push('<td>' + i18n('Boxes.Market.Need') + '</td>');

        h.push('<td><select class="market-dropdown" id="change-need">');
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

        h.push('<td>' + i18n('Boxes.Market.TradePartnerGuild') + '<input id="tradepartnerguild" class="game-cursor" ' + (Market.TradePartnerGuild ? 'checked' : '') + ' type="checkbox"></td>');
        h.push('<td>' + i18n('Boxes.Market.TradeForEqual') + '<input id="tradeforequal" class="game-cursor" ' + (Market.TradeForEqual ? 'checked' : '') + ' type="checkbox"></td>');
        h.push('<td>' + i18n('Boxes.Market.TradeFair') + '<input id="tradeadvantage" class="game-cursor" ' + (Market.TradeFair ? 'checked' : '') + ' type="checkbox"></td>');
        h.push('</tr>');

        h.push('<tr>');
        h.push('<td>' + i18n('Boxes.Market.MinQuantity') + '</td>');
        h.push('<td><input type="number" id="MinQuantity" step="1" min="0" max="1000000" value="' + Market.MinQuantity + '"></td>');
        h.push('<td>' + i18n('Boxes.Market.TradePartnerFriend') + '<input id="tradepartnerfriend" class="game-cursor" ' + (Market.TradePartnerFriend ? 'checked' : '') + ' type="checkbox"></td>');
        h.push('<td>' + i18n('Boxes.Market.TradeForLower') + '<input id="tradeforlower" class="game-cursor" ' + (Market.TradeForLower ? 'checked' : '') + ' type="checkbox"></td>');
        h.push('<td>' + i18n('Boxes.Market.TradeDisadvantage') + '<input id="tradedisadvantage" class="game-cursor" ' + (Market.TradeDisadvantage ? 'checked' : '') + ' type="checkbox"></td>');
        h.push('</tr>');
        h.push('</table>');

        $('#MarketBody').html(h.join(''));
    }
};