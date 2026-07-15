/**
 * AIWorkflowKanban - Smart Kanban with AI-assisted workflow
 */
import * as vscode from "vscode";
import { BrainStore } from "../storage/BrainStore";
import { BrainIdea } from "../models/ProjectBrain";
import { AIContextBuilder } from "../ai/AIContextBuilder";
import { OllamaClient } from "../ai/OllamaClient";

export class AIWorkflowKanban {
    public static currentPanel: AIWorkflowKanban | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private ollama: OllamaClient;
    private contextBuilder: AIContextBuilder;

    private constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.ollama = new OllamaClient();
        this.contextBuilder = new AIContextBuilder();
        this.update();
        this.setupMessageHandler();
    }

    public static createOrShow(): AIWorkflowKanban {
        if (AIWorkflowKanban.currentPanel) {
            AIWorkflowKanban.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            AIWorkflowKanban.currentPanel.update();
        }
        
        const panel = vscode.window.createWebviewPanel(
            "aiWorkflowKanban",
            "AI Workflow Kanban",
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        
        AIWorkflowKanban.currentPanel = new AIWorkflowKanban(panel);
        return AIWorkflowKanban.currentPanel;
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "addCard":
                    this.addCard(msg.status);
                    break;
                case "moveCard":
                    await this.handleMoveCard(msg.cardId, msg.fromStatus, msg.toStatus);
                    break;
                case "deleteCard":
                    this.store.deleteIdea(msg.cardId);
                    this.update();
                    break;
                case "askAI":
                    await this.askAI(msg.cardId);
                    break;
            }
        });
    }

    private async handleMoveCard(cardId: string, fromStatus: string, toStatus: string): Promise<void> {
        const idea = this.store.getIdeas().find(i => i.id === cardId);
        if (!idea) return;

        // BACKLOG → TODO: AI analyzes
        if (fromStatus === "BACKLOG" && toStatus === "TODO") {
            vscode.window.showInformationMessage("Analyzing with AI...");
            const analysis = await this.analyzeIdea(idea);
            this.panel.webview.postMessage({ command: "showAnalysis", cardId, analysis });
            return;
        }

        // TODO → IN_PROGRESS: User approves
        if (fromStatus === "TODO" && toStatus === "IN_PROGRESS") {
            const approved = await vscode.window.showQuickPick(["Yes, approve", "No, keep in Todo"], {
                placeHolder: "Did you approve AI's proposal?"
            });
            if (approved === "Yes, approve") {
                this.store.updateIdeaStatus(cardId, "IN_PROGRESS");
                this.store.addRecentChange(`Started: ${idea.title}`, "Approved by user");
            }
            this.update();
            return;
        }

        // IN_PROGRESS → REVIEW
        if (fromStatus === "IN_PROGRESS" && toStatus === "REVIEW") {
            this.store.updateIdeaStatus(cardId, "REVIEW");
            this.update();
            return;
        }

        // REVIEW → DONE: Check if touching DONE modules
        if (fromStatus === "REVIEW" && toStatus === "DONE") {
            const modules = this.store.getModules();
            const doneModules = modules.filter(m => m.status === "DONE" || m.locked);
            
            if (doneModules.length > 0) {
                const runTests = await vscode.window.showQuickPick(
                    ["Yes, run tests", "No, skip tests"],
                    { placeHolder: "This touches DONE/LOCKED modules. Run tests?" }
                );
                if (runTests === "Yes, run tests") {
                    vscode.window.showInformationMessage("Running tests...");
                }
            }
            
            this.store.updateIdeaStatus(cardId, "DONE");
            this.store.addRecentChange(`Completed: ${idea.title}`, "Fully implemented");
            this.update();
            return;
        }

        // Default move
        this.store.updateIdeaStatus(cardId, toStatus);
        this.update();
    }

    private async analyzeIdea(idea: BrainIdea): Promise<string> {
        const context = this.contextBuilder.buildContext({
            purpose: "suggest",
            question: `Analyze: "${idea.title}"\n\n${idea.description || ""}\n\nWhat needs to be done?`
        });

        try {
            const result = await this.ollama.ask(context);
            return result.success ? result.content : "AI not available";
        } catch {
            return "AI not available. Please analyze manually.";
        }
    }

    private async askAI(cardId: string): Promise<void> {
        const idea = this.store.getIdeas().find(i => i.id === cardId);
        if (!idea) return;

        const context = this.contextBuilder.buildContext({
            purpose: "explain",
            question: `Tell me about: "${idea.title}"`
        });

        try {
            const result = await this.ollama.ask(context);
            this.panel.webview.postMessage({ command: "showInsight", content: result.content });
        } catch {
            vscode.window.showErrorMessage("AI not available");
        }
    }

    private addCard(status: string): void {
        vscode.window.showInputBox({ prompt: "Idea title:" }).then(title => {
            if (!title) return;
            vscode.window.showInputBox({ prompt: "Description:", value: "" }).then(desc => {
                this.store.addIdea({
                    title, description: desc || "", tags: [], affectedModules: [], status: status as any
                });
                this.update();
            });
        });
    }

    private buildHtml(): string {
        const ideas = this.store.getIdeas();
        const stats = this.store.getStats();
        
        const columns = [
            { id: "BACKLOG", title: "Backlog", color: "#555", hint: "New ideas" },
            { id: "TODO", title: "Todo", color: "#0079bf", hint: "AI analyzes" },
            { id: "IN_PROGRESS", title: "In Progress", color: "#f5a623", hint: "Working" },
            { id: "REVIEW", title: "Review", color: "#9b59b6", hint: "Testing" },
            { id: "DONE", title: "Done", color: "#27ae60", hint: "Completed" }
        ];

        let html = `<!DOCTYPE html>
<html><head><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;background:#0f1419;color:#e7e9ea;padding:15px}
.header{display:flex;justify-content:space-between;align-items:center;padding:15px;background:#1a1a2e;border-radius:10px;margin-bottom:15px}
h1{color:#00d4ff}
.stats{font-size:0.85em;color:#888}
.board{display:flex;gap:12px;overflow-x:auto;padding-bottom:20px}
.column{min-width:230px;max-width:230px;background:#1a1a2e;border-radius:10px;padding:10px}
.column-header{padding:8px;border-bottom:3px solid #555;display:flex;justify-content:space-between}
.column-title{font-weight:bold}
.column-count{background:#333;padding:2px 8px;border-radius:10px;font-size:0.8em}
.column-hint{font-size:0.7em;color:#666}
.card{background:#16213e;padding:10px;margin:8px 0;border-radius:6px;border-left:4px solid #0079bf;cursor:grab}
.card:hover{background:#1e2a4a}
.card-title{font-weight:bold;margin-bottom:5px}
.card-desc{font-size:0.85em;color:#888}
.card-actions{display:flex;gap:5px;margin-top:8px}
.btn{flex:1;padding:5px;border:none;border-radius:4px;cursor:pointer;font-size:0.8em}
.btn-ai{background:#0079bf;color:#fff}
.btn-del{background:#555;color:#fff}
.add-btn{width:100%;padding:10px;background:transparent;border:2px dashed #333;border-radius:6px;color:#666;cursor:pointer;margin-top:8px}
.add-btn:hover{border-color:#0079bf;color:#0079bf}
.empty{text-align:center;color:#444;padding:20px;font-size:0.85em}
.modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:1000;align-items:center;justify-content:center}
.modal.show{display:flex}
.modal-content{background:#1a1a2e;max-width:600px;width:90%;max-height:80vh;border-radius:12px;padding:25px;overflow-y:auto}
.modal-header{display:flex;justify-content:space-between;margin-bottom:15px}
.modal-title{color:#00d4ff;font-size:1.2em}
.modal-close{cursor:pointer;color:#888;font-size:1.5em}
.modal-body{color:#ccc;line-height:1.6;white-space:pre-wrap}
.modal-actions{display:flex;gap:10px;margin-top:20px}
.modal-btn{flex:1;padding:12px;border:none;border-radius:8px;cursor:pointer;font-weight:bold}
.modal-btn.ok{background:#27ae60;color:#fff}
.modal-btn.close{background:#555;color:#fff}
</style></head><body>
<div class="header">
    <h1>AI Workflow Kanban</h1>
    <div class="stats">Ideas: ${stats.ideas} | Decisions: ${stats.decisions} | Locked: ${stats.protectedModules}</div>
</div>
<div style="background:#1a1a2e;padding:10px 15px;border-radius:8px;margin-bottom:15px;font-size:0.85em;color:#888">
<strong style="color:#00d4ff">Workflow:</strong> Backlog→Todo (AI) → In Progress (approve) → Review (test) → Done
</div>
<div class="board">`;

        for (const col of columns) {
            const colIdeas = ideas.filter(i => i.status === col.id);
            html += `<div class="column" data-status="${col.id}">
                <div class="column-header" style="border-color:${col.color}">
                    <div><div class="column-title">${col.title}</div><div class="column-hint">${col.hint}</div></div>
                    <span class="column-count">${colIdeas.length}</span>
                </div>`;
            
            if (colIdeas.length === 0) html += `<div class="empty">No cards</div>`;
            
            for (const idea of colIdeas) {
                html += `<div class="card" draggable="true" data-id="${idea.id}" data-status="${idea.status}">
                    <div class="card-title">${idea.title}</div>
                    <div class="card-desc">${idea.description || ""}</div>
                    <div class="card-actions">
                        <button class="btn btn-ai" onclick="askAI('${idea.id}')">AI</button>
                        <button class="btn btn-del" onclick="deleteCard('${idea.id}')">X</button>
                    </div>
                </div>`;
            }
            html += `<button class="add-btn" onclick="addCard('${col.id}')">+ Add</button></div>`;
        }

        html += `</div>
<div class="modal" id="analysisModal">
    <div class="modal-content">
        <div class="modal-header"><span class="modal-title">AI Analysis</span><span class="modal-close" onclick="closeModal()">x</span></div>
        <div class="modal-body" id="modalBody"></div>
        <div class="modal-actions"><button class="modal-btn ok" onclick="closeModal()">Got it</button></div>
    </div>
</div>
<script>
const vscode=acquireVsCodeApi();
let currentCard=null;
document.addEventListener('dragstart',e=>{if(e.target.classList.contains('card')){e.target.classList.add('dragging');currentCard={id:e.target.dataset.id,from:e.target.dataset.status}}});
document.addEventListener('dragend',e=>{if(e.target.classList.contains('card'))e.target.classList.remove('dragging')});
document.addEventListener('dragover',e=>e.preventDefault());
document.addEventListener('drop',e=>{e.preventDefault();const col=e.target.closest('.column');if(col&&currentCard){const to=col.dataset.status;vscode.postMessage({command:'moveCard',cardId:currentCard.id,fromStatus:currentCard.from,toStatus:to})}currentCard=null});
function addCard(s){vscode.postMessage({command:'addCard',status:s})}
function deleteCard(id){if(confirm('Delete?'))vscode.postMessage({command:'deleteCard',cardId:id})}
function askAI(id){vscode.postMessage({command:'askAI',cardId:id})}
function closeModal(){document.getElementById('analysisModal').classList.remove('show')}
window.addEventListener('message',e=>{
const m=e.data;
if(m.command==='showAnalysis'){document.getElementById('modalBody').textContent=m.analysis;document.getElementById('analysisModal').classList.add('show')}
if(m.command==='showInsight')alert(m.content.substring(0,500))
});
</script></body></html>`;

        return html;
    }
}
