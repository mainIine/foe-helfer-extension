/*
 * **************************************************************************************
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * **************************************************************************************
 */

let lng = window.navigator.language.split('-')[0];

let i18n = {
	'de' : {
		'title' : 'FoE Helfer',
		'desc' : "Dir gefällt diese kleine kostenlose Extension und du möchtest sie supporten damit das weiterhin so bleibt?<br> Dann ist jede kleine Spende für Support immer gern gesehen.",
		'thanks' : 'Vielen Dank!'
	},
	'en' : {
		'title' : 'FoE Helper',
		'desc' : "You like this little free extension and you want to support it so that it stays that way? <br> Then every little donation for support is always welcome.",
		'thanks' : 'Thank you so much!'
	},
	'fr' : {
		'title' : 'FoE Assistant',
		'desc' : "Vous aimez cette petite extension gratuite et vous voulez la soutenir pour continuer ainsi ? <br> Chaque petite donation pour le support est toujours la bienvenue.",
		'thanks' : 'Merci beaucoup !'
	},
	'ru' : {
		'title' : 'FoE Помощник',
		'desc' : "Вам нравится это маленькое бесплатное расширение и вы хотите поддержать его, чтобы оно оставалось таким же? <br> Тогда каждое маленькое пожертвование в поддержку проекта всегда приветствуется.",
		'thanks' : 'Большое спасибо!'
	},
	'sv' : {
		'title' : 'FoE Assistant',
		'desc' : "Du kommer tycka om detta lilla gratis tillägg och stöd det så det kan fortsätta så? <br> Varje liten donation för support är välkommet.",
		'thanks' : 'Tack så mucket!'
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

	$('body').on('click', '.foe-link', ()=> {
		chrome.tabs.create({url: "https://foe-helper.com/"});
	});

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
