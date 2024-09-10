/*
 * *************************************************************************************
 *
 * Copyright (C) 2024 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

FoEproxy.addFoeHelperHandler('InventoryUpdated', () => {
	if ($('#combat-power').length>0) CombatPower.Init(true);
});

let CombatPower = {

	Buildings: [],

	Mapping: {
		all: '',
		guild_raids: '_gr',
		guild_expedition: '_gex',
		battleground: '_gbg'
	},


	Init: (keepOpen=false)=> {

		CombatPower.Buildings = []

		for(let id in MainParser.CityEntities) {
			if(!MainParser.CityEntities.hasOwnProperty(id)){
				continue
			}

			// if starts not with "W_", continue
			if(id.slice(0, 2) !== 'W_'){
				continue
			}

			let entity = MainParser.CityEntities[id],
				asset_id = entity['asset_id'],
				ageBoost = entity['components'][CurrentEra],
				sizes = entity['components']['AllAge']['placement']['size']


			for(let i in MainParser.Inventory){
				if(!MainParser.Inventory.hasOwnProperty(i)){
					continue
				}

				let InventoryItem = MainParser.Inventory[i]

				if(InventoryItem['item']['cityEntityId'] === asset_id){
					if(ageBoost === undefined){
						continue
					}

					if(ageBoost['boosts'] === undefined){
						continue
					}

					let rating = Productions.rateBuildings([id],true)[0]

					CombatPower.Buildings.push({
						id: id,
						asset_id: asset_id,
						width: sizes['y'],
						length: sizes['x'],
						stock: InventoryItem['inStock'],
						boosts: ageBoost['boosts']['boosts'],
						name: entity['name'],
						street: rating.building.needsStreet || 0,
						score: rating.score
					})

					break
				}
			}
		}

		//console.log(CombatPower.Buildings)

		CombatPower.BuildBox(keepOpen)
	},


	BuildBox: (keepOpen=false) => {

		if ($('#combat-power').length > 0)
		{
			if (!keepOpen) {
				HTML.CloseOpenBox('combat-power')
				return
			}
		} else {
			HTML.Box({
				id: 'combat-power',
				title: i18n('Boxes.CombatCalculator.Title'),
				//ask: i18n('Boxes.CombatCalculator.HelpLink'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true
			})
			HTML.AddCssFile('combat_power')
		}

		let c = []

		c.push(`<table class="foe-table sortable-table">`)

		c.push('<thead>')
		c.push('<tr class="sorter-header">')

		c.push('<td></td>')
		c.push(`<td>${i18n('Boxes.CombatCalculator.Name')}</td>`)
		c.push(`<td>${i18n('Boxes.CombatCalculator.Size')}</td>`)
		c.push(`<td>${i18n('Boxes.CombatCalculator.Values')}</td>`)
		c.push(`<td>${i18n('Boxes.CombatCalculator.Efficiency')}</td>`)

		c.push('</tr>')
		c.push('</thead>')

		c.push('<tbody>')

		let streetImg = {
			0:"",
			1:`</span><img src="${srcLinks.get('/shared/icons/road_required.png',true)}" alt="">`,
			2:`</span><img src="${srcLinks.get('/shared/icons/street_required.png',true)}" alt="">`,
		}
		CombatPower.Buildings.sort((a,b)=>b.score-a.score)
		for(let b of CombatPower.Buildings){
			
			c.push(`<tr>`)

			let url = '/city/buildings/' + [b['asset_id'].slice(0, 1), '_SS', b['asset_id'].slice(1)].join('') + '.png'
			url = srcLinks.get(url,true)
			
			c.push(`<td><div class="image"><img src="${url}" alt=""><strong class="in-stock">${b.stock}</strong></div></td>`)
			c.push(`<td>${b.name}<br></td>`) //<small>${b.id}</small> removed
			c.push(`<td>${b.width}x${b.length}<br>${streetImg[b.street]}</td>`)
			c.push(`<td>`)
	
			for(let y of Object.values(b.boosts)){
				let icon = srcLinks.get(`/shared/icons/${y['type']}${CombatPower.Mapping[y.targetedFeature]}.png`,true)

				c.push(`<span class="boost-amount">${y.value}% <img loading="lazy" src="${icon}" alt=""></span>`)
			}

			c.push(`</td>`)
			c.push(`<td title="${i18n('Boxes.CombatCalculator.EfficiencyTT')}">${Math.round(b.score*100)}</td>`)

			c.push(`</tr>`)
		}

		c.push('</tbody>')

		c.push(`</table>`)

		$('#combat-powerBody').html(c.join(''))
	},
}
