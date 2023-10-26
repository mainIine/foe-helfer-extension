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
	
	if (["redrawCard","buyCard","getHealthOffers"].includes(data.requestMethod)) {
		cardGame.showWarning(undefined)
		return
	}
	if (data.requestMethod=="getOverview") {
		cardGame.cards = data.responseData.cards;
		if (data.responseData.ongoingGame) {
			cardGame.nodes = data.responseData.ongoingGame.level.nodes;
			cardGame.health = data.responseData.ongoingGame.playerState.currentHealth;
			cardGame.cardsLeft = data.responseData.ongoingGame.playerState.drawPileCardIds;
			cardGame.card = cardGame.cards[data.responseData.ongoingGame.playerState.handCardIds[0]];
			cardGame.isLastLevel = cardGame.nodes[data.responseData.ongoingGame.playerState.currentNodeId].nextNodeIds.length == 0;
			cardGame.enemy = cardGame.nodes[data.responseData.ongoingGame.playerState.currentNodeId].enemy;
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
		if (data.responseData.state) {
			cardGame.nodes = data.responseData.state.level.nodes;
			cardGame.health = data.responseData.state.playerState.currentHealth;
			cardGame.cardsLeft = data.responseData.state.playerState.drawPileCardIds;
			cardGame.card = cardGame.cards[data.responseData.state.playerState.handCardIds[0]];
			cardGame.isLastLevel = cardGame.nodes[data.responseData.state.playerState.currentNodeId].nextNodeIds.length == 0;
			cardGame.enemy = cardGame.nodes[data.responseData.state.playerState.currentNodeId].enemy;
		} else {
			cardGame.cardsLeft=[];
			cardGame.card={};
			cardGame.health=0;
			cardGame.enemy={};
			cardGame.nodes={};
			cardGame.isLastLevel=false;
		}
	}
	
	if (["useCard","finishCardBuying"].includes(data.requestMethod)) {
		cardGame.isLastLevel = cardGame.nodes[data.responseData.playerState.currentNodeId].nextNodeIds.length == 0;
		if(data.responseData?.nodeUpdates?.length>0) cardGame.enemy = data.responseData.nodeUpdates[data.responseData.nodeUpdates.length-1].enemy;
		if (data.responseData?.playerState?.cardShop?.buyOptions) cardGame.showWarning(undefined);
		cardGame.health = data.responseData.playerState.currentHealth;
		cardGame.cardsLeft = data.responseData.playerState.drawPileCardIds;
		cardGame.card = cardGame.cards[data.responseData.playerState.handCardIds[0]];
	}
	if (data.requestMethod=="selectRedrawnCard") {
		cardGame.health = data.responseData.currentHealth;
		cardGame.cardsLeft = data.responseData.drawPileCardIds;
		cardGame.card = cardGame.cards[data.responseData.handCardIds[0]];
	}
	if (data.requestMethod=="buyHealthOffer") {
		cardGame.health = data.responseData.updatedPlayerHealth;
	}

	if (cardGame.health!=0) {
		cardGame.checkHealth();
		cardGame.showCardsList();
	}

	
	
});


FoEproxy.addHandler('CardGameService', 'selectRedrawnCard', (data, postData) => {
	if(!Settings.GetSetting('ShowEventChest')){
		return;
	}	
});

FoEproxy.addHandler('CardGameService', 'selectRedrawnCard', (data, postData) => {
	if(!Settings.GetSetting('ShowEventChest')){
		return;
	}	
	cardGame.health = data.responseData.currentHealth;
	cardGame.cardsLeft = data.responseData.drawPileCardIds;
	cardGame.card = cardGame.cards[data.responseData.handCardIds[0]];
});

let cardGame = {
	cards:{},
	cardsLeft:[],
	card:{},
	health:0,
	enemy:{},
	nodes:{},
	isLastLevel:false,

	showWarning: (warning) => {
		if (!warning) {
			$('#cardGameFightBlocker').remove();
			return;
		}
		if ($('#cardGameFightBlocker').length === 0) {
			let blocker = document.createElement("img");
			blocker.id = 'cardGameFightBlocker';
			//blocker.classList = cardGame.event;
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
			minHealth += (cardGame.card.cardFactionId == cardGame.enemy.card.abilities[1].factionId ? cardGame.enemy.card.abilities[1].amount:0);
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
				enemyHealth = cardGame.enemy.currentHealth + (cardGame.card.abilities[1].factionId == cardGame.enemy.card.cardFactionId ? cardGame.card.abilities[1].amount:0) + cardGame.card.abilities[0].maxValue;;
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
				//ask: i18n('Boxes.cardGame.HelpLink'),
				//settings: 'cardGame.ShowSettingsButton()'
			});
		}

		let cards = cardGame.cardsLeft.concat(cardGame.card.id).sort((a,b) => cardGame.avgDmg(cardGame.cards[a])-cardGame.avgDmg(cardGame.cards[b]))
		
		let h='<table class="foe-table">';
		h +=`<tr><th></th><th>${i18n('Boxes.cardGame.Attack')}</th><th>${i18n('Boxes.cardGame.Bonus')}</th></tr>`
		for (c of cards) {
			h+=`<tr ${c == cardGame.card.id ? 'class="highlight"':""}>`
			h+=`<td title="${cardGame.cards[c].description}" ${cardGame.cards[c].cardFactionId == cardGame.enemy.card.abilities[1].factionId ? 'class="highlightWeak"':""}><img class="cardtop" src="${srcLinks.get("/shared/seasonalevents/halloween/event/"+cardGame.cards[c].assetName+".png",true)}"></td>`;
			let img=`<img class="cardattack" src="${srcLinks.get("/shared/seasonalevents/halloween/event/"+cardGame.cards[c].assetName+".png",true)}">`
			h+=`<td>${img}${cardGame.cards[c]?.cardType?.value=="ability" ? cardGame.avgDmg(cardGame.cards[c]) : (-cardGame.cards[c].abilities[0].maxValue) + " - " + (-cardGame.cards[c].abilities[0].minValue)}</td>`;
			img="";
			if (cardGame.cards[c]?.cardType?.value!="ability" && cardGame.cards[c].abilities?.[1]?.factionId) {
				img = `<img class="cardbonus" src="${srcLinks.get("/shared/seasonalevents/halloween/event/"+cardGame.cards[c].assetName+".png",true)}">`
			}
			h+=`<td ${(img != "" && cardGame.cards[c].abilities[1].factionId == cardGame.enemy.card.cardFactionId) ? 'class="highlightStrong"':""}>${img}${img!="" ? -cardGame.cards[c].abilities[1].amount:""}</td></tr>`;
		}
		h+='</table>';
		$('#cardGameDialogBody').html(h);
	},
	avgDmg:(card)=>{
		let dmg=0;
		if (card?.cardType?.value == "ability") {
			for (a of card.abilities){
				if (a.__class__=="CardGameOpponentSelfAttackAbility") {
					dmg -= (cardGame.enemy.card.abilities[0].maxValue+cardGame.enemy.card.abilities[0].minValue)/2 * a.factor;
				}
				if (a.__class__=="CardGameModifyHealthAbility" && a.target.value=="opponent") {
					dmg -= (a.maxValue+a.minValue)/2;
				}
				if (a.__class__=="CardGameModifyHealthPercentageAbility" && a.target.value=="opponent") {
					dmg -= Math.round(cardGame.enemy.maxHealth * a.percentage/100);
				}

			}
		} else if (card?.cardType?.value == "attack"){
			dmg = -(card.abilities[0].minValue+card.abilities[0].maxValue)/2;
		}
		return dmg;
	}
}
HTML.AddCssFile('cardgame');