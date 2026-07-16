/**
 * ProjectCreatorPanel - TASK 5.3
 * Interaktywny kreator projektu - AI tworzy strukturę projektu od zera
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { BrainStore } from "../storage/BrainStore";
import { OllamaClient } from "../ai/OllamaClient";
import { CanvasPanel } from "./CanvasPanel";

export class ProjectCreatorPanel {
    public static currentPanel: ProjectCreatorPanel | undefined;
    private panel: vscode.WebviewPanel;
    private store: BrainStore;
    private ollama: OllamaClient;
    private currentStep: number = 0;

    private constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.store = new BrainStore();
        this.ollama = new OllamaClient();
        this.update();
        this.setupMessageHandler();
    }

    public static createOrShow(): ProjectCreatorPanel {
        if (ProjectCreatorPanel.currentPanel) {
            ProjectCreatorPanel.currentPanel.panel.reveal(vscode.ViewColumn.One, true);
            return ProjectCreatorPanel.currentPanel;
        }

        const panel = vscode.window.createWebviewPanel(
            "projectCreator",
            "🎯 Project Creator",
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        ProjectCreatorPanel.currentPanel = new ProjectCreatorPanel(panel);
        return ProjectCreatorPanel.currentPanel;
    }

    public update(): void {
        this.panel.webview.html = this.buildHtml();
    }

    public setStep(step: number): void {
        this.currentStep = step;
        this.update();
    }

    private buildHtml(): string {
        switch (this.currentStep) {
            case 0:
                return this.buildWelcomeStep();
            case 1:
                return this.buildProjectTypeStep();
            case 2:
                return this.buildFeaturesStep();
            case 3:
                return this.buildTechStackStep();
            case 4:
                return this.buildReviewStep();
            default:
                return this.buildWelcomeStep();
        }
    }

    private buildWelcomeStep(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
        }
        .hero {
            text-align: center;
            max-width: 600px;
        }
        .hero h1 {
            font-size: 3em;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .hero p {
            font-size: 1.2em;
            color: #888;
            margin-bottom: 40px;
        }
        .cta-btn {
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            color: #1a1a2e;
            border: none;
            padding: 15px 40px;
            font-size: 1.1em;
            font-weight: bold;
            border-radius: 30px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .cta-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 30px rgba(0, 212, 255, 0.3);
        }
        .features {
            display: flex;
            gap: 30px;
            margin-top: 50px;
            flex-wrap: wrap;
            justify-content: center;
        }
        .feature {
            background: rgba(255,255,255,0.05);
            padding: 20px;
            border-radius: 15px;
            width: 150px;
            text-align: center;
        }
        .feature-icon { font-size: 2em; margin-bottom: 10px; }
        .feature h3 { font-size: 0.9em; margin-bottom: 5px; }
        .feature p { font-size: 0.75em; color: #666; }
    </style>
</head>
<body>
    <div class="hero">
        <h1>🎯 Project Creator</h1>
        <p>Opowiedz mi o swoim projekcie, a ja zaproponuję idealną strukturę i moduły.</p>
        <button class="cta-btn" onclick="nextStep()">🚀 Zaczynamy!</button>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">🏗️</div>
                <h3>Struktura</h3>
                <p>Automatyczna architektura</p>
            </div>
            <div class="feature">
                <div class="feature-icon">📦</div>
                <h3>Moduły</h3>
                <p>Propozycje modułów</p>
            </div>
            <div class="feature">
                <div class="feature-icon">💡</div>
                <h3>Inspiracja</h3>
                <p>Najlepsze praktyki</p>
            </div>
        </div>
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        function nextStep() {
            vscode.postMessage({ command: 'nextStep' });
        }
    </script>
</body>
</html>`;
    }

    private buildProjectTypeStep(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1a1a2e;
            color: #fff;
            padding: 40px;
        }
        h1 {
            font-size: 2em;
            margin-bottom: 10px;
            color: #00d4ff;
        }
        p { color: #888; margin-bottom: 30px; }
        .options {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
        }
        .option {
            background: #16213e;
            border: 2px solid #333;
            border-radius: 15px;
            padding: 25px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .option:hover {
            border-color: #00d4ff;
            transform: translateY(-5px);
        }
        .option.selected {
            border-color: #00d4ff;
            background: #0f3460;
        }
        .option-icon { font-size: 2.5em; margin-bottom: 15px; }
        .option h3 { margin-bottom: 5px; }
        .option p { font-size: 0.85em; color: #888; margin-bottom: 0; }
        .nav {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
        }
        .nav-btn {
            background: #333;
            color: #fff;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            cursor: pointer;
        }
        .nav-btn.primary {
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            color: #1a1a2e;
        }
    </style>
</head>
<body>
    <h1>🏗️ Jaki typ projektu tworzysz?</h1>
    <p>Wybierz typ aplikacji, który najlepiej opisuje Twój projekt.</p>
    
    <div class="options">
        <div class="option" onclick="select(this, 'web')">
            <div class="option-icon">🌐</div>
            <h3>Aplikacja Web</h3>
            <p>Strona internetowa, SaaS, dashboard</p>
        </div>
        <div class="option" onclick="select(this, 'mobile')">
            <div class="option-icon">📱</div>
            <h3>Mobile App</h3>
            <p>iOS, Android, React Native</p>
        </div>
        <div class="option" onclick="select(this, 'api')">
            <div class="option-icon">🔌</div>
            <h3>REST API</h3>
            <p>Backend, microservice</p>
        </div>
        <div class="option" onclick="select(this, 'ecommerce')">
            <div class="option-icon">🛒</div>
            <h3>E-commerce</h3>
            <p>Sklep internetowy</p>
        </div>
        <div class="option" onclick="select(this, 'blog')">
            <div class="option-icon">📝</div>
            <h3>Blog / CMS</h3>
            <p>Strona z treścią</p>
        </div>
        <div class="option" onclick="select(this, 'saas')">
            <div class="option-icon">☁️</div>
            <h3>SaaS Product</h3>
            <p>Produkt subskrypcyjny</p>
        </div>
        <div class="option" onclick="select(this, 'iot')">
            <div class="option-icon">📡</div>
            <h3>IoT / Hardware</h3>
            <p>Urządzenia, sensory</p>
        </div>
        <div class="option" onclick="select(this, 'game')">
            <div class="option-icon">🎮</div>
            <h3>Gra</h3>
            <p>Browser game, Unity</p>
        </div>
    </div>

    <div class="nav">
        <button class="nav-btn" onclick="prevStep()">← Wstecz</button>
        <button class="nav-btn primary" onclick="nextStep()">Dalej →</button>
    </div>

    <script>
        let selectedType = null;
        const vscode = acquireVsCodeApi();
        
        function select(el, type) {
            document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
            el.classList.add('selected');
            selectedType = type;
        }
        
        function nextStep() {
            vscode.postMessage({ command: 'setProjectType', type: selectedType });
            vscode.postMessage({ command: 'nextStep' });
        }
        
        function prevStep() {
            vscode.postMessage({ command: 'prevStep' });
        }
    </script>
</body>
</html>`;
    }

    private buildFeaturesStep(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1a1a2e;
            color: #fff;
            padding: 40px;
        }
        h1 {
            font-size: 2em;
            margin-bottom: 10px;
            color: #00d4ff;
        }
        p { color: #888; margin-bottom: 30px; }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .feature {
            background: #16213e;
            border: 2px solid #333;
            border-radius: 10px;
            padding: 15px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
        }
        .feature:hover { border-color: #00d4ff; }
        .feature.selected {
            border-color: #00d4ff;
            background: #0f3460;
        }
        .feature-icon { font-size: 1.5em; margin-bottom: 5px; }
        .feature h4 { font-size: 0.85em; }
        .custom {
            margin-top: 20px;
        }
        .custom label {
            display: block;
            color: #888;
            margin-bottom: 10px;
        }
        .custom textarea {
            width: 100%;
            min-height: 100px;
            padding: 15px;
            border-radius: 10px;
            border: 1px solid #333;
            background: #16213e;
            color: #fff;
            font-size: 1em;
        }
        .nav {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
        }
        .nav-btn {
            background: #333;
            color: #fff;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            cursor: pointer;
        }
        .nav-btn.primary {
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            color: #1a1a2e;
        }
    </style>
</head>
<body>
    <h1>✨ Jakie funkcje są potrzebne?</h1>
    <p>Zaznacz co powinno być w projekcie (lub wpisz własne)</p>
    
    <div class="features">
        <div class="feature" onclick="toggle(this, 'auth')">
            <div class="feature-icon">🔐</div>
            <h4>Autentykacja</h4>
        </div>
        <div class="feature" onclick="toggle(this, 'users')">
            <div class="feature-icon">👥</div>
            <h4>Zarządzanie userami</h4>
        </div>
        <div class="feature" onclick="toggle(this, 'payments')">
            <div class="feature-icon">💳</div>
            <h4>Płatności</h4>
        </div>
        <div class="feature" onclick="toggle(this, 'dashboard')">
            <div class="feature-icon">📊</div>
            <h4>Dashboard</h4>
        </div>
        <div class="feature" onclick="toggle(this, 'notifications')">
            <div class="feature-icon">🔔</div>
            <h4>Powiadomienia</h4>
        </div>
        <div class="feature" onclick="toggle(this, 'comments')">
            <div class="feature-icon">💬</div>
            <h4>Komentarze</h4>
        </div>
        <div class="feature" onclick="toggle(this, 'search')">
            <div class="feature-icon">🔍</div>
            <h4>Wyszukiwanie</h4>
        </div>
        <div class="feature" onclick="toggle(this, 'analytics')">
            <div class="feature-icon">📈</div>
            <h4>Analytics</h4>
        </div>
        <div class="feature" onclick="toggle(this, 'export')">
            <div class="feature-icon">📤</div>
            <h4>Eksport danych</h4>
        </div>
        <div class="feature" onclick="toggle(this, 'media')">
            <div class="feature-icon">🖼️</div>
            <h4>Obrazy/Media</h4>
        </div>
        <div class="feature" onclick="toggle(this, 'api')">
            <div class="feature-icon">🌐</div>
            <h4>Public API</h4>
        </div>
        <div class="feature" onclick="toggle(this, 'realtime')">
            <div class="feature-icon">⚡</div>
            <h4>Czas rzeczywisty</h4>
        </div>
    </div>

    <div class="custom">
        <label>Coś innego? Opisz swoje wymagania:</label>
        <textarea id="custom" placeholder="Np. Integracja z Slack, automatyczne raporty cotygodniowe..."></textarea>
    </div>

    <div class="nav">
        <button class="nav-btn" onclick="prevStep()">← Wstecz</button>
        <button class="nav-btn primary" onclick="nextStep()">Dalej →</button>
    </div>

    <script>
        let selectedFeatures = new Set();
        const vscode = acquireVsCodeApi();
        
        function toggle(el, feature) {
            el.classList.toggle('selected');
            if (selectedFeatures.has(feature)) {
                selectedFeatures.delete(feature);
            } else {
                selectedFeatures.add(feature);
            }
        }
        
        function nextStep() {
            vscode.postMessage({ command: 'setFeatures', features: Array.from(selectedFeatures), custom: document.getElementById('custom').value });
            vscode.postMessage({ command: 'nextStep' });
        }
        
        function prevStep() {
            vscode.postMessage({ command: 'prevStep' });
        }
    </script>
</body>
</html>`;
    }

    private buildTechStackStep(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1a1a2e;
            color: #fff;
            padding: 40px;
        }
        h1 {
            font-size: 2em;
            margin-bottom: 10px;
            color: #00d4ff;
        }
        p { color: #888; margin-bottom: 30px; }
        .options {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
        }
        .option {
            background: #16213e;
            border: 2px solid #333;
            border-radius: 10px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .option:hover { border-color: #00d4ff; }
        .option.selected {
            border-color: #00d4ff;
            background: #0f3460;
        }
        .option-icon { font-size: 2em; margin-bottom: 10px; }
        .option h3 { font-size: 1em; margin-bottom: 5px; }
        .option p { font-size: 0.75em; color: #666; margin-bottom: 0; }
        .skip {
            text-align: center;
            margin-top: 20px;
        }
        .skip a {
            color: #888;
            cursor: pointer;
        }
        .skip a:hover { color: #00d4ff; }
        .nav {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
        }
        .nav-btn {
            background: #333;
            color: #fff;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            cursor: pointer;
        }
        .nav-btn.primary {
            background: linear-gradient(135deg, #00d4ff, #00ff88);
            color: #1a1a2e;
        }
    </style>
</head>
<body>
    <h1>⚙️ Jakiej technologii chcesz użyć?</h1>
    <p>Wybierz główny stos technologiczny (możesz pominąć)</p>
    
    <div class="options">
        <div class="option" onclick="select(this, 'nextjs')">
            <div class="option-icon">▲</div>
            <h3>Next.js</h3>
            <p>React full-stack</p>
        </div>
        <div class="option" onclick="select(this, 'react')">
            <div class="option-icon">⚛️</div>
            <h3>React</h3>
            <p>Frontend SPA</p>
        </div>
        <div class="option" onclick="select(this, 'vue')">
            <div class="option-icon">💚</div>
            <h3>Vue.js</h3>
            <p>Frontend SPA</p>
        </div>
        <div class="option" onclick="select(this, 'nuxt')">
            <div class="option-icon">💚</div>
            <h3>Nuxt.js</h3>
            <p>Vue full-stack</p>
        </div>
        <div class="option" onclick="select(this, 'node')">
            <div class="option-icon">🟢</div>
            <h3>Node.js</h3>
            <p>Backend API</p>
        </div>
        <div class="option" onclick="select(this, 'python')">
            <div class="option-icon">🐍</div>
            <h3>Python</h3>
            <p>Django / FastAPI</p>
        </div>
        <div class="option" onclick="select(this, 'flutter')">
            <div class="option-icon">🦋</div>
            <h3>Flutter</h3>
            <p>Mobile cross-platform</p>
        </div>
        <div class="option" onclick="select(this, 'go')">
            <div class="option-icon">🔵</div>
            <h3>Go</h3>
            <p>High-performance API</p>
        </div>
    </div>

    <div class="skip">
        <a onclick="skipAndGenerate()">Pomiń i wygeneruj strukturę automatycznie →</a>
    </div>

    <div class="nav">
        <button class="nav-btn" onclick="prevStep()">← Wstecz</button>
        <button class="nav-btn primary" onclick="nextStep()">Dalej →</button>
    </div>

    <script>
        let selectedTech = null;
        const vscode = acquireVsCodeApi();
        
        function select(el, tech) {
            document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
            el.classList.add('selected');
            selectedTech = tech;
        }
        
        function nextStep() {
            vscode.postMessage({ command: 'setTechStack', tech: selectedTech });
            vscode.postMessage({ command: 'nextStep' });
        }
        
        function prevStep() {
            vscode.postMessage({ command: 'prevStep' });
        }
        
        function skipAndGenerate() {
            vscode.postMessage({ command: 'setTechStack', tech: null });
            vscode.postMessage({ command: 'generate' });
        }
    </script>
</body>
</html>`;
    }

    private buildReviewStep(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #1a1a2e;
            color: #fff;
            padding: 40px;
            text-align: center;
        }
        .loading {
            margin-top: 50px;
        }
        .spinner {
            width: 60px;
            height: 60px;
            border: 4px solid #333;
            border-top-color: #00d4ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        h2 { margin-bottom: 20px; }
        p { color: #888; }
        .steps {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 40px;
        }
        .step {
            text-align: center;
        }
        .step-num {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #333;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 10px;
        }
        .step.active .step-num {
            background: #00d4ff;
            color: #1a1a2e;
        }
        .step.done .step-num {
            background: #27ae60;
        }
        .step p { font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <h2>🤖 AI analizuje Twój projekt...</h2>
        <p>Zaraz zobaczysz propozycję struktury i modułów.</p>
        
        <div class="steps">
            <div class="step active">
                <div class="step-num">1</div>
                <p>Analiza<br>wymagań</p>
            </div>
            <div class="step">
                <div class="step-num">2</div>
                <p>Propozycja<br>architektury</p>
            </div>
            <div class="step">
                <div class="step-num">3</div>
                <p>Tworzenie<br>modułów</p>
            </div>
        </div>
    </div>
</body>
</html>`;
    }

    private setupMessageHandler(): void {
        this.panel.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case "nextStep":
                    this.setStep(Math.min(this.currentStep + 1, 4));
                    if (this.currentStep === 4) {
                        await this.generateProject();
                    }
                    break;
                case "prevStep":
                    this.setStep(Math.max(this.currentStep - 1, 0));
                    break;
                case "setProjectType":
                    (this as any).projectType = msg.type;
                    break;
                case "setFeatures":
                    (this as any).features = msg.features;
                    (this as any).customFeatures = msg.custom;
                    break;
                case "setTechStack":
                    (this as any).techStack = msg.tech;
                    break;
                case "generate":
                    await this.generateProject();
                    break;
            }
        });
    }

    private async generateProject(): Promise<void> {
        try {
            const projectType = (this as any).projectType || 'web';
            const features = (this as any).features || [];
            const customFeatures = (this as any).customFeatures || '';
            const techStack = (this as any).techStack || 'nextjs';

            // Build prompt for AI
            const prompt = `Create a software project architecture proposal.

PROJECT TYPE: ${projectType}
FEATURES NEEDED: ${features.join(', ') || 'None specified'}
ADDITIONAL REQUIREMENTS: ${customFeatures || 'None'}
TECH STACK: ${techStack}

Generate a JSON response with:
{
  "modules": [
    {
      "name": "ModuleName",
      "description": "What this module does",
      "dependsOn": ["other", "module", "names"]
    }
  ],
  "structure": {
    "folders": ["src/components", "src/api", etc],
    "keyFiles": ["src/index.ts", etc]
  },
  "suggestions": ["Recommendation 1", "Recommendation 2"]
}

Only return JSON, no other text.`;

            vscode.window.showInformationMessage("🤖 AI tworzy strukturę projektu...");

            const result = await this.ollama.ask(prompt);

            if (!result.success) {
                vscode.window.showErrorMessage("AI Error: " + result.error);
                this.setStep(0);
                return;
            }

            // Parse response
            let modules: any[] = [];
            try {
                const jsonMatch = result.content.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    modules = JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                vscode.window.showWarningMessage("Could not parse AI response, creating default structure");
            }

            // Add modules to BrainStore
            for (const m of modules) {
                if (m.name) {
                    this.store.addModule({
                        name: m.name,
                        description: m.description || '',
                        status: 'IDEA',
                        progress: 0,
                        locked: false,
                        files: [],
                        dependsOn: m.dependsOn || [],
                        position: { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 }
                    });
                }
            }

            this.store.addRecentChange("Created project structure", `${modules.length} modules suggested`);

            vscode.window.showInformationMessage(`✅ Utworzono ${modules.length} modułów!`);

            // Open Canvas
            CanvasPanel.createOrShow();
            this.panel.dispose();

        } catch (error) {
            vscode.window.showErrorMessage("Error: " + String(error));
            this.setStep(0);
        }
    }

    public dispose(): void {
        ProjectCreatorPanel.currentPanel = undefined;
        this.panel.dispose();
    }
}
