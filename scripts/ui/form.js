// scripts/ui/form.js
import { $, $$ } from '../utils/dom.js';
import { attachValidation } from '../utils/validation.js';

export class FormManager {
    constructor() {
        this.jqlMode = 'auto';
        this.form = $('#autoJqlForm');
        this.customForm = $('#customJqlForm');
        this.init();
    }

    init() {
        $('#autoJqlBtn').addEventListener('click', () => this.switchJqlMode('auto'));
        $('#customJqlBtn').addEventListener('click', () => this.switchJqlMode('custom'));

        // Attach validation to all relevant inputs
        $$('input, textarea').forEach(input => {
            const errorDiv = $(`#${input.id}Error`);
            if (errorDiv) {
                attachValidation(input, errorDiv);
            }
        });
    }

    switchJqlMode(mode) {
        if (this.jqlMode === mode) return;
        this.jqlMode = mode;

        $('.jql-toggle-btn.active').classList.remove('active');
        $(`[data-mode="${mode}"]`).classList.add('active');

        const currentForm = $('.form-mode.active');
        const targetForm = (mode === 'auto') ? this.form : this.customForm;

        if (currentForm && targetForm && currentForm !== targetForm) {
            currentForm.classList.add('exiting');
            setTimeout(() => {
                currentForm.classList.remove('active', 'exiting');
                targetForm.classList.add('active');
            }, 200);
        }
    }

    getValues() {
        const values = { jqlMode: this.jqlMode };
        const inputs = (this.jqlMode === 'auto')
            ? $$('input', this.form)
            : $$('input, textarea', this.customForm);

        inputs.forEach(input => {
            values[input.id] = input.value.trim();
        });

        // Also get the base jira fields
        values['jiraUrl'] = $('#jiraUrl').value.trim();
        values['jiraEmail'] = $('#jiraEmail').value.trim();
        values['jiraApiKey'] = $('#jiraApiKey').value.trim();


        if (this.jqlMode === 'custom') {
            values['fixVersion'] = values['customFixVersion']
            values['projectKey'] = values['customProjectKey']
            values['componentName'] = values['customComponentName']

        }

        return values;
    }

    setValues(config) {
        if (config.jqlMode) {
            this.switchJqlMode(config.jqlMode);
        }
        $$('input, textarea').forEach(input => {
            if (config[input.id]) {
                input.value = config[input.id];
            }
        });
    }
}