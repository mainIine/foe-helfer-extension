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

{
	// every message is captured the moment it arrives — grouped per thread —
	// no matter whether the thread is open ingame: opening a thread delivers
	// its recent messages via XHR, background threads push getConversation /
	// getNewMessage over the WebSocket; the persisted state is restored before
	// the first capture so nothing gets lost between sessions
	const captureConversation = (data) => {
		const d = data.responseData;
		if (!d || !Array.isArray(d['messages'])) return null;

		Checklist.Load();
		for (const msg of d['messages']) {
			Checklist.CaptureMessage(msg, d['id'], d['title']);
		}
		Checklist.Sync();
		return d;
	};

	const onNewMessage = (data) => {
		const d = data.responseData;
		if (!d || d['conversationId'] === undefined) return;

		Checklist.Load();
		Checklist.CaptureMessage(d, d['conversationId'], null);
		Checklist.Sync();
	};

	// the XHR response is the user actually opening a thread ingame
	FoEproxy.addHandler('ConversationService', 'getConversation', (data) => {
		const d = captureConversation(data);
		if (d) Checklist.HandleThreadOpened(d['id']);
	});
	FoEproxy.addWsHandler('ConversationService', 'getConversation', captureConversation);
	FoEproxy.addHandler('ConversationService', 'getNewMessage', onNewMessage);
	FoEproxy.addWsHandler('ConversationService', 'getNewMessage', onNewMessage);

	/**
	 * The response of sending is the player's own message. It is captured like
	 * any other one; only this own message can open the list of claimed places
	 * (opt-in), messages of other players never trigger anything.
	 * @param {{responseData: ?Object}} data response entry of sendMessage / replyToMessage
	 */
	const onSent = (data) => {
		const d = data.responseData;
		if (!d || d['conversationId'] === undefined) return;

		onNewMessage({responseData: {date: Date.now(), ...d, sender: {name: ExtPlayerName, ...d['sender'], player_id: ExtPlayerID}}});
		if (Checklist.AutoClaims) Checklist.ShowClaims(Checklist.FindMessage(`${d['conversationId']}-${d['id']}`), true);
	};

	FoEproxy.addHandler('ConversationService', 'sendMessage', onSent);
	FoEproxy.addHandler('ConversationService', 'replyToMessage', onSent);
}


/**
 * @typedef ChecklistMessage
 * @property {string} key unique key (`conversationId-messageId`)
 * @property {number} seq capture sequence number (sort tiebreaker)
 * @property {string} sender sender name
 * @property {?number} time message timestamp in ms (null when unknown)
 * @property {string} text raw message text (claim list: one `label<TAB>taken places` per line)
 * @property {boolean} [own] written by the player
 * @property {boolean} [claimed] list of the places the player claimed with the message of the same key
 */

/**
 * @typedef ChecklistClaim
 * @property {string} label owner and building of the entry
 * @property {string} taken place tokens the player removed (empty for a plain line)
 */

/**
 * @typedef ChecklistThread
 * @property {string} cid conversation id
 * @property {string} title thread title (empty when unknown)
 * @property {ChecklistMessage[]} messages newest first, capped at MaxPerThread
 */

/**
 * Turns a picked ingame message into a checklist: the box lists the recently
 * captured messages grouped by thread, a click converts the lines of the
 * chosen message into checkboxes — e.g. to tick off great building spots that
 * other players have already taken. The places the player claimed with an own
 * message (diff against the message before it) become a checklist as well.
 * Everything works on messages the game delivered anyway, nothing is sent.
 * @namespace
 */
let Checklist = {

	/** @type {Object<string,ChecklistThread>} conversation id => thread group */
	Groups: {},

	/** @type {number} maximum number of messages kept per thread */
	MaxPerThread: 5,

	/** @type {number} messages kept before the player's latest one (base of the claimed places) */
	BaseDepth: 2,

	/** @type {number} maximum number of threads kept */
	MaxThreads: 15,

	/** @type {number} monotonic capture counter, tiebreaker for the sorting */
	Seq: 0,

	/** @type {?string} key of the currently selected message (null = picker) */
	CurrentKey: null,

	/** @type {Object<string,number[]>} message key => indexes of checked lines */
	Checked: {},

	/** @type {boolean} true once the persisted state has been restored */
	Loaded: false,

	/** @type {boolean} global setting: open the box automatically with a message thread */
	AutoOpen: true,

	/** @type {boolean} global setting: list the claimed places when the player sends a message */
	AutoClaims: false,

	/** @type {?string} hint shown above the picker (html, session only) */
	Notice: null,

	/** @type {RegExp} token made of reward places only: "P5", "5", "#3", "P5(120)", "5/4/3" */
	PlaceToken: /^(?:[p#]?[1-7](?:\([^)]*\)?|[:=]\d+)?(?:[,;\/+&|]|$))+$/i,

	/** @type {RegExp} single place of a place token (group 1: place number) */
	PlacePart: /[p#]?([1-7])(?:\([^)]*\)?|[:=]\d+)?/gi,

	/** @type {RegExp} line without content, e.g. the "--" or "x" of a used up list */
	Filler: /^(?:[\p{Pd}._=*~\s]+|x)$/iu,

	/** @type {?string} conversation id of the thread last opened ingame */
	ActiveThread: null,

	/** @type {Object<string,boolean>} conversation id => picker group expanded (session only) */
	Expanded: {},

	/** @type {Object<string,string>} conversation id => title of a thread excluded from the checklist */
	Ignored: {},


	/**
	 * Menu button: opens the box (or closes an already open one).
	 */
	init: () => {
		if ($('#checklist').length !== 0) {
			HTML.CloseOpenBox('checklist');
			return;
		}

		Checklist.Load();
		Checklist.OpenBox();
	},


	/**
	 * Creates the box itself.
	 */
	OpenBox: () => {
		HTML.AddCssFile('checklist');
		Checklist.Notice = null;

		HTML.Box({
			id: 'checklist',
			title: i18n('Boxes.Checklist.Title'),
			auto_close: true,
			dragdrop: true,
			minimize: true,
			resize: true,
			settings: () => Checklist.ShowSettings()
		});

		Checklist.BuildBox();
	},


	/**
	 * Called when a message thread is opened ingame: brings its group to the
	 * top of the picker and opens the box automatically (global setting).
	 * @param {number|string|undefined} conversationId id of the opened thread
	 */
	HandleThreadOpened: (conversationId) => {
		if (conversationId === undefined || Checklist.Ignored[String(conversationId)]) return;

		Checklist.ActiveThread = String(conversationId);
		Checklist.Expanded[Checklist.ActiveThread] = true;

		if ($('#checklist').length === 0) {
			if (Checklist.AutoOpen && Checklist.Groups[Checklist.ActiveThread]) {
				Checklist.OpenBox();
			}
		}
		else if (Checklist.CurrentKey === null) {
			Checklist.Render();
		}
	},


	/**
	 * Creates the box skeleton and wires all click handlers via delegation,
	 * so the views can simply be re-rendered.
	 */
	BuildBox: () => {
		$('#checklistBody').append(
			$('<div />').attr('id', 'checklistTopbar'),
			$('<div />').attr('id', 'checklistInner')
				.on('click', '.thread-ignore', (e) => {
					e.stopPropagation();
					Checklist.IgnoreThread(String($(e.currentTarget).data('cid')));
				})
				.on('click', '.thread-head', (e) => {
					const cid = String($(e.currentTarget).data('cid'));
					Checklist.Expanded[cid] = !Checklist.IsExpanded(cid);
					Checklist.Render();
				})
				.on('click', '.checklist-pick', (e) => {
					Checklist.SelectMessage(String($(e.currentTarget).data('key')));
				})
				.on('change', '.checklist-line input', (e) => {
					Checklist.ToggleLine(Number($(e.currentTarget).data('index')), e.currentTarget.checked);
				}),
			$('<div />').attr('id', 'checklistBottombar')
		);

		Checklist.Render();
	},


	/**
	 * Title of a captured thread as shown in the box; threads without one go by their first writer.
	 * @param {?ChecklistThread} group
	 * @returns {string}
	 */
	GroupTitle: (group) => {
		return group?.title || group?.messages[0]?.sender || '?';
	},


	/**
	 * Resolves the title of a conversation from the shared header cache that
	 * the extension maintains for the ingame message center.
	 * @param {string} cid conversation id
	 * @returns {string} title (empty when unknown)
	 */
	ThreadTitle: (cid) => {
		if (MainParser.Conversations.length === 0) {
			const stored = localStorage.getItem('ConversationsHeaders');
			if (stored !== null) MainParser.Conversations = JSON.parse(stored);
		}

		const header = MainParser.Conversations.find(c => String(c.id) === cid);
		return header?.title || '';
	},


	/**
	 * Stores a single message in its thread group (deduplicated by conversation
	 * and message id, edited messages update their text).
	 * @param {?Object} msg message object of a ConversationService response
	 * @param {number|string|undefined} conversationId id of the surrounding conversation
	 * @param {?string} title thread title (resolved from the header cache when null)
	 */
	CaptureMessage: (msg, conversationId, title) => {
		if (!msg || conversationId === undefined || msg['id'] === undefined) return;

		const cid = String(conversationId);
		if (Checklist.Ignored[cid]) return;

		const key = cid + '-' + msg['id'];
		const group = Checklist.Groups[cid] || {cid: cid, title: '', messages: []};

		group.title = title || group.title || Checklist.ThreadTitle(cid);

		// a meanwhile deleted message disappears from the picker as well
		if (msg['deleted']) {
			group.messages = group.messages.filter(m => m.key !== key);
			if (group.messages.length > 0) Checklist.Groups[cid] = group;
			return;
		}

		const text = String(msg['text'] || '').trim();
		if (text === '') return;

		const existing = group.messages.find(m => m.key === key);
		const entry = existing || {key: key, seq: ++Checklist.Seq};

		entry.sender = msg['sender']?.['name'] || entry.sender || '';
		entry.time = Checklist.NormalizeTime(msg['date']) ?? entry.time ?? null;
		entry.text = text;
		entry.own = msg['sender']?.['player_id'] === ExtPlayerID;

		if (!existing) group.messages.push(entry);
		group.title = group.title || entry.sender;
		Checklist.Groups[cid] = group;
	},


	/**
	 * Converts the `date` field of a message into a ms timestamp. The game
	 * sends localized strings like "today at 10:36" — ParseDate handles them.
	 * @param {number|string|undefined} date epoch (s or ms) or a date string
	 * @returns {?number}
	 */
	NormalizeTime: (date) => {
		if (date === undefined || date === null) return null;

		if (typeof date === 'number') {
			return date < 1e12 ? date * 1000 : date;
		}

		if (typeof EventHandler !== 'undefined') {
			const parsed = EventHandler.ParseDate(String(date));
			if (parsed) return parsed.getTime();
		}

		const parsed = moment(date);
		return parsed.isValid() ? parsed.valueOf() : null;
	},


	/**
	 * Numeric id of a message, read from its key. The ids grow with every
	 * message, so they give the exact order where the minute-based dates tie.
	 * @param {ChecklistMessage} msg
	 * @returns {number} NaN when the key carries no id
	 */
	MessageId: (msg) => {
		return parseInt(msg.key.slice(msg.key.lastIndexOf('-') + 1), 10);
	},


	/**
	 * Sorting for messages: newest first, for equal or unparseable timestamps
	 * the message id decides, the capture order is the last resort (a claim
	 * list shares time and id with its message and sorts right above it).
	 * @param {ChecklistMessage} a
	 * @param {ChecklistMessage} b
	 * @returns {number}
	 */
	CompareMessages: (a, b) => {
		return (b.time || 0) - (a.time || 0)
			|| Checklist.MessageId(b) - Checklist.MessageId(a)
			|| (b.seq || 0) - (a.seq || 0);
	},


	/**
	 * Newest message timestamp of a thread group.
	 * @param {ChecklistThread} group
	 * @returns {number}
	 */
	GroupTime: (group) => {
		return group.messages.reduce((max, m) => Math.max(max, m.time || 0), 0);
	},


	/**
	 * Thread groups sorted for the picker: the ingame opened thread first,
	 * the others by their newest message.
	 * @returns {ChecklistThread[]}
	 */
	SortedGroups: () => {
		const newest = (group) => group.messages.reduce((max, m) => Math.max(max, m.seq || 0), 0);

		return Object.values(Checklist.Groups).sort((a, b) => {
			if (a.cid === Checklist.ActiveThread) return -1;
			if (b.cid === Checklist.ActiveThread) return 1;
			return Checklist.GroupTime(b) - Checklist.GroupTime(a) || newest(b) - newest(a);
		});
	},


	/**
	 * Caps the messages of a thread: the newest ones stay, in addition the
	 * player's latest message with the ones right before it (so the claimed
	 * places can still be derived in a busy thread) and the newest claim lists.
	 * @param {ChecklistMessage[]} messages sorted newest first
	 * @returns {ChecklistMessage[]}
	 */
	Trim: (messages) => {
		const plain = messages.filter(m => !m.claimed);
		const own = plain.findIndex(m => m.own);
		const keep = new Set([
			...plain.slice(0, Checklist.MaxPerThread),
			...(own < 0 ? [] : plain.slice(own, own + 1 + Checklist.BaseDepth)),
			...messages.filter(m => m.claimed).slice(0, Checklist.MaxPerThread)
		]);

		return messages.filter(m => keep.has(m));
	},


	/**
	 * Sorts and trims the groups, persists everything and refreshes an open picker.
	 */
	Sync: () => {
		for (const group of Object.values(Checklist.Groups)) {
			group.messages = Checklist.Trim(group.messages.sort(Checklist.CompareMessages));
			if (group.messages.length === 0) delete Checklist.Groups[group.cid];
		}

		// oldest threads leave when there are too many (the ingame opened one stays)
		const groups = Checklist.SortedGroups();
		for (const group of groups.slice(Checklist.MaxThreads)) {
			delete Checklist.Groups[group.cid];
		}

		// drop checked states of messages that fell out of the list
		for (const key of Object.keys(Checklist.Checked)) {
			if (key !== Checklist.CurrentKey && !Checklist.FindMessage(key)) {
				delete Checklist.Checked[key];
			}
		}

		Checklist.Save();

		if ($('#checklist').length !== 0 && Checklist.CurrentKey === null) {
			Checklist.Render();
		}
	},


	/**
	 * Splits a message text into the checklist lines.
	 * @param {string} text raw message text
	 * @returns {string[]}
	 */
	SplitLines: (text) => {
		return String(text || '').split(/\r\n|\r|\n/)
			.map(line => line.trim())
			.filter(line => line !== '');
	},


	/**
	 * Reduces tokens to comparable words: only tokens with a letter count
	 * (counters, levels and emojis may change), lower case, no punctuation.
	 * @param {string[]} tokens
	 * @returns {string[]}
	 */
	Words: (tokens) => {
		return tokens.filter(t => /\p{L}/u.test(t)).map(t => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''));
	},


	/**
	 * Splits a list line into entry and reward places. Everything in front of
	 * the first word (counter, bullet, emoji) is decoration, the tokens before
	 * the first place are the entry ("owner building"); what follows the
	 * places (own part, remarks) does not belong to the entry.
	 * @param {string} line trimmed line of a message
	 * @returns {{key: string, label: string, places: {n: string, text: string}[]}} key is empty for a line without words
	 */
	ParseLine: (line) => {
		const tokens = line.split(/\s+/);
		const start = tokens.findIndex(t => /\p{L}/u.test(t));
		const body = start < 0 ? [] : tokens.slice(start);
		const isPlace = (t) => Checklist.PlaceToken.test(t);
		const first = body.findIndex(isPlace);
		const head = first > 0 ? body.slice(0, first) : body.filter(t => !isPlace(t));

		return {
			key: Checklist.Words(head).join(' '),
			label: head.join(' '),
			places: body.filter(isPlace).flatMap(t => [...t.matchAll(Checklist.PlacePart)].map(m => ({n: m[1], text: m[0]})))
		};
	},


	/**
	 * Derives what a player claimed by copying a list message and removing
	 * places: every entry that lost places, and every entry that is gone.
	 * Entries are matched by owner and building, so order, spacing, counters
	 * and emojis may differ. Lines of the player's own buildings never count,
	 * lines without places (header, footer) only in a list that has none at all.
	 * @param {string} prevText text of the message the player copied
	 * @param {string} ownText text of the player's message
	 * @param {?string} ownName name of the player
	 * @param {string[]} [others] names of other players (a longer name starting with the own one is not the player)
	 * @param {boolean} [strict] only a common line proves the copy (a used up list is no proof)
	 * @returns {?ChecklistClaim[]} null when the message is no copy of the previous one
	 */
	DiffClaims: (prevText, ownText, ownName, others = [], strict = false) => {
		const name = (text) => Checklist.Words(String(text || '').split(/\s+/)).join(' ');
		const startsWith = (key, words) => words !== '' && `${key} `.startsWith(`${words} `);
		const me = name(ownName);
		const longer = others.map(name).filter(n => n !== me && startsWith(n, me));
		const raw = String(ownName || '').trim().toLowerCase();
		// a name without any letter leaves no comparable words, it is matched as written
		const isOwn = (line) => (me !== ''
			? startsWith(line.key, me) && !longer.some(n => startsWith(line.key, n))
			: raw !== '' && `${line.label.toLowerCase()} `.startsWith(`${raw} `));

		const ownLines = Checklist.SplitLines(ownText);
		const own = ownLines.map(Checklist.ParseLine);
		const prev = Checklist.SplitLines(prevText).map(Checklist.ParseLine).filter(line => line.key !== '');
		const hasPlaces = prev.some(line => line.places.length > 0);

		const left = new Map();
		for (const line of own) {
			left.set(line.key, [...(left.get(line.key) || []), line]);
		}

		const claims = [];
		let shared = 0;

		for (const line of prev) {
			const match = left.get(line.key)?.shift();
			if (match) shared++;
			if (isOwn(line)) continue;

			const kept = match ? match.places.map(p => p.n) : [];
			const taken = line.places.filter(p => {
				const i = kept.indexOf(p.n);
				if (i >= 0) kept.splice(i, 1);
				return i < 0;
			});

			if (taken.length > 0 || (!match && !hasPlaces)) {
				claims.push({label: line.label, taken: taken.map(p => p.text).join(' ')});
			}
		}

		// without a common line it is a copy only when nothing but filler
		// ("--") or own buildings is left of a list with places
		const usedUp = !strict && hasPlaces && own.every((line, i) => Checklist.Filler.test(ownLines[i]) || isOwn(line));

		return shared > 0 || usedUp ? claims : null;
	},


	/**
	 * The newest captured message the player wrote, across all threads.
	 * @returns {?ChecklistMessage}
	 */
	LastOwnMessage: () => {
		return Object.values(Checklist.Groups).flatMap(g => g.messages)
			.filter(m => m.own)
			.sort(Checklist.CompareMessages)[0] || null;
	},


	/**
	 * Claimed places of an own message: diff against the message right before
	 * it. When that one is no list the own message was copied from (chat in
	 * between), the newest older one sharing a line with it is the base.
	 * @param {ChecklistThread} group thread of the message
	 * @param {ChecklistMessage} own message of the player
	 * @returns {?ChecklistClaim[]} null when no older message of the thread is known
	 */
	Claims: (group, own) => {
		const id = Checklist.MessageId(own);
		const older = group.messages
			.filter(m => !m.claimed && Checklist.MessageId(m) < id)
			.sort((a, b) => Checklist.MessageId(b) - Checklist.MessageId(a));
		// the writers of the captured threads count as known players too, they need not be guild members, friends or neighbours
		const names = [
			...Object.values(PlayerDict).map(p => p['PlayerName']),
			...Object.values(Checklist.Groups).flatMap(g => g.messages.map(m => m.sender))
		];

		for (const [i, base] of older.entries()) {
			// only the message right before may count as used up by the own one: behind any other message
			// (even a short "x" or thumbs up) somebody else may have taken the last places
			const claims = Checklist.DiffClaims(base.text, own.text, ExtPlayerName, names, i > 0);
			if (claims) return claims;
		}

		return older.length > 0 ? [] : null;
	},


	/**
	 * Turns the places claimed with an own message into a checklist of its
	 * thread and shows it; says why when there is nothing to list.
	 * @param {?ChecklistMessage} own message of the player (null: none captured)
	 * @param {boolean} [silent] only act when places were claimed (automatic call after sending)
	 */
	ShowClaims: (own, silent = false) => {
		const group = own && Object.values(Checklist.Groups).find(g => g.messages.includes(own));
		const claims = own && Checklist.Claims(group, own);

		if (!claims || claims.length === 0) {
			if (silent) return;

			Checklist.Notice = (group ? `<strong>${HTML.escapeHtml(Checklist.GroupTitle(group))}:</strong> ` : '')
				+ i18n(`Boxes.Checklist.${!own ? 'NoOwnMessage' : (claims ? 'NoClaims' : 'NoPrevious')}`);
			Checklist.Render();
			return;
		}

		const key = `${own.key}:claims`;
		const text = claims.map(c => `${c.label}\t${c.taken}`).join('\n');
		const entry = Checklist.FindMessage(key) || {key: key, seq: ++Checklist.Seq, claimed: true};

		// ticks of an older version of the list do not fit a changed one
		if (entry.text !== text) delete Checklist.Checked[key];
		Object.assign(entry, {sender: own.sender, time: own.time, text: text});
		if (!group.messages.includes(entry)) group.messages.push(entry);

		Checklist.Notice = null;
		Checklist.CurrentKey = key;
		Checklist.Sync();

		if ($('#checklist').length === 0) {
			Checklist.OpenBox();
		}
		else {
			Checklist.Render();
		}
	},


	/**
	 * Looks a message up across all thread groups.
	 * @param {?string} key message key
	 * @returns {?ChecklistMessage}
	 */
	FindMessage: (key) => {
		for (const group of Object.values(Checklist.Groups)) {
			const msg = group.messages.find(m => m.key === key);
			if (msg) return msg;
		}
		return null;
	},


	/**
	 * Whether a picker group is currently expanded (the ingame opened thread
	 * starts expanded, the others collapsed).
	 * @param {string} cid conversation id
	 * @returns {boolean}
	 */
	IsExpanded: (cid) => {
		return Checklist.Expanded[cid] ?? (cid === Checklist.ActiveThread);
	},


	/**
	 * Switches to the checklist view of a message.
	 * @param {string} key message key from the picker
	 */
	SelectMessage: (key) => {
		Checklist.Notice = null;
		Checklist.CurrentKey = key;
		Checklist.Checked[key] = Checklist.Checked[key] || [];
		Checklist.Save();
		Checklist.Render();
	},


	/**
	 * Checks or unchecks a single line of the current message.
	 * @param {number} index line index
	 * @param {boolean} checked new state
	 */
	ToggleLine: (index, checked) => {
		const list = Checklist.Checked[Checklist.CurrentKey] || [];
		Checklist.Checked[Checklist.CurrentKey] = checked
			? [...new Set([...list, index])]
			: list.filter(i => i !== index);

		Checklist.Save();
		Checklist.Render();
	},


	/**
	 * Renders the current view (picker or checklist).
	 */
	Render: () => {
		if (Checklist.CurrentKey !== null && Checklist.FindMessage(Checklist.CurrentKey) !== null) {
			Checklist.RenderChecklist();
		}
		else {
			Checklist.CurrentKey = null;
			Checklist.RenderPicker();
		}
	},


	/**
	 * Settings panel (gear icon). Every control persists immediately, so no
	 * change gets lost when the panel is closed without an extra save click.
	 */
	ShowSettings: () => {
		const box = $('#checklistSettingsBox').empty();

		box.append($('<p />').append(
			$('<input />').attr({id: 'checklistAutoOpen', type: 'checkbox', class: 'game-cursor'})
				.prop('checked', Checklist.AutoOpen)
				.on('change', function () {
					Checklist.AutoOpen = this.checked;
					localStorage.setItem('ChecklistAutoOpen', String(Checklist.AutoOpen));
				}),
			$('<label />').attr('for', 'checklistAutoOpen').text(i18n('Boxes.Checklist.AutoOpen'))
		));

		box.append($('<p />').append(
			$('<input />').attr({id: 'checklistAutoClaims', type: 'checkbox', class: 'game-cursor'})
				.prop('checked', Checklist.AutoClaims)
				.on('change', function () {
					Checklist.AutoClaims = this.checked;
					localStorage.setItem('ChecklistAutoClaims', String(Checklist.AutoClaims));
				}),
			$('<label />').attr('for', 'checklistAutoClaims').text(i18n('Boxes.Checklist.AutoClaims'))
		));

		const ignored = Object.entries(Checklist.Ignored);
		if (ignored.length > 0) {
			box.append($('<p />').addClass('ignored-head').text(i18n('Boxes.Checklist.HiddenThreads')));

			for (const [cid, title] of ignored) {
				box.append($('<p />').addClass('ignored-row').append(
					$('<button />').attr('class', 'btn btn-slim game-cursor')
						.text(i18n('Boxes.Checklist.RestoreThread'))
						.on('click', () => Checklist.UnignoreThread(cid)),
					$('<span />').text(title)
				));
			}
		}

		box.append($('<p />').append(
			$('<button />').attr('class', 'btn game-cursor').css('width', '100%')
				.text(i18n('Boxes.Checklist.Clear'))
				.on('click', () => Checklist.ClearMessages())
		));
	},


	/**
	 * Forgets all captured messages and checked states.
	 */
	ClearMessages: () => {
		Checklist.Groups = {};
		Checklist.Checked = {};
		Checklist.CurrentKey = null;
		Checklist.Save();
		$('#checklistSettingsBox').remove();
		Checklist.Render();
	},


	/**
	 * Excludes a thread from the checklist: removes its group and skips all
	 * future captures until it is restored via the settings panel.
	 * @param {string} cid conversation id
	 */
	IgnoreThread: (cid) => {
		const group = Checklist.Groups[cid];

		// always store a non-empty title: the capture guards test it for truthiness
		Checklist.Ignored[cid] = group?.title || group?.messages[0]?.sender || ('#' + cid);

		delete Checklist.Groups[cid];
		delete Checklist.Expanded[cid];
		Checklist.Sync();
	},


	/**
	 * Lets an excluded thread reappear (new messages get captured again).
	 * @param {string} cid conversation id
	 */
	UnignoreThread: (cid) => {
		delete Checklist.Ignored[cid];
		Checklist.Save();
		Checklist.ShowSettings();
	},


	/**
	 * Renders the message picker: one collapsible group per thread, the ingame
	 * opened thread first, inside each group the newest messages on top. The
	 * top bar offers the list of the places claimed with the last own message.
	 */
	RenderPicker: () => {
		const groups = Checklist.SortedGroups();
		const rows = [];

		for (const group of groups) {
			const expanded = Checklist.IsExpanded(group.cid);
			const time = Checklist.GroupTime(group);

			rows.push(`<div class="checklist-thread${group.cid === Checklist.ActiveThread ? ' is-active' : ''}">`);
			rows.push(`<div class="thread-head game-cursor" data-cid="${group.cid}">`);
			rows.push(`<span class="thread-arrow">${expanded ? '▾' : '▸'}</span>`);
			rows.push(`<strong>${HTML.escapeHtml(Checklist.GroupTitle(group))}</strong>`);
			rows.push(`<span class="thread-count">${group.messages.length}</span>`);
			if (time) {
				rows.push(`<em class="thread-time">${moment(time).format('L LT')}</em>`);
			}
			rows.push(`<span class="thread-ignore${time ? '' : ' no-time'}" data-cid="${group.cid}" title="${i18n('Boxes.Checklist.HideThread')}">✕</span>`);
			rows.push('</div>');

			if (expanded) {
				for (const msg of group.messages) {
					const lines = Checklist.SplitLines(msg.text);
					const checkedCount = (Checklist.Checked[msg.key] || []).filter(i => i < lines.length).length;

					rows.push(`<div class="checklist-pick${msg.claimed ? ' is-claims' : ''} game-cursor" data-key="${msg.key}">`);
					rows.push('<div class="pick-head">');
					rows.push(`<strong>${msg.claimed ? i18n('Boxes.Checklist.MyPlaces') : HTML.escapeHtml(msg.sender)}</strong>`);
					if (msg.time) {
						rows.push(`<em class="pick-time">${moment(msg.time).format('L LT')}</em>`);
					}
					rows.push('</div>');
					rows.push(`<div class="pick-preview">${HTML.escapeHtml(lines[0] || '')}</div>`);
					rows.push('<div class="pick-meta">');
					rows.push(i18n('Boxes.Checklist.Lines').replace('__count__', String(lines.length)));
					if (checkedCount > 0) {
						rows.push(` · ${checkedCount}/${lines.length} ✓`);
					}
					rows.push('</div></div>');
				}
			}

			rows.push('</div>');
		}

		if (rows.length === 0) {
			rows.push(`<div class="no-results">${i18n('Boxes.Checklist.Empty')}</div>`);
		}

		if (Checklist.Notice) {
			rows.unshift(`<div class="checklist-notice">${Checklist.Notice}</div>`);
		}

		$('#checklistTopbar').html(`<span class="picker-hint">${i18n('Boxes.Checklist.PickerHint')}</span>`).append(
			$('<span />').attr({class: 'btn btn-slim', id: 'checklistClaims', title: i18n('Boxes.Checklist.ClaimsHint')})
				.text(i18n('Boxes.Checklist.Claims'))
				.on('click', () => Checklist.ShowClaims(Checklist.LastOwnMessage()))
		);
		$('#checklistInner').html(rows.join(''));
		$('#checklistBottombar').empty();
	},


	/**
	 * Renders the checklist view of the selected message. A claim list names
	 * its thread and highlights the taken places of every entry.
	 */
	RenderChecklist: () => {
		const msg = Checklist.FindMessage(Checklist.CurrentKey);
		const lines = Checklist.SplitLines(msg.text);
		const checked = Checklist.Checked[msg.key] || [];
		const info = msg.claimed
			? Checklist.GroupTitle(Object.values(Checklist.Groups).find(g => g.messages.includes(msg)))
			: (msg.time ? moment(msg.time).format('L LT') : '');
		const rows = [];

		for (let i = 0; i < lines.length; i++) {
			const isChecked = checked.includes(i);
			const [label, taken] = msg.claimed ? lines[i].split('\t') : [lines[i]];
			rows.push(`<label class="checklist-line${isChecked ? ' is-checked' : ''} game-cursor">`);
			rows.push(`<input type="checkbox" class="game-cursor" data-index="${i}"${isChecked ? ' checked' : ''}>`);
			rows.push(`<span>${HTML.escapeHtml(label)}${taken ? ` <strong class="taken">${HTML.escapeHtml(taken)}</strong>` : ''}</span>`);
			rows.push('</label>');
		}

		$('#checklistTopbar').empty().append(
			$('<span />').attr({class: 'btn btn-slim', id: 'checklistBack'})
				.text('◀ ' + i18n('Boxes.Checklist.BackToList'))
				.on('click', () => {
					Checklist.CurrentKey = null;
					Checklist.Save();
					Checklist.Render();
				}),
			$('<span />').attr('class', 'checklist-source').append(
				$('<strong />').text(msg.claimed ? i18n('Boxes.Checklist.MyPlaces') : msg.sender),
				info ? $('<em />').text(' – ' + info) : null
			),
			$('<span />').attr({class: 'btn btn-slim', id: 'checklistReset'})
				.text(i18n('Boxes.Checklist.Reset'))
				.on('click', () => {
					Checklist.Checked[msg.key] = [];
					Checklist.Save();
					Checklist.Render();
				})
		);

		$('#checklistInner').html(rows.join(''));

		const done = checked.filter(i => i < lines.length).length;
		$('#checklistBottombar').html(
			i18n('Boxes.Checklist.Progress')
				.replace('__done__', String(done))
				.replace('__total__', String(lines.length))
		);
	},


	/**
	 * Persists thread groups, checked states and the current selection.
	 */
	Save: () => {
		localStorage.setItem('ChecklistData', JSON.stringify({
			groups: Checklist.Groups,
			checked: Checklist.Checked,
			currentKey: Checklist.CurrentKey,
			seq: Checklist.Seq,
			ignored: Checklist.Ignored
		}));
	},


	/**
	 * Restores the persisted state (once, before the first capture or open).
	 */
	Load: () => {
		if (Checklist.Loaded) return;
		Checklist.Loaded = true;

		Checklist.AutoOpen = localStorage.getItem('ChecklistAutoOpen') !== 'false';
		Checklist.AutoClaims = localStorage.getItem('ChecklistAutoClaims') === 'true';

		try {
			const stored = JSON.parse(localStorage.getItem('ChecklistData') || '{}');

			Checklist.Ignored = stored.ignored || {};

			for (const [cid, group] of Object.entries(stored.groups || {})) {
				if (Array.isArray(group?.messages) && !Checklist.Ignored[cid]) Checklist.Groups[cid] = group;
			}

			// migrate the flat message list of the previous format into groups
			for (const msg of (Array.isArray(stored.messages) ? stored.messages : [])) {
				const cid = String(msg.cid ?? msg.key.slice(0, msg.key.lastIndexOf('-')));
				const group = Checklist.Groups[cid] || {cid: cid, title: msg.title || '', messages: []};
				if (!group.messages.some(m => m.key === msg.key)) {
					group.messages.push({key: msg.key, seq: 0, sender: msg.sender || '', time: msg.time ?? null, text: msg.text || ''});
				}
				Checklist.Groups[cid] = group;
			}

			Checklist.Checked = stored.checked || {};
			Checklist.CurrentKey = stored.currentKey ?? null;

			// continue the capture counter behind every stored sequence number
			Checklist.Seq = Math.max(stored.seq || 0,
				...Object.values(Checklist.Groups).flatMap(g => g.messages.map(m => m.seq || 0)), 0);
		} catch (e) {
			// ignore a broken storage entry and start empty
		}
	}
};
