/*
 *
 *  * **************************************************************************************
 *  * Copyright (C) 2022 FoE-Helper team - All Rights Reserved
 *  * You may use, distribute and modify this code under the
 *  * terms of the AGPL license.
 *  *
 *  * See file LICENSE.md or go to
 *  * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 *  * for full license details.
 *  *
 *  * **************************************************************************************
 *
 */

/**
 * Get threads from ConversationService
 */
FoEproxy.addHandler('ConversationService', 'getOverviewForCategory', (data, postData) => {
	if (data['responseData']['category']['type'] === 'social')
	{
		CompareFriends.ParseThreads(data['responseData']['category']['teasers']);
	}
});

// Thread is opened
FoEproxy.addHandler('ConversationSettingsService', 'getSettings', (data, postData) => {
	if(postData[0]['requestClass'] === 'ConversationSettingsService' && postData[0]['requestMethod'] === 'getSettings')
	{
		if (data['responseData']['participants']) {
			CompareFriends.CurrentThread = postData[0]['requestData'][0];
			CompareFriends.ParseThreadParticipants(data['responseData']['participants']);

			CompareFriends.BuildBody(true);
		}
	}
});

/**
 * Compare friends list with threads
 *
 * @type {{Threads: *[], CurrentThread: number, ThreadParticipants: *[], ParseThreadParticipants: CompareFriends.ParseThreadParticipants, BuildBody: CompareFriends.BuildBody, ParseThreads: CompareFriends.ParseThreads}}
 */
let CompareFriends = {

	Threads: [],
	ThreadParticipants: [],

	/**
	 * Current opened thread
	 */
	CurrentThread: 0,

	ParseThreads: (data)=> {

		for(let i in data)
		{
			if(!data.hasOwnProperty(i)) {
				continue;
			}

			// search for the cached thread
			let index = CompareFriends.Threads.findIndex(t => t.id === data[i].id);

			// not found
			if(index === -1){
				CompareFriends.Threads.push({
					id: data[i].id,
					title: data[i].title,
					participants: []
				})
			}
		}
	},


	/**
	 * Merge participants into thread
	 *
	 * @param data
	 * @constructor
	 */
	ParseThreadParticipants: (data)=> {

		let key = CompareFriends.Threads.findIndex(t => t.id === CompareFriends.CurrentThread);

		CompareFriends.Threads[key]['participants'] = data;
	}, BuildBody: (rebuild = false)=> {

		if ($('#friendsCompareBox').length === 0) {
			HTML.Box({
				id: 'friendsCompareBox',
				title: i18n('Boxes.CompareFriends.Title'),
				ask: i18n('Boxes.CompareFriends.HelpLink'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
			});

			HTML.AddCssFile('compare_friends');

		} else if(!rebuild) {
			HTML.CloseOpenBox('friendsCompareBox');
		}

		// no threads visited
		if(CompareFriends.Threads[0]?.participants.length === undefined){
			let info = '<div class="text-center text-warning" style="margin-top:2em">Besuche erst die Mitgliederübersicht einer sozialen Unterhaltung um hier Daten zu sehen.</div>';

			$('#friendsCompareBoxBody').html(info);

			return;
		}

		let t = [];

		t.push('<table id="friendsCompareTable" class="foe-table sortable-table">');

		t.push('<tbody>');
		t.push('<tr>');

		t.push('<th>&nbsp;</th>');

		for(let i in CompareFriends.Threads){
			let d = CompareFriends.Threads[i];

			if(d['participants'].length === 0){
				continue;
			}

			t.push(`<th>${d.title}</th>`);
		}

		t.push('</tr>');

		let PlayerList = Object.values(PlayerDict).filter(obj => (obj['IsFriend'] === true));

		PlayerList = PlayerList.sort(function (a, b) {
			return b['Score'] - a['Score'];
		});

		for (let p in PlayerList)
		{
			let Player = PlayerList[p];

			t.push('<tr>');

			t.push(`<td>#${(parseInt(p) + 1)} <img style="max-width: 22px" src="${MainParser.InnoCDN + 'assets/shared/avatars/' + (MainParser.PlayerPortraits[Player['Avatar']] || 'portrait_433')}.jpg" alt="${Player['PlayerName']}"> ${MainParser.GetPlayerLink(Player['PlayerID'], Player['PlayerName'])}</td>`);

			for(let x in CompareFriends.Threads)
			{
				if(CompareFriends.Threads[x]['participants'].length === 0){
					continue;
				}

				if(CompareFriends.Threads[x]['participants'].findIndex(p => p.playerId === Player.PlayerID) === -1){
					t.push(`<td class="text-center text-danger"><strong>&#10060;</strong></td>`);
				} else {
					t.push(`<td class="text-center"><strong class="text-success">&#10003;<strong</td>`);
				}
			}

			t.push('</tr>');
		}

		t.push('</tbody>');

		t.push('</table>');

		$('#friendsCompareBoxBody').html(t.join(''));
	}
};