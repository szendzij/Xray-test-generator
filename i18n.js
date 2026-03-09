/**
 * i18n.js — internationalization module for Xray Test Generator v2
 * Supports: pl (Polish, default), en (English)
 * Usage: i18n.t('key', { param: value })   — get translated string
 *        i18n.setLanguage('en')             — switch language
 *        i18n.init()                        — load saved lang + apply to DOM
 */
const i18n = (() => {
    const LANG_KEY = 'xray-lang';

    const translations = {
        pl: {
            // ── Static UI ───────────────────────────────────────────────
            'brand': '⚡ Xray Generator',
            'notConnected': 'Nie połączono',
            'card.credentials.title': 'Jira Connection',
            'card.credentials.badge': 'Niezweryfikowano',
            'label.baseUrl': 'Base URL',
            'label.email': 'Email',
            'label.apiKey': 'API Key',
            'btn.testConnection': '🔗 Testuj połączenie',
            'card.query.title': 'Konfiguracja zapytania',
            'label.fixVersion': 'Fix Version',
            'label.projectKey': 'Klucz projektu',
            'label.componentName': 'Komponent',
            'label.jqlQuery': 'Zapytanie JQL',
            'btn.previewIssues': '🔍 Podgląd issues',
            'btn.generateTests': 'GENERUJ TESTY',
            'generateMeta.ready': 'Gotowe',
            'card.execution.title': 'Dziennik wykonania',
            'execution.idle': 'Bezczynny',
            'stat.tests': '🧪 Testy',
            'stat.plans': '📋 Plany',
            'stat.execs': '▶ Egzekucje',
            'stat.links': '🔗 Linki',
            'btn.runAgain': '🔄 Uruchom ponownie',

            // ── Placeholders ─────────────────────────────────────────────
            'placeholder.baseUrl': 'https://twoja-domena.atlassian.net',
            'placeholder.email': 'ty@domena.pl',
            'placeholder.apiKey': 'Token Jira API',

            // ── Dynamic messages ─────────────────────────────────────────
            'msg.checkingConnection': 'Sprawdzanie połączenia...',
            'msg.checkingJql': 'Sprawdzanie zapytania JQL: {jql}',
            'msg.connectionOk': '✅ Połączenie OK! Znaleziono {count} issues.',
            'msg.credentialsOk': 'Poświadczenia OK!',
            'msg.connected': 'Połączono',
            'msg.credentialsVerified': '✓ Zweryfikowano',
            'msg.issueCount': '{count} issues',
            'msg.connectionError': '❌ Błąd połączenia: {message}',
            'msg.connectionFailed': 'Błąd połączenia',
            'msg.credentialsFailed': '✗ Błąd',
            'msg.fetchingCount': '🔍 Pobieranie liczby issues...',
            'msg.fillCredentials': '⚠️ Uzupełnij dane logowania w sekcji Jira Connection.',
            'msg.queryWillReturn': '✅ Zapytanie zwróci {count} issues',
            'msg.errorPrefix': '❌ {message}',
            'msg.starting': '🚀 Rozpoczynanie generowania testów Xray...',
            'msg.noTasks': 'ℹ️ Brak zadań do przetworzenia',
            'msg.noNewTestCases': 'ℹ️ Brak nowych Test Cases do utworzenia',
            'msg.stage1Init': 'Etap 1/6 — Inicjalizacja...',
            'msg.stage1Fetch': 'Etap 1/6 — Pobieranie issues z Jira...',
            'msg.step1': '📋 Krok 1: Pobieranie zadań z JQL...',
            'msg.fetchingTasks': 'Pobieranie zadań...',
            'msg.executingQuery': 'Wykonywanie zapytania: {jql}',
            'msg.foundTasks': '✅ Znaleziono {count} zadań',
            'msg.stage2': 'Etap 2/6 — Tworzenie {count} Test Cases...',
            'msg.step2': '🔨 Krok 2: Tworzenie Test Cases...',
            'msg.creatingTestCase': 'Tworzenie Test Case {current}/{total}',
            'msg.testCaseCreated': '✅ Utworzono Test Case: {key} dla zadania {issueKey}',
            'msg.testCaseSkipped': '⏩ Pominięto zadanie {issueKey} - Test Case już istnieje',
            'msg.testCaseError': '❌ Błąd tworzenia Test Case dla {issueKey}: {message}',
            'msg.testCasesSummary': '📊 Test Cases: {created} utworzonych, {skipped} pominiętych',
            'msg.testCasesCreatedCount': '{count} Test Cases utworzonych',
            'msg.stage3': 'Etap 3/6 — Tworzenie Test Plan...',
            'msg.step3': '📋 Krok 3: Tworzenie Test Plan...',
            'msg.creatingTestPlan': 'Tworzenie Test Plan...',
            'msg.testPlanCreated': '✅ Utworzono Test Plan: {key}',
            'msg.testPlanExists': 'ℹ️ Test Plan {key} już istnieje - pomijam tworzenie',
            'msg.testPlanDone': 'Test Plan utworzony',
            'msg.stage4': 'Etap 4/6 — Powiązywanie {count} Test Cases z Planem...',
            'msg.step4': '🔗 Powiązywanie Test Cases z Test Plan...',
            'msg.linkedWithFailures': '⚠️ Powiązano {linked} Test Cases z {key}. Niepowodzenia: {failed}',
            'msg.linkedOk': '✅ Powiązano {linked} Test Cases z {key}',
            'msg.noNewCasesToLink': 'ℹ️ Brak nowych Test Cases do powiązania z Test Plan',
            'msg.linkedCount': 'Powiązano {count} testów',
            'msg.stage5': 'Etap 5/6 — Tworzenie Test Executions...',
            'msg.step5': '🎯 Krok 4: Tworzenie Test Executions...',
            'msg.creatingExecs': 'Tworzenie Test Executions...',
            'msg.execExists': 'ℹ️ Test Execution {key} już istnieje - pomijam tworzenie',
            'msg.execCreated': '✅ Utworzono Test Execution: {key}',
            'msg.allExecsExisted': 'ℹ️ Wszystkie Test Executions już istniały ({count} łącznie)',
            'msg.stage6': 'Etap 6/6 — Powiązywanie Test Cases z Egzekucjami...',
            'msg.linkingToExec': '🔗 Powiązywanie Test Cases z Test Execution {key}...',
            'msg.done': 'Zakończono!',
            'msg.planCreatedNew': 'utworzono nowy Test Plan',
            'msg.planUsedExisting': 'wykorzystano istniejący Test Plan',
            'msg.execsNewCount': '{created} nowych Test Executions ({total} łącznie)',
            'msg.execsExistingCount': '{total} istniejących Test Executions',
            'msg.success': '🎉 Sukces! Utworzono {createdCount} Test Cases, {planSummary} ({planKey}) i {executionSummary}',
            'msg.completed': '✓ Zakończono — {count} testów wygenerowanych',
            'msg.completedBadge': '✓ Gotowe',
            'msg.generalError': 'Błąd: {message}',
            'msg.generalErrorStatus': '❌ Błąd: {message}',
            'msg.fillRequiredFields': 'Uzupełnij wszystkie wymagane pola w kroku {step}',
            'msg.loadConfigError': 'Błąd podczas ładowania konfiguracji:',
            'msg.saveConfigError': 'Błąd podczas zapisywania konfiguracji:',

            // ── Validation ───────────────────────────────────────────────
            'val.urlRequired': 'URL jest wymagany',
            'val.urlHttps': 'URL musi zaczynać się od https://',
            'val.urlInvalid': 'Nieprawidłowy format URL Jira',
            'val.emailRequired': 'Email jest wymagany',
            'val.emailInvalid': 'Nieprawidłowy format email',
            'val.apiKeyRequired': 'API Key jest wymagany',
            'val.apiKeyShort': 'API Key jest za krótki',
            'val.fixVersionRequired': 'Fix Version jest wymagana',
            'val.projectKeyRequired': 'Project Key jest wymagany',
            'val.projectKeyFormat': 'Project Key może zawierać tylko wielkie litery',
            'val.componentRequired': 'Component Name jest wymagany',
            'val.jqlRequired': 'JQL jest wymagane',
            'val.jqlShort': 'JQL jest za krótkie',
            'val.jqlProject': 'JQL powinno zawierać warunek "project"',
            'val.fieldRequired': 'Pole jest wymagane',
            'val.urlMustBeHttps': 'Jira URL musi zaczynać się od https://',
            'val.urlMayBeInvalid': 'URL może nie być prawidłowym adresem Jira. Sprawdź czy to jest poprawny URL do instancji Jira.',
        },

        en: {
            // ── Static UI ───────────────────────────────────────────────
            'brand': '⚡ Xray Generator',
            'notConnected': 'Not connected',
            'card.credentials.title': 'Jira Connection',
            'card.credentials.badge': 'Not verified',
            'label.baseUrl': 'Base URL',
            'label.email': 'Email',
            'label.apiKey': 'API Key',
            'btn.testConnection': '🔗 Test Connection',
            'card.query.title': 'Query Configuration',
            'label.fixVersion': 'Fix Version',
            'label.projectKey': 'Project Key',
            'label.componentName': 'Component',
            'label.jqlQuery': 'JQL Query',
            'btn.previewIssues': '🔍 Preview Issues',
            'btn.generateTests': 'GENERATE TESTS',
            'generateMeta.ready': 'Ready',
            'card.execution.title': 'Execution Log',
            'execution.idle': 'Idle',
            'stat.tests': '🧪 Tests',
            'stat.plans': '📋 Plans',
            'stat.execs': '▶ Execs',
            'stat.links': '🔗 Links',
            'btn.runAgain': '🔄 Run Again',

            // ── Placeholders ─────────────────────────────────────────────
            'placeholder.baseUrl': 'https://your-domain.atlassian.net',
            'placeholder.email': 'you@domain.com',
            'placeholder.apiKey': 'Jira API token',

            // ── Dynamic messages ─────────────────────────────────────────
            'msg.checkingConnection': 'Checking connection...',
            'msg.checkingJql': 'Checking JQL query: {jql}',
            'msg.connectionOk': '✅ Connection OK! Found {count} issues.',
            'msg.credentialsOk': 'Credentials OK!',
            'msg.connected': 'Connected',
            'msg.credentialsVerified': '✓ Verified',
            'msg.issueCount': '{count} issues',
            'msg.connectionError': '❌ Connection error: {message}',
            'msg.connectionFailed': 'Connection failed',
            'msg.credentialsFailed': '✗ Failed',
            'msg.fetchingCount': '🔍 Fetching issue count...',
            'msg.fillCredentials': '⚠️ Please fill in login credentials in the Jira Connection section.',
            'msg.queryWillReturn': '✅ Query will return {count} issues',
            'msg.errorPrefix': '❌ {message}',
            'msg.starting': '🚀 Starting Xray test generation...',
            'msg.noTasks': 'ℹ️ No tasks to process',
            'msg.noNewTestCases': 'ℹ️ No new Test Cases to create',
            'msg.stage1Init': 'Stage 1/6 — Initializing...',
            'msg.stage1Fetch': 'Stage 1/6 — Fetching issues from Jira...',
            'msg.step1': '📋 Step 1: Fetching tasks from JQL...',
            'msg.fetchingTasks': 'Fetching tasks...',
            'msg.executingQuery': 'Executing query: {jql}',
            'msg.foundTasks': '✅ Found {count} tasks',
            'msg.stage2': 'Stage 2/6 — Creating {count} Test Cases...',
            'msg.step2': '🔨 Step 2: Creating Test Cases...',
            'msg.creatingTestCase': 'Creating Test Case {current}/{total}',
            'msg.testCaseCreated': '✅ Created Test Case: {key} for issue {issueKey}',
            'msg.testCaseSkipped': '⏩ Skipped {issueKey} - Test Case already exists',
            'msg.testCaseError': '❌ Error creating Test Case for {issueKey}: {message}',
            'msg.testCasesSummary': '📊 Test Cases: {created} created, {skipped} skipped',
            'msg.testCasesCreatedCount': '{count} Test Cases created',
            'msg.stage3': 'Stage 3/6 — Creating Test Plan...',
            'msg.step3': '📋 Step 3: Creating Test Plan...',
            'msg.creatingTestPlan': 'Creating Test Plan...',
            'msg.testPlanCreated': '✅ Created Test Plan: {key}',
            'msg.testPlanExists': 'ℹ️ Test Plan {key} already exists - skipping',
            'msg.testPlanDone': 'Test Plan created',
            'msg.stage4': 'Stage 4/6 — Linking {count} Test Cases to Plan...',
            'msg.step4': '🔗 Linking Test Cases to Test Plan...',
            'msg.linkedWithFailures': '⚠️ Linked {linked} Test Cases to {key}. Failures: {failed}',
            'msg.linkedOk': '✅ Linked {linked} Test Cases to {key}',
            'msg.noNewCasesToLink': 'ℹ️ No new Test Cases to link to Test Plan',
            'msg.linkedCount': 'Linked {count} tests',
            'msg.stage5': 'Stage 5/6 — Creating Test Executions...',
            'msg.step5': '🎯 Step 4: Creating Test Executions...',
            'msg.creatingExecs': 'Creating Test Executions...',
            'msg.execExists': 'ℹ️ Test Execution {key} already exists - skipping',
            'msg.execCreated': '✅ Created Test Execution: {key}',
            'msg.allExecsExisted': 'ℹ️ All Test Executions already existed ({count} total)',
            'msg.stage6': 'Stage 6/6 — Linking Test Cases to Executions...',
            'msg.linkingToExec': '🔗 Linking Test Cases to Test Execution {key}...',
            'msg.done': 'Completed!',
            'msg.planCreatedNew': 'created new Test Plan',
            'msg.planUsedExisting': 'used existing Test Plan',
            'msg.execsNewCount': '{created} new Test Executions ({total} total)',
            'msg.execsExistingCount': '{total} existing Test Executions',
            'msg.success': '🎉 Success! Created {createdCount} Test Cases, {planSummary} ({planKey}) and {executionSummary}',
            'msg.completed': '✓ Completed — {count} tests generated',
            'msg.completedBadge': '✓ Done',
            'msg.generalError': 'Error: {message}',
            'msg.generalErrorStatus': '❌ Error: {message}',
            'msg.fillRequiredFields': 'Please fill in all required fields in step {step}',
            'msg.loadConfigError': 'Error loading configuration:',
            'msg.saveConfigError': 'Error saving configuration:',

            // ── Validation ───────────────────────────────────────────────
            'val.urlRequired': 'URL is required',
            'val.urlHttps': 'URL must start with https://',
            'val.urlInvalid': 'Invalid Jira URL format',
            'val.emailRequired': 'Email is required',
            'val.emailInvalid': 'Invalid email format',
            'val.apiKeyRequired': 'API Key is required',
            'val.apiKeyShort': 'API Key is too short',
            'val.fixVersionRequired': 'Fix Version is required',
            'val.projectKeyRequired': 'Project Key is required',
            'val.projectKeyFormat': 'Project Key may only contain uppercase letters',
            'val.componentRequired': 'Component Name is required',
            'val.jqlRequired': 'JQL is required',
            'val.jqlShort': 'JQL is too short',
            'val.jqlProject': 'JQL should contain a "project" condition',
            'val.fieldRequired': 'Field is required',
            'val.urlMustBeHttps': 'Jira URL must start with https://',
            'val.urlMayBeInvalid': 'URL may not be a valid Jira address. Please verify this is a valid Jira instance URL.',
        }
    };

    let currentLang = 'pl';

    /**
     * Translate a key with optional parameter interpolation.
     * @param {string} key - Translation key (e.g. 'msg.foundTasks')
     * @param {Object} params - Interpolation params (e.g. { count: 5 })
     * @returns {string} Translated string
     */
    function t(key, params = {}) {
        const str = translations[currentLang]?.[key] ?? translations['en']?.[key] ?? key;
        return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
    }

    /**
     * Apply translations to all [data-i18n] and [data-i18n-placeholder] elements.
     */
    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.dataset.i18n);
        });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.placeholder = t(el.dataset.i18nPlaceholder);
        });
        // Highlight active lang button
        const btnPl = document.getElementById('langPl');
        const btnEn = document.getElementById('langEn');
        if (btnPl) btnPl.classList.toggle('active', currentLang === 'pl');
        if (btnEn) btnEn.classList.toggle('active', currentLang === 'en');
    }

    /**
     * Switch language, persist to localStorage, and re-render DOM.
     * @param {string} lang - 'pl' or 'en'
     */
    function setLanguage(lang) {
        if (!translations[lang]) return;
        currentLang = lang;
        localStorage.setItem(LANG_KEY, lang);
        applyTranslations();
    }

    /**
     * Initialize: load saved language preference and apply translations.
     * Call this once after DOM is ready.
     */
    function init() {
        currentLang = localStorage.getItem(LANG_KEY) || 'pl';
        applyTranslations();
    }

    return {
        t,
        setLanguage,
        init,
        get lang() { return currentLang; }
    };
})();
