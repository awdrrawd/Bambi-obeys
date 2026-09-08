# Bambi Obeys

Bambi Obeys is a Bondage Club userscript. Install `Bambi-Obeys.user.js` for the
small network loader, or install `dist/Bambi-Obeys.user.js` as a completely
standalone script.

## Structure

- `Bambi-Obeys.user.js` — small userscript loader with an early duplicate check.
- `src/main.js` — authoritative duplicate-load guard and namespace bootstrap.
- `src/app.js` — application state, audio, networking, and startup coordination.
- `src/ui.js` — panel rendering, UI state, controls, and drag behavior.
- `src/hooks.js` — ModSDK message and character-label hooks.
- `src/config.js` — version, storage keys, defaults, and trigger metadata.
- `src/i18n.js` — English and Simplified Chinese translations.
- `dist/Bambi-Obeys.user.js` — minified single-file userscript; no source map.

The loader and bootstrap intentionally repeat the duplicate check. The bootstrap
owns the guard, so simultaneous loaders and direct module imports cannot initialize
the plugin twice. If startup fails, it releases the namespace so the plugin can be
retried.

## Global namespace

The plugin registers only `globalThis.Bambi_Obeys`. Its diagnostic and management
surface is grouped below that namespace:

- `Bambi_Obeys.state` and `Bambi_Obeys.version`
- `Bambi_Obeys.config`
- `Bambi_Obeys.i18n`
- `Bambi_Obeys.api`

Language can be selected in the panel or changed from the console with
`Bambi_Obeys.i18n.setLocale("en")`, `setLocale("zh-CN")`, or `setLocale("auto")`.

## Build and local testing

```text
npm install
npm run check
npm run build
```

`npm run build` produces only `dist/Bambi-Obeys.user.js`. All source modules,
translations, and duplicate-load protection are inlined into that file.

For live local testing, install `loader.local.user.js` in the userscript manager,
then run `npm run dev` (or double-click `run_dev.bat`) and reload Bondage Club.
The local loader requests `http://localhost:5174/Bambi-Obeys.user.js` with a cache
buster on every reload.
