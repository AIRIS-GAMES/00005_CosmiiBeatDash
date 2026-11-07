const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'www');
const files = ['beat-analytics.js', 'index.html', 'manifest.json', 'sw.js', 'cosmii-power.js', 'cosmii-character-motion.js', 'ui.js', 'ui.css', 'game-safety.js', 'html-audio.js', 'perf-hud.js', 'cosmii-world.js', 'cosmii-world.css', 'neon-theme.css', 'cosmii-opening.js', 'cosmii-opening.css', 'cosmii-home.js', 'cosmii-home.css', 'cosmii-ui-art.js', 'cosmii-ui-art.css', 'cosmii-typography.css', 'cosmii-calm.css', 'cosmii-tutorial.js', 'cosmii-tutorial.css'];
const dirs = ['Asset'];
// Retain source masters and store artwork in the repository, not the app bundle.
const sourceOnlyAssets = new Set(['stage01.mp3', 'stage2.mp3', 'stage03.mp3', 'bgm1.mp3', 'bgm2.mp3', 'bgm3.mp3', 'bgm4.mp3', 'icon.png', 'appstore-icon.png', 'appstore-icon-cosmy-purple.png'].map(file => path.join(root, 'Asset', file)));
// Keep reference artwork for future edits, but ship only the active designs.
for (const file of ['IMG_3158.PNG', 'IMG_3159.PNG', 'IMG_3160.PNG', 'IMG_3162.PNG',
  'world/cast', 'world/title-options.png', 'world/rhythm-cabinet.png',
  'world/cast-neon/reactions.png']) sourceOnlyAssets.add(path.join(root, 'Asset', file));
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
    if (/\.md$/i.test(source)) return false;
    return true;
  } });
}

console.log(`Capacitor web assets copied to ${path.relative(root, out)}`);
