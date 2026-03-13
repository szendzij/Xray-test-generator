# Xray Test Generator v2 - Chrome Extension

Rozszerzenie Chrome do automatycznego generowania testów Xray z zadań Jira.

## Funkcjonalności

### 🔍 Sprawdzanie połączenia z API
- Weryfikuje połączenie z Jira API za pomocą podanych credentials
- Sprawdza liczbę wyników zwracanych przez skonfigurowane zapytanie JQL
- Wyświetla zielony/czerwony wskaźnik statusu połączenia

### 📋 Pobieranie zadań z JQL
- Obsługuje dowolne zapytanie JQL wpisane przez użytkownika
- Podgląd liczby znalezionych zadań przed uruchomieniem generowania
- Pobiera pola: `summary`, `issuetype`, `priority`, `description`, `assignee`, `reporter`

### 🔨 Tworzenie Test Cases
- Sprawdza czy Test Case już istnieje dla każdego zadania (pomija duplikaty)
- Tworzy nowy Test Case z formatem: `{KEY} | {typ} | {summary}`
- Kopiuje opis (ADF) z oryginalnego zadania, przypisuje priorytet, komponent, fix version
- Przypisuje osobę z pola `reporter` jako `assignee` w Test Case
- Linkuje Test Case z powrotem do oryginalnego zadania

### 🤖 Generowanie kroków testowych przez AI (opcjonalne)
- Integracja z Google Gemini — generuje 3-7 kroków testowych dla każdego Test Case
- Kroki w języku polskim, format: `{ action, data, result }`
- Przesyła kroki do Xray Cloud przez GraphQL API
- Wymaga: klucz Gemini API + Xray Cloud Client ID/Secret

### 📋 Tworzenie Test Plan
- Sprawdza czy Test Plan już istnieje (wg fix version) — jeśli tak, reużywa
- Tworzy nowy Test Plan: `Test Plan for Release {fixVersion}`
- Aktualizuje opis z JQL filterem

### 🎯 Tworzenie Test Executions
- Tworzy dwa Test Executions: `[RC] Test execution for Release {fixVersion}` i `[PROD] ...`
- Linkuje je do Test Plan
- Sprawdza czy już istnieją przed tworzeniem

### 🔗 Linkowanie
- Linkuje Test Cases do Test Plan
- Linkuje Test Cases do obu Test Executions

## Instalacja

1. Otwórz Chrome i przejdź do `chrome://extensions/`
2. Włącz **"Tryb dewelopera"** (Developer mode)
3. Kliknij **"Załaduj rozpakowane"** (Load unpacked)
4. Wybierz **główny folder** projektu (gdzie leży `manifest.json`)
5. Rozszerzenie zostanie zainstalowane i będzie dostępne w pasku narzędzi

## Konfiguracja

Po instalacji kliknij ikonę rozszerzenia — otworzy się panel boczny (side panel):

### Zakładka 1 — Credentials
- **Jira Base URL**: URL Twojej instancji Jira (np. `https://your-domain.atlassian.net`)
- **Jira Email**: Twój adres email w Jira
- **Jira API Key**: Klucz API Jira (wygeneruj w ustawieniach konta)

### Zakładka 2 — Parametry zapytania
- **JQL Query**: Zapytanie JQL do wybrania zadań źródłowych
- **Project Key**: Klucz projektu (np. `RES`) — w tym projekcie będą tworzone testy
- **Component Name**: Nazwa komponentu przypisywanego do tworzonych testów
- **Fix Version**: Wersja releasu (np. `25.9`)

### Opcjonalnie — Generowanie kroków AI
Zaznacz checkbox **"Generuj kroki testowe przez AI"** aby aktywować:
- **Xray Client ID**: Client ID z Xray Cloud Settings
- **Xray Client Secret**: Client Secret z Xray Cloud Settings
- **Gemini API Key**: Klucz z Google AI Studio (`aistudio.google.com`)

## Użytkowanie

1. **Sprawdź połączenie**: Kliknij "Sprawdź połączenie" — weryfikuje API i pokazuje liczbę zadań
2. **Podgląd**: Kliknij "Podejrzyj wyniki" aby zobaczyć ile zadań zostanie przetworzonych
3. **Generuj testy**: Kliknij "Generuj testy" aby uruchomić cały pipeline
4. **Obserwuj postęp**: Pasek postępu + log na żywo pokazuje etapy
5. **Wyniki**: Po zakończeniu widoczne jest podsumowanie (Tests / Plans / Executions / Links)

## Struktura tworzonych elementów

### Test Case
```json
{
  "fields": {
    "project": { "key": "RES" },
    "summary": "RES-123 | Bug | Opis błędu",
    "description": "<ADF skopiowany z oryginalnego zadania>",
    "issuetype": { "name": "Test" },
    "priority": { "name": "Medium" },
    "components": [{ "name": "5ways" }],
    "fixVersions": [{ "name": "25.9" }],
    "assignee": { "accountId": "<reporter z oryginalnego zadania>" }
  }
}
```

### Test Plan
```json
{
  "fields": {
    "project": { "key": "RES" },
    "summary": "Test Plan for Release 25.9",
    "issuetype": { "name": "Test Plan" },
    "components": [{ "name": "5ways" }],
    "fixVersions": [{ "name": "25.9" }]
  }
}
```

### Test Execution
```json
{
  "fields": {
    "project": { "key": "RES" },
    "summary": "[RC] Test execution for Release 25.9",
    "issuetype": { "name": "Test Execution" },
    "components": [{ "name": "5ways" }],
    "fixVersions": [{ "name": "25.9" }]
  }
}
```

## Wymagania

- Chrome 88+ (Manifest V3)
- Dostęp do Jira Cloud API (token z `id.atlassian.com`)
- Uprawnienia do tworzenia Test Cases, Test Plans i Test Executions w projekcie
- (Opcjonalnie) Konto Xray Cloud + klucz Google AI Studio dla kroków AI

## Bezpieczeństwo

- Wszystkie dane konfiguracyjne (credentials, klucze API) są przechowywane lokalnie w `chrome.storage.local`
- Żadne dane nie są wysyłane do zewnętrznych serwerów poza Jira, Xray Cloud i Gemini API
- Używane są wyłącznie połączenia HTTPS

## Rozwiązywanie problemów

### Błąd połączenia
- Sprawdź czy URL Jira jest poprawny i zawiera `https://`
- Zweryfikuj czy API Key jest aktualny (nie wygasł)
- Upewnij się, że masz uprawnienia do Jira API

### Błąd tworzenia testów
- Sprawdź czy masz uprawnienia do tworzenia zadań typu Test/Test Plan/Test Execution
- Zweryfikuj czy podany komponent istnieje w projekcie
- Upewnij się, że fix version istnieje w projekcie Jira

### Błąd kroków AI (429 / rate limit)
- Gemini ma limity requestów — rozszerzenie automatycznie czeka i ponawia
- Jeśli problem się powtarza, sprawdź czy klucz Gemini API jest aktywny

### Logi diagnostyczne
Otwórz DevTools rozszerzenia: `chrome://extensions/` → "Zbadaj widoki" → "side panel"
