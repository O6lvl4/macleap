# macleap

Detect your current Mac, find equal-or-better current models on sale, and estimate the real upgrade cost after trade-in.

## Status

- [x] Detect current Mac via `system_profiler`
- [x] Match against current Mac lineup (manual JSON, JP prices)
- [x] `suggest` with budget and screen-size constraints
- [ ] Trade-in value lookup (Apple Trade In + 3rd-party buyback)
- [ ] Net upgrade cost report

## Quickstart

```sh
npm install

# Show current Mac specs
npm run dev

# Suggest equal-or-better current models within a budget
npx tsx src/index.ts suggest --budget 400000
```

### Example

```
$ npx tsx src/index.ts suggest --budget 400000
=== Current Mac ===
MacBook Pro 14" / M3 / 24GB / 512GB

=== Equal-or-better current models (within ¥400,000) ===
(lineup data updated 2026-04-26)

 1. MacBook Air 15" M5                 24GB / 1TB         ¥279,800
    [chip M5 > M3, +512GB storage, +1" screen]
 2. MacBook Pro 14" M5                 24GB / 1TB         ¥308,800
    [chip M5 > M3, +512GB storage]
 3. MacBook Pro 14" M5 Pro             24GB / 1TB         ¥369,800
    [chip M5 Pro > M3, +512GB storage]
```

## Commands

```
macleap [detect]                  Show current Mac specs
macleap suggest [options]         Suggest equal-or-better current models
  -b, --budget <yen>              Maximum price (e.g. 400000)
  --allow-smaller-screen          Allow smaller screen sizes in suggestions
  --limit <n>                     Limit number of results (default: 10)
  --all                           Show all matches, no limit
```

## Data

Current Mac lineup (price, configurations) is maintained as JSON in
[`data/lineup.json`](./data/lineup.json) — update on Apple announcements.

## License

MIT
