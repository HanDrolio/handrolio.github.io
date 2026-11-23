import {build} from 'esbuild';
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import {buildCalmSprites} from './calm-sprites.mjs';
await mkdir('dist',{recursive:true});
await mkdir('dist/licenses',{recursive:true});
await copyFile('node_modules/@pkmn/sim/LICENSE','dist/licenses/pkmn-sim.txt');
await copyFile('src/player-trainer.svg','dist/assets/player-trainer.svg');
await buildCalmSprites();
await Promise.all(['index.html','style.css','classic.css'].map(n=>copyFile(`src/${n}`,`dist/${n}`)));
await build({entryPoints:['src/app.js'],bundle:true,format:'esm',platform:'browser',target:['safari16','chrome105'],minify:true,outfile:'dist/app.js',legalComments:'linked',define:{'process.env.NODE_ENV':'"production"'}});
// The simulator serializes references using constructor names; keep them intact.
await build({entryPoints:['src/worker.js'],bundle:true,format:'esm',platform:'browser',target:['safari16','chrome105'],minify:true,keepNames:true,outfile:'dist/worker.js',legalComments:'linked',define:{'process.env.NODE_ENV':'"production"'}});
await writeFile('dist/_headers','/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/assets/*\n  Cache-Control: public, max-age=604800\n');
console.log('Built KANTO / Champion Loop');
