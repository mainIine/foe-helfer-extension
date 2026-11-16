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
 * @typedef YearReviewTile
 * @property {string} value headline number
 * @property {string} label what the number counts
 * @property {string} [sub] second line with details
 */

/**
 * @typedef YearReviewContext
 * @property {CanvasRenderingContext2D} ctx
 * @property {number} W card width
 * @property {number} H card height
 * @property {Object} Data output of Collect()
 * @property {YearReviewTile[]} Tiles output of Tiles()
 * @property {Object} P chosen colour scheme
 * @property {number} pad outer margin
 * @property {string|CanvasGradient} accent colour of the numbers
 * @property {string} solid first accent colour, for glows and transparencies
 * @property {string} accent2 second accent colour
 * @property {string} text label colour
 * @property {string} muted detail line colour
 * @property {string} soft footer colour
 * @property {string} tile tile background
 * @property {string} line tile border and rules
 * @property {string} title card headline
 * @property {string} who player, world and era
 * @property {string} note footer line saying where the numbers come from
 * @property {function(number, (number|string)=, string=): string} font font string for a size, weight and family key
 */

/**
 * Year in review: sums up a calendar year from what the helper stored locally
 * (statistics, collected forge points, guild battlegrounds, guild expedition,
 * quantum incursion, town hall events, own contributions) and draws it as a
 * picture to save or copy. Nothing is sent anywhere; the data only covers this
 * world, this player and this browser, from the day the helper recorded it.
 */
let YearReview = {

	/** @type {?number} shown calendar year */
	Year: null,

	/** @type {boolean} leave out the own and other players' names */
	HideNames: false,

	/** @type {?HTMLCanvasElement} the drawn card */
	Canvas: null,

	/** @type {number} card width in pixels, the height follows the design and the number of tiles */
	Width: 1080,

	/** @type {string} key of the chosen design in YearReview.Designs */
	Design: 'classic',

	/** @type {string} key of the chosen colour scheme in YearReview.Palettes */
	Color: 'bronze',

	/** @type {?{Data: Object, Tiles: YearReviewTile[]}} figures of the shown card, redrawn when the style changes */
	Last: null,


	/**
	 * Opens the box (or closes an already open one).
	 */
	init: () => {
		if ($('#yearReview').length !== 0) {
			HTML.CloseOpenBox('yearReview');
			return;
		}

		HTML.AddCssFile('yearreview');

		HTML.Box({
			id: 'yearReview',
			title: i18n('Boxes.YearReview.Title'),
			auto_close: true,
			dragdrop: true,
			minimize: true,
			resize: true,
		});

		YearReview.Year = YearReview.Year || moment().year();
		YearReview.HideNames = localStorage.getItem('YearReviewHideNames') === 'true';

		const Design = localStorage.getItem('YearReviewDesign'),
			Color = localStorage.getItem('YearReviewColor');

		if (YearReview.Designs[Design]) YearReview.Design = Design;
		if (YearReview.Palettes[Color]) YearReview.Color = Color;

		$('#yearReview').on('change', '#yearReviewYear', function () {
			YearReview.Year = parseInt($(this).val());
			YearReview.Render();
		}).on('click', '#yearReviewHideNames', function () {
			YearReview.HideNames = $(this).prop('checked');
			localStorage.setItem('YearReviewHideNames', YearReview.HideNames);
			YearReview.Render();
		}).on('change', '#yearReviewDesign', function () {
			YearReview.SetStyle($(this).val(), YearReview.Color);
		}).on('click', '.yr-swatch', function () {
			YearReview.SetStyle(YearReview.Design, $(this).data('color'));
		}).on('click', '.yr-random', YearReview.Shuffle)
			.on('click', '.yr-save', YearReview.Save).on('click', '.yr-copy', YearReview.Copy);

		YearReview.Render();
	},


	/**
	 * Translation with its __name__ placeholders filled in.
	 *
	 * @param {string} key i18n key below Boxes.YearReview.
	 * @param {Object<string,string|number>} [values] Placeholder name -> value.
	 * @returns {string}
	 */
	Text: (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll('__' + name + '__', value), i18n('Boxes.YearReview.' + key)),


	/**
	 * Formats a number: localized up to six digits, compact above (1.2M).
	 *
	 * @param {number} number
	 * @returns {string}
	 */
	Num: (number) => (Math.abs(number) >= 1000000 ? HTML.FormatNumberShort(number, false) : Number(Math.round(number)).toLocaleString(i18n('Local'))),


	/**
	 * Runs one query of the review; a failing or missing data source only
	 * leaves its tile out.
	 *
	 * @param {function(): Promise<*>} query
	 * @returns {Promise<*>} Result, null on failure.
	 */
	Try: async (query) => {
		try {
			return await query();
		}
		catch (err) {
			console.warn('YearReview:', err);
			return null;
		}
	},


	/**
	 * Own results per round of a guild feature, merged from several stores: the
	 * entry with the higher score of a round wins (final values beat snapshots).
	 *
	 * @param {number} year Calendar year, a round belongs to the year of its timestamp.
	 * @param {Object[]} entries Own rows as { round: unix time, score: number, ... }.
	 * @returns {Object[]} One entry per round of the year.
	 */
	Rounds: (year, entries) => {
		const Rounds = new Map();

		for (const Entry of entries) {
			if (!Entry || moment.unix(Entry.round).year() !== year) continue;

			const Known = Rounds.get(Entry.round);
			if (!Known || Entry.score >= Known.score) Rounds.set(Entry.round, Entry);
		}

		return [...Rounds.values()].filter(Entry => Entry.score > 0);
	},


	/**
	 * Collects the figures of a calendar year from the local databases.
	 *
	 * @param {number} year Calendar year.
	 * @returns {Promise<Object>} Figures by topic; a topic without data is missing or null.
	 */
	Collect: async (year) => {
		const From = moment([year]),
			To = moment([year + 1]),
			Range = [From.toDate(), To.toDate()],
			Own = (rows) => (rows || []).find(Row => Row['player_id'] === ExtPlayerID),
			Best = (rounds) => Math.min(...rounds.map(Round => Round.rank || Infinity)),
			Sum = (rows, field) => rows.reduce((Total, Row) => Total + (Row[field] || 0), 0),
			Data = { year: year };

		await IndexDB.getDB();

		// days with a snapshot and how the stock changed between the first and the last one
		Data.days = await YearReview.Try(async () => {
			const Days = await IndexDB.db.statsTreasurePlayerD.where('date').between(...Range).sortBy('date');
			if (Days.length === 0) return null;

			const First = Days[0].resources || {},
				Last = Days[Days.length - 1].resources || {};

			return {
				count: Days.length,
				since: Days[0].date,
				goods: GoodsList.reduce((Total, Good) => Total + (Last[Good['id']] || 0) - (First[Good['id']] || 0), 0),
			};
		});

		// forge points from rewards, the regular harvest of the buildings is not logged
		Data.fp = await YearReview.Try(async () => {
			const Rewards = await StrategyPoints.db.ForgePointsStats.where('date').between(year + '-01-01', (year + 1) + '-01-01').toArray(),
				Sources = {};

			for (const Reward of Rewards) Sources[Reward.event] = (Sources[Reward.event] || 0) + (Reward.amount || 0);

			const Top = Object.entries(Sources).sort((a, b) => b[1] - a[1])[0];

			return Rewards.length === 0 ? null : { total: Sum(Rewards, 'amount'), top: Top[0], topAmount: Top[1] };
		});

		// own contributions to great buildings
		Data.invested = await YearReview.Try(async () => {
			const Contributions = await IndexDB.db.gbContributions.where('date').between(...Range).toArray(),
				Owners = Contributions.filter(Entry => Entry.ownerId !== ExtPlayerID);

			return Contributions.length === 0 ? null : {
				total: Sum(Contributions, 'fp'),
				count: Contributions.length,
				players: new Set(Owners.map(Entry => Entry.ownerId)).size,
				since: Contributions.reduce((Min, Entry) => (Entry.date < Min ? Entry.date : Min), Contributions[0].date),
			};
		});

		Data.gbg = await YearReview.Try(async () => {
			const Rounds = YearReview.Rounds(year, [
				...(await Guild_fights.db.history.toArray()).map(Round => [Round['gbground'], Own(Round['participation'])]),
				...(await GuildMemberStat.db.gbg.where('player_id').equals(ExtPlayerID).toArray()).map(Row => [Row['gbgid'], Row]),
			].map(([Round, Row]) => Row && { round: Round, battles: Row['battlesWon'] || 0, negotiations: Row['negotiationsWon'] || 0, rank: Row['rank'], score: (Row['battlesWon'] || 0) + 2 * (Row['negotiationsWon'] || 0) }));

			return Rounds.length === 0 ? null : { rounds: Rounds.length, battles: Sum(Rounds, 'battles'), negotiations: Sum(Rounds, 'negotiations'), rank: Best(Rounds) };
		});

		Data.ge = await YearReview.Try(async () => {
			const Rounds = YearReview.Rounds(year, [
				...(await GexStat.db.participation.toArray()).map(Week => [Week['gexweek'], Own(Week['participation'])]),
				...(await GuildMemberStat.db.gex.where('player_id').equals(ExtPlayerID).toArray()).map(Row => [Row['gexweek'], Row]),
			].map(([Round, Row]) => Row && { round: Round, encounters: Row['solvedEncounters'] || 0, rank: Row['rank'], score: Row['solvedEncounters'] || 0 }));

			return Rounds.length === 0 ? null : { rounds: Rounds.length, encounters: Sum(Rounds, 'encounters'), rank: Best(Rounds) };
		});

		Data.qi = await YearReview.Try(async () => {
			const Rounds = YearReview.Rounds(year, (await QiProgress.db.history.toArray())
				.map(Round => [Round['qiround'], Own(Round['participation'])])
				.map(([Round, Row]) => Row && { round: Round, actions: Row['actions'] || 0, progress: Row['progress'] || 0, rank: Row['rank'], score: Row['progress'] || 0 }));

			return Rounds.length === 0 ? null : { rounds: Rounds.length, actions: Sum(Rounds, 'actions'), progress: Sum(Rounds, 'progress'), rank: Best(Rounds) };
		});

		// rewards by origin, all event sources count as one
		Data.rewards = await YearReview.Try(async () => {
			const Rewards = await IndexDB.db.statsRewards.where('date').between(...Range).toArray(),
				Sources = {};

			for (const Reward of Rewards) {
				const Source = (/event/i.test(Reward.type) ? '__event' : Reward.type);
				Sources[Source] = (Sources[Source] || 0) + 1;
			}

			const Top = Object.entries(Sources).sort((a, b) => b[1] - a[1])[0];

			return Rewards.length === 0 ? null : { total: Rewards.length, top: Top[0], topAmount: Top[1] };
		});

		// town hall events: who helped, visited, attacked
		Data.social = await YearReview.Try(async () => {
			const Events = await EventHandler.db.Events.where('date').between(...Range).toArray(),
				Counts = { MoppelEvent: 0, TavernVisit: 0, Attack: 0, Plunder: 0 },
				Helpers = {};

			for (const Event of Events) {
				const Type = EventHandler.GetEventType(Event);
				if (Counts[Type] === undefined) continue;

				Counts[Type]++;
				if (Type === 'MoppelEvent' && Event['playername']) Helpers[Event['playername']] = (Helpers[Event['playername']] || 0) + 1;
			}

			const Top = Object.entries(Helpers).sort((a, b) => b[1] - a[1])[0];

			return Counts.MoppelEvent + Counts.TavernVisit === 0 ? null : {
				aid: Counts.MoppelEvent,
				tavern: Counts.TavernVisit,
				attacks: Counts.Attack,
				plunders: Counts.Plunder,
				helper: Top?.[0],
				helperCount: Top?.[1],
			};
		});

		// daily player records: points, battles and great building levels since the first one
		Data.progress = await YearReview.Try(async () => {
			const Days = await IndexDB.db.statsPlayerD.where('date').between(...Range).sortBy('date');
			if (Days.length < 2) return null;

			const First = Days.find(Day => Day.score !== undefined) || Days[0],
				Last = Days[Days.length - 1],
				Levels = Object.entries(Last.gbs || {}).reduce((Total, [id, level]) => Total + Math.max(0, level - (First.gbs?.[id] ?? level)), 0);

			return {
				since: First.date,
				score: (Last.score || 0) - (First.score || 0),
				battles: (Last.wonBattles || 0) - (First.wonBattles || 0),
				levels: (First.gbs ? Levels : 0),
				eras: Technologies.Eras[Last.era] - Technologies.Eras[First.era],
			};
		});

		return Data;
	},


	/**
	 * Turns the collected figures into the tiles of the card, in display order.
	 *
	 * @param {Object} Data Output of Collect().
	 * @returns {YearReviewTile[]}
	 */
	Tiles: (Data) => {
		const { Text, Num } = YearReview,
			Tiles = [],
			Source = (prefix, id) => {
				const Name = i18n(prefix + id);
				return Name === prefix + id ? null : Name;
			},
			Rank = (rank) => (isFinite(rank) ? ' · ' + Text('BestRank', { rank: rank }) : '');

		if (Data.days) {
			Tiles.push({ value: Num(Data.days.count), label: Text('Days'), sub: Text('DaysSub') });
		}
		if (Data.fp?.total > 0) {
			const Top = Source('Boxes.FPCollector.', Data.fp.top);
			Tiles.push({ value: Num(Data.fp.total), label: Text('FPRewards'), sub: Top ? Text('TopSource', { source: Top, amount: Num(Data.fp.topAmount) }) : '' });
		}
		if (Data.invested?.total > 0) {
			Tiles.push({ value: Num(Data.invested.total), label: Text('FPInvested'), sub: Text('FPInvestedSub', { count: Num(Data.invested.count), players: Num(Data.invested.players), date: moment(Data.invested.since).format('L') }) });
		}
		if (Data.gbg) {
			Tiles.push({ value: Num(Data.gbg.battles), label: Text('GBG'), sub: Text('Rounds', { rounds: Data.gbg.rounds }) + (Data.gbg.negotiations > 0 ? ' · ' + Text('Negotiations', { count: Num(Data.gbg.negotiations) }) : '') + Rank(Data.gbg.rank) });
		}
		if (Data.ge) {
			Tiles.push({ value: Num(Data.ge.encounters), label: Text('GE'), sub: Text('GESub', { rounds: Data.ge.rounds }) + Rank(Data.ge.rank) });
		}
		if (Data.qi) {
			Tiles.push({ value: Num(Data.qi.progress), label: Text('QI'), sub: Text('Rounds', { rounds: Data.qi.rounds }) + ' · ' + Text('Actions', { count: Num(Data.qi.actions) }) + Rank(Data.qi.rank) });
		}
		if (Data.rewards) {
			const Top = Source('Boxes.Stats.Rewards.Source.', Data.rewards.top);
			Tiles.push({ value: Num(Data.rewards.total), label: Text('Rewards'), sub: Top ? Text('TopSource', { source: Top, amount: Num(Data.rewards.topAmount) }) : '' });
		}
		if (Data.social) {
			const Details = [Text('SocialTavern', { count: Num(Data.social.tavern) })];
			if (Data.social.plunders > 0) Details.push(Text('SocialPlunders', { count: Num(Data.social.plunders) }));
			if (Data.social.helper && !YearReview.HideNames) Details.push(Text('SocialHelper', { name: Data.social.helper, count: Num(Data.social.helperCount) }));

			Tiles.push({ value: Num(Data.social.aid), label: Text('Social'), sub: Details.join(' · ') });
		}
		if (Data.progress?.score > 0) {
			const Since = Text('Since', { date: moment(Data.progress.since).format('L') });

			Tiles.push({ value: '+' + Num(Data.progress.score), label: Text('Score'), sub: (Data.progress.battles > 0 ? Text('ScoreSub', { battles: Num(Data.progress.battles) }) + ' · ' : '') + Since });
			if (Data.progress.levels > 0) {
				Tiles.push({ value: '+' + Num(Data.progress.levels), label: Text('GBLevels'), sub: (Data.progress.eras > 0 ? Text('Eras', { count: Data.progress.eras }) + ' · ' : '') + Since });
			}
		}
		if (Data.days?.count > 1 && Data.days.goods > 0) {
			Tiles.push({ value: '+' + Num(Data.days.goods), label: Text('Goods'), sub: Text('Since', { date: moment(Data.days.since).format('L') }) });
		}

		return Tiles;
	},


	/**
	 * Loads the figures of the selected year and builds the box body: the
	 * controls and the drawn card, or a hint while there is nothing to show.
	 *
	 * @returns {Promise<void>}
	 */
	Render: async () => {
		const { Text } = YearReview,
			Year = YearReview.Year,
			Now = moment().year(),
			Data = await YearReview.Collect(Year),
			Tiles = YearReview.Tiles(Data),
			// the daily data reaches back to the start of the previous year
			Years = [Now, Now - 1].map(Option => '<option value="' + Option + '"' + (Option === Year ? ' selected' : '') + '>' + Option + '</option>').join('');

		// the box was closed or switched to another year meanwhile
		if ($('#yearReview').length === 0 || Year !== YearReview.Year) return;

		const h = [];

		h.push('<div class="yr-controls dark-bg">');
		h.push('<select id="yearReviewYear" class="game-cursor">' + Years + '</select>');
		h.push('<label class="game-cursor"><input id="yearReviewHideNames" type="checkbox"' + (YearReview.HideNames ? ' checked' : '') + '> ' + Text('HideNames') + '</label>');
		if (Tiles.length > 0) {
			h.push('<button class="btn yr-save">' + Text('Save') + '</button>');
			if (window.ClipboardItem && navigator.clipboard?.write) h.push('<button class="btn yr-copy">' + Text('Copy') + '</button>');
			h.push(YearReview.StyleControls());
		}
		h.push('</div>');

		if (Tiles.length === 0) {
			YearReview.Canvas = null;
			YearReview.Last = null;
			h.push('<div class="yr-empty">' + Text('Empty', { year: Year }) + '</div>');
		}
		else {
			h.push('<div class="yr-card"></div>');
			h.push('<div class="yr-note">' + Text('Note') + '</div>');
		}

		$('#yearReviewBody').html(h.join(''));

		if (Tiles.length > 0) {
			YearReview.Last = { Data: Data, Tiles: Tiles };
			YearReview.Redraw();
		}
	},


	/**
	 * Design selection, dice button and one swatch per colour scheme.
	 *
	 * @returns {string} HTML
	 */
	StyleControls: () => {
		const { Text } = YearReview,
			Designs = Object.keys(YearReview.Designs).map(id => '<option value="' + id + '"' + (id === YearReview.Design ? ' selected' : '') + '>' + Text('Designs.' + id) + '</option>').join(''),
			Swatches = Object.entries(YearReview.Palettes).map(([id, Palette]) =>
				'<button class="yr-swatch game-cursor' + (id === YearReview.Color ? ' active' : '') + '" data-color="' + id + '" title="' + Text('Colors.' + id) + '"' +
				' style="background: linear-gradient(135deg, ' + Palette.bg[0] + ' 0 50%, ' + [].concat(Palette.accent).join(', ') + ')"></button>'
			).join('');

		return '<label class="yr-design game-cursor">' + Text('Design') + ' <select id="yearReviewDesign" class="game-cursor">' + Designs + '</select></label>' +
			'<button class="btn yr-random" title="' + Text('Random') + '">🎲 ' + Text('Random') + '</button>' +
			'<div class="yr-swatches" title="' + Text('Color') + '">' + Swatches + '</div>';
	},


	/**
	 * Switches design and colours, remembers them and redraws the shown card.
	 *
	 * @param {string} design Key in YearReview.Designs.
	 * @param {string} color Key in YearReview.Palettes.
	 */
	SetStyle: (design, color) => {
		YearReview.Design = design;
		YearReview.Color = color;
		localStorage.setItem('YearReviewDesign', design);
		localStorage.setItem('YearReviewColor', color);

		$('#yearReviewDesign').val(design);
		$('#yearReview .yr-swatch').removeClass('active').filter('[data-color="' + color + '"]').addClass('active');

		YearReview.Redraw();
	},


	/**
	 * Rolls another design and another colour scheme.
	 */
	Shuffle: () => {
		const Other = (list, current) => {
			const Choice = list.filter(id => id !== current);
			return Choice[Math.floor(Math.random() * Choice.length)];
		};

		YearReview.SetStyle(Other(Object.keys(YearReview.Designs), YearReview.Design), Other(Object.keys(YearReview.Palettes), YearReview.Color));
	},


	/**
	 * Draws the shown figures again in the current style.
	 */
	Redraw: () => {
		if (!YearReview.Last) return;

		YearReview.Canvas = YearReview.Draw(YearReview.Last.Data, YearReview.Last.Tiles);
		$('#yearReviewBody .yr-card').empty().append(YearReview.Canvas);
	},


	/**
	 * Breaks a text into lines that fit a width with the current canvas font.
	 *
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {string} text
	 * @param {number} width Available width in pixels.
	 * @param {number} max Maximum number of lines, the last one is cut with an ellipsis.
	 * @returns {string[]}
	 */
	Wrap: (ctx, text, width, max) => {
		const Lines = [];
		let Line = '';

		for (const Word of String(text).split(' ')) {
			const Test = (Line ? Line + ' ' + Word : Word);

			if (Line && ctx.measureText(Test).width > width) {
				Lines.push(Line);
				Line = Word;
			}
			else Line = Test;
		}
		if (Line) Lines.push(Line);

		if (Lines.length > max) {
			Lines.length = max;
			while (Lines[max - 1].length > 1 && ctx.measureText(Lines[max - 1] + '…').width > width) Lines[max - 1] = Lines[max - 1].slice(0, -1);
			Lines[max - 1] += '…';
		}

		return Lines;
	},


	/**
	 * Sets the largest font a single line fits its width with and returns the
	 * text, cut with an ellipsis when even the smallest size is too wide.
	 *
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {string} text
	 * @param {number} width Available width in pixels.
	 * @param {function(number): string} font Font string for a size.
	 * @param {number} size Preferred font size.
	 * @param {number} min Smallest font size.
	 * @returns {string}
	 */
	Fit: (ctx, text, width, font, size, min) => {
		for (ctx.font = font(size); size > min && ctx.measureText(text).width > width; ctx.font = font(size)) size -= 2;

		return YearReview.Wrap(ctx, text, width, 1)[0] || '';
	},


	/**
	 * Font families of the designs, each with fallbacks every system has.
	 *
	 * @type {Object<string,string>}
	 */
	Families: {
		sans: '"Trebuchet MS", "Segoe UI", Arial, sans-serif',
		light: '"Helvetica Neue", "Segoe UI", Arial, sans-serif',
		serif: 'Georgia, "Times New Roman", serif',
		mono: '"Courier New", Courier, monospace',
	},


	/**
	 * Colour schemes of the card: background gradient (top, bottom), colour of
	 * the numbers (several colours run diagonally over the card), second accent
	 * and text colour; light schemes have a bright background.
	 *
	 * @type {Object<string,{bg: string[], accent: string|string[], accent2: string, text: string, light?: boolean}>}
	 */
	Palettes: {
		bronze: { bg: ['#3a2414', '#150c06'], accent: '#ffb539', accent2: '#ff7a3d', text: '#ffe7ba' },
		gold: { bg: ['#1a1a1a', '#000000'], accent: '#f5c542', accent2: '#fff1a8', text: '#f7ecd0' },
		lava: { bg: ['#3b0d0a', '#120403'], accent: '#ff5a36', accent2: '#ffb339', text: '#ffe3d6' },
		sunset: { bg: ['#4a1f3d', '#1d0b23'], accent: ['#ffb05a', '#ff5f8f'], accent2: '#ffd36b', text: '#ffe9dc' },
		rose: { bg: ['#45182c', '#16060e'], accent: '#ff7aa8', accent2: '#ffc46b', text: '#ffe6ef' },
		amethyst: { bg: ['#2c1748', '#0e0619'], accent: '#c58bff', accent2: '#ff8bd1', text: '#f1e6ff' },
		midnight: { bg: ['#141a33', '#05070f'], accent: '#8aa4ff', accent2: '#ffd36b', text: '#e3e8ff' },
		ocean: { bg: ['#0b2b45', '#04101c'], accent: '#3ec8ff', accent2: '#7cf0d8', text: '#dff4ff' },
		petrol: { bg: ['#0d3236', '#041416'], accent: '#2fd4c2', accent2: '#ffb539', text: '#dcfbf7' },
		forest: { bg: ['#16321f', '#07130b'], accent: '#8fdc5a', accent2: '#e6c35c', text: '#e8f5dc' },
		graphite: { bg: ['#2a2c30', '#0f1012'], accent: '#f2f2f2', accent2: '#ffb539', text: '#d8dadf' },
		neon: { bg: ['#0a0a14', '#000000'], accent: '#39ff88', accent2: '#ff3df2', text: '#e9fff3' },
		cyber: { bg: ['#12002b', '#04000d'], accent: ['#00e5ff', '#ff00c8'], accent2: '#ffe600', text: '#f0e9ff' },
		aurora: { bg: ['#061a24', '#02060a'], accent: ['#5dffb0', '#43c6ff', '#b07cff'], accent2: '#5dffb0', text: '#e6fff6' },
		rainbow: { bg: ['#1c1c22', '#050507'], accent: ['#ff4d4d', '#ffb339', '#ffe14d', '#4dd97a', '#4db8ff', '#a66bff'], accent2: '#ffe14d', text: '#ffffff' },
		christmas: { bg: ['#5a0f14', '#1a0405'], accent: '#ffd56b', accent2: '#7fd88c', text: '#fff0e0' },
		arctic: { bg: ['#f4f8fc', '#dbe7f3'], accent: '#1f6fd1', accent2: '#0a8fa0', text: '#10233b', light: true },
		mint: { bg: ['#f2fbf7', '#d4efe4'], accent: '#0b8a63', accent2: '#2b6cb0', text: '#133a2e', light: true },
		parchment: { bg: ['#f8ecd0', '#e7d2a3'], accent: '#8a3b12', accent2: '#2f5d3a', text: '#3a2410', light: true },
		sakura: { bg: ['#fff1f5', '#f6d3df'], accent: '#d63a74', accent2: '#7a4bc2', text: '#4a1a2c', light: true },
		pastel: { bg: ['#f6f0ff', '#e2f0fb'], accent: ['#e0568a', '#4f7fe0', '#2fae86'], accent2: '#9b7bd8', text: '#2e2a45', light: true },
		paper: { bg: ['#ffffff', '#ececec'], accent: '#111111', accent2: '#e03131', text: '#111111', light: true },
	},


	/**
	 * Card layouts: `height` gives the card height for a number of tiles,
	 * `draw` paints the whole card. All of them only use the colours of the
	 * context, so every design works with every colour scheme.
	 *
	 * @type {Object<string,{height: function(number): number, draw: function(YearReviewContext): void}>}
	 */
	Designs: {

		// two columns of tiles, a single last tile spans both
		classic: {
			height: (n) => 250 + Math.ceil(n / 2) * 240 + 120,
			draw: (c) => {
				const Y = YearReview;

				Y.Background(c);
				Y.Header(c);
				Y.Grid(c.Tiles.length, 2, c.pad, 250, c.W - 2 * c.pad, 216, 24, true).forEach((Cell, i) => {
					Y.Box(c, Cell.x, Cell.y, Cell.w, 216, 18, c.tile, c.line);
					Y.Stack(c, c.Tiles[i], Cell.x + 28, Cell.y + 92, Cell.w - 56);
				});
				Y.Footer(c, c.H - 90);
			},
		},

		// rows of one, two and three tiles of different sizes
		bento: {
			rows: (n) => {
				const Rows = [];
				for (let i = 0, Left = n; Left > 0; i++) {
					Rows.push(Math.min([1, 2, 3, 2][i % 4], Left));
					Left -= Rows[i];
				}
				return Rows;
			},
			sizes: { 1: 260, 2: 216, 3: 224 },
			height: (n) => YearReview.Designs.bento.rows(n).reduce((Sum, k) => Sum + YearReview.Designs.bento.sizes[k] + 24, 250) + 120,
			draw: (c) => {
				const Y = YearReview,
					Bento = Y.Designs.bento;
				let Top = 250, i = 0;

				Y.Background(c);
				Y.Header(c);

				for (const k of Bento.rows(c.Tiles.length)) {
					const H = Bento.sizes[k],
						W = (c.W - 2 * c.pad - (k - 1) * 24) / k;

					for (let j = 0; j < k; j++, i++) {
						const X = c.pad + j * (W + 24);

						if (k === 1) {
							Y.Box(c, X, Top, W, H, 24, Y.Rgba(c.solid, 0.16), c.accent, 3);
							Y.Stack(c, c.Tiles[i], X + 36, Top + 128, W - 72, { value: 110, label: 36, sub: 24, lines: 1 });
						}
						else if (k === 2) {
							Y.Box(c, X, Top, W, H, 18, c.tile, c.line);
							Y.Stack(c, c.Tiles[i], X + 28, Top + 92, W - 56);
						}
						else {
							Y.Box(c, X, Top, W, H, 18, Y.Rgba(c.accent2, 0.1), c.line);
							Y.Stack(c, c.Tiles[i], X + 24, Top + 82, W - 48, { value: 56, label: 23, sub: 19, labelLines: 2, valueColor: c.accent2 });
						}
					}
					Top += H + 24;
				}
				Y.Footer(c, c.H - 90);
			},
		},

		// the first figure big in a framed panel, the others in three columns
		spotlight: {
			height: (n) => 680 + Math.ceil((n - 1) / 3) * 248 + 130,
			draw: (c) => {
				const Y = YearReview,
					[First, ...Rest] = c.Tiles,
					Full = c.W - 2 * c.pad;

				Y.Background(c, [0.5, 470], 700);
				Y.Header(c, { center: true });
				Y.Box(c, c.pad, 300, Full, 356, 28, Y.Rgba(c.solid, 0.12), c.accent, 3);
				Y.Stack(c, First, c.W / 2, 494, Full - 80, { value: 150, label: 40, sub: 26, align: 'center' });
				Y.Grid(Rest.length, 3, c.pad, 680, Full, 224, 24, false).forEach((Cell, i) => {
					Y.Box(c, Cell.x, Cell.y, Cell.w, 224, 16, c.tile, c.line);
					Y.Stack(c, Rest[i], Cell.x + 24, Cell.y + 80, Cell.w - 48, { value: 56, label: 23, sub: 19, labelLines: 2 });
				});
				Y.Footer(c, c.H - 90, { align: 'center' });
			},
		},

		// one row per figure, the number left of a bar, label and details right
		list: {
			height: (n) => 250 + n * 132 + 140,
			draw: (c) => {
				const Y = YearReview,
					Split = c.pad + 330,
					Width = c.W - c.pad - Split - 52;

				Y.Background(c);
				Y.Header(c);
				c.Tiles.forEach((Tile, i) => {
					const Top = 250 + i * 132;

					if (i % 2 === 0) Y.Box(c, c.pad, Top, c.W - 2 * c.pad, 120, 14, c.tile);
					Y.Line(c, Tile.value, Split - 24, Top + 82, 290, { size: 64, min: 30, weight: 700, color: c.accent, align: 'right' });
					Y.Box(c, Split, Top + 24, 4, 72, 2, c.accent2);
					Y.Line(c, Tile.label, Split + 28, Top + (Tile.sub ? 52 : 72), Width, { size: 30, min: 21, weight: 700, color: c.text });
					Y.Lines(c, Tile.sub || '', Split + 28, Top + 88, Width, { size: 22, color: c.muted, max: 2, step: 26 });
				});
				Y.Footer(c, c.H - 90);
			},
		},

		// medals on ribbons, three per row
		medals: {
			height: (n) => 320 + Math.ceil(n / 3) * 426 + 110,
			draw: (c) => {
				const Y = YearReview,
					ctx = c.ctx;

				Y.Background(c, [0.5, 0], 760);
				Y.Header(c, { center: true });
				Y.Grid(c.Tiles.length, 3, c.pad, 320, c.W - 2 * c.pad, 410, 16, false).forEach((Cell, i) => {
					const Tile = c.Tiles[i],
						X = Cell.x + Cell.w / 2,
						Mid = Cell.y + 160;

					Y.Polygon(c, [[X - 56, Cell.y], [X - 18, Cell.y], [X + 12, Mid], [X - 26, Mid]], Y.Rgba(c.accent2, 0.85));
					Y.Polygon(c, [[X + 56, Cell.y], [X + 18, Cell.y], [X - 12, Mid], [X + 26, Mid]], Y.Rgba(c.accent2, 0.55));
					Y.Circle(c, X, Mid, 100, c.P.bg[0]);
					Y.Circle(c, X, Mid, 100, c.tile, i % 2 ? c.accent2 : c.accent, 10);
					ctx.beginPath();
					ctx.arc(X, Mid, 84, 0, 2 * Math.PI);
					ctx.strokeStyle = c.line;
					ctx.lineWidth = 2;
					ctx.stroke();

					Y.Line(c, Tile.value, X, Mid + 18, 150, { size: 52, min: 22, weight: 700, color: c.accent, align: 'center' });
					const Rows = Y.Lines(c, Tile.label, X, Mid + 148, Cell.w - 16, { size: 25, weight: 700, color: c.text, align: 'center', max: 2, step: 30 });
					Y.Lines(c, Tile.sub || '', X, Mid + 150 + Rows * 30, Cell.w - 16, { size: 19, color: c.muted, align: 'center', max: 2, step: 24 });
				});
				Y.Footer(c, c.H - 90, { align: 'center' });
			},
		},

		// cards alternating left and right of a centre line
		timeline: {
			height: (n) => 280 + (n - 1) * 130 + 200 + 140,
			draw: (c) => {
				const Y = YearReview,
					Mid = c.W / 2,
					CardW = Mid - c.pad - 44;

				Y.Background(c);
				Y.Header(c);
				Y.Box(c, Mid - 2, 262, 4, (c.Tiles.length - 1) * 130 + 140, 2, c.line);
				c.Tiles.forEach((Tile, i) => {
					const Top = 280 + i * 130,
						Left = (i % 2 === 0),
						X = (Left ? c.pad : Mid + 44);

					Y.Box(c, Left ? Mid - 44 : Mid + 12, Top + 99, 32, 2, 0, c.line);
					Y.Box(c, X, Top, CardW, 200, 18, c.tile, c.line);
					Y.Circle(c, Mid, Top + 100, 13, i % 2 ? c.accent2 : c.accent, c.P.bg[1], 4);
					Y.Stack(c, Tile, X + 26, Top + 86, CardW - 52, { value: 62, label: 26, sub: 20 });
				});
				Y.Footer(c, c.H - 90);
			},
		},

		// centred, thin type, no frames
		minimal: {
			height: (n) => 380 + Math.ceil(n / 2) * 230 + 130,
			draw: (c) => {
				const Y = YearReview,
					Center = c.W / 2,
					Full = c.W - 2 * c.pad;

				Y.Background(c, null);
				Y.Line(c, c.title.toUpperCase(), Center, 100, Full, { size: 28, min: 18, family: 'light', color: c.muted, align: 'center' });
				Y.Line(c, String(c.Data.year), Center, 250, Full, { size: 160, min: 100, weight: 300, family: 'light', color: c.text, align: 'center' });
				[-24, 0, 24].forEach((Offset, i) => Y.Circle(c, Center + Offset, 290, 5, i === 1 ? c.accent2 : c.accent));
				Y.Line(c, c.who, Center, 340, Full, { size: 24, min: 16, family: 'light', color: c.muted, align: 'center' });
				Y.Grid(c.Tiles.length, 2, c.pad, 380, Full, 210, 20, true).forEach((Cell, i) => {
					const X = Cell.x + Cell.w / 2;

					if (i > 0 && i % 2 === 0) Y.Box(c, c.pad, Cell.y - 10, Full, 1, 0, c.line);
					Y.Box(c, X - 20, Cell.y + 4, 40, 4, 2, c.accent);
					Y.Stack(c, c.Tiles[i], X, Cell.y + 100, Cell.w - 40, { value: 80, label: 27, sub: 21, family: 'light', valueWeight: 300, labelWeight: 400, align: 'center' });
				});
				Y.Footer(c, c.H - 90, { align: 'center', family: 'light' });
			},
		},

		// front page: masthead, the year as lead beside the first figure, two columns
		newspaper: {
			height: (n) => 560 + Math.ceil((n - 1) / 2) * 200 + 140,
			draw: (c) => {
				const Y = YearReview,
					[Lead, ...Rest] = c.Tiles,
					Full = c.W - 2 * c.pad,
					ColW = (Full - 48) / 2,
					Serif = { family: 'serif' };

				Y.Background(c, null);
				Y.Box(c, c.pad, 56, Full, 4, 0, c.text);
				Y.Line(c, moment().format('LL'), c.pad, 90, Full / 2, { ...Serif, size: 22, min: 16, weight: 'italic 400', color: c.muted });
				Y.Line(c, 'FoE Helper', c.W - c.pad, 90, Full / 2, { ...Serif, size: 22, weight: 700, color: c.text, align: 'right' });
				Y.Box(c, c.pad, 104, Full, 1, 0, c.text);
				Y.Line(c, c.title, c.W / 2, 182, Full, { ...Serif, size: 64, min: 34, weight: 700, color: c.text, align: 'center' });
				Y.Box(c, c.pad, 206, Full, 3, 0, c.text);
				Y.Box(c, c.pad, 213, Full, 1, 0, c.text);
				Y.Line(c, c.who, c.W / 2, 250, Full, { ...Serif, size: 24, min: 16, weight: 'italic 400', color: c.muted, align: 'center' });
				Y.Box(c, c.pad, 270, Full, 1, 0, c.line);

				Y.Line(c, String(c.Data.year), c.pad, 450, 380, { ...Serif, size: 170, min: 100, weight: 700, color: c.accent });
				Y.Box(c, c.pad + 404, 300, 1, 210, 0, c.line);
				Y.Stack(c, Lead, c.pad + 432, 380, Full - 432, { ...Serif, value: 92, label: 36, sub: 24, labelWeight: 'italic 700' });
				Y.Box(c, c.pad, 534, Full, 3, 0, c.text);
				Y.Box(c, c.pad, 541, Full, 1, 0, c.text);

				Rest.forEach((Tile, i) => {
					const Wide = (i === Rest.length - 1 && i % 2 === 0),
						X = c.pad + (i % 2) * (ColW + 48),
						Top = 560 + Math.floor(i / 2) * 200,
						W = (Wide ? Full : ColW);

					Y.Stack(c, Tile, X, Top + 72, W, { ...Serif, value: 62, label: 28, sub: 22, labelWeight: 'italic 700' });
					Y.Box(c, X, Top + 190, W, 1, 0, c.line);
					if (i % 2 === 1) Y.Box(c, c.W / 2, Top + 14, 1, 166, 0, c.line);
				});
				Y.Footer(c, c.H - 90, Serif);
			},
		},

		// till receipt with dotted leaders, barcode and stamp
		receipt: {
			height: (n) => 800 + n * 92,
			draw: (c) => {
				const Y = YearReview,
					ctx = c.ctx,
					PaperW = 700,
					X0 = (c.W - PaperW) / 2,
					Left = X0 + 44,
					Right = X0 + PaperW - 44,
					Inner = Right - Left,
					Center = c.W / 2,
					Ink = (c.P.light ? c.text : c.P.bg[1]),
					Faded = Y.Rgba(Ink, 0.65),
					Mono = { family: 'mono', color: Ink, align: 'center' },
					Top = 80,
					Bottom = c.H - 80,
					End = 430 + c.Tiles.length * 92,
					Edge = [];

				Y.Background(c);

				// paper with torn edges at top and bottom
				for (let x = X0; x < X0 + PaperW; x += 20) Edge.push([x, Top + 10], [x + 10, Top]);
				Edge.push([X0 + PaperW, Top + 10]);
				for (let x = X0 + PaperW; x > X0; x -= 20) Edge.push([x, Bottom - 10], [x - 10, Bottom]);
				Edge.push([X0, Bottom - 10]);
				Y.Glow(c, 'rgba(0, 0, 0, 0.45)', 30);
				Y.Polygon(c, Edge, c.P.light ? '#fffdf8' : c.text);
				Y.Glow(c);

				Y.Line(c, 'FOE HELPER', Center, 150, Inner, { ...Mono, size: 46, weight: 700 });
				Y.Line(c, 'foe-helper.com', Center, 188, Inner, { ...Mono, size: 22, color: Faded });
				Y.Line(c, c.title, Center, 250, Inner, { ...Mono, size: 28, min: 18, weight: 700 });
				Y.Line(c, String(c.Data.year), Center, 330, Inner, { ...Mono, size: 84, weight: 700 });
				Y.Line(c, c.who, Center, 374, Inner, { ...Mono, size: 22, min: 16 });
				Y.Dashes(c, Left, 404, Inner, Ink);

				c.Tiles.forEach((Tile, i) => {
					const Row = 430 + i * 92,
						ValueW = Y.Line(c, Tile.value, Right, Row + 30, Inner, { ...Mono, size: 28, weight: 700, align: 'right' }),
						LabelW = Y.Line(c, Tile.label, Left, Row + 30, Inner - ValueW - 40, { ...Mono, size: 24, min: 16, weight: 700, align: 'left' });

					// dotted leader between label and value
					for (let x = Left + LabelW + 12; x < Right - ValueW - 10; x += 12) Y.Circle(c, x, Row + 27, 1.6, Faded);
					Y.Line(c, Tile.sub || '', Left, Row + 62, Inner, { ...Mono, size: 19, align: 'left', color: Faded });
				});

				Y.Dashes(c, Left, End + 4, Inner, Ink);
				Y.Lines(c, c.note, Center, End + 52, Inner, { ...Mono, size: 19, color: Faded, max: 2, step: 26 });

				// barcode from year and world, the same card always gets the same one
				const Random = Y.Random(c.Data.year + ExtWorld);
				for (let x = Center - 230; x < Center + 230;) {
					const Bar = 2 + Math.floor(Random() * 4);
					if (Random() > 0.3) Y.Box(c, x, End + 112, Bar, 96, 0, Ink);
					x += Bar + 2 + Math.floor(Random() * 3);
				}
				Y.Line(c, '#' + c.Data.year + '-' + ExtWorld, Center, End + 240, Inner, { ...Mono, size: 20, color: Faded });

				// stamp
				const Stamp = (c.P.light ? c.accent2 : c.P.bg[0]);
				ctx.save();
				ctx.translate(Right - 60, 156);
				ctx.rotate(-0.26);
				ctx.globalAlpha = 0.8;
				Y.Circle(c, 0, 0, 58, null, Stamp, 4);
				Y.Circle(c, 0, 0, 49, null, Stamp, 1.5);
				Y.Line(c, 'FoE', 0, -14, 90, { ...Mono, size: 20, weight: 700, color: Stamp });
				Y.Line(c, String(c.Data.year), 0, 22, 96, { ...Mono, size: 32, weight: 700, color: Stamp });
				ctx.restore();
			},
		},

		// glowing outlines on a grid
		neon: {
			height: (n) => YearReview.Designs.classic.height(n),
			draw: (c) => {
				const Y = YearReview,
					Grid = Y.Rgba(c.solid, 0.07);

				Y.Background(c);
				// darker than the scheme, so the glow stands out
				if (!c.P.light) Y.Box(c, 0, 0, c.W, c.H, 0, 'rgba(0, 0, 0, 0.45)');
				for (let x = 0; x < c.W; x += 54) Y.Box(c, x, 0, 1, c.H, 0, Grid);
				for (let y = 0; y < c.H; y += 54) Y.Box(c, 0, y, c.W, 1, 0, Grid);

				Y.Glow(c, c.solid, 28);
				Y.Header(c);
				Y.Glow(c);

				Y.Grid(c.Tiles.length, 2, c.pad, 250, c.W - 2 * c.pad, 216, 24, true).forEach((Cell, i) => {
					const Color = (i % 2 ? c.accent2 : c.accent),
						Glow = (i % 2 ? c.accent2 : c.solid);

					Y.Glow(c, Glow, 18);
					Y.Box(c, Cell.x, Cell.y, Cell.w, 216, 18, Y.Rgba(c.P.bg[1], 0.6), Color, 3);
					Y.Glow(c);
					Y.Stack(c, c.Tiles[i], Cell.x + 28, Cell.y + 92, Cell.w - 56, { valueColor: Color, glow: Glow });
				});
				Y.Footer(c, c.H - 90);
			},
		},

		// blocky typewriter look with hard shadows on a checkerboard
		pixel: {
			height: (n) => YearReview.Designs.classic.height(n),
			draw: (c) => {
				const Y = YearReview,
					Block = 40,
					Check = Y.Rgba(c.text, 0.03);

				Y.Background(c, null);
				for (let y = 0; y < c.H; y += Block) {
					for (let x = (y / Block % 2) * Block; x < c.W; x += 2 * Block) Y.Box(c, x, y, Block, Block, 0, Check);
				}

				Y.Header(c, { family: 'mono', upper: true, shadow: Y.Rgba(c.accent2, 0.7), rule: false });
				for (let x = c.pad; x < c.W - c.pad; x += 24) Y.Box(c, x, 224, 14, 8, 0, c.accent);

				Y.Grid(c.Tiles.length, 2, c.pad, 250, c.W - 2 * c.pad, 216, 24, true).forEach((Cell, i) => {
					Y.Box(c, Cell.x + 10, Cell.y + 10, Cell.w, 216, 0, Y.Rgba(c.accent2, 0.7));
					Y.Box(c, Cell.x, Cell.y, Cell.w, 216, 0, c.P.bg[0], c.text, 4);
					Y.Stack(c, c.Tiles[i], Cell.x + 28, Cell.y + 92, Cell.w - 56, { family: 'mono', value: 70, label: 25, sub: 20 });
				});
				Y.Footer(c, c.H - 90, { family: 'mono' });
			},
		},

		// portrait 9:16 for status and story posts, the rows share the height
		story: {
			height: () => 1920,
			draw: (c) => {
				const Y = YearReview,
					Center = c.W / 2,
					Full = c.W - 2 * c.pad,
					Cols = (c.Tiles.length > 5 ? 2 : 1),
					Rows = Math.ceil(c.Tiles.length / Cols),
					Row = Math.min(230, 1130 / Rows),
					Value = Math.round(Math.min(110, Row * 0.46)),
					Label = Math.round(Math.max(20, Math.min(36, Row * 0.17))),
					Sub = (Row >= 170 ? 24 : 0),
					Block = Value * 0.75 + Label * 1.5 + Sub * 1.48;

				Y.Background(c, [0.5, 380], 900);
				Y.Line(c, c.title, Center, 190, Full, { size: 46, min: 28, weight: 700, color: c.text, align: 'center' });
				Y.Line(c, String(c.Data.year), Center, 430, Full, { size: 240, min: 120, weight: 700, color: c.accent, align: 'center' });
				Y.Line(c, c.who, Center, 500, Full, { size: 34, min: 20, color: c.text, align: 'center' });
				Y.Box(c, Center - 80, 540, 160, 6, 3, c.accent2);

				// few rows are centred in the space between header and footer
				Y.Grid(c.Tiles.length, Cols, c.pad, 600 + (1130 - Rows * Row) / 2, Full, Row, 0, true).forEach((Cell, i) => {
					const X = Cell.x + Cell.w / 2;

					if (Cols === 1 && i > 0) Y.Circle(c, X, Cell.y, 4, c.accent2);
					Y.Stack(c, c.Tiles[i], X, Cell.y + (Row - Block) / 2 + Value * 0.75, Cell.w - 24, { value: Value, label: Label, sub: Sub || 20, lines: Sub ? 1 : 0, align: 'center' });
				});
				Y.Footer(c, c.H - 110, { align: 'center' });
			},
		},
	},


	/**
	 * Converts a #rrggbb colour into rgba() with the given opacity.
	 *
	 * @param {string} hex
	 * @param {number} alpha
	 * @returns {string}
	 */
	Rgba: (hex, alpha) => 'rgba(' + [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ', ' + alpha + ')',


	/**
	 * Small seeded random number generator, so decorations stay the same for the same card.
	 *
	 * @param {string} seed
	 * @returns {function(): number} Numbers from 0 to below 1.
	 */
	Random: (seed) => {
		let Hash = [...String(seed)].reduce((h, Char) => Math.imul(h ^ Char.charCodeAt(0), 16777619), 2166136261);

		return () => {
			Hash = Math.imul(Hash ^ (Hash >>> 15), 2246822507);
			Hash = Math.imul(Hash ^ (Hash >>> 13), 3266489909);
			return ((Hash ^= Hash >>> 16) >>> 0) / 4294967296;
		};
	},


	/**
	 * Everything a design needs to paint: canvas, figures and the resolved colours.
	 *
	 * @param {CanvasRenderingContext2D} ctx
	 * @param {Object} Data Output of Collect().
	 * @param {YearReviewTile[]} Tiles Output of Tiles().
	 * @returns {YearReviewContext}
	 */
	Context: (ctx, Data, Tiles) => {
		const { Rgba, Text } = YearReview,
			P = YearReview.Palettes[YearReview.Color] || YearReview.Palettes.bronze,
			W = ctx.canvas.width,
			H = ctx.canvas.height,
			Colors = [].concat(P.accent);
		let Accent = Colors[0];

		// several accent colours run diagonally, so the tiles get different shades
		if (Colors.length > 1) {
			Accent = ctx.createLinearGradient(0, 0, W, H);
			Colors.forEach((Color, i) => Accent.addColorStop(i / (Colors.length - 1), Color));
		}

		return {
			ctx, W, H, Data, Tiles, P,
			pad: 56,
			accent: Accent,
			solid: Colors[0],
			accent2: P.accent2,
			text: P.text,
			muted: Rgba(P.text, 0.68),
			soft: Rgba(P.text, 0.6),
			tile: Rgba(P.text, 0.07),
			line: Rgba(P.text, 0.22),
			title: Text('CardTitle'),
			who: [YearReview.HideNames ? null : ExtPlayerName, ExtWorld, i18n('Eras.' + CurrentEraID)].filter(Boolean).join('  ·  '),
			note: Text('CardNote', { date: moment(Data.days?.since || Data.progress?.since || undefined).format('L') }),
			font: (size, weight = 400, family = 'sans') => weight + ' ' + size + 'px ' + YearReview.Families[family],
		};
	},


	/**
	 * Draws one line of text in the largest size up to `size` that fits the
	 * width, cut with an ellipsis below `min`.
	 *
	 * @param {YearReviewContext} c
	 * @param {string} text
	 * @param {number} x Anchor of the alignment.
	 * @param {number} y Baseline.
	 * @param {number} width Available width.
	 * @param {{size: number, min?: number, weight?: number|string, family?: string, color: string|CanvasGradient, align?: CanvasTextAlign}} o
	 * @returns {number} Width of the drawn text.
	 */
	Line: (c, text, x, y, width, o) => {
		const Text = YearReview.Fit(c.ctx, String(text), width, size => c.font(size, o.weight, o.family), o.size, o.min || o.size);

		c.ctx.fillStyle = o.color;
		c.ctx.textAlign = o.align || 'left';
		c.ctx.fillText(Text, x, y);

		return c.ctx.measureText(Text).width;
	},


	/**
	 * Draws a text wrapped onto up to `max` lines.
	 *
	 * @param {YearReviewContext} c
	 * @param {string} text
	 * @param {number} x Anchor of the alignment.
	 * @param {number} y Baseline of the first line.
	 * @param {number} width Available width.
	 * @param {{size: number, weight?: number|string, family?: string, color: string, align?: CanvasTextAlign, max?: number, step?: number}} o
	 * @returns {number} Number of drawn lines.
	 */
	Lines: (c, text, x, y, width, o) => {
		c.ctx.font = c.font(o.size, o.weight, o.family);
		c.ctx.fillStyle = o.color;
		c.ctx.textAlign = o.align || 'left';
		const Wrapped = YearReview.Wrap(c.ctx, text, width, o.max || 2);
		Wrapped.forEach((Line, n) => c.ctx.fillText(Line, x, y + n * (o.step || o.size * 1.2)));

		return Wrapped.length;
	},


	/**
	 * Number, label and details of a tile below each other.
	 *
	 * @param {YearReviewContext} c
	 * @param {YearReviewTile} tile
	 * @param {number} x Anchor of the alignment.
	 * @param {number} y Baseline of the number.
	 * @param {number} width Available width.
	 * @param {{value?: number, label?: number, sub?: number, lines?: number, family?: string, align?: CanvasTextAlign, valueColor?: string|CanvasGradient, valueWeight?: number, labelWeight?: number|string, labelLines?: number, glow?: string}} [o]
	 *        Font sizes, number of detail lines (0 hides them), lines the label may wrap onto, glow colour of the number.
	 */
	Stack: (c, tile, x, y, width, o = {}) => {
		const Y = YearReview,
			Value = o.value || 76,
			Label = o.label || 29,
			Sub = o.sub || 23,
			Family = o.family || 'sans',
			Align = o.align || 'left';

		if (o.glow) Y.Glow(c, o.glow, 20);
		Y.Line(c, tile.value, x, y, width, { size: Value, min: Math.round(Value / 2), weight: o.valueWeight || 700, family: Family, color: o.valueColor || c.accent, align: Align });
		Y.Glow(c);

		// narrow tiles wrap the label instead of shrinking it, the details move down
		const LabelY = y + Label * 1.5,
			Extra = (o.labelLines > 1 ? Y.Lines(c, tile.label, x, LabelY, width, { size: Label, weight: o.labelWeight || 700, family: Family, color: c.text, align: Align, max: o.labelLines }) - 1 : 0) * Label * 1.2;

		if (!o.labelLines || o.labelLines < 2) Y.Line(c, tile.label, x, LabelY, width, { size: Label, min: Math.round(Label * 0.72), weight: o.labelWeight || 700, family: Family, color: c.text, align: Align });
		if (o.lines !== 0) Y.Lines(c, tile.sub || '', x, LabelY + Extra + Sub * 1.48, width, { size: Sub, family: Family, color: c.muted, align: Align, max: o.lines || 2, step: Sub * 1.22 });
	},


	/**
	 * Fills and/or strokes a rectangle, rounded where the browser can (Chrome 99, Firefox 112).
	 *
	 * @param {YearReviewContext} c
	 * @param {number} x
	 * @param {number} y
	 * @param {number} w
	 * @param {number} h
	 * @param {number} r Corner radius, 0 for square corners.
	 * @param {?(string|CanvasGradient)} fill
	 * @param {?(string|CanvasGradient)} [stroke]
	 * @param {number} [width] Line width of the stroke.
	 */
	Box: (c, x, y, w, h, r, fill, stroke = null, width = 2) => {
		const ctx = c.ctx;

		ctx.beginPath();
		(r && ctx.roundRect) ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
		if (fill) {
			ctx.fillStyle = fill;
			ctx.fill();
		}
		if (stroke) {
			ctx.strokeStyle = stroke;
			ctx.lineWidth = width;
			ctx.stroke();
		}
	},


	/**
	 * Fills and/or strokes a circle.
	 *
	 * @param {YearReviewContext} c
	 * @param {number} x Centre.
	 * @param {number} y Centre.
	 * @param {number} r Radius.
	 * @param {?(string|CanvasGradient)} fill
	 * @param {?(string|CanvasGradient)} [stroke]
	 * @param {number} [width] Line width of the stroke.
	 */
	Circle: (c, x, y, r, fill, stroke = null, width = 2) => {
		const ctx = c.ctx;

		ctx.beginPath();
		ctx.arc(x, y, r, 0, 2 * Math.PI);
		if (fill) {
			ctx.fillStyle = fill;
			ctx.fill();
		}
		if (stroke) {
			ctx.strokeStyle = stroke;
			ctx.lineWidth = width;
			ctx.stroke();
		}
	},


	/**
	 * Fills a closed polygon.
	 *
	 * @param {YearReviewContext} c
	 * @param {number[][]} points [x, y] corners.
	 * @param {string|CanvasGradient} fill
	 */
	Polygon: (c, points, fill) => {
		c.ctx.beginPath();
		points.forEach(([x, y], i) => (i ? c.ctx.lineTo(x, y) : c.ctx.moveTo(x, y)));
		c.ctx.closePath();
		c.ctx.fillStyle = fill;
		c.ctx.fill();
	},


	/**
	 * Horizontal dashed rule.
	 *
	 * @param {YearReviewContext} c
	 * @param {number} x
	 * @param {number} y
	 * @param {number} width
	 * @param {string} color
	 */
	Dashes: (c, x, y, width, color) => {
		for (let X = x; X < x + width; X += 16) YearReview.Box(c, X, y, 9, 2, 0, color);
	},


	/**
	 * Sets a glow (shadow) for the following drawing, without arguments it is switched off.
	 *
	 * @param {YearReviewContext} c
	 * @param {?string} [color]
	 * @param {number} [blur]
	 */
	Glow: (c, color = null, blur = 0) => {
		c.ctx.shadowColor = color || 'transparent';
		c.ctx.shadowBlur = blur;
	},


	/**
	 * Background gradient of the colour scheme with an optional glow in the accent colour.
	 *
	 * @param {YearReviewContext} c
	 * @param {?number[]} [glow] Centre of the glow as [fraction of the width, y in pixels], null for none.
	 * @param {number} [radius] Radius of the glow.
	 */
	Background: (c, glow = [0.8, 0], radius = 620) => {
		const { ctx, W, H, P } = c,
			Back = ctx.createLinearGradient(0, 0, 0, H);

		Back.addColorStop(0, P.bg[0]);
		Back.addColorStop(1, P.bg[1]);
		ctx.fillStyle = Back;
		ctx.fillRect(0, 0, W, H);

		if (!glow) return;

		const Glow = ctx.createRadialGradient(glow[0] * W, glow[1], 0, glow[0] * W, glow[1], radius);
		Glow.addColorStop(0, YearReview.Rgba(c.solid, P.light ? 0.2 : 0.28));
		Glow.addColorStop(1, YearReview.Rgba(c.solid, 0));
		ctx.fillStyle = Glow;
		ctx.fillRect(0, 0, W, H);
	},


	/**
	 * Headline, year and player line. Left aligned it ends with a rule at 228,
	 * centred the player line sits at 262.
	 *
	 * @param {YearReviewContext} c
	 * @param {{center?: boolean, family?: string, upper?: boolean, shadow?: string, rule?: boolean}} [o]
	 *        Centred layout, font family, headline in capitals, offset shadow of the year, rule below.
	 */
	Header: (c, o = {}) => {
		const Y = YearReview,
			Full = c.W - 2 * c.pad,
			Family = o.family || 'sans',
			Title = (o.upper ? c.title.toUpperCase() : c.title),
			Year = String(c.Data.year);

		if (o.center) {
			Y.Line(c, Title, c.W / 2, 92, Full, { size: 40, min: 24, weight: 700, family: Family, color: c.text, align: 'center' });
			Y.Line(c, Year, c.W / 2, 214, Full, { size: 120, min: 80, weight: 700, family: Family, color: c.accent, align: 'center' });
			Y.Line(c, c.who, c.W / 2, 262, Full, { size: 28, min: 18, family: Family, color: c.text, align: 'center' });
			return;
		}

		Y.Line(c, Title, c.pad, 92, Full, { size: 40, min: 24, weight: 700, family: Family, color: c.text });
		if (o.shadow) Y.Line(c, Year, c.pad + 2, 212, 440, { size: 120, weight: 700, family: Family, color: o.shadow });
		Y.Line(c, Year, c.pad - 6, 204, 440, { size: 120, weight: 700, family: Family, color: c.accent });
		Y.Line(c, c.who, c.W - c.pad, 196, Full - 330, { size: 30, min: 20, family: Family, color: c.text, align: 'right' });
		if (o.rule !== false) Y.Box(c, c.pad, 228, Full, 3, 0, c.accent);
	},


	/**
	 * Footer: where the numbers come from, brand and address.
	 *
	 * @param {YearReviewContext} c
	 * @param {number} y Top of the footer, the brand line is 56 below.
	 * @param {{align?: CanvasTextAlign, family?: string}} [o]
	 */
	Footer: (c, y, o = {}) => {
		const Y = YearReview,
			Align = o.align || 'left',
			Family = o.family || 'sans',
			X = (Align === 'center' ? c.W / 2 : c.pad);

		Y.Line(c, c.note, X, y + 12, c.W - 2 * c.pad, { size: 23, min: 16, family: Family, color: c.soft, align: Align });

		c.ctx.font = c.font(28, 700, Family);
		const Brand = c.ctx.measureText('FoE Helper').width + 18;
		c.ctx.font = c.font(23, 400, Family);
		const Start = (Align === 'center' ? X - (Brand + c.ctx.measureText('foe-helper.com').width) / 2 : X);

		Y.Line(c, 'FoE Helper', Start, y + 56, Brand, { size: 28, weight: 700, family: Family, color: c.accent });
		Y.Line(c, 'foe-helper.com', Start + Brand, y + 56, c.W, { size: 23, family: Family, color: c.soft });
	},


	/**
	 * Cells of a grid: a shorter last row is centred, or with `widen` stretched
	 * over the full width.
	 *
	 * @param {number} n Number of cells.
	 * @param {number} cols Columns.
	 * @param {number} x Left edge.
	 * @param {number} y Top edge.
	 * @param {number} width Full width.
	 * @param {number} height Cell height.
	 * @param {number} gap Gap between cells.
	 * @param {boolean} widen Stretch the last row instead of centring it.
	 * @returns {{x: number, y: number, w: number}[]}
	 */
	Grid: (n, cols, x, y, width, height, gap, widen) => {
		const CellW = (width - (cols - 1) * gap) / cols,
			Cells = [];

		for (let i = 0; i < n; i++) {
			const Row = Math.floor(i / cols),
				Col = i % cols,
				InRow = Math.min(cols, n - Row * cols),
				Top = y + Row * (height + gap);

			if (InRow < cols && widen) {
				const W = (width - (InRow - 1) * gap) / InRow;
				Cells.push({ x: x + Col * (W + gap), y: Top, w: W });
			}
			else Cells.push({ x: x + (cols - InRow) * (CellW + gap) / 2 + Col * (CellW + gap), y: Top, w: CellW });
		}

		return Cells;
	},


	/**
	 * Draws the card in the chosen design and colours.
	 *
	 * @param {Object} Data Output of Collect().
	 * @param {YearReviewTile[]} Tiles Output of Tiles().
	 * @returns {HTMLCanvasElement}
	 */
	Draw: (Data, Tiles) => {
		const Design = YearReview.Designs[YearReview.Design] || YearReview.Designs.classic,
			Canvas = document.createElement('canvas');

		Canvas.width = YearReview.Width;
		Canvas.height = Design.height(Tiles.length);

		const ctx = Canvas.getContext('2d');
		ctx.textBaseline = 'alphabetic';
		Design.draw(YearReview.Context(ctx, Data, Tiles));

		return Canvas;
	},


	/**
	 * Downloads the card as a PNG file.
	 */
	Save: () => {
		YearReview.Canvas?.toBlob((blob) => download(blob, 'foe-' + YearReview.Year + '-' + ExtWorld + '.png', 'image/png'), 'image/png');
	},


	/**
	 * Copies the card to the clipboard as an image, ready to paste into a chat.
	 */
	Copy: () => {
		YearReview.Canvas?.toBlob(async (blob) => {
			try {
				await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
				HTML.ShowToastMsg({ head: i18n('Boxes.YearReview.Title'), text: i18n('Boxes.YearReview.Copied'), type: 'success', hideAfter: 3000, show: true });
			}
			catch (err) {
				HTML.ShowToastMsg({ head: i18n('Boxes.YearReview.Title'), text: i18n('Boxes.YearReview.CopyFailed'), type: 'error', hideAfter: 5000, show: true });
			}
		}, 'image/png');
	},
};
