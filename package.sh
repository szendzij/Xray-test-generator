#!/bin/bash

echo "Tworzenie pakietu Xray Test Generator Chrome Extension..."

# Sprawdź czy folder chrome-extension istnieje
if [ ! -d "chrome-extension" ]; then
    echo "Błąd: Folder chrome-extension nie istnieje!"
    exit 1
fi

# Przejdź do folderu chrome-extension
cd chrome-extension

# Sprawdź czy wszystkie wymagane pliki istnieją
echo "Sprawdzanie wymaganych plików..."
required_files=("manifest.json" "popup.html" "popup.js" "background.js" "content.js")

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "Błąd: $file nie istnieje!"
        exit 1
    fi
done

echo "Wszystkie wymagane pliki istnieją."

# Utwórz archiwum ZIP
echo "Tworzenie archiwum ZIP..."
zip -r ../xray-test-generator-extension.zip * -x "*.DS_Store" "*.git*" "*.md"

if [ -f "../xray-test-generator-extension.zip" ]; then
    echo "✅ Pakiet został utworzony: xray-test-generator-extension.zip"
    echo ""
    echo "Instrukcje instalacji:"
    echo "1. Otwórz Chrome i przejdź do chrome://extensions/"
    echo "2. Włącz 'Tryb dewelopera' (Developer mode)"
    echo "3. Kliknij 'Załaduj rozpakowane' (Load unpacked)"
    echo "4. Wybierz folder chrome-extension"
    echo ""
    echo "Alternatywnie możesz użyć pliku ZIP:"
    echo "1. Rozpakuj xray-test-generator-extension.zip"
    echo "2. Załaduj rozpakowany folder jako rozszerzenie"
else
    echo "❌ Błąd podczas tworzenia pakietu!"
    exit 1
fi

cd ..
