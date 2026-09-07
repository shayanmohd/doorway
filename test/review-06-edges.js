/* Reviewer pass 6: the edges. Rapid double taps on every primary control, empty and enormous
   input, duplicates, a pack round trip, rubbish in the import box, and the largest text size. */
module.exports = async ({ page, shot, wait, text, click, type, errors, log }) => {
  const ev = fn => page.evaluate(fn);
  const evA = (fn, a) => page.evaluate(fn, a);
  const bad = [];
  const check = (name, ok, detail) => { log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? ': ' + detail : '')); if (!ok) bad.push(name + (detail ? ' (' + detail + ')' : '')); };

  await ev(() => { localStorage.clear(); try { indexedDB.deleteDatabase('doorway-photos'); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle0' }); await wait(500);
  // straight past onboarding
  await ev(() => { Store.set('onboarded', true); Store.setLens({ modules: [{ type: 'wheeled', params: {} }], everyone: false }); });
  await page.reload({ waitUntil: 'networkidle0' }); await wait(700);

  // ── the sample button, twice, fast ──
  await ev(() => { const b = document.getElementById('sampleBtn'); b.click(); b.click(); b.click(); });
  await wait(800);
  check('sample loads once on three fast taps', await ev(() => App._store().places().length) === 8,
    'places = ' + await ev(() => App._store().places().length));
  check('surveys not duplicated', await ev(() => App._store().db().surveys.length) === 10,
    'surveys = ' + await ev(() => App._store().db().surveys.length));

  // ── a survey saved twice, fast ──
  await ev(() => App.startSurvey(null, null)); await wait(500);
  await type('#npName', 'Double Tap Diner');
  await ev(() => document.getElementById('surveyNext').click()); await wait(500);
  await ev(() => { const box = [...document.querySelectorAll('#surveyBody .q')].find(x => /How many steps/.test(x.querySelector('.q-h').textContent));
    [...box.querySelectorAll('.chip')].find(c => c.textContent === 'None, level in').click(); });
  await wait(400);
  await ev(() => { for (let i = 0; i < 6; i++) document.getElementById('surveyNext').click(); });
  await wait(900);
  await ev(() => { const b = document.getElementById('surveyNext'); b.click(); b.click(); b.click(); });
  await wait(1200);
  check('one place from a triple-tapped save', await ev(() => App._store().places().filter(p => p.name === 'Double Tap Diner').length) === 1,
    'copies = ' + await ev(() => App._store().places().filter(p => p.name === 'Double Tap Diner').length));
  check('one survey from it', await ev(() => App._store().db().surveys.length) === 11,
    'surveys = ' + await ev(() => App._store().db().surveys.length));
  await shot('80-after-double-save');

  // ── still accurate, six taps ──
  const pid = await ev(() => App._store().places().find(p => p.name === 'Double Tap Diner').id);
  await evA(i => App.openPlace(i), pid); await wait(600);
  await ev(() => { const b = document.getElementById('stillBtn'); for (let i = 0; i < 6; i++) b.click(); });
  await wait(700);
  const c = await evA(i => App._store().confirms(i).length, pid);
  check('six taps make one confirmation', c === 1, 'confirmations = ' + c);
  await shot('81-six-taps');
  await ev(() => App.back()); await wait(300);

  // ── a blank name, a name of spaces, an enormous name ──
  await ev(() => App.startSurvey(null, null)); await wait(500);
  await ev(() => document.getElementById('surveyNext').click()); await wait(500);
  check('blank name is refused inline', await ev(() => !!document.getElementById('npNameErr')), '');
  check('and does not use alert', await ev(() => !document.getElementById('confirm').hidden) === false, '');
  await shot('82-blank-name');
  await ev(() => { const i = document.getElementById('npName'); i.value = '     '; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await ev(() => document.getElementById('surveyNext').click()); await wait(500);
  check('a name of spaces is refused too', await ev(() => !!document.getElementById('npNameErr')), '');
  await ev(() => { const i = document.getElementById('npName'); i.value = 'Q'.repeat(400); i.dispatchEvent(new Event('input', { bubbles: true }));
                   const a = document.getElementById('npArea'); a.value = 'A'.repeat(400); a.dispatchEvent(new Event('input', { bubbles: true })); });
  await ev(() => document.getElementById('surveyNext').click()); await wait(500);
  await ev(() => { const box = [...document.querySelectorAll('#surveyBody .q')].find(x => /How many steps/.test(x.querySelector('.q-h').textContent));
    [...box.querySelectorAll('.chip')].find(c => c.textContent === 'Three or more').click(); });
  await wait(400);
  await ev(() => { for (let i = 0; i < 6; i++) document.getElementById('surveyNext').click(); }); await wait(800);
  await ev(() => document.getElementById('surveyNext').click()); await wait(1000);
  const long = await ev(() => { const p = App._store().places().find(x => x.name[0] === 'Q'); return p ? { n: p.name.length, a: p.area.length } : null; });
  check('an enormous name is capped', long && long.n === 80 && long.a === 80, JSON.stringify(long));
  await shot('83-long-name-place');
  const wide = await ev(() => ({ page: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    body: document.getElementById('placeBody').scrollWidth > document.getElementById('placeBody').clientWidth + 1 }));
  check('no horizontal overflow from it', !wide.page && !wide.body, JSON.stringify(wide));
  await ev(() => App.back()); await wait(400);

  // ── a duplicate name ──
  const before = await ev(() => App._store().places().length);
  await ev(() => App.startSurvey(null, null)); await wait(400);
  await type('#npName', 'Double Tap Diner');
  await ev(() => document.getElementById('surveyNext').click()); await wait(500);
  await ev(() => { const box = [...document.querySelectorAll('#surveyBody .q')].find(x => /How many steps/.test(x.querySelector('.q-h').textContent));
    [...box.querySelectorAll('.chip')].find(c => c.textContent === 'One step').click(); });
  await wait(400);
  await ev(() => { for (let i = 0; i < 6; i++) document.getElementById('surveyNext').click(); }); await wait(800);
  await ev(() => document.getElementById('surveyNext').click()); await wait(1000);
  check('a duplicate name makes a second place, not a crash',
    await ev(() => App._store().places().length) === before + 1, '');
  await ev(() => App.back()); await wait(400);

  // ── the stepper at its limits ──
  await ev(() => App.startSurvey(null, null)); await wait(400);
  await type('#npName', 'Stepper');
  await ev(() => document.getElementById('surveyNext').click()); await wait(500);
  await ev(() => { const box = [...document.querySelectorAll('#surveyBody .q')].find(x => /How many steps/.test(x.querySelector('.q-h').textContent));
    [...box.querySelectorAll('.chip')].find(c => c.textContent === 'One step').click(); });
  await wait(450);
  const limits = await ev(() => {
    const box = [...document.querySelectorAll('#surveyBody .q')].find(x => /tall is the tallest/.test(x.querySelector('.q-h').textContent));
    const chip = [...box.querySelectorAll('.chip')].find(c => c.textContent === '5 cm'); chip.click();
    return true;
  });
  await wait(400);
  const stepped = await ev(() => {
    const box = [...document.querySelectorAll('#surveyBody .q')].find(x => /tall is the tallest/.test(x.querySelector('.q-h').textContent));
    const [minus, plus] = box.querySelectorAll('.stepper button');
    for (let i = 0; i < 40; i++) minus.click();
    const low = box.querySelector('.stepper .val span').textContent;
    for (let i = 0; i < 80; i++) plus.click();
    const high = box.querySelector('.stepper .val span').textContent;
    return { low, high, stored: App._store && null };
  });
  log('stepper clamps to', JSON.stringify(stepped));
  check('stepper will not go under its minimum', stepped.low === '1', stepped.low);
  check('stepper will not go over its maximum', stepped.high === '45', stepped.high);
  await shot('84-stepper-limits');
  await ev(() => App.back()); await wait(400);
  await ev(() => { const y = document.getElementById('confirmYes'); if (!document.getElementById('confirm').hidden) y.click(); }); await wait(400);

  // ── a pack round trip, and rubbish ──
  await ev(() => { window.Native = { isNative: () => true, saveFile: (n, m, b) => { window.__pack = atob(b); return 'content://x'; },
    shareUri: () => true, vibrate: () => {}, vibratePattern: () => {} }; });
  await ev(() => App.show('you')); await wait(600);
  await ev(() => { [...document.querySelectorAll('#youBody button')].find(b => /Export everything/.test(b.textContent)).click(); }); await wait(900);
  await ev(() => { const t = [...document.querySelectorAll('#shareBody .toggle')][0]; t.click(); }); await wait(500);
  await ev(() => { [...document.querySelectorAll('#shareBody button')].find(b => b.textContent === 'Save the file').click(); }); await wait(1500);
  const packLen = await ev(() => (window.__pack || '').length);
  check('a pack was written', packLen > 500, packLen + ' bytes');
  const counts = await ev(() => ({ p: App._store().places().length, s: App._store().db().surveys.length, l: App._store().lists().length }));
  // wipe, then read the pack back in
  await ev(() => { Photos.clear(); Geo.clear(); Store.wipe(); App.show('places'); }); await wait(700);
  check('wipe clears the last position fix', await ev(() => App._store().settings().lastFix) === null, '');
  check('wipe empties everything', await ev(() => App._store().places().length) === 0, '');
  await shot('85-after-wipe');
  await ev(() => App.show('you')); await wait(500);
  await ev(() => { [...document.querySelectorAll('#youBody button')].find(b => /Add a pack/.test(b.textContent)).click(); }); await wait(500);
  await ev(() => { const t = document.getElementById('importText'); t.value = window.__pack; t.dispatchEvent(new Event('input', { bubbles: true })); });
  await ev(() => { [...document.querySelectorAll('#importBody button')].find(b => /Add what is pasted/.test(b.textContent)).click(); }); await wait(1600);
  const back = await ev(() => ({ p: App._store().places().length, s: App._store().db().surveys.length, l: App._store().lists().length }));
  log('before the round trip', JSON.stringify(counts), 'after', JSON.stringify(back));
  check('every place came back', back.p === counts.p, JSON.stringify(back));
  check('every survey came back', back.s === counts.s, JSON.stringify(back));
  check('every list came back', back.l === counts.l, JSON.stringify(back));
  await shot('86-after-import');
  // importing the same pack again must add nothing
  await ev(() => { [...document.querySelectorAll('#youBody button')].find(b => /Add a pack/.test(b.textContent)).click(); }); await wait(500);
  await ev(() => { const t = document.getElementById('importText'); t.value = window.__pack; t.dispatchEvent(new Event('input', { bubbles: true }));
    [...document.querySelectorAll('#importBody button')].find(b => /Add what is pasted/.test(b.textContent)).click(); });
  await wait(1600);
  check('a second import of the same pack adds nothing',
    await ev(() => App._store().places().length) === back.p, 'now ' + await ev(() => App._store().places().length) + ', was ' + back.p);
  await shot('87-second-import');
  // rubbish
  await ev(() => { [...document.querySelectorAll('#youBody button')].find(b => /Add a pack/.test(b.textContent)).click(); }); await wait(500);
  await ev(() => { const t = document.getElementById('importText'); t.value = 'this is not a pack at all';
    [...document.querySelectorAll('#importBody button')].find(b => /Add what is pasted/.test(b.textContent)).click(); });
  await wait(700);
  check('rubbish is refused with words, not a crash', await ev(() => !document.getElementById('toast').hidden), '');
  log('  toast says:', await ev(() => document.getElementById('toast').textContent));
  await shot('88-bad-pack');
  await ev(() => { const t = document.getElementById('importText'); t.value = '{"format":"nope"}';
    [...document.querySelectorAll('#importBody button')].find(b => /Add what is pasted/.test(b.textContent)).click(); });
  await wait(700);
  log('  wrong format says:', await ev(() => document.getElementById('toast').textContent));
  await ev(() => { const t = document.getElementById('importText'); t.value = '';
    [...document.querySelectorAll('#importBody button')].find(b => /Add what is pasted/.test(b.textContent)).click(); });
  await wait(600);
  log('  empty box says:', await ev(() => document.getElementById('toast').textContent));
  await ev(() => App.back()); await wait(400);

  // ── the sample toggle when a friend's pack already brought the same places ──
  const sampleState = await ev(() => {
    Store.wipe();
    // exactly what a restored backup looks like: every sample id present, no sample flag
    const db = Store.db();
    for (const id of ['smp-coffee', 'smp-library', 'smp-ledger', 'smp-kettle', 'smp-pharm',
                      'smp-orangery', 'smp-sable', 'smp-clinic']) {
      db.places.push({ id, name: id, kind: 'Cafe', area: '', note: '', lat: 53.4, lng: -2.98, at: Date.now() });
    }
    Store.saveNow();
    const claimed = Sample.install();
    return { claimed, installed: Sample.installed(), flag: Store.settings().sample, places: Store.places().length };
  });
  log('friend-pack sample case:', JSON.stringify(sampleState));
  check('the sample toggle does not claim to have installed nothing',
    !(sampleState.flag === true && sampleState.installed === false), JSON.stringify(sampleState));

  // ── largest text, every screen ──
  await ev(() => { Store.wipe(); Sample.install(); Store.set('textScale', 1.3); App.show('places'); }); await wait(300);
  await page.reload({ waitUntil: 'networkidle0' }); await wait(900);
  const fs = await ev(() => getComputedStyle(document.documentElement).getPropertyValue('--fs').trim());
  check('largest text applied', fs === '1.3', fs);
  await shot('89-large-places');
  const over = async (label) => {
    const w = await ev(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    if (w) bad.push('horizontal overflow at largest text on ' + label);
    log('  ' + label + (w ? ' OVERFLOWS' : ' fits'));
  };
  await over('places');
  for (const v of ['lists', 'check', 'you']) { await evA(x => App.show(x), v); await wait(700); await shot('89-large-' + v); await over(v); }
  await ev(() => App.openPlace('smp-ledger')); await wait(900); await shot('89-large-place'); await over('place');
  const cw = await ev(() => { const c = document.querySelector('#placeBody canvas'); return c ? { css: c.style.width, label: c.getAttribute('aria-label') } : null; });
  log('  drawing at largest text:', JSON.stringify(cw));
  await ev(() => { const b = document.getElementById('placeBody'); b.scrollTop = 800; }); await wait(400);
  await shot('89-large-diagram');
  await ev(() => App.back()); await wait(300);
  await ev(() => App.startSurvey('smp-ledger', 'entrance')); await wait(700); await shot('89-large-survey'); await over('survey');
  await ev(() => App.back()); await wait(400);
  await ev(() => { const y = document.getElementById('confirmYes'); if (!document.getElementById('confirm').hidden) y.click(); }); await wait(400);

  if (bad.length) throw new Error('edge failures:\n  ' + bad.join('\n  '));
  if (errors.length) throw new Error(errors.length + ' page errors');
};
