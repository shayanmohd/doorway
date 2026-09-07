/* Safe areas on every screen, the largest text size, and a quick pass with the app rotated
   through its screens fast. Run this one with --reduced-motion too. */
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('doorway.v1', JSON.stringify({
      v: 1, places: [], surveys: [], confirms: [], lists: [],
      lens: { modules: [{ type: 'wheeled', params: {} }, { type: 'sensory', params: {} }], everyone: false },
      settings: { haptics: true, textScale: 1, onboarded: true, sort: 'name', name: '', sample: false }
    }));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--sat', '48px');
    document.documentElement.style.setProperty('--sab', '34px');
  });
  await wait(300);
  await page.evaluate(() => { Sample.install(); window.App.show('places'); });
  await wait(600);
  await page.evaluate(() => { document.getElementById('toast').hidden = true; });
  await shot('50-inset-places');

  await page.evaluate(() => window.App.openPlace('smp-ledger'));
  await wait(600);
  await shot('51-inset-place');
  await page.evaluate(() => window.App.back()); await wait(300);

  await page.evaluate(() => window.App.startSurvey(null, null));
  await wait(500);
  await shot('52-inset-survey');
  await page.evaluate(() => window.App.back()); await wait(400);
  await page.evaluate(() => { const y = document.getElementById('confirmYes'); if (!document.getElementById('confirm').hidden) y.click(); });
  await wait(300);

  for (const v of ['lists', 'check', 'you']) {
    await page.evaluate(v => window.App.show(v), v);
    await wait(450);
    await shot('53-inset-' + v);
  }

  // largest text size on the densest screens
  await page.evaluate(() => { Store.set('textScale', 1.3); document.documentElement.style.setProperty('--fs', '1.3'); window.App.show('places'); });
  await wait(500);
  await shot('54-large-places');
  await page.evaluate(() => window.App.openPlace('smp-orangery'));
  await wait(600);
  await shot('55-large-place');
  await page.evaluate(() => { document.getElementById('placeBody').scrollTop = 1400; });
  await wait(300);
  await shot('56-large-place-scrolled');
  await page.evaluate(() => window.App.back()); await wait(300);
  await page.evaluate(() => window.App.startSurvey('smp-orangery', 'entrance'));
  await wait(600);
  await shot('57-large-survey');
  await page.evaluate(() => window.App.back()); await wait(400);
  await page.evaluate(() => { const y = document.getElementById('confirmYes'); if (!document.getElementById('confirm').hidden) y.click(); });
  await wait(300);
  await page.evaluate(() => { Store.set('textScale', 1); document.documentElement.style.setProperty('--fs', '1'); });

  // rotate fast through screens
  for (let i = 0; i < 3; i++) {
    for (const v of ['places', 'lists', 'check', 'you']) {
      await page.evaluate(v => window.App.show(v), v);
      await wait(60);
    }
  }
  await wait(400);
  await shot('58-after-fast-rotation');

  // onPause / onResume
  const r = await page.evaluate(() => {
    try { window.App.onPause(); window.App.onResume(); return 'ok'; } catch (e) { return 'threw: ' + e.message; }
  });
  log('onPause/onResume: ' + r);
  log('errors: ' + errors.length);
};
