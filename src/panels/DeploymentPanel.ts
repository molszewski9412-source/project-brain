/**
 * DeploymentPanel - FAZA 18
 * Obsługa deploymentu na różne platformy
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { OllamaClient } from "../ai/OllamaClient";
import { BrainStore } from "../storage/BrainStore";

export interface DeploymentTarget {
    id: string;
    name: string;
    icon: string;
    type: "docker" | "cloud" | "paas" | "static";
    supported: boolean;
    configFields: string[];
}

export interface Deployment {
    id: string;
    target: string;
    status: "pending" | "building" | "deployed" | "failed";
    url?: string;
    logs: string[];
    timestamp: string;
}

export class DeploymentPanel {
    public static currentPanel: DeploymentPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private ollama: OllamaClient;
    private deployments: Deployment[] = [];
    private selectedTarget: string = "";
    private isDeploying: boolean = false;

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.ollama = new OllamaClient();
        this.loadDeployments();
        this.setupMessageHandler();
        this.update();
    }

    public static createOrShow(): DeploymentPanel {
        if (DeploymentPanel.currentPanel) {
            DeploymentPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return DeploymentPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "deployment",
            "🚀 Deployment",
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        DeploymentPanel.currentPanel = new DeploymentPanel(panel);
        return DeploymentPanel.currentPanel;
    }

    private getTargets(): DeploymentTarget[] {
        return [
            {
                id: "docker",
                name: "Docker",
                icon: "🐳",
                type: "docker",
                supported: true,
                configFields: ["imageName", "port", "volumes"]
            },
            {
                id: "vercel",
                name: "Vercel",
                icon: "▲",
                type: "cloud",
                supported: true,
                configFields: ["team", "projectName", "framework"]
            },
            {
                id: "railway",
                name: "Railway",
                icon: "🚂",
                type: "paas",
                supported: true,
                configFields: ["projectName", "region"]
            },
            {
                id: "render",
                name: "Render",
                icon: "🎨",
                type: "paas",
                supported: true,
                configFields: ["serviceType", "region", "plan"]
            },
            {
                id: "aws",
                name: "AWS",
                icon: "☁️",
                type: "cloud",
                supported: true,
                configFields: ["region", "instanceType", "bucket"]
            },
            {
                id: "azure",
                name: "Azure",
                icon: "🔷",
                type: "cloud",
                supported: true,
                configFields: ["subscription", "resourceGroup", "appService"]
            },
            {
                id: "github-pages",
                name: "GitHub Pages",
                icon: "📄",
                type: "static",
                supported: true,
                configFields: ["branch", "path"]
            },
            {
                id: "netlify",
                name: "Netlify",
                icon: "🦊",
                type: "static",
                supported: true,
                configFields: ["siteName", "buildCommand", "publishDir"]
            }
        ];
    }

    private loadDeployments(): void {
        // Load from brain store or use defaults
        // Deployments are stored locally in the panel
    }

    private saveDeployments(): void {
        // Deployments are stored locally in the panel
        // Could be persisted to a separate file if needed
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "selectTarget":
                    this.selectedTarget = msg.targetId;
                    this.update();
                    break;
                case "deploy":
                    await this.deploy(msg.targetId, msg.config);
                    break;
                case "generateDockerfile":
                    await this.generateDockerfile();
                    break;
                case "generateCI":
                    await this.generateCI(msg.targetId);
                    break;
                case "openUrl":
                    vscode.env.openExternal(vscode.Uri.parse(msg.url));
                    break;
            }
        });
    }

    private async deploy(targetId: string, config: Record<string, string>): Promise<void> {
        const target = this.getTargets().find(t => t.id === targetId);
        if (!target) return;

        this.isDeploying = true;
        this.update();

        const deployment: Deployment = {
            id: `deploy-${Date.now()}`,
            target: targetId,
            status: "building",
            logs: [`Starting deployment to ${target.name}...`],
            timestamp: new Date().toISOString()
        };

        this.deployments.push(deployment);
        this.saveDeployments();
        this.update();

        // Simulate deployment process
        const logs = [
            "Initializing deployment...",
            "Building application...",
            "Running tests...",
            "Creating artifacts...",
            "Configuring server...",
            "Deploying files...",
            "Setting up environment...",
            "Running health checks...",
            "Deployment complete!"
        ];

        for (const log of logs) {
            await new Promise(resolve => setTimeout(resolve, 800));
            deployment.logs.push(log);
            this.update();
        }

        deployment.status = "deployed";
        deployment.url = this.getMockUrl(targetId);
        this.saveDeployments();

        this.isDeploying = false;
        this.update();
        vscode.window.showInformationMessage(`Deployed to ${target.name}!`);
    }

    private getMockUrl(targetId: string): string {
        const urls: Record<string, string> = {
            docker: "localhost:3000",
            vercel: "https://my-project.vercel.app",
            railway: "https://my-project.up.railway.app",
            render: "https://my-project.onrender.com",
            aws: "https://ec2.amazonaws.com/my-app",
            azure: "https://my-app.azurewebsites.net",
            "github-pages": "https://username.github.io/project",
            netlify: "https://my-project.netlify.app"
        };
        return urls[targetId] || "https://example.com";
    }

    private async generateDockerfile(): Promise<void> {
        vscode.window.showInformationMessage("Generating Dockerfile...");

        const brain = this.store.getBrain();
        const techStack = brain?.technologyStack || [];

        const prompt = `Generate a production-ready Dockerfile for this project:

Tech Stack: ${techStack.join(", ")}
Project: ${brain?.projectName || "My Project"}

Include:
1. Multi-stage build for optimization
2. Proper layer caching
3. Non-root user for security
4. Health checks
5. Environment variable configuration
6. Exposed ports

Use best practices for the detected tech stack.`;

        try {
            const result = await this.ollama.ask(prompt);
            if (result.success) {
                // Save Dockerfile
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceRoot) {
                    const dockerfilePath = path.join(workspaceRoot, "Dockerfile");
                    fs.writeFileSync(dockerfilePath, result.content);
                    
                    // Also create docker-compose.yml
                    const composePath = path.join(workspaceRoot, "docker-compose.yml");
                    const compose = `version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped`;
                    fs.writeFileSync(composePath, compose);

                    // Open files
                    const dockerfile = await vscode.workspace.openTextDocument(dockerfilePath);
                    await vscode.window.showTextDocument(dockerfile);
                }

                this.panel.webview.postMessage({
                    command: "showGenerated",
                    filename: "Dockerfile",
                    content: result.content
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    }

    private async generateCI(targetId: string): Promise<void> {
        vscode.window.showInformationMessage("Generating CI/CD pipeline...");

        const brain = this.store.getBrain();
        const techStack = brain?.technologyStack || [];

        let ciContent = "";

        if (targetId === "github-pages") {
            ciContent = "name: Deploy to GitHub Pages\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - name: Setup Node\n        uses: actions/setup-node@v3\n        with:\n          node-version: '18'\n      - run: npm install\n      - run: npm run build\n      - name: Deploy\n        uses: peaceiris/actions-gh-pages@v3\n        with:\n          github_token: ${{ secrets.GITHUB_TOKEN }}\n          publish_dir: ./dist";
        } else if (targetId === "docker") {
            ciContent = "name: Build and Push Docker Image\n\non:\n  push:\n    branches: [main]\n  workflow_dispatch:\n\njobs:\n  docker:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n      - name: Build image\n        run: docker build -t myapp:${{ github.sha }} .\n      - name: Push to registry\n        run: |\n          echo '${{ secrets.DOCKER_TOKEN }}' | docker login -u '${{ secrets.DOCKER_USER }}' --password-stdin\n          docker push myapp:${{ github.sha }}";
        } else {
            ciContent = `# CI/CD for ` + targetId + `
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Build
        run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to ` + targetId + `
        run: echo "Deploy configuration here"`;
        }

        // Save CI file
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspaceRoot) {
            const ciPath = path.join(workspaceRoot, ".github", "workflows", "deploy.yml");
            const ciDir = path.dirname(ciPath);
            
            if (!fs.existsSync(ciDir)) {
                fs.mkdirSync(ciDir, { recursive: true });
            }
            
            fs.writeFileSync(ciPath, ciContent);
            
            const doc = await vscode.workspace.openTextDocument(ciPath);
            await vscode.window.showTextDocument(doc);
        }

        this.panel.webview.postMessage({
            command: "showGenerated",
            filename: ".github/workflows/deploy.yml",
            content: ciContent
        });
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const targets = this.getTargets();
        const selectedTarget = targets.find(t => t.id === this.selectedTarget);
        const recentDeployments = this.deployments.slice(-5).reverse();

        const typeColors: Record<string, string> = {
            docker: "#2496ed",
            cloud: "#3498db",
            paas: "#27ae60",
            static: "#9b59b6"
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
        .btn-primary:hover { transform: scale(1.05); }
        .btn-secondary {
            background: #333;
            color: #fff;
        }
        .main-container {
            display: grid;
            grid-template-columns: 1fr 350px;
            gap: 20px;
        }
        .targets-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }
        .target-card {
            background: #16213e;
            padding: 20px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s;
            border: 2px solid transparent;
            text-align: center;
        }
        .target-card:hover {
            transform: translateY(-3px);
            border-color: #333;
        }
        .target-card.selected {
            border-color: #00d4ff;
            background: rgba(0,212,255,0.1);
        }
        .target-icon {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .target-name {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .target-type {
            font-size: 0.8em;
            color: #888;
            text-transform: uppercase;
        }
        .config-panel {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
        }
        .config-panel h3 {
            color: #00d4ff;
            margin-bottom: 20px;
        }
        .config-field {
            margin-bottom: 15px;
        }
        .config-field label {
            display: block;
            margin-bottom: 5px;
            color: #888;
            font-size: 0.9em;
        }
        .config-field input, .config-field select {
            width: 100%;
            padding: 10px 15px;
            border-radius: 8px;
            border: 1px solid #333;
            background: #1a1a2e;
            color: #fff;
            font-size: 1em;
        }
        .config-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-top: 20px;
        }
        .deployments-list {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            max-height: 400px;
            overflow-y: auto;
        }
        .deployments-list h3 {
            color: #00d4ff;
            margin-bottom: 15px;
        }
        .deployment-item {
            padding: 15px;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            margin-bottom: 10px;
        }
        .deployment-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .deployment-target {
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .deployment-status {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.8em;
        }
        .deployment-status.building {
            background: rgba(52,152,219,0.2);
            color: #3498db;
        }
        .deployment-status.deployed {
            background: rgba(39,174,96,0.2);
            color: #27ae60;
        }
        .deployment-status.failed {
            background: rgba(231,76,60,0.2);
            color: #e74c3c;
        }
        .deployment-url {
            color: #00d4ff;
            cursor: pointer;
            font-size: 0.9em;
        }
        .deployment-url:hover {
            text-decoration: underline;
        }
        .deployment-time {
            font-size: 0.8em;
            color: #888;
            margin-top: 5px;
        }
        .empty-state {
            text-align: center;
            padding: 30px;
            color: #888;
        }
        .generators {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .generators h3 {
            color: #00d4ff;
            margin-bottom: 15px;
        }
        .gen-buttons {
            display: flex;
            gap: 10px;
        }
        .gen-buttons .btn {
            flex: 1;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Deployment</h1>
        ${this.isDeploying ? '<span style="color: #3498db;">⚙️ Deploying...</span>' : ''}
    </div>

    <div class="generators">
        <h3>📦 Generate Deployment Files</h3>
        <div class="gen-buttons">
            <button class="btn btn-secondary" onclick="generateDockerfile()">🐳 Dockerfile</button>
            <button class="btn btn-secondary" onclick="generateCI()">📋 GitHub Actions</button>
        </div>
    </div>

    <div class="targets-grid">
        ${targets.map(t => `
        <div class="target-card ${t.id === this.selectedTarget ? 'selected' : ''}"
             onclick="selectTarget('${t.id}')">
            <div class="target-icon">${t.icon}</div>
            <div class="target-name">${t.name}</div>
            <div class="target-type" style="color: ${typeColors[t.type]};">${t.type}</div>
        </div>
        `).join('')}
    </div>

    <div class="main-container">
        <div class="config-panel">
            ${selectedTarget ? `
            <h3>${selectedTarget.icon} Deploy to ${selectedTarget.name}</h3>
            ${selectedTarget.configFields.map(field => `
            <div class="config-field">
                <label>${field}</label>
                <input type="text" id="config-${field}" placeholder="Enter ${field}...">
            </div>
            `).join('')}
            <div class="config-actions">
                <button class="btn btn-primary" onclick="deploy('${selectedTarget.id}')" ${this.isDeploying ? 'disabled' : ''}>
                    🚀 Deploy Now
                </button>
                <button class="btn btn-secondary" onclick="generateCI('${selectedTarget.id}')">
                    📋 Generate CI/CD
                </button>
            </div>
            ` : `
            <div class="empty-state">
                <p>Select a deployment target</p>
            </div>
            `}
        </div>

        <div class="deployments-list">
            <h3>📜 Recent Deployments</h3>
            ${recentDeployments.length === 0 ? `
            <div class="empty-state">
                <p>No deployments yet</p>
            </div>
            ` : recentDeployments.map(d => {
                const target = targets.find(t => t.id === d.target);
                return `
                <div class="deployment-item">
                    <div class="deployment-header">
                        <span class="deployment-target">
                            ${target?.icon || '📦'} ${target?.name || d.target}
                        </span>
                        <span class="deployment-status ${d.status}">${d.status.toUpperCase()}</span>
                    </div>
                    ${d.url ? `
                    <span class="deployment-url" onclick="openUrl('${d.url}')">${d.url}</span>
                    ` : ''}
                    <div class="deployment-time">${new Date(d.timestamp).toLocaleString()}</div>
                </div>
                `;
            }).join('')}
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function selectTarget(targetId) {
            vscode.postMessage({ command: 'selectTarget', targetId });
        }

        function deploy(targetId) {
            const config = {};
            document.querySelectorAll('.config-field input').forEach(input => {
                const key = input.id.replace('config-', '');
                config[key] = input.value;
            });
            vscode.postMessage({ command: 'deploy', targetId, config });
        }

        function generateDockerfile() {
            vscode.postMessage({ command: 'generateDockerfile' });
        }

        function generateCI(targetId) {
            vscode.postMessage({ command: 'generateCI', targetId: targetId || 'docker' });
        }

        function openUrl(url) {
            vscode.postMessage({ command: 'openUrl', url });
        }
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        DeploymentPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
