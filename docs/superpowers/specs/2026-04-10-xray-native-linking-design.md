# Design: Xray Native API Linking

**Date:** 2026-04-10  
**Status:** Approved

## Problem

All linking operations (Test Coverage, Test → Test Plan, Test → Execution, Execution → Test Plan) currently use Jira issue links with type `"Relates"`. This means:
- The **Test Coverage** panel on the original Jira issue shows "UNCOVERED" even after test generation
- Xray-native relationships (test plan membership, execution membership) are not registered in Xray — only Jira traceability links exist

## Goal

Use Xray Cloud REST API for all four linking operations, with silent fallback to Jira issue links when Xray credentials are absent or the API call fails.

## Decisions

| Question | Decision |
|---|---|
| Xray + Jira both, or one or the other? | Xray primary, Jira fallback (option C) |
| Fallback for Test Coverage without Xray credentials? | Change Jira link type from `"Relates"` to `"Tests"` — Xray reads this automatically as Test Coverage |
| Xray API failure visibility? | Silent: `logger.warn()` only, no UI message |

## Architecture

### 1. New methods in `src/api/xrayApiClient.js`

Three new REST methods, all following the existing `addTestsToExecution` pattern (Bearer token via `getToken()`):

| Method | Endpoint | Payload |
|---|---|---|
| `addTestRequirement(testKey, reqKey)` | `POST /api/v2/test/{testKey}/requirement` | `{ add: [reqKey] }` |
| `addTestsToTestPlan(planKey, testKeys[])` | `POST /api/v2/testplan/{planKey}/test` | `{ add: testKeys }` |
| `addExecutionsToTestPlan(planKey, execKeys[])` | `POST /api/v2/testplan/{planKey}/testexecution` | `{ add: execKeys }` |

### 2. `src/utils/constants.js`

Add new constant group:
```js
LINK_TYPES: {
    TESTS: 'Tests'   // Xray-specific link type; establishes Test Coverage
}
```
`TEST_EXECUTION.LINK_TYPE = 'Relates'` remains unchanged (used for generic traceability fallbacks).

### 3. `src/services/jiraService.js` — linking responsibility extracted

Two linking calls are removed from the service and moved to `sidepanel.js` so the caller controls the Xray-primary/Jira-fallback pattern:

- **`createTestCase()`**: remove `await this.apiClient.linkIssues(response.key, issue.key)` — only creates and returns the Test issue
- **`ensureTestExecutions()`**: remove `await this.apiClient.linkIssues(execution.key, testPlan.key)` — only creates and returns executions

### 4. `src/core/sidepanel.js` — four updated call sites

All four use the same pattern:

```
if xrayApiClient available:
    try Xray API call
    on success → return (skip Jira)
    on failure → logger.warn + Jira fallback
else:
    Jira fallback
```

#### `createTestCases()` — Test Coverage per new test case

After `testCases.push(testCase)`:
- **Xray primary**: `xrayApiClient.addTestRequirement(testCase.key, issue.key)`
- **Jira fallback**: `jiraService.apiClient.linkIssues(testCase.key, issue.key, CONSTANTS.LINK_TYPES.TESTS)`

Note: link type changes from `"Relates"` → `"Tests"` even in the Jira fallback path so Test Coverage appears regardless.

#### `linkTestCasesToPlan()` — Tests → Test Plan

- **Xray primary**: `xrayApiClient.addTestsToTestPlan(testPlan.key, keys)` — one batch call
- **Xray success**: early return, no Jira links
- **Jira fallback**: existing `jiraService.linkTestCasesToIssue(testCases, testPlan.key)` (individual links per test)

#### `createTestExecutions()` — Executions → Test Plan

After `ensureTestExecutions()` returns, for each newly created execution (where `!e._wasExisting`):
- **Xray primary**: `xrayApiClient.addExecutionsToTestPlan(testPlan.key, newExecKeys)` — batch
- **Jira fallback**: `jiraService.apiClient.linkIssues(execKey, testPlan.key)` per key

#### `linkTestCasesToExecutions()` — Tests → Execution (refactor of existing)

Currently calls **both** Jira links and Xray API. Refactored to Xray-primary:
- **Xray primary**: `xrayApiClient.addTestsToExecution(execution.key, keys)` (existing method)
- **Xray success**: skip Jira link
- **Jira fallback**: `jiraService.linkTestCasesToIssue(testCases, execution.key)`

## Data Flow (updated stage 6 area)

```
Stage 2 — per test case created:
  → addTestRequirement(testKey, sourceIssueKey)  [Xray]
  → OR linkIssues(testKey, sourceIssueKey, 'Tests')  [Jira fallback]

Stage 4 — after all test cases created:
  → addTestsToTestPlan(planKey, allTestKeys)  [Xray, one batch]
  → OR linkTestCasesToIssue(testCases, planKey)  [Jira fallback, per-item]

Stage 5 — after executions created (new executions only):
  → addExecutionsToTestPlan(planKey, newExecKeys)  [Xray, one batch]
  → OR linkIssues(execKey, planKey)  [Jira fallback, per-item]

Stage 6 — per execution:
  → addTestsToExecution(execKey, testKeys)  [Xray, existing]
  → OR linkTestCasesToIssue(testCases, execKey)  [Jira fallback]
```

## Affected Files

| File | Change type |
|---|---|
| `src/api/xrayApiClient.js` | Add 3 methods |
| `src/utils/constants.js` | Add `LINK_TYPES.TESTS` |
| `src/services/jiraService.js` | Remove 2 `linkIssues` calls |
| `src/core/sidepanel.js` | Update 4 call sites |

No changes to: `sidepanel.html`, `manifest.json`, `jiraApiClient.js`, `uiManager.js`, `i18n.js`.

## Error Handling

**Xray success** — log to `uiManager.log()` at `'success'` level (same as existing `addTestsToExecution`). User sees the Xray operation confirmed in the execution log.

**Xray failure** — caught silently: `logger.warn()` only, no UI message. Jira fallback runs automatically and its result is logged as normal.

```js
try {
    await this.xrayApiClient.addTestsToTestPlan(planKey, keys);
    this.uiManager.log(`Linked ${keys.length} test(s) to Test Plan ${planKey} via Xray`, 'success');
    return;
} catch (err) {
    logger.warn(`Xray addTestsToTestPlan failed: ${err.message}`);
    // fall through to Jira fallback — its result is logged by logLinkResult()
}
```
