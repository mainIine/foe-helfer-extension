/*
 * *************************************************************************************
 *
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
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
		if (webhooks) {
			Discord.WebHooks = webhooks;
		}

		let url = JSON.parse(localStorage.getItem('DiscordWebHookUrls'));
		if (url) {
			Discord.WebHooksUrls = url;
		}
	},


	BuildBox: ()=> {
		if ($('#Discord').length === 0) {
			HTML.Box({
				id: 'Discord',
				title: i18n('Boxes.Discord.Title'),
				auto_close: true,
				dragdrop: true,
				resize: true
			});

			HTML.AddCssFile('discord');
		}
		else {
			HTML.CloseOpenBox('Discord');
			return ;
		}

		Discord.BuildContent();
	},

	BuildContent: ()=> {
		let h = [],
			$body = $('body');
		h.push('<div id="helperWebhook"></div>');

		h.push(`<h1 class="p5 dark-bg">${i18n('Boxes.Discord.TitleEntries')}</h1>`);
		h.push(`<ul class="foe-table">`);

		for(let i in Discord.WebHooks) {
			if(!Discord.WebHooks.hasOwnProperty(i) || !Discord.WebHooks[i]) {
				continue;
			}

			let d = Discord.WebHooks[i];

			h.push(`<li>`);
				h.push(`<span>${d.message}</span>`);
				h.push(`<span style="white-space:nowrap;" class="text-right">
					<span class="btn-group">
					<button class="btn btn-green btn-slim" role="button" type="button" onclick="Discord.SendEntry(${i})">${i18n('General.Send')}</button>
					<button class="btn btn-slim" role="button" type="button" data-original-title="${i18n('Boxes.Discord.CopyTitle')}" onclick="Discord.CopyEntry(${i})"><img src="${extUrl}js/web/discord/images/copy-paste.svg" style="width: 17px;" alt="" /></button>
					<button class="btn btn-slim btn-edit" role="button" type="button" onclick="Discord.EntryForm(${i})">${i18n('Boxes.Discord.EditEntry')}</button>
					<button class="btn btn-slim btn-delete icon" role="button" type="button" onclick="Discord.Delete(${i})"></button>
					
					</span>
					</span>`);
			h.push(`</li>`);
		}

		h.push(`</ul>`);
		h.push(`<div class="formWrapper"></div>`);

		h.push(`<div>`);
			h.push(`<button class="btn" id="addDiscordEntry" role="button" type="button" onclick="Discord.EntryForm()">${i18n('Boxes.Discord.TitleNewEntry')}</button>`);
		h.push(`</div>`);

		$('#DiscordBody').html(h.join(''));

		$('[data-original-title]').tooltip();

		$body.on('click', '#DiscordWebhookUrlsclose', function (){
			Discord.CloseOverlay('DiscordWebhookUrls');
		});

		Discord.BuildWebhookFormContent();	
	},

	BuildWebhookFormContent(state = '') {
		let h = [];
		h.push(`<div class="foehelper-accordion ${state}">`);
			h.push('<div class="foehelper-accordion-head">');
				h.push(`<strong>${i18n('Boxes.Discord.WebhookUrlManage')}</strong>`);
			h.push(`</div>`);
		
		h.push('<div class="foehelper-accordion-body">');
		
		h.push(`<form onsubmit="return false;" autocomplete="off">`);
		h.push(`<table class="foe-table no-hover vertical-middle" style="margin-bottom: 1.5rem;">`);
		h.push(`<thead>`);
		h.push(`<tbody>`);

		for(let url of Discord.WebHooksUrls) {
			h.push(`<tr>`);
			h.push(`<td style="width: 1%;">${url.name}</td>`);
			h.push(`<td style="word-break:break-all;font-size:smaller;">${url.url}</td>`);
			h.push(`<td style="white-space:nowrap;"><button class="btn btn-delete" role="button" type="button" onclick="Discord.DeleteWebhookUrl(${Discord.WebHooksUrls.indexOf(url)})">${i18n('Boxes.Discord.DeleteEntry')}</button></td>`);
			h.push(`</tr>`);
		}

		h.push(`<tr>`);
		h.push(`<td style="width: 1%;"><input style="width:80px" id="webhookUrlName" name="name" type="text" placeholder="Name" spellcheck="false"></td>`);
		h.push(`<td><input id="webhookUrlInput" name="url" placeholder="Webhook-URL" type="text" spellcheck="false" style="width:100%"></td>`);
		h.push(`<td style="white-space:nowrap;" class="text-right"><button class="btn" role="button" type="button" onclick="Discord.SaveWebhookUrl()">${i18n('Boxes.Discord.Save')}</button></td>`);
		h.push(`</tr>`);

		h.push(`</tbody>`);
		h.push(`</table>`);
		h.push(`</form>`);
		h.push(`</div>`);
		h.push(`</div>`);

		$('#helperWebhook').html(h.join('')).promise().done(function() {
			document.querySelector('#DiscordBody .foehelper-accordion-head').addEventListener('click',function (event) {
				let $this = $(event.target).parent('.foehelper-accordion'),
					isOpen = $this.hasClass('open');

				$('#DiscordBody .foehelper-accordion').removeClass('open');

				if(!isOpen){
					$this.addClass('open');
				}
			});
		});
	},

	EntryForm: (i = '')=> {
		$('#addDiscordEntry').hide();
		if ($('#discord-entry-form').length && $('#discord-entry-form').data('entry') === String(i)) {
			$('#discord-entry-form').slideDown(function(){ $(this).remove(); });
			return;
		}

		let data;

		if(i !== ''){
			data = Discord.WebHooks[parseInt(i)];
		}

		let h = [];

		h.push(`<div id="discord-entry-form" style="display:none;" class="dark-bg">
			<h1 class="p5">${i18n('Boxes.Discord.TitleNewEntry')}</h1>`);
		h.push(`<form action="" onsubmit="return false;" autocomplete="off">
			<b>${i18n('Boxes.Discord.WebhookUrl')}</b>`);
		h.push(`<ul id="url-list" class="clickable">`);
		
		if (Discord.WebHooksUrls.length === 0) {
			h.push(`<li><em>${i18n('Boxes.Discord.WebhookUrlNeeded')}</em></li>`);
		}
		for(let j in Discord.WebHooksUrls){
			if(!Discord.WebHooksUrls.hasOwnProperty(j)) continue;

			let url = Discord.WebHooksUrls[j];
			let isSelected = url && (
				(data && url['url'] === data['url']) ||
				(!data && Discord.WebHooksUrls.length === 1)
			);

			h.push(`<li data-url="${url['url']}" class="discord-url-item${isSelected ? ' selected' : ''}" onclick="Discord.SelectUrl(this)">${url['name']}</li>`);
		}

		h.push(`</ul>`);
		h.push(`<input type="hidden" id="url" value="${data && data['url'] ? data['url'] : (Discord.WebHooksUrls.length === 1 ? Discord.WebHooksUrls[0]['url'] : '')}">`);


		h.push(`<b>${i18n('Boxes.Discord.Message')}</b>`);
		h.push(`<textarea id="message" name="message" spellcheck="false">${data ? data['message'] : ':robot: **Test message**\nFoE Helper was here!'}</textarea>`);


		h.push(`<div>`);
		h.push(`<button class="btn" role="button" type="button" onclick="Discord.CancelEntryForm()">${i18n('General.Cancel')}</button>&nbsp;`);
		h.push(`<button class="btn btn-green" role="button" type="button" onclick="Discord.SendEntry()">${i18n('General.Send')}</button>&nbsp;`);
		h.push(`<button class="btn" role="button" type="button" onclick="Discord.SaveEntry(${i})">${i18n('General.Save')}</button></div>`);

		h.push(`</form></div>`);

		$('#discord-entry-form').remove();
		$('#DiscordBody .formWrapper').append(h.join(''));
		$('#discord-entry-form').data('entry', String(i)).slideDown();
	},


	SaveEntry: (i = '')=> {
		$('#addDiscordEntry').show();
		const data = {
			url: $('#url').val(),
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
	},


	CancelEntryForm: ()=> {
		$('#discord-entry-form').slideUp(function(){ $(this).remove(); });
		$('#addDiscordEntry').show();
	},


	SaveWebhookUrl: ()=> {
		Discord.WebHooksUrls.push({
			name: $('#webhookUrlName').val(),
			url: $('#webhookUrlInput').val(),
		});
		localStorage.setItem('DiscordWebHookUrls', JSON.stringify(Discord.WebHooksUrls));
		Discord.BuildWebhookFormContent('open');
	},


	TestEntry: ()=> {
		const url = $('#url').val();

		if(!url) {
			HTML.ShowToastMsg({
				show: 'force',
				head: 'Error',
				text: 'Please select a Webhook URL first!',
				type: 'error',
				hideAfter: 6000,
			});

			return;
		}

		let e = {
				url: url,
				message: '**This is only a test!**' + "\n\n" + $('#message').val()
			};

		Discord.PrepareMessageForSend(e);

		HTML.ShowToastMsg({
			show: 'force',
			head: 'Is send',
			text: 'The message was sent to the webhook.',
			type: 'success',
			hideAfter: 2500,
		});
	},


	SendEntry: (entryId = null)=> {
		let url = $('#url').val();
		let msg = $('#message').val();
		if (entryId !== null) {
			url = Discord.WebHooks[entryId].url;
			msg = Discord.WebHooks[entryId].message;
		}
		if(!url) {
			HTML.ShowToastMsg({
				show: 'force',
				head: 'Error',
				text: 'Please select a Webhook URL first!',
				type: 'error',
				hideAfter: 6000,
			});

			return;
		}

		let e = {
				url: url,
				message: msg
			};

		Discord.PrepareMessageForSend(e);

		HTML.ShowToastMsg({
			show: 'force',
			head: 'Is send',
			text: 'The message was sent to the webhook.',
			type: 'success',
			hideAfter: 2500,
		});
	},


	/**
	 * Delete a entry from the given index
	 */
	Delete: (i)=> {
		delete Discord.WebHooks[i];

		Discord.WebHooks = Discord.WebHooks.filter(function (el) {
			return el != null;
		});

		Discord.SaveTheData();
	},


	DeleteWebhookUrl: (i)=> {

		// delete entry
		delete Discord.WebHooksUrls[i];

		Discord.WebHooksUrls = Discord.WebHooksUrls.filter(function (el) {
			return el != null;
		});

		// save the array to localstorage
		localStorage.setItem('DiscordWebHookUrls', JSON.stringify(Discord.WebHooksUrls));

		Discord.BuildWebhookFormContent('open');
	},


	CopyEntry: (i) => {
		i = parseInt(i);
		let data = Object.assign({}, Discord.WebHooks[i]);

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
		if(Discord.WebHooks.length === 0 || Discord.WebHookDone[id]){
			return;
		}

		let entries = Discord.WebHooks.filter((e)=> e.event === event);

		for(let i in entries)
		{
			let e = entries[i];
			Discord.PrepareMessageForSend(e);
			Discord.WebHookDone[id] = event;
		}
	},


	PrepareMessageForSend: (e)=> {
		// send message to discord api
		Discord.SendMessage(
			e.url,
			{
				username: 'FoE Helper',
				avatar_url: 'https://foe-helper.com/theme/img/favicon/apple-touch-icon.png',
				content: e.message
			}
		)
		.then();
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


	SelectUrl: (el)=> {
		$('#url-list .discord-url-item').css('font-weight', '').removeClass('selected');
		$(el).css('font-weight', 'bold').addClass('selected');
		$('#url').val($(el).data('url'));
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