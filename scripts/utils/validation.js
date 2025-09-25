// scripts/utils/validation.js

const validationRules = {
    jiraUrl: (value) => {
        if (!value) return 'URL jest wymagany';
        if (!value.startsWith('https://')) return 'URL musi zaczynać się od https://';
        try {
            new URL(value);
        } catch (e) {
            return 'Nieprawidłowy format URL';
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
        if (value.length < 10) return 'API Key jest za krótki';
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
        if (value.length < 10) return 'JQL jest za krótkie';
        if (!value.toLowerCase().includes('project')) return 'JQL powinno zawierać warunek "project"';
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

/**
 * Validates a single field.
 * @param {string} fieldId - The ID of the field to validate.
 * @param {string} value - The value to validate.
 * @returns {string|null} The error message, or null if valid.
 */
export function validateField(fieldId, value) {
    const validator = validationRules[fieldId];
    return validator ? validator(value.trim()) : null;
}

/**
 * Attaches real-time validation to a form input.
 * @param {HTMLInputElement} input - The input element.
 * @param {HTMLElement} errorDiv - The element to display the error message in.
 */
export function attachValidation(input, errorDiv) {
    const fieldId = input.id;
    const handleValidation = () => {
        const error = validateField(fieldId, input.value);
        if (error) {
            errorDiv.textContent = error;
            errorDiv.classList.remove('hidden');
            input.style.borderColor = '#f44336';
        } else {
            errorDiv.classList.add('hidden');
            input.style.borderColor = '';
        }
    };

    input.addEventListener('input', handleValidation);
    input.addEventListener('blur', handleValidation);
}