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

// Handle messages from popup or content scripts
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
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // This will open the popup automatically due to manifest configuration
    console.log('Extension icon clicked');
});
