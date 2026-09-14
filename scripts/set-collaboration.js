const fs = require('fs');
const path = require('path');
const mode = process.argv[2];
if (!['enable', 'disable'].includes(mode)) throw new Error('Use enable or disable');
const file = path.resolve(__dirname, '../collaboration-config.js');
const source = fs.readFileSync(file, 'utf8');
if (!/enabled: (true|false)/.test(source)) throw new Error('Configuration enabled field missing');
fs.writeFileSync(file, source.replace(/enabled: (true|false)/, 'enabled: ' + (mode === 'enable')));
console.log('Collaboration ' + mode + 'd. Run npm run web:build (or cap:build) and distribute www/.');
