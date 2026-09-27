// Shared allowlist for local serving, production routing, and build output.
export const publicRootFiles = ['index.html', 'styles.css', 'script.js', 'viewers.js'];
export const vendorFiles = {
  'vendor/purify.min.js': 'node_modules/dompurify/dist/purify.min.js',
  'vendor/marked.umd.js': 'node_modules/marked/lib/marked.umd.js',
  'vendor/chart.umd.js': 'node_modules/chart.js/dist/chart.umd.js',
};

export function isPublicFile(pathname) {
  let name;
  try { name = decodeURIComponent(pathname).replace(/^\/+/, ''); }
  catch { return false; }
  if (name.includes('\\') || name.includes('\0') || name.split('/').some(part => part.startsWith('.') || !part)) return false;
  if (publicRootFiles.includes(name) || Object.hasOwn(vendorFiles, name)) return true;
  if (name === 'blog/posts.json' || name === 'blog/blog-style.css') return true;
  if (/^blog\/posts\/[a-z0-9-]+\.md$/.test(name)) return true;
  return /^assets\/.+\.(?:png|jpe?g|webp|gif|ico|svg|pdf|woff2?)$/i.test(name);
}
