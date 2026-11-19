/*
 * Regression check for the army suggestion (js/web/battle-assist/js/parts/lineup.js).
 *
 * Plays line-ups that were really fought through the simulation and prints
 * the forecast next to what happened. Run it after every change to the
 * target choice or to the damage model:
 *
 *     node tools/lineup/validate.js
 *
 * Exit code 1 when a check fails. The armies of the recordings are not kept:
 * the two that were noted down are used, the rest are seeded random mixes of
 * the same era — so the numbers are a reconstruction, not a replay.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const types = JSON.parse(fs.readFileSync(path.join(__dirname, 'unit-types.json'), 'utf8'));
const source = fs.readFileSync(path.join(__dirname, '../../js/web/battle-assist/js/parts/lineup.js'), 'utf8');
const boosts = { Sums: {} };
const LineupAdvisor = new Function('Unit', 'Boosts', 'FoEproxy', 'Settings', 'localStorage', 'i18n', 'HTML', '$', 'CurrentEra',
	source + '\nreturn LineupAdvisor;')({ Types: types }, boosts, { addHandler() {} }, { GetSetting: () => true },
	{ getItem: () => null, setItem() {}, removeItem() {} }, s => s, {}, () => ({}), 'StellarAgeDiscovery');

const rep = (id, n) => Array(n).fill(id);
const army = (ids, bonuses) => ({ units: ids.map(id => ({ unitTypeId: id, is_attacking: true, currentHitpoints: 10, bonuses })) });
const wave = (ids, pct) => ({ units: ids.map(id => ({ unitTypeId: id, bonuses: [{ type: 'military_boost', value: pct }] })) });
const rate = (waves, ids, bonuses, crit) => {
	boosts.Sums.critical_hit_chance = crit;
	return LineupAdvisor.rate({ waves, armyInfo: army(ids, bonuses) }, ids);
};
const failed = [];
const check = (ok, text) => { if (!ok) failed.push(text); };


/*
 * Stellar Age, Guild Battlegrounds, live 2026-11-14.
 * Own boosts as recorded: attack 41587 %, defense 43922 %, critical hit 66 %.
 */
const S = 'StellarAgeDiscovery_';
const FAST = S + 'fast', HEAVY = S + 'heavy_melee', LIGHT = S + 'light_melee', LONG = S + 'long_ranged', SHORT = S + 'short_ranged';
const CHAMPION = S + 'champion', ROGUE = 'rogue';
const OWN = [{ type: 'military_boost', value: 989 }, { type: 'military_boost', value: 1771 }, { type: 'military_boost', value: 1, isBonusMultiplier: true },
	{ type: 'attacker_defense_boost', value: 40727 }, { type: 'attack_boost', value: 38415 }];

let seed = 12345;
const random = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const mix = n => {
	const kinds = [FAST, HEAVY, LIGHT, LONG, SHORT].sort(() => random() - 0.5).slice(0, 2 + Math.floor(random() * 2));
	return Array.from({ length: n }, () => kinds[Math.floor(random() * kinds.length)]).sort();
};
const twoWaves = [[rep(LONG, 5).concat(rep(SHORT, 2), HEAVY), [HEAVY].concat(rep(LIGHT, 4))], [rep(LONG, 3).concat(rep(LIGHT, 4), HEAVY), rep(HEAVY, 6)]];
for (let i = 0; i < 4; i++) twoWaves.push([mix(8), mix(5 + Math.floor(random() * 2))]);
const oneWave = [rep(HEAVY, 6).concat(SHORT, LONG)];
for (let i = 0; i < 5; i++) oneWave.push(mix(8));

/** mean forecast of a line-up over the armies: [win %, units lost per fight (a lost fight = 8), hitpoints left] */
function stellar(ids, waveCount, pcts) {
	let win = 0, dead = 0, hp = 0, n = 0;
	for (const pct of pcts) {
		for (const enemy of waveCount === 1 ? oneWave : twoWaves) {
			const waves = waveCount === 1 ? [wave(enemy, pct)] : [wave(enemy[0], pct), wave(enemy[1], pct)];
			const entry = rate(waves, ids, OWN, 66);
			win += entry.win;
			dead += entry.dead;
			hp += entry.hpLeft;
			n++;
		}
	}
	return [100 * win / n, dead / n, hp / n];
}

// 174 fights at attrition 135-180, enemy +30630 … +41325 %: line-up, how often it fought, its class
const fought = [
	['7 fast + 1 rogue', rep(FAST, 7).concat(ROGUE), 35, '1-4'], ['6 fast + 2 rogues', rep(FAST, 6).concat(rep(ROGUE, 2)), 18, '1-4'],
	['8 heavy', rep(HEAVY, 8), 18, 'none'], ['2 fast + 6 rogues', rep(FAST, 2).concat(rep(ROGUE, 6)), 17, '5-7'],
	['3 heavy + 5 rogues', rep(HEAVY, 3).concat(rep(ROGUE, 5)), 15, '5-7'], ['4 fast + 4 rogues', rep(FAST, 4).concat(rep(ROGUE, 4)), 15, '1-4'],
	['1 fast + 7 rogues', [FAST].concat(rep(ROGUE, 7)), 13, '5-7'], ['1 heavy + 7 rogues', [HEAVY].concat(rep(ROGUE, 7)), 8, '5-7'],
	['3 fast + 3 heavy + 2 rogues', rep(FAST, 3).concat(rep(HEAVY, 3), rep(ROGUE, 2)), 7, '1-4'], ['8 fast', rep(FAST, 8), 6, 'none'],
];
// real results per class: [win %, units lost per fight]
const real = {
	'1-4 rogues, 1 wave': [100, 0.4], '1-4 rogues, 2 waves': [100, 2.4], '5-7 rogues, 1 wave': [100, 0.3],
	'5-7 rogues, 2 waves': [47, 4.8], 'none rogues, 1 wave': [100, 0.8], 'none rogues, 2 waves': [100, 1.8],
};
const classes = {};
const second = {};
for (const [name, ids, count, group] of fought) {
	for (const waveCount of [1, 2]) {
		const [win, dead] = stellar(ids, waveCount, [30630, 36000, 41325]);
		const key = group + ' rogues, ' + waveCount + (waveCount === 1 ? ' wave' : ' waves');
		const c = classes[key] = classes[key] || [0, 0, 0];
		c[0] += count * win;
		c[1] += count * dead;
		c[2] += count;
		if (waveCount === 2) second[name] = win;
	}
}
console.log('Stellar Age, attrition 135-180 — forecast | real (win %, units lost per fight)');
for (const key of Object.keys(real)) {
	const c = classes[key];
	console.log('  ' + key.padEnd(22) + (c[0] / c[2]).toFixed(0).padStart(4) + ' % ' + (c[1] / c[2]).toFixed(1).padStart(4)
		+ '   |' + String(real[key][0]).padStart(4) + ' % ' + real[key][1].toFixed(1).padStart(4));
	// the weak spot stays: few fast units with many rogues over two waves are forecast too well
	if (key !== '5-7 rogues, 2 waves') check(c[0] / c[2] >= 88, key + ': won in every real fight, forecast below 88 %');
}
console.log('  two waves by line-up: ' + fought.map(f => f[0] + ' ' + second[f[0]].toFixed(0) + ' %').join(', '));
// every loss on record was one or two fast units with 6-7 rogues; three heavy with five rogues won 4 of 4
check(second['3 heavy + 5 rogues'] > second['2 fast + 6 rogues'], 'heavy + rogues must rank above fast + rogues over two waves');
check(second['1 fast + 7 rogues'] < 60, '1 fast + 7 rogues over two waves lost in reality, forecast 60 % or more');

// 120 fights at attrition 96-115, enemy +10829 … +11500 %: champion + 2 fast + 5 rogues, all won
const weak = [CHAMPION, FAST, FAST].concat(rep(ROGUE, 5));
console.log('\nStellar Age, attrition 96-115, champion + 2 fast + 5 rogues — forecast | real (win %, units lost, hitpoints left)');
for (const [waveCount, realDead, realHp] of [[1, 0.04, 73.1], [2, 0.23, 70.3]]) {
	const [win, dead, hp] = stellar(weak, waveCount, [10829, 11500]);
	console.log('  ' + (waveCount + (waveCount === 1 ? ' wave' : ' waves')).padEnd(22) + win.toFixed(0).padStart(4) + ' % ' + dead.toFixed(2) + ' ' + hp.toFixed(1)
		+ '   | 100 % ' + realDead.toFixed(2) + ' ' + realHp.toFixed(1));
	check(win >= 99, 'weak enemy, ' + waveCount + ' wave(s): every real fight was won');
	check(Math.abs(dead - realDead) <= 0.15, 'weak enemy, ' + waveCount + ' wave(s): units lost off by more than 0.15');
}


/*
 * Space Age Mars, Guild Expedition, a player's report of 2026-11-18:
 * 6 Tesla Walkers + 2 rogues, then 4 Steel Wardens + 4 Space Marines, +2033 %.
 * 3 Steel Wardens + 5 rogues won with 2 units lost — the forecast then was 7 %.
 * 8 Steel Wardens won a similar encounter with 5 units lost. The player's own
 * boosts are not known: these reproduce the box he posted.
 */
const WARDEN = 'steel_warden', TESLA = 'tesla_walker', MARINE = 'space_marine';
const marsWaves = [wave(rep(TESLA, 6).concat(rep(ROGUE, 2)), 2033), wave(rep(WARDEN, 4).concat(rep(MARINE, 4)), 2033)];
const marsBoosts = [{ type: 'attack_boost', value: 2250 }, { type: 'attacker_defense_boost', value: 2100 }];
console.log('\nSpace Age Mars, two waves — forecast (win %, units lost when won)');
const mars = {};
for (const [wardens, rogues] of [[8, 0], [6, 2], [3, 5], [2, 6]]) {
	const entry = rate(marsWaves, rep(WARDEN, wardens).concat(rep(ROGUE, rogues)), marsBoosts, 20);
	mars[wardens] = entry;
	console.log('  ' + (wardens + ' wardens + ' + rogues + ' rogues').padEnd(22) + (100 * entry.win).toFixed(0).padStart(4) + ' % '
		+ (entry.deadWon === null ? '–' : entry.deadWon.toFixed(1)));
}
check(mars[3].win >= 0.6, 'Mars: 3 wardens + 5 rogues won in reality, forecast below 60 %');
check(mars[8].win >= 0.6, 'Mars: 8 wardens won in reality, forecast below 60 %');
check(mars[3].deadWon < mars[8].deadWon, 'Mars: 3 wardens + 5 rogues lost fewer units than 8 wardens in reality');

console.log(failed.length ? '\nFAILED\n  ' + failed.join('\n  ') : '\nall checks passed');
process.exit(failed.length ? 1 : 0);
