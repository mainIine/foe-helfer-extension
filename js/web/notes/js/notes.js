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
	 * Erzeugt eine kleine Box in der
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
	 * Ein frisches iFrame in die Box setzen
	 */
	createIframeBox: ()=> {
		let u =  + '/content/text-box.html?lng=' + MainParser.Language,
			i = $('<iframe />').attr('src', u).css({'width':'100%','height':'100%'}).attr('frameBorder','0');

		$('#note-boxBody').html( i );

		// hier einen Callback Namen rein, mit dem entsprechenden Ziel
		Notes.getMessageFromIframe('saveInfoToUser');
	},


	/**
	 * Wartet auf eine Info von der iFrame-Textbox
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
					Notes[callback](e.data);
				}
			}
		});
	},


	// Beispiel eines Callbacks
	saveInfo: (text)=> {
		console.log('Text vom iFrame: ', text);

		// irgend was mit dem Text machen, Speichern, zum Server senden...

		Notes.closeBox();
	},


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


	closeBox: ()=> {
		$('#note-box').fadeToggle(function(){
			$(this).remove();
		});
	}
};