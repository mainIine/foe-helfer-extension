/*
 * **************************************************************************************
 *
 * Dateiname:                 outpost.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       19.07.19 13:14 Uhr
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
 * 			GetAll: Outpost.GetAll,
 * 			Currency: {},
 * 			BuildBoxContent: Outpost.BuildBoxContent,
 * 			Service: {},
 * 			SaveConsumables:
 * 			Outpost.SaveConsumables,
 * 			BuildBox: Outpost.BuildBox,
 * 			CollectResources: Outpost.CollectResources
 * 		}
 * 	}
 */
Outpost = {

	Service: {},
	Currency: {},
	Order:{},
	DiplomacyBuildings: null,

	/**
	 * Füg eine Box in den DOM ein
	 *
	 * @constructor
	 */
	BuildBox: ()=> {

		let db = localStorage.getItem('OutpostDiplomacyBuildings');

		if(db !== null)
		{
			Outpost.DiplomacyBuildings = JSON.parse(db);
		}

		if( $('#outpostConsumables').length === 0 )
		{
			HTML.Box('outpostConsumables', i18n['Boxes']['Outpost']['Title']);
		}

		Outpost.BuildBoxContent();

		// Schliessen Button binden
		$('#outpostConsumablesclose').bind('click', function() {
			$('#outpostConsumables').remove();
		});
	},


	/**
	 * Setzt den INhalt der Box zusammen
	 *
	 * @constructor
	 */
	BuildBoxContent: ()=> {

		let t = [],
			ct = [],
			c = JSON.parse(localStorage.getItem('OutpostConsumables')),
			pr = JSON.parse(localStorage.getItem('OutpostConsumablesResources')),
			cn = localStorage.getItem('OutpostConsumablesCurrencyName'),
			cv = localStorage.getItem('OutpostConsumablesCurrencyValue'),
			type = localStorage.getItem('OutpostConsumablesCurrencyType'),
			all = c[ c.length-1 ]['requirements']['resources'],
			db = Outpost.DiplomacyBuildings.filter(obj => (obj['abilities'][0]['content'] === type)),
			pb = [];

		pb.push({
			name: db[0]['name'],
			diplomacy: db[0]['staticResources']['resources']['diplomacy']
		});

		// Diplomatische Gebäude duchsteppen
		for(let b in db)
		{
			if(db.hasOwnProperty(b))
			{
				for(let x in c)
				{
					if(c.hasOwnProperty(x) && c[x]['rewards'][0] === db[b]['asset_id'] && c[x]['isUnlocked'])
					{
						pb.push({
							name: db[b]['name'],
							diplomacy: db[b]['staticResources']['resources']['diplomacy'],
						});
					}
				}
			}
		}

		// Array umdrehen
		pb = pb.reverse();

		localStorage.setItem('OutpostConsumablesTypes', JSON.stringify(all));


		t.push('<p class="text-right"><strong>' + GoodsNames[cn] + ': ' + cv + '</strong></p>');

		t.push('<table class="foe-table">');
		t.push('<thead>');
		t.push('<tr>');
		t.push('<th>Gebäude</th>');
		t.push('<th class="text-center">Frei</th>');


		for(let name in pr)
		{
			if(pr.hasOwnProperty(name))
			{
				t.push('<th class="text-center">' + GoodsNames[ name ] + '</th>');
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

				for(let name in pr)
				{
					if(pr.hasOwnProperty(name))
					{
						if(res[name] !== undefined && res[name] > 0)
						{
							t.push('<td class="text-center">');

							// Zeile mit dem nächsten unerforschtem Gebäude
							if(ulnc === false && unl === false)
							{

								t.push( ( res[name] > pr[name] ? res[name] + ' <small class="text-danger">' + (pr[name] - res[name]) + '</small>' : '<span class="text-success">' + res[name] + '</span>' ) );

								// Empfehlung für Diplomatie
								if(name === 'diplomacy')
								{
									let content = [],
										rest = (res[name] - pr[name]);

									if(rest > 0)
									{
										pb.forEach((item, i)=> {

											// letzte Element des Arrays
											if (i === pb.length-1){
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
									t.push('<span class="text-muted">' + res[name] + '</span>');
								} else {
									t.push(res[name]);
								}
							}

							t.push('</td>');

							if(unl === false && name !== 'diplomacy')
							{
								if(ct[name] === undefined)
								{
									ct[name] = res[name];
								} else {
									ct[name] += res[name];
								}

							}


						} else {
							t.push('<td></td>');
						}
					}
				}

				t.push('</tr>');

				ulnc = check;
			}
		}



		t.push('<tr class="total-row">');

		t.push('<td>Rest - Gesamt</td><td></td>');

		for(let name in pr)
		{
			if(pr.hasOwnProperty(name))
			{
				if(name !== 'diplomacy')
				{
					t.push('<td class="text-center">' + ct[ name ] + '</td>');
				} else {
					t.push('<td></td>');
				}

			}
		}

		t.push('</tr>');


		t.push('<tr class="resource-row">');

		t.push('<td>Verfügbar</td><td></td>');

		for(let name in pr)
		{
			if(pr.hasOwnProperty(name))
			{
				t.push('<td class="text-center">' + pr[ name ] + '</td>');
			}
		}

		t.push('</tr>');


		t.push('<tr class="total-row">');

		t.push('<td><strong>Fehlt noch</strong></td><td colspan=""></td>');

		for(let name in pr)
		{
			if(pr.hasOwnProperty(name))
			{
				if(name !== 'diplomacy')
				{
					let tt = (pr[name] - ct[name]);

					t.push('<td class="text-center text-' + (tt < 1 ? 'danger' : 'success') + '">' + tt + '</td>');
				} else {
					t.push('<td></td>');
				}
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

				Outpost.Service[ct] = {
					name: d[i]['name']
				};

				Outpost.Order[ct] = d[i]['goodsResourceIds'];
				Outpost.Order[ct].push('diplomacy');

				Outpost.Currency[ d[i]['goodsResourceIds'][0] ] = {
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
	CollectResources: (d)=> {
		let ct = localStorage.getItem('OutpostConsumablesTypes'),
			pr = {},
			type;

		if(ct === null)
		{
			return;
		}

		ct = JSON.parse(ct);


		// den eigentlichen Typen ermitteln
		for(let name in Outpost.Currency)
		{
			if(ct.hasOwnProperty(name))
			{
				type = Outpost.Currency[name]['type'];
				break;
			}
		}


		// die Währung ermitteln
		for(let name in Outpost.Currency)
		{
			if(Outpost.Currency.hasOwnProperty(name))
			{
				if(d[name] !== undefined)
				{
					localStorage.setItem('OutpostConsumablesCurrencyName', Outpost.Currency[name]['currency']);
					localStorage.setItem('OutpostConsumablesCurrencyValue', d[Outpost.Currency[name]['currency']]);
					localStorage.setItem('OutpostConsumablesCurrencyType', Outpost.Currency[name]['type']);

					break;
				}
			}
		}


		// die Güter ermittlen
		for (let i = 0; i < Outpost.Order[type].length; i++)
		{
			pr[Outpost.Order[type][i]] = d[Outpost.Order[type][i]];
		}

		localStorage.setItem('OutpostConsumablesResources', JSON.stringify(pr));

		Outpost.BuildBoxContent();
	},


	/**
	 * Sammelt die Güter des Außenpostens ein und färbt den Button grün
	 *
	 * @param d
	 * @constructor
	 */
	SaveConsumables: (d)=>{
		localStorage.setItem('OutpostConsumables', JSON.stringify(d));

		$('#outPW').remove();
		$('#outP').removeClass('hud-btn-red');

		let res = d[ d.length-1 ]['requirements']['resources'];

		localStorage.setItem('OutpostConsumablesTypes', JSON.stringify(res));
	},

};