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
	Unit.RefreshAlca(data['responseData']);

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

	CoordsRaw: [],

	Types: null,
	Attack : null,
	Defense: null,
	ArenaDefense: null,
	alca : undefined,

	Cache : null,

	NextHarvest: null,
	NextAmount: null,

	Tabs: [],
	TabsContent: [],
	CurrentTab: 1,

	Settings: {
		pictogramScaling: 3,
	},

	/**
	 * Creates an HTML box for the DOM
	 *
	 */
	Show: ()=> {

		Unit.PrepareCoords();

		if ($('#UnitOverview').length === 0) {
			HTML.AddCssFile('unit');

			let args = {
				id: 'UnitOverview',
				title: i18n('Boxes.Units.Title'),
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize: true,
				settings: 'Unit.ShowSettings()'
			};

			HTML.Box(args);
			//moment.locale(18n('Local'));

		} else {
			HTML.CloseOpenBox('UnitOverview');
		}

		Unit.BuildBox();
	},


	PrepareCoords: ()=> {
		if( $('#unit-css-block').length > 0){
			return;
		}

		if(Object.keys(Unit.CoordsRaw).length === 0){
			return;
		}

		let s = [],
			r = Unit.CoordsRaw.image.slice(0, Unit.CoordsRaw.image.lastIndexOf('_')) + '_';

		s.push(`:root {--unit_scale: 3/5;}.unit_icon{background: transparent url('${srcLinks.get("/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_0.png", true)}') top left no-repeat;background-size:calc(${Unit.CoordsRaw.size.w}px*var(--unit_scale)) calc(${Unit.CoordsRaw.size.h}px*var(--unit_scale));display:inline-block;width:calc(50px*var(--unit_scale));height:calc(50px*var(--unit_scale));zoom:0.75}`);

		for(let i in Unit.CoordsRaw.frames)
		{
			if(!Unit.CoordsRaw.frames.hasOwnProperty(i)){
				continue;
			}

			let n = Unit.CoordsRaw.frames[i][0].replace(r,''), // cut of "armyuniticons_50x50_"
				l = (Unit.CoordsRaw.frames[i][1] === 1 ? '0' : (parseInt(Unit.CoordsRaw.frames[i][1]) * -1)),
				t = (Unit.CoordsRaw.frames[i][2] === 1 ? '0' : (parseInt(Unit.CoordsRaw.frames[i][2]) * -1));

			s.push(`.unit_icon.${n}{background-position: calc(${l}px*var(--unit_scale)) calc(${t}px*var(--unit_scale))}`);
		}

		let sheet = document.createElement('style')
		sheet.id = 'unit-css-block';
		sheet.innerHTML = s.join('');
		document.head.appendChild(sheet);
	},


	/**
	 * Render and place in the BoxContent
	 */
	BuildBox:()=> {
		Unit.LoadSettings();
		let unitScale = parseInt(Unit.Settings.pictogramScaling) + 1 + '/5';
		document.querySelector('#UnitOverview').style.setProperty('--unit_scale', unitScale);

		let top = [];

		Unit.RefreshAlca();

		if (Unit.alca)
		{
			top.push('<div id="alca-timer" class="text-center dark-bg"></div>');
		}

		// Attack army
		let attack = [];

		Unit.Tabs = [];
		Unit.TabsContent = [];

		Unit.SetTabs('attack');

		attack.push('<table class="foe-table">');

		attack.push('<thead class="head-sticky">');
			attack.push('<tr>');
				attack.push('<th></th>');
				attack.push('<th class="text-center" style="width:29%">' + i18n('Boxes.Units.Unit') + '</th>');
				attack.push('<th class="text-center">' + i18n('Boxes.Units.Status') + '</th>');
				attack.push('<th class="text-center">' + i18n('Boxes.Units.Attack') + '</th>');
				attack.push('<th class="text-center">' + i18n('Boxes.Units.Defend') + '</th>');
			attack.push('</tr>');
		attack.push('</thead>');

		attack.push('<tbody>');


        Unit.Attack = [];

        for (let i in Unit.Cache['units'])
        {
        	if(!Unit.Cache['units'].hasOwnProperty(i))
        	{
        		break;
        	}

            if (Unit.Cache['units'][i]['is_attacking'])
            {
                Unit.Attack[Unit.Attack.length] = Unit.Cache['units'][i];
            }
        }

        for(let i in Unit.Attack)
        {
			if(!Unit.Attack.hasOwnProperty(i)){
				break;
			}

			let type = Unit.Types.find(obj => (obj['unitTypeId'] === Unit.Attack[i]['unitTypeId'])),
				cache = Unit.Cache['units'].find(obj => (obj['unitId'] === Unit.Attack[i]['unitId'])),
				era = Technologies.Eras[type['minEra']];

			attack.push('<tr data-era="' + era + '">');

			attack.push(`<td><span class="unit_icon ${Unit.Attack[i]['unitTypeId']} unit_skill ${type['unitClass']}"></span></td>`);
			attack.push('<td>' + type['name'] + '</td>');

			let status = cache['currentHitpoints'] * 10;
			attack.push('<td class="text-center"><span class="health"><span class="bar" style="width:' + status + '%"></span><span class="percent">' + status + '%</span></span></td>');

			let Boosts = Unit.GetBoostSums(Unit.GetBoostDict(cache['bonuses']));

			let AttackBoost = Boosts['AttackAttackBoost'],
				DefenseBoost = Boosts['AttackDefenseBoost']
			
			let Attack = MainParser.round(type['baseDamage'] * (AttackBoost / 100)) + type['baseDamage'],
				Defense = MainParser.round(type['baseArmor'] * (DefenseBoost / 100)) + type['baseArmor'];

			attack.push('<td class="text-center"><em><small>+' + AttackBoost + '%</small></em> <strong class="text-success">= ' + Attack + '</strong></td>');
			attack.push('<td class="text-center"><em><small>+' + DefenseBoost + '%</small></em> <strong class="text-success">= ' + Defense + '</strong></td>');

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
		defense.push('<thead class="head-sticky">');
			defense.push('<tr>');
				defense.push('<th></th>');
				defense.push('<th class="text-center" style="width:29%">' + i18n('Boxes.Units.Unit') + '</th>');
				defense.push('<th class="text-center">' + i18n('Boxes.Units.Status') + '</th>');
				defense.push('<th class="text-center">' + i18n('Boxes.Units.Attack') + '</th>');
				defense.push('<th class="text-center">' + i18n('Boxes.Units.Defend') + '</th>');
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

			defense.push(`<td><span class="unit_icon ${Unit.Defense[i]['unitTypeId']} unit_skill ${type['unitClass']}"></span></td>`);
			defense.push('<td>' + type['name'] + '</td>');

			let status = cache['currentHitpoints'] * 10;
			defense.push('<td class="text-center"><span class="health"><span class="bar" style="width:' + status + '%"></span><span class="percent">' + status + '%</span></span></td>');

			let Boosts = Unit.GetBoostSums(Unit.GetBoostDict(cache['bonuses']));

			let AttackBoost = Boosts['DefenseAttackBoost'],
				DefenseBoost = Boosts['DefenseDefenseBoost']

			let Attack = MainParser.round(type['baseDamage'] * (AttackBoost / 100)) + type['baseDamage'],
				Defense = MainParser.round(type['baseArmor'] * (DefenseBoost / 100)) + type['baseArmor'];

			defense.push('<td class="text-center"><em><small>+' + AttackBoost + '%</small></em> <strong class="text-success">= ' + Attack + '</strong></td>');
			defense.push('<td class="text-center"><em><small>+' + DefenseBoost + '%</small></em> <strong class="text-success">= ' + Defense + '</strong></td>');

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


		// Arenavertedigung
		let arenaDefense = [];

		Unit.SetTabs('arenaDefense');

		arenaDefense.push('<table class="foe-table">');
		arenaDefense.push('<thead class="head-sticky">');
			arenaDefense.push('<tr>');
				arenaDefense.push('<th></th>');
				arenaDefense.push('<th class="text-center" style="width:29%">' + i18n('Boxes.Units.Unit') + '</th>');
				arenaDefense.push('<th class="text-center">' + i18n('Boxes.Units.Status') + '</th>');
				arenaDefense.push('<th class="text-center">' + i18n('Boxes.Units.Attack') + '</th>');
				arenaDefense.push('<th class="text-center">' + i18n('Boxes.Units.Defend') + '</th>');
			arenaDefense.push('</tr>');
		arenaDefense.push('</thead>');
		arenaDefense.push('<tbody>');

        Unit.ArenaDefense = [];
        for (let i in Unit.Cache['units']) {
            if (Unit.Cache['units'][i]['isArenaDefending']) {
                Unit.ArenaDefense[Unit.ArenaDefense.length] = Unit.Cache['units'][i];
            }
        }
		for(let i in Unit.ArenaDefense){
			if(!Unit.ArenaDefense.hasOwnProperty(i)){
				break;
			}

			arenaDefense.push('<tr>');

			let type = Unit.Types.find(obj => (obj['unitTypeId'] === Unit.ArenaDefense[i]['unitTypeId'])),
				cache = Unit.Cache['units'].find(obj => (obj['unitId'] === Unit.ArenaDefense[i]['unitId'])),
				era = Technologies.Eras[type['minEra']];

			arenaDefense.push(`<td><span class="unit_icon ${Unit.ArenaDefense[i]['unitTypeId']} unit_skill ${type['unitClass']}"></span></td>`);
			arenaDefense.push('<td>' + type['name'] + '</td>');

			let status = cache['currentHitpoints'] * 10;
			arenaDefense.push('<td class="text-center"><span class="health"><span class="bar" style="width:' + status + '%"></span><span class="percent">' + status + '%</span></span></td>');

			let Boosts = Unit.GetBoostSums(Unit.GetBoostDict(cache['bonuses']));

			let AttackBoost = Boosts['DefenseAttackBoost'],
				DefenseBoost = Boosts['DefenseDefenseBoost']

			let Attack = MainParser.round(type['baseDamage'] * (AttackBoost / 100)) + type['baseDamage'],
				Defense = MainParser.round(type['baseArmor'] * (DefenseBoost / 100)) + type['baseArmor'];

			arenaDefense.push('<td class="text-center"><em><small>+' + AttackBoost + '%</small></em> <strong class="text-success">= ' + Attack + '</strong></td>');
			arenaDefense.push('<td class="text-center"><em><small>+' + DefenseBoost + '%</small></em> <strong class="text-success">= ' + Defense + '</strong></td>');

			arenaDefense.push('</tr>');
		}

		for(let i = Unit.ArenaDefense.length; i < 8; i++){
			arenaDefense.push('<tr>');
			arenaDefense.push('<td colspan="5" class="text-center"><strong class="text-danger"><em>' + i18n('Boxes.Units.NotFilled') + '</em></strong></td>');
			arenaDefense.push('</tr>');
		}

		arenaDefense.push('</tbody>');

		arenaDefense.push('</table>');

		Unit.SetTabContent('arenaDefense', arenaDefense.join(''));


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
				unitClass: d['unitClass']
			});
		}

		Unit.SetTabs('pool');

		pool.push('<table class="foe-table">');

		pool.push('<thead class="head-sticky">');
			pool.push('<tr>');
				pool.push('<th></th>');
				pool.push('<th>' + i18n('Boxes.Units.Unit') + '</th>');
				pool.push('<th class="text-center">' + i18n('Boxes.Units.Bind') + '</th>');
				pool.push('<th class="text-center">' + i18n('Boxes.Units.Unbind') + '</th>');
			pool.push('</tr>');
		pool.push('</thead>');

		pool.push('<tbody>');


		for (let era = eras.length; era >= 0;era--)
		{
			if(!eras.hasOwnProperty(era)){
				continue;
			}

			pool.push('<tr>');
			pool.push('<th colspan="4">' + i18n('Eras.' + era) + '</th>');
			pool.push('</tr>');

			for(let i in eras[era])
			{
				if(!eras[era].hasOwnProperty(i)){
					break;
				}

				pool.push('<tr>');
					pool.push(`<td><span class="unit_icon ${eras[era][i]['id']} unit_skill ${eras[era][i]['unitClass']}"></span></td>`);
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
			Unit.BuildTimer();
			$('.unit-tabs').tabslet({active: Unit.CurrentTab});
			$('.unit-tabs').on("_after", function() {
				Unit.CurrentTab = $('.unit-tabs li.active').index() + 1;
			});
		});
		if (Unit.alca)
		{
			$('#UnitOverview').find('.unit-tabs').prop('style', 'height:calc(100% - 80px)');
		}
	},


	/**
	 * Create the timer info for the top box content
	 *
	 * @constructor
	 */
	BuildTimer: ()=> {
		let text;

		if(!Unit.alca)
		{
			return ;
		}

		if(Unit.alca['state']['next_state_transition_at'] === undefined) {
			text = `<strong class="text-warning">${i18n('Boxes.Units.AlcaHarvest')}</strong>`;

		}
		// there was a harvest...
		else if(Unit.NextHarvest !== null)
		{
			let countDownDate = moment.unix(Unit.NextHarvest);

			let x = setInterval(function() {
				Unit.UpdateAlcaLable(countDownDate, x);
			}, 1000);

			Unit.UpdateAlcaLable(countDownDate, x);

			text = HTML.i18nReplacer(
				i18n('Boxes.Units.NextUnitsIn'),
				{
					count: Unit.NextAmount,
					harvest: moment.unix(Unit.alca['state']['next_state_transition_at']).format('HH:mm:ss')
				});

		}
		else {
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

		$('#alca-timer').html(`<div class="alca-info text-center">${text}</div>`);
	},


	/**
	 * Search for the Alcatraz
	 *
	 * @param data
	 * @constructor
	 */
	RefreshAlca: (data) => {
		if (!Unit.alca) {
			Unit.alca = Object.values(MainParser.CityMapData).find(obj => (obj['cityentity_id'] === 'X_ProgressiveEra_Landmark1'))
		}

		// update next harvest time if pickup
		if (data && data['updatedEntities'] && data['updatedEntities'][0] && data['updatedEntities'][0]['cityentity_id'] === 'X_ProgressiveEra_Landmark1')
		{
			Unit.NextHarvest = data['updatedEntities'][0]['state']['next_state_transition_at'];
			Unit.BuildTimer();
		}
    },


	/**
	 * Remembers all tabs
	 *
	 * @param id
	 */
	SetTabs: (id)=>{
		Unit.Tabs.push('<li class="' + id + ' game-cursor"><a href="#' + id + '" class="game-cursor" title="' + i18n('Boxes.Units.' + id + '') + '" ><span>&nbsp;</span></a></li>');
	},


	/**
	 * Outputs all bookmarked tabs
	 *
	 * @returns {string}
	 */
	GetTabs: ()=> {
		return '<ul class="horizontal dark-bg">' + Unit.Tabs.join('') + '</ul>';
	},


	/**
	 * Saves BoxContent between
	 *
	 * @param id
	 * @param content
	 */
	SetTabContent: (id, content)=>{
		Unit.TabsContent.push('<div id="' + id + '">' + content + '</div>');
	},


	/**
	 * Assembles all saved tabs
	 *
	 * @returns {string}
	 */
	GetTabContent: ()=> {
		return Unit.TabsContent.join('');
	},


	/**
	 * Updates the display for the Alcatraz production
	 * 
	 */
	UpdateAlcaLable:(countDownDate, intervalID)=>{
		if(countDownDate.isValid())
		{
			let diff = countDownDate.diff(moment());

			if (diff <= 0)
			{
				clearInterval(intervalID);
				$('.alca-info').html('<span class="text-danger"><strong>'+i18n('Boxes.Units.ReadyToLoot')+'</strong></span>');
			}
			else
				$('.alca-countdown').text(moment.utc(diff).format("HH:mm:ss"));
		}
		else{
			clearInterval(intervalID);
			$('.alca-info').html('<span class="text-danger"><strong>'+i18n('Boxes.Units.ReadyToLoot')+'</strong></span>');
		}
	},


	/**
	 * Converts a Boost Array into a Dict
	 *
	 * @param BoostArray
	 * @returns {[]}
	 * @constructor
	 */
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
	 * Calculates the summed bonuses
	 *
	 * @param Boosts
	 * @returns {[]}
	 * @constructor
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
	 * The last units that came out of the Alca
	 *
	 * @constructor
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

		for(let i in AlcaUnits)
		{
			if(!AlcaUnits.hasOwnProperty(i))
			{
				break;
			}

			let type = Unit.Types.find(obj => (obj['unitTypeId'] === AlcaUnits[i]['unitTypeId'])),
				era = Technologies.Eras[type['minEra']];

			if(LastAlca[AlcaUnits[i]['unitTypeId']] === undefined)
			{
				LastAlca[AlcaUnits[i]['unitTypeId']] = {
					era: era,
					id: AlcaUnits[i]['unitTypeId'],
					name: type['name'],
					unitClass: type['unitClass'],
					count: 1
				};

			}
			else {
				LastAlca[AlcaUnits[i]['unitTypeId']]['count']++;
			}
		}

		Unit.SetTabs('alca');

		last.push('<table class="foe-table">');

		last.push('<thead class="head-sticky">');
			last.push('<tr>');
				last.push('<th class="text-warning">' + LastTotal + 'x</th>');
				last.push('<th>' + i18n('Boxes.Units.Unit') + '</th>');
				last.push('<th class="text-center">' + i18n('Boxes.Units.Quantity') + '</th>');
				last.push('<th class="text-center">' + i18n('Boxes.Units.Proportionally') + '</th>');
			last.push('</tr>');
		last.push('</thead>');

		last.push('<tbody>');

		let cnt = 0;

		for(let i in LastAlca)
		{
			if(!LastAlca.hasOwnProperty(i))
			{
				break;
			}

			last.push('<tr data-era="' + LastAlca[i]['era'] + '">');

				last.push(`<td><span class="unit_icon ${LastAlca[i]['id']} unit_skill ${LastAlca[i]['unitClass']}"></span></td>`);
				last.push('<td>' + LastAlca[i]['name'] + '</td>');

				last.push('<td class="text-center">' + LastAlca[i]['count'] + 'x</td>');
				last.push('<td class="text-center">' + MainParser.round((LastAlca[i]['count'] * 100 ) / LastTotal) + '%</td>');

			last.push('</tr>');

			cnt++;
		}

		last.push('</tbody>');

		last.push('</table>');

		Unit.SetTabContent('alca', last.join(''));
	},

	/**
	*
	*/
	LoadSettings: () => {
		cachedSettings = JSON.parse(localStorage.getItem('UnitOverviewSettings')) || Unit.Settings;
		Unit.Settings.pictogramScaling = (cachedSettings && cachedSettings.pictogramScaling !== undefined) ? cachedSettings.pictogramScaling : Unit.Settings.pictogramScaling;
	},

	/**
	* Unit.Settings.pictogramScaling;
	*/
	ShowSettings: () => {
		let h = [];

		h.push(`<p>${i18n('Boxes.Units.PictogramScalingTitle')}
					<button class="btn btn-slim btn-set-value" data-value="-1">&lt;</button>
					<input type="number" id="pictogramScaling" step="1" min="1" max="4" placeholder="1-4" required value="${Unit.Settings.pictogramScaling}" title="${HTML.i18nTooltip(i18n('Boxes.Units.PictogramScalingDesc'))}">
					<button class="btn btn-slim btn-set-value" data-value="1">&gt;</button>
					<span class="validity"></span>
				</p>`);
		h.push(`<p><button onclick="Unit.SaveSettings()" id="unit-save-settings" class="btn" style="width:100%">${i18n('Boxes.Settings.Save')}</button></p>`);

		$('#UnitOverviewSettingsBox').html(h.join(''));
		
		$('#UnitOverviewSettingsBox').on('click', '.btn-set-value', function () {
			let value = parseFloat($('#pictogramScaling').val()) + parseFloat($(this).data('value'));
			if (value !== value) value = 1; //NaN => 1
			value = value < 1 ? 1 : value;
			value = value > 4 ? 4 : value;
			$('#pictogramScaling').val(value);
		});
	},

	/**
	*
	*/
	SaveSettings: () => {
		Unit.Settings.pictogramScaling = 1 <= $('#pictogramScaling').val() && $('#pictogramScaling').val() <= 4 ? $('#pictogramScaling').val() : Unit.Settings.pictogramScaling;
		localStorage.setItem('UnitOverviewSettings', JSON.stringify(Unit.Settings));

		$('#UnitOverviewSettingsBox').remove();
		Unit.BuildBox();
	}
};
