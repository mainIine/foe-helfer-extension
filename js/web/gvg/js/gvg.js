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

let GvG = {
    Independences: localStorage.getItem('GvGIndependencesCount') || 0,
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
				div.append('<p>'+GvG.Independences+'/4</p>')
					.attr('title', 
							'<h3>' + i18n('Global.BoxTitle') + '</h3>' + 
							i18n('GvG.Independences.Tooltip') + '<br>' + 
							'<em>' + i18n('GvG.Independences.Tooltip.Warning') + '</em')
					.attr('data-placement','bottom')
					.tooltip(
						{
							'template': '<div class="tooltip foe-skin" role="tooltip"><div class="arrow"></div><div class="tooltip-inner"></div></div>',
							'html': true
						}
					);
			});
		}
		else {
			$('#gvg-hud p').text(GvG.Independences+'/4');
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
	 * @param data
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