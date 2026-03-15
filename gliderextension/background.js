/**
 * Glider Extension — Service worker (Manifest V3).
 * Handles messaging between popup and content scripts.
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PROFILE') {
    chrome.storage.local.get(['glider_profile'], (result) => {
      sendResponse({ profile: result.glider_profile || null });
    });
    return true; // keep channel open for async sendResponse
  }

  if (message.type === 'SAVE_PROFILE') {
    chrome.storage.local.set({ glider_profile: message.profile }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message.type === 'AUTOFILL_TRIGGER') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'RUN_AUTOFILL' }, (response) => {
          sendResponse(response || {});
        });
      } else {
        sendResponse({ error: 'No active tab' });
      }
    });
    return true;
  }

  if (message.type === 'PING') {
    sendResponse({ pong: true });
    return false;
  }
});
