// Config Manager for Xray Test Generator
// Handles loading, saving, and retrieving configuration with debouncing
class ConfigManager {
    constructor() {
        this.saveTimeout = null;
    }

    debounce(func, wait) {
        return (...args) => {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    async loadSavedConfig() {
        try {
            const config = await chrome.storage.local.get(CONSTANTS.STORAGE.KEYS);
            CONSTANTS.STORAGE.KEYS.forEach(key => {
                if (config[key]) DOMHelper.setValue(key, config[key]);
            });
            return config;
        } catch (error) {
            logger.error(i18n.t('msg.loadConfigError'), error);
            throw error;
        }
    }

    async saveConfig() {
        try {
            const config = {
                jiraUrl: DOMHelper.getValue('jiraUrl'),
                jiraEmail: DOMHelper.getValue('jiraEmail'),
                jiraApiKey: DOMHelper.getValue('jiraApiKey'),
                customJql: DOMHelper.getValue('customJql') || '',
                customProjectKey: DOMHelper.getValue('customProjectKey') || '',
                customComponentName: DOMHelper.getValue('customComponentName') || '',
                customFixVersion: DOMHelper.getValue('customFixVersion') || ''
            };

            await chrome.storage.local.set(config);
        } catch (error) {
            logger.error(i18n.t('msg.saveConfigError'), error);
            throw error;
        }
    }

    getConfig() {
        return {
            jiraUrl: DOMHelper.getValue('jiraUrl'),
            jiraEmail: DOMHelper.getValue('jiraEmail'),
            jiraApiKey: DOMHelper.getValue('jiraApiKey'),
            customJql: DOMHelper.getValue('customJql'),
            fixVersion: DOMHelper.getValue('customFixVersion'),
            projectKey: DOMHelper.getValue('customProjectKey'),
            componentName: DOMHelper.getValue('customComponentName'),
            jqlMode: CONSTANTS.JQL_MODE.CUSTOM
        };
    }

    // Debounced save for auto-save on input
    saveConfigDebounced() {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveConfig();
        }, CONSTANTS.TIMEOUTS.DEBOUNCE_SAVE);
    }
}

