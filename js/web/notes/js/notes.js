/*
 * **************************************************************************************
 *
 * Dateiname:                 notes.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              22.12.19, 14:31 Uhr
 * zuletzt bearbeitet:       22.12.19, 14:31 Uhr
 *
 * Copyright © 2019
 *
 * **************************************************************************************
 */

let Notes = {

	/**
	 * Creates a small box in the DOM by call from other modules
	 * like a popup
	 */
	buildTextBox: ()=>{
		if ($('#note-box').length === 0) {
			let args = {
				'id': 'note-box',
				'title': 'Notiz',
				'auto_close': true,
				'dragdrop': true,
				'minimize': true
			};

			HTML.Box(args);
		}

		Notes.createIframeBox();
	},


	/**
	 * A fresh iframe in a box
	 *
	 * @Todo: Choice for textarea or input
	 *
	 * @param id
	 * @param callback
	 */
	createIframeBox: (id = '#note-boxBody', callback = 'Notes.saveInfoToUser')=> {
		let u = extUrl + 'content/text-box.html?lng=' + MainParser.Language,
			i = $('<iframe />').attr('src', u).css({'width':'100%','height':'100%'}).attr('frameBorder','0');


		$(id).html( i );

		// hier einen Callback Namen rein, mit dem entsprechenden Ziel
		Notes.getMessageFromIframe(callback);
	},


	/**
	 * Waiting for an info from the iFrame text box
	 *
	 * @param callback
	 */
	getMessageFromIframe: (callback)=> {
		let eventMethod = window.addEventListener ? "addEventListener" : "attachEvent",
			eventer = window[eventMethod],
			messageEvent = eventMethod === "attachEvent" ? "onmessage" : "message";

		eventer(messageEvent, function (e) {
			// TODO: check if this origin check still works
			if (e.data !== undefined && e.origin === extUrl){
				let text = e.data;

				if(text === 'closeBox'){
					Notes.closeBox();

				} else {
					callback(e.data);
				}
			}
		});
	},


	/**
	 * Example of a callback
	 *
	 * @param text
	 */
	saveInfo: (text)=> {
		console.log('Text vom iFrame: ', text);

		// irgend was mit dem Text machen, Speichern, zum Server senden...

		Notes.closeBox();
	},


	/**
	 * Save to external?
	 */
	setNote: ()=>{

		let data = {
			other_id: '',
			type: '',
			data: '',
			alarm: ''
		};

		// ab zum Server
		chrome.runtime.sendMessage(extID, {
			type: 'send2Api',
			url: ApiURL + 'PlayerNotes/set.php?player_id=' + ExtPlayerID + '&guild_id=' + ExtGuildID + '&world=' + ExtWorld,
			data: JSON.stringify(data)
		});

	},


	/**
	 * Callback for close the Popup
	 */
	closeBox: ()=> {
		$('#note-box').fadeToggle(function(){
			$(this).remove();
		});
	}
};