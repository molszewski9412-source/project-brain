/**
 * AnalysisResultsPanel - Show analysis results in human-readable format
 * with option to add items to Kanban
 */
import * as vscode from 'vscode';
import { BrainStore } from '../storage/BrainStore';
import { BrainModule, BrainIdea, BrainRisk } from '../models/ProjectBrain';

interface AnalysisItem {
    type: 'module' | 'idea' | 'risk';
    title: string;
    description: string;
    details?: string;
    suggestedStatus?: string;
}

export class AnalysisResultsPanel {
    public static currentPanel: AnalysisResultsPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private items: AnalysisItem[] = [];

    private constructor(panel: vscode.WebviewPanel, items: AnalysisItem[]) {
        this.panel = panel;
        this.store = new BrainStore();
        this.items = items;
        this.update();
        this.setupMessageHandler();
    }

    public static createOrShow(items: AnalysisItem[]): AnalysisResultsPanel {
        if (AnalysisResultsPanel.currentPanel) {
            AnalysisResultsPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            AnalysisResultsPanel.currentPanel.items = items;
            AnalysisResultsPanel.currentPanel.update();
        }
        
        const panel = vscode.window.createWebviewPanel(
            "analysisResults",
            "Analysis Results",
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        
        AnalysisResultsPanel.currentPanel = new AnalysisResultsPanel(panel, items);
        return AnalysisResultsPanel.currentPanel;
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            if (msg.command === 'addToKanban') {
                this.addToKanban(msg.item);
            } else if (msg.command === 'addAllToKanban') {
                this.addAllToKanban();
            } else if (msg.command === 'refreshTree') {
                // Refresh the tree view
                vscode.commands.executeCommand('projectBrainView.refresh');
            }
        });
    }

    private addToKanban(item: AnalysisItem): void {
        if (item.type === 'idea') {
            this.store.addIdea({
                title: item.title,
                description: item.description + (item.details ? '\n\n' + item.details : ''),
                tags: [],
                affectedModules: [],
                status: 'BACKLOG'
            });
        } else if (item.type === 'module') {
            // Add as idea with module tag
            this.store.addIdea({
                title: item.title,
                description: item.description + (item.details ? '\n\n' + item.details : ''),
                tags: ['module'],
                affectedModules: [],
                status: 'BACKLOG'
            });
        } else if (item.type === 'risk') {
            // Add as idea with risk tag
            this.store.addIdea({
                title: `⚠️ ${item.title}`,
                description: item.description + (item.details ? '\n\n' + item.details : ''),
                tags: ['risk'],
                affectedModules: [],
                status: 'BACKLOG'
            });
        }

        // Mark item as added
        this.panel.webview.postMessage({ command: 'itemAdded', index: this.items.indexOf(item) });
        
        vscode.window.showInformationMessage(`✅ Added "${item.title}" to Kanban`);
    }

    private addAllToKanban(): void {
        let added = 0;
        for (const item of this.items) {
            this.addToKanban(item);
            added++;
        }
        vscode.window.showInformationMessage(`✅ Added ${added} items to Kanban`);
        this.panel.webview.postMessage({ command: 'refresh' });
    }

    private buildHtml(): string {
        const modules = this.items.filter(i => i.type === 'module');
        const ideas = this.items.filter(i => i.type === 'idea');
        const risks = this.items.filter(i => i.type === 'risk');

        return `<!DOCTYPE html>
<html>
<head>
<style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        background: #0f1419; 
        color: #e7e9ea; 
        padding: 20px; 
        line-height: 1.5;
    }
    
    .header {
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 20px;
    }
    h1 { color: #00d4ff; font-size: 1.5em; margin-bottom: 10px; }
    .subtitle { color: #888; font-size: 0.9em; }
    
    .stats {
        display: flex;
        gap: 20px;
        margin-top: 15px;
    }
    .stat {
        background: rgba(0,212,255,0.1);
        padding: 10px 20px;
        border-radius: 8px;
        text-align: center;
    }
    .stat-value { color: #00d4ff; font-size: 1.5em; font-weight: bold; }
    .stat-label { color: #888; font-size: 0.8em; }
    
    .add-all-btn {
        width: 100%;
        padding: 15px;
        background: linear-gradient(135deg, #27ae60, #2ecc71);
        border: none;
        border-radius: 10px;
        color: white;
        font-size: 1em;
        font-weight: bold;
        cursor: pointer;
        margin-bottom: 25px;
    }
    .add-all-btn:hover { opacity: 0.9; }
    
    .section {
        margin-bottom: 25px;
    }
    .section-title {
        color: #fff;
        font-size: 1.1em;
        margin-bottom: 15px;
        padding-bottom: 8px;
        border-bottom: 2px solid #333;
    }
    
    .item {
        background: #1a1a2e;
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 12px;
        border-left: 4px solid #555;
    }
    .item.module { border-left-color: #0079bf; }
    .item.idea { border-left-color: #f5a623; }
    .item.risk { border-left-color: #e74c3c; }
    
    .item-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
    }
    .item-title { 
        color: #fff; 
        font-weight: 600; 
        font-size: 1em;
        flex: 1;
    }
    .item-type {
        font-size: 0.7em;
        padding: 3px 8px;
        border-radius: 4px;
        text-transform: uppercase;
    }
    .item-type.module { background: #0079bf; }
    .item-type.idea { background: #f5a623; }
    .item-type.risk { background: #e74c3c; }
    
    .item-desc { color: #aaa; font-size: 0.9em; margin-bottom: 10px; }
    
    .item-details {
        background: #0a0a0f;
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 10px;
        font-size: 0.85em;
        color: #888;
        display: none;
    }
    .item-details.show { display: block; }
    
    .toggle-details {
        color: #00d4ff;
        cursor: pointer;
        font-size: 0.85em;
        background: none;
        border: none;
        padding: 0;
    }
    .toggle-details:hover { text-decoration: underline; }
    
    .item-actions {
        display: flex;
        gap: 10px;
        margin-top: 10px;
    }
    .btn {
        flex: 1;
        padding: 10px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
    }
    .btn-add {
        background: #27ae60;
        color: white;
    }
    .btn-add:hover { background: #2ecc71; }
    .btn-add.added { 
        background: #555; 
        color: #888;
        cursor: default;
    }
    
    .empty {
        text-align: center;
        color: #666;
        padding: 40px;
    }
</style>
</head>
<body>

<div class="header">
    <h1>📊 Analysis Results</h1>
    <div class="subtitle">Review suggestions and add to your Kanban board</div>
    <div class="stats">
        <div class="stat"><div class="stat-value">${modules.length}</div><div class="stat-label">Modules</div></div>
        <div class="stat"><div class="stat-value">${ideas.length}</div><div class="stat-label">Ideas</div></div>
        <div class="stat"><div class="stat-value">${risks.length}</div><div class="stat-label">Risks</div></div>
    </div>
</div>

<button class="add-all-btn" onclick="addAllToKanban()">
    ✅ Add All to Kanban (${this.items.length} items)
</button>

${modules.length > 0 ? `
<div class="section">
    <div class="section-title">🗺️ Suggested Modules</div>
    ${modules.map((item, i) => this.buildItemHtml(item, i)).join('')}
</div>
` : ''}

${ideas.length > 0 ? `
<div class="section">
    <div class="section-title">💡 Suggested Ideas</div>
    ${ideas.map((item, i) => this.buildItemHtml(item, modules.length + i)).join('')}
</div>
` : ''}

${risks.length > 0 ? `
<div class="section">
    <div class="section-title">⚠️ Potential Risks</div>
    ${risks.map((item, i) => this.buildItemHtml(item, modules.length + ideas.length + i)).join('')}
</div>
` : ''}

${this.items.length === 0 ? `
<div class="empty">
    <p>No analysis results yet.</p>
    <p>Run "Analyze Project" to generate suggestions.</p>
</div>
` : ''}

<script>
    function toggleDetails(index) {
        const details = document.querySelectorAll('.item-details')[index];
        details.classList.toggle('show');
    }

    function addToKanban(index) {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ command: 'addToKanban', item: window.items[index] });
    }

    function addAllToKanban() {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ command: 'addAllToKanban' });
    }

    window.items = ${JSON.stringify(this.items)};
    
    window.addEventListener('message', e => {
        if (e.data.command === 'itemAdded') {
            const btns = document.querySelectorAll('.btn-add');
            if (btns[e.data.index]) {
                btns[e.data.index].textContent = '✓ Added';
                btns[e.data.index].classList.add('added');
            }
        } else if (e.data.command === 'refresh') {
            location.reload();
        }
    });
</script>

</body>
</html>`;
    }

    private buildItemHtml(item: AnalysisItem, index: number): string {
        return `
<div class="item ${item.type}">
    <div class="item-header">
        <div class="item-title">${item.title}</div>
        <span class="item-type ${item.type}">${item.type}</span>
    </div>
    <div class="item-desc">${item.description}</div>
    ${item.details ? `
        <button class="toggle-details" onclick="toggleDetails(${index})">📖 Show details</button>
        <div class="item-details">${item.details}</div>
    ` : ''}
    <div class="item-actions">
        <button class="btn btn-add" onclick="addToKanban(${index})">➕ Add to Kanban</button>
    </div>
</div>`;
    }
}
