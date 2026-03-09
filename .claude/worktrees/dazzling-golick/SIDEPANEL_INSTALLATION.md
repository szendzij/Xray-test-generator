# Instrukcja instalacji Xray Test Generator w SidePanel

## Zmiany wprowadzone

Aplikacja została przerobiona z popup na sidePanel Chrome zgodnie z dokumentacją [Chrome SidePanel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel?hl=pl).

### Główne zmiany:

1. **manifest.json** - dodano konfigurację `side_panel` i usunięto `default_popup`
2. **sidepanel.html** - nowy plik z interfejsem dostosowanym do szerszego layoutu sidePanel
3. **sidepanel.js** - logika aplikacji z dodatkową funkcjonalnością dla sidePanel
4. **background.js** - dodano obsługę SidePanel API
5. **content.js** - zaktualizowano komunikację z sidePanel

## Instalacja

### Krok 1: Załaduj rozszerzenie w trybie deweloperskim

1. Otwórz Chrome i przejdź do `chrome://extensions/`
2. Włącz "Tryb dewelopera" (Developer mode) w prawym górnym rogu
3. Kliknij "Załaduj rozpakowane" (Load unpacked)
4. Wybierz folder `Xray-test-generator`

### Krok 2: Sprawdź instalację

1. Rozszerzenie powinno pojawić się na liście z ikoną 🚀
2. Ikona rozszerzenia będzie widoczna w pasku narzędzi Chrome

## Użytkowanie

### Otwieranie SidePanel

**Metoda 1: Kliknięcie ikony rozszerzenia**
- Kliknij ikonę rozszerzenia w pasku narzędzi
- SidePanel otworzy się automatycznie po prawej stronie przeglądarki

**Metoda 2: Z poziomu strony Jira**
- Na stronie Jira pojawi się floating button 🚀 w prawym dolnym rogu
- Kliknij go, aby otworzyć sidePanel

**Metoda 3: Ręczne otwarcie**
- Kliknij prawym przyciskiem na ikonę rozszerzenia
- Wybierz "Otwórz side panel" (jeśli dostępne)

### Funkcjonalność

SidePanel zawiera wszystkie funkcje z poprzedniej wersji popup:

1. **Krok 1: Dane logowania** - konfiguracja połączenia z Jira
2. **Krok 2: Parametry** - ustawienia generowania testów (automatyczne/własne JQL)
3. **Krok 3: Uruchomienie** - generowanie testów z monitoringiem postępu

### Zalety SidePanel

- **Większy obszar roboczy** - szerszy layout niż popup
- **Stała dostępność** - panel pozostaje otwarty podczas nawigacji
- **Lepsze UX** - nie blokuje widoku strony
- **Responsywność** - dostosowuje się do różnych rozmiarów

## Rozwiązywanie problemów

### SidePanel nie otwiera się

1. Sprawdź czy rozszerzenie jest włączone w `chrome://extensions/`
2. Upewnij się, że używasz Chrome 114 lub nowszego
3. Spróbuj odświeżyć stronę i ponownie kliknąć ikonę

### Błędy JavaScript

1. Otwórz Developer Tools (F12)
2. Sprawdź zakładkę Console pod kątem błędów
3. Sprawdź zakładkę Network pod kątem problemów z API

### Problemy z API Jira

1. Sprawdź poprawność danych logowania
2. Upewnij się, że masz odpowiednie uprawnienia w Jira
3. Sprawdź czy URL Jira jest poprawny

## Wymagania systemowe

- **Chrome**: wersja 114 lub nowsza
- **Manifest**: V3
- **Uprawnienia**: storage, activeTab, scripting, sidePanel
- **Host permissions**: https://*.atlassian.net/*, https://*.jira.com/*

## Struktura plików

```
Xray-test-generator/
├── manifest.json          # Konfiguracja rozszerzenia z sidePanel
├── sidepanel.html         # Interfejs użytkownika dla sidePanel
├── sidepanel.js           # Logika aplikacji dla sidePanel
├── background.js          # Service worker z obsługą SidePanel API
├── content.js             # Content script dla stron Jira
├── popup.html             # (stary plik - można usunąć)
├── popup.js               # (stary plik - można usunąć)
└── icons/                 # Ikony rozszerzenia
```

## Migracja z popup

Jeśli masz zapisane konfiguracje w poprzedniej wersji popup, będą one automatycznie przeniesione do sidePanel, ponieważ używają tego samego mechanizmu `chrome.storage.local`.
