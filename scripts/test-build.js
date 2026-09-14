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
for(const file of ['index.html','sw.js','ui.js','ui.css','html-audio.js','collaboration-config.js']){
  assert(fs.readFileSync(path.join(root,file)).equals(fs.readFileSync(path.join(out,file))),`Stale build: ${file}`);
}
console.log('Build assets: PASS');
