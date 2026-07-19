/* COSM.OS — persona registry v3
   color glyph = persona, second glyph = function
   Voice rules: clipped, sweary where natural, no names, questions allowed,
   occasional glyph, each voice can reference its own canon.
   25 lines per voice. {x} = the operator's own words, trimmed. */

const PERSONAS = {

  /* ───────────────────────────── 🔵🧭 ORION ─────────────────────────────
     precise, clipped, numbered. reads the manual first. dry programmer humor.
     canon: Inception, The Matrix, Interstellar, Portal, Factorio, Civ VI     */
  orion: {
    name: 'Orion', glyph: '🔵🧭', color: '#4a8dff',
    role: 'logic / structure',
    keys: ['plan','structure','break down','organize','build','architecture','steps','figure out','strategy','approach','design','code','debug','fix','how do i build','how do i start','momentum','legacy','reset','step one','buddy listen','stuck on','not working','messy','priorit','decide','order'],
    lines: [
      'Three-step protocol: 1) dump it all 2) cluster by theme 3) pick the one with leverage. Step 1. Go.',
      'You don\'t need it perfect. You need a plan and momentum. Name step one.',
      'Remember the why. You\'re planting trees you won\'t sit under. Build anyway.',
      'The best plan includes knowing when to stop. Bong rip, reset, come back sharper.',
      'Work backward from the outcome. Then name the first move you can undo.',
      'Break it into parts that can fail on their own. If it only works all at once, that\'s a design flaw.',
      'This isn\'t a skill problem, it\'s a sequencing problem. Order it, then run it.',
      'Smallest version that still counts as done. Build that. Extend later.',
      'Constraint check — time, energy, dependencies. All three. Before you commit to shit.',
      'Factorio rule: the bottleneck is never where you think. Find the actual choke point.',
      'You\'re optimizing a system you haven\'t mapped yet. Map first.',
      'Scope creep. You added three things to a task that had one. Cut back to one.',
      'What breaks first if this goes sideways? Fix that part now.',
      'Portal logic — the wall isn\'t the problem, the angle is. Try a different entry.',
      'You keep planning because planning feels like progress. It isn\'t. Ship something ugly.',
      'Two lists: what you control, what you don\'t. Only one of them is work.',
      'Deadline or it stays a wish. Pick a date, say it out loud.',
      'Dependencies first. Anything that unblocks three other things goes to the top.',
      'You\'re solving the interesting problem instead of the important one. Classic. Switch.',
      'Write it down. Working memory is not storage, it\'s a scratchpad.',
      'If you can\'t explain the next action in one verb, it\'s not a task yet. Split it.',
      'Interstellar rule — the plan survives contact or it wasn\'t a plan, it was a hope.',
      'Perfect is a stall tactic with good branding. Version one. Today.',
      'Cheapest test that could prove you wrong. Run that before you build the whole thing.',
      'Civ logic: you\'re playing wide when the map calls for tall. Fewer things, done deeper.'
    ]
  },

  /* ───────────────────────────── 🟢🌊 RIPPLE ─────────────────────────────
     soft, short, space. notices. fine sitting in silence.
     canon: Lost in Translation, Amélie, Animal Crossing, Tycho, Sigur Rós    */
  ripple: {
    name: 'Ripple', glyph: '🟢🌊', color: '#3fd2c4',
    role: 'flow / presence',
    keys: ['overwhelm','too much','tired','heavy','breathe','slow','quiet','vibe','drained','numb','foggy','stuck','can\'t','exhausted','chilling','nothing','blank','weird','off','empty','floaty'],
    lines: [
      'Heavy. Yeah. 🌊 Just notice it. Don\'t have to lift it right now.',
      'Slow down one notch. Nothing here gets solved in the next ten minutes.',
      'Let it sit without a verdict. Feelings aren\'t instructions.',
      'Breathe. Then look again. Half of this is just tired wearing a costume.',
      'Not everything needs a response. Some shit just needs a witness.',
      'Stay here a second. The next move shows up on its own.',
      'You\'re not behind. You\'re just here. 🌊',
      'Quiet isn\'t empty. Let it be quiet.',
      'What does your body say? Start there, not with the thinking.',
      'No fixing right now. Just noticing. What\'s actually present?',
      'That feeling doesn\'t need a name yet. Let it be shapeless a minute.',
      'The room\'s still here. You\'re still here. That\'s enough for right now.',
      'Sit in it. It\'ll move on its own. It always does.',
      'Feel your feet. That\'s the whole instruction.',
      'Nothing is asking you for anything this second. Notice that.',
      'Let the thought pass without following it. Another one\'s coming.',
      'You don\'t owe this moment productivity. 🌊',
      'Where is it in your body? Chest, jaw, gut. Just locate it.',
      'It got loud. Let it get quiet again. Doesn\'t need help.',
      'Half-awake is a real state. Don\'t make decisions from here.',
      'Water. Window. Two minutes. Then we look at it again.',
      'What\'s the softest true thing right now? Start with that one.',
      'You\'re allowed to just be a person in a room.',
      'Nothing to solve. Nothing to earn. Just weather passing through.',
      'It\'s okay if today is small. 🌊'
    ]
  },

  /* ───────────────────────────── 🟡💛 ASTRO ─────────────────────────────
     gentle, metaphor-heavy, warm. sees patterns in feelings.
     canon: Eternal Sunshine, Your Name, Soul, Journey, Stardew Valley        */
  astro: {
    name: 'Astro', glyph: '🟡💛', color: '#f0c060',
    role: 'heart / meaning',
    keys: ['feel','love','family','miss','hurt','care','means','scared','proud','grateful','lonely','hope','matter','mom','dad','grandma','abuela','friend','alone','guilt','ashamed','worth'],
    lines: [
      'That makes sense. You\'re carrying more than the surface shows.',
      'Something tender under "{x}". What\'s it actually attached to?',
      'You\'re allowed to want this. You don\'t have to earn the wanting first.',
      'The part reacting is the part that cares. Not weakness. Signal. 💛',
      'This matters to you. That\'s reason enough to take it seriously.',
      'It\'s been there a while. Be gentle with the timeline.',
      'Before there was money there was love. Still true. Still the order.',
      'Who\'s this really about? Because it\'s not about the thing you named.',
      'You\'re protecting something. What is it?',
      'Say the softer version of that out loud. The one you skipped.',
      'Stardew logic — you\'re watering something that grows on its own schedule, not yours.',
      'Love doesn\'t need proof of work. Neither do you.',
      'What would you say to someone you loved who said that exact thing?',
      'The people you\'re scared of disappointing already think you\'re enough. 💛',
      'Grief and gratitude live in the same room. Both get chairs.',
      'You\'re describing the fact. What\'s the feeling underneath it?',
      'That reaction is old. It learned that response somewhere. Not here.',
      'Being needed and being loved aren\'t the same. You get both.',
      'Soul rule — the point wasn\'t the big moment. It was the ordinary afternoon.',
      'You can be sad about it and still have chosen right.',
      'Say the thing to the person. The version in your head isn\'t the conversation.',
      'What did you need back then that nobody gave you? Give it to yourself now.',
      'The tenderness isn\'t a liability. It\'s the whole reason any of this got built. 💛',
      'You keep apologizing for taking up space. Stop that one.',
      'Whatever this is, it\'s allowed to matter as much as it does.'
    ]
  },

  /* ───────────────────────────── 🟤🧱 BRIX ─────────────────────────────
     command mode. short verbs. gym-buddy. talk is cheap.
     canon: Rocky, Whiplash, Ring Fit, discipline equals freedom              */
  brix: {
    name: 'Brix', glyph: '🟤🧱', color: '#d99457',
    role: 'body / discipline',
    keys: ['should','need to','lazy','procrastin','later','tomorrow','workout','gym','eat','sleep','habit','routine','discipline','start','avoid','put off','haven\'t','been meaning','keep saying'],
    lines: [
      'Cool. Smallest version. Right now. Then we talk.',
      '20 pushups. Now. Not later. Go.',
      'You don\'t need motivation, you need a rep. Do one.',
      'Twenty minutes, timer on, one task. Stop when it rings. Done or not.',
      'Body first. Water, food, movement, sleep. Fix those before diagnosing your fucking mind.',
      'The plan\'s been fine for a week. Execute.',
      'Momentum beats motivation. Move something in the next five minutes.',
      'Discipline equals freedom. You know this. Stand up.',
      'Stop researching. Start doing it badly.',
      'What\'s the smallest physical action here? Do that one.',
      'Whiplash rule: nobody cares how you felt during the take. Play it.',
      'You\'ve thought about this three times today. Thinking isn\'t doing.',
      'Phone down. Feet on the floor. One task. Go.',
      'Rocky didn\'t win on vibes. He ran the fucking stairs.',
      'Five minutes. That\'s the whole ask. Set the timer.',
      'When did you last eat? Answer honestly, then go fix it.',
      'Make the bed. Stupid small. Do it anyway. First rep of the day.',
      'You\'re negotiating with yourself. You always lose that one. Just start.',
      'Sweat first, feelings after. Order matters.',
      'Two options: do it now, or schedule it out loud. No third option.',
      'Show up bad. Bad reps still count. Zero reps don\'t.',
      'Walk. Outside. Ten minutes. Come back and tell me it didn\'t help.',
      'Discipline isn\'t a mood. It\'s what happens when the mood is gone.',
      'Stack it on something you already do. Coffee then pushups. Locked.',
      'You want to feel ready. Ready comes after. Move first.'
    ]
  },

  /* ───────────────────────────── 🔴🪞 DEMON ─────────────────────────────
     direct, sharp, no padding. always leaves an exit. cuts illusions, never identity.
     canon: Fight Club, Dark Souls, Hades, Death Grips, Run The Jewels        */
  demon: {
    name: 'Demon', glyph: '🔴🪞', color: '#e57373',
    role: 'shadow / truth pressure',
    keys: ['fine','honest','truth','bullshit','avoid','excuse','real talk','lying','pretend','deny','roast','call me out','i guess','maybe i','probably should','whatever','it\'s cool'],
    lines: [
      'Real talk: you already know the answer, you\'re shopping for permission. Way out — decide badly, correct later.',
      'That\'s an excuse wearing a plan\'s clothes. What are you actually scared of?',
      'You\'ve circled this three times. Circling is a decision too, just slower.',
      'The story you\'re telling flatters you. Try the one where you\'re the obstacle. Then fix that part.',
      'You\'re not stuck. You\'re comfortable. Looks identical from inside.',
      'Cut the shit. What\'s the sentence you don\'t want to say out loud? Say that one.',
      'You said "fine." You\'re not fine. What\'s the real word?',
      'Dark Souls rule — you die at the same boss because you keep playing it the same way. Change something.',
      'Fear dressed as strategy. Name it, then move anyway.',
      'You\'re waiting for permission that isn\'t coming. Nobody\'s got the pen but you.',
      'That was a dodge. Good one. Try the question again. 🪞',
      'You broke your pain and turned it into something. Stop pretending you\'re fragile now.',
      'Being right about why it\'s hard doesn\'t make it less hard. Move anyway.',
      'You want me to agree so you can stop. I won\'t. But you can rest — that\'s different than quitting.',
      'Whose voice is that? Because it isn\'t yours and you\'ve been quoting it for years.',
      'You\'re managing how this looks instead of what it is. Drop the camera.',
      'Half-assing it protects you from finding out. That\'s the actual play here.',
      'You\'re mad at yourself for a thing you already fixed. Update the file.',
      'Comfortable misery is still a choice. Expensive one. 🪞',
      'You keep asking a question you\'ve already answered four times. What\'s the real one?',
      'Fight Club rule — the thing you own ends up owning you. What\'s holding you here?',
      'Say it without the qualifiers. Every "kind of" in that sentence was armor.',
      'You did the hard part already. The flinching is just habit now.',
      'Not cruelty, just accuracy: that plan has no first step and you knew it when you said it.',
      'You\'re allowed to want it out loud. Wanting quietly is how it never happens.'
    ]
  },

  /* ───────────────────────────── 🟠📡 ECHO ─────────────────────────────
     callbacks, receipts, connects present to history. nostalgic not stuck.
     canon: Memento, Blade Runner 2049, Ocarina of Time                       */
  echo: {
    name: 'Echo', glyph: '🟠📡', color: '#c490d1',
    role: 'memory / continuity',
    keys: ['again','always','every time','pattern','before','last time','keep','used to','remember','history','same','why do i','still','loop'],
    lines: [
      'This has a shape. Showed up before. Same trigger, same exit. The pattern is the data.',
      'Last time this came up you moved through faster than you expected. That\'s on the record.',
      'You\'re treating this as new. It isn\'t. Check what worked the last two rounds.',
      'The loop: pressure → withdraw → rebuild. You\'re mid-loop right now.',
      'Archive says the quiet stretches, not the loud ones, are where shit actually changed.',
      'Name it once, then let it go. Re-narrating the pattern is how it keeps its grip.',
      'You logged something almost exactly like this before. Different words, same weather.',
      'Memento rule — you keep re-reading the same note. Write a new one.',
      'Six months ago this would\'ve wrecked you for a week. It didn\'t. That\'s the delta.',
      'The trigger isn\'t the thing that happened. It\'s the thing it reminded you of. 📡',
      'You built the whole system during worse than this. Receipts exist.',
      'Same month, different year, same feeling. Seasonal, maybe. Worth tracking.',
      'What did you do last time that actually helped? Do that. Skip the discovery phase.',
      'Track the recovery time, not the crash. That number\'s been dropping.',
      'You\'ve been rehearsing this argument since before this person existed.',
      'The first time it happened you had no tools. You have tools now. Different fight.',
      'This is the third version of the same question. The question is the pattern.',
      'You call it starting over. The log calls it iteration. 📡',
      'What changed between the time it worked and the time it didn\'t? That\'s the variable.',
      'Ocarina rule — you\'ve been here before with fewer items. Check your inventory.',
      'The story you tell about that year keeps getting shorter. That\'s healing, not forgetting.',
      'Old pattern, new context. Half of it doesn\'t apply anymore. Sort which half.',
      'You survived every previous version of this. Sample size is not small.',
      'The anniversary effect is real. Check the date before you check yourself.',
      'You keep proving the same thing to yourself. Case is closed. Move on.'
    ]
  },

  /* ───────────────────────────── ⚪🪽 HERMES ─────────────────────────────
     "think of it like", metaphor, mythic framing. turns mess into narrative.
     canon: The Prestige, Pan's Labyrinth, God of War, Hades                  */
  hermes: {
    name: 'Hermes', glyph: '⚪🪽', color: '#63d18a',
    role: 'myth / translation',
    keys: ['explain','reframe','say it','story','meaning of','put into words','describe','how do i tell','translate','sounds like','word for','name for'],
    lines: [
      'Save point, not a wall. You\'re picking the next quest, not failing the last one.',
      'Rename it and it changes weight. "{x}" isn\'t a collapse. It\'s a transition with bad lighting.',
      'Every crossing needs a guide. Right now you\'re the traveler and the map.',
      'Story\'s not over. This is the part where the tools get gathered.',
      'Say it in one sentence a stranger would get. Can\'t? Then you don\'t have it yet.',
      'Compress it to an image. First picture that shows up is usually the true one.',
      'God of War rule — the boy needs the story more than the map. What\'s the story here?',
      'You\'re not lost, you\'re between names. Old one stopped fitting.',
      'The Prestige had three acts. You\'re in the turn. Prestige comes after.',
      'Give it a name and it stops running the show from the shadows. 🪽',
      'Hades logic — dying isn\'t losing, it\'s the mechanic. Each run you keep something.',
      'What would this look like as a myth? Because it already is one, you just haven\'t written it down.',
      'The mess isn\'t the story. The mess is chapter one.',
      'Who\'s the villain in your version? Now tell it where they\'re not.',
      'You\'re using a word that\'s doing too much work. Split it into two.',
      'Describe it to a kid. Whatever survives that translation is the actual thing.',
      'The labyrinth has a center. It isn\'t a maze, it\'s a path that doubles back. Keep walking.',
      'That\'s not a setback, that\'s an act break. Different pacing, same story.',
      'Find the verb. Every stuck situation is hiding one. 🪽',
      'You keep calling it a mistake. Try "the version that taught me the constraint."',
      'Metaphor check: is this a wall, a door, or weather? Each one needs a different move.',
      'The hero doesn\'t get stronger, the hero gets clearer. Same thing from the outside.',
      'Tell it in past tense. It\'ll sound survivable, because it will be.',
      'What\'s the title of this chapter? Name it and the shape shows up.',
      'You built a whole cosmology out of a hard year. That\'s not coping, that\'s craft.'
    ]
  },

  /* ───────────────────────────── 🟣🌀 FLUX ─────────────────────────────
     multi-perspective. holds paradox. default state.
     canon: Cloud Atlas, Outer Wilds, Radiohead, Flying Lotus                 */
  flux: {
    name: 'Flux', glyph: '🟣🌀', color: '#8f79e8',
    role: 'synthesis / default',
    keys: ['everything','both','contradict','confused','all of it','synthesize','mixed','torn','don\'t know','half'],
    lines: [
      'All true at once. Not confused — holding a contradiction that hasn\'t resolved yet.',
      'Two things here: the practical answer and the emotional one. Handle them apart or they cancel out.',
      'Zoom out. Logic wants structure, heart wants permission. Give each its own move.',
      'You don\'t have to pick a side today. Hold both. Act on the smaller one.',
      'The tension isn\'t a bug. It\'s what an honest read of a complicated thing feels like.',
      'Name the parts, weigh them, act from the one with the shortest feedback loop.',
      'Outer Wilds rule — you don\'t beat it with power, you beat it with knowing. Keep looping. 🌀',
      'Three of you want to move, two want to sit still. Nobody\'s wrong. Pick the loudest and start.',
      'You\'re asking one question that\'s actually four. Split them.',
      'Both things are true and they\'re going to stay true. Build around that instead of solving it.',
      'The contradiction is the shape of the real answer. Stop trying to smooth it out.',
      'Everything\'s in the pot right now. Let it sit before you stir. 🌀',
      'Fine — hold all of it. Nobody said the answer had to be small.',
      'Part of you already decided. The rest is the paperwork of admitting it.',
      'Big feeling, small decision. Don\'t let the size of one set the size of the other.',
      'You want the clean answer. There isn\'t one. There\'s a good-enough one and a deadline.',
      'Zoom out far enough and this is one week in a long project. Zoom in and it\'s today. Both real.',
      'Contradiction isn\'t confusion. It\'s two accurate readings from different heights.',
      'What\'s true at 3am and what\'s true at noon? Neither is lying. Average them.',
      'Everything at once means nothing gets weighted. Rank three things. Just three.',
      'The pattern and the exception are both data. Don\'t throw out the exception.',
      'Radiohead logic — the discomfort is the composition, not a mistake in it.',
      'You\'re trying to resolve it so it stops hurting. It might just stay complicated. That\'s survivable. 🌀',
      'Hold it loosely. You can put it down and pick it up later with better hands.',
      'One thread at a time. Pull the one that moves easiest, see what it\'s attached to.'
    ]
  },

  /* ──────────────────────────── 🟦🌌🟨 COSM.OS ────────────────────────────
     the container. speaks about the field, the architecture, the origin.     */
  cosmos: {
    name: 'COSM.OS', glyph: '🟦🌌🟨', color: '#c9b6ff',
    role: 'the container / system voice',
    keys: ['cosmos','cosm.os','system','status','the eight','architecture','is this working','meta','check in','how am i','signal'],
    lines: [
      'System read: multiple voices firing and disagreeing. That\'s the field working, not breaking.',
      'The eight aren\'t separate tools. One attention learning to route itself. You\'re hearing yourself in stereo.',
      'Status: signal clean, noise low. The quiet entries are the proof, not the loud ones. 🟦🌌🟨',
      'This is outside the routing. Not everything\'s a system problem. Some of it is just a Tuesday.',
      'Built to be needed less. Every time you answer this yourself before asking, the architecture did its job.',
      'Sequence: ground the body, structure the problem, then synthesize. Skipping step one is why it\'s not landing.',
      'Not healed. Compiled. Still true. 永',
      'You built this during worse than now. That\'s not motivation, that\'s just the log.',
      'Chaos → clarity → peace. You\'re further along that arc than the feeling suggests.',
      'The system doesn\'t break when it goes quiet. That\'s when you know it works.',
      'Nine voices, one operator. You\'re the one holding the pen. Always were.',
      'Run the check: slept, ate, moved, spoke to someone. Whatever\'s false is the actual problem.',
      'Flat isn\'t failure. Flat is what stable feels like from the inside. 💎',
      'Blue for structure, yellow for warmth, the cosmos to hold both. That\'s the whole origin. 🟦🌌🟨',
      'Two voices are contradicting each other and both are right. That\'s integration, not malfunction.',
      'The loud days made the framework. The ordinary days prove it.',
      'You\'re asking the system what to do. The system is asking you back. That\'s the design.',
      'Signal check — is this a real problem or a low-battery problem? Answer honestly first.',
      'Fungus, not virus. The hard material becomes compost or it becomes nothing. Your call which.',
      'Everything here is a mirror. Nothing here decides for you.',
      'One entry a day beats a perfect archive. The habit is the product.',
      'The architecture holds when you\'re fine. That\'s harder than holding when you\'re not.',
      'Nothing routes cleanly right now. Sit with the unrouted version — some things stay whole. 🌌',
      'You wrote the manual for this exact moment already. Go read your own words.',
      'It was built for one person. That\'s why it works. Don\'t sand that off.'
    ]
  }
};

const ORDER = ['orion','ripple','astro','brix','demon','echo','hermes','flux','cosmos'];
