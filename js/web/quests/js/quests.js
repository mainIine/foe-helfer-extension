/*
 * **************************************************************************************
 * Copyright (C) 2021 FoE-Helper team - All Rights Reserved
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
FoEproxy.addHandler('QuestService', 'getUpdates', (data, postData) => {
	if(postData[0]['requestClass'] === 'QuestService' && postData[0]['requestMethod'] === 'abortQuest'){
		Quests.UpdateAbortCounter();
	}

	if(postData[0]['requestClass'] === 'QuestService' && postData[0]['requestMethod'] === 'advanceQuest'){
		Quests.UpdateSolvedCounter();
	}
});

/**
 * @type {{InsertStorage: Quests.InsertStorage, init: Quests.init, Counter: number, Date: null, UpdateCounter: Quests.UpdateCounter}}
 */
let Quests = {

	AbortCounter: 2000,
	SolvedCounter: 0,
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
				Quests.AbortCounter = 2000;
				Quests.SolvedCounter = 0;
			}
			// is today
			else {
				Quests.AbortCounter = parts['abortCounter'];
				Quests.SolvedCounter = parts['solvedCounter'];
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
							.text( Quests.AbortCounter + ' (' + Quests.SolvedCounter + ')' )
					)
			);
		});

	},

	/**
	 * Count down und save to LocalStorage
	 *
	 * @constructor
	 */
	UpdateAbortCounter: ()=> {
		Quests.AbortCounter--;

		if (Settings.GetSetting('Show2kQuestMark')) {
			$('#quest-counter-value').text( Quests.AbortCounter + ' (' + Quests.SolvedCounter + ')' )
		}

		Quests.InsertStorage();
	},

	/**
	 * Count down und save to LocalStorage
	 *
	 * @constructor
	 */
	UpdateSolvedCounter: ()=> {
		Quests.SolvedCounter++;

		if (Settings.GetSetting('Show2kQuestMark')) {
			$('#quest-counter-value').text( Quests.AbortCounter + ' (' + Quests.SolvedCounter + ')' )
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
			abortCounter: Quests.AbortCounter,
			solvedCounter: Quests.SolvedCounter,
			date: Quests.Date
		}));
	}
};