# Xray Test Generator v2

## What This Is

A Chrome Extension (Manifest V3) that automates the creation of Jira test cases, test plans, and test executions from a JQL query. It integrates with Xray Cloud (EU), Google Gemini AI for test step generation, and the Jira REST API. Targeted at QA teams working with Jira + Xray Cloud who want to reduce manual test scaffolding effort.

## Core Value

One-click generation of a complete, linked test suite (test cases → test plan → test executions) from any JQL query.

## Requirements

### Validated

- ✓ Fetch Jira issues by JQL (auto and custom mode) — existing
- ✓ Create Xray Test Case issues linked to source Jira issues — existing
- ✓ Generate AI test steps via Gemini and add via Xray GraphQL — existing
- ✓ Create Test Plan for a fix version — existing
- ✓ Create Test Executions ([RC] and [PROD] prefixes) per fix version — existing
- ✓ Link test cases to test plan and executions via Jira issue links — existing
- ✓ Duplicate detection via cache (skip existing test cases/plans/executions) — existing
- ✓ Multi-language UI support (PL/EN) — existing
- ✓ Config persistence via chrome.storage.local — existing

### Active

- [ ] FIX: ADF description extraction must robustly handle attachment/media-heavy descriptions — prevent AI step generation errors when issues contain embedded images or non-text nodes
- [ ] FEAT: Add tests to Xray test execution via Xray Cloud REST API (`POST /api/v2/testexec/{key}/test`) in addition to (or replacing) the current Jira issue link — so tests appear as actual test runs in Xray, not just Jira links

### Out of Scope

- Manual test step editing in the extension — complexity not justified, Xray UI handles this
- Support for Xray Server/DC (only Cloud EU) — different auth model, separate effort
- Webhook/automated triggers — browser extension constraint, user-initiated only

## Context

- Chrome Extension loads from root directory (not worktrees) — fixes must land on `main` branch to be visible
- Script load order is critical and defined in `sidepanel.html`; no module system
- `jiraService.extractAdfText()` currently traverses ADF nodes but joins all extracted text with spaces — when description is image/attachment-heavy the output is sparse or empty, which confuses Gemini
- Xray Cloud REST `POST /api/v2/testexec/{key}/test` with `{"add": [...keys]}` is the correct way to register tests in Xray (vs Jira `issueLink` which only creates a visual link)
- `manifest.json` must list all new `fetch()` targets in `host_permissions` — Chrome blocks other origins

## Constraints

- **Tech Stack**: No build system, no modules — all JS classes loaded via `<script>` tags in `sidepanel.html`
- **API**: Xray Cloud EU only — base URL `https://eu.xray.cloud.getxray.app`
- **Auth**: Xray REST calls need Bearer token (same JWT from `getToken()` already implemented)
- **Chrome Extension**: No `gh` CLI — PRs created via GitHub web URL

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use Xray REST for adding tests to execution | Jira `issueLink` doesn't register tests in Xray test run — only REST endpoint does | — Pending |
| Strip/handle empty description before Gemini call | Sending blank/sparse description causes invalid Gemini output; better to pass meaningful fallback | — Pending |

---
*Last updated: 2026-03-25 after initialization*

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state
