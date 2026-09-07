/* The bugs this pass fixed, each one asserted so they cannot come back:
   the survey keeping its place on the page, the stepper, a second tap on save, one
   confirmation a day, a photograph whose bytes are gone, blank titles, and long names. */
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  const fresh = async (extra) => {
    await page.evaluate(x => {
      localStorage.clear();
      localStorage.setItem('doorway.v1', JSON.stringify(Object.assign({
        v: 1, places: [], surveys: [], confirms: [], lists: [],
        lens: { modules: [{ type: 'wheeled', params: {} }], everyone: false },
        settings: { haptics: true, textScale: 1, onboarded: true, sort: 'name', name: '', sample: false }
      }, x || {})));
    }, extra || null);
    await page.reload({ waitUntil: 'networkidle0' });
    await wait(350);
  };

  // 1. answering a question must not scroll the survey back to the top
  await fresh();
  await click('#surveyNewBtn'); await wait(300);
  await page.type('#npName', 'Scroll Test');
  await page.evaluate(() => document.getElementById('surveyNext').click()); await wait(350);
  await page.evaluate(() => { document.getElementById('surveyBody').scrollTop = 600; });
  await wait(250);
  const before = await page.evaluate(() => document.getElementById('surveyBody').scrollTop);
  await page.evaluate(() => {
    const box = [...document.querySelectorAll('#surveyBody .q')].find(x => /door like/.test(x.querySelector('.q-h').textContent));
    box.querySelectorAll('.chip')[3].click();
  });
  await wait(350);
  const after = await page.evaluate(() => document.getElementById('surveyBody').scrollTop);
  log('scroll kept on answer: ' + before + ' -> ' + after + (Math.abs(before - after) < 40 ? '  PASS' : '  FAIL'));
  await shot('80-scroll-kept');

  // moving to the next step starts at the top again
  await page.evaluate(() => document.getElementById('surveyNext').click()); await wait(350);
  log('new step starts at top: ' + await page.evaluate(() => document.getElementById('surveyBody').scrollTop));

  // 2. the stepper moves one unit a tap and stops at the limits
  await page.evaluate(() => { window.App.back(); }); await wait(300);
  await page.evaluate(() => { const y = document.getElementById('confirmYes'); if (!document.getElementById('confirm').hidden) y.click(); });
  await wait(300);
  await fresh();
  await click('#surveyNewBtn'); await wait(300);
  await page.type('#npName', 'Stepper');
  await page.evaluate(() => document.getElementById('surveyNext').click()); await wait(350);
  await page.evaluate(() => {
    const q = [...document.querySelectorAll('#surveyBody .q')].find(x => /How wide is the opening/.test(x.querySelector('.q-h').textContent));
    [...q.querySelectorAll('.chip')].find(c => c.textContent === '70 cm').click();
  });
  await wait(300);
  const stepped = await page.evaluate(() => {
    const q = [...document.querySelectorAll('#surveyBody .q')].find(x => /How wide is the opening/.test(x.querySelector('.q-h').textContent));
    const plus = q.querySelectorAll('.stepper button')[1];
    for (let i = 0; i < 5; i++) plus.click();
    return q.querySelector('.stepper .val span').textContent;
  });
  log('70 plus five taps: ' + stepped + (stepped === '75' ? '  PASS' : '  FAIL'));
  const floored = await page.evaluate(() => {
    const q = [...document.querySelectorAll('#surveyBody .q')].find(x => /How wide is the opening/.test(x.querySelector('.q-h').textContent));
    const minus = q.querySelectorAll('.stepper button')[0];
    for (let i = 0; i < 60; i++) minus.click();
    return q.querySelector('.stepper .val span').textContent;
  });
  log('minus past the floor: ' + floored + (floored === '50' ? '  PASS (min 50)' : '  FAIL'));

  // 3. a second tap on save must not throw
  await page.evaluate(() => {
    while (document.getElementById('surveyNext').textContent !== 'Save survey') document.getElementById('surveyNext').click();
  });
  await wait(400);
  await page.evaluate(() => { const b = document.getElementById('surveyNext'); b.click(); b.click(); b.click(); });
  await wait(700);
  log('surveys saved after three taps: ' + await page.evaluate(() => Store.db().surveys.length) + ' (want 1)');
  log('page errors so far: ' + errors.length + (errors.length ? '  FAIL' : '  PASS'));

  // 4. one confirmation a day
  await page.evaluate(() => { const b = document.getElementById('stillBtn'); for (let i = 0; i < 8; i++) b.click(); });
  await wait(500);
  const cn = await page.evaluate(() => Store.db().confirms.length);
  log('confirmations after eight taps: ' + cn + (cn === 1 ? '  PASS' : '  FAIL'));
  await shot('81-one-confirm');

  // 5. a photograph whose bytes are gone falls back to the drawing
  await fresh({
    places: [{ id: 'pz', name: 'Gone Photo Cafe', kind: 'Cafe', area: 'Mill Lane', note: '', lat: null, lng: null, at: Date.now() }],
    surveys: [{ id: 'sz', placeId: 'pz', at: Date.now() - 86400000, by: 'you', slot: 'midday', seconds: 70,
                facts: { 'entrance.steps': 1, 'entrance.step_height_cm': 11, 'entrance.door_width_cm': 76, 'entrance.ramp': 'none' },
                photos: [{ media: 'missing-bytes', role: 'entrance', at: Date.now() - 86400000 }] }]
  });
  await page.evaluate(() => window.App.openPlace('pz'));
  await wait(900);
  const hero = await page.evaluate(() => {
    const h = document.querySelector('#placeBody .hero');
    return { canvas: !!h.querySelector('canvas'), img: !!h.querySelector('img'), cap: (h.querySelector('.hero-cap') || {}).textContent || '' };
  });
  log('missing photo hero: ' + JSON.stringify(hero) + (hero.canvas && !hero.img ? '  PASS' : '  FAIL'));
  await shot('82-missing-photo');

  // 6. blank and overlong text
  const names = await page.evaluate(() => {
    Store.addList('   ');
    const l = Store.lists()[0];
    Store.renameList(l.id, '    ');
    const p = Store.addPlace({ name: '   ', area: 'x'.repeat(300), note: 'y'.repeat(900) });
    return { list: Store.lists()[0].title, place: p.name, area: p.area.length, note: p.note.length };
  });
  log('blank and long: ' + JSON.stringify(names));
  log((names.list && names.place && names.area <= 80 && names.note <= 400) ? '  PASS' : '  FAIL');

  // 7. deleting everything drops the last position too
  await page.evaluate(() => { Store.set('lastFix', { lat: 1, lng: 2, acc: 9, at: Date.now() }); Geo.clear(); Store.wipe(); });
  log('lastFix after delete everything: ' + await page.evaluate(() => JSON.stringify(Store.settings().lastFix)));
  log('errors: ' + errors.length);
};
