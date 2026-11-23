const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
require('./build-appsflyer.js');
const out = path.join(root, 'www');
const files = ['beat-analytics.js', 'index.html', 'manifest.json', 'sw.js', 'cosmii-power.js', 'stage-gimmicks.js', 'world-skins.js', 'stage-select.js', 'stage-select.css', 'cosmii-character-motion.js', 'cosmii-rides.js', 'cosmii-rides.css', 'cosmii-mobile-dialogs.css', 'ui.js', 'ui.css', 'game-safety.js', 'html-audio.js', 'perf-hud.js', 'cosmii-world.js', 'cosmii-world.css', 'neon-theme.css', 'cosmii-opening.js', 'cosmii-opening.css', 'cosmii-home.js', 'cosmii-home.css', 'cosmii-ui-art.js', 'cosmii-ui-art.css', 'cosmii-typography.css', 'cosmii-calm.css', 'cosmii-tutorial.js', 'cosmii-tutorial.css', 'cosmii-fx.js', 'cosmii-fx.css', 'cosmii-impact.js', 'cosmii-source.js', 'cosmii-source.css', 'cosmii-dialogs.css', 'cosmii-screens.css', 'cosmii-welcome.js', 'cosmii-welcome.css', 'cosmii-guide.js', 'cosmii-guide.css', 'cosmii-bond.js', 'cosmii-bond.css', 'cosmii-wardrobe-anchors.js', 'cosmii-wardrobe.js', 'cosmii-capsule.js', 'cosmii-capsule.css'];
const dirs = ['Asset'];
files.push('cosmii-appsflyer.js');
// Retain source masters and store artwork in the repository, not the app bundle.
const sourceOnlyAssets = new Set(['stage01.mp3', 'stage2.mp3', 'stage03.mp3', 'bgm1.mp3', 'bgm2.mp3', 'bgm3.mp3', 'bgm4.mp3', 'icon.png', 'appstore-icon.png', 'appstore-icon-cosmy-purple.png'].map(file => path.join(root, 'Asset', file)));
// Keep reference artwork for future edits, but ship only the active designs.
for (const file of ['world/cast']) sourceOnlyAssets.add(path.join(root, 'Asset', file));
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
    // Full-size masters for scripts/resize-display-assets.py; the resized copies ship.
    if (source === path.join(root, 'Asset', 'masters') || source.startsWith(path.join(root, 'Asset', 'masters') + path.sep)) return false;
    // World BGM sources are the beat-tracking timeline only; the game plays Asset/audio/world-*.mp3.
    if (source === path.join(root, 'Asset', 'world-bgm') || source.startsWith(path.join(root, 'Asset', 'world-bgm') + path.sep)) return false;
    if (/\.md$/i.test(source)) return false;
    return true;
  } });
}

console.log(`Capacitor web assets copied to ${path.relative(root, out)}`);
