import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createAppsFlyerClient} from './appsflyer-client.mjs';
const config={appId:'test-id',devKey:'test-key'};
const calls=[];let ready;
const sdk={
  init:async value=>calls.push(['init',value]),
  setDisableAdvertisingIdentifiers:async value=>calls.push(['idfa',value]),
  setSharingFilterForPartners:async value=>calls.push(['share',value]),
  isSessionReady:async()=>false,
  enableDebug:async value=>calls.push(['debug',value]),
  registerSessionReadyListener:async callback=>{ready=callback;calls.push(['listen']);},
  start:async()=>calls.push(['start']),
  logEvent:async value=>calls.push(['event',value]),
};
const client=createAppsFlyerClient({sdk,enabled:true,config});
client.event('run_start','normal_s01','first_red');
await Promise.all([client.init(),client.init()]);
assert.equal(calls.filter(c=>c[0]==='init').length,1);
assert.equal(calls.filter(c=>c[0]==='start').length,0,'wait until SDK session-ready');
assert.deepEqual(calls.slice(0,4),[['init',config],['idfa',{disable:true}],['share',{partners:['all']}],['debug',{enabled:false}]],'no ATT answer: no IDFA, no partner sharing');
await ready();
assert.equal(client.status(),'started');
assert.equal(calls.filter(c=>c[0]==='event').length,1);
assert.deepEqual(calls.at(-1)[1],{eventName:'cosmii_run_start',eventValues:{category:'normal_s01',detail:'first_red',value:1}});
await ready(); // New foreground session, without replaying previous game events.
assert.equal(calls.filter(c=>c[0]==='start').length,2);
assert.equal(calls.filter(c=>c[0]==='event').length,1);
client.event('capsule_pull','coin','sr');
client.event('not_allowed');client.event('run_start','https://example.com');
await new Promise(r=>setImmediate(r));
assert.equal(calls.filter(c=>c[0]==='event').length,2);
let touched=false;
const disabled=createAppsFlyerClient({sdk:new Proxy({}, {get(){touched=true;throw Error('must not call SDK');}}),enabled:false,config});
await disabled.init();disabled.event('run_start');assert.equal(touched,false);
const failed=createAppsFlyerClient({sdk:{init:async()=>{throw Error('native unavailable');}},enabled:true,config});
await failed.init();assert.equal(failed.status(),'error');failed.event('run_start');
const bounded=[];let release;
const buffered=createAppsFlyerClient({sdk:{...sdk,registerSessionReadyListener:async cb=>release=cb,logEvent:async v=>bounded.push(v)},enabled:true,config});
for(let i=0;i<100;i++)buffered.event('run_start');
await buffered.init();await release();assert.equal(bounded.length,50);
// ATT authorized: IDFA collected, partner sharing left to the dashboard settings.
const allowedCalls=[];
await createAppsFlyerClient({sdk:{...sdk,init:async v=>allowedCalls.push(['init',v]),setDisableAdvertisingIdentifiers:async v=>allowedCalls.push(['idfa',v]),setSharingFilterForPartners:async v=>allowedCalls.push(['share',v])},enabled:true,config,tracking:async()=>'authorized'}).init();
assert.deepEqual(allowedCalls,[['init',config],['idfa',{disable:false}]]);
for(const answer of ['denied','restricted','notDetermined']){
  const c=[];await createAppsFlyerClient({sdk:{...sdk,setDisableAdvertisingIdentifiers:async v=>c.push(v)},enabled:true,config,tracking:async()=>answer}).init();
  assert.deepEqual(c,[{disable:true}],answer);
}
const brokenPrompt=createAppsFlyerClient({sdk:{...sdk,isSessionReady:async()=>true},enabled:true,config,tracking:async()=>{throw Error('plugin missing');}});
await brokenPrompt.init();assert.equal(brokenPrompt.status(),'started','prompt failure must not stop measurement');
// Session already ready before the listener was attached: start without waiting for a callback.
const early=[];
const already=createAppsFlyerClient({sdk:{...sdk,registerSessionReadyListener:async()=>{},isSessionReady:async()=>true,start:async()=>early.push('start'),logEvent:async v=>early.push(v.eventName)},enabled:true,config});
already.event('run_start');await already.init();
assert.deepEqual(early,['start','cosmii_run_start']);
// Execute the real bundle as a plain browser: no native calls or network required.
const sandbox={console,URLSearchParams,location:{search:''},navigator:{webdriver:false}};
sandbox.window=sandbox;vm.runInNewContext(fs.readFileSync(new URL('../cosmii-appsflyer.js',import.meta.url),'utf8'),sandbox);
assert.equal(sandbox.cosmiiAppsFlyer.status(),'disabled');
console.log('PASS: AppsFlyer init-once, ATT-gated IDFA and partner sharing, already-ready session, session-ready start, resume, bounded queue, allowlisted events, failure isolation and browser exclusion.');
