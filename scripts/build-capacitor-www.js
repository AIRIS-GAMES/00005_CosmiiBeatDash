const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'www');
const files = ['index.html', 'manifest.json', 'sw.js', 'cosmii-power.js', 'ui.js', 'ui.css', 'game-safety.js', 'html-audio.js', 'perf-hud.js'];
const dirs = ['Asset'];
// Retain source masters and store artwork in the repository, not the app bundle.
const sourceOnlyAssets = new Set(['stage01.mp3', 'stage2.mp3', 'stage03.mp3', 'bgm1.mp3', 'bgm2.mp3', 'bgm3.mp3', 'bgm4.mp3', 'icon.png', 'appstore-icon.png', 'appstore-icon-cosmy-purple.png'].map(file => path.join(root, 'Asset', file)));
// Only the resolved generated output directory may be rebuilt.
if (out !== path.join(root, 'www') || fs.existsSync(out) && fs.lstatSync(out).isSymbolicLink()) throw new Error('Unsafe output directory');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}

for (const dir of dirs) {
  fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true, filter(source) {
    if (sourceOnlyAssets.has(source)) return false;
    return true;
  } });
}

console.log(`Capacitor web assets copied to ${path.relative(root, out)}`);
