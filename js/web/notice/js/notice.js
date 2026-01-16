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

/**
 * @type {{ActualGrp: number, init: Notice.init, notes: null, Listener: Notice.Listener, SetHeights: Notice.SetHeights, buildBox: Notice.buildBox, BuildSettingButtons: Notice.BuildSettingButtons, prepareContent: Notice.prepareContent, ActiveTab: number, ShowModal: Notice.ShowModal, ShowPlayerModal: Notice.ShowPlayerModal, SavePlayerToGroup: Notice.SavePlayerToGroup, SaveContent: Notice.SaveContent, EditMode: boolean, ApiToken: null, SaveModal: Notice.SaveModal, SaveItemModal: Notice.SaveItemModal, DeleteElement: Notice.DeleteElement, ActiveSubTab: number, Players: {}}}
 */
let Notice = {

	notes: null,
	
	/**
	 * Toogle state for edit mode
	 */
	EditMode: false,

	/**
	 * Object for player picker
	 */
	Players: {},

	ActualGrp: 0,

	ActiveTab: 1,
	ActiveSubTab: 1,

	ApiToken: null,

	initDone:false,

	/**
	 * On init get the content
	 */
	init: ()=> {

		let apiToken = localStorage.getItem('ApiToken');

		if(apiToken === null) {
			HTML.ShowToastMsg({
				head: i18n('Boxes.CityMap.MissingApiKeyErrorHeader'),
				text: [
					i18n('Boxes.CityMap.MissingApiKeySubmitError'),
					`<a target="_blank" href="${i18n('Settings.ApiTokenUrl')}">${i18n('Settings.ApiTokenUrl')}</a>`
				],
				type: 'error',
				hideAfter: 10000,
			});

			return;
		}

		Notice.ApiToken = apiToken;

		if(Notice.notes === null){
			MainParser.send2Server({apiToken:apiToken}, 'Notice/get',(resp)=>{
				if(resp['status'] === 'ERROR') {
					HTML.ShowToastMsg({
						head: 'Error',
						text: resp['msg'],
						type: 'error',
						hideAfter: 10000,
					});
				}
				else {
					Notice.notes = resp['notice'];

					Notice.buildBox(false);
				}
			});

		} else {
			Notice.buildBox(false);
		}
	},


	/**
	 * Put a empty box into the DOM
	 */
	buildBox: (event = true) => {
		if( $('#notices').length < 1 )
		{
			// CSS into the DOM
			HTML.AddCssFile('notice');

			HTML.Box({
				id: 'notices',
				title: i18n('Boxes.Notice.Title'),
				ask: i18n('Boxes.Notice.HelpLink'),
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize: true,
				settings: true
			});

			Notice.Listener();
		}
		else if (!event)
		{
			HTML.CloseOpenBox('notices');
			return;
		}

		Notice.Players = PlayerDict;

		if(Settings.GetSetting('GlobalSend')){
			Notice.prepareContent();
		}

		// global send is deactivated
		else {
			$('#noticesBody').addClass('global-send-required-bg').append( $('<span />').addClass('global-send-required').html(i18n('Boxes.Notice.GlobalSendRequired')) );
		}
	},


	/**
	 * Build the tabs
	 */
	prepareContent: ()=> {
		let tab = [],
			div = [],
			content;

		// content available
		if(Notice.notes){

			for(let i in Notice.notes){

				if(!Notice.notes.hasOwnProperty(i)){break;}

				const n = Notice.notes[i];
				let subtab = [],
					subdiv = [],
					subcontent,
					tabName;

				if(n['player_group']){
					switch (n['player_group']){
						case 'guild': tabName = `🛡 ${i18n('Boxes.Notice.SelectPlayerGroupGuild')}`; break;
						case 'friend': tabName = `👩🏼🤝🧑 ${i18n('Boxes.Notice.SelectPlayerGroupFriend')}`; break;
						case 'neighbor': tabName = `⚔ ${i18n('Boxes.Notice.SelectPlayerGroupNeighbor')}`; break;
					}

				} else {
					tabName = n['group_name'];
				}

				tab.push(`<li><a href="#tab-${n['id']}" data-id="${n['id']}"><span>${tabName}</span></a></li>`);

				for(let x in n['items']){

					if(!n['items'].hasOwnProperty(x)){break;}

					let itm = n['items'][x];

					subtab.push(`<li><a href="#subtab-${itm['id']}" data-id="${itm['id']}" title="${itm['tab']}"><span>${itm['tab']}</span></a></li>`);

					subdiv.push(`<div id='subtab-${itm['id']}' class="sub-tab" spellcheck="false" data-parent="${n['id']}" data-id="${itm['id']}">`);

					if(itm['player_data']){
						const player = JSON.parse(itm['player_data']);

						subdiv.push(`<div class="content-head-player">
										<span class="avatar" style="background-image:url('${srcLinks.GetPortrait(player['Avatar'])}')"></span>
										<div class="text">
											<span class="name">${player['PlayerName']}</span>
											<span class="clan-name"><em>#${player['PlayerID']}</em> ${player['ClanName'] ? '[' + player['ClanName'] + ']' : '&nbsp;'}</span>
										</div>
										<div class="info-text">
											
										</div>
									</div>`);

					} else {
						subdiv.push(`<div class="content-head" contenteditable="true">${(itm['title'] === '' ? i18n('Boxes.Notice.DummyHeading') : itm['title'])}</div>`)
					}


					subdiv.push(`<div class="content-text" contenteditable="true">${itm['content'] || ''}</div>
								</div>`);
				}

				subcontent = `<div class='tabs-sub'>`;

				if(n['player_group']){
					subcontent += 	`<span class="btn itm-btn" data-id="${n['player_group']}" data-group="${n['id']}">+ ${i18n('Boxes.Notice.NewPlayer')}</span>`;
				} else {
					subcontent += 	`<span class="btn itm-btn" data-id="new">+ ${i18n('Boxes.Notice.NewSide')}</span>`;
				}

				if(subtab.length > 0){
					subcontent += 	`<ul class='vertical'>${subtab.join('')}</ul>`;
				}

				subcontent += 		`${subdiv.join('')}
								</div>`;

				div.push(`<div id='tab-${n['id']}' class="notice-wrapper">${subcontent}</div>`);
			}

			content = `<div class='tabs notices'>`;

			if(tab.length > 0){
				content += `<ul class='horizontal dark-bg'>${tab.join('')}</ul>`;
			}

			content += 		`<span class="btn grp-btn" data-id="new">+ ${i18n('Boxes.Notice.NewGroup')}</span>`;
			content += 		div.join('');
			content += `</div>`;

		}

		// all empty
		else {
			content = `<div class='notices'>
							<span class="btn grp-btn" data-id="new">+ ${i18n('Boxes.Notice.NewGroup')}</span>
						</div>
						<div id='notices_container'>
							<div class="empty-notice">${i18n('Boxes.Notice.NewGroupDesc')}</div>
						</div>`;
		}


		// wait for html in the DOM
		$('#notices').find('#noticesBody').html(content).promise().done(function(){

			// init Tabslet
			$('.notices').tabslet({
				active: Notice.ActiveTab
			});

			if( $('.tabs-sub').length > 0 ){
				$('.tabs-sub').tabslet();

				setTimeout(()=>{
					Notice.SetHeights();
				}, 150);
			}
		});
	},


	/**
	 * DOM listeners
	 *
	 * @constructor
	 */
	Listener: ()=> {

		$('#noticesBody').on('click', '.grp-btn', function(){
			Notice.ShowModal('grp', $(this).data('id'));
		});

		$('#noticesBody').on('click', '.itm-btn', function(){
			const id = $(this).data('id');

			if(id !== 'new'){
				Notice.ShowPlayerModal(id, $(this).data('group'));

			} else {
				Notice.ShowModal('itm', id);
			}
		});

		$('#noticesBody').on('click', '.tab-edit', function(){
			Notice.ShowModal('grp', $(this).data('id'));
		});

		$('#noticesBody').on('click', '.sub-tab-edit', function(){
			Notice.ShowModal('itm', $(this).data('id'));
		});

		// toggle edit buttons
		$('#notices').on('click', '#notices-settings', function(){
			if(!Notice.EditMode){
				Notice.BuildSettingButtons();
			} else {
				$('.tab-edit, .sub-tab-edit').remove();
			}

			Notice.EditMode = !Notice.EditMode;
		});


		$('#noticesBody').on('blur', '[contenteditable="true"]', function(){
			let $this = $(this).closest('.sub-tab');

			Notice.SaveContent($this);
		});

		// enter is pressed
		$('#noticesBody').on('keydown', '[contenteditable="true"]', function(e){

			if (e.keyCode === 13) {
				// prevent to enter a div instad a <br>
				document.execCommand('insertHTML', false, '<br><br>');
				// prevent the default behaviour of return key pressed
				return false;
			}
		});
		if (Notice.initDone) return;
		$('body').on('click', '.btn-delete', function() {
			if (confirm(i18n('Boxes.Notice.ConfirmDelete')))
				Notice.DeleteElement($(this).data('type'), $(this).data('id'));
		});

		$('body').on('click', '#notices-modalclose, #notices-modal-playersclose', function(){
			$('.foe-helper-overlay').remove();
		});

		// save content when close box
		$('body').on('click', '#noticesclose', function(){
			let $this = $('.sub-tab:visible');
			if ($this.length == 0) return;
			Notice.SaveContent($this);
		});

		// check if user changes the box size
		let id;

		$('body').on('resize', '#notices', function(){
			clearTimeout(id);
			id = setTimeout(Notice.SetHeights(), 150);
		});
		Notice.initDone = true;
	},


	/**
	 * Show a tiny modal for create, edit or delete a group or item
	 *
	 * @param type
	 * @param id
	 * @constructor
	 */
	ShowModal:(type, id)=> {

		let title = type === 'grp' ? i18n('Boxes.Notice.NewGroup') : i18n('Boxes.Notice.NewSide'),
			txt;

		if(id !== 'new'){

			if(type === 'grp'){
				txt = $('.horizontal').find(`[data-id="${id}"]`).text();
			} else {
				txt = $('.vertical').find(`[data-id="${id}"]`).text();
			}

			title = txt + ' - ' + i18n('Boxes.Notice.Edit');
		}

		HTML.Box({
			id: 'notices-modal',
			title: title,
			auto_close: true,
		});

		$('body').prepend( $('<div class="foe-helper-overlay" />') );


		let inp = $('<input />'),
			btn = $('<span />');

		inp.attr({
			type: 'text',
			value: txt,
			id: `${type}-input`,
			placeholder: type === 'grp' ? i18n('Boxes.Notice.GroupName') : i18n('Boxes.Notice.SideName'),
			class: `inp-${type}-name`,
			'data-id': id
		});

		btn.attr({
				role: 'button',
				class: `btn save-${type}-name`,
				'data-id': id,
				'data-type': type,
				onclick: (type === 'itm' ? `Notice.SaveItemModal('${(id === 'new' ? "new" : id)}')` : `Notice.SaveModal('${type}', '${(id === 'new' ? "new" : id)}')`)
			})
			.text(i18n('Boxes.Notice.Save'))
			.wrap('<div class="text-right" />');


		$('#notices-modalBody').append(inp);

		
		if(id !== 'new'){
			let delBtn = $('<span />');

			delBtn
				.attr({
					role: 'button',
					class: `btn btn-delete`,
					'data-id': id,
					'data-type': type
				})
				.text(type === 'grp' ? i18n('Boxes.Notice.DeleteGroup') : i18n('Boxes.Notice.DeleteItem'))
			;

			$('#notices-modalBody').append(delBtn);

		} else {
			let sort = $('<input />').attr({
				type: 'number',
				class: `inp-${type}-sort`,
				placeholder: i18n('Boxes.Notice.Sorting')
			});

			sort.wrap('<div />').insertAfter(`.inp-${type}-name`);
		}

		if(type === 'grp' && id === 'new'){
			$('#notices-modalBody').append(
				$('<p />').append(
					$('<select />').attr({
						id: 'player-grp',
						style: 'display-none'
					}).append(
						$('<option />').attr({
							'data-value': -1
						}).text(i18n('Boxes.Notice.SelectPlayerGroupDefault')),
						$('<option />').attr({
							'data-value': 'guild'
						}).text(i18n('Boxes.Notice.SelectPlayerGroupGuild')),
						$('<option />').attr({
							'data-value': 'friend'
						}).text(i18n('Boxes.Notice.SelectPlayerGroupFriend')),
						$('<option />').attr({
							'data-value': 'neighbor'
						}).text(i18n('Boxes.Notice.SelectPlayerGroupNeighbor')),
					)
				)
			);
		}

		$('#notices-modalBody').append(btn);

		$(`.inp-${type}-name`).focus();
	},


	/**
	 * Function to save a group
	 *
	 * @param type
	 * @param id
	 * @constructor
	 */
	SaveModal: (type, id)=> {
		let nN = $(`.inp-${type}-name`).val(),
			txt = MainParser.ClearText(nN.trim()), // filter <script> Tags
			data = {
				id: id,
				type: type,
				name: txt,
				sort: $(`.inp-grp-sort`).val() || 1,
				apiToken: Notice.ApiToken
			},
			grpSel = $('#player-grp option:selected');

		if( grpSel.data('value') !== -1 ){
			data['player_group'] = grpSel.data('value');

		} else if(txt === '') {
			return;

		} else {
			data['name'] = txt;
		}

		MainParser.send2Server(data, 'Notice/set', (resp)=>{
			if(resp['status'] === 'ERROR') {
				HTML.ShowToastMsg({
					head: 'Error',
					text: resp['msg'],
					type: 'error',
					hideAfter: 10000,
				});
			}
			else {
				Notice.notes = resp['notice'];

				if(id === 'new'){
					Notice.ActiveTab = Notice.notes[Notice.notes.length -1];

				} else {
					Notice.ActiveTab = Notice.notes.findIndex(idx => (idx.id === id)) +1;
				}

				$('#notices-modal').fadeToggle('fast', function(){
					$(this).remove();

					$('.foe-helper-overlay').remove();
				});

				Notice.EditMode = false;
				Notice.buildBox();
			}
		});
	},


	/**
	 * Function to save a item
	 *
	 * @param id
	 * @constructor
	 */
	SaveItemModal: (id)=> {
		let nN = $('.inp-itm-name').val(),
			txt = nN.trim(),
			grp = $('ul.horizontal').find('li.active a').data('id'),
			sortVal = !$(`.inp-itm-sort`).val() || ($(`#tab-${grp}`).find('ul.vertical li').length +1);

		if(txt === ''){
			return;
		}

		txt = MainParser.ClearText(txt);

		MainParser.send2Server({id:id,type:'itm',name:txt,grp:grp,sort:sortVal,apiToken:Notice.ApiToken}, 'Notice/set', (resp)=>{
			if(resp['status'] === 'ERROR') {
				HTML.ShowToastMsg({
					head: 'Error',
					text: resp['msg'],
					type: 'error',
					hideAfter: 10000,
				});
			}
			else {
				Notice.notes = resp['notice'];

				const group = Notice.notes.find(e => (e.id === grp));
				Notice.ActiveTab = Notice.notes.findIndex(idx => (idx.id === grp)) +1;

				if(id === 'new'){
					Notice.ActiveSubTab = group.items.length +1;

				} else {
					Notice.ActiveSubTab = group.items.findIndex(i => (i.id === id)) +1;
				}

				$('#notices-modal').fadeToggle('fast', function(){
					$(this).remove();

					$('.foe-helper-overlay').remove();
				});

				Notice.EditMode = false;
				Notice.buildBox();
			}
		});
	},


	/**
	 * Save the content-head and -text into the database
	 *
	 * @param $this
	 * @constructor
	 */
	SaveContent: ($this)=> {
		let itmID = $this.data('id'),
			grpID = $this.data('parent'),
			head = $this.find('.content-head').html(),
			cont = $this.find('.content-text').html();

		if(cont === null) {
			return;
		}

		// send content changes to server und change local object
		MainParser.send2Server({id:itmID,grp:grpID,type:'cnt',head:head,cont:cont,apiToken:Notice.ApiToken}, 'Notice/set', (resp)=>{

			if(resp['status'] === 'ERROR') {
				HTML.ShowToastMsg({
					head: 'Error',
					text: resp['msg'],
					type: 'error',
					hideAfter: 10000,
				});
			}
			else {
				let grpIdx = Notice.notes.findIndex(g => g.id === grpID),
					itmIdx = Notice.notes[grpIdx].items.findIndex(i => i.id === itmID);

				Notice.notes[grpIdx].items[itmIdx]['title'] = head;
				Notice.notes[grpIdx].items[itmIdx]['content'] = cont;

				Notice.ActiveTab = (grpIdx + 1);
				Notice.ActiveSubTab = (itmIdx + 1);
			}
		});
	},


	ShowPlayerModal: (type, grp)=> {

		Notice.ActualGrp = grp;

		HTML.Box({
			id: 'notices-modal-players',
			title: i18n('Boxes.Notice.ModalChoosePlayer'),
			auto_close: true,
			dragdrop: true
		});

		$('body').prepend( $('<div class="foe-helper-overlay" />') );

		const mapper = {
			guild: 'IsGuildMember',
			friend: 'IsFriend',
			neighbor: 'IsNeighbor',
		};

		// remove self
		delete Notice.Players[ExtPlayerID];

		// find all players by tab-type ...
		const playerObj = Object.values(Notice.Players).filter((v) => v[mapper[type]] === true);

		// ... and sort by name
		const players = helper.arr.multisort(playerObj, ['PlayerName'], ['ASC']);

		let content = `<p>${i18n('Boxes.Notice.ModalMissingPlayers')}`;

			content += `<div class="custom-select-wrapper">
						<div class="custom-select">
							<div class="custom-select__trigger">
								<span class="trigger">${i18n('Boxes.Notice.ModalChoosePlayer')}</span>
								<div class="arrow"></div>
							</div>
							<div class="custom-options" id="player-selector">`;

		for (let i in players)
		{
			if(!players.hasOwnProperty(i)) { break; }

			const p = players[i],
				a = srcLinks.GetPortrait(p['Avatar']);

			content += `<span class="custom-option" onclick="Notice.SavePlayerToGroup(${p['PlayerID']})" data-value="${p['PlayerID']}"><span class="avatar" style="background-image:url('${a}')"></span>${p['PlayerName']}</span>`;
		}

		content +=		`</div>
					</div>
				</div>`;

		$('#notices-modal-playersBody').html(content).promise().done(function(){
			HTML.Dropdown();
		});
	},


	SavePlayerToGroup: (id)=> {
		const data = {
			id: 'new',
			type: 'itm',
			name: PlayerDict[id]['PlayerName'],
			grp: Notice.ActualGrp,
			player: JSON.stringify(PlayerDict[id]),
			apiToken: Notice.ApiToken
		};

		// check if not double
		const group = Notice.notes.find(e => (e.id === Notice.ActualGrp));
		const player = group.items.find(e => (e.tab === PlayerDict[id]['PlayerName']));

		// Player is allways added
		if(player){
			return ;
		}

		// set the active Tab for reload
		Notice.ActiveTab = Notice.notes.findIndex(idx => idx.id === Notice.ActualGrp) + 1;

		MainParser.send2Server(data, 'Notice/set', (resp)=>{
			if(resp['status'] === 'ERROR') {
				HTML.ShowToastMsg({
					head: 'Error',
					text: resp['msg'],
					type: 'error',
					hideAfter: 10000,
				});
			}
			else {
				Notice.notes = resp['notice'];

				$('#notices-modal-players').fadeToggle('fast', function(){
					$(this).remove();

					$('.foe-helper-overlay').remove();
				});

				Notice.buildBox();

				$('.custom-option-noticePlayers').bind('click');
			}
		});
	},


	/**
	 * Create "Edit" buttons for the DOM
	 *
	 * @constructor
	 */
	BuildSettingButtons: ()=> {

		$('.tab-edit, .sub-tab-edit').remove();

		// Sortfunction for horizontal + Stop event
		$('ul.horizontal').sortable({
			axis: 'x',
			stop: function() {
				let grps = [];

				$('ul.horizontal li').each(function(idx){
					let id = $(this).find('a').data('id');

					grps.push({
						id: id,
						sort: idx
					});
				});

				MainParser.send2Server({type:'grp',grps:grps,apiToken:Notice.ApiToken}, 'Notice/sort', (resp)=>{
					if(resp['status'] === 'ERROR') {
						HTML.ShowToastMsg({
							head: 'Error',
							text: resp['msg'],
							type: 'error',
							hideAfter: 10000,
						});
					}
					else {
						Notice.notes = resp['notice'];

						$('.notices').tabslet();
						Notice.BuildSettingButtons();
					}
				});
			}
		});


		$('ul.horizontal li').each(function(){
			let $this = $(this),
				id = $this.find('a').data('id'),
				left = $this.position().left,
				width = $this.width(),
				btn = $('<span />');

			btn.attr({
				class: 'tab-edit',
				'data-id': id
			}).css({
				left: ((left + width) - 28),
				top: 5
			});

			$('.tabs').append(btn);
		});

		$('.notice-wrapper').each(function(){
			let div = $(this),
				top = 43;

			// Sortfunction for vertical + Stop event
			div.find('ul.vertical').sortable({
				axis: 'y',
				stop: function(e, ui) {
					let itms = [],
						ul = $(ui.item).closest('ul');

					ul.find('li').each(function(idx){
						let id = $(this).find('a').data('id');

						itms.push({
							id: id,
							sort: idx
						});
					});

					MainParser.send2Server({type:'itm',itms:itms,apiToken:Notice.ApiToken}, 'Notice/sort', (resp)=>{
						if(resp['status'] === 'ERROR') {
							HTML.ShowToastMsg({
								head: 'Error',
								text: resp['msg'],
								type: 'error',
								hideAfter: 10000,
							});
						}
						else {
							Notice.notes = resp['notice'];

							$('.tabs-sub').tabslet();
							Notice.BuildSettingButtons();
						}
					});
				}
			});

			div.find('ul.vertical li').each(function(){
				let $this = $(this),
					id = $this.find('a').data('id'),
					btn = $('<span />');

				btn.attr({
					class: 'sub-tab-edit',
					'data-id': id
				}).css({
					top: top,
					left: 90
				});

				top += 32;

				div.append(btn);
			});
		});
	},


	/**
	 * Delete a group or item from the database
	 *
	 * @param type
	 * @param id
	 * @constructor
	 */
	DeleteElement: (type, id)=> {
		MainParser.send2Server({type:type,id:id,apiToken:Notice.ApiToken}, 'Notice/del', (resp)=>{
			if(resp['status'] === 'ERROR') {
				HTML.ShowToastMsg({
					head: 'Error',
					text: resp['msg'],
					type: 'error',
					hideAfter: 10000,
				});
			}
			else {
				Notice.notes = resp['notice'];

				$('#notices-modal').fadeToggle('fast', function(){
					$(this).remove();

					$('.foe-helper-overlay').remove();
				});

				Notice.EditMode = false;
				Notice.buildBox();
			}
		});
	},


	/**
	 * Set the heigh from left ul li & content body at the resize
	 *
	 * @constructor
	 */
	SetHeights: ()=> {
		let h = $('#noticesBody').outerHeight() - 35;

		// horizontal UL
		$('ul.vertical').height(h  - 39);

		// text
		$('.content-text').height(h - $('.content-text').prev().height());
	},
};
