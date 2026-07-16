/**
 * DecisionLearningPanel - FAZA 22 TASK 22.5
 * Nauka decyzji architektonicznych
 */

import * as vscode from "vscode";
import { OllamaClient } from "../ai/OllamaClient";
import { BrainStore } from "../storage/BrainStore";

export interface ArchitecturalDecision {
    id: string;
    title: string;
    description: string;
    context: string;
    rationale: string;
    alternatives: string[];
    chosenOption: string;
    consequences: string[];
    date: string;
    votes: number;
    expert?: string;
}

export class DecisionLearningPanel {
    public static currentPanel: DecisionLearningPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private ollama: OllamaClient;
    private decisions: ArchitecturalDecision[] = [];
    private selectedDecision: string | null = null;

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.ollama = new OllamaClient();
        this.loadDecisions();
        this.setupMessageHandler();
        this.update();
    }

    public static createOrShow(): DecisionLearningPanel {
        if (DecisionLearningPanel.currentPanel) {
            DecisionLearningPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return DecisionLearningPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "decisionLearning",
            "🧠 AI Decision Learning",
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        DecisionLearningPanel.currentPanel = new DecisionLearningPanel(panel);
        return DecisionLearningPanel.currentPanel;
    }

    private loadDecisions(): void {
        // Load from brain store or use defaults
        const brain = this.store.getBrain();
        
        // Get decisions from brain store
        if (brain?.decisions && brain.decisions.length > 0) {
            this.decisions = brain.decisions.map((d: any) => ({
                id: d.id,
                title: d.title || "Untitled Decision",
                description: d.description || "",
                context: d.context || "",
                rationale: d.rationale || "",
                alternatives: d.alternatives || [],
                chosenOption: d.chosenOption || "",
                consequences: d.consequences || [],
                date: d.date || new Date().toISOString(),
                votes: d.votes || 0,
                expert: d.expert
            }));
        } else {
            // Default sample decisions
            this.decisions = [
                {
                    id: "dec-1",
                    title: "REST vs GraphQL",
                    description: "Wybór API pattern",
                    context: "Projekt wymaga elastycznego API dla frontendu",
                    rationale: "REST jest prostszy i bardziej popularny",
                    alternatives: ["REST API", "GraphQL", "gRPC"],
                    chosenOption: "REST API",
                    consequences: ["Prostsza implementacja", "Lepsze cacheowanie"],
                    date: new Date(Date.now() - 86400000 * 30).toISOString(),
                    votes: 5
                },
                {
                    id: "dec-2",
                    title: "Baza danych",
                    description: "Wybór technologii bazy danych",
                    context: "Potrzebujemy bazy dla danych użytkowników i transakcji",
                    rationale: "PostgreSQL oferuje ACID compliance i JSON support",
                    alternatives: ["PostgreSQL", "MongoDB", "MySQL"],
                    chosenOption: "PostgreSQL",
                    consequences: ["Relacyjne dane", "Migracje"],
                    date: new Date(Date.now() - 86400000 * 20).toISOString(),
                    votes: 7
                },
                {
                    id: "dec-3",
                    title: "Auth JWT vs Sessions",
                    description: "Strategia uwierzytelniania",
                    context: "Aplikacja musi działać na wielu urządzeniach",
                    rationale: "JWT jest stateless i łatwiejszy w skalowaniu",
                    alternatives: ["JWT Tokens", "Session-based", "OAuth2"],
                    chosenOption: "JWT Tokens",
                    consequences: ["Stateless auth", "Token refresh needed"],
                    date: new Date(Date.now() - 86400000 * 10).toISOString(),
                    votes: 4
                }
            ];
        }
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "selectDecision":
                    this.selectedDecision = msg.decisionId;
                    this.update();
                    break;
                case "learnFromProject":
                    await this.learnFromProject();
                    break;
                case "addDecision":
                    this.addDecision(msg.decision);
                    break;
                case "vote":
                    this.voteDecision(msg.decisionId);
                    break;
                case "exportDecisions":
                    this.exportDecisions();
                    break;
            }
        });
    }

    private async learnFromProject(): Promise<void> {
        vscode.window.showInformationMessage("Analyzing project decisions...");

        const brain = this.store.getBrain();
        const modules = this.store.getModules();

        // Analyze existing decisions and learn patterns
        const prompt = `Analyze this project and identify key architectural decisions that were made:

Project: ${brain?.projectName || "My Project"}
Modules: ${modules.map(m => m.name).join(", ")}

For each decision, identify:
1. What decision was made
2. Why it was made (context)
3. What alternatives were considered
4. What were the consequences

Return as JSON:
{
  "decisions": [
    {
      "title": "decision name",
      "context": "why it was needed",
      "rationale": "why this choice",
      "alternatives": ["option1", "option2"],
      "consequences": ["positive", "negative"]
    }
  ]
}`;

        try {
            const result = await this.ollama.ask(prompt);
            
            // Parse and add decisions
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const data = JSON.parse(jsonMatch[0]);
                    if (data.decisions) {
                        data.decisions.forEach((d: any) => {
                            this.addDecision(d);
                        });
                    }
                } catch (e) {
                    console.error("Parse error:", e);
                }
            }

            vscode.window.showInformationMessage("Learning complete!");
        } catch (error) {
            vscode.window.showErrorMessage(`Learning failed: ${error}`);
        }

        this.update();
    }

    private addDecision(decision: Partial<ArchitecturalDecision>): void {
        const newDecision: ArchitecturalDecision = {
            id: `dec-${Date.now()}`,
            title: decision.title || "New Decision",
            description: decision.description || "",
            context: decision.context || "",
            rationale: decision.rationale || "",
            alternatives: decision.alternatives || [],
            chosenOption: decision.chosenOption || "",
            consequences: decision.consequences || [],
            date: new Date().toISOString(),
            votes: 0
        };

        this.decisions.unshift(newDecision);
        this.saveDecisions();
        this.update();
    }

    private voteDecision(decisionId: string): void {
        const decision = this.decisions.find(d => d.id === decisionId);
        if (decision) {
            decision.votes++;
            this.saveDecisions();
            this.update();
        }
    }

    private saveDecisions(): void {
        const brain = this.store.getBrain();
        if (brain) {
            brain.decisions = this.decisions.map(d => ({
                id: d.id,
                moduleId: d.id,
                type: "ARCHITECTURAL" as any,
                title: d.title,
                description: d.description,
                rationale: d.rationale,
                alternatives: d.alternatives,
                status: "APPROVED" as any,
                proposedAt: d.date,
                createdBy: "AI" as const,
                votes: d.votes,
                relatedDecisionIds: [],
                affectedModuleIds: []
            }));
            this.store.save();
        }
    }

    private exportDecisions(): void {
        const content = this.decisions.map(d => `
## ${d.title}
${d.description}

**Context:** ${d.context}
**Rationale:** ${d.rationale}
**Chosen:** ${d.chosenOption}

**Alternatives:**
${d.alternatives.map(a => `- ${a}`).join("\n")}

**Consequences:**
${d.consequences.map(c => `- ${c}`).join("\n")}

*Date: ${new Date(d.date).toLocaleDateString()} | Votes: ${d.votes}*
---
`).join("\n");

        vscode.env.clipboard.writeText(content);
        vscode.window.showInformationMessage("Decisions exported to clipboard!");
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const selectedDec = this.decisions.find(d => d.id === this.selectedDecision);

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
        .actions {
            display: flex;
            gap: 10px;
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
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            flex: 1;
            min-height: 0;
        }
        .decisions-list {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            overflow-y: auto;
        }
        .decisions-list h3 {
            color: #00d4ff;
            margin-bottom: 15px;
        }
        .decision-card {
            background: rgba(0,0,0,0.2);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: all 0.2s;
            border-left: 4px solid #333;
        }
        .decision-card:hover {
            background: rgba(0,212,255,0.1);
        }
        .decision-card.selected {
            border-left-color: #00d4ff;
            background: rgba(0,212,255,0.15);
        }
        .decision-title {
            font-weight: bold;
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
        }
        .decision-desc {
            font-size: 0.85em;
            color: #888;
            margin-bottom: 8px;
        }
        .decision-meta {
            display: flex;
            gap: 15px;
            font-size: 0.8em;
            color: #666;
        }
        .decision-detail {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            overflow-y: auto;
        }
        .detail-header {
            margin-bottom: 20px;
        }
        .detail-title {
            font-size: 1.5em;
            font-weight: bold;
            color: #00d4ff;
            margin-bottom: 10px;
        }
        .detail-section {
            margin-bottom: 20px;
        }
        .detail-label {
            color: #888;
            font-size: 0.85em;
            margin-bottom: 5px;
            text-transform: uppercase;
        }
        .detail-value {
            background: rgba(0,0,0,0.2);
            padding: 12px;
            border-radius: 8px;
        }
        .alternatives-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .alternative {
            padding: 8px 12px;
            background: rgba(0,0,0,0.2);
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .alternative.chosen {
            background: rgba(39,174,96,0.2);
            border: 1px solid #27ae60;
        }
        .chosen-badge {
            color: #27ae60;
            font-weight: bold;
            font-size: 0.85em;
        }
        .consequence {
            padding: 8px 12px;
            background: rgba(0,0,0,0.2);
            border-radius: 6px;
            margin-bottom: 8px;
        }
        .vote-btn {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 8px 16px;
            background: #333;
            border: none;
            border-radius: 20px;
            color: #fff;
            cursor: pointer;
            transition: all 0.2s;
        }
        .vote-btn:hover {
            background: #444;
        }
        .vote-btn.voted {
            background: #27ae60;
        }
        .date-badge {
            color: #888;
            font-size: 0.85em;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧠 AI Decision Learning</h1>
        <div class="actions">
            <button class="btn btn-primary" onclick="learnFromProject()">📚 Learn from Project</button>
            <button class="btn btn-secondary" onclick="exportDecisions()">📤 Export</button>
        </div>
    </div>

    <div class="main-container">
        <div class="decisions-list">
            <h3>Decisions (${this.decisions.length})</h3>
            ${this.decisions.map(d => `
            <div class="decision-card ${d.id === this.selectedDecision ? 'selected' : ''}"
                 onclick="selectDecision('${d.id}')">
                <div class="decision-title">
                    <span>${d.title}</span>
                    <span>👍 ${d.votes}</span>
                </div>
                <div class="decision-desc">${d.description}</div>
                <div class="decision-meta">
                    <span>${d.alternatives.length} alternatives</span>
                    <span>${d.consequences.length} consequences</span>
                    <span class="date-badge">${new Date(d.date).toLocaleDateString()}</span>
                </div>
            </div>
            `).join('')}
        </div>

        <div class="decision-detail">
            ${selectedDec ? `
            <div class="detail-header">
                <div class="detail-title">${selectedDec.title}</div>
                <button class="vote-btn" onclick="vote('${selectedDec.id}')">
                    👍 Vote (${selectedDec.votes})
                </button>
            </div>

            <div class="detail-section">
                <div class="detail-label">Context</div>
                <div class="detail-value">${selectedDec.context}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Rationale</div>
                <div class="detail-value">${selectedDec.rationale}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Alternatives</div>
                <div class="alternatives-list">
                    ${selectedDec.alternatives.map(alt => `
                    <div class="alternative ${alt === selectedDec.chosenOption ? 'chosen' : ''}">
                        <span>${alt === selectedDec.chosenOption ? '✓' : '○'}</span>
                        <span>${alt}</span>
                        ${alt === selectedDec.chosenOption ? '<span class="chosen-badge">CHOSEN</span>' : ''}
                    </div>
                    `).join('')}
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Consequences</div>
                ${selectedDec.consequences.map(c => `
                <div class="consequence">${c}</div>
                `).join('')}
            </div>

            <div class="detail-section">
                <div class="detail-label">Date</div>
                <div class="detail-value">${new Date(selectedDec.date).toLocaleDateString()}</div>
            </div>
            ` : `
            <div class="empty-state">
                <p style="font-size: 3em;">📋</p>
                <p style="margin-top: 20px;">Select a decision to view details</p>
            </div>
            `}
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function selectDecision(id) {
            vscode.postMessage({ command: 'selectDecision', decisionId: id });
        }

        function learnFromProject() {
            vscode.postMessage({ command: 'learnFromProject' });
        }

        function vote(decisionId) {
            vscode.postMessage({ command: 'vote', decisionId });
        }

        function exportDecisions() {
            vscode.postMessage({ command: 'exportDecisions' });
        }
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        DecisionLearningPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
