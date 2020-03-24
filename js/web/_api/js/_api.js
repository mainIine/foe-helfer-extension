/*
 * **************************************************************************************
 *
 * Dateiname:                 _api.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              09.03.20, 15:36 Uhr
 * zuletzt bearbeitet:       09.03.20, 15:36 Uhr
 *
 * Copyright © 2020
 *
 * **************************************************************************************
 */

let API = {

	CustomerStatus: false,
	CustomerURL: null,
	CustomerToken: null,
	CustomerEndpoint: null,


	PrepareApi: ()=> {
		let url = localStorage.getItem('CustomerAPIURL');

		API.CustomerToken = localStorage.getItem('CustomerToken');

		// Gibt es eine URL?
		if(url !== null){
			API.CustomerURL = url;

		} else {
			return ;
		}

		API.CustomerEndpoint = API.CustomerURL;
	},


	ShowBox: ()=> {
		if( $('#customer-api').length > 0 ){
			HTML.CloseOpenBox('customer-api');

			return ;
		}

		// CSS in den DOM prügeln
		HTML.AddCssFile('_api');

		HTML.Box({
			'id': 'customer-api',
			'title': i18n('Boxes.Api.Title'),
			'auto_close': true,
			'dragdrop': true
		});

		API.BoxContent();
	},


	BoxContent: ()=> {
		let c = '',
			url = localStorage.getItem('CustomerApiURL'),
			token = localStorage.getItem('CustomerApiToken');

		if(null === token){
			token = API.CreateToken();
			localStorage.setItem('CustomerApiToken', token);
		}

		c += '<div class="box-row"><label>Aktiv:</label><select id="customer-api-active"><option value="true">ja</option><option value="false">nein</option></select></div>';

		c += '<div class="box-row"><label>Deine Server URL:</label><input type="text" id="customer-api-url"' + (url !== null ? ' value="' + url + '"' : '') + '></div>';

		c += '<div class="box-row"><label>Dein Token:</label><pre>' + token + '</pre></div>';

		c += '<div class="text-right"><button class="btn-default" id="api-save-button">Speichern</button></div>';


		$('#customer-apiBody').html(c);

		$('body').on('click', '#api-save-button', function(){
			localStorage.setItem('CustomerApiStatus', $('#customer-api-active').val() );
			localStorage.setItem('CustomerApiURL', $('#customer-api-url').val() );

			$.toast({
				heading: 'Gespeichert',
				text: 'Die Einstellungen der API wurden gespeichert',
				icon: 'success',
				hideAfter: 3000
			});
		});
	},


	SendData: (d)=> {

		if(null === API.CustomerEndpoint){
			return;
		}

		$.ajax({
			type: 'POST',
			url: API.CustomerEndpoint,
			data: d,
			headers: {
				'Authorization': 'Bearer ' + API.CustomerToken,
			},
			contentType: 'application/json; charset=utf-8',
			dataType: 'json'
		});
	},


	CreateToken: (length = 35)=> {

		let result = '',
			characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
			charactersLength = characters.length;

		for( let i = 0; i < length; i++ ) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}

		return result;
	}
};