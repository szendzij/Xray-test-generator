// Xray Test Generator - SidePanel Script
class XrayTestGenerator {
    constructor() {
        this.jiraService = null;
        this.currentStep = 1;
        this.connectionVerified = false;
        this.jqlMode = 'auto'; // 'auto' or 'custom'
        this.currentTheme = 'light'; // 'light' or 'dark'
        this.initializeTheme();
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

        // Theme Toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // Step clicking
        document.querySelectorAll('.step').forEach(step => {
            step.addEventListener('click', () => {
                const stepNumber = parseInt(step.dataset.step);
                this.goToStep(stepNumber);
            });
        });

        // Save config on input change
        ['jiraUrl', 'jiraEmail', 'jiraApiKey', 'fixVersion', 'projectKey', 'componentName',
            'customJql', 'customProjectKey', 'customComponentName', 'customFixVersion'].forEach(id => {
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

        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'openSidePanel') {
                this.handleSidePanelOpen();
            }
        });
    }

    handleSidePanelOpen() {
        // Handle any initialization when side panel is opened
        console.log('Side panel opened');
        this.loadSavedConfig();
    }

    initializeTheme() {
        // Load saved theme preference or default to light
        const savedTheme = localStorage.getItem('xray-theme') || 'light';
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);

        // Update theme icon
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) {
            themeIcon.textContent = theme === 'light' ? '🌞' : '🌙';
        }

        // Save preference
        localStorage.setItem('xray-theme', theme);

        console.log(`Theme switched to: ${theme}`);
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
            },
            customFixVersion: (value) => {
                if (!value) return 'Fix Version jest wymagana';
                return null;
            }
        };

        this.validationRules = validationRules;

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
                input.addEventListener('input', () => {
                    const error = validationRules[fieldId](input.value.trim());
                    if (error) {
                        errorDiv.textContent = error;
                        errorDiv.classList.remove('hidden');
                        input.style.borderColor = '#f44336';
                    } else {
                        errorDiv.classList.add('hidden');
                        input.style.borderColor = '';
                    }
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
                fields = ['customJql', 'customProjectKey', 'customComponentName', 'customFixVersion'];
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
            const validator = this.validationRules?.[fieldId];
            const error = validator ? validator(value) : (value ? null : 'Pole jest wymagane');

            if (error) {
                errorDiv.textContent = error;
                errorDiv.classList.remove('hidden');
                element.style.borderColor = '#f44336';
                return false;
            }

            errorDiv.classList.add('hidden');
            element.style.borderColor = '';
            return true;
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
                'customJql', 'customProjectKey', 'customComponentName', 'customFixVersion', 'jqlMode'
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
            if (config.customFixVersion) document.getElementById('customFixVersion').value = config.customFixVersion;

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
                customFixVersion: document.getElementById('customFixVersion')?.value || '',
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
                fixVersion: document.getElementById('customFixVersion').value,
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
            required = ['jiraUrl', 'jiraEmail', 'jiraApiKey', 'customJql', 'fixVersion', 'projectKey', 'componentName'];
        }

        for (const field of required) {
            if (!config[field] || config[field].trim() === '') {
                throw new Error(`Pole ${field} jest wymagane`);
            }
        }

        if (!config.jiraUrl.startsWith('https://')) {
            throw new Error('Jira URL musi zaczynać się od https://');
        }

        // Validate Jira URL format
        try {
            new URL(config.jiraUrl);
        } catch (urlError) {
            throw new Error('Nieprawidłowy format URL Jira');
        }

        if (!config.jiraUrl.includes('atlassian.net') && !config.jiraUrl.includes('jira')) {
            console.warn('URL może nie być prawidłowym adresem Jira. Sprawdź czy to jest poprawny URL do instancji Jira.');
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
        const progressText = document.getElementById('progressText');

        progress.classList.remove('hidden');
        progressBar.style.width = `${percent}%`;
        progressText.textContent = text || `${percent}%`;
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

            let testPlan = await this.jiraService.checkExistingTestPlan(config);
            if (testPlan) {
                this.log(`ℹ️ Test Plan ${testPlan.key} już istnieje - pomijam tworzenie`, 'info');
                this.jiraService.lastTestPlanCreated = false;
            } else {
                testPlan = await this.jiraService.createTestPlan(testCases, config);
                this.log(`✅ Utworzono Test Plan: ${testPlan.key}`, 'success');
                this.jiraService.lastTestPlanCreated = true;
            }
            this.showProgress(80, 'Test Plan utworzony');

            if (testCases.length) {
                this.log('🔗 Powiązywanie Test Cases z Test Plan...', 'info');
                const linkResult = await this.jiraService.linkTestCasesToIssue(testCases, testPlan.key);
                if (linkResult.failed > 0) {
                    this.log(`⚠️ Powiązano ${linkResult.linked} Test Cases z Test Plan ${testPlan.key}. Niepowodzenia: ${linkResult.failed}`, 'warning');
                } else {
                    this.log(`✅ Powiązano ${linkResult.linked} Test Cases z Test Plan ${testPlan.key}`, 'success');
                }
                this.showProgress(85, `Powiązano ${linkResult.linked} testów`);
            } else {
                this.log('ℹ️ Brak nowych Test Cases do powiązania z Test Plan', 'info');
            }

            // Step 4: Create Test Executions
            this.log('🎯 Krok 4: Tworzenie Test Executions...', 'info');
            this.showProgress(90, 'Tworzenie Test Executions...');

            const { executions: testExecutions, createdCount: createdExecutions } = await this.jiraService.ensureTestExecutions(testPlan, config);
            if (createdExecutions > 0) {
                this.log(`✅ Utworzono ${createdExecutions} Test Executions`, 'success');
            } else {
                this.log(`ℹ️ Wykorzystano istniejące Test Executions (łącznie ${testExecutions.length})`, 'info');
            }

            if (testCases.length && testExecutions.length) {
                for (const execution of testExecutions) {
                    this.log(`🔗 Powiązywanie Test Cases z Test Execution ${execution.key}...`, 'info');
                    const linkResult = await this.jiraService.linkTestCasesToIssue(testCases, execution.key);
                    if (linkResult.failed > 0) {
                        this.log(`⚠️ Powiązano ${linkResult.linked} Test Cases z Test Execution ${execution.key}. Niepowodzenia: ${linkResult.failed}`, 'warning');
                    } else {
                        this.log(`✅ Powiązano ${linkResult.linked} Test Cases z Test Execution ${execution.key}`, 'success');
                    }
                }
            }

            this.showProgress(100, 'Zakończono!');
            const planSummary = this.jiraService.lastTestPlanCreated ? 'utworzono nowy Test Plan' : 'wykorzystano istniejący Test Plan';
            const executionSummary = createdExecutions > 0 ? `${createdExecutions} nowych Test Executions (${testExecutions.length} łącznie)` : `${testExecutions.length} istniejących Test Executions`;
            this.showStepStatus(`🎉 Sukces! Utworzono ${createdCount} Test Cases, ${planSummary} (${testPlan.key}) i ${executionSummary}`, 'success');

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
            return `project = ${config.projectKey} AND fixVersion = '${config.fixVersion}' AND development[pullrequests].all > 0 and development[pullrequests].open = 0`;
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

        console.log(`Making ${options.method || 'GET'} request to: ${url}`);

        try {
            const response = await fetch(url, { ...defaultOptions, ...options });

            if (!response.ok) {
                let errorText;
                try {
                    errorText = await response.text();
                } catch (textError) {
                    errorText = `Cannot read response body: ${textError.message}`;
                }

                console.error(`HTTP ${response.status} error:`, errorText);
                const error = new Error(`HTTP ${response.status}: ${errorText}`);
                error.status = response.status;
                error.body = errorText;
                error.url = url;
                throw error;
            }

            if (response.status === 204 || response.status === 205) {
                console.log(`Request successful, no content returned (${response.status})`);
                return null;
            }

            const contentType = response.headers.get('content-type') || '';
            if (response.headers.get('content-length') === '0' || !contentType.includes('application/json')) {
                console.log('Request successful, no JSON content returned');
                return null;
            }

            const data = await response.json();
            console.log(`Request successful, received ${data.total !== undefined ? `${data.total} total results` : 'data'}`);
            return data;

        } catch (error) {
            console.error(`Request failed for ${url}:`, error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error(`Network error: Cannot connect to ${this.baseUrl}. Please check the URL and your internet connection.`);
            }
            throw error;
        }
    }

    async getJqlCount(jql) {
        // Try the dedicated approximate count endpoint first
        try {
            console.log('Attempting approximate count with /search/approximate-count...');
            const data = await this.makeRequest('/search/approximate-count', {
                method: 'POST',
                body: JSON.stringify({ jql })
            });
            console.log(`Approximate count successful: ${data?.approximateCount ?? 0}`);
            return data?.approximateCount ?? 0;
        } catch (error) {
            console.log(`Approximate count failed (${error.status}), falling back to search...`);
            // Fallback to regular search with minimal results to get total count
            const data = await this.searchIssues({ jql, maxResults: 1 });
            const total = data?.total ?? 0;
            console.log(`Total count from search: ${total}`);
            return total;
        }
    }

    async getIssuesByJql(jql, maxResults = 500) {
        const data = await this.searchIssues({
            jql,
            maxResults,
            fields: ['summary', 'issuetype', 'priority', 'description', 'assignee', 'reporter']
        });
        return data?.issues ?? [];
    }

    async checkExistingTestCase(issueKey) {
        const jql = `project = ${this.config.projectKey} AND issuetype = "Test" AND issue in linkedIssues(${issueKey})`;
        return await this.findSingleIssue(jql);
    }

    async checkExistingTestPlan(config) {
        const jql = `project = ${config.projectKey} AND issuetype = "Test Plan" AND fixVersion = "${config.fixVersion}" AND summary ~ "\"Test Plan for Release ${config.fixVersion}\""`;
        return await this.findSingleIssue(jql);
    }

    async checkExistingTestExecution(prefix, config) {
        const jql = `project = ${config.projectKey} AND issuetype = "Test Execution" AND fixVersion = "${config.fixVersion}" AND summary ~ "\"${prefix} Test execution for Release ${config.fixVersion}\""`;
        return await this.findSingleIssue(jql);
    }

    async findSingleIssue(jql) {
        try {
            const data = await this.searchIssues({
                jql,
                maxResults: 1,
                fields: ['summary']
            });

            return data?.issues?.length ? data.issues[0] : null;
        } catch (error) {
            console.warn(`Warning: Could not execute JQL check: ${jql}`, error);
            return null;
        }
    }

    async searchIssues({ jql, maxResults = 50, fields }) {
        // Use the new /search/jql endpoint as /search has been deprecated (HTTP 410)
        const searchEndpoint = '/search/jql';
        console.log(`Searching issues with JQL: ${jql} (maxResults: ${maxResults})`);

        try {
            // First try GET request with new API format
            console.log('Attempting GET request with /search/jql endpoint...');
            const queryParams = new URLSearchParams({
                jql,
                maxResults: maxResults.toString()
            });

            if (fields && Array.isArray(fields) && fields.length > 0) {
                queryParams.append('fields', fields.join(','));
                console.log(`Including fields: ${fields.join(', ')}`);
            }

            const result = await this.makeRequest(`${searchEndpoint}?${queryParams.toString()}`, {
                method: 'GET'
            });
            console.log('GET request successful');
            return result;

        } catch (getError) {
            console.log(`GET request failed (${getError.status}): ${getError.message}, trying POST...`);

            // If GET fails, try POST method with new API format
            try {
                const payload = {
                    jql,
                    maxResults,
                    fields: fields && Array.isArray(fields) && fields.length > 0 ? fields : undefined
                };

                // Remove undefined fields from payload
                Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

                const result = await this.makeRequest(searchEndpoint, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                console.log('POST request successful');
                return result;

            } catch (postError) {
                console.log(`POST request failed (${postError.status}): ${postError.message}`);

                // If POST with fields fails, try without fields
                if (fields && postError.status === 400) {
                    console.log('Retrying POST request without fields...');
                    try {
                        const result = await this.makeRequest(searchEndpoint, {
                            method: 'POST',
                            body: JSON.stringify({ jql, maxResults })
                        });
                        console.log('POST request without fields successful');
                        return result;
                    } catch (simplePostError) {
                        console.error(`All search attempts failed. Final error:`, simplePostError);
                        throw simplePostError;
                    }
                }

                // If this is still 410, try the legacy fallback
                if (postError.status === 410) {
                    console.log('New API also deprecated, this should not happen. Check Atlassian documentation for latest endpoint.');
                }

                throw postError;
            }
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
                fixVersions: config.fixVersion ? [{ name: config.fixVersion }] : []
            }
        };

        const response = await this.makeRequest('/issue', {
            method: 'POST',
            body: JSON.stringify(testCaseData)
        });

        await this.linkIssues(response.key, issue.key);

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
                fixVersions: config.fixVersion ? [{ name: config.fixVersion }] : []
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

        return response;
    }

    async ensureTestExecutions(testPlan, config) {
        const executions = [];
        const prefixes = ['[RC]', '[PROD]'];
        let createdCount = 0;

        for (const prefix of prefixes) {
            let execution = await this.checkExistingTestExecution(prefix, config);
            if (execution) {
                executions.push(execution);
                continue;
            }

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
                    fixVersions: config.fixVersion ? [{ name: config.fixVersion }] : []
                }
            };

            execution = await this.makeRequest('/issue', {
                method: 'POST',
                body: JSON.stringify(testExecutionData)
            });

            executions.push(execution);
            createdCount += 1;

            // Link execution to test plan via issue link for traceability
            await this.linkIssues(execution.key, testPlan.key);
        }

        return { executions, createdCount };
    }

    async linkIssues(inwardKey, outwardKey, linkType = 'Relates') {
        if (!inwardKey || !outwardKey) {
            return false;
        }

        try {
            await this.makeRequest('/issueLink', {
                method: 'POST',
                body: JSON.stringify({
                    type: { name: linkType },
                    inwardIssue: { key: inwardKey },
                    outwardIssue: { key: outwardKey }
                })
            });
            return true;
        } catch (error) {
            console.warn(`Warning: Could not link ${inwardKey} to ${outwardKey}:`, error);
            return false;
        }
    }

    async linkTestCasesToIssue(testCases, targetIssueKey) {
        let linked = 0;
        let failed = 0;

        for (const testCase of testCases) {
            const testKey = testCase?.key;
            if (!testKey) {
                failed += 1;
                continue;
            }

            const success = await this.linkIssues(testKey, targetIssueKey);
            if (success) {
                linked += 1;
            } else {
                failed += 1;
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        return { linked, failed };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new XrayTestGenerator();
});

