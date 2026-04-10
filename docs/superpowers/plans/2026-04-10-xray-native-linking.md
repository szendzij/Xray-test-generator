# Xray Native API Linking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Jira "Relates" issue links with Xray Cloud REST API calls for all four linking operations (Test Coverage, Tests→Plan, Executions→Plan, Tests→Execution), with silent fallback to Jira links when Xray credentials are absent or the API call fails.

**Architecture:** Three new methods added to `XrayApiClient`; two `linkIssues` calls extracted from `JiraService` into `sidepanel.js`; four call sites in `sidepanel.js` refactored to try Xray API first, fall back silently to Jira. No new files, no HTML changes.

**Tech Stack:** Vanilla JS ES6 classes, Chrome Extension Manifest V3, Xray Cloud REST API v2, Jira REST API v3. No test runner — verification is manual via Chrome extension reload.

> **Testing note:** This codebase has no automated test framework. Each task ends with a manual verification step: reload the extension in Chrome (`chrome://extensions` → reload icon) then reopen the side panel and run a generation.

---

## File Map

| File | Change |
|---|---|
| `src/utils/constants.js` | Add `LINK_TYPES.TESTS` constant |
| `src/api/xrayApiClient.js` | Add `addTestRequirement`, `addTestsToTestPlan`, `addExecutionsToTestPlan` |
| `src/services/jiraService.js` | Remove `linkIssues` from `createTestCase()` and `ensureTestExecutions()` |
| `src/core/sidepanel.js` | Update `createTestCases()`, `linkTestCasesToPlan()`, `createTestExecutions()`, `linkTestCasesToExecutions()` |

---

## Task 1: Add `LINK_TYPES` constant

**Files:**
- Modify: `src/utils/constants.js`

- [ ] **Step 1: Add the constant**

In `src/utils/constants.js`, after the `ISSUE_TYPES` block at the end of the `CONSTANTS` object, add `LINK_TYPES`:

```js
    ISSUE_TYPES: {
        TEST: 'Test',
        TEST_PLAN: 'Test Plan',
        TEST_EXECUTION: 'Test Execution'
    },
    LINK_TYPES: {
        TESTS: 'Tests'   // Xray-specific link type; establishes Test Coverage on source issue
    }
```

The closing `};` of the `CONSTANTS` object follows after `LINK_TYPES`.

- [ ] **Step 2: Verify the file parses**

Open Chrome DevTools console on any tab and paste:
```js
const c = { LINK_TYPES: { TESTS: 'Tests' } };
console.log(c.LINK_TYPES.TESTS); // expected: "Tests"
```
No errors expected.

- [ ] **Step 3: Commit**

```bash
git add src/utils/constants.js
git commit -m "feat: add LINK_TYPES.TESTS constant for Xray Test Coverage link type"
```

---

## Task 2: Add three new methods to `XrayApiClient`

**Files:**
- Modify: `src/api/xrayApiClient.js`

- [ ] **Step 1: Add `addTestRequirement`**

In `src/api/xrayApiClient.js`, after the closing `}` of the `addTestsToExecution` method (line ~102), add:

```js
    async addTestRequirement(testKey, requirementKey) {
        const token = await this.getToken();
        const response = await fetch(`${this.baseUrl}/api/v2/test/${testKey}/requirement`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ add: [requirementKey] })
        });
        if (!response.ok) {
            throw new Error(`Xray addTestRequirement failed for ${testKey} (${response.status})`);
        }
        return response.json().catch(() => null);
    }
```

- [ ] **Step 2: Add `addTestsToTestPlan`**

Directly after `addTestRequirement`:

```js
    async addTestsToTestPlan(planKey, testKeys) {
        const token = await this.getToken();
        const response = await fetch(`${this.baseUrl}/api/v2/testplan/${planKey}/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ add: testKeys })
        });
        if (!response.ok) {
            throw new Error(`Xray addTestsToTestPlan failed for ${planKey} (${response.status})`);
        }
        return response.json().catch(() => null);
    }
```

- [ ] **Step 3: Add `addExecutionsToTestPlan`**

Directly after `addTestsToTestPlan`:

```js
    async addExecutionsToTestPlan(planKey, execKeys) {
        const token = await this.getToken();
        const response = await fetch(`${this.baseUrl}/api/v2/testplan/${planKey}/testexecution`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ add: execKeys })
        });
        if (!response.ok) {
            throw new Error(`Xray addExecutionsToTestPlan failed for ${planKey} (${response.status})`);
        }
        return response.json().catch(() => null);
    }
```

- [ ] **Step 4: Verify structure**

The end of `xrayApiClient.js` should look like this (method order):
```
getToken()
addTestStep()
addTestsToExecution()
addTestRequirement()       ← new
addTestsToTestPlan()       ← new
addExecutionsToTestPlan()  ← new
```
The class closing `}` follows after `addExecutionsToTestPlan`.

- [ ] **Step 5: Commit**

```bash
git add src/api/xrayApiClient.js
git commit -m "feat: add addTestRequirement, addTestsToTestPlan, addExecutionsToTestPlan to XrayApiClient"
```

---

## Task 3: Extract linking from `JiraService`

**Files:**
- Modify: `src/services/jiraService.js`

- [ ] **Step 1: Remove `linkIssues` from `createTestCase()`**

In `src/services/jiraService.js`, find this block near line 125:
```js
        const response = await this.apiClient.createIssue(testCaseData);
        await this.apiClient.linkIssues(response.key, issue.key);
        return response;
```

Remove the `linkIssues` line so it becomes:
```js
        const response = await this.apiClient.createIssue(testCaseData);
        return response;
```

- [ ] **Step 2: Remove `linkIssues` from `ensureTestExecutions()`**

In the same file, find this block near line 198:
```js
            execution = await this.apiClient.createIssue(testExecutionData);
            execution._wasExisting = false;

            executions.push(execution);
            createdCount += 1;

            // Link execution to test plan via issue link for traceability
            await this.apiClient.linkIssues(execution.key, testPlan.key);
```

Remove the comment and the `linkIssues` line so it becomes:
```js
            execution = await this.apiClient.createIssue(testExecutionData);
            execution._wasExisting = false;

            executions.push(execution);
            createdCount += 1;
```

- [ ] **Step 3: Commit**

```bash
git add src/services/jiraService.js
git commit -m "refactor: extract linkIssues calls from createTestCase and ensureTestExecutions into caller"
```

---

## Task 4: Wire Test Coverage in `createTestCases()`

**Files:**
- Modify: `src/core/sidepanel.js`

- [ ] **Step 1: Add Test Coverage linking after each new test case**

In `src/core/sidepanel.js`, find this block inside the `createTestCases()` method (inside the `if (testCase)` block):

```js
                if (testCase) {
                    testCases.push(testCase);
                    issueMap.set(testCase.key, issue);
                    createdCount++;
                    this.uiManager.log(i18n.t('msg.testCaseCreated', { key: testCase.key, issueKey: issue.key }), 'success');
                } else {
```

Replace with:

```js
                if (testCase) {
                    testCases.push(testCase);
                    issueMap.set(testCase.key, issue);
                    createdCount++;
                    this.uiManager.log(i18n.t('msg.testCaseCreated', { key: testCase.key, issueKey: issue.key }), 'success');

                    // Link test to original issue as Test Coverage
                    if (this.xrayApiClient) {
                        try {
                            await this.xrayApiClient.addTestRequirement(testCase.key, issue.key);
                            this.uiManager.log(`Linked ${testCase.key} → ${issue.key} as Test Coverage (Xray)`, 'success');
                        } catch (err) {
                            logger.warn(`Xray addTestRequirement failed for ${testCase.key}: ${err.message}`);
                            await this.jiraService.apiClient.linkIssues(testCase.key, issue.key, CONSTANTS.LINK_TYPES.TESTS);
                        }
                    } else {
                        await this.jiraService.apiClient.linkIssues(testCase.key, issue.key, CONSTANTS.LINK_TYPES.TESTS);
                    }
                } else {
```

- [ ] **Step 2: Reload and verify (without Xray credentials)**

1. Go to `chrome://extensions` → reload the extension
2. Reopen the side panel
3. Fill credentials (no Xray Client ID/Secret)
4. Run generation on 1 issue
5. In the execution log you should see: `✅ Utworzono Test Case: XXX dla zadania YYY`
6. Open the source Jira issue → **Test Coverage** section should show the new test (it used the `"Tests"` Jira link type)

- [ ] **Step 3: Commit**

```bash
git add src/core/sidepanel.js
git commit -m "feat: link created tests to source issue as Test Coverage (Xray primary, Jira Tests fallback)"
```

---

## Task 5: Refactor `linkTestCasesToPlan()` to Xray primary

**Files:**
- Modify: `src/core/sidepanel.js`

- [ ] **Step 1: Replace the method body**

Find the entire `linkTestCasesToPlan` method:

```js
    async linkTestCasesToPlan(testCases, testPlan) {
        if (testCases.length === 0) {
            this.uiManager.log(i18n.t('msg.noNewCasesToLink'), 'info');
            return;
        }

        this.setStage(i18n.t('msg.stage4', { count: testCases.length }));
        this.uiManager.log(i18n.t('msg.step4'), 'info');
        const linkResult = await this.jiraService.linkTestCasesToIssue(testCases, testPlan.key);
        this.logLinkResult(linkResult, `Test Plan ${testPlan.key}`);
        this.uiManager.showProgress(CONSTANTS.PROGRESS.LINK_TEST_CASES, i18n.t('msg.linkedCount', { count: linkResult.linked }));
    }
```

Replace with:

```js
    async linkTestCasesToPlan(testCases, testPlan) {
        if (testCases.length === 0) {
            this.uiManager.log(i18n.t('msg.noNewCasesToLink'), 'info');
            return;
        }

        this.setStage(i18n.t('msg.stage4', { count: testCases.length }));
        this.uiManager.log(i18n.t('msg.step4'), 'info');

        if (this.xrayApiClient) {
            try {
                const keys = testCases.map(tc => tc.key);
                await this.xrayApiClient.addTestsToTestPlan(testPlan.key, keys);
                this.uiManager.log(`Linked ${keys.length} test(s) to Test Plan ${testPlan.key} via Xray`, 'success');
                this.uiManager.showProgress(CONSTANTS.PROGRESS.LINK_TEST_CASES, i18n.t('msg.linkedCount', { count: keys.length }));
                return;
            } catch (err) {
                logger.warn(`Xray addTestsToTestPlan failed: ${err.message}`);
            }
        }

        // Jira fallback
        const linkResult = await this.jiraService.linkTestCasesToIssue(testCases, testPlan.key);
        this.logLinkResult(linkResult, `Test Plan ${testPlan.key}`);
        this.uiManager.showProgress(CONSTANTS.PROGRESS.LINK_TEST_CASES, i18n.t('msg.linkedCount', { count: linkResult.linked }));
    }
```

- [ ] **Step 2: Commit**

```bash
git add src/core/sidepanel.js
git commit -m "feat: link tests to Test Plan via Xray API (Xray primary, Jira fallback)"
```

---

## Task 6: Wire Execution → Test Plan linking in `createTestExecutions()`

**Files:**
- Modify: `src/core/sidepanel.js`

- [ ] **Step 1: Add execution→plan linking block**

Find the end of `createTestExecutions()` — the block after the `createdExecutions === 0` check and before `return`:

```js
        if (createdExecutions === 0) {
            this.uiManager.log(i18n.t('msg.allExecsExisted', { count: testExecutions.length }), 'info');
        }

        return { testExecutions, createdExecutions };
    }
```

Replace with:

```js
        if (createdExecutions === 0) {
            this.uiManager.log(i18n.t('msg.allExecsExisted', { count: testExecutions.length }), 'info');
        }

        // Link new executions to test plan
        const newExecs = testExecutions.filter(e => !e._wasExisting);
        if (newExecs.length > 0) {
            const newExecKeys = newExecs.map(e => e.key);
            if (this.xrayApiClient) {
                try {
                    await this.xrayApiClient.addExecutionsToTestPlan(testPlan.key, newExecKeys);
                    this.uiManager.log(`Linked ${newExecKeys.length} execution(s) to Test Plan ${testPlan.key} via Xray`, 'success');
                } catch (err) {
                    logger.warn(`Xray addExecutionsToTestPlan failed: ${err.message}`);
                    for (const key of newExecKeys) {
                        await this.jiraService.apiClient.linkIssues(key, testPlan.key);
                    }
                }
            } else {
                for (const key of newExecKeys) {
                    await this.jiraService.apiClient.linkIssues(key, testPlan.key);
                }
            }
        }

        return { testExecutions, createdExecutions };
    }
```

- [ ] **Step 2: Commit**

```bash
git add src/core/sidepanel.js
git commit -m "feat: link Test Executions to Test Plan via Xray API (Xray primary, Jira fallback)"
```

---

## Task 7: Refactor `linkTestCasesToExecutions()` to Xray primary

**Files:**
- Modify: `src/core/sidepanel.js`

- [ ] **Step 1: Replace the method body**

Find the entire `linkTestCasesToExecutions` method:

```js
    async linkTestCasesToExecutions(testCases, testExecutions) {
        if (testCases.length === 0 || testExecutions.length === 0) {
            return;
        }

        this.setStage(i18n.t('msg.stage6'));
        for (const execution of testExecutions) {
            this.uiManager.log(i18n.t('msg.linkingToExec', { key: execution.key }), 'info');
            const linkResult = await this.jiraService.linkTestCasesToIssue(testCases, execution.key);
            this.logLinkResult(linkResult, `Test Execution ${execution.key}`);

            // Register tests in Xray execution (creates actual test runs on Xray board)
            if (this.xrayApiClient) {
                try {
                    const keys = testCases.map(tc => tc.key);
                    await this.xrayApiClient.addTestsToExecution(execution.key, keys);
                    this.uiManager.log(`Registered ${keys.length} test(s) in Xray execution ${execution.key}`, 'success');
                } catch (err) {
                    logger.warn(`Xray execution registration failed for ${execution.key}: ${err.message}`);
                }
            }
        }
    }
```

Replace with:

```js
    async linkTestCasesToExecutions(testCases, testExecutions) {
        if (testCases.length === 0 || testExecutions.length === 0) {
            return;
        }

        this.setStage(i18n.t('msg.stage6'));
        const keys = testCases.map(tc => tc.key);

        for (const execution of testExecutions) {
            this.uiManager.log(i18n.t('msg.linkingToExec', { key: execution.key }), 'info');

            if (this.xrayApiClient) {
                try {
                    await this.xrayApiClient.addTestsToExecution(execution.key, keys);
                    this.uiManager.log(`Registered ${keys.length} test(s) in Xray execution ${execution.key}`, 'success');
                } catch (err) {
                    logger.warn(`Xray addTestsToExecution failed for ${execution.key}: ${err.message}`);
                    const linkResult = await this.jiraService.linkTestCasesToIssue(testCases, execution.key);
                    this.logLinkResult(linkResult, `Test Execution ${execution.key}`);
                }
            } else {
                const linkResult = await this.jiraService.linkTestCasesToIssue(testCases, execution.key);
                this.logLinkResult(linkResult, `Test Execution ${execution.key}`);
            }
        }
    }
```

- [ ] **Step 2: Commit**

```bash
git add src/core/sidepanel.js
git commit -m "refactor: Tests→Execution linking to Xray primary with Jira fallback (replaces both-always approach)"
```

---

## Task 8: End-to-end verification

- [ ] **Step 1: Reload the extension**

Go to `chrome://extensions` → click the reload icon on the Xray Test Generator card → close and reopen the side panel.

- [ ] **Step 2: Test with Xray credentials provided**

Fill in Xray Client ID and Client Secret in addition to Jira credentials. Run generation on 1–2 issues.

Expected in the execution log:
- `✅ Linked XXX → YYY as Test Coverage (Xray)` — per new test case
- `✅ Linked N test(s) to Test Plan ZZZ via Xray`
- `✅ Linked N execution(s) to Test Plan ZZZ via Xray`
- `✅ Registered N test(s) in Xray execution ZZZ`

Expected in Jira:
- Source issue: **Test Coverage** section shows the new test (not "UNCOVERED")
- Test Plan: tests visible in Xray's Test Plan view
- Test Execution: tests appear as test runs in Xray board

- [ ] **Step 3: Test fallback (no Xray credentials)**

Clear the Xray Client ID and Secret fields. Run generation.

Expected: generation completes normally. Source issue Test Coverage section should still show the test (via `"Tests"` Jira link type fallback).

- [ ] **Step 4: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: post-verification cleanup"
```
