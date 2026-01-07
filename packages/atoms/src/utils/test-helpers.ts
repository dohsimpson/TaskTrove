/**
 * Test Helper Functions for TaskTrove Jotai Atoms Tests
 *
 * Utility functions to make testing easier and more consistent.
 * These helpers can be used in both the main integration tests
 * and any additional test files.
 */

import { createStore, type Atom } from "jotai";
import { v4 as uuidv4 } from "uuid";
import type { Task, Project, Label } from "@tasktrove/types/core";
import { INBOX_PROJECT_ID } from "@tasktrove/types/constants";
import {
  createTaskId,
  createSubtaskId,
  createLabelId,
  createProjectId,
  createSectionId,
} from "@tasktrove/types/id";
import { DEFAULT_PROJECT_SECTION } from "@tasktrove/types/defaults";

// =============================================================================
// SHARED TEST CONSTANTS
// =============================================================================

/** Shared test constants to ensure consistency across all test files */
export const TEST_TASK_ID_1 = createTaskId(
  "12345678-1234-4234-8234-123456789012",
);
export const TEST_TASK_ID_2 = createTaskId(
  "12345678-1234-4234-8234-123456789013",
);
export const TEST_TASK_ID_3 = createTaskId(
  "12345678-1234-4234-8234-123456789014",
);
export const TEST_TASK_ID_4 = createTaskId(
  "12345678-1234-4234-8234-123456789015",
);
export const TEST_TASK_ID_5 = createTaskId(
  "12345678-1234-4234-8234-123456789016",
);
export const TEST_PROJECT_ID_1 = createProjectId(
  "11111111-1111-4111-8111-111111111111",
);
export const TEST_PROJECT_ID_2 = createProjectId(
  "22222222-2222-4222-8222-222222222222",
);
export const TEST_SECTION_ID_1 = createSectionId(
  "33333333-3333-4333-8333-333333333333",
);
export const TEST_SECTION_ID_2 = createSectionId(
  "44444444-4444-4444-8444-444444444444",
);
export const TEST_LABEL_ID_1 = createLabelId(
  "55555555-5555-4555-8555-555555555555",
);
export const TEST_LABEL_ID_2 = createLabelId(
  "66666666-6666-4666-8666-666666666666",
);
export const TEST_LABEL_ID_3 = createLabelId(
  "77777777-7777-4777-8777-777777777777",
);
export const TEST_SUBTASK_ID_1 = createSubtaskId(
  "88888888-8888-4888-8888-888888888888",
);

// =============================================================================
// TEST DATA FACTORIES
// =============================================================================

/**
 * Creates a mock task with reasonable defaults
 */
export function createMockTask(overrides: Partial<Task> = {}): Task {
  const defaultTask: Task = {
    id: createTaskId(uuidv4()),
    title: "Mock Task",
    description: "This is a mock task for testing",
    completed: false,
    priority: 2,
    projectId: INBOX_PROJECT_ID,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date(),
    recurringMode: "dueDate",
  };

  return { ...defaultTask, ...overrides };
}

/**
 * Creates a mock project with reasonable defaults
 */
export function createMockProject(
  overrides: Partial<Project> = {},
): Omit<Project, "id" | "viewState"> {
  const defaults = {
    name: `Mock Project ${Date.now()}`,
    color: "#3b82f6",
    sections: [DEFAULT_PROJECT_SECTION],
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates a mock label with reasonable defaults
 */
export function createMockLabel(
  overrides: Partial<Omit<Label, "id">> = {},
): Omit<Label, "id"> {
  const defaults = {
    name: `mock-label-${Date.now()}`,
    color: "#10b981",
  };

  return { ...defaults, ...overrides };
}

/**
 * Creates multiple mock tasks with different characteristics
 */
export function createMockTaskSet(): Task[] {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return [
    createMockTask({
      title: "High Priority Task",
      priority: 1,
      dueDate: now,
      labels: [TEST_LABEL_ID_1, TEST_LABEL_ID_2],
    }),
    createMockTask({
      title: "Completed Task",
      completed: true,
      completedAt: now,
    }),
    createMockTask({
      title: "Overdue Task",
      dueDate: yesterday,
      priority: 3,
      labels: [TEST_LABEL_ID_1],
    }),
    createMockTask({
      title: "Future Task",
      dueDate: tomorrow,
      priority: 4,
      labels: [TEST_LABEL_ID_3],
    }),
    createMockTask({
      title: "Task with Subtasks",
      subtasks: [
        {
          id: createSubtaskId(uuidv4()),
          title: "Subtask 1",
          completed: true,
          order: 0,
        },
        {
          id: createSubtaskId(uuidv4()),
          title: "Subtask 2",
          completed: false,
          order: 1,
        },
      ],
    }),
  ];
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Enhanced assert function with better error reporting
 */
export function assert(
  condition: boolean,
  message: string,
  testName: string,
  actual?: unknown,
  expected?: unknown,
): void {
  if (condition) {
    console.log(`✅ ${testName}`);
  } else {
    const errorMsg =
      actual !== undefined && expected !== undefined
        ? `${message} (Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)})`
        : message;
    console.error(`❌ ${testName}: ${errorMsg}`);
    throw new Error(`Test failed: ${testName} - ${errorMsg}`);
  }
}

/**
 * Assert that an array has a specific length
 */
export function assertLength<T>(
  array: T[],
  expectedLength: number,
  testName: string,
): void {
  assert(
    Array.isArray(array) && array.length === expectedLength,
    `Array should have length ${expectedLength}`,
    testName,
    array.length,
    expectedLength,
  );
}

/**
 * Assert that an object has specific properties
 */
export function assertHasProperties(
  obj: Record<string, unknown>,
  properties: string[],
  testName: string,
): void {
  const missingProps = properties.filter((prop) => !(prop in obj));
  assert(
    missingProps.length === 0,
    `Object should have properties: ${properties.join(", ")}`,
    testName,
    Object.keys(obj),
    properties,
  );
}

/**
 * Assert deep equality between two objects
 */
export function assertEqual<T>(actual: T, expected: T, testName: string): void {
  assert(
    deepEqual(actual, expected),
    "Objects should be deeply equal",
    testName,
    actual,
    expected,
  );
}

/**
 * Assert that a value is of a specific type
 */
export function assertType(
  value: unknown,
  expectedType: string,
  testName: string,
): void {
  const actualType = Array.isArray(value) ? "array" : typeof value;
  assert(
    actualType === expectedType,
    `Value should be of type ${expectedType}`,
    testName,
    actualType,
    expectedType,
  );
}

/**
 * Assert that an async operation throws an error
 */
export async function assertThrows(
  asyncFn: () => Promise<unknown>,
  testName: string,
): Promise<void> {
  let threwError = false;
  try {
    await asyncFn();
  } catch {
    threwError = true;
  }

  assert(threwError, "Function should throw an error", testName);
}

/**
 * Assert that an async operation does not throw
 */
export async function assertDoesNotThrow<T>(
  asyncFn: () => Promise<T>,
  testName: string,
): Promise<T | undefined> {
  try {
    return await asyncFn();
  } catch (error) {
    assert(false, `Function should not throw an error: ${error}`, testName);
    return undefined;
  }
}

// =============================================================================
// TEST TIMING UTILITIES
// =============================================================================

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(
  fn: () => Promise<T> | T,
  testName: string,
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;

  console.log(`⏱️  ${testName}: ${duration.toFixed(2)}ms`);

  return { result, duration };
}

/**
 * Assert that an operation completes within a time limit
 */
export async function assertCompletesWithin<T>(
  fn: () => Promise<T> | T,
  maxMs: number,
  testName: string,
): Promise<T> {
  const { result, duration } = await measureTime(fn, testName);

  assert(
    duration <= maxMs,
    `Operation should complete within ${maxMs}ms`,
    `${testName} - Performance`,
    `${duration.toFixed(2)}ms`,
    `<= ${maxMs}ms`,
  );

  return result;
}

// =============================================================================
// ATOM TESTING UTILITIES
// =============================================================================

/**
 * Create a test store with initial values
 */
export function createTestStore(initialValues: Record<string, unknown> = {}) {
  const store = createStore();

  // Set initial values if provided
  Object.entries(initialValues).forEach(([atom, value]) => {
    // Note: In real usage, atom would be the actual atom reference
    // This is a simplified version for testing
    console.log(`Setting initial value for ${atom}:`, value);
  });

  return store;
}

/**
 * Wait for an atom to have a specific value
 */
export async function waitForAtomValue<T>(
  store: ReturnType<typeof createStore>,
  atom: Atom<T>,
  expectedValue: T,
  timeoutMs: number = 1000,
): Promise<T> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const value = await store.get(atom);
      if (deepEqual(value, expectedValue)) {
        return value;
      }
    } catch {
      // Continue waiting
    }

    // Wait a bit before checking again
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  throw new Error(`Atom did not reach expected value within ${timeoutMs}ms`);
}

/**
 * Snapshot an atom's value for comparison
 */
export async function snapshotAtom<T>(
  store: ReturnType<typeof createStore>,
  atom: Atom<T>,
  label: string,
): Promise<T> {
  const value = await store.get(atom);
  console.log(`📸 Snapshot [${label}]:`, JSON.stringify(value, null, 2));
  return value;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Deep equality check (reused from main test file)
 */
// Type guard for record-like objects
function isRecord(obj: unknown): obj is Record<string, unknown> {
  return (
    obj !== null &&
    typeof obj === "object" &&
    !Array.isArray(obj) &&
    !(obj instanceof Date)
  );
}

export function deepEqual(obj1: unknown, obj2: unknown): boolean {
  if (obj1 === obj2) return true;

  if (obj1 == null || obj2 == null) return false;

  if (typeof obj1 !== typeof obj2) return false;

  if (typeof obj1 !== "object") return obj1 === obj2;

  // Handle dates
  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime();
  }

  // Handle arrays
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

  // Both must be records for key comparison
  if (!isRecord(obj1) || !isRecord(obj2)) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

/**
 * Generate a random ID for testing
 */
export function generateTestId(prefix: string = "test"): string {
  return `${prefix}-${uuidv4()}`;
}

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a range of numbers
 */
export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Shuffle an array randomly
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const elementI = shuffled[i];
    const elementJ = shuffled[j];
    if (elementI !== undefined && elementJ !== undefined) {
      [shuffled[i], shuffled[j]] = [elementJ, elementI];
    }
  }
  return shuffled;
}

// =============================================================================
// LINKED-LIST TESTING UTILITIES
// =============================================================================

/**
 * Validate that a linked-list array maintains proper chain integrity
 */
export function validateLinkedListIntegrity<
  T extends { id: string; nextId?: string | null },
>(items: T[], testName: string): void {
  // Find the first item (no other item points to it)
  const firstItem = items.find(
    (item) => !items.some((other) => other.nextId === item.id),
  );

  assert(
    !!firstItem,
    "Linked list should have a first item",
    `${testName} - Has First Item`,
  );

  if (!firstItem) return;

  // Traverse the chain and ensure all items are reachable
  const visited = new Set<string>();
  let current: T | undefined = firstItem;

  while (current) {
    assert(
      !visited.has(current.id),
      "Linked list should not have cycles",
      `${testName} - No Cycles`,
    );

    visited.add(current.id);

    if (current.nextId) {
      const nextId: string = current.nextId;
      const nextItem: T | undefined = items.find((item) => item.id === nextId);
      assert(
        !!nextItem,
        `Next item ${nextId} should exist`,
        `${testName} - Next Item Exists`,
      );
      current = nextItem;
    } else {
      current = undefined;
    }
  }

  // Ensure all items are reachable
  assert(
    visited.size === items.length,
    "All items should be reachable in linked list",
    `${testName} - All Items Reachable`,
    visited.size,
    items.length,
  );
}

/**
 * Convert linked-list to sorted array for easier testing
 */
export function linkedListToArray<
  T extends { id: string; nextId?: string | null },
>(items: T[]): T[] {
  const sorted: T[] = [];

  // Find the first item
  let current: T | undefined = items.find(
    (item) => !items.some((other) => other.nextId === item.id),
  );

  while (current) {
    sorted.push(current);
    const nextId = current.nextId;
    current = nextId ? items.find((item) => item.id === nextId) : undefined;
  }

  return sorted;
}

// =============================================================================
// PERFORMANCE TESTING
// =============================================================================

/**
 * Test performance with large datasets
 */
export async function testPerformanceWithLargeDataset(
  setupFn: () => Promise<void>,
  testFn: () => Promise<void>,
  datasetSize: number,
  testName: string,
): Promise<void> {
  console.log(`🏃 Testing performance with ${datasetSize} items...`);

  // Setup
  const setupTime = await measureTime(setupFn, `${testName} - Setup`);

  // Test
  const testTime = await measureTime(testFn, `${testName} - Test`);

  // Performance assertions
  const maxSetupTime = datasetSize * 0.1; // 0.1ms per item max
  const maxTestTime = datasetSize * 0.05; // 0.05ms per item max

  assert(
    setupTime.duration <= maxSetupTime,
    `Setup should be fast even with large dataset`,
    `${testName} - Setup Performance`,
    `${setupTime.duration.toFixed(2)}ms`,
    `<= ${maxSetupTime.toFixed(2)}ms`,
  );

  assert(
    testTime.duration <= maxTestTime,
    `Test should be fast even with large dataset`,
    `${testName} - Test Performance`,
    `${testTime.duration.toFixed(2)}ms`,
    `<= ${maxTestTime.toFixed(2)}ms`,
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export const testHelpers = {
  // Data factories
  createMockTask,
  createMockProject,
  createMockLabel,
  createMockTaskSet,

  // Assertions
  assert,
  assertLength,
  assertHasProperties,
  assertEqual,
  assertType,
  assertThrows,
  assertDoesNotThrow,

  // Timing
  measureTime,
  assertCompletesWithin,

  // Atom utilities
  createTestStore,
  waitForAtomValue,
  snapshotAtom,

  // General utilities
  deepEqual,
  generateTestId,
  wait,
  range,
  shuffle,

  // Linked-list utilities
  validateLinkedListIntegrity,
  linkedListToArray,

  // Performance
  testPerformanceWithLargeDataset,
};
