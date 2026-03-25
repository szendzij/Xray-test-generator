# Architecture

**Analysis Date:** 2026-03-25

## Pattern Overview

**Overall:** Layered MV\* with Dependency Injection

This is a **Manifest V3 Chrome Extension** using a strict layered architecture with clear separation of concerns between API communication, business logic, UI state, and presentation layers. The main class `XrayTestGenerator` acts as a facade and coordinator, orchestrating interactions between specialized service classes.

**Key Characteristics:**
- Service layer abstraction (`JiraService`, `XrayApiClient`, `LlmApiClient`) isolates business logic from HTTP details
- Dependency injection pattern: services receive `ErrorHandler` instances to centralize error handling
- Event-driven UI via `EventListenerManager` maintains loose coupling between UI interactions and business logic
- Stepper pattern enforces multi-step workflow validation with state preservation
- Configuration persistence via Chrome's `storage.local` with debounced saves

## Layers

**Core Extension Layer:**
- Purpose: Extension initialization and lifecycle management
- Location: `src/core/`
- Contains: `background.js` (service worker), `content.js` (page injection), `sidepanel.js` (main orchestrator)
- Depends on: Utils (constants, logger), Services (JiraService)
- Used by: Chrome extension system, user interaction

**Service/Business Logic Layer:**
- Purpose: Domain-specific business operations and state management
- Location: `src/services/jiraService.js`
- Contains: Issue caching, test case/plan/execution management, ADF text extraction
- Depends on: API clients (`JiraApiClient`), ErrorHandler
- Used by: `XrayTestGenerator` (sidepanel)

**API Client Layer:**
- Purpose: Raw HTTP communication with external services
- Location: `src/api/`
- Contains: `jiraApiClient.js` (Jira REST API), `xrayApiClient.js` (Xray Cloud GraphQL), `llmApiClient.js` (Google Gemini)
- Depends on: Error handling (fetch error detection)
- Used by: Services layer, main orchestrator

**UI Layer:**
- Purpose: Rendering, state display, user interaction coordination
- Location: `src/ui/`
- Contains: `uiManager.js` (status/progress display), `stepperController.js` (multi-step navigation), `eventListenerManager.js` (event coordination)
- Depends on: DOM utilities, Validation service
- Used by: `XrayTestGenerator` orchestrator

**Utility Layer:**
- Purpose: Cross-cutting utilities and helpers
- Location: `src/utils/`
- Contains: Constants, logging, DOM manipulation, configuration, validation, error handling
- Depends on: i18n (internationalization)
- Used by: All layers

## Data Flow

**Test Generation Pipeline (Happy Path):**

1. **Configuration Phase:** User enters Jira URL, email, API key, custom filters
   - Stored in Chrome `storage.local` via `ConfigManager`
   - Validated by `ValidationService` in real-time

2. **Connection Check:** User clicks "Check Connection"
   - `XrayTestGenerator.checkConnection()` builds JQL query
   - `JiraService.getJqlCount(jql)` fetches issue count
   - `StepperController` enables Step 2 on success

3. **Issue Fetching:** Step 2 — Parameters selection
   - User selects project key, component, fix version (UI updates trigger debounced config save)
   - `JiraService.getIssuesByJql(jql)` retrieves issues matching criteria
   - Issues cached in-memory in `JiraService.cache` to avoid duplicate lookups

4. **Test Case Generation:** Step 3 — Test execution
   - For each issue: `JiraService.findOrCreateTestCase()` creates test issues
   - Optional: `LlmApiClient.generateTestSteps()` calls Gemini API to generate steps (with 429 retry handling)
   - If successful: `XrayApiClient.addTestStep()` inserts steps via GraphQL mutation

5. **Test Plan Linking:** After test cases created
   - `JiraService.findOrCreateTestPlan()` creates/reuses test plan issue
   - `JiraService.linkIssueToTestPlan()` links test cases to test plan
   - Cached in `JiraService.cache.testPlans`

6. **Test Execution Creation:** Final step
   - `JiraService.createTestExecutions()` creates execution issues
   - Linked to test cases with "Relates" link type

**State Management:**

- **In-Memory Cache:** `JiraService.cache` stores lookup results (test cases, plans, executions) to avoid redundant JQL queries
- **Persistent Storage:** Chrome `storage.local` holds user config via `ConfigManager`
- **UI State:** `StepperController` tracks `currentStep`, `connectionVerified` flag; `UIManager` manages visibility of progress/status elements
- **Async Operations:** Generator maintains `jiraService` instance across steps; created fresh on connection check

## Key Abstractions

**JiraService (Business Logic):**
- Purpose: High-level Jira operations without exposing HTTP details
- Examples: `src/services/jiraService.js` methods like `findOrCreateTestCase()`, `addTestStepsToTestCase()`
- Pattern: Delegates HTTP to `JiraApiClient`; maintains internal cache; returns structured `{ result, createdCount, skippedCount }` objects

**JiraApiClient (HTTP Communication):**
- Purpose: Jira REST API wrapper with auth + error handling
- Examples: `src/api/jiraApiClient.js` methods like `getIssuesByJql()`, `makeRequest()`
- Pattern: Base64 auth in every request header; wraps fetch with error translation; handles non-200 statuses

**XrayApiClient (Xray Cloud GraphQL):**
- Purpose: Xray Cloud EU region interaction with 23-hour token caching
- Examples: `src/api/xrayApiClient.js` methods `getToken()`, `addTestStep()`
- Pattern: Token stored in instance variables with expiry check; GraphQL mutation for test steps; requires numeric issue ID (not key)

**LlmApiClient (Gemini Integration):**
- Purpose: AI test step generation with retry logic for rate limits
- Examples: `src/api/llmApiClient.js` method `generateTestSteps()`
- Pattern: Prompt injection with language awareness; 429 response parsing for retry delay; JSON extraction from response

**ErrorHandler (Cross-Cutting):**
- Purpose: Centralized error translation + exponential backoff retry
- Examples: `src/utils/errorHandler.js` methods `handleError()`, `shouldNotRetry()`, `retry()`
- Pattern: Maps HTTP status codes to Polish user messages; distinguishes retriable vs non-retriable errors; exponential backoff (1s, 2s, 4s)

**ValidationService (Cross-Cutting):**
- Purpose: Rules-based field validation with i18n messages
- Examples: `src/utils/validationService.js` field validators for URL, email, API key, JQL
- Pattern: Validator functions return error messages (null = valid); called during step transitions

## Entry Points

**Extension Entry - Background Worker:**
- Location: `src/core/background.js`
- Triggers: Chrome extension installation, icon click, runtime messages
- Responsibilities: Initialize default config on install, open side panel on icon click, handle cross-script messaging (config get/save)

**Extension Entry - Content Script:**
- Location: `src/core/content.js`
- Triggers: When page URL matches `https://*.atlassian.net/*` or `https://*.jira.com/*`
- Responsibilities: Detect Jira page context (issue key, board, project), inject notifications, handle messages from side panel

**Extension Entry - Side Panel UI:**
- Location: `src/core/sidepanel.js` (class `XrayTestGenerator`)
- Triggers: When extension icon clicked or side panel explicitly opened
- Responsibilities: Initialize all services (ConfigManager, UIManager, StepperController, JiraService), orchestrate user interactions, trigger test generation

**Manifest Declaration:**
- Location: `manifest.json`
- Specifies: Background worker path, content scripts, permissions (storage, activeTab, sidePanel), host permissions (Jira, Xray, Gemini), web-accessible resources

## Error Handling

**Strategy:** Layered error translation with exponential backoff retry for transient failures

**Patterns:**

- **API Layer Errors:** `JiraApiClient.makeRequest()` catches fetch errors and HTTP non-200 responses, translates to descriptive Error objects with `.status` and `.body` properties
- **Service Layer Errors:** Caught and passed to `ErrorHandler.handleError()` which translates to Polish user messages; calls `logger.error()`
- **Retry Logic:** `ErrorHandler.shouldNotRetry()` checks status codes (401/403/404 = don't retry; 429/5xx = retry); exponential backoff calculated in `calculateDelay()`
- **Gemini Rate Limiting:** `LlmApiClient` specifically parses 429 responses for `retryDelay` field in error body; retries up to `CONSTANTS.LLM.MAX_RETRIES` times
- **UI Feedback:** `UIManager.log()` appends errors to visible log with color-coded type (error = red); `stepperController.showStepStatus()` displays message in status card

## Cross-Cutting Concerns

**Logging:**

- Implementation: Singleton `logger` instance (`src/utils/logger.js`)
- Dev mode detection: Checks `window.location.hostname` for localhost or chrome-extension protocol
- Levels: `info()`, `debug()` (suppressed in production), `warn()`, `error()` (always shown)
- Usage: All async operations log start/completion via `logger.debug()`; errors logged via `logger.error()`

**Validation:**

- Implementation: `ValidationService` instance in `XrayTestGenerator` constructor
- Rules: Regex-based for email/URL/project key; length checks for API key/JQL; required field checks
- Timing: Real-time on input change (configured fields), explicit on step transitions
- Messages: i18n-translated error strings returned by validators

**Authentication:**

- **Jira:** Basic Auth via `btoa(email:apiKey)` in every request header; user provides email + API key in UI
- **Xray:** OAuth-like flow: POST to `/api/v2/authenticate` with `{client_id, client_secret}` returns plain JWT (cached 23h); Bearer token in subsequent GraphQL requests
- **Gemini:** API key passed as URL query parameter to endpoint `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent`
- **Storage:** All credentials stored in Chrome `storage.local`; never transmitted except in Authorization headers/request bodies

**Internationalization:**

- Implementation: Global `i18n` object (imported from `src/utils/i18n.js`)
- Mechanism: `i18n.t(key, params)` translates strings; `i18n.setLanguage()` changes active language
- Applied to: All user-facing messages in validation, errors, UI labels, log messages, Gemini prompts

---

*Architecture analysis: 2026-03-25*
