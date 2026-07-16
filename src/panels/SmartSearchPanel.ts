/**
 * SmartSearchPanel - FAZA 24
 * Inteligentne wyszukiwanie w projekcie
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { OllamaClient } from "../ai/OllamaClient";
import { BrainStore } from "../storage/BrainStore";

export interface SearchResult {
    file: string;
    line: number;
    content: string;
    context: string;
    relevance: number;
    type: "code" | "comment" | "doc" | "test";
}

export interface SearchQuery {
    id: string;
    query: string;
    timestamp: string;
    resultsCount: number;
}

export class SmartSearchPanel {
    public static currentPanel: SmartSearchPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private ollama: OllamaClient;
    private results: SearchResult[] = [];
    private searchHistory: SearchQuery[] = [];
    private isSearching: boolean = false;

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.ollama = new OllamaClient();
        this.setupMessageHandler();
        this.update();
    }

    public static createOrShow(): SmartSearchPanel {
        if (SmartSearchPanel.currentPanel) {
            SmartSearchPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return SmartSearchPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "smartSearch",
            "🔍 Smart Search",
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        SmartSearchPanel.currentPanel = new SmartSearchPanel(panel);
        return SmartSearchPanel.currentPanel;
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "search":
                    await this.performSearch(msg.query);
                    break;
                case "semanticSearch":
                    await this.semanticSearch(msg.query);
                    break;
                case "openFile":
                    await this.openFile(msg.file, msg.line);
                    break;
                case "clearResults":
                    this.results = [];
                    this.update();
                    break;
                case "filterResults":
                    this.filterResults(msg.type);
                    break;
            }
        });
    }

    private async performSearch(query: string): Promise<void> {
        this.isSearching = true;
        this.update();

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            vscode.window.showErrorMessage("No workspace folder open");
            return;
        }

        const results: SearchResult[] = [];
        
        // Search in files
        try {
            const files = await vscode.workspace.findFiles("**/*.{ts,js,tsx,jsx,py,java}", "**/node_modules/**");
            
            for (const file of files.slice(0, 100)) { // Limit search
                try {
                    const content = fs.readFileSync(file.fsPath, "utf-8");
                    const lines = content.split("\n");
                    
                    lines.forEach((line, index) => {
                        if (line.toLowerCase().includes(query.toLowerCase())) {
                            results.push({
                                file: file.fsPath,
                                line: index + 1,
                                content: line.trim(),
                                context: this.getContext(lines, index),
                                relevance: this.calculateRelevance(line, query),
                                type: this.detectType(file.fsPath, line)
                            });
                        }
                    });
                } catch (e) {
                    // Skip unreadable files
                }
            }
        } catch (e) {
            console.error("Search error:", e);
        }

        // Sort by relevance
        results.sort((a, b) => b.relevance - a.relevance);
        
        this.results = results.slice(0, 50);
        
        // Add to history
        this.searchHistory.unshift({
            id: `search-${Date.now()}`,
            query,
            timestamp: new Date().toISOString(),
            resultsCount: this.results.length
        });

        this.isSearching = false;
        this.update();

        if (this.results.length === 0) {
            vscode.window.showInformationMessage("No results found");
        }
    }

    private async semanticSearch(query: string): Promise<void> {
        this.isSearching = true;
        this.update();

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) return;

        // Use AI to understand the search intent
        const intentPrompt = `Understand this search query: "${query}"
        
        What is the user looking for? Provide:
        1. Main intent
        2. Related keywords to search for
        3. File types likely to contain this`;

        try {
            const intent = await this.ollama.ask(intentPrompt);
            
            // Search with expanded terms
            const keywords = intent.content.match(/\b\w+\b/g)?.slice(0, 10) || [];
            const searchTerms = [query, ...keywords].join(" ");
            
            await this.performSearch(searchTerms);
        } catch (e) {
            // Fallback to regular search
            await this.performSearch(query);
        }

        this.isSearching = false;
        this.update();
    }

    private getContext(lines: string[], index: number): string {
        const start = Math.max(0, index - 2);
        const end = Math.min(lines.length, index + 3);
        return lines.slice(start, end).join("\n");
    }

    private calculateRelevance(line: string, query: string): number {
        let score = 0;
        const lowerLine = line.toLowerCase();
        const lowerQuery = query.toLowerCase();
        
        // Exact match
        if (lowerLine.includes(lowerQuery)) score += 10;
        
        // Function/class definition
        if (/(function|class|const|interface|type)\s+\w*${lowerQuery}\w*/i.test(line)) score += 5;
        
        // Comment
        if (/\/\/|\/\*|#/.test(line)) score -= 2;
        
        // Line length (prefer shorter, more focused lines)
        if (line.length < 100) score += 2;
        
        return score;
    }

    private detectType(filePath: string, line: string): "code" | "comment" | "doc" | "test" {
        if (/test|spec/.test(filePath)) return "test";
        if (/readme|changelog|doc/i.test(filePath)) return "doc";
        if (/^\s*(\/\/|\/\*|#|\*)/.test(line)) return "comment";
        return "code";
    }

    private async openFile(file: string, line: number): Promise<void> {
        try {
            const doc = await vscode.workspace.openTextDocument(file);
            const editor = await vscode.window.showTextDocument(doc);
            
            // Go to line
            const position = new vscode.Position(line - 1, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
        } catch (e) {
            vscode.window.showErrorMessage(`Cannot open file: ${file}`);
        }
    }

    private filterResults(type: string): void {
        this.update();
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const typeColors: Record<string, string> = {
            code: "#3498db",
            comment: "#95a5a6",
            doc: "#27ae60",
            test: "#f39c12"
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
            margin-bottom: 20px;
        }
        .header h1 {
            color: #00d4ff;
            margin-bottom: 15px;
        }
        .search-box {
            display: flex;
            gap: 10px;
        }
        .search-input {
            flex: 1;
            padding: 15px 20px;
            border-radius: 12px;
            border: 2px solid #333;
            background: #16213e;
            color: #fff;
            font-size: 1.1em;
        }
        .search-input:focus {
            outline: none;
            border-color: #00d4ff;
        }
        .btn {
            padding: 15px 25px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-weight: bold;
            transition: all 0.3s;
        }
        .btn-primary {
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            color: #1a1a2e;
        }
        .btn-primary:hover {
            transform: scale(1.05);
        }
        .btn-secondary {
            background: #333;
            color: #fff;
        }
        .filters {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        .filter-btn {
            padding: 8px 16px;
            border-radius: 20px;
            background: #333;
            border: none;
            color: #fff;
            cursor: pointer;
            font-size: 0.9em;
        }
        .filter-btn.active {
            background: #00d4ff;
            color: #1a1a2e;
        }
        .main-container {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 20px;
            flex: 1;
            min-height: 0;
        }
        .results {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
            overflow-y: auto;
        }
        .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .results-header h3 {
            color: #00d4ff;
        }
        .result-count {
            color: #888;
        }
        .result-item {
            background: rgba(0,0,0,0.2);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 12px;
            cursor: pointer;
            transition: all 0.2s;
            border-left: 4px solid transparent;
        }
        .result-item:hover {
            background: rgba(0,212,255,0.1);
            border-left-color: #00d4ff;
        }
        .result-file {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .file-name {
            font-weight: bold;
            color: #00d4ff;
            font-family: monospace;
        }
        .file-line {
            color: #888;
            font-size: 0.9em;
        }
        .result-type {
            font-size: 0.75em;
            padding: 3px 8px;
            border-radius: 10px;
            text-transform: uppercase;
        }
        .result-type.code { background: rgba(52,152,219,0.3); color: #3498db; }
        .result-type.comment { background: rgba(149,165,166,0.3); color: #95a5a6; }
        .result-type.doc { background: rgba(39,174,96,0.3); color: #27ae60; }
        .result-type.test { background: rgba(243,156,18,0.3); color: #f39c12; }
        .result-content {
            font-family: monospace;
            font-size: 0.9em;
            color: #ccc;
            margin-bottom: 8px;
            white-space: pre-wrap;
        }
        .result-context {
            background: rgba(0,0,0,0.3);
            padding: 10px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.8em;
            color: #888;
            white-space: pre-wrap;
        }
        .relevance {
            display: flex;
            align-items: center;
            gap: 5px;
            margin-top: 8px;
            font-size: 0.85em;
            color: #888;
        }
        .relevance-bar {
            width: 60px;
            height: 4px;
            background: #333;
            border-radius: 2px;
            overflow: hidden;
        }
        .relevance-fill {
            height: 100%;
            background: #00d4ff;
            border-radius: 2px;
        }
        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .panel {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
        }
        .panel h3 {
            color: #00d4ff;
            margin-bottom: 15px;
        }
        .history-item {
            padding: 10px;
            background: rgba(0,0,0,0.2);
            border-radius: 6px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .history-item:hover {
            background: rgba(0,212,255,0.1);
        }
        .history-query {
            font-weight: bold;
            margin-bottom: 4px;
        }
        .history-meta {
            font-size: 0.8em;
            color: #888;
        }
        .tips {
            font-size: 0.9em;
            color: #888;
        }
        .tip {
            padding: 10px;
            background: rgba(0,0,0,0.2);
            border-radius: 6px;
            margin-bottom: 8px;
        }
        .tip code {
            color: #00d4ff;
            font-family: monospace;
        }
        .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 50px;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #333;
            border-top-color: #00d4ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .empty-state {
            text-align: center;
            padding: 50px;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Smart Search</h1>
        <div class="search-box">
            <input type="text" class="search-input" id="searchInput" 
                   placeholder="Search code, files, functions..."
                   onkeypress="if(event.key==='Enter') search()">
            <button class="btn btn-primary" onclick="search()">Search</button>
            <button class="btn btn-secondary" onclick="semanticSearch()">🤖 AI</button>
        </div>
        <div class="filters">
            <button class="filter-btn active" onclick="filterResults('all')">All</button>
            <button class="filter-btn" onclick="filterResults('code')">Code</button>
            <button class="filter-btn" onclick="filterResults('test')">Tests</button>
            <button class="filter-btn" onclick="filterResults('doc')">Docs</button>
        </div>
    </div>

    <div class="main-container">
        <div class="results">
            ${this.isSearching ? `
            <div class="loading">
                <div class="spinner"></div>
            </div>
            ` : this.results.length === 0 ? `
            <div class="empty-state">
                <p style="font-size: 3em;">🔍</p>
                <p style="margin-top: 20px;">Start typing to search</p>
                <p style="margin-top: 10px; font-size: 0.9em;">
                    Search across all files in your project
                </p>
            </div>
            ` : `
            <div class="results-header">
                <h3>Results</h3>
                <span class="result-count">${this.results.length} found</span>
            </div>
            ${this.results.map(r => `
            <div class="result-item" onclick="openFile('${r.file.replace(/\\/g, '\\\\')}', ${r.line})">
                <div class="result-file">
                    <span class="file-name">${path.basename(r.file)}</span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <span class="result-type ${r.type}">${r.type}</span>
                        <span class="file-line">:${r.line}</span>
                    </div>
                </div>
                <div class="result-content">${this.escapeHtml(r.content)}</div>
                <div class="result-context">${this.escapeHtml(r.context)}</div>
                <div class="relevance">
                    Relevance
                    <div class="relevance-bar">
                        <div class="relevance-fill" style="width: ${Math.min(100, r.relevance * 5)}%"></div>
                    </div>
                </div>
            </div>
            `).join('')}
            `}
        </div>

        <div class="sidebar">
            <div class="panel">
                <h3>📜 History</h3>
                ${this.searchHistory.length === 0 ? `
                <div class="empty-state" style="padding: 20px;">
                    No recent searches
                </div>
                ` : this.searchHistory.map(h => `
                <div class="history-item" onclick="searchHistory('${h.query}')">
                    <div class="history-query">${h.query}</div>
                    <div class="history-meta">${h.resultsCount} results</div>
                </div>
                `).join('')}
            </div>

            <div class="panel">
                <h3>💡 Search Tips</h3>
                <div class="tips">
                    <div class="tip">
                        <code>function name</code> - Search functions
                    </div>
                    <div class="tip">
                        <code>class Name</code> - Search classes
                    </div>
                    <div class="tip">
                        <code>@mention</code> - Use AI search
                    </div>
                    <div class="tip">
                        <code>test:</code> - Filter to tests
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function search() {
            const query = document.getElementById('searchInput').value;
            if (query.trim()) {
                vscode.postMessage({ command: 'search', query });
            }
        }

        function semanticSearch() {
            const query = document.getElementById('searchInput').value;
            if (query.trim()) {
                vscode.postMessage({ command: 'semanticSearch', query });
            }
        }

        function searchHistory(query) {
            document.getElementById('searchInput').value = query;
            vscode.postMessage({ command: 'search', query });
        }

        function openFile(file, line) {
            vscode.postMessage({ command: 'openFile', file, line });
        }

        function filterResults(type) {
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            vscode.postMessage({ command: 'filterResults', type });
        }
    </script>
</body>
</html>`;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    public dispose(): void {
        SmartSearchPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
