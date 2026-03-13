# Xray Test Generator v2 - Przewodnik deweloperski

## Struktura projektu

```
xray-test-generator-v2/
├── manifest.json              # Konfiguracja rozszerzenia Chrome (MV3)
├── sidepanel.html             # Interfejs użytkownika (side panel, wszystkie style inline)
├── test-config.json           # Lokalna konfiguracja dev (NIE jest ładowana w runtime)
│
├── src/
│   ├── core/
│   │   ├── sidepanel.js       # Główna klasa XrayTestGenerator — pipeline 6-etapowy
│   │   ├── background.js      # Service worker — domyślna konfiguracja, routing wiadomości
│   │   └── content.js         # Content script dla stron Jira — detekcja kontekstu
│   │
│   ├── api/
│   │   ├── jiraApiClient.js   # Klient HTTP Jira REST API v3
│   │   ├── llmApiClient.js    # Klient Google Gemini API — generowanie kroków AI
│   │   └── xrayApiClient.js   # Klient Xray Cloud API — JWT auth + GraphQL
│   │
│   ├── services/
│   │   └── jiraService.js     # Logika biznesowa — tworzenie testów, cache, linkowanie
│   │
│   ├── ui/
│   │   ├── uiManager.js       # Pasek postępu, log, statusy, przyciski
│   │   ├── stepperController.js # Zarządzanie 3-kartowym krokiem, walidacja wizualna
│   │   └── eventListenerManager.js # Podpięcie wszystkich eventów UI
│   │
│   └── utils/
│       ├── constants.js       # Wszystkie stałe aplikacji
│       ├── logger.js          # Logowanie (tylko w trybie dev)
│       ├── domHelper.js       # Abstrakcje DOM (get/set/show/hide)
│       ├── validationService.js # Reguły walidacji pól formularza
│       ├── configManager.js   # Ładowanie/zapis do chrome.storage.local
│       ├── errorHandler.js    # Obsługa błędów, exponential backoff
│       └── i18n.js            # Tłumaczenia PL/EN, interpolacja parametrów
│
└── assets/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Kolejność ładowania skryptów (KRYTYCZNA)

Zdefiniowana w `sidepanel.html`. Musi być zachowana — zmiana powoduje błędy "undefined":

```
i18n → constants → logger → domHelper → validationService → configManager →
errorHandler → jiraApiClient → jiraService → llmApiClient → xrayApiClient →
uiManager → stepperController → eventListenerManager → sidepanel.js
```

## Architektura — warstwy

| Warstwa | Pliki |
|---------|-------|
| Prezentacja | `sidepanel.html` (accordion: credentials → query → execution) |
| Orkiestracja | `src/core/sidepanel.js` |
| Logika biznesowa | `src/services/jiraService.js` |
| HTTP | `src/api/jiraApiClient.js`, `llmApiClient.js`, `xrayApiClient.js` |
| Utilities | `configManager`, `validationService`, `uiManager`, `errorHandler`, `domHelper`, `logger`, `i18n` |
| Stan | `chrome.storage.local` (config), `Map` cache w JiraService |

## Klasy i metody

### XrayTestGenerator (sidepanel.js)
Główna klasa aplikacji — orchestrator pipeline'u:
- `checkConnection()` — weryfikuje credentials i JQL, aktualizuje dot wskaźnika
- `previewIssues()` — pobiera liczbę zadań bez uruchamiania generowania
- `generateTests()` — uruchamia 6-etapowy pipeline
- `fetchIssuesFromJql(config)` — Etap 1: pobiera zadania
- `createTestCases(issues, config)` — Etap 2: tworzy Test Cases, zwraca `issueMap`
- `generateAiTestSteps(testCases, issueMap, config)` — Etap 2.5 (opcjonalny): AI kroki
- `createOrGetTestPlan(testCases, config)` — Etap 3
- `linkTestCasesToPlan(testCases, testPlan)` — Etap 4
- `createTestExecutions(testPlan, config)` — Etap 5
- `linkTestCasesToExecutions(testCases, testExecutions)` — Etap 6
- `buildJqlQuery(config)` — zwraca `config.customJql` (tryb custom)

### JiraService (jiraService.js)
Logika biznesowa wyższego poziomu:
- `createTestCase(issue, config)` — sprawdza duplikat, tworzy issue, linkuje
- `createTestPlan(testCases, config)` — sprawdza duplikat, tworzy, aktualizuje opis
- `ensureTestExecutions(testPlan, config)` — tworzy [RC] i [PROD] executions
- `linkTestCasesToIssue(testCases, targetIssueKey)` — linkuje listę testów do issue
- `addTestStepsToTestCase(testCase, steps)` — wysyła kroki do Xray GraphQL
- `checkExistingTestCase(issueKey)` — JQL: `issue in linkedIssues(KEY) AND issuetype = "Test"`
- `checkCached(store, key, jql)` — cache: Map → findSingleIssue fallback
- `extractAdfText(adf)` — rekurencyjnie wyciąga tekst z ADF (max 2000 znaków)
- `buildAdfDoc(...paragraphs)` — buduje obiekt ADF

### JiraApiClient (jiraApiClient.js)
Klient HTTP Jira REST v3:
- `makeRequest(endpoint, options)` — GET/POST/PUT, Basic Auth, obsługa 204/205
- `makeRequestWithRetry(endpoint, options)` — wrap z exponential backoff
- `getIssuesByJql(jql, maxResults)` — pola: summary, issuetype, priority, description, assignee, reporter
- `findSingleIssue(jql)` — tylko pole `summary`, zwraca pierwsze lub null
- `createIssue(issueData)` — POST /issue
- `updateIssue(issueKey, data)` — PUT /issue/{key}
- `linkIssues(inwardKey, outwardKey, linkType)` — POST /issueLink

### LlmApiClient (llmApiClient.js)
Klient Google Gemini:
- `generateTestSteps(summary, description, attempt)` — prompt → JSON [{action, data, result}]
- `_parseRetryDelay(response)` — parsuje `retryDelay` z odpowiedzi 429

### XrayApiClient (xrayApiClient.js)
Klient Xray Cloud:
- `getToken()` — POST /api/v2/authenticate → plain JWT, cache 23h
- `addTestStep(issueId, step)` — GraphQL mutation `addTestStep`, `issueId` to numeryczne ID

## API używane

### Jira REST API v3
| Endpoint | Metoda | Cel |
|----------|--------|-----|
| `/rest/api/3/search/approximate-count` | POST | Liczba wyników JQL |
| `/rest/api/3/search/jql` | GET/POST | Pobieranie zadań |
| `/rest/api/3/issue` | POST | Tworzenie zadań |
| `/rest/api/3/issue/{key}` | PUT | Aktualizacja zadania |
| `/rest/api/3/issueLink` | POST | Linkowanie zadań |

### Xray Cloud API (EU)
| Endpoint | Metoda | Cel |
|----------|--------|-----|
| `https://eu.xray.cloud.getxray.app/api/v2/authenticate` | POST | Pobieranie JWT |
| `https://eu.xray.cloud.getxray.app/api/v2/graphql` | POST | Dodawanie kroków (mutation addTestStep) |

### Google Gemini API
| Endpoint | Metoda | Cel |
|----------|--------|-----|
| `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent` | POST | Generowanie kroków testowych |

## Wzorce kodu

### Conditional spread
```javascript
{
  fields: {
    ...(reporterAccountId && { assignee: { accountId: reporterAccountId } }),
    ...(config.fixVersion && { fixVersions: [{ name: config.fixVersion }] })
  }
}
```

### Prefiks `_` dla runtime metadata
```javascript
execution._wasExisting = true;  // nie jest polem Jira API
```

### Kształt zwracanych wartości z serwisów
```javascript
{ result, createdCount, skippedCount }
// lub
{ executions, createdCount, skippedExecutions }
```

### ADF — Atlassian Document Format
```javascript
// Budowanie:
jiraService.buildAdfDoc("Paragraf 1", "Paragraf 2")
// Ekstrakcja tekstu:
jiraService.extractAdfText(issue.fields.description)  // max 2000 znaków
```

### Cache pattern
```javascript
await jiraService.checkCached('testCases', key, jql)
// → sprawdza Map → fallback do findSingleIssue → zapisuje do Map
```

## Pipeline generowania — Etapy

```
Etap 1/6  fetchIssuesFromJql()          → 10-20%
Etap 2/6  createTestCases()             → 20-60%
Etap 2.5  generateAiTestSteps()         → 62-68%  (opcjonalny, jeśli useAiSteps=true)
Etap 3/6  createOrGetTestPlan()         → 70-80%
Etap 4/6  linkTestCasesToPlan()         → 85%
Etap 5/6  createTestExecutions()        → 90%
Etap 6/6  linkTestCasesToExecutions()   → 100%
```

## Walidacja

`ValidationService` — reguły per pole:
- `jiraUrl` — musi zaczynać się od `https://`, być poprawnym URL
- `jiraEmail` — format email
- `jiraApiKey` — min 10 znaków
- `customJql` — min 10 znaków, musi zawierać `project`
- `customProjectKey` — tylko wielkie litery
- `customComponentName` — wymagane
- `customFixVersion` — wymagane

## Konfiguracja

### chrome.storage.local — klucze
`jiraUrl`, `jiraEmail`, `jiraApiKey`, `customJql`, `customProjectKey`, `customComponentName`, `customFixVersion`

### Domyślne wartości (ustawiane przez background.js przy pierwszej instalacji)
```javascript
{
  jiraUrl: 'https://wfirma.atlassian.net',
  projectKey: 'RES',
  componentName: '5ways',
  fixVersion: '25.9'
}
```

## Obsługa błędów

`ErrorHandler` — strategia retry:
- 3 próby, exponential backoff: 1s → 2s → 4s
- Nie ponawia dla: 401, 403, 404, błędów walidacji
- Ponawia dla: 429, 5xx, błędów sieciowych
- Gemini 429: parsuje `retryDelay` z body odpowiedzi (fallback: 20s)

## Internacjonalizacja (i18n)

- Domyślny język: polski
- Przełączanie: przyciski `PL` / `EN` w headerze
- Język zapisywany w `localStorage` pod kluczem `xray-lang`
- Tłumaczenia: `src/utils/i18n.js` — 200+ kluczy
- Użycie: `i18n.t('key', { param: value })`

## Debugowanie

1. Otwórz `chrome://extensions/`
2. Znajdź "Xray Test Generator v2"
3. Kliknij "Zbadaj widoki" → "side panel"
4. Konsola pokazuje logi z `logger.js` (tylko w trybie dev)

## Dodawanie nowych funkcji

1. Jeśli nowy `fetch()` do zewnętrznego hosta → dodaj do `host_permissions` w `manifest.json`
2. Nowe stałe → `src/utils/constants.js`
3. Nowe tłumaczenia → `src/utils/i18n.js` (obie wersje: pl + en)
4. Nowe elementy UI → `sidepanel.html` (style w bloku `<style>`)
5. Nowe skrypty → dodaj do `sidepanel.html` w odpowiednim miejscu load order
6. Logika biznesowa → `jiraService.js`, HTTP → odpowiedni `*ApiClient.js`

## Wersjonowanie

- Format: `Major.Minor.Patch` (np. `1.0.1`)
- Aktualizuj `version` w `manifest.json`
