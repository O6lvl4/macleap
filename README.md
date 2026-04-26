# macleap

Detect your Mac, find equal-or-better current models on sale, and estimate the real upgrade cost after trade-in.

JP-only data for now (prices in JPY, calibrated against Apple Japan + local buyback sites).
The internal architecture is region-parameterized from the ground up — adding a new region
is a JSON-only change, no code edits required. See [docs/architecture.md](./docs/architecture.md).

## Status

- [x] Detect current Mac via `system_profiler`
- [x] Match against current Mac lineup (`data/regions/<region>/lineup.json`)
- [x] Estimate trade-in value via depreciation model
- [x] `plan` subcommand: net upgrade cost in one shot
- [x] Color output, tables, spinners, `--json` mode
- [x] Weekly GitHub Action that scans Apple Newsroom and opens an issue when new Mac models are announced
- [ ] Live trade-in lookup (Apple Trade In + 3rd-party buyback)

## Quickstart

```sh
npm install
npx tsx src/index.ts plan --budget 400000
```

Or once published:

```sh
npx macleap plan --budget 400000
```

## Commands

```
macleap [detect]                 Show current Mac specs (default)
macleap suggest [options]        Suggest equal-or-better current models
macleap tradein [options]        Estimate trade-in value for current Mac
macleap plan [options]           Combined: suggest + trade-in with net upgrade cost

Options:
  -b, --budget <amount>          Maximum price (in region currency, e.g. 400000)
  -c, --condition <state>        Condition: asNew | good | fair (default: asNew)
  --region <code>                Market region (default: jp)
  --allow-smaller-screen         Allow smaller screens in suggestions
  --limit <n>                    Limit results (default: 10)
  --all                          Show all matches
  --json                         Output machine-readable JSON
  -v, --version                  Show version
  -h, --help                     Show help
```

Honors `NO_COLOR` and non-TTY environments automatically.

## Example

```
$ macleap plan -b 400000

Current Mac
  Model      MacBook Pro (Mac15,3)
  Chip       Apple M3
  Memory     24 GB
  Storage    460 GB

Trade-in estimate (condition: asNew)
Matched MacBook Pro 14" M3 / 24GB / 512GB (2023/11, retail ¥308,800)
┌──────────────────────┬──────────────┐
│ Channel              │ Estimate     │
├──────────────────────┼──────────────┤
│ Apple Trade In       │    ¥150,000  │
│ Private (median)     │    ¥170,000  │
│ Private (best)       │    ¥200,000  │
└──────────────────────┴──────────────┘

Equal-or-better current models — net upgrade cost (within ¥400,000)
┌────┬──────────────────────────┬──────────────┬───────────┬───────────┐
│ #  │ Model                    │ Config       │ Price     │ Net       │
├────┼──────────────────────────┼──────────────┼───────────┼───────────┤
│ 1  │ MacBook Air 15" M5       │ 24GB / 1TB   │ ¥279,800  │  ¥79,800  │
│ 2  │ MacBook Pro 14" M5       │ 24GB / 1TB   │ ¥308,800  │ ¥108,800  │
│ 3  │ MacBook Pro 14" M5 Pro   │ 24GB / 1TB   │ ¥369,800  │ ¥169,800  │
│ 4  │ MacBook Pro 14" M5 Pro   │ 24GB / 1TB   │ ¥399,800  │ ¥199,800  │
└────┴──────────────────────────┴──────────────┴───────────┴───────────┘
```

## Data

Data is split per region under `data/regions/<region-code>/`:

- `lineup.json` — current Mac lineup (price, configs)
- `historical.json` — past Macs with original retail prices
- `tradein-model.json` — depreciation rates and channel/condition multipliers

Currently shipped: `jp` ([data/regions/jp/](./data/regions/jp/)).

Update on Apple announcements. Trade-in estimates calibrated against Apple Trade In + Iosys / Amemoba listings (2026-04).

### Stale-data monitor

A weekly GitHub Action ([`.github/workflows/check-lineup.yml`](.github/workflows/check-lineup.yml)) scans the
Apple Japan Newsroom Atom feed for Mac-related announcements published after
`data/regions/jp/lineup.json#updatedAt`, and opens a deduplicated issue for each one — your cue to refresh
the data files.

Run the same scan locally:

```sh
npm run check-lineup
```

## Architecture

Hexagonal: `domain` (pure) ← `application` (use cases + ports) ← `infrastructure` (adapters)
and `presentation` (CLI). Layer boundaries enforced by `dependency-cruiser` (`npm run lint:arch`).
Domain is pure, region-parameterized, and unit-tested with Vitest.

![Architecture overview](./docs/diagrams/architecture.png)

See [docs/architecture.md](./docs/architecture.md) for the full layout, the `plan` command
sequence diagram, and how to add a new region.

## Development

```sh
npm test           # Vitest (domain + application unit tests)
npm run typecheck  # tsc --noEmit
npm run lint:arch  # dependency-cruiser layer enforcement
npm run build      # tsc emit to dist/
```

## License

MIT
