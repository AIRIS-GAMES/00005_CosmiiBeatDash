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
  const encoded=spawnSync(ffmpeg,['-v','error','-y','-i',input,'-af','volume=0.6,adelay=900|900','-codec:a','libmp3lame','-q:a','2',path.join(out,file)]);
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
 let mean=0;for(let i=0;i<values.length;i++)mean+=values[i];mean/=values.length||1;
 // Short edge ramps keep the first and last sample at zero. They are applied
 // before the peak search so every effect normalises to exactly the same peak.
 let peak=0;
 for(let i=0;i<values.length;i++){
  values[i]=(values[i]-mean)*Math.min(1,i/80,(values.length-1-i)/160);
  peak=Math.max(peak,Math.abs(values[i]));
 }
 const bytes=Buffer.alloc(44+values.length*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(sr,24);bytes.writeUInt32LE(sr*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(values.length*2,40);
 // All five effects share one file peak; relative balance is playback gain in
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
let seed=42,lp=0;
wav('death',.35,t=>{seed=(1664525*seed+1013904223)>>>0;lp+=.12*((seed/2147483648-1)-lp);return lp*Math.pow(1-t/.35,2.2);});
console.log('Wrote five WAV effects at file peak '+LEVELS.SFX_FILE_PEAK+' ('+LEVELS.dbfs(LEVELS.SFX_FILE_PEAK).toFixed(2)+' dBFS).'+(sfxOnly?' BGM and beat maps left untouched (--sfx-only).':' Prepared seven BGM files and fixed beat maps.'));
