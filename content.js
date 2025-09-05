// Content script for Xray Test Generator Chrome Extension
// This script runs on Jira pages and can interact with the page content

console.log('Xray Test Generator content script loaded');

// Function to detect if we're on a Jira page
function isJiraPage() {
    return window.location.hostname.includes('atlassian.net') ||
        window.location.hostname.includes('jira.com');
}

// Function to get current page context
function getPageContext() {
    if (!isJiraPage()) {
        return null;
    }

    const url = window.location.href;
    const issueKeyMatch = url.match(/([A-Z]+-\d+)/);

    return {
        url: url,
        issueKey: issueKeyMatch ? issueKeyMatch[1] : null,
        isIssuePage: issueKeyMatch !== null,
        isBoardPage: url.includes('/boards/'),
        isProjectPage: url.includes('/projects/')
    };
}

// Function to inject a notification into the page
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existing = document.getElementById('xray-generator-notification');
    if (existing) {
        existing.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'xray-generator-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPageContext') {
        sendResponse(getPageContext());
    }

    if (request.action === 'showNotification') {
        showNotification(request.message, request.type);
        sendResponse({ success: true });
    }
});

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

function initialize() {
    if (isJiraPage()) {
        console.log('Xray Test Generator: Jira page detected');

        // Add a small indicator that the extension is active
        const indicator = document.createElement('div');
        indicator.id = 'xray-generator-indicator';
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: transform 0.2s ease;
        `;
        indicator.textContent = '🚀';
        indicator.title = 'Xray Test Generator - Kliknij aby otworzyć';

        indicator.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'openPopup' });
        });

        indicator.addEventListener('mouseenter', () => {
            indicator.style.transform = 'scale(1.1)';
        });

        indicator.addEventListener('mouseleave', () => {
            indicator.style.transform = 'scale(1)';
        });

        document.body.appendChild(indicator);
    }
}
