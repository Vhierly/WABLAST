// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "closeTab" && sender.tab) {
    setTimeout(() => {
      chrome.tabs.remove(sender.tab.id);
    }, 1000);
  }
});
