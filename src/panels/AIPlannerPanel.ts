/**
 * AIPlannerPanel - FAZA 6
 * Epic → Feature → Module → Task hierarchy visualization
 */

import * as vscode from "vscode";
import { BrainStore } from "../storage/BrainStore";
import { OllamaClient } from "../ai/OllamaClient";
import { BrainEpic, BrainFeature, BrainTask, PlanRequest, PlanResult } from "../models/Hierarchy";

export class AIPlannerPanel {
    public static currentPanel: AIPlannerPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private ollama: OllamaClient;

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.ollama = new OllamaClient();
        this.update();
    }

    public static createOrShow(): AIPlannerPanel {
        if (AIPlannerPanel.currentPanel) {
            AIPlannerPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return AIPlannerPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "aiPlanner",
            "📋 AI Planner",
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        AIPlannerPanel.currentPanel = new AIPlannerPanel(panel);
        AIPlannerPanel.currentPanel.setupMessageHandler();
        return AIPlannerPanel.currentPanel;
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "generatePlan":
                    await this.generatePlan(msg.goal);
                    break;
                case "selectEpic":
                    this.updateWithEpic(msg.epicId);
                    break;
                case "addEpic":
                    await this.addEpic(msg.title, msg.description);
                    break;
                case "addFeature":
                    await this.addFeature(msg.epicId, msg.title, msg.description);
                    break;
                case "addTask":
                    await this.addTask(msg.featureId, msg.title, msg.prompt);
                    break;
                case "refresh":
                    this.update();
                    break;
            }
        });
    }

    private async generatePlan(goal: string): Promise<void> {
        vscode.window.showInformationMessage("🤖 AI tworzy plan projektu...");

        const modules = this.store.getModules();
        const existingModules = modules.map(m => m.name);

        const prompt = `Create a project plan for: "${goal}"

Existing modules: ${existingModules.join(", ") || "None"}

Generate a hierarchical plan:
1. EPICS - Large features/epic stories
2. FEATURES - Smaller deliverables within epics
3. TASKS - Individual implementation tasks

Return JSON:
{
  "epics": [
    {
      "title": "Epic Name",
      "description": "Epic description"
    }
  ],
  "features": [
    {
      "epicTitle": "Epic Name",
      "title": "Feature Name",
      "description": "Feature description",
      "priority": "P1|P2|P3|P4"
    }
  ],
  "tasks": [
    {
      "featureTitle": "Feature Name",
      "title": "Task Name",
      "description": "Task description",
      "prompt": "AI prompt for this task"
    }
  ]
}

Only return JSON.`;

        try {
            const result = await this.ollama.ask(prompt);

            if (!result.success) {
                vscode.window.showErrorMessage("AI Error: " + result.error);
                return;
            }

            // Parse response
            const plan = this.parsePlanResponse(result.content);

            // Create epics
            for (const epic of plan.epics) {
                await this.addEpic(epic.title, epic.description);
            }

            // Create features
            for (const feature of plan.features) {
                const epic = this.store.getEpics().find(e => e.title === (feature as any).epicTitle);
                if (epic) {
                    await this.addFeature(epic.id, feature.title, feature.description);
                }
            }

            // Create tasks
            for (const task of plan.tasks) {
                const feature = this.store.getFeatures().find(f => f.title === (task as any).featureTitle);
                if (feature) {
                    await this.addTask(feature.id, task.title, task.prompt);
                }
            }

            this.store.addRecentChange("Generated project plan", goal);
            this.update();
            vscode.window.showInformationMessage(`✅ Utworzono ${plan.epics.length} epics, ${plan.features.length} features!`);

        } catch (error) {
            vscode.window.showErrorMessage("Error: " + String(error));
        }
    }

    private parsePlanResponse(content: string): PlanResult {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // Fallback
        }

        return {
            epics: [],
            features: [],
            modules: [],
            tasks: []
        };
    }

    private async addEpic(title: string, description: string): Promise<void> {
        (this.store as any).addEpic({
            title,
            description,
            status: "IDEA",
            progress: 0,
            features: []
        });
    }

    private async addFeature(epicId: string, title: string, description: string): Promise<void> {
        (this.store as any).addFeature({
            epicId,
            title,
            description,
            priority: "P2",
            modules: [],
            tasks: [],
            status: "IDEA"
        });
    }

    private async addTask(featureId: string, title: string, prompt: string): Promise<void> {
        (this.store as any).addTask({
            featureId,
            title,
            description: prompt,
            prompt,
            status: "BACKLOG",
            checklist: [],
            files: []
        });
    }

    private updateWithEpic(epicId: string): void {
        this.panel.webview.postMessage({ command: "showEpic", epicId });
    }

    private buildHtml(): string {
        const epics = this.store.getEpics();
        const features = this.store.getFeatures();
        const tasks = this.store.getTasks();

        const priorityColors: Record<string, string> = {
            P1: "#e74c3c",
            P2: "#f39c12",
            P3: "#3498db",
            P4: "#95a5a6"
        };

        const statusIcons: Record<string, string> = {
            IDEA: "💡",
            TODO: "📝",
            IN_PROGRESS: "⚡",
            TESTING: "🧪",
            DONE: "✅",
            BACKLOG: "📋"
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
            margin-bottom: 30px;
        }
        .header h1 {
            color: #00d4ff;
        }
        .header-actions {
            display: flex;
            gap: 10px;
        }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
        }
        .btn-primary {
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            color: #1a1a2e;
        }
        .btn-secondary {
            background: #333;
            color: #fff;
        }
        .input-group {
            margin-bottom: 20px;
        }
        .input-group label {
            display: block;
            margin-bottom: 5px;
            color: #888;
        }
        .input-group input, .input-group textarea {
            width: 100%;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #333;
            background: #16213e;
            color: #fff;
        }
        .input-group textarea {
            min-height: 80px;
            resize: vertical;
        }
        .hierarchy {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .epic {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            border-left: 4px solid #9b59b6;
        }
        .epic-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .epic-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 1.3em;
            font-weight: bold;
        }
        .epic-title h2 {
            color: #9b59b6;
        }
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #333;
            border-radius: 4px;
            margin-top: 10px;
            overflow: hidden;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #9b59b6, #00d4ff);
            transition: width 0.3s;
        }
        .features {
            margin-left: 30px;
            margin-top: 15px;
        }
        .feature {
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            border-left: 3px solid #3498db;
        }
        .feature-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .feature-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: bold;
        }
        .priority-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75em;
            font-weight: bold;
        }
        .tasks {
            margin-left: 25px;
            margin-top: 10px;
        }
        .task {
            background: rgba(255,255,255,0.03);
            padding: 10px 15px;
            border-radius: 6px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .task-status {
            font-size: 1.2em;
        }
        .task-title {
            flex: 1;
        }
        .empty {
            text-align: center;
            color: #888;
            padding: 50px;
        }
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            z-index: 100;
        }
        .modal.show {
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-content {
            background: #1a1a2e;
            padding: 30px;
            border-radius: 15px;
            width: 500px;
            max-width: 90%;
        }
        .modal h2 {
            margin-bottom: 20px;
            color: #00d4ff;
        }
        .modal-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }
        .modal-close {
            float: right;
            cursor: pointer;
            font-size: 1.5em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 AI Planner</h1>
        <div class="header-actions">
            <button class="btn btn-secondary" onclick="showNewEpicModal()">+ New Epic</button>
            <button class="btn btn-primary" onclick="showGenerateModal()">🤖 AI Generate</button>
        </div>
    </div>

    <div class="hierarchy">
        ${epics.length === 0 ? `
        <div class="empty">
            <p>No epics yet.</p>
            <p style="margin-top: 10px;">Click "AI Generate" to create a plan automatically!</p>
        </div>
        ` : epics.map(epic => `
        <div class="epic" onclick="toggleEpic('${epic.id}')">
            <div class="epic-header">
                <div class="epic-title">
                    ${statusIcons[epic.status] || "📦"} <h2>${epic.title}</h2>
                </div>
                <span style="color: #888">${epic.progress}%</span>
            </div>
            <p style="color: #888; margin-bottom: 10px;">${epic.description || 'No description'}</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${epic.progress}%"></div>
            </div>
            
            <div class="features" id="features-${epic.id}">
                ${features.filter(f => f.epicId === epic.id).map(feature => `
                <div class="feature">
                    <div class="feature-header">
                        <div class="feature-title">
                            ${statusIcons[feature.status] || "📦"} ${feature.title}
                        </div>
                        <span class="priority-badge" style="background: ${priorityColors[feature.priority] || '#95a5a6'}">
                            ${feature.priority}
                        </span>
                    </div>
                    <p style="color: #888; font-size: 0.9em; margin-top: 5px;">${feature.description}</p>
                    
                    <div class="tasks">
                        ${tasks.filter((t: any) => t.featureId === feature.id).map((task: any) => `
                        <div class="task">
                            <span class="task-status">${statusIcons[task.status] || "📋"}</span>
                            <span class="task-title">${task.title}</span>
                            <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8em;" onclick="event.stopPropagation(); showTaskPrompt('${task.prompt}')">📝</button>
                        </div>
                        `).join('')}
                        <button class="btn btn-secondary" style="width: 100%; margin-top: 5px;" onclick="event.stopPropagation(); showNewTaskModal('${feature.id}')">+ Add Task</button>
                    </div>
                </div>
                `).join('')}
                <button class="btn btn-secondary" style="width: 100%;" onclick="event.stopPropagation(); showNewFeatureModal('${epic.id}')">+ Add Feature</button>
            </div>
        </div>
        `).join('')}
    </div>

    <!-- Generate Plan Modal -->
    <div class="modal" id="generateModal">
        <div class="modal-content">
            <span class="modal-close" onclick="closeModal('generateModal')">×</span>
            <h2>🤖 AI Project Plan</h2>
            <div class="input-group">
                <label>Co chcesz zbudować?</label>
                <textarea id="planGoal" placeholder="Np. Sklep internetowy z płatnościami Stripe..."></textarea>
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary" onclick="generatePlan()">Generuj Plan</button>
                <button class="btn btn-secondary" onclick="closeModal('generateModal')">Anuluj</button>
            </div>
        </div>
    </div>

    <!-- New Epic Modal -->
    <div class="modal" id="newEpicModal">
        <div class="modal-content">
            <span class="modal-close" onclick="closeModal('newEpicModal')">×</span>
            <h2>New Epic</h2>
            <div class="input-group">
                <label>Title</label>
                <input type="text" id="epicTitle" placeholder="Epic title">
            </div>
            <div class="input-group">
                <label>Description</label>
                <textarea id="epicDesc" placeholder="What is this epic about?"></textarea>
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary" onclick="addEpic()">Create Epic</button>
                <button class="btn btn-secondary" onclick="closeModal('newEpicModal')">Cancel</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function showGenerateModal() {
            document.getElementById('generateModal').classList.add('show');
        }

        function showNewEpicModal() {
            document.getElementById('newEpicModal').classList.add('show');
        }

        function showNewFeatureModal(epicId) {
            vscode.postMessage({ command: 'addFeature', epicId, title: 'New Feature', description: '' });
        }

        function showNewTaskModal(featureId) {
            vscode.postMessage({ command: 'addTask', featureId, title: 'New Task', prompt: '' });
        }

        function showTaskPrompt(prompt) {
            alert('AI Prompt:\\n\\n' + prompt);
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('show');
        }

        function generatePlan() {
            const goal = document.getElementById('planGoal').value;
            vscode.postMessage({ command: 'generatePlan', goal });
            closeModal('generateModal');
        }

        function addEpic() {
            const title = document.getElementById('epicTitle').value;
            const description = document.getElementById('epicDesc').value;
            vscode.postMessage({ command: 'addEpic', title, description });
            closeModal('newEpicModal');
        }

        function toggleEpic(epicId) {
            const features = document.getElementById('features-' + epicId);
            features.style.display = features.style.display === 'none' ? 'block' : 'none';
        }

        window.addEventListener('message', e => {
            if (e.data.command === 'refresh') {
                location.reload();
            }
        });
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        AIPlannerPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
