import * as vscode from "vscode";
import { ProjectScanner } from "../services/ProjectScanner";
import { OllamaClient } from "../ai/OllamaClient";
import { ProjectArchitectPrompt } from "../ai/ProjectArchitectPrompt";
import { JSONResponseParser } from "../ai/JSONResponseParser";
import { BrainStore } from "../storage/BrainStore";
import { ArchitectureProposalPanel, ModuleProposal } from "../panels/ArchitectureProposalPanel";

export async function analyzeProject() {
try {
const store = new BrainStore();
if (!store.isInitialized()) {
vscode.window.showErrorMessage(
"🧠 Please initialize Project Brain first (Ctrl+Shift+P → Project Brain: Initialize Project)"
);
return;
}

vscode.window.showInformationMessage("🔍 Scanning project...");

const scanner = new ProjectScanner();
const scan = await scanner.scan();

console.log("=== SCAN RESULT ===");
console.log("Files:", scan.files.length);
console.log("Technologies:", scan.technologies);

vscode.window.showInformationMessage("🤖 AI analyzing architecture...");

const ai = new OllamaClient();
const prompt = ProjectArchitectPrompt.build(scan);
const result = await ai.ask(prompt);

console.log("=== AI RESULT ===");
console.log("Success:", result.success);
console.log("Error:", result.error);
console.log("Content length:", result.content.length);
console.log("Content preview:", result.content.substring(0, 500));

if (!result.success) {
vscode.window.showErrorMessage("Project analysis failed: " + result.error);
return;
}

const parsed = JSONResponseParser.parse(result.content);

console.log("=== PARSED ===");
console.log("Modules:", parsed.modules.length);
console.log("Risks:", parsed.risks.length);

if (parsed.modules.length === 0) {
vscode.window.showInformationMessage(
"🤖 AI didn't find any modules. Check console for details."
);

// Show debug panel
const panel = vscode.window.createWebviewPanel(
"projectBrainDebug",
"🔧 AI Response Debug",
vscode.ViewColumn.Two,
{}
);
panel.webview.html = `
<html><body style="font-family: monospace; padding: 20px;">
<h2>AI Raw Response</h2>
<pre style="background: #eee; padding: 10px; overflow: auto; max-height: 400px;">${result.content.replace(/</g, '&lt;')}</pre>
<h2>Parsed Result</h2>
<pre style="background: #efe; padding: 10px; overflow: auto;">${JSON.stringify(parsed, null, 2).replace(/</g, '&lt;')}</pre>
</body></html>
`;
return;
}

const proposals: ModuleProposal[] = parsed.modules.map((m) => ({
name: m.name,
description: m.description,
status: m.status,
files: m.files || [],
dependsOn: m.dependsOn || [],
}));

ArchitectureProposalPanel.createOrShow(proposals, async () => {
const brainStore = new BrainStore();
brainStore.setTechnologyStack(scan.technologies);
brainStore.importFromAI({
modules: parsed.modules,
risks: parsed.risks,
roadmap: parsed.roadmap,
});

vscode.window.showInformationMessage(
`✅ Added ${parsed.modules.length} modules to Project Brain`
);

vscode.commands.executeCommand("projectBrainView.refresh");
vscode.commands.executeCommand("projectBrainDashboard.refresh");
});

} catch (error) {
vscode.window.showErrorMessage("Project analysis error: " + String(error));
console.error("Analysis error:", error);
}
}
