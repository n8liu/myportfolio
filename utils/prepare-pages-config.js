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
    content = content.replace(/main\s*=\s*"[^"]*"/, 'pages_build_output_dir = "dist"');
    
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

// 2. Inject API_BASE into script.js and viewers.js in dist
const apiBase = process.env.API_BASE || 'https://myportfolio.nathanliu528.workers.dev';
console.log(`Injecting production API base URL: ${apiBase}`);

const scriptDistPath = path.join(projectRoot, 'dist', 'script.js');
const viewersDistPath = path.join(projectRoot, 'dist', 'viewers.js');

try {
  if (fs.existsSync(scriptDistPath)) {
    let content = fs.readFileSync(scriptDistPath, 'utf8');
    // Replace const API_BASE = ''; or const API_BASE = "";
    content = content.replace(/const\s+API_BASE\s*=\s*['"]['"];?/, `const API_BASE = '${apiBase}';`);
    fs.writeFileSync(scriptDistPath, content);
    console.log('Successfully injected API_BASE into dist/script.js');
  } else {
    console.warn('Warning: dist/script.js not found for API_BASE injection.');
  }

  if (fs.existsSync(viewersDistPath)) {
    let content = fs.readFileSync(viewersDistPath, 'utf8');
    // Replace const workerBase = ''; or const workerBase = "";
    content = content.replace(/const\s+workerBase\s*=\s*['"]['"];?/, `const workerBase = '${apiBase}';`);
    fs.writeFileSync(viewersDistPath, content);
    console.log('Successfully injected workerBase into dist/viewers.js');
  } else {
    console.warn('Warning: dist/viewers.js not found for workerBase injection.');
  }
} catch (error) {
  console.error('Error injecting production api base into dist assets:', error);
  process.exit(1);
}
