// UI Manager for Xray Test Generator
// Handles all UI-related operations: status, progress, logging
class UIManager {
    constructor() {
        this.logElement = DOMHelper.getElement('log');
        this.progressElement = DOMHelper.getElement('progress');
        this.progressBarElement = DOMHelper.getElement('progressBar');
        this.progressTextElement = DOMHelper.getElement('progressText');
    }

    showStatus(elementId, message, type = 'info') {
        DOMHelper.showStatus(elementId, message, type);
    }

    hideStatus(elementId) {
        DOMHelper.hideStatus(elementId);
    }

    hideAllStatuses() {
        [CONSTANTS.STATUS_IDS.CONNECTION, CONSTANTS.STATUS_IDS.PARAMETERS, CONSTANTS.STATUS_IDS.MAIN].forEach(id => {
            DOMHelper.hideStatus(id);
        });
    }

    showProgress(percent, text = '') {
        if (this.progressElement) {
            this.progressElement.classList.remove('hidden');
        }
        if (this.progressBarElement) {
            this.progressBarElement.style.width = `${percent}%`;
        }
        if (this.progressTextElement) {
            this.progressTextElement.textContent = text || `${percent}%`;
        }
    }

    hideProgress() {
        DOMHelper.hideElement('progress');
    }

    showLog() {
        DOMHelper.showElement('log');
    }

    hideLog() {
        DOMHelper.hideElement('log');
    }

    clearLog() {
        if (this.logElement) {
            this.logElement.innerHTML = '';
        }
    }

    log(message, type = 'info') {
        if (!this.logElement) {
            logger.warn('Log element not found');
            return;
        }

        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.logElement.appendChild(entry);
        this.logElement.scrollTop = this.logElement.scrollHeight;
        this.showLog();
    }

    setButtonDisabled(buttonId, disabled) {
        DOMHelper.setDisabled(buttonId, disabled);
    }

    showElement(elementId) {
        DOMHelper.showElement(elementId);
    }

    hideElement(elementId) {
        DOMHelper.hideElement(elementId);
    }
}

