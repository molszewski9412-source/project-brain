/**
 * JSONResponseParser - Robust parser for AI JSON responses
 * Handles various formats and edge cases
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
	/**
	 * Parse AI response - tries JSON first, then falls back to text parsing
	 */
	static parse(content: string): ParsedAnalysis {
		// Clean up the content
		const cleaned = this.cleanContent(content);

		// Try to find and parse JSON
		const jsonResult = this.tryParseJSON(cleaned);
		if (jsonResult) {
			return jsonResult;
		}

		// Fallback to text parsing
		return this.parseText(cleaned);
	}

	/**
	 * Clean content - remove markdown code blocks, etc.
	 */
	private static cleanContent(content: string): string {
		return content
			// Remove markdown code blocks
			.replace(/```(?:json)?\s*([\s\S]*?)```/gi, "$1")
			// Remove leading/trailing whitespace
			.trim();
	}

	/**
	 * Try to find and parse JSON in the content
	 */
	private static tryParseJSON(content: string): ParsedAnalysis | null {
		// Strategy 1: Look for JSON object with known keys
		const jsonMatch = content.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			try {
				const parsed = JSON.parse(jsonMatch[0]);
				return this.normalizeParsedData(parsed);
			} catch {
				// Continue with other strategies
			}
		}

		// Strategy 2: Try to find JSON array of modules
		const arrayMatch = content.match(/\[[\s\S]*\]/);
		if (arrayMatch) {
			try {
				const parsed = JSON.parse(arrayMatch[0]);
				if (Array.isArray(parsed) && parsed.length > 0) {
					return this.normalizeParsedData({ modules: parsed });
				}
			} catch {
				// Continue
			}
		}

		return null;
	}

	/**
	 * Normalize parsed JSON to our standard format
	 */
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
		if (data.projectName || data.project_name) {
			result.projectName = data.projectName || data.project_name;
		}

		// Modules
		if (data.modules && Array.isArray(data.modules)) {
			result.modules = data.modules.map((m: any) => ({
				name: this.extractString(m.name || m.module_name || m.title || "Unknown"),
				description: this.extractString(m.description || m.desc || ""),
				status: this.normalizeStatus(m.status || "PLANNED"),
				files: Array.isArray(m.files) ? m.files : [],
				dependsOn: Array.isArray(m.dependsOn || m.depends_on) 
					? m.dependsOn || m.depends_on 
					: [],
			}));
		} else if (data.components && Array.isArray(data.components)) {
			result.modules = data.components.map((m: any) => ({
				name: this.extractString(m.name || "Unknown"),
				description: this.extractString(m.description || ""),
				status: this.normalizeStatus(m.status || "PLANNED"),
				files: [],
				dependsOn: [],
			}));
		}

		// Risks
		if (data.risks && Array.isArray(data.risks)) {
			result.risks = data.risks.map((r: any) => ({
				title: this.extractString(r.title || r.name || "Risk"),
				description: this.extractString(r.description || r.desc || ""),
				severity: this.normalizeSeverity(r.severity || r.level || "MEDIUM"),
				mitigation: r.mitigation ? this.extractString(r.mitigation) : undefined,
			}));
		} else if (data.issues && Array.isArray(data.issues)) {
			result.risks = data.issues.map((r: any) => ({
				title: this.extractString(r.title || "Issue"),
				description: this.extractString(r.description || ""),
				severity: this.normalizeSeverity(r.severity || "MEDIUM"),
			}));
		}

		// Roadmap
		if (data.roadmap && Array.isArray(data.roadmap)) {
			result.roadmap = data.roadmap.map((r: any, index: number) => ({
				title: this.extractString(r.title || r.name || "Task"),
				description: this.extractString(r.description || r.desc || ""),
				order: typeof r.order === "number" ? r.order : index,
				dependsOn: Array.isArray(r.dependsOn || r.depends_on) 
					? r.dependsOn || r.depends_on 
					: [],
			}));
		} else if (data.tasks && Array.isArray(data.tasks)) {
			result.roadmap = data.tasks.map((r: any, index: number) => ({
				title: this.extractString(r.title || "Task"),
				description: this.extractString(r.description || ""),
				order: typeof r.order === "number" ? r.order : index,
				dependsOn: [],
			}));
		}

		// Suggestions
		if (data.suggestions && Array.isArray(data.suggestions)) {
			result.suggestions = data.suggestions.map((s: any) => 
				this.extractString(typeof s === "string" ? s : s.text || s.description || "")
			);
		} else if (data.recommendations && Array.isArray(data.recommendations)) {
			result.suggestions = data.recommendations.map((s: any) =>
				this.extractString(typeof s === "string" ? s : s.text || s.description || "")
			);
		}

		// Observations
		if (data.observations || data.OBSERVATIONS) {
			result.observations = this.extractString(data.observations || data.OBSERVATIONS);
		}

		// Facts
		if (data.facts || data.FACTS) {
			result.facts = this.extractString(data.facts || data.FACTS);
		}

		// Raw for debugging
		result.raw = JSON.stringify(data, null, 2);

		return result;
	}

	/**
	 * Parse text/markdown response as fallback
	 */
	private static parseText(content: string): ParsedAnalysis {
		const result: ParsedAnalysis = {
			modules: [],
			risks: [],
			roadmap: [],
			suggestions: [],
		};

		// Extract sections
		const sections = this.extractSections(content);

		// Parse modules section
		if (sections.modules) {
			result.modules = this.parseModulesSection(sections.modules);
		}

		// Parse risks section
		if (sections.risks) {
			result.risks = this.parseListSection(sections.risks).map((item) => ({
				title: item.replace(/^\d+\.\s*/, "").trim(),
				description: "",
				severity: "MEDIUM" as const,
			}));
		}

		// Parse roadmap section
		if (sections.roadmap) {
			result.roadmap = this.parseListSection(sections.roadmap).map((item, index) => ({
				title: item.replace(/^\d+\.\s*/, "").trim(),
				description: "",
				order: index,
			}));
		}

		// Parse suggestions section
		if (sections.suggestions) {
			result.suggestions = this.parseListSection(sections.suggestions);
		}

		// Parse observations
		if (sections.observations) {
			result.observations = sections.observations.trim();
		}

		return result;
	}

	/**
	 * Extract sections from markdown content
	 */
	private static extractSections(content: string): Record<string, string> {
		const sections: Record<string, string> = {};
		const sectionPatterns = [
			/(?:##|###)\s*(?:MODULES|COMPONENTS|🧩\s*MODULES?)[\s\S]*?(?=(?:##|###)\s*\w+|$)/gi,
			/(?:##|###)\s*(?:RISKS|⚠️?\s*RISKS?)[\s\S]*?(?=(?:##|###)\s*\w+|$)/gi,
			/(?:##|###)\s*(?:ROADMAP|📋\s*ROADMAP?)[\s\S]*?(?=(?:##|###)\s*\w+|$)/gi,
			/(?:##|###)\s*(?:SUGGESTIONS|💡?\s*SUGGESTIONS?|RECOMMENDATIONS)[\s\S]*?(?=(?:##|###)\s*\w+|$)/gi,
			/(?:##|###)\s*(?:OBSERVATIONS|FACTS)[\s\S]*?(?=(?:##|###)\s*\w+|$)/gi,
		];
		const sectionNames = ["modules", "risks", "roadmap", "suggestions", "observations"];

		for (let i = 0; i < sectionPatterns.length; i++) {
			const match = content.match(sectionPatterns[i]);
			if (match) {
				sections[sectionNames[i]] = match[0];
			}
		}

		return sections;
	}

	/**
	 * Parse modules from section text
	 */
	private static parseModulesSection(section: string): ParsedAnalysis["modules"] {
		const modules: ParsedAnalysis["modules"] = [];

		// Split by module headers
		const blocks = section.split(/(?:###|##)\s+/).filter(Boolean);

		for (const block of blocks) {
			const lines = block.trim().split("\n");
			if (lines.length === 0) continue;

			let name = "";
			let description = "";
			let status = "PLANNED";

			for (const line of lines) {
				// Try NAME pattern
				const nameMatch = line.match(/NAME[:\s]+(.+)/i);
				if (nameMatch) {
					name = nameMatch[1].trim().replace(/\*\*/g, "");
					continue;
				}

				// Try ### or ## header at start (first line)
				if (!name && (line.startsWith("###") || line.startsWith("##"))) {
					name = line.replace(/^#{1,3}\s*/, "").replace(/\*\*/g, "").trim();
					continue;
				}

				// Try DESCRIPTION pattern
				const descMatch = line.match(/DESCRIPTION[:\s]+(.+)/i);
				if (descMatch) {
					description = descMatch[1].trim().replace(/\*\*/g, "");
					continue;
				}

				// Try STATUS pattern
				const statusMatch = line.match(/STATUS[:\s]+(.+)/i);
				if (statusMatch) {
					status = this.normalizeStatus(statusMatch[1].trim());
				}
			}

			if (name && name.toLowerCase() !== "modules") {
				modules.push({
					name,
					description,
					status,
					files: [],
					dependsOn: [],
				});
			}
		}

		return modules;
	}

	/**
	 * Parse list items from section
	 */
	private static parseListSection(section: string): string[] {
		return section
			.split("\n")
			.map((line) => line.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "").trim())
			.filter((line) => line.length > 0 && !line.startsWith("#"))
			.map((line) => line.replace(/\*\*/g, ""));
	}

	/**
	 * Extract clean string from various formats
	 */
	private static extractString(value: any): string {
		if (typeof value === "string") {
			return value.replace(/\*\*/g, "").trim();
		}
		if (typeof value === "number") {
			return String(value);
		}
		return "";
	}

	/**
	 * Normalize status values
	 */
	private static normalizeStatus(status: string): string {
		const upper = status.toUpperCase().trim();
		const statusMap: Record<string, string> = {
			IDEA: "IDEA",
			PLANNED: "PLANNED",
			"IN PROGRESS": "IN_PROGRESS",
			INPROGRESS: "IN_PROGRESS",
			PROGRESS: "IN_PROGRESS",
			REVIEW: "REVIEW",
			DONE: "DONE",
			COMPLETE: "DONE",
			COMPLETED: "DONE",
			LOCKED: "LOCKED",
			ARCHIVED: "ARCHIVED",
		};
		return statusMap[upper] || "PLANNED";
	}

	/**
	 * Normalize severity values
	 */
	private static normalizeSeverity(severity: string): string {
		const upper = severity.toUpperCase().trim();
		const severityMap: Record<string, string> = {
			LOW: "LOW",
			MEDIUM: "MEDIUM",
			HIGH: "HIGH",
			CRITICAL: "CRITICAL",
			INFO: "LOW",
			WARNING: "MEDIUM",
			ERROR: "HIGH",
		};
		return severityMap[upper] || "MEDIUM";
	}
}
