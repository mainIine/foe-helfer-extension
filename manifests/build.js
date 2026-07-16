#!/usr/bin/env node
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

// Generates all extension manifests from a single source of truth:
//   manifests/base.json              shared fields (version, permissions, content scripts, ...)
//   manifests/chromium/overlay.json  Chrome-specific fields (MV3)
//   manifests/firefox/overlay.json   Firefox-specific fields (MV2)
//
// Output:
//   manifests/chromium/manifest_.json
//   manifests/firefox/manifest_.json
//   manifest.json                    (repo root, used for local development = Firefox variant)
//
// Usage:
//   node manifests/build.js           regenerate with the version from base.json
//   node manifests/build.js 4.5.0.0   set a new version in base.json and regenerate

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const write = (p, data) => fs.writeFileSync(path.join(root, p), JSON.stringify(data, null, '\t') + '\n');

const base = read('manifests/base.json');

// optional version bump
const newVersion = process.argv[2];
if (newVersion) {
	if (!/^\d+\.\d+\.\d+\.\d+$/.test(newVersion)) {
		console.error(`Invalid version "${newVersion}" — expected e.g. 4.5.0.0`);
		process.exit(1);
	}
	base.version = newVersion;
	write('manifests/base.json', base);
}

function buildManifest(overlayPath) {
	const overlay = read(overlayPath);
	const mv = overlay.manifest_version;

	// fixed key order for stable, readable diffs
	const out = {
		name: base.name,
		description: base.description,
		default_locale: base.default_locale,
		version: base.version,
		manifest_version: mv,
	};

	// Firefox add-on ID (required for AMO / MV3, ignored by Chrome)
	if (overlay.browser_specific_settings) out.browser_specific_settings = overlay.browser_specific_settings;

	if (mv >= 3) {
		// MV3: API and host permissions are separate lists
		out.permissions = base.permissions;
		out.host_permissions = base.host_permissions;
		out.action = base.action;
	} else {
		// MV2: host permissions live inside "permissions", the toolbar button is "browser_action"
		out.permissions = [...base.permissions, ...base.host_permissions];
		out.browser_action = base.action;
	}

	out.icons = base.icons;
	out.web_accessible_resources = overlay.web_accessible_resources;
	out.content_scripts = base.content_scripts;
	if (overlay.externally_connectable) out.externally_connectable = overlay.externally_connectable;
	out.background = overlay.background;

	return out;
}

const chromium = buildManifest('manifests/chromium/overlay.json');
const firefox = buildManifest('manifests/firefox/overlay.json');

write('manifests/chromium/manifest_.json', chromium);
write('manifests/firefox/manifest_.json', firefox);

// The repo-root manifest used for local development is an MV3 manifest that loads
// in Chrome AND Firefox: both background keys are declared — Chrome uses
// background.service_worker and ignores "scripts", Firefox (which runs MV3
// background scripts as an event page) uses "scripts" and ignores "service_worker".
// Note: the "world": "MAIN" content script requires Firefox 128+.
const dev = JSON.parse(JSON.stringify(chromium));
dev.background = {
	service_worker: chromium.background.service_worker,
	scripts: firefox.background.scripts,
};
write('manifest.json', dev);

console.log(`Manifests generated for version ${base.version} (chromium MV3, firefox MV2, root dual-browser MV3)`);
