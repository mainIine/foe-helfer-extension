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

/*
* guildFight
* */

let Discord = {

	WebHooks: [],

	/**
	 * Get active Webhooks
	 */
	init: ()=> {

		let webhooks = JSON.parse(localStorage.getItem('DiscordWebhooks'));

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

		h.push(`<form id="discord-webhooks" action="" onsubmit="return false;">`);
		h.push(`<table class="foe-table no-hover vertical-top">`);
		h.push(`<thead>`);
		h.push(`<tr>`);
		h.push(`<th>Name</th>`);
		h.push(`<th>URL</th>`);
		h.push(`<th>Event</th>`);
		h.push(`<th>Nachricht</th>`);
		h.push(`</tr>`);
		h.push(`</thead>`);
		h.push(`<tbody>`);

		for(let i in Discord.WebHooks)
		{
			if(!Discord.WebHooks.hasOwnProperty(i)) {
				continue;
			}

			let d = Discord.WebHooks[i];

			h.push(`<tr>`);
			h.push(`<td>${d.name}</td>`);
			h.push(`<td>${d.url}</td>`);
			h.push(`<td>${d.event}</td>`);
			h.push(`<td>${d.message}</td>`);
			h.push(`</tr>`);
		}

		h.push(`<tr>`);
		h.push(`<td><input id="webhook-name" name="name" type="text"></td>`);
		h.push(`<td><input id="webhook-url" name="url" type="text"></td>`);
		h.push(`<td><input id="webhook-event" name="event" type="text"></td>`);
		h.push(`<td><textarea id="webhook-message" name="message"></textarea></td>`);
		h.push(`</tr>`);

		h.push(`<tr>`);
		h.push(`<td colspan="4" class="text-right"><button class="btn-default" role="button" type="button" onclick="Discord.Save()">Speichern</button></td>`);
		h.push(`</tr>`);

		h.push(`</tbody>`);
		h.push(`</table>`);
		h.push(`</form>`);

		$('#DiscordBody').html(h.join(''));
	},

	Save: ()=> {
		const data = {
			name: $('#webhook-name').val(),
			url: $('#webhook-url').val(),
			event: $('#webhook-event').val(),
			message: $('#webhook-message').val()
		};

		Discord.WebHooks.push(data);

		localStorage.setItem('DiscordWebHooks', JSON.stringify(Discord.WebHooks));

		Discord.init();
		Discord.BuildContent();
	},


	CheckForEvent: (event)=> {
		let check = Discord.WebHooks.find((e)=>{e.event === event});

		if(check){
			console.log('check: ', check);
		}
	},


	SendMessage: ()=> {

		MainParser.sendExtMessage({
			type: 'send2Api',
			url: `https://discord.com/api/webhooks/945747958211686490/L9D-fGtq7MiT9LBWeQONIE13UlKNFrAnEUIkaAfDaHCOQwCFoliUQlVXvIHBjPvlshkn`,
			data: JSON.stringify({content: ':flame: Aware!!\nThe province "A1: Mati Tudokk" should be attacked!!'})
		});
	}
};

// get all WebHooks
Discord.init();
