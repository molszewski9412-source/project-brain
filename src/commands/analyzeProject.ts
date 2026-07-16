import * as vscode from "vscode";
import { ProjectScanner } from "../services/ProjectScanner";
import { OllamaClient } from "../ai/OllamaClient";
import { ProjectArchitectPrompt } from "../ai/ProjectArchitectPrompt";
import { JSONResponseParser } from "../ai/JSONResponseParser";
import { BrainStore } from "../storage/BrainStore";
import { AIWorkflowKanban } from "../panels/AIWorkflowKanban";

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

        // Check if project is empty
        if (scan.files.length === 0) {
            vscode.window.showInformationMessage(
                "📝 Project is empty! Add files or manually create tasks in the Kanban."
            );
            AIWorkflowKanban.createOrShow();
            return;
        }

        vscode.window.showInformationMessage("🤖 AI analyzing architecture...");

        const ai = new OllamaClient();
        const prompt = ProjectArchitectPrompt.build(scan);
        const result = await ai.ask(prompt);

        if (!result.success) {
            vscode.window.showErrorMessage("Project analysis failed: " + result.error);
            return;
        }

        const parsed = JSONResponseParser.parse(result.content);

        if (parsed.modules.length === 0 && (!parsed.roadmap || parsed.roadmap.length === 0)) {
            vscode.window.showInformationMessage(
                "🤖 AI didn't find clear modules. Add tasks manually in the Kanban."
            );
            AIWorkflowKanban.createOrShow();
            return;
        }

        // Add all results directly to BACKLOG
        let addedCount = 0;

        // Add modules as tasks
        for (const m of parsed.modules) {
            store.addIdea({
                title: m.name,
                description: (m.description || 'Suggested module') + 
                    (m.files && m.files.length > 0 ? '\n\n📁 Files: ' + m.files.join(', ') : ''),
                tags: ['module', 'ai-suggested'],
                affectedModules: [],
                status: 'BACKLOG'
            });
            addedCount++;
        }

        // Add risks as tasks
        for (const r of parsed.risks || []) {
            store.addIdea({
                title: `⚠️ ${r.title}`,
                description: (r.description || 'Potential issue') + 
                    (r.mitigation ? '\n\n💡 Mitigation: ' + r.mitigation : ''),
                tags: ['risk', 'ai-suggested'],
                affectedModules: [],
                status: 'BACKLOG'
            });
            addedCount++;
        }

        // Add roadmap items as tasks
        for (const idea of parsed.roadmap || []) {
            store.addIdea({
                title: idea.title,
                description: idea.description || 'Suggested improvement',
                tags: ['roadmap', 'ai-suggested'],
                affectedModules: [],
                status: 'BACKLOG'
            });
            addedCount++;
        }

        vscode.window.showInformationMessage(`✅ AI found ${addedCount} items - added to Backlog!`);
        
        // Open Kanban to show results
        AIWorkflowKanban.createOrShow();
        vscode.commands.executeCommand("projectBrainView.refresh");

    } catch (error) {
        vscode.window.showErrorMessage("Project analysis error: " + String(error));
        console.error("Analysis error:", error);
    }
}
