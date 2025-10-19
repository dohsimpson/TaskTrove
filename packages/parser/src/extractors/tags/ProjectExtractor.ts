import type { Extractor } from "../base/Extractor";
import type { ExtractionResult, ParserContext } from "../../types";

export class ProjectExtractor implements Extractor {
  readonly name = "project-extractor";
  readonly type = "project";

  extract(text: string, context: ParserContext): ExtractionResult[] {
    const results: ExtractionResult[] = [];
    let projectRegex: RegExp;

    if (context.projects && context.projects.length > 0) {
      // Use dynamic patterns based on actual project names
      const projectNames = context.projects.map((p) =>
        p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      );
      projectRegex = new RegExp(`#(${projectNames.join("|")})`, "gi");
    } else {
      // Fallback to static pattern
      projectRegex = /#(\w+)/g;
    }

    const matches = [...text.matchAll(projectRegex)];

    for (const match of matches) {
      const fullMatch = match[0]; // e.g., "#groceries"
      const projectName = match[1]; // e.g., "groceries"

      if (!projectName) continue;

      // Check if disabled
      if (context.disabledSections?.has(fullMatch.toLowerCase())) {
        continue;
      }

      const startIndex = match.index || 0;

      results.push({
        type: "project",
        value: projectName,
        match: fullMatch,
        startIndex,
        endIndex: startIndex + fullMatch.length,
      });
    }

    return results;
  }
}
