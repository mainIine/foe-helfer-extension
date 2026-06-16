/*
 * Copyright (C) 2026 Forge Hammer
 * Licensed under AGPL - See LICENSE.md for full license details.
*/

let Notes = {
	checkForDB: async (playerID) => {
		let DBName = `ForgeHammerDB_Notes_${playerID}`;

		Notes.db = new Dexie(DBName);
		Notes.db.version(1).stores({
			entries: '&[player_id+time]'
		});
		Notes.db.open();
	},

	Show: () => {
		if ($('#Notes').length === 0) {
			HTML.Box({
				id: 'Notes',
				title: i18n('Boxes.Notes.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				resize: true,
			});
		}
		HTML.AddCssFile('notes');

		Notes.BuildContent();
	},

	BuildContent: async () => {
		let entries = await Notes.db.entries
			.where('player_id').equals(ExtPlayerID)
			.reverse()
			.sortBy('time');

		let items = entries.map(entry => {
			let excerptLines = entry.lines
				.filter(b => b.type === 'text' && b.value.trim())
				.map(b => $('<div>').html(b.value).text().trim())
				.join(' ');
			let excerpt = excerptLines.length > 150 ? excerptLines.slice(0, 150) + '\u2026' : excerptLines;

			let checkCount = entry.lines.filter(b => b.type === 'check').length;
			let checkedCount = entry.lines.filter(b => b.type === 'check' && b.checked).length;
			let checkSummary = checkCount > 0
				? `<span>${checkedCount}/${checkCount}</span>`
				: '';

			return `<li class="p5 bbd" data-time="${entry.time}">
				<h2 class="flex between"><span>${entry.title}</span> ${checkSummary}</h2>
				<span>${excerpt}</span>
			</li>`;
		}).join('');

		let output = `<div id="notesList">
			<div class="options p5 dark-bg"><button id="addNote" class="btn btn-mid">${i18n('Boxes.Notes.Add')}</button></div>
			<ul class="simpleList">${items}</ul>
			</div>
			<div id="noteView" style="display:none"></div>
			<div id="noteEdit" style="display:none"></div>`;

		$('#NotesBody').html(output);

		$('#NotesBody').off('click.noteopen').on('click.noteopen', '.simpleList li', function () {
			let time = parseInt($(this).data('time'), 10);
			Notes.openNote(time);
		});

		$('#NotesBody').off('click.noteadd').on('click.noteadd', '#addNote', () => {
			Notes.openEdit(null);
		});
	},


	openNote: async (time) => {
		let entry = await Notes.db.entries.get([ExtPlayerID, time]);
		if (!entry) return;

		Notes.viewNote(entry);
		$('#notesList').hide();
		$('#noteView').show();
	},

	viewNote: (entry) => {
		let lines = entry.lines.map((line, i) => {
			if (line.type === 'text') 
				return `<div class="note-text">${line.value.replace(/\n/g, '<br>')}</div>`;
			
			if (line.type === 'check') {
				let checked = line.checked ? 'checked' : '';
				return `<label>
					<input type="checkbox" ${checked} data-index="${i}" />
					<span>${line.label}</span>
				</label>`;
			}
			return '';
		}).join('');

		$('#noteView').html(`
			<div class="options p5 dark-bg flex between">
				<span id="backToList" class="clickable">&larr;</span>
				<div class="btn-group"><button class="btn btn-mid" id="editNote">${i18n('Boxes.General.Edit')}</button>
				<button class="btn btn-mid btn-delete icon" id="deleteNote"></button></div>
			</div>
			<div class="note-view p5">
				<h2>${entry.title}</h2>
				${lines}
			</div>
		`);

		$('#noteView').data('entry', entry);

		// event listeners

		$('#noteView').off('click.viewback').on('click.viewback', '#backToList', async () => {
			$('#noteView').hide();
			await Notes.BuildContent();
		});

		$('#noteView').off('click.editnote').on('click.editnote', '#editNote', () => {
			Notes.openEdit($('#noteView').data('entry'));
		});

		$('#noteView').off('click.viewdelete').on('click.viewdelete', '#deleteNote', () => {
			Notes.ConfirmDelete();
		});

		$('#noteView').off('click.viewdeleteconfirm').on('click.viewdeleteconfirm', '#confirmDelete', () => {
			Notes.DeleteNote($('#noteView').data('entry').time);
		});

		$('#noteView').off('click.viewdeletecancel').on('click.viewdeletecancel', '#cancelDelete', () => {
			Notes.viewNote($('#noteView').data('entry'));
		});

		$('#noteView').off('change.viewcheck').on('change.viewcheck', 'input[type="checkbox"]', async function () {
			let e = $('#noteView').data('entry');
			let idx = parseInt($(this).data('index'), 10);
			e.lines[idx].checked = this.checked;

			try {
				await Notes.db.entries.put(e);
				$('#noteView').data('entry', e);
			} catch (err) {
				console.error('[Notes] Failed to save checkbox state:', err);
			}
		});
	},

	openEdit: (entry) => {
		let data = entry === null
			? { player_id: ExtPlayerID, time: null, title: '', lines: [] }
			: entry;

		Notes.editNote(data);
		$('#notesList').hide();
		$('#noteView').hide();
		$('#noteEdit').show();
	},

	editNote: (entry) => {
		let content = Notes.linesToContent(entry.lines);

		$('#noteEdit').html(`
			<div class="options p5 dark-bg flex between">
				<button class="btn btn-mid" id="cancelEdit">${i18n('Boxes.General.Cancel')}</button>
				<button class="btn btn-mid btn-green" id="saveNote">${i18n('Boxes.General.Save')}</button>
			</div>
			<input id="editTitle" class="my-5 p5" type="text" placeholder="${i18n('Boxes.Notes.NewHeadline')}" value="${entry.title}" />
			<textarea id="editNoteContent" class="p5" placeholder="${i18n('Boxes.Notes.NewText')}"></textarea>
		`);

		$('#editNoteContent').val(content);
		$('#noteEdit').data('entry', entry);

		$('#noteEdit').off('click.editcancel').on('click.editcancel', '#cancelEdit', async () => {
			let e = $('#noteEdit').data('entry');
			$('#noteEdit').hide();
			if (e.time) {
				await Notes.openNote(e.time);
			} else {
				await Notes.BuildContent();
			}
		});

		$('#noteEdit').off('click.editsave').on('click.editsave', '#saveNote', () => {
			Notes.SaveNote();
		});
	},

	SaveNote: async () => {
		let entry = $('#noteEdit').data('entry');

		let title = $('#editTitle').val().trim();
		let text = $('#editNoteContent').val().trim();
		
		if (!title) $('#editTitle').addClass('error');
		if (!text) $('#editNoteContent').addClass('error');
		if (!title || !text) return;

		entry.title = title;
		entry.lines = Notes.parseContent($('#editNoteContent').val());
		if (!entry.time) entry.time = Date.now();

		try {
			await Notes.db.entries.put(entry);
			await Notes.BuildContent();
			Notes.openNote(entry.time);
		} catch (e) {
			console.error('[Notes] Failed to save entry:', e);
		}
	},

	ConfirmDelete: () => {
		$('#noteView .options').html(`
			<span>${i18n('Boxes.General.ConfirmDelete')}</span>
			<div><button class="btn btn-mid btn-delete" id="confirmDelete">${i18n('Boxes.General.Delete')}</button>
			<button class="btn btn-mid" id="cancelDelete">${i18n('Boxes.General.Cancel')}</button></div>
		`);
	},

	DeleteNote: async (time) => {
		try {
			await Notes.db.entries.delete([ExtPlayerID, time]);
			$('#noteView').hide();
			$('#noteEdit').hide();
			await Notes.BuildContent();
		} catch (e) {
			console.error('[Notes] Failed to delete entry:', e);
		}
	},


	linesToContent: (lines) => {
		return lines.map(line => {
			if (line.type === 'check') return (line.checked ? '[*] ' : '[] ') + line.label;
			return line.value;
		}).join('\n');
	},

	parseContent: (text) => {
		let content = [];
		let textBuffer = [];

		const flushText = () => {
			let value = textBuffer.join('\n').trim();
			if (value) content.push({ type: 'text', value });
			textBuffer = [];
		};

		for (let line of text.split('\n')) {
			if (line.startsWith('[] ') || line === '[]') {
				flushText();
				content.push({ type: 'check', label: line.replace(/^\[\]\s*/, ''), checked: false });
			} else if (line.startsWith('[*] ') || line === '[*]') {
				flushText();
				content.push({ type: 'check', label: line.replace(/^\[\*\]\s*/, ''), checked: true });
			} else {
				textBuffer.push(line);
			}
		}
		flushText();

		return content;
	},
}