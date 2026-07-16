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
        const isInitialized = this.store.isInitialized();
        
        const items: vscode.TreeItem[] = [];
        
        // === NOT INITIALIZED ===
        if (!isInitialized) {
            const init = new vscode.TreeItem('🚀 Initialize Project');
            init.contextValue = 'action';
            init.command = { command: 'project-brain.createProject', title: 'Initialize' };
            items.push(init);

            const hint = new vscode.TreeItem('   Click above to start');
            hint.contextValue = 'hint';
            items.push(hint);
            return Promise.resolve(items);
        }

        // === MAIN ACTIONS ===
        const addModule = new vscode.TreeItem('➕ Add Module');
        addModule.contextValue = 'action';
        addModule.command = { command: 'project-brain.addModule', title: 'Add Module' };
        items.push(addModule);

        const analyze = new vscode.TreeItem('🔄 Analyze Project');
        analyze.contextValue = 'action';
        analyze.command = { command: 'project-brain.analyzeProject', title: 'Analyze' };
        items.push(analyze);

        const kanban = new vscode.TreeItem('📋 AI Workflow Kanban');
        kanban.contextValue = 'action';
        kanban.command = { command: 'project-brain.openKanban', title: 'Open Kanban' };
        items.push(kanban);

        // === SUMMARY ===
        const summary = new vscode.TreeItem(`📊 ${modules.length} modules | ${stats.ideas} ideas`);
        summary.contextValue = 'info';
        items.push(summary);

        // === MODULES (if any) ===
        if (modules.length > 0) {
            const modulesItem = new vscode.TreeItem(`🗺️ Modules`);
            modulesItem.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
            modulesItem.contextValue = 'section';
            items.push(modulesItem);

            for (const m of modules.slice(0, 5)) {
                const icon = this.getStatusIcon(m.status);
                const mod = new vscode.TreeItem(`${icon} ${m.name}`);
                mod.contextValue = 'module';
                mod.id = m.id;
                mod.description = m.status;
                mod.command = { command: 'project-brain.openModule', title: 'View', arguments: [m] };
                items.push(mod);
            }
        }

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
