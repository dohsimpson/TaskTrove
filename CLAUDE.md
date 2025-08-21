# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Private Memory Files

- Read @~/.claude/memory/tasktrove-private-claude.md

## Table of Contents

- [Essential Commands](#essential-commands)
- [Architecture Overview](#architecture-overview)
- [Type System](#type-system)
- [TypeScript Guidelines](#typescript-guidelines)
- [Components Guidelines](#components-guidelines)
- [API](#api)
- [Tools](#tools)
- [Troubleshooting](#troubleshooting)

## Essential Commands

**Development:**

- `pnpm lint` - Run ESLint
- `pnpm run check` - Runs type check, lint, and all tests in sequence
- `pnpm run typecheck` - Type checking
- `pnpm test:file <file-path>` - **PREFERRED** Run specific test file
- `pnpm test:changed` - **PREFERRED** Run tests for changed files

**Formatting:**

- `prettier --write .` - Format all files (manual)
- Pre-commit hooks automatically format staged files with Prettier

**NEVER run `pnpm dev`** - it blocks indefinitely and should be avoided

**CRITICAL Git Commit Guidelines:**

- **NEVER use `git commit --no-verify`** - this bypasses pre-commit hooks and quality checks
- **ALWAYS ensure all checks pass** before committing (typecheck, lint, tests)
- If pre-commit hooks fail, **FIX THE UNDERLYING ISSUES** rather than bypassing them
- Pre-commit hooks exist to maintain code quality and prevent broken code from entering the repository
- If there are legitimate test failures unrelated to your changes, **ISOLATE AND FIX THEM** first
- Only commit when the codebase is in a clean, working state

**Commit Message Format:**

Follow Conventional Commits Standard: `<type>[scope]: <description>` (e.g., `feat(auth): add OAuth integration`, `fix: resolve memory leak in task loader`).

**Allowed change types:** `build:`, `chore:`, `ci:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`, `fix:`, `feat:`

**Testing:**

- `pnpm test:changed` - **PREFERRED**: Run only tests for changed files (faster feedback during development)
- `pnpm test` - Run all tests once (use for final verification)
- `pnpm test:file <file-path>` - Run specific test file
- `pnpm test:coverage` - Run tests with coverage analysis

## Architecture Overview

**Stack:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Jotai + TanStack Query

**Data Models:**

- `Task` - Core entity with subtasks, comments, labels, projects
- `Project` - Project consists of Sections, tasks are assigned to Projects. A task can be assigned to one project only.
- `Label` - Labels are a way to tag and categorize tasks, they have color and name. A task can have multiple labels.
- `ViewState` - UI preferences per route/project
- `Ordering` - Central store for project / label ordering.

**Key Patterns:**

- Atoms in `/lib/atoms/core/` for data, `/lib/atoms/ui/` for UI state
- Action atoms for mutations (e.g., `addTaskAtom`, `updateProjectAtom`)
- Derived atoms for computed values (filters, counts)
- Hook-based access to atoms in `hooks/`

**Important Implementation Details:**

- All state changes go through Jotai atoms (no direct mutations)
- Tasks support complex metadata (priority 1-4, recurring, attachments)
- View states persist per route and respect project context
- Error handling via graceful atom fallbacks

**External Libraries:**

- **ALWAYS research extensively first** - never rely on your own knowledge (may be outdated/wrong)
- Search: official docs, GitHub issues, Stack Overflow, release notes
- Verify API compatibility with exact package.json versions

**Planning:**

- **For non-trivial changes, write plans/PLAN-XYZ.md** (e.g. plans/PLAN-refactor-task-list.md) and ask user to review before implementing
- If user asks for revision, ask clarification questions, then revise and ask for review again

**Implementation Guidelines:**

- **Always think hard before implementing** - plan thoroughly and consider edge cases
- Review existing patterns and architecture before starting
- **Consult ambiguity with users before implementing** - don't make assumptions
- **Prefer clean and maintainable code** over clever solutions
- **Refactor early and often** to maintain code quality
- **Don't repeat yourself** - extract common patterns and components instead of duplicating code

**Dependencies Note:**

- Uses latest versions of React/Next.js
- Extensive Radix UI component library
- Vitest + React Testing Library for testing
- pnpm as package manager

**Testing Guidelines:**

- All components (excluding shadcn/ui) should have comprehensive tests
- **Coverage requirements**: Branch 85%+, Function 80%+, Line 90%+ for tested components
- Run tests and coverage after any component changes

## Type System

**Location**: All types defined in `lib/types/index.ts` - single source of truth for the entire application

**Structure**: File organized in sections:

- All IDs are defined as branded types (TaskId, ProjectId, etc.) with UUID validation using Zod's brand() method
- Core schemas (`TaskSchema`, `ProjectSchema`, `LabelSchema`, `DataFileSchema`, etc.)
- Extended types (analytics, teams, notifications, API contracts)
- Type guards and validation utilities
- Zod-first with TypeScript types generated via `z.infer<>`

**`lib/types/index.ts`**

- The file follows a clear structure: constants → core schemas → generated types → extended features → API contracts.

## TypeScript Guidelines

**Strict Type Safety (Non-Negotiable Rules):**

- **NEVER use `any` type** - if you need dynamic typing, use `unknown` and narrow with type guards
- **NEVER use non-null assertion** - never use `!` or `!!`, add conditional checks instead
- **NEVER use `@ts-ignore`** without detailed explanatory comments explaining why it's necessary
- **NEVER use type assertions (`as`)** unless absolutely necessary - fix the underlying type issue instead
- **NEVER use less strict fallback values** to satisfy the typechecker (e.g., `as any`, `!`, optional chaining when not needed)
- **NEVER use fallback values** - they lead to hard-to-find bugs
- **NEVER disable ESLint TypeScript rules** - fix the underlying issues instead

**Explicit Typing Requirements:**

- **ALWAYS explicitly type function parameters and return types** - don't rely solely on inference
- **ALWAYS type object literals** in complex scenarios
- **ALWAYS prefer strict types** - fix the underlying issue rather than weakening types
- **ALWAYS use branded types** for domain-specific values (e.g., `TaskId`, `ProjectId`) - these provide type safety at compile time

**Runtime Safety & Validation:**

- **ALWAYS use Zod schemas** from `lib/types/index.ts` for runtime validation
- **ALWAYS generate TypeScript types** from Zod schemas using `z.infer<>`
- **ALWAYS validate external data** at runtime boundaries (API responses, user input)
- **NEVER trust external data** without validation

**Modern TypeScript Patterns:**

- **USE `unknown` instead of `any`** for truly dynamic data, then narrow with type guards
- **USE utility types** (`Partial`, `Required`, `Pick`, `Omit`, `Record`) for type transformations
- **USE `readonly` modifiers** for immutable data structures
- **USE `const` assertions** for literal types when appropriate
- **PREFER union types over enums** for better type safety
- **PREFER specific types over generic ones** (e.g., `ViewId` over `string`)

**Type Organization:**

- **CENTRALIZE types** in `lib/types/index.ts` as single source of truth
- **DOCUMENT complex types** with JSDoc comments
- **ORGANIZE by domain/feature** rather than technical grouping
- If types don't match, fix the data/logic, don't weaken the types

## Components Guidelines

**Directory Structure:**

```
components/
├── ui/                   # Shadcn UI primitives (read-only directory, put new ui components in ui/custom/)
├── ui/custom/            # TaskTrove-specific UI extensions
├── [feature]/            # Feature components (task/, navigation/, analytics/)
├── dialogs/              # Centralized modal management
└── debug/                # Development utilities
```

**Component Patterns:**

- **Naming**: kebab-case files (`task-item.tsx`), PascalCase components (`TaskItem`)
- **Props**: `ComponentNameProps` interface pattern
- **Tests**: Co-located `.test.tsx` files (required for all components)
- **Exports**: Named exports only - no default exports

**Standard Implementation Pattern:**

```typescript
"use client"

// External imports first
import React, { useState } from "react"
import { useAtomValue, useSetAtom } from "jotai"

// UI components
import { Button } from "@/components/ui/button"

// Types and atoms
import type { Task } from "@/lib/types"
import { tasksAtom, updateTaskAtom } from "@/lib/atoms"

interface ComponentNameProps {
  taskId: string
  variant?: "default" | "compact"
  className?: string
}

export function ComponentName({ taskId, variant = "default" }: ComponentNameProps) {
  // Hooks first, atoms second, derived state third
  const tasks = useAtomValue(tasksAtom)
  const task = tasks.find(t => t.id === taskId)

  if (!task) return null

  return <div>Component content</div>
}
```

**Key Rules:**

- **NEVER modify** `components/ui/` shadcn components - create custom variants in `ui/custom/`
- **Feature components** go in domain directories (`task/`, `navigation/`, `analytics/`)
- **Centralize dialogs** in `components/dialogs/`
- **Access state via atoms** - avoid prop drilling through props
- **Follow DRY Principle** - refactor common patterns into reusable components

**Component Organization:**

- Place shared utilities in appropriate feature directories or extract to `lib/`
- Keep components focused and single-responsibility
- Use composition patterns for complex interactions

## API

**Location:** Next.js App Router RESTful API routes under `/app/api/`, grouped by features

**Architecture Patterns:**

- Zod schema validation for all request/response data with automatic datetime conversion
- Centralized error handling with standardized response formatting
- Performance and operation logging middleware for all endpoints
- Business event tracking for analytics and monitoring

**Testing API Routes:**

- Use `curl` for quick API testing: `curl -X POST http://localhost:[PORT]/api/tasks -H "Content-Type: application/json" -d '{"title":"Test task"}'`
- `[PORT]` is dependent on which directory you're in. If you're in `agent3`, it's `4003`.
- Never run `pnpm dev` - it blocks indefinitely. If the server is not running, just skip this step and let the user know

## Tools

**TypeScript MCP (Language Server Protocol):**
Claude has access to LSP tools for enhanced code analysis and navigation:

- `get_hover` - Get type signatures and documentation for symbols
- `find_references` - Find all references to a symbol across the codebase
- `get_definitions` - Navigate to symbol definitions
- `get_diagnostics` - Get errors/warnings for specific files
- `get_all_diagnostics` - Get project-wide diagnostics
- `rename_symbol` - Rename a symbol across the codebase
- `delete_symbol` - Delete a symbol and optionally all its references
- `get_document_symbols` - List all symbols in a document
- `get_workspace_symbols` - Search symbols across the workspace
- `get_signature_help` - Get parameter hints for function calls
- `get_code_actions` - Get available code actions at a position
- `format_document` - Format an entire document
- `check_capabilities` - Check which LSP features are supported

These tools provide IDE-level capabilities for code analysis, navigation, and debugging.

**GitHub CLI:**
GitHub CLI (gh) is already set up and available for code search operations on public repositories:

- Use `gh search code` to search code across public GitHub repositories
- Useful for researching external libraries, usage patterns, etc.
- Follow up with url fetch tool to look at the code directly
- Example: `gh search code "useAtom" "atom(" extension:tsx extension:ts org:pmndrs user:dai-shi --limit 30` to find advanced Jotai patterns combining atom definitions with useAtom hooks in TypeScript React files from Jotai maintainers
- Note: `language:typescript` does not include .tsx files. For both TypeScript and TSX files, use `extension:ts extension:tsx`

NOTE: cache might need to be invalidated after change, see Troubleshooting section

## Troubleshooting

- Use `pnpm run typecheck` for syntax error troubleshooting
- Run type checking and linting after any changes
- Use `forceRefresh: true` in `get_diagnostics` calls to invalidate cache if getting stale errors from typescript lsp
