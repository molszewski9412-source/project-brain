/**
 * BrainStore - Unified storage for Project Brain
 * Includes AI Context management
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

import {
ProjectBrain,
BrainModule,
BrainTask,
BrainIdea,
BrainDecision,
BrainRisk,
BrainRoadmap,
BrainHistory,
BrainLink,
AIContext,
AIPattern,
AIConstraint,
ModuleStatus,
DecisionStatus,
} from "../models/ProjectBrain";
import { BrainEpic, BrainFeature, BrainTask as HierarchyTask } from "../models/Hierarchy";

export class BrainStore {
private brainFile: string = "";
private brain: ProjectBrain;
private initialized: boolean = false;

constructor() {
try {
const workspace = vscode.workspace.workspaceFolders?.[0];
if (!workspace) {
this.brain = this.createDefault();
return;
}

const brainFolder = path.join(workspace.uri.fsPath, ".projectbrain");
if (!fs.existsSync(brainFolder)) {
fs.mkdirSync(brainFolder, { recursive: true });
}

this.brainFile = path.join(brainFolder, "architecture.json");
this.brain = this.load();
this.initialized = true;
} catch (error) {
console.error("BrainStore init error:", error);
this.brain = this.createDefault();
}
}

private getTimestamp(): string {
return new Date().toISOString();
}

private generateId(): string {
return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

private load(): ProjectBrain {
if (this.brainFile && fs.existsSync(this.brainFile)) {
try {
const data = JSON.parse(fs.readFileSync(this.brainFile, "utf8"));
// Migrate to new format with AIContext
if (!data.aiContext) {
data.aiContext = this.createDefaultAIContext();
}
return data;
} catch {
console.warn("Corrupted brain file, creating new...");
}
}
return this.createDefault();
}

save(): void {
if (!this.initialized) return;
this.brain.updatedAt = this.getTimestamp();
this.brain.aiContext.lastContextUpdate = this.getTimestamp();
if (this.brainFile) {
fs.writeFileSync(this.brainFile, JSON.stringify(this.brain, null, 2), "utf8");
}
}

private createDefault(): ProjectBrain {
const workspace = vscode.workspace.workspaceFolders?.[0];
return {
version: "1.1.0",
projectName: workspace?.name || "Unknown Project",
description: "",
rootPath: workspace?.uri.fsPath || "",
initialized: false,
createdAt: this.getTimestamp(),
updatedAt: this.getTimestamp(),
aiContext: this.createDefaultAIContext(),
modules: [],
tasks: [],
ideas: [],
decisions: [],
risks: [],
roadmap: [],
history: [],
links: [],
technologyStack: [],
configFiles: [],
	aiProviders: {},
	defaultAIProvider: "ollama",
};
}

private createDefaultAIContext(): AIContext {
return {
projectSummary: "",
patterns: [],
constraints: [],
protectedModules: [],
protectedFiles: [],
activeDecisions: [],
recentChanges: [],
moduleInsights: {},
lastContextUpdate: this.getTimestamp(),
};
}

// === INITIALIZATION ===

initialize(projectName: string, description: string = ""): void {
const workspace = vscode.workspace.workspaceFolders?.[0];
this.brain = {
...this.createDefault(),
projectName,
description,
rootPath: workspace?.uri.fsPath || "",
initialized: true,
};
this.addHistory("CREATE", "Project", "brain", `Initialized project: ${projectName}`);
this.save();
}

// === HISTORY ===

private addHistory(action: BrainHistory["action"], target: string, targetId: string, description: string): void {
this.brain.history.push({
id: this.generateId(),
action,
target,
targetId,
description,
timestamp: this.getTimestamp(),
});
}

getHistory(): BrainHistory[] {
return (this.brain?.history || []).sort(
(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
);
}

// === AI CONTEXT ===

getAIContext(): AIContext {
return this.brain?.aiContext || this.createDefaultAIContext();
}

updateAIContext(updates: Partial<AIContext>): void {
this.brain.aiContext = { ...this.brain.aiContext, ...updates };
this.save();
}

addPattern(pattern: Omit<AIPattern, "id" | "createdAt">): AIPattern {
const newPattern: AIPattern = {
...pattern,
id: this.generateId(),
createdAt: this.getTimestamp(),
};
this.brain.aiContext.patterns.push(newPattern);
this.save();
return newPattern;
}

addConstraint(constraint: Omit<AIConstraint, "id" | "createdAt">): AIConstraint {
const newConstraint: AIConstraint = {
...constraint,
id: this.generateId(),
createdAt: this.getTimestamp(),
};
this.brain.aiContext.constraints.push(newConstraint);
this.save();
return newConstraint;
}

protectModule(moduleId: string, reason: string): void {
if (!this.brain.aiContext.protectedModules.includes(moduleId)) {
this.brain.aiContext.protectedModules.push(moduleId);
const module = this.getModule(moduleId);
if (module) {
module.locked = true;
}
this.addRecentChange(`Protected module: ${module?.name || moduleId}`, reason);
this.save();
}
}

addRecentChange(what: string, why: string): void {
this.brain.aiContext.recentChanges.unshift({
what,
why,
when: this.getTimestamp(),
});
// Keep only last 20 changes
this.brain.aiContext.recentChanges = this.brain.aiContext.recentChanges.slice(0, 20);
this.save();
}

setModuleInsight(moduleId: string, insight: string): void {
this.brain.aiContext.moduleInsights[moduleId] = insight;
this.save();
}

// === MODULES ===

getModules(): BrainModule[] {
return this.brain?.modules || [];
}

getModule(id: string): BrainModule | undefined {
return this.brain.modules?.find((m) => m.id === id);
}

addModule(module: Omit<BrainModule, "id" | "createdAt" | "updatedAt">): BrainModule {
const newModule: BrainModule = {
...module,
id: this.generateId(),
createdAt: this.getTimestamp(),
updatedAt: this.getTimestamp(),
};
this.brain.modules.push(newModule);
this.addHistory("CREATE", "Module", newModule.id, `Added module: ${newModule.name}`);
this.addRecentChange(`Added module: ${newModule.name}`, "New module created");
this.save();
return newModule;
}

updateModule(id: string, updates: Partial<BrainModule>): BrainModule {
const index = this.brain.modules.findIndex((m) => m.id === id);
if (index === -1) throw new Error(`Module not found: ${id}`);

const module = this.brain.modules[index];

// Check if trying to modify LOCKED module
if (module.locked && !updates.locked) {
throw new Error("Cannot modify LOCKED module. Unlock it first.");
}

this.brain.modules[index] = {
...module,
...updates,
updatedAt: this.getTimestamp(),
};

this.addHistory("UPDATE", "Module", id, `Updated module: ${module.name}`);
this.save();
return this.brain.modules[index];
}

deleteModule(id: string): void {
const module = this.getModule(id);
if (!module) return;

// Check if protected
if (this.brain.aiContext.protectedModules.includes(id)) {
throw new Error("Cannot delete protected module");
}

// Check if locked
if (module.locked) {
throw new Error("Cannot delete LOCKED module. Unlock it first.");
}

this.brain.modules = this.brain.modules.filter((m) => m.id !== id);
this.addHistory("DELETE", "Module", id, `Deleted module: ${module.name}`);
this.save();
}

lockModule(id: string): void {
const module = this.getModule(id);
if (!module) return;
module.locked = true;
module.status = "LOCKED";
this.addHistory("LOCK", "Module", id, `Locked module: ${module.name}`);
this.save();
}

unlockModule(id: string): void {
const module = this.getModule(id);
if (!module) return;
module.locked = false;
if (module.status === "LOCKED") {
module.status = "DONE";
}
this.addHistory("UNLOCK", "Module", id, `Unlocked module: ${module.name}`);
this.save();
}

// === IDEAS ===

getIdeas(): BrainIdea[] {
return this.brain?.ideas || [];
}

addIdea(idea: Omit<BrainIdea, "id" | "createdAt">): BrainIdea {
const newIdea: BrainIdea = {
...idea,
id: this.generateId(),
createdAt: this.getTimestamp(),
};
this.brain.ideas.push(newIdea);
this.addRecentChange(`Added idea: ${newIdea.title}`, "New idea proposed");
this.save();
return newIdea;
}

// === DECISIONS ===

getDecisions(): BrainDecision[] {
return this.brain?.decisions || [];
}

addDecision(decision: Omit<BrainDecision, "id" | "proposedAt">): BrainDecision {
const newDecision: BrainDecision = {
...decision,
id: this.generateId(),
proposedAt: this.getTimestamp(),
};
this.brain.decisions.push(newDecision);
this.brain.aiContext.activeDecisions.push(newDecision.id);
this.save();
return newDecision;
}

approveDecision(decisionId: string, by: string = "USER"): void {
const decision = this.brain.decisions.find((d) => d.id === decisionId);
if (!decision) return;
decision.status = "APPROVED";
decision.resolvedAt = this.getTimestamp();
decision.resolvedBy = by;
this.brain.aiContext.activeDecisions = this.brain.aiContext.activeDecisions.filter(
(id) => id !== decisionId
);
this.addRecentChange(`Approved: ${decision.title}`, decision.rationale);
this.addHistory("APPROVE", "Decision", decisionId, `Approved decision: ${decision.title}`);
this.save();
}

rejectDecision(decisionId: string, by: string = "USER"): void {
const decision = this.brain.decisions.find((d) => d.id === decisionId);
if (!decision) return;
decision.status = "REJECTED";
decision.resolvedAt = this.getTimestamp();
decision.resolvedBy = by;
this.brain.aiContext.activeDecisions = this.brain.aiContext.activeDecisions.filter(
(id) => id !== decisionId
);
this.addHistory("REJECT", "Decision", decisionId, `Rejected decision: ${decision.title}`);
this.save();
}

// === RISKS ===

getRisks(): BrainRisk[] {
return this.brain?.risks || [];
}

// === ROADMAP ===

getRoadmap(): BrainRoadmap[] {
return (this.brain?.roadmap || []).sort((a, b) => a.order - b.order);
}

// === UTILITIES ===

getProjectName(): string {
    return this.brain?.projectName || "Unknown Project";
}

getProjectSummary(): string {
    return this.brain?.aiContext?.projectSummary || this.brain?.projectName || "Unknown Project";
}

getBrain(): ProjectBrain | undefined {
    return this.brain;
}

setTechnologyStack(stack: string[]): void {
this.brain.technologyStack = stack;
this.save();
}

isInitialized(): boolean {
return this.brain?.initialized || false;
}

getStats(): {
modules: number;
tasks: number;
ideas: number;
decisions: number;
risks: number;
roadmap: number;
completedTasks: number;
openRisks: number;
protectedModules: number;
activeDecisions: number;
} {
return {
modules: this.brain?.modules?.length || 0,
tasks: this.brain?.tasks?.length || 0,
ideas: this.brain?.ideas?.length || 0,
decisions: this.brain?.decisions?.length || 0,
risks: this.brain?.risks?.length || 0,
roadmap: this.brain?.roadmap?.length || 0,
completedTasks: (this.brain?.tasks || []).filter((t) => t.status === "DONE").length,
openRisks: (this.brain?.risks || []).filter((r) => r.status === "OPEN").length,
protectedModules: this.brain?.aiContext?.protectedModules?.length || 0,
activeDecisions: this.brain?.aiContext?.activeDecisions?.length || 0,
};
}

importFromAI(data: {
modules?: Array<{
name: string;
description: string;
status?: string;
files?: string[];
dependsOn?: string[];
}>;
risks?: Array<{ title: string; description: string; severity?: string }>;
roadmap?: Array<{ title: string; description: string; order?: number }>;
}): void {
const timestamp = this.getTimestamp();

if (data.modules && data.modules.length > 0) {
this.brain.modules = data.modules.map((m, index) => ({
id: this.generateId(),
name: m.name,
description: m.description || "",
status: (m.status?.toUpperCase().replace(" ", "_")) as ModuleStatus || "PLANNED",
progress: 0,
locked: false,
files: m.files || [],
dependsOn: m.dependsOn || [],
position: { x: index * 250, y: 100 },
createdAt: timestamp,
updatedAt: timestamp,
}));
}

if (data.risks && data.risks.length > 0) {
this.brain.risks = data.risks.map((r) => ({
id: this.generateId(),
title: r.title,
description: r.description || "",
severity: (r.severity?.toUpperCase() as BrainRisk["severity"]) || "MEDIUM",
status: "OPEN" as const,
createdAt: timestamp,
}));
}

if (data.roadmap && data.roadmap.length > 0) {
this.brain.roadmap = data.roadmap.map((r, index) => ({
id: this.generateId(),
title: r.title,
description: r.description || "",
status: "TODO" as const,
dependsOn: [],
taskIds: [],
order: r.order ?? index,
createdAt: timestamp,
updatedAt: timestamp,
}));
}

this.brain.initialized = true;
this.brain.aiContext.projectSummary = "Project with " + this.brain.modules.length + " modules";
this.save();
	}

	deleteIdea(ideaId: string): void {
		this.brain.ideas = this.brain.ideas.filter(i => i.id !== ideaId);
		this.save();
	}

	updateIdeaStatus(ideaId: string, status: string): void {
		const idea = this.brain.ideas.find(i => i.id === ideaId);
		if (idea) {
			(idea as any).status = status;
			this.save();
		}
	}

	// === EPICS (FAZA 6) ===
	private _epics: BrainEpic[] = [];
	
	addEpic(epic: Omit<BrainEpic, "id" | "createdAt" | "updatedAt">): BrainEpic {
		const newEpic: BrainEpic = {
			...epic,
			id: this.generateId(),
			createdAt: this.getTimestamp(),
			updatedAt: this.getTimestamp(),
		};
		this._epics.push(newEpic);
		this.addHistory("CREATE", "Epic", newEpic.id, `Added epic: ${newEpic.title}`);
		this.addRecentChange(`Added epic: ${newEpic.title}`, "New epic created");
		this.save();
		return newEpic;
	}

	getEpics(): BrainEpic[] {
		return this._epics;
	}

	// === FEATURES (FAZA 6) ===
	private _features: BrainFeature[] = [];
	
	addFeature(feature: Omit<BrainFeature, "id" | "createdAt" | "updatedAt">): BrainFeature {
		const newFeature: BrainFeature = {
			...feature,
			id: this.generateId(),
			createdAt: this.getTimestamp(),
			updatedAt: this.getTimestamp(),
		};
		this._features.push(newFeature);
		
		// Link to epic
		const epic = this._epics.find(e => e.id === feature.epicId);
		if (epic) {
			epic.features.push(newFeature.id);
		}
		
		this.addHistory("CREATE", "Feature", newFeature.id, `Added feature: ${newFeature.title}`);
		this.save();
		return newFeature;
	}

	getFeatures(): BrainFeature[] {
		return this._features;
	}

	// === TASKS (FAZA 6) ===
	private _tasks: HierarchyTask[] = [];
	
	addTask(task: Omit<HierarchyTask, "id" | "createdAt" | "updatedAt">): HierarchyTask {
		const newTask: HierarchyTask = {
			...task,
			id: this.generateId(),
			createdAt: this.getTimestamp(),
			updatedAt: this.getTimestamp(),
		};
		this._tasks.push(newTask);
		
		// Link to feature
		const feature = this._features.find(f => f.id === task.featureId);
		if (feature) {
			feature.tasks.push(newTask.id);
		}
		
		this.addHistory("CREATE", "Task", newTask.id, `Added task: ${newTask.title}`);
		this.save();
		return newTask;
	}

	getTasks(): HierarchyTask[] {
		return this._tasks;
	}
}
