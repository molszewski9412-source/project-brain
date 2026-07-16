import * as vscode from 'vscode';
import { BrainModule } from '../models/ProjectBrain';
import { BrainStore } from '../storage/BrainStore';

export class ModuleCardPanel {
public static currentPanel: ModuleCardPanel | undefined;
private readonly panel: vscode.WebviewPanel;
private module: BrainModule;
private store: BrainStore;

private constructor(
panel: vscode.WebviewPanel,
module: BrainModule
) {
this.panel = panel;
this.module = module;
this.store = new BrainStore();
this.update();
this.setupMessageHandler();
}

public static createOrShow(module: BrainModule): ModuleCardPanel {
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

private setupMessageHandler(): void {
this.panel.webview.onDidReceiveMessage(async (msg) => {
switch (msg.command) {
case 'lock':
this.lockModule();
break;
case 'unlock':
this.unlockModule();
break;
case 'delete':
this.deleteModule();
break;
case 'updateStatus':
this.updateStatus(msg.status);
break;
}
});
}

private lockModule(): void {
try {
this.store.lockModule(this.module.id);
vscode.window.showInformationMessage(`🔒 Module "${this.module.name}" locked`);
vscode.commands.executeCommand('projectBrainView.refresh');
this.panel.dispose();
} catch (error) {
vscode.window.showErrorMessage(String(error));
}
}

private unlockModule(): void {
try {
this.store.unlockModule(this.module.id);
vscode.window.showInformationMessage(`🔓 Module "${this.module.name}" unlocked`);
vscode.commands.executeCommand('projectBrainView.refresh');
this.panel.dispose();
} catch (error) {
vscode.window.showErrorMessage(String(error));
}
}

private deleteModule(): void {
vscode.window.showWarningMessage(`Delete module "${this.module.name}"?`).then(answer => {
if (answer === 'Yes') {
try {
this.store.deleteModule(this.module.id);
vscode.window.showInformationMessage(`🗑️ Module deleted`);
vscode.commands.executeCommand('projectBrainView.refresh');
this.panel.dispose();
} catch (error) {
vscode.window.showErrorMessage(String(error));
}
}
});
}

private updateStatus(status: string): void {
try {
this.store.updateModule(this.module.id, { status: status as any });
vscode.window.showInformationMessage(`Status updated to ${status}`);
vscode.commands.executeCommand('projectBrainView.refresh');
this.panel.dispose();
} catch (error) {
vscode.window.showErrorMessage(String(error));
}
}

private update(): void {
const history = this.store.getHistory().filter(h => h.targetId === this.module.id);
const decisions = this.store.getDecisions().filter(d => d.moduleId === this.module.id);
const ideas = this.store.getIdeas().filter(i => i.affectedModules.includes(this.module.id));

const statuses = ['IDEA', 'PLANNED', 'IN_PROGRESS', 'REVIEW', 'DONE', 'LOCKED', 'ARCHIVED'];
const statusOptions = statuses.map(s => 
s === this.module.status ? `<option value="${s}" selected>${s}</option>` : `<option value="${s}">${s}</option>`
).join('');

this.panel.webview.html = `
<!DOCTYPE html>
<html>
<head>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background: #0f1419; color: #e7e9ea; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h1 { color: #fff; font-size: 1.4em; }
.locked-badge { background: #4d0000; color: #ff6b6b; padding: 4px 10px; border-radius: 4px; font-size: 0.8em; }
.progress-bar { background: #333; border-radius: 5px; height: 20px; margin: 10px 0; }
.progress-fill { background: #007acc; border-radius: 5px; height: 20px; transition: width 0.3s; }
.section { background: #1a1a2e; padding: 15px; margin: 10px 0; border-radius: 10px; }
.section h3 { margin-top: 0; color: #fff; font-size: 1em; margin-bottom: 10px; }
.item { padding: 8px 0; border-bottom: 1px solid #333; }
.item:last-child { border-bottom: none; }
.empty { color: #666; font-style: italic; }
.actions { display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap; }
.btn { padding: 10px 15px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 0.9em; }
.btn-lock { background: #4d0000; color: #ff6b6b; }
.btn-unlock { background: #004d00; color: #00ff00; }
.btn-delete { background: #555; color: #fff; }
.btn:hover { opacity: 0.85; }
select { background: #333; color: #fff; padding: 8px; border-radius: 6px; border: 1px solid #444; margin-top: 10px; }
.files-list { font-size: 0.9em; color: #888; }
.files-list span { background: #333; padding: 2px 6px; border-radius: 3px; margin: 2px; display: inline-block; }
</style>
</head>
<body>
<div class="header">
<h1>📦 ${this.module.name}</h1>
${this.module.locked ? '<span class="locked-badge">🔒 LOCKED</span>' : ''}
</div>

<div class="progress-bar">
<div class="progress-fill" style="width: ${this.module.progress}%"></div>
</div>
<p style="color: #888; font-size: 0.9em;">Progress: ${this.module.progress}% | Status: ${this.module.status}</p>

<select onchange="updateStatus(this.value)">
${statusOptions}
</select>

<div class="section">
<h3>📝 Description</h3>
<p>${this.module.description || '<span class="empty">No description</span>'}</p>
</div>

<div class="section">
<h3>📁 Files (${this.module.files.length})</h3>
${this.module.files.length > 0 
? `<div class="files-list">${this.module.files.map(f => `<span>${f}</span>`).join('')}</div>` 
: '<p class="empty">No files linked</p>'}
</div>

<div class="section">
<h3>📋 Ideas (${ideas.length})</h3>
${ideas.length > 0 
? ideas.map(i => `<div class="item"><strong>${i.title}</strong> <small>(${i.status})</small></div>`).join('')
: '<p class="empty">No related ideas</p>'}
</div>

<div class="section">
<h3>🏛️ Decisions (${decisions.length})</h3>
${decisions.length > 0 
? decisions.map(d => `<div class="item"><strong>${d.title}</strong><br><small style="color:#888">${d.description}</small></div>`).join('')
: '<p class="empty">No decisions</p>'}
</div>

<div class="section">
<h3>📜 History</h3>
${history.length > 0 
? history.slice(0, 5).map(h => `<div class="item"><strong>${h.action}</strong>: ${h.description} <small>(${new Date(h.timestamp).toLocaleDateString()})</small></div>`).join('')
: '<p class="empty">No history</p>'}
</div>

<div class="actions">
${this.module.locked 
? `<button class="btn btn-unlock" onclick="unlock()">🔓 Unlock</button>`
: `<button class="btn btn-lock" onclick="lock()">🔒 Lock</button>`
}
<button class="btn btn-delete" onclick="del()">🗑️ Delete</button>
</div>

<script>
const vscode = acquireVsCodeApi();
function lock() { vscode.postMessage({ command: 'lock' }); }
function unlock() { vscode.postMessage({ command: 'unlock' }); }
function del() { if (confirm('Delete this module?')) vscode.postMessage({ command: 'delete' }); }
function updateStatus(s) { vscode.postMessage({ command: 'updateStatus', status: s }); }
</script>
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
