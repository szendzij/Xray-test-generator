// scripts/utils/config.js

const CONFIG_KEYS = [
    'jiraUrl', 'jiraEmail', 'jiraApiKey', 'fixVersion', 'projectKey', 'componentName',
    'customJql', 'customProjectKey', 'customComponentName', 'customFixVersion', 'jqlMode'
];

/**
 * Loads the configuration from chrome.storage.local.
 * @returns {Promise<object>} A promise that resolves with the configuration object.
 */
export async function loadConfig() {
    try {
        const config = await chrome.storage.local.get(CONFIG_KEYS);
        return config;
    } catch (error) {
        console.error('Error loading configuration:', error);
        return {};
    }
}

/**
 * Saves the configuration to chrome.storage.local.
 * @param {object} config - The configuration object to save.
 * @returns {Promise<void>} A promise that resolves when the configuration is saved.
 */
export async function saveConfig(config) {
    try {
        await chrome.storage.local.set(config);
    } catch (error) {
        console.error('Error saving configuration:', error);
    }
}