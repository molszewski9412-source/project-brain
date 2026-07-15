import * as vscode from 'vscode';

import { ProjectBrainProvider } from './providers/ProjectBrainProvider';
import { KnowledgeProvider } from './providers/KnowledgeProvider';
import { ProjectDashboardProvider } from './providers/ProjectDashboardProvider';

import { initializeProject } from './commands/initializeProject';
import { ModuleCardPanel } from './panels/ModuleCardPanel';
import { InitializePanel } from './panels/InitializePanel';
import { ProposalPanel } from './panels/ProposalPanel';
import { KanbanPanel } from './panels/KanbanPanel';
import { AIWorkflowKanban } from './panels/AIWorkflowKanban';
import { addDecision } from './commands/addDecision';
import { analyzeModule } from './commands/analyzeModule';
import { analyzeProject } from './commands/analyzeProject';

import { BrainStore } from './storage/BrainStore';

export function activate(context: vscode.ExtensionContext) {
console.log('🧠 Project Brain activated');

const provider = new ProjectBrainProvider();
const dashboardProvider = new ProjectDashboardProvider();
const knowledgeProvider = new KnowledgeProvider();

// Register Tree Views
context.subscriptions.push(
vscode.window.registerTreeDataProvider('projectBrainView', provider)
);

context.subscriptions.push(
vscode.window.registerTreeDataProvider('projectBrainDashboard', dashboardProvider)
);

context.subscriptions.push(
vscode.window.registerTreeDataProvider('projectBrainKnowledgeView', knowledgeProvider)
);

// Initialize Project
context.subscriptions.push(
vscode.commands.registerCommand('project-brain.createProject', () => {
InitializePanel.createOrShow();
})
);

// Initialize Result
context.subscriptions.push(
vscode.commands.registerCommand('project-brain.initializeWizardSubmit', async (data) => {
console.log("Initialize data:", data);
initializeProject();
provider.refresh();
dashboardProvider.refresh();
knowledgeProvider.refresh();
vscode.window.showInformationMessage("🧠 Project Brain initialized");
})
);

// Analyze Project - SINGLE REGISTRATION
context.subscriptions.push(
vscode.commands.registerCommand('project-brain.analyzeProject', async () => {
try {
await analyzeProject();
provider.refresh();
dashboardProvider.refresh();
} catch (error) {
vscode.window.showErrorMessage("Analysis error: " + String(error));
}
})
);

// Open Module
context.subscriptions.push(
vscode.commands.registerCommand('project-brain.openModule', (module) => {
try {
const store = new BrainStore();
ModuleCardPanel.createOrShow(module);
} catch {
ModuleCardPanel.createOrShow(module);
}
})
);

// Update Module
context.subscriptions.push(
vscode.commands.registerCommand('project-brain.updateModule', (module) => {
try {
const store = new BrainStore();
store.updateModule(module.id, module);
provider.refresh();
dashboardProvider.refresh();
vscode.window.showInformationMessage("✅ Module updated");
} catch (error) {
vscode.window.showErrorMessage("Update error: " + String(error));
}
})
);

// Add Decision
context.subscriptions.push(
vscode.commands.registerCommand('project-brain.addDecision', (moduleId) => {
addDecision(moduleId);
})
);

// Add Idea
context.subscriptions.push(
vscode.commands.registerCommand('project-brain.addIdea', async () => {
const title = await vscode.window.showInputBox({
prompt: "Enter idea title",
placeHolder: "My great idea"
});
if (title) {
try {
const store = new BrainStore();
store.addIdea({
title,
description: "",
affectedModules: [],
tags: [], status: "BACKLOG"
});
dashboardProvider.refresh();
vscode.window.showInformationMessage("💡 Idea added");
} catch (error) {
vscode.window.showErrorMessage("Error: " + String(error));
}
}
})
);

// Analyze Module
context.subscriptions.push(
vscode.commands.registerCommand('project-brain.analyzeModule', async (moduleId) => {
await analyzeModule(moduleId);
provider.refresh();
})
);

// Open Proposal
context.subscriptions.push(
vscode.commands.registerCommand('project-brain.openProposal', (proposal) => {
ProposalPanel.createOrShow(proposal);
})
);

// Open Map
context.subscriptions.push(
vscode.commands.registerCommand('project-brain.openMap', () => {
vscode.window.showInformationMessage('🗺 Architecture Map coming soon');
})
);

// Refresh commands
context.subscriptions.push(
vscode.commands.registerCommand('projectBrainView.refresh', () => provider.refresh())
);

context.subscriptions.push(
vscode.commands.registerCommand('projectBrainDashboard.refresh', () => dashboardProvider.refresh())
);

// Open Kanban Board
context.subscriptions.push(
vscode.commands.registerCommand('project-brain.openKanban', () => {
KanbanPanel.createOrShow();
})
);

// Open AI Workflow Kanban (Smart workflow)
context.subscriptions.push(
vscode.commands.registerCommand('project-brain.openAIWorkflow', () => {
AIWorkflowKanban.createOrShow();
})
);

}

export function deactivate() {}
