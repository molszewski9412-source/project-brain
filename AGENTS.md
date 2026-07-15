# Project Brain - VS Code Extension

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  extension.ts │───▶│  Tree View   │───▶│   Webviews   │ │
│  │  (entry)     │    │  Provider    │    │   (panels)   │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                   │                   │            │
│         ▼                   ▼                   ▼            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   BrainStore                         │  │
│  │              (.projectbrain/architecture.json)       │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                               │
│                            ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Ollama AI                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
project-brain/
├── src/
│   ├── extension.ts           # Main entry point, registers commands & views
│   ├── providers/
│   │   └── SimpleProjectProvider.ts   # Left panel tree view
│   ├── panels/
│   │   ├── AIWorkflowKanban.ts        # Smart Kanban with AI workflow
│   │   ├── InitializePanel.ts          # Project initialization wizard
│   │   ├── ModuleCardPanel.ts          # Module details view
│   │   └── ProposalPanel.ts            # Proposal view
│   ├── commands/
│   │   ├── analyzeProject.ts           # AI project analysis
│   │   ├── analyzeModule.ts            # AI module analysis
│   │   ├── addDecision.ts             # Add architectural decision
│   │   └── initializeProject.ts       # Create .projectbrain folder
│   ├── storage/
│   │   └── BrainStore.ts              # Central data storage
│   ├── models/
│   │   └── ProjectBrain.ts             # Type definitions
│   └── ai/
│       ├── OllamaClient.ts             # AI connection
│       ├── AIContextBuilder.ts         # Build AI prompts
│       └── JSONResponseParser.ts       # Parse AI responses
├── package.json               # Extension manifest
└── tsconfig.json             # TypeScript config
```

## Extension Registration Flow

### 1. extension.ts (Entry Point)
```typescript
// Register tree view
vscode.window.registerTreeDataProvider('projectBrainView', provider)

// Register commands
vscode.commands.registerCommand('project-brain.openKanban', () => {...})
vscode.commands.registerCommand('project-brain.analyzeProject', () => {...})
```

### 2. package.json (Manifest)
```json
{
  "views": {
    "projectBrain": [{ "id": "projectBrainView", "name": "🧠 Project Brain" }]
  },
  "commands": [
    { "command": "project-brain.openKanban", "title": "..." }
  ],
  "menus": {
    "view/title": [{ "command": "...", "when": "view == projectBrainView" }]
  }
}
```

## Key Files

### extension.ts
- **Purpose**: Main entry point
- **Dependencies**: ALL panels, providers, commands
- **Changes require**: Full extension reload

### package.json
- **Purpose**: Extension manifest (UI + commands)
- **Key sections**:
  - `views` - Tree view definitions
  - `commands` - Available commands (MUST match registered commands in extension.ts)
  - `menus` - Where commands appear
- **Changes require**: `npm run compile` + extension reload

### BrainStore.ts
- **Purpose**: Central data storage
- **Location**: `.projectbrain/architecture.json`
- **Data types**: Modules, Ideas, Decisions, Risks

### AIWorkflowKanban.ts
- **Purpose**: Main Kanban panel with AI workflow
- **Commands used**: None directly (uses BrainStore)

## Command Mapping

| package.json command | extension.ts registration | Description |
|---------------------|-------------------------|-------------|
| project-brain.openKanban | registerCommand('project-brain.openKanban') | Open AI Workflow Kanban |
| project-brain.analyzeProject | registerCommand('project-brain.analyzeProject') | Analyze project with AI |
| project-brain.createProject | registerCommand('project-brain.createProject') | Initialize new project |
| projectBrainView.refresh | registerCommand('projectBrainView.refresh') | Refresh tree view |

## Common Issues

### Menu item not showing
1. Check command exists in both `commands` (package.json) AND `registerCommand` (extension.ts)
2. Run `npm run compile`
3. Full VS Code restart (not just Reload Window)

### Changes not visible
1. Run `npm run compile`
2. Close VS Code completely
3. Reopen project
4. F5 to start debug

### Panel not opening
1. Check import in extension.ts
2. Check command registration matches panel class name
3. Check BrainStore is imported correctly

## Development Commands

```bash
npm run compile    # Compile TypeScript
npm run watch      # Watch mode
F5                 # Debug in VS Code
```

## Data Flow

```
User Action → Command (extension.ts) → Panel/Webview
                                    ↓
                              BrainStore
                                    ↓
                              AI (Ollama)
                                    ↓
                              Parse Response
                                    ↓
                              Update architecture.json
                                    ↓
                              Refresh Tree View
```

## Adding New Features

1. **New Panel**: Create in `src/panels/`, import in `extension.ts`, register command
2. **New Command**: Add to `package.json` commands + register in `extension.ts`
3. **New Tree View Item**: Modify `SimpleProjectProvider.ts`
4. **New Data Type**: Add to `BrainStore.ts` + `ProjectBrain.ts`

## Testing

```bash
# Full reload test
npm run compile
# Close VS Code completely
# Open project
# F5
```
