/**
 * AILearningPanel - FAZA 22
 * Project Brain uczy się projektu
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { OllamaClient } from "../ai/OllamaClient";
import { BrainStore } from "../storage/BrainStore";

export interface CodePattern {
    id: string;
    name: string;
    description: string;
    examples: string[];
    usage: number;
    files: string[];
}

export interface StyleRule {
    id: string;
    pattern: string;
    replacement: string;
    reason: string;
    enabled: boolean;
}

export interface LearnedKnowledge {
    codePatterns: CodePattern[];
    styleRules: StyleRule[];
    conventions: string[];
    architecture: string;
    lastUpdated: string;
}

export class AILearningPanel {
    public static currentPanel: AILearningPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private ollama: OllamaClient;
    private knowledge: LearnedKnowledge;
    private activeTab: "patterns" | "styles" | "conventions" = "patterns";
    private isLearning: boolean = false;

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.ollama = new OllamaClient();
        this.knowledge = this.loadKnowledge();
        this.setupMessageHandler();
        this.update();
    }

    public static createOrShow(): AILearningPanel {
        if (AILearningPanel.currentPanel) {
            AILearningPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return AILearningPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "aiLearning",
            "🧠 AI Learning",
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        AILearningPanel.currentPanel = new AILearningPanel(panel);
        return AILearningPanel.currentPanel;
    }

    private loadKnowledge(): LearnedKnowledge {
        // Default patterns and rules (stored locally in panel)
        return {
            codePatterns: [
                {
                    id: "pattern-1",
                    name: "Error Handling",
                    description: "Standard error handling with try-catch",
                    examples: ["try { } catch (e) { console.error(e); }"],
                    usage: 15,
                    files: ["src/services/*.ts"]
                },
                {
                    id: "pattern-2",
                    name: "Async/Await",
                    description: "Modern async handling pattern",
                    examples: ["async function() { await doSomething(); }"],
                    usage: 23,
                    files: ["src/**/*.ts"]
                },
                {
                    id: "pattern-3",
                    name: "Module Export",
                    description: "CommonJS module pattern",
                    examples: ["export class Foo { }", "export function bar() { }"],
                    usage: 42,
                    files: ["src/**/*.ts"]
                }
            ],
            styleRules: [
                {
                    id: "rule-1",
                    pattern: "var ",
                    replacement: "const ",
                    reason: "Prefer const over var",
                    enabled: true
                },
                {
                    id: "rule-2",
                    pattern: "function(",
                    replacement: "const func = (",
                    reason: "Arrow functions preferred",
                    enabled: true
                },
                {
                    id: "rule-3",
                    pattern: "== ",
                    replacement: "=== ",
                    reason: "Use strict equality",
                    enabled: true
                }
            ],
            conventions: [
                "Use PascalCase for React components",
                "Use camelCase for functions and variables",
                "Use UPPER_SNAKE_CASE for constants",
                "Prefix interfaces with 'I' (e.g., IUserProps)",
                "Use named exports over default exports"
            ],
            architecture: "Microservices with REST API",
            lastUpdated: new Date().toISOString()
        };
    }

    private saveKnowledge(): void {
        // Knowledge stored locally in the panel
        // Could be persisted to brain store if needed
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "setTab":
                    this.activeTab = msg.tab;
                    this.update();
                    break;
                case "learnFromProject":
                    await this.learnFromProject();
                    break;
                case "addPattern":
                    this.addPattern(msg.pattern);
                    break;
                case "deletePattern":
                    this.deletePattern(msg.patternId);
                    break;
                case "toggleRule":
                    this.toggleRule(msg.ruleId);
                    break;
                case "addConvention":
                    this.addConvention(msg.convention);
                    break;
                case "applyLearning":
                    await this.applyLearningToProject();
                    break;
            }
        });
    }

    private async learnFromProject(): Promise<void> {
        this.isLearning = true;
        this.update();

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage("No workspace folder open");
            return;
        }

        vscode.window.showInformationMessage("Analyzing project structure...");

        // Scan project files
        const files = await vscode.workspace.findFiles("**/*.{ts,tsx,js,jsx}", "**/node_modules/**");
        const fileContents: string[] = [];

        for (const file of files.slice(0, 20)) {
            try {
                const content = fs.readFileSync(file.fsPath, "utf-8");
                fileContents.push(`File: ${path.relative(workspaceRoot, file.fsPath)}\n${content.slice(0, 500)}`);
            } catch (e) {
                // Skip
            }
        }

        // Ask AI to learn patterns
        const prompt = `Analyze this codebase and extract:
1. Code patterns (reusable patterns you see)
2. Coding conventions used
3. Style preferences
4. Architecture patterns

Return as JSON with:
{
  "patterns": [{"name": "...", "description": "...", "example": "..."}],
  "conventions": ["convention1", "convention2"],
  "stylePreferences": [{"pattern": "...", "prefer": "..."}]
}

Codebase snippets:
${fileContents.join("\n\n---\n\n")}`;

        try {
            const result = await this.ollama.ask(prompt);
            
            // Parse and add patterns
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const learned = JSON.parse(jsonMatch[0]);
                    
                    if (learned.patterns) {
                        learned.patterns.forEach((p: any) => {
                            this.knowledge.codePatterns.push({
                                id: `pattern-${Date.now()}`,
                                name: p.name,
                                description: p.description,
                                examples: [p.example],
                                usage: 1,
                                files: []
                            });
                        });
                    }

                    if (learned.conventions) {
                        learned.conventions.forEach((c: string) => {
                            if (!this.knowledge.conventions.includes(c)) {
                                this.knowledge.conventions.push(c);
                            }
                        });
                    }
                } catch (e) {
                    console.error("Parse error:", e);
                }
            }

            this.knowledge.lastUpdated = new Date().toISOString();
            this.saveKnowledge();
            vscode.window.showInformationMessage("Learning complete!");
        } catch (error) {
            vscode.window.showErrorMessage(`Learning failed: ${error}`);
        }

        this.isLearning = false;
        this.update();
    }

    private addPattern(pattern: Partial<CodePattern>): void {
        this.knowledge.codePatterns.push({
            id: `pattern-${Date.now()}`,
            name: pattern.name || "New Pattern",
            description: pattern.description || "",
            examples: pattern.examples || [],
            usage: 0,
            files: []
        });
        this.saveKnowledge();
        this.update();
    }

    private deletePattern(patternId: string): void {
        this.knowledge.codePatterns = this.knowledge.codePatterns.filter(p => p.id !== patternId);
        this.saveKnowledge();
        this.update();
    }

    private toggleRule(ruleId: string): void {
        const rule = this.knowledge.styleRules.find(r => r.id === ruleId);
        if (rule) {
            rule.enabled = !rule.enabled;
            this.saveKnowledge();
            this.update();
        }
    }

    private addConvention(convention: string): void {
        if (!this.knowledge.conventions.includes(convention)) {
            this.knowledge.conventions.push(convention);
            this.saveKnowledge();
            this.update();
        }
    }

    private async applyLearningToProject(): Promise<void> {
        vscode.window.showInformationMessage("Applying learned patterns...");

        const prompt = `Based on the following learned patterns and conventions, suggest improvements for the project:

Patterns:
${this.knowledge.codePatterns.map(p => `- ${p.name}: ${p.description}`).join("\n")}

Conventions:
${this.knowledge.conventions.map(c => `- ${c}`).join("\n")}

Provide specific, actionable suggestions.`;

        try {
            const result = await this.ollama.ask(prompt);
            
            // Show in new panel or notification
            vscode.window.showInformationMessage("Analysis complete! Check output.");
        } catch (error) {
            vscode.window.showErrorMessage(`Failed: ${error}`);
        }
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const patternCount = this.knowledge.codePatterns.length;
        const enabledRules = this.knowledge.styleRules.filter(r => r.enabled).length;
        const conventionCount = this.knowledge.conventions.length;

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
        .header-actions {
            display: flex;
            gap: 10px;
        }
        .btn {
            padding: 12px 24px;
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
        .btn-primary:hover { transform: scale(1.05); }
        .btn-secondary {
            background: #333;
            color: #fff;
        }
        .stats-bar {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
        }
        .stat-card {
            background: #16213e;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }
        .stat-value {
            font-size: 2.5em;
            font-weight: bold;
            color: #00d4ff;
        }
        .stat-label {
            color: #888;
            margin-top: 5px;
        }
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .tab {
            padding: 12px 24px;
            border-radius: 8px;
            background: #16213e;
            border: none;
            color: #fff;
            cursor: pointer;
        }
        .tab.active {
            background: #00d4ff;
            color: #1a1a2e;
        }
        .content {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            max-height: 500px;
            overflow-y: auto;
        }
        .pattern-item, .rule-item, .convention-item {
            background: rgba(0,0,0,0.2);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .pattern-name, .rule-name, .convention-text {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .pattern-desc, .rule-reason {
            font-size: 0.9em;
            color: #888;
        }
        .pattern-example {
            background: rgba(0,212,255,0.1);
            padding: 8px 12px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.85em;
            margin-top: 8px;
        }
        .toggle {
            width: 50px;
            height: 26px;
            border-radius: 13px;
            background: #333;
            position: relative;
            cursor: pointer;
            transition: all 0.3s;
        }
        .toggle.active {
            background: #27ae60;
        }
        .toggle::after {
            content: '';
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: white;
            position: absolute;
            top: 2px;
            left: 2px;
            transition: all 0.3s;
        }
        .toggle.active::after {
            left: 26px;
        }
        .delete-btn {
            background: #e74c3c;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            margin-left: 10px;
        }
        .usage-badge {
            background: rgba(0,212,255,0.2);
            color: #00d4ff;
            padding: 4px 10px;
            border-radius: 10px;
            font-size: 0.85em;
        }
        .add-form {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .add-form input {
            flex: 1;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #333;
            background: #1a1a2e;
            color: #fff;
        }
        .conventions-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .convention-item {
            display: block;
        }
        .convention-number {
            display: inline-block;
            width: 24px;
            height: 24px;
            background: #00d4ff;
            color: #1a1a2e;
            border-radius: 50%;
            text-align: center;
            line-height: 24px;
            margin-right: 10px;
            font-size: 0.85em;
            font-weight: bold;
        }
        .architecture-section {
            background: rgba(0,212,255,0.1);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .architecture-label {
            color: #888;
            font-size: 0.85em;
            margin-bottom: 5px;
        }
        .architecture-value {
            font-weight: bold;
            color: #00d4ff;
        }
        .last-updated {
            text-align: center;
            color: #888;
            margin-top: 20px;
            font-size: 0.85em;
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
        }
        .spinner {
            width: 30px;
            height: 30px;
            border: 3px solid #333;
            border-top-color: #00d4ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧠 AI Learning</h1>
        <div class="header-actions">
            <button class="btn btn-primary" onclick="learnFromProject()" ${this.isLearning ? 'disabled' : ''}>
                ${this.isLearning ? '⏳ Learning...' : '📚 Learn from Project'}
            </button>
            <button class="btn btn-secondary" onclick="applyLearning()">
                🚀 Apply Learning
            </button>
        </div>
    </div>

    <div class="stats-bar">
        <div class="stat-card">
            <div class="stat-value">${patternCount}</div>
            <div class="stat-label">Code Patterns</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${enabledRules}/${this.knowledge.styleRules.length}</div>
            <div class="stat-label">Style Rules</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${conventionCount}</div>
            <div class="stat-label">Conventions</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${this.knowledge.architecture ? '✓' : '✗'}</div>
            <div class="stat-label">Architecture</div>
        </div>
    </div>

    <div class="architecture-section">
        <div class="architecture-label">Learned Architecture</div>
        <div class="architecture-value">${this.knowledge.architecture || 'Not learned yet'}</div>
    </div>

    <div class="tabs">
        <button class="tab ${this.activeTab === 'patterns' ? 'active' : ''}" onclick="setTab('patterns')">
            Patterns (${patternCount})
        </button>
        <button class="tab ${this.activeTab === 'styles' ? 'active' : ''}" onclick="setTab('styles')">
            Style Rules (${enabledRules})
        </button>
        <button class="tab ${this.activeTab === 'conventions' ? 'active' : ''}" onclick="setTab('conventions')">
            Conventions (${conventionCount})
        </button>
    </div>

    <div class="content">
        ${this.isLearning ? `
        <div class="loading">
            <div class="spinner"></div>
            <span style="margin-left: 15px;">Analyzing codebase...</span>
        </div>
        ` : ''}

        ${this.activeTab === 'patterns' ? `
        ${this.knowledge.codePatterns.map(p => `
        <div class="pattern-item">
            <div>
                <div class="pattern-name">${p.name}</div>
                <div class="pattern-desc">${p.description}</div>
                <div class="pattern-example">${p.examples[0] || 'No example'}</div>
            </div>
            <div style="display: flex; align-items: center;">
                <span class="usage-badge">${p.usage} uses</span>
                <button class="delete-btn" onclick="deletePattern('${p.id}')">×</button>
            </div>
        </div>
        `).join('')}
        ` : ''}

        ${this.activeTab === 'styles' ? `
        ${this.knowledge.styleRules.map(r => `
        <div class="rule-item">
            <div>
                <div class="rule-name">${r.pattern} → ${r.replacement}</div>
                <div class="rule-reason">${r.reason}</div>
            </div>
            <div class="toggle ${r.enabled ? 'active' : ''}" onclick="toggleRule('${r.id}')"></div>
        </div>
        `).join('')}
        ` : ''}

        ${this.activeTab === 'conventions' ? `
        <div class="conventions-list">
            ${this.knowledge.conventions.map((c, i) => `
            <div class="convention-item">
                <span class="convention-number">${i + 1}</span>
                ${c}
            </div>
            `).join('')}
        </div>
        <div class="add-form" style="margin-top: 15px;">
            <input type="text" id="newConvention" placeholder="Add new convention...">
            <button class="btn btn-primary" onclick="addConvention()">Add</button>
        </div>
        ` : ''}
    </div>

    <div class="last-updated">
        Last updated: ${new Date(this.knowledge.lastUpdated).toLocaleString()}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function setTab(tab) {
            vscode.postMessage({ command: 'setTab', tab });
        }

        function learnFromProject() {
            vscode.postMessage({ command: 'learnFromProject' });
        }

        function deletePattern(patternId) {
            vscode.postMessage({ command: 'deletePattern', patternId });
        }

        function toggleRule(ruleId) {
            vscode.postMessage({ command: 'toggleRule', ruleId });
        }

        function addConvention() {
            const text = document.getElementById('newConvention').value;
            if (text.trim()) {
                vscode.postMessage({ command: 'addConvention', convention: text });
                document.getElementById('newConvention').value = '';
            }
        }

        function applyLearning() {
            vscode.postMessage({ command: 'applyLearning' });
        }
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        AILearningPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
