// Generate previews locally: originals stay in R2; versioned previews ship with Pages.
import { readdir, readFile, writeFile, mkdir, stat, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const siteOption = process.argv.find(arg => arg.startsWith('--from-site='));
let temporarySource;
let source;
if (siteOption) {
    const site = new URL(siteOption.slice('--from-site='.length));
    if (site.protocol !== 'https:') throw new Error('Photo source must use HTTPS');
    const response = await fetch(new URL('/api/images/all', site), { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Photo listing failed: ${response.status}`);
    const photos = await response.json();
    if (!Array.isArray(photos) || !photos.length) throw new Error('Empty photo listing');
    temporarySource = await mkdtemp(path.join(os.tmpdir(), 'portfolio-previews-'));
    source = temporarySource;
    let next = 0;
    try {
        await Promise.all(Array.from({ length: 4 }, async () => {
            while (next < photos.length) {
                const photo = photos[next++];
                if (typeof photo.key !== 'string' || photo.key.includes('\\') || photo.key.split('/').some(part => !part || part.startsWith('.')))
                    throw new Error('Invalid photo key');
                const url = new URL(photo.url, site);
                if (url.origin !== site.origin || !url.pathname.startsWith('/img/')) throw new Error('Unexpected photo origin');
                const image = await fetch(url, { signal: AbortSignal.timeout(30000) });
                if (!image.ok) throw new Error(`Photo download failed: ${image.status}`);
                const destination = path.join(source, photo.key);
                await mkdir(path.dirname(destination), { recursive: true });
                await writeFile(destination, Buffer.from(await image.arrayBuffer()));
            }
        }));
    } catch (error) {
        // Keep partial downloads for diagnosis; never publish an incomplete manifest.
        throw new Error(`Photo download failed; temporary files: ${source}`, { cause: error });
    }
    console.log(`Downloaded ${photos.length} public photos for preview generation.`);
} else {
    source = path.resolve(process.argv[2] || path.join(root, 'photos'));
}
const output = path.join(root, 'assets/photo-thumbnails');
await mkdir(output, { recursive: true });
const manifest = {};
let originalBytes = 0;
let thumbnailBytes = 0;
async function walk(directory) {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
        const input = path.join(directory, entry.name);
        if (entry.isDirectory()) { await walk(input); continue; }
        if (!entry.isFile() || !/\.(jpe?g|png|webp)$/i.test(entry.name)) continue;
        const key = path.relative(source, input).split(path.sep).join('/');
        const bytes = await readFile(input);
        // Include encoding settings in the fingerprint when changing the recipe.
        const hash = createHash('sha256').update('square-webp-q76-v1').update(bytes).digest('hex').slice(0, 20);
        const variants = [];
        for (const width of [480, 960]) {
            const filename = `${hash}-${width}.webp`;
            const destination = path.join(output, filename);
            try { await stat(destination); } catch {
                await exec('magick', [input, '-auto-orient', '-colorspace', 'sRGB', '-strip',
                    '-thumbnail', `${width}x${width}^`, '-gravity', 'center', '-extent', `${width}x${width}`,
                    '-quality', '76', destination]);
            }
            const size = (await stat(destination)).size;
            if (width === 480) thumbnailBytes += size;
            variants.push({ width, url: `/assets/photo-thumbnails/${filename}` });
        }
        manifest[key] = { thumbnailUrl: variants[0].url,
            thumbnailSrcset: variants.map(({ width, url }) => `${url} ${width}w`).join(', ') };
        originalBytes += bytes.length;
    }
}
await walk(source);
if (!Object.keys(manifest).length) throw new Error('No supported photos; existing manifest left unchanged');
await writeFile(path.join(root, 'functions/photo-thumbnails.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ photos: Object.keys(manifest).length, originalBytes, thumbnail480Bytes: thumbnailBytes }));

if (temporarySource) await rm(temporarySource, { recursive: true, force: true });
