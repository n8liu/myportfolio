import { execFile } from 'child_process';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';

const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function execFileAsync(cmd, args) {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, (error, stdout, stderr) => {
            if (error) {
                const message = stderr?.toString() || error.message;
                reject(new Error(message));
                return;
            }
            resolve({ stdout: stdout?.toString() || '', stderr: stderr?.toString() || '' });
        });
    });
}

async function commandExists(cmd) {
    const whichCmd = os.platform() === 'win32' ? 'where' : 'which';
    try {
        await execFileAsync(whichCmd, [cmd]);
        return true;
    } catch {
        return false;
    }
}

async function ensureDir(dir) {
    await fsp.mkdir(dir, { recursive: true });
}

async function* walk(dir) {
    const dirents = await fsp.readdir(dir, { withFileTypes: true });
    for (const dirent of dirents) {
        const res = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
            yield* walk(res);
        } else {
            yield res;
        }
    }
}

function buildOutputs(inputPath, inputRoot, outputRoot) {
    const rel = path.relative(inputRoot, inputPath);
    const baseName = path.parse(rel).name; // without ext
    const relDir = path.dirname(rel);
    const outDir = path.join(outputRoot, relDir);
    return {
        outDir,
        jpg: {
            large: path.join(outDir, `${baseName}-large.jpg`),
            medium: path.join(outDir, `${baseName}-medium.jpg`),
            thumb: path.join(outDir, `${baseName}-thumb.jpg`)
        },
        webp: {
            large: path.join(outDir, `${baseName}-large.webp`),
            medium: path.join(outDir, `${baseName}-medium.webp`),
            thumb: path.join(outDir, `${baseName}-thumb.webp`)
        }
    };
}

async function resizeWithMagick(magickCmd, input, width, outJpg, outWebp, dryRun, quality) {
    const commonArgs = ['-auto-orient', '-strip', '-resize', `${width}x>`];
    if (dryRun) return;
    // JPG
    await execFileAsync(magickCmd, [input, ...commonArgs, '-sampling-factor', '4:2:0', '-quality', String(quality), outJpg]);
    // WebP
    await execFileAsync(magickCmd, [input, ...commonArgs, '-quality', String(quality), outWebp]);
}

async function resizePercentInPlace(magickCmd, input, percent, dryRun, quality) {
    if (dryRun) return;
    const tmp = `${input}.tmp-resize`;
    await execFileAsync(magickCmd, [input, '-auto-orient', '-strip', '-resize', `${percent}%`, '-sampling-factor', '4:2:0', '-quality', String(quality), tmp]);
    await fsp.rename(tmp, input);
}

async function processImage(magickCmd, file, inputRoot, outputRoot, dryRun, quality) {
    const { outDir, jpg, webp } = buildOutputs(file, inputRoot, outputRoot);
    await ensureDir(outDir);
    await resizeWithMagick(magickCmd, file, 1920, jpg.large, webp.large, dryRun, quality);
    await resizeWithMagick(magickCmd, file, 1280, jpg.medium, webp.medium, dryRun, quality);
    await resizeWithMagick(magickCmd, file, 480, jpg.thumb, webp.thumb, dryRun, quality);
}

async function main() {
    const args = process.argv.slice(2);
    const inputDir = path.resolve(args[0] || path.join(process.cwd(), 'photos'));
    // second arg remains outputDir for multi-size mode
    const outputDir = path.resolve(args[1] || path.join(process.cwd(), 'assets', 'resized'));
    const dryRun = args.includes('--dry-run');
    const inPlace = args.includes('--in-place');
    const scaleArg = args.find(a => a.startsWith('--scale='));
    const scale = scaleArg ? parseInt(scaleArg.split('=')[1], 10) : undefined;
    const qualityArg = args.find(a => a.startsWith('--quality='));
    const quality = qualityArg ? Math.max(40, Math.min(95, parseInt(qualityArg.split('=')[1], 10))) : 82;

    const hasMagick = await commandExists('magick');
    const hasConvert = await commandExists('convert');
    if (!hasMagick && !hasConvert) {
        console.error('ImageMagick is required (magick/convert not found in PATH).');
        process.exit(1);
    }
    const magickCmd = hasMagick ? 'magick' : 'convert';

    if (!fs.existsSync(inputDir)) {
        console.error(`Input directory not found: ${inputDir}`);
        process.exit(1);
    }
    if (!inPlace) {
        await ensureDir(outputDir);
    }

    const files = [];
    for await (const p of walk(inputDir)) {
        const ext = path.extname(p).toLowerCase();
        if (SUPPORTED_EXTS.has(ext)) files.push(p);
    }

    if (files.length === 0) {
        console.log('No images found to process.');
        process.exit(0);
    }

    console.log(`Processing ${files.length} images...`);
    if (scale && inPlace) {
        console.log(`Mode: in-place percentage resize at ${scale}%`);
    } else if (scale && !inPlace) {
        console.log(`Mode: percentage resize at ${scale}% into ${outputDir}`);
    } else {
        console.log(`Mode: multi-size export into ${outputDir}`);
    }

    // Simple concurrency control
    const concurrency = Math.max(1, Math.min(os.cpus().length, 4));
    let index = 0;
    let processed = 0;
    const worker = async () => {
        while (true) {
            const i = index++;
            if (i >= files.length) return;
            const file = files[i];
            try {
                if (scale) {
                    if (inPlace) {
                        await resizePercentInPlace(magickCmd, file, scale, dryRun, quality);
                    } else {
                        // write one output per file at given percent, keep extension
                        const rel = path.relative(inputDir, file);
                        const relDir = path.dirname(rel);
                        const baseName = path.parse(rel).name;
                        const outDir = path.join(outputDir, relDir);
                        await ensureDir(outDir);
                        const outExt = '.jpg';
                        const outPath = path.join(outDir, `${baseName}-${scale}pct${outExt}`);
                        if (!dryRun) {
                            await execFileAsync(magickCmd, [file, '-auto-orient', '-strip', '-resize', `${scale}%`, '-sampling-factor', '4:2:0', '-quality', String(quality), outPath]);
                        }
                    }
                } else {
                    await processImage(magickCmd, file, inputDir, outputDir, dryRun, quality);
                }
                processed++;
                if (!dryRun) {
                    console.log(`[${processed}/${files.length}] ${path.relative(inputDir, file)}`);
                } else {
                    console.log(`[dry-run] ${path.relative(inputDir, file)}`);
                }
            } catch (err) {
                console.error(`Failed to process ${file}: ${err.message}`);
            }
        }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    console.log('Done. Outputs in:', outputDir);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});


