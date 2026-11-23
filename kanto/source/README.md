# KANTO / Gym Circuit

A four-fight fan-made Pokémon browser game for iPhone and desktop. Defeat **Brock (Lv14)**, **Misty (Lv21)** and **Lt. Surge (Lv24)**, then challenge **Champion Blue (Lv63)**.

## The run

- Keep the same six Pokémon through all four fights. Your six match each opponent's ace level, heal between wins, and evolve along their Kanto evolution families. This is a Nuzlocke-inspired level-cap progression, **not** permadeath.
- Gym AI improves with each badge. Blue uses an original **fixed** team: Pidgeot, Alakazam, Rhydon, Exeggutor, Arcanine and Blastoise.
- Fights use the local Pokémon Showdown-based `@pkmn/sim` engine, including EVs, held items, switches, statuses, hazards, and other legal battle mechanics.
- The battle log is **manual advance**. After animations and narrated events, tap/click anywhere in the handheld console, press A (physical/touch gamepad), Enter, Space, Z or X to continue. Every message requires a new acknowledgment. No auto-skipped attack text.
- Trainer VS introductions persist until acknowledged and feature local handcrafted pixel-art portraits for Brock, Misty, Surge, and Blue. Each gym has its own pixel-tile battle arena.
- The `SPRITES ON` button overrides the browser's reduced-motion preference for animated opponent sprites, including on iOS. Back sprites remain static.

## Build / tests

From `kanto/source` with Node.js 22 and Python 3:

```sh
npm ci
python scripts/download-assets.py
python scripts/download-animation-assets.py
npm test
npm run build
node scripts/export-pages.mjs ..
```

The game is standalone at `/kanto/` on GitHub Pages, with no account, external battle server, or backend. The `build-kanto.yml` GitHub Actions workflow tests, builds, verifies trainer assets, and commits the release.

## Development layout

- `src/circuit.js`: gym levels, stage roster, fixed Champion team, evolving player roster.
- `src/engine.js`: battle engine and tiered AI.
- `src/dialogue-gate.js`: manual acknowledgment promise gate, separately unit-tested.
- `src/app.js` / `src/battle-effects.js`: input handling, battle-event timeline, trainer intro.
- `src/trainers/*.svg`: original locally stored pixel-art trainer portraits.
- `tests/*.test.mjs`: battle, progression, input-gate, worker and bundle tests.

## Credits / limitations

Pokémon IP and original game sprites belong to Nintendo, Game Freak and The Pokémon Company. Unaffiliated fan project. Battle simulator from `@pkmn/sim` / Pokémon Showdown, originally licensed under MIT. Original back/front Pokémon sprite sources from PokéAPI. Included third-party license notices are in the release. Game code, new trainer art and stage backgrounds are custom.

Portrait rendering and touch behavior need real-device verification on Safari/iPhone in addition to automated build checks.
