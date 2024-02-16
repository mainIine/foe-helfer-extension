/*
 * **************************************************************************************
 * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('CardGameService', 'all', (data, postData) => {
	
	if(!Settings.GetSetting('ShowEventChest')){
		return;
	}
	
	if (data.requestMethod=="getHealthOffers") {
		cardGame.healthShop={}
		let offers = [...data.responseData.healthOffers].sort((a,b) => a.amount-b.amount)
		for (h of offers) {
			let newhealth = (cardGame.health + h.amount) > cardGame.maxHealth ? cardGame.maxHealth : cardGame.health + h.amount;

			if (!cardGame.healthShop[newhealth]) cardGame.healthShop[newhealth] = h.cost.resources[cardGame.data[cardGame.context].mainResource];
		}
	}
	if (data.requestMethod=="buyCard") {
		cardGame.currencySpent.ability += cardGame.cardCost;
		cardGame.cardCost = data.responseData.cost.resources[cardGame.data[cardGame.context].mainResource];
		cardGame.freshbuys = data.responseData.buyOptions.filter(x=>!x.isAvailable).map(x=>x.card.id);
	}
	if (data.requestMethod=="redrawCard") {
		cardGame.cardOptions = data.responseData.handCardIds;
		cardGame.currencySpent.redraw += cardGame.redraw;
		cardGame.redraw = data.responseData.redrawCost.resources[cardGame.data[cardGame.context].mainResource];
		cardGame.card["nohighlight"]=true;
	}
	if (data.requestMethod=="getOverview") {
		cardGame.cardCost=0;
		cardGame.cards = data.responseData.cards;
		if (data.responseData.ongoingGame) {
			cardGame.nodes = data.responseData.ongoingGame.level.nodes;
			cardGame.health = data.responseData.ongoingGame.playerState.currentHealth;
			cardGame.maxHealth = data.responseData.ongoingGame.playerState.maxHealth;
			cardGame.cardsLeft = data.responseData.ongoingGame.playerState.drawPileCardIds;
			cardGame.card = {...cardGame.cards[data.responseData.ongoingGame.playerState.handCardIds[0]]};
			cardGame.level = Object.values(cardGame.nodes).filter(x => !!x.enemy).length;
			cardGame.isLastLevel = cardGame.nodes[data.responseData.ongoingGame.playerState.currentNodeId].nextNodeIds.length == 0;
			cardGame.enemy = cardGame.nodes[data.responseData.ongoingGame.playerState.currentNodeId].enemy;
			cardGame.redraw = data.responseData.ongoingGame.playerState.redrawCost.resources[cardGame.data[cardGame.context].mainResource];
		} else {
			cardGame.cardsLeft=[];
			cardGame.card={};
			cardGame.health=0;
			cardGame.enemy={};
			cardGame.nodes={};
			cardGame.isLastLevel=false;
		}
	}
	if (data.requestMethod=="startLevel") {
		cardGame.init();
		if (data.responseData.state) {
			cardGame.nodes = data.responseData.state.level.nodes;
			cardGame.health = data.responseData.state.playerState.currentHealth;
			cardGame.cardsLeft = data.responseData.state.playerState.drawPileCardIds;
			cardGame.card = {...cardGame.cards[data.responseData.state.playerState.handCardIds[0]]};
			cardGame.level = 1;
			cardGame.isLastLevel = cardGame.nodes[data.responseData.state.playerState.currentNodeId].nextNodeIds.length == 0;
			cardGame.enemy = cardGame.nodes[data.responseData.state.playerState.currentNodeId].enemy;
			cardGame.redraw = data.responseData.state.playerState.redrawCost.resources[cardGame.data[cardGame.context].mainResource];

		} else {
			cardGame.cardsLeft=[];
			cardGame.card={};
			cardGame.health=0;
			cardGame.enemy={};
			cardGame.nodes={};
			cardGame.isLastLevel=false;
		}
	}
	if (["useCard"].includes(data.requestMethod)) {
		if (data.responseData?.nodeUpdates?.length==2 || 
			(data.responseData?.nodeUpdates?.length==1 && data.responseData.playerState.state.value == "card_buying")) cardGame.level += 1;
	}
	if (["useCard","finishCardBuying"].includes(data.requestMethod)) {
		cardGame.isLastLevel = cardGame.nodes[data.responseData.playerState.currentNodeId].nextNodeIds.length == 0;
		if (data.responseData?.nodeUpdates?.length>0) cardGame.enemy = data.responseData.nodeUpdates[data.responseData.nodeUpdates.length-1].enemy;
		if (data.responseData?.playerState?.cardShop?.buyOptions) cardGame.showWarning(undefined);
		cardGame.health = data.responseData.playerState.currentHealth || 0;
		cardGame.cardsLeft = data.responseData.playerState.drawPileCardIds;
		cardGame.card = {...cardGame.cards[data.responseData.playerState.handCardIds[0]]};
		if (data.responseData.playerState.state.value == "card_buying") {
			cardGame.card.id="used";
			cardGame.enemy.card.cardFactionId = "replaced"
		}
		cardGame.cardCost=0;
		cardGame.freshbuys=[];
	}
	if (data.requestMethod=="selectRedrawnCard") {
		cardGame.health = data.responseData.currentHealth;
		cardGame.cardsLeft = data.responseData.drawPileCardIds;
		cardGame.card = {...cardGame.cards[data.responseData.handCardIds[0]]};
		cardGame.cardOptions = [];
		cardGame.redraw = data.responseData.redrawCost.resources[cardGame.data[cardGame.context].mainResource];
	}
	if (data.requestMethod=="buyHealthOffer") {
		cardGame.health = data.responseData.updatedPlayerHealth;
		cardGame.currencySpent.heal += cardGame.healthShop[cardGame.health];
	}
	
	if (["redrawCard","buyCard","getHealthOffers"].includes(data.requestMethod)) {
		cardGame.showWarning(undefined);
	}
	
	if (["getHealthOffers","buyCard"].includes(data.requestMethod)) {
		cardGame.showCardsList();
		return
	}

	if (cardGame.health!=0) {
		cardGame.checkHealth();
		cardGame.showCardsList();
	}
});


FoEproxy.addHandler('EventPassService', 'getPreview', (data, postData) => {
	if (["halloween_event","history_event"].includes(data.responseData.context)) cardGame.context = data.responseData.context;
});

FoEproxy.addHandler('RewardService', 'collectRewardSet', (data, postData) => {
	if(data.responseData.context != cardGame.context) return;
	for (let r of data.responseData.reward.rewards) {
		if (Object.keys(cardGame.rewardcount).includes(r.iconAssetName)) cardGame.rewardcount[r.iconAssetName] += r.amount;
	}
	cardGame.showCardsList();
});

let cardGame = {
	context:"history_event",
	cards:{},
	cardsLeft:[],
	card:{},
	health:0,
	enemy:{},
	nodes:{},
	redraw:5,
	level:0,
	isLastLevel:false,
	rewardcount:{},
	currencySpent: {},
	maxHealth:14,
	cardCost:0,
	cardOptions:[],
	freshbuys:[],
	data:{
		"halloween_event":{
			mainResource:"halloween_teeth",
			imgPath:{
				enemyDeck: "/shared/seasonalevents/halloween/event/halloween_card_enemy_deck_icon.png",
				playerHealth: "/shared/seasonalevents/halloween/event/halloween_card_player_health_icon.png",
				spentAbility: "/shared/seasonalevents/halloween/event/halloween_card_enemy_reward_card_icon.png",
				spentHealth: "/shared/seasonalevents/halloween/event/halloween_life_option_2.png",
				spentRedraw: "/shared/seasonalevents/halloween/event/halloween_card_enemy_reward_card_icon.png",
				cards:"/shared/seasonalevents/halloween/event/",
			}
		},
		"history_event":{
			mainResource:"history_coins",
			imgPath:{
				enemyDeck: "/shared/seasonalevents/history/event/history_card_enemy_deck_icon.png",
				playerHealth: "/shared/seasonalevents/history/event/history_card_player_health_icon.png",
				spentAbility: "/shared/seasonalevents/history/event/history_card_enemy_reward_card_icon.png",
				spentHealth: "/shared/seasonalevents/history/event/history_life_option_2.png",
				spentRedraw: "/shared/seasonalevents/history/event/history_card_enemy_reward_card_icon.png",
				cards:"/shared/seasonalevents/history/event/",
			}
		}
	},

	init:() => {
		cardGame.rewardcount= {
			halloween_bronze_key:0,
			halloween_silver_key:0,
			halloween_golden_key:0,
			history_bronze_key:0,
			history_silver_key:0,
			history_golden_key:0,

		};
		cardGame.currencySpent= {
			heal:0,
			ability:0,
			redraw:0,
		};
		cardGame.cardCost=0
	},

	showWarning: (warning) => {
		if (!warning) {
			setTimeout(() => {$('#cardGameFightBlocker').remove()},150);
			return;
		}
		if ($('#cardGameFightBlocker').length === 0) {
			let blocker = document.createElement("img");
			blocker.id = 'cardGameFightBlocker';
			blocker.src = srcLinks.get("/city/gui/great_building_bonus_icons/great_building_bonus_plunder_repel.png", true);
			blocker.title = warning;
			$('#game_body')[0].append(blocker);
			$('#cardGameFightBlocker').on("click",()=>{$('#cardGameFightBlocker').remove()});
		} 
	},
	
	checkHealth:()=> {
		let minHealth = cardGame.health
		let maxHealth = cardGame.health;

		if (cardGame.card.cardType.value == "ability") {
			for (a of cardGame.card.abilities){
				if (a.__class__=="CardGameModifyHealthAbility" && a.target.value=="self") {
					minHealth += a.minValue;
					maxHealth += a.maxValue;
				}
			}
		} else {
			minHealth += (cardGame.card.cardFactionId == cardGame.enemy.card.abilities[1]?.factionId ? cardGame.enemy.card.abilities[1].amount:0);
			maxHealth = minHealth + cardGame.enemy.card.abilities[0].maxValue;
			minHealth += cardGame.enemy.card.abilities[0].minValue;
		}

		let warning = maxHealth <= 0 ? i18n("Boxes.cardGame.WarningCertainDeath"): minHealth <= 0 ? i18n("Boxes.cardGame.WarningPossibleDeath"):undefined;
		if (cardGame.isLastLevel && warning) {
			let enemyHealth;
			if (cardGame.card.cardType.value == "ability") {
				for (a of cardGame.card.abilities){
					if (a.__class__=="CardGameOpponentSelfAttackAbility") {
						enemyHealth = cardGame.enemy.currentHealth + cardGame.enemy.card.abilities[0].maxValue * a.factor;
					}
				} 
			}	
			else {
				enemyHealth = cardGame.enemy.currentHealth + (cardGame.card.abilities[1]?.factionId == cardGame.enemy.card.cardFactionId ? cardGame.card.abilities[1].amount:0) + cardGame.card.abilities[0].maxValue;;
			}
			if (enemyHealth <=0) warning = undefined;
		}

		cardGame.showWarning(warning)
	},


    showCardsList: () => {
        
		// Don't create a new box while another one is still open
		if ($('#cardGameDialog').length === 0) {
			HTML.Box({
				id: 'cardGameDialog',
				title: 'Card Game',
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize : true,

			});
		}
		let dmg = {}
		let cards = cardGame.cardsLeft.concat(cardGame.freshbuys)
		cards = cardGame.card.id=="used" ? cards : cards.concat(cardGame.card.id);
		for (let c of cards) {
			if (!dmg[c]) {
				dmg[c]={}
			} else {
				continue
			}
			let card = cardGame.cards[c];
			dmg[c]["min"]=0;
			dmg[c]["max"]=0;
			if (card?.cardType?.value == "ability") {
				for (a of card.abilities){
					if (a.__class__=="CardGameOpponentSelfAttackAbility") {
						dmg[c]["min"] -= (cardGame.enemy.card.abilities[0].maxValue * a.factor);
						dmg[c]["max"] -= (cardGame.enemy.card.abilities[0].minValue * a.factor);
					}
					if (a.__class__=="CardGameModifyHealthAbility" && a.target.value=="opponent") {
						dmg[c]["min"] -= a.maxValue;
						dmg[c]["max"] -= a.minValue;
					}
					if (a.__class__=="CardGameModifyHealthPercentageAbility" && a.target.value=="opponent") {
						dmg[c]["min"] -= Math.round(cardGame.enemy.maxHealth * a.percentage/100);
						dmg[c]["max"] -= Math.round(cardGame.enemy.maxHealth * a.percentage/100);
					}
	
				}
			} else if (card?.cardType?.value == "attack"){
				dmg[c]["min"] -= card.abilities[0].maxValue + (cardGame.cards[c].abilities[1]?.factionId == cardGame.enemy.card.cardFactionId ? cardGame.cards[c].abilities[1].amount : 0);
				dmg[c]["max"] -= card.abilities[0].minValue + (cardGame.cards[c].abilities[1]?.factionId == cardGame.enemy.card.cardFactionId ? cardGame.cards[c].abilities[1].amount : 0);
			}
		}
		
		cards.sort((a,b) => dmg[a].max-dmg[b].max);
		cards.sort((a,b) => dmg[a].min-dmg[b].min);
		let data= cardGame.data[cardGame.context];
		let imgs=data.imgPath;

		let h=`</tr></table><table class="foe-table">`
		h +=`<tr><td style="text-align:center"><img style="height:40px" src=${srcLinks.get(imgs.enemyDeck,true)}>${cardGame.level}</td>`;
		h +=`<td style="text-align:center"><img style="height:40px" src=${srcLinks.get(imgs.playerHealth,true)}>${cardGame.health}</td>`;
		h +=`<td style="text-align:center"><img style="height:40px" src=${srcLinks.get("/shared/icons/reward_icons/reward_icon_"+data.mainResource+".png",true)}>${Object.values(cardGame.currencySpent).reduce((a, b) => a + b, 0)}</td>`;
		h +=`<td colspan="3" style="text-align:center">`;
		for (let r in cardGame.rewardcount) {
			if (!cardGame.rewardcount[r]) continue;
			if (!r.contains(cardGame.context.replace("_event",""))) continue;
			h += `<img style="height:40px" src="${srcLinks.get(`/shared/icons/reward_icons/reward_icon_${r}.png`,true)}">` + cardGame.rewardcount[r] + `&nbsp;&nbsp;`
		}
		let currency=`<img style="height:25px" src=${srcLinks.get("/shared/icons/reward_icons/reward_icon_"+data.mainResource+".png",true)}>`
		h +=`</tr><tr><td style="text-align:right"><img style="height:40px" src=${srcLinks.get(imgs.spentAbility,true)}></td style="text-align:left"><td>${cardGame.currencySpent.ability+currency}</td>`;
		h +=`<td style="text-align:right"><img style="height:40px" src=${srcLinks.get(imgs.spentHealth,true)}></td><td style="text-align:left">${cardGame.currencySpent.heal+currency}</td>`;
		h +=`<td style="text-align:right"><img style="height:30px" src="${srcLinks.get(imgs.spentRedraw,true)}"><img style="margin-left: -20px;height: 19px;margin-top: 10px;" src="${srcLinks.get("/shared/gui/pvp_arena/hud/pvp_arena_icon_refresh.png",true)}"></td><td style="text-align:left">${cardGame.currencySpent.redraw+currency}</td>`;
		h +=`</tr></table><table class="foe-table">`;
		h +=`<tr><th></th><th>${i18n('Boxes.cardGame.Attack')}</th><th>${i18n('Boxes.cardGame.Bonus')}</th></tr>`;
		for (let c of cards) {
			h+=`<tr ${cardGame.cardOptions.includes(c) ? 'class="highlightOptions"': (c == cardGame.card.id && !cardGame.card.nohighlight) ? 'class="highlight"':""}>`;
			h+=`<td title="${cardGame.cards[c].description}">`;
			h+=`<div class="cardtop ${cardGame.cards[c].cardFactionId == cardGame.enemy.card.abilities[1]?.factionId ? 'highlightWeak':""}" style="background-image:url('${srcLinks.get(imgs.cards+cardGame.cards[c].assetName+".png",true)}')"></div></td>`;
			let highlight=`class="cardattack" style="background-image:url('${srcLinks.get(imgs.cards+cardGame.cards[c].assetName+".png",true)}')"`
			h+=`<td><div ${highlight}>${cardGame.cards[c]?.cardType?.value=="ability" ? dmg[c]["min"] + (dmg[c]["max"] > dmg[c]["min"] ? ((dmg[c].min+""+dmg[c].max).length>2?"-":" - ") + dmg[c]["max"]:"") : (-cardGame.cards[c].abilities[0].maxValue) + " - " + (-cardGame.cards[c].abilities[0].minValue)}</div></td>`;
			highlight="";
			if (cardGame.cards[c]?.cardType?.value!="ability" && cardGame.cards[c].abilities?.[1]?.factionId) {
				highlight = `class="cardbonus ${(cardGame.cards[c].abilities[1]?.factionId == cardGame.enemy.card.cardFactionId) ? 'highlightStrong':""}" style="background-image:url('${srcLinks.get(imgs.cards+cardGame.cards[c].assetName+".png",true)}')"`
			}
			h+=`<td><div ${highlight}>${highlight!="" ? -cardGame.cards[c].abilities[1].amount:""}</div></td>`;
			h+=`</tr>`;
		}
		h+='</table>';

		$('#cardGameDialogBody').html(h);
	},
}
cardGame.init();
HTML.AddCssFile('cardgame');