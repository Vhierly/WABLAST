// detector.js
// This script runs on the webapp to notify it that the extension is installed.
console.log("%c WAsender Extension Detector Active ", "background: #25D366; color: white; font-weight: bold;");

function sendPong() {
  // Set attribute for DOM detection
  document.documentElement.setAttribute('data-wasender-extension', 'active');
  
  window.postMessage({
    source: 'wasender-extension',
    type: 'EXTENSION_PONG'
  }, '*');
}

// Send immediately
sendPong();

// Also send periodically to keep heartbeat alive
setInterval(sendPong, 2000);

// Listen for manual trigger from popup
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "triggerPong") {
    console.log("[WAsender] Manual trigger received from popup");
    sendPong();
  }
});
