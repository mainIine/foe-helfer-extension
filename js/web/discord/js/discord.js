/*
 * *************************************************************************************
 *
 * Copyright (C) 2024 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

/*

@Todo:
- Testbutton to check the Settings
-

*/

/**
 *
 * @type {{Delete: Discord.Delete, init: Discord.init, WebHookDone: {}, ActiveEntry: number, CopyEntry: Discord.CopyEntry, TestEntry: Discord.TestEntry, CloseOverlay: Discord.CloseOverlay, PrepareMessageForSend: Discord.PrepareMessageForSend, BuildBox: Discord.BuildBox, EntryForm: Discord.EntryForm, SaveTheData: Discord.SaveTheData, WebhookUrls: Discord.WebhookUrls, StorageName: string, Save: Discord.Save, CheckForEvent: Discord.CheckForEvent, WebHooks: *[], BuildContent: Discord.BuildContent, WebHooksUrls: *[], SendMessage: (function(*, *): Promise<Response>)}}
 */

let Discord = {

	StorageName: 'DiscordWebHooks',
	WebHooks: [],
	WebHooksUrls: [],
	WebHookDone: {},
	ActiveEntry: 0,


	/**
	 * Get active Webhooks
	 */
	init: ()=> {

		let webhooks = JSON.parse(localStorage.getItem(Discord.StorageName));

		if (webhooks)
		{
			Discord.WebHooks = webhooks;
		}

		let url = JSON.parse(localStorage.getItem('DiscordWebHookUrls'));

		if (url)
		{
			Discord.WebHooksUrls = url;
		}
	},


	BuildBox: ()=> {
		if ($('#Discord').length === 0)
		{
			HTML.Box({
				id: 'Discord',
				title: i18n('Boxes.Discord.Title'),
				auto_close: true,
				dragdrop: true,
				ask: i18n('Boxes.Discord.HelpLink')
			});

			HTML.AddCssFile('discord');
		}
		else
		{
			HTML.CloseOpenBox('Discord');
			return ;
		}

		Discord.BuildContent();
	},


	BuildContent: ()=> {

		let h = [],
			$body = $('body');

		h.push(`<table class="foe-table no-hover vertical-top">`);
			h.push(`<thead>`);
				h.push(`<tr>`);
					h.push(`<th>${i18n('Boxes.Discord.Name')}</th>`);
					h.push(`<th>${i18n('Boxes.Discord.Event')}</th>`);
					h.push(`<th>${i18n('Boxes.Discord.Message')}</th>`);
					h.push(`<th style="width:1%" class="text-right"><button class="btn-default btn-tight" role="button" type="button" onclick="Discord.WebhookUrlsForm()">Webhook URLs</button></th>`);
				h.push(`</tr>`);
			h.push(`</thead>`);
		h.push(`<tbody>`);

		for(let i in Discord.WebHooks)
		{
			if(!Discord.WebHooks.hasOwnProperty(i)) {
				continue;
			}

			if(!Discord.WebHooks[i] || !Discord.WebHooks[i]['name']){
				continue;
			}

			let d = Discord.WebHooks[i];

			h.push(`<tr>`);
				h.push(`<td>${d.name}</td>`);
				h.push(`<td>${d.event}</td>`);
				h.push(`<td>${d.message}</td>`);
				h.push(`<td style="white-space:nowrap;"><button class="btn-default btn-delete" role="button" type="button" onclick="Discord.Delete(${i})">${i18n('Boxes.Discord.DeleteEntry')}</button>&nbsp;<button class="btn-default" role="button" type="button" onclick="Discord.CopyEntry(${i})"><img src="${extUrl}js/web/discord/images/copy-paste.svg" style="width: 19px;" alt="" /></button>&nbsp;<button class="btn-default" role="button" type="button" onclick="Discord.EntryForm(${i})">${i18n('Boxes.Discord.EditEntry')}</button></td>`);
			h.push(`</tr>`);
		}

		h.push(`<tr>`);
			h.push(`<td colspan="5" class="text-right"><small><em class="text-warning">${i18n('Boxes.Discord.VisitGGMapBefore')}</em></small>&nbsp;&nbsp;<button class="btn-default" role="button" type="button" onclick="Discord.EntryForm()">${i18n('Boxes.Discord.TitleNewEntry')}</button></td>`);
		h.push(`</tr>`);

		h.push(`</tbody>`);
		h.push(`</table>`);

		$('#DiscordBody').html(h.join(''));

		$body.on('click', '#DiscordNewEntryclose', function (){
			Discord.CloseOverlay('DiscordNewEntry');
		});

		$body.on('click', '#DiscordWebhookUrlsclose', function (){
			Discord.CloseOverlay('DiscordWebhookUrls');
		});
	},


	EntryForm: (i = '')=> {

		let data;

		if(i !== ''){
			data = Discord.WebHooks[parseInt(i)];
		}

		//$('body').prepend( $('<div class="foe-helper-overlay" />') );

		HTML.Box({
			id: 'DiscordNewEntry',
			title: i18n('Boxes.Discord.TitleNewEntry')
		});

		setTimeout(()=>{
			let h = [];

			h.push(`<form id="discord-webhooks" action="" onsubmit="return false;" autocomplete="off">`);
			h.push(`<table class="foe-table no-hover vertical-top">`);
			h.push(`<thead>`);

			h.push(`<tr>`);
			h.push(`<th>${i18n('Boxes.Discord.Name')}</th>`);
			h.push(`<td><input value="${data?data['name']:''}"  id="name" name="name" type="text" spellcheck="false"></td>`);
			h.push(`</tr>`);

			h.push(`<tr>`);
			h.push(`<th style="white-space:nowrap">${i18n('Boxes.Discord.WebhookUrl')}</th>`);
			h.push(`<td>`);
			h.push(`<select id="url">`);

			for(let i in Discord.WebHooksUrls){
				if(!Discord.WebHooksUrls.hasOwnProperty(i)) {
					continue;
				}

				let url = Discord.WebHooksUrls[i];

				h.push(`<option${url && data && (url['url'] === data['url'] || Discord.WebHooksUrls.length === 1) ? ' selected' : ''} value="${url['url']}">${url['name']}</option>`);
			}

			h.push(`</td>`);
			h.push(`</tr>`);

			h.push(`<tr>`);
			h.push(`<th>Event</th>`);
			h.push(`<td>
				<select id="event">
					<option value="gbg"${data && data['event'] === 'gbg' ? ' selected' : ''}>Gildfights</option>
				</select> `);

			if(GuildFights?.MapData?.map['id']){
				h.push(`<select id="province">`);

				for(let i in ProvinceMap.ProvinceData()) {
					let d = ProvinceMap.ProvinceData()[i];

					h.push(`<option${data && parseInt(data['province']) === d['id'] ? ' selected' : ''} value="${d['id']}">${d['name']}</option>`);
				}

				h.push(`</select>`);
			}

			h.push(`</td>`);
			h.push(`</tr>`);

			h.push(`<tr>`);
			h.push(`<th>${i18n('Boxes.Discord.Message')}</th>`);
			h.push(`<td><textarea id="message" name="message" spellcheck="false">${data?data['message']:':flame: Aware!!\n' +
				'The province "#gg_province_name#" should be attacked from other gild!!'}</textarea><small><em class="text-warning">#gg_province_name# for province name replace</em></small></td>`);
			h.push(`</tr>`);

			h.push(`<tr>`);
			h.push(`<td colspan="2" class="text-right">
				<button class="btn-default" role="button" type="button" onclick="Discord.TestEntry()">${i18n('Boxes.Discord.TestEntry')}</button>&nbsp;
				<button class="btn-default" role="button" type="button" onclick="Discord.Save(${i})">${i18n('Boxes.Discord.Save')}</button>
			</td>`);
			h.push(`</tr>`);
			h.push(`</thead>`);
			h.push(`<tbody>`);

			$('#DiscordNewEntryBody').html(h.join(''));

		}, 600);
	},


	Save: (i = '')=> {

		const data = {
			name: $('#name').val(),
			url: $('#url').val(),
			event: $('#event').val(),
			province: parseInt($('#province').val()),
			message: $('#message').val()
		};

		if(i !== ''){
			Discord.WebHooks[parseInt(i)] = data;
		}
		else {
			Discord.WebHooks.push(data);
		}

		// save & rebuild
		Discord.SaveTheData();

		Discord.CloseOverlay();
	},


	WebhookUrlsForm: ()=> {

		$('body').prepend( $('<div class="foe-helper-overlay" />') );

		HTML.Box({
			id: 'DiscordWebhookUrls',
			title: i18n('Boxes.Discord.WebhookUrls'),
			dragdrop: true
		});

		setTimeout(()=>{
			Discord.BuildWebhookFormContent();
		}, 600);

	},


	BuildWebhookFormContent: ()=> {
		let h = [];

		h.push(`<form onsubmit="return false;" autocomplete="off">`);
		h.push(`<table class="foe-table no-hover vertical-middle">`);
		h.push(`<thead>`);
		h.push(`<tr>`);
		h.push(`<th>Channel</th>`);
		h.push(`<th>Url</th>`);
		h.push(`<th style="width:1%" class="text-right"></th>`);
		h.push(`</tr>`);
		h.push(`</thead>`);
		h.push(`<tbody>`);

		for(let i in Discord.WebHooksUrls)
		{
			if(!Discord.WebHooksUrls.hasOwnProperty(i)) {
				continue;
			}

			let d = Discord.WebHooksUrls[i];

			h.push(`<tr>`);
			h.push(`<td style="width: 1%;">${d.name}</td>`);
			h.push(`<td>${d.url.substring(0, 30)}...</td>`);
			h.push(`<td style="white-space:nowrap;"><button class="btn-default btn-delete" role="button" type="button" onclick="Discord.DeleteWebhookUrl(${i})">${i18n('Boxes.Discord.DeleteEntry')}</button></td>`);
			h.push(`</tr>`);
		}

		h.push(`<tr>`);
		h.push(`<td style="width: 1%;"><input id="name" name="name" type="text" spellcheck="false"></td>`);
		h.push(`<td><input id="url" name="url" type="text" spellcheck="false" style="width:100%"></td>`);
		h.push(`<td style="white-space:nowrap;" class="text-right"><button class="btn-default" role="button" type="button" onclick="Discord.SaveWebhookUrl()">${i18n('Boxes.Discord.Save')}</button></td>`);
		h.push(`</tr>`);

		h.push(`</tbody>`);
		h.push(`</table>`);
		h.push(`</form>`);

		$('#DiscordWebhookUrlsBody').html(h.join(''));
	},


	SaveWebhookUrl: ()=> {

		Discord.WebHooksUrls.push({
			name: $('#name').val(),
			url: $('#url').val(),
		});

		// save the array to localstorage
		localStorage.setItem('DiscordWebHookUrls', JSON.stringify(Discord.WebHooksUrls));

		Discord.BuildWebhookFormContent();
	},


	TestEntry: ()=> {

		if($('#province').length === 0)
		{
			HTML.ShowToastMsg({
				show: 'force',
				head: 'Error',
				text: 'Please visit the Gildfight maps first!',
				type: 'error',
				hideAfter: 6000,
			});

			return;
		}

		let e = {
				url: $('#url').val(),
				message: '**This is only a test to test the webhook!**' + "\n\n" + $('#message').val()
			},
			d = {
				name: ProvinceMap.ProvinceData()[parseInt($('#province').val())].name
			};

		Discord.PrepareMessageForSend(e, d);

		HTML.ShowToastMsg({
			show: 'force',
			head: 'Is send',
			text: 'The message was send to the webhook. Check it!',
			type: 'success',
			hideAfter: 2500,
		});
	},


	/**
	 * Delete a entry from the given index
	 *
	 * @param i
	 * @constructor
	 */
	Delete: (i)=> {

		// delete entry
		delete Discord.WebHooks[i];

		Discord.WebHooks = Discord.WebHooks.filter(function (el) {
			return el != null;
		});

		Discord.SaveTheData();
	},


	/**
	 * Delete a entry from the given index
	 *
	 * @param i
	 * @constructor
	 */
	DeleteWebhookUrl: (i)=> {

		// delete entry
		delete Discord.WebHooksUrls[i];

		Discord.WebHooksUrls = Discord.WebHooksUrls.filter(function (el) {
			return el != null;
		});

		// save the array to localstorage
		localStorage.setItem('DiscordWebHookUrls', JSON.stringify(Discord.WebHooksUrls));

		Discord.BuildWebhookFormContent();
	},


	/**
	 * Create a copy from the given index
	 *
	 * @param i
	 * @constructor
	 */
	CopyEntry: (i) => {
		i = parseInt(i);
		let data = Object.assign({}, Discord.WebHooks[i]);

		data['name'] = i18n('Boxes.Discord.CopyTitle') + ' - ' + data['name'];

		Discord.WebHooks.push(data);

		Discord.SaveTheData();
	},


	SaveTheData: (rebuild = true)=> {
		// save the array to localstorage
		localStorage.setItem(Discord.StorageName, JSON.stringify(Discord.WebHooks));

		if(rebuild){
			// rebuild table
			Discord.BuildContent();
		}
	},


	CheckForEvent: (event, id = 0)=> {

		// No event or almost done
		if(Discord.WebHooks.length === 0 || Discord.WebHookDone[id]){
			return;
		}

		let entries = Discord.WebHooks.filter((e)=> e.event === event);

		for(let i in entries)
		{
			switch(event)
			{
				case 'gbg':

					let e = entries[i],
						d = ProvinceMap.ProvinceData()[id];

					if(e.province !== id){
						return ;
					}

					Discord.PrepareMessageForSend(e, d);

					// save for check
					Discord.WebHookDone[id] = 'gbg';

					break;
			}
		}
	},


	PrepareMessageForSend: (e, d)=> {
		// send message to discord api
		Discord.SendMessage(
			e.url,
			{
				username: 'FoE Helper - Extension Webhook',
				avatar_url: 'https://foe-helper.com/theme/img/favicon/apple-touch-icon.png',
				content: e.message.replace('#gg_province_name#', d.name)
			}
		)
			.then();
		//.then(a => a.json()).then(console.log); // only for debug
	},


	SendMessage: async (url, msg) => {
		return await fetch(url, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(msg)
		});
	},


	CloseOverlay: (id)=> {
		$(`#${id}`).fadeToggle(function() {
			$(this).remove();
			$('.foe-helper-overlay').remove();
		});
	},
};

// get all WebHooks
setTimeout(()=>{
	Discord.init();
}, 1000);
