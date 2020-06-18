/*
 * **************************************************************************************
 *
 * Dateiname:                 notice.js
 * Projekt:                   foe-chrome
 *
 * erstellt von:              Daniel Siekiera <daniel.siekiera@gmail.com>
 * erstellt am:	              24.05.20, 14:22 Uhr
 *
 * Copyright © 2020
 *
 * **************************************************************************************
 */

let Notice = {

	notes: null,

	init: ()=> {

		Notice.getData('Notice/get', (resp)=>{
			Notice.notes = resp.notice;

			Notice.buildBox();
		});
	},


	buildBox: () => {
		if( $('#notices').length < 1 )
		{
			// CSS into the DOM
			HTML.AddCssFile('notice');

			HTML.Box({
				id: 'notices',
				title: 'Notizen',
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize : true
			});
		}

		Notice.prepareContent();
	},


	prepareContent: () => {
		let cntGrp = 1,
			content = `<div class='notices'>`;

		// no content available
		if(Notice.notes){
			content += `<ul class='horizontal'>
							<li><a href="#tab-1">Tab 1</a></li>
							<li><a href="#tab-2">Tab 2</a></li>
							<li><a href="#tab-3">Tab 3</a></li>
						</ul>
					</div>
					<div id='notices_container'>
						<div id='tab-1'>Tab 1</div>
						<div id='tab-2'>Tab 2</div>
						<div id='tab-3'>Tab 3</div>
					</div>`;

		} else {

			content += `<ul class='horizontal'>
							<li><a href="#tab-${cntGrp}"><span class="btn-default">ändern</span></a></li>
						</ul>
					</div>
					<div id='notices_container'>
						<div id='tab-1'>Lege zuerst eine Gruppe an...</div>
					</div>`;

		}



		// wait for html in the DOM
		$('#notices').find('#noticesBody').html(content).promise().done(function () {

			// init Tabslet
			$('.notices').tabslet();

		});
	},


	getData: (ep, successCallback)=> {
		const pID = ExtPlayerID;
		const cW = ExtWorld;
		const gID = ExtGuildID;

		let req = fetch(
			ApiURL + ep + '?player_id=' + pID + '&guild_id=' + gID + '&world=' + cW,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			}
		).then(response => {
			if (response.status === 200) {
				response
					.json()
					.then(successCallback)
				;
			}
		});
	},


	sendData: ()=> {

	}
};
