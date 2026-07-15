import * as vscode from 'vscode';
import { ProjectModule } from '../models/Module';
import { BrainStore } from '../storage/BrainStore';

export class ModuleCardPanel {
public static currentPanel: ModuleCardPanel | undefined;
private readonly panel: vscode.WebviewPanel;
private module: ProjectModule;

private constructor(
panel: vscode.WebviewPanel,
module: ProjectModule
) {
this.panel = panel;
this.module = module;
this.update();
}

public static createOrShow(module: ProjectModule): ModuleCardPanel {
const column = vscode.window.activeTextEditor
? vscode.window.activeTextEditor.viewColumn
: undefined;

if (ModuleCardPanel.currentPanel) {
ModuleCardPanel.currentPanel.reveal(column, true);
ModuleCardPanel.currentPanel.dispose();
}

const panel = vscode.window.createWebviewPanel(
'moduleCard',
`📦 ${module.name}`,
column || vscode.ViewColumn.One,
{ enableScripts: true }
);

ModuleCardPanel.currentPanel = new ModuleCardPanel(panel, module);
return ModuleCardPanel.currentPanel;
}

private update(): void {
const store = new BrainStore();
const history = store.getHistory().filter(h => h.targetId === this.module.id);
const decisions = store.getDecisions().filter(d => d.moduleId === this.module.id);

this.panel.webview.html = `
<!DOCTYPE html>
<html>
<head>
<style>
body { font-family: Arial, sans-serif; padding: 20px; background: #1e1e1e; color: #ccc; }
h1 { color: #fff; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
.status { display: inline-block; padding: 5px 10px; border-radius: 5px; font-size: 12px; margin: 5px 0; }
.status-idea { background: #4a4a00; color: #ffd700; }
.status-planned { background: #004d4d; color: #00d4ff; }
.status-in_progress { background: #006600; color: #00ff00; }
.status-review { background: #660066; color: #ff00ff; }
.status-done { background: #004d00; color: #00ff00; }
.status-locked { background: #4d0000; color: #ff6b6b; }
.progress-bar { background: #333; border-radius: 5px; height: 20px; margin: 10px 0; }
.progress-fill { background: #007acc; border-radius: 5px; height: 20px; }
.section { background: #2d2d2d; padding: 15px; margin: 10px 0; border-radius: 8px; }
.section h3 { margin-top: 0; color: #fff; }
.history-item, .decision-item { padding: 5px 0; border-bottom: 1px solid #444; }
.empty { color: #888; font-style: italic; }
</style>
</head>
<body>
<h1>📦 ${this.module.name}</h1>
<span class="status status-${this.module.status.toLowerCase()}">${this.module.status}</span>
<div class="progress-bar">
<div class="progress-fill" style="width: ${this.module.progress}%"></div>
</div>
<p>Progress: ${this.module.progress}%</p>
<div class="section">
<h3>📝 Description</h3>
<p>${this.module.description || '<span class="empty">No description</span>'}</p>
</div>
<div class="section">
<h3>📁 Files</h3>
${this.module.files.length > 0 
? this.module.files.map(f => `<p>${f}</p>`).join('') 
: '<p class="empty">No files linked</p>'}
</div>
<div class="section">
<h3>📋 History</h3>
${history.length > 0 
? history.map(h => `<div class="history-item"><strong>${h.action}</strong>: ${h.description} <small>(${new Date(h.timestamp).toLocaleString()})</small></div>`).join('')
: '<p class="empty">No history</p>'}
</div>
<div class="section">
<h3>🏛️ Decisions</h3>
${decisions.length > 0 
? decisions.map(d => `<div class="decision-item"><strong>${d.title}</strong><br><small>${d.description}</small></div>`).join('')
: '<p class="empty">No decisions</p>'}
</div>
</body>
</html>`;
}

private reveal(column?: vscode.ViewColumn, preserveFocus?: boolean): void {
this.panel.reveal(column, preserveFocus);
}

private dispose(): void {
ModuleCardPanel.currentPanel = undefined;
}
}
