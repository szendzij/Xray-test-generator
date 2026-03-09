// Validation Service for Xray Test Generator
// Centralizes all validation logic
class ValidationService {
    constructor() {
        this.validationRules = {
            jiraUrl: (value) => {
                if (!value) return 'URL jest wymagany';
                if (!value.startsWith('https://')) return 'URL musi zaczynać się od https://';
                try {
                    new URL(value);
                } catch (urlError) {
                    return 'Nieprawidłowy format URL Jira';
                }
                return null;
            },
            jiraEmail: (value) => {
                if (!value) return 'Email jest wymagany';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Nieprawidłowy format email';
                return null;
            },
            jiraApiKey: (value) => {
                if (!value) return 'API Key jest wymagany';
                if (value.length < CONSTANTS.VALIDATION.MIN_API_KEY_LENGTH) {
                    return 'API Key jest za krótki';
                }
                return null;
            },
            fixVersion: (value) => {
                if (!value) return 'Fix Version jest wymagana';
                return null;
            },
            projectKey: (value) => {
                if (!value) return 'Project Key jest wymagany';
                if (!/^[A-Z]+$/.test(value)) return 'Project Key może zawierać tylko wielkie litery';
                return null;
            },
            componentName: (value) => {
                if (!value) return 'Component Name jest wymagany';
                return null;
            },
            customJql: (value) => {
                if (!value) return 'JQL jest wymagane';
                if (value.length < CONSTANTS.VALIDATION.MIN_JQL_LENGTH) return 'JQL jest za krótkie';
                if (!value.toLowerCase().includes('project')) {
                    return 'JQL powinno zawierać warunek "project"';
                }
                return null;
            },
            customProjectKey: (value) => {
                if (!value) return 'Project Key jest wymagany';
                if (!/^[A-Z]+$/.test(value)) return 'Project Key może zawierać tylko wielkie litery';
                return null;
            },
            customComponentName: (value) => {
                if (!value) return 'Component Name jest wymagany';
                return null;
            },
            customFixVersion: (value) => {
                if (!value) return 'Fix Version jest wymagana';
                return null;
            }
        };
    }

    validateField(fieldId, value) {
        const validator = this.validationRules[fieldId];
        if (!validator) {
            return value ? null : 'Pole jest wymagane';
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
            if (jqlMode === CONSTANTS.JQL_MODE.AUTO) {
                fields = ['fixVersion', 'projectKey', 'componentName'];
            } else {
                fields = ['customJql', 'customProjectKey', 'customComponentName', 'customFixVersion'];
            }
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
        let required;
        
        if (config.jqlMode === CONSTANTS.JQL_MODE.AUTO) {
            required = ['jiraUrl', 'jiraEmail', 'jiraApiKey', 'fixVersion', 'projectKey', 'componentName'];
        } else {
            required = ['jiraUrl', 'jiraEmail', 'jiraApiKey', 'customJql', 'fixVersion', 'projectKey', 'componentName'];
        }

        const getFieldValue = (fieldId) => config[fieldId] || '';

        const validation = this.validateFields(required, getFieldValue);
        
        if (!validation.isValid) {
            const firstError = Object.values(validation.results).find(r => r.error);
            throw new Error(firstError?.error || 'Pole jest wymagane');
        }

        if (!config.jiraUrl.startsWith('https://')) {
            throw new Error('Jira URL musi zaczynać się od https://');
        }

        try {
            new URL(config.jiraUrl);
        } catch (urlError) {
            throw new Error('Nieprawidłowy format URL Jira');
        }

        if (!config.jiraUrl.includes('atlassian.net') && !config.jiraUrl.includes('jira')) {
            logger.warn('URL może nie być prawidłowym adresem Jira. Sprawdź czy to jest poprawny URL do instancji Jira.');
        }

        return config;
    }

    getValidationRule(fieldId) {
        return this.validationRules[fieldId];
    }
}

