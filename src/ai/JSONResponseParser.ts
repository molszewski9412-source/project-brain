/**
 * JSONResponseParser - Robust parser for AI JSON responses
 */

export interface ParsedAnalysis {
projectName?: string;
modules: Array<{ name: string; description: string; status: string; files?: string[]; dependsOn?: string[] }>;
risks: Array<{ title: string; description: string; severity: string; mitigation?: string }>;
roadmap: Array<{ title: string; description: string; order: number; dependsOn?: string[] }>;
suggestions: string[];
observations?: string;
facts?: string;
}

export class JSONResponseParser {
static parse(content: string): ParsedAnalysis {
console.log("=== JSONParser ===");
console.log("Input length:", content.length);

// Clean markdown
let cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
console.log("Cleaned length:", cleaned.length);
console.log("First 100 chars:", cleaned.substring(0, 100));

// Find JSON
const startIdx = cleaned.indexOf("{");
const endIdx = cleaned.lastIndexOf("}");
console.log("Start brace at:", startIdx, "End brace at:", endIdx);

if (startIdx === -1 || endIdx === -1) {
console.log("No braces found!");
return { modules: [], risks: [], roadmap: [], suggestions: [] };
}

const jsonStr = cleaned.substring(startIdx, endIdx + 1);
console.log("JSON string length:", jsonStr.length);
console.log("JSON starts with:", jsonStr.substring(0, 50));

try {
const data = JSON.parse(jsonStr);
console.log("JSON parsed successfully!");
console.log("Has modules?", Array.isArray(data.modules));
console.log("Modules count:", data.modules?.length);

const result = this.normalizeParsedData(data);
console.log("Normalized modules:", result.modules.length);
return result;
} catch (e) {
console.log("JSON parse error:", e);
console.log("Trying first 200 chars of JSON:", jsonStr.substring(0, 200));
}

return { modules: [], risks: [], roadmap: [], suggestions: [] };
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

return result;
}
}
