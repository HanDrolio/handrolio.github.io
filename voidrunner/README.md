# VOIDRUNNER 2.0

A no-build-step 3D runner for GitHub Pages with a neon cosmic-surfer aesthetic.

- **Renderer:** Three.js r170 loaded from a pinned CDN, with a second-CDN fallback
- **Visuals:** genuine perspective 3D tunnel and rotating obstacles, neon stars and sparks, original eight-frame hand-rendered 2D spaceship animation
- **Controls:** Backbone / standard gamepad left stick, A to launch, Start/Menu to pause, B to toggle audio; WASD/arrows; relative touch drag
- **Gameplay:** gradually increasing speed, pickups, three-hit shield, best score saved in localStorage
- **Music:** full user-supplied “Vibe 1 (Live a little)” recording, transcoded to AAC in an M4A container and split into 13 binary segments under audio/. Browser downloads and concatenates them into a playable Blob. Audio continues across game-over and pause screens and loops until muted. If Safari blocks a late-loaded track, the sound button becomes **♫ PLAY** for a one-tap retry. Optional music picker stores a replacement track locally in IndexedDB. Mute and volume are exposed on-screen.
- **Mobile:** device-safe landscape layout using 100dvh and safe-area insets; smaller menus and condensed HUD in short viewports.

## Development
Open through any static server over HTTP(S), including GitHub Pages. A network connection is needed for Three.js. The app doesn't need any build tools, API keys, or backend.

## QA
Syntax checked with Node 22. UI bounding rectangles checked in headless Chromium at 844×390, 1800×832, and 390×844. Simulated DOM/game loop tests covered launch, keyboard movement, pause, resume. Audio Git SHA-1 matched every chunk of the converted file, and all chunks reconstructed the exact M4A bytes. Real iOS / Backbone hardware and public Pages render should be verified manually.
