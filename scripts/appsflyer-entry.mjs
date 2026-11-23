import { Capacitor } from '@capacitor/core';
import { AppsFlyer } from 'appsflyer-capacitor-plugin';
import { createAppsFlyerClient } from './appsflyer-client.mjs';

const query = new URLSearchParams(location.search);
const enabled = Capacitor.getPlatform() === 'ios' && !navigator.webdriver &&
  !window.COSMII_DEV_UNLOCK && query.get('analytics') !== 'off' && !query.has('demo');
window.cosmiiAppsFlyer = createAppsFlyerClient({
  sdk:AppsFlyer, enabled,
  config:{appId:'6792287027', devKey:'yrxDU6rzyEgbzfKrzgAySH'},
  warn:message=>console.warn(message),
});
void window.cosmiiAppsFlyer.init();
