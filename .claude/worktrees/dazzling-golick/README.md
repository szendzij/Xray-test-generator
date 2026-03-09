# Xray Test Generator - Chrome Extension

Rozszerzenie Chrome do automatycznego generowania testów Xray z zadań Jira.

## Funkcjonalności

### 🔍 Sprawdzanie połączenia z API
- Weryfikuje połączenie z Jira API
- Sprawdza ilość wyników z zapytania JQL: `project = RES AND fixVersion = "25.9" AND development[pullrequests].all > 0 and development[pullrequests].open = 0`

### 📋 Pobieranie zadań z JQL
- Pobiera zadania spełniające określone kryteria
- Filtruje zadania z zamkniętymi pull requestami

### 🔨 Tworzenie Test Cases
- Sprawdza czy test już istnieje dla każdego zadania
- Tworzy nowy Test Case z linkiem do oryginalnego zadania
- Przypisuje priorytet, komponent i fix version

### 📋 Tworzenie Test Plan
- Tworzy nowy Test Plan
- Linkuje wszystkie Test Cases do Test Plan

### 🎯 Tworzenie Test Executions
- Tworzy dwa Test Executions: [RC] i [PROD]
- Linkuje je do Test Plan

## Instalacja

1. Otwórz Chrome i przejdź do `chrome://extensions/`
2. Włącz "Tryb dewelopera" (Developer mode)
3. Kliknij "Załaduj rozpakowane" (Load unpacked)
4. Wybierz folder `chrome-extension`
5. Rozszerzenie zostanie zainstalowane i będzie dostępne w pasku narzędzi

## Konfiguracja

Po instalacji kliknij ikonę rozszerzenia i skonfiguruj:

- **Jira Base URL**: URL Twojej instancji Jira (np. https://your-domain.atlassian.net)
- **Jira Email**: Twój adres email w Jira
- **Jira API Key**: Klucz API Jira (wygeneruj w ustawieniach konta)
- **Fix Version**: Wersja do przetworzenia (domyślnie "25.9")
- **Project Key**: Klucz projektu (domyślnie "RES")
- **Component Name**: Nazwa komponentu (domyślnie "5ways")

## Użytkowanie

1. **Sprawdź połączenie**: Kliknij "🔍 Sprawdź połączenie" aby zweryfikować konfigurację
2. **Generuj testy**: Kliknij "🚀 Generuj testy" aby rozpocząć proces tworzenia testów

## Struktura tworzonych elementów

### Test Case
```json
{
  "fields": {
    "project": { "key": "RES" },
    "summary": "RES-123 | Bug | Opis błędu", 
    "description": "Test case for issue <RES-123>",
    "issuetype": { "name": "Test" },
    "priority": { "name": "Medium" },
    "components": [{ "name": "5ways" }],
    "fixVersions": [{ "name": "FFFV" }]
  }
}
```

### Test Plan
```json
{
  "fields": {
    "project": { "key": "RES" },
    "summary": "Test Plan for Release <XYZ>",
    "description": "JQL filter for all tests linked to this test plan...",
    "issuetype": { "name": "Test Plan" },
    "components": [{ "name": "5ways" }],
    "fixVersions": [{ "name": "FFFV" }]
  }
}
```

### Test Execution
```json
{
  "fields": {
    "project": { "key": "RES" },
    "summary": "[RC] Test execution for Release <XYZ>",
    "description": "JQL filter for all tests linked to this test plan...",
    "issuetype": { "name": "Test Execution" },
    "components": [{ "name": "5ways" }],
    "fixVersions": [{ "name": "FFFV" }]
  }
}
```

## Wymagania

- Chrome 88+ (Manifest V3)
- Dostęp do Jira API
- Uprawnienia do tworzenia Test Cases, Test Plans i Test Executions w projekcie

## Bezpieczeństwo

- Wszystkie dane konfiguracyjne są przechowywane lokalnie w przeglądarce
- API Key jest szyfrowany w pamięci przeglądarki
- Rozszerzenie nie wysyła danych do zewnętrznych serwerów

## Rozwiązywanie problemów

### Błąd połączenia
- Sprawdź czy URL Jira jest poprawny
- Zweryfikuj czy API Key jest aktualny
- Upewnij się, że masz uprawnienia do API

### Błąd tworzenia testów
- Sprawdź czy masz uprawnienia do tworzenia Test Cases w projekcie
- Zweryfikuj czy komponent "5ways" istnieje w projekcie
- Upewnij się, że fix version "FFFV" istnieje w projekcie

## Wsparcie

W przypadku problemów sprawdź logi w konsoli deweloperskiej Chrome (F12) lub skontaktuj się z zespołem deweloperskim.
