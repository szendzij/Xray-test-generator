// DOM Helper utility for Xray Test Generator
// Abstracts DOM manipulation to reduce direct getElementById calls
class DOMHelper {
    static getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            logger.warn(`Element with id "${id}" not found`);
        }
        return element;
    }

    static getElements(selector) {
        return document.querySelectorAll(selector);
    }

    static getValue(id) {
        const element = this.getElement(id);
        return element ? element.value : null;
    }

    static setValue(id, value) {
        const element = this.getElement(id);
        if (element) {
            element.value = value || '';
        }
    }

    static showElement(id) {
        const element = this.getElement(id);
        if (element) {
            element.classList.remove('hidden');
        }
    }

    static hideElement(id) {
        const element = this.getElement(id);
        if (element) {
            element.classList.add('hidden');
        }
    }

    static setText(id, text) {
        const element = this.getElement(id);
        if (element) {
            element.textContent = text;
        }
    }

    static setHTML(id, html) {
        const element = this.getElement(id);
        if (element) {
            element.innerHTML = html;
        }
    }

    static addClass(id, className) {
        const element = this.getElement(id);
        if (element) {
            element.classList.add(className);
        }
    }

    static removeClass(id, className) {
        const element = this.getElement(id);
        if (element) {
            element.classList.remove(className);
        }
    }

    static toggleClass(id, className) {
        const element = this.getElement(id);
        if (element) {
            element.classList.toggle(className);
        }
    }

    static setStyle(id, property, value) {
        const element = this.getElement(id);
        if (element) {
            element.style[property] = value;
        }
    }

    static removeStyle(id, property) {
        const element = this.getElement(id);
        if (element) {
            element.style[property] = '';
        }
    }

    static setDisabled(id, disabled) {
        const element = this.getElement(id);
        if (element) {
            element.disabled = disabled;
        }
    }

    static showStatus(elementId, message, type = 'info') {
        const element = this.getElement(elementId);
        if (element) {
            element.textContent = message;
            element.className = `status ${type}`;
            element.classList.remove('hidden');
        }
    }

    static hideStatus(elementId) {
        this.addClass(elementId, 'hidden');
    }

    static setAttribute(id, attribute, value) {
        const element = this.getElement(id);
        if (element) {
            element.setAttribute(attribute, value);
        }
    }
}

