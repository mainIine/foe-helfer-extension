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

let Discord = {

	StorageName: 'DiscordWebHooks',
	WebHooks: [],
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
	},


	BuildBox: ()=> {
		if ($('#Discord').length === 0)
		{
			HTML.Box({
				id: 'Discord',
				title: i18n('Boxes.Discord.Title'),
				auto_close: true,
				dragdrop: true,
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

		let h = [];

		h.push(`<table class="foe-table no-hover vertical-top">`);
			h.push(`<thead>`);
				h.push(`<tr>`);
					h.push(`<th>${i18n('Boxes.Discord.Name')}</th>`);
					h.push(`<th>URL</th>`);
					h.push(`<th>${i18n('Boxes.Discord.Event')}</th>`);
					h.push(`<th>${i18n('Boxes.Discord.Message')}</th>`);
					h.push(`<th style="width:1%"></th>`);
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
				h.push(`<td>${d.url.substring(0,30)}...</td>`);
				h.push(`<td>${d.event}</td>`);
				h.push(`<td>${d.message}</td>`);
				h.push(`<td style="white-space:nowrap;"><button class="btn-default btn-delete" role="button" type="button" onclick="Discord.Delete(${i})">${i18n('Boxes.Discord.DeleteEntry')}</button>&nbsp;<button class="btn-default" role="button" type="button" onclick="Discord.EntryForm(${i})">${i18n('Boxes.Discord.EditEntry')}</button></td>`);
			h.push(`</tr>`);
		}

		h.push(`<tr>`);
			h.push(`<td colspan="5" class="text-right"><small><em class="text-warning">${i18n('Boxes.Discord.VisitGGMapBefore')}</em></small>&nbsp;&nbsp;<button class="btn-default" role="button" type="button" onclick="Discord.EntryForm()">${i18n('Boxes.Discord.TitleNewEntry')}</button></td>`);
		h.push(`</tr>`);

		h.push(`</tbody>`);
		h.push(`</table>`);

		$('#DiscordBody').html(h.join(''));

		$('body').on('click', '#DiscordNewEntryclose', function (){
			Discord.CloseOverlay();
		});
	},


	EntryForm: (i = '')=> {

		let data;

		if(i !== ''){
			data = Discord.WebHooks[parseInt(i)];
		}

		$('body').prepend( $('<div class="foe-helper-overlay" />') );

		HTML.Box({
			id: 'DiscordNewEntry',
			title: i18n('Boxes.Discord.TitleNewEntry'),
			ask: i18n('Boxes.Discord.HelpLink')
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
			h.push(`<th>${i18n('Boxes.Discord.WebhookUrl')}</th>`);
			h.push(`<td><input value="${data?data['url']:''}" id="url" name="url" type="text" spellcheck="false"></td>`);
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
				'The province "#gg_province_name#" should be attacked!!'}</textarea><small><em class="text-warning">#gg_province_name# for province name replace</em></small></td>`);
			h.push(`</tr>`);

			h.push(`<tr>`);
			h.push(`<td colspan="2" class="text-right">
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

		localStorage.setItem(Discord.StorageName, JSON.stringify(Discord.WebHooks));

		Discord.BuildContent();
		Discord.CloseOverlay();
	},


	Delete: (i)=> {

		// delete entry
		delete Discord.WebHooks[i];

		// reindex
		Discord.WebHooks.filter(Boolean);

		// save new array to localstorage
		localStorage.setItem(Discord.StorageName, JSON.stringify(Discord.WebHooks));

		// rebuild table
		Discord.BuildContent();
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

					// save for check
					Discord.WebHookDone[id] = 'gbg';

					break;
			}
		}
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


	CloseOverlay: ()=> {
		$('#DiscordNewEntry').fadeToggle(function() {
			$(this).remove();
			$('.foe-helper-overlay').remove();
		});
	}
};

// get all WebHooks
setTimeout(()=>{
	Discord.init();
}, 1000);
