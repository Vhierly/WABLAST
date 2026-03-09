// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "closeTab" && sender.tab) {
    console.log("Closing tab:", sender.tab.id);
    chrome.tabs.remove(sender.tab.id);
  }
});
