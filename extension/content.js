// content.js
console.log("J&T Cargo Blast Helper Active");

function findSendButton() {
  // WhatsApp Web send button selector (can change, so we use multiple strategies)
  const selectors = [
    'span[data-icon="send"]',
    'button[aria-label="Send"]',
    'button span[data-icon="send"]'
  ];
  
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el.closest('button') || el;
  }
  return null;
}

function autoSend() {
  // Only auto-send if the URL has the text parameter AND autosend=true
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has('text') || urlParams.get('autosend') !== 'true') return;

  console.log("Detected blast message with Auto-Send enabled, waiting for load...");

  const checkInterval = setInterval(() => {
    const sendButton = findSendButton();
    
    if (sendButton) {
      clearInterval(checkInterval);
      
      // Random human-like delay (2-4 seconds)
      const delay = Math.floor(Math.random() * 2000) + 2000;
      console.log(`Sending in ${delay}ms...`);
      
      setTimeout(() => {
        sendButton.click();
        console.log("Message sent automatically!");
        
        // Notify background script to close tab after a short delay
        setTimeout(() => {
          chrome.runtime.sendMessage({action: "closeTab"});
        }, 2000);
      }, delay);
    }
  }, 1000);
}

// Initial check
autoSend();

// Also listen for URL changes (WhatsApp Web is a SPA)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    autoSend();
  }
}).observe(document, {subtree: true, childList: true});
