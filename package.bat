@echo off
echo Tworzenie pakietu Xray Test Generator Chrome Extension...

REM Sprawdź czy folder chrome-extension istnieje
if not exist "chrome-extension" (
    echo Błąd: Folder chrome-extension nie istnieje!
    pause
    exit /b 1
)

REM Przejdź do folderu chrome-extension
cd chrome-extension

REM Sprawdź czy wszystkie wymagane pliki istnieją
echo Sprawdzanie wymaganych plików...
if not exist "manifest.json" (
    echo Błąd: manifest.json nie istnieje!
    pause
    exit /b 1
)
if not exist "popup.html" (
    echo Błąd: popup.html nie istnieje!
    pause
    exit /b 1
)
if not exist "popup.js" (
    echo Błąd: popup.js nie istnieje!
    pause
    exit /b 1
)
if not exist "background.js" (
    echo Błąd: background.js nie istnieje!
    pause
    exit /b 1
)
if not exist "content.js" (
    echo Błąd: content.js nie istnieje!
    pause
    exit /b 1
)

echo Wszystkie wymagane pliki istnieją.

REM Utwórz archiwum ZIP
echo Tworzenie archiwum ZIP...
powershell -command "Compress-Archive -Path * -DestinationPath ..\xray-test-generator-extension.zip -Force"

if exist "..\xray-test-generator-extension.zip" (
    echo ✅ Pakiet został utworzony: xray-test-generator-extension.zip
    echo.
    echo Instrukcje instalacji:
    echo 1. Otwórz Chrome i przejdź do chrome://extensions/
    echo 2. Włącz "Tryb dewelopera" (Developer mode)
    echo 3. Kliknij "Załaduj rozpakowane" (Load unpacked)
    echo 4. Wybierz folder chrome-extension
    echo.
    echo Alternatywnie możesz użyć pliku ZIP:
    echo 1. Rozpakuj xray-test-generator-extension.zip
    echo 2. Załaduj rozpakowany folder jako rozszerzenie
) else (
    echo ❌ Błąd podczas tworzenia pakietu!
)

cd ..
pause
