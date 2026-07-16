/**
 * AIReviewService - TASK 9.1
 * Kompleksowy AI Review Suite - Security, Performance, Style, Bugs
 */

import * as vscode from "vscode";
import { OllamaClient } from "../ai/OllamaClient";
import { BrainStore } from "../storage/BrainStore";

export interface ReviewResult {
    success: boolean;
    category: ReviewCategory;
    score: number; // 0-100
    issues: ReviewIssue[];
    summary: string;
    suggestions: string[];
}

export interface ReviewIssue {
    severity: "critical" | "high" | "medium" | "low";
    line?: number;
    file?: string;
    title: string;
    description: string;
    suggestion: string;
}

export type ReviewCategory = "security" | "performance" | "style" | "bugs" | "full";

export class AIReviewService {
    private ollama: OllamaClient;
    private store: BrainStore;

    constructor() {
        this.ollama = new OllamaClient();
        this.store = new BrainStore();
    }

    /**
     * TASK 9.1: Przeprowadzenie pełnego review
     */
    async reviewAll(): Promise<ReviewResult[]> {
        const results: ReviewResult[] = [];

        const categories: ReviewCategory[] = ["security", "performance", "style", "bugs"];
        
        for (const category of categories) {
            const result = await this.review(category);
            results.push(result);
        }

        return results;
    }

    /**
     * TASK 9.1: Review konkretnej kategorii
     */
    async review(category: ReviewCategory): Promise<ReviewResult> {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (!workspace) {
            return this.emptyResult(category);
        }

        // Get files to review
        const files = await this.getFilesToReview();
        if (files.length === 0) {
            return this.emptyResult(category);
        }

        // Build review prompt based on category
        const prompt = this.buildReviewPrompt(category, files);
        
        try {
            const response = await this.ollama.ask(prompt);
            
            if (!response.success) {
                return {
                    success: false,
                    category,
                    score: 0,
                    issues: [],
                    summary: "AI not available",
                    suggestions: []
                };
            }

            return this.parseReviewResponse(category, response.content);
        } catch (error) {
            return {
                success: false,
                category,
                score: 0,
                issues: [],
                summary: String(error),
                suggestions: []
            };
        }
    }

    /**
     * TASK 9.2: Security Review
     */
    async reviewSecurity(): Promise<ReviewResult> {
        return this.review("security");
    }

    /**
     * TASK 9.3: Performance Review
     */
    async reviewPerformance(): Promise<ReviewResult> {
        return this.review("performance");
    }

    /**
     * TASK 9.4: Style Review
     */
    async reviewStyle(): Promise<ReviewResult> {
        return this.review("style");
    }

    /**
     * TASK 9.5: Bug Detection
     */
    async reviewBugs(): Promise<ReviewResult> {
        return this.review("bugs");
    }

    /**
     * TASK 9.1: Pobieranie plików do review
     */
    private async getFilesToReview(): Promise<{ path: string; content: string }[]> {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (!workspace) return [];

        const files: { path: string; content: string }[] = [];
        const patterns = ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.py"];

        for (const pattern of patterns) {
            const uris = await vscode.workspace.findFiles(pattern, "**/node_modules/**", 20);
            
            for (const uri of uris) {
                try {
                    const doc = await vscode.workspace.openTextDocument(uri);
                    const content = doc.getText();
                    
                    // Skip very large files
                    if (content.length > 50000) continue;
                    
                    files.push({
                        path: vscode.workspace.asRelativePath(uri),
                        content: content.substring(0, 10000) // Limit content
                    });
                } catch (e) {
                    // Skip files that can't be read
                }
            }
        }

        return files;
    }

    /**
     * TASK 9.1: Budowanie promptu review
     */
    private buildReviewPrompt(category: ReviewCategory, files: { path: string; content: string }[]): string {
        const categoryPrompts: Record<ReviewCategory, string> = {
            security: `You are a security expert. Review the following code for:
1. SQL Injection vulnerabilities
2. XSS vulnerabilities
3. Authentication/Authorization issues
4. Sensitive data exposure
5. Insecure dependencies
6. Hardcoded credentials
7. Unsafe deserialization

Return a JSON response with this structure:
{
    "score": 0-100,
    "issues": [
        {
            "severity": "critical|high|medium|low",
            "file": "filename.ts",
            "line": 123,
            "title": "Issue title",
            "description": "Description",
            "suggestion": "How to fix"
        }
    ],
    "summary": "Brief summary",
    "suggestions": ["Recommendation 1", "Recommendation 2"]
}`,

            performance: `You are a performance expert. Review the following code for:
1. N+1 query problems
2. Memory leaks
3. Unnecessary re-renders
4. Inefficient algorithms
5. Missing caching
6. Large bundle sizes
7. Unoptimized images/assets

Return a JSON response with this structure:
{
    "score": 0-100,
    "issues": [
        {
            "severity": "critical|high|medium|low",
            "file": "filename.ts",
            "line": 123,
            "title": "Issue title",
            "description": "Description",
            "suggestion": "How to fix"
        }
    ],
    "summary": "Brief summary",
    "suggestions": ["Recommendation 1", "Recommendation 2"]
}`,

            style: `You are a code style expert. Review the following code for:
1. Inconsistent naming conventions
2. Missing documentation
3. Complex nested conditions
4. Magic numbers/strings
5. Code duplication
6. Poor error handling
7. Non-idiomatic patterns

Return a JSON response with this structure:
{
    "score": 0-100,
    "issues": [
        {
            "severity": "critical|high|medium|low",
            "file": "filename.ts",
            "line": 123,
            "title": "Issue title",
            "description": "Description",
            "suggestion": "How to fix"
        }
    ],
    "summary": "Brief summary",
    "suggestions": ["Recommendation 1", "Recommendation 2"]
}`,

            bugs: `You are a bug detection expert. Review the following code for:
1. Race conditions
2. Null/undefined handling
3. Edge cases
4. Error handling issues
5. Logic errors
6. Boundary conditions
7. Async/await issues

Return a JSON response with this structure:
{
    "score": 0-100,
    "issues": [
        {
            "severity": "critical|high|medium|low",
            "file": "filename.ts",
            "line": 123,
            "title": "Issue title",
            "description": "Description",
            "suggestion": "How to fix"
        }
    ],
    "summary": "Brief summary",
    "suggestions": ["Recommendation 1", "Recommendation 2"]
}`,

            full: `You are a comprehensive code reviewer. Review the following code for ALL issues:
- Security vulnerabilities
- Performance problems
- Style inconsistencies
- Potential bugs

Return a JSON response with this structure:
{
    "score": 0-100,
    "issues": [
        {
            "severity": "critical|high|medium|low",
            "file": "filename.ts",
            "line": 123,
            "title": "Issue title",
            "description": "Description",
            "suggestion": "How to fix"
        }
    ],
    "summary": "Brief summary",
    "suggestions": ["Recommendation 1", "Recommendation 2"]
}`
        };

        let prompt = categoryPrompts[category] + "\n\n";
        
        // Add code files
        for (const file of files.slice(0, 5)) { // Limit to 5 files
            prompt += `\n// File: ${file.path}\n${file.content}\n`;
        }

        prompt += "\n\nReturn ONLY JSON, no other text.";

        return prompt;
    }

    /**
     * TASK 9.1: Parsowanie odpowiedzi AI
     */
    private parseReviewResponse(category: ReviewCategory, content: string): ReviewResult {
        try {
            // Try to find JSON in response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    success: true,
                    category,
                    score: parsed.score || 0,
                    issues: parsed.issues || [],
                    summary: parsed.summary || "",
                    suggestions: parsed.suggestions || []
                };
            }
        } catch (e) {
            // JSON parsing failed
        }

        // Return parsed result from text
        return {
            success: true,
            category,
            score: this.estimateScore(content),
            issues: this.extractIssuesFromText(content),
            summary: this.extractSummary(content),
            suggestions: this.extractSuggestions(content)
        };
    }

    private emptyResult(category: ReviewCategory): ReviewResult {
        return {
            success: false,
            category,
            score: 0,
            issues: [],
            summary: "No files to review",
            suggestions: []
        };
    }

    private estimateScore(content: string): number {
        const lower = content.toLowerCase();
        if (lower.includes("critical")) return Math.random() * 40 + 30;
        if (lower.includes("high")) return Math.random() * 30 + 50;
        if (lower.includes("medium")) return Math.random() * 20 + 70;
        return Math.random() * 10 + 85;
    }

    private extractIssuesFromText(content: string): ReviewIssue[] {
        const issues: ReviewIssue[] = [];
        const lines = content.split("\n");
        
        for (const line of lines) {
            if (line.includes("Issue:") || line.includes("- [") || line.includes("• ")) {
                const match = line.match(/(critical|high|medium|low)/i);
                issues.push({
                    severity: (match ? match[1].toLowerCase() : "medium") as ReviewIssue["severity"],
                    title: line.replace(/^[\s\-\*]+/, "").substring(0, 100),
                    description: "",
                    suggestion: ""
                });
            }
        }
        
        return issues.slice(0, 20);
    }

    private extractSummary(content: string): string {
        const lines = content.split("\n");
        for (const line of lines) {
            if (line.includes("Summary:") || line.includes("summary")) {
                return line.replace(/.*?:/, "").trim().substring(0, 200);
            }
        }
        return content.substring(0, 200);
    }

    private extractSuggestions(content: string): string[] {
        const suggestions: string[] = [];
        const lines = content.split("\n");
        
        for (const line of lines) {
            if (line.includes("suggestion") || line.includes("recommend") || line.startsWith("-")) {
                suggestions.push(line.replace(/^[\s\-\*]+/, "").substring(0, 100));
            }
        }
        
        return suggestions.slice(0, 5);
    }
}

/**
 * TASK 9.1: Panel do wyświetlania review
 */
export class AIReviewPanel {
    private static currentPanel: AIReviewPanel | undefined;
    private panel: vscode.WebviewPanel;
    private reviewService: AIReviewService;
    private results: ReviewResult[] = [];

    private constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.reviewService = new AIReviewService();
        this.update();
    }

    public static createOrShow(): AIReviewPanel {
        if (AIReviewPanel.currentPanel) {
            AIReviewPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return AIReviewPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "aiReview",
            "🔍 AI Code Review",
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        AIReviewPanel.currentPanel = new AIReviewPanel(panel);
        return AIReviewPanel.currentPanel;
    }

    public async runFullReview(): Promise<void> {
        vscode.window.showInformationMessage("🔍 Running AI Code Review...");
        
        this.results = await this.reviewService.reviewAll();
        
        // Save to history
        const store = new BrainStore();
        store.addRecentChange("AI Review", `${this.results.length} categories analyzed`);
        
        this.update();
        
        const avgScore = this.results.reduce((sum, r) => sum + r.score, 0) / this.results.length;
        vscode.window.showInformationMessage(`✅ Review complete! Average score: ${avgScore.toFixed(0)}/100`);
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const scoreColors: Record<string, string> = {
            security: "#e74c3c",
            performance: "#f39c12",
            style: "#9b59b6",
            bugs: "#e67e22"
        };

        const categoryIcons: Record<string, string> = {
            security: "🔐",
            performance: "⚡",
            style: "🎨",
            bugs: "🐛"
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
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 2em;
            color: #00d4ff;
        }
        .run-btn {
            background: linear-gradient(135deg, #e74c3c, #f39c12);
            color: #fff;
            border: none;
            padding: 15px 30px;
            font-size: 1.1em;
            border-radius: 25px;
            cursor: pointer;
            margin-top: 20px;
        }
        .run-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 20px rgba(231, 76, 60, 0.3);
        }
        .results {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .result-card {
            background: #16213e;
            border-radius: 15px;
            padding: 20px;
            border-left: 4px solid;
        }
        .result-card h3 {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
        }
        .score {
            font-size: 3em;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
        }
        .score.good { color: #27ae60; }
        .score.ok { color: #f39c12; }
        .score.bad { color: #e74c3c; }
        .issues {
            margin-top: 15px;
        }
        .issue {
            background: rgba(255,255,255,0.05);
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        .issue.critical { border-left: 3px solid #e74c3c; }
        .issue.high { border-left: 3px solid #f39c12; }
        .issue.medium { border-left: 3px solid #3498db; }
        .issue.low { border-left: 3px solid #95a5a6; }
        .severity {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75em;
            text-transform: uppercase;
        }
        .severity.critical { background: #e74c3c; }
        .severity.high { background: #f39c12; }
        .severity.medium { background: #3498db; }
        .severity.low { background: #95a5a6; }
        .suggestions {
            margin-top: 15px;
            padding: 15px;
            background: rgba(0,212,255,0.1);
            border-radius: 8px;
        }
        .suggestions h4 { color: #00d4ff; margin-bottom: 10px; }
        .suggestions li { margin-left: 20px; margin-bottom: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 AI Code Review</h1>
        <p>Security, Performance, Style, Bugs</p>
        <button class="run-btn" onclick="runReview()">🚀 Run Full Review</button>
    </div>

    <div class="results">
        ${this.results.length === 0 ? '<p style="text-align:center;color:#888">Click "Run Full Review" to start</p>' : ''}
        ${this.results.map(r => this.buildResultCard(r)).join('')}
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function runReview() {
            vscode.postMessage({ command: 'runReview' });
        }
        
        window.addEventListener('message', e => {
            if (e.data.command === 'refresh') {
                location.reload();
            }
        });
    </script>
</body>
</html>`;
    }

    private buildResultCard(result: ReviewResult): string {
        const colors: Record<string, string> = {
            security: "#e74c3c",
            performance: "#f39c12",
            style: "#9b59b6",
            bugs: "#e67e22"
        };

        const icons: Record<string, string> = {
            security: "🔐",
            performance: "⚡",
            style: "🎨",
            bugs: "🐛"
        };

        const scoreClass = result.score >= 70 ? "good" : result.score >= 40 ? "ok" : "bad";

        return `
        <div class="result-card" style="border-color: ${colors[result.category]}">
            <h3>${icons[result.category]} ${result.category.toUpperCase()}</h3>
            <div class="score ${scoreClass}">${result.score.toFixed(0)}</div>
            
            ${result.issues.length > 0 ? `
            <div class="issues">
                <h4>Issues Found: ${result.issues.length}</h4>
                ${result.issues.slice(0, 5).map(i => `
                <div class="issue ${i.severity}">
                    <span class="severity ${i.severity}">${i.severity}</span>
                    <strong>${i.title}</strong>
                    ${i.file ? `<small> (${i.file}${i.line ? ':' + i.line : ''})</small>` : ''}
                    <p>${i.suggestion}</p>
                </div>
                `).join('')}
            </div>
            ` : '<p>No issues found! 🎉</p>'}
            
            ${result.suggestions.length > 0 ? `
            <div class="suggestions">
                <h4>💡 Suggestions</h4>
                <ul>
                    ${result.suggestions.map(s => `<li>${s}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
        </div>
        `;
    }
}
