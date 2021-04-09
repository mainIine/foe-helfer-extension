/*
 * **************************************************************************************
 * Copyright (C) 2021  FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/dsiekiera/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

FoEproxy.addHandler('ClanBattleService', 'grantIndependence', (data, postData) => {
    GvG.AddIndepences(data.responseData.__class__);
});

FoEproxy.addHandler('ClanBattleService', 'deploySiegeArmy', (data, postData) => {
    GvG.AddSieges(data.responseData.__class__);
});

FoEproxy.addHandler('ClanBattleService', 'getContinent', (data, postData) => {
    GvG.Recalc(data.responseData.continent.calculation_time.start_time);
	//GvG.ShowGvgHud();
});

FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
	//GvG.HideGvgHud();
});

let GvG = {
    Independences: localStorage.getItem('GvGIndependencesCount') || 0,
    Sieges: localStorage.getItem('GvGSiegesCount') || 0,
	NextCalc: localStorage.getItem('GvGRecalcTime') || 0,

    /**
	 * Build HUD
	 */
	ShowGvgHud: () => {
		if ($('#gvg-hud').length == 0) {
			HTML.AddCssFile('gvg');
			let div = $('<div />');

			div.attr({
				id: 'gvg-hud',
				class: 'game-cursor'
			});

			$('body').append(div).promise().done(function() {
				div.append('<div class="independences">'+GvG.Independences+'/4</div><div class="sieges">'+GvG.Sieges+'</div>')
					.attr('title', i18n('GvG.Independences.Tooltip') + '<br><em>' + i18n('GvG.Independences.Tooltip.Warning') + '</em>')
					.tooltip(
						{
							useFoEHelperSkin: true,
							headLine: i18n('Global.BoxTitle'),
							placement: 'bottom',
							html: true
						}
					);
			});
		}
		else {
			$('#gvg-hud .independences').text(GvG.Independences+'/4');
			$('#gvg-hud .sieges').text(GvG.Sieges);
		}
	},

    /**
	 * Hide HUD
	 */
	HideGvgHud: () => {
		if ($('#gvg-hud').length > 0) {
			$('#gvg-hud').fadeToggle(function() {
				$(this).remove();
			});
		}
	},

    /**
	 * Count Indepences on GvGMap
	 * @param data
	 */
	 AddIndepences: (data)=> {
		let time = MainParser.getCurrentDateTime(); 
		let count = localStorage.getItem('GvGIndependencesCount') || 0;
		let resetHappened = localStorage.getItem('GvGReset') || false;

		if (data === "Success") {
			if (time > NextCalc && !resetHappened)
				GvG.ResetData();
			count++;
		}

		GvG.Independences = count;
		localStorage.setItem('GvGIndependencesCount', count);
		//GvG.ShowGvgHud();
	},

    /**
	 * Count Indepences on GvGMap
	 * @param data
	 */
	 AddSieges: (data)=> {
		let time = MainParser.getCurrentDateTime(); 
		let count = localStorage.getItem('GvGSiegesCount') || 0;
		let resetHappened = localStorage.getItem('GvGReset') || false;

		if (data === "Success") {
			if (time > NextCalc && !resetHappened)
				GvG.ResetData();
			count++;
		}

		GvG.Sieges = count;
		localStorage.setItem('GvGSiegesCount', count);
		//GvG.ShowGvgHud();
	},

    /**
	 * Reset data after Recalc
	 * @param calcTime
	 */
	 Recalc: (calcTime)=> {
		let storedRecalc = localStorage.getItem('GvGRecalcTime') || 0;
		let resetHappened = localStorage.getItem('GvGReset') || false;

		if (storedRecalc != null) {
			localStorage.setItem('GvGRecalcTime', calcTime);
			//GvG.ShowGvgHud();
		}
		if (resetHappened) {
			localStorage.setItem('GvGReset', false);
		}

		GvG.NextCalc = calcTime;
	},

	ResetData() {
		GvG.Independences = 0;
		GvG.Sieges = 0;
		localStorage.setItem('GvGIndependencesCount', GvG.Independences);
		localStorage.setItem('GvGSiegesCount', GvG.Sieges);
		localStorage.setItem('GvGReset', true);
	}
}