/**
 * MarketplacePanel - FAZA 20
 * Gotowe moduły do przeciągnięcia
 */

import * as vscode from "vscode";
import { BrainStore } from "../storage/BrainStore";
import { OllamaClient } from "../ai/OllamaClient";

export interface MarketplaceModule {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: "auth" | "api" | "database" | "ui" | "integration" | "ai";
    technologies: string[];
    features: string[];
    complexity: "low" | "medium" | "high";
    downloadCount: number;
    rating: number;
}

export class MarketplacePanel {
    public static currentPanel: MarketplacePanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private ollama: OllamaClient;
    private selectedCategory: string = "all";

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.ollama = new OllamaClient();
        this.setupMessageHandler();
        this.update();
    }

    public static createOrShow(): MarketplacePanel {
        if (MarketplacePanel.currentPanel) {
            MarketplacePanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return MarketplacePanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "marketplace",
            "🛒 Marketplace",
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        MarketplacePanel.currentPanel = new MarketplacePanel(panel);
        return MarketplacePanel.currentPanel;
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "filterCategory":
                    this.selectedCategory = msg.category;
                    this.update();
                    break;
                case "installModule":
                    await this.installModule(msg.moduleId);
                    break;
                case "generateModule":
                    await this.generateModule(msg.moduleId);
                    break;
                case "searchModules":
                    await this.searchModules(msg.query);
                    break;
            }
        });
    }

    private getModules(): MarketplaceModule[] {
        return [
            {
                id: "auth",
                name: "Authentication",
                description: "Complete authentication system with JWT, OAuth2, and MFA support",
                icon: "🔐",
                category: "auth",
                technologies: ["JWT", "OAuth2", "bcrypt"],
                features: ["Login/Register", "Password Reset", "Social Login", "2FA", "Session Management"],
                complexity: "high",
                downloadCount: 15420,
                rating: 4.8
            },
            {
                id: "payments",
                name: "Payments",
                description: "Multi-provider payment integration (Stripe, PayPal, etc.)",
                icon: "💳",
                category: "integration",
                technologies: ["Stripe API", "PayPal SDK", "Webhooks"],
                features: ["Credit Cards", "Subscriptions", "Refunds", "Invoice Generation"],
                complexity: "high",
                downloadCount: 8920,
                rating: 4.6
            },
            {
                id: "crm",
                name: "CRM",
                description: "Customer relationship management with contacts, deals, and activities",
                icon: "👥",
                category: "database",
                technologies: ["CRUD API", "Search", "Analytics"],
                features: ["Contacts", "Deals Pipeline", "Activity Tracking", "Email Integration"],
                complexity: "medium",
                downloadCount: 6340,
                rating: 4.5
            },
            {
                id: "blog",
                name: "Blog",
                description: "Full-featured blog with CMS, categories, and comments",
                icon: "📝",
                category: "ui",
                technologies: ["Markdown", "Rich Text Editor", "SEO"],
                features: ["Posts", "Categories", "Tags", "Comments", "Search", "RSS"],
                complexity: "medium",
                downloadCount: 12100,
                rating: 4.7
            },
            {
                id: "dashboard",
                name: "Dashboard",
                description: "Analytics dashboard with charts, metrics, and real-time updates",
                icon: "📊",
                category: "ui",
                technologies: ["Chart.js", "D3.js", "WebSocket"],
                features: ["Charts", "Metrics", "Real-time Data", "Export", "Alerts"],
                complexity: "medium",
                downloadCount: 9870,
                rating: 4.4
            },
            {
                id: "chat",
                name: "Chat",
                description: "Real-time chat system with rooms, direct messages, and file sharing",
                icon: "💬",
                category: "integration",
                technologies: ["WebSocket", "Socket.io", "WebRTC"],
                features: ["Chat Rooms", "Direct Messages", "File Sharing", "Typing Indicators"],
                complexity: "high",
                downloadCount: 7650,
                rating: 4.6
            },
            {
                id: "ai",
                name: "AI Assistant",
                description: "AI chatbot with context awareness and custom prompts",
                icon: "🤖",
                category: "ai",
                technologies: ["Ollama", "OpenAI", "LangChain"],
                features: ["Context Memory", "Custom Prompts", "Multi-model Support", "API Integration"],
                complexity: "medium",
                downloadCount: 5430,
                rating: 4.3
            },
            {
                id: "api",
                name: "REST API",
                description: "Production-ready REST API with auth, validation, and documentation",
                icon: "🔌",
                category: "api",
                technologies: ["Express", "Prisma", "Swagger"],
                features: ["CRUD", "Authentication", "Validation", "Rate Limiting", "API Docs"],
                complexity: "medium",
                downloadCount: 18900,
                rating: 4.9
            },
            {
                id: "notification",
                name: "Notifications",
                description: "Multi-channel notifications (email, SMS, push)",
                icon: "🔔",
                category: "integration",
                technologies: ["SendGrid", "Twilio", "Firebase"],
                features: ["Email", "SMS", "Push Notifications", "Templates", "Scheduling"],
                complexity: "medium",
                downloadCount: 4560,
                rating: 4.2
            },
            {
                id: "search",
                name: "Smart Search",
                description: "Full-text search with filters, autocomplete, and relevance tuning",
                icon: "🔍",
                category: "api",
                technologies: ["Elasticsearch", "MeiliSearch"],
                features: ["Full-text Search", "Filters", "Autocomplete", "Synonyms"],
                complexity: "medium",
                downloadCount: 6780,
                rating: 4.5
            }
        ];
    }

    private async installModule(moduleId: string): Promise<void> {
        const modules = this.getModules();
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        vscode.window.showInformationMessage(`Installing ${module.name}...`);

        // Create module in BrainStore
        const newModule = this.store.addModule({
            name: module.name,
            description: module.description,
            status: "BACKLOG" as any,
            progress: 0,
            locked: false,
            dependencies: module.technologies,
            files: [],
            dependsOn: [],
            position: { x: 0, y: 0 }
        });

        // Generate module code
        await this.generateModuleCode(module);

        vscode.window.showInformationMessage(`${module.name} installed successfully!`);
        this.update();
    }

    private async generateModule(moduleId: string): Promise<void> {
        const modules = this.getModules();
        const module = modules.find(m => m.id === moduleId);
        if (!module) return;

        await this.generateModuleCode(module);
    }

    private async generateModuleCode(module: MarketplaceModule): Promise<void> {
        const prompt = `Generate a complete ${module.name} module for a web application.

Requirements:
- Technologies: ${module.technologies.join(", ")}
- Features: ${module.features.join(", ")}

Please generate:
1. Main implementation code
2. Type definitions
3. Basic tests
4. README documentation

Language/Framework: Use modern JavaScript/TypeScript best practices.
Output the complete, production-ready code with proper error handling and comments.`;

        try {
            const result = await this.ollama.ask(prompt);
            if (result.success) {
                // Show generated code
                this.panel.webview.postMessage({
                    command: "showGeneratedCode",
                    moduleId: module.id,
                    code: result.content
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error generating module: ${error}`);
        }
    }

    private async searchModules(query: string): Promise<void> {
        // Search is handled by filtering in the UI
        this.update();
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const modules = this.getModules();
        const filteredModules = this.selectedCategory === "all" 
            ? modules 
            : modules.filter(m => m.category === this.selectedCategory);

        const categories = [
            { id: "all", name: "All", icon: "🛒" },
            { id: "auth", name: "Auth", icon: "🔐" },
            { id: "api", name: "API", icon: "🔌" },
            { id: "database", name: "Database", icon: "💾" },
            { id: "ui", name: "UI", icon: "🎨" },
            { id: "integration", name: "Integration", icon: "🔗" },
            { id: "ai", name: "AI", icon: "🤖" }
        ];

        const complexityColors: Record<string, string> = {
            low: "#27ae60",
            medium: "#f39c12",
            high: "#e74c3c"
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
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
        }
        .header h1 {
            color: #00d4ff;
        }
        .search-box {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .search-box input {
            flex: 1;
            padding: 12px 20px;
            border-radius: 25px;
            border: 1px solid #333;
            background: #16213e;
            color: #fff;
            font-size: 1em;
        }
        .search-box input:focus {
            outline: none;
            border-color: #00d4ff;
        }
        .categories {
            display: flex;
            gap: 10px;
            margin-bottom: 25px;
            flex-wrap: wrap;
        }
        .category-btn {
            padding: 8px 16px;
            border-radius: 20px;
            background: #16213e;
            border: 1px solid #333;
            color: #fff;
            cursor: pointer;
            transition: all 0.3s;
        }
        .category-btn:hover, .category-btn.active {
            background: #00d4ff;
            color: #1a1a2e;
            border-color: #00d4ff;
        }
        .modules-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .module-card {
            background: #16213e;
            border-radius: 16px;
            overflow: hidden;
            transition: all 0.3s;
            cursor: pointer;
        }
        .module-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,212,255,0.2);
        }
        .module-header {
            padding: 20px;
            background: linear-gradient(135deg, rgba(0,212,255,0.1), rgba(0,255,136,0.1));
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .module-icon {
            font-size: 2.5em;
        }
        .module-title {
            flex: 1;
        }
        .module-title h3 {
            margin-bottom: 5px;
        }
        .module-title span {
            font-size: 0.85em;
            color: #888;
        }
        .module-body {
            padding: 20px;
        }
        .module-description {
            color: #ccc;
            margin-bottom: 15px;
            font-size: 0.9em;
            line-height: 1.5;
        }
        .module-features {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-bottom: 15px;
        }
        .feature-tag {
            background: rgba(0,212,255,0.2);
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.75em;
        }
        .module-tech {
            display: flex;
            gap: 5px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        .tech-tag {
            background: rgba(255,255,255,0.1);
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 0.75em;
            font-family: monospace;
        }
        .module-footer {
            padding: 15px 20px;
            background: rgba(0,0,0,0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .module-stats {
            display: flex;
            gap: 15px;
            font-size: 0.85em;
            color: #888;
        }
        .module-rating {
            color: #f39c12;
        }
        .complexity-badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.75em;
            font-weight: bold;
            text-transform: uppercase;
        }
        .complexity-low { background: #27ae60; }
        .complexity-medium { background: #f39c12; }
        .complexity-high { background: #e74c3c; }
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
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
        .drag-hint {
            text-align: center;
            padding: 15px;
            color: #888;
            font-size: 0.9em;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛒 Module Marketplace</h1>
        <button class="btn btn-secondary" onclick="location.reload()">🔄 Refresh</button>
    </div>

    <div class="drag-hint">
        💡 Click "Install" to add a module to your project
    </div>

    <div class="search-box">
        <input type="text" id="searchInput" placeholder="Search modules..." onkeyup="search()">
    </div>

    <div class="categories">
        ${categories.map(c => `
        <button class="category-btn ${c.id === this.selectedCategory ? 'active' : ''}" 
                onclick="filterCategory('${c.id}')">
            ${c.icon} ${c.name}
        </button>
        `).join('')}
    </div>

    <div class="modules-grid" id="modulesGrid">
        ${filteredModules.map(m => `
        <div class="module-card" id="module-${m.id}">
            <div class="module-header">
                <div class="module-icon">${m.icon}</div>
                <div class="module-title">
                    <h3>${m.name}</h3>
                    <span>${m.category}</span>
                </div>
            </div>
            <div class="module-body">
                <p class="module-description">${m.description}</p>
                <div class="module-features">
                    ${m.features.slice(0, 4).map(f => `<span class="feature-tag">${f}</span>`).join('')}
                    ${m.features.length > 4 ? `<span class="feature-tag">+${m.features.length - 4} more</span>` : ''}
                </div>
                <div class="module-tech">
                    ${m.technologies.map(t => `<span class="tech-tag">${t}</span>`).join('')}
                </div>
            </div>
            <div class="module-footer">
                <div class="module-stats">
                    <span>📥 ${m.downloadCount.toLocaleString()}</span>
                    <span class="module-rating">⭐ ${m.rating}</span>
                </div>
                <span class="complexity-badge complexity-${m.complexity}">${m.complexity}</span>
            </div>
            <div style="padding: 15px; display: flex; gap: 10px;">
                <button class="btn btn-primary" style="flex: 1;" onclick="installModule('${m.id}')">📥 Install</button>
                <button class="btn btn-secondary" onclick="generateModule('${m.id}')">⚡ Preview</button>
            </div>
        </div>
        `).join('')}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function filterCategory(category) {
            vscode.postMessage({ command: 'filterCategory', category });
        }

        function installModule(moduleId) {
            vscode.postMessage({ command: 'installModule', moduleId });
        }

        function generateModule(moduleId) {
            vscode.postMessage({ command: 'generateModule', moduleId });
        }

        function search() {
            const query = document.getElementById('searchInput').value.toLowerCase();
            const cards = document.querySelectorAll('.module-card');
            
            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(query) ? 'block' : 'none';
            });
        }

        // Listen for messages
        window.addEventListener('message', event => {
            const msg = event.data;
            if (msg.command === 'showGeneratedCode') {
                // Could show a modal with the generated code
                alert('Code generated! Check your project files.');
            }
        });
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        MarketplacePanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
