# Changelog - Xray Test Generator Chrome Extension

## [1.0.1] - 2024-01-XX

### Fixed
- **API Endpoint Update**: Wszystkie zapytania JQL korzystają teraz wyłącznie z `/rest/api/3/search`
  - Usunięto fallback do usuniętego endpointu `/rest/api/3/search/jql`
  - Komunikat HTTP 410 nie pojawia się już w trakcie sprawdzania połączenia
  - Dokumentacja odzwierciedla aktualne zachowanie
- **MaxResults Parameter**: Naprawiono błąd HTTP 400 w funkcji `getJqlCount()`
  - Zmieniono `maxResults: 0` na `maxResults: 1` (API wymaga wartości 1-5000)
  - Funkcja nadal zwraca poprawną liczbę wszystkich wyników z pola `total`

### Changed
- `getJqlCount()`, `getIssuesByJql()`, `checkExistingTestCase()` — uproszczone do jednego endpointu `/rest/api/3/search`

### Technical Details
- **Problem**: Atlassian usunął endpoint `/rest/api/3/search/jql`, powodując błędy 410 w dotychczasowej implementacji
- **Rozwiązanie**: Konsolidacja wszystkich zapytań na `/rest/api/3/search` (POST)
- **Link do dokumentacji**: https://developer.atlassian.com/changelog/#CHANGE-2046

## [1.0.0] - 2024-01-XX

### Added
- Pierwsza wersja rozszerzenia Chrome
- Sprawdzanie połączenia z API Jira
- Pobieranie zadań z zapytania JQL
- Tworzenie Test Cases z linkami do oryginalnych zadań
- Tworzenie Test Plan i linkowanie Test Cases
- Tworzenie Test Executions [RC] i [PROD]
- Nowoczesny interfejs użytkownika z progress bar
- Automatyczne zapisywanie konfiguracji
- Obsługa błędów i walidacja
- Dokumentacja użytkownika i deweloperska
- Skrypty pakowania dla Windows i Linux
