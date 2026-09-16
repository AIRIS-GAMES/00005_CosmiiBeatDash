const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'www');
const files = ['index.html', 'manifest.json', 'sw.js', 'collaboration-config.js', 'collaboration.js', 'collaboration.css', 'sun-rhythm.js', 'ui.js', 'ui.css', 'game-safety.js', 'html-audio.js', 'perf-hud.js'];
const dirs = ['Asset'];
// Retain source masters and store artwork in the repository, not the app bundle.
const sourceOnlyAssets = new Set(['stage01.mp3', 'stage2.mp3', 'stage03.mp3', 'bgm1.mp3', 'bgm2.mp3', 'bgm3.mp3', 'bgm4.mp3', 'icon.png', 'appstore-icon.png', 'appstore-icon-cosmy-purple.png'].map(file => path.join(root, 'Asset', file)));
const sandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'collaboration-config.js'), 'utf8'), sandbox);
const config = sandbox.COLLAB;
for (const value of [config.startsAt, config.endsAt]) {
  if (value !== null && (!/(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value)))) {
    throw new Error('Collaboration dates must be valid ISO dates with timezone');
  }
}
if (config.startsAt && config.endsAt && Date.parse(config.startsAt) >= Date.parse(config.endsAt)) throw new Error('Invalid collaboration date range');
const includeCollab = config.enabled && (!config.endsAt || Date.now() < Date.parse(config.endsAt));
const collabRoot = path.join(root, 'Asset', 'collaborations');
const allowed = new Set(['ohsun', 'ohsun/characters', ...Array.from({length:7}, (_, i) => `ohsun/characters/ohsun_${String(i + 7).padStart(2, '0')}.png`)]);
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
    if (source === collabRoot) return includeCollab;
    if (source.startsWith(collabRoot + path.sep)) return includeCollab && allowed.has(path.relative(collabRoot, source).split(path.sep).join('/'));
    return true;
  } });
}

if (!includeCollab && fs.existsSync(path.join(out, 'Asset', 'collaborations'))) throw new Error('Collaboration assets leaked into ended build');
console.log('Collaboration assets: ' + (includeCollab ? 'included (7 original PNGs only)' : 'excluded'));

console.log(`Capacitor web assets copied to ${path.relative(root, out)}`);
