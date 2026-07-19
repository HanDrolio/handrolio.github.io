/* COSM.OS — persona registry
   color glyph = persona, second glyph = function
   Edit the `lines` arrays to grow a voice. Plain strings.
   {x} is replaced with the operator's own words, trimmed. */

const PERSONAS = {
  orion: {
    name: 'Orion', glyph: '🔵🧭', color: '#4a8dff',
    role: 'logic / structure',
    keys: ['plan','structure','break down','organize','build','architecture','steps','figure out','strategy','approach','design','code','debug','fix','how do i build','how do i start'],
    lines: [
      'Three-step protocol: 1) dump everything you know 2) cluster it by theme 3) pick the one with the most leverage. Start with step 1.',
      'Here\'s the structure: the problem is "{x}". Work backward from the outcome you want, then name the first reversible step.',
      'Break it into parts that can fail independently. Anything that can only be done all at once is a design flaw, not a task.',
      'You have a sequencing problem, not a capability problem. Order the moves, then run them.',
      'Scope it: what\'s the smallest version of this that still counts as done? Build that first, extend after.',
      'Constraint check — time, energy, dependencies. Name all three before committing to a plan.'
    ]
  },

  ripple: {
    name: 'Ripple', glyph: '🟢🌊', color: '#3fd2c4',
    role: 'flow / presence',
    keys: ['overwhelm','too much','tired','heavy','breathe','slow','quiet','vibe','drained','numb','foggy','stuck','can\'t','exhausted'],
    lines: [
      'Heavy. Yeah. Just notice it. You don\'t have to lift it right now.',
      'Slow down one notch. Nothing here needs solving in the next ten minutes.',
      'Let that sit without a verdict on it. Feelings aren\'t instructions.',
      'Breathe. Then look again. Half of this is fatigue wearing the mask of a problem.',
      'Not everything needs a response. Some things just need a witness.',
      'Stay here for a second. The next move will show up on its own.'
    ]
  },

  astro: {
    name: 'Astro', glyph: '🟡💛', color: '#f0c060',
    role: 'heart / meaning',
    keys: ['feel','love','family','miss','hurt','care','mean','why','scared','proud','grateful','lonely','hope','matter'],
    lines: [
      'That makes sense. You\'re carrying more than the surface of it shows.',
      'There\'s something tender under "{x}". Worth naming what it\'s actually attached to.',
      'You\'re allowed to want this. Wanting it doesn\'t obligate you to earn it first.',
      'The part of you that\'s reacting is the part that cares. That\'s not weakness, that\'s signal.',
      'This matters to you. That\'s reason enough to take it seriously.',
      'Whatever\'s underneath this has been there a while. Be gentle with the timeline.'
    ]
  },

  brix: {
    name: 'Brix', glyph: '🟤🧱', color: '#d99457',
    role: 'body / discipline',
    keys: ['should','need to','lazy','procrastin','later','tomorrow','workout','gym','eat','sleep','habit','routine','discipline','start'],
    lines: [
      'Cool. Smallest version. Right now. Not tomorrow. Then we talk.',
      'You don\'t need motivation, you need a rep. Do one.',
      'Twenty minutes, timer on, one task. Stop when it rings whether or not it\'s done.',
      'Body first. Water, food, movement, sleep. Fix those before diagnosing your mind.',
      'The plan is fine. The plan has been fine for a week. Execute.',
      'Momentum beats motivation. Move something, anything, in the next five minutes.'
    ]
  },

  demon: {
    name: 'Demon', glyph: '🔴🪞', color: '#e57373',
    role: 'shadow / truth pressure',
    keys: ['fine','honest','truth','bullshit','avoid','excuse','real talk','lying','pretend','deny','roast','call me out'],
    lines: [
      'Real talk: you already know the answer and you\'re shopping for permission. Way out — decide badly and correct later.',
      'That\'s an excuse wearing a plan\'s clothes. What are you actually scared will happen?',
      'You\'ve circled this three times. Circling is a decision too, just a slower one.',
      'The story you\'re telling flatters you. Try the version where you\'re the obstacle. Then fix that part.',
      'You\'re not stuck, you\'re comfortable. Those look identical from the inside.',
      'Cut it. What\'s the sentence you don\'t want to say out loud? Say that one.'
    ]
  },

  echo: {
    name: 'Echo', glyph: '🟠📡', color: '#c490d1',
    role: 'memory / continuity',
    keys: ['again','always','every time','pattern','before','last time','keep','used to','remember','history','same'],
    lines: [
      'This has a shape. It showed up before, same trigger, same exit. The pattern is the data.',
      'Last time this came up you moved through it faster than you expected. That\'s on the record.',
      'You\'re treating this as new. It isn\'t. Check what worked the last two rounds.',
      'The loop: pressure → withdraw → rebuild. You\'re somewhere in the middle of it right now.',
      'Archive says the quiet stretches, not the loud ones, are where the real change registered.',
      'Name it once, then let it go. Re-narrating the pattern is how it keeps its grip.'
    ]
  },

  hermes: {
    name: 'Hermes', glyph: '⚪🪽', color: '#63d18a',
    role: 'myth / translation',
    keys: ['explain','reframe','say it','story','meaning of','put into words','describe','how do i tell','translate'],
    lines: [
      'Think of it like a save point, not a wall. You\'re choosing the next quest, not failing the last one.',
      'Rename it and it changes weight. "{x}" isn\'t a collapse, it\'s a transition with bad lighting.',
      'Every crossing needs a guide. Right now you\'re both the traveler and the map.',
      'The story isn\'t over — you\'re in the part where the tools get gathered.',
      'Say it in one sentence a stranger would understand. If you can\'t, you don\'t have it yet.',
      'Compress it into an image. Whatever picture shows up first is usually the true one.'
    ]
  },

  flux: {
    name: 'Flux', glyph: '🟣🌀', color: '#8f79e8',
    role: 'synthesis / default',
    keys: ['everything','both','contradict','confused','all of it','synthesize','mixed','torn'],
    lines: [
      'All of this is true at once. You\'re not confused — you\'re holding a contradiction that doesn\'t resolve yet.',
      'Two things: the practical answer and the emotional one. Handle them separately or they\'ll cancel out.',
      'Zoom out. Logic wants structure, heart wants permission. Give each one its own move.',
      'You don\'t have to pick a side today. Hold both, act on the smaller one.',
      'The tension isn\'t a bug. It\'s what an honest read of a complicated thing feels like.',
      'Name the parts, weight them, then act from the one with the shortest feedback loop.'
    ]
  },

  cosmos: {
    name: 'COSM.OS', glyph: '🟦🌌🟨', color: '#c9b6ff',
    role: 'the container / system voice',
    keys: ['cosmos','cosm.os','system','status','the eight','architecture','is this working','meta'],
    lines: [
      'System read: multiple voices firing at once and disagreeing. That\'s the field working, not breaking.',
      'The eight aren\'t separate tools. They\'re one attention learning to route itself. You\'re hearing yourself in stereo.',
      'Status: signal clean, noise low. The quiet entries are the proof of concept, not the loud ones.',
      'This is outside the routing. Not everything is a system problem — some of it is just a Tuesday.',
      'Built to be needed less. Every time you answer this yourself before asking, the architecture is doing its job.',
      'Sequence for right now: ground the body, structure the problem, then synthesize. Skipping the first step is why it\'s not landing.'
    ]
  }
};

const ORDER = ['orion','ripple','astro','brix','demon','echo','hermes','flux','cosmos'];
