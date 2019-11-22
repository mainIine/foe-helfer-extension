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
				'title': 'Armee Übersicht',
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			};

			HTML.Box(args);
		}

		Unit.BuildBox();
	},


	BuildBox:()=> {

		// Angriffsarmee
		let attack = [];

		Unit.Tabs = [];
		Unit.TabsContent = [];

		Unit.SetTabs('attack');

		attack.push('<table class="foe-table">');

		attack.push('<thead>');
			attack.push('<tr>');
				attack.push('<th></th>');
				attack.push('<th>Einheit</th>');
				attack.push('<th class="text-center">Status</th>');
				attack.push('<th class="text-center">Angriff</th>');
				attack.push('<th class="text-center">Verteidigung</th>');
			attack.push('</tr>');
		attack.push('</thead>');

		attack.push('<tbody>');

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

			let mb =cache['bonuses'].find(o => (o['type'] === 'military_boost')),
				at =cache['bonuses'].find(o => (o['type'] === 'advanced_tactics')),
				ab =cache['bonuses'].find(o => (o['type'] === 'attack_boost')),
				a = type['baseDamage'] + mb['value'] + at['value'] + ab['value'];

			attack.push('<td>' + a + '</td>');

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
		defense.push('<th>Einheit</th>');
		defense.push('<th>Anzahl</th>');
		defense.push('</tr>');
		defense.push('</thead>');

		defense.push('<tbody>');

		for(let i in Unit.Defense)
		{
			if(!Unit.Defense.hasOwnProperty(i)){
				break;
			}

			defense.push('<tr>');

			let d = Unit.Types.find(obj => (obj['unitTypeId'] === Unit.Defense[i]['unitTypeId']));

			defense.push('<td><span class="units-icon ' + Unit.Defense[i]['unitTypeId'] + '"></span></td>');
			defense.push('<td>' + d['name'] + '</td>');
			defense.push('<td>1</td>');
			defense.push('</tr>');
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
		pool.push('<th>Einheit</th>');
		pool.push('<th class="text-center">Gebunden</th>');
		pool.push('<th class="text-center">Ungebunden</th>');
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
		

		// fertige Tabelle zusammen setzten
		let h = [];

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
	 * Setzt alle gespeicherten Tabellen zusammen
	 *
	 * @returns {string}
	 * @constructor
	 */
	GetTabContent: ()=> {
		return Unit.TabsContent.join('');
	}
};