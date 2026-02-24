// Config Manager for Xray Test Generator
// Handles loading, saving, and retrieving configuration with debouncing
class ConfigManager {
    constructor() {
        this.saveTimeout = null;
        this.pendingJqlMode = null;
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
            
            // Load auto JQL fields
            if (config.jiraUrl) DOMHelper.setValue('jiraUrl', config.jiraUrl);
            if (config.jiraEmail) DOMHelper.setValue('jiraEmail', config.jiraEmail);
            if (config.jiraApiKey) DOMHelper.setValue('jiraApiKey', config.jiraApiKey);
            if (config.fixVersion) DOMHelper.setValue('fixVersion', config.fixVersion);
            if (config.projectKey) DOMHelper.setValue('projectKey', config.projectKey);
            if (config.componentName) DOMHelper.setValue('componentName', config.componentName);

            // Load custom JQL fields
            if (config.customJql) DOMHelper.setValue('customJql', config.customJql);
            if (config.customProjectKey) DOMHelper.setValue('customProjectKey', config.customProjectKey);
            if (config.customComponentName) DOMHelper.setValue('customComponentName', config.customComponentName);
            if (config.customFixVersion) DOMHelper.setValue('customFixVersion', config.customFixVersion);

            return config;
        } catch (error) {
            logger.error('Błąd podczas ładowania konfiguracji:', error);
            throw error;
        }
    }

    async saveConfig(jqlMode) {
        try {
            const config = {
                jiraUrl: DOMHelper.getValue('jiraUrl'),
                jiraEmail: DOMHelper.getValue('jiraEmail'),
                jiraApiKey: DOMHelper.getValue('jiraApiKey'),
                fixVersion: DOMHelper.getValue('fixVersion'),
                projectKey: DOMHelper.getValue('projectKey'),
                componentName: DOMHelper.getValue('componentName'),
                customJql: DOMHelper.getValue('customJql') || '',
                customProjectKey: DOMHelper.getValue('customProjectKey') || '',
                customComponentName: DOMHelper.getValue('customComponentName') || '',
                customFixVersion: DOMHelper.getValue('customFixVersion') || '',
                jqlMode: jqlMode || CONSTANTS.JQL_MODE.AUTO
            };

            await chrome.storage.local.set(config);
        } catch (error) {
            logger.error('Błąd podczas zapisywania konfiguracji:', error);
            throw error;
        }
    }

    getConfig(jqlMode) {
        if (jqlMode === CONSTANTS.JQL_MODE.AUTO) {
            return {
                jiraUrl: DOMHelper.getValue('jiraUrl'),
                jiraEmail: DOMHelper.getValue('jiraEmail'),
                jiraApiKey: DOMHelper.getValue('jiraApiKey'),
                fixVersion: DOMHelper.getValue('fixVersion'),
                projectKey: DOMHelper.getValue('projectKey'),
                componentName: DOMHelper.getValue('componentName'),
                jqlMode: CONSTANTS.JQL_MODE.AUTO
            };
        } else {
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
    }

    // Debounced save for auto-save on input
    saveConfigDebounced(jqlMode) {
        this.pendingJqlMode = jqlMode;
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveConfig(this.pendingJqlMode);
            this.pendingJqlMode = null;
        }, CONSTANTS.TIMEOUTS.DEBOUNCE_SAVE);
    }
}

