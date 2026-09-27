import { rm, mkdir, copyFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { isPublicFile, publicRootFiles, vendorFiles } from './public-files.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
async function copy(source, target = source) {
  await mkdir(path.dirname(path.join(output, target)), { recursive: true });
  await copyFile(path.join(root, source), path.join(output, target));
}
for (const file of [...publicRootFiles, '_headers']) await copy(file);
async function copyPublicDirectory(directory) {
  for (const item of await readdir(path.join(root, directory), { withFileTypes: true })) {
    if (item.name.startsWith('.') || item.isSymbolicLink()) continue;
    const relative = `${directory}/${item.name}`;
    if (item.isDirectory()) await copyPublicDirectory(relative);
    else if (isPublicFile(relative)) await copy(relative);
  }
}
await copyPublicDirectory('assets');
await copyPublicDirectory('blog');
for (const [target, source] of Object.entries(vendorFiles)) await copy(source, target);
await build({ entryPoints: [path.join(root, 'functions/_worker.js')], bundle: true,
  outfile: path.join(output, '_worker.js'), format: 'esm', platform: 'browser' });
await import('./prepare-pages-config.js');
