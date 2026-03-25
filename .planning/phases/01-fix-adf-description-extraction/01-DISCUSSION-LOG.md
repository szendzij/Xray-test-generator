# Phase 1: Fix ADF Description Extraction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 01-fix-adf-description-extraction
**Areas discussed:** Node filtering strategy, Short-text threshold, Error resilience

---

## Node Filtering Strategy

**Question:** How should `extractAdfText` filter ADF nodes?

**Options presented:**
- Blacklist bad types — skip `media`, `mediaSingle`, `mediaGroup`, `mediaInline`, `hardBreak`, `emoji`, `mention`
- Whitelist good types — only extract from `paragraph`, `heading`, `bulletList`, `orderedList`, `listItem`, `text`, `blockquote`, `codeBlock`
- You decide — leave to planner

**Selected:** Blacklist bad types

**Rationale:** Targeted and matches ROADMAP spec. Simpler to read and review. Whitelist was considered as more defensive against future Jira ADF node types.

---

## Short-Text Threshold

**Question:** What's the minimum extracted text length before `extractAdfText` returns `null`?

**Options presented:**
- < 20 chars → null (ROADMAP spec)
- < 10 chars → null (more conservative)
- Empty only (≤ 0 chars) → null

**Selected:** < 20 chars → null

**Rationale:** Matches ROADMAP spec. Catches near-empty extractions from mostly-image descriptions. Jira issue summaries provide context for very short descriptions.

---

## Error Resilience

**Question:** Should `extractAdfText` wrap traversal in try/catch?

**Options presented:**
- Yes — return null on error
- No — keep throw-on-error (current behavior)

**Selected:** Yes — return null on error

**Rationale:** Consistent with ADF-02 fallback behavior — any error producing null means `noDescriptionLabel` is used. Defensive for malformed ADF objects.

---
