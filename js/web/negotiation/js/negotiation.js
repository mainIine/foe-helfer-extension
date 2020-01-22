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

/** 
 * @typedef {Object} Negotiation_GuessTable
 * @property {number} c Wahrscheinlichkeot zu gewinnen in %
 * @property {number[]} go durchschnittlicher Verbrauch pro gut
 * @property {number[]} gu zu ratende güter nummer
 * @property {Record<string, Negotiation_GuessTable>} [r] result auswertung
 * @property {number} [tryCount] nur im root
 * @property {number} [GoodCount] nur im root
 */

let Negotiation = {
	Tables: /** @type {Record<String, Negotiation_GuessTable>} */({}),
	CurrentTry: 0,
	TryCount: /** @type {undefined|number} */ (undefined),
	GoodCount: /** @type {undefined|number} */ (undefined),
	CurrentTable: /** @type {undefined|Negotiation_GuessTable} */ (undefined),
	// Mapt die zuweisung von der Tabellen-Spalte zu den Verhandlungspartnern
	PlaceMutation: /** @type {number[]} */ ([]),
	// Liste der Güter für die aktuelle Verhandlung
	Goods: /** @type {string[]} */ ([]),
	// Reihenfolgen-Liste der Güter für die Verhandlung
	GoodsOrdered: /** @type {{resourceId: string, id: number, plannedPos: number, canOccur: number[], hasToOccur: number}[]} */ ([]),
	GoodAmounts :  /** @type {number[]} */ ([]),
	Guesses: /** @type {{good: {resourceId: string, id: number, canOccur: number[], hasToOccur: number}|null, match: 0|1|2}[][]} */([]),
	PlaceCount: 5,
	Message: undefined,
	MessageClass: 'warning',
	SortableObj: null,

	ContinueListing: false,



	/**
	 * Box in den DOM legen
	 *
	 */
	Show: () => {
		if ($('#negotiationBox').length === 0) {

			// Box in den DOM
			HTML.Box({
				'id': 'negotiationBox',
				'title': i18n['Boxes']['Negotiation']['Title'],
				'auto_close': true,
				'minimize': true,
				'dragdrop': true,
				'saveCords': false
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('negotiation');
		}

		Negotiation.BuildBox();
	},


	/**
	 * Body der Box parsen
	 *
	 */
	BuildBox: () => {
		Negotiation.CalcBody();
	},


	/**
	* Body der Box aktualisieren falls bereits geöffnet
	*
	*/
	RefreshBox: () => {
		if ($('#negotiationBox').length > 0) {
			Negotiation.CalcBody();
		}
	},

	
	/**
	 * Berechnungen durchführen
	 *
	 */
	CalcBody: () => {
		const CurrentTry = Negotiation.CurrentTry;
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

			h.push('<td colspan="4"><div id="good-sort" ' + (CurrentTry === 1 ? '  class="goods-dragable"' : '') + '>');

			const GoodsOrdered = Negotiation.GoodsOrdered;
			for (let i = 0; i < Negotiation.GoodCount; i++) {

				let GoodInfo = GoodsOrdered[i],
					GoodName = GoodInfo.resourceId,
					GoodAmount = Negotiation.GoodAmounts[GoodName],
					extraGood = (GoodName === 'money' || GoodName === 'supplies' || GoodName === 'medals') ? ' goods-sprite-extra ' : '',
					Stock = ResourceStock[GoodName],
					TextClass;

				let maxRequired = GoodInfo.canOccur.length * GoodAmount;
				
				GoodAmount *= Negotiation.CurrentTable.go[i];

				if (Stock === undefined)
					Stock = 0;

				if (Stock < GoodAmount) {
					TextClass = 'error';
					StockState = Math.max(StockState, 2);
				}
				else if (Stock < maxRequired) {
					TextClass = 'warning';
					StockState = Math.max(StockState, 1);
				}
				else {
					TextClass = 'success';
				}

				if (GoodName === 'money' || GoodName === 'supplies' || GoodName === 'medals') {
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
			Negotiation.Message = i18n['Boxes']['Negotiation']['TableLoadError'];
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
		const Guesses = Negotiation.Guesses;
		for (let i = 0; i < Guesses.length; i++) {
			const Guess = Guesses[i];

			h.push('<tr' + ((i +1) < Guesses.length ? ' class="goods-opacity"' : '') + '>');

			for (let place = 0; place < Negotiation.PlaceCount; place++) {
				let SlotGuess = Guess[place];
				let Good = (SlotGuess.good === null ? 'empty' : SlotGuess.good.resourceId);
				
				if (Good !== undefined) {
					const extraGood = (Good === 'money' || Good === 'supplies' || Good === 'medals' || Good === 'empty') ? ' goods-sprite-extra ' : '';
					const tdClass = SlotGuess.good !== null && i+1 !== CurrentTry ? [' guess_match', ' guess_wrong_person', ' guess_fail'][SlotGuess.match] : '';
					const numberIcon = /*SlotGuess.good !== null && i+1 === CurrentTry ? '<span class="numberIcon">'+(SlotGuess.good.id+1)+'</span>' :*/ '';
					h.push('<td style="width:20%" class="text-center'+tdClass+'"><span class="goods-sprite ' + extraGood + Good + '"></span>'+numberIcon+'</td>');

				} else {
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
			// @ts-ignore
			$('.good').tooltip({
				container: '#negotiationBox'
			});

			if (Negotiation.CurrentTable !== undefined && Negotiation.CurrentTry === 1){
				// @ts-ignore
				new Sortable(document.getElementById('good-sort'), {
					animation: 150,
					ghostClass: 'good-drag',
					onEnd: function(){
						let oldOrdered = Negotiation.GoodsOrdered;
						Negotiation.GoodsOrdered = [];
						$('.good').each(function(){
							let resourceId = $(this).data('slug');
							Negotiation.GoodsOrdered.push( oldOrdered.find(info => info.resourceId === resourceId) );
						});
						Negotiation.GoodsOrdered.forEach((elem, i) => elem.plannedPos = i);
						Negotiation.updateNextGuess();
						Negotiation.CalcBody();
					}
				});
			}
		});
	},


	/**
	 * Chancen Berechnung aus den Files
	 *
	 * @param {FoE_Class_NegotiationGame} responseData
	 */
	StartNegotiation: (responseData) => {

		if ($('#negotiation-Btn').hasClass('hud-btn-red')) {
			$('#negotiation-Btn').removeClass('hud-btn-red');
			$('#negotiation-Btn-closed').remove();
		}
		
		Negotiation.CurrentTry = 1;
		Negotiation.Message = undefined;
		let Resources = responseData.possibleCosts.resources;

		const Goods = [];
		const PlaceCount = Negotiation.PlaceCount;
		Negotiation.Goods = Goods;
		for (let ResourceName in Resources) {
			Goods.push(ResourceName);
			Negotiation.GoodAmounts[ResourceName] = Resources[ResourceName];
		}
		Negotiation.GoodCount = Negotiation.Goods.length;

		const GoodsOrdered = Goods.map((good, idx) => ({
			resourceId: good,
			id: idx,
			plannedPos: -1,
			canOccur: [...new Array(PlaceCount).keys()],
			hasToOccur: 0
		}));
		Negotiation.GoodsOrdered = GoodsOrdered;
		GoodsOrdered.sort(function (Good1, Good2) {
			let Good1Value = Negotiation.GetGoodValue(Good1.resourceId),
				Good2Value = Negotiation.GetGoodValue(Good2.resourceId);

			return Good1Value - Good2Value;
		});
		GoodsOrdered.forEach((elem, i) => elem.plannedPos = i);

		Negotiation.PlaceMutation = [...new Array(PlaceCount).keys()];
		Negotiation.PlaceMutation.sort((a,b) => {
			const va = a < GoodsOrdered.length ? GoodsOrdered[a].id : 255;
			const vb = b < GoodsOrdered.length ? GoodsOrdered[b].id : 255;
			return va - vb;
		});

		if (responseData.context === 'guildExpedition') {
			let Now = new Date().getTime();

			if (moment.unix(Tavern.ExpireTime) > Now) {
				Negotiation.TryCount = 4;
			} else {
				Negotiation.TryCount = 3;
			}
		}
		else {
			if (Negotiation.GoodCount > 6) {
				Negotiation.TryCount = 4;
			} else {
				Negotiation.TryCount = 3;
			}
		}

		Negotiation.Guesses = [];
		Negotiation.GetTable();
	},


	/**
	 * Es wurde eine Runde abgeschickt
	 *
	 * @param {FoE_Class_NegotiationGameResult} responseData
	 */
	SubmitTurn: (responseData) => {
		const currentTry = Negotiation.CurrentTry;
		if (currentTry === 0) return;

		const GoodsOrdered = Negotiation.GoodsOrdered;
		const SlotData = responseData.turnResult.slots;
		const Guesses = Negotiation.Guesses;
		const OldGuess = Guesses[currentTry - 1];
		let Result = 0;

		for (let i = 0; i < SlotData.length; i++) {
			const data = SlotData[i];

			const State      = data.state;
			const ResourceId = data.resourceId;
			const SlotID     = data.slotId || 0;
			const oldSlotGuess = OldGuess[SlotID];

			const goodIdx = GoodsOrdered.findIndex(info => info.resourceId === ResourceId);
			const goodInfo = GoodsOrdered[goodIdx];
			// Entferne diesen Verhandlungspartner aus der Liste der möglichen plätze für dieses Gut.
			goodInfo.canOccur = goodInfo.canOccur.filter(elem => elem !== i);

			if (State === 'correct') {
				oldSlotGuess.match = 0; /* korrekt */
				if (goodInfo.hasToOccur < currentTry) {
					goodInfo.hasToOccur = 0;
				}
				for (let info of GoodsOrdered) {
					info.canOccur = info.canOccur.filter(elem => elem !== i);
				}
			} else if (State === 'wrong_person') {
				oldSlotGuess.match = 1; /* falsche Person */
				goodInfo.hasToOccur = currentTry;
			} else {
				oldSlotGuess.match = 2; /* ganz falsch */
				goodInfo.canOccur = [];
				goodInfo.hasToOccur = 0;
			}

			if (goodInfo !== OldGuess[SlotID].good) {
				OldGuess[SlotID].good = GoodsOrdered[goodIdx];
				Result = -1;
			}
		}

		if (Result === -1 && Negotiation.findMatchingPermutation()) {
			Result = 0;
		}

		if (Result === -1) {
			Negotiation.CurrentTry = 0;
			Negotiation.CurrentTable = undefined;
			Negotiation.Message = i18n['Boxes']['Negotiation']['WrongGoods'];
			Negotiation.MessageClass = 'danger';

		} else {
			const PlaceMutation = Negotiation.PlaceMutation;
			for (let i = 0; i < 5; i++) {
				Result *= 4;
				Result += OldGuess[PlaceMutation[i]].match;
			}

			if (Result === 0) {
				// Verhandlung erfolgreich abgeschlossen
				Negotiation.CurrentTry = 0;
				Negotiation.CurrentTable = undefined;
				Negotiation.Message = i18n['Boxes']['Negotiation']['Success'];
				Negotiation.MessageClass = 'success';

				if (Settings.GetSetting('AutomaticNegotiation') && $('#negotiationBox').length > 0) {
					$('#negotiationBox').fadeToggle(function () {
						$(this).remove();
					});
				}

			} else if (currentTry >= Negotiation.TryCount) {
				// Versuche aufgebraucht
				Negotiation.CurrentTry = 0;
				Negotiation.CurrentTable = undefined;
				Negotiation.Message = i18n['Boxes']['Negotiation']['TryEnd'];
				Negotiation.MessageClass = 'warning';

			} else {
				// Verhandlung geht weiter
				Negotiation.CurrentTable = Negotiation.CurrentTable.r[Result];
				Negotiation.CurrentTry = currentTry+1;
				Negotiation.updateNextGuess();
			}
		}

		Negotiation.RefreshBox();
	},


	/**
	 * Verhandlung zu Ende
	 *
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
	 */
	GetTableName: (TryCount, GoodCount) => {
		return TryCount + '_' + GoodCount;
	},


	updateNextGuess: () => {
		const GoodsOrdered = Negotiation.GoodsOrdered;
		const PlaceMutation = Negotiation.PlaceMutation;
		const gu = Negotiation.CurrentTable.gu;
		/** @type {{good: {resourceId: string, id: number, canOccur: number[], hasToOccur: number}|null, match: 0|1|2}[]} */
		const Guesses = [];
		for (let i = 0; i < gu.length; i++) {
			Guesses[PlaceMutation[i]] = {good: gu[i] === 255 ? null : GoodsOrdered[gu[i]], match: 0};
		}
		Negotiation.Guesses[Negotiation.CurrentTry-1] = Guesses;
	},

	findMatchingPermutation: () => {
		const currentTry = Negotiation.CurrentTry;
		const GoodsOrdered = Negotiation.GoodsOrdered;
		const PlaceCount = Negotiation.PlaceCount;
		const Guesses = Negotiation.Guesses;
		const MainTable = Negotiation.Tables[Negotiation.GetTableName(Negotiation.TryCount, Negotiation.GoodCount)];
		const GoodsOrderedCopy = GoodsOrdered.slice();
		let bestDistance = Number.MAX_SAFE_INTEGER;
		let found = false;
		// Gehe alle Permutationen der Verhandlungspartner durch (120 bei 5 Personen)
		for (let permutation of helper.permutations([...new Array(PlaceCount).keys()])) {
			const goodMap = new Array(GoodsOrdered.length).fill(255);
			let valid = true;

			let table = MainTable;
			let lastTable = table;
			let result;
			// prüfe ob dies eine gültige Permutation wäre
			for (let round = 0; round < currentTry; round++) {
				result = 0;
				for (let place = 0; place < PlaceCount; place++) {
					const realPlace = permutation[place];
					const SlotGuess = Guesses[round][realPlace];
					// result für die verfolgung der weiteren Runden berechnen
					result = result*4 + SlotGuess.match;

					const usedGood = SlotGuess.good.id;
					const goodMapped = goodMap[usedGood];
					const guessGood = table.gu[place];

					if (goodMapped === 255) {
						// Gut wurde noch nicht zugeordnet
						goodMap[usedGood] = guessGood;
					} else if (goodMapped !== guessGood) {
						// Zuordnung passt nicht zur aktuellen Tabelle
						valid = false;
						break;
					}
				}
				if (!valid || !table.r) break;
				lastTable = table;
				table = table.r[result];
			}

			if (valid) {
				// Prüfe wie nah, die Güterbelegung am original ist.
				GoodsOrderedCopy.sort((a,b) => goodMap[a.id] - goodMap[b.id]);

				let distance = 0;
				for (let i = 0; i<GoodsOrderedCopy.length; i++) {
					const plannedPos = GoodsOrderedCopy[i].plannedPos;
					if (plannedPos > i) distance += plannedPos-i;
				}

				if (bestDistance > distance) {
					// Übernehme dia aktuell beste Permutation
					bestDistance = distance;
					GoodsOrdered.sort((a,b) => goodMap[a.id] - goodMap[b.id]);
					Negotiation.PlaceMutation = permutation;
					found = true;
					Negotiation.CurrentTable = lastTable;
				}
			}
		}
		return found;
	},

	/**
	 * Gut bestimmen
	 *
	 * @param GoodName
	 * @returns {*}
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
	 */
	GetTable: () => {
		let TableName = Negotiation.GetTableName(Negotiation.TryCount, Negotiation.GoodCount);

		// gibt es noch nicht, laden
		if (Negotiation.Tables[TableName] === undefined) {
			let url = extUrl + 'js/web/negotiation/tables/';

			fetch(url + TableName + '.zip')
				.then(function (response) {
					if (response.status === 200 || response.status === 0) {
						return Promise.resolve(response.blob());
					} else {
						return Promise.reject(new Error(response.statusText));
					}
				})
				.then(JSZip.loadAsync)
				.then(function (zip) {
					// @ts-ignore
					return zip.file(TableName + ".json").async("uint8array");
				})
				.then((/** @type {Uint8Array} */response) => {
					Negotiation.Tables[TableName] = JSON.parse(new TextDecoder().decode(response));

					Negotiation.CurrentTable = Negotiation.Tables[TableName];

					if (Negotiation.CurrentTable !== undefined) {
						Negotiation.updateNextGuess();
					}

					Negotiation.RefreshBox();
					if (Settings.GetSetting('AutomaticNegotiation') && $('#negotiationBox').length === 0) {
						Negotiation.Show();
					}
				})
				.catch(err => {console.error(err); return null;})
			;
		} else {
			// bereits geladen
			Negotiation.CurrentTable = Negotiation.Tables[TableName];
			Negotiation.updateNextGuess();
			Negotiation.RefreshBox();
			if (Settings.GetSetting('AutomaticNegotiation') && $('#negotiationBox').length === 0) {
				setTimeout(() => {
					Negotiation.Show();
				}, 300);
			}
		}
	}
};

// --------------------------------------------------------------------------------------------------
// Negotiation

FoEproxy.addHandler('all', 'startNegotiation', (data, postData) => {
	Negotiation.StartNegotiation(/** @type {FoE_Class_NegotiationGame} */ (data.responseData));
});

FoEproxy.addHandler('NegotiationGameService', 'submitTurn', (data, postData) => {
	Negotiation.SubmitTurn(/** @type {FoE_Class_NegotiationGameResult} */ (data.responseData) );
});

FoEproxy.addHandler('NegotiationGameService', 'giveUp', (data, postData) => {
	Negotiation.ExitNegotiation();
});
