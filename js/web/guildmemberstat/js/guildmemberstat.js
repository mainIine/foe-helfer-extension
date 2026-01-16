/*
 * *************************************************************************************
 *
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

FoEproxy.addHandler('ClanService', 'getOwnClanData', (data, postData) => {
	let requestMethod = postData[0]['requestMethod'];
	if (requestMethod === 'getOwnClanData') {
		GuildMemberStat.Data = data.responseData;

		if (GuildMemberStat.Data !== undefined && !GuildMemberStat.hasUpdateProgress) {
			GuildMemberStat.UpdateData('clandata', null).then((e) => {

				if ($('#guildMemberstat-Btn').hasClass('hud-btn-red')) {
					$('#guildMemberstat-Btn').removeClass('hud-btn-red');
					$('#guildMemberstat-Btn-closed').remove();
				}

			});
		}
	}
});

// Treasury Goods 
FoEproxy.addHandler('ClanService', 'getTreasury', (data, postData) => {
	let requestMethod = postData[0]['requestMethod'];
	if (requestMethod === 'getTreasury') {
		let Goods = data.responseData.resources;

		if (Goods !== undefined)
		{
			GuildMemberStat.setEraGoods(Goods);
		}
	}
});
FoEproxy.addHandler('ClanService', 'getTreasuryBag', (data, postData) => {
	if (data.responseData?.type?.value && data.responseData?.type?.value !== 'ClanMain') return; // for now ignore all other source types
	let requestMethod = postData[0]['requestMethod'];
	if (requestMethod === 'getTreasuryBag') {
		let Goods = data.responseData.resources.resources;

		if (Goods !== undefined)
			GuildMemberStat.setEraGoods(Goods);
	}
});


// Forum Activity 
FoEproxy.addHandler('ConversationService', 'getConversation', (data, postData) => {

	let ConversationData = data.responseData;

	if (ConversationData !== undefined) {
		// Check for guild message type (1 is personal message)
		if (ConversationData.type !== undefined && (ConversationData.type === 3 || ConversationData.type === 7)) {
			if (ConversationData.id !== undefined) {
				GuildMemberStat.ConversationIds.push(ConversationData.id);
				GuildMemberStat.UpdateData('forum', ConversationData);
			}
		}
	}
});

FoEproxy.addHandler('ConversationService', 'getMessages', (data, postData) => {
	let ConversationData = data.responseData;

	if (ConversationData !== undefined) {
		GuildMemberStat.UpdateData('forum', {
			messages: ConversationData
		});
	}
});

// GEX member statistic
FoEproxy.addHandler('GuildExpeditionService', 'getContributionList', (data, postData) => {
	GuildMemberStat.GexData = data.responseData;
	if (GuildMemberStat.GexData !== undefined)
		GuildMemberStat.UpdateData('gex', null);
});

FoEproxy.addHandler('GuildExpeditionService', 'getOverview', (data, postData) => {
	let Data = data.responseData;
	if (Data !== undefined) {
		if (data.responseData['state'] !== 'inactive')
			GuildMemberStat.GEXId = Data.nextStateTime;
		else
			GuildMemberStat.GEXId = (Data.nextStateTime * 1 - 86400);
	}
});

// Guild Goods Buildings
FoEproxy.addHandler('OtherPlayerService', 'visitPlayer', (data, postData) => {
	let GuildMember = data.responseData.other_player;
	let IsGuildMember = GuildMember.is_guild_member;

	if (IsGuildMember) {
		let member = {
			player_id: GuildMember.player_id,
			era: GuildMember.era
		}

		GuildMemberStat.ReadGuildMemberBuildings(data.responseData, member);
	}
});

// GuildBattleGround member statistic
FoEproxy.addHandler('GuildBattlegroundService', 'getPlayerLeaderboard', (data, postData) => {
	GuildMemberStat.GBGData = data.responseData;
	if (GuildMemberStat.GBGData !== undefined)
		GuildMemberStat.UpdateData('gbg', null);
});

FoEproxy.addHandler('GuildBattlegroundService', 'getBattleground', (data, postData) => {
	let Data = data.responseData;
	if (Data !== undefined)
		GuildMemberStat.GBGId = Data.endsAt;
});

FoEproxy.addHandler('GuildBattlegroundStateService', 'getState', (data, postData) => {
	if (data.responseData['stateId'] !== 'participating') {
		let Data = data.responseData;
		if (Data !== undefined) {
			GuildMemberStat.GBGId = parseInt(Data.startsAt) - 259200;
			GuildMemberStat.UpdateData('gbg', data.responseData['playerLeaderboardEntries']);
		}
	}
});


let GuildMemberStat = {
	db: null,
	Data: undefined,
	EraGroup: undefined,
	GexData: undefined,
	GBGData: undefined,
	GBGId: undefined,
	GEXId: undefined,
	TreasuryGoodsData: {},
	ConversationIds: [],
	CurrentStatGroup: 'Member',
	hasGuildMemberRights: false,
	acceptedDeleteWarning: false,
	hasUpdateProgress: false,
	Settings: {
		autoStartOnUpdate: 1,
		showDeletedMembers: 1,
		showSearchbar: 1,
		showBattlesWon: 0,
		gexgbgDateFormat: 'week',
		showZeroValues: 0,
		deleteOlderThan: 14,
		lastupdate: 0
	},
	MemberDict: {},
	ExportData: undefined,

	GuildPermission_Founder: 1,
	GuildPermission_Leader: 2,
	GuildPermission_Inviter: 4,
	GuildPermission_Moderator: 8,
	GuildPermission_Trusted: 16,
	GuildPermission_GBGOfficer: 64,


	/**
	 *
	 * @returns {Promise<void>}
	 */
	checkForDB: async (playerID) => {

		const DBName = `FoeHelperDB_GuildMemberStat_${playerID}`;

		GuildMemberStat.db = new Dexie(DBName);

		GuildMemberStat.db.version(1).stores({
			player: '++id, player_id, score, deleted',
			gex: '++id, player_id, gexweek, &[player_id+gexweek], solvedEncounters',
			gbg: '++id, player_id, gbgid, &[player_id+gbgid], battlesWon, negotiationsWon, rank',
			activity: 'player_id',
			warning: 'player_id',
			forum: 'player_id'
		});

		GuildMemberStat.db.version(2).stores({
			player: '++id, player_id, score, deleted',
			gex: '++id, player_id, gexweek, &[player_id+gexweek], solvedEncounters, trial',
			gbg: '++id, player_id, gbgid, &[player_id+gbgid], battlesWon, negotiationsWon, rank',
			activity: 'player_id',
			warning: 'player_id',
			forum: 'player_id'
		});

		GuildMemberStat.db.open();
	},


	BuildBox: (event) => {
		if ($('#GuildMemberStat').length === 0) {
			HTML.Box({
				id: 'GuildMemberStat',
				title: i18n('Boxes.GuildMemberStat.Title'),
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize: true,
				settings: 'GuildMemberStat.GuildMemberStatSettings()'
			});

			helper.preloader.show('#GuildMemberStat');

			HTML.AddCssFile('guildmemberstat');
		}
		else if (!event) {
			HTML.CloseOpenBox('GuildMemberStat');
			return;
		}

		//moment.locale(18n('Local'));

		GuildMemberStat.InitSettings();

		$('#GuildMemberStat').on('click', '.toggle-statistic', function () {

			GuildMemberStat.CurrentStatGroup = $(this).data('value');

			$("#gmsTabs").find("li").removeClass("active");
			$(this).parent().addClass("active");
			$('#gms-filter-input').val('').removeClass('highlight').hide();

			switch (GuildMemberStat.CurrentStatGroup) {
				case 'Member':
					GuildMemberStat.Show();
					break;
				case 'GuildBuildings':
					GuildMemberStat.ShowGuildBuildings();
					break;
				case 'Eras':
					GuildMemberStat.ShowGuildEras();
					break;
				case 'GuildGoods':
					GuildMemberStat.ShowGuildGoods();
					break;
				case 'GreatBuildings':
					GuildMemberStat.ShowGreatBuildings();
					break;
			}

		});

		GuildMemberStat.CurrentStatGroup = 'Member';
		GuildMemberStat.Show();
	},


	ReadGuildMemberBuildings: async (Buildings, Member) => {

		let entity = Buildings['city_map']['entities'];
		let GuildGoodsBuildings = [];
		let GuildPowerBuildings = [];
		let GBTempID = 0;
		let LgBuildings = [];

		for (let i in entity) {
			GBTempID++;

			if (entity.hasOwnProperty(i)) {
				let EntityID = entity[i]['cityentity_id'];
				let CityEntity = MainParser.CityEntities[EntityID];
				let EntityEraId = entity[i].level !== undefined ? (entity[i].level + 1) : null;
				let EntityEra = EntityEraId !== null ? Technologies.EraNames[EntityEraId] : null;

				if (entity[i]['type'] === 'greatbuilding') {
					let lgd = {
						cityentity_id: entity[i]['cityentity_id'],
						name: CityEntity['name'],
						level: entity[i]['level'],
						max_level: entity[i]['max_level'],
						invested_forge_points: entity[i]['state']['invested_forge_points'],
						forge_points_for_level_up: entity[i]['state']['forge_points_for_level_up']
					};

					LgBuildings.push(lgd);
				}

				// Check for clan power building (Ruhmeshalle etc.)
				if (CityEntity['type'] && CityEntity['type'] === 'clan_power_production') {
					let EntityLevel = EntityEra ? EntityEra : Member.era;
					let value = CityEntity['entity_levels'].find(data => data.era === EntityLevel);
					let clan_power = typeof value.clan_power !== 'undefined' ? value.clan_power : 0;

					GuildPowerBuildings.push({ gbid: GBTempID, entity_id: EntityID, name: CityEntity['name'], power: { value: clan_power, motivateable: null }, level: EntityEraId, era: Member.era });
				}

				if (CityEntity['abilities']) {
					for (let AbilityIndex in CityEntity['abilities']) {

						if (!CityEntity['abilities'].hasOwnProperty(AbilityIndex) || CityEntity['abilities'][AbilityIndex]['__class__'] === undefined || CityEntity['abilities'][AbilityIndex]['__class__'] !== 'AddResourcesToGuildTreasuryAbility')
							continue;

						let Ability = CityEntity['abilities'][AbilityIndex];
						let Resources = 0;
						let goods = null;

						if (Ability['additionalResources'] && Ability['additionalResources']['AllAge'] && Ability['additionalResources']['AllAge']['resources'])
							Resources = Object.values(Ability['additionalResources']['AllAge']['resources'])[0];

						// Check for clan power building (Ehrenstatue etc.)
						if (EntityEra !== null && Ability['additionalResources'][EntityEra] !== undefined && Ability['additionalResources'][EntityEra]['resources'] !== undefined && Ability['additionalResources'][EntityEra]['resources']['clan_power'] !== undefined) {
							let clan_power = Ability['additionalResources'][EntityEra]['resources']['clan_power'];
							GuildPowerBuildings.push({ gbid: GBTempID, entity_id: EntityID, name: CityEntity['name'], power: { value: clan_power, motivateable: null }, level: EntityEraId, era: EntityEra });
						}

						let goodSum = Resources;

						if (EntityEra !== null) {
							goods = Object.values(GoodsData).filter(function (Good) {
								return Good.era === EntityEra && Good.abilities.goodsProduceable !== undefined;
							}).map(function (row) {
								return { good_id: row.id, value: goodSum / 5 };
							}).sort(function (a, b) { return a.good_id.localeCompare(b.good_id) });
						}

						GuildGoodsBuildings.push({ gbid: GBTempID, entity_id: EntityID, name: CityEntity['name'], resources: { totalgoods: goodSum, goods: goods }, level: EntityEraId, era: EntityEra });
					}
				}

				// get buildings with new JSON format
				// TODO Must be enhanced when new buildings are in place and its structure is known.
				if (EntityEra && CityEntity['components'] && CityEntity['components'][EntityEra] && CityEntity['components'][EntityEra]['production'] && CityEntity['components'][EntityEra]['production']['options']) {

					let opt = CityEntity['components'][EntityEra]['production']['options'];
					let goods = null;
					let goodSum = 0;

					for (let o in opt) {
						if (!opt.hasOwnProperty(o) || opt[o]['products'] === undefined) { continue; }

						let products = opt[o]['products'];

						for (let p in products) {
							if (!products.hasOwnProperty(p) || products[p]['guildResources'] === undefined || products[p]['guildResources']['resources'] === undefined) { continue; }

							let onlywhenmotivated = products[p].onlyWhenMotivated && products[p].onlyWhenMotivated === true ? true : false;

							if (products[p]['guildResources']['resources']['all_goods_of_age'])
							{
								goodSum += products[p]['guildResources']['resources']['all_goods_of_age'];

								goods = Object.values(GoodsData).filter(function (Good) {
									return Good.era === EntityEra && Good.abilities.goodsProduceable !== undefined;
								}).map(function (row) {
									return { good_id: row.id, value: products[p]['guildResources']['resources']['all_goods_of_age'] / 5 };
								}).sort(function (a, b) { return a.good_id.localeCompare(b.good_id) });
							}

							GuildGoodsBuildings.push({ gbid: GBTempID, entity_id: EntityID, name: CityEntity['name'], resources: { totalgoods: goodSum, goods: goods, onlywhenmotivated: onlywhenmotivated }, level: EntityEraId, era: EntityEra });
						}
					}
				} else if (EntityEra && CityEntity?.components?.AllAge?.production?.options) {
					let opt = CityEntity.components.AllAge.production.options;
					let goods = null;
					let goodSum = 0;

					for (let o in opt) {
						if (!opt.hasOwnProperty(o) || opt[o]['products'] === undefined) { continue; }

						let products = opt[o]['products'];

						for (let p in products) {
							if (!products.hasOwnProperty(p) || products[p]['guildResources'] === undefined || products[p]['guildResources']['resources'] === undefined) { continue; }

							let onlywhenmotivated = products[p].onlyWhenMotivated && products[p].onlyWhenMotivated === true ? true : false;

							if (products[p]['guildResources']['resources']['all_goods_of_age']) {
								goodSum += products[p]['guildResources']['resources']['all_goods_of_age'];

								goods = Object.values(GoodsData).filter(function (Good) {
									return Good.era === EntityEra && Good.abilities.goodsProduceable !== undefined;
								}).map(function (row) {
									return { good_id: row.id, value: products[p]['guildResources']['resources']['all_goods_of_age'] / 5 };
								}).sort(function (a, b) { return a.good_id.localeCompare(b.good_id) });
							}

							GuildGoodsBuildings.push({ gbid: GBTempID, entity_id: EntityID, name: CityEntity['name'], resources: { totalgoods: goodSum, goods: goods, onlywhenmotivated: onlywhenmotivated }, level: EntityEraId, era: EntityEra });
						}
					}
				}

				if (entity[i].state && entity[i]['state']['current_product']) {
					if (entity[i]['state']['current_product']['name'] !== 'clan_goods')
						continue;

					let totalgoods = entity[i]['state']['current_product']['goods'].map(good => good.value).reduce((sum, good) => good + sum);

					GuildGoodsBuildings.push({ gbid: GBTempID, entity_id: EntityID, name: CityEntity['name'], resources: { totalgoods: totalgoods, goods: entity[i]['state']['current_product']['goods'].sort(function (a, b) { return a.good_id.localeCompare(b.good_id) }) }, level: entity[i]['level'], era: Member.era });
				}
			}
		}

		let PlayerGuildBuildings = { player_id: Member.player_id, era: Member.era, guildbuildings: GuildPowerBuildings.concat(GuildGoodsBuildings), greatbuildings: LgBuildings };

		await GuildMemberStat.UpdateData('guildbuildings', PlayerGuildBuildings);
	},


	UpdateData: async (source, data) => {

		GuildMemberStat.InitSettings();
		GuildMemberStat.MemberDict = {};

		GuildMemberStat.hasGuildMemberRights = (ExtGuildPermission & GuildMemberStat.GuildPermission_Leader) > 0 || (ExtGuildPermission & GuildMemberStat.GuildPermission_Founder) > 0;

		switch (source)
		{
			case 'clandata':

				let currentClanId = GuildMemberStat.Data.id !== undefined ? GuildMemberStat.Data.id : undefined;
				let memberdata = GuildMemberStat.Data.members;

				if (typeof memberdata === 'undefined' || currentClanId === undefined)
				{
					return;
				}

				let ActiveMembers = [];
				let localClanId = JSON.parse(localStorage.getItem('GuildMemberStatClanId'));

				if (!localClanId)
				{
					localClanId = currentClanId;
				}

				// set after how many days ex members are deleted ( -1 : instantly after guild change )
				let deleteOlderThan = localClanId !== currentClanId ? -1 : GuildMemberStat.Settings.deleteOlderThan;

				GuildMemberStat.hasUpdateProgress = true;

				for (let i in memberdata)
				{
					if (memberdata.hasOwnProperty(i))
					{
						memberdata[i]['activity'] = GuildMemberStat.hasGuildMemberRights ? memberdata[i]['activity'] : null;
						memberdata[i]['won_battles'] = memberdata[i]['won_battles'] ? memberdata[i]['won_battles'] : 0;
						memberdata[i]['rank'] = (i * 1 + 1);

						ActiveMembers.push(memberdata[i].player_id);

						// activity is not present when member is offline since 8 days
						if (typeof memberdata[i].activity === 'undefined')
						{
							memberdata[i].activity = 0;
						}

						await GuildMemberStat.RefreshGuildMemberDB(memberdata[i]);

						if (GuildMemberStat.hasGuildMemberRights && memberdata[i].activity < 2)
						{
							let Warning = {
								player_id: memberdata[i].player_id,
								lastwarn: MainParser.getCurrentDate(),
								lastactivity: memberdata[i]['activity'],
								warnings: [{
									activity: memberdata[i].activity,
									date: MainParser.getCurrentDate()
								}]
							}

							await GuildMemberStat.SetActivityWarning(Warning, false);
						}
					}
				}

				// Update Own Guild support buildings
				if (MainParser.CityMapData && Object.keys(MainParser.CityMapData).length > 0)
				{
					let self = {
						player_id: ExtPlayerID,
						era: CurrentEra
					}
					await GuildMemberStat.ReadGuildMemberBuildings({ city_map: { entities: Object.values(MainParser.CityMapData) } }, self);
				}

				// Insert update time & current GuildId
				GuildMemberStat.Settings.lastupdate = MainParser.getCurrentDate();
				localStorage.setItem('GuildMemberStatSettings', JSON.stringify(GuildMemberStat.Settings));
				localStorage.setItem('GuildMemberStatClanId', currentClanId);

				// Array with all valid player_id is send to mark all player_id which ar not in this array as deleted
				await GuildMemberStat.MarkMemberAsDeleted(ActiveMembers);

				//Delete ex members which delete data is older than the given days [ 0 = no deletion ]
				if (deleteOlderThan > 0 || deleteOlderThan === -1)
				{
					await GuildMemberStat.DeleteExMembersOlderThan(deleteOlderThan);
				}

				if (GuildMemberStat.hasGuildMemberRights && GuildMemberStat.Settings.autoStartOnUpdate)
				{
					GuildMemberStat.CurrentStatGroup = 'Member';
					GuildMemberStat.BuildBox(true);
				}
				break;

			case 'gex':

				let gexid = GuildMemberStat.GEXId;
				let gexdata = GuildMemberStat.GexData;

				if (typeof gexdata == 'undefined')
				{
					return;
				}

				for (let i in gexdata)
				{
					if (gexdata.hasOwnProperty(i))
					{
						let rank = (i * 1 + 1);
						let gexDB = {
							gexweek: gexid,
							rank: rank,
							data: gexdata[i]
						}
						await GuildMemberStat.RefreshPlayerGexDB(gexDB);
					}
				}

				if ($('#GuildMemberStatBody').length)
				{
					await GuildMemberStat.Show();
				}
				break;

			case 'gbg':

				let gbgid = GuildMemberStat.GBGId;
				let gbgdata = (data !== null) ? data : GuildMemberStat.GBGData;

				if (gbgdata === undefined)
				{
					return;
				}

				for (let i in gbgdata)
				{
					if (gbgdata.hasOwnProperty(i))
					{
						let gbgDB = {
							gbgid: gbgid,
							data: gbgdata[i]
						}
						await GuildMemberStat.RefreshPlayerGBGDB(gbgDB);
					}
				}

				if ($('#GuildMemberStatBody').length)
				{
					GuildMemberStat.CurrentStatGroup = 'Member';
					await GuildMemberStat.Show();
				}

				break;

			case 'forum':

				let messagedata = data.messages;
				let messages = [];

				if (typeof messagedata == 'undefined')
				{
					return;
				}

				for (let i in messagedata)
				{
					if (messagedata.hasOwnProperty(i))
					{
						if (typeof messagedata[i].conversationId === 'undefined' && !GuildMemberStat.ConversationIds.includes(messagedata[i].conversationId))
						{
							continue;
						}

						if (typeof messagedata[i].sender != 'undefined' && typeof messagedata[i].sender.player_id != 'undefined')
						{
							let m = {
								player_id: messagedata[i].sender.player_id,
								message_id: messagedata[i].id
							}
							messages.push(m);
						}
					}
				}

				await GuildMemberStat.RefreshForumDB(messages);

				break;

			case 'guildbuildings':

				if (data === undefined || data.length <= 0) {
					return;
				}

				if (data['player_id'] !== undefined && data['guildbuildings'] !== undefined && data['greatbuildings'] !== undefined) {
					await GuildMemberStat.RefreshPlayerGuildBuildingsDB(data);
				}

				break;
		}
	},


	SetActivityWarning: async (Warning, force) => {

		let playerID = Warning.player_id;

		let CurrentMember = await GuildMemberStat.db.activity
			.where({
				player_id: playerID
			})
			.first();

		if (CurrentMember === undefined)
		{
			await GuildMemberStat.db.activity.put(Warning);
		}
		else
		{
			if (CurrentMember.lastactivity === undefined)
			{
				CurrentMember.lastactivity = 1;
			}

			if ((moment(MainParser.getCurrentDate()).format('DD.MM.YYYY') !== moment(CurrentMember.lastwarn).format('DD.MM.YYYY')) || CurrentMember.lastactivity !== Warning.lastactivity)
			{

				await GuildMemberStat.db.activity.where('player_id').equals(playerID).modify(x => x.warnings.push(Warning.warnings[0]));

				await GuildMemberStat.db.activity.update(CurrentMember.player_id, {
					lastwarn: Warning.lastwarn,
					lastactivity: Warning.lastactivity
				});

			}
		}
	},


	RefreshPlayerGuildBuildingsDB: async (data) => {

		let p_id = data.player_id,
			buildings = data.guildbuildings,
			gbs = data.greatbuildings,
			era = data.era;

		let CurrentMember = await GuildMemberStat.db.player
			.where({
				player_id: p_id
			})
			.first();

		if (CurrentMember !== undefined)
		{
			await GuildMemberStat.db.player.update(CurrentMember.id, {
				guildbuildings: { era: era, date: MainParser.getCurrentDate(), buildings: buildings },
				greatbuildings: gbs
			});

			if ($("#GuildMemberStat").length) {
				GuildMemberStat.CurrentStatGroup = 'Member';
				await GuildMemberStat.Show();
			}
		}
	},


	RefreshForumDB: async (Messages) => {

		for (let i in Messages)
		{
			if (!Messages.hasOwnProperty(i))
			{
				break;
			}

			let player_id = Messages[i].player_id;
			let message_id = Messages[i].message_id;
			let CurrentData = await GuildMemberStat.db.forum
				.where({
					player_id: player_id
				})
				.first();

			if (!CurrentData)
			{
				let m = [];
				m.push(message_id);
				await GuildMemberStat.db.forum.add({
					player_id: player_id,
					message_id: m,
					lastupdate: MainParser.getCurrentDate()
				});
			}
			else
			{
				let message_ids = CurrentData.message_id;
				message_ids.push(message_id);

				await GuildMemberStat.db.forum.put({
					player_id: player_id,
					message_id: GuildMemberStat.uniq_array(message_ids),
					lastupdate: MainParser.getCurrentDate()
				});
			}
		}
	},


	RefreshPlayerGBGDB: async (Member) => {

		let GBGPlayer = Member.data;
		let gbgid = Member.gbgid;
		let rank = (typeof GBGPlayer.rank != 'undefined' ? GBGPlayer.rank : 0);
		let battlesWon = (typeof GBGPlayer['battlesWon'] != 'undefined' ? GBGPlayer['battlesWon'] : 0);
		let negotiationsWon = (typeof GBGPlayer['negotiationsWon'] != 'undefined' ? GBGPlayer['negotiationsWon'] : 0);

		let CurrentGBGData = await GuildMemberStat.db.gbg
			.where({
				player_id: GBGPlayer.player.player_id,
				gbgid: gbgid
			})
			.first();

		if (CurrentGBGData === undefined)
		{
			await GuildMemberStat.db.gbg.add({
				player_id: GBGPlayer.player.player_id,
				gbgid: gbgid,
				battlesWon: battlesWon,
				negotiationsWon: negotiationsWon,
				rank: rank
			});
		}
		else
		{
			await GuildMemberStat.db.gbg.update(CurrentGBGData.id, {
				battlesWon: battlesWon,
				negotiationsWon: negotiationsWon,
				rank: rank
			});
		}
	},


	RefreshPlayerGexDB: async (Member) => {

		let GexPlayer = Member.data;
		let gexweek = Member.gexweek;
		let rank = Member.rank;

		let solvedEncounters = (typeof GexPlayer['solvedEncounters'] != 'undefined' ? GexPlayer['solvedEncounters'] : 0);
		let expeditionPoints = (typeof GexPlayer['expeditionPoints'] != 'undefined' ? GexPlayer['expeditionPoints'] : 0);

		let CurrentGexData = await GuildMemberStat.db.gex
			.where({
				player_id: GexPlayer.player.player_id,
				gexweek: gexweek
			})
			.first();

		if (CurrentGexData === undefined)
		{
			await GuildMemberStat.db.gex.add({
				player_id: GexPlayer.player.player_id,
				gexweek: gexweek,
				solvedEncounters: solvedEncounters,
				expeditionPoints: expeditionPoints,
				rank: rank,
				trial: GexPlayer.currentTrial
			});
		}
		else
		{
			await GuildMemberStat.db.gex.update(CurrentGexData.id, {
				solvedEncounters: solvedEncounters,
				expeditionPoints: expeditionPoints,
				rank: rank,
				trial: GexPlayer.currentTrial
			});
		}
	},


	RefreshGuildMemberDB: async (Member) => {

		let CurrentMember = await GuildMemberStat.db.player
			.where({
				player_id: Member['player_id']
			})
			.first();

		if (CurrentMember === undefined)
		{
			await GuildMemberStat.db.player.add({
				player_id: Member['player_id'],
				name: Member['name'],
				era: Member['era'],
				avatar: Member['avatar'],
				score: Member['score'],
				prev_score: Member['score'],
				rank: [Member['rank'], Member['rank']],
				is_online: Member['is_online'],
				is_active: Member['is_active'],
				city_name: Member['city_name'],
				activity: Member['activity'],
				won_battles: Member['won_battles'],
				date: MainParser.getCurrentDate(),
				deleted: 0,
				updated: MainParser.getCurrentDate()
			});
		}
		else
		{
			let prevRank = typeof CurrentMember.rank !== 'undefined' ? CurrentMember.rank[1] : Member['rank'];

			await GuildMemberStat.db.player.update(CurrentMember.id, {
				name: Member['name'],
				era: Member['era'],
				avatar: Member['avatar'],
				score: Member['score'],
				prev_score: CurrentMember.score,
				prev_battles: CurrentMember.won_battles,
				rank: [prevRank, Member['rank']],
				is_online: Member['is_online'],
				is_active: Member['is_active'],
				city_name: Member['city_name'],
				activity: Member['activity'],
				won_battles: Member['won_battles'],
				deleted: 0,
				updated: MainParser.getCurrentDate()
			});
		}
	},


	MarkMemberAsDeleted: async (arr) => {

		let unknownMembers = await GuildMemberStat.db.player.where('player_id').noneOf(arr).toArray();

		if (unknownMembers === undefined || unknownMembers.length < 1)
		{
			return;
		}

		let newDeleted = unknownMembers.filter(function (member) {
			return member.deleted === 0;
		});

		if (newDeleted.length > 0)
		{
			for (let i in newDeleted)
			{
				await GuildMemberStat.db.player.update(newDeleted[i].id, {
					deleted: MainParser.getCurrentDate()
				});
			}
		}
	},


	DeleteExMembersOlderThan: async (days) => {

		let currentExMembers = await GuildMemberStat.db.player.where('deleted').notEqual(0).toArray();

		if (currentExMembers === undefined || currentExMembers.length <= 0)
		{
			return;
		}

		currentExMembers.forEach(member => {

			let time = +moment(member.deleted);

			if (Math.floor((+MainParser.getCurrentDate() - time) / 86400000) > days)
			{
				let db = GuildMemberStat.db;

				db.transaction("rw", db.player, db.gex, db.gbg, db.activity, db.warning, db.forum, async () => {

					await GuildMemberStat.db.player.where('id').equals(member.id).delete();
					await GuildMemberStat.db.gex.where('player_id').equals(member.player_id).delete();
					await GuildMemberStat.db.gbg.where('player_id').equals(member.player_id).delete();
					await GuildMemberStat.db.activity.where('player_id').equals(member.player_id).delete();
					await GuildMemberStat.db.warning.where('player_id').equals(member.player_id).delete();
					await GuildMemberStat.db.forum.where('player_id').equals(member.player_id).delete();

				});
			}
		});
	},


	ResetMessageCounter: async () => {
		await GuildMemberStat.db.forum.clear();
	},


	Show: async () => {

		let h = [];

		helper.preloader.show("#GuildMemberStat");

		GuildMemberStat.InitSettings();
		GuildMemberStat.hasUpdateProgress = false;

		h.push('<div class="tabs dark-bg"><ul id="gmsTabs" class="horizontal">');
		h.push(`<li${GuildMemberStat.CurrentStatGroup === 'Member' ? ' class="active"' : ''}><a class="toggle-statistic" data-value="Member"><span>${i18n('Boxes.GuildMemberStat.GuildMembers')}</span></a></li>`);
		h.push(`<li${GuildMemberStat.CurrentStatGroup === 'Eras' ? ' class="active"' : ''}><a class="toggle-statistic" data-value="Eras"><span>${i18n('Boxes.GuildMemberStat.Eras')}</span></a></li>`);
		h.push(`<li${GuildMemberStat.CurrentStatGroup === 'GreatBuildings' ? ' class="active"' : ''}><a class="toggle-statistic" data-value="GreatBuildings"><span>${i18n('Boxes.GuildMemberStat.GreatBuildings')}</span></a></li>`);
		h.push(`<li${GuildMemberStat.CurrentStatGroup === 'GuildBuildings' ? ' class="active"' : ''}><a class="toggle-statistic" data-value="GuildBuildings"><span>${i18n('Boxes.GuildMemberStat.GuildBuildings')}</span></a></li>`);
		h.push(`<li${GuildMemberStat.CurrentStatGroup === 'GuildGoods' ? ' class="active"' : ''}><a class="toggle-statistic" data-value="GuildGoods"><span>${i18n('Boxes.GuildMemberStat.GuildGoods')}</span></a></li>`);

		if (GuildMemberStat.Settings.showSearchbar)
		{
			h.push(`<li style="float:right"><input type="text" name="filter" id="gms-filter-input" placeholder="${i18n('Boxes.GuildMemberStat.Search')}" /></li>`);
		}

		h.push(`</ul></div>`);
		h.push(`<div id="gmsContentWrapper">`);
		h.push('<table id="GuildMemberTable" class="foe-table">');
		h.push('<thead class="sticky">' +
			'<tr class="sorter-header">' +
			`<th class="is-number" data-type="gms-group"></th>` +
			`<th class="case-sensitive" data-type="gms-group">${i18n('Boxes.GuildMemberStat.Member')}</th>` +
			`<th class="is-number" data-type="gms-group">${i18n('Boxes.GuildMemberStat.Points')}</th>`);

		if (GuildMemberStat.Settings.showBattlesWon)
		{
			h.push(`<th class="is-number" data-type="gms-group">${i18n('Boxes.GuildMemberStat.Battles')}</th>`);
		}

		h.push(`<th class="is-number" data-type="gms-group">${i18n('Boxes.GuildMemberStat.Eras')}</th>`);

		if (GuildMemberStat.hasGuildMemberRights)
		{
			h.push(`<th class="is-number gms-tooltip" data-type="gms-group" title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.MemberActiviy'))}"><span class="activity"></span></th>`);
		}

		h.push(`<th style="display:none"></th>` +
			`<th class="is-number text-center gms-tooltip" data-type="gms-group"  title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.GuildMessages'))}"><span class="messages"></span></th>` +
			`<th class="is-number text-center gms-tooltip" data-type="gms-group" title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.GexParticipation'))}"><span class="gex"></span></th>` +
			`<th class="is-number text-center gms-tooltip" data-type="gms-group" title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.GbgParticipation'))}"><span class="gbg"></span></th>` +
			'</tr>' +
			'</thead><tbody class="gms-group">');

		let CurrentMember = await GuildMemberStat.db.player.orderBy('score').reverse().toArray();
		let exportData = GuildMemberStat.ExportData = [];

		exportData.push(['rank', 'member_id', 'member', 'points', 'eraID', 'eraName', 'guildgoods', 'activity_warnings', 'messages', 'gex_participation', 'gbg_participation', 'won_battles', 'guildmember']);

		if (CurrentMember === undefined)
		{
			return;
		}

		let CurrentActivityWarnings = await GuildMemberStat.db.activity.toArray();

		let CurrentGexActivity = await GuildMemberStat.db.gex.where('player_id').above(0).and(function (item) {
			if (GuildMemberStat.Settings.showZeroValues === 1)
			{
				return item;
			}
			else
			{
				return item.solvedEncounters > 0;
			}
		}).reverse().sortBy('gexweek');

		let CurrentGbgActivity = await GuildMemberStat.db.gbg.where('player_id').above(0).and(function (item) {
			if (GuildMemberStat.Settings.showZeroValues === 1)
			{
				return item;
			}
			else
			{
				return (item.battlesWon > 0 || item.negotiationsWon > 0);
			}
		}).reverse().sortBy('gbgid');

		let CurrentForumActivity = await GuildMemberStat.db.forum.toArray();

		let data = CurrentMember;
		let deletedCount = 0;

		for (let x = 0; x < data.length; x++)
		{
			let ActWarnCount = 0,
				gexActivityCount = 0,
				gbgActivityCount = 0,
				forumActivityCount = 0,
				guildBuildingsCount = 0,
				hasDetail = false,
				activityWarnings = [],
				gexActivity = [],
				gbgActivity = [],
				forumActivity = [];

			const member = data[x];
			let MemberID = member['player_id'];

			// Get available activity warnings
			activityWarnings = CurrentActivityWarnings.filter(function (item) {
				return item?.player_id === MemberID;
			});

			if (activityWarnings.length && activityWarnings[0] !== undefined)
			{
				ActWarnCount = activityWarnings[0].warnings.length;
				hasDetail = (ActWarnCount > 0) ? true : hasDetail;
			}

			// Get GEX activities
			gexActivity = CurrentGexActivity.filter(function (item) {
				return item?.player_id === MemberID;
			});

			if (gexActivity.length)
			{
				gexActivityCount = gexActivity.length;
				hasDetail = (gexActivityCount > 0) ? true : hasDetail;
			}

			// Get GBG activities
			gbgActivity = CurrentGbgActivity.filter(function (item) {
				return item?.player_id === MemberID;
			});

			if (gbgActivity.length)
			{
				gbgActivityCount = gbgActivity.length;
				hasDetail = (gbgActivityCount > 0) ? true : hasDetail;
			}

			// Get Message Center activity
			forumActivity = CurrentForumActivity.filter(function (item) {
				return item?.player_id === MemberID;
			});

			if (forumActivity.length)
			{
				forumActivityCount = forumActivity[0]['message_id'].length
			}

			// Set warning, error Class for non active members
			let stateClass = "normal";

			// @Todo: set more specific criterias for warn and error level
			if (forumActivityCount <= 5 && gbgActivityCount === 0 && gexActivityCount === 0) { stateClass = "warning"; }

			if (stateClass === "warning" && ActWarnCount > 0)
			{
				stateClass = "error";
			}

			// Get Guild supporting Buildings
			member['guildgoods'] = 0;
			if (member['guildbuildings'] !== undefined && member['guildbuildings']['buildings'] !== undefined) {
				guildBuildingsCount = member['guildbuildings']['buildings'].length;
				for (let building of member['guildbuildings']['buildings']) {
					member['guildgoods'] += building?.resources?.totalgoods || 0;
				}
				hasDetail = (guildBuildingsCount > 0) ? true : hasDetail;
			}

			let deletedMember = (typeof member['deleted'] !== 'undefined' && member['deleted'] !== 0);
			deletedCount += deletedMember ? 1 : 0;

			if (deletedMember && !GuildMemberStat.Settings.showDeletedMembers)
				continue;

			let scoreDiff = member['score'] - member['prev_score'];
			let scoreDiffClass = scoreDiff >= 0 ? 'green' : 'red';
			let rank = (x * 1 + 1);

			member['rank'] = typeof member['rank'] !== 'undefined' ? member['rank'] : [rank, rank]
			let rankDiffClass = (member['rank'] && member['rank'][1] > member['rank'][0]) ? ' decreased' : member['rank'][0] > member['rank'][1] ? ' increased' : '';

			scoreDiff = scoreDiff > 0 ? '+' + scoreDiff : scoreDiff;

			// build an dictionary for detail views
			if (GuildMemberStat.MemberDict[MemberID] === undefined) GuildMemberStat.MemberDict[MemberID] = {};
			if (ActWarnCount > 0) GuildMemberStat.MemberDict[MemberID]['activity'] = activityWarnings;
			if (gexActivityCount > 0) GuildMemberStat.MemberDict[MemberID]['gex'] = gexActivity;
			if (gbgActivityCount > 0) GuildMemberStat.MemberDict[MemberID]['gbg'] = gbgActivity;
			if (guildBuildingsCount > 0) GuildMemberStat.MemberDict[MemberID]['guildbuildings'] = member['guildbuildings'];
			if (guildBuildingsCount > 0) GuildMemberStat.MemberDict[MemberID]['guildgoods'] = member['guildgoods'];
			GuildMemberStat.MemberDict[MemberID]['name'] = member['name'];
			GuildMemberStat.MemberDict[MemberID]['deleted'] = deletedMember;

			h.push(`<tr id="gms${x}" ` +
				`class="${hasDetail ? 'hasdetail ' : ''}${deletedMember ? 'strikeout gms-tooltip ' : ''}${stateClass}" ` +
				`" data-id="${MemberID}"` +
				`${deletedMember ? 'title="' + HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.MemberLeavedGuild')) + '"' : ''}>`);

			h.push(`<td class="is-number text-center${rankDiffClass}" data-number="${!deletedMember ? rank : member['score']}">${!deletedMember ? '#' + (rank - deletedCount) : ''}</td>`);
			h.push(`<td class="case-sensitive copyable" data-text="${helper.str.cleanup(member['name'])}"><img style="max-width: 22px" src="${srcLinks.GetPortrait(member.avatar)}" alt="${member['name']}"> <span>${MainParser.GetPlayerLink(member['player_id'], member['name'])}</span></td>`);
			h.push(`<td class="is-number" data-number="${member['score']}">${HTML.Format(member['score'])}${scoreDiff > 0 || scoreDiff < 0 ? '<span class="prev_score ' + scoreDiffClass + '">' + (scoreDiff > 0 ? '+' : '') + HTML.Format(scoreDiff) + '</span>' : ''}</td>`);

			if (GuildMemberStat.Settings.showBattlesWon) {
				let battleDiff = member.won_battles - member.prev_battles;
				h.push(`<td class="is-number" data-number="${member['won_battles']}">${HTML.Format(member['won_battles'] ? member['won_battles'] : 0)}${battleDiff > 0 ? '<span class="prev_score green">+' + HTML.Format(battleDiff) + '</span>' : ''}</td>`);
			}

			h.push(`<td class="is-number" data-number="${Technologies.Eras[member['era']]}">${i18n('Eras.' + Technologies.Eras[member['era']]+'.short')}</td>`);
			h.push(`<td style="display:none" class="is-number" data-number="${member['guildgoods']}">${member['guildgoods']}</td>`);

			if (GuildMemberStat.hasGuildMemberRights)
				h.push(`<td class="is-number" data-number="${member['activity']}"><span class="activity activity_${member['activity']}"></span> ${ActWarnCount > 0 ? '<span class="warn">(' + ActWarnCount + ')</span>' : ''}</td>`);

			h.push(`<td class="is-number text-center" data-number="${forumActivityCount}">${forumActivityCount}</td>`);
			h.push(`<td class="is-number text-center" data-number="${gexActivityCount}">${gexActivityCount}</td>`);
			h.push(`<td class="is-number text-center" data-number="${gbgActivityCount}">${gbgActivityCount}</td>`);

			h.push(`</tr>`);

			exportData.push([(rank - deletedCount), member['player_id'], member['name'], member['score'], Technologies.Eras[member['era']], i18n('Eras.' + Technologies.Eras[member['era']]+'.short'), member['guildgoods'], ActWarnCount, forumActivityCount, gexActivityCount, gbgActivityCount, member['won_battles'], deletedMember ? 0 : 1]);

		}

		h.push(`</tbody></table>`);
		h.push(`</div>`); // gmsContentWrapper

		if (GuildMemberStat.Settings.lastupdate !== 0)
		{
			let uptodateClass = 'uptodate';
			let date = moment(GuildMemberStat.Settings.lastupdate).unix();
			let actdate = moment(MainParser.getCurrentDate()).unix();

			if (actdate - date >= 10800)
			{
				uptodateClass = 'updaterequired';
			}

			h.push(`<div class="last-update-message"><span class="icon ${uptodateClass}"></span> <span class="${uptodateClass}">${moment(GuildMemberStat.Settings.lastupdate).format(i18n('DateTime'))}</span></div>`);
		}

		$('#GuildMemberStatBody').html(h.join('')).promise().done(function () {

			$('#gms-filter-input').show();
			$('#gms-filter-input').off().on('keyup', function () {
				GuildMemberStat.filterTable('gms-filter-input', 'GuildMemberTable');
			});

			$('#GuildMemberTable').tableSorter();

			$('#GuildMemberTable .gms-tooltip').tooltip({
				html: true,
				container: '#GuildMemberStatBody'
			});

			$('#GuildMemberTable thead .expand-all').off('click').on('click', async function (e) {
				e.preventDefault();

				let tr = $('#GuildMemberTable > tbody').children('tr');
				let expand = $(this).hasClass('closed') ? true : false;
				$(this).toggleClass("closed open");

				if (expand === true)
				{
					helper.preloader.show("#GuildMemberStat");
					setTimeout(() => { GuildMemberStat.ShowMemberDetail(tr, expand), 300 });
				}
				else
				{
					GuildMemberStat.ShowMemberDetail(tr, expand);
				}
			});

			$('#GuildMemberTable > thead th:not(:last)').on('click', function () {
				$('#GuildMemberTable > tbody tr').removeClass("open");
				$('#GuildMemberTable th.expand-all').removeClass("open").addClass("closed");
			});

			$('#GuildMemberTable > tbody tr').on('click', function () {
				let tr = [$(this)];
				GuildMemberStat.ShowMemberDetail(tr);
			});

			// Fade out loading screen
			helper.preloader.hide("#GuildMemberStat");
		});
	},


	ShowMemberDetail: (arr, expand) => {

		let currentTime = MainParser.round(+MainParser.getCurrentDate() / 1000);

		if (!arr && arr.length === 0) { return; }

		if (expand === false)
		{
			$("#GuildMemberTable > tbody tr.detailview").remove();
			$("#GuildMemberTable > tbody tr").removeClass('open');
			return;
		}

		$.each(arr, function () {

			let e = $(this);


			if (e.next("tr.detailview").length)
			{
				e.next("tr.detailview").remove();
				e.removeClass('open');
				if (expand !== true)
					return;
			}

			if (!e.hasClass("hasdetail"))
			{
				return;
			}

			let d = [];
			let MemberID = parseInt(e.attr("data-id"));
			let isNoMemberClass = e.hasClass('strikeout') ? ' inactive' : '';
			let activityWarnState = ['Red', 'Yellow'];

			d.push('<tr class="detailview dark-bg' + isNoMemberClass + '"><td colspan="' + e.find("td").length + '"><div class="detail-wrapper">');

			e.addClass('open');

			let id = e.attr("id");
			let Member = GuildMemberStat.MemberDict[MemberID];

			// Create Inactivity Overview
			if (Member['activity'] !== undefined)
			{
				d.push(`<div class="detail-item warnings"><div class="scrollable"><table><thead class="sticky"><tr><th>${i18n('Boxes.GuildMemberStat.Inactivity')}</th><th>${i18n('Boxes.GuildMemberStat.Date')}</th><th class="text-right"><span class="edit"></span></th></tr></thead><tbody class="copyable">`);

				let warnings = Member['activity'];

				for (let i in warnings)
				{
					if (warnings.hasOwnProperty(i))
					{
						let warnlist = warnings[i].warnings.sort((a, b) => b.date - a.date);

						if (warnlist.length >= 1)
						{
							for (let k in warnlist)
							{
								if (!warnlist.hasOwnProperty(k))
								{
									break;
								}

								d.push(`<tr><td><img class="small" src="${extUrl}js/web/guildmemberstat/images/act_${warnlist[k].activity}.png" /> #${(warnlist.length - parseInt(k))}<span class="hidden-text">&nbsp;-&nbsp;${activityWarnState[warnlist[k].activity]}</span></td>` +
									`<td>${moment(warnlist[k].date).format(i18n('Date'))}</td>` +
									`<td><button data-id="${MemberID}" data-warn="${k}" class="deleteInactivity btn-delete btn gms-tooltip" title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.DeleteInactivityWarning'))}">x</button></td></tr>`);
							}
						}
					}
				}
				d.push('</tbody></table></div></div>');
			}

			// Create GEX Overview
			if (Member['gex'] !== undefined) {
				d.push(`<div class="detail-item gex"><div class="scrollable"><table><thead class="sticky"><tr><th><span class="gex"></span> ${i18n('Boxes.GuildMemberStat.GEXWeek')}</th><th>${i18n('Boxes.GuildMemberStat.Rank')}</th>`+
				//`<th>${i18n('Boxes.GuildMemberStat.Points')}</th>`+
				`<th>${i18n('Boxes.GuildMemberStat.Level')}</th><th>${i18n('Boxes.GuildMemberStat.GexTrial')}</th><th class="text-right"><span class="edit"></span></th></tr></thead><tbody>`);
				let gex = Member['gex'];
				for (let i in gex) {
					if (!gex.hasOwnProperty(i))
						break;

					let gexenddate = moment.unix(gex[i].gexweek);
					let gexstartdate = moment.unix(gex[i].gexweek).subtract(7, 'd');
					let gexweek = gexstartdate.format('YYYY-ww');
					let gexdate = gexstartdate.format(i18n('Date'));
					let activeGexClass = gex[i].gexweek >= currentTime ? ' activeCircle' : '';
					let tooltip = gexstartdate.format(i18n('Date')) + ' - ' + gexenddate.format(i18n('Date'));
					let strDate = GuildMemberStat.Settings.gexgbgDateFormat === 'date' ? gexdate : (GuildMemberStat.Settings.gexgbgDateFormat === 'enddate' ? gexenddate.format(i18n('Date')) : gexweek);

					d.push(`<tr><td><span class="gms-tooltip" title="${HTML.i18nTooltip(tooltip)}">${strDate}</span><span class="${activeGexClass}"></span></td><td>${gex[i].rank}</td>`+
						//`<td>${HTML.Format(gex[i].expeditionPoints)}</td>` +
						`<td>${HTML.Format(gex[i].solvedEncounters)}</td>` +
						`<td>${HTML.Format(gex[i].trial||0)}</td>` +
						`<td class="text-right"><button data-id="${gex[i].player_id}" data-gexweek="${gex[i].gexweek}" class="deleteGexWeek btn btn-slim btn-delete">x</button></td>` +
						`</tr>`);

				}
				d.push('</tbody></table></div></div>');
			}

			// Create GBG Overview
			if (Member['gbg'] !== undefined) {
				d.push(`<div class="detail-item gbg"><div class="scrollable"><table><thead class="sticky"><tr><th><span class="gbg"></span> ${i18n('Boxes.GuildMemberStat.GBFRound')}</th><th>${i18n('Boxes.GuildMemberStat.Rank')}</th><th>${i18n('Boxes.GuildMemberStat.Battles')}</th><th>${i18n('Boxes.GuildMemberStat.Negotiations')}</th><th class="text-right"><span class="edit"></span></th></tr></thead><tbody>`);

				let gbg = Member['gbg'];

				for (let i in gbg) {
					if (!gbg.hasOwnProperty(i)) 
						break;

					let activeGbgClass = gbg[i].gbgid >= currentTime ? ' activeCircle' : '';
					let gbgenddate = moment.unix(gbg[i].gbgid);
					let gbgstartdate = moment.unix(gbg[i].gbgid).subtract(11, 'd');
					let tooltip = gbgstartdate.format(i18n('Date')) + ' - ' + gbgenddate.format(i18n('Date'));
					let week = moment.unix(gbg[i].gbgid).week();
					let lastweek = week - 1;

					week = (week.toString().length === 1) ? '0' + week : week;
					lastweek = (lastweek.toString().length === 1) ? '0' + lastweek : lastweek;

					let strDate = GuildMemberStat.Settings.gexgbgDateFormat === 'date' ? gbgstartdate.format(i18n('Date')) : (GuildMemberStat.Settings.gexgbgDateFormat === 'enddate' ? gbgenddate.format(i18n('Date')) : `${moment.unix(gbg[i].gbgid).year()} - ${lastweek}/${week}`);

					d.push(`<tr><td><span class="gms-tooltip" title="${HTML.i18nTooltip(tooltip)}">${strDate}</span><span class="${activeGbgClass}"></span></td>` +
						`<td>${gbg[i].rank}</td>` +
						`<td>${HTML.Format(gbg[i].battlesWon)}</td>` +
						`<td>${HTML.Format(gbg[i].negotiationsWon)}</td>` +
						`<td class="text-right"><button data-gbgid="${gbg[i].gbgid}" data-id="${gbg[i].player_id}" class="deleteGBG btn btn-slim btn-delete" title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.DeleteGBGRound'))}">x</button></td>` +
						`</tr>`);
				}

				d.push('</tbody></table></div></div>');
			}

			// Create Guild supporting buildings Overview
			if (Member['guildbuildings'] !== undefined) {
				let guildbuildings = $.extend(true, {}, Member['guildbuildings']);
				let totalGoods = 0;
				let totalPower = 0;

				d.push(`<div class="detail-item buildings"><table><thead class="sticky ${expand === true ? 'open ' : ''}hasdetail"><tr><th><span class="guildbuild"></span> ${i18n('Boxes.GuildMemberStat.GuildSupportBuildings')} (${i18n('Boxes.GuildMemberStat.LastUpdate') + ' ' + moment(guildbuildings.date).fromNow()})</th><th></th></tr></thead><tbody class="${expand !== true ? 'closed ' : ''}copyable">`);

				// Group GuildGoods buildings by name and their era
				let guildGoodsBuildings = guildbuildings['buildings'].filter(function (data) { return data.resources !== undefined }).reduce(function (res, obj) {
					let objname = obj.name + '#' + obj.level + '#';
					if (!(objname in res)) {
						res.__array.push(res[objname] = obj);
						res[objname].count = 1;
					}
					else {
						res[objname].resources.totalgoods += +obj.resources.totalgoods;
						res[objname].count += 1;
					}
					return res;
				}, { __array: [] }).__array.sort(function (a, b) { return a.name.localeCompare(b.name) });

				// Group guildpower buildings only by name. Era isn't relevant here
				let guildPowerBuildings = guildbuildings['buildings'].filter(function (data) { return data.power !== undefined }).reduce(function (res, obj) {
					if (!(obj.name in res)) {
						res.__array.push(res[obj.name] = obj);
						res[obj.name].count = 1;
					}
					else {
						res[obj.name].power.value += +obj.power.value;
						res[obj.name].count += 1;
					}
					return res;
				}, { __array: [] }).__array.sort(function (a, b) { return a.name.localeCompare(b.name) });

				d.push(`<tr class="nohover"><td colspan="2"><div class="detail-wrapper">`);

				if (guildGoodsBuildings.length) {
					d.push(`<div class="detail-item guildgoods"><table class="copyable"><thead class="sticky"><tr><th colspan="3"><i>${i18n('Boxes.GuildMemberStat.GuildGoods')}</i></th></tr></thead><tbody>`);

					guildGoodsBuildings.forEach(plbuilding => {
						let goodslist = '';
						let countBuilding = typeof plbuilding.count != 'undefined' ? plbuilding.count : 1;
						let goodCount = (plbuilding.resources && plbuilding.resources.totalgoods) ? plbuilding.resources.totalgoods : 0;
						totalGoods += goodCount;
						if (plbuilding.resources.goods !== undefined && plbuilding.resources.goods !== null)
						{
							goodslist = plbuilding.resources.goods.map(good => {
								return `<span title="${good.value} x ${GoodsData[good.good_id]['name']}" class="goods-sprite sprite-35 ${good.good_id}"></span> `;
							}).join('');

						}

						let Entity = MainParser.CityEntities[plbuilding.entity_id];
						let LevelString;
						if (plbuilding.level === null) {
							LevelString = '';
						}
						else if (Entity && Entity.type === 'greatbuilding') {
							LevelString = '(' + plbuilding.level + ')';
						}
						else {
							LevelString = '(' + i18n('Eras.' + plbuilding.level +'.short') + ')';
						}

						d.push(`<tr><td>${countBuilding} x ${plbuilding.name.replace(/\#[0-9]+\#/, '')} ${LevelString}</td><td class="text-right">${goodslist !== '' ? `<span class="goods-count">${goodCount / 5}x</span>${goodslist}` : ''}</td><td class="text-right">${HTML.Format(goodCount)}</td></tr>`);
					});

					d.push(`<tr><td class="text-bright">${i18n('Boxes.GuildMemberStat.TotalGuildGoods')}</td><td></td><td class="text-right text-bright">${HTML.Format(totalGoods)}</td></tr>`);
					d.push(`</tbody></table></div>`);
				}

				if (guildPowerBuildings.length) {
					d.push(`<div class="detail-item guildgoods"><table class="copyable"><thead class="sticky"><tr><th colspan="2"><i>${i18n('Boxes.GuildMemberStat.GuildPower')}</i></th></tr></thead><tbody>`);

					guildPowerBuildings.forEach(plbuilding => {
						let countBuilding = typeof plbuilding.count != 'undefined' ? plbuilding.count : 1;
						let powerCount = (plbuilding.power && plbuilding.power.value) ? plbuilding.power.value : 0;
						totalPower += powerCount;
						d.push(`<tr><td>${countBuilding} x  ${plbuilding.name}</td><td class="text-right">${HTML.Format(powerCount)}</td></tr>`);
					});

					d.push(`<tr><td class="text-bright">${i18n('Boxes.GuildMemberStat.TotalGuildPower')}</td><td class="text-right text-bright">${HTML.Format(totalPower)}</td></tr>`);
					d.push(`</tbody></table></div>`);
				}

				d.push('</div></td></tr></tbody></table></div>');
			}

			d.push('</div></td></tr>');

			$(d.join('')).insertAfter('#' + id);

		});

		// Show Delete Buttons
		$('#GuildMemberTable th span.edit').off('click').on('click', function (e) {
			//Show modal Warning before delete
			if (!GuildMemberStat.acceptedDeleteWarning) {
				$('<div/>', {
					id: 'gms-modal-warning',
					class: 'warningoverlay',
					html: '<div class="warningoverlay-content">' + i18n('Boxes.GuildMemberStat.DeleteDataWarning') + '<br /><br /><button id="gms-accept-modal" class="btn">' + i18n('Boxes.GuildMemberStat.GotIt') + '</button><div>'
				}).appendTo('#GuildMemberStatBody');

				$('#GuildMemberStatBody').on('click', '#gms-accept-modal', function () {
					$("#gms-modal-warning").fadeOut(400, function () { $("#gms-modal-warning").remove(); GuildMemberStat.acceptedDeleteWarning = true; });
				});
			}
			e.stopPropagation();
			$(this).closest('table').find('.btn-delete').fadeToggle(50);
		});

		// Delete an inactivity entry
		$('#GuildMemberTable .deleteInactivity').off('click').on('click', function () {

			let button = $(this);
			let index = parseInt($(button).attr('data-warn'));
			let player_id = parseInt($(button).attr('data-id'));

			let delObj = {
				player_id: player_id,
				data: GuildMemberStat.MemberDict[player_id]['activity'][0]['warnings'][index],
				content: 'activity'
			}

			GuildMemberStat.DeletePlayerDetail(delObj);

			$(button).closest("tr").remove();

		});

		// Delete an gex entry
		$('#GuildMemberTable .deleteGexWeek').off('click').on('click', function () {

			let button = $(this);
			let delObj = {
				player_id: parseInt($(button).attr('data-id')),
				data: { gexweek: parseInt($(button).attr('data-gexweek')) },
				content: 'gex'
			}

			GuildMemberStat.DeletePlayerDetail(delObj);

			$(button).closest("tr").remove();

		});

		// Delete an gbg entry
		$('#GuildMemberTable .deleteGBG').off('click').on('click', function () {

			let button = $(this);
			let delObj = {
				player_id: parseInt($(button).attr('data-id')),
				data: { gbgid: parseInt($(button).attr('data-gbgid')) },
				content: 'gbg'
			}

			GuildMemberStat.DeletePlayerDetail(delObj);

			$(button).closest("tr").remove();

		});

		$('#GuildMemberTable thead.hasdetail').off('click').on('click', function () {

			let thead = $(this);

			$(thead).toggleClass('open').toggleClass('closed');
			$(thead).next().toggleClass('open').toggleClass('closed');
			/*if ($(thead).hasClass('open')) {
				$(thead).removeClass('open').addClass('closed');
				$(thead).next().removeClass('open').addClass('closed');
			}
			else {
				$(thead).removeClass("closed").addClass('open');
				$(thead).next().removeClass("closed").addClass('open');
			}*/

		});

		$('#GuildMemberTable .gms-tooltip').tooltip({
			html: true,
			container: '#GuildMemberStatBody'
		});

		helper.preloader.hide("#GuildMemberStat");

	},


	ShowGuildEras: async () => {

		GuildMemberStat.CurrentStatGroup = 'Eras';
		helper.preloader.show("#GuildMemberStat");
		GuildMemberStat.InitSettings();

		let GuildMembers = await GuildMemberStat.db.player.where({ deleted: 0 }).reverse().sortBy('score');
		let d = [];
		let rank = 1;
		let TreasuryGoodsData = GuildMemberStat.TreasuryGoodsData;
		let hasTreasuryTotals = (TreasuryGoodsData !== undefined && TreasuryGoodsData !== null && TreasuryGoodsData.hasOwnProperty('totals'));
		let ExportContent = GuildMemberStat.ExportData = [];

		// group members to era
		let EraGroup = GuildMemberStat.EraGroup = GuildMembers.reduce((res, obj) => {
			let eraId = Technologies.Eras[obj['era']];
			if (!(eraId in res)) {
				res[eraId] = { eraId: eraId, era: obj['era'], score: 0 };
				res[eraId]['members'] = [];
			}
			res[eraId]['members'].push(
				obj
			);
			res[eraId].score += obj.score;

			return res;
		}, []);

		if (EraGroup) {
			d.push(`<table id="GuildErasTable" class="foe-table">` +
				`<thead class="sticky"><tr class="sorter-header">` +
				`<th class="is-number" data-type="gms-era">#</th>` +
				`<th class="case-sensitive" data-type="gms-era">${i18n('Boxes.GuildMemberStat.Eras')}</th>` +
				`<th class="is-number text-center" data-type="gms-era">${i18n('Boxes.GuildMemberStat.GuildMembers')}</th>`);
			d.push(`<th class="is-number ${hasTreasuryTotals ? 'text-right' : 'text-center'}" data-type="gms-era">${i18n('Boxes.GuildMemberStat.TreasuryGoods')}</th>`);
			d.push(`<th class="is-number text-right" data-type="gms-era">${i18n('Boxes.GuildMemberStat.Points')}</th>` +
				`<th class="expand-all closed"></th></tr>` +
				`</thead><tbody class="gms-era copyable">`);

			ExportContent.push(['eraId', 'era', 'numberOfMembers', 'treasuryGoods', 'memberPoints']);

			for (let era in EraGroup) {
				if (!EraGroup.hasOwnProperty(era))
					break;

				let countEra = typeof EraGroup[era].members.length != 'undefined' ? EraGroup[era].members.length : 1;
				let eraTotals = 0;

				d.push(`<tr id="era${EraGroup[era].eraId}" data-id="${EraGroup[era].eraId}" class="hasdetail">` +
					`<td class="is-number" data-number="${EraGroup[era].eraId}">${EraGroup[era].eraId}</td>` +
					`<td class="case-sensitive" data-text="${i18n('Eras.' + EraGroup[era].eraId)}">${i18n('Eras.' + EraGroup[era].eraId)}</td>` +
					`<td class="is-number text-center" data-number="${countEra}">${countEra}</td>`);

				if (hasTreasuryTotals) {
					eraTotals = TreasuryGoodsData['totals'].hasOwnProperty([EraGroup[era].era]) ? TreasuryGoodsData.totals[EraGroup[era].era] : 0;
					d.push(`<td title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.LastUpdate')) + ' ' + moment(TreasuryGoodsData.updated).fromNow()}" class="is-number text-right gms-tooltip" data-number="${eraTotals}">${HTML.Format(eraTotals)}</td>`);
				}
				else {
					d.push(`<td title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.GuildTreasuryNotification'))}" class="gms-tooltip is-number text-center" data-number="${EraGroup[era].eraId}">-</td>`);
				}

				d.push(`<td class="is-number text-right" data-number="${EraGroup[era].score}">${HTML.Format(EraGroup[era].score)}</td><td></td>` +
					`</tr>`);

				ExportContent.push([EraGroup[era].eraId, i18n('Eras.' + EraGroup[era].eraId), countEra, eraTotals, EraGroup[era].score])
			};
			d.push(`</tbody></table>`);
		}

		$('#gmsContentWrapper').html(d.join('')).promise().done(function () {

			$("#GuildErasTable").tableSorter();

			$('#GuildErasTable .gms-tooltip').tooltip({
				html: true,
				container: '#GuildMemberStatBody'
			});

			$('#GuildErasTable thead .expand-all').off('click').on('click', async function (e) {
				e.preventDefault();

				let tr = $('#GuildErasTable > tbody').children('tr');
				let expand = $(this).hasClass('closed') ? true : false;
				$(this).toggleClass("closed open");

				if (expand === true) {
					helper.preloader.show("#GuildMemberStat");
					setTimeout(() => { GuildMemberStat.ShowGuildEraDetail(tr, expand), 300 });
				}
				else {
					GuildMemberStat.ShowGuildEraDetail(tr, expand);
				}
			});

			$('#GuildErasTable > thead th:not(:last)').on('click', function () {
				$('#GuildErasTable > tbody tr').removeClass("open");
				$('#GuildErasTable th.expand-all').removeClass("open").addClass("closed");
			});

			$('#GuildErasTable > tbody tr').on('click', function () {
				let tr = [$(this)];
				GuildMemberStat.ShowGuildEraDetail(tr);
			});

			helper.preloader.hide('#GuildMemberStat');
		});

	},


	ShowGuildEraDetail: (arr, expand) => {

		if (!arr && arr.length === 0) { return; }

		let EraGroup = GuildMemberStat.EraGroup;
		let TreasuryGoodsData = GuildMemberStat.TreasuryGoodsData;

		if (expand === false) {
			$("#GuildErasTable > tbody tr.detailview").remove();
			$("#GuildErasTable > tbody tr").removeClass('open');
			return;
		}

		$.each(arr, function () {
			let e = $(this);

			if (e.next("tr.detailview").length) {
				e.next("tr.detailview").remove();
				e.removeClass('open');
			}
			else {
				if (!e.hasClass("hasdetail"))
					return;

				e.addClass('open');

				let eraId = e.attr('data-id');
				let h = [];

				h.push(`<tr class="detailview dark-bg"><td colspan="${e.find("td").length}"><div class="detail-wrapper"><div class="detail-item">` +
					`<table><thead class="sticky"><tr><th>${i18n('Boxes.GuildMemberStat.Rank')}</th><th>${i18n('Boxes.GuildMemberStat.Member')}</th><th>${i18n('Boxes.GuildMemberStat.Eras')}</th><th class="text-right">${i18n('Boxes.GuildMemberStat.Points')}</th></tr></thead><tbody>`);

				if (EraGroup[eraId].members !== undefined) {

					let EraMembers = EraGroup[eraId].members.sort(function (a, b) { return a.score > b.score });

					EraMembers.forEach(member => {
						h.push(`<tr><td>${member.rank[1]}</td><td>${MainParser.GetPlayerLink(member.player_id, member.name)}</td><td>${i18n('Eras.' + eraId)}</td><td class="text-right">${HTML.Format(member.score)}</td></tr>`);
					});

				}
				h.push('</tbody></table></div>');

				// Show in stock Treasury Goods for Era
				if (TreasuryGoodsData !== null && typeof TreasuryGoodsData[EraGroup[eraId].era] !== 'undefined') {
					let EraTreasuryGoods = TreasuryGoodsData[EraGroup[eraId].era];

					h.push(`<div class="detail-item"><table><thead class="sticky"><tr><th colspan="3">${i18n('Boxes.GuildMemberStat.EraTreasuryGoods')}</th></tr></thead><tbody>`);
					EraTreasuryGoods.forEach(good => {
						h.push(`<tr><td class="goods-image"><span class="goods-sprite sprite-35 ${good.good}"></span></td><td>${good.name}</td><td class="text-right">${HTML.Format(good.value)}</td></tr>`);
					});

					h.push(`<tr><td colspan="3" class="text-right"><i>${i18n('Boxes.GuildMemberStat.LastUpdate') + ' ' + moment(TreasuryGoodsData.updated).fromNow()}</i></td></tr>`);
					h.push(`</tbody></table></div>`);

				}
				h.push('</div></td></tr>');

				$(h.join('')).insertAfter($('#era' + eraId));
			}

		});

		helper.preloader.hide('#GuildMemberStat');

	},


	ShowGuildBuildings: async () => {

		helper.preloader.show("#GuildMemberStat");
		GuildMemberStat.InitSettings();
		GuildMemberStat.CurrentStatGroup = 'GuildBuildings';

		let d = [];
		let totalGoods = 0;
		let totalPower = 0;
		let ExportContent = GuildMemberStat.ExportData = [];
		let gmsBuildingDict = await GuildMemberStat.GetGuildMemberBuildings('guildbuildings');

		ExportContent.push(['building', 'level', 'eraId', 'era', 'member', 'guildPower', 'guildGoods']);

		// add notification for how to update guild building statisitc
		d.push(`<div class="view_notification">${i18n('Boxes.GuildMemberStat.GuildBuildingNotification')} <button style="float:right" id="toggleBuildingView" class="btn">${i18n('Boxes.GuildMemberStat.ChangeView')}</button></div>`);

		if (gmsBuildingDict === undefined || gmsBuildingDict.length <= 0) {
			$("#gmsContentWrapper").html(d.join(''));
			helper.preloader.hide("#GuildMemberStat");
			return;
		}

		let fullGBList = $.extend(true, [], gmsBuildingDict);

		let allGuildBuildings = fullGBList.reduce(function (res, obj) {

			if (obj.gbid === undefined) {
				res.__array.push(res['outdated'] = obj);
				return res;
			}

			let buildingID = obj.player_id + '' + obj.gbid;

			if (!(buildingID in res)) {
				res.__array.push(res[buildingID] = obj);
			}
			else {
				res[buildingID] = Object.assign(res[buildingID], obj);
			}

			return res;
		}, { __array: [] }).__array.sort(function (a, b) {
			return a.name.localeCompare(b.name) || (a.level - b.level);
		});

		let guildGoodsBuildings = gmsBuildingDict.reduce(function (res, obj) {

			if (obj.resources !== undefined) {
				let count = typeof obj.count === 'undefined' ? 1 : obj.count;

				if (!(obj.name in res)) {
					res.__array.push(res[obj.name] = obj);
					res[obj.name].count = count;
				}
				else {
					res[obj.name].resources.totalgoods += obj.resources.totalgoods;
					res[obj.name].count += count;
				}

			}
			return res;
		}, { __array: [] }).__array.sort(function (a, b) {
			return a.name.localeCompare(b.name);
		});

		let guildPowerBuildings = gmsBuildingDict.reduce(function (res, obj) {

			if (obj.power !== undefined) {
				let count = typeof obj.count === 'undefined' ? 1 : obj.count;

				if (!(obj.name in res)) {
					res.__array.push(res[obj.name] = obj);
					res[obj.name].count = count;
				}
				else {
					res[obj.name].power.value += obj.power.value;
					res[obj.name].count += count;
				}
			}
			return res;
		}, { __array: [] }).__array.sort(function (a, b) {
			return a.name.localeCompare(b.name);
		});

		d.push(`<div class="detail-wrapper buildinglist grouped show">`);

		if (guildGoodsBuildings.length) {
			d.push(`<div class="detail-item guildgoods"><table class="foe-table copyable sticky"><thead><tr><th colspan="3"><i>${i18n('Boxes.GuildMemberStat.GuildGoods')}</i></th></tr></thead><tbody>`);

			guildGoodsBuildings.forEach(plbuilding => {
				let countBuilding = typeof plbuilding.count != 'undefined' ? plbuilding.count : 1;
				let goodCount = (plbuilding.resources && plbuilding.resources.totalgoods) ? plbuilding.resources.totalgoods : 0;
				totalGoods += goodCount;
				d.push(`<tr><td class="text-right">${countBuilding} x</td><td>${plbuilding.name}</td><td class="text-right">${HTML.Format(goodCount)}</td></tr>`);
			});

			d.push(`<tr><td></td><td class="text-bright">${i18n('Boxes.GuildMemberStat.TotalGuildGoods')}</td><td class="text-right text-bright">${HTML.Format(totalGoods)}</td></tr>`);
			d.push(`</tbody></table></div>`);
		}

		if (guildPowerBuildings.length) {
			d.push(`<div class="detail-item guildgoods"><table class="foe-table copyable sticky"><thead><tr><th colspan="3"><i>${i18n('Boxes.GuildMemberStat.GuildPower')}</i></th></tr></thead><tbody>`);

			guildPowerBuildings.forEach(plbuilding => {
				let countBuilding = typeof plbuilding.count != 'undefined' ? plbuilding.count : 1;
				let powerCount = (plbuilding.power && plbuilding.power.value) ? plbuilding.power.value : 0;
				totalPower += powerCount;
				d.push(`<tr><td class="text-right">${countBuilding} x</td><td>${plbuilding.name}</td><td class="text-right">${HTML.Format(powerCount)}</td></tr>`);
			});

			d.push(`<tr><td></td><td class="text-bright">${i18n('Boxes.GuildMemberStat.TotalGuildPower')}</td><td class="text-right text-bright">${HTML.Format(totalPower)}</td></tr>`);
			d.push(`</tbody></table></div>`);
		}

		d.push(`</div>`);

		d.push(`<div class="detail-wrapper buildinglist detail hide">`);
		d.push(`<div class="detail-item guildbuildings"><table id="guildbuildingslist" class="foe-table"><thead class="sticky"><tr class="sorter-header">` +
			`<th class="is-number" data-type="gms-gbl">#</th>` +
			`<th class="case-sensitive" data-type="gms-gbl">${i18n('Boxes.GuildMemberStat.GuildBuildings')}</th>` +
			`<th class="is-number text-center" data-type="gms-gbl">${i18n('Boxes.GuildMemberStat.Level')}</th>` +
			`<th class="case-sensitive" data-type="gms-gbl">${i18n('Boxes.GuildMemberStat.Member')}</th>` +
			`<th class="is-number" data-type="gms-gbl">${i18n('Boxes.GuildMemberStat.Eras')}</th>` +
			`<th class="is-number text-center" data-type="gms-gbl">${i18n('Boxes.GuildMemberStat.GuildGoods')}</th>` +
			`<th class="is-number text-center" data-type="gms-gbl">${i18n('Boxes.GuildMemberStat.GuildPower')}</th>` +
			`</tr></thead><tbody class="gms-gbl copyable">`);

		let bCounter = 1;

		allGuildBuildings.forEach(plbuilding => {

			let goodCount = (plbuilding.resources && plbuilding.resources.totalgoods) ? plbuilding.resources.totalgoods : 0;
			let powerCount = (plbuilding.power && plbuilding.power.value) ? plbuilding.power.value : 0;
			let Entity = MainParser.CityEntities[plbuilding.entity_id];
			let level = Entity && Entity['type'] === 'greatbuilding' && plbuilding.level !== null && plbuilding.level !== undefined ? plbuilding.level : 0;
			let goodslist = '';

			if (plbuilding.resources && plbuilding.resources.goods && plbuilding.resources.goods !== null) {
				goodslist = plbuilding.resources.goods.map(good => {
					return `<span title="${good.value} x ${GoodsData[good.good_id]['name']}" class="goods-sprite sprite-35 ${good.good_id}"></span> `;
				}).join('');

			}

			ExportContent.push([plbuilding.name, (plbuilding.level !== null ? plbuilding.level : ''), Technologies.Eras[plbuilding.era], i18n('Eras.' + Technologies.Eras[plbuilding.era]), plbuilding.member, (plbuilding.power !== undefined ? plbuilding.power.value : 0), (plbuilding.resources !== undefined ? plbuilding.resources.totalgoods : 0)]);

			d.push(`<tr${plbuilding.gbid === undefined ? ` class="outdated" title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.GuildBuildingNotification'))}"` : ''}">` +
				`<td class="is-number" data-number="${bCounter}">${bCounter++}</td>` +
				`<td class="case-sensitive" data-text="${helper.str.cleanup(plbuilding.name)}">${plbuilding.name}</td>` +
				`<td class="is-number text-center" data-number="${level}">${HTML.Format(level)}</td>` +
				`<td class="case-sensitive" data-text="${helper.str.cleanup(plbuilding.member)}">${MainParser.GetPlayerLink(plbuilding.player_id, plbuilding.member)}</td>` +
				`<td class="is-number" data-number="${Technologies.Eras[plbuilding.era]}">${plbuilding.era !== undefined ? i18n('Eras.' + Technologies.Eras[plbuilding.era]) : '-'}</td>` +
				`<td class="is-number text-center gms-tooltip" data-number="${goodCount}" title="${HTML.i18nTooltip(goodslist !== '' ? `<span class="goods-count">${goodCount / 5}x</span>${goodslist}` : '')}">${HTML.Format(goodCount)}</td>` +
				`<td class="is-number text-center" data-number="${powerCount}">${HTML.Format(powerCount)}</td></tr>`);
		});

		d.push(`</tbody></table></div></div>`);

		$('#gmsContentWrapper').html(d.join('')).promise().done(function () {

			$('#guildbuildingslist').tableSorter();

			$('#guildbuildingslist .gms-tooltip').tooltip({
				html: true,
				container: '#GuildMemberStatBody'
			});

			helper.preloader.hide("#GuildMemberStat");

			$('#gmsContentWrapper #toggleBuildingView').on('click', function () {
				$('#gmsContentWrapper .buildinglist').toggleClass('hide show');
			});
		});
	},


	ShowGuildGoods: async () => {

		helper.preloader.show("#GuildMemberStat");
		GuildMemberStat.InitSettings();
		GuildMemberStat.CurrentStatGroup = 'GuildGoods';

		let d = [];
		let ErasGuildGoods = await GuildMemberStat.GetGuildMemberBuildings('guildbuildings');
		let TreasuryGoodsData = GuildMemberStat.TreasuryGoodsData;
		let ExportContent = GuildMemberStat.ExportData = [];

		ErasGuildGoods = ErasGuildGoods.reduce(function (res, obj) {

			if (obj.era !== undefined && obj.resources !== undefined && obj.resources.goods !== undefined && obj.resources.goods !== null) {
				let eraId = Technologies.Eras[obj['era']];

				if (!(eraId in res)) {
					res[eraId] = {};
					obj.resources.goods.forEach(good => {
						res[eraId][good.good_id] = { good: good.good_id, name: GoodsData[good.good_id].name, value: good.value };
					});
				}
				else {
					obj.resources.goods.forEach(good => {
						res[eraId][good.good_id].value += good.value;
					});
				}
			}
			return res;

		}, {});

		// add notification for how to update guild building statisitc and Treasury Goods List
		d.push(`<div class="view_notification">1. ${i18n('Boxes.GuildMemberStat.GuildBuildingNotification')}<br />2. ${i18n('Boxes.GuildMemberStat.GuildTreasuryNotification')}</div>`);

		if (ErasGuildGoods === null) {
			$("#gmsContentWrapper").html(d.join(''));
			helper.preloader.hide("#GuildMemberStat");
			return;
		}

		d.push(`<table id="TreasuryGoodsTable" class="foe-table"><thead class="sticky"><tr><th>${i18n('Boxes.GuildMemberStat.Eras')}</th><th> ${i18n('Boxes.GuildMemberStat.ProducedTreasuryGoods')}</th><th> ${i18n('Boxes.GuildMemberStat.TreasuryGoods')}</th></thead><tbody>`);

		ExportContent.push(['eraID', 'era', 'good', 'produceable', 'instock']);

		let GuildMembers = await GuildMemberStat.db.player.where({ deleted: 0 }).reverse().sortBy('score');

		let EraGroup = GuildMemberStat.EraGroup = GuildMembers.reduce((res, obj) => {
			let eraId = Technologies.Eras[obj['era']];
			if (!(eraId in res)) {
				res[eraId] = { eraId: eraId, era: obj['era'], score: 0 };
				res[eraId]['members'] = [];
			}
			res[eraId]['members'].push(
				obj
			);
			res[eraId].score += obj.score;

			return res;
		}, []);

		for (let eraId = Technologies.Eras.IronAge; eraId < Technologies.Eras.NextEra; eraId++) {
			if (GoodsList.length < 5 * (eraId - 1)) break; // Era does not exist yet

			if (Technologies.EraNames[eraId] === undefined) continue;

			let currentEra = i18n('Eras.' + eraId);
			let exportGood = {};

			let countEra = typeof EraGroup[eraId]?.members?.length != 'undefined' ? EraGroup[eraId]?.members?.length : 0;


			d.push(`<tr><td>${i18n('Eras.' + eraId)}<br>(${countEra} ${i18n('Boxes.GuildMemberStat.GuildMembers')})</td>`);

			// Goods from Guild Building productions
			if (ErasGuildGoods[eraId] !== undefined) {
				let DailyGuildGoods = ErasGuildGoods[eraId];

				d.push(`<td class="detail dark">`);
				d.push(`<div class="detail-item"><table class="foe-table copyable">`);
				d.push(`<tbody>`);

				for (let i in DailyGuildGoods) {
					if (DailyGuildGoods.hasOwnProperty(i)) {
						if (exportGood[DailyGuildGoods[i].good] === undefined)
							exportGood[DailyGuildGoods[i].good] = { eraId: eraId, era: currentEra, good: DailyGuildGoods[i].name, produceable: 0, instock: 0 };

						d.push(`<tr><td class="goods-image"><span class="goods-sprite sprite-35 ${i}"></span></td><td>${DailyGuildGoods[i].name}</td><td class="text-right">${HTML.Format(DailyGuildGoods[i].value)}</td></tr>`);
						exportGood[DailyGuildGoods[i].good].produceable = DailyGuildGoods[i].value;
					}
				}
				d.push(`</tbody></table></div>`);
				d.push(`</td>`);
			}
			else {
				d.push(`<td class="detail text-center dark gms-tooltip" title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.GuildBuildingNotification'))}">-</td>`);
			}

			// In stock guild good for the era
			if (TreasuryGoodsData !== undefined && TreasuryGoodsData !== null && typeof TreasuryGoodsData[Technologies.EraNames[eraId]] !== 'undefined') {
				let EraTreasuryGoods = TreasuryGoodsData[Technologies.EraNames[eraId]].sort(function (a, b) { return a.good.localeCompare(b.good) });
				d.push(`<td class="detail">`);

				d.push(`<div class="detail-item"><table class="foe-table copyable">`);
				d.push(`<tbody>`);

				EraTreasuryGoods.forEach(good => {

					if (exportGood[good.good] === undefined)
						exportGood[good.good] = { eraId: eraId, era: currentEra, good: good.name, produceable: 0, instock: 0 };

					d.push(`<tr><td class="goods-image"><span class="goods-sprite sprite-35 ${good.good}"></span></td><td>${good.name}</td><td class="text-right">${HTML.Format(good.value)}</td></tr>`);
					exportGood[good.good].instock = good.value;
				});

				d.push(`</tbody></table></div>`);
				d.push(`</td>`);

			}
			else {
				d.push(`<td class="detail text-center gms-tooltip" ${TreasuryGoodsData === null ? `title="${HTML.i18nTooltip(i18n('Boxes.GuildMemberStat.GuildTreasuryNotification'))}"` : ''}>-</td>`);
			}

			d.push(`</td></tr>`);

			Object.values(exportGood).forEach(el => {
				if (el !== null)
				{
					ExportContent.push(Object.values(el));
				}
			});

		};

		d.push(`</tbody></table>`);

		$('#gmsContentWrapper').html(d.join('')).promise().done(function () {

			$('#TreasuryGoodsTable .gms-tooltip').tooltip({
				html: true,
				container: '#GuildMemberStatBody'
			});

			helper.preloader.hide("#GuildMemberStat");
		});
	},


	ShowGreatBuildings: async () => {

		helper.preloader.show("#GuildMemberStat");
		GuildMemberStat.InitSettings();
		GuildMemberStat.CurrentStatGroup = 'GreatBuildings';

		let d = [];

		let GreatBuildings = await GuildMemberStat.GetGuildMemberBuildings('greatbuildings');
		let allMemberIds = Object.keys(GuildMemberStat.MemberDict);

		d.push(`<div class="view_notification">${i18n('Boxes.GuildMemberStat.GuildBuildingNotification')} <button style="float:right" id="toggleGreatBuildingView" class="btn">${i18n('Boxes.GuildMemberStat.ChangeView')}</button></div>`);

		if (GreatBuildings === null) {
			$("#gmsContentWrapper").html(d.join(''));
			helper.preloader.hide("#GuildMemberStat");
			return;
		}

		let GreatBuildingsDetail = $.extend(true, [], GreatBuildings);
		let exportData = GuildMemberStat.ExportData = [];

		exportData.push(['gbname', 'city_entity_id', 'member', 'level', 'max_level', 'invested_forge_points', 'forge_points_for_level_up']);

		let GBOverview = GreatBuildings.reduce(function (res, obj) {

			obj.invested_forge_points = obj.invested_forge_points ? obj.invested_forge_points : 0

			exportData.push([obj.name, obj.cityentity_id, obj.member, obj.level, obj.max_level, obj.invested_forge_points, obj.forge_points_for_level_up]);

			let d = {
				cityentity_id: obj.cityentity_id,
				name: obj.name
			}

			if (!(obj.cityentity_id in res)) {
				res.__array.push(res[obj.cityentity_id] = d);
				res[obj.cityentity_id].count = 1;
				res[obj.cityentity_id].max_level = obj.level;
				res[obj.cityentity_id].min_level = obj.level;
				res[obj.cityentity_id].player = [{
					player_id: obj.player_id,
					member: obj.member,
					fplevelup: obj.max_level > obj.level ? obj.forge_points_for_level_up : 0,
					investedfp: obj.invested_forge_points,
					level: obj.level,
					max_level: obj.max_level
				}];
				res[obj.cityentity_id].NoGbMember = allMemberIds.filter(function (value) {
					return value != obj.player_id;
				});
			}
			else {
				res[obj.cityentity_id] = Object.assign(res[obj.cityentity_id], d);
				res[obj.cityentity_id].count += 1;
				res[obj.cityentity_id].max_level = res[obj.cityentity_id].max_level < obj.level ? obj.level : res[obj.cityentity_id].max_level;
				res[obj.cityentity_id].min_level = res[obj.cityentity_id].min_level > obj.level ? obj.level : res[obj.cityentity_id].min_level;
				res[obj.cityentity_id].player.push({
					player_id: obj.player_id,
					member: obj.member,
					fplevelup: obj.max_level > obj.level ? obj.forge_points_for_level_up : 0,
					investedfp: obj.invested_forge_points,
					level: obj.level,
					max_level: obj.max_level
				});
				res[obj.cityentity_id].NoGbMember = res[obj.cityentity_id].NoGbMember.filter(function (value) {
					return value != obj.player_id;
				});
			}

			return res;
		}, { __array: [] }).__array.sort(function (a, b) {
			return a.name.localeCompare(b.name);
		});

		d.push(`<div class="detail-wrapper greatbuildinglist grouped show">`);
		d.push(`<table id="gblist" class="foe-table"><thead class="sticky"><tr class="sorter-header">` +
			`<th class="case-sensitive" data-type="gms-greatbl">${i18n('Boxes.GuildMemberStat.GreatBuildings')}</th>` +
			`<th class="is-number text-center" data-type="gms-greatbl">${i18n('Boxes.GuildMemberStat.Available')}</th>` +
			`<th class="is-number text-center" data-type="gms-greatbl">${i18n('Boxes.GuildMemberStat.MinLevel')}</th>` +
			`<th class="is-number text-center" data-type="gms-greatbl">${i18n('Boxes.GuildMemberStat.MaxLevel')}</th>` +
			`<th></th></tr></thead><tbody class="gms-greatbl">`);

		for (let x = 0; x < GBOverview.length; x++) {
			const building = GBOverview[x];
			d.push(`<tr class="hasdetail" id="gms_${x}" data-id="${x}">` +
				`<td class="case-sensitive" data-text="${helper.str.cleanup(building.name)}">${building.name}</td>` +
				`<td class="text-center" data-number="${building.count}">${building.count}</td>` +
				`<td class="text-center" data-number="${building.min_level}">${building.min_level}</td>` +
				`<td class="text-center" data-number="${building.max_level}">${building.max_level}</td>` +
				`<td></td></tr>`);
		}

		d.push(`</tbody></table>`);
		d.push(`</div>`);

		d.push(`<div class="detail-wrapper greatbuildinglist detail hide">`);
		d.push(`<table id="gblist_detail" class="foe-table"><thead class="sticky"><tr class="sorter-header">` +
			`<th class="case-sensitive" data-type="gms-greatbl-detail">${i18n('Boxes.GuildMemberStat.GreatBuildings')}</th>` +
			`<th class="case-sensitive" data-type="gms-greatbl-detail">${i18n('Boxes.GuildMemberStat.Member')}</th>` +
			`<th class="is-number text-center" data-type="gms-greatbl-detail">${i18n('Boxes.GuildMemberStat.Level')}</th>` +
			`<th class="is-number text-center" data-type="gms-greatbl-detail">${i18n('Boxes.GuildMemberStat.UnlockedLevel')}</th>` +
			`<th class="is-number text-center" data-type="gms-greatbl-detail">${i18n('Boxes.GuildMemberStat.FpInvested')}</th>` +
			`<th class="is-number text-center" data-type="gms-greatbl-detail">${i18n('Boxes.GuildMemberStat.FpForLevelUp')}</th>` +
			`<th></th></tr></thead><tbody class="gms-greatbl-detail">`);

		GreatBuildingsDetail = GreatBuildingsDetail.sort(function (a, b) {
			return a.name.localeCompare(b.name) || (a.level - b.level);
		});

		for (let x = 0; x < GreatBuildingsDetail.length; x++) {
			const dbuilding = GreatBuildingsDetail[x];
			let invested_forge_points = dbuilding.invested_forge_points ? dbuilding.invested_forge_points : 0;
			let forge_points_for_level_up = dbuilding.max_level > dbuilding.level ? dbuilding.forge_points_for_level_up : 0
			let investable = dbuilding.max_level > dbuilding.level ? true : false;

			d.push(`<tr id="gms_detail_${x}" data-id="${x}">` +
				`<td class="case-sensitive ascending" data-text="${helper.str.cleanup(dbuilding.name)}">${dbuilding.name}</td>` +
				`<td class="case-sensitive" data-text="${helper.str.cleanup(dbuilding.member)}">${MainParser.GetPlayerLink(dbuilding.player_id, dbuilding.member)}</td>` +
				`<td class="text-center" data-number="${dbuilding.level}">${dbuilding.level}</td>` +
				`<td class="text-center" data-number="${dbuilding.max_level}">${dbuilding.max_level}</td>` +
				`<td class="text-center" data-number="${invested_forge_points}">${investable ? invested_forge_points : '-'}</td>` +
				`<td class="text-center" data-number="${forge_points_for_level_up - invested_forge_points}">${HTML.Format(forge_points_for_level_up - invested_forge_points)}</td>` +
				`<td></td></tr>`);
		}

		d.push(`</tbody></table>`);
		d.push(`</div>`);

		$('#gmsContentWrapper').html(d.join('')).promise().done(function () {

			$('#gblist,#gblist_detail').tableSorter();
			$('#gms-filter-input').show();
			$('#gms-filter-input').off().on('keyup', function () {
				if ($('.greatbuildinglist.grouped').hasClass("show"))
					GuildMemberStat.filterTable('gms-filter-input', 'gblist');
				else if ($('.greatbuildinglist.detail').hasClass("show"))
					GuildMemberStat.filterTable('gms-filter-input', 'gblist_detail');
			});

			$('#gmsContentWrapper #toggleGreatBuildingView').on('click', function () {
				$('#gmsContentWrapper .greatbuildinglist').toggleClass('hide show').promise().done(function () {

					if ($('#gms-filter-input').is(":visible") && $('#gms-filter-input').val() !== '') {
						if ($('.greatbuildinglist.grouped').hasClass("show"))
							GuildMemberStat.filterTable('gms-filter-input', 'gblist');
						else if ($('.greatbuildinglist.detail').hasClass("show"))
							GuildMemberStat.filterTable('gms-filter-input', 'gblist_detail');
					}
				});
			});

			helper.preloader.hide("#GuildMemberStat");

			$('#gblist > tbody tr.hasdetail').off().on('click', function () {

				if ($(this).next("tr.detailview").length) {
					$(this).next("tr.detailview").remove();
					$(this).removeClass('open');
				}
				else {
					let id = $(this).attr("data-id");
					let d = [];
					if (!$(this).hasClass("hasdetail") || !GBOverview || !GBOverview[id] || !GBOverview[id]['player'])
						return;

					d.push('<tr class="detailview dark-bg"><td colspan="' + $(this).find("td").length + '"><div class="detail-wrapper">');
					$(this).addClass('open');

					const player = GBOverview[id]['player'].sort(function (a, b) { return a.level - b.level });
					let NoGbMember = GBOverview[id]['NoGbMember'];

					d.push(`<div class="detail-item gb_player"><div>` +
						`<table id="gb_detail_${id}" class="foe-table sortable-table"><thead class="sticky"><tr class="sorter-header subsort">` +
						`<th class="case-sensitive" data-type="gms-dgb${id}">${i18n('Boxes.GuildMemberStat.Member')}</th>` +
						`<th class="is-number text-center" data-type="gms-dgb${id}">${i18n('Boxes.GuildMemberStat.Level')}</th>` +
						`<th class="is-number text-center" data-type="gms-dgb${id}">${i18n('Boxes.GuildMemberStat.UnlockedLevel')}</th>` +
						`<th class="is-number text-center" data-type="gms-dgb${id}">${i18n('Boxes.GuildMemberStat.FpInvested')}</th>` +
						`<th class="is-number text-center" data-type="gms-dgb${id}">${i18n('Boxes.GuildMemberStat.FpForLevelUp')}</th>` +
						`</tr></thead><tbody class="gms-dgb${id}">`);

					for (let i in player) {
						if (!player.hasOwnProperty(i)) continue;

						d.push(`<tr><td data-text="${helper.str.cleanup(player[i].member)}">${MainParser.GetPlayerLink(player[i].player_id, player[i].member)}</td>` +
							`<td class="text-center" data-number="${player[i].level}">${player[i].level}</td>` +
							`<td class="text-center" data-number="${player[i].max_level}">${player[i].max_level}</td>` +
							`<td class="text-center" data-number="${player[i].investedfp}">${player[i].fplevelup !== 0 ? player[i].investedfp : '-'}</td>` +
							`<td class="text-center" data-number="${player[i].fplevelup - player[i].investedfp}">${HTML.Format(player[i].fplevelup - player[i].investedfp)}</td>` +
							`</tr>`);
					}
					d.push('</tbody></table>');

					// Show guild member without this great building
					if (NoGbMember !== undefined && NoGbMember.length) {
						NoGbMember = NoGbMember.filter(member => { return !GuildMemberStat.MemberDict[member].deleted });
						NoGbMember = NoGbMember.sort(function (a, b) { return GuildMemberStat.MemberDict[a].name.localeCompare(GuildMemberStat.MemberDict[b].name) });

						d.push(`<div class="no_gb_member copyable"><span class="text-bright"><i>${HTML.i18nReplacer(i18n('Boxes.GuildMemberStat.MemberWithoutGB'), { 'greatbuilding': GBOverview[id]['name'] })}</i>: </span>`);
						for (let i = 0; i < NoGbMember.length; i++)
						{
							d.push(MainParser.GetPlayerLink(NoGbMember[i], GuildMemberStat.MemberDict[NoGbMember[i]].name));
							if (i < NoGbMember.length - 1) d.push(', ');
						}
						d.push(`</div>`);
					}

					d.push('</div></div>');

					$(d.join('')).insertAfter($('#gms_' + id));
				}
			});
		});

	},


	GetGuildMemberBuildings: async (type) => {
		let GuildMembers = await GuildMemberStat.db.player.where({ deleted: 0 }).toArray();
		let gmsBuildingDict = [];
		type = type ? type : 'guildbuildings';

		for (let x = 0; x < GuildMembers.length; x++) {
			const member = GuildMembers[x];
			let memberInfo = { member: member.name, player_id: member.player_id }
			let b = undefined;

			switch (type) {
				case 'guildbuildings':
					b = typeof member['guildbuildings'] !== 'undefined' ? member['guildbuildings']['buildings'] : undefined;
					break;
				case 'greatbuildings':
					b = typeof member['greatbuildings'] !== 'undefined' ? member['greatbuildings'] : undefined;
					break;
			}

			if (b) {
				for (let i = 0; i < b.length; i++) {
					b[i] = Object.assign(b[i], memberInfo);
				}

				gmsBuildingDict.push(...b);
			}
		}

		return gmsBuildingDict;
	},


	DeletePlayerDetail: async (delObj) => {

		if (delObj === undefined || delObj === null)
			return;

		let player_id = delObj.player_id,
			content = delObj.content,
			data = delObj.data;

		switch (content) {
			case 'activity':
				await GuildMemberStat.db.activity.where('player_id').equals(player_id).modify(x => {
					x.warnings = x.warnings.filter(el => {
						return !(el.activity === data.activity && +moment(el.date) === +moment(data.date))
					});
				});

				break;
			case 'gex':
				await GuildMemberStat.db.gex.where({ player_id: player_id, gexweek: data.gexweek }).delete();
				break;
			case 'gbg':
				await GuildMemberStat.db.gbg.where({ player_id: player_id, gbgid: data.gbgid }).delete();
				break;

		}
	},


	InitSettings: () => {

		let Settings = JSON.parse(localStorage.getItem('GuildMemberStatSettings'));
		let TreasuryGoods = JSON.parse(localStorage.getItem('GuildMemberStatTreasuryGoods'));

		if (!Settings)
			return;

		GuildMemberStat.Settings.lastupdate = (Settings.lastupdate !== undefined) ? Settings.lastupdate : 0;
		GuildMemberStat.Settings.showDeletedMembers = (Settings.showDeletedMembers !== undefined) ? Settings.showDeletedMembers : GuildMemberStat.Settings.showDeletedMembers;
		GuildMemberStat.Settings.deleteOlderThan = (Settings.deleteOlderThan !== undefined) ? Settings.deleteOlderThan : GuildMemberStat.Settings.deleteOlderThan;
		GuildMemberStat.Settings.autoStartOnUpdate = (Settings.autoStartOnUpdate !== undefined) ? Settings.autoStartOnUpdate : GuildMemberStat.Settings.autoStartOnUpdate;
		GuildMemberStat.Settings.showSearchbar = (Settings.showSearchbar !== undefined) ? Settings.showSearchbar : GuildMemberStat.Settings.showSearchbar;
		GuildMemberStat.Settings.showBattlesWon = (Settings.showBattlesWon !== undefined) ? Settings.showBattlesWon : GuildMemberStat.Settings.showBattlesWon;
		GuildMemberStat.Settings.gexgbgDateFormat = (Settings.gexgbgDateFormat !== undefined) ? Settings.gexgbgDateFormat : GuildMemberStat.Settings.gexgbgDateFormat;
		GuildMemberStat.Settings.showZeroValues = (Settings.showZeroValues !== undefined) ? Settings.showZeroValues : GuildMemberStat.Settings.showZeroValues;
		GuildMemberStat.TreasuryGoodsData = (TreasuryGoods !== undefined) ? TreasuryGoods : {};

	},


	GuildMemberStatSettings: () => {

		let c = [];
		let deleteAfterDays = [-1, 3, 7, 14, 31, 0]
		let Settings = GuildMemberStat.Settings;

		c.push(`<p class="text-left"><input id="gmsAutoStartOnUpdate" name="autostartonupdate" value="1" type="checkbox" ${(Settings.autoStartOnUpdate === 1) ? ' checked="checked"' : ''} /> <label for="gmsAutoStartOnUpdate">${i18n('Boxes.GuildMemberStat.AutoStartOnUpdate')}</label></p>`);
		c.push(`<p class="text-left"><input id="gmsShowSearchbar" name="showsearchbar" value="1" type="checkbox" ${(Settings.showSearchbar === 1) ? ' checked="checked"' : ''} /> <label for="gmsShowSearchbar">${i18n('Boxes.GuildMemberStat.ShowSearchbar')}</label></p>`);
		c.push(`<hr><p class="text-left"><span class="settingtitle">${i18n('Boxes.GuildMemberStat.GuildMembers')}</span><input id="gmsShowDeletedMembers" name="showdeletedmembers" value="1" type="checkbox" ${(Settings.showDeletedMembers === 1) ? ' checked="checked"' : ''} /> <label for="gmsShowDeletedMembers">${i18n('Boxes.GuildMemberStat.ShowDeletedMembers')}</label></p>`);
		c.push(`<p class="text-left"><input id="gmsShowBattlesWon" name="showbattleswon" value="1" type="checkbox" ${(Settings.showBattlesWon === 1) ? ' checked="checked"' : ''} /> <label for="gmsShowBattlesWon">${i18n('Boxes.GuildMemberStat.ShowBattlesWon')}</label></p>`);
		c.push(`<p class="text-left"><input id="gmsShowZeroValues" name="showzerovalues" value="1" type="checkbox" ${(Settings.showZeroValues === 1) ? ' checked="checked"' : ''} /> <label for="gmsShowZeroValues">${i18n('Boxes.GuildMemberStat.ShowZeroValues')}</label></p>`);
		c.push(`<p class="text-left">${i18n('Boxes.GuildMemberStat.GexGbgDateFormat')} <select id="gmsGexGbgDateFormat" name="gexgbgdateformat">` +
			`<option value="week" ${Settings.gexgbgDateFormat === 'week' ? ' selected="selected"' : ''}>${i18n('Boxes.GuildMemberStat.CalendarWeek')}</option>` +
			`<option value="date" ${Settings.gexgbgDateFormat === 'date' ? ' selected="selected"' : ''}>${i18n('Boxes.GuildMemberStat.StartDate')}</option>` +
			`<option value="enddate" ${Settings.gexgbgDateFormat === 'enddate' ? ' selected="selected"' : ''}>${i18n('Boxes.GuildMemberStat.EndDate')}</option>` +
			`</select></p>`);
		c.push(`<p class="text-left">${i18n('Boxes.GuildMemberStat.DeleteExMembersAfter')} <select id="gmsDeleteOlderThan" name="deleteolderthan">`);

		deleteAfterDays.forEach(days => {
			let option = '';

			if (days === -1) { option = i18n('Boxes.GuildMemberStat.Instantly'); }
			else if (days === 0) { option = i18n('Boxes.GuildMemberStat.Never'); }
			else { option = days + ' ' + i18n('Boxes.GuildMemberStat.Days'); }

			c.push(`<option value="${days}" ${Settings.deleteOlderThan === days ? ' selected="selected"' : ''}>${option}</option>`);
		});

		c.push(`</select>`);
		c.push(`<p class="text-left">${i18n('Boxes.GuildMemberStat.ResetMessageCounter')} ` +
			`<select id="gmsResetMessageCounter" name="resetmessagecounter">`);
			c.push(`<option value="0">${i18n('Boxes.GuildMemberStat.ConfirmNo')}</option>`);
			c.push(`<option value="reset">${i18n('Boxes.GuildMemberStat.ConfirmYes')}</option>`);
		c.push(`</select></p>`);
		c.push(`<hr><p><button id="save-GuildMemberStat-settings" class="btn" style="width:100%" onclick="GuildMemberStat.SettingsSaveValues()">${i18n('Boxes.Investment.Overview.SettingsSave')}</button></p>`);
		c.push(`<hr><p class="text-left">${i18n('Boxes.General.Export')}: <button class="btn" onclick="GuildMemberStat.ExportContent('${GuildMemberStat.CurrentStatGroup}','csv')" title="${HTML.i18nTooltip(i18n('Boxes.General.ExportCSV'))}">CSV</button>`);
		c.push(`<button class="btn" onclick="GuildMemberStat.ExportContent('${GuildMemberStat.CurrentStatGroup}','json')" title="${HTML.i18nTooltip(i18n('Boxes.General.ExportJSON'))}">JSON</button></p>`);

		$('#GuildMemberStatSettingsBox').html(c.join(''));
	},


	SettingsSaveValues: async () => {

		let tmpDeleteOlder = parseInt($('#gmsDeleteOlderThan').val());
		let resetMessageCounter = $('#gmsResetMessageCounter').val();

		GuildMemberStat.Settings.showDeletedMembers = $("#gmsShowDeletedMembers").is(':checked') ? 1 : 0;
		GuildMemberStat.Settings.autoStartOnUpdate = $("#gmsAutoStartOnUpdate").is(':checked') ? 1 : 0;
		GuildMemberStat.Settings.showSearchbar = $("#gmsShowSearchbar").is(':checked') ? 1 : 0;
		GuildMemberStat.Settings.showBattlesWon = $("#gmsShowBattlesWon").is(':checked') ? 1 : 0;
		GuildMemberStat.Settings.showZeroValues = $("#gmsShowZeroValues").is(':checked') ? 1 : 0;
		GuildMemberStat.Settings.gexgbgDateFormat = $('#gmsGexGbgDateFormat').val() || 'week';

		if (GuildMemberStat.Settings.deleteOlderThan !== tmpDeleteOlder && (tmpDeleteOlder > 0 || tmpDeleteOlder === -1)) {
			helper.preloader.show('#GuildMemberStat');

			await GuildMemberStat.DeleteExMembersOlderThan(tmpDeleteOlder);
		}

		GuildMemberStat.Settings.deleteOlderThan = tmpDeleteOlder;

		localStorage.setItem('GuildMemberStatSettings', JSON.stringify(GuildMemberStat.Settings));

		if (resetMessageCounter === 'reset') {
			await GuildMemberStat.ResetMessageCounter();
		}

		$(`#GuildMemberStatSettingsBox`).fadeToggle('fast', function () {
			$(this).remove();

			if (GuildMemberStat.CurrentStatGroup === 'Member') 
				GuildMemberStat.Show();
		});
	},


	setEraGoods: (d) => {

		GuildMemberStat.TreasuryGoodsData = {};
		let eraGoodsTotals = {};

		for (let i in d) {
			if (d.hasOwnProperty(i)) {
				let era = GoodsData[i]['era'];
				let name = GoodsData[i]['name'];

				if (!(era in GuildMemberStat.TreasuryGoodsData)) {
					GuildMemberStat.TreasuryGoodsData[era] = [];
					eraGoodsTotals[era] = 0;
				}

				GuildMemberStat.TreasuryGoodsData[era].push({ good: i, name: name, value: d[i] });
				eraGoodsTotals[era] += d[i];
			}
		}

		GuildMemberStat.TreasuryGoodsData.updated = +MainParser.getCurrentDate();
		GuildMemberStat.TreasuryGoodsData.totals = eraGoodsTotals;

		localStorage.setItem('GuildMemberStatTreasuryGoods', JSON.stringify(GuildMemberStat.TreasuryGoodsData));

		if ($('#GuildMemberStatBody').length) {
			switch (GuildMemberStat.CurrentStatGroup) {
				case 'GuildGoods':
					GuildMemberStat.ShowGuildGoods();
					break;
				case 'Eras':
					GuildMemberStat.ShowGuildEras();
					break;
			}
		}

	},


	// helper functions
	uniq_array: (a) => {

		let seen = {};
		return a.filter(function (item) {
			return seen.hasOwnProperty(item) ? false : (seen[item] = true);
		});
	},


	remove_key_from_array: (arr, value) => {

		return arr.filter(function (ele) {
			return ele !== value;
		});
	},


	ExportContent: (filename, type) => {

		let content = GuildMemberStat.ExportData;
		let FileContent = '';

		for (let i = 0; i < content.length; i++) {
			let value = content[i];

			for (let j = 0; j < value.length; j++) {
				let innerValue = value[j] === null || value[j] === undefined ? '' : value[j].toString();
				let result = innerValue.replace(/"/g, '""');
				if (result.search(/("|,|\n)/g) >= 0)
					result = '"' + result + '"';
				if (j > 0)
					FileContent += ';';
				FileContent += result;
			}

			FileContent += '\r\n';
		}
		let BOM = "\uFEFF";

		if (type === 'json') {
			FileContent = GuildMemberStat.CsvToJson(FileContent);
		}

		let Blob1 = new Blob([BOM + FileContent], { type: "application/octet-binary;charset=ANSI" });
		MainParser.ExportFile(Blob1, filename + '-' + moment().format('YYYY-MM-DD') + '.' + type);

		$(`#GuildMemberStatSettingsBox`).fadeToggle('fast', function () {
			$(this).remove();
		});
	},


	CsvToJson: (csv) => {

		let lines = csv.split("\r\n");
		let result = [];
		let headers = lines[0].split(";");

		for (let i = 1; i < lines.length - 1; i++) {
			let obj = {};
			let currentline = lines[i].split(";");

			for (let j = 0; j < headers.length; j++)
			{
				obj[headers[j]] = currentline[j];
			}

			result.push(obj);
		}

		return JSON.stringify(result);
	},


	filterTable: (i, t) => {
		let input, filter, table, tr, td, cell;

		input = document.getElementById(i);
		filter = input.value.toUpperCase();
		table = document.getElementById(t);
		tr = table.getElementsByTagName("tr");

		if (input.value.length > 0)
			input.classList.add("highlight");
		else
			input.classList.remove("highlight");

		for (i = 1; i < tr.length; i++) {
			tr[i].style.display = "none";

			td = tr[i].getElementsByTagName("td");
			for (let j = 0; j < td.length; j++) {
				cell = tr[i].getElementsByTagName("td")[j];
				if (cell) {
					if (cell.innerHTML.toUpperCase().indexOf(filter) > -1) {
						tr[i].style.display = "";
						break;
					}
				}
			}
		}
	}
}