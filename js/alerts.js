/*
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * Licensed under AGPL - see LICENSE.md for details.
 */

let lng = window.navigator.language.split('-')[0];

let i18n = {
	'de' : {
		'title' : 'Forge Hammer',
		'desc' : "",
		'thanks' : 'Vielen Dank!'
	},
	'en' : {
		'title' : 'Forge Hammer',
		'desc' : "",
		'thanks' : 'Thank you so much!'
	},
};

$(async function(){

	const Alerts = (() => {
		async function extApiCall(request) {
			const res = await browser.runtime.sendMessage(request);
			if (res.ok) {
				return res.data;
			} else {
				throw new Error("EXT-API error: "+res.error);
			}
		}
		return {
			getAll: function() {
				return extApiCall({type: 'alerts', action: 'getAll'});
			},
			getAllRaw: function() {
				return extApiCall({type: 'alerts', action: 'getAllRaw'});
			},
			create: function(data) {
				throw new Error("Not supported");
			},
			delete: function(id) {
				return extApiCall({type: 'alerts', action: 'delete', id: id});
			}
		};
	})();

	if(lng !== 'de'){
		$('[data-translate]').each(function(){
			let txt = $(this).data('translate');

			if( i18n[lng][txt] !== undefined ){
				$(this).html( i18n[lng][txt]);
			} else {
				$(this).html( i18n['en'][txt]);
			}
		});
	}

	const list = document.getElementById('list');

	const alerts = await Alerts.getAllRaw();
	if (alerts == null) return;

	for (let alert of alerts) {
		const item = document.createElement('li');
		// TODO: discuss: should an actual link be saved
		const link = document.createElement('a');
		link.href = '#';
		link.innerText = alert.server;
		link.addEventListener('click', () => {
			chrome.tabs.query({url: alert.server+'/*'}, list => {
				if (list.length > 0) {
					const tab = list[0];
					chrome.tabs.update(tab.id, {active: true});
					chrome.windows.update(tab.windowId, {focused: true});
				} else {
					chrome.tabs.create({url: alert.server+'/game/index'});
				}
			});
		});
		item.appendChild(link);

		item.appendChild(document.createTextNode(alert.data.title));
		item.appendChild(document.createTextNode(alert.data.body));

		const time = document.createElement('span');
		time.classList.add('text-right');
		time.innerText = new Date(alert.data.expires).toString();
		item.appendChild(time);

		const id = alert.id;
		const deleteBtn = document.createElement('button');
		deleteBtn.innerText = '❌';
		deleteBtn.addEventListener('click', () => {
			item.remove();
			Alerts.delete(id);
		});
		item.appendChild(deleteBtn);

		list.appendChild(item);
	}

});
