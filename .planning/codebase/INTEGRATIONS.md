# External Integrations

**Analysis Date:** 2026-03-25

## APIs & External Services

**Jira Cloud:**
- Service: Jira Cloud REST API v3
- What it's used for: Fetching issues, creating test cases, test plans, test executions, linking issues, searching via JQL
- SDK/Client: Custom HTTP client in `src/api/jiraApiClient.js`
- Auth: Basic Auth via `btoa(email:apiKey)` in Authorization header
- Base URL: User-provided (e.g., `https://wfirma.atlassian.net`)
- Key endpoints:
  - `POST /rest/api/3/search/jql` - Search issues with JQL
  - `POST /rest/api/3/search/approximate-count` - Get JQL result count
  - `POST /rest/api/3/issue` - Create issues (test cases, test plans, test executions)
  - `POST /rest/api/3/issueLink` - Link issues
  - `GET /rest/api/3/issue/{key}` - Fetch single issue
- Fields fetched: `['summary', 'issuetype', 'priority', 'description', 'assignee', 'reporter', 'labels']`
- Retry logic: Implemented in `src/utils/errorHandler.js` with exponential backoff

**Google Generative Language (Gemini):**
- Service: Google Gemini API (text generation)
- What it's used for: AI-powered test step generation from issue descriptions
- SDK/Client: Custom HTTP client in `src/api/llmApiClient.js`
- Auth: API key in query parameter (`?key={apiKey}`)
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent`
- Model: `gemini-3.1-flash-lite-preview` (hardcoded, do not change)
- Features:
  - Generates 3-7 test steps in JSON format (action, data, result)
  - Supports bilingual output (Polish or English based on UI language)
  - Implements 429 (rate limit) retry logic with `retryDelay` parsing from response
  - Max 3 retry attempts with fallback delay of 20 seconds
  - Temperature: 0.2 (low variance for consistency)
  - Max output tokens: 1024

**Xray Cloud:**
- Service: Xray Test Management Cloud
- What it's used for: Adding test steps to test cases via GraphQL
- SDK/Client: Custom HTTP client in `src/api/xrayApiClient.js`
- Auth: JWT token from POST `/api/v2/authenticate` with `client_id` and `client_secret`
- Base URL: `https://eu.xray.cloud.getxray.app` (EU region hardcoded)
- Token caching: Tokens cached for 23 hours (24h expiry - 1h buffer)
- Key endpoints:
  - `POST /api/v2/authenticate` - Get JWT token (plain text response, not JSON)
  - `POST /api/v2/graphql` - GraphQL mutations for adding test steps
- GraphQL mutation: `addTestStep(issueId, step)` - adds action/data/result to test case
- Requirements:
  - Requires numeric Jira issue ID (not key)
  - Only adds steps to existing tests — REST bulk import used only for creating new test cases

## Data Storage

**Databases:**
- None — No database server required
- All data comes from Jira Cloud (read/write) or Xray Cloud (write-only)

**File Storage:**
- Local filesystem only: `chrome.storage.local` (browser's local storage)
- Stores configuration (URLs, emails, API keys)
- Not synced across browsers
- Test data created in Jira/Xray, not stored locally

**Caching:**
- Configuration cache: `chrome.storage.local` (indefinite, user-managed)
- Issue cache: In-memory during session in `JiraService.cache` (Map objects for testCases, testPlans, testExecutions)
- Xray token cache: In-memory in `XrayApiClient._token` with 23h expiry

## Authentication & Identity

**Jira:**
- Provider: Atlassian Cloud (user email + API token)
- Implementation: Basic Auth (`Authorization: Basic btoa(email:apiKey)`)
- Scope: Full access to issues, links, and custom fields
- Config keys: `jiraEmail`, `jiraApiKey`

**Xray Cloud:**
- Provider: Xray Cloud OAuth2 (client credentials)
- Implementation: JWT bearer token from client_id/client_secret
- Scope: Create and modify test steps
- Config keys: `xrayClientId`, `xrayClientSecret`
- Token: Cached in memory, refreshed on expiry (23h cache, 24h actual expiry)

**Google Gemini:**
- Provider: Google AI Studio
- Implementation: API key in query parameter
- Scope: Text generation only (no data access)
- Config key: `geminiApiKey`

## Monitoring & Observability

**Error Tracking:**
- Custom error handler in `src/utils/errorHandler.js`
- No external error tracking service (Sentry, Rollbar, etc.)
- Errors logged to console and UI

**Logs:**
- Console logging via custom `Logger` class in `src/utils/logger.js`
- Log levels: debug, info, warn, error
- No persistent logging or external log aggregation

**Alerts:**
- UI-based error notifications via `src/ui/uiManager.js`
- Status messages shown in sidepanel to user

## CI/CD & Deployment

**Hosting:**
- Chrome Web Store (manual upload or automated CI)
- Runs locally in user's Chrome browser (no server deployment)
- Extension loaded from filesystem during development

**CI Pipeline:**
- None detected — No GitHub Actions, Jenkins, or CI config files
- Manual testing and deployment via Chrome extension packaging
- Git history shows direct commits to main branch

## Environment Configuration

**Required env vars (stored in chrome.storage.local):**
- `jiraUrl` - Jira instance URL (e.g., https://wfirma.atlassian.net)
- `jiraEmail` - Atlassian Cloud email
- `jiraApiKey` - Atlassian API token (minimum 10 characters)
- `geminiApiKey` - Google Gemini API key (optional, for AI step generation)
- `xrayClientId` - Xray Cloud client ID (optional, for Xray integration)
- `xrayClientSecret` - Xray Cloud client secret (optional, for Xray integration)

**Custom JQL filters (optional):**
- `customJql` - Custom JQL query for issue search
- `customProjectKey` - Project key override
- `customComponentName` - Component filter for test cases
- `customFixVersion` - Fix version filter for test cases

**Secrets location:**
- Stored in browser's `chrome.storage.local` (encrypted by Chrome)
- Populated via UI form in sidepanel (no .env files)
- Never persisted to disk in plaintext

**Feature flags:**
- `useAiSteps` - Enable/disable Gemini step generation (stored as 'true'/'false' string)

## Webhooks & Callbacks

**Incoming:**
- None — Extension is client-only, no server endpoints

**Outgoing:**
- None configured — Only direct API calls to Jira, Xray, and Gemini
- No webhooks for event notifications

## Host Permissions (from manifest.json)

Chrome requires explicit host_permissions for fetch() to work:

```json
"host_permissions": [
  "https://*.atlassian.net/*",        // Jira Cloud
  "https://*.jira.com/*",             // Jira Cloud variants
  "https://generativelanguage.googleapis.com/*",  // Google Gemini
  "https://eu.xray.cloud.getxray.app/*"  // Xray Cloud EU
]
```

If adding new external APIs, update this list in `manifest.json` or Chrome will block requests with CORS errors.

## API Rate Limiting & Retry Strategy

**Jira API:**
- Rate limit: 60 requests/minute per user
- Retry strategy: Exponential backoff via `ErrorHandler.withRetry()` in `src/utils/errorHandler.js`
- Timeout: Not explicitly set, uses browser default

**Gemini API:**
- Rate limit: 429 responses include `retryDelay` in error body
- Retry strategy: Parse `retryDelay` from error, wait, and retry up to 3 times
- Fallback delay: 20 seconds if parsing fails
- Logic in `LlmApiClient.generateTestSteps()` and `_parseRetryDelay()`

**Xray Cloud API:**
- Rate limit: Not documented
- Retry strategy: No explicit retry logic; inherits from base request logic
- Token refresh: Automatic when expired

---

*Integration audit: 2026-03-25*
