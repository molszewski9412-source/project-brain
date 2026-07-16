/**
 * Project Brain - Unified Data Model
 * Single source of truth for the entire extension
 */

// === STATUS TYPES ===

export type ModuleStatus =
| "IDEA"
| "PLANNED"
| "IN_PROGRESS"
| "REVIEW"
| "DONE"
| "LOCKED"
| "DEPRECATED"
| "ARCHIVED";

export type TaskStatus =
| "BACKLOG"
| "TODO"
| "IN_PROGRESS"
| "REVIEW"
| "DONE"
| "BLOCKED";

export type TaskPriority =
| "P4"
| "P3"
| "P2"
| "P1"; // P1 = highest

export type DecisionStatus =
| "PROPOSED"
| "APPROVED"
| "REJECTED"
| "DEPRECATED";

export type DecisionType =
| "ARCHITECTURE"
| "DESIGN"
| "TECHNOLOGY"
| "PERFORMANCE"
| "SECURITY"
| "API"
| "OTHER";

export type LinkType =
| "DEPENDENCY"
| "DATA_FLOW"
| "IMPLEMENTS"
| "EXTENDS";

export type HistoryAction =
| "CREATE"
| "UPDATE"
| "DELETE"
| "LOCK"
| "UNLOCK"
| "APPROVE"
| "REJECT";

// === AI CONTEXT ===

export interface AIPattern {
id: string;
name: string;
description: string;
pattern: string; // e.g., "singleton", "repository", "factory"
moduleIds: string[];
createdAt: string;
}

export interface AIConstraint {
id: string;
type: "DO" | "DON'T" | "PREFER" | "AVOID";
description: string;
reason: string;
moduleIds: string[];
createdAt: string;
}

export interface AIContext {
// Project overview for AI
projectSummary: string;

// Architectural decisions with rationale
patterns: AIPattern[];
constraints: AIConstraint[];

// Don't touch these - they work
protectedModules: string[];
protectedFiles: string[];

// Active decisions - what we're working on
activeDecisions: string[]; // Decision IDs

// Recently completed (for AI awareness)
recentChanges: Array<{
what: string;
why: string;
when: string;
}>;

// AI notes per module
moduleInsights: Record<string, string>; // moduleId -> AI insight

// Last updated
lastContextUpdate: string;
}

// === CORE INTERFACES ===

export interface BrainModule {
id: string;
name: string;
description: string;
status: ModuleStatus;
progress: number;
locked: boolean;
files: string[];
dependsOn: string[];
position: { x: number; y: number };
createdAt: string;
updatedAt: string;

// AI metadata
aiNotes?: string;
publicApi?: string[]; // Exported functions/classes
dependencies?: string[]; // Internal deps
}

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

// AI metadata
aiEstimate?: string; // "2 hours", "1 day"
aiSuggestions?: string[];
}

export interface BrainIdea {
id: string;
title: string;
description: string;
tags: string[]; // "feature", "bug", "refactor", "research"
moduleId?: string;
impact?: "LOW" | "MEDIUM" | "HIGH";
effort?: "LOW" | "MEDIUM" | "HIGH";
affectedModules: string[];
createdAt: string;
status: "BACKLOG" | "TODO" | "IN_PROGRESS" | "DONE" | "ARCHIVED";

// AI metadata
aiAnalysis?: string;
aiSuggestedModules?: string[];
}

export interface BrainDecision {
id: string;
moduleId: string;
type: DecisionType;
title: string;
description: string;

// WHY - this is crucial for AI context
rationale: string; // Why was this decision made?
alternatives: string[]; // What was considered instead?

// Status workflow
status: DecisionStatus;
proposedAt: string;
resolvedAt?: string;
resolvedBy?: string;

// Author
createdBy: "USER" | "AI";
authorName?: string;

// Relationships
relatedDecisionIds: string[];
affectedModuleIds: string[];
}

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

export interface BrainHistory {
id: string;
action: HistoryAction;
target: string;
targetId: string;
description: string;
timestamp: string;
user?: string;
}

export interface BrainLink {
id: string;
sourceId: string;
targetId: string;
type: LinkType;
description?: string;
createdAt: string;
}

// === PROJECT BRAIN ===

export interface ProjectBrain {
version: string;
projectName: string;
description: string;
rootPath: string;
initialized: boolean;
createdAt: string;
updatedAt: string;

// AI Context - NEW!
aiContext: AIContext;

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

// AI Provider Configuration - TASK 8.1, 8.2, 8.3
aiProviders: AIProviderConfig;
defaultAIProvider: string;
}

// AI Provider Configuration - TASK 8.1, 8.2, 8.3
export interface AIProviderConfig {
	openai?: {
		apiKey: string;
		model: string;
	};
	claude?: {
		apiKey: string;
		model: string;
	};
	gemini?: {
		apiKey: string;
		model: string;
	};
}
