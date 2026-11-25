/* Offline asset preparation only.
   Full run requires FFMPEG env var or ffmpeg on PATH.
   `--sfx-only` regenerates just the WAV effects and needs no ffmpeg.
   Output levels come from scripts/audio-levels.js; do not hardcode them here. */
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const LEVELS=require('./audio-levels.js');
const root=path.resolve(__dirname,'..'),out=path.join(root,'Asset','audio');
const sfxOnly=process.argv.includes('--sfx-only');
fs.mkdirSync(out,{recursive:true});
const ffmpeg=process.env.FFMPEG||'ffmpeg';
function analyzeBeats(buf) {
  const sr = buf.sampleRate, hop = 512, win = 1024;
  const a = buf.getChannelData(0);
  const b = buf.numberOfChannels > 1 ? buf.getChannelData(1) : a;
  const n = Math.max(1, Math.floor((a.length - win) / hop));
  const en = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0, o = i * hop;
    for (let j = 0; j < win; j += 2) { const v = (a[o+j]+b[o+j])*0.5; s += v*v; }
    en[i] = s;
  }
  const flux = new Float32Array(n);
  for (let i = 1; i < n; i++) flux[i] = Math.max(0, en[i]-en[i-1]);
  let gm = 0; for (let i = 0; i < n; i++) gm += flux[i]; gm /= n;
  const beats = [];
  const R = 16;
  for (let i = 3; i < n-3; i++) {
    let lm = 0, c = 0;
    for (let j = Math.max(0, i-R); j < Math.min(n, i+R); j++) { lm += flux[j]; c++; }
    lm /= c;
    if (flux[i] > lm*1.7 + gm*0.12 &&
        flux[i] >= flux[i-1] && flux[i] >= flux[i-2] &&
        flux[i] >= flux[i+1] && flux[i] >= flux[i+2]) {
      beats.push({ t: (i*hop + win/2)/sr, s: flux[i]/(lm+1e-9) });
    }
  }
  if (beats.length < buf.duration * 0.6) {
    beats.length = 0;
    for (let t = 0.5; t < buf.duration - 1; t += 0.5) beats.push({ t, s: 1 });
  }
  return beats;
}

function decodeFloat(file){
 const r=spawnSync(ffmpeg,['-v','error','-i',file,'-f','f32le','-ar','48000','-ac','2','pipe:1'],{maxBuffer:256*1024*1024});
 if(r.status!==0)throw new Error(String(r.stderr));
 const frames=r.stdout.length/8,a=new Float32Array(frames),b=new Float32Array(frames);
 for(let i=0;i<frames;i++){a[i]=r.stdout.readFloatLE(i*8);b[i]=r.stdout.readFloatLE(i*8+4);}
 return {sampleRate:48000,duration:frames/48000,numberOfChannels:2,getChannelData:i=>i?b:a};
}

if(!sfxOnly){
 const tracks={};
 for(const file of ['stage01.mp3','stage2.mp3','stage03.mp3','bgm1.mp3','bgm2.mp3','bgm3.mp3','bgm4.mp3']){
  const input=path.join(root,'Asset',file);
  const buf=decodeFloat(input);
  const encoded=spawnSync(ffmpeg,['-v','error','-y','-i',input,'-af','volume=0.6,adelay=900|900','-codec:a','libmp3lame','-q:a','5',path.join(out,file)]);
  if(encoded.status!==0)throw new Error(String(encoded.stderr));
  // Measure what actually ships: lossy encoding does not preserve the input peak.
  const played=decodeFloat(path.join(out,file));
  let peak=0;
  for(let ch=0;ch<played.numberOfChannels;ch++){const d=played.getChannelData(ch);for(let i=0;i<d.length;i++){const v=Math.abs(d[i]);if(v>peak)peak=v;}}
  const gain=Math.min(1,LEVELS.BGM_TARGET_PEAK/peak);
  tracks['Asset/'+file]={duration:buf.duration,beats:analyzeBeats(buf),playback:'Asset/audio/'+file,peak:+peak.toFixed(5),gain:+gain.toFixed(5)};
  console.log(file+': file peak '+peak.toFixed(4)+' ('+LEVELS.dbfs(peak).toFixed(2)+' dBFS), playback gain '+gain.toFixed(4)+' -> '+LEVELS.dbfs(peak*gain).toFixed(2)+' dBFS effective');
 }
 fs.writeFileSync(path.join(out,'tracks.js'),'globalThis.AUDIO_TRACKS = '+JSON.stringify(tracks)+';\n');
}

const sr=44100;
function wav(name,seconds,sample){
 const values=new Float64Array(Math.ceil(sr*seconds));
 for(let i=0;i<values.length;i++)values[i]=sample(i/sr,i);
 // Remove DC first; the noise-based death effect otherwise carries a small offset.
 // The mean is weighted by the edge ramp below so the finished file sums to zero
 // even for very short effects, where the ramps cover a large share of samples.
 const ramp=i=>Math.min(1,i/80,(values.length-1-i)/160);
 let mean=0,wsum=0;for(let i=0;i<values.length;i++){const w=ramp(i);mean+=w*values[i];wsum+=w;}mean/=wsum||1;
 // Short edge ramps keep the first and last sample at zero. They are applied
 // before the peak search so every effect normalises to exactly the same peak.
 let peak=0;
 for(let i=0;i<values.length;i++){
  values[i]=(values[i]-mean)*ramp(i);
  peak=Math.max(peak,Math.abs(values[i]));
 }
 const bytes=Buffer.alloc(44+values.length*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(sr,24);bytes.writeUInt32LE(sr*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(values.length*2,40);
 // All effects share one file peak; relative balance is playback gain in
 // html-audio.js, so rebalancing the mix needs no regeneration.
 const scale=LEVELS.SFX_FILE_PEAK/(peak||1);
 for(let i=0;i<values.length;i++)bytes.writeInt16LE(Math.round(values[i]*scale*32767),44+i*2);
 fs.writeFileSync(path.join(out,name+'.wav'),bytes);
}

const tri=p=>2/Math.PI*Math.asin(Math.sin(p)),square=p=>Math.tanh(5*Math.sin(p));
wav('coin',.2,t=>square(2*Math.PI*(t<.07?988*t:988*.07+1319*(t-.07)))*Math.exp(-25.6*t));
wav('orb',.18,t=>Math.sin(2*Math.PI*1046*(Math.exp(Math.log(1568/1046)*Math.min(t,.09)/.09)-1)/(Math.log(1568/1046)/.09)+(t>.09?2*Math.PI*1568*(t-.09):0))*Math.exp(-30*t));
function chord(t,notes,step,length,shape){return notes.reduce((sum,f,i)=>{const u=t-i*step;return sum+(u>=0&&u<length?shape(2*Math.PI*f*u)*Math.min(1,u/.02)*Math.exp(-8*u):0);},0);}
wav('clear',.95,t=>chord(t,[523,659,784,1047],.13,.55,tri));
wav('fever',.52,t=>chord(t,[659,784,988,1319],.07,.3,square));
// Count-in: 3 / 2 / 1 is a bright arcade pip (with a soft low thump under it),
// GO! a rising sweep that lands on a big major chord.
wav('count',.2,t=>(.75*tri(2*Math.PI*880*t)+.35*Math.sin(2*Math.PI*1760*t))*Math.min(1,t/.003)*Math.exp(-16*t)+.5*Math.sin(2*Math.PI*(110*t-90*t*t))*Math.exp(-30*t));
wav('go',.9,t=>{
 const sweep=t<.16?.55*Math.sin(2*Math.PI*(440*t+2200*t*t))*(t/.16):0;
 const hit=chord(t-.14,[523.25,659.25,783.99,1046.5,1318.5],.0,.76,u=>.6*tri(u)+.4*square(u)*.5);
 const thump=t>.14?.9*Math.sin(2*Math.PI*(90*(t-.14)-60*(t-.14)**2))*Math.exp(-14*(t-.14)):0;
 return sweep+.55*hit+thump;
});
// PERFECT: a quick rising sparkle; GREAT: a clean single bell.
const bell=(t,f,k)=>t<0?0:(Math.sin(2*Math.PI*f*t)+.24*Math.sin(2*Math.PI*f*2.76*t))*Math.min(1,t/.002)*Math.exp(-k*t);
wav('perfect',.24,t=>bell(t,1318.51,28)+.8*bell(t-.042,1975.53,30)+.45*bell(t-.078,2637.02,36));
wav('great',.13,t=>bell(t,1046.5,42));
wav('good',.10,t=>bell(t,783.99,50));
// MISS: a low "zun" with enough upper body to survive phone speakers.
wav('miss',.18,t=>{
 const phase=2*Math.PI*(85*t+95*(1-Math.exp(-35*t))/35);
 return (Math.sin(phase)+.5*Math.sin(2*phase)+.22*Math.sin(3*phase))*Math.exp(-28*t);
});
let seed=42,lp=0;
wav('death',.35,t=>{seed=(1664525*seed+1013904223)>>>0;lp+=.12*((seed/2147483648-1)-lp);return lp*Math.pow(1-t/.35,2.2);});
console.log('Wrote nine WAV effects at file peak '+LEVELS.SFX_FILE_PEAK+' ('+LEVELS.dbfs(LEVELS.SFX_FILE_PEAK).toFixed(2)+' dBFS).'+(sfxOnly?' BGM and beat maps left untouched (--sfx-only).':' Prepared seven BGM files and fixed beat maps.'));
