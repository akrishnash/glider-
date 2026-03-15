# Glider Job Autofill — Chrome Extension

Manifest V3 Chrome extension that auto-fills job applications on **Greenhouse** and **Lever** using a saved profile.

## Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `gliderextension` folder

## Usage

1. **Set your profile** — Click the extension icon and fill the tabs (Personal, Professional, Resume, Custom Q&A). Data is saved to `chrome.storage.local` on every change.
2. **On a job page** — Open a Greenhouse or Lever application page. A floating **⚡ Autofill** button appears bottom-left.
3. **Autofill** — Click the button (or use “⚡ Autofill current page” in the popup). The form is filled; unfilled required fields are highlighted and listed in a sidebar. Solve any CAPTCHA manually, then click Submit when ready.

## Files

| File | Purpose |
|------|--------|
| `manifest.json` | Manifest V3; permissions: activeTab, storage, scripting |
| `popup.html` / `popup.js` | Tabbed profile UI; save on input |
| `content.js` | FAB, field detection, fill logic, unfilled sidebar, toasts |
| `profile.js` | Profile schema and label → profile key matching |
| `background.js` | Service worker; messaging between popup and content |

All injected UI uses the `glider-ext-` prefix and lives in a shadow root to avoid clashing with the host page.
