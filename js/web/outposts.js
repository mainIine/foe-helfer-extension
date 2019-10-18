/*
 * **************************************************************************************
 *
 * Dateiname:                 outposts.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       07.10.19, 16:51 Uhr
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
};