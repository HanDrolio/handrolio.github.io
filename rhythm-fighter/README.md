# COSM.OS Rhythm Fighter: The Beatdown (Playable v1.0)

Standalone static-browser rhythm fighting game at `/rhythm-fighter/`. No backend or npm dependencies needed for the game.

## PlayStation mappings

Four scrolling single-note lanes, top-to-bottom:
- △ **Triangle** = high/lead note, ultimate when meter >=85
- □ **Square** = synth/mid-high note, EX special when meter >=45
- ○ **Circle** = snare/mid-low note, guard break when meter >=35
- ✕ **Cross** = kick/low note, jab

Gamepad Standard Mapping indices: Cross=0, Circle=1, Square=2, Triangle=3, OPTIONS/START=9.
Keyboard D/F/J/K correspond to Cross/Circle/Square/Triangle. Escape or Space pauses. Touch has a four-button overlay. If the controller has nonstandard mapping, the browser may report different button indices.

Notes travel **right to left**, crossing the yellow hit line. Perfect ±25 ms, Great ±50 ms, Good ±80 ms, then a miss. Hold notes require continuous press. Adjust audio input calibration for screen/headphone latency.

## Features

- Actual local audio FFT analysis via Web Audio decoded data; tempo estimate, four spectral bands, onset feature detection; note chart deterministic from song, persona and difficulty.
- Three **original** built-in demo songs synthesized as WAV at runtime, no external media request.
- Browser-local multiple-file playlist upload (first file for round 1; subsequent files cycle in Arcade/Survival).
- Eight playable personas, all unique mechanics, seven procedurally animated audio-reactive stages.
- Four modes: 8-round Arcade, Endless Survival rounds, Practice (50–100% playback), local hot-seat Versus (two consecutive player rounds), plus seeded 4:44 Daily Challenge.
- Three passive glyphs, high-score and Daily record persistence via localStorage. This release does **not** write into the Memory Museum's IndexedDB archive.
- 60 fps target with canvas drawing capped at 1.7 pixel density. Actual frame-rate and latency are not guaranteed until measured on target phones and controllers.
- Service worker caches the static game shell on first visit for offline use. User audio files aren't persisted/cached.
- Spotify, Suno API, YouTube and microphone integrations are not enabled in v1. Hosted authenticated SDKs, live audio routing, and streaming permissions require additional work. Spotify and YouTube cannot be directly analyzed as raw PCM via this static website. Global rankings and online Versus require a server. Current Versus is local **turn-based**, not simultaneous.

## Test

Run `npm test` and `npm run check` from `rhythm-fighter`. Open `index.html` using a local web server (e.g. `python -m http.server` in repo root), or deploy on GitHub Pages.

## Privacy

Audio is decoded and played in the browser only. The built-in music is original generated audio. No uploads to a server, no external fonts, and no telemetry.
