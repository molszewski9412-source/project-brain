import * as vscode from 'vscode';

import { SimpleProjectProvider } from './providers/SimpleProjectProvider';
import { ModuleCardPanel } from './panels/ModuleCardPanel';
import { InitializePanel } from './panels/InitializePanel';
import { ProposalPanel } from './panels/ProposalPanel';
import { AIWorkflowKanban } from './panels/AIWorkflowKanban';
import { addDecision } from './commands/addDecision';
import { analyzeModule } from './commands/analyzeModule';
import { analyzeProject } from './commands/analyzeProject';
import { BrainStore } from './storage/BrainStore';

export function activate(context: vscode.ExtensionContext) {
    console.log('🧠 Project Brain activated');

    const provider = new SimpleProjectProvider();

    // === TREE VIEW ===
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('projectBrainView', provider)
    );

    // === PROJECT COMMANDS ===

    // Add Module (manual)
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.addModule', async () => {
            try {
                const store = new BrainStore();
                
                const name = await vscode.window.showInputBox({
                    prompt: "Module name"
                });
                if (!name) return;
                
                const description = await vscode.window.showInputBox({
                    prompt: "Description (optional)"
                });
                
                store.addModule({
                    name,
                    description: description || '',
                    status: 'IDEA',
                    progress: 0,
                    locked: false,
                    files: [],
                    dependsOn: [],
                    position: { x: 0, y: 0 }
                });
                
                vscode.window.showInformationMessage(`✅ Module "${name}" added`);
                vscode.commands.executeCommand('projectBrainView.refresh');
            } catch (error) {
                vscode.window.showErrorMessage(String(error));
            }
        })
    );

    // Initialize Project
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.createProject', () => {
            InitializePanel.createOrShow();
        })
    );

    // Initialize Wizard Submit
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.initializeWizardSubmit', async (data: { mode: string }) => {
            try {
                const store = new BrainStore();
                const projectName = vscode.workspace.name || 'My Project';
                store.initialize(projectName, '');
                vscode.window.showInformationMessage("✅ Project Brain initialized!");
                // Refresh tree view
                vscode.commands.executeCommand('projectBrainView.refresh');
            } catch (error) {
                vscode.window.showErrorMessage("Initialization error: " + String(error));
            }
        })
    );

    // Analyze Project
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.analyzeProject', async () => {
            try {
                await analyzeProject();
                provider.refresh();
            } catch (error) {
                vscode.window.showErrorMessage("Analysis error: " + String(error));
            }
        })
    );

    // Open Module
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.openModule', (module) => {
            ModuleCardPanel.createOrShow(module);
        })
    );

    // Add Decision
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.addDecision', (moduleId) => {
            addDecision(moduleId);
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

    // === KANBAN COMMANDS ===

    // Open AI Workflow Kanban
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.openKanban', () => {
            AIWorkflowKanban.createOrShow();
        })
    );

    // Refresh
    context.subscriptions.push(
        vscode.commands.registerCommand('projectBrainView.refresh', () => provider.refresh())
    );

    console.log('✅ Project Brain ready');
}

export function deactivate() {}
