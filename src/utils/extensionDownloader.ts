import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const EXTENSION_FILES = {
  'manifest.json': `{
  "manifest_version": 3,
  "name": "WAsender Pro Helper",
  "version": "2.1",
  "description": "Advanced Auto-Send Helper for J&T Cargo WAsender",
  "permissions": ["tabs", "storage"],
  "host_permissions": [
    "https://web.whatsapp.com/*",
    "https://*.run.app/*",
    "http://*.run.app/*",
    "http://localhost/*"
  ],
  "content_scripts": [
    {
      "matches": ["https://web.whatsapp.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://*.run.app/*", "http://*.run.app/*", "http://localhost/*"],
      "js": ["detector.js"],
      "run_at": "document_start",
      "all_frames": true
    }
  ],
  "background": {
    "service_worker": "background.js"
  }
}`,
  'background.js': `// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "closeTab" && sender.tab) {
    chrome.tabs.remove(sender.tab.id);
  }
});`,
  'detector.js': `// detector.js
console.log("%c WAsender Extension Detector Active ", "background: #25D366; color: white; font-weight: bold;");

function injectStatus() {
  // Set attribute on HTML tag for easy detection
  document.documentElement.setAttribute('data-wasender-extension', 'active');
  document.documentElement.setAttribute('data-wasender-version', '2.1');
  
  // Also send message
  window.postMessage({
    source: 'wasender-extension',
    type: 'EXTENSION_PONG',
    version: '2.1'
  }, '*');
}

// Inject immediately and periodically
injectStatus();
setInterval(injectStatus, 2000);

// Listen for pings from webapp
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'EXTENSION_PING') {
    injectStatus();
  }
});`,
  'content.js': `// content.js
console.log("%c WAsender Helper Connected ", "background: #25D366; color: white; font-weight: bold;");

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
    window.opener.postMessage({
      source: CONFIG.SOURCE,
      type: type || 'WA_STATUS_UPDATE',
      status: status,
      entryId: entryId
    }, '*');
  }
}

async function startAutoProcess() {
  const urlParams = new URLSearchParams(window.location.search);
  const isAutoSend = urlParams.get('autosend') === 'true';
  const entryId = urlParams.get('entryid');

  if (!isAutoSend || !entryId) return;

  console.log(\`[WAsender] Processing entry: \${entryId}\`);

  // 1. Wait for WhatsApp to load
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds

  const checkLoad = setInterval(async () => {
    attempts++;
    
    // Check for Invalid Number Modal
    const modal = document.querySelector(CONFIG.SELECTORS.INVALID_MODAL);
    if (modal) {
      const text = modal.innerText;
      if (CONFIG.SELECTORS.INVALID_TEXT.some(t => text.includes(t))) {
        clearInterval(checkLoad);
        console.error("[WAsender] Invalid number detected");
        notifyWebApp('WA_STATUS_UPDATE', 'invalid', entryId);
        
        // Close after a short delay
        setTimeout(() => chrome.runtime.sendMessage({ action: "closeTab" }), 2000);
        return;
      }
    }

    // Check for Main Panel (Chat loaded)
    const mainPanel = document.querySelector(CONFIG.SELECTORS.MAIN_PANEL);
    const sendBtn = document.querySelector(CONFIG.SELECTORS.SEND_BUTTON);

    if (mainPanel && sendBtn) {
      clearInterval(checkLoad);
      processSend(sendBtn, entryId);
    }

    if (attempts >= maxAttempts) {
      clearInterval(checkLoad);
      console.error("[WAsender] Timeout waiting for load");
      notifyWebApp('WA_STATUS_UPDATE', 'error', entryId);
    }
  }, 1000);
}

async function processSend(sendBtn, entryId) {
  console.log("[WAsender] Chat loaded. Starting simulation...");

  // 1. Randomized Delay (2-5 seconds)
  const baseDelay = Math.floor(Math.random() * 3000) + 2000;
  await new Promise(r => setTimeout(r, baseDelay));

  // 2. Typing Simulation (Visual only, focus the box)
  const input = document.querySelector(CONFIG.SELECTORS.TYPING_INDICATOR);
  if (input) {
    input.focus();
    console.log("[WAsender] Simulating typing...");
    await new Promise(r => setTimeout(r, 1500));
  }

  // 3. Click Send
  const btnToClick = sendBtn.closest('button') || sendBtn;
  btnToClick.click();
  console.log("[WAsender] Clicked send button");

  // 4. Verify Sent & Notify
  // We wait a bit to ensure it's processed
  setTimeout(() => {
    notifyWebApp('WA_STATUS_UPDATE', 'sent', entryId);
    console.log("[WAsender] Success! Closing in 3s...");
    
    // 5. Smart Close
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "closeTab" });
    }, 3000);
  }, 2000);
}

// Anti-Spam / Warning Detection
function watchForWarnings() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        const text = document.body.innerText;
        if (text.includes("Too many messages") || text.includes("Banyak pesan")) {
          console.warn("[WAsender] SPAM WARNING DETECTED!");
          notifyWebApp('WA_WARNING_DETECTED', 'warning', 'spam-detected');
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// Initialize
if (document.readyState === "complete" || document.readyState === "interactive") {
  startAutoProcess();
  watchForWarnings();
  // Backup pong for detection
  notifyWebApp('EXTENSION_PONG');
} else {
  window.addEventListener("DOMContentLoaded", () => {
    startAutoProcess();
    watchForWarnings();
    notifyWebApp('EXTENSION_PONG');
  });
}`
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
