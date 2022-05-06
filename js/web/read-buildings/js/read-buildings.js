/*
 * **************************************************************************************
 *
 * Dateiname:                 read-buildings.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 14:31 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */


// https://foede.innogamescdn.com/start/metadata?id=city_entities-xxxxxxx

// nicht plünderbare Gebäude
let maxpf = 0;
let RessourceHint = '';
let namemaxpf;
let FirstTime = 1;


let BlackListBuildingsArray = [
	'R_MultiAge_CulturalBuilding6b', // Königliches Badehaus lvl2
	'R_MultiAge_CulturalBuilding6c', // Königliches Badehaus lvl3
	'R_MultiAge_CulturalBuilding6d', // Königliches Badehaus lvl4
	'R_MultiAge_CulturalBuilding6e', // Königliches Badehaus lvl5
	'R_MultiAge_CulturalBuilding6f', // Königliches Badehaus lvl6
];

let BlackListBuildingsString = [
	'R_MultiAge_SummerBonus19', //Großer Leuchtturm
	'R_MultiAge_Battlegrounds1', //Ehrenstatue
	'R_MultiAge_SummerBonus21', //Repaire du pirate
	'R_MultiAge_PatrickBonus21', //Temple des druides
];

// grau darzustellende Produktionen
let UnimportantProds = [
	'supplies', // Vorräte
	'money'     // Münzen
];

FoEproxy.addHandler('ArmyUnitManagementService', 'getArmyInfo', (data, postData) => {
	$('#ResultBox').remove();
});


/**
 *
 * @type {{data: {}, CityEntities: [], ShowFunction: Reader.ShowFunction, OtherPlayersBuildings: Reader.OtherPlayersBuildings, player_name: string, showResult: Reader.showResult}}
 */
let Reader = {

	data: {},
	player_name: '',
	CityEntities: [],
	ArmyBoosts: [],
	Plunder_Repel: '',
	IsPlunderable: false,
	IsGuildMember: false,
	PlayerEra:'',
	
	/**
	 * Die Gebäude ermitteln
	 *
	 * @param dp
	 */
	OtherPlayersBuildings: (dp, IsPlunderable) => {

		Reader.data = {
			ready: [],
			work: []
		};

		maxpf = 0;
		RessourceHint = '';
		Reader.Plunder_Repel = '';

		//To be enabled again when set up connection with website
		if (FirstTime) 
		{
			FirstTime = 0;
			MainParser.SendBuildings(MainParser.CityMapData);
		}
 

		Reader.IsPlunderable = IsPlunderable;
		const Http = new XMLHttpRequest();
		

		// Werte des letzten Nachbarn löschen
		CityMap.CityData = null;

		Reader.player_name = dp['other_player']['name'];
		Reader.PlayerEra = dp['other_player']['era'];
		Reader.IsGuildMember = dp['other_player']['is_guild_member'];
		_ID = dp['other_player']['player_id'];
		_Portrait = dp['other_player']['avatar'];
		if (dp['other_player']['clan'] !== undefined) _Guild = dp['other_player']['clan']['name']; else _Guild = "";
		_Rank = dp['other_player']['rank'];
		_Score = dp['other_player']['score'];
		
		let player = [];
		let info = {
			ID: 		_ID,
			Portrait:	_Portrait,
			Name:		Reader.player_name,
			Guild:		_Guild,
			Era:		Reader.PlayerEra,
			Rank:		_Rank,
			Score:		_Score,
		};

		player.push(info);
		
		$('#ResultBox').remove();

		let d = dp['city_map']['entities'];

        Reader.CityEntities = d;    
		let BoostDict = [];
		let Batiments = [];

        for (let i in d) 
		{

			if (d.hasOwnProperty(i)) {
				let id = d[i]['cityentity_id'];
			    let BuildingData = MainParser.CityEntities[id];

				Type = d[i]['type'];
				
				if (/*( Type !== 'street' ) && */( Reader.IsGuildMember )) 
				{
					PlayerID = d[i]['player_id'];
					EreNumerique = d[i]['level'] + 1;
					if ( EreNumerique < 10 ) EreNumerique = "0" + EreNumerique;
					Era = EreNumerique + " - " + i18n('Eras.' + ( d[i]['level'] + 1) );
					Name = BuildingData.name;
										
					if ( Type === 'greatbuilding' ) {
						Era = 'N/A';
						Name = Name + ' - Niv. ' + ( d[i]['level'] + 1);
					}

					let Batiment = { 	'CityEntity': id,
										'Name': Name,
										'Type': Type,
										'Era': Era};
					Batiments.push ( Batiment );	 
					
				}

				
				if (d[i]['bonus'] !== undefined) 
				{
					let BoostType = d[i]['bonus']['type'];
					let BoostValue = d[i]['bonus']['value'];
					if (BoostType !== undefined && BoostValue !== undefined) 
					{
						if ( BoostType.indexOf ('plunder_repel', 0 ) !== -1 ) 
							Reader.Plunder_Repel = 
								"<span style='font-size:25px'>Galata boost : <b>" + 
								(( BoostValue > 30 ) ? "<FONT COLOR='#ff0000'>" : "") + 
								BoostValue + "%</b>" + 
								(( BoostValue > 30 ) ? "</FONT>" : "") + 
								", <b>" +
								(( d[i]['bonus']['amount'] > 0 ) ? "<FONT COLOR='#ff0000'>" : "") + 
								+ d[i]['bonus']['amount'] + 
								(( d[i]['bonus']['amount'] > 0 ) ? "</FONT>" : "") +
								" </b>charges</span>"; 
							
						BoostDict[BoostType] |= 0;
						BoostDict[BoostType] += BoostValue;
						
						
					}
				}
			
			

				if (d[i]['state'] !== undefined && d[i]['state']['__class__'] !== 'ConstructionState' && d[i]['state']['__class__'] !== 'UnconnectedState') 
				{
					if (BuildingData['abilities'] !== undefined) 
					{
						for (let ability in BuildingData['abilities']) 
						{
							if (!BuildingData['abilities'].hasOwnProperty(ability)) continue;
								let CurrentAbility = BuildingData['abilities'][ability];
							if (CurrentAbility['boostHints'] !== undefined) 
							{
								for (let boostHint in CurrentAbility['boostHints']) 
								{
									if (!CurrentAbility['boostHints'].hasOwnProperty(boostHint)) continue;

									let CurrentBoostHint = CurrentAbility['boostHints'][boostHint];
									Reader.HandleBoostEraMap(BoostDict, CurrentBoostHint['boostHintEraMap'], d[i]);
								}
							}

							if (CurrentAbility['bonuses'] !== undefined) 
							{
								for (let bonus in CurrentAbility['bonuses']) 
								{
									if (!CurrentAbility['bonuses'].hasOwnProperty(bonus)) continue;

									let CurrentBonus = CurrentAbility['bonuses'][bonus];
									Reader.HandleBoostEraMap(BoostDict, CurrentBonus['boost'], d[i]);
								}
							}

							if (CurrentAbility['bonusGiven'] !== undefined) 
							{
								let CurrentBonus = CurrentAbility['bonusGiven'];
								Reader.HandleBoostEraMap(BoostDict, CurrentBonus['boost'], d[i]);
							}
						}
					}
				}	
		 
				if (BlackListBuildingsArray.includes(id) === false && BlackListBuildingsString.indexOf(id.substring(0, id.length-1)) === -1) 
				{
					if (d[i]['state'] !== undefined && d[i]['state']['current_product'] !== undefined) 
					{
						let motivation = false
						
						if ( d[i]['state']['is_motivated'] != undefined )
						{						
								motivation = d[i]['state']['is_motivated']
						}
							
						if (d[i]['type'] === 'goods') 
						{
							GoodsParser.readType(d[i], "Pillage", Reader.IsGuildMember );
						}
						else if ((d[i]['type'] === 'residential' || d[i]['type'] === 'production' || d[i]['type'] === 'clan_power_production') && motivation === false) 
						{
							GoodsParser.readType(d[i], "Pillage", Reader.IsGuildMember);
						}	
					}
				}
				else
					if (BuildingData.name.indexOf("Statue d'",0) !==-1 )
					{
						GoodsParser.readType(d[i], "Statue", Reader.IsGuildMember);
					}
			}
		}

		Reader.ArmyBoosts = Unit.GetBoostSums(BoostDict);

		Reader.showResult();
		
	},


	/**
	 * Boosts aus einer Era Map suchen und das BoostDict aktualisieren
	 * */
	HandleBoostEraMap: (BoostDict, BoostEraMap, Building) => {
		if (BoostEraMap === undefined) return;

		for (let EraName in BoostEraMap) {
			if (!BoostEraMap.hasOwnProperty(EraName)) continue;

			let EraBoosts = BoostEraMap[EraName];
			let BuildingEraName = Building['level'] !== undefined ? Technologies.EraNames[Building['level'] + 1] : undefined;

			if (EraName === 'AllAge' || EraName === BuildingEraName) {
				let BoostType = EraBoosts['type'];
				let BoostValue = EraBoosts['value'];

				if (BoostType !== undefined && BoostValue !== undefined) {
					BoostDict[BoostType] |= 0;
					BoostDict[BoostType] += BoostValue;
					//if (BoostType === 'att_boost_attacker' || BoostType === 'military_boost' || BoostType === 'advanced_tactics') {
					//	console.log(BuildingNamesi18n[Building['cityentity_id']].name + ' ' + BoostType + '_ ' + BoostValue + '%');
					//}
				}
			}
		}
    },


	/**
	 *  HTML Box anzeigen
	 */
	showResult: () => {
		// let d = helper.arr.multisort(Reader.data, ['name'], ['ASC']);
		let rd = helper.arr.multisort(Reader.data.ready, ['name'], ['ASC']);
		rd = helper.arr.multisort(rd, ['isImportant'], ['DESC']);
		
		let wk = helper.arr.multisort(Reader.data.work, ['name'], ['ASC']);
		wk = helper.arr.multisort(wk, ['isImportant'], ['DESC']);
		
	    const Http = new XMLHttpRequest();

		// Wenn die Box noch nicht da ist, neu erzeugen und in den DOM packen
		if ($('#ResultBox').length === 0) {
			HTML.Box({
				'id': 'ResultBox',
				'title': '<em>' + Reader.player_name + '</em>',
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			});

			// CSS in den DOM prügeln
			HTML.AddCssFile('read-buildings');
		}
		
		let div = $('#ResultBox'),
			h = [];
        const boosts = Reader.ArmyBoosts;
		const Repel = Reader.Plunder_Repel;
		
        h.push(`
<div style="margin: 3px 5px">
${HTML.i18nReplacer(i18n('Boxes.Neighbors.AttackingArmy'), {
   attatt: `<b>${boosts.AttackAttackBoost}</b>`,
   attdef: `<b>${boosts.AttackDefenseBoost}</b>`
})}
<br />
${HTML.i18nReplacer(i18n('Boxes.Neighbors.DefendingArmy'), {
    defatt: `<b>${boosts.DefenseAttackBoost}</b>`,
    defdef: `<b>${boosts.DefenseDefenseBoost}</b>`})}
<br>
${Repel}
</div>
`)

		if ( ( Reader.IsPlunderable) || ( Reader.IsGuildMember )) {
			if (rd.length > 0) {
				h.push('<table class="foe-table" style="margin-bottom: 15px">');

				h.push('<thead>');

				h.push('<tr>');
				h.push('<th colspan="3"><strong>' + 'Productions' + ((maxpf !==0) ? ((maxpf > 2)?' <FONT COLOR="#ff0000">':' <FONT COLOR="#008000">') + ' - MAXPF = ' + maxpf + ((maxpf>2)? ' - ' + namemaxpf : '') + '</FONT>':'') + '</strong></th>');
				if ( RessourceHint !== '' ) h.push ( '<th colspan="3"><center><strong><FONT COLOR="'+RessourceHint+'">Ressources</FONT></strong></center></th>');
				h.push('</tr>');

				h.push('</thead>');
				h.push('<tbody>');

				for (let i in rd) {
					if (rd.hasOwnProperty(i)) {
						h.push('<tr class="success">');
						h.push('<td title="' + rd[i]['asset_id'] + '">' + rd[i]['name'] + '</td>');
						h.push('<td>' + rd[i]['amount'] + '</td>');
						h.push('<td><span class="show-entity" data-id="' + rd[i]['id'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/open-eye.png"></span></td>');
						h.push('</tr>');
						
						if ( rd[i].name.indexOf("Statue d'",0) !== -1)
						{
						}
					}
				}

				h.push('</tbody>');
				h.push('</table>');
			}

			if (wk.length > 0) {

				h.push('<table class="foe-table">');

				h.push('<thead>');

				h.push('<tr>');
				h.push('<th colspan="3"><strong>' + i18n('Boxes.Neighbors.OngoingProductions') + '</strong></th>');
				h.push('</tr>');

				h.push('</thead>');
				h.push('<tbody>');

				for (let i in wk) {
					if (wk.hasOwnProperty(i)) {
						h.push('<tr>');
						h.push('<td>' + wk[i]['name'] + '</td>');
						h.push('<td>' + wk[i]['amount'] + '</td>');
						h.push('<td><span class="show-entity" data-id="' + wk[i]['id'] + '"><img class="game-cursor" src="' + extUrl + 'css/images/open-eye.png"></span></td>');
						h.push('</tr>');
					}
				}

				h.push('</tbody>');
				h.push('</table>');
			}
		}
		
		div.find('#ResultBoxBody').html(h.join(''));
		div.show();

		// Ein Gebäude soll auf der Karte dargestellt werden
		$('body').on('click', '.foe-table .show-entity', function () {
			Reader.ShowFunction($(this).data('id'));
		});
	},


	/**
	 * Zeigt pulsierend ein Gebäude auf der Map
	 *
	 * @param id
	 */
	ShowFunction: (id) => {

		let h = CityMap.hashCode(Reader.player_name);

		// CSS in den DOM prügeln
		HTML.AddCssFile('citymap');

		if ($('#map' + h).length < 1) {
			CityMap.init(Reader.CityEntities, Reader.player_name);
		}

		$('[data-entityid]').removeClass('pulsate');

		setTimeout(() => {
			let target = $('[data-entityid="' + id + '"]');

			$('#map-container').scrollTo(target, 800, {offset: {left: -280, top: -280}, easing: 'swing'});

			target.addClass('pulsate');
		}, 200);
	}
};


/**
 *
 * @type {
 * 		{
 * 		emptyGoods: GoodsParser.emptyGoods,
 * 		bazaarBuilding: GoodsParser.bazaarBuilding,
 * 		sumGoods: (function(*): number),
 * 		readType: GoodsParser.readType,
 * 		getProducts: (function(*): {amount: (string), state: boolean, isImportant: boolean})
 * 		}
 * 	}
 */
let GoodsParser = {

	/**
	 * Ist es ein Produkt das man "mitzählen" kann?
	 *
	 * @param d
	 */

	readType: (d, t, isGuildMember)=> {


		// Ruhmeshallen ausgrenzen
		/*
		if(d['state']['current_product']['asset_name'] !== undefined && d['state']['current_product']['asset_name'].indexOf('bazaar_') > -1){
			GoodsParser.bazaarBuilding(d);
		}
		*/

		// produziert nix
		//else
		if ( (d['state']['current_product'] === undefined) || ( t === "Statue" ) || ( isGuildMember === true ) ) {
			if ( (t !== "Statue" ) && ( isGuildMember === false ))
			{
				GoodsParser.emptyGoods(d); 
			}			
			else if ( ( isGuildMember === true ) && (t === "Statue" ) ) //C'est un ami ou un guildou
			{
				name = MainParser.CityEntities[d['cityentity_id']]['name'];
				EreNumerique = d['level'] + 1;
				if ( EreNumerique < 10 ) EreNumerique = "0" + EreNumerique;
				Ere = EreNumerique + " - " + i18n('Eras.' + ( d['level'] + 1) );

				let entryStatue = {
					name: name,
					amount: Ere,
					state: 'finished',
					id: d['id'],
					isImportant: true,
					asset_id: d['cityentity_id']
				};
				
				Reader.data.ready.push(entryStatue);
			}
			
		}

		// alle anderen
		else {

			let p = GoodsParser.getProducts(d);

			if(p['amount'] !== undefined){
				let entry = {
					name: MainParser.CityEntities[d['cityentity_id']]['name'],
					amount: p['amount'],
					state: p['state'],
					id: d['id'],
					isImportant: p['isImportant'],
					asset_id: d['cityentity_id']
				};
				
				if ( ( p['isImportant'] === false ) || ( isGuildMember === true ) ) {
					entry.name = '<spark style="color:grey;">' + MainParser.CityEntities[d['cityentity_id']]['name'] + '</spark>';
					entry.amount = '<spark style="color:grey;">' + p['amount'] + '</spark>';
				}

				if( entry['state'] === true ){
					Reader.data.ready.push(entry);
				} else {
					Reader.data.work.push(entry);
				}
			}
		}
	},


	/**
	 * ermittelt die Produktart
	 *
	 * @param d
	 * @returns {{amount: number, name: (*|string), state: boolean, isImportant: boolean}}
	 */
	getProducts: (d) => {



		let amount,
			state = d['state']['__class__'] === 'ProductionFinishedState',
			isImportant = false
		let g = [];

		let a;

		namepf = MainParser.CityEntities[d['cityentity_id']]['name'];
		//i18n[d['cityentity_id']];

		if (d['state']['current_product']['product'] !== undefined && d['state']['current_product']['product']['resources'] !== undefined) {
			a = d['state']['current_product']['product']['resources'];

			for (let k in a) {
				if (a.hasOwnProperty(k)) {
					if (!isImportant)
						isImportant = !UnimportantProds.includes(k);

					if (k === 'strategy_points') {
						g.push('<strong>' + ((a[k]>2)?'<FONT COLOR="#ff0000">':'') + a[k] + ' ' + GoodsData[k]['name'] + ((a[k]>2)?'</FONT>':'') + '</strong>');
						if ( a[k] > maxpf ) {
							maxpf = a[k];
							namemaxpf = namepf;
						}

					} else {
						if (isImportant)
						{	

							PrefixRes = '';
							SuffixRes = '';
							if ( ( GoodsData[k]['era'] !== 'NoAge' ) && ( GoodsData[k]['era'] !== 'AllAge' ) && ( a[k] >= 30 ) ) {
								PrefixRes = '<strong><FONT COLOR="#318ce7">';
								SuffixRes = '</FONT></strong>';
								RessourceHint = '#318ce7';
							}
							if ( ( GoodsData[k]['era'] === Technologies.EraNames[CurrentEraID] ) && ( a[k] >= 10 ) ) {
								PrefixRes = '<strong><FONT COLOR="#ff0000">';
								SuffixRes = '</FONT></strong>';
								RessourceHint = '#ff0000';
							}
							if ( ( GoodsData[k]['era'] === Technologies.EraNames[CurrentEraID-1] ) && ( a[k] >= 10 ) ) {
								PrefixRes = '<strong><FONT COLOR="#ffa500">';
								SuffixRes = '</FONT></strong>';
								RessourceHint = '#ffa500';
							}

							g.push(PrefixRes + a[k] + ' ' + GoodsData[k]['name'] + ' (' + (ResourceStock[k] !== undefined && ResourceStock[k] !== 0 ? HTML.Format(ResourceStock[k]) : 0) + ')' + SuffixRes);
						}
						else
							g.push(a[k] + ' ' + GoodsData[k]['name']);
					}
				}
			}
		}

		if (d['state']['current_product']['clan_power'] !== undefined) {
			isImportant = true;
			g.push(d['state']['current_product']['clan_power'] + ' ' + i18n('Boxes.Neighbors.GuildPower'));
		}

		amount = g.join('<br>');
		
		return {
			amount: amount,
			state: state,
			isImportant: isImportant
		};
	},


	/**
	 * Gebäude mit "GuildPower"
	 *
	 * @param d
	 */
	bazaarBuilding: (d)=> {

		let entry = {
			name: d['state']['current_product']['name'],
			amount: d['state']['current_product']['clan_power'] + ' ' + d['state']['current_product']['name'],
			state: d['state']['__class__'] === 'ProductionFinishedState'
		};

		if( entry['state'] === true ){
			Reader.data.ready.push(entry);
		} else {
			Reader.data.work.push(entry);
		}
	},

	/**
	 * Güter oder ggf. FPs zusammenrechnen
	 *
	 * @param d
	 * @returns {number}
	 */
	sumGoods: (d)=> {

		let sum = 0;

		for( let el in d ) {
			if( d.hasOwnProperty(el) ) {
				sum += parseFloat( d[el] );
			}
		}

		return sum;
	},

	/**
	 * Fertiges Array wenn nix drin ist
	 *
	 * @param d
	 */
	emptyGoods: (d)=> {
			let data = {
			name: MainParser.CityEntities[d['cityentity_id']]['name'],
			fp: '-',
			product: 'unbenutzt',
			// cords: {x: d[i]['x'], y: d[i]['y']}
		};

		Reader.data.work.push(data);
	}

};