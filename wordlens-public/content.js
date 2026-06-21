// content.js — WordLens Content Script
// Handles text selection, floating icon, in-page popup card,
// API calls (MyMemory + Free Dictionary), speech synthesis, and history.

(function () {
  'use strict';

  // ============================================================
  // Settings & State
  // ============================================================

  let settings = {
    enabled: true,
    targetLang: 'hi',
    autoSpeak: false,
    voiceSpeed: 1.0,
    popupSize: 'medium',
  };

  let floatingIcon = null;
  let popupCard = null;
  let selectedText = '';
  let lastSelectionRect = null; // stored so popup can reuse the same anchor

  // ============================================================
  // Utility: Escape HTML to prevent layout-breaking injected text
  // ============================================================

  function escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  // ============================================================
  // Settings — load from storage & listen for live changes
  // ============================================================

  async function loadSettings() {
    try {
      const result = await browser.storage.local.get([
        'enabled',
        'targetLang',
        'autoSpeak',
        'voiceSpeed',
        'popupSize',
      ]);
      if (result.enabled !== undefined) settings.enabled = result.enabled;
      if (result.targetLang) settings.targetLang = result.targetLang;
      if (result.autoSpeak !== undefined) settings.autoSpeak = result.autoSpeak;
      if (result.voiceSpeed !== undefined) settings.voiceSpeed = result.voiceSpeed;
      if (result.popupSize) settings.popupSize = result.popupSize;
    } catch (e) {
      /* use defaults */
    }
  }

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      for (const [key, { newValue }] of Object.entries(changes)) {
        if (key in settings) settings[key] = newValue;
      }
    }
  });

  // ============================================================
  // Floating Icon — the small 🌐 circle above the selection
  // Uses position:fixed so coordinates match getBoundingClientRect
  // (viewport-relative). No scroll offset math needed.
  // ============================================================

  function showFloatingIcon(viewportX, viewportY) {
    removeFloatingIcon();
    removePopupCard();

    floatingIcon = document.createElement('div');
    floatingIcon.id = 'wordlens-floating-icon';
    floatingIcon.textContent = '🌐';
    floatingIcon.style.position = 'fixed';

    // Clamp to viewport (all values are viewport-relative)
    const iconSize = 36;
    let left = Math.max(4, Math.min(viewportX, window.innerWidth - iconSize - 4));
    let top = Math.max(4, viewportY);
    floatingIcon.style.left = left + 'px';
    floatingIcon.style.top = top + 'px';

    floatingIcon.addEventListener('mousedown', (e) => {
      e.preventDefault(); // prevent deselection
      e.stopPropagation();
    });

    floatingIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      // Use the stored selection rect to position the popup,
      // NOT the icon's current rect (selection may have collapsed).
      if (lastSelectionRect) {
        handleLookup(selectedText, lastSelectionRect);
      } else {
        // Fallback: use icon's own position
        const iconRect = floatingIcon.getBoundingClientRect();
        handleLookup(selectedText, iconRect);
      }
    });

    document.body.appendChild(floatingIcon);
  }

  function removeFloatingIcon() {
    if (floatingIcon && floatingIcon.parentNode) {
      floatingIcon.parentNode.removeChild(floatingIcon);
    }
    floatingIcon = null;
  }

  // ============================================================
  // Popup Card — remove helper
  // ============================================================

  function removePopupCard() {
    if (popupCard && popupCard.parentNode) {
      popupCard.parentNode.removeChild(popupCard);
    }
    popupCard = null;
  }

  // ============================================================
  // Selection Detection
  // ============================================================

  document.addEventListener('mouseup', (e) => {
    // Ignore clicks on our own elements
    if (
      e.target.closest('#wordlens-floating-icon') ||
      e.target.closest('#wordlens-popup')
    )
      return;

    // Small delay to let the selection settle
    setTimeout(() => {
      if (!settings.enabled) return;

      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : '';

      if (text.length >= 1 && text.length <= 100) {
        selectedText = text;
        try {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          // Store the rect for later popup positioning
          lastSelectionRect = rect;
          const iconSize = 36;
          const gap = 6;
          // Icon goes ABOVE the selection, near the right edge
          const iconLeft = rect.right - iconSize;
          const iconTop = rect.top - iconSize - gap;
          showFloatingIcon(iconLeft, iconTop);
        } catch (err) {
          // Fallback position (viewport-relative)
          lastSelectionRect = null;
          showFloatingIcon(e.clientX, e.clientY - 48);
        }
      } else {
        removeFloatingIcon();
        removePopupCard();
      }
    }, 10);
  });

  // Click outside to dismiss
  document.addEventListener('mousedown', (e) => {
    if (
      !e.target.closest('#wordlens-floating-icon') &&
      !e.target.closest('#wordlens-popup')
    ) {
      removeFloatingIcon();
      removePopupCard();
    }
  });

  // ============================================================
  // API Calls — run concurrently via Promise.allSettled
  // ============================================================

  async function fetchTranslation(text, targetLang) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Translation API error');
    const data = await resp.json();
    return data.responseData?.translatedText || null;
  }

  async function fetchDictionary(word) {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    const resp = await fetch(url);
    if (!resp.ok) return null; // 404 = word not found, handled gracefully
    const data = await resp.json();
    return Array.isArray(data) ? data[0] : null;
  }

  // ============================================================
  // History — save to browser.storage.local
  // ============================================================

  async function saveToHistory(word, translation) {
    try {
      const result = await browser.storage.local.get('history');
      let history = result.history || [];

      // Deduplicate case-insensitively
      history = history.filter(
        (h) => h.word.toLowerCase() !== word.toLowerCase()
      );

      // Prepend newest
      history.unshift({
        word: word,
        translation: translation || '',
        timestamp: Date.now(),
      });

      // Cap at 50
      if (history.length > 50) history = history.slice(0, 50);

      await browser.storage.local.set({ history });
    } catch (e) {
      /* silently ignore storage errors */
    }
  }

  // ============================================================
  // Speech Synthesis — browser-native, no external API
  // Supports user-selected voice from the settings panel.
  // ============================================================

  /**
   * Safely load available voices. getVoices() may return an empty
   * array on first call; if so, wait for onvoiceschanged once.
   */
  function loadVoicesSafely() {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve([]);
        return;
      }
      let voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        resolve(voices);
      } else {
        speechSynthesis.onvoiceschanged = () => {
          voices = speechSynthesis.getVoices();
          resolve(voices);
        };
        // Safety timeout for systems where event never fires
        setTimeout(() => resolve(speechSynthesis.getVoices()), 3000);
      }
    });
  }

  async function speakWord(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = settings.voiceSpeed;

    // Try to apply the user's chosen voice from storage
    try {
      const result = await browser.storage.local.get(['sttVoiceName', 'sttVoiceLang']);
      if (result.sttVoiceName) {
        const voices = await loadVoicesSafely();
        const match = voices.find((v) => v.name === result.sttVoiceName) || null;
        if (match) {
          utterance.voice = match;
          // The voice object carries its own lang, so no need to
          // override utterance.lang — but keep en-US as fallback.
        }
      }
    } catch (e) {
      /* silently fall back to browser default voice */
    }

    window.speechSynthesis.speak(utterance);
  }

  // ============================================================
  // Popup Size Class
  // ============================================================

  function getSizeClass() {
    const map = {
      small: 'wordlens-size-small',
      medium: 'wordlens-size-medium',
      large: 'wordlens-size-large',
    };
    return map[settings.popupSize] || 'wordlens-size-medium';
  }

  // ============================================================
  // Main Lookup Handler — builds the popup card
  // ============================================================

  async function handleLookup(text, anchorRect) {
    removeFloatingIcon();
    removePopupCard();

    // Create popup with loading spinner
    popupCard = document.createElement('div');
    popupCard.id = 'wordlens-popup';
    popupCard.className = getSizeClass();
    popupCard.style.position = 'fixed';

    // Position popup just above the selection anchor
    // anchorRect is viewport-relative (from getBoundingClientRect)
    const popupGap = 8;
    let popupLeft = anchorRect.left;
    let popupTop = anchorRect.top - popupGap; // will be adjusted after render
    popupCard.style.left = popupLeft + 'px';
    popupCard.style.top = popupTop + 'px';

    popupCard.innerHTML = `
      <div class="wordlens-popup-header">
        <span class="wordlens-popup-word">${escapeHtml(text)}</span>
        <div class="wordlens-popup-header-actions">
          <button class="wordlens-speak-btn" title="Pronounce">🔊</button>
          <button class="wordlens-close-btn" title="Close">×</button>
        </div>
      </div>
      <div class="wordlens-popup-body">
        <div class="wordlens-loading">
          <div class="wordlens-spinner"></div>
          <span>Fetching data…</span>
        </div>
      </div>
    `;

    document.body.appendChild(popupCard);

    // Prevent clicks inside popup from propagating
    popupCard.addEventListener('mousedown', (e) => e.stopPropagation());

    // Reposition if overflows viewport edges
    repositionPopup();

    // Wire close button
    popupCard.querySelector('.wordlens-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      removePopupCard();
    });

    // Wire speak button
    popupCard.querySelector('.wordlens-speak-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      speakWord(text);
    });

    // Keep a reference to check the popup is still alive after async
    const thisPopup = popupCard;

    // Fetch translation + dictionary concurrently
    const [translationResult, dictResult] = await Promise.allSettled([
      fetchTranslation(text, settings.targetLang),
      fetchDictionary(text),
    ]);

    // Guard: popup may have been dismissed while we were fetching
    if (thisPopup !== popupCard) return;

    const translation =
      translationResult.status === 'fulfilled'
        ? translationResult.value
        : null;
    const dictData =
      dictResult.status === 'fulfilled' ? dictResult.value : null;

    // Save to history
    saveToHistory(text, translation);

    // Build popup body
    const body = popupCard.querySelector('.wordlens-popup-body');
    let html = '';

    // --- Translation ---
    if (translation) {
      html += `
        <div class="wordlens-section">
          <div class="wordlens-section-label">Translation</div>
          <div class="wordlens-translation-text">${escapeHtml(translation)}</div>
        </div>`;
    }

    // --- "Know more" collapsible section ---
    // Built from already-fetched dictData (no extra API call).
    // Contains: origin/etymology + usage context/example sentences.
    if (dictData) {
      const knowMoreParts = [];

      // 1. Origin / Etymology (reuse dictData.origin)
      if (dictData.origin) {
        knowMoreParts.push(
          `<div class="wordlens-km-item">` +
          `<div class="wordlens-section-label">Origin</div>` +
          `<div class="wordlens-origin">${escapeHtml(dictData.origin)}</div>` +
          `</div>`
        );
      }

      // 2. Usage context — derive from meanings + example sentences
      if (dictData.meanings && dictData.meanings.length > 0) {
        // Collect example sentences from definitions
        const examples = [];
        for (const m of dictData.meanings) {
          if (m.definitions) {
            for (const d of m.definitions) {
              if (d.example && examples.length < 2) {
                examples.push({ pos: m.partOfSpeech, example: d.example });
              }
            }
          }
        }

        // Build a usage-context line from part-of-speech spread
        const posTypes = dictData.meanings.map((m) => m.partOfSpeech).filter(Boolean);
        if (posTypes.length > 0) {
          const posLine = posTypes.length > 1
            ? `Used as ${posTypes.slice(0, -1).join(', ')} and ${posTypes[posTypes.length - 1]}`
            : `Used as ${posTypes[0]}`;
          let usageHtml = `<div class="wordlens-km-item">`;
          usageHtml += `<div class="wordlens-section-label">Usage</div>`;
          usageHtml += `<div class="wordlens-km-usage-line">${escapeHtml(posLine)}</div>`;
          // Add example sentences if available
          for (const ex of examples) {
            usageHtml += `<div class="wordlens-km-example">` +
              `<span class="wordlens-pos-tag">${escapeHtml(ex.pos)}</span> ` +
              `"<em>${escapeHtml(ex.example)}</em>"` +
              `</div>`;
          }
          usageHtml += `</div>`;
          knowMoreParts.push(usageHtml);
        }
      }

      // Only render the toggle if there's actually content to show
      if (knowMoreParts.length > 0) {
        html += `
          <div class="wordlens-know-more">
            <button class="wordlens-km-toggle" type="button">
              <span class="wordlens-km-chevron">▾</span> Know more
            </button>
            <div class="wordlens-km-content" style="display:none;">
              ${knowMoreParts.join('')}
            </div>
          </div>`;
      }
    }

    // --- Dictionary data ---
    if (dictData) {
      // Phonetic
      const phonetic =
        dictData.phonetic ||
        (dictData.phonetics && dictData.phonetics.length > 0
          ? dictData.phonetics.find((p) => p.text)?.text || ''
          : '');
      if (phonetic) {
        html += `
          <div class="wordlens-section">
            <div class="wordlens-section-label">Pronunciation</div>
            <div class="wordlens-phonetic">${escapeHtml(phonetic)}</div>
          </div>`;
      }

      // Meanings (part-of-speech + definitions)
      if (dictData.meanings && dictData.meanings.length > 0) {
        html += `<div class="wordlens-section"><div class="wordlens-section-label">Meanings</div>`;
        for (const meaning of dictData.meanings) {
          html += `<div class="wordlens-meaning-group">`;
          html += `<span class="wordlens-pos-tag">${escapeHtml(meaning.partOfSpeech)}</span>`;
          const defs = meaning.definitions
            ? meaning.definitions.slice(0, 2)
            : [];
          for (const def of defs) {
            html += `<div class="wordlens-definition">${escapeHtml(def.definition)}</div>`;
          }
          html += `</div>`;
        }
        html += `</div>`;
      }

      // Synonyms — collect from both meanings[].synonyms and definitions[].synonyms
      let allSynonyms = [];
      if (dictData.meanings) {
        for (const m of dictData.meanings) {
          if (m.synonyms) allSynonyms.push(...m.synonyms);
          if (m.definitions) {
            for (const d of m.definitions) {
              if (d.synonyms) allSynonyms.push(...d.synonyms);
            }
          }
        }
      }
      allSynonyms = [...new Set(allSynonyms)].slice(0, 8);
      if (allSynonyms.length > 0) {
        html += `<div class="wordlens-section"><div class="wordlens-section-label">Synonyms</div><div class="wordlens-synonyms">`;
        for (const syn of allSynonyms) {
          html += `<span class="wordlens-synonym-chip">${escapeHtml(syn)}</span>`;
        }
        html += `</div></div>`;
      }

      // NOTE: Origin/Etymology is now shown inside the "Know more"
      // collapsible section above, not as a standalone section here.
    }

    // --- Both failed: friendly fallback ---
    if (!translation && !dictData) {
      html += `
        <div class="wordlens-section wordlens-fallback">
          <div class="wordlens-fallback-icon">📖</div>
          <div>No data found for "<strong>${escapeHtml(text)}</strong>".</div>
          <div class="wordlens-fallback-hint">Try selecting a single English word.</div>
        </div>`;
    }

    // --- Deep Dive links (unchanged — opens in new tab) ---
    const encoded = encodeURIComponent(text);
    html += `
      <div class="wordlens-section wordlens-deep-dive">
        <div class="wordlens-section-label">Deep Dive</div>
        <div class="wordlens-deep-links">
          <a href="https://www.google.com/search?q=define+${encoded}" target="_blank" rel="noopener noreferrer">Google</a>
          <a href="https://en.wiktionary.org/wiki/${encoded}" target="_blank" rel="noopener noreferrer">Wiktionary</a>
          <a href="https://www.etymonline.com/word/${encoded}" target="_blank" rel="noopener noreferrer">Etymonline</a>
        </div>
      </div>`;

    body.innerHTML = html;

    // --- Wire up "Know more" toggle (if present) ---
    const kmToggle = body.querySelector('.wordlens-km-toggle');
    if (kmToggle) {
      kmToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const content = body.querySelector('.wordlens-km-content');
        const chevron = kmToggle.querySelector('.wordlens-km-chevron');
        if (!content) return;
        const isOpen = content.style.display !== 'none';
        content.style.display = isOpen ? 'none' : 'block';
        if (chevron) chevron.textContent = isOpen ? '▾' : '▴';
        // Re-check overflow after expanding
        repositionPopup();
      });
    }

    // Re-check overflow after content renders
    repositionPopup();

    // Auto-speak if enabled
    if (settings.autoSpeak) {
      speakWord(text);
    }
  }

  // ============================================================
  // Reposition popup if it overflows the viewport
  // All coords are viewport-relative (position:fixed).
  // ============================================================

  function repositionPopup() {
    if (!popupCard) return;
    const rect = popupCard.getBoundingClientRect();

    // After the popup renders, shift it upward so its BOTTOM sits
    // at the anchor point (i.e. just above the selection).
    let top = parseFloat(popupCard.style.top) - rect.height;
    let left = parseFloat(popupCard.style.left);

    // Clamp right edge
    if (left + rect.width > window.innerWidth - 12) {
      left = window.innerWidth - rect.width - 12;
    }
    // Clamp left edge
    if (left < 12) {
      left = 12;
    }
    // If not enough room above, flip below the selection
    if (top < 12) {
      // Place below the selection instead
      const anchorBottom = lastSelectionRect
        ? lastSelectionRect.bottom
        : parseFloat(popupCard.style.top);
      top = anchorBottom + 8;
    }
    // Clamp bottom edge (last resort)
    if (top + rect.height > window.innerHeight - 12) {
      top = window.innerHeight - rect.height - 12;
    }

    popupCard.style.top = top + 'px';
    popupCard.style.left = left + 'px';
  }

  // ============================================================
  // Context Menu Message Listener
  // ============================================================

  browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'translateSelection') {
      loadSettings().then(() => {
        if (!settings.enabled) return;
        const text = (message.text || '').trim();
        if (text.length >= 1 && text.length <= 100) {
          selectedText = text;
          // Fallback position: near top-left of the viewport since
          // exact selection coordinates aren't available from a
          // context-menu click. We create a synthetic rect object.
          const fallbackRect = { top: 120, left: 80, right: 200, bottom: 140 };
          lastSelectionRect = null;
          handleLookup(text, fallbackRect);
        }
      });
    }
  });

  // ============================================================
  // NOTE — Allow-list enforcement (stretch goal / out of scope)
  // ============================================================
  // The toolbar popup UI lets the user add the current hostname
  // to a persisted allow-list (stored in browser.storage.local
  // under key "allowList"). However, this content script does NOT
  // yet enforce the list (e.g. skipping popups on non-listed
  // sites). That enforcement logic is explicitly called out as a
  // stretch goal in the spec. The UI exists; the filtering does not.

  // ============================================================
  // Init
  // ============================================================
  loadSettings();
})();
