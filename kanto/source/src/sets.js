import {Dex} from '@pkmn/sim';

// Hand-selected National Dex singles sets. Even unevolved species have a role.
// Format: number | ability | item | EV profile | four moves | role
const raw = `
1|Chlorophyll|Eviolite|d|Giga Drain,Sludge Bomb,Sleep Powder,Synthesis|Seed support
2|Chlorophyll|Eviolite|d|Giga Drain,Sludge Bomb,Sleep Powder,Synthesis|Bulky support
3|Chlorophyll|Life Orb|s|Giga Drain,Sludge Bomb,Earth Power,Growth|Special sweeper
4|Solar Power|Choice Scarf|s|Flamethrower,Dragon Pulse,Air Cutter,Overheat|Scarf attacker
5|Solar Power|Choice Specs|s|Flamethrower,Dragon Pulse,Air Cutter,Overheat|Special breaker
6|Solar Power|Heavy-Duty Boots|s|Flamethrower,Air Slash,Scorching Sands,Roost|Special attacker
7|Rain Dish|Eviolite|d|Scald,Ice Beam,Rapid Spin,Toxic|Utility spinner
8|Rain Dish|Eviolite|d|Scald,Ice Beam,Rapid Spin,Toxic|Bulky spinner
9|Torrent|White Herb|s|Shell Smash,Hydro Pump,Ice Beam,Aura Sphere|Shell Smash sweeper
10|Shield Dust|Focus Sash|p|Bug Bite,Electroweb,String Shot,Tackle|Web support
11|Shed Skin|Eviolite|b|Bug Bite,Tackle,Iron Defense,Electroweb|Cocoon challenge
12|Compound Eyes|Focus Sash|s|Sleep Powder,Quiver Dance,Bug Buzz,Hurricane|Sleep + setup
13|Shield Dust|Focus Sash|p|Poison Sting,Bug Bite,String Shot,Electroweb|Web support
14|Shed Skin|Eviolite|b|Bug Bite,Poison Sting,Iron Defense,Electroweb|Cocoon challenge
15|Sniper|Focus Sash|p|Toxic Spikes,U-turn,Poison Jab,Knock Off|Hazard pivot
16|Big Pecks|Eviolite|p|Brave Bird,U-turn,Roost,Quick Attack|Flying pivot
17|Big Pecks|Eviolite|p|Brave Bird,U-turn,Roost,Quick Attack|Flying pivot
18|Keen Eye|Heavy-Duty Boots|s|Hurricane,Heat Wave,U-turn,Roost|Special pivot
19|Guts|Flame Orb|p|Facade,Quick Attack,U-turn,Sucker Punch|Guts attacker
20|Guts|Flame Orb|p|Facade,Quick Attack,U-turn,Sucker Punch|Guts breaker
21|Sniper|Focus Sash|p|Drill Peck,Double-Edge,U-turn,Quick Attack|Fast pivot
22|Sniper|Choice Band|p|Drill Peck,Double-Edge,U-turn,Drill Run|Physical breaker
23|Intimidate|Eviolite|b|Coil,Gunk Shot,Earthquake,Glare|Coil support
24|Intimidate|Black Sludge|b|Coil,Gunk Shot,Earthquake,Sucker Punch|Coil sweeper
25|Lightning Rod|Light Ball|m|Thunderbolt,Volt Tackle,Surf,Grass Knot|Light Ball attacker
26|Lightning Rod|Life Orb|s|Nasty Plot,Thunderbolt,Focus Blast,Grass Knot|Special sweeper
27|Sand Rush|Eviolite|b|Earthquake,Knock Off,Rapid Spin,Stealth Rock|Hazard utility
28|Sand Rush|Leftovers|b|Earthquake,Knock Off,Rapid Spin,Stealth Rock|Hazard utility
29|Hustle|Eviolite|b|Poison Jab,Crunch,Toxic Spikes,Super Fang|Bulky disruption
30|Hustle|Eviolite|b|Poison Jab,Crunch,Toxic Spikes,Super Fang|Bulky disruption
31|Sheer Force|Life Orb|s|Earth Power,Sludge Wave,Ice Beam,Thunderbolt|Special breaker
32|Hustle|Eviolite|p|Poison Jab,Sucker Punch,Head Smash,Toxic Spikes|Physical disruption
33|Hustle|Eviolite|p|Poison Jab,Sucker Punch,Head Smash,Toxic Spikes|Physical disruption
34|Sheer Force|Life Orb|s|Earth Power,Sludge Wave,Ice Beam,Thunderbolt|Coverage breaker
35|Magic Guard|Eviolite|d|Moonblast,Soft-Boiled,Thunder Wave,Stealth Rock|Defensive support
36|Magic Guard|Leftovers|d|Moonblast,Soft-Boiled,Calm Mind,Flamethrower|Bulky win condition
37|Drought|Eviolite|s|Flamethrower,Energy Ball,Will-O-Wisp,Encore|Sun support
38|Drought|Heat Rock|s|Flamethrower,Solar Beam,Nasty Plot,Will-O-Wisp|Sun sweeper
39|Competitive|Eviolite|d|Dazzling Gleam,Wish,Protect,Thunder Wave|Wish support
40|Competitive|Leftovers|d|Dazzling Gleam,Wish,Protect,Thunder Wave|Wish support
41|Infiltrator|Eviolite|p|Brave Bird,Roost,Super Fang,U-turn|Disruptive pivot
42|Infiltrator|Eviolite|d|Brave Bird,Roost,Defog,Toxic|Defensive pivot
43|Chlorophyll|Eviolite|d|Giga Drain,Sludge Bomb,Sleep Powder,Strength Sap|Bulky support
44|Chlorophyll|Eviolite|d|Giga Drain,Sludge Bomb,Sleep Powder,Strength Sap|Bulky support
45|Chlorophyll|Black Sludge|d|Giga Drain,Sludge Bomb,Strength Sap,Sleep Powder|Physical wall
46|Dry Skin|Eviolite|b|Spore,Seed Bomb,Knock Off,Synthesis|Sleep support
47|Dry Skin|Heavy-Duty Boots|b|Spore,Leech Life,Knock Off,Synthesis|Bulky disruption
48|Tinted Lens|Eviolite|s|Sleep Powder,Bug Buzz,Sludge Bomb,Agility|Sleep attacker
49|Tinted Lens|Heavy-Duty Boots|s|Quiver Dance,Bug Buzz,Sludge Wave,Sleep Powder|Special sweeper
50|Arena Trap|Focus Sash|p|Earthquake,Rock Slide,Sucker Punch,Stealth Rock|Fast trapper
51|Arena Trap|Focus Sash|p|Earthquake,Stone Edge,Sucker Punch,Stealth Rock|Fast trapper
52|Technician|Life Orb|p|Fake Out,Double-Edge,Knock Off,U-turn|Priority pivot
53|Technician|Life Orb|p|Fake Out,Double-Edge,Knock Off,U-turn|Priority pivot
54|Swift Swim|Eviolite|s|Hydro Pump,Ice Beam,Psychic,Encore|Special attacker
55|Swift Swim|Life Orb|s|Hydro Pump,Ice Beam,Focus Blast,Encore|Special breaker
56|Defiant|Eviolite|p|Close Combat,U-turn,Ice Punch,Encore|Physical pivot
57|Defiant|Choice Scarf|p|Close Combat,U-turn,Ice Punch,Stone Edge|Scarf revenge killer
58|Intimidate|Eviolite|b|Flare Blitz,Wild Charge,Morning Sun,Will-O-Wisp|Bulky fire support
59|Intimidate|Heavy-Duty Boots|b|Flare Blitz,Extreme Speed,Morning Sun,Will-O-Wisp|Bulky priority
60|Water Absorb|Eviolite|s|Hydro Pump,Ice Beam,Earth Power,Encore|Special attacker
61|Water Absorb|Eviolite|b|Waterfall,Brick Break,Encore,Belly Drum|Belly Drum sweeper
62|Water Absorb|Leftovers|b|Drain Punch,Liquidation,Bulk Up,Ice Punch|Bulky setup
63|Magic Guard|Focus Sash|s|Psychic,Dazzling Gleam,Shadow Ball,Encore|Sash attacker
64|Magic Guard|Focus Sash|s|Psychic,Dazzling Gleam,Shadow Ball,Encore|Fast special attacker
65|Magic Guard|Focus Sash|s|Psychic,Focus Blast,Shadow Ball,Nasty Plot|Special sweeper
66|Guts|Flame Orb|b|Close Combat,Facade,Knock Off,Bullet Punch|Guts breaker
67|No Guard|Eviolite|b|Dynamic Punch,Knock Off,Bullet Punch,Rock Slide|Bulky breaker
68|No Guard|Assault Vest|b|Dynamic Punch,Knock Off,Bullet Punch,Stone Edge|Bulky breaker
69|Chlorophyll|Eviolite|b|Power Whip,Knock Off,Sleep Powder,Strength Sap|Physical support
70|Chlorophyll|Eviolite|b|Power Whip,Knock Off,Sleep Powder,Strength Sap|Physical support
71|Chlorophyll|Life Orb|s|Growth,Giga Drain,Sludge Bomb,Weather Ball|Sun sweeper
72|Liquid Ooze|Eviolite|w|Scald,Sludge Bomb,Rapid Spin,Toxic Spikes|Special wall
73|Liquid Ooze|Black Sludge|s|Scald,Sludge Bomb,Rapid Spin,Toxic Spikes|Fast utility
74|Sturdy|Eviolite|b|Earthquake,Rock Blast,Stealth Rock,Sucker Punch|Hazard tank
75|Sturdy|Eviolite|b|Earthquake,Rock Blast,Stealth Rock,Sucker Punch|Hazard tank
76|Sturdy|Custap Berry|b|Earthquake,Rock Blast,Stealth Rock,Explosion|Hazard lead
77|Flame Body|Eviolite|p|Flare Blitz,Wild Charge,Morning Sun,Will-O-Wisp|Physical support
78|Flame Body|Heavy-Duty Boots|p|Flare Blitz,High Horsepower,Wild Charge,Morning Sun|Fast physical attacker
79|Regenerator|Eviolite|d|Scald,Psychic,Slack Off,Thunder Wave|Defensive pivot
80|Regenerator|Heavy-Duty Boots|d|Scald,Future Sight,Slack Off,Teleport|Defensive pivot
81|Magnet Pull|Eviolite|s|Thunderbolt,Flash Cannon,Volt Switch,Thunder Wave|Steel trapper
82|Magnet Pull|Choice Scarf|s|Thunderbolt,Flash Cannon,Volt Switch,Tri Attack|Scarf trapper
83|Defiant|Stick|p|Swords Dance,Brave Bird,Leaf Blade,Night Slash|Critical-hit attacker
84|Early Bird|Eviolite|p|Brave Bird,Jump Kick,Quick Attack,Swords Dance|Physical sweeper
85|Early Bird|Life Orb|p|Brave Bird,Jump Kick,Quick Attack,Swords Dance|Physical sweeper
86|Thick Fat|Eviolite|w|Surf,Ice Beam,Encore,Toxic|Bulky water
87|Thick Fat|Heavy-Duty Boots|w|Surf,Ice Beam,Encore,Toxic|Bulky water
88|Sticky Hold|Eviolite|b|Poison Jab,Payback,Shadow Sneak,Fire Punch|Bulky poison
89|Poison Touch|Assault Vest|b|Poison Jab,Knock Off,Shadow Sneak,Fire Punch|Bulky poison
90|Skill Link|Focus Sash|p|Shell Smash,Icicle Spear,Rock Blast,Liquidation|Shell Smash sweeper
91|Skill Link|White Herb|p|Shell Smash,Icicle Spear,Rock Blast,Ice Shard|Shell Smash sweeper
92|Levitate|Focus Sash|s|Shadow Ball,Sludge Bomb,Thunderbolt,Destiny Bond|Special attacker
93|Levitate|Life Orb|s|Shadow Ball,Sludge Wave,Thunderbolt,Destiny Bond|Special breaker
94|Cursed Body|Life Orb|s|Shadow Ball,Sludge Wave,Focus Blast,Nasty Plot|Special sweeper
95|Sturdy|Eviolite|b|Earthquake,Rock Blast,Stealth Rock,Body Press|Hazard tank
96|Insomnia|Eviolite|w|Psychic,Wish,Protect,Thunder Wave|Wish support
97|Insomnia|Leftovers|w|Psychic,Wish,Protect,Thunder Wave|Wish support
98|Hyper Cutter|Eviolite|p|Crabhammer,Knock Off,Superpower,Agility|Physical sweeper
99|Sheer Force|Life Orb|p|Crabhammer,Knock Off,Superpower,Agility|Physical sweeper
100|Static|Eviolite|s|Thunderbolt,Volt Switch,Taunt,Thunder Wave|Fast disruption
101|Static|Heavy-Duty Boots|s|Thunderbolt,Volt Switch,Taunt,Thunder Wave|Fast disruption
102|Harvest|Eviolite|d|Giga Drain,Psychic,Leech Seed,Sleep Powder|Bulky support
103|Harvest|Sitrus Berry|d|Giga Drain,Psychic,Leech Seed,Sleep Powder|Harvest tank
104|Battle Armor|Thick Club|b|Earthquake,Knock Off,Rock Slide,Swords Dance|Thick Club breaker
105|Rock Head|Thick Club|b|Earthquake,Knock Off,Double-Edge,Swords Dance|Thick Club breaker
106|Reckless|Life Orb|p|High Jump Kick,Knock Off,Mach Punch,Rapid Spin|Physical breaker
107|Iron Fist|Assault Vest|b|Drain Punch,Mach Punch,Ice Punch,Rapid Spin|Bulky priority
108|Oblivious|Eviolite|w|Body Slam,Wish,Protect,Knock Off|Wish tank
109|Neutralizing Gas|Eviolite|d|Sludge Bomb,Will-O-Wisp,Pain Split,Toxic Spikes|Physical wall
110|Levitate|Black Sludge|d|Sludge Bomb,Will-O-Wisp,Pain Split,Toxic Spikes|Physical wall
111|Lightning Rod|Eviolite|b|Earthquake,Stone Edge,Stealth Rock,Megahorn|Hazard tank
112|Lightning Rod|Eviolite|b|Earthquake,Stone Edge,Stealth Rock,Megahorn|Hazard tank
113|Natural Cure|Eviolite|d|Seismic Toss,Soft-Boiled,Thunder Wave,Stealth Rock|Special wall
114|Regenerator|Eviolite|d|Giga Drain,Knock Off,Sleep Powder,Leech Seed|Physical wall
115|Scrappy|Silk Scarf|p|Fake Out,Double-Edge,Earthquake,Sucker Punch|Priority attacker
116|Swift Swim|Eviolite|s|Hydro Pump,Ice Beam,Dragon Pulse,Agility|Special sweeper
117|Poison Point|Eviolite|s|Hydro Pump,Ice Beam,Dragon Pulse,Agility|Special sweeper
118|Lightning Rod|Eviolite|p|Waterfall,Drill Run,Knock Off,Agility|Physical sweeper
119|Lightning Rod|Life Orb|p|Waterfall,Megahorn,Drill Run,Knock Off|Coverage attacker
120|Natural Cure|Eviolite|s|Scald,Psychic,Rapid Spin,Recover|Fast spinner
121|Natural Cure|Life Orb|s|Hydro Pump,Psyshock,Ice Beam,Recover|Fast special attacker
122|Filter|Choice Scarf|s|Psychic,Dazzling Gleam,Focus Blast,Trick|Scarf disruption
123|Technician|Eviolite|p|Swords Dance,Dual Wingbeat,Close Combat,Roost|Physical sweeper
124|Dry Skin|Focus Sash|s|Lovely Kiss,Nasty Plot,Ice Beam,Psyshock|Sleep + setup
125|Vital Spirit|Eviolite|m|Thunderbolt,Volt Switch,Ice Punch,Cross Chop|Mixed pivot
126|Flame Body|Eviolite|s|Flamethrower,Scorching Sands,Focus Blast,Psychic|Special coverage
127|Moxie|Choice Scarf|p|X-Scissor,Close Combat,Earthquake,Stone Edge|Scarf revenge killer
128|Intimidate|Life Orb|p|Body Slam,Close Combat,Earthquake,Throat Chop|Physical attacker
129|Swift Swim|Focus Sash|p|Flail,Bounce,Tackle,Splash|The underdog
130|Intimidate|Leftovers|p|Dragon Dance,Waterfall,Earthquake,Ice Fang|Dragon Dance sweeper
131|Water Absorb|Assault Vest|h|Freeze-Dry,Hydro Pump,Thunderbolt,Ice Shard|Bulky coverage
132|Imposter|Choice Scarf|p|Transform|Revenge copier
133|Adaptability|Eviolite|p|Double-Edge,Quick Attack,Wish,Protect|Priority support
134|Water Absorb|Leftovers|d|Scald,Wish,Protect,Heal Bell|Wish wall
135|Volt Absorb|Choice Specs|s|Thunderbolt,Volt Switch,Shadow Ball,Hyper Voice|Fast special breaker
136|Guts|Flame Orb|b|Flare Blitz,Facade,Superpower,Quick Attack|Guts breaker
137|Trace|Eviolite|d|Tri Attack,Ice Beam,Thunder Wave,Recover|Defensive support
138|Swift Swim|Eviolite|s|Shell Smash,Hydro Pump,Ice Beam,Earth Power|Shell Smash sweeper
139|Weak Armor|White Herb|s|Shell Smash,Hydro Pump,Ice Beam,Earth Power|Shell Smash sweeper
140|Swift Swim|Eviolite|p|Waterfall,Stone Edge,Aqua Jet,Rapid Spin|Physical spinner
141|Weak Armor|Life Orb|p|Swords Dance,Stone Edge,Liquidation,Aqua Jet|Physical sweeper
142|Rock Head|Heavy-Duty Boots|p|Stone Edge,Earthquake,Dual Wingbeat,Roost|Fast physical attacker
143|Thick Fat|Leftovers|b|Curse,Body Slam,Rest,Sleep Talk|Bulky win condition
144|Pressure|Heavy-Duty Boots|d|Freeze-Dry,Hurricane,Roost,Heal Bell|Defensive ice
145|Static|Heavy-Duty Boots|d|Discharge,Hurricane,Heat Wave,Roost|Defensive pivot
146|Flame Body|Heavy-Duty Boots|d|Flamethrower,Hurricane,Roost,Will-O-Wisp|Defensive fire
147|Shed Skin|Eviolite|p|Dragon Dance,Outrage,Extreme Speed,Aqua Tail|Dragon Dance sweeper
148|Shed Skin|Eviolite|p|Dragon Dance,Outrage,Extreme Speed,Aqua Tail|Dragon Dance sweeper
149|Multiscale|Heavy-Duty Boots|p|Dragon Dance,Dragon Claw,Earthquake,Extreme Speed|Dragon Dance sweeper
150|Pressure|Life Orb|s|Nasty Plot,Psystrike,Ice Beam,Aura Sphere|Special powerhouse
151|Synchronize|Leftovers|d|Psychic,Will-O-Wisp,Soft-Boiled,Knock Off|Utility wildcard
`;

const profiles = {
  s: {nature:'Timid',evs:{spa:252,spe:252,spd:4},ivs:{atk:0}},
  p: {nature:'Jolly',evs:{atk:252,spe:252,spd:4}},
  b: {nature:'Adamant',evs:{hp:252,atk:252,spd:4}},
  d: {nature:'Bold',evs:{hp:252,def:252,spd:4}},
  w: {nature:'Calm',evs:{hp:252,spd:252,def:4},ivs:{atk:0}},
  h: {nature:'Modest',evs:{hp:252,spa:252,spd:4}},
  m: {nature:'Naive',evs:{spa:252,spe:252,atk:4}},
};

export const SPECIES = Dex.species.all().filter(s=>s.num>=1&&s.num<=151&&!s.forme).sort((a,b)=>a.num-b.num);
export const SETS = Object.fromEntries(raw.trim().split('\n').map(line=>{
  const [n,ability,item,profile,moves,role]=line.split('|');
  const species=SPECIES.find(s=>s.num===+n);
  return [+n,{species:species.name,name:species.name,ability,item,level:100,moves:moves.split(','),...profiles[profile],role}];
}));

// This exact roster, order, and set is used in every challenge.
export const CHAMPION_NUMS = [18,65,112,103,59,9];
export const championTeam = ()=>CHAMPION_NUMS.map(n=>cloneSet(SETS[n]));
export const cloneSet = set=>JSON.parse(JSON.stringify(set));

export function randomTeam(rng=Math.random) {
  const pool=Array.from({length:151},(_,i)=>i+1);
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,6).map(n=>cloneSet(SETS[n]));
}

export function speciesInfo(name) {
  const s=Dex.species.get(name);
  return {num:s.num,name:s.name,types:s.types,baseStats:s.baseStats};
}
