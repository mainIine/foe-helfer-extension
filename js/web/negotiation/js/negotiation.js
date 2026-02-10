/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
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

/**
 * @typedef {Object} Negotiation_GoodData
 * @property {number} id fixed sequential number for each good of the negotiation starting at 0, sorted by associated hotkey number ('0' = 10)
 * @property {string} resourceId id der resource aus dem Spiel
 * @property {number} plannedPos gewünschte Position in der Güterreihenfolge (Permutationen versuchen diese so gut wie möglich zu erhalten)
 * @property {number[]} canOccur liste der verhandlungspartner (slots) auf denen das Gut noch vorkommen kann.
 * @property {number} hasToOccur >0 wenn das gut noch auftauchen muss (letzte Rundennummer in der gemeldet wurde dass es noch auftauchen muss, wenn noch aktuell)
 * @property {number} amount menge des Gutes, die für jedes Angebot gebraucht wird
 * @property {number} value Wert des Gutes, wird genutzt um die Güter in ihrer Priorität zu sortieren
 */

/**
 * @typedef {Object} Negotiation_SlotGuessInfo
 * @property {Negotiation_GoodData|null} good Das Gut welches angeboten wurde
 * @property {0|1|2} match Die Antwort auf das Angebot: 0: Korrekt, 1: Falsche Person, 2: Falsch
 */


let Negotiation = {
	Tables: /** @type {Record<String, Negotiation_GuessTable>} */({}),
	CurrentTry: 0,
	TryCount: /** @type {undefined|number} */ undefined,
	TryCountIsGreaterThan5: /** @type {boolean} */ false,
	GoodCount: /** @type {undefined|number} */ undefined,
	CurrentTable: /** @type {undefined|Negotiation_GuessTable} */ undefined,
	// Mapt die Zuweisung von der Tabellen-Spalte zu den Verhandlungspartnern
	PlaceMutation: /** @type {number[]} */ ([]),
	// Reihenfolgen-Liste der Güter für die Verhandlung
	GoodsOrdered: /** @type {Negotiation_GoodData[]} */ ([]),
	Guesses: /** @type {Negotiation_SlotGuessInfo[][]} */([]),
	GuessesSuggestions: /** @type {(Negotiation_GoodData|null)[][]} */([]),
	PlaceCount: 5,
	Message: undefined,
	MessageClass: 'warning',
	SortableObj: null,

	WrongGoodsSelected: false,
	ContinueListing: false,
	NeedGoodMissmatchConfirm: false,

	StartNegotiationBackupData: undefined,

	CONST_Context_GE: 'guildExpedition',
	CONST_Context_GBG: 'guildBattleground',

	/**
	 * Box in den DOM legen
	 *
	 */
	Show: () => {
		if ($('#negotiationBox').length === 0) {

			// Box in den DOM
			HTML.Box({
				'id': 'negotiationBox',
				'title': i18n('Boxes.Negotiation.Title'),
				'ask': i18n('Boxes.Negotiation.HelpLink'),
				'auto_close': true,
				'minimize': true,
				'dragdrop': true
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('negotiation');

			$('#negotiationBox').on('click', '.negotation-setting', function(){
				let $this = $(this),
					id = $this.data('id'),
					v = $this.prop('checked');

				localStorage.setItem(id, v);

				setTimeout(()=>{
					Negotiation.StartNegotiation(Negotiation.StartNegotiationBackupData);
				}, 150);

			});

		} else {
			HTML.CloseOpenBox('negotiationBox');
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
		const Guesses = Negotiation.Guesses;
		let h = [],
			StockState = 0;

		h.push('<table class="foe-table no-hover">');


		if (Negotiation.CurrentTable !== null) {

			let sceg = localStorage.getItem('NegotiationSaveCurrentEraGoods'),
				sm = localStorage.getItem('NegotiationSaveMedals');

			h.push('<thead class="dark-bg">');

			h.push('<tr>');
			if (CurrentTry === 1) {
				h.push('<th colspan="2"><label class="game-cursor" for="NegotiationSaveCurrentEraGoods">' + i18n('Boxes.Negotiation.SaveCurrentEraGoods') + '<input id="NegotiationSaveCurrentEraGoods" class="negotation-setting game-cursor" type="checkbox" data-id="NegotiationSaveCurrentEraGoods"' + ((sceg === null || sceg === 'true') ? ' checked' : '') + '></label></th>');
				h.push('<th><label class="game-cursor" for="NegotiationSaveMedals">' + i18n('Boxes.Negotiation.SaveMedals') + '<input id="NegotiationSaveMedals" class="negotation-setting game-cursor" type="checkbox" data-id="NegotiationSaveMedals"' + ((sm === null || sm === 'true') ? ' checked' : '') + '></label></th>');
			}
			h.push('<th class="text-right" colspan="' + (CurrentTry === 1 ? '2' : '5') + '"' + '>' + 
			'<strong class="text-warning"' + (Negotiation.TryCountIsGreaterThan5 ? 'data-title="'+i18n('Boxes.Negotiation.ChanceGreaterThan5') : '')+'">' + 
				i18n('Boxes.Negotiation.Chance') + ': ' + HTML.Format(MainParser.round(Negotiation.CurrentTable['c'])) + (Negotiation.TryCountIsGreaterThan5 ? '% ⚠️ - ' : '% - '));
			h.push('<b style="padding-right: 15px"> ');
			h.push(i18n('Boxes.Negotiation.Round') + ' ' + (Guesses.length + 1) + '/' + (Negotiation.TryCount));
			h.push('</b></strong></th>');
			h.push('</tr>');
			h.push('</thead>');

			h.push('<tbody>');
			h.push('<tr>');

			h.push('<td class="text-warning">' + i18n('Boxes.Negotiation.Average') + '</td>');

			h.push('<td colspan="4"><div id="good-sort" ' + (CurrentTry === 1 ? '  class="goods-dragable"' : '') + '>');

			const GoodsOrdered = Negotiation.GoodsOrdered;
			for (let i = 0; i < Negotiation.GoodCount; i++) {

				let GoodInfo = GoodsOrdered[i],
					GoodName = GoodInfo.resourceId,
					GoodAmount = GoodInfo.amount,
					Stock = ResourceStock[GoodName],
					TextClass;

				let maxRequired = GoodInfo.canOccur.length * GoodAmount;

				GoodAmount *= Negotiation.CurrentTable.go[i];

				if (Stock === undefined)
					Stock = 0;

				if (Stock < GoodAmount) {
					TextClass = 'danger';
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
					GoodAmount = MainParser.round(GoodAmount);
				}
				else {
					GoodAmount = MainParser.round(GoodAmount * 10) / 10;
				}

				h.push('<div class="good" data-slug="' + GoodName + '" title="' + HTML.i18nTooltip(i18n('Boxes.Negotiation.Stock')) + ' ' + HTML.Format(Stock) + '">' +
					'<span class="goods-sprite ' + GoodName + '"></span><br>' +
					'<span class="text-' + TextClass + '">' + HTML.Format(GoodAmount) + '</span>' +
					'</div>');
			}

			h.push('</div></td>');

			h.push('</tr>');

			if (Negotiation.CurrentTry === 1) {
				h.push('<tr>');
				h.push('<td colspan="5" class="text-center"><small>' + i18n('Boxes.Negotiation.DragDrop') + '</small></td>');
				h.push('</tr>');
			}
		}
		else if (Negotiation.CurrentTable == null && Negotiation.CurrentTry === 1){
			Negotiation.MessageClass = 'danger';
			Negotiation.Message = i18n('Boxes.Negotiation.TableLoadError');
		}

		// Verhandlungspartner überschrifteh
		h.push('<tr class="thead">');

		for (let i = 0; i < Negotiation.PlaceCount; i++) {
			h.push('<th class="text-center">' + i18n('Boxes.Negotiation.Person') + ' ' + (i + 1) + '</th>');
		}

		h.push('</tr></tbody>');

		if (Negotiation.WrongGoodsSelected) {
			h.push('<tbody class="wrong-goods">');
		} else {
			h.push('<tbody>');
		}

		Negotiation.createGuessLines(h, !Negotiation.NeedGoodMissmatchConfirm);

		if (Negotiation.NeedGoodMissmatchConfirm) {
			Negotiation.createMissmatchLine(h);
		} else {
			Negotiation.createSuggestionLine(h);

			if (Negotiation.ContinueListing || !Negotiation.CurrentTable) {
				Negotiation.createPossibleItemsLine(h);
			}
		}


		h.push('</tbody>');
		h.push('</table>');

		if (Negotiation.Message != null) {
			h.push('<p class="text-center text-' + Negotiation.MessageClass + '"><strong>' + Negotiation.Message + '</strong></p>');
		}

		if (StockState === 1) {
			h.push('<p class="text-center text-warning"><strong>' + i18n('Boxes.Negotiation.GoodsLow') + '</strong></p>')
		}
		else if (StockState === 2) {
			h.push('<p class="text-center text-danger"><strong>' + i18n('Boxes.Negotiation.GoodsCritical') + '</strong></p>')
		}

		$('#negotiationBoxBody').html(h.join('')).promise().done(function(){
			// Lagerbestand via Tooltip
			// @ts-ignore
			$('.good').tooltip({
				container: '#negotiationBox'
			});
			$('thead strong.text-warning').tooltip({
				container: '#negotiationBox'
			});

			if (Negotiation.CurrentTable != null && Negotiation.CurrentTry === 1){
				// @ts-ignore
				new Sortable(document.getElementById('good-sort'), {
					animation: 150,
					ghostClass: 'good-drag',
					onEnd: function () {
						// Fix für hängen bleibende Tooltips
						if ($('#negotiationBox')[0] !== undefined && $('#negotiationBox')[0]['children'] !== undefined) {
							for (let i = 0; i < $('#negotiationBox')[0]['children'].length;i++) {
								if ($('#negotiationBox')[0]['children'][i]['className'] === 'tooltip fade top in') {
									$('#negotiationBox')[0]['children'][i].remove();
									i--;
								}
							}
						}

						let oldOrdered = Negotiation.GoodsOrdered;
						Negotiation.GoodsOrdered = [];
						$('.good').each(function(){
							let resourceId = $(this).data('slug');
							Negotiation.GoodsOrdered.push( oldOrdered.find(info => info.resourceId === resourceId) );
						});
						Negotiation.GoodsOrdered.forEach((elem, i) => elem.plannedPos = i);
						Negotiation.updateInitialPermutation();
						Negotiation.updateNextGuess();
						Negotiation.CalcBody();
					}
				});
			}
		});
	},


	/**
	 * @param {string[]} h list of html-strings to add new contend to
	 * @param {boolean} includeLastLine true if the last guess should be included in the output
	 */
	createGuessLines: (h, includeLastLine) => {
		const Guesses = Negotiation.Guesses;
		const GuessesSuggestions = Negotiation.GuessesSuggestions;

		const limit = Guesses.length - (includeLastLine ? 0 : 1);
		for (let i = 0; i < limit; i++) {
			const Guess = Guesses[i];
			const suggestion = GuessesSuggestions[i];
			h.push('<tr class="guess goods-opacity">');
			for (let place = 0; place < Negotiation.PlaceCount; place++) {
				const SlotGuess = Guess[place];
				const SlotSugestion = suggestion ? suggestion[place] : null;
				const good_id = SlotGuess && SlotGuess.good ? SlotGuess.good.resourceId : 'empty';
				const matchStyleClass = SlotGuess.good !== null ? [' guess_match', ' guess_wrong_person', ' guess_fail'][SlotGuess.match] : '';
				h.push(`<td class="text-center${matchStyleClass}">`);
				h.push(`<span class="goods-sprite ${good_id}"></span>`);
				if (SlotSugestion) {
					const missmatch = !SlotGuess || SlotSugestion !== SlotGuess.good ? ' missmatch' : '';
					h.push(`<span class="goods-sprite cornered${missmatch} ${SlotSugestion.resourceId}"></span>`);
				}
				h.push('</td>');
			}
			h.push('</tr>');
		}
	},


	/**
	 * @param {string[]} h list of html-strings to add new contend to
	 */
	createSuggestionLine: (h) => {
		const Guesses = Negotiation.Guesses;
		const GuessesSuggestions = Negotiation.GuessesSuggestions;

		const nextRoundSuggestion = GuessesSuggestions[Guesses.length];
		if (nextRoundSuggestion) {

			// berechne einen Farbwert für die Wahrscheinlichkeit dass man mit dem Gewinnt
			let colorStyle = '';
			if (Negotiation.CurrentTable) {
				const colors = [
					[255,   0, 0], // Rot
					[255, 165, 0], // Orange
					[  0, 255, 0], // Grün
				];
				const c = Negotiation.CurrentTable.c;

				let mix = c/100*(colors.length-1);
				const colorIdx = Math.floor(mix);
				// mix soll ein Wert zwischen 0 und 1 sein
				mix -= colorIdx;

				let colorVal = '';
				if (colorIdx+1 < colors.length) {
					const color1 = colors[colorIdx];
					const color2 = colors[colorIdx+1];
					const invMix = 1-mix;
					// Lineare mischung und auf 0-255 beschrenken
					const colorR = Math.min(255, Math.max(0, MainParser.round(color1[0]*invMix + color2[0]*mix)));
					const colorG = Math.min(255, Math.max(0, MainParser.round(color1[1]*invMix + color2[1]*mix)));
					const colorB = Math.min(255, Math.max(0, MainParser.round(color1[2]*invMix + color2[2]*mix)));

					colorVal = `rgba(${colorR}, ${colorG}, ${colorB}, 0.3)`;
				} else {
					const color = colors[colorIdx];
					colorVal = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.3)`;
				}

				colorStyle = ` style="background-image: linear-gradient(transparent, ${colorVal})"`;
			}

			h.push(`<tr class="suggestion"${colorStyle}>`);

			for (let place = 0; place < Negotiation.PlaceCount; place++) {
				const slotSugestion = nextRoundSuggestion[place];
				const good_id = slotSugestion ? slotSugestion.resourceId : 'empty';

				if (slotSugestion) {
					h.push('<td class="text-center">');
					h.push(`<span class="goods-sprite ${good_id}"></span>`);
					h.push(`<span class="numberIcon" title="${HTML.i18nReplacer(i18n("Boxes.Negotiation.KeyboardTooltip"), {place: place + 1, slot: (slotSugestion.id+1) % 10})}">${place+1} ${(slotSugestion.id+1) % 10}</span>`);
					h.push('</td>');
				} else {
					h.push('<td>&nbsp;</td>');
				}
			}

			h.push('</tr>');
		}
	},


	/**
	 * @param {string[]} h list of html-strings to add new contend to
	 */
	createMissmatchLine: (h) => {
		const Guesses = Negotiation.Guesses;
		const GuessesSuggestions = Negotiation.GuessesSuggestions;

		const tryNumber = Guesses.length-1;
		if (tryNumber < 0) return;

		const guess = Guesses[tryNumber];
		const suggestion = GuessesSuggestions[tryNumber];

		h.push('<tr class="guess goods-opacity">');
		for (let place = 0; place < Negotiation.PlaceCount; place++) {
			const SlotGuess = guess[place];
			const SlotSugestion = suggestion ? suggestion[place] : null;
			const missmatch = !SlotGuess || SlotSugestion !== SlotGuess.good ? ' missmatch' : '';
			const good_id = SlotSugestion ? SlotSugestion.resourceId : 'empty';
			h.push(`<td class="text-center">`);
			h.push(`<span class="goods-sprite ${good_id}${missmatch}"></span>`);
			h.push('</td>');
		}
		h.push('</tr>');
	},


	createPossibleItemsLine: (h) => {
		h.push('<tr>');

		const GoodsOrdered = Negotiation.GoodsOrdered;

		for (let place = 0; place < Negotiation.PlaceCount; place++) {
			h.push('<td class="text-center">');

			for (let good of GoodsOrdered) {
				if (good.canOccur.includes(place)) {
					const hasToOccurClass = good.hasToOccur > 0 ? ' hasToOccur' : '';
					h.push(`<span class="goods-sprite multiple ${good.resourceId}${hasToOccurClass}"></span>`);
				}
			}
			h.push('</td>');
		}

		h.push('</tr>');
	},


	confirmGoodsMissmatch: () => {
		Negotiation.Message = null;
		Negotiation.NeedGoodMissmatchConfirm = false;
		Negotiation.CalcBody();
	},


	/**
	 * Chancen Berechnung aus den Files
	 *
	 * @param {FoE_Class_NegotiationGame|{__class__: "Error"}} responseData
	 * @param {number} [forcedTryCount]
	 */
	StartNegotiation: (responseData, forcedTryCount) => {
		if (responseData.context === Negotiation.CONST_Context_GBG) {
			if (! $('#negotiation-Btn').hasClass('hud-btn-red')) {
				$('#negotiation-Btn').addClass('hud-btn-red');
				_menu.toolTipp('#negotiation-Btn', i18n('Menu.Negotiation.Title'), '<em id="negotiation-Btn-closed" class="tooltip-error">' + i18n('Menu.Negotiation.Warning') + '<br></em>' + i18n('Menu.Negotiation.Desc'));
			}
			return; //No Negotiation helper for GBG
		}

		Negotiation.StartNegotiationBackupData = responseData;

		if (responseData.__class__ === "Error") return;

		if ($('#negotiation-Btn').hasClass('hud-btn-red')) {
			$('#negotiation-Btn').removeClass('hud-btn-red');
			$('#negotiation-Btn-closed').remove();
		}

		Negotiation.CurrentTry = 1;
		Negotiation.Message = null;
		Negotiation.WrongGoodsSelected = false;
		Negotiation.NeedGoodMissmatchConfirm = false;
		const PlaceCount = Negotiation.PlaceCount;

		let negotiationResources = responseData.possibleCosts.resources;

		const GoodsOrdered = [];
		Negotiation.GoodsOrdered = GoodsOrdered;

		for (let good_id in negotiationResources) {
			if (!negotiationResources.hasOwnProperty(good_id)) continue;

			GoodsOrdered.push({
				id: -1, // wird im nächsten schritt bestimmt
				resourceId: good_id,
				plannedPos: -1, // wird im übernächsten schritt bestimmt
				canOccur: [...new Array(PlaceCount).keys()], // alle plätze sind noch möglich
				hasToOccur: 0, // muss momentan nicht auftauchen
				amount: negotiationResources[good_id], // menge der Resource pro angebot
				value: Negotiation.GetGoodValue(good_id) // wert für prioritäts-reihenfolge
			});
		}
		Negotiation.GoodCount = GoodsOrdered.length;

		// Sortiere, nach auswahl Knopf reihenfolge
		GoodsOrdered.sort((a,b) => Negotiation.goodButtonCompare(a.resourceId, b.resourceId));
		// und weise Knopf-Nummer als id zu
		GoodsOrdered.forEach((elem, i) => elem.id = i);

		// Sortiere nun nach Plan reihenfolge
		GoodsOrdered.sort((goodA, goodB) => goodA.value - goodB.value);
		// und weise die Position als plannedPos zu
		GoodsOrdered.forEach((elem, i) => elem.plannedPos = i);

		Negotiation.updateInitialPermutation();

		// Setze die Korrekte Versuchs-anzahl
		if (forcedTryCount != null) {
			Negotiation.TryCount = forcedTryCount;
		}
		else {
			Negotiation.TryCount = ResourceStock['negotiation_game_turn'];
		}
		if (Negotiation.TryCount > 5) {
			Negotiation.TryCountIsGreaterThan5 = true;
			Negotiation.TryCount = 5;
		}

		Negotiation.Guesses = [];
		Negotiation.GuessesSuggestions = [];

		let tableName = Negotiation.GetTableName(Negotiation.TryCount, Negotiation.GoodCount);
		Negotiation.GetTable(tableName)
			.then(table => {
				Negotiation.CurrentTable = table;

				if (table) {
					Negotiation.updateNextGuess();
				}

				Negotiation.RefreshBox();
				if (Settings.GetSetting('AutomaticNegotiation') && $('#negotiationBox').length === 0) {
					Negotiation.Show();
				}
			})
		;
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
		// Erstelle eine neue Rate-Zeile default "match": 0(Korrekt)
		/** @type {Negotiation_SlotGuessInfo[]} */
		const CurrentGuess = [...new Array(Negotiation.PlaceCount).keys()].map(() => ({good: null, match: 0}));
		Negotiation.Guesses.push(CurrentGuess);
		const OldSuggestions = Negotiation.GuessesSuggestions[currentTry - 1];
		let Result = 0;

		let numFreeSlots = 0;
		for (let data of SlotData) {

			const State      = data.state;
			const ResourceId = data.resourceId;
			const SlotID     = data.slotId || 0;
			const oldSlotGuess = CurrentGuess[SlotID];

			const goodInfo = GoodsOrdered.find(info => info.resourceId === ResourceId);
			if (goodInfo == null) {
				console.error(`Invalid good recived for slot ${SlotID}: ${ResourceId}`);
				continue;
			};

			// wenn die Belegung nicht mit dem Vorschlag übereinstimmt,
			// wird sie angepasst und eine neue Tabelle muss gesucht werden
			if (!OldSuggestions || goodInfo !== OldSuggestions[SlotID]) {
				Result = -1;
			}
			CurrentGuess[SlotID].good = goodInfo;

			// Entferne diesen Verhandlungspartner aus der Liste der möglichen plätze für dieses Gut.
			goodInfo.canOccur = goodInfo.canOccur.filter(elem => elem !== SlotID);

			if (State === 'correct') {
				oldSlotGuess.match = 0; /* korrekt */
				if (goodInfo.hasToOccur < currentTry) {
					goodInfo.hasToOccur = 0;
				}
				for (let info of GoodsOrdered) {
					info.canOccur = info.canOccur.filter(elem => elem !== SlotID);
				}
			} else if (State === 'wrong_person') {
				oldSlotGuess.match = 1; /* falsche Person */
				goodInfo.hasToOccur = currentTry;
				numFreeSlots++;
			} else {
				oldSlotGuess.match = 2; /* ganz falsch */
				goodInfo.canOccur = [];
				goodInfo.hasToOccur = 0;
				numFreeSlots++;
			}
		}

		// Wieviele verschiedene Güter müssen noch auftauchen
		let numGoodsHaveToOccur = 0;
		for (let good of GoodsOrdered) {
			if (good.hasToOccur>0) {
				numGoodsHaveToOccur++;
				// wenn der Platz bekannt ist, update diese Information
				if (good.canOccur.length === 1) {
					Negotiation.updateKnownPosition(good);
				}
			}
		}
		// wenn so viele Güter auftauchen müssen, wie Plätze frei sind, können die restlichen Güter nicht mehr auftauchen
		if (numFreeSlots === numGoodsHaveToOccur) {
			for (let i = 0; i < GoodsOrdered.length; i++) {
				const good = GoodsOrdered[i];
				if (good.hasToOccur === 0) {
					good.canOccur = [];
				}
			}
		}

		if (Result === -1 && Negotiation.findMatchingPermutation()) {
			Result = 0;
		}

		Negotiation.CurrentTry = currentTry+1;

		if (numFreeSlots === 0) {
			// Verhandlung erfolgreich abgeschlossen
			Negotiation.CurrentTry = 0;
			Negotiation.CurrentTable = null;
			Negotiation.Message = i18n('Boxes.Negotiation.Success');
			Negotiation.MessageClass = 'success';

			if (Settings.GetSetting('AutomaticNegotiation') && $('#negotiationBox').length > 0) {
				$('#negotiationBox').fadeToggle(function () {
					$(this).remove();
				});
			}
		} else if (Result === -1) {
			if (Negotiation.CurrentTable) {
				// keine Tabelle mehr zum abarbeiten da
				Negotiation.CurrentTable = null;
				Negotiation.Message = `${i18n('Boxes.Negotiation.WrongGoods')} <button class="btn" onclick="Negotiation.confirmGoodsMissmatch()">${i18n('Boxes.Negotiation.confirmGoodsMissmatch')}</button>`;
				Negotiation.MessageClass = 'danger';
				Negotiation.WrongGoodsSelected = true;
				Negotiation.NeedGoodMissmatchConfirm = true;
			}
		} else if (currentTry >= Negotiation.TryCount) {
			// Versuche aufgebraucht
			Negotiation.CurrentTable = null;
			Negotiation.Message = i18n('Boxes.Negotiation.TryEnd');
			if (Negotiation.TryCountIsGreaterThan5)
			Negotiation.Message = i18n('Boxes.Negotiation.TryContinue');
			Negotiation.MessageClass = 'warning';

		} else if (Negotiation.CurrentTable) {
			// Verhandlung geht weiter
			const PlaceMutation = Negotiation.PlaceMutation;
			let continuationCode = 0;
			for (let i = 0; i < 5; i++) {
				continuationCode *= 4;
				continuationCode += CurrentGuess[PlaceMutation[i]].match;
			}
			Negotiation.CurrentTable = Negotiation.CurrentTable.r[continuationCode];

			Negotiation.updateNextGuess();
		}

		Negotiation.RefreshBox();
	},


	/**
	 * Verhandlung zu Ende
	 *
	 */
	ExitNegotiation: () => {
		Negotiation.CurrentTry = 0;
		Negotiation.CurrentTable = null;
		Negotiation.Message = i18n('Boxes.Negotiation.Canceled');
		Negotiation.MessageClass = 'danger';

		Negotiation.RefreshBox();

		if(Settings.GetSetting('AutomaticNegotiation') && $('#negotiationBox').length > 0){
			$('#negotiationBox').fadeToggle(function(){
				$(this).remove();
			});
		}
	},


	goodButtonCompare: (goodA, goodB) => {
		function goodValue(good) {
			const data = GoodsData[good];
			if (data.era === 'AllAge') return 100;
			const special = !!data.abilities.specialResource;
			const era = Technologies.Eras[data.era];
			return (era === 0 ? 200 : era ) + (special ? 400 : 0);
		}

		if (goodA === goodB) return 0;
		const valA = goodValue(goodA);
		const valB = goodValue(goodB);

		if (valA === valB) return goodA > goodB ? 1 : -1
		return valA - valB;
	},


	/**
	 * @param {Negotiation_GoodData} good
	 */
	updateKnownPosition: good => {
		if (good.hasToOccur === 0 || good.canOccur.length !== 1) return;
		const fixedPlace = good.canOccur[0];
		for (let otherGood of Negotiation.GoodsOrdered) {
			if (otherGood !== good) {
				const oldCanOccurLength = otherGood.canOccur.length;
				otherGood.canOccur = otherGood.canOccur.filter(place => place !== fixedPlace);
				// hat sich was geändert?
				if (oldCanOccurLength != otherGood.canOccur.length) {
					// Rekursiver aufruf, um alle dadurch eindeutigen Güter zu plazieren
					Negotiation.updateKnownPosition(otherGood);
				}
			}
		}
	},


	updateNextGuess: () => {
		if (!Negotiation.CurrentTable) return;
		const GoodsOrdered = Negotiation.GoodsOrdered;
		const PlaceMutation = Negotiation.PlaceMutation;
		const gu = Negotiation.CurrentTable.gu;

		/** @type {(Negotiation_GoodData|null)[]} */
		const GuessesSuggestion = [];

		for (let i = 0; i < gu.length; i++) {
			GuessesSuggestion[PlaceMutation[i]] = gu[i] === 255 ? null : GoodsOrdered[gu[i]];
		}
		Negotiation.GuessesSuggestions[Negotiation.CurrentTry-1] = GuessesSuggestion;
	},


	updateInitialPermutation: () => {
		if (Negotiation.CurrentTry !== 1) {
			console.error('ERROR: Negotiation.updateInitialPermutation got called when not in first turn.');
			return;
		}
		const PlaceCount = Negotiation.PlaceCount;
		const GoodsOrdered = Negotiation.GoodsOrdered;

		Negotiation.PlaceMutation =
			[...new Array(PlaceCount).keys()]
			.sort((a,b) => {
				if (a === b) return 0;
				const valA = a < GoodsOrdered.length ? GoodsOrdered[a].id : 255;
				const valB = b < GoodsOrdered.length ? GoodsOrdered[b].id : 255;
				return valA - valB;
			})
			// invertiere das mapping von "Platz zu Tabellenplatz" zu "Tabellenplatz zu Platz"
			.map((v, i) => [v, i])
			.sort((a,b) => a[0] - b[0])
			.map(([v, i]) => i)
		;
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
			const tableGoodMapped = new Array(GoodsOrdered.length).fill(false);
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
					// result für die Verfolgung der weiteren Runden berechnen
					result = result*4 + SlotGuess.match;

					const guessGood = table.gu[place];
					// Überspringe den Slot, wenn er bereits erledigt ist
					if (guessGood === 255) continue;

					const usedGood = SlotGuess.good.id;
					const goodMapped = goodMap[usedGood];

					if (goodMapped === 255 && !tableGoodMapped[guessGood]) {
						// Gut wurde noch nicht zugeordnet
						goodMap[usedGood] = guessGood;
						tableGoodMapped[guessGood] = true;

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
	 * Name zusammen setzen
	 *
	 * @param TryCount
	 * @param GoodCount
	 * @returns {string}
	 */
	GetTableName: (TryCount, GoodCount) => {
		return TryCount + '_' + GoodCount;
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
			let SaveMedalSetting = localStorage.getItem('NegotiationSaveMedals');
			if (SaveMedalSetting === 'false') { // default true
				Value = 75;
			}
			else
			{
				Value = 3000;
            }
		}
		else if (GoodName === 'promethium') {
			Value = 3500;
		}
		else if (GoodName === 'orichalcum') {
			Value = 4000;
		}
		else {
			let SaveMedalSetting = localStorage.getItem('NegotiationSaveCurrentEraGoods');
			if (SaveMedalSetting === 'false') { // default true
				Value = 100;
			}
			else {
				let Good = GoodsData[GoodName];
				let Era = Good['era'];

				let EraID = Technologies.Eras[Era];
				if (EraID === undefined) EraID = 20;

				Value = EraID * 100;
            }

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
	 * @param {string} tableName Name der zu ladenden Tabelle
	 */
	GetTable: (tableName) => {

		// gibt es noch nicht, laden
		if (Negotiation.Tables[tableName] === undefined) {
			let url = extUrl + 'js/web/negotiation/tables/';

			return fetch(url + tableName + '.zip')
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
					return zip.file(tableName + ".json").async("uint8array");
				})
				.then((/** @type {Uint8Array} */content) => {
					const table = JSON.parse(new TextDecoder().decode(content));
					Negotiation.Tables[tableName] = table;
					return table;
				})
				.catch(err => {console.error(err); return null;})
			;
		} else {
			// bereits geladen
			return Promise.resolve(Negotiation.Tables[tableName]);
		}
	},
	timeout:null,
	tempStore:null,
};

// --------------------------------------------------------------------------------------------------
// Negotiation

FoEproxy.addHandler('all','all', (data, postData) => {
	if (data.requestMethod === "startNegotiation") {
	
		Negotiation.tempStore = data.responseData;
		Negotiation.timeout = setTimeout(() => {
			clearTimeout(Negotiation.timeout);
			Negotiation.timeout=null;
			Negotiation.StartNegotiation(/** @type {FoE_Class_NegotiationGame} **/ (Negotiation.tempStore) );
			Negotiation.tempStore=null
		}, 200);	
		return
	}
	if ($('#negotiationBox').length == 0) return
	if (data.requestClass === 'NegotiationGameService' && data.requestMethod === 'submitTurn') {
		Negotiation.SubmitTurn(/** @type {FoE_Class_NegotiationGameResult} **/ (data.responseData) );
		return
	}
	if (!(
		[
			"RankingService",
			"QuestService",
			"ResourceService",
			"ResourceShopService",
			"TimeService", 
			"MessageService", 
			"WorldChallengeService", 
			"AutoAidService", 
			"TrackingService", 
			"AnnouncementService",
			"InventoryService",
			"GuildExpeditionNotificationService",
			"FriendsTavernService"
		].includes(data.requestClass) ||
		data.requestMethod === 'markContributionNotificationsRead'
	)) {
		Negotiation.ExitNegotiation()
	}
});
FoEproxy.addFoeHelperHandler('ResourcesUpdated', () => {
	if (Negotiation.timeout) {
		clearTimeout(Negotiation.timeout);
		Negotiation.timeout=null;
		Negotiation.StartNegotiation(/** @type {FoE_Class_NegotiationGame} **/ (Negotiation.tempStore) );
		Negotiation.tempStore=null
		return
	}	
});
// --------------------------------------------------------------------------------------------------
// Negotiation DEBUGGER

let NegotiationDebugger = {
	data: {
		numGoods: 3,
		numTries: 3,
		goods: [],
		selected: -1,
		submitGoods: [],
		submitValue: []
	},

	Selectables: [
		{text: 'Match',     value:  0, selectedColor: 'rgba( 50,255, 50, 0.4)'},
		{text: 'Wrong Pos', value:  1, selectedColor: 'rgba(255,255, 50, 0.4)'},
		{text: 'Wrong',     value:  2, selectedColor: 'rgba(255, 50, 50, 0.4)'},
		{text: 'Done',      value: -1, selectedColor: 'none'},
	],

	Show: function() {
		if ($('#negotiationDebuggerBox').length === 0) {

			// Box in den DOM
			HTML.Box({
				'id': 'negotiationDebuggerBox',
				'title': i18n('Boxes.Negotiation.Title'),
				'minimize': true,
				'dragdrop': true,
				'resize': true,
				'saveCords': false,
				'auto_close': true
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('negotiation');

			NegotiationDebugger.BuildBox();
		} else {
			HTML.CloseOpenBox('negotiationDebuggerBox');
		}
	},

	BuildBox: () => {
		const Selectables = NegotiationDebugger.Selectables;
		const h = [];
		const goodSpriteClass = good_id => {
			return `goods-sprite ${good_id}`;
		};

		const data = NegotiationDebugger.data;

		h.push('<label>Num Goods: <select id="NegotiationDebuggerNumGoods" onchange="NegotiationDebugger.updateNumbers()">');
		for (let i = 3; i <= 10; i++) {
			h.push(`<option value="${i}"${i===data.numGoods ? ' selected':''}>${i} Goods</option>`);
		}
		h.push('</select></label>');

		h.push('<label>Num Tries: <select id="NegotiationDebuggerNumTries" onchange="NegotiationDebugger.updateNumbers()">');
		for (let i = 3; i <= 4; i++) {
			h.push(`<option value="${i}"${i===data.numTries ? ' selected':''}>${i} Tries</option>`);
		}
		h.push('</select></label>');
		h.push('<button onclick="NegotiationDebugger.start()">Start</button>');
		h.push(`Always show Possible Matches: <input type="checkbox" onchange="NegotiationDebugger.changeAlwaysShowPossibleMatch(this)"${Negotiation.ContinueListing?' checked':''} />`);


		h.push('<div style="display:grid; grid-template-columns: repeat(auto-fill, 60px);">');
		const numGoods = data.numGoods;
		for (let i = 0; i < numGoods; i++) {
			let good = data.goods[i] || 'empty';

			h.push(`<div>Good ${i+1}:<br/><span onclick="NegotiationDebugger.selectGoodFor(${i})" style="box-sizing: border-box;width: 40px${data.selected===i?'; border: 1px solid red':''}" class="${goodSpriteClass(good)}"></span></div>`);
		}
		h.push('</div>');

		if (data.selected >= 0) {
			h.push('<div style="display: grid; grid-template-columns: repeat(auto-fill, 40px);background-color: rgba(200,200,200,0.4);border: 1px solid rgb(243, 214, 160);margin:5px;">');
			for (let goodData of GoodsList) {
				let good = goodData.id || 'empty';
				h.push(`<span onclick="NegotiationDebugger.selectGood('${good}')" style="box-sizing: border-box;width: 40px${data.goods[data.selected]===good?'; border: 1px solid red':''}" class="${goodSpriteClass(good)}"></span>`);
			}
			for (let good of ['money', 'supplies','medals']) {
				h.push(`<span onclick="NegotiationDebugger.selectGood('${good}')" style="box-sizing: border-box;width: 40px${data.goods[data.selected]===good?'; border: 1px solid red':''}" class="${goodSpriteClass(good)}"></span>`);
			}
			h.push('</div>');
		}

		h.push(`<hr/><div style="display:flex;flex-direction:row">`);
		for (let pos = 0; pos < 5; pos++) {
			h.push(`<div style="flex-grow:1">`);
			h.push(`Position ${pos}:<br/>`);

			h.push(`<div style="display: grid; grid-template-columns: repeat(auto-fill, 40px);">`);
			for (let i = 0; i < numGoods; i++) {
				let good = data.goods[i] || 'empty';
				const selected = good === data.submitGoods[pos];

				h.push(`<span onclick="NegotiationDebugger.selectGoodForSubmit(${pos}, ${i})" style="box-sizing: border-box;width: 40px${selected?'; border: 1px solid red':''}" class="${goodSpriteClass(good)}"></span> `);
			}
			h.push(`</div>`);


			let selectedValue = data.submitValue[pos]
			if (selectedValue == null) selectedValue = Selectables[Selectables.length-1].value;
			for (let selectable of Selectables) {
				const checked = selectable.value === selectedValue ? ` checked` : '';
				const checkedStyle = selectable.value === selectedValue ? ` style="background-color: ${selectable.selectedColor};"` : '';
				h.push(
					`<label${checkedStyle}>`
					+ `${selectable.text}: `
					+ `<input onchange="NegotiationDebugger.selectableValueChange(${pos}, this)" type="radio" name="NegotiationDebugger_Submit${pos}" value="${selectable.value}"${checked}/>`
					+ `</label><br/>`
				);
			}
			h.push(`</div>`);
		}
		h.push(`</div>`);
		h.push('<button onclick="NegotiationDebugger.submit()">Submit</button>');

		$('#negotiationDebuggerBoxBody').html(h.join(''));
	},

	/**
	 * @param {HTMLInputElement} checkbox
	 */
	changeAlwaysShowPossibleMatch: (checkbox) => {
		Negotiation.ContinueListing = checkbox.checked;
		Negotiation.BuildBox();
	},

	/**
	 * @param {number} position
	 * @param {HTMLInputElement} radioBox
	 */
	selectableValueChange: (position, radioBox) => {
		const values = NegotiationDebugger.data.submitValue;
		if (radioBox.checked) {
			values[position] = Number.parseInt(radioBox.value);
			NegotiationDebugger.BuildBox();
		}
	},

	updateNumbers: () => {
		const data = NegotiationDebugger.data;
		data.selected = -1;
		// @ts-ignore
		data.numGoods = Number.parseInt(document.getElementById('NegotiationDebuggerNumGoods').value);
		// @ts-ignore
		data.numTries = Number.parseInt(document.getElementById('NegotiationDebuggerNumTries').value);
		NegotiationDebugger.BuildBox();
	},

	selectGoodFor: i => {
		const data = NegotiationDebugger.data;
		data.selected = i;
		NegotiationDebugger.BuildBox();
	},

	selectGood: id => {
		const data = NegotiationDebugger.data;
		if (data.selected < 0) return;
		data.goods[data.selected] = id;
		NegotiationDebugger.BuildBox();
	},

	selectGoodForSubmit: (pos, i) => {
		const data = NegotiationDebugger.data;
		data.submitGoods[pos] = data.goods[i];
		NegotiationDebugger.BuildBox();
	},

	start: () => {

		const data = NegotiationDebugger.data;
		data.selected = -1;
		const goodList = [];

		for (let i = 0; i < data.numGoods; i++) {
			goodList.push([data.goods[i]||'money', 1]);
		}

		try {
			Negotiation.StartNegotiation({
					"context": Negotiation.CONST_Context_GE,
					"possibleCosts": {
						"resources": Object.fromEntries(goodList.sort((a,b)=>a[0]>b[0]?1:-1)),
						"__class__": "Resources"
					},
					"__class__": "NegotiationGame"
				},
				data.numTries
			);
		} catch (err) {
			console.error(err);
		}
		NegotiationDebugger.BuildBox();
	},

	submit: () => {

		const slots = [];
		const data = NegotiationDebugger.data;

		let won = true;

		for (let pos = 0; pos < 5; pos++) {
			// @ts-ignore
			const val = Number.parseInt(document.querySelector('input[name=NegotiationDebugger_Submit'+pos+']:checked').value);
			if (val >= 0) {
				if (val !== 0) won = false;
				/** @type {"correct" | "wrong_person" | "not_needed"} */
				const state = val === 0 ? 'correct' : val === 1 ? 'wrong_person' : 'not_needed';

				/** @type {FoE_Class_NegotiationGameSlotResult} */
				const entrie = {
					"slotId": /** @type{1|2|3|4}*/(pos),
					"resourceId": data.submitGoods[pos]||'money',
					"state": state,
					"__class__": "NegotiationGameSlotResult"
				};

				if (pos === 0) {
					delete entrie.slotId;
				}

				slots.push(entrie);
			}
		}

		try {
			Negotiation.SubmitTurn(/** @type {FoE_Class_NegotiationGameResult}*/({
				"state": won ? 'won': 'ongoing',
				"turnResult": {
					"slots": slots,
					"__class__": "NegotiationGameTurnResult"
				}, "__class__": "NegotiationGameResult"
			}));
		} catch (err) {
			console.error(err);
		}

		data.submitGoods = [];
		data.submitValue = [];

		NegotiationDebugger.BuildBox();
	}
};
