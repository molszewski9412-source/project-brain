/**
 * Hierarchy Models - FAZA 6
 * Epic → Feature → Module → Task hierarchy
 */

export interface BrainEpic {
    id: string;
    title: string;
    description: string;
    status: EpicStatus;
    progress: number; // 0-100
    features: string[]; // Feature IDs
    createdAt: string;
    updatedAt: string;
}

export type EpicStatus = "IDEA" | "IN_PROGRESS" | "DONE";

export interface BrainFeature {
    id: string;
    epicId: string;
    title: string;
    description: string;
    priority: Priority;
    modules: string[]; // Module IDs
    tasks: string[]; // Task IDs
    status: FeatureStatus;
    createdAt: string;
    updatedAt: string;
}

export type FeatureStatus = "IDEA" | "TODO" | "IN_PROGRESS" | "TESTING" | "DONE";
export type Priority = "P1" | "P2" | "P3" | "P4"; // P1 = highest

export interface BrainTask {
    id: string;
    featureId: string;
    moduleId?: string;
    title: string;
    description: string;
    prompt: string; // AI Prompt for implementation
    status: TaskStatus;
    assignee?: string;
    estimatedHours?: number;
    actualHours?: number;
    checklist: ChecklistItem[];
    files: string[]; // Related files
    createdAt: string;
    updatedAt: string;
}

export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE" | "BLOCKED";

export interface ChecklistItem {
    id: string;
    text: string;
    checked: boolean;
}

// Hierarchy conversion
export interface HierarchyNode {
    id: string;
    type: "epic" | "feature" | "module" | "task";
    title: string;
    description: string;
    status: string;
    progress: number;
    children: HierarchyNode[];
}

// AI Planning prompts
export interface PlanRequest {
    goal: string;
    constraints?: string[];
    existingModules?: string[];
}

export interface PlanResult {
    epics: BrainEpic[];
    features: BrainFeature[];
    modules: { name: string; description: string; dependsOn: string[] }[];
    tasks: { title: string; description: string; prompt: string }[];
}
