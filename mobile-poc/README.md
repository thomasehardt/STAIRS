# STAIRS mobile POC

A feasibility spike: STAIRS's real Python planning code (`visibility.py`,
`scoring.py`, the night scheduler) running **on-device, fully offline**, in a
Capacitor Android shell. Python runs in Pyodide (WASM), the OpenNGC catalog is
queried with duckdb-wasm, and the UI is a single `www/index.html`.

## Install the APK

Every push to `feature/mobile-poc` that touches `mobile-poc/` rebuilds the app
and publishes it to a rolling pre-release. On the phone, open:

**https://github.com/thomasehardt/STAIRS/releases/download/mobile-poc-latest/stairs-poc.apk**

Tap the downloaded file; the first time, Android asks to allow installs from
your browser. Later builds install over the previous one (same signing key,
increasing version code).

## Self-update

After startup the app fetches `latest.json` from the same release (via the
native `AppUpdaterPlugin` - GitHub assets have no CORS headers) and, if the
published `versionCode` is newer than the installed one, shows an **Update
available** banner. Tapping **Install** downloads the APK, verifies its sha256,
and hands it to the Android package installer, which asks for confirmation.
The first time, Android also asks to allow installs from STAIRS (one toggle).
Manual check: Settings → App → **Check for updates**.

## Build locally

```bash
cd mobile-poc
npm install            # also runs scripts/fetch-vendor.mjs (see below)
npx cap sync android   # copy www/ into the Android project
npx cap run android    # build + install on a connected device/emulator
```

Or open `android/` in Android Studio. Local release builds
(`./gradlew assembleRelease`) are unsigned unless the `ANDROID_*` environment
variables described in `android/app/build.gradle` are set.

To iterate on the web UI without Android, serve `www/` over HTTP (ES modules
and WASM don't load from `file://`):

```bash
cd mobile-poc/www && python3 -m http.server 8765
```

## Runtime binaries are fetched, not committed

`www/pyodide/`, `www/duckdb/` and `www/NGC.csv` (~70 MB) are gitignored.
`scripts/fetch-vendor.mjs` (run by `npm install` / `npm run fetch-vendor`)
populates them from pinned sources and verifies every file's sha256:

- Pyodide runtime + wheels: Pyodide `314.0.2` on the jsDelivr Pyodide CDN
- duckdb-wasm: `@duckdb/duckdb-wasm` from `node_modules` (version pinned by
  `package-lock.json`), plus an esbuild bundle of its browser entry point
- `NGC.csv`: copied from `../data/catalogs/openngc/NGC.csv`

## CI signing

`.github/workflows/android-poc.yml` signs release builds with a keystore held
in repository secrets:

| Secret                      | Value                               |
| --------------------------- | ----------------------------------- |
| `ANDROID_KEYSTORE_B64`      | `base64 -w0 stairs-poc-release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password                   |
| `ANDROID_KEY_ALIAS`         | `stairs-poc`                        |
| `ANDROID_KEY_PASSWORD`      | key password (same as keystore)     |

This is a self-signed sideload key, not a Play Store key. If it is ever lost,
generate a new one; phones with an old build must uninstall before installing
a build signed with the new key.

## Vendored STAIRS modules

`www/vendor/` holds copies of `services/api/src/astro_logic/*` and parts of
`services/api/src/planner/*`, lightly adapted for Pyodide (server-only cache
layers removed, API-package imports aliased). The math is unchanged, but the
copies are not synced automatically - see the "Mobile port note" comments at
the top of each adapted file.
