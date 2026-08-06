# Negotiation solver tooling

The negotiation helper plays with a hybrid strategy:

- **Opening book** (`js/web/negotiation/tables/book.json`): the first one or
  two moves per configuration (tries 3–5, 2–10 goods), distilled from the
  legacy solution tables. Only nodes whose state is too large for a fast
  live search are stored; win chances and expected consumption are
  recomputed for the hybrid strategy.
- **Live solver** (`js/web/negotiation/js/parts/solver.js`): once the number
  of still-consistent demand assignments is small (≤ a few hundred, usually
  from round 2–3 on), the module computes the provably optimal move at
  runtime via exact expectimax search. The same happens after user
  deviations that the book cannot absorb, with more than 5 tries, or with
  more than 10 goods (heuristic opening, exact play once the state is small).

## Validation

```
node tools/negotiation/validate.js
```

Recomputes the exact win probability of every book node (book move plus
solver play below every distillation cut) and compares it with the stored
chance. Run this after any change to the solver or the book. It finishes in
about 10 seconds and must report `all consistent`.

## Regenerating the book

The legacy tables (27 zips, ~2.7 MB, removed from the working tree) are
still available in git history:

```
git show d68e450a6:js/web/negotiation/tables/5_10.zip > 5_10.zip   # etc.
```

Unzip all `T_N.zip` into one directory (each contains `T_N.json`), then:

```
node tools/negotiation/distill.js <dir-with-T_N.json>
node tools/negotiation/validate.js
```

The keep thresholds in `distill.js` (`BIG_STATE`, `HARD_SEARCH_STATE`)
mirror the live hand-over limit (`Negotiation.LIVE_LIMIT`): everything the
distiller cuts must be fast enough for the live search.
