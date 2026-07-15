/**
 * InitializePanel - Simple project initialization wizard
 */
import * as vscode from "vscode";

export class InitializePanel {
    public static currentPanel: InitializePanel | undefined;
    private panel: vscode.WebviewPanel;

    private constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.panel.webview.html = this.getHtml();
        this.panel.webview.onDidReceiveMessage((msg) => {
            if (msg.command === "initialize") {
                vscode.commands.executeCommand("project-brain.initializeWizardSubmit", msg.data);
                this.panel.dispose();
            }
        });
    }

    public static createOrShow() {
        if (InitializePanel.currentPanel) {
            InitializePanel.currentPanel.panel.reveal();
            return;
        }
        const panel = vscode.window.createWebviewPanel(
            "projectBrainInitialize",
            "🧠 Welcome",
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        InitializePanel.currentPanel = new InitializePanel(panel);
    }

    private getHtml() {
        return `<!DOCTYPE html>
<html>
<head>
<style>
    body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
        padding: 30px; 
        background: #0f1419; 
        color: #e7e9ea; 
        text-align: center;
    }
    h1 { color: #00d4ff; margin-bottom: 10px; font-size: 2em; }
    p { color: #888; margin-bottom: 30px; font-size: 1.1em; }
    
    .options { max-width: 500px; margin: 0 auto; }
    
    .option {
        display: flex;
        align-items: center;
        padding: 25px;
        margin: 15px 0;
        background: #1a1a2e;
        border-radius: 12px;
        border: 2px solid #333;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
    }
    .option:hover { border-color: #00d4ff; background: #1a1a3e; }
    .option input { margin-right: 20px; transform: scale(1.3); }
    .option-title { font-weight: 600; font-size: 1.2em; margin-bottom: 5px; }
    .option-desc { color: #888; font-size: 0.95em; }
    
    .start-btn {
        width: 100%;
        padding: 20px;
        background: linear-gradient(135deg, #27ae60, #2ecc71);
        border: none;
        border-radius: 12px;
        color: white;
        font-size: 1.2em;
        font-weight: bold;
        cursor: pointer;
        margin-top: 30px;
    }
    .start-btn:hover { opacity: 0.9; transform: scale(1.02); }
</style>
</head>
<body>

<h1>🧠 Project Brain</h1>
<p>How would you like to start?</p>

<div class="options">
    <label class="option">
        <input type="radio" name="mode" value="scan" checked>
        <div>
            <div class="option-title">🔍 Analyze Existing Project</div>
            <div class="option-desc">Scan your codebase and get AI suggestions for modules</div>
        </div>
    </label>

    <label class="option">
        <input type="radio" name="mode" value="idea">
        <div>
            <div class="option-title">✨ Start From Idea</div>
            <div class="option-desc">Describe your vision and let AI plan the architecture</div>
        </div>
    </label>

    <button class="start-btn" id="start">🚀 Get Started</button>
</div>

<script>
    const vscode = acquireVsCodeApi();
    document.getElementById("start").addEventListener("click", () => {
        const mode = document.querySelector('input[name="mode"]:checked').value;
        vscode.postMessage({ command: "initialize", data: { mode } });
    });
</script>

</body>
</html>`;
    }
}
