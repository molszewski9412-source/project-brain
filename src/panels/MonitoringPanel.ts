/**
 * MonitoringPanel - FAZA 19
 * Monitoring po wdrożeniu: logi, crashe, performance
 */

import * as vscode from "vscode";
import { BrainStore } from "../storage/BrainStore";

export interface LogEntry {
    id: string;
    timestamp: string;
    level: "info" | "warn" | "error" | "debug";
    message: string;
    source: string;
    metadata?: Record<string, any>;
}

export interface Metric {
    name: string;
    value: number;
    unit: string;
    trend: "up" | "down" | "stable";
    history: number[];
}

export interface Alert {
    id: string;
    type: "error" | "warning" | "info";
    message: string;
    timestamp: string;
    acknowledged: boolean;
}

export class MonitoringPanel {
    public static currentPanel: MonitoringPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private logs: LogEntry[] = [];
    private metrics: Metric[] = [];
    private alerts: Alert[] = [];
    private refreshInterval: NodeJS.Timeout | null = null;

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.loadMockData();
        this.setupMessageHandler();
        this.startAutoRefresh();
        this.update();
    }

    public static createOrShow(): MonitoringPanel {
        if (MonitoringPanel.currentPanel) {
            MonitoringPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return MonitoringPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "monitoring",
            "📈 Monitoring",
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        MonitoringPanel.currentPanel = new MonitoringPanel(panel);
        return MonitoringPanel.currentPanel;
    }

    private loadMockData(): void {
        // Mock logs
        this.logs = [
            { id: "1", timestamp: new Date(Date.now() - 60000).toISOString(), level: "info", message: "Server started on port 3000", source: "server" },
            { id: "2", timestamp: new Date(Date.now() - 45000).toISOString(), level: "info", message: "Database connection established", source: "database" },
            { id: "3", timestamp: new Date(Date.now() - 30000).toISOString(), level: "warn", message: "High memory usage detected: 85%", source: "system" },
            { id: "4", timestamp: new Date(Date.now() - 20000).toISOString(), level: "error", message: "Failed login attempt from IP 192.168.1.100", source: "auth" },
            { id: "5", timestamp: new Date(Date.now() - 15000).toISOString(), level: "info", message: "User registration successful", source: "auth" },
            { id: "6", timestamp: new Date(Date.now() - 10000).toISOString(), level: "debug", message: "Cache hit for user:123", source: "cache" },
            { id: "7", timestamp: new Date(Date.now() - 5000).toISOString(), level: "info", message: "API request completed: GET /api/users", source: "api" }
        ];

        // Mock metrics
        this.metrics = [
            { name: "CPU", value: 45, unit: "%", trend: "stable", history: [42, 45, 43, 47, 45, 44, 45] },
            { name: "Memory", value: 78, unit: "%", trend: "up", history: [65, 70, 72, 75, 76, 77, 78] },
            { name: "Response Time", value: 125, unit: "ms", trend: "down", history: [180, 160, 150, 140, 135, 130, 125] },
            { name: "Requests/sec", value: 234, unit: "req", trend: "stable", history: [220, 240, 230, 235, 228, 232, 234] },
            { name: "Error Rate", value: 0.5, unit: "%", trend: "down", history: [2.1, 1.5, 1.2, 0.9, 0.7, 0.6, 0.5] },
            { name: "Uptime", value: 99.9, unit: "%", trend: "stable", history: [99.8, 99.9, 99.9, 99.9, 99.9, 99.9, 99.9] }
        ];

        // Mock alerts
        this.alerts = [
            { id: "1", type: "warning", message: "Memory usage above 75%", timestamp: new Date(Date.now() - 30000).toISOString(), acknowledged: false },
            { id: "2", type: "error", message: "Multiple failed login attempts", timestamp: new Date(Date.now() - 20000).toISOString(), acknowledged: false },
            { id: "3", type: "info", message: "Deployment completed successfully", timestamp: new Date(Date.now() - 60000).toISOString(), acknowledged: true }
        ];
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage((msg) => {
            switch (msg.command) {
                case "acknowledgeAlert":
                    this.acknowledgeAlert(msg.alertId);
                    break;
                case "refresh":
                    this.refresh();
                    break;
                case "filterLogs":
                    this.filterLogs(msg.level);
                    break;
                case "toggleAutoRefresh":
                    this.toggleAutoRefresh();
                    break;
            }
        });
    }

    private startAutoRefresh(): void {
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, 10000); // Refresh every 10 seconds
    }

    private toggleAutoRefresh(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        } else {
            this.startAutoRefresh();
        }
    }

    private acknowledgeAlert(alertId: string): void {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
            this.update();
        }
    }

    private refresh(): void {
        // Simulate new data
        this.loadMockData();
        this.update();
    }

    private filterLogs(level: string): void {
        this.update();
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const levelColors: Record<string, string> = {
            info: "#3498db",
            warn: "#f39c12",
            error: "#e74c3c",
            debug: "#95a5a6"
        };

        const trendIcons: Record<string, string> = {
            up: "📈",
            down: "📉",
            stable: "➡️"
        };

        const alertColors: Record<string, string> = {
            error: "#e74c3c",
            warning: "#f39c12",
            info: "#3498db"
        };

        const unacknowledgedAlerts = this.alerts.filter(a => !a.acknowledged);

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
        .header-actions {
            display: flex;
            gap: 10px;
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
        .btn-secondary {
            background: #333;
            color: #fff;
        }
        .btn:hover {
            transform: scale(1.05);
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9em;
        }
        .status-badge.healthy {
            background: rgba(39,174,96,0.2);
            color: #27ae60;
        }
        .status-badge.warning {
            background: rgba(243,156,18,0.2);
            color: #f39c12;
        }
        .status-badge.error {
            background: rgba(231,76,60,0.2);
            color: #e74c3c;
        }
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: currentColor;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-bottom: 25px;
        }
        .metric-card {
            background: #16213e;
            padding: 20px;
            border-radius: 12px;
            position: relative;
        }
        .metric-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .metric-name {
            font-size: 0.9em;
            color: #888;
        }
        .metric-trend {
            font-size: 1.2em;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #00d4ff;
        }
        .metric-unit {
            font-size: 0.8em;
            color: #888;
            margin-left: 5px;
        }
        .metric-chart {
            display: flex;
            align-items: flex-end;
            height: 40px;
            gap: 3px;
            margin-top: 15px;
        }
        .chart-bar {
            flex: 1;
            background: rgba(0,212,255,0.3);
            border-radius: 2px;
            min-width: 8px;
        }
        .main-container {
            display: grid;
            grid-template-columns: 1fr 350px;
            gap: 20px;
        }
        .panel {
            background: #16213e;
            border-radius: 12px;
            padding: 20px;
        }
        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .panel h3 {
            color: #00d4ff;
        }
        .tabs {
            display: flex;
            gap: 8px;
        }
        .tab {
            padding: 6px 12px;
            border-radius: 6px;
            background: #333;
            border: none;
            color: #fff;
            cursor: pointer;
            font-size: 0.85em;
        }
        .tab.active {
            background: #00d4ff;
            color: #1a1a2e;
        }
        .log-list {
            max-height: 400px;
            overflow-y: auto;
        }
        .log-item {
            display: flex;
            align-items: flex-start;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 8px;
            background: rgba(0,0,0,0.2);
        }
        .log-level {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 12px;
            margin-top: 6px;
            flex-shrink: 0;
        }
        .log-level.info { background: #3498db; }
        .log-level.warn { background: #f39c12; }
        .log-level.error { background: #e74c3c; }
        .log-level.debug { background: #95a5a6; }
        .log-content {
            flex: 1;
        }
        .log-message {
            margin-bottom: 4px;
        }
        .log-meta {
            font-size: 0.8em;
            color: #888;
        }
        .alert-list {
            max-height: 300px;
            overflow-y: auto;
        }
        .alert-item {
            display: flex;
            align-items: flex-start;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            background: rgba(0,0,0,0.2);
            border-left: 4px solid;
        }
        .alert-item.error { border-color: #e74c3c; }
        .alert-item.warning { border-color: #f39c12; }
        .alert-item.info { border-color: #3498db; }
        .alert-item.acknowledged {
            opacity: 0.5;
        }
        .alert-content {
            flex: 1;
        }
        .alert-message {
            margin-bottom: 5px;
        }
        .alert-time {
            font-size: 0.8em;
            color: #888;
        }
        .alert-ack {
            padding: 5px 10px;
            border-radius: 4px;
            background: #333;
            color: #fff;
            border: none;
            cursor: pointer;
            font-size: 0.8em;
        }
        .alert-ack:hover {
            background: #00d4ff;
            color: #1a1a2e;
        }
        .chart-container {
            margin-top: 20px;
        }
        .sparkline {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .sparkline-value {
            font-weight: bold;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>📈 Monitoring</h1>
            <div class="status-badge ${unacknowledgedAlerts.filter(a => a.type === 'error').length > 0 ? 'error' : unacknowledgedAlerts.length > 0 ? 'warning' : 'healthy'}">
                <div class="status-dot"></div>
                ${unacknowledgedAlerts.filter(a => a.type === 'error').length > 0 ? 'Critical Issues' : unacknowledgedAlerts.length > 0 ? 'Warnings' : 'All Systems Operational'}
            </div>
        </div>
        <div class="header-actions">
            <button class="btn btn-secondary" onclick="refresh()">🔄 Refresh</button>
        </div>
    </div>

    <div class="metrics-grid">
        ${this.metrics.map(m => `
        <div class="metric-card">
            <div class="metric-header">
                <span class="metric-name">${m.name}</span>
                <span class="metric-trend">${trendIcons[m.trend]}</span>
            </div>
            <div>
                <span class="metric-value">${m.value}</span>
                <span class="metric-unit">${m.unit}</span>
            </div>
            <div class="metric-chart">
                ${m.history.map(v => {
                    const max = Math.max(...m.history);
                    const height = (v / max) * 100;
                    return `<div class="chart-bar" style="height: ${height}%"></div>`;
                }).join('')}
            </div>
        </div>
        `).join('')}
    </div>

    <div class="main-container">
        <div class="panel">
            <div class="panel-header">
                <h3>📋 Live Logs</h3>
                <div class="tabs">
                    <button class="tab active" onclick="filterLogs('all')">All</button>
                    <button class="tab" onclick="filterLogs('error')">Errors</button>
                    <button class="tab" onclick="filterLogs('warn')">Warnings</button>
                </div>
            </div>
            <div class="log-list">
                ${this.logs.map(log => `
                <div class="log-item">
                    <div class="log-level ${log.level}"></div>
                    <div class="log-content">
                        <div class="log-message">${log.message}</div>
                        <div class="log-meta">
                            ${log.source} • ${new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>

        <div>
            <div class="panel">
                <div class="panel-header">
                    <h3>🚨 Alerts</h3>
                    <span style="color: #e74c3c; font-weight: bold;">
                        ${unacknowledgedAlerts.length} new
                    </span>
                </div>
                <div class="alert-list">
                    ${this.alerts.length === 0 ? `
                    <div style="text-align: center; padding: 30px; color: #888;">
                        No alerts
                    </div>
                    ` : this.alerts.map(alert => `
                    <div class="alert-item ${alert.type} ${alert.acknowledged ? 'acknowledged' : ''}">
                        <div class="alert-content">
                            <div class="alert-message">${alert.message}</div>
                            <div class="alert-time">${new Date(alert.timestamp).toLocaleString()}</div>
                        </div>
                        ${!alert.acknowledged ? `
                        <button class="alert-ack" onclick="acknowledgeAlert('${alert.id}')">ACK</button>
                        ` : ''}
                    </div>
                    `).join('')}
                </div>
            </div>

            <div class="panel" style="margin-top: 20px;">
                <h3>🔗 Quick Links</h3>
                <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
                    <a href="#" style="color: #00d4ff; text-decoration: none; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                        📊 Full Dashboard
                    </a>
                    <a href="#" style="color: #00d4ff; text-decoration: none; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                        📝 View All Logs
                    </a>
                    <a href="#" style="color: #00d4ff; text-decoration: none; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                        ⚙️ Configure Alerts
                    </a>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }

        function acknowledgeAlert(alertId) {
            vscode.postMessage({ command: 'acknowledgeAlert', alertId });
        }

        function filterLogs(level) {
            vscode.postMessage({ command: 'filterLogs', level });
        }

        function toggleAutoRefresh() {
            vscode.postMessage({ command: 'toggleAutoRefresh' });
        }
    </script>
</body>
</html>`;
    }

    public dispose(): void {
        MonitoringPanel.currentPanel = undefined;
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.panel.dispose();
    }
}
