// popup.js
document.getElementById('connectBtn').addEventListener('click', async () => {
  const statusText = document.getElementById('statusText');
  statusText.textContent = "Connecting...";
  statusText.style.color = "#10b981";

  try {
    // Send message to background to broadcast to all tabs
    chrome.runtime.sendMessage({ action: "manualConnect" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError);
        statusText.textContent = "Error: " + chrome.runtime.lastError.message;
        statusText.style.color = "#ef4444";
      } else {
        statusText.textContent = "Signal Sent!";
        setTimeout(() => {
          statusText.textContent = "Ready";
          statusText.style.color = "#71717a";
        }, 2000);
      }
    });
  } catch (err) {
    statusText.textContent = "Failed to connect";
    statusText.style.color = "#ef4444";
  }
});
