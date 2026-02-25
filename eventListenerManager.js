// Event Listener Manager for Xray Test Generator
// Centralizes all event listener setup and management
class EventListenerManager {
    constructor(xrayTestGenerator) {
        this.xrayTestGenerator = xrayTestGenerator;
        this.listeners = new Map(); // Track listeners for potential cleanup
    }

    initializeEventListeners() {
        // Main action buttons
        this.addListener('checkConnection', 'click', () => this.xrayTestGenerator.checkConnection());
        this.addListener('generateTests', 'click', () => this.xrayTestGenerator.generateTests());

        // Stepper navigation
        this.addListener('nextStep1', 'click', () => this.xrayTestGenerator.goToStep(2));
        this.addListener('prevStep2', 'click', () => this.xrayTestGenerator.goToStep(1));
        this.addListener('nextStep2', 'click', () => this.xrayTestGenerator.goToStep(3));
        this.addListener('prevStep3', 'click', () => this.xrayTestGenerator.goToStep(2));
        this.addListener('resetStepper', 'click', () => this.xrayTestGenerator.resetStepper());

        // JQL Mode Toggle
        this.addListener('autoJqlBtn', 'click', () => this.xrayTestGenerator.switchJqlMode(CONSTANTS.JQL_MODE.AUTO));
        this.addListener('customJqlBtn', 'click', () => this.xrayTestGenerator.switchJqlMode(CONSTANTS.JQL_MODE.CUSTOM));

        // Theme Toggle
        this.addListener('themeToggle', 'click', () => this.xrayTestGenerator.toggleTheme());

        // Step clicking
        DOMHelper.getElements('.step').forEach(step => {
            const stepNumber = parseInt(step.dataset.step);
            const handler = () => this.xrayTestGenerator.goToStep(stepNumber);
            step.addEventListener('click', handler);
            this.listeners.set(`step-${stepNumber}`, { element: step, event: 'click', handler });
        });

        // Save config on input change (with debouncing handled by configManager)
        const configFields = [
            'jiraUrl', 'jiraEmail', 'jiraApiKey', 'fixVersion', 'projectKey', 'componentName',
            'customJql', 'customProjectKey', 'customComponentName', 'customFixVersion'
        ];

        configFields.forEach(id => {
            const element = DOMHelper.getElement(id);
            if (element) {
                const handler = () => {
                    this.xrayTestGenerator.onConfigInputChange();
                };
                element.addEventListener('input', handler);
                this.listeners.set(`config-${id}`, { element, event: 'input', handler });
            }
        });

        // Real-time validation
        this.setupValidationListeners();

        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'openSidePanel') {
                this.xrayTestGenerator.handleSidePanelOpen();
            }
        });
    }

    setupValidationListeners() {
        const validationService = this.xrayTestGenerator.validationService;

        Object.keys(validationService.validationRules).forEach(fieldId => {
            const input = DOMHelper.getElement(fieldId);
            const errorDiv = DOMHelper.getElement(`${fieldId}Error`);

            if (input && errorDiv) {
                const validationHandler = () => {
                    const value = input.value.trim();
                    const error = validationService.validateField(fieldId, value);
                    this.updateFieldValidation(fieldId, error);
                    this.xrayTestGenerator.updateStepValidation();
                };

                input.addEventListener('blur', validationHandler);
                input.addEventListener('input', validationHandler);

                this.listeners.set(`validation-blur-${fieldId}`, { element: input, event: 'blur', handler: validationHandler });
                this.listeners.set(`validation-input-${fieldId}`, { element: input, event: 'input', handler: validationHandler });
            }
        });
    }

    updateFieldValidation(fieldId, error) {
        const input = DOMHelper.getElement(fieldId);
        const errorDiv = DOMHelper.getElement(`${fieldId}Error`);

        if (!input || !errorDiv) return;

        if (error) {
            DOMHelper.setText(`${fieldId}Error`, error);
            DOMHelper.removeClass(`${fieldId}Error`, 'hidden');
            DOMHelper.setStyle(fieldId, 'borderColor', CONSTANTS.VALIDATION.ERROR_COLOR);
        } else {
            DOMHelper.addClass(`${fieldId}Error`, 'hidden');
            DOMHelper.removeStyle(fieldId, 'borderColor');
        }
    }

    addListener(elementId, event, handler) {
        const element = DOMHelper.getElement(elementId);
        if (element) {
            element.addEventListener(event, handler);
            this.listeners.set(`${elementId}-${event}`, { element, event, handler });
        }
    }

    removeAllListeners() {
        this.listeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.listeners.clear();
    }
}

