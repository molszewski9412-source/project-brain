import * as vscode from "vscode";
import { BrainStore } from "../storage/BrainStore";
import { BrainIdea } from "../models/ProjectBrain";

export class KanbanPanel {
    public static currentPanel: KanbanPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;

    private constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.update();
        this.setupMessageHandler();
    }

    public static createOrShow(): KanbanPanel {
        if (KanbanPanel.currentPanel) {
            KanbanPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
        }
        
        const panel = vscode.window.createWebviewPanel(
            "projectBrainKanban",
            "Kanban Board",
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        
        KanbanPanel.currentPanel = new KanbanPanel(panel);
        return KanbanPanel.currentPanel;
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage((msg) => {
            if (msg.command === "addIdea") {
                this.store.addIdea({
                    title: msg.title,
                    description: msg.description || "",
                    tags: [],
                    affectedModules: [],
                    status: msg.status
                });
                this.update();
            } else if (msg.command === "deleteIdea") {
                this.store.deleteIdea(msg.ideaId);
                this.update();
            } else if (msg.command === "moveIdea") {
                this.store.updateIdeaStatus(msg.ideaId, msg.newStatus);
                this.update();
            } else if (msg.command === "askAI") {
                this.askAI(msg.ideaId);
            }
        });
    }

    private askAI(ideaId: string): void {
        const idea = this.store.getIdeas().find(i => i.id === ideaId);
        if (idea) {
            vscode.window.showInformationMessage("AI analysis for: " + idea.title);
        }
    }

    private buildHtml(): string {
        const ideas = this.store.getIdeas();
        const stats = this.store.getStats();
        
        const columns = [
            { id: "BACKLOG", title: "Backlog", color: "#555" },
            { id: "TODO", title: "Todo", color: "#0079bf" },
            { id: "IN_PROGRESS", title: "In Progress", color: "#f5a623" },
            { id: "REVIEW", title: "Review", color: "#9b59b6" },
            { id: "DONE", title: "Done", color: "#27ae60" }
        ];

        let html = `<!DOCTYPE html>
<html>
<head>
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #1a1a2e; color: #fff; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px; background: #16213e; border-radius: 8px; }
    h1 { color: #00d4ff; font-size: 1.3em; }
    .stats { font-size: 0.85em; color: #888; }
    .stats span { margin-left: 15px; }
    .board { display: flex; gap: 15px; overflow-x: auto; padding-bottom: 20px; }
    .column { min-width: 260px; max-width: 260px; background: #16213e; border-radius: 8px; padding: 10px; }
    .column-header { padding: 10px; margin-bottom: 10px; border-bottom: 3px solid #555; font-weight: bold; display: flex; justify-content: space-between; }
    .count { background: #333; padding: 2px 8px; border-radius: 10px; font-size: 0.8em; }
    .card { background: #1e2a4a; padding: 10px; margin-bottom: 10px; border-radius: 5px; border-left: 3px solid #0079bf; }
    .card:hover { background: #2a3a5a; }
    .card-title { font-weight: bold; margin-bottom: 5px; }
    .card-desc { font-size: 0.85em; color: #aaa; margin-bottom: 8px; }
    .card-meta { display: flex; justify-content: space-between; font-size: 0.75em; color: #666; }
    .card-actions { margin-top: 8px; display: flex; gap: 5px; }
    .btn { flex: 1; padding: 5px; border: none; border-radius: 3px; cursor: pointer; font-size: 0.8em; }
    .btn-ai { background: #0079bf; color: #fff; }
    .btn-del { background: #c0392b; color: #fff; }
    .btn:hover { opacity: 0.8; }
    .add-btn { width: 100%; padding: 10px; background: transparent; border: 2px dashed #333; border-radius: 5px; color: #666; cursor: pointer; margin-top: 10px; }
    .add-btn:hover { border-color: #0079bf; color: #0079bf; }
    .empty { text-align: center; color: #555; padding: 20px; font-size: 0.85em; }
</style>
</head>
<body>
<div class="header">
    <h1>Kanban Board</h1>
    <div class="stats">
        <span>Ideas: ${stats.ideas}</span>
        <span>Decisions: ${stats.decisions}</span>
        <span>Locked: ${stats.protectedModules}</span>
    </div>
</div>
<div class="board">`;

        for (const col of columns) {
            const colIdeas = ideas.filter(i => i.status === col.id);
            html += `<div class="column">
                <div class="column-header" style="border-color: ${col.color}">
                    ${col.title} <span class="count">${colIdeas.length}</span>
                </div>`;
            
            if (colIdeas.length === 0) {
                html += `<div class="empty">No cards</div>`;
            }
            
            for (const idea of colIdeas) {
                const date = new Date(idea.createdAt).toLocaleDateString();
                html += `<div class="card">
                    <div class="card-title">${idea.title}</div>
                    <div class="card-desc">${idea.description || ""}</div>
                    <div class="card-meta">
                        <span>${date}</span>
                        <span>${idea.impact || ""}</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn btn-ai" onclick="askAI('${idea.id}')">AI</button>
                        <button class="btn btn-del" onclick="deleteIdea('${idea.id}')">Del</button>
                    </div>
                </div>`;
            }
            
            html += `<button class="add-btn" onclick="addCard('${col.id}')">+ Add Card</button>
            </div>`;
        }

        html += `</div>
<script>
    const vscode = acquireVsCodeApi();

    function addCard(status) {
        const title = prompt("Card title:");
        if (title) {
            const desc = prompt("Description (optional):") || "";
            vscode.postMessage({ command: "addIdea", title: title, description: desc, status: status });
        }
    }

    function askAI(ideaId) {
        vscode.postMessage({ command: "askAI", ideaId: ideaId });
    }

    function deleteIdea(ideaId) {
        if (confirm("Delete this card?")) {
            vscode.postMessage({ command: "deleteIdea", ideaId: ideaId });
        }
    }
</script>
</body></html>`;

        return html;
    }
}
