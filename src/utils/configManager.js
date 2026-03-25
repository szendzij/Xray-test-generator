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
            const allKeys = [...CONSTANTS.STORAGE.KEYS, 'geminiApiKey', 'useAiSteps', 'xrayClientId', 'xrayClientSecret'];
            const config = await chrome.storage.local.get(allKeys);
            CONSTANTS.STORAGE.KEYS.forEach(key => {
                if (key !== 'jqlMode' && config[key]) DOMHelper.setValue(key, config[key]);
            });
            if (config['geminiApiKey']) DOMHelper.setValue('geminiApiKey', config['geminiApiKey']);
            if (config['xrayClientId']) DOMHelper.setValue('xrayClientId', config['xrayClientId']);
            if (config['xrayClientSecret']) DOMHelper.setValue('xrayClientSecret', config['xrayClientSecret']);
            const checkbox = document.getElementById('useAiSteps');
            if (checkbox) {
                checkbox.checked = config['useAiSteps'] === 'true';
                const aiConfig = document.getElementById('aiStepsConfig');
                if (aiConfig) aiConfig.classList.toggle('hidden', !checkbox.checked);
            }
            return config;
        } catch (error) {
            logger.error(i18n.t('msg.loadConfigError'), error);
            throw error;
        }
    }

    async saveConfig() {
        try {
            const useAiStepsEl = document.getElementById('useAiSteps');
            const config = {
                jiraUrl: DOMHelper.getValue('jiraUrl'),
                jiraEmail: DOMHelper.getValue('jiraEmail'),
                jiraApiKey: DOMHelper.getValue('jiraApiKey'),
                customJql: DOMHelper.getValue('customJql') || '',
                customProjectKey: DOMHelper.getValue('customProjectKey') || '',
                customComponentName: DOMHelper.getValue('customComponentName') || '',
                customFixVersion: DOMHelper.getValue('customFixVersion') || '',
                geminiApiKey: DOMHelper.getValue('geminiApiKey') || '',
                useAiSteps: useAiStepsEl?.checked ? 'true' : 'false',
                xrayClientId: DOMHelper.getValue('xrayClientId') || '',
                xrayClientSecret: DOMHelper.getValue('xrayClientSecret') || ''
            };

            await chrome.storage.local.set(config);
        } catch (error) {
            logger.error(i18n.t('msg.saveConfigError'), error);
            throw error;
        }
    }

    getConfig() {
        const useAiStepsEl = document.getElementById('useAiSteps');
        return {
            jiraUrl: DOMHelper.getValue('jiraUrl'),
            jiraEmail: DOMHelper.getValue('jiraEmail'),
            jiraApiKey: DOMHelper.getValue('jiraApiKey'),
            customJql: DOMHelper.getValue('customJql'),
            fixVersion: DOMHelper.getValue('customFixVersion'),
            projectKey: DOMHelper.getValue('customProjectKey'),
            componentName: DOMHelper.getValue('customComponentName'),
            jqlMode: CONSTANTS.JQL_MODE.CUSTOM,
            geminiApiKey: DOMHelper.getValue('geminiApiKey'),
            useAiSteps: useAiStepsEl ? useAiStepsEl.checked : false,
            xrayClientId: DOMHelper.getValue('xrayClientId'),
            xrayClientSecret: DOMHelper.getValue('xrayClientSecret')
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

