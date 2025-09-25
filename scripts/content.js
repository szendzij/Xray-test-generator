// scripts/content.js

/**
 * Checks if the current page is a Jira page.
 * @returns {boolean}
 */
function isJiraPage() {
    return window.location.hostname.includes('atlassian.net') || window.location.hostname.includes('jira.com');
}

/**
 * Injects a floating action button to open the side panel.
 */
function injectOpenButton() {
    const existingButton = document.getElementById('xray-generator-fab');
    if (existingButton) {
        return;
    }

    const fab = document.createElement('div');
    fab.id = 'xray-generator-fab';
    fab.textContent = '🚀';
    fab.title = 'Otwórz Xray Test Generator';

    Object.assign(fab.style, {
        position: 'fixed',
        bottom: '25px',
        right: '25px',
        width: '50px',
        height: '50px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '24px',
        cursor: 'pointer',
        zIndex: '9999',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'transform 0.2s ease-in-out',
    });

    fab.addEventListener('mouseenter', () => fab.style.transform = 'scale(1.1)');
    fab.addEventListener('mouseleave', () => fab.style.transform = 'scale(1)');
    fab.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openSidePanel' });
    });

    document.body.appendChild(fab);
}

/**
 * Main initialization function for the content script.
 */
function main() {
    if (isJiraPage()) {
        console.log('Xray Test Generator: Content script loaded on Jira page.');
        injectOpenButton();
    }
}

// Run the script
main();