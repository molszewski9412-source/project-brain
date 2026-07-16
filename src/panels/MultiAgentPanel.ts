/**
 * MultiAgentPanel - FAZA 15
 * Równoczesna praca wielu agentów AI
 */

import * as vscode from "vscode";
import { OllamaClient } from "../ai/OllamaClient";
import { BrainStore } from "../storage/BrainStore";

export interface Agent {
    id: string;
    name: string;
    role: "architect" | "backend" | "frontend" | "reviewer" | "tester" | "optimizer";
    status: "idle" | "working" | "done" | "error";
    progress: number;
    currentTask: string;
    output: string;
    model: string;
}

export class MultiAgentPanel {
    public static currentPanel: MultiAgentPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private ollama: OllamaClient;
    private agents: Agent[] = [];
    private isRunning: boolean = false;

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.ollama = new OllamaClient();
        this.initAgents();
        this.setupMessageHandler();
        this.update();
    }

    public static createOrShow(): MultiAgentPanel {
        if (MultiAgentPanel.currentPanel) {
            MultiAgentPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return MultiAgentPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "multiAgent",
            "🤖 Multi Agent",
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        MultiAgentPanel.currentPanel = new MultiAgentPanel(panel);
        return MultiAgentPanel.currentPanel;
    }

    private initAgents(): void {
        this.agents = [
            {
                id: "architect",
                name: "Architect",
                role: "architect",
                status: "idle",
                progress: 0,
                currentTask: "Waiting...",
                output: "",
                model: "llama3"
            },
            {
                id: "backend",
                name: "Backend Dev",
                role: "backend",
                status: "idle",
                progress: 0,
                currentTask: "Waiting...",
                output: "",
                model: "codellama"
            },
            {
                id: "frontend",
                name: "Frontend Dev",
                role: "frontend",
                status: "idle",
                progress: 0,
                currentTask: "Waiting...",
                output: "",
                model: "mistral"
            },
            {
                id: "reviewer",
                name: "Code Reviewer",
                role: "reviewer",
                status: "idle",
                progress: 0,
                currentTask: "Waiting...",
                output: "",
                model: "llama3"
            },
            {
                id: "tester",
                name: "Tester",
                role: "tester",
                status: "idle",
                progress: 0,
                currentTask: "Waiting...",
                output: "",
                model: "codellama"
            },
            {
                id: "optimizer",
                name: "Optimizer",
                role: "optimizer",
                status: "idle",
                progress: 0,
                currentTask: "Waiting...",
                output: "",
                model: "mistral"
            }
        ];
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "startAll":
                    await this.startAllAgents();
                    break;
                case "stopAll":
                    this.stopAllAgents();
                    break;
                case "startAgent":
                    await this.startAgent(msg.agentId);
                    break;
                case "stopAgent":
                    this.stopAgent(msg.agentId);
                    break;
                case "resetAgent":
                    this.resetAgent(msg.agentId);
                    break;
                case "configureAgent":
                    this.configureAgent(msg.agentId, msg.config);
                    break;
            }
        });
    }

    private async startAllAgents(): Promise<void> {
        this.isRunning = true;
        
        // Start all agents in parallel
        const promises = this.agents.map(agent => this.runAgent(agent.id));
        await Promise.all(promises);

        this.isRunning = false;
        this.update();
        vscode.window.showInformationMessage("All agents completed!");
    }

    private async startAgent(agentId: string): Promise<void> {
        await this.runAgent(agentId);
    }

    private async runAgent(agentId: string): Promise<void> {
        const agent = this.agents.find(a => a.id === agentId);
        if (!agent) return;

        agent.status = "working";
        this.update();

        const brain = this.store.getBrain();
        const modules = this.store.getModules();

        let prompt = "";
        
        switch (agent.role) {
            case "architect":
                prompt = `You are the Architect Agent. Design the system architecture.

Project: ${brain?.projectName || "My Project"}
Description: ${brain?.description || ""}
Tech Stack: ${(brain?.technologyStack || []).join(", ")}

Modules:
${modules.map(m => `- ${m.name}: ${m.description}`).join("\n")}

Your task:
1. Define the overall architecture
2. Design module interactions
3. Create data flow diagrams
4. Define API contracts
5. Suggest technology choices

Output your complete architectural design.`;
                agent.currentTask = "Designing architecture...";
                break;

            case "backend":
                prompt = `You are the Backend Developer Agent. Implement backend code.

Project: ${brain?.projectName || "My Project"}
Modules: ${modules.map(m => m.name).join(", ")}

Your task:
1. Create REST API endpoints
2. Implement business logic
3. Add database models
4. Include error handling
5. Write middleware

Generate clean, production-ready code.`;
                agent.currentTask = "Writing backend code...";
                break;

            case "frontend":
                prompt = `You are the Frontend Developer Agent. Implement UI components.

Project: ${brain?.projectName || "My Project"}

Your task:
1. Create React/Vue components
2. Implement state management
3. Add routing
4. Style with modern CSS
5. Include responsive design

Generate clean, component-based code.`;
                agent.currentTask = "Building UI components...";
                break;

            case "reviewer":
                prompt = `You are the Code Reviewer Agent. Review code quality.

Project: ${brain?.projectName || "My Project"}

Your task:
1. Check code style
2. Identify bugs
3. Suggest improvements
4. Review security
5. Check performance

Provide detailed review with specific recommendations.`;
                agent.currentTask = "Reviewing code...";
                break;

            case "tester":
                prompt = `You are the Tester Agent. Create comprehensive tests.

Project: ${brain?.projectName || "My Project"}

Your task:
1. Write unit tests
2. Create integration tests
3. Add e2e tests
4. Generate test data
5. Set up test coverage

Use Jest/Mocha framework. Generate complete test suites.`;
                agent.currentTask = "Writing tests...";
                break;

            case "optimizer":
                prompt = `You are the Optimizer Agent. Improve performance.

Project: ${brain?.projectName || "My Project"}

Your task:
1. Analyze performance bottlenecks
2. Suggest database optimizations
3. Improve caching strategies
4. Optimize queries
5. Reduce bundle size

Provide specific, actionable optimizations.`;
                agent.currentTask = "Optimizing performance...";
                break;
        }

        try {
            // Simulate work with progress updates
            for (let i = 0; i <= 100; i += 20) {
                if (!this.isRunning && agent.status === "working") break;
                agent.progress = i;
                this.update();
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const result = await this.ollama.ask(prompt);
            agent.output = result.content || "Task completed";
            agent.progress = 100;
            agent.status = "done";
            agent.currentTask = "Completed";
        } catch (error) {
            agent.status = "error";
            agent.output = `Error: ${error}`;
        }

        this.update();
    }

    private stopAllAgents(): void {
        this.isRunning = false;
        this.agents.forEach(agent => {
            if (agent.status === "working") {
                agent.status = "idle";
                agent.progress = 0;
                agent.currentTask = "Stopped";
            }
        });
        this.update();
        vscode.window.showInformationMessage("All agents stopped");
    }

    private stopAgent(agentId: string): void {
        const agent = this.agents.find(a => a.id === agentId);
        if (agent && agent.status === "working") {
            agent.status = "idle";
            agent.progress = 0;
            agent.currentTask = "Stopped";
            this.update();
        }
    }

    private resetAgent(agentId: string): void {
        const agent = this.agents.find(a => a.id === agentId);
        if (agent) {
            agent.status = "idle";
            agent.progress = 0;
            agent.currentTask = "Waiting...";
            agent.output = "";
            this.update();
        }
    }

    private configureAgent(agentId: string, config: any): void {
        const agent = this.agents.find(a => a.id === agentId);
        if (agent && config.model) {
            agent.model = config.model;
            this.update();
        }
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const roleIcons: Record<string, string> = {
            architect: "🏗️",
            backend: "⚙️",
            frontend: "🎨",
            reviewer: "🔍",
            tester: "🧪",
            optimizer: "⚡"
        };

        const statusColors: Record<string, string> = {
            idle: "#888",
            working: "#3498db",
            done: "#27ae60",
            error: "#e74c3c"
        };

        const roleColors: Record<string, string> = {
            architect: "#9b59b6",
            backend: "#3498db",
            frontend: "#e74c3c",
            reviewer: "#f39c12",
            tester: "#27ae60",
            optimizer: "#00d4ff"
        };

        const workingCount = this.agents.filter(a => a.status === "working").length;
        const doneCount = this.agents.filter(a => a.status === "done").length;

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
        .actions {
            display: flex;
            gap: 10px;
        }
        .btn {
            padding: 12px 25px;
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
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        .btn-secondary {
            background: #333;
            color: #fff;
        }
        .stats-bar {
            display: flex;
            gap: 20px;
            margin-bottom: 25px;
            padding: 15px;
            background: #16213e;
            border-radius: 12px;
        }
        .stat {
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
        }
        .stat-label {
            font-size: 0.85em;
            color: #888;
        }
        .agents-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }
        .agent-card {
            background: #16213e;
            border-radius: 16px;
            overflow: hidden;
            transition: all 0.3s;
        }
        .agent-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .agent-header {
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .agent-avatar {
            width: 50px;
            height: 50px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5em;
        }
        .agent-info {
            flex: 1;
        }
        .agent-name {
            font-weight: bold;
            font-size: 1.1em;
        }
        .agent-role {
            font-size: 0.85em;
            color: #888;
            text-transform: uppercase;
        }
        .agent-status {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .agent-body {
            padding: 20px;
        }
        .agent-task {
            margin-bottom: 15px;
        }
        .task-label {
            font-size: 0.85em;
            color: #888;
            margin-bottom: 5px;
        }
        .task-value {
            font-weight: bold;
        }
        .progress-bar {
            height: 8px;
            background: #333;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }
        .progress-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s;
        }
        .progress-fill.working {
            background: linear-gradient(90deg, #3498db, #00d4ff);
            animation: progress-animation 1s infinite;
        }
        .progress-fill.done {
            background: #27ae60;
        }
        .progress-fill.error {
            background: #e74c3c;
        }
        @keyframes progress-animation {
            0% { background-position: 0% 50%; }
            100% { background-position: 100% 50%; }
        }
        .agent-actions {
            display: flex;
            gap: 8px;
            margin-top: 15px;
        }
        .agent-actions button {
            flex: 1;
            padding: 8px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85em;
            transition: all 0.2s;
        }
        .btn-start {
            background: #27ae60;
            color: white;
        }
        .btn-stop {
            background: #e74c3c;
            color: white;
        }
        .btn-reset {
            background: #333;
            color: white;
        }
        .agent-output {
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
            padding: 15px;
            margin-top: 15px;
            max-height: 200px;
            overflow-y: auto;
        }
        .output-label {
            font-size: 0.85em;
            color: #888;
            margin-bottom: 10px;
        }
        .output-content {
            font-family: monospace;
            font-size: 0.85em;
            white-space: pre-wrap;
            color: #ccc;
        }
        .model-select {
            padding: 6px 12px;
            border-radius: 6px;
            background: #333;
            color: white;
            border: 1px solid #555;
            font-size: 0.85em;
        }
        .running-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #27ae60;
            animation: pulse 1s infinite;
            margin-right: 5px;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>🤖 Multi Agent Orchestra</h1>
            ${this.isRunning ? '<span class="running-indicator"></span> Running...' : ''}
        </div>
        <div class="actions">
            <button class="btn btn-primary" onclick="startAll()" ${this.isRunning ? 'disabled' : ''}>
                🚀 Start All
            </button>
            <button class="btn btn-danger" onclick="stopAll()" ${!this.isRunning ? 'disabled' : ''}>
                ⏹️ Stop All
            </button>
        </div>
    </div>

    <div class="stats-bar">
        <div class="stat">
            <div class="stat-value">${this.agents.length}</div>
            <div class="stat-label">Total Agents</div>
        </div>
        <div class="stat">
            <div class="stat-value" style="color: #3498db;">${workingCount}</div>
            <div class="stat-label">Working</div>
        </div>
        <div class="stat">
            <div class="stat-value" style="color: #27ae60;">${doneCount}</div>
            <div class="stat-label">Completed</div>
        </div>
        <div class="stat">
            <div class="stat-value" style="color: #888;">
                ${this.agents.filter(a => a.status === "idle").length}
            </div>
            <div class="stat-label">Idle</div>
        </div>
    </div>

    <div class="agents-grid">
        ${this.agents.map(agent => `
        <div class="agent-card">
            <div class="agent-header">
                <div class="agent-avatar" style="background: ${roleColors[agent.role]}20; color: ${roleColors[agent.role]};">
                    ${roleIcons[agent.role]}
                </div>
                <div class="agent-info">
                    <div class="agent-name">${agent.name}</div>
                    <div class="agent-role" style="color: ${roleColors[agent.role]};">${agent.role}</div>
                </div>
                <div>
                    <span class="agent-status" style="background: ${statusColors[agent.status]}20; color: ${statusColors[agent.status]};">
                        ${agent.status.toUpperCase()}
                    </span>
                </div>
            </div>
            <div class="agent-body">
                <div class="agent-task">
                    <div class="task-label">Current Task</div>
                    <div class="task-value">${agent.currentTask}</div>
                </div>

                <div class="task-label">Progress</div>
                <div class="progress-bar">
                    <div class="progress-fill ${agent.status}" 
                         style="width: ${agent.progress}%; background: ${statusColors[agent.status]};"></div>
                </div>
                <div style="text-align: right; font-size: 0.85em; color: #888; margin-top: 5px;">
                    ${agent.progress}%
                </div>

                <div class="agent-actions">
                    ${agent.status === "working" ? `
                    <button class="btn-stop" onclick="stopAgent('${agent.id}')">⏹ Stop</button>
                    ` : `
                    <button class="btn-start" onclick="startAgent('${agent.id}')">▶️ Start</button>
                    `}
                    <button class="btn-reset" onclick="resetAgent('${agent.id}')">🔄 Reset</button>
                </div>

                ${agent.output ? `
                <div class="agent-output">
                    <div class="output-label">Output</div>
                    <div class="output-content">${agent.output.substring(0, 500)}${agent.output.length > 500 ? '...' : ''}</div>
                </div>
                ` : ''}
            </div>
        </div>
        `).join('')}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function startAll() {
            vscode.postMessage({ command: 'startAll' });
        }

        function stopAll() {
            vscode.postMessage({ command: 'stopAll' });
        }

        function startAgent(agentId) {
            vscode.postMessage({ command: 'startAgent', agentId });
        }

        function stopAgent(agentId) {
            vscode.postMessage({ command: 'stopAgent', agentId });
        }

        function resetAgent(agentId) {
            vscode.postMessage({ command: 'resetAgent', agentId });
        }

        function configureAgent(agentId, config) {
            vscode.postMessage({ command: 'configureAgent', agentId, config });
        }
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        MultiAgentPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
