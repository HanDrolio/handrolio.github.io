import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const crcTable=Array.from({length:256},(_,n)=>{
  for(let bit=0;bit<8;bit++)n=n&1?0xedb88320^(n>>>1):n>>>1;
  return n>>>0;
});
function crc32(bytes){
  let crc=0xffffffff;
  for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}

// Preserve every original pixel and pose. Only APNG timing and its checksum change.
export function calmSprite(bytes){
  const output=Buffer.from(bytes);
  if(output.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Expected a PNG sprite.');
  let offset=8,frame=0;
  while(offset<output.length){
    const size=output.readUInt32BE(offset),end=offset+12+size;
    if(end>output.length)throw new Error('Incomplete PNG chunk.');
    const type=output.toString('ascii',offset+4,offset+8);
    if(type==='fcTL'){
      const start=offset+8;
      const numerator=output.readUInt16BE(start+20),denominator=output.readUInt16BE(start+22)||100;
      const originalMS=numerator/denominator*1000;
      const duration=frame===0?Math.max(2600,originalMS):Math.max(70,Math.round(originalMS*2.5));
      output.writeUInt16BE(Math.min(65535,duration),start+20);
      output.writeUInt16BE(1000,start+22);
      output.writeUInt32BE(crc32(output.subarray(offset+4,offset+8+size)),offset+8+size);
      frame++;
    }
    offset=end;
  }
  if(!frame)throw new Error('Expected an animated PNG.');
  return output;
}

export async function buildCalmSprites(root=new URL('../dist/assets/',import.meta.url)){
  const output=new URL('calm/',root);
  await mkdir(output,{recursive:true});
  await Promise.all(Array.from({length:151},async(_,i)=>{
    const name=`${i+1}.png`,original=await readFile(new URL(`animated/${name}`,root));
    await writeFile(new URL(name,output),calmSprite(original));
  }));
  console.log('Prepared 151 calmer battle sprites.');
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildCalmSprites();
