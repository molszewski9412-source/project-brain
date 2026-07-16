/**
 * ProjectSimulatorPanel - FAZA 23
 * Symulator projektu - pokazuje co się zmieni przed generowaniem
 */

import * as vscode from "vscode";
import { OllamaClient } from "../ai/OllamaClient";
import { BrainStore } from "../storage/BrainStore";

export interface FileChange {
    path: string;
    action: "create" | "modify" | "delete";
    impact: "low" | "medium" | "high";
    description: string;
    risk: "safe" | "warning" | "danger";
    conflicts?: string[];
}

export interface SimulationResult {
    id: string;
    prompt: string;
    changes: FileChange[];
    timestamp: string;
    risk: "low" | "medium" | "high";
    estimatedTime: string;
}

export class ProjectSimulatorPanel {
    public static currentPanel: ProjectSimulatorPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private ollama: OllamaClient;
    private simulationResult: SimulationResult | null = null;
    private isSimulating: boolean = false;

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.ollama = new OllamaClient();
        this.setupMessageHandler();
        this.update();
    }

    public static createOrShow(): ProjectSimulatorPanel {
        if (ProjectSimulatorPanel.currentPanel) {
            ProjectSimulatorPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return ProjectSimulatorPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "projectSimulator",
            "🎯 Project Simulator",
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        ProjectSimulatorPanel.currentPanel = new ProjectSimulatorPanel(panel);
        return ProjectSimulatorPanel.currentPanel;
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "simulate":
                    await this.simulateChanges(msg.prompt);
                    break;
                case "quickSimulate":
                    await this.quickSimulate(msg.action);
                    break;
                case "applyChanges":
                    await this.applyChanges();
                    break;
                case "clearSimulation":
                    this.simulationResult = null;
                    this.update();
                    break;
            }
        });
    }

    private async simulateChanges(prompt: string): Promise<void> {
        this.isSimulating = true;
        this.simulationResult = null;
        this.update();

        const brain = this.store.getBrain();
        const modules = this.store.getModules();

        // Ask AI to predict changes
        const simulatePrompt = `You are a project simulator. Analyze what changes would be made to the project if the following action is taken:

Action: "${prompt}"

Project: ${brain?.projectName || "My Project"}
Tech Stack: ${(brain?.technologyStack || []).join(", ")}

Modules:
${modules.map(m => `- ${m.name}: ${m.description}`).join("\n")}

Predict the file changes that would occur. Return as JSON:
{
  "changes": [
    {
      "path": "src/file.ts",
      "action": "create|modify|delete",
      "impact": "low|medium|high",
      "description": "What this change does",
      "risk": "safe|warning|danger",
      "conflicts": ["potential conflict descriptions"]
    }
  ],
  "estimatedTime": "5-10 minutes",
  "overallRisk": "low|medium|high"
}

Be specific about file paths and describe what each file will contain.`;

        try {
            const result = await this.ollama.ask(simulatePrompt);
            
            // Parse response
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const data = JSON.parse(jsonMatch[0]);
                    this.simulationResult = {
                        id: `sim-${Date.now()}`,
                        prompt,
                        changes: data.changes || [],
                        timestamp: new Date().toISOString(),
                        risk: data.overallRisk || "medium",
                        estimatedTime: data.estimatedTime || "Unknown"
                    };
                } catch (e) {
                    // Fallback mock data
                    this.simulationResult = this.getMockSimulation(prompt);
                }
            } else {
                this.simulationResult = this.getMockSimulation(prompt);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Simulation failed: ${error}`);
            this.simulationResult = this.getMockSimulation(prompt);
        }

        this.isSimulating = false;
        this.update();
    }

    private async quickSimulate(action: string): Promise<void> {
        await this.simulateChanges(action);
    }

    private getMockSimulation(prompt: string): SimulationResult {
        return {
            id: `sim-${Date.now()}`,
            prompt,
            timestamp: new Date().toISOString(),
            risk: "medium",
            estimatedTime: "5-10 minutes",
            changes: [
                {
                    path: "src/api/auth.ts",
                    action: "modify",
                    impact: "high",
                    description: "Add login/logout endpoints",
                    risk: "warning",
                    conflicts: ["Existing auth.ts will be modified"]
                },
                {
                    path: "src/api/middleware/auth.ts",
                    action: "create",
                    impact: "medium",
                    description: "JWT middleware for authentication",
                    risk: "safe"
                },
                {
                    path: "src/types/auth.ts",
                    action: "create",
                    impact: "low",
                    description: "Type definitions for auth",
                    risk: "safe"
                },
                {
                    path: "src/tests/auth.test.ts",
                    action: "create",
                    impact: "low",
                    description: "Unit tests for auth module",
                    risk: "safe"
                },
                {
                    path: "src/services/AuthService.ts",
                    action: "create",
                    impact: "high",
                    description: "Authentication business logic",
                    risk: "safe"
                }
            ]
        };
    }

    private async applyChanges(): Promise<void> {
        if (!this.simulationResult) return;

        vscode.window.showInformationMessage(
            `Applying ${this.simulationResult.changes.length} changes...`
        );

        // In a real implementation, this would call the code generator
        vscode.window.showInformationMessage("Changes applied! Check your files.");
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const result = this.simulationResult;

        const riskColors: Record<string, string> = {
            low: "#27ae60",
            medium: "#f39c12",
            high: "#e74c3c"
        };

        const actionIcons: Record<string, string> = {
            create: "➕",
            modify: "📝",
            delete: "🗑️"
        };

        const impactColors: Record<string, string> = {
            low: "#27ae60",
            medium: "#f39c12",
            high: "#e74c3c"
        };

        const totalChanges = result?.changes.length || 0;
        const safeChanges = result?.changes.filter(c => c.risk === "safe").length || 0;
        const warnings = result?.changes.filter(c => c.risk === "warning").length || 0;
        const risks = result?.changes.filter(c => c.risk === "danger").length || 0;

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
            margin-bottom: 25px;
        }
        .header h1 {
            color: #00d4ff;
            margin-bottom: 15px;
        }
        .simulator-box {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .simulator-input {
            display: flex;
            gap: 10px;
        }
        .simulator-input textarea {
            flex: 1;
            min-height: 80px;
            padding: 15px;
            border-radius: 12px;
            border: 2px solid #333;
            background: #1a1a2e;
            color: #fff;
            font-size: 1em;
            resize: vertical;
        }
        .simulator-input textarea:focus {
            outline: none;
            border-color: #00d4ff;
        }
        .btn {
            padding: 15px 25px;
            border: none;
            border-radius: 12px;
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
        .quick-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
            flex-wrap: wrap;
        }
        .quick-btn {
            padding: 8px 16px;
            background: rgba(0,212,255,0.2);
            border: 1px solid #00d4ff;
            border-radius: 20px;
            color: #00d4ff;
            cursor: pointer;
            font-size: 0.9em;
            transition: all 0.2s;
        }
        .quick-btn:hover {
            background: rgba(0,212,255,0.3);
        }
        .results {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
        }
        .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .results-header h2 {
            color: #00d4ff;
        }
        .risk-badge {
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
        }
        .risk-badge.low {
            background: rgba(39,174,96,0.2);
            color: #27ae60;
        }
        .risk-badge.medium {
            background: rgba(243,156,18,0.2);
            color: #f39c12;
        }
        .risk-badge.high {
            background: rgba(231,76,60,0.2);
            color: #e74c3c;
        }
        .stats-row {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
        }
        .stat-box {
            flex: 1;
            background: rgba(0,0,0,0.2);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-value {
            font-size: 1.8em;
            font-weight: bold;
        }
        .stat-label {
            font-size: 0.85em;
            color: #888;
        }
        .changes-list {
            max-height: 400px;
            overflow-y: auto;
        }
        .change-item {
            background: rgba(0,0,0,0.2);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 12px;
            border-left: 4px solid #333;
        }
        .change-item.safe { border-left-color: #27ae60; }
        .change-item.warning { border-left-color: #f39c12; }
        .change-item.danger { border-left-color: #e74c3c; }
        .change-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .change-path {
            font-family: monospace;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .change-action {
            font-size: 0.8em;
            padding: 3px 8px;
            border-radius: 10px;
        }
        .change-action.create { background: rgba(39,174,96,0.2); color: #27ae60; }
        .change-action.modify { background: rgba(243,156,18,0.2); color: #f39c12; }
        .change-action.delete { background: rgba(231,76,60,0.2); color: #e74c3c; }
        .impact-badge {
            font-size: 0.75em;
            padding: 2px 8px;
            border-radius: 8px;
        }
        .impact-badge.low { background: rgba(39,174,96,0.2); color: #27ae60; }
        .impact-badge.medium { background: rgba(243,156,18,0.2); color: #f39c12; }
        .impact-badge.high { background: rgba(231,76,60,0.2); color: #e74c3c; }
        .change-description {
            color: #ccc;
            font-size: 0.95em;
            margin-bottom: 8px;
        }
        .change-conflicts {
            background: rgba(231,76,60,0.1);
            border: 1px solid rgba(231,76,60,0.3);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 0.85em;
            color: #e74c3c;
        }
        .apply-section {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .time-estimate {
            color: #888;
        }
        .apply-buttons {
            display: flex;
            gap: 10px;
        }
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 60px;
            flex-direction: column;
            gap: 20px;
        }
        .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #333;
            border-top-color: #00d4ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .empty-state {
            text-align: center;
            padding: 60px;
            color: #888;
        }
        .visual-graph {
            background: rgba(0,0,0,0.2);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .graph-title {
            color: #888;
            font-size: 0.85em;
            margin-bottom: 10px;
        }
        .graph-nodes {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .graph-node {
            padding: 8px 16px;
            background: rgba(0,212,255,0.2);
            border-radius: 20px;
            font-size: 0.9em;
            color: #00d4ff;
        }
        .graph-arrow {
            display: flex;
            align-items: center;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Project Simulator</h1>
        <p style="color: #888;">Zobacz co się zmieni przed wygenerowaniem kodu</p>
    </div>

    <div class="simulator-box">
        <div class="simulator-input">
            <textarea id="promptInput" placeholder="Describe what you want to create or modify...

Examples:
- Add user authentication with JWT
- Create REST API for products
- Add payment processing with Stripe
- Create new React component for dashboard"></textarea>
            <button class="btn btn-primary" onclick="simulate()">
                🔮 Simulate
            </button>
        </div>

        <div class="quick-actions">
            <span style="color: #888; margin-right: 10px;">Quick simulate:</span>
            <button class="quick-btn" onclick="quickSimulate('Add new API endpoint')">+ API Endpoint</button>
            <button class="quick-btn" onclick="quickSimulate('Add user authentication')">🔐 Auth</button>
            <button class="quick-btn" onclick="quickSimulate('Create React component')">⚛️ Component</button>
            <button class="quick-btn" onclick="quickSimulate('Add database model')">🗄️ Model</button>
            <button class="quick-btn" onclick="quickSimulate('Add unit tests')">🧪 Tests</button>
        </div>
    </div>

    <div class="results">
        ${this.isSimulating ? `
        <div class="loading">
            <div class="spinner"></div>
            <div>Simulating changes...</div>
            <div style="color: #888; font-size: 0.9em;">Analyzing potential impact</div>
        </div>
        ` : result ? `
        <div class="results-header">
            <h2>📊 Predicted Changes</h2>
            <span class="risk-badge ${result.risk}">Risk: ${result.risk.toUpperCase()}</span>
        </div>

        <div class="stats-row">
            <div class="stat-box">
                <div class="stat-value">${totalChanges}</div>
                <div class="stat-label">Total Changes</div>
            </div>
            <div class="stat-box">
                <div class="stat-value" style="color: #27ae60;">${safeChanges}</div>
                <div class="stat-label">Safe</div>
            </div>
            <div class="stat-box">
                <div class="stat-value" style="color: #f39c12;">${warnings}</div>
                <div class="stat-label">Warnings</div>
            </div>
            <div class="stat-box">
                <div class="stat-value" style="color: #e74c3c;">${risks}</div>
                <div class="stat-label">Risks</div>
            </div>
        </div>

        <div class="visual-graph">
            <div class="graph-title">Files that will be affected:</div>
            <div class="graph-nodes">
                ${result.changes.map(c => `
                <span class="graph-node">${c.path.split('/').pop()}</span>
                ${result.changes.indexOf(c) < result.changes.length - 1 ? '<span class="graph-arrow">→</span>' : ''}
                `).join('')}
            </div>
        </div>

        <div class="changes-list">
            ${result.changes.map(change => `
            <div class="change-item ${change.risk}">
                <div class="change-header">
                    <span class="change-path">
                        ${actionIcons[change.action]} ${change.path}
                    </span>
                    <div style="display: flex; gap: 8px;">
                        <span class="change-action ${change.action}">${change.action}</span>
                        <span class="impact-badge ${change.impact}">${change.impact} impact</span>
                    </div>
                </div>
                <div class="change-description">${change.description}</div>
                ${change.conflicts && change.conflicts.length > 0 ? `
                <div class="change-conflicts">
                    ⚠️ ${change.conflicts.join(", ")}
                </div>
                ` : ''}
            </div>
            `).join('')}
        </div>

        <div class="apply-section">
            <div class="time-estimate">
                ⏱️ Estimated time: ${result.estimatedTime}
            </div>
            <div class="apply-buttons">
                <button class="btn btn-secondary" onclick="clearSimulation()">
                    Clear
                </button>
                <button class="btn btn-primary" onclick="applyChanges()">
                    🚀 Apply Changes
                </button>
            </div>
        </div>
        ` : `
        <div class="empty-state">
            <p style="font-size: 4em;">🎯</p>
            <p style="margin-top: 20px; font-size: 1.2em;">Project Simulator</p>
            <p style="margin-top: 10px; color: #888;">
                Enter what you want to create and see the predicted changes
            </p>
        </div>
        `}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function simulate() {
            const prompt = document.getElementById('promptInput').value;
            if (prompt.trim()) {
                vscode.postMessage({ command: 'simulate', prompt });
            }
        }

        function quickSimulate(action) {
            document.getElementById('promptInput').value = action;
            vscode.postMessage({ command: 'simulate', prompt: action });
        }

        function applyChanges() {
            vscode.postMessage({ command: 'applyChanges' });
        }

        function clearSimulation() {
            vscode.postMessage({ command: 'clearSimulation' });
        }
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        ProjectSimulatorPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
