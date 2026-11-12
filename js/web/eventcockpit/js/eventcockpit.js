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

// current step of the grand prize and the event pass: sent with the event window and after every progress
FoEproxy.addHandler('EventPassService', 'getPreview', (data) => {
	EventCockpit.SetPrizes(data.responseData);
});

// daily event tasks: the overview comes with the event window, progress pushes ride on the request that caused them
FoEproxy.addHandler('TimedTasksService', 'all', (data, postData) => {
	if (EventCockpit.IsForeignContext(postData)) return;
	EventCockpit.SetTasks(data.requestMethod, data.responseData);
});

// league of the event and the own points
FoEproxy.addHandler('LeagueService', 'getRank', (data, postData) => {
	if (EventCockpit.IsForeignContext(postData)) return;
	EventCockpit.SetLeague(data.responseData);
});

// stakes of the wheel mini game with their costs and grand prize points
FoEproxy.addHandler('FortuneWheelService', 'getFortuneWheel', (data, postData) => {
	if (EventCockpit.IsForeignContext(postData)) return;
	EventCockpit.SetStakes(data.responseData?.spins);
});

FoEproxy.addFoeHelperHandler('QuestsUpdated', () => EventCockpit.Refresh());
FoEproxy.addFoeHelperHandler('ResourcesUpdated', () => EventCockpit.Refresh());


/**
 * @typedef EventCockpitState
 * @property {string} eventId id of the event the data belongs to
 * @property {number} [updated] server time of the last update
 * @property {{type: string, current: number, need: number, reward: string, unlocked: boolean}[]} [prizes]
 *           current step of the grand prize and of the event passes
 * @property {number} [claimable] prizes waiting to be collected
 * @property {{resetAt: number, threshold: number, multiplier: number, slots: Object[]}} [tasks] daily tasks
 * @property {{name: string, points: number}} [league] own league and points
 * @property {{amount: number, resource: string, cost: number, gain: number}[]} [stakes]
 *           stakes of the mini game: costs and grand prize points
 */

/**
 * Event cockpit: everything about the running seasonal event in one box - the
 * remaining time, the event currencies, the progress towards the next grand
 * prize, the daily tasks, the event quests with their milestones and the league.
 * The event itself comes from the feature flags of the page, the quests and
 * the stock from the game start, everything else from the event window. That
 * part is remembered per player, so the box also shows it after a reload.
 * @namespace
 */
let EventCockpit = {

	/**
	 * Main currency per event (event id without "_event"), as the game client defines it.
	 * @type {Object<string,string>}
	 */
	MainCurrency: {
		anniversary: 'anniversary_energy',
		arthur: 'arthur_event_royal_favor',
		care: 'care_worker',
		fall: 'fall_tickets',
		fellowship: 'fellowship_gems',
		halloween: 'halloween_ticket',
		history: 'history_coins',
		pirate: 'pirate_doubloon',
		st_patricks: 'st_patricks_pot_of_gold',
		viking: 'viking_event_ticket',
		wildlife: 'wildlife_tickets',
		winter: 'winter_wooden_bells',
	},

	/** @type {{id: string, expiresAt: number}|null|undefined} running event, undefined until the feature flags were read */
	Event: undefined,

	/** @type {?EventCockpitState} remembered event data of the running event */
	State: null,

	/** @type {?number} timeout id of the debounced refresh */
	RefreshTimer: null,

	/** @type {?number} interval id of the countdowns while the box is open */
	Ticker: null,

	/** @type {number} largest budget the stake calculation walks through unit by unit */
	StakeLimit: 5000,


	/**
	 * Opens the box (or closes an already open one).
	 */
	init: () => {
		if ($('#eventCockpit').length !== 0) {
			HTML.CloseOpenBox('eventCockpit');
			return;
		}

		HTML.AddCssFile('eventcockpit');

		HTML.Box({
			id: 'eventCockpit',
			title: i18n('Boxes.EventCockpit.Title'),
			auto_close: true,
			dragdrop: true,
			minimize: true,
			resize: true,
		});

		EventCockpit.Render();

		clearInterval(EventCockpit.Ticker);
		EventCockpit.Ticker = setInterval(EventCockpit.Tick, 1000);
	},


	/**
	 * Running seasonal event from the feature flags the game page starts with.
	 *
	 * @returns {?{id: string, expiresAt: number}} event, null when none is running
	 */
	GetEvent: () => {
		if (EventCockpit.Event === undefined) {
			$('script').each((i, script) => {
				const match = (script.innerHTML || '').match(/featureFlags:\s*(.*?),\n/);
				if (!match) return;
				try {
					const now = GameTime.get(),
						flag = JSON.parse(match[1]).features.find(f => f.group === 'seasonal_event' && f.expiresAt > now && !(f.startsAt > now));
					EventCockpit.Event = flag ? { id: flag.feature, expiresAt: flag.expiresAt } : null;
				} catch (e) {
					console.error(e);
				}
			});
			// a fully loaded page without feature flags is not searched again
			if (EventCockpit.Event === undefined && document.readyState === 'complete') EventCockpit.Event = null;
		}

		const event = EventCockpit.Event;
		return event && event.expiresAt > GameTime.get() ? event : null;
	},


	/**
	 * Whether a response belongs to another event than the running one: its
	 * request names an event context as first argument.
	 *
	 * @param {Object[]} postData requests of the response
	 * @returns {boolean} True for a foreign event context.
	 */
	IsForeignContext: (postData) => {
		const context = postData?.[0]?.requestData?.[0];
		return typeof context === 'string' && /_event$/.test(context) && context !== EventCockpit.GetEvent()?.id;
	},


	/**
	 * Remembered data of the running event, loaded from the local storage on first use.
	 *
	 * @returns {?EventCockpitState} state, null without a running event
	 */
	GetState: () => {
		const event = EventCockpit.GetEvent();
		if (!event) return null;

		if (EventCockpit.State?.eventId !== event.id) {
			let stored = null;
			try {
				stored = JSON.parse(localStorage.getItem('EventCockpit_' + ExtPlayerID));
			} catch (e) {
				stored = null;
			}
			EventCockpit.State = stored?.eventId === event.id ? stored : { eventId: event.id };
		}
		return EventCockpit.State;
	},


	/**
	 * Merges new data into the state, saves it and refreshes the display.
	 *
	 * @param {Object} changes fields of {@link EventCockpitState}
	 */
	Update: (changes) => {
		const state = EventCockpit.GetState();
		if (!state) return;

		Object.assign(state, changes, { updated: GameTime.get() });
		localStorage.setItem('EventCockpit_' + ExtPlayerID, JSON.stringify(state));
		EventCockpit.Refresh();
	},


	/**
	 * Takes over the current step of the grand prize and the event passes.
	 *
	 * @param {Object} preview response of EventPassService.getPreview
	 */
	SetPrizes: (preview) => {
		if (preview?.context !== EventCockpit.GetEvent()?.id) return;

		const unlocked = Object.fromEntries((preview.types || []).map(type => [type.type, type.unlocked === true]));

		EventCockpit.Update({
			claimable: preview.claimablePrizes || 0,
			prizes: (preview.teaserPrizes?.grandPrizes || []).map(prize => ({
				type: prize.type,
				current: prize.currentPoints || 0,
				need: prize.totalNeedPoints || 0,
				reward: prize.reward?.name || '',
				unlocked: unlocked[prize.type] === true,
			})),
		});
	},


	/**
	 * Takes over the daily tasks or the progress of a single one.
	 *
	 * @param {string} method getOverview, claimReward or pushTaskProgress
	 * @param {Object} response response data
	 */
	SetTasks: (method, response) => {
		const state = EventCockpit.GetState();
		if (!state) return;

		if (method === 'pushTaskProgress') {
			const slot = state.tasks?.slots.find(s => s.type === response?.slotType);
			if (!slot) return;
			// the server omits zero values
			slot.current = response.currentProgress || 0;
			EventCockpit.Update({});
			return;
		}

		if (!Array.isArray(response?.slots)) return;

		EventCockpit.Update({
			tasks: {
				resetAt: response.resetAt || 0,
				threshold: response.rewardMultiplierThreshold || 0,
				multiplier: response.rewardMultiplier || 1,
				slots: response.slots.map(slot => ({
					type: slot.type,
					done: slot.completedTasks || 0,
					max: slot.maxTasks || 0,
					text: slot.task?.description || '',
					current: slot.task?.currentProgress || 0,
					need: slot.task?.requiredProgress || 0,
					reward: slot.task?.reward?.name || '',
					factor: slot.rewardMultiplier || 1,
				})),
			},
		});
	},


	/**
	 * Takes over the own league and points.
	 *
	 * @param {Object} rank response of LeagueService.getRank
	 */
	SetLeague: (rank) => {
		if (!rank?.leagueName) return;
		EventCockpit.Update({ league: { name: rank.leagueName, points: rank.points || 0 } });
	},


	/**
	 * Takes over the stakes of the mini game. Only stakes paid with a single resource are used.
	 *
	 * @param {Object[]} spins stakes with amount, cost and gpGain
	 */
	SetStakes: (spins) => {
		if (!Array.isArray(spins)) return;

		const stakes = [];
		for (const spin of spins) {
			const cost = Object.entries(spin.cost?.resources || {});
			if (cost.length !== 1 || !(cost[0][1] > 0) || !(spin.gpGain > 0)) continue;
			stakes.push({ amount: spin.amount || 1, resource: cost[0][0], cost: cost[0][1], gain: spin.gpGain });
		}
		EventCockpit.Update({ stakes });
	},


	/**
	 * Daily tasks as long as they are still valid (not reset yet).
	 *
	 * @param {?EventCockpitState} state event data
	 * @returns {?Object} tasks, null when unknown or reset
	 */
	ValidTasks: (state) => state?.tasks?.resetAt > GameTime.get() ? state.tasks : null,


	/**
	 * Event quests of the running event, split into the milestone counters
	 * (one condition counting solved quests) and the open quests.
	 *
	 * @param {string} eventId id of the running event
	 * @returns {{solved: number, milestones: Object[], open: Object[]}} quest data
	 */
	GetQuests: (eventId) => {
		const quests = (MainParser.Quests || []).filter(quest => quest.category === 'events' && quest.context === eventId),
			isCounter = (quest) => quest.successConditions?.length === 1 && quest.successConditions[0].iconType === 'quest',
			counters = quests.filter(isCounter);

		return {
			solved: Math.max(0, ...counters.map(quest => quest.successConditions[0].currentProgress || 0)),
			milestones: counters
				.filter(quest => quest.state !== 'closed')
				.map(quest => ({ at: quest.successConditions[0].maxProgress, reward: EventCockpit.RewardNames(quest) }))
				.sort((a, b) => a.at - b.at),
			open: quests.filter(quest => !isCounter(quest) && quest.state !== 'closed'),
		};
	},


	/**
	 * Names of the rewards of a quest.
	 *
	 * @param {Object} quest quest of the game
	 * @returns {string} reward names, comma separated
	 */
	RewardNames: (quest) => (quest.genericRewards || []).map(reward => reward.name).filter(Boolean).join(', '),


	/**
	 * Resources shown for the event: the main currency first, then the
	 * resources the mini game and the event shops are paid with.
	 *
	 * @param {{id: string}} event running event
	 * @param {?EventCockpitState} state event data
	 * @returns {string[]} resource ids
	 */
	GetResources: (event, state) => {
		const known = new Set((FHResourcesList || []).filter(r => r.abilities?.eventResource?.eventId === event.id).map(r => r.id)),
			ids = [EventCockpit.MainCurrency[event.id.replace(/_event$/, '')], ...(state?.stakes || []).map(stake => stake.resource)];

		for (const shop of Object.values(shopAssist?.shopMeta || {})) {
			if (shop?.eventId === event.id) ids.push(...(shop.resources || []));
		}
		return [...new Set(ids)].filter(id => known.has(id));
	},


	/**
	 * Display name of a resource.
	 *
	 * @param {string} id resource id
	 * @returns {string} name
	 */
	ResourceName: (id) => GoodsData?.[id]?.name || (FHResourcesList || []).find(r => r.id === id)?.name || id,


	/**
	 * Most grand prize points per budget for the stakes of the mini game
	 * (unbounded knapsack). A budget above the limit is first spent on the
	 * stake with the best ratio.
	 *
	 * @param {Object[]} stakes stakes of one resource
	 * @param {number} budget stock of that resource
	 * @returns {{gain: number, picks: Object<number,number>, table: number[]}} points, number of stakes
	 *          by amount and the best points for every budget up to the limit
	 */
	BestStakes: (stakes, budget) => {
		const picks = {},
			best = stakes.reduce((a, b) => (b.gain / b.cost > a.gain / a.cost ? b : a));
		let gain = 0;

		if (budget > EventCockpit.StakeLimit) {
			const count = Math.ceil((budget - EventCockpit.StakeLimit) / best.cost);
			picks[best.amount] = count;
			gain = count * best.gain;
			budget -= count * best.cost;
		}

		const size = Math.max(0, Math.floor(budget)),
			table = new Array(size + 1).fill(0),
			choice = new Array(size + 1).fill(null);

		for (let b = 1; b <= size; b++) {
			for (const stake of stakes) {
				if (stake.cost <= b && table[b - stake.cost] + stake.gain > table[b]) {
					table[b] = table[b - stake.cost] + stake.gain;
					choice[b] = stake;
				}
			}
			// leftovers that pay no further stake keep the points of the smaller budget
			if (table[b] < table[b - 1]) {
				table[b] = table[b - 1];
				choice[b] = null;
			}
		}

		for (let b = size; b > 0;) {
			if (!choice[b]) {
				b--;
				continue;
			}
			picks[choice[b].amount] = (picks[choice[b].amount] || 0) + 1;
			b -= choice[b].cost;
		}

		return { gain: gain + table[size], picks, table };
	},


	/**
	 * Smallest budget that reaches a number of grand prize points.
	 *
	 * @param {Object[]} stakes stakes of one resource
	 * @param {number} points points to reach
	 * @returns {number} resources needed
	 */
	CostForPoints: (stakes, points) => {
		const { table } = EventCockpit.BestStakes(stakes, EventCockpit.StakeLimit),
			budget = table.findIndex(gain => gain >= points);
		if (budget >= 0) return budget;

		const best = stakes.reduce((a, b) => (b.gain / b.cost > a.gain / a.cost ? b : a));
		return Math.ceil(points / best.gain) * best.cost;
	},


	/**
	 * Formats a duration for the countdowns.
	 *
	 * @param {number} seconds remaining seconds
	 * @returns {string} e.g. "7 d 19 h", "10 h 32 min" or "4:05 min"
	 */
	Duration: (seconds) => {
		const s = Math.max(0, Math.floor(seconds)),
			d = Math.floor(s / 86400),
			h = Math.floor(s % 86400 / 3600),
			m = Math.floor(s % 3600 / 60);

		if (d > 0) return HTML.i18nReplacer(i18n('Boxes.EventCockpit.DurationDays'), { d, h });
		if (h > 0) return HTML.i18nReplacer(i18n('Boxes.EventCockpit.DurationHours'), { h, m });
		return HTML.i18nReplacer(i18n('Boxes.EventCockpit.DurationMinutes'), { m, s: String(s % 60).padStart(2, '0') });
	},


	/**
	 * Formats a number like the other boxes, but keeps a zero (HTML.Format turns it into a dash).
	 *
	 * @param {number} value number
	 * @returns {string} formatted number
	 */
	Num: (value) => (value ? HTML.Format(value) : '0'),


	/**
	 * Countdown element that {@link EventCockpit.Tick} keeps running.
	 *
	 * @param {number} end server time the countdown runs to
	 * @returns {string} HTML
	 */
	Countdown: (end) => `<b class="ec-countdown" data-end="${end}">${EventCockpit.Duration(end - GameTime.get())}</b>`,


	/**
	 * Progress bar with the values on top.
	 *
	 * @param {number} current reached value
	 * @param {number} need target value
	 * @returns {string} HTML
	 */
	Bar: (current, need) => {
		const percent = need > 0 ? Math.min(100, current / need * 100) : 0;
		return `<span class="ec-bar${current >= need && need > 0 ? ' full' : ''}"><span style="width:${percent.toFixed(1)}%"></span><b>${EventCockpit.Num(current)} / ${EventCockpit.Num(need)}</b></span>`;
	},


	/**
	 * Display name of the event from its id, e.g. "halloween_event" => "Halloween".
	 *
	 * @param {string} id event id
	 * @returns {string} name
	 */
	EventName: (id) => HTML.i18nReplacer(i18n('Boxes.EventCockpit.EventName'), {
		name: id.replace(/_event$/, '').split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
	}),


	/**
	 * Things waiting to be collected: finished daily tasks and claimable prizes.
	 *
	 * @returns {number} count
	 */
	OpenCount: () => {
		const state = EventCockpit.GetState(),
			tasks = EventCockpit.ValidTasks(state);

		return (state?.claimable || 0)
			+ (tasks ? tasks.slots.filter(slot => slot.done < slot.max && slot.need > 0 && slot.current >= slot.need).length : 0);
	},


	/**
	 * Updates the counter on the menu button.
	 */
	UpdateMenuCounter: () => {
		const count = EventCockpit.OpenCount();
		$('#eventCockpit-count').text(count).toggle(count > 0);
	},


	/**
	 * Refreshes the menu counter and the open box; bundled updates are collapsed.
	 */
	Refresh: () => {
		clearTimeout(EventCockpit.RefreshTimer);
		EventCockpit.RefreshTimer = setTimeout(() => {
			EventCockpit.UpdateMenuCounter();
			if ($('#eventCockpit').length !== 0) EventCockpit.Render();
		}, 150);
	},


	/**
	 * Keeps the countdowns running, stops when the box is closed and renders
	 * again when a countdown has run out (event over, tasks reset).
	 */
	Tick: () => {
		if ($('#eventCockpit').length === 0) {
			clearInterval(EventCockpit.Ticker);
			EventCockpit.Ticker = null;
			return;
		}

		const now = GameTime.get();
		let expired = false;

		$('#eventCockpitBody .ec-countdown').each((i, el) => {
			const left = Number(el.dataset.end) - now;
			if (left <= 0) expired = true;
			el.textContent = EventCockpit.Duration(left);
		});
		if (expired) EventCockpit.Render();
	},


	/**
	 * Section with the event currencies.
	 *
	 * @param {{id: string}} event running event
	 * @param {?EventCockpitState} state event data
	 * @returns {string} HTML
	 */
	RenderResources: (event, state) => {
		const ids = EventCockpit.GetResources(event, state);
		if (ids.length === 0) return '';

		return `<div class="ec-resources">${ids.map((id, i) =>
			`<span class="ec-resource${i === 0 ? ' main' : ''}">${srcLinks.icons(id)}<b>${EventCockpit.Num(ResourceStock[id] || 0)}</b> ${HTML.escapeHtml(EventCockpit.ResourceName(id))}</span>`
		).join('')}</div>`;
	},


	/**
	 * Section with the next grand prize and the event passes.
	 *
	 * @param {EventCockpitState} state event data
	 * @returns {string} HTML
	 */
	RenderPrizes: (state) => {
		if (!state.prizes?.length) return '';

		const rows = state.prizes.map(prize => `<tr class="${prize.unlocked ? '' : 'locked'}">
				<td>${i18n('Boxes.EventCockpit.Prize.' + prize.type)}</td>
				<td>${EventCockpit.Bar(prize.current, prize.need)}</td>
				<td>${HTML.escapeHtml(prize.reward)}</td>
			</tr>`).join('');

		return `<h3>${i18n('Boxes.EventCockpit.Prizes')}${state.claimable > 0 ? `<span class="ec-ready">${HTML.i18nReplacer(i18n('Boxes.EventCockpit.Claimable'), { count: state.claimable })}</span>` : ''}</h3>
			<table class="foe-table ec-table">${rows}</table>`;
	},


	/**
	 * Section with the stakes of the mini game: what the stock is good for and
	 * what the next grand prize costs.
	 *
	 * @param {EventCockpitState} state event data
	 * @returns {string} HTML
	 */
	RenderStakes: (state) => {
		const stakes = (state.stakes || []).filter(stake => stake.resource === state.stakes[0].resource);
		if (stakes.length === 0) return '';

		const resource = stakes[0].resource,
			icon = srcLinks.icons(resource),
			bestRatio = Math.max(...stakes.map(stake => stake.gain / stake.cost)),
			stock = ResourceStock[resource] || 0,
			reach = EventCockpit.BestStakes(stakes, stock),
			prize = (state.prizes || []).find(p => p.unlocked),
			missing = prize ? prize.need - prize.current : 0,
			stakeName = (amount) => HTML.i18nReplacer(i18n('Boxes.EventCockpit.StakeName'), { amount });

		const rows = stakes.map(stake => `<tr>
				<td>${stakeName(stake.amount)}</td>
				<td class="text-right">${EventCockpit.Num(stake.cost)}${icon}</td>
				<td class="text-right">+${EventCockpit.Num(stake.gain)}</td>
				<td class="text-right${stake.gain / stake.cost === bestRatio ? ' best' : ''}">${(stake.gain / stake.cost).toFixed(2)}</td>
			</tr>`).join('');

		const picks = Object.entries(reach.picks).sort((a, b) => b[0] - a[0]).map(([amount, count]) => `${EventCockpit.Num(count)}× ${stakeName(amount)}`).join(', ');
		let summary = reach.gain > 0
			? HTML.i18nReplacer(i18n('Boxes.EventCockpit.Reach'), { points: EventCockpit.Num(reach.gain), picks })
			: i18n('Boxes.EventCockpit.ReachNothing');

		if (missing > 0) {
			summary += '<br>' + HTML.i18nReplacer(i18n('Boxes.EventCockpit.NextPrizeCost'), {
				points: EventCockpit.Num(missing),
				cost: `<span class="ec-nowrap">${EventCockpit.Num(EventCockpit.CostForPoints(stakes, missing))}${icon}</span>`,
			});
		}

		return `<h3>${i18n('Boxes.EventCockpit.Stakes')}</h3>
			<table class="foe-table ec-table ec-stakes">
				<tr><th>${i18n('Boxes.EventCockpit.Stake')}</th><th class="text-right">${i18n('Boxes.EventCockpit.Cost')}</th><th class="text-right">${i18n('Boxes.EventCockpit.Points')}</th><th class="text-right">${i18n('Boxes.EventCockpit.Ratio')}</th></tr>
				${rows}
			</table>
			<p class="ec-note">${summary}</p>`;
	},


	/**
	 * Section with the daily tasks.
	 *
	 * @param {EventCockpitState} state event data
	 * @returns {string} HTML
	 */
	RenderTasks: (state) => {
		if (!state.tasks) return '';

		const tasks = EventCockpit.ValidTasks(state),
			head = `<h3>${i18n('Boxes.EventCockpit.Tasks')}`;

		if (!tasks) return `${head}</h3><p class="ec-note">${i18n('Boxes.EventCockpit.TasksReset')}</p>`;

		const done = tasks.slots.reduce((sum, slot) => sum + slot.done, 0),
			total = tasks.slots.reduce((sum, slot) => sum + slot.max, 0);

		const rows = tasks.slots.map(slot => {
			if (slot.done >= slot.max || slot.need === 0) {
				return `<tr class="done"><td colspan="3">✓ ${i18n('Boxes.EventCockpit.TaskDone')}</td><td class="text-right">${slot.done}/${slot.max}</td></tr>`;
			}
			const ready = slot.current >= slot.need,
				factor = slot.factor > 1 ? `${slot.factor}× ` : '';
			return `<tr class="${ready ? 'ready' : ''}">
					<td>${HTML.escapeHtml(slot.text)}${ready ? `<span class="ec-ready">${i18n('Boxes.EventCockpit.TaskReady')}</span>` : ''}</td>
					<td>${EventCockpit.Bar(slot.current, slot.need)}</td>
					<td>${factor}${HTML.escapeHtml(slot.reward)}</td>
					<td class="text-right">${slot.done}/${slot.max}</td>
				</tr>`;
		}).join('');

		let bonus = '';
		if (tasks.threshold > 0 && tasks.multiplier > 1) {
			bonus = `<p class="ec-note">${HTML.i18nReplacer(i18n(done >= tasks.threshold ? 'Boxes.EventCockpit.BonusActive' : 'Boxes.EventCockpit.BonusPending'), {
				factor: tasks.multiplier,
				count: tasks.threshold,
				left: Math.max(0, tasks.threshold - done),
			})}</p>`;
		}

		return `${head}<span class="ec-sub">${HTML.i18nReplacer(i18n('Boxes.EventCockpit.TasksHead'), { done, total, time: EventCockpit.Countdown(tasks.resetAt) })}</span></h3>
			<table class="foe-table ec-table">${rows}</table>${bonus}`;
	},


	/**
	 * Section with the event quests: solved quests, upcoming milestones and the open quests.
	 *
	 * @param {{id: string}} event running event
	 * @returns {string} HTML
	 */
	RenderQuests: (event) => {
		const quests = EventCockpit.GetQuests(event.id);
		if (quests.milestones.length === 0 && quests.open.length === 0) return '';

		const milestones = quests.milestones.map(milestone => `<tr>
				<td>${EventCockpit.Bar(quests.solved, milestone.at)}</td>
				<td>${HTML.escapeHtml(milestone.reward)}</td>
			</tr>`).join('');

		const open = quests.open.map(quest => {
			const conditions = quest.successConditions || [],
				groups = (quest.successConditionGroups?.length ? quest.successConditionGroups : [{ conditionIds: conditions.map(c => c.id) }]);

			const lines = groups.map(group => group.conditionIds
				.map(id => conditions.find(c => c.id === id))
				.filter(Boolean)
				.map(c => {
					const current = c.currentProgress || 0;
					return `<span class="${current >= c.maxProgress ? 'met' : ''}">${HTML.escapeHtml(c.description || '')} (${EventCockpit.Num(current)}/${EventCockpit.Num(c.maxProgress)})</span>`;
				})
				.join(` <em>${i18n('Boxes.EventCockpit.Or')}</em> `)
			).filter(Boolean).join('<br>');

			return `<tr>
					<td><b>${HTML.escapeHtml(quest.title || '')}</b><br>${lines}</td>
					<td>${HTML.escapeHtml(EventCockpit.RewardNames(quest))}</td>
				</tr>`;
		}).join('');

		return `<h3>${i18n('Boxes.EventCockpit.Quests')}<span class="ec-sub">${HTML.i18nReplacer(i18n('Boxes.EventCockpit.QuestsSolved'), { count: quests.solved })}</span></h3>
			<table class="foe-table ec-table">${open}${milestones ? `<tr><th colspan="2">${i18n('Boxes.EventCockpit.Milestones')}</th></tr>${milestones}` : ''}</table>`;
	},


	/**
	 * Fills the box.
	 */
	Render: () => {
		const event = EventCockpit.GetEvent(),
			$body = $('#eventCockpitBody');

		if (!event) {
			$body.html(`<p class="ec-empty">${i18n('Boxes.EventCockpit.NoEvent')}</p>`);
			return;
		}

		const state = EventCockpit.GetState(),
			windowData = state.prizes || state.tasks || state.league || state.stakes;

		$body.html(`<div class="ec-head">
				<span class="ec-name">${HTML.escapeHtml(EventCockpit.EventName(event.id))}</span>
				<span class="ec-ends">${HTML.i18nReplacer(i18n('Boxes.EventCockpit.EndsIn'), { time: EventCockpit.Countdown(event.expiresAt), date: moment.unix(event.expiresAt).format('L LT') })}</span>
			</div>
			${EventCockpit.RenderResources(event, state)}
			<div class="ec-sections">
				${EventCockpit.RenderPrizes(state)}
				${EventCockpit.RenderStakes(state)}
				${EventCockpit.RenderTasks(state)}
				${EventCockpit.RenderQuests(event)}
				${state.league ? `<h3>${i18n('Boxes.EventCockpit.League')}<span class="ec-sub">${HTML.escapeHtml(state.league.name)} · ${HTML.i18nReplacer(i18n('Boxes.EventCockpit.LeaguePoints'), { points: EventCockpit.Num(state.league.points) })}</span></h3>` : ''}
			</div>
			<p class="ec-foot">${windowData
				? HTML.i18nReplacer(i18n('Boxes.EventCockpit.Updated'), { time: moment.unix(state.updated).format('LT') })
				: i18n('Boxes.EventCockpit.OpenEventWindow')}</p>`);
	},
};
