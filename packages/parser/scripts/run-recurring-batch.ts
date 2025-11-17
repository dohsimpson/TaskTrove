#!/usr/bin/env node
/**
 * Run the parser CLI against a list of recurring patterns.
 *
 * Usage:
 *   pnpm --filter @tasktrove/parser recurring:batch -- --input ./scripts/recurring-patterns-example.txt --output ./recurring-results.txt
 *
 * The input file must contain pipe-delimited rows in the format:
 *   pattern=<label>|<task text to parse>
 * Lines starting with '#' and blank lines are ignored.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(__filename);
const packageRoot = path.resolve(scriptsDir, "..");
const cliEntry = path.resolve(packageRoot, "src/cli.ts");

type BatchEntry = {
  label: string;
  input: string;
  line: number;
};

const args = process.argv.slice(2);

function getArgValue(flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

const inputPath =
  (getArgValue("--input") &&
    path.resolve(process.cwd(), getArgValue("--input") as string)) ||
  path.resolve(scriptsDir, "recurring-patterns-example.txt");

const outputPath =
  (getArgValue("--output") &&
    path.resolve(process.cwd(), getArgValue("--output") as string)) ||
  path.resolve(process.cwd(), "recurring-cli-results.txt");

if (!existsSync(inputPath)) {
  console.error(
    `[recurring-batch] Input file not found: ${inputPath}\n` +
      "Provide one with --input or copy scripts/recurring-patterns-example.txt.",
  );
  process.exit(1);
}

function parseEntries(filePath: string): BatchEntry[] {
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  const entries: BatchEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const [patternPart, inputPart] = trimmed.split("|", 2);
    if (!inputPart) {
      throw new Error(
        `Invalid line ${i + 1}: expected "pattern=<label>|<task text>"`,
      );
    }

    const label = patternPart.replace(/^pattern=/i, "").trim();
    const input = inputPart.trim();

    if (!label) {
      throw new Error(`Invalid line ${i + 1}: missing pattern label.`);
    }
    if (!input) {
      throw new Error(`Invalid line ${i + 1}: missing task text.`);
    }

    entries.push({ label, input, line: i + 1 });
  }

  return entries;
}

let entries: BatchEntry[] = [];
try {
  entries = parseEntries(inputPath);
} catch (error) {
  console.error(`[recurring-batch] ${(error as Error).message}`);
  process.exit(1);
}

if (entries.length === 0) {
  console.error(
    "[recurring-batch] No runnable lines found in the input file. Add entries or remove comments.",
  );
  process.exit(1);
}

console.log(
  `[recurring-batch] Running ${entries.length} pattern(s) from ${inputPath}`,
);

const blocks: string[] = [];
let failures = 0;

for (const entry of entries) {
  console.log(`  • ${entry.label}`);

  const child = spawnSync(
    process.execPath,
    ["--import", "tsx", "--no-warnings", cliEntry, entry.input],
    {
      cwd: packageRoot,
      stdio: "pipe",
      encoding: "utf8",
    },
  );

  if (child.status !== 0) {
    failures += 1;
    console.warn(
      `[recurring-batch] CLI exited with code ${child.status} for "${entry.label}" (line ${entry.line}).`,
    );
  }

  const stdout = child.stdout || "";
  const stderr = child.stderr ? `\n${child.stderr}` : "";
  blocks.push(
    [
      `=== PATTERN: ${entry.label} ===`,
      `Input: ${entry.input}`,
      "",
      stdout.trimEnd(),
      stderr.trimEnd(),
      "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

writeFileSync(outputPath, blocks.join("\n"), "utf8");

console.log(
  `[recurring-batch] Finished with ${failures} failing invocation(s). Results saved to ${outputPath}`,
);

process.exit(failures > 0 ? 1 : 0);
