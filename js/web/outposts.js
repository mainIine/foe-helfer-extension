/*
 * **************************************************************************************
 *
 * Dateiname:                 outposts.js
 * Projekt:                   foe
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * zu letzt bearbeitet:       11.11.19, 20:09 Uhr
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
 * 			OutpostData: ,
 * 			DiplymacyBuildings: ,
 * 			Resources ,
 * 			GetAll: Outposts.GetAll,
 *          BuildBoxContent: Outposts.BuildBoxContent,
 *          SaveConsumables:
 * 			Outposts.SaveConsumables,
 * 			BuildBox: Outposts.BuildBox,
 * 			CollectResources: Outposts.CollectResources
 * 		}
 * 	}
 */
let Outposts = {
    OutpostData : null,
    DiplomacyBuildings : null,
    Currency : null,
    Resources : null,

	/**
	 * Füg eine Box in den DOM ein
	 *
	 * @constructor
	 */
	BuildInfoBox: ()=> {

        let OutpostBuildings = localStorage.getItem('OutpostBuildings');

		if(OutpostBuildings !== null)
		{
			Outposts.DiplomacyBuildings = JSON.parse(OutpostBuildings);
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
            BuildingsData = JSON.parse(sessionStorage.getItem('BuildingsData')),
            Buildings = Outposts.DiplomacyBuildings,
            UnlockedDiplomacyBuildings =[];

        $('#outpostConsumablesHeader > .title').text(i18n['Boxes']['Outpost']['TitleShort'] + Outposts.OutpostData['contentName']);

		// Diplomatische Gebäude raussuchen, die erforscht sind
		for(let i in Buildings)
		{
            if (Buildings.hasOwnProperty(i) && Buildings[i]['rewards'][0].toLowerCase().indexOf('diplomacy') > -1 && Buildings[i]['isUnlocked'])
			{
                let BuildingData = BuildingsData.find(obj => (obj['asset_id'] === Buildings[i]['rewards'][0]));

                UnlockedDiplomacyBuildings.push({
					name: Buildings[i]['name'],
                    diplomacy: BuildingData['staticResources']['resources']['diplomacy'],
				});
			}
		}

		// Array umdrehen
        UnlockedDiplomacyBuildings = UnlockedDiplomacyBuildings.reverse();

        t.push('<p class="text-right"><strong>' + GoodsData[Outposts.OutpostData['primaryResourceId']]['name'] + ': ' + HTML.Format(ResourceStock[Outposts.OutpostData['primaryResourceId']]) + '</strong></p>');

		t.push('<table class="foe-table">');
		t.push('<thead>');
		t.push('<tr>');
		t.push('<th>' + i18n['Boxes']['Outpost']['TitleBuildings'] + '</th>');
		t.push('<th class="text-center">' + i18n['Boxes']['Outpost']['TitleFree'] + '</th>');

		// Güter durchsteppen
		for(let ResourceID in Outposts.Resources)
		{
            t.push('<th class="text-center">' + GoodsData[ResourceID]['name'] + '</th>');

			// falls nicht alle übermittelt wurde, mit "0" auffüllen
            if (Outposts.Resources[ResourceID] === undefined)
			{
                Outposts.Resources[ResourceID] = 0;
			}
		}

		t.push('</tr>');
		t.push('</thead>');
		t.push('</tbody>');

		let ulnc = false,
			check = false;

		for(let i in Buildings)
		{
            if (Buildings.hasOwnProperty(i))
			{
                let unl = Buildings[i]['isUnlocked'];

				if(unl === false)
				{
					check = true;
				}

				t.push('<tr>');

                t.push('<td>' + Buildings[i]['name'] + '</td>');

                t.push('<td class="text-center">' + (Buildings[i]['isUnlocked'] ? '&#10004;' : '&#10060;') + '</td>');

                let res = Buildings[i]['requirements']['resources'];

                for (let ResourceID in Outposts.Resources)
				{
                    if (res[ResourceID] !== undefined && res[ResourceID] > 0)
					{
						t.push('<td class="text-center">');

						// Zeile mit dem nächsten unerforschtem Gebäude
						if(ulnc === false && unl === false)
						{

                            t.push((res[ResourceID] > Outposts.Resources[ResourceID] ? res[ResourceID] + ' <small class="text-danger">' + (Outposts.Resources[ResourceID] - res[ResourceID]) + '</small>' : '<span class="text-success">' + res[ResourceID] + '</span>' ) );

							// Empfehlung für Diplomatie
                            if (ResourceID === 'diplomacy')
							{
								let content = [],
                                    rest = (res[ResourceID] - Outposts.Resources[ResourceID]);

								if(rest > 0)
								{
									UnlockedDiplomacyBuildings.forEach((item, i)=> {

										// letzte Element des Arrays
                                        if (i === UnlockedDiplomacyBuildings.length-1 && rest > 0){
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
								t.push('<span class="text-muted">' + res[ResourceID] + '</span>');
							} else {
                                t.push(res[ResourceID]);
							}
						}

						t.push('</td>');

						if(unl === false && ResourceID !== 'diplomacy')
						{
                            if (ct[ResourceID] === undefined)
							{
                                ct[ResourceID] = res[ResourceID];
							} else {
                                ct[ResourceID] += res[ResourceID];
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

        for (let ResourceID in Outposts.Resources)
		{
            if (ResourceID !== 'diplomacy')
			{
                t.push('<td class="text-center">' + ct[ResourceID] + '</td>');
			} else {
				t.push('<td></td>');
			}
		}

		t.push('</tr>');

		t.push('<tr class="resource-row">');

		t.push('<td>' + i18n['Boxes']['Outpost']['DescInStock'] + '</td><td></td>');

        for (let ResourceID in Outposts.Resources)
		{
            t.push('<td class="text-center">' + Outposts.Resources[ResourceID] + '</td>');
		}

		t.push('</tr>');


		t.push('<tr class="total-row">');

		t.push('<td><strong>' + i18n['Boxes']['Outpost']['DescStillMissing'] + '</strong></td><td colspan=""></td>');

        for (let ResourceID in Outposts.Resources)
		{
            if (ResourceID !== 'diplomacy')
			{
                let tt = (Outposts.Resources[ResourceID] - ct[ResourceID]);

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
    GetAll: (d) => {
        let LastStartedPos,
            LastStartedTime = 0;

		for(let i in d)
		{
			if(d.hasOwnProperty(i) && d[i]['isActive'])
            {
                if (d[i]['startedAt'] !== undefined && d[i]['startedAt'] > LastStartedTime) {
                    LastStartedPos = i;
                    LastStartedTime = d[i]['startedAt'];
                }
			}
        }

        if (LastStartedPos !== undefined) {
            let OldOutpostType = localStorage.getItem('OutpostType'),
                NewOutpostType = d[LastStartedPos]['content'];

            if (OldOutpostType === undefined || OldOutpostType !== NewOutpostType) {
                localStorage.setItem('OutpostType', NewOutpostType);
                localStorage.removeItem('OutpostBuildings'); //Typ des Außenpostens hat sich geändert => Gebäude löschen => führt dazu, dass Button erst nach dem Besuch des Außenpostens grün wird
            }

            Outposts.OutpostData = d[LastStartedPos];
        }
	},


	/**
	 * Sucht die benötigten Resources für den Außenposten heraus
	 *
	 * @param d
	 * @constructor
	 */
    CollectResources: () => {
        if (Outposts.OutpostData === null) return; //Kein Außenposten aktiv

        let Goods = {},
            type; //Todo: Laden

		// die Güter ermittlen
        for (let i = 0; i < Outposts.OutpostData['goodsResourceIds'].length; i++)
        {
            let GoodName = Outposts.OutpostData['goodsResourceIds'][i];
            Goods[GoodName] = ResourceStock[GoodName];
        }
        Outposts.Resources = Goods
        Outposts.Resources['diplomacy'] = ResourceStock['diplomacy'];

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
	SaveBuildings: (d)=>{
        localStorage.setItem('OutpostBuildings', JSON.stringify(d));

		Outposts.DiplomacyBuildings = d;

		$('#outPW').remove();
		$('#outPostBtn').removeClass('hud-btn-red');
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