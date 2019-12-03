/*
 * **************************************************************************************
 *
 * Dateiname:                 negotiation.js
 * Projekt:                   foe
 *
 * erstellt von:             andrgin
 * zu letzt bearbeitet:      30.11.19, 18:55 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let Negotiation = {
    Tables: {},
    CurrentTry: 0,
    TryCount: undefined,
	GoodCount: undefined,
    CurrentTable: undefined,
    Goods: [],
    Guesses: [],
    PlaceCount: 5,
    Message: undefined,
	MessageClass: 'warning',


	/**
	 * Box in den DOM legen
	 *
	 * @constructor
	 */
    Show: () => {
        if ($('#negotiation').length === 0) {
            let args = {
                'id': 'negotiation',
                'title': i18n['Boxes']['Negotiation']['Title'],
                'auto_close': true,
                'dragdrop': true,
                'minimize': true
            };

            HTML.Box(args);

            if (Negotiation.Message === undefined) {
				Negotiation.Message = i18n['Boxes']['Negotiation']['Start'];
			}
        }

        Negotiation.BuildBox();
    },


	/**
	 * Body der Box parsen
	 *
	 * @constructor
	 */
    BuildBox: () => {
        Negotiation.CalcBody();
    },


	/**
	 * Berechnungen durchführen
	 *
	 * @constructor
	 */
    CalcBody: () => {
        let h = [];

        if (Negotiation.CurrentTry === 0) {
            h.push('<p class="text-center text-' + Negotiation.MessageClass + '"><strong>' + Negotiation.Message + '</strong></p>')
        }
        else {
            if (Negotiation.CurrentTable === undefined) {
                if (Negotiation.CurrentTry === 1) {
                    h.push('<p class="text-danger text-center"><strong>' + i18n['Boxes']['Negotiation']['NoSupport'] + '</strong></p>')
                }
                else {
                    h.push('<p class="text-danger text-center"><strong>' + i18n['Boxes']['Negotiation']['ErrorSelfPlaying'] + '</strong></p>');
                }
            }
            else {
                h.push('<table class="foe-table">');

                h.push('<thead>');
                h.push('<tr>');
                h.push('<td colspan="' + (Negotiation.PlaceCount +1) + '" class="text-warning">' + i18n['Boxes']['Negotiation']['Chance'] + ': ' + HTML.Format(Math.round(Negotiation.CurrentTable['Chance'])) + '%</td>')
                h.push('</tr>');

                h.push('<tr>');

                h.push('<th></th>');

                for (let i = 0; i < Negotiation.PlaceCount; i++) {
                    h.push('<th class="text-center">' + i18n['Boxes']['Negotiation']['Person'] + ' ' + (i+1) + '</th>');
                }

                h.push('</tr>');
                h.push('</thead>');

				h.push('<tbody>');

                for (let i = 0; i < Negotiation.Guesses.length; i++) {
                    h.push('<tr>');
                    h.push('<td>Runde ' + (i+1) + ':</td>');

                    for (let Platz = 0; Platz < Negotiation.PlaceCount; Platz++) {
                        let Good = Negotiation.Goods[Negotiation.Guesses[i][Platz]];

                        if (Good !== undefined) {
                        	let extraGood = (Good === 'money' || Good === 'supplies' || Good === 'medals') ? ' goods-sprite-extra ' : '';
                            h.push('<td class="text-center"><span class="goods-sprite ' + extraGood + Good + '"></span></td>');
                        }
                        else {
                            h.push('<td></td>');                            
                        }
                    }
                    h.push('</tr>');
                }

				h.push('</thead>');

                h.push('</table>');
            }
        }

        $('#negotiationBody').html(h.join(''));
    },


	/**
	 * Chancen Berechnung aus den Files
	 *
	 * @param responseData
	 * @constructor
	 */
    StartNegotiation: (responseData) => {
        Negotiation.CurrentTry = 1;
        let Ressources = responseData['possibleCosts']['resources']

        Negotiation.Goods = [];
        for (let RessourceName in Ressources) {
            Negotiation.Goods[Negotiation.Goods.length] = RessourceName;
        }

        Negotiation.Goods.sort(function (Good1, Good2) {
            let Good1Value = Negotiation.GetGoodValue(Good1),
                Good2Value = Negotiation.GetGoodValue(Good2);

            return Good1Value - Good2Value;
        });

        Negotiation.GoodCount = Negotiation.Goods.length;

        if (responseData['context'] === 'guildExpedition') {
            let BoostType = localStorage.getItem('TavernBoostType'),
                BoostExpire = localStorage.getItem('TavernBoostExpire'),
                Now = new Date().getTime();

            if (BoostType === 'extra_negotiation_turn' && moment.unix(BoostExpire) > Now) {
                Negotiation.TryCount = 4;
            }
            else {
                Negotiation.TryCount = 3;
            }
        }
        else
        {
            Negotiation.TryCount = 3;
        }
        
        let TableName = Negotiation.GetTableName(Negotiation.TryCount, Negotiation.GoodCount)
        Negotiation.CurrentTable = Negotiation.Tables[TableName];

        Negotiation.Guesses = [];
        if (Negotiation.CurrentTable !== undefined) {
            Negotiation.Guesses[0] = Negotiation.CurrentTable.Guess;
        }
		
        Negotiation.BuildBox();
    },


	/**
	 * Es wurde eine Runde abgeschickt
	 *
	 * @param responseData
	 * @constructor
	 */
    SubmitTurn: (responseData) => {
        if (Negotiation.CurrentTry === 0) return;

        Negotiation.CurrentTry++;

        let SlotData = responseData['turnResult']['slots'],
            Result = 0,
            OldGuess = Negotiation.Guesses[Negotiation.CurrentTry - 1 - 1],
            Slots = [0, 0, 0, 0, 0];

        for (let i = 0; i < SlotData.length; i++) {
            let State = SlotData[i]['state'],
                ResourceId = SlotData[i]['resourceId'],
                SlotID = SlotData[i]['slotId'];

            if (SlotID === undefined) SlotID = 0;          

            if (State === 'correct')
                Slots[SlotID] = 0;
            else if (State === 'wrong_person')
                Slots[SlotID] = 1;
            else
                Slots[SlotID] = 2;

            if (Negotiation.Goods[OldGuess[SlotID]] !== ResourceId) {
                Result = -1;
                break;
            }
        }

        if (Result === -1) {
            Negotiation.CurrentTry = 0;
            Negotiation.CurrentTable = undefined;
            Negotiation.Message = i18n['Boxes']['Negotiation']['WrongGoods'];
            Negotiation.MessageClass = 'danger';
        }
        else {
            for (let i = 0; i < 5; i++) {
                Result *= 4;
                Result += Slots[i];
            }

            if (Result === 0) {
                Negotiation.CurrentTry = 0;
                Negotiation.CurrentTable = undefined;
                Negotiation.Message = i18n['Boxes']['Negotiation']['Success'];
				Negotiation.MessageClass = 'success';
            }
            else if (Negotiation.CurrentTry > Negotiation.TryCount) {
                Negotiation.CurrentTry = 0;
                Negotiation.CurrentTable = undefined;
                Negotiation.Message = i18n['Boxes']['Negotiation']['TryEnd'];
				Negotiation.MessageClass = 'warning';
            }
            else {
                Negotiation.CurrentTable = Negotiation.CurrentTable['ResultTable'][Result];
                Negotiation.Guesses[Negotiation.Guesses.length] = Negotiation.CurrentTable.Guess;
            }
        }

        Negotiation.BuildBox();
    },


	/**
	 * Verhandlung zu Ende
	 *
	 * @constructor
	 */
    ExitNegotiation: () => {
        Negotiation.CurrentTry = 0;
    },


	/**
	 * Name zusammen setzen
	 *
	 * @param TryCount
	 * @param GoodCount
	 * @returns {string}
	 * @constructor
	 */
    GetTableName: (TryCount, GoodCount) => {
        return TryCount + '_' + GoodCount;
    },


	/**
	 * Gut bestimmen
	 *
	 * @param GoodName
	 * @returns {*}
	 * @constructor
	 */
    GetGoodValue: (GoodName) => {
        let Good = GoodsData[GoodName];
        let Era = Good['era'];

        let EraID = Technologies.Eras[Era];
        if (EraID === undefined)
        	EraID = 0;

        return EraID;
    }
};

(function () {
    let url = 'chrome-extension://' + extID + '/js/web/negotiationtables/';

    for (let TryCount = 3; TryCount <= 4; TryCount++) {
        for (let GoodCount = 2; GoodCount <= 10; GoodCount++) {
            let Request = new XMLHttpRequest;
            Request.open("GET", url + Negotiation.GetTableName(TryCount, GoodCount) + '.json');
            Request.onreadystatechange = function () {
                if (this.readyState == 4) {
                    if (Request.responseText !== '') {
                        let json = JSON.parse(Request.responseText);
                        let TableName = Negotiation.GetTableName(json['TryCount'], json['GoodCount']);
                        Negotiation.Tables[TableName] = json;
                    }
                }
            };
            Request.send();
        }
    }
})();
