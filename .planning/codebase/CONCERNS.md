# Codebase Concerns

**Analysis Date:** 2026-03-25

## Tech Debt

**Hardcoded Polish error messages in error handling:**
- Issue: Polish strings hardcoded directly in `src/utils/errorHandler.js` (lines 24, 30, 33, 36) instead of using i18n system
- Files: `src/utils/errorHandler.js`
- Impact: Non-English users see untranslated error messages in critical auth failures, API errors, and network issues. Makes support difficult for international deployments.
- Fix approach: Replace all hardcoded Polish strings in `ErrorHandler.getUserFriendlyMessage()` with `i18n.t('error.*')` calls, matching pattern used in validation service

**localStorage usage in Chrome Extension context:**
- Issue: `src/utils/i18n.js` uses `localStorage.setItem()` and `localStorage.getItem()` for language preference (lines 318, 327)
- Files: `src/utils/i18n.js`
- Impact: localStorage is slower and not recommended for extensions. Chrome extension best practice is `chrome.storage.local` which is already used elsewhere in the codebase. May have persistence issues across different extension contexts.
- Fix approach: Migrate language preference to `chrome.storage.local` to match existing storage pattern in `configManager.js`

**Monolithic sidepanel controller (462 lines):**
- Issue: `src/core/sidepanel.js` contains all orchestration logic for 6-stage generation pipeline in single class with many responsibilities
- Files: `src/core/sidepanel.js`
- Impact: Difficult to test, understand, and modify individual stages. Single failure in any stage affects entire flow. Adding new features increases cognitive load.
- Fix approach: Extract stages into separate classes (FetchStage, TestCaseStage, AiStepsStage, etc.) or use a State Machine pattern for cleaner stage transitions

**Large API client with fallback complexity (242 lines):**
- Issue: `src/api/jiraApiClient.js` has complex GET→POST→POST-without-fields fallback chain for search (lines 102-172)
- Files: `src/api/jiraApiClient.js`
- Impact: Three levels of retry attempts make debugging difficult. If one attempt succeeds partially, downstream code may receive unexpected data shape. Error messages may mask root cause.
- Fix approach: Consider single endpoint strategy or explicit feature detection instead of try-all approach

**Inconsistent error handling across API clients:**
- Issue: Different error response handling patterns in `llmApiClient.js` (line 64: `.catch(() => ...)`), `xrayApiClient.js` (line 27: `.catch(() => ...)`), vs jiraApiClient's explicit error handling
- Files: `src/api/llmApiClient.js`, `src/api/xrayApiClient.js`, `src/api/jiraApiClient.js`
- Impact: Silent failures possible in response body parsing. Different patterns make code harder to maintain.
- Fix approach: Standardize error handling across all API clients with consistent try-catch or promise-catch patterns

---

## Known Bugs

**Test case duplication detection may use wrong field:**
- Issue: `checkExistingTestCase()` in `src/services/jiraService.js` (line 72) uses `linkedIssues()` JQL to find existing test cases linked to source issue
- Files: `src/services/jiraService.js`
- Problem: If multiple test cases are linked to same source issue, JQL returns multiple results but code only checks if one exists. If first match is archived/closed, it's skipped but second match is created as duplicate.
- Trigger: Create test case, then archive the first test case link without unlinking. Run generation again on same source issue.
- Workaround: Explicitly unlink archived test cases before re-running generation

**Language preference not persisted across tab refreshes:**
- Issue: Language is stored in `localStorage` which doesn't guarantee persistence across extension contexts
- Files: `src/utils/i18n.js`
- Symptoms: Language preference reverts to 'pl' on sidepanel re-open or extension reload
- Trigger: Switch language to English, close and reopen sidepanel
- Workaround: None currently; user must re-select language each session

**XrayApiClient token expiry calculation may have race condition:**
- Issue: `src/api/xrayApiClient.js` (lines 12-14) checks token validity but multiple concurrent requests could all see expired token and request new ones simultaneously
- Files: `src/api/xrayApiClient.js`
- Problem: No mutex/lock mechanism. Multiple `generateTestSteps()` calls could trigger multiple auth requests to Xray within milliseconds.
- Trigger: Generate AI steps for 5+ test cases simultaneously
- Workaround: Sequential processing of AI steps (current implementation uses `await` in loop) mitigates but doesn't eliminate

---

## Security Considerations

**API credentials stored in chrome.storage.local:**
- Risk: Chrome extension storage is persisted plaintext on disk and accessible to any other extension in same browser profile
- Files: `src/utils/configManager.js`, `src/core/sidepanel.js`
- Current mitigation: Chrome's storage.local is namespaced per extension; separate extensions cannot read it. Users should not share browser profiles with untrusted extensions.
- Recommendations:
  - Consider encrypting sensitive fields (API keys, client secrets) before storage if supporting shared user profiles
  - Add UI warning about credential safety when Gemini API key is configured
  - Implement session-only storage option that clears on extension unload

**Gemini API key exposed in fetch request logs:**
- Risk: If debugging/logging is enabled, full API endpoint with key query parameter may be logged: `${CONSTANTS.LLM.GEMINI_ENDPOINT}?key=${this.apiKey}`
- Files: `src/api/llmApiClient.js` (line 44)
- Current mitigation: Logger in `src/utils/logger.js` logs requests but only in DEBUG mode (line 25)
- Recommendations:
  - Mask API key in all debug logs (show only first 4 and last 4 characters)
  - Add explicit check to prevent production logging of URLs containing `key=` or `apiKey=`

**Basic Auth header exposed in HTTP request logs:**
- Risk: `jiraApiClient.makeRequest()` logs full URL in DEBUG mode (line 21). If Jira is self-hosted on HTTP (non-HTTPS), Basic Auth header sends credentials in plaintext.
- Files: `src/api/jiraApiClient.js`
- Current mitigation: Validation requires HTTPS URLs (validationService.js line 8)
- Recommendations:
  - Add warning in UI if HTTPS enforcement cannot be guaranteed
  - Consider adding certificate pinning for known Atlassian domains

**No input sanitization in LLM prompt construction:**
- Risk: User-provided issue summary and description are directly interpolated into Gemini prompt (lines 41-42 of llmApiClient.js)
- Files: `src/api/llmApiClient.js`
- Problem: Malicious JQL could inject test data that becomes part of AI prompt, potentially causing prompt injection attacks
- Current mitigation: LLM prompt is informational only (no side effects from modified output)
- Recommendations:
  - Add length limits on issue summary/description before prompt injection
  - Sanitize or escape special characters in prompt template

---

## Performance Bottlenecks

**Sequential API delays in test case creation loop:**
- Problem: Each test case creation in `createTestCases()` (line 298 of sidepanel.js) awaits fixed 200ms delay, even for fast operations
- Files: `src/core/sidepanel.js`
- Impact: Creating 50 test cases = minimum 10 seconds (50 × 200ms) regardless of API response time. For 500 test cases, baseline is 100+ seconds.
- Improvement path: Implement batch processing or configurable adaptive delays (shorter for successful responses, only long delays after rate-limit errors)

**Full test case list kept in memory during generation:**
- Problem: All test cases accumulated in array before linking (line 212 of sidepanel.js: `testCases.push()`), then iterated again for AI steps (line 316), again for plan linking (line 230)
- Files: `src/core/sidepanel.js`, `src/services/jiraService.js`
- Impact: For 1000+ test cases, memory usage grows linearly. Multiple iterations increase GC pressure.
- Improvement path: Stream-process test cases — link/AI step as soon as created rather than batching

**Redundant JQL queries for existence checks:**
- Problem: `checkExistingTestCase()`, `checkExistingTestPlan()`, `checkExistingTestExecution()` each execute JQL query, but results are cached only within single generation run
- Files: `src/services/jiraService.js`
- Impact: If same project/fixVersion is processed multiple times, same JQL queries re-execute. Caching cleared after generation (line 221: `clearCache()`)
- Improvement path: Persistent cache with TTL (5-10 minutes) to avoid re-querying same metadata during multiple runs

**Gemini retries with hardcoded delays:**
- Problem: 429 rate-limit retries parse delay from response but fall back to hardcoded `CONSTANTS.LLM.RETRY_FALLBACK_DELAY_MS` if parsing fails (line 92 of llmApiClient.js)
- Files: `src/api/llmApiClient.js`
- Impact: Unnecessary wait time if server-provided delay is not parsed correctly. No exponential backoff across retries.
- Improvement path: Add exponential backoff for subsequent retry attempts, and improve retry delay parsing

---

## Fragile Areas

**Error handling in XML/ADF description extraction:**
- Component: `extractAdfText()` in `src/services/jiraService.js` (lines 19-28)
- Why fragile: Recursive node traversal with no depth limit. Malformed ADF with circular references could cause stack overflow. No validation that input is actually ADF structure.
- Trigger: Issue with circular reference in description field, or description field contains non-object value when expected to be ADF
- Safe modification: Add depth counter parameter, validate input shape before recursion, add try-catch around recursive call
- Test coverage: No unit tests visible for `extractAdfText()` with edge cases (circular refs, deep nesting, null content)

**Retry logic in ErrorHandler without circuit breaker:**
- Component: `retry()` method in `src/utils/errorHandler.js` (lines 48-71)
- Why fragile: Continues retrying indefinitely for all errors except explicitly blacklisted ones. If Jira API is down, extension spins for 3 retries × exponential backoff (~7 seconds) per operation.
- Trigger: Jira server outage during test case creation — user sees 2+ minute delays before failure
- Safe modification: Add circuit breaker pattern (fail fast if >3 consecutive errors) or maximum elapsed time limit
- Test coverage: Retry logic not unit tested; relies on integration testing

**UI state synchronization between multiple managers:**
- Component: StepperController, UIManager, and EventListenerManager manage overlapping DOM state (step visibility, card collapse, validation display)
- Why fragile: State can diverge if one manager updates without others knowing. Example: resetStepper() hides element X but EventListenerManager listener on card toggle still refers to previous element reference.
- Trigger: Rapid step navigation or card collapse followed by reset
- Safe modification: Centralize state in single observable object, have all managers subscribe to changes
- Test coverage: No automated tests for UI state consistency across managers

**Missing null checks in LinkIssues operation:**
- Component: `linkTestCasesToIssue()` in `src/services/jiraService.js` (lines 196-219)
- Why fragile: Checks for `testCase?.key` but doesn't validate `targetIssueKey` parameter. If targetIssueKey is null/undefined, API call still made with invalid data.
- Trigger: Call linkTestCasesToIssue() with null testPlan.key (if testPlan creation failed but code continues)
- Safe modification: Add guard clause at start of method: `if (!targetIssueKey) throw new Error('...')`
- Test coverage: No visible tests for link operation

---

## Scaling Limits

**JQL query result limit hardcoded to 100:**
- Current capacity: `CONSTANTS.DEFAULT_MAX_RESULTS = 100`
- Limit: Generation supports only first 100 matching issues, larger projects silently truncated
- Files: `src/utils/constants.js`, `src/api/jiraApiClient.js`
- Scaling path: Implement pagination or increase limit, add warning if total > limit, allow user configuration of max results

**Single test plan per fix version:**
- Current capacity: One Test Plan per (projectKey, fixVersion) pair
- Limit: Multiple teams working on same fixVersion cannot create separate test plans; new generation links to existing plan regardless of intent
- Files: `src/services/jiraService.js` (line 78-79)
- Scaling path: Add namespacing to test plan naming (include component, team, or run date in summary) and make lookup more granular

**Token caching for Xray has 23-hour TTL:**
- Current capacity: 23 hours of continuous extension use before re-auth required
- Limit: If token becomes invalid mid-session (server revoke), extension continues using stale token until next auth attempt
- Files: `src/api/xrayApiClient.js` (line 34)
- Scaling path: Add token validation check on first use, implement pre-expiry refresh at 22 hours

---

## Dependencies at Risk

**No version pinning in implicit dependencies:**
- Risk: Extension relies on i18n object but no version/source specified. If referenced externally, could change behavior.
- Files: `src/utils/i18n.js` exported as global, consumed by `configManager.js`, `errorHandler.js`, `validationService.js`
- Impact: Breaking changes in i18n locale data would affect all UI strings at once
- Migration plan: Add version comments to i18n exports, or wrap in module system

**Gemini model hardcoded without version flexibility:**
- Risk: Model `gemini-3.1-flash-lite-preview` is hardcoded in prompt template comments but used as constant in llmApiClient
- Files: `src/api/llmApiClient.js` (comment line 2 says "do not change" but implementation not parameterized)
- Impact: If Google deprecates or renames model, extension breaks without code change
- Migration plan: Make model name configurable via chrome.storage or manifest constant, add fallback logic

---

## Missing Critical Features

**No pagination support for large issue sets:**
- Problem: Generation limited to 100 issues (DEFAULT_MAX_RESULTS). Larger projects cannot generate tests for all matching issues.
- Blocks: Teams with 500+ issues in fix version cannot use extension effectively
- Impact: Users must manually split work or accept incomplete test coverage

**No dry-run or preview mode:**
- Problem: Users cannot see what test cases would be created before committing. If JQL is wrong, discovers after creating 100 test cases.
- Blocks: Prevents safe exploration of JQL queries or test parameters
- Impact: Cleanup required if wrong JQL selected; no undo functionality

**No retry or resume capability:**
- Problem: If generation fails mid-run (e.g., after 50/100 test cases created), user must start over or manually clean up and retry
- Blocks: Large-scale generation is risky; network failures cause re-work
- Impact: Wasted API quota, user frustration with idempotency issues

**No visibility into cached test cases/plans/executions:**
- Problem: Cache exists in memory but users cannot inspect what's already been created. May unknowingly link to outdated test plans.
- Blocks: Makes incremental generation unsafe
- Impact: Potential duplicates or cross-contamination between runs

---

## Test Coverage Gaps

**Zero unit tests visible for validation service:**
- What's not tested: Field-level validation rules, step-based validation logic, edge cases (empty strings, very long inputs, special characters)
- Files: `src/utils/validationService.js`
- Risk: Validation bypass could allow invalid data to reach API (e.g., missing project key sneaks through)
- Priority: High — validation is first line of defense

**No tests for error handler retry logic:**
- What's not tested: Retry counting, exponential backoff calculation, shouldNotRetry() decision logic, recovery from transient errors
- Files: `src/utils/errorHandler.js`
- Risk: Retry behavior could degrade silently or retry forever on edge cases
- Priority: High — impacts reliability of all API calls

**No tests for ADF description extraction:**
- What's not tested: Circular reference handling, deep nesting, malformed ADF structures, non-text node types
- Files: `src/services/jiraService.js` (extractAdfText)
- Risk: Stack overflow or missing description data on edge case issues
- Priority: Medium — impacts test case quality

**No integration tests for full 6-stage pipeline:**
- What's not tested: End-to-end generation flow, stage interactions, state transitions, progress tracking accuracy
- Files: `src/core/sidepanel.js` (generateTests orchestration)
- Risk: Unforeseen interactions between stages (e.g., AI steps + test plan creation + linking) only caught in production
- Priority: Critical — no way to verify full workflow works

**No tests for Xray GraphQL mutation:**
- What's not tested: Query construction, mutation response parsing, error handling, edge cases with special characters in step data
- Files: `src/api/xrayApiClient.js` (addTestStep)
- Risk: Silent failures if GraphQL response structure changes or step data contains problematic characters
- Priority: High — Xray is critical path

**No tests for Gemini prompt injection resilience:**
- What's not tested: Issue summaries with special characters, very long descriptions, attempt to break out of JSON
- Files: `src/api/llmApiClient.js` (generateTestSteps)
- Risk: Malicious or edge-case issue data could generate invalid JSON or malformed steps
- Priority: Medium — LLM output is informational, not mission-critical

---

*Concerns audit: 2026-03-25*
