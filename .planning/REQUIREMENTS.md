# Requirements: Xray Test Generator v2

**Defined:** 2026-03-25
**Core Value:** One-click generation of a complete, linked test suite from any JQL query.

## v1 Requirements

### ADF Description Fix

- [ ] **ADF-01**: `extractAdfText` must return non-empty, meaningful text even when the description contains embedded images/attachments (media nodes)
- [ ] **ADF-02**: If extracted description text is empty or too short (< 20 chars), fall back to a meaningful placeholder instead of passing garbage to Gemini
- [ ] **ADF-03**: ADF node types `media`, `mediaSingle`, `mediaGroup`, `mediaInline` must be explicitly skipped during text extraction (they have no `text` and traversing their `content` yields nothing useful)

### Xray Test Execution Linking

- [ ] **XRAY-01**: After test executions are created, call Xray Cloud REST `POST /api/v2/testexec/{key}/test` with `{"add": [...testCaseKeys]}` to register tests in Xray (not just Jira issue links)
- [ ] **XRAY-02**: `xrayApiClient.js` gets a new method `addTestsToExecution(testExecKey, testCaseKeys[])` using the Bearer JWT token already in use
- [ ] **XRAY-03**: The call is batched — all test case keys sent in a single request per test execution (not one-by-one)
- [ ] **XRAY-04**: Failure to add tests to Xray execution is logged as warning but does not abort the overall generation (consistent with current error handling style)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Removing tests from execution | Not requested, adds complexity |
| Xray Server/DC support | Different auth, separate effort |
| Paginated batching for large test sets | Current max 500 issues — single batch is fine |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ADF-01 | Phase 1 | Pending |
| ADF-02 | Phase 1 | Pending |
| ADF-03 | Phase 1 | Pending |
| XRAY-01 | Phase 2 | Pending |
| XRAY-02 | Phase 2 | Pending |
| XRAY-03 | Phase 2 | Pending |
| XRAY-04 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-25*
