# Instrukcja instalacji Xray Test Generator

## Krok po kroku

### 1. Przygotowanie rozszerzenia
1. Pobierz lub skopiuj folder `chrome-extension` na swój komputer
2. Upewnij się, że wszystkie pliki są w folderze:
   - `manifest.json`
   - `popup.html`
   - `popup.js`
   - `background.js`
   - `content.js`
   - `README.md`

### 2. Instalacja w Chrome
1. Otwórz przeglądarkę Chrome
2. Przejdź do `chrome://extensions/`
3. W prawym górnym rogu włącz **"Tryb dewelopera"** (Developer mode)
4. Kliknij **"Załaduj rozpakowane"** (Load unpacked)
5. Wybierz folder `chrome-extension`
6. Kliknij **"Wybierz folder"**

### 3. Weryfikacja instalacji
- Rozszerzenie powinno pojawić się na liście zainstalowanych rozszerzeń
- Ikona 🚀 powinna pojawić się w pasku narzędzi Chrome
- Jeśli ikona nie jest widoczna, kliknij ikonę puzzli (🧩) w pasku narzędzi i przypnij rozszerzenie

### 4. Pierwsza konfiguracja
1. Kliknij ikonę rozszerzenia 🚀
2. Wypełnij pola konfiguracyjne:
   - **Jira Base URL**: `https://wfirma.atlassian.net`
   - **Jira Email**: Twój email w systemie Jira
   - **Jira API Key**: Klucz API (wygeneruj w ustawieniach konta Jira)
   - **Fix Version**: `25.9` (lub inna wersja)
   - **Project Key**: `RES`
   - **Component Name**: `5ways`

### 5. Test połączenia
1. Kliknij **"🔍 Sprawdź połączenie"**
2. Jeśli wszystko jest OK, zobaczysz komunikat o liczbie znalezionych zadań
3. Jeśli wystąpi błąd, sprawdź konfigurację

### 6. Generowanie testów
1. Kliknij **"🚀 Generuj testy"**
2. Obserwuj postęp w logach
3. Po zakończeniu zobaczysz podsumowanie

## Generowanie API Key w Jira

1. Zaloguj się do Jira
2. Kliknij na swój awatar w prawym górnym rogu
3. Wybierz **"Account settings"**
4. W menu po lewej stronie kliknij **"Security"**
5. W sekcji **"API tokens"** kliknij **"Create API token"**
6. Nadaj nazwę tokenowi (np. "Xray Test Generator")
7. Skopiuj wygenerowany token i wklej go w rozszerzeniu

## Rozwiązywanie problemów

### Rozszerzenie się nie instaluje
- Sprawdź czy wszystkie pliki są w folderze
- Upewnij się, że tryb dewelopera jest włączony
- Spróbuj odświeżyć stronę `chrome://extensions/`

### Błąd połączenia z API
- Sprawdź czy URL Jira jest poprawny
- Zweryfikuj czy API Key jest aktualny
- Upewnij się, że masz uprawnienia do API

### Błąd tworzenia testów
- Sprawdź czy masz uprawnienia do tworzenia Test Cases w projekcie
- Zweryfikuj czy komponent "5ways" istnieje w projekcie
- Upewnij się, że fix version "FFFV" istnieje w projekcie

## Aktualizacja rozszerzenia

1. Zastąp pliki w folderze `chrome-extension` nowymi wersjami
2. Przejdź do `chrome://extensions/`
3. Kliknij ikonę odświeżania (🔄) przy rozszerzeniu
4. Rozszerzenie zostanie zaktualizowane

## Odinstalowanie

1. Przejdź do `chrome://extensions/`
2. Znajdź "Xray Test Generator"
3. Kliknij **"Usuń"** (Remove)
4. Potwierdź usunięcie
