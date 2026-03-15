/**
 * Glider Extension — Popup UI logic.
 * Loads profile from storage, saves on every input change, triggers autofill.
 */

(function () {
  const GLIDER_STORAGE_KEY = 'glider_profile';

  function getStoredProfile() {
    return new Promise((resolve) => {
      chrome.storage.local.get([GLIDER_STORAGE_KEY], (r) => resolve(r[GLIDER_STORAGE_KEY] || {}));
    });
  }

  function setStoredProfile(profile) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [GLIDER_STORAGE_KEY]: profile }, resolve);
    });
  }

  function setValueByPath(obj, path, value) {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in cur)) cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function getValueByPath(obj, path) {
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur == null) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  async function loadProfile() {
    const profile = await getStoredProfile();
    document.querySelectorAll('[data-key]').forEach((el) => {
      const key = el.getAttribute('data-key');
      const v = getValueByPath(profile, key);
      if (v != null && (el.type !== 'file')) el.value = v;
    });
    if (profile.resume && profile.resume.filename) {
      document.getElementById('resume_filename').textContent = profile.resume.filename;
    }
    const cover = (profile.custom_answers && profile.custom_answers.cover_letter) || '';
    const coverEl = document.getElementById('cover_letter');
    if (coverEl) coverEl.value = cover;
    const qaLines = profile.custom_answers
      ? Object.entries(profile.custom_answers)
        .filter(([k]) => k !== 'cover_letter')
        .map(([q, a]) => `${q}|${a}`)
        .join('\n')
      : '';
    const qaEl = document.getElementById('custom_qa');
    if (qaEl) qaEl.value = qaLines;
  }

  function saveFromInput(key, value) {
    getStoredProfile().then((profile) => {
      setValueByPath(profile, key, value);
      setStoredProfile(profile);
    });
  }

  function initTabs() {
    document.querySelectorAll('.glider-ext-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.glider-ext-tab').forEach((t) => t.classList.remove('glider-ext-active'));
        document.querySelectorAll('.glider-ext-panel').forEach((p) => p.classList.remove('glider-ext-active'));
        tab.classList.add('glider-ext-active');
        const id = 'panel-' + tab.getAttribute('data-tab');
        const panel = document.getElementById(id);
        if (panel) panel.classList.add('glider-ext-active');
      });
    });
  }

  function initFields() {
    document.querySelectorAll('[data-key]').forEach((el) => {
      if (el.type === 'file') return;
      const key = el.getAttribute('data-key');
      const event = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(event, () => saveFromInput(key, el.value));
    });
  }

  function initResume() {
    const input = document.getElementById('resume_file');
    const label = document.getElementById('resume_filename');
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) {
        label.textContent = 'No file chosen';
        getStoredProfile().then((profile) => {
          profile.resume = { file_base64: '', filename: '' };
          setStoredProfile(profile);
        });
        return;
      }
      label.textContent = file.name;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1] || '';
        getStoredProfile().then((profile) => {
          if (!profile.resume) profile.resume = {};
          profile.resume.file_base64 = base64;
          profile.resume.filename = file.name;
          setStoredProfile(profile);
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function initCustomQA() {
    const coverEl = document.getElementById('cover_letter');
    const qaEl = document.getElementById('custom_qa');
    const savedEl = document.getElementById('custom_saved');
    function saveCover() {
      getStoredProfile().then((profile) => {
        if (!profile.custom_answers) profile.custom_answers = {};
        profile.custom_answers.cover_letter = coverEl.value;
        setStoredProfile(profile);
        if (savedEl) { savedEl.textContent = 'Saved'; setTimeout(() => { savedEl.textContent = ''; }, 1500); }
      });
    }
    function saveCustomQA() {
      getStoredProfile().then((profile) => {
        if (!profile.custom_answers) profile.custom_answers = {};
        const text = qaEl.value || '';
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        lines.forEach((line) => {
          const idx = line.indexOf('|');
          if (idx > 0) {
            const q = line.slice(0, idx).trim();
            const a = line.slice(idx + 1).trim();
            if (q) profile.custom_answers[q] = a;
          }
        });
        setStoredProfile(profile);
        if (savedEl) { savedEl.textContent = 'Saved'; setTimeout(() => { savedEl.textContent = ''; }, 1500); }
      });
    }
    coverEl.addEventListener('input', saveCover);
    coverEl.addEventListener('change', saveCover);
    qaEl.addEventListener('input', saveCustomQA);
    qaEl.addEventListener('change', saveCustomQA);
  }

  function initAutofill() {
    const btn = document.getElementById('autofill_btn');
    btn.addEventListener('click', () => {
      btn.disabled = true;
      btn.textContent = 'Filling…';
      chrome.runtime.sendMessage({ type: 'AUTOFILL_TRIGGER' }, (response) => {
        if (chrome.runtime.lastError) {
          btn.textContent = '⚠️ Open a job application page first';
        } else if (response && response.error) {
          btn.textContent = '⚠️ ' + (response.error || 'Failed');
        } else {
          btn.textContent = '✅ Sent — check the page';
        }
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = '⚡ Autofill current page';
        }, 2500);
      });
    });
  }

  function setDashboardStatus(msg, ok) {
    const el = document.getElementById('dashboard_status');
    if (el) {
      el.textContent = msg;
      el.style.color = ok ? '#28a745' : (ok === false ? '#dc3545' : '#6c757d');
    }
  }

  function initDashboard() {
    const urlEl = document.getElementById('dashboard_url');
    const tokenEl = document.getElementById('dashboard_token');
    const saveBtn = document.getElementById('dashboard_save_btn');
    const clearBtn = document.getElementById('dashboard_clear_btn');

    // Load saved connection settings
    chrome.storage.local.get(['glider_dashboard_url', 'glider_dashboard_token'], (result) => {
      if (result.glider_dashboard_url) urlEl.value = result.glider_dashboard_url;
      if (result.glider_dashboard_token) tokenEl.value = result.glider_dashboard_token;
      if (result.glider_dashboard_url && result.glider_dashboard_token) {
        setDashboardStatus('Connected to dashboard', true);
      }
    });

    saveBtn.addEventListener('click', async () => {
      const url = (urlEl.value || '').trim().replace(/\/$/, '');
      const token = (tokenEl.value || '').trim();
      if (!url || !token) { setDashboardStatus('Enter both URL and token', false); return; }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Syncing…';
      setDashboardStatus('', null);

      try {
        const res = await fetch(`${url}/api/profile/export`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error?.message || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const serverProfile = data.profile;

        // Merge server profile fields into local storage profile
        await new Promise((resolve) => {
          getStoredProfile().then((local) => {
            if (!local.personal) local.personal = {};
            if (!local.professional) local.professional = {};
            const p = serverProfile.personal || {};
            const pr = serverProfile.professional || {};
            if (p.first_name) local.personal.first_name = p.first_name;
            if (p.last_name) local.personal.last_name = p.last_name;
            if (p.phone) local.personal.phone = p.phone;
            if (p.linkedin) local.personal.linkedin = p.linkedin;
            if (p.portfolio) local.personal.portfolio = p.portfolio;
            if (p.city) local.personal.city = p.city;
            if (pr.current_title) local.professional.current_title = pr.current_title;
            setStoredProfile(local).then(resolve);
          });
        });

        chrome.storage.local.set({ glider_dashboard_url: url, glider_dashboard_token: token });
        setDashboardStatus('✓ Profile synced from dashboard', true);
        // Reload profile fields in other tabs
        loadProfile();
      } catch (err) {
        setDashboardStatus('Error: ' + (err.message || 'Connection failed'), false);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save & Sync Profile';
      }
    });

    clearBtn.addEventListener('click', () => {
      urlEl.value = '';
      tokenEl.value = '';
      chrome.storage.local.remove(['glider_dashboard_url', 'glider_dashboard_token']);
      setDashboardStatus('Cleared', null);
    });
  }

  function init() {
    initTabs();
    initFields();
    initResume();
    initCustomQA();
    initAutofill();
    initDashboard();
    loadProfile();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
