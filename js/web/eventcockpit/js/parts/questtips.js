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

// every quest update rides on the request that caused it: this is how the collector learns which action moves which task
FoEproxy.addHandler('QuestService', 'getUpdates', (data, postData) => {
	EventCockpit.Tips.Observe(data.responseData, postData);
});
FoEproxy.addWsHandler('QuestService', 'getUpdates', data => EventCockpit.Tips.Observe(data?.responseData));

// when other players can be motivated again: the social bar at the start and the lists of the player bar
FoEproxy.addHandler('StartupService', 'getData', data => EventCockpit.Tips.SetPlayers(data.responseData?.socialbar_list));
FoEproxy.addHandler('OtherPlayerService', 'all', data => {
	if (['getNeighborList', 'getFriendsList', 'getClanMemberList'].includes(data.requestMethod)) EventCockpit.Tips.SetPlayers(data.responseData);
	if (data.requestMethod === 'getSocialList') ['neighbours', 'guildMembers', 'friends'].forEach(key => EventCockpit.Tips.SetPlayers(data.responseData?.[key]));
});
// a motivation from the player bar or in the other city blocks the player for a day;
// the request holds the player id (and a building id), the known player id is taken
FoEproxy.addRequestHandler('OtherPlayerService', 'all', postData => {
	if (!['polivateRandomBuilding', 'motivateById', 'polishById'].includes(postData?.requestMethod)) return;

	const player = (postData.requestData || []).map(id => EventCockpit.Tips.Players[id]).find(Boolean);
	if (player) player.at = GameTime.get() + 86400;
	EventCockpit.Refresh();
});

// the suggestions depend on the placed buildings and on the kits in the inventory
FoEproxy.addFoeHelperHandler('CityMapUpdated', () => {
	EventCockpit.Tips.Harvests = null;
	EventCockpit.Refresh();
});
FoEproxy.addFoeHelperHandler('InventoryUpdated', () => EventCockpit.Refresh());


/**
 * @typedef QuestTipRule
 * @property {string} kind task type the solvers know
 * @property {string} icon iconType of the condition
 * @property {Object<string,RegExp>} words wording of the task per game language
 */

/**
 * @typedef QuestTipData
 * @property {Object<string,Object>} seen every task wording met so far, keyed by its signature
 * @property {Object<string,Object>} moves progress changes per signature and causing request
 */

/**
 * Suggestions for the tasks of the event quests and the collector behind them.
 *
 * The game only sends a task as an icon and a translated sentence, without a
 * type. One icon stands for several tasks ("gain population" and "own 3
 * residential blocks" share the house), so a task type is only recognised
 * when the icon and the wording of the game language both match a rule.
 *
 * The collector notes every task wording it meets and, whenever the progress
 * of a task changes, the request that caused it. That data (no player data in
 * it) is the base for further rules and proves which actions count.
 */
EventCockpit.Tips = {

	/** @type {Object<string,RegExp>} duration of a production task per game language: the hours as first group */
	Hours: { de: /(\d+)-Stunden-Produktion/i },

	/** @type {QuestTipRule[]} known task types; a language without wording gets no suggestion */
	Rules: [
		{ kind: 'population_gain', icon: 'residential', words: { de: /Bevölkerung hinzugewinnen/i } },
		{ kind: 'happiness_gain', icon: 'icon_smiley', words: { de: /Zufriedenheit hinzugewinnen/i } },
		{ kind: 'decoration_build', icon: 'decoration', words: { de: /Dekorationen errichten/i } },
		{ kind: 'guild_goods_donate', icon: 'icon_quest_clan_treasury', words: { de: /Gildenkasse spenden/i } },
		{ kind: 'fp_spend', icon: 'icon_quest_alchemie', words: { de: /Forge-Punkte ausgeben/i } },
		{ kind: 'supplies_collect', icon: 'icon_supplies_plus', words: { de: /Vorräte sammeln/i } },
		{ kind: 'coins_collect', icon: 'taxes', words: { de: /Münzen sammeln/i } },
		{ kind: 'production_own', icon: 'workshop', words: { de: /Produktionen in Produktionsstätten deines Zeitalters fertigstellen/i } },
		{ kind: 'production_previous', icon: 'workshop', words: { de: /Produktionen in Produktionsstätten des vorigen Zeitalters fertigstellen/i } },
		{ kind: 'motivate', icon: 'social', words: { de: /Gebäude anderer Spieler motivieren/i } },
		{ kind: 'production_duration', icon: 'workshop', words: { de: /-Stunden-Produktion in einer Produktionsstätte fertigstellen/i } },
	],

	/** @type {number} progress changes kept at most */
	MaxMoves: 300,

	/** @type {number} suggested buildings per task */
	MaxChoices: 3,

	/** @type {?QuestTipData} collected data, loaded from the local storage on first use */
	Data: null,

	/** @type {?Object<string,{current: number, max: number}>} progress per task at the previous update, null before the first one */
	Last: null,

	/** @type {?Object[]} running and finished productions of coins and supplies, null until needed after a city change */
	Harvests: null,

	/** @type {Object<number,{at: number, neighbor: boolean, guild: boolean, friend: boolean}>} other players of the player bar: when they can be motivated again */
	Players: {},

	/** @type {number} build and sell rounds a suggestion asks for at most */
	MaxRounds: 30,


	/**
	 * Signature of a task: its icon and its wording with the numbers masked.
	 *
	 * @param {Object} condition success condition of a quest
	 * @returns {string} e.g. "residential|# Bevölkerung hinzugewinnen"
	 */
	Signature: (condition) => `${condition.iconType}|${(condition.description || '').replace(/\d+(?:[.,'\s  ]\d+)*/g, '#')}`,


	/**
	 * Task type of a condition.
	 *
	 * @param {Object} condition success condition of a quest
	 * @returns {?string} kind of the matching rule, null for an unknown task
	 */
	Classify: (condition) => EventCockpit.Tips.Rules.find(rule =>
		rule.icon === condition.iconType && rule.words[MainParser.Language]?.test(condition.description || ''))?.kind || null,


	/**
	 * Collected data of the player.
	 *
	 * @returns {QuestTipData} data
	 */
	GetData: () => {
		if (!EventCockpit.Tips.Data) {
			let stored = null;
			try {
				stored = JSON.parse(localStorage.getItem('EventCockpitTips_' + ExtPlayerID));
			} catch (e) {
				stored = null;
			}
			EventCockpit.Tips.Data = { seen: stored?.seen || {}, moves: stored?.moves || {} };
		}
		return EventCockpit.Tips.Data;
	},


	/**
	 * Takes over a quest update: notes unknown task wordings and the request
	 * behind every progress change. The first update only sets the baseline.
	 *
	 * @param {Object[]} quests quests of QuestService.getUpdates
	 * @param {Object[]} [postData] requests the update answered
	 */
	Observe: (quests, postData) => {
		if (!Array.isArray(quests) || !ExtPlayerID) return;

		const tips = EventCockpit.Tips,
			data = tips.GetData(),
			last = tips.Last,
			now = GameTime.get(),
			requests = (postData || []).filter(request => request?.requestClass),
			trigger = [...new Set(requests.map(request => `${request.requestClass}.${request.requestMethod}`))].join('+') || 'push';
		let changed = false;

		tips.Last = { ...(last || {}) };
		for (const quest of quests) {
			for (const condition of quest.successConditions || []) {
				const signature = tips.Signature(condition),
					key = `${quest.id}:${condition.id}`,
					current = condition.currentProgress || 0,
					before = last?.[key];

				tips.Last[key] = { current, max: condition.maxProgress };

				if (!data.seen[signature]) {
					data.seen[signature] = {
						category: quest.category,
						questType: (quest.type || '').replace(/\d+/g, '#'),
						flags: (condition.flags || []).join(','),
						max: condition.maxProgress,
						at: now,
					};
					changed = true;
				}

				if (!before || before.max !== condition.maxProgress || before.current === current) continue;

				const moveKey = `${signature}>${trigger}`,
					move = data.moves[moveKey] || { count: 0 };

				data.moves[moveKey] = {
					count: move.count + 1,
					delta: current - before.current,
					// numbers are masked: arguments can hold ids of other players
					args: JSON.stringify(requests[0]?.requestData ?? null, (key, value) => (typeof value === 'number' ? '#' : value)).slice(0, 300),
					at: now,
				};
				changed = true;
			}
		}

		if (!changed) return;

		// the oldest progress changes make room
		const keys = Object.keys(data.moves);
		if (keys.length > tips.MaxMoves) {
			keys.sort((a, b) => data.moves[a].at - data.moves[b].at)
				.slice(0, keys.length - tips.MaxMoves)
				.forEach(key => delete data.moves[key]);
		}
		localStorage.setItem('EventCockpitTips_' + ExtPlayerID, JSON.stringify(data));
	},


	/**
	 * Collected data as text for sharing: task wordings with the type the
	 * rules give them and progress changes, with the game language and the
	 * helper version, without player data.
	 *
	 * @returns {string} JSON
	 */
	Export: () => {
		const tips = EventCockpit.Tips,
			data = tips.GetData(),
			kind = (signature) => {
				const split = signature.indexOf('|');
				return tips.Classify({ iconType: signature.slice(0, split), description: signature.slice(split + 1) });
			};

		return JSON.stringify({
			version: extVersion,
			language: MainParser.Language,
			exported: GameTime.get(),
			seen: Object.entries(data.seen).map(([task, entry]) => ({ task, kind: kind(task), ...entry })),
			moves: Object.entries(data.moves).map(([move, entry]) => ({ move, ...entry })),
		}, null, '\t');
	},


	/**
	 * Marks suggested buildings with arrows in the city; where the arrows
	 * cannot be set, the city map box highlights them instead.
	 *
	 * @param {number[]} ids ids of the placed buildings
	 */
	Locate: async (ids) => {
		if (!await BuildingMarker.show(ids)) Productions.ShowOnMap(ids);
	},


	/**
	 * Copies the collected data to the clipboard.
	 */
	Copy: () => {
		helper.str.copyToClipboard(EventCockpit.Tips.Export());
		HTML.ShowToastMsg({ head: i18n('Boxes.EventCockpit.Title'), text: i18n('Boxes.EventCockpit.Tip.Copied'), type: 'success', hideAfter: 3000, show: true });
	},


	/**
	 * Number of collected entries (task wordings and progress changes).
	 *
	 * @returns {number} count
	 */
	Count: () => {
		const data = EventCockpit.Tips.GetData();
		return Object.keys(data.seen).length + Object.keys(data.moves).length;
	},


	/**
	 * Stock of an inventory item.
	 *
	 * @param {string} assetName itemAssetName of the item
	 * @returns {number} pieces in the inventory
	 */
	ItemStock: (assetName) => Object.values(MainParser.Inventory || {})
		.filter(item => item.itemAssetName === assetName)
		.reduce((sum, item) => sum + (item.inStock || 0), 0),


	/**
	 * Placed special buildings that can be stored and placed again: not time
	 * limited (the timer would start anew or be lost), finished, and only as
	 * much population as the free population covers while they are stored.
	 *
	 * @param {string} resource 'population' or 'happiness'
	 * @returns {{id: number, name: string, value: number}[]} buildings that give the resource, largest value first
	 */
	Storable: (resource) => {
		const free = ResourceStock.population || 0;

		return Object.values(MainParser.CityMapData || {})
			.map(building => {
				const meta = MainParser.CityEntities[building.cityentity_id];
				if (!meta || ['greatbuilding', 'main_building'].includes(building.type)) return null;
				if (!CityBuildings.isSpecialBuilding(meta) || CityBuildings.isLimitedBuilding(meta) !== false) return null;
				if (['ConstructionState', 'UnconnectedState'].includes(building.state?.__class__)) return null;

				const era = Technologies.getEraName(building.cityentity_id, building.level),
					population = CityBuildings.setPopulation(meta, building, era) || 0;
				if (population > free) return null;

				// a placed copy starts unpolished, so the happiness counts without the polish bonus
				const value = resource === 'population' ? population : CityBuildings.setHappiness(meta, { ...building, state: {} }, era) || 0;
				return { id: building.id, name: meta.name, value };
			})
			.filter(building => building && building.value > 0)
			.sort((a, b) => b.value - a.value);
	},


	/**
	 * Clickable building name (or group of buildings) for a suggestion; the
	 * tooltip names the buildings, e.g. "4× Platinum Terraces", unless the
	 * link shows the name itself.
	 *
	 * @param {number|number[]} ids id(s) of the placed building(s)
	 * @param {string} label text of the link
	 * @returns {string} HTML
	 */
	BuildingLink: (ids, label) => {
		const list = [].concat(ids),
			count = {};

		list.forEach(id => {
			const name = MainParser.CityEntities[MainParser.CityMapData?.[id]?.cityentity_id]?.name || id;
			count[name] = (count[name] || 0) + 1;
		});
		// a link that already shows the name needs no tooltip
		if (list.length === 1 && label.includes(HTML.escapeHtml(String(Object.keys(count)[0])))) delete count[Object.keys(count)[0]];
		const title = Object.entries(count).sort((a, b) => b[1] - a[1]).map(([name, n]) => `${n}× ${name}`).join('\n');

		return `<span class="ec-locate" data-id="${list.join(',')}"${title ? ` title="${HTML.escapeHtml(title)}"` : ''}>${label}</span>`;
	},


	/**
	 * Suggestion to store a building and place it again until the missing
	 * amount is reached. Every round costs one store kit, so the buildings that
	 * need the fewest rounds come first, among them the smallest one that still
	 * does it.
	 *
	 * @param {number} need missing amount
	 * @param {string} resource 'population' or 'happiness'
	 * @returns {string} HTML, empty without a fitting building
	 */
	StoreTip: (need, resource) => {
		const tips = EventCockpit.Tips,
			kits = tips.ItemStock('store_building'),
			choices = tips.Storable(resource)
				.map(building => ({ ...building, rounds: Math.ceil(need / building.value) }))
				.filter(building => building.rounds <= kits)
				.sort((a, b) => a.rounds - b.rounds || a.value - b.value)
				.filter((building, index, list) => list.findIndex(other => other.name === building.name) === index) // one of each kind is enough
				.slice(0, tips.MaxChoices);

		if (choices.length === 0) return '';

		const names = choices.map(building =>
			tips.BuildingLink(building.id, `${HTML.escapeHtml(building.name)} (+${EventCockpit.Num(building.value)}${building.rounds > 1 ? `, ${building.rounds}×` : ''})`));

		return HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.StoreAndPlace'), {
			building: names[0],
			kits: EventCockpit.Num(choices[0].rounds),
			stock: EventCockpit.Num(kits),
		}) + (names.length > 1 ? ' ' + HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.Alternatives'), { buildings: names.slice(1).join(', ') }) : '');
	},


	/**
	 * Decorations in the inventory that give happiness: no time limit (its
	 * timer would start when placed), valued in the own era, the one that
	 * gives the most happiness per tile first.
	 *
	 * @returns {{name: string, value: number, stock: number, area: number}[]} decorations
	 */
	InventoryDecorations: () => {
		const stock = {};
		for (const item of Object.values(MainParser.Inventory || {})) {
			const id = item.item?.__class__ === 'BuildingItemPayload' ? item.item.cityEntityId : null;
			if (id) stock[id] = (stock[id] || 0) + (item.inStock || 0);
		}

		return Object.entries(stock)
			.map(([id, count]) => {
				const meta = MainParser.CityEntities[id];
				if (!meta || meta.type !== 'decoration' || count <= 0 || CityBuildings.isLimitedBuilding(meta) !== false) return null;
				return {
					name: meta.name,
					value: CityBuildings.setHappiness(meta, {}, CurrentEra) || 0,
					stock: count,
					area: (meta.width || 1) * (meta.length || 1),
				};
			})
			.filter(deco => deco && deco.value > 0)
			.sort((a, b) => b.value / b.area - a.value / a.area || b.value - a.value);
	},


	/**
	 * Suggestion to place decorations from the inventory until the missing
	 * happiness is reached; no store kit needed.
	 *
	 * @param {number} need missing happiness
	 * @returns {string} HTML, empty when the inventory does not cover it
	 */
	InventoryTip: (need) => {
		const picks = [];
		let left = need;

		for (const deco of EventCockpit.Tips.InventoryDecorations()) {
			if (left <= 0 || picks.length >= EventCockpit.Tips.MaxChoices) break;
			const count = Math.min(deco.stock, Math.ceil(left / deco.value));
			picks.push(`<b>${EventCockpit.Num(count)}× ${HTML.escapeHtml(deco.name)}</b> (+${EventCockpit.Num(deco.value)})`);
			left -= count * deco.value;
		}

		return left > 0 ? '' : HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.PlaceFromInventory'), { buildings: picks.join(', ') });
	},


	/**
	 * Decorations of the build menu the player can afford: no special
	 * buildings, from an era before the own one (its research is done), paid
	 * with coins and supplies only (some cost diamonds) and with enough of
	 * both in stock for the given number.
	 *
	 * @param {number} count decorations to build
	 * @returns {{name: string, era: number, size: string, area: number, coins: number, supplies: number}[]} smallest and cheapest first
	 */
	MenuDecorations: (count) => Object.values(MainParser.CityEntities || {})
		.filter(meta => meta.type === 'decoration' && meta.__class__ !== 'GenericCityEntity' && !meta.is_special && meta.requirements?.cost
			&& Object.entries(meta.requirements.cost.resources || {}).every(([resource, amount]) => !amount || ['money', 'supplies'].includes(resource)))
		.map(meta => {
			const cost = meta.requirements.cost.resources || {},
				width = meta.width || 1,
				length = meta.length || 1;
			return {
				name: meta.name,
				era: Technologies.Eras[meta.requirements.min_era],
				size: `${width}×${length}`,
				area: width * length,
				coins: cost.money || 0,
				supplies: cost.supplies || 0,
			};
		})
		.filter(deco => deco.era > 0 && deco.era < CurrentEraID
			&& deco.coins * count <= (ResourceStock.money || 0) && deco.supplies * count <= (ResourceStock.supplies || 0))
		.sort((a, b) => a.area - b.area || (a.coins + a.supplies) - (b.coins + b.supplies) || a.era - b.era),


	/**
	 * Takes over players of the player bar with the time until they can be motivated again.
	 *
	 * @param {Object[]} [list] players of the social bar or of a list of the player bar
	 */
	SetPlayers: (list) => {
		if (!Array.isArray(list)) return;

		const now = GameTime.get();
		for (const player of list) {
			if (!player?.player_id || player.is_self) continue;
			const known = EventCockpit.Tips.Players[player.player_id] || {};
			EventCockpit.Tips.Players[player.player_id] = {
				at: now + (player.next_interaction_in || 0),
				neighbor: player.is_neighbor ?? known.neighbor ?? false,
				guild: player.is_guild_member ?? known.guild ?? false,
				friend: player.is_friend ?? known.friend ?? false,
			};
		}
	},


	/**
	 * Suggestion for motivating other players: how many of the player bar can
	 * be motivated now, by group, and when the next one is free again.
	 *
	 * @param {number} need motivations still missing
	 * @returns {string} HTML, empty while the player bar is unknown
	 */
	MotivateTip: (need) => {
		const now = GameTime.get(),
			players = Object.values(EventCockpit.Tips.Players);
		if (players.length === 0) return '';

		const free = players.filter(player => player.at <= now),
			count = (group) => free.filter(player => player[group]).length,
			next = Math.min(...players.filter(player => player.at > now).map(player => player.at), Infinity),
			text = HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.Motivate'), {
				count: EventCockpit.Num(free.length),
				guild: EventCockpit.Num(count('guild')),
				friends: EventCockpit.Num(count('friend')),
				neighbors: EventCockpit.Num(count('neighbor')),
			});

		if (free.length >= need) return `${text} ${i18n('Boxes.EventCockpit.Tip.MotivateEnough')}`;
		return `${text} ${HTML.i18nReplacer(i18n(next < Infinity ? 'Boxes.EventCockpit.Tip.MotivateMissing' : 'Boxes.EventCockpit.Tip.MotivateMissingNoNext'), {
			missing: EventCockpit.Num(need - free.length),
			time: next < Infinity ? EventCockpit.Countdown(next) : '',
		})}`;
	},


	/**
	 * Production time as short text.
	 *
	 * @param {number} seconds production time
	 * @returns {string} e.g. "5 min" or "4 h"
	 */
	TimeText: (seconds) => seconds < 3600
		? HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.Minutes'), { m: Math.round(seconds / 60) })
		: HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.Hours'), { h: Math.round(seconds / 3600) }),


	/**
	 * Own production buildings with the state of their production: the
	 * classic workshops and the generic buildings of the type production
	 * (most event buildings), which keep their times in other fields.
	 *
	 * @param {?number} eraOffset 0 for the own era, -1 for the previous one together with the own one, null for every era
	 * @returns {{id: number, state: string, time: number, at: number, options: number[]}[]} buildings with their production times
	 */
	Workshops: (eraOffset) => Object.values(MainParser.CityMapData || {})
		.map(building => {
			const meta = MainParser.CityEntities[building.cityentity_id];
			if (meta?.type !== 'production' || ['ConstructionState', 'UnconnectedState'].includes(building.state?.__class__)) return null;

			// a task for the previous era also counts the buildings of the own era (seen in the game)
			const era = Technologies.getEraName(building.cityentity_id, building.level),
				eraId = Technologies.Eras[era];
			if (eraOffset === 0 && eraId !== CurrentEraID) return null;
			if (eraOffset !== null && eraOffset < 0 && (eraId < CurrentEraID + eraOffset || eraId > CurrentEraID)) return null;

			const options = meta.available_products?.map(option => option.production_time)
				|| (meta.components?.[era] || meta.components?.AllAge)?.production?.options?.map(option => option.time)
				|| [];
			return {
				id: building.id,
				state: CityBuildings.setState(building),
				time: building.state?.current_product?.production_time || building.state?.productionOption?.time || 0,
				at: building.state?.next_state_transition_at || 0,
				options: options.filter(Boolean),
			};
		})
		.filter(Boolean),


	/**
	 * Suggestion for finishing productions: the matching production buildings
	 * with what runs in them, is ready or idle, and how many rounds are still
	 * needed. A production counts when it is collected.
	 *
	 * @param {number} need productions still to finish
	 * @param {?number} eraOffset 0 for the own era, -1 for the previous one, null for every era
	 * @param {number} [duration] production time the task asks for, any when left out
	 * @returns {string} HTML
	 */
	ProductionTip: (need, eraOffset, duration) => {
		const tips = EventCockpit.Tips,
			buildings = tips.Workshops(eraOffset),
			era = eraOffset === null ? '' : eraOffset < 0
				? HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.EraOrOwn'), { era: i18n('Eras.' + (CurrentEraID + eraOffset)) })
				: i18n('Eras.' + CurrentEraID);

		if (buildings.length === 0) return HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.NoWorkshops'), { era });

		const fits = (building) => !duration || building.time === duration,
			running = buildings.filter(building => building.state === 'producing'),
			ready = buildings.filter(building => building.state === 'collectable'),
			idle = buildings.filter(building => building.state === 'idle'),
			counting = [...running, ...ready].filter(fits).length,
			parts = [];

		if (running.length > 0) {
			const byTime = {};
			running.forEach(building => (byTime[building.time] = byTime[building.time] || []).push(building));
			const groups = Object.entries(byTime).sort((a, b) => a[0] - b[0])
				.map(([time, list]) => tips.BuildingLink(list.map(building => building.id),
					`${list.length}× ${tips.TimeText(Number(time))}${duration && Number(time) !== duration ? ' ' + i18n('Boxes.EventCockpit.Tip.WrongTime') : ''}`));
			parts.push(HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.Running'), {
				groups: groups.join(', '),
				time: EventCockpit.Countdown(Math.min(...running.map(building => building.at))),
			}));
		}
		if (ready.length > 0) parts.push(tips.BuildingLink(ready.map(building => building.id), HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.Ready'), { count: ready.length })));
		if (idle.length > 0) parts.push(tips.BuildingLink(idle.map(building => building.id), HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.Idle'), { count: idle.length })));

		// the rounds run in the buildings that offer the duration (the task's one or else the shortest of all)
		// and are free for it; while all of them are busy, in all that offer it
		const left = Math.max(0, need - counting),
			step = duration || Math.min(...buildings.flatMap(building => building.options)),
			offering = buildings.filter(building => building.options.includes(step)),
			free = offering.filter(building => building.state !== 'producing'),
			capable = free.length > 0 ? free : offering,
			rounds = Math.ceil(left / capable.length);

		let next = i18n('Boxes.EventCockpit.Tip.CollectToFinish');
		if (left > 0) {
			next = capable.length === 0
				? HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.NoDuration'), { time: tips.TimeText(step) })
				: HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.Rounds'), {
					rounds,
					buildings: tips.BuildingLink(capable.map(building => building.id), HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.WorkshopCount'), { count: capable.length })),
					time: tips.TimeText(step),
					total: tips.TimeText(rounds * step),
				});
		}

		return HTML.i18nReplacer(i18n(era ? 'Boxes.EventCockpit.Tip.Workshops' : 'Boxes.EventCockpit.Tip.WorkshopsAll'), { count: buildings.length, era, state: parts.join(' · ') }) + ' ' + next;
	},


	/**
	 * Coins and supplies as text, e.g. "35 coins, 8 supplies".
	 *
	 * @param {{money?: number, supplies?: number}} cost amounts
	 * @returns {string} text, "0" when both are empty
	 */
	CostText: (cost) => [
		cost.money > 0 ? `${EventCockpit.Num(cost.money)} ${i18n('Boxes.EventCockpit.Tip.Coins')}` : '',
		cost.supplies > 0 ? `${EventCockpit.Num(cost.supplies)} ${i18n('Boxes.EventCockpit.Tip.Supplies')}` : '',
	].filter(Boolean).join(', ') || '0',


	/**
	 * Available Forge Points as text: the bar of the game plus the Forge
	 * Point packages in the inventory, the same count as the helper bar.
	 *
	 * @returns {string} e.g. "720.626 FP (0 in the bar, 720.626 in the inventory)"
	 */
	FPStock: () => {
		const bar = ResourceStock.strategy_points || 0,
			inventory = Object.values(MainParser.Inventory || {})
				.filter(item => item.item?.__class__ === 'ForgePointPackagePayload')
				.reduce((sum, item) => sum + (item.inStock || 0) * (item.item.resource_package?.gain || 0), 0);

		return HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.FPStock'), {
			total: EventCockpit.Num(bar + inventory),
			bar: EventCockpit.Num(bar),
			inventory: EventCockpit.Num(inventory),
		});
	},


	/**
	 * Own great buildings that can take the Forge Points: not at their
	 * unlocked maximum and with at least that much missing to the next
	 * level, the one closest to its level first.
	 *
	 * @param {number} need Forge Points to spend
	 * @returns {{id: number, name: string, level: number, left: number}[]} great buildings
	 */
	OwnGreatBuildings: (need) => Object.values(MainParser.CityMapData || {})
		.filter(building => building.type === 'greatbuilding' && building.level < building.max_level)
		.map(building => ({
			id: building.id,
			name: MainParser.CityEntities[building.cityentity_id]?.name || building.cityentity_id,
			level: building.level,
			left: (building.state?.forge_points_for_level_up || 0) - (building.state?.invested_forge_points || 0),
		}))
		.filter(gb => gb.left >= need)
		.sort((a, b) => a.left - b.left),


	/**
	 * Running and finished productions of coins and supplies in the own city,
	 * cached until the city changes.
	 *
	 * @returns {{id: number, name: string, at: number, money: number, supplies: number}[]} productions, earliest first
	 */
	GetHarvests: () => {
		if (!EventCockpit.Tips.Harvests) {
			EventCockpit.Tips.Harvests = Object.values(MainParser.CityMapData || {})
				.map(building => {
					const meta = MainParser.CityEntities[building.cityentity_id],
						state = meta ? CityBuildings.setState(building) : 'idle';
					if (!['producing', 'collectable'].includes(state)) return null;

					const amounts = { money: 0, supplies: 0 },
						productions = CityBuildings.setCurrentProductions(building, meta, Technologies.getEraName(building.cityentity_id, building.level));
					for (const production of Array.isArray(productions) ? productions : []) {
						if (production.type !== 'resources') continue;
						amounts.money += production.resources?.money || 0;
						amounts.supplies += production.resources?.supplies || 0;
					}
					if (!amounts.money && !amounts.supplies) return null;

					return { id: building.id, name: meta.name, at: CityBuildings.setStateTimes(building).at || 0, ...amounts };
				})
				.filter(Boolean)
				.sort((a, b) => a.at - b.at);
		}
		return EventCockpit.Tips.Harvests;
	},


	/**
	 * Suggestion from the harvest: what is ready now, or which productions
	 * cover the missing amount and when the last of them is done.
	 *
	 * @param {number} need missing amount
	 * @param {string} resource 'money' or 'supplies'
	 * @returns {string} HTML, empty when the running productions do not cover it
	 */
	HarvestTip: (need, resource) => {
		const tips = EventCockpit.Tips,
			now = GameTime.get(),
			picks = [];
		let sum = 0;

		for (const harvest of tips.GetHarvests()) {
			if (!harvest[resource]) continue;
			picks.push(harvest);
			sum += harvest[resource];
			if (sum >= need) break;
		}
		if (sum < need) return '';

		const last = picks[picks.length - 1].at,
			names = [...picks].sort((a, b) => b[resource] - a[resource]).slice(0, tips.MaxChoices)
				.map(harvest => tips.BuildingLink(harvest.id, `${HTML.escapeHtml(harvest.name)} (+${EventCockpit.Num(harvest[resource])})`))
				.join(', ') + (picks.length > tips.MaxChoices ? ' …' : '');

		return last <= now
			? HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.CollectNow'), { buildings: names })
			: HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.CollectAt'), { buildings: names, time: EventCockpit.Countdown(last), clock: moment.unix(last).format('LT') });
	},


	/**
	 * Suggestion to build a decoration and sell it right away: a sale gives a
	 * quarter of the building costs back. The decoration with the largest
	 * return of the resource needs the fewest rounds; it must come from an
	 * era before the own one, cost only coins and supplies and be affordable.
	 *
	 * @param {number} need missing amount
	 * @param {string} resource 'money' or 'supplies'
	 * @returns {string} HTML, empty without a fitting decoration
	 */
	SellTip: (need, resource) => {
		const tips = EventCockpit.Tips,
			deco = Object.values(MainParser.CityEntities || {})
				.filter(meta => meta.type === 'decoration' && meta.__class__ !== 'GenericCityEntity' && !meta.is_special
					&& meta.requirements?.cost && (meta.construction_time || 0) <= 60
					&& Technologies.Eras[meta.requirements.min_era] > 0 && Technologies.Eras[meta.requirements.min_era] < CurrentEraID
					&& Object.entries(meta.requirements.cost.resources || {}).every(([res, amount]) => !amount || ['money', 'supplies'].includes(res)))
				.map(meta => {
					const cost = meta.requirements.cost.resources,
						back = meta.resaleResources?.resources || {};
					return { meta, cost: { money: cost.money || 0, supplies: cost.supplies || 0 }, back: { money: back.money || 0, supplies: back.supplies || 0 } };
				})
				.filter(entry => entry.back[resource] > 0 && Math.ceil(need / entry.back[resource]) <= tips.MaxRounds)
				.map(entry => ({ ...entry, rounds: Math.ceil(need / entry.back[resource]) }))
				.map(entry => ({ ...entry, loss: { money: entry.rounds * (entry.cost.money - entry.back.money), supplies: entry.rounds * (entry.cost.supplies - entry.back.supplies) } }))
				// one round must be payable, the whole loss must be in stock
				.filter(entry => ['money', 'supplies'].every(res => entry.cost[res] <= (ResourceStock[res] || 0) && entry.loss[res] <= (ResourceStock[res] || 0)))
				.sort((a, b) => a.rounds - b.rounds || (a.loss.money + a.loss.supplies) - (b.loss.money + b.loss.supplies))[0];

		if (!deco) return '';

		return HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.BuildAndSell'), {
			count: EventCockpit.Num(deco.rounds),
			building: `<b>${HTML.escapeHtml(deco.meta.name)}</b>`,
			era: i18n('Eras.' + Technologies.Eras[deco.meta.requirements.min_era]),
			size: `${deco.meta.width || 1}×${deco.meta.length || 1}`,
			seconds: deco.meta.construction_time || 0,
			back: tips.CostText(deco.back),
			cost: tips.CostText(deco.loss),
		});
	},


	/**
	 * Suggestion for collecting coins or supplies: the harvest, or else build and sell.
	 *
	 * @param {number} need missing amount
	 * @param {string} resource 'money' or 'supplies'
	 * @returns {string} HTML
	 */
	CollectTip: (need, resource) => [EventCockpit.Tips.HarvestTip(need, resource), EventCockpit.Tips.SellTip(need, resource)]
		.filter(Boolean)
		.join(`<br><em>${i18n('Boxes.EventCockpit.Or')}</em><br>`),


	/**
	 * Suggestions per task type. Each one gets the missing amount and the
	 * condition and returns the HTML of the suggestion, or an empty string
	 * when it has none.
	 * @type {Object<string,function(number, Object): string>}
	 */
	Solvers: {

		/**
		 * Gain population: store a building that gives population and place it again.
		 *
		 * @param {number} need missing population
		 * @returns {string} HTML
		 */
		population_gain: (need) => EventCockpit.Tips.StoreTip(need, 'population'),


		/**
		 * Gain happiness: place decorations from the inventory, which costs no
		 * kit, or else store a building that gives happiness and place it again.
		 *
		 * @param {number} need missing happiness
		 * @returns {string} HTML
		 */
		happiness_gain: (need) => [EventCockpit.Tips.InventoryTip(need), EventCockpit.Tips.StoreTip(need, 'happiness')]
			.filter(Boolean)
			.join(`<br><em>${i18n('Boxes.EventCockpit.Or')}</em><br>`),


		/**
		 * Build decorations: the task names no era, so the smallest and
		 * cheapest decoration of the build menu does it.
		 *
		 * @param {number} need decorations still to build
		 * @returns {string} HTML
		 */
		decoration_build: (need) => {
			const deco = EventCockpit.Tips.MenuDecorations(need)[0];
			if (!deco) return '';

			return HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.BuildDecoration'), {
				count: EventCockpit.Num(need),
				building: `<b>${HTML.escapeHtml(deco.name)}</b>`,
				era: i18n('Eras.' + deco.era),
				size: deco.size,
				cost: EventCockpit.Tips.CostText({ money: deco.coins * need, supplies: deco.supplies * need }),
			});
		},


		/**
		 * Spend Forge Points: into an own great building, the one closest to
		 * its next level first, or into a level of a guild chain.
		 *
		 * @param {number} need Forge Points still to spend
		 * @returns {string} HTML
		 */
		fp_spend: (need) => {
			const tips = EventCockpit.Tips,
				buildings = tips.OwnGreatBuildings(need).slice(0, tips.MaxChoices),
				names = buildings.map(gb => tips.BuildingLink(gb.id, `${HTML.escapeHtml(gb.name)} (${HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.FPLeft'), { fp: EventCockpit.Num(gb.left), level: gb.level + 1 })})`)),
				stock = tips.FPStock();

			if (names.length === 0) return `${HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.SpendFPChain'), { fp: EventCockpit.Num(need) })} ${stock}`;

			return HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.SpendFP'), { fp: EventCockpit.Num(need), building: names[0] })
				+ (names.length > 1 ? ' ' + HTML.i18nReplacer(i18n('Boxes.EventCockpit.Tip.Alternatives'), { buildings: names.slice(1).join(', ') }) : '')
				+ ' ' + stock;
		},


		/**
		 * Collect supplies: the harvest of the own buildings, or else build a
		 * decoration and sell it again.
		 *
		 * @param {number} need supplies still to collect
		 * @returns {string} HTML
		 */
		supplies_collect: (need) => EventCockpit.Tips.CollectTip(need, 'supplies'),


		/**
		 * Collect coins: the harvest of the own buildings, or else build a
		 * decoration and sell it again.
		 *
		 * @param {number} need coins still to collect
		 * @returns {string} HTML
		 */
		coins_collect: (need) => EventCockpit.Tips.CollectTip(need, 'money'),


		/**
		 * Finish productions in production buildings of the own era.
		 *
		 * @param {number} need productions still to finish
		 * @returns {string} HTML
		 */
		production_own: (need) => EventCockpit.Tips.ProductionTip(need, 0),


		/**
		 * Finish productions in production buildings of the previous era.
		 *
		 * @param {number} need productions still to finish
		 * @returns {string} HTML
		 */
		production_previous: (need) => EventCockpit.Tips.ProductionTip(need, -1),


		/**
		 * Motivate or polish buildings of other players.
		 *
		 * @param {number} need motivations still missing
		 * @returns {string} HTML
		 */
		motivate: (need) => EventCockpit.Tips.MotivateTip(need),


		/**
		 * Finish productions of a given duration in any production building.
		 *
		 * @param {number} need productions still to finish
		 * @param {Object} condition condition with the duration in its wording
		 * @returns {string} HTML
		 */
		production_duration: (need, condition) => {
			const hours = Number((condition.description || '').match(EventCockpit.Tips.Hours[MainParser.Language])?.[1]);
			return hours ? EventCockpit.Tips.ProductionTip(need, null, hours * 3600) : '';
		},
	},


	/**
	 * Suggestion for an open task.
	 *
	 * @param {Object} condition success condition of a quest
	 * @returns {string} HTML, empty without a suggestion
	 */
	Render: (condition) => {
		const solver = EventCockpit.Tips.Solvers[EventCockpit.Tips.Classify(condition)],
			need = condition.maxProgress - (condition.currentProgress || 0);

		if (!solver || need <= 0) return '';

		let text = '';
		try {
			text = solver(need, condition);
		} catch (e) {
			console.error(e);
		}
		return text ? `<div class="ec-tip">${text}</div>` : '';
	},
};
