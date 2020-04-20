/*
 * **************************************************************************************
 *
 * Dateiname:                 plunderer.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              07.04.20, 21:58 Uhr
 * zuletzt bearbeitet:        07.04.20, 15:46 Uhr
 *
 * Copyright © 2020
 *
 * **************************************************************************************
 */

// Detect shield
FoEproxy.addHandler('OtherPlayerService', 'getCityProtections', async(data, postData) => {
	// Deffer handling city protection in next tick, to ensure PlayerDict is fetched
	setTimeout(async () => {
		const r = data.responseData;
		if (!Array.isArray(r)) { return; }
		const shielded = r.filter(it => it.expireTime > 0); // -1 for users that cannot pvp, ignore them

		for (const shieldInfo of shielded) {
			const playerId = shieldInfo.playerId;
			const lastShieldAction = await IndexDB.db.actions.where({playerId: playerId}).and(it => it.type === Plunderer.ACTION_TYPE_SHIELDED).last();

			// If in db already exists actual shield info than skip
			if (lastShieldAction && new Date(lastShieldAction.expireTime * 1000) >= new Date()) {continue;}

			await IndexDB.db.actions.add({
				type: Plunderer.ACTION_TYPE_SHIELDED,
				playerId: playerId,
				date: new Date,
				expireTime: shieldInfo.expireTime,
			});
			await IndexDB.addUserFromPlayerDictIfNotExists(playerId);
		}
	})
});

FoEproxy.addHandler('BattlefieldService', 'all', async (data, postData) => {
	const isAutoBattle = data.responseData.isAutoBattle; // isAutoBattle is part of BattleRealm only
	//
	const state = data.responseData.__class__ === 'BattleRealm' ? data.responseData.state : data.responseData;
	if (state.__class__ !== 'BattleRealmState') {
		return;
	}

	const {winnerBit, surrenderBit, unitsOrder, ranking_data, round} = state;
	const era = (ranking_data &&
		ranking_data.ranking &&
		ranking_data.ranking[0] &&
		ranking_data.ranking[0].era) || 'unknown';
	const actionType =
		winnerBit === 1 ? Plunderer.ACTION_TYPE_BATTLE_WIN :
			winnerBit === 2 ? Plunderer.ACTION_TYPE_BATTLE_LOSS :
				surrenderBit === 1 ? Plunderer.ACTION_TYPE_BATTLE_SURRENDERED : null;

	if (!actionType) {
		return;
	}

	const myUnits = unitsOrder.filter(it => it.teamFlag === 1).map(adaptUnit(true));
	const otherUnits = unitsOrder.filter(it => it.teamFlag === 2).map(adaptUnit(false));
	const defenderPlayerId = data.responseData.defenderPlayerId || otherUnits[0].ownerId;

	// defenderPlayerId = -1 if PVE
	if (defenderPlayerId <= 0) {
		return;
	}

	// Avoid adding defend battles (when view recorded defend battles)
	if (defenderPlayerId == ExtPlayerID) { return ; }

	// Ensure user is exists in db already
	await IndexDB.addUserFromPlayerDictIfNotExists(defenderPlayerId);

	// Add action
	await IndexDB.db.actions.add({
		playerId: defenderPlayerId,
		date: new Date(),
		type: actionType,
		battle: {
			myArmy: myUnits,
			otherArmy: otherUnits,
			round,
			auto: !!isAutoBattle,
			era,
		}
	});

	Plunderer.UpdateBoxIfVisible();

	function adaptUnit(isAttacking)
	{
		return function(unit) {
			const bonuses = Unit.GetBoostSums(unit.bonuses);
			const attBoost = isAttacking ? bonuses.AttackAttackBoost : bonuses.DefenseAttackBoost;
			const defBoost = isAttacking ? bonuses.AttackDefenseBoost : bonuses.DefenseDefenseBoost;

			return {
				startHP: unit.startHitpoints,
				endHp: unit.currentHitpoints || 0,
				attBoost: attBoost || 0,
				defBoost: defBoost || 0,
				unitTypeId: unit.unitTypeId,
				ownerId: unit.ownerId,
			}
		}
	}
});

FoEproxy.addHandler('CityMapService', 'reset', async (data, postData) => {
	const r = data.responseData;

	if (!Array.isArray(r)) {
		return;
	}

	r.forEach(async (it) => {
		const entityId = it.id;
		const playerId = it.player_id;
		if (it.state.__class__ !== 'PlunderedState') {
			return;
		}

		// Find city entity in last visited player
		const lastVisitedPlayer = Plunderer.lastVisitedPlayer;
		if (!lastVisitedPlayer) {
			return;
		}
		if (playerId !== lastVisitedPlayer.other_player.player_id) {
			return;
		}

		const entity = lastVisitedPlayer.city_map.entities.find(e => entityId === e.id);
		if (entity &&
			entity.state &&
			entity.state.current_product &&
			entity.state.current_product.product &&
			entity.state.current_product.product.resources) {
			const resources = entity.state.current_product.product.resources;
			const unimportantProds = [
				'supplies',
				'money'
			];
			const isImportant = Object.keys(resources).some(it => !unimportantProds.includes(it));
			let action = {
				playerId,
				date: new Date(),
				type: Plunderer.ACTION_TYPE_PLUNDERED,
				resources,
				sp: resources.strategy_points || 0,
				important: isImportant,
				entityId: entity.id,
				buildId: entity.cityentity_id,
			};

			await Plunderer.upsertPlunderAction(action);
		}
	});
});

// Handle double plunder bonus (Atlantis Museum). Usually this event come before CityMapService/reset
FoEproxy.addHandler('CityMapService', 'showEntityIcons', async (data, postData) => {
	// Typical structure of data:
	// "responseData": [
	//	{
	//		"id": 2440,
	//		"type": "citymap_icon_plunder_and_pillage",
	//		"__class__": "CityEntityIcon"
	//	}
	// ],

	const r = data.responseData;

	if (!Array.isArray(r)) {
		return;
	}

	// In fact this is an array, but only one plunder id will be for sure in this event, so ignore rest array
	const doublePlunderCityId = r.filter(it => it.type === 'citymap_icon_plunder_and_pillage').map(it => it.id)[0];
	if (!doublePlunderCityId) { return }

	const playerId = Plunderer.lastVisitedPlayer.other_player.player_id;

	const action = {
		entityId: doublePlunderCityId,
		playerId,
		doublePlunder: true,
	};
	await Plunderer.upsertPlunderAction(action);
});

FoEproxy.addHandler('OtherPlayerService', 'visitPlayer', async (data, postData) => {
	const playerData = data.responseData;
	Plunderer.lastVisitedPlayer = playerData;
	await Plunderer.collectPlayer(playerData);
	if ($('#plunderer').length !== 0) {
		Plunderer.page = 1;
		Plunderer.filterByPlayerId = playerData.other_player.player_id;
		Plunderer.Show();
	}
});

let Plunderer = {

	// Cached last visited player for getting info about city before plundering
	// Sadly plunder event have no info about city entity, just collected resources
	lastVisitedPlayer: null,

	// Filter and pagination.
	page: 1,
	filterByPlayerId: null,

	// Enum for action type
	ACTION_TYPE_PLUNDERED: 1,
	ACTION_TYPE_BATTLE_WIN: 2,
	ACTION_TYPE_BATTLE_LOSS: 3,
	ACTION_TYPE_BATTLE_SURRENDERED: 4,
	ACTION_TYPE_SHIELDED: 5,

	inited: false,

	/**
	 * Upsert player in db
	 *
	 * @param player
	 * @returns {Promise<void>}
	 */
	collectPlayer: async (player) => {
		let otherPlayer = player.other_player;

		await IndexDB.db.players.put({
			id: otherPlayer.player_id,
			name: otherPlayer.name,
			clanId: otherPlayer.clan_id || 0,
			clanName: otherPlayer.clan && otherPlayer.clan.name,
			avatar: otherPlayer.avatar,
			era: player.other_player_era,
			date: new Date(),
		});
	},

	// Create or update action, also apply doublePlunder
	upsertPlunderAction: async (payload) => {
		const {entityId, playerId} = payload;
		if (!entityId || !playerId) { return; }

		await IndexDB.db.transaction('rw', IndexDB.db.actions, async () => {
			// Fetch last plunder action that happen just few seconds ago (1 minute ago)
			const lastPlunderAction = await IndexDB.db.actions.where({playerId})
						.filter(it => (it.type == Plunderer.ACTION_TYPE_PLUNDERED &&
													 it.entityId == entityId &&
													 it.date > (+new Date() - 60 * 10 * 1000)))
						.last();

			// Add missing fields if not exists jet to payload:
			payload = {
				resources: {},
				sp: 0,
				type: Plunderer.ACTION_TYPE_PLUNDERED,
				...lastPlunderAction,
				...payload,
				date: new Date(),
			}

			if (lastPlunderAction && payload.doublePlunder && !payload.doublePlunderApplied) {
				payload.sp = payload.sp * 2;
				payload.doublePlunder = true,
				payload.doublePlunderApplied = true;
				Object.keys(payload.resources).forEach(key => payload.resources[key] = payload.resources[key] * 2);
			}

			if (lastPlunderAction) {
				await IndexDB.db.actions.put(payload);
			} else {
				await IndexDB.db.actions.add(payload);
			}
		});

		Plunderer.UpdateBoxIfVisible();
	},

	/**
	 * Refresh the Box
	 */
	UpdateBoxIfVisible: () => {
		if ($('#plunderer').length !== 0) {
			Plunderer.Show();
		}
	},



	/**
	 * Create html for DOM and inject
	 */
	Show: () => {

		if ($('#plunderer').length === 0) {
			let args = {
				'id': 'plunderer',
				'title': i18n('Boxes.Plunderer.Title'),
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			};

			HTML.Box(args);
			moment.locale(i18n('Local'));
			HTML.AddCssFile('plunderer');
			HTML.AddCssFile('unit');
		}

		Plunderer.Render();

		if (!Plunderer.inited) {
			$('body').on('click', '#plundererBody .load-1st-page', function () {
				if (Plunderer.loading) {
					return;
				}
				Plunderer.page = 1;
				Plunderer.Show();
				$('#plundererBody').animate({scrollTop: 0}, 'fast');
			});

			$('body').on('click', '#plundererBody .load-next-page', function () {
				if (Plunderer.loading) {
					return;
				}
				Plunderer.page++;
				Plunderer.Show();
				$('#plundererBody').animate({scrollTop: 0}, 'fast');
			});

			$('body').on('click', '#plundererBody .select-player', function () {
				if (Plunderer.loading) {
					return;
				}

				const id = $(this).data('value');

				Plunderer.page = 1;
				Plunderer.filterByPlayerId = id ? +id : null;
				Plunderer.Show();

				$('#plundererBody').animate({scrollTop: 0}, 'fast');
			});

			Plunderer.inited = true;
		}
	},


	/**
	 * Get all the Content
	 *
	 * @returns {Promise<void>}
	 */
	Render: async () => {
		const {page, filterByPlayerId} = Plunderer;
		const perPage = 20;
		Plunderer.loading = true;

		const offset = (page - 1) * perPage,
			actionsSelect = filterByPlayerId ?
				(IndexDB.db.actions.where('playerId').equals(filterByPlayerId)) :
				(IndexDB.db.actions.orderBy('date'));

		let actions = await actionsSelect.offset(offset).limit(perPage).desc().toArray();

		const countSelect = filterByPlayerId ?
			(IndexDB.db.actions.where('playerId').equals(filterByPlayerId)) :
			(IndexDB.db.actions);

		let pages = Math.ceil((await countSelect.count()) / perPage);

		// enrich actions with player info
		const players = await IndexDB.db.players.where('id').anyOf(actions.map(it => it.playerId)).toArray();
		actions = actions.map(it => {
			const player = players.find(p => p.id === it.playerId);
			const playerFromDict = PlayerDict[it.playerId];
			// Try get info about player from indexdb, if not possible than from PlayerDict
			const playerInfo = player ? ({
				playerName: player.name,
				avatar: player.avatar,
				playerDate: player.date,
				clanId: player.clanId,
				clanName: player.clanName || i18n('Boxes.Plunderer.HasNoClan'),
				playerEra: player.era
			}) : playerFromDict ? ({
				playerName: playerFromDict.PlayerName,
				clanId: playerFromDict.ClanId || 0,
				clanName: playerFromDict.ClanName || i18n('Boxes.Plunderer.HasNoClan'),
				avatar: playerFromDict.Avatar,
				playerEra: 'unknown',
				playerDate: null,
			}) : ({
				playerName: 'Unknown',
				clanId: 'N/A',
				clanName: 'Unknown',
				avatar: null,
				playerEra: 'unknown',
				playerDate: null,
			});
			return {
				...it,
				...playerInfo,
			};
		});

		$('#plundererBody').html(`
			<div class="header">
				<div class="strategy-points">
					Calculating strategy points...
				</div>
				<div class="filter">
					${filterByPlayerId ? `${i18n('Boxes.Plunderer.filteredByUser')}. <button class="btn btn-default select-player" data-value="">
						${i18n('Boxes.Plunderer.showAllPlayers')}</button>` : i18n('Boxes.Plunderer.AllPlayers')
					}
				</div>
			</div>
			${actions.length === 0 ? `<div class="no-data"> - ${i18n('Boxes.Plunderer.noData')} - </div>` : ''}
				${Plunderer.RenderActions(actions)
			}
			<div class="pagination">
				${page > 1 && pages > 1 ? `<button class="btn btn-default load-1st-page">${i18n('Boxes.Plunderer.goto1stPage')}</button>` : ''}
				${i18n('Boxes.Plunderer.Page')} ${page}/${pages}
				${pages > page ? `<button class="btn btn-default load-next-page">${i18n('Boxes.Plunderer.nextPage')}</button>` : ''}
			</div>`);

		await Plunderer.calculateSP(filterByPlayerId);
		Plunderer.loading = false;
	},


	/**
	 * Calculate the ForgePoints for 1 Week
	 *
	 * @param filterByPlayerId
	 * @returns {Promise<void>}
	 */
	calculateSP: async (filterByPlayerId) => {
		const dateThisWeek = moment().subtract(1, 'weeks').toDate();
		const dateToday = moment().startOf('day').toDate();

		let todaySP = 0;
		let thisWeekSP = 0;
		let totalSPSelect = filterByPlayerId ?
			(IndexDB.db.actions.where('playerId').equals(filterByPlayerId)) :
			(IndexDB.db.actions.where('type').equals(Plunderer.ACTION_TYPE_PLUNDERED));

		let totalSP = 0;

		await totalSPSelect.each((it) => {
			const sp = (it.sp || 0);
			totalSP += sp;
			if (dateThisWeek < it.date) {
				thisWeekSP += sp;

				if (dateToday < it.date) {
					todaySP += sp;
				}
			}
		});

		$('#plundererBody .strategy-points').html(`
			${i18n('Boxes.Plunderer.collectedToday')}: <strong class="${todaySP ? 'text-warning' : ''}">${todaySP}</strong> ${i18n('Boxes.Plunderer.FP')},
			${i18n('Boxes.Plunderer.thisWeek')}: <strong class="${thisWeekSP ? 'text-warning' : ''}">${thisWeekSP}</strong> ${i18n('Boxes.Plunderer.FP')},
			${i18n('Boxes.Plunderer.total')}:  <strong class="${totalSP ? 'text-warning' : ''}">${totalSP}</strong> ${i18n('Boxes.Plunderer.FP')}
		`);
	},


	RenderActions: (actions) => {
		let lastPlayerId = null;
		return actions.map(action => {
			const isSamePlayer = action.playerId === lastPlayerId;
			lastPlayerId = action.playerId;
			return Plunderer.RenderAction({action, isSamePlayer});
		}).join('');
	},


	RenderAction: ({action, isSamePlayer}) => {
		const type = {
			[Plunderer.ACTION_TYPE_PLUNDERED]: i18n('Boxes.Plundered.actionPlundered'),
			[Plunderer.ACTION_TYPE_BATTLE_WIN]: i18n('Boxes.Plundered.actionBattleWon'),
			[Plunderer.ACTION_TYPE_BATTLE_LOSS]: i18n('Boxes.Plundered.actionBattleLost'),
			[Plunderer.ACTION_TYPE_BATTLE_SURRENDERED]: i18n('Boxes.Plundered.actionSurrendered'),
			[Plunderer.ACTION_TYPE_SHIELDED]: i18n('Boxes.Plundered.actionShielded'),
		}[action.type] || 'Unknown';

		const avatar = action.avatar && `${MainParser.InnoCDN}assets/shared/avatars/${MainParser.PlayerPortraits[action.avatar]}.jpg`;
		const date = moment(action.date).format(i18n('DateTime'));
		const dateFromNow = moment(action.date).fromNow();

		let era = '';

		if(action.playerEra && action.playerEra !== 'unknown'){
			let eraName = i18n('Eras.' + Technologies.Eras[action.playerEra]);

			era = `<div class="era" title="${i18n('Boxes.Plunderer.PlayersEra')}: ${eraName}"><strong>${eraName}</strong></div>`;
		}

		return `<div class="action-row action-row-type-${action.type}">
					<div class="avatar select-player" data-value="${action.playerId}">
						${isSamePlayer || !avatar? '' : `<img class="player-avatar" src="${avatar}" alt="${action.playerName}" /><br>`}
						<span class="type text-${action.type === 1 ? 'success' : (action.type === 3 ? 'danger' : 'success')}">${type}</span>
					</div>
					<div class="info-column">
						<div>
							${date} <br />
							<em>${dateFromNow}</em>
						</div>
						<div>
							${isSamePlayer ? '' : `
								${era}
								${action.playerDate ? `
									<div class="discovered" title="${i18n('Boxes.Plunderer.visitTitle')}">
										${i18n('Boxes.Plunderer.visited')}: <br />
										<em>${moment(action.playerDate).fromNow()}</em>
									</div>`
								: ''}
							`}
						</div>
					</div>
					<div class="action-content">
						${isSamePlayer ? '' : `
						<div class="player-name select-player" data-value="${action.playerId}">
							${action.playerName} <span class="clan">[${action.clanName}]</span>
						</div>
						`}
						<div class="content">${Plunderer.RenderActionContent(action)}</div>
					</div>
				</div>`;
	},


	/**
	 *
	 * @param action
	 * @returns {string}
	 */
	RenderActionContent: (action) => {
		switch (action.type) {
			case Plunderer.ACTION_TYPE_PLUNDERED:
				const goodsIds = Object.keys(action.resources);

				return `<div class="plunder-wrap">
							<div class="name">
								<img class="sabotage" src="${extUrl}js/web/plunderer/images/sabotage.png" alt="Sabotage" title="Sabotage" />
								${action.doublePlunder ? `<img class="doublePlunder" src="${extUrl}js/web/plunderer/images/double_plunder.png" alt="Double Plunder Bonus" title="Double Plunder Bonus"/>` : ''}
								${(BuildingNamesi18n[action.buildId] || {name: '-'}).name}
							</div>
							<div class="plunder-items ${action.important ? 'text-warning' : ''}">
								${goodsIds.map(id => {
									const goods = (GoodsData[id] || {name: ''}).name;
									const str = `${action.resources[id]} ${goods}`;
									return id === 'strategy_points' ? `<strong>${str}</strong>` : `${str}`;
								}).map(it => `<div>${it}</div>`).join('')}
							</div>
						</div>`;

			case Plunderer.ACTION_TYPE_BATTLE_LOSS:
			case Plunderer.ACTION_TYPE_BATTLE_WIN:
			case Plunderer.ACTION_TYPE_BATTLE_SURRENDERED:
				return `<div class="battle">
							<div><strong>${action.battle.auto ? i18n('Boxes.Plunderer.autoBattle') : `${i18n('Boxes.Plunderer.rounds')}: ${action.battle.round || 'N/A'}`}</strong></div>
							<div class="army-overview">
								<div class="army">${Plunderer.RenderArmy(action.battle.myArmy)}</div>
								<div class="versus">VS</div>
								<div class="army">${Plunderer.RenderArmy(action.battle.otherArmy)}</div>
							</div>
						</div>`;

			case Plunderer.ACTION_TYPE_SHIELDED:
				return `<div class="shield-wrap">
							<div class="shield-explain">
							 	<img src="${extUrl}js/web/plunderer/images/shield.png" alt="Shield">
								${i18n('Boxes.Plunderer.shieldProtectetUntil')} ${moment(action.expireTime * 1000).format(i18n('DateTime'))}<br>
								<em>${i18n('Boxes.Plunderer.shieldUntil')} ${moment().to(action.expireTime * 1000)}</em>
							</div>
						</div>`;
			default:
				return '-';
		}
	},


	/**
	 * Calculate Attack & Defense Bonus of the Units
	 *
	 * @param army
	 * @returns {string}
	 */
	RenderArmy: (army) => {
		const firstUnit = army[0];
		const isSameStats = !army.some(it => {
			return ((it.attBoost || 0) !== (firstUnit.attBoost || 0) ||
				(it.defBoost || 0) !== (firstUnit.defBoost || 0));
		});
		const attBoost = firstUnit.attBoost || 0;
		const defBoost = firstUnit.defBoost || 0;
		return `${!isSameStats ? '' : `
					<div class="stats-same-for-all">
						<span class="${attBoost ? 'text-success' : 'text-danger'}">${i18n('Boxes.Plunderer.Attack')}: ${attBoost}%</span> - <span class="${defBoost ? 'text-success' : 'text-danger'}">${i18n('Boxes.Plunderer.Defense')}: ${defBoost}%</span>
					</div>
				`}
				<div class="unit-wrap">${army.map(unit => Plunderer.RenderUnit({unit, showDetails: !isSameStats})).join('')}</div>`;
	},


	/**
	 * Show healts state from units
	 *
	 * @param unit
	 * @param showDetails
	 * @returns {string}
	 */
	RenderUnit: ({unit, showDetails}) => {
		const endHP = unit.endHp || 0;
		const startHP = unit.startHP || 0;
		const healtPerc = Math.round((1 - ((startHP - endHP) / startHP)) * 100);
		const attBoost = unit.attBoost || 0;
		const defBoost = unit.defBoost || 0;

		return `<div class="unit" title="unit: ${unit.unitTypeId}, HP: ${endHP}/${startHP}, attack boost: ${attBoost}, defend boost: ${defBoost}">
					<div class="units-icon ${unit.unitTypeId}"></div>
						<div class="health">
						<span style="width: ${healtPerc}%"></span>
					</div>
					${showDetails ? `
					<div class="stats">
					<div class="${!endHP ? 'text-danger' : ''}">${endHP}/${startHP}</div>
					<div class="${attBoost ? 'text-success' : ''}">${attBoost}%</div>
					<div class="${defBoost ? 'text-success' : ''}">${defBoost}%</div>
					</div>
				` : ''}
				</div>`;
	}
};
