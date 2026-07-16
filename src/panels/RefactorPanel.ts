/**
 * RefactorPanel - FAZA 17
 * Refaktoryzacja kodu jednym kliknięciem
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { OllamaClient } from "../ai/OllamaClient";
import { BrainStore } from "../storage/BrainStore";

export interface RefactorResult {
    file: string;
    original: string;
    refactored: string;
    changes: string[];
}

export class RefactorPanel {
    public static currentPanel: RefactorPanel | undefined;
    private panel: vscode.WebviewPanel;
    private ollama: OllamaClient;
    private store: BrainStore;
    private selectedModule: string = "";
    private results: RefactorResult[] = [];

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.ollama = new OllamaClient();
        this.store = new BrainStore();
        this.setupMessageHandler();
        this.update();
    }

    public static createOrShow(): RefactorPanel {
        if (RefactorPanel.currentPanel) {
            RefactorPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return RefactorPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "refactor",
            "🔄 Code Refactor",
            vscode.ViewColumn.Two,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        RefactorPanel.currentPanel = new RefactorPanel(panel);
        return RefactorPanel.currentPanel;
    }

    public static createOrShowWithModule(moduleId: string): RefactorPanel {
        const panel = RefactorPanel.createOrShow();
        panel.selectedModule = moduleId;
        panel.update();
        return panel;
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "selectModule":
                    this.selectedModule = msg.moduleId;
                    this.update();
                    break;
                case "runRefactor":
                    await this.runRefactor(msg.moduleId);
                    break;
                case "runFullRefactor":
                    await this.runFullRefactor();
                    break;
                case "applyChange":
                    await this.applyChange(msg.file, msg.content);
                    break;
                case "revertChange":
                    await this.revertChange(msg.file);
                    break;
            }
        });
    }

    private async runRefactor(moduleId: string): Promise<void> {
        const module = this.store.getModules().find(m => m.id === moduleId);
        if (!module) return;

        this.panel.webview.postMessage({
            command: "setLoading",
            moduleId,
            loading: true
        });

        try {
            // Find files in module
            const files = await this.findModuleFiles(module);
            
            const results: RefactorResult[] = [];
            
            for (const file of files) {
                const result = await this.refactorFile(file, module);
                if (result) {
                    results.push(result);
                }
            }

            this.results = [...this.results, ...results];

            this.panel.webview.postMessage({
                command: "refactorComplete",
                moduleId,
                results
            });

            vscode.window.showInformationMessage(`Refaktoryzacja ${module.name} zakończona!`);
        } catch (error) {
            vscode.window.showErrorMessage(`Błąd refaktoryzacji: ${error}`);
        }
    }

    private async runFullRefactor(): Promise<void> {
        const modules = this.store.getModules();
        
        for (const module of modules) {
            await this.runRefactor(module.id);
        }

        vscode.window.showInformationMessage("Pełna refaktoryzacja zakończona!");
    }

    private async findModuleFiles(module: any): Promise<string[]> {
        // Find files related to module
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) return [];

        const files: string[] = [];
        const patterns = module.patterns || [];

        // Search for files matching module patterns
        const searchPatterns = [
            `**/*${module.name.toLowerCase()}*`,
            `**/${module.name}/**`,
            ...patterns.map((p: string) => `**/*${p}*`)
        ];

        for (const pattern of searchPatterns) {
            try {
                const results = await vscode.workspace.findFiles(pattern, "**/node_modules/**", 20);
                results.forEach(uri => {
                    if (!files.includes(uri.fsPath)) {
                        files.push(uri.fsPath);
                    }
                });
            } catch (e) {
                // Ignore errors
            }
        }

        return files.slice(0, 10); // Limit to 10 files
    }

    private async refactorFile(filePath: string, module: any): Promise<RefactorResult | null> {
        try {
            const content = fs.readFileSync(filePath, "utf-8");
            
            const prompt = `You are an expert code refactorer. Refactor the following ${module.name} code to improve:

1. **Readability** - Clean variable names, proper formatting
2. **Best Practices** - Modern patterns, SOLID principles
3. **Performance** - Optimize where possible
4. **Type Safety** - Add proper types if missing
5. **Error Handling** - Add proper error handling

IMPORTANT RULES:
- Keep the same functionality
- Preserve all function signatures
- Don't change external APIs
- Return ONLY the refactored code, no explanations

Current code (${path.basename(filePath)}):
\`\`\`${path.extname(filePath).slice(1)}
${content}
\`\`\`

Refactored code:`;

            const result = await this.ollama.ask(prompt);
            
            if (result.success && result.content !== content) {
                return {
                    file: filePath,
                    original: content,
                    refactored: result.content,
                    changes: this.detectChanges(content, result.content)
                };
            }
        } catch (error) {
            console.error(`Error refactoring ${filePath}:`, error);
        }
        return null;
    }

    private detectChanges(original: string, refactored: string): string[] {
        const changes: string[] = [];
        
        // Simple change detection
        if (original.length !== refactored.length) {
            const diff = Math.abs(original.length - refactored.length);
            changes.push(`Size changed by ${diff} characters`);
        }
        
        // Check for common improvements
        const patterns = [
            { from: /var\s+/g, to: "const/let ", desc: "Changed var to const/let" },
            { from: /console\.log/g, to: "logger", desc: "Replaced console.log with logger" },
            { from: /any/g, to: "unknown", desc: "Replaced 'any' with 'unknown'" },
            { from: /catch\s*(\w+)\s*\{\s*\}/g, to: "catch { }", desc: "Added error handling" }
        ];

        patterns.forEach(p => {
            const fromMatches = original.match(p.from);
            const toMatches = refactored.match(p.to);
            if (fromMatches && toMatches && fromMatches.length !== toMatches.length) {
                changes.push(p.desc);
            }
        });

        if (changes.length === 0) {
            changes.push("Code style improvements");
        }

        return changes;
    }

    private async applyChange(filePath: string, content: string): Promise<void> {
        try {
            fs.writeFileSync(filePath, content, "utf-8");
            vscode.window.showInformationMessage(`Applied changes to ${path.basename(filePath)}`);
            
            // Reload file in editor
            const doc = await vscode.workspace.openTextDocument(filePath);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to apply changes: ${error}`);
        }
    }

    private async revertChange(filePath: string): Promise<void> {
        const result = this.results.find(r => r.file === filePath);
        if (result) {
            fs.writeFileSync(filePath, result.original, "utf-8");
            vscode.window.showInformationMessage(`Reverted ${path.basename(filePath)}`);
        }
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const modules = this.store.getModules();
        const selectedModuleData = modules.find(m => m.id === this.selectedModule);
        const moduleResults = this.results.filter(r => 
            selectedModuleData && r.file.includes(selectedModuleData.name.toLowerCase())
        );

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
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
        }
        .header h1 {
            color: #00d4ff;
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
        .modules-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .module-card {
            background: #16213e;
            padding: 15px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s;
            border: 2px solid transparent;
        }
        .module-card:hover {
            border-color: #00d4ff;
            transform: translateY(-2px);
        }
        .module-card.selected {
            border-color: #00ff88;
            background: rgba(0,255,136,0.1);
        }
        .module-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .module-status {
            font-size: 0.85em;
            color: #888;
        }
        .results {
            margin-top: 20px;
        }
        .result-card {
            background: #16213e;
            border-radius: 12px;
            margin-bottom: 15px;
            overflow: hidden;
        }
        .result-header {
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(0,0,0,0.2);
        }
        .result-file {
            font-weight: bold;
            font-family: monospace;
        }
        .result-actions {
            display: flex;
            gap: 10px;
        }
        .result-actions button {
            padding: 5px 10px;
            border-radius: 5px;
            border: none;
            cursor: pointer;
            font-size: 0.85em;
        }
        .btn-apply {
            background: #27ae60;
            color: white;
        }
        .btn-revert {
            background: #e74c3c;
            color: white;
        }
        .result-body {
            padding: 15px;
        }
        .code-diff {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .code-block {
            background: rgba(0,0,0,0.3);
            padding: 10px;
            border-radius: 8px;
            overflow-x: auto;
        }
        .code-block h4 {
            margin-bottom: 10px;
            font-size: 0.9em;
            color: #888;
        }
        .code-block pre {
            font-family: monospace;
            font-size: 0.85em;
            white-space: pre-wrap;
        }
        .changes-list {
            margin-top: 15px;
        }
        .change-item {
            display: inline-block;
            background: rgba(0,212,255,0.2);
            padding: 5px 10px;
            border-radius: 15px;
            margin: 5px;
            font-size: 0.85em;
        }
        .empty {
            text-align: center;
            padding: 50px;
            color: #888;
        }
        .loading {
            text-align: center;
            padding: 30px;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #333;
            border-top-color: #00d4ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔄 Code Refactor</h1>
        <button class="btn btn-primary" onclick="runFullRefactor()">🚀 Refactor All</button>
    </div>

    <h3 style="margin-bottom: 15px;">Select Module to Refactor:</h3>
    <div class="modules-grid">
        ${modules.map(m => `
        <div class="module-card ${m.id === this.selectedModule ? 'selected' : ''}" 
             onclick="selectModule('${m.id}')">
            <div class="module-name">📦 ${m.name}</div>
            <div class="module-status">${m.status}</div>
        </div>
        `).join('')}
    </div>

    <div id="results" class="results">
        ${this.selectedModule ? `
        <button class="btn btn-primary" onclick="runRefactor('${this.selectedModule}')" style="margin-bottom: 20px;">
            🔄 Refactor ${selectedModuleData?.name || 'Module'}
        </button>
        ` : ''}
        
        ${moduleResults.length > 0 ? `
        <h3 style="margin-bottom: 15px;">Results:</h3>
        ${moduleResults.map(r => `
        <div class="result-card">
            <div class="result-header">
                <span class="result-file">${path.basename(r.file)}</span>
                <div class="result-actions">
                    <button class="btn-apply" onclick="applyChange('${r.file.replace(/\\/g, '\\\\')}', \`${r.refactored.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)">Apply</button>
                    <button class="btn-revert" onclick="revertChange('${r.file.replace(/\\/g, '\\\\')}')">Revert</button>
                </div>
            </div>
            <div class="result-body">
                <div class="changes-list">
                    ${r.changes.map(c => `<span class="change-item">${c}</span>`).join('')}
                </div>
                <div class="code-diff" style="margin-top: 15px;">
                    <div class="code-block">
                        <h4>Before</h4>
                        <pre>${this.escapeHtml(r.original.substring(0, 500))}${r.original.length > 500 ? '...' : ''}</pre>
                    </div>
                    <div class="code-block">
                        <h4>After</h4>
                        <pre>${this.escapeHtml(r.refactored.substring(0, 500))}${r.refactored.length > 500 ? '...' : ''}</pre>
                    </div>
                </div>
            </div>
        </div>
        `).join('')}
        ` : this.selectedModule ? `
        <div class="empty">
            <p>Click "Refactor" to analyze and improve ${selectedModuleData?.name}</p>
        </div>
        ` : `
        <div class="empty">
            <p>Select a module above to refactor its code</p>
        </div>
        `}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function selectModule(moduleId) {
            vscode.postMessage({ command: 'selectModule', moduleId });
        }

        function runRefactor(moduleId) {
            vscode.postMessage({ command: 'runRefactor', moduleId });
        }

        function runFullRefactor() {
            vscode.postMessage({ command: 'runFullRefactor' });
        }

        function applyChange(file, content) {
            vscode.postMessage({ command: 'applyChange', file, content });
        }

        function revertChange(file) {
            vscode.postMessage({ command: 'revertChange', file });
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.command === 'setLoading') {
                const card = document.querySelector(\`[data-module-id="\${msg.moduleId}"]\`);
                if (card) {
                    card.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
                }
            }
        });
    </script>
</body>
</html>`;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    public dispose(): void {
        RefactorPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
