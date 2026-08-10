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
 * Exact runtime solver for negotiations.
 *
 * Game model: each of the 5 slots independently demands one of N goods
 * (duplicates possible). Each round one good is offered per open slot and the
 * game answers per slot with correct / wrong person / not needed, where
 * "wrong person" means the offered good is demanded by another slot that is
 * still open after this round's correct matches are resolved.
 *
 * The solver tracks the set of demand assignments that are still consistent
 * with all feedback (the posterior is uniform over that set) and picks the
 * offer that maximizes the exact win probability via expectimax search.
 * Ties are broken in favor of cheap goods through the enumeration order
 * (good index = priority rank, lower = spend first).
 *
 * Assignments are encoded as integers with 4 bits per slot, which supports
 * up to 16 goods. Search is kept fast by:
 *  - closed forms for the last round and for single-slot states
 *  - canonical slot ordering plus hash-based memoization
 *  - offer enumeration over good-equivalence classes (swap symmetry)
 *  - branch-and-bound on the win-probability upper bound
 */
const NegotiationSolver = (() => {

	const PLACES = 5;
	const EPS = 1e-12;
	const MAX_GOODS = 16;

	/** @param {number} g @returns {number} relative cost weight of a good rank */
	const costW = g => Math.pow(1.5, g);

	/**
	 * Compute the base-3 feedback code of an offer against a true assignment
	 * (digit per slot: 0 = correct, 1 = wrong person, 2 = not needed).
	 *
	 * @param {number[]} a true demand per open slot
	 * @param {number[]} offer offered good per open slot
	 * @returns {number} feedback code
	 */
	function feedbackCode(a, offer) {
		const k = a.length;
		let solvedMask = 0, demanded = 0;
		for (let i = 0; i < k; i++) if (a[i] === offer[i]) solvedMask |= 1 << i;
		for (let i = 0; i < k; i++) if (!(solvedMask & (1 << i))) demanded |= 1 << a[i];
		let code = 0;
		for (let i = k - 1; i >= 0; i--) {
			code *= 3;
			if (!(solvedMask & (1 << i))) code += (demanded & (1 << offer[i])) ? 1 : 2;
		}
		return code;
	}

	/** @param {number} v @param {number} k @returns {number[]} decoded assignment */
	function decode(v, k) {
		const a = new Array(k);
		for (let i = 0; i < k; i++) { a[i] = v & 15; v >>= 4; }
		return a;
	}

	/**
	 * Keep only the assignments matching a reported feedback code and project
	 * them onto the slots that stay open (digits != 0).
	 *
	 * @param {Int32Array} assigns consistent assignments over k open slots
	 * @param {number} k open slot count
	 * @param {number[]} offer offered good per open slot
	 * @param {number} code reported base-3 feedback code
	 * @returns {{assigns: Int32Array, keptPositions: number[]}}
	 */
	function applyResult(assigns, k, offer, code) {
		const keptPositions = [];
		let c = code;
		for (let i = 0; i < k; i++) { if (c % 3 !== 0) keptPositions.push(i); c = (c / 3) | 0; }
		const out = [];
		for (const v of assigns) {
			const a = decode(v, k);
			if (feedbackCode(a, offer) !== code) continue;
			let nv = 0;
			for (let j = 0; j < keptPositions.length; j++) nv |= a[keptPositions[j]] << (4 * j);
			out.push(nv);
		}
		return { assigns: Int32Array.from(out).sort(), keptPositions };
	}

	/** @param {number} goodCount @returns {Int32Array} all goodCount^5 assignments */
	function rootAssigns(goodCount) {
		let list = [0];
		for (let s = 0; s < PLACES; s++) {
			const next = [];
			for (const v of list) for (let g = 0; g < goodCount; g++) next.push(v + (g << (4 * s)));
			list = next;
		}
		return Int32Array.from(list).sort();
	}

	class Solver {
		/** @param {number} goodCount number of goods in the negotiation (2..16) */
		constructor(goodCount) {
			this.N = goodCount;
			this.memo = new Map();
			this.goMemo = new Map();
		}

		/**
		 * Best play for a state: exact win probability and the offer to make.
		 *
		 * @param {Int32Array} assigns sorted consistent assignments over k open slots
		 * @param {number} k open slot count
		 * @param {number} R remaining rounds (including the one to offer now)
		 * @returns {{p: number, offer: number[]|null}}
		 */
		evalState(assigns, k, R) {
			if (k === 0) return { p: 1, offer: null };
			if (R === 0) return { p: 0, offer: null };

			const total = assigns.length;

			// Last round: only a still-consistent assignment can win (1/|A| each),
			// so guess the cheapest one.
			if (R === 1) {
				let bestCost = Infinity, bestV = assigns[0];
				for (let ai = 0; ai < total; ai++) {
					let v = assigns[ai], c = 0;
					for (let i = 0; i < k; i++) { c += costW(v & 15); v >>= 4; }
					if (c < bestCost) { bestCost = c; bestV = assigns[ai]; }
				}
				return { p: 1 / total, offer: decode(bestV, k) };
			}

			const dec = new Uint8Array(total * k);
			for (let ai = 0; ai < total; ai++) {
				let v = assigns[ai];
				for (let i = 0; i < k; i++) { dec[ai * k + i] = v & 15; v >>= 4; }
			}

			const candMask = new Array(k).fill(0);
			for (let ai = 0; ai < total; ai++)
				for (let i = 0; i < k; i++) candMask[i] |= 1 << dec[ai * k + i];

			// Single slot: candidates are tried cheapest first, one per round.
			if (k === 1) {
				const cands = [];
				for (let g = 0; g < this.N; g++) if (candMask[0] & (1 << g)) cands.push(g);
				return { p: Math.min(R, total) / total, offer: [cands[0]] };
			}

			// canonicalize slot order for memoization
			const perm = [...new Array(k).keys()].sort((a, b) => candMask[a] - candMask[b] || a - b);
			let isId = true;
			for (let i = 0; i < k; i++) if (perm[i] !== i) { isId = false; break; }

			let cAssigns = assigns, cDec = dec, cCand = candMask;
			if (!isId) {
				cAssigns = new Int32Array(total);
				for (let ai = 0; ai < total; ai++) {
					let v = 0;
					for (let i = 0; i < k; i++) v |= dec[ai * k + perm[i]] << (4 * i);
					cAssigns[ai] = v;
				}
				cAssigns.sort();
				cDec = new Uint8Array(total * k);
				for (let ai = 0; ai < total; ai++) {
					let v = cAssigns[ai];
					for (let i = 0; i < k; i++) { cDec[ai * k + i] = v & 15; v >>= 4; }
				}
				cCand = perm.map(i => candMask[i]);
			}

			const key = this.hashKey(cAssigns, k, R);
			let best = this.memo.get(key);
			if (!best) {
				best = this.search(cAssigns, cDec, cCand, k, R);
				this.memo.set(key, best);
			}

			if (isId) return best;
			const offer = new Array(k);
			for (let i = 0; i < k; i++) offer[perm[i]] = best.offer[i];
			return { p: best.p, offer };
		}

		/**
		 * Expected number of offers per good under best play (for the average
		 * consumption display). Follows only the chosen policy, so this stays
		 * cheap once evalState results are memoized.
		 *
		 * @param {Int32Array} assigns sorted consistent assignments
		 * @param {number} k open slot count
		 * @param {number} R remaining rounds
		 * @returns {number[]} expected offer count per good index
		 */
		consumption(assigns, k, R) {
			const vec = new Array(this.N).fill(0);
			if (k === 0 || R === 0) return vec;

			const key = this.hashKey(assigns, k, R);
			const hit = this.goMemo.get(key);
			if (hit) return hit.slice();

			const { offer } = this.evalState(assigns, k, R);
			for (let i = 0; i < k; i++) vec[offer[i]]++;

			if (R > 1) {
				const groups = new Map();
				for (const v of assigns) {
					const code = feedbackCode(decode(v, k), offer);
					let g = groups.get(code);
					if (!g) { g = []; groups.set(code, g); }
					g.push(v);
				}
				for (const [code, list] of groups) {
					const sub = applyResult(Int32Array.from(list), k, offer, code);
					if (sub.keptPositions.length === 0) continue;
					const childVec = this.consumption(sub.assigns, sub.keptPositions.length, R - 1);
					const w = list.length / assigns.length;
					for (let g = 0; g < this.N; g++) vec[g] += w * childVec[g];
				}
			}

			this.goMemo.set(key, vec.slice());
			return vec;
		}

		/**
		 * @param {Int32Array} assigns
		 * @param {number} k
		 * @param {number} R
		 * @returns {string} memo key (FNV-1a, two independent 32 bit streams)
		 */
		hashKey(assigns, k, R) {
			let h1 = 0x811c9dc5 ^ (R * 31 + k), h2 = 0x9e3779b9 ^ assigns.length;
			for (let ai = 0; ai < assigns.length; ai++) {
				const v = assigns[ai];
				h1 = Math.imul(h1 ^ v, 16777619);
				h2 = Math.imul(h2 ^ v, 2246822519);
			}
			return h1 + ':' + h2 + ':' + assigns.length + ':' + k + ':' + R;
		}

		/**
		 * Exhaustive offer search with symmetry reduction and pruning.
		 * The offer space includes probe moves: any still-alive good may be
		 * offered on any open slot, even where it cannot be correct, because
		 * testing whether a good is used at all can be the optimal move.
		 *
		 * @param {Int32Array} assigns canonical sorted assignments
		 * @param {Uint8Array} dec decoded assignments (total*k)
		 * @param {number[]} candMask per-slot candidate good bitmask
		 * @param {number} k open slot count
		 * @param {number} R remaining rounds
		 * @returns {{p: number, offer: number[]}}
		 */
		search(assigns, dec, candMask, k, R) {
			const total = assigns.length;
			const N = this.N;

			let aliveMask = 0;
			for (let i = 0; i < k; i++) aliveMask |= candMask[i];
			const alive = [];
			for (let g = 0; g < N; g++) if (aliveMask & (1 << g)) alive.push(g);

			// good equivalence classes: g ~ h if swapping them maps the
			// assignment set onto itself
			const assignSet = new Set(assigns);
			const classId = new Array(N).fill(-1);
			let nextClass = 0;
			for (const g of alive) {
				if (classId[g] !== -1) continue;
				classId[g] = nextClass;
				for (const h of alive) {
					if (h <= g || classId[h] !== -1) continue;
					let ok = true;
					for (let ai = 0; ai < total; ai++) {
						let v = 0, changed = false;
						for (let i = 0; i < k; i++) {
							let x = dec[ai * k + i];
							if (x === g) { x = h; changed = true; }
							else if (x === h) { x = g; changed = true; }
							v |= x << (4 * i);
						}
						if (changed && !assignSet.has(v)) { ok = false; break; }
					}
					if (ok) classId[h] = nextClass;
				}
				nextClass++;
			}

			// iteration order per slot: real candidates first, probes last
			const slotGoods = [];
			for (let i = 0; i < k; i++) {
				const cands = [], probes = [];
				for (const g of alive) ((candMask[i] & (1 << g)) ? cands : probes).push(g);
				slotGoods.push([...cands, ...probes]);
			}

			const self = this;
			let best = null;
			const offer = new Array(k).fill(-1);
			const usedByClass = new Map();

			function rec(slot) {
				if (best && best.p >= 1 - EPS) return;
				if (slot === k) {
					const p = self.evalOffer(assigns, dec, k, R, offer, best ? best.p : -1);
					if (p !== null && (best === null || p > best.p + EPS)) {
						best = { p, offer: offer.slice() };
					}
					return;
				}
				for (const g of slotGoods[slot]) {
					const cls = classId[g];
					const used = usedByClass.get(cls) || [];
					if (!used.includes(g)) {
						// only the cheapest unused member of a class is canonical
						let canonical = -1;
						for (const h of alive) {
							if (classId[h] === cls && !used.includes(h)) { canonical = h; break; }
						}
						if (canonical !== g) continue;
						usedByClass.set(cls, [...used, g]);
						offer[slot] = g;
						rec(slot + 1);
						usedByClass.set(cls, used);
					} else {
						offer[slot] = g;
						rec(slot + 1);
					}
				}
				offer[slot] = -1;
			}
			rec(0);
			return best;
		}

		/**
		 * Win probability of one offer, or null once it provably cannot beat
		 * the incumbent.
		 *
		 * @param {Int32Array} assigns
		 * @param {Uint8Array} dec
		 * @param {number} k
		 * @param {number} R
		 * @param {number[]} offer
		 * @param {number} bestP incumbent win probability
		 * @returns {number|null}
		 */
		evalOffer(assigns, dec, k, R, offer, bestP) {
			const total = assigns.length;
			const groups = new Map();
			for (let ai = 0; ai < total; ai++) {
				const base = ai * k;
				let solvedMask = 0, demanded = 0;
				for (let i = 0; i < k; i++) if (dec[base + i] === offer[i]) solvedMask |= 1 << i;
				for (let i = 0; i < k; i++) if (!(solvedMask & (1 << i))) demanded |= 1 << dec[base + i];
				let code = 0;
				for (let i = k - 1; i >= 0; i--) {
					code *= 3;
					if (!(solvedMask & (1 << i))) code += (demanded & (1 << offer[i])) ? 1 : 2;
				}
				let g = groups.get(code);
				if (!g) { g = []; groups.set(code, g); }
				g.push(ai);
			}

			const children = [];
			let p = 0;
			for (const [code, list] of groups) {
				const w = list.length / total;
				const openIdx = [];
				let c = code;
				for (let i = 0; i < k; i++) { if (c % 3 !== 0) openIdx.push(i); c = (c / 3) | 0; }
				if (openIdx.length === 0) { p += w; continue; }
				if (R <= 1) continue; // lost branch, no rounds left
				const childAssigns = new Int32Array(list.length);
				for (let li = 0; li < list.length; li++) {
					const base = list[li] * k;
					let v = 0;
					for (let j = 0; j < openIdx.length; j++) v |= dec[base + openIdx[j]] << (4 * j);
					childAssigns[li] = v;
				}
				childAssigns.sort();
				children.push({ w, childAssigns, k2: openIdx.length });
			}
			children.sort((a, b) => b.w - a.w);

			let wRemaining = 0;
			for (const ch of children) wRemaining += ch.w;
			for (const ch of children) {
				if (p + wRemaining <= bestP + EPS) return null; // cannot beat incumbent
				const sub = this.evalState(ch.childAssigns, ch.k2, R - 1);
				p += ch.w * sub.p;
				wRemaining -= ch.w;
			}
			if (p <= bestP + EPS) return null;
			return p;
		}
	}

	/**
	 * Opening heuristic for states too large for exact search (only reached
	 * off-book, e.g. after a user deviation in round 1 or with more than 10
	 * goods): cover as many untested goods as possible, cheapest first —
	 * probe placements included — and fill up with cheap slot candidates.
	 *
	 * @param {Int32Array} assigns consistent assignments over k open slots
	 * @param {number} k open slot count
	 * @param {number} goodCount
	 * @param {number} testedMask bitmask of goods that were offered before
	 * @returns {number[]} offered good per open slot
	 */
	function heuristicOffer(assigns, k, goodCount, testedMask) {
		const candMask = new Array(k).fill(0);
		for (const v of assigns) {
			let x = v;
			for (let i = 0; i < k; i++) { candMask[i] |= 1 << (x & 15); x >>= 4; }
		}
		let aliveMask = 0;
		for (let i = 0; i < k; i++) aliveMask |= candMask[i];

		const offer = new Array(k).fill(-1);
		let usedMask = 0;
		const pick = (i, mask) => {
			for (let g = 0; g < goodCount; g++) {
				if ((mask & (1 << g)) && !(usedMask & (1 << g))) { offer[i] = g; usedMask |= 1 << g; return true; }
			}
			return false;
		};
		for (let i = 0; i < k; i++) {
			// untested candidate here > untested alive anywhere (probe) > any candidate
			if (pick(i, candMask[i] & aliveMask & ~testedMask)) continue;
			if (pick(i, aliveMask & ~testedMask)) continue;
			if (pick(i, candMask[i])) continue;
			// all candidates already offered on other slots: repeat the cheapest
			for (let g = 0; g < goodCount; g++) if (candMask[i] & (1 << g)) { offer[i] = g; break; }
		}
		return offer;
	}

	return { Solver, PLACES, MAX_GOODS, rootAssigns, feedbackCode, decode, applyResult, heuristicOffer };
})();

// Node export for the validation tooling in tools/negotiation
if (typeof module !== 'undefined' && module.exports) module.exports = NegotiationSolver;
