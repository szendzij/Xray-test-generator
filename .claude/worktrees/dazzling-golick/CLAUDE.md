# Xray Test Generator - Chrome Extension

## Architecture
- Manifest V3 Chrome Extension; entry: `sidepanel.js` (`XrayTestGenerator` class)
- Script load order matters (defined in `sidepanel.html`): constants → logger → domHelper → validationService → configManager → errorHandler → jiraApiClient → jiraService → uiManager → stepperController → eventListenerManager → sidepanel.js
- Business logic in `jiraService.js`, HTTP in `jiraApiClient.js` (keep them separate)

## Jira API
- Auth: Basic Auth via `btoa(email:apiKey)` in every request header
- Issues fetched with fields: `['summary', 'issuetype', 'priority', 'description', 'assignee', 'reporter', 'labels']` — reporter for assignee mapping, labels copied to Test Case
- `findSingleIssue()` only fetches `['summary']` field — do not expect full issue data from it
- `gh` CLI is NOT installed on this machine — create PRs manually via GitHub URL

## Code Patterns
- Use spread `...(condition && { field: value })` to conditionally include optional API fields
- Mark runtime-only metadata on objects with `_` prefix (e.g. `_wasExisting`) to distinguish from Jira API fields
- Services return structured objects `{ result, createdCount, skippedCount }` — extend the shape when adding new counters
- `switchJqlMode(mode)` has an early-return guard `if (this.jqlMode === mode) return` — never pre-set `this.jqlMode` before calling it, or the DOM update will be skipped
- ADF descriptions built via `jiraService.buildAdfDoc(...paragraphs)` — use this helper instead of inline ADF literals
- Cache lookups via `jiraService.checkCached(store, key, jql)` — use this helper for any new cache-check/fetch/set patterns

## UI
- All styles live in the `<style>` block of `sidepanel.html` — no separate CSS file
- For visual changes: edit only CSS; never rename or remove HTML element IDs or JS-used class names
- `CONSTANTS.STORAGE.KEYS` includes `jqlMode` (non-DOM key) — exclude it in any loop calling `DOMHelper.setValue()`

## Environment
- Windows 11, no `gh` CLI — push branch and open PR via GitHub web URL shown in `git push` output
- Worktree path: `.claude/worktrees/dazzling-golick`, main repo: root of `Xray-test-generator`
- Chrome extension loads from the ROOT dir (main branch), NOT from worktrees — fixes must also land on main to be visible in the loaded extension
