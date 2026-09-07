/* Packs out and back in, both delivery paths, plus the input edges:
   empty, very long, duplicate names, rapid double taps, and a corrupt pack. */
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  await page.evaluate(() => {
    window.__saved = [];
    window.Native = {
      isNative: () => true,
      vibrate: () => {}, vibratePattern: () => {},
      saveFile: (name, mime, b64) => { window.__saved.push({ name, mime, b64 }); return 'content://mock/' + name; },
      shareUri: () => {}, shareText: () => {}
    };
  });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('doorway.v1', JSON.stringify({
      v: 1, places: [], surveys: [], confirms: [], lists: [],
      lens: { modules: [{ type: 'wheeled', params: {} }], everyone: false },
      settings: { haptics: true, textScale: 1, onboarded: true, sort: 'name', name: 'The Tuesday group', sample: false }
    }));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    window.__saved = [];
    window.Native = {
      isNative: () => true,
      vibrate: () => {}, vibratePattern: () => {},
      saveFile: (name, mime, b64) => { window.__saved.push({ name, mime, b64 }); return 'content://mock/' + name; },
      shareUri: () => {}, shareText: () => {}
    };
  });
  await wait(300);

  await click('#sampleBtn'); await wait(600);
  log('places: ' + await page.evaluate(() => Store.places().length));

  // export through Native.saveFile
  await page.evaluate(() => window.App.show('you'));
  await wait(400);
  await page.evaluate(() => {
    [...document.querySelectorAll('#youBody .btn')].find(b => b.textContent === 'Send a pack').click();
  });
  await wait(700);
  await shot('40-share-sheet');
  await page.evaluate(() => {
    [...document.querySelectorAll('#shareBody .btn')].find(b => b.textContent === 'Save the file').click();
  });
  await wait(900);
  const saved = await page.evaluate(() => window.__saved.map(s => ({ name: s.name, mime: s.mime, len: s.b64.length })));
  log('native saveFile: ' + JSON.stringify(saved));
  await shot('41-after-export');

  // round trip: wipe, then import what we exported
  const packJson = await page.evaluate(() => decodeURIComponent(escape(atob(window.__saved[0].b64))));
  log('pack bytes: ' + packJson.length);
  await page.evaluate(() => { Store.wipe(); window.App.show('places'); });
  await wait(400);
  log('after wipe places: ' + await page.evaluate(() => Store.places().length));
  const res = await page.evaluate(async (j) => JSON.stringify(await Share.ingest(j)), packJson);
  log('import result: ' + res);
  await page.evaluate(() => window.App.show('places'));
  await wait(500);
  await shot('42-after-import');
  log('places after import: ' + await page.evaluate(() => Store.places().length));
  log('surveys after import: ' + await page.evaluate(() => Store.db().surveys.length));
  log('own surveys after import (should be 0, imported work is not yours): ' +
      await page.evaluate(() => Store.db().surveys.filter(s => s.by === 'you').length));

  // import the same pack twice: nothing should double
  const res2 = await page.evaluate(async (j) => JSON.stringify(await Share.ingest(j)), packJson);
  log('second import: ' + res2);
  log('places still: ' + await page.evaluate(() => Store.places().length));

  // corrupt pack
  const bad = await page.evaluate(async () => { try { await Share.ingest('not json at all'); return 'no throw'; } catch (e) { return e.message; } });
  log('corrupt pack: ' + bad);
  const bad2 = await page.evaluate(async () => { try { await Share.ingest('{"format":"something.else"}'); return 'no throw'; } catch (e) { return e.message; } });
  log('wrong format: ' + bad2);

  // browser download path (no Native)
  await page.evaluate(() => { delete window.Native; });
  const dl = await page.evaluate(async () => {
    const r = await Share.buildPack({ placeIds: Store.places().map(p => p.id), photos: false });
    let clicked = null;
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { clicked = this.download; };
    const out = await Share.deliver(r.json, 'atlas');
    HTMLAnchorElement.prototype.click = orig;
    return JSON.stringify({ out, clicked });
  });
  log('browser download: ' + dl);

  // ── input edges ──
  await page.evaluate(() => { Store.wipe(); });
  // very long name and duplicate names
  const long = 'Q'.repeat(300);
  await page.evaluate((long) => {
    Store.addPlace({ name: long, kind: 'Cafe', area: long, note: long });
    Store.addPlace({ name: 'Twice', kind: 'Cafe', area: 'Same street' });
    Store.addPlace({ name: 'Twice', kind: 'Cafe', area: 'Same street' });
    Store.addPlace({ name: '   ', kind: 'Other', area: '' });
    Store.addPlace({ name: '<script>alert(1)</script>', kind: 'Shop', area: '' });
    window.App.show('places');
  }, long);
  await wait(500);
  await shot('43-edge-names');
  log('names: ' + JSON.stringify(await page.evaluate(() => Store.places().map(p => p.name.slice(0, 24)))));

  // rapid double taps on the primary buttons
  await page.evaluate(() => { Store.wipe(); Sample.install(); window.App.show('places'); });
  await wait(400);
  await page.evaluate(() => window.App.openPlace(Store.places()[0].id));
  await wait(500);
  await page.evaluate(() => {
    const b = document.getElementById('stillBtn');
    for (let i = 0; i < 6; i++) b.click();
  });
  await wait(500);
  log('confirms after 6 rapid taps: ' + await page.evaluate(() => Store.db().confirms.filter(c => c.by === 'you' && c.at > Date.now() - 60000).length));
  await shot('44-rapid-confirm');
  log('errors: ' + errors.length);
};
