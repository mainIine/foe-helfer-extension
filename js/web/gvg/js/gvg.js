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

FoEproxy.addHandler('ClanBattleService', 'deployDefendingArmy', (data, postData) => {
    GvG.AddDefenders(data.responseData.__class__);
});

FoEproxy.addHandler('ClanBattleService', 'getContinent', (data, postData) => {
    GvG.SetRecalc(data.responseData.continent.calculation_time.start_time);
	GvG.ShowGvgHud();
});

FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
	GvG.HideGvgHud();
});

let GvG = {
    Independences: localStorage.getItem('GvGIndependencesCount')*1 || 0,
    Sieges: localStorage.getItem('GvGSiegesCount')*1 || 0,
    Defenders: localStorage.getItem('GvGDefendersCount')*1 || 0,
	NextCalc: localStorage.getItem('GvGRecalcTime')*1 || 0,

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
				div.append('<div class="independences">'+GvG.Independences+'/4</div><div class="sieges">'+GvG.Sieges+'</div><div class="defenders">'+GvG.Defenders+'</div>')
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
			$('#gvg-hud .defenders').text(GvG.Defenders);
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
	 * Add Granted Indepence on GvGMap
	 * @param data
	 */
	 AddIndepences: (data)=> {
		let nextCalc = localStorage.getItem('GvGRecalcTime')*1 || 0;
		let time = MainParser.getCurrentDateTime()/1000; 

		console.log(nextCalc, time);
		if (data === "Success") {
			if (time > nextCalc) {
				GvG.ResetData();
			}
			GvG.Independences++;
		}

		localStorage.setItem('GvGIndependencesCount', GvG.Independences);
		GvG.ShowGvgHud();
	},

    /**
	 * Add Granted Indepence on GvGMap
	 * @param data
	 */
	 AddDefenders: (data)=> {
		let nextCalc = localStorage.getItem('GvGRecalcTime')*1 || 0;
		let time = MainParser.getCurrentDateTime()/1000; 

		console.log(nextCalc, time);
		if (data === "Success") {
			if (time > nextCalc) {
				GvG.ResetData();
			}
			GvG.Defenders++;
		}

		localStorage.setItem('GvGDefendersCount', GvG.Defenders);
		GvG.ShowGvgHud();
	},

    /**
	 * Add To Sieges on GvGMap
	 * @param data
	 */
	 AddSieges: (data)=> {
		let nextCalc = localStorage.getItem('GvGRecalcTime')*1 || 0;
		let time = MainParser.getCurrentDateTime()/1000; 

		console.log("Siege placed", nextCalc, time);
		if (data === "Success") {
			if (time > nextCalc) {
				GvG.ResetData();
			}
			GvG.Sieges++;
		}

		localStorage.setItem('GvGSiegesCount', GvG.Sieges);
		GvG.ShowGvgHud();
	},

    /**
	 * Set Recalc time
	 * @param calcTime
	 */
	 SetRecalc: (calcTime)=> {

		if (GvG.NextCalc != calcTime) {
			localStorage.setItem('GvGRecalcTime', calcTime);
		}
		GvG.ShowGvgHud();

		GvG.NextCalc = calcTime;
	},

    /**
	 * Reset all Data
	 */
	ResetData() {
		let time = MainParser.getCurrentDateTime()/1000; 

		GvG.Independences = 0;
		GvG.Sieges = 0;
		GvG.Defenders = 0;
		
		localStorage.setItem('GvGIndependencesCount', GvG.Independences);
		localStorage.setItem('GvGSiegesCount', GvG.Sieges);
		localStorage.setItem('GvGDefendersCount', GvG.Defenders);
		localStorage.setItem('GvGRecalcTime', time+86400);
	}
}