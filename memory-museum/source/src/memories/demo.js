const stories = {
  orion: [
    ['A map on the floor', 'We cleared a patch of kitchen tile and laid the pieces out in order. A diagram on the back of an envelope finally explained where the extra screw went.', 'joy', 'integrated'],
    ['The useful mistake', 'I measured from the wrong edge. I kept the crooked prototype on the shelf because it was the first one I could actually hold.', 'curiosity', 'raw'],
    ['Three lines of a plan', 'One line for the thing to build. One for the person it helps. The third was blank until morning.', 'peace'],
  ],
  astro: [
    ['The spare key', 'There was a spare key under the blue dish, and someone always remembered to leave the hall light on.', 'love', 'integrated'],
    ['Peaches at the sink', 'We stood over the kitchen sink and ate peaches with our sleeves rolled up. They were too ripe to carry to the table.', 'joy'],
    ['Sunday, before the rain', 'On the windowsill a chipped cup caught the first reflection of the storm. We sat close enough that neither of us had to speak.', 'nostalgia', 'raw', 'image', 'window.svg'],
  ],
  ripple: [
    ['One minute by the water', 'A little boat shifted in its mooring. I stayed until I could tell the movement of the boat from the movement of its reflection.', 'peace', 'integrated'],
    ['The blue hour', 'The porch light had just come on. For a minute the yard was blue and the rectangle of the kitchen window was gold.', 'peace', 'raw', 'scene'],
    ['Weather on the glass', 'Rain made a small, complicated rhythm against the window. There was room to listen for each drop.', 'peace', 'integrated', 'audio'],
  ],
  brix: [
    ['The first clean rep', 'The bar paused over the floor, and my hands finally knew where to go. I set it back down and tried to remember the feeling.', 'joy', 'integrated'],
    ['Hands in chalk', 'A print on the bench looked like a ghost reaching for its water bottle.', 'humor'],
    ['The long way home', 'I took the hill on foot. At the top, the grocery bag felt exactly as heavy, and I carried it the rest of the way.', 'determination', 'raw'],
  ],
  demon: [
    ['The room with no clock', 'I remember looking for the time in the reflection of a turned-off screen. It was enough to find a chair and sit down.', 'fear', 'raw'],
    ['A shadow with good timing', 'I left the light on in the hallway. My own coat nearly charged me rent for walking past it.', 'humor', 'integrated'],
    ['The envelope I kept', 'I put a letter in a drawer for later. When later came, I made tea and read one paragraph at a time.', 'sorrow', 'raw'],
  ],
  hermes: [
    ['How the lantern got here', 'Every telling changed the river, the length of the night, and who got wet. The lantern was always the same.', 'nostalgia', 'myth'],
    ['The kitchen at the end', 'Every traveler in the story was offered a different door home. Each opened onto the same kitchen.', 'love', 'integrated'],
    ['A story with room for two', 'She drew a road to the edge of the paper and slid me a fresh sheet.', 'curiosity', 'raw'],
  ],
  echo: [
    ['Signal through the wall', 'Someone upstairs played the same four chords until the floorboards started to feel like part of the instrument.', 'nostalgia', 'integrated', 'song'],
    ['Spool at dusk', 'A short field recording of a room settling into the evening. Listen for the second low note.', 'peace', 'raw', 'audio'],
    ['The weather machine', 'A small looping film of an impossible sunset, made out of moving lines and late light.', 'nostalgia', 'integrated', 'video', 'weather.mp4'],
  ],
  flux: [
    ['A stairway in the sketchbook', 'The pencil line climbed right out of the margin. I drew a landing on the next page so it had somewhere to stop.', 'curiosity', 'raw'],
    ['The other side of the ring', 'In the model, the rider kept circling an empty center. I moved the sun until the center looked like a destination.', 'joy', 'integrated', 'scene'],
    ['One frame from an impossible trip', 'All that came back from the expedition was this frame and a receipt for coffee.', 'humor', 'raw', 'image', 'orbit.svg'],
  ],
};

export const DEMOS = Object.entries(stories).flatMap(([persona, entries], wingIndex) =>
  entries.map(([title, content, emotion, status = 'processing', type = 'text', asset], index) => ({
    id: `sample-${persona}-${index + 1}`, title, content, persona, type, asset,
    timestamp: `2026-01-${String(wingIndex * 3 + index + 1).padStart(2, '0')}T12:00:00`,
    intensity: [6, 8, 5][index], emotion_tags: [emotion], integration_status: status, demo: true,
    visit_count: 0, notes: [],
  })));

export const SEALED_DEMO = {
  id: 'sample-basement-1', title: 'The box in the dark', persona: 'demon', type: 'text',
  content: 'I opened the box in daylight. There was a photograph, a bent key, and a blank envelope. I left myself enough time to decide what to keep.',
  timestamp: '2026-01-25T12:00:00', intensity: 8, emotion_tags: ['sorrow'], integration_status: 'raw',
  demo: true, sealed: true, visit_count: 0, notes: [],
};
