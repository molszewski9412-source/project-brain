/**
 * DocumentationPanel - FAZA 3
 * Automatyczne generowanie dokumentacji
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { OllamaClient } from "../ai/OllamaClient";
import { BrainStore } from "../storage/BrainStore";

export interface DocFile {
    name: string;
    path: string;
    content: string;
    generated: boolean;
    lastUpdated: string;
}

export class DocumentationPanel {
    public static currentPanel: DocumentationPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private ollama: OllamaClient;
    private docs: DocFile[] = [];
    private selectedDoc: string = "";

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.ollama = new OllamaClient();
        this.loadExistingDocs();
        this.setupMessageHandler();
        this.update();
    }

    public static createOrShow(): DocumentationPanel {
        if (DocumentationPanel.currentPanel) {
            DocumentationPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return DocumentationPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "documentation",
            "📚 Documentation",
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        DocumentationPanel.currentPanel = new DocumentationPanel(panel);
        return DocumentationPanel.currentPanel;
    }

    private loadExistingDocs(): void {
        const docsFolder = path.join(
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "",
            ".projectbrain",
            "docs"
        );

        if (fs.existsSync(docsFolder)) {
            const files = fs.readdirSync(docsFolder);
            this.docs = files.map(f => {
                const filePath = path.join(docsFolder, f);
                const stat = fs.statSync(filePath);
                return {
                    name: f.replace(".md", ""),
                    path: filePath,
                    content: fs.readFileSync(filePath, "utf-8"),
                    generated: true,
                    lastUpdated: stat.mtime.toISOString()
                };
            });
        }

        // Add default doc types if not exist
        const defaultDocs = ["README", "API", "ARCHITECTURE", "CHANGELOG", "INSTALL", "DEPLOYMENT"];
        defaultDocs.forEach(name => {
            if (!this.docs.find(d => d.name.toLowerCase() === name.toLowerCase())) {
                this.docs.push({
                    name,
                    path: path.join(docsFolder || "", `${name}.md`),
                    content: "",
                    generated: false,
                    lastUpdated: ""
                });
            }
        });
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "selectDoc":
                    this.selectedDoc = msg.docName;
                    this.update();
                    break;
                case "generateAll":
                    await this.generateAllDocs();
                    break;
                case "generateDoc":
                    await this.generateDoc(msg.docName);
                    break;
                case "saveDoc":
                    await this.saveDoc(msg.docName, msg.content);
                    break;
                case "openDoc":
                    await this.openDoc(msg.docPath);
                    break;
                case "updateFromAI":
                    await this.updateFromAI();
                    break;
            }
        });
    }

    private async generateAllDocs(): Promise<void> {
        vscode.window.showInformationMessage("Generating all documentation...");

        const brain = this.store.getBrain();
        const modules = this.store.getModules();

        for (const doc of this.docs) {
            await this.generateDoc(doc.name);
        }

        vscode.window.showInformationMessage("Documentation generated!");
        this.update();
    }

    private async generateDoc(docName: string): Promise<void> {
        const brain = this.store.getBrain();
        const modules = this.store.getModules();

        let prompt = "";
        const docNameLower = docName.toLowerCase();

        if (docNameLower === "readme") {
            prompt = `Generate a comprehensive README.md for this project:

Project Name: ${brain?.projectName || "My Project"}
Description: ${brain?.description || ""}
Tech Stack: ${(brain?.technologyStack || []).join(", ")}

Modules:
${modules.map(m => `- ${m.name}: ${m.description}`).join("\n")}

Include:
1. Project title and description
2. Features list
3. Tech stack
4. Installation instructions
5. Usage examples
6. Contributing guidelines
7. License section

Format as proper Markdown. Be detailed and professional.`;
        } else if (docNameLower === "api") {
            prompt = `Generate API documentation for this project:

Project: ${brain?.projectName || "My Project"}
Modules: ${modules.map(m => m.name).join(", ")}

Generate OpenAPI/Swagger style documentation covering:
1. Endpoints (CRUD for each module)
2. Request/Response formats
3. Authentication
4. Error codes
5. Examples

Use proper API documentation format with endpoints, methods, and examples.`;
        } else if (docNameLower === "architecture") {
            prompt = `Generate ARCHITECTURE.md documenting the system design:

Project: ${brain?.projectName || "My Project"}
Modules:
${modules.map(m => `- ${m.name}: ${m.description}`).join("\n")}
Dependencies: ${(brain?.technologyStack || []).join(", ")}

Include:
1. High-level architecture overview
2. Module structure and relationships
3. Data flow
4. Technology decisions
5. Security considerations
6. Future extensibility

Use diagrams (Mermaid if possible) and be technical.`;
        } else if (docNameLower === "changelog") {
            prompt = `Generate CHANGELOG.md template:

Project: ${brain?.projectName || "My Project"}

Include:
1. Version header format (## [Unreleased])
2. Added section
3. Changed section
4. Deprecated section
5. Removed section
6. Fixed section
7. Security section

Format following Keep a Changelog conventions.`;
        } else if (docNameLower === "install") {
            prompt = `Generate INSTALL.md with installation instructions:

Project: ${brain?.projectName || "My Project"}
Tech Stack: ${(brain?.technologyStack || []).join(", ")}

Include:
1. Prerequisites
2. Environment setup
3. Installation steps
4. Configuration
5. First run
6. Troubleshooting

Be detailed with code examples.`;
        } else if (docNameLower === "deployment") {
            prompt = `Generate DEPLOYMENT.md:

Project: ${brain?.projectName || "My Project"}
Tech Stack: ${(brain?.technologyStack || []).join(", ")}

Include deployment guides for:
1. Local development
2. Docker
3. Cloud platforms (AWS, Azure, GCP)
4. Environment variables
5. CI/CD pipeline setup
6. Post-deployment checks

Be comprehensive and production-focused.`;
        }

        try {
            const result = await this.ollama.ask(prompt);
            if (result.success) {
                const doc = this.docs.find(d => d.name.toLowerCase() === docName.toLowerCase());
                if (doc) {
                    doc.content = result.content;
                    doc.generated = true;
                    doc.lastUpdated = new Date().toISOString();
                    await this.saveDoc(doc.name, result.content);
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error generating ${docName}: ${error}`);
        }

        this.update();
    }

    private async saveDoc(docName: string, content: string): Promise<void> {
        const docsFolder = path.join(
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "",
            ".projectbrain",
            "docs"
        );

        if (!fs.existsSync(docsFolder)) {
            fs.mkdirSync(docsFolder, { recursive: true });
        }

        const filePath = path.join(docsFolder, `${docName}.md`);
        fs.writeFileSync(filePath, content, "utf-8");

        const doc = this.docs.find(d => d.name.toLowerCase() === docName.toLowerCase());
        if (doc) {
            doc.path = filePath;
            doc.lastUpdated = new Date().toISOString();
        }

        vscode.window.showInformationMessage(`${docName} saved!`);
    }

    private async openDoc(docPath: string): Promise<void> {
        const doc = await vscode.workspace.openTextDocument(docPath);
        await vscode.window.showTextDocument(doc);
    }

    private async updateFromAI(): Promise<void> {
        if (!this.selectedDoc) return;

        const doc = this.docs.find(d => d.name === this.selectedDoc);
        if (!doc) return;

        vscode.window.showInformationMessage("Updating documentation with AI...");

        const edit = await vscode.window.showInputBox({
            prompt: "What would you like to add/update in this documentation?",
            placeHolder: "Describe what to change..."
        });

        if (edit) {
            const prompt = `Update the following ${this.selectedDoc} documentation:

Current content:
${doc.content}

Change request: ${edit}

Please provide the updated documentation.`;

            try {
                const result = await this.ollama.ask(prompt);
                if (result.success) {
                    doc.content = result.content;
                    doc.lastUpdated = new Date().toISOString();
                    await this.saveDoc(doc.name, result.content);
                    this.update();
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Error: ${error}`);
            }
        }
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const selectedDoc = this.docs.find(d => d.name === this.selectedDoc);
        const generatedCount = this.docs.filter(d => d.generated).length;

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
        .stats {
            display: flex;
            gap: 20px;
        }
        .stat {
            background: #16213e;
            padding: 10px 20px;
            border-radius: 20px;
        }
        .stat-value {
            color: #00ff88;
            font-weight: bold;
        }
        .main-container {
            display: grid;
            grid-template-columns: 280px 1fr;
            gap: 20px;
            flex: 1;
            min-height: 0;
        }
        .docs-list {
            background: #16213e;
            border-radius: 12px;
            padding: 15px;
            overflow-y: auto;
        }
        .doc-item {
            padding: 15px;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.2s;
            border-left: 4px solid transparent;
        }
        .doc-item:hover {
            background: rgba(0,212,255,0.1);
        }
        .doc-item.selected {
            background: rgba(0,212,255,0.2);
            border-left-color: #00d4ff;
        }
        .doc-item.generated {
            border-left-color: #27ae60;
        }
        .doc-name {
            font-weight: bold;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .doc-status {
            font-size: 0.8em;
            color: #888;
        }
        .doc-status.generated {
            color: #27ae60;
        }
        .doc-preview {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .preview-header {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
        }
        .preview-header h3 {
            color: #00d4ff;
            margin-bottom: 10px;
        }
        .preview-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .preview-content {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            flex: 1;
            overflow-y: auto;
        }
        .preview-content pre {
            white-space: pre-wrap;
            font-family: 'Consolas', monospace;
            font-size: 0.9em;
            line-height: 1.6;
            color: #ccc;
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
        .btn-success {
            background: #27ae60;
            color: white;
        }
        .empty-state {
            text-align: center;
            padding: 50px;
            color: #888;
        }
        .badge {
            font-size: 0.75em;
            padding: 3px 8px;
            border-radius: 10px;
            background: #333;
        }
        .badge.generated {
            background: rgba(39,174,96,0.3);
            color: #27ae60;
        }
        .last-updated {
            font-size: 0.8em;
            color: #888;
            margin-top: 5px;
        }
        .doc-type {
            font-size: 0.7em;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(0,212,255,0.2);
            color: #00d4ff;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📚 Documentation</h1>
        <div class="stats">
            <div class="stat">
                <span class="stat-value">${generatedCount}/${this.docs.length}</span> Generated
            </div>
        </div>
    </div>

    <div class="main-container">
        <div class="docs-list">
            <button class="btn btn-primary" style="width: 100%; margin-bottom: 15px;" onclick="generateAll()">
                🚀 Generate All Docs
            </button>

            ${this.docs.map(doc => `
            <div class="doc-item ${doc.name === this.selectedDoc ? 'selected' : ''} ${doc.generated ? 'generated' : ''}"
                 onclick="selectDoc('${doc.name}')">
                <div class="doc-name">
                    📄 ${doc.name}.md
                    <span class="badge ${doc.generated ? 'generated' : ''}">
                        ${doc.generated ? '✓' : '○'}
                    </span>
                </div>
                <div class="doc-status ${doc.generated ? 'generated' : ''}">
                    ${doc.generated ? 'Generated' : 'Not generated'}
                </div>
                ${doc.lastUpdated ? `
                <div class="last-updated">
                    ${new Date(doc.lastUpdated).toLocaleDateString()}
                </div>
                ` : ''}
            </div>
            `).join('')}
        </div>

        <div class="doc-preview">
            ${selectedDoc ? `
            <div class="preview-header">
                <h3>📄 ${selectedDoc.name}.md</h3>
                <div class="preview-actions">
                    <button class="btn btn-primary" onclick="generateDoc('${selectedDoc.name}')">
                        ✨ Generate
                    </button>
                    <button class="btn btn-success" onclick="updateFromAI()">
                        🤖 Update with AI
                    </button>
                    <button class="btn btn-secondary" onclick="openDoc('${selectedDoc.path.replace(/\\/g, '\\\\')}')">
                        📂 Open in Editor
                    </button>
                    <button class="btn btn-secondary" onclick="copyContent()">
                        📋 Copy
                    </button>
                </div>
            </div>
            <div class="preview-content">
                <pre>${selectedDoc.content || 'No content generated yet. Click "Generate" to create documentation.'}</pre>
            </div>
            ` : `
            <div class="empty-state">
                <p style="font-size: 2em;">📚</p>
                <p style="margin-top: 20px;">Select a document to preview</p>
                <p style="margin-top: 10px; font-size: 0.9em; color: #666;">
                    Click on any document in the list to see its content
                </p>
            </div>
            `}
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function selectDoc(name) {
            vscode.postMessage({ command: 'selectDoc', docName: name });
        }

        function generateAll() {
            vscode.postMessage({ command: 'generateAll' });
        }

        function generateDoc(name) {
            vscode.postMessage({ command: 'generateDoc', docName: name });
        }

        function openDoc(path) {
            vscode.postMessage({ command: 'openDoc', docPath: path });
        }

        function updateFromAI() {
            vscode.postMessage({ command: 'updateFromAI' });
        }

        function copyContent() {
            const content = document.querySelector('.preview-content pre').textContent;
            navigator.clipboard.writeText(content);
            alert('Copied to clipboard!');
        }
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        DocumentationPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
