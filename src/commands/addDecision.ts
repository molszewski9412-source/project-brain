import * as vscode from 'vscode';
import { BrainStore } from '../storage/BrainStore';

export async function addDecision(moduleId?: string) {
    const title = await vscode.window.showInputBox({
        prompt: "Decision title"
    });
    if (!title) return;

    const description = await vscode.window.showInputBox({
        prompt: "Description"
    });
    if (!description) return;

    const rationale = await vscode.window.showInputBox({
        prompt: "Why this decision? (rationale)"
    });
    if (!rationale) return;

    let targetModuleId = moduleId;
    if (!targetModuleId) {
        const store = new BrainStore();
        const modules = store.getModules();
        if (modules.length === 0) {
            vscode.window.showWarningMessage("No modules found. Create a module first.");
            return;
        }
        const selected = await vscode.window.showQuickPick(
            modules.map(m => ({ label: m.name, id: m.id })),
            { placeHolder: "Select module for this decision" }
        );
        if (!selected) return;
        targetModuleId = selected.id;
    }

    const store = new BrainStore();
    store.addDecision({
        moduleId: targetModuleId,
        type: "ARCHITECTURE",
        title,
        description,
        rationale,
        alternatives: [],
        status: "PROPOSED",
        createdBy: "USER",
        relatedDecisionIds: [],
        affectedModuleIds: [targetModuleId]
    });

    vscode.window.showInformationMessage("🧩 Decision added");
}
