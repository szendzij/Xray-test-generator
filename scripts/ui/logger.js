// scripts/ui/logger.js
import { $, show, hide, setText } from '../utils/dom.js';

export class Logger {
    constructor() {
        this.logContainer = $('#log');
        this.progressContainer = $('#progress');
        this.progressBar = $('#progressBar');
        this.statusContainer = $('#status');
        this.connectionStatus = $('#connectionStatus');
        this.parametersStatus = $('#parametersStatus');
    }

    log(message, type = 'info') {
        show(this.logContainer);
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.logContainer.appendChild(entry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    showProgress(percent, text = '') {
        show(this.progressContainer);
        this.progressBar.style.width = `${percent}%`;
        setText(this.progressBar, text || `${percent}%`);
    }

    hideProgress() {
        hide(this.progressContainer);
    }

    showStatus(message, type = 'info', step = 3) {
        let container;
        if (step === 1) container = this.connectionStatus;
        else if (step === 2) container = this.parametersStatus;
        else container = this.statusContainer;

        if (container) {
            setText(container, message);
            container.className = `status ${type}`;
            show(container);
        }
    }

    hideStatus(step) {
        if (step === 1) hide(this.connectionStatus);
        else if (step === 2) hide(this.parametersStatus);
        else hide(this.statusContainer);
    }

    hideAllStatuses() {
        hide(this.connectionStatus);
        hide(this.parametersStatus);
        hide(this.statusContainer);
    }

    reset() {
        this.logContainer.innerHTML = '';
        hide(this.logContainer);
        hide(this.progressContainer);
        this.hideAllStatuses();
    }
}