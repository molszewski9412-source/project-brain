import * as vscode from "vscode";
import { ProjectScanner } from "../services/ProjectScanner";
import { OllamaClient } from "../ai/OllamaClient";
import { ProjectArchitectPrompt } from "../ai/ProjectArchitectPrompt";
import { JSONResponseParser, ParsedAnalysis } from "../ai/JSONResponseParser";
import { BrainStore } from "../storage/BrainStore";
import { ArchitectureProposalPanel, ModuleProposal } from "../panels/ArchitectureProposalPanel";

export async function analyzeProject() {
try {
// Check if brain is initialized
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

vscode.window.showInformationMessage("🤖 AI analyzing architecture...");

const ai = new OllamaClient();
const prompt = ProjectArchitectPrompt.build(scan);
const result = await ai.ask(prompt);

if (!result.success) {
vscode.window.showErrorMessage(
"Project analysis failed: " + result.error
);
return;
}

// Parse AI response
const parsed = JSONResponseParser.parse(result.content);

if (parsed.modules.length === 0) {
vscode.window.showInformationMessage(
"🤖 AI didn't find any modules to propose"
);
return;
}

// Show proposal panel for user approval
const proposals: ModuleProposal[] = parsed.modules.map((m) => ({
name: m.name,
description: m.description,
status: m.status,
files: m.files || [],
dependsOn: m.dependsOn || [],
}));

// Create proposal panel
ArchitectureProposalPanel.createOrShow(proposals, async () => {
// User approved - save to brain
const brainStore = new BrainStore();
brainStore.setTechnologyStack(scan.technologies);
brainStore.setConfigFiles(scan.configFiles);
brainStore.importFromAI({
modules: parsed.modules,
risks: parsed.risks,
roadmap: parsed.roadmap,
});

vscode.window.showInformationMessage(
`✅ Added ${parsed.modules.length} modules to Project Brain`
);

// Refresh providers
vscode.commands.executeCommand("projectBrainView.refresh");
vscode.commands.executeCommand("projectBrainDashboard.refresh");
});

} catch (error) {
vscode.window.showErrorMessage(
"Project analysis error: " + String(error)
);
}
}
