# Xray Test Generator - Przewodnik deweloperski

## Struktura projektu

```
chrome-extension/
├── manifest.json          # Konfiguracja rozszerzenia Chrome
├── popup.html            # Interfejs użytkownika
├── popup.js              # Logika głównej aplikacji
├── background.js         # Service worker (background script)
├── content.js            # Content script dla stron Jira
├── README.md             # Dokumentacja użytkownika
├── install.md            # Instrukcja instalacji
├── DEVELOPMENT.md        # Ten plik
└── test-config.json      # Przykładowa konfiguracja testowa
```

## Architektura

### Manifest V3
Rozszerzenie używa Manifest V3, najnowszej wersji Chrome Extensions API.

### Komponenty

#### 1. Popup (popup.html + popup.js)
- Główny interfejs użytkownika
- Obsługuje konfigurację i uruchamianie procesu
- Komunikuje się z Jira API
- Zarządza stanem aplikacji

#### 2. Background Script (background.js)
- Service worker działający w tle
- Obsługuje instalację i konfigurację domyślną
- Zarządza komunikacją między komponentami

#### 3. Content Script (content.js)
- Działa na stronach Jira
- Wykrywa kontekst strony
- Wyświetla powiadomienia
- Dodaje wskaźnik aktywności rozszerzenia

## Klasy i funkcje

### XrayTestGenerator (popup.js)
Główna klasa aplikacji:
- `initializeEventListeners()` - Inicjalizuje event listenery
- `loadSavedConfig()` - Ładuje zapisaną konfigurację
- `saveConfig()` - Zapisuje konfigurację
- `validateConfig()` - Waliduje dane wejściowe
- `checkConnection()` - Sprawdza połączenie z API
- `generateTests()` - Główna funkcja generowania testów

### JiraService (popup.js)
Klasa obsługująca komunikację z Jira API:
- `makeRequest()` - Wykonuje żądania HTTP do Jira API
- `getJqlCount()` - Pobiera liczbę wyników dla zapytania JQL
- `getIssuesByJql()` - Pobiera zadania z zapytania JQL
- `checkExistingTestCase()` - Sprawdza czy Test Case już istnieje
- `createTestCase()` - Tworzy nowy Test Case
- `createTestPlan()` - Tworzy Test Plan
- `createTestExecutions()` - Tworzy Test Executions

## API Jira

### Endpointy używane:
- `POST /rest/api/3/search/jql` - Wyszukiwanie zadań
- `POST /rest/api/3/issue` - Tworzenie nowych zadań
- `PUT /rest/api/3/issue/{key}` - Aktualizacja zadań
- `POST /rest/api/3/issueLink` - Tworzenie linków między zadaniami

### Autoryzacja:
```javascript
Authorization: Basic ${btoa(`${email}:${apiKey}`)}
```

## Konfiguracja

### Domyślne wartości:
```javascript
{
  jiraUrl: 'https://wfirma.atlassian.net',
  projectKey: 'RES',
  componentName: '5ways',
  fixVersion: '25.9'
}
```

### Walidacja:
- Wszystkie pola są wymagane
- Jira URL musi zaczynać się od `https://`
- Email musi być w formacie email
- API Key nie może być pusty

## Workflow generowania testów

1. **Sprawdzenie połączenia**
   - Weryfikuje konfigurację
   - Testuje połączenie z API
   - Sprawdza liczbę wyników JQL

2. **Pobieranie zadań**
   - Wykonuje zapytanie JQL
   - Pobiera szczegóły zadań
   - Filtruje zadania

3. **Tworzenie Test Cases**
   - Sprawdza czy Test Case już istnieje
   - Tworzy nowy Test Case
   - Linkuje do oryginalnego zadania

4. **Tworzenie Test Plan**
   - Tworzy Test Plan
   - Linkuje wszystkie Test Cases
   - Aktualizuje opis z JQL

5. **Tworzenie Test Executions**
   - Tworzy [RC] i [PROD] Test Executions
   - Linkuje do Test Plan

## Obsługa błędów

### Typy błędów:
- **Błąd konfiguracji** - Nieprawidłowe dane wejściowe
- **Błąd połączenia** - Problemy z API
- **Błąd autoryzacji** - Nieprawidłowe dane logowania
- **Błąd uprawnień** - Brak uprawnień do tworzenia zadań
- **Błąd API** - Błędy z Jira API

### Strategia obsługi:
- Walidacja na poziomie UI
- Retry dla błędów sieciowych
- Szczegółowe logi błędów
- Graceful degradation

## Testowanie

### Testy manualne:
1. Instalacja rozszerzenia
2. Konfiguracja z prawidłowymi danymi
3. Test połączenia
4. Generowanie testów z małą liczbą zadań
5. Sprawdzenie utworzonych elementów w Jira

### Testy automatyczne:
- Walidacja konfiguracji
- Testy API (mock)
- Testy UI (selenium/playwright)

## Debugowanie

### Narzędzia:
- Chrome DevTools
- Console logs
- Network tab
- Storage tab

### Logi:
- Wszystkie operacje są logowane
- Różne poziomy: info, success, warning, error
- Timestamp dla każdego logu

## Rozwój

### Dodawanie nowych funkcji:
1. Zaktualizuj manifest.json jeśli potrzebne nowe uprawnienia
2. Dodaj UI w popup.html
3. Zaimplementuj logikę w popup.js
4. Dodaj obsługę błędów
5. Zaktualizuj dokumentację

### Optymalizacje:
- Batch requests dla API
- Caching konfiguracji
- Lazy loading komponentów
- Progress indicators

## Bezpieczeństwo

### Dane wrażliwe:
- API Key jest przechowywany lokalnie
- Nie wysyłamy danych do zewnętrznych serwerów
- Używamy HTTPS dla wszystkich żądań

### Uprawnienia:
- Minimalne wymagane uprawnienia
- Host permissions tylko dla Jira
- Brak dostępu do wszystkich stron

## Wersjonowanie

### Format wersji:
- Major.Minor.Patch (np. 1.0.0)
- Aktualizacje w manifest.json
- Changelog w README.md

### Deployment:
1. Zaktualizuj wersję w manifest.json
2. Przetestuj rozszerzenie
3. Utwórz archiwum ZIP
4. Opublikuj w Chrome Web Store (opcjonalnie)
