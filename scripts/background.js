// scripts/background.js

// On installation, set up the side panel and default configuration.
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Xray Test Generator extension installed.');

    // Set the side panel to open on action click
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    console.log('Side panel behavior configured to open on action click.');

    // Set default configuration on first install
    if (details.reason === 'install') {
        chrome.storage.local.set({
            jiraUrl: 'https://wfirma.atlassian.net',
            projectKey: 'RES',
            componentName: '5ways',
            fixVersion: '25.9',
            jqlMode: 'auto'
        });
        console.log('Default configuration set.');
    }
});

// A simple listener to open the side panel when requested by the content script.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openSidePanel') {
        chrome.sidePanel.open({ windowId: sender.tab.windowId });
        sendResponse({ success: true });
    }
    // Keep the message channel open for async response, although not strictly needed here.
    return true;
});

// Log when the extension icon is clicked.
chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked, side panel should open.');
});