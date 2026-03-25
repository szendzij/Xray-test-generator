# Codebase Structure

**Analysis Date:** 2026-03-25

## Directory Layout

```
xray-test-generator-v2/
├── manifest.json              # Chrome extension manifest (v3)
├── sidepanel.html             # Single HTML file with embedded styles
├── test-config.json           # Dev reference for testing (not runtime)
├── src/                       # All extension source code
│   ├── core/                  # Extension entry points
│   │   ├── background.js      # Service worker (installation, messaging)
│   │   ├── content.js         # Content script (page injection)
│   │   └── sidepanel.js       # Main orchestrator (XrayTestGenerator class)
│   ├── api/                   # HTTP clients for external services
│   │   ├── jiraApiClient.js   # Jira REST API wrapper
│   │   ├── xrayApiClient.js   # Xray Cloud GraphQL + auth
│   │   └── llmApiClient.js    # Google Gemini API
│   ├── services/              # Business logic layer
│   │   └── jiraService.js     # High-level Jira operations
│   ├── ui/                    # UI coordination and rendering
│   │   ├── uiManager.js       # Status/progress/log display
│   │   ├── stepperController.js # Multi-step workflow navigation
│   │   └── eventListenerManager.js # Event setup and coordination
│   └── utils/                 # Cross-cutting utilities
│       ├── constants.js       # All app constants
│       ├── logger.js          # Logging utility
│       ├── domHelper.js       # DOM manipulation abstractions
│       ├── errorHandler.js    # Error translation + retry logic
│       ├── configManager.js   # Config persistence (Chrome storage)
│       ├── validationService.js # Field validation rules
│       └── i18n.js            # Internationalization (Polish/English)
├── assets/                    # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── docs/                      # Documentation
    └── privacy-policy.html
```

## Directory Purposes

**`src/core/`:**
- Purpose: Chrome extension lifecycle and entry points
- Contains: Background service worker, content script injector, side panel orchestrator
- Key files: `sidepanel.js` (main UI controller)
- Load order matters: `background.js` loads first (service worker); `sidepanel.js` loads all dependencies in declared order in HTML

**`src/api/`:**
- Purpose: Raw HTTP client implementations for external services
- Contains: Jira REST, Xray GraphQL, Gemini APIs
- Key files: `jiraApiClient.js` (base64 auth), `xrayApiClient.js` (token caching)
- Isolation: Each client is independent; no inter-API communication

**`src/services/`:**
- Purpose: Domain-specific business operations
- Contains: Test case/plan/execution creation, issue caching, ADF extraction
- Key files: `jiraService.js` (singleton-like pattern, instantiated per connection check)
- Abstraction: Hides HTTP details; exposes high-level operations

**`src/ui/`:**
- Purpose: Rendering and user interaction management
- Contains: Status/progress display, step navigation, event listener setup
- Key files: `stepperController.js` (enforces 3-step workflow), `eventListenerManager.js` (centralizes all event listeners)
- Dependency: All UI logic depends on `validationService` and `configManager` instances

**`src/utils/`:**
- Purpose: Shared utilities and helpers across all layers
- Contains: Constants, logging, validation, DOM helpers, configuration, error handling
- Key files: `constants.js` (API paths, timeouts, progress milestones), `errorHandler.js` (retry logic)
- i18n: `i18n.js` provides `i18n.t()` function for all user-facing strings

**`assets/`:**
- Purpose: Extension visual assets
- Contains: PNG icons at 4 sizes (16, 32, 48, 128) for extension UI
- Referenced in: `manifest.json` icons section

**`docs/`:**
- Purpose: Public documentation
- Contains: Privacy policy HTML

## Key File Locations

**Entry Points:**
- `manifest.json`: Extension metadata, permissions, host permissions (Jira, Xray, Gemini URLs), background worker path, side panel default path
- `src/core/background.js`: Service worker listening for install/message/click events
- `src/core/sidepanel.js`: Main `XrayTestGenerator` class instantiated on panel open
- `src/core/content.js`: Page context detection and notification injection

**Configuration:**
- `sidepanel.html`: Single HTML file containing entire UI (styles in `<style>` tag, no external CSS)
- `src/utils/constants.js`: All magic values (API paths, timeouts, progress milestones, JQL modes, validation rules)
- `src/utils/configManager.js`: Chrome `storage.local` access for user settings

**Core Logic:**
- `src/services/jiraService.js`: Jira operations (issue lookup, cache, test case/plan/execution creation)
- `src/api/jiraApiClient.js`: Jira REST API with Basic Auth
- `src/api/xrayApiClient.js`: Xray Cloud GraphQL with JWT token caching
- `src/api/llmApiClient.js`: Gemini API with language-aware prompts and 429 retry handling

**Validation & Error:**
- `src/utils/validationService.js`: Field validation rules (URL, email, API key, JQL, project key)
- `src/utils/errorHandler.js`: Error translation to Polish, exponential backoff retry logic

**UI State:**
- `src/ui/stepperController.js`: Tracks current step (1-3), enforces validation before step change, updates CSS classes
- `src/ui/uiManager.js`: Displays status/progress bars/log messages with color coding
- `src/ui/eventListenerManager.js`: Adds click/input/change listeners to all interactive elements

**Utilities:**
- `src/utils/domHelper.js`: Abstracts `getElementById`/`querySelector` calls (logs warnings if element missing)
- `src/utils/logger.js`: Detects dev mode (localhost or chrome-extension protocol); suppresses info/debug in production
- `src/utils/i18n.js`: Global i18n instance with `t()` and `setLanguage()` methods

## Naming Conventions

**Files:**
- **Class files:** camelCase with class name (e.g., `jiraApiClient.js` contains `JiraApiClient` class)
- **Service files:** PascalCase suffix (e.g., `jiraService.js` contains `JiraService` class)
- **Utility/helper files:** Descriptive camelCase (e.g., `domHelper.js`, `configManager.js`, `errorHandler.js`)
- **Core/entry files:** Core files in `src/core/` match their role (e.g., `background.js`, `content.js`, `sidepanel.js`)

**Directories:**
- Lowercase: `src/`, `api/`, `services/`, `ui/`, `utils/`, `core/`, `assets/`, `docs/`
- Grouped by responsibility, not by file type

**Classes:**
- PascalCase (e.g., `XrayTestGenerator`, `JiraService`, `ErrorHandler`)
- Suffix conventions: `*Service` (business logic), `*Client` (HTTP), `*Manager` (state/coordination), `*Controller` (UI state)

**Methods:**
- camelCase: `checkConnection()`, `getIssuesByJql()`, `loadSavedConfig()`
- Prefix conventions: `get*()` (retrieval), `set*()` (assignment), `check*()` (validation/lookup), `create*()` (creation), `add*()` (addition)
- Private-like (convention, not enforced): Methods prefixed with `_` (e.g., `_parseRetryDelay()`)

**Constants:**
- SCREAMING_SNAKE_CASE in `src/utils/constants.js` (e.g., `BASE_PATH`, `MAX_RETRIES`, `DEFAULT_MAX_RESULTS`)
- Grouped in objects by domain (e.g., `CONSTANTS.API`, `CONSTANTS.TIMEOUTS`, `CONSTANTS.XRAY`)

**HTML Element IDs:**
- camelCase matching functionality (e.g., `checkConnection`, `generateTests`, `jiraUrl`, `status`, `progressBar`)
- Status IDs referenced in constants: `connectionStatus`, `parametersStatus`, `status`

**Data Attributes:**
- camelCase (e.g., `data-step`, `data-panel`, `data-toggle`)
- Used for CSS selectors and JS state tracking

## Where to Add New Code

**New Feature (e.g., new Jira operation):**
- Primary code: Add method to `src/services/jiraService.js` (business logic)
- API layer: Add method to `src/api/jiraApiClient.js` (HTTP communication)
- Keep them separate: Business layer calls API layer; never mix HTTP and logic

**New External Integration (e.g., new API):**
- Create new client: `src/api/newServiceApiClient.js` (HTTP + auth)
- Instantiate in: Constructor of service class that uses it (e.g., in `JiraService` if related to Jira)
- Dependency injection: Pass `errorHandler` instance to new client
- Add constants: New endpoints/URLs go in `src/utils/constants.js` (new CONSTANTS object)

**New UI Component/Step:**
- HTML: Add markup to `sidepanel.html` (only place for HTML/styles)
- JS: Add handler method to `XrayTestGenerator` class in `src/core/sidepanel.js`
- Events: Register listener in `src/ui/eventListenerManager.js`
- Validation: Add validator function to `src/utils/validationService.js` if needed

**New Utility Helper:**
- Standalone utilities: Add to `src/utils/` directory (e.g., `stringHelper.js`, `dateHelper.js`)
- Import in: Any file that needs it (no circular dependencies enforced, but avoid)
- Export: Singleton pattern preferred (e.g., `const myHelper = new MyHelper()` at bottom, then export)

**Tests (if added):**
- Location: Not currently present; if added, create `tests/` directory at root or alongside code
- Naming: `*.test.js` or `*.spec.js`
- Framework: Would need to add Jest/Vitest configuration to `manifest.json` (not currently used)

## Special Directories

**`.planning/`:**
- Purpose: GSD planning documents (architecture, structure, conventions, testing patterns)
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: Yes (git-tracked for team reference)

**`.claude/`:**
- Purpose: Claude IDE settings and worktree configurations
- Generated: Yes (by Claude Code IDE)
- Committed: Partial (some files in .gitignore)

**`.git/`:**
- Purpose: Git version control metadata
- Generated: Yes (by git)
- Committed: No (system directory)

**`docs/`:**
- Purpose: User-facing documentation (privacy policy)
- Generated: No (hand-written)
- Committed: Yes

**`assets/`:**
- Purpose: Extension icon images
- Generated: No (hand-created design assets)
- Committed: Yes

---

## Script Load Order (HTML)

The `sidepanel.html` file declares script tags in a critical order that defines dependency chains. This order **must be preserved** when modifying or adding scripts:

1. `src/utils/constants.js` — Declares `CONSTANTS` global
2. `src/utils/logger.js` — Declares `logger` global (used by all following scripts)
3. `src/utils/domHelper.js` — Declares `DOMHelper` class (static methods)
4. `src/utils/validationService.js` — Declares `ValidationService` class (uses CONSTANTS)
5. `src/utils/configManager.js` — Declares `ConfigManager` class (uses DOMHelper)
6. `src/utils/errorHandler.js` — Declares `ErrorHandler` class
7. `src/utils/i18n.js` — Declares `i18n` global (i18n translations)
8. `src/api/jiraApiClient.js` — Declares `JiraApiClient` class (uses logger, CONSTANTS)
9. `src/services/jiraService.js` — Declares `JiraService` class (uses JiraApiClient, logger)
10. `src/api/llmApiClient.js` — Declares `LlmApiClient` class (uses logger, CONSTANTS, i18n)
11. `src/api/xrayApiClient.js` — Declares `XrayApiClient` class (uses logger, CONSTANTS)
12. `src/ui/uiManager.js` — Declares `UIManager` class (uses DOMHelper, logger, CONSTANTS)
13. `src/ui/stepperController.js` — Declares `StepperController` class (uses ValidationService, UIManager, DOMHelper, logger)
14. `src/ui/eventListenerManager.js` — Declares `EventListenerManager` class (uses XrayTestGenerator reference)
15. `src/core/sidepanel.js` — Declares `XrayTestGenerator` class and instantiates it

**Critical Rule:** If you add a new utility or API client, insert it **after** its dependencies and **before** files that depend on it.

---

*Structure analysis: 2026-03-25*
