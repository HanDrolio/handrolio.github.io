/* Kanto Gym Circuit: encounter definitions, separated from the battle engine.
   Integration must route these profiles into worker.js without changing Champion mode. */
window.KANTO_GYM_CIRCUIT = Object.freeze([
  {id:"brock",name:"Brock",badge:"Boulder",type:"Rock",tier:1,team:[74,95,76],ai:{lookahead:0,switchBias:0.05,statusBias:0.05,coverageBias:0.15}},
  {id:"misty",name:"Misty",badge:"Cascade",type:"Water",tier:2,team:[120,121,55],ai:{lookahead:0,switchBias:0.12,statusBias:0.10,coverageBias:0.30}},
  {id:"surge",name:"Lt. Surge",badge:"Thunder",type:"Electric",tier:3,team:[26,82,101],ai:{lookahead:1,switchBias:0.20,statusBias:0.22,coverageBias:0.38}},
  {id:"erika",name:"Erika",badge:"Rainbow",type:"Grass",tier:4,team:[71,114,45,103],ai:{lookahead:1,switchBias:0.25,statusBias:0.40,coverageBias:0.40}},
  {id:"koga",name:"Koga",badge:"Soul",type:"Poison",tier:5,team:[49,110,89,42],ai:{lookahead:1,switchBias:0.38,statusBias:0.48,coverageBias:0.48}},
  {id:"sabrina",name:"Sabrina",badge:"Marsh",type:"Psychic",tier:6,team:[122,124,65,121],ai:{lookahead:2,switchBias:0.50,statusBias:0.48,coverageBias:0.60}},
  {id:"blaine",name:"Blaine",badge:"Volcano",type:"Fire",tier:7,team:[38,78,59,126,136],ai:{lookahead:2,switchBias:0.62,statusBias:0.50,coverageBias:0.70}},
  {id:"giovanni",name:"Giovanni",badge:"Earth",type:"Ground",tier:8,team:[51,34,31,112,111,76],ai:{lookahead:3,switchBias:0.75,statusBias:0.60,coverageBias:0.85}}
]);
