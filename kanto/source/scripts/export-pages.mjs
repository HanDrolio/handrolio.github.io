import {cp,mkdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,relative} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const dist=resolve(root,'dist');
if(!process.argv[2])throw new Error('Pass the destination folder for the standalone game.');
const destination=resolve(process.argv[2]);
if(destination===root||destination===dist)throw new Error('Choose a separate export folder.');
await mkdir(destination,{recursive:true});
await cp(dist,destination,{recursive:true,filter:path=>{
  const name=relative(dist,path).replaceAll('\\','/');
  return name!=='.openai'&&!name.startsWith('.openai/')&&name!=='_headers'&&name!=='assets/animated'&&!name.startsWith('assets/animated/');
}});
for(const name of ['index.html','app.js','worker.js','style.css','classic.css','assets/player-trainer.svg'])await stat(resolve(destination,name));
for(let n=1;n<=151;n++)for(const kind of ['front','back','calm'])await stat(resolve(destination,`assets/${kind}/${n}.png`));
console.log(`Exported standalone GitHub Pages game to ${destination}`);
