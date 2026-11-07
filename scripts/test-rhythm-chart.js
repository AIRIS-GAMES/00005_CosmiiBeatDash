const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const context=vm.createContext({DH:360,GROUND:300,B:36,JUMP_H:73.8,TAP_OFFSET:.25});
for(const file of ['tracks.js','rhythm-beats.js'])vm.runInContext(fs.readFileSync(path.join(root,'Asset/audio',file),'utf8'),context);
vm.runInContext(html.slice(html.indexOf('function mulberry32('),html.indexOf('// ============ ゲーム状態')),context);
const reports=[];
for(const [file,grid] of Object.entries(context.RHYTHM_BEATS)){
  const duration=context.AUDIO_TRACKS[file].duration;
  assert(grid.beats.length>=16,`${file}: insufficient beat coverage`);
  for(let i=1;i<grid.beats.length;i++)assert(grid.beats[i].t>grid.beats[i-1].t);
  const counts=[];
  for(const diff of [0,.25,.55,1]){
    const chart=context.buildLevel(grid.beats,duration,17,diff);
    assert(chart.obs.length>10,`${file}: empty chart`);
    for(let i=0;i<chart.obs.length;i++){
      const o=chart.obs[i],tap=o.t-.25;
      assert(grid.beats.some(b=>Math.abs(b.t-tap)<1e-6),`${file}: off-beat obstacle`);
      assert(tap>=2&&tap<=duration-1.2,`${file}: unsafe intro/outro`);
      if(i)assert(o.t-chart.obs[i-1].t>=.66-.24*diff-1e-6,`${file}: unsafe gap`);
    }
    assert.deepEqual(chart,context.buildLevel(grid.beats,duration,17,diff),'Retries must retain their chart');
    counts.push(chart.obs.length);
  }
  reports.push({file,bpm:grid.bpm,counts});
}
assert(fs.readFileSync(path.join(root,'www/Asset/audio/rhythm-beats.js')).equals(fs.readFileSync(path.join(root,'Asset/audio/rhythm-beats.js'))));
console.log(reports);
console.log('Rhythm charts: all 7 tracks / 4 difficulties aligned, safe gaps, deterministic, bundled PASS');
