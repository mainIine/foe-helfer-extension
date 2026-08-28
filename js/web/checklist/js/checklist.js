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
}


/**
 * @typedef ChecklistMessage
 * @property {string} key unique key (`conversationId-messageId`)
 * @property {number} seq capture sequence number (sort tiebreaker)
 * @property {string} sender sender name
 * @property {?number} time message timestamp in ms (null when unknown)
 * @property {string} text raw message text
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
 * other players have already taken.
 * @namespace
 */
let Checklist = {

	/** @type {Object<string,ChecklistThread>} conversation id => thread group */
	Groups: {},

	/** @type {number} maximum number of messages kept per thread */
	MaxPerThread: 5,

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

	/** @type {?string} conversation id of the thread last opened ingame */
	ActiveThread: null,

	/** @type {Object<string,boolean>} conversation id => picker group expanded (session only) */
	Expanded: {},


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
		if (conversationId === undefined) return;

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
	 * Sorting for messages: newest first, capture order as tiebreaker (the
	 * game delivers thread messages chronologically, so the capture sequence
	 * keeps the order right even for unparseable or equal timestamps).
	 * @param {ChecklistMessage} a
	 * @param {ChecklistMessage} b
	 * @returns {number}
	 */
	CompareMessages: (a, b) => {
		return (b.time || 0) - (a.time || 0) || (b.seq || 0) - (a.seq || 0);
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
	 * Sorts and trims the groups, persists everything and refreshes an open picker.
	 */
	Sync: () => {
		for (const group of Object.values(Checklist.Groups)) {
			group.messages.sort(Checklist.CompareMessages);
			group.messages = group.messages.slice(0, Checklist.MaxPerThread);
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
	 * Settings panel (gear icon).
	 */
	ShowSettings: () => {
		const h = [];

		h.push(`<p><input id="checklistAutoOpen" type="checkbox" class="game-cursor"${Checklist.AutoOpen ? ' checked' : ''}>
			<label for="checklistAutoOpen">${i18n('Boxes.Checklist.AutoOpen')}</label></p>`);

		h.push(`<p><button onclick="Checklist.ClearMessages()" class="btn" style="width:100%">${i18n('Boxes.Checklist.Clear')}</button></p>`);
		h.push(`<button onclick="Checklist.SaveSettings()" class="btn" style="width:100%">${i18n('Boxes.Settings.Save')}</button>`);

		$('#checklistSettingsBox').html(h.join(''));
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
	 * Stores the settings panel values.
	 */
	SaveSettings: () => {
		Checklist.AutoOpen = $('#checklistAutoOpen').is(':checked');
		localStorage.setItem('ChecklistAutoOpen', String(Checklist.AutoOpen));
		$('#checklistSettingsBox').remove();
	},


	/**
	 * Renders the message picker: one collapsible group per thread, the ingame
	 * opened thread first, inside each group the newest messages on top.
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
			rows.push(`<strong>${HTML.escapeHtml(group.title || group.messages[0]?.sender || '?')}</strong>`);
			rows.push(`<span class="thread-count">${group.messages.length}</span>`);
			if (time) {
				rows.push(`<em class="thread-time">${moment(time).format('L LT')}</em>`);
			}
			rows.push('</div>');

			if (expanded) {
				for (const msg of group.messages) {
					const lines = Checklist.SplitLines(msg.text);
					const checkedCount = (Checklist.Checked[msg.key] || []).filter(i => i < lines.length).length;

					rows.push(`<div class="checklist-pick game-cursor" data-key="${msg.key}">`);
					rows.push('<div class="pick-head">');
					rows.push(`<strong>${HTML.escapeHtml(msg.sender)}</strong>`);
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

		$('#checklistTopbar').html(`<span class="picker-hint">${i18n('Boxes.Checklist.PickerHint')}</span>`);
		$('#checklistInner').html(rows.join(''));
		$('#checklistBottombar').empty();
	},


	/**
	 * Renders the checklist view of the selected message.
	 */
	RenderChecklist: () => {
		const msg = Checklist.FindMessage(Checklist.CurrentKey);
		const lines = Checklist.SplitLines(msg.text);
		const checked = Checklist.Checked[msg.key] || [];
		const rows = [];

		for (let i = 0; i < lines.length; i++) {
			const isChecked = checked.includes(i);
			rows.push(`<label class="checklist-line${isChecked ? ' is-checked' : ''} game-cursor">`);
			rows.push(`<input type="checkbox" class="game-cursor" data-index="${i}"${isChecked ? ' checked' : ''}>`);
			rows.push(`<span>${HTML.escapeHtml(lines[i])}</span>`);
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
				$('<strong />').text(msg.sender),
				msg.time ? $('<em />').text(' – ' + moment(msg.time).format('L LT')) : null
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
			seq: Checklist.Seq
		}));
	},


	/**
	 * Restores the persisted state (once, before the first capture or open).
	 */
	Load: () => {
		if (Checklist.Loaded) return;
		Checklist.Loaded = true;

		Checklist.AutoOpen = localStorage.getItem('ChecklistAutoOpen') !== 'false';

		try {
			const stored = JSON.parse(localStorage.getItem('ChecklistData') || '{}');

			for (const [cid, group] of Object.entries(stored.groups || {})) {
				if (Array.isArray(group?.messages)) Checklist.Groups[cid] = group;
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
