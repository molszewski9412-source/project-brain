/**
 * PromptEnginePanel - FAZA 7
 * Engine promptów dla zadań
 */

import * as vscode from "vscode";
import { OllamaClient } from "../ai/OllamaClient";
import { BrainStore } from "../storage/BrainStore";

export interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    category: "create" | "update" | "review" | "refactor" | "document";
    prompt: string;
    variables: string[];
    examples: string[];
}

export class PromptEnginePanel {
    public static currentPanel: PromptEnginePanel | undefined;
    private panel: vscode.WebviewPanel;
    private ollama: OllamaClient;
    private store: BrainStore;
    private templates: PromptTemplate[] = [];
    private selectedTemplate: PromptTemplate | null = null;
    private variables: Record<string, string> = {};

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.ollama = new OllamaClient();
        this.store = new BrainStore();
        this.loadTemplates();
        this.setupMessageHandler();
        this.update();
    }

    public static createOrShow(): PromptEnginePanel {
        if (PromptEnginePanel.currentPanel) {
            PromptEnginePanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return PromptEnginePanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "promptEngine",
            "⚡ Prompt Engine",
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        PromptEnginePanel.currentPanel = new PromptEnginePanel(panel);
        return PromptEnginePanel.currentPanel;
    }

    private loadTemplates(): void {
        this.templates = [
            {
                id: "create-api",
                name: "Create REST API",
                description: "Generuje pełne REST API z CRUD",
                category: "create",
                prompt: `Stwórz REST API dla {{resource}} z następującymi funkcjami:
- CRUD operations (Create, Read, Update, Delete)
- Walidacja danych
- Obsługa błędów
- Testy jednostkowe
- Dokumentacja

Technologie: {{technologies}}
Format odpowiedzi: {{format}}`,
                variables: ["resource", "technologies", "format"],
                examples: ["User", "Product", "Order"]
            },
            {
                id: "create-auth",
                name: "Create Authentication",
                description: "System autoryzacji z JWT i refresh token",
                category: "create",
                prompt: `Stwórz system autoryzacji z:
- Rejestracja i logowanie
- JWT access token
- Refresh token rotation
- Password reset
- Email verification
- Rate limiting

Technologie: {{technologies}}
Dodatkowe funkcje: {{features}}`,
                variables: ["technologies", "features"],
                examples: ["JWT + bcrypt", "OAuth2 + Passport"]
            },
            {
                id: "create-component",
                name: "Create UI Component",
                description: "Komponent UI z styled-components",
                category: "create",
                prompt: `Stwórz komponent React dla {{componentName}}:
- Props: {{props}}
- Styling: {{styling}}
- Stan wewnętrzny: {{state}}
- Obsługa eventów: {{events}}
- Responsywność: {{responsive}}

Dołącz przykład użycia i testy.`,
                variables: ["componentName", "props", "styling", "state", "events", "responsive"],
                examples: ["Button", "Modal", "Form"]
            },
            {
                id: "review-code",
                name: "Code Review",
                description: "Analiza kodu z sugestiami poprawy",
                category: "review",
                prompt: `Przeanalizuj kod {{file}} pod kątem:
1. **Jakość kodu** - czytelność, naming, style
2. **Bezpieczeństwo** - podatności, walidacja
3. **Performance** - optymalizacje
4. **Testowanie** - pokrycie testami
5. **Dokumentacja** - komentarze, README

Kod:
\`\`\`
{{code}}
\`\`\`

Zwróć raport z oceną i listą konkretnych zmian.`,
                variables: ["file", "code"],
                examples: ["auth.ts", "api.ts"]
            },
            {
                id: "refactor-clean",
                name: "Refactor to Clean Code",
                description: "Refaktoryzacja do czystego kodu",
                category: "refactor",
                prompt: `Refaktoryzuj poniższy kod stosując:
- Zasady SOLID
- Wzorce projektowe: {{patterns}}
- Czyste funkcje
- Proper error handling
- Type safety

Oryginalny kod:
\`\`\`
{{code}}
\`\`\`

Zachowaj public API! Zwróć refaktoryzowany kod z komentarzami.`,
                variables: ["code", "patterns"],
                examples: ["Strategy", "Factory", "Observer"]
            },
            {
                id: "document-api",
                name: "API Documentation",
                description: "Dokumentacja API w formacie OpenAPI",
                category: "document",
                prompt: `Wygeneruj dokumentację API w formacie OpenAPI 3.0 dla:
- Endpointy: {{endpoints}}
- Modele danych: {{models}}
- Autentykacja: {{auth}}
- Błędy: {{errors}}

Dodaj przykłady request/response dla każdego endpointu.`,
                variables: ["endpoints", "models", "auth", "errors"],
                examples: ["REST", "GraphQL"]
            },
            {
                id: "create-test",
                name: "Create Tests",
                description: "Testy jednostkowe i integracyjne",
                category: "create",
                prompt: `Napisz testy dla {{target}}:
- Typ testów: {{testType}}
- Framework: {{framework}}
- Pokrycie: {{coverage}}

Funkcje do przetestowania:
\`\`\`
{{code}}
\`\`\`

Użyj Arrange-Act-Assert pattern. Dodaj mocki gdzie potrzebne.`,
                variables: ["target", "testType", "framework", "coverage", "code"],
                examples: ["Jest", "Pytest", "JUnit"]
            },
            {
                id: "update-migration",
                name: "Database Migration",
                description: "Migracja bazy danych",
                category: "update",
                prompt: `Stwórz migrację bazy danych:
- From: {{fromSchema}}
- To: {{toSchema}}
- Database: {{database}}
- Typ migracji: {{migrationType}}

Zwróć:
1. SQL up migration
2. SQL down migration
3. Seed data (opcjonalnie)`,
                variables: ["fromSchema", "toSchema", "database", "migrationType"],
                examples: ["PostgreSQL", "MySQL", "MongoDB"]
            }
        ];
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "selectTemplate":
                    this.selectedTemplate = this.templates.find(t => t.id === msg.templateId) || null;
                    this.variables = {};
                    this.update();
                    break;
                case "updateVariable":
                    this.variables[msg.key] = msg.value;
                    break;
                case "generatePrompt":
                    await this.generatePrompt();
                    break;
                case "usePrompt":
                    await this.usePrompt();
                    break;
                case "copyPrompt":
                    this.copyPrompt();
                    break;
                case "saveAsTemplate":
                    this.saveAsTemplate(msg.template);
                    break;
                case "generateCode":
                    await this.generateCode();
                    break;
            }
        });
    }

    private buildPrompt(): string {
        if (!this.selectedTemplate) return "";
        
        let prompt = this.selectedTemplate.prompt;
        for (const [key, value] of Object.entries(this.variables)) {
            prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value || `{{${key}}}`);
        }
        return prompt;
    }

    private async generatePrompt(): Promise<void> {
        const prompt = this.buildPrompt();
        this.panel.webview.postMessage({
            command: "showGeneratedPrompt",
            prompt
        });
    }

    private async usePrompt(): Promise<void> {
        const prompt = this.buildPrompt();
        
        // Open chat with this prompt
        this.panel.webview.postMessage({
            command: "openInChat",
            prompt
        });
    }

    private copyPrompt(): void {
        const prompt = this.buildPrompt();
        vscode.env.clipboard.writeText(prompt);
        vscode.window.showInformationMessage("Prompt copied to clipboard!");
    }

    private async generateCode(): Promise<void> {
        const prompt = this.buildPrompt();
        
        this.panel.webview.postMessage({
            command: "setLoading",
            loading: true
        });

        try {
            const result = await this.ollama.ask(prompt);
            
            this.panel.webview.postMessage({
                command: "showGeneratedCode",
                code: result.content,
                success: result.success
            });
        } catch (error) {
            this.panel.webview.postMessage({
                command: "showError",
                error: String(error)
            });
        }
    }

    private saveAsTemplate(template: Partial<PromptTemplate>): void {
        const newTemplate: PromptTemplate = {
            id: `custom-${Date.now()}`,
            name: template.name || "Custom Template",
            description: template.description || "",
            category: template.category || "create",
            prompt: template.prompt || "",
            variables: template.variables || [],
            examples: template.examples || []
        };
        
        this.templates.push(newTemplate);
        this.update();
        vscode.window.showInformationMessage("Template saved!");
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const categoryIcons: Record<string, string> = {
            create: "✨",
            update: "📝",
            review: "🔍",
            refactor: "🔄",
            document: "📄"
        };

        const categoryColors: Record<string, string> = {
            create: "#27ae60",
            update: "#3498db",
            review: "#9b59b6",
            refactor: "#f39c12",
            document: "#1abc9c"
        };

        return `<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1a1a2e;
            color: #fff;
            padding: 20px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #00d4ff;
        }
        .main-container {
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 20px;
            flex: 1;
            min-height: 0;
        }
        .templates-list {
            background: #16213e;
            border-radius: 12px;
            padding: 15px;
            overflow-y: auto;
        }
        .templates-list h3 {
            margin-bottom: 15px;
            color: #888;
            font-size: 0.9em;
            text-transform: uppercase;
        }
        .template-item {
            padding: 12px;
            border-radius: 8px;
            cursor: pointer;
            margin-bottom: 8px;
            transition: all 0.2s;
            border-left: 3px solid transparent;
        }
        .template-item:hover {
            background: rgba(0,212,255,0.1);
        }
        .template-item.selected {
            background: rgba(0,212,255,0.2);
            border-left-color: #00d4ff;
        }
        .template-name {
            font-weight: bold;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .template-desc {
            font-size: 0.85em;
            color: #888;
        }
        .category-badge {
            font-size: 0.7em;
            padding: 2px 8px;
            border-radius: 10px;
            text-transform: uppercase;
        }
        .prompt-area {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .variables-section {
            background: #16213e;
            border-radius: 12px;
            padding: 15px;
        }
        .variables-section h3 {
            margin-bottom: 15px;
            color: #00d4ff;
        }
        .variable-row {
            margin-bottom: 12px;
        }
        .variable-row label {
            display: block;
            margin-bottom: 5px;
            color: #888;
            font-size: 0.9em;
        }
        .variable-row input, .variable-row textarea {
            width: 100%;
            padding: 10px 15px;
            border-radius: 8px;
            border: 1px solid #333;
            background: #1a1a2e;
            color: #fff;
            font-size: 1em;
        }
        .variable-row input:focus, .variable-row textarea:focus {
            outline: none;
            border-color: #00d4ff;
        }
        .variable-row textarea {
            resize: vertical;
            min-height: 60px;
        }
        .prompt-preview {
            background: #16213e;
            border-radius: 12px;
            padding: 15px;
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .prompt-preview h3 {
            margin-bottom: 15px;
            color: #00d4ff;
        }
        .prompt-content {
            flex: 1;
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
            padding: 15px;
            font-family: monospace;
            font-size: 0.9em;
            white-space: pre-wrap;
            overflow-y: auto;
            color: #ccc;
        }
        .prompt-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
        }
        .btn-primary {
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            color: #1a1a2e;
        }
        .btn-primary:hover {
            transform: scale(1.05);
        }
        .btn-secondary {
            background: #333;
            color: #fff;
        }
        .btn-secondary:hover {
            background: #444;
        }
        .empty-state {
            text-align: center;
            padding: 50px;
            color: #888;
        }
        .generated-code {
            background: #16213e;
            border-radius: 12px;
            padding: 15px;
            margin-top: 15px;
            max-height: 300px;
            overflow-y: auto;
        }
        .generated-code h4 {
            color: #27ae60;
            margin-bottom: 10px;
        }
        .generated-code pre {
            background: rgba(0,0,0,0.3);
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            font-family: monospace;
            font-size: 0.85em;
        }
        .category-filter {
            display: flex;
            gap: 8px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        .filter-btn {
            padding: 6px 12px;
            border-radius: 15px;
            background: #333;
            border: none;
            color: #fff;
            cursor: pointer;
            font-size: 0.85em;
        }
        .filter-btn:hover, .filter-btn.active {
            background: #00d4ff;
            color: #1a1a2e;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚡ Prompt Engine</h1>
    </div>

    <div class="main-container">
        <div class="templates-list">
            <h3>📋 Templates</h3>
            <div class="category-filter">
                <button class="filter-btn active" onclick="filterCategory('all')">All</button>
                <button class="filter-btn" onclick="filterCategory('create')">✨ Create</button>
                <button class="filter-btn" onclick="filterCategory('review')">🔍 Review</button>
                <button class="filter-btn" onclick="filterCategory('refactor')">🔄 Refactor</button>
            </div>
            ${this.templates.map(t => `
            <div class="template-item ${this.selectedTemplate?.id === t.id ? 'selected' : ''}" 
                 onclick="selectTemplate('${t.id}')">
                <div class="template-name">
                    <span>${categoryIcons[t.category]}</span>
                    ${t.name}
                </div>
                <div class="template-desc">${t.description}</div>
            </div>
            `).join('')}
        </div>

        <div class="prompt-area">
            ${this.selectedTemplate ? `
            <div class="variables-section">
                <h3>📝 Variables for "${this.selectedTemplate.name}"</h3>
                ${this.selectedTemplate.variables.map(v => `
                <div class="variable-row">
                    <label>${v}</label>
                    <input type="text" 
                           id="var-${v}" 
                           placeholder="Enter ${v}..."
                           value="${this.variables[v] || ''}"
                           onchange="updateVariable('${v}', this.value)">
                </div>
                `).join('')}
                <div style="margin-top: 10px;">
                    <label>Quick Examples:</label>
                    <div style="display: flex; gap: 5px; margin-top: 5px; flex-wrap: wrap;">
                        ${this.selectedTemplate.examples.map(ex => `
                        <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.85em;"
                                onclick="fillExample('${ex}')">${ex}</button>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="prompt-preview">
                <h3>📄 Generated Prompt</h3>
                <div class="prompt-content">${this.buildPrompt()}</div>
                <div class="prompt-actions">
                    <button class="btn btn-primary" onclick="generateCode()">🚀 Generate Code</button>
                    <button class="btn btn-secondary" onclick="usePrompt()">💬 Use in Chat</button>
                    <button class="btn btn-secondary" onclick="copyPrompt()">📋 Copy</button>
                </div>
                <div id="generatedCode"></div>
            </div>
            ` : `
            <div class="empty-state">
                <p>Select a template to get started</p>
                <p style="margin-top: 10px; font-size: 0.9em;">
                    Templates help you generate consistent, high-quality prompts
                </p>
            </div>
            `}
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentTemplate = null;

        function selectTemplate(id) {
            vscode.postMessage({ command: 'selectTemplate', templateId: id });
        }

        function filterCategory(category) {
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.textContent.toLowerCase().includes(category) || category === 'all') {
                    btn.classList.add('active');
                }
            });
        }

        function updateVariable(key, value) {
            vscode.postMessage({ command: 'updateVariable', key, value });
        }

        function fillExample(value) {
            const inputs = document.querySelectorAll('.variable-row input');
            if (inputs.length > 0) {
                inputs[0].value = value;
                updateVariable('resource', value);
            }
        }

        function generateCode() {
            vscode.postMessage({ command: 'generateCode' });
        }

        function usePrompt() {
            vscode.postMessage({ command: 'usePrompt' });
        }

        function copyPrompt() {
            vscode.postMessage({ command: 'copyPrompt' });
        }

        // Listen for messages
        window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.command === 'showGeneratedCode') {
                const container = document.getElementById('generatedCode');
                container.innerHTML = \`
                    <div class="generated-code">
                        <h4>✨ Generated Code</h4>
                        <pre>\${msg.code}</pre>
                    </div>
                \`;
            }
        });
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        PromptEnginePanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
