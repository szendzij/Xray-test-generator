# Instrukcja instalacji — Xray Test Generator v2

## Krok po kroku

### 1. Przygotowanie

Upewnij się, że masz folder projektu z następującą strukturą:
```
xray-test-generator-v2/
├── manifest.json
├── sidepanel.html
├── src/
│   ├── core/   (sidepanel.js, background.js, content.js)
│   ├── api/    (jiraApiClient.js, llmApiClient.js, xrayApiClient.js)
│   ├── services/ (jiraService.js)
│   ├── ui/     (uiManager.js, stepperController.js, eventListenerManager.js)
│   └── utils/  (constants.js, logger.js, domHelper.js, ...)
└── assets/     (icon*.png)
```

### 2. Instalacja w Chrome

1. Otwórz przeglądarkę Chrome
2. Przejdź do `chrome://extensions/`
3. W prawym górnym rogu włącz **"Tryb dewelopera"** (Developer mode)
4. Kliknij **"Załaduj rozpakowane"** (Load unpacked)
5. Wybierz **główny folder** projektu (`xray-test-generator-v2/`) — ten, w którym leży `manifest.json`
6. Kliknij **"Wybierz folder"**

### 3. Weryfikacja instalacji

- Rozszerzenie powinno pojawić się na liście z nazwą "Xray Test Generator v2"
- Ikona pojawi się w pasku narzędzi Chrome
- Jeśli ikona nie jest widoczna, kliknij ikonę puzzli (🧩) w pasku i przypnij rozszerzenie

### 4. Pierwsze uruchomienie

Kliknij ikonę rozszerzenia — otworzy się **panel boczny** po prawej stronie Chrome.

#### Zakładka 1 — Credentials
Wypełnij dane dostępowe do Jira:
- **Jira Base URL**: `https://wfirma.atlassian.net` (lub adres Twojej instancji)
- **Jira Email**: Twój email w systemie Jira
- **Jira API Key**: Token API (patrz sekcja poniżej)

Kliknij **"Sprawdź połączenie"** — przy sukcesie zobaczysz zieloną kropkę i liczbę zadań.

#### Zakładka 2 — Parametry zapytania
- **JQL Query**: Wpisz zapytanie JQL, np.:
  `project = RES AND fixVersion = "25.9" AND issuetype in (Bug, Task)`
- **Project Key**: `RES`
- **Component Name**: `5ways`
- **Fix Version**: `25.9`

#### Opcjonalnie — Generowanie kroków AI
Zaznacz checkbox **"Generuj kroki testowe przez AI"** i podaj:
- **Xray Client ID** + **Xray Client Secret** — z ustawień Xray Cloud
- **Gemini API Key** — z [aistudio.google.com](https://aistudio.google.com)

### 5. Generowanie testów

1. Kliknij **"Generuj testy"**
2. Obserwuj pasek postępu i log w czasie rzeczywistym
3. Po zakończeniu pojawi się podsumowanie:
   - **Tests** — liczba nowo utworzonych Test Cases
   - **Plans** — 1 jeśli Test Plan został utworzony, 0 jeśli już istniał
   - **Executions** — liczba nowo utworzonych Test Executions
   - **Links** — łączna liczba powiązań

## Generowanie API Key w Jira

1. Zaloguj się do Jira
2. Kliknij na swój awatar (prawy górny róg) → **"Account settings"**
3. W menu po lewej kliknij **"Security"**
4. W sekcji **"API tokens"** kliknij **"Create API token"**
5. Nadaj nazwę (np. "Xray Test Generator") i skopiuj wygenerowany token

## Generowanie Xray Client ID/Secret

1. Zaloguj się do Xray Cloud (`xray.cloud.getxray.app`)
2. Przejdź do **Settings → API Keys**
3. Utwórz nowy klucz i skopiuj Client ID oraz Client Secret

## Aktualizacja rozszerzenia

1. Zastąp pliki w folderze projektu nowymi wersjami
2. Przejdź do `chrome://extensions/`
3. Kliknij ikonę odświeżania (🔄) przy rozszerzeniu lub kliknij **"Aktualizuj"**

## Rozwiązywanie problemów

### Rozszerzenie się nie instaluje
- Sprawdź czy wybrano główny folder (z `manifest.json`), nie podfolder
- Upewnij się, że tryb dewelopera jest włączony
- Odśwież stronę `chrome://extensions/`

### Czerwona kropka / błąd połączenia
- Sprawdź poprawność URL Jira (musi zaczynać się od `https://`)
- Zweryfikuj czy API Key jest aktualny
- Sprawdź czy JQL jest poprawny (kliknij "Podejrzyj wyniki" dla testu)

### Błąd tworzenia testów
- Sprawdź czy masz uprawnienia do tworzenia zadań typu Test/Test Plan/Test Execution
- Zweryfikuj czy komponent i fix version istnieją w projekcie Jira

### Kroki AI nie są generowane
- Sprawdź czy Gemini API Key jest aktywny i ma dostępny limit
- Sprawdź Xray Client ID/Secret — token jest odświeżany co 23h
- W konsoli DevTools sprawdź logi: `chrome://extensions/` → "Zbadaj widoki" → "side panel"

## Odinstalowanie

1. Przejdź do `chrome://extensions/`
2. Znajdź "Xray Test Generator v2"
3. Kliknij **"Usuń"** (Remove) i potwierdź
