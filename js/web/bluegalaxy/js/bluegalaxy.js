/*
 * *************************************************************************************
 *
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

FoEproxy.addHandler('CityProductionService', 'pickupProduction', (data) => {
	const entities = data.responseData['updatedEntities'];

	if (!entities) return;

	const collectedBlueGalaxy = entities.some(entity => entity['cityentity_id'] === 'X_OceanicFuture_Landmark3');

	if (collectedBlueGalaxy && $('#bluegalaxy').length === 0 && Settings.GetSetting('ShowBlueGalaxyHelper')) {
		BlueGalaxy.Show();
		BlueGalaxy.AutoOpened = true;
	}
});

FoEproxy.addFoeHelperHandler('BonusUpdated', () => {
	const bonus = BonusService.Bonuses.find(b => b['type'] === 'double_collection');

	if (bonus) {
		BlueGalaxy.DoubleCollections = bonus['amount'] | 0;
		BlueGalaxy.GalaxyFactor = bonus['value'] / 100;
	}

	BlueGalaxy.SetCounter();

	if ($('#bluegalaxy').length > 0) {
		BlueGalaxy.Show(true, true);
	}
});

const BlueGalaxy = {

	GoodsValue: 0.2,
	NextGoodsValue: 0.4,
	OlderGoodsValue: 0.1,
	DoubleCollections: 0,
	GalaxyFactor: 0,
	// true while the box was opened automatically by collecting the Blue Galaxy;
	// only such a box may close itself again when the charges run out
	AutoOpened: false,
	sort: JSON.parse(localStorage.getItem('BlueGalaxySorting') || '{"col":null,"order":null}'),


	/**
	 * Opens the box (or refreshes/toggles it), restores the stored goods values and wires the input events.
	 *
	 * @param {boolean} [event=false] - True refreshes an already open box instead of closing it.
	 * @param {boolean} [auto_close=false] - Close an automatically opened box again when no double collections are left.
	 */
	Show: (event = false, auto_close = false) => {
		if ($('#bluegalaxy').length === 0) {
			BlueGalaxy.AutoOpened = false;

			const storedGoodsValue = localStorage.getItem('BlueGalaxyGoodsValue');
			if (storedGoodsValue !== null) {
				BlueGalaxy.GoodsValue = parseFloat(storedGoodsValue);
			}

			const storedNextGoodsValue = localStorage.getItem('BlueGalaxyNextGoodsValue');
			if (storedNextGoodsValue !== null) {
				BlueGalaxy.NextGoodsValue = parseFloat(storedNextGoodsValue);
			}

			const storedOlderGoodsValue = localStorage.getItem('BlueGalaxyOlderGoodsValue');
			if (storedOlderGoodsValue !== null) {
				BlueGalaxy.OlderGoodsValue = parseFloat(storedOlderGoodsValue);
			}

			HTML.Box({
				id: 'bluegalaxy',
				title: i18n('Boxes.BlueGalaxy.Title'),
				ask: i18n('Boxes.BlueGalaxy.HelpLink'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
				settings: () => BlueGalaxy.ShowSettings(),
				popout: () => MainParser.PopOut('bluegalaxy', 560, 560),
				active_maps: 'main',
			});

			HTML.AddCssFile('bluegalaxy');

			const bindGoodsInput = (selector, property, storageKey) => {
				$('#bluegalaxy').on('blur', selector, function () {
					const value = parseFloat($(this).val());
					BlueGalaxy[property] = isNaN(value) ? 0 : value;
					localStorage.setItem(storageKey, BlueGalaxy[property]);

					BlueGalaxy.CalcBody();
				});
			};

			bindGoodsInput('#goodsValue', 'GoodsValue', 'BlueGalaxyGoodsValue');
			bindGoodsInput('#NextGoodsValue', 'NextGoodsValue', 'BlueGalaxyNextGoodsValue');
			bindGoodsInput('#OlderGoodsValue', 'OlderGoodsValue', 'BlueGalaxyOlderGoodsValue');

			// A building should be marked in the city, fall back to the city map box if unsupported
			$('#bluegalaxy').on('click', '.foe-table .show-entity', async function () {
				const id = $(this).data('id');

				if (!await BuildingMarker.show(id)) {
					Productions.ShowOnMap(id);
				}
			});

			BlueGalaxy.CalcBody();
		}
		else if (event) {
			BlueGalaxy.CalcBody();
		}
		else {
			HTML.CloseOpenBox('bluegalaxy');
		}

		if (auto_close && BlueGalaxy.AutoOpened && BlueGalaxy.DoubleCollections === 0) {
			HTML.CloseOpenBox('bluegalaxy');
		}
	},


	/**
	 * Collects all buildings with FP, goods or fragment productions and renders the box content.
	 *
	 * @param {Object[]} [data] - Optional raw city map entities to (re)process, passed through to CityBuildings.createBuildings.
	 */
	CalcBody: (data) => {
		CityBuildings.createBuildings(data);

		const FPB = Productions.Boosts['fp'] === undefined ? (Boosts.Sums['forge_points_production'] + 100) / 100 : Productions.Boosts['fp'];
		const FPBoost = (FP) => Math.round(FP * FPB);
		const showBGFragments = JSON.parse(localStorage.getItem('showBGFragments') || 'true');
		const showBGNextGoods = JSON.parse(localStorage.getItem('showBGNextGoods') || 'true');
		const MaxBgList = parseInt(localStorage.getItem('MaxBgList') || 50);

		let Buildings = [];

		for (const CityEntity of Object.values(MainParser.CityBuildingsData)) {
			if (['main_building', 'greatbuilding', 'off_grid'].includes(CityEntity.type) || !CityEntity.state.production) {
				continue;
			}

			let FP = 0;
			let GoodsSum = 0;
			let NextGoodsSum = 0;
			let OlderGoodsSum = 0;
			let GuildGoodsSum = 0;
			let FragmentAmount = 0;
			const Fragments = [];

			for (const product of CityEntity.state.production) {
				if (product.resources?.strategy_points) {
					FP += FPBoost(product.resources.strategy_points);
				}
				else if (product.type === 'genericReward' && product.resources?.subType === 'strategy_points') {
					FP += FPBoost(product.resources.amount);
				}
				else if (product.type === 'genericReward' && product.resources?.subType !== 'fragment' &&
					(product.resources?.type === 'good' || /good/.test(product.resources?.icon || ''))) {
					const amount = parseInt(product.resources.amount) || 0;

					if (product.resources.icon === 'next_age_goods' || /next/i.test(product.resources.id || '')) {
						NextGoodsSum += amount;
					}
					else if (/previous/i.test(product.resources.id || '')) {
						OlderGoodsSum += amount;
					}
					else {
						GoodsSum += amount;
					}
				}
				else if (product.type === 'genericReward' && product.resources?.type === 'forgepoint_package') {
					FP += parseInt(product.resources.subType);
				}
				else if (product.type === 'genericReward' && product.resources?.id === 'large_forgepoint_package_40') {
					FP += 10 * parseInt(product.resources.amount);
				}

				if (product.type === 'resources' || product.type === 'guildResources') {
					for (const { id: GoodID, era: GoodEra } of GoodsList) {
						if (!product.resources[GoodID]) continue;

						if (product.type === 'guildResources') {
							GuildGoodsSum += product.resources[GoodID];
						}
						else if (GoodEra === CurrentEra) {
							GoodsSum += product.resources[GoodID];
						}
						else if (Technologies.InnoEras[GoodEra] > Technologies.InnoEras[CurrentEra]) {
							NextGoodsSum += product.resources[GoodID];
						}
						else {
							OlderGoodsSum += product.resources[GoodID];
						}
					}

					// generic rewards are stored as pseudo goods (e.g. "random_good_of_next_age"), see CityBuildings.setGoodsRewardFromGeneric
					if (product.type === 'resources') {
						GoodsSum += (product.resources['random_good_of_age'] || 0) + (product.resources['all_goods_of_age'] || 0);
						NextGoodsSum += (product.resources['random_good_of_next_age'] || 0) + (product.resources['all_goods_of_next_age'] || 0);
						OlderGoodsSum += (product.resources['random_good_of_previous_age'] || 0) + (product.resources['all_goods_of_previous_age'] || 0);
					}
				}

				if (product.type === 'genericReward' && product.resources?.subType === 'fragment') {
					Fragments.push(product.resources);
					FragmentAmount += product.resources.amount;
				}
			}

			if (GoodsSum > 0 || NextGoodsSum > 0 || FP > 0 || FragmentAmount > 0 || OlderGoodsSum > 0) {
				Buildings.push({
					building: CityEntity,
					ID: CityEntity.id,
					EntityID: CityEntity.entityId,
					name: CityEntity.name,
					Fragments: Fragments,
					FragmentAmount: FragmentAmount,
					FragmentName: Fragments[0]?.name || '',
					FP: FP,
					Goods: GoodsSum,
					NextGoods: NextGoodsSum,
					OlderGoods: OlderGoodsSum,
					GuildGoods: GuildGoodsSum,
					In: CityEntity.state.times.in,
					At: CityEntity.state.times.at,
					CombinedValue: FP + BlueGalaxy.GoodsValue * GoodsSum + (showBGNextGoods ? BlueGalaxy.NextGoodsValue * NextGoodsSum : 0) + BlueGalaxy.OlderGoodsValue * OlderGoodsSum,
				});
			}
		}

		if (BlueGalaxy.DoubleCollections > 0) {
			// Hide everything above 23h
			Buildings = Buildings.filter(b => (b.FP > 0 || b.Goods > 0 || b.NextGoods > 0 || b.GuildGoods > 0 || b.FragmentAmount > 0) && b.In < 23.5 * 3600);
		}

		Buildings.sort((a, b) => {
			const { col, order } = BlueGalaxy.sort;

			if (!col) return b.CombinedValue - a.CombinedValue;

			const direction = (order === 'ascending' ? -1 : 1);
			const valueA = a[col];
			const valueB = b[col];

			if (typeof valueA === 'string') {
				// Buildings without a value (e.g. no fragments) always go last
				if (valueA === '' || valueB === '') return (valueA === '' ? 1 : 0) - (valueB === '' ? 1 : 0);
				return direction * valueA.localeCompare(valueB);
			}

			return direction * (valueB - valueA);
		});

		const goodsValueInput = (id, value) => {
			let input = `<input type="number" id="${id}" step="0.01" min="0" max="1000" value="${value}" title="${HTML.i18nTooltip(i18n('Boxes.BlueGalaxy.TTGoodsValue'))}">`;
			if (value > 0) {
				input += `<small> (${HTML.i18nReplacer(i18n('Boxes.BlueGalaxy.GoodsPerFP'), { goods: Math.round(1 / value * 100) / 100 })})</small>`;
			}
			return input;
		};

		const h = [];
		h.push('<div class="text-center dark-bg header">');

		if (BlueGalaxy.DoubleCollections > 0) {
			h.push(`<div class="collections-left">${i18n('Boxes.BlueGalaxy.AvailableCollections')} <strong>${BlueGalaxy.DoubleCollections}</strong></div>`);
		}

		h.push(`${i18n('Boxes.BlueGalaxy.GoodsValue')} ${goodsValueInput('goodsValue', BlueGalaxy.GoodsValue)}<br>`);
		if (showBGNextGoods) {
			h.push(`${i18n('Boxes.BlueGalaxy.NextGoodsValue')} ${goodsValueInput('NextGoodsValue', BlueGalaxy.NextGoodsValue)}<br>`);
		}
		h.push(`${i18n('Boxes.BlueGalaxy.OlderGoodsValue')} ${goodsValueInput('OlderGoodsValue', BlueGalaxy.OlderGoodsValue)}`);
		h.push('</div>');

		const sortClass = (col) => (BlueGalaxy.sort.col === col ? BlueGalaxy.sort.order : '');
		const iconTh = (col, icon, title, align = 'text-center') => `<th class="is-number icon ${icon} ${sortClass(col)} ${align}" title="${title}" data-type="bg-group" data-colname="${col}"><span></span></th>`;

		const table = [];
		table.push('<table id="BGTable" class="foe-table">');
		table.push('<thead class="sticky">' +
			'<tr class="sorter-header vertical-middle">' +
			'<th class="no-sort"></th>' +
			`<th class="no-sort" data-type="bg-group">${i18n('Boxes.BlueGalaxy.Building')}</th>` +
			(showBGFragments ?
				iconTh('FragmentAmount', 'fragments', i18n('Boxes.BlueGalaxy.Fragments'), 'text-right') +
				`<th class="${sortClass('FragmentName')}" data-type="bg-group" data-colname="FragmentName">${i18n('Boxes.BlueGalaxy.Fragments')}</th>`
				: '') +
			iconTh('FP', 'fp', i18n('Boxes.BlueGalaxy.FP')) +
			iconTh('OlderGoods', 'old_goods', i18n('Boxes.BlueGalaxy.OlderGoods')) +
			iconTh('Goods', 'goods', i18n('Boxes.BlueGalaxy.Goods')) +
			(showBGNextGoods ? iconTh('NextGoods', 'next_goods', i18n('Boxes.BlueGalaxy.NextGoods')) : '') +
			iconTh('GuildGoods', 'guildgoods', i18n('Boxes.GuildMemberStat.GuildGoods')) +
			`<th colspan="2" class="case-sensitive no-sort" data-type="bg-group">${i18n('Boxes.BlueGalaxy.DoneIn')}</th>` +
			'</tr>' +
			'</thead>');
		table.push('<tbody class="bg-group">');

		for (let i = 0; i < MaxBgList && i < Buildings.length; i++) {
			const b = Buildings[i];
			const isPolivated = b.building.state.isPolivated;

			table.push('<tr class="vertical-middle">');
			table.push(`<td>${isPolivated !== undefined ? (isPolivated ? '<span class="text-bright">★</span>' : '☆') : ''}</td>`);
			table.push(`<td class="fh-tooltip" data-meta_id="${b.EntityID}" data-text="${b.name.replace(/[. -]/g, '')}" data-callback_tt="BlueGalaxy.BuildingImageTT">${b.name}</td>`);

			if (showBGFragments) {
				// showBuildingItems may return false, indexing it then yields undefined
				const items = Productions.showBuildingItems(true, b.building)[2] || [];
				table.push(`<td class="text-right item-amount" data-number="${b.FragmentAmount}">${items.map(item => item.random ? `Ø ${item.random}x` : `${item.amount}x`).join('<br>')}</td>`);
				table.push(`<td>${items.map(item => `${item.fragment ? '🧩 ' : ''}${item.name}`).join('<br>')}</td>`);
			}

			table.push(`<td class="text-center" data-number="${b.FP}">${HTML.Format(b.FP)}</td>`);
			table.push(`<td class="text-center" data-number="${b.OlderGoods}">${HTML.Format(b.OlderGoods)}</td>`);
			table.push(`<td class="text-center" data-number="${b.Goods}">${HTML.Format(b.Goods)}</td>`);
			if (showBGNextGoods) {
				table.push(`<td class="text-center" data-number="${b.NextGoods}">${HTML.Format(b.NextGoods)}</td>`);
			}
			table.push(`<td class="text-center" data-number="${b.GuildGoods}">${HTML.Format(b.GuildGoods)}</td>`);

			if (b.In === 0 || b.At * 1000 <= MainParser.getCurrentDateTime()) {
				table.push(`<td style="white-space:nowrap"><strong class="success">${i18n('Boxes.BlueGalaxy.Done')}</strong></td>`);
			}
			else {
				table.push(`<td style="white-space:nowrap"><strong class="error">${moment.unix(b.At).fromNow()}</strong></td>`);
			}

			table.push(`<td class="text-right"><span class="show-entity" data-id="${b.ID}"><img class="game-cursor" src="${extUrl}css/images/hud/open-eye.png"></span></td>`);
			table.push('</tr>');
		}

		table.push('</tbody>');
		table.push('</table>');

		h.push(table.join(''));

		BlueGalaxy.SetCounter();

		$('#bluegalaxyBody').html(h.join('')).promise().done(() => {
			$('#BGTable').tableSorter();
		});

		$('#BGTable th').on('click', (e) => {
			let el = e.target;
			if (el.nodeName !== 'TH') el = el.parentElement;
			if (el.classList.contains('no-sort')) return;

			if (el.classList.contains('descending')) {
				BlueGalaxy.sort = { col: null, order: null };
			} else {
				BlueGalaxy.sort = { col: el.dataset.colname, order: 'descending' };
			}

			localStorage.setItem('BlueGalaxySorting', JSON.stringify(BlueGalaxy.sort));
			BlueGalaxy.CalcBody();
		});
	},


	/**
	 * Tooltip callback for the building column: shows just the building graphic.
	 *
	 * @param {PointerEvent} e - The pointerenter event of the hovered cell.
	 * @returns {string|null} Tooltip HTML with the building image, or null when the building is unknown.
	 */
	BuildingImageTT: (e) => {
		const meta = MainParser.CityEntities[e?.currentTarget?.dataset?.meta_id];
		if (!meta) return null;

		const src = srcLinks.get(`/city/buildings/${meta.asset_id.replace(/^(\D_)(.*?)/, '$1SS_$2')}.png`, true);
		return `<img alt="${meta.name}" src="${src}" style="max-width:280px">`;
	},


	/**
	 * Shows or hides the double collection counter in the menu.
	 */
	SetCounter: () => {
		if (BlueGalaxy.DoubleCollections > 0) {
			$('#hidden-blue-galaxy-count').text(BlueGalaxy.DoubleCollections).show();
		} else {
			$('#hidden-blue-galaxy-count').hide();
		}
	},


	/**
	 * Renders the settings box content.
	 */
	ShowSettings: () => {
		const autoOpen = Settings.GetSetting('ShowBlueGalaxyHelper');
		const showBGFragments = JSON.parse(localStorage.getItem('showBGFragments') || 'true');
		const showBGNextGoods = JSON.parse(localStorage.getItem('showBGNextGoods') || 'true');
		const MaxBgList = localStorage.getItem('MaxBgList') || 50;

		const h = [];
		h.push(`<p><input id="autoStartBGHelper" name="autoStartBGHelper" value="1" type="checkbox" ${(autoOpen === true) ? ' checked="checked"' : ''} /> <label for="autoStartBGHelper">${i18n('Boxes.Settings.Autostart')}</label></p>`);
		h.push(`<p><input id="showBGFragments" name="showBGFragments" value="1" type="checkbox" ${(showBGFragments === true) ? ' checked="checked"' : ''} /> <label for="showBGFragments">${i18n('Boxes.Settings.showBGFragments')}</label></p>`);
		h.push(`<p><input id="showBGNextGoods" name="showBGNextGoods" value="1" type="checkbox" ${(showBGNextGoods === true) ? ' checked="checked"' : ''} /> <label for="showBGNextGoods">${i18n('Boxes.Settings.showBGNextGoods')}</label></p>`);
		h.push(`<p><label for="MaxBgList" style="margin-left:22px">${i18n('Boxes.Settings.MaxBgList')}</label> <input id="MaxBgList" name="MaxBgList" style="max-width:40px" value="${MaxBgList}" type="text" /></p>`);
		h.push(`<p><button onclick="BlueGalaxy.SaveSettings()" id="save-bghelper-settings" class="btn" style="width:100%">${i18n('Boxes.Settings.Save')}</button></p>`);

		$('#bluegalaxySettingsBox').html(h.join(''));
	},


	/**
	 * Persists the settings, refreshes the box and closes the settings panel.
	 */
	SaveSettings: () => {
		localStorage.setItem('ShowBlueGalaxyHelper', $('#autoStartBGHelper').is(':checked'));
		localStorage.setItem('MaxBgList', $('#MaxBgList').val());
		localStorage.setItem('showBGFragments', String($('#showBGFragments').is(':checked')));
		localStorage.setItem('showBGNextGoods', String($('#showBGNextGoods').is(':checked')));

		// drop a stored sorting on the now hidden column
		if (!$('#showBGNextGoods').is(':checked') && BlueGalaxy.sort.col === 'NextGoods') {
			BlueGalaxy.sort = { col: null, order: null };
			localStorage.setItem('BlueGalaxySorting', JSON.stringify(BlueGalaxy.sort));
		}

		BlueGalaxy.CalcBody();

		$('#bluegalaxySettingsBox').remove();
	},
};
