const ID = Math.random().toString(36).substring(2, 15);

chrome.action.onClicked.addListener(async (tab) => {
  const tabId = tab.id;
  if (!tabId) return;

  chrome.tabs.sendMessage(tabId, {
    action: 'start-clip-translate',
  });
});