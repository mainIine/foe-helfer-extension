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

		if(Notice.notes === null){
			MainParser.send2Server({isEmpty:true}, 'Notice/get',(resp)=>{
				Notice.notes = resp.notice;

				Notice.buildBox();
			});

		} else {
			Notice.buildBox();
		}
	},


	buildBox: ()=> {
		if( $('#notices').length < 1 )
		{
			// CSS into the DOM
			HTML.AddCssFile('notice');

			HTML.Box({
				id: 'notices',
				title: i18n('Boxes.Notice.Title'),
				auto_close: true,
				dragdrop: true,
				resize: true,
				minimize : true
			});

			Notice.Listener();
		}

		Notice.prepareContent();
	},


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
		$('#notices').find('#noticesBody').html(content).promise().done(function () {

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


	Listener: ()=> {

		$('#noticesBody').on('click', '.grp-btn', function(){
			Notice.ShowModal('grp', $(this).data('id'));
		});

		$('#noticesBody').on('click', '.itm-btn', function(){
			Notice.ShowModal('itm', $(this).data('id'));
		});


		$('body').on('click', '#notices-modalclose', function(){
			$('.foe-helper-overlay').remove();
		});


		$('#noticesBody').on('blur', '[contenteditable="true"]', function(){
			let id = $(this).closest('.sub-tab');

			Notice.SaveContent(id);
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


	CloseModal: ()=>{

	},


	ShowModal:(type, id)=> {

		if( $('#notices-modal').length === 0 ){
			let title = type === 'grp' ? i18n('Boxes.Notice.NewGroup') : i18n('Boxes.Notice.NewSide');

			if(id !== 'new'){
				title = i18n('Boxes.Notice.Edit');
			}

			HTML.Box({
				id: 'notices-modal',
				title: title,
				auto_close: true,
			});

			$('body').prepend( $('<div class="foe-helper-overlay" />') );

		} else {
			$('#notices-modalBody').html('');
		}

		let inp = $('<input />'),
			btn = $('<span />');

		inp.attr({
			type: 'text',
			value: '',
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
			let sort = $('<input />').attr({
				type: 'number',
				class: 'inp-itm-sort',
				placeholder: i18n('Boxes.Notice.Sorting')
			});

			sort.wrap('<div />').insertAfter(`.inp-${type}-name`);

			btn.attr({
				onclick: `Notice.SaveItemModal(${(id === 'new' ? "'new'" : id)})`
			});

		} else {
			btn.attr({
				onclick: `Notice.SaveModal('${type}', ${(id === 'new' ? "'new'" : id)})`
			});
		}

		$(`.inp-${type}-name`).focus();
	},


	SaveModal: (type, id)=> {
		const nN = $(`.inp-${type}-name`).val(),
			name = nN.trim();

		MainParser.send2Server({id:id,type:type,name:name}, 'Notice/set', (resp)=>{
			Notice.notes = resp['notice'];

			$('#notices-modal').fadeToggle('fast', function(){
				$(this).remove();

				$('.foe-helper-overlay').remove();
			});

			Notice.buildBox();
		});
	},


	SaveItemModal: (id)=> {
		const nN = $('.inp-itm-name').val(),
			name = nN.trim(),
			grp = parseInt($('ul.horizontal').find('li.active a').data('id'));

		MainParser.send2Server({id:id,type:'itm',name:name,grp:grp}, 'Notice/set', (resp)=>{
			Notice.notes = resp['notice'];

			$('#notices-modal').fadeToggle('fast', function(){
				$(this).remove();

				$('.foe-helper-overlay').remove();
			});

			Notice.buildBox();
		});
	},


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


	SetHeights: ()=> {
		let h = $('#noticesBody').outerHeight() - 35;

		// horizontal UL
		$('ul.vertical').height(h  - 39);

		// text
		$('.content-text').height(h - 47);
	},
};
