/*
 * *************************************************************************************
 *
 * Copyright (C) 2026 FoE-Helper team - All Rights Reserved
 * You may use, distribute and modify this code under the
 * terms of the AGPL license.
 *
 * See file LICENSE.md or go to
 * https://github.com/mainIine/foe-helfer-extension/blob/master/LICENSE.md
 * for full license details.
 *
 * *************************************************************************************
 */

let WebRequest = {

	StorageName: 'WebRequestProfiles',
	Profiles: [],

	DefaultBodies: {
		json: `{\n\t"sector": "#name",\n\t"battletype": "#battletype",\n\t"time": #time,\n\t"attrition": "#attrition",\n\t"guild": "#guild",\n\t"vp": "#vp",\n\t"neighbors": "#neighbors",\n\t"player": "#player",\n\t"world": "#world"\n}`,
		form: 'sector=#name\nbattletype=#battletype\ntime=#time\nattrition=#attrition\nguild=#guild\nvp=#vp\nneighbors=#neighbors\nplayer=#player\nworld=#world'
	},


	/**
	 * Load the stored request profiles
	 */
	init: () => {
		let profiles = JSON.parse(localStorage.getItem(WebRequest.StorageName));
		if (profiles) {
			WebRequest.Profiles = profiles;
		}
	},


	/**
	 * Find a profile by its name
	 *
	 * @param {string} name Profile name
	 * @returns {object|undefined} The stored profile
	 */
	GetProfile: (name) => WebRequest.Profiles.find(p => p.name === name),


	BuildBox: () => {
		if ($('#WebRequest').length === 0) {
			HTML.Box({
				id: 'WebRequest',
				title: i18n('Boxes.WebRequest.Title'),
				ask: i18n('Boxes.WebRequest.HelpLink'),
				auto_close: true,
				dragdrop: true,
				resize: true
			});

			HTML.AddCssFile('webrequest');
		}
		else {
			HTML.CloseOpenBox('WebRequest');
			return;
		}

		WebRequest.BuildContent();
	},


	BuildContent: () => {
		let h = [];

		h.push(`<p class="webrequest-hint">${i18n('Boxes.WebRequest.Desc')}</p>`);

		h.push(`<h1 class="p5 dark-bg">${i18n('Boxes.WebRequest.TitleEntries')}</h1>`);
		h.push(`<ul class="foe-table">`);

		if (WebRequest.Profiles.length === 0) {
			h.push(`<li><em>${i18n('Boxes.WebRequest.NoProfiles')}</em></li>`);
		}

		for (let i in WebRequest.Profiles) {
			if (!WebRequest.Profiles.hasOwnProperty(i) || !WebRequest.Profiles[i]) {
				continue;
			}

			let p = WebRequest.Profiles[i];

			h.push(`<li>
				<span><b>${p.name}</b> <span class="webrequest-method">${p.method}</span><br><span class="webrequest-url">${p.url}</span></span>
				<span style="white-space:nowrap;" class="text-right">
					<span class="btn-group">
						<button class="btn btn-green btn-slim" role="button" type="button" onclick="WebRequest.SendStored(${i})">${i18n('Boxes.WebRequest.TestSend')}</button>
						<button class="btn btn-slim btn-edit" role="button" type="button" onclick="WebRequest.ProfileForm(${i})">${i18n('Boxes.WebRequest.EditEntry')}</button>
						<button class="btn btn-slim btn-delete icon" role="button" type="button" onclick="WebRequest.Delete(${i})"></button>
					</span>
				</span>
			</li>`);
		}

		h.push(`</ul>
			<div class="formWrapper"></div>`);

		h.push(`<div class="flex between p5">
			<button class="btn" id="addWebRequestProfile" onclick="WebRequest.ProfileForm()">${i18n('Boxes.WebRequest.TitleNewProfile')}</button>
			</div>`);

		$('#WebRequestBody').html(h.join(''));
	},


	/**
	 * Render the create/edit form for a profile
	 *
	 * @param {number|string} i Index of the profile to edit, empty for a new one
	 */
	ProfileForm: (i = '') => {
		$('#WebRequestBody .formWrapper').html('');
		$('#addWebRequestProfile').hide();

		let data;

		if (i !== '') {
			data = WebRequest.Profiles[parseInt(i)];
		}

		const method = data ? data.method : 'GET',
			format = data ? data.format : 'json';

		let h = [];

		h.push(`<div id="webrequest-form" style="display:none;" class="dark-bg webrequestForm">
			<h1 class="p5">${i18n('Boxes.WebRequest.TitleNewProfile')}</h1>
			<form action="" onsubmit="return false;" autocomplete="off">
				<b>${i18n('Boxes.WebRequest.Name')}</b>
				<input id="webrequest-name" type="text" value="${data ? data.name : ''}" spellcheck="false" />

				<b>${i18n('Boxes.WebRequest.Url')}</b>
				<input id="webrequest-url" type="text" value="${data ? data.url : ''}" placeholder="https://example.com/gbg.php?sector=#name&amp;attrition=#attrition" spellcheck="false" />

				<b>${i18n('Boxes.WebRequest.Method')}</b>
				<select id="webrequest-method" onchange="WebRequest.MethodChanged()">
					<option value="GET" ${method === 'GET' ? 'selected' : ''}>${i18n('Boxes.WebRequest.MethodGet')}</option>
					<option value="POST" ${method === 'POST' ? 'selected' : ''}>${i18n('Boxes.WebRequest.MethodPost')}</option>
				</select>

				<b class="webrequest-post-only">${i18n('Boxes.WebRequest.Format')}</b>
				<select id="webrequest-format" class="webrequest-post-only" onchange="WebRequest.MethodChanged()">
					<option value="json" ${format === 'json' ? 'selected' : ''}>${i18n('Boxes.WebRequest.FormatJson')}</option>
					<option value="form" ${format === 'form' ? 'selected' : ''}>${i18n('Boxes.WebRequest.FormatForm')}</option>
				</select>

				<b class="webrequest-post-only">${i18n('Boxes.WebRequest.Body')}</b>
				<textarea id="webrequest-body" class="webrequest-post-only" rows="9" spellcheck="false">${data && data.body !== undefined ? data.body : WebRequest.DefaultBodies[format]}</textarea>

				<div class="w-full webrequest-hint">
					${i18n('Boxes.WebRequest.Placeholders')}: #name, #battletype, #time, #attrition, #guild, #vp, #neighbors, #player, #world<br/>
					${i18n('Boxes.WebRequest.FireAndForget')}
				</div>

				<div class="w-full">
					<b>${i18n('Boxes.WebRequest.Preview')}</b>
					<pre id="webrequest-preview" class="webrequest-preview"></pre>
				</div>

				<div>
					<button class="btn" role="button" type="button" onclick="WebRequest.CancelForm()">${i18n('General.Cancel')}</button>&nbsp;
					<button class="btn" role="button" type="button" onclick="WebRequest.Preview()">${i18n('Boxes.WebRequest.Preview')}</button>&nbsp;
					<button class="btn btn-green" role="button" type="button" onclick="WebRequest.TestSend()">${i18n('Boxes.WebRequest.TestSend')}</button>&nbsp;
					<button class="btn" role="button" type="button" onclick="WebRequest.SaveProfile(${i})">${i18n('General.Save')}</button>
				</div>
			</form></div>`);

		$('#webrequest-form').remove();
		$('#WebRequestBody .formWrapper').append(h.join(''));
		$('#webrequest-form').slideDown();

		WebRequest.MethodChanged();
		WebRequest.Preview();
	},


	/**
	 * Show or hide the POST-only form fields and swap untouched default
	 * body templates when the format changes
	 */
	MethodChanged: () => {
		const isPost = $('#webrequest-method').val() === 'POST';
		$('.webrequest-post-only').toggle(isPost);

		if (isPost) {
			const format = $('#webrequest-format').val(),
				other = format === 'json' ? 'form' : 'json',
				body = $('#webrequest-body').val().trim();

			if (body === '' || body === WebRequest.DefaultBodies[other].trim()) {
				$('#webrequest-body').val(WebRequest.DefaultBodies[format]);
			}
		}
	},


	/**
	 * Read the profile currently entered in the form
	 *
	 * @returns {object} Profile built from the form fields
	 */
	ReadForm: () => ({
		name: $('#webrequest-name').val().trim(),
		url: $('#webrequest-url').val().trim(),
		method: $('#webrequest-method').val(),
		format: $('#webrequest-format').val(),
		body: $('#webrequest-body').val()
	}),


	/**
	 * Validate and persist the form profile
	 *
	 * @param {number|string} i Index of the edited profile, empty for a new one
	 */
	SaveProfile: (i = '') => {
		const data = WebRequest.ReadForm();

		if (data.name === '' || data.url === '') {
			HTML.ShowToastMsg({
				show: 'force',
				head: i18n('General.Error'),
				text: i18n('Boxes.WebRequest.NameUrlNeeded'),
				type: 'error',
				hideAfter: 6000,
			});
			return;
		}

		// http targets are blocked as mixed content by the browser, only localhost is exempt
		if (!/^https:\/\//.test(data.url) && !/^http:\/\/(localhost|127\.0\.0\.1)([:/]|$)/.test(data.url)) {
			HTML.ShowToastMsg({
				show: 'force',
				head: i18n('General.Error'),
				text: i18n('Boxes.WebRequest.HttpsOnly'),
				type: 'error',
				hideAfter: 8000,
			});
			return;
		}

		if (i !== '') {
			WebRequest.Profiles[parseInt(i)] = data;
		}
		else {
			WebRequest.Profiles.push(data);
		}

		$('#addWebRequestProfile').show();
		WebRequest.SaveTheData();
	},


	CancelForm: () => {
		$('#webrequest-form').slideUp(function () { $(this).remove(); });
		$('#addWebRequestProfile').show();
	},


	/**
	 * Delete the profile at the given index
	 *
	 * @param {number} i Profile index
	 */
	Delete: (i) => {
		WebRequest.Profiles.splice(i, 1);
		WebRequest.SaveTheData();
	},


	SaveTheData: () => {
		localStorage.setItem(WebRequest.StorageName, JSON.stringify(WebRequest.Profiles));
		WebRequest.BuildContent();
	},


	/**
	 * Sample values used by the preview and the test requests
	 *
	 * @returns {object} Placeholder map with example sector data
	 */
	SampleVars: () => ({
		'#name': 'A1 - Test Province',
		'#battletype': '🔴',
		'#time': Math.round(MainParser.getCurrentDateTime() / 1000) + 300,
		'#attrition': 42,
		'#guild': 'Test Guild',
		'#vp': '96 (+4)',
		'#neighbors': 'Guild A, Guild B',
		'#player': ExtPlayerName ?? 'Player',
		'#world': ExtWorld ?? 'world'
	}),


	/**
	 * Replace the placeholders of a template with url-encoded values
	 *
	 * @param {string} template URL template containing placeholders
	 * @param {object} vars Placeholder map
	 * @returns {string} Resolved URL
	 */
	ResolveUrl: (template, vars) => Object.entries(vars).reduce(
		(str, [placeholder, value]) => str.replaceAll(placeholder, encodeURIComponent(value ?? '')),
		template
	),


	/**
	 * Build the request body for a POST profile
	 *
	 * @param {object} profile Request profile
	 * @param {object} vars Placeholder map
	 * @returns {string|URLSearchParams} Body ready to be passed to fetch
	 */
	ResolveBody: (profile, vars) => {
		if (profile.format === 'form') {
			// one key=value pair per line, sent as application/x-www-form-urlencoded (fills $_POST)
			const params = new URLSearchParams();

			for (let line of (profile.body || '').split('\n')) {
				line = line.trim();
				if (line === '' || !line.includes('=')) continue;

				const key = line.slice(0, line.indexOf('=')),
					value = line.slice(line.indexOf('=') + 1);

				params.append(key, Object.entries(vars).reduce(
					(str, [placeholder, val]) => str.replaceAll(placeholder, String(val ?? '')),
					value
				));
			}

			return params;
		}

		// JSON template, values are JSON-escaped and the body is sent as plain text (read via php://input)
		return Object.entries(vars).reduce(
			(str, [placeholder, value]) => str.replaceAll(placeholder, JSON.stringify(String(value ?? '')).slice(1, -1)),
			profile.body || ''
		);
	},


	/**
	 * Send a request for the given profile. Fire-and-forget by design:
	 * no-cors mode, the response is never evaluated and errors are swallowed
	 *
	 * @param {object} profile Request profile
	 * @param {object} vars Placeholder map
	 * @param {boolean} silent Suppress the confirmation toast (used by bulk sends)
	 */
	Send: (profile, vars, silent = false) => {
		if (!profile) return;

		const url = WebRequest.ResolveUrl(profile.url, vars),
			options = { method: profile.method, mode: 'no-cors' };

		if (profile.method === 'POST') {
			options.body = WebRequest.ResolveBody(profile, vars);
		}

		fetch(url, options).catch(() => {});

		if (silent) return;

		HTML.ShowToastMsg({
			show: 'force',
			head: i18n('General.Success'),
			text: i18n('Boxes.WebRequest.RequestSent'),
			type: 'success',
			hideAfter: 2500,
		});
	},


	/**
	 * Fill the preview area with the resolved request built from the form
	 */
	Preview: () => {
		const profile = WebRequest.ReadForm(),
			vars = WebRequest.SampleVars();

		let preview = `${profile.method} ${WebRequest.ResolveUrl(profile.url, vars)}`;

		if (profile.method === 'POST') {
			const body = WebRequest.ResolveBody(profile, vars);
			preview += '\n\n' + (body instanceof URLSearchParams ? body.toString() : body);

			if (profile.format === 'json') {
				try {
					JSON.parse(body);
				}
				catch {
					preview += `\n\n⚠ ${i18n('Boxes.WebRequest.InvalidJson')}`;
				}
			}
		}

		$('#webrequest-preview').text(preview);
	},


	/**
	 * Send a test request with sample data for the profile in the form
	 */
	TestSend: () => {
		WebRequest.Preview();
		WebRequest.Send(WebRequest.ReadForm(), WebRequest.SampleVars());
	},


	/**
	 * Send a test request with sample data for a stored profile
	 *
	 * @param {number} i Profile index
	 */
	SendStored: (i) => {
		WebRequest.Send(WebRequest.Profiles[i], WebRequest.SampleVars());
	},


	/**
	 * Send the GBG data of a single sector to the configured profile
	 *
	 * @param {number} id Province id
	 */
	sendGBGSector: (id) => {
		const sector = Guild_fights.MapData.map.provinces.find(x => x.id === id);
		WebRequest.sendGBGSectorData(sector);
	},


	/**
	 * Send the GBG data of a sector object to the configured profile
	 *
	 * @param {object} sector Province object from the GBG map data
	 * @param {boolean} silent Suppress the confirmation toast (used by bulk sends)
	 */
	sendGBGSectorData: (sector, silent = false) => {
		WebRequest.Send(
			WebRequest.GetProfile(Guild_fights.webRequestProfile),
			Guild_fights.GetSectorVars(sector),
			silent
		);
	}
};

setTimeout(() => {
	WebRequest.init();
}, 1000);
