import * as vscode from "vscode";
import { ProjectScanner } from "../services/ProjectScanner";
import { OllamaClient } from "../ai/OllamaClient";
import { ProjectArchitectPrompt } from "../ai/ProjectArchitectPrompt";
import { JSONResponseParser } from "../ai/JSONResponseParser";
import { BrainStore } from "../storage/BrainStore";
import { AnalysisResultsPanel } from "../panels/AnalysisResultsPanel";

interface AnalysisItem {
    type: 'module' | 'idea' | 'risk';
    title: string;
    description: string;
    details?: string;
}

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
            vscode.window.showInformationMessage(
                "🤖 AI didn't find any modules. Try running with more context."
            );
            return;
        }

        // Build items for results panel
        const items: AnalysisItem[] = [];

        // Add modules
        for (const m of parsed.modules) {
            items.push({
                type: 'module',
                title: m.name,
                description: m.description || 'Suggested module for your project',
                details: m.files ? `Files: ${m.files.join(', ')}\n\nDependencies: ${(m.dependsOn || []).join(', ') || 'none'}` : undefined
            });
        }

        // Add risks
        for (const r of parsed.risks || []) {
            items.push({
                type: 'risk',
                title: r.title,
                description: r.description || 'Potential issue to consider',
                details: r.mitigation ? `Mitigation: ${r.mitigation}` : undefined
            });
        }

        // Add ideas from roadmap
        for (const idea of parsed.roadmap || []) {
            items.push({
                type: 'idea',
                title: idea.title,
                description: idea.description || 'Suggested improvement',
                details: `Order: ${idea.order}`
            });
        }

        // Show results panel
        AnalysisResultsPanel.createOrShow(items);

        vscode.commands.executeCommand("projectBrainView.refresh");

    } catch (error) {
        vscode.window.showErrorMessage("Project analysis error: " + String(error));
        console.error("Analysis error:", error);
    }
}
