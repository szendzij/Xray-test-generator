# Phase 1: Fix ADF Description Extraction - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden `extractAdfText` in `jiraService.js` to skip non-text ADF node types and return `null` when the extracted text is empty or too short to be useful — so that AI step generation in `sidepanel.js` / `llmApiClient.js` falls back to `noDescriptionLabel` rather than sending sparse/garbage text to Gemini.

This phase does NOT change Gemini prompt logic, test step generation flow, or any UI elements.

</domain>

<decisions>
## Implementation Decisions

### Node Filtering Strategy
- **D-01:** Use a **blacklist** approach — explicitly skip node types: `media`, `mediaSingle`, `mediaGroup`, `mediaInline`, `hardBreak`, `emoji`, `mention`. All other node types with a `content` array continue to be traversed recursively.
- **D-02:** Return only the `text` field from `text`-type nodes (existing behavior retained for good nodes).

### Short-Text Threshold
- **D-03:** After extraction and trim, if the result is empty (`''`) OR fewer than **20 characters**, return `null` instead of the sparse string.
- **D-04:** Return `null` (not `''`) so that callers using `value || fallback` patterns reliably trigger the fallback. `''` is already falsy but `null` is semantically clearer and explicit.

### Error Resilience
- **D-05:** Wrap the traversal body in a `try/catch`. On any error, return `null`. This ensures a malformed or unexpected ADF object never throws from `extractAdfText` into AI step generation.

### Claude's Discretion
- Whether to log a warning on catch (vs. silent null return) — planner can decide based on current logging patterns in `jiraService.js`.
- Exact implementation of the blacklist check (e.g., `Set` vs. array `includes`) — either is fine.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Implementation Files
- `src/services/jiraService.js` — Contains `extractAdfText` (lines 19-28) to be hardened
- `src/core/sidepanel.js` — Call site at lines 327-328: `extractAdfText` result passed to `generateTestSteps`
- `src/api/llmApiClient.js` — Contains `noDescriptionLabel` fallback at lines 17, 42 — verify it handles `null` correctly (it uses `issueDescription || noDescriptionLabel`)

### Requirements
- `.planning/REQUIREMENTS.md` — ADF-01, ADF-02, ADF-03 are the acceptance criteria for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `extractAdfText(adf)` at `jiraService.js:19` — existing method to modify in-place (no new method needed)
- `noDescriptionLabel` in `llmApiClient.js:17` — already handles falsy description; just needs `null` from `extractAdfText` to trigger it

### Established Patterns
- No module system — all classes loaded via `<script>` tags; no imports needed
- Error handling in services uses `logger.warn` or similar (check existing usage in `jiraService.js`)
- Return type change (`''` → `null` when empty) is safe because the call site at `sidepanel.js:327` assigns to a local `const` before passing to `generateTestSteps`

### Integration Points
- `sidepanel.js:327-328` — only call site for `extractAdfText`; no changes needed there since `null` propagates correctly to `generateTestSteps`
- `llmApiClient.js:42` — `${issueDescription || noDescriptionLabel}` already handles `null` as falsy

</code_context>

<specifics>
## Specific Ideas

- No specific UI/UX references — this is a pure logic fix with no visible output change (except test steps now generate correctly for image-heavy issues)
- Verification approach from ROADMAP: test against a Jira issue whose description is only an embedded image — AI step generation should succeed and use the fallback label

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-fix-adf-description-extraction*
*Context gathered: 2026-03-25*
