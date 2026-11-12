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

	/** @type {number} card width in pixels, the height follows the number of tiles */
	Width: 1080,


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

		$('#yearReview').on('change', '#yearReviewYear', function () {
			YearReview.Year = parseInt($(this).val());
			YearReview.Render();
		}).on('click', '#yearReviewHideNames', function () {
			YearReview.HideNames = $(this).prop('checked');
			localStorage.setItem('YearReviewHideNames', YearReview.HideNames);
			YearReview.Render();
		}).on('click', '.yr-save', YearReview.Save).on('click', '.yr-copy', YearReview.Copy);

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
		}
		h.push('</div>');

		if (Tiles.length === 0) {
			YearReview.Canvas = null;
			h.push('<div class="yr-empty">' + Text('Empty', { year: Year }) + '</div>');
		}
		else {
			h.push('<div class="yr-card"></div>');
			h.push('<div class="yr-note">' + Text('Note') + '</div>');
		}

		$('#yearReviewBody').html(h.join(''));

		if (Tiles.length > 0) {
			YearReview.Canvas = YearReview.Draw(Data, Tiles);
			$('#yearReviewBody .yr-card').append(YearReview.Canvas);
		}
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
	 * Draws the card: header with year, player and world, the tiles in two
	 * columns and a footer saying where the numbers come from.
	 *
	 * @param {Object} Data Output of Collect().
	 * @param {YearReviewTile[]} Tiles Output of Tiles().
	 * @returns {HTMLCanvasElement}
	 */
	Draw: (Data, Tiles) => {
		const { Text, Wrap, Fit } = YearReview,
			Font = (size, weight = 400) => weight + ' ' + size + 'px "Trebuchet MS", "Segoe UI", Arial, sans-serif',
			Bold = (size) => Font(size, 700),
			Width = YearReview.Width,
			Pad = 56,
			Gap = 24,
			Header = 250,
			Footer = 120,
			TileW = (Width - 2 * Pad - Gap) / 2,
			TileH = 216,
			Rows = Math.ceil(Tiles.length / 2),
			Height = Header + Rows * (TileH + Gap) + Footer,
			Canvas = document.createElement('canvas'),
			ctx = Canvas.getContext('2d'),
			Sunflower = '#ffb539',
			Beige = '#ffe7ba';

		Canvas.width = Width;
		Canvas.height = Height;

		// background: warm dark gradient with a glow behind the header
		const Back = ctx.createLinearGradient(0, 0, 0, Height);
		Back.addColorStop(0, '#3a2414');
		Back.addColorStop(1, '#150c06');
		ctx.fillStyle = Back;
		ctx.fillRect(0, 0, Width, Height);

		const Glow = ctx.createRadialGradient(Width * 0.8, 0, 0, Width * 0.8, 0, 620);
		Glow.addColorStop(0, 'rgba(255, 181, 57, 0.28)');
		Glow.addColorStop(1, 'rgba(255, 181, 57, 0)');
		ctx.fillStyle = Glow;
		ctx.fillRect(0, 0, Width, Header + 200);

		// header
		ctx.textBaseline = 'alphabetic';
		ctx.fillStyle = Beige;
		ctx.font = Font(40, 700);
		ctx.fillText(Text('CardTitle'), Pad, 92);

		ctx.fillStyle = Sunflower;
		ctx.font = Font(120, 700);
		ctx.fillText(String(Data.year), Pad - 6, 204);

		const Who = [YearReview.HideNames ? null : ExtPlayerName, ExtWorld, i18n('Eras.' + CurrentEraID)].filter(Boolean).join('  ·  ');
		ctx.fillStyle = Beige;
		ctx.textAlign = 'right';
		ctx.fillText(Fit(ctx, Who, Width - 2 * Pad - 330, Font, 30, 20), Width - Pad, 196);
		ctx.textAlign = 'left';

		ctx.fillStyle = Sunflower;
		ctx.fillRect(Pad, Header - 22, Width - 2 * Pad, 3);

		// tiles; a single one in the last row spans both columns
		Tiles.forEach((Tile, i) => {
			const Wide = (i === Tiles.length - 1 && Tiles.length % 2 === 1),
				W = (Wide ? Width - 2 * Pad : TileW),
				X = Pad + (i % 2) * (TileW + Gap),
				Y = Header + Math.floor(i / 2) * (TileH + Gap),
				Inner = W - 56;

			ctx.fillStyle = 'rgba(255, 231, 186, 0.07)';
			ctx.strokeStyle = 'rgba(255, 231, 186, 0.22)';
			ctx.lineWidth = 2;
			ctx.beginPath();
			// rounded corners where the browser knows them (Chrome 99, Firefox 112)
			ctx.roundRect ? ctx.roundRect(X, Y, W, TileH, 18) : ctx.rect(X, Y, W, TileH);
			ctx.fill();
			ctx.stroke();

			// number and label shrink until they fit their tile
			ctx.fillStyle = Sunflower;
			ctx.fillText(Fit(ctx, Tile.value, Inner, Bold, 76, 36), X + 28, Y + 92);

			ctx.fillStyle = Beige;
			ctx.fillText(Fit(ctx, Tile.label, Inner, Bold, 29, 21), X + 28, Y + 136);

			ctx.fillStyle = 'rgba(255, 231, 186, 0.68)';
			ctx.font = Font(23);
			Wrap(ctx, Tile.sub || '', Inner, 2).forEach((Line, n) => ctx.fillText(Line, X + 28, Y + 170 + n * 28));
		});

		// footer
		const Bottom = Height - Footer + 30;
		ctx.fillStyle = 'rgba(255, 231, 186, 0.6)';
		ctx.font = Font(23);
		ctx.fillText(Text('CardNote', { date: moment(Data.days?.since || Data.progress?.since || undefined).format('L') }), Pad, Bottom + 12);

		ctx.fillStyle = Sunflower;
		ctx.font = Font(28, 700);
		ctx.fillText('FoE Helper', Pad, Bottom + 56);
		ctx.fillStyle = 'rgba(255, 231, 186, 0.6)';
		ctx.font = Font(23);
		ctx.fillText('foe-helper.com', Pad + 170, Bottom + 56);

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
