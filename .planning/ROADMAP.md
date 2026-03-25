# Roadmap: Xray Test Generator v2

**Created:** 2026-03-25
**Milestone:** v2.1 — Reliability & Xray Integration

---

## Phase 1 — Fix ADF Description Extraction

**Goal:** AI test step generation no longer fails when Jira issues contain embedded images or attachment-heavy descriptions.

**Covers:** ADF-01, ADF-02, ADF-03
**Plans:** 1 plan

Plans:
- [x] 01-01-PLAN.md — Harden extractAdfText with node blacklist, short-text threshold, and verify downstream null propagation (COMPLETE — e0df66a)

**Verification:** Generate steps for an issue whose description is only an embedded image — should not throw error, should use fallback label.

---

## Phase 2 — Xray API: Add Tests to Test Execution

**Goal:** Test cases are properly registered in Xray test executions (visible as test runs), not just linked as Jira issues.

**Covers:** XRAY-01, XRAY-02, XRAY-03, XRAY-04
**Plans:** 1/1 plans complete

Plans:
- [x] 02-01-PLAN.md — Add addTestsToExecution REST method to xrayApiClient.js and wire call into sidepanel.js linkTestCasesToExecutions

**Verification:** After generation, open Xray test execution in Jira — tests should appear as actual test runs (green/red/pending status), not just Jira links.

---

## Milestone Complete When

- [ ] Phase 1 verified: AI steps generated without errors for attachment-heavy issues
- [x] Phase 2 verified: Tests appear as runs in Xray execution board, not just linked issues (completed 2026-03-25)
