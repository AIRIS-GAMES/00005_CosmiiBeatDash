/* HTML media only: one BGM element plus a bounded pool of file-backed effects.

   Output levels are a product requirement, not a taste call. Screen recording
   taps the app mix before hardware volume, so a quiet mix records its own noise
   floor. Effect files are all normalised to one peak by
   scripts/generate-audio-assets.js; the gains below are the whole relative
   balance, and Asset/audio/tracks.js carries a per-track BGM gain that puts
   every stage at the same effective peak. Keep these in step with
   scripts/audio-levels.js - test-audio-levels.js fails if they drift. */
const SFX_GAIN={death:.45,clear:.5,coin:.4,orb:.45,fever:.5,perfect:.27,great:.26,good:.25,miss:.25,count:.42,go:.5};
/* Pool depth per effect. Restarting a media element is expensive on iOS, so the
   task that starts a sound does nothing but play(); rewinding happens on
   'ended'. One voice per effect; only one effect may sound at any time. */
const SFX_POOL_SIZE={death:1,clear:1,coin:0,orb:1,fever:1,perfect:1,great:1,good:1,miss:1,count:1,go:1};
/* Only the high-frequency effects hold a warm media pipeline. */
const SFX_EAGER_PRELOAD=['orb','perfect','great','good','miss','count','go'];
const MAX_CONCURRENT_SFX=1;
const SFX_PRIORITY=['death','clear','fever','go','count'],SFX_TICKS=['perfect','great','good','miss'];
const SFX_RETRIGGER_MS=100;
// Used only if a track carries no measured gain; see setMusicTrack.
const FALLBACK_MUSIC_GAIN=0.3;

let musicEl=null,currentMusicUrl='',currentMusicGain=FALLBACK_MUSIC_GAIN,playbackGeneration=0;
const audioPrefs=(()=>{try{return {...{music:true,sound:true},...JSON.parse(localStorage.getItem('rdash_audio_prefs')||'{}')};}catch{return {music:true,sound:true};}})();
for(const key of ['musicVolume','soundVolume'])audioPrefs[key]=Number.isFinite(audioPrefs[key])?Math.max(0,Math.min(1,audioPrefs[key])):1;
const effects=Object.fromEntries(Object.entries(SFX_GAIN).map(([name,gain])=>{
 const voices=Array.from({length:SFX_POOL_SIZE[name]},()=>{
  const audio=new Audio('Asset/audio/'+name+'.wav');
  audio.preload=SFX_EAGER_PRELOAD.includes(name)?'auto':'none';
  audio.volume=gain*audioPrefs.soundVolume;audio.setAttribute('playsinline','');
  const voice={name,audio,busy:false,startedAt:0,token:0};
  // Rewinding here keeps the start task down to a single play() call.
  audio.addEventListener('ended',()=>{voice.busy=false;try{audio.currentTime=0;}catch{}});
  return voice;
 });
 return [name,{gain,voices,lastStart:-Infinity}];
}));
let audioUnlocked=false;
function assetUrl(file){return new URL(file,location.href).href;}
// An explicit stop can cut short play() and reject with AbortError.
function ignorePlayRejection(voice,token){return error=>{if(voice.token===token)voice.busy=false;if(error&&error.name&&error.name!=='AbortError'&&error.name!=='NotAllowedError')console.warn('audio: '+error.name);};}
function releaseVoice(voice){voice.token++;voice.busy=false;voice.audio.pause();try{voice.audio.currentTime=0;}catch{}}
function activeVoices(){const list=[];for(const entry of Object.values(effects))for(const voice of entry.voices)if(voice.busy)list.push(voice);return list.sort((a,b)=>a.startedAt-b.startedAt);}
function ensureMusicElement(){
 if(!musicEl){musicEl=new Audio();musicEl.preload='auto';musicEl.setAttribute('playsinline','');musicEl.volume=currentMusicGain*audioPrefs.musicVolume;}
 return musicEl;
}
// Sets both the source and its measured playback gain; never set one alone.
// A track with no measured gain falls back to the middle of the measured range
// rather than to 1.0, which would play roughly four times too hot and could
// clip against the effects. test-audio-levels.js fails if a gain is missing.
function setMusicTrack(track){
 if(previewing){const p=previewing;previewing=null;playbackGeneration++;p.onEnd?.();}
 currentMusicUrl=assetUrl(track.playback);
 currentMusicGain=typeof track.gain==='number'?track.gain:FALLBACK_MUSIC_GAIN;
 const el=ensureMusicElement();el.pause();resetMusicClock();el.volume=currentMusicGain*audioPrefs.musicVolume;
 if(el.src!==currentMusicUrl){el.src=currentMusicUrl;el.load();}
}
async function ensureAudio(){
 ensureMusicElement();
 if(!audioUnlocked){
  audioUnlocked=true;
  // iOS unlocks media elements one at a time, so every pooled voice needs its
  // own muted play inside the gesture.
  for(const entry of Object.values(effects))for(const voice of entry.voices){
   const token=++voice.token,a=voice.audio;a.muted=true;
   try{const result=a.play();Promise.resolve(result).then(()=>{if(token===voice.token){a.pause();try{a.currentTime=0;}catch{}a.muted=false;}},()=>{if(token===voice.token)a.muted=false;});}catch{a.muted=false;}
  }
 }
 return true;
}
// Start now or drop: never schedule a pickup sound for a later task. Reserving
// the sole slot before play() also excludes other effects while play is pending.
function playSfx(name,pitch=1){
 if(!audioPrefs.sound||audioPrefs.soundVolume===0||document.hidden||!audioUnlocked)return;
 const entry=effects[name],now=performance.now();
 if(now-entry.lastStart<SFX_RETRIGGER_MS)return;
 let active=activeVoices();
 // Keep the voices already sounding. Stealing adds pause + seek + play work
 // exactly when effects are busiest; excess requests are dropped instead -
 // except that death / clear / fever cut a judgement tick short (they matter more).
 if(active.length>=MAX_CONCURRENT_SFX&&SFX_PRIORITY.includes(name)){for(const v of active)if(SFX_TICKS.includes(v.name)||(v.name==='count'&&name!=='count'))releaseVoice(v);active=activeVoices();}
 if(active.length>=MAX_CONCURRENT_SFX)return;
 // A free voice is already rewound, so the common path costs one play() call.
 const voice=entry.voices.find(v=>!v.busy);
 if(!voice)return;
 if(name==='perfect'){
  // Transpose the file itself instead of time-stretching at the original pitch.
  voice.audio.preservesPitch=false;
  if('webkitPreservesPitch' in voice.audio)voice.audio.webkitPreservesPitch=false;
  if(voice.audio.playbackRate!==pitch)voice.audio.playbackRate=pitch;
 }
 const token=++voice.token;
 entry.lastStart=now;voice.startedAt=now;voice.busy=true;
 // Reading muted is free; writing it is pipeline work. Voices are left unmuted
 // after the gesture unlock, so this only writes if that unlock is still in
 // flight - it must not cost anything on the steady-state firing frame.
 if(voice.audio.muted)voice.audio.muted=false;
 try{const result=voice.audio.play();if(result&&result.catch)result.catch(ignorePlayRejection(voice,token));}
 catch{voice.busy=false;}
}
// An explicit stop (stage exit, death, clear, backgrounding) also clears the
// retrigger guard: it exists to bound repeats, not to mute the next attempt.
function stopEffects(){
 for(const entry of Object.values(effects)){entry.lastStart=-Infinity;for(const voice of entry.voices)releaseVoice(voice);}
}
// Fade the BGM out over `seconds`, then stop it (the goal's afterglow). Any
// later stop or play (a new generation) cancels the fade.
function fadeOutMusic(seconds){
 if(!musicEl||musicEl.paused){stopMusic();return;}
 const generation=++playbackGeneration,el=musicEl,v0=el.volume,t0=performance.now();
 // iOS ignores element volume: there the song simply plays on under the
 // result card until it ends or the player leaves (any stop cancels it).
 try{el.volume=v0*0.5;}catch{}
 const canFade=Math.abs(el.volume-v0*0.5)<0.01;el.volume=v0;
 if(!canFade)return;
 const step=()=>{
  if(generation!==playbackGeneration)return;
  const k=Math.min(1,(performance.now()-t0)/(seconds*1000));
  el.volume=v0*(1-k)*(1-k);
  if(k<1&&!el.paused&&!el.ended)setTimeout(step,50);
  else{el.pause();el.volume=v0;resetMusicClock();}
 };
 setTimeout(step,50);
}
// Stage-select listening (♪ on a cleared stage's card): the same single music
// element, from `start` seconds, looping. Any game start or stop replaces it.
let previewing=null;
function previewTrack(track,start,onEnd){
 const generation=++playbackGeneration,el=ensureMusicElement();
 currentMusicUrl=assetUrl(track.playback);
 currentMusicGain=typeof track.gain==='number'?track.gain:FALLBACK_MUSIC_GAIN;
 el.pause();if(el.src!==currentMusicUrl){el.src=currentMusicUrl;el.load();}
 el.volume=currentMusicGain*audioPrefs.musicVolume;el.muted=!audioPrefs.music||audioPrefs.musicVolume===0;
 previewing={generation,start,onEnd};
 const go=()=>{if(generation!==playbackGeneration)return;try{el.currentTime=start;}catch{}Promise.resolve(el.play()).catch(()=>{if(generation===playbackGeneration){previewing=null;onEnd?.();}});};
 if(el.readyState>=1)go();else el.addEventListener('loadedmetadata',go,{once:true});
 el.onended=()=>{if(previewing&&previewing.generation===playbackGeneration)go();};
 return generation;
}
function stopPreview(){if(!previewing)return;const p=previewing;previewing=null;if(p.generation===playbackGeneration)stopMusic();p.onEnd?.();}
function stopMusic(){if(previewing){const p=previewing;previewing=null;p.onEnd?.();}playbackGeneration++;if(musicEl)musicEl.pause();resetMusicClock();stopEffects();}
/* HTMLMediaElement.currentTime is updated on media buffer boundaries, not once
   per animation frame. Measured on desktop Chromium during play: 20.6% of
   frames saw no change at all, so the drawn position stair-stepped roughly one
   frame in five. Rendering was a solid 60fps throughout - this is a clock
   problem, not a fill-rate one.

   The gap is filled from the wall clock while staying slaved to the element:
   the estimate re-anchors on every genuine currentTime update, only advances
   while the element is really playing, and never runs more than
   MEDIA_CLOCK_LEAD_MAX ahead of the last real reading. Buffering therefore
   still cannot silently advance the level, which is the property
   AUDIO_MIGRATION.md requires. The result is also monotonic: an interpolated
   estimate is never taken back, because the game loop treats a backward
   position as zero elapsed time and would scroll backwards. */
const MEDIA_CLOCK_LEAD_MAX=0.05;
const MEDIA_CLOCK_RESEEK=0.25;
/* Unverified on desktop: measured at the game's own sampling point, the drawn
   position stair-steps on only ~1.5% of frames with or without smoothing, so
   Chromium gives no evidence either way. It is kept on by default because it
   costs nothing and iOS WebView is the case desktop cannot reproduce. Turn it
   off on device to A/B without a rebuild:
     gameAudio.setClockSmoothing(false)   // persists, reload-safe */
// ?clock=raw / ?clock=smoothed wins over the stored value, so this can be
// A/B'd from a phone with no debugger attached.
let clockSmoothing=(()=>{
 const q=new URLSearchParams(location.search).get('clock');
 if(q==='raw')return false;
 if(q==='smoothed')return true;
 try{return localStorage.getItem('rdash_clock_smoothing')!=='0';}catch{return true;}
})();
let clockMedia=-1,clockWall=0,clockOut=-Infinity;
function resetMusicClock(){clockMedia=-1;clockWall=0;clockOut=-Infinity;}
function musicPosition(){
 if(!musicEl)return songPos;
 if(!clockSmoothing)return musicEl.currentTime-0.9;
 const media=musicEl.currentTime,now=performance.now();
 if(clockMedia<0||Math.abs(media-clockMedia)>MEDIA_CLOCK_RESEEK){
  clockMedia=media;clockWall=now;clockOut=media-0.9;return clockOut;
 }
 if(media!==clockMedia){clockMedia=media;clockWall=now;}
 let out=clockMedia-0.9;
 if(!musicEl.paused&&!musicEl.seeking&&musicEl.readyState>=3)
  out+=Math.min((now-clockWall)/1000*(musicEl.playbackRate||1),MEDIA_CLOCK_LEAD_MAX);
 if(out<clockOut)out=clockOut;
 clockOut=out;return out;
}
// True once the BGM has played out (index.html then finishes the stage on the frame clock).
window.musicEnded=()=>!!musicEl&&(musicEl.ended||(musicEl.duration>0&&musicEl.currentTime>=musicEl.duration-0.02));
function playTrack(offset,lead=0,newAttempt=false){
 const generation=++playbackGeneration,el=ensureMusicElement();
 el.pause();
 if(el.src!==currentMusicUrl){el.src=currentMusicUrl;el.load();}
 el.volume=currentMusicGain*audioPrefs.musicVolume;
 el.muted=!audioPrefs.music||audioPrefs.musicVolume===0;
 const position=Math.max(0,offset+0.9-lead);
 attemptOffset=offset;
 beatIdx=beats.findIndex(b=>b.t>=offset-LEAD);if(beatIdx<0)beatIdx=beats.length;
 noteJudgeIdx=level.findIndex(o=>o.t-TAP_OFFSET>=offset-.5);if(noteJudgeIdx<0)noteJudgeIdx=level.length;
 const failed=()=>{if(generation!==playbackGeneration)return;window.gameSafety?.pause();toast('音声を再開できません。もう一度お試しください');};
 resetMusicClock();
 try{el.currentTime=position;const result=el.play();Promise.resolve(result).then(()=>{if(generation===playbackGeneration&&state==='play')window.beatPSF?.start(offset,newAttempt);},failed);}catch{failed();}
}
function sfxDeath(){playSfx('death');}
function sfxClear(){playSfx('clear');}
// Coin pickups and paid continues are silent; no coin media element is created.
function sfxCoin(){}
function sfxOrb(){playSfx('orb');}
// Judgement ticks (PERFECT / GREAT / GOOD / MISS).
function sfxJudge(kind,comboCount=0){
 if(!SFX_TICKS.includes(kind))return;
 // Five-combo milestones climb a pentatonic scale, capped at one octave.
 const count=Number.isFinite(comboCount)?Math.max(0,comboCount):0;
 const semitones=[0,2,4,7,9,12][Math.min(5,Math.floor(count/5))];
 playSfx(kind,kind==='perfect'?2**(semitones/12):1);
}
function sfxFever(){playSfx('fever');}
// Count-in: 3, 2, 1 pips and the GO! hit.
function sfxCount(){playSfx('count');}
function sfxGo(){playSfx('go');}
window.gameAudio={
 settings:()=>({...audioPrefs}),
 setSettings(prefs){
  if(typeof prefs.music==='boolean')audioPrefs.music=prefs.music;
  if(typeof prefs.sound==='boolean')audioPrefs.sound=prefs.sound;
  for(const key of ['musicVolume','soundVolume'])if(Number.isFinite(prefs[key]))audioPrefs[key]=Math.max(0,Math.min(1,prefs[key]));
  localStorage.setItem('rdash_audio_prefs',JSON.stringify(audioPrefs));
  if(musicEl){musicEl.volume=currentMusicGain*audioPrefs.musicVolume;musicEl.muted=!audioPrefs.music||audioPrefs.musicVolume===0;}
  for(const entry of Object.values(effects))for(const voice of entry.voices)voice.audio.volume=entry.gain*audioPrefs.soundVolume;
  if(!audioPrefs.sound||audioPrefs.soundVolume===0)stopEffects();
 },
 setClockSmoothing(on){clockSmoothing=!!on;localStorage.setItem('rdash_clock_smoothing',on?'1':'0');resetMusicClock();},
 clockSmoothing:()=>clockSmoothing,
 levels:()=>({gain:{...SFX_GAIN},pool:{...SFX_POOL_SIZE},maxConcurrent:MAX_CONCURRENT_SFX,retriggerMs:SFX_RETRIGGER_MS,musicGain:currentMusicGain}),
 inspect:()=>({bgm:musicEl,sfx:Object.fromEntries(Object.entries(effects).map(([k,e])=>[k,e.voices.map(v=>v.audio)]))})
};
function suspendAudio(){window.gameSafety?.pause();stopMusic();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendAudio();});
window.addEventListener('pagehide',suspendAudio);
// Restoring from the back/forward cache can resume a media element on its own.
// BGM restarts only from the pause panel, so anything not in play state stays stopped.
window.addEventListener('pageshow',()=>{if(typeof state!=='undefined'&&state!=='play'&&musicEl&&!musicEl.paused)musicEl.pause();});
