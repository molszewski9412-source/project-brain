# Project Brain - Roadmap do MVP

## 🎯 Wizja MVP
**Minimal Viable Product**: Rozszerzenie VS Code, które skanuje projekt, proponuje moduły i pozwala zarządzać pomysłami na kanbanie z pomocą AI.

---

## ✅ CO JUŻ DZIAŁA (v0.0.1)

| Funkcja | Status | Uwagi |
|---------|--------|-------|
| Inicjalizacja projektu | ✅ Done | Tworzy `.projectbrain/architecture.json` |
| Left Panel (Tree View) | ✅ Done | SimpleProjectProvider |
| Skanowanie projektu | ✅ Done | ProjectScanner analizuje pliki |
| Analiza AI | ✅ Done | OllamaClient + ProjectArchitectPrompt |
| AI Workflow Kanban | ✅ Done | Backlog→Todo→InProgress→Review→Done |
| Persystencja danych | ✅ Done | BrainStore zapisuje do JSON |

---

## 🎯 MVP CHECKLIST (v0.1.0)

### MUST HAVE - bez tego MVP nie działa

#### M1: ModuleCardPanel - szczegóły modułu
```
├── Kliknięcie na moduł → otwiera panel z detalami
├── Pokazuje: nazwa, opis, status, pliki, zależności
├── Przyciski akcji: Lock/Unlock, Edit, Delete
└── Wiązanie z kanbanem (które idee dotyczą modułu)
```
- [ ] `ModuleCardPanel.ts` - panel z formularzem
- [ ] `extension.ts` - rejestracja command `project-brain.openModule`
- [ ] `BrainStore` - metody `updateModule()`, `deleteModule()`

#### M2: Decision Management
```
├── Dodawanie decyzji architektonicznych
├── Powiązanie z modułami
├── Status: Proposed → Approved/Rejected
└── AI podpowiada decyzje podczas analizy
```
- [ ] `addDecision.ts` - komenda dodawania
- [ ] `DecisionPanel.ts` - panel do zarządzania
- [ ] `BrainStore` - metody `addDecision()`, `updateDecision()`

#### M3: AnalysisResultsPanel - akceptacja wyników
```
├── AI proponuje moduły po analizie
├── Użytkownik może: Accept, Modify, Reject
├── Accept → dodaje moduł do listy
└── Modify → edycja przed dodaniem
```
- [ ] Przycisk "Accept" dodaje moduł do `BrainStore`
- [ ] Przycisk "Add to Kanban" tworzy ideę
- [ ] Persystencja zaakceptowanych modułów

#### M4: Konfiguracja Ollamy
```
├── Settings: adres Ollamy (domyślnie localhost:11434)
├── Test connection
└── Fallback jeśli Ollama niedostępna
```
- [ ] `package.json` - contribute configuration
- [ ] `OllamaClient` - read settings, timeout handling

---

### SHOULD HAVE - poprawia UX

#### S1: Visual Status Indicators
```
├── Kolorowe badge'y przy modułach (status)
├── Progress bar dla IN_PROGRESS
└── Lock icon dla LOCKED modułów
```

#### S2: Quick Actions w Tree View
```
├── Prawy klik → menu kontekstowe
├── Add Module, Add Decision
└── Analyze Module, Delete
```

#### S3: Drag & Drop na Kanbanie
```
├── Przeciąganie kart między kolumnami
├── Automatyczny update status w BrainStore
└── AI trigger na BACKLOG → TODO
```

---

### NICE TO HAVE - dla wygody

#### N1: Keyboard Shortcuts
```
├── Ctrl+Shift+A - Analyze Project
├── Ctrl+Shift+K - Open Kanban
└── Ctrl+Shift+M - Add Module
```

#### N2: README.md dla użytkowników
```
├── Instalacja krok po kroku
├── Screenshots
├── Wymagania (Ollama)
└── FAQ
```

---

## 📅 HARMONOGRAM

### Sprint 1: Module Management
- [ ] ModuleCardPanel kompletny
- [ ] Podstawowe CRUD dla modułów
- [ ] Lock/Unlock functionality

### Sprint 2: Decision Flow  
- [ ] Decision panel
- [ ] Powiązanie z modułami
- [ ] AI suggestions

### Sprint 3: Analysis Integration
- [ ] Accept/Modify/Reject dla wyników
- [ ] Add to Kanban integration
- [ ] Test full flow

### Sprint 4: Polish & Docs
- [ ] Settings panel
- [ ] README
- [ ] Test na czystym projekcie

---

## 🔧 TECHNICAL NOTES

### Data Flow (aktualny)
```
User → Command → Service → AI → Parser → Store → Panel → Tree Refresh
```

### Storage
```
.projectbrain/
├── architecture.json  (BrainStore)
└── .projectbrain/     (nie dotykać!)
```

### Key Classes
- `BrainStore` - single source of truth
- `ProjectScanner` - filesystem analysis
- `OllamaClient` - AI communication
- `SimpleProjectProvider` - left panel
- `AIWorkflowKanban` - main kanban UI

---

## 🚀 AKTUALNY PRIORYTET

**Następny krok**: Naprawić ModuleCardPanel - niekompatybilne typy

**Problem znaleziony**: 
- `ModuleCardPanel.ts` używa `ProjectModule` z `models/Module.ts`
- `BrainStore` operuje na `BrainModule` z `models/ProjectBrain.ts`
- **Te dwa modele są niekompatybilne!** 

**Rozwiązanie**: Przepisać ModuleCardPanel żeby używał `BrainModule`

---

## 🐛 BUGS DO NAPRAWY

### B1: ModuleCardPanel Type Mismatch 🔴 CRITICAL
```typescript
// Problem: ModuleCardPanel.ts line 2
import { ProjectModule } from '../models/Module';  // ❌ STARY model

// BrainStore operuje na: BrainModule z models/ProjectBrain.ts
// Ale ModuleCardPanel oczekuje: ProjectModule z models/Module.ts

// Te dwa interfejsy są prawie identyczne ale NIEkompatybilne!
// Solution: zmienić import na BrainModule i dostosować HTML
```

### B2: AnalysisResultsPanel - dodaje DO KANBANU, nie do MODUŁÓW 🔴 CRITICAL
```typescript
// Problem: Line 66-93 w addToKanban()
// Wszystko dodaje jako BrainIdea (do kanbanu)
//
// Ale moduły z AI powinny być dodawane jako BrainModule!
// current code:
//   this.store.addIdea({ title, tags: ['module'], ... })
//
// powinno być:
//   this.store.addModule({ name: title, description, status: 'PLANNED', ... })
```

### B3: addDecision - STARY Store 🔴 CRITICAL
```typescript
// Problem: addDecision.ts używa STARYCH klas!
import { ProjectDecision } from '../models/Decision';      // ❌ STARY
import { ProjectStore } from '../storage/projectStore';   // ❌ STARY

// Powinno używać:
import { BrainDecision } from '../models/ProjectBrain';  // ✅ NOWY
import { BrainStore } from '../storage/BrainStore';       // ✅ NOWY
```

---

## 📁 STARY vs NOWY KOD (do usunięcia po migracji)

### Stare pliki (martwy kod):
```
src/models/
  ├── Module.ts          ❌ (używany przez ModuleCardPanel)
  ├── Decision.ts        ❌ (używany przez addDecision)
  └── ...

src/storage/
  ├── projectStore.ts    ❌ (używany przez addDecision)
  └── ...

src/providers/
  └── ProjectDashboardProvider.ts  ❌ (nie zarejestrowany)
```

### Nowe pliki (aktywne):
```
src/models/ProjectBrain.ts     ✅ (główny model)
src/storage/BrainStore.ts      ✅ (główny store)
src/providers/SimpleProjectProvider.ts  ✅ (aktywny)
```

---

## 📋 MVP v0.1.0 - DEFINITYWNA LISTA

### Fazie 1: Fix Types & Integration
- [x] B1: Napraw ModuleCardPanel → używaj BrainModule ✅
- [x] B2: AnalysisResultsPanel → Accept dodaje do BrainStore ✅
- [x] B3: addDecision → teraz używa BrainStore ✅

### Fazie 2: Module CRUD
- [ ] M1: Otwieranie modułu (click w tree → ModuleCardPanel)
- [ ] M2: Edycja modułu (status, description, files)
- [ ] M3: Lock/Unlock (z confirm dialog)
- [ ] M4: Delete (z confirm, sprawdza locked)

### Fazie 3: Decision Flow
- [ ] M5: Decision panel - pełny CRUD
- [ ] M6: Approve/Reject workflow
- [ ] M7: Powiązanie decisions ↔ modules

### Fazie 4: Polish
- [ ] S1: Settings dla Ollamy
- [ ] S2: README.md
- [ ] Test: instalacja od zera
