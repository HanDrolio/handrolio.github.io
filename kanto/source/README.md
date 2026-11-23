# KANTO / Champion Loop

A touchscreen Pokémon battle game: six uniformly random original-151 Pokémon against Champion Blue's fixed six, all at level 100. Animated original Emerald front sprites, FireRed/LeafGreen back sprites, custom move animations, and a responsive GBA shell for portrait and landscape. A walkable summit and classic green party screen follow the supplied reference video.

## Battle rules

The actual Pokémon Showdown simulator runs locally in a Web Worker through `@pkmn/sim`. The custom format inherits Gen 9 **Standard National Dex** with Species Clause, Sleep Clause, and Terastal Clause. Only the 151 original base species are generated. No Mega, Z-Move, Dynamax, or Tera actions are exposed. There are no bag items or account/server dependencies.

`src/sets.js` contains 151 individually curated, validator-checked sets, including items, abilities, natures, and legal 508-EV spreads. Legendary and unevolved Pokémon are equally eligible. This deliberately makes some random teams harder than others.

Blue always starts with Pidgeot and retains the same six sets: Pidgeot, Alakazam, Rhydon, Exeggutor, Arcanine, and Blastoise. His AI ranks damage, setup, healing, hazards, statuses, and switches, then searches a turn against three plausible replies. The search uses independently seeded simulations and cannot inspect the submitted human action. Both parties have open team sheets.

## Local development

```sh
npm ci
python scripts/download-assets.py   # Only needed if sprite/font assets are missing.
python scripts/download-animation-assets.py
npm run build
npm test
```

The deployable app is `dist/`. The managed Sites preview serves that directory; no application server is required. The committed hosting manifest identifies the Site.

Important: preserve `keepNames: true` when bundling the simulator. Its state serializer uses constructor names to resolve references. The test suite includes the optimized browser bundle to catch regressions. Each AI branch deserializes a JSON **string**, isolating its logs and sets from the live battle.

## Calmer animation

Party cards, the switch menu, and the Pokédex use static original sprites. In battle, front sprites keep their original frames with a 2.6-second idle pause and slower playback. The build creates `dist/assets/calm/` from the original APNGs by changing timing metadata only. Attack lunges, hit recoil, field shake, and entry bounce are smaller. The browser’s reduced-motion preference uses static battle sprites too.

## Controls

Before battle, use the D-pad to walk to Blue and A to talk. START opens the classic party screen: drag any Pokémon onto another to swap slots, tap to choose a lead, or reorder with Alt + arrow keys. FIGHT BLUE also walks up and starts the fight. During battle, tap a move or use D-pad plus A. B toggles Fight/Pokémon, and SELECT opens the battle record. Tap a party member or either HP panel to inspect a set; the screen header opens Blue's whole team.

Keyboard: arrows, Z/Enter (A), X/Escape (B), Space (START), L (SELECT). Standard gamepads use A/B, D-pad or left stick, Start, and Select. Physical iPhone/Backbone input still needs on-device verification.

Battle state and records are saved in browser local storage. Every page load deals a fresh six; RESUME LAST BATTLE explicitly returns to an unfinished fight at its last committed turn. Previewing or rerolling a new team preserves that resume option until another battle starts. Rerolls are free before battle, including the ⤨ button in the handheld toolbar. A forfeit resets the streak. Audio is optional and generated locally with Web Audio.

## Verification

- All 151 sets checked by Showdown's National Dex validator.
- Random team uniqueness and eligibility coverage.
- Lead selection, PP, status, held-item behavior, AI legality and isolation.
- Ten complete AI-driven matches with pivots, faints, forced switches, and rematches.
- Save/resume using both source and optimized browser engines.
- Browser QA at desktop, 390×844 portrait, 375×667 portrait, and 844×390 landscape.
- Touch-control equivalents tested through visible D-pad, A/B, and move buttons.

## Credits

Pokémon characters, names, and original sprite artwork belong to Nintendo, Game Freak, and The Pokémon Company. This is an unaffiliated fan project. Sprites: [PokéAPI/sprites](https://github.com/PokeAPI/sprites), Blue's trainer sprite: Pokémon Showdown. Engine: [pkmn/ps](https://github.com/pkmn/ps), derived from the MIT-licensed [Pokémon Showdown](https://github.com/smogon/pokemon-showdown). Included notices are in `dist/licenses/`. Fonts: Silkscreen (Jason Kottke), Space Grotesk (Florian Karsten), SIL Open Font License. UI and move effects are custom.
