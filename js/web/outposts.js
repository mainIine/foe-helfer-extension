/*
 * **************************************************************************************
 *
 * Dateiname:                 outposts.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       24.10.19, 13:25 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

/**
 *
 * @type
 * 	{
 * 		{
 * 			Order: {},
 * 			GetAll: Outposts.GetAll,
 * 			Currency: {},
 * 			BuildBoxContent: Outposts.BuildBoxContent,
 * 			Service: {},
 * 			SaveConsumables:
 * 			Outposts.SaveConsumables,
 * 			BuildBox: Outposts.BuildBox,
 * 			CollectResources: Outposts.CollectResources
 * 		}
 * 	}
 */
let Outposts = {

	Service: {},
	Currency: {},
	Order:{},
	DiplomacyBuildings: null,

	/**
	 * Füg eine Box in den DOM ein
	 *
	 * @constructor
	 */
	BuildInfoBox: ()=> {

		let db = localStorage.getItem('OutpostConsumables');

		if(db !== null)
		{
			Outposts.DiplomacyBuildings = JSON.parse(db);
		}

		if( $('#outpostConsumables').length === 0 )
		{
			let args = {
				'id': 'outpostConsumables',
				'title': i18n['Boxes']['Outpost']['Title'],
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			};

			HTML.Box(args);
		}

		Outposts.BuildInfoBoxContent();
	},


	/**
	 * Setzt den INhalt der Box zusammen
	 *
	 * @constructor
	 */
	BuildInfoBoxContent: ()=> {
		if(Outposts.DiplomacyBuildings === null)
		{
			return ;
		}

		let t = [],
			ct = [],
			bd = JSON.parse(sessionStorage.getItem('BuildingsData')),
			c = Outposts.DiplomacyBuildings,
			pr = JSON.parse(localStorage.getItem('OutpostConsumablesResources')),
			cn = localStorage.getItem('OutpostConsumablesCurrencyName'),
			cv = localStorage.getItem('OutpostConsumablesCurrencyValue'),
			type = localStorage.getItem('OutpostConsumablesCurrencyType'),
			all = Outposts.Order[type],
			pb = [];

		$('#outpostConsumablesHeader > .title').text(i18n['Boxes']['Outpost']['TitleShort'] + Outposts.Service[type].name );


		// Diplomatische Gebäude raussuchen, die erforscht sind
		for(let x in c)
		{
			if(c.hasOwnProperty(x) && c[x]['rewards'][0].toLowerCase().indexOf('diplomacy') > -1 && c[x]['isUnlocked'])
			{
				let b = bd.find(obj => (obj['asset_id'] === c[x]['rewards'][0]));

				pb.push({
					name: c[x]['name'],
					diplomacy: b['staticResources']['resources']['diplomacy'],
				});
			}
		}

		// Array umdrehen
		pb = pb.reverse();

		t.push('<p class="text-right"><strong>' + GoodsNames[cn] + ': ' + HTML.Format(cv) + '</strong></p>');

		t.push('<table class="foe-table">');
		t.push('<thead>');
		t.push('<tr>');
		t.push('<th>' + i18n['Boxes']['Outpost']['TitleBuildings'] + '</th>');
		t.push('<th class="text-center">' + i18n['Boxes']['Outpost']['TitleFree'] + '</th>');

		// Güter durchsteppen
		for(const good of all)
		{
			t.push('<th class="text-center">' + GoodsNames[ good ] + '</th>');

			// falls nicht alle übermittelt wurde, mit "0" auffüllen
			if(pr[good] === undefined)
			{
				pr[good] = 0;
			}
		}

		t.push('</tr>');
		t.push('</thead>');
		t.push('</tbody>');

		let ulnc = false,
			check = false;

		for(let i in c)
		{
			if(c.hasOwnProperty(i))
			{
				let unl = c[i]['isUnlocked'];

				if(unl === false)
				{
					check = true;
				}

				t.push('<tr>');

				t.push('<td>' + c[i]['name'] + '</td>');

				t.push('<td class="text-center">' + (c[i]['isUnlocked'] ? '&#10004;' : '&#10060;' ) + '</td>');

				let res = c[i]['requirements']['resources'];

				for(const good of all)
				{
					if(res[good] !== undefined && res[good] > 0)
					{
						t.push('<td class="text-center">');

						// Zeile mit dem nächsten unerforschtem Gebäude
						if(ulnc === false && unl === false)
						{

							t.push( ( res[good] > pr[good] ? res[good] + ' <small class="text-danger">' + (pr[good] - res[good]) + '</small>' : '<span class="text-success">' + res[good] + '</span>' ) );

							// Empfehlung für Diplomatie
							if(good === 'diplomacy')
							{
								let content = [],
									rest = (res[good] - pr[good]);

								if(rest > 0)
								{
									pb.forEach((item, i)=> {

										// letzte Element des Arrays
										if (i === pb.length-1 && rest > 0){
											let c = Math.ceil(rest / item['diplomacy']);
											content.push(c + 'x ' + item['name']);

										} else {
											let c = Math.floor(rest / item['diplomacy']);

											// passt in den Rest
											if(c > 0) {
												rest -= (item['diplomacy'] * c);
												content.push(c + 'x ' + item['name']);
											}
										}
									});

									t.push('<span class="diplomacy-ask">?<span class="diplomacy-tip">' + content.join('<br>') + '</span></span>');
								}
							}

						} else {

							// bereits erforscht
							if(unl === true)
							{
								t.push('<span class="text-muted">' + res[good] + '</span>');
							} else {
								t.push(res[good]);
							}
						}

						t.push('</td>');

						if(unl === false && good !== 'diplomacy')
						{
							if(ct[good] === undefined)
							{
								ct[good] = res[good];
							} else {
								ct[good] += res[good];
							}

						}


					} else {
						t.push('<td></td>');
					}
				}

				t.push('</tr>');

				ulnc = check;
			}
		}



		t.push('<tr class="total-row">');

		t.push('<td>' + i18n['Boxes']['Outpost']['DescRequired'] + '</td><td></td>');

		for(const good of all)
		{
			if(good !== 'diplomacy')
			{
				t.push('<td class="text-center">' + ct[ good ] + '</td>');
			} else {
				t.push('<td></td>');
			}
		}

		t.push('</tr>');

		t.push('<tr class="resource-row">');

		t.push('<td>' + i18n['Boxes']['Outpost']['DescInStock'] + '</td><td></td>');

		for(const good of all)
		{
			t.push('<td class="text-center">' + pr[ good ] + '</td>');
		}

		t.push('</tr>');


		t.push('<tr class="total-row">');

		t.push('<td><strong>' + i18n['Boxes']['Outpost']['DescStillMissing'] + '</strong></td><td colspan=""></td>');

		for(const good of all)
		{
			if(good !== 'diplomacy')
			{
				let tt = (pr[good] - ct[good]);

				t.push('<td class="text-center text-' + (tt < 0 ? 'danger' : 'success') + '">' + tt + '</td>');

			} else {
				t.push('<td></td>');
			}
		}

		t.push('</tr>');


		t.push('</tbody>');
		t.push('</table>');


		$('#outpostConsumablesBody').html(t.join(''));
	},


	/**
	 * Sammelt beim StartUp alle Infos zu den Außenposten
	 *
	 * @param d
	 * @constructor
	 */
	GetAll: (d)=> {

		for(let i in d)
		{
			if(d.hasOwnProperty(i) && d[i]['isActive'])
			{
				let ct = d[i]['content'];

				Outposts.Service[ct] = {
					name: d[i]['name']
				};

				Outposts.Order[ct] = d[i]['goodsResourceIds'];
				Outposts.Order[ct].push('diplomacy');

				Outposts.Currency[ d[i]['goodsResourceIds'][0] ] = {
					currency: d[i]['primaryResourceId'],
					type: d[i]['populationResourceId']
				}
			}
		}
	},


	/**
	 * Sucht die benötigten Resources für den Außenposten heraus
	 *
	 * @param d
	 * @constructor
	 */
	CollectResources: (d)=>{

		let ct = localStorage.getItem('OutpostConsumablesTypes'),
			pr = {},
            type;

        if (ct === null) return;

        ct = JSON.parse(ct);

		// den eigentlichen Typen ermitteln
		for(let name in Outposts.Currency)
		{
			if(ct.hasOwnProperty(name))
			{
				type = Outposts.Currency[name]['type'];
				break;
			}
		}


		// die Währung ermitteln
		for(let name in Outposts.Currency)
		{
			if(Outposts.Currency.hasOwnProperty(name))
			{
				if(d[name] !== undefined && Outposts.Currency[name]['type'] === type)
				{

					localStorage.setItem('OutpostConsumablesCurrencyName', Outposts.Currency[name]['currency']);
					localStorage.setItem('OutpostConsumablesCurrencyValue', d[Outposts.Currency[name]['currency']]);
					localStorage.setItem('OutpostConsumablesCurrencyType', Outposts.Currency[name]['type']);

					break;
				}
			}
		}


		// die Güter ermittlen
		for (let i = 0; i < Outposts.Order[type].length; i++)
		{
			pr[Outposts.Order[type][i]] = d[Outposts.Order[type][i]];
		}

		localStorage.setItem('OutpostConsumablesResources', JSON.stringify(pr));

		if( $('#outpostConsumables').is(':visible') )
		{
			Outposts.BuildInfoBoxContent();
		}
	},


	/**
	 * Sammelt die Güter des Außenpostens ein und färbt den Button grün
	 *
	 * @param d
	 * @constructor
	 */
	SaveConsumables: (d)=>{
		localStorage.setItem('OutpostConsumables', JSON.stringify(d));

		Outposts.DiplomacyBuildings = d;

		$('#outPW').remove();
		$('#outPostBtn').removeClass('hud-btn-red');

		let res = d[ d.length-1 ]['requirements']['resources'];
		localStorage.setItem('OutpostConsumablesTypes', JSON.stringify(res));
	},


	Extensions: ()=> {
		return {
			vikings: {
				1: {axes: 1, mead: 1, horns: 1, wool: 1},
				2: {axes: 5, mead: 1, horns: 1, wool: 1},
				3: {axes: 12, mead: 1, horns: 1, wool: 1},
				4: {axes: 21, mead: 5, horns: 1, wool: 1},
				5: {axes: 32, mead: 12, horns: 1, wool: 1},
				6: {axes: 41, mead: 21, horns: 5, wool: 1},
				7: {axes: 48, mead: 32, horns: 12, wool: 1},
				8: {axes: 55, mead: 41, horns: 21, wool: 5},
				9: {axes: 62, mead: 48, horns: 32, wool: 12},
				10: {axes: 69, mead: 55, horns: 41, wool: 21},
				11: {axes: 76, mead: 62, horns: 48, wool: 32},
				12: {axes: 82, mead: 69, horns: 55, wool: 41},
				13: {axes: 89, mead: 76, horns: 62, wool: 48},
				14: {axes: 96, mead: 82, horns: 69, wool: 55},
				15: {axes: 103, mead: 89, horns: 76, wool: 62},
				16: {axes: 110, mead: 69, horns: 82, wool: 69}
			},
			japanese: {
				1: {soy: 8, paintings: 8, armor: 8, instruments: 8},
				2: {soy: 19, paintings: 8, armor: 8, instruments: 8},
				3: {soy: 31, paintings: 19, armor: 8, instruments: 8},
				4: {soy: 46, paintings: 31, armor: 8, instruments: 8},
				5: {soy: 51, paintings: 46, armor: 19, instruments: 8},
				6: {soy: 56, paintings: 51, armor: 31, instruments: 8},
				7: {soy: 60, paintings: 56, armor: 46, instruments: 19},
				8: {soy: 65, paintings: 60, armor: 51, instruments: 31},
				9: {soy: 70, paintings: 65, armor: 56, instruments: 46},
				10: {soy: 74, paintings: 70, armor: 60, instruments: 51},
				11: {soy: 79, paintings: 74, armor: 65, instruments: 56},
				12: {soy: 84, paintings: 79, armor: 70, instruments: 60}
			}
		};
	}
};