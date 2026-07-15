/**
 * JSONResponseParser - Robust parser for AI JSON responses
 */

export interface ParsedAnalysis {
projectName?: string;
modules: Array<{
name: string;
description: string;
status: string;
files?: string[];
dependsOn?: string[];
}>;
risks: Array<{
title: string;
description: string;
severity: string;
mitigation?: string;
}>;
roadmap: Array<{
title: string;
description: string;
order: number;
dependsOn?: string[];
}>;
suggestions: string[];
observations?: string;
facts?: string;
raw?: string;
}

export class JSONResponseParser {
static parse(content: string): ParsedAnalysis {
// Clean markdown code blocks
let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

// Try to extract JSON
const jsonStr = this.extractJSON(cleaned);
if (jsonStr) {
try {
const data = JSON.parse(jsonStr);
return this.normalizeParsedData(data);
} catch (e) {
console.log("JSON parse error:", e);
}
}

// Fallback: try markdown parsing
return this.parseMarkdown(content);
}

private static extractJSON(content: string): string | null {
// Find JSON object
const startIdx = content.indexOf("{");
if (startIdx === -1) return null;

let endIdx = content.lastIndexOf("}");
if (endIdx === -1) return null;

// Try to find matching braces
let depth = 0;
for (let i = startIdx; i <= endIdx; i++) {
if (content[i] === "{") depth++;
else if (content[i] === "}") depth--;
if (depth === 0 && i > startIdx) {
endIdx = i;
break;
}
}

return content.substring(startIdx, endIdx + 1);
}

private static normalizeParsedData(data: any): ParsedAnalysis {
const result: ParsedAnalysis = {
modules: [],
risks: [],
roadmap: [],
suggestions: [],
};

if (!data || typeof data !== "object") {
return result;
}

// Project name
if (data.projectName) {
result.projectName = data.projectName;
}

// Modules
if (data.modules && Array.isArray(data.modules)) {
result.modules = data.modules.map((m: any) => ({
name: String(m.name || m.title || "Unknown"),
description: String(m.description || m.desc || ""),
status: String(m.status || "PLANNED").toUpperCase().replace(" ", "_"),
files: Array.isArray(m.files) ? m.files : [],
dependsOn: Array.isArray(m.dependsOn) ? m.dependsOn : [],
}));
}

// Risks
if (data.risks && Array.isArray(data.risks)) {
result.risks = data.risks.map((r: any) => ({
title: String(r.title || r.name || "Risk"),
description: String(r.description || ""),
severity: String(r.severity || "MEDIUM").toUpperCase(),
mitigation: r.mitigation ? String(r.mitigation) : undefined,
}));
}

// Roadmap
if (data.roadmap && Array.isArray(data.roadmap)) {
result.roadmap = data.roadmap.map((r: any, index: number) => ({
title: String(r.title || "Task"),
description: String(r.description || ""),
order: typeof r.order === "number" ? r.order : index,
dependsOn: Array.isArray(r.dependsOn) ? r.dependsOn : [],
}));
}

// Suggestions
if (data.suggestions && Array.isArray(data.suggestions)) {
result.suggestions = data.suggestions.map((s: any) => 
typeof s === "string" ? s : String(s.text || s.description || "")
);
}

// Observations
if (data.observations) {
result.observations = String(data.observations);
}

result.raw = JSON.stringify(data, null, 2);
return result;
}

private static parseMarkdown(content: string): ParsedAnalysis {
const result: ParsedAnalysis = {
modules: [],
risks: [],
roadmap: [],
suggestions: [],
};

// Extract MODULES section
const modulesMatch = content.match(/##?\s*MODULES?[\s\S]*?(?=##|$)/i);
if (modulesMatch) {
const moduleBlocks = modulesMatch[0].split(/###?\s+/);
for (const block of moduleBlocks) {
const nameMatch = block.match(/(?:^|\n)([^#\n]+)/);
if (nameMatch && nameMatch[1].trim()) {
const name = nameMatch[1].trim().replace(/\*\*/g, "");
if (name.toLowerCase() !== "modules") {
result.modules.push({
name,
description: "",
status: "PLANNED",
files: [],
dependsOn: [],
});
}
}
}
}

return result;
}
}
