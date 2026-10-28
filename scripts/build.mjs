// Packages AutoLike for Chrome and Firefox from one shared source tree.
// Usage: node scripts/build.mjs [chrome|firefox|all]   (default: all)
// Output: dist/<target>/ (unpacked) and dist/autolike-<target>-v<version>.zip
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const FILES = ['content.js', 'popup.html', 'popup.css', 'popup.js', 'icons', 'LICENSE', 'README.md', 'SECURITY.md'];

const readJson = (name) => JSON.parse(readFileSync(join(root, name), 'utf8'));
const base = readJson('manifest.json');
const targets = {
  chrome: base,
  firefox: { ...base, ...readJson('manifest.firefox.json') }
};

const requested = process.argv[2] || 'all';
const selected = requested === 'all' ? Object.keys(targets) : [requested];
for (const name of selected) {
  if (!targets[name]) {
    console.error(`Unknown target "${name}". Use chrome, firefox or all.`);
    process.exit(1);
  }
}

mkdirSync(dist, { recursive: true });
for (const name of selected) {
  const dir = join(dist, name);
  const zip = join(dist, `autolike-${name}-v${base.version}.zip`);
  rmSync(dir, { recursive: true, force: true });
  rmSync(zip, { force: true });
  mkdirSync(dir, { recursive: true });
  for (const file of FILES) cpSync(join(root, file), join(dir, file), { recursive: true });
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(targets[name], null, 2)}\n`);
  execFileSync('zip', ['-qr', zip, '.'], { cwd: dir });
  console.log(`Built ${name}: ${zip}`);
}
