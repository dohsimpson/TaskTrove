# Testing Strategy Orchestrator Guide

This document provides guidance for the **orchestrator** (main Claude Code instance) when implementing comprehensive React testing across a large codebase. This guide captures lessons learned from successfully implementing testing for 70+ components in the TaskTrove project.

## Table of Contents

1. [Overview](#overview)
2. [Pre-Implementation Setup](#pre-implementation-setup)
3. [Subagent Deployment Strategy](#subagent-deployment-strategy)
4. [Critical Requirements for Subagents](#critical-requirements-for-subagents)
5. [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)
6. [Quality Assurance Process](#quality-assurance-process)
7. [Troubleshooting Failed Tests](#troubleshooting-failed-tests)

## Overview

When implementing comprehensive React testing across a large codebase, the key to success is:

1. **Thorough upfront setup** - Get the infrastructure right before deploying agents
2. **Mandatory test execution** - Force agents to run their own tests
3. **Systematic agent deployment** - Deploy agents in logical groups
4. **Centralized quality control** - Verify all tests pass at the end

## Pre-Implementation Setup

### 1. Always Test Your Setup First

**❌ Don't:** Deploy agents immediately after setting up testing infrastructure
**✅ Do:** Write and run a test example yourself first

```bash
# Test your setup with a simple component
pnpm test components/ui/animated-counter.test.tsx
tsc --noEmit
pnpm lint
```

### 2. Required Infrastructure Components

Before deploying any agents, ensure these are properly configured:

- **Testing Framework**: Vitest + React Testing Library
- **Centralized Mocking**: `/test-utils/` directory with:
  - `jotai-mocks.ts` - For state management mocking
  - `render-with-providers.tsx` - Custom render with providers
  - `mock-router.tsx` - Next.js router mocking
- **Test Setup**: `test-setup.ts` with browser API mocks (window.matchMedia, etc.)
- **Configuration**: `vitest.config.ts` with proper JSX transform

### 3. Package.json Scripts

Always add these scripts before deploying agents:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Subagent Deployment Strategy

### 1. Logical Grouping

Deploy agents in logical component groups (6-15 components per agent):

```
✅ Good Grouping:
- Agent 1: Custom UI Components (10 components)
- Agent 2: Task Components (16 components)
- Agent 3: Analytics Components (9 components)
- Agent 4: Layout & Navigation (6 components)
- Agent 5: Dialog Components (4 components)
- Agent 6: Search & Views (5 components)
- Agent 7: Settings & Pages (8 components)
- Agent 8: Specialized Components (15 components)

❌ Bad Grouping:
- Agent 1: All 70+ components (too many)
- Agent 2: Random mixed components (no logical connection)
```

### 2. Sequential vs Parallel Deployment

**For Learning/First Time**: Deploy agents **sequentially** to learn patterns
**For Efficiency**: Deploy agents **in parallel** after establishing patterns

### 3. Component Analysis Before Deployment

Always analyze component dependencies before creating agent prompts:

```bash
# Check component imports and dependencies
grep -r "import.*from.*@radix-ui" components/
grep -r "useAtom\|atom" components/
grep -r "useRouter\|pathnameAtom" components/
```

## Critical Requirements for Subagents

### 1. **MANDATORY**: Force Test Execution

**This is the most critical requirement.** Always include this in agent prompts:

```
**CRITICAL REQUIREMENTS - YOU MUST DO ALL OF THESE:**
1. **ALWAYS RUN YOUR OWN TESTS** - After creating each test file, run `pnpm test [your-test-file]` to verify it works
2. **ALWAYS RUN TYPE CHECK** - Run `tsc --noEmit` on your files to ensure no TypeScript errors
3. **ALWAYS RUN LINT** - Run `pnpm lint` to ensure no ESLint errors
4. **ALWAYS RUN COVERAGE CHECK** - Run `pnpm test:coverage` on your files to verify coverage quality
5. **DO NOT PROCEED** to the next component until the current one passes all tests, type check, lint, and coverage requirements
```

### 2. **MANDATORY**: Provide Context

Never assume agents know the setup. Always provide:

- Working directory path
- Testing framework details
- Available mocking utilities location
- Example test patterns

### 3. **MANDATORY**: Component-Specific Mocking Instructions

Research each component group's dependencies and provide specific mocking instructions:

```typescript
// For Analytics Components
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}))

// For Dialog Components
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children }: any) => <div data-testid="dialog-root">{children}</div>,
  Content: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
}))
```

### 4. **MANDATORY**: Specify Test Patterns

Always provide working test patterns in the agent prompt:

```typescript
// Test Pattern Example
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import { YourComponent } from './your-component'

describe('YourComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    render(<YourComponent />)
    expect(screen.getByText('Expected Content')).toBeInTheDocument()
  })
})
```

### 5. **MANDATORY**: Coverage Quality Requirements

Always include coverage requirements in agent prompts:

```
**COVERAGE REQUIREMENTS:**
Your tests must achieve high coverage quality:
- **Branch Coverage**: 85%+ (test all decision paths)
- **Function Coverage**: 80%+ (execute all functions)
- **Line Coverage**: 90%+ for each component you test
- **Test Quality**: Comprehensive edge cases, error states, user interactions

**How to check coverage:**
1. Run `pnpm test:coverage` after completing all your tests
2. Review the coverage report for your components
3. Add additional tests if coverage is below requirements
4. Focus on testing:
   - All component props and variants
   - User interactions (clicks, form submissions)
   - Error states and edge cases
   - Conditional rendering paths
   - State changes and effects
```

## Common Pitfalls and Solutions

### 1. **Pitfall**: Agents Not Running Tests

**❌ Problem**: Agent creates tests but doesn't run them, leading to failing tests
**✅ Solution**: Make test execution a blocking requirement in the prompt

### 2. **Pitfall**: Missing React Imports

**❌ Problem**: JSX transform issues causing "React is not defined" errors
**✅ Solution**: Always include `import React from 'react'` in test pattern examples

### 3. **Pitfall**: Incorrect Mock Import Paths

**❌ Problem**: Using wrong import paths for test utilities and mocks
**✅ Solution**: Specify exact import paths in agent prompts

### 4. **Pitfall**: Inadequate Mocking

**❌ Problem**: Tests failing due to unmocked dependencies
**✅ Solution**: Research component dependencies and provide comprehensive mocking examples

### 5. **Pitfall**: Race Conditions in Parallel Deployment

**❌ Problem**: Multiple agents modifying same files or running conflicting tests
**✅ Solution**: Assign distinct component groups and emphasize running only their own tests

### 6. **Pitfall**: Low Coverage Quality

**❌ Problem**: Tests that only cover happy path, missing edge cases and error states
**✅ Solution**: Enforce coverage requirements and provide comprehensive test examples

## Quality Assurance Process

### 1. **During Development**: Monitor Agent Progress

Check agent reports for:

- Test execution confirmations
- TypeScript compliance
- ESLint compliance
- Coverage quality metrics
- Actual test count and coverage

### 2. **After Each Agent**: Verify Completion

```bash
# Check agent's work
pnpm test components/[agent-category]/
tsc --noEmit
pnpm lint
pnpm test:coverage
```

### 3. **Final Verification**: Run All Tests

```bash
# Final verification
pnpm test
tsc --noEmit
pnpm lint
pnpm test:coverage
```

### 4. **Coverage Analysis**: Measure Quality

```bash
# Generate coverage report
pnpm test:coverage

# Expected coverage targets:
# - Branch Coverage: 85%+ (decision paths tested)
# - Function Coverage: 80%+ (functions executed)
# - Line Coverage: 90%+ for tested components
# - Overall Coverage: Aim for 70%+ (depends on component count)
```

## Troubleshooting Failed Tests

### 1. **When Tests Fail**: Deploy Fix Agent

If final test run shows failures, deploy a specialized fix agent:

```
You are a test-fixing agent. Your ONLY job is to fix failing tests without removing any tests.

CRITICAL: Only fix failing tests. Do not modify passing tests.

Process:
1. Read failing test file
2. Read component source
3. Fix specific issues
4. Run the test file
5. Verify fix works
6. Move to next failing test
```

### 2. **Common Test Failures and Fixes**

| Error Type                            | Cause              | Fix                                                  |
| ------------------------------------- | ------------------ | ---------------------------------------------------- |
| `React is not defined`                | Missing import     | Add `import React from 'react'`                      |
| `act(...) is not a function`          | Missing import     | Add `act` to RTL imports                             |
| `Unable to find element with role`    | Wrong selector     | Use `data-testid` or text content                    |
| `No test suite found`                 | Wrong file format  | Convert to proper Vitest format                      |
| `window.matchMedia is not a function` | Missing mock       | Add to test-setup.ts                                 |
| `Low coverage percentage`             | Insufficient tests | Add tests for edge cases, error states, interactions |

### 3. **Verification After Fixes**

Always verify that fixes didn't remove tests:

```bash
# Check test counts
find components -name "*.test.tsx" -exec grep -c "it(\|test(" {} \; | awk '{sum += $1} END {print "Total tests:", sum}'

# Check git diff
git status
git diff --stat
```

## Success Metrics

A successful testing implementation should achieve:

- **✅ 100% test pass rate** - All tests passing
- **✅ Comprehensive coverage** - All non-shadcn components tested
- **✅ Comprehensive tests** - Each component has `.test.tsx` file
- **✅ TypeScript compliance** - No type errors
- **✅ ESLint compliance** - No linting errors
- **✅ High coverage quality** - Branch coverage 85%+, function coverage 80%+, line coverage 90%+ for tested components
- **✅ Overall coverage target** - 70%+ overall coverage across the entire codebase

## Template Agent Prompt Structure

Use this template for all agents:

```
You are a specialized testing agent for [COMPONENT_GROUP] components.

**CRITICAL REQUIREMENTS - YOU MUST DO ALL OF THESE:**
1. **ALWAYS RUN YOUR OWN TESTS** - After creating each test file, run `pnpm test [your-test-file]`
2. **ALWAYS RUN TYPE CHECK** - Run `tsc --noEmit`
3. **ALWAYS RUN LINT** - Run `pnpm lint`
4. **ALWAYS RUN COVERAGE CHECK** - Run `pnpm test:coverage` on your files to verify coverage quality
5. **DO NOT PROCEED** to the next component until current one passes all checks and meets coverage requirements

**Your Components to Test:**
[LIST OF COMPONENTS]

**Setup Context:**
- Working directory: [PATH]
- Testing framework: Vitest + React Testing Library
- Centralized mocking utilities available in /test-utils/

**[COMPONENT_GROUP]-Specific Mocking:**
[PROVIDE SPECIFIC MOCKING EXAMPLES FOR THIS COMPONENT GROUP]

**Test Pattern to Follow:**
[PROVIDE WORKING TEST EXAMPLE]

**Process for Each Component:**
1. Read component source code
2. Identify dependencies and atoms
3. Create proper mocks
4. Create .test.tsx file
5. **RUN THE TEST**: `pnpm test [test-file]`
6. Fix any issues and re-run until passing
7. **RUN TYPE CHECK**: `tsc --noEmit`
8. **RUN LINT**: `pnpm lint`
9. **RUN COVERAGE CHECK**: `pnpm test:coverage` and verify your components meet coverage requirements
10. Only move to next component when all checks pass and coverage requirements are met

**START WITH**: [FIRST_COMPONENT] and work systematically.

**REMEMBER**: You MUST run your own tests, type check, lint, and coverage analysis before moving to the next component!
```

## Final Notes

- **Be patient**: Comprehensive testing takes time but pays dividends
- **Be thorough**: Better to over-specify than under-specify in agent prompts
- **Be systematic**: Follow the same process for each agent deployment
- **Be vigilant**: Always verify the final result with full test suite execution

This approach successfully implemented testing for 70+ components with 479 passing tests, full TypeScript/ESLint compliance, and 91.45% branch coverage quality.
