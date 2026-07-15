import * as vscode from "vscode";
import { BrainStore } from "../storage/BrainStore";

export function initializeProject() {
try {
const store = new BrainStore();

if (store.isInitialized()) {
vscode.window.showInformationMessage(
"🧠 Project Brain is already initialized"
);
return;
}

const workspace = vscode.workspace.workspaceFolders?.[0];
const projectName = workspace?.name || "Unknown Project";

store.initialize(projectName, "Local AI assisted project memory and architecture system");

// Add default Core module
store.addModule({
name: "Core System",
description: "Project Brain foundation and memory system",
status: "LOCKED",
progress: 100,
locked: true,
files: [],
dependsOn: [],
position: { x: 0, y: 0 },
});

vscode.window.showInformationMessage(
"🧠 Project Brain initialized successfully"
);
} catch (error) {
vscode.window.showErrorMessage(
"Project Brain initialization error: " + String(error)
);
}
}
