/*
 * **************************************************************************************
 *
 * Dateiname:                 negotiation.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 14:14 Uhr
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
    GoodAmounts : [],
    Guesses: [],
    PlaceCount: 5,
    Message: undefined,
	MessageClass: 'warning',
	SortableObj: null,


	/**
	 * Box in den DOM legen
	 *
	 * @constructor
	 */
    Show: () => {
        if ($('#negotiationBox').length === 0) {
            let args = {
                'id': 'negotiationBox',
                'title': i18n['Boxes']['Negotiation']['Title'],
                'auto_close': true,
                'minimize': true,
				'dragdrop': true,
				'saveCords': false
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
        if ($('#negotiationBox').length > 0) {
            Negotiation.CalcBody();
        }
    },

    
	/**
	 * Berechnungen durchführen
	 *
	 * @constructor
	 */
    CalcBody: () => {
        let h = [],
            StockState = 0,
			IsEnd = false;

		h.push('<table class="foe-table no-hover">');


        if (Negotiation.CurrentTable !== undefined) {
            h.push('<tbody>');

            h.push('<tr>');
            h.push('<td colspan="4" class="text-warning"><strong>' + i18n['Boxes']['Negotiation']['Chance'] + ': ' + HTML.Format(Math.round(Negotiation.CurrentTable['c'])) + '%</strong></td>');
            h.push('<td colspan="1" class="text-right" id="round-count" style="padding-right: 15px"><strong></strong></td>');
            h.push('</tr>');

            h.push('<tr>');

            h.push('<td class="text-warning">' + i18n['Boxes']['Negotiation']['Average'] + '</td>');

            h.push('<td colspan="4"><div id="good-sort" ' + (Negotiation.CurrentTry === 1 ? '  class="goods-dragable"' : '') + '>');

            for (let i = 0; i < Negotiation.GoodCount; i++) {

                let GoodName = Negotiation.Goods[i],
                    GoodAmount = Negotiation.GoodAmounts[GoodName],
                    extraGood = (GoodName === 'money' || GoodName === 'supplies' || GoodName === 'medals') ? ' goods-sprite-extra ' : '',
                    Stock = ResourceStock[GoodName],
                    TextClass;

                GoodAmount *= Negotiation.CurrentTable['go'][i];

                if (Stock === undefined)
                    Stock = 0;

                if (Stock < GoodAmount) {
                    TextClass = 'error';
                    StockState = Math.max(StockState, 2);
                }
                else if (Stock < 5 * Negotiation.GoodAmounts[GoodName]) {
                    TextClass = 'warning';
                    StockState = Math.max(StockState, 1);
                }
                else {
                    TextClass = 'success';
                }

                if (Negotiation.Goods[i] === 'money' || Negotiation.Goods[i] === 'supplies' || Negotiation.Goods[i] === 'medals') {
                    GoodAmount = Math.round(GoodAmount);
                }
                else {
                    GoodAmount = Math.round(GoodAmount * 10) / 10;
                }

                h.push('<div class="good" data-slug="' + GoodName + '" title="' + i18n['Boxes']['Negotiation']['Stock'] + ' ' + HTML.Format(ResourceStock[GoodName]) + '">' +
                    '<span class="goods-sprite ' + extraGood + GoodName + '"></span><br>' +
                    '<span class="text-' + TextClass + '">' + HTML.Format(GoodAmount) + '</span>' +
                    '</div>');
            }

            h.push('</div></td>');

            h.push('</tr>');

            if (Negotiation.CurrentTry === 1) {
                h.push('<tr>');
                h.push('<td colspan="5" class="text-center"><small>' + i18n['Boxes']['Negotiation']['DragDrop'] + '</small></td>');
                h.push('</tr>');
            }

            h.push('</tbody>');
        }
        else if (Negotiation.CurrentTable === undefined && Negotiation.CurrentTry === 1){
            Negotiation.MessageClass = 'danger';
            Negotiation.Message = 'ERROR: Could not load negotation table'; //Todo: Translate
        }
        
        h.push('<tbody>');
        h.push('<tr class="thead">');

        for (let i = 0; i < Negotiation.PlaceCount; i++) {
            h.push('<th class="text-center">' + i18n['Boxes']['Negotiation']['Person'] + ' ' + (i + 1) + '</th>');
        }

        h.push('</tr>');
        h.push('</tbody>');


        h.push('<tbody>');

        let cnt = 0;
        for (let i = 0; i < Negotiation.Guesses.length; i++) {

            h.push('<tr' + ((i +1) < Negotiation.Guesses.length ? ' class="goods-opacity"' : '') + '>');

            for (let place = 0; place < Negotiation.PlaceCount; place++) {
                let GoodIndex = Negotiation.Guesses[i][place];
                let Good = (GoodIndex === 255 ? 'empty' : Negotiation.Goods[GoodIndex]);
                
                if (Good !== undefined) {
                    let extraGood = (Good === 'money' || Good === 'supplies' || Good === 'medals' || Good === 'empty') ? ' goods-sprite-extra ' : '';
                    h.push('<td style="width:20%" class="text-center"><span class="goods-sprite ' + extraGood + Good + '"></span></td>');
                }
                else {
                    h.push('<td style="width:20%">&nbsp;</td>');
                }
            }
            h.push('</tr>');

            cnt = i;
        }


		h.push('</thead>');

        h.push('</table>');

        if (Negotiation.Message !== undefined) {
        	IsEnd = true;
            h.push('<p class="text-center text-' + Negotiation.MessageClass + '"><strong>' + Negotiation.Message + '</strong></p>');
        }

        if (StockState === 1) {
            h.push('<p class="text-center text-warning"><strong>' + i18n['Boxes']['Negotiation']['GoodsLow'] + '</strong></p>')
        }
        else if (StockState === 2) {
            h.push('<p class="text-center text-danger"><strong>' + i18n['Boxes']['Negotiation']['GoodsCritical'] + '</strong></p>')
        }

        $('#negotiationBoxBody').html(h.join('')).promise().done(function(){

        	// Rundenzahl oben rechts
        	$('#round-count').find('strong').text(i18n['Boxes']['Negotiation']['Round'] + ' ' + (cnt + 1) + '/' + (Negotiation.TryCount));

        	// Verhandlungen Fertig/abgebrochen/Fehler
        	if(IsEnd === true){
				$('.foe-table').find('tr').removeClass('goods-opacity');
			}

			// Lagerbestand via Tooltip
			$('.good').tooltip({
				container: '#negotiationBox'
			});

            if (Negotiation.CurrentTable !== undefined && Negotiation.CurrentTry === 1){
				new Sortable(document.getElementById('good-sort'), {
					animation: 150,
					ghostClass: 'good-drag',
					onEnd: function(){
						Negotiation.Goods = [];
						$('.good').each(function(){
							Negotiation.Goods.push( $(this).data('slug') );
						});

						Negotiation.CalcBody();
					}
				});
			}
		});
    },


	/**
	 * Chancen Berechnung aus den Files
	 *
	 * @param responseData
	 * @constructor
	 */
    StartNegotiation: (responseData) => {

        if ($('#negotationBtn').hasClass('hud-btn-red')) {
			$('#negotationBtn').removeClass('hud-btn-red');
			$('#negotiationBox-closed').remove();
		}
        
        Negotiation.CurrentTry = 1;
        Negotiation.Message = undefined;
        let Resources = responseData['possibleCosts']['resources'];

        Negotiation.Goods = [];
        for (let ResourceName in Resources) {
            Negotiation.Goods[Negotiation.Goods.length] = ResourceName;
            Negotiation.GoodAmounts[ResourceName] = Resources[ResourceName];
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
        else {
            if (Negotiation.Goods.length > 6) {
                Negotiation.TryCount = 4;
            }
            else {
                Negotiation.TryCount = 3;
            }
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

            if (SlotID === undefined)
            	SlotID = 0;

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
                if (Settings.GetSetting('AutomaticNegotiation') && $('#negotiationBox').length > 0) {
                    $('#negotiationBox').fadeToggle(function () {
                        $(this).remove();
                    });
                }
            }
            else if (Negotiation.CurrentTry > Negotiation.TryCount) {
                Negotiation.CurrentTry = 0;
                Negotiation.CurrentTable = undefined;
                Negotiation.Message = i18n['Boxes']['Negotiation']['TryEnd'];
				Negotiation.MessageClass = 'warning';

            }
            else {
                Negotiation.CurrentTable = Negotiation.CurrentTable['r'][Result];
                Negotiation.Guesses[Negotiation.Guesses.length] = Negotiation.CurrentTable['gu'];
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

		if(Settings.GetSetting('AutomaticNegotiation') && $('#negotiationBox').length > 0){
			$('#negotiationBox').fadeToggle(function(){
				$(this).remove();
			});
		}
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
    	let Value = 0;

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

            if (Era === 'SpaceAgeMars') { //Marsgüter mit arkt. Gütern gleich setzen
                EraID -= 3;
            }
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

			let url = 'chrome-extension://' + extID + '/js/web/negotiation/tables/';

    		MainParser.loadJSON(url + TableName + '.json', function(response){
				Negotiation.Tables[TableName] = JSON.parse(response);

				Negotiation.CurrentTable = Negotiation.Tables[TableName];

				if (Negotiation.CurrentTable !== undefined) {
					Negotiation.Guesses[0] = Negotiation.CurrentTable['gu'];
                }

                Negotiation.RefreshBox();
                if (Settings.GetSetting('AutomaticNegotiation') && $('#negotiationBox').length === 0) {
                    Negotiation.Show();
                }
			});
		}
    	// bereits geladen
    	else {
			Negotiation.CurrentTable = Negotiation.Tables[TableName];
            Negotiation.Guesses[0] = Negotiation.CurrentTable['gu'];
            Negotiation.RefreshBox();
            if (Settings.GetSetting('AutomaticNegotiation') && $('#negotiationBox').length === 0) {
                setTimeout(() => {
                    Negotiation.Show();
                }, 300);
            }
        }
    }
};