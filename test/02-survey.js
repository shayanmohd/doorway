/* The full survey: new place, every group, a photograph through the fake camera, save,
   then the place page it lands on. Also the back gesture at every depth. */
module.exports = async ({ page, shot, wait, text, click, errors, log }) => {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('doorway.v1', JSON.stringify({
      v: 1, places: [], surveys: [], confirms: [], lists: [],
      lens: { modules: [{ type: 'wheeled', params: { maxStep: 2, minDoor: 75, toilet: 'must' } }], everyone: false },
      settings: { haptics: true, textScale: 1, onboarded: true, sort: 'name', name: '', sample: false }
    }));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(400);

  await click('#surveyNewBtn'); await wait(400);
  await shot('20-survey-place');
  log('back from survey with nothing: ' + await page.evaluate(() => window.App.back()));
  await wait(200);

  await click('#surveyNewBtn'); await wait(300);
  // empty name guard
  await click('#surveyNext'); await wait(300);
  await shot('21-survey-noname');
  log('toast: ' + await text('#toast'));

  await page.type('#npName', 'The Cartwheel Arms');
  await page.evaluate(() => {
    [...document.querySelectorAll('#surveyBody .chip')].find(c => c.textContent === 'Bar').click();
  });
  await wait(250);
  await page.type('#npArea', 'Fettler Street');
  await click('#surveyNext'); await wait(350);
  await shot('22-survey-entrance');

  // answer entrance
  const pick = async (q, label) => {
    const ok = await page.evaluate((q, label) => {
      const box = [...document.querySelectorAll('#surveyBody .q')].find(x => x.querySelector('.q-h').textContent.indexOf(q) >= 0);
      if (!box) return 'no question: ' + q;
      const c = [...box.querySelectorAll('.chip')].find(c => c.textContent === label);
      if (!c) return 'no chip: ' + label;
      c.click(); return 'ok';
    }, q, label);
    if (ok !== 'ok') log('PICK FAILED ' + ok);
    await wait(220);
  };
  await pick('How many steps', 'One step');
  await pick('How tall is the tallest', '10 cm');
  await pick('Is there a ramp', 'No ramp');
  await pick('How wide is the opening', '75 cm');
  await pick('What is the door like', 'Heavy');
  await pick('What is underfoot', 'Small lip under 2 cm');
  await pick('Getting to the door', 'Level');
  await wait(200);
  await shot('23-survey-entrance-answered');

  // stepper edge: hammer minus below min
  await page.evaluate(() => {
    const box = [...document.querySelectorAll('#surveyBody .q')].find(x => x.querySelector('.q-h').textContent.indexOf('How tall is the tallest') >= 0);
    const minus = box.querySelector('.stepper button');
    for (let i = 0; i < 30; i++) minus.click();
  });
  await wait(300);
  log('step height after 30 minus clicks: ' + await page.evaluate(() => JSON.parse(localStorage.getItem('doorway.v1')) && window.__x));
  await shot('24-stepper-min');

  // camera
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#surveyBody .btn')].find(b => /Photograph/.test(b.textContent));
    b.click();
  });
  await wait(1200);
  await shot('25-camera');
  await click('#camShoot'); await wait(700);
  await shot('26-camera-review');
  await click('#camKeep'); await wait(700);
  await shot('27-after-photo');

  await click('#surveyNext'); await wait(350);
  await shot('28-survey-bathroom');
  await pick('Is there a toilet', 'Yes');
  await pick('Can you get to it', 'Yes, step free');
  await pick('Is a cubicle built', 'Yes');
  await pick('Grab bars', 'Both sides');
  await pick('Room to turn', 'Roomy, could turn a chair');
  await click('#surveyNext'); await wait(350);
  await pick('How much room between', 'Workable');
  await pick('Is the floor all one level', 'All one level');
  await pick('What is the seating like', 'Chairs that move');
  await click('#surveyNext'); await wait(350);
  await shot('29-survey-sensory');
  await pick('How loud was it', 'Moderate');
  await pick('Music?', 'Background');
  await pick('How is it lit', 'Soft and even');
  await pick('How busy was it', 'Busy');
  await click('#surveyNext'); await wait(350);
  await pick('How did staff respond', 'Knew the answer');
  await click('#surveyNext'); await wait(450);
  await shot('30-survey-review');
  await page.evaluate(() => { document.getElementById('surveyBody').scrollTop = 500; });
  await wait(200);
  await shot('31-survey-review-scrolled');
  await click('#surveyNext'); await wait(900);
  await shot('32-saved-place');

  log('sheet stack after save: ' + await text('#placeHeadTitle'));
  log('back 1: ' + await page.evaluate(() => window.App.back())); await wait(300);
  log('back 2 (root): ' + await page.evaluate(() => window.App.back()));
  await wait(200);
  await shot('33-places-after-survey');

  // reload persistence
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(700);
  await shot('34-after-reload');
  log('places after reload: ' + await page.evaluate(() => JSON.parse(localStorage.getItem('doorway.v1')).places.length));
  log('surveys after reload: ' + await page.evaluate(() => JSON.parse(localStorage.getItem('doorway.v1')).surveys.length));
  log('photo rows: ' + await page.evaluate(() => JSON.parse(localStorage.getItem('doorway.v1')).surveys[0].photos.length));
  log('errors: ' + errors.length);
};
