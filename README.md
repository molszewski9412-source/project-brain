# 🧠 Project Brain

**Intuicyjne zarządzanie projektem z AI w VS Code**

AI analizuje Twój projekt, proponuje moduły i automatycznie blokuje skończony kod.

---

## 🚀 Instalacja

### Wymagania
- **VS Code** (1.125.0 lub nowszy)
- **Ollama** (lokalna AI) - [instalacja](https://ollama.ai)

### Setup Ollamy

```bash
# 1. Zainstaluj Ollamę
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Uruchom serwer
ollama serve

# 3. Pobierz model (polecany: llama3 lub codellama)
ollama pull llama3
```

### Instalacja rozszerzenia

1. Sklonuj repozytorium:
```bash
git clone https://github.com/molszewski9412-source/project-brain.git
```

2. Zainstaluj zależności i skompiluj:
```bash
cd project-brain
npm install
npm run compile
```

3. Otwórz w VS Code (`code .`) i wciśnij **F5** żeby uruchomić w trybie deweloperskim

---

## 📖 Jak używać

### 1. Inicjalizacja

Otwórz Command Palette (`Ctrl+Shift+P`) i wpisz:
```
Project Brain: Initialize Project
```

Lub kliknij **🚀 Initialize Project** w panelu bocznym.

### 2. Analiza projektu z AI

Kliknij **🔄 Analyze Project** w panelu bocznym.

AI:
- Skanuje strukturę projektu
- Analizuje pliki i technologie
- Proponuje moduły i zadania
- Wszystko dodaje do **BACKLOG**

### 3. Praca z zadaniami

```
📝 BACKLOG     Wszystkie idee i zadania
     ↓
🤔 TODO        AI analizuje i proponuje implementację
     ↓  
⚡ IN PROGRESS Testuję zmiany (branch utworzony)
     ↓
✅ DONE        Kod zablokowany i działa! 🔒
```

**Kliknij kartę** żeby zobaczyć akcje:
- Przeciągnij między kolumnami
- AI proponuje na BACKLOG → TODO
- Branch tworzy się automatycznie na TODO → IN PROGRESS
- Kod blokuje się na IN PROGRESS → DONE

### 4. Moduły

Kliknij **➕ Add Module** żeby dodać moduł ręcznie.

Kliknij moduł w liście żeby:
- Zmienić status
- Edytować opis
- Dodać pliki
- Zablokować/odblokować

---

## 🎯 Workflow

```
1. Initialize Project
        ↓
2. Analyze Project → AI skanuje → BACKLOG
        ↓
3. Przeciągnij do TODO → AI proponuje
        ↓
4. Przeciągnij do IN PROGRESS → Branch utworzony
        ↓
5. Testuj zmiany
        ↓
6. Przeciągnij do DONE → Kod zablokowany! 🔒
```

---

## ⚙️ Konfiguracja

### Ollama URL
Domyślnie: `http://localhost:11434`

Jeśli używasz innego modelu, sprawdź w `src/ai/OllamaClient.ts`.

### Modele AI
Polecane:
- `llama3` - ogólny, dobry do analizy
- `codellama` - specjalizowany w kodzie

---

## 🛠️ Komendy

| Komenda | Skrót | Opis |
|---------|--------|------|
| Initialize Project | - | Inicjalizuj Project Brain |
| Add Module | - | Dodaj moduł ręcznie |
| Analyze Project | Ctrl+Shift+P | Analizuj z AI |
| Open Kanban | Ctrl+Shift+P | Otwórz AI Workflow |

---

## 📁 Struktura projektu

```
.projectbrain/
└── architecture.json   # Wszystkie dane Project Brain
```

**UWAGA**: Nie usuwaj ani nie edytuj folderu `.projectbrain` ręcznie!

---

## 🐛 FAQ

**Q: AI nie odpowiada?**
A: Upewnij się że Ollama działa (`ollama serve`) i model jest pobrany.

**Q: Jak odblokować kod?**
A: Kliknij na zablokowaną kartę w Kanbanie i wybierz "🔓 Unblock".

**Q: Co oznacza LOCKED?**
A: Kod w tej kolumnie działa i nie powinien być zmieniany bez powodu.

---

## 📝 Licencja

MIT

---

**🎉 Gotowe! Miłego kodzenia z Project Brain!**
