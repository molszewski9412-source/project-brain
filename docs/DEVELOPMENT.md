# 👨‍💻 Development Guide

## Prerequisites

- **Node.js** 18+
- **npm** 9+
- **VS Code** 1.125.0+
- **TypeScript** 5+

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/molszewski9412-source/project-brain.git
cd project-brain
npm install
```

### 2. Development Mode

```bash
npm run watch
```

This runs TypeScript compiler in watch mode.

### 3. Debug in VS Code

1. Open the project in VS Code
2. Press **F5** to start debugging
3. A new VS Code window opens with the extension loaded

### 4. Run Tests

```bash
npm test
```

## Project Structure

```
src/
├── ai/                    # AI integration
│   ├── OllamaClient.ts    # Ollama API client
│   ├── AISwapper.ts       # Multi-model support
│   └── ...
├── commands/              # VS Code commands
│   ├── initializeProject.ts
│   ├── analyzeProject.ts
│   └── ...
├── i18n/                 # Internationalization
│   ├── translations.ts
│   ├── en.json
│   └── pl.json
├── models/               # TypeScript interfaces
│   ├── ProjectBrain.ts
│   ├── Module.ts
│   └── ...
├── panels/               # Webview panels (28 total)
│   ├── AIWorkflowKanban.ts
│   ├── AIChatPanel.ts
│   └── ...
├── providers/            # Tree view providers
├── services/             # Business logic
│   ├── AIService.ts
│   └── ...
├── storage/              # Data persistence
│   ├── BrainStore.ts
│   └── ...
└── extension.ts          # Entry point
```

## Creating a New Panel

### 1. Create Panel File

```typescript
// src/panels/MyNewPanel.ts
import * as vscode from "vscode";
import { BrainStore } from "../storage/BrainStore";

export class MyNewPanel {
    public static currentPanel: MyNewPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.update();
    }

    public static createOrShow(): MyNewPanel {
        if (MyNewPanel.currentPanel) {
            MyNewPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return MyNewPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "myNewPanel",
            "My New Panel",
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        MyNewPanel.currentPanel = new MyNewPanel(panel);
        return MyNewPanel.currentPanel;
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <style>
        body { 
            font-family: sans-serif; 
            padding: 20px; 
            background: #1a1a2e;
            color: #fff;
        }
    </style>
</head>
<body>
    <h1>My New Panel</h1>
</body>
</html>`;
    }

    public dispose(): void {
        MyNewPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
```

### 2. Register in extension.ts

```typescript
import { MyNewPanel } from "./panels/MyNewPanel";

// Register command
context.subscriptions.push(
    vscode.commands.registerCommand("project-brain.myNewPanel", () => {
        MyNewPanel.createOrShow();
    })
);
```

### 3. Add to package.json

```json
{
  "commands": [
    {
      "command": "project-brain.myNewPanel",
      "title": "Project Brain: My New Panel"
    }
  ]
}
```

### 4. Compile & Test

```bash
npm run compile
# Press F5 in VS Code
```

## Creating a New Command

### 1. Create Command File

```typescript
// src/commands/myNewCommand.ts
import * as vscode from "vscode";

export function myNewCommand(): void {
    vscode.window.showInformationMessage("Hello from Project Brain!");
}
```

### 2. Register in extension.ts

```typescript
import { myNewCommand } from "./commands/myNewCommand";

context.subscriptions.push(
    vscode.commands.registerCommand("project-brain.myNewCommand", () => {
        myNewCommand();
    })
);
```

## Data Models

### Module

```typescript
interface Module {
    id: string;
    name: string;
    type: ModuleType;  // CORE, FEATURE, API, DATABASE, UI
    status: ModuleStatus;  // BACKLOG, TODO, IN_PROGRESS, DONE
    description?: string;
    files: string[];
    dependencies: string[];
    locked: boolean;
    createdAt: string;
    updatedAt: string;
}
```

### Idea

```typescript
interface Idea {
    id: string;
    title: string;
    description: string;
    status: IdeaStatus;  // BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE
    moduleId?: string;
    tags: string[];
    priority: number;
    createdAt: string;
    updatedAt: string;
}
```

### Decision

```typescript
interface Decision {
    id: string;
    moduleId: string;
    type: DecisionType;  // ARCHITECTURAL, TECHNICAL, CODE
    title: string;
    description: string;
    rationale: string;
    alternatives: string[];
    status: DecisionStatus;
    createdBy: "USER" | "AI";
    authorName?: string;
}
```

## Adding i18n Support

### 1. Add to translations.ts

```typescript
export const translations = {
    en: { myKey: "My Text" },
    pl: { myKey: "Mój Tekst" }
};
```

### 2. Use in code

```typescript
import { t } from "./i18n/translations";

// In panel HTML or TypeScript
const text = t("myKey"); // Returns "My Text" or "Mój Tekst"
```

## Testing

### Run Tests

```bash
npm test
```

### Write Tests

```typescript
// src/__tests__/myModule.test.ts
describe("My Module", () => {
    it("should do something", () => {
        expect(true).toBe(true);
    });
});
```

## Building for Distribution

### 1. Package

```bash
npm install -g vsce
vsce package
```

This creates a `.vsix` file.

### 2. Install Locally

```bash
code --install-extension project-brain-1.0.0.vsix
```

### 3. Publish to Marketplace (requires publisher account)

```bash
vsce publish
```

## Code Style

- Use **TypeScript** strictly
- Use **PascalCase** for classes and types
- Use **camelCase** for functions and variables
- Use **UPPER_SNAKE_CASE** for constants
- Maximum line length: 100 characters
- Use async/await instead of .then()
- Prefer const over let

## Commit Messages

Follow Conventional Commits:

```
feat: add new panel
fix: resolve bug in AI
docs: update README
refactor: simplify module
test: add unit tests
```

## Pull Request Process

1. Create a feature branch
2. Make changes
3. Add tests
4. Submit PR
5. Wait for review
6. Merge after approval

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Ollama Documentation](https://github.com/ollama/ollama)
