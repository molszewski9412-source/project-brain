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

vscode.window.showInformationMessage("🤖 AI analyzing architecture...");

const ai = new OllamaClient();
const prompt = ProjectArchitectPrompt.build(scan);
const result = await ai.ask(prompt);

if (!result.success) {
vscode.window.showErrorMessage("Project analysis failed: " + result.error);
return;
}

const parsed = JSONResponseParser.parse(result.content);

if (parsed.modules.length === 0) {
vscode.window.showInformationMessage("🤖 AI didn't find any modules to propose");
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
}
}
