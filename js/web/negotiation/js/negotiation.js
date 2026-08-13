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
 * @typedef {Object} Negotiation_BookNode compact opening-book node (distilled from the old solution tables)
 * @property {number} c win chance in percent when following the book
 * @property {number[]} go expected offer count per good (priority index)
 * @property {number[]} gu suggested good (priority index) per slot column, 255 = slot already solved
 * @property {Record<string, Negotiation_BookNode>} [r] children per base-4 feedback code
 */

/**
 * @typedef {Object} Negotiation_GoodData
 * @property {number} id fixed sequential number for each good of the negotiation starting at 0, sorted by associated hotkey number ('0' = 10)
 * @property {string} resourceId id of the resource in the game
 * @property {number} plannedPos position in the priority order (equals the index in GoodsOrdered)
 * @property {number[]} canOccur slots on which this good can still be demanded (derived from the tracked state)
 * @property {number} hasToOccur >0 when the good is demanded in every still-possible assignment
 * @property {number} amount amount of the good needed per offer
 * @property {number} value value of the good, used to sort the goods by priority (cheap first)
 */

/**
 * @typedef {Object} Negotiation_SlotGuessInfo
 * @property {Negotiation_GoodData|null} good the good that was offered
 * @property {0|1|2} match the answer to the offer: 0 correct, 1 wrong person, 2 not needed
 */


let Negotiation = {
	CurrentTry: 0,
	TryCount: /** @type {undefined|number} */ (undefined),
	GoodCount: /** @type {undefined|number} */ (undefined),
	// goods in priority order (cheap first); the index in this list is the
	// good index used by the solver and the opening book
	GoodsOrdered: /** @type {Negotiation_GoodData[]} */ ([]),
	Guesses: /** @type {Negotiation_SlotGuessInfo[][]} */ ([]),
	GuessesSuggestions: /** @type {(Negotiation_GoodData|null)[][]} */ ([]),
	PlaceCount: 5,
	Message: undefined,
	MessageClass: 'warning',
	SortableObj: null,

	StartNegotiationBackupData: undefined,

	// opening book (lazy loaded): undefined = not loaded yet, null = load failed
	Book: /** @type {undefined|null|Object<string, Negotiation_BookNode>} */ (undefined),
	// current node while the played line is still covered by the book
	BookNode: /** @type {Negotiation_BookNode|null} */ (null),
	// mapping actual good index -> book good index, -1 while not yet pinned;
	// this absorbs user deviations that only permute the goods
	BookMap: /** @type {number[]} */ ([]),
	// exact set of still-consistent demand assignments over the open slots
	Assigns: /** @type {Int32Array|null} */ (null),
	OpenSlots: /** @type {number[]} */ ([]),
	SolverObj: /** @type {null|InstanceType<typeof NegotiationSolver.Solver>} */ (null),
	// what to render: win chance (percent or null) and expected consumption
	View: /** @type {null|{c: number|null, go: number[]|null}} */ (null),
	// above this state size the exact search hands over to book/heuristic
	LIVE_LIMIT: 250,

	// pending startNegotiation response, flushed by timeout or ResourcesUpdated
	timeout: null,
	tempStore: null,

	CONST_Context_GE: 'guildExpedition',
	CONST_Context_GBG: 'guildBattleground',


	/**
	 * Put the box into the DOM
	 */
	Show: () => {
		if ($('#negotiationBox').length === 0) {
			HTML.Box({
				id: 'negotiationBox',
				title: i18n('Boxes.Negotiation.Title'),
				ask: i18n('Boxes.Negotiation.HelpLink'),
				auto_close: true,
				minimize: true,
				dragdrop: true,
				settings: () => Negotiation.ShowSettings(),
			});

			HTML.AddCssFile('negotiation');

			$('#negotiationBox').on('click', '.negotation-setting', function () {
				const $this = $(this);
				localStorage.setItem($this.data('id'), $this.prop('checked'));

				setTimeout(() => {
					Negotiation.StartNegotiation(Negotiation.StartNegotiationBackupData);
				}, 150);
			});
		} else {
			HTML.CloseOpenBox('negotiationBox');
		}

		Negotiation.BuildBox();
	},


	/**
	 * Build the body of the box
	 */
	BuildBox: () => {
		Negotiation.CalcBody();
	},


	/**
	 * Refresh the body of the box if it is already open
	 */
	RefreshBox: () => {
		if ($('#negotiationBox').length > 0) {
			Negotiation.CalcBody();
		}
	},


	/**
	 * Render the box content: settings, win chance, expected consumption,
	 * past guesses, the suggestion for the next round and stock warnings
	 */
	CalcBody: () => {
		const CurrentTry = Negotiation.CurrentTry;
		const Guesses = Negotiation.Guesses;
		const View = Negotiation.View;
		const h = [];
		let StockState = 0;

		h.push('<table class="foe-table no-hover">');

		if (View !== null) {
			const sceg = localStorage.getItem('NegotiationSaveCurrentEraGoods');
			const sm = localStorage.getItem('NegotiationSaveMedals');

			h.push('<thead class="dark-bg">');
			h.push('<tr>');
			if (CurrentTry === 1) {
				h.push(`<th colspan="2"><label class="game-cursor" for="NegotiationSaveCurrentEraGoods">${i18n('Boxes.Negotiation.SaveCurrentEraGoods')}<input id="NegotiationSaveCurrentEraGoods" class="negotation-setting game-cursor" type="checkbox" data-id="NegotiationSaveCurrentEraGoods"${(sceg === null || sceg === 'true') ? ' checked' : ''}></label></th>`);
				h.push(`<th><label class="game-cursor" for="NegotiationSaveMedals">${i18n('Boxes.Negotiation.SaveMedals')}<input id="NegotiationSaveMedals" class="negotation-setting game-cursor" type="checkbox" data-id="NegotiationSaveMedals"${(sm === null || sm === 'true') ? ' checked' : ''}></label></th>`);
			}
			h.push(`<th class="text-right" colspan="${CurrentTry === 1 ? '2' : '5'}"><strong class="text-warning">`);
			if (View.c != null) {
				h.push(`${i18n('Boxes.Negotiation.Chance')}: ${HTML.Format(MainParser.round(View.c))}% - `);
			}
			h.push(`<b style="padding-right: 15px"> ${i18n('Boxes.Negotiation.Round')} ${Guesses.length + 1}/${Negotiation.TryCount}</b>`);
			h.push('</strong></th>');
			h.push('</tr>');
			h.push('</thead>');

			h.push('<tbody>');
			h.push('<tr>');
			h.push(`<td class="text-warning">${i18n('Boxes.Negotiation.Average')}</td>`);
			h.push(`<td colspan="4"><div id="good-sort"${CurrentTry === 1 ? ' class="goods-dragable"' : ''}>`);

			const GoodsOrdered = Negotiation.GoodsOrdered;
			for (let i = 0; i < Negotiation.GoodCount; i++) {
				const GoodInfo = GoodsOrdered[i];
				const GoodName = GoodInfo.resourceId;
				const maxRequired = GoodInfo.canOccur.length * GoodInfo.amount;
				const Stock = ResourceStock[GoodName] || 0;
				let GoodAmount = GoodInfo.amount * (View.go != null ? View.go[i] : GoodInfo.canOccur.length);
				let TextClass;

				if (Stock < GoodAmount) {
					TextClass = 'danger';
					StockState = Math.max(StockState, 2);
				} else if (Stock < maxRequired) {
					TextClass = 'warning';
					StockState = Math.max(StockState, 1);
				} else {
					TextClass = 'success';
				}

				if (GoodName === 'money' || GoodName === 'supplies' || GoodName === 'medals') {
					GoodAmount = MainParser.round(GoodAmount);
				} else {
					GoodAmount = MainParser.round(GoodAmount * 10) / 10;
				}

				h.push(`<div class="good" data-slug="${GoodName}" title="${HTML.i18nTooltip(i18n('Boxes.Negotiation.Stock'))} ${HTML.Format(Stock)}">` +
					`<span class="goods-sprite ${GoodName}"></span><br>` +
					`<span class="text-${TextClass}">${HTML.Format(GoodAmount)}</span>` +
					'</div>');
			}

			h.push('</div></td>');
			h.push('</tr>');

			if (CurrentTry === 1) {
				h.push(`<tr><td colspan="5" class="text-center"><small>${i18n('Boxes.Negotiation.DragDrop')}</small></td></tr>`);
			}
		}

		// negotiation partner headings
		h.push('<tr class="thead">');
		for (let i = 0; i < Negotiation.PlaceCount; i++) {
			h.push(`<th class="text-center">${i18n('Boxes.Negotiation.Person')} ${i + 1}</th>`);
		}
		h.push('</tr></tbody>');

		h.push('<tbody>');
		Negotiation.createGuessLines(h);
		Negotiation.createSuggestionLine(h);
		if (View === null) {
			Negotiation.createPossibleItemsLine(h);
		}
		h.push('</tbody>');
		h.push('</table>');

		if (Negotiation.Message != null) {
			h.push(`<p class="text-center text-${Negotiation.MessageClass}"><strong>${Negotiation.Message}</strong></p>`);
		}

		if (StockState === 1) {
			h.push(`<p class="text-center text-warning"><strong>${i18n('Boxes.Negotiation.GoodsLow')}</strong></p>`);
		} else if (StockState === 2) {
			h.push(`<p class="text-center text-danger"><strong>${i18n('Boxes.Negotiation.GoodsCritical')}</strong></p>`);
		}

		$('#negotiationBoxBody').html(h.join('')).promise().done(() => {
			// stock via tooltip
			// @ts-ignore
			$('.good').tooltip({
				container: '#negotiationBox'
			});

			if (Negotiation.View != null && Negotiation.CurrentTry === 1) {
				// @ts-ignore
				new Sortable(document.getElementById('good-sort'), {
					animation: 150,
					ghostClass: 'good-drag',
					onEnd: () => {
						// fix for tooltips that got stuck
						$('#negotiationBox').children('.tooltip').remove();

						const oldOrdered = Negotiation.GoodsOrdered;
						Negotiation.GoodsOrdered = [];
						$('.good').each(function () {
							const resourceId = $(this).data('slug');
							Negotiation.GoodsOrdered.push(oldOrdered.find(info => info.resourceId === resourceId));
						});
						Negotiation.GoodsOrdered.forEach((elem, i) => elem.plannedPos = i);
						// the priority order defines the good indices, so the
						// tracked state has to be rebuilt from scratch
						Negotiation.resetTracking();
						Negotiation.computeView();
						Negotiation.CalcBody();
					}
				});
			}
		});
	},


	/**
	 * Render the settings panel of the box
	 */
	ShowSettings: () => {
		const autoOpen = Settings.GetSetting('AutomaticNegotiation');
		const h = [];

		h.push(`<p><label><input id="negotiationAutoOpen" type="checkbox" ${autoOpen === true ? ' checked="checked"' : ''} />${i18n('Boxes.Settings.Autostart')}</label></p>`);
		h.push(`<p><button onclick="Negotiation.SaveSettings()" id="save-negotiationAutoOpen-settings" class="btn" style="width:100%">${i18n('Boxes.Settings.Save')}</button></p>`);

		$('#negotiationBoxSettingsBox').html(h.join(''));
	},


	/**
	 * Persist the settings panel values
	 */
	SaveSettings: () => {
		localStorage.setItem('AutomaticNegotiation', $('#negotiationAutoOpen').is(':checked'));
		$('#negotiationBoxSettingsBox').remove();
	},


	/**
	 * Append one table row per already submitted round, showing the offered
	 * goods, their feedback and the suggestion they deviated from
	 *
	 * @param {string[]} h list of html-strings to add new content to
	 */
	createGuessLines: (h) => {
		const Guesses = Negotiation.Guesses;
		const GuessesSuggestions = Negotiation.GuessesSuggestions;

		for (let i = 0; i < Guesses.length; i++) {
			const Guess = Guesses[i];
			const suggestion = GuessesSuggestions[i];

			h.push('<tr class="guess goods-opacity">');
			for (let place = 0; place < Negotiation.PlaceCount; place++) {
				const SlotGuess = Guess[place];
				const slotSuggestion = suggestion ? suggestion[place] : null;
				const good_id = SlotGuess && SlotGuess.good ? SlotGuess.good.resourceId : 'empty';
				const matchStyleClass = SlotGuess.good !== null ? [' guess_match', ' guess_wrong_person', ' guess_fail'][SlotGuess.match] : '';

				h.push(`<td class="text-center${matchStyleClass}">`);
				h.push(`<span class="goods-sprite ${good_id}"></span>`);
				if (slotSuggestion) {
					const missmatch = !SlotGuess || slotSuggestion !== SlotGuess.good ? ' missmatch' : '';
					h.push(`<span class="goods-sprite cornered${missmatch} ${slotSuggestion.resourceId}"></span>`);
				}
				h.push('</td>');
			}
			h.push('</tr>');
		}
	},


	/**
	 * Append the suggestion row for the upcoming round, tinted by win chance
	 * (red = low, orange = medium, green = high)
	 *
	 * @param {string[]} h list of html-strings to add new content to
	 */
	createSuggestionLine: (h) => {
		const nextRoundSuggestion = Negotiation.GuessesSuggestions[Negotiation.Guesses.length];
		if (!nextRoundSuggestion) return;

		let colorStyle = '';
		if (Negotiation.View && Negotiation.View.c != null) {
			const colors = [
				[255,   0, 0], // red
				[255, 165, 0], // orange
				[  0, 255, 0], // green
			];
			const mix = Negotiation.View.c / 100 * (colors.length - 1);
			const idx = Math.min(Math.floor(mix), colors.length - 1);
			const from = colors[idx];
			const to = colors[Math.min(idx + 1, colors.length - 1)];
			const t = mix - idx;
			// linear blend, clamped to 0-255
			const [r, g, b] = from.map((v, i) => Math.min(255, Math.max(0, MainParser.round(v * (1 - t) + to[i] * t))));

			colorStyle = ` style="background-image: linear-gradient(transparent, rgba(${r}, ${g}, ${b}, 0.3))"`;
		}

		h.push(`<tr class="suggestion"${colorStyle}>`);
		for (let place = 0; place < Negotiation.PlaceCount; place++) {
			const slotSuggestion = nextRoundSuggestion[place];

			if (slotSuggestion) {
				// probe offer: cannot be the demanded good on this slot, but the
				// reaction to it narrows down the remaining possibilities
				const isProbe = !slotSuggestion.canOccur.includes(place);
				h.push(`<td class="text-center${isProbe ? ' probe' : ''}">`);
				h.push(`<span class="goods-sprite ${slotSuggestion.resourceId}"${isProbe ? ` title="${i18n('Boxes.Negotiation.ProbeTooltip')}"` : ''}></span>`);
				h.push(`<span class="numberIcon" title="${HTML.i18nReplacer(i18n('Boxes.Negotiation.KeyboardTooltip'), {place: place + 1, slot: (slotSuggestion.id + 1) % 10})}">${place + 1} ${(slotSuggestion.id + 1) % 10}</span>`);
				h.push('</td>');
			} else {
				h.push('<td>&nbsp;</td>');
			}
		}
		h.push('</tr>');
	},


	/**
	 * Append a row listing all goods that can still be demanded per slot
	 *
	 * @param {string[]} h list of html-strings to add new content to
	 */
	createPossibleItemsLine: (h) => {
		h.push('<tr>');
		for (let place = 0; place < Negotiation.PlaceCount; place++) {
			h.push('<td class="text-center">');
			for (const good of Negotiation.GoodsOrdered) {
				if (good.canOccur.includes(place)) {
					const hasToOccurClass = good.hasToOccur > 0 ? ' hasToOccur' : '';
					h.push(`<span class="goods-sprite multiple ${good.resourceId}${hasToOccurClass}"></span>`);
				}
			}
			h.push('</td>');
		}
		h.push('</tr>');
	},


	/**
	 * Start of a negotiation
	 *
	 * @param {FoE_Class_NegotiationGame|{__class__: "Error"}} responseData
	 * @param {number} [forcedTryCount]
	 */
	StartNegotiation: (responseData, forcedTryCount) => {
		if (responseData.context === Negotiation.CONST_Context_GBG) {
			if (!$('#negotiation-Btn').hasClass('hud-btn-red')) {
				$('#negotiation-Btn').addClass('hud-btn-red');
				_menu.toolTipp('#negotiation-Btn', i18n('Menu.Negotiation.Title'), `<em id="negotiation-Btn-closed" class="tooltip-error">${i18n('Menu.Negotiation.Warning')}<br></em>${i18n('Menu.Negotiation.Desc')}`);
			}
			return; // no negotiation helper for GBG
		}

		Negotiation.StartNegotiationBackupData = responseData;

		if (responseData.__class__ === 'Error') return;

		if ($('#negotiation-Btn').hasClass('hud-btn-red')) {
			$('#negotiation-Btn').removeClass('hud-btn-red');
			$('#negotiation-Btn-closed').remove();
		}

		Negotiation.CurrentTry = 1;
		Negotiation.Message = null;
		const PlaceCount = Negotiation.PlaceCount;

		/** @type {Negotiation_GoodData[]} */
		const GoodsOrdered = [];
		Negotiation.GoodsOrdered = GoodsOrdered;

		for (const [good_id, amount] of Object.entries(responseData.possibleCosts.resources)) {
			GoodsOrdered.push({
				id: -1, // determined in the next step
				resourceId: good_id,
				plannedPos: -1, // determined in the step after
				canOccur: [...new Array(PlaceCount).keys()], // all slots are still possible
				hasToOccur: 0,
				amount: amount, // amount of the resource per offer
				value: Negotiation.GetGoodValue(good_id) // value for the priority order
			});
		}
		Negotiation.GoodCount = GoodsOrdered.length;

		// sort by selection button order and assign the button number as id
		GoodsOrdered.sort((a, b) => Negotiation.goodButtonCompare(a.resourceId, b.resourceId));
		GoodsOrdered.forEach((elem, i) => elem.id = i);

		// now sort by priority (cheap goods first) and assign the position as plannedPos
		GoodsOrdered.sort((goodA, goodB) => goodA.value - goodB.value);
		GoodsOrdered.forEach((elem, i) => elem.plannedPos = i);

		// set the correct number of tries (no upper limit anymore)
		Negotiation.TryCount = forcedTryCount != null ? forcedTryCount : ResourceStock['negotiation_game_turn'];
		if (!Negotiation.TryCount || Negotiation.TryCount < 1) {
			Negotiation.TryCount = 3;
		}

		Negotiation.Guesses = [];
		Negotiation.GuessesSuggestions = [];

		Negotiation.resetTracking();

		Negotiation.GetBook().then(() => {
			Negotiation.computeView();
			Negotiation.RefreshBox();
			if (Settings.GetSetting('AutomaticNegotiation') && $('#negotiationBox').length === 0) {
				Negotiation.Show();
			}
		});
	},


	/**
	 * (Re-)initialize the tracked state for the current negotiation. Called on
	 * start and when the user reorders the good priorities in round 1.
	 */
	resetTracking: () => {
		const N = Negotiation.GoodCount;
		Negotiation.OpenSlots = [...new Array(Negotiation.PlaceCount).keys()];
		Negotiation.BookMap = new Array(N).fill(-1);
		Negotiation.BookNode = null;

		if (N >= 2 && N <= NegotiationSolver.MAX_GOODS) {
			Negotiation.SolverObj = new NegotiationSolver.Solver(N);
			Negotiation.Assigns = NegotiationSolver.rootAssigns(N);
		} else {
			Negotiation.SolverObj = null;
			Negotiation.Assigns = null;
		}

		if (Negotiation.Book) {
			const bookKey = Math.min(Negotiation.TryCount, 5) + '_' + N;
			Negotiation.BookNode = Negotiation.Book[bookKey] || null;
		}

		Negotiation.updateGoodMarginals();
	},


	/**
	 * A round has been submitted
	 *
	 * @param {FoE_Class_NegotiationGameResult} responseData
	 */
	SubmitTurn: (responseData) => {
		const currentTry = Negotiation.CurrentTry;
		if (currentTry === 0) return;

		const GoodsOrdered = Negotiation.GoodsOrdered;
		// create a new guess line, default "match": 0 (correct)
		/** @type {Negotiation_SlotGuessInfo[]} */
		const CurrentGuess = [...new Array(Negotiation.PlaceCount).keys()].map(() => ({good: null, match: 0}));
		Negotiation.Guesses.push(CurrentGuess);

		// offered good index and match per original slot (undefined = slot was already solved)
		const offeredBySlot = new Array(Negotiation.PlaceCount).fill(undefined);
		const matchBySlot = new Array(Negotiation.PlaceCount).fill(undefined);
		let numFreeSlots = 0;
		let trackingLost = false;

		for (const data of responseData.turnResult.slots) {
			const State = data.state;
			const ResourceId = data.resourceId;
			const SlotID = data.slotId || 0;

			const goodIndex = GoodsOrdered.findIndex(info => info.resourceId === ResourceId);
			if (goodIndex === -1) {
				console.error(`Invalid good received for slot ${SlotID}: ${ResourceId}`);
				trackingLost = true;
				continue;
			}

			CurrentGuess[SlotID].good = GoodsOrdered[goodIndex];
			offeredBySlot[SlotID] = goodIndex;

			if (State === 'correct') {
				CurrentGuess[SlotID].match = 0;
			} else if (State === 'wrong_person') {
				CurrentGuess[SlotID].match = 1;
				numFreeSlots++;
			} else {
				CurrentGuess[SlotID].match = 2;
				numFreeSlots++;
			}
			matchBySlot[SlotID] = CurrentGuess[SlotID].match;
		}

		// update the exact state: keep only the assignments that are
		// consistent with the reported feedback of the actual offer
		if (Negotiation.Assigns !== null && !trackingLost) {
			const OpenSlots = Negotiation.OpenSlots;
			const k = OpenSlots.length;
			const offerLocal = new Array(k);
			let code3 = 0;
			for (let j = k - 1; j >= 0; j--) {
				const slot = OpenSlots[j];
				if (offeredBySlot[slot] === undefined) { trackingLost = true; break; }
				offerLocal[j] = offeredBySlot[slot];
				code3 = code3 * 3 + matchBySlot[slot];
			}
			if (!trackingLost) {
				const result = NegotiationSolver.applyResult(Negotiation.Assigns, k, offerLocal, code3);
				if (result.assigns.length === 0 && result.keptPositions.length > 0) {
					// the game contradicted the model, stop assisting
					console.error('Negotiation: no assignment is consistent with the reported feedback');
					trackingLost = true;
				} else {
					Negotiation.Assigns = result.assigns;
					Negotiation.OpenSlots = result.keptPositions.map(j => OpenSlots[j]);
				}
			}
		}
		if (trackingLost) {
			Negotiation.Assigns = null;
			Negotiation.BookNode = null;
		}

		// follow the opening book, absorbing pure good permutations
		if (Negotiation.BookNode !== null) {
			let code4 = 0;
			for (let slot = 0; slot < Negotiation.PlaceCount; slot++) {
				code4 = code4 * 4 + (matchBySlot[slot] !== undefined ? matchBySlot[slot] : 0);
			}
			Negotiation.tryFollowBook(offeredBySlot, code4);
		}

		Negotiation.updateGoodMarginals();
		Negotiation.CurrentTry = currentTry + 1;

		if (numFreeSlots === 0) {
			// negotiation finished successfully
			Negotiation.CurrentTry = 0;
			Negotiation.View = null;
			Negotiation.Message = i18n('Boxes.Negotiation.Success');
			Negotiation.MessageClass = 'success';

			if (Settings.GetSetting('AutomaticNegotiation') && $('#negotiationBox').length > 0) {
				$('#negotiationBox').fadeToggle(function () {
					$(this).remove();
				});
			}
		} else if (Negotiation.Assigns === null && Negotiation.BookNode === null) {
			// no state to work with anymore
			Negotiation.View = null;
			Negotiation.Message = i18n('Boxes.Negotiation.WrongGoods');
			Negotiation.MessageClass = 'danger';
		} else {
			if (currentTry >= Negotiation.TryCount) {
				// planned tries are used up; keep suggesting the most likely
				// assignment in case extra turns are bought
				Negotiation.Message = i18n('Boxes.Negotiation.TryEnd');
				Negotiation.MessageClass = 'warning';
			}
			Negotiation.computeView();
		}

		Negotiation.RefreshBox();
	},


	/**
	 * Try to descend in the opening book with the offer that was actually
	 * submitted. The book stores goods as priority indices; a consistent
	 * bijection between actual goods and book goods is built up on the fly, so
	 * any deviation that only renames goods keeps the book usable. Structural
	 * deviations drop off the book and the solver/heuristic takes over.
	 *
	 * @param {(number|undefined)[]} offeredBySlot offered good index per original slot
	 * @param {number} code4 base-4 feedback code over the original slots
	 */
	tryFollowBook: (offeredBySlot, code4) => {
		const node = Negotiation.BookNode;
		if (!node || !node.r) { Negotiation.BookNode = null; return; }

		const pi = Negotiation.BookMap.slice();
		const usedBook = new Set(pi.filter(b => b >= 0));

		for (let slot = 0; slot < Negotiation.PlaceCount; slot++) {
			const b = node.gu[slot];
			const a = offeredBySlot[slot];
			if (b === 255 || a === undefined) {
				if (b === 255 && a === undefined) continue;
				Negotiation.BookNode = null; return; // open/solved mismatch
			}
			if (pi[a] === -1) {
				if (usedBook.has(b)) { Negotiation.BookNode = null; return; }
				pi[a] = b;
				usedBook.add(b);
			} else if (pi[a] !== b) {
				Negotiation.BookNode = null; return;
			}
		}

		Negotiation.BookMap = pi;
		// missing child = distillation cut: the live solver takes over
		Negotiation.BookNode = node.r[code4] || null;
	},


	/**
	 * Complete the partial good mapping: goods that are not pinned yet are
	 * matched up in ascending (priority) order, which keeps the cost
	 * preference intact.
	 *
	 * @returns {{pi: number[], inv: number[]}} actual->book and book->actual
	 */
	completeBookMapping: () => {
		const N = Negotiation.GoodCount;
		const pi = Negotiation.BookMap.slice();
		const usedBook = new Set(pi.filter(b => b >= 0));
		let nextBook = 0;

		for (let a = 0; a < N; a++) {
			if (pi[a] !== -1) continue;
			while (usedBook.has(nextBook)) nextBook++;
			pi[a] = nextBook;
			usedBook.add(nextBook);
		}

		const inv = new Array(N);
		for (let a = 0; a < N; a++) inv[pi[a]] = a;

		return { pi, inv };
	},


	/**
	 * Compute the suggestion, win chance and expected consumption for the
	 * upcoming round: from the opening book while it covers the played line,
	 * from the exact solver once the state is small enough, and from the
	 * covering heuristic in the rare remaining cases.
	 */
	computeView: () => {
		Negotiation.View = null;

		const k = Negotiation.OpenSlots.length;
		if (k === 0 || Negotiation.CurrentTry === 0) return;
		// keep suggesting single-round guesses when extra turns go beyond plan
		const R = Math.max(1, Negotiation.TryCount - Negotiation.CurrentTry + 1);

		// per open slot: bitmask of goods this slot has already refused; probe
		// offers repeating one of them are valid but read as nonsense, so they
		// are only suggested when strictly better than every alternative
		const refutedBySlot = new Array(Negotiation.PlaceCount).fill(0);
		for (const guess of Negotiation.Guesses) {
			guess.forEach((slotGuess, slot) => {
				if (slotGuess.good !== null && slotGuess.match !== 0) {
					refutedBySlot[slot] |= 1 << slotGuess.good.plannedPos;
				}
			});
		}
		const refutedLocal = Negotiation.OpenSlots.map(slot => refutedBySlot[slot]);

		/** @type {number[]|null} offered good index per open slot position */
		let offerLocal = null;

		if (Negotiation.BookNode !== null && Negotiation.BookNode.gu) {
			const mapping = Negotiation.completeBookMapping();
			offerLocal = [];
			let valid = true;
			for (const slot of Negotiation.OpenSlots) {
				const b = Negotiation.BookNode.gu[slot];
				if (b === 255 || mapping.inv[b] === undefined) { valid = false; break; }
				offerLocal.push(mapping.inv[b]);
			}
			// hand a book move that repeats a refused good over to the exact
			// solver, which finds an equally good offer without the repeat
			if (valid && Negotiation.Assigns !== null && Negotiation.Assigns.length <= Negotiation.LIVE_LIMIT
				&& offerLocal.some((g, j) => refutedLocal[j] & (1 << g))) {
				valid = false;
			}
			if (valid) {
				const go = new Array(Negotiation.GoodCount);
				for (let a = 0; a < Negotiation.GoodCount; a++) go[a] = Negotiation.BookNode.go[mapping.pi[a]] || 0;
				Negotiation.View = { c: Negotiation.BookNode.c, go };
			} else {
				offerLocal = null;
				Negotiation.BookNode = null;
			}
		}

		if (offerLocal === null && Negotiation.SolverObj && Negotiation.Assigns) {
			if (Negotiation.Assigns.length <= Negotiation.LIVE_LIMIT) {
				const res = Negotiation.SolverObj.evalState(Negotiation.Assigns, k, R, refutedLocal);
				offerLocal = res.offer;
				Negotiation.View = {
					c: res.p * 100,
					go: Negotiation.SolverObj.consumption(Negotiation.Assigns, k, R, refutedLocal)
				};
			} else {
				// too big for exact search (off-book opening): cover unknowns
				let testedMask = 0;
				for (const guess of Negotiation.Guesses) {
					for (const slotGuess of guess) {
						if (slotGuess.good !== null) testedMask |= 1 << slotGuess.good.plannedPos;
					}
				}
				offerLocal = NegotiationSolver.heuristicOffer(Negotiation.Assigns, k, Negotiation.GoodCount, testedMask);
				Negotiation.View = { c: null, go: null };
			}
		}

		if (offerLocal === null) return;

		const suggestion = new Array(Negotiation.PlaceCount).fill(null);
		for (let j = 0; j < k; j++) {
			suggestion[Negotiation.OpenSlots[j]] = Negotiation.GoodsOrdered[offerLocal[j]];
		}
		Negotiation.GuessesSuggestions[Negotiation.CurrentTry - 1] = suggestion;
	},


	/**
	 * Refresh canOccur/hasToOccur of all goods from the tracked state (used by
	 * the possible-goods display and the stock warnings).
	 */
	updateGoodMarginals: () => {
		const GoodsOrdered = Negotiation.GoodsOrdered;
		const assigns = Negotiation.Assigns;
		if (assigns === null) return;

		const k = Negotiation.OpenSlots.length;
		const N = Negotiation.GoodCount;
		const slotMask = new Array(N).fill(0);
		let inAllMask = (1 << N) - 1;

		for (const v of assigns) {
			let x = v, present = 0;
			for (let j = 0; j < k; j++) {
				const g = x & 15;
				slotMask[g] |= 1 << j;
				present |= 1 << g;
				x >>= 4;
			}
			inAllMask &= present;
		}

		for (let g = 0; g < N; g++) {
			const good = GoodsOrdered[g];
			good.canOccur = [];
			for (let j = 0; j < k; j++) {
				if (slotMask[g] & (1 << j)) good.canOccur.push(Negotiation.OpenSlots[j]);
			}
			good.hasToOccur = (k > 0 && (inAllMask & (1 << g))) ? Negotiation.CurrentTry : 0;
		}
	},


	/**
	 * Negotiation has ended
	 */
	ExitNegotiation: () => {
		Negotiation.CurrentTry = 0;
		Negotiation.View = null;
		Negotiation.Message = i18n('Boxes.Negotiation.Canceled');
		Negotiation.MessageClass = 'danger';

		Negotiation.RefreshBox();

		if (Settings.GetSetting('AutomaticNegotiation') && $('#negotiationBox').length > 0) {
			$('#negotiationBox').fadeToggle(function () {
				$(this).remove();
			});
		}
	},


	/**
	 * Compare two goods by the order of their selection buttons in the game
	 * (all-age goods first, then by era, special goods last)
	 *
	 * @param {string} goodA resource id of the first good
	 * @param {string} goodB resource id of the second good
	 * @returns {number} negative when goodA comes first, positive when goodB does
	 */
	goodButtonCompare: (goodA, goodB) => {
		const goodValue = (good) => {
			const data = GoodsData[good];
			if (data.era === 'AllAge') return 100;
			const special = !!data.abilities.specialResource;
			const era = Technologies.Eras[data.era];
			return (era === 0 ? 200 : era) + (special ? 400 : 0);
		};

		if (goodA === goodB) return 0;
		const valA = goodValue(goodA);
		const valB = goodValue(goodB);

		if (valA === valB) return goodA > goodB ? 1 : -1;
		return valA - valB;
	},


	/**
	 * Determine the value of a good for the priority order (cheap first)
	 *
	 * @param {string} GoodName resource id of the good
	 * @returns {number}
	 */
	GetGoodValue: (GoodName) => {
		switch (GoodName) {
			case 'money': return 0;
			case 'supplies': return 50;
			case 'medals': return localStorage.getItem('NegotiationSaveMedals') === 'false' ? 75 : 3000; // default true
			case 'promethium': return 3500;
			case 'orichalcum': return 4000;
		}

		let Value;
		if (localStorage.getItem('NegotiationSaveCurrentEraGoods') === 'false') { // default true
			Value = 100;
		} else {
			const EraID = Technologies.Eras[GoodsData[GoodName].era];
			Value = (EraID === undefined ? 20 : EraID) * 100;
		}

		// prefer goods with a larger stock
		const Stock = ResourceStock[GoodName];
		return Value + (Stock ? 1.0 / Stock : 99);
	},


	/**
	 * Load the opening book (single compact JSON, replaces the old zip tables)
	 *
	 * @returns {Promise<null|Object<string, Negotiation_BookNode>>}
	 */
	GetBook: () => {
		if (Negotiation.Book !== undefined) {
			return Promise.resolve(Negotiation.Book);
		}

		return fetch(extUrl + 'js/web/negotiation/tables/book.json')
			.then(response => {
				if (response.status === 200 || response.status === 0) {
					return response.json();
				}
				return Promise.reject(new Error(response.statusText));
			})
			.then(book => {
				Negotiation.Book = book;
				const bookKey = Math.min(Negotiation.TryCount, 5) + '_' + Negotiation.GoodCount;
				Negotiation.BookNode = book[bookKey] || null;
				return book;
			})
			.catch(err => {
				console.error(err);
				Negotiation.Book = null;
				return null;
			});
	},
};

// --------------------------------------------------------------------------------------------------
// Negotiation

// services whose requests can arrive during a negotiation without ending it
const NEGOTIATION_PASSIVE_SERVICES = [
	'RankingService',
	'QuestService',
	'ResourceService',
	'ResourceShopService',
	'TimeService',
	'MessageService',
	'WorldChallengeService',
	'AutoAidService',
	'TrackingService',
	'AnnouncementService',
	'InventoryService',
	'GuildExpeditionNotificationService',
	'FriendsTavernService',
];

FoEproxy.addHandler('all', 'all', (data, postData) => {
	if (data.requestMethod === 'startNegotiation') {
		// delay the start so a directly following resource update can flush it early
		Negotiation.tempStore = data.responseData;
		Negotiation.timeout = setTimeout(() => {
			Negotiation.timeout = null;
			Negotiation.StartNegotiation(/** @type {FoE_Class_NegotiationGame} */ (Negotiation.tempStore));
			Negotiation.tempStore = null;
		}, 200);
		return;
	}

	if ($('#negotiationBox').length === 0) return;

	if (data.requestClass === 'NegotiationGameService' && data.requestMethod === 'submitTurn') {
		Negotiation.SubmitTurn(/** @type {FoE_Class_NegotiationGameResult} */ (data.responseData));
		return;
	}

	if (!NEGOTIATION_PASSIVE_SERVICES.includes(data.requestClass) && data.requestMethod !== 'markContributionNotificationsRead') {
		Negotiation.ExitNegotiation();
	}
});

FoEproxy.addFoeHelperHandler('ResourcesUpdated', () => {
	if (Negotiation.timeout) {
		clearTimeout(Negotiation.timeout);
		Negotiation.timeout = null;
		Negotiation.StartNegotiation(/** @type {FoE_Class_NegotiationGame} */ (Negotiation.tempStore));
		Negotiation.tempStore = null;
	}
});
