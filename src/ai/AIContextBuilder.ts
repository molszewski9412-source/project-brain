/**
 * AIContextBuilder - Builds context for AI
 */
import { BrainStore } from "../storage/BrainStore";

export interface AIRequest {
    purpose: "analyze" | "suggest" | "implement" | "review" | "explain";
    question?: string;
    targetModuleId?: string;
}

export class AIContextBuilder {
    private store: BrainStore;

    constructor() {
        this.store = new BrainStore();
    }

    buildContext(request: AIRequest): string {
        let ctx = "# Project Brain Context\n\n";
        ctx += "**Purpose:** " + request.purpose + "\n";
        ctx += "**Project:** " + this.store.getProjectName() + "\n\n";
        
        // Rules
        ctx += "## IMPORTANT RULES:\n";
        ctx += "1. Some modules are LOCKED - do NOT modify them\n";
        ctx += "2. Some decisions are FINAL - respect the rationale\n";
        ctx += "3. NEVER break working functionality\n\n";
        
        // Project Overview
        const modules = this.store.getModules();
        const stats = this.store.getStats();
        ctx += "## Project Overview\n";
        ctx += "- Total Modules: " + modules.length + "\n";
        ctx += "- Completed: " + modules.filter(m => m.status === "DONE").length + "\n";
        ctx += "- Locked: " + modules.filter(m => m.locked).length + "\n\n";
        
        // Modules
        ctx += "## Modules\n";
        for (const m of modules) {
            const status = m.locked ? "🔒 LOCKED" : m.status;
            ctx += "- **" + m.name + "** [" + status + "]: " + (m.description || "No description") + "\n";
        }
        ctx += "\n";
        
        // Protected Items
        const aiCtx = this.store.getAIContext();
        ctx += "## 🔒 PROTECTED ITEMS\n";
        ctx += "Do NOT modify these modules:\n";
        for (const id of aiCtx.protectedModules) {
            const m = this.store.getModule(id);
            if (m) {
                ctx += "- " + m.name + "\n";
            }
        }
        ctx += "\n";
        
        // Recent Changes
        if (aiCtx.recentChanges.length > 0) {
            ctx += "## Recent Changes\n";
            for (const change of aiCtx.recentChanges.slice(0, 5)) {
                ctx += "- " + change.what + ": " + change.why + "\n";
            }
            ctx += "\n";
        }
        
        // User Question
        if (request.question) {
            ctx += "## User Question\n";
            ctx += request.question + "\n";
            ctx += "\nRemember: NEVER modify LOCKED modules!\n";
        }
        
        return ctx;
    }
}
