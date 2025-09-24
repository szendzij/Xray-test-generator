// Background script for Xray Test Generator Chrome Extension
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Xray Test Generator extension installed');

    if (details.reason === 'install') {
        // Set default configuration
        chrome.storage.local.set({
            jiraUrl: 'https://wfirma.atlassian.net',
            projectKey: 'RES',
            componentName: '5ways',
            fixVersion: '25.9'
        });
    }
});

// Handle messages from sidepanel or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getConfig') {
        chrome.storage.local.get([
            'jiraUrl', 'jiraEmail', 'jiraApiKey', 'fixVersion', 'projectKey', 'componentName'
        ], (config) => {
            sendResponse(config);
        });
        return true; // Keep message channel open for async response
    }

    if (request.action === 'saveConfig') {
        chrome.storage.local.set(request.config, () => {
            sendResponse({ success: true });
        });
        return true;
    }

    if (request.action === 'openSidePanel') {
        // Open side panel when requested
        chrome.sidePanel.open({ windowId: sender.tab.windowId });
        sendResponse({ success: true });
        return true;
    }
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener(async (tab) => {
    try {
        // Open side panel for the current tab
        await chrome.sidePanel.open({ tabId: tab.id });
        console.log('Side panel opened for tab:', tab.id);
    } catch (error) {
        console.error('Error opening side panel:', error);
    }
});

// Configure side panel behavior
chrome.runtime.onInstalled.addListener(async () => {
    try {
        // Set side panel to open when action button is clicked
        await chrome.sidePanel.setPanelBehavior({
            openPanelOnActionClick: true
        });
        console.log('Side panel behavior configured');
    } catch (error) {
        console.error('Error configuring side panel behavior:', error);
    }
});
