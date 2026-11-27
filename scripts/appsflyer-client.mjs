// Keep native SDK failures outside gameplay. No email, names or URLs are sent.
const EVENTS = new Set(['run_start','run_complete','run_fail','run_exit','tutorial_start','tutorial_complete','character_unlock','capsule_pull']);
// `tracking` asks the App Tracking Transparency question and resolves to its
// status; the IDFA is only read, and partners only see user-level data, when it
// is 'authorized'. A missing or failing prompt counts as not authorized.
export function createAppsFlyerClient({sdk, enabled, config, tracking = async () => 'denied', warn = () => {}}) {
  let state = enabled ? 'idle' : 'disabled', initialization, starting = false;
  const queue = [];
  const fail = () => { state = 'error'; queue.length = 0; warn('AppsFlyer initialization failed'); };
  const send = event => Promise.resolve().then(() => sdk.logEvent(event)).catch(() => warn('AppsFlyer event was not queued'));
  async function startSession() {
    if (starting) return;
    starting = true;
    try {
      await sdk.start();
      state = 'started';
      for (const event of queue.splice(0)) await send(event);
    } catch { fail(); }
    finally { starting = false; }
  }
  function init() {
    if (!enabled) return Promise.resolve();
    if (initialization) return initialization;
    state = 'initializing';
    initialization = (async () => {
      let allowed = false;
      try { allowed = (await tracking()) === 'authorized'; } catch { warn('Tracking permission unavailable'); }
      await sdk.init({appId:config.appId, devKey:config.devKey});
      await sdk.setDisableAdvertisingIdentifiers({disable:!allowed});
      if (!allowed) await sdk.setSharingFilterForPartners({partners:['all']});
      await sdk.enableDebug({enabled:false});
      state = 'waiting';
      await sdk.registerSessionReadyListener(startSession);
      // The session may already be ready before the listener was attached;
      // without this check start() would never run and no event would be sent.
      let ready = false;
      try { ready = await sdk.isSessionReady(); } catch {}
      if (ready && state === 'waiting') await startSession();
    })().catch(fail);
    return initialization;
  }
  function event(action, a='all', b='all', value=1) {
    if (!enabled || state === 'error' || !EVENTS.has(action)) return;
    if (![a,b].every(s=>typeof s==='string' && /^[a-z0-9_]{1,32}$/.test(s)) || !Number.isFinite(value)) return;
    const data = {eventName:'cosmii_'+action, eventValues:{category:a, detail:b, value}};
    if (state === 'started') void send(data);
    else if (queue.length < 50) queue.push(data);
  }
  return {init,event,status:()=>state};
}
