/**
 * CodeGeneratorService - TASK 14.1
 * Generowanie kodu z modułów przy użyciu AI
 */

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { BrainStore } from "../storage/BrainStore";
import { BrainModule } from "../models/ProjectBrain";
import { OllamaClient } from "../ai/OllamaClient";
import { AIContextBuilder } from "../ai/AIContextBuilder";

export interface GenerationOptions {
    moduleId: string;
    type: 'full' | 'api' | 'ui' | 'test' | 'custom';
    framework?: string;
    language?: string;
    customPrompt?: string;
}

export interface GenerationResult {
    success: boolean;
    files: GeneratedFile[];
    errors: string[];
    warnings: string[];
}

export interface GeneratedFile {
    path: string;
    content: string;
    action: 'create' | 'update' | 'skip';
    reason?: string;
}

export class CodeGeneratorService {
    private store: BrainStore;
    private ollama: OllamaClient;
    private contextBuilder: AIContextBuilder;

    constructor() {
        this.store = new BrainStore();
        this.ollama = new OllamaClient();
        this.contextBuilder = new AIContextBuilder();
    }

    /**
     * TASK 14.1: Główna funkcja generowania kodu
     */
    async generate(options: GenerationOptions): Promise<GenerationResult> {
        const module = this.store.getModule(options.moduleId);
        if (!module) {
            return {
                success: false,
                files: [],
                errors: [`Module not found: ${options.moduleId}`],
                warnings: []
            };
        }

        vscode.window.showInformationMessage(`🔄 Generating code for "${module.name}"...`);

        try {
            switch (options.type) {
                case 'full':
                    return await this.generateFullModule(module, options);
                case 'api':
                    return await this.generateAPI(module, options);
                case 'ui':
                    return await this.generateUI(module, options);
                case 'test':
                    return await this.generateTests(module, options);
                case 'custom':
                    return await this.generateCustom(module, options);
                default:
                    return await this.generateFullModule(module, options);
            }
        } catch (error) {
            return {
                success: false,
                files: [],
                errors: [`Generation failed: ${String(error)}`],
                warnings: []
            };
        }
    }

    /**
     * Generowanie pełnego modułu
     */
    private async generateFullModule(module: BrainModule, options: GenerationOptions): Promise<GenerationResult> {
        const prompt = this.buildFullModulePrompt(module, options);
        const result = await this.ollama.ask(prompt);

        if (!result.success) {
            return {
                success: false,
                files: [],
                errors: [`AI Error: ${result.error}`],
                warnings: []
            };
        }

        // Parse the response - expect multiple files
        const files = this.parseCodeResponse(result.content, module);

        // Create actual files
        const createdFiles = await this.createFiles(files);

        this.store.setModuleInsight(module.id, `Generated ${createdFiles.length} files`);

        return {
            success: true,
            files: createdFiles,
            errors: [],
            warnings: createdFiles.filter(f => f.action === 'skip').map(f => f.reason || 'File skipped')
        };
    }

    /**
     * TASK 14.2: Generowanie REST API
     */
    private async generateAPI(module: BrainModule, options: GenerationOptions): Promise<GenerationResult> {
        const prompt = this.buildAPIPrompt(module, options);
        const result = await this.ollama.ask(prompt);

        if (!result.success) {
            return {
                success: false,
                files: [],
                errors: [`AI Error: ${result.error}`],
                warnings: []
            };
        }

        const files = this.parseCodeResponse(result.content, module);
        const createdFiles = await this.createFiles(files);

        return {
            success: true,
            files: createdFiles,
            errors: [],
            warnings: []
        };
    }

    /**
     * TASK 14.3: Generowanie komponentów UI
     */
    private async generateUI(module: BrainModule, options: GenerationOptions): Promise<GenerationResult> {
        const prompt = this.buildUIPrompt(module, options);
        const result = await this.ollama.ask(prompt);

        if (!result.success) {
            return {
                success: false,
                files: [],
                errors: [`AI Error: ${result.error}`],
                warnings: []
            };
        }

        const files = this.parseCodeResponse(result.content, module);
        const createdFiles = await this.createFiles(files);

        return {
            success: true,
            files: createdFiles,
            errors: [],
            warnings: []
        };
    }

    /**
     * TASK 14.4: Generowanie testów
     */
    private async generateTests(module: BrainModule, options: GenerationOptions): Promise<GenerationResult> {
        const prompt = this.buildTestPrompt(module, options);
        const result = await this.ollama.ask(prompt);

        if (!result.success) {
            return {
                success: false,
                files: [],
                errors: [`AI Error: ${result.error}`],
                warnings: []
            };
        }

        const files = this.parseCodeResponse(result.content, module);
        const createdFiles = await this.createFiles(files);

        return {
            success: true,
            files: createdFiles,
            errors: [],
            warnings: []
        };
    }

    /**
     * Generowanie z custom promptem
     */
    private async generateCustom(module: BrainModule, options: GenerationOptions): Promise<GenerationResult> {
        if (!options.customPrompt) {
            return {
                success: false,
                files: [],
                errors: ['Custom prompt is required'],
                warnings: []
            };
        }

        const context = this.contextBuilder.buildContext({
            purpose: "generate",
            question: `${options.customPrompt}\n\nModule: ${module.name}\nDescription: ${module.description}`
        });

        const result = await this.ollama.ask(context);

        if (!result.success) {
            return {
                success: false,
                files: [],
                errors: [`AI Error: ${result.error}`],
                warnings: []
            };
        }

        const files = this.parseCodeResponse(result.content, module);
        const createdFiles = await this.createFiles(files);

        return {
            success: true,
            files: createdFiles,
            errors: [],
            warnings: []
        };
    }

    /**
     * Budowanie promptu dla pełnego modułu
     */
    private buildFullModulePrompt(module: BrainModule, options: GenerationOptions): string {
        return `You are a code generator. Generate complete, production-ready code for this module.

MODULE NAME: ${module.name}
DESCRIPTION: ${module.description}
DEPENDENCIES: ${module.dependsOn.join(', ') || 'None'}
FRAMEWORK: ${options.framework || 'React + Node.js'}
LANGUAGE: ${options.language || 'TypeScript'}

REQUIREMENTS:
1. Generate all necessary files for this module
2. Include proper error handling
3. Add TypeScript types/interfaces
4. Include unit tests
5. Follow best practices

OUTPUT FORMAT:
Return the response as a JSON array with this structure:
[
  {
    "filePath": "relative/path/to/file.ts",
    "content": "complete file content here"
  }
]

Only return JSON, no other text.`;
    }

    /**
     * Budowanie promptu dla API
     */
    private buildAPIPrompt(module: BrainModule, options: GenerationOptions): string {
        return `You are a REST API generator. Generate complete CRUD API endpoints.

MODULE: ${module.name}
DESCRIPTION: ${module.description}

REQUIREMENTS:
1. Express.js routes with proper HTTP methods (GET, POST, PUT, DELETE)
2. Input validation with express-validator or similar
3. Error handling middleware
4. TypeScript types
5. OpenAPI/Swagger documentation comments

OUTPUT FORMAT:
Return JSON array:
[
  {
    "filePath": "relative/path/to/file.ts",
    "content": "complete file content"
  }
]

Only return JSON.`;
    }

    /**
     * Budowanie promptu dla UI
     */
    private buildUIPrompt(module: BrainModule, options: GenerationOptions): string {
        const framework = options.framework || 'React';
        return `You are a UI component generator. Generate complete React components.

MODULE: ${module.name}
DESCRIPTION: ${module.description}
FRAMEWORK: ${framework}

REQUIREMENTS:
1. Functional components with hooks
2. TypeScript props interface
3. Styled-components or CSS modules
4. Loading and error states
5. Responsive design

OUTPUT FORMAT:
Return JSON array:
[
  {
    "filePath": "relative/path/to/Component.tsx",
    "content": "complete component code"
  }
]

Only return JSON.`;
    }

    /**
     * Budowanie promptu dla testów
     */
    private buildTestPrompt(module: BrainModule, options: GenerationOptions): string {
        return `You are a test generator. Generate comprehensive unit tests.

MODULE: ${module.name}
DESCRIPTION: ${module.description}

REQUIREMENTS:
1. Jest test framework
2. High coverage - test happy path AND edge cases
3. Mock external dependencies
4. Descriptive test names
5. Arrange-Act-Assert pattern

OUTPUT FORMAT:
Return JSON array:
[
  {
    "filePath": "relative/path/to/Component.test.tsx",
    "content": "complete test code"
  }
]

Only return JSON.`;
    }

    /**
     * Parsowanie odpowiedzi AI - wyciąganie plików z JSON
     */
    private parseCodeResponse(response: string, module: BrainModule): GeneratedFile[] {
        const files: GeneratedFile[] = [];

        try {
            // Try to find JSON in the response
            let jsonStr = response;

            // Find JSON array bounds
            const jsonStart = response.indexOf('[');
            const jsonEnd = response.lastIndexOf(']');

            if (jsonStart !== -1 && jsonEnd !== -1) {
                jsonStr = response.substring(jsonStart, jsonEnd + 1);
            }

            const parsed = JSON.parse(jsonStr);

            if (Array.isArray(parsed)) {
                for (const item of parsed) {
                    if (item.filePath && item.content) {
                        files.push({
                            path: item.filePath,
                            content: item.content,
                            action: 'create'
                        });
                    }
                }
            }
        } catch (error) {
            // If JSON parsing fails, create a single file with the whole response
            const moduleDir = this.getModuleDirectory(module);
            const ext = this.detectExtension(module.name);
            files.push({
                path: `${moduleDir}/${module.name.toLowerCase().replace(/\s+/g, '-')}${ext}`,
                content: response,
                action: 'create'
            });
        }

        return files;
    }

    /**
     * Tworzenie plików na dysku
     */
    private async createFiles(files: GeneratedFile[]): Promise<GeneratedFile[]> {
        const createdFiles: GeneratedFile[] = [];
        const workspace = vscode.workspace.workspaceFolders?.[0];

        if (!workspace) {
            throw new Error("No workspace opened");
        }

        for (const file of files) {
            try {
                const fullPath = path.join(workspace.uri.fsPath, file.path);
                const dir = path.dirname(fullPath);

                // Create directory if it doesn't exist
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                // Check if file exists
                if (fs.existsSync(fullPath)) {
                    // Ask user what to do
                    const action = await vscode.window.showQuickPick(
                        ['Overwrite', 'Skip', 'Backup & Overwrite'],
                        { placeHolder: `File ${file.path} already exists. What to do?` }
                    );

                    if (action === 'Skip') {
                        file.action = 'skip';
                        file.reason = 'File already exists';
                        createdFiles.push(file);
                        continue;
                    }

                    if (action === 'Backup & Overwrite') {
                        const backupPath = fullPath + '.backup';
                        fs.copyFileSync(fullPath, backupPath);
                    }

                    file.action = 'update';
                } else {
                    file.action = 'create';
                }

                // Write file
                fs.writeFileSync(fullPath, file.content, 'utf8');
                createdFiles.push(file);

            } catch (error) {
                file.action = 'skip';
                file.reason = `Error: ${String(error)}`;
                createdFiles.push(file);
            }
        }

        return createdFiles;
    }

    /**
     * Pobieranie katalogu modułu
     */
    private getModuleDirectory(module: BrainModule): string {
        const name = module.name.toLowerCase().replace(/\s+/g, '-');
        
        if (name.includes('api') || name.includes('backend') || name.includes('server')) {
            return 'src/api';
        }
        if (name.includes('ui') || name.includes('frontend') || name.includes('component')) {
            return 'src/components';
        }
        if (name.includes('auth') || name.includes('user') || name.includes('login')) {
            return 'src/auth';
        }
        if (name.includes('test')) {
            return 'src/__tests__';
        }
        
        return 'src/modules';
    }

    /**
     * Wykrywanie rozszerzenia pliku
     */
    private detectExtension(moduleName: string): string {
        const name = moduleName.toLowerCase();
        
        if (name.includes('component') || name.includes('ui') || name.includes('button')) {
            return '.tsx';
        }
        if (name.includes('test')) {
            return '.test.ts';
        }
        if (name.includes('api') || name.includes('service') || name.includes('controller')) {
            return '.ts';
        }
        if (name.includes('style') || name.includes('css')) {
            return '.css';
        }
        
        return '.ts';
    }

    /**
     * Lista dostępnych generatorów
     */
    getAvailableGenerators(): { id: string; name: string; description: string }[] {
        return [
            { id: 'full', name: 'Full Module', description: 'Complete module with API, UI, and tests' },
            { id: 'api', name: 'REST API', description: 'Generate CRUD API endpoints' },
            { id: 'ui', name: 'UI Components', description: 'Generate React/Vue components' },
            { id: 'test', name: 'Unit Tests', description: 'Generate test files' },
            { id: 'custom', name: 'Custom Prompt', description: 'Generate code from your prompt' }
        ];
    }
}
