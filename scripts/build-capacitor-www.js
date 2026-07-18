const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'www');
const files = ['index.html', 'manifest.json', 'sw.js'];
const dirs = ['Asset'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const file of files) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}

for (const dir of dirs) {
  fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
}

console.log(`Capacitor web assets copied to ${path.relative(root, out)}`);
