/**
 * i18n - Internationalization
 * Support for multiple languages: EN, PL
 */

export type Language = "en" | "pl";

export interface TranslationKeys {
    // Common
    appName: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    loading: string;
    error: string;
    success: string;
    
    // Panels
    kanban: string;
    timeline: string;
    chat: string;
    team: string;
    deployment: string;
    monitoring: string;
    documentation: string;
    marketplace: string;
    settings: string;
    
    // Actions
    generate: string;
    analyze: string;
    run: string;
    deploy: string;
    refresh: string;
    
    // Status
    todo: string;
    inProgress: string;
    review: string;
    done: string;
    backlog: string;
    
    // AI
    askAI: string;
    generating: string;
    analyzing: string;
    thinking: string;
}

const translations: Record<Language, TranslationKeys> = {
    en: {
        // Common
        appName: "Project Brain",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        add: "Add",
        search: "Search",
        loading: "Loading...",
        error: "Error",
        success: "Success",
        
        // Panels
        kanban: "Kanban Board",
        timeline: "Timeline",
        chat: "AI Chat",
        team: "Team",
        deployment: "Deployment",
        monitoring: "Monitoring",
        documentation: "Documentation",
        marketplace: "Marketplace",
        settings: "Settings",
        
        // Actions
        generate: "Generate",
        analyze: "Analyze",
        run: "Run",
        deploy: "Deploy",
        refresh: "Refresh",
        
        // Status
        todo: "Todo",
        inProgress: "In Progress",
        review: "Review",
        done: "Done",
        backlog: "Backlog",
        
        // AI
        askAI: "Ask AI",
        generating: "Generating...",
        analyzing: "Analyzing...",
        thinking: "Thinking..."
    },
    pl: {
        // Common
        appName: "Project Brain",
        save: "Zapisz",
        cancel: "Anuluj",
        delete: "Usuń",
        edit: "Edytuj",
        add: "Dodaj",
        search: "Szukaj",
        loading: "Ładowanie...",
        error: "Błąd",
        success: "Sukces",
        
        // Panels
        kanban: "Tablica Kanban",
        timeline: "Oś czasu",
        chat: "AI Chat",
        team: "Zespół",
        deployment: "Wdrożenie",
        monitoring: "Monitoring",
        documentation: "Dokumentacja",
        marketplace: "Marketplace",
        settings: "Ustawienia",
        
        // Actions
        generate: "Generuj",
        analyze: "Analizuj",
        run: "Uruchom",
        deploy: "Wdróż",
        refresh: "Odśwież",
        
        // Status
        todo: "Do zrobienia",
        inProgress: "W trakcie",
        review: "Przegląd",
        done: "Gotowe",
        backlog: "Backlog",
        
        // AI
        askAI: "Zapytaj AI",
        generating: "Generowanie...",
        analyzing: "Analizowanie...",
        thinking: "Myślenie..."
    }
};

let currentLanguage: Language = "en";

export function setLanguage(lang: Language): void {
    currentLanguage = lang;
}

export function getLanguage(): Language {
    return currentLanguage;
}

export function t(key: keyof TranslationKeys): string {
    return translations[currentLanguage][key];
}

export function getTranslations(): TranslationKeys {
    return translations[currentLanguage];
}

export function getAllLanguages(): Language[] {
    return Object.keys(translations) as Language[];
}

export const languageNames: Record<Language, string> = {
    en: "English",
    pl: "Polski"
};
