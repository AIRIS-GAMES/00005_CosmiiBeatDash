const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.TEST_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    res.end();
    return;
  }
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.mp3': 'audio/mpeg' };
  res.setHeader('Content-Type', types[path.extname(file).toLowerCase()] || 'application/octet-stream');
  require('./serve-file')(req, res, file);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 844, height: 390 }, serviceWorkers: 'block' });
    await context.route('https://**', route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(()=>localStorage.setItem('cosmii_tutorial_v1','done'));await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => bootDone && window.cosmiiPower);

    const collected = await page.evaluate(() => {
      $('loginov').style.display = 'none';
      state = 'play';
      stageIdx = 0;
      practice = false;
      duration = 40;
      songPos = 1;
      sfxFever = () => {};
      gaDesign = () => {};
      player.x = 50;
      player.y = GROUND - B;
      player.grounded = true;
      level = [];
      beats = [];
      orbsLive = [];
      flipZones = [];
      cosmiiPower.reset();
      coinsLive = Array.from({ length: 10 }, () => ({
        t: 1, y: player.y + B / 2, risky: false, got: false
      }));
      coinRun = 0;
      update(0, 1);
      Math.random = () => 0;
      cosmiiPower.tick();
      const firstActivation = {
        coins: coinRun,
        power: cosmiiPower.inspect().power,
        active: feverOn,
        length: feverLength,
        invulnerable: feverProtected(),
        character: cosmiiPower.inspect().character,
        characterSource: SKINS.some(skin => skin.n === cosmiiPower.inspect().character)
      };
      coinsLive = [{ t: 1, y: player.y + B / 2, risky: false, got: false }];
      update(0, 1);
      const multipliedCoins = coinRun;
      const stateBeforeProtectedHit = state;
      die();
      return { firstActivation, multipliedCoins, stateBeforeProtectedHit, stateAfterProtectedHit: state };
    });
    assert.equal(collected.firstActivation.coins, 10);
    assert.equal(collected.firstActivation.active, false);
    assert.equal(collected.firstActivation.power, 0);
    assert.equal(collected.firstActivation.invulnerable, false);
    assert.equal(collected.multipliedCoins, 11, 'Coins retain their ordinary value');
    assert.equal(collected.stateBeforeProtectedHit, 'play');
    assert.equal(collected.stateAfterProtectedHit, 'dead', 'Collecting coins must not prevent death');
    const legacy = await page.evaluate(() => {
      state='play'; activateFever(10); cosmiiPower.collect(100); cosmiiPower.tick();
      return {active:feverOn,protected:feverProtected(),hidden:document.getElementById('cosmii-power').hidden,count:cosmiiPower.inspect().activationCount};
    });
    assert.deepEqual(legacy,{active:false,protected:false,hidden:true,count:0});
    assert.deepEqual(errors, []);

    const sourceFiles = ['index.html', 'ui.js', 'ui.css', 'sw.js', 'game-safety.js', 'cosmii-power.js'];
    for (const file of sourceFiles) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      assert.doesNotMatch(source, /サンテレビ|おっ.?サン|SUN-TV|ohsun|SUN POWER|SUN FEVER|collaboration|COLLAB|sunRhythm/i, `${file} still contains removed collaboration content`);
    }
    console.log('FEVER suspended: normal coin values, collision death, hidden meter and legacy trigger PASS');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
