# Doorway

A personal access atlas. Survey the places you go in about ninety seconds, then read them back through
your own needs: the step you can get over, the narrowest door you fit through, the noise you can be in.
No account, no server, no internet permission.

- **Play listing:** https://play.google.com/store/apps/details?id=com.mohdshayan.doorway
- **Site:** https://shayanmohd.github.io/doorway/
- **Try it in a browser:** https://shayanmohd.github.io/doorway/play/
- **Privacy policy:** https://shayanmohd.github.io/doorway/privacy-policy.html

## How it is built

`web/` is the whole app: plain HTML, CSS and JavaScript, no build step and no dependencies.

- `js/store.js` is the fact ontology (about thirty keys across five groups), the persistence, and the
  composition engine that turns several partial surveys of one place into a single answer with its
  provenance, its confirmation count and its age.
- `js/lens.js` is the needs engine. A module is a need, its parameters are your thresholds, and its
  rules turn composed facts into a verdict whose every line names the fact it came from. A place whose
  data has not been seen for a year is downgraded automatically.
- `js/diagram.js` draws the entrance elevation and the toilet plan to scale from the surveyed numbers,
  used wherever a photograph has not been taken.
- `js/photos.js` keeps photographs as JPEG bytes in IndexedDB and carries the blur brush, which
  destroys the pixels you paint over before the file is written.
- `js/share.js` writes and reads packs: plain JSON files that carry places and surveys between phones
  by hand, which is the only pooling mechanism an offline app can honestly offer.

`android/` is a thin Kotlin WebView shell that serves `web/` from an app-private https origin, adds the
camera and geolocation permission plumbing, haptics and file export, and declares no INTERNET permission.

`docs/` is the GitHub Pages site: landing page, privacy policy and a playable copy of the app.

## Build

```sh
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew bundleRelease
```

Signing reads `android/keystore.properties`, which is not in this repository.
