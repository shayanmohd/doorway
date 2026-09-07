/* Reviewer pass 3: window.App.back() on every nested screen, and onPause / onResume. */
module.exports = async ({ page, shot, wait, text, click, type, errors, log }) => {
  const ev = fn => page.evaluate(fn);
  const evA = (fn, a) => page.evaluate(fn, a);
  const fails = [];
  const expect = (name, got, want) => { const ok = got === want; log((ok ? 'ok   ' : 'FAIL ') + name + ': back() -> ' + got + ' (wanted ' + want + ')'); if (!ok) fails.push(name); };

  // ── a first-run phone: onboarding is the root ──
  await ev(() => { localStorage.clear(); try { indexedDB.deleteDatabase('doorway-photos'); } catch (e) {} });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(600);
  expect('onboarding root', await ev(() => App.back()), false);
  await click('#obNext'); await wait(250);
  await click('#obNext'); await wait(250);
  await click('#obNext'); await wait(400);           // lens setup
  log('lens setup shown:', await ev(() => !document.getElementById('lensSetup').hidden));
  expect('lens setup', await ev(() => App.back()), true);
  log('back on onboarding:', await ev(() => !document.getElementById('onboard').hidden));
  await shot('60-back-to-onboard');
  await click('#obNext'); await wait(400);
  await click('#lensSkip'); await wait(600);

  // seed something to work with
  await ev(() => { Sample.install(); App.show('places'); });
  await wait(600);
  expect('places root', await ev(() => App.back()), false);

  for (const v of ['lists', 'check', 'you']) {
    await evA(x => App.show(x), v);
    await wait(400);
    expect(v + ' tab', await ev(() => App.back()), true);
    log('  view now:', await ev(() => ['places', 'lists', 'check', 'you'].find(x => !document.getElementById('v-' + x).hidden)));
  }

  // place sheet
  await ev(() => App.openPlace('smp-ledger')); await wait(600);
  expect('place sheet', await ev(() => App.back()), true);
  log('  sheet hidden:', await ev(() => document.getElementById('sh-place').hidden));

  // list picker stacked on the place sheet
  await ev(() => App.openPlace('smp-ledger')); await wait(600);
  await ev(() => { [...document.querySelectorAll('#placeActions button')].find(b => /Add to a list/.test(b.textContent)).click(); });
  await wait(500);
  expect('list picker over place', await ev(() => App.back()), true);
  log('  picker hidden, place still open:', await ev(() => document.getElementById('sh-lists').hidden && !document.getElementById('sh-place').hidden));
  expect('place under picker', await ev(() => App.back()), true);

  // the naming step inside the picker
  await ev(() => App.openPlace('smp-coffee')); await wait(600);
  await ev(() => { [...document.querySelectorAll('#placeActions button')].find(b => /Add to a list/.test(b.textContent)).click(); });
  await wait(400);
  await ev(() => { [...document.querySelectorAll('#listPickBody button')].find(b => /New list with this place/.test(b.textContent)).click(); });
  await wait(400);
  await shot('61-name-list-in-picker');
  expect('naming step', await ev(() => App.back()), true);
  await ev(() => App.back()); await wait(300);

  // survey: empty leaves at once, with answers it asks
  await ev(() => App.startSurvey(null, null)); await wait(500);
  expect('empty survey', await ev(() => App.back()), true);
  log('  survey sheet hidden:', await ev(() => document.getElementById('sh-survey').hidden));
  await ev(() => App.startSurvey(null, null)); await wait(500);
  await type('#npName', 'Somewhere');
  await ev(() => App.back()); await wait(400);
  log('  confirm modal open:', await ev(() => !document.getElementById('confirm').hidden));
  await shot('62-abandon-modal');
  expect('modal over survey', await ev(() => App.back()), true);
  log('  modal closed, survey still open:', await ev(() => document.getElementById('confirm').hidden && !document.getElementById('sh-survey').hidden));
  await ev(() => App.back()); await wait(300);
  await ev(() => document.getElementById('confirmYes').click()); await wait(400);
  log('  survey gone:', await ev(() => document.getElementById('sh-survey').hidden));

  // camera, opened from inside a survey
  await ev(() => App.startSurvey('smp-ledger', 'entrance')); await wait(500);
  await ev(() => { [...document.querySelectorAll('#surveyBody .btnrow button')].find(b => /Photograph/.test(b.textContent)).click(); });
  await wait(1600);
  log('  camera running:', await ev(() => { const v = document.getElementById('camVideo'); return !!(v.srcObject && v.videoWidth); }));
  expect('camera sheet', await ev(() => App.back()), true);
  const camStopped = await ev(() => { const v = document.getElementById('camVideo'); return v.srcObject === null; });
  log('  camera released:', camStopped);
  if (!camStopped) fails.push('camera not released on back');
  expect('survey under camera', await ev(() => App.back()), true);
  await wait(400);
  await ev(() => { const y = document.getElementById('confirmYes'); if (!document.getElementById('confirm').hidden) y.click(); });
  await wait(400);

  // lens editor, share, import
  await ev(() => App.show('you')); await wait(500);
  await ev(() => { [...document.querySelectorAll('#youBody button')].find(b => /Edit your lens|Build a lens/.test(b.textContent)).click(); });
  await wait(500);
  expect('lens sheet', await ev(() => App.back()), true);
  await ev(() => { [...document.querySelectorAll('#youBody button')].find(b => /Send a pack/.test(b.textContent)).click(); });
  await wait(700);
  expect('share sheet', await ev(() => App.back()), true);
  await ev(() => { [...document.querySelectorAll('#youBody button')].find(b => /Add a pack/.test(b.textContent)).click(); });
  await wait(500);
  expect('import sheet', await ev(() => App.back()), true);

  // a bare confirm modal
  await ev(() => { [...document.querySelectorAll('#youBody button')].find(b => /Delete everything/.test(b.textContent)).click(); });
  await wait(400);
  expect('confirm modal', await ev(() => App.back()), true);
  log('  modal dismissed without deleting:', await ev(() => App._store().places().length) + ' places left');
  expect('you tab after modal', await ev(() => App.back()), true);
  expect('places root again', await ev(() => App.back()), false);

  // ── onPause / onResume ──
  const life = await ev(() => {
    const out = [];
    try { App.onPause(); out.push('pause ok'); } catch (e) { out.push('pause THREW ' + e.message); }
    try { App.onResume(); out.push('resume ok'); } catch (e) { out.push('resume THREW ' + e.message); }
    return out;
  });
  log('lifecycle at root:', life.join(', '));
  if (life.some(x => /THREW/.test(x))) fails.push('lifecycle at root');

  // and with the camera live, which is the case that matters
  await ev(() => App.startSurvey('smp-ledger', 'entrance')); await wait(500);
  await ev(() => { [...document.querySelectorAll('#surveyBody .btnrow button')].find(b => /Photograph/.test(b.textContent)).click(); });
  await wait(1600);
  const life2 = await ev(() => {
    const out = [];
    try { App.onPause(); out.push('pause ok'); } catch (e) { out.push('pause THREW ' + e.message); }
    out.push('camera released: ' + (document.getElementById('camVideo').srcObject === null));
    try { App.onResume(); out.push('resume ok'); } catch (e) { out.push('resume THREW ' + e.message); }
    return out;
  });
  log('lifecycle with the camera open:', life2.join(', '));
  if (life2.some(x => /THREW/.test(x))) fails.push('lifecycle with camera');
  if (!life2.includes('camera released: true')) fails.push('onPause left the camera running');
  await wait(400);
  await shot('63-after-pause-resume');

  // onResume during a survey must not lose the survey in progress
  await ev(() => App.back()); await wait(300);
  const survived = await ev(() => { App.onResume(); return !document.getElementById('sh-survey').hidden; });
  log('survey survives a resume:', survived);
  await ev(() => App.back()); await wait(300);
  await ev(() => { const y = document.getElementById('confirmYes'); if (!document.getElementById('confirm').hidden) y.click(); });
  await wait(300);

  if (fails.length) throw new Error('back/lifecycle failures: ' + fails.join(', '));
  if (errors.length) throw new Error(errors.length + ' page errors');
};
