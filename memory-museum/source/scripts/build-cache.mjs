import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../dist/', import.meta.url);
const paths = (await readdir(root, { recursive: true, withFileTypes: true })).filter(entry => entry.isFile())
  .map(entry => entry.parentPath.slice(root.pathname.length).replace(/^\//, '') + '/' + entry.name)
  .map(path => path.replace(/^\//, '')).filter(path => path !== 'sw.js').sort();

const digest = createHash('sha256');
const worker = await readFile(new URL('sw.js', root), 'utf8');
digest.update(worker);
for (const path of paths) digest.update(await readFile(new URL(path, root)));
await writeFile(new URL('sw.js', root), worker.replace('__MUSEUM_RELEASE__', digest.digest('hex').slice(0, 14))
  .replace('/* MUSEUM_FILES */ []', JSON.stringify(paths.map(path => './' + path))));
