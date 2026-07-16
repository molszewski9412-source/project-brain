/**
 * AIChatPanel - FAZA 13
 * Smart Chat z kontekstem projektu
 */

import * as vscode from "vscode";
import { OllamaClient } from "../ai/OllamaClient";
import { BrainStore } from "../storage/BrainStore";

export interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
    context?: string;
}

export class AIChatPanel {
    public static currentPanel: AIChatPanel | undefined;
    private panel: vscode.WebviewPanel;
    private ollama: OllamaClient;
    private store: BrainStore;
    private messages: ChatMessage[] = [];
    private isLoading: boolean = false;

    constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.ollama = new OllamaClient();
        this.store = new BrainStore();
        this.setupMessageHandler();
        this.addSystemContext();
        this.update();
    }

    public static createOrShow(): AIChatPanel {
        if (AIChatPanel.currentPanel) {
            AIChatPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return AIChatPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "aiChat",
            "💬 AI Chat",
            vscode.ViewColumn.One,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        AIChatPanel.currentPanel = new AIChatPanel(panel);
        return AIChatPanel.currentPanel;
    }

    private addSystemContext(): void {
        const modules = this.store.getModules();
        const projectSummary = this.store.getProjectSummary();
        
        const context = `Project Context:
- Project: ${projectSummary || 'Unknown'}
- Modules: ${modules.map(m => m.name).join(', ') || 'None'}
- Tech Stack: ${this.store.getBrain()?.technologyStack?.join(', ') || 'Not set'}

You are Project Brain AI Assistant. You understand the project architecture, files, and history.`;

        this.messages.push({
            id: this.generateId(),
            role: "system",
            content: context,
            timestamp: new Date()
        });
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "sendMessage":
                    await this.handleUserMessage(msg.text);
                    break;
                case "clearChat":
                    this.clearChat();
                    break;
                case "getContext":
                    this.addFileContext(msg.filePath);
                    break;
                case "toggleContext":
                    this.showContextPanel();
                    break;
            }
        });
    }

    private async handleUserMessage(text: string): Promise<void> {
        if (!text.trim() || this.isLoading) return;

        // Add user message
        this.messages.push({
            id: this.generateId(),
            role: "user",
            content: text,
            timestamp: new Date()
        });
        this.update();

        this.isLoading = true;
        this.addLoadingMessage();

        try {
            // Build context-aware prompt
            const prompt = this.buildPrompt(text);
            const result = await this.ollama.ask(prompt);

            // Remove loading message
            this.messages = this.messages.filter(m => m.id !== "loading");

            if (result.success) {
                this.messages.push({
                    id: this.generateId(),
                    role: "assistant",
                    content: result.content,
                    timestamp: new Date(),
                    context: "Generated based on project context"
                });
            } else {
                this.messages.push({
                    id: this.generateId(),
                    role: "assistant",
                    content: "Sorry, I couldn't process your request. Make sure Ollama is running.",
                    timestamp: new Date()
                });
            }
        } catch (error) {
            this.messages = this.messages.filter(m => m.id !== "loading");
            this.messages.push({
                id: this.generateId(),
                role: "assistant",
                content: "Error: " + String(error),
                timestamp: new Date()
            });
        }

        this.isLoading = false;
        this.update();
    }

    private addLoadingMessage(): void {
        this.messages.push({
            id: "loading",
            role: "assistant",
            content: "Thinking...",
            timestamp: new Date()
        });
        this.update();
    }

    private buildPrompt(userMessage: string): string {
        let prompt = `Project Brain AI Assistant.\n\n`;

        // Add project context
        const modules = this.store.getModules();
        const projectSummary = this.store.getProjectSummary();
        
        prompt += `PROJECT INFO:\n`;
        prompt += `- Name: ${projectSummary || 'Unknown'}\n`;
        prompt += `- Modules (${modules.length}): ${modules.map(m => m.name).join(', ') || 'None'}\n`;
        prompt += `- Tech Stack: ${this.store.getBrain()?.technologyStack?.join(', ') || 'Not set'}\n\n`;

        // Add recent history
        const history = this.store.getHistory().slice(-5);
        if (history.length > 0) {
            prompt += `RECENT ACTIVITY:\n`;
            history.forEach(h => {
                prompt += `- ${h.action}: ${h.description}\n`;
            });
            prompt += `\n`;
        }

        // Add AI context from memory
        const aiContext = this.store.getBrain()?.aiContext;
        if (aiContext) {
            prompt += `AI MEMORY:\n`;
            if (aiContext.patterns?.length) {
                prompt += `- Patterns: ${aiContext.patterns.map(p => p.name).join(', ')}\n`;
            }
            if (aiContext.constraints?.length) {
                prompt += `- Constraints: ${aiContext.constraints.map(c => c.description).join(', ')}\n`;
            }
            prompt += `\n`;
        }

        // Add current file context if available
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const fileName = editor.document.fileName;
            const selectedText = editor.selection?.isEmpty ? "" : editor.document.getText(editor.selection);
            
            prompt += `CURRENT FILE:\n`;
            prompt += `- ${fileName}\n`;
            if (selectedText) {
                prompt += `- Selected: ${selectedText.substring(0, 200)}...\n`;
            }
            prompt += `\n`;
        }

        // Add conversation history
        prompt += `CONVERSATION:\n`;
        this.messages.filter(m => m.role !== "system").slice(-6).forEach(m => {
            prompt += `${m.role === "user" ? "User" : "Assistant"}: ${m.content}\n`;
        });

        prompt += `\nUser: ${userMessage}\n\nAssistant:`;

        return prompt;
    }

    private clearChat(): void {
        this.messages = [];
        this.addSystemContext();
        this.update();
    }

    private addFileContext(filePath: string): void {
        vscode.workspace.openTextDocument(filePath).then(doc => {
            const content = doc.getText().substring(0, 2000);
            this.messages.push({
                id: this.generateId(),
                role: "system",
                content: `File context: ${filePath}\n\n${content}...`,
                timestamp: new Date()
            });
            this.update();
        });
    }

    private showContextPanel(): void {
        // Toggle context panel visibility
        this.update();
    }

    private generateId(): string {
        return Math.random().toString(36).substring(2, 11);
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    private buildHtml(): string {
        const formatTime = (date: Date) => {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            padding: 15px 20px;
            background: #16213e;
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .header h1 {
            color: #00d4ff;
            font-size: 1.2em;
        }
        .header-actions {
            display: flex;
            gap: 10px;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.85em;
        }
        .btn-secondary {
            background: #333;
            color: #fff;
        }
        .btn-primary {
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            color: #1a1a2e;
        }
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        .message {
            max-width: 85%;
            padding: 15px;
            border-radius: 15px;
            line-height: 1.5;
        }
        .message.user {
            align-self: flex-end;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-bottom-right-radius: 5px;
        }
        .message.assistant {
            align-self: flex-start;
            background: #16213e;
            border-bottom-left-radius: 5px;
        }
        .message.system {
            align-self: center;
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
            font-size: 0.85em;
            color: #888;
            max-width: 100%;
        }
        .message-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .message-role {
            font-weight: bold;
            font-size: 0.85em;
        }
        .message.user .message-role { color: #a8d8ff; }
        .message.assistant .message-role { color: #00d4ff; }
        .message-time {
            font-size: 0.75em;
            color: #888;
        }
        .message-content {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        .message-content code {
            background: rgba(0,0,0,0.3);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
        }
        .message-content pre {
            background: rgba(0,0,0,0.3);
            padding: 10px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 10px 0;
        }
        .typing-indicator {
            display: flex;
            gap: 5px;
            padding: 15px;
        }
        .typing-dot {
            width: 8px;
            height: 8px;
            background: #00d4ff;
            border-radius: 50%;
            animation: typing 1.4s infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-10px); }
        }
        .input-area {
            padding: 15px 20px;
            background: #16213e;
            border-top: 1px solid #333;
            display: flex;
            gap: 10px;
        }
        .input-area input {
            flex: 1;
            padding: 12px 20px;
            border-radius: 25px;
            border: 1px solid #333;
            background: #1a1a2e;
            color: #fff;
            font-size: 1em;
        }
        .input-area input:focus {
            outline: none;
            border-color: #00d4ff;
        }
        .input-area button {
            padding: 12px 25px;
            border-radius: 25px;
            border: none;
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            color: #1a1a2e;
            font-weight: bold;
            cursor: pointer;
        }
        .input-area button:hover {
            transform: scale(1.05);
        }
        .input-area button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .context-badge {
            display: inline-block;
            background: rgba(0,212,255,0.2);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75em;
            color: #00d4ff;
            margin-bottom: 5px;
        }
        .quick-actions {
            display: flex;
            gap: 10px;
            padding: 10px 20px;
            background: rgba(0,0,0,0.2);
            overflow-x: auto;
        }
        .quick-action {
            padding: 8px 15px;
            background: #333;
            border-radius: 20px;
            white-space: nowrap;
            cursor: pointer;
            font-size: 0.85em;
        }
        .quick-action:hover {
            background: #00d4ff;
            color: #1a1a2e;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>💬 AI Chat</h1>
        <div class="header-actions">
            <button class="btn btn-secondary" onclick="clearChat()">🗑️ Clear</button>
        </div>
    </div>

    <div class="quick-actions">
        <div class="quick-action" onclick="sendQuick('Explain the architecture')">🏗️ Architecture</div>
        <div class="quick-action" onclick="sendQuick('What modules exist?')">📦 Modules</div>
        <div class="quick-action" onclick="sendQuick('Suggest improvements')">💡 Improvements</div>
        <div class="quick-action" onclick="sendQuick('Review current file')">🔍 Review File</div>
        <div class="quick-action" onclick="sendQuick('Generate documentation')">📝 Docs</div>
    </div>

    <div class="chat-messages" id="messages">
        ${this.messages.map(msg => `
        <div class="message ${msg.role}">
            ${msg.context ? '<span class="context-badge">📎 Context</span>' : ''}
            <div class="message-header">
                <span class="message-role">${msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'AI' : 'System'}</span>
                <span class="message-time">${formatTime(msg.timestamp)}</span>
            </div>
            <div class="message-content">${this.escapeHtml(msg.content)}</div>
        </div>
        `).join('')}
        ${this.isLoading ? `
        <div class="message assistant">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
        ` : ''}
    </div>

    <div class="input-area">
        <input type="text" id="messageInput" placeholder="Ask about your project..." onkeypress="handleKeyPress(event)">
        <button onclick="sendMessage()" id="sendBtn">Send</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function sendMessage() {
            const input = document.getElementById('messageInput');
            const text = input.value.trim();
            if (!text) return;
            
            input.value = '';
            vscode.postMessage({ command: 'sendMessage', text });
        }

        function sendQuick(text) {
            vscode.postMessage({ command: 'sendMessage', text });
        }

        function handleKeyPress(event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        }

        function clearChat() {
            vscode.postMessage({ command: 'clearChat' });
        }

        // Scroll to bottom
        const messagesDiv = document.getElementById('messages');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // Focus input
        document.getElementById('messageInput').focus();
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
            .replace(/'/g, "&#039;")
            .replace(/\n/g, "<br>");
    }

    public dispose(): void {
        AIChatPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
