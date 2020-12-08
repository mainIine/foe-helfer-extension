/*
 * **************************************************************************************
 *
 * Dateiname:                 unit.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 14:30 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

// Army types
FoEproxy.addMetaHandler('unit_types', (xhr, postData) => {
	Unit.Types = JSON.parse(xhr.responseText);
});

FoEproxy.addHandler('ArmyUnitManagementService', 'getArmyInfo', (data, postData) => {
	Unit.RefreshAlca();

	Unit.Cache = data.responseData;

	if ($('#unit-Btn').hasClass('hud-btn-red')) {
		$('#unit-Btn').removeClass('hud-btn-red');
		$('#unit-Btn-closed').remove();
	}

	if ($('#UnitOverview').length > 0) {
		Unit.BuildBox();
	}
});

FoEproxy.addHandler('CityProductionService', 'pickupProduction', (data, postData) => {
	Unit.RefreshAlca();

	if (Unit.alca && postData && postData[0] && postData[0]['requestData'] && postData[0]['requestData'][0] && postData[0]['requestData'][0][0] === Unit.alca.id) {
		if (data.responseData.militaryProducts === undefined) {
			return;
		}

		if (data.responseData['updatedEntities'] && data.responseData['updatedEntities'][0] && data.responseData['updatedEntities'][0]['state'] && data.responseData['updatedEntities'][0]['state']['next_state_transition_in'] !== undefined) {
			Unit.NextHarvest = data.responseData['updatedEntities'][0]['state']['next_state_transition_at'];
			Unit.NextAmount = data.responseData['updatedEntities'][0]['state']['current_product']['amount'];
		}

		if (data.responseData.militaryProducts.length > 0) {
			localStorage.setItem('LastAlcatrazUnits', JSON.stringify(data.responseData.militaryProducts));
		}
	}
});

let Unit = {

	Types: null,
	Attack : null,
	Defense: null,
	alca : undefined,

	Cache : null,

	NextHarvest: null,
	NextAmount: null,

	Tabs: [],
	TabsContent: [],


	/**
	 * Erstellt eine HTML Box für den DOM
	 *
	 */
	Show: ()=> {

		if ($('#UnitOverview').length === 0) {
			let args = {
				'id': 'UnitOverview',
				'title': i18n('Boxes.Units.Title'),
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			};

			HTML.Box(args);
			moment.locale(i18n('Local'));

			// CSS in den DOM prügeln
			HTML.AddCssFile('unit');

		} else {
			HTML.CloseOpenBox('UnitOverview');
		}

		Unit.BuildBox();
	},


	/**
	 * Rendern und in den BoxContent
	 */
	BuildBox:()=> {

		let top = [],
			text = '';

		Unit.RefreshAlca();

		// der Spieler besitzt ein Alca
		if (Unit.alca !== undefined){

			top.push('<div style="padding: 4px;" class="text-center">');

			if(Unit.alca['state']['next_state_transition_at'] === undefined) {
				text = `<strong class="text-warning">${i18n('Boxes.Units.AlcaHarvest')}</strong>`;

			}
			// es gab eine Ernte...
			else if(Unit.NextHarvest !== null){
				let countDownDate = moment.unix(Unit.NextHarvest);

				let x = setInterval(function() {
					Unit.UpdateAlcaLable(countDownDate,x);
				}, 1000);

				Unit.UpdateAlcaLable(countDownDate, x);

				text = HTML.i18nReplacer(
					i18n('Boxes.Units.NextUnitsIn'),
					{
						count: Unit.NextAmount,
						harvest: moment.unix(Unit.alca['state']['next_state_transition_at']).format('HH:mm:ss')
					});

			} else {
				let countDownDate = moment.unix(Unit.alca['state']['next_state_transition_at']);

				let x = setInterval(function() {
					Unit.UpdateAlcaLable(countDownDate,x);
				}, 1000);

				Unit.UpdateAlcaLable(countDownDate, x);

				text = HTML.i18nReplacer(
					i18n('Boxes.Units.NextUnitsIn'),
					{
						count: Unit.alca.state.current_product.amount,
						harvest: moment.unix(Unit.alca['state']['next_state_transition_at']).format('HH:mm:ss')
					});
			}

			top.push('<div class="alca-info text-center">' + text + '</div>');

			top.push('</div>');
		}


		// Angriffsarmee
		let attack = [];

		Unit.Tabs = [];
		Unit.TabsContent = [];

		Unit.SetTabs('attack');

		attack.push('<table class="foe-table">');

		attack.push('<thead>');
			attack.push('<tr>');
				attack.push('<th></th>');
				attack.push('<th>' + i18n('Boxes.Units.Unit') + '</th>');
				attack.push('<th class="text-center">' + i18n('Boxes.Units.Status') + '</th>');
				attack.push('<th class="text-center">' + i18n('Boxes.Units.Attack') + '</th>');
				attack.push('<th class="text-center">' + i18n('Boxes.Units.Defend') + '</th>');
			attack.push('</tr>');
		attack.push('</thead>');

		attack.push('<tbody>');


        Unit.Attack = [];

        for (let i in Unit.Cache['units']) {

        	if(!Unit.Cache['units'].hasOwnProperty(i)){
        		break;
        	}

            if (Unit.Cache['units'][i]['is_attacking']) {
                Unit.Attack[Unit.Attack.length] = Unit.Cache['units'][i];
            }
        }

        for(let i in Unit.Attack) {
			if(!Unit.Attack.hasOwnProperty(i)){
				break;
			}

			let type = Unit.Types.find(obj => (obj['unitTypeId'] === Unit.Attack[i]['unitTypeId'])),
				cache = Unit.Cache['units'].find(obj => (obj['unitId'] === Unit.Attack[i]['unitId'])),
				era = Technologies.Eras[type['minEra']];

			attack.push('<tr data-era="' + era + '">');

			attack.push('<td><span class="units-icon ' + Unit.Attack[i]['unitTypeId'] + '"></span></td>');
			attack.push('<td>' + type['name'] + '</td>');

			let status = cache['currentHitpoints'] * 10;
			attack.push('<td class="text-center"><span class="health"><span style="width:' + status + '%"></span></span><span class="percent">' + status + '%</span></td>');

			let Boosts = Unit.GetBoostSums(Unit.GetBoostDict(cache['bonuses']));

			let AttackBoost = Boosts['AttackAttackBoost'],
				DefenseBoost = Boosts['AttackDefenseBoost']
			
			let Attack = MainParser.round(type['baseDamage'] * (AttackBoost / 100)) + type['baseDamage'],
				Defense = MainParser.round(type['baseArmor'] * (DefenseBoost / 100)) + type['baseArmor'];

			attack.push('<td class="text-center"><em><small>+' + AttackBoost + '%</small></em><br><strong class="text-success">= ' + Attack + '</strong></td>');
			attack.push('<td class="text-center"><em><small>+' + DefenseBoost + '%</small></em><br><strong class="text-success">= ' + Defense + '</strong></td>');

			attack.push('</tr>');
		}


    	for(let i = Unit.Attack.length; i < 8; i++) {
		    attack.push('<tr>');
			attack.push('<td colspan="5" class="text-center"><strong class="text-danger"><em>' + i18n('Boxes.Units.NotFilled') + '</em></strong></td>');
			attack.push('</tr>');
		}

		attack.push('</tbody>');

		attack.push('</table>');

		Unit.SetTabContent('attack', attack.join(''));


		// Stadtvertedigung
		let defense = [];

		Unit.SetTabs('defense');

		defense.push('<table class="foe-table">');

		defense.push('<thead>');
			defense.push('<tr>');
				defense.push('<th></th>');
				defense.push('<th>' + i18n('Boxes.Units.Unit') + '</th>');
				defense.push('<th>' + i18n('Boxes.Units.Status') + '</th>');
				defense.push('<th>' + i18n('Boxes.Units.Attack') + '</th>');
				defense.push('<th>' + i18n('Boxes.Units.Defend') + '</th>');
			defense.push('</tr>');
		defense.push('</thead>');

		defense.push('<tbody>');

        Unit.Defense = [];
        for (let i in Unit.Cache['units']) {
            if (Unit.Cache['units'][i]['is_defending']) {
                Unit.Defense[Unit.Defense.length] = Unit.Cache['units'][i];
            }
        }
		for(let i in Unit.Defense){
			if(!Unit.Defense.hasOwnProperty(i)){
				break;
			}

			defense.push('<tr>');

			let type = Unit.Types.find(obj => (obj['unitTypeId'] === Unit.Defense[i]['unitTypeId'])),
				cache = Unit.Cache['units'].find(obj => (obj['unitId'] === Unit.Defense[i]['unitId'])),
				era = Technologies.Eras[type['minEra']];

			defense.push('<td><span class="units-icon ' + Unit.Defense[i]['unitTypeId'] + '"></span></td>');
			defense.push('<td>' + type['name'] + '</td>');

			let status = cache['currentHitpoints'] * 10;
			defense.push('<td class="text-center"><span class="health"><span style="width:' + status + '%"></span></span><span class="percent">' + status + '%</span></td>');

			let Boosts = Unit.GetBoostSums(Unit.GetBoostDict(cache['bonuses']));

			let AttackBoost = Boosts['DefenseAttackBoost'],
				DefenseBoost = Boosts['DefenseDefenseBoost']

			let Attack = MainParser.round(type['baseDamage'] * (AttackBoost / 100)) + type['baseDamage'],
				Defense = MainParser.round(type['baseArmor'] * (DefenseBoost / 100)) + type['baseArmor'];

			defense.push('<td class="text-center"><em><small>+' + AttackBoost + '%</small></em><br><strong class="text-success">= ' + Attack + '</strong></td>');
			defense.push('<td class="text-center"><em><small>+' + DefenseBoost + '%</small></em><br><strong class="text-success">= ' + Defense + '</strong></td>');

			defense.push('</tr>');
		}

		for(let i = Unit.Defense.length; i < 8; i++){
			defense.push('<tr>');
			defense.push('<td colspan="5" class="text-center"><strong class="text-danger"><em>' + i18n('Boxes.Units.NotFilled') + '</em></strong></td>');
			defense.push('</tr>');
		}

		defense.push('</tbody>');

		defense.push('</table>');

		Unit.SetTabContent('defense', defense.join(''));


		
		// alle Einheiten im Überblick
		let pool = [],
			eras = [],
			c = Unit.Cache['counts'];

		// zuerst Sortieren
		for(let i in c) {
			if(!c.hasOwnProperty(i)){
				break;
			}

			let d = Unit.Types.find(obj => (obj['unitTypeId'] === c[i]['unitTypeId']));

			let era = Technologies.Eras[d['minEra']];

			if(eras[era] === undefined){
				eras[era] = [];
			}
						
			eras[era].push({
				id: c[i]['unitTypeId'],
				name: d['name'],
				attached: (c[i]['attached'] === undefined ? '-' : c[i]['attached']),
				unattached: (c[i]['unattached'] === undefined ? '-' : c[i]['unattached']),
			});
		}

		Unit.SetTabs('pool');

		pool.push('<table class="foe-table">');

		pool.push('<thead>');
		pool.push('<tr>');
		pool.push('<th></th>');
		pool.push('<th>' + i18n('Boxes.Units.Unit') + '</th>');
		pool.push('<th class="text-center">' + i18n('Boxes.Units.Bind') + '</th>');
		pool.push('<th class="text-center">' + i18n('Boxes.Units.Unbind') + '</th>');
		pool.push('</tr>');
		pool.push('</thead>');

		pool.push('<tbody>');


		for (let era = eras.length; era >= 0;era--){
			if(!eras.hasOwnProperty(era)){
				continue;
			}

			pool.push('<tr>');
			pool.push('<th colspan="4">' + i18n('Eras.' + era) + '</th>');
			pool.push('</tr>');

			for(let i in eras[era]){
				if(!eras[era].hasOwnProperty(i)){
					break;
				}

				pool.push('<tr>');
				pool.push('<td><span class="units-icon ' + eras[era][i]['id'] + '"></span></td>');
				pool.push('<td>' + eras[era][i]['name'] + '</td>');
				pool.push('<td class="text-center">' + eras[era][i]['attached'] + '</td>');
				pool.push('<td class="text-center">' + eras[era][i]['unattached'] + '</td>');
				pool.push('</tr>');
			}

		}

		pool.push('</tbody>');

		pool.push('</table>');

		Unit.SetTabContent('pool', pool.join(''));

		// Evt. gibt es neue Einheiten?
		Unit.GetLastAlcaUnits();

		// fertige Tabelle zusammen setzten
		let h = [];

		h.push(top.join(''));

		h.push('<div class="unit-tabs tabs">');
		h.push( Unit.GetTabs() );
		h.push( Unit.GetTabContent() );
		h.push('</div>');
		

		$('#UnitOverview').find('#UnitOverviewBody').html( h.join('') ).promise().done(function(){
			$('.unit-tabs').tabslet({active: 1});
		});
	},


	/**
	 * Sucht nach dem Alcatraz
	 * *
	 * */
	RefreshAlca: () => {
		if (!Unit.alca) Unit.alca = Object.values(MainParser.CityMapData).find(obj => (obj['cityentity_id'] === 'X_ProgressiveEra_Landmark1'));
    },


	/**
	 * Merkt sich alle Tabs
	 *
	 * @param id
	 */
	SetTabs: (id)=>{
		Unit.Tabs.push('<li class="' + id + ' game-cursor"><a href="#' + id + '" class="game-cursor"><span>&nbsp;</span></a></li>');
	},


	/**
	 * Gibt alle gemerkten Tabs aus
	 *
	 * @returns {string}
	 */
	GetTabs: ()=> {
		return '<ul class="horizontal">' + Unit.Tabs.join('') + '</ul>';
	},


	/**
	 * Speichert BoxContent zwischen
	 *
	 * @param id
	 * @param content
	 */
	SetTabContent: (id, content)=>{
		Unit.TabsContent.push('<div id="' + id + '">' + content + '</div>');
	},


	/**
	 * Setzt alle gespeicherten Tabs zusammen
	 *
	 * @returns {string}
	 */
	GetTabContent: ()=> {
		return Unit.TabsContent.join('');
	},


	/**
	 * Aktuallisiert die Anzeige für die Alcatraz-Produktion
	 * 
	 */
	UpdateAlcaLable:(countDownDate, intervalID)=>{
		if(countDownDate.isValid()){
			let diff = countDownDate.diff(moment());

			if (diff <= 0) {
				clearInterval(intervalID);
				$('.alca-info').html('<span class="text-danger"><strong>'+i18n('Boxes.Units.ReadyToLoot')+'</strong></span>');
			} else
				$('.alca-countdown').text(moment.utc(diff).format("HH:mm:ss"));
		}
		else{
			clearInterval(intervalID);
			$('.alca-info').html('<span class="text-danger"><strong>'+i18n('Boxes.Units.ReadyToLoot')+'</strong></span>');
		}
	},


	/**
	* Wandelt ein Boost Array in ein Dict um
	* *
	* */
	GetBoostDict: (BoostArray) => {
		let Ret = [];

		for (let i in BoostArray) {
			if (!BoostArray.hasOwnProperty(i)) continue;

			let BoostType = BoostArray[i]['type'];
			let BoostValue = BoostArray[i]['value'];

			if (Ret[BoostType] === undefined) {
				Ret[BoostType] = BoostValue;
			}
			else {
				Ret[BoostType] += BoostValue;
			}
		}

		return Ret;
	},


	/**
		 * Berechnet die summierten Boni
		 * *
		 */
	GetBoostSums: (Boosts) => {
		let Ret = [],
			CurrentBoost = undefined;

		Ret['AttackAttackBoost'] = 0;
		Ret['AttackDefenseBoost'] = 0;
		Ret['DefenseAttackBoost'] = 0;
		Ret['DefenseDefenseBoost'] = 0;

		// Angriff + Verteidigung der angreifenden Armee (z.B. Zeus)
		CurrentBoost = Boosts['military_boost'];
		if (CurrentBoost !== undefined) {
			Ret['AttackAttackBoost'] += CurrentBoost;
			Ret['AttackDefenseBoost'] += CurrentBoost;
		}

		// Angriff + Verteidigung der verteidigenden Armee (z.B. Basilius Kathedrale)
		CurrentBoost = Boosts['fierce_resistance'];
		if (CurrentBoost !== undefined) {
			Ret['DefenseAttackBoost'] += CurrentBoost;
			Ret['DefenseDefenseBoost'] += CurrentBoost;
		}

		// Alle Boni (z.B. Terrakotta Armee)
		CurrentBoost = Boosts['advanced_tactics'];
		if (CurrentBoost !== undefined) {
			Ret['AttackAttackBoost'] += CurrentBoost;
			Ret['AttackDefenseBoost'] += CurrentBoost;
			Ret['DefenseAttackBoost'] += CurrentBoost;
			Ret['DefenseDefenseBoost'] += CurrentBoost;
		}

		// Angriffbonus der angreifenden Armee
		CurrentBoost = Boosts['attack_boost'] || Boosts['att_boost_attacker'];
		if (CurrentBoost !== undefined) {
			Ret['AttackAttackBoost'] += CurrentBoost;
		}

		// Verteidigungsbonus der angreifenden Armee
		CurrentBoost = Boosts['attacker_defense_boost'] || Boosts['def_boost_attacker'];
		if (CurrentBoost !== undefined) {
			Ret['AttackDefenseBoost'] += CurrentBoost;
		}

		// Angriffbonus der verteidigenden Armee
		CurrentBoost = Boosts['defender_attack_boost'] || Boosts['att_boost_defender'];
		if (CurrentBoost !== undefined) {
			Ret['DefenseAttackBoost'] += CurrentBoost;
		}

		// Verteidigungsbonus der verteidigenden Armee
		CurrentBoost = Boosts['defense_boost'] || Boosts['def_boost_defender'];
		if (CurrentBoost !== undefined) {
			Ret['DefenseDefenseBoost'] += CurrentBoost;
		}

		return Ret;
	},


	/**
	 * Die letzten Einheiten die aus dem Alca gekommen sind
	 *
	 */
	GetLastAlcaUnits: ()=> {

		let last = [],
			au = localStorage.getItem('LastAlcatrazUnits'),
			AlcaUnits = null;

		// nix drin
		if(au === null){
			return ;
		}

		AlcaUnits = JSON.parse(au);

		if(AlcaUnits.length === 0){
			return;
		}

		let LastAlca = [],
			LastTotal = AlcaUnits.length;

		for(let i in AlcaUnits) {
			if(!AlcaUnits.hasOwnProperty(i)){
				break;
			}

			let type = Unit.Types.find(obj => (obj['unitTypeId'] === AlcaUnits[i]['unitTypeId'])),
				era = Technologies.Eras[type['minEra']];

			if(LastAlca[AlcaUnits[i]['unitTypeId']] === undefined){
				LastAlca[AlcaUnits[i]['unitTypeId']] = {
					era: era,
					id: AlcaUnits[i]['unitTypeId'],
					name: type['name'],
					count: 1
				};

			} else {
				LastAlca[AlcaUnits[i]['unitTypeId']]['count']++;
			}
		}

		Unit.SetTabs('alca');

		last.push('<table class="foe-table">');

		last.push('<thead>');
		last.push('<tr>');
		last.push('<th class="text-warning">' + LastTotal + 'x</th>');
		last.push('<th>' + i18n('Boxes.Units.Unit') + '</th>');
		last.push('<th class="text-center">' + i18n('Boxes.Units.Quantity') + '</th>');
		last.push('<th class="text-center">' + i18n('Boxes.Units.Proportionally') + '</th>');
		last.push('</tr>');
		last.push('</thead>');

		last.push('<tbody>');

		let cnt = 0;

		for(let i in LastAlca) {
			if(!LastAlca.hasOwnProperty(i)){
				break;
			}

			last.push('<tr data-era="' + LastAlca[i]['era'] + '">');

			last.push('<td><span class="units-icon ' + LastAlca[i]['id'] + '"></span></td>');
			last.push('<td>' + LastAlca[i]['name'] + '</td>');

			last.push('<td class="text-center">' + LastAlca[i]['count'] + 'x</td>');
			last.push('<td class="text-center">' + MainParser.round((LastAlca[i]['count'] * 100 ) / LastTotal) + '%</td>');

			last.push('</tr>');

			cnt++;
		}

		last.push('</tbody>');

		last.push('</table>');

		Unit.SetTabContent('alca', last.join(''));
	}
};
