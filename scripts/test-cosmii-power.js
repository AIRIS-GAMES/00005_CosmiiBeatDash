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
    await page.goto(`http://127.0.0.1:${server.address().port}`);
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
    assert.deepEqual(collected.firstActivation, {
      coins: 10,
      power: 0,
      active: true,
      length: 10,
      invulnerable: true,
      character: collected.firstActivation.character,
      characterSource: true
    });
    assert.equal(collected.multipliedCoins, 12, 'Coins collected during FEVER are doubled');
    assert.equal(collected.firstActivation.character, 'RED');
    assert.equal(collected.stateBeforeProtectedHit, 'play');
    assert.equal(collected.stateAfterProtectedHit, 'play', 'POWER protects the player while active');

    await page.waitForFunction(() => cosmiiPower.inspect().artReady);
    const followUp = await page.evaluate(() => {
      songPos = 2;
      cosmiiPower.tick();
      const activeSeconds = cosmiiPower.inspect().activeSeconds;
      update(0, feverEnd + 0.1);
      cosmiiPower.tick();
      const ended = { active: feverOn, running: cosmiiPower.inspect().running, grace: feverProtected() };
      cosmiiPower.collect(8);
      Math.random = () => 0.999999;
      cosmiiPower.tick();
      return {
        activeSeconds,
        ended,
        secondActivation: cosmiiPower.inspect().activationCount,
        secondCharacter: cosmiiPower.inspect().character,
        secondCharacterSource: SKINS.some(skin => skin.n === cosmiiPower.inspect().character)
      };
    });
    assert.ok(followUp.activeSeconds > 0);
    assert.deepEqual(followUp.ended, { active: false, running: false, grace: true });
    assert.equal(followUp.secondActivation, 2);
    assert.equal(followUp.secondCharacter, 'PURPLE');
    assert.equal(followUp.secondCharacterSource, true);
    assert.deepEqual(errors, []);

    const sourceFiles = ['index.html', 'ui.js', 'ui.css', 'sw.js', 'game-safety.js', 'cosmii-power.js'];
    for (const file of sourceFiles) {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      assert.doesNotMatch(source, /サンテレビ|おっ.?サン|SUN-TV|ohsun|SUN POWER|SUN FEVER|collaboration|COLLAB|sunRhythm/i, `${file} still contains removed collaboration content`);
    }
    console.log('Coin-powered random Cosmiii ability: PASS');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
