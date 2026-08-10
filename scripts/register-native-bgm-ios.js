const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'ios', 'App', 'App', 'capacitor.config.json');
const pluginPath = path.join(root, 'ios', 'App', 'App', 'NativeBgmPlugin.swift');

if (!fs.existsSync(configPath)) {
  throw new Error(`Missing iOS Capacitor config: ${configPath}`);
}
if (!fs.existsSync(pluginPath)) {
  throw new Error(`Missing native BGM plugin: ${pluginPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const classes = Array.isArray(config.packageClassList) ? config.packageClassList : [];
if (!classes.includes('NativeBgmPlugin')) classes.push('NativeBgmPlugin');
config.packageClassList = classes;

fs.writeFileSync(configPath, JSON.stringify(config, null, '\t') + '\n');
console.log('Registered NativeBgmPlugin in ios/App/App/capacitor.config.json');
