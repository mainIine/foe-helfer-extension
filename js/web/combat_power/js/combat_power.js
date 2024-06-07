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

let CombatPower = {

	Buildings: [],

	Mapping: {
		all: '',
		guild_raids: '_gr',
		guild_expedition: '_gex',
		battleground: '_gbg'
	},


	Init: ()=> {

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

					let extra = Object.values(MainParser.NewCityMapData).find(obj => (obj['entityId'] === id)) || []

					console.log(id + ' - extra: ', extra)

					CombatPower.Buildings.push({
						id: id,
						asset_id: asset_id,
						width: sizes['y'],
						length: sizes['x'],
						stock: InventoryItem['inStock'],
						boosts: ageBoost['boosts']['boosts'],
						name: entity['name'],
						street: extra['needsStreet'] || 0,
					})

					break
				}
			}
		}

		console.log(CombatPower.Buildings)

		CombatPower.BuildBox()
	},


	BuildBox: ()=> {

		if ($('#combat-power').length > 0)
		{
			HTML.CloseOpenBox('combat-power')
			return
		}

		HTML.Box({
			id: 'combat-power',
			title: i18n('Boxes.CombatCalculator.Title'),
			ask: i18n('Boxes.CombatCalculator.HelpLink'),
			auto_close: true,
			dragdrop: true,
			minimize: true,
			resize: true
		})

		// CSS in den DOM prügeln
		HTML.AddCssFile('combat_power')

		let c = []

		c.push(`<table class="foe-table sortable-table">`)

		c.push('<thead>')
		c.push('<tr class="sorter-header">')

		c.push('<td></td>')
		c.push('<td>Name</td>')
		c.push('<td>Bestand / Größe</td>')
		c.push('<td>Werte</td>')
		c.push('<td>Straße</td>')

		c.push('</tr>')
		c.push('</thead>')

		c.push('<tbody>')

		for(let i in CombatPower.Buildings){
			let b = CombatPower.Buildings[i]

			c.push(`<tr>`)

			let url = '/city/buildings/' + [b['asset_id'].slice(0, 1), '_SS', b['asset_id'].slice(1)].join('') + '.png'

			url = srcLinks.get(url,true)

			c.push(`<td><img style="max-width:110px;max-height:110px" src="${url}" alt=""></td>`)
			c.push(`<td>${b['name']}<br><small>${b['id']}</small></td>`)
			c.push(`<td><strong class="in-stock">${b['stock']}</strong> ${b['width']}x${b['length']}</td>`)
			c.push(`<td>`)

			for(let x in b['boosts']){
				let y = b['boosts'][x]

				// https://foezz.innogamescdn.com/assets/shared/icons/att_boost_attacker-6070a3719.png
				let icon = srcLinks.get(`/shared/icons/${y['type']}${CombatPower.Mapping[y['targetedFeature']]}.png`,true)

				c.push(`<span class="boost-amount">${y['value']}%</span><img src="${icon}" alt=""> - ${i18n('Boxes.Productions.' + y['type'])}<br>`)
			}

			c.push(`</td>`)
			c.push(`<td class="text-center text-success" style="font-size: 140%">${b['street'] ? '✓' : ''}</td>`)

			c.push(`</tr>`)
		}

		c.push('</tbody>')

		c.push(`</table>`)

		$('#combat-powerBody').html(c.join(''))
	},
}
