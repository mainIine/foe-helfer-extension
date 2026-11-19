# Army suggestion

The army suggestion (`js/web/battle-assist/js/parts/lineup.js`) plays every
candidate line-up a few hundred times against the previewed waves in a small
simulation without a map. The damage per hit is solid; which unit the enemy
hits is not known and is modelled:

- **Who stands in front is hit first.** Every unit has a depth that grows by
  its movement with each of its turns, up to where its range reaches. A unit
  loses `EXPOSE` of its draw per hex it stands behind the foremost one of its
  army. Fast units with a short range fly ahead and take the first volley,
  slow units with a long range stay level with the rogues.
- **Untouched rogues** draw `ROGUE_DRAW` times the hits of a real unit standing
  level with them — except from artillery, which reaches everybody anyway.
- **Hurt units** draw more (`FOCUS`).

## Checking a change

```bash
node tools/lineup/validate.js
```

plays line-ups that were really fought and prints the forecast next to what
happened:

| Data | What it pins down |
|---|---|
| Stellar Age, Guild Battlegrounds, attrition 135-180 (174 fights, 10 lost) | win rate and units lost per class: rogues none / 1-4 / 5-7, one or two waves; every loss was one or two fast units with 6-7 rogues in a two-wave battle |
| Stellar Age, attrition 96-115 (120 fights, all won) | units lost and hitpoints left of champion + 2 fast + 5 rogues |
| Space Age Mars, Guild Expedition (two fights of a player's report) | 3 heavy + 5 rogues win a two-wave battle with fewer losses than 8 heavy |

The enemy armies of the recordings are not kept: the two that were noted down
are used, the rest are seeded random mixes of the same era. The numbers are a
reconstruction, not a replay — the checks are loose on purpose.

Known weak spot: one or two fast units with 6-7 rogues over two waves are still
forecast too well (72 % for the class, 47 % real).

`unit-types.json` holds the unit types of the two eras (`Unit.Types` of the
game, without names). A new era in the checks needs its types added there.
