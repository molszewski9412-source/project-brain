# Project Brain - Roadmap

## 🎯 Wizja
Rozszerzenie VS Code, które skanuje projekt z AI i pozwala zarządzać zadaniami w intuicyjnym kanbanie z auto-lockiem skończonego kodu.

---

## ✅ CO DZIAŁA (v0.1.0)

| Funkcja | Status |
|---------|--------|
| Inicjalizacja projektu | ✅ |
| Left Panel (Tree View) | ✅ |
| Skanowanie + Analiza AI | ✅ |
| Intuicyjny AI Workflow Kanban | ✅ |
| Module CRUD (Add/Edit/Lock/Unlock/Delete) | ✅ |
| Auto-lock kodu gdy zadanie DONE | ✅ |
| Persystencja (BrainStore → JSON) | ✅ |

---

## 🚀 INTUICyjNY WORKFLOW

```
📝 BACKLOG          🤔 TODO            ⚡ IN PROGRESS      ✅ DONE
─────────────────────────────────────────────────────────────────────
Wszystkie         AI analizuje       Branch utworzony    Kod zablokowany!
idee              i proponuje        Testuję zmiany     🔒 LOCKED!
```

**Flow:**
1. `Analyze Project` → AI skanuje → wszystko do BACKLOG
2. BACKLOG → TODO → AI proponuje implementację
3. TODO → IN_PROGRESS → tworzy branch, testuję
4. IN_PROGRESS → DONE → kod LOCKED!

---

## 📋 DO ZROBIENIA

### 🔴 WYSOKI PRIORYTET

#### ✅ README.md - GOTOWE!
- Instalacja krok po kroku ✅
- Workflow diagram ✅
- Konfiguracja ✅
- FAQ ✅

#### Test na czystym projekcie
- Czy wszystko działa od zera?

### 🟡 ŚREDNI PRIORYTET

#### Settings dla Ollamy
- Konfiguracja adresu (localhost:11434)
- Test connection
- Fallback jeśli niedostępna

#### Keyboard Shortcuts
- Ctrl+Shift+A - Analyze Project
- Ctrl+Shift+K - Open Kanban
- Ctrl+Shift+M - Add Module

### 🟢 OPCJONALNE

#### Decision Panel
- Pełny CRUD dla decyzji architektonicznych
- Powiązanie z modułami
- Approve/Reject workflow

---

## 🎯 NASTĘPNY KROK

**Test na czystym projekcie** - uruchomić rozszerzenie i sprawdzić czy wszystko działa

Po tym: **Release v0.1.0!**

---

## 📁 ARCHITEKTURA

```
Key Classes:
├── BrainStore         - single source of truth (JSON)
├── ProjectScanner    - filesystem analysis
├── OllamaClient      - AI communication
├── SimpleProjectProvider  - left panel
└── AIWorkflowKanban  - main kanban UI
```

### Storage
```
.projectbrain/
└── architecture.json  (BrainStore)
```

---

## 🎯 NASTĘPNY KROK

**README.md** - dokumentacja dla użytkowników

Po tym: **test na czystym projekcie** i release!
