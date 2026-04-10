# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture
- Manifest V3 Chrome Extension; entry: `src/core/sidepanel.js` (`XrayTestGenerator` class)
- Directory layout: `src/api/` (HTTP clients), `src/services/` (business logic), `src/ui/` (UI layer), `src/utils/` (helpers/constants), `src/core/` (extension entry points), `assets/` (icons), `docs/` (documentation)
- Script load order matters (defined in `sidepanel.html`): src/utils/constants → src/utils/logger → src/utils/domHelper → src/utils/validationService → src/utils/configManager → src/utils/errorHandler → src/api/jiraApiClient → src/services/jiraService → src/api/llmApiClient → src/api/xrayApiClient → src/ui/uiManager → src/ui/stepperController → src/ui/eventListenerManager → src/core/sidepanel.js
- Business logic in `src/services/jiraService.js`, HTTP in `src/api/jiraApiClient.js` (keep them separate)

## Loading / Testing the Extension
- Chrome → chrome://extensions → Load unpacked → select the repo ROOT dir (not a worktree)
- After editing JS/HTML: click the reload icon on the extension card in chrome://extensions, then close and reopen the side panel
- Fixes must land on `main` to be visible in the loaded extension (Chrome loads from the working tree on disk, not from git)
- `test-config.json` is a local dev reference file; it is not used at runtime

## Jira API
- Auth: Basic Auth via `btoa(email:apiKey)` in every request header
- Issues fetched with fields: `['summary', 'issuetype', 'priority', 'description', 'assignee', 'reporter', 'labels']` — reporter for assignee mapping, labels copied to Test Case
- `findSingleIssue()` only fetches `['summary']` field — do not expect full issue data from it
- `gh` CLI is NOT installed on this machine — create PRs manually via GitHub URL
- JQL escaping: `summary ~ '"Text here"'` (single quotes wrapping inner double quotes) — escaped backslash-quotes break JQL
- ADF description extraction: `jiraService.extractAdfText(adf)` recursively extracts plain text (max 2000 chars); filters out `media`, `mediaSingle`, `mediaGroup`, `mediaInline`, `hardBreak`, `emoji`, `mention` nodes — always use this filter on any write path too
- Search fallback strategy in `jiraApiClient.searchIssues()`: GET → POST → POST without fields (handles different Jira API versions)

## Xray Cloud
- EU region base URL: `https://eu.xray.cloud.getxray.app`
- Auth: `POST /api/v2/authenticate` with `{client_id, client_secret}` → plain JWT string (not JSON); cache 23h
- Steps via GraphQL `POST /api/v2/graphql`, mutation `addTestStep` — requires numeric issue `id`, NOT key
- `import/test/bulk` REST only CREATES new tests — use GraphQL to add steps to existing tests
- `xrayApiClient.js` owns auth + GraphQL (keep separate from `jiraApiClient.js`)
- Adding tests to an execution: `POST /api/v2/testexec/{key}/test` with `{ add: [keys] }` (REST, not GraphQL)
- `jiraApiClient.addTestStep()` is a bridge that delegates to `xrayApiClient.addTestStep()` — wire via `jiraApiClient.setXrayClient(xrayApiClient)` before use

## LLM / Gemini
- Model: `gemini-3.1-flash-lite-preview` (do not change)
- 429 responses include `retryDelay` in error body — parse and wait before retry
- Gemini endpoint: `CONSTANTS.LLM.GEMINI_ENDPOINT`; key from `config.geminiApiKey`
- Generates 3–7 happy-path manual test steps per issue; language follows `i18n.lang` at call time

## Generation Pipeline (6 stages)
`generateTests()` in `sidepanel.js` orchestrates:
1. Fetch issues via JQL
2. Create Test Cases (skips if linked Test already exists via `checkExistingTestCase()`)
2.5. (Optional) Generate AI test steps via Gemini — only when `config.useAiSteps && config.geminiApiKey`
3. Create or get Test Plan (keyed by `projectKey + fixVersion`)
4. Link Test Cases → Test Plan
5. Create Test Executions — prefixes `['[RC]', '[PROD]']` from `CONSTANTS.TEST_EXECUTION.PREFIXES`; skips if already exist
6. Link Test Cases → Test Executions + register in Xray via `xrayApiClient.addTestsToExecution()`

## Code Patterns
- Use spread `...(condition && { field: value })` to conditionally include optional API fields
- Mark runtime-only metadata on objects with `_` prefix (e.g. `_wasExisting`) to distinguish from Jira API fields
- Services return structured objects `{ result, createdCount, skippedCount }` — extend the shape when adding new counters
- ADF descriptions built via `jiraService.buildAdfDoc(...paragraphs)` — use this helper instead of inline ADF literals
- Cache lookups via `jiraService.checkCached(store, key, jql)` — use this helper for any new cache-check/fetch/set patterns
- All DOM reads/writes go through `DOMHelper`: `getValue(id)`, `setValue(id, val)`, `setText(id, text)`, `showElement(id)`, `hideElement(id)`

## i18n
- `src/utils/i18n.js` — IIFE module; default language Polish (`pl`), also supports English (`en`)
- All UI strings must go through `i18n.t('key', { param })` — never hardcode user-visible text in JS
- Static HTML text uses `data-i18n="key"` attributes; placeholders use `data-i18n-placeholder="key"`
- Add new strings to both `pl` and `en` translation objects in `i18n.js`
- Language preference stored in `localStorage` under key `xray-lang`

## Config Storage
- `chrome.storage.local` keys: `jiraUrl`, `jiraEmail`, `jiraApiKey`, `customJql`, `customProjectKey`, `customComponentName`, `customFixVersion`, `geminiApiKey`, `useAiSteps`, `xrayClientId`, `xrayClientSecret`
- `configManager.getConfig()` reads live DOM values (not storage) — returns the current field values at call time
- `configManager.loadSavedConfig()` restores persisted values into DOM inputs on panel open

## UI
- All styles live in the `<style>` block of `sidepanel.html` — no separate CSS file
- For visual changes: edit only CSS; never rename or remove HTML element IDs or JS-used class names
- HTML inputs must NOT have hardcoded `value` attributes — placeholders only on first launch; `loadSavedConfig()` restores values from `chrome.storage.local` on subsequent launches

## Environment
- Windows 11, no `gh` CLI — push branch and open PR via GitHub web URL shown in `git push` output
- Any new `fetch()` target must be in `host_permissions` in `manifest.json` — Chrome blocks all other origins (CORS error)
- Chrome extension loads from the ROOT dir (main branch), NOT from worktrees — fixes must also land on main to be visible in the loaded extension
