// Stepper Controller for Xray Test Generator
// Manages step navigation and validation
class StepperController {
    constructor(validationService, uiManager) {
        this.validationService = validationService;
        this.uiManager = uiManager;
        this.currentStep = CONSTANTS.STEPS.LOGIN;
        this.connectionVerified = false;
    }

    getCurrentStep() {
        return this.currentStep;
    }

    setConnectionVerified(verified) {
        this.connectionVerified = verified;
    }

    isConnectionVerified() {
        return this.connectionVerified;
    }

    goToStep(stepNumber, jqlMode, validateCallback) {
        if (stepNumber < CONSTANTS.STEPS.MIN || stepNumber > CONSTANTS.STEPS.MAX) {
            return false;
        }

        // Validate current step before proceeding
        if (stepNumber > this.currentStep) {
            const config = this.getConfigForValidation(jqlMode);
            const validation = this.validationService.validateStep(this.currentStep, config, jqlMode);
            
            if (!validation.isValid) {
                this.showStepStatus(`Uzupełnij wszystkie wymagane pola w kroku ${this.currentStep}`, 'error');
                if (validateCallback) {
                    validateCallback(false);
                }
                return false;
            }
        }

        // Update step classes
        DOMHelper.getElements('.step').forEach(step => {
            const num = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');

            if (num === stepNumber) {
                step.classList.add('active');
            } else if (num < stepNumber) {
                step.classList.add('completed');
            }
        });

        // Update panel visibility
        DOMHelper.getElements('.step-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        const targetPanel = document.querySelector(`[data-panel="${stepNumber}"]`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }

        this.currentStep = stepNumber;
        this.uiManager.hideAllStatuses();
        
        if (validateCallback) {
            validateCallback(this.updateStepValidation(jqlMode));
        } else {
            this.updateStepValidation(jqlMode);
        }

        return true;
    }

    resetStepper() {
        this.currentStep = CONSTANTS.STEPS.LOGIN;
        this.connectionVerified = false;
        this.goToStep(CONSTANTS.STEPS.LOGIN);
        this.uiManager.hideAllStatuses();
        DOMHelper.hideElement('resetStepper');

        // Clear logs and progress
        this.uiManager.clearLog();
        this.uiManager.hideLog();
        this.uiManager.hideProgress();
    }

    showStepStatus(message, type = 'info') {
        let statusId;
        if (this.currentStep === CONSTANTS.STEPS.LOGIN) {
            statusId = CONSTANTS.STATUS_IDS.CONNECTION;
        } else if (this.currentStep === CONSTANTS.STEPS.PARAMETERS) {
            statusId = CONSTANTS.STATUS_IDS.PARAMETERS;
        } else {
            statusId = CONSTANTS.STATUS_IDS.MAIN;
        }

        this.uiManager.showStatus(statusId, message, type);
    }

    validateCurrentStep(jqlMode) {
        return this.updateStepValidation(jqlMode);
    }

    updateStepValidation(jqlMode) {
        const config = this.getConfigForValidation(jqlMode);
        const validation = this.validationService.validateStep(this.currentStep, config, jqlMode);
        
        if (this.currentStep === CONSTANTS.STEPS.LOGIN) {
            DOMHelper.setDisabled('nextStep1', !validation.isValid);
        } else if (this.currentStep === CONSTANTS.STEPS.PARAMETERS) {
            DOMHelper.setDisabled('nextStep2', !validation.isValid);
        }

        // Update visual validation for each field
        Object.keys(validation.results).forEach(fieldId => {
            const result = validation.results[fieldId];
            const element = DOMHelper.getElement(fieldId);
            const errorDiv = DOMHelper.getElement(`${fieldId}Error`);

            if (element && errorDiv) {
                if (result.error) {
                    DOMHelper.setText(`${fieldId}Error`, result.error);
                    DOMHelper.removeClass(`${fieldId}Error`, 'hidden');
                    DOMHelper.setStyle(fieldId, 'borderColor', CONSTANTS.VALIDATION.ERROR_COLOR);
                } else {
                    DOMHelper.addClass(`${fieldId}Error`, 'hidden');
                    DOMHelper.removeStyle(fieldId, 'borderColor');
                }
            }
        });

        return validation.isValid;
    }

    getConfigForValidation(jqlMode) {
        const config = {};
        const fields = jqlMode === CONSTANTS.JQL_MODE.AUTO
            ? ['jiraUrl', 'jiraEmail', 'jiraApiKey', 'fixVersion', 'projectKey', 'componentName']
            : ['jiraUrl', 'jiraEmail', 'jiraApiKey', 'customJql', 'customProjectKey', 'customComponentName', 'customFixVersion'];

        fields.forEach(fieldId => {
            const element = DOMHelper.getElement(fieldId);
            if (element) {
                config[fieldId] = element.value;
            }
        });

        return config;
    }
}

