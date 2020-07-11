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

/**
 *
 * @type {{init: Notice.init, notes: null, Listener: Notice.Listener, SetHeights: Notice.SetHeights, buildBox: Notice.buildBox, BuildSettingButtons: Notice.BuildSettingButtons, prepareContent: Notice.prepareContent, ShowModal: Notice.ShowModal, SaveContent: Notice.SaveContent, EditMode: boolean, SaveModal: Notice.SaveModal, SaveItemModal: Notice.SaveItemModal, DeleteElement: Notice.DeleteElement}}
 */
let Notice = {

	notes: null,
	EditMode: false,


	/**
	 * On init get the content
	 */
	init: ()=> {

		if(Notice.notes === null){
			MainParser.send2Server({isEmpty:true}, 'Notice/get',(resp)=>{
				Notice.notes = resp.notice;

				Notice.buildBox();
			});

		} else {
			Notice.buildBox();
		}
	},


	/**
	 * Put a empty box into the DOM
	 */
	buildBox: ()=> {
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
					subcontent;

				tab.push(`<li><a href="#tab-${n['id']}" data-id="${n['id']}"><span>${n['group_name']}</span></a></li>`);

				for(let x in n['items']){

					if(!n['items'].hasOwnProperty(x)){break;}

					let itm = n['items'][x];

					subtab.push(`<li><a href="#subtab-${itm['id']}" data-id="${itm['id']}" title="${itm['tab']}"><span>${itm['tab']}</span></a></li>`);

					subdiv.push(`<div id='subtab-${itm['id']}' class="sub-tab" spellcheck="false" data-parent="${n['id']}" data-id="${itm['id']}">
									<div class="content-head" contenteditable="true">${(itm['title'] === '' ? i18n('Boxes.Notice.DummyHeading') : itm['title'])}</div>
									<div class="content-text" contenteditable="true">${itm['content']}</div>
								</div>`);
				}

				subcontent = `<div class='tabs-sub'>`;

				subcontent += 	`<span class="btn-default itm-btn" data-id="new">+ ${i18n('Boxes.Notice.NewSide')}</span>`;

				if(subtab.length > 0){
					subcontent += 	`<ul class='vertical'>${subtab.join('')}</ul>`;
				}

				subcontent += 		`${subdiv.join('')}
								</div>`;

				div.push(`<div id='tab-${n['id']}' class="notice-wrapper">${subcontent}</div>`);
			}

			content = `<div class='tabs notices'>`;

			if(tab.length > 0){
				content += `<ul class='horizontal'>${tab.join('')}</ul>`;
			}

			content += 		`<span class="btn-default grp-btn" data-id="new">+ ${i18n('Boxes.Notice.NewGroup')}</span>`;
			content += 		div.join('');
			content += `</div>`;

		}

		// all empty
		else {
			content = `<div class='notices'>
							<span class="btn-default grp-btn" data-id="new">+ ${i18n('Boxes.Notice.NewGroup')}</span>
						</div>
						<div id='notices_container'>
							<div class="empty-notice">${i18n('Boxes.Notice.NewGroupDesc')}</div>
						</div>`;
		}



		// wait for html in the DOM
		$('#notices').find('#noticesBody').html(content).promise().done(function(){

			// init Tabslet
			$('.notices').tabslet();

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
			Notice.ShowModal('itm', $(this).data('id'));
		});

		$('#noticesBody').on('click', '.tab-edit', function(){
			Notice.ShowModal('grp', $(this).data('id'));
		});

		$('#noticesBody').on('click', '.sub-tab-edit', function(){
			Notice.ShowModal('itm', $(this).data('id'));
		});

		$('body').on('click', '.delete-btn', function(){
			Notice.DeleteElement($(this).data('type'), $(this).data('id'));
		});


		$('body').on('click', '#notices-modalclose', function(){
			$('.foe-helper-overlay').remove();
		});

		// save content when close box
		$('body').on('click', '#noticesclose', function(){
			let $this = $('.sub-tab:visible');

			Notice.SaveContent($this);
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

		// check if user changes the box size
		let id;

		$('body').on('resize', '#notices', function(){
			clearTimeout(id);
			id = setTimeout(Notice.SetHeights(), 150);
		});
	},


	/**
	 * Show a tiny modal for create, edit or delete a group or item
	 *
	 * @param type
	 * @param id
	 * @param action
	 * @constructor
	 */
	ShowModal:(type, id, action = '')=> {

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
			placeholder: type === 'grp' ? i18n('Boxes.Notice.GroupName') : i18n('Boxes.Notice.SideName'),
			class: `inp-${type}-name`
		});

		btn.attr({
				role: 'button',
				class: `btn-default save-${type}-name`,
				'data-id': id,
				'data-type': type,
				style: 'margin-left: 10px',

			})
			.text(i18n('Boxes.Notice.Save'));

		$('#notices-modalBody').append(inp, btn);

		if(type === 'itm'){

			btn.attr({
				onclick: `Notice.SaveItemModal(${(id === 'new' ? "'new'" : id)})`
			});

		} else {
			btn.attr({
				onclick: `Notice.SaveModal('${type}', ${(id === 'new' ? "'new'" : id)})`
			});
		}

		if(id !== 'new'){
			let delBtn = $('<span />');

			delBtn
				.attr({
					role: 'button',
					class: `btn-default delete-btn`,
					'data-id': id,
					'data-type': type
				})
				.text(type === 'grp' ? i18n('Boxes.Notice.DeleteGroup') : i18n('Boxes.Notice.DeleteItem'))
				.css({
					'margin-top': 10
				})
			;

			$('#notices-modalBody').append(delBtn);

		} else{
			let sort = $('<input />').attr({
				type: 'number',
				class: `inp-${type}-sort`,
				placeholder: i18n('Boxes.Notice.Sorting'),
			});

			sort.wrap('<div />').insertAfter(`.inp-${type}-name`);
		}


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
			txt = nN.trim();

		if(txt === ''){
			return;
		}

		// filter <script> Tags
		txt = MainParser.ClearText(txt);

		MainParser.send2Server({id:id,type:type,name:txt}, 'Notice/set', (resp)=>{
			Notice.notes = resp['notice'];

			$('#notices-modal').fadeToggle('fast', function(){
				$(this).remove();

				$('.foe-helper-overlay').remove();
			});

			Notice.EditMode = false;
			Notice.buildBox();
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
			grp = parseInt($('ul.horizontal').find('li.active a').data('id')),
			sortVal = !$(`inp-itm-sort`).val() || ($(`#tab-${grp}`).find('ul.vertical li').length +1);

		if(txt === ''){
			return;
		}

		txt = MainParser.ClearText(txt);

		MainParser.send2Server({id:id,type:'itm',name:txt,grp:grp,sort:sortVal}, 'Notice/set', (resp)=>{
			Notice.notes = resp['notice'];

			$('#notices-modal').fadeToggle('fast', function(){
				$(this).remove();

				$('.foe-helper-overlay').remove();
			});

			Notice.EditMode = false;
			Notice.buildBox();
		});
	},


	/**
	 * Save the content-head and -text into the database
	 *
	 * @param $this
	 * @constructor
	 */
	SaveContent: ($this)=> {
		let itmID = parseInt($this.data('id')),
			grpID = parseInt($this.data('parent')),
			head = $this.find('.content-head').html(),
			cont = $this.find('.content-text').html();

		// send content changes to server und change local object
		MainParser.send2Server({id:itmID,type:'cnt',head:head,cont:cont}, 'Notice/set', (resp)=>{

			let grpIdx = Notice.notes.findIndex(g => g.id === grpID),
				itmIdx = Notice.notes[grpIdx].items.findIndex(i => i.id === itmID);

			Notice.notes[grpIdx].items[itmIdx]['title'] = head;
			Notice.notes[grpIdx].items[itmIdx]['content'] = cont;
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

				MainParser.send2Server({type:'grp',grps:grps}, 'Notice/sort', (resp)=>{
					Notice.notes = resp['notice'];

					$('.notices').tabslet();
					Notice.BuildSettingButtons();
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
				left: ((left + width) - 31),
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

					MainParser.send2Server({type:'itm',itms:itms}, 'Notice/sort', (resp)=>{
						Notice.notes = resp['notice'];

						$('.tabs-sub').tabslet();
						Notice.BuildSettingButtons();
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
		MainParser.send2Server({type:type,id:id}, 'Notice/del', (resp)=>{
			Notice.notes = resp['notice'];

			$('#notices-modal').fadeToggle('fast', function(){
				$(this).remove();

				$('.foe-helper-overlay').remove();
			});

			Notice.EditMode = false;
			Notice.buildBox();
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
		$('.content-text').height(h - 47);
	},
};
