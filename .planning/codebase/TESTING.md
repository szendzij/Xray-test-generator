# Testing Patterns

**Analysis Date:** 2026-03-25

## Test Framework

**Status:** No test framework currently configured

**Current approach:**
- No `jest.config.js`, `vitest.config.js`, or test runner configuration
- No `package.json` file (Chrome extension loads via script tags)
- No `.test.js`, `.spec.js` files in codebase
- `test-config.json` is documentation only — contains example configuration and expected data structures, not runnable tests

**Run Commands:**
Not applicable — no test infrastructure in place.

## Manual Testing Documentation

**File:** `test-config.json` (root directory)

**Purpose:** Reference documentation for manual/integration testing

**Contents:**
- Test configuration example: Jira URL, email, API key, fix version, project key, component name
- JQL queries used: `mainQuery` (main issue filter), `testCaseCheck` (existing test case check), `testPlanFilter` (linked tests filter)
- Expected data structures: Test case, Test Plan, Test Execution issue shapes with required fields
- Workflow steps: 5-stage manual testing workflow (connection check → fetch issues → create test cases → create test plan → create executions)

Example test case structure from `test-config.json`:
```json
{
  "fields": {
    "project": { "key": "RES" },
    "summary": "RES-123 | Bug | Opis błędu",
    "description": "Test case for issue https://wfirma.atlassian.net/browse/RES-123",
    "issuetype": { "name": "Test" },
    "priority": { "name": "Medium" },
    "components": [{ "name": "5ways" }],
    "fixVersions": [{ "name": "25.9" }]
  }
}
```

## Manual Testing Approach

**Connection Testing:**
- Verify Jira URL, email, API key validity via `checkConnection()` → `JiraService.getJqlCount(jql)`
- UI displays status: `msg.connectionOk` or error message via `UIManager.showStatus()`

**Config Validation:**
- Validation rules in `ValidationService` → `validationRules` object
- Field-level validation: URL format, email regex, API key length, JQL syntax, project key format
- Step-level validation: validates fields required for each step (login, parameters, execution)
- Real-time validation via event listeners in `EventListenerManager.setupValidationListeners()`

**Integration Testing Points:**
- JQL query execution: Verify correct issue count with `/search/approximate-count` (fallback to `/search/jql`)
- Test case creation: Verify issue payload shape matches `test-config.json` structure
- Test plan creation and linking: Verify JQL filter in description works correctly
- Test execution creation: Verify `[RC]` and `[PROD]` prefix handling
- Xray GraphQL: Verify test step addition via `XrayApiClient.addTestStep()`
- Gemini API: Verify JSON array parsing from response; handle 429 rate limit with retry delay

## Validation Patterns

**ValidationService structure:**
```javascript
class ValidationService {
    constructor() {
        this.validationRules = {
            jiraUrl: (value) => { ... },
            jiraEmail: (value) => { ... },
            jiraApiKey: (value) => { ... },
            customJql: (value) => { ... },
            customProjectKey: (value) => { ... },
            customComponentName: (value) => { ... },
            customFixVersion: (value) => { ... }
        };
    }

    validateField(fieldId, value) {
        const validator = this.validationRules[fieldId];
        if (!validator) return value ? null : i18n.t('val.fieldRequired');
        return validator(value.trim());
    }

    validateFields(fields, getFieldValue) {
        const results = {};
        let isValid = true;
        fields.forEach(fieldId => {
            const value = getFieldValue(fieldId);
            const error = this.validateField(fieldId, value);
            results[fieldId] = { value, error, isValid: !error };
            if (error) isValid = false;
        });
        return { isValid, results };
    }

    validateStep(stepNumber, config, jqlMode) {
        let fields;
        if (stepNumber === CONSTANTS.STEPS.LOGIN) {
            fields = ['jiraUrl', 'jiraEmail', 'jiraApiKey'];
        } else if (stepNumber === CONSTANTS.STEPS.PARAMETERS) {
            fields = ['customJql', 'customProjectKey', 'customComponentName', 'customFixVersion'];
        } else {
            return { isValid: true, results: {} };
        }
        const getFieldValue = (fieldId) => config[fieldId] || DOMHelper.getElement(fieldId)?.value || '';
        return this.validateFields(fields, getFieldValue);
    }

    validateConfig(config) {
        const required = ['jiraUrl', 'jiraEmail', 'jiraApiKey', 'customJql', 'fixVersion', 'projectKey', 'componentName'];
        const validation = this.validateFields(required, (fieldId) => config[fieldId] || '');
        if (!validation.isValid) {
            const firstError = Object.values(validation.results).find(r => r.error);
            throw new Error(firstError?.error || i18n.t('val.fieldRequired'));
        }
        return config;
    }
}
```

## Error Handling Testing

**ErrorHandler class patterns:**

**Retry logic:**
```javascript
async retry(fn, maxRetries = this.maxRetries, context = '') {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (this.shouldNotRetry(error)) throw error;
            if (attempt < maxRetries) {
                const delay = this.calculateDelay(attempt);
                logger.debug(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms for ${context}`);
                await this.sleep(delay);
            }
        }
    }
    throw lastError;
}

async withRetry(fn, context = '', maxRetries = this.maxRetries) {
    return this.retry(fn, maxRetries, context);
}
```

**Retry conditions:**
- No retry: 401, 403, 404 (auth/client errors)
- Retry: 429 (rate limit), 5xx (server errors)
- No retry: Validation errors (i18n message contains specific Polish text)

**User-friendly error messages:**
```javascript
getUserFriendlyMessage(error) {
    if (error.message) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return 'Błąd sieci: Nie można połączyć się z serwerem. Sprawdź połączenie internetowe.';
        }
        if (error.status) {
            if (error.status === 401 || error.status === 403) {
                return 'Błąd autoryzacji: Sprawdź dane logowania (email i API Key).';
            }
            if (error.status === 404) {
                return 'Nie znaleziono zasobu. Sprawdź czy URL jest poprawny.';
            }
            if (error.status >= 500) {
                return 'Błąd serwera. Spróbuj ponownie później.';
            }
            return `Błąd HTTP ${error.status}: ${error.message}`;
        }
        return error.message;
    }
    return 'Wystąpił nieoczekiwany błąd.';
}
```

## API Client Testing Points

**JiraApiClient (`src/api/jiraApiClient.js`):**
- HTTP request composition: headers (Content-Type, Authorization, Accept)
- Basic Auth encoding: `btoa('${email}:${apiKey}')`
- Response handling: 204/205 no content, JSON parsing, error propagation
- Retry wrapper: `makeRequestWithRetry()` delegates to `errorHandler.withRetry()`
- Endpoint handling: Supports GET with query params and POST with body
- Fallback logic: JQL count tries `/search/approximate-count`, falls back to `/search/jql`

Example test points:
- Verify query parameter escaping for JQL: `summary ~ '"Text here"'`
- Verify field selection in results: `['summary', 'issuetype', 'priority', 'description', 'assignee', 'reporter']`
- Verify error handling for CORS (fetch TypeError)
- Verify 204 response handling (no JSON parsing)

**LlmApiClient (`src/api/llmApiClient.js`):**
- Gemini API endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent`
- Request format: JSON with `contents` and `generationConfig`
- Response parsing: Extract JSON array from response text (handles stray text)
- Rate limit handling: Parse 429 response for `retryDelay`, default fallback 20s
- Language detection: Use `i18n.lang` or locale to determine output language

Example test points:
- Verify JSON extraction from mixed text response (Markdown code blocks)
- Verify 429 retry with `retryDelay` parsing
- Verify temperature and maxOutputTokens settings: `{ temperature: 0.2, maxOutputTokens: 1024 }`
- Verify minimum 3, maximum 7 steps constraint in prompt
- Verify step structure: `{ action, data, result }`

**XrayApiClient (`src/api/xrayApiClient.js`):**
- EU region base URL: `https://eu.xray.cloud.getxray.app`
- Token caching: 23-hour expiry after first auth
- GraphQL mutation for test steps: Variable substitution with `issueId`, `action`, `data`, `result`
- Bearer token format: `Authorization: Bearer ${token}`

Example test points:
- Verify token refresh on expiry
- Verify GraphQL error handling: `data.errors?.length > 0`
- Verify numeric `issueId` requirement (not string key)

## Configuration and State Persistence

**ConfigManager (`src/utils/configManager.js`):**
- Uses `chrome.storage.local.get()` and `chrome.storage.local.set()`
- Debounced auto-save on input: `saveConfigDebounced()` with 300ms delay
- Persisted fields: All CONSTANTS.STORAGE.KEYS plus `geminiApiKey`, `useAiSteps`, `xrayClientId`, `xrayClientSecret`
- On load: Restores values to DOM elements via `DOMHelper.setValue()`
- Checkbox special handling: `useAiSteps` restored as `checkbox.checked = config['useAiSteps'] === 'true'`

Example test points:
- Verify all fields persist across extension reload
- Verify debounce prevents excessive saves
- Verify checkbox state recovery (string 'true' conversion)
- Verify hidden UI elements sync with config (e.g., `aiStepsConfig` hidden when `useAiSteps` false)

## UI Manager Testing

**UIManager (`src/ui/uiManager.js`):**
- Log entries appended to `#log` element
- Progress bar: `#progressBar` width set to percentage, text in `#progressText`
- Status display: `showStatus(elementId, message, type)` applies CSS class based on type
- Log entry format: `[HH:MM:SS] message` with class `log-entry ${type}`

Example test points:
- Verify log entries scroll to bottom
- Verify progress bar reaches 100%
- Verify status color changes based on type (info, success, error)
- Verify element hiding/showing removes/adds `hidden` class

## Stepper Controller Testing

**StepperController (`src/ui/stepperController.js`):**
- Step navigation: `goToStep(stepNumber, jqlMode, validateCallback)`
- Validation before proceeding: Only allows forward if current step is valid
- DOM updates: Adds `.active` and `.completed` classes, toggles `.step-panel` visibility
- State tracking: `currentStep`, `connectionVerified`
- Progress milestones: Steps correspond to CONSTANTS.PROGRESS values (10%, 20%, 60%, 80%, 100%)

Example test points:
- Verify cannot advance without validation passing
- Verify validation callback receives correct boolean
- Verify step classes update correctly
- Verify panel visibility matches active step
- Verify reset clears all UI state (logs, progress, execution card)

## Known Test Requirements

**From project memory:**
- 6-stage generation pipeline: fetch → test cases → test plan → link → executions → link
- Progress milestones: INITIALIZATION (0%), FETCH_ISSUES_START (10%), CREATE_TEST_CASES_COMPLETE (60%), AI_STEPS_COMPLETE (68%), CREATE_TEST_PLAN_COMPLETE (80%), COMPLETE (100%)
- Duplicate detection: `checkCached()` prevents re-creating existing test cases, test plans, executions
- Label copying: Issue labels copied to test case via API

---

*Testing analysis: 2026-03-25*
