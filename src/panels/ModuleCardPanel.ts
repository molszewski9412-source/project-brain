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
case 'updateDescription':
this.updateDescription(msg.description);
break;
case 'addFile':
this.addFile(msg.file);
break;
case 'removeFile':
this.removeFile(msg.file);
break;
}
});
}

private updateDescription(description: string): void {
try {
this.store.updateModule(this.module.id, { description });
vscode.window.showInformationMessage("Description updated");
vscode.commands.executeCommand('projectBrainView.refresh');
} catch (error) {
vscode.window.showErrorMessage(String(error));
}
}

private addFile(file: string): void {
if (!file || this.module.files.includes(file)) return;
try {
const newFiles = [...this.module.files, file];
this.store.updateModule(this.module.id, { files: newFiles });
vscode.window.showInformationMessage(`Added file: ${file}`);
vscode.commands.executeCommand('projectBrainView.refresh');
} catch (error) {
vscode.window.showErrorMessage(String(error));
}
}

private removeFile(file: string): void {
try {
const newFiles = this.module.files.filter(f => f !== file);
this.store.updateModule(this.module.id, { files: newFiles });
vscode.window.showInformationMessage(`Removed file: ${file}`);
vscode.commands.executeCommand('projectBrainView.refresh');
} catch (error) {
vscode.window.showErrorMessage(String(error));
}
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
.btn-edit { background: #0079bf; color: #fff; }
.btn:hover { opacity: 0.85; }
select { background: #333; color: #fff; padding: 8px; border-radius: 6px; border: 1px solid #444; margin-top: 10px; }
textarea { width: 100%; min-height: 80px; background: #333; color: #fff; border: 1px solid #444; border-radius: 6px; padding: 10px; margin-top: 5px; resize: vertical; }
input[type="text"] { width: 100%; background: #333; color: #fff; border: 1px solid #444; border-radius: 6px; padding: 8px; margin-top: 5px; }
.files-list { font-size: 0.9em; color: #888; display: flex; flex-wrap: wrap; gap: 5px; }
.file-tag { background: #333; padding: 4px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 5px; }
.file-tag button { background: none; border: none; color: #888; cursor: pointer; padding: 0; font-size: 1em; }
.file-tag button:hover { color: #ff6b6b; }
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
<textarea id="descInput" placeholder="Enter description...">${this.module.description || ''}</textarea>
<button class="btn btn-edit" style="margin-top:10px" onclick="saveDesc()">💾 Save Description</button>
</div>

<div class="section">
<h3>📁 Files (${this.module.files.length})</h3>
<div style="margin-bottom: 10px;">
<input type="text" id="fileInput" placeholder="Enter file path...">
<button class="btn btn-edit" style="margin-top:5px" onclick="addFile()">➕ Add File</button>
</div>
${this.module.files.length > 0 
? `<div class="files-list">${this.module.files.map(f => `<span class="file-tag">${f}<button onclick="removeFile('${f}')">×</button></span>`).join('')}</div>` 
: '<p class="empty">No files linked</p>'}
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
function saveDesc() { 
    const desc = document.getElementById('descInput').value;
    vscode.postMessage({ command: 'updateDescription', description: desc });
}
function addFile() {
    const file = document.getElementById('fileInput').value.trim();
    if (file) {
        vscode.postMessage({ command: 'addFile', file: file });
        document.getElementById('fileInput').value = '';
    }
}
function removeFile(f) { vscode.postMessage({ command: 'removeFile', file: f }); }
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
