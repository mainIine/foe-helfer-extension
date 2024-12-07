/*
 *
 *  * **************************************************************************************
 *  * Copyright (C) 2024 FoE-Helper team - All Rights Reserved
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
		CompareFriendsThreads.ParseThreads(data['responseData']['category']['teasers']);
	}
});


FoEproxy.addHandler('ConversationService', 'getCategory', (data, postData) => {
	if (data['responseData']['type'] === 'social')
	{
		CompareFriendsThreads.ParseThreads(data['responseData']['teasers']);
	}
});

/**
 * Thread is opened
 */
FoEproxy.addHandler('ConversationSettingsService', 'getSettings', (data, postData) => {
	if(postData[0]['requestClass'] === 'ConversationSettingsService' && postData[0]['requestMethod'] === 'getSettings')
	{
		if (data['responseData']['participants']) {
			CompareFriendsThreads.CurrentThread = postData[0]['requestData'][0];
			CompareFriendsThreads.ParseThreadParticipants(data['responseData']['participants']);

			if ($('#friendsCompareBox').length > 0) {
				setTimeout(()=>{
					CompareFriendsThreads.BuildBody(true);
				}, 200);
			}
		}
	}
});


/**
 * Friend is deleted
 */
FoEproxy.addHandler('FriendService', 'deleteFriend', (data, postData) => {
	if ($('#friendsCompareBox').length > 0) {
		setTimeout(()=>{
			CompareFriendsThreads.BuildBody(true);
		}, 200);
	}
});

/**
 * Compare friends list with threads
 *
 * @type {{Threads: *[], CurrentThread: number, ThreadParticipants: *[], ParseThreadParticipants: CompareFriendsThreads.ParseThreadParticipants, BuildBody: CompareFriendsThreads.BuildBody, ParseThreads: CompareFriendsThreads.ParseThreads}}
 */
let CompareFriendsThreads = {

	/**
	 * All threads
	 */
	Threads: [],

	/**
	 * All participants
	 */
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
			let index = CompareFriendsThreads.Threads.findIndex(t => t.id === data[i].id);

			// not found
			if(index === -1){
				CompareFriendsThreads.Threads.push({
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

		let key = CompareFriendsThreads.Threads.findIndex(t => t.id === CompareFriendsThreads.CurrentThread);

		CompareFriendsThreads.Threads[key]['participants'] = data;
	},


	/**
	 * Create a table
	 *
	 * @param rebuild
	 * @constructor
	 */
	BuildBody: (rebuild = false)=> {

		/*
		if(!rebuild){
			CompareFriendsThreads.Threads = [];
		}
		*/

		if ($('#friendsCompareBox').length === 0) {
			HTML.Box({
				id: 'friendsCompareBox',
				title: i18n('Boxes.CompareFriendsThreads.Title'),
				ask: i18n('Boxes.CompareFriendsThreads.HelpLink'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
			});

			HTML.AddCssFile('compare_friends_threads');

		} else if(!rebuild) {
			HTML.CloseOpenBox('friendsCompareBox');
		}

		// no threads visited
		if(CompareFriendsThreads.Threads[0]?.participants.length === undefined){
			let info = `<div class="text-center text-warning" style="margin-top:2em">${i18n('Boxes.CompareFriendsThreads.Information')}</div>`;

			$('#friendsCompareBoxBody').html(info);

			return;
		}

		let t = [];

		t.push('<table id="friendsCompareTable" class="foe-table sortable-table">');

		t.push('<thead class="sticky">');
		t.push('<tr>');

		t.push('<th>&nbsp;</th>');

		for(let i in CompareFriendsThreads.Threads){
			let d = CompareFriendsThreads.Threads[i];

			if(d['participants'].length === 0){
				continue;
			}

			t.push(`<th><span title="${d.title}">${d.title}</span></th>`);
		}

		t.push('</tr>');
		t.push('</thead>');
		t.push('<tbody>');

		let PlayerList = Object.values(PlayerDict).filter(obj => (obj['IsFriend'] === true));

		PlayerList = PlayerList.sort(function (a, b) {
			return b['Score'] - a['Score'];
		});

		for (let p in PlayerList)
		{
			let Player = PlayerList[p];
			t.push('<tr>');

			t.push(`<td>#${(parseInt(p) + 1)} <img style="max-width: 22px" src="${srcLinks.GetPortrait(Player['Avatar'])}" alt="${Player['PlayerName']}"> ` 
				+ `${`<span class="activity activity_${Player['Activity']}"></span> ` 
				+ MainParser.GetPlayerLink(Player['PlayerID'], Player['PlayerName'])}</td>`);

			for(let x in CompareFriendsThreads.Threads)
			{
				if(CompareFriendsThreads.Threads[x]['participants'].length === 0){
					continue;
				}

				if(CompareFriendsThreads.Threads[x]['participants'].findIndex(p => p.playerId === Player.PlayerID) === -1){
					t.push(`<td class="text-center text-danger">❌</td>`);
				} else {
					t.push(`<td class="text-center">✔</td>`);
				}
			}

			t.push('</tr>');
		}

		t.push('</tbody>');

		t.push('</table>');

		$('#friendsCompareBoxBody').html(t.join(''));
	}
};