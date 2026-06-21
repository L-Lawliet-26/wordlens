# Privacy Policy — WordLens

**Last updated:** June 2026

WordLens ("the extension") is built with privacy as a priority. This policy explains exactly what data the extension touches and where it goes.

## What data WordLens accesses

1. **Selected text** — when you select text on a webpage and use the extension, that selected text (and only that text) is sent to two third-party services to fetch a translation and dictionary definition:
   - [MyMemory Translation API](https://mymemory.translated.net/) (`api.mymemory.translated.net`)
   - [Free Dictionary API](https://dictionaryapi.dev/) (`api.dictionaryapi.dev`)

   No other content from the page, and no other browsing data, is ever sent anywhere.

2. **Settings and history** — your chosen target language, voice, voice speed, popup size, on/off state, and your recent word-lookup history are stored **locally on your own device** using the browser's built-in `storage.local` API. This data:
   - Never leaves your device.
   - Is never sent to any server controlled by the developer.
   - Is not visible to the developer in any way.
   - Can be cleared at any time using the "Clear" button in the History tab, or by removing the extension.

## What WordLens does NOT do

- Does not collect, log, or transmit your browsing history.
- Does not use cookies or trackers.
- Does not sell or share any data with advertisers or third parties.
- Does not require an account, sign-in, or any personal information.

## Third-party services

When you look up a word, the selected text is sent directly from your browser to MyMemory and Free Dictionary API's servers to retrieve the translation/definition. These are independent third-party services; their own privacy policies govern how they handle requests made to them. WordLens does not control or have visibility into their server-side logging practices.

## Permissions explained

- **activeTab** — needed to detect text selection on the page you're viewing.
- **contextMenus** — needed to show the right-click "Translate & explore" option.
- **storage** — needed to save your settings and history locally on your device.
- **Host permissions for the two APIs above** — needed to make the translation/dictionary requests.

## Changes to this policy

If this policy changes, the updated version will be published in this same repository with a new "Last updated" date.

## Contact

For questions about this policy, open an issue on the [GitHub repository](https://github.com/L-Lawliet-26/wordlens).
