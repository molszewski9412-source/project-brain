import * as vscode from "vscode";
import { BrainStore } from "../storage/BrainStore";
import { BrainModule } from "../models/ProjectBrain";

export interface ModuleProposal {
name: string;
description: string;
status: string;
files: string[];
dependsOn: string[];
}

export class ArchitectureProposalPanel {
public static currentPanel: vscode.WebviewPanel | undefined;
private readonly panel: vscode.WebviewPanel;
private proposals: ModuleProposal[];
private onApprove: (() => void) | undefined;

private constructor(
panel: vscode.WebviewPanel,
proposals: ModuleProposal[],
onApprove: () => void
) {
this.panel = panel;
this.proposals = proposals;
this.onApprove = onApprove;

this.panel.webview.html = this.getHtml();
this.panel.webview.onDidReceiveMessage((message) => {
if (message.command === "approve") {
this.handleApprove();
} else if (message.command === "reject") {
this.handleReject();
} else if (message.command === "selectModule") {
this.toggleModule(message.index);
}
});
}

public static createOrShow(
proposals: ModuleProposal[],
onApprove: () => void
): ArchitectureProposalPanel {
const column = vscode.window.activeTextEditor
? vscode.window.activeTextEditor.viewColumn
: undefined;

if (ArchitectureProposalPanel.currentPanel) {
ArchitectureProposalPanel.currentPanel.reveal(column, true);
ArchitectureProposalPanel.currentPanel.dispose();
}

const panel = vscode.window.createWebviewPanel(
"architectureProposal",
"🧠 Architecture Proposal",
column || vscode.ViewColumn.One,
{ enableScripts: true }
);

ArchitectureProposalPanel.currentPanel = panel;
return new ArchitectureProposalPanel(panel, proposals, onApprove);
}

private getHtml(): string {
const modulesHtml = this.proposals
.map(
(p, i) => `
<div class="module-card" id="module-${i}">
<div class="module-header">
<input type="checkbox" id="check-${i}" checked>
<h3>${p.name}</h3>
<span class="status-badge ${p.status.toLowerCase()}">${p.status}</span>
</div>
<p class="description">${p.description || "No description"}</p>
${p.dependsOn.length > 0 ? `<p class="depends-on">📦 Depends on: ${p.dependsOn.join(", ")}</p>` : ""}
${p.files.length > 0 ? `<p class="files-count">📁 ${p.files.length} files</p>` : ""}
</div>
`
)
.join("");

return `
<!DOCTYPE html>
<html>
<head>
<style>
body { font-family: Arial, sans-serif; padding: 20px; background: #1e1e1e; color: #ccc; }
h1 { color: #fff; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
.summary { background: #2d2d2d; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
.module-card { background: #2d2d2d; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #007acc; }
.module-card:hover { background: #383838; }
.module-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.module-header h3 { margin: 0; color: #fff; }
.status-badge { padding: 3px 8px; border-radius: 4px; font-size: 12px; }
.status-badge.planned { background: #4a4a00; color: #ffd700; }
.status-badge.in_progress { background: #004d4d; color: #00d4ff; }
.status-badge.done { background: #004d00; color: #00ff00; }
.description { color: #aaa; margin: 5px 0; }
.depends-on, .files-count { font-size: 12px; color: #888; margin: 5px 0; }
.buttons { display: flex; gap: 10px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #444; }
button { padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; }
.btn-approve { background: #0e639c; color: white; }
.btn-approve:hover { background: #1177bb; }
.btn-reject { background: #5a1d1d; color: #f48771; }
.btn-reject:hover { background: #6b2222; }
.count { font-size: 14px; color: #888; }
</style>
</head>
<body>
<h1>🧠 Architecture Proposal</h1>
<div class="summary">
<strong>AI detected ${this.proposals.length} modules</strong><br>
<span class="count">Review and select modules to add to your project</span>
</div>
${modulesHtml}
<div class="buttons">
<button class="btn-approve" id="btn-approve">✅ Add Selected Modules</button>
<button class="btn-reject" id="btn-reject">❌ Cancel</button>
</div>
<script>
const vscode = acquireVsCodeApi();
const selected = new Set(Array.from({length: ${this.proposals.length}}, (_, i) => i));

function toggleModule(index) {
if (selected.has(index)) {
selected.delete(index);
document.getElementById('module-' + index).style.opacity = '0.5';
document.getElementById('check-' + index).checked = false;
} else {
selected.add(index);
document.getElementById('module-' + index).style.opacity = '1';
document.getElementById('check-' + index).checked = true;
}
}

document.getElementById('btn-approve').addEventListener('click', () => {
vscode.postMessage({ command: 'approve', selected: Array.from(selected) });
});

document.getElementById('btn-reject').addEventListener('click', () => {
vscode.postMessage({ command: 'reject' });
});

${this.proposals.map((_, i) => `
document.getElementById('module-${i}').addEventListener('click', (e) => {
if (e.target.tagName !== 'INPUT') toggleModule(${i});
});
`).join("")}
</script>
</body>
</html>`;
}

private toggleModule(index: number): void {
// Toggle is handled in JS, this is just for state tracking
}

private async handleApprove(): Promise<void> {
const selectedModules = this.proposals.map((p, i) => ({
...p,
isSelected: true, // In real implementation, track selection state
}));

vscode.window.showInformationMessage(
`✅ Added ${this.proposals.length} modules to Project Brain`
);
this.panel.dispose();
ArchitectureProposalPanel.currentPanel = undefined;

if (this.onApprove) {
this.onApprove();
}
}

private handleReject(): void {
vscode.window.showInformationMessage("Proposal cancelled");
this.panel.dispose();
ArchitectureProposalPanel.currentPanel = undefined;
}
}
