# WordLens 🌐

Select any word on any webpage and **instantly see its translation, pronunciation, related words, and origin** — without leaving the page.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Firefox Add-on](https://img.shields.io/badge/Firefox-Add--on-orange?logo=firefoxbrowser&logoColor=white)](https://addons.mozilla.org/)
[![Made with JavaScript](https://img.shields.io/badge/Made%20with-JavaScript-f7df1e?logo=javascript&logoColor=black)](#)

---

## WordLens

WordLens is an open-source browser extension that turns any selected text into a quick lookup: translation, pronunciation, synonyms, and word origin — all inline, without opening a new tab.

## Questions

Most usage questions are answered in this README. For anything else, open a [discussion or issue](../../issues) on this repository.

## How to contribute

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) for guidelines on reporting bugs, suggesting features, and submitting pull requests.

## Features

- 🌐 **Instant translation** — select text, click the floating icon (or right-click), see the translation in your chosen language (15+ languages supported)
- 🔊 **Audio pronunciation** — hear the word spoken aloud, with a real system-voice picker and adjustable speed
- 📖 **Related words & meaning** — synonyms, definitions, and part-of-speech tags
- 🔍 **Know more (inline)** — word origin and usage context expand right inside the popup, no extra tab needed
- 🔗 **Deep Dive links** — one-click access to Google Define, Wiktionary, and Etymonline
- 📜 **Lookup history** — your last 50 lookups, saved locally on your device
- 🖱️ **Right-click support** — translate without needing the floating icon
- ⚙️ **Full settings panel** — language, voice, speed, popup size, and on/off control from the toolbar

## Installing for use

### From Firefox Add-ons
*(Link will be added here once the store listing is live.)*

### Installing from source (temporary load)

You don't need any build step — WordLens is plain JavaScript/HTML/CSS.

1. Clone the repository:
   ```bash
   git clone https://github.com/L-Lawliet-26/wordlens.git
   ```
2. Open Firefox and go to `about:debugging`.
3. Click **"This Firefox"** → **"Load Temporary Add-on"**.
4. Select the `manifest.json` file inside the cloned folder.
5. Select any text on any webpage to try it out.

> Temporary add-ons are removed when Firefox restarts. For a permanent personal install, see the packaging section below.

## Packaging & signing for permanent personal use

1. Install the [`web-ext`](https://github.com/mozilla/web-ext) CLI:
   ```bash
   npm install -g web-ext
   ```
2. Build the extension:
   ```bash
   web-ext build
   ```
   This creates a `.zip` in `web-ext-artifacts/`.
3. Submit it at [addons.mozilla.org/developers](https://addons.mozilla.org/developers/):
   - Create a free developer account
   - Click **"Submit a New Add-on"**
   - Choose **"On your own"** for self-distribution (unlisted), or list it publicly
   - Upload the `.zip` — Mozilla will review and digitally sign it
   - The signed `.xpi` will persist across browser restarts

## Project structure

| Path | Responsibility |
|---|---|
| `manifest.json` | Extension configuration and permissions |
| `background.js` | Right-click context menu |
| `content.js` | Selection detection, in-page popup, API calls, audio, history |
| `content.css` | In-page popup styling |
| `popup.html` / `popup.js` / `popup.css` | Toolbar settings panel |
| `icons/` | Extension icons |

## APIs used

All free, no API key required:

- [MyMemory Translation API](https://mymemory.translated.net/) — translation (~1000 words/day on the anonymous tier)
- [Free Dictionary API](https://dictionaryapi.dev/) — definitions, synonyms, origin
- Browser's built-in **Web Speech API** — audio pronunciation and voice selection (no network call; available voices depend on what's installed on your OS)

## Privacy

WordLens stores all settings and history **locally on your device only** and never transmits browsing data anywhere except the two APIs above (and only the selected word itself, never the page or your history). See [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md) for full details.

## Known limitations / Roadmap

- "Only this site" toggle is currently UI-only — full per-site enforcement is planned.
- Full-page translation (beyond selected text) is not yet supported.
- Available voices depend on what's installed on the user's OS/browser.
- Only one translation engine (MyMemory) is used — comparing multiple engines side-by-side is not implemented.

## Code of conduct

This project follows a standard [Code of Conduct](./CODE_OF_CONDUCT.md) — be respectful, be constructive.

## License

[MIT](./LICENSE) — free to use, modify, and distribute with attribution.

---

<sub>Built by <a href="https://github.com/L-Lawliet-26">L-Lawliet-26</a> as a learning project while studying Python and web development. Feedback and ⭐ stars appreciated.</sub>
