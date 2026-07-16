import * as vscode from 'vscode';

import { SimpleProjectProvider } from './providers/SimpleProjectProvider';
import { ModuleCardPanel } from './panels/ModuleCardPanel';
import { InitializePanel } from './panels/InitializePanel';
import { ProposalPanel } from './panels/ProposalPanel';
import { AIWorkflowKanban } from './panels/AIWorkflowKanban';
import { CanvasPanel } from './panels/CanvasPanel';
import { CodeGeneratorPanel } from './panels/CodeGeneratorPanel';
import { ProjectCreatorPanel } from './panels/ProjectCreatorPanel';
import { AIReviewPanel } from './services/AIReviewService';
import { AIPlannerPanel } from './panels/AIPlannerPanel';
import { TimelinePanel } from './panels/TimelinePanel';
import { AIChatPanel } from './panels/AIChatPanel';
import { RefactorPanel } from './panels/RefactorPanel';
import { MarketplacePanel } from './panels/MarketplacePanel';
import { PromptEnginePanel } from './panels/PromptEnginePanel';
import { DependencyGraphPanel } from './panels/DependencyGraphPanel';
import { TestRunnerPanel } from './panels/TestRunnerPanel';
import { MonitoringPanel } from './panels/MonitoringPanel';
import { DocumentationPanel } from './panels/DocumentationPanel';
import { MultiAgentPanel } from './panels/MultiAgentPanel';
import { DeploymentPanel } from './panels/DeploymentPanel';
import { TeamPanel } from './panels/TeamPanel';
import { SmartSearchPanel } from './panels/SmartSearchPanel';
import { AILearningPanel } from './panels/AILearningPanel';
import { ProjectSimulatorPanel } from './panels/ProjectSimulatorPanel';
import { ReleasePanel } from './panels/ReleasePanel';
import { DecisionLearningPanel } from './panels/DecisionLearningPanel';
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

    // === CANVAS COMMANDS ===

    // Open Visual Brain Canvas
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.openCanvas', () => {
            CanvasPanel.createOrShow();
        })
    );

    // Open Code Generator
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.generateCode', () => {
            CodeGeneratorPanel.createOrShow();
        })
    );

    // Open Project Creator
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.createProject', () => {
            ProjectCreatorPanel.createOrShow();
        })
    );

    // Open AI Code Review
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.reviewCode', async () => {
            const panel = AIReviewPanel.createOrShow();
            await panel.runFullReview();
        })
    );

    // Open AI Planner
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.openPlanner', () => {
            AIPlannerPanel.createOrShow();
        })
    );

    // Open Timeline
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.openTimeline', () => {
            TimelinePanel.createOrShow();
        })
    );

    // Open AI Chat
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.openChat', () => {
            AIChatPanel.createOrShow();
        })
    );

    // Open Refactor
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.refactor', () => {
            RefactorPanel.createOrShow();
        })
    );

    // Open Marketplace
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.marketplace', () => {
            MarketplacePanel.createOrShow();
        })
    );

    // Open Prompt Engine
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.promptEngine', () => {
            PromptEnginePanel.createOrShow();
        })
    );

    // Open Dependency Graph
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.dependencyGraph', () => {
            DependencyGraphPanel.createOrShow();
        })
    );

    // Open Test Runner
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.testRunner', () => {
            TestRunnerPanel.createOrShow();
        })
    );

    // Open Monitoring
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.monitoring', () => {
            MonitoringPanel.createOrShow();
        })
    );

    // Open Documentation
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.documentation', () => {
            DocumentationPanel.createOrShow();
        })
    );

    // Open Multi Agent
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.multiAgent', () => {
            MultiAgentPanel.createOrShow();
        })
    );

    // Open Deployment
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.deployment', () => {
            DeploymentPanel.createOrShow();
        })
    );

    // Open Team
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.team', () => {
            TeamPanel.createOrShow();
        })
    );

    // Open Smart Search
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.smartSearch', () => {
            SmartSearchPanel.createOrShow();
        })
    );

    // Open AI Learning
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.aiLearning', () => {
            AILearningPanel.createOrShow();
        })
    );

    // Open Project Simulator
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.simulator', () => {
            ProjectSimulatorPanel.createOrShow();
        })
    );

    // Open Release Panel
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.release', () => {
            ReleasePanel.createOrShow();
        })
    );

    // Open Decision Learning
    context.subscriptions.push(
        vscode.commands.registerCommand('project-brain.decisionLearning', () => {
            DecisionLearningPanel.createOrShow();
        })
    );

    // Refresh
    context.subscriptions.push(
        vscode.commands.registerCommand('projectBrainView.refresh', () => provider.refresh())
    );

    console.log('✅ Project Brain ready');
}

export function deactivate() {}
