/* HTML media only; one BGM element and bounded file-backed effects. */
let musicEl=null,currentMusicUrl='',playbackGeneration=0;
const audioPrefs=(()=>{try{return {...{music:true,sound:true},...JSON.parse(localStorage.getItem('rdash_audio_prefs')||'{}')};}catch{return {music:true,sound:true};}})();
const effects=Object.fromEntries(Object.entries({death:.45,clear:.5,coin:.4,orb:.45,fever:.5}).map(([name,volume])=>{
 const audio=new Audio('Asset/audio/'+name+'.wav');audio.preload='auto';audio.volume=volume;return [name,{audio,version:0,at:0}];
}));
let audioUnlocked=false;
let lastCoinSfxAt=-Infinity;
function assetUrl(file){return new URL(file,location.href).href;}
function ensureMusicElement(){
 if(!musicEl){musicEl=new Audio();musicEl.preload='auto';musicEl.setAttribute('playsinline','');musicEl.volume=.20;}
 return musicEl;
}
function preloadTrack(url){
 const el=ensureMusicElement();
 if(el.src!==url){el.src=url;el.load();}
}
async function ensureAudio(){
 ensureMusicElement();
 if(!audioUnlocked){
  audioUnlocked=true;
  for(const entry of Object.values(effects)){
   const ticket=++entry.version,a=entry.audio;a.muted=true;
   try{const result=a.play();Promise.resolve(result).then(()=>{if(ticket===entry.version){a.pause();a.currentTime=0;a.muted=false;}},()=>{if(ticket===entry.version)a.muted=false;});}catch{a.muted=false;}
  }
 }
 return true;
}
function playSfx(name, burst=false){
 if(!audioPrefs.sound||document.hidden||!audioUnlocked)return;
 if(name==='coin'&&!burst&&typeof state!=='undefined'&&state==='play'&&typeof coinsLive!=='undefined'&&coinsLive.length){
  const now=performance.now();
  if(now-lastCoinSfxAt<70)return;
  lastCoinSfxAt=now;
 }
 const entry=effects[name];entry.version++;
 const playing=Object.values(effects).filter(e=>e!==entry&&!e.audio.paused).sort((a,b)=>a.at-b.at);
 while(playing.length>=3){const old=playing.shift();old.version++;old.audio.pause();}
 entry.at=performance.now();const a=entry.audio;a.muted=false;a.pause();
 try{a.currentTime=0;const result=a.play();if(result?.catch)result.catch(()=>{});}catch{}
}
function stopEffects(){for(const e of Object.values(effects)){e.version++;e.audio.pause();}}
function stopMusic(){playbackGeneration++;if(musicEl)musicEl.pause();stopEffects();}
function musicPosition(){return musicEl?musicEl.currentTime-0.9:songPos;}
function playTrack(offset,lead=0){
 const generation=++playbackGeneration,el=ensureMusicElement();
 el.pause();
 if(el.src!==currentMusicUrl){el.src=currentMusicUrl;el.load();}
 el.muted=!audioPrefs.music;
 const position=Math.max(0,offset+0.9-lead);
 attemptOffset=offset;
 beatIdx=beats.findIndex(b=>b.t>=offset-LEAD);if(beatIdx<0)beatIdx=beats.length;
 noteJudgeIdx=level.findIndex(o=>o.t-TAP_OFFSET>=offset-.5);if(noteJudgeIdx<0)noteJudgeIdx=level.length;
 const failed=()=>{if(generation!==playbackGeneration)return;window.gameSafety?.pause();toast('音声を再開できません。もう一度お試しください');};
 try{el.currentTime=position;const result=el.play();if(result?.catch)result.catch(failed);}catch{failed();}
}
function sfxDeath(){playSfx('death');}
function sfxClear(){playSfx('clear');}
function sfxCoin(){playSfx('coin');}
function sfxOrb(){playSfx('orb');}
function sfxFever(){playSfx('fever');}
window.gameAudio={
 settings:()=>({...audioPrefs}),
 preloadTrack,
 setSettings(prefs){
  if(typeof prefs.music==='boolean')audioPrefs.music=prefs.music;
  if(typeof prefs.sound==='boolean')audioPrefs.sound=prefs.sound;
  localStorage.setItem('rdash_audio_prefs',JSON.stringify(audioPrefs));
  if(musicEl)musicEl.muted=!audioPrefs.music;if(!audioPrefs.sound)stopEffects();
 },
 inspect:()=>({bgm:musicEl,sfx:Object.fromEntries(Object.entries(effects).map(([k,e])=>[k,e.audio]))})
};
function suspendAudio(){window.gameSafety?.pause();stopMusic();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendAudio();});
window.addEventListener('pagehide',suspendAudio);
