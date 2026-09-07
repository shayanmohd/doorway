/* The upgrade path from the shipped 1.0.0 store, the back gesture at every depth,
   and what happens when location is refused. Run this one with --dark as well. */
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  // Exactly what 1.0.0's store.js wrote: v:1, places/surveys/confirms/lists/lens/settings,
  // sample places carrying the `sample` flag, a lastFix in settings, photos keyed into IndexedDB.
  const V1 = {
    v: 1,
    places: [
      { id: 'p1a2b3c', name: 'Ambleside Deli', kind: 'Shop', area: 'Fell Road', note: 'Ask at the counter.',
        lat: 53.4015, lng: -2.9881, at: 1756000000000 },
      { id: 'smp-coffee', name: 'Harbourgate Coffee', kind: 'Cafe', area: 'Sample: Harbourgate Street',
        note: 'Counter is low on the left hand side.', lat: 53.4014, lng: -2.9882, at: 1738000000000, sample: true }
    ],
    surveys: [
      { id: 's9x8y7z', placeId: 'p1a2b3c', at: 1756100000000, by: 'you', slot: 'midday', seconds: 84,
        facts: { 'entrance.steps': 1, 'entrance.step_height_cm': 12, 'entrance.ramp': 'portable',
                 'entrance.door_width_cm': 78, 'bathroom.exists': 'no', 'sensory.noise': 'moderate' },
        photos: [{ media: 'abc123-9k', role: 'entrance', at: 1756100000000 }] },
      { id: 'smp-s0', placeId: 'smp-coffee', at: 1756200000000, by: 'you', slot: 'morning', seconds: 96,
        facts: { 'entrance.steps': 0, 'entrance.door_width_cm': 86, 'bathroom.accessible': 'yes' }, photos: [] }
    ],
    confirms: [{ id: 'c5t4r3', placeId: 'p1a2b3c', at: 1756300000000, by: 'you' }],
    lists: [{ id: 'l1q2w3', title: 'Bad day places', placeIds: ['p1a2b3c', 'smp-coffee'], at: 1756000000000 }],
    lens: { modules: [{ type: 'wheeled', params: { maxStep: 5, minDoor: 80, toilet: 'prefer' } },
                      { type: 'hearing', params: { loop: 'want', lipread: 'need' } }], everyone: false },
    settings: { haptics: false, textScale: 1.15, onboarded: true, sort: 'distance', name: 'Fell Road crew',
                sample: true, lastFix: { lat: 53.4012, lng: -2.9885, acc: 14, at: 1756400000000 } }
  };
  await page.evaluate(v => { localStorage.clear(); localStorage.setItem('doorway.v1', JSON.stringify(v)); }, V1);
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(800);

  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('doorway.v1')));
  const report = await page.evaluate(() => ({
    places: Store.places().length,
    names: Store.places().map(p => p.name),
    surveys: Store.db().surveys.length,
    confirms: Store.db().confirms.length,
    lists: Store.lists().map(l => l.title + ':' + l.placeIds.length),
    lens: JSON.stringify(Store.lens()),
    settings: JSON.stringify(Store.settings()),
    sampleFlagKept: Store.places().filter(p => p.sample).length,
    photoRow: JSON.stringify(Store.db().surveys[0].photos),
    composed: Object.keys(Store.compose('p1a2b3c').facts).length,
    verdict: (Lens.verdict(Store.compose('p1a2b3c'), Store.lens()) || {}).label
  }));
  log('after upgrade: ' + JSON.stringify(report, null, 1));
  await shot('60-upgrade-places');
  await page.evaluate(() => window.App.openPlace('p1a2b3c'));
  await wait(600);
  await shot('61-upgrade-place');
  log('missing photo handled: ' + await text('.hero'));
  await page.evaluate(() => window.App.back()); await wait(300);
  await page.evaluate(() => window.App.show('lists')); await wait(400);
  await shot('62-upgrade-lists');
  await page.evaluate(() => window.App.show('you')); await wait(400);
  await shot('63-upgrade-you');
  log('text scale kept: ' + await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--fs')));

  // ── back gesture at every depth ──
  const back = () => page.evaluate(() => window.App.back());
  await page.evaluate(() => window.App.show('places')); await wait(300);
  log('root places: ' + await back());
  await page.evaluate(() => window.App.show('check')); await wait(300);
  log('from check (to places): ' + await back());
  log('now at root: ' + await back());

  await page.evaluate(() => window.App.openPlace('p1a2b3c')); await wait(400);
  log('place sheet: ' + await back()); await wait(200);
  await page.evaluate(() => { window.App.openPlace('p1a2b3c'); }); await wait(400);
  await page.evaluate(() => { document.querySelectorAll('#placeBody .btn').forEach(b => { if (b.textContent === 'Add to a list') b.click(); }); });
  await wait(400);
  await shot('64-list-picker');
  log('list picker: ' + await back()); await wait(200);
  log('place sheet under it: ' + await back()); await wait(200);

  await page.evaluate(() => window.App.startSurvey('p1a2b3c', 'entrance')); await wait(400);
  log('survey, nothing answered: ' + await back()); await wait(300);
  await page.evaluate(() => window.App.startSurvey('p1a2b3c', 'entrance')); await wait(400);
  await page.evaluate(() => { document.querySelector('#surveyBody .q .chip').click(); }); await wait(300);
  log('survey with an answer (opens the modal): ' + await back()); await wait(300);
  await shot('65-abandon-modal');
  log('modal: ' + await back()); await wait(300);
  log('survey still open, back again: ' + await back()); await wait(300);
  await page.evaluate(() => { const y = document.getElementById('confirmYes'); if (!document.getElementById('confirm').hidden) y.click(); });
  await wait(300);

  await page.evaluate(() => window.App.show('you')); await wait(300);
  await page.evaluate(() => { [...document.querySelectorAll('#youBody .btn')].find(b => /lens/.test(b.textContent)).click(); });
  await wait(500);
  await shot('66-lens-editor');
  log('lens sheet: ' + await back()); await wait(200);

  await page.evaluate(() => window.App.startSurvey(null, null)); await wait(400);
  await page.evaluate(() => { const b = [...document.querySelectorAll('#surveyBody .btn')].find(b => /Photograph/.test(b.textContent)); if (b) b.click(); });
  await wait(300);
  await page.evaluate(() => window.App.startSurvey('p1a2b3c', 'entrance'));
  await wait(200);
  log('errors: ' + errors.length);
};
