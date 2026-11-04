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

// In-game news of the FoE Helper team: a box in the top right corner lists the
// announcements of data/announcements.json the player has not dismissed yet
// (dismissed ids are remembered in the browser); the settings module can
// bring every announcement back. The texts live in the translation files as
// `Announcements.<id>.Title` / `.Text`, so Weblate covers every language and
// English is the built-in fallback; the json only carries id, version, date and link.
let Announcements = {

	/** @type {?Object[]} entries of data/announcements.json, newest first (lazy, see Load) */
	List: null,

	/** @type {string[]} ids currently shown in the box, marked as read when it is closed */
	Shown: [],

	/** @type {string} localStorage key of the dismissed announcement ids */
	StorageKey: 'AnnouncementsRead',

	/** @type {number} width of the box, used for the default position */
	BoxWidth: 420,


	/**
	 * Loads the announcements shipped with the extension (cached).
	 *
	 * @returns {Promise<Object[]>} Entries with an id, newest date first
	 */
	Load: async () => {
		if (Announcements.List !== null) return Announcements.List;

		try {
			const response = await fetch(`${extUrl}js/web/announcements/data/announcements.json?v=${extVersion}`),
				list = await response.json();

			Announcements.List = (Array.isArray(list) ? list : [])
				.filter(entry => entry?.['id'])
				.sort((a, b) => String(b['date'] || '').localeCompare(String(a['date'] || '')));
		}
		catch (error) {
			console.error('Announcements: loading announcements.json failed', error);
			Announcements.List = [];
		}

		return Announcements.List;
	},


	/**
	 * Ids the player has dismissed in this browser.
	 *
	 * @returns {string[]}
	 */
	ReadIds: () => {
		try {
			const ids = JSON.parse(localStorage.getItem(Announcements.StorageKey) || '[]');
			return (Array.isArray(ids) ? ids : []);
		}
		catch {
			return [];
		}
	},


	/**
	 * Remembers announcements as dismissed.
	 *
	 * @param {string[]} ids
	 */
	MarkRead: (ids) => {
		localStorage.setItem(Announcements.StorageKey, JSON.stringify([...new Set([...Announcements.ReadIds(), ...ids])]));
	},


	/**
	 * Translated title or text of an announcement from the i18n files
	 * (helper language, English as fallback), empty when the key is unknown.
	 *
	 * @param {Object} entry Announcement
	 * @param {string} field 'Title' or 'Text'
	 * @returns {string}
	 */
	Text: (entry, field) => {
		const key = `Announcements.${entry['id']}.${field}`,
			value = i18n(key);

		return (value === key ? '' : value);
	},


	/**
	 * Link of an announcement: a plain url or one per language ({de: …, en: …}).
	 *
	 * @param {Object} entry Announcement
	 * @returns {string}
	 */
	Link: (entry) => {
		const value = entry['link'];

		if (value && typeof value === 'object') return value[GuiLng] || value['en'] || Object.values(value)[0] || '';

		return value || '';
	},


	/**
	 * Opens the box with the announcements the player has not dismissed yet
	 * (after the game start, when enabled in the settings).
	 */
	ShowNew: async () => {
		await ExistenceConfirmed(() => Settings.Preferences !== null);
		if (!Settings.GetSetting('ShowAnnouncements')) return;

		const read = Announcements.ReadIds(),
			unread = (await Announcements.Load()).filter(entry => !read.includes(entry['id']));

		if (unread.length > 0) Announcements.Show(unread);
	},


	/**
	 * Opens the box with every announcement, dismissed ones included (settings button).
	 */
	ShowAll: async () => {
		Announcements.Show(await Announcements.Load());
	},


	/**
	 * Renders the box with the given announcements. Closing it (the X or the
	 * "got it" button) marks them as read.
	 *
	 * @param {Object[]} entries Announcements to show, newest first
	 */
	Show: (entries) => {
		HTML.AddCssFile('announcements');

		if ($('#announcementsBox').length === 0) {
			HTML.Box({
				id: 'announcementsBox',
				title: i18n('Boxes.Announcements.Title'),
				auto_close: true,
				dragdrop: true,
				saveCords: true,
				class: 'announcements',
			});

			// no position saved yet: top right corner (the box is centred via --x/--y)
			if (!localStorage.getItem('announcementsBoxCords')) {
				$('#announcementsBox').css({
					'--x': Math.round(window.innerWidth / 2 - Announcements.BoxWidth - 20) + 'px',
					'--y': Math.round(80 - window.innerHeight / 2) + 'px',
				});
			}

			$('#announcementsBox').on('click', '#announcementsBoxclose', () => Announcements.MarkRead(Announcements.Shown));
			$('#announcementsBox').on('click', '.announcement-dismiss', () => {
				Announcements.MarkRead(Announcements.Shown);
				$('#announcementsBoxclose').trigger('click');
			});
		}

		Announcements.Shown = entries.map(entry => entry['id']);

		const h = [];
		if (entries.length === 0) {
			h.push(`<div class="text-center dark-bg p5">${i18n('Boxes.Announcements.Empty')}</div>`);
		}

		for (const entry of entries) {
			const date = (entry['date'] && typeof moment !== 'undefined' ? moment(entry['date']).format('L') : (entry['date'] || '')),
				meta = [entry['version'] ? HTML.i18nReplacer(i18n('Boxes.Announcements.Version'), { v: entry['version'] }) : '', date].filter(Boolean).join(' &middot; '),
				link = Announcements.Link(entry),
				title = Announcements.Text(entry, 'Title') || entry['id'];

			h.push('<div class="announcement dark-bg">');
			h.push(`<div class="announcement-head"><strong>${title}</strong>${meta ? `<small>${meta}</small>` : ''}</div>`);
			h.push(`<div class="announcement-text">${Announcements.Text(entry, 'Text')}</div>`);
			if (link) h.push(`<div class="announcement-link"><a class="game-cursor" href="${link}" target="_blank" rel="noopener noreferrer">${i18n('Boxes.Announcements.More')} &raquo;</a></div>`);
			h.push('</div>');
		}

		h.push(`<div class="announcements-footer"><button class="btn btn-slim announcement-dismiss">${i18n('Boxes.Announcements.Dismiss')}</button></div>`);

		$('#announcementsBoxBody').html(h.join(''));
		$('#announcementsBox').show();
	},
};


// after the game start show what is new
StartUpDone.then(() => Announcements.ShowNew());
