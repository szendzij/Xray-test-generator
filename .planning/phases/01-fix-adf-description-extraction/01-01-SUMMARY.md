---
phase: 01-fix-adf-description-extraction
plan: 01
subsystem: api
tags: [adf, jira, gemini, llm, text-extraction]

# Dependency graph
requires: []
provides:
  - "Hardened extractAdfText in jiraService.js that skips non-text ADF nodes and returns null for empty/short results"
  - "Robust fallback to noDescriptionLabel in LLM prompt when Jira description is image-only or attachment-heavy"
affects: [jiraService, llmApiClient, sidepanel, ai-step-generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SKIP_NODES Set for ADF node type blacklisting — extend Set to skip additional node types"
    - "null return from extractAdfText signals missing description; downstream || operator triggers fallback"
    - "try/catch wrapping in extractAdfText for silent null return on malformed ADF"

key-files:
  created: []
  modified:
    - src/services/jiraService.js

key-decisions:
  - "Return null (not empty string) when ADF extraction yields empty or <20 char result — null is falsy, works with existing || fallback in llmApiClient.js without any downstream changes"
  - "Use a Set (SKIP_NODES) for blacklisting ADF node types — O(1) lookup, easy to extend"
  - "20-character threshold for meaningful text — short results (e.g., a single emoji description) are treated as no description"
  - "Silent null return on catch — no logging in extractAdfText, consistent with existing jiraService.js pattern"

patterns-established:
  - "extractAdfText returns null to signal absent/unusable description; callers use || to substitute fallback"

requirements-completed: [ADF-01, ADF-02, ADF-03]

# Metrics
duration: 3min
completed: 2026-03-25
---

# Phase 01 Plan 01: Fix ADF Description Extraction Summary

**extractAdfText hardened with 7-node blacklist (media/emoji/mention), 20-char minimum threshold, and try/catch null return — Gemini prompt now receives noDescriptionLabel fallback for image-only Jira descriptions**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-25T14:22:38Z
- **Completed:** 2026-03-25T14:23:24Z
- **Tasks:** 2 (1 code change, 1 verification-only)
- **Files modified:** 1

## Accomplishments

- Replaced bare `extractAdfText` implementation with hardened version that skips 7 non-text ADF node types
- Added 20-character minimum threshold: results shorter than 20 chars return `null` instead of sparse garbage text
- Wrapped entire method in try/catch returning `null` on any malformed ADF input
- Confirmed downstream call chain requires no changes: `null || noDescriptionLabel` in `llmApiClient.js` line 42 handles null correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden extractAdfText with node blacklist, short-text threshold, and error resilience** - `e0df66a` (feat)
2. **Task 2: Verify downstream null propagation in sidepanel.js and llmApiClient.js** - verification-only, no code changes

## Files Created/Modified

- `src/services/jiraService.js` - extractAdfText method replaced with hardened version (lines 19-40)

## Decisions Made

- Return `null` (not `''`) from extractAdfText so the existing `||` operator in llmApiClient.js line 42 triggers the `noDescriptionLabel` fallback without any downstream changes needed
- Use a `Set` for SKIP_NODES for O(1) lookup performance and easy extensibility
- 20-character minimum: balances filtering out meaningless residual text (whitespace, punctuation artifacts from skipped nodes) while keeping short-but-valid descriptions
- Silent catch with `return null` — consistent with jiraService.js pattern (no logger calls in this file)

## Deviations from Plan

None — plan executed exactly as written. Task 1 note states `tdd="true"` but plan's own `<verify>` section explicitly documents that no test framework is configured for this Chrome extension; manual code review verification was used as specified.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- ADF extraction fix is complete and ready; Phase 2 (Xray API: Add Tests to Test Execution) can proceed independently
- The null-return contract from extractAdfText is now stable and documented

---
*Phase: 01-fix-adf-description-extraction*
*Completed: 2026-03-25*
