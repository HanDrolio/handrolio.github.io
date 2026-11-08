# The Memory Museum

A first-person COSM.OS archive. Visit the central Rotunda and eight persona galleries. Climb the brass-marked route near the rear of the Rotunda to reach the roof Garden. After seven entries into the Shadow Wing, look for the sealed Basement door at the back of its second gallery. Some daily seeds open it earlier.

## Play

- Keyboard and mouse use WASD to move, Shift to sprint, Space to jump, Ctrl to slide, E to interact, J for the Notebook, and Esc to pause. Hold Q and select a persona with the arrow keys.
- Backbone and other standard gamepads use the left and right sticks. RT sprints, LT jumps, LB slides, RB opens the persona wheel, A interacts, B goes back, X crouches, and Y opens the Notebook.
- Touch uses the on-screen left stick and buttons. Drag on the scene to look. The pause menu offers touch visibility, look sensitivity, volume, and reduced motion.
- Hold E, A, or the exhibit’s hold button for three seconds to integrate it. Hermes can make a story exhibit from an integrated memory.

## Daily halls

The day turns over at 4:44 AM in the device’s local time zone. Wing entrances stay fixed. Gallery dimensions, room offsets, the location of exhibits, and the lighting change with the four-glyph seed. Each seed places roughly a fifth of the available entries in a different wing from their usual home. A seed link reconstructs the architecture and exhibit placement for the same active archive. Sealed access from visits belongs to the local archive.

The Notebook accepts TXT, Markdown, JSON, JSONL, and ChatGPT conversation exports. Up to three new exhibits are released per day. Queued entries are readable in the Notebook. To attach image, audio, or video files, choose an exhibit type under New entry. The published COSM.OS archive includes 40 exhibits in nine collections. The Notebook’s Collections tab lists each collection and its original summary. The archive is served with the game. Visitor-created memories, media, integration status, and notes are stored in IndexedDB. The game has no memory-upload endpoint. A service worker caches the game and its sample media after the first online load.

## Develop

From the source directory, run `npm ci`, then `npm run dev`. Run `npm test` for the seed, release schedule, and movement checks. `npm run build` emits the GitHub Pages version in `dist/`, including its generated offline cache manifest. Publish the contents of that directory under `/memory-museum/` with their directory structure intact.

The game uses Three.js and original synthesized sound. Browsers with WebGL 2 use the hardware renderer. The Canvas software fallback runs the same world with simplified lighting at a lower refresh rate.
