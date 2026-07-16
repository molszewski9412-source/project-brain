/**
 * TeamPanel - FAZA 21
 * Praca zespołowa
 */

import * as vscode from "vscode";
import { BrainStore } from "../storage/BrainStore";

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: "owner" | "admin" | "developer" | "viewer";
    status: "online" | "away" | "offline";
    lastActive: string;
    tasks: string[];
}

export interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    timestamp: string;
    taskId?: string;
    moduleId?: string;
    mentions: string[];
    reactions: { emoji: string; users: string[] }[];
}

export interface Notification {
    id: string;
    type: "mention" | "assignment" | "comment" | "status_change";
    message: string;
    timestamp: string;
    read: boolean;
    link?: string;
}

export class TeamPanel {
    public static currentPanel: TeamPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private members: TeamMember[] = [];
    private comments: Comment[] = [];
    private notifications: Notification[] = [];
    private activeTab: "team" | "comments" | "activity" = "team";

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.loadMockData();
        this.setupMessageHandler();
        this.update();
    }

    public static createOrShow(): TeamPanel {
        if (TeamPanel.currentPanel) {
            TeamPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return TeamPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "team",
            "👥 Team",
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        TeamPanel.currentPanel = new TeamPanel(panel);
        return TeamPanel.currentPanel;
    }

    private loadMockData(): void {
        this.members = [
            {
                id: "user-1",
                name: "Jan Kowalski",
                email: "jan@example.com",
                avatar: "JK",
                role: "owner",
                status: "online",
                lastActive: new Date().toISOString(),
                tasks: ["task-1", "task-2"]
            },
            {
                id: "user-2",
                name: "Anna Nowak",
                email: "anna@example.com",
                avatar: "AN",
                role: "admin",
                status: "online",
                lastActive: new Date(Date.now() - 300000).toISOString(),
                tasks: ["task-3", "task-4"]
            },
            {
                id: "user-3",
                name: "Piotr Wiśniewski",
                email: "piotr@example.com",
                avatar: "PW",
                role: "developer",
                status: "away",
                lastActive: new Date(Date.now() - 3600000).toISOString(),
                tasks: ["task-5"]
            },
            {
                id: "user-4",
                name: "Maria Zielińska",
                email: "maria@example.com",
                avatar: "MZ",
                role: "developer",
                status: "offline",
                lastActive: new Date(Date.now() - 86400000).toISOString(),
                tasks: ["task-6", "task-7"]
            }
        ];

        this.comments = [
            {
                id: "comment-1",
                authorId: "user-2",
                authorName: "Anna Nowak",
                content: "Cześć! Czy ktoś może przejrzeć mój PR?",
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                mentions: ["user-1"],
                reactions: [{ emoji: "👍", users: ["user-1"] }]
            },
            {
                id: "comment-2",
                authorId: "user-1",
                authorName: "Jan Kowalski",
                content: "API wygląda dobrze! Jedyna sugestia to dodanie więcej testów edge cases.",
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                moduleId: "auth-module",
                mentions: [],
                reactions: []
            },
            {
                id: "comment-3",
                authorId: "user-3",
                authorName: "Piotr Wiśniewski",
                content: "Zaczynam pracę nad modułem płatności. Będę potrzebował dostępu do Stripe API.",
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                mentions: ["user-1", "user-2"],
                reactions: [{ emoji: "🎉", users: ["user-1", "user-2"] }]
            }
        ];

        this.notifications = [
            {
                id: "notif-1",
                type: "mention",
                message: "Anna Nowak wspomniała o Tobie w komentarzu",
                timestamp: new Date(Date.now() - 1800000).toISOString(),
                read: false,
                link: "comment-1"
            },
            {
                id: "notif-2",
                type: "comment",
                message: "Nowy komentarz w module Auth",
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                read: false,
                link: "comment-2"
            },
            {
                id: "notif-3",
                type: "status_change",
                message: "Zadanie 'Test API' zostało ukończone",
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                read: true
            }
        ];
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "setTab":
                    this.activeTab = msg.tab;
                    this.update();
                    break;
                case "addComment":
                    this.addComment(msg.content, msg.taskId, msg.moduleId);
                    break;
                case "addReaction":
                    this.addReaction(msg.commentId, msg.emoji);
                    break;
                case "markNotificationRead":
                    this.markNotificationRead(msg.notifId);
                    break;
                case "inviteMember":
                    await this.inviteMember(msg.email, msg.role);
                    break;
                case "assignTask":
                    await this.assignTask(msg.memberId, msg.taskId);
                    break;
            }
        });
    }

    private addComment(content: string, taskId?: string, moduleId?: string): void {
        const newComment: Comment = {
            id: `comment-${Date.now()}`,
            authorId: "user-1",
            authorName: "Jan Kowalski",
            content,
            timestamp: new Date().toISOString(),
            taskId,
            moduleId,
            mentions: this.extractMentions(content),
            reactions: []
        };
        this.comments.unshift(newComment);
        this.update();
    }

    private extractMentions(content: string): string[] {
        const mentions = content.match(/@(\w+)/g) || [];
        return mentions.map(m => m.slice(1));
    }

    private addReaction(commentId: string, emoji: string): void {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment) {
            const existing = comment.reactions.find(r => r.emoji === emoji);
            if (existing) {
                if (!existing.users.includes("user-1")) {
                    existing.users.push("user-1");
                }
            } else {
                comment.reactions.push({ emoji, users: ["user-1"] });
            }
            this.update();
        }
    }

    private markNotificationRead(notifId: string): void {
        const notif = this.notifications.find(n => n.id === notifId);
        if (notif) {
            notif.read = true;
            this.update();
        }
    }

    private async inviteMember(email: string, role: string): Promise<void> {
        const newMember: TeamMember = {
            id: `user-${Date.now()}`,
            name: email.split("@")[0],
            email,
            avatar: email.substring(0, 2).toUpperCase(),
            role: role as any,
            status: "offline",
            lastActive: "",
            tasks: []
        };
        this.members.push(newMember);
        this.update();
        vscode.window.showInformationMessage(`Invitation sent to ${email}`);
    }

    private async assignTask(memberId: string, taskId: string): Promise<void> {
        const member = this.members.find(m => m.id === memberId);
        if (member && !member.tasks.includes(taskId)) {
            member.tasks.push(taskId);
            this.update();
        }
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const onlineCount = this.members.filter(m => m.status === "online").length;
        const unreadCount = this.notifications.filter(n => !n.read).length;

        const roleColors: Record<string, string> = {
            owner: "#e74c3c",
            admin: "#9b59b6",
            developer: "#3498db",
            viewer: "#95a5a6"
        };

        const statusColors: Record<string, string> = {
            online: "#27ae60",
            away: "#f39c12",
            offline: "#95a5a6"
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
        .header-stats {
            display: flex;
            gap: 20px;
        }
        .stat-badge {
            background: #16213e;
            padding: 8px 16px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .stat-badge .dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #27ae60;
        }
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        .tab {
            padding: 12px 24px;
            border-radius: 8px;
            background: #16213e;
            border: none;
            color: #fff;
            cursor: pointer;
            position: relative;
        }
        .tab.active {
            background: #00d4ff;
            color: #1a1a2e;
        }
        .tab .badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #e74c3c;
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 0.75em;
        }
        .content {
            display: grid;
            grid-template-columns: 1fr 350px;
            gap: 20px;
        }
        .main-content {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
        }
        .members-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
        }
        .member-card {
            background: rgba(0,0,0,0.2);
            padding: 20px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .member-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: #00d4ff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1.2em;
        }
        .member-info {
            flex: 1;
        }
        .member-name {
            font-weight: bold;
            margin-bottom: 4px;
        }
        .member-role {
            font-size: 0.85em;
            color: ${roleColors[this.members[0]?.role] || "#888"};
        }
        .member-status {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.85em;
            color: #888;
        }
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }
        .status-dot.online { background: #27ae60; }
        .status-dot.away { background: #f39c12; }
        .status-dot.offline { background: #95a5a6; }
        .comment-list {
            max-height: 500px;
            overflow-y: auto;
        }
        .comment-item {
            background: rgba(0,0,0,0.2);
            padding: 15px;
            border-radius: 12px;
            margin-bottom: 15px;
        }
        .comment-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        .comment-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: #00d4ff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.9em;
        }
        .comment-meta {
            flex: 1;
        }
        .comment-author {
            font-weight: bold;
        }
        .comment-time {
            font-size: 0.8em;
            color: #888;
        }
        .comment-content {
            line-height: 1.6;
            margin-bottom: 10px;
        }
        .comment-actions {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .reaction {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 15px;
            cursor: pointer;
            font-size: 0.85em;
        }
        .reaction:hover {
            background: rgba(255,255,255,0.2);
        }
        .new-comment {
            margin-bottom: 20px;
        }
        .new-comment textarea {
            width: 100%;
            min-height: 80px;
            padding: 15px;
            border-radius: 12px;
            border: 1px solid #333;
            background: #1a1a2e;
            color: #fff;
            font-size: 1em;
            resize: vertical;
            margin-bottom: 10px;
        }
        .new-comment textarea:focus {
            outline: none;
            border-color: #00d4ff;
        }
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
        .notifications-list {
            max-height: 400px;
            overflow-y: auto;
        }
        .notification-item {
            padding: 15px;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.2s;
            border-left: 3px solid transparent;
        }
        .notification-item:hover {
            background: rgba(0,212,255,0.1);
        }
        .notification-item.unread {
            border-left-color: #00d4ff;
            background: rgba(0,212,255,0.1);
        }
        .notif-type {
            font-size: 0.85em;
            color: #888;
        }
        .notif-message {
            margin: 5px 0;
        }
        .notif-time {
            font-size: 0.8em;
            color: #888;
        }
        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 20px;
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
        .invite-form {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .invite-form input, .invite-form select {
            padding: 10px;
            border-radius: 8px;
            border: 1px solid #333;
            background: #1a1a2e;
            color: #fff;
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #888;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>👥 Team</h1>
        <div class="header-stats">
            <div class="stat-badge">
                <span class="dot"></span>
                ${onlineCount} online
            </div>
            <div class="stat-badge">
                🔔 ${unreadCount} unread
            </div>
        </div>
    </div>

    <div class="tabs">
        <button class="tab ${this.activeTab === 'team' ? 'active' : ''}" onclick="setTab('team')">
            Team
        </button>
        <button class="tab ${this.activeTab === 'comments' ? 'active' : ''}" onclick="setTab('comments')">
            Comments
        </button>
        <button class="tab ${this.activeTab === 'activity' ? 'active' : ''}" onclick="setTab('activity')">
            Activity
        </button>
    </div>

    <div class="content">
        ${this.activeTab === 'team' ? `
        <div class="main-content">
            <h3 style="margin-bottom: 20px; color: #00d4ff;">Team Members (${this.members.length})</h3>
            <div class="members-grid">
                ${this.members.map(m => `
                <div class="member-card">
                    <div class="member-avatar">${m.avatar}</div>
                    <div class="member-info">
                        <div class="member-name">${m.name}</div>
                        <div class="member-role" style="color: ${roleColors[m.role]};">${m.role}</div>
                        <div class="member-status">
                            <span class="status-dot ${m.status}"></span>
                            ${m.status} • ${m.tasks.length} tasks
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${this.activeTab === 'comments' ? `
        <div class="main-content">
            <div class="new-comment">
                <textarea id="newComment" placeholder="Write a comment... Use @name to mention someone"></textarea>
                <button class="btn btn-primary" onclick="addComment()">Post Comment</button>
            </div>
            <div class="comment-list">
                ${this.comments.map(c => `
                <div class="comment-item">
                    <div class="comment-header">
                        <div class="comment-avatar">${c.authorName.split(' ').map(n => n[0]).join('')}</div>
                        <div class="comment-meta">
                            <div class="comment-author">${c.authorName}</div>
                            <div class="comment-time">${this.formatTime(c.timestamp)}</div>
                        </div>
                    </div>
                    <div class="comment-content">${c.content}</div>
                    <div class="comment-actions">
                        ${c.reactions.map(r => `
                        <span class="reaction">
                            ${r.emoji} ${r.users.length}
                        </span>
                        `).join('')}
                        <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.85em;" onclick="addReaction('${c.id}', '👍')">
                            👍 React
                        </button>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        ${this.activeTab === 'activity' ? `
        <div class="main-content">
            <div class="empty-state">
                <p>📋 Activity feed will appear here</p>
                <p style="margin-top: 10px; font-size: 0.9em;">
                    Recent changes, commits, and team actions
                </p>
            </div>
        </div>
        ` : ''}

        <div class="sidebar">
            <div class="panel">
                <h3>🔔 Notifications</h3>
                <div class="notifications-list">
                    ${this.notifications.map(n => `
                    <div class="notification-item ${n.read ? '' : 'unread'}" onclick="markRead('${n.id}')">
                        <div class="notif-type">${n.type}</div>
                        <div class="notif-message">${n.message}</div>
                        <div class="notif-time">${this.formatTime(n.timestamp)}</div>
                    </div>
                    `).join('')}
                </div>
            </div>

            <div class="panel">
                <h3>📧 Invite Member</h3>
                <div class="invite-form">
                    <input type="email" id="inviteEmail" placeholder="email@example.com">
                    <select id="inviteRole">
                        <option value="developer">Developer</option>
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button class="btn btn-primary" onclick="inviteMember()">Send Invite</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function setTab(tab) {
            vscode.postMessage({ command: 'setTab', tab });
        }

        function addComment() {
            const content = document.getElementById('newComment').value;
            if (content.trim()) {
                vscode.postMessage({ command: 'addComment', content });
                document.getElementById('newComment').value = '';
            }
        }

        function addReaction(commentId, emoji) {
            vscode.postMessage({ command: 'addReaction', commentId, emoji });
        }

        function markRead(notifId) {
            vscode.postMessage({ command: 'markNotificationRead', notifId });
        }

        function inviteMember() {
            const email = document.getElementById('inviteEmail').value;
            const role = document.getElementById('inviteRole').value;
            if (email) {
                vscode.postMessage({ command: 'inviteMember', email, role });
                document.getElementById('inviteEmail').value = '';
            }
        }
    </script>
</body>
</html>`;
    }

    private formatTime(timestamp: string): string {
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    public dispose(): void {
        TeamPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
