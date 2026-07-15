/**
 * BrainStore - Unified storage for Project Brain
 * Single source of truth replacing ProjectStore and ArchitectureStore
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
	ModuleStatus,
	TaskStatus,
	TaskPriority,
} from "../models/ProjectBrain";

export class BrainStore {
	private brainFile: string;
	private brain: ProjectBrain;

	constructor() {
		const workspace = vscode.workspace.workspaceFolders?.[0];
		if (!workspace) {
			throw new Error("No workspace opened");
		}

		const brainFolder = path.join(workspace.uri.fsPath, ".projectbrain");
		if (!fs.existsSync(brainFolder)) {
			fs.mkdirSync(brainFolder, { recursive: true });
		}

		this.brainFile = path.join(brainFolder, "architecture.json");
		this.brain = this.load();
	}

	private getTimestamp(): string {
		return new Date().toISOString();
	}

	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Load brain from disk or create default
	 */
	private load(): ProjectBrain {
		if (fs.existsSync(this.brainFile)) {
			try {
				return JSON.parse(fs.readFileSync(this.brainFile, "utf8"));
			} catch {
				vscode.window.showWarningMessage("Corrupted brain file, creating new...");
			}
		}
		return this.createDefault();
	}

	/**
	 * Save brain to disk
	 */
	save(): void {
		this.brain.updatedAt = this.getTimestamp();
		fs.writeFileSync(
			this.brainFile,
			JSON.stringify(this.brain, null, 2),
			"utf8"
		);
	}

	/**
	 * Create default empty brain
	 */
	private createDefault(): ProjectBrain {
		const workspace = vscode.workspace.workspaceFolders?.[0];
		return {
			version: "1.0.0",
			projectName: workspace?.name || "Unknown Project",
			description: "",
			rootPath: workspace?.uri.fsPath || "",
			initialized: false,
			createdAt: this.getTimestamp(),
			updatedAt: this.getTimestamp(),
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
		};
	}

	/**
	 * Initialize brain with project info
	 */
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

	/**
	 * Add history entry
	 */
	private addHistory(
		action: BrainHistory["action"],
		target: string,
		targetId: string,
		description: string
	): void {
		this.brain.history.push({
			id: this.generateId(),
			action,
			target,
			targetId,
			description,
			timestamp: this.getTimestamp(),
		});
	}

	// ============ MODULES ============

	getModules(): BrainModule[] {
		return this.brain.modules;
	}

	getModule(id: string): BrainModule | undefined {
		return this.brain.modules.find((m) => m.id === id);
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
		this.save();
		return newModule;
	}

	updateModule(id: string, updates: Partial<BrainModule>): BrainModule {
		const index = this.brain.modules.findIndex((m) => m.id === id);
		if (index === -1) {
			throw new Error(`Module not found: ${id}`);
		}
		this.brain.modules[index] = {
			...this.brain.modules[index],
			...updates,
			updatedAt: this.getTimestamp(),
		};
		this.addHistory("UPDATE", "Module", id, `Updated module: ${this.brain.modules[index].name}`);
		this.save();
		return this.brain.modules[index];
	}

	deleteModule(id: string): void {
		const module = this.getModule(id);
		if (!module) {
			throw new Error(`Module not found: ${id}`);
		}
		this.brain.modules = this.brain.modules.filter((m) => m.id !== id);
		this.addHistory("DELETE", "Module", id, `Deleted module: ${module.name}`);
		this.save();
	}

	setModules(modules: BrainModule[]): void {
		this.brain.modules = modules.map((m) => ({
			...m,
			id: m.id || this.generateId(),
			createdAt: m.createdAt || this.getTimestamp(),
			updatedAt: this.getTimestamp(),
		}));
		this.save();
	}

	// ============ TASKS ============

	getTasks(): BrainTask[] {
		return this.brain.tasks;
	}

	getTask(id: string): BrainTask | undefined {
		return this.brain.tasks.find((t) => t.id === id);
	}

	getTasksByModule(moduleId: string): BrainTask[] {
		return this.brain.tasks.filter((t) => t.moduleId === moduleId);
	}

	addTask(task: Omit<BrainTask, "id" | "createdAt" | "updatedAt">): BrainTask {
		const newTask: BrainTask = {
			...task,
			id: this.generateId(),
			createdAt: this.getTimestamp(),
			updatedAt: this.getTimestamp(),
		};
		this.brain.tasks.push(newTask);
		this.addHistory("CREATE", "Task", newTask.id, `Added task: ${newTask.title}`);
		this.save();
		return newTask;
	}

	updateTask(id: string, updates: Partial<BrainTask>): BrainTask {
		const index = this.brain.tasks.findIndex((t) => t.id === id);
		if (index === -1) {
			throw new Error(`Task not found: ${id}`);
		}
		this.brain.tasks[index] = {
			...this.brain.tasks[index],
			...updates,
			updatedAt: this.getTimestamp(),
		};
		if (updates.status === "DONE" && !this.brain.tasks[index].completedAt) {
			this.brain.tasks[index].completedAt = this.getTimestamp();
		}
		this.addHistory("UPDATE", "Task", id, `Updated task: ${this.brain.tasks[index].title}`);
		this.save();
		return this.brain.tasks[index];
	}

	deleteTask(id: string): void {
		const task = this.getTask(id);
		if (!task) {
			throw new Error(`Task not found: ${id}`);
		}
		this.brain.tasks = this.brain.tasks.filter((t) => t.id !== id);
		this.addHistory("DELETE", "Task", id, `Deleted task: ${task.title}`);
		this.save();
	}

	setTasks(tasks: BrainTask[]): void {
		this.brain.tasks = tasks.map((t) => ({
			...t,
			id: t.id || this.generateId(),
			createdAt: t.createdAt || this.getTimestamp(),
			updatedAt: this.getTimestamp(),
		}));
		this.save();
	}

	// ============ IDEAS ============

	getIdeas(): BrainIdea[] {
		return this.brain.ideas;
	}

	addIdea(idea: Omit<BrainIdea, "id" | "createdAt">): BrainIdea {
		const newIdea: BrainIdea = {
			...idea,
			id: this.generateId(),
			createdAt: this.getTimestamp(),
		};
		this.brain.ideas.push(newIdea);
		this.addHistory("CREATE", "Idea", newIdea.id, `Added idea: ${newIdea.title}`);
		this.save();
		return newIdea;
	}

	updateIdea(id: string, updates: Partial<BrainIdea>): BrainIdea {
		const index = this.brain.ideas.findIndex((i) => i.id === id);
		if (index === -1) {
			throw new Error(`Idea not found: ${id}`);
		}
		this.brain.ideas[index] = {
			...this.brain.ideas[index],
			...updates,
		};
		this.save();
		return this.brain.ideas[index];
	}

	// ============ DECISIONS ============

	getDecisions(): BrainDecision[] {
		return this.brain.decisions;
	}

	addDecision(decision: Omit<BrainDecision, "id" | "createdAt">): BrainDecision {
		const newDecision: BrainDecision = {
			...decision,
			id: this.generateId(),
			createdAt: this.getTimestamp(),
		};
		this.brain.decisions.push(newDecision);
		this.addHistory("CREATE", "Decision", newDecision.id, `Added decision: ${newDecision.title}`);
		this.save();
		return newDecision;
	}

	// ============ RISKS ============

	getRisks(): BrainRisk[] {
		return this.brain.risks;
	}

	addRisk(risk: Omit<BrainRisk, "id" | "createdAt">): BrainRisk {
		const newRisk: BrainRisk = {
			...risk,
			id: this.generateId(),
			createdAt: this.getTimestamp(),
		};
		this.brain.risks.push(newRisk);
		this.addHistory("CREATE", "Risk", newRisk.id, `Added risk: ${newRisk.title}`);
		this.save();
		return newRisk;
	}

	updateRisk(id: string, updates: Partial<BrainRisk>): BrainRisk {
		const index = this.brain.risks.findIndex((r) => r.id === id);
		if (index === -1) {
			throw new Error(`Risk not found: ${id}`);
		}
		this.brain.risks[index] = {
			...this.brain.risks[index],
			...updates,
		};
		this.save();
		return this.brain.risks[index];
	}

	setRisks(risks: BrainRisk[]): void {
		this.brain.risks = risks.map((r) => ({
			...r,
			id: r.id || this.generateId(),
			createdAt: r.createdAt || this.getTimestamp(),
		}));
		this.save();
	}

	// ============ ROADMAP ============

	getRoadmap(): BrainRoadmap[] {
		return this.brain.roadmap.sort((a, b) => a.order - b.order);
	}

	addRoadmapItem(item: Omit<BrainRoadmap, "id" | "createdAt" | "updatedAt">): BrainRoadmap {
		const maxOrder = Math.max(0, ...this.brain.roadmap.map((r) => r.order));
		const newItem: BrainRoadmap = {
			...item,
			id: this.generateId(),
			createdAt: this.getTimestamp(),
			updatedAt: this.getTimestamp(),
			order: item.order ?? maxOrder + 1,
		};
		this.brain.roadmap.push(newItem);
		this.addHistory("CREATE", "Roadmap", newItem.id, `Added roadmap: ${newItem.title}`);
		this.save();
		return newItem;
	}

	updateRoadmapItem(id: string, updates: Partial<BrainRoadmap>): BrainRoadmap {
		const index = this.brain.roadmap.findIndex((r) => r.id === id);
		if (index === -1) {
			throw new Error(`Roadmap item not found: ${id}`);
		}
		this.brain.roadmap[index] = {
			...this.brain.roadmap[index],
			...updates,
			updatedAt: this.getTimestamp(),
		};
		this.save();
		return this.brain.roadmap[index];
	}

	setRoadmap(items: BrainRoadmap[]): void {
		this.brain.roadmap = items.map((r) => ({
			...r,
			id: r.id || this.generateId(),
			createdAt: r.createdAt || this.getTimestamp(),
			updatedAt: this.getTimestamp(),
		}));
		this.save();
	}

	// ============ LINKS ============

	getLinks(): BrainLink[] {
		return this.brain.links;
	}

	addLink(link: Omit<BrainLink, "id" | "createdAt">): BrainLink {
		const newLink: BrainLink = {
			...link,
			id: this.generateId(),
			createdAt: this.getTimestamp(),
		};
		this.brain.links.push(newLink);
		this.save();
		return newLink;
	}

	deleteLink(id: string): void {
		this.brain.links = this.brain.links.filter((l) => l.id !== id);
		this.save();
	}

	setLinks(links: BrainLink[]): void {
		this.brain.links = links.map((l) => ({
			...l,
			id: l.id || this.generateId(),
			createdAt: l.createdAt || this.getTimestamp(),
		}));
		this.save();
	}

	// ============ HISTORY ============

	getHistory(): BrainHistory[] {
		return this.brain.history.sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);
	}

	// ============ PROJECT INFO ============

	getProjectName(): string {
		return this.brain.projectName;
	}

	setProjectName(name: string): void {
		this.brain.projectName = name;
		this.save();
	}

	setDescription(description: string): void {
		this.brain.description = description;
		this.save();
	}

	setTechnologyStack(stack: string[]): void {
		this.brain.technologyStack = stack;
		this.save();
	}

	setConfigFiles(files: string[]): void {
		this.brain.configFiles = files;
		this.save();
	}

	isInitialized(): boolean {
		return this.brain.initialized;
	}

	getRootPath(): string {
		return this.brain.rootPath;
	}

	// ============ FULL BRAIN ACCESS ============

	getBrain(): ProjectBrain {
		return this.brain;
	}

	setBrain(brain: ProjectBrain): void {
		this.brain = brain;
		this.save();
	}

	/**
	 * Import data from AI analysis response
	 */
	importFromAI(data: {
		modules?: Array<{ name: string; description: string; status?: string; files?: string[]; dependsOn?: string[] }>;
		risks?: Array<{ title: string; description: string; severity?: string; mitigation?: string }>;
		roadmap?: Array<{ title: string; description: string; order?: number; dependsOn?: string[] }>;
	}): void {
		const timestamp = this.getTimestamp();

		// Import modules
		if (data.modules && data.modules.length > 0) {
			const newModules: BrainModule[] = data.modules.map((m, index) => ({
				id: this.generateId(),
				name: m.name,
				description: m.description || "",
				status: (m.status?.toUpperCase().replace(" ", "_") as ModuleStatus) || "PLANNED",
				progress: 0,
				locked: false,
				files: m.files || [],
				dependsOn: m.dependsOn || [],
				position: { x: index * 250, y: 100 },
				createdAt: timestamp,
				updatedAt: timestamp,
			}));
			this.brain.modules = newModules;
		}

		// Import risks
		if (data.risks && data.risks.length > 0) {
			const newRisks: BrainRisk[] = data.risks.map((r) => ({
				id: this.generateId(),
				title: r.title,
				description: r.description || "",
				severity: (r.severity?.toUpperCase() as BrainRisk["severity"]) || "MEDIUM",
				moduleId: undefined,
				mitigation: r.mitigation,
				status: "OPEN",
				createdAt: timestamp,
			}));
			this.brain.risks = newRisks;
		}

		// Import roadmap
		if (data.roadmap && data.roadmap.length > 0) {
			const newRoadmap: BrainRoadmap[] = data.roadmap.map((r, index) => ({
				id: this.generateId(),
				title: r.title,
				description: r.description || "",
				moduleId: undefined,
				taskIds: [],
				status: "TODO",
				dependsOn: r.dependsOn || [],
				order: r.order ?? index,
				createdAt: timestamp,
				updatedAt: timestamp,
			}));
			this.brain.roadmap = newRoadmap;
		}

		this.brain.initialized = true;
		this.save();
	}

	/**
	 * Get dashboard statistics
	 */
	getStats(): {
		modules: number;
		tasks: number;
		ideas: number;
		decisions: number;
		risks: number;
		roadmap: number;
		completedTasks: number;
		openRisks: number;
	} {
		return {
			modules: this.brain.modules.length,
			tasks: this.brain.tasks.length,
			ideas: this.brain.ideas.length,
			decisions: this.brain.decisions.length,
			risks: this.brain.risks.length,
			roadmap: this.brain.roadmap.length,
			completedTasks: this.brain.tasks.filter((t) => t.status === "DONE").length,
			openRisks: this.brain.risks.filter((r) => r.status === "OPEN").length,
		};
	}
}
