// Xray Test Generator - Popup Script
class XrayTestGenerator {
    constructor() {
        this.jiraService = null;
        this.currentStep = 1;
        this.connectionVerified = false;
        this.jqlMode = 'auto'; // 'auto' or 'custom'
        this.initializeEventListeners();
        this.loadSavedConfig();
    }

    initializeEventListeners() {
        // Original functionality
        document.getElementById('checkConnection').addEventListener('click', () => this.checkConnection());
        document.getElementById('generateTests').addEventListener('click', () => this.generateTests());

        // Stepper navigation
        document.getElementById('nextStep1').addEventListener('click', () => this.goToStep(2));
        document.getElementById('prevStep2').addEventListener('click', () => this.goToStep(1));
        document.getElementById('nextStep2').addEventListener('click', () => this.goToStep(3));
        document.getElementById('prevStep3').addEventListener('click', () => this.goToStep(2));
        document.getElementById('resetStepper').addEventListener('click', () => this.resetStepper());

        // JQL Mode Toggle
        document.getElementById('autoJqlBtn').addEventListener('click', () => this.switchJqlMode('auto'));
        document.getElementById('customJqlBtn').addEventListener('click', () => this.switchJqlMode('custom'));

        // Step clicking
        document.querySelectorAll('.step').forEach(step => {
            step.addEventListener('click', () => {
                const stepNumber = parseInt(step.dataset.step);
                this.goToStep(stepNumber);
            });
        });

        // Save config on input change
        ['jiraUrl', 'jiraEmail', 'jiraApiKey', 'fixVersion', 'projectKey', 'componentName',
            'customJql', 'customProjectKey', 'customComponentName'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('input', () => {
                        this.saveConfig();
                        this.validateCurrentStep();
                    });
                }
            });

        // Real-time validation
        this.setupValidation();
    }

    switchJqlMode(mode) {
        if (this.jqlMode === mode) return;

        this.jqlMode = mode;

        // Update toggle buttons
        document.querySelectorAll('.jql-toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(mode === 'auto' ? 'autoJqlBtn' : 'customJqlBtn').classList.add('active');

        // Animate form transition
        const currentForm = document.querySelector('.form-mode.active');
        const targetForm = document.getElementById(mode === 'auto' ? 'autoJqlForm' : 'customJqlForm');

        if (currentForm && targetForm && currentForm !== targetForm) {
            // Exit animation for current form
            currentForm.classList.add('exiting');

            setTimeout(() => {
                currentForm.classList.remove('active', 'exiting');
                targetForm.classList.add('active');
                this.validateCurrentStep();
                this.saveConfig();
            }, 200);
        }
    }

    setupValidation() {
        const validationRules = {
            jiraUrl: (value) => {
                if (!value) return 'URL jest wymagany';
                if (!value.startsWith('https://')) return 'URL musi zaczynać się od https://';
                return null;
            },
            jiraEmail: (value) => {
                if (!value) return 'Email jest wymagany';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Nieprawidłowy format email';
                return null;
            },
            jiraApiKey: (value) => {
                if (!value) return 'API Key jest wymagany';
                if (value.length < 10) return 'API Key jest za krótki';
                return null;
            },
            fixVersion: (value) => {
                if (!value) return 'Fix Version jest wymagana';
                return null;
            },
            projectKey: (value) => {
                if (!value) return 'Project Key jest wymagany';
                if (!/^[A-Z]+$/.test(value)) return 'Project Key może zawierać tylko wielkie litery';
                return null;
            },
            componentName: (value) => {
                if (!value) return 'Component Name jest wymagany';
                return null;
            },
            customJql: (value) => {
                if (!value) return 'JQL jest wymagane';
                if (value.length < 10) return 'JQL jest za krótkie';
                if (!value.toLowerCase().includes('project')) return 'JQL powinno zawierać warunek "project"';
                return null;
            },
            customProjectKey: (value) => {
                if (!value) return 'Project Key jest wymagany';
                if (!/^[A-Z]+$/.test(value)) return 'Project Key może zawierać tylko wielkie litery';
                return null;
            },
            customComponentName: (value) => {
                if (!value) return 'Component Name jest wymagany';
                return null;
            }
        };

        Object.keys(validationRules).forEach(fieldId => {
            const input = document.getElementById(fieldId);
            const errorDiv = document.getElementById(`${fieldId}Error`);

            if (input && errorDiv) {
                input.addEventListener('blur', () => {
                    const error = validationRules[fieldId](input.value.trim());
                    if (error) {
                        errorDiv.textContent = error;
                        errorDiv.classList.remove('hidden');
                        input.style.borderColor = '#f44336';
                    } else {
                        errorDiv.classList.add('hidden');
                        input.style.borderColor = '';
                    }
                    this.updateStepValidation();
                });
            }
        });
    }

    validateCurrentStep() {
        return this.updateStepValidation();
    }

    updateStepValidation() {
        let isValid = true;

        if (this.currentStep === 1) {
            // Validate login data
            const fields = ['jiraUrl', 'jiraEmail', 'jiraApiKey'];
            isValid = this.validateFields(fields);
            document.getElementById('nextStep1').disabled = !isValid;
        } else if (this.currentStep === 2) {
            // Validate parameters based on JQL mode
            let fields;
            if (this.jqlMode === 'auto') {
                fields = ['fixVersion', 'projectKey', 'componentName'];
            } else {
                fields = ['customJql', 'customProjectKey', 'customComponentName'];
            }
            isValid = this.validateFields(fields);
            document.getElementById('nextStep2').disabled = !isValid;
        }

        return isValid;
    }

    validateFields(fields) {
        return fields.every(fieldId => {
            const element = document.getElementById(fieldId);
            const errorDiv = document.getElementById(`${fieldId}Error`);
            if (!element || !errorDiv) return true; // Skip if element doesn't exist

            const value = element.value.trim();
            return value && errorDiv.classList.contains('hidden');
        });
    }

    goToStep(stepNumber) {
        if (stepNumber < 1 || stepNumber > 3) return;

        // Validate current step before proceeding
        if (stepNumber > this.currentStep && !this.validateCurrentStep()) {
            this.showStepStatus(`Uzupełnij wszystkie wymagane pola w kroku ${this.currentStep}`, 'error');
            return;
        }

        // Update step classes
        document.querySelectorAll('.step').forEach(step => {
            const num = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');

            if (num === stepNumber) {
                step.classList.add('active');
            } else if (num < stepNumber) {
                step.classList.add('completed');
            }
        });

        // Update panel visibility
        document.querySelectorAll('.step-panel').forEach(panel => {
            panel.classList.remove('active');
        });

        document.querySelector(`[data-panel="${stepNumber}"]`).classList.add('active');

        this.currentStep = stepNumber;
        this.hideAllStatuses();
        this.updateStepValidation();
    }

    resetStepper() {
        this.currentStep = 1;
        this.connectionVerified = false;
        this.goToStep(1);
        this.hideAllStatuses();
        document.getElementById('resetStepper').classList.add('hidden');

        // Clear logs and progress
        document.getElementById('log').innerHTML = '';
        document.getElementById('log').classList.add('hidden');
        document.getElementById('progress').classList.add('hidden');
    }

    showStepStatus(message, type = 'info') {
        let statusId;
        if (this.currentStep === 1) statusId = 'connectionStatus';
        else if (this.currentStep === 2) statusId = 'parametersStatus';
        else statusId = 'status';

        const status = document.getElementById(statusId);
        status.textContent = message;
        status.className = `status ${type}`;
        status.classList.remove('hidden');
    }

    hideAllStatuses() {
        ['connectionStatus', 'parametersStatus', 'status'].forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
    }

    async loadSavedConfig() {
        try {
            const config = await chrome.storage.local.get([
                'jiraUrl', 'jiraEmail', 'jiraApiKey', 'fixVersion', 'projectKey', 'componentName',
                'customJql', 'customProjectKey', 'customComponentName', 'jqlMode'
            ]);

            if (config.jiraUrl) document.getElementById('jiraUrl').value = config.jiraUrl;
            if (config.jiraEmail) document.getElementById('jiraEmail').value = config.jiraEmail;
            if (config.jiraApiKey) document.getElementById('jiraApiKey').value = config.jiraApiKey;
            if (config.fixVersion) document.getElementById('fixVersion').value = config.fixVersion;
            if (config.projectKey) document.getElementById('projectKey').value = config.projectKey;
            if (config.componentName) document.getElementById('componentName').value = config.componentName;

            // Load custom JQL fields
            if (config.customJql) document.getElementById('customJql').value = config.customJql;
            if (config.customProjectKey) document.getElementById('customProjectKey').value = config.customProjectKey;
            if (config.customComponentName) document.getElementById('customComponentName').value = config.customComponentName;

            // Load JQL mode
            if (config.jqlMode) {
                this.jqlMode = config.jqlMode;
                this.switchJqlMode(this.jqlMode);
            }

            // Update validation after loading
            setTimeout(() => this.updateStepValidation(), 100);
        } catch (error) {
            this.log('Błąd podczas ładowania konfiguracji: ' + error.message, 'error');
        }
    }

    async saveConfig() {
        try {
            const config = {
                jiraUrl: document.getElementById('jiraUrl').value,
                jiraEmail: document.getElementById('jiraEmail').value,
                jiraApiKey: document.getElementById('jiraApiKey').value,
                fixVersion: document.getElementById('fixVersion').value,
                projectKey: document.getElementById('projectKey').value,
                componentName: document.getElementById('componentName').value,
                customJql: document.getElementById('customJql')?.value || '',
                customProjectKey: document.getElementById('customProjectKey')?.value || '',
                customComponentName: document.getElementById('customComponentName')?.value || '',
                jqlMode: this.jqlMode
            };

            await chrome.storage.local.set(config);
        } catch (error) {
            this.log('Błąd podczas zapisywania konfiguracji: ' + error.message, 'error');
        }
    }

    getConfig() {
        if (this.jqlMode === 'auto') {
            return {
                jiraUrl: document.getElementById('jiraUrl').value,
                jiraEmail: document.getElementById('jiraEmail').value,
                jiraApiKey: document.getElementById('jiraApiKey').value,
                fixVersion: document.getElementById('fixVersion').value,
                projectKey: document.getElementById('projectKey').value,
                componentName: document.getElementById('componentName').value,
                jqlMode: 'auto'
            };
        } else {
            return {
                jiraUrl: document.getElementById('jiraUrl').value,
                jiraEmail: document.getElementById('jiraEmail').value,
                jiraApiKey: document.getElementById('jiraApiKey').value,
                customJql: document.getElementById('customJql').value,
                projectKey: document.getElementById('customProjectKey').value,
                componentName: document.getElementById('customComponentName').value,
                jqlMode: 'custom'
            };
        }
    }

    validateConfig() {
        const config = this.getConfig();
        let required;

        if (config.jqlMode === 'auto') {
            required = ['jiraUrl', 'jiraEmail', 'jiraApiKey', 'fixVersion', 'projectKey', 'componentName'];
        } else {
            required = ['jiraUrl', 'jiraEmail', 'jiraApiKey', 'customJql', 'projectKey', 'componentName'];
        }

        for (const field of required) {
            if (!config[field] || config[field].trim() === '') {
                throw new Error(`Pole ${field} jest wymagane`);
            }
        }

        if (!config.jiraUrl.startsWith('https://')) {
            throw new Error('Jira URL musi zaczynać się od https://');
        }

        return config;
    }

    showStatus(message, type = 'info') {
        // Use step-specific status or fallback to main status
        this.showStepStatus(message, type);
    }

    hideStatus() {
        this.hideAllStatuses();
    }

    showProgress(percent, text = '') {
        const progress = document.getElementById('progress');
        const progressBar = document.getElementById('progressBar');

        progress.classList.remove('hidden');
        progressBar.style.width = `${percent}%`;
        progressBar.textContent = text || `${percent}%`;
    }

    hideProgress() {
        document.getElementById('progress').classList.add('hidden');
    }

    showLog() {
        document.getElementById('log').classList.remove('hidden');
    }

    log(message, type = 'info') {
        const log = document.getElementById('log');
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
        this.showLog();
    }

    async checkConnection() {
        try {
            this.hideAllStatuses();
            this.hideProgress();
            this.showStepStatus('Sprawdzanie połączenia...', 'info');

            const config = this.validateConfig();
            this.jiraService = new JiraService(config);

            // Test connection by checking JQL query count
            const jql = this.buildJqlQuery(config);
            this.log(`Sprawdzanie zapytania JQL: ${jql}`, 'info');

            const count = await this.jiraService.getJqlCount(jql);
            console.log(count);
            this.connectionVerified = true;
            this.showStepStatus(`✅ Połączenie OK!`, 'success');
            this.log(`Poświadczenia OK! `, 'success');

            // Enable next step button after successful connection
            document.getElementById('nextStep1').disabled = false;

        } catch (error) {
            this.connectionVerified = false;
            this.showStepStatus(`❌ Błąd połączenia: ${error.message}`, 'error');
            this.log(`Błąd połączenia: ${error.message}`, 'error');
        }
    }

    async generateTests() {
        try {
            this.hideAllStatuses();
            this.hideProgress();
            this.showLog();

            const config = this.validateConfig();
            this.jiraService = new JiraService(config);

            this.log('🚀 Rozpoczynanie generowania testów Xray...', 'info');
            this.showProgress(0, 'Inicjalizacja...');

            // Disable generate button during execution
            document.getElementById('generateTests').disabled = true;

            // Step 1: Get issues from JQL
            this.log('📋 Krok 1: Pobieranie zadań z JQL...', 'info');
            this.showProgress(10, 'Pobieranie zadań...');

            const jql = this.buildJqlQuery(config);
            this.log(`Wykonywanie zapytania: ${jql}`, 'info');
            const issues = await this.jiraService.getIssuesByJql(jql);

            this.log(`✅ Znaleziono ${issues.length} zadań`, 'success');
            this.showProgress(20, `Znaleziono ${issues.length} zadań`);

            if (issues.length === 0) {
                this.showStepStatus('ℹ️ Brak zadań do przetworzenia', 'info');
                document.getElementById('resetStepper').classList.remove('hidden');
                document.getElementById('generateTests').disabled = false;
                return;
            }

            // Step 2: Create Test Cases
            this.log('🔨 Krok 2: Tworzenie Test Cases...', 'info');
            const testCases = [];
            let createdCount = 0;
            let skippedCount = 0;

            for (let i = 0; i < issues.length; i++) {
                const issue = issues[i];
                const progress = 20 + (i / issues.length) * 40;
                this.showProgress(progress, `Tworzenie Test Case ${i + 1}/${issues.length}`);

                try {
                    const testCase = await this.jiraService.createTestCase(issue, config);
                    if (testCase) {
                        testCases.push(testCase);
                        createdCount++;
                        this.log(`✅ Utworzono Test Case: ${testCase.key} dla zadania ${issue.key}`, 'success');
                    } else {
                        skippedCount++;
                        this.log(`⏩ Pominięto zadanie ${issue.key} - Test Case już istnieje`, 'warning');
                    }
                } catch (error) {
                    this.log(`❌ Błąd tworzenia Test Case dla ${issue.key}: ${error.message}`, 'error');
                }

                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            this.log(`📊 Test Cases: ${createdCount} utworzonych, ${skippedCount} pominiętych`, 'info');
            this.showProgress(60, `${createdCount} Test Cases utworzonych`);

            if (testCases.length === 0) {
                this.showStepStatus('ℹ️ Brak nowych Test Cases do utworzenia', 'info');
                document.getElementById('resetStepper').classList.remove('hidden');
                document.getElementById('generateTests').disabled = false;
                return;
            }

            // Step 3: Create Test Plan
            this.log('📋 Krok 3: Tworzenie Test Plan...', 'info');
            this.showProgress(70, 'Tworzenie Test Plan...');

            const testPlan = await this.jiraService.createTestPlan(testCases, config);
            this.log(`✅ Utworzono Test Plan: ${testPlan.key}`, 'success');
            this.showProgress(80, 'Test Plan utworzony');

            // Step 4: Create Test Executions
            this.log('🎯 Krok 4: Tworzenie Test Executions...', 'info');
            this.showProgress(90, 'Tworzenie Test Executions...');

            const testExecutions = await this.jiraService.createTestExecutions(testPlan, config);
            this.log(`✅ Utworzono ${testExecutions.length} Test Executions`, 'success');

            this.showProgress(100, 'Zakończono!');
            this.showStepStatus(`🎉 Sukces! Utworzono ${createdCount} Test Cases, 1 Test Plan i ${testExecutions.length} Test Executions`, 'success');

            // Show reset button after completion
            document.getElementById('resetStepper').classList.remove('hidden');

        } catch (error) {
            this.showStepStatus(`❌ Błąd: ${error.message}`, 'error');
            this.log(`Błąd: ${error.message}`, 'error');
            document.getElementById('resetStepper').classList.remove('hidden');
        } finally {
            document.getElementById('generateTests').disabled = false;
        }
    }

    buildJqlQuery(config) {
        if (config.jqlMode === 'custom') {
            return config.customJql;
        } else {
            return `project = ${config.projectKey} AND fixVersion = "${config.fixVersion}" AND development[pullrequests].all > 0 and development[pullrequests].open = 0`;
        }
    }
}

// Jira Service Class
class JiraService {
    constructor(config) {
        this.config = config;
        this.baseUrl = config.jiraUrl.replace(/\/$/, '');
    }

    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}/rest/api/3${endpoint}`;
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Basic ${btoa(`${this.config.jiraEmail}:${this.config.jiraApiKey}`)}`
            }
        };

        const response = await fetch(url, { ...defaultOptions, ...options });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    }

    async getJqlCount(jql) {
        const data = await this.makeRequest('/search/jql', {
            method: 'POST',
            body: JSON.stringify({
                jql: jql,
                maxResults: 1
            })
        });
        return data.total;
    }

    async getIssuesByJql(jql, maxResults = 500) {
        const data = await this.makeRequest('/search/jql', {
            method: 'POST',
            body: JSON.stringify({
                jql: jql,
                maxResults: maxResults,
                fields: ['summary', 'issuetype', 'priority', 'description', 'assignee', 'reporter']
            })
        });
        return data.issues;
    }

    async checkExistingTestCase(issueKey) {
        try {
            const jql = `project = ${this.config.projectKey} AND issuetype = "Test" AND issue in linkedIssues(${issueKey})`;
            const data = await this.makeRequest('/search/jql', {
                method: 'POST',
                body: JSON.stringify({
                    jql: jql,
                    maxResults: 1
                })
            });

            return data.issues.length > 0 ? data.issues[0] : null;
        } catch (error) {
            console.warn(`Warning: Could not check existing test case for ${issueKey}:`, error);
            return null;
        }
    }

    async createTestCase(issue, config) {
        // Check if test case already exists
        const existingTestCase = await this.checkExistingTestCase(issue.key);
        if (existingTestCase) {
            return null; // Skip creation
        }

        const testCaseData = {
            fields: {
                project: { key: config.projectKey },
                summary: `${issue.key} | ${issue.fields.issuetype.name} | ${issue.fields.summary}`,
                description: {
                    type: "doc",
                    version: 1,
                    content: [
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: `Test case for issue ${config.jiraUrl}/browse/${issue.key}`
                                }
                            ]
                        },
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: issue.fields.description ?
                                        (typeof issue.fields.description === 'string' ?
                                            issue.fields.description :
                                            'Description available in original issue') :
                                        ''
                                }
                            ]
                        }
                    ]
                },
                issuetype: { name: 'Test' },
                priority: { name: issue.fields.priority.name },
                components: [{ name: config.componentName }],
                fixVersions: [{ name: 'FFFV' }]
            }
        };

        const response = await this.makeRequest('/issue', {
            method: 'POST',
            body: JSON.stringify(testCaseData)
        });

        // Link test case to original issue
        try {
            await this.makeRequest('/issueLink', {
                method: 'POST',
                body: JSON.stringify({
                    type: { name: 'Relates' },
                    inwardIssue: { key: response.key },
                    outwardIssue: { key: issue.key }
                })
            });
        } catch (linkError) {
            console.warn(`Warning: Could not link test case ${response.key} to issue ${issue.key}:`, linkError);
        }

        return response;
    }

    async createTestPlan(testCases, config) {
        const testPlanData = {
            fields: {
                project: { key: config.projectKey },
                summary: `Test Plan for Release ${config.fixVersion}`,
                description: {
                    type: "doc",
                    version: 1,
                    content: [
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: `Test plan for release ${config.fixVersion} created on ${new Date().toISOString().split('T')[0]}`
                                }
                            ]
                        },
                        {
                            type: "paragraph",
                            content: [
                                {
                                    type: "text",
                                    text: "JQL filter for all tests linked to this test plan:"
                                }
                            ]
                        }
                    ]
                },
                issuetype: { name: 'Test Plan' },
                components: [{ name: config.componentName }],
                fixVersions: [{ name: 'FFFV' }]
            }
        };

        const response = await this.makeRequest('/issue', {
            method: 'POST',
            body: JSON.stringify(testPlanData)
        });

        // Update description with correct test plan key
        const updatedDescription = {
            type: "doc",
            version: 1,
            content: [
                {
                    type: "paragraph",
                    content: [
                        {
                            type: "text",
                            text: `Test plan for release ${config.fixVersion} created on ${new Date().toISOString().split('T')[0]}`
                        }
                    ]
                },
                {
                    type: "paragraph",
                    content: [
                        {
                            type: "text",
                            text: "JQL filter for all tests linked to this test plan:"
                        }
                    ]
                },
                {
                    type: "paragraph",
                    content: [
                        {
                            type: "text",
                            text: `issue in linkedIssues("${response.key}") AND issueType = Test AND status != Closed`
                        }
                    ]
                }
            ]
        };

        await this.makeRequest(`/issue/${response.key}`, {
            method: 'PUT',
            body: JSON.stringify({
                fields: { description: updatedDescription }
            })
        });

        // Link test cases to test plan
        for (const testCase of testCases) {
            try {
                await this.makeRequest('/issueLink', {
                    method: 'POST',
                    body: JSON.stringify({
                        type: { name: 'Relates' },
                        inwardIssue: { key: testCase.key },
                        outwardIssue: { key: response.key }
                    })
                });
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (linkError) {
                console.warn(`Warning: Could not link test case ${testCase.key} to test plan ${response.key}:`, linkError);
            }
        }

        return response;
    }

    async createTestExecutions(testPlan, config) {
        const executions = [];
        const prefixes = ['[RC]', '[PROD]'];

        for (const prefix of prefixes) {
            const testExecutionData = {
                fields: {
                    project: { key: config.projectKey },
                    summary: `${prefix} Test execution for Release ${config.fixVersion}`,
                    description: {
                        type: "doc",
                        version: 1,
                        content: [
                            {
                                type: "paragraph",
                                content: [
                                    {
                                        type: "text",
                                        text: "JQL filter for all tests linked to this test plan:"
                                    }
                                ]
                            },
                            {
                                type: "paragraph",
                                content: [
                                    {
                                        type: "text",
                                        text: `issue in linkedIssues("${testPlan.key}") AND issueType = Test AND status != Closed`
                                    }
                                ]
                            }
                        ]
                    },
                    issuetype: { name: 'Test Execution' },
                    components: [{ name: config.componentName }],
                    fixVersions: [{ name: 'FFFV' }]
                }
            };

            const response = await this.makeRequest('/issue', {
                method: 'POST',
                body: JSON.stringify(testExecutionData)
            });

            // Link test execution to test plan
            try {
                await this.makeRequest('/issueLink', {
                    method: 'POST',
                    body: JSON.stringify({
                        type: { name: 'Relates' },
                        inwardIssue: { key: response.key },
                        outwardIssue: { key: testPlan.key }
                    })
                });
            } catch (linkError) {
                console.warn(`Warning: Could not link test execution ${response.key} to test plan ${testPlan.key}:`, linkError);
            }

            executions.push(response);
        }

        return executions;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new XrayTestGenerator();
});
