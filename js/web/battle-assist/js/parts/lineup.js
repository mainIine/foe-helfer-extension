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

/*
 * Army suggestion: which eight units have the best chance against the army
 * in the open battle window?
 *
 * The enemy is known before the first blow (BattlefieldService.getArmyPreview
 * lists every wave with unit types, abilities and boosts; the Guild
 * Expedition names it with the encounter), the own stock and boosts come with
 * getArmyInfo, the unit types are the game's "unit_types" metadata (Unit.Types).
 *
 * The fight itself is computed on the server, and its map and AI are not
 * known here. So the win rate is an ESTIMATE: every candidate line-up is
 * played a few hundred times against the previewed waves in a small
 * simulation without a map.
 *
 * What is solid - a damage model that matched every single hit in the step
 * history of 162 recorded battle waves:
 *
 *     A   = baseDamage * (1 + attackBoost%)  + bonus vs. the target's class
 *                                            + bonus of the attacker's terrain
 *     D   = baseArmor  * (1 + defenseBoost%) + bonus vs. the attacker's class
 *                                            + bonus of the target's terrain
 *     eff = (0.5 + hitpoints / 20) * A
 *     max = round(10 * 0.62 ^ (D / eff))     min = round(10 * 0.38 ^ (D / eff))
 *
 * What the recorded battles showed on top of it:
 *
 *   - order of the modifiers: reactive-armor cap, THEN critical hit (x1.5,
 *     rounded half up), THEN force field (-2, at least 1)
 *   - power shot ignores the cap, NOT the force field
 *   - critical hits: the chance is the player's critical_hit_chance boost;
 *     the extra targets of a MIRV shot never crit
 *   - artillery cannot attack flying units; ranged classes do not retaliate,
 *     "contact" retaliates against every attack in reach, the others once
 *     per round; a unit with blast never retaliated
 *   - retaliation needs reach: a longer-ranged attacker is safe
 *   - turn order is the type's initiative, both sides interleaved
 *   - who stands in front draws the hits: a unit that has moved up is hit
 *     before one still at the start line. Fast units with a short range fly
 *     ahead and take the first volley while the rogues (initiative 1) have
 *     not moved yet; slow units with a long range stay level with the rogues,
 *     which then share the hits. Line-ups of one or two fast units and 6-7
 *     rogues lost half of their two-wave battles: the real units came out of
 *     wave 1 dead or nearly so, and without them every rogue dies on its
 *     first hit in wave 2. Three heavy units and five rogues won theirs
 *     (EXPOSE, ROGUE_DRAW, FOCUS)
 *   - a rogue hit while it still has its morale armor keeps its disguise
 *   - in round 1 many units cannot attack yet: artillery always can, a fast
 *     unit that moves first in less than half of the cases
 *
 * What is still ASSUMED:
 *
 *   - no map: terrain bonuses and stealth enter as probabilities
 *     (TERRAIN_WEIGHT); reach is a chance per round, not a position
 *   - a stealthed unit can only be attacked from the neighbouring field, or
 *     by blast / power shot (not seen in the recordings yet)
 *   - frenzy reaches a neighbour of the target now and then (FRENZY_SPLASH)
 *   - how far a unit stands in front: no positions, only a depth that grows
 *     by the unit's movement with every turn, up to where its range reaches
 *     (FIELD, hexes from the type's range and movement points)
 *   - how hard the enemy focuses: EXPOSE, ROGUE_DRAW and FOCUS are fitted to
 *     three recordings of one era and checked against two battles of another;
 *     one or two fast units with 6-7 rogues in two-wave battles are still
 *     forecast too well
 *
 * Real results beat the estimate: the box remembers per enemy army (unit
 * types per wave) what the player fought it with and how it went - wins,
 * losses and a real score (units lost, hitpoints kept). What beat the army
 * before, with the best real score, is suggested first; what lost against
 * it is not. Champions are spared: they only come up where the line-up
 * without them is clearly worse (SPARE_COST).
 */

let LineupAdvisor = (function () {
	'use strict';

	const POOL_SIZE = 8;
	/** an untried line-up replaces a remembered winner only when its forecast
	 *  beats the winner's REAL score by this much (0.03 = one unit lost) */
	const EXPLORE_MARGIN = 0.02;
	/**
	 * Champions (FGX-100 Held, …) are few and heal six times slower than the
	 * rest — live de12 2026-11-14: in 122 fights the fresh stock fell from 44
	 * to 10 while every fight would have been won without them. Each one in a
	 * line-up costs this much value, so it only goes in where the line-up
	 * without it is clearly worse (0.05 = five points of win rate).
	 */
	const SPARE_COST = 0.05;
	const SPARED = /_champion$/;
	const ROGUE = 'rogue';
	const FULL_HITPOINTS = 10;
	const MAX_ROUNDS = 30;

	// which boosts count for the attacker, and which for any unit
	const ATTACKER_ATTACK = ['military_boost', 'attack_boost', 'advanced_tactics'];
	const ATTACKER_DEFENSE = ['military_boost', 'attacker_defense_boost', 'advanced_tactics'];
	const ALL_ATTACK = ['military_boost', 'attack_boost', 'fierce_resistance', 'defender_attack_boost', 'advanced_tactics'];
	const ALL_DEFENSE = ['defense_boost', 'fierce_resistance', 'military_boost', 'advanced_tactics', 'attacker_defense_boost'];

	/** share of the battlefield a terrain covers — plain dominates every map */
	const TERRAIN_WEIGHT = { plain: 0.5, hills: 0.1, rocks: 0.1, forest: 0.1, bushes: 0.1, swamp: 0.05 };
	/** share of attacks that go to a random target in reach instead of the best */
	const RANDOM_TARGET = 0.85;
	/** damage factor of a critical hit */
	const CRIT_FACTOR = 1.5;
	/** chance that an attacker stands closer than its range requires */
	const CLOSE_IN = 0.5;
	/** chance per round that an untouched rogue (range 1) gets to attack */
	const ROGUE_REACH = 0.3;
	/** share of MIRV shots that hit a second extra target */
	const MIRV_SECOND = 0.3;
	/**
	 * How much more a random attack is drawn to an untouched rogue than to a
	 * real unit standing level with it. Artillery reaches everybody from the
	 * start and shows no such pull.
	 */
	const ROGUE_DRAW = 5;
	/**
	 * Share of the draw that is left per hex a unit stands behind the foremost
	 * one of its army: a rogue that has not moved yet is ten hexes behind a
	 * fast unit that flew ahead (0.03), but level with a heavy one that has
	 * not had its turn either.
	 */
	const EXPOSE = 0.7;
	/** how much more a random attack is drawn to a unit per lost hitpoint/10:
	 *  the enemy finishes what is hurt instead of spreading its hits */
	const FOCUS = 3;
	/** hexes between the two start lines */
	const FIELD = 14;
	/** movement points one hex costs on open ground */
	const HEX_COST = 2;
	/** eras whose longest range would not fit the field count ranges and
	 *  movement in smaller steps: one hex is LARGE_SCALE of them */
	const MAX_HEX_RANGE = 16;
	const LARGE_SCALE = 1.5;
	/** a remembered line-up is out against an army once it lost this many of
	 *  its last ARMY_WINDOW fights against it — old wins do not shield it */
	const ARMY_LOSSES = 2;
	const ARMY_WINDOW = 3;
	/** chance that a frenzy attack finds a second enemy next to its target */
	const FRENZY_SPLASH = 0.35;

	/** runs per candidate: a quick pass over all, a long one over the best */
	const QUICK_RUNS = 16;
	const FINAL_RUNS = 240;
	const FINALISTS = 8;
	/** value = win rate - DEAD_WEIGHT * units lost + HP_WEIGHT * hitpoints kept */
	const DEAD_WEIGHT = 0.03;
	const HP_WEIGHT = 0.05;

	/** small deterministic generator — the same enemy gives the same answer */
	function mulberry32(seed) {
		let a = seed >>> 0;
		return function () {
			a = (a + 0x6D2B79F5) >>> 0;
			let t = a;
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	/**
	 * Sum of a unit's bonuses of the given types, in percent. A multiplier
	 * bonus scales the additive sum, like the army screen shows it.
	 * @param {?object[]} bonuses
	 * @param {string[]} types
	 * @returns {number}
	 */
	function boost(bonuses, types) {
		let additive = 0;
		let multiplier = 0;
		for (const b of bonuses || []) {
			if (!b || types.indexOf(b.type) < 0) continue;
			const value = Math.trunc(Number(b.value) || 0);
			if (b.isBonusMultiplier) multiplier += value; else additive += value;
		}
		return multiplier ? Math.trunc(additive * (1 + multiplier / 100)) : additive;
	}

	/** expected terrain bonus of a {terrain: value} table */
	function terrainBonus(table) {
		let sum = 0;
		for (const terrain in table || {}) sum += (TERRAIN_WEIGHT[terrain] || 0) * (table[terrain] || 0);
		return sum;
	}

	let profileSeq = 0;

	/**
	 * Everything the simulation needs to know about one kind of unit on one
	 * side: the type's values with that side's boosts applied.
	 *
	 * @param {object} type entry of the unit_types metadata
	 * @param {?object[]} abilities the unit's own list, else the type's
	 * @param {number} attackPct
	 * @param {number} defensePct
	 * @param {number} [critPct] the side's critical hit chance, in percent
	 * @param {number} [scale] distance scale of the battle (advisor._scale)
	 * @returns {object}
	 */
	function makeProfile(type, abilities, attackPct, defensePct, critPct, scale) {
		const hexRange = Math.max(1, Math.ceil((type.range || 1) / (scale || 1)));
		const hexMove = Math.floor((type.movementPoints || 0) / (HEX_COST * (scale || 1)));
		const ab = {};
		const list = Array.isArray(abilities) && abilities.length ? abilities : type.configAbilities || [];
		for (const a of list) if (a && a.type) ab[a.type] = a;

		let stealth = 0;
		for (const terrain of (ab.stealth && ab.stealth.terrains) || []) stealth += TERRAIN_WEIGHT[terrain] || 0;

		const cls = type.unitClass;
		const ranged = cls === 'long_ranged' || cls === 'short_ranged';
		const oneShot = !!ab.one_shot;
		const contact = !!ab.contact;

		return {
			idx: profileSeq++,
			id: type.unitTypeId,
			name: type.name || type.unitTypeId,
			cls,
			range: type.range || 1,
			// hexes it moves up per turn, and how far up at most: where its range reaches
			advance: hexMove,
			front: Math.max(0, FIELD - hexRange),
			initiative: type.initiative || 0,
			attack: (type.baseDamage || 0) * (1 + attackPct / 100),
			defense: (type.baseArmor || 0) * (1 + defensePct / 100),
			attackPct,
			defensePct,
			atkVs: (type.attackBonus && type.attackBonus.units) || {},
			defVs: (type.defenseBonus && type.defenseBonus.units) || {},
			atkTerrain: terrainBonus(type.attackBonus && type.attackBonus.terrains),
			defTerrain: terrainBonus(type.defenseBonus && type.defenseBonus.terrains),
			rogue: !!ab.rogue,
			flying: !!ab.flying,
			powerShot: !!ab.power_shot,
			blast: !!ab.blast,
			contact,
			retaliates: !oneShot && !ab.blast && (contact || !ranged),
			artillery: cls === 'long_ranged',
			reactive: ab.reactive_armor ? ab.reactive_armor.value || 0 : 0,
			forceField: ab.force_field ? ab.force_field.value || 0 : 0,
			mirv: ab.mirv ? ab.mirv.value || 1 : 0,
			recharge: ab.recharge ? ab.recharge.value || 1 : 0,
			frenzy: !!ab.frenzy,
			morale: ab.morale ? ab.morale.value || 1 : 0,
			stealth: Math.min(1, stealth),
			crit: Math.min(1, Math.max(critPct || 0,
				ab.critical_hit_chance ? Number(ab.critical_hit_chance.value) || 0 : 0) / 100),
			// first move of the fight: who moves early is still far away
			reach: cls === 'long_ranged' ? 1 : Math.min(1, Math.max(0.45, 1.25 - (type.initiative || 0) / 100)),
		};
	}

	/**
	 * Raw damage range of one attack, as forecast — before
	 * reactive armor, critical hit and force field.
	 * @param {object} a attacker profile
	 * @param {object} d defender profile
	 * @param {number} hitpoints of the attacker
	 * @returns {number[]} [min, max]
	 */
	function damageRange(a, d, hitpoints) {
		const attack = a.attack + a.atkTerrain + (a.atkVs[d.cls] || 0);
		const defense = d.defense + (a.powerShot ? 0 : d.defTerrain) + (d.defVs[a.cls] || 0);
		const effective = (0.5 + hitpoints / 20) * attack;
		let max = 1;
		let min = 1;
		if (effective > 0) {
			max = Math.round(10 * Math.pow(0.62, defense / effective));
			min = Math.round(10 * Math.pow(0.38, defense / effective));
		}
		return [Math.max(1, min), Math.max(1, max)];
	}

	/**
	 * What a rolled hit really takes off: reactive-armor cap (not against
	 * power shot), then the critical hit, then the force field.
	 * @param {number} raw rolled damage
	 * @param {object} a attacker profile
	 * @param {object} d defender profile
	 * @param {boolean} crit
	 * @returns {number}
	 */
	function finalDamage(raw, a, d, crit) {
		let damage = raw;
		if (!a.powerShot && d.reactive > 0) damage = Math.min(damage, d.reactive);
		if (crit) damage = Math.round(damage * CRIT_FACTOR);
		if (d.forceField > 0) damage = Math.max(1, damage - d.forceField);
		return damage;
	}

	/** damage ranges are looked up thousands of times per decision */
	function makeTable() {
		const cache = new Map();
		return function (a, d) {
			const key = a.idx * 4096 + d.idx;
			let rows = cache.get(key);
			if (!rows) {
				rows = [];
				for (let hp = 0; hp <= FULL_HITPOINTS; hp++) {
					const range = damageRange(a, d, hp);
					// [min, max, expected final damage] — the last for the target choice
					let expected = 0;
					for (let raw = range[0]; raw <= range[1]; raw++) {
						expected += (1 - a.crit) * finalDamage(raw, a, d, false) + a.crit * finalDamage(raw, a, d, true);
					}
					rows.push([range[0], range[1], expected / (range[1] - range[0] + 1)]);
				}
				cache.set(key, rows);
			}
			return rows;
		};
	}

	/**
	 * One fight: the line-up against all waves, in order.
	 *
	 * @param {object[]} ownProfiles eight profiles
	 * @param {Array<Array<{p: object, hp: number}>>} waves
	 * @param {function(): number} rng
	 * @param {function(object, object): number[][]} table
	 * @returns {{won: boolean, dead: number, hpLeft: number}}
	 */
	function simulate(ownProfiles, waves, rng, table) {
		const own = ownProfiles.map(p => ({
			p, base: p, hp: FULL_HITPOINTS, side: 1, fresh: p.rogue,
			armor: 0, cool: 0, lastRet: 0, hidden: false, tie: 0, depth: 0,
		}));

		/** live units of one side */
		const alive = list => list.filter(u => u.hp > 0);

		/**
		 * Takes a hit from `from`; a fresh rogue turns into a comrade instead.
		 * @param {boolean} [noCrit] the extra targets of a shot never crit
		 */
		function hit(from, target, team, noCrit) {
			if (target.fresh) {
				// the morale armor goes first — the disguise holds
				if (target.armor > 0) {
					target.armor--;
					return;
				}
				// only a REAL unit can be copied: a rogue in disguise still
				// carries the secret identity and counts as a rogue
				const models = team.filter(u => u.hp > 0 && !u.base.rogue);
				if (!models.length) {
					target.hp = 0;
					return;
				}
				target.p = models[Math.floor(rng() * models.length)].p;
				target.fresh = false;
				return;
			}
			const range = table(from.p, target.p)[Math.max(0, from.hp)];
			const raw = range[0] + Math.floor(rng() * (range[1] - range[0] + 1));
			const crit = !noCrit && from.p.crit > 0 && rng() < from.p.crit;
			let damage = finalDamage(raw, from.p, target.p, crit);
			if (target.armor > 0) {
				const absorbed = Math.min(target.armor, damage);
				target.armor -= absorbed;
				damage -= absorbed;
			}
			target.hp -= damage;
		}

		/** @returns {number} 0 = out of reach, 1 = only from next to it, 2 = freely */
		function reach(u, f) {
			if (u.p.artillery && !u.p.powerShot && f.p.flying) return 0;
			if (f.hidden && !u.p.blast && !u.p.powerShot) return u.p.artillery ? 0 : 1;
			return 2;
		}

		function pickTarget(u, foes) {
			// no map here: now and then the best target is simply not the
			// one in reach, and the unit takes what stands in front of it
			if (rng() < RANDOM_TARGET) {
				const open = foes.filter(f => f.hp > 0 && reach(u, f));
				if (!open.length) return null;
				let front = 0;
				for (const f of open) if (f.depth > front) front = f.depth;
				// not an even pick: who stands in front is hit first, an
				// untouched rogue and a hurt unit draw the next hit
				let total = 0;
				const weights = open.map(f => {
					let weight = f.fresh
						? (u.p.artillery ? 1 : ROGUE_DRAW)
						: 1 + FOCUS * (FULL_HITPOINTS - f.hp) / FULL_HITPOINTS;
					if (!u.p.artillery) weight *= Math.pow(EXPOSE, front - f.depth);
					total += weight;
					return weight;
				});
				let roll = rng() * total;
				let f = open[open.length - 1];
				for (let i = 0; i < open.length; i++) {
					roll -= weights[i];
					if (roll < 0) {
						f = open[i];
						break;
					}
				}
				return { target: f, close: reach(u, f) === 1 };
			}
			let best = null;
			let bestValue = -Infinity;
			let bestReach = 0;
			for (const f of foes) {
				if (f.hp <= 0) continue;
				const r = reach(u, f);
				if (!r) continue;
				const expected = table(u.p, f.p)[u.hp][2];
				let value = Math.min(expected, f.hp + f.armor) + (expected >= f.hp + f.armor ? 2 : 0);
				// nobody aims at a rogue on purpose — it only gets hit by chance
				if (f.fresh) value = 0.5;
				if (r === 1) value -= 0.5;
				value += rng() * 0.01;
				if (value > bestValue) {
					bestValue = value;
					best = f;
					bestReach = r;
				}
			}
			return best ? { target: best, close: bestReach === 1 } : null;
		}

		for (let w = 0; w < waves.length; w++) {
			const foes = waves[w].map(e => ({
				p: e.p, base: e.p, hp: e.hp, side: 2, fresh: e.p.rogue,
				armor: 0, cool: 0, lastRet: 0, hidden: false, tie: 0, depth: 0,
			}));

			// a new wave is a new battle: everybody is back at the start line,
			// abilities are fresh, a rogue that got away in disguise is a rogue again
			for (const u of own) {
				if (u.hp <= 0) continue;
				if (u.base.rogue) {
					u.p = u.base;
					u.fresh = true;
				}
				u.cool = 0;
				u.lastRet = 0;
				u.depth = 0;
			}
			for (const team of [own, foes]) {
				let morale = 0;
				for (const u of team) if (u.hp > 0 && u.p.morale > morale) morale = u.p.morale;
				for (const u of team) u.armor = u.hp > 0 ? morale : 0;
			}

			let decided = false;
			for (let round = 1; round <= MAX_ROUNDS && !decided; round++) {
				const order = alive(own).concat(alive(foes));
				for (const u of order) {
					u.tie = rng();
					u.hidden = u.p.stealth > 0 && rng() < u.p.stealth;
				}
				order.sort((a, b) => b.p.initiative - a.p.initiative || a.tie - b.tie);

				for (const u of order) {
					if (u.hp <= 0) continue;
					// its turn: it moves up, as far as its range asks for
					u.depth = Math.min(u.depth + u.p.advance, u.p.front);
					if (u.cool > 0) {
						u.cool--;
						continue;
					}
					// not in reach yet: the first move of the fight, and a
					// rogue with its range of 1 most of the time
					if (u.fresh ? rng() > ROGUE_REACH : round === 1 && u.p.reach < 1 && rng() > u.p.reach) continue;
					const mine = u.side === 1 ? own : foes;
					const theirs = u.side === 1 ? foes : own;
					const pick = pickTarget(u, theirs);
					if (!pick) continue;

					const target = pick.target;
					const wasFresh = target.fresh;
					hit(u, target, theirs);
					if (u.p.recharge) u.cool = u.p.recharge;

					// extra targets of the same shot
					let extra = 0;
					if (u.p.mirv) extra += 1 + (u.p.mirv > 1 && rng() < MIRV_SECOND ? 1 : 0);
					if (u.p.frenzy && rng() < FRENZY_SPLASH) extra += 1;
					if (extra) {
						const others = theirs.filter(f => f.hp > 0 && f !== target && reach(u, f));
						while (extra-- > 0 && others.length) {
							const at = Math.floor(rng() * others.length);
							hit(u, others[at], theirs, true);
							others.splice(at, 1);
						}
					}

					// the answer: only from a target that stood and can reach —
					// a longer-ranged attacker is safe unless it came closer
					const inReach = pick.close || target.p.range >= u.p.range || rng() < CLOSE_IN;
					if (target.hp > 0 && !wasFresh && target.p.retaliates && inReach
						&& (target.p.contact || target.lastRet !== round)) {
						target.lastRet = round;
						hit(target, u, mine);
					}

					if (!theirs.some(f => f.hp > 0) || !mine.some(f => f.hp > 0)) {
						decided = true;
						break;
					}
				}
			}

			if (foes.some(f => f.hp > 0) || !own.some(u => u.hp > 0)) {
				return { won: false, dead: POOL_SIZE, hpLeft: 0 };
			}
		}

		let dead = 0;
		let hpLeft = 0;
		for (const u of own) {
			if (u.hp <= 0) dead++;
			else hpLeft += u.hp;
		}
		return { won: true, dead, hpLeft };
	}

	/** @param {string[]} unitTypeIds @returns {string} order-independent key */
	function keyOf(unitTypeIds) {
		return unitTypeIds.slice().sort().join(',');
	}


	/** at most this many unit types are combined — keeps the box quick */
	const MAX_TYPES = 8;

	const advisor = {
		POOL_SIZE,
		ROGUE,

		/** @type {?{source: object[], map: Map<string, object>}} */
		_typeCache: null,

		/**
		 * The game's unit types by id (the "unit_types" metadata of the Unit module).
		 * @returns {?Map<string, object>}
		 */
		unitTypes() {
			const source = Unit.Types;
			if (!Array.isArray(source) || !source.length) return null;
			if (!advisor._typeCache || advisor._typeCache.source !== source) {
				const map = new Map();
				for (const type of source) if (type && type.unitTypeId) map.set(type.unitTypeId, type);
				advisor._typeCache = { source, map };
			}
			return advisor._typeCache.map;
		},

		/** @param {string[]} unitTypeIds @returns {string} order-independent key */
		keyOf,

		/**
		 * The real score of a finished fight, on the scale of the forecast
		 * value: 1 for the win, minus the units lost, plus the hitpoints kept.
		 * @param {boolean} won
		 * @param {?object} state the BattleRealmState of the LAST wave fought
		 * @returns {number}
		 */
		score(won, state) {
			let dead = POOL_SIZE;
			let hpLeft = 0;
			if (won) {
				// a later wave lists only the survivors of the one before
				const alive = ((state && state.unitsOrder) || []).filter(u => u && u.teamFlag === 1 && u.currentHitpoints > 0);
				dead = Math.max(0, POOL_SIZE - alive.length);
				hpLeft = alive.reduce((sum, u) => sum + u.currentHitpoints, 0);
			}
			return (won ? 1 : 0) - DEAD_WEIGHT * dead + HP_WEIGHT * hpLeft / (POOL_SIZE * FULL_HITPOINTS);
		},

		/**
		 * @param {object} entry record of a line-up against one army
		 *     {wins, losses, winSum, recent}
		 * @returns {number} its real value there: the mean score of all its
		 *     fights, a lost one counting as eight units lost
		 */
		real(entry) {
			const fights = entry.wins + entry.losses;
			if (!fights) return 0;
			return (entry.winSum - DEAD_WEIGHT * POOL_SIZE * entry.losses) / fights;
		},

		/**
		 * @param {object} entry record of a line-up against one army
		 * @returns {boolean} true when it is no longer suggested against that
		 *     army: it lost there at least as often as it won, or ARMY_LOSSES
		 *     of its last ARMY_WINDOW fights there
		 */
		beaten(entry) {
			if (entry.losses >= entry.wins) return true;
			return (entry.recent || []).filter(r => !r).length >= ARMY_LOSSES;
		},

		/**
		 * Own chance for a critical hit, in percent (boost sum of the city).
		 * @returns {number}
		 */
		critChance() {
			return (typeof Boosts !== 'undefined' && Boosts.Sums && Number(Boosts.Sums.critical_hit_chance)) || 0;
		},

		/**
		 * The attacking army as the game has it set up, one id per unit.
		 * @param {object} armyInfo
		 * @returns {string[]}
		 */
		current(armyInfo) {
			const out = [];
			for (const entry of (armyInfo && armyInfo.units) || []) {
				if (!entry || !entry.is_attacking) continue;
				const count = Array.isArray(entry.unitIds) && entry.unitIds.length ? entry.unitIds.length : 1;
				for (let i = 0; i < count; i++) out.push(entry.unitTypeId);
			}
			return out;
		},

		/**
		 * Undamaged units per type that can go to battle now. The defending
		 * armies are left alone.
		 *
		 * counts[].unattached is not that number: it also counts the hurt
		 * units of a type. The fresh stock is the stack at full hitpoints -
		 * its `count` is the real number, `unitIds` lists only up to 20 of
		 * them. A type whose fresh stack is used up has no such entry: 0.
		 *
		 * @param {object} armyInfo
		 * @returns {Object<string, number>}
		 */
		stock(armyInfo) {
			const out = {};
			const units = (armyInfo && armyInfo.units) || [];
			const stacked = units.some(entry => entry && typeof entry.count === 'number');
			for (const entry of units) {
				if (!entry || entry.currentHitpoints !== FULL_HITPOINTS) continue;
				if (entry.is_defending || entry.isArenaDefending) continue;
				const listed = Array.isArray(entry.unitIds) && entry.unitIds.length ? entry.unitIds.length : 1;
				const count = typeof entry.count === 'number' ? Math.max(entry.count, listed) : listed;
				out[entry.unitTypeId] = (out[entry.unitTypeId] || 0) + count;
			}
			if (stacked) return out;

			// older shape without stack counts: unattached minus the hurt ones listed
			const hurt = {};
			for (const entry of units) {
				if (!entry || entry.currentHitpoints >= FULL_HITPOINTS) continue;
				if (entry.is_attacking || entry.is_defending || entry.isArenaDefending) continue;
				hurt[entry.unitTypeId] = (hurt[entry.unitTypeId] || 0) + 1;
			}
			for (const count of (armyInfo && armyInfo.counts) || []) {
				if (!count || !count.unitTypeId) continue;
				const fresh = Math.max(0, (count.unattached || 0) - (hurt[count.unitTypeId] || 0));
				out[count.unitTypeId] = Math.max(out[count.unitTypeId] || 0, fresh);
			}
			return out;
		},

		/**
		 * The previewed waves as simulation input.
		 * @param {object[]} waves entries with units[] (getArmyPreview, GE armyWaves)
		 * @param {Map<string, object>} types
		 * @param {number} scale distance scale of the battle
		 * @returns {{waves: ?Array, unknown: string[], attackPct: number, defensePct: number}}
		 */
		_enemy(waves, types, scale) {
			const out = [];
			const unknown = [];
			const cache = new Map();
			let attackPct = 0;
			let defensePct = 0;
			for (const wave of waves || []) {
				const units = [];
				for (const unit of (wave && wave.units) || []) {
					if (!unit) continue;
					const type = types.get(unit.unitTypeId);
					if (!type) {
						if (unknown.indexOf(unit.unitTypeId) < 0) unknown.push(unit.unitTypeId);
						continue;
					}
					const atk = boost(unit.bonuses, ALL_ATTACK);
					const def = boost(unit.bonuses, ALL_DEFENSE);
					if (atk > attackPct) attackPct = atk;
					if (def > defensePct) defensePct = def;
					const key = unit.unitTypeId + '|' + atk + '|' + def + '|'
						+ (unit.abilities || []).map(a => a && a.type).join('+');
					let p = cache.get(key);
					if (!p) {
						p = makeProfile(type, unit.abilities, atk, def, 0, scale);
						cache.set(key, p);
					}
					const hp = typeof unit.currentHitpoints === 'number' ? unit.currentHitpoints : FULL_HITPOINTS;
					if (hp > 0) units.push({ p, hp });
				}
				if (units.length) out.push(units);
			}
			return { waves: unknown.length ? null : out, unknown, attackPct, defensePct };
		},

		/**
		 * Own boosts per unit type, read off the army's units. Boosts belong
		 * to the player, so a type the army does not list right now gets the
		 * values of any other unit.
		 * @param {object} armyInfo
		 * @returns {function(string): {attack: number, defense: number}}
		 */
		_ownBoosts(armyInfo) {
			const byType = {};
			let any = null;
			for (const entry of (armyInfo && armyInfo.units) || []) {
				if (!entry || byType[entry.unitTypeId] || !Array.isArray(entry.bonuses)) continue;
				const boosts = {
					attack: boost(entry.bonuses, ATTACKER_ATTACK),
					defense: boost(entry.bonuses, ATTACKER_DEFENSE),
				};
				byType[entry.unitTypeId] = boosts;
				if (!any || entry.is_attacking) any = boosts;
			}
			return id => byType[id] || any || { attack: 0, defense: 0 };
		},

		/**
		 * All line-ups worth a look: one or two unit types, filled up with
		 * rogues in every split ("8 fast", "4 heavy + 4 rogues", …).
		 * @param {string[]} realTypes
		 * @param {Object<string, number>} stock
		 * @returns {string[][]}
		 */
		_candidates(realTypes, stock) {
			const have = id => stock[id] || 0;
			const out = [];
			const fill = (parts) => {
				const ids = [];
				let rogues = POOL_SIZE;
				for (const [id, count] of parts) {
					if (have(id) < count) return;
					for (let i = 0; i < count; i++) ids.push(id);
					rogues -= count;
				}
				if (have(ROGUE) < rogues) return;
				for (let i = 0; i < rogues; i++) ids.push(ROGUE);
				out.push(ids);
			};
			for (let i = 0; i < realTypes.length; i++) {
				for (let a = 1; a <= POOL_SIZE; a++) fill([[realTypes[i], a]]);
				for (let j = i + 1; j < realTypes.length; j++) {
					for (let a = 1; a < POOL_SIZE; a++) {
						for (let b = 1; a + b <= POOL_SIZE; b++) fill([[realTypes[i], a], [realTypes[j], b]]);
					}
				}
			}
			return out;
		},

		/**
		 * Ranks the line-ups the player could send against the previewed army.
		 *
		 * @param {object} input
		 * @param {object[]} input.waves enemy waves, each with units[]
		 * @param {object} input.armyInfo response of ArmyUnitManagementService.getArmyInfo
		 * @param {string[]} [input.eras] eras to offer units from, besides those
		 *     of the army that is set up
		 * @param {Object<string, object>} [input.known] the player's real record
		 *     against THIS army, line-up key -> {ids, wins, losses, winSum, recent}
		 * @returns {{ranked: object[], best: ?object, attackPct: number,
		 *   defensePct: number, reason: ?string, detail: string}}
		 *   ranked with the suggestion first, then by forecast; entries
		 *   {unitTypeIds, key, win, dead, deadWon, hpLeft, value, cost, real} —
		 *   dead counts a lost fight as all eight units, deadWon is the mean
		 *   of the won fights (null without a win). best is
		 *   the suggestion:
		 *
		 *     1. what beat this army before with the best real score — unless
		 *        it never lost there and an untried line-up forecasts clearly
		 *        better (EXPLORE_MARGIN), then that one
		 *     2. else the best forecast among line-ups that did not lose
		 *        against this army
		 *     3. else the best forecast
		 *
		 *   Champions cost SPARE_COST each, off forecast and real score alike:
		 *   they only come up where the line-up without them is clearly worse.
		 *   reason is a code when nothing can be said:
		 *   "notypes" | "unknown" | "noenemy" | "nostock"
		 */
		choose(input) {
			const fail = (reason, detail) => ({
				ranked: [], best: null, attackPct: 0, defensePct: 0, reason, detail: detail || '',
			});
			const setup = advisor._setup(input);
			if (setup.reason) return fail(setup.reason, setup.detail);
			const { types, enemy, play } = setup;

			const currentIds = advisor.current(input.armyInfo);
			const stock = advisor.stock(input.armyInfo);

			const eras = new Set(input.eras || []);
			const inArmy = new Set();
			for (const id of currentIds) {
				const type = types.get(id);
				if (type && id !== ROGUE) {
					eras.add(type.minEra);
					inArmy.add(id);
				}
			}
			let realTypes = [];
			for (const type of types.values()) {
				if (type.unitTypeId === ROGUE || !eras.has(type.minEra)) continue;
				if ((stock[type.unitTypeId] || 0) > 0) realTypes.push(type);
			}
			if (!realTypes.length) return fail('nostock');
			// too many types: what is set up first, then the strongest
			realTypes.sort((a, b) => inArmy.has(b.unitTypeId) - inArmy.has(a.unitTypeId)
				|| (b.baseDamage + b.baseArmor) - (a.baseDamage + a.baseArmor));
			realTypes = realTypes.slice(0, MAX_TYPES).map(type => type.unitTypeId);

			const candidates = new Map();
			for (const ids of advisor._candidates(realTypes, stock)) candidates.set(keyOf(ids), ids);
			// what fought this very army before is always in the running —
			// as long as the stock still holds it
			const known = input.known || {};
			for (const key of Object.keys(known)) {
				const ids = known[key].ids;
				if (candidates.has(key) || !Array.isArray(ids) || ids.length !== POOL_SIZE) continue;
				if (!ids.every(id => types.has(id))) continue;
				const need = {};
				for (const id of ids) need[id] = (need[id] || 0) + 1;
				if (Object.keys(need).every(id => (stock[id] || 0) >= need[id])) candidates.set(key, ids);
			}

			// equally good: the line-up that needs fewer rogues comes first
			const rogues = e => e.unitTypeIds.filter(id => id === ROGUE).length;
			const byValue = (a, b) => b.value - a.value || rogues(a) - rogues(b);

			let ranked = Array.from(candidates.values()).map(ids => play(ids, QUICK_RUNS));
			ranked.sort(byValue);
			const finalists = ranked.slice(0, FINALISTS);
			for (const e of ranked) if (known[e.key] && finalists.indexOf(e) < 0) finalists.push(e);
			const refined = new Map(finalists.map(e => [e.key, play(e.unitTypeIds, FINAL_RUNS)]));
			ranked = ranked.map(e => refined.get(e.key) || e);
			// the long pass outranks the quick one: finalists first, by value
			ranked.sort((a, b) => refined.has(b.key) - refined.has(a.key) || byValue(a, b));

			for (const e of ranked) {
				const entry = known[e.key];
				e.real = entry ? { wins: entry.wins, losses: entry.losses,
					value: advisor.real(entry), beaten: advisor.beaten(entry) } : null;
			}
			const realValue = e => e.real.value - e.cost;
			const winner = ranked.filter(e => e.real && !e.real.beaten)
				.sort((a, b) => realValue(b) - realValue(a))[0] || null;
			const fresh = ranked.find(e => !e.real) || null;
			let best;
			if (winner && fresh) {
				best = !winner.real.losses && fresh.value > realValue(winner) + EXPLORE_MARGIN ? fresh : winner;
			} else {
				best = winner || fresh || ranked[0] || null;
			}
			if (best) {
				best.remembered = best === winner;
				ranked = [best].concat(ranked.filter(e => e !== best));
			}

			return {
				ranked,
				best,
				attackPct: enemy.attackPct,
				defensePct: enemy.defensePct,
				reason: null,
				detail: '',
			};
		},

		/**
		 * The estimate for ONE line-up — the army that is set up right now.
		 * Cheap, so it can follow every swap of units.
		 *
		 * @param {object} input like choose()
		 * @param {string[]} unitTypeIds eight ids
		 * @returns {?object} entry like in choose().ranked, null when the
		 *     line-up is not complete or nothing can be said
		 */
		rate(input, unitTypeIds) {
			if (!unitTypeIds || unitTypeIds.length !== POOL_SIZE) return null;
			const setup = advisor._setup(input);
			if (setup.reason || !unitTypeIds.every(id => setup.types.has(id))) return null;
			return setup.play(unitTypeIds, FINAL_RUNS);
		},

		/**
		 * The distance scale of the battle: the eras of the units decide in
		 * which steps ranges and movement are counted.
		 * @param {object} input like choose()
		 * @param {Map<string, object>} types
		 * @returns {number} 1, or LARGE_SCALE when the longest range of these
		 *     eras would not fit the field
		 */
		_scale(input, types) {
			const eras = new Set(input.eras || []);
			const add = id => {
				const type = types.get(id);
				if (type && id !== ROGUE) eras.add(type.minEra);
			};
			for (const wave of input.waves || []) for (const unit of (wave && wave.units) || []) if (unit) add(unit.unitTypeId);
			for (const entry of (input.armyInfo && input.armyInfo.units) || []) if (entry && entry.is_attacking) add(entry.unitTypeId);
			let longest = 0;
			for (const type of types.values()) {
				if (eras.has(type.minEra) && type.movementPoints && type.range > longest) longest = type.range;
			}
			return longest > MAX_HEX_RANGE ? LARGE_SCALE : 1;
		},


		/**
		 * Enemy, own boosts and the dice — shared by choose() and rate().
		 * @param {object} input
		 * @returns {{reason: ?string, detail: string, types: Map, enemy: object, play: function}}
		 */
		_setup(input) {
			const types = advisor.unitTypes();
			if (!types) return { reason: 'notypes', detail: '' };

			profileSeq = 0; // profile numbers key the damage table of this call only
			const scale = advisor._scale(input, types);
			const enemy = advisor._enemy(input.waves, types, scale);
			if (!enemy.waves) return { reason: 'unknown', detail: enemy.unknown.join(', ') };
			if (!enemy.waves.length) return { reason: 'noenemy', detail: '' };

			const boostsOf = advisor._ownBoosts(input.armyInfo);
			const critPct = advisor.critChance();
			const profiles = new Map();
			const profileOf = id => {
				let p = profiles.get(id);
				if (!p) {
					const b = boostsOf(id);
					p = makeProfile(types.get(id), null, b.attack, b.defense, critPct, scale);
					profiles.set(id, p);
				}
				return p;
			};

			const table = makeTable();
			const play = (ids, runs) => {
				const own = ids.map(profileOf);
				let won = 0;
				let dead = 0;
				let deadWon = 0;
				let hpLeft = 0;
				for (let i = 0; i < runs; i++) {
					// the same dice for every candidate: differences are the line-up's
					const result = simulate(own, enemy.waves, mulberry32(20261114 + i * 7919), table);
					if (result.won) {
						won++;
						deadWon += result.dead;
					}
					dead += result.dead;
					hpLeft += result.hpLeft;
				}
				const entry = {
					unitTypeIds: ids,
					key: keyOf(ids),
					win: won / runs,
					// a lost fight counts as all eight units — for the ranking only
					dead: dead / runs,
					// what the box shows: units lost in the fights that were won
					deadWon: won ? deadWon / won : null,
					hpLeft: hpLeft / runs,
					// champions are few and heal slowly: they cost some value
					cost: SPARE_COST * ids.filter(id => SPARED.test(id)).length,
				};
				entry.value = entry.win - DEAD_WEIGHT * entry.dead
					+ HP_WEIGHT * entry.hpLeft / (POOL_SIZE * FULL_HITPOINTS) - entry.cost;
				return entry;
			};

			return { reason: null, detail: '', types, enemy, play };
		},
	};

	return advisor;
})();


/**
 * The suggestion box and the record of real fights.
 */
let BattleLineup = {

	/** rows shown in the box */
	ROWS: 5,
	/** a preview is forgotten after this long without a matching army update */
	PENDING_MS: 120000,
	/** enemy armies kept in the record */
	RECORD_LIMIT: 400,
	/** results per line-up and army kept for the recent tendency */
	RECENT: 3,

	/** @type {?{waves: object[], battleType: ?string, at: number}} the enemy waiting in the open battle window */
	pending: null,
	/** @type {?{key: string, result: object}} last ranking, reused while only the own army changes */
	cache: null,
	/** @type {?{enemyKey: string, lineupKey: string, ids: string[], totalWaves: number}} the fight in progress */
	fight: null,
	/** @type {?string} record key of the enemy currently shown */
	enemyKey: null,
	/**
	 * The player's real results: enemyKey -> lineupKey ->
	 * {ids, wins, losses, winSum, recent, lossDay}. winSum adds up the real
	 * scores of the won fights (LineupAdvisor.score), recent holds the last
	 * results. Losses count for the day they happened on: the next day the
	 * enemy starts weak again.
	 */
	record: (() => {
		localStorage.removeItem('BattleAssistLineupRecord'); // older shape, keyed by boost step
		try {
			return JSON.parse(localStorage.getItem('BattleAssistLineupMemory') || '{}');
		} catch (e) {
			return {};
		}
	})(),

	/** @returns {boolean} true keeps the box closed - another module may replace this */
	automated: () => false,

	/**
	 * Record key of an enemy: battle type and unit types per wave. The boosts
	 * are left out on purpose - they grow with every fight, and an army that
	 * outgrows a line-up shows it by beating it.
	 * @param {?string} battleType
	 * @param {object[]} waves
	 * @returns {string}
	 */
	keyOfEnemy: (battleType, waves) => {
		const parts = (waves || []).map(wave => ((wave && wave.units) || []).map(u => u.unitTypeId).sort().join(','));
		return (battleType || '') + '%' + parts.join('/');
	},

	/** @returns {string} the local day - losses count for it only */
	today: () => new Date().toDateString(),

	/**
	 * The record against one army, with the losses of an earlier day left out.
	 * @param {?string} enemyKey
	 * @returns {Object<string, object>} line-up key -> {ids, wins, losses, winSum, recent}
	 */
	known: (enemyKey) => {
		const out = {};
		const lineups = (enemyKey && BattleLineup.record[enemyKey]) || {};
		const today = BattleLineup.today();
		for (const [key, entry] of Object.entries(lineups)) {
			const old = entry.lossDay !== today;
			const losses = old ? 0 : entry.losses;
			if (!entry.wins && !losses) continue;
			out[key] = {
				ids: entry.ids,
				wins: entry.wins,
				losses,
				winSum: entry.winSum,
				recent: old ? (entry.recent || []).filter(r => r) : (entry.recent || []),
			};
		}
		return out;
	},

	/** @param {string} unitTypeId @returns {string} portrait url */
	icon: (unitTypeId) => srcLinks.get('/shared/unit_portraits/armyuniticons_50x50/armyuniticons_50x50_'
		+ unitTypeId.replace('guild_raids_', '') + '.jpg', true),

	/**
	 * Unit portraits with a count each, rogues last.
	 * @param {string[]} unitTypeIds
	 * @returns {string} html
	 */
	army: (unitTypeIds) => {
		const types = LineupAdvisor.unitTypes();
		const counts = new Map();
		for (const id of unitTypeIds) counts.set(id, (counts.get(id) || 0) + 1);
		const ids = Array.from(counts.keys())
			.sort((a, b) => (a === LineupAdvisor.ROGUE) - (b === LineupAdvisor.ROGUE) || counts.get(b) - counts.get(a));
		let html = '<div class="lineupArmy">';
		for (const id of ids) {
			const name = (types && types.get(id) && types.get(id).name) || id;
			html += `<span class="lineupUnit" title="${HTML.i18nTooltip(name)}"><img src="${BattleLineup.icon(id)}" alt=""><b>${counts.get(id)}</b></span>`;
		}
		return html + '</div>';
	},

	/** Closes the box and forgets the enemy. */
	close: () => {
		BattleLineup.pending = null;
		$('#battleAssistLineup').remove();
	},

	/** Fills the panel behind the gear of the box. */
	showSettings: () => {
		$('#battleAssistLineupSettingsBox').html(
			`<p title="${HTML.i18nTooltip(i18n('Boxes.BattleAssistLineup.ToggleTitle'))}">`
			+ `<input id="lineupShow" type="checkbox" class="game-cursor" checked> `
			+ `<label for="lineupShow">${i18n('Settings.ShowArmyLineup.Title')}</label></p>`);
	},

	/**
	 * Switches the army suggestion off from the settings of its box: stored at once
	 * like a click in the global settings (an open settings box follows), then the
	 * box closes. Switching it on again is done in the global settings.
	 */
	disable: () => {
		localStorage.setItem('ShowArmyLineup', false);

		const $setting = $('#SettingsBoxBody input.setting-check[data-id="ShowArmyLineup"]');
		if ($setting.length) Settings.StoreSettings($setting.prop('checked', false));

		BattleLineup.close();
	},

	/**
	 * Ranks the line-ups for the enemy in the open battle window and shows
	 * the box. The ranking is kept while only the own army changes, so
	 * swapping units just moves the "current" marker.
	 *
	 * @param {object[]} waves
	 * @param {object} armyInfo
	 * @param {?string} battleType
	 */
	show: (waves, armyInfo, battleType) => {
		if ($('#battleAssistLineup').length === 0) {
			HTML.Box({
				id: 'battleAssistLineup',
				title: i18n('Boxes.BattleAssistLineup.Title'),
				auto_close: true,
				dragdrop: true,
				minimize: true,
				settings: () => BattleLineup.showSettings(),
			});

			// the switch behind the gear is stored at once, there is no save button
			$('#battleAssistLineup').on('change', '#lineupShow', function () {
				if (!this.checked) BattleLineup.disable();
			});
		}
		$('#battleAssistLineupBody').html(`<div class="lineupNote">${i18n('Boxes.BattleAssistLineup.Calculating')}</div>`);

		// let the battle window open first — the ranking takes a moment
		setTimeout(() => {
			if ($('#battleAssistLineup').length === 0) return;

			const stock = LineupAdvisor.stock(armyInfo);
			const types = LineupAdvisor.unitTypes();
			const enemyKey = BattleLineup.keyOfEnemy(battleType, waves);
			const known = BattleLineup.known(enemyKey);
			const cacheKey = JSON.stringify([
				known,
				waves.map(w => (w.units || []).map(u => [u.unitTypeId, u.currentHitpoints, (u.bonuses || []).map(b => [b.type, b.value])])),
				Object.keys(stock).sort().map(id => [id, Math.min(stock[id], LineupAdvisor.POOL_SIZE)]),
				((armyInfo.units || []).find(u => u.is_attacking) || (armyInfo.units || [])[0] || {}).bonuses,
				// the eras of the army decide which unit types are offered
				LineupAdvisor.current(armyInfo).map(id => id !== LineupAdvisor.ROGUE && types && types.get(id) && types.get(id).minEra)
					.filter(Boolean).sort().filter((era, i, all) => era !== all[i - 1]),
			]);
			let result = BattleLineup.cache && BattleLineup.cache.key === cacheKey ? BattleLineup.cache.result : null;
			let current = null;
			try {
				if (!result) {
					result = LineupAdvisor.choose({ waves, armyInfo, eras: [CurrentEra], known });
					BattleLineup.cache = { key: cacheKey, result };
				}
				// the army that is set up: one of the ranked, or rated on its own
				const ids = LineupAdvisor.current(armyInfo);
				const key = LineupAdvisor.keyOf(ids);
				current = result.ranked.slice(0, BattleLineup.ROWS).find(e => e.key === key)
					|| (result.reason ? null : LineupAdvisor.rate({ waves, armyInfo }, ids));
			} catch (e) {
				console.error('[BattleLineup]', e);
				result = { ranked: [], reason: 'notypes', detail: String(e && e.message) };
			}
			BattleLineup.enemyKey = result.reason ? null : enemyKey;
			BattleLineup.render(waves, result, current);
		}, 50);
	},

	/**
	 * @param {object[]} waves
	 * @param {object} result LineupAdvisor.choose()
	 * @param {?object} current the army that is set up, rated — null when incomplete
	 */
	render: (waves, result, current) => {
		const pct = value => Math.round(value * 100) + ' %';
		// HTML.Format() turns a plain 0 into a dash
		const num = value => (value ? HTML.Format(value) : '0');
		const h = [];

		if (result.reason) {
			h.push(`<div class="lineupNote">${i18n('Boxes.BattleAssistLineup.NoData.' + result.reason)}`
				+ (result.detail ? ` (${HTML.i18nTooltip(result.detail)})` : '') + '</div>');
			$('#battleAssistLineupBody').html(h.join(''));
			return;
		}

		h.push('<div class="lineupEnemy">');
		h.push(`<span>${i18n('Boxes.BattleAssistLineup.Enemy')}</span>`);
		for (const wave of waves) h.push(BattleLineup.army(((wave && wave.units) || []).map(u => u.unitTypeId)));
		h.push(`<span class="lineupBoost" title="${HTML.i18nTooltip(i18n('Boxes.BattleAssistLineup.BoostTitle'))}">`
			+ `+${num(result.attackPct)} % / +${num(result.defensePct)} %</span>`);
		h.push('</div>');

		const rows = result.ranked.slice(0, BattleLineup.ROWS);
		if (current && !rows.some(e => e.key === current.key)) rows.push(current);
		const record = BattleLineup.known(BattleLineup.enemyKey);

		h.push('<table class="foe-table">');
		h.push(`<tr><th>${i18n('Boxes.BattleAssistLineup.Lineup')}</th>`
			+ `<th>${i18n('Boxes.BattleAssistLineup.WinRate')}</th>`
			+ `<th>${i18n('Boxes.BattleAssistLineup.Losses')}</th>`
			+ `<th title="${HTML.i18nTooltip(i18n('Boxes.BattleAssistLineup.RecordTitle'))}">${i18n('Boxes.BattleAssistLineup.Record')}</th></tr>`);
		for (const entry of rows) {
			const real = record[entry.key];
			const rate = entry.win >= 0.8 ? 'good' : entry.win >= 0.5 ? 'medium' : 'bad';
			const isCurrent = !!current && entry.key === current.key;
			const isBest = !!result.best && entry.key === result.best.key;
			const marks = [];
			if (isBest && result.best.remembered) marks.push(`<em class="lineupRemembered" title="${HTML.i18nTooltip(i18n('Boxes.BattleAssistLineup.RememberedTitle'))}">${i18n('Boxes.BattleAssistLineup.Remembered')}</em>`);
			if (isCurrent) marks.push(`<em>${i18n('Boxes.BattleAssistLineup.Current')}</em>`);
			h.push(`<tr class="${[isCurrent ? 'lineupCurrent' : '', isBest ? 'lineupBest' : ''].join(' ').trim()}">`
				+ `<td>${BattleLineup.army(entry.unitTypeIds)}${marks.join('')}</td>`
				+ `<td class="lineupRate ${rate}">${pct(entry.win)}</td>`
				+ `<td>${entry.deadWon === null ? '–' : num(Math.round(entry.deadWon * 10) / 10)}</td>`
				+ `<td>${real ? real.wins + ' : ' + real.losses : '–'}</td></tr>`);
		}
		h.push('</table>');

		if (!current) h.push(`<div class="lineupNote">${i18n('Boxes.BattleAssistLineup.CurrentIncomplete')}</div>`);
		h.push(`<div class="lineupNote">${i18n('Boxes.BattleAssistLineup.Note')}</div>`);

		$('#battleAssistLineupBody').html(h.join(''));
	},

	/**
	 * Counts a finished fight for the line-up that fought it, with its real score.
	 * @param {boolean} won
	 * @param {?object} state the BattleRealmState of the last wave fought
	 */
	count: (won, state) => {
		const fight = BattleLineup.fight;
		BattleLineup.fight = null;
		if (!fight || !fight.enemyKey) return;

		const record = BattleLineup.record;
		// re-insert: the most recent enemy sits last, the oldest is dropped first
		const lineups = record[fight.enemyKey] || {};
		delete record[fight.enemyKey];
		record[fight.enemyKey] = lineups;
		const entry = lineups[fight.lineupKey]
			|| (lineups[fight.lineupKey] = { ids: fight.ids, wins: 0, losses: 0, winSum: 0, recent: [] });

		// losses of an earlier day are forgotten
		const today = BattleLineup.today();
		if (entry.lossDay !== today) {
			entry.losses = 0;
			entry.recent = (entry.recent || []).filter(r => r);
		}
		if (won) {
			entry.wins++;
			entry.winSum += LineupAdvisor.score(true, state);
		} else {
			entry.losses++;
			entry.lossDay = today;
		}
		entry.recent = (entry.recent || []).concat(!!won).slice(-BattleLineup.RECENT);

		const keys = Object.keys(record);
		for (let i = 0; i < keys.length - BattleLineup.RECORD_LIMIT; i++) delete record[keys[i]];
		try {
			localStorage.setItem('BattleAssistLineupMemory', JSON.stringify(record));
		} catch (e) { /* storage full - the record stays in memory */ }
	},
};

// the enemy is known as soon as the battle window opens
FoEproxy.addHandler('BattlefieldService', 'getArmyPreview', (data, postData) => {
	if (!Settings.GetSetting('ShowArmyLineup') || BattleLineup.automated()) return;
	if (!Array.isArray(data.responseData)) return;

	const request = (postData || []).find(r => r && r.requestClass === 'BattlefieldService' && r.requestMethod === 'getArmyPreview');
	BattleLineup.pending = {
		waves: data.responseData,
		battleType: (request && request.requestData && request.requestData[0] && request.requestData[0].type) || null,
		at: Date.now(),
	};
});

// the own army — on opening the battle window and again after every swap of
// units (the answer to updatePools is an ArmyInfo as well)
FoEproxy.addHandler('ArmyUnitManagementService', 'getArmyInfo', (data, postData) => {
	if (!Settings.GetSetting('ShowArmyLineup') || BattleLineup.automated()) return;
	if (!data.responseData || !Array.isArray(data.responseData.units)) return;

	const request = (postData || []).find(r => r && r.requestClass === 'ArmyUnitManagementService'
		&& (r.requestMethod === 'getArmyInfo' || r.requestMethod === 'updatePools'));
	const context = request && request.requestData
		&& (request.requestMethod === 'updatePools' ? request.requestData[1] : request.requestData[0]);
	const battleType = (context && context.battleType) || null;

	let waves = null;
	if (battleType === 'guild_expedition') {
		// the expedition names its enemy with the encounter, not with a preview
		const encounter = BattleAssist.GEArmies[GExAttempts.state.GEprogress];
		waves = (encounter && encounter.armyWaves) || null;
	} else {
		const pending = BattleLineup.pending;
		if (pending && Date.now() - pending.at < BattleLineup.PENDING_MS
			&& (!pending.battleType || !battleType || pending.battleType === battleType)) {
			pending.at = Date.now();
			waves = pending.waves;
		}
	}

	if (!waves || !waves.length) {
		BattleLineup.close();
		return;
	}
	BattleLineup.show(waves, data.responseData, battleType);
});

// the fight itself: the box goes, the outcome is counted
FoEproxy.addHandler('BattlefieldService', 'all', (data, postData) => {
	const response = data.responseData;
	if (!response || typeof response !== 'object') return;

	if (response.__class__ === 'BattleRealm') {
		const battleType = response.battleType || {};
		const state = response.state || {};
		if (!(battleType.currentWaveId > 0)) {
			// wave 1: who fights whom — later waves only list the survivors
			const own = (state.unitsOrder || []).filter(u => u.teamFlag === 1).map(u => u.unitTypeId);
			BattleLineup.fight = BattleLineup.enemyKey && own.length ? {
				enemyKey: BattleLineup.enemyKey,
				lineupKey: LineupAdvisor.keyOf(own),
				ids: own,
				totalWaves: battleType.totalWaves || 1,
				wave: 0,
			} : null;
		} else if (BattleLineup.fight) {
			BattleLineup.fight.wave = battleType.currentWaveId;
		}
		BattleLineup.enemyKey = null;
		BattleLineup.close();
	}

	const state = response.__class__ === 'BattleRealm' ? response.state : response;
	if (!state || state.__class__ !== 'BattleRealmState' || !state.winnerBit || !BattleLineup.fight) return;

	if (state.winnerBit !== 1) BattleLineup.count(false, state);
	else if (BattleLineup.fight.wave + 1 >= BattleLineup.fight.totalWaves) BattleLineup.count(true, state);
});
