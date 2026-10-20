import { build } from 'vite';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Relocate a deployment copy only. Source assets and the frozen root-host build
// stay untouched. Never rewrite external URLs or provider subtitle payloads.
export function relocatePublicPaths(text, base) {
  return text.replace(/(["'`(=])\/(assets\/|data\/|project-review\/|qa\/|#\/)/g,
    (_, delimiter, prefix) => `${delimiter}${base}${prefix}`);
}

export async function buildPages() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const base = '/tibet-explorer/';
  const outDir = path.join(root, 'dist/pages');
  await build({ root, base, build: { outDir, emptyOutDir: true } });
  let changed = 0;
  async function visit(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) { await visit(file); continue; }
      if (!/\.(js|css|html|json)$/.test(file)) continue;
      const relative = path.relative(outDir, file).replaceAll('\\', '/');
      if (relative.startsWith('assets/audio/narration/') && entry.name !== 'cue-manifest.json') continue;
      const original = await readFile(file, 'utf8');
      const relocated = relocatePublicPaths(original, base);
      if (original !== relocated) { await writeFile(file, relocated); changed++; }
    }
  }
  await visit(outDir);
  await writeFile(path.join(outDir, '.nojekyll'), '');
  // Fail deployment rather than silently losing provider word timing or media.
  const { createHash } = await import('node:crypto');
  const manifest = JSON.parse(await readFile(path.join(outDir, 'assets/audio/narration/cue-manifest.json'), 'utf8'));
  for (const clip of manifest.clips) {
    for (const [url, expected] of [[clip.url, clip.sha256], [clip.subtitleUrl, clip.subtitleSha256]]) {
      if (!url?.startsWith(base) || !expected) throw new Error(`Incomplete clip: ${clip.id}`);
      const bytes = await readFile(path.join(outDir, url.slice(base.length)));
      if (createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error(`Media integrity: ${url}`);
    }
  }
  console.log(`Pages: ${changed} relocated text files; ${manifest.clips.length} audio/subtitle pairs byte-verified.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await buildPages();
