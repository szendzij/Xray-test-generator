// Validation Service for Xray Test Generator
// Centralizes all validation logic
class ValidationService {
    constructor() {
        this.validationRules = {
            jiraUrl: (value) => {
                if (!value) return i18n.t('val.urlRequired');
                if (!value.startsWith('https://')) return i18n.t('val.urlHttps');
                try {
                    new URL(value);
                } catch (urlError) {
                    return i18n.t('val.urlInvalid');
                }
                return null;
            },
            jiraEmail: (value) => {
                if (!value) return i18n.t('val.emailRequired');
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return i18n.t('val.emailInvalid');
                return null;
            },
            jiraApiKey: (value) => {
                if (!value) return i18n.t('val.apiKeyRequired');
                if (value.length < CONSTANTS.VALIDATION.MIN_API_KEY_LENGTH) {
                    return i18n.t('val.apiKeyShort');
                }
                return null;
            },
            fixVersion: (value) => {
                if (!value) return i18n.t('val.fixVersionRequired');
                return null;
            },
            projectKey: (value) => {
                if (!value) return i18n.t('val.projectKeyRequired');
                if (!/^[A-Z]+$/.test(value)) return i18n.t('val.projectKeyFormat');
                return null;
            },
            componentName: (value) => {
                if (!value) return i18n.t('val.componentRequired');
                return null;
            },
            customJql: (value) => {
                if (!value) return i18n.t('val.jqlRequired');
                if (value.length < CONSTANTS.VALIDATION.MIN_JQL_LENGTH) return i18n.t('val.jqlShort');
                if (!value.toLowerCase().includes('project')) {
                    return i18n.t('val.jqlProject');
                }
                return null;
            },
            customProjectKey: (value) => {
                if (!value) return i18n.t('val.projectKeyRequired');
                if (!/^[A-Z]+$/.test(value)) return i18n.t('val.projectKeyFormat');
                return null;
            },
            customComponentName: (value) => {
                if (!value) return i18n.t('val.componentRequired');
                return null;
            },
            customFixVersion: (value) => {
                if (!value) return i18n.t('val.fixVersionRequired');
                return null;
            }
        };
    }

    validateField(fieldId, value) {
        const validator = this.validationRules[fieldId];
        if (!validator) {
            return value ? null : i18n.t('val.fieldRequired');
        }
        return validator(value.trim());
    }

    validateFields(fields, getFieldValue) {
        const results = {};
        let isValid = true;

        fields.forEach(fieldId => {
            const value = getFieldValue(fieldId);
            const error = this.validateField(fieldId, value);
            results[fieldId] = {
                value,
                error,
                isValid: !error
            };
            if (error) {
                isValid = false;
            }
        });

        return { isValid, results };
    }

    validateStep(stepNumber, config, jqlMode) {
        let fields;

        if (stepNumber === CONSTANTS.STEPS.LOGIN) {
            fields = ['jiraUrl', 'jiraEmail', 'jiraApiKey'];
        } else if (stepNumber === CONSTANTS.STEPS.PARAMETERS) {
            fields = ['customJql', 'customProjectKey', 'customComponentName', 'customFixVersion'];
        } else {
            return { isValid: true, results: {} };
        }

        const getFieldValue = (fieldId) => {
            if (config[fieldId]) {
                return config[fieldId];
            }
            const element = DOMHelper.getElement(fieldId);
            return element ? element.value : '';
        };

        return this.validateFields(fields, getFieldValue);
    }

    validateConfig(config) {
        const required = ['jiraUrl', 'jiraEmail', 'jiraApiKey', 'customJql', 'fixVersion', 'projectKey', 'componentName'];

        const getFieldValue = (fieldId) => config[fieldId] || '';

        const validation = this.validateFields(required, getFieldValue);

        if (!validation.isValid) {
            const firstError = Object.values(validation.results).find(r => r.error);
            throw new Error(firstError?.error || i18n.t('val.fieldRequired'));
        }

        if (!config.jiraUrl.startsWith('https://')) {
            throw new Error(i18n.t('val.urlMustBeHttps'));
        }

        try {
            new URL(config.jiraUrl);
        } catch (urlError) {
            throw new Error(i18n.t('val.urlInvalid'));
        }

        if (!config.jiraUrl.includes('atlassian.net') && !config.jiraUrl.includes('jira')) {
            logger.warn(i18n.t('val.urlMayBeInvalid'));
        }

        return config;
    }

    getValidationRule(fieldId) {
        return this.validationRules[fieldId];
    }
}

