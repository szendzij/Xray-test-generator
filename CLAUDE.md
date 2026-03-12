# Xray Test Generator - Chrome Extension

## Architecture
- Manifest V3 Chrome Extension; entry: `src/core/sidepanel.js` (`XrayTestGenerator` class)
- Directory layout: `src/api/` (HTTP clients), `src/services/` (business logic), `src/ui/` (UI layer), `src/utils/` (helpers/constants), `src/core/` (extension entry points), `assets/` (icons), `docs/` (documentation)
- Script load order matters (defined in `sidepanel.html`): src/utils/constants → src/utils/logger → src/utils/domHelper → src/utils/validationService → src/utils/configManager → src/utils/errorHandler → src/api/jiraApiClient → src/services/jiraService → src/api/llmApiClient → src/api/xrayApiClient → src/ui/uiManager → src/ui/stepperController → src/ui/eventListenerManager → src/core/sidepanel.js
- Business logic in `src/services/jiraService.js`, HTTP in `src/api/jiraApiClient.js` (keep them separate)

## Jira API
- Auth: Basic Auth via `btoa(email:apiKey)` in every request header
- Issues fetched with fields: `['summary', 'issuetype', 'priority', 'description', 'assignee', 'reporter', 'labels']` — reporter for assignee mapping, labels copied to Test Case
- `findSingleIssue()` only fetches `['summary']` field — do not expect full issue data from it
- `gh` CLI is NOT installed on this machine — create PRs manually via GitHub URL
- JQL escaping: `summary ~ '"Text here"'` (single quotes wrapping inner double quotes) — escaped backslash-quotes break JQL
- ADF description extraction: `jiraService.extractAdfText(adf)` recursively extracts plain text (max 2000 chars)

## Xray Cloud
- EU region base URL: `https://eu.xray.cloud.getxray.app`
- Auth: `POST /api/v2/authenticate` with `{client_id, client_secret}` → plain JWT string (not JSON); cache 23h
- Steps via GraphQL `POST /api/v2/graphql`, mutation `addTestStep` — requires numeric issue `id`, NOT key
- `import/test/bulk` REST only CREATES new tests — use GraphQL to add steps to existing tests
- `xrayApiClient.js` owns auth + GraphQL (keep separate from `jiraApiClient.js`)

## LLM / Gemini
- Model: `gemini-3.1-flash-lite-preview` (do not change)
- 429 responses include `retryDelay` in error body — parse and wait before retry
- Gemini endpoint: `CONSTANTS.LLM.GEMINI_ENDPOINT`; key from `config.geminiApiKey`

## Code Patterns
- Use spread `...(condition && { field: value })` to conditionally include optional API fields
- Mark runtime-only metadata on objects with `_` prefix (e.g. `_wasExisting`) to distinguish from Jira API fields
- Services return structured objects `{ result, createdCount, skippedCount }` — extend the shape when adding new counters
- ADF descriptions built via `jiraService.buildAdfDoc(...paragraphs)` — use this helper instead of inline ADF literals
- Cache lookups via `jiraService.checkCached(store, key, jql)` — use this helper for any new cache-check/fetch/set patterns

## UI
- All styles live in the `<style>` block of `sidepanel.html` — no separate CSS file
- For visual changes: edit only CSS; never rename or remove HTML element IDs or JS-used class names
- HTML inputs must NOT have hardcoded `value` attributes — placeholders only on first launch; `loadSavedConfig()` restores values from `chrome.storage.local` on subsequent launches

## Environment
- Windows 11, no `gh` CLI — push branch and open PR via GitHub web URL shown in `git push` output
- Any new `fetch()` target must be in `host_permissions` in `manifest.json` — Chrome blocks all other origins (CORS error)
- Worktree path: `.claude/worktrees/dazzling-golick`, main repo: root of `Xray-test-generator`
- Chrome extension loads from the ROOT dir (main branch), NOT from worktrees — fixes must also land on main to be visible in the loaded extension
