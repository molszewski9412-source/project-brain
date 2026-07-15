/**
 * SimpleProjectProvider - Clean, intuitive project view
 */
import * as vscode from 'vscode';
import { BrainStore } from '../storage/BrainStore';

export class SimpleProjectProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<vscode.TreeItem | undefined | null>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    private store: BrainStore;

    constructor() {
        this.store = new BrainStore();
    }

    refresh() {
        this._onDidChangeTreeData.fire(null);
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (!element) {
            return this.getRootItems();
        }
        return Promise.resolve([]);
    }

    private getRootItems(): Thenable<vscode.TreeItem[]> {
        const stats = this.store.getStats();
        const modules = this.store.getModules();
        
        const items: vscode.TreeItem[] = [];
        
        // Quick Actions with commands
        const analyze = new vscode.TreeItem('🔄 Analyze Project');
        analyze.contextValue = 'action';
        analyze.command = { command: 'project-brain.analyzeProject', title: 'Analyze' };
        items.push(analyze);

        const kanban = new vscode.TreeItem('📋 Open Kanban');
        kanban.contextValue = 'action';
        kanban.command = { command: 'project-brain.openKanban', title: 'Open Kanban' };
        items.push(kanban);

        // Modules
        const modulesItem = new vscode.TreeItem(`🗺️ Modules (${modules.length})`);
        modulesItem.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        modulesItem.contextValue = 'section';
        items.push(modulesItem);

        if (modules.length === 0) {
            const empty = new vscode.TreeItem('  No modules yet - run Analyze Project');
            empty.contextValue = 'hint';
            items.push(empty);
        } else {
            for (const m of modules.slice(0, 8)) {
                const icon = this.getStatusIcon(m.status);
                const mod = new vscode.TreeItem(`${icon} ${m.name}`);
                mod.contextValue = 'module';
                mod.id = m.id;
                mod.description = `${m.progress}%`;
                items.push(mod);
            }
        }

        // Ideas
        const ideasItem = new vscode.TreeItem(`📋 Ideas (${stats.ideas})`);
        ideasItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        ideasItem.contextValue = 'section';
        items.push(ideasItem);

        // Decisions
        const decisionsItem = new vscode.TreeItem(`📝 Decisions (${stats.decisions})`);
        decisionsItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        decisionsItem.contextValue = 'section';
        items.push(decisionsItem);

        // Risks
        const risksItem = new vscode.TreeItem(`⚠️ Risks (${stats.openRisks})`);
        risksItem.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
        risksItem.contextValue = 'section';
        items.push(risksItem);

        return Promise.resolve(items);
    }

    private getStatusIcon(status: string): string {
        const icons: Record<string, string> = {
            'LOCKED': '🔒',
            'DONE': '✅',
            'IN_PROGRESS': '🔨',
            'REVIEW': '👀',
            'PLANNED': '📋',
            'IDEA': '💡',
            'DEPRECATED': '🗑️'
        };
        return icons[status] || '⚪';
    }
}
