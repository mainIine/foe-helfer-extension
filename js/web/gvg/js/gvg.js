FoEproxy.addHandler('ClanBattleService', 'grantIndependence', (data, postData) => {
    GvG.CountIndepences(data.responseData.__class__);
});

FoEproxy.addHandler('ClanBattleService', 'deploySiegeArmy', (data, postData) => {
    GvG.CountSieges(data.responseData.__class__);
});

FoEproxy.addHandler('ClanBattleService', 'getContinent', (data, postData) => {
    GvG.Recalc(data.responseData.continent.calculation_time.start_time);
	GvG.ShowGvgHud();
});

FoEproxy.addHandler('AnnouncementsService', 'fetchAllAnnouncements', (data, postData) => {
	GvG.HideGvgHud();
});

let GvG = {
    Independences: localStorage.getItem('GvGIndependencesCount') || 0,
    Sieges: localStorage.getItem('GvGSiegesCount') || 0,
	NextCalc: localStorage.getItem('GvGRecalcTime') || 0,

    /**
	 * Build HUD
	 * @param data
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
					.tooltip(
						{
							'title': '<h3>' + i18n('Global.BoxTitle') + '</h3>' + i18n('GvG.Independences.Tooltip') + '<br>' + 
								'<em>' + i18n('GvG.Independences.Tooltip.Warning') + '</em>',
							'template': '<div class="tooltip foe-skin" role="tooltip"><div class="arrow"></div><div class="tooltip-inner"></div></div>',
							'placement': 'bottom',
							'html': true
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
	 * @param data
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
		let count = localStorage.getItem('GvGIndependencesCount') || 0;

		if (data === "Success") {
			count++;
		}

		GvG.Independences = count;
		localStorage.setItem('GvGIndependencesCount', count);
		GvG.ShowGvgHud();
	},

    /**
	 * Count Indepences on GvGMap
	 * @param data
	 */
	 CountSieges: (data)=> {
		let count = localStorage.getItem('GvGSiegesCount') || 0;

		if (data === "Success") {
			count++;
		}

		GvG.Sieges = count;
		localStorage.setItem('GvGSiegesCount', count);
		GvG.ShowGvgHud();
	},

    /**
	 * Reset data after Recalc
	 * @param calcTime
	 */
	 Recalc: (calcTime)=> {
		let storedRecalc = localStorage.getItem('GvGRecalcTime') || 0;

		if (storedRecalc != null && storedRecalc < calcTime) {
			GvG.Independences = 0;
			GvG.Sieges = 0;
			localStorage.setItem('GvGIndependencesCount', GvG.Independences);
			localStorage.setItem('GvGSiegesCount', GvG.Sieges);
			localStorage.setItem('GvGRecalcTime', calcTime);
			GvG.ShowGvgHud();
		}

		GvG.NextCalc = calcTime;
	},
}