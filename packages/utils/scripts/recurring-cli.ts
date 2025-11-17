#!/usr/bin/env node
/**
 * Simple CLI to inspect recurring task calculations.
 *
 * Example:
 * pnpm --filter @tasktrove/utils recurring:cli -- \
 *   --rrule "RRULE:FREQ=MONTHLY;BYDAY=MO;BYSETPOS=1" \
 *   --due 2024-01-15T10:00:00 \
 *   --mode completedAt \
 *   --completedAt 2024-01-15T12:30:00 \
 *   --list 3
 */

import {
  calculateNextDueDate,
  getRecurringReferenceDate,
} from "../src/recurring-task-processor";

type RecurringMode = "dueDate" | "completedAt" | "autoRollover";

interface CLIOptions {
  rrule?: string;
  due?: string;
  completedAt?: string;
  mode?: RecurringMode;
  includeFromDate?: boolean;
  list?: number;
  from?: string;
  json?: boolean;
  help?: boolean;
}

function parseArgs(argv: string[]): CLIOptions {
  const opts: CLIOptions = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token || token === "--") {
      continue;
    }
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    switch (key) {
      case "rrule":
      case "due":
      case "completedAt":
      case "mode":
      case "list":
      case "from":
        if (!next || next.startsWith("--")) {
          throw new Error(`Missing value for --${key}`);
        }
        if (key === "list") {
          opts.list = Number(next);
        } else if (key === "rrule") {
          opts.rrule = next;
        } else if (key === "due") {
          opts.due = next;
        } else if (key === "completedAt") {
          opts.completedAt = next;
        } else if (key === "mode") {
          if (
            next === "dueDate" ||
            next === "completedAt" ||
            next === "autoRollover"
          ) {
            opts.mode = next;
          } else {
            throw new Error(
              `Invalid mode: ${next}. Must be: dueDate, completedAt, or autoRollover`,
            );
          }
        } else {
          opts.from = next;
        }
        i++;
        break;
      case "include":
      case "includeFromDate":
        opts.includeFromDate = true;
        break;
      case "json":
        opts.json = true;
        break;
      case "help":
        opts.help = true;
        break;
      default:
        throw new Error(`Unknown flag --${key}`);
    }
  }
  return opts;
}

function printUsage(): void {
  console.log(`\nUsage:\n  pnpm --filter @tasktrove/utils recurring:cli -- \
    --rrule "RRULE:FREQ=DAILY" --due 2024-01-15T09:00:00 [options]\n\nOptions:\n  --rrule <string>        RRULE expression (must include RRULE: prefix)\n  --due <date>            Base due date (YYYY-MM-DD or ISO date-time)\n  --mode <mode>           recurringMode: dueDate | completedAt | autoRollover\n  --completedAt <date>    Completion timestamp when mode=completedAt\n  --from <date>           Override the reference date (skips recurringMode logic)\n  --includeFromDate       Treat the reference date as a valid occurrence\n  --list <n>              Generate N sequential occurrences (default 1)\n  --json                  Output JSON instead of formatted text\n  --help                  Show this message\n`);
}

function parseDate(value: string | undefined, label: string): Date | undefined {
  if (!value) return undefined;
  const date = value.match(/^\d{4}-\d{2}-\d{2}$/)
    ? new Date(
        Number(value.slice(0, 4)),
        Number(value.slice(5, 7)) - 1,
        Number(value.slice(8, 10)),
      )
    : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${label} date: ${value}`);
  }
  return date;
}

function formatOccurrence(date: Date): string {
  return `${date.toISOString()} (local: ${date.toLocaleString()})`;
}

function main(): void {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.help) {
      printUsage();
      return;
    }

    if (!opts.rrule || !opts.rrule.startsWith("RRULE:")) {
      throw new Error("--rrule is required and must start with 'RRULE:'");
    }
    if (!opts.due) {
      throw new Error("--due is required");
    }

    const dueDate = parseDate(opts.due, "due");
    if (!dueDate) {
      throw new Error("Unable to parse --due value");
    }

    const completedAt = parseDate(opts.completedAt, "completedAt");
    const explicitFrom = parseDate(opts.from, "from");

    const recurringMode = opts.mode ?? "dueDate";
    if (
      !(["dueDate", "completedAt", "autoRollover"] as const).includes(
        recurringMode,
      )
    ) {
      throw new Error("--mode must be dueDate, completedAt, or autoRollover");
    }

    const listCount = opts.list && opts.list > 0 ? Math.floor(opts.list) : 1;

    const anchor = explicitFrom
      ? explicitFrom
      : getRecurringReferenceDate(dueDate, recurringMode, completedAt);

    const occurrences: Date[] = [];
    let cursor = anchor;
    let includeFlag = Boolean(opts.includeFromDate);

    for (let i = 0; i < listCount; i++) {
      const next = calculateNextDueDate(opts.rrule, cursor, includeFlag);
      if (!next) break;
      occurrences.push(next);
      cursor = next;
      includeFlag = false;
    }

    if (occurrences.length === 0) {
      console.log(
        "No further occurrences (possibly due to COUNT/UNTIL constraints).",
      );
      process.exit(0);
    }

    if (opts.json) {
      console.log(
        JSON.stringify(
          {
            reference: anchor.toISOString(),
            includeFromDate: Boolean(opts.includeFromDate),
            occurrences: occurrences.map((date, index) => ({
              index: index + 1,
              iso: date.toISOString(),
              local: date.toLocaleString(),
            })),
          },
          null,
          2,
        ),
      );
      return;
    }

    console.log("Recurring Task Inspector\n");
    console.log(`RRULE:     ${opts.rrule}`);
    console.log(`Mode:      ${recurringMode}`);
    console.log(`Due Date:  ${formatOccurrence(dueDate)}`);
    if (completedAt) {
      console.log(`Completed: ${formatOccurrence(completedAt)}`);
    }
    console.log(
      `Reference: ${formatOccurrence(anchor)}${opts.from ? " (override)" : ""}`,
    );
    console.log(`Include from date: ${Boolean(opts.includeFromDate)}`);
    console.log("\nNext occurrences:");
    occurrences.forEach((date, index) => {
      console.log(`  #${index + 1}: ${formatOccurrence(date)}`);
    });
  } catch (error) {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    printUsage();
    process.exit(1);
  }
}

main();
