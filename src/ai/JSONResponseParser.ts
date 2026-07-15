/**
 * UniversalAIResponseParser - Handles AI responses from any model
 * Supports JSON, Markdown, and natural language responses
 */

export interface ParsedAnalysis {
projectName?: string;
modules: Array<{ 
name: string; 
description: string; 
status: string; 
files?: string[]; 
dependsOn?: string[] 
}>;
risks: Array<{ 
title: string; 
description: string; 
severity: string; 
mitigation?: string 
}>;
roadmap: Array<{ 
title: string; 
description: string; 
order: number; 
dependsOn?: string[]
}>;
suggestions: string[];
observations?: string;
}

export class JSONResponseParser {
static parse(content: string): ParsedAnalysis {
const result: ParsedAnalysis = {
modules: [],
risks: [],
roadmap: [],
suggestions: [],
};

if (!content || !content.trim()) {
return result;
}

// Strategy 1: Try JSON parsing
const jsonResult = this.tryParseJSON(content);
if (jsonResult && (jsonResult.modules.length > 0 || jsonResult.risks.length > 0 || jsonResult.roadmap.length > 0)) {
console.log("✅ Parser: JSON parsing successful");
return jsonResult;
}

// Strategy 2: Try Markdown parsing with section detection
const markdownResult = this.parseMarkdown(content);
if (markdownResult.modules.length > 0 || markdownResult.risks.length > 0 || markdownResult.roadmap.length > 0) {
console.log("✅ Parser: Markdown parsing successful");
return markdownResult;
}

// Strategy 3: Extract modules from any structured format
const extractedResult = this.extractFromAnyFormat(content);
if (extractedResult.modules.length > 0) {
console.log("✅ Parser: Extraction parsing successful");
return extractedResult;
}

// Strategy 4: Fallback - create module from project name if nothing else worked
console.log("⚠️ Parser: No structured data found, using fallback");
const projectName = this.extractProjectName(content);
if (projectName) {
result.modules.push({
name: "Main",
description: "Główny moduł projektu",
status: "PLANNED",
});
}

return result;
}

/**
 * Strategy 1: Parse JSON (handles various JSON formats)
 */
private static tryParseJSON(content: string): ParsedAnalysis | null {
let jsonStr = this.extractJSONString(content);
if (!jsonStr) return null;

try {
const data = JSON.parse(jsonStr);
return this.normalizeJSON(data);
} catch (e) {
console.log("❌ JSON parse failed:", String(e).substring(0, 100));
return null;
}
}

/**
 * Extract JSON string from content (handles markdown code blocks, etc.)
 */
private static extractJSONString(content: string): string | null {
// Remove markdown code blocks
let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

// Find first { and last }
const startIdx = cleaned.indexOf("{");
const endIdx = cleaned.lastIndexOf("}");

if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
return null;
}

return cleaned.substring(startIdx, endIdx + 1);
}

/**
 * Normalize JSON data to our format (handles various key names)
 */
private static normalizeJSON(data: any): ParsedAnalysis {
const result: ParsedAnalysis = {
modules: [],
risks: [],
roadmap: [],
suggestions: [],
};

if (!data || typeof data !== "object") {
return result;
}

// Project name (various formats)
result.projectName = data.projectName || data.project_name || data.name || data.title;

// Modules (various formats)
const modules = data.modules || data.components || data.services || data.packages || data.layers || [];
if (Array.isArray(modules)) {
result.modules = modules.map((m: any) => this.normalizeModule(m));
}

// Risks (various formats)
const risks = data.risks || data.issues || data.concerns || data.problems || [];
if (Array.isArray(risks)) {
result.risks = risks.map((r: any) => this.normalizeRisk(r));
}

// Roadmap (various formats)
const roadmap = data.roadmap || data.tasks || data.phases || data.milestones || data.steps || [];
if (Array.isArray(roadmap)) {
result.roadmap = roadmap.map((r: any, i: number) => this.normalizeRoadmapItem(r, i));
}

// Suggestions
const suggestions = data.suggestions || data.recommendations || data.tips || data.ideas || [];
if (Array.isArray(suggestions)) {
result.suggestions = suggestions.map((s: any) => 
typeof s === "string" ? s : (s.text || s.description || s.title || "")
).filter(Boolean);
}

// Observations
result.observations = data.observations || data.notes || data.summary || data.facts;

return result;
}

private static normalizeModule(m: any): { name: string; description: string; status: string; files?: string[]; dependsOn?: string[] } {
return {
name: String(m.name || m.title || m.component || "Unknown"),
description: String(m.description || m.desc || m.summary || ""),
status: this.normalizeStatus(m.status),
files: Array.isArray(m.files) ? m.files : 
   Array.isArray(m.file) ? [m.file] : 
   Array.isArray(m.paths) ? m.paths : [],
dependsOn: Array.isArray(m.dependsOn) ? m.dependsOn : 
   Array.isArray(m.dependencies) ? m.dependencies : 
   Array.isArray(m.deps) ? m.deps : [],
};
}

private static normalizeRisk(r: any): { title: string; description: string; severity: string; mitigation?: string } {
return {
title: String(r.title || r.name || r.issue || "Risk"),
description: String(r.description || r.desc || r.detail || ""),
severity: String(r.severity || r.level || r.priority || "MEDIUM").toUpperCase(),
mitigation: r.mitigation ? String(r.mitigation) : 
r.solution ? String(r.solution) :
r.fix ? String(r.fix) : undefined,
};
}

private static normalizeRoadmapItem(r: any, index: number): { title: string; description: string; order: number; dependsOn?: string[] } {
return {
title: String(r.title || r.name || r.task || `Task ${index + 1}`),
description: String(r.description || r.desc || r.summary || ""),
order: typeof r.order === "number" ? r.order : 
   typeof r.priority === "number" ? r.priority : index,
dependsOn: Array.isArray(r.dependsOn) ? r.dependsOn : [],
};
}

private static normalizeStatus(status: string | undefined): string {
if (!status) return "PLANNED";
const s = String(status).toUpperCase().replace(/[\s-_]/g, "");
const statusMap: Record<string, string> = {
"IDEA": "IDEA",
"PLANNED": "PLANNED",
"ACTIVE": "IN_PROGRESS",
"REVIEW": "REVIEW",
"DONE": "DONE",
"COMPLETE": "DONE",
"COMPLETED": "DONE",
"LOCKED": "LOCKED",
};
return statusMap[s] || "PLANNED";
}

/**
 * Strategy 2: Parse Markdown with section detection
 */
private static parseMarkdown(content: string): ParsedAnalysis {
const result: ParsedAnalysis = {
modules: [],
risks: [],
roadmap: [],
suggestions: [],
};

// Extract project name from first heading
const titleMatch = content.match(/^#+\s*(.+)/m);
if (titleMatch) {
result.projectName = titleMatch[1].trim();
}

// Split into sections
const sections = this.splitIntoSections(content);

// Parse each section type
for (const [type, sectionContent] of Object.entries(sections)) {
switch (type) {
case "modules":
case "components":
case "services":
result.modules.push(...this.parseModulesFromSection(sectionContent));
break;
case "risks":
case "issues":
case "concerns":
result.risks.push(...this.parseRisksFromSection(sectionContent));
break;
case "roadmap":
case "tasks":
case "phases":
case "milestones":
result.roadmap.push(...this.parseRoadmapFromSection(sectionContent));
break;
case "suggestions":
case "recommendations":
case "tips":
result.suggestions.push(...this.parseListItems(sectionContent));
break;
}
}

// If no sections found, try to extract from list items
if (result.modules.length === 0) {
}

return result;
}

private static splitIntoSections(content: string): Record<string, string> {
const sections: Record<string, string> = {};
const lines = content.split("\n");
let currentSection = "";
let currentContent: string[] = [];

for (const line of lines) {
const sectionMatch = line.match(/^#{1,3}\s*(?:\[?MODULES?\]?|COMPONENTS?|SERVICES?|RISKS?|ISSUES?|ROADMAP?|TASKS?|PHASES?|MILESTONES?|SUGGESTIONS?|RECOMMENDATIONS?)/i);

if (sectionMatch) {
if (currentSection && currentContent.length > 0) {
sections[currentSection.toLowerCase()] = currentContent.join("\n");
}
currentSection = sectionMatch[1] || sectionMatch[0];
currentContent = [];
} else {
currentContent.push(line);
}
}

if (currentSection && currentContent.length > 0) {
sections[currentSection.toLowerCase()] = currentContent.join("\n");
}

return sections;
}

private static parseModulesFromSection(section: string): Array<{ name: string; description: string; status: string }> {
const modules: Array<{ name: string; description: string; status: string }> = [];
const items = this.parseListItems(section);

for (const item of items) {
// Try to extract name and description
const nameMatch = item.match(/^[\*\-]\s*\*\*([^*]+)\*\*/) || 
  item.match(/^[\*\-]\s*([A-Z][a-zA-Z\s]+?)(?:\s*[-:]|$$)/) ||
  item.match(/^(\d+[\.\)]\s*[A-Z][a-zA-Z\s]+)/);

if (nameMatch) {
modules.push({
name: nameMatch[1].replace(/\*\*/g, "").trim(),
description: item.replace(/^[\*\-]\s*/, "").substring(0, 100),
status: this.detectStatus(item),
});
}
}

return modules;
}

private static parseRisksFromSection(section: string): Array<{ title: string; description: string; severity: string }> {
const risks: Array<{ title: string; description: string; severity: string }> = [];
const items = this.parseListItems(section);

for (const item of items) {
risks.push({
title: item.replace(/^[\*\-]\s*/, "").replace(/\*\*/g, "").substring(0, 50),
description: item,
severity: this.detectSeverity(item),
});
}

return risks;
}

private static parseRoadmapFromSection(section: string): Array<{ title: string; description: string; order: number }> {
const items = this.parseListItems(section);
return items.map((item, index) => ({
title: item.replace(/^[\*\-]\s*/, "").replace(/\*\*/g, "").substring(0, 50),
description: item,
order: index,
}));
}

private static parseListItems(section: string): string[] {
return section
.split("\n")
.map(line => line.replace(/^[\s\-\*\d\.]+/, "").trim())
.filter(line => line.length > 0 && !line.startsWith("#"));
}

private static detectStatus(text: string): string {
const lower = text.toLowerCase();
if (/done|complete|finished|implemented/.test(lower)) return "DONE";
if (/in progress|active|working|current/.test(lower)) return "IN_PROGRESS";
if (/review|testing|checking/.test(lower)) return "REVIEW";
if (/locked|blocked|paused/.test(lower)) return "LOCKED";
return "PLANNED";
}

private static detectSeverity(text: string): string {
const lower = text.toLowerCase();
if (/critical|crityczne|high|wysokie/.test(lower)) return "HIGH";
if (/low|niska|minor/.test(lower)) return "LOW";
return "MEDIUM";
}

/**
 * Strategy 3: Extract from any format (fallback)
 */
private static extractFromAnyFormat(content: string): ParsedAnalysis {
const result: ParsedAnalysis = {
modules: [],
risks: [],
roadmap: [],
suggestions: [],
};

// Extract any structured lists
const bulletPoints = content.match(/^[\s\-\*•]\s*(.+)/gm) || [];

for (const point of bulletPoints) {
const text = point.replace(/^[\s\-\*•]\s*/, "").trim();

// Check if it looks like a module (has name pattern)
if (/^[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*$/.test(text) || 
/\b(core|main|api|ui|backend|frontend|service|module)\b/i.test(text)) {
result.modules.push({
name: text.replace(/\*\*/g, "").substring(0, 30),
description: text,
status: "PLANNED",
});
}
}

return result;
}

private static extractProjectName(content: string): string | null {
// Try first heading
const headingMatch = content.match(/^#\s+(.+)/m);
if (headingMatch) return headingMatch[1].trim();

// Try projectName field
const projectMatch = content.match(/"projectName"\s*:\s*"([^"]+)"/);
if (projectMatch) return projectMatch[1];

return null;
}
}
