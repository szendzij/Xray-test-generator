# Phase 2: Xray API — Add Tests to Test Execution - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Add `addTestsToExecution(testExecKey, testCaseKeys[])` to `xrayApiClient.js` and wire it into `sidepanel.js:linkTestCasesToExecutions()` so that after each test execution is created, its test cases are registered in Xray as actual test runs (visible on the Xray execution board with green/red/pending status).

This phase does NOT change the Jira issue link behavior, the test case creation flow, or any UI layout.

</domain>

<decisions>
## Implementation Decisions

### Jira Links vs. Xray REST
- **D-01:** Keep **both** — Jira issue link (`linkTestCasesToIssue`) AND Xray REST call (`addTestsToExecution`) run for each execution. They serve different purposes: Jira link creates a visible "is tested by" relationship in Jira UI; Xray REST registers tests as runnable test runs on the execution board.

### Guard Condition (missing Xray credentials)
- **D-02:** **Silently skip** the Xray REST call when `xrayApiClient` is null or not configured. No log message — consistent with the extension being usable in Jira-only mode. The Jira issue link still runs normally.

### Method placement
- **D-03:** New method `addTestsToExecution(testExecKey, testCaseKeys[])` lives in `xrayApiClient.js` (HTTP concern), not `jiraService.js` — consistent with existing separation: HTTP in api/, business logic in services/.
- **D-04:** Call site is `sidepanel.js:linkTestCasesToExecutions()` — after the existing `linkTestCasesToIssue` call, within the same per-execution loop.

### Batching
- **D-05:** All test case keys sent in a **single request** per execution (`{"add": [...allKeys]}`). No per-key iteration. (XRAY-03)

### Error handling
- **D-06:** Failure to register tests in Xray logs a **warning** (via `logger.warn`) but does not throw — overall generation continues. (XRAY-04)

### Claude's Discretion
- Exact log message wording for the Xray registration step
- Whether to add a PROGRESS constant for this step or reuse existing values

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core implementation files
- `src/api/xrayApiClient.js` — existing client; add `addTestsToExecution` here alongside `addTestStep`
- `src/core/sidepanel.js` lines 411–422 — `linkTestCasesToExecutions()` is the call site; Xray call goes here after `linkTestCasesToIssue`
- `src/services/jiraService.js` — `linkTestCasesToIssue()` stays unchanged; Xray REST does not go through jiraService

### API reference (in-code comments / CLAUDE.md)
- `CLAUDE.md` §"Xray Cloud" — EU base URL, auth pattern (`POST /api/v2/authenticate` → plain JWT), note that `import/test/bulk` only creates new tests (not relevant here)
- `manifest.json` — `host_permissions` already includes `https://eu.xray.cloud.getxray.app/*`; no changes needed

### Requirements
- `.planning/REQUIREMENTS.md` — XRAY-01, XRAY-02, XRAY-03, XRAY-04 are the acceptance criteria for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `xrayApiClient.getToken()` — Bearer JWT already implemented and cached 23h; `addTestsToExecution` must call this same method
- `sidepanel.js:linkTestCasesToExecutions()` (lines 411–422) — existing loop over executions; Xray call slots in here
- `logger.warn()` — existing pattern for non-fatal failures in services

### Established Patterns
- HTTP calls in `xrayApiClient.js` follow: `getToken()` → `fetch()` with `Authorization: Bearer {token}` → check `response.ok` → throw on error
- Non-fatal errors in the generation flow use `logger.warn` and continue (don't throw)
- `xrayApiClient` availability: checked via `this.xrayApiClient` in `sidepanel.js` — if null, skip silently

### Integration Points
- `sidepanel.js:linkTestCasesToExecutions()` — add Xray call after line 420 (existing `linkTestCasesToIssue` call), wrapped in `if (this.xrayApiClient)` guard
- `xrayApiClient.js` — new REST method sits alongside existing `addTestStep` (GraphQL) method

### Xray REST endpoint
- `POST https://eu.xray.cloud.getxray.app/api/v2/testexec/{testExecKey}/test`
- Body: `{ "add": ["TEST-1", "TEST-2", ...] }`
- Headers: `Authorization: Bearer {token}`, `Content-Type: application/json`
- Returns 200 on success; non-2xx should trigger `logger.warn` and continue

</code_context>

<specifics>
## Specific Ideas

- No UI changes — this is a pure API call wired into existing flow
- Verification: open Xray execution board after generation — tests should appear with pending status (not just visible as Jira links)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-xray-api-add-tests-to-test-execution*
*Context gathered: 2026-03-25*
