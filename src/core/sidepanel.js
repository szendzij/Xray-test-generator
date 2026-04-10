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
        this.jqlMode = CONSTANTS.JQL_MODE.CUSTOM;

        // Initialize
        this.eventListenerManager.initializeEventListeners();
        i18n.init();
        this.loadSavedConfig();
    }

    handleSidePanelOpen() {
        logger.info('Side panel opened');
        this.loadSavedConfig();
    }

    async loadSavedConfig() {
        try {
            const config = await this.configManager.loadSavedConfig();

            // Update validation after loading
            setTimeout(() => {
                this.updateStepValidation();
            }, CONSTANTS.TIMEOUTS.CONFIG_SAVE_DELAY);
        } catch (error) {
            this.uiManager.log(i18n.t('msg.loadConfigError') + ' ' + error.message, 'error');
        }
    }

    onConfigInputChange() {
        this.configManager.saveConfigDebounced();
        this.updateStepValidation();
    }

    getConfig() {
        return this.configManager.getConfig();
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
                    i18n.t('msg.fillRequiredFields', { step: this.stepperController.getCurrentStep() }),
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
            this.showStepStatus(i18n.t('msg.checkingConnection'), 'info');

            const config = this.validateConfig();
            const errorHandler = new ErrorHandler();
            this.jiraService = new JiraService(config, errorHandler);

            // Test connection by checking JQL query count
            const jql = this.buildJqlQuery(config);
            this.uiManager.log(i18n.t('msg.checkingJql', { jql }), 'info');

            const count = await this.jiraService.getJqlCount(jql);
            logger.debug('JQL count:', count);

            this.stepperController.setConnectionVerified(true);
            this.showStepStatus(i18n.t('msg.connectionOk'), 'success');
            this.uiManager.log(i18n.t('msg.credentialsOk'), 'success');

            // v2: update connection dot and label in header
            const dot = document.getElementById('connectionDot');
            if (dot) { dot.className = 'connection-dot connected'; }
            try {
                const hostname = new URL(config.jiraUrl).hostname;
                DOMHelper.setText('connectionLabel', hostname);
            } catch (e) {
                DOMHelper.setText('connectionLabel', i18n.t('msg.connected'));
            }
            // v2: update credentials card badge
            DOMHelper.setText('credentialsBadge', i18n.t('msg.credentialsVerified'));
            const credBadge = document.getElementById('credentialsBadge');
            if (credBadge) credBadge.className = 'card-badge verified';

            // v2: update issue count badge with connection count
            DOMHelper.setText('issueCountBadge', i18n.t('msg.issueCount', { count }));
            DOMHelper.setText('generateMeta', i18n.t('msg.issueCount', { count }));

        } catch (error) {
            const handledError = this.errorHandler.handleError(error, 'checkConnection');
            this.stepperController.setConnectionVerified(false);
            this.showStepStatus(i18n.t('msg.connectionError', { message: handledError.message }), 'error');
            this.uiManager.log(i18n.t('msg.connectionError', { message: handledError.message }), 'error');

            // v2: update connection dot to error state
            const dot = document.getElementById('connectionDot');
            if (dot) { dot.className = 'connection-dot conn-error'; }
            DOMHelper.setText('connectionLabel', i18n.t('msg.connectionFailed'));
            DOMHelper.setText('credentialsBadge', i18n.t('msg.credentialsFailed'));
            const credBadge = document.getElementById('credentialsBadge');
            if (credBadge) credBadge.className = 'card-badge failed';
        }
    }

    // v2: Preview issue count without running full generation
    async previewIssues() {
        try {
            this.uiManager.showStatus('parametersStatus', i18n.t('msg.fetchingCount'), 'info');
            DOMHelper.setText('issueCountBadge', '...');

            const config = this.configManager.getConfig();
            if (!config.jiraUrl || !config.jiraEmail || !config.jiraApiKey) {
                this.uiManager.showStatus('parametersStatus', i18n.t('msg.fillCredentials'), 'warning');
                DOMHelper.setText('issueCountBadge', '—');
                return;
            }

            const errorHandler = new ErrorHandler();
            const tempService = new JiraService(config, errorHandler);
            const jql = this.buildJqlQuery(config);
            const count = await tempService.getJqlCount(jql);

            DOMHelper.setText('issueCountBadge', i18n.t('msg.issueCount', { count }));
            DOMHelper.setText('generateMeta', i18n.t('msg.issueCount', { count }));
            this.uiManager.showStatus('parametersStatus', i18n.t('msg.queryWillReturn', { count }), 'success');

        } catch (error) {
            const handledError = this.errorHandler.handleError(error, 'previewIssues');
            this.uiManager.showStatus('parametersStatus', i18n.t('msg.errorPrefix', { message: handledError.message }), 'error');
            DOMHelper.setText('issueCountBadge', '—');
        }
    }

    // v2: helper to update the stage indicator and execution badge
    setStage(text) {
        DOMHelper.showElement('stageIndicator');
        DOMHelper.setText('stageIndicator', text);
        DOMHelper.setText('executionBadge', 'Running...');
    }

    async generateTests() {
        try {
            this.uiManager.hideAllStatuses();
            this.uiManager.hideProgress();
            this.uiManager.showLog();

            // v2: show execution card before starting
            DOMHelper.showElement('executionCard');
            DOMHelper.hideElement('resultsSummary');
            this.setStage(i18n.t('msg.stage1Init'));
            const execCard = document.getElementById('executionCard');
            if (execCard) execCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            const config = this.validateConfig();
            const errorHandler = new ErrorHandler();
            this.jiraService = new JiraService(config, errorHandler);

            this.xrayApiClient = null;
            if (config.xrayClientId && config.xrayClientSecret) {
                this.xrayApiClient = new XrayApiClient(config.xrayClientId, config.xrayClientSecret);
                if (config.useAiSteps) {
                    this.jiraService.apiClient.setXrayClient(this.xrayApiClient);
                }
            }

            this.uiManager.log(i18n.t('msg.starting'), 'info');
            this.uiManager.showProgress(CONSTANTS.PROGRESS.INITIALIZATION, i18n.t('msg.stage1Init'));

            // Disable generate button during execution
            this.uiManager.setButtonDisabled('generateTests', true);

            // Step 1: Get issues from JQL
            const issues = await this.fetchIssuesFromJql(config);

            if (issues.length === 0) {
                this.showStepStatus(i18n.t('msg.noTasks'), 'info');
                this.uiManager.showElement('resetStepper');
                this.uiManager.setButtonDisabled('generateTests', false);
                return;
            }

            // Step 2: Create Test Cases
            const { testCases, createdCount, skippedCount, issueMap } = await this.createTestCases(issues, config);

            if (testCases.length === 0) {
                this.showStepStatus(i18n.t('msg.noNewTestCases'), 'info');
                this.uiManager.showElement('resetStepper');
                this.uiManager.setButtonDisabled('generateTests', false);
                return;
            }

            // Step 2.5: Generate AI test steps (optional)
            if (config.useAiSteps && config.geminiApiKey) {
                await this.generateAiTestSteps(testCases, issueMap, config);
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
            this.showStepStatus(i18n.t('msg.generalErrorStatus', { message: handledError.message }), 'error');
            this.uiManager.log(i18n.t('msg.generalError', { message: handledError.message }), 'error');
            this.uiManager.showElement('resetStepper');
        } finally {
            this.uiManager.setButtonDisabled('generateTests', false);
        }
    }

    async fetchIssuesFromJql(config) {
        this.setStage(i18n.t('msg.stage1Fetch'));
        this.uiManager.log(i18n.t('msg.step1'), 'info');
        this.uiManager.showProgress(CONSTANTS.PROGRESS.FETCH_ISSUES_START, i18n.t('msg.fetchingTasks'));

        const jql = this.buildJqlQuery(config);
        this.uiManager.log(i18n.t('msg.executingQuery', { jql }), 'info');

        const issues = await this.jiraService.getIssuesByJql(jql);

        this.uiManager.log(i18n.t('msg.foundTasks', { count: issues.length }), 'success');
        this.uiManager.showProgress(CONSTANTS.PROGRESS.FETCH_ISSUES_COMPLETE, i18n.t('msg.foundTasks', { count: issues.length }));

        return issues;
    }

    async createTestCases(issues, config) {
        this.setStage(i18n.t('msg.stage2', { count: issues.length }));
        this.uiManager.log(i18n.t('msg.step2'), 'info');
        const testCases = [];
        const issueMap = new Map(); // testCase.key → source issue
        let createdCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < issues.length; i++) {
            const issue = issues[i];
            const progress = CONSTANTS.PROGRESS.CREATE_TEST_CASES_START +
                (i / issues.length) * (CONSTANTS.PROGRESS.CREATE_TEST_CASES_COMPLETE - CONSTANTS.PROGRESS.CREATE_TEST_CASES_START);
            this.uiManager.showProgress(progress, i18n.t('msg.creatingTestCase', { current: i + 1, total: issues.length }));

            try {
                const testCase = await this.jiraService.createTestCase(issue, config);
                if (testCase) {
                    testCases.push(testCase);
                    issueMap.set(testCase.key, issue);
                    createdCount++;
                    this.uiManager.log(i18n.t('msg.testCaseCreated', { key: testCase.key, issueKey: issue.key }), 'success');

                    // Link test to original issue as Test Coverage
                    if (this.xrayApiClient) {
                        try {
                            await this.xrayApiClient.addTestRequirement(testCase.key, issue.key);
                            this.uiManager.log(`Linked ${testCase.key} → ${issue.key} as Test Coverage (Xray)`, 'success');
                        } catch (err) {
                            logger.warn(`Xray addTestRequirement failed for ${testCase.key}: ${err.message}`);
                            try {
                                await this.jiraService.apiClient.linkIssues(testCase.key, issue.key, CONSTANTS.LINK_TYPES.TESTS);
                            } catch (fallbackErr) {
                                logger.warn(`Jira fallback linkIssues failed for ${testCase.key}: ${fallbackErr.message}`);
                            }
                        }
                    } else {
                        try {
                            await this.jiraService.apiClient.linkIssues(testCase.key, issue.key, CONSTANTS.LINK_TYPES.TESTS);
                        } catch (fallbackErr) {
                            logger.warn(`Jira fallback linkIssues failed for ${testCase.key}: ${fallbackErr.message}`);
                        }
                    }
                } else {
                    skippedCount++;
                    this.uiManager.log(i18n.t('msg.testCaseSkipped', { issueKey: issue.key }), 'warning');
                }
            } catch (error) {
                this.uiManager.log(i18n.t('msg.testCaseError', { issueKey: issue.key, message: error.message }), 'error');
            }

            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, CONSTANTS.TIMEOUTS.API_DELAY));
        }

        this.uiManager.log(i18n.t('msg.testCasesSummary', { created: createdCount, skipped: skippedCount }), 'info');
        this.uiManager.showProgress(CONSTANTS.PROGRESS.CREATE_TEST_CASES_COMPLETE, i18n.t('msg.testCasesCreatedCount', { count: createdCount }));

        return { testCases, createdCount, skippedCount, issueMap };
    }

    async generateAiTestSteps(testCases, issueMap, config) {
        this.setStage(i18n.t('msg.stageAi', { count: testCases.length }));
        this.uiManager.log(i18n.t('msg.stepAi'), 'info');
        this.uiManager.showProgress(CONSTANTS.PROGRESS.AI_STEPS_START, i18n.t('msg.generatingAiSteps'));

        const llmClient = new LlmApiClient(config.geminiApiKey);
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            const sourceIssue = issueMap.get(testCase.key);
            if (!sourceIssue) continue;

            this.uiManager.showProgress(
                CONSTANTS.PROGRESS.AI_STEPS_START + (i / testCases.length) * (CONSTANTS.PROGRESS.AI_STEPS_COMPLETE - CONSTANTS.PROGRESS.AI_STEPS_START),
                i18n.t('msg.aiGenerating', { current: i + 1, total: testCases.length })
            );

            try {
                const description = this.jiraService.extractAdfText(sourceIssue.fields.description);
                const steps = await llmClient.generateTestSteps(sourceIssue.fields.summary, description);
                await this.jiraService.addTestStepsToTestCase(testCase, steps);
                successCount++;
                this.uiManager.log(i18n.t('msg.aiStepsAdded', { key: testCase.key, count: steps.length }), 'success');
            } catch (error) {
                failCount++;
                this.uiManager.log(i18n.t('msg.aiStepsError', { key: testCase.key, message: error.message }), 'warning');
            }

            await new Promise(resolve => setTimeout(resolve, CONSTANTS.TIMEOUTS.API_DELAY));
        }

        this.uiManager.log(i18n.t('msg.aiStepsSummary', { success: successCount, fail: failCount }), 'info');
        this.uiManager.showProgress(CONSTANTS.PROGRESS.AI_STEPS_COMPLETE, i18n.t('msg.aiStepsDone'));
    }

    async createOrGetTestPlan(testCases, config) {
        this.setStage(i18n.t('msg.stage3'));
        this.uiManager.log(i18n.t('msg.step3'), 'info');
        this.uiManager.showProgress(CONSTANTS.PROGRESS.CREATE_TEST_PLAN_START, i18n.t('msg.creatingTestPlan'));

        const existingTestPlan = await this.jiraService.checkExistingTestPlan(config);
        const wasCreated = !existingTestPlan;

        const testPlan = await this.jiraService.createTestPlan(testCases, config);

        if (wasCreated) {
            this.uiManager.log(i18n.t('msg.testPlanCreated', { key: testPlan.key }), 'success');
            this.jiraService.lastTestPlanCreated = true;
        } else {
            this.uiManager.log(i18n.t('msg.testPlanExists', { key: testPlan.key }), 'info');
            this.jiraService.lastTestPlanCreated = false;
        }

        this.uiManager.showProgress(CONSTANTS.PROGRESS.CREATE_TEST_PLAN_COMPLETE, i18n.t('msg.testPlanDone'));

        return { testPlan, wasCreated };
    }

    logLinkResult(linkResult, targetKey) {
        if (linkResult.failed > 0) {
            this.uiManager.log(i18n.t('msg.linkedWithFailures', { linked: linkResult.linked, key: targetKey, failed: linkResult.failed }), 'warning');
        } else {
            this.uiManager.log(i18n.t('msg.linkedOk', { linked: linkResult.linked, key: targetKey }), 'success');
        }
    }

    async linkTestCasesToPlan(testCases, testPlan) {
        if (testCases.length === 0) {
            this.uiManager.log(i18n.t('msg.noNewCasesToLink'), 'info');
            return;
        }

        this.setStage(i18n.t('msg.stage4', { count: testCases.length }));
        this.uiManager.log(i18n.t('msg.step4'), 'info');

        if (this.xrayApiClient) {
            try {
                const keys = testCases.map(tc => tc.key);
                await this.xrayApiClient.addTestsToTestPlan(testPlan.key, keys);
                this.uiManager.log(`Linked ${keys.length} test(s) to Test Plan ${testPlan.key} via Xray`, 'success');
                this.uiManager.showProgress(CONSTANTS.PROGRESS.LINK_TEST_CASES, i18n.t('msg.linkedCount', { count: keys.length }));
                return;
            } catch (err) {
                logger.warn(`Xray addTestsToTestPlan failed: ${err.message}`);
            }
        }

        // Jira fallback
        const linkResult = await this.jiraService.linkTestCasesToIssue(testCases, testPlan.key);
        this.logLinkResult(linkResult, `Test Plan ${testPlan.key}`);
        this.uiManager.showProgress(CONSTANTS.PROGRESS.LINK_TEST_CASES, i18n.t('msg.linkedCount', { count: linkResult.linked }));
    }

    async createTestExecutions(testPlan, config) {
        this.setStage(i18n.t('msg.stage5'));
        this.uiManager.log(i18n.t('msg.step5'), 'info');
        this.uiManager.showProgress(CONSTANTS.PROGRESS.CREATE_TEST_EXECUTIONS_START, i18n.t('msg.creatingExecs'));

        const { executions: testExecutions, createdCount: createdExecutions, skippedExecutions } =
            await this.jiraService.ensureTestExecutions(testPlan, config);

        for (const exec of testExecutions) {
            if (exec._wasExisting) {
                this.uiManager.log(i18n.t('msg.execExists', { key: exec.key }), 'info');
            } else {
                this.uiManager.log(i18n.t('msg.execCreated', { key: exec.key }), 'success');
            }
        }

        if (createdExecutions === 0) {
            this.uiManager.log(i18n.t('msg.allExecsExisted', { count: testExecutions.length }), 'info');
        }

        return { testExecutions, createdExecutions };
    }

    async linkTestCasesToExecutions(testCases, testExecutions) {
        if (testCases.length === 0 || testExecutions.length === 0) {
            return;
        }

        this.setStage(i18n.t('msg.stage6'));
        for (const execution of testExecutions) {
            this.uiManager.log(i18n.t('msg.linkingToExec', { key: execution.key }), 'info');
            const linkResult = await this.jiraService.linkTestCasesToIssue(testCases, execution.key);
            this.logLinkResult(linkResult, `Test Execution ${execution.key}`);

            // Register tests in Xray execution (creates actual test runs on Xray board)
            if (this.xrayApiClient) {
                try {
                    const keys = testCases.map(tc => tc.key);
                    await this.xrayApiClient.addTestsToExecution(execution.key, keys);
                    this.uiManager.log(`Registered ${keys.length} test(s) in Xray execution ${execution.key}`, 'success');
                } catch (err) {
                    logger.warn(`Xray execution registration failed for ${execution.key}: ${err.message}`);
                }
            }
        }
    }

    showCompletionSummary(testPlan, createdCount, wasCreated, testExecutions, createdExecutions) {
        this.uiManager.showProgress(CONSTANTS.PROGRESS.COMPLETE, i18n.t('msg.done'));

        const planSummary = wasCreated ? i18n.t('msg.planCreatedNew') : i18n.t('msg.planUsedExisting');
        const executionSummary = createdExecutions > 0
            ? i18n.t('msg.execsNewCount', { created: createdExecutions, total: testExecutions.length })
            : i18n.t('msg.execsExistingCount', { total: testExecutions.length });

        this.showStepStatus(
            i18n.t('msg.success', { createdCount, planSummary, planKey: testPlan.key, executionSummary }),
            'success'
        );

        // v2: update stage indicator and execution badge
        DOMHelper.setText('stageIndicator', i18n.t('msg.completed', { count: createdCount }));
        DOMHelper.setText('executionBadge', i18n.t('msg.completedBadge'));
        const execBadge = document.getElementById('executionBadge');
        if (execBadge) execBadge.className = 'card-badge verified';

        // v2: show results summary grid
        const totalLinks = createdCount * testExecutions.length;
        DOMHelper.setText('statTests', String(createdCount));
        DOMHelper.setText('statPlans', wasCreated ? '1' : '0');
        DOMHelper.setText('statExecs', String(createdExecutions));
        DOMHelper.setText('statLinks', String(totalLinks));
        DOMHelper.showElement('resultsSummary');
    }

    buildJqlQuery(config) {
        return config.jqlMode === CONSTANTS.JQL_MODE.CUSTOM
            ? config.customJql
            : `project = ${config.projectKey} AND fixVersion = '${config.fixVersion}' AND development[pullrequests].all > 0 and development[pullrequests].open = 0`;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new XrayTestGenerator();
});
