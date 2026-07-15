/**
 * Project Brain - Unified Data Model
 * Single source of truth for the entire extension
 */

export type ModuleStatus =
	| "IDEA"
	| "PLANNED"
	| "IN_PROGRESS"
	| "REVIEW"
	| "DONE"
	| "LOCKED"
	| "ARCHIVED";

export type TaskStatus =
	| "BACKLOG"
	| "TODO"
	| "IN_PROGRESS"
	| "REVIEW"
	| "DONE"
	| "BLOCKED";

export type TaskPriority =
	| "LOW"
	| "MEDIUM"
	| "HIGH"
	| "CRITICAL";

export type ProposalStatus =
	| "WAITING_APPROVAL"
	| "APPROVED"
	| "REJECTED"
	| "IMPLEMENTED"
	| "BLOCKED";

export type ProposalType =
	| "IMPROVEMENT"
	| "BUG_FIX"
	| "ARCHITECTURE_CHANGE"
	| "NEW_FEATURE";

export type DecisionType =
	| "ARCHITECTURE"
	| "DESIGN"
	| "PERFORMANCE"
	| "SECURITY"
	| "OTHER";

export type LinkType =
	| "DEPENDENCY"
	| "DATA_FLOW"
	| "REFERENCE";

export type HistoryAction =
	| "CREATE"
	| "UPDATE"
	| "DELETE"
	| "LOCK"
	| "APPROVE"
	| "REJECT";

/**
 * BrainModule - Core building block of the project
 */
export interface BrainModule {
	id: string;
	name: string;
	description: string;
	status: ModuleStatus;
	progress: number;
	locked: boolean;
	files: string[];
	dependsOn: string[];
	position: {
		x: number;
		y: number;
	};
	createdAt: string;
	updatedAt: string;
}

/**
 * BrainTask - Work items derived from proposals
 */
export interface BrainTask {
	id: string;
	moduleId: string;
	title: string;
	description: string;
	status: TaskStatus;
	priority: TaskPriority;
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
}

/**
 * BrainIdea - User-generated or AI-suggested concepts
 */
export interface BrainIdea {
	id: string;
	title: string;
	description: string;
	moduleId?: string;
	impact?: "LOW" | "MEDIUM" | "HIGH";
	affectedModules: string[];
	createdAt: string;
	status: "OPEN" | "EVALUATING" | "IMPLEMENTED" | "REJECTED";
}

/**
 * BrainDecision - Architectural and technical decisions
 */
export interface BrainDecision {
	id: string;
	moduleId: string;
	type: DecisionType;
	title: string;
	description: string;
	reason: string;
	createdAt: string;
	createdBy: "USER" | "AI";
}

/**
 * BrainRisk - Identified project risks
 */
export interface BrainRisk {
	id: string;
	title: string;
	description: string;
	severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
	moduleId?: string;
	mitigation?: string;
	createdAt: string;
	status: "OPEN" | "MITIGATED" | "ACCEPTED" | "CLOSED";
}

/**
 * BrainRoadmap - Development roadmap items
 */
export interface BrainRoadmap {
	id: string;
	title: string;
	description: string;
	moduleId?: string;
	taskIds: string[];
	status: "TODO" | "IN_PROGRESS" | "DONE";
	dependsOn: string[];
	order: number;
	createdAt: string;
	updatedAt: string;
}

/**
 * BrainHistory - Audit log of all changes
 */
export interface BrainHistory {
	id: string;
	action: HistoryAction;
	target: string;
	targetId: string;
	description: string;
	timestamp: string;
}

/**
 * BrainLink - Connections between modules
 */
export interface BrainLink {
	id: string;
	sourceId: string;
	targetId: string;
	type: LinkType;
	createdAt: string;
}

/**
 * Project Brain - The single source of truth
 */
export interface ProjectBrain {
	version: string;
	projectName: string;
	description: string;
	rootPath: string;
	initialized: boolean;
	createdAt: string;
	updatedAt: string;

	// Core collections
	modules: BrainModule[];
	tasks: BrainTask[];
	ideas: BrainIdea[];
	decisions: BrainDecision[];
	risks: BrainRisk[];
	roadmap: BrainRoadmap[];
	history: BrainHistory[];
	links: BrainLink[];

	// Project metadata
	technologyStack: string[];
	configFiles: string[];
}
