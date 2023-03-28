/*
 * **************************************************************************************
 * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

// Quest is aborted?
FoEproxy.addRequestHandler('QuestService', 'abortQuest', (postData) => {
	if(postData['requestClass'] === 'QuestService' && postData['requestMethod'] === 'abortQuest'){
		Quests.UpdateCounter();
	}
});


/**
 * @type {{InsertStorage: Quests.InsertStorage, init: Quests.init, Counter: number, Date: null, UpdateCounter: Quests.UpdateCounter}}
 */
let Quests = {

	Counter: 2000,
	Date: null,


	init: ()=> {

		let CounterStorage = localStorage.getItem('QuestCounter'),
			parts;

		Quests.Date = moment(MainParser.getCurrentDate()).format('YYYY-MM-DD');

		if(CounterStorage !== null)
		{
			parts = JSON.parse(CounterStorage);

			// current is older than stored date
			if (!parts || !parts['date'] || moment(moment(MainParser.getCurrentDate()).format('YYYY-MM-DD')).isAfter(parts['date'])){
				Quests.Counter = 2000;
			}
			// is today
			else {
				Quests.Counter = parts['counter'];
				Quests.Date = parts['date'];
			}
		}
		else {
			Quests.InsertStorage();
		}


		if (!Settings.GetSetting('Show2kQuestMark')) {
			return;
		}

		HTML.AddCssFile('quests');

		// some html for visual view
		let div = $('<div />');

		div.attr({
			id: 'quests-counter-hud',
			class: 'game-cursor'
		});

		$('body').append(div).promise().done(function(){
			$('#quests-counter-hud').append(
				$('<div />')
					.addClass('hud-btn-gold')
					.attr('title', 'FoE Helper: ' + i18n('Quests.CounterTooltip.Content'))
					.tooltip({
						extraClass: 'quest-tooltip',
						placement: 'right'
					})
					.append(
						$('<span />')
							.attr('id', 'quest-counter-value')
							.text( Quests.Counter )
					)
			);
		});

	},


	/**
	 * Count down und save to LocalStorage
	 *
	 * @constructor
	 */
	UpdateCounter: ()=> {
		Quests.Counter--;

		if (Settings.GetSetting('Show2kQuestMark')) {
			$('#quest-counter-value').text(Quests.Counter);
		}

		Quests.InsertStorage();
	},


	/**
	 * Write data to LocalStorage
	 *
	 * @constructor
	 */
	InsertStorage:()=> {
		localStorage.setItem('QuestCounter', JSON.stringify({
			counter: Quests.Counter,
			date: Quests.Date
		}));
	}
};