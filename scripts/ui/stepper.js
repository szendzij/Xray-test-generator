// scripts/ui/stepper.js
import { $, $$ } from '../utils/dom.js';

export class Stepper {
    constructor() {
        this.steps = $$('.step');
        this.panels = $$('.step-panel');
        this.currentStep = 1;
        this.init();
    }

    init() {
        this.steps.forEach(step => {
            step.addEventListener('click', () => {
                const stepNumber = parseInt(step.dataset.step, 10);
                // Allow clicking to go back, but not forward
                if (stepNumber < this.currentStep) {
                    this.goToStep(stepNumber);
                }
            });
        });
    }

    goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > this.steps.length) {
            return;
        }

        this.currentStep = stepNumber;

        this.steps.forEach((step, index) => {
            const num = index + 1;
            step.classList.remove('active', 'completed');
            if (num === stepNumber) {
                step.classList.add('active');
            } else if (num < stepNumber) {
                step.classList.add('completed');
            }
        });

        this.panels.forEach(panel => {
            panel.classList.remove('active');
        });

        $(`[data-panel="${stepNumber}"]`).classList.add('active');
    }

    next() {
        if (this.currentStep < this.steps.length) {
            this.goToStep(this.currentStep + 1);
        }
    }

    previous() {
        if (this.currentStep > 1) {
            this.goToStep(this.currentStep - 1);
        }
    }

    reset() {
        this.goToStep(1);
    }
}