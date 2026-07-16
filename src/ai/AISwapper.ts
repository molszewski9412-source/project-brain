/**
 * AISwapper - TASK 8.1, 8.2, 8.3
 * Zarządzanie wieloma providerami AI
 */

export interface AIResponse {
    success: boolean;
    content: string;
    error?: string;
    model?: string;
}

export interface AIProvider {
    name: string;
    ask(prompt: string): Promise<AIResponse>;
}

/**
 * TASK 8.1: AI Swapper Service
 * Wybór najlepszego modelu dla zadania
 */
export class AISwapper {
    private providers: Map<string, AIProvider> = new Map();
    private currentProvider: string = "ollama";

    constructor() {
        // Ollama jest domyślny - załadowany oddzielnie
    }

    /**
     * TASK 8.1: Dodawanie providera
     */
    addProvider(name: string, provider: AIProvider): void {
        this.providers.set(name, provider);
    }

    /**
     * TASK 8.1: Wybór providera
     */
    setProvider(name: string): void {
        this.currentProvider = name;
    }

    /**
     * TASK 8.1: Pobierz aktualnego providera
     */
    getProvider(): string {
        return this.currentProvider;
    }

    /**
     * TASK 8.1: Lista providerów
     */
    listProviders(): string[] {
        return Array.from(this.providers.keys());
    }
}

/**
 * TASK 8.2: OpenAI Adapter
 */
export class OpenAIProvider implements AIProvider {
    name = "openai";
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = "gpt-4") {
        this.apiKey = apiKey;
        this.model = model;
    }

    async ask(prompt: string): Promise<AIResponse> {
        try {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: "system",
                            content: "You are Project Brain AI assistant. Return JSON when requested."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 4000
                })
            });

            if (!response.ok) {
                const error = await response.text();
                return {
                    success: false,
                    content: "",
                    error: `OpenAI Error ${response.status}: ${error}`
                };
            }

            const data: any = await response.json();
            const content = data.choices?.[0]?.message?.content || "";

            return {
                success: true,
                content,
                model: this.model
            };
        } catch (error) {
            return {
                success: false,
                content: "",
                error: String(error)
            };
        }
    }
}

/**
 * TASK 8.3: Claude Adapter (Anthropic)
 */
export class ClaudeProvider implements AIProvider {
    name = "claude";
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = "claude-3-sonnet-20240229") {
        this.apiKey = apiKey;
        this.model = model;
    }

    async ask(prompt: string): Promise<AIResponse> {
        try {
            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": this.apiKey,
                    "anthropic-version": "2023-06-01"
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 4000,
                    messages: [{ role: "user", content: prompt }]
                })
            });

            if (!response.ok) {
                const error = await response.text();
                return {
                    success: false,
                    content: "",
                    error: `Claude Error ${response.status}: ${error}`
                };
            }

            const data: any = await response.json();
            const content = data.content?.[0]?.text || "";

            return {
                success: true,
                content,
                model: this.model
            };
        } catch (error) {
            return {
                success: false,
                content: "",
                error: String(error)
            };
        }
    }
}

/**
 * TASK 8.3: Gemini Adapter
 */
export class GeminiProvider implements AIProvider {
    name = "gemini";
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = "gemini-pro") {
        this.apiKey = apiKey;
        this.model = model;
    }

    async ask(prompt: string): Promise<AIResponse> {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                }
            );

            if (!response.ok) {
                const error = await response.text();
                return {
                    success: false,
                    content: "",
                    error: `Gemini Error ${response.status}: ${error}`
                };
            }

            const data: any = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

            return {
                success: true,
                content,
                model: this.model
            };
        } catch (error) {
            return {
                success: false,
                content: "",
                error: String(error)
            };
        }
    }
}
