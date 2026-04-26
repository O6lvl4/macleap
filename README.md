# macleap

Detect your current Mac, find equal-or-better current models on sale, and estimate the real upgrade cost after trade-in.

## Status

Early scaffold. Hardware detection works; current-lineup lookup and trade-in pricing are next.

## Quickstart

```sh
npm install
npm run dev
```

Outputs the detected Mac specs (model, chip, memory, storage, display, serial).

## Roadmap

- [x] Detect current Mac via `system_profiler`
- [ ] Look up current Apple Mac lineup and prices (Apple Store JP)
- [ ] Suggest equal-or-better current models within a budget
- [ ] Look up trade-in value (Apple Trade In + 3rd-party buyback sites)
- [ ] Report net upgrade cost

## License

MIT
