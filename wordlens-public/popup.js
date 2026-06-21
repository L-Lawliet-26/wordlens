// popup.js — WordLens Toolbar Settings Panel
// Tab switching, settings persistence, history rendering, site-specific allow-list.

(function () {
  'use strict';

  // ============================================================
  // DOM References
  // ============================================================

  const currentHostEl = document.getElementById('current-host');
  const siteBtnHostEl = document.getElementById('site-btn-host');
  const btnOn = document.getElementById('btn-on');
  const btnOff = document.getElementById('btn-off');
  const tabButtons = document.querySelectorAll('.wl-tab');
  const tabContents = document.querySelectorAll('.wl-tab-content');
  const targetLangSelect = document.getElementById('target-lang');
  const autospeakOn = document.getElementById('autospeak-on');
  const autospeakOff = document.getElementById('autospeak-off');
  const speedPrev = document.getElementById('speed-prev');
  const speedNext = document.getElementById('speed-next');
  const speedValueEl = document.getElementById('speed-value');
  const sizePrev = document.getElementById('size-prev');
  const sizeNext = document.getElementById('size-next');
  const sizeValueEl = document.getElementById('size-value');
  const siteKeepOnBtn = document.getElementById('site-keep-on');
  const voiceSelectEl = document.getElementById('voice-select');
  const voiceRowEl = document.getElementById('voice-row');
  const historyListEl = document.getElementById('history-list');
  const historyEmptyEl = document.getElementById('history-empty');
  const clearHistoryBtn = document.getElementById('clear-history');
  const btnHelp = document.getElementById('btn-help');
  const btnContextTip = document.getElementById('btn-context-tip');
  const tipBox = document.getElementById('tip-box');

  // ============================================================
  // Stepper Option Lists
  // ============================================================

  const speedOptions = [
    { label: 'Slow', value: 0.7 },
    { label: 'Normal', value: 1.0 },
    { label: 'Fast', value: 1.4 },
  ];

  const sizeOptions = [
    { label: 'Small', value: 'small' },
    { label: 'Medium', value: 'medium' },
    { label: 'Large', value: 'large' },
  ];

  let currentSpeedIndex = 1; // Normal
  let currentSizeIndex = 1; // Medium
  let currentHost = '';

  // ============================================================
  // Utility: Escape HTML
  // ============================================================

  function escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
  }

  // ============================================================
  // Toggle Helper
  // ============================================================

  function setToggleState(onBtn, offBtn, isOn) {
    if (isOn) {
      onBtn.classList.add('active');
      offBtn.classList.remove('active');
    } else {
      offBtn.classList.add('active');
      onBtn.classList.remove('active');
    }
  }

  // ============================================================
  // Persist a single setting
  // ============================================================

  function saveSetting(key, value) {
    browser.storage.local.set({ [key]: value });
  }

  // ============================================================
  // Load Current Tab Hostname
  // ============================================================

  async function loadCurrentHost() {
    try {
      const browserTabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (browserTabs[0] && browserTabs[0].url) {
        const url = new URL(browserTabs[0].url);
        currentHost = url.hostname;
        currentHostEl.textContent = currentHost || 'local page';
        siteBtnHostEl.textContent = currentHost || 'this site';
      } else {
        currentHostEl.textContent = 'unknown';
        siteBtnHostEl.textContent = 'this site';
      }
    } catch (e) {
      currentHostEl.textContent = 'unknown';
      siteBtnHostEl.textContent = 'this site';
    }
  }

  // ============================================================
  // Load All Settings from Storage
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

      // On/Off
      const enabled = result.enabled !== undefined ? result.enabled : true;
      setToggleState(btnOn, btnOff, enabled);

      // Target language
      if (result.targetLang) {
        targetLangSelect.value = result.targetLang;
      }

      // Auto-speak
      const autoSpeak = result.autoSpeak || false;
      setToggleState(autospeakOn, autospeakOff, autoSpeak);

      // Voice speed
      if (result.voiceSpeed !== undefined) {
        const idx = speedOptions.findIndex((o) => o.value === result.voiceSpeed);
        if (idx !== -1) currentSpeedIndex = idx;
      }
      speedValueEl.textContent = speedOptions[currentSpeedIndex].label;

      // Popup size
      if (result.popupSize) {
        const idx = sizeOptions.findIndex((o) => o.value === result.popupSize);
        if (idx !== -1) currentSizeIndex = idx;
      }
      sizeValueEl.textContent = sizeOptions[currentSizeIndex].label;
    } catch (e) {
      /* use defaults already set in DOM */
    }
  }

  // ============================================================
  // Tab Switching
  // ============================================================

  tabButtons.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabButtons.forEach((t) => t.classList.remove('active'));
      tabContents.forEach((tc) => tc.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById('tab-' + tab.dataset.tab);
      if (target) target.classList.add('active');

      // Refresh history when switching to that tab
      if (tab.dataset.tab === 'history') {
        loadHistory();
      }

      // Hide tip box when switching tabs
      tipBox.style.display = 'none';
    });
  });

  // ============================================================
  // On / Off Toggle
  // ============================================================

  btnOn.addEventListener('click', () => {
    setToggleState(btnOn, btnOff, true);
    saveSetting('enabled', true);
  });

  btnOff.addEventListener('click', () => {
    setToggleState(btnOn, btnOff, false);
    saveSetting('enabled', false);
  });

  // ============================================================
  // Language Select
  // ============================================================

  targetLangSelect.addEventListener('change', () => {
    saveSetting('targetLang', targetLangSelect.value);
  });

  // ============================================================
  // Auto-Speak Toggle
  // ============================================================

  autospeakOn.addEventListener('click', () => {
    setToggleState(autospeakOn, autospeakOff, true);
    saveSetting('autoSpeak', true);
  });

  autospeakOff.addEventListener('click', () => {
    setToggleState(autospeakOn, autospeakOff, false);
    saveSetting('autoSpeak', false);
  });

  // ============================================================
  // Voice Speed Stepper
  // ============================================================

  speedPrev.addEventListener('click', () => {
    currentSpeedIndex = Math.max(0, currentSpeedIndex - 1);
    speedValueEl.textContent = speedOptions[currentSpeedIndex].label;
    saveSetting('voiceSpeed', speedOptions[currentSpeedIndex].value);
  });

  speedNext.addEventListener('click', () => {
    currentSpeedIndex = Math.min(speedOptions.length - 1, currentSpeedIndex + 1);
    speedValueEl.textContent = speedOptions[currentSpeedIndex].label;
    saveSetting('voiceSpeed', speedOptions[currentSpeedIndex].value);
  });

  // ============================================================
  // Popup Size Stepper
  // ============================================================

  sizePrev.addEventListener('click', () => {
    currentSizeIndex = Math.max(0, currentSizeIndex - 1);
    sizeValueEl.textContent = sizeOptions[currentSizeIndex].label;
    saveSetting('popupSize', sizeOptions[currentSizeIndex].value);
  });

  sizeNext.addEventListener('click', () => {
    currentSizeIndex = Math.min(sizeOptions.length - 1, currentSizeIndex + 1);
    sizeValueEl.textContent = sizeOptions[currentSizeIndex].label;
    saveSetting('popupSize', sizeOptions[currentSizeIndex].value);
  });

  // ============================================================
  // Voice Selector — loads real system voices via Web Speech API
  // ============================================================

  /**
   * Safely load voices. getVoices() may return [] on first call;
   * in that case wait for the onvoiceschanged event.
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
        // Voices haven't loaded yet — wait for the event
        speechSynthesis.onvoiceschanged = () => {
          voices = speechSynthesis.getVoices();
          resolve(voices);
        };
        // Safety timeout: if event never fires (rare), resolve with []
        setTimeout(() => resolve(speechSynthesis.getVoices()), 3000);
      }
    });
  }

  /**
   * Filter to up-to-4 English-preferred voices.
   * Falls back to all voices if fewer than 3 English ones exist.
   */
  function filterVoices(allVoices) {
    const english = allVoices.filter((v) => v.lang.startsWith('en'));
    const pool = english.length >= 3 ? english : allVoices;
    return pool.slice(0, 4);
  }

  async function populateVoiceDropdown() {
    const allVoices = await loadVoicesSafely();
    const candidates = filterVoices(allVoices);

    if (candidates.length === 0) {
      // No voices at all — hide the row or show disabled note
      voiceSelectEl.innerHTML =
        '<option value="" disabled>No voices found</option>';
      voiceSelectEl.disabled = true;
      return;
    }

    // Build options from real voice names
    voiceSelectEl.innerHTML = '';
    for (const v of candidates) {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.dataset.lang = v.lang;
      opt.textContent = v.name;
      voiceSelectEl.appendChild(opt);
    }
    voiceSelectEl.disabled = false;

    // Restore persisted selection
    try {
      const result = await browser.storage.local.get(['sttVoiceName', 'sttVoiceLang']);
      if (result.sttVoiceName) {
        // Try to select the stored voice
        const match = candidates.find((v) => v.name === result.sttVoiceName);
        if (match) {
          voiceSelectEl.value = match.name;
        }
        // If not found, the first option stays selected (browser default fallback)
      }
    } catch (e) {
      /* ignore */
    }
  }

  voiceSelectEl.addEventListener('change', () => {
    const selectedOpt = voiceSelectEl.selectedOptions[0];
    if (selectedOpt && selectedOpt.value) {
      browser.storage.local.set({
        sttVoiceName: selectedOpt.value,
        sttVoiceLang: selectedOpt.dataset.lang || '',
      });
    }
  });

  // ============================================================
  // Site-Specific "Keep On" Button
  // NOTE: This saves the host to a persisted allow-list in storage.
  // The content script does NOT yet enforce this list (stretch goal).
  // ============================================================

  siteKeepOnBtn.addEventListener('click', async () => {
    if (!currentHost) return;
    try {
      const result = await browser.storage.local.get('allowList');
      const allowList = result.allowList || [];
      if (!allowList.includes(currentHost)) {
        allowList.push(currentHost);
        await browser.storage.local.set({ allowList });
      }
      // Visual feedback
      siteKeepOnBtn.textContent = '✓ Added!';
      siteKeepOnBtn.style.borderColor = '#4caf50';
      siteKeepOnBtn.style.color = '#4caf50';
      setTimeout(() => {
        siteKeepOnBtn.innerHTML = `Only for <span id="site-btn-host">${escapeHtml(currentHost)}</span> — keep on`;
        siteKeepOnBtn.style.borderColor = '';
        siteKeepOnBtn.style.color = '';
      }, 1500);
    } catch (e) {
      /* ignore */
    }
  });

  // ============================================================
  // History — load & render
  // ============================================================

  async function loadHistory() {
    try {
      const result = await browser.storage.local.get('history');
      const history = result.history || [];

      // Remove previously rendered items
      const existing = historyListEl.querySelectorAll('.wl-history-item');
      existing.forEach((el) => el.remove());

      if (history.length === 0) {
        historyEmptyEl.style.display = 'flex';
        return;
      }

      historyEmptyEl.style.display = 'none';

      for (const entry of history) {
        const item = document.createElement('div');
        item.className = 'wl-history-item';
        item.innerHTML = `
          <span class="wl-history-word">${escapeHtml(entry.word)}</span>
          <span class="wl-history-translation">${escapeHtml(entry.translation || '—')}</span>
        `;
        historyListEl.appendChild(item);
      }
    } catch (e) {
      /* ignore */
    }
  }

  clearHistoryBtn.addEventListener('click', async () => {
    await browser.storage.local.set({ history: [] });
    loadHistory();
  });

  // ============================================================
  // More Tab — Quick Tips & Context Menu Tip
  // ============================================================

  btnHelp.addEventListener('click', () => {
    const isVisible = tipBox.style.display !== 'none';
    tipBox.style.display = isVisible ? 'none' : 'block';
    tipBox.innerHTML = `
      <strong>Quick Tips:</strong><br>
      • Select 1–100 characters of text to see the 🌐 icon<br>
      • Click the icon to translate &amp; explore<br>
      • Use the 🔊 button to hear pronunciation<br>
      • Click Deep Dive links for further research<br>
      • Adjust voice speed and popup size in Settings
    `;
  });

  btnContextTip.addEventListener('click', () => {
    const isVisible = tipBox.style.display !== 'none';
    tipBox.style.display = isVisible ? 'none' : 'block';
    tipBox.innerHTML = `
      <strong>Right-Click Tip:</strong><br>
      Select any text, then right-click and choose<br>
      <em>"Translate &amp; explore"</em> from the context menu.<br>
      You'll get the same popup experience!
    `;
  });

  // ============================================================
  // Init
  // ============================================================

  loadCurrentHost();
  loadSettings();
  populateVoiceDropdown();
})();
