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
 * Consistency check of the negotiation opening book against the live solver.
 *
 * For every book node the stored win chance must equal the exact expectation
 * of its subtree: solved outcome mass plus, per feedback outcome, either the
 * child book node's chance or — at distillation cut points — the win
 * probability the live solver computes for the remaining state. This verifies
 * both the book data and the solver against each other without needing the
 * legacy zip tables.
 *
 * Usage: node tools/negotiation/validate.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { Solver, PLACES, rootAssigns, feedbackCode, decode } = require('../../js/web/negotiation/js/parts/solver.js');

const book = JSON.parse(fs.readFileSync(path.join(__dirname, '../../js/web/negotiation/tables/book.json'), 'utf8'));

const TOLERANCE = 0.005; // book chances are rounded to 3 decimals (percent)

let nodesChecked = 0, cutsChecked = 0, worstDiff = 0, failures = 0;

/**
 * @param {Object} node book node
 * @param {number[]} list consistent assignments over the open slots
 * @param {number} k open slot count
 * @param {number} R remaining rounds
 * @param {InstanceType<typeof Solver>} solver
 * @param {string} where path label for error messages
 * @returns {number} exact win probability of the node
 */
function checkNode(node, list, k, R, solver, where) {
	nodesChecked++;

	// offer of this node over the open slots (columns with 255 are solved)
	const offer = [];
	for (const g of node.gu) if (g !== 255) offer.push(g);
	if (offer.length !== k) throw new Error(`${where}: gu covers ${offer.length} slots, expected ${k}`);

	// partition by feedback outcome
	const groups = new Map();
	for (const v of list) {
		const code3 = feedbackCode(decode(v, k), offer);
		let g = groups.get(code3);
		if (!g) { g = []; groups.set(code3, g); }
		g.push(v);
	}

	let p = 0;
	for (const [code3, sub] of groups) {
		const w = sub.length / list.length;
		const openIdx = [];
		let c = code3;
		for (let i = 0; i < k; i++) { if (c % 3 !== 0) openIdx.push(i); c = (c / 3) | 0; }
		if (openIdx.length === 0) { p += w; continue; }
		if (R <= 1) continue; // lost branch

		const childList = sub.map(v => {
			const a = decode(v, k);
			let nv = 0;
			for (let j = 0; j < openIdx.length; j++) nv |= a[openIdx[j]] << (4 * j);
			return nv;
		});

		// base-4 code over all columns, 0 for already solved ones
		const perSlot = [];
		c = code3;
		for (let i = 0; i < k; i++) { perSlot.push(c % 3); c = (c / 3) | 0; }
		let code4 = 0, si = 0;
		for (const gu of node.gu) code4 = code4 * 4 + (gu === 255 ? 0 : perSlot[si++]);

		const child = node.r && node.r[code4];
		let childP;
		if (child) {
			childP = checkNode(child, childList, openIdx.length, R - 1, solver, `${where}/${code4}`);
		} else {
			// distillation cut: the live solver takes over here
			cutsChecked++;
			childP = solver.evalState(Int32Array.from(childList).sort(), openIdx.length, R - 1).p;
		}
		p += w * childP;
	}

	const diff = Math.abs(p * 100 - node.c);
	worstDiff = Math.max(worstDiff, diff);
	if (diff > TOLERANCE) {
		failures++;
		console.error(`FAIL ${where}: book c=${node.c} but exact value is ${(p * 100).toFixed(4)}`);
	}
	return p;
}

const t0 = Date.now();
const solversByN = new Map();
for (const key of Object.keys(book)) {
	const [T, N] = key.split('_').map(Number);
	if (!solversByN.has(N)) solversByN.set(N, new Solver(N));
	checkNode(book[key], Array.from(rootAssigns(N)), PLACES, T, solversByN.get(N), key);
	console.log(`${key} ok`);
}

console.log(`\nchecked ${nodesChecked} book nodes and ${cutsChecked} solver hand-over states in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`worst deviation: ${worstDiff.toFixed(5)} percentage points (tolerance ${TOLERANCE})`);
if (failures > 0) {
	console.error(`${failures} FAILURES`);
	process.exit(1);
}
console.log('all consistent');
