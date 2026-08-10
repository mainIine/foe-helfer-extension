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
 * Distill the legacy negotiation solution tables into the compact opening
 * book (js/web/negotiation/tables/book.json).
 *
 * A node is kept while the number of still-consistent demand assignments is
 * too large for the live solver to search quickly; everything below is cut
 * off because the solver reproduces it exactly at runtime (checked by
 * validate.js). Configurations whose root is already small enough are left
 * out entirely.
 *
 * Win chances and expected consumption are recomputed bottom-up for the
 * hybrid strategy (book moves until the cut, exact solver play below). The
 * live solver plays some endgames better than the legacy tables did (e.g.
 * several 4_8 subtrees), so the stored values must not be copied blindly.
 *
 * The legacy tables (27 zips, removed from the repo) live in git history:
 *   git show <old-commit>:js/web/negotiation/tables/3_5.zip > 3_5.zip
 * Unzip them into one directory and run:
 *   node tools/negotiation/distill.js <dir-with-T_N.json> [output]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { Solver } = require('../../js/web/negotiation/js/parts/solver.js');

const PLACES = 5;
// keep thresholds, mirrored by the live hand-over in the module
const BIG_STATE = 200;
const HARD_SEARCH_STATE = 40;

const tablesDir = process.argv[2];
const outFile = process.argv[3] || path.join(__dirname, '../../js/web/negotiation/tables/book.json');
if (!tablesDir) {
	console.error('usage: node tools/negotiation/distill.js <dir-with-T_N.json> [output]');
	process.exit(1);
}

/**
 * Partition an assignment list by the feedback outcomes of an offer.
 *
 * @param {number[]} list assignments encoded with 4 bits per open slot
 * @param {number} k open slot count
 * @param {number[]} offer offered good per open slot
 * @returns {Map<number, {list: number[], openIdx: number[]}>} groups by base-3 code
 */
function partition(list, k, offer) {
	const groups = new Map();
	for (const v of list) {
		const a = [];
		for (let i = 0; i < k; i++) a.push((v >> (4 * i)) & 15);
		let solvedMask = 0, demanded = 0;
		for (let i = 0; i < k; i++) if (a[i] === offer[i]) solvedMask |= 1 << i;
		for (let i = 0; i < k; i++) if (!(solvedMask & (1 << i))) demanded |= 1 << a[i];
		let code = 0;
		for (let i = k - 1; i >= 0; i--) {
			code *= 3;
			if (!(solvedMask & (1 << i))) code += (demanded & (1 << offer[i])) ? 1 : 2;
		}
		let g = groups.get(code);
		if (!g) {
			const openIdx = [];
			let c = code;
			for (let i = 0; i < k; i++) { if (c % 3 !== 0) openIdx.push(i); c = (c / 3) | 0; }
			g = { list: [], openIdx };
			groups.set(code, g);
		}
		let nv = 0;
		for (let j = 0; j < g.openIdx.length; j++) nv |= a[g.openIdx[j]] << (4 * j);
		g.list.push(nv);
	}
	return groups;
}

/**
 * @param {Object} node legacy table node ({c, go, gu, r})
 * @param {number[]} list consistent assignments over the open slots
 * @param {number} k open slot count
 * @param {number} roundsLeft remaining rounds
 * @param {InstanceType<typeof Solver>} solver live solver for the cut states
 * @param {number} goodCount
 * @returns {Object|null} distilled node, null when the live solver takes over
 */
function distill(node, list, k, roundsLeft, solver, goodCount) {
	const bigState = list.length > BIG_STATE;
	// deep searches on wide states are the live solver's only slow spots
	const hardSearch = roundsLeft >= 3 && k >= 4 && list.length > HARD_SEARCH_STATE;
	if (!((bigState || hardSearch) && node.r && roundsLeft > 1)) {
		return null;
	}

	const out = { c: 0, go: null, gu: node.gu, r: {} };
	const offer = [];
	for (const g of node.gu) if (g !== 255) offer.push(g);

	// hybrid value: this node's (table) move, optimal play below every cut
	let p = 0;
	const go = new Array(goodCount).fill(0);
	for (const g of offer) go[g]++;

	const groups = partition(list, k, offer);
	for (const [code3, g] of groups) {
		const w = g.list.length / list.length;
		if (g.openIdx.length === 0) { p += w; continue; }
		const perSlot = [];
		let c = code3;
		for (let i = 0; i < k; i++) { perSlot.push(c % 3); c = (c / 3) | 0; }
		let code4 = 0, si = 0;
		for (const gu of node.gu) code4 = code4 * 4 + (gu === 255 ? 0 : perSlot[si++]);
		const child = node.r[code4];
		const sub = child ? distill(child, g.list, g.openIdx.length, roundsLeft - 1, solver, goodCount) : null;
		if (sub) {
			out.r[code4] = sub;
			p += w * sub.c / 100;
			for (let i = 0; i < goodCount; i++) go[i] += w * sub.go[i];
		} else if (roundsLeft > 1) {
			const assigns = Int32Array.from(g.list).sort();
			p += w * solver.evalState(assigns, g.openIdx.length, roundsLeft - 1).p;
			const vec = solver.consumption(assigns, g.openIdx.length, roundsLeft - 1);
			for (let i = 0; i < goodCount; i++) go[i] += w * vec[i];
		}
	}
	out.c = Math.round(p * 100000) / 1000;
	out.go = go.map(x => Math.round(x * 1000) / 1000);
	return out;
}

const book = {};
let totalIn = 0;
for (let T = 3; T <= 5; T++) {
	for (let N = 2; N <= 10; N++) {
		const file = path.join(tablesDir, `${T}_${N}.json`);
		if (!fs.existsSync(file)) {
			console.error(`missing ${file}`);
			process.exit(1);
		}
		const raw = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
		totalIn += raw.length;
		let rootList = [0];
		for (let s = 0; s < PLACES; s++) {
			const next = [];
			for (const v of rootList) for (let g = 0; g < N; g++) next.push(v + (g << (4 * s)));
			rootList = next;
		}
		const distilled = distill(JSON.parse(raw), rootList, PLACES, T, new Solver(N), N);
		if (distilled) book[`${T}_${N}`] = distilled;
		else console.log(`${T}_${N}: fully live-solvable, not stored`);
	}
}

const json = JSON.stringify(book);
fs.writeFileSync(outFile, json);
console.log(`input ${(totalIn / 1e6).toFixed(1)}MB -> ${outFile} ${(json.length / 1024).toFixed(1)}KB (${Object.keys(book).length} configurations)`);
