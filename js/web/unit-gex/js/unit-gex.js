/*
 * **************************************************************************************
 *
 * Dateiname:                 unit-gex.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              05.01.21, 14:15 Uhr
 * zuletzt bearbeitet:       05.01.21, 14:15 Uhr
 *
 * Copyright © 2021
 *
 * **************************************************************************************
 */

/*
 * **************************************************************************************
 *
 * Dateiname:                 unit-gex.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              04.01.21, 17:39 Uhr
 * zuletzt bearbeitet:       04.01.21, 17:39 Uhr
 *
 * Copyright © 2021
 *
 * **************************************************************************************
 */


// Encounter, get round number
FoEproxy.addHandler('GuildExpeditionService', 'getEncounter', (data, postData) => {
	if(postData[0]['requestClass'] !== 'GuildExpeditionService')
		return;

	UnitGex.DB_Data['id'] = ((postData[0]['requestData'][0] / 2) + 1);
});


// After battle
FoEproxy.addHandler('BattlefieldService', 'startByBattleType', (data, postData) => {
	if(postData[0]['requestData'][0]['type'] !== 'guild_expedition')
		return;

	let round = data['responseData']['battleType']['currentWaveId'] || 0;

	if(round === 0)
	{
		UnitGex.DB_Data['Units'] = [];
	}

	UnitGex.DB_Data['Units'][round] = data['responseData']['state']['unitsOrder'];

	// all rounds ended?
	if((data['responseData']['battleType']['totalWaves'] -1) === round)
	{
		UnitGex.DB_Data['Data'] = {
			winner: data['responseData']['state']['winnerBit'],
			isAutoBattle: data['responseData']['isAutoBattle'],
			era: data['responseData']['battleType']['era'],
			totalWaves: data['responseData']['battleType']['totalWaves'],
			date: moment(MainParser.getCurrentDate()).toDate()
		};

		UnitGex.insertIntoDB();
	}
});


let UnitGex = {

	db: null,
	UnitsLoaded: false,
	DB_Data: [],

	/**
	 *
	 * @returns {Promise<void>}
	 */
	checkForDB: async (playerID)=> {

		UnitGex.db = new Dexie(`FoeHelperDB_UnitsGEX_${playerID}`);

		UnitGex.db.version(1).stores({
			Units: 'id,Units,Data'
		});
	},


	insertIntoDB: async ()=> {

		// insert or update the entry
		await UnitGex.db['Units']
			.put(UnitGex.DB_Data)
			.catch((err) => {
				console.log('Error: ', err);
				console.log('Data: ', UnitGex.DB_Data);
			});

		UnitGex.DB_Data = [];
	},


	showBox: ()=> {

		if( $('#unitsGex').length < 1 )
		{
			// CSS into the DOM
			HTML.AddCssFile('unit');
			HTML.AddCssFile('unit-gex');

			HTML.Box({
				id: 'unitsGex',
				title: i18n('Menu.unitsGex.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true
			});

			$('#unitsGexBody').append(
				`<div class="dark-bg head">
					<div class="text-warning"></div>
					<div class="text-right"></div>
				</div>`,
				`<div id="unitsGexBodyInner"></div>`
			);
		}

		UnitGex.buildBody();
	},


	buildBody: async ()=> {

		if(!Unit.Cache)
		{
			$('#unitsGexBodyInner').html(`<div class="no-units">${i18n('Boxes.UnitsGex.NoUnitsAvailable')}</div>`);

			document.addEventListener('keydown', (event)=> {
				const key = event.key;

				if($('#unitsGex').length > 0 && key.toLowerCase() === 'u' ){
					setTimeout(()=>{
						UnitGex.buildBody();
					},300)
				}
			});

			return;
		}

		let tr = [];

		const Units = await UnitGex.db['Units'].orderBy('id').toArray();

		for (let i = 1; i <= 64; i++)
		{
			const entries = Units.filter(e => e.id === i);

			tr.push(`<div class="foehelper-accordion id-${i}">`);


			if(entries.length === 0)
			{
				tr.push(`<div class="foehelper-accordion-head dark-bg ${i}-head">
							<strong class="text-warning">${i}.</strong> <em class="text-muted">kein Eintrag gefunden</em>
						</div>`);
			}

			else {
				const E = entries[0];

				tr.push(`<div class="foehelper-accordion-head dark-bg ${i}-head" onclick="UnitGex.ToggleHeader('${i}')">
							<strong class="text-warning">${i}.</strong> <strong class="text-${E['Data']['winner'] === 1 ? 'success' : 'danger'}">${E['Data']['winner'] === 1 ? 'Gewonnen' : 'Verloren'}</strong>
						</div>`);

				tr.push(`<div class="foehelper-accordion-body ${i}-body">`);

				tr.push(	`<div class="unitgex-stats">Lorem ipsum</div>`);

				tr.push(	`<div class="waves">`);

				const OT1 = E['Units'][0].filter(e => e['teamFlag'] === 1).sort((a, b) => a['initialUnitOrderIndex'] - b['initialUnitOrderIndex']);
				const ET1 = E['Units'][0].filter(e => e['teamFlag'] === 2).sort((a, b) => a['initialUnitOrderIndex'] - b['initialUnitOrderIndex']);

				tr.push(		`<div class="wave-1 own">`);

				OT1.forEach((el, i) => {
					tr.push(UnitGex.PrepareUnit(el));
				});

				tr.push(		`</div>`);

				tr.push(		`<div class="wave-1 enemy">`);

				ET1.forEach((el, i) => {
					tr.push(UnitGex.PrepareUnit(el));
				});

				tr.push(		`</div>`);
				tr.push(	`</div>`);
				tr.push(`</div>`);


			}

			tr.push(`</div>`);
		}

		$('#unitsGexBodyInner').html(tr.join('')).promise().done(function(){

		});
	},


	PrepareUnit: (entry)=> {
		let type = Unit.Types.find(obj => (obj['unitTypeId'] === entry['unitTypeId'])),
			cache = Unit.Cache['units'].find(obj => (obj['unitId'] === entry['unitId'])),
			era = Technologies.Eras[type['minEra']];

		return `<span class="units-icon ${entry['unitTypeId']}"></span>`;
	},


	ToggleHeader: (id)=> {
		let $this = $(`.id-${id}`),
			isOpen = $this.hasClass('open');

		$('#unitsGexBodyInner .foehelper-accordion').removeClass('open');

		if(!isOpen){
			$this.addClass('open');
		}
	}
};

