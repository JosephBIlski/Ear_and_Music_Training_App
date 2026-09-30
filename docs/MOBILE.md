# Mobile app & sync

## 1. Fastest way to test on a phone: install the PWA

The web build is a Progressive Web App (offline-capable, installable, full screen).

1. Host the build somewhere reachable from your phone. Easiest: the GitHub Pages workflow in `.github/workflows/deploy.yml` (repository Settings → Pages → Source: **GitHub Actions**; the workflow runs on pushes to `main`, or run it manually from the Actions tab on any branch).
   For a quick LAN test instead: `npm run build && npx vite preview --host` and open the printed network URL on the phone (mic requires HTTPS or localhost, so prefer Pages for the singing module).
2. Open the URL on the phone.
   - **Android (Chrome/Edge):** tap the install banner or menu → *Add to Home screen* / *Install app*. The Settings page also has an *Install Ear Trainer* button.
   - **iOS (Safari):** Share → *Add to Home Screen*. Microphone access inside home-screen web apps works on iOS 16.4+.
3. Launch from the home screen. Updates are picked up automatically on the next launch.

Notes: Web MIDI is not available on iOS. Audio starts after your first tap (Start button), which is required by mobile browsers.

## 2. Native iOS / Android app with Capacitor

The repository is pre-configured for [Capacitor](https://capacitorjs.com) (`capacitor.config.ts`, `@capacitor/core`, `@capacitor/cli`). The native projects are generated locally because they need the platform SDKs:

```bash
npm install
npm run build

# Android (needs Android Studio + SDK)
npm i @capacitor/android
npx cap add android
npm run cap:android          # builds web assets, syncs them, opens Android Studio → Run on a device/emulator

# iOS (needs macOS + Xcode + CocoaPods)
npm i @capacitor/ios
npx cap add ios
npm run cap:ios              # opens Xcode → set a signing team → Run
```

Permissions to add after `cap add`:

- Android: in `android/app/src/main/AndroidManifest.xml` add
  `<uses-permission android:name="android.permission.RECORD_AUDIO" />` and
  `<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />`.
- iOS: in `ios/App/App/Info.plist` add `NSMicrophoneUsageDescription` with a sentence like
  "The microphone is used to check your singing pitch."

After any web change: `npm run cap:sync` and rebuild from the IDE. The app id is `app.eartrainer`; change it in `capacitor.config.ts` before publishing.

## 3. Syncing progress between browser and app

Settings → **Sync between devices**. Two storage options, both end up with one JSON snapshot that every device pulls, merges and pushes:

### Private GitHub Gist (recommended, no server)

1. GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate new token with only the **gist** scope.
2. In the app choose *Private GitHub Gist*, paste the token, press **Sync now**. A private gist is created and its id appears in the field.
3. On each other device: choose *Private GitHub Gist*, paste the same token **and** the gist id, press **Sync now**.

### Custom endpoint (Cloudflare Worker)

`sync-server/worker.js` is a complete worker that stores the snapshot in KV behind a bearer token:

```bash
cd sync-server
npm i -g wrangler && wrangler login
wrangler kv namespace create SNAPSHOTS     # copy the id into wrangler.toml
wrangler secret put SYNC_TOKEN             # a long random string
wrangler deploy                            # prints https://ear-trainer-sync.<you>.workers.dev
```

In the app choose *Custom sync server*, enter the worker URL and the token. Any other server that answers `GET` (snapshot JSON or 404) and `PUT` (store body) with `Authorization: Bearer <token>` also works.

### How merging works

- Spaced-repetition items: the most recently practised copy wins, but attempt/correct counts never decrease.
- Level results: passed if passed anywhere, best accuracy is the maximum, attempts the maximum.
- Session history: union by id. Confusion counts: maximum. Today's plan: the copy with more completed blocks.
- Settings: from whichever device changed them most recently.

Sync runs on start, a few seconds after every finished exercise run, when the app is backgrounded, and when connectivity returns. It can also be triggered with **Sync now**. Manual export/import of a JSON file is still available as a backup.
