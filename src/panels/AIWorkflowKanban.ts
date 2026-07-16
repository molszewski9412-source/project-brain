/**
 * AIWorkflowKanban - Intuitive AI-powered workflow
 * Flow: BACKLOG → TODO (AI) → IN_PROGRESS (test) → DONE (locked)
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
            "⚡ AI Workflow",
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
                case "submitAddCard":
                    this.handleAddCardSubmit(msg.title, msg.description);
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
                case "approveProposal":
                    await this.approveProposal(msg.cardId);
                    break;
                case "unblockCard":
                    await this.unblockCard(msg.cardId);
                    break;
            }
        });
    }

    private async handleMoveCard(cardId: string, fromStatus: string, toStatus: string): Promise<void> {
        const idea = this.store.getIdeas().find(i => i.id === cardId);
        if (!idea) return;

        if (fromStatus === "BACKLOG" && toStatus === "TODO") {
            vscode.window.showInformationMessage("🤔 AI is analyzing...");
            try {
                const proposal = await this.getAIProposal(idea);
                this.panel.webview.postMessage({ command: "showProposal", cardId, proposal });
            } catch (error) {
                this.store.updateIdeaStatus(cardId, "TODO");
                this.update();
            }
            return;
        }

        if (fromStatus === "TODO" && toStatus === "IN_PROGRESS") {
            const branchName = `feature/${idea.title.toLowerCase().replace(/\s+/g, '-')}`;
            try {
                const terminal = vscode.window.createTerminal({ name: "Git Branch" });
                terminal.sendText(`git checkout -b ${branchName}`);
                terminal.show();
                vscode.window.showInformationMessage(`✅ Branch "${branchName}" created!`);
            } catch (e) {
                vscode.window.showWarningMessage("Could not create branch");
            }
            this.store.updateIdeaStatus(cardId, "IN_PROGRESS");
            this.store.addRecentChange(`Started: ${idea.title}`, "Working on it");
            this.update();
            return;
        }

        if (fromStatus === "IN_PROGRESS" && toStatus === "DONE") {
            const modules = this.store.getModules();
            const existingModule = modules.find(m => m.name.toLowerCase() === idea.title.toLowerCase());
            
            if (!existingModule) {
                this.store.addModule({
                    name: idea.title,
                    description: idea.description || '',
                    status: 'LOCKED',
                    progress: 100,
                    locked: true,
                    files: [],
                    dependsOn: [],
                    position: { x: 0, y: 0 }
                });
            } else {
                this.store.lockModule(existingModule.id);
            }
            
            this.store.updateIdeaStatus(cardId, "DONE");
            this.store.addRecentChange(`Completed: ${idea.title}`, "Locked");
            this.update();
            vscode.window.showInformationMessage(`🔒 "${idea.title}" done & locked!`);
            return;
        }

        this.store.updateIdeaStatus(cardId, toStatus);
        this.update();
    }

    private async getAIProposal(idea: BrainIdea): Promise<string> {
        const context = this.contextBuilder.buildContext({
            purpose: "suggest",
            question: `Propose implementation for: "${idea.title}"\n\n${idea.description || ""}\n\nGive steps.`
        });
        try {
            const result = await this.ollama.ask(context);
            return result.success ? result.content : "AI not available";
        } catch {
            return "AI not available";
        }
    }

    private async askAI(cardId: string): Promise<void> {
        const idea = this.store.getIdeas().find(i => i.id === cardId);
        if (!idea) return;
        const context = this.contextBuilder.buildContext({
            purpose: "explain",
            question: `Explain: "${idea.title}"`
        });
        try {
            const result = await this.ollama.ask(context);
            this.panel.webview.postMessage({ command: "showAiChat", content: result.content });
        } catch {
            vscode.window.showErrorMessage("AI not available");
        }
    }

    private async approveProposal(cardId: string): Promise<void> {
        this.store.updateIdeaStatus(cardId, "TODO");
        this.update();
    }

    private async unblockCard(cardId: string): Promise<void> {
        const idea = this.store.getIdeas().find(i => i.id === cardId);
        if (!idea) return;
        const modules = this.store.getModules();
        const module = modules.find(m => m.name.toLowerCase() === idea.title.toLowerCase());
        if (module && module.locked) {
            this.store.unlockModule(module.id);
        }
        this.store.updateIdeaStatus(cardId, "BACKLOG");
        this.update();
    }

    private handleAddCardSubmit(title: string, description: string): void {
        if (title && title.trim()) {
            this.store.addIdea({
                title: title.trim(),
                description: description || "",
                tags: [],
                affectedModules: [],
                status: "BACKLOG"
            });
            this.update();
        }
    }

    private buildHtml(): string {
        const ideas = this.store.getIdeas();
        const modules = this.store.getModules();
        const lockedCount = modules.filter(m => m.locked).length;
        
        const columns = [
            { id: "BACKLOG", title: "📝 Backlog", color: "#555", hint: "All ideas" },
            { id: "TODO", title: "🤔 TODO", color: "#0079bf", hint: "AI proposes" },
            { id: "IN_PROGRESS", title: "⚡ In Progress", color: "#f5a623", hint: "Testing" },
            { id: "DONE", title: "✅ Done", color: "#27ae60", hint: "Locked!" }
        ];

        const cardData = ideas.map(i => ({ id: i.id, title: i.title, desc: i.description || "" }));
        const cardDataJson = JSON.stringify(cardData);

        let html = `<!DOCTYPE html>
<html><head><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f1419;color:#e7e9ea;padding:20px}
.header{display:flex;justify-content:space-between;align-items:center;padding:20px;background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:12px;margin-bottom:20px}
h1{color:#00d4ff;font-size:1.4em}
.stats{display:flex;gap:10px}
.stat{background:rgba(0,212,255,0.1);padding:8px 15px;border-radius:8px}
.stat-value{color:#00d4ff;font-weight:bold}
.board{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}
.column{background:#1a1a2e;border-radius:12px;padding:15px}
.col-header{padding:12px;border-bottom:3px solid;border-radius:8px;margin-bottom:15px}
.col-title{font-weight:bold;display:flex;justify-content:space-between}
.col-count{background:#333;padding:2px 10px;border-radius:10px;font-size:0.8em}
.card{background:#16213e;padding:12px;margin-bottom:10px;border-radius:8px;border-left:4px solid;cursor:pointer}
.card.BACKLOG{border-color:#555}
.card.TODO{border-color:#0079bf}
.card.IN_PROGRESS{border-color:#f5a623}
.card.DONE{border-color:#27ae60;background:#1a3a1a}
.card-title{font-weight:bold;color:#fff;margin-bottom:5px}
.card-desc{font-size:0.8em;color:#888}
.empty{text-align:center;color:#444;padding:30px}
.add-btn{width:100%;padding:12px;background:transparent;border:2px dashed #333;border-radius:8px;color:#666;cursor:pointer;margin-top:15px}
.add-btn:hover{border-color:#00d4ff;color:#00d4ff}
.modal{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:1000;align-items:center;justify-content:center}
.modal.show{display:flex}
.modal-content{background:#1a1a2e;max-width:600px;width:95%;max-height:80vh;border-radius:16px;padding:25px;overflow-y:auto}
.modal-header{display:flex;justify-content:space-between;margin-bottom:20px}
.modal-title{color:#00d4ff;font-size:1.2em}
.modal-close{background:none;border:none;color:#888;font-size:1.5em;cursor:pointer}
.modal-body{color:#ccc;line-height:1.6;white-space:pre-wrap}
.modal-actions{display:flex;gap:10px;margin-top:20px}
.modal-btn{flex:1;padding:12px;border:none;border-radius:8px;cursor:pointer;font-weight:bold}
.modal-btn.primary{background:#27ae60;color:#fff}
.modal-btn.secondary{background:#333;color:#fff}
.modal-btn.danger{background:#c0392b;color:#fff}
.flow{background:#0a0a0f;padding:15px;border-radius:10px;margin-bottom:20px;font-size:0.85em}
@media(max-width:1100px){.board{grid-template-columns:repeat(2,1fr)}}
@media(max-width:700px){.board{grid-template-columns:1fr}}
</style></head><body>
<div class="header">
<h1>⚡ AI Workflow</h1>
<div class="stats">
<span class="stat"><span class="stat-value">${ideas.length}</span> tasks</span>
<span class="stat"><span class="stat-value">${lockedCount}</span> locked</span>
</div>
</div>
<div class="flow">
<strong>🚀 Flow:</strong> 📝 Backlog → 🤔 TODO (AI) → ⚡ In Progress → ✅ Done (locked!)
</div>
<div class="board">`;

        for (const col of columns) {
            const colIdeas = ideas.filter(i => i.status === col.id);
            html += `<div class="column">
<div class="col-header" style="border-color:${col.color}">
<div class="col-title">${col.title}<span class="col-count">${colIdeas.length}</span></div>
<div style="font-size:0.7em;color:#666">${col.hint}</div>
</div>
<div>`;
            if (colIdeas.length === 0) html += `<div class="empty">No tasks</div>`;
            for (const idea of colIdeas) {
                html += `<div class="card ${idea.status}" data-id="${idea.id}" data-status="${idea.status}">
<div class="card-title">${idea.title}</div>
<div class="card-desc">${(idea.description||"").substring(0,60)}</div>
</div>`;
            }
            html += `</div><button class="add-btn" onclick="showAdd()">+ Add</button></div>`;
        }

        html += `</div>
<div class="modal" id="addModal">
<div class="modal-content">
<div class="modal-header"><span class="modal-title">✨ Add Task</span><span class="modal-close" onclick="closeAdd()">×</span></div>
<input type="text" id="taskTitle" style="width:100%;padding:12px;border-radius:8px;border:1px solid #333;background:#16213e;color:#fff;margin:15px 0" placeholder="Task name">
<textarea id="taskDesc" style="width:100%;padding:12px;border-radius:8px;border:1px solid #333;background:#16213e;color:#fff;min-height:80px;resize:none" placeholder="Description"></textarea>
<div class="modal-actions"><button class="modal-btn primary" onclick="submit()">Add</button><button class="modal-btn secondary" onclick="closeAdd()">Cancel</button></div>
</div></div>
<div class="modal" id="detailModal">
<div class="modal-content">
<div class="modal-header"><span class="modal-title" id="dTitle"></span><span class="modal-close" onclick="closeDetail()">×</span></div>
<div class="modal-body" id="dBody"></div>
<div class="modal-actions" id="dActions"></div>
</div></div>
<div class="modal" id="aiModal">
<div class="modal-content">
<div class="modal-header"><span class="modal-title">🤖 AI Proposal</span><span class="modal-close" onclick="closeAi()">×</span></div>
<div class="modal-body" id="aiBody" style="background:#0a0a0f;padding:15px;border-radius:8px">Analyzing...</div>
<div class="modal-actions"><button class="modal-btn primary" id="approveBtn" onclick="doApprove()">Approve</button><button class="modal-btn secondary" onclick="closeAi()">Cancel</button></div>
</div></div>
<script>
const vscode=acquireVsCodeApi();
const cardData=${cardDataJson};
let currentId=null;

document.querySelectorAll('.card').forEach(c=>c.addEventListener('click',()=>showDetail(c.dataset.id,c.dataset.status)));

document.addEventListener('dragstart',e=>{if(e.target.classList.contains('card'))currentId=e.target.dataset.id});
document.addEventListener('dragend',e=>{if(currentId){const col=e.target.closest('.column');if(col){const to=col.dataset.status;if(e.target.dataset.status!==to)vscode.postMessage({command:'moveCard',cardId:currentId,fromStatus:e.target.dataset.status,toStatus:to})}}currentId=null});

function showAdd(){document.getElementById('addModal').classList.add('show')}
function closeAdd(){document.getElementById('addModal').classList.remove('show');document.getElementById('taskTitle').value='';document.getElementById('taskDesc').value=''}
function submit(){const t=document.getElementById('taskTitle').value.trim();const d=document.getElementById('taskDesc').value.trim();if(t)vscode.postMessage({command:'submitAddCard',title:t,description:d});closeAdd()}

function showDetail(id,status){
currentId=id;
const card=cardData.find(c=>c.id===id);
if(!card)return;
let actions='';
if(status==='BACKLOG')actions='<button class="modal-btn primary" onclick="moveTODO()">🤔 Move to TODO</button>';
if(status==='TODO')actions='<button class="modal-btn primary" onclick="askAI()">🤖 Ask AI</button><button class="modal-btn secondary" onclick="moveProgress()">⚡ Start</button>';
if(status==='IN_PROGRESS')actions='<button class="modal-btn primary" onclick="markDone()">✅ Done!</button>';
if(status==='DONE')actions='<button class="modal-btn secondary" onclick="unblock()">🔓 Unblock</button>';
actions+='<button class="modal-btn danger" onclick="deleteCard()">🗑️</button>';
document.getElementById('dTitle').textContent=card.title;
document.getElementById('dBody').innerHTML='<p>'+(card.desc||'No description')+'</p>';
document.getElementById('dActions').innerHTML=actions;
document.getElementById('detailModal').classList.add('show');
}

function closeDetail(){document.getElementById('detailModal').classList.remove('show');currentId=null}
function moveTODO(){vscode.postMessage({command:'moveCard',cardId:currentId,fromStatus:'BACKLOG',toStatus:'TODO'});closeDetail()}
function moveProgress(){vscode.postMessage({command:'moveCard',cardId:currentId,fromStatus:'TODO',toStatus:'IN_PROGRESS'});closeDetail()}
function markDone(){vscode.postMessage({command:'moveCard',cardId:currentId,fromStatus:'IN_PROGRESS',toStatus:'DONE'});closeDetail()}
function unblock(){vscode.postMessage({command:'unblockCard',cardId:currentId});closeDetail()}
function deleteCard(){if(confirm('Delete?'))vscode.postMessage({command:'deleteCard',cardId:currentId});closeDetail()}
function askAI(){vscode.postMessage({command:'askAI',cardId:currentId});closeDetail()}
function closeAi(){document.getElementById('aiModal').classList.remove('show')}
function doApprove(){vscode.postMessage({command:'approveProposal',cardId:currentId});closeAi()}

window.addEventListener('message',e=>{
const m=e.data;
if(m.command==='showProposal'){document.getElementById('aiBody').innerHTML='<pre>'+m.proposal.replace(/</g,'&lt;')+'</pre>';currentId=m.cardId;document.getElementById('aiModal').classList.add('show')}
if(m.command==='showAiChat')alert(m.content.substring(0,400))
if(m.command==='refresh')location.reload()
});
</script></body></html>`;

        return html;
    }
}
