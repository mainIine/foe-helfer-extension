/*
 * **************************************************************************************
 * Copyright (C) 2021  FoE-Helper and there team - All Rights Reserved
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
    GvG.CountIndepences(data.responseData.__class__);
});

FoEproxy.addHandler('ClanBattleService', 'getContinent', (data, postData) => {
    GvG.ResetIndependences(data.responseData.continent.calculation_time.start_time);
	GvG.ShowGvgHud();
});

FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
	GvG.HideGvgHud();
});


/**
 * GvG Class
 *
 * @type {{NextCalc: (string|number), ShowGvgHud: GvG.ShowGvgHud, CountIndepences: GvG.CountIndepences, Independences: (string|number), HideGvgHud: GvG.HideGvgHud, ResetIndependences: GvG.ResetIndependences}}
 */
let GvG = {
    Independences: localStorage.getItem('GvGIndependencesCount') || 0,
	NextCalc: localStorage.getItem('GvGRecalcTime') || 0,

    /**
	 * Build HUD
	 */
	ShowGvgHud: () => {
		if ($('#gvg-hud').length === 0) {
			HTML.AddCssFile('gvg');
			let div = $('<div />');

			div.attr({
				id: 'gvg-hud',
				class: 'game-cursor'
			});

			$('body').append(div).promise().done(function() {
				div.append('<p>'+GvG.Independences+'/4</p>')
					.attr('title', 
							'<h3>' + i18n('Global.BoxTitle') + '</h3>' + 
							i18n('GvG.Independences.Tooltip') + '<br>' + 
							'<em>' + i18n('GvG.Independences.Tooltip.Warning') + '</em')
					.attr('data-placement','bottom')
					.tooltip({
						useFoEHelperSkin: true
					});
			});
		}
		else {
			$('#gvg-hud p').text(GvG.Independences+'/4');
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
	 CountIndepences: (data)=> {
		let count = localStorage.getItem('GvGIndependencesCount');

		if (count === null) {
			count = 0;
		}
		if (data === "Success") {
			count++;
		}

		GvG.Independences = count;
		localStorage.setItem('GvGIndependencesCount', count);
		GvG.ShowGvgHud();
	},

    /**
	 * Reset Independence Counter after Recalc
	 * @param calcTime
	 */
	 ResetIndependences: (calcTime)=> {
		let storedRecalc = localStorage.getItem('GvGRecalcTime');

		if (storedRecalc === null) {
			localStorage.setItem('GvGRecalcTime', calcTime);
		}
		else if (storedRecalc < calcTime) {
			GvG.Independences = 0;
			localStorage.setItem('GvGIndependencesCount', GvG.Independences);
		}

		GvG.NextCalc = calcTime;
		localStorage.setItem('GvGRecalcTime', calcTime);
		GvG.ShowGvgHud();
	},
}