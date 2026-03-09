// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "closeTab" && sender.tab) {
    console.log("Closing tab:", sender.tab.id);
    chrome.tabs.remove(sender.tab.id);
  } else if (request.action === "manualConnect") {
    // Broadcast to all tabs to trigger detection
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: "triggerPong" }).catch(() => {
          // Ignore errors for tabs where script is not injected
        });
      });
    });
    sendResponse({ success: true });
  }
  return true; // Keep channel open for async response
});
