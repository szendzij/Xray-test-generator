# Phase 2: Xray API — Add Tests to Test Execution - Research

**Researched:** 2026-03-25
**Domain:** Xray Cloud REST API v2, Chrome Extension MV3 (vanilla JS)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Keep both — Jira issue link (`linkTestCasesToIssue`) AND Xray REST call (`addTestsToExecution`) run for each execution. They serve different purposes: Jira link creates a visible "is tested by" relationship in Jira UI; Xray REST registers tests as runnable test runs on the execution board.
- **D-02:** Silently skip the Xray REST call when `xrayApiClient` is null or not configured. No log message — consistent with the extension being usable in Jira-only mode. The Jira issue link still runs normally.
- **D-03:** New method `addTestsToExecution(testExecKey, testCaseKeys[])` lives in `xrayApiClient.js` (HTTP concern), not `jiraService.js` — consistent with existing separation: HTTP in api/, business logic in services/.
- **D-04:** Call site is `sidepanel.js:linkTestCasesToExecutions()` — after the existing `linkTestCasesToIssue` call, within the same per-execution loop.
- **D-05:** All test case keys sent in a single request per execution (`{"add": [...allKeys]}`). No per-key iteration. (XRAY-03)
- **D-06:** Failure to register tests in Xray logs a warning (via `logger.warn`) but does not throw — overall generation continues. (XRAY-04)

### Claude's Discretion

- Exact log message wording for the Xray registration step
- Whether to add a PROGRESS constant for this step or reuse existing values

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| XRAY-01 | After test executions are created, call Xray Cloud REST `POST /api/v2/testexec/{key}/test` with `{"add": [...testCaseKeys]}` to register tests in Xray (not just Jira issue links) | Endpoint confirmed in CONTEXT.md canonical refs; pattern matches existing `getToken()` + Bearer auth already in `xrayApiClient.js` |
| XRAY-02 | `xrayApiClient.js` gets a new method `addTestsToExecution(testExecKey, testCaseKeys[])` using the Bearer JWT token already in use | `getToken()` already implemented and cached; `addTestStep` method in same file is the direct structural model |
| XRAY-03 | The call is batched — all test case keys sent in a single request per test execution (not one-by-one) | `{"add": [...allKeys]}` body sends the full array in one fetch; no loop needed |
| XRAY-04 | Failure to add tests to Xray execution is logged as warning but does not abort the overall generation | `logger.warn` pattern already established in `jiraApiClient.js:addTestStepToIssue` (line 208–209); wrapping in try/catch mirrors that style |
</phase_requirements>

---

## Summary

Phase 2 is a narrow, well-scoped addition: one new method in `xrayApiClient.js` and three lines of call-site wiring in `sidepanel.js:linkTestCasesToExecutions()`. There are no new libraries, no UI changes, no manifest changes, and no new dependencies.

The only non-obvious planning detail is the **access path to `xrayApiClient`** at the call site. Currently `xrayClient` is instantiated as a local `const` (line 191 of `sidepanel.js`) and immediately injected into `jiraService.apiClient` via `setXrayClient()`. It is NOT stored as `this.xrayApiClient`. The planner must decide how `linkTestCasesToExecutions` gets a reference — the cleanest approach is to store it as `this.xrayApiClient` at instantiation time, then guard with `if (this.xrayApiClient)` at the call site.

The PROGRESS constant map currently has a gap between `LINK_TEST_CASES` (85) and `CREATE_TEST_EXECUTIONS_START` (90). The Xray registration step happens inside `linkTestCasesToExecutions` which runs after executions are created (stage 6). No new PROGRESS slot is strictly needed — the step can log to the UI log without updating the progress bar, consistent with individual link operations in the same loop.

**Primary recommendation:** Store `xrayApiClient` on `this` at construction time in `generateTests()`, then call it directly from `linkTestCasesToExecutions()` after the Jira link call.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Xray Cloud REST API v2 | v2 | Register tests in a test execution | Official Xray Cloud API; EU base URL already in `host_permissions` |
| Fetch API (browser native) | — | HTTP call | Already used throughout `xrayApiClient.js` and `jiraApiClient.js` |

### Supporting

No new libraries required. All primitives are already present in the codebase.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| REST `POST /api/v2/testexec/{key}/test` | Xray GraphQL mutation | REST is simpler for this flat operation; GraphQL used for `addTestStep` because it requires structured step input; not needed here |

**Installation:** None — no new packages.

---

## Architecture Patterns

### Recommended Structure

No new files. Changes touch exactly two existing files:

```
src/
├── api/
│   └── xrayApiClient.js       ← ADD: addTestsToExecution() method
└── core/
    └── sidepanel.js           ← MODIFY: store xrayClient on this; call from linkTestCasesToExecutions()
```

### Pattern 1: New REST Method Following Existing `addTestStep` Shape

**What:** `addTestsToExecution` mirrors the structure of `addTestStep` — call `getToken()`, build fetch with Bearer auth, check `response.ok`, throw on error.

**When to use:** Any new Xray Cloud REST call in this client.

**Example (modeled on existing `addTestStep`):**
```javascript
// Source: src/api/xrayApiClient.js (existing addTestStep pattern)
async addTestsToExecution(testExecKey, testCaseKeys) {
    const token = await this.getToken();

    const response = await fetch(`${this.baseUrl}/api/v2/testexec/${testExecKey}/test`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ add: testCaseKeys })
    });

    if (!response.ok) {
        throw new Error(`Xray addTestsToExecution failed (${response.status})`);
    }

    return response.json().catch(() => null); // response may be empty on success
}
```

**Key detail:** Xray Cloud REST responses for this endpoint may return an empty body on success (status 200/204). The `.catch(() => null)` prevents a JSON parse error from surfacing.

### Pattern 2: Guard + Warn at Call Site

**What:** Wrap the Xray call in `try/catch` at `linkTestCasesToExecutions()`, log warning on failure, continue loop.

**When to use:** Any non-fatal Xray operation wired into the generation flow.

**Example:**
```javascript
// Source: src/core/sidepanel.js linkTestCasesToExecutions() — new lines after existing linkTestCasesToIssue call
if (this.xrayApiClient) {
    try {
        const keys = testCases.map(tc => tc.key);
        await this.xrayApiClient.addTestsToExecution(execution.key, keys);
        this.uiManager.log(`Registered ${keys.length} tests in Xray execution ${execution.key}`, 'success');
    } catch (err) {
        logger.warn(`Xray execution registration failed for ${execution.key}: ${err.message}`);
    }
}
```

### Pattern 3: Storing `xrayApiClient` on `this`

**What:** Change the instantiation in `generateTests()` from a local `const` to `this.xrayApiClient`.

**Current code (line 190–192):**
```javascript
if (config.useAiSteps && config.xrayClientId && config.xrayClientSecret) {
    const xrayClient = new XrayApiClient(config.xrayClientId, config.xrayClientSecret);
    this.jiraService.apiClient.setXrayClient(xrayClient);
}
```

**Required change:**
```javascript
if (config.xrayClientId && config.xrayClientSecret) {
    this.xrayApiClient = new XrayApiClient(config.xrayClientId, config.xrayClientSecret);
    if (config.useAiSteps) {
        this.jiraService.apiClient.setXrayClient(this.xrayApiClient);
    }
}
```

**Note on guard condition change:** D-02 says skip silently when Xray credentials are absent. The existing guard also requires `config.useAiSteps` — this is an AI steps concern only, not an Xray connectivity concern. For Phase 2, the `xrayApiClient` instance should exist whenever credentials are provided, regardless of `useAiSteps`. This is a deliberate, locked decision (D-02) so the planner must address this guard condition change explicitly.

### Anti-Patterns to Avoid

- **Calling `addTestsToExecution` via `jiraService`:** D-03 locks HTTP calls to `api/` layer. Do not route through `jiraService.js`.
- **Per-key loop:** D-05 requires a single batch request per execution. Never iterate test case keys.
- **Throwing on Xray failure:** D-06 requires `logger.warn` + continue. Do not let Xray errors propagate to the outer `try/catch` in `generateTests()`.
- **Checking `useAiSteps` to gate Xray execution registration:** AI steps and Xray execution registration are independent features. The guard should check credentials only (D-02).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT Bearer auth | Custom auth logic | `xrayApiClient.getToken()` (already exists) | Handles caching, expiry, retries |
| Batching | Loop with per-key requests | Single `{"add": [...]}` request | API supports array; D-05 locks this |

---

## Runtime State Inventory

Step 2.5 SKIPPED — this is not a rename/refactor/migration phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `https://eu.xray.cloud.getxray.app/*` | Xray REST call | Already in `manifest.json` `host_permissions` | — | — |
| `xrayApiClient` (runtime) | `addTestsToExecution` | Conditional on user config (`xrayClientId` + `xrayClientSecret`) | — | Silently skipped (D-02) |

**No blocking missing dependencies.** The endpoint domain is already permitted in `manifest.json`.

---

## Common Pitfalls

### Pitfall 1: `xrayApiClient` Not Accessible at Call Site

**What goes wrong:** `linkTestCasesToExecutions()` cannot access `xrayClient` because it's a local `const` in `generateTests()`, not `this.xrayApiClient`.

**Why it happens:** The original code only needed `xrayClient` for AI steps, so it was scoped locally and injected into `jiraApiClient`. The new call site is a different method on the same class.

**How to avoid:** Store as `this.xrayApiClient = new XrayApiClient(...)` in `generateTests()` before the AI steps guard.

**Warning signs:** ReferenceError or `this.xrayApiClient` is always `undefined` at the guard in `linkTestCasesToExecutions`.

### Pitfall 2: Guard Condition Too Narrow (`useAiSteps` Required)

**What goes wrong:** If the guard remains `if (config.useAiSteps && config.xrayClientId && config.xrayClientSecret)`, users who have Xray credentials but disabled AI steps will never get tests registered in executions.

**Why it happens:** The original guard was AI-step-centric.

**How to avoid:** Split the guard: `this.xrayApiClient` is created whenever credentials exist; `setXrayClient` is called only when `useAiSteps` is also true.

**Warning signs:** Test executions show no test runs when AI steps are disabled, even with valid Xray credentials.

### Pitfall 3: Empty Response Body from Xray REST

**What goes wrong:** `response.json()` throws on an empty body if the API returns 200 with no JSON content.

**Why it happens:** Some Xray REST endpoints return 200/204 with no body on success.

**How to avoid:** Use `.catch(() => null)` on the `.json()` call, or check `response.headers.get('content-length')` before parsing.

**Warning signs:** Silent crash inside `addTestsToExecution` that surfaces as an unhandled rejection.

### Pitfall 4: Test Case Keys vs. IDs

**What goes wrong:** Passing numeric Jira issue IDs instead of string issue keys (e.g., `12345` instead of `"TEST-123"`) to the `add` array.

**Why it happens:** Xray GraphQL `addTestStep` requires numeric `issueId`; the REST endpoint for `testexec` uses string keys.

**How to avoid:** Use `testCases.map(tc => tc.key)` — the `key` field (e.g., `"PROJ-42"`) is always present on test case objects from Jira.

**Warning signs:** Xray API returns 400 or the tests don't appear in the execution board.

---

## Code Examples

### Collecting Test Case Keys from testCases Array

```javascript
// Source: pattern from existing jiraService.js and sidepanel.js usage
const testCaseKeys = testCases.map(tc => tc.key);
// e.g. ["PROJ-101", "PROJ-102", "PROJ-103"]
```

### Xray REST Endpoint

```
POST https://eu.xray.cloud.getxray.app/api/v2/testexec/{testExecKey}/test
Authorization: Bearer {jwt}
Content-Type: application/json

{ "add": ["PROJ-101", "PROJ-102", "PROJ-103"] }
```

**Confirmed in:** CONTEXT.md canonical refs (§Xray REST endpoint), CLAUDE.md §Xray Cloud.

### Existing PROGRESS Constants (for reference)

```javascript
// Source: src/utils/constants.js
PROGRESS: {
    LINK_TEST_CASES: 85,          // used in linkTestCasesToPlan
    CREATE_TEST_EXECUTIONS_START: 90,  // used in createTestExecutions
    COMPLETE: 100
}
// No slot between 90 and 100 for "register in Xray" step.
// Log to UI log only; no progress bar update needed.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jira issue link only | Jira link + Xray REST registration | Phase 2 (this phase) | Tests appear as actual test runs on Xray execution board, not just Jira links |

**Deprecated/outdated:**
- `import/test/bulk` REST: only creates new tests, does not add to existing execution — confirmed in CLAUDE.md, do not use for this purpose.

---

## Open Questions

1. **Does `POST /api/v2/testexec/{key}/test` return a body on success?**
   - What we know: The Xray docs site renders only tracking JS and couldn't be parsed. CONTEXT.md confirms the endpoint, status, and body shape.
   - What's unclear: Whether the response is JSON `{}`, a list of registered tests, or empty (204).
   - Recommendation: Add `.catch(() => null)` to `response.json()` to handle both cases gracefully. If the implementation throws in testing, check response body and adjust.

2. **Should `this.xrayApiClient` be reset to `null` at the start of each `generateTests()` call?**
   - What we know: `this.jiraService` is re-instantiated each time. `this.xrayApiClient` will persist across runs if the user re-runs generation.
   - What's unclear: Whether stale credentials from a previous run cause problems.
   - Recommendation: Set `this.xrayApiClient = null` at the top of `generateTests()` before the conditional instantiation, mirroring how `this.jiraService` is re-created.

---

## Sources

### Primary (HIGH confidence)

- `src/api/xrayApiClient.js` (project source) — existing `getToken()` + `addTestStep` patterns; direct model for new method
- `src/core/sidepanel.js` lines 186–422 (project source) — `generateTests()` structure, xrayClient instantiation, `linkTestCasesToExecutions()` call site
- `src/utils/constants.js` (project source) — PROGRESS map, XRAY.BASE_URL
- `.planning/phases/02-xray-api-add-tests-to-test-execution/02-CONTEXT.md` — all locked decisions, canonical API reference
- `CLAUDE.md` §Xray Cloud — EU base URL, auth pattern, REST endpoint confirmation

### Secondary (MEDIUM confidence)

- [Xray Cloud Test Executions - REST docs (official)](https://docs.getxray.app/display/XRAYCLOUD/Test+Executions+-+REST) — site renders tracking JS only; endpoint confirmed via CONTEXT.md instead
- [Xray Postman Collections - GitHub](https://github.com/Xray-App/xray-postman-collections) — confirms v2 API structure; specific testexec/test endpoint not in collection

### Tertiary (LOW confidence)

- Community forum threads — confirmed `{"add": [...keys]}` body shape is the standard pattern for adding tests to executions (multiple community members use this format)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all primitives confirmed in source
- Architecture: HIGH — exact line numbers verified in source code; patterns are direct mirrors of existing code
- Pitfalls: HIGH — all derived from reading actual source code; no speculation
- API endpoint: MEDIUM — endpoint URL and body confirmed in CONTEXT.md/CLAUDE.md; response format unverified (Xray docs site inaccessible to WebFetch)

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable API; Xray Cloud v2 REST is not fast-moving)
