/**
 * DependencyGraphPanel - FAZA 12
 * Graf zależności między modułami
 */

import * as vscode from "vscode";
import { BrainStore } from "../storage/BrainStore";

export interface DependencyNode {
    id: string;
    name: string;
    icon: string;
    type: "module" | "technology" | "external";
    status: string;
    dependsOn: string[];
    dependents: string[];
    level: number;
}

export class DependencyGraphPanel {
    public static currentPanel: DependencyGraphPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private nodes: DependencyNode[] = [];
    private selectedNode: string = "";
    private viewMode: "graph" | "tree" | "matrix" = "graph";

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.buildGraph();
        this.setupMessageHandler();
        this.update();
    }

    public static createOrShow(): DependencyGraphPanel {
        if (DependencyGraphPanel.currentPanel) {
            DependencyGraphPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return DependencyGraphPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "dependencyGraph",
            "🔗 Dependency Graph",
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        DependencyGraphPanel.currentPanel = new DependencyGraphPanel(panel);
        return DependencyGraphPanel.currentPanel;
    }

    private buildGraph(): void {
        const modules = this.store.getModules();
        this.nodes = [];

        // Add module nodes
        modules.forEach(m => {
            this.nodes.push({
                id: m.id,
                name: m.name,
                icon: "📦",
                type: "module",
                status: m.status,
                dependsOn: m.dependsOn || [],
                dependents: [],
                level: 0
            });
        });

        // Add technology nodes
        const techStack = this.store.getBrain()?.technologyStack || [];
        techStack.forEach(tech => {
            this.nodes.push({
                id: `tech-${tech}`,
                name: tech,
                icon: "⚙️",
                type: "technology",
                status: "active",
                dependsOn: [],
                dependents: [],
                level: -1
            });
        });

        // Build relationships
        this.nodes.forEach(node => {
            node.dependsOn.forEach(depId => {
                const depNode = this.nodes.find(n => n.id === depId);
                if (depNode && !depNode.dependents.includes(node.id)) {
                    depNode.dependents.push(node.id);
                }
            });
        });

        // Calculate levels (for tree view)
        this.calculateLevels();

        // Add external dependencies
        const externalDeps = this.detectExternalDependencies();
        this.nodes.push(...externalDeps);
    }

    private calculateLevels(): void {
        // Find root nodes (no dependencies)
        const rootNodes = this.nodes.filter(n => n.dependsOn.length === 0 && n.type === "module");
        
        // BFS to assign levels
        const visited = new Set<string>();
        let queue: { id: string; level: number }[] = rootNodes.map(n => ({ id: n.id, level: 0 }));
        
        while (queue.length > 0) {
            const { id, level } = queue.shift()!;
            if (visited.has(id)) continue;
            visited.add(id);

            const node = this.nodes.find(n => n.id === id);
            if (node) {
                node.level = level;
                node.dependents.forEach(depId => {
                    if (!visited.has(depId)) {
                        queue.push({ id: depId, level: level + 1 });
                    }
                });
            }
        }
    }

    private detectExternalDependencies(): DependencyNode[] {
        // Detect common external dependencies
        const externals: DependencyNode[] = [
            { id: "ext-database", name: "Database", icon: "💾", type: "external", status: "active", dependsOn: [], dependents: [], level: -1 },
            { id: "ext-api", name: "External API", icon: "🔌", type: "external", status: "active", dependsOn: [], dependents: [], level: -1 },
            { id: "ext-auth", name: "Auth Service", icon: "🔐", type: "external", status: "active", dependsOn: [], dependents: [], level: -1 }
        ];
        return externals;
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "selectNode":
                    this.selectedNode = msg.nodeId;
                    this.update();
                    break;
                case "setViewMode":
                    this.viewMode = msg.mode;
                    this.update();
                    break;
                case "analyzeImpact":
                    await this.analyzeImpact(msg.nodeId);
                    break;
                case "findCircular":
                    await this.findCircularDependencies();
                    break;
            }
        });
    }

    private async analyzeImpact(nodeId: string): Promise<void> {
        const node = this.nodes.find(n => n.id === nodeId);
        if (!node) return;

        // Find all nodes affected by changes to this node
        const affected: string[] = [];
        const queue = [...node.dependents];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const current = queue.shift()!;
            if (visited.has(current)) continue;
            visited.add(current);
            affected.push(current);

            const currentNode = this.nodes.find(n => n.id === current);
            if (currentNode) {
                queue.push(...currentNode.dependents);
            }
        }

        this.panel.webview.postMessage({
            command: "showImpact",
            nodeId,
            affected,
            count: affected.length
        });
    }

    private async findCircularDependencies(): Promise<void> {
        const circular: string[][] = [];
        
        const dfs = (nodeId: string, path: string[]): boolean => {
            if (path.includes(nodeId)) {
                const cycleStart = path.indexOf(nodeId);
                circular.push([...path.slice(cycleStart), nodeId]);
                return true;
            }
            if (path.length > this.nodes.length) return false;

            const node = this.nodes.find(n => n.id === nodeId);
            if (node) {
                for (const dep of node.dependsOn) {
                    if (dfs(dep, [...path, nodeId])) return true;
                }
            }
            return false;
        };

        this.nodes.forEach(node => {
            dfs(node.id, []);
        });

        this.panel.webview.postMessage({
            command: "showCircular",
            circular
        });
    }

    public update(): void {
        this.buildGraph();
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const selectedNode = this.nodes.find(n => n.id === this.selectedNode);
        
        const typeColors: Record<string, string> = {
            module: "#3498db",
            technology: "#9b59b6",
            external: "#e74c3c"
        };

        const statusColors: Record<string, string> = {
            active: "#27ae60",
            TODO: "#f39c12",
            IN_PROGRESS: "#3498db",
            DONE: "#27ae60",
            BLOCKED: "#e74c3c"
        };

        return `<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1a1a2e;
            color: #fff;
            padding: 20px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #00d4ff;
        }
        .view-tabs {
            display: flex;
            gap: 10px;
        }
        .view-tab {
            padding: 8px 16px;
            border-radius: 8px;
            background: #333;
            border: none;
            color: #fff;
            cursor: pointer;
        }
        .view-tab.active {
            background: #00d4ff;
            color: #1a1a2e;
        }
        .main-container {
            display: grid;
            grid-template-columns: 1fr 350px;
            gap: 20px;
            flex: 1;
            min-height: 0;
        }
        .graph-container {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            overflow: hidden;
            position: relative;
        }
        .graph-canvas {
            width: 100%;
            height: 100%;
            min-height: 500px;
        }
        .node {
            position: absolute;
            padding: 12px 20px;
            background: #1a1a2e;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
            border: 2px solid;
            font-weight: bold;
            white-space: nowrap;
        }
        .node:hover {
            transform: scale(1.05);
            z-index: 100;
        }
        .node.selected {
            box-shadow: 0 0 20px rgba(0,212,255,0.5);
        }
        .node.module { border-color: #3498db; }
        .node.technology { border-color: #9b59b6; }
        .node.external { border-color: #e74c3c; }
        .edge {
            position: absolute;
            height: 2px;
            background: #333;
            transform-origin: left center;
            pointer-events: none;
        }
        .edge.active {
            background: #00d4ff;
        }
        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .panel {
            background: #16213e;
            border-radius: 12px;
            padding: 15px;
        }
        .panel h3 {
            color: #00d4ff;
            margin-bottom: 15px;
            font-size: 1em;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        .stat-card {
            background: rgba(0,0,0,0.2);
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #00d4ff;
        }
        .stat-label {
            font-size: 0.8em;
            color: #888;
        }
        .node-list {
            max-height: 200px;
            overflow-y: auto;
        }
        .node-item {
            padding: 10px;
            background: rgba(0,0,0,0.2);
            border-radius: 6px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .node-item:hover {
            background: rgba(0,212,255,0.1);
        }
        .node-item.selected {
            background: rgba(0,212,255,0.2);
            border-left: 3px solid #00d4ff;
        }
        .node-type-badge {
            font-size: 0.7em;
            padding: 2px 6px;
            border-radius: 4px;
            text-transform: uppercase;
        }
        .node-type-badge.module { background: #3498db; }
        .node-type-badge.technology { background: #9b59b6; }
        .node-type-badge.external { background: #e74c3c; }
        .detail-section {
            margin-top: 15px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .detail-label {
            color: #888;
        }
        .detail-value {
            font-weight: bold;
        }
        .deps-list {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }
        .dep-badge {
            padding: 4px 10px;
            background: rgba(0,212,255,0.2);
            border-radius: 12px;
            font-size: 0.85em;
        }
        .btn {
            width: 100%;
            padding: 10px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            margin-top: 10px;
        }
        .btn-primary {
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            color: #1a1a2e;
        }
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        .empty-details {
            text-align: center;
            color: #888;
            padding: 20px;
        }
        .tree-view {
            padding: 15px;
        }
        .tree-level {
            padding-left: 20px;
            border-left: 2px solid #333;
            margin-left: 10px;
        }
        .tree-node {
            padding: 10px;
            margin: 5px 0;
            background: rgba(0,0,0,0.2);
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .tree-node:hover {
            background: rgba(0,212,255,0.1);
        }
        .tree-indent {
            display: inline-block;
            width: 20px;
        }
        .matrix-grid {
            display: grid;
            gap: 2px;
            font-size: 0.75em;
        }
        .matrix-cell {
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 2px;
            cursor: pointer;
        }
        .matrix-cell.dependency { background: #3498db; }
        .matrix-cell.self { background: #888; }
        .matrix-cell.empty { background: transparent; }
        .matrix-header {
            font-size: 0.7em;
            color: #888;
            text-align: center;
            padding: 5px;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔗 Dependency Graph</h1>
        <div class="view-tabs">
            <button class="view-tab ${this.viewMode === 'graph' ? 'active' : ''}" onclick="setViewMode('graph')">Graph</button>
            <button class="view-tab ${this.viewMode === 'tree' ? 'active' : ''}" onclick="setViewMode('tree')">Tree</button>
            <button class="view-tab ${this.viewMode === 'matrix' ? 'active' : ''}" onclick="setViewMode('matrix')">Matrix</button>
        </div>
    </div>

    <div class="main-container">
        <div class="graph-container">
            ${this.viewMode === 'graph' ? this.buildGraphView() : ''}
            ${this.viewMode === 'tree' ? this.buildTreeView() : ''}
            ${this.viewMode === 'matrix' ? this.buildMatrixView() : ''}
        </div>

        <div class="sidebar">
            <div class="panel">
                <h3>📊 Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${this.nodes.filter(n => n.type === 'module').length}</div>
                        <div class="stat-label">Modules</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.nodes.filter(n => n.type === 'technology').length}</div>
                        <div class="stat-label">Technologies</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.nodes.reduce((acc, n) => acc + n.dependsOn.length, 0)}</div>
                        <div class="stat-label">Dependencies</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.nodes.filter(n => n.dependents.length > 2).length}</div>
                        <div class="stat-label">Critical</div>
                    </div>
                </div>
            </div>

            <div class="panel">
                <h3>🔍 Analyze</h3>
                <button class="btn btn-primary" onclick="findCircular()">Find Circular Dependencies</button>
            </div>

            <div class="panel">
                <h3>📦 Nodes</h3>
                <div class="node-list">
                    ${this.nodes.filter(n => n.type === 'module').map(n => `
                    <div class="node-item ${n.id === this.selectedNode ? 'selected' : ''}" onclick="selectNode('${n.id}')">
                        <span>${n.icon || '📦'}</span>
                        <span>${n.name}</span>
                        <span class="node-type-badge ${n.type}">${n.type}</span>
                    </div>
                    `).join('')}
                </div>
            </div>

            ${selectedNode ? `
            <div class="panel">
                <h3>📋 ${selectedNode.name}</h3>
                <div class="detail-section">
                    <div class="detail-row">
                        <span class="detail-label">Type</span>
                        <span class="detail-value">${selectedNode.type}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Status</span>
                        <span class="detail-value" style="color: ${statusColors[selectedNode.status] || '#fff'}">${selectedNode.status}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Dependencies</span>
                        <span class="detail-value">${selectedNode.dependsOn.length}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Dependents</span>
                        <span class="detail-value">${selectedNode.dependents.length}</span>
                    </div>
                </div>
                ${selectedNode.dependsOn.length > 0 ? `
                <div class="detail-section">
                    <div class="detail-label">Depends On:</div>
                    <div class="deps-list">
                        ${selectedNode.dependsOn.map(depId => {
                            const dep = this.nodes.find(n => n.id === depId);
                            return dep ? `<span class="dep-badge">${dep.icon} ${dep.name}</span>` : '';
                        }).join('')}
                    </div>
                </div>
                ` : ''}
                ${selectedNode.dependents.length > 0 ? `
                <div class="detail-section">
                    <div class="detail-label">Required By:</div>
                    <div class="deps-list">
                        ${selectedNode.dependents.map(depId => {
                            const dep = this.nodes.find(n => n.id === depId);
                            return dep ? `<span class="dep-badge">${dep.icon} ${dep.name}</span>` : '';
                        }).join('')}
                    </div>
                </div>
                ` : ''}
                <button class="btn btn-primary" onclick="analyzeImpact('${selectedNode.id}')">
                    🔍 Analyze Impact
                </button>
            </div>
            ` : `
            <div class="panel">
                <div class="empty-details">
                    Click a node to see details
                </div>
            </div>
            `}
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function selectNode(nodeId) {
            vscode.postMessage({ command: 'selectNode', nodeId });
        }

        function setViewMode(mode) {
            vscode.postMessage({ command: 'setViewMode', mode });
        }

        function analyzeImpact(nodeId) {
            vscode.postMessage({ command: 'analyzeImpact', nodeId });
        }

        function findCircular() {
            vscode.postMessage({ command: 'findCircular' });
        }

        window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.command === 'showImpact') {
                alert(\`Changing "\${msg.nodeId}" will affect \${msg.count} nodes!\`);
            }
            if (msg.command === 'showCircular') {
                if (msg.circular.length > 0) {
                    alert(\`Found \${msg.circular.length} circular dependencies!\`);
                } else {
                    alert('No circular dependencies found!');
                }
            }
        });
    </script>
</body>
</html>`;
    }

    private buildGraphView(): string {
        const moduleNodes = this.nodes.filter(n => n.type === "module");
        const width = 800;
        const height = 500;
        
        // Position nodes in a circle
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 80;

        return `
            <div class="graph-canvas" style="position: relative;">
                ${moduleNodes.map((node, i) => {
                    const angle = (2 * Math.PI * i) / moduleNodes.length - Math.PI / 2;
                    const x = centerX + radius * Math.cos(angle) - 60;
                    const y = centerY + radius * Math.sin(angle) - 20;
                    return `
                        <div class="node module ${node.id === this.selectedNode ? 'selected' : ''}" 
                             style="left: ${x}px; top: ${y}px;"
                             onclick="selectNode('${node.id}')">
                            ${node.icon || '📦'} ${node.name}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    private buildTreeView(): string {
        const rootNodes = this.nodes.filter(n => n.type === "module" && n.dependsOn.length === 0);
        
        const renderNode = (node: DependencyNode, level: number): string => {
            const indent = level * 25;
            let html = `
                <div class="tree-node" style="margin-left: ${indent}px;" onclick="selectNode('${node.id}')">
                    ${node.icon} ${node.name}
                    <span class="node-type-badge ${node.type}">${node.type}</span>
                </div>
            `;
            
            const children = this.nodes.filter(n => n.dependsOn.includes(node.id));
            children.forEach(child => {
                html += renderNode(child, level + 1);
            });
            
            return html;
        };

        return `<div class="tree-view">${rootNodes.map(n => renderNode(n, 0)).join('')}</div>`;
    }

    private buildMatrixView(): string {
        const moduleNodes = this.nodes.filter(n => n.type === "module");
        const size = moduleNodes.length;
        
        let gridTemplateColumns = `100px repeat(${size}, 40px)`;
        let html = `<div class="matrix-grid" style="grid-template-columns: ${gridTemplateColumns};">`;
        
        // Header row
        html += `<div class="matrix-header"></div>`;
        moduleNodes.forEach(n => {
            html += `<div class="matrix-header">${n.name.substring(0, 4)}</div>`;
        });
        
        // Data rows
        moduleNodes.forEach(rowNode => {
            html += `<div class="matrix-header">${rowNode.name.substring(0, 4)}</div>`;
            moduleNodes.forEach(colNode => {
                if (rowNode.id === colNode.id) {
                    html += `<div class="matrix-cell self" title="${rowNode.name} → ${colNode.name}">•</div>`;
                } else if (rowNode.dependsOn.includes(colNode.id)) {
                    html += `<div class="matrix-cell dependency" onclick="selectNode('${rowNode.id}')" title="${rowNode.name} → ${colNode.name}">✓</div>`;
                } else {
                    html += `<div class="matrix-cell empty"></div>`;
                }
            });
        });
        
        html += `</div>`;
        return html;
    }

    public dispose(): void {
        DependencyGraphPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
