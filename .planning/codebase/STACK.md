# Technology Stack

**Analysis Date:** 2026-03-25

## Languages

**Primary:**
- JavaScript (vanilla ES6+) - All source code in `src/`
- HTML - UI markup in `sidepanel.html`
- CSS - Styles embedded in `<style>` block of `sidepanel.html` (no separate stylesheet)

**Secondary:**
- JSON - Configuration and manifest files

## Runtime

**Environment:**
- Chrome Extension (Manifest V3)
- Browser: Google Chrome (requires Chrome extensions support)
- No Node.js or build process required — extension loads directly from source files

**No Package Manager:**
- No `package.json`, `npm`, `yarn`, or other dependency management
- All code is native JavaScript (no external npm packages)
- Extension uses only native browser APIs (`fetch`, `chrome.storage`, `chrome.scripting`, etc.)

## Frameworks

**Core:**
- Chrome Extensions API v3 - Extension framework (`chrome.storage`, `chrome.sidePanel`, etc.)
- DOM APIs - Native browser DOM manipulation

**Testing:**
- No testing framework integrated
- Manual testing via extension load in Chrome

**Build/Dev:**
- No build system or build tools required
- No transpilation or bundling step — code runs as-is

## Key Dependencies

**None** - This is a zero-dependency extension. All functionality uses:
- Native JavaScript (ES6+)
- Chrome Extension APIs
- Fetch API for HTTP requests
- Local Storage (Chrome) for persistence

## Configuration

**Environment:**
- Configuration stored in `chrome.storage.local` via Chrome's Storage API
- Config keys defined in `src/utils/constants.js` → `CONSTANTS.STORAGE.KEYS`
- Required runtime config:
  - `jiraUrl`: Jira instance URL
  - `jiraEmail`: Jira user email
  - `jiraApiKey`: Jira API token
  - `geminiApiKey`: Google Gemini API key (optional, for AI step generation)
  - `xrayClientId`: Xray Cloud client ID (optional, for Xray integration)
  - `xrayClientSecret`: Xray Cloud client secret (optional, for Xray integration)

**Secrets Storage:**
- Secrets stored in `chrome.storage.local` at runtime
- Not committed to git or source control
- Populated via UI form in sidepanel (no `.env` files)

**Build:**
- No build configuration files
- Extension manifest: `manifest.json` (Manifest V3)

## Platform Requirements

**Development:**
- Windows 11 (current development platform)
- Any OS with Chrome browser
- No build tools required
- No Node.js required

**Production (Runtime):**
- Google Chrome browser with extension support
- Manifest V3 compatible Chrome version (v88+)
- Network access to:
  - Jira Cloud instances (Atlassian.net or custom Jira domains)
  - Google Generative Language API (Gemini)
  - Xray Cloud (EU region: `eu.xray.cloud.getxray.app`)

**Host Permissions** (declared in `manifest.json`):
- `https://*.atlassian.net/*` - Jira Cloud
- `https://*.jira.com/*` - Jira Cloud variants
- `https://generativelanguage.googleapis.com/*` - Google Gemini API
- `https://eu.xray.cloud.getxray.app/*` - Xray Cloud EU

## Script Load Order

The extension enforces a strict script load order in `sidepanel.html` to manage dependencies:

1. `src/utils/constants.js` - Global constants definition
2. `src/utils/logger.js` - Logging utility
3. `src/utils/domHelper.js` - DOM manipulation helpers
4. `src/utils/validationService.js` - Input validation
5. `src/utils/configManager.js` - Configuration management
6. `src/utils/errorHandler.js` - Error handling and retry logic
7. `src/api/jiraApiClient.js` - Jira REST API client
8. `src/services/jiraService.js` - Jira business logic layer
9. `src/api/llmApiClient.js` - Gemini LLM API client
10. `src/api/xrayApiClient.js` - Xray Cloud API client
11. `src/ui/uiManager.js` - UI state and rendering
12. `src/ui/stepperController.js` - Multi-step wizard logic
13. `src/ui/eventListenerManager.js` - Event handlers
14. `src/core/sidepanel.js` - Main extension class (`XrayTestGenerator`)

Critical: This order must be maintained; scripts depend on earlier scripts being loaded.

## Performance Notes

- No minification or optimization step — development files served as-is
- Timeout constants defined in `CONSTANTS.TIMEOUTS`:
  - `API_DELAY`: 500ms between requests
  - `LINK_DELAY`: 200ms between link operations
  - `DEBOUNCE_SAVE`: 300ms for config auto-save
- Rate limiting handled for Gemini API (429 responses with `retryDelay` parsing)

---

*Stack analysis: 2026-03-25*
