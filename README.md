# macleap

Detect your current Mac, find equal-or-better current models on sale, and estimate the real upgrade cost after trade-in.

## Status

- [x] Detect current Mac via `system_profiler`
- [x] Match against current Mac lineup (manual JSON, JP prices)
- [x] Estimate trade-in value (depreciation model from original retail)
- [x] `plan` subcommand: net upgrade cost in one shot
- [ ] Live trade-in lookup (Apple Trade In + 3rd-party buyback)

## Quickstart

```sh
npm install

# Show current Mac specs
npx tsx src/index.ts

# Plan the upgrade: equal-or-better models with net cost after trade-in
npx tsx src/index.ts plan --budget 400000
```

### Example

```
$ npx tsx src/index.ts plan --budget 400000
=== Current Mac ===
MacBook Pro 14" / M3 / 24GB / 512GB
Original retail: ¥308,800

=== Estimated trade-in value (condition: asNew) ===
  Apple Trade In         ¥150,000
  Private (median)       ¥170,000
  Private (best)         ¥200,000

=== Equal-or-better current models (within ¥400,000), with net upgrade cost ===
 1. MacBook Air 15" M5      24GB / 1TB    ¥279,800   net    ¥79,800
 2. MacBook Pro 14" M5      24GB / 1TB    ¥308,800   net   ¥108,800
 3. MacBook Pro 14" M5 Pro  24GB / 1TB    ¥369,800   net   ¥169,800
 4. MacBook Pro 14" M5 Pro  24GB / 1TB    ¥399,800   net   ¥199,800

Net cost assumes best trade-in: Private (best) (¥200,000).
```

## Commands

```
macleap [detect]                 Show current Mac specs
macleap suggest [options]        Suggest equal-or-better current models
macleap tradein [options]        Estimate trade-in value for current Mac
macleap plan [options]           Combined: suggestions with net upgrade cost

Options:
  -b, --budget <yen>             Maximum price (e.g. 400000)
  -c, --condition <asNew|good|fair>   Condition of current Mac (default: asNew)
  --allow-smaller-screen         Allow smaller screens
  --limit <n>                    Limit results (default: 10)
  --all                          Show all matches
```

## Data

- [`data/lineup.json`](./data/lineup.json) — current Mac lineup (price, configs).
- [`data/historical.json`](./data/historical.json) — past Macs with original retail prices.
- [`data/tradein-model.json`](./data/tradein-model.json) — depreciation rates and channel/condition multipliers.

Update on Apple announcements. Trade-in estimates calibrated against Apple Trade In + Iosys / Amemoba listings (2026-04).

## License

MIT
