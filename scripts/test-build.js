const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'www');
for(const file of ['stage01.mp3','stage2.mp3','stage03.mp3','bgm1.mp3','bgm2.mp3','bgm3.mp3','bgm4.mp3','icon.png','appstore-icon.png','appstore-icon-cosmy-purple.png']){
  assert(fs.existsSync(path.join(root,'Asset',file)),`Missing original: ${file}`);
  assert(!fs.existsSync(path.join(out,'Asset',file)),`Source-only asset bundled: ${file}`);
}
for(const file of ['stage01.mp3','stage2.mp3','stage03.mp3','bgm1.mp3','bgm2.mp3','bgm3.mp3','bgm4.mp3','death.wav','clear.wav','coin.wav','orb.wav','fever.wav']){
  assert(fs.existsSync(path.join(out,'Asset/audio',file)),`Missing playback asset: ${file}`);
}
for(const file of ['index.html','sw.js','ui.js','ui.css','html-audio.js','cosmii-power.js','cosmii-world.js','cosmii-world.css','neon-theme.css', 'cosmii-opening.js', 'cosmii-opening.css', 'cosmii-home.js', 'cosmii-home.css', 'cosmii-ui-art.js', 'cosmii-ui-art.css']){
  assert(fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(out,file))),`Stale build: ${file}`);
}
for(const file of ['collaboration.js','collaboration.css','collaboration-config.js','sun-rhythm.js']){
  assert(!fs.existsSync(path.join(out,file)),`Removed collaboration code bundled: ${file}`);
}
assert(!fs.existsSync(path.join(out,'Asset','collaborations')),'Removed collaboration artwork bundled');
for (const file of ['fonts/MPLUSRounded1c-Regular.ttf','fonts/MPLUSRounded1c-Bold.ttf',
  'IMG_3158.PNG','IMG_3159.PNG','IMG_3160.PNG','IMG_3162.PNG','world/cast',
  'world/title-options.png','world/rhythm-cabinet.png','world/cast-neon/reactions.png']) {
  assert(!fs.existsSync(path.join(out,'Asset',file)),`Unused asset bundled: ${file}`);
}
// Evaluate the worker's real manifest so deleting an asset cannot silently break offline install.
const vm=require('node:vm');
const precache=vm.runInNewContext(fs.readFileSync(path.join(out,'sw.js'),'utf8')+'\nASSETS;', {self:{addEventListener(){}}});
for(const file of precache) assert(fs.existsSync(path.resolve(out,file)),`Missing precache asset: ${file}`);
for(const file of fs.readdirSync(root).filter(f=>/\.(js|css)$/.test(f))) {
  if(fs.existsSync(path.join(out,file))) assert(fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(out,file))),`Stale build: ${file}`);
}
console.log('Build assets: PASS');
