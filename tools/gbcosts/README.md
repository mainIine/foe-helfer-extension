# Great building costs and patron rewards (prestige rework)

Since the prestige rework (copper / gold tiers) the helper calculates the FP
costs and the patron rewards of every great building level itself
(`GreatBuildings.GetReworkCosts`, `GetReworkRewards` in
`js/web/greatbuildings/js/greatbuildings.js`):

- **Costs** are piecewise linear. The metadata holds the first ten levels, from
  then on every segment adds a fixed step per level (`GreatBuildings.ReworkSteps`:
  levels 10-39, 40-69, 70-99, 100-300 and, for gold buildings, 301-400 and 401+).
  Level 100 starts 5% above level 99.
  The Shattered Horizon Siphon is the exception (`GreatBuildings.ReworkLinear`,
  `GetReworkLinearCosts`): every level adds the costs of the first level, levels
  100 and 200 cost one and a half steps extra and the curve continues one step
  lower behind each of them. Measured on live (2026-11-05); the result does not
  match the total InnoGames announced for it, so it may still change.
- **Rewards**: the patrons share a fixed percentage of the level costs
  (`GreatBuildings.ReworkShares`, by the level the level-up reaches). Place n gets
  1/n! of the first place; five places in the copper tier, seven as soon as the
  level-up reaches a gold tier level. Rewards of 1 and 3 FP become 2 and 4.

- **Bonus values** (`GreatBuildings.MetaBonusValue`): the metadata only lists a few
  level breakpoints per tier bonus. In between every bonus follows the same curve
  `a + b * (1 - e^(-k * x^1.2))`, k = `GreatBuildings.BonusCurve`, x = progress within
  the tier (copper: level / 200, gold: (level - 100) / 400). a and b are fitted to
  the breakpoints; their values are rounded, so the result can be off by one.

## Validation

```
node tools/gbcosts/validate.js
```

Checks the cost curve against the totals InnoGames announced for level 200 / 500,
against level costs measured in the game, the reward formula against measured
patron rewards and the bonus curve against measured bonus values. Run it after any change to the tables or formulas, it must report
`all consistent`.

## New or rebalanced buildings

The steps were measured on beta (2026-11-05): the great building ranking of the
game lists the costs of the current level of every building, and the level
ranking of a building (`getConstructionRanking`) delivers the patron rewards of
any level, from which the costs follow. The bonus curve comes from the placed
bonuses of about 600 buildings on different levels (`getOtherPlayerCityMapEntity`). A building without steps or with costs contradicting the table at runtime
(`GreatBuildings.VerifyReworkCosts`) gets no calculated values.
