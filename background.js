// background.js — WordLens Background Script
// Creates context menu for text selection and forwards to content script.

browser.contextMenus.create({
  id: 'wordlens-translate',
  title: 'Translate & explore "%s"',
  contexts: ['selection']
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'wordlens-translate' && info.selectionText) {
    browser.tabs.sendMessage(tab.id, {
      action: 'translateSelection',
      text: info.selectionText.trim()
    }).catch(() => {
      // Content script might not be injected on this page (e.g. about:* pages)
    });
  }
});
