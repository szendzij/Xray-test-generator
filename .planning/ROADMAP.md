# Roadmap: Xray Test Generator v2

**Created:** 2026-03-25
**Milestone:** v2.1 — Reliability & Xray Integration

---

## Phase 1 — Fix ADF Description Extraction

**Goal:** AI test step generation no longer fails when Jira issues contain embedded images or attachment-heavy descriptions.

**Covers:** ADF-01, ADF-02, ADF-03

### Plans

1. **Harden `extractAdfText` in `jiraService.js`**
   - Explicitly skip node types: `media`, `mediaSingle`, `mediaGroup`, `mediaInline`, `hardBreak`, `emoji`, `mention`
   - Return only meaningful text from `paragraph`, `heading`, `bulletList`, `orderedList`, `listItem`, `text` nodes
   - After extraction: if result is empty or < 20 chars, return `null` instead of empty string

2. **Handle null/empty description in `sidepanel.js` `generateAiTestSteps`**
   - If `extractAdfText` returns `null`, pass `null` as description to `generateTestSteps`
   - `llmApiClient.js` already handles `null` description with `noDescriptionLabel` fallback — verify it works correctly

**Verification:** Generate steps for an issue whose description is only an embedded image — should not throw error, should use fallback label.

---

## Phase 2 — Xray API: Add Tests to Test Execution

**Goal:** Test cases are properly registered in Xray test executions (visible as test runs), not just linked as Jira issues.

**Covers:** XRAY-01, XRAY-02, XRAY-03, XRAY-04

### Plans

1. **Add `addTestsToExecution(testExecKey, testCaseKeys)` to `xrayApiClient.js`**
   - `POST /api/v2/testexec/{testExecKey}/test`
   - Body: `{"add": [...testCaseKeys]}`
   - Uses existing `getToken()` Bearer JWT
   - Returns parsed response or throws on non-2xx

2. **Call Xray execution link in `jiraService.js` `ensureTestExecutions` or new method**
   - New method `addTestsToTestExecution(testExecKey, testCases)` in `jiraService.js`
   - Collects test case keys, calls `xrayApiClient.addTestsToExecution`
   - Logs warning on failure, does not throw (consistent with current style)

3. **Wire up in `sidepanel.js` `linkTestCasesToExecutions`**
   - After current `linkTestCasesToIssue` calls, also call Xray API method if `xrayApiClient` is configured
   - Add `PROGRESS` constant slot and log messages for this step
   - Update `manifest.json` `host_permissions` if needed (Xray base URL already listed: `https://eu.xray.cloud.getxray.app/*`)

**Verification:** After generation, open Xray test execution in Jira — tests should appear as actual test runs (green/red/pending status), not just Jira links.

---

## Milestone Complete When

- [ ] Phase 1 verified: AI steps generated without errors for attachment-heavy issues
- [ ] Phase 2 verified: Tests appear as runs in Xray execution board, not just linked issues
