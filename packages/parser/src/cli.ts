#!/usr/bin/env node

import { createInterface } from "node:readline";
import { TaskParser } from "./core/parser";
import type { ParserContext } from "./types";

const parser = new TaskParser();

function formatDate(date?: Date): string {
  if (!date) return "none";
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseAndDisplay(text: string, context?: Partial<ParserContext>): void {
  const fullContext: ParserContext = {
    locale: "en",
    referenceDate: new Date(),
    ...context,
  };

  console.log("\n📝 Input:", text);
  console.log("─".repeat(60));

  const result = parser.parse(text, fullContext);
  const parsed = result.parsed;

  console.log("\n✨ Parsed Result:");
  console.log("  Title:", parsed.title);
  console.log("  Priority:", parsed.priority ? `P${parsed.priority}` : "none");
  console.log("  Project:", parsed.project || "none");
  console.log(
    "  Labels:",
    parsed.labels.length > 0 ? parsed.labels.join(", ") : "none",
  );
  console.log("  Due Date:", formatDate(parsed.dueDate));
  console.log("  Time:", parsed.time || "none");
  console.log("  Duration:", parsed.duration || "none");
  console.log("  Recurring:", parsed.recurring || "none");
  console.log(
    "  Estimation:",
    parsed.estimation ? `${parsed.estimation}min` : "none",
  );

  console.log("\n📊 JSON Output:");
  console.log(JSON.stringify(parsed, null, 2));
  console.log("─".repeat(60));
}

function startInteractiveMode(): void {
  console.log("🎯 TaskTrove Parser CLI - Interactive Mode");
  console.log("Enter task text to parse (or 'exit' to quit)\n");

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "task> ",
  });

  rl.prompt();

  rl.on("line", (line) => {
    const text = line.trim();

    if (text === "exit" || text === "quit") {
      console.log("\n👋 Goodbye!");
      rl.close();
      return;
    }

    if (text === "help") {
      console.log("\n📖 Help:");
      console.log("  - Enter any task text to parse it");
      console.log("  - Type 'exit' or 'quit' to exit");
      console.log("  - Type 'help' to show this message");
      console.log("\n💡 Examples:");
      console.log("  - Buy groceries tomorrow at 3pm #personal");
      console.log("  - P1 Fix bug in @work +urgent due Monday");
      console.log("  - Meeting every Monday at 9am for 1h");
      console.log("  - Submit report next Friday #work ~30min\n");
      rl.prompt();
      return;
    }

    if (text) {
      parseAndDisplay(text);
    }

    rl.prompt();
  }).on("close", () => {
    process.exit(0);
  });
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  startInteractiveMode();
} else {
  const text = args.join(" ");
  parseAndDisplay(text);
}
