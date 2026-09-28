import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 1. Prepare Pages wrangler.toml
const srcWrangler = path.join(projectRoot, 'wrangler.toml');
const destWrangler = path.join(projectRoot, 'dist', 'wrangler.toml');

try {
  if (fs.existsSync(srcWrangler)) {
    let content = fs.readFileSync(srcWrangler, 'utf8');
    
    // Replace the main worker entrypoint line with Pages build output dir config
    content = content.replace(/^main\s*=\s*"[^"]*"/m, 'pages_build_output_dir = "."');

    // Pages binds to the existing Worker's Durable Objects; it cannot deploy them.
    const workerName = content.match(/^name\s*=\s*"([^"]+)"/m)?.[1];
    if (!workerName) throw new Error('Worker name is required for Durable Object bindings');
    content = content.replace(/(class_name\s*=\s*"[^"]+")(\s*})/g,
      `$1, script_name = "${workerName}"$2`);
    content = content.replace(/^\[\[migrations\]\][\s\S]*?(?=^\[|$(?![\s\S]))/gm, '');
    
    // Ensure dist directory exists
    const distDir = path.dirname(destWrangler);
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    fs.writeFileSync(destWrangler, content);
    console.log('Successfully generated dist/wrangler.toml from root wrangler.toml');
  } else {
    console.error('Error: Root wrangler.toml not found at:', srcWrangler);
    process.exit(1);
  }
} catch (error) {
  console.error('Error preparing Pages configuration:', error);
  process.exit(1);
}

// Browser APIs stay same-origin in both development and production. Pages
// routes /api/* through its external Durable Object bindings. Do not inject a
// workers.dev URL: it bypasses that route and introduces cross-origin failures.
