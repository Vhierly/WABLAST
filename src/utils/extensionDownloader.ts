import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const EXTENSION_FILES = {
  'manifest.json': `{
  "manifest_version": 3,
  "name": "WAsender Pro Helper",
  "version": "2.2",
  "description": "Advanced Auto-Send Helper for J&T Cargo WAsender",
  "permissions": ["tabs"],
  "host_permissions": [
    "https://web.whatsapp.com/*",
    "*://*.run.app/*",
    "*://*.netlify.app/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://web.whatsapp.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["*://*.run.app/*", "*://*.netlify.app/*"],
      "js": ["detector.js"],
      "run_at": "document_start"
    }
  ],
  "action": {
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "background.js"
  }
}`,
  'background.js': `// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "closeTab" && sender.tab) {
    chrome.tabs.remove(sender.tab.id);
  } else if (request.action === "manualConnect") {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: "triggerPong" }).catch(() => {});
      });
    });
    sendResponse({ success: true });
  }
  return true;
});`,
  'detector.js': `// detector.js
function sendPong() {
  document.documentElement.setAttribute('data-wasender-extension', 'active');
  window.postMessage({
    source: 'wasender-extension',
    type: 'EXTENSION_PONG'
  }, '*');
}
sendPong();
setInterval(sendPong, 2000);
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "triggerPong") {
    sendPong();
  }
});`,
  'popup.html': `<!DOCTYPE html>
<html>
<head>
  <style>
    body { width: 200px; padding: 10px; font-family: sans-serif; }
    button { background: #10b981; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; width: 100%; }
  </style>
</head>
<body>
  <button id="connectBtn">Connect to WebApp</button>
  <script src="popup.js"></script>
</body>
</html>`,
  'popup.js': `document.getElementById('connectBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: "manualConnect" });
});`,
  'content.js': `// content.js
const CONFIG = {
  SOURCE: 'wasender-extension',
  SELECTORS: {
    SEND_BUTTON: 'button span[data-icon="send"], button[aria-label="Send"], [data-testid="compose-btn-send"]',
    INVALID_MODAL: 'div[role="dialog"]',
    INVALID_TEXT: ['Phone number shared via url is invalid', 'Nomor telepon yang dibagikan melalui url tidak valid'],
    MAIN_PANEL: '#main',
    TYPING_INDICATOR: 'footer div[contenteditable="true"]'
  }
};
function notifyWebApp(type, status, entryId) {
  if (window.opener) {
    window.opener.postMessage({ source: CONFIG.SOURCE, type: type || 'WA_STATUS_UPDATE', status: status, entryId: entryId }, '*');
  }
}
async function startAutoProcess() {
  const urlParams = new URLSearchParams(window.location.search);
  const isAutoSend = urlParams.get('autosend') === 'true';
  const entryId = urlParams.get('entryid');
  if (!isAutoSend || !entryId) return;
  let attempts = 0;
  const checkLoad = setInterval(async () => {
    attempts++;
    const modal = document.querySelector(CONFIG.SELECTORS.INVALID_MODAL);
    if (modal && CONFIG.SELECTORS.INVALID_TEXT.some(t => modal.innerText.includes(t))) {
      clearInterval(checkLoad);
      notifyWebApp('WA_STATUS_UPDATE', 'invalid', entryId);
      setTimeout(() => chrome.runtime.sendMessage({ action: "closeTab" }), 2000);
      return;
    }
    const mainPanel = document.querySelector(CONFIG.SELECTORS.MAIN_PANEL);
    const sendBtn = document.querySelector(CONFIG.SELECTORS.SEND_BUTTON);
    if (mainPanel && sendBtn) {
      clearInterval(checkLoad);
      const baseDelay = Math.floor(Math.random() * 3000) + 2000;
      await new Promise(r => setTimeout(r, baseDelay));
      const input = document.querySelector(CONFIG.SELECTORS.TYPING_INDICATOR);
      if (input) { input.focus(); await new Promise(r => setTimeout(r, 1500)); }
      const btnToClick = sendBtn.closest('button') || sendBtn;
      btnToClick.click();
      setTimeout(() => {
        notifyWebApp('WA_STATUS_UPDATE', 'sent', entryId);
        setTimeout(() => chrome.runtime.sendMessage({ action: "closeTab" }), 3000);
      }, 2000);
    }
    if (attempts >= 30) { clearInterval(checkLoad); notifyWebApp('WA_STATUS_UPDATE', 'error', entryId); }
  }, 1000);
}
startAutoProcess();`
};

export const downloadExtensionZip = async () => {
  const zip = new JSZip();
  
  // Add all files to the zip
  Object.entries(EXTENSION_FILES).forEach(([filename, content]) => {
    zip.file(filename, content);
  });
  
  // Generate the zip file
  const blob = await zip.generateAsync({ type: 'blob' });
  
  // Trigger download
  saveAs(blob, 'wasender-pro-helper.zip');
};
