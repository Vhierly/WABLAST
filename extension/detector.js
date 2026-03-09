// detector.js
// This script runs on the webapp to notify it that the extension is installed.
console.log("%c WAsender Extension Detector Active ", "background: #25D366; color: white; font-weight: bold;");

// Detect current hostname for debugging
console.log("[WAsender Detector] Running on:", window.location.hostname);

function sendPong() {
  // Send to current window (for same-page detection)
  window.postMessage({
    source: 'wasender-extension',
    type: 'EXTENSION_PONG',
    timestamp: Date.now()
  }, '*');
}

// Send immediately when script loads
sendPong();

// Also send periodically to keep heartbeat alive
setInterval(sendPong, 2000);

// Listen for PING from webapp and respond
window.addEventListener('message', (event) => {
  // Only accept messages from same window
  if (event.source !== window) return;
  
  if (event.data && event.data.type === 'EXTENSION_PING') {
    console.log("[WAsender Detector] Received PING, sending PONG");
    sendPong();
  }
});

// Notify that detector is ready
console.log("[WAsender Detector] Ready and listening for messages");
