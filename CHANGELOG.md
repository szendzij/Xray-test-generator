# Changelog - Xray Test Generator Chrome Extension

## [1.0.1] - 2024-01-XX

### Fixed
- **API Endpoint Migration**: Zaktualizowano endpointy API z `/rest/api/3/search` na `/rest/api/3/search/jql`
  - Naprawiono błąd HTTP 410: "The requested API has been removed"
  - Wszystkie funkcje wyszukiwania używają teraz nowego endpointu
  - Zaktualizowano dokumentację deweloperską
- **MaxResults Parameter**: Naprawiono błąd HTTP 400 w funkcji `getJqlCount()`
  - Zmieniono `maxResults: 0` na `maxResults: 1` (API wymaga wartości 1-5000)
  - Funkcja nadal zwraca poprawną liczbę wszystkich wyników z pola `total`

### Changed
- `getJqlCount()` - używa teraz `/rest/api/3/search/jql`
- `getIssuesByJql()` - używa teraz `/rest/api/3/search/jql`
- `checkExistingTestCase()` - używa teraz `/rest/api/3/search/jql`

### Technical Details
- **Problem**: Atlassian usunął stary endpoint `/rest/api/3/search` w ramach migracji API
- **Rozwiązanie**: Migracja na nowy endpoint `/rest/api/3/search/jql` zgodnie z wytycznymi Atlassian
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
