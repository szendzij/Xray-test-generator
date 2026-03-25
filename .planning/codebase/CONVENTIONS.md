# Coding Conventions

**Analysis Date:** 2026-03-25

## Naming Patterns

**Files:**
- camelCase with descriptive names: `jiraApiClient.js`, `validationService.js`, `configManager.js`
- Suffixes indicate purpose: `*Client` for HTTP clients, `*Service` for business logic, `*Manager` for state management
- UI components use descriptive names: `uiManager.js`, `stepperController.js`, `eventListenerManager.js`

**Classes:**
- PascalCase: `XrayTestGenerator`, `JiraService`, `ValidationService`, `ErrorHandler`
- One class per file; class name matches filename exactly

**Methods/Functions:**
- camelCase: `loadSavedConfig()`, `validateField()`, `makeRequest()`, `getUserFriendlyMessage()`
- Prefix conventions:
  - `get*` for retrievers: `getConfig()`, `getElement()`, `getToken()`
  - `set*` for setters: `setValue()`, `setStyle()`, `setText()`
  - `check*` for validation/existence checks: `checkConnection()`, `checkExistingTestCase()`, `checkCached()`
  - `validate*` for validation: `validateConfig()`, `validateField()`, `validateStep()`
  - `*Debounced` for debounced functions: `saveConfigDebounced()`
  - Private/internal methods use `_` prefix: `_parseRetryDelay()`, `_tokenExpiry`

**Variables:**
- camelCase: `isValid`, `maxRetries`, `baseDelay`, `currentStep`
- Boolean prefixes: `is*`, `has*`, `should*`: `isDev`, `isConnectionVerified()`, `shouldNotRetry()`
- Constants: UPPER_SNAKE_CASE in `CONSTANTS` object: `CONSTANTS.VALIDATION.MIN_API_KEY_LENGTH`, `CONSTANTS.TIMEOUTS.API_DELAY`
- Metadata prefix: `_` prefix distinguishes runtime-only metadata: `_wasExisting`, `_tokenExpiry`

**Types/Objects:**
- Return objects use descriptive field names: `{ isValid, results }`, `{ result, createdCount, skippedCount }`
- Config objects: flat structure with clear field names: `{ jiraUrl, jiraEmail, jiraApiKey, customJql, fixVersion }`
- Cache uses descriptive keys: Map-based with structured keys like `testCases`, `testPlans`, `testExecutions`

## Code Style

**Formatting:**
- No linting config detected (no `.eslintrc`, `.prettierrc`, or `biome.json`)
- Indentation: 4 spaces (observed in all files)
- Line length: 100+ characters acceptable (observed throughout)
- Semicolons: Always required
- Object shorthand: Used when appropriate

**Spacing:**
- Space after keywords: `if (condition)`, `for (let i = 0)`, `catch (error)`
- Space in object literals: `{ key: value, another: value }`
- Space around operators: `const x = a + b`, `if (a === b)`
- No space before function call parentheses: `fn()`, not `fn ()`
- Space before block opening braces: `fn() {`, `if (x) {`

**Comments:**
- Single-line comments use `//` with space: `// Comment here`
- File headers document purpose: `// Xray Test Generator - SidePanel Script`
- Section markers: `// --- Helpers ---`, `// --- Public API ---` to organize code
- Inline comments explain WHY, not WHAT: `// Cache for existing items to avoid duplicate queries`
- No JSDoc-style documentation present in codebase

## Import Organization

**Order (as observed in `sidepanel.html` script load order):**
1. Constants/Configuration (`src/utils/constants.js`)
2. Logging utilities (`src/utils/logger.js`)
3. DOM helpers (`src/utils/domHelper.js`)
4. Validation services (`src/utils/validationService.js`)
5. Config managers (`src/utils/configManager.js`)
6. Error handlers (`src/utils/errorHandler.js`)
7. API clients (`src/api/jiraApiClient.js`, `src/api/llmApiClient.js`, `src/api/xrayApiClient.js`)
8. Business logic services (`src/services/jiraService.js`)
9. UI managers (`src/ui/uiManager.js`, `src/ui/stepperController.js`)
10. Event handling (`src/ui/eventListenerManager.js`)
11. Core entry point (`src/core/sidepanel.js`)

**No ES6 modules used:**
- Chrome extension loads files via script tags in `sidepanel.html`
- Global scope for all classes and constants (no `import/export`)
- Relies on script load order for dependency resolution

## Error Handling

**Patterns:**
- Centralized error handling via `ErrorHandler` class (`src/utils/errorHandler.js`)
- Methods use `try/catch` blocks with meaningful error context
- Network errors caught and re-thrown with context: `throw new Error('Network error: ...')`
- HTTP errors attached to error object: `error.status`, `error.body`, `error.url`
- Retry logic via `errorHandler.withRetry()`: `await errorHandler.withRetry(() => fn(), 'context')`
- Exponential backoff: base 1000ms × 2^attempt (1s, 2s, 4s)
- No retry on 401, 403, 404; retry on 429, 5xx
- User-friendly messages translated via `i18n.t()` in error responses
- Validation errors thrown early with i18n message: `throw new Error(firstError?.error || i18n.t('val.fieldRequired'))`

Example pattern from `jiraApiClient.js`:
```javascript
try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    if (!response.ok) {
        let errorText;
        try {
            errorText = await response.text();
        } catch (textError) {
            errorText = `Cannot read response body: ${textError.message}`;
        }
        const error = new Error(`HTTP ${response.status}: ${errorText}`);
        error.status = response.status;
        error.body = errorText;
        throw error;
    }
} catch (error) {
    logger.error(`Request failed for ${url}:`, error);
    throw error;
}
```

## Logging

**Framework:** Native `console` methods (no external library)

**Logger class:** `src/utils/logger.js` wraps console with prefix and dev-mode detection

**Methods:**
- `logger.info(message, ...args)` - Development only
- `logger.debug(message, ...args)` - Development only
- `logger.warn(message, ...args)` - Always shown
- `logger.error(message, ...args)` - Always shown

**When to log:**
- API requests: `logger.debug('Making ${method} request to: ${url}')`
- API responses: `logger.debug('Request successful, received ${data.total} total results')`
- Connection attempts: `logger.info('Side panel opened')`
- Configuration changes: `logger.debug('Retry attempt ${attempt + 1}/${maxRetries}')`
- Errors: `logger.error('Error context:', errorMessage, error)`

**Prefix convention:**
- `[INFO]`, `[DEBUG]`, `[WARN]`, `[ERROR]` prefixes added automatically
- Context in messages: Error handler includes function context: `Error in ${context}`

## Conditional Field Inclusion

**Pattern:** Spread operator with conditional logic
```javascript
const data = {
    fields: {
        project: { key: config.projectKey },
        summary: issue.fields.summary,
        ...(reporterAccountId && { assignee: { accountId: reporterAccountId } })
    }
};
```

This includes `assignee` field only if `reporterAccountId` exists (avoid null values in API payloads).

## Service Pattern

**Responsibilities separation:**
- `*Client` classes: Pure HTTP communication
- `*Service` classes: Business logic using clients
- Example: `JiraApiClient` handles REST calls; `JiraService` uses it for domain operations

**Service initialization:**
```javascript
class JiraService {
    constructor(config, errorHandler) {
        this.config = config;
        this.apiClient = new JiraApiClient(config, errorHandler);
        this.cache = { testCases: new Map(), testPlans: new Map(), testExecutions: new Map() };
    }
}
```

## Caching Pattern

**Map-based caching for duplicate detection:**
```javascript
async checkCached(store, key, jql) {
    if (this.cache[store].has(key)) return this.cache[store].get(key);
    const result = await this.apiClient.findSingleIssue(jql);
    this.cache[store].set(key, result);
    return result;
}
```

## UI State Management

**Class-based state:**
- Main state in `XrayTestGenerator` class constructor
- Delegated state to service classes (e.g., `currentStep` in `StepperController`)
- UI state via DOM class manipulation: `.active`, `.completed`, `.hidden`
- DOM element references cached in manager classes for performance

**Event delegation:**
- `EventListenerManager` centralizes all listener setup
- `Map` used to track listeners: `this.listeners = new Map()`
- Handlers passed as arrow functions to preserve `this` context

---

*Convention analysis: 2026-03-25*
