# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Private Memory Files

- Read @~/.claude/memory/tasktrove-private-claude.md

## Table of Contents

- [Monorepo Structure](#monorepo-structure)
- [Essential Commands](#essential-commands)
- [Architecture Overview](#architecture-overview)
- [Type System](#type-system)
- [TypeScript Guidelines](#typescript-guidelines)
- [Components Guidelines](#components-guidelines)
- [API](#api)
- [Tools](#tools)
- [Troubleshooting](#troubleshooting)

## Monorepo Structure

**Architecture:** Turborepo monorepo with JIT (Just-In-Time) packages - TypeScript files imported directly without build step.

**Workspace Layout:**

```
TaskTrove-agent4/
├── apps/
│   └── web/              # Main Next.js application (was root before migration)
└── packages/
    ├── atoms/            # @tasktrove/atoms - Jotai state management
    ├── types/            # @tasktrove/types - Zod schemas & TypeScript types
    ├── constants/        # @tasktrove/constants - Shared constants
    ├── utils/            # @tasktrove/utils - Utility functions
    ├── eslint-config/    # @repo/eslint-config - Shared ESLint rules
    └── typescript-config/ # @repo/typescript-config - Shared TypeScript configs
```

**Key Concepts:**

- **JIT Packages**: All `@tasktrove/*` packages use direct TypeScript imports (no transpilation)
- **Workspace Protocol**: Internal packages linked via `workspace:*` in package.json
- **Catalog Versioning**: Shared dependency versions managed in `pnpm-workspace.yaml`
- **Turborepo Tasks**: Orchestrates `typecheck`, `lint`, `test`, `build` across workspace with dependency graph
- **tsgo**: Uses TypeScript native compiler for type checking (not `tsc`)

**Import Patterns:**

```typescript
// Direct package imports (recommended in packages/)
import { Task, TaskSchema } from "@tasktrove/types";
import { tasksAtom, addTaskAtom } from "@tasktrove/atoms";
import { DEFAULT_TASK_PRIORITY } from "@tasktrove/constants";
import { cn, getContrastColor } from "@tasktrove/utils";

// Web app re-exports (backward compatible, used in apps/web)
import { Task } from "@/lib/types"; // Re-exports @tasktrove/types
import { tasksAtom } from "@/lib/atoms"; // Re-exports @tasktrove/atoms
import { cn } from "@/lib/utils"; // Re-exports @tasktrove/utils
```

**Running Commands:**

- Root commands execute across all packages: `pnpm typecheck`, `pnpm lint`, `pnpm test`
- Package-specific: `pnpm --filter=web test` or `cd apps/web && pnpm test`
- Turborepo caches results and runs tasks in dependency order

## Essential Commands

**Note:** Commands run from **monorepo root** unless specified otherwise.

**Development:**

- `pnpm lint` - Run ESLint across all packages
- `pnpm run check` - Runs type check, lint, and all tests in sequence (all packages)
- `pnpm run typecheck` - Type checking across all packages
- `pnpm test:file <file-path>` - **PREFERRED** Run specific test file
- `pnpm test:changed` - **PREFERRED** Run tests for changed files
- `pnpm --filter=web test` - Run tests only in web app
- `pnpm --filter=@tasktrove/atoms test` - Run tests in specific package

**Package Management:**

- `pnpm install` - Install dependencies for all packages (from monorepo root)
- `pnpm add <package> --filter=web` - Add dependency to specific package
- Shared dependencies managed via `catalog:` in `pnpm-workspace.yaml`

**Package Versioning:**

- **NEVER pin versions directly** in `package.json` files (e.g., `"react": "^19.1.1"`)
- **ALWAYS use catalog:** for shared dependencies to ensure consistency across workspace
- **Correct**: `"react": "catalog:"` in package.json, version defined once in `pnpm-workspace.yaml`
- **Why**: Prevents version conflicts, ensures all packages use identical versions
- To add new dependency:
  1. Add version to `catalog:` section in `pnpm-workspace.yaml`
  2. Reference with `"package-name": "catalog:"` in package.json
  3. Run `pnpm install` to sync

**Formatting:**

- `prettier --write .` - Format all files from root (manual)
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

**Stack:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Jotai + TanStack Query + Turborepo

**Monorepo Packages:**

- `@tasktrove/types` - Zod schemas and TypeScript types (single source of truth)
- `@tasktrove/atoms` - Jotai atoms for state management (core/ and ui/ subdirectories)
- `@tasktrove/constants` - Shared constants and defaults
- `@tasktrove/utils` - Utility functions (validation, styling, time, color, etc.)
- `@repo/eslint-config` - Shared ESLint configuration
- `@repo/typescript-config` - Shared TypeScript configuration
- `apps/web` - Main Next.js application (re-exports packages for backward compatibility)

**Data Models:**

- `Task` - Core entity with subtasks, comments, labels, projects
- `Project` - Project consists of Sections, tasks are assigned to Projects. A task can be assigned to one project only.
- `Label` - Labels are a way to tag and categorize tasks, they have color and name. A task can have multiple labels.
- `ViewState` - UI preferences per route/project
- `Ordering` - Central store for project / label ordering.

**Key Patterns:**

- Atoms in `packages/atoms/src/core/` for data, `packages/atoms/src/ui/` for UI state
- Action atoms for mutations (e.g., `addTaskAtom`, `updateProjectAtom`)
- Derived atoms for computed values (filters, counts)
- Hook-based access to atoms in `apps/web/hooks/`
- Web app re-exports packages via `apps/web/lib/` for backward compatibility

**Important Implementation Details:**

- All state changes go through Jotai atoms (no direct mutations)
- Tasks support complex metadata (priority 1-4, recurring, attachments)
- View states persist per route and respect project context
- Error handling via graceful atom fallbacks
- **JIT compilation** - packages imported directly without build step

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
- pnpm as package manager with workspaces

**Testing Guidelines:**

- All components (excluding shadcn/ui) should have comprehensive tests
- **Coverage requirements**: Branch 85%+, Function 80%+, Line 90%+ for tested components
- Run tests and coverage after any component changes
- Each package has its own test suite

## Type System

**Location**: All types defined in `packages/types/src/index.ts` - single source of truth exported as `@tasktrove/types`

**Package Structure:**

- `packages/types/src/index.ts` - Main type definitions (76KB+, comprehensive Zod schemas)
- `packages/types/src/defaults.ts` - Default values for entities
- `apps/web/lib/types/index.ts` - Re-exports `@tasktrove/types` for backward compatibility

**Structure**: File organized in sections:

- All IDs are defined as branded types (TaskId, ProjectId, etc.) with UUID validation using Zod's brand() method
- Core schemas (`TaskSchema`, `ProjectSchema`, `LabelSchema`, `DataFileSchema`, etc.)
- Extended types (analytics, teams, notifications, API contracts)
- Type guards and validation utilities
- Zod-first with TypeScript types generated via `z.infer<>`

**Usage:**

```typescript
// In packages - use direct imports
import { Task, TaskSchema, TaskId } from "@tasktrove/types";
import { DEFAULT_TASK_PRIORITY } from "@tasktrove/constants";

// In apps/web - can use either direct or re-export
import { Task, TaskSchema } from "@tasktrove/types"; // Preferred
import { Task } from "@/lib/types"; // Backward compatible
```

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

- **ALWAYS use Zod schemas** from `@tasktrove/types` for runtime validation
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

- **CENTRALIZE types** in `@tasktrove/types` package as single source of truth
- **DOCUMENT complex types** with JSDoc comments
- **ORGANIZE by domain/feature** rather than technical grouping
- If types don't match, fix the data/logic, don't weaken the types
- Constants belong in `@tasktrove/constants`, not in type definitions

**Working with Branded ID Types:**

TaskTrove uses branded types (TaskId, ProjectId, etc.) with strict Zod UUID validation. Common mistakes to avoid:

- **NEVER use plain strings** where branded IDs are expected (e.g., `"some-id"` instead of `TaskId`)
- **NEVER create UUIDs manually** - they must conform to Zod's strict UUID regex:
  - 3rd segment must start with `1-8` (version bits)
  - 4th segment must start with `8`, `9`, `a`, or `b` (variant bits)
  - Example VALID: `12345678-1234-4234-8234-123456789abc` (note the `4` and `8`)
  - Example INVALID: `12345678-1234-1234-1234-123456789abc` (wrong version/variant bits)

**Correct approaches:**

```typescript
// Production code - use create* functions
import { createTaskId, createProjectId } from "@tasktrove/types";
const taskId = createTaskId("12345678-1234-4234-8234-123456789abc");
const projectId = createProjectId("87654321-4321-4321-8321-210987654321");

// Tests - use pre-defined constants (PREFERRED)
import { TEST_TASK_ID_1, TEST_PROJECT_ID_1 } from "@/lib/utils/test-constants";
const task = { id: TEST_TASK_ID_1, title: "Test task" };

// Generate new IDs at runtime
import { v4 as uuidv4 } from "uuid";
const newTaskId = createTaskId(uuidv4()); // uuid library generates proper v4 UUIDs
```

**Available create\* functions** (in `@tasktrove/types`):

- `createTaskId`, `createProjectId`, `createLabelId`, `createSubtaskId`
- `createCommentId`, `createUserId`, `createSectionId`, `createGroupId`
- See `packages/types/src/index.ts` lines 117-137 for complete list

## Components Guidelines

**Location**: All components in `apps/web/components/` (not extracted to packages)

**Directory Structure:**

```
apps/web/components/
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

- Place shared utilities in `apps/web/lib/` or extract to `@tasktrove/utils` package
- Keep components focused and single-responsibility
- Use composition patterns for complex interactions
- UI components stay in `apps/web/components/` - only extract logic/utilities to packages

## API

**Location:** Next.js App Router RESTful API routes in `apps/web/app/api/`, grouped by features

**Architecture Patterns:**

- Zod schema validation for all request/response data with automatic datetime conversion (uses `@tasktrove/types`)
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
