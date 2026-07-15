import * as vscode from "vscode";
import { BrainStore } from "../storage/BrainStore";

export class ProjectDashboardProvider
implements vscode.TreeDataProvider<ProjectBrainDashboardItem> {
private _onDidChangeTreeData =
new vscode.EventEmitter<ProjectBrainDashboardItem | undefined | null>();

readonly onDidChangeTreeData =
this._onDidChangeTreeData.event;

refresh() {
this._onDidChangeTreeData.fire(null);
}

getTreeItem(
element: ProjectBrainDashboardItem
): vscode.TreeItem {
return element;
}

getChildren(): Thenable<ProjectBrainDashboardItem[]> {
const store = new BrainStore();
const stats = store.getStats();
const items: ProjectBrainDashboardItem[] = [];

items.push(
new ProjectBrainDashboardItem(
"🧠 " + store.getProjectName()
)
);

items.push(
new ProjectBrainDashboardItem(
store.isInitialized()
? "🟢 Project Initialized"
: "⚪ Project Not Initialized"
)
);

// Statistics
items.push(
new ProjectBrainDashboardItem(
"📦 Modules: " + stats.modules
)
);

items.push(
new ProjectBrainDashboardItem(
"✅ Tasks: " + stats.completedTasks + "/" + stats.tasks
)
);

items.push(
new ProjectBrainDashboardItem(
"💡 Ideas: " + stats.ideas
)
);

items.push(
new ProjectBrainDashboardItem(
"📋 Roadmap: " + stats.roadmap
)
);

items.push(
new ProjectBrainDashboardItem(
"⚠️ Risks: " + stats.openRisks + "/" + stats.risks
)
);

items.push(
new ProjectBrainDashboardItem(
"🏛️ Decisions: " + stats.decisions
)
);

// Actions
if (!store.isInitialized()) {
items.push(
new ProjectBrainDashboardItem(
"🚀 Initialize Project",
"project-brain.createProject"
)
);
} else {
items.push(
new ProjectBrainDashboardItem(
"🔍 Analyze Project",
"project-brain.analyzeProject"
)
);

items.push(
new ProjectBrainDashboardItem(
"📝 Add Decision",
"project-brain.addDecision"
)
);

items.push(
new ProjectBrainDashboardItem(
"➕ Add Idea",
"project-brain.addIdea"
)
);
}

return Promise.resolve(items);
}
}

class ProjectBrainDashboardItem
extends vscode.TreeItem {
constructor(
label: string,
command?: string
) {
super(
label,
vscode.TreeItemCollapsibleState.None
);

if (command) {
this.command = {
command,
title: label
};
}
}
}
