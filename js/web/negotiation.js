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
	Resources: null,
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
    * Body der Box aktualisieren falls bereits geöffnet
    *
    * @constructor
    */
    RefreshBox: () => {
        if ($('#negotiation').length > 0) {
            setTimeout(() => {
                Negotiation.CalcBody();
            }, 200);
        }
    },

    
	/**
	 * Berechnungen durchführen
	 *
	 * @constructor
	 */
    CalcBody: () => {
        let h = [];
        h.push('<table class="foe-table">');
        
        h.push('<thead>');
        if (Negotiation.CurrentTable !== undefined) {
            h.push('<tr>');
            h.push('<td colspan="' + (Negotiation.PlaceCount + 1) + '" class="text-warning">' + i18n['Boxes']['Negotiation']['Chance'] + ': ' + HTML.Format(Math.round(Negotiation.CurrentTable['Chance'])) + '%</td>')
            h.push('</tr>');
        }

        h.push('<tr>');

        h.push('<th></th>');

        for (let i = 0; i < Negotiation.PlaceCount; i++) {
            h.push('<th class="text-center">' + i18n['Boxes']['Negotiation']['Person'] + ' ' + (i + 1) + '</th>');
        }

        h.push('</tr>');
        h.push('</thead>');

        h.push('<tbody>');

        for (let i = 0; i < Negotiation.Guesses.length; i++) {
            h.push('<tr>');
            h.push('<td>Runde ' + (i + 1) + ':</td>');

            for (let place = 0; place < Negotiation.PlaceCount; place++) {
                let Good = Negotiation.Goods[Negotiation.Guesses[i][place]];

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

        if (Negotiation.Message !== undefined) {
            h.push('<p class="text-center text-' + Negotiation.MessageClass + '"><strong>' + Negotiation.Message + '</strong></p>')
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

    	if( $('#negotationBtn').hasClass('hud-btn-red') ){
			$('#negotationBtn').removeClass('hud-btn-red');
		}

        Negotiation.CurrentTry = 1;
        Negotiation.Message = undefined;
        let Resources = responseData['possibleCosts']['resources'];

        Negotiation.Goods = [];
        for (let ResourceName in Resources) {
            Negotiation.Goods[Negotiation.Goods.length] = ResourceName;
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
        else if (responseData['context'] === undefined) {
            if (Negotiation.Goods.length > 6) {
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

		Negotiation.Guesses = [];
        Negotiation.GetTable();
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

        Negotiation.RefreshBox();
    },


	/**
	 * Verhandlung zu Ende
	 *
	 * @constructor
	 */
    ExitNegotiation: () => {
        Negotiation.CurrentTry = 0;
        Negotiation.CurrentTable = undefined;
        Negotiation.Message = i18n['Boxes']['Negotiation']['Canceled'];
        Negotiation.MessageClass = 'danger';

        Negotiation.RefreshBox();
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
        if (GoodName === 'money') {
            Value = 0;
        }
        else if (GoodName === 'supplies') {
            Value = 50;
        }
        else if (GoodName === 'medals') {
            Value = 3000;
        }
        else if (GoodName === 'promethium') {
            Value = 3500;
        }
        else if (GoodName === 'orichalcum') {
            Value = 4000;
        }
        else {
            let Good = GoodsData[GoodName];
            let Era = Good['era'];

            let EraID = Technologies.Eras[Era];
            if (EraID === undefined) EraID = 20;

            Value = EraID * 100;

            let Stock = ResourceStock[GoodName];
            if (Stock === undefined || Stock === 0)
            {
                Value += 99;
            }
            else
            {
                Value+= (1.0 / Stock);
            }
        }

        return Value;
    },


	/**
	 * Läd die Tabelle
	 *
	 * @constructor
	 */
	GetTable: ()=> {

		let TableName = Negotiation.GetTableName(Negotiation.TryCount, Negotiation.GoodCount);

		// gibt es noch nicht, laden
    	if( Negotiation.Tables[TableName] === undefined ){

			let url = 'chrome-extension://' + extID + '/js/web/negotiationtables/';

    		MainParser.loadJSON(url + TableName + '.json', function(response){
				Negotiation.Tables[TableName] = JSON.parse(response);

				Negotiation.CurrentTable = Negotiation.Tables[TableName];

				if (Negotiation.CurrentTable !== undefined) {
					Negotiation.Guesses[0] = Negotiation.CurrentTable['Guess'];
				}
			});
		}
    	// bereits geladen
    	else {
			Negotiation.CurrentTable = Negotiation.Tables[TableName];
			Negotiation.Guesses[0] = Negotiation.CurrentTable['Guess'];
		}

        Negotiation.RefreshBox();
	}
};