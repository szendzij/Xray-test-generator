import { JiraService } from './services/jiraService.js';
import { loadConfig, saveConfig } from './utils/config.js';
import { $, $$ } from './utils/dom.js';
import { Stepper } from './ui/stepper.js';
import { FormManager } from './ui/form.js';
import { Logger } from './ui/logger.js';
import { validateField } from './utils/validation.js';

class App {
    constructor() {
        this.stepper = new Stepper();
        this.formManager = new FormManager();
        this.logger = new Logger();
        this.jiraService = null;
        this.config = {};

        this.initialize();
    }

    async initialize() {
        this.config = await loadConfig();
        this.formManager.setValues(this.config);
        this.attachEventListeners();
        this.validateStep(1);
        this.validateStep(2);
    }

    attachEventListeners() {
        // Stepper navigation
        $('#nextStep1').addEventListener('click', () => this.handleNextStep1());
        $('#prevStep2').addEventListener('click', () => this.stepper.previous());
        $('#nextStep2').addEventListener('click', () => this.handleNextStep2());
        $('#prevStep3').addEventListener('click', () => this.stepper.previous());
        $('#resetStepper').addEventListener('click', () => this.reset());

        // Actions
        $('#checkConnection').addEventListener('click', () => this.checkConnection());
        $('#generateTests').addEventListener('click', () => this.generateTests());

        // Auto-save config on input change
        $$('input, textarea').forEach(input => {
            input.addEventListener('input', async () => {
                const values = this.formManager.getValues();
                await saveConfig(values);
                this.validateStep(this.stepper.currentStep);
            });
        });
    }

    validateStep(stepNumber) {
        const values = this.formManager.getValues();
        let fieldsToValidate = [];
        let isValid = false;

        if (stepNumber === 1) {
            fieldsToValidate = ['jiraUrl', 'jiraEmail', 'jiraApiKey'];
        } else if (stepNumber === 2) {
            if (this.formManager.jqlMode === 'auto') {
                fieldsToValidate = ['fixVersion', 'projectKey', 'componentName'];
            } else {
                fieldsToValidate = ['customJql', 'customProjectKey', 'customComponentName', 'customFixVersion'];
            }
        }

        if (fieldsToValidate.length > 0) {
            isValid = fieldsToValidate.every(field => !validateField(field, values[field]));
        }

        const nextButton = $(`#nextStep${stepNumber}`);
        if (nextButton) {
            nextButton.disabled = !isValid;
        }

        return isValid;
    }

    handleNextStep1() {
        if (this.validateStep(1)) {
            this.stepper.next();
            this.validateStep(2);
        }
    }

    handleNextStep2() {
        if (this.validateStep(2)) {
            this.stepper.next();
        }
    }

    async checkConnection() {
        this.logger.hideAllStatuses();
        if (!this.validateStep(1)) {
            this.logger.showStatus('Uzupełnij wymagane pola.', 'error', 1);
            return;
        }
        this.logger.showStatus('Sprawdzanie połączenia...', 'info', 1);

        try {
            const config = this.formManager.getValues();
            this.jiraService = new JiraService(config);
            const jql = this.buildJqlQuery(config);
            await this.jiraService.getJqlCount(jql);
            this.logger.showStatus('✅ Połączenie udane!', 'success', 1);
        } catch (error) {
            this.logger.showStatus(`❌ Błąd: ${error.message}`, 'error', 1);
        }
    }

    buildJqlQuery(config) {
        if (config.jqlMode === 'custom') {
            return config.customJql;
        } else {
            return `project = ${config.projectKey} AND fixVersion = '${config.fixVersion}' AND development[pullrequests].all > 0 and development[pullrequests].open = 0`;
        }
    }

    async generateTests() {
        this.logger.reset();
        $('#generateTests').disabled = true;

        try {
            const config = this.formManager.getValues();
            this.jiraService = new JiraService(config);

            this.logger.log('🚀 Rozpoczynanie generowania testów...');
            this.logger.showProgress(0, 'Inicjalizacja...');

            const jql = this.buildJqlQuery(config);
            this.logger.log(`Wykonywanie zapytania JQL: ${jql}`);
            const issues = await this.jiraService.getIssuesByJql(jql);

            if (issues.length === 0) {
                this.logger.showStatus('ℹ️ Nie znaleziono zadań dla podanych kryteriów.', 'info');
                return;
            }
            this.logger.log(`✅ Znaleziono ${issues.length} zadań.`);
            this.logger.showProgress(20, `Znaleziono ${issues.length} zadań`);

            // Create Test Cases
            const testCases = await this.createTestCases(issues, config);
            if (testCases.length === 0) {
                this.logger.showStatus('ℹ️ Wszystkie zadania mają już istniejące Test Case.', 'info');
                return;
            }

            // Create Test Plan
            const testPlan = await this.createTestPlan(testCases, config);

            // Create Test Executions
            await this.createTestExecutions(testPlan, testCases, config);

            this.logger.showProgress(100, 'Zakończono!');
            this.logger.showStatus(`🎉 Sukces! Sprawdź logi po szczegóły.`, 'success');

        } catch (error) {
            this.logger.showStatus(`❌ Błąd: ${error.message}`, 'error');
            this.logger.log(`Krytyczny błąd: ${error.message}`, 'error');
        } finally {
            $('#generateTests').disabled = false;
            $('#resetStepper').classList.remove('hidden');
        }
    }

    async createTestCases(issues, config) {
        this.logger.log('🔨 Tworzenie Test Cases...');
        const testCases = [];
        let createdCount = 0, skippedCount = 0;

        for (let i = 0; i < issues.length; i++) {
            const issue = issues[i];
            const progress = 20 + (i / issues.length) * 40;
            this.logger.showProgress(progress, `Tworzenie Test Case ${i + 1}/${issues.length}`);

            try {
                const testCase = await this.jiraService.createTestCase(issue, config);
                if (testCase) {
                    testCases.push(testCase);
                    createdCount++;
                    this.logger.log(`✅ Utworzono Test Case: ${testCase.key} dla ${issue.key}`, 'success');
                } else {
                    skippedCount++;
                    this.logger.log(`⏩ Pominięto ${issue.key} - Test Case już istnieje.`, 'warning');
                }
            } catch (error) {
                this.logger.log(`❌ Błąd tworzenia Test Case dla ${issue.key}: ${error.message}`, 'error');
            }
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
        }
        this.logger.log(`📊 Test Cases: ${createdCount} utworzonych, ${skippedCount} pominiętych.`);
        return testCases;
    }

    async createTestPlan(testCases, config) {
        this.logger.log('📋 Tworzenie Test Planu...');
        this.logger.showProgress(70, 'Tworzenie Test Planu...');
        let testPlan = await this.jiraService.checkExistingTestPlan(config);

        if (testPlan) {
            this.logger.log(`ℹ️ Znaleziono istniejący Test Plan: ${testPlan.key}.`, 'info');
        } else {
            testPlan = await this.jiraService.createTestPlan(testCases, config);
            this.logger.log(`✅ Utworzono nowy Test Plan: ${testPlan.key}`, 'success');
        }

        this.logger.log(`🔗 Łączenie ${testCases.length} Test Case'ów z Test Planem...`);
        const linkResult = await this.jiraService.linkTestCasesToIssue(testCases, testPlan.key);
        this.logger.log(`✅ Połączono ${linkResult.linked} Test Case'ów. Niepowodzenia: ${linkResult.failed}.`, linkResult.failed > 0 ? 'warning' : 'success');
        this.logger.showProgress(85, 'Test Plan gotowy');
        return testPlan;
    }

    async createTestExecutions(testPlan, testCases, config) {
        this.logger.log('🎯 Tworzenie Test Executions...');
        this.logger.showProgress(90, 'Tworzenie Test Executions...');
        const { executions, createdCount } = await this.jiraService.ensureTestExecutions(testPlan, config);

        if (createdCount > 0) {
            this.logger.log(`✅ Utworzono ${createdCount} nowych Test Executions.`, 'success');
        } else {
            this.logger.log(`ℹ️ Wykorzystano istniejące Test Executions.`, 'info');
        }

        for (const execution of executions) {
            this.logger.log(`🔗 Łączenie Test Case'ów z Test Execution ${execution.key}...`);
            const linkResult = await this.jiraService.linkTestCasesToIssue(testCases, execution.key);
            this.logger.log(`✅ Połączono ${linkResult.linked}. Niepowodzenia: ${linkResult.failed}.`, linkResult.failed > 0 ? 'warning' : 'success');
        }
    }

    reset() {
        this.stepper.reset();
        this.logger.reset();
        $('#resetStepper').classList.add('hidden');
        $('#generateTests').disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});