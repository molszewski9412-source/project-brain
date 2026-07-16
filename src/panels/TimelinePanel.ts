/**
 * TimelinePanel - FAZA 11
 * Wizualna historia projektu
 */

import * as vscode from "vscode";
import { BrainStore } from "../storage/BrainStore";

export interface TimelineEvent {
    id: string;
    timestamp: string;
    type: "ai" | "user" | "system";
    action: string;
    description: string;
    icon: string;
    details?: string;
}

export class TimelinePanel {
    public static currentPanel: TimelinePanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private events: TimelineEvent[] = [];

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.loadEvents();
        this.update();
    }

    public static createOrShow(): TimelinePanel {
        if (TimelinePanel.currentPanel) {
            TimelinePanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return TimelinePanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "timeline",
            "📅 Timeline",
            vscode.ViewColumn.Two,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        TimelinePanel.currentPanel = new TimelinePanel(panel);
        return TimelinePanel.currentPanel;
    }

    private loadEvents(): void {
        const history = this.store.getHistory();
        const modules = this.store.getModules();
        const decisions = this.store.getDecisions();

        // Convert history to timeline events
        this.events = history.map(h => ({
            id: h.id,
            timestamp: h.timestamp,
            type: this.getTypeFromAction(h.action) as "ai" | "user" | "system",
            action: h.action,
            description: h.description,
            icon: this.getIconForAction(h.action),
            details: (h as any).details
        }));

        // Sort by timestamp (newest first)
        this.events.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }

    private getTypeFromAction(action: string): string {
        if (action.includes("AI") || action.includes("GENERATE")) return "ai";
        if (action.includes("USER") || action.includes("MANUAL")) return "user";
        return "system";
    }

    private getIconForAction(action: string): string {
        const icons: Record<string, string> = {
            CREATE: "✨",
            UPDATE: "📝",
            DELETE: "🗑️",
            LOCK: "🔒",
            UNLOCK: "🔓",
            APPROVE: "✅",
            REJECT: "❌",
            AI_GENERATE: "🤖",
            AI_ANALYZE: "🔍",
            AI_REVIEW: "🔬",
            USER_EDIT: "👤",
            SYSTEM: "⚙️"
        };
        return icons[action] || "📌";
    }

    public update(): void {
        this.loadEvents();
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const typeColors: Record<string, string> = {
            ai: "#9b59b6",
            user: "#3498db",
            system: "#27ae60"
        };

        const formatTime = (timestamp: string) => {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return "Just now";
            if (minutes < 60) return `${minutes}m ago`;
            if (hours < 24) return `${hours}h ago`;
            if (days < 7) return `${days}d ago`;
            return date.toLocaleDateString();
        };

        const formatFullTime = (timestamp: string) => {
            const date = new Date(timestamp);
            return date.toLocaleString();
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
            margin-bottom: 30px;
        }
        .header h1 {
            color: #00d4ff;
        }
        .filter-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .filter-tab {
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            background: #333;
            border: none;
            color: #fff;
            transition: all 0.3s;
        }
        .filter-tab:hover, .filter-tab.active {
            background: #00d4ff;
            color: #1a1a2e;
        }
        .timeline {
            position: relative;
            padding-left: 40px;
        }
        .timeline::before {
            content: '';
            position: absolute;
            left: 15px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(to bottom, #00d4ff, #9b59b6);
        }
        .event {
            position: relative;
            margin-bottom: 25px;
            padding: 15px 20px;
            background: #16213e;
            border-radius: 12px;
            border-left: 4px solid;
            transition: transform 0.2s;
        }
        .event:hover {
            transform: translateX(5px);
        }
        .event::before {
            content: '';
            position: absolute;
            left: -33px;
            top: 20px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #1a1a2e;
            border: 3px solid;
        }
        .event.ai::before { border-color: #9b59b6; }
        .event.user::before { border-color: #3498db; }
        .event.system::before { border-color: #27ae60; }
        
        .event.ai { border-color: #9b59b6; }
        .event.user { border-color: #3498db; }
        .event.system { border-color: #27ae60; }
        
        .event-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .event-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: bold;
        }
        .event-time {
            color: #888;
            font-size: 0.85em;
        }
        .event-description {
            color: #ccc;
            margin-bottom: 5px;
        }
        .event-details {
            background: rgba(0,0,0,0.2);
            padding: 10px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.85em;
            color: #aaa;
        }
        .type-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.7em;
            text-transform: uppercase;
        }
        .type-badge.ai { background: #9b59b6; }
        .type-badge.user { background: #3498db; }
        .type-badge.system { background: #27ae60; }
        .empty {
            text-align: center;
            color: #888;
            padding: 50px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #16213e;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #00d4ff;
        }
        .stat-label {
            color: #888;
            margin-top: 5px;
        }
        .date-group {
            margin-bottom: 30px;
        }
        .date-header {
            color: #888;
            font-size: 0.9em;
            margin-bottom: 10px;
            padding-left: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📅 Timeline</h1>
        <button class="filter-tab" onclick="location.reload()">🔄 Refresh</button>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-value">${this.events.length}</div>
            <div class="stat-label">Total Events</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${this.events.filter(e => e.type === 'ai').length}</div>
            <div class="stat-label">AI Actions</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${this.events.filter(e => e.type === 'user').length}</div>
            <div class="stat-label">User Actions</div>
        </div>
    </div>

    <div class="filter-tabs">
        <button class="filter-tab active" onclick="filterEvents('all')">All</button>
        <button class="filter-tab" onclick="filterEvents('ai')">🤖 AI</button>
        <button class="filter-tab" onclick="filterEvents('user')">👤 User</button>
        <button class="filter-tab" onclick="filterEvents('system')">⚙️ System</button>
    </div>

    <div class="timeline" id="timeline">
        ${this.events.length === 0 ? `
        <div class="empty">
            <p>No events yet.</p>
            <p style="margin-top: 10px;">Start using Project Brain to see history!</p>
        </div>
        ` : this.events.map(event => `
        <div class="event ${event.type}" data-type="${event.type}">
            <div class="event-header">
                <div class="event-title">
                    <span>${event.icon}</span>
                    <span>${event.action}</span>
                    <span class="type-badge ${event.type}">${event.type}</span>
                </div>
                <span class="event-time" title="${formatFullTime(event.timestamp)}">${formatTime(event.timestamp)}</span>
            </div>
            <div class="event-description">${event.description}</div>
            ${event.details ? `<div class="event-details">${event.details}</div>` : ''}
        </div>
        `).join('')}
    </div>

    <script>
        function filterEvents(type) {
            // Update active tab
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            event.target.classList.add('active');

            // Filter events
            const events = document.querySelectorAll('.event');
            events.forEach(event => {
                if (type === 'all' || event.dataset.type === type) {
                    event.style.display = 'block';
                } else {
                    event.style.display = 'none';
                }
            });
        }
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        TimelinePanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
