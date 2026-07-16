/**
 * CodeGeneratorPanel - TASK 14.1
 * Panel do generowania kodu z modułów
 */

import * as vscode from "vscode";
import { BrainStore } from "../storage/BrainStore";
import { BrainModule } from "../models/ProjectBrain";
import { CodeGeneratorService, GenerationOptions, GenerationResult } from "../services/CodeGeneratorService";

export class CodeGeneratorPanel {
    public static currentPanel: CodeGeneratorPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private generator: CodeGeneratorService;
    private module: BrainModule | null = null;

    private constructor(panel: vscode.WebviewPanel, moduleId?: string) {
        this.panel = panel;
        this.store = new BrainStore();
        this.generator = new CodeGeneratorService();
        
        if (moduleId) {
            this.module = this.store.getModule(moduleId) || null;
        }
        
        this.update();
        this.setupMessageHandler();
    }

    public static createOrShow(moduleId?: string): CodeGeneratorPanel {
        if (CodeGeneratorPanel.currentPanel) {
            CodeGeneratorPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            if (moduleId) {
                CodeGeneratorPanel.currentPanel.module = CodeGeneratorPanel.currentPanel.store.getModule(moduleId) || null;
            }
            CodeGeneratorPanel.currentPanel.update();
            return CodeGeneratorPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "codeGenerator",
            "⚡ Code Generator",
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        CodeGeneratorPanel.currentPanel = new CodeGeneratorPanel(panel, moduleId);
        return CodeGeneratorPanel.currentPanel;
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "generate":
                    await this.onGenerate(msg.type, msg.framework, msg.language, msg.customPrompt);
                    break;
                case "refresh":
                    this.update();
                    break;
            }
        });
    }

    private async onGenerate(
        type: string, 
        framework: string, 
        language: string, 
        customPrompt: string
    ): Promise<void> {
        if (!this.module) {
            vscode.window.showErrorMessage("No module selected");
            return;
        }

        const options: GenerationOptions = {
            moduleId: this.module.id,
            type: type as any,
            framework,
            language,
            customPrompt
        };

        const result = await this.generator.generate(options);

        // Show result
        if (result.success) {
            const filesCreated = result.files.filter(f => f.action === 'create').length;
            const filesUpdated = result.files.filter(f => f.action === 'update').length;
            
            let message = `✅ Generated ${filesCreated} files`;
            if (filesUpdated > 0) {
                message += `, updated ${filesUpdated} files`;
            }
            
            vscode.window.showInformationMessage(message);
            
            // Show files created
            if (result.files.length > 0) {
                const filesList = result.files.map(f => `${f.action === 'create' ? '📄' : '📝'} ${f.path}`).join('\n');
                vscode.window.showInformationMessage(
                    `Files:\n${filesList}`,
                    { modal: true }
                );
            }
        } else {
            vscode.window.showErrorMessage(`Generation failed: ${result.errors.join(', ')}`);
        }

        this.update();
    }

    private buildHtml(): string {
        const generators = this.generator.getAvailableGenerators();
        const frameworks = [
            { id: 'react', name: 'React + TypeScript' },
            { id: 'vue', name: 'Vue 3 + TypeScript' },
            { id: 'node', name: 'Node.js + Express' },
            { id: 'python', name: 'Python + FastAPI' },
            { id: 'nextjs', name: 'Next.js' },
            { id: 'nuxt', name: 'Nuxt.js' }
        ];

        const moduleInfo = this.module ? `
            <div class="module-info">
                <h3>📦 ${this.module.name}</h3>
                <p>${this.module.description || 'No description'}</p>
                <div class="module-meta">
                    <span>Status: ${this.module.status}</span>
                    <span>Progress: ${this.module.progress}%</span>
                </div>
            </div>
        ` : `
            <div class="no-module">
                <h3>⚠️ No module selected</h3>
                <p>Select a module from the Visual Brain Canvas to generate code.</p>
            </div>
        `;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Generator</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a2e;
            color: #fff;
            padding: 20px;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 1.8em;
            color: #00d4ff;
            margin-bottom: 10px;
        }

        .header p {
            color: #888;
        }

        .module-info {
            background: #16213e;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 25px;
            border-left: 4px solid #00d4ff;
        }

        .module-info h3 {
            color: #00d4ff;
            margin-bottom: 10px;
        }

        .module-meta {
            display: flex;
            gap: 20px;
            margin-top: 10px;
            font-size: 0.85em;
            color: #888;
        }

        .no-module {
            background: #2a1a1a;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 25px;
            text-align: center;
            border-left: 4px solid #c0392b;
        }

        .generators {
            display: grid;
            gap: 15px;
            margin-bottom: 25px;
        }

        .generator-card {
            background: #16213e;
            padding: 20px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            border: 2px solid transparent;
        }

        .generator-card:hover {
            background: #1a2a4e;
            border-color: #00d4ff;
            transform: translateX(5px);
        }

        .generator-card.selected {
            border-color: #00d4ff;
            background: #0f3460;
        }

        .generator-card h4 {
            color: #fff;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .generator-card p {
            color: #888;
            font-size: 0.85em;
        }

        .form-section {
            background: #16213e;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
        }

        .form-section h3 {
            color: #00d4ff;
            margin-bottom: 15px;
        }

        .form-row {
            margin-bottom: 15px;
        }

        .form-label {
            display: block;
            color: #888;
            font-size: 0.85em;
            margin-bottom: 5px;
        }

        .form-select, .form-input {
            width: 100%;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #333;
            background: #0f3460;
            color: #fff;
            font-size: 0.95em;
        }

        .form-select:focus, .form-input:focus {
            outline: none;
            border-color: #00d4ff;
        }

        .form-textarea {
            width: 100%;
            min-height: 100px;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #333;
            background: #0f3460;
            color: #fff;
            font-size: 0.95em;
            resize: vertical;
        }

        .generate-btn {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            border: none;
            border-radius: 12px;
            color: #1a1a2e;
            font-size: 1.1em;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
        }

        .generate-btn:hover {
            transform: scale(1.02);
            box-shadow: 0 5px 20px rgba(0, 212, 255, 0.3);
        }

        .generate-btn:disabled {
            background: #333;
            color: #666;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .features {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 30px;
        }

        .feature {
            background: #16213e;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }

        .feature-icon {
            font-size: 2em;
            margin-bottom: 10px;
        }

        .feature h4 {
            color: #fff;
            font-size: 0.9em;
            margin-bottom: 5px;
        }

        .feature p {
            color: #888;
            font-size: 0.75em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚡ Code Generator</h1>
        <p>Generate production-ready code from your modules</p>
    </div>

    ${moduleInfo}

    <div class="generators">
        ${generators.map((g, i) => `
            <div class="generator-card ${i === 0 ? 'selected' : ''}" onclick="selectGenerator('${g.id}', this)">
                <h4>${this.getGeneratorIcon(g.id)} ${g.name}</h4>
                <p>${g.description}</p>
            </div>
        `).join('')}
    </div>

    <div class="form-section">
        <h3>⚙️ Configuration</h3>
        
        <div class="form-row">
            <label class="form-label">Framework</label>
            <select class="form-select" id="framework">
                ${frameworks.map(f => `<option value="${f.id}">${f.name}</option>`).join('')}
            </select>
        </div>

        <div class="form-row">
            <label class="form-label">Language</label>
            <select class="form-select" id="language">
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
            </select>
        </div>

        <div class="form-row" id="customPromptRow" style="display: none;">
            <label class="form-label">Custom Prompt</label>
            <textarea class="form-textarea" id="customPrompt" placeholder="Describe what code you want to generate..."></textarea>
        </div>
    </div>

    <button class="generate-btn" id="generateBtn" onclick="generate()" ${!this.module ? 'disabled' : ''}>
        🚀 Generate Code
    </button>

    <div class="features">
        <div class="feature">
            <div class="feature-icon">📝</div>
            <h4>TypeScript</h4>
            <p>Full type safety</p>
        </div>
        <div class="feature">
            <div class="feature-icon">🧪</div>
            <h4>Tests</h4>
            <p>Unit tests included</p>
        </div>
        <div class="feature">
            <div class="feature-icon">📚</div>
            <h4>Docs</h4>
            <p>Comments included</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let selectedType = 'full';

        function selectGenerator(type, element) {
            document.querySelectorAll('.generator-card').forEach(c => c.classList.remove('selected'));
            element.classList.add('selected');
            selectedType = type;

            // Show/hide custom prompt
            const customRow = document.getElementById('customPromptRow');
            if (type === 'custom') {
                customRow.style.display = 'block';
            } else {
                customRow.style.display = 'none';
            }
        }

        function generate() {
            const framework = document.getElementById('framework').value;
            const language = document.getElementById('language').value;
            const customPrompt = document.getElementById('customPrompt')?.value || '';

            vscode.postMessage({
                command: 'generate',
                type: selectedType,
                framework,
                language,
                customPrompt
            });
        }
    </script>
</body>
</html>`;
    }

    private getGeneratorIcon(type: string): string {
        switch (type) {
            case 'full': return '📦';
            case 'api': return '🌐';
            case 'ui': return '🖥️';
            case 'test': return '🧪';
            case 'custom': return '✨';
            default: return '📄';
        }
    }

    public dispose(): void {
        CodeGeneratorPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
