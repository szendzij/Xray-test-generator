// Xray Test Generator - SidePanel Script
// Refactored to use modular architecture with dependency injection
class XrayTestGenerator {
    constructor() {
        // Initialize services
        this.errorHandler = new ErrorHandler();
        this.validationService = new ValidationService();
        this.configManager = new ConfigManager();
        this.uiManager = new UIManager();
        this.stepperController = new StepperController(this.validationService, this.uiManager);
        this.eventListenerManager = new EventListenerManager(this);

        // State
        this.jiraService = null;
        this.jqlMode = CONSTANTS.JQL_MODE.AUTO;
        this.currentTheme = CONSTANTS.THEME.LIGHT;

        // Initialize
        this.initializeTheme();
        this.eventListenerManager.initializeEventListeners();
        this.loadSavedConfig();
    }

    handleSidePanelOpen() {
        logger.info('Side panel opened');
        this.loadSavedConfig();
    }

    initializeTheme() {
        const savedTheme = localStorage.getItem(CONSTANTS.STORAGE.THEME_KEY) || CONSTANTS.THEME.LIGHT;
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === CONSTANTS.THEME.LIGHT ? CONSTANTS.THEME.DARK : CONSTANTS.THEME.LIGHT;
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);

        const themeIcon = DOMHelper.getElement('themeIcon');
        if (themeIcon) {
            themeIcon.textContent = theme === CONSTANTS.THEME.LIGHT ? '🌞' : '🌙';
        }

        localStorage.setItem(CONSTANTS.STORAGE.THEME_KEY, theme);
        logger.debug(`Theme switched to: ${theme}`);
    }

    switchJqlMode(mode) {
        if (this.jqlMode === mode) return;

        this.jqlMode = mode;

        // Update toggle buttons
        DOMHelper.getElements('.jql-toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeButton = DOMHelper.getElement(mode === CONSTANTS.JQL_MODE.AUTO ? 'autoJqlBtn' : 'customJqlBtn');
        if (activeButton) {
            activeButton.classList.add('active');
        }

        // Animate form transition
        const currentForm = document.querySelector('.form-mode.active');
        const targetForm = DOMHelper.getElement(mode === CONSTANTS.JQL_MODE.AUTO ? 'autoJqlForm' : 'customJqlForm');

        if (currentForm && targetForm && currentForm !== targetForm) {
            currentForm.classList.add('exiting');

            setTimeout(() => {
                currentForm.classList.remove('active', 'exiting');
                targetForm.classList.add('active');
                this.updateStepValidation();
                this.configManager.saveConfigDebounced(this.jqlMode);
            }, CONSTANTS.TIMEOUTS.UI_ANIMATION);
        }
    }

    async loadSavedConfig() {
        try {
            const config = await this.configManager.loadSavedConfig();

            // Load JQL mode
            if (config.jqlMode) {
                this.jqlMode = config.jqlMode;
                this.switchJqlMode(this.jqlMode);
            }

            // Update validation after loading
            setTimeout(() => this.updateStepValidation(), CONSTANTS.TIMEOUTS.CONFIG_SAVE_DELAY);
        } catch (error) {
            this.uiManager.log('Błąd podczas ładowania konfiguracji: ' + error.message, 'error');
        }
    }

    onConfigInputChange() {
        this.configManager.saveConfigDebounced(this.jqlMode);
        this.updateStepValidation();
    }

    getConfig() {
        return this.configManager.getConfig(this.jqlMode);
    }

    validateConfig() {
        const config = this.getConfig();
        return this.validationService.validateConfig(config);
    }

    updateStepValidation() {
        return this.stepperController.updateStepValidation(this.jqlMode);
    }

    goToStep(stepNumber) {
        return this.stepperController.goToStep(stepNumber, this.jqlMode, (isValid) => {
            if (!isValid && stepNumber > this.stepperController.getCurrentStep()) {
                this.stepperController.showStepStatus(
                    `Uzupełnij wszystkie wymagane pola w kroku ${this.stepperController.getCurrentStep()}`,
                    'error'
                );
            }
        });
    }

    resetStepper() {
        this.stepperController.resetStepper();
    }

    showStepStatus(message, type = 'info') {
        this.stepperController.showStepStatus(message, type);
    }

    hideAllStatuses() {
        this.uiManager.hideAllStatuses();
    }

    async checkConnection() {
        try {
            this.uiManager.hideAllStatuses();
            this.uiManager.hideProgress();
            this.showStepStatus('Sprawdzanie połączenia...', 'info');

            const config = this.validateConfig();
            const errorHandler = new ErrorHandler();
            this.jiraService = new JiraService(config, errorHandler);

            // Test connection by checking JQL query count
            const jql = this.buildJqlQuery(config);
            this.uiManager.log(`Sprawdzanie zapytania JQL: ${jql}`, 'info');

            const count = await this.jiraService.getJqlCount(jql);
            logger.debug('JQL count:', count);

            this.stepperController.setConnectionVerified(true);
            this.showStepStatus(`✅ Połączenie OK!`, 'success');
            this.uiManager.log(`Poświadczenia OK!`, 'success');

            // Enable next step button after successful connection
            DOMHelper.setDisabled('nextStep1', false);

        } catch (error) {
            const handledError = this.errorHandler.handleError(error, 'checkConnection');
            this.stepperController.setConnectionVerified(false);
            this.showStepStatus(`❌ Błąd połączenia: ${handledError.message}`, 'error');
            this.uiManager.log(`Błąd połączenia: ${handledError.message}`, 'error');
        }
    }

    async generateTests() {
        try {
            this.uiManager.hideAllStatuses();
            this.uiManager.hideProgress();
            this.uiManager.showLog();

            const config = this.validateConfig();
            const errorHandler = new ErrorHandler();
            this.jiraService = new JiraService(config, errorHandler);

            this.uiManager.log('🚀 Rozpoczynanie generowania testów Xray...', 'info');
            this.uiManager.showProgress(CONSTANTS.PROGRESS.INITIALIZATION, 'Inicjalizacja...');

            // Disable generate button during execution
            this.uiManager.setButtonDisabled('generateTests', true);

            // Step 1: Get issues from JQL
            const issues = await this.fetchIssuesFromJql(config);

            if (issues.length === 0) {
                this.showStepStatus('ℹ️ Brak zadań do przetworzenia', 'info');
                this.uiManager.showElement('resetStepper');
                this.uiManager.setButtonDisabled('generateTests', false);
                return;
            }

            // Step 2: Create Test Cases
            const { testCases, createdCount, skippedCount } = await this.createTestCases(issues, config);

            if (testCases.length === 0) {
                this.showStepStatus('ℹ️ Brak nowych Test Cases do utworzenia', 'info');
                this.uiManager.showElement('resetStepper');
                this.uiManager.setButtonDisabled('generateTests', false);
                return;
            }

            // Step 3: Create or get Test Plan
            const { testPlan, wasCreated } = await this.createOrGetTestPlan(testCases, config);

            // Step 4: Link Test Cases to Test Plan
            await this.linkTestCasesToPlan(testCases, testPlan);

            // Step 5: Create Test Executions
            const { testExecutions, createdExecutions } = await this.createTestExecutions(testPlan, config);

            // Step 6: Link Test Cases to Test Executions
            await this.linkTestCasesToExecutions(testCases, testExecutions);

            // Final summary
            this.showCompletionSummary(testPlan, createdCount, wasCreated, testExecutions, createdExecutions);
            this.uiManager.showElement('resetStepper');

        } catch (error) {
            const handledError = this.errorHandler.handleError(error, 'generateTests');
            this.showStepStatus(`❌ Błąd: ${handledError.message}`, 'error');
            this.uiManager.log(`Błąd: ${handledError.message}`, 'error');
            this.uiManager.showElement('resetStepper');
        } finally {
            this.uiManager.setButtonDisabled('generateTests', false);
        }
    }

    async fetchIssuesFromJql(config) {
        this.uiManager.log('📋 Krok 1: Pobieranie zadań z JQL...', 'info');
        this.uiManager.showProgress(CONSTANTS.PROGRESS.FETCH_ISSUES_START, 'Pobieranie zadań...');

        const jql = this.buildJqlQuery(config);
        this.uiManager.log(`Wykonywanie zapytania: ${jql}`, 'info');

        const issues = await this.jiraService.getIssuesByJql(jql);

        this.uiManager.log(`✅ Znaleziono ${issues.length} zadań`, 'success');
        this.uiManager.showProgress(CONSTANTS.PROGRESS.FETCH_ISSUES_COMPLETE, `Znaleziono ${issues.length} zadań`);

        return issues;
    }

    async createTestCases(issues, config) {
        this.uiManager.log('🔨 Krok 2: Tworzenie Test Cases...', 'info');
        const testCases = [];
        let createdCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < issues.length; i++) {
            const issue = issues[i];
            const progress = CONSTANTS.PROGRESS.CREATE_TEST_CASES_START +
                (i / issues.length) * (CONSTANTS.PROGRESS.CREATE_TEST_CASES_COMPLETE - CONSTANTS.PROGRESS.CREATE_TEST_CASES_START);
            this.uiManager.showProgress(progress, `Tworzenie Test Case ${i + 1}/${issues.length}`);

            try {
                const testCase = await this.jiraService.createTestCase(issue, config);
                if (testCase) {
                    testCases.push(testCase);
                    createdCount++;
                    this.uiManager.log(`✅ Utworzono Test Case: ${testCase.key} dla zadania ${issue.key}`, 'success');
                } else {
                    skippedCount++;
                    this.uiManager.log(`⏩ Pominięto zadanie ${issue.key} - Test Case już istnieje`, 'warning');
                }
            } catch (error) {
                this.uiManager.log(`❌ Błąd tworzenia Test Case dla ${issue.key}: ${error.message}`, 'error');
            }

            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, CONSTANTS.TIMEOUTS.API_DELAY));
        }

        this.uiManager.log(`📊 Test Cases: ${createdCount} utworzonych, ${skippedCount} pominiętych`, 'info');
        this.uiManager.showProgress(CONSTANTS.PROGRESS.CREATE_TEST_CASES_COMPLETE, `${createdCount} Test Cases utworzonych`);

        return { testCases, createdCount, skippedCount };
    }

    async createOrGetTestPlan(testCases, config) {
        this.uiManager.log('📋 Krok 3: Tworzenie Test Plan...', 'info');
        this.uiManager.showProgress(CONSTANTS.PROGRESS.CREATE_TEST_PLAN_START, 'Tworzenie Test Plan...');

        // Check if test plan exists to determine wasCreated flag
        // Note: createTestPlan() also checks internally to prevent duplicates
        const existingTestPlan = await this.jiraService.checkExistingTestPlan(config);
        const wasCreated = !existingTestPlan;

        // createTestPlan() will return existing if found, or create new if not
        const testPlan = await this.jiraService.createTestPlan(testCases, config);

        if (wasCreated) {
            this.uiManager.log(`✅ Utworzono Test Plan: ${testPlan.key}`, 'success');
            this.jiraService.lastTestPlanCreated = true;
        } else {
            this.uiManager.log(`ℹ️ Test Plan ${testPlan.key} już istnieje - pomijam tworzenie`, 'info');
            this.jiraService.lastTestPlanCreated = false;
        }

        this.uiManager.showProgress(CONSTANTS.PROGRESS.CREATE_TEST_PLAN_COMPLETE, 'Test Plan utworzony');

        return { testPlan, wasCreated };
    }

    async linkTestCasesToPlan(testCases, testPlan) {
        if (testCases.length === 0) {
            this.uiManager.log('ℹ️ Brak nowych Test Cases do powiązania z Test Plan', 'info');
            return;
        }

        this.uiManager.log('🔗 Powiązywanie Test Cases z Test Plan...', 'info');
        const linkResult = await this.jiraService.linkTestCasesToIssue(testCases, testPlan.key);

        if (linkResult.failed > 0) {
            this.uiManager.log(
                `⚠️ Powiązano ${linkResult.linked} Test Cases z Test Plan ${testPlan.key}. Niepowodzenia: ${linkResult.failed}`,
                'warning'
            );
        } else {
            this.uiManager.log(`✅ Powiązano ${linkResult.linked} Test Cases z Test Plan ${testPlan.key}`, 'success');
        }

        this.uiManager.showProgress(CONSTANTS.PROGRESS.LINK_TEST_CASES, `Powiązano ${linkResult.linked} testów`);
    }

    async createTestExecutions(testPlan, config) {
        this.uiManager.log('🎯 Krok 4: Tworzenie Test Executions...', 'info');
        this.uiManager.showProgress(CONSTANTS.PROGRESS.CREATE_TEST_EXECUTIONS_START, 'Tworzenie Test Executions...');

        const { executions: testExecutions, createdCount: createdExecutions, skippedExecutions } =
            await this.jiraService.ensureTestExecutions(testPlan, config);

        for (const exec of testExecutions) {
            if (exec._wasExisting) {
                this.uiManager.log(`ℹ️ Test Execution ${exec.key} już istnieje - pomijam tworzenie`, 'info');
            } else {
                this.uiManager.log(`✅ Utworzono Test Execution: ${exec.key}`, 'success');
            }
        }

        if (createdExecutions === 0) {
            this.uiManager.log(`ℹ️ Wszystkie Test Executions już istniały (${testExecutions.length} łącznie)`, 'info');
        }

        return { testExecutions, createdExecutions };
    }

    async linkTestCasesToExecutions(testCases, testExecutions) {
        if (testCases.length === 0 || testExecutions.length === 0) {
            return;
        }

        for (const execution of testExecutions) {
            this.uiManager.log(`🔗 Powiązywanie Test Cases z Test Execution ${execution.key}...`, 'info');
            const linkResult = await this.jiraService.linkTestCasesToIssue(testCases, execution.key);

            if (linkResult.failed > 0) {
                this.uiManager.log(
                    `⚠️ Powiązano ${linkResult.linked} Test Cases z Test Execution ${execution.key}. Niepowodzenia: ${linkResult.failed}`,
                    'warning'
                );
            } else {
                this.uiManager.log(`✅ Powiązano ${linkResult.linked} Test Cases z Test Execution ${execution.key}`, 'success');
            }
        }
    }

    showCompletionSummary(testPlan, createdCount, wasCreated, testExecutions, createdExecutions) {
        this.uiManager.showProgress(CONSTANTS.PROGRESS.COMPLETE, 'Zakończono!');

        const planSummary = wasCreated ? 'utworzono nowy Test Plan' : 'wykorzystano istniejący Test Plan';
        const executionSummary = createdExecutions > 0
            ? `${createdExecutions} nowych Test Executions (${testExecutions.length} łącznie)`
            : `${testExecutions.length} istniejących Test Executions`;

        this.showStepStatus(
            `🎉 Sukces! Utworzono ${createdCount} Test Cases, ${planSummary} (${testPlan.key}) i ${executionSummary}`,
            'success'
        );
    }

    buildJqlQuery(config) {
        if (config.jqlMode === CONSTANTS.JQL_MODE.CUSTOM) {
            return config.customJql;
        } else {
            return `project = ${config.projectKey} AND fixVersion = '${config.fixVersion}' AND development[pullrequests].all > 0 and development[pullrequests].open = 0`;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new XrayTestGenerator();
});
