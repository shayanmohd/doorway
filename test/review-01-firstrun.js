/* Reviewer pass 1: first run, every screen, real data, reload, persistence. */
module.exports = async ({ page, shot, wait, text, click, type, errors, log }) => {
  const ev = fn => page.evaluate(fn);
  const evA = (fn, arg) => page.evaluate(fn, arg);

  // a genuinely blank phone
  await ev(() => { localStorage.clear(); try { indexedDB.deleteDatabase('doorway-photos'); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(400);

  const seen = async (sel) => evA(s => { const n = document.querySelector(s); return !!(n && n.offsetParent !== null); }, sel);

  // ── onboarding ──
  log('onboard visible:', await seen('#onboard'));
  await shot('01-onboard-1');
  await click('#obNext'); await wait(300);
  await shot('02-onboard-2');
  await click('#obNext'); await wait(300);
  await shot('03-onboard-3');
  await click('#obNext'); await wait(400);          // -> lens setup
  log('lens setup visible:', await seen('#lensSetup'));
  await shot('04-lens-setup');

  // turn on wheeled mobility and set a parameter
  await ev(() => {
    const card = [...document.querySelectorAll('.mod-card')][0];
    card.querySelector('.toggle').click();
  });
  await wait(300);
  await ev(() => {
    const card = [...document.querySelectorAll('.mod-card')][0];
    const chips = [...card.querySelectorAll('.chip')];
    const c = chips.find(x => x.textContent === 'Up to 5 cm'); if (c) c.click();
  });
  await wait(250);
  await shot('05-lens-on');
  await click('#lensDone'); await wait(500);

  // ── places, empty ──
  log('places empty art:', await ev(() => !!document.querySelector('#placesEmptyArt svg')));
  await shot('06-places-empty');

  // ── lists, check, you: all empty ──
  await ev(() => App.show('lists')); await wait(350); await shot('07-lists-empty');
  log('lists empty art:', await ev(() => !!document.querySelector('#listsEmptyArt svg')));
  await ev(() => App.show('check')); await wait(350); await shot('08-check-empty');
  await ev(() => App.show('you')); await wait(450); await shot('09-you');

  // ── sample data ──
  await ev(() => App.show('places')); await wait(300);
  await click('#sampleBtn'); await wait(700);
  const n = await ev(() => App._store().places().length);
  log('places after sample:', n);
  await ev(() => { document.getElementById('toast').hidden = true; });
  await shot('10-places-sample');

  // filters + search + sorts
  await ev(() => document.querySelectorAll('#filterChips .chip')[0].click()); await wait(300);
  await shot('11-filtered');
  await ev(() => document.querySelectorAll('#filterChips .chip')[0].click()); await wait(250);
  await type('#placeSearch', 'ledger'); await wait(350);
  await shot('12-search');
  await ev(() => { const i = document.getElementById('placeSearch'); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); });
  await wait(250);
  for (const label of ['Recently checked', 'Name', 'Nearest']) {
    await evA(l => { const c = [...document.querySelectorAll('#sortChips .chip')].find(x => x.textContent === l); if (c) c.click(); }, label);
    await wait(350);
  }
  await shot('13-sorted');

  // ── a place page ──
  await ev(() => App.openPlace('smp-ledger')); await wait(700);
  await shot('14-place-top');
  await ev(() => { document.getElementById('placeBody').scrollTop = 700; }); await wait(400);
  await shot('15-place-entrance');
  await ev(() => { document.getElementById('placeBody').scrollTop = 1500; }); await wait(400);
  await shot('16-place-bathroom');
  await ev(() => { const b = document.getElementById('placeBody'); b.scrollTop = b.scrollHeight; }); await wait(400);
  await shot('17-place-actions');

  // still accurate
  const before = await ev(() => App._store().db().confirms.length);
  await click('#stillBtn'); await wait(500);
  const after = await ev(() => App._store().db().confirms.length);
  log('confirms', before, '->', after);
  await shot('18-still-accurate');

  // edit details inline
  await ev(() => { const b = [...document.querySelectorAll('#placeActions button')].find(x => /Edit details/.test(x.textContent)); b.click(); });
  await wait(500);
  await shot('19-edit-details');
  await ev(() => { const c = [...document.querySelectorAll('#placeBody .card button')].find(x => x.textContent === 'Cancel'); c.click(); });
  await wait(400);

  // add to a list from the place sheet
  await ev(() => { const b = [...document.querySelectorAll('#placeActions button')].find(x => /Add to a list/.test(x.textContent)); b.click(); });
  await wait(450);
  await shot('20-list-picker-empty');
  await ev(() => { const b = [...document.querySelectorAll('#listPickBody button')].find(x => /New list with this place/.test(x.textContent)); b.click(); });
  await wait(600);
  await shot('21-name-new-list');
  await type('#newListTitle', 'Tuesday walk');
  await ev(() => { const b = [...document.querySelectorAll('#listPickBody button')].find(x => x.textContent === 'Make the list'); b.click(); });
  await wait(600);
  await shot('22-list-picker-after');
  log('lists now:', await ev(() => App._store().lists().map(l => l.title + ':' + l.placeIds.length).join(' | ')));
  await ev(() => App.back()); await wait(350);   // close the picker
  await ev(() => App.back()); await wait(400);   // close the place sheet
  await ev(() => App.show('lists')); await wait(500);
  await shot('22b-lists-two');

  // ── a full survey of a new place ──
  await ev(() => App.show('places')); await wait(300);
  await click('#surveyNewBtn'); await wait(500);
  await shot('23-survey-place-step');
  await type('#npName', 'Quayside Bookshop');
  await ev(() => { const c = [...document.querySelectorAll('#surveyBody .chip')].find(x => x.textContent === 'Shop'); c.click(); });
  await wait(300);
  await type('#npArea', 'Quay Lane');
  await click('#surveyNext'); await wait(500);
  await shot('24-survey-entrance');
  const pick = async (q, label) => {
    await page.evaluate(([qq, ll]) => {
      const box = [...document.querySelectorAll('#surveyBody .q')].find(x => x.querySelector('.q-h').textContent.indexOf(qq) >= 0);
      if (!box) throw new Error('no question ' + qq);
      const c = [...box.querySelectorAll('.chip')].find(x => x.textContent === ll);
      if (!c) throw new Error('no chip ' + ll + ' for ' + qq);
      c.click();
    }, [q, label]);
    await wait(280);
  };
  await pick('How many steps', 'Two steps');
  await pick('tall is the tallest', '15 cm');
  await pick('Is there a ramp', 'Permanent ramp');
  await pick('How wide is the opening', '80 cm');
  await pick('What is the door like', 'Heavy');
  await pick('underfoot in the doorway', 'Small lip under 2 cm');
  await pick('Getting to the door', 'Level');
  await shot('25-survey-entrance-answered');

  // the stepper: does it move the number and hold the scroll?
  const stepInfo = await ev(() => {
    const body = document.getElementById('surveyBody');
    const box = [...document.querySelectorAll('#surveyBody .q')].find(x => x.querySelector('.q-h').textContent.indexOf('tall is the tallest') >= 0);
    box.scrollIntoView({ block: 'center' });
    return { top: body.scrollTop, val: box.querySelector('.stepper .val span').textContent };
  });
  await wait(250);
  await ev(() => {
    const box = [...document.querySelectorAll('#surveyBody .q')].find(x => x.querySelector('.q-h').textContent.indexOf('tall is the tallest') >= 0);
    const plus = box.querySelectorAll('.stepper button')[1];
    for (let i = 0; i < 5; i++) plus.click();
  });
  await wait(300);
  const stepAfter = await ev(() => {
    const body = document.getElementById('surveyBody');
    const box = [...document.querySelectorAll('#surveyBody .q')].find(x => x.querySelector('.q-h').textContent.indexOf('tall is the tallest') >= 0);
    return { top: body.scrollTop, val: box.querySelector('.stepper .val span').textContent, stored: App._store() && null };
  });
  log('stepper before', JSON.stringify(stepInfo), 'after', JSON.stringify(stepAfter));
  await shot('26-stepper');

  // a photograph, through the fake camera
  await ev(() => { const b = [...document.querySelectorAll('#surveyBody .btnrow button')].find(x => /Photograph/.test(x.textContent)); b.click(); });
  await wait(1600);
  await shot('27-camera');
  await click('#camShoot'); await wait(900);
  await shot('28-camera-review');
  await click('#camBlur'); await wait(300);
  await page.mouse.move(190, 400); await page.mouse.down();
  await page.mouse.move(230, 430, { steps: 8 }); await page.mouse.up();
  await wait(400);
  await shot('29-camera-blurred');
  await click('#camKeep'); await wait(1200);
  await shot('30-after-photo');

  // through every remaining step
  for (let i = 0; i < 4; i++) {
    await click('#surveyNext'); await wait(450);
    await shot('31-step-' + i);
    const s = await ev(() => document.querySelector('#surveyBody .step-h').textContent);
    log('step head:', s);
    if (i === 0) { // bathroom
      await pick('Is there a toilet', 'Yes');
      await pick('without steps', 'Yes, step free');
      await pick('built for wheelchair use', 'Yes');
      await pick('Grab bars', 'Both sides');
      await pick('Room to turn inside', 'Roomy, could turn a chair');
    }
    if (i === 1) { // inside
      await pick('room between things', 'Workable');
      await pick('floor all one level', 'All one level');
      await pick('seating like', 'Chairs that move');
    }
    if (i === 2) { // sensory
      await pick('How loud was it', 'Quiet, easy to talk');
      await pick('Music?', 'Background');
      await pick('How is it lit', 'Soft and even');
      await pick('How busy was it', 'Calm');
    }
    if (i === 3) { // staff
      await pick('How did staff respond', 'Knew the answer');
      await pick('Can staff see the door', 'Yes, counter faces it');
    }
  }
  await click('#surveyNext'); await wait(500);
  await shot('32-review-step');
  log('review head:', await ev(() => document.querySelector('#surveyBody .step-h').textContent));
  await click('#surveyNext'); await wait(1200);
  await shot('33-saved-place');
  log('places now:', await ev(() => App._store().places().length));
  log('surveys now:', await ev(() => App._store().db().surveys.length));

  // ── check + you with data ──
  await ev(() => App.back()); await wait(400);
  await ev(() => App.show('check')); await wait(600); await shot('34-check');
  await ev(() => { const s = document.querySelector('#v-check .scroller'); s.scrollTop = s.scrollHeight; }); await wait(400);
  await shot('35-check-bottom');
  await ev(() => App.show('you')); await wait(700); await shot('36-you-top');
  await ev(() => { const s = document.querySelector('#v-you .scroller'); s.scrollTop = 900; }); await wait(400);
  await shot('37-you-mid');
  await ev(() => { const s = document.querySelector('#v-you .scroller'); s.scrollTop = s.scrollHeight; }); await wait(400);
  await shot('38-you-bottom');

  // export through a mocked Native.saveFile
  await ev(() => { window.Native = { isNative: () => true, saveFile: (n, m, b) => { window.__saved = { n, m, len: b.length }; return 'content://x/' + n; }, shareUri: () => true, vibrate: () => {}, vibratePattern: () => {} }; });
  await ev(() => { const b = [...document.querySelectorAll('#youBody button')].find(x => /Send a pack/.test(x.textContent)); b.click(); });
  await wait(900);
  await shot('39-share-sheet');
  await ev(() => { const b = [...document.querySelectorAll('#shareBody button')].find(x => x.textContent === 'Save the file'); b.click(); });
  await wait(1200);
  log('saved file:', JSON.stringify(await ev(() => window.__saved || null)));
  await shot('40-after-save');

  // ── persistence ──
  const beforeReload = await ev(() => ({ p: App._store().places().length, s: App._store().db().surveys.length,
    l: App._store().lists().length, c: App._store().db().confirms.length, lens: JSON.stringify(App._store().lens()) }));
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(900);
  const afterReload = await ev(() => ({ p: App._store().places().length, s: App._store().db().surveys.length,
    l: App._store().lists().length, c: App._store().db().confirms.length, lens: JSON.stringify(App._store().lens()) }));
  log('before reload', JSON.stringify(beforeReload));
  log('after  reload', JSON.stringify(afterReload));
  if (JSON.stringify(beforeReload) !== JSON.stringify(afterReload)) throw new Error('state did not survive a reload');
  await shot('41-after-reload');
  await ev(() => App.openPlace(App._store().places().find(p => p.name === 'Quayside Bookshop').id));
  await wait(1000);
  await shot('42-photo-survived');
  const heroSrc = await ev(() => { const i = document.querySelector('#placeBody .hero img'); return i ? (i.src || '').slice(0, 20) : 'no img'; });
  log('hero after reload:', heroSrc);

  if (errors.length) throw new Error(errors.length + ' page errors');
};
