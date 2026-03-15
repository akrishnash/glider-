(function () {
  'use strict';

  var ATTR_HL = 'data-glider-hl';

  function getFormRoot() {
    return (
      document.querySelector('#application_form') ||
      document.querySelector('[data-qa]') ||
      document.querySelector('.application-form') ||
      document.body
    );
  }

  function getFormFields(root) {
    var selector =
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea';
    return Array.from(root.querySelectorAll(selector));
  }

  function isRequired(el) {
    if (el.hasAttribute('required')) return true;
    if (el.getAttribute('aria-required') === 'true') return true;
    var label = el.labels && el.labels[0] ? el.labels[0].innerText : '';
    if ((label || '').indexOf('*') !== -1) return true;
    return false;
  }

  function setInputValueReactSafe(input, value) {
    if (value == null || value === '') return;
    var proto =
      input.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    var descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(input, value);
    } else {
      input.value = value;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function setSelectOption(select, valueOrLabel) {
    var v = String(valueOrLabel).trim();
    var opts = Array.from(select.options);
    var option =
      opts.find(function (o) { return (o.value || '').trim() === v; }) ||
      opts.find(function (o) { return (o.text || '').trim().toLowerCase() === v.toLowerCase(); }) ||
      opts.find(function (o) { return (o.text || '').toLowerCase().indexOf(v.toLowerCase()) !== -1; });
    if (option) {
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function fillFileInput(input, fileBase64, filename, mimeType) {
    if (!fileBase64 || !filename) return;
    try {
      var bin = atob(fileBase64);
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      var mime = mimeType || 'application/octet-stream';
      var file = new File([arr], filename, { type: mime });
      var dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (e) {
      console.warn('[Glider] could not set file input', e);
    }
  }

  function getMimeFromFilename(name) {
    if (!name) return 'application/octet-stream';
    var n = name.toLowerCase();
    if (n.indexOf('.pdf') !== -1) return 'application/pdf';
    if (n.indexOf('.docx') !== -1)
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (n.indexOf('.doc') !== -1) return 'application/msword';
    return 'application/octet-stream';
  }

  function runAutofill(profile) {
    window.__gliderProfileCache = profile;
    var root = getFormRoot();
    var fields = getFormFields(root);
    var filled = [];

    for (var i = 0; i < fields.length; i++) {
      var el = fields[i];
      var labelText = window.GliderProfile.getFieldLabel(el);
      var nameAttr = el.getAttribute('name') || '';
      var matched = window.GliderProfile.matchLabelToProfileKey(labelText, nameAttr);
      if (!matched) continue;

      if (el.tagName === 'SELECT') {
        setSelectOption(el, matched.value);
        filled.push(el);
        continue;
      }
      if (el.type === 'checkbox' || el.type === 'radio') {
        var mv = String(matched.value).toLowerCase();
        if (mv === 'yes' || mv === '1' || mv === 'true') {
          if (!el.checked) el.click();
          filled.push(el);
        }
        continue;
      }
      if (el.type === 'file') {
        if (matched.key === 'resume' && matched.value && matched.value.file_base64) {
          fillFileInput(
            el,
            matched.value.file_base64,
            matched.value.filename,
            getMimeFromFilename(matched.value.filename)
          );
          filled.push(el);
        }
        continue;
      }
      setInputValueReactSafe(el, matched.value);
      filled.push(el);
    }

    return { filled: filled, fields: fields };
  }

  function findUnfilledRequired(fields) {
    return fields.filter(function (el) {
      var empty = false;
      if (el.tagName === 'SELECT') empty = !el.value;
      else if (el.type === 'checkbox' || el.type === 'radio') empty = false;
      else if (el.type === 'file') empty = !el.files || el.files.length === 0;
      else empty = !(el.value || '').trim();
      return empty && isRequired(el);
    });
  }

  function findSubmitButton(root) {
    var candidates = root.querySelectorAll(
      'button[type="submit"], input[type="submit"], button, [role="button"]'
    );
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (el.type === 'submit') return el;
      var t = (el.textContent || '').toLowerCase();
      if (
        t.indexOf('submit application') !== -1 ||
        t.indexOf('apply now') !== -1 ||
        t.indexOf('submit') !== -1 ||
        t.indexOf('apply') !== -1
      ) {
        return el;
      }
    }
    return null;
  }

  function detectCaptcha(root) {
    if (root.querySelector('iframe[src*="recaptcha"]')) return true;
    if (root.querySelector('.h-captcha')) return true;
    if (root.querySelector('[data-sitekey]')) return true;
    return false;
  }

  // ── Isolated UI (shadow DOM) ──────────────────────────────

  var shadowHost = null;
  var shadow = null;

  function ensureShadow() {
    if (shadow) return shadow;
    shadowHost = document.createElement('div');
    shadowHost.id = 'glider-ext-host';
    shadowHost.style.cssText =
      'position:fixed !important;inset:0 !important;pointer-events:none !important;z-index:2147483646 !important;';
    document.body.appendChild(shadowHost);
    shadow = shadowHost.attachShadow({ mode: 'open' });
    return shadow;
  }

  function showToast(message, type) {
    var s = ensureShadow();
    var old = s.querySelector('#glider-toast');
    if (old) old.remove();

    var wrap = document.createElement('div');
    wrap.id = 'glider-toast';
    var bg = type === 'warn' ? '#b45309' : type === 'ok' ? '#0d7d4d' : '#1a1a1a';
    wrap.innerHTML =
      '<div style="position:fixed;bottom:24px;right:24px;max-width:340px;padding:12px 16px;' +
      'background:' + bg + ';color:#fff;border-radius:8px;font:14px system-ui,sans-serif;' +
      'z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,.3);pointer-events:auto;">' +
      message +
      '</div>';
    s.appendChild(wrap);
    setTimeout(function () { wrap.remove(); }, 6000);
  }

  function highlightElement(el, color) {
    el.style.setProperty('outline', '2px solid ' + color, 'important');
    el.style.setProperty('outline-offset', '2px', 'important');
    el.setAttribute(ATTR_HL, '1');
  }

  function clearHighlights() {
    var root = getFormRoot();
    var items = root.querySelectorAll('[' + ATTR_HL + ']');
    for (var i = 0; i < items.length; i++) {
      items[i].style.removeProperty('outline');
      items[i].style.removeProperty('outline-offset');
      items[i].removeAttribute(ATTR_HL);
    }
  }

  function getFieldLabelShort(el) {
    var label = window.GliderProfile.getFieldLabel(el);
    return label || el.name || el.placeholder || el.getAttribute('aria-label') || 'Unnamed field';
  }

  function showUnfilledSidebar(unfilled) {
    var s = ensureShadow();
    var old = s.querySelector('#glider-sidebar');
    if (old) old.remove();

    var sidebar = document.createElement('div');
    sidebar.id = 'glider-sidebar';
    sidebar.style.cssText =
      'position:fixed;top:0;right:0;width:280px;height:100%;background:#fff;' +
      'border-left:1px solid #dee2e6;font:13px system-ui,sans-serif;' +
      'z-index:2147483645;overflow-y:auto;box-shadow:-4px 0 12px rgba(0,0,0,.08);pointer-events:auto;';

    var header = document.createElement('h3');
    header.textContent = 'Unfilled required fields';
    header.style.cssText = 'margin:0;padding:12px;background:#f8f9fa;font-size:14px;';
    sidebar.appendChild(header);

    var store = unfilled.slice();

    for (var i = 0; i < unfilled.length; i++) {
      var short = getFieldLabelShort(unfilled[i]);
      var item = document.createElement('div');
      item.style.cssText = 'padding:10px 12px;border-bottom:1px solid #eee;';

      var lbl = document.createElement('label');
      lbl.textContent = short;
      lbl.style.cssText = 'display:block;margin-bottom:4px;color:#495057;';
      item.appendChild(lbl);

      var isTextarea = unfilled[i].tagName === 'TEXTAREA';
      var inp = document.createElement(isTextarea ? 'textarea' : 'input');
      inp.setAttribute('data-idx', String(i));
      inp.style.cssText =
        'width:100%;padding:6px 8px;border:1px solid #ced4da;border-radius:4px;font-size:13px;';
      if (isTextarea) inp.rows = 3;
      item.appendChild(inp);
      sidebar.appendChild(item);
    }

    sidebar.addEventListener('input', function (e) {
      var idx = e.target.getAttribute('data-idx');
      if (idx != null) mirrorToField(Number(idx), e.target.value);
    });

    function mirrorToField(index, value) {
      var field = store[index];
      if (!field) return;
      if (field.tagName === 'SELECT') setSelectOption(field, value);
      else setInputValueReactSafe(field, value);
    }

    s.appendChild(sidebar);
  }

  function injectFAB() {
    var s = ensureShadow();
    if (s.querySelector('#glider-fab')) return;

    var fab = document.createElement('button');
    fab.id = 'glider-fab';
    fab.textContent = '\u26A1';
    fab.title = 'Glider Autofill';
    fab.style.cssText =
      'position:fixed;bottom:24px;left:24px;width:48px;height:48px;border-radius:24px;' +
      'background:#0d47a1;color:#fff;border:none;font-size:20px;cursor:pointer;' +
      'z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,.25);pointer-events:auto;';

    fab.addEventListener('click', function () {
      triggerAutofill();
    });
    fab.addEventListener('mouseenter', function () {
      fab.style.background = '#1565c0';
    });
    fab.addEventListener('mouseleave', function () {
      fab.style.background = '#0d47a1';
    });

    s.appendChild(fab);
  }

  function reportToDashboard(jobUrl, company, position) {
    chrome.storage.local.get(['glider_dashboard_url', 'glider_dashboard_token'], function (result) {
      var apiUrl = result.glider_dashboard_url;
      var token = result.glider_dashboard_token;
      if (!apiUrl || !token) return;
      fetch(apiUrl + '/api/applications/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          url: jobUrl,
          company: company || undefined,
          position: position || undefined,
          source: 'extension',
          status: 'submitted',
        }),
      }).catch(function () { /* dashboard may not be running — silent */ });
    });
  }

  function triggerAutofill() {
    chrome.storage.local.get(['glider_profile'], function (result) {
      var profile = result.glider_profile || {};
      if (!profile.personal && !profile.professional) {
        showToast('No profile saved. Open the Glider popup to add your info.', 'warn');
        return;
      }
      clearHighlights();
      var out = runAutofill(profile);
      var unfilled = findUnfilledRequired(out.fields);

      for (var i = 0; i < unfilled.length; i++) {
        highlightElement(unfilled[i], '#FFD700');
      }
      if (unfilled.length > 0) showUnfilledSidebar(unfilled);

      var root = getFormRoot();
      if (detectCaptcha(root)) {
        showToast('\u26A0\uFE0F CAPTCHA detected \u2014 please solve it manually', 'warn');
      }

      var submitBtn = findSubmitButton(root);
      if (submitBtn) {
        highlightElement(submitBtn, '#0d7d4d');
        showToast(
          '\u2705 Form filled \u2014 please review and click Submit when ready',
          'ok'
        );

        // Log application to dashboard when user clicks Submit
        var jobUrl = window.location.href;
        var companyMeta = document.querySelector('meta[property="og:site_name"]');
        var titleEl = document.querySelector('title');
        var company = companyMeta ? (companyMeta.getAttribute('content') || '') : '';
        var position = titleEl ? (titleEl.textContent || '') : '';

        submitBtn.addEventListener('click', function () {
          setTimeout(function () { reportToDashboard(jobUrl, company, position); }, 1500);
        }, { once: true });
      }
    });
  }

  // ── Messaging ──────────────────────────────────────────────

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.type === 'RUN_AUTOFILL') {
      try {
        triggerAutofill();
        sendResponse({ ok: true });
      } catch (err) {
        sendResponse({ error: err.message });
      }
    }
    return false;
  });

  // ── Bootstrap ──────────────────────────────────────────────

  function boot() {
    try {
      injectFAB();
      console.log('[Glider] Extension ready on', window.location.hostname);
    } catch (err) {
      console.error('[Glider] Boot error', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
