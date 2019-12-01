/*
 * **************************************************************************************
 *
 * Dateiname:                 unit.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       20.11.19, 22:33 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let Unit = {

	Types: null,
	Attack : null,
	Defense: null,
	Pool: null,

	Cache : null,

	Tabs: [],
	TabsContent: [],


	/**
	 * Erstellt eine HTML Box für den DOM
	 *
	 * @constructor
	 */
	Show: ()=> {

		if ($('#units').length === 0) {
			let args = {
				'id': 'units',
				'title': i18n['Boxes']['Units']['Title'],
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			};

			HTML.Box(args);
			moment.locale(i18n['Local']);
		}

		Unit.BuildBox();
	},


	/**
	 * Rendern und in den BoxContent
	 *
	 * @constructor
	 */
	BuildBox:()=> {

		let top = [],
			alca = CityMapData.find(obj => (obj['cityentity_id'] === 'X_ProgressiveEra_Landmark1')),
			countDownDate = moment.unix(alca['state']['next_state_transition_at']);

		let x = setInterval(function() {
			let diff = countDownDate.diff(moment());

			if (diff <= 0) {
				clearInterval(x);

				$('.alca-countdown').html('<span class="text-danger">Ernte!</span>');
			} else
				$('.alca-countdown').text(moment.utc(diff).format("HH:mm:ss"));

		}, 1000);

		top.push('<div style="padding: 4px;" class="text-center">');

		top.push(HTML.i18nReplacer(
			i18n['Boxes']['Units']['NextUnitsIn'],
			{
				count: alca.state.current_product.amount,
				harvest: moment.unix(alca['state']['next_state_transition_at']).format('HH:mm:ss')
			})
		);

		top.push('</div>');

		// Angriffsarmee
		let attack = [];

		Unit.Tabs = [];
		Unit.TabsContent = [];

		Unit.SetTabs('attack');

		attack.push('<table class="foe-table">');

		attack.push('<thead>');
			attack.push('<tr>');
				attack.push('<th></th>');
				attack.push('<th>' + i18n['Boxes']['Units']['Unit'] + '</th>');
				attack.push('<th class="text-center">' + i18n['Boxes']['Units']['Status'] + '</th>');
				attack.push('<th class="text-center">' + i18n['Boxes']['Units']['Attack'] + '</th>');
				attack.push('<th class="text-center">' + i18n['Boxes']['Units']['Defend'] + '</th>');
			attack.push('</tr>');
		attack.push('</thead>');

		attack.push('<tbody>');

		let cnt = 0;

		for(let i in Unit.Attack)
		{
			if(!Unit.Attack.hasOwnProperty(i)){
				break;
			}

			let type = Unit.Types.find(obj => (obj['unitTypeId'] === Unit.Attack[i]['unitTypeId'])),
				cache = Unit.Cache['units'].find(obj => (obj['unitId'] === Unit.Attack[i]['unitId'])),
				era = type['minEra'];

			attack.push('<tr data-era="' + era + '">');

			attack.push('<td><span class="units-icon ' + Unit.Attack[i]['unitTypeId'] + '"></span></td>');
			attack.push('<td>' + type['name'] + '</td>');

			let status = cache['currentHitpoints'] * 10;
			attack.push('<td class="text-center"><span class="health"><span style="width:' + status + '%"></span></span><span class="percent">' + status + '%</span></td>');

			let mb = cache['bonuses'].find(o => (o['type'] === 'military_boost')),
				at = cache['bonuses'].find(o => (o['type'] === 'advanced_tactics')),
				ab = cache['bonuses'].find(o => (o['type'] === 'attack_boost')),

				ap = (mb['value'] + at['value'] + ab['value']),
				a = Math.round(type['baseDamage'] * (ap / 100)) + type['baseDamage'],
				dp = (mb['value'] + at['value']),
				d = Math.round(type['baseArmor'] * (dp / 100)) + type['baseArmor'];

			attack.push('<td class="text-center"><em><small>+' + ap + '%</small></em><br><strong class="text-success">= ' + a + '</strong></td>');
			attack.push('<td class="text-center"><em><small>+' + dp + '%</small></em><br><strong class="text-success">= ' + d + '</strong></td>');

			attack.push('</tr>');

			cnt++;
		}


		if(cnt < 8)
		{
			for(let i = cnt; i <= 7; i++)
			{
				attack.push('<tr>');
				attack.push('<td colspan="5" class="text-center"><strong class="text-danger"><em>' + i18n['Boxes']['Units']['NotFilled'] + '</em></strong></td>');
				attack.push('</tr>');
			}
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
				defense.push('<th>' + i18n['Boxes']['Units']['Unit'] + '</th>');
				defense.push('<th>' + i18n['Boxes']['Units']['Status'] + '</th>');
				defense.push('<th>' + i18n['Boxes']['Units']['Attack'] + '</th>');
				defense.push('<th>' + i18n['Boxes']['Units']['Defend'] + '</th>');
			defense.push('</tr>');
		defense.push('</thead>');

		defense.push('<tbody>');

		cnt = 0;
		for(let i in Unit.Defense)
		{
			if(!Unit.Defense.hasOwnProperty(i)){
				break;
			}

			defense.push('<tr>');

			let type = Unit.Types.find(obj => (obj['unitTypeId'] === Unit.Defense[i]['unitTypeId'])),
				cache = Unit.Cache['units'].find(obj => (obj['unitId'] === Unit.Defense[i]['unitId'])),
				era = type['minEra'];

			defense.push('<td><span class="units-icon ' + Unit.Defense[i]['unitTypeId'] + '"></span></td>');
			defense.push('<td>' + type['name'] + '</td>');

			let status = cache['currentHitpoints'] * 10;
			defense.push('<td class="text-center"><span class="health"><span style="width:' + status + '%"></span></span><span class="percent">' + status + '%</span></td>');

			let at = cache['bonuses'].find(o => (o['type'] === 'advanced_tactics')),
				fr = cache['bonuses'].find(o => (o['type'] === 'fierce_resistance')),
				db = cache['bonuses'].find(o => (o['type'] === 'defense_boost')),

				dap = (fr['value'] + at['value']),
				a = Math.round(type['baseDamage'] * (dap / 100)) + type['baseDamage'],
				ddp = (fr['value'] + at['value'] + db['value']),
				d = Math.round(type['baseArmor'] * (ddp / 100)) + type['baseArmor'];

			defense.push('<td class="text-center"><em><small>+' + dap + '%</small></em><br><strong class="text-success">= ' + a + '</strong></td>');
			defense.push('<td class="text-center"><em><small>+' + ddp + '%</small></em><br><strong class="text-success">= ' + d + '</strong></td>');

			defense.push('</tr>');

			cnt++;
		}

		if(cnt < 8)
		{
			for(let i = cnt; i <= 7; i++)
			{
				defense.push('<tr>');
				defense.push('<td colspan="5" class="text-center"><strong class="text-danger"><em>' + i18n['Boxes']['Units']['NotFilled'] + '</em></strong></td>');
				defense.push('</tr>');
			}
		}

		defense.push('</tbody>');

		defense.push('</table>');

		Unit.SetTabContent('defense', defense.join(''));

		
		// alle Einheiten im Überblick
		let pool = [];

		Unit.SetTabs('pool');

		pool.push('<table class="foe-table">');

		pool.push('<thead>');
		pool.push('<tr>');
		pool.push('<th></th>');
		pool.push('<th>' + i18n['Boxes']['Units']['Unit'] + '</th>');
		pool.push('<th class="text-center">' + i18n['Boxes']['Units']['Bind'] + '</th>');
		pool.push('<th class="text-center">' + i18n['Boxes']['Units']['Unbind'] + '</th>');
		pool.push('</tr>');
		pool.push('</thead>');

		pool.push('<tbody>');

		let c = Unit.Cache['counts'];

		for(let i in c)
		{
			if(!c.hasOwnProperty(i)){
				break;
			}

			pool.push('<tr>');

			let d = Unit.Types.find(obj => (obj['unitTypeId'] === c[i]['unitTypeId']));

			pool.push('<td><span class="units-icon ' + c[i]['unitTypeId'] + '"></span></td>');
			pool.push('<td>' + d['name'] + '</td>');
			pool.push('<td class="text-center">' + (c[i]['attached'] === undefined ? '-' : c[i]['attached']) + '</td>');
			pool.push('<td class="text-center">' + (c[i]['unattached'] === undefined ? '-' : c[i]['unattached']) + '</td>');
			pool.push('</tr>');
		}

		pool.push('</tbody>');

		pool.push('</table>');

		Unit.SetTabContent('pool', pool.join(''));

		// Evt. gibt es Einheiten?
		Unit.GetLastAlcaUnits();

		// fertige Tabelle zusammen setzten
		let h = [];

		h.push(top);

		h.push('<div class="unit-tabs tabs">');
		h.push( Unit.GetTabs() );
		h.push( Unit.GetTabContent() );
		h.push('</div>');
		

		$('#units').find('#unitsBody').html( h.join('') ).promise().done(function(){
			$('.unit-tabs').tabslet({active: 1});
		});
	},


	/**
	 * Merkt sich alle Tabs
	 *
	 * @param id
	 * @constructor
	 */
	SetTabs: (id)=>{
		Unit.Tabs.push('<li class="' + id + ' game-cursor"><a href="#' + id + '" class="game-cursor">&nbsp;</a></li>');
	},


	/**
	 * Gibt alle gemerkten Tabs aus
	 *
	 * @returns {string}
	 * @constructor
	 */
	GetTabs: ()=> {
		return '<ul class="horizontal">' + Unit.Tabs.join('') + '</ul>';
	},


	/**
	 * Speichert BoxContent zwischen
	 *
	 * @param id
	 * @param content
	 * @constructor
	 */
	SetTabContent: (id, content)=>{
		Unit.TabsContent.push('<div id="' + id + '">' + content + '</div>');
	},


	/**
	 * Setzt alle gespeicherten Tabs zusammen
	 *
	 * @returns {string}
	 * @constructor
	 */
	GetTabContent: ()=> {
		return Unit.TabsContent.join('');
	},

	/**
	 * Die letzten Einheiten die aus dem Alca gekommen sind
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

		Unit.SetTabs('alca');

		last.push('<table class="foe-table">');

		last.push('<thead>');
		last.push('<tr>');
		last.push('<th></th>');
		last.push('<th>' + i18n['Boxes']['Units']['Unit'] + '</th>');
		last.push('<th class="text-center">' + i18n['Boxes']['Units']['Unbind'] + '</th>');
		last.push('</tr>');
		last.push('</thead>');

		last.push('<tbody>');

		let cnt = 0;

		for(let i in AlcaUnits)
		{
			if(!AlcaUnits.hasOwnProperty(i)){
				break;
			}

			let type = Unit.Types.find(obj => (obj['unitTypeId'] === AlcaUnits[i]['unitTypeId'])),
				cache = Unit.Cache['units'].find(obj => (obj['unitId'] === AlcaUnits[i]['unitId'])),
				era = type['minEra'];

			last.push('<tr data-era="' + era + '">');

			last.push('<td><span class="units-icon ' + AlcaUnits[i]['unitTypeId'] + '"></span></td>');
			last.push('<td>' + type['name'] + '</td>');

			let status = cache['currentHitpoints'] * 10;
			last.push('<td class="text-center"><span class="health"><span style="width:' + status + '%"></span></span><span class="percent">' + status + '%</span></td>');

			last.push('</tr>');

			cnt++;
		}

		last.push('</tbody>');

		last.push('</table>');

		Unit.SetTabContent('last', last.join(''));
	}
};