/**
 * CanvasPanel - Visual Brain Canvas
 * Faza 1: TASK 1.1 - Canvas z modułami
 * 
 * Wizualizacja architektury projektu jako canvas z kartami modułów.
 */

import * as vscode from "vscode";
import { BrainStore } from "../storage/BrainStore";
import { BrainModule } from "../models/ProjectBrain";
import { AIWorkflowKanban } from "./AIWorkflowKanban";
import { CodeGeneratorPanel } from "./CodeGeneratorPanel";

export class CanvasPanel {
    public static currentPanel: CanvasPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;

    private constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.update();
        this.setupMessageHandler();
    }

    public static createOrShow(): CanvasPanel {
        if (CanvasPanel.currentPanel) {
            CanvasPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            CanvasPanel.currentPanel.update();
            return CanvasPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "projectBrainCanvas",
            "🎨 Visual Brain",
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        CanvasPanel.currentPanel = new CanvasPanel(panel);
        return CanvasPanel.currentPanel;
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "moduleClick":
                    this.onModuleClick(msg.moduleId);
                    break;
                case "moduleDragEnd":
                    this.onModuleDragEnd(msg.moduleId, msg.x, msg.y);
                    break;
                case "addModule":
                    this.onAddModule();
                    break;
                case "refresh":
                    this.update();
                    break;
                case "updateModuleSettings":
                    this.onUpdateModuleSettings(msg.moduleId, msg.color, msg.tags, msg.description);
                    break;
                case "openKanban":
                    this.onOpenKanban();
                    break;
                case "generateCode":
                    this.onGenerateCode(msg.moduleId);
                    break;
            }
        });
    }

    private onUpdateModuleSettings(moduleId: string, color: string, tags: string[], description: string): void {
        try {
            const updates: any = {};
            if (color) updates.color = color;
            if (tags) updates.tags = tags;
            if (description !== undefined) updates.description = description;

            if (Object.keys(updates).length > 0) {
                this.store.updateModule(moduleId, updates);
                this.store.addRecentChange(`Updated module settings`, `Color, tags or description changed`);
            }
            this.update();
        } catch (error) {
            vscode.window.showErrorMessage("Cannot update module: " + String(error));
        }
    }

    private onOpenKanban(): void {
        AIWorkflowKanban.createOrShow();
    }

    private onGenerateCode(moduleId: string): void {
        CodeGeneratorPanel.createOrShow(moduleId);
    }

    private onModuleClick(moduleId: string): void {
        const module = this.store.getModule(moduleId);
        if (module) {
            vscode.commands.executeCommand('project-brain.openModule', module);
        }
    }

    private onModuleDragEnd(moduleId: string, x: number, y: number): void {
        try {
            this.store.updateModule(moduleId, {
                position: { x, y }
            });
        } catch (error) {
            vscode.window.showErrorMessage("Cannot update module position: " + String(error));
        }
    }

    private async onAddModule(): Promise<void> {
        try {
            const name = await vscode.window.showInputBox({
                prompt: "Module name"
            });
            if (!name) return;

            const description = await vscode.window.showInputBox({
                prompt: "Description (optional)"
            });

            // Get random position in visible area
            const x = Math.random() * 400 + 50;
            const y = Math.random() * 300 + 50;

            this.store.addModule({
                name,
                description: description || '',
                status: 'IDEA',
                progress: 0,
                locked: false,
                files: [],
                dependsOn: [],
                position: { x, y }
            });

            this.update();
            vscode.window.showInformationMessage(`✅ Module "${name}" added to canvas`);
        } catch (error) {
            vscode.window.showErrorMessage("Error adding module: " + String(error));
        }
    }

    private buildHtml(): string {
        const modules = this.store.getModules();
        const stats = this.store.getStats();

        // Generate module cards HTML
        const moduleCards = modules.map(m => this.buildModuleCard(m)).join('');

        // Generate connection lines SVG
        const connectionsSvg = this.buildConnectionsSvg(modules);

        // Status colors
        const statusColors: Record<string, string> = {
            'IDEA': '#9b59b6',
            'PLANNED': '#3498db',
            'IN_PROGRESS': '#f39c12',
            'REVIEW': '#e67e22',
            'DONE': '#27ae60',
            'LOCKED': '#c0392b',
            'DEPRECATED': '#7f8c8d',
            'ARCHIVED': '#95a5a6'
        };

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visual Brain Canvas</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a2e;
            color: #fff;
            overflow: hidden;
            height: 100vh;
        }

        .header {
            background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #333;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 100;
        }

        .header h1 {
            font-size: 1.4em;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .stats {
            display: flex;
            gap: 20px;
        }

        .stat {
            background: rgba(255,255,255,0.1);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9em;
        }

        .stat-value {
            color: #00d4ff;
            font-weight: bold;
        }

        .toolbar {
            background: #16213e;
            padding: 10px 20px;
            display: flex;
            gap: 10px;
            position: fixed;
            top: 60px;
            left: 0;
            right: 0;
            z-index: 100;
        }

        .toolbar button {
            background: #0f3460;
            border: 1px solid #333;
            color: #fff;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85em;
            transition: all 0.2s;
        }

        .toolbar button:hover {
            background: #00d4ff;
            color: #1a1a2e;
        }

        .toolbar button.active {
            background: #00d4ff;
            color: #1a1a2e;
        }

        .canvas-container {
            position: fixed;
            top: 110px;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: hidden;
            background: 
                radial-gradient(circle at 1px 1px, #333 1px, transparent 0) 0 0 / 40px 40px,
                #1a1a2e;
        }

        .canvas {
            width: 5000px;
            height: 5000px;
            position: relative;
            cursor: grab;
        }

        .canvas:active {
            cursor: grabbing;
        }

        /* Connection lines layer */
        .connections-layer {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
            overflow: visible;
        }

        .connection-line {
            stroke: #00d4ff;
            stroke-width: 2;
            fill: none;
            opacity: 0.6;
        }

        .connection-line.data-flow {
            stroke: #27ae60;
            stroke-dasharray: 5,5;
        }

        .connection-line.implements {
            stroke: #9b59b6;
            stroke-width: 3;
        }

        .connection-line.extends {
            stroke: #f39c12;
            stroke-dasharray: 2,2;
        }

        .module-card {
            position: absolute;
            width: 200px;
            background: #16213e;
            border-radius: 12px;
            padding: 15px;
            cursor: move;
            transition: transform 0.1s, box-shadow 0.2s;
            border: 2px solid;
            user-select: none;
            z-index: 10;
        }

        .module-card:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 40px rgba(0, 212, 255, 0.3);
            z-index: 1000;
        }

        .module-card.locked {
            background: linear-gradient(135deg, #2c1810 0%, #16213e 100%);
            border-style: dashed;
        }

        .module-card.selected {
            box-shadow: 0 0 0 3px #00d4ff;
        }

        .module-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }

        .module-icon {
            font-size: 1.5em;
        }

        .module-name {
            font-weight: bold;
            font-size: 0.95em;
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .module-status {
            font-size: 0.7em;
            padding: 2px 8px;
            border-radius: 10px;
            background: rgba(255,255,255,0.1);
        }

        .module-description {
            font-size: 0.8em;
            color: #888;
            margin-bottom: 8px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .module-progress {
            height: 4px;
            background: #333;
            border-radius: 2px;
            overflow: hidden;
        }

        .module-progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #00d4ff, #00ff88);
            transition: width 0.3s;
        }

        .module-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 8px;
            font-size: 0.75em;
            color: #666;
        }

        .module-files {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .empty-state {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #666;
        }

        .empty-state h2 {
            font-size: 1.5em;
            margin-bottom: 10px;
            color: #444;
        }

        .empty-state p {
            margin-bottom: 20px;
        }

        .empty-state button {
            background: #00d4ff;
            color: #1a1a2e;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 1em;
            cursor: pointer;
            font-weight: bold;
        }

        .empty-state button:hover {
            background: #00ff88;
        }

        /* Dragging state */
        .module-card.dragging {
            opacity: 0.8;
            transform: scale(1.1);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            z-index: 9999;
        }

        /* Connection mode */
        .connection-mode .module-card {
            cursor: crosshair;
        }

        .connection-mode .module-card:hover {
            border-color: #00d4ff !important;
            box-shadow: 0 0 15px rgba(0, 212, 255, 0.5);
        }

        /* Arrow marker */
        .arrow-marker {
            fill: #00d4ff;
        }

        /* Minimap */
        .minimap {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 150px;
            height: 100px;
            background: rgba(22, 33, 62, 0.9);
            border: 1px solid #333;
            border-radius: 8px;
            z-index: 200;
            overflow: hidden;
        }

        .minimap-module {
            position: absolute;
            width: 8px;
            height: 6px;
            background: #00d4ff;
            border-radius: 2px;
            cursor: pointer;
        }

        .minimap-module:hover {
            background: #00ff88;
        }

        .minimap-viewport {
            position: absolute;
            border: 2px solid #00d4ff;
            background: rgba(0, 212, 255, 0.1);
            pointer-events: none;
        }

        /* Search bar */
        .search-bar {
            position: fixed;
            top: 60px;
            right: 20px;
            z-index: 150;
        }

        .search-bar input {
            width: 200px;
            padding: 10px 15px;
            border-radius: 20px;
            border: 1px solid #333;
            background: #16213e;
            color: #fff;
            font-size: 0.9em;
        }

        .search-bar input:focus {
            outline: none;
            border-color: #00d4ff;
        }

        .search-results {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #16213e;
            border-radius: 8px;
            margin-top: 5px;
            max-height: 300px;
            overflow-y: auto;
            display: none;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }

        .search-results.show {
            display: block;
        }

        .search-result-item {
            padding: 10px 15px;
            cursor: pointer;
            border-bottom: 1px solid #333;
        }

        .search-result-item:hover {
            background: #0f3460;
        }

        .search-result-item .name {
            color: #fff;
            font-weight: bold;
        }

        .search-result-item .desc {
            color: #888;
            font-size: 0.8em;
        }

        /* Module tags */
        .module-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-bottom: 8px;
        }

        .tag {
            font-size: 0.7em;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(255,255,255,0.1);
            color: #aaa;
        }

        /* Module settings modal */
        .settings-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            z-index: 2000;
            align-items: center;
            justify-content: center;
        }

        .settings-modal.show {
            display: flex;
        }

        .settings-content {
            background: #16213e;
            padding: 25px;
            border-radius: 12px;
            width: 400px;
            max-width: 90%;
        }

        .settings-title {
            font-size: 1.2em;
            margin-bottom: 20px;
            color: #00d4ff;
        }

        .settings-row {
            margin-bottom: 15px;
        }

        .settings-label {
            font-size: 0.85em;
            color: #888;
            margin-bottom: 5px;
            display: block;
        }

        .color-picker {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .color-option {
            width: 30px;
            height: 30px;
            border-radius: 6px;
            cursor: pointer;
            border: 2px solid transparent;
        }

        .color-option:hover {
            border-color: #fff;
        }

        .color-option.selected {
            border-color: #00d4ff;
        }

        .settings-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        .settings-btn {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        }

        .settings-btn.primary {
            background: #00d4ff;
            color: #1a1a2e;
        }

        .settings-btn.secondary {
            background: #333;
            color: #fff;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎨 Visual Brain Canvas</h1>
        <div class="stats">
            <span class="stat">📦 <span class="stat-value">${stats.modules}</span> modules</span>
            <span class="stat">🔗 <span class="stat-value">${this.getConnectionCount(modules)}</span> links</span>
            <span class="stat">🔒 <span class="stat-value">${stats.protectedModules}</span> locked</span>
        </div>
    </div>

    <div class="toolbar">
        <button onclick="addModule()">➕ Add Module</button>
        <button onclick="refreshCanvas()">🔄 Refresh</button>
        <button id="connectBtn" onclick="toggleConnectionMode()">🔗 Connect</button>
        <button onclick="zoomIn()">🔍+</button>
        <button onclick="zoomOut()">🔍-</button>
        <button onclick="resetView()">🏠 Reset</button>
        <button onclick="openKanban()">📋 Kanban</button>
    </div>

    <div class="canvas-container" id="canvasContainer">
        <div class="canvas" id="canvas">
            ${connectionsSvg}
            
            ${modules.length === 0 ? `
                <div class="empty-state">
                    <h2>🧠 No modules yet</h2>
                    <p>Start by adding a module or analyzing your project</p>
                    <button onclick="addModule()">➕ Add First Module</button>
                </div>
            ` : ''}
            
            ${moduleCards}
        </div>
    </div>

    <!-- Minimap -->
    <div class="minimap" id="minimap">
        ${modules.map(m => `
            <div class="minimap-module" 
                 style="left: ${m.position.x / 25}px; top: ${m.position.y / 25}px"
                 title="${m.name}"
                 onclick="navigateToModule('${m.id}')"></div>
        `).join('')}
        <div id="minimapViewport" class="minimap-viewport"></div>
    </div>

    <!-- Search bar -->
    <div class="search-bar" id="searchBar">
        <input type="text" id="searchInput" placeholder="🔍 Search modules..." oninput="filterModules(this.value)">
        <div id="searchResults" class="search-results"></div>
    </div>

    <!-- Module Settings Modal -->
    <div class="settings-modal" id="settingsModal">
        <div class="settings-content">
            <div class="settings-title" id="settingsTitle">⚙️ Module Settings</div>
            
            <div class="settings-row">
                <label class="settings-label">Color</label>
                <div class="color-picker" id="colorPicker">
                    <div class="color-option" data-color="#9b59b6" style="background:#9b59b6"></div>
                    <div class="color-option" data-color="#3498db" style="background:#3498db"></div>
                    <div class="color-option" data-color="#f39c12" style="background:#f39c12"></div>
                    <div class="color-option" data-color="#e67e22" style="background:#e67e22"></div>
                    <div class="color-option" data-color="#27ae60" style="background:#27ae60"></div>
                    <div class="color-option" data-color="#c0392b" style="background:#c0392b"></div>
                    <div class="color-option" data-color="#1abc9c" style="background:#1abc9c"></div>
                    <div class="color-option" data-color="#8e44ad" style="background:#8e44ad"></div>
                    <div class="color-option" data-color="#e74c3c" style="background:#e74c3c"></div>
                    <div class="color-option" data-color="#2ecc71" style="background:#2ecc71"></div>
                    <div class="color-option" data-color="#f1c40f" style="background:#f1c40f"></div>
                    <div class="color-option" data-color="#34495e" style="background:#34495e"></div>
                </div>
            </div>

            <div class="settings-row">
                <label class="settings-label">Tags (comma separated)</label>
                <input type="text" id="tagsInput" style="width:100%;padding:10px;border-radius:6px;border:1px solid #333;background:#0f3460;color:#fff" placeholder="api, backend, critical">
            </div>

            <div class="settings-row">
                <label class="settings-label">Description</label>
                <textarea id="descInput" style="width:100%;padding:10px;border-radius:6px;border:1px solid #333;background:#0f3460;color:#fff;min-height:60px;resize:none" placeholder="Module description"></textarea>
            </div>

            <div class="settings-actions">
                <button class="settings-btn secondary" onclick="generateCodeFromSettings()">⚡ Generate Code</button>
                <button class="settings-btn secondary" onclick="closeSettings()">Cancel</button>
                <button class="settings-btn primary" onclick="saveSettings()">Save</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const canvas = document.getElementById('canvas');
        
        // Pan state
        let isPanning = false;
        let panStart = { x: 0, y: 0 };
        let canvasOffset = { x: 0, y: 0 };
        
        // Drag state
        let draggedElement = null;
        let dragOffset = { x: 0, y: 0 };
        let isDraggingModule = false;
        
        // Modules data
        const modules = ${JSON.stringify(modules.map(m => ({
            id: m.id,
            name: m.name,
            description: m.description,
            status: m.status,
            progress: m.progress,
            locked: m.locked,
            position: m.position
        })))};

        // Status colors
        const statusColors = {
            'IDEA': '#9b59b6',
            'PLANNED': '#3498db',
            'IN_PROGRESS': '#f39c12',
            'REVIEW': '#e67e22',
            'DONE': '#27ae60',
            'LOCKED': '#c0392b',
            'DEPRECATED': '#7f8c8d',
            'ARCHIVED': '#95a5a6'
        };

        // Canvas panning
        canvas.addEventListener('mousedown', (e) => {
            if (e.target === canvas || e.target.classList.contains('canvas-container')) {
                isPanning = true;
                panStart = { x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y };
                canvas.style.cursor = 'grabbing';
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isPanning && !isDraggingModule) {
                canvasOffset.x = e.clientX - panStart.x;
                canvasOffset.y = e.clientY - panStart.y;
                canvas.style.transform = \`translate(\${canvasOffset.x}px, \${canvasOffset.y}px)\`;
            }
        });

        document.addEventListener('mouseup', () => {
            isPanning = false;
            canvas.style.cursor = 'grab';
        });

        // Module dragging
        document.querySelectorAll('.module-card').forEach(card => {
            card.addEventListener('mousedown', (e) => {
                if (e.target.closest('.module-card')) {
                    e.stopPropagation();
                    isDraggingModule = true;
                    draggedElement = card;
                    
                    const rect = card.getBoundingClientRect();
                    dragOffset.x = e.clientX - rect.left;
                    dragOffset.y = e.clientY - rect.top;
                    
                    card.classList.add('dragging');
                }
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (isDraggingModule && draggedElement) {
                const container = document.querySelector('.canvas-container');
                const containerRect = container.getBoundingClientRect();
                
                const x = e.clientX - containerRect.left - dragOffset.x - canvasOffset.x;
                const y = e.clientY - containerRect.top - dragOffset.y - canvasOffset.y;
                
                draggedElement.style.left = x + 'px';
                draggedElement.style.top = y + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDraggingModule && draggedElement) {
                draggedElement.classList.remove('dragging');
                
                // Save position
                const moduleId = draggedElement.dataset.id;
                const x = parseInt(draggedElement.style.left);
                const y = parseInt(draggedElement.style.top);
                
                vscode.postMessage({
                    command: 'moduleDragEnd',
                    moduleId,
                    x,
                    y
                });
                
                isDraggingModule = false;
                draggedElement = null;
            }
        });

        // Zoom functions
        function zoomIn() {
            const currentScale = parseFloat(canvas.style.transform?.match(/scale\\(([^)]+)\\)/)?.[1] || '1');
            const newScale = Math.min(currentScale * 1.2, 3);
            canvas.style.transform = \`translate(\${canvasOffset.x}px, \${canvasOffset.y}px) scale(\${newScale})\`;
        }

        function zoomOut() {
            const currentScale = parseFloat(canvas.style.transform?.match(/scale\\(([^)]+)\\)/)?.[1] || '1');
            const newScale = Math.max(currentScale / 1.2, 0.3);
            canvas.style.transform = \`translate(\${canvasOffset.x}px, \${canvasOffset.y}px) scale(\${newScale})\`;
        }

        function resetView() {
            canvasOffset = { x: 0, y: 0 };
            canvas.style.transform = 'translate(0px, 0px) scale(1)';
        }

        // Toolbar actions
        function addModule() {
            vscode.postMessage({ command: 'addModule' });
        }

        function refreshCanvas() {
            vscode.postMessage({ command: 'refresh' });
        }

        function openKanban() {
            vscode.postMessage({ command: 'openKanban' });
        }

        // Module click
        function moduleClick(moduleId) {
            vscode.postMessage({ command: 'moduleClick', moduleId });
        }

        // Navigate to module from minimap
        function navigateToModule(moduleId) {
            const module = modules.find(m => m.id === moduleId);
            if (!module) return;

            // Center canvas on module
            canvasOffset.x = -module.position.x + window.innerWidth / 2 - 100;
            canvasOffset.y = -module.position.y + window.innerHeight / 2 - 50;
            const scale = getCurrentScale();
            canvas.style.transform = "translate(" + canvasOffset.x + "px, " + canvasOffset.y + "px) scale(" + scale + ")";

            // Highlight module
            document.querySelectorAll('.module-card').forEach(card => {
                card.classList.remove('selected');
                if (card.dataset.id === moduleId) {
                    card.classList.add('selected');
                }
            });
        }

        function getCurrentScale() {
            const match = canvas.style.transform.match(/scale\(([^)]+)\)/);
            return match ? parseFloat(match[1]) : 1;
        }

        // Update minimap viewport
        function updateMinimapViewport() {
            const viewport = document.getElementById('minimapViewport');
            if (!viewport) return;

            const scale = getCurrentScale();
            const viewWidth = window.innerWidth / scale / 25;
            const viewHeight = window.innerHeight / scale / 25;
            const viewX = -canvasOffset.x / scale / 25;
            const viewY = -canvasOffset.y / scale / 25;

            viewport.style.width = Math.min(viewWidth, 150) + 'px';
            viewport.style.height = Math.min(viewHeight, 100) + 'px';
            viewport.style.left = Math.max(0, viewX) + 'px';
            viewport.style.top = Math.max(0, viewY) + 'px';
        }

        // Search modules
        function filterModules(query) {
            const results = document.getElementById('searchResults');
            if (!query || query.length < 2) {
                results.classList.remove('show');
                return;
            }

            const lowerQuery = query.toLowerCase();
            const filtered = modules.filter(m => 
                m.name.toLowerCase().includes(lowerQuery) ||
                (m.description && m.description.toLowerCase().includes(lowerQuery)) ||
                (m.tags && m.tags.some(t => t.toLowerCase().includes(lowerQuery)))
            );

            if (filtered.length === 0) {
                results.innerHTML = '<div style="padding: 15px; color: #888">No modules found</div>';
            } else {
                results.innerHTML = filtered.map(m => {
                    const desc = m.description || 'No description';
                    return '<div class="search-result-item" onclick="navigateToModule(\'' + m.id + '\'); document.getElementById(\'searchResults\').classList.remove(\'show\');">' +
                           '<div class="name">' + m.name + '</div>' +
                           '<div class="desc">' + desc + '</div></div>';
                }).join('');
            }

            results.classList.add('show');
        }

        // Hide search results when clicking outside
        document.addEventListener('click', (e) => {
            const searchBar = document.getElementById('searchBar');
            if (searchBar && !searchBar.contains(e.target)) {
                const results = document.getElementById('searchResults');
                if (results) results.classList.remove('show');
            }
        });

        // Module settings (double-click)
        let currentSettingsModule = null;
        let selectedColor = null;

        function openModuleSettings(moduleId) {
            currentSettingsModule = moduleId;
            const module = modules.find(m => m.id === moduleId);
            if (!module) return;

            document.getElementById('settingsTitle').textContent = '⚙️ ' + module.name;
            document.getElementById('descInput').value = module.description || '';
            document.getElementById('tagsInput').value = (module.tags || []).join(', ');

            // Select current color
            selectedColor = module.color || getStatusColor(module.status);
            document.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.toggle('selected', opt.dataset.color === selectedColor);
            });

            document.getElementById('settingsModal').classList.add('show');
        }

        function getStatusColor(status) {
            const colors = {
                'IDEA': '#9b59b6',
                'PLANNED': '#3498db',
                'IN_PROGRESS': '#f39c12',
                'REVIEW': '#e67e22',
                'DONE': '#27ae60',
                'LOCKED': '#c0392b',
                'DEPRECATED': '#7f8c8d',
                'ARCHIVED': '#95a5a6'
            };
            return colors[status] || '#3498db';
        }

        // Color picker
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.addEventListener('click', () => {
                selectedColor = opt.dataset.color;
                document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
            });
        });

        function closeSettings() {
            document.getElementById('settingsModal').classList.remove('show');
            currentSettingsModule = null;
        }

        function saveSettings() {
            if (!currentSettingsModule) return;

            const tags = document.getElementById('tagsInput').value
                .split(',')
                .map(t => t.trim())
                .filter(t => t);

            vscode.postMessage({
                command: 'updateModuleSettings',
                moduleId: currentSettingsModule,
                color: selectedColor,
                tags: tags,
                description: document.getElementById('descInput').value
            });

            closeSettings();
        }

        function generateCodeFromSettings() {
            if (!currentSettingsModule) return;
            closeSettings();
            vscode.postMessage({
                command: 'generateCode',
                moduleId: currentSettingsModule
            });
        }

        // Listen for messages from extension
        window.addEventListener('message', (e) => {
            const msg = e.data;
            if (msg.command === 'update') {
                location.reload();
            }
        });
    </script>
</body>
</html>`;
    }

    private buildModuleCard(module: BrainModule): string {
        const statusColors: Record<string, string> = {
            'IDEA': '#9b59b6',
            'PLANNED': '#3498db',
            'IN_PROGRESS': '#f39c12',
            'REVIEW': '#e67e22',
            'DONE': '#27ae60',
            'LOCKED': '#c0392b',
            'DEPRECATED': '#7f8c8d',
            'ARCHIVED': '#95a5a6'
        };

        const statusLabels: Record<string, string> = {
            'IDEA': '💡 IDEA',
            'PLANNED': '📋 PLANNED',
            'IN_PROGRESS': '⚡ IN PROGRESS',
            'REVIEW': '👀 REVIEW',
            'DONE': '✅ DONE',
            'LOCKED': '🔒 LOCKED',
            'DEPRECATED': '🗑️ DEPRECATED',
            'ARCHIVED': '📦 ARCHIVED'
        };

        // TASK 1.8: Kolory modułów - użyj custom color lub status color
        const color = (module as any).color || statusColors[module.status] || '#3498db';
        const label = statusLabels[module.status] || module.status;
        const lockedClass = module.locked ? 'locked' : '';

        return `
            <div class="module-card ${lockedClass}" 
                 data-id="${module.id}"
                 style="left: ${module.position.x}px; top: ${module.position.y}px; border-color: ${color};"
                 onclick="moduleClick('${module.id}')"
                 ondblclick="openModuleSettings('${module.id}')">
                <div class="module-header">
                    <span class="module-icon">${this.getModuleIcon(module.name)}</span>
                    <span class="module-name" title="${module.name}">${module.name}</span>
                    <span class="module-status" style="background: ${color}20; color: ${color}">${label}</span>
                </div>
                <div class="module-description">${module.description || 'No description'}</div>
                ${(module as any).tags && (module as any).tags.length > 0 ? `
                    <div class="module-tags">
                        ${(module as any).tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="module-progress">
                    <div class="module-progress-bar" style="width: ${module.progress}%; background: ${color}"></div>
                </div>
                <div class="module-footer">
                    <span class="module-files">📁 ${module.files.length} files</span>
                    <span>🔗 ${module.dependsOn.length} deps</span>
                </div>
            </div>
        `;
    }

    private getModuleIcon(moduleName: string): string {
        const name = moduleName.toLowerCase();
        
        if (name.includes('auth') || name.includes('login') || name.includes('user')) return '🔐';
        if (name.includes('api') || name.includes('rest') || name.includes('endpoint')) return '🌐';
        if (name.includes('db') || name.includes('database') || name.includes('sql')) return '🗄️';
        if (name.includes('ui') || name.includes('frontend') || name.includes('web') || name.includes('page')) return '🖥️';
        if (name.includes('test')) return '🧪';
        if (name.includes('config') || name.includes('setting')) return '⚙️';
        if (name.includes('payment') || name.includes('billing')) return '💳';
        if (name.includes('email') || name.includes('mail')) return '📧';
        if (name.includes('file') || name.includes('upload')) return '📎';
        if (name.includes('notification') || name.includes('push')) return '🔔';
        if (name.includes('search')) return '🔍';
        if (name.includes('report') || name.includes('analytics')) return '📊';
        if (name.includes('security')) return '🛡️';
        if (name.includes('log') || name.includes('monitor')) return '📝';
        if (name.includes('cache')) return '⚡';
        
        return '📦';
    }

    /**
     * TASK 1.5: Połączenia między modułami
     * Generuje SVG z liniami łączącymi moduły na podstawie zależności
     */
    private buildConnectionsSvg(modules: BrainModule[]): string {
        const moduleMap = new Map(modules.map(m => [m.id, m]));

        let paths = '';
        
        for (const module of modules) {
            if (module.dependsOn && module.dependsOn.length > 0) {
                for (const depId of module.dependsOn) {
                    const depModule = moduleMap.get(depId);
                    if (depModule) {
                        // Oblicz pozycje środków modułów
                        const sourceX = depModule.position.x + 100; // środek modułu źródłowego
                        const sourceY = depModule.position.y + 40;
                        const targetX = module.position.x + 100;  // środek modułu docelowego
                        const targetY = module.position.y;

                        // Generuj ścieżkę SVG
                        paths += `
                            <path 
                                class="connection-line"
                                d="M${sourceX},${sourceY} C${sourceX},${sourceY + 50} ${targetX},${targetY - 50} ${targetX},${targetY}"
                            />
                        `;
                    }
                }
            }
        }

        return `
            <svg class="connections-layer" width="5000" height="5000">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#00d4ff"/>
                    </marker>
                    <marker id="arrowhead-data-flow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#27ae60"/>
                    </marker>
                </defs>
                ${paths}
            </svg>
        `;
    }

    private getConnectionCount(modules: BrainModule[]): number {
        let count = 0;
        for (const module of modules) {
            count += (module.dependsOn || []).length;
        }
        return count;
    }

    public dispose(): void {
        CanvasPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
